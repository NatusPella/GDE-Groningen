# Input-latentie (#827): budget en meetmethode

## Budget

Op de meetmachine (Windows 11, i7-11700KF, RTX 3060, 1904×993 CSS-px, dpr 1,
`--preset=quality:laag`) geldt:

| maat | budget | waarom |
|---|---:|---|
| p50 | **≤ 33 ms** | twee 60Hz-frames; één frame wachten op rAF plus één frame display |
| p95 | **≤ 50 ms** | drie frames; een enkele hitcher mag de meting niet laten zakken |
| max | informatief | een uitschieter door streamen/plaatsing is geen structurele inputlag |

De meting is een **software-schatting** van toets tot het eerste frame waarin de
spelerspositie verandert. Er zit geen fotodiode of echte schermmeter tussen; tel
voor het beeld op een 60Hz-scherm nog ongeveer één refreshtijd (16,7 ms) op.

## Meten

```powershell
cd desktop
node build.mjs                 # stage de actuele game

# vanuit de repo-root; TEMP/TMP in de werkmap houdt de throwaway-profielen
$env:TEMP = "$PWD\.agents\perf-tmp"; $env:TMP = $env:TEMP
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:PERF_ONLY = 'latentie'
$env:PERF_OUT = "$PWD\.agents\perf-latency"
node scripts/perf/run.mjs latency-1 --preset=quality:laag --no-sandbox
node scripts/perf/run.mjs latency-2 --preset=quality:laag --no-sandbox
node scripts/perf/run.mjs latency-3 --preset=quality:laag --no-sandbox
```

`--no-sandbox` is alleen nodig als de lokale Electron-shell zonder die flag
niet start; noteer dat in het resultaat. De runner maakt het wegwerpprofiel zelf
aan en start Electron nooit als Node (`ELECTRON_RUN_AS_NODE` wordt gewist).

De route (`scripts/perf/routes.js`, `PERF_ONLY=latentie`):

1. teleport naar de vaste voetplek en wacht 5 s;
2. wacht tot **20 opeenvolgende frames** rustig zijn (`frameMs < 25 ms`,
   `workMs < 20 ms`), zodat de plaatsings-/streamingspiek na de teleport niet
   als inputlag wordt geteld;
3. 20 keer: synthetische `W`-keydown, poll via `requestAnimationFrame` tot
   `player.x/y` verandert, daarna keyup en 400 ms rust;
4. rapporteer p50/p95/max plus de opbouw: `dispatchMsP50` (eventhandler),
   `firstRafMsP50` (wacht op de volgende rAF), `framesP50`, `workMsP50`
   (vorige frameBody) en `frameMsP50` (rAF-interval).

Resultaat staat in `PERF_OUT/<naam>.json` onder `routes.latentie`; de
`breakdown`-velden maken zichtbaar waar de tijd zit.

## Meting 9-11-2026 (3 runs, quality:laag)

| run | p50 | p95 | max | firstRaf p50 | frames p50 | workMs p50 | frameMs p50 |
|---|---:|---:|---:|---:|---:|---:|---:|
| run 1 | 15,0 | 17,5 | 17,8 | 15,0 | 1 | 9,8 | 16,7 |
| run 2 | 16,0 | 20,6 | 23,8 | 16,0 | 1 | 11,7 | 16,7 |
| run 3 | 15,3 | 17,2 | 19,3 | 15,3 | 1 | 14,1 | 16,7 |

**Conclusie:** de inputhandler kost ~0,1 ms; de positie verandert in **één**
volgend frame. De p50 wordt dus vrijwel volledig bepaald door het wachten op de
volgende `requestAnimationFrame` (15-16 ms), niet door update- of renderwerk.
Met de display-refresh erbij is dat op 60Hz ongeveer 32 ms, binnen het budget.
De vaste update-stap is geen extra vertraging: de speler beweegt in hetzelfde
frame als de rAF waarop de toets is verwerkt.

Vóór de warm-up (dezelfde route, direct na de teleport) zagen we p50 15,5-27,6
en p95 18-58, met een enkele uitschieter van 593,9 ms: dat waren
plaatsings-/streamingspieken, geen structurele inputlag. De warm-up is de
gerichte verbetering aan de meetmethode; de spelersinput zelf had geen brede
refactor nodig. De eerdere issue-meting (p50 35 / p95 84,6) kwam uit dezelfde
route op een oudere build en zonder deze stabilisatie.

## Beperkingen

- Andere Electron-instanties of CPU-belasting beïnvloeden de meting; de runner
  logt het aantal Electron-processen en de CPU-drukte voor/na.
- Geen echte telefoon/touch-meting en geen fotodiode; dit is een softwaremaat.
- Alleen `quality:laag` op 1904×993; een hogere kwaliteit of grotere viewport
  kan de frameBody-tijd verhogen en daarmee een volgende frame afdwingen.
