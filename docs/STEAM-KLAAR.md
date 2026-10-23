# Steam-klaar: wat er staat en wat de eigenaar nog zelf moet doen

Issue #64. Alles hieronder is lokaal voorbereid. Er is niets naar Steam
gestuurd, er is geen Steam-account of app-id, en geen enkel bestand maakt
contact met Steam. `scripts/steam_test.mjs` controleert dat de bestanden in
deze lijst bestaan en bij elkaar passen.
De status per punt (klaar, open, eigenaar) staat in [STEAM-CHECKLIST.md](STEAM-CHECKLIST.md).

## 1. Wat al klaar staat in de repo

| Onderdeel | Bestand | Stand |
|---|---|---|
| SteamPipe-build | `steam/scripts/app_build.vdf` en `depot_build_windows.vdf`, `_mac.vdf`, `_linux.vdf`; `steam/make-build-vdf.mjs` vult de ids in | sjablonen met plaatshouders `APP_ID` en `DEPOT_ID_*`; de ingevulde kopie komt in `steam/output/vdf/` |
| Builds kopiëren | `steam/copy-builds.mjs` (`desktop/dist` naar `steam/content/<os>/`) | klaar; uitleg in `steam/README.md` |
| Steam Input | `steam/steam_input/game_actions_APP_ID.vdf` | 12 actiesets (lopen, rijden, zeilen, helikopter, duif, trein, minigame, beiaard, pannenkoekenschip, frituurwagen, menu), Nederlandse namen zonder merken; gegenereerd door `steam/make-steam-files.mjs` |
| Prestaties | `steam/achievements.json` | alle prestatie-ID's met lege `steamApiNaam`; gegenereerd, ook door `make-steam-files.mjs` |
| Steam Deck | `game/js/deck.js`, `desktop/preload.js` (`isSteamDeck`), `game/js/settings.js` | eerste start op de Deck: grotere tekst, controllerhints, Deck-knoppenindeling; eigen keuzes van de speler winnen |
| Leeftijd en inhoud | `docs/IARC-ANTWOORDEN.md`, `docs/LEEFTIJD.md` | conceptantwoorden |
| Winkelpagina | `docs/steam/winkelpagina.md`, `docs/steam/beelden/`, `docs/steam/trailer.md` | concepten in het Nederlands, zonder echte merken |
| Merken en licenties | `docs/MERKENCHECK.md`, `docs/MERKENREGISTER.md`, `docs/LICENTIES.md`, `NOTICE.md` | gecontroleerd voor de speltekst |

De twee gegenereerde bestanden werk je bij met `node steam/make-steam-files.mjs`
(controleren zonder te schrijven: `--check`).

## 2. Hoe het spel zich op de Deck gedraagt

- **Scherm:** 1280x800 (16:10). De HUD houdt daar de volledige indeling; de
  kleinste tekst is 13 apparaatpixels (`--hud-min` in `hud_panel.css`).
  Beelden: `node scripts/ui_shots.mjs --sizes=1280x800`.
- **Bediening:** alleen controller of aanraakscherm. Het spel leest de
  controller zelf (`gamepad.js`); de gewone Steam Input-sjabloon "Gamepad"
  werkt dus zonder eigen configuratie. Elk scherm is met de controller te
  bereiken (`scripts/padscreens_test.mjs`). Aanraakknoppen zijn er via
  `touch.js`.
- **Geen toetsenbord nodig voor het spelen.** Tekstvelden zijn er op vier plekken en
  geen ervan is nodig om het spel uit te spelen: de zoekbalk van de kaart, het
  zoekveld in Besturing, de naam van een save en de code om online samen te
  spelen. Daarvoor werkt het schermtoetsenbord van de Deck (Steam-knop + X); dat is
  nog niet op het apparaat geprobeerd.
- **Eerste start:** Electron start direct in het spel, zonder aparte launcher.
  Op de Deck staat het venster op volledig scherm.
- **Linux/Deck:** start Electron in de Steam Linux Runtime met een
  sandbox-fout, voeg dan `--no-sandbox` toe als startoptie van de
  Linux-lancering (`steam/README.md`). Test dit op het apparaat.

## 3. Wat de eigenaar zelf moet doen

Niets hiervan kan ik of een agent doen: het vraagt jouw account, geld of
besluit.

1. **Steamworks-account** aanmaken (partner.steamgames.com): identiteit,
   bank- en belastinggegevens invullen.
2. **Steam Direct-bijdrage** betalen ($100 per app, volgens de actuele
   Steamworks-pagina; controleer het bedrag daar) en wachten op de
   goedkeuring van het account.
3. **App aanmaken** en de **app-id** noteren. Vervang dan `APP_ID` in
   `steam/scripts/app_build.vdf` en hernoem
   `steam/steam_input/game_actions_APP_ID.vdf` naar
   `game_actions_<app-id>.vdf`.
4. **Depots** aanmaken (Windows 64-bit, macOS, Linux en SteamOS), de ids
   invullen op de plaatshouders `DEPOT_ID_WINDOWS`, `DEPOT_ID_MAC` en
   `DEPOT_ID_LINUX` in `app_build.vdf` en in de drie depotbestanden.
5. **Startopties** per besturingssysteem instellen (Installatie > Algemeen):
   `GDE Groningen.exe`, `GDE Groningen.app`, `gde-groningen`.
6. **Build-account** met alleen bouwrechten en Steam Guard, `steamcmd`
   installeren, eerst een voorbeeldrun (`"Preview" "1"`) en daarna een build
   op een bètatak; zelf live zetten.
7. **Steam Input** configureren: het actiebestand uploaden en per situatie een
   standaardindeling kiezen, of de sjabloon "Gamepad" laten staan.
8. **Prestaties** in Steamworks aanmaken (190 stuks, 21 verborgen), de
   API-namen in `steam/achievements.json` invullen (veld `steamApiNaam`) en
   daarna de koppeling in het spel laten bouwen (dat is nog niet gedaan:
   er is bewust geen Steam-bibliotheek in het spel).
9. **Leeftijds- en inhoudsvragen** zelf invullen (IARC en de Steam-inhoudsvragenlijst) met
   `docs/IARC-ANTWOORDEN.md` als concept; het zijn jouw antwoorden.
10. **Winkelpagina** invullen met `docs/steam/winkelpagina.md`: korte en
    lange beschrijving, tags, prijs (gratis), systeemeisen,
    ondersteunde talen (alleen Nederlands), controllerondersteuning, en
    de privacyverklaring (`docs/PRIVACY-EN-CREDITS.md`).
11. **Beelden en video** uploaden: capsules uit `docs/steam/beelden/`
    (gemaakt door `scripts/steam_images.mjs`), minstens vijf schermafbeeldingen
    van het echte spel (maak ze op 1920x1080 en op 1280x800), en de trailer
    volgens `docs/steam/trailer.md`.
12. **Deck-test op een echt apparaat** (of via een testbuild): starten vanuit de bibliotheek,
    controller, aanraking, leesbaarheid van tekst, geluid, opslaan. Daarna
    pas de Deck-status aanvragen.
13. **Publicatiebesluit**: releasedatum, wanneer de winkelpagina openbaar
    gaat, en akkoord op alles wat openbaar wordt (AGENTS.md, constitution 8).

## 4. Niet gedaan, bewust

- Geen Steamworks-SDK in het spel. Voor de overlay is er alleen de startoptie
  `--steam-overlay` (`desktop/steamflags.cjs`); die is met een echte Steam-client
  niet geprobeerd.
- Geen Steam Cloud-instelling; de opslagmap staat in `steam/README.md`
  (Auto-Cloud kan daarop wijzen).
- Geen automatische controle van het Deck-gedrag op echte Deck-hardware.
