# Prestatiemeting 5 november 2026 (#4)

> Dit is een **nieuwe, gedateerde meetbron** naast `docs/PERF-METING-2026-10-19.md`.
> De cijfers van 19-10 zijn gemeten op een volle machine; die van vandaag op een
> stille machine. Vergelijk de absolute getallen daarom voorzichtig.

> Vervolgmeting: `docs/PERF-METING-2026-11-09.md` (verificatie #804/#806 met de
> hitchprobe na de merge; inclusief de daar gevonden en gerepareerde crash).

## Machine en opzet

- **Rustig:** CPU-belasting 0–1% voor en na de runs, 0 Electron-processen van
  anderen, load average 0.00, 6 GB vrij geheugen, 17 GB totaal.
- Intel Core i7-11700KF (16 threads), Windows, 1904×993 CSS-px bij dpr 1.
- `node scripts/perf/run.mjs rustig-1105 --preset=quality:hoog --hitch`,
  `PERF_DUR=15000` per route. Twee runs: de eerste met a7, platteland, spoor,
  varen, druk, nacht en regen; de tweede met foot, ring, village, heli, wandel,
  staan, lek en latentie. `latentie` leverde geen framereeks op (alleen een
  uitschieter van 539 ms) en staat daarom niet in de tabel.
- Zelfde routes en profielen als op 19-10: `foot` = stad te voet, `village` =
  dorp, `ring` = autorijden op de ring, `spoor` = stand-in langs de spoorlijn,
  `heli` = helirun.

## Tabel (15 s per route, hoog profiel, stille machine)

| route | gem. ms | p95 | p99 | max | fps (gem.) | frames >50 ms | heap MB |
|---|---:|---:|---:|---:|---:|---:|---:|
| foot (stad) | 19,21 | 35,3 | 36,5 | 51,9 | 52 | 1 | 1615 |
| village (dorp) | 17,59 | 18,3 | 18,4 | 36,5 | 57 | 0 | 1154 |
| ring | 18,65 | 34,5 | 36,5 | 54,7 | 54 | 2 | 1941 |
| a7 | 20,84 | 35,5 | 53,6 | **414,8** | 48 | 48 | 1138 |
| platteland | 18,38 | 18,5 | 36,4 | 260,4 | 54 | 8 | 1614 |
| spoor | 24,29 | 36,4 | 53,6 | 199,0 | 41 | 52 | 1165 |
| varen | 17,61 | 18,3 | 18,4 | 259,4 | 57 | 1 | 1457 |
| wandel | 18,88 | 34,4 | 35,7 | 36,6 | 53 | 0 | 1309 |
| staan | 19,03 | 34,4 | 36,3 | 350,0 | 53 | 1 | 1408 |
| druk | 20,13 | 35,4 | 36,4 | 36,6 | 50 | 0 | 1665 |
| nacht | 24,41 | 36,4 | 36,7 | 54,5 | 41 | 6 | 1732 |
| regen | 21,77 | 35,5 | 36,5 | 125,5 | 46 | 3 | 1241 |
| heli | 18,98 | 18,3 | 36,2 | **453,5** | 53 | 4 | 2421 |
| lek (3 min ring) | 18,08 | 18,3 | 35,4 | 295,4 | 55 | 18 | 1292 |

## Wat dit zegt

- **De gemiddelde frametijd is nu 17,6 tot 24,4 ms** (41 tot 57 fps) op het hoge
  profiel. De stad te voet haalt 52 fps en het dorp 57 fps; autorijden op de ring
  54 fps. Dat is duidelijk beter dan de 23 fps (stad) en 20 fps (ring) van 19-10,
  maar die meting stond op een volle machine — het verschil is dus niet volledig
  aan de code toe te schrijven.
- **De haperingen zitten niet in het gemiddelde maar in de staart.** A7 (48 frames
  boven 50 ms, max 415 ms), spoor (52 frames, max 199 ms), heli (max 454 ms),
  staan (max 350 ms) en lek (max 295 ms) laten zien dat streamen en het laden van
  een nieuwe omgeving nog steeds één tot een halve seconde kan kosten. Dat past
  bij #247 (streamen bij snel reizen) en de bos-tegelhapering die in #4 genoemd
  werd.
- **p95 van 35 ms** op veel routes betekent dat 5% van de frames onder ~28 fps
  zit, ook als het gemiddelde 50+ is. De volgende winst zit dus in de staart, niet
  in de mediaan.
- Geheugen: 1,1 tot 2,4 GB heap; de heli-run is met 2,4 GB de zwaarste.

## Wat niet in deze meting zit

- `geocheck` (aparte wereldcheck) en de teleport-routes: die staan niet in
  `routes.js` en zijn hier niet gemeten.
- Een echte trein in plaats van de spoor-stand-in, en een lange sessie (lek).
- Zwakke hardware: dat blijft #56.

Vervolgwerk staat op #246, #247 en #248. De bos-tegelhapering uit dit issue valt
naar verwachting onder #247.
