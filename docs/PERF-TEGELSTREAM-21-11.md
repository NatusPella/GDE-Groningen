# Tegelstroom zonder uitbarstingen (21-11-2026, #1052)

> Opdracht: de eerste scenes van de benchmark op Hoog terug naar 0.54-niveau (>= 30 fps) zonder +3 GB heap, en minder haperingen bij sprongen en laden.
> Tak `tegelstream-21-11` vanaf main (`bc4473474`). Niets gepusht of gemerged. Vervolg op [PERF-BISECT-21-11.md](PERF-BISECT-21-11.md).

## Uitkomst in zes regels

1. **De "uitbarstingen van 98 tegels" kwamen niet uit de prefetch of de camerasprongen, maar uit de plaatsingsvensters** (`tileplace.js withTiles`): padel, de plaatsing van garages, cafés en winkels in de Ommelanden (187 tegels), de landmark-kits (76), de koeminigame (42) en de dorpjes (22 tot 23). Elk vraagt tegels over de hele provincie, met de hoogste prioriteit (-500), en werkte ze af met `tileQueue.run(1e9)`: in één keer, op de hoofdthread, en de gedeelde wachtrij met de gestreamde tegels van de speler er in één keer bij.
2. In 0.54 waren al die tegels gepind, dus waren de vensters leeg werk. Sinds #314 (alleen de stad gepind) doen ze echt werk, midden in de eerste scenes: in een run **3,8 s tegelstap (2.091 stappen), langste stap 46 ms, en longtasks van 4,4 s en 6,5 s** (die de benchmark afkapt op 250 ms per frame, zodat hij de uitbarsting onderschat en de verspreide kosten volledig telt).
3. Fix: een venster is achtergrondwerk (lage prioriteit, eigen wachtrij, 3 ms per frame **per venster**, wacht alleen op zijn eigen tegels), de rijen van een tegel gaan op afstand door de wachtrij, en tijdens de benchmark, een film of een cutscene wacht het achtergrondwerk.
4. **Resultaat Hoog (mediaan): opwarmfase 25,9 naar 35,3 fps (0.54: 34,6 tot 35,7), gemiddeld 45,5 naar 48,9, longtasks 142 naar 94, heappiek 2,56 naar 1,75 GB.** Ultra: opwarm 17,0 naar 26,2, gemiddeld 39,2 naar 43,4. Geen extra heap (juist lager, zie het voorbehoud).
5. Voorbehoud: de winst in de benchmark komt doordat het achtergrondwerk er **wacht**, niet doordat het weg is. Het werk gebeurt daarna (nog niet in beeld bekeken, zie "Niet bewezen"). In het echte spel is de winst kleiner dan de tabel: daar draaien de vensters op 3 ms per frame **per venster** naast het spel (zie de correctie onderaan: bij overlappende vensters is dat per frame meer), zonder uitbarstingen van seconden.
6. Niet gedaan: een poort die de sprong zelf laat wachten tot de ring er is, en een grotere gepinde set. De metingen laten zien dat dat niet de oorzaak was (zie onderaan).

## Wat de metingen lieten zien

`window.__tileWindows` (de bestaande teller van `withTiles`) in een gewone mainrun, Hoog, tijdens de benchmark (ms: wachten op de tegels / afwerken in de wachtrij):

| venster | tegels | laden | afwerken |
|---|---:|---:|---:|
| padel (eerste, vier keer 1 tot 4 tegels) | 1 tot 4 | 16 tot 26 | 16 tot 80 |
| padel (later, 2 en 4 tegels) | 2, 4 | 1.657, 9.258 | 1.230, 1.640 |
| plaatsing (`placeWithTiles`) | 187 | 12.122 | 2.212 |
| kits (landmarks) | 76 | 12.606 | 2.757 |
| koe | 42 | 6.448 | 1.940 |
| dorpjes | 22 en 23 | 406, 498 | 1.921, 643 |

CPU-profiel van de eerste 50 s (`.pt/win.mjs`, de langste aaneengesloten drukke blokken van de hoofdthread): een blok van 4,4 s bevatte `withTiles` > `run` (tilestore) > `step` > `addTileSteps` 1,1 s inclusief de async voortzetting, daarnaast het blokkerende linken van shaders (`getProgramParameter` 1,5 s, hoort bij PERF-START) en de puntentests van de tegelstap. Dit is de bron van de "ca. 98 tegels per camerasprong" die de bisect niet kon plaatsen.

## Wat is gebouwd

| Onderdeel | Wat | Bestand |
|---|---|---|
| Prioriteitswachtrij | de rijen van een gestreamde tegel gaan met de urgentie waarmee hij is aangevraagd (afstand, of de achtergrondwaarde 5000) door de `FrameQueue`: dichtbij eerst, een drop (0) altijd eerst; een volgend stuk van dezelfde tegel houdt zijn prioriteit | `tilestream.js addPriority`, `tileworld.js queueTile`, `tilestore.js priorityOf` |
| Achtergrondvensters | `withTiles` vraagt met `BACKGROUND_PRIORITY` (na alles wat de prefetch rond de speler wil), werkt zijn tegels per frame in `BG_SLICE_MS` = 3 ms (of de eigen `slice` van de aanroeper: de plaatsing bij het laden houdt zijn 6 ms) en wacht alleen op **zijn eigen** tegels, niet tot de hele wachtrij leeg is. Na `BG_DRAIN_MAX_MS` (20 s) nemen de stukken 3x zo groot, nooit alles in één keer | `tileplace.js`, `tilestream.js drainSliced` |
| Eigen wachtrij | tegels die alleen een venster vroeg, gaan in `bgQueue` (geen belasting van het budget van de stroom, en een vasthouding kan ze laten staan); `follow()` werkt ze op de helft van het budget bij, tenzij vastgehouden | `tileworld.js` |
| Dringende vensters | een teleport die de speler zelf koos (`cheats.js`) en de overdracht van de host (`coophostwisselwereld.js`) blijven prioriteit -500 en synchroon (`urgent: true`) | `cheats.js`, `coophostwisselwereld.js` |
| Vasthouding | tijdens de benchmark, een film (`intro-montage`), een cutscene (`cine-hide-hud`, `cineQuiet`) of de fotomodus werkt het achtergrondwerk niet; hoogstens `BG_HOLD_MAX_MS` (3 min) per venster | `tilestream.js holdBackground/setHoldProbe`, `trailer.js`, `main.js` |
| Vooraf aanvragen | `TileWorld.warmAhead(x, y)`: de tegels rond een doel (1 km) vragen, dichtbij eerst, en klaar zodra ze er zijn of na een tijdbudget (`JUMP_BUDGET_MS` 1,5 s; een tegel die nooit komt houdt niemand vast); de benchmark vraagt de tegels van de volgende scène 5 s vóór de cut, en die van de eerste scène onder de zwarte sluier | `tileworld.js`, `tilestream.js whenReady`, `trailer.js` |
| Test | 41 controles: volgorde, annuleren, budget per frame, time-outs, vasthouding, poort zonder deadlock, determinisme | `scripts/tilestream_test.mjs` |

## Meting (Electron 45.2.3, 1920x1080, wereld uit de hoofdmap, `--benchmark=1 --stil`, gepaard afwisselend, CPU voor elke run 9 tot 14%)

"Opwarm" = de eerste zes scenes met frames (zie de bisect). "Voor" = main (`bc4473474`) met alleen de meettooling (`window.__tw`). Hoog: preset `quality:hoog,shadows:true,drawDistance:kort`; Ultra: `drawDistance:heelver`.
Mediaan per kant; de runs staan in de bijlage.

### Hoog (voor n = 9, na n = 3 en een controlerun van de eindcode)

| | voor | na (3 runs) | na, eindcode (1 run) | 0.54 (bisect) |
|---|---:|---:|---:|---:|
| gemiddeld fps | 45,5 (45,1 tot 46,0) | **48,9** (48,6 tot 49,6) | 48,9 | 48,7 tot 49,7 |
| opwarm fps | 25,9 (24,3 tot 27,6) | **35,3** (33,8 tot 35,6) | 33,2 | 34,6 tot 35,7 |
| Zonsopgang | 19,8 | 27,1 | 24,7 | 29,0 |
| Vismarkt | 16,3 | **36,5** | 34,7 | 41,9 |
| Noorderplantsoen | 22,3 | **41,6** | 42,9 | 38,7 |
| Tessa | 44,4 | 49,9 | 41,3 | 50,5 |
| frames > 50 ms in de opwarm | 144 | 85 | 87 | 83 |
| frames > 100 ms in de opwarm | 37 | 24 | 24 | 29 |
| longtasks (> 50 ms, hele run) | 142 | 94 | 91 | 89 |
| tegelstappen in de benchmark (aantal, ms) | 2.091 tot 2.155, 3.820 ms | 50, 20 ms | 13, 19 ms | n.v.t. |
| heappiek | 2.562 MB | 1.752 MB | 1.649 MB | 2.646 tot 3.001 |

### Ultra (twee gepaarde runs per kant, eindcode)

| | voor | na |
|---|---:|---:|
| gemiddeld fps | 39,2 (39,2; 39,2) | **43,4** (43,1; 43,8) |
| opwarm fps | 17,0 | 26,2 |
| Zonsopgang / Vismarkt / Noorderplantsoen / Tessa | 18,9 / 15,1 / 10,4 / 19,2 | 19,9 / 24,3 / 34,3 / 38,5 |
| longtasks | 248 | 162 |
| heappiek | 3.181 MB | 2.348 MB |

Laag is niet opnieuw gemeten.

### Rijden door de stad (haperingen), kop-staart zonder Electron

`scripts/perf/streamdrive.mjs` op de echte tegels (172 km: A7 heen en terug en de spoorlijn naar de Eemshaven, 33 m/s, 104.256 frames, de wereld uit dezelfde build): **voor en na gelijk**: 0 late tegels binnen 250 m, 665 laden, 632 verwijderd, dezelfde wereld (de digest van rijen en rasters klopt tot op het getal), `addTile` p95 33,5 tegen 33,2 ms, max 46,9 tegen 47,0 ms. De gewone stroom (prefetch, `follow`, budget) is dus niet veranderd en niet slechter. Een rit in Electron met frametijden is **niet gedaan**.

## Waarom de andere twee ideeën niet zijn gebouwd

- **Ontpin-heuristiek (een grotere gepinde set):** de uitbarstingen kwamen uit vensters die tientallen tot 187 tegels over de provincie vragen; een gepinde ring (3 tegels, de bisect) kon daar niets aan veranderen. Met de vensters in de achtergrond is de winst gehaald zonder extra heap, dus een pin is niet nodig.
- **Een poort die de camera pas laat springen als de ring er is:** de gestreamde ring rond de camera (`store.prefetch`, straal 1,5 km, 4 tegels tegelijk) was niet de oorzaak. De sprongen van de benchmark vragen nu vooraf (`warmAhead`), maar een poort die de tijdlijn ophoudt zou de benchmark zelf scheeftrekken. Een speler die reist (taxi, trein, laden van een save) of teleporteert heeft al een eigen weg (`registerShots`, `withTiles` met `urgent`, de laadsluier); die is niet aangeraakt.

## Niet bewezen / nog niet bekeken

- **Het achtergrondwerk loopt na de benchmark door:** door code en unit-test gedekt (`holdBackground` is geteld en wordt in `end()` van de benchmark weer losgelaten; `follow` werkt `bgQueue` weer bij), maar **niet in Electron gezien**: de app sluit na de benchmark af. Of de plaatsing (garages, cafés, winkels, kits, koe, dorpjes) daarna volledig klaar komt, moet iemand in een gewone start controleren.
- **De winst in het echte spel:** de vensters draaien in het spel nog steeds, nu verdeeld (3 ms per frame **per venster**, laagste prioriteit) en niet in een klap. Dat is **niet** in Electron met frametijden gemeten (alleen de benchmark, waar ze wachten, en de headless rit). Verwacht een kleinere winst dan in de tabel; de uitbarstingen van seconden zijn weg.
- **De bijdrage van `warmAhead` apart:** niet los gemeten (de proefbouw met alleen de eerste versie (zonder eigen wachtrij en vasthouding) was **slechter** dan voor: opwarm 20,0 tegen 25,9, want de vensters bleven werken, nu gespreid, en de benchmark telt gespreide kosten volledig). De winst zit in de vasthouding, niet in het vooraf aanvragen.
- **De 6,5 s-longtask rond 28 s** (en 7 s bij 7,5 s) staat er na de fix nog: het is het blokkerende linken van shaders (`getProgramParameter`, zie PERF-START-21-11.md), niet tegelwerk.
- De benchmark vergelijkt nu eerlijker met 0.54, maar hij laat bewust het achtergrondwerk achterwege: wie de tegelkosten van het eerste speelminuut wil meten, moet dat in een gewone start doen.
- Alle `scripts/*_test.mjs` die de wereld nodig hebben (`facilities`, `country_*`, `station_machine`) zijn in deze tak overgeslagen (geen `game/world`); `tilestream`, `framequeue`, `heapmap`, `perfrest2`, `coopfoci`, `streaming_gaps`, `overlaymerge` zijn gedraaid en groen. De volledige suite is voor de coördinator.
- Samen spelen: `withTiles` wordt lokaal gebruikt, per speler; de wereld van wie het spel opende blijft leidend (de plaatsing leest tegelgegevens die voor iedereen gelijk zijn, de digest van de rit is voor en na gelijk). Een gast laadt zijn tegels lokaal. Geen netwerkprotocol aangeraakt. Geen speciale test voor Samen spelen.

## Meettooling

Staat in `scripts/perf/tegelstream/` (kopieer naar een werkmap `.pt/` naast de worktree; de paden in de scripts wijzen naar de worktree van deze tak): `stage.sh` (een gestagede build van de werkboom), `run1.sh`/`ab.sh` (gepaard afwisselend, via de slotbewaker `tegel`), `bhook.js` (de bisect-hook plus de tegelwachtrij, de tegelvensters en de store-telling), `sum.mjs` (medianen), `win.mjs`/`callers.mjs` (de langste drukke blokken en de aanroepers uit een CPU-profiel).

## Correctie na de codereview van 21-11 (stand 828ec9f57)

De codereview (perf, B1, B7) vond twee beweringen hierboven die niet kloppen zoals ze er staan:

- **"3 ms per frame" geldt per venster, niet per frame.** Elk plaatsingsvenster (`withTiles`) draait zijn eigen `drainSliced`-lus. Overlappen padel, plaatsing, kits, koe en dorpjes in de eerste minuut (zoals in de tabel: laden 12,1 s en 12,6 s tegelijk), dan werken vijf vensters 5 x 3 = 15 ms per frame; na `BG_DRAIN_MAX_MS` (20 s) 5 x 9 = 45 ms. Nagerekend in node (synthetisch, met de echte `drainSliced`); niet in het spel gemeten. De bestaande `tilestream_test` dekt dit niet. De oplossing (een gedeeld budget per frame) hoort bij de streaming-planner; dit document is bijgewerkt zodra die er is.
- **"Dichtbij eerst" geldt voor de gestreamde wachtrij, niet voor de `bgQueue`.** De prioriteit wordt eenmalig gelezen bij `queueTile`; alle achtergrondtegels hebben dezelfde waarde (`addPriority(5000)`), dus daar is het FIFO. Een tegel die eerst voor een venster is aangevraagd en daarna door de prefetch rond de speler wordt gewild, blijft in de `bgQueue` (1 ms per frame in `follow`).

De rest van de beweringen (geen uitbarsting van seconden meer, de winst in de benchmark komt door wachten) staat als eerder: niet in Electron met frametijden gemeten.
