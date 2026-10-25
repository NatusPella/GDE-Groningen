# Grote Markt and Vismarkt: the buildings

Research notes behind `game/js/marktgebouwen.js` and the Stadhuis and
Goudkantoor models in `game/js/landmarks3d.js`. Values marked (est.) are
estimates from photos and general knowledge, not from a source.

Map orientation: x east, y south. The Grote Markt's open square is roughly
x 150-240, y 40-160. The Vismarkt runs WSW-ENE from the Korenbeurs
(-110, 308) to Tussen Beide Markten (75, 180).

## Grote Markt

### Stadhuis (Grote Markt 1, 1793-1810, Jacob Otten Husly)
- West side, main front faces **east** onto the square (the old model put
  the loggia on the north side).
- Souterrain, bel-etage and one upper floor; eaves at about 16 m (est.),
  low hipped roof, no dome.
- Pale yellow-beige Bentheimer sandstone, colossal pilasters, a heavy
  cornice.
- In the middle of the front: **four** colossal Composite columns under a
  triangular pediment, reached by a bordes with steps.
- Model: east front picked by the outward normal, pilasters between all
  bays, three window tiers, a recessed portico with four columns on a
  stepped platform, a pediment with the city arms, a low hipped roof rim.
- Sources: https://monumentenregister.cultureelerfgoed.nl/monumenten/18466 ,
  https://nl.wikipedia.org/wiki/Stadhuis_van_Groningen , https://hcva.nl/werk/stadhuis-groningen-2

### Goudkantoor (Waagplein 1, 1635)
- Inside Natalini's Waagplein courtyard, front facing east.
- Two storeys of red brick with stone bands, cross windows with shutters,
  shell motifs over the windows. Restored in 1962-64 in red, ochre, gold
  and blue.
- **Three ornamental topgevels** (volute gable tops) on the long front; the
  third came from Huis Panser in 1964. The ridge runs along the front.
- Model: the old one had two stepped end gables; now the ridge runs along
  the front, with three volute topgevels (lower block, neck, volute
  shoulders, round top with a gilded finial, the arms disc), small roofs
  behind them, gilded shells over the windows, red and green shutters.
- Sources: https://nl.wikipedia.org/wiki/Goudkantoor , https://www.monumenten.nl/monument/18467

### Waagstraatcomplex (Adolfo Natalini with Cor Kalfsbeek, 1991-96)
- The block between Guldenstraat, Grote Markt, Waagstraat and Tussen Beide
  Markten (an L round the Goudkantoor), the town-hall wing south of the
  Stadhuis, and a small block at the Herestraat.
- Three storeys on a tall shop plinth, flat roofs and gable fronts.
- Light red brick with pale stone bands (speklagen), heavy corner stones,
  segmental-arched windows with glazing bars, copper roofs.
- Split into separate pand units on purpose.
- Model: the `NATALINI` zone. Its plots are `natalini` (flat top) and
  `nataliniGable`, with stone bands per floor, stone corner strips, a
  stone-clad plinth, arched lintels and copper-green roofs. A raised corner
  volume with a copper pyramid sits on the Grote Markt wing. **No source
  confirms this tower** (checked 2026-10-03: staatingroningen.nl,
  architectuur.org, nl.wikipedia Waagstraat, daad.nl, rtvnoord.nl). They all
  describe three storeys on a tall ground floor under flat or saddle roofs,
  with gables on the south and west sides, and none mentions a tower,
  belvedere or raised corner. It stays in the game for now as a modest
  volume, and the user decides whether to keep it.
- Sources: https://staatingroningen.nl/collectie/waagstraatcomplex ,
  https://www.architectuur.org/bouwwerk/369/Waagstraatcomplex.html ,
  https://nl.wikipedia.org/wiki/Waagstraat_(Groningen)

### North side (postwar)
- Burnt out in April 1945 and rebuilt in a modernist style in the 1950s.
  Three to five storeys, flat roofs, red-brown or yellow-grey brick,
  regular window grids and shopfronts.
- Model: the `POSTWAR` zone (north wall, including the west strip along the
  Groot Handelshuis). Mostly `postwar` plots (11 m wide, wide windows
  without glazing bars, concrete floor bands, flat roof with coping),
  some `postwarGable` and a few plastered ones.
- Sources: https://nl.wikipedia.org/wiki/Grote_Markt_(Groningen) ,
  https://www.groningentoen.nl/tweede-wereldoorlog-groningen/wederopbouw-centrum-groningen-1945-1962/

### Het Groot Handelshuis (former V&D, 1958; De Zwarte Hond 2021)
- North-west side. The closed facade of grey mosaic tile with built-in
  artworks was kept, and some panels were opened up as windows. An atrium
  with a glass roof was cut into the block, with a Jumbo in the plinth.
- Four to five floors of about 4 m (est.).
- Model: an eave of at least 15 m (`Math.max(15, b.h * LEVEL)` in
  `grootHandelshuis`, floors derived from that height; there is no
  `mapextras` height patch). Grey mosaic panels in
  three tones, every third panel a window, a glazed ground floor with
  mullions, two coloured artwork panels on the longest front, and the
  atrium's glass roof.
- Sources: https://www.gebiedsontwikkeling.nu/artikelen/in-groningen-blaast-een-oud-warenhuis-nieuw-leven-in-de-binnenstad/ ,
  https://archello.com/project/groot-handelshuis

### East side (the new oostwand, 2014-2020)
- **Mutua Fides / Vindicat** (De Zwarte Hond, built 2012-14, opened 21 June
  2014), on the corner with the Martinikerkhof. It replaced Vegter's
  building of 1954 and was the first building of the new oostwand.
  - Ochre-yellow brick, its colour "exactly between the Martinitoren and
    the Grand Theatre". The renders showed it darker, the brick as built
    is much lighter.
  - As tall as the envelope allows. The facade shows and hides the city
    through a few large windows, with a balcony on the Grote Markt. The
    ground floor has only three doors (members, staff, goods).
  - The rear steps down to its neighbours, and a penthouse stands on a roof
    terrace on the sixth floor. Old gevelstenen were reused.
  - Model (`Mutua Fides`, h 5):
    - an ochre brick block;
    - large deep-set windows with bronze frames in an uneven rhythm;
    - a steel balcony on the first floor at the square;
    - a stone base course, doors with a reused gevelsteen and a soldier
      course;
    - a set-back penthouse with a glass band behind a railing.
  - The window pattern is estimated.
- **Westcord Market Hotel** (about 2020, Müller Reimann): six storeys,
  stepped gables in pale natural stone. Model: 6 storeys, `trap` plots of
  7.5 m in pale stone.
- **Merckt** (Powerhouse Company, competition 2016, built 2019), south-east
  corner. "A classic facade with a plinth, midsection and crown":
  - a public plinth with rows of slender, parametrically designed concrete
    arches (the food market);
  - a midsection of pale brick made of Groningen clay, in the colour of the
    building that stood there before, with vertical gold lines;
  - 18 homes.
  - Model (`Merckt`):
    - a two-storey plinth of tall concrete arches;
    - a pale brick midsection with window bays and gold fins between them;
    - a crown storey of smaller arches and a thin cornice.
  - The crown is estimated.
- Sources: https://www.gic.nl/nieuws/hoogste-punt-market-hotel-en-merckt-aan-oostwand-grote-markt-groningen ,
  https://architectenweb.nl/nieuws/artikel.aspx?ID=40042 ,
  https://architectenweb.nl/nieuws/artikel.aspx?id=34946 ,
  https://dezwartehond.nl/leden-vindicat-hebben-een-nieuwe-kroeg/ ,
  https://www.gic.nl/nieuws/nieuwbouw-vindicat-grote-markt-baksteen-aanzienlijk-lichter ,
  https://commons.wikimedia.org/wiki/File:20140401_Soci%C3%ABteit_Vindicat_(Mutua_Fides)_Grote_Markt_Groningen_NL.jpg ,
  https://www.powerhouse-company.com/merckt , https://www.architectuur.nl/nieuws/powerhouse-company/

### De Drie Gezusters (Grote Markt 36-39, south side)
- Nr 36 (Hotel De Doelen): klokgevel of 1730 over a double plot. Model:
  one cream `klok` plot with green frames.
- Nr 37-38 "Groote Griet": straight cornice. Model: two `lijst` plots.
- Nr 39, on the corner with the Gelkingestraat (the "real" Drie Gezusters):
  an 18th-century classical front with a cornice and pediment, and a
  hipped roof. Model: a `lijst` plot with a pediment and a hipped roof
  (`hip` in the override: the ridge stops short of both ends and tiled hips
  slope down to them).
- The Grand Theatre (1929) to the west gets a plastered `lijstFlat` front.
- Sources: https://rijksmonumenten.nl/monument/18472/ , https://rijksmonumenten.nl/monument/18469/ ,
  https://nl.wikipedia.org/wiki/Drie_Gezusters_(Groningen)

### Martinitoren and kiosk
- Martinitoren: unchanged (GLB model).
- Kiosk: a one-storey glass box (it was a three-storey house) with a flat overhanging roof.

## Vismarkt

### Korenbeurs (Akerkhof 1, 1862-65, J.G. van Beusekom)
- Closes the west end of the Vismarkt, front facing east.
- A square front building with a central portico of four Corinthian columns
  under a pediment.
- Zinc statues by Enthoven: Mercurius on the pediment, Neptunus (trident)
  and Ceres (grain) in niches either side of the entrance.
- Red brick with light stone. Behind it, an exchange hall of about
  57 × 22 m with cast-iron trusses and a glass roof, ending in a half
  circle towards the A-kerk. An Albert Heijn since 2000.
- Model: the hall follows the OSM footprint (half-round end included), with
  a glass roof and lead ridge, round-arched windows and stone bands.
- The front block is 14 m deep, with a 12.5 m eave and a slate roof rim.
- The portico has a stepped platform, four columns on bases, an
  entablature, a pediment with a lead roof and three doors.
- Statues are low-poly zinc figures: Mercurius with wings on the apex,
  Neptunus with a trident, Ceres with a gilded sheaf.
- Sources: https://nl.wikipedia.org/wiki/Korenbeurs_(Groningen) ,
  https://rijksmonumenten.nl/monument/18415/korenbeurs/groningen/ ,
  https://standbeelden.vanderkrogt.net/object.php?record=GR07aa

### The gevelwanden
- 17 protected monuments stand on the square. Most buildings have three
  storeys under a pitched or hipped roof, or a flat roof.
- North side ("Glènne Riepe"): mostly late-19th and 20th-century shop
  buildings.
- South side (more historic): straight-cornice fronts, a stepped gable at
  nr 34 (1911, Van Gend & Loos, neo-Gothic), and eclectic plastered fronts
  with fake joints and window hoods (nr 26).
- **Nr 34, Van Gend & Loos** (1911-12, P.M.A. Huurman), rijksmonument 486664:
  - an expedition office with a dwelling, neo-Gothic, in the closed south
    wall;
  - three storeys and four window bays on a rectangular plan, in
    red-brown brick with natural stone bands;
  - the east (entrance) bay stands about a metre proud, with a carved
    wooden panel door in a stone frame and an oval window above it;
  - both the entrance bay and the main front end in a stepped gable, with
    a shield-bearing lion on the first one, and the gable top rests on an
    arched frieze on stone consoles;
  - a shopfront with leaded upper lights, lion heads beside it and a
    wooden canopy on carved consoles;
  - cross windows on the first floor, round-arched ones on the second;
  - a saddle roof with black pantiles.
  - Model (`Van Gend & Loos`):
    - the footprint's jog is the projecting bay;
    - a stepped gable on the main front and a lower one with the lion on
      the bay;
    - a corbel frieze, stone bands, the shopfront with canopy and
      consoles, cross windows and round-arched windows;
    - a black saddle roof with its ridge at right angles to the square.
  - Sources: https://monumentenregister.cultureelerfgoed.nl/monumenten/486664 ,
    https://www.beeldbankgroningen.nl/beelden/detail/60c60b23-c10a-cc92-a4d6-4579af11f6ea
- Model: the `historic` mix of plot kinds:
  - `lijst` 30: cornice, a pitched roof along the street and a dormer.
  - `lijstFlat` 18: a plastered 19th-century front with a cornice on
    consoles and an attic parapet.
  - `trap` 15: stepped gable with stone copings.
  - `klok` 13: bell gable with a round top.
  - `tuit` 7: pointed gable.
  - `shop1900` 10: brick with stone lintels.
  - `postwar` 7.
- Sources: https://nl.wikipedia.org/wiki/Vismarkt_(Groningen) , https://www.monumenten.nl/monument/18717 ,
  https://www.monumenten.nl/monument/486656 , https://www.monumenten.nl/monument/486664

### Der Aa-kerk
- 76 m tower: a brick base with an octagonal Baroque wooden top. Unchanged
  (landmarks3d.js `aKerkTower`).

### Calmershuis (Oude Boteringestraat 24, c. 1250)
- Not on the Vismarkt: it stands on the corner of the Broerstraat.
- A medieval stone house, **painted black**: souterrain, main floor, a low
  upper floor and a steep gable roof (timbers of 1543).
- Model: black walls, a stone plinth, white-framed windows in three tiers,
  and a 58° gable roof over the footprint with attic windows in the gable.
- Sources: https://nl.wikipedia.org/wiki/Calmershuis , https://monumentenregister.cultureelerfgoed.nl/monumenten/18632

## General rules used for the plots
- Plot width 6.6 m ± 25% (postwar 11 m), split from the street frontage.
- Gabled plots are never wider than 9.5 m.
- Eaves are 0.4-1.9 m above the body (b.h × 3.1 m), postwar 0.3 m.
- The shop ground floor is 4.0 m (4.6 m in the Natalini plinth).
- Upper floors are 3.0-3.3 m with 1.85 m window bays (postwar 2.4 m).
- Brick in red-brown to plum, plaster in cream, white and light grey, and
  about one plastered front in eight painted dark green, grey or blue-grey.
- Frames are white, sometimes dark green.
- A party wall that rises above a lower neighbour (the neighbour's roof
  height is recorded on the edge as `partyTop`) gets rows of sash windows
  above that roof, so no blank wall faces the squares.
- Roofs are red or blue-black pantiles, or slate.
- Nearly every ground floor on the squares is a shop or café: a glazed
  shopfront with a sign band, and an awning on almost half of them.
