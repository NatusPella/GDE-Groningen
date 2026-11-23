# AAA-objecten: voertuigen, gebouwen en straatmeubilair (23-11)

Branch `objecten-aaa-23-11`. Eerst gemeten, dan opgewaardeerd van groot naar klein. De metingen komen uit een headless-Chrome-contactblad
(`docs/beeld-23-11/objecten/sheet.html`, `gebouw.html`, `props.html`; schermafdrukken met `node scripts/objecten_shots.mjs <voor|na> <weergaven>`),
niet uit het spel zelf: geen Electron, geen echte belichting, geen schaduw. Wat daar goed uitziet is dus nog niet in het spel bekeken.

## Bevindingen, gerangschikt

| # | Wat | Waarom | Impact | Kosten | Stand |
|---|---|---|---|---|---|
| 1 | Trekker-limo (`trekkerlimo`) | Een trekkerkop van zes dozen en een zwarte doos erachter, zonder wielkasten, zonder deuren, voorwielen die niet stuurden, alle wielen even snel | hoog (hoofdrol in akte 2, de jacht, cutscenes) | M | gedaan |
| 2 | Deuren zonder uitsparing (alle voertuigen met deuren) | De romp is een dichte extrusie: een open deur leek een los paneel op een gesloten zijkant, een dicht paneel had geen naad | hoog (elke in- en uitstap) | M | gedaan |
| 3 | Helikopter (`heli3d.js`) | 794 driehoeken, kale kap en cabine, geen interieur, geen deur, enkelvoudige blauwdoos als blad | hoog (eigen voertuig van de speler) | S | gedaan |
| 4 | Straatmeubilair: bank, afvalbak, fietsenrek, bushokje, paaltje | Vier dozen als bank, één cilinder als bak, een ondoorzichtig vlak als bushokje; staat overal in beeld | hoog | S | gedaan |
| 5 | Vervuiling en slijtage van auto's (vuil onderin, roest, kleurverloop per auto) | De lak is overal effen, auto's zien er allemaal nieuw uit | middel | M | niet gedaan |
| 6 | Verlichte ruiten, koplampbundels, ruitreflectie bij auto's, bus en boten | Staat al in `nightlights3d.js` (koplampkegels, achterlichten, ramen); reflectie ontbreekt | middel | M | niet gedaan |
| 7 | Gebouwen: gevelreliëf, dakranden | Gewone huizen en flats hebben al ramen met licht, dakkapellen, schoorstenen, luifels en dakranden (zie `voor-gebouw.png`); alleen gevelreliëf (lisenen, dorpels) ontbreekt | laag | L | niet gedaan |
| 8 | Bussen, boten, fietsen | Voldoende (deuren, stoelen, spiegels, wielrotatie, sturen); geen winst per euro | laag | M | niet gedaan |
| 9 | Overig straatmeubilair (lantaarns, verkeersborden, brievenbussen) | Niet gemeten; lantaarns staan in `nightlights3d.js` | onbekend | M | niet bekeken |

De volgorde is gekozen op zichtbaarheid maal eenvoud. Punt 1 en 2 kwamen als opdracht van de eigenaar boven aan; 3 en 4 volgden uit de meting.

## Wat er gedaan is

**Deurnaden (2).** `vehicledoorcuts.js` is de ene, pure regel: uit de deurtabel (`DEUR_DEFS` in `vehicledoors.js`) komen de dunne donkere
naden rond elk deurpaneel en het handvat; ze worden bij het bouwen in de gedeelde, gecachete romp gezet (`addDoorCuts` in
`models3d_vehicles.js`): auto's, bestelbus, ambulance, politie, taxi, vrachtwagen, trekker, snackwagen en trekker-limo. Bussen, trams en
treinen tekenen hun deuren zelf. Een deur met `zij` (halve breedte als fractie van de breedte) zit op de zijkant van een smallere cabine of
limousine. In `vehicledoors3d.js` heeft een open deur nu dikte (0,05 m), een donkere bekleding aan de binnenkant, bij een hoge
cabinedeur een dicht onderpaneel met de ruit erboven, en bij een voertuig zonder echte cabine een kijkje in het interieur (drempel,
zitting, rugleuning in vertexkleuren, één gedeelde geometrie per maat) in plaats van een zwart vlak. De stencil-opening van cabin3d.js
voor echte cabines is ongewijzigd. Test: `scripts/vehicledoorcuts_test.mjs` (elk model met deuren definieert naden, ze omlijsten het paneel
en de hoekpunten zitten echt in de gebouwde romp).

**Trekker-limo (1).** Opnieuw gebouwd (`buildTrekkerLimoMesh`): trekkerkop met kap, chromen grille, ronde koplampen, spatborden, cabine met
dak en amberlamp, uitlaat, twee vlaggetjes; grote en kleine trekkerbanden met noppenprofiel (`treadWheelGeometry`), limousine met twee
zijpanelen met echte wielkasten, drie ramen per kant, witte flanken met chromen wieldoppen, glanzende lak, chroom, dubbele uitlaat,
rode loper over de kofferklep, en achterin twee banken tegenover elkaar met een barkastje, gouden glazen en een koeler (zonder merk).
Twee cabinedeuren en twee achterdeuren (nieuw in `DEUR_DEFS.trekkerlimo`; `GEEN_DEUR` bevat hem niet meer). De voorwielen sturen
(`frontWheels`), elk wiel draait met de juiste grondsnelheid (`spinK`). Passagiers zitten achterin in de conferentie-indeling
(`limoStoel` in `seating3d.js`). De lengte blijft 5,6 m, omdat veertien plekken (missies, cutscenes, bewaarde voertuigen) die maat noemen;
de trekker is 2,2 m, de rest limousine.

**Helikopter (3).** Afgeronde motorkap met inlaat en uitlaat, interieur (twee stoelen, dashboard met meters, stuurknuppel, console) dat door
het glas te zien is, schuifdeur met naad, handgreep en raampje, pitotbuis, flitser, staartrotorkast; bladen met gele tippen, bladgrepen en
naaf (één vertexkleur-geometrie).

**Props en register (4).** `propregister.js` (puur) houdt de gedeelde props bij met een kwaliteitsnorm; `propmodels3d.js` bouwt ze. Stad
(`cityprops.js`), buitengebied (`streetfurniture3d.js`) en cutscene-decor (`storyprops.js`, `cutscenemodels.js`, `cutscript.js`) gebruiken
dezelfde geometrie. Nieuw in het register: `bank`, `afvalbak`, `fietsenrek`, `bushokje`, `paaltje`. Norm per prop: driehoekenbereik,
minimaal aantal kleuren, afmeting binnen 25 %, en een lijst eisen (bijvoorbeeld "gietijzeren zijstukken met armleuning en voetplaat").
`scripts/propregister_test.mjs` houdt elke prop eraan en controleert dat wereld en cutscenes het register gebruiken. Een nieuwe prop komt
in het register, met norm, in dezelfde commit.

### Kwaliteitsnorm voor een prop

Een prop haalt de norm als hij (1) minstens zoveel verschillende materialen of kleuren heeft als het register vraagt, (2) echte onderdelen
heeft (voet, rand, bevestiging) in plaats van één primitief, (3) binnen zijn driehoekenbudget blijft zodat hij per cel samengevoegd of
geïnstanced kan worden, (4) op de grond staat en geen NaN bevat, en (5) zijn maat houdt. Kale dozen en cilinders voldoen niet.

## Cijfers (contactblad, swiftshader)

| Weergave | Driehoeken voor | na | Drawcalls voor | na |
|---|---|---|---|---|
| 9 personenauto's, taxi, politie | 14.386 | 15.778 (+9,7 %: naden en handvatten) | 128 | 128 |
| 6 bedrijfsvoertuigen (vrachtwagen, trekker, quad, snackwagen, maaidorser, laadmachine) | 7.208 | 7.568 | 53 | 53 |
| helikopter | 794 | 1.578 | 7 | 7 |
| trekker-limo (alleen de romp en wielen) | 1.500 (7 meshes) | 5.792 (9 meshes) | | |
| sedan / bestelbus | 1.580 / 1.552 | 1.748 / 1.780 (naden en handvatten, +11 en +15 %) | 12 | 12 |
| straatmeubilair (5 soorten) | 554 | 1.770 | 6 | 6 |

Opmerking: de trekker-limo kost 4,3 keer zoveel driehoeken (1.500 naar 5.792, gemeten met de oude bouwer uit commit b9086c127) en twee meshes meer (de wielen: vier
groepen in plaats van één); het is één voertuig tegelijk in beeld in de jacht. De naden zitten in de gecachete romp: nul drawcalls erbij.
Het straatmeubilair blijft instanced of per cel samengevoegd; de bank kostte 4 dozen en kost nu ongeveer 380 driehoeken, de bak 344, het
rek 370, het bushokje 502. Bij de caps van `streetfurniture3d.js` (120 banken, 120 bakken, 120 rekken, 40 hokjes) is dat in het slechtste
geval circa 150.000 driehoeken, alleen binnen 90 tot 140 m en alleen als ze alle in beeld zijn. Niet in het spel gemeten (fps).

## Tweede ronde (na de beoordeling van de coördinator)

- **Open deuren:** de opening toont nu altijd interieur in vertexkleuren (dorpel met instaplijst, vloer in stofgrijs, zitting en
  leuning met zijwang, binnenkant van de B-stijl, bij een voordeur de dashboardrand met rooster, bij een achterdeur de rug van de
  voorstoel), ook voor auto's met een echte cabine: de stencil-opening tekent dit interieur in plaats van een zwarte kleur, en de
  cabine van cabin3d.js tekent er dichtbij overheen. Het deurblad heeft een binnenpaneel met armsteun, opbergvak en trekgreep, en bij
  een lage deur een raamlijst met ruit. Alle portieren scharnieren aan de voorkant van de opening (ook de achterdeuren, die eerst
  achter scharnierden) en gaan 63 graden open (was 60 en 72).
- **Trekker-limo:** dak 9 cm lager als extrusie met afgeronde randen en een glazen schuifdakstrook met chromen lijst; het glazen
  bovenhuis is één extrusie met een schuine achterruit en een brede C-stijl; kofferdeksel in lak met chromen strip; geel kenteken met
  een blauwe band en streepjes in plaats van tekens; de rode loper ligt nu op de treeplanken onder de achterdeuren; een schuine,
  glazen nek in lak loopt van de trekkercabine naar het limodak; hoogglanslak met een blanke laklaag (MeshPhysicalMaterial,
  alleen dit voertuig).
- **Bakwagen:** laadbak met verticale ribbels, aluminium randen boven en onder, hoekstijlen, twee achterdeuren met drie scharnieren,
  vier sluitstangen met hendels en nokken, onderrijbeveiliging achter (met reflectiestroken) en opzij.
- **Register:** `VOERTUIG_REGISTER` in `propregister.js` legt de norm voor de trekker-limo en de bakwagen vast (driehoeken, kleuren,
  eisen); `propregister_test.mjs` bouwt ze en houdt ze eraan. Gemeten: trekker-limo 5.970 driehoeken en 27 kleuren, bakwagen 1.936 en 17.
- Openingen op afstand: de deurcode heeft geen eigen LOD; één rig en één opening per deur, dichtbij en ver weg. Het zwarte
  vlak in de eerdere `na-deur-zij-open.png` kwam uit een opname van vóór de wijziging van de stencil-opening (die toen nog één
  zwarte kleur tekende). Opnieuw gemaakt: ook in de brede opname tonen de rode, groene en gele auto donkergrijs interieur. Het LOD
  van cabin3d.js bepaalt alleen of de echte cabine er dichtbij overheen tekent; daarbuiten blijft het interieurvlak staan.
- Nieuwe beelden: `na-limo.png`, `na-limo-achter.png`, `na-limo-zij-open.png`, `na-deur1-zij-open.png`, `na-deur-zij-open.png`, `na-bak.png`.

## Derde ronde: Quaternius als inspiratie (auto's)

Bron: https://quaternius.com/packs/cars.html, licentie CC0 (zoals de pagina vermeldt; 8 auto's, FBX/OBJ/Blend, nov. 2018). Niet
gedownload: voor een download is akkoord van de eigenaar in de chat nodig, en een schermafdruk van de pagina was genoeg om de vormtaal
te lezen. Die schermafdruk staat lokaal in `.tmp-quaternius/` (in `.gitignore`).

Wat hun auto's mooier maakt en wat we overnamen in `buildCarGeometry` (alle personenauto's, bestelbus, taxi, politie, Escapade):
- ronde, ingelopen flanken: de romp heeft een bredere afronding in twee stappen (bevel 0,075, bij de oude 'boxy' auto's 0,035);
- bumpers in de lakkleur die om de hoek doorlopen, met een donkere onderlip (de oude 'boxy' auto's houden hun chroom);
- wielkasten met een lijst om de boog en een lichte karakterlijn in de flank.

Niet overgenomen: hun donkere, ondoorzichtige ruiten (wij laten het interieur zien) en hun lakkleuren (die staan in vehicle.js).
Alle eigen functies blijven: deuren met naden en interieur, cabine-LOD, sturende wielen, lichten, schade (de onderlip hoort bij de
bumper en valt mee), kleurvarianten.

Kosten van die eerste poging: ongeveer 520 driehoeken per auto meer (+30 %) voor een verschil dat nauwelijks te zien was. De
coördinator keurde dat af; zie de herziening hieronder.

### Herziening: de basisvorm in plaats van details

De modellen van het pakket waren op 23-11 niet te downloaden (rate limit van de opslagdienst, zie
`C:\Users\abuis\gde-assets\quaternius\INDEX.md`); de profielen hieronder komen dus uit de renders op de packpagina, niet uit hun
bestanden. Weggehaald: de afronding in twee stappen en de wielkastlijsten (veel driehoeken, weinig zichtbaar). Nieuw, alleen voor de
moderne personenauto's (de 'boxy' Escapade en de bestelbus houden hun hoekige vorm, de bus krijgt alleen de lichte versmalling):
- ronde neus (twee extra punten), bolle motorkap (een kruin halverwege), ronde kont (twee extra punten), lampen iets lager;
- bol dak met afgeronde zijkanten (twee extra punten, bredere afronding);
- ingelopen ramen: de glaskas 0,90 van de breedte (was 0,94, #463 eist meer dan 0,88), met een richel in lak die de gleuf dicht houdt;
- van boven gezien ingelopen neus en kont: het hele model schuift in de laatste halve meter tot 13 % van de halve breedte naar
  binnen, zonder extra driehoeken; lagen op het plaatwerk (naden, strepen, belettering) houden hun afstand;
- grotere, heldere koplampen; bumpers in lakkleur met donkere onderlip (gebleven);
- zachter lakpalet in het verkeer (`vehicle.js`): zacht rood, staalblauw, saliegroen, zacht oranje, geen merkkleuren.

Driehoeken t.o.v. vóór de Quaternius-ronde: hatch +9,8 %, sedan +9,2 %, wagon +8,7 %, sport +9,5 %, suv +2,7 %, bestelbus +5,4 %,
Escapade +2,9 %; drawcalls en meshes gelijk. Vergelijkingspagina (zelfde hoek, 11 m en 20 m):
`docs/beeld-23-11/objecten/vergelijking-quaternius.html`. De `-oud`-weergave van `sheet.html` heeft een tijdelijke kopie van de oude
bouwer nodig (`git show 11b252310:game/js/models3d_vehicles.js` naar `game/js/_oud_voertuigen_tmp.js`), die niet in git staat.
Niet in het spel bekeken.

### Proef: hybride auto (hun romp, onze functies)

Het pakket stond later wel klaar (`C:\Users\abuis\gde-assets\quaternius\cars\pack`, 7 glb, CC0, door de eigenaar gedownload). De
coördinator vond het bijschaven van onze bouwer nog steeds een kleine stap en vroeg een proef met hun carrosserie als basis.
- `scripts/convert_quaternius_car.mjs` zet `Car.glb` om naar een kleine module (eerst `qcar_sedan.js`, nu `qcars.js`): alleen de carrosserie,
  in onze assen, op een millimeter, met per hoekpunt een rol (lak, glas, koplamp, achterlicht, zwart, grijs, onderkant); de
  wielplekken en -straal. Licentie en herkomst: `docs/MODEL-LICENTIES.md`.
- `buildHybridCar` (models3d_vehicles.js), alleen met `model.hybride` op een sedan of stationwagen: hun romp in onze drie
  materialen (lak in de voertuigkleur), 17 % hoger dan hun lage auto zodat een inzittende past, onze wielen op hun plekken,
  deurnaden die de gebogen flank volgen en per deur de flank voor de deur-rig (`userData.deurZ`, gelezen door vehicledoors3d.js).
- Wat werkt en wat breekt: zie de tabel in `docs/beeld-23-11/objecten/vergelijking-hybride.html` en `scripts/hybridecar_test.mjs`.
  Werkt: wielen draaien en sturen, kleurvarianten, lampen, deurnaden, deuren open met interieur, deuken zonder NaN.
  Breekt of ontbreekt: politie-, taxi- en ambulance-uitvoeringen, roest/tokkie/EV, tuning (die hangen aan het profiel van onze
  bouwer), losse delen bij schade (grille, spiegels, wieldoppen), het deurblad heeft nog onze vlakke vorm; de cabine van cabin3d.js
  volgt het profiel van onze sedan en is in de hybride niet bekeken.
- Kosten: hybride 2.098 driehoeken en 5 meshes, onze sedan 1.908 en 12, hun origineel 2.954 en 12.
- Register: `VOERTUIG_REGISTER.hybrideSedan` met norm in `propregister.js`.

Advies: de hybride haalt in één stap het niveau dat bijschaven niet haalt, voor een gewone verkeersauto. Zet hem in voor de
gewone personenauto's (hun Car, Car2, SUV en sportauto's, telkens één omzetting), en houd onze bouwer voor de bijzondere uitvoeringen
(politie, taxi, ambulance, Escapade, tuning) tot die per uitvoering zijn overgezet. Eerst nog in het spel bekijken: de cabine (dashboard
en stoelen onder het lagere dak) en de koplampkegels van nightlights3d.js.

## Vierde ronde: hybride standaard, echte deuropeningen, schaal, botsmaat en LOD's

Opdracht van de coördinator (eisen van de eigenaar), op deze tak, vanaf de WIP-commit fbe4805c9.

- **Hybride standaard.** Alle zeven auto's uit het pakket zijn omgezet (`game/js/models/qcars.js`, 139 kB, gedeelde hoekpunten en een
  index; lagen die in het origineel op elkaar lagen zijn 3,2 cm uit elkaar geschoven). `hybridKey` kiest de hybride voor de gewone
  sedan, hatchback, SUV, sportauto (twee varianten), politieauto en taxi; ambulance, de Escapade, roest, tokkie, elektrisch, belettering,
  tuning (`v.look`) en `model.hybride === false` houden onze eigen bouwer. Op de hybride: politiestrepen (het stuk op een deur gaat mee
  met het deurblad), lichtbalk met onze knipperende lampen, losse grille, spiegels en uitlaat, wieldoppen, hangende bumpers bij schade.
- **Echte deuropeningen** (eis eigenaar: een gat in de romp, de deur vult het, open kijk je de auto in). Hybride: de flank wordt langs
  de deurcontour geknipt (Sutherland-Hodgman), het uitgeknipte stuk romp (met ruit) is het deurblad, met een binnenkant op 3,5 cm en
  een handvat; deurstijlen en een dorpel in de opening; een eenvoudig interieur (vloer, stoelen, achterbank, dashboard) dat wijkt voor
  de echte cabine van `cabin3d.js`. Onze eigen bouwer: gaten in de extrusie (alleen deuren die links en rechts op dezelfde plek zitten,
  van de wielkasten af), de versiering op de deur (strepen, sierlijn, handvat) gaat mee naar het deurblad (`moveDoorDecor`). Bakwagen,
  trekker en trekker-limo: de flank van de blokkenromp wordt op dezelfde manier geknipt (`knipDeurgaten`), met een binnenbak met vloer
  en stoel. `scripts/deuropening_test.mjs` controleert voor alle deze voertuigen: (a) geen flank binnen de deurcontour, (b) een straal
  door de open opening raakt eerst interieur of de overkant, (c) dicht raakt hij eerst de dichte deur in de flank. De schuifdeur van de
  bestelbus en de laadkleppen houden hun oude vlak (ze zitten maar aan één kant of achterop).
- **Deuren.** Alle portieren scharnieren voor en gaan 63 graden open; bij een echt gat staat de dichte deur in de rig in de flank.
- **Schaal** (eis eigenaar): de getekende maat per model staat in het register (`VOERTUIG_REGISTER[..].schaal`) en is getoetst aan
  `VOERTUIG_NORM` (`scripts/voertuigschaal_test.mjs`). Hun auto's waren 1,15 tot 1,24 m hoog; de hoogte gaat per model naar 1,42 tot 1,45
  (SUV 1,70), gemeten tot de bovenkant van de ruiten plus het dak, zonder daklicht of taxibord. Lengte 4,25 tot 4,55, breedte 1,78 tot
  1,85, wielbasis 2,59 tot 2,78, wieldiameter 0,61 tot 0,73. Andere voertuigen (alleen gemeld): de bus is over de romp 2,60 m breed,
  de 3,2 m kwam van de spiegels (vooraan op 2,2-2,5 m hoogte, 32 cm per kant); de midibus 2,45 m romp; trekker-limo 2,18 m over de
  spatborden van de trekker (botsbreedte 2,0); bakwagen 2,59 m romp; heli en sloep binnen gangbare maten.
- **Botsmaat** (een bug, geen keuze): een hybride botst nu met zijn getekende lengte en breedte (`getekendeMaat` in `propregister.js`,
  toegepast in de constructor van `Vehicle`; het sjabloon blijft ongewijzigd). `scripts/botsmaat_test.mjs`: botsmaat en romp binnen 3 cm.
  Een uitvoering met onze eigen bouwer houdt de maat uit het sjabloon (die tekent ook op die maat).
- **LOD's op het centrale systeem.** `vehiclelod3d.js` gebruikt de `DitherLOD` van `lod3d.js`, de opgave van de soort `vehicle` uit
  `lodregistry.js` (35 / 90 m, band 8, weg 450, meeschalend via `lodkit3d.js`) en `registerLodModel`; de vijf bestanden van het centrale
  systeem (lodlevels, lod3d, lodsimplify, lodregistry, lodkit3d) zijn ongewijzigd overgenomen van `perf-ultra-23-11`, zodat het bij het
  samenvoegen één systeem is. Voertuigspecifiek blijft alleen de geometrie: niveau 1 is de romp met dichte deuren en eenvoudige wielen
  zonder naden, interieur en kleine driehoekjes (haalt hij de minCut niet, zoals de heli, dan vereenvoudigt `lodsimplify.js` hem
  verder), niveau 2 het silhouet in de hoofdkleur. Boten krijgen hun LOD's in het centrale systeem zelf (`buildBoatMesh` op die tak).
  `scripts/vehiclelod_test.mjs` controleert de niveaus op afstand, de dither op de grens en de audit van het register. Op die tak hoort
  de voertuigbouw nog in het blok 'bouwen' van `scripts/lod_audit_test.mjs`; dat bestand staat niet op deze tak.
- Beelden en vergelijking: `docs/beeld-23-11/objecten/vergelijking-hybride.html` (origineel, onze sedan en de hybride dichtbij en op
  20 m, dicht en open; recht van opzij en schuin van boven met de deur open; bakwagen, trekker en trekker-limo; de drie LOD-niveaus).

Na de beoordeling van de coördinator (scherven, een plaat dwars door de cabine, gekartelde deurranden): de hybride knipt nu alleen de
opzij gekeerde flank (boven de raamlijn alleen de zijruit en zijn lijst, nooit een hoek van de voor- of achterruit, het dak of de C-stijl),
splitst elke driehoek die de contour snijdt, laat een kier van 4 mm en sluit elke snede met een rand met dikte (6 cm in de opening, 3,5 cm
aan de deur). Kleine delen die helemaal binnen de contour op de buitenkant zitten (een spiegel) gaan mee met de deur. De 'plaat' was het
platte zwarte vlak dat hun model binnenin op raamhoogte heeft; dat gaat eruit (alleen diep binnenin, de raamsluiting langs de flank
blijft). Het eenvoudige interieur volgt de breedte van de flank op elke plek. De getekende deurnaden van de hybride zijn weg: de echte
kier is de naad. `scripts/deursnipper_test.mjs` faalt bij losse snippers langs de contour.

Aangepaste tests (bewust): `vehicledoors3d_test` telt bij een echt gat alleen deuren die uit hun rustpositie staan; `vehicledoors_test`
verwacht 63 graden; `voertuigmodel_test`, `vehicledoorcuts_test` en `vehicle_interior_plate_test` keuren onze eigen bouwer
(`hybride: false`); `vehicle_zfight_test` staat bij de hybrides snippers langs de knipranden toe (geen flush, samen onder 50 cm2).

### Vijfde ronde: losse eilanden, uitlaat, stoelen en dashboard

- Losse eilanden: `hybridBody` ruimt na het knippen elk aaneengesloten stuk onder 150 cm2 binnen 10 cm van een deurcontour op (romp en
  deurblad), en `knipDeurgaten` (vrachtwagen, trekker, trekker-limo) laat geen platte reepjes onder 1 mm2 meer aan het deurblad.
  `deursnipper_test` controleert nu elk los eiland langs de opening: in de romp binnen de flank (de buitenste 40 % van de halve
  breedte, dieper is interieur), en aan het deurblad ook als het buiten de flank uitsteekt; alleen het handvat mag los zitten.
- Dorpel: elk deurblad blijft binnen zijn contour (gemeten: bbox van elk deurblad valt binnen de deurrechthoek, sedan, hatch, SUV,
  trekker-limo); de strip die onder een open voordeur zichtbaar blijft is de dorpel van de romp zelf.
- Uitlaat (hybride): twee pijpjes van 4,8 cm doorsnee en 14 cm lang, half in de onderkant van de achterbumper (gemeten per romp:
  laagste punt in de laatste 35 cm), de punt 2 cm voorbij de achterkant. De dubbele spiegel (ons blok naast hun deurspiegel) is weg.
- Interieur uit het register: `autostoel` (rails, zitting met zijwangen die naar achteren zakt, schuine rugleuning, hoofdsteun op
  stangen; norm 150 tot 400 driehoeken) en `dashboard` (aflopende bovenkant, kap, twee meters, roosters, middenconsole met radio en
  pook, stuur met spaak en naaf op een schuine kolom; norm 250 tot 700). Gebruikt door het procedurele en het hybride interieur.
  De hybride norm gaat daardoor naar 7.500 driehoeken op niveau 0 (ca. 1.500 voor het interieur, dat op LOD 1 en 2 verborgen is).
- Gezien op het contactblad (`gat3`, ook nieuw `-nabij`): stoelen, dashboard, uitlaat, geen dubbele spiegel. Niet zeker: een dunne
  donkere lijn langs de dorpel in de bovenaanzicht (vermoedelijk de 6 cm rand van de opening, op de kant gezien) en de bovenkant
  van het open achterportier (raamlijst van hun romp die meegaat met de deur).

### Na de beoordeling: dashboard, wielkast en interieur binnen de romp

- Het "donkere blok met grijze kast" naast de open voordeur was het voorwiel met zijn wieldop: de voordeur liep over de achterkant
  van de voorste wielkast door, dus het gat liet het wiel zien. Een portier van een hybride begint nu achter de voorste wielkast en
  eindigt voor de achterste (wielstraal plus 4 cm), houdt zijn breedte van 0,8 m en schuift daarvoor naar de B-stijl (minstens 14 cm
  stijl). De rig volgt via `userData.deurMaat` (vehicledoors3d.js).
- Het dashboard was op 27 % van zijn breedte samengeknepen (de flank loopt bij de voorruit in) en stond te ver naar voren. Nu schuift
  het naar achteren tot de romp minstens 85 % van zijn breedte vrij laat (achter de onderrand van de voorruit) en wordt het alleen
  zo smal als de flank daar toelaat. Stoelen en vloer volgen dezelfde vrije breedte per plek (`ruimte` in `addInterieur`); de
  achterbank schuift naar voren tot de hoofdsteun onder de achterruit past.
- Test: `deursnipper_test` eist dat elk punt van het interieur (vloer, stoelen, dashboard) minstens 5 mm binnen de buitenste flank
  ligt (romp en dichte deuren, een straal langs z op dezelfde x en y); geen flank daar (boven het dak of achter de ruit) telt als buiten.
- De zwarte raamlijst op de flank gaat nu altijd mee met de deur (ook zijn bovenvlak), anders bleef een reepje in de opening.
- Het rode blokje boven de A-stijl was ons losse spiegelblok aan de overkant; dat is weg (zie de vijfde ronde). Wat daar nu zit is
  de spiegel van het pakket, vast aan de voordeur.
- Gezien op het contactblad: dicht van opzij (naden achter de wielkasten), open schuin en van boven. Niet zeker: een dun licht
  lijntje op de raamlijn tussen de B-stijl en de voordeur in het zijaanzicht.

## Niet in beeld gezien

- Vierde ronde: niets in het spel bekeken; geen fps gemeten (alleen driehoeken). De echte cabine van `cabin3d.js` in de hybride (die volgt
  `hybridFit`), het verkeer met de nieuwe botsmaten (rijbanen, parkeerplekken, garages: een hatchback is nu 4,33 m in plaats van 3,8 m),
  de dither-overgang tussen de LOD-niveaus in beweging, en de politielampen en koplampen 's nachts op de hybride.

- Geen enkel model is in het echte spel bekeken (geen Electron-run; de perf-agent had het slot). Alleen het contactblad is gezien.
- De trekker-limo met bestuurder en passagiers (de zithoogte `y: 0.5` van `limoStoel` is gekozen naar de auto's, niet bekeken).
- De open deuren van een voertuig met echte cabine (stencil-opening van `cabin3d.js`): alleen de nieuwe naden en bekleding zijn gezien.
- Nacht: de nieuwe koplampen en achterlichten van de limo en de lichtbak van het bushokje.
- Spelfps; alleen driehoekentellingen.
- Samen spelen: geen netwerkgedrag veranderd. Deuren en de limo zijn weergave van `v.doors` en het voertuigmodel (zoals eerst); de
  props zijn wereldweergave per speler. Gedrag bij wegvallen en laat aansluiten verandert niet.
