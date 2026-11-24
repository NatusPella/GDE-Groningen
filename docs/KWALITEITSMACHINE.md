# Kwaliteitsmachine

Epic 'Kwaliteitsmachine' (branch `kwaliteitsmachine-23-11`). Vier onderdelen die samen één vraag beantwoorden: ziet het spel er na deze wijziging nog net zo goed uit, en wat moet een mens bekijken?

1. **Eén Electron-runnerbibliotheek** voor alle beeldscripts: `scripts/lib/electronrunner.cjs`.
2. **Beeldregressie op vaste camerapunten**: `scripts/kwaliteit/beeldregressie.mjs`.
3. **Video-QA als één commando**: `scripts/videoqa/run.mjs --minuten=30`.
4. **Eindrapport** voor de coördinator: `scripts/kwaliteit/eindrapport.mjs`.

Zie ook [TESTEN.md](TESTEN.md) (hoe dit naast de andere tests staat) en [RELEASEGATE.md](RELEASEGATE.md) (de stap "beeldregressie bekeken").

## Snel

```
# status van de sloten en de machine (start niets)
node scripts/lib/electronrunner.cjs --status

# beeldregressie: beelden maken, vergelijken, rapport
node scripts/kwaliteit/beeldregressie.mjs --run --out=%USERPROFILE%\gde-qa\regressie-<datum> --game-dir=<gestagede game>
# na keuring: deze beelden worden de referentie
node scripts/kwaliteit/beeldregressie.mjs --ververs --out=%USERPROFILE%\gde-qa\regressie-<datum>

# video-QA van een half uur (hervat vanzelf als je hetzelfde commando nog eens geeft)
node scripts/videoqa/run.mjs --minuten=30 --game-dir=<gestagede game>

# alles in één pagina
node scripts/kwaliteit/eindrapport.mjs --regressie=<regressiemap> --videoqa=<videoqamap> --uit=%USERPROFILE%\gde-qa\eindrapport.html
```

Een gestagede game zonder eigen wereldbouw: `GDE_PREBUILT_WORLD=<map met index.json> GDE_STAGE_OUT=<map>\game node desktop/build.mjs`. `ELECTRON_EXE` als de worktree geen `desktop/node_modules` heeft (de runner probeert ook de hoofdmap).

## 1. De runnerbibliotheek (`scripts/lib/electronrunner.cjs`)

CommonJS, zodat zowel Node-scripts (`import R from '../lib/electronrunner.cjs'`) als scripts die zelf het Electron-hoofdproces zijn (`require`) hem gebruiken. Gebruikt door `scripts/videoqa/opname.mjs`, `scripts/qa/personen_beeld.cjs` en `scripts/kwaliteit/beeldregressie.mjs`; nieuwe beeldscripts gebruiken hem ook.

| Wat | Hoe |
|---|---|
| Wegwerpprofiel | `prepareRunDir(out)` maakt `<out>/profiel-<pid>` en `<out>/_tmp`; `electronEnv()` zet `GDE_TEST_PROFILE`, `TEMP`, `TMP` en `TMPDIR` daarheen. Een uitvoermap in de systeem-temp wordt geweigerd (Electron kan daar op deze machine niet altijd schrijven). |
| `ELECTRON_RUN_AS_NODE` | Altijd weg uit de omgeving van het kind; anders start `electron.exe` als kale Node. |
| `--no-sandbox` | Standaard aan (`runElectron({ noSandbox: false })` laat hem weg). **In de agentomgeving crasht Electron zonder deze vlag al bij het starten met exitcode 3**, zelfs `electron.exe --version`; met `--no-sandbox` werkt het (gemeten 23-11: v45.2.3, exit 0). Stopt Electron toch binnen 30 s met exitcode 3, dan schrijft de runner de regel `sandbox: Electron stopte binnen 30 s met exitcode 3; start met --no-sandbox` en geeft `sandbox: true` terug. Wie Electron met de hand start (`electron.exe scripts/qa/personen_beeld.cjs`), zet `--no-sandbox` zelf op de opdrachtregel: in het script is het te laat. |
| Nooit een dialoogvenster | `guardMainProcess({ app, dialog, log })` in een Electron-hoofdproces: `uncaughtException` en `unhandledRejection` worden gelogd en stoppen het proces met code 1; `dialog.showErrorBox` (en `showMessageBox`) schrijven naar het logboek. `desktop/devtools.js` doet hetzelfde voor het spel zelf in een testrun. |
| Logboek met hartslag | `makeLog(out)` schrijft regels met tijd naar `<out>/run.log`; `runElectron` schrijft elke minuut `hartslag <n> min: pid, regels, laatste regel` en vernieuwt dan ook het slot. Een stil logboek is dus een vastgelopen run. De uitvoer van Electron zelf staat in `<out>/electron.log`. |
| Slot | `~/gde-locks/electron-1..3` (of `GDE_LOCKS`), met `mkdir`. **Alleen `EEXIST` betekent bezet**; elke andere fout (EPERM in een afgeschermde sessie, EACCES, een schijf die weg is) is een `RunnerFout` met code `SLOT` of `SLOT_MAP` in plaats van eindeloos wachten. Elk slot krijgt `eigenaar.json` (pid, machine, label, start, hartslag). `exclusive: true` wacht tot alle sloten vrij zijn (fps-metingen, het personagesbeeld); `maxOthers` bepaalt hoeveel anderen er tegelijk mogen draaien. Vrijgeven gebeurt altijd (ook bij een fout, Ctrl+C of tijdslimiet) en alleen als het slot nog van ons is. |
| Stale sloten | Opgeruimd vóór elke poging: een eigenaar-PID op deze machine die niet meer leeft, of geen teken van leven (hartslag, anders start, anders de map zelf) langer dan `GDE_LOCK_STALE_HOURS` (standaard 6 uur). Een slot van een ouder script zonder `eigenaar.json` valt alleen onder de leeftijdsregel. `node scripts/lib/electronrunner.cjs --opruimen` doet het met de hand. |
| Stille machine | `waitQuiet({ maxCpu: 0.25, minFreeGB: 4 })` wacht tot drie metingen achter elkaar onder de CPU-drempel en boven het vrije geheugen zitten; `runElectron({ quiet: { ..., required: true } })` weigert met `ONRUSTIG` als dat niet lukt. Bedoeld vóór fps-metingen (de beeldregressie en de video-QA lopen met een vaste tijdstap en hebben hem niet nodig). Met de hand: `node scripts/lib/electronrunner.cjs --wacht-stil`. |
| Tijdslimiet | `timeoutMin`: daarna stopt de runner zijn eigen kind en diens kinderen (`taskkill /PID <eigen pid> /T /F`, nooit op naam). |

Exitcodes die de scripts aanhouden: 0 klaar, 1 fout, 2 verkeerd gebruik, 3 geen slot, 4 Electron niet te starten.

`scripts/qa/personen_beeld.cjs` komt van de branch `personages-aaa-23-11`; bij het mergen van die branch geeft dit bestand een add/add-conflict: neem de versie van `kwaliteitsmachine-23-11`. Hij heeft `scripts/qa/personen_beeld.html` van die branch nodig.

## 2. Beeldregressie op vaste camerapunten

`scripts/kwaliteit/camerapunten.json` beschrijft elf punten op **1920x1080**: twee beelden uit het openingsfilmpje (op 2 s en 13 s), de stad van boven, de Grote Markt, de Martinitoren, het appartement van Tammo en Tessa (House of Groningen, Paddepoel), de garage (pauzemenu), de kaart (zoom 3 rond de Martinitoren), de HUD tijdens het rijden (Escapade, stilstaand), de minikaart (uitsnede van de HUD) en het laadscherm. `--lijst` toont ze.

**Deterministisch.** Eén Electron in `--clip`-modus (het venster is precies 1920x1080, zonder rand), `--autoplay=<seed>` (Math.random met vaste seed, opslag alleen in het geheugen), klok en weer vast (`klok`, `weer`), de wereld alleen via de vaste tijdstap van `scripts/trailer/lib/clip.page.js`, en een beeld pas als het streamen rond de camera klaar is plus een vast aantal beelden. Voertuigen rond het doel worden weggehaald; wat dan nog beweegt (voetgangers, water) vangen de drempels op.

**Referenties buiten git.** `--ref=<map>`, anders `GDE_BEELDREF`, anders `~/gde-beeldreferentie/camerapunten/<formaat>/` (op de machine van de eigenaar: `C:\Users\<naam>\gde-beeldreferentie\camerapunten\1920x1080\`). Elf PNG's van 1920x1080 zijn samen zo'n 30 MB per keer verversen; daarom niet in git. `bron.json` daar zegt per punt wanneer en van welke commit de referentie komt. Alleen `--ververs` schrijft daar, en alleen na keuring van het beeld.

**Perceptuele diff** (`scripts/kwaliteit/perceptdiff.mjs`, puur). Beide beelden gaan naar 1/4 schaal (gemiddeld per vak, wat anti-aliasing en een halve pixel verschuiving dempt); per blok van 8x8 (32x32 echte pixels) de SSIM van de helderheid en het gemiddelde kleurverschil. Een blok is slecht onder `blokSsim` (0,75) of boven `blokKleur` (24 van 255). Een punt is groen als de gemiddelde SSIM minstens `minSsim` is (standaard 0,90) en hooguit `maxSlecht` van de blokken slecht is (standaard 2 procent). Elk punt kan een eigen `drempel`, `maskers` (rechthoeken in fracties die niet meetellen) en een `regio` hebben; de minikaart meet zijn regio in de pagina (`regioVanPagina`). Een andere beeldmaat is altijd een afwijking.

**Rapport.** `<out>/rapport.html`: één pagina met een tabel (staat, SSIM, aandeel slechte blokken, drempel, reden) en per punt referentie, nieuw beeld en diff naast elkaar (rood: slecht blok, oranje: twijfel, blauw: masker). De beelden staan als relatieve links in `<out>/ref`, `<out>/nieuw` en `<out>/diff`, dus de map is los te bekijken. `vergelijking.json` heeft dezelfde cijfers.

Staat per punt: `gelijk`, `afwijking`, `geen-referentie` (alleen een melding; `--streng` maakt er een fout van), `ontbreekt` (geen nieuw beeld) of `fout` (de pagina meldde een fout, bijvoorbeeld "geen openingsfilmpje actief"). Exit 1 bij een afwijking, een ontbrekend beeld of een fout.

Naast deze wereldpunten blijft `scripts/ui/beeldregressie.mjs` (#994) de regressie per UI-scherm in drie formaten met referenties in `docs/beeldreferentie/`.

## 3. Video-QA als één commando

`node scripts/videoqa/run.mjs --minuten=30` neemt een half uur spel op terwijl de Spelbot (menselijk profiel, geen cheats) een nieuw spel speelt, met een vaste tijdstap (er valt geen beeld weg, hoe druk de machine ook is). Daarna per deel:

- **frame-analyse** (`scripts/videoqa/analyse.mjs`): zwart, egaal en wit beeld, flikkering (sprong en oscillatie), sneden, stilstaand beeld, pop-in (een tegel die in één beeld oplicht), haperingen (rekentijdpieken en beelden waarop het streamen moest wachten), instortend tekenwerk, stilstand van de speler buiten filmpjes, console- en NaN-regels, en **tekst-overlap**: de opname meet elke 2 s met `ovScan` uit `scripts/qa/overlap.page.js` overlappende, afgekapte en onder een filmpje zichtbare HUD-vlakken;
- **contactvellen** (`scripts/videoqa/sheets.mjs`): een beeld per `--stap` seconden plus de beelden rond elke kandidaat, 3x4 per vel;
- **rapport**: `<out>/rapport.html` (het eindrapport met alleen de video-QA) en `samenvatting.json`.

**Hervatbaar in segmenten.** De opname is verdeeld in delen van `--deel-minuten` (standaard 10): elk deel is een eigen Electron-run met een eigen seed en schrijft segmenten van `--seg` seconden (standaard 90). `run-state.json` houdt de stand bij. Wordt een run onderbroken (slot weg, Ctrl+C, crash), dan geeft hetzelfde commando met dezelfde `--out` het vervolg: wat al op schijf staat telt mee, een volgend deel neemt de rest op, en klare analyses en vellen worden overgeslagen. Twee delen achter elkaar zonder beelden, of `--max-pogingen` (8) delen: dan stopt hij in plaats van eindeloos te herstarten.

Standaarduitvoer `~/gde-qa/videoqa-<JJJJMMDD>`; een half uur 1080p is 1 tot 3 GB. Vóór elk deel controleert de pijplijn de vrije ruimte (`--min-vrij-gb`, standaard 60, zodat C: boven 50 GB blijft) en stopt met exit 5 als het te krap is. `--alleen-analyse` slaat het opnemen over, `--opnieuw-analyse` doet analyse en vellen opnieuw.

De losse stappen blijven bestaan (`opname.mjs`, `analyse.mjs`, `sheets.mjs`, `pagina.mjs` voor een bevindingenpagina zoals [VIDEO-QA-23-11.md](VIDEO-QA-23-11.md)).

## 4. Eindrapport

`node scripts/kwaliteit/eindrapport.mjs --regressie=<map> --videoqa=<map> [--uit=<html>]` zet alles in één pagina: kopregels per onderdeel (ok, bekijken, actie of niet gedraaid), de beeldregressie met voor/na/diff van alleen wat afwijkt of nieuw is, de video-QA per deel (cijfers, kandidaten per soort met tijden, contactvellen) en de runnerlogboeken met het aantal hartslagen en de laatste regels. Wat niet gedraaid is, staat er als "niet gedraaid": nooit stil groen.

## Releasegate: beeldregressie bekeken

Na het bekijken van het rapport schrijft de coördinator `release/beeldregressie-bekeken.json`:

```json
{ "datum": "2026-11-23", "status": "akkoord", "afwijkend": 0, "rapport": "C:/Users/<naam>/gde-qa/regressie-20261123/rapport.html" }
```

Status `akkoord`, `afwijkingen verwerkt` of `referentie ververst`. `node scripts/release_gate.mjs --verify` toont de regel `beeldregressie_bekeken`; ontbreekt het bewijs, is het ouder dan 14 dagen, of staat er `akkoord` met afwijkingen, dan komt er een `let op`-regel. **De stap blokkeert (nog) niet**: de camerapunten hebben nog geen gekeurde referenties. Logica en test: `scripts/release/beeldregressiebekeken.mjs`, `scripts/kwaliteit_rapport_test.mjs`.

## Tests

Puur, zonder Electron, wereld of netwerk (draaien mee in `run_tests.mjs`):

```
node scripts/electronrunner_test.mjs          slotlogica, stale-detectie, EEXIST tegen andere fouten, stille machine, runner-foutpaden (node als kind)
node scripts/kwaliteit_beeldregressie_test.mjs perceptuele diff, drempels, maskers, regio, vergelijking per punt en rapport
node scripts/kwaliteit_rapport_test.mjs        hervatten in delen, eindrapport, releasegate-stap
```

## Wat nog niet gedraaid is (eerlijk)

Stand 23-11: de Electron-kant van de beeldregressie (`--run`) en van `run.mjs` is nog niet op deze machine gedraaid; er zijn dus nog geen referenties. Of elk camerapunt het bedoelde beeld geeft (de Grote Markt en het appartement zijn ten opzichte van een landmark of het thuispunt gekozen, niet op beeld gecontroleerd) moet de eerste run laten zien; stel `cam`, `kijk` en de drempels dan bij in `camerapunten.json`.
