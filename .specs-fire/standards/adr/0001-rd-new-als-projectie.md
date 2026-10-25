# 0001 - RD New met verschoven oorsprong als enige projectie

- **Status:** besloten
- **Datum:** 2026-10-18 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/wereld.md`

## Context

De kaart komt uit OpenStreetMap, PDOK, 3D BAG en AHN, alle in RD New
(EPSG:28992). De wereld is ruim 40 km breed en alles wat de speler ziet staat op
een vaste plek: gebouwen, POI's, missies, modellen, verkeerslichten. Elke laag
moest dezelfde plek kunnen aanwijzen zonder drift.

## Besluit

RD New is de enige projectie. De verschuiving zit in `rdnew.js`:
`x = RD_x - 233670`, `y = -(RD_y - 582075)`, en in de wereld is `three.x = x`,
`three.z = y`, met Y omhoog. Tebellen en POI's staan tegel-lokaal in int32
centimeters; absolute wereldcoördinaten worden pas bij het tekenen berekend
(`toRender()`).

## Afgewezen

- **WGS84 (lat/lon) rechtstreeks.** Goniometrie per object per frame, en een
  vierkant raster wordt een trapezium.
- **Een eigen oorsprong per regio of per tegel.** Dan heb je twee stelsels naast
  elkaar en moet elke overdracht omrekenen; dat is precies de fout die #90
  opruimde.
- **Absolute RD-coördinaten in float32.** Op 40 km afstand is de resolutie te
  grof: een tegel gaat trillen en een deur past niet meer in zijn kozijn.

## Gevolgen

Elke nieuwe bron moet door `rdnew.js` of de helpers in `worldframe.js`; een eigen
projectie is een review-bevinding. Tegels en POI's worden tegel-lokaal gebakken.
Eén stelsel betekent ook één `surfaceAt` en één `waterAt`, en dus geen tweede
hoogte- of waterwaarheid.
