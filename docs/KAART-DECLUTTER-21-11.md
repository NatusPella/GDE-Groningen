# Kaart: declutter van plekken per zoom (21-11)

Eigenaar (21-11): "Op zoom 6 zie je heel veel restaurants in het centrum. Wat op zich wel klopt, maar nu overspoelt het een beetje op dit niveau." Gemeten met de echte horeca van het centrum (game/facilities.json): op zoom 6 stonden 73 iconen in beeld, nu 12 (groepen met aantal).
Stand: gebouwd en met pure tests gedekt (`scripts/kaartdeclutter_test.mjs`); **nog niet in het echte spel bekeken** (geen Electron). Het beeld is een mock: `node scripts/kaartdeclutter_beeld.mjs`.

## De regels (game/js/mapdeclutter.js, puur)

| Onderdeel | Regel |
|---|---|
| Prioriteit | Blijft in `mapicons.js` (CATS): doel, missie, eigen bezit en diensten boven winkels boven horeca. Bij botsing wint de hogere (`placeIcons`). |
| Laag per laag | De Lagen-schakelaars (`mapfilters.js`) en de startzoom per categorie (`ICON_MIN_ZOOM`, horeca 6) blijven; declutter dunt alleen uit wat die doorlaten. |
| Groepen | Horeca wordt gegroepeerd op een rooster dat in de WERELD verankerd is (schuiven schudt niets door elkaar) en per kwartoctaaf van de zoom verandert. Een groep toont het aantal; klikken zoomt erop in. |
| Minimale afstand | Groepen dichter dan 0,7 cel vloeien samen in de grootste; de overblijvers liggen dus altijd ver genoeg uit elkaar. |
| Maximum horeca per beeld | Zoom 6: 12, 7: 18, 8: 26, 10: 40, 12: 56 (lineair ertussen; onder 6 geen horeca). De grootste groepen blijven, bij gelijk de dichtstbij het midden. |
| Maximum pins per beeld | 40 (ver uit) tot 80 (dichtbij), zonder de blijvers (speler, maat, doel, eigen velden). Laagste prioriteit valt eerst weg (`capPins`). |
| Vloeiend | Alle getallen worden tussen ankers geïnterpoleerd; horeca komt binnen met een fade (`fadeIn`). |
| Performance | `createHorecaPlanner` cachet de groepen per zoomstap en het laatste plan per beeld: geen herberekening in een frame waarin niets bewoog. |

Zoomniveaus 1 tot 8 en de drie kaartlagen (stad, streek, provincie): de regels hangen alleen aan de zoom, dus gelden voor elke laag; `kaartdeclutter_test` loopt zoom 1 tot 12 af.

## Samen spelen

Lokaal per speler: een weergaveregel van je eigen kaart, geen wereldstaat, geen bericht, geen beloning. Een gast ziet dezelfde regels.

## Reispopup (controle)

Het besluit uit `docs/KAART-POPUPS-21-11.md` zit in main: geen derde "Zelf gaan"-optie. De ondertitels zeggen nu het onderscheid: "Zet waypoint: Zelf gaan · een lijn en 450 m afstand" en "Reis erheen: Trein, bus, taxi of boot · € 4 · ± 12 min".
