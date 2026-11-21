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
| Wapens (slag en vuur; vuisten zijn geen spul) | 11 | 11 (`GUN_SPECS`) | 0 | 11 van 11 |
| Werpspul (carbidbus, vuurwerk) | 2 | 2 | 0 | 2 van 2 |
| Kleding (6 sets per personage) | 12 | 12 (personage in de set, `buildPersonMesh`) | 0 | 12 van 12 |
| Thuis (meubelhuis) | 9 | 9 (`shopmodels3d.js`) | 0 | 9 van 9 |
| Eten, snacks van de toonbank | 14 | 14 (`shopmodels3d.js`) | 0 | 14 van 14 |
| Eten, gevangen vis | 29 | 0 | 29 (één generator) | 29 van 29 |
| Kaarten en verzamelingen | 4 | 2 (spaarkaart, eierbal) | 2 (aanwijzingen, geheimpje) | 4 van 4 |
| Upgrades (Escapade, fiets, scooter, snackwagen) | 17 | 10 | 7 | 17 van 17 |
| **Totaal** | **99** | **59** | **40** | **99 van 99** |

### Item voor item

| Item | Bestaand model? | Gekozen |
|---|---|---|
| Geld | nee | nieuw: `geld` (stapels vellen met bandje en munten, dikte per bedrag in vier niveaus, geen opdruk) |
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
| snackwagen: Tweede frituurpan, Grote voorraad, Avondopenstelling | ja (`frituur`, `pakket`, `lamp`) | hergebruikt |
| snackwagen: Grunneger mosterd, Bel die "moi" zegt, Neon-meeuw | nee | nieuw: `mosterd`, `bel`, `neonmeeuw` |

### Wat er niet in zit, met reden

- **Upgrades van boten, kano en zeil:** `BOAT_UPGRADES`, `PADDLE_UPGRADES` en `SAIL_UPGRADES` staan nog niet in Spullen (de lijst kent alleen auto,
  fiets, scooter en de snackwagen; een boot valt nu op de auto-lijst terug en toont dan een ruwe id). Zodra Spullen ze toont, krijgen ze via
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

### 3b. De galerij (spullen-ui 21-11, #1147)

Eigenaar-feedback op de eerste viewer: links stonden iconen, rechts een heel groot blok met het model. Nu:

- **Tegels zijn 3D-plaatjes, geen iconen.** Elke tegel (`.sp-tile`) toont een stilstaand beeld (4:3) van zijn model, getekend door `renderSnapshot` van
  dezelfde ene gedeelde renderer als de Garagekaarten (`vehiclepreview.js`; geen extra WebGL-context). Het pictogram staat er alleen nog als terugval
  (geen model of geen WebGL, een leeg plaatje) en tot het plaatje er is staat een neutraal stippelvak, zonder lus.
- **Lui, met budget** (`spullenthumbs.js`, rekenregels in `spullenraster.js`): alleen tegels in of vlak bij het beeld (marge 160 px) vragen een plaatje, de
  gekozen tegel eerst, hooguit 18 aanvragen per ronde; de rest volgt bij het scrollen. `renderSnapshot` zelf tekent in idle-tijd met een budget van 6 ms per
  ronde, dus honderd spullen laten het menu niet haperen. Gelijke dingen (vijf keer dezelfde band) delen één plaatje (sleutel = model + kleur + maat);
  de maat gaat in stappen van 32 px, zodat een klein breedteverschil geen nieuw plaatje geeft.
- **Opruimen:** sluiten of een ander tabblad roept `releaseSnapshots('spullen')` aan (nieuw in `vehiclepreview.js`): de plaatjes van de galerij gaan uit de cache.
  Een nieuwe tekening door een actie (opeten, in de hand nemen) houdt ze.
- **Indeling:** het raster neemt de rest van de breedte, het detail hooguit 30 procent (260 tot 480 px, `--sp-detail`, door `rasterMaat` uit de gemeten
  breedte van het gebied). Het modelvak in het detail is 140 tot 200 px hoog (was 200 tot 320). Onder de omschrijving staan eerst de knoppen, daarna de cijfers
  en het kasboek; de knoppenbalk is niet meer plakkerig, zodat hij nooit over de cijfers heen valt.
- **Bediening:** pijltjes en D-pad lopen over de tegels (`focusStap`: omlaag naar een kortere laatste rij landt op de laatste tegel; aan de rand neemt het menu de
  toets over: omhoog naar het zoekveld, links naar de rail, rechts naar het detail), Home, End, PageUp en PageDown, Enter doet de actie (of kiest), Q en E wisselen
  de tabs, Esc gaat terug. Een toets die snel door het raster loopt bouwt niet bij elke tegel een model: het detailmodel volgt als de focus 90 ms rust.
- **Beweging (DS3):** een tegel beweegt alleen met `transform` (2 px omhoog bij hover of focus) en `opacity` (de selectiering en de vlakvulling zijn pseudo-elementen
  waarvan alleen de opacity beweegt); het plaatje fadet één keer in; geen lus; met Beweging beperken of `prefers-reduced-motion` staat alles stil.
- **Niet gedaan:** zeldzaamheid. Het spel kent geen zeldzaamheid voor spullen; een verzonnen rangorde toevoegen is een eigen ontwerpkeuze. De tegel toont wat er
  is: naam, stand, aantal, toestand en soort.
- **Mock en tests:** `node scripts/ui/spullen_ui_mock.mjs --shots` (headless Chrome, geen Electron) schrijft oud-tegen-nieuw-beelden naar
  `docs/beeld-21-11/spullen-ui/`; `node scripts/spullenraster_test.mjs` dekt de rastermaten, de focus, het budget en de cache. De echte Electron-beeldronde volgt.

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
3. De nieuwe modellen op herkenbaarheid en kleur: geld (drie niveaus), aanwijzingen, geheimpje, motor, brede band, sperdiff, uitlaat, mosterd, bel, neon-meeuw
   en een paar vissen (voorn, baars, bot, paling, meerval).
4. Pijltjes en D-pad op de focus van het model; Terugzetten met Enter en A; Beweging beperken (geen draai); geen model zonder WebGL (icoon blijft).
5. Geheugen: een paar keer tussen tegels wisselen en het menu sluiten; geen groei van GL-contexten (de leakwatch in `blackframe.js`).

## Wapens, vuisten en iconen (21-11, Spullen-wensen)

- **Vuisten** zijn geen spul: uit de lijst, de galerij, de dekkingsaudit en de tellers (11 wapens, 99 dingen). Onbewapend blijft `world.weapon === 'fists'`;
  een wapen in de hand krijgt in Spullen de actie "Wegleggen" (terug naar de vuisten). Het model `vuist` is weg.
- **Iconen**: `spullenmodel.js` kent per tabblad (`CAT_ICOON`), per groep (`GROEP_ICOON`) en per soort (`SOORT_ICOON`, bv. mes, vis) een Phosphor-naam uit
  `iconmap.js`; `itemIcoon` valt terug op de groep en daarna op de rugzak, nooit op het vraagteken (`vraag`). De tabs tonen hun pictogram; tijdens het laden
  staat een rustig skeleton-vlak (geen stippelvak, geen lus: DS3). Test: `scripts/spullenmodel_test.mjs`.
- **Wapenmodellen**: `game/js/models3d_weapons.js` is de ene bron voor de hand (`setHeldWeapon`), de eerste-persoonhanden (`firstpersonhands.js`), weggegooide
  wapens (`weapondrops.js`) en de 3D-voorbeelden. Onderdelen (box, cilinder, draaivorm, romp door doorsneden) per materiaal samengevoegd: 96 tot 532 driehoeken
  en hooguit 6 tekenaanroepen per wapen (de oude blokjes: 2 tot 5 vlakken). Test: `scripts/weapons3d_test.mjs` (budget, eigen silhouet via een contour-hash van
  zij- en bovenaanzicht, windingsrichting, dispose, loopmond bij het uiteinde, geen tekst). Beeld: `node scripts/ui/weapons_mock.mjs` (headless Chrome, geen Electron);
  `docs/beeld-21-11/spullen-wapens/wapens-0.6.png`.
- **Nog niet in beeld bekeken** (alleen het headless blad hierboven): de wapens in de hand van het figuur en in de eerste persoon in het echte spel, de
  zwaaihoeken en de muzzle flash op de nieuwe loopmonden, en het Spullen-scherm met de nieuwe tabiconen in Electron.

## Ronde 2 (spullen-r2, 21-11)

- **Gat-lijst:** alle 99 dingen hadden al een model (dekking 100 procent), maar twaalf winkelblokjes waren kaal (12 tot 144 driehoeken, één kleur): spaarkaart, kauwgom,
  pakket, tv, ehbo, koek, drop, accu, schijf, bureau, frituur en bed. Wapens: hockeystick (recht blad) en klomp (geen zool) waren de zwakste. Iconen waren er al per tab, groep en soort.
- **Nieuw:** twaalf bouwers in `models3d_spullen.js` (150 tot 700 driehoeken, twee tot zes materialen, geen tekst); `spullen3d.js` wijst ze aan via `SPUL_MODEL_VOOR` (de
  winkel houdt zijn eigen blokjes). Hockeystick met gebogen blad en tapewikkel op de teen, klomp met zool en opkrul bij de punt.
- **Iconen en toetsen:** boven het raster staan de toetsen Q en E als `glyphHtml` (`data-gk`: op de controller de bumperknoppen); verborgen op touch.
- **Test:** `scripts/spullen3d_test.mjs` (14 tests) bewaakt per nieuw model driehoeken, materialen, bounding box, NaN en dispose. Beeld: `node scripts/ui/weapons_mock.mjs --bron=spullen`
  schrijft `docs/beeld-21-11/spullen-r2/spullen-0.6.png`; het wapenblad is vernieuwd.
- **Samen spelen:** zie `docs/COOP-GAST.md` (Spullen-modellen en wapens): inventaris per speler, het wapen in de hand loopt mee in de snapshot en toont bij de ander hetzelfde model.
- **Nog niet in beeld bekeken:** alleen het headless blad; niet in het echte menu (tegels, galerij, Q/E-toetsen) of in de hand in het spel. Boot-upgrades blijven zonder tegel (zie hierboven).
