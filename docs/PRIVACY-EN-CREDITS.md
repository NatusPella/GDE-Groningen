# Privacy en credits (concept voor publicatie, #37 en #72)

Stand: 18 oktober 2026. Een feitenblad voor de README, een eventuele privacypagina
en de winkelpagina's. **Geen juridisch advies**; niets hiervan is geplaatst of
verstuurd. De eigenaar beslist wat waar komt te staan.

## 1. Privacy: wat het spel doet met gegevens

| Onderwerp | Feit | Bron |
|---|---|---|
| Account, inlog | Geen | |
| Telemetrie, analytics, advertenties | Geen | |
| Saves en instellingen | Alleen lokaal op het apparaat (`gde-save-v1`, `gde-settings`, `gde-prestaties-v1` in localStorage) | `game/js/storagekeys.js` |
| Foutrapport | Wordt alleen gekopieerd door de speler, niet verstuurd; bevat geen persoonsgegevens | CONTRIBUTING.md |
| Desktopapp (Electron) | Alleen offline spelen; externe links openen in de systeembrowser | `desktop/main.js` |
| Webversie | Haalt `three` van de jsDelivr-CDN en lettertypen van Google Fonts, tenzij de webbuild ze meelevert (`desktop/build.mjs` vendort ze). Dan ziet die dienst het IP-adres van de bezoeker | `game/index.html` |
| Samen spelen (#95) | **Alleen na toestemming** van de speler (`net/consent.js`): het IP-adres gaat naar een openbare STUN-server, en versleutelde signalering (met de kamercode als sleutel) via openbare brokers. Er gaat geen telemetrie of account mee. Spelers die samen spelen zien elkaars IP-adres niet in het spel, maar WebRTC maakt een directe verbinding | `game/js/net/netconfig.js`, AGENTS.md punt 4 |

Openstaand (eigenaar): de SECURITY.md-zin "het spel stuurt niets naar een
server" klopt sinds samen spelen alleen zonder samen spelen; die tekst is aangepast. De
Steam- en IARC-antwoorden over "online contact" en "internet" moeten de
uitzondering voor samen spelen noemen (zie [IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md), aanvulling).

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
- **Kaartdata:** © OpenStreetMap-bijdragers (ODbL); gebouwen: 3DBAG (CC BY 4.0);
  hoogtes: AHN via PDOK (CC0)
- **Techniek:** three.js (MIT), Electron (MIT)
- **Lettertypen:** Bebas Neue en Big Shoulders Display (SIL OFL 1.1)
- **Geluidseffecten:** zelf gesynthetiseerd
- **Muziek en stemmen:** gemaakt met AI (Google Gemini), aangeboden voor zover er
  rechten op rusten
- **Martinitoren-model:** gemaakt met Claude Design (Anthropic)
- **Disclaimer:** één tekst, gelijk in README, NOTICE.md en `game/js/credits.js`: gratis
  fanparodie, niet gelieerd aan, gesponsord door of goedgekeurd door een gameontwikkelaar
  of -uitgever, in het bijzonder niet door Rockstar Games of Take-Two Interactive (de
  uitgever van GTA); alles verzonnen, gelijkenis berust op toeval. De uitgever wordt in het
  spel alleen hier genoemd (Over); de aftiteling zegt "Fanparodie: alles verzonnen".

Volledige herkomst en risico's: [LICENTIES.md](LICENTIES.md). AI-melding voor
Steam staat in [steam/winkelpagina.md](steam/winkelpagina.md).
