# Bisect van de opwarmregressie (21-11-2026, #1052)

> Opdracht: vind de commit(s) achter de regressie van `PERF-STIL-21-11.md` (0.44 naar 0.64: Hoog 48,5 naar 42,1 fps, vooral in de eerste minuut) en fix wat te fixen is.
> Tak `perf-bisect-21-11` vanaf main (`610bfd170`). Niets gepusht of gemerged. **De code op de tak is gelijk aan main**: elke proeffix is teruggedraaid omdat hij niets opleverde (zie "Fixpogingen"). Wat wel is gebouwd: de meettooling (`scripts/perf/bisect/`).

## Uitkomst in vijf regels

1. De regressie zit tussen **0.54.0 (48,7 fps, goed)** en **0.58.0 (40,5 fps, slecht)** op Hoog. Commit 107 van de 213 tussen v0.57.5 en v0.58.0 (`06fb5199e`) en 109 (`d8b5b91e0`, net vóór `a730f5b66`) zijn nog goed (48,8 en 49,5); 200 (`9d5a55a76`) en 0.58.0 zijn slecht (39,0 en 40,5).
2. **Eén commit is niet aan te wijzen:** de commits 110 tot en met minstens 187 (`a730f5b66` ... `888bc48e9`) en de tags 0.56.0, 0.56.2 en 0.57.0 starten niet met de wereld uit de hoofdmap (het laadscherm blijft tot de time-out staan). Een bisect is daar met deze wereld onmogelijk; de grens ligt in dat gat.
3. **Het mechanisme is bewezen met CPU-profielen en een A/B:** 0.54 pinde de hele provincie (2978 tegels, 88 MB ruw, 3,0 GB heap) bij het laden; sinds de reeks "Ontpinnen #314" (`4a428bcdb` ... `888bc48e9`, 7-11) blijft alleen de stad (58 tegels) staan en stromen de rest in tijdens het spelen. In de eerste scenes komen daardoor ca. 420 tegels in (190 vallen later weer weg), en elke tegelstap kost de hoofdthread: **3,6 s van de 30 s** (0,6 s in 0.54, waar het er nul waren).
4. Een build die alle tegels weer pint (0.54-gedrag, proef) herstelt de opwarmfase grotendeels (Vismarkt 12 naar 31 fps, Noorderplantsoen 18 naar 30, Zonsopgang 21 naar 31) maar kost 3,5 GB heap en haalt de latere scenes niet terug. Dat is de bewuste ruil van #314/#1040 (heap omlaag); **geen fix die de ruil terugdraait**.
5. Drie gerichte fixes hebben **geen effect** gehad (stad een minuut langer pinnen, een ring van 3 tegels vastpinnen, goedkopere tegelstap). Teruggedraaid. De oorzaak van de ongeveer 98 tegels die bij elke camerasprong tegelijk binnenkomen (ringen tot 9 tegels van de stad, terwijl `tilefocus.js` de snelheid al afkapt) is niet gevonden.

## Meetopzet

Dezelfde als `PERF-STIL-21-11.md`: `--benchmark=1 --windowed --stil`, 1920x1080, `--force-device-scale-factor=1`, Electron 45.2.3 (hoofdmap), RTX 3060, `game/world` uit de hoofdmap in elke build, preset Hoog
(`quality:hoog,shadows:true,drawDistance:kort,resolution:1,autoResolution:true`), CPU vóór elke run 9 tot 14% (grens 25%), één Electron tegelijk via de slotbewaker `bisect2`, profiel en TEMP in de eigen werkmap. Eén
verweesde `electron.exe` (pid 5220) draaide mee en is niet aangeraakt. Elke build is een `git archive` van de tag of commit, gestaged met `GDE_PREBUILT_WORLD`; de meetscripts staan in `scripts/perf/bisect/`.

**Nieuw ten opzichte van de stille meting (de opwarmfase):** `bhook.js` legt elke `requestAnimationFrame`-delta en elke longtask met tijd vast; een harnaspatch (`patchbench.mjs`, alleen in de gestagede kopie) zet in `trailer.js` elk
benchmarkframe met zijn shotnummer in `window.__bfr`. Daarmee volgt per scene: gemiddelde fps over alle frames van die scene (dus ook het begin van de scene dat de officiële benchmarkfps overslaat), frames > 50 ms en > 100 ms.
De "opwarmfase" is de som van de eerste zes scenes met frames (Zonsopgang, Vismarkt, Noorderplantsoen, Tessa, Tammo, Escapade; ca. 24 s klok na de start van de benchmark). De frameduur in `__bfr` is bij 250 ms afgekapt (de
benchmark klemt de tijdstap), de werkelijke langste frames staan in de rAF-reeks (tot 9,7 s). `--bench-eval` meldt ook `console.warn`/`error` en elke 5 s het laadscherm (`[trailer] bstat`, `berr`), waarmee de hangs zichtbaar werden.

## Tabel 1: tags en commits, Hoog, één run per punt (tenzij anders vermeld)

Alle runs op dezelfde wereld. "Opwarm" = de zes scenes hierboven. De commits staan als index in `git rev-list --reverse v0.57.5..v0.58.0` (213 commits).

| punt | gem. fps | opwarm fps | frames > 50 ms | frames > 100 ms | longtasks | heappiek MB |
|---|---|---|---|---|---|---|
| v0.44.0 (2 runs) | 49,1; 49,5 | 36,5 | 62 | 27 | 89; 80 | 3020; 3004 |
| v0.54.0 (2 runs, 2e met profiel) | 48,7; 49,7 | 34,6; 35,7 | 83; 76 | 29; 24 | 89; 87 | 2646; 3001 |
| v0.56.0, v0.56.2, v0.57.0 | geen resultaat: laden blijft hangen | | | | | |
| commit 107 `06fb5199e` | 48,8 | 35,3 | 73 | 25 | 97 | 2849 |
| commit 109 `d8b5b91e0` | **49,5** | 35,1 | 78 | 23 | 89 | 2780 |
| commit 135, 160, 186 (`888bc48e9` = 187) | geen resultaat: laden blijft hangen | | | | | |
| commit 200 `9d5a55a76` | **39,0** | 16,1 | 152 | 104 | 159 | 2954 |
| v0.58.0 | **40,5** | 16,4 | 152 | 97 | 155 | 2987 |
| v0.60.0 | 42,9 | 21,6 | 140 | 64 | 138 | 2739 |
| v0.61.0 | 42,0 | 19,3 | 160 | 63 | 161 | 3152 |
| v0.64.0 (3 runs) | 42,6; 43,8; 41,8 | 20,3; 22,6; 19,7 | 153; 132; 153 | 67; 57; 69 | 158; 135; 161 | 3264; 3073; 3049 |
| main (`610bfd170`, 4 schone runs) | 44,7; 45,1; 45,6; 44,6 | 24,2; 23,9; 25,9; 25,0 | 158; 150; 136; 150 | 40; 37; 31; 30 | 156; 147; 124; 140 | 2682; 2705; 2445; 2275 |
| main met alle tegels gepind (proef) | 44,1 | 31,4 | 91 | 26 | 115 | 3531 |

Een vijfde mainrun (35,9 fps) viel samen met mijn eigen staging en testrun op dezelfde machine en is niet meegeteld. De runs met de proeffixes staan in de tabellen hieronder.

De tags 0.56.0 tot en met 0.57.0 tonen de laadtekst ("Grunn wordt wakker") tot de time-out van 230 tot 540 s. 0.54 en 0.58 starten wel. Waarom is **niet onderzocht**; zeker is dat 0.57.1 in de eerdere bisect ook hing. De hang volgt de
verandering van de stadspin niet in de tijd (commit 107/109 starten, 135 tot 187 niet, 200 weer wel), dus een tussentoestand van de #314-reeks die de nieuwe sparse wereld niet leest ligt voor de hand, maar is niet bewezen.

## Tabel 2: per scene, Hoog, fps (frames > 50 ms / > 100 ms), één representatieve run per build

| scène | v0.54.0 | v0.64.0 | main | main met alle tegels gepind (proef) |
|---|---|---|---|---|
| Zonsopgang bij de Martinitoren | 29,0 (16/8) | 14,8 (34/20) | 20,7 (46/5) | 31,2 (16/5) |
| Terrassen op de Vismarkt | 41,9 (14/1) | 12,2 (38/18) | 12,0 (50/14) | 31,4 (11/4) |
| Noorderplantsoen | 38,7 (9/1) | 10,6 (30/15) | 17,7 (25/7) | 30,3 (10/2) |
| Tessa | 50,5 (2/1) | 36,7 (10/3) | 32,7 (14/4) | 44,0 (3/1) |
| Tammo | 52,4 | 49,2 | 46,1 | 50,8 |
| Achtervolging door de binnenstad | 51,0 | 46,2 | 47,7 | 40,5 |
| Traumaheli boven het UMCG | 30,3 (4/1) | 23,5 (30/1) | 27,5 (12/1) | 24,3 (24/1) |
| Kermis op de Grote Markt | 54,1 | 52,1 | 52,2 | 42,8 |
| De Ommelanden | 52,6 | 55,4 | 56,3 | 48,4 |

De regressie zit in de eerste vier scenes (alle andere scenes liggen binnen 1 tot 4 fps, de proef met alle tegels gepind is daar zelfs trager door de grotere heap). Een kleine scenerestwinst blijft over bij Traumaheli (30 naar 24 tot 28, 12 tot 30 frames > 50 ms).

## CPU-profielen van de eerste 30 s van de benchmark (500 µs sampling, `scripts/perf/bisect/prof.mjs`, Hoog)

Inclusieve hoofdthread-tijd in ms (gemiddeld over de 30 s; `incl.mjs`):

| | v0.54.0 | v0.64.0 | main |
|---|---|---|---|
| bezet (30 s) | 26.481 | 28.951 | 29.170 |
| tegelstap (`step`) | 606 | 2.365 | 3.640 |
| waarvan `addTileSteps` | niet aanwezig | 2.098 | 3.247 |
| waarvan `markDryRoad` | 0 | n.v.t. | 997 |
| waarvan `trimTileGreenery`, `misplacedBuilding`, luifels, `extendElevation` | 0 | n.v.t. | 498, 357, 323, 235 |
| `getProgramParameter` (blokkerende shaderlink) | 7.973 | 5.948 | 9.538 |
| garbage collector | 503 | 1.703 | 831 |
| rec.w.onmessage (kloon van de worker) | 0 | 679 | 707 |

In 0.64 zit daarnaast de oude herbouw van de wegenindexen (traffic.js `roadGraph` 1,2 s, trafficlights, gridItems 0,7 s, fillNodes, buildGraph): die is in main weg (#1042). Wat main nog extra doet tegenover 0.54 is de tegelstap, niet de wegenindex.
`getProgramParameter` (het wachten op het linken van shaderprogramma's) is in alle drie 20 tot 33% van de hoofdthread: dat is geen regressie maar de volgende grote post (zie PERF-START-21-11.md).

Tegeltelling in de eerste run (`window.__bfr` en een tijdelijke `console.log` in `addTileSteps`/`dropTile`, alleen in de proefbuild): 84 overlay-tegels bij het laden, daarna 14 + 192 + 8 + 57 + 66 gestreamde tegels en 189 drops
in 60 s, in uitbarstingen van 98 tegels (op 21 s, bij Zonsopgang) en 87 (op 28 s, Vismarkt): ringen tot 9 tegels (9 km) van de stad en daarbuiten enkele op 22 tot 38 tegels (landmarks in de Ommelanden). `tilefocus.js` kapt de snelheid af op 80 m/s
en negeert een sprong, dus de straal blijft maximaal 2,3 km; de uitbarstingen komen dus niet uit de prefetch. Wie ze aanvraagt (voorwarmen van de scène, landmarks, `prepareLandmarks`) is **niet gevonden**.

## Fixpogingen (alle teruggedraaid, de code op de tak is gelijk aan main)

| poging | hypothese | meting (Hoog, opwarm fps; gemiddeld) | besluit |
|---|---|---|---|
| `cityHoldMs`: de sparse stad een minuut langer vastpinnen na het laden | de stad valt weg en komt terug | 23,0 (voor: 24,2); gem. 44,1 tegen 44,7 | teruggedraaid, +240 MB heap zonder winst: de stad was het niet, het zijn de provinciegegevens eromheen |
| goedkopere tegelstap: omhullende-uitsluiting in `markDryRoad`/`waterDistance`, `SEG`-hergebruik in `propfilter.js` | de stap rekent veel per tegel | `markDryRoad` 942 ms tegen 997, `step` 3.643 tegen 3.640 | teruggedraaid: het werk is echte puntentest in grote waterlichamen, niet rastercelruis |
| ring van 3 tegels om de stad vastpinnen (139 tegels, 6,8 MB ruw) | de eerste scenes raken de buurt | 23,5 en 19,3 tegen 23,9 en 25,9 (twee paren; het derde paar mislukte doordat ik de map opruimde terwijl de run liep) | teruggedraaid: de uitbarstingen reiken tot 9 tegels |
| alle 2978 tegels pinnen (0.54-gedrag; proef, niet voor main) | oorzaak bevestigen | opwarm 31,4; gem. 44,1; heap 3,5 GB | bevestigt de oorzaak, geen fix (heap) |

## Nameting

Er is geen codewijziging, dus geen nameting van een fix. Wat ik wel heb gemeten, mediaan van 3 (min-max), Hoog, 21-11 nacht: 0.44.0: 49,3 (49,1-49,5; 2 runs), 0.64.0: 42,6 (41,8-43,8), main nu: 45,1 (44,7-45,6; 3 van 4 schone runs, de vierde was 44,6).
Laag en Ultra zijn **niet opnieuw gemeten** (tijdgebrek na de bisect); de cijfers van `PERF-STIL-21-11.md` gelden (Laag 53,0 / 46,8 / 50,5, Ultra 42,7 / 34,4 / 38,9 voor 0.44 / 0.64 / main).
Main staat dus 4 fps (Hoog) onder 0.44 en ruim 2,5 fps boven 0.64; de opwarmfase is 24 fps tegen 35 in 0.44.

## Wat niet bewezen is

- De commit zelf (zie punt 2): de grens ligt in 110 tot 187 van de 213 commits tussen v0.57.5 en v0.58.0, waar deze wereld niet laadt. De reeks "Ontpinnen #314" ligt precies daar (`4a428bcdb` = 97, `a730f5b66` = 110, `0340d4c74` = 120 adaptieve schaduwmap, `7aff8a4bd` = 156 decode-serialisatie, `888bc48e9` = 187 stadspin eruit).
  De adaptieve schaduwmap (4096 naar 2048) en postsamples (`0340d4c74`) vallen in het gat en zijn niet los gemeten; in een stil beeld speelt ze geen rol (de tegelstappen verklaren de opwarmstilstand).
- Of de speler dit in het echte spel zo ziet: de uitbarstingen van 98 tegels volgen de camerasprongen van de benchmark. Een wandeling streamt geleidelijk. De eerste-minuut-observatie van de eigenaar (#1011) is hier niet mee herhaald.
- Eén run per tag en per commit: het verschil (48 tegen 40 fps, opwarm 35 tegen 16 tot 21) is veel groter dan de spreiding tussen runs van dezelfde build (0,5 tot 2 fps), maar de commitgrenzen zelf steunen op één run.
- Laag en Ultra, geluid aan, en de echte (niet-`--stil`) start: niet gemeten.

## Voorstel (niet uitgevoerd)

1. Zoek wie de 98 tegels per sprong aanvraagt (`store.request`/`prefetch` met een stacktrace in de proefbuild) en geef cutscene- en benchmarksprongen een kleinere vraag (alleen de scène plus 1,5 km), of vraag ze in porties.
2. Maak de tegelstap goedkoper per tegel door de gebieden eruit te halen die niet in beeld zijn (`trimTileGreenery` 0,5 s en `misplacedBuilding` 0,4 s per 30 s draaien voor tegels buiten de camera), of leg `markDryRoad` vast in de wereldbouw (een bit per weg in de tegel; geen echt werk meer in de stap).
3. Geef de reeks #314 een eigen ADR: het geheugen (3,0 naar 2,5 GB) is bewust ingeruild tegen een koude eerste minuut; als de eigenaar de eerste minuut zwaarder weegt, is een gedeeltelijke pin (alleen de tegels van de openingsscènes, ca. 120) de goedkopere ruil.
4. Maak de hang van 0.56.0 tot 0.57.0 en commits 110 tot 187 met de huidige wereld reproduceerbaar (alleen het laadscherm "Grunn wordt wakker"): dan is de bisect af te maken.
