# Steam-checklist (#64): per punt klaar, open of eigenaar

Stand 24 oktober 2026 (nagelopen tegen versie 0.47.0; eerste versie van 20 oktober). Alles is lokaal voorbereid, op besluit van de eigenaar
("alles lokaal voorbereiden"): er is niets naar Steam gestuurd, er is geen
account of app-id, en geen enkel bestand in de repo maakt contact met Steam.
`scripts/steam_test.mjs` bewaakt de bestanden en scripts hieronder.
Wat er staat en hoe het zich op de Deck gedraagt: [STEAM-KLAAR.md](STEAM-KLAAR.md).

Betekenis van de status:

- **klaar**: gedaan en gecontroleerd; het bewijs staat erbij.
- **open**: iets wat een agent of de coördinator nog kan doen, of een keuze in de code.
- **eigenaar**: alleen de eigenaar kan het (account, geld, besluit, echt apparaat).

## 1. Steam-regels nagelopen

| Punt | Status | Toelichting |
|---|---|---|
| Leeftijd: 18+ (verwacht PEGI 18 / USK 18) | klaar | `docs/LEEFTIJD.md` en `docs/IARC-ANTWOORDEN.md` kloppen met het spel (bloed en ledematen aan, burgers en agenten kunnen sneuvelen, kraskaarten met spelgeld, alcohol). Steam kent zelf geen PEGI-label: de leeftijd komt uit de eigen inhoudsvragenlijst; PEGI/USK volgen uit IARC. De antwoorden invullen doet de eigenaar. |
| Inhoudsbeschrijving voor de winkelpagina | klaar | `docs/steam/winkelpagina.md`, sectie "Inhoud en leeftijd". 20 okt: de merknaam van een ander spel eruit, en de regel "Niemand gaat dood" (die klopte niet meer sinds 18+) vervangen door een eerlijke regel. |
| Winkelpagina klopt met het spel | klaar | 24 okt nagelopen: 217 prestaties, 22 verborgen (stond op 102, later 190), "Singleplayer en offline" noemt nu ook samen spelen (kamercode, toestemming, geen tekstchat), en de controllermerken zijn weg. |
| Geen echte merken of personen op de winkelpagina | klaar | De pagina noemt geen andere spellen, uitgevers of controllermerken. De disclaimer noemt bewust geen namen. |
| Geen echte merken of personen in de speltekst | **open** | Sinds #72 is de disclaimer één tekst (README, NOTICE en het Over-scherm in `game/js/credits.js`), maar die noemt nog "Rockstar Games of Take-Two Interactive, de uitgever van GTA" (de enige plek in het spel; op de allowlist van `text_audit`). Dat botst met constitution punt 2 en met de Steam-regel dat je geen merken van anderen gebruikt. Advies: de namen weglaten ("niet gelieerd aan, gesponsord door of goedgekeurd door enige andere gameontwikkelaar of -uitgever"); het tekstvoorstel staat op #72. Besluit: eigenaar. |
| Echte namen en gebeurtenissen in het ingesproken verhaal | **open** | Noorderzon, KEI-week, Regnerus Praedinius (echte gebeurtenissen en een echte persoon), zie #150. Verweven in opnames; een nieuwe naam vraagt nieuwe opnames en dus een besluit van de eigenaar (geen nieuwe TTS zonder akkoord). |
| Echte plaatsen en gebouwen | klaar | Mogen (constitution punt 2). Kaartdata © OpenStreetMap-bijdragers (ODbL) staat in de disclaimer en op de kaart. |
| Kunst- en tekstregels voor de beelden | klaar | Alle maten kloppen met de Steamworks-eisen (nagemeten 20 okt): header 920x430, kleine capsule 462x174, hoofdcapsule 1232x706, verticale capsule 748x896, bibliotheekcapsule 600x900, bibliotheekkop 920x430, bibliotheekhero 3840x1240, logo 1280x720, achtergrond 1438x810, communityicoon 184x184, tien schermafbeeldingen van 1920x1080. De capsules bevatten alleen logo en ondertitel, geen prijs, "gratis", "nieuw" of beoordeling. |
| Minstens vier schermafbeeldingen voor alle leeftijden | open | Alle tien zijn opnames uit het spel; de achtervolging (09) kan als niet-geschikt worden gemarkeerd. Dat is een vinkje bij het uploaden: eigenaar. |
| Geen verwijzingen naar andere winkels | klaar | Gezocht (20 okt) in `game/js`, `game/index.html`, `game/storydata` en `docs/steam/`: geen itch.io, GOG, Epic, App Store, Google Play of andere winkel in de speltekst of winkelpagina. |
| AI-melding (vooraf gemaakt: muziek, stemmen, één model, code-hulp; tijdens het spelen: niets) | klaar | Tekst in `docs/steam/winkelpagina.md`; de eigenaar vinkt het aan in de inhoudsvragenlijst. De opnames blijven staan (besluit 20 okt: geen nieuwe TTS). |
| Prestaties | klaar | 217 (22 verborgen) in `steam/achievements.json`, gelijk aan `game/js/achievements.js` (test). |
| Privacyverklaring op een openbare URL | **eigenaar** | Steam eist een URL als het spel gegevens verwerkt; samen spelen stuurt een IP-adres naar een openbare STUN-server en de versleutelde signalering loopt via openbare brokers (alleen na toestemming); een openbare sessie (#438, standaard uit) toont naam, aantal spelers, versie en kamercode, nooit een IP-adres. De tekst staat in `docs/PRIVACY-EN-CREDITS.md`; de repo is privé, dus de eigenaar moet hem ergens openbaar zetten. |
| Naamcheck "GDE Groningen" | **eigenaar** | `docs/MERKENCHECK.md`: de registers zijn niet geraadpleegd (15 minuten met de hand). |
| Steam Cloud | **open** | De saves staan in `localStorage` van het Electron-profiel (leveldb), niet als losse bestanden; Auto-Cloud op die map is te fragiel. Eerst een opslagbestand in `userData` (een schrijf-IPC), dan Auto-Cloud. Geen blokkade voor de eerste uitgave. |
| Licentie en gebruiksvoorwaarden | **eigenaar** | De code is GPL-3.0-or-later, de inhoud valt onder `LICENSE-CONTENT.md`. Verspreiden via Steam kan als houder van de rechten; of er een eigen EULA bij hoort en hoe bijdragen van anderen daarin passen is een juridische vraag. |

## 2. SteamPipe en builds

| Punt | Status | Toelichting |
|---|---|---|
| App- en depotbestanden (`steam/scripts/*.vdf`) | klaar | Alleen plaatshouders (`APP_ID`, `DEPOT_ID_*`); uploaden gaat nooit zelf live (`SetLive ""`). Test controleert dat er geen echt id in staat. |
| Ids invullen zonder de sjablonen te wijzigen | klaar | `node steam/make-steam-files.mjs` is voor spelgegevens; `node steam/make-build-vdf.mjs --app=.. --windows=.. --mac=.. --linux=..` schrijft ingevulde kopieën naar `steam/output/vdf/` als proefrun (`"Preview" "1"`) en drukt het steamcmd-commando af. Getest met verzonnen ids. |
| `copy-builds.mjs` | klaar | Echte proefbouw 20 okt: `electron-builder --win --x64 --dir` en `--linux --x64 --dir` gaven `win-unpacked/GDE Groningen.exe` (620 MB) en `linux-unpacked/gde-groningen` (535 MB); `copy-builds.mjs` zette ze in `content/windows/` en `content/linux/`. De test draait hem ook op een nagemaakte `dist/` (drie depots, vervangen van oude inhoud, foutgevallen). |
| macOS-depot | open | De universal-build (`mac-universal/GDE Groningen.app`) kan alleen op een Mac; daar is hij niet geprobeerd. Kopieer en upload het mac- en het linux-depot vanaf een Mac of Linux: een Windows-schijf bewaart de uitvoerbaarheidsbits niet (`copy-builds.mjs` waarschuwt daarvoor). |
| `release.sh --steam` | klaar | Kopieert de builds vóór `dist/` wordt opgeruimd; `--linux` voegt het Linux-depot toe. Er is bewust geen release gemaakt. |
| `steamcmd` en echte upload | **eigenaar** | Vraagt het Steamworks-account, de app en een bouw-account met Steam Guard. |

## 3. Steam Deck

| Punt | Status | Toelichting |
|---|---|---|
| Linux-build | klaar | `desktop/package.json` bouwt AppImage en tar.gz; Steam gebruikt de uitgepakte map (`linux-unpacked`, startbestand `gde-groningen`, met `chrome-sandbox`). Echt gebouwd en gekopieerd (zie boven). Gestart op Linux of de Deck: nee. |
| Deck-standaarden | klaar | `SteamDeck=1` (door Steam gezet) geeft grote tekst, controllerhints en de Deck-knoppenindeling bij de eerste start (`game/js/deck.js`, test). |
| Controllerlayout en gamepad-audit | klaar | Draaien groen: `pad_input_audit` (38 toetsen, allemaal met knop of reden), `padscreens_test` (elk scherm met alleen de controller), `padlogic_test`, `padkeys_test`, `hud_layout_test`. Steam Input-actiebestand: 12 sets, gegenereerd. De standaardsjabloon "Gamepad" volstaat omdat het spel de controller zelf leest. |
| Kleine-tekstcontrole op 1280x800 | klaar, met aandachtspunten | Statisch: `steam_test` laat falen op elke letter kleiner dan 12 px (sleutelkapjes en het dev-hulpmiddel uitgezonderd); 20 okt zijn vijf plekken in het telefoonscherm, de kraakkaart en de heist-notitie van 11 naar 12 px gegaan. In beeld: 16 opnames op 1280x800 (HUD en alle menu's, 0 consolefouten) bekeken: menu's en HUD zijn leesbaar. **Aandachtspunten, nog niet opgelost:** (a) op de kaart zijn de buurtnamen klein (canvas, door de CSS-controle niet gezien) en liggen ze deels onder pictogrammen; (b) in de opname "gezocht" ligt de kaart "Achtervolging" over de hint "Fluit een duif"; (c) niet gezien op het echte scherm, dus de leesafstand van 7 inch is niet beoordeeld. |
| Startopties en overlay | klaar, onbeproefd | `--steam-overlay` in de startopties zet `in-process-gpu` aan (plus `disable-direct-composition` op Windows), zonder Steamworks-bibliotheek (`desktop/steamflags.cjs`, test). Zonder die optie verandert er niets. Of de overlay dan echt verschijnt (Shift+Tab) is met een echte Steam-client nog niet geprobeerd. `--no-sandbox` voor Linux blijft een losse startoptie (`steam/README.md`). |
| Test op een echte Deck | **eigenaar** | Starten vanuit de bibliotheek, controller, aanraking, schermtoetsenbord (Steam + X) voor de vier tekstvelden, geluid, opslaan, overlay. Pas daarna de Deck-status aanvragen. |

## 4. Wat alleen de eigenaar kan

Niets hiervan kan een agent of een script: het vraagt een account, geld, een
besluit of een echt apparaat. Volgorde zoals het in Steamworks gaat.

1. **Steamworks-account** aanmaken (partner.steamgames.com): identiteit, bankgegevens en belastinginterview.
2. **Steam Direct-bijdrage** betalen (het bedrag staat op de actuele Steamworks-pagina) en wachten op goedkeuring.
3. **App aanmaken** en de **app-id** noteren; depots aanmaken (Windows 64-bit, macOS, Linux en SteamOS) en hun ids noteren. Daarna `make-build-vdf.mjs` draaien, en `game_actions_APP_ID.vdf` hernoemen naar `game_actions_<app-id>.vdf`.
4. **Startopties** per besturingssysteem: `GDE Groningen.exe`, `GDE Groningen.app`, `gde-groningen`; optioneel `--steam-overlay` en op Linux `--no-sandbox`.
5. **Build-account** met alleen bouwrechten en Steam Guard, `steamcmd` installeren, eerst een proefrun en dan een bètatak; zelf live zetten.
6. **Prestaties** aanmaken in Steamworks (217, waarvan 22 verborgen), de API-namen in `steam/achievements.json` invullen (`voorstelApiNaam` is een voorstel), en daarna laten bouwen aan de koppeling (daar hoort de Steamworks-bibliotheek bij; dat is een besluit).
7. **Inhoudsvragenlijst en leeftijd** (Steam en IARC) zelf invullen, AI-melding aanvinken, met `docs/IARC-ANTWOORDEN.md` en `docs/steam/winkelpagina.md` als concept.
8. **Winkelpagina** invullen: teksten, tags, prijs (gratis), systeemeisen, talen (alleen Nederlands), categorieën (Singleplayer, en Online Co-op als samen spelen meetelt), controllerondersteuning, privacy-URL.
9. **Beelden en trailer** uploaden: capsules uit `docs/steam/beelden/`, de schermafbeeldingen, en de trailer volgens `docs/steam/trailer.md`; vier schermafbeeldingen als geschikt voor alle leeftijden markeren.
10. **Prijs** kiezen (nu: gratis) en de **releasedatum**; de winkelpagina moet minstens twee weken vóór de release zichtbaar zijn.
11. **Juridisch**: naamcheck (`docs/MERKENCHECK.md`), licentie en eventuele EULA, de namen in de aftiteling (hierboven), de echte namen in het ingesproken verhaal.
12. **Test op een echte Deck** en op een Mac (mac-depot bouwen en uploaden vanaf de Mac).
13. **Publicatiebesluit**: wanneer de winkelpagina en de build openbaar gaan; de repo blijft privé en dit is volgens AGENTS.md punt 8 aan de eigenaar.

## 5. Nagelopen op 24 oktober (versie 0.47.0)

Wat sinds 20 oktober is veranderd en wat dat voor Steam betekent. Gecontroleerd met
`node scripts/steam_test.mjs` (109 van 109 in orde), `node scripts/text_audit.mjs` (0 bevindingen) en
`node scripts/voice_coverage.mjs --quiet` (1658 van 1658).

- **Prestaties**: 217, waarvan 22 verborgen: `steam/achievements.json` is gelijk aan `game/js/achievements.js` (test). Tellingen in dit document en op de winkelpagina zijn bijgewerkt.
- **Samen spelen**: Sinds 20 oktober zijn er openbare sessies (opt-in) en opslaan/overdragen bij samen spelen bijgekomen. De winkeltekst noemt nu de kamercode en de openbare lijst. Categorie "Online Co-op": de eigenaar beslist (zie §4 punt 8).
- **Beelden**: De schermafbeeldingen en capsules zijn van 20 oktober of eerder; het menu, de kaart (percelen, grenzen) en het coöp-deel zijn sindsdien veranderd. Nog niet opnieuw bekeken: de eigenaar kijkt of ze nog representatief zijn.
- **Trailer**: Zie #63 en #65: de trailers van 22 oktober zijn verouderd voor het menu, de kaart en samen spelen.
- **Credits**: Zie de rij "Geen echte merken of personen in de speltekst" hierboven.
- **Deck, overlay, mac-depot**: Ongewijzigd: nog niet op echte hardware geprobeerd (§2 en §3).

### Wat de eigenaar zelf doet in Steamworks (kort, in volgorde)

1. Account en identiteit, bankgegevens en belastinginterview; Steam Direct-bijdrage betalen (§4 punt 1 en 2).
2. App aanmaken, app-id en depot-ids noteren; `make-build-vdf.mjs` draaien (§4 punt 3).
3. Winkelpagina invullen met `docs/steam/winkelpagina.md` (Nederlands; categorieën, tags, gratis, privacy-URL; minstens twee weken vóór de release zichtbaar).
4. Inhoudsvragenlijst (Steam) en IARC invullen met `docs/IARC-ANTWOORDEN.md` (#60), AI-melding aanvinken.
5. Beelden en trailer uploaden uit `docs/steam/beelden/` (vier schermafbeeldingen als geschikt voor alle leeftijden markeren).
6. 217 prestaties aanmaken en de API-namen terugzetten in `steam/achievements.json`.
7. Proefbouw uploaden met `steamcmd` (eerst Preview, dan een bètatak), Deck- en overlaytest op echte hardware.
8. Zelf op "live" zetten: het publicatiebesluit blijft bij de eigenaar (constitution 8).
