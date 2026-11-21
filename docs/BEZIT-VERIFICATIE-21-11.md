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
- `game/js/bezitevents.js`: droogte (zand meer), stortbui (optionele verzekering), mierenplaag, wespen, machine kapot (boven 70% slijtage), ziek vee, Inspectiedienst Noordrand,
  koeling, staking, veiling, veilingdag, landbouwbeurs, buren met keuze, kermis en dorpsfeest en de trekkertrek als gegevensdefinitie. Altijd zomer; geen aardbeving,
  gaswinning, overval of geweld.
Tests: `scripts/supplychain_test.mjs` (19), `scripts/areamarket_test.mjs` (18), `scripts/bezitevents_test.mjs` (20), met exploit-tests (opdelen, dumpen, spreiden, vraagplafond, wagens kosten geld).

Open gaten:
- Geen afspeelcode en geen meldingen: de bouwer roept `eventsOn` aan per speldag en past `parcelLoss`, `businessMods` en `marketEventMult` toe.
- De trekkertrek is alleen een gegevensdefinitie; de minigame zelf is er niet.
- Het perceel-ID's en de machines (slijtage) komen uit de percelen-tak; hun koppeling aan `parcelLoss` en `machineBreakdown` moet de bouwer leggen.
In beeld te controleren: niets zichtbaar (pure regels); de teksten van de meldingen en de keuzescenes bij de buren zijn nog door niemand gelezen in het spel.


## #1098 Kaartlaag Te koop, perceelkaart en kopen

Gebouwd: `game/js/forsalemap.js` (laag: standen, prijsstappen, telling per cel bij uitzoomen, maximaal 250 vlakken, klikken), `forsaledraw.js`
(canvas), `forsalecard.js` (perceelkaart met Koop en bevestiging, Verkoop), `bezitlive.js` (aanbod, kopen en verkopen uit `world.money` met noteMoney
en het kasboek, lui laden van de index, terugdraaien na een nieuwe wereldbouw), haken in `mapview.js` en `boerderijlive.js` (register voor het
laden) en `main.js` (`initBezit` voor `initBoerderij`). Tests `forsalemap_test` (9), `forsalecard_test` (9), `bezitlive_test` (11).
Lokaal lezen van de index staat als uitzondering in `scripts/release/rules_audit.mjs` (`NETWERK_LOKAAL`: geen webadres).

In beeld te controleren:
- Kaart openen, laag Te koop aan (staat standaard aan, alleen als de tak Land open is): bij inzoomen blauwe streepvlakken met een prijskaartje, uitgezoomd
  ronde tellingen; geen geel. Het vlak is een schets rond het binnenpunt (de tegelvorm zit niet in de index).
- Klik op een vlak: perceelkaart met soort, grootte, bodem, ligging, verkoper, verwachting, prijs en Koop; Koop vraagt eerst een bevestiging;
  daarna staat het perceel groen op de kaart, het geld is eraf en het veld staat in Bezit/Boerderij. Doel zetten en Reis werken via de bestaande actiebalk.
- De legenda-rij Te koop (de rij Percelen met geel voor de twaalf vaste percelen blijft nog staan).
- Een speler zonder index (bouw zonder bezit-bestanden): de laag blijft leeg en het spel gaat door.

## #1099 Menu Land en bedrijf, tak Percelen en Bedrijven in het menu

Gebouwd: `game/js/bezitui.js` (Overzicht met aandachtspunten, percelenlijst, sorteren, filteren, selectie en bulkacties, personeel; Bedrijven met je panden
en de panden binnen 250 m; Te koop met de dichtstbijzijnde percelen; alles met een tweede druk bij kopen en verkopen), `pausemenu.js` (de rail-item
Boerderij heet nu Land en bedrijf, met de onderdelen Overzicht, Boerderij, Bedrijven en Te koop; de id `boerderij` blijft, `bezit` wijst ernaar door; zonder
voorkeur opent hij op Boerderij: voor wie al boert verandert er niets), `bezitlive.js` (panden kopen en verkopen, renovatie, personeel, de dagtik per speldag
vanuit `main.js`), `bezitgate.js` (tak dicht = uitleg). Stijl in `farm.css` (`bz-`). Tests `bezitui_test` (12); `spelmenu_test` (310) en `menu_issues_062_test` blijven groen.
De poort per akte is een stub (open); de verhaal-epic koppelt de echte poort via `setUnlockGate` (akte 2 Percelen, akte 3 Bedrijven).

In beeld te controleren:
- Esc, rail Bezit > Land en bedrijf: vier tabs; de tab Boerderij is de oude boerderij (Q en E wisselen over alle vier).
- Overzicht: tegels, aandachtspunten, lijst met sorteren/filteren, kiezen en bulkknoppen, personeel aanstellen; Te koop: Doel zet een waypoint, Koop vraagt Ja of Nee.
- Bedrijven: een winkelpand dichtbij kopen (kerken en monumenten staan er met de reden bij), renoveren, verkopen; omzet verschijnt per speldag in je geld (dagtik).
- Het uitzicht van de nieuwe tegels en knoppen op 1080p en bij de kleinste venstergrootte (nog niet bekeken).
Bekende gaten: de beheerknoppen (prijs, voorraad, uren) en klanten in de winkel zelf staan nog niet in de wereld; het aantal woningen per plaats is een schatting (1.500).

## #1100 Wereldmarkering, minikaart en streamen

Gebouwd: `game/js/bezitmarker.js` (planning: straal 600 m, hoogstens 200 palen, dichtstbijzijnde eerst, verschillen tussen twee plannen, opnieuw plannen
pas bij 25 m verplaatsing of nieuw bezit), `bezitmarker3d.js` (paal met bord in zeefdrukstijl op het binnenpunt van je percelen, "Van jou" op je panden, een medespeler
met zijn kleur en naam; gedeelde geometrie en materialen, borden-cache van 120, elke 0,5 s getikt vanuit `main.js`, nooit voor een gast), `perceelmap.js` (je gekochte percelen
als pin met stand op de kaart en de minikaart, hoogstens 300, twee keer per seconde herberekend). `parcelfarm.js` geeft een gekocht perceel nu een ligging (lat, lon, x, y):
zonder dat kon de boerderij het veld in de wereld niet zoeken. Test `bezitmarker_test` (9; de THREE-kant als broncontrole).

In beeld te controleren:
- Na een koop: bij het perceel staat een paal met bord (naam, Van jou); op de kaart en de minikaart een groene pin met stand; het veld wordt gezocht zodra je dichtbij bent (bestaande boerderijcode).
- Bij 200 palen geen merkbare fps-daling (perf-run met 1.000 percelen is nog niet gedaan); borden zijn goed leesbaar op 20 m en niet te groot.
- Geen getekende grenslijn: de index bevat geen vorm en de kaartranden van PERCEELRANDEN-21-11 zijn nog niet aangesloten (bekend gat); alleen de paal staat in het perceel.
- Een bord boven op een pand staat op de gevel-hoogte van het pand (gok: 3,4 m); controleer bij hoge panden.

## #1104 Samen spelen

Gebouwd: `game/js/bezitcoop.js` (claims met conflictregel laagste (tijd, speler-id), loslaten, wegvallen, aansluiten met een ID-verzameling van 6 byte per perceel,
`workShare` voor meewerken), `bezitlive.js` (`attachCoop`, `releaseLostClaim` met volledige terugbetaling, claimLookup voor kaart en koopknop), de palen tonen claims van anderen
in hun kleur. Test `bezitcoop_test` (10).

Nog te doen en in beeld te controleren: het transport (een MISC-soort in `net/codec.js` en de aanroep van `attachCoop` bij sessiestart), een testbankstap met drie instanties,
het meewerken zelf (gast bestuurt een trekker op andermans veld en krijgt loon) en wat een gast ziet bij een host-wissel (#439).

## #1105 Balans, exploits en prestaties

Gebouwd: `scripts/bezit_sim.mjs` (economiesim over 30 speldagen en verder met de echte prijs-, beheer- en pachtfuncties; zonder index op een vaste prijslijst) en `bezit_sim_test` (9):
eerste perceel na 2,4 uur (MIN_PRICE nu 2.400), schaalcurve van 10, 100, 1.000 en 20.000 percelen blijft onder 3 keer het actieve tempo (3.300 per uur), geen lus bij kopen en
direct verkopen (verlies 25%), pacht 0,9% tegen huur 1,2%, schaalprijs max x3, afnemende beheeropbrengst. Nieuw: een zachte rem op passief inkomen (`compressPassive`, plafond 3 x 440 per speldag)
in de dagtik. Eerste meting: zonder die rem gaf 1.000 percelen ongeveer 30.000 per uur (27 keer het actieve werk).
Nog te doen: prestaties (eerste perceel, tien percelen, eerste winkel, eerste keten, tien streken) in `achievements.js`, een perf-run met 1.000 percelen en 5.000 panden in Electron, en een spelbot-run die het tempo van twee uur bevestigt.
