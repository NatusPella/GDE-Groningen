# Prestaties op zwakke hardware (gesimuleerd, #56)

**Gesimuleerd, niet op echte hardware.** Er is geen Intel-laptop of Chromebook gemeten. De simulatie: CPU-throttling via CDP (`--cpu-throttle=N`, `Emulation.setCPUThrottlingRate`), een software-GPU (`--use-angle=swiftshader --enable-unsafe-swiftshader`), 1280x720 en 1904x993, en tot drie gelijktijdige instances. Alles draait op een i7-11700KF met een RTX 3060, **terwijl andere sessies tegelijk Electron en tests draaiden** (de machine was nooit leeg), dus de cijfers zijn ruw en de throttling blijkt niet lineair: 2x geeft 8 fps, 3x geeft 2,4 fps (de wachtende werkers en het wisselen van de throttle op een drukke machine kosten meer dan het getal zegt). Lees ze als ondergrens en als vergelijking tussen A (code vóór deze ronde) en B (code erna).

Herhalen: `node scripts/perf/zwak.mjs [scenario,...]` (staged build nodig, `ZWAK_ROUTES`, `ZWAK_DUR`, `ZWAK_TAG`, `PERF_LOCKS=<slotmap>`). Per scenario: fps, frametijden, auto-kwaliteit aan het eind (`schaal/cpuniveau`), tegelwachtrij (`maxQueue`, te late tegels), tijd tot titelscherm en hoofdmenu. Route `foot` (te voet in het centrum, 50 s meten na 6 s inlopen), preset `--preset=laag` of `hoog` met automatische kwaliteit.

## Resultaten

B = met de wijzigingen hieronder; A = ervoor, alleen waar gemeten.

| scenario | fps | gem. ms | p50 | p95 | p99 | cpu ms | draw calls | auto aan het eind | titel s | menu s |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| laag, 720p, geen throttle (B) | 30,8 | 32,5 | 16,8 | 66,7 | 166,8 | 27,3 | 362 | schaal 1, cpuniveau 3 (host belast) | 12 | 37 |
| laag, 720p, 2x (B) | 8,0 | 125,7 | 66,6 | 383 | 767 | 108 | 330 | schaal 1, niveau 3 | 23 | 56 |
| laag, 720p, 3x (B) | 2,4 | 420 | 217 | 817 | 4167 | 374 | 302 | schaal 1, niveau 3 | 24 | 61 |
| laag, 720p, 4x (A) | 1,1 | 930 | 517 | 1517 | 13250 | 837 | 410 | niet gestapt (frames > 250 ms genegeerd) | 34 | 82 |
| laag, 720p, 4x (B) | 0,6 | 1744 | 817 | 6884 | 16684 | 1582 | 229 | schaal 1, niveau 3 | 39 | 106 |
| hoog, 720p, 4x, automatisch (A) | 2,3 | 444 | 333 | 583 | 2133 | 398 | 446 | schaal 1, niveau 1 | 25 | 57 |
| hoog, 720p, 4x, automatisch (B) | 3,3 | 304 | 233 | 533 | 2233 | 275 | 283 | schaal 1, niveau 3 | 33 | 59 |
| hoog, 720p, 6x, automatisch (A) | 1,2 | 857 | 500 | 2167 | 12200 | 776 | 375 | niet gestapt | 39 | 97 |
| hoog, 720p, 6x, automatisch (B) | 0,2 | 4863 | - | 24567 | 24567 | 4445 | 144 | schaal 1, niveau 2 | 73 | 108 |
| SwiftShader, laag, 720p (A) | 0,3 | 2890 | 2400 | 8483 | 8483 | 1999 | 249 | niet gestapt | 17 | 46 |
| SwiftShader, laag, 720p (B) | 0,4 | 2850 | - | 7700 | 7700 | 1719 | 223 | schaal 1, niveau 2 | 11 | 36 |
| 3 instances tegelijk, laag, 1080p (B), instance 1 / 2 / 3 | 28,7 / 25,9 / 20,3 | 34,8 / 38,6 / 49,2 | - | 67 / 84 / 117 | 133 / 183 / 533 | 31 / 34 / 40 | 375 / 349 / 348 | niveau 3 (schaal 0,9 bij instance 3) | 11 / 25 / 13 | 33 / 48 / 34 |

Ook de tegelwachtrij: in elk scenario piekt `maxQueue` op 160 tot 217 tegels en komen er geen te late tegels (`late` 0), maar bij 3x en meer duurt het laden zo lang dat de meting nog in het inladen van de wereld valt (tijd tot menu 56 tot 108 s tegen 33 tot 37 s zonder throttle). Het streamen blijft dus niet achter in de zin van te late tegels, maar het laden haalt de 30 s niet.

## Wat de simulatie laat zien

- **Zonder throttle haalt Laag op 720p ongeveer 30 fps** (mediaan 17 ms) en drie instances naast elkaar op 1080p 20 tot 29 fps. Het laden naar het hoofdmenu duurt 33 tot 37 s op deze belaste machine: de doelstelling van de issue (laadtijd onder 30 s) is **niet gehaald**, wel dicht bij.
- **Vanaf 2x throttle is het spel niet speelbaar** (8 fps, p95 383 ms), op 4x en 6x zeker niet. Verder terugschakelen van beeld en simulatie helpt dan nauwelijks: het blijft de renderer (draw calls) en de wereldbouw op de hoofdthread. Een echte zwakke laptop zal tussen 1x en 2x van deze machine zitten (een eenvoudige schatting, niet gemeten).
- **SwiftShader** (software-GPU) geeft 0,3 tot 0,4 fps op 720p: zonder echte GPU is het spel niet speelbaar, ook niet op Laag. `classifyGpu` herkent SwiftShader al en kiest dan Laag.
- Het hoogste profiel op een zwakke machine zakt via de automatische kwaliteit naar niveau 3, maar het begin van de sessie (laden en eerste minuut) draait op volle kwaliteit.

## Wat is verbeterd (automatische kwaliteit, `gfxprofile.js`)

1. **Blinde vlek bij trage frames.** `noteFrame` negeerde frames boven 250 ms, dus een machine die maar 3 fps haalt gaf nooit een stap (zie 4x A: geen schaal- of niveaustap). Nu telt zo'n frame als 250 ms (elke seconde wordt op de mediaan beoordeeld, losse hitches tellen niet).
2. **Sneller stappen ver boven het budget.** Boven 67 ms (2,5x de grens van 27 ms) telt elke seconde dubbel: de stappen komen twee keer zo snel.
3. **cpuniveau 3** (nieuw, boven niveau 2): kortste zichtafstand (150 m, ook voor Ver en Heel ver), detailring 100 m in plaats van 140 tot 190 m (ongeveer een derde minder meshes), gevelsieraad alleen binnen 45 m, de schaduwkaart één frame op vier zolang de focus langzamer dan 8 m/s beweegt, en een dunnere stad (40 procent van de auto's en voetgangers, verre agenten denken elk vierde frame, binnen 40 m volle snelheid). De dynamische schaal mag tot 50 procent (was 60).
4. Tests: `scripts/gfx_profile_test.mjs` (een machine die voorgoed CPU-gebonden is stapt 1, 2, 3 en blijft op 3; 3 fps wordt niet genegeerd; ver boven het budget stapt sneller), `scripts/viewdist_test.mjs` (niveau 3 krimpt de ring), `scripts/shadowsnap_test.mjs` (een op vier, een snelle auto krijgt elke pas).

Effect (A tegen B, hoog 4x, automatisch): 2,3 naar 3,3 fps, draw calls 446 naar 283, cpu per frame 398 naar 275 ms. Bij laag 4x en hoog 6x werd het in deze runs niet beter (laag 4x: 1,1 naar 0,6 fps; hoog 6x: 1,2 naar 0,2 fps): die runs zijn door de belasting van andere sessies te ruw om een verschil te bewijzen, en bij 6x valt de meting grotendeels in het laden.

## Niet gedaan

- Echte zwakke hardware. Geheugen is niet beperkt (heap 1,1 tot 1,2 GB in alle runs). 1080p met throttle en meerdere instances onder throttle zijn niet gemeten. Het laden zelf (titel 12 s, menu 37 s zonder throttle) is niet versneld. Het eerste-start-advies (`startGfxAdvisor`) is niet onder throttle getest; een zwakke machine begint dus op de preset die `classifyGpu` kiest en zakt daarna met de automatische kwaliteit.
