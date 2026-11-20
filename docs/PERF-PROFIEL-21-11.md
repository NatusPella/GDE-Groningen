# CPU-profiel van de hoofdthread (21-11-2026): waar blijft de frametijd hangen?

> Opdracht (epic "Performance over de breedte"): profileer de hoofdthread in vier scenes, rangschik de hotspots, fix de grootste.
> Build: v0.64.0 plus de commits van deze ronde, gestaged met de wereld van een recente build (`agent-a93f4c9a4e68bfc0e`, 20-11).
> Meetharnas: `scripts/perf/run.mjs` (routes `foot`, `ring`, `a7`, `druk`), `--hitch` (secties per frame), CPU-profielen via
> `PERF_PROFILE` en `selftime.mjs`/`categories.mjs`/`callers.mjs`, preset Hoog, 1920x1080, echte GPU (ANGLE D3D11, RTX 3060).
> Niets gepusht of gemerged.

## Hitch-bronnen bovenaan (vraag van de coördinator, Nikky: 24 fps op Hoog, ook op Laag haperen)

Wat niet van de instelling afhangt en dus ook op Laag haperen veroorzaakt, in volgorde van wat het profiel laat zien:

1. **Wereldwijde herbouw van indexen bij elke tegelwissel, synchroon op de hoofdthread.** Het spel streamt in een
   wandeling van 15 s 300 tot 430 tegels in en uit (`tiles.loads` 312 tot 428; de tegelwachtrij kost 8,8 s aan `add`-werk in
   die route). Na elke wissel van de wegen- of gebouwenlaag bouwen vijf modules hun eigen index over **alle** geladen wegen
   opnieuw: `roadGraph` (vehicle/traffic.js), `buildNodes` (trafficlights.js), `fillNodes`/`netState` (roadsurface.js),
   `buildGraph` (routing.js: elke wegsegment krijgt drie gebouwtoetsen) en `buildGrassChunks` (grass.js). Dat zijn de
   enkele-frame-pieken in `--hitch`: **`traffic` tot 984 ms in één frame**, **`3d:roads` tot 1100 ms**,
   `roadnet-chunk` 124 frames van 8 ms of meer op de a7 (piek 276 ms). Het zijn dezelfde functies die in het CPU-profiel
   bovenaan staan (zie hieronder) en ze hangen niet aan de grafische instelling.
2. **Garbage collection.** `(garbage collector)` is 4,6 tot 5,6% van de bezette hoofdthread bij lopen en rijden in de stad
   en **11% op de a7** (ommeland rijdend). De allocaties komen van dezelfde indexbouw (`roadGraph` 9,6 MB,
   `buildNodes` 7,6 MB, `fillNodes` 1,8 MB levende bytes in 15 s streamen; zie de heap-sectie).
3. **Shaderprogramma's**: `(program)` is 2,4 tot 3,9% van de hoofdthread; het aantal programma's loopt op tijdens een
   route (foot: 20 nieuwe tijdens de route, ring 8, a7 4, druk 0; totaal 245 tot 303). Dat is het bekende
   linken-bij-eerste-gebruik (zie PERF-PLEISTERS.md); op de stadsroute druk zit het al na de eerste minuut op nul.
4. **Longtasks > 50 ms**: foot 26 (max 2,1 s), ring 49 (max 1,3 s), a7 246 (max 1,5 s), druk 155 (max 167 ms). Op de
   a7 zijn de meeste afkomstig van `traffic` (roadGraph), `3d:roads` en de tegelqueue.
5. **Tile-streaming op de hoofdthread**: `add` 2605 stappen = 8,8 s in 15 s wandeltijd (max 240 ms per stap), `drop` 323
   stappen = 1,5 s. `furnitureForTile` (straatmeubilair per tegel, streetfurniture.js:297) is zelf 5,4% van de hoofdthread
   op de stadsroute en loopt per item over alle wegen van de tegel (`nearestOnRoadList`, 10,6% op de ringroute).
6. **Audio-decodering**: niet gezien. `audio` is 0,0% van de hoofdthread in alle vier de profielen (de runs zijn `--stil`:
   dit is dus **niet gemeten** met geluid aan; `decodeAudioData` loopt toch op een eigen thread).
7. **Echte GPU tegenover `--in-process-gpu`**: alle metingen hier draaiden op de echte GPU. `--in-process-gpu` is **niet
   gemeten** (geen slot meer vrij; de machine zat steeds op 90 tot 100% CPU).

## Meetomstandigheden (eerlijk)

De machine was tijdens alle runs zwaar belast (CPU 69 tot 100% vóór de start; 7 tot 8 Electron-processen, de Claude-app,
andere agents). **Alle wandklok-cijfers zijn daardoor vervuild**: dezelfde build gaf op foot 22 ms en 77 ms gemiddeld in twee
opeenvolgende runs. De gepaarde A/B (3 paren, afwisselend oud/nieuw) laat ook zien dat de ruis (±50 ms) groter is dan elk
effect van deze ronde. Gebruikt zijn daarom: aandelen van de hoofdthread uit CPU-profielen (verhoudingen blijven staan),
deterministische tellers (herbouw-aantallen, chunk-meshes, heap na GC) en micro-benchmarks in node. CPU bij de start van
de runs: 88%, 98%, 98%, 69% (`machine.cpuBusyBeforePct`).

## Hotspots: aandeel van de bezette hoofdthread (preset Hoog, `selftime.mjs`)

| # | foot (stad te voet, koud) | ring (stad rijdend) | druk (stad te voet, 17:30) | a7 (ommeland rijdend) |
|---|---|---|---|---|
| 1 | buildGrassChunks 6,8% | nearestOnRoadList 10,6% | insideBuilding 17,4% | (garbage collector) 11,0% |
| 2 | gridItems 5,7% | insideBuilding 6,0% | roadGraph 5,9% | fillNodes 5,4% |
| 3 | (garbage collector) 4,6% | (garbage collector) 5,4% | (garbage collector) 5,6% | query (spatialgrid) 4,5% |
| 4 | insideBuilding 4,3% | fillNodes 4,5% | buildGraph 5,5% | gridItems 3,9% |
| 5 | nearestOnRoadList 3,8% | ensureGraph 4,0% | furnitureForTile 5,4% | (program) 3,9% |
| 6 | fillNodes 3,2% | gridItems 3,0% | nodeOf 4,3% | buildGrassChunks 1,8% |
| 7 | dropTile 2,7% | buildGrassChunks 3,0% | buildNodes 3,4% | getParameters 1,2% |
| 8 | (program) 2,5% | (program) 2,8% | fillNodes 2,8% | projectObject 1,2% |
| 9 | buildTrafficNetwork 2,3% | houseGap 2,6% | (program) 2,4% | buildGraph 1,2% |
| 10 | assignSubLayers 2,1% | markDryRoad 1,9% | tileItems 1,9% | columnOpts 1,1% |

Per categorie (`categories.mjs`): foot streaming/geometrie 25%, render 15%, simulatie/AI 14%; ring streaming 19%, AI 16%,
render 13%; druk AI 39% (de routegraaf zit daar), render 12,5%; a7 streaming 22%, render 20%, GC 11%.
Alle top-10 behalve `(program)` en GC zijn **streaming- en indexwerk**, niet het per-frame tekenen of de HUD.

## Tabel: ms per onderdeel per frame (`--hitch`, gemiddeld over de route; machine belast, dus verhoudingen)

Bron: `heap1`-run (Hoog, 15 s per route, a7 60 s). `frame` is de totale hoofdthread-tijd per frame; de onderdelen overlappen niet.

| onderdeel | foot | ring | a7 | druk |
|---|---:|---:|---:|---:|
| frame (totaal) | 457,1 | 248,4 | 76,2 | 63,5 |
| populate-pre (GPU-wacht van het vorige frame) | 130,5 | 51,9 | 9,2 | n.v.t. |
| traffic (verkeer, incl. roadGraph) | 75,2 | 27,4 | 6,2 | 2,0 |
| 3d:render:hoofdpas+post | 48,1 | 11,2 | 10,2 | 18,4 |
| 3d:roads | 36,6 | 84,7 | 4,9 | n.v.t. |
| 3d:grass | 35,9 | 11,4 | 3,2 | n.v.t. |
| hud | 16,9 | 6,3 | 7,3 | 6,3 |
| 3d:buildings | n.v.t. | n.v.t. | 3,5 | 6,0 |
| roadnet-chunk | 11,1 | 8,7 | n.v.t. | n.v.t. |
| 3d:render:voorpas | n.v.t. | n.v.t. | 4,4 | 6,0 |

Preset **Ultra** is **niet gemeten** (alleen Hoog), net als `--in-process-gpu`; de tijd en de slots liepen op. De verhouding
render tegenover streaming op Hoog staat in `categories.mjs` hierboven.

## Geheugen en heap (vraag van de eigenaar: piek 3,1 GB)

`usedJSHeapSize` na elke route, en daarna na een geforceerde GC (`--js-flags=--expose-gc`, nieuw in `routes.js` als
`heapUsedMB` en `heapLiveMB`):

| scene | heap gebruikt (MB) | **heap levend na GC (MB)** | tegels resident | geometrieen | texturen | programma's |
|---|---:|---:|---:|---:|---:|---:|
| foot | 1715 | **891** | 119 | 1288 | 161 | 245 |
| ring | 2353 | **969** | 37 | 1758 | 169 | 281 |
| a7 (60 s) | 2234 | **1192** | 77 | 3688 | 223 | 303 |
| druk | 1066 | **989** | 77 | 3677 | 252 | 303 |

Zonder GC-aanroep in een eerdere run: foot 1410, ring 2598, druk 1295 MB. **Conclusie:** de piek van 2,3 tot 3,1 GB is
ruwweg **de helft niet-opgeruimd afval** bovenop een levende heap van **0,9 tot 1,2 GB**. Het afval komt door de
indexherbouwingen hierboven (veel grote, kortlevende Maps en arrays) en groeit met de allocatiesnelheid, niet met een lek:
de levende heap stijgt over foot, ring, a7 en druk (891, 969, 1192, 989) maar zakt weer; er is in deze 4 routes geen
monotone groei. Een echte lektest blijft `scripts/perf/leak_soak.mjs` (niet gedraaid: 12+ minuten exclusief slot).

`scenario.js` (`createLoopScan`) houdt de `getChannelData`-kopieen alleen vast zolang de scan loopt; zodra de lusgrenzen
bekend zijn zet `scanScenarioLoops` `e.scan = null`. Audiobuffers zelf zitten buiten de JS-heap. Dat is dus geen oorzaak.

Wat de levende heap vult, uit het sampling-heapprofiel van 15 s streamen (`[heapprof] ... live`, 77 MB nieuw levend):
tegeldecodering `tilestore.js` (`onmessage`) 30%, `roadGraph` 12,5%, `buildNodes` 9,9%, `buildGraph` 3,6%, `fillNodes` 2,4%
(`scripts/perf/heapfiles.mjs`). Er bestaan dus **vier tot vijf losse kopieen van "hoekpunt naar wegen"** (roadsurface,
vehicle/traffic, trafficlights, routing, junctions), elk tientallen MB op een grote kaart. De samenvoeging tot een gedeelde
index is de grootste geheugenwinst (en haalt de herbouw-pieken weg) maar is een M/L-ombouw met risico (zie onder).

## Wat is gefixt (commits, elk los te mergen)

| Fix | Wat | Gemeten (deterministisch / node) |
|---|---|---|
| `insideBuilding` (routing.js) | Leest de ene rastercel van het punt zonder kopie in plaats van `buildingsNear` (kopie + Set per aanroep). Een gebouw dat een punt bevat staat altijd in de cel van dat punt, dus dezelfde uitkomst. `buildGraph` doet er tienduizenden per herbouw | `insidebuilding_bench.mjs`: 778 -> 464 ms (1,7x), zelfde 86.100 treffers. In het profiel was `insideBuilding` 17,4% van de stadsroute en 451 ms `query` op de a7 |
| Grasschunks (grass.js) | `buildGrassChunks` gooide bij elke tegel met groen **alle** chunkmeshes weg en bouwde ze opnieuw. Een chunk met dezelfde vlakken (zelfde objecten, zelfde volgorde) houdt nu zijn mesh. Chunksleutel is een getal in plaats van een string per vlak | Teller `chunkStats` (in `routes.js` als `grassChunks`): in twee runs van 15 s foot+druk **66 behouden tegen 16 gebouwd** en **519 behouden tegen 83 gebouwd**: 80 tot 86% van de herbouw-meshes vervalt. Wandklok-effect niet te onderscheiden van de ruis |
| Knooppuntsleutels (roadsurface.js, vehicle/traffic.js) | De index van hoekpunten (`nodeKey`) maakte een string per hoekpunt van alle wegen; nu een getal (zelfde groepering) | `nodekey_bench.mjs`: 1,5 tot 2,0x bij 18.000 wegen, zelfde aantal sleutels en lijstlengtes |
| Meetharnas | `stagecheck.mjs` accepteert `GDE_GAME_DIR`; `routes.js` meldt `heapUsedMB`, `heapLiveMB` (na `gc()`), `graphStats` en `grassChunks`; `PERF_HEAPPROF` en `PERF_HEAPALL` voor heapprofielen per route; `--heapprof-load=<ms>` (devtools.js) en `heapfiles.mjs` voor de levende heap per bestand | n.v.t. |

**Niet behouden:** `nearestOnRoadList` (util.js) met een hergebruikt scratch-object in plaats van een object per segment:
micro-benchmark 395 -> 389 ms (1,02x). V8 verwijdert die allocatie al; teruggedraaid, geen winst.

## Kandidaten die ik niet heb gedaan (met reden)

1. **Eén gedeelde "hoekpunt-naar-wegen"-index** voor roadsurface, traffic, trafficlights, routing en junctions, incrementeel
   bijgewerkt per tegel in plaats van opnieuw gebouwd (M/L, risico M). Haalt de 1-s-pieken van `traffic` en `3d:roads`, de GC-druk
   en tientallen MB heap weg. Vraagt een ontwerp (verwijderde wegen, volgorde van `orderedRoads`, `junctionVer`) en visuele controle.
2. `roadsurface.netState` herbouwt op `map.geoVer` (elke tegel); de index hangt aan `_roadVer` plus `junctionVer` (lichten).
   Overstappen scheelt alleen tegels zonder wegen of kruispuntrijen; weinig in de stad, niet gedaan zonder meting.
3. `furnitureForTile` toetst elk item tegen alle wegen van de tegel; een raster of de tegel naar de worker verplaatsen (M).
4. `routing.buildGraph`: de gebouwtoets per segment in een cache per weg zetten. Niet veilig zonder invalidatie als de gebouwen
   van een buurtegel later binnenkomen (de weg zou dan een oud "vrij" onthouden).
5. `3d:roads` (tot 1,1 s per frame) en de render-/drawcallkant horen bij de andere agent; niet aangeraakt.

## Gates

`node --check` op de gewijzigde bestanden; `firstperson_test` (328 groen, `scene3d.js` 4499 regels), `import_cycles_test`,
`docs_index_test`, `lineendings_test`, `perf_marks_test`, `perfscan_test`, `devflags_test`, `perfstage_test`, `grass_want_test`,
`grass_road_depth_test`, `cemetery_route_test`, `graphgate_test`, `nearestroad_test`, `routeribbon_test`, `roadpreload_test`,
`wereldprops_test`, `vehicleindex_test`, `pathbudget_test`: groen. `text_audit`: 0 bevindingen. `spec_check` meldt een
**bestaande** fout (publicatie.md zegt 0.63.0, package.json 0.64.0), niet van deze ronde. Tests die `data/cache/province` of een
gebouwde wereld nodig hebben (`tileworld_test`, `navgraph_test`, `mode_route_test`, `trafficpath_test`, ...) draaien niet in deze
worktree; ze zijn **niet gedraaid**.

## Niet gemeten / nog niet bekeken

- Ultra, `--in-process-gpu`, kermis of achtervolging (geen route daarvoor in `routes.js`; `druk` is de drukste stadsroute).
- Geen beeldvergelijking van het gras na de chunk-hergebruik: een chunk behoudt zijn mesh ook als er tussen twee herbouwingen
  wegen of water in de buurt bijkwamen (dezelfde bestaande ouderdom als bij een groenwijziging zonder weg; gras ligt onder het
  wegdek). **Nog niet bekeken**.
- Geen lektest (`leak_soak`), geen heap-snapshot (1 GB), geen meting met geluid aan en geen Samen-spelen-run.
