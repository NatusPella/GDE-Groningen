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
- Nieuwe beelden: `na-limo.png`, `na-limo-achter.png`, `na-limo-zij-open.png`, `na-deur1-zij-open.png`, `na-deur-zij-open.png`, `na-bak.png`.

## Niet in beeld gezien

- Geen enkel model is in het echte spel bekeken (geen Electron-run; de perf-agent had het slot). Alleen het contactblad is gezien.
- De trekker-limo met bestuurder en passagiers (de zithoogte `y: 0.5` van `limoStoel` is gekozen naar de auto's, niet bekeken).
- De open deuren van een voertuig met echte cabine (stencil-opening van `cabin3d.js`): alleen de nieuwe naden en bekleding zijn gezien.
- Nacht: de nieuwe koplampen en achterlichten van de limo en de lichtbak van het bushokje.
- Spelfps; alleen driehoekentellingen.
- Samen spelen: geen netwerkgedrag veranderd. Deuren en de limo zijn weergave van `v.doors` en het voertuigmodel (zoals eerst); de
  props zijn wereldweergave per speler. Gedrag bij wegvallen en laat aansluiten verandert niet.
