# Prestatietrend 0.54.0 naar nu (opstart, laden, streaming, framebudget)

> Aanleiding: de eigenaar merkt sinds v0.54.0 langere laadtijden en een zwaarder spel.
> Deel A is statisch (git en bronnen, 19-11-2026); deel B (metingen) en C (herstel) staan
> onderaan. Wat niet gemeten is, staat er als "niet gemeten".

## A1. Tijdlijn per tag

| Tag (datum) | Wat erbij kwam voor opstart, laden en frame | Hoe het opstarttijd of framebudget raakt |
|---|---|---|
| v0.54.0 (28-10) | Basis. `main.js` heeft geen voorwarmen: het laadscherm wacht alleen op de wereld, tegels, `streamPending()` en de gebouwen/wegen rond de speler. | Referentie. |
| v0.56.0 (6-11) | Tegelbudget bij trage frames, minder matrix- en wegenwerk per frame (#553); speler-singleton-refactor (#500, 15+ bestanden). | Licht negatief tot neutraal per frame; geen vaste wachttijd. |
| v0.57.0 (6-11) | Sessie van één (#554): alleen spelen is een sessie, online-startzoektocht gaat voor. Tegel-time-outs en boot-deadlock-fixes (#582). | Extra stap bij de start (zoektocht, later naar na het laadscherm verplaatst in 0.57.3); alleen in foutgevallen echt wachten. |
| v0.58.0 (7-11) | Ontpinnen #314/#524 (rasters en sparse lagen voor 7 lagen), blobschaduw/raycast-splits, adaptieve schaduwmap, save-cache. Bestanden 985 (+75). | Meer lagen en indirectie per tegel; per frame ongeveer gelijk. Kosten zijn vooral de tegeldecoder en indexopbouw. |
| v0.59.0 (8-11) | **Nieuw: laadscherm warmt de startbuurt en de shaders voor** (`START_WARM_MS=25000`, straal 200 m, `af23ed02f`, `7154e240b`). Ommeland-plaatsing en kaartbeelden worden vóór de start klaargezet (`8c98bfb3f`). Terreingrond wordt gebakken en gelezen (-2 s). Boot-wachter 180 s en ruimere tegelgrenzen (alleen foutpad). | **Eerste vaste opwarmbudget**: tot 25 s extra in het laadscherm; stopt vroeg bij 12 rustige frames. |
| v0.60.0 (9-11) | Wegopbouw per frame begrensd, sparse productiewereld, `ba82d2f4b` heavy-weg-uitstel (#804). | Minder pieken in de frame, maar meer bookkeeping per frame. |
| v0.60.1-v0.60.7 (9-12/11) | **Nieuw: openingsfilm voorrijden tijdens het laadscherm** (`a1840656e`, `INTRO_WARM_MS=45000`), shaders écht voorcompileren, opening-assets in beide lichtstanden tekenen (`8d657e0fa`, `aca7938e8`), waterindex, lean-stand, tilewerk tijdens de film uit. | **Tweede vaste budget**: tot 45 s extra. CHANGELOG zelf noemt "~25-30 s extra laadtijd" op een gewone machine. |
| v0.61.0 (14-11) | Perf-norm v2 (33,5 ms), voertuigmeshes tijdens de film gefaseerd, gras-chunkbouw na de film. | Neutraal tot positief. |
| v0.62.0 (15-11) | **Start-ring 200 -> 320 m**, `INTRO_WARM_MS` 45 -> **70 s**, `INTRO_TOUR_MS=35 s`: tien montageplekken op straathoogte afrijden met `setHoldMaterials/Grass` (`8c3630ca5`, `a66eadd63`, `e8b5bdc21`). `updateGameplay` krijgt 20 extra aanroepen (menukaart, kaartontdekking, schermen). | **Grootste verslechtering van de opstart**: harde bovengrens van 25 + 70 s = 95 s in het laadscherm; per frame +18% aanroepen in `updateGameplay`. |
| v0.63.0 (16-11) | Wereld-fixes, missie-aankleding, reizen, TTS-herinspraak. Modules 1048 (+138 t.o. 0.54). | Meer data en modules per tegel/start; `main.js` imports 205 -> 224. |
| na 0.63.0 tot HEAD (16-19/11) | #929: laadscherm wacht ook op tegels en prewarm van de bestemming (na reizen); voertuig-binnenruimtes (#833, #847), laadruimtes en bootinterieurs als extra tick-soorten in de spellus; 19-11: modulepreload en V8-codecache, NAV-sectie niet meer naar de hoofdthread, decoderpool volgt de kernen, verkeer en voetgangers per soort op een eigen frame, gras-syncTufts hergebruikt cellen, camera-pushrays. | De 19-11-wijzigingen verlagen opstart en frame; de tick-soorten en #929 voegen werk toe. |

## A2. Statische maten per tag

Gemeten met `git ls-tree -r -l <tag> -- game/js` (alle `.js`) en `.scr/perframe.mjs` (aanroepen in `updateGameplay` en `update3D`, regels met een functie-aanroep; een ruwe maat voor het aantal per-frame-systemen).

| Tag | JS-bestanden | JS totaal KB | `main.js` KB | `scene3d.js` KB | imports `main.js` | `updateGameplay` aanroepen | `update3D` aanroepen |
|---|---|---|---|---|---|---|---|
| v0.54.0 | 910 | 12.049 | 55 | 195 | 205 | 114 | 211 |
| v0.56.0 | 929 | 12.242 | | | 209 | 115 | 215 |
| v0.57.0 | 930 | 12.249 | | | 210 | 115 | 215 |
| v0.58.0 | 985 | 12.700 | | | 213 | 115 | 216 |
| v0.60.0 | 996 | 12.836 | | | 213 | 115 | 217 |
| v0.62.0 | 1.032 | 13.364 | | | 223 | 135 | 224 |
| v0.63.0 | 1.048 | 13.517 | | | 224 | 135 | 224 |
| HEAD | 1.060 | 13.785 | 82 | 218 | 225 | 132 | 225 |

Lezing: +16% bestanden, +14% bronbytes, +53% `main.js`, +16% aanroepen in `updateGameplay`, +7% in `update3D`. Dat is geen drievoudige vertraging; de eigenlijke sprong zit in de vaste wachtbudgetten (A3), niet in de hoeveelheid code.

Wereldomvang: `game/world` wordt bij het bouwen gemaakt en staat niet in git; per tag is dus alleen te meten door een wereld te bouwen. Nu: 65 MB, `index.json` 58 stadstegels, `index-provincie.json` 2.978 provinciegetallen, 91 bestanden. Vergelijking met 0.54.0 niet gemeten (zie B).

## A3. Vaste opwarmbudgetten in `game/js/main.js` (HEAD)

| Constante | Waarde | Waar | Stopt eerder als |
|---|---|---|---|
| `START_WARM_MS` | 25.000 ms | startbuurt (320 m) en `ready`-promise (Ommeland, kaartbeelden) | 12 rustige frames met `streamPending`, `prewarmPending` en ready leeg |
| `INTRO_WARM_MS` | 70.000 ms | hele montage-voorrijden (alleen nieuw spel, `!world.loadedFromSave`) | tegels binnen, wachtrij leeg, prewarm klaar |
| `INTRO_TOUR_MS` | 35.000 ms | tien plekken op straathoogte, max 2,2 s of 70 frames per plek | per plek: `n > 8` en niets meer open |
| shaders | onbegrensd | `precompilePrograms()` na de warm-up | nooit; blokkeert synchroon |

Bovengrens in het laadscherm bij een trage machine: 25 + 70 + shadercompilatie. Op een snelle machine stoppen de lussen vroeg, maar de montage-tour tekent altijd minstens `10 x (8+ frames)` en de palette-draw/warm-samples kosten telkens frames met een shader-link.

Opmerking over de flow: er is geen titelmenu in de gewone start; `runBootScreen` -> `warmBeforeFinish` -> spel. Alle opwarmwerk staat dus tussen "Start" en "speelbaar".

## B. Metingen (19-11-2026, Windows, gedeelde machine, verse wegwerpprofielen)

Methode: gestagede builds uit `.scr`, Electron met `--stil --windowed`, `GDE_GAME_DIR`, een renderer-timer die elke 2 s `__loadMarks` en `renderer.info.programs` logt (`ELECTRON_ENABLE_LOGGING=1`). Let op: **elke geautomatiseerde run slaat het opwarmen over** (`WARM_START` is onwaar bij `noattract`, `stil`, `--smoke-test`, `--perf-script`); `loadcheck.mjs` en `run.mjs` meten dus het testpad, niet het spelerspad. Het spelerspad is gemeten met `?warm` (nieuw, `--url-flags=noattract,warm`) of met een staged `WARM_START = true` voor de oude budgetten. De machine deelde CPU met andere agents (de weg-agent); de spreiding tussen runs is groot, de orde van grootte niet.

| Build (wereld van HEAD) | Pad | Start tot speelbaar (`gameStart`) | Shaderprogramma's | Heap | Opmerking |
|---|---|---|---|---|---|
| v0.54.0 | n.v.t. | niet te meten | | | oude build leest de nieuwe wereld niet: kaartlaad 30 s en dan vast; een wereld van die tijd is niet bij de hand |
| v0.58.0 | test = speler (geen opwarm) | 17,0 s | 108 stabiel | 0,8 GB | geen vaste budgetten |
| HEAD voor de fix (25 s + 70 s) | spelerspad | **111,7 s** (startWarm 98,7 s, introTour 39 s, introPaletteDraw 31 s, slechtste warm-frame 1,96 s) | 157 na 20 s, 556 bij start, 582 later | 2,0 tot 2,8 GB in het laadscherm | 1 geldige run; een tweede werd door mij onderbroken |
| HEAD na 7faf1917d (15 s totaal) | spelerspad | 36,5 s (run 2; run 1 haalde de start niet binnen 100 s) | 126 na 20 s, 476 later | 0,9 tot 1,1 GB | introPaletteDraw 8,2 s en 2,5 s frame blijven |
| HEAD, alleen startbuurt-warm | spelerspad | 18,3 en 20,6 s | 201 stabiel | 0,85 GB | |
| HEAD, geen warm | testpad | 17,5 s | 100 stabiel | 0,75 GB | gelijk aan v0.58.0 |
| HEAD na deze fix (film-warm uit) | spelerspad | 20,2 s (run 1) | 107 bij start, **521 na 70 s** | 0,9 GB, piek 2,0 GB in de film | de film zelf bouwt ~420 programma's |

Niet gemeten: frametijd-norm op de routes a7 en stad (`norm_check`; de machine was niet stil genoeg en Electron-tijd ging op aan de laadpadmeting), de portable-exe tegen `win-unpacked`, een tweede en derde run per cel, profielen van v0.54.0. Frames boven 100 ms in de eerste 60 s van de film (zonder film-warm): 3 in run 1, 28 in run 2 (uitschieters 3,6 s en 2,5 s bij shotwissels, dus eerste-draw-links); met film-warm haalde de start geen enkele keer binnen 160 s het spel, dus daar is geen filmvergelijking.

CPU-profiel van een warm-run (80 s): 10,8% GC, 9,6% `WebGLUniforms` (three, uniformen per nieuw programma), 6,4% `(program)`, 15% idle; `warm` zelf 28% inclusief.

## Bevinding

De regressie die de speler merkt zit in **de pleisters zelf, en daarbovenop in de hoeveelheid programma's die de openingsfilm aanmaakt**, niet in het spel na de start: zonder opwarmen start HEAD even snel als v0.58.0 (17,5 s tegen 17,0 s, 100 tegen 108 programma's). Het opwarmen (film-tour, palette, samples) maakte er 36 tot 112 s van en blies programma's en heap 3 tot 5 keer op. De film bouwt daarna alsnog ~420 extra programma's (zichtbaar in `renderer.info.programs`: 107 -> 521 in 50 s, vooral `physical/STANDARD`-varianten, 135 verschillende sleutels met dezelfde eerste 60 tekens) en elk daarvan linkt bij zijn eerste tekening synchroon: dat zijn de haperingen van 2 tot 4 s. De oorzaak is dus het aantal materiaalvarianten, niet het gebrek aan voorwarmen.

## C. Herstel (gedaan)

| Commit | Wat | Gemeten effect |
|---|---|---|
| 7faf1917d | totale opwarmgrens 15 s (was 25 + 70 s), per montageplek 0,7 s | start 112 s -> 36 s (1 run) |
| 05efe3780 | film-warm (tour, palette, samples) standaard uit; `?warmfilm` voor A/B | start ~20 s, programma's bij start 107 (was 556), heap 0,9 GB (was 2-2,8) |
| (zie hieronder) | opening eerst (#986), `?warm` om het spelerspad te meten | zuivere test `openingstart_test.mjs` |

Prijs: de film krijgt zijn programma's niet meer voor het laadscherm, dus de shotwissels linken synchroon; dat is gemeten als 3 tot 28 frames boven 100 ms met uitschieters van 2,5 tot 3,6 s in de eerste 25 s van de film. Dat is de eerlijke afweging: laadscherm 20 s met een filmhapering, in plaats van 36 tot 112 s zonder.

## Symptoom, pleister, oorzaak, voorstel

| Symptoom | Pleister die het maskeert | Echte oorzaak (gemeten of afgeleid) | Voorstel |
|---|---|---|---|
| Laadscherm 36-112 s | START/INTRO-warm, tour, palette | het pleister zelf: 31 s palette-draw, 400+ extra programma's, 2-2,8 GB heap | film-warm uit (gedaan); `precompilePrograms` (+100 programma's, 0,5-9 s) volgende |
| Film hapert 2-4 s per shotwissel | warm, tour, `setHold*`, cine-batches, voertuigfasering | ~420 nieuwe programma's tijdens de film, 135 `physical/STANDARD`-sleutels: elke variant linkt synchroon bij eerste draw | varianten tellen en samenvoegen (gedeelde materialen of een vaste set lichtvarianten); daarna de cine-pleisters schrappen |
| Hoge heap in/na de film | `setHoldMaterials/Grass` | de film bouwt per plek eigen meshes en materialen | opruimen per shot; heap valt nu pas na de film terug (2,0 -> 0,9 GB) |
| Bijna alle `updateGameplay`-groei | | +18 aanroepen sinds 0.62 | per systeem meten, niet gedaan |
