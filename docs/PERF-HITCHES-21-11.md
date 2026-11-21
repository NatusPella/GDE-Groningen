# De laatste grote haperingen (21-11-2026, #1008, #1046, #1015)

> Opdracht: de longtask van ca. 6,5 s rond 28 s na de start (shaderlinking), garbage collection in de hot paths, de laatste
> CPU-hotspots (graafopbouw in `routing.js`) en een controle dat Laag echt goedkoper is. **Zonder Electron**: een
> releasegate-agent draaide de perf-fasen. Alles hieronder is dus node-bewijs, statische analyse en de bron van three r160;
> **niets is in het spel gemeten**. Tak `hitches-21-11` op main 828ec9f57, niets gepusht of gemerged.
> Bouwt voort op `PERF-START-21-11.md`, `PERF-PROFIEL-21-11.md`, `PERF-HEAP-21-11.md`, `PERF-WEGINDEX-21-11.md` en
> `PERF-TEGELSTREAM-21-11.md` (de tegelstream is niet aangeraakt).

## 1. Shaderprogramma's: waarom miste `renderer.compile` ze?

### Wat de bron van three r160 zegt (gelezen in `desktop/vendor-cache/npm/three@0.160.0/build/three.module.js`)

- `renderer.compile(obj, camera, targetScene)` verzamelt de **lichten** met `traverseVisible` (van het doel én van `obj`) en loopt voor de
  **materialen** met `obj.traverse`, dus **ook over verborgen objecten**. De aanname van de tweede ronde van `PERF-START` ("compile loopt
  alleen over zichtbare objecten") klopt dus niet: `withAllVisible` was voor materialen overbodig en had één echt effect: verborgen
  **lichten** in een gecompileerde groep werden zichtbaar en telden mee.
- De programmasleutel (`getProgramCacheKey`) bestaat uit shader-id, defines, 48 parameters (o.a. `numPointLights`, `numDirLightShadows`,
  `outputColorSpace`, `toneMapping`, `numClippingPlanes`), twee bitmaskers (o.a. `instancing`, `instancingColor`, `vertexUv1s`, `useFog`,
  `shadowMapEnabled`, `skinning`, `opaque`) en de `customProgramCacheKey`. Een draw die een sleutel nodig heeft die compile niet maakte,
  linkt synchroon bij het eerste beeld. De lichtparameters komen uit de lichtstand **op dat moment**.

### Gevonden en gefixt (op grond van de bron; effect in het spel nog niet gemeten)

| # | Oorzaak (sleutelverschil) | Fix |
|---|---|---|
| 1 | `startcompile.js compileGroup` zette met `withAllVisible` ook verborgen **lichten** in de groep aan. De geleende setlichten (`setlights.js`, bij het tekenen verborgen) telden dan mee: de set (keuken, loket, kantoor, kamers) kreeg programma's voor N+k lichten, het echte beeld wil N: `numPointLights` verschilt, alle materialen van de set linken bij het eerste setbeeld. | `compileGroup` gebruikt `withAllVisible` niet meer. Daarnaast `withBorrowedSetLightsHidden` (setlights.js): bij een compile staan de geleende lichten in de groep uit, zoals bij het tekenen (alleen als de rig lampen heeft, dus niet op Laag, waar de setlichten echt blijven). |
| 2 | `precompile(obj)` telde de lichten van een groep dubbel: ze zaten in de gecachte lichtscène **en** in `obj` zelf (r160 telt beide). | `compileScene(obj)` laat de lichten onder `obj` uit de lichtscène weg. |
| 3 | De radiostudio van Rikus (`radiostudio.js`: openingsfilm en terugblikken) maakte twee echte `PointLight`s: zolang de studio er staat verandert `numPointLights` voor elk lit materiaal. | De lichten lenen nu een nachtriglamp (`adoptSetLight`, zoals keuken en kantoor). Op Laag blijven ze echt. |

Wat ik **niet** kon vaststellen: welke van de programma's van de lijst (hemelkit, pool-statisch, skyprops, speler-huis, paddepoel,
cutscene-licht, film-grade) bij de eerste draw linken, en of de 6,5 s-longtask (die de tegelstream-ronde aan shaderlinking toeschreef)
door 1 tot 3 verdwijnt. Dat vraagt een echte renderer. Nagelopen en **uitgesloten** op grond van de code: de uitvoerdoel- en
tonemapping-sleutel (compile en draw gebruiken beide `postfx.sceneTarget`, en bij Laag zonder compositor `null`), de omgevingskaart
(één PMREM-doel, zie `sky3d.js`), `scene.fog` (één `Fog`, nooit `FogExp2`), clippingvlakken (niet gebruikt), `renderer.toneMapping`
(alleen bij de start gezet) en de schaduwvlag van de zon (alleen bij een instellingenwissel). `needsUpdate` op materialen staat alleen
op instellingswissels (grass, roadsurface, water, countrybuilding, interiorglass) en bij `setWreckGlass` (wrakglas: `transparent`
wisselt de `opaque`-bit, dus een nieuw programma per glasmateriaal bij het eerste wrak).

### De programma-sleutelinspectie (`game/js/programwatch.js`, test `scripts/programwatch_test.mjs`, 26 controles)

In een node-test kun je geen echte renderer draaien (geen WebGL); daarom is de inspectie een **teller in het spel** plus een
**zuivere ontleder**, getest met een nep-renderer:

- `parseKey`/`diffKeys` ontleden een sleutel in zijn velden en geven het verschil bij naam: `numPointLights 2 -> 4`, `+instancingColor`,
  `-shadowMapEnabled`, `outputColorSpace srgb-linear -> srgb`, `custom ...|cut -> ...|cutc`. De veldlijsten staan in de test tegen de echte
  three-bron vergeleken (alleen als `desktop/vendor-cache` gevuld is).
- `createProgramWatch`: elk nieuw programma (de bestaande `pinShaderPrograms`-hook in scene3d.js) wordt voor de start, **in een compile**
  (`precompile` zet `begin()`/`end()` om `renderer.compile`) of **bij het tekenen** geteld. Een programma bij het tekenen na de start is een
  gemiste compile: de teller zoekt het programma met dezelfde shadernaam waarvan de sleutel het minst verschilt (de tweeling) en bewaart
  het verschil. `main.js` markeert de start aan het eind van de warm-stap (`programWatch.markStart()`).
- **In de technische info** (Instellingen, Kopieer technische info) staat nu het blok `[Shaderprogramma's na de start]`: totaal, voor de
  start, na de start voorbereid, na de start bij het tekenen, plus de laatste twaalf met hun verschil en een regel "Let op: N shaders zijn
  pas bij het tekenen gelinkt". `window.__programWatch` geeft hetzelfde aan `scripts/perf/programs.page.js` (veld `watch` in de uitvoer).

## 2. Garbage collection

- **Statische allocatiescan** `scripts/perf/allocscan.mjs` (`node scripts/perf/allocscan.mjs --top=30 --min=6`): telt in functies die elk
  beeld draaien (`update*`, `draw*`, `render*`, `sync*`, ...) de patronen die geheugen vragen (`new`, array- en objectliteralen,
  `.map/.filter/.slice`, spreads, closures, stringplakwerk). Het is een richtlijn, geen meting.
- Uitkomst voor de hot-path-modules: de verkeersmodules (`traffic.js` 4) en voetgangers (`pedestrians.js` 12) zijn al schoon; de
  **minikaart** (`hud_panel.js drawMinimapPois` 53, `drawMinimap` 47, `drawVillageNames` 27) en de **grote kaart** (`mapview.js
  drawDynamicMarkers` 122, `drawStaticOverlay` 65; alleen met de kaart open) bleven over.
- **Gedaan:** `drawMinimapPois` deed per getekend beeld (20 tot 30 per seconde) ca. 25 lijstscans met `filter`, closures en een array
  per pin. De POI-keuze (`collectMinimapPois`) loopt nu vier keer per seconde, of eerder als de speler 6 m liep, de wereld wisselde of een
  bijbaan begon of eindigde; de tekenlus gebruikt een vlakke lijst en een afbeelding zonder array per punt (`toScreen.into`). In
  de scan valt `drawMinimapPois` daarmee van 53 naar 0 per-beeld-treffers. Een pin die tussendoor van plek wisselt (live bus) loopt
  hooguit 250 ms achter. Niet in beeld bekeken.
- **Niet gedaan:** `drawMinimap` zelf (een grote functie met veel closures per tekenbeurt; de cadans uit `minimapcadence.js` houdt hem op
  20 tot 30 fps), `drawVillageNames` (spatieplakwerk van een paar labels), `updateCards`, `updateSpeedo` (klein, alleen bij wijziging)
  en de grote kaart. Kandidaten met weinig winst per frame; zonder GC-profiel uit Electron niet de moeite waard.
- Geen allocatieprofiel (`--trace-gc`, heap per frame) gedraaid: `--trace-gc` komt niet uit de renderer (zie PERF-STIL) en er was geen Electron.

## 3. CPU-hotspots

- **Graafopbouw in `routing.js`** (250 ms op de echte stad, hooguit een keer per seconde nadat de lagen stil zijn): de berekening is nu
  `game/js/routegraphbuild.js graphBuildSteps`, een generator die na elke 250 wegen en elke 40.000 kanten `yield`t. `updateRouting` draait
  hem per beeld met een budget van 4 ms (`GRAPH_STEP_MS`); de oude graaf blijft in gebruik tot de nieuwe klaar is (zoals voorheen tijdens
  een tegelstroom). Een routevraag die nu een graaf nodig heeft (`findWalkPath`, `planLandRoute`, `snapWaypoint`) maakt een lopende
  bouw achter elkaar af, onder dezelfde poort (`mayBuildGraph`, geen lopende tegelstroom, niet in de montage): dezelfde semantiek.
  De laagversies (`_roadVer`, `_buildingVer`) worden bij het **begin** van de bouw vastgelegd: verandert er tijdens de bouw iets, dan
  begint hij opnieuw en is de nieuwe graaf meteen weer verouderd.
  Bewijs (`node scripts/routegraphbuild_test.mjs --bench`): stap voor stap geeft **dezelfde graaf** als achter elkaar (alle zes CSR's, de drie
  componentenkaarten, knopen, wegindexen; 3000 wegen op een rooster met gedeelde knopen, eenrichting, bruggen, bus-only en
  doorsteken); op 20.000 wegen 47 ms achter elkaar tegen 116 stappen met een **langste stap van 7,5 ms** (de rest rond 0,3 ms). Op de
  echte stad (115.000 knopen) zijn de stappen groter; de eerste stap bevat ook `orderedRoads()` (raster plus sortering).
- `insideBuilding`, de wegenindex en de grasschunks zijn al gedaan (zie de andere rapporten). `furnitureForTile` (5,4%) heeft al rasters
  voor wegen en huizen; wat overblijft is `nearestRoad` per OSM-punt (een lineaire scan van alle wegen van de tegel). Een raster-zoeker
  met dezelfde tie-regel (laagste weg-, daarna segmentindex) is mogelijk maar zonder echte tegels niet te bewijzen; **niet gedaan**.
  `3d:roads` en `traffic` (graaf) zijn met de gedeelde wegenindex al aangepakt; niet opnieuw gemeten.

## 4. Laag: is het echt goedkoper? (budgettabel per preset)

Uit de bron gelezen; `scripts/laagbudget_test.mjs` (13 controles) bewaakt dat Laag in geen enkele tabel boven Middel of Hoog komt.

| onderdeel | Laag | Middel | Hoog | bron |
|---|---|---|---|---|
| pixelratio (voor de dynamische schaal) | 1 | 1,5 | 1,5 | settings.js |
| schaduwen | **aan**, kaart 1024, helft 40 m | aan, 2048, 36 m | aan, 4096 (2048 bij terugschroeven), 32 m | settings.js, scene3d.js |
| nabije detailafstand (bij zicht normaal of meer) | 140 m | 160 m | 170 m | viewdist.js |
| nachtrig: puntlampen / spots / politielampen | 0 / 0 / 1 | 3 / 1 / 2 | 6 / 2 / 3 | nightlights3d.js |
| grasbosjes | geen | straal 28 m, cap 16.000 | straal 40 m, cap 45.000 | grass.js |
| nabije gevel- en wegdetail (bump, kader, baksteen) | uit | aan | aan | roadsurface.js, countrybuilding.js |
| post-effecten | geen compositor als de start Laag was (native MSAA); anders 4 samples op 1x, geen bloom en geen grade | 2 samples, geen bloom | 2 samples, bloom, grade | postfx3d.js, postsamples.js |
| regen / plassen / bliksemflitsen | 0,45 / 0 / 1 | 0,75 / 0,4 / 2 | 1 / 0,55 / 3 | weatherlook.js |
| sterren | 35% | 65% | 100% | nightrules.js |
| dierenbudget (totaal) | 24 | 48 | 80 | dierenplan.js |
| water (kwaliteit), interieurglas, kademuren | 0, uit, uit | 1, aan, aan | 2, aan, aan | water3d.js, interiorglass.js, quaywalls.js |

**Verborgen kosten en afwijkingen gevonden (niet veranderd, zie "Beslissingen voor de eigenaar"):**

1. **Laag heeft schaduwen aan** (1024). De oude migratie (`savemigrate.js` v3) zette ze op Laag uit; de preset zegt nu `shadows: true`. Een
   schaduwpas tekent elke werper opnieuw: drawcalls en driehoeken van de nabije werpers komen er bovenop. Of dat op Laag de moeite
   waard is moet een A/B laten zien (zie de metingen hieronder).
2. **Setlichten zijn op Laag echt licht** (er zijn geen poollampen om te lenen). Een set (keuken, loket, kamer, radiostudio) die verschijnt
   verandert daar `numPointLights`; de compile telt dat nu mee (fix 1), maar de wereld die tegelijk in beeld staat linkt bij het verschijnen
   van de set een tweede programmaset. Op Hoog en Middel lenen ze een poollamp, dus daar speelt het niet.
3. **Samples x pixels:** op Laag 4 samples op pixelratio 1 (= 4) tegenover Hoog 2 samples op 1,5 (= 4,5): gelijk; het is een
   ontwerpkeuze uit #658, geen extra kosten, maar wie van Hoog naar Laag **wisselt** zonder herstart heeft geen native MSAA en krijgt
   een compositor met 4 samples (meer dan een herstart op Laag, waar de compositor ontbreekt).
4. **De PMREM-herbouw** (`sky3d.js`, om de seconde bij verandering) draait op elke preset even vaak; op Laag zou 3 s volstaan.
   Niet gemeten, niet veranderd.

## Wat nog in Electron gemeten moet worden (niets hierboven is in het spel gezien)

Eén Electron tegelijk, geen andere perf-run ernaast, CPU voor de run onder 20%, **mediaan van 3 runs**, gepaard afwisselend (oude tak
`main` 828ec9f57 tegen deze tak), wereld van een recente build (`GDE_GAME_DIR`/`ELECTRON_EXE`, zie `scripts/perf/stagecheck.mjs`).

| # | Wat | Commando | Wat te lezen |
|---|---|---|---|
| 1 | Programma's na de start, compile tegen draw, tweeling | `GDE_DIAG=1 node scripts/perf/filmwarm.mjs --label=hitches` (3x); het veld `watch` in `<out>/hitches.json` | `watch.stats.lateDraw` (doel: dicht bij 0), `watch.late[].diff` (welk veld verschilt), bootMs, `win.s0_60`, programma's op 0/25/60 s |
| 2 | De longtask rond 28 s | `node desktop/main.js` of de gestagede exe met `--benchmark=1 --bench-eval` op Hoog en Laag (`--preset=quality:hoog`, `--preset=quality:laag`), 3 runs; daarna Kopieer technische info | longtasks > 50 ms en de langste, `[Haperingen]` en het blok `[Shaderprogramma's na de start]` |
| 3 | Setbeelden (keuken, loket, kantoor, kamer, radiostudio) | `node scripts/perf/filmwarm.mjs --label=film` (de opening bevat keuken en studio) plus een binnenmissie (M03 Het Loket) met `programs.page.js` | `watch.late` bij het eerste setbeeld, per kwaliteit Laag en Hoog |
| 4 | Graafopbouw in porties | `node scripts/perf/run.mjs hoog --preset=quality:hoog --hitch` (routes foot, ring, a7) | `3d:roads` en `traffic` (sectiepieken), `graphStats`, `getRoutingStats()` (`buildMs`, `steps`, `restarts`): `steps` > 1 en geen frame > 50 ms door `ensureGraph`; en dat een route na een tegelwissel nog klopt (nieuwe wegen worden gevonden) |
| 5 | Minikaart | dezelfde routes, sectie `hud` | `hud` per beeld, heap na GC (`heapLiveMB`), GC-aandeel in het CPU-profiel (`PERF_PROFILE`, `selftime.mjs`); in beeld: pins verschijnen en verdwijnen soepel bij het lopen |
| 6 | Laag A/B | `--preset=quality:laag` met en zonder schaduwen (Instellingen, Schaduwen uit), `--benchmark=1` | gem. fps, p95, drawcalls (`De stad per beeld`) |
| 7 | Samen spelen | niet nodig voor 1 tot 3 (lokaal per speler); wel één run met twee vensters om te zien dat de gast dezelfde routes krijgt | handmatig |

Pas na 1 en 2 is te zeggen of fix 1 tot 3 de 6,5 s-longtask wegnemen. Blijft hij, dan gaat de volgende stap via `watch.late[]`: de
lijst noemt welk veld verschilt, en `programs.page.js` (`own`) welk materiaal het programma bezit.

## Beslissingen voor de eigenaar

- Laag met of zonder schaduwen (1024) als standaard: eerst de A/B (punt 6).
- Op Laag poollampen voor sets (twee onzichtbare puntlampen met intensiteit 0) tegen een tweede programmaset bij elke set: eerst meten.

## Samen spelen

Is het van wie het spel opende? Nee: alles hier is lokaal per speler (graaf, minikaart, shaders, technische info). Een gast ziet geen
verschil; de graaf komt uit dezelfde wegen en gebouwen. Beloning of voortgang: geen. Wegvallen of later aansluiten: de graaf volgt de
eigen tegels. Dekking: `routegraphbuild_test`, `programwatch_test`, `setlights_test`, `laagbudget_test` (pure tests).

## Tests en gates

`routegraphbuild_test` (8), `programwatch_test` (26), `setlights_test` (17), `compiletarget_test` (5), `compileplanner_test` (7),
`startroute_test` (98), `laagbudget_test` (13), `graphgate_test`, `nearestroad_test`, `firstperson_test` (328, `scene3d.js` 3817 regels),
`gpudiag_test`, `hud_layout_test`, `hud_kleuren_test`, `busui_test`: groen. `node --check` op alle gewijzigde bestanden. De volledige
suite, de zware audits en een Electron-verhaaltest zijn niet gedraaid (de coördinator doet die bij de release).
