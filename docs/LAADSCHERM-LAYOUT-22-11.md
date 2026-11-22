# Laadscherm: layout zonder overlap (22-11)

Naslag bij [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) (DS3, "Beeld en tekst") en [.specs-fire/standards/ui-taal.md](../.specs-fire/standards/ui-taal.md). De spec is het *hoe*; dit bestand is de meting en het besluit. Zie ook [LAAD-STREAMING-LOD.md](LAAD-STREAMING-LOD.md) voor wat het laadscherm wacht. Issues: #1069 (laadscherm) en #1002 (DS3-schermen); beide blijven open voor een hertest in het echte spel.

## Het probleem

Eigenaar, 1280x720: op het laadscherm lag het groene label "NAAR" over de tagline "ZOMER VOL MISDAAD" onder het logo, de bestemming en de tag zaten op het logokaartje, en de pagina oogde rommelig.

## Oorzaak (CSS)

`loadscreen.css` zette drie blokken op vaste afstanden in dezelfde stage, los van elkaar:

- `.ls-brand` met `top: 90px` (logo, 167 px lettergrootte, ruim 250 px hoog en gedraaid);
- `.ls-card` met `bottom: 200px` (label "Naar", plaats van 84 px, tag);
- `.ls-bottom` met `bottom: 70px`.

De stage is het HUD-vak: het venster gedeeld door `--ui` en teruggezoomd. Het logo en de kaart schalen dus niet mee met de hoogte van dat vak, maar de afstanden van boven en onder wel. Op 1280x720 met `--ui` 1 is het vak 720 px hoog: het logo eindigt op ongeveer 330 px, de kaart begint op ongeveer 360 px min de gedraaide en geschaduwde randen, en "NAAR" (18 px, 4 px schaduw) liep over de onderste regel van het logo. Met een grotere interface (1,25 of 1,5 maal) wordt het vak 576 of 480 px hoog en schuiven de twee blokken dwars door elkaar: de plaatsnaam lag dan midden over "GRONINGEN". Het label "Naar" was bovendien een los blokje (`.ls-kick`), geen deel van de bestemming. Het bootscherm had hetzelfde type fout (`top: 72%`, vast 170 px logo, statusregel zonder grens).

## De nieuwe layout

Eén stroom in plaats van drie hoeken (`game/js/loadscreen.css`, markup in `loadScreenHtml` in `game/js/loadscene.js`):

```
.ls-stage   kolom met padding en --ls-gap
  .ls-main    grid, twee kolommen
    .ls-left    kolom, justify-content: space-between
      .ls-brand   het logo (gedraaid, met ruimte eronder)
      .ls-card    "Naar <plaats>" als één bord: groene strook, plaats, tag
    .ls-pic     het plaatje (gedraaid, met ruimte voor draai en schaduw)
  .ls-bottom  vaste zone: balk en één statusregel (ruimte voor twee regels)
```

- Alles schaalt vanaf één getal, de stagehoogte `--ls-h`: de tekstgrootte van het vak (`--ls-fs`, 14 tot 20 px), het logo (5 tot 9,2 em, ook begrensd door de kolombreedte), de randen en `--ls-gap` (24 tot 40 px, nooit minder).
- "NAAR" is de groene strook bovenop het bord van de bestemming. Het bord is zo breed als zijn inhoud en nooit breder dan de kolom; plaats en tag staan eronder. Bij een opgeslagen spel staat er "Verder in".
- Een lange plaatsnaam krimpt eerst (lettertype volgt de kolombreedte en de naamlengte `--n`, ondergrens 2,5 em ofwel 35 px) en eindigt daarna in een ellips; de volledige naam staat in de `title`.
- De gedraaide kaartjes (logo, plaatje) draaien nog steeds (`--ds-schuin`, dus 0 bij Rustig drukwerk), maar houden ruimte voor draai en harde schaduw binnen hun eigen vak. Geen box raakt een andere.
- De statusregel blijft de ene `.ls-step` (tekstdieet), met ruimte voor twee regels en afkappen daarna, zodat de zone niet van hoogte verandert als de tekst wisselt ("Wachten op <naam>", "Dit duurt even, niet vastgelopen: ...").
- Snel reizen: alleen het bord in het midden en de balk in de vaste zone. Minder beweging en Rustig drukwerk veranderen alleen beweging en tint, niet de layout.
- Bootscherm (`#loading` in `game/index.html`): het logo schaalt met de stagehoogte (100 tot 216 px), de balk staat nooit lager dan 205 px boven de onderrand (de voetregel met leeftijd en versie) en de statusregel kapt na twee regels af en komt niet tot de rand.

## Meting

`scripts/ui/laadscherm_render.html` rendert het echte DOM met de echte CSS (stijlen en stylesheets uit `game/index.html`, markup uit `loadScreenHtml` en `#loading`), `scripts/ui/laadscherm_meet.mjs` start headless Chrome of Edge als eigen kindproces met een eigen profiel in de tijdelijke map (DevTools-protocol, viewport exact w x h; sluiten met `Browser.close` en op die ene PID), meet de boxen en rekent de marges uit, inclusief harde schaduw en gedraaide omhullende. Geen Electron. Alle maten zijn logische stage-pixels.

Matrix (`--alles`, 102 scenario's): vensters 1280x720, 1366x768, 1920x1080, 2560x1440; interfacegrootte (speler) 1, 1,25 en 1,5 (dus `--ui` tot 2,67; op 1280x720 is het vak dan 1280, 1024 of 853 px breed); bestemmingen Drenthe, Noordlaren, Vierhuizen-Oostpolder, met en zonder tag Kiezelweek; verder Verder in (save), snel reizen, "Wachten op <lange naam>", de lange "niet vastgelopen"-regel, Rustig drukwerk met Minder beweging, en het bootscherm met korte en lange statusregel.

| | voor | na |
|---|---|---|
| scenario's met een fout (reizen en save) | 68 van 82 | 0 van 87 |
| logo tot bestemming, kleinste marge | -263 px (overlap) | 31 px (1280x720, interface 1,5); 52 px bij 1280x720 interface 1 |
| tagline tot "Naar" | -14,6 px (overlap) | 45,9 px |
| bestemming tot plaatje | -211 px (overlap) | 94 px |
| logo tot plaatje | -49 px (overlap) | 43 px |
| bestemming tot balk | 75 px | 17 px (kleinste; altijd groter dan 16 px) |
| snel: bord tot balk | -45 px (overlap) | 136 px |
| bootscherm: logo tot balk | 9,7 px | 27,9 px |
| bootscherm: statusregel tegen leeftijd of versie | -55 px / -14 px (overlap) | 20 px / 65 px |

De melding van de eigenaar (1280x720, interface 1, Drenthe met tag): voor was het logo 36 px over het bord heen en de tagline 14 px onder "NAAR"; na is de marge logo-bord 52 px en tagline-"Naar" 74 px.

Beelden (JPEG, klein) in `docs/beeld-22-11/laadscherm/`:

| voor | na |
|---|---|
| `voor-720p-ui1.0-Drenthe.jpg` | `na-720p-ui1.0-Drenthe.jpg` |
| `voor-720p-ui1.25-Vierhuizen-Oostpolder.jpg` | `na-720p-ui1.25-Vierhuizen-Oostpolder.jpg` |
| | `na-720p-ui1.5-Vierhuizen-Oostpolder.jpg` (de krapste stage, 853x480) |
| | `na-boot-720p-ui1.5.jpg` (bootscherm) |

## Tests

- `node scripts/laadscherm_css_test.mjs`: pure controle zonder browser (stroom in plaats van absolute hoeken, tokens, schaalregels, markup, bootregels).
- `node scripts/laadscherm_layout_test.mjs [--alles] [--png=<map>]`: de meting in een echte browser (29 scenario's, ongeveer 40 s; `--alles` 102). Faalt bij overlap, een marge onder het minimum (logo tot bord 24 px bij een stagehoogte vanaf 640 px, anders 16 px; overige zones 16 px), een box buiten het beeld (12 px rand) of een bestemming onder 34 px. Zonder Chrome of Edge: SKIP met melding.
- Losse beelden: `node scripts/ui/laadscherm_meet.mjs --een=1280x720,1.25,Noordlaren,Kiezelweek --png=<map> [--jpg]` (ook `--kind=boot|save|snel`, `--base=<map>` voor een oude boom).

## Wat nog in het echte spel bekeken moet worden

Niet in Electron gezien (er draaiden al twee runs van andere agents). Te kijken: het laadscherm bij een echte save, snel reizen en een lange sprong; de plaatsnaam uit `placeLabel` (echte namen en wijken); de speciale-dagtag (echte kalender); het bootscherm op een echt laagste venster; de overgang tussen bootscherm en laadscherm (`ls-over`); en een gast die wacht op de gastheer (echte naam). Het plaatje (img/laad) is gemeten met de echte bestanden, maar de bijsnijding (`object-fit: cover`) per afbeelding is nog niet voor alle zeven bekeken.
