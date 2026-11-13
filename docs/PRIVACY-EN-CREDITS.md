# Privacy en credits (concept voor publicatie, #37 en #72)

Stand: 18 oktober 2026; bijgewerkt op 8 november 2026 voor de join-binding (#795) en op 7 november 2026 voor de altijd-online start (#554, #583, #395, #690). Een feitenblad voor de README, een eventuele privacypagina
en de winkelpagina's. **Geen juridisch advies**; niets hiervan is geplaatst of
verstuurd. De eigenaar beslist wat waar komt te staan.

## 1. Privacy: wat het spel doet met gegevens

| Onderwerp | Feit | Bron |
|---|---|---|
| Account, inlog | Geen | |
| Telemetrie, analytics, advertenties | Geen | |
| Saves en instellingen | Alleen lokaal op het apparaat (`gde-save-v1`, `gde-settings`, `gde-prestaties-v1` in localStorage) | `game/js/storagekeys.js` |
| Foutrapport | Wordt alleen gekopieerd door de speler, niet verstuurd; bevat geen persoonsgegevens | CONTRIBUTING.md |
| Desktopapp (Electron) | Speelt offline; haalt alleen op verzoek de live busposities op (openbare leesopvraag zonder gegevens van de speler, uitzetter in Instellingen, #395). Externe links openen in de systeembrowser | `desktop/livebussen.cjs`, `desktop/main.js` |
| Webversie | De webbuild levert `three` en de lettertypen zelf mee (geen externe laad-URL's); alleen de losse dev-server (`game/index.html`) haalt ze van een CDN, en dan ziet die dienst het IP-adres van de bezoeker | `desktop/build.mjs`, `game/index.html` |
| Samen spelen (#95, #528, #583) | **Alleen na toestemming** van de speler (`net/consent.js`; de eerste start vraagt het één keer, een ontbrekend antwoord is geen ja): het IP-adres gaat naar een openbare STUN-server, en de versleutelde signalering via openbare brokers. De kamercode gaat sinds #583 eenmalig versleuteld mee (ECDH + AES-GCM) en is sinds #795 aan de hostsleutel van de sessie gebonden: de publieke helft staat in de openbare lijst, de privéhelft alleen in het geheugen van de gastheer en nergens opgeslagen. De lijst toont daardoor een sessie-id en een publieke sleutel (geen persoonsgegeven), geen kamercode. Er gaat geen telemetrie of account mee; elke speler houdt eigen geld, verhaal en bezit (#429). Spelers die samen spelen zien elkaars IP-adres niet in het spel, maar WebRTC maakt een directe verbinding | `game/js/net/netconfig.js`, `game/js/sessionboot.js`, AGENTS.md punt 4 |

Openstaand (eigenaar): de Steam- en IARC-antwoorden over "online contact" en
"internet" noemden de uitzonderingen niet; sinds 7 november doen `README.md`,
`docs/IARC-ANTWOORDEN.md` en `docs/LEEFTIJD.md` dat wel (#690, #691). De
SECURITY.md-zin over "het spel stuurt niets naar een server" is eerder al
aangepast.

## 2. Persoonsgegevens in de repo

- Geen persoonsnamen in speltekst; personages en bedrijven zijn verzonnen.
- Auteurs in de git-historie: noreply-adres van NatusPella. Een deel van de commits
  draagt nog de echte naam van de eigenaar als weergavenaam; de eigenaar beslist of
  dat blijft (#62). Controle: `node scripts/publish_check.mjs --history`.
- OSM-extracten in `data/*_raw.json` bevatten zakelijke e-mailadressen en
  telefoonnummers uit OSM-tags (ODbL). Het spel gebruikt ze niet; de eigenaar
  beslist of ze eruit gaan (zou een historieherschrijving vragen, #76).
- Speeltesters komen alleen bij bijnaam voor.

## 3. Credits: tekst voor de aftiteling en "Over"

Hou deze lijst gelijk met `NOTICE.md` en `game/js/credits.js`. Op de eigenaar na
schrijft niemand een echte naam in credits: gebruik NatusPella.

- **Ontwerp, verhaal en code:** NatusPella
- **Met dank aan (op volgorde van bijdrage):** astnagrath, pixel-maus, alexkramer98,
  Teungritter, MathijsG, ArmEagle, wisskid, Agnilor, jonathanbuist en alle playtesters.
  Zie [CREDITS.md](CREDITS.md) voor de meetmethode en de volledige lijst; op de eigenaar
  na staan er alleen GitHub-handles en rolnamen in.
- **Tech-stack en AI (vermelding, geen credits):** Claude, OpenHands, chat1/agent,
  DeepSeek V4.1 Flash via DeepSeek Harness, Google Gemini (stemmen en muziek) en Claude
  Design (Martinitoren-model).
- **Kaartdata:** © OpenStreetMap-bijdragers (ODbL); gebouwen: 3DBAG (CC BY 4.0);
  hoogtes: AHN via PDOK (CC0)
- **Techniek:** three.js (MIT), Electron (MIT)
- **Lettertypen:** Bebas Neue en Big Shoulders Display (SIL OFL 1.1)
- **Geluidseffecten:** zelf gesynthetiseerd in `game/js/sfx/*.js`, plus tien
  opnames van acht Freesound-bronnen (CC0, publiek domein; zie
  `game/audio/sfx/manifest.json`)
- **Muziek en stemmen:** gemaakt met AI (Google Gemini), aangeboden voor zover er
  rechten op rusten
- **Martinitoren-model:** gemaakt met Claude Design (Anthropic)
- **Disclaimer:** één tekst, gelijk in README, NOTICE.md en `game/js/credits.js`: gratis
  fanparodie, niet gelieerd aan, gesponsord door of goedgekeurd door een andere
  gameontwikkelaar of -uitgever; alles verzonnen, gelijkenis berust op toeval. Er worden
  geen namen van andere games of uitgevers genoemd; de aftiteling zegt "Fanparodie: alles
  verzonnen".

Volledige herkomst en risico's: [LICENTIES.md](LICENTIES.md). AI-melding voor
Steam staat in [steam/winkelpagina.md](steam/winkelpagina.md).
