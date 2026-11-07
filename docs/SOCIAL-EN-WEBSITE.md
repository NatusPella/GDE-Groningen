# Social preview en websitetekst: voorstel (#72)

Stand: 20 oktober 2026. Het plaatje is gemaakt (`docs/social-preview.png`, hieronder) en de About-tekst en topics staan op GitHub; **uploaden van het plaatje en een website-veld zijn nog niet gedaan** (de repo is privé). Geen namen of
merken van andere games, geen "-achtige" vergelijkingen (LICENTIES.md §8).
Altijd zomer.

## Social-preview-plaatje (GitHub, 1280×640 px, PNG, < 1 MB)

- **Beeld:** een screenshot van de stad in de zomer (Martinitoren of Grote Markt,
  laagstaande zon), links een donkere verloopband voor tekst. Geen bloed, geen
  wapens, geen HUD. Bron: `docs/steam/beelden/` of een nieuwe opname, te maken
  met `scripts/steam_images.mjs` (headless).
- **Tekst op het plaatje:** GDE-logo (Big Shoulders Display, OFL) met de ondertitel
  "Zomer vol misdaad". Eén regel eronder: "Gratis open-wereldkomedie in een
  low-poly Groningen".
- **Veilige zone:** 40 px rondom vrij; tekst binnen de linker 60%.
- **Niet doen:** het woord "GTA", logo's van derden, echte personen of kentekens,
  de Esri-luchtfoto.
- **Gemaakt:** `node scripts/social_preview.mjs` maakt `docs/social-preview.png` (1280×640, 786 KB) uit de in-game luchtrender van de Martinitoren en de Grote Kerk bij zonsondergang (`docs/steam/beelden/bron/luchtfoto.jpg`), met het woordmerk "GDE / Groningen / Zomer vol misdaad" en de regel "Gratis open-wereldkomedie in een low-poly Groningen". Geen HUD, wapens of merken. Andere beelden: `--bg=vismarkt` of `--bg=zonsopgang`.
- **Plaatsen:** Settings › Social preview › Upload an image, alleen door de eigenaar. De instelling is op een privé-repo niet in te vullen door een agent (de ingebouwde browser is niet ingelogd).

## About-tekst (GitHub, max. 350 tekens)

> Gratis open-wereldkomedie in een low-poly Groningen: auto's jatten, kermis,
> kroegen en een Fries met een plan. Three.js + Electron, met webversie. Eigen
> verhaal, verzonnen personages, echte plekken.

Staat op GitHub (20 okt): beschrijving gelijk aan de tekst hierboven, topics `browser-game`, `comedy`, `dutch`, `electron`, `game`, `groningen`, `gronings`, `indie-game`, `javascript`, `low-poly`, `netherlands`, `open-world`, `openstreetmap`, `threejs`, `webgl`. Voorstel was: `threejs`, `electron`, `open-world`, `groningen`, `low-poly`, `comedy`,
`dutch`, `game`, `javascript`. Website-veld: leeg tot er een webversie is gekozen (#57).

## Websitetekst (landingspagina, als er een komt)

**Kop:** GDE Groningen – Zomer vol misdaad

**Ondertitel:** De Grootste Diefstal Ever, in de straten van Groningen.

**Intro:** Twee Stadjers zonder geld willen de Gouden Eierbal stelen voor een
frietwagen. Rijd door de echte straten van Groningen, jat auto's, wip op de kermis,
kruip de kroegen in en ontmoet een Fries met een plan. Het is altijd zomer. Woist ja wel.

**Kenmerken:**
- Een open wereld op de schaal van de stad, met de provincie eromheen
- Verhaal in vijf aktes met verzonnen personages en echte plekken
- Gesproken Nederlands en Gronings; speltekst alleen Nederlands
- Samen spelen met een vriend via een kamercode (na toestemming, geen account)
- Gratis, zonder advertenties, zonder account, zonder telemetrie

**Leeftijd:** bedoeld voor 18+ (misdaad, geweld, gokken, alcohol); zie [LEEFTIJD.md](LEEFTIJD.md).

**Downloads:** pre-releases op GitHub (niet ondertekend; zie README).

**Voet:** Code GPL-3.0-or-later, inhoud CC BY-NC-SA 4.0. Gratis fanparodie, niet
gelieerd aan of goedgekeurd door enige uitgever. Kaartdata © OpenStreetMap-bijdragers
(ODbL). Muziek en stemmen zijn met AI gemaakt. Credits: [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md).

## Beslissen (eigenaar)

1. Is "18+" op de landingspagina gewenst, of alleen in de winkelpagina?
2. Beeld voor het plaatje: Martinitoren of Grote Markt bij zonsondergang?
3. Eigen domein of alleen de GitHub-pagina (dan geen website-veld)?

## Stand 7 november 2026

- **Social preview is er:** `docs/social-preview.png`, **1280×640 px, 806 KB** (ruim onder 1 MB),
  gemaakt met `node scripts/social_preview.mjs` uit de in-game luchtrender. Uploaden is een
  eigenaarshandeling (Settings › Social preview); op een privé-repo is dat niet in te vullen.
- **About en topics staan al op GitHub** (20 okt): de beschrijving hierboven en de vijftien topics.
  Niets aan veranderen zonder akkoord; het website-veld blijft leeg tot #57 een plek heeft gekozen.
- **Landingspagina:** de teksten hierboven zijn de bron voor de website; pas publiceren als de
  eigenaar de webplek (#57) en "18+ op de site of alleen in de winkel" heeft besloten.

### Credits en disclaimer samenvoegen (#72): voorstel

De disclaimer staat nu op drie plekken en noemt de merknamen van de andere game:
`README.md` (rond regel 239), `NOTICE.md` (rond regel 24) en `game/js/credits.js` (regel 9,
`DISCLAIMER`). Voorstel is één tekst, zonder merknamen van anderen (constitution punt 2 en de
Steam-regel "geen merken van anderen"; `text_audit` staat de huidige namen toe, maar dat maakt ze
niet verplicht):

> GDE Groningen – Zomer vol misdaad is een gratis fanparodie, niet gelieerd aan, gesponsord door of
> goedgekeurd door enige andere gameontwikkelaar of -uitgever. Namen, personages, bedrijven,
> merken en gebeurtenissen zijn verzonnen; gelijkenis met bestaande personen of bedrijven berust op
> toeval. Echte straten en openbare gebouwen zijn echt.

Wat er dan verandert: de zinsnede "in het bijzonder niet door Rockstar Games of Take-Two
Interactive, de uitgever van GTA" verdwijnt uit README, NOTICE en de aftiteling; de aftitelregel
"Fanparodie" blijft. Dat is een tekstwijziging in drie bestanden plus de toelichting in
`docs/LICENTIES.md`; **de eigenaar beslist** (het staat op #72). Zegt de eigenaar ja, dan is het
één kleine commit en blijven `text_audit` en de Steam-winkelpagina kloppen.