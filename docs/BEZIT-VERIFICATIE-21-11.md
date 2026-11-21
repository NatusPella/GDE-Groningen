# Bezit: wat in beeld te controleren is (21-11)

Werkdocument van de bouwer van de epic Bezit (#1095). In deze fase draait er geen Electron (een releasegate loopt): alles hieronder is
gebouwd en met pure tests of de node-testbank gedekt, maar **nog niet bekeken**. Per pakket staat wat een mens of de coördinator in het
echte spel moet nakijken. Ontwerp: [BEZIT-21-11.md](BEZIT-21-11.md).

## #1096 Data en stabiele ID's

Gebouwd: `scripts/world/bezit_index.mjs` (bouwt `bezit-percelen.json` en `bezit-panden.json` bij het bouwen van de wereld, aangeroepen in
`writeProvince`), `game/js/parcelindex.js` (lui laden en opzoeken), test `scripts/bezit_index_test.mjs`.
Gemeten op de wereld van 20-11 (3 s): 13.664 percelen (13.883 stukken-groepen, 219 samengevoegd onder 0,5 ha), 11.564 bedrijfspanden;
304 KB + 128 KB gzip, 689 KB + 417 KB uitgepakt.

In beeld te controleren:
- Na een volledige wereldbouw staan `bezit-percelen.json` en `bezit-panden.json` naast `index-provincie.json` (`global.bezitFile`).
- De bouwtijd en de grootte van `game/world` zijn nauwelijks veranderd (+1,1 MB uitgepakt).

## #1097 Opslag, prijsmodel en namen

Gebouwd: `game/js/bezit.js` (opslag `gde-bezit-v1`, compacte ID-set met delta-varint, kopen en verkopen, migratie van de verzonnen percelen als
legacy, herkoppelen met terugbetaling), `game/js/bezitprijs.js` (prijs, bodem, schaalprijs, pacht, namen en verkoper), `game/js/bezitgate.js`
(poort per akte: akte 2 Percelen, akte 3 Bedrijven; stub met de vorm van de gedeelde poort van de verhaal-epic). Test `scripts/bezit_test.mjs`
(23 controles, met de echte index: mediaan en aandeel goedkope percelen, naamuniciteit).

In beeld te controleren: nog niets zichtbaar; de opslag wordt pas gebruikt door #1098 en #1099.
