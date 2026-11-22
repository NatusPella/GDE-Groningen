# Screenshotjacht (22-11)

Idee van de eigenaar: een proefbuild die tijdens missies, rondrijden, binnen en in de menu's willekeurig beelden maakt, op zoek naar issues. `scripts/screenshotjacht.mjs` bestuurt het echte spel in één Electron (wegwerpprofiel, nooit echte opslag) en legt per beeld vast waar, wanneer, met welk voertuig en welke camera, wat er in de console gebeurde en wat er op het scherm stond. Geautomatiseerde tripwires markeren verdachte beelden. **Niemand heeft de beelden bekeken**; de vlaggen zijn een voorselectie, geen oordeel.

## Draaien

```
node scripts/screenshotjacht.mjs --game=<gestagede game-map> [--seed=1] [--out=<map>] [--tijd=90] [--doel=600]
     [--delen=menu,binnen,verhaal,vrij] [--ids=<voorvoegsels>] [--chunk=16] [--plan] [--galerij]
```

- `--game` (of `GDE_GAME_DIR`, met backslashes) wijst een gestagede `game`-map met wereld aan. Zonder eigen wereld: `GDE_PREBUILT_WORLD=<map met world> GDE_STAGE_OUT=<map>/game node desktop/build.mjs` (80 s, zie het geheugen "eigen-js-stagen-met-prebuilt-wereld"). `ELECTRON_EXE` wijst een Electron aan als `desktop/node_modules` ontbreekt.
- **Seed**: `--seed=<n>` (standaard 1). Dezelfde seed geeft hetzelfde plan (`plan.json`: de plekken, tijdstippen, weersoorten, camera's, de volgorde van de winkels voor de interieurs). Het spel zelf is niet deterministisch (verkeer, voetgangers), dus de beelden zijn dat evenmin.
- **Uitvoermap**: standaard `desktop/build/jacht/seed-<n>` (gitignored). Elke map die Electron schrijft moet onder de werkmap liggen; op deze machine mocht Electron niet naar een map buiten de worktree schrijven (`EPERM` op `shots.png`).
- **Tijdslimiet**: `--tijd` minuten (standaard 90) en `--doel` beelden (standaard 600). De run stopt bij de eerste die gehaald wordt. `index.json` en `galerij.html` worden elke 30 s en na elk blok herschreven, dus een onderbroken run blijft bruikbaar. Een herstart met dezelfde uitvoermap gaat verder bij de stops die nog niet klaar waren.
- `--plan` schrijft alleen `plan.json`. `--galerij` bouwt `index.json` en `galerij.html` opnieuw uit de gebeurtenissen (zonder Electron). `--ids=vrij-26,verhaal-M06` draait alleen die stops.
- Volgorde: menu, binnen, verhaal, vrij verkennen (de lange, minst kwetsbare soort laatst).
- Geen poort 9000, geen geïnstalleerde app, geen `taskkill` op naam (alleen het eigen PID met `/T`). Twee instanties naast elkaar mogen met een eigen `--out` (de profielen staan per proces in `<out>/.profielen`).

## Wat er gebeurt

| Soort | Stops | Beelden per stop | Hoe |
|---|---|---|---|
| `verhaal` | alle 71 stappen van `storyarc_nieuw` (30 missies, 41 overige) | 3 (begin, midden, doel); missies 4 (eind) | `__story.jump(id)`, begin na 3,8 s, midden 7 s later (cutscenes lopen vanzelf), dan `__story.teleport()` naar het doel; bij missies `objective()` en `win()` voor de eindkaart |
| `vrij` | 41 plekken: 6 wijken, 11 dorpen, 6 gehuchten (boerderij), kust (Eemshaven, Lauwersoog, Zoutkamp, Termunterzijl, Delfzijl, Pieterburen), Bourtange, 3 plekken in het centrum, 3 bruggen, 3 stations | 6: drie tijdstippen (ochtend, middag, avond of nacht) x lopen en een voertuig | willekeurige camera (eerste persoon, derde persoon, hoog), weer helder, motregen, regenbui of mist; voertuig: auto, fiets, trekker (gehucht) of boot (als er water is); het voertuig rijdt 1,4 s met de echte W-toets |
| `binnen` | 1 stop, tot 15 betreedbare panden | 2 (derde en eerste persoon) | panden rond de winkels uit `getShopsForRender()`: `pinInterior` geeft het plan, de speler gaat naar de voordeur, wacht tot het interieur live is en zet zich bij de balie |
| `menu` | 1 stop | ca. 35 | radiomelding bij instappen (2 beelden), alle pauzemenu-onderdelen (Spel, Verhaal, Activiteiten, Loopbanen, Kaart, Spullen, Garage, Boerderij/Bezit, Veroverd, Prestaties, Foto's, Instellingen, Cheats) met hun tabbladen via de E-toets, kaart op drie zoomniveaus |

Niet gedaan: **Samen-situaties** (vereisen een tweede instantie), tram en trein (geen bestuurbare trein in de verkenner; stations zijn wel als plek opgenomen), kleding en tuning als eigen scherm (alleen als ze een tabblad in Spullen of Garage zijn).

Per beeld in `index.json`: `naam`, `bestand`, `soort`, `plaats`, `stop`, `pos`, `uur`, `weer`, `voertuig`, `missie`, `stap`, `camera`, `scherm`, `fps` (alleen informatief, gemeten over 0,5 s voor het beeld), `console` (waarschuwingen en fouten sinds het vorige beeld: NaN, undefined, 404, shaderfouten), `tekst` (zichtbare DOM-tekst, 700 tekens), `pixel` (zwart, transparant, magenta, gemiddelde helderheid) en `vlaggen`. Bestandsnaam: `<volgnr>_<soort>_<plaats>.jpg` (1280x720, JPEG 80).

## Tripwires (`scripts/lib/jacht_logic.mjs`)

Het hoofdproces (`desktop/devtools.js`, `console.log('[capture] jpg:<naam>')`) schrijft het JPEG en rekent de pixelcijfers uit. `samenvoegen()` koppelt console-regels aan het eerstvolgende beeld en `tripwires()` zet de vlaggen:

- `zwart` (meer dan 55% zwarte pixels), `donker`, `overbelicht`, `transparant` (meer dan 2%), `magenta` (meer dan 0,4% roze: ontbrekende textuur);
- `gelijk`: lijkt voor 98,5% op het vorige beeld van dezelfde stop terwijl er verschil verwacht werd (vastgelopen), op basis van een 16x9-vingerafdruk;
- `console`: een consoleregel met NaN, undefined, 404 / Failed to load, shader, WebGL, `THREE.` of een TypeError (bekende Electron-ruis telt niet);
- `fps-laag` (onder 3) en `fps-hoog` (boven 190): extreme waarden, geen meting;
- `tekst` (undefined, NaN of [object in de schermtekst), `foutmelding` (het spel toont zelf "Er ging iets mis"), `scriptfout`, `geenbeeld`.

De pure kant heeft een test: `node scripts/screenshotjacht_test.mjs` (nepdata: seed, namen, gelijkenis, elke vlag, samenvoegen, tellingen, galerij).

## Galerij

`<out>/galerij.html` is één pagina met alle beelden en hun metagegevens (gegevens ingebakken, werkt vanaf schijf): filter op soort, alleen verdacht, vlag, zoekveld; klik voor het grote beeld met pixelcijfers, console en schermtekst.

## Crashes en vastlopers

Elke Electron draait een blok stops (16 verhaalstappen, 8 plekken). Stopt Electron zonder resultaat, of komt er 150 s geen gebeurtenis, dan doodt het script alleen dat PID (`taskkill /PID <pid> /T`), schrijft de stop en de staart van het log in `crashes.md` en `events-*.jsonl` (`type: crash`), slaat die stop over en start een nieuw blok. Proef van het crashpad: `JACHT_TEST_CRASH=<stop-id>` herlaadt de pagina bij die stop.

## Resultaten van de eerste run

Zie het eind van dit bestand (door de uitvoerder ingevuld na de run).

## Wat dit niet is

Geen vervanging van `scripts/qa/sweep.mjs` (vaste plekken, automatische beoordeling per plek) en niet van de spelbot (die speelt de missies echt). De jacht kijkt breed en snel en laat een mens of een reviewer-agent de beelden beoordelen. Verdachte beelden worden issues met `bug` en `wacht-beeld` zolang geen mens het beeld zag (zie docs/TESTEN.md, Visuele sweep).
