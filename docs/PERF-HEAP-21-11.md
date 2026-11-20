# Heap en geheugen (21-11-2026, #1040): waar blijft de JS-heap, en wat is losgelaten

> Opdracht: JS-heappiek 3,1 GB (bisect 0.50 naar 0.63: 2.315, 2.835, 2.957, 3.298 MB) omlaag, levende heap na GC onder 900 MB, geen groei
> over 10 minuten, laadtijd niet langer dan 0.50. Tak `worktree-agent-a1892e08e64fb6071` vanaf `0c225e464` (integratie-21-11-b). Niets gepusht of gemerged.
> Eerder werk: [PERF-PROFIEL-21-11.md](PERF-PROFIEL-21-11.md) (0,9 tot 1,2 GB levend, de helft afval) en [PERF-RONDE-21-11.md](PERF-RONDE-21-11.md) (lui decoderen).

## Wat er is veranderd (commits, elk los te mergen)

| Onderdeel | Voor | Na | Bewijs |
|---|---|---|---|
| Lui geladen klanken (`sfx/samples.js`) | een lus van het weer, vliegtuig of dieren bleef na de eerste vraag voor altijd gedecodeerd (tot ca. 100 MB PCM) | uit de map na 5 minuten ongebruikt (`LAZY_IDLE_MS`) en boven 48 MB samen (`LAZY_MAX_BYTES`, oudste gebruik eerst); `has()` laadt hem opnieuw; eager-klanken (85 stuks, ca. 6,5 MB) blijven; een klinkende bron houdt zijn eigen buffer vast, dus niets breekt af. Limiter en glitch-fix (`audiodiag.js`, `audio.js`) zijn niet aangeraakt | `sfxsamples_test` (1763 controles, o.a. bovengrens, idle, terugladen, eager blijft) |
| Scenariomuziek (`audio/scenario.js`) | houdt al alleen wat speelt of net zweeg vast | ongewijzigd; `scenarioBytes()` meldt het geheugen aan de technische info | n.v.t. |
| Laadstap Geluid (`main.js`) | wachtte op alle 154 sleutels, maar sinds #804 laden alleen de 85 eager-klanken: elke start liep de volle `AUDIO_WARM_MS` (5 s) leeg | wacht op `stats.ready` (de eager-klanken zijn klaar); voortgang uit `eagerDone / eagerGoal` | `sfxsamples_test`; in Electron niet gemeten (de perf-run is stil) |
| Filmlicht-wacht (`main.js`) | hoogstens 12 s wachten op het linken van de programma's van de andere lichtstand | 6 s; wat dan nog niet gelinkt is, linkt (parallel in het GPU-proces, KHR_parallel_shader_compile) tijdens de eerste beelden. De compile zelf blijft zoals hij was (de film hapert niet door synchroon linken: dat is het besluit van 20-11) | niet gemeten (zie onder) |
| Tegelstore (`tilestore.js`) | `budgetBytes` 40e6 ruw, loslaten van tegels buiten de ring pas vanaf 50% (20e6) | 28e6, hysterese vanaf 35% (`evictFrom`) | `tilebudget_test`; Electron-run hieronder |
| Bordtextures (`busboard3d.js`) | onbegrensde Map met een canvas-texture per lijn en bestemming | `LRUCache` van 64 met `texture.dispose()` bij het verdringen | `node --check`; hergebruikt de bestaande, geteste `LRUCache` (#658) |
| Dorpencache (`countryfield.js`) | onbegrensd per rit door de provincie | wordt geleegd boven 4000 blokken (opnieuw berekenen is goedkoop) | `node --check` |
| Geheugenbewaking (`memwatch.js`, `gpudiag.js`) | geen geheugencijfers in de technische info | Ctrl+Shift+G toont `[Geheugen]`: heap nu/gereserveerd/limiet, piek sinds de start, bodem (laagste punt per minuut, de levende heap) en trend in MB per minuut over de laatste 10 minuten, geladen tegels, gedecodeerde klanken en bytes, aantal texturen, geometrieen en shaders. Een meting per 5 s, niets per beeld | `memwatch_test` (13 controles: piek, bodem, trend +20 MB/min bij een lek, begrensd venster, geen NaN) |
| `scripts/perf/heapmap.mjs` | alleen `heapfiles.mjs` (per bestand) | levende heap per categorie (audio, textures en canvas, tegeldata, wegen en routes, gras, geometrie, scene, simulatie, overig) uit een `.heapprofile` | `heapmap_test` (13 controles) |

## Meting in Electron (een gepaarde run, twee routes)

Opzet: `scripts/perf/run.mjs` met `PERF_ONLY=foot,ring PERF_DUR=40000 --in-process-gpu --js-flags=--expose-gc`, preset standaard, 1920x1080, echte GPU
(RTX 3060), eigen profiel en uitvoermap in de werkmap, de wereld van een recente build (`agent-a0434e66d3e8bcef3`, stage4), via de slotbewaker.
**Voor** = `0c225e464` (de integratie), **na** = deze tak. Een run per kant (geen mediaan: het perf-venster stond maar twee runs toe).

| route | gebruikt voor (MB) | gebruikt na | levend na GC voor | levend na GC na | tegels resident voor / na | tegelladingen voor / na |
|---|---:|---:|---:|---:|---:|---:|
| foot (te voet, koud, 40 s) | 1933 | **1097** | 869 | **803** | 57 / 27 | 398 / 424 |
| ring (rijdend, 40 s) | 1546 | **1341** | 1006 | **948** | 81 / 31 | 422 / 437 |

Lezing, eerlijk:

- De **piek** (`usedJSHeapSize` na de route) daalt 13 tot 43%, maar dat cijfer hangt ook af van wanneer de GC toevallig liep (een run van 40 s is
  kort). Het is een aanwijzing, geen bewijs van -30%.
- De **levende heap na GC** daalt maar 6 tot 8% (869 naar 803 en 1006 naar 948 MB). De doelen (piek onder 2,2 GB in de stad: **gehaald**, maar de
  basis was in deze opzet al 1,5 tot 1,9 GB; levend onder 900 MB: **niet gehaald op ring (948)**, gehaald op foot (803)) zijn dus maar deels bereikt.
  De rest van de levende heap zit niet in de tegelstore maar in de vier tot vijf wegen-indexen (zie hieronder).
- Er zijn 6 tot 7% meer tegelladingen (424 en 437 tegen 398 en 422): tegels buiten de ring worden eerder losgelaten en komen terug als je terugloopt.
  Er kwamen geen tegels te laat (`late` 0 in beide runs).
- Frametijden (foot gemiddeld 160 naar 89 ms, ring 72 naar 51 ms) **zeggen niets**: CPU vóór de run 69% (voor) en 95% (na), een belaste machine, zie
  [PERF-PROFIEL-21-11.md](PERF-PROFIEL-21-11.md). Ze zijn niet als bewijs gebruikt.
- Het sampling-heapprofiel van de voor-run (15 s streamen, levende nieuwe objecten, 131 MB; `heapmap.mjs`): wegen en routes 57% (`routing.js` 54 MB,
  `trafficlights.js` 8 MB, `traffic.js` 8 MB, `junctions.js` 3 MB), tegeldata 26% (`tilestore.js` 25 MB, `tileworld.js` 9 MB), native 8%, scene en render 3,5%,
  gras 1%, textures en canvas 0,1%, audio 0%. **Audio en textures zijn dus niet de grote bron van de JS-heap** (audiobuffers staan buiten de JS-heap); de
  grote bron is de wegen- en routegraaf. Die bouwt de andere perf-agent om naar een gedeelde index en valt buiten deze opdracht (`roadindex`,
  `routing`, `traffic`, `grass`, `roadsurface` zijn niet aangeraakt).

## Niet gemeten of niet gedaan

- **Geen 10-minuten-soak** (`scripts/perf/leak_soak.mjs`): het perf-venster stond maximaal twee Electron-runs toe. "Geen groei over 10 minuten" is dus **niet bewezen**;
  de tracker in de technische info (`memwatch.js`) toont de trend zodra iemand 10 minuten speelt.
- **Laadtijd voor/na niet gemeten:** de perf-run start een bestaand spel zonder film en zonder geluid (`--stil`), dus de filmlicht-wacht en de geluidsstap komen er niet in
  voor. De tijd tot `gameStart` was 23,7 s (voor) en 21,3 s (na), maar dat is ruis (andere belasting). De winst is afgeleid uit de code: de geluidsstap kostte per start
  tot 5 s (de wachtlus kon nooit vol worden), de filmlicht-wacht is 6 s korter begrensd. Meten met `scripts/perf/loadcheck.mjs` bij een vrij slot, nieuw spel, met geluid.
- **Dispose-tellers:** er is geen gevendorde `three` in deze worktree, dus `renderer.info.memory` voor en na de tegel-uitstroom is niet in node te toetsen; in de runs steeg
  `geometries` over twee routes van 1647 naar 2431 (voor) en van 1702 naar 2399 (na): de groei per route is er nog, een mogelijk lek in de uitstroom blijft **open** en is
  het eerste dat de soak moet nagaan (`leak_soak` telt geometrieen, texturen en programma's).
- **Geen heap-snapshot van de hele heap** (1 GB, te zwaar voor het venster); de samenstelling komt uit het sampling-heapprofiel (alleen wat in het venster van 15 s is aangemaakt en nog leeft).
- **0.57.1 start de benchmark niet:** niet onderzocht (niet goedkoop; mogelijk het sessiepad van #554). Open in het issue.
- **Progressief shader-prewarm en lazy dynamic imports:** niet gedaan. De programma's linken al parallel (`KHR_parallel_shader_compile`); het laadscherm wacht nu korter.
  Een verdere stap (alleen de programma's die de filmcuts raken, zie PERF-RONDE-21-11.md optie 2) vraagt een meting per cut.
- **Beeld, geluid en Samen spelen:** niets in beeld bekeken, geen geluid beluisterd, geen Samen-spelen-run. Een klank die opnieuw geladen wordt (na 5 minuten) speelt tot dan de synth
  (zoals bij het eerste gebruik); dat is niet beluisterd.

## Volgende stappen (in volgorde van winst)

1. De gedeelde wegen-index van de andere agent (de vier tot vijf kopieen van "hoekpunt naar wegen" zijn 57% van de levende nieuwe heap).
2. Een soak van 10 minuten met de technische info open (trend in MB per minuut) en `leak_soak.mjs`; nagaan waarom `geometries` per route stijgt.
3. Laadtijd meten bij een nieuw spel, met geluid, voor en na (`loadcheck.mjs`).

## Gates

`node --check` op de gewijzigde JS; groen: `sfxsamples_test`, `memwatch_test`, `heapmap_test`, `tilebudget_test`, `lrucache_test`, `tileworld_pinned_test`, `sfx_haken_test`, `stappen_test`,
`weer_sfx_test`, `import_cycles_test`, `perfscan_test`, `devflags_test`, `docs_index_test`, `lineendings_test`, `spec_check`. `tileworld_test` draait niet zonder `data/cache/province` (**niet gedraaid**).
