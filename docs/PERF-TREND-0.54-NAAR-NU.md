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

## B. Metingen

Zie het eind van dit document (wordt ingevuld zodra Electron vrij is).

## C. Herstel

Zie het eind van dit document.
