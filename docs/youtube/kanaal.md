# YouTube-kanaal: GDE Groningen – Zomer vol misdaad

Alles wat de eigenaar nodig heeft om het kanaal te maken en de twee
trailers te uploaden. **Er is niets geüpload of aangemaakt**: kanaal,
uploads en instellingen doet de eigenaar zelf.

Dezelfde regels als de Steam-pagina (`docs/steam/winkelpagina.md`,
`docs/LICENTIES.md` §8.2): geen namen of merken van andere games of
uitgevers in namen, titels, beschrijvingen, tags of thumbnails, en geen "-achtige"
vergelijkingen. De personages heten **Tammo en Tessa** (besluit van de
eigenaar, 3 okt; zie de checklist voor de oude naam in de game).

---

## Beelden

In [`beelden/`](beelden/), opnieuw te maken met
`nice -n 10 node scripts/youtube_images.mjs` (één devserver en één headless
Chrome, net als `scripts/steam_images.mjs`, waar de helpers vandaan komen).
`--compose` maakt alleen de beelden opnieuw uit de bestaande renders,
`--capture` alleen de vitrine-render.

| Bestand | Formaat | Waar in YouTube Studio |
|---|---|---|
| `profielfoto.png` | 800×800 PNG | Aanpassen › Branding › Afbeelding. YouTube knipt rond: alles staat binnen de cirkel; op 98 px blijft "GDE" leesbaar. |
| `banner.jpg` | 2560×1440 JPEG (~0,4 MB) | Aanpassen › Branding › Bannerafbeelding. Logo, "Zomer vol misdaad" en "Gratis · Nederlands" staan in de veilige zone van 1546×423 in het midden. |
| `banner_veilige-zone.jpg` | idem, met hulplijnen | Alleen ter controle, niet uploaden. Rood = veilig (mobiel), oranje = tablet, geel = desktop, het hele vlak = tv. |
| `watermerk.png` | 150×150 PNG, transparant | Aanpassen › Branding › Videowatermerk ("Einde van video" of "Hele video"). |
| `thumbnail_verhaaltrailer.jpg` | 1280×720 JPEG | Eigen thumbnail bij de verhaaltrailer. |
| `thumbnail_gameplaytrailer.jpg` | 1280×720 JPEG | Eigen thumbnail bij de gameplaytrailer. |
| `bron/vitrine.jpg` | 3840×2160 | De render achter de thumbnails: de Gouden Eierbal **in** zijn vitrine. |

Gecontroleerd tegen de specs van YouTube (okt 2026): banner minimaal
2048×1152, aanbevolen 2560×1440, max. 6 MB, veilige zone 1546×423;
profielfoto 800×800; watermerk 150×150, max. 1 MB; thumbnail 1280×720,
max. 2 MB, JPG of PNG. Eigen thumbnails vragen een geverifieerd kanaal
(telefoonnummer, eenmalig).

**Geen spoilers in de beelden:** de thumbnails tonen de Eierbal op zijn
kussen in de vitrine. Nooit de lege vitrine en nooit het kaartje "Tige
tank!". De vitrine-render komt uit de trailer-shot "De Gouden Eierbal"
(shot 11 van de oude cut, shot 9 van de verhaaltrailer), die de bal sinds
de Steam-trailers zelf in de vitrine toont.

Templates aanpassen: de teksten staan in `IMAGES` in
`scripts/youtube_images.mjs` (bijv. een derde thumbnail met een ander label
en een andere achtergrond uit `docs/steam/beelden/screenshots/`).

---

## Naam en handle

| Voorstel | Handle | Opmerking |
|---|---|---|
| **GDE Groningen** (advies) | `@GDEGroningen` | Gelijk aan de sorteernaam op Steam. Kort en zoekbaar. |
| GDE Games | `@GDEgames` | Als het kanaal ook vervolgdelen (GDE Drenthe ...) krijgt. |
| GDE – Grootste Diefstal Ever | `@GrootsteDiefstalEver` | Lang, maar legt de naam meteen uit. |

Controleer de beschikbaarheid bij het aanmaken. Gebruik een
apart merkaccount (Brand Account), niet het persoonlijke kanaal.

---

## Kanaalbeschrijving

NL (Kanaal › Beschrijving, max. 1000 tekens):

> GDE Groningen – Zomer vol misdaad is een gratis open-wereld misdaadparodie in de echte straten van Groningen. Tammo en Tessa hebben samen precies genoeg geld voor een patatje en willen de Gouden Eierbal stelen voor een frietwagen. Auto's jatten, de ring rond, kermis, kroegen, het Ommeland en een Fries met een plan. Alles ingesproken in het Nederlands, met een flinke scheut Gronings.
>
> Hier vind je de trailers, gameplay en updates. Gratis, offline, geen aankopen in de game, geen advertenties.
>
> GDE staat voor Grootste Diefstal Ever. Een gratis, niet-commerciële fanparodie, niet gelieerd aan of goedgekeurd door een andere uitgever. Stemmen en muziek zijn gemaakt met Google Gemini; verhaal, dialogen en liedteksten zijn van de maker. Kaartdata © OpenStreetMap-bijdragers (ODbL).

EN (one line, onder de NL-tekst of als vertaling van de beschrijving):

> A free open-world crime parody set in the real streets of Groningen. Dutch only, dry as toast.

---

## Links (Kanaal › Links)

| Titel | URL |
|---|---|
| Steam | *(invullen zodra de pagina live is)* |
| itch.io | *(invullen)* |
| Website / GitHub | *(invullen als de repo openbaar is)* |

Tip: maximaal één link in de banner tonen ("Links op banner": 1), de
Steam-link zodra die er is.

---

## Verhaaltrailer

Bron: `game/js/trailer.js`, cut `verhaal` (~80 s), shotlijst in
`docs/steam/trailer.md`. Bestand: `~/Downloads/GDE-Groningen-trailer-verhaal.mp4`
(1080p60, H.264, AAC 48 kHz, `+faststart`), export met
`npx electron . --trailer-cut=verhaal --trailer-video=~/Downloads/GDE-Groningen-trailer-verhaal.mp4`.

**Titel** (max. 100 tekens, de eerste ~60 zijn zichtbaar):

- GDE Groningen – Een zomer in Grunn | Verhaaltrailer *(advies)*
- GDE Groningen – Zomer vol misdaad | Officiële verhaaltrailer

**Beschrijving:**

```
Augustus in Grunn. Tammo en Tessa hebben samen precies genoeg geld voor een patatje. Tessa wil een frietwagen: de Fjord Frituur. In het Groninger Museum ligt de Gouden Eierbal, achttien karaat. En er rijdt een Friese snackkoning met een trekker-limo door de binnenstad.

GDE Groningen – Zomer vol misdaad is een gratis open-wereld misdaadparodie in de echte straten van Groningen. Achttien verhaalmissies, de ringweg, kermis, kroegen, rondvaart en het Ommeland. Volledig ingesproken in het Nederlands, met een flinke scheut Gronings.

▶ Steam: (link volgt)
▶ itch.io: (link volgt)

00:00 Een zomer in Grunn
00:11 Tammo, Tessa en de Fjord Frituur
00:25 De Gouden Eierbal en Jelle Terpstra
00:43 Lange avonden
00:59 28 augustus

Gratis · Nederlands · singleplayer · offline · geen aankopen in de game.

Stemmen en muziek zijn gemaakt met Google Gemini (vooraf gemaakt, geen AI tijdens het spelen). Verhaal, personages, dialogen en liedteksten zijn van de maker. Alle beelden zijn opgenomen in de game.

GDE staat voor Grootste Diefstal Ever. Een gratis, niet-commerciële fanparodie, niet gelieerd aan of goedgekeurd door een andere uitgever. Namen, personages, merken en gebeurtenissen zijn verzonnen; echte straten en openbare gebouwen zijn alleen het decor. Kaartdata © OpenStreetMap-bijdragers (ODbL).

#GDEGroningen #Groningen #indiegame
```

De hoofdstukken volgen `CUT_ORDER` in `game/js/trailer.js` (de shotgrenzen,
naar beneden afgerond). YouTube eist dat het eerste hoofdstuk op
00:00 staat, minstens drie hoofdstukken, elk minstens 10 s.

## Gameplaytrailer

Bron: `game/js/trailer.js`, cut `gameplay` (~63 s, 28 shots, met de echte HUD), shotlijst in
`docs/steam/trailer.md`. Bestand: `~/Downloads/GDE-Groningen-trailer-gameplay.mp4`
(1080p60, H.264, AAC 48 kHz, `+faststart`).

**Titel:**

- GDE Groningen – Gameplaytrailer | Rijden, varen en vliegen door Grunn *(advies)*
- GDE Groningen – Zomer vol misdaad | Gameplay

**Beschrijving:**

```
Zo speelt GDE Groningen – Zomer vol misdaad: een gratis open-wereld misdaadparodie in de echte straten van Groningen, gebouwd uit OpenStreetMap.

Rijden, fietsen, varen en vliegen. Missies met Tammo en Tessa, bijbaantjes (taxi, bus, bezorgen, rondvaartgids), een race op de ringweg, de kermis op de Grote Markt, de heli boven Stad en het Ommeland bij zonsondergang.

▶ Steam: (link volgt)
▶ itch.io: (link volgt)

00:00 Berends bakkie, de pinautomaat en de stuntavond
00:11 Duif, KEI-race, museum en de tankwagen
00:21 Ring Zuid, de kroeg, fatbikes en het water
00:32 Heli, politie en de trekker-limo
00:43 Carbid, bijbaantjes, Ubbo en het weer

Gratis · Nederlands · singleplayer · offline · toetsenbord en muis of controller.

Stemmen en muziek zijn gemaakt met Google Gemini (vooraf gemaakt, geen AI tijdens het spelen). Verhaal, personages, dialogen en liedteksten zijn van de maker. Alle beelden zijn opgenomen in de game.

GDE staat voor Grootste Diefstal Ever. Een gratis, niet-commerciële fanparodie, niet gelieerd aan of goedgekeurd door een andere uitgever. Namen, personages, merken en gebeurtenissen zijn verzonnen; echte straten en openbare gebouwen zijn alleen het decor. Kaartdata © OpenStreetMap-bijdragers (ODbL).

#GDEGroningen #Groningen #gameplay
```

Hoofdstukken: de shotgrenzen uit `CUT_ORDER`, elk minstens 10 s.

## Tags (beide trailers)

YouTube weegt tags licht; titel en beschrijving tellen meer. Max. 500
tekens.

```
GDE Groningen, Zomer vol misdaad, Grootste Diefstal Ever, Groningen, Grunn, Gronings, open world, open wereld, gratis game, free game, Nederlandse game, Dutch game, indie game, parodie, parody, comedy, misdaad, rijden, Martinitoren, Ommeland, Tammo en Tessa, Gouden Eierbal
```

Extra voor de verhaaltrailer: `trailer, verhaaltrailer, story trailer`.
Extra voor de gameplaytrailer: `gameplay, gameplaytrailer, PC game, Steam Deck`.
Niet gebruiken: namen van andere games of uitgevers
(misleidende tags zijn ook tegen het spambeleid van YouTube).

## AI-melding ("Veranderde of synthetische content")

YouTube Studio vraagt bij elke upload (Details › Veranderde content) of de
video realistisch ogende content bevat die met AI is gemaakt of veranderd.
Volgens de hulppagina van YouTube
([support.google.com/youtube/answer/14328491](https://support.google.com/youtube/answer/14328491))
is melden nodig als een echt persoon iets lijkt te zeggen of doen wat hij
niet deed, als beelden van een echte gebeurtenis of plek worden veranderd,
als een realistische scène wordt gemaakt die niet gebeurde, of als
AI-muziek de **hoofdzaak** van de video is. Niet nodig voor
niet-realistische content, animatie, en uitdrukkelijk niet voor
gameplay-beelden van videogames.

**Advies: "Nee" aanvinken** voor beide trailers.

- Het beeld is een gestileerde low-poly game: niet realistisch, en
  gameplay staat bij de uitzonderingen.
- De stemmen zijn prebuilt Gemini-stemmen, geen kloon van een echt persoon
  (`docs/LICENTIES.md` §4 punt 6).
- De muziek is achtergrond bij de beelden, niet de hoofdzaak. **Wel "Ja"**
  bij een losse video waarin een AI-nummer de hoofdzaak is (bijv. het
  titelnummer of een radiozender als muziekvideo).
- Herzien als Tammo of Tessa herkenbaar blijken te verwijzen naar een echte
  maker en de stem of uitspraken op die persoon gaan lijken (zie de
  checklist).

Los van die vraag vermelden de beschrijvingen hierboven toch dat stemmen
en muziek met Google Gemini zijn gemaakt, net als credits, NOTICE en de
Steam-pagina: de voorwaarden van Google verbieden te doen alsof
AI-content door mensen is gemaakt (`docs/LICENTIES.md` §4 punt 1).

Content ID: de Gemini-muziek kan in zeldzame gevallen een claim geven
(`docs/LICENTIES.md` §4 punt 5). Upload eerst privé en wacht de
auteursrechtcheck af (zie het uploadplan).

## Disclaimer

Winkelstijl, zonder merknamen (`docs/LICENTIES.md` §8.2; dezelfde tekst als
`docs/steam/winkelpagina.md` › Disclaimer). Staat al onderaan beide
beschrijvingen:

> GDE staat voor Grootste Diefstal Ever. Een gratis, niet-commerciële fanparodie, niet gelieerd aan of goedgekeurd door een andere uitgever. Namen, personages, merken en gebeurtenissen zijn verzonnen; echte straten en openbare gebouwen zijn alleen het decor. Kaartdata © OpenStreetMap-bijdragers (ODbL).

## Publiek en leeftijd

- **Gemaakt voor kinderen: Nee** (kanaal en elke video). De game is **18+**
  (`docs/LEEFTIJD.md`: bloed en burgers die sneuvelen). De trailers tonen
  dat niet; de beschrijving begint toch met een 18+-waarschuwing.
- **Leeftijdsbeperking op de video:** niet nodig zolang er geen bloed en
  geen geraakte burgers in beeld zijn (zie `docs/youtube/pakket.md`); bij
  twijfel aanzetten.
- Categorie: **Gaming**. Taal van de video: **Nederlands**. Ondertitels:
  Nederlands (de game heeft ze al; als SRT exporteren of automatisch laten
  maken en nakijken), optioneel Engels.
- Licentie: Standaard YouTube-licentie. Opmerkingen: aan, met
  "Mogelijk ongepaste opmerkingen vasthouden".

## Afspeellijsten

| Afspeellijst | Inhoud | Wanneer |
|---|---|---|
| **Trailers** | Verhaaltrailer, gameplaytrailer, later de Steam-cut en launchtrailer | Bij de eerste upload |
| **Gameplay** | Langere gameplay zonder commentaar: missies, ringrace, heli, Ommeland | Zodra er twee video's zijn |
| **Updates en devlogs** | Wat er nieuw is per versie (0.25, 1.0 ...) | Bij de eerste update-video |
| **Shorts** | Korte verticale clips (duivenmodus, pion "Bijna.", Berend "Kon minder.") | Optioneel, na de lancering |

Op de kanaalpagina (Aanpassen › Indeling): de verhaaltrailer als
"Kanaaltrailer voor niet-abonnees", daaronder de afspeellijst Trailers.

## Uploadplan eerste week

Niets gaat openbaar tot de eigenaar het besluit.

| Dag | Stap |
|---|---|
| 1 | Merkaccount en kanaal aanmaken, handle kiezen, telefoonverificatie (nodig voor eigen thumbnails). Profielfoto, banner, watermerk, beschrijving en links (leeg laten tot er een Steam-/itch-URL is). |
| 1 | Verhaaltrailer uploaden als **Privé**. Titel, beschrijving, tags, thumbnail, "Niet voor kinderen", AI-melding "Nee". Wacht de controles in Studio af (auteursrecht/Content ID). |
| 2 | Privé bekijken op telefoon, tablet en tv: banner bijgesneden zoals bedoeld? Thumbnail leesbaar op klein formaat? Hoofdstukken goed? |
| 2–3 | Op **Niet vermeld** (unlisted) zetten en de link delen met een paar meelezers. Feedback op toon, spoilers, merken. |
| 3–5 | Gameplaytrailer maken en hetzelfde traject volgen (privé, dan niet vermeld). |
| zodra de eigenaar besluit | **Openbaar**, alleen als de checklist hieronder helemaal groen is. Eventueel met "Planning" op een vaste tijd (bijv. een vrijdag 17:00). Daarna kanaaltrailer en afspeellijsten instellen. |

## Checklist vóór openbaar

- [x] Tammo en Tessa zijn eigen, verzonnen personages (ROADMAP › Juridisch en publiceren).
- [ ] **Tessa, niet Anita**: de video's tonen de nieuwe naam. De
      trailer heeft een naamkaart "ANITA" (shot 5) en de stemmen kunnen
      de oude naam noemen: opnieuw exporteren nadat de naamswijziging in
      de game zit.
- [ ] **Geen spoilers**: geen lege vitrine en geen kaartje "Tige tank!"
      in thumbnail of eerste seconden. Let op: de verhaaltrailer heeft
      shot 11 (de lege vitrine met het kaartje, 0:37–0:41). Dat is de
      premisse (ook de winkeltekst zegt dat de bal weg is), maar het
      kaartje wijst naar de dader. Besluit van de eigenaar: houden, of
      een cut zonder het kaartje. Geen beelden van de finale op Ontzet.
- [ ] **Geen echte merken** in beeld of tekst: parodiewinkels
      (Kruidvet, Albert Hijgt, ...), Kiekdoar, Radio Proat. Geen
      namen van andere games of uitgevers, en geen oude logo's, in titel,
      tags, beschrijving, thumbnail of video.
- [ ] Disclaimer en AI-vermelding staan in de beschrijving.
- [ ] "Gemaakt voor kinderen: Nee" en AI-melding ingevuld.
- [ ] Geen Content ID-claims na de privé-upload.
- [ ] Steam- en itch-links kloppen of staan op "(link volgt)".
- [ ] Banner op telefoon gecontroleerd (alles binnen de veilige zone).
