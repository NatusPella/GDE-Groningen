# Licenties, rechten en risico's

Stand van 3 oktober 2026. Dit is een inventaris en een advies, geen
juridisch advies van een advocaat. Waar iets onzeker is staat dat erbij
(**ONDUIDELIJK** of **RISICO**). Beslissingen voor de eigenaar staan in §9.

Korte versie:

- Code, verhaal en teksten zijn eigen werk. Alles van derden is open
  source (MIT, OFL) of open data (ODbL) en mag mee, mits de vermeldingen
  kloppen. Die staan nu in `NOTICE.md`, `licenses/` en in het spel.
- De kaartdata is ODbL: de JSON-kaartbestanden blijven ODbL, ook als de rest
  van het project een andere licentie krijgt.
- Muziek en stemmen komen van Google Gemini. Google claimt geen eigendom,
  verspreiden in een gratis spel mag. Puur AI-gemaakte audio is in de EU
  waarschijnlijk niet auteursrechtelijk beschermd, dus een eigen licentie
  daarop is weinig waard.
- Het grootste risico is de parodie: naam en stijl moeten op zichzelf
  staan. Op Steam weegt dat zwaarder. Zie §6 en §8.
- `data/satellite_reference.jpg` (Esri-luchtfoto, mag niet herverspreid
  worden) is uit de repo (15 okt); uit de git-historie halen staat nog open.

---

## 1. Inventaris: software en lettertypen

| Onderdeel | Waar | Licentie | Wat moet | Status |
|---|---|---|---|---|
| **three.js r160** + addons (`GLTFLoader` e.a.) | browser: jsDelivr-CDN via import map en directe URL's; desktop: gekopieerd naar `build/game/vendor/npm` door `desktop/build.mjs` | [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE) | copyrightregel + licentietekst bij kopieën | `licenses/MIT-three.js.txt`, gaat nu mee in de desktopbuild |
| **Bebas Neue** | browser: Google Fonts-CSS; desktop en web: woff2 in `vendor/fonts` | [SIL OFL 1.1](https://openfontlicense.org), © 2010 Dharma Type ([bron](https://github.com/dharmatype/Bebas-Neue)) | bij meeleveren: copyright + OFL-tekst; font niet los verkopen | `licenses/OFL-BebasNeue.txt`, gaat mee in de desktopbuild |
| **Big Shoulders Display** (het logo) | browser: Google Fonts-CSS (zelfde link als Bebas Neue); desktop en web: woff2 in `vendor/fonts` (`desktop/build.mjs`); als subset (GDERONI) ingebed in `desktop/resources/icon.svg` | [SIL OFL 1.1](https://openfontlicense.org), © 2019 The Big Shoulders Project Authors ([bron](https://github.com/xotypeco/big_shoulders)) | bij meeleveren: copyright + OFL-tekst; font niet los verkopen; geen Reserved Font Name, dus de subset in het icoon mag de naam houden | `licenses/OFL-BigShouldersDisplay.txt`, gaat mee in de desktop- en webbuild |
| Systeemlettertypen (Arial, Arial Narrow, Georgia, Segoe Print, Comic Sans, Menlo, Consolas, system-ui) | CSS en canvas-teksten | van het OS van de speler | niets: niet meegeleverd | ok |
| **Electron** 44 | desktopapp | [MIT](https://github.com/electron/electron/blob/main/LICENSE); Chromium en Node onder eigen licenties | electron-builder zet `LICENSE.electron.txt` en `LICENSES.chromium.html` naast de app | ok, niet weghalen |
| **electron-builder** 26 | alleen bouwtool | [MIT](https://github.com/electron-userland/electron-builder/blob/master/LICENSE) | niets: zit niet in de app | ok |
| Eigen code | `game/`, `desktop/`, `web/`, `scripts/` | GPL-3.0-or-later (`LICENSE`, gekozen 15 okt 2026, zie §7) | | ok |

Geen andere vendored code, geen npm-afhankelijkheden in het spel zelf,
geen `node_modules` in git.

## 2. Inventaris: beeld, 3D en geluid

| Onderdeel | Bron | Rechten | Status |
|---|---|---|---|
| Texturen, borden, gevels, alle 3D-modellen behalve de Martinitoren | procedureel in de code (canvas, three.js-geometrie) | eigen werk | ok |
| `game/models/martinitoren.glb` | gemaakt met **Claude Design** (Anthropic), commit `a30ad76`; prompt in `docs/3d-model-prompts.md`; exporter `THREE.GLTFExporter r184` | Anthropic draagt zijn rechten op output over aan de gebruiker ([Consumer Terms](https://www.anthropic.com/legal/consumer-terms), "Outputs") | ok |
| Referentiefoto's voor Paddepoel (oogtv.nl, Wikimedia Commons, genoemd in `paddepoel3d.js`) | alleen gebruikt als voorbeeld bij het modelleren | foto's zitten niet in het spel | ok |
| `data/satellite_reference.jpg` (6,4 MB) | **Esri World Imagery**-export (`scripts/extract_palette.py`) | Esri-beelden mogen niet als los bestand herverspreid worden ([Esri-voorwaarden](https://www.esri.com/en-us/legal/terms/full-master-agreement)); alleen de afgeleide kleurwaarden zitten in het spel | uit de repo en de historie (15 okt, in `.gitignore`; zie `docs/PUBLICEREN.md`) |
| Geluidseffecten (motor, foley, ambience, UI) | gesynthetiseerd in `game/js/sfx/*.js` | eigen werk | ok |
| Opnames van effecten (acht Freesound-bronnen in tien bestanden: autodeuren, portiergreep, bandenslip, handrembocht, remmen op grind, treindeur in open, piep en dicht) | `game/audio/sfx/` (bron en bewerking per bestand in `game/audio/sfx/manifest.json`) | Freesound, Creative Commons 0 (publiek domein); gekozen en gedownload met akkoord van de eigenaar op 24-10-2026; gemasterd met `scripts/audio/master_sfx.mjs` | ok (CC0, geen naamsvermelding nodig) |
| Muziek: 20 G-Music-nummers, 8 scenario-loops, titelnummer `miles_past_the_city_square.mp3` | Google Gemini (volgens de eigenaar) | zie §4 | ok, met kanttekeningen |
| Stemmen: ~3.100 clips in `game/audio/voicelines` en de vaste mappen (elke clip gelogd in een `tts.json`; telling en controle: `node scripts/audio_herkomst.mjs`, allemaal `google/gemini-3.8-flash-tts`, prebuilt stemmen zoals Orus en Callirrhoe; sinds 5 okt spreken ze Gronings, uit `scripts/gronings_spoken.json`, geschreven met Claude, de Friese personages en toeristen daargelaten) | Gemini TTS via OpenRouter | zie §4 | ok |
| Vaste clips: `audio/npc`, `audio/police`, `audio/nieuws`, `audio/gmusic/jingles` | Gemini TTS via OpenRouter, `google/gemini-3.8-flash-tts` (`scripts/tts_barks_lines.mjs`, stemmen in `tts_cast.mjs` `CLIP_CAST`) | zie §4 | **opgelost** (3 okt): waren gemaakt met een previewmodel zonder log; nu opnieuw ingesproken en per map gelogd in `tts.json` |
| App-icoon `desktop/resources/icon.svg/png` | eigen ontwerp (GDE-logo) met ingebedde subset van Big Shoulders Display | OFL staat inbedden toe | ok |

### Herkomst van geluid en muziek (stand 21 okt 2026, #62)

Er zijn drie soorten geluid in het spel, met elk een eigen herkomst:

| Soort | Waar | Herkomst | Samples? |
|---|---|---|---|
| **Geluidseffecten**: motoren, voetstappen, foley, omgeving, interface, claxon, sirene | `game/js/sfx/*.js`, `game/js/audio.js` | in het spel zelf gesynthetiseerd (Web Audio: oscillatoren, ruis, filters), tijdens het spelen; op acht opnames na (zie hieronder) | **acht CC0-opnames** van Freesound in `game/audio/sfx/`, verder geen externe samples |
| **Muziek**: 34 G-Music-nummers, 8 scenario-loops, titelnummer | `game/audio/gmusic`, `scenario`, `theme` | gemaakt met Google Gemini (AI), niet door de eigenaar gecomponeerd of gesynthetiseerd; zie §4 | n.v.t. (AI-output) |
| **Stemmen**: ~3.100 regels plus vaste clips (`npc`, `police`, `nieuws`, jingles) | `game/audio/voicelines` e.a. | Gemini TTS via OpenRouter (`google/gemini-3.8-flash-tts`), per map gelogd in `tts.json` | n.v.t. (AI-output) |

Sinds 24 okt 2026 horen ook de korte stings (afteller, finish, winnaar, verliezer, Meedoen?, speler sluit aan, trein vertrekt,
halte; `game/js/stings.js`) bij de geluidseffecten: procedureel in code gemaakt, geen opnames en geen AI-muziek.

Sinds 24 okt 2026 zijn er acht CC0-opnames van Freesound (`game/audio/sfx/`, per bestand in `manifest.json`). Let op: "alles zelf gesynthetiseerd, geen samples" geldt dus **alleen voor de
geluidseffecten**, niet voor muziek en stemmen. README, NOTICE en de
aftiteling zeggen dat ook zo. **Nog open voor de eigenaar:** welk muziekproduct
precies is gebruikt (Gemini-app/Lyria of API, gratis of betaald abonnement),
zie §4.3 en §9 punt 8. Zonder die vastlegging kan dit document het
muziekproduct niet noemen.

## 3. Inventaris: kaart en andere data

| Onderdeel | Bron | Licentie | Wat moet |
|---|---|---|---|
| `game/stad.json`, `game/mapextras.json`, `scripts/world/cityroutes_src.json`, de kaarttegels (`game/world/`) | OpenStreetMap, Geofabrik-extract en Overpass (`scripts/world/extract_province.py`, `fetch_ommeland.py`, de tegelbouw `scripts/world/*.mjs`; de oude Python-keten staat in de git-geschiedenis) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) | naamsvermelding; deze **afgeleide databases** blijven ODbL als je ze verspreidt (share-alike) |
| `data/*_raw.json(.gz)`, `data/*.overpass` | Overpass-extracten van OSM | ODbL | idem |
| `game/grenzen.json` (gemeente-, woonplaats-, wijk- en buurtgrenzen, vereenvoudigd; `scripts/world/fetch_grenzen.mjs` haalt de ruwe grenzen op naar `data/cache/grenzen/`, `scripts/world/grenzen.mjs` maakt het bestand; alleen die scripts gebruiken het netwerk) | Kadaster, PDOK Bestuurlijke Gebieden (provincie en gemeenten); Kadaster, BAG woonplaatsen; CBS, Gebiedsindelingen 2025 (wijken en buurten): allemaal via PDOK | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.nl) (Bestuurlijke Gebieden en CBS), [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/deed.nl) (BAG); zo gemeld door de OGC API's van PDOK op 22-10-2026 | naamsvermelding voor Kadaster en CBS: aftiteling en Over (`game/js/credits.js`), NOTICE.md; vermeld dat de grenzen vereenvoudigd zijn. Geen persoonsgegevens. |
| Hoogtes van de ring (`add_elevation.py`) | berekend uit OSM-tags (layer, bridge, tunnel) | ODbL | idem; de terreinhoogte komt uit de AHN (volgende rij) |
| `data/world/3dbag.json.gz`, de gebouwhoogtes (`h`, `hsrc`, `roof`) in de tegels | 3DBAG (TU Delft, 3DGI), officiële tegeldownloads van data.3dbag.nl (`scripts/world/fetch_3dbag.py`); de ruwe tegels staan alleen lokaal in `data/cache/` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | naamsvermelding: Over, aftiteling, NOTICE.md ("3DBAG door de 3D geoinformation onderzoeksgroep (TU Delft) en 3DGI") |
| 3D BAG LoD 2.2 (CityJSON), alleen offline voorbereid en NIET in het spel, de stage of de release (`scripts/world/fetch_3dbag_lod22.py` naar `data/cache/3dbag-lod22/`, omgezet door `scripts/world/bag_lod22.mjs` naar `.gbl` per kilometertegel; `docs/BAG-LOD22.md`, #410) | 3DBAG (TU Delft, 3DGI), officiële tegeldownloads van data.3dbag.nl (`cj_download` uit de tegelindex) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | dezelfde naamsvermelding als de rij hierboven, ook voor de omgezette bestanden (afgeleid werk); het haalscript controleert de licentie in de metadata van de versie. Extra voorwaarden zijn niet gevonden in wat al in de repo staat; de actuele voorwaarden van data.3dbag.nl bij de eerste echte download nalopen. Pas als de laag in het spel komt gaat het in de aftiteling en de release |
| AHN-hoogteraster (`scripts/world/fetch_ahn.py`: per kilometertegel een GeoTIFF van PDOK's AHN-WCS, ruwe bestanden lokaal in `data/cache/ahn/`, afgeleide rasters in `data/world/ahn/` en de kaarttegels; `game/js/terrainraster.js` leest ze) | Actueel Hoogtebestand Nederland (AHN, Rijkswaterstaat e.a.) via PDOK | CC0 (publiek domein) | geen verplichting; vermeld in NOTICE.md en de aftiteling |
| Padel-, golf- en pitch-and-putt-banen (`scripts/world/echteplekken.py`, `data/extras_padel_raw.json`, `game/echteplekken.json`) en de horeca- en winkelextracten (`data/horeca_raw.json`, `data/shops_raw.json`) | Overpass-extracten van OSM | ODbL | idem als de rest van de kaartdata; namen van ketens en cafés komen niet in de speltekst (zie hieronder) |
| Overpass-servers (overpass-api.de, kumi.systems, private.coffee, maps.mail.ru) | alleen bij het bouwen van de kaart | [gebruiksvoorwaarden](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html): redelijk gebruik | niets voor de speler |

**OSM-vermelding** ([Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)):
voor games mag de vermelding in de aftiteling, een splash-scherm of een
menu, mét de link openstreetmap.org/copyright; op een interactieve kaart
hoort hij in een hoek van de kaart. Nu in het spel:

- laadscherm (onderaan, met link-tekst);
- startscherm → **Over**;
- aftiteling na de finale (kaart `© OpenStreetMap-bijdragers`);
- grote kaart (M): linksonder `© OpenStreetMap-bijdragers · openstreetmap.org/copyright`.

De minimap heeft geen eigen vermelding; dat mag volgens de richtlijnen
omdat de vermelding in menu en aftiteling staat en de minimap geen
zelfstandige kaartdienst is.

**ODbL in gewone taal**: het spel als geheel is een *Produced Work*; daar
volstaat de naamsvermelding. De JSON- en bin-bestanden zelf zijn een
*Derivative Database*; wie die publiek verspreidt (repo publiek, of in een
download), moet ze onder de ODbL aanbieden of de manier om ze opnieuw te
maken. Dat doen de scripts in `scripts/` al. Gevolg: de licentie van het
project (§7) moet deze bestanden **uitzonderen**: die blijven ODbL.

**Namen uit OSM in het spel**: horeca (470 echte namen) staan alleen nog
op de kaart en in de zoekfunctie; meldingen en de bestelprompt gebruiken
een verzonnen café per plek (`horeca.js` `CAFE_NAMES`). Huisartsenposten bij
respawn heten "Huisartsenpost <wijk>" (`add_police_stations.py`) en garages
"Garage Knalpot <wijk>". Feitelijke kaartinformatie, laag risico (§6.3).

## 4. Gegenereerde inhoud: Google Gemini en OpenRouter

### Wat de voorwaarden zeggen

| Document | Kern voor GDE Groningen |
|---|---|
| [Google Terms of Service](https://policies.google.com/terms) (van kracht 30 juli 2026) | Google "won't claim ownership" van jouw content, ook AI-output. Verboden: AI-output gebruiken om ML-modellen te trainen, en anderen laten denken dat AI-content door een mens is gemaakt. |
| [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms) (bijgewerkt 28 april 2026) | Google claimt geen eigendom van gegenereerde content, maar kan vergelijkbare content voor anderen maken. Gebruiker van de API moet 18+ zijn. Geen concurrerende modellen bouwen. Gratis tier: prompts en output mogen door Google gebruikt worden om producten te verbeteren; betaald niet. Verbod om de **Services** te gebruiken "as part of" een app die gericht is op of waarschijnlijk gebruikt wordt door minderjarigen. |
| [Generative AI Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy) (17 dec 2024) | Geen imitatie van echte personen zonder duidelijke vermelding om te misleiden, geen inbreuk op IE of privacy, geen seksuele content, geen verheerlijking van geweld of extremisme. Uitzondering mogelijk voor artistieke doeleinden. |
| [Generative AI Additional Terms](https://policies.google.com/terms/generative-ai) (2023) | **Vervallen** sinds 22 mei 2024 (opgegaan in de Google ToS), tenzij je een zakelijke overeenkomst hebt. |
| [Gemini Apps: muziek maken](https://support.google.com/gemini/answer/16901237) | Muziek via de Gemini-app (Lyria): 18+, tracks krijgen een onhoorbaar **SynthID**-watermerk. Google positioneert het vooral als persoonlijke expressie. |
| [OpenRouter Terms](https://openrouter.ai/terms) (31 aug 2026) | Eigendom van output volgt de voorwaarden van het model ("Model Terms"); je moet die voorwaarden van Google ook naleven. OpenRouter voegt geen extra beperking toe. |

### Wat dit betekent voor een gratis spel

1. **Verspreiden mag.** Geen van de documenten verbiedt het verspreiden
   van gegenereerde muziek of spraak in een (gratis) spel. Er is geen
   naamsvermeldingsplicht, maar wel het verbod om te doen alsof het door
   mensen is gemaakt: daarom vermelden credits en NOTICE "gemaakt met
   Google Gemini".
2. **Minderjarigen-clausule (API)**: die gaat over het gebruik van de
   *Services* in een app. Het spel roept Gemini niet aan; het speelt
   vooraf gemaakte bestanden af. **Lees dit als: geen live TTS of AI in het
   spel inbouwen**, anders geldt de clausule wel (en ook Steams regels
   voor live-generated content, §8).
3. **Muziek via de Gemini-app**: **ONDUIDELIJK** welk product precies is
   gebruikt (app of API, gratis of betaald abonnement). Bij de app gelden
   de Google ToS en de app-voorwaarden; commercieel gebruik wordt in
   berichtgeving alleen genoemd voor betaalde abonnementen (AI Plus/Pro/
   Ultra). Voor een gratis, niet-commercieel spel is dat geen probleem;
   bij verkoop of advertenties wel opnieuw nagaan.
4. **Auteursrecht op de output**: in de EU vereist auteursrecht een
   "eigen intellectuele schepping" van een mens (HvJ EU, *Infopaq*,
   *Cofemel*). Puur gegenereerde audio is daarom waarschijnlijk **niet
   beschermd**: iedereen mag de mp3's in principe hergebruiken, en een
   CC-licentie daarop kun je moeilijk afdwingen. Wat wél beschermd is: de
   eigen songteksten, scripts, dialogen en het verhaal.
5. **Gelijkenis met bestaande muziek**: Google filtert output tegen
   bestaande opnames, maar dat is geen garantie. Laag risico; Content ID
   op YouTube kan bij trailers wel eens afgaan.
6. **Stemmen**: prebuilt Gemini-stemmen, geen kloon van een echt persoon.
   Ok onder de Prohibited Use Policy.
7. **Preview-modellen**: oudere clips komen van "Preview"-modellen. De
   Gemini-API-voorwaarden verbieden productiegebruik van previews niet
   expliciet; wel "experimental technology". Opnieuw inspreken met het
   GA-model maakt het netjes (zie §2).
8. **Formulering in de licentie** (15 okt): `LICENSE-CONTENT.md` en
   `NOTICE.md` bieden de stemmen en muziek aan onder CC BY-NC-SA 4.0
   "voor zover er rechten op rusten", zeggen dat ze met Google Gemini (via
   OpenRouter) zijn gemaakt en dat wie ze gebruikt zich ook aan de
   voorwaarden van Google en OpenRouter houdt, voor zover die gelden. Zo
   claimen we geen rechten die er misschien niet zijn. Een juridische check
   is gedaan (#38; `docs/PUBLICEREN.md`).

### 4.3 Muziekproduct vastleggen (invullen door de eigenaar, #62)

Welk Google-product de 17 muziekbestanden heeft gemaakt, staat nergens in de
repo en kan een agent niet nagaan (het is geen eigenschap van de mp3's).
Vul dit in en haal dan de zin "Nog open voor de eigenaar" in §2 weg:

| Vraag | Antwoord (eigenaar) |
|---|---|
| Product | Gemini-app (Lyria-muziek) / Gemini API / anders: _… _ |
| Account | gratis / betaald abonnement (AI Plus, Pro, Ultra): _… _ |
| Periode | van _… _ tot _… _ |
| Prompts bewaard? | ja (waar): _… _ / nee |
| SynthID-watermerk | wordt door Google toegevoegd en moet blijven (niet strippen) |

Bij een gratis account of de gratis API-laag mag Google de prompts gebruiken
(zie hierboven); dat is voor een gratis, niet-commercieel spel geen probleem,
maar moet in de AI-disclosure van Steam (§8.3) kloppen. Bij verkoop of
advertenties opnieuw nagaan.

## 5. Privacy

Gecontroleerd in `game/js` en `desktop/`:

- Opslag: alleen `localStorage` (save, instellingen, prestaties,
  kaartfilters, gezien-versie, het foutenlogboek `gde-foutlog`). Geen
  cookies, geen IndexedDB-tracking.
- Foutrapport (`errorlog.js`, sinds 0.25): fouten en waarschuwingen in een
  ringbuffer, alleen lokaal. Per melding de tekst, de stack (paden ingekort
  tot de map van de game, gebruikersmappen weg), versie, verhaalstap, een
  paar instellingen en de GPU-klasse. Niets wordt verstuurd; de speler kan
  het kopiëren of (desktop) als bestand opslaan en zelf meesturen.
- Netwerk: alle `fetch()`-aanroepen gaan naar eigen bestanden
  (`manifest.json`'s, `stad.json`, de kaarttegels, muziek,
  `CHANGELOG.md`). **Geen telemetrie, analytics, crashrapportage of
  update-check.** Geen `speechSynthesis` (die kan in Chrome tekst naar
  Google sturen).
- Browserversie: bij het laden haalt de pagina three.js van **jsDelivr**
  en Bebas Neue van **Google Fonts** (beide zien het IP-adres van de
  speler). Een Duitse rechter (LG München, 20-01-2022) vond Google Fonts
  vanaf Google-servers in strijd met de AVG. **Advies voor de
  browserversie/GitHub Pages**: three.js en het font zelf hosten, net als
  de desktopbuild al doet (`desktop/build.mjs` stap 1-4 kan dat ook voor
  een Pages-build).
- Desktop: na `build.mjs` laadt niets meer van internet (de build checkt
  dat). Externe links gaan via `shell.openExternal` naar de standaard-
  browser. `start.bat` gebruikt de ingebouwde PowerShell; er wordt niets gedownload.

**Voorgestelde privacyverklaring (één regel)**, staat nu ook in *Over*:

> GDE Groningen bewaart je voortgang en instellingen alleen op je eigen apparaat; er
> gaat niets naar een server, geen account, geen tracking, geen statistieken.
> Fouten komen in een logboek op je eigen apparaat, dat je zelf kunt kopiëren.

(Voor de browserversie, zolang de CDN's blijven: "…, behalve dat de
browserversie bij het laden three.js en het lettertype ophaalt bij jsDelivr
en Google Fonts.")

## 6. Parodie, merken en echte personen

### 6.1 Parodie op een bestaande gamereeks (grootste risico)

De rechthebbende van de geparodieerde reeks is actief in merkenzaken
(oppositions bij het USPTO, DMCA-takedowns tegen mods en fanprojecten).

| Element | Bevinding | Risico | Voorstel |
|---|---|---|---|
| Naam | De naam is sinds 0.24 "GDE Groningen – Zomer vol misdaad": Nederlands, geen romeins cijfer, geen woordovereenkomst met de geparodieerde titel. | laag | **gedaan** (0.24), zie §8.2 |
| Logo (`.gde-logo`) | "GDE" in Big Shoulders Display, GRONINGEN op een groen plaatsnaambord, "Zomer vol misdaad" eronder. Geen romeins cijfer, geen zonsondergangverloop, geen lettertype van de rechthebbende. | laag | **gedaan** (0.24), zie §8.2 |
| Fonts | Bebas Neue, Big Shoulders Display en Arial Narrow; geen lettertype van de rechthebbende (ook niet in de historie) | laag | zo houden |
| Trailer en naamkaarten | Trailerparodie met freeze frames en namen, letterbox. Stijl, kleuren, muziek en tekst zijn eigen. Een opzet of format is niet beschermd. | laag | ok; geen muziek of tekst van het origineel citeren |
| Disclaimer | ontbrak | — | **toegevoegd**: laadscherm, startscherm, *Over*, aftiteling, README, NOTICE |

### 6.2 Merken en bedrijfsnamen in het spel

| Naam | Waar | Echt merk? | Gedaan / voorstel |
|---|---|---|---|
| **Sikkom** (146×: nieuwsticker, SMS-afzender, Radio Grunn "Sikkom-nieuws", `audio/sikkom/`, `sikkomfeed.js`) | overal | **ja**: sikkom.nl, Groningse nieuwstitel van Dagblad van het Noorden / Mediahuis ([OOG](https://www.oogtv.nl/2025/11/dagblad-van-het-noorden-moet-bezuinigen-mediahuis-wil-meer-videos-van-sikkom/)). Het spel liet "Sikkom" berichten over geweld en politie brengen. | **opgelost** (3 okt): de nieuwssite heet nu **Kiekdoar** ("kijk daar"): app, berichten, TV, nieuwslezers, voetgangers en alle ingesproken regels. Interne namen (`sikkomfeed.js`, app-id `sikkom`) bleven, die ziet de speler niet. Het scherm "Sikkom." bij een net mislukte missie blijft: dat is het Groningse woord voor "bijna" (Schierste Grunneger Woord 2024), geen verwijzing naar de site. |
| **Radio Grunn** | autoradio, 14× in code + audio | lijkt sterk op **Grunn FM** (echte commerciële zender, FM 89.1, [grunn.fm](https://grunn.fm)) | **opgelost** (3 okt): heet nu **Radio Proat** ("Radio Nachtstreek" bestond al als zender van Rikus); idents opnieuw ingesproken |
| **Bakkie Peut** (tankstation Pleiadenlaan, `thuis3d.js`) | bord in de wereld | **ja**: Peut is een echte tankstationketen en "Bakkie Peut" is hun koffie ([peut.nl](https://www.peut.nl/)); groen/limoen huisstijl | **aangepast** naar **"Bakkie Prut"**, en het bord is nu petrolblauw met een okergele streep in plaats van groen/limoen |
| "Hema-uitverkoop" (`ownedvehicles.js`, beschrijving klusbus) | tekst | ja | **aangepast** naar "Wiebel-uitverkoop" (de bestaande Wibra-parodie) |
| Albert Hijgt, DUMBO, Kruidvet, Blokkie, AKZIE, Wiebel, Bakker Bert (`paddepoel3d.js`) | gevelborden | parodieën op AH, Jumbo, Kruidvat, Blokker, Action, Wibra, Bakker Bart | parodie ok. **Kleuren verschoven** (3 okt), niet meer de exacte huisstijl: Kruidvet pruimpaars `#a83a8c` (was Kruidvat-roze `#e2007a`), Albert Hijgt donkerblauw `#2d5c9e`, DUMBO amber `#e9a419`, Blokkie roestrood `#b84a26` (was Blokker-rood `#e30613`), Wiebel framboos `#c43a5a`. AKZIE was al omgekeerd (blauwe letters op wit). "Dumbo" is ook een Disney-naam, maar in een andere betekenis. |
| EIKEA | woonwarenhuis, blauw | parodie op IKEA | laag. IKEA treedt soms op tegen parodieën; geel-blauw niet combineren. |
| Fjord Escapade / Fjord Frituur | auto en foodtruck | parodie op Ford Escort | laag; geen Ford-ovaallogo gebruiken |
| Voertuigmerken (`vehiclenames.js`) | HUD | verzonnen (Dollard, Hunze, Wadden…) | ok |
| Winkelketens (`shops.js`): Pang & Zo, Nait Duur, Rook & Geluk… | | verzonnen | ok |
| Kraskaarten en loten bij Rook & Geluk (`shops.js`, `shopmodels3d.js`): Stadsloterij-lot, "Grunneger Gokje", Duivenkraslot | winkelmenu, productkaartjes | parodie op de Staatsloterij en de kraslotenserie van de Nederlandse Loterij | **parodie houden**: verzonnen namen, eigen kleuren (crème/rood, roze, blauwgrijs, niet Staatsloterij-oranje), geen logo, geen echte trekkingsdata of slogans. Nooit "Staatsloterij", "Lotto", "Nederlandse Loterij" of "Postcode Loterij" gebruiken. |
| Nachtstreek | radiozender | niet gevonden als echte zender | ok |
| Euroborg, Gasuniegebouw, Martinitoren, UMCG, Forum | landmarks | echte gebouwen | ok (openbare gebouwen als decor) |
| Gronings Ontzet, KEI-week, Noorderzon | evenementen | echte evenementen | ok (feitelijk decor). Noorderzon is een festivalnaam; geen logo gebruiken. |

### 6.3 Echte personen

- Geen bekende levende personen gevonden in code of teksten (gezocht op
  politici, BN'ers, sporters, burgemeester, koningshuis).
- **Tammo en Tessa** zijn eigen, verzonnen personages (besluit eigenaar,
  15 okt 2026). De aftiteling noemt ze als personages, niet meer "als
  zichzelf"; de code-opmerking over een echte auto is al eerder weg. Houd
  uiterlijk, catchphrases en grappen ver van bestaande Groningse typetjes
  en influencers. Oudere versies legden een link; die is uit de historie gehaald:
  zie `docs/PUBLICEREN.md`.
- Huisartsenpraktijken uit OSM (bijv. "Huisarts van de Riet") waren
  respawnplekken. **Opgelost** (3 okt): ze heten nu "Huisartsenpost <wijk>"
  (`stad.json`, vroeger `add_police_stations.py` en `citymap.json`).
- Echte horecanamen (OSM): **opgelost** voor meldingen (3 okt). Meldingen,
  de bestelprompt en de kroegentocht gebruiken verzonnen cafés (Café De
  Lallende Koe, Kroeg 't Scheve Toorntje …); de kaart en de zoekfunctie
  houden de OSM-namen (feitelijk, laag risico).
- "Schipper Wiebe", "Bommen Berend" (historisch: de bisschop van Münster,
  1672): verzonnen of historisch, ok.

## 7. Licentie

**Gekozen door de eigenaar (15 okt 2026):** code **GPL-3.0-or-later**
(`LICENSE`), eigen creatieve inhoud **CC BY-NC-SA 4.0**
(`LICENSE-CONTENT.md`, met de mappen), kaartdata blijft **ODbL**, de naam
GDE en het logo **alle rechten voorbehouden**, werk van derden houdt zijn
eigen licentie (`NOTICE.md`). Dat lijkt het meest op optie C hieronder,
met ShareAlike voor de inhoud.

Aanvullend (15 okt):

- **Teksten in codebestanden**: dialogen en verhaalteksten in de
  JavaScript-bestanden die `LICENSE-CONTENT.md` noemt (`game/js/*lines.js`,
  `subtitles.js`, `storyarc.js`, `missionstory.js` …), en elke ingesproken
  regel, vallen onder CC BY-NC-SA; de code en de interfaceteksten onder de
  GPL (`LICENSE-CONTENT.md#teksten-in-codebestanden`).
- **AI-audio**: CC BY-NC-SA "voor zover er rechten op rusten", met
  verwijzing naar de voorwaarden van Google en OpenRouter (§4, punt 8).
- **Bijdragen**: bijdragers houden hun auteursrecht, maar geven NatusPella
  een eeuwigdurende, onherroepelijke licentie om hun bijdrage te gebruiken,
  onder een andere licentie uit te brengen en te verkopen (bijv. een
  betaalde Steam-versie), met een `Signed-off-by`-regel per commit
  (`CONTRIBUTING.md`).

Stand en open punten:
`docs/PUBLICEREN.md`.

De oorspronkelijke opties, ter achtergrond:

| Optie | Code | Inhoud (verhaal, teksten, ontwerp) | AI-audio | Kaartdata | Voor | Tegen |
|---|---|---|---|---|---|---|
| **A (aanbevolen)** | **MIT** | **CC BY-NC 4.0** | "gemaakt met Google Gemini, geen rechten geclaimd" | ODbL | Code herbruikbaar (sluit aan bij three.js); verhaal en personages niet commercieel te kopiëren; eerlijk over AI | Twee licenties uitleggen |
| B | MIT | CC BY-NC-SA 4.0 | idem | ODbL | Afgeleide fanwerken moeten ook open blijven | strenger voor remixers |
| C | GPL-3.0 | CC BY-NC 4.0 | idem | ODbL | Forks moeten open blijven | GPL past minder bij losse webcode; Steam-forks moeten broncode geven |
| D | Alles voorbehouden ("All rights reserved"), wel publiek zichtbaar | — | — | ODbL | Maximale controle | Niemand mag forken of bijdragen; GitHub-publiek zonder licentie is verwarrend |

Aanbeveling **A**, met deze indeling in een toekomstig `LICENSE`/README:

- `game/js/`, `game/index.html`, `desktop/`, `scripts/` → MIT.
- `docs/verhaal/`, `docs/personages.md`, dialogen en teksten in
  `game/js/*lines*.js` en `missionstory.js` → CC BY-NC 4.0. (Teksten
  staan in JS-bestanden; noem ze expliciet, of laat MIT voor de code gelden
  en CC voor "verhaal, personages, dialogen en ontwerp".)
- `game/audio/**` → "gemaakt met Google Gemini; voor zover er rechten op
  rusten: CC BY-NC 4.0".
- `game/stad.json`, `game/mapextras.json`, `game/ommeland.*`,
  `data/**` → ODbL 1.0, © OpenStreetMap-bijdragers.
- Merknamen GTE/GDE en het logo: uitgezonderd ("niet onder deze licenties").
- Derden: zie `NOTICE.md`.

## 8. Steam

Steam Direct kost **$100 per app**, ook voor een gratis spel; die kom je pas
terug na $1.000 omzet, dus bij een gratis spel nooit
([Steam Direct](https://partner.steamgames.com/steamdirect)).

### 8.1 Wat Steam juridisch verandert

- **Distributie via een winkel** maakt het moeilijker om "gratis hobby,
  geen economisch verkeer" te zeggen. Een merkhouder kan bij Valve een
  klacht indienen; Valve haalt de pagina dan offline tot het is opgelost.
  Parodie-verweer werkt bij Valve meestal niet (voorbeelden: de
  Rimworld-mod "Rimdeed", "Piccled Ricc"). De reviewchecklist zelf kijkt
  niet naar merken ([Review process](https://partner.steamgames.com/doc/store/review_process)),
  dus het risico komt ná publicatie, via een klacht.
- In de **Steam Distribution Agreement** garandeer je dat je alle rechten
  hebt en vrijwaar je Valve. Een merkklacht is dan jouw probleem.
- **AI-disclosure** wordt openbaar op de storepagina.
- **Leeftijdsclassificatie** is verplicht voor Duitsland (anders niet
  zichtbaar daar) en wordt gemaakt uit de content survey.
- **Echte naam en adres**: identiteits- en belastingcontrole bij Valve;
  onder de EU-Digital Services Act kan de status "handelaar" gevraagd
  worden, met publieke contactgegevens. **ONDUIDELIJK** hoe Steam dit voor
  gratis spellen van particulieren invult: nagaan tijdens onboarding.

### 8.2 Nieuwe naam: "GDE Groningen – Zomer vol misdaad"

Gekozen door de eigenaar: **GDE** = *Grootste Diefstal Ever*, vaste
reeksnaam; per deel een plaats of provincie plus ondertitel ("GDE
Groningen – Zomer vol misdaad", later bijv. "GDE Drenthe", "GDE
Leeuwarden"). Doorgevoerd in 0.24 (branch `claude/gde-naam`): spel, logo,
appnaam, releasebestanden, README. Sinds 0.29 ook de interne namen
(`gde-*`-sleutels, appId `nl.natuspella.gde-groningen`, userData-map
`GDE Groningen`), met een eenmalige kopie van de oude, zodat saves blijven
werken (ARCHITECTURE.md, "Name and logo").

**Conflictcheck** (3 okt 2026, via webzoekopdrachten; de registers van
[EUIPO/TMview](https://www.tmdn.org/tmview/), [BOIP](https://register.boip.int/)
en [WIPO Global Brand Database](https://branddb.wipo.int) konden niet
geautomatiseerd doorzocht worden, zie de handmatige stap hieronder):

- **Steam, itch.io, Google Play, App Store**: geen game of app met de naam
  "GDE" of "Grootste Diefstal Ever" gevonden. Wel vergelijkbare maar andere
  namen: GDevelop (game-engine, ook op Google Play en itch), "GDeavid"
  (itch-ontwikkelaar), en Engelse titels met "Greatest … Heist" (*The
  Greatest Penguin Heist of All Time*, Steam). Geen conflict.
- **"Grootste Diefstal Ever"**: alleen nieuwskoppen ("grootste diefstal
  ooit", Bybit, Antwerpse diamantroof). Geen merk, geen spel. Het is een
  beschrijvende uitdrukking: zelf moeilijk als merk te beschermen, maar ook
  niet van iemand anders.
- **"GDE"**: bekend als afkorting van **Google Developer Experts** (een
  Google-programma, geen spel of software-product). Andere waren/diensten,
  klein verwarringsrisico. Verder generieke afkortingen.
- **Handmatige stap vóór registratie of Steam** (15 minuten): in TMview en
  het BOIP-register zoeken op `GDE`, `G.D.E.`, `Grootste Diefstal` en
  `Diefstal Ever`, Nice-klassen 9 (software, games) en 41 (entertainment).
  Let op beeldmerken met "GDE" en woordmerken met vergelijkbare
  drieletter-combinaties.

**Parodierisico**: van **hoog** (oude naam) naar **laag**.

- Weg: de Engelse titel, het romeinse cijfer en de koppeling aan een
  aangekondigde game. "Grootste Diefstal Ever" is een eigen,
  Nederlands-Engelse uitdrukking, geen vertaling.
- Blijft: drie letters plus plaats en ondertitel, en het genre
  (open-wereld misdaad). Genre en patroon zijn niet beschermd, en de
  letters verschillen visueel en fonetisch genoeg. Een beroep op
  ongerechtvaardigd voordeel van een merk met reputatie (art. 2.20 lid 1
  sub c BVIE, art. 9 lid 2 sub c UMVo) is zonder woordovereenkomst en met
  een eigen logo zwak.
- Het risico stijgt weer door: lettertypen, kleurverlopen, stapellogo's of
  loadingscreen-artwork in de stijl van het origineel, een romeins cijfer,
  en namen van andere games of uitgevers in storeteksten, tags of
  capsules.
- Een licht parodie-knipoog mag blijven (bijv. in een trailer), zolang
  naam en logo op zichzelf staan.

**Logorichting die duidelijk eigen is**:

- **Lettertype**: **Big Shoulders Display** (Black of ExtraBold;
  [Google Fonts](https://fonts.google.com/specimen/Big+Shoulders+Display),
  SIL OFL 1.1). Smal en hoekig, gemaakt voor stadsborden (Chicago); totaal
  anders dan ronde, zware display-letters. Past bij Bebas Neue in de UI.
  Alternatieven onder OFL: **Archivo** (Condensed Black) of **Oswald**
  (Bold). Vermijd ronde, zware display-letters zoals Bowlby One of
  Rammetto One.
- **Opbouw**: "GDE" groot als monogram, de plaatsnaam ("GRONINGEN") in een
  groen balkje of als **Nederlands plaatsnaambord** (rechthoek met
  afgeronde hoeken, witte rand); de ondertitel "Zomer vol misdaad" klein
  in een schreefloze cursief. Vervolgdelen wisselen alleen het bord.
- **Kleur**: de bestaande Gronings-groene huisstijl (`#1e9e56`,
  `#3fc97a`, crème `#f0ede4`) op donker. Geen zonsondergangverloop.
- **Eigen beeldelement**: een eierbal als punt of embleem (bijv. de "D"
  of de stip boven de i in een sublabel), of het silhouet van de
  Martinitoren. Dat maakt het herkenbaar en duidelijk eigen.
- Nieuwe font meeleveren betekent: OFL-tekst toevoegen in `licenses/` en
  in `NOTICE.md`, en `desktop/build.mjs` laten vendoren zoals Bebas Neue.

**BOIP-registratie (optioneel)**: online depot Benelux **€244 voor één
klasse**, 2e klasse +€27, vanaf de 3e +€81 per klasse
([BOIP](https://support.boip.int/hc/nl/articles/23546410404497-Wat-kost-een-merkregistratie));
klassen 9 en 41 samen dus ca. **€271**. Geldig 10 jaar in België,
Nederland en Luxemburg; daarna verlengen. Beschermt: het exclusieve recht
op het teken voor die klassen, zodat niemand anders een verwarrend gelijke
spelnaam kan gebruiken; maakt een klacht bij Steam, itch of app stores
tegen kopieën eenvoudiger. Beschermt **niet** tegen claims van oudere merkhouders
(registratie is geen vrijbrief), en na publicatie kunnen anderen twee
maanden oppositie instellen: registratie maakt de naam zichtbaar voor
merkbewakingsdiensten. Een woordmerk "GDE" (drie letters) en
"Grootste Diefstal Ever" (beschrijvend) zijn zwak; een **beeldmerk** (het
logo met "GDE") is het sterkst en het nuttigst voor een reeks. Voor een
gratis hobbyproject is registratie niet nodig; het wordt nuttig vóór een
Steam-release of merchandise. Een EU-merk (EUIPO) begint bij €850.

### 8.3 AI-disclosure in de Steam content survey

Valve onderscheidt *pre-generated* (gemaakt tijdens ontwikkeling, zit in
het spel) en *live-generated* (tijdens het spelen); alleen content die
spelers zien of horen en marketingmateriaal hoeft gemeld te worden
([Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey),
[PC Gamer, jan 2026](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)).
GDE Groningen heeft alleen pre-generated content. Voorstel voor de tekst:

> **Pre-generated:** All music (radio station songs, chase loops and the
> theme song) was generated with Google Gemini. All character voices were
> generated with Google Gemini text-to-speech, from scripts written by the
> developer. One 3D landmark model (the Martini Tower) was generated with
> Anthropic Claude. Code assistance from AI tools was also used during
> development. The story, characters, dialogue and lyrics are written by the
> developer.
>
> **Live-generated:** None. The game makes no AI calls while running; all
> content ships with the game.

(Of het code-hulpje gemeld moet worden: Valve zegt van niet, maar een
zin erover kan geen kwaad. Als er ook AI-afbeeldingen in de capsules of
trailer komen, die ook noemen.)

### 8.4 Leeftijdsclassificatie (content survey / IARC-achtige vragen)

Steam doet niet mee met IARC zelf; de content survey levert de ratings
voor o.a. Duitsland (USK-zelfclassificatie via Valve). Antwoorden die
voor dit spel waarschijnlijk "ja" zijn (controleren met de eigenaar):

- **Geweld**: realistisch ogende mensen; vuurwapens (wapenwinkel "Pang &
  Zo", `combat.js`) tegen iedereen, ook voorbijgangers; bloed en
  rondvliegende ledematen (`gore3d.js`, standaard aan, uit te zetten);
  burgers en agenten gaan dood; explosies; auto's stelen en aanrijden. De
  volledige antwoorden staan in `docs/LEEFTIJD.md`.
- **Misdaad** als kern van de gameplay (overvallen, heist, politie-
  achtervolging).
- **Alcohol/drugs**: biertjes in de kroeg, dronken effect (`drunk.js`).
  Geen roken: "Rook & Geluk" (Tabak & loterij) verkoopt kranten, snoep,
  kraskaarten en loten, geen tabak.
- **Gokken**: gesimuleerd, ja. Kraskaarten en loten bij Rook & Geluk, met
  geld uit de game; geen echt geld, geen lootboxes. De namen blijven
  parodieën (zie de merkentabel hierboven).
- **Taal**: grof taalgebruik? (nagaan in de dialogen).
- **Seksuele content**: kus in het verhaal; geen naaktheid (nagaan).
- **Interactie/aankopen**: geen online, geen chat, geen in-app aankopen,
  geen gebruikersdata.

Verwachte uitkomst: **PEGI 18 / USK 18** (zie `docs/LEEFTIJD.md`): de
eigenaar heeft gekozen voor 18+. Bloed en ledematen, het doden van
burgers en het gesimuleerde gokken geven elk al 18. De Gemini-API-regel
over minderjarigen (§4) past daar goed bij.

### 8.5 Overeenkomsten, belasting en identiteit (hoog niveau)

- **Steamworks-account** met de **Steam Distribution Agreement** (SDA):
  licentie aan Valve om te verspreiden, garanties over rechten, vrijwaring,
  privacy (AVG), support en omzetdeling (30%, n.v.t. bij gratis).
- **Identiteitscontrole** door een externe partij (2-7 werkdagen) en een
  **belastinginterview** (voor een Nederlandse particulier: formulier
  W-8BEN; NL-VS-verdrag, normaal 0% inhouding). Ook bij een gratis spel.
- **Bank- en betaalgegevens** en de $100 app-fee.
- Optioneel kan het onder een eenmanszaak (KvK) of als particulier; voor
  een gratis spel volstaat particulier. Advertenties of verkoop maken het
  ondernemingsactiviteit (btw, inkomstenbelasting): dan opnieuw kijken.
- Store-assets moeten de eigen titel tonen; geen tags met namen van andere
  games en geen "-achtige" verwijzingen in de beschrijving.

## 9. Beslissingen voor de eigenaar

1. ~~**Licentie** kiezen~~ **gekozen** (15 okt): GPL-3.0-or-later voor de
   code, CC BY-NC-SA 4.0 voor de inhoud, ODbL voor de kaartdata, naam en
   logo voorbehouden (§7).
2. **Naam en logo**: gekozen "GDE Groningen – Zomer vol misdaad" en
   doorgevoerd in 0.24 (logo in Big Shoulders Display met plaatsnaambord,
   spel, `productName`, releasebestanden, README, disclaimer). Sinds 0.29 heten
   ook appId, userData en opslagsleutels GDE (met migratie). Nog doen: de
   handmatige registercheck.
3. ~~**Sikkom** en **Radio Grunn** hernoemen + opnieuw inspreken~~
   **gedaan**: Kiekdoar en Radio Proat (§6.2).
4. ~~**Tammo & Tessa**: echte mensen of niet?~~ **besloten** (15 okt): eigen,
   verzonnen personages; credit aangepast (§6.3).
5. **Esri-luchtfoto**: uit de repo (15 okt); ook uit de historie gehaald (zie `docs/PUBLICEREN.md`).
6. ~~**Oudere TTS-clips** opnieuw maken en loggen~~ **gedaan** (§2).
7. **Browserversie**: three.js en Bebas Neue zelf hosten (privacy).
8. **Muziekbron** vastleggen: Gemini-app of API, welk abonnement (§4.3).
9. **Steam**: wel of niet ($100), en dan BOIP-registratie wel of niet
   (ca. €271 voor klassen 9 en 41).
10. Leeftijdsadvies (18+) in README en storepagina.
