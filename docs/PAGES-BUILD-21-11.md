# Proefbouw GitHub Pages (webversie), 21-11

Eigenaar-wens: "kun je proberen een GitHub Pages build te maken en die ook eens te checken?"
Dit is een **lokale** proef op versie 0.64.0. Er is niets gepubliceerd, geen Pages aangezet, geen
workflow gestart (constitutie 8). Issue [#57](https://github.com/NatusPella/GDE-Groningen/issues/57)
blijft de plek voor de uiteindelijke beslissing.

## Hoe bouw je hem

De game-webversie is een statische map, `web-dist/` (gitignored), met relatieve paden
(`GDE_STAGE_RELATIVE=1`), dus hij draait op elk sub-pad, ook `/<repo>/`.

```
cd desktop && npm run web                      # of: node web/build.mjs
node web/serve.mjs 8847 --prefix=/GDE-Groningen/   # sub-pad zoals Pages (Git Bash: MSYS_NO_PATHCONV=1)
node scripts/web_pages_check.mjs --url=http://localhost:8847/GDE-Groningen/
```

- De wereld komt niet uit git: zonder `data/cache/province` is `GDE_PREBUILT_WORLD=<map met index.json>`
  nodig (bij de proef: de wereld-cache van een eerdere stage). Opus-clips komen uit `web/.cache/opus`
  (eerste keer ca. 8 minuten met ffmpeg; met cache seconden). `desktop/vendor-cache` houdt three.js
  en fonts offline beschikbaar.
- Nieuw in deze proef (kleine commits): `web/serve.mjs` kent nu `--prefix=` en de types `.ogg .txt .ttf .jpg`;
  `scripts/web_pages_check.mjs` stuurt headless Chrome (CDP, eigen wegwerpprofiel, geen echte opslag) en
  verzamelt screenshots, console, mislukte requests en bytes.

## Uitslag van de bouw

`web-dist/`: **2000 bestanden, 598,6 MB**, grootste bestand 4,4 MB (een muziekspoor). Opus-audio
179 MB (van 319 MB mp3/wav); de map bevat beide formaten.

| Onderdeel | Grootte |
|---|---|
| audio (Opus-packs, muziek, originelen) | 483 MB |
| wereld (82 tegelpakketten `.gdp`, terrein) | 66 MB |
| js (1227 modules) | 19 MB |
| vendor, fonts, img, json | ca. 8 MB |

Grenzen van GitHub Pages: site "aanbevolen" max 1 GB (599 MB past, maar de helft is audio), bestand max
100 MB (grootste 4,4 MB), 100 GB bandbreedte per maand (zacht). itch.io past niet meer: 2000 bestanden
tegen een grens van 1000 en 599 MB tegen 500 MB; dat is dus nieuw sinds de 0.22-cijfers in
docs/ONTWIKKELEN.md. Een lichte variant is nu nog niet nodig voor Pages. Wil de eigenaar toch kleiner, dan is
de goedkoopste winst alleen de Opus-bestanden publiceren (de mp3-terugval voor Safari < 18.4 weglaten:
ca. 300 MB minder).

## Wat is getest en wat kwam eruit

Headless Chrome (SwiftShader, 1280x720, schone cache, eigen profiel) tegen `http://localhost:8847/GDE-Groningen/`:

- **Sub-pad werkt.** Alle ca. 1.730 requests slaagden (200 en 206 Range); geen 404 en geen paden buiten het
  sub-pad. Er gaat niets naar externe hosts, behalve de livebussen (zie onder).
- **Laden tot de wereld:** ca. 40 MB overgedragen (js 17 MB, wereldtegels 20 MB, json 1,9 MB, fonts 0,4 MB) in
  ca. 11 s tot "wereld" en ca. 11 s tot "systemen" op software-rendering, met een lokale server. Dat zegt
  niets over een echte verbinding: bij 50 Mbit/s komt er zeker 10 tot 15 s download bij.
- **Eerste start:** er verschijnt eerst een verplichte naamvraag voor Samen spelen met een verplicht
  toestemmingsvinkje (STUN en brokers), daarna de openingsfilm. Beide werken in web. Het vinkje is
  getest; er ging daarna niets online.
- **Service worker:** geactiveerd op het sub-pad (`localStorage` en `isSecureContext` werkten; `localhost`
  is secure, GitHub Pages is https).
- **Wereld in beeld:** de openingsmontage toont de echte wereld uit de webbuild, zie
  `docs/beeld-21-11/pages/intro-montage-torenspits.png` en `intro-montage-fietsers.png`. Het
  desktop-venster (`window.gdeDesktop`) ontbreekt zoals bedoeld; het spel start zonder.
- **Audio-autoplay:** Chrome meldt "AudioContext was not allowed to start" (waarschuwing) tot de eerste
  toets of klik; daarna volgt het gewone pad. Geen fout, wel een dozijn waarschuwingen in de console.
- **Console:** alleen waarschuwingen ("THREE.Color: Alpha component ... will be ignored", 20 keer, en de
  AudioContext-meldingen). Zie het rapport in `docs/beeld-21-11/pages/rapport-noattract.json`.

### Livebussen (CORS)

`https://gtfs.ovapi.nl/nl/vehiclePositions.pb` stuurt **geen** `Access-Control-Allow-Origin` (gemeten met
curl, GET en OPTIONS). Vanuit `github.io` blokkeert de browser de opvraag (`net::ERR_FAILED`, CORS); in de proef
gebeurde dat één keer. Het faalt zacht: `buslive.js` valt terug op de eigen busdienst, met uitstel bij herhaling.
Gevolg: in web zijn de bussen nooit live, alleen in Electron (main-proces, `desktop/livebussen.cjs`). Een eigen
proxy kan niet (constitutie 4: niets sturen naar eigen of externe diensten behalve het OPHALEN). Aanbeveling: in
web de opvraag helemaal overslaan (geen rode CORS-regel in de console, en geen overbodig verzoek).

### Samen spelen in web

Aanwezig: `RTCPeerConnection` bestaat, de naamvraag en toestemming draaien. **Niet getest:** een echte sessie
(STUN en brokers zijn externe diensten; dat vraagt twee echte vensters en de toestemming van de eigenaar-regels
voor tests). Een directe-IP-route bestaat alleen in Electron; in web blijft Samen spelen dus bij WebRTC met
kamercode.

## Wat niet is getest of niet gelukt

- **Hoofdmenu niet in beeld gekregen.** Op de eerste start loopt de openingsfilm ("Houd Spatie ingedrukt om
  over te slaan"); in het headless-venster liet hij zich in 150 s niet overslaan, en de kaart (M) is niet
  bereikt. Ook met `?noattract` bleef de montage staan. De drie gevraagde screenshots (menu, wereld, kaart) zijn
  dus **niet** gemaakt; de twee beelden hierboven zijn de wereld in de montage. Een toast tijdens de film meldde
  "Er ging iets mis: idx.inWater is not a function": zie issue [#1089](https://github.com/NatusPella/GDE-Groningen/issues/1089).
- Niet gedaan: echte GPU (alleen SwiftShader, dus geen fps-cijfers), Safari/Firefox, mobiel, tweede bezoek
  met service worker offline, daadwerkelijk spelen, geluid horen, Samen spelen.
- De wereld is die van de bestaande wereld-cache (3.221 tegels, 82 pakketten); een verse provinciebouw is niet
  gedraaid.
- Het eerste screenshot van de naamvraag is bij het opruimen van de proefmap verloren gegaan.

## Wat mist of is stuk in web

1. Livebussen vallen altijd terug (CORS).
2. Geen *Afsluiten*, geen videoexport, geen `--`-schakelaars (bedoeld).
3. Mogelijke fout `idx.inWater` in de openingsfilm (#1089).
4. Safari vóór 18.4 krijgt de mp3-terugval: dat is een deel van de 600 MB.
5. Er is geen Pages-workflow voor de game; alleen de marketingpagina (`.github/workflows/pages.yml`). Zie #1090.

## Aanbevelingen

- Publiceer onder `/play/` van dezelfde Pages-site als de marketingpagina: één site per repo, relatieve
  paden dragen het.
- Workflow: handmatig (`workflow_dispatch`), owner-guard, wereld uit `gde-world.tgz` van de release
  (`GDE_PREBUILT_WORLD`), `actions/cache` voor `web/.cache/opus`; de CI heeft ffmpeg.
- Laat de livebussen-opvraag in web weg of hang hem aan een duidelijke zachte fout.
- Een tijdelijke "laden: x van 40 MB"-melding bestaat al (laadscherm "Grunn downloaden"); houd dat.
- Test vóór publicatie op een echte GPU, op Firefox, en in een echt venster de eerste start.

## Wat de eigenaar moet beslissen voor publicatie

1. Pages aanzetten voor deze repo en de game onder `/play/` of in een eigen repo.
2. De workflow (#1090) goedkeuren en zelf starten; geen agent doet de deploy.
3. De webversie wel of niet verder verkleinen (Opus-only is ca. 300 MB lichter, maar Safari < 18.4 valt dan weg).
4. Livebussen in web uitzetten (CORS), of accepteren dat ze daar nooit live zijn.
5. Of de webversie ook als download (itch.io) blijft; die past nu niet meer door het aantal bestanden.
6. Leeftijdsmelding en toestemming bij Samen spelen in web (18+; #60, #451).
7. Pas na bovenstaande: het issue #57 sluiten.
