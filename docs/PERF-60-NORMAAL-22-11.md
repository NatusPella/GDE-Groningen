# Op weg naar stabiel 60 fps op Normaal (22-11-2026, #1184)

> Opdracht (eigenaar): stabiel 60 fps op Normaal, zonder zichtbare fidelity in te leveren; nu hebben ring en spoor een tijdelijke norm van 52 ms
> (`TIJDELIJKE_NORMEN`, [PERF-NORM-HERIJKING-22-11.md](PERF-NORM-HERIJKING-22-11.md)). Tak `perf-60-normaal-22-11`, vanaf main `5eaa5128f`. Niets gepusht of gemerged.
> **Uitkomst in twee regels: twee veilige code-winsten (tegelwissel en plaatsing), gemeten in node, gelijk in uitkomst. Er is in deze ronde GEEN Electron-run gedaan, dus
> er is geen fps-winst gemeten en 60 fps op Normaal is NIET gehaald.**

## Waarom geen Electron-meting

De machine liet geen eerlijke fps-meting toe, net als in [PERF-PROFIEL-21-11.md](PERF-PROFIEL-21-11.md) en [PERF-RENDER-21-11.md](PERF-RENDER-21-11.md):
de CPU stond tijdens de ronde op 97 tot 100% (peilingen over een paar minuten: 100, 99, 97, 33, 100), er was 1,0 tot 1,6 GB vrij geheugen en er draaide een vreemde Electron
(vier `electron.exe`-processen, niet van deze sessie; poort 9000 en de geïnstalleerde app zijn niet aangeraakt). Een Hoog-run heeft 2 tot 3 GB heap nodig; een run zou
een belaste wandklok en een kans op uitval geven (de eerdere rondes zagen 22 tegen 77 ms gemiddeld bij dezelfde build). Daarom is er niets gestart en niets in beeld bekeken.
Een wereld voor staging was wel te vinden (`agent-a89951e69d5ebad48/desktop/build/game/world`, 22-11); de volgende ronde kan dus direct met `GDE_PREBUILT_WORLD` stagen.

## Waar de frametijd zit (uit de bestaande meetpunten, niet opnieuw gemeten)

Bron: [PERF-PROFIEL-21-11.md](PERF-PROFIEL-21-11.md) (CPU-profielen Hoog, foot, ring, druk, a7) en [PERF-STIL-21-11.md](PERF-STIL-21-11.md) (stille nachtmeting).

- De top-10 van de hoofdthread is op `(program)` en GC na **streaming- en indexwerk**, niet het tekenen: `buildGrassChunks`, `gridItems`, `nearestOnRoadList`,
  `insideBuilding`, `fillNodes`, `roadGraph`/`buildGraph`/`nodeOf`, `furnitureForTile`. Foot: streaming/geometrie 25%, render 15%, simulatie 14%. Ring: streaming 19%, AI 16%, render 13%.
- De regressie van [PERF-STIL-21-11.md](PERF-STIL-21-11.md) zit in de eerste minuut na de start (tegelwerk) en bij Ultra ook in de stabiele stad; de rustige stad op Normaal (Hoog,
  `kort`) was op main al 50 tot 56 fps.
- De p95 van ring en spoor is 50 ms omdat ca. 6 s tegelwerk (305 tegels) in de eerste ~100 s na de start over de route loopt (#1184). Alleen dat werk wegnemen haalt 37 ms;
  een grotere of kleinere druppel hielp bewezen niet. De echte oplossing is de deterministische plaatsing van #1184 (id uit positie, daarna bakken per cluster): een eigen epic (L) die hier
  niet is aangeraakt.

## Wat is gedaan (ranglijst: winst per risico)

| # | Maatregel | Waarom hier | Bewijs |
|---|---|---|---|
| 1 | `gridItems` (spatialgrid.js) bewaart zijn uitkomst per rasterversie en geeft een kopie terug (`ver` loopt op bij insert, remove, clear en `touch()`; `home.js` `regrid` wijzigt de cellen rechtstreeks en roept `touch()` aan) | Elke tegelwissel laat wegen, kruispunten, routegraaf, gras en meer het hele raster opnieuw lezen: 95 aanroepen in 40 bestanden, elk met een Set-dedupe over alle items en alle cellen; het staat in elke top-10 van het profiel. `orderedRoads` (met sort) profiteert mee | `node scripts/perf/griditems_bench.mjs`: 12.000 items, 200 wissels, 0 verschillen met de oude lus (volgorde, kopie sorteren, rechtstreekse wijziging plus `touch`); 30 leesbeurten zonder wijziging ertussen: 78 ms tegen 0,3 ms (2,6 ms per lezing bespaard). De winst is er pas voor de tweede lezer na een wissel; de eerste betaalt zoals voorheen. Test: `spatialgrid_test` |
| 2 | `nearestOnRoadList` (util.js) rekent scalair: geen object per segment, geen `clamp`- en `dist2`-aanroepen; het uitkomstobject ontstaat alleen voor de beste treffer | Streetfurniture (`furnitureForTile` 5,4% op de stad, `nearestOnRoadList` 10,6% op de ring), tegelplaatsing (`tileplace.js`) en `cityprops` per item; allocatie is hier GC-druk in de tegelstap | `node scripts/perf/nearestroad_bench.mjs`: 4.000 vragen (met en zonder filter, lege en nulwegen), 0 verschillen (JSON-gelijk met de oude versie); gepaard 7 rondes: 921 tegen 566 ms (1,63x), op een belaste machine. Tests: `nearest_road_test`, `nearestroad_test` |

Geen zichtbare wijziging: beide zijn dezelfde uitkomst bij minder werk, dus geen fidelity-verlies, geen presetverschil (Laag, Hoog en Ultra gelijk), geen opslagwijziging.

Ook gedraaid en groen: `spatialgrid_test`, `roadindex_test`, `tegellezers`, `tileworld_sparse_test`, `tileworld_pinned_test`, `farlod_test`, `streaming_gaps_test`, `inrichting_test`,
`perfrest_test`, `junction_tiles_world_test`, `roadpreload_test`. `buildonly_test` meldt `samenhubui.js is bouw-only maar staat niet in BUILD_ONLY of KEEP`: dat is een ander bestand dan dit werk raakt en staat al zo op `5eaa5128f`.

## Samen spelen

Alles hier is lokaal per speler (rasterlezingen en plaatsingsrekenwerk van de eigen wereldopbouw); de uitkomst is bit-voor-bit dezelfde, dus de plaatsing blijft deterministisch voor host en gast.
Geen snapshot, geen netwerkbericht, geen beloning of voortgang geraakt. Geen savebreuk: geen opslagsleutel of save-veld is gewijzigd.

## Wat nog niet 60 haalt (eerlijk)

Niet gemeten, dus onbekend wat er in fps bij is gekomen. Naar de bestaande cijfers haalt Normaal (Hoog, `kort`) in de rustige stad 50 tot 56 fps (p95 ca. 36 ms: de 33,3 ms-kwantisering
van een 60 Hz-lus, niet 16,7 ms), de opwarmfase (Vismarkt 16 fps, Zonsopgang 18 fps op main) en ring en spoor (p95 50 ms) blijven onder 60. Daar helpt geen enkele micro-winst alleen.

## Voorstel voor de volgende (exclusieve, stille) ronde, op volgorde van verhouding

1. **Meet eerst gepaard** wat deze ronde oplevert: `PERF_ONLY=foot,ring,spoor node scripts/perf/run.mjs <naam> --hitch`, A (`5eaa5128f`) en B (deze tak) afwisselend, 3 paren, CPU voor de run onder 25%, 1 Electron;
   daarbij `--hitch` voor de secties `3d:roads` en `traffic` (de herbouwpieken die `gridItems` raakt).
2. **#1184 deterministische plaatsing** (id uit positie, bakken per cluster in `.gdt`): neemt de 305 tegels uit de eerste minuut weg en laat de tijdelijke norm vervallen. Dit is de enige maatregel die ring en spoor naar 33 ms (of 16,7) brengt.
3. **Index-herbouw per tegelwissel** (`roadGraph` traffic.js, `buildNodes`, `fillNodes`, `buildGraph`): al bij delta's (roadindex) maar nog per wissel; `traffic` tot 984 ms en `3d:roads` tot 1100 ms in één frame stonden in het profiel van 21-11.
4. **Ultra-detailkosten** (`heelver`, 425 extra drawcalls tegenover Hoog): de eigenaar van die calls is nog niet bepaald (`PERF_DIAG=1`, route `det`).
5. Niet doen zonder beeld en meting: LOD-afstanden, schaduwkaart, bloom-resolutie of schaduwbudget terugbrengen (dat is zichtbare fidelity; geen bewijs dat het onzichtbaar is).
