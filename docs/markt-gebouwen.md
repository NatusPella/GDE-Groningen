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
  confirmed this tower**, so it stays a modest volume.
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
- Model: the height raised to 6 storeys (mapextras). Grey mosaic panels in
  three tones, every third panel a window, a glazed ground floor with
  mullions, two coloured artwork panels on the longest front, and the
  atrium's glass roof.
- Sources: https://www.gebiedsontwikkeling.nu/artikelen/in-groningen-blaast-een-oud-warenhuis-nieuw-leven-in-de-binnenstad/ ,
  https://archello.com/project/groot-handelshuis

### East side (the new oostwand, 2014-2020)
- **Mutua Fides / Vindicat** (2014, De Zwarte Hond), on the corner with the
  Martinikerkhof. Model (est.): dark brick with gabled plots.
- **Westcord Market Hotel** (about 2020, Müller Reimann): six storeys,
  stepped gables in pale natural stone. Model: 6 storeys, `trap` plots of
  7.5 m in pale stone.
- **Merckt** (2019-20, Powerhouse Company), south-east corner: a light-brick
  facade with white piers and gold-coloured frames. Model: `lijstFlat`
  plots in light brick, white trim, gold frames.
- Sources: https://www.gic.nl/nieuws/hoogste-punt-market-hotel-en-merckt-aan-oostwand-grote-markt-groningen ,
  https://architectenweb.nl/nieuws/artikel.aspx?ID=40042

### De Drie Gezusters (Grote Markt 36-39, south side)
- Nr 36 (Hotel De Doelen): klokgevel of 1730 over a double plot. Model:
  one cream `klok` plot with green frames.
- Nr 37-38 "Groote Griet": straight cornice. Model: two `lijst` plots.
- Nr 39, on the corner with the Gelkingestraat (the "real" Drie Gezusters):
  an 18th-century classical front with a cornice and pediment, and a
  hipped roof. Model: a `lijst` plot with a pediment.
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
- Roofs are red or blue-black pantiles, or slate.
- Nearly every ground floor on the squares is a shop or café: a glazed
  shopfront with a sign band, and an awning on almost half of them.
