# Soepeler streamen: één framebudget, bewegingsgericht vooruitladen, stabiele LOD-overgangen (21-11-2026, #1016, #1052, #1008)

> Opdracht van de eigenaar: "verbeter performance ook verder, en soepeler streamen van LOD's/tegels/werelddetails". De wereld moet zonder
> hitches en zonder zichtbare pop-in binnenstromen, ook bij snelle bewegingen. Tak `stream-soepel-21-11` vanaf main (`828ec9f57`).
> Niets gepusht of gemerged. **Geen Electron gebruikt** (een releasegate-agent draaide de perf-fasen): alles hieronder is node
> (pure tests, een rit over de echte tegels, statische controles). Wat in Electron nog gemeten moet worden staat onderaan.

## Uitkomst in acht regels

1. **Eén planner** (`game/js/streamplanner.js`) is nu de enige plek waar de tijd voor streamingwerk op de hoofdthread vandaan komt: tegelrijen,
   gebouwmeshes en het voorbouwen, wegen, water, gras, de verre laag, voertuigen, voetgangers en chauffeurs vragen `grant(klasse, gewenst)` en melden `spend`.
   Voorheen had elk systeem zijn eigen budget (1,5 + 4 + 2,5 + 3 + 2,5 + 3 + 2,5 + 3 ms ...) en kon een slecht frame ruim boven 20 ms optellen.
2. **Het totaal volgt de frametijd** (4 ms bij een frame onder 14 ms, lineair terug tot 0,5 ms bij 33 ms; 6 ms als dichtbij detail ontbreekt; 8 ms in de eerste
   1,5 s na een sprong; 20 ms achter een laadsluier) en **een te duur stuk werk wordt schuld**: het mag af, de volgende frames krijgen minder (hoogstens twee frames budget
   schuld). Het gemiddelde blijft zo onder het budget; een klasse die 8 frames niets kreeg, krijgt een eenheid (geen verhongering, geen deadlock).
3. **Urgent werk** (een faciliteit binnen 400 m, een lopende activiteit, een herstel) heeft een eigen budget (6 ms) en wordt niet vastgehouden door een film
   of cutscene (`placementurgency.js`). Dit volgt de aanvulling van de coördinator (de gate-verhaaltest faalde op de plaatsingsvensters).
4. **De detailring van gebouwen krimpt niet meer naar het eerste wachtende gebouw** (#1016, de ramen die pas laat inladen): de eerste 24 wachtende gebouwen
   houden hun verre kopie (`uLodKeep` in `farlod.js`), de ring blijft op de tekenafstand; pas bij meer dan 24 krimpt hij, tot het 25e gebouw. De ring groeit na een krimp pas
   terug als het doel 300 ms ononderbroken hoger ligt (geen flikker). In het model: **kleinste ring 118 m en 113 m tegen 140 m, frames met ring onder 90%: 0,9% en 5,9% tegen 0%.**
5. **Kozijnen en glas doven zacht uit** (schermdeur-dither op camera-afstand, `edgefade3d.js`, geen extra pass) in een band van 10 m voor de gevelafstand, schakelen met
   hysterese (aan op de afstand + 12 m, uit 8% verder) en zijn korter bij snelheid; met verminderde beweging een harde rand.
6. **Vooruitladen**: de verre laag begint in de rijrichting eerder (het aandachtspunt focus + lead telt mee), taxi- en treinritten vragen de tegels langs de hele route vooraf
   (`TileWorld.warmRoute`), en gras en verre tegels worden vertraagd opgeruimd (4 s, hoogstens twee per frame).
7. **Tegelwerk in stukjes van hoogstens 1,2 ms** (`ROW_CHUNK_MS`): een stuk was 300 rijen en kon 35 ms duren.
8. **Niet bereikt: "geen enkel frame boven 4 ms".** In het model blijven 3,4% (stad) en 3,2% (provincie) van de frames boven 4 ms (voor: 6,8% en 7,0%), vooral door
   stukken die niet te knippen zijn (zie "Eerlijk"). De p95 daalt van 4,5 naar 3,4 ms, de p99 van 8,3 naar 6,0 ms.

## Meting in node (de rit)

`scripts/perf/streamsoepel.sh <map met world/>` (`streamsoepel.mjs`, `streamsoepel_table.mjs`): 3 km met 30 m/s, 60 Hz (6.000 frames), de echte tegels van schijf met echte
decodering en de echte `FrameQueue`-rijen; de gebouwen en wegen rond de auto komen uit de echte rasters. **Gemodelleerd** (niet gemeten in het spel, constanten bovenin het script):
een gebouwmesh kost 0,7 tot 1,6 ms, 5% van de gebouwen wacht 1 s op het linken van een shader, een weg 1 ms (elke 17e 6 ms), een verre tegel 6 ms in stukken van 0,5 ms,
een voertuig of voetganger 0,8 ms per 4 frames. "Voor" is het budgetgedrag van main (tegels `streamFrameMs`, gebouwen 4/9 ms, wegen 2,5 ms met cap 4, verre laag 2,5 ms, actoren 3 ms,
de ring tot het dichtstbijzijnde wachtende gebouw); "na" is de planner met de ring met uitzonderingen en de verre laag met lead. De tegelrijen zijn echte tijd, de rest modeltijd:
dit vergelijkt beleid, het is geen frametijdmeting. Een run per cel (de uitkomst verschilt per run een paar procent door de echte tegeltijd); de late tegels en de ring zijn deterministisch.

| | stad voor | stad na | provincie voor | provincie na |
|---|---:|---:|---:|---:|
| streamingwerk per frame, gemiddeld (ms) | 0,78 | 0,73 | 0,66 | 0,66 |
| streamingwerk p95 (ms) | 4,5 | **3,4** | 4,5 | **3,4** |
| streamingwerk p99 (ms) | 8,3 | **6,0** | 7,5 | **5,7** |
| streamingwerk max (ms) | 71,3 | 41,6 | 14,1 | 22,6 |
| frames boven 4 ms (van 6.000) | 406 | **202** | 423 | **190** |
| frames boven 8 ms | 81 | **44** | 46 | **37** |
| tegelwachtrij max (items) | 65 | 65 | 98 | 98 |
| late tegels binnen 250 m (tegel-frames) | 0 | 0 | 0 | 0 |
| late verre tegels binnen 190 m | 0 | 0 | 0 | 0 |
| detailring kleinste (m, van 140) | 118,4 | **140** | 112,6 | **140** |
| frames met ring onder 90% | 0,9% | **0%** | 5,9% | **0%** |
| gaten in de ring (gebouw zonder mesh en zonder uitzondering) | n.v.t. | 0 | n.v.t. | 0 |
| wachttijd gebouw tot detail, mediaan (ms) | 183 | 483 | 133 | 300 |
| wachttijd gebouw tot detail, p95 (ms) | 1.250 | 1.617 | 1.183 | 1.400 |
| kale gebouwen per frame (gemiddeld) | 6,7 | 12,0 | 6,4 | 10,8 |

**Lees dit eerlijk:** de ring blijft op de tekenafstand en de pieken zijn lager, maar de planner geeft gebouwen minder tijd dan de oude 4 ms apart (het totaal is 4 ms voor *alles*):
in het model wacht een gebouw mediaan 300 tot 480 ms langer op zijn detail, en er staan gemiddeld ca. 5 meer gebouwen als kale massa. De uitzondering maakt dat zichtbaar zonder gat in de ring,
maar de eigenaar ziet dus misschien tot een halve seconde langer een kale gevel op een willekeurig gebouw. Het drukte-plafond (`pressureMs` 6) geeft gebouwen meer tijd als er dichtbij veel ontbreekt;
of 6 ms goed is, hoort een Electron-meting te beslissen (`?perfoff=planner` zet de oude budgetten terug voor een A/B). De wachtrij en de late tegels veranderen niet: de tegelstroom
(`TileStore.prefetch`: straal 1,5 km plus snelheid x 10 s, al met een rijrichtingsscore) was al op tijd.

### Tegelwerk per stuk (`scripts/perf/streamsteps.mjs`, 6.000 frames, 30 m/s, de echte tegels)

| | Groningen voor | Groningen na | Hoogezand voor | Hoogezand na |
|---|---:|---:|---:|---:|
| stukken | 82 | 103 | 339 | 367 |
| p95 (ms) | 11,9 | 6,9 | 3,2 | 2,1 |
| p99 (ms) | 27,0 | 13,1 | 8,0 | 6,5 |
| stukken boven 10 ms | 8 | 3 | 2 | 3 |

De winst is bescheiden: de overgebleven pieken (10 tot 22 ms) zitten niet in de rijenlus maar in de stappen erna (`attachProfiles`/`extendElevation`, `trimTileGreenery`): dat zijn
ondeelbare aanroepen en de eerstvolgende kandidaat om te knippen.

## Wat is gebouwd

| Onderdeel | Wat | Bestand |
|---|---|---|
| Framebudget-planner | totaalbudget uit de frametijd (`budgetFor`), klassen met aandeel, schuld, geen verhongering, urgent-klasse, drukte-plafond, wachtrij met rang en veroudering, een duur stuk per frame, zelfstartend zonder `beginFrame`, uit te zetten (`?perfoff=planner`) | `streamplanner.js` |
| Urgentie van plaatsingsvensters | `sync` (een teleport), `urgent` (nabij, activiteit, herstel: afstandsprioriteit, 6 ms, nooit vastgehouden), `background` (zoals voorheen) | `placementurgency.js`, `tileplace.js`, `tileworld.js` (`focusAt`) |
| Gedeelde vensterpomp | alle vensters in één lijst, één `queue.run` per frame met het grootste budget (niet de som), planner-grant | `tilestream.js createDrainPump`, `tileplace.js` |
| Ring met uitzonderingen en smoother | `selectRing`, `createRingSmoother` (krimpt direct, groeit na 300 ms rust met hoogstens 80 m/s), uitzonderingen als uniform in de verre-laagshader | `lodstable.js`, `farlod.js`, `scene3d.js` |
| Kozijnen | tweezijdige drempel, dither-rand op `detailMaterial` en `glassMaterial`, gevelafstand schaalt met snelheid, band 10 m | `lodstable.js`, `scene3d.js`, `edgefade3d.js` |
| Vertraagd opruimen | `createCooler`: 4 s koud, hoogstens twee per frame; gras en verre tegels | `lodstable.js`, `grass.js`, `farlod.js` |
| Vooruitladen | `farBuildDist` (de verre laag bouwt voor het aandachtspunt), `sampleRoute` en `TileWorld.warmRoute` voor taxi en trein, `ringSpeedScale` (de ring krimpt bij 20 tot 40 m/s tot 85%), `facadeSpeedScale` (kozijnen tot 60%) | `lodstable.js`, `tileworld.js`, `reisrit3d.js`, `scene3d.js` |
| Tegelwerk in stukjes | `chunkDue`: hoogstens 1,2 ms per stuk, ook in de weg- en gebouwcontrole | `tileworld.js` |
| Meetgereedschap | `streamsoepel.sh/.mjs/_table.mjs` (de rit), `streamsteps.mjs` (stukduur), `window.__streamPlanner.stats()` in het spel | `scripts/perf/` |

### Wat bestond al en is hergebruikt
`tilestream.js` (achtergrondvensters, `drainSliced`, vasthouding), `createHeavyRoadGate` (de zware wegen blijven achter hun poort; hun echte kosten gaan nu ook als `spend` naar de planner, dus als schuld),
`streambudget.js` (`streamRank`, `streamLead`: de rijrichting; `streamFrameMs` wordt niet meer door main.js gebruikt, de test blijft), `edgefade3d.js`, `popinrules.js`, het koud-houden van wegen en water
(`coolDown`, LRU) en de tegelstore met zijn hysterese en LRU-geheugenbudget (dispose bij het wegvallen van een tegel).

## Code-reviewbevindingen (de vier van de coördinator)

| # | Bevinding | Status |
|---|---|---|
| 1 | `tilesIn` meldt een tegel binnen zodra de store hem heeft | **Opgelost**: wacht ook op `map.tilesPending(keys)` (rijen verwerkt); test `streamwindows_test` |
| 2 | M13-verschuiving beslist op `map.resident`, ±40 m, muteert exportconstanten | **Deels**: beslist nu alleen als de rijen van alle negen tegels rond het plan klaar zijn (`tileRowsDone`, `m13DecisionReady`) en over 150 m (de zoekstraal 120 plus de voetafdruk); test in `containerplan_test`. **Niet opgelost:** `applyM13Shift` muteert nog steeds de exportconstanten (eenmaal, onomkeerbaar): alle lezers (missiestappen, props, containerterminal) lezen ze direct; dat omzetten naar een apart toestandsobject is een eigen taak. Er is geen echte host/gast-test met twee kaarten |
| 3 | Elk venster draait zijn eigen `drainSliced`: budget per venster | **Opgelost**: één pomp per kaart, het budget is het grootste van de actieve vensters; urgente vensters uit de planner-klasse `urgent`, de rest uit `tile` (minstens 1 ms) |
| 4 | `bgQueue` onzichtbaar voor poorten op een lege `tileQueue` | **Opgelost** voor `streetfurniture3d`, `pedroutes`, `trafficlights`, `streekplekken3d`, `waterplekken3d` (`createCalmGate`: kijkt naar beide wachtrijen, hoogstens eens per 2 s doorlaten). **Niet gedaan:** `routing.js tileWorkPending` en `vehicle/traffic.js` kijken nog naar `tileQueue` alleen; `loadscreen.js` en `main.js` tellen alleen `tileQueue` voor hun voortgang (bewust: de achtergrond hoort daar niet in) |
| 4b | `_buildingDelta` zonder grens | **Opgelost**: 20.000 gebouwen, daarboven leeg en een overloopvlag (de routing toetst alles opnieuw) |
| 4c | `roadbudget` zonder totale wachttijd | **Opgelost**: de rust tussen heavy bouwbeurten hoogstens 2,5 s, en na 6 s totale wachttijd gaat de rust niet meer voor (de frame-regel van #883 blijft); `roadbudget_test` |

## Tests (alle node, alle groen)

`streamplanner_test` (149: budget, verdeling, schuld, verhongering, urgent, wachtrij, veroudering, autostart, uitzetten), `lodstable_test` (1.050: ring zonder gat voor 200 willekeurige verdelingen, smoother tegen
flikker, hysterese, fade, cooler, snelheidsregels, rang in de rijrichting, routebemonstering), `placementurgency_test` (22, met de test "faciliteit nabij en cutscene actief: klaar binnen het budget"),
`streamwindows_test` (32: gedeelde pomp, rustpoort, `tilesIn`, begrensde lijst, `warmRoute`), `streamsoepel_wiring_test` (17: no-undef op alle geraakte bestanden en dat elk systeem de planner gebruikt),
`roadbudget_test` (25), `containerplan_test` (10), `farlod_test` (125, met vertraagd opruimen), en ongewijzigd groen: `tilestream_test`, `popin_wiring_test`, `popinrules_test`, `streambudget_test`, `framequeue_test`,
`tilestore_test`, `tileworld_*` (resident, sparse, pinned), `grass_*`, `trafficlights_*`, `streekplekken_*`, `waterplekken_test`, `padel*`, `cheats_test`, `coopfoci_test`, `perfrest*`, `roadindex_test`, `staticbatch_test`.
`spec_check`: 0 fouten. Niet gedraaid: de tests die `game/world` of `data/cache` nodig hebben (`tileworld_test`, `facilities_test`, `tileplace_test`, `grass_water_paved_test`: SKIP) en de volledige suite (coördinator).

## Eerlijk: wat niet bewezen of niet gedaan is

- **Niets in Electron gezien of gemeten**: geen frametijd, geen beeld. De modeltijden (gebouw, weg, verre tegel) zijn aannames; de echte kosten van een gebouwmesh en een shaderlink zijn niet in dit rapport gemeten.
- **De uitzonderingen in de shader** (`uLodKeep`, een lus van hoogstens 24 afstandstoetsen per vertex binnen de detailstraal) zijn niet gecompileerd op een GPU en niet in beeld bekeken; ook niet op AMD. Een gebouw dat als verre kopie binnen de ring blijft staan, is een kale massa naast gedetailleerde buren: de eigenaar moet beoordelen of dat beter is dan een kleinere ring.
- **De kozijnfade** (dither op `detailMaterial` en `glassMaterial`) is niet in beeld bekeken. De gevelbatches clonen de materialen: de uniform is gedeeld (de closure in `edgefade3d.js`), maar dat is niet op een scherm bevestigd. Een gebouw met een middelpunt voorbij de schakelaar maar een gevel binnen de band krijgt zijn kozijnen pas als het middelpunt binnen de afstand + 12 m komt.
- **Geen apart ontwerp voor bomen, props en meubilair per tegel** (de opdracht noemt ze): bomen hebben sinds #1016 een dither-rand en een laadstraal voorbij de tekenstraal; voor props en straatmeubilair is alleen de rustpoort verbeterd (het bouwen per tegel is al begrensd: `streetfurniture_budget_test`). Ook geen aparte hysterese voor voetgangers en voertuigen (de voertuig-hysterese van #1016 bestaat).
- **Heli en vlucht**: geen routes vooraf (de heli stuurt de speler zelf; de prefetch kijkt 10 s vooruit met de snelheid). `warmRoute` is alleen aan de taxi en de trein gehangen; cutscene-ritten gebruiken `registerShots` zoals voorheen.
- **De activiteitssonde** (`setActivityProbe`) is nog door niemand gezet: urgentie volgt nu alleen de afstand (400 m) en de vlag `restoring` die nog niemand meegeeft (een savegame-herstel). Een missie of minigame verderop die plaatsing nodig heeft, valt dus nog onder de achtergrondregel tot de aanroeper de sonde zet.
- **De gate-agent** (`gate-0.65-21-11`) fixt hetzelfde probleem minimaal in `tileplace.js`/`tilestream.js`; zijn commit was bij het schrijven niet op de tak. Mijn wijziging staat in `placementurgency.js` plus een kleine aanpassing van `withTiles`: bij een samenvoeging in `tileplace.js` de `withTiles`-kop van de planner houden.
- **De dispose bij tegelstroom** (punt 5 van de opdracht): wegen en water hebben al een koude cache (LRU); gras en de verre laag heten nu vertraagd opruimen; gebouwmeshes worden bewust niet vrijgegeven (hun geometrie is per gebouw gecached). Poolen van veelgebruikte meshes is niet gedaan.
- **`streamFrameMs`** (#937) is niet meer bedraad in main.js; de boot- en snelheidsregels zitten nu in `beginFrame` (boost 8 ms in plaats van de tegelregel 0,5 ms: bij een sprong krijgt het werk dus meer tijd, niet minder; of dat bij een sprong tot een hitch leidt, is in Electron te meten).
- **Samen spelen:** streaming is lokaal per speler; de planner, de ring en de vensterpomp zijn lokaal. De wereld van wie het spel opende blijft leidend voor wat gedeeld is (de M13-beslissing leest nu voltooide rijen; de rest is niet aangeraakt). Geen netwerkprotocol veranderd, geen test met twee kaarten.

## Nog in Electron te meten (op een stille machine, na de releasegate)

Elke meting: mediaan van 3 afwisselende runs, Hoog en Ultra (en Laag voor de planner), 1280x720, `?perfoff=` voor de A-kant. Schakelaars: `planner` (de oude losse budgetten), `ringuitzondering` (de oude ring), `ringsnelheid` (geen snelheidsregel voor ring en kozijnen), `kozijnfade` (harde kozijnen).

1. **Haperingen op de rit**: `node scripts/qa/popin.mjs` routes `foot`, `a7`, `heli` (30 s, 40 s, 25 s) zonder en met `?perfoff=planner`: frametijd p50, p95, p99, frames boven 33 ms en 50 ms, `window.__streamPlanner.stats()` (per klasse: ms, eenheden, overschrijdingen, schuld) en `perf/run.mjs` (norm 33,5 ms) op Hoog.
2. **De ring en de ramen**: dezelfde popin-run: `dists().buildingDetailR` (aandeel van de tekenafstand per frame) zonder en met `?perfoff=ringuitzondering`; kleinste ring, frames onder 90%, aantal wachtende gebouwen (`streamPending().buildings`) en de duur tot detail. Beeld: stills op 5 m/s en 30 m/s van een straat met kale gebouwen (uitzonderingen) en van de kozijnband (`?perfoff=kozijnfade`).
3. **Shader**: `node scripts/perf/programs.mjs` (aantal programma's en compilatietijd van de gebouwen- en glasmaterialen met de dither) en een run op de AMD-machine van Nikky: de verre-laagshader met de lus.
4. **Een sprong en een rit**: teleport, taxi (3 km), trein (Groningen naar Delfzijl) en de heli: frames boven 50 ms in de eerste 3 s, `__streamPlanner.stats().frames` (frames boven het plafond) en de tijd tot de eerste volledige ring; met en zonder `warmRoute` (het venster `window.__tileWindows`).
5. **De plaatsingsvensters**: de gate-verhaaltest (discgolf, pitch & putt, zwembad, koe-minigame) in een run met een cutscene en `__tileWindows` (laden, afwerken per venster); en dat de plaatsing na de benchmark volledig klaarkomt.
6. **Geheugen**: heappiek en `endHeapMB` van een rit van 20 km (`scripts/perf/streamdrive.mjs` in een build) voor en na het vertraagd opruimen (gras en verre tegels 4 s langer).
7. **De snelheidsregels**: ring bij 30 en 40 m/s (`ringSpeedScale`, tot 85%) en de kozijnafstand (`facadeSpeedScale`, tot 60%): sneller of juist meer zichtbare pop-in? Zo niet, `?perfoff=ringsnelheid` als standaard of de regel schrappen.
8. **Het drukte-plafond** (`pressureMs` 6, `PLAN.capMs` 4): proef 4, 6 en 8 op Hoog in de stad (a7-route): de wachttijd tot detail tegen de frames boven 4 ms.

## Herhalen

```
cmd /c mklink /J <werkmap>\world <hoofdmap>\game\world        # een junction, nooit recursief verwijderen; weghalen met: cmd /c rmdir <werkmap>\world
sh scripts/perf/streamsoepel.sh <werkmap> <uitvoermap>         # de tabel hierboven (ca. 2 minuten)
node scripts/perf/streamsteps.mjs <werkmap> --place=Groningen --frames=6000
```
