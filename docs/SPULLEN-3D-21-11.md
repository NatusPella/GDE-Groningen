# Spullen in 3D (21-11, #1086)

Eigenaar-wens: "Ik wil eigenlijk dat voor alle spullen die je kunt hebben je ook een 3D-model kunt zien, net als bij de voertuigen."
Stand: gebouwd en getest zonder beeld (geen Electron: de releasegate draait). Wat in beeld bekeken moet worden staat onderaan.

## 1. Hoe voertuigen hun model tonen

Alles loopt door `game/js/vehiclepreview.js`. Daar zit één gedeelde WebGL-renderer (`sharedGl()`: één verborgen canvas, één scene
met half-bol-licht, zon en een tegenlicht, camera 32 graden). Drie manieren om hem te gebruiken:

| Pad | Wie | Wat |
|---|---|---|
| `createVehiclePreview` | winkels (`shopui.js`) | eigen renderer en canvas, live, `dispose()` geeft de context vrij |
| `createSharedPreview` | Garage, Verhaal, nu Spullen | tekent via de gedeelde renderer en kopieert naar een gewoon 2D-canvas: geen eigen GL-context |
| `renderSnapshot` | garagekaarten, HUD, Verhaal | stilstaand beeld uit dezelfde renderer, in rustige tijd (idle), in een cache |

- **Schaal en kader:** een spec `{ kind, ... }` wordt door `buildObject` gebouwd; voorwerpen (`weapon`, `person`, `product`, nu `spul`)
  worden op hun omhullende bol ingekaderd, voertuigen op lengte. De camera staat iets boven het midden (28 procent van de afstand).
- **Belichting:** `setupScene()`, voor voorwerpen staat het tegenlicht (`rim`) aan zodat donkere wapens leesbaar blijven.
- **Bediening:** `bindDrag` (slepen draait, wiel zoomt 0,55 tot 1,8), `turn(da)` voor de pijltjes en de D-pad, automatische draai
  die 2,5 s na een handeling hervat. De Garage kent `speed`, `angle`, `fps` en `onFirstFrame` (het stilstaande plaatje en het silhouet
  verdwijnen pas als het model echt tekent).
- **Hergebruik van de bouwers:** voertuigen via `buildVehicleMesh` (`models3d_vehicles.js`), wapens `buildWeaponMesh` en personen
  `buildPersonMesh` (`models3d_people.js`), winkelproducten `buildProductMesh` (`shopmodels3d.js`, dezelfde modellen als bij het meubelhuis
  en de toonbank). Een model deelt zijn geometrie met de wereld, dus `disposeMesh` geeft verwijzingen terug in plaats van ze weg te gooien.
- **Opruimen:** `disposeGarageViewer()` bij een ander tabblad of sluiten; de lus pauzeert zodra `active()` onwaar is (verborgen paneel).
- **Context verloren:** de gedeelde renderer wordt bij de volgende vraag opnieuw gemaakt (`GL_RETRY_MS`); zonder WebGL blijft de aanroeper
  het icoon of silhouet tonen.

## 2. De inventaris: alles wat in Spullen kan staan

Bron: `spullen.js` (`collect`) en wat het leest. Er is geen gewicht en er zijn geen sleutels of missie-items als bezit (zie
`spullenmodel.js`). Cijfers uit `node scripts/ui/spullen3d_dekking.mjs`:

| Categorie | Aantal | Had al een model | Nieuw gemaakt | Dekking |
|---|---|---|---|---|
| Geld | 1 | 0 | 1 | 1 van 1 |
| Wapens (slag en vuur, incl. vuisten) | 12 | 11 (`GUN_SPECS`) | 1 (vuist) | 12 van 12 |
| Werpspul (carbidbus, vuurwerk) | 2 | 2 | 0 | 2 van 2 |
| Kleding (6 sets per personage) | 12 | 12 (personage in de set, `buildPersonMesh`) | 0 | 12 van 12 |
| Thuis (meubelhuis) | 9 | 9 (`shopmodels3d.js`) | 0 | 9 van 9 |
| Eten, snacks van de toonbank | 14 | 14 (`shopmodels3d.js`) | 0 | 14 van 14 |
| Eten, gevangen vis | 29 | 0 | 29 (één generator) | 29 van 29 |
| Kaarten en verzamelingen | 4 | 2 (spaarkaart, eierbal) | 2 (aanwijzingen, geheimpje) | 4 van 4 |
| Upgrades (Escapade, fiets, scooter, Fjord Frituur) | 17 | 10 | 7 | 17 van 17 |
| **Totaal** | **100** | **60** | **40** | **100 van 100** |

### Item voor item

| Item | Bestaand model? | Gekozen |
|---|---|---|
| Geld | nee | nieuw: `geld` (stapels vellen met bandje en munten, dikte per bedrag in vier niveaus, geen opdruk) |
| Vuisten | nee (de hand was het "wapen") | nieuw: `vuist` (gebalde hand op een mouw) |
| knuppel, hockeystick, bezem, fietspomp, klomp, polsstok, pistool, uzi, waterpistool, shotgun, jachtgeweer | ja, `buildWeaponMesh` | hergebruikt |
| carbidbus, vuurwerk | ja, `buildWeaponMesh` | hergebruikt |
| 12 kledingsets | ja, het personage met de kleuren van de set | hergebruikt (`kind: 'person'`, kleuren uit `OUTFITS`) |
| kast, bank, lamp, bedden, tv, prikbord, frituurpan, plant, bureau | ja, productmodellen | hergebruikt |
| krentenbol, koffie, drop, energiedrankje, EHBO-doos, kroket, frikandel, eierbal, oorlog, kapsalon, koek, kauwgom, gehaktballetjes, hotdog | ja, productmodellen | hergebruikt |
| 29 vissoorten (voorn tot rivierprik) | nee | nieuw: `vis`, vorm (spil, plat, slang), lengte, hoogte en kleuren per soort uit `VIS_LOOK` |
| Spaarkaart, Eierballen | ja (`spaarkaart`, `eierbal`) | hergebruikt |
| Aanwijzingen | nee | nieuw: `aanwijzing` (opschrijfboekje met vergrootglas) |
| Geheimpjes | nee | nieuw: `geheim` (dichte brief met lakzegel; we verklappen niets) |
| Escapade: Sportremmen, Turbo "Tinus" | ja (`schijf`, `turbo`) | hergebruikt |
| Escapade: Opgevoerde motor | nee | nieuw: `motor` |
| Escapade: Brede banden | deels (`band` is een smalle fietsband) | nieuw: `bredeband` |
| Escapade: Sperdifferentieel | nee | nieuw: `sperdiff` |
| Fiets: Racebanden, Zeven versnellingen, Opgevoerde accu | ja (`band`, `versnelling`, `accu`) | hergebruikt |
| Scooter: Grote remschijven, Plakkende banden | ja (`schijf`, `band`) | hergebruikt |
| Scooter: Sportuitlaat | nee | nieuw: `uitlaat` |
| Fjord Frituur: Tweede frituurpan, Grote voorraad, Avondopenstelling | ja (`frituur`, `pakket`, `lamp`) | hergebruikt |
| Fjord Frituur: Grunneger mosterd, Bel die "moi" zegt, Neon-meeuw | nee | nieuw: `mosterd`, `bel`, `neonmeeuw` |

### Wat er niet in zit, met reden

- **Upgrades van boten, kano en zeil:** `BOAT_UPGRADES`, `PADDLE_UPGRADES` en `SAIL_UPGRADES` staan nog niet in Spullen (de lijst kent alleen auto,
  fiets, scooter en de Fjord Frituur; een boot valt nu op de auto-lijst terug en toont dan een ruwe id). Zodra Spullen ze toont, krijgen ze via
  `upgradeSpec('boot', id)` een model. Dat is een eigen wens, geen onderdeel van deze viewer. Opgenomen als `TERUGVAL` in `spullen3d.js`.
- **Hengel, golf, padel, boerderij:** dit zijn gedragingen en activiteiten, geen dingen in je bezit; ze staan niet in de Spullen-tab en hebben
  dus geen tegel. Een gevangen vis staat er wel (29 modellen). Of hengel, club en racket als los voorwerp een tegel verdienen, is een eigen wens; deze ronde niet onderzocht.
- **Voertuigen:** blijven bij de Garage (daar zit hun draaitafel).
- **Sleutels, missie-items, gewicht:** bestaan niet als bezit in dit spel (`spullenmodel.js`), dus ook geen model.
- **Valuta-achtige items:** alleen contant geld en de spaarkaart staan in Spullen; andere kaarten en lotjes zijn geen bezit in dit scherm.

## 3. De viewer

`createSharedPreview` in het detailpaneel (`spullen.js`, `zetDetail`): één canvas per detail, dezelfde ene gedeelde renderer als de Garage, nooit een
eigen GL-context. Wat de speler ziet en kan:

- Een groot model (200 tot 320 px hoog) in een `.ds-zeef`-vak met harde rand en schaduw, daaronder de hint met de pijltjes als toetsplaatjes
  (`glyphHtml`, volgt het laatst gebruikte apparaat) en de knop Terugzetten (`.ds-z-knop--ghost`). Naam, beschrijving en aantal ("Bij je 3 stuks") staan er
  onder, zoals eerder.
- Draaien met de muis (slepen), de pijltjes (focus op het model) of de D-pad/stick (zelfde pad als de pijltjes); het wiel zoomt.
  Rustige automatische draai (0,35 rad/s); met Beweging beperken of de OS-instelling draait hij niet (`reducedMotion()`).
- Laden: het icoon staat zacht pulserend (alleen zonder beperkte beweging) tot het eerste beeld getekend is; dan vervaagt het icoon in 160 ms.
- Terugval: geen model, of geen WebGL: het icoon blijft, met de zin "3D is hier niet beschikbaar; het icoon blijft staan." en zonder Terugzetten.
- Opruimen: een ander tabblad of het menu sluiten roept `disposeSpullenViewer()` aan (preview weg, `IntersectionObserver` los, model vrijgegeven via
  `disposeMesh`); buiten beeld scrollen pauzeert de tekenlus (`IntersectionObserver` plus `active()`), terug in beeld wekt hem.
- Dezelfde stage blijft staan als alleen de tekst eromheen verandert (melding van een actie, weggooivraag), zodat het model niet opnieuw begint.

Samen spelen: spullen zijn per speler (#429). De viewer is puur lokaal: hij leest alleen wat het eigen menu al toont en stuurt niets over het netwerk;
een gast ziet zijn eigen spullen. Er is geen EXTRA-bericht, geen snapshot en geen nieuwe testbankstap nodig.

## 4. Modellen en bouwregels

- `game/js/models3d_spullen.js`: een bouwer per soort, met parameters (geld: niveau; vis: vorm, lengte, hoogte, rug, buik, vin, strepen, bek, snor;
  mosterd: kleur van de saus; bel en neon: kleur). `scene3d.js` is niet aangeraakt.
- `game/js/spullen3d.js`: puur (geen three); de tabellen en de bouwers van de specs (`wapenSpec`, `kledingSpec`, `etenSpec`, `meubelSpec`, `cardSpec`,
  `upgradeSpec`, `moneySpec`), de `VIS_LOOK`-tabel en de `TERUGVAL`-lijst.
- Low-poly, procedureel, verzonnen of generiek, geen merken, geen letters of tekst op de modellen (de test bewaakt dat de nieuwe module geen canvas gebruikt).
  Kleuren zijn vaste hexwaarden in dezelfde stijl als `shopmodels3d.js`, door `dsWereld` (het wereldpalet) gehaald.
- Materialen zijn gedeeld per kleur (`markShared`), geometrie hoort bij de mesh en gaat weg bij dispose. Budget: 6.000 driehoeken per model; het zwaarste
  is nu de kleding met ongeveer 1.900.

## 5. Tests

- `node scripts/spullen3d_test.mjs` (13 tests): elk ding heeft viewerdata of een gedocumenteerde terugval, elke bouwer geeft driehoeken binnen het budget,
  dispose klopt, materialen zijn gedeeld, de vis-tabel dekt `visdata.js`, vehiclepreview en pausemenu zijn goed aangehaakt, de stijl houdt de 13 px-vloer en
  beperkte beweging. Heeft de gevendorde three nodig (`cd desktop && npm run stage` of `desktop/vendor-cache` kopiëren).
- `node scripts/ui/spullen3d_dekking.mjs`: dekking per categorie uit de echte bronnen; bouwt elk model, controleert op NaN, driehoeken en dispose; faalt bij een gat.

## 6. Nog niet in beeld bekeken

Niets hiervan is in een echt venster gezien. Voor de coördinator, bij de beeldronde:

1. Het Spullen-detail in 1920x1080 en 1280x720: past het model (200 tot 320 px) met de tekst eronder, scrolt het detail netjes, geen overlap met de acties.
2. Een kaart per categorie: de framing (te klein of afgesneden?): vooral de polsstok (3,4 lang), de jachtgeweer, de kledingsets, de vis `paling` en `snoek`.
3. De nieuwe modellen op herkenbaarheid en kleur: geld (drie niveaus), vuist, aanwijzingen, geheimpje, motor, brede band, sperdiff, uitlaat, mosterd, bel, neon-meeuw
   en een paar vissen (voorn, baars, bot, paling, meerval).
4. Pijltjes en D-pad op de focus van het model; Terugzetten met Enter en A; Beweging beperken (geen draai); geen model zonder WebGL (icoon blijft).
5. Geheugen: een paar keer tussen tegels wisselen en het menu sluiten; geen groei van GL-contexten (de leakwatch in `blackframe.js`).
