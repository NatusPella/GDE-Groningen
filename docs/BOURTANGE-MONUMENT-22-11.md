# Bourtange als monument (22-11)

Feedback van de eigenaar: "Bourtange moet als een monument voelen, nu lijkt alles veel te modern." Dit document legt vast hoe Vesting Bourtange er echt uitziet (onderzoek, in eigen woorden), wat het spel er nu van toonde en wat we bouwden. De bouw is de **monumentgebied-regel** in `game/js/heritagearea.js`: een lijst gebieden met parameters, zodat een volgende plek (Martinitoren-plein met de Vismarkt, Appingedam met de hangende keukens) één regel erbij is. Issues: #953 (hertest, blijft open) en de wens "Bourtange als monument (historische sfeer)".

Onderzoek is alleen gelezen (geen afbeeldingen of tekst overgenomen). Zie de bronnen onderaan.

## 1. Onderzoek: hoe Bourtange eruitziet en is opgebouwd

**Geschiedenis.** In 1580 legde de opstandige Republiek op een zandrug in het Bourtangermoeras een schans met vijf bolwerken aan, om de aanvoer vanuit Duitsland naar het door de Spanjaarden bezette Groningen te sluiten. Willem Lodewijk van Nassau bouwde de vesting in 1593 grondig opnieuw op. Haar grootste omvang kreeg ze in 1737-1742; in 1851 werd ze opgeheven en werd Bourtange een agrarisch dorp. Tussen 1967 en 1992 is de vesting herbouwd naar de situatie van 1742. Het is nu beschermd dorpsgezicht en een openluchtmuseum met vrije toegang tot de wallen.

**Vorm.** Een vijfhoekige ster: vijf (in de uitbreiding zes) puntige bolwerken met wallen van aarde, bekleed met gras. Daaromheen een brede walgracht. Aan de oostkant ligt een kroonwerk, aan de noord- en westkant liggen driehoekige ravelijnen, vooruitgeschoven eilandjes in het water. Buiten de gracht lagen inundatievelden die onder water gezet konden worden. De hele vesting is ca. 400 m over.

**Toegangen.** Drie poorten met houten bruggen over de gracht: de Munsterse Poort (oost), de Friese poort (west, bij de ophaalbrug) en een derde doorgang. De bruggen zijn hout, met rood geverfde delen.

**Straatplan.** Vanaf het vijfhoekige Marktplein lopen de straten als spaken naar de bolwerken en poorten. Het zijn ca. tien korte straatjes, autovrij, met kinderkopjes (keitjes) bestraat. De namen verwijzen naar het leger: Kazernestraat, Kruitstraat, Commandeurstraat, Batterijenstraat, Kapitein Prottstraat, Bisschopsweg. Veertien oude linden staan rond het Marktplein.

**Gebouwen.** Ruim zeventig woningen en bijgebouwen op een bescheiden schaal, van baksteen en hout, met pannendaken en kleine ramen: het officierslogement (Kapiteinswoning en Convooimeestershuis, 17e eeuw), 's Lands Huys, de soldatenbarakken, het kruitmagazijn met een los dak (een ontploffing mocht het huis niet meenemen), de Hoofdwacht, herbergen bij de poorten. De kerk uit 1869 verving de garnizoenskerk van 1607, de eerste speciaal voor protestanten gebouwde kerk in het noorden; ze heeft een lage dakruiter, geen toren. De synagoge (1842) in de Batterijstraat is nu museum. Op het molenbastion staat een houten koren- en pelmolen (kopie uit 1980 van de molen die in 1832 vertrok), en er is een rosmolen die door een paard werd aangedreven. Op de wallen staan houten schutterstorentjes en boven de gracht hangen houten secreten.

**Uitstraling.** Rode tot bruine baksteen, witte en groene kozijnen en luiken, pannendaken, schoorstenen. Geen asfalt, geen auto's, geen reclame. Rustig: je hoort vogels en wind; af en toe een kanonschot bij demonstraties. Soldaten in 18e-eeuwse kleding en dorpsbewoners lopen rond als re-enactment.

**Omgeving.** Bourtange ligt tegen de Duitse grens in Westerwolde, op een zandrug in wat het ondoordringbare Bourtangermoeras was; daaromheen heide, veen, bos en weiland, met de oude inundatiewegen en de Bourtangerkanaal-lijnen.

### Monumentgevoel (de puntenlijst)

1. Geen asfalt: klinkers in de straten, zandpad op de wallen en paden.
2. Geen markeringen, verkeersborden, bushokjes, reclame en moderne lantaarnpalen.
3. Autovrij: geen rijdend of geparkeerd verkeer; fietsen mogen.
4. Gevels van rood-bruine baksteen, pannendaken, kleine ramen, witte of groene kozijnen, veel schoorstenen; geen etalages, zonwering of installaties op het dak.
5. De wallen zijn echt hoog, met een gras-helling; het bolwerk is een heuvel met kanonnen.
6. De gracht is breed water met houten bruggen en poorten.
7. Herkenbare gebouwen: de kerk met dakruiter, de houten molen, de barakken en het officierslogement, de Hoofdwacht bij de poort.
8. Linden rond het Marktplein (veertien), banken van hout, hekken.
9. Aankleding uit de tijd: kanonnen, kanonskogels, tonnen, vlaggen, historische lantaarns die 's avonds warm branden.
10. Mensen: wandelaars in zomerkleding en een paar figuranten in historische kleding.
11. Geluid: vogels en wind, geen verkeer; verre klok of trommel (alleen bestaande geluiden).
12. Iets warmer papier in de kleur, zodat het hele beeld ouder voelt.

## 2. Analyse: wat het spel toonde (modern)

Vastgesteld met `node scripts/bourtange_scan.mjs` (telt de tegels in een straal van 330 m rond het Marktplein) en met de bronnen van de wereldbouw:

| Onderdeel | Toen | Modern omdat |
| --- | --- | --- |
| Wegen | 31 woonstraten, 55 servicewegen, 52 voetpaden en 37 trappen met de gewone stadsregel (asfalt, deels klinker op de hash) | asfalt met markeringen; de stad-regel koos klinkers bij toeval |
| Gevels | de stedelijke gevel: willekeurige familie (blauw dak, wit stuc), etalages en zonwering, platte daken met zonnepanelen en luchtbehandeling | de vesting is baksteen en pannendak, zonder installaties |
| Straatmeubilair | lantaarnpalen (`lampRule`), bushokjes, plaatsnaamborden, vangrails, fietsenrekken, afvalbakken, straatnaam op het wegdek | alles van de moderne straat |
| Verkeer | auto's, brommers en motoren op de woonstraten, geparkeerde auto's langs de kant | het dorp is autovrij |
| Wallen | in de kaartdata zijn de wallen voetpaden met het label brug zonder water; `dropNeedlessDeck` (#953) zette ze op de grond om pijlers te voorkomen, waardoor de wallen vlak werden | een vesting zonder wal |
| Mensen | de gewone stadsrollen: bouwvakkers, zakenlieden, feestgangers | geen vestingdorp |
| Geluid | stadsbed en verkeer uit het gewone model | verkeersgeluid in een autovrij dorp |
| Molen | een witte stellingmolen van 20 m | de echte molen is een kleine houten molen |
| Kaart | alleen een gewoon uitkijkpunt en de landmarks | geen eigen monumentpunt |

Wat al klopte: de kerk (`Kerk van Bourtange`, dakruiter, leisteen), de straatnamen, de poorten als gebouwen (Friesche Poort, Munsterse Poort) en het water in de gracht.

## 3. Wat er gebouwd is

Eén zuivere module, `game/js/heritagearea.js`, met de gebieden en één vraag per haakpunt. Elke regel is data; Bourtange (middelpunt het Marktplein, straal 235 m, uitdoofrand 45 m) is het enige gebied. De haakpunten:

| Haakpunt | Gebied-regel |
| --- | --- |
| `roadsurface.js` `roadSurface` | straten rood klinker (servicewegen grijs), paden en wallen zandpad; omdat markeringen alleen op asfalt komen, verdwijnen die |
| `streetfurniture.js` `furnitureForTile`, `nightlights3d.js` (regel- en OSM-lantaarns), `streetsigns.js` | geen lamp, bushokje, plaatsnaambord, wegwijzer, vangrail, hectometer, drempel, geluidsscherm, paal, fietsenrek, afvalbak, geen straatnaam op het wegdek; bank, hek en heg blijven |
| `vehicle.js` (auto, motor, brommer), `parkedcars.js` | geen rijdend of geparkeerd verkeer; wat binnenrijdt verdwijnt buiten 30 m van de speler; fietsen mogen |
| `models3d_buildings.js` | historische gevel: baksteen in vijf rood-bruine tinten, pannendak, witte of groene kozijnen, kleine ramen, schoorstenen (90 procent), pannendak op alles tot 18 m diep, geen etalage, zonwering en dakinstallaties |
| `mapdata.js` `dropNeedlessDeck` | een wal in het gebied houdt zijn profiel (begrensd op 3,2 m, vanaf 2 m) en wordt een aarden ophoging met grashelling in het hoogtemodel (`elevation.js`), geen dek op pijlers |
| `clothing.js`, `clothingdata.js`, `scene3d.js` | buurt `monument`: voetgangers, toeristen en wandelaars in zomerkleding, plus rol `historisch` (overhemd of jurk, lange jas, laarzen, platte hoed; alleen bestaande kledingstukken, overdag) |
| `sfx/ambience.js` | geen verkeer, stadsbed op 15 procent, groen en open op 0,8 en 0,6: de bestaande vogel- en windlagen nemen het over; geen nieuwe audio |
| `monumentdecor.js`, `monumentdecor3d.js`, `monumentkits3d.js` | aankleding: 11 kanonnen op de bolwerken en het molenbastion, 4 kogelstapels, 8 tonnen, 14 linden rond het plein, 4 banken, 4 vlaggen bij de poorten, 26 historische lantaarns langs de straten die 's avonds warm branden, 7 figuranten in historische kleding (stilstaand of pratend, bij plein, poorten en molen); elke plek wordt op de tegels gelegd (droog, geen gebouw, niet op een weg) |
| `landmarkkit.js` | de Vestingmolen is een kleine zwarte grondzeiler van 14 m, niet meer een witte stellingmolen |
| `hud_panel.js`, `mapview.js`, `mapicons.js`, `ommelandlandmarks.js` | monumenticoon (vijfhoek in vijfhoek) met naam en korte tekst op de grote kaart en de minikaart |

De missiestappen van M30 (bolwerk 1 tot 3, poort, plein) en het uitkijkpunt blijven werken: `bourtange_test` en `m30_bolwerk_test` zijn ongewijzigd groen. Dat kon zonder aanpassing omdat beide tests het platte raster van de tegels lezen; de wal verandert de bolwerken niet van plek, alleen hun hoogte.

### Samen spelen

De wereld is van de host en alle regels zijn data die voor iedereen gelijk is: dezelfde zone, dezelfde klinkers, dezelfde plekken van de aankleding (geen toeval; `fitMonumentDecor` is deterministisch op dezelfde tegels). Elke speler bouwt de aankleding lokaal uit die data; er gaat niets over het net en het protocol verandert niet. Verkeer, mensen en geluid volgen de lokale kaart (voor een gast zoals voor de host). Wie wegvalt of later aansluit ziet dezelfde vesting.

### Wat bewust niet of anders is

- **De wal in de wereldhoogte**: alleen paden die de kaartdata als hoge brug zonder water kent worden wal (zie `dropNeedlessDeck`). De tegels in `game/world` van deze worktree dragen geen hoogteprofiel op die paden, dus dit is met een proefprofiel op de echte paden getest (`monumentzone_test`, onderdeel 6 en 11), niet met de gestreamde profielen. In beeld nog niet bekeken.
- **Bolwerken als massieve heuvel**: een bolwerk is bij ons de wal met paden erop, geen aaneengesloten vlakke heuvel; er is geen aparte rampart-kit.
- **Warmer papier (Wereldkleur)**: de functie `monumentTintAt` en de parameter `tint.warm` bestaan, maar de wereldkleur (`worldpalette.js`) is globaal en nog niet per gebied te verschuiven. Klinker-, baksteen- en pannenkleuren zijn wel warmer. Nog niet gekoppeld.
- **Kar met paard** (ambient) en **klok of trommel**: niet gebouwd; geen bestaande kar-prop en geen vrije sfx-sleutel zonder nieuwe audio.
- **Botsing**: kanonnen, tonnen en linden zijn decor zonder botsvorm (zoals `missiedecor`).
- **Avondglans** is een warme gloed op het lantaarnglas, geen echte lichtbron; de gewone nachtlantaarns zijn in het gebied uit.
- **Wegen op de wal**: de zandpaden op de wallen staan op de wegenlaag; de hoogte komt uit het hoogtemodel.
- **Steden**: Martinitoren-plein en Appingedam zijn niet gebouwd, alleen mogelijk gemaakt: voeg een object toe aan `HERITAGE_AREAS` en (voor aankleding) een formule in `monumentdecor.js`.

## 4. Plekken voor de screenshotjacht

Scene #953 in `scripts/ui/hertest_scenes.js` maakt de opnamen `a`, `b` (plein en lucht), `poort`, `kerk`, `wal`, `gracht`, `plein` en `avond`, en meet `autosInGebied` (moet 0 zijn buiten bewust gestuurde auto's) en `walHoogte`. Wat een mens moet zien:

- **Poort** (Munsterse Poort, 42492, 22881): rode baksteen, houten brug, vlaggen, geen bord of lantaarnpaal.
- **Kerk** (42417, 22773): dakruiter, leisteen, linden rond het plein.
- **Wal** (bolwerk 1, 42583, 22679): gras, kanonnen, tonnen en kogelstapel; staat de wal hoger dan het plein?
- **Gracht** (42468, 22640): water en bruggetjes, geen verkeer erlangs.
- **Plein** (42470, 22800): klinkers, veertien linden, banken, figuranten in historische kleding.
- **Avond**: warme lantaarnglans, vensters, geen moderne lantaarnpalen.
- Mensen: loopt iemand in een lange jas en platte hoed, en zijn de anderen in zomerkleding?
- Geluid: geen autogeluid, wel vogels en wind.
- Prestaties: de aankleding bouwt 71 onderdelen en 7 figuranten; kijk of de fps op het plein gelijk blijft.

## Bronnen (alleen gelezen)

- https://nl.wikipedia.org/wiki/Vesting_Bourtange
- https://urbanplan.nl/series/bourtange.htm
- https://www.geschiedenisextra.nl/nl/bourtange.htm
- https://noorderland.nl/artikel/495777/terug-in-de-tijd-in-bourtange-van-vesting-tot-toeristisch-bolwerk
- https://gpswalking.nl/wandeling/842/bourtange
- https://www.dagjeweg.nl/tip/4375/Vesting-Bourtange:-een-dagje-weg-vol-geschiedenis!
- https://reis-liefde.nl/vestingstad-bourtange-stad-bezoeken/

De bronnen spreken elkaar op punten tegen (aantal bolwerken: vijf in de oorspronkelijke schans, zes in de uitbreiding; het begin van de reconstructie: 1967 of 1971). Waar ze verschillen is de voorzichtigste lezing gekozen.
