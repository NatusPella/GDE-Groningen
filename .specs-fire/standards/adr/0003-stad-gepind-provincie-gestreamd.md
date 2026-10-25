# 0003 - De stad staat gepind, de provincie streamt

- **Status:** besloten
- **Datum:** 2026-10-24 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/wereld.md`

## Context

Streamen werkt per tegel, maar tientallen modules lezen de stad als één array:
`map.roads`, `map.buildings`, de verkeerslichten, de POI's, de routeplanner. Zodra
een stadstegel uit de scenegraaf valt, wijst zo'n array naar iets dat niet meer
bestaat.

## Besluit

`tileworld.js` houdt de stadstegels resident: de 54 verklaarde tegels uit
`index.pins.city`, plus elke tegel die een handrij raakt (samen 58). De provincie
streamt in ringen: L0 350 m, L1 1,2 km, L2 4 km, L3 4-40 km.

## Afgewezen

- **Ook de stad streamen (#314 C1).** Dat is ~37 modules ombouwen naar "lees per
  tegel"; twee pogingen liepen vast op dezelfde modules. De winst is geheugen dat
  we op een gewone machine niet tekortkomen.
- **Alles pinnen.** De provincie is 40 km; dat is geen 60 fps meer.
- **Een tweede leeslaag naast de bestaande arrays.** Dan heb je twee APIs voor
  dezelfde data en weet niemand welke de waarheid is.

## Gevolgen

Nieuwe code leest per tegel, of via `poiLayerPlaces`/`poiLayerPlace` met `map.meta`
als terugval. De gepinde set mag alleen groeien met een reden en een test
(`tileworld_pinned_test`). De overlay is geen tegel maar een rijklasse
(gid ≥ 20.000.000) achter de stadstegel.
