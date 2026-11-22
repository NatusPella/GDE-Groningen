# Code-ronde snelheid zonder Electron (22-11-2026): #1184, #1040, #1046

> Tak `sprint-snelheid-render-22-11` (vanaf origin/main 4b307a11c). Geen Electron, geen build, niets in beeld bekeken, niets op een GPU gemeten.
> Alle cijfers zijn node-microbenches op een belaste machine (andere agents draaiden mee): lees ze als verhouding, niet als milliseconden in het spel.
> Voorgaande rondes: [PERF-CODE-21-11.md](PERF-CODE-21-11.md), [PERF-CODE2-22-11.md](PERF-CODE2-22-11.md); regressie: [PERF-REGRESSIE-22-11.md](PERF-REGRESSIE-22-11.md).

## Wat is gedaan

| # | Wijziging | Voor en na (node) | Bewijs |
|---|---|---|---|
| 1184 | `nearestOnRoadList` (util.js, de kern onder `furnitureForTile`, tileplace en cityprops: `nearestOnRoadList` was 10,6% van de hoofdthread op de ringroute) rekent inline, zonder object per wegsegment. Zelfde rekenvolgorde en dezelfde gelijkspelregel (strikt kleiner wint). | 6,8 s tegen 4,2 s voor 120.000 vragen over 120 wegen (x1,6 tot x1,7) | `scripts/nearestroad_perf_test.mjs`: bit voor bit gelijk aan de oude versie op 8000 vragen (road, i, t, x, y, d2, d, dx, dy, ux, uy), gelijkspel, nulsegment; `--bench` voor de tijd |
| 1184 | `gridItems` (spatialgrid.js, "alle wegen, gebouwen, gras of water": 3 tot 6% van de hoofdthread bij het streamen, 30 aanroepers) bewaart zijn lijst tot de inhoud van het raster verandert (`insert`, `remove`, `update`, `clear`). De beller krijgt altijd een kopie, want `sort` en `splice` komen voor. | 4 tot 16 ms per aanroep op 12.000 wegen, daarna 0,01 tot 0,7 ms | `scripts/spatialgrid_test.mjs` (eigen kopie, ongeldig na elke wijziging, nagemaakt raster zonder klasse blijft ongecachet); `scripts/perf/griditems_bench.mjs` |
| 1184 | `GameMap.nearestRoadPoint` (spawns, plaatsing, `escapeBuilding`-vervolg) inline zonder object per segment; `closestPointOnSegment` zonder twee Math-aanroepen (`t <= 0 ? 0 : t >= 1 ? 1 : t`, gelijk aan `clamp` ook voor -0 en NaN). | echte kaart (`mapquery_bench`, 40.000 vragen): 1128 tegen 810 tot 870 ms | `nearestroad_perf_test`: gelijk aan de oude versie op 600 vragen met en zonder `drivableOnly`; `nearest_road_test`, `nearestroad_test`, `bridge_*_test`, `elevation_*_test` groen |
| benchmark | `recommendStand(stats, stand, diag, presetFps)` gebruikt de proefmetingen per stand die `runBenchmarkSuite` al maakt maar het advies negeerde: geen stap omhoog naar een stand die in de proef minder dan 55 fps haalt (`UP_MIN_FPS`), en een stap omlaag gaat door naar de stand die in de proef wel boven 40 fps zit (`ROUGH_FPS`). De diagnose (`preset-insensitive`, `uneven`) gaat nog steeds voor. Zonder metingen is het advies ongewijzigd. | n.v.t. (gedrag) | `scripts/benchstats_presetfps_test.mjs` (12 controles), `benchstats_test`, `benchmarkmodel_test` ongewijzigd groen |

## Bekeken en bewust niet aangepast

- **Minimap (`drawMinimap`, `drawDynamicMarkers`)**: de statische scan geeft ze de hoogste allocatiescore, maar `minimapMoved` en de kadans (`minimapcadence_test`) begrenzen de aanroepen al; de kaart-HUD is veranderingsgestuurd. Geen winst te bewijzen zonder profiel.
- **`updateAnimals` (countryside.js)**: een sorteer, Set en spread per frame, maar de microschatting is onder 0,05 ms voor honderden dieren. Niet de moeite zonder meting.
- **`SpatialGrid.query`**: de Set-dedupe en slice kosten ca. 22 us per `buildingsNear` in het centrum (cellen van 80 m met veel gebouwen). Een variant met hergebruikte Set en gewone lussen gaf in de node-bench (belaste machine) geen aantoonbaar verschil en is niet doorgevoerd. Een echte winst vraagt een strakkere filter op `bounds` (gedragswijziging: callers verwachten een superset) of een stempel op het item; eerst in Electron meten hoeveel `buildingsNear` er per frame zijn.
- **Opstarttijd (modulepreload, lui laden)**: `scripts/perf/importtijd.mjs` meet 372 ms eigen top-level code in node over 1436 modules; de drie duurste (`routing`, `storytext`, `regions`, 50 ms elk) lezen in node bestanden en zeggen weinig over Electron. De echte kosten (1436 losse modulebestanden laden) zijn alleen in Electron te meten; een bundel is een groter ontwerp.
- **Shaderwarmup (#1046), geheugen (#1040), tegelstreaming (#1184 deel afvoer)**: zie [PERF-CODE2-22-11.md](PERF-CODE2-22-11.md) en [PERF-REGRESSIE-22-11.md](PERF-REGRESSIE-22-11.md); geen nieuw bewijs zonder Electron.

## Meetpunten voor de Electron-run (exclusief, afwisselend A B A B A B, 1280x720, een voorstel)

| # | Wat | Hoe | Maat en grens |
|---|---|---|---|
| 1184 | tegelstroom: `furnitureForTile`, `buildGrassChunks`, `gridItems` in het CPU-profiel | routes foot en ring met `node scripts/perf/run.mjs <naam> --hitch` en `PERF_PROFILE` plus `selftime.mjs`, tegen de vorige build | `nearestOnRoadList` en `gridItems` dalen onder de 3% van de hoofdthread (waren 10,6% en 5,7%); p95 niet slechter |
| 1184 | afval | `(garbage collector)` aandeel op de ringroute | daalt van ca. 5% richting 4% |
| 1184 | spawn en plaatsing | tijd van `nearestRoadPoint` in het profiel bij Spel starten | niet hoger dan voorheen; spawnplek identiek (de test bewijst gelijke uitkomst) |
| benchmark | advies na de proefmetingen | Benchmark op een zwakke en een sterke machine; lees het advies op de rapportkaart | geen "Hoog" als de proef zegt dat Hoog onder 55 fps haalt; bij een ruwe run een advies dat al in de proef boven 40 fps zit |

Samen spelen: alles hier is lokaal per speler (kaartvragen, raster en het advies na een benchmark); geen snapshot, geen netwerkbericht, geen beloning of voortgang.

## Nog niet bekeken

Niets van dit is in beeld of op een GPU gezien. De gelijkheid van de uitkomsten is in node bewezen; de winst in milliseconden in het spel is een schatting uit microbenches en het profiel van 21-11.
