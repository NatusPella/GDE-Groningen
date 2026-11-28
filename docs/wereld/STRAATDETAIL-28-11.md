# Straatdetail: de detaillaag voor wijken en dorpen (28-11, #1353)

Doel: kale straten rijker maken met details en props, niet met meer mensen. Referenties: `STRAATDETAIL-REFERENTIES-28-11.md`.

## Hoe het werkt

- `game/js/streetdetail.js` (puur): `detailForTile` krijgt de wegen, gebouwen, bomen, het water en het spoor van een tegel en geeft
  items terug. Het zaad komt uit de plek van het gebouw of de weg (mulberry32), de invoer wordt gesorteerd: zelfde tegel, zelfde
  items, bij elke speler (Samen spelen: de wereld is van iedereen gelijk, niets per speler of host).
- `game/js/streetdetailprops3d.js`: de bouwers van de nieuwe props (registratie in `propregister.js`, norm en eisen per prop).
- `game/js/streetfurniture3d.js`: `tileItems` voegt de items bij die van `furnitureForTile`; elke soort is één `InstancedMesh` met de
  LOD-soort `prop` (lodkit3d); kleine props werpen geen schaduw; een mesh zonder instances wordt niet getekend. Heggen en hekken
  gebruiken de bestaande soorten (en botsing); de rest heeft geen botsing. `window.__noStreetDetail = true` zet de laag uit
  (vergelijkbeelden en metingen).
- Test: `node scripts/streetdetail_test.mjs` (plaatsing, determinisme, buurttypen, budget).

## Regels per buurttype

Zie de kop van `streetdetail.js`. Een woonhuis (25-450 m2, tot 3 lagen) met een straat ervoor krijgt een voortuin als er na de stoep
(1,7 m) nog 1,5 m ruimte is, anders hoogstens een kliko of fiets tegen de gevel.

## Samen spelen

Van de wereld (niet van wie het spel opende): de laag is een pure functie van de tegeldata, dus elke speler ziet dezelfde items. Er is
geen voortgang, beloning of netwerkbericht. Een gast die later aansluit rekent dezelfde tegel opnieuw uit.
