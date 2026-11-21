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
## #1102 Tak Bedrijven (pure logica)

Gebouwd (geen UI, geen Electron):
- `game/js/business.js`: pand-model (`classifyBuilding`: winkelplek wint van pandsoort), prijs (woning woonoppervlak x 300 x gemeentefactor, winkel
  m2 x 900 x typefactor, industrie m2 x 700, schaalprijs via `bezitprijs.js`), omzet per speldag (`stepDay`: klantendruk x prijsstand x voorraad x
  personeel x verzadiging x openingsuren x onderhoud, plus vaste dagruis), belasting 0,1% progressief (dubbel bij 100 panden), onderhoud (zakt, renovatie
  herstelt), verhuur van woningen 0,25% met kans op "huurder verhuist" (nooit uitzetting), vier beheerknoppen (`setKnob`), dagrapport met reden,
  `settleDays` voor achterstand, en het mobiele bedrijf de frietwagen (eigen id, omzet naar plek; Tessa en Tammo, 24 en net afgestudeerd).
- `game/js/businessexclusion.js`: `BEZIT_UITSLUITING` met Nederlandse redenen, `excluded`/`isBuyable`, missiedoelen die vrijkomen na de akte (`missionSpotsFrom`).
- `game/js/businessstaff.js`: de kassier die er stond blijft (`existingClerk`), aanstellen en ontslaan, loon, `staffFactor`, en `visibleCustomers`/`customerPlan` (hoogstens 6).
- `game/js/bezithash.js`: deterministische hash (geen `Math.random`). `game/js/bezit.js` bewaart nu ook `bstate.bp` (basisprijs), `bstate.cfg` (knoppen en personeel),
  `mobile` (mobiele bedrijven) en onderhoud met een decimaal.
Tests: `scripts/business_test.mjs` (39 controles, met exploit-tests: kopen-verkopen-lus, schaalcurve, monopolie, herinvesteren binnen factor 3 van het actieve werk)
en `scripts/businessexclusion_test.mjs` (11 controles).

Open gaten:
- Missiedoelen die via een naam gaan (`landmark`, `shop`) en doelen die pas in de wereld een plek krijgen staan niet in de steekproef: de test leest de vaste punten
  (`at: [x, y]`, `walk(x, y)`, `drive(x, y)`) uit de bronbestanden van de akten (de echte defs importeren `three`). De bouwer geeft in het spel de echte defs aan
  `missionSpotsFrom(defs, actOf)` en lost de namen op met de wereld (ctx.missionSpots).
- De klantenpot per woonplaats (`town.houses`) en de gemeentefactor moeten uit de pandindex per plaats geteld worden (bouwer).
- De koppeling met de economiesim (`scripts/lib/economiesim.mjs`, profiel 10, 100, 1.000 panden) is niet gedaan; de test hierboven dekt de factor 3 met een eigen herinvesteringslus.
In beeld te controleren: niets zichtbaar; de beheerknoppen, het dagrapport en de wandelaars bij winkels komen met de UI van de bouwer.

## #1103 Productieketen, dynamische prijzen en events (pure logica)

Gebouwd (geen afspeelcode, geen UI):
- `game/js/supplychain.js`: de ketens kaas, friet, brood, eieren, hooi en bieten als schakels met buffer en doorvoer per speldag (stokken als de volgende schakel vol zit),
  logistiek met AI-chauffeur (reistijd afstand / 15 m/s plus laden, wagens, loon, diesel), extra marge 15% / 15% / 35%, `weakestLink` en `chainView` voor het beheerscherm.
- `game/js/areamarket.js`: streekprijs per dag (basis x (1 + 0,2 x (vraag - aanbod) / referentie), 0,7 tot 1,4), vraag uit hash, aanbod van spelers (`deliver`,
  `recordRemoteDelivery`), verzadiging 3% per 1.000 kg met 25% herstel per dag, de dag uit de gedeelde kalender (`marketDay`), `marketBoard` voor het tabblad Markt.
- `game/js/bezitevents.js`: droogte (zand meer), hagel (optionele verzekering), mierenplaag, wespen, machine kapot (boven 70% slijtage), ziek vee, Inspectiedienst Noordrand,
  koeling, staking, veiling, veilingdag, landbouwbeurs, buren met keuze, kermis en dorpsfeest en de trekkertrek als gegevensdefinitie. Altijd zomer; geen aardbeving,
  gaswinning, overval of geweld.
Tests: `scripts/supplychain_test.mjs` (19), `scripts/areamarket_test.mjs` (18), `scripts/bezitevents_test.mjs` (20), met exploit-tests (opdelen, dumpen, spreiden, vraagplafond, wagens kosten geld).

Open gaten:
- Geen afspeelcode en geen meldingen: de bouwer roept `eventsOn` aan per speldag en past `parcelLoss`, `businessMods` en `marketEventMult` toe.
- De trekkertrek is alleen een gegevensdefinitie; de minigame zelf is er niet.
- Het perceel-ID's en de machines (slijtage) komen uit de percelen-tak; hun koppeling aan `parcelLoss` en `machineBreakdown` moet de bouwer leggen.
In beeld te controleren: niets zichtbaar (pure regels); de teksten van de meldingen en de keuzescenes bij de buren zijn nog door niemand gelezen in het spel.

