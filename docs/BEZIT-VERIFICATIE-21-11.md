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

## #1101 Tak Percelen: de pure logica

Gebouwd (alles puur en getest, geen UI en geen 3D): `game/js/parcelfarm.js` (de brug: een gekocht perceel uit de index werkt als veld via een register in
`percelen.js`; werkeenheid sqrt(ha/1,2) tot x3; werken op een willekeurig perceel), `game/js/farmstaff.js` (landarbeider, voorman, loon, dagtik van het personeel,
pacht, afnemende beheeropbrengst, werkactoropdrachten voor hoogstens 4 werkers), `game/js/livestock.js` (melkvee, schapen, kippen), `game/js/tessarules.js` (regels
voor Tessa, alleen tekst), `game/js/holdingsmodel.js` (lijst, sorteren, filteren, selectie, bulkacties, teeltplan per streek, aandachtspunten, dagverwerking) en
boomgaardfruit in `boerderij.js`. Tests: `parcelfarm_test` (11), `farmstaff_test` (17), `livestock_test` (10), `tessarules_test` (7), `holdingsmodel_test` (14).
Gemeten: duizend percelen, elke berekening van het beheerscherm onder 20 ms.

In beeld te controleren (nog niets gezien, de UI en de 3D horen bij de bouwer):
- Een gekocht perceel verschijnt als veld op de kaart en in het boerderijmenu met naam, soort en bodem; ploegen, zaaien en oogsten werken erop.
- De opbrengst per werkronde is bij grote percelen niet meer onevenredig hoog (de rijlengte schaalt mee; de rijen in de wereld moeten `rowLayout(ha)` volgen).
- Een landarbeider rijdt zichtbaar de rijen (hoogstens vier tegelijk, binnen 230 m) en het veld verandert per cel; buiten beeld verandert alleen het cijfer.
- Het vee in beeld is hoogstens twaalf dieren per perceel; ziekte, voer en opbrengst staan in het beheerscherm.
- Boomgaardfruit heeft nog geen 3D-vorm, afnemerplek of kleur in de wereld (`boerderijwereld.js`, `farmcrops3d.js`, `werktuigen3d.js`).
- Balans: een arbeider levert netto ongeveer 43 euro per ha per speldag bij 10 percelen in Oldambt (de pacht 21); te tunen in werkpakket 10.
