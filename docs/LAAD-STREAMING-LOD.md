# Laden, streamen en LOD: wat gebeurt waar (stand HEAD 53eba64b7)

Aanleiding: de eigenaar ziet sinds v0.54.0 langere laadtijden, hapering en glitches en vroeg naar de
laad-, streaming- en LOD-logica. Dit document is uit de code gereconstrueerd (alleen gelezen, niets
gestart, niets gemeten). Regelnummers zijn die van HEAD. Wat ik niet kon verifiëren staat bij
"Niet geverifieerd". De tijdlijn per versie staat al in [PERF-TREND-0.54-NAAR-NU.md](PERF-TREND-0.54-NAAR-NU.md);
hier gaat het om het mechanisme en om wat buiten het laadscherm hapert.

Meten kan zonder code te wijzigen met `window.__loadMarks` (main.js:362, 441, 462, 504, 509-515:
`startWarm`, `introWarm`, `introTour`, `introPaletteBuild/Draw`, `shaders`, `warmFrames`,
`warmWorstFrame`, `background`) en `window.__scene3d.farLod.stats` / `.dists()` / `.batches()` (scene3d.js:1037).

## 1. Fasen

Thread: alles hieronder draait op de hoofdthread, behalve het decoderen van tegels (worker-pool,
tilestore.js:487, grootte 2 tot 4 naar kernen, tileworld.js:43) en het terrein/wegoppervlak
(geometry-worker, `terrainReady`, `roadGeometryReady`). Opbouwen van meshes, rijen in rasters
zetten, shaders compileren en tekenen is hoofdthread.

| Fase | Wat | Thread | Budget / wachtvoorwaarde | Bestand:regel |
|---|---|---|---|---|
| Electron-start | venster, preload, laden index.html | main-proces + renderer | geen | desktop/main.js, index.html |
| boot() kaart | `loadTileWorld`: index + globaal blok parallel, alle stadstegels pinnen en decoderen, overlays, `tileQueue.run(1e9)`, daarna `unpinCity` | worker (decode) + hoofd (rijen) | `withDeadline` MAP_LOAD_MS 150 s; tegel-time-outs 2x tijdens boot | main.js:698, 601; tileworld.js:595-646; tilestore.js:38-46 |
| boot() wereld | `init3D`, `ensureCountryEdge`, World, ~60 init-functies, `yieldToPaint` tussen stappen | hoofd | voortgang 0,05 tot 0,92; boot-wachter 180 s | main.js:677-873, 600, 627 |
| terrein | gebakken grond lezen (terrain.bin) of in de worker bouwen | worker | `terrainReady()` met 60 s grens | main.js:881, 602 |
| einde boot | `finishLoading`, online-naamvraag boven het laadscherm | hoofd | wacht op speler (geen time-out) | main.js:892-904 |
| Ommeland-plaatsing, kaartbeelden | `placeWithTiles` (plakken van 6) en `warmCountryMaps` naast de warm-up | hoofd, in stukken | de warm-lus telt `readyDone` mee, grens START_WARM_MS | main.js:912-918, 359-364 |
| Opwarm 1: startbuurt | `prewarmStreamAt(x,y,240 s, 320 m)`; frames `tick`+`render` met `yieldToPaint` (1 frame per rAF) | hoofd | stopt bij 12 rustige frames (geen streamPending, geen prewarmPending, geen frame >50 ms) of START_WARM_MS 25 s | main.js:349-378, 278-281 |
| Opwarm 2: openingsfilm (alleen Nieuw spel, `!loadedFromSave`) | tegels van ~10 montageplekken vragen en pinnen (`registerShots`, straal 350), per plek `prewarmStreamAt(180 s, 170 m)`, wachtlus | hoofd + worker | `introDeadline` = INTRO_WARM_MS 70 s; lus stopt als `tilesIn`, `tileQueue` leeg, `prewarmPending()==0`, `!prewarmBusy()` | main.js:383-414, 284 |
| Opwarm 3: tour | camera op straathoogte per plek, `setHoldMaterials(true)`, `setHoldGrass(true)`; per plek max 2,2 s en max 70 frames, minimaal 9 | hoofd | INTRO_TOUR_MS 35 s (binnen introDeadline) | main.js:422-442 |
| Opwarm 4: palette | `prepareOpeningWarm()` bouwen en 2 frames tekenen per lichtstand; `takeWarmupSamples()` (rest van de warm-upwachtrij synchroon) en ook 2 frames per lichtstand tekenen | hoofd | 4 + 4 frames plus shader-link | main.js:444-501; scene3d.js:4016-4045 |
| Opwarm 5: shaders | `precompilePrograms()` = `renderer.compile(scene)` over de hele scène | hoofd, synchroon | geen grens | main.js:510-516; scene3d.js:1997 |
| Laadscherm "save" | na de warm-up; `prewarmStreamAt(x,y,30 s)`; frames lopen, `world.uiPaused` | hoofd | min 2,2 s; klaar bij 12 rustige frames; nood-uitgang 12 s | loadscreen.js:117-118, 156-165; loadlogic.js:7-13, 38-50 |
| Eerste speelbare frame | `game-started`; tegels van het opwarmen vrij na 20 s (of aan het einde van de film) | hoofd | setTimeout 20 s | main.js:937-943 |
| Spelen | `follow` (tegelwerk), `syncBuildings/Roads/Trees/Water`, batchers, grass, farlod, per frame | hoofd | zie par. 2 en 3 | main.js:1058-1077; scene3d.js:2680-2760, 3080 |
| Teleport, snelle reis, taxi, respawn | `watchJumps`: sprong >= 700 m geeft een laadscherm ('snel' < 3000 m, anders 'travel'), niet bij cutscene/cameraOverride/pendingRespawn | hoofd | travel min 1,4 s, snel min 0,6 s, 12 s nood | main.js:1152; loadscreen.js:166-176; loadlogic.js:9-23 |
| Trein | `follow(x,y,{vx,vy},1.5)` rechtstreeks, niet via `streamFrameMs` | hoofd | vast 1,5 ms | stationtravel.js:829 |
| Cutscene / missiewissel | `holdShotTiles` (`registerShots`, race met 1,5 s) en `prewarmStreamAt` (4 s, 110 m); geen laadscherm | hoofd | 1,5 s bovengrens | cinematics.js:236-262 |
| Openingsfilm | tegelwerk 0,4 ms per frame, batches gespreid compileren, grass-hold | hoofd | `cine` | main.js:1069-1076; scene3d.js:1816-1835 |

Waarop het laadscherm na boot wacht (`loadPending`, loadlogic.js:25): `streamPending().buildings`
(ontbrekende gebouwmeshes in de detailring) + `.roads` + `tileQueue.size` + `prewarmPending()`.
Het wacht dus op werk aan de hoofdthread, niet op het openen van tegels in de store (`store.loading`
zit er niet in) en niet op grasstukken, bomen, batches, far-LOD of shader-links.

## 2. Streaming

- **Vragen**: `map.follow(x,y,opts,budgetMs)` per frame (tileworld.js:541) roept `store.prefetch`
  (tilestore.js:403): gewenste set = tegels (TILE_M 1000 m, gdt.js:24) binnen 1500 m + 10 s reis, gesorteerd
  op afstand min snelheid x 8 s x cosinus naar de rijrichting. Samen spelen voegt `foci` toe.
- **Decoderen**: queue met concurrency 4 (tilestore.js:196), decode in de worker-pool; sectie NAV wordt niet
  meer gedecodeerd (tileworld.js:49). Time-outs 30 s per stap, 60 s tijdens de boot.
- **Pinnen**: `pin/unpin` geteld (tilestore.js:227). Gepind: de stad tijdens de eerste opbouw (daarna
  `unpinCity`, tileworld.js:619-646), `registerShots` (intro, cutscenes, tileworld.js:550), plaatsings- en kaartvensters.
- **Vrijgeven**: LRU-budget 40e6 ruwe bytes (tilestore.js:196); tegels buiten straal + 300 m krijgen na 10 s
  hysterese een drop zodra meer dan 50% van het budget bezet is (tilestore.js:437-450). Een drop zet een
  `drop:`-item in de FrameQueue en bumpt `geoVer`.
- **Op de hoofdthread**: een gedecodeerde tegel gaat per ROW_CHUNK=300 rijen als FrameQueue-item door de
  wachtrij (tileworld.js:310-322); het budget knipt alleen tussen items, minimaal 1 item per frame.
- **Frame-budget tegelwerk** (streambudget.js:138-162, main.js:1076): 1,5 ms normaal; 0,6 ms bij een
  traag beeld (>25 ms) of snelheid >25 m/s; 0,5 ms in de eerste 1,5 s na een sprong (geen `vx` in `tileFocus`,
  main.js:1074); 0,4 ms tijdens de film. Gebouwen: 4 ms (9 ms in de 1,5 s na een sprong >60 m,
  scene3d.js:1866-1891), wegen 2,5 ms (5 ms), max 4 wegen per frame (roadbudget.js:5), prewarm 3 ms/frame
  (scene3d.js:1933), prefetch van gebouwen net buiten de ring 1,5 ms (scene3d.js:2018).
- **Rang**: gebouwen en wegen krijgen een rang "afstand min voorsprong" (streambudget.js:72-96), tot 250 m
  (3 s x snelheid) vooruit.
- **Teleport**: `noteStreamFocus` zet snelheid en voorsprong op 0 bij >150 m verschil; `noteStreamJump` (>60 m)
  geeft de 1,5 s boost. Tijdens het opwarmen wordt `follow` niet aangeroepen (alleen main.js:1076 en
  stationtravel.js:829 roepen het aan, gegrept): de lus haalt tegels alleen via `registerShots`.

## 3. LOD-ringen (afstanden in meter rond de focus; focus = speler of cameradoel bij een override)

```
0 ........ detailring DRAW_DIST: 140 (laag, normaal), 160 middel, 190 hoog (zicht >= 350); 100 bij cpuLevel 3
            (viewdist.js:25-39). Hier: volledige gebouwmeshes, wegen, straatmeubilair, grasstukken, voetgangers.
0-28      acteurschaduwen (scene3d.js:1542); sun-schaduwkaart volgt de focus (niet nagelopen)
DRAW_DIST..+30   gebouwen worden vooraf gebouwd (prefetchedBuildings), nog niet getoond (scene3d.js:1790-1805)
130       bomen met stam en kroon (TREE_DIST); tot 260 alleen kronen van bosvulling (TREE_FAR) (scene3d.js:196, 1573)
DRAW_DIST-14..DRAW_DIST  voetgangers faden uit; bereik krimpt met snelheid vanaf 12 m/s, min 90 m (scene3d.js:2376-2381, 2507)
lodR-8    far-LOD-grond (groen, pad, weg) wordt met `discard` weggelaten binnen lodR-8 (farlod.js:176, 634)
lodR      far-LOD-gebouwen worden in de vertex-shader samengeklapt binnen lodR (farlod.js:95)
          lodR = DRAW_DIST, maar tijdens streamen min(DRAW_DIST, buildingDetailR, roadDetailR+8) (scene3d.js:3080);
          roadDetailR >= 24 (scene3d.js:2259)
viewDist  150 kort / 350 normaal / 600 ver / 900 heel ver (viewdist.js:6). Far LOD bouwt tegels (TILE 320 m, of een
          gestroomde tegel van 1000 m) vanaf viewDist + max(0,3 x viewDist, 80) en sloopt ze vanaf die afstand + 160 m
          (farlod.js:34-37, 15); aan alleen als viewDist > detailR + 20 (farlod.js:635)
320       landmark-kit (kerk, molen, borg) vol detail (R0), 1100 massa's per cel, daarna skyline (R1) (landmarklayer3d.js:19)
water     max(DRAW_DIST, viewDist); rails 190 tot 800 (viewdist.js:50)
```

- **Gebouwen** (scene3d.js:1696-1805): detailset is "centrum binnen DRAW_DIST", geen hysterese; ontbrekende
  meshes nearest/ahead-first binnen 4 ms; `buildingDetailR` krimpt tot het dichtstbijzijnde ontbrekende gebouw
  en de far LOD dekt de rest. Een mesh waarvan de shaders niet gelinkt zijn wacht max 2000 ms (BUILDING_LINK_WAIT_MS).
- **Wegen** (scene3d.js:2160-2278): ontbrekende wegen op rang; heavy wegen (hoofdthread bouwt zelf) wachten op een
  leeg frame of 12 frames (roadbudget.js:19-22). Een weg waarvan de oppervlakte nog uit de worker moet, laat alle
  verder gelegen wegen ook wachten (`waiting`, scene3d.js:2224-2229).
- **Batches**: staticbatch3d voegt meshes samen per cel (gebouwen 48 m default, wegen 96 m, oevers 600 m;
  staticbatch3d.js:20, 505, 529), 3 ms (1 ms tijdens de boost), pas zichtbaar als de shaders gelinkt zijn (max 2000 ms).
  Een merge wordt weer ongedaan gemaakt als een lid ongeldig wordt (`unmerge`).
- **Gras**: chunks van 64 m binnen DRAW_DIST, max 2 bouwen en 4 slopen per frame, sloop vanaf +30 m, niet tijdens
  `holdGrass` (grass.js:999-1022); tufts los daarvan in cellen (grass.js:1050 e.v.).
- **Verwijderde gebouwen** (kit, home, safehouse): `setBuildingHidden` (scene3d.js:278-285) haalt ze ook uit de far LOD.
- **Niet nagelopen**: voertuig- en persoons-LOD's (bootinterieur3d.js:54 heeft drie banden), schaduwkaartgrootte.

## 4. Vergelijking met v0.54.0 (`git show v0.54.0:<pad>`, `git log v0.54.0..HEAD`)

| Onderdeel | v0.54.0 | HEAD | Waarom het trager of gladder kan zijn |
|---|---|---|---|
| Boot-warm-up | geen: main.js ruim 930 regels, geen `START_WARM`, `precompilePrograms`, `queueWarmupObject`; boot eindigt na `terrainReady` en `finishLoading` | START_WARM_MS 25 s + INTRO_WARM_MS 70 s (+35 s tour binnen die 70) + shader-compile + palette-draws | Vaste bovengrens 95 s plus compile; elke start krijgt de 25 s-lus, een nieuw spel ook de intro-warm |
| Stad gepind | `world.tileQueue.run(1e9)` en stad blijft gepind (tileworld.js, 0.54) | `unpinCity` voor sparse wereld (197b89aa0, eerste tag v0.60.0): de stad streamt mee | Elke tegel die komt of gaat bumpt `geoVer` en ontwerpt caches opnieuw; in 0.54.0 gebeurde dat in de stad niet |
| Far LOD bij tegelwissel | gooide LOD-tegels weg zonder terug te zetten | `resetTiles` + basisindex herbouw uit alle rasters in stukken van 2,5 ms (#755), prefetch-marge 0,3 x view (#502), oude mesh blijft staan (#921) | Beter qua gaten, maar herstart bij elke `geoVer` (zie B3) |
| Wegbouw | alleen deadline voor de eerste weg | harde cap 4/frame en heavy-gating (ba82d2f4b, ba1ba2b4b) | Minder pieken, langer voordat alle wegen er zijn; heavy-wachtrij is gerepareerd |
| Tegelbudget | vast 1,5 ms | 1,5 / 0,6 / 0,5 / 0,4 ms (#937) | Minder pieken; maar ook trager vullen na een sprong, zie B2 |
| Laadscherm na reis | wachtte op gebouwen + wegen | + `tileQueue.size` + `prewarmPending()` en een eigen prewarm van 30 s (00136ea52, #929) | Het scherm duurt langer, bewust; de wachttijd hangt aan een kleine tegelbudget (B2) |
| Tegelstore | geen read/decode-guards | guards 30/60 s, pooled decoder op kernen, NAV niet gedecodeerd | Alleen foutpad en sneller; geen oorzaak |
| Gras | chunks aan `geoVer` | aan `greenVer` (af883b52c), sloop/bouw begrensd | Beter, maar zie B4 |
| Per-frame werk | | ~20 extra `updateGameplay`-aanroepen, tick-soorten voor interieurs (#833, #847) | Meer werk per frame; buiten dit document |

## 5. Bevindingen, gerangschikt op verwachte winst

Kosten S/M/L en risico (L/M/H) zijn schattingen. "Niet gemeten" betekent: uit de code afgeleid.

**B1. Vaste opwarmbudgetten van 25 + 70 s met een lus die vaak tot de grens loopt.** main.js:278-285, 366, 406, 432.
Effect: elke start wacht tot 25 s (stopt bij 12 rustige frames, maar `START_WARM_MAX_FRAME_MS=50` zet de teller
terug, en `open` telt ook `readyDone`); een nieuw spel krijgt er tot 70 s bij. De tour wacht per plek
op `!prewarmBusy()` (scene3d.js:4049), dat ook de globale warm-upwachtrij (~35 stuks, 1 per frame,
scene3d.js:4087-4100) en de 250 ms-pollronde van de shaderlinks (scene3d.js:3741-3742) bevat; elke nieuwe plek
brengt nieuwe programma's mee, dus de stop van 2,2 s per plek (x10 = 22 s) is waarschijnlijk vaak de echte
duur. Niet gemeten: lees `__loadMarks.introTour` en `warmFrames`. Voorstel: (a) tour-stop alleen laten wachten
op `sp.buildings+sp.roads` en eigen prewarm van die plek, niet op de globale `prewarmBusy()`; (b) alleen de eerste
vijf plekken van de montage (de rest bouwt in de film gespreid, scene3d.js:1816-1835); (c) bij Doorgaan (save)
de intro-warm niet doen (nu al zo) en de 25 s-lus op 8 s zetten. Kosten S, risico M (de film kreeg juist deze
voorwarm tegen pieken van 250-650 ms, #804).

**B2. Tegelbudget in het laadscherm klein, terwijl het scherm op de wachtrij wacht.** streambudget.js:140,
main.js:1074-1076, loadscreen.js:159. Effect: na een sprong krijgt `follow` 0,5 ms per frame gedurende 1,5 s,
dan 1,5 ms; het laadscherm telt `tileQueue.size` mee en eindigt pas als die leeg is. De gebouwenboost
(9 ms, 1,5 s) valt in hetzelfde venster maar kan pas bouwen als de rijen van de tegel in de rasters staan. Het
laadscherm is precies het moment waarop een hoog budget gratis is. Voorstel: in `frame()` een budget van
4 tot 6 ms zolang `world.uiPaused` door een actief laadscherm komt (exporteer een `isLoadScreenActive()` uit
loadscreen.js); ook in de warm-lus (die roept `follow` helemaal niet aan, dus een save in de provincie
haalt zijn tegels pas na het opwarmen, tijdens het laadscherm). Kosten S, risico L (een frame >50 ms
is onder het scherm onzichtbaar).

**B3. `geoVer`-storm door de gestreamde stad.** tileworld.js:426, 535 (per add/drop), farlod.js:627-634,
596-616, 420-460; scene3d.js:1683, 2190, 2288; streetfurniture3d.js:286; roadsurface.js:427-481.
Effect (afgeleid, niet gemeten): sinds `unpinCity` (v0.60.0) komen en gaan er in de stad tegels. Bij elke
wijziging gooit de far LOD zijn basis-tegels in `oldMeshes`, herstart `baseBuild` over alle raster-cellen (de
code zegt ~48 ms, in stukken van 2,5 ms: ~20 frames), en bouwt tijdens die herbouw geen nieuwe tegels
(farlod.js:648-657). Komt er binnen die 20 frames weer een tegel bij (rijden, na een sprong), dan start het
opnieuw: de verre ring kan achterlopen terwijl `lodR` al is gekrompen en de ring dus op de far LOD rekent.
Voorstel: `resetTiles` en de basisherbouw alleen als de wissel rijen van de basisindex raakt (een drop van een
stream-tegel hoeft hem niet), en de herbouw niet herstarten maar het ontbrekende bijwerken; idle-guards
niet op `geoVer` maar op een teller die alleen verandert als rijen in de ring wijzigen. Kosten M, risico M.

**B4. Gras-chunks verdwijnen en komen terug bij elke tegel met groen.** grass.js:981-983 (`buildGrassChunks`
sloopt alle chunks), 1000 (trigger `greenVer`), 1013 (max 2 bouwen per frame). Effect: na elke tegel met groen
(`greenAdded`, tileworld.js:425) is de groene vloer in de detailring weg en komt ze terug met 2 chunks van
64 m per frame (ca. 35+ chunks in de ring bij 190 m: ~18 frames of meer); `farlod` laat zijn grond binnen
lodR-8 weg, dus daar is dan alleen terrein te zien. Voorstel: chunks per tegel-sleutel verversen (alleen de
chunks waarvan polys wijzigen) of de oude groep laten staan tot de nieuwe klaar is, zoals `oldMeshes`
(farlod.js:521-527). Kosten M, risico M. Niet gemeten.

**B5. Een kit die een gebouw bedekt laat een hele far-LOD-tegel verdwijnen en opnieuw bouwen.** farlod.js:569-585
(`hideFarBuilding`: `disposeTile` zonder `oldMeshes`), aangeroepen via scene3d.js:284 door
`coverBuildings` (ommelandlandmarks.js:77-89, elke seconde, binnen 450 m). Effect: bij elke bedekte kerk, molen of
borg verdwijnt de hele far-tegel (bij gestroomde tegels 1000 m) tot de herbouw klaar is (2,5 ms/frame), en een
tegel die pas is opgebouwd en daarna een bedekt gebouw krijgt wordt dubbel gebouwd. Dit is het tegendeel van
de #921-aanpak in `resetTiles`. Voorstel: de oude mesh laten staan tot de nieuwe klaar is (`oldMeshes`) of het
gebouw per instantie uitsluiten via de vertex-shader (er is al een `lodCenter`-test, farlod.js:95). Kosten S tot M,
risico L.

**B6. Dubbel werk bij het opwarmen.** (a) `prepareOpeningWarm()` wordt twee keer gebouwd, getekend en gecompileerd:
main.js:388 (via `queueWarmupObject`, belandt in `warmupBuilt` en dus in de samples-groep) en main.js:448
(directe palette). `prepareOpeningWarm` heeft geen cache (intromontage.js:1388). (b) De startring van 320 m
(main.js:278) bouwt en compileert ~2,8 tot 5,4 keer zoveel gebouwen als de detailring (190 resp. 140 m) laat zien,
en houdt ze 240 s vast (`nearPrewarm`, scene3d.js:1936-1945). (c) Drie mechanismen compileren dezelfde
materialen: `precompile(mesh)` per gebouw (scene3d.js:1735, 1960), `prewarmLightVariants` (scene3d.js:3471), en
`precompilePrograms` over de hele scène (main.js:511). Voorstel: (a) één van beide weghalen; (b) straal
DRAW_DIST + 30 in plaats van 320; (c) niets doen zonder meting. Kosten S, risico L (a, b).

**B7. `registerShots` en `prefetchPoints` draaien `tileQueue.run(1e9)` in één frame.** tileworld.js:556, 575
(en tileworld.js:460 in de boot). Effect: alle rijen van alle gepinde tegels worden in één frame verwerkt; in het
laadscherm onzichtbaar, maar in het spel (cutscene `holdShotTiles`, helirun, trailer) een enkele lange frame
(grootte niet gemeten). Voorstel: buiten de boot en de warm-up het budget begrenzen (bijv. 8 ms per frame via een
promise die pas klaar is als de rijen erin zijn). Kosten S, risico L.

**B8. Reizen zonder laadscherm of met een te kleine voorverwarming.** (a) `watchJumps` slaat over bij cutscene,
`cameraOverride`, `pendingRespawn` en binnen 2 s na een film (main.js:1152): de wereld toont dan de far LOD
terwijl de ring bouwt. (b) 'snel' (700 tot 3000 m) roept `prewarmStreamAt` niet aan (loadscreen.js:117) en wacht
minimaal 0,6 s (loadlogic.js:11). (c) Bij zichtafstand 'kort' (150) is far LOD uit (`viewDist > detailR + 20`,
farlod.js:635, scene3d.js:3080): tijdens het bouwen na een sprong ontbreekt het vangnet. (d) Trein: vast 1,5 ms
(stationtravel.js:829), buiten `streamFrameMs`. Voorstel: (b) ook bij 'snel' `prewarmStreamAt(x,y,10)`; (c) far LOD
niet laten afhangen van +20 zolang `lodR < DRAW_DIST`. Kosten S, risico L.

**B9. Vaste wachttijden zonder meetbare reden.** (1) Tour: 2200 ms per plek en 70 frames (main.js:430-432). (2)
`BUILDING_LINK_WAIT_MS` 2000 ms (scene3d.js:1803) en dezelfde 2000 ms voor batches (staticbatch3d.js:388,
scene3d.js `batchReady`): een mesh dat na 2 s alsnog niet gelinkt is, wordt toch getekend en blokkeert dan het
frame. (3) `PREWARM_WAIT_MS` 20 s en poll 250 ms (scene3d.js:3741-3742). (4) 20 s-timer die gepinde tegels, materialen
en gras na de start loslaat (main.js:941-943), los van of de film nog loopt. (5) Laadscherm: 12 rustige frames en
minimum 2,2 / 1,4 / 0,6 s (loadlogic.js:7-13, 41-45). Voorstel: metingen per grens in `__loadMarks` loggen
voordat iets verandert; (1) is kandidaat voor B1. Kosten S, risico L.

**B10. Wegen: kop-van-de-rij-blokkade.** scene3d.js:2224-2229. De eerste weg in rang die nog op de worker wacht,
laat alle verder gelegen wegen overslaan, ook als hun oppervlak klaar is; `roadDetailR` krimpt dan tot die weg
(min 24 m, scene3d.js:2259) en de far LOD tekent de wegen erachter. Dat is bewust (de far LOD dekt), maar bij
een trage worker blijft het ring-gat langer. De heavy-wachtrij (ba1ba2b4b) is al gerepareerd. Voorstel: eerst
meten (`roadSyncStats`, scene3d.js:2169); bij `waiting` gewoon de volgende klare weg bouwen en `roadDetailR`
alleen op echt ontbrekende wegen laten staan. Kosten S, risico M.

**B11. Bruggen en kit/far-box in de ring.** Far-bruggen liggen op +0,05 m, het detaildek op 0,03 (farlod.js:341,
#919), dus in de overgang kan het far-dek boven het detaildek tekenen (z-fighting; niet gezien). Kit-kerken
en molens: detail binnen 320 m (landmarklayer3d.js:19), de far-kist is sinds #917 verborgen (zie B5 voor de
rebuild). Een gebouw dat via `setBuildingHidden` (home.js:970, safehuizen.js:298) verdwijnt, geldt hetzelfde.
Niet geverifieerd in beeld.

## 6. Niet geverifieerd

- Alle tijden en aantallen behalve de constanten zijn niet gemeten (geen Electron gestart, op verzoek).
  "~48 ms" voor de basisindex en "~18 frames" voor de grasherbouw komen uit code-commentaar en schatting.
- Of `geoVer` in de praktijk vaak genoeg bumpt om de far LOD te laten uithongeren (B3): hangt af van de
  tegelsnelheid; meet met `farLod.stats.queued` en `lastBuildMs` tijdens een rit.
- De index van de gebouwde wereld (`game/world/`) is niet in git; `index.sparse` is alleen uit
  scripts/world/pack_tiles.mjs:309 afgeleid.
- Facade-batcher, schaduwkaart, voertuig- en persoonsmodellen, rails en water-LOD niet nagelopen.
- v0.54.0-vergelijking is op code en commits gedaan, niet door te draaien.

## Laadstappen en de balk van het laadscherm (opdracht 21-11)

De balk van het eerste laadscherm kent sinds opdracht 21-11 alle stappen van het opstarten (`BOOT_STEPS`, `bootPlan` in
`game/js/loadlogic.js`) en staat pas vol als de laatste stap klaar is. `main.js` meldt elke stap met `setBootStep(id, deel)`;
`startscreen.js` tekent balk, streepjes en de ene statusregel met de zin van de stap (geen "Stap n van m"). Stappen die een run niet heeft (testrun zonder
warm-up, openingsbeelden alleen met `?warmfilm`, geen geluid met `?stil`) vallen uit het plan; de gewichten worden dan opnieuw tot 1 geschaald.

| Stap | Wat er gebeurt | Voortgang binnen de stap |
|---|---|---|
| kaart | `loadTileWorld`, plekken, voorzieningen | aantal gelezen tegels |
| wereld | `init3D`, kaartrand | vaste momenten |
| systemen | World, verkeer, missies, HUD, terrein | vaste momenten door `boot()` |
| buurt | startbuurt voorbouwen (`warm()`) | wat er nog te bouwen is tegenover het begin, plus de rustige reeks frames |
| openingsbeelden | alleen `?warmfilm`: montageplekken | plek voor plek |
| shaders | `precompilePrograms` (één blokkerende aanroep, ca. 1/6 van de stap) en daarna de linkwacht | geklaarde programma's tegenover alle (`programsTotal`, `programsPending`) |
| geluid | decoderen van de samples (`sampleStats`), hoogstens 5 s | geladen tegenover alle samples |
| beeld | het startscherm tekent de eerste beelden; daarna `finishLoading` = 100% | geen |

**Meting (21-11, Electron, nieuw spel met `?warm`, drie andere Electron-runs tegelijk, dus trager dan normaal):** de modules laden
8,8 s vóór `boot()` (de balk is dan nog statisch: geen JS die hem aanstuurt), kaart 5,7 s plus 0,7 s, wereld ca. 1,8 s, systemen 6,6 s
(World en de init-functies 5,5 s), terrein ca. 0 s (de gebakken grond is er al), buurt 12,8 s (twee frames, het slechtste 8,1 s), shaders
2,0 s blokkerend plus de linkwacht tot de grens van 12 s (`FILM_LICHT_MS`), gameStart 55,1 s. Op de machine van de eigenaar zijn de
shaders +16 tot 18 s. De gewichten in `BOOT_STEPS` volgen die verhouding (kaart 12, wereld 6, systemen 13, buurt 18, shaders 33 (16
zonder filmlicht), geluid 4, beeld 6, openingsbeelden 12) en zijn relatief. Meet opnieuw met `--url-flags=warm,laadstappen`: de
console krijgt een tabel met ms en procent per stap (`window.__loadMarks.stappen` heeft elk gemeld moment, `stepDurations` rekent ze om).

**Niet in de balk:** het laden van de ~1000 modules vóór `boot()` (8,8 s in deze meting) en het wachten op de naam bij Samen spelen
(daar staat de balk stil en staat in de statusregel wat er gevraagd wordt). De shaderstap kan binnen de ene blokkerende compile-aanroep
niet bijwerken; die aanroep zit in `scene3d.js` (grens 4500 regels), de linkwacht erna wel.
