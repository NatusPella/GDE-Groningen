# Boerderijschermen beeld-eerst (22-11)

Feedback van de eigenaar: de boerderijschermen moeten veel visueler zijn (3D-previews van voertuigen, werktuigen, dieren, gewassen en gebouwen; meer plaatjes en iconen, minder lappen tekst). Dit document is de stand van die ronde: wat er gebouwd is, de tekstmassa voor en na, en wat alleen in beeld te controleren is.
Naslag; de bron voor het *wat* is het bord (#1013, #1005). Specs: `.specs-fire/standards/ui-taal.md` (tekstdieet), `DESIGN_SYSTEM.md` (DS3).

## Wat er is gebouwd

| Onderdeel | Bestand | Wat |
|---|---|---|
| Procedurele previewmodellen | `game/js/farmmodels3d.js` | Koe, schaap, kip, silo, schuur, kas en een gewasveld per gewas (6 vormen). Één samengevoegde geometrie met vertexkleur en één materiaal per model; driehoekenbegroting per model (`FARM_BUDGET`: koe 340, schaap 260, kip 170, silo 260, schuur 260, kas 300, veld 520; gemeten 72 tot 238, veld 252 tot 492). |
| Markup en sleutels | `game/js/farmpicshtml.js` | Node-safe: plaatsvak met groot icoon (`data-fp`), lege staat (plaatje en één zin), grote getallen met icoon, uitleg op verzoek (`<details>`). Sleutels `m:<machine>`, `w:<werktuig>`, `dier:`, `gebouw:`, `gewas:`. |
| 3D-koppeling | `game/js/farmpics.js` | Sleutel naar spec voor de gedeelde previewrenderer; lui vullen van stilstaande plaatjes (max 16 per scherm); één live voorbeeld voor het gefocuste item; opruimen bij sluiten. |
| Previewrenderer | `game/js/vehiclepreview.js` | Nieuwe spec-soort `farm` (naast weapon, person, product, spul). Trekkers, maaidorser en laadmachine gebruiken de bestaande voertuigbouwer (`MACHINE_MODELLEN`), werktuigen `werktuigen3d.js`. |
| Schermen | `game/js/boerderijui.js`, `farmcards.js`, `farmmodel.js` | Plaatjes bij elke rij of kaart van Overzicht, Percelen, Erf, Gewas en Machines; live voorbeeld in een kop bij Machines en Erf; uitleg achter een i-knop; lege staten met plaatje. |
| Menu | `game/js/pausemenu.js` | Bij een ander menuonderdeel of sluiten: wachtrij leeg, plaatjes terug, live voorbeeld weg. |

Prestatieafspraken:
- Eén WebGL-context voor het hele menu: alles gaat via de gedeelde renderer van `vehiclepreview.js` en wordt naar een 2D-canvas gekopieerd (zoals garage en Verhaal). Er is geen context per kaart.
- Lijsten krijgen alleen stilstaande plaatjes (`renderSnapshot`: lui in de rusttijd, gecached, begrensd op 200 en per sleutel één keer getekend); dezelfde sleutel (bijvoorbeeld graan bij vijf percelen) wordt één keer getekend.
- Live 3D bestaat voor één item tegelijk (`.bd-live`), op 30 fps, langzaam draaiend; 'Minder beweging' zet het draaien stil en de fade uit.
- Microanimaties: fade van het plaatje 200 ms (<= 250 ms), niet bij Minder beweging.
- Geheugen: `ruimFarmModel` en `disposeMesh` geven geometrie en materiaal terug; de test telt dat.
- Zonder WebGL blijft het grote icoon staan.

## Tekstmassa: voor en na

Zichtbare tekens per tab in een gevulde boerderij (4 percelen, 2 erven, trekker, maaidorser, aanhanger, ploeg). Zichtbaar is de markup zonder tags en zonder de inhoud van `<details>`. Meetbaar met `node scripts/boerderij_tekstmassa_test.mjs --rapport`; de test bewaakt de limieten en dat er geen lap boven 160 tekens staat.

| Scherm | Voor | Na | Limiet | Wat veranderde |
|---|---|---|---|---|
| Overzicht | 1801 | 1262 | 1400 | Veldkaarten met gewasplaatje en grote getallen (kg en euro), kortere regels, losse alinea's in uitleg op verzoek, lege staat dieren met plaatje |
| Percelen | 1923 | 1669 | 1800 | Plaatje per perceel (akker of weiland), intro en bietentekst in uitleg |
| Erf | 1074 | 909 | 1000 | Plaatje schuur of silo per erf, live voorbeeld, intro in uitleg |
| Gewas | 1745 | 1602 | 1700 | Plaatje per gewas, teeltplan met plaatje, intro in uitleg |
| Machines | 1925 | 1677 | 1800 | Plaatje per machine en werktuig (3D), live voorbeeld, intro en loonwerktekst in uitleg |
| Kasboek | 693 | 554 | 600 | Intro in uitleg |
| Bank | 566 | 491 | 550 | Intro korter, uitleg achter de i-knop |
| Totaal | 9727 | 8166 | | -16% |

Land en bedrijf (`bezitui.js`, alleen gemeten, nog niet herontworpen): Overzicht 801, Bedrijven 412, Te koop 250 tekens in dezelfde testopstelling (limieten 1200, 700, 500 als terugvalbewaking). Die schermen hebben al weinig tekst; hun plaatjes (pand, perceel, winkel) volgen in een eigen ronde.

Lappen (>160 tekens) voor deze ronde: een in Machines (de intro van 176 tekens). Na: nul.

## Niet gedaan in deze ronde (eerlijk)

- Personeel, Verzekering en Bestrijding, Keten/Productie, Afnemers/Markt en de Snackwagen-tab bestaan als schermen buiten `boerderijui.js` (`farmstaff.js`, supply-chain en Snackwagen-paneel) en zijn niet herontworpen. De tekstmassa daarvan is niet gemeten.
- Het Overzicht toont geen trekkerplaatje bij de machinelijst van de kaart als de machine geen type heeft (oude saves); dan staat het icoon.
- Gewassen op de kaarten tonen de soort (een veldvorm per gewas), niet het groeistadium; de stadia zitten al in de wereld (`farmcrops3d.js`).
- Dieren-previews zijn drie modellen (koe, schaap, kip); andere dieren hebben geen model.
- De cijfers van Kasboek en Bank zijn nog geen grote getallen met icoon (`getalHtml` is er wel, de bestaande tests leggen het rasterformaat vast).

## Samen spelen

Previews zijn lokaal: ze raken geen spelerdata, gaan niet over het net en hebben geen host- of gastgedrag. Elke speler ziet zijn eigen plaatjes; de data erachter (percelen, machines, opslag) blijft per speler (#429). Een gast ziet dezelfde schermen als de host in zijn eigen spel.

## Alleen in beeld te controleren (latere Electron-ronde)

Niets hiervan is door de agent in beeld bekeken; alles is getest met node, echte three en nepelementen.

1. Elk model: koe, schaap, kip, silo, schuur, kas en de zes gewasvelden. Herkenbaar? Goed gekleurd? Goed in beeld gebracht (camera, schaal) in het kader van 144 x 90 px en 420 x 180 px? Staat het niet te donker of afgesneden?
2. Trekkers, maaidorser, laadmachine (voertuigbouwer) en alle werktuigen: kijken ze vanuit de driekwartshoek goed, en kloppen schaal en positie in het kader? De werktuigen kijken naar +z; de hoek 0,7 is nog niet beoordeeld.
3. Laadtijd: komen de plaatjes in de lijsten zonder zichtbare haperingen? Eerste keer open: icoon, dan fade naar plaatje. Percelen toont 12 plaatjes met 2 sleutels.
4. Het live voorbeeld bij Machines en Erf: draait langzaam, volgt de focus (toets of muis) op een rij, stopt bij Minder beweging. Valt de framerate van het pauzemenu terug?
5. Sluiten en heropenen van het menu: geen restplaatjes, geen extra WebGL-context (te controleren in het GPU-overzicht).
6. Controller en toetsen: de bestaande knoppen zijn onveranderd (zelfde tabvolgorde, listnav); de plaatjes zijn niet focusbaar. Klopt de volgorde bij Q en E nog?
7. Smalle schermen (onder 720 px): de plaatjes krimpen; past alles?
8. De i-knop (Uitleg) opent en sluit, ook met toetsenbord en controller.
9. DS3: past de randkleur, de achtergrond van de plaatsvakken (`--panel2`) en de grote getallen in de zeefdruk-stijl?
10. Leeg: geen machines, geen dieren: plaatje en één zin.

## Tests

- `node scripts/farmmodels3d_test.mjs`: per model driehoeken binnen begroting, één mesh en materiaal, geen NaN in positie, normaal en kleur, eindige bounding box met de voeten op de grond, opruimen (dispose-tellers, geen lek over 40 rondes), sleutels en specs voor de hele catalogus, lui vullen (max 16 per ronde, niets dubbel, wachtrij leeg bij sluiten).
- `node scripts/boerderij_tekstmassa_test.mjs`: de limieten per scherm en geen lap boven 160 tekens, ook voor Land en bedrijf.
- Bestaande tests: `boerderijui_percelen_test`, `boerderijui_machines_test`, `boerderijui_rust_test`, `farmstatus_test`, `farmmodel_test`, `ds3_dekking_test`, `ds3_schermen_test`, `tekstdieet_test`, `keycap_maat_test`.
