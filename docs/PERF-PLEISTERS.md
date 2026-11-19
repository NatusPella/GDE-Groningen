# Prestatie-pleisters sinds v0.54.0: inventaris en oordeel (stand HEAD 5c69fbea1, 19-11-2026)

> Aanleiding: de eigenaar vermoedt dat het spel sinds v0.54.0 trager is geworden en dat we
> "lab-middelen" (voorwarmen, vooraf compileren, spreiden, vasthouden, budgetten, guards) hebben
> gebouwd in plaats van de oorzaak te fixen. Dit document is uit code, `git log v0.54.0..HEAD`
> en de bestaande meetdocumenten gereconstrueerd. Er is **niets gestart en niets gemeten**.
> Bronnen: [LAAD-STREAMING-LOD.md](LAAD-STREAMING-LOD.md), [PERF-TREND-0.54-NAAR-NU.md](PERF-TREND-0.54-NAAR-NU.md),
> [PERF-BESLUITEN.md](PERF-BESLUITEN.md), [PERF-METING-2026-11-09.md](PERF-METING-2026-11-09.md),
> [PERF-METING-2026-11-05.md](PERF-METING-2026-11-05.md). Regelnummers zijn die van HEAD.

## Kritisch oordeel (5 zinnen)

1. De eigenaar heeft grotendeels gelijk: het merendeel van de tientallen prestatiecommits (van 1081 commits sinds v0.54.0) verschuift of verbergt werk (voorwarmen, vasthouden, spreiden, begrenzen) en haalt het zelden weg; in de eigen metingen staat dat letterlijk ("verschuift werk, het haalt het niet weg", PERF-METING-2026-10-19 r.374).
2. De meest herhaalde, goed gemeten oorzaak is één ding: **een nieuw shaderprogramma dat voor het eerst getekend wordt linkt synchroon** (`gl:getProgramParameter` 1525,7 ms voor "building (hidden)" en "pool"; 417 ms voor "green-chunk"; PERF-METING-2026-11-09 r.364-380 en r.523-540), en we hebben tientallen materiaal- en lichtvarianten (`onBeforeCompile` in 17 bestanden, 20x `customProgramCacheKey`) die dat veroorzaken; bijna elke opwarm-, tour-, palette- en cine-batch-pleister bestaat om dit ene symptoom te verstoppen.
3. Het meest schadelijke gevolg is de laadtijd: de eerste 25 s + 70 s opwarmbudgetten (v0.59 en v0.62), met een gemeten `introTour ~58 s, gameStart ~123 s` (commit 8c3630ca5), terwijl v0.54.0 niets voorwarmde; de bovengrens is op 19-11 (7faf1917d) teruggebracht naar 15 s, maar dat is een kleiner pleister, niet de oorzaak.
4. Een tweede reeks pleisters maskeert de oorzaak "te veel werk per tegelwissel en per frame op één hoofdthread" (`geoVer`-storm sinds `unpinCity` v0.60.0, gras-chunks die bij elke groen-tegel weggaan, `follow` met 0,4 tot 1,5 ms, `updateGameplay` 114 naar 132 aanroepen), en die pleisters veroorzaakten zelf echte bugs: verdwenen wegen (heavy-wachtrij, #883, ba1ba2b4b) en een openingsfilm die niet eindigde (telefoon-skip, 2,5 minuut vast, main.js:1123).
5. Eerlijk voorbehoud: er is **geen enkele gepaarde A/B-meting v0.54.0 tegen HEAD op dezelfde machine** (PERF-TREND deel B staat nog leeg), dus "veel trager" is voor de frametijd niet bewezen; bewezen is alleen de langere laadtijd en dat er veel bookkeeping bij is gekomen (+16% bestanden, +53% `main.js`, +16% `updateGameplay`-aanroepen, PERF-TREND A2).

Let op: een aantal "pleisters" bestond al in v0.54.0 (`prewarmStreamAt` voor cutscenes 4 s/110 m, `prewarmLightVariants`,
`BUILDING_LINK_WAIT_MS`, `FrameQueue`, `MultiDraw`, `StaticBatch`, `cpuLevel`/`dynamicScale`, `syncIdle` voor gebouwen,
gecontroleerd met `git grep <naam> v0.54.0 -- game/js`). Die tellen hieronder niet als nieuw.

## Leeswijzer

Kolommen: **Wat** (bestand:regel, commit, datum) | **Symptoom / echte oorzaak** | **Kosten van de pleister** | **Schrappen als de oorzaak weg is?** | **Meten**.
Oorzaak-codes (hieronder uitgelegd in "Oorzaken"): S = shader-first-use/te veel programmavarianten, T = tegelwissel en `geoVer`, H = synchroon werk op de hoofdthread, F = film met tien koude sprongen, D = te veel per-frame-systemen.

## Oorzaken (wat de pleisters eigenlijk bestrijden)

- **S. Programmavarianten die synchroon linken in de render.** `hookLinkGuard` en `LINK_POLL_MS = 25` (scene3d.js:1444, 1465) laten de draw van een niet-gelinkt programma een paar frames wachten (KHR_parallel_shader_compile, scene3d.js:1423-1460); het blokkeert tóch tot 1,5 s als de GPU-backlog groot is (METING-11-09 r.364-400). Het green-chunk-programma werd na een warm-up nog steeds in-game gelinkt, want de dummy-mesh had een andere programmasleutel (r.523-563, teruggedraaid 14-11).
- **T. `geoVer`-storm.** Sinds `unpinCity` (v0.60.0) komen en gaan er in de stad tegels; elke wissel bumpt `geoVer` en ontkracht caches, idle-guards, far-LOD-basis en gras (LAAD-STREAMING-LOD B3, B4; niet gemeten).
- **H. Synchroon werk op de hoofdthread.** Tegelrijen in rasters, `addTile` 13,5 ms gemiddeld (85 boven 20 ms, max 531; PERF-METING-2026-10-19 r.658), meshbouw, gras, wegen "heavy" (bouwt de hoofdthread zelf), `registerShots`/`prefetchPoints` met `tileQueue.run(1e9)` (tileworld.js:556, 575).
- **F. De openingsfilm.** De montage springt over tien plekken, elk een koude buurt met eigen gebouwen, perrons, water en gras. Bijna alle `cine`-pleisters bestaan om die ene film niet te laten haperen (ad211b2b4, 11-11: "montage terug als opening met performance-vangnet").
- **D. Meer per-frame-systemen.** 114 naar 132 aanroepen in `updateGameplay`, 211 naar 225 in `update3D` (PERF-TREND A2); voertuig-binnenruimtes, laadruimtes en bootinterieurs als extra tick-soorten.

## (A) Schadelijk: veroorzaakt zelf bugs of laadtijd

| # | Wat | Symptoom / oorzaak | Kosten van de pleister | Schrappen? | Meten |
|---|---|---|---|---|---|
| A1 | `START_WARM_MS`/`WARM_BOOT_MS` (main.js:278-290, 349-381); af23ed02f 8-11, aangepast 7faf1917d 19-11 (25 s naar 10 s, totaal 15 s) | Hitch bij eerste draw van shaders/gebouwen (S, H). Houdt de eerste seconden in de wereld rustig. | Laadscherm: tot 15 s nu, was 25 s. Elke start, ook Doorgaan. Lus telt `readyDone` mee en `START_WARM_MAX_FRAME_MS=50` zet de rustteller terug (LAAD B1). Ring 320 m bouwt ~2,8 tot 5,4x zoveel gebouwen als de detailring en houdt ze 240 s (B6b). | Ja, grotendeels, zodra S weg is. Houd hooguit 3 s voor tegels van de startpositie. | `__loadMarks.startWarm`, `warmFrames`, `warmWorstFrame` (main.js:362-515); `?warm` houdt het meetbaar. A/B met `scripts/perf/loadcheck.mjs` en `ab.mjs`. |
| A2 | `INTRO_WARM_MS`/`INTRO_TOUR_MS`/tour (main.js:288-290, 383-442); a1840656e 9-11, 8c3630ca5 en a66eadd63 13-11, 7faf1917d 19-11 | Film haperde: `gl:getProgramParameter` 450-830 ms-pieken. Oorzaak F+S. | Gemeten laadtijd `introTour ~58 s, gameStart ~123 s` (8c3630ca5). Bovengrens was 95 s (PERF-TREND A3), nu 15 s. Alleen Nieuw spel. Plek-wachttijd telt de globale `prewarmBusy()` mee (LAAD B1). | Ja: bij de oorzaak-fix blijft hooguit één korte kijk op de eerste plek nodig. | `__loadMarks.introTour`, hitchprobe 100 s vanaf start (zelfde protocol als 8c3630ca5): `over100`, `over200`, `max`. |
| A3 | `setHoldMaterials` (scene3d.js:574-579, 629) en `setHoldGrass` (grass.js:842-843, 1000, 1016); 8c3630ca5, 8f30b7ab9 13-11 | Weer weggeëvicteerde wijken zouden hun programma's kwijtraken (S). | Geheugen (materialen en gras blijven vast; heap piek 2,76 GB in 0.60.7 vs 1,6 tot 2,4 GB later, METING-11-09 r.500-510), een 20 s-timer en cine-gedreven vrijgave (main.js:947) die lekken kan als de film eindigt via een nieuwe weg. Bijna-pleister: eerdere variant `52ef897bb` ("programma's blijven hangen") is al teruggedraaid (81415ddd5, 142ab13a8). | Ja. | Heap via `memcheck.sh`; `heldMaterials.size` na de film (niet gemeten). |
| A4 | Heavy-wegwachtrij: `heavyRoadAllowed`, `HEAVY_ROAD_WAIT_FRAMES = 12` (roadbudget.js:20-24; scene3d.js:2228-2235); ba82d2f4b 9-11, gerepareerd ba1ba2b4b 19-11 | Road-hitch 0,9-1,7 s in `3d:roads` (H: hoofdthread bouwt heavy wegen zelf). | **Echte bug**: in dorpen (Usquert 61, Visvliet 19 wegen) kwam geen heavy weg ooit aan de beurt, de detailring bleef op 24 m, alleen far LOD tekende de weg (ba1ba2b4b). Cap 4/frame en kop-van-de-rij-blokkade (LAAD B10) blijven. | Cap deels; de heavy-wachtrij zelf kan weg als wegen op de worker/gebakken komen (`_geoRoad`). | `roadSyncStats` (scene3d.js:2176: `heavyDeferred`, `deadlineStops`); test `scripts/roadbudget_test.mjs`; QA `weg_dichtbij` (fc7ef06e9). |
| A5 | Telefoon- en save-skip in de film (main.js:1119-1131); 2ab3ab848/338f1ed04 13-11 | `updatePhone` 50-145 ms midden in de film. | **Echte bug** (in de code beschreven): de filmklok stond stil omdat `updatePhone` de enige aanroeper van `updateCinematics` was; speler zat ruim 2,5 min vast. Alleen terugvondst, geen structurele oplossing van waarom `updatePhone` zo duur is. | Ja: eerst waarom `updatePhone` 50-145 ms kost (D/H). | hitchprobe sectie `phone`; test dat de film eindigt. |
| A6 | `holdShotTiles`/`registerShots` met `tileQueue.run(1e9)` (tileworld.js:556, 575; cinematics.js:236-262) | Cutscenes laden tegels vooraf. | Eén frame met alle rijen van alle gepinde tegels, niet gemeten (LAAD B7). Geen laadscherm bij cutscenes. | Beperk tot 8 ms per frame. | Marks per `registerShots`; hitchprobe tijdens missiewissel. |
| A7 | Laadscherm na reis wacht op `tileQueue.size` en `prewarmPending()` (loadlogic.js; 00136ea52 16-11, #929) | Wereld in beeld voordat gebouwen er zijn. | Langere reis-laadscherm; budget in dat scherm blijft 0,5 ms/frame voor 1,5 s (`STREAM_BOOT_MS`, streambudget.js:140-160; LAAD B2). | Nee, wél het budget omhoog onder het scherm. | `loadPending` per frame loggen; tijd per reis voor en na. |

## (B) Maskeert een oorzaak die gefixt moet worden

| # | Wat | Symptoom / oorzaak | Kosten van de pleister | Schrappen? | Meten |
|---|---|---|---|---|---|
| B1 | `precompilePrograms()` = `renderer.compile(scene)` over de hele scène (scene3d.js:1997; main.js:516); af23ed02f 8-11, e2ca4d10d 11-11 (compile-crash door Group-materiaal) | S: programma's vooraf linken. | Synchroon, onbegrensd, blokkeert tot alles gelinkt is (PERF-TREND A3: "nooit begrensd"). Verwarrend met drie andere compileermechanismen (`precompile(mesh)`, `prewarmLightVariants`, scene3d.js:3940; LAAD B6c). Warm-up van één variant mist de sleutel van de echte variant (green-chunk, 14-11). | Ja: één tel van programmasleutels maakt de lijst kort; daarna één compile-pad. | Teller programma's per `material.name` + `customProgramCacheKey` na een rondrit (`renderer.info.programs.length`); aantal moet dalen. |
| B2 | Palette-opwarm: `prepareOpeningWarm` 2x gebouwd (main.js:388 en 448), `takeWarmupSamples` (scene3d.js:4018), `queueWarmupObject` (4048); a1840656e, 8d657e0fa, aca7938e8 9-12/11 | Canvas2D-texturen (`createBrickDetailTexture` 2,85 s = 14% van de koude 20 s, METING-11-09 r.490) en shader-first-use. | Dubbel werk (LAAD B6a). `createBrickDetailTexture` is al uit de top-30; de rest is shader-first-use 6,3% (r.488). | Ja, eerst de dubbele bouw; daarna de hele palette zodra S weg is. | `__loadMarks.introPaletteBuild/Draw`; `--profile-load=20000` (r.477). |
| B3 | `drainCineBatches` + `setCinematicBatches` (scene3d.js:1810-1855; e160cb848 13-11) | Nieuwe batches (gebouwen, wegen, perrons) in één frame compileren en tonen = frames van 250-650 ms (S+H). | 1 batch per frame zichtbaar, 2,5 ms compileer-budget; gebouwen verschijnen later in de film. Complexiteit: drie sets (`cinePend`, `cineKlaar`, `cineQueue`) en een `cineReveals`-teller. Bestaat bovenop `BUILDING_LINK_WAIT_MS` (v0.54 al aanwezig). | Ja, met B1. | `3d:render:hoofdpas+post` piek in de film, `gl:getProgramParameter`. |
| B4 | Tegelbudget `streamFrameMs` (streambudget.js:140-160, 1,5/0,6/0,5/0,4 ms; main.js:1074-1081); 2ad12fc0d 15-11 (#937), cine 0,4 ms (main.js:1081) | Beperkt `follow`-werk (H) bij snelheid, trage frame en sprong. | Trager vullen na sprong (LAAD B2); het scherm wacht erop. Vorm "budget krimpt bij belasting" maakt de frametijd rustiger maar de wereld later compleet. | Nee: budgetten zijn legitiem zodra `addTile` zelf goedkoop wordt (12 ms gemiddeld nu, PERF-METING-10-19). | `world.map` tegelstats, `addTile` p95; pairs met `ab.mjs`. |
| B5 | Idle-guards `syncIdle` (scene3d.js:1678-1684, 1806), `roadSyncIdle` (2174-2192, 2276; f4887d65b 6-11), `waterIdle` (2106-2156; 8091b07bd 7-11), `SYNC_IDLE_FRAMES = 12/6` | Per frame onnodig gebouwen/wegen/water scannen (D). | Elke `geoVer`-wissel breekt ze (T); extra staat in vijf parameters per guard, risico op verouderde meshes. Hoofdgebouwguard bestond al in 0.54.0. | Alleen als de scan zelf goedkoop wordt; anders blijven. | `perfOff('bouwsync')`/`('wegsync')` in een A/B (`ab.mjs`), p50 `3d:buildings` en `3d:roads`. |
| B6 | Gras: `buildGrassChunks` 2 chunks/frame, opruimen 4, 3 ms-budget (grass.js:981-1017; af883b52c 8-11, 54280598d 14-11) | T: chunks sloop/bouw bij elke groen-tegel. | Groene vloer weg tot terug (LAAD B4, ~18 frames of meer). Hold tijdens film. | Ja: per tegel verversen. | `grass` sectie in hitchprobe; frames tot alle chunks terug. |
| B7 | Far-LOD bij tegelwissel: `resetTiles`, basisindex in stukken van 2,5 ms (#755), `oldMeshes` (#921) (farlod.js:420-660) | T: far-LOD moet bij elke `geoVer` over. | Herbouw ~48 ms code-commentaar, ~20 frames; hongert uit bij rijden (LAAD B3, niet gemeten). B5-LAAD: `hideFarBuilding` dispose't zonder `oldMeshes`. | Ja, met `geoVer` die alleen bij echte rij-wijziging verandert. | `farLod.stats.queued`, `lastBuildMs` tijdens een rit. |
| B8 | `popstagger.js` (main.js:65, 1184; e4b64f4fe 19-11): auto's/fietsen/scooters/motoren elke 1,5 s met 0,3 s fase, voetgangers 2 s | Populatie-werk 1-4 ms op één frame (D+H). | Bevolking verschijnt eerder gespreid; voetgangers per soort op een eigen frame. Complexiteit klein. | Nee, tenzij `manage*Population` zelf goedkoop wordt. | `populate`/`traffic` pieken (METING-11-09: populate 391 ms). |
| B9 | Voertuigmesh-fasering in de film (e9acc4a10 14-11): 2 meshes per frame binnen het filmvenster plus 15 s nasleep | Filmcut: alle voertuigen binnen 45 m in één frame, tot 114 ms. | Alleen in de film; voertuigen verschijnen later. | Ja met A2/B3. | `3d:vehicles` piek. |
| B10 | Lean-stand openingsfilm, straatmeubilair/index niet opbouwen in cinematics (756546150, e785b25fe, 31a5a081c, bb1b0fd84 9-11); tegelwerk na de film 15 s op 0,4 ms (2ab3ab848) | Per-frame werk onder de film (D). | Wereld "incompleet" tot 15 s na de film. | Ja: hangt aan F. | Hitchprobe film. |
| B11 | Netwerkcaches wachten tot de tegelwachtrij leeg is (a24fd8624/96522bdaf 9-11; e2e98bbe0 10-11 routegraaf) | `geoVer`-gedreven herbouw: roadGraph 0,45 s, verkeerslichten 0,23 s, straatmeubel 0,16 s. | Routegraaf/lichten pas klaar na een rustmoment; hier is het een echte structurele winst (laag-versies i.p.v. `geoVer`). | Blijven; dit is het goede soort fix (oorzaak weg). | Kost-per-tegel in hitchprobe `roads-net`, `cityprops`. |
| B12 | Standaardpreset Vlot i.p.v. Hoog (gfxprofile.js; edaadaef9 9-11) | "Op de MacBook Air M1 was Hoog onspeelbaar en Middel nog traag." | Lager startniveau voor alle spelers; verbergt trage rendering. | Terug zodra de renderkost omlaag is. | Preset-ab op M1 en een standaardmachine (`renderab.mjs`). |
| B13 | `perfOff(...)`-schakelaars (devflags.js:80, 43 gebruiken in game/js) | Meetgereedschap (kill-switches per systeem). | Geen speler-effect; vervuilt wel de codepaden. | Nee: labmiddel, houd. | n.v.t. |

## (C) Legitiem en blijvend

| # | Wat | Waarom blijvend | Meten |
|---|---|---|---|
| C1 | Tegeldecoderpool volgt kernen (tilestore.js:487, tileworld.js:43; 3dd8437c6), NAV niet naar de hoofdthread (cdfb89610), modulepreload en V8-codecache (4e044b331), index en globaal blok parallel | Verlaagt echte kost zonder wacht; geen gedrag veranderd. | `loadcheck.mjs` koude start. |
| C2 | Gras `syncTufts` hergebruikt lijsten (4f828ade8), segDist zonder allocatie (44f176cdd), AudioParam-events alleen bij verandering (6c9bed726), mixers op 30 Hz (04dddbead), slider 200 ms uitgesteld (64442232d), autosave parst niet opnieuw (e3c72ee1e), `separatePeds`/dedupe zonder Set-allocaties (7f967cff9, e4b64f4fe) | Echte micro-optimalisaties met meting; verlagen de gemiddelde frame. | `ab.mjs` `audio`, `grass`, `peds` secties. |
| C3 | Terreinbake en lezen (-2 s, PERF-TREND v0.59), waterindex tijdens laden (a0ba517b7), routing/waterindex op laagversies i.p.v. `geoVer` (74e75f79e) | Oorzaak, niet pleister. | `__loadMarks.terrain`. |
| C4 | Guards tegen hangen: tile-time-outs 30/60 s, boot-wachter 180 s, `PREWARM_WAIT_MS` 20 s (scene3d.js:3741) | Alleen foutpad. | Tests `scripts/*tilestore*`. |
| C5 | `FrameQueue`, `MultiDraw`, `StaticBatch`, `cpuLevel`/`dynamicScale`/`adaptedShadowLevel` (shadowlevel.js:17, scene3d.js:1102-1158) | Bestonden al in v0.54.0; adaptieve schaduw is legitieme kwaliteitsschaal. Niet nagelopen of de adaptieve map meer varianten van de schaduwpas veroorzaakt. | `renderab.mjs`. |
| C6 | Hitchprobe, `hook.js` pacing-blok, `norm_check`, perf-gate (ADR 0037) | Meetgereedschap; houd. | n.v.t. |

## (D) Onbekend

| # | Wat | Wat ik niet weet |
|---|---|---|
| D1 | `follow` met 0,4 ms in cine tegen 1,5 ms normaal (main.js:1081) | Of 0,4 ms in de film te weinig is voor de eerste gameplay-seconden; 2ab3ab848 geeft 15 s hold na de film. |
| D2 | `BUILDING_LINK_WAIT_MS` 2000 ms en 2000 ms voor batches (scene3d.js:1810; v0.54.0 al) | Of een mesh na 2 s toch getekend wordt en dan het frame blokkeert (LAAD B9). |
| D3 | Lean-stand-schalen in `updateGameplay` (simlagen, `skipFar`) | Niet nagelopen; `skipFar` bestond al in 0.54.0. |
| D4 | Wat de `updateGameplay`-groei (+18 aanroepen) kost | Geen perf-sectie per nieuw systeem; menukaart/kaartontdekking/schermen zijn de verdachten (PERF-TREND v0.62). |
| D5 | Of `unpinCity` (197b89aa0, v0.60.0) netto goed is | Geheugen/gaten versus `geoVer`-storm: niet gemeten. |

## Niet geverifieerd

- Geen enkele nieuwe meting; geen Electron gestart. Gemeten getallen hierboven komen uit de genoemde docs en commitberichten.
- Er is geen v0.54.0-tegen-HEAD-A/B op dezelfde machine (PERF-TREND deel B leeg). De kleinste bewezen vergelijking: a7 gem. 20,8 ms op 5-11 (stille machine) tegen 41,8 ms op 9-11 (na een crashfix, machine niet schoon, METING-11-09 r.20-40); die zijn niet vergelijkbaar met v0.54.0.
- Of A2-effecten nog gelden na 7faf1917d (15 s bovengrens): niet gemeten.
- `perf-`bestanden in `scripts/perf` en `desktop/` niet doorgelezen op extra pleisters; in `desktop/main.js` zag ik alleen `codeCache`, `backgroundThrottling: true`, preload-hints.
- Of heldMaterials/hold na de film altijd vrijkomt: alleen uit code gelezen.

## Voorstel: eerst oorzaken, dan schrappen

1. **Meten (1 dag):** een gepaarde A/B (`scripts/perf/ab.mjs` of `abpair.mjs`) v0.54.0-stage tegen HEAD op één stille machine, hitchprobe 100 s en `loadcheck.mjs`. Vult PERF-TREND deel B en maakt "trager" meetbaar.
2. **Oorzaak S (shaders):** tel programma's (`renderer.info.programs`) en sleutels per materiaal; reduceer varianten (`customProgramCacheKey` en `onBeforeCompile` consolideren), één compileer-pad (`precompile`). Meet `gl:getProgramParameter` en frames >100 ms in de film.
3. **Oorzaak T (`geoVer`):** idle-guards en far-LOD alleen bij echte rij-wijziging; gras per tegel; wegen/heavy naar worker of gebakken.
4. **Oorzaak H en D:** `addTile` en `registerShots` gebudgetteerd, `updateGameplay`-systemen meten per sectie.
5. **Dan schrappen:** A1 (start-warm tot hooguit tegels), A2 en B2/B3/B9/B10 (film-pleisters) met hun test, A3 (hold), A5 (telefoon-skip); houd B8, B11, C1-C6. Elke schrapstap met een gepaarde A/B en een zero-regressie op `over100`.
6. **Niet doen:** meer vaste budgetten bijplaatsen; een nieuw pleister krijgt pas een commit als de gemeten oorzaak erbij staat.

## Update 19-11 (tweede ronde): meting van de oorzaak S

Oorzaak S is nu gemeten (zie [PERF-TREND-0.54-NAAR-NU.md](PERF-TREND-0.54-NAAR-NU.md), deel D): 509 programma's na de film, waarvan 108 door een dubbel geteld licht in `precompilePrograms` (B1: gefixt) en 80 tot 112 door setlichten die het lichtaantal wijzigen (gefixt met `setlights.js`); nu ~310. Daarmee geldt voor de pleisters:

| # | Stand | Besluit |
|---|---|---|
| B1 `precompilePrograms` | compileerde tot nu toe in een lichttoestand die niemand tekent: het deed niets behalve 108 programma's en heap erbij. Nu compileert hij de echte toestand | houden en opnieuw meten (A/B niet gedaan) |
| A1-A3, B2, B3, B9, B10 | de film bouwt na de fixes nog ~130 rig-aan-programma's in de eerste 15 s | **niet geschrapt**: zonder pleister haperen de eerste 25 s nog 23-60 frames > 100 ms; elke schrapstap vraagt een gepaarde meting met meer runs dan er nu zijn |
| `?warmfilm`, `setHold*`, `drainCineBatches`, vaste wachttijden | niet opnieuw gemeten | blijven staan |

Volgende stap (oorzaak): het rig-aan-stel (10 punt- en 3 spotlichten in de shaderlus) linkt traag en wordt in de film bij dageraad gebruikt; alleen met minder lichten in de lus of met alle rig-aan-programma's klaar vóór de film is dat weg.
