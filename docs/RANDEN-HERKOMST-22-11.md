# Herkomst van de randen: wat uit de kaartdata komt en wat verzonnen was (#1092, 22-11)

De eigenaar zag op de minimap bij Hoornweg (Marum) en Kerkstraat (Usquert) dunne lichtblauwe lijnen in een raster van rechthoeken in het
groene landbouwgebied: "kunstmatige randen, dit moet volledig uit de game als het niet uit de kaartdata komt". Eis: elke perceelrand, sloot,
heg, hek, boomrij of veldgrens bestaat alleen als er een kaartobject met een bron-id achter zit (OSM-lijn of -vlak in een tegel).
Dit document is het bewijs: waar elke lijn vandaan kwam, wat is verwijderd en wat blijft. Het vervolg op
[PERCEELRANDEN-21-11.md](PERCEELRANDEN-21-11.md), dat de randen in de 3D-props al had opgeruimd maar de kaart, de grondshader en een paar
randgeneratoren liet staan.

Meten: `node scripts/randen_herkomst_audit.mjs` (met `--game=<map>` voor de oude code, `--world=<map met index-provincie.json>`), beelden:
`node scripts/randen_beeld.mjs`. Bewaking: `node scripts/geen_fake_randen_test.mjs`.

## De bevinding in één alinea

De lichtblauwe rasters op de minimap waren geen kaartdata. Ze kwamen uit `drawCountryDetail` (`game/js/countrymap.js`), het
hash-rooster van het verzonnen platteland (strooksloten van 40 x 240 m en hoofdsloten om blokken van 960 m). Die laag tekende ook op land
dat door de echte tegels gedekt is: alleen de maaren hielden op bij `provinceBlock`, de strooksloten en hoofdsloten niet. Op de minimap
heeft `MINI_STYLE.ditch` dezelfde kleur als `MINI_STYLE.water` (#5d95a5), dus een verzonnen sloot was niet te onderscheiden van een echte
OSM-sloot. De echte sloten staan er ook (onregelmatig, met bron-id) en blijven. In de beelden van `docs/beeld-22-11/randen/` is het
verschil te zien: links wat het spel tekende, midden dezelfde lijnen met rood voor "procedureel", rechts na de opruiming.

## Bronnen van procedurele randen (voor deze wijziging), met bestand:regel op main (85932442f)

| # | Bron | Plek | Waar het zichtbaar was | Gehaald |
|---|------|------|------------------------|---------|
| 1 | Strooksloten op de kaart (hash, 80 m stukken) | `game/js/countrymap.js:187` | minimap en grote kaart, ook op gedekt land | weg |
| 2 | Hoofdsloten om de blokken van 960 m | `game/js/countrymap.js:222` | idem | weg |
| 3 | Maaren (brede kanalen langs blokranden) | `game/js/countrymap.js:233`, `countryfield.js:191` (`maarX`, `maarY`) | idem, op open land | weg (de naam blijft alleen voor de dorpsplaatsing) |
| 4 | Bomenrijen langs polderwegen | `game/js/countrymap.js:243`, `countryplan.js:22` (`ROAD_ROW`) | kaart, open land | weg |
| 5 | Bomenlanen langs polderwegen in 3D | `game/js/countryside.js:313` | open land | weg |
| 6 | Strook-, hoofd- en maarsloten als grondsoort `sloot` | `game/js/countryfield.js:261` (`dDitch`), `:270` (`dMaar`), `:302` en `:304` (`countrySurface`) | rijden en lopen | weg |
| 7 | Geschilderde sloten, oevers en randen in de grondshader | `game/js/countryfield.js:465` (`dD`, `dM`), `:471` (`keepD`), `:577` (`dQ`) | 3D-grond, open land | weg |
| 8 | Slootverloop dat de kavelgrens volgde (`ditchRamp`, `thinDitchOn`) | `game/js/countryfield.js:109`, `:113` | kaart en 3D | weg |
| 9 | Bruggen over maaren en hun leuningen | `game/js/countryside.js:424` (`genBridges`), `countryrails.js:17` (`polderLines`) | 3D, open land | weg |
| 10 | Oeverriet langs maaren | `game/js/countryside.js:887` (`reedItems`, `addReeds`) | 3D, open land | weg |
| 11 | Boten op maaren | `game/js/countrylife.js:580` (`spawnBoat`) | 3D, open land | weg |
| 12 | Verzonnen perceelrechthoek als kaartvlak van je eigen veld (hectare en hoek per id, "een schets") | `game/js/percelen.js:66` (`perceelVlak`), `perceelmap.js:94`, `mapview.js:1775` | grote kaart, laag Percelen | weg |
| 13 | Dezelfde schets als omtrek van een perceel in Te koop zolang `bezit-vormen.json` niet geladen is | `game/js/forsalemap.js:28` | grote kaart, laag Te koop | weg |

De bronnen 1 tot en met 4 en 12 en 13 zijn wat de speler op de kaart ziet; 5 tot en met 11 stonden in de 3D-wereld op open land
(buiten wat de tegels dekken). De randen van [PERCEELRANDEN-21-11.md](PERCEELRANDEN-21-11.md) (strookrijen, heg, draad, houtwallen, erfheg,
groenvlakheggen) waren al weg; de audit en `geen_fake_randen_test.mjs` bewaken dat ze weg blijven.

## Aantallen voor en na (audit, 5 landelijke locaties, 45 tegels van 1 km)

Kaartlijnen die `drawCountryDetail` tekende, met de tegels die de provincie dekken (zoals in het spel):

| Locatie | minimap (380 m) voor, na | kaart dichtbij (750 m) | kaart uitgezoomd (3 km) |
|---------|--------------------------|------------------------|-------------------------|
| Hoornweg, Marum | 257, 0 | 996, 0 | 600, 0 |
| Kerkstraat, Usquert | 259, 0 | 961, 0 | 650, 0 |
| Warffum (Hogeland) | 247, 0 | 999, 0 | 600, 0 |
| Baflo (Ommelanden) | 254, 0 | 991, 0 | 650, 0 |
| Ter Apel (Westerwolde) | 264, 0 | 972, 0 | 474, 0 |

Totaal 9.174 lijnstukken voor, 0 na. Alle 9.174 waren strooksloten (de hoofdsloten, maaren en bomenrijen stonden niet in de gedekte vensters).
Verboden generatornamen in de code: 31 voor, 0 na.

3D op open land (144 tegels van 160 m, 4 plekken buiten de tegeldekking): oeverriet 3.518 (maaren) naar 0, bruggen 1 naar 0, bomenlanen
langs polderwegen 465 naar 0, dus gemiddeld 27,7 randobjecten per tegel naar 0 (de grondshader schildert er ook geen sloten meer).

Tegelrijen (de data zelf, 45 tegels): alle rijen die een rand kunnen zijn hebben een bron-id (`gid`, bij hekken en heggen ook het `osm`-nummer):

| Locatie (9 tegels) | slootlint (waterway) | hek | heg | poort | landgebruikvlak |
|--------------------|----------------------|-----|-----|-------|-----------------|
| Hoornweg, Marum | 18 | 1 | 3 | 4 | 50 |
| Kerkstraat, Usquert | 81 | 9 | 5 | 2 | 147 |
| Warffum | 32 | 9 | 4 | 8 | 178 |
| Baflo | 35 | 9 | 29 | 8 | 170 |
| Ter Apel | 34 | 13 | 10 | 15 | 125 |

Procedurele rijen in de tegels: 0. De bouwers (`worldbuilder.js`, `build_province.mjs`, `derive_tiles.mjs`) kennen het hash-rooster niet: een
sloot, heg, hek of vlak komt alleen uit OSM-tags (`waterway=ditch|drain|stream`, `barrier=hedge|fence|wall`, `landuse`).

## Wat er veranderd is

- **Kaart** (`countrymap.js`): geen strooksloten, hoofdsloten, maaren of bomenrijen meer. Wat `drawCountryDetail` nog tekent: polderwegen,
  boerderijen en dorpen van het verzonnen platteland op open land buiten de tegeldekking, en de windturbines van de tegels. Op land dat de
  tegels dekken tekent de renderer geen enkele lijn.
- **Grond en gedrag** (`countryfield.js`): `parcelAt` kent geen afstand tot een perceel-, hoofd- of maarsloot meer, `countrySurface` geeft
  nooit `sloot`, de grondshader schildert geen sloten, oevers of randen. Water is alleen wat de tegels hebben.
- **3D-props**: geen bomenlanen langs polderwegen, geen bruggen en leuningen over maaren, geen oeverriet, geen boten op maaren.
- **Percelen op de kaart**: je eigen veld (laag Percelen) is een label met statusicoon op het veld, zonder getekend vlak. Te koop toont een
  perceel zonder echte omtrek als kaartje op het binnenpunt; de echte omtrek (`bezit-vormen.json`, de omtrekken van de echte percelen) blijft.
  De grenslijn van een eigen perceel in 3D (`bezitmarker.js`) gebruikt alleen die echte omtrekken en bleef ongewijzigd.
- **Laadkant** (`edgeclasses.js` `isProceduralEdgeRow`, `tileworld.js`): een randrij zonder bron-id (heg-, hek-, muurlijn, slootlint,
  landgebruikvlak) wordt bij het laden overgeslagen. Een oude wereld is dus ook schoon zonder herbouw, voor zover de rijen een gid missen.

## Wat blijft en wat een herbouw vraagt

- Een wereldherbouw is **niet nodig voor deze wijziging**: de tegels van de huidige wereld hebben alleen rijen met bron-id (0 procedureel
  in 45 tegels), en het laadfilter vangt een oude wereld op. De releasegate-stap `world` hoeft hierom niet opnieuw te draaien.
- De echte OSM-sloten staan als water in de tegels en blijven op de minimap; de kleur is gelijk aan die van ander water (#5d95a5), zodat een
  echte sloot er net zo uitziet als een kanaal. Of de minimap die sloten rustiger moet tekenen is een ontwerpkeuze (los issue), geen herkomstkwestie.
- De rest van het verzonnen platteland op open land blijft: polderwegen, boerderijen, dorpen en de kleurvlakken per perceel in de grondshader
  (zachte kleurverschillen, geen lijn of rand). Ze zijn geen perceelrand, sloot, heg, hek, boomrij of veldgrens; of ze op termijn ook uit de
  game moeten is een eigen besluit van de eigenaar.
- `barrier=gate` (poorten van de kaart) wordt nog niet getekend (zoals voorheen).

## Buiten de tegeldekking: alleen kaartdata of neutraal gras (#1092, 22-11)

Besluit eigenaar: wat niet uit de echte kaartdata komt, staat er niet. Buiten wat de tegels dekken (het "platteland" van `countryside.js`,
`countryfield.js`, `countryplan.js`) is de grond nu neutraal gras: geen polderwegen, geen erven en boerderijen, geen dorpen, geen
kleurvlakken per perceel, geen kavelranden. Het hash-rooster (`chash`) kan nog aan voor de eenheidstests van de generatoren
(`setCountryFiction(true)` in `countryfield.js`); het spel zet het nooit aan. Het verloop naar de echte tegels blijft het zachte,
ruisverstoorde veer van `countryWeight` (180 m in de tegels, 20 m erbuiten), er komt dus geen harde rand of leegte.

Herkomst per element: wat de bron is, of het al in de tegelpijplijn zit, en wat er nu getoond wordt. "Pijplijn" is `scripts/world/build_province.mjs`
(en `build_corridor.mjs`, `derive_tiles.mjs`) met de Geofabrik-extracten in `data/cache` (ontwikkeltijd, het spel haalt niets op).
`geen_fake_randen_test.mjs` toetst dat elk element hieronder in deze tabel staat.

| Element | Bron | In de tegels | Wat het spel toont |
|---------|------|--------------|--------------------|
| Landgebruik (akker, weide, boomgaard) | OSM `landuse=farmland\|meadow\|orchard` (vlakken vanaf 0,2 ha) | ja, sectie PARCELS met `gid` (`worldbuilder.js` `PARCEL_USE`) | in de tegels de echte vlakken; vee alleen op `weide` (zie Vee in de wei); geen kleurvlak buiten de tegels |
| Perceelgrenzen | dezelfde OSM-vlakken; eigendomspercelen uit `bezit_index.mjs` (aaneengeregen vlakken, geen BRP) | ja (PARCELS) en `bezit-percelen.json`, `bezit-vormen.json` | alleen de echte omtrek (kaartlaag Percelen en Te koop, `bezitmarker.js`); geen verzonnen rechthoek |
| Sloten, greppels, beken | OSM `waterway=ditch\|drain\|stream` | ja, WATER met `gid` | water uit het tegelmasker (`tilewatermask.js`); geen geschilderde sloot |
| Heggen, hekken, boomrijen | OSM `barrier=hedge\|fence\|wall`, `natural=tree_row` | ja, FURNITURE met `gid` of `osm`; `isProceduralEdgeRow` weigert rijen zonder bron-id | alleen die rijen |
| Landbouwwegen en paden | OSM `highway=track` (3 m) en de andere wegen | ja, ROADS | de echte wegen; geen polderweg |
| Boerderijen, schuren, kassen | OSM `building=farm\|farmhouse\|barn\|farm_auxiliary\|cowshed\|stable\|greenhouse` (`worldbuilder.js`), met 3D BAG voor vorm en hoogte | ja, BUILDINGS | de echte panden; geen verzonnen erf met paden of balen |
| Windturbines en hoogspanningsmasten | OSM `power=generator` (wind) en `power=tower` (`farprops.mjs`) | ja, in de tegelpijplijn | blijft (echte data, ook op de kaart) |
| Dorpen en dorpsnamen | OSM `place=*` en woonplaatsgrenzen | ja, `places` in `index-provincie.json` | de echte plaatsen; de verzonnen wierdedorpen met echte namen zijn weg |
| Vee in de wei | geen eigen bron: soort en kudde volgen uit de streek (`dierenplan.js`, deterministisch) op de OSM-weide | de weide wel (PARCELS), de dieren niet | vee alleen op een echte weide (`landUseAt === 'weide'`); de kudde heeft een vaste plek en grootte uit de hash, in Samen spelen voor iedereen gelijk |
| Dijken | OSM `man_made=dyke` staat in het extract | nog niet als eigen rij (alleen de vlag `embankment` op wegen) | niets; blijft neutraal tot een bouwer ze meeneemt (vervolgwens) |
| Windmolens (korenmolens) | OSM `man_made=windmill` staat in het extract | alleen waar het een gebouw is; geen aparte molenlaag | alleen als pand; geen losse molen |
| Voorbij de bufferstrook (Friesland, Drenthe, Duitsland) | geen bron in de repo of de pijplijn | nee | neutraal gras met mist; uitbreiden vraagt een nieuw extract (ontwikkeltijd) en een wereldbouw |

Wat is verwijderd: `edgeRoad` geeft zonder `setCountryFiction(true)` nooit een polderweg (dus ook geen gashuisje, erf, uitweg, bord of
verkeer erop), `villageOf` geen dorp, de grondshader (`COUNTRY_GLSL`) schildert geen weg, dorp, maaiplek, hooi, ploegsel, gewas of
weidekleur per perceel meer (een vaste groene kleur met fijne korrel), en `genParcel` (`countryside.js`) zet alleen nog een kudde (en
ganzen) op een echte weide. Hooibalen, kieviten op kavels en eendjes in verzonnen sloten bestaan alleen met de generator aan.

Samen spelen: de wereld blijft van de host en deterministisch. Elke speler draait dezelfde code met dezelfde tegels, dus iedereen ziet
dezelfde kudden op dezelfde echte weiden. Niets in snapshots, opslag of netwerk verwees naar een polderweg, erf of dorp van het hash-rooster
(de ids en plaatsing van echte objecten uit de tegels zijn ongewijzigd), dus een bestaande save blijft heel.

## Samen spelen

De wereld is van de host en deterministisch; dit haalt verzonnen randen weg en verandert niets aan het netwerk, de snapshots of de
voortgang. Een gast ziet dezelfde randen als de host, want ze komen uit de tegeldata.
