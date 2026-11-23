# Video-QA 23-11: de eerste 15 minuten van een nieuw spel (deelopname)

**Status: deels.** De opname van 15 minuten is niet af. Er is een schone video van **1:30** (2.700 beelden van 1920x1080 @30 fps) en telemetrie tot 2:30 (4.500 beelden). Daarna is de opname gestopt, om twee redenen die buiten de code liggen: de machine was overbelast (CPU 100%, 1,4 GB van 16 GB vrij, vijf Electron-instanties van andere agents) en C: kwam onder de 45 GB-drempel van de coördinator (44 GB, door andere schrijvers). Het stoppen met een kill liet het tweede segment zonder index achter: verloren (daarom schrijft de opnametool nu fragmenten, zie "Opnieuw draaien"). Alles hieronder gaat dus over de eerste 1:30 en wat de telemetrie over 2:30 zegt. De bevindingen na 1:30 (missies, rijden, minigames) ontbreken. **Niet bekeken:** alles na 2:30, geluid (de opname heeft geen audio), de tutorialprompts na M01-begin, de eerste echte missie.

- Video (buiten git): `C:\Users\abuis\gde-videoqa\video-qa-23-11\seg01.mp4` (27 MB, H.264 crf 21)
- Pagina met de belangrijkste beelden (één bestand, afbeeldingen ingebed): [VIDEO-QA-23-11.html](VIDEO-QA-23-11.html)
- Gereedschap: `scripts/videoqa/` (zie onderaan)

## Hoe is er opgenomen

- De Spelbot (`scripts/bot`, menselijk profiel `--mens`: reactietijd, stuurruis, HUD-route, **geen cheats**, filmpjes volledig bekeken) speelt een nieuw spel (seed 1, wegwerpprofiel, `GDE_NIEUW_VERHAAL=1`).
- Vaste tijdstap, geen verloren beelden: de trailerinfrastructuur (`desktop --clip`, virtuele klok in `scripts/trailer/lib/clip.page.js`) draait het spel op 1/30 s per beeld; de timers van de bot lopen op dezelfde klok. Een beeld wordt pas opgenomen als het streamen rond de camera klaar is (maximaal 240 tussenbeelden). Daardoor **ziet de video geen laad-pop-in**; de wachttijden staan wel in de telemetrie (zie bevinding 8).
- Voorinstelling Hoog (de hoogste die bestaat: kwaliteit `hoog`, schaduwen, zichtafstand `heelver`, resolutie 100%), 1920x1080.
- Beeldtijd is **niet** speeltijd van een speler op een snelle pc: de wereld wacht op streamen.

## Wat de automatische analyse dekt

Bij 30 fps is "elk beeld" 27.000 beelden voor 15 minuten; hier zijn het er 2.700 gedekt (video) en 4.500 (telemetrie). `scripts/videoqa/analyse.mjs` bekijkt **elk** beeld: helderheid (zwart, egaal, wit, flikkering als sprong die terugkeert of oscillatie), verschil met het vorige beeld in 32x18 tegels (snede, stilstaand beeld, pop-in als een tegel in één beeld springt en terugvalt), en per beeld de rekentijd, de tussenbeelden voor streamen en de console (NaN, fouten).

Uitkomst over de 2.700 beelden van seg01:

| Controle | Uitkomst |
|---|---|
| Zwarte beelden | 0 |
| Egale/lege beelden | 0 (beeld 0 is wel egaal cremewit, zie 6) |
| Flikkering (helderheidssprong die terugkeert, oscillatie) | 0 |
| Harde sneden | 25 (alle filmpjesovergangen en de overgang filmpje naar spel; geen onbedoelde) |
| Stilstaande beelden | 355 identieke beelden in 4 reeksen van 12 of meer (alle in dialoog, filmpje of stilstaande kaders; verwacht) |
| Pop-in kandidaten | 107; bij nazien allemaal bewegende personages, HUD-fades en sneden, geen echte pop-in. De opname verbergt pop-in juist door te wachten |
| NaN in console | 0; wel 1x `simulation worker unavailable, running on the main thread` (zie opmerking) |
| Rekentijd per beeld (speltijd, 4.500 beelden) | mediaan 39 ms, p95 106 ms, p99 288 ms: **niet representatief**, de machine was overbelast |

Opmerking: de waarschuwing over de simulatieworker kwam in deze omgeving met `--no-sandbox --in-process-gpu` (nodig op deze pc na de herstart); of een gewone start hem ook geeft, is niet gemeten.

## Bevindingen, gerangschikt (ernst, dan tijd)

Beeldnummer = tijd x 30. Alle bevindingen zijn **gezien in de video**, tenzij anders vermeld. Waarschijnlijke code is een aanwijzing, niet gecontroleerd tot op de regel.

| # | Ernst | Tijd | Beeld | Bevinding | Waarschijnlijke code |
|---|---|---|---|---|---|
| 1 | midden | 1:15,5 | 2262 tot 2280 | **Tammo en Tessa lopen door de Escapade** bij het instappen: lichaam en benen dwars door deur en zijkant; Tessa's benen steken door de carrosserie. De rode instapmarkering loopt onder het voertuig door. Het label "Jouw ouwe Escapade, Loop erheen, dan E" staat nog in beeld terwijl de speler al bij de deur staat. | `game/js/companion.js` (metgezel naar voertuig, ca. r. 700-860, `pushCircleOutOfVehicle`), `game/js/prompts.js:493` |
| 2 | midden | 0:18,4 | 551 tot 579 | **Hoofd valt uit beeld** in het keukenshot "Mol. De bank?": camera dichtbij en laag, alleen borst en kin zichtbaar terwijl Tammo praat. | `game/js/openingfilm.js` (shotlijst), `game/js/cineshots.js` |
| 3 | midden | 2:00 tot 2:30 | 3600 tot 4500 | **Streamen loopt achter tijdens rijden**: 283 van 900 beelden moesten wachten (te voet en in filmpjes: onder 1,2%), één beeld haalde de maximale wachttijd. Een speler ziet dat als haperingen of ophopende gebouwen. Rijden is met 22 m/s een zwaarder streampad dan lopen. Gemeten onder zware belasting van de machine, dus de omvang kan overdreven zijn; de richting (rijden tegen lopen) is wel duidelijk. | `game/js/scene3d.js` (`streamPending`, `prewarmStreamAt`), `game/js/geojobs.js` |
| 4 | laag | 0:15,3 | 459 tot 462 | **Tammo komt uit een pikzwart gat de keukendeur door als zwevende delen**: de deur opent naar een egaal zwart vlak, donkere broek en benen vallen weg tegen het zwart; eerst een los kopje, dan pet, romp en hand. | `game/js/openingfilm.js` (shot `c1-deur`, Zolderkeuken); interieur en licht achter de deur |
| 5 | laag | 0:24,0 en 0:58,1 | 720, 1744 | **Tessa's haar is een hard zwart vlak voor haar gezicht** in de close-ups: bedekt een oog en de wang. | `game/js/characters.js` (haarmodel), close-up in `openingfilm.js` |
| 6 | laag | 0:00 | 0 tot 2 | **Eerste beelden**: beeld 0 egaal cremewit (laadscherm), beeld 1 vaal grijsgroen, dan fade naar de keuken (ca. 4 s). Lijkt op een flits. | `game/js/loadscreen.js`, `game/js/openingstart.js` |
| 7 | laag | 0:36 en 0:52 | 1080, 1560 | **Hand of onderarm klipt in Tammo's mouw** bij het gebaar; losse blokvorm steekt uit de mouw. | `game/js/characters.js` / actoranim (gebaarpose) |
| 8 | laag | 1:03,7 | 1911 tot 1914 | **Ondertitel en overslaanhint overlappen** tijdens de crossfade filmpje naar spel (ca. 4 beelden). | `game/js/cinesub.js`, `game/js/cinematics.js` |

Gecontroleerd en **geen** bevinding: de eerste regel van de tip-kaart "Tessa: De club hier in de buurt..." lijkt in de contactvellen afgekapt, maar is op 1920 breed heel (alleen de fade-in).

Positief: de keukenscène leest als intentioneel (kleur, schaduw, ondertitels per spreker kloppen met de beelden, Nederlands, "Grunn"); geen enkele flikkering of zwarte flits in 90 s; de HUD (minikaart, wijkkaart, snelheid, routekaart) staat zonder overlap.

## Issue-voorstellen (niet aangemaakt)

Geen van de bevindingen was een duidelijke éénregelfix; er is daarom geen game-code gewijzigd.

1. `bug`, impact-midden, kosten-M: metgezellen botsen met het voertuig bij het instappen (1) en het hint-label verdwijnt niet als de speler al bij de auto staat.
2. `bug`, impact-midden, kosten-S: kaderkeuze keukenshot (2): minimale afstand of hoofdruimte-regel in `cineshots.js`.
3. `bug`, impact-laag, kosten-S: de deur van de zolderkeuken laat zwart zien (4): licht of een gang achter de deur, of de deur later openen.
4. `bug`, impact-laag, kosten-M: haarmodel Tessa (5) en handpose Tammo (7).
5. `wens`, impact-midden, kosten-L: stream-ahead bij hoge snelheid (3): meet met de meetvlag `?hitch` op een schone machine.

## Opnieuw draaien (voor de coördinator)

De volledige 15 minuten kosten op een rustige machine naar schatting 1,5 tot 2 uur (gemeten tussen 1 en 6 beelden per seconde, afhankelijk van belasting). Voorwaarden: één Electron tegelijk, minstens 4 GB RAM vrij, schijf boven 45 GB.

```bash
# 1. game met wereld stagen (zoals scripts/trailer/README.md)
GDE_PREBUILT_WORLD=<ander>/desktop/build/game/world GDE_STAGE_OUT=<map>/game node desktop/build.mjs
# 2. opnemen; uitvoer binnen de worktree (Electron mag hier alleen daar schrijven: .tmp-qa), niet committen
GDE_ELECTRON_FLAGS="--no-sandbox --in-process-gpu" node scripts/videoqa/opname.mjs --out=.tmp-qa/run1 --game-dir=<map>/game --seconds=900
# 3. analyseren en contactvellen
node scripts/videoqa/analyse.mjs .tmp-qa/run1
node scripts/videoqa/sheets.mjs .tmp-qa/run1 --step=2
```

Valkuilen die hier zijn tegengekomen:

- Electron mag op deze machine niet in `%TEMP%` of een map buiten de worktree schrijven (EPERM, "Lock file can not be created"): zowel het profiel als de uitvoer moeten onder de worktree staan (`.tmp-qa/`, niet committen).
- Na een pc-herstart start Electron alleen met `--no-sandbox`.
- Een kill van de opname verliest het lopende segment als het een `+faststart`-mp4 is. `desktop/clipvideo.js` kent nu `frag: true` (fragmentierde mp4, leesbaar na een kill); de opnamestap gebruikt dat.
- Meerdere Electron-vensters staan allemaal op (0,0): een venster dat bedekt wordt kan stoppen met `requestAnimationFrame`. De driver geeft daarom `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows` en `--disable-features=CalculateNativeWinOcclusion` mee.

## Gereedschap (`scripts/videoqa/`)

| Bestand | Wat |
|---|---|
| `opname.mjs` | driver: bouwt het paginascript (bot-vensters, `bot.page.js` als functie, trailerbibliotheek), neemt een slot en start Electron |
| `opname.page.js` | pomp op de virtuele klok, segmenten van 90 s, telemetrie per beeld en per halve seconde |
| `analyse.mjs` | automatische analyse van elk beeld en de telemetrie; schrijft `analyse.json` |
| `sheets.mjs` | contactvellen 3x4 (JPEG ~85) van een steekproef en alle kandidaten; losse beelden |
| `pagina.mjs` | bouwt één HTML-pagina met ingebedde beelden uit een bevindingenlijst |
