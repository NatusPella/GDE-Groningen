# AAA-oppimp van de wereld: bevindingen en stand (23-11)

Doel: de omgeving zichtbaar naar AAA-niveau tillen zonder de 60 fps van Ultra aan te tasten. Altijd zomer (constitution 3). Gemaakt door een agent op branch `wereld-aaa-23-11`; de perf-agent heeft `gfxprofile.js`, `scene3d.js` (zichtafstand, mist) en `farlod.js`: daar is alleen één regel in `scene3d.js` aangeraakt (een extra argument).

## Wat er al stond (niet opnieuw gedaan)

Negen-standen dag-nachtcurve met monotone interpolatie, hemelkoepel met zon, maan, sterren en regenboog, PMREM-omgeving, nat wegdek met plassen, regen, mist, onweer, bloom, grading, vignet, lantaarns en ramen, water met schuim, kroos, kielzog, spiegelende skyline en nachtlichten. Zie `docs/WEER-LICHT-AUDIT-20-11.md`.

## Gerangschikte bevindingen

| # | Wat | Waarom | Impact | Kosten | Stand |
|---|---|---|---|---|---|
| 1 | **Wolken**: 22 witte laagpoly-icosaëders, plat en plastic, zonder zonlicht, schaduwkant of dekking | Hemel is het eerste wat een speler ziet in elke buitenscène, en alle dag-, weer- en zonsondergangsbeelden steunen erop | Zeer hoog | S (twee tot drie texturelezingen) | Gedaan |
| 2 | **Water spiegelt geen wolken**: alleen een verloop plus skyline | Het water leest daardoor als een gekleurd vlak; wolken in de rimpels geven direct diepte | Hoog | XS (hergebruik van #1) | Gedaan |
| 3 | Zonszijde-nevel (dampkring die richting de zon verbleekt en opwarmt) op gebouwen en terrein | Diepteperspectief; vraagt een gedeelde uniform in alle materialen of een wijziging aan de fogchunk | Hoog | M, risico op alle materialen | Niet gedaan |
| 4 | Lichtstralen (godrays) en zonnelensflare | Alleen met een extra pass; audit 20-11 houdt die bewust uit | Middel | M en fps | Niet gedaan |
| 5 | Wind in vegetatie (bomen, riet, gras) | `grass.js` is groot; geen meting gedaan | Middel | M | Niet bekeken |
| 6 | Schuim/golven op zee en Wad, reflecties op nat asfalt (SSR) | Zee heeft al `uSea`; SSR is te duur voor Ultra op 60 fps | Middel | L | Niet gedaan |

Alleen nummer 1 en 2 zijn uitgevoerd: ze bleken de grootste winst per milliseconde. De rest is onderzocht op papier, niet gebouwd.

## Wat er is gebouwd

- `game/js/cloudnoise.js`: pure, naadloze ruistextuur (256x256, vier kanalen, vast zaad), eenmalig 47 ms bij het opstarten.
- `game/js/cloudsky.js`: GLSL en uniformen. Een wolkenvlak wordt met een perspectiefdeling geprojecteerd; dichtheid uit twee bemonsteringen; belichting uit een derde, een stap richting de zon (staat daar dikkere wolk, dan ligt dit stuk in de schaduw); zilveren randen richting de zon; verdwijnt aan de horizon in de dampkring. Een gesloten dek (onweer) krijgt reliëf uit de ruis zelf. Geen lus, geen toewijzing per frame; op `laag` valt de schaduwtik (de derde lezing) weg.
- `sky3d.js`: de koepel tekent de wolken over zon, maan en regenboog. `water3d.js`: het water spiegelt dezelfde wolken (`WATER_Q > 0`). `cloud3d.js`: zet bedekking (uit `cloudState`, dus weer en dag-nacht), tint (warm bij zonsondergang, donker in de nacht), wind en alfa; de oude blokjeswolken blijven alleen als terugval als er geen wolkenuniformen zijn.
- Tests: `scripts/cloudnoise_test.mjs` (nieuw), `cloudlook_test.mjs` (blijft groen).
- Beeldtool: `scripts/weer/sky_shots.mjs` en `sky_shots.page.html`: echte hemel-, wolken- en watercode in een wegwerp-Electron met voor (origin/main) en na, onder een slot uit `gde-locks`, geen netwerk. In deze omgeving start Electron alleen met `--no-sandbox` (`GDE_NO_SANDBOX=1`) en een eigen `GDE_TMP`.

## Meting

RTX 3060, 1280x720, hemel plus 2400x2400 m water plus 70 blokken, per frame gemeten met een GPU-sync, 80 frames. Twee andere Electrons draaiden mee, dus dit is een bovengrens.

| Scène | voor (ms) | na (ms) |
|---|---|---|
| helder 13 u | 0,21 | 0,32 |
| bewolkt 13 u | 0,18 | 0,28 |
| onweer 15 u | 0,19 | 0,22 tot 0,60 (ruis) |
| zonsondergang 21 u | 0,21 | 0,24 |
| nacht 1 u | 0,21 | 0,23 |

Eerdere run: 0,16 tot 0,20 voor, 0,19 tot 0,23 na. Dus ongeveer +0,03 tot +0,1 ms bij 720p; de hemel is een schermvullende pass, dus op 4K ruwweg x9 (ten hoogste ca. 1 ms). Dat past binnen het budget van 16,7 ms, maar is **niet gemeten in het echte spel** op Ultra.

## Samen spelen

Puur lokaal beeld: de wolken volgen weer en klok, die al gezamenlijk zijn (`coopweer.js`, `net/speelklok.js`). Geen netwerkbericht, geen beloning, geen voortgang. Elke speler ziet dezelfde bedekking, de windverschuiving is lokaal.

## Niet gezien of niet gemeten

- In het echte spel (met stad, bloom, grading en vignet) niet bekeken: de beelden komen uit een testpagina met de echte hemel-, wolken- en watercode, zonder nabewerking en zonder gebouwen.
- Fps in het spel op Ultra niet gemeten.
- Regen en bliksem samen met de nieuwe wolken niet bekeken.
- Android en `laag` niet bekeken (alleen de code-tak).
- De bewegende wind van de wolken is alleen uit stilstaande beelden en de code beoordeeld.
