# Bezit: audit en gaten (22-11)

Audit van de epic Bezit (#1095) en de pakketten #1096 tot en met #1105: per onderdeel wat gedaan is (met bewijs in code en test), wat ontbrak en nu is gebouwd,
en wat nog open staat. Alles is met pure tests en mocks gedekt; er is geen Electron en geen build gedraaid (de perf-meting is exclusief), dus **niets hiervan is in beeld bekeken**.
Ontwerp: [BEZIT-21-11.md](BEZIT-21-11.md). Controlelijst per pakket: [BEZIT-VERIFICATIE-21-11.md](BEZIT-VERIFICATIE-21-11.md).

## Matrix

| # | Onderdeel | Gedaan (bewijs) | Ontbrak, nu gebouwd | Nog open |
|---|-----------|-----------------|---------------------|----------|
| 1096 | Data en stabiele ID's | `scripts/world/bezit_index.mjs`, `parcelindex.js`; 13.664 percelen, 11.564 panden, vormen; `bezit_index_test` (22) | - | De bestanden staan pas in `game/world` na een volledige wereldbouw (hier niet gebouwd) |
| 1097 | Opslag `gde-bezit-v1`, prijs, namen | `bezit.js`, `bezitprijs.js`; `bezit_test` (23), `bezit_exploits_test`, `bezit_sim_test` | Velden `ins`, `ta`, `tw` op het perceel (verzekering en bestrijding), met opschoning | - |
| 1098 | Kaartlaag Te koop, perceelkaart, kopen | `forsalemap.js`, `forsaledraw.js`, `forsalecard.js`, `bezitlive.js`; tests `forsalemap`, `forsalecard`, `bezitlive` | **Buren** (percelen binnen 300 m, eigen en van medespelers) en de **beheerregel** (Zelf, Verpacht, Personeel, verzekerd) op de perceelkaart | Uiterlijk op de kaart (vormen, kaartje, hoge zoom) niet bekeken |
| 1099 | Menu Land en bedrijf, start, Mijn bezit | `bezitui.js`, `pausemenu.js`, poort per akte `bezitgate.js` (akte 2 Land, akte 3 Bedrijven); Overzicht is de lijst Mijn bezit met sorteren, filteren, bulkacties | **Bericht van Notariaat De Zegelhoek** zodra een tak opengaat (eenmaal per tak en speler, `bezit.x.told`); bulkknoppen verzekeren en bestrijden | Het ontwerp zei "na akte 1"; het besluit van de eigenaar (21-11) is akte 2 en 3, dat blijft zo. Uiterlijk op 1080p en klein niet bekeken |
| 1100 | Wereldmarkering, minikaart, streamen | `bezitmarker.js` (planning, 200 palen, 40 omtrekken), `bezitmarker3d.js`, `perceelmap.js`; `bezitmarker_test`, `bezit3d_mock_test` | Prestatiegrenzen in node: planning met 1.000 percelen en 5.000 panden in 1,5 ms (`bezit_perf_test`) | De lijn in de wereld, leesbaarheid van borden en de echte fps met 200 palen (Electron) niet gemeten |
| 1101 | Tak Percelen: gebruik, schaal, AI-personeel, vee, beheerscherm | `parcelfarm`, `farmstaff`, `livestock`, `holdingsmodel`, `farmworkers(3d)`, `herdview(3d)`, `tessarules`, `bezithooks`; Tessa-haken zijn gekoppeld in `bezitlive` | **Stortbuiverzekering** (3 euro per ha per speldag, dekt 80%, ingang een dag na afsluiten) en **bestrijden van mieren en wespen** (tien speldagen) per perceel en in bulk (`parcelcare.js`), premie in dagtik en dagrapport | Het veld verandert per dag, niet per cel (werker kleurt alleen); dieren staan stil; rijen van grote percelen zijn langer dan het veldmesh |
| 1102 | Tak Bedrijven | `business.js`, `businessexclusion.js`, `businessstaff.js`, `bezitbeheer.js`, `bezitinterior.js`, `sponsorpanden.js`, frietwagen en snackwagen (`snack*`, `pitch*`) | Eindbalans in `bezitzorg_test`: 300 percelen en 300 panden samen geven 1.304 per speldag tegen een plafond van 1.320 (3 maal actief werk) | Beheerknoppen en klanten in het pand zelf niet in beeld bekeken (label `hertest`); een gevelbord werkt alleen op panden met een pui |
| 1103 | Productieketen, prijzen, events | `supplychain`, `areamarket`, `bezitevents`, `bezitchain`, `bezitnews`, `chaintrucks(3d)`; melk en eieren gaan tegen de streekprijs (`holdingsmodel.livestockRevenue`) | Verzekering en bestrijding geven de verliesregels uit `bezitevents.js` voor het eerst een knop; de cache van `bezitnews.lossOfParcel` houdt nu mieren en wespen uit elkaar | De **trekkertrek** is alleen een aanbod (gegevensdefinitie), de minigame is er niet; een machine die stilvalt krijgt slijtage 100 zonder stilstandsdagen |
| 1104 | Samen spelen | `bezitcoop.js` (claims, conflict, wegvallen, aansluiten), `bezitnet.js` (20 controles, drie instanties), testbankstap `bezit`; per speler (#429) | Samen-regel voor de nieuwe onderdelen (zie onder) | Electron-run van de testbank, een gast die echt op andermans perceel met een trekker meewerkt, en een hostwissel (#439) in beeld |
| 1105 | Balans, exploits, prestaties | `bezit_sim.mjs` (eerste perceel na 2,4 uur), rem `compressPassive`, `bezit_exploits_test` (22), zes prestaties `bz_*` in `achievements.js` met Steam-bestand | `bezit_perf_test` (opslag 1.000 percelen en 5.000 panden: 0,9 en 2,1 ms, 93 KB; dagtik 30 dagen met 300 percelen: 11 ms); exploit-tests voor verzekering (niet afsluiten op de dag van de bui) en dubbel bestrijden | Perf-run in Electron met 1.000 percelen en 5.000 panden en een spelbot-run die de twee uur bevestigt |

BEZIT-VERIFICATIE-21-11.md noemt een paar dingen "nog te doen" die intussen wel gedaan zijn: de prestaties (zes definities en tests), het transport van de claims, de testbankstap,
de koppeling van de Tessa-haken bij kopen en aannemen en de streekprijs voor melk en eieren.

## Samen spelen per onderdeel

| Onderdeel | Van wie | Beloning en voortgang | Wegvallen of later aansluiten | Test |
|-----------|---------|-----------------------|-------------------------------|------|
| Verzekering en bestrijding | Eigen bezit van de speler (`gde-bezit-v1`); een gast regelt alleen zijn eigen percelen | Premie en kosten van het eigen geld, geen voordeel voor wie het spel opende | Niets te synchroniseren; draait op de eigen speldag | `parcelcare_test`, `bezitzorg_test` |
| Buren op de perceelkaart | Lokaal berekend uit de index en de claims die elke speler kent | Geen | Een claim die verdwijnt, telt niet meer mee | `bezitzorg_test` |
| Bericht van het Notariaat | Lokaal per speler en tak | Geen | Een speler die later aansluit krijgt zijn eigen bericht | `bezitzorg_test` |
| Percelen, panden, ketens, snackwagen | Per speler (#429), zie [COOP-GAST.md](COOP-GAST.md) | Zie daar | Claims overleven een hostwissel | `bezitnet_test`, `bezitcoop_test` |

## Exploit-audit en balans (conservatief)

- Kopen en direct verkopen kost altijd geld (perceel 25%, pand idem); de schaalprijs loopt tot maal 3; de beheeropbrengst neemt af met meer percelen (`bezit_exploits_test`, `bezit_sim_test`).
- Passief inkomen (percelen, panden, ketens, snackmedewerkers) gaat door een zachte rem met plafond 1.320 per speldag, gelijk aan drie maal actief werk. Gemeten met 300 plus 300: 1.304 (`bezitzorg_test`).
- Verzekering: premie 3 euro per ha per speldag; de verzekering gaat een dag na afsluiten in, dus afsluiten op de dag van de bui helpt niet. Opzeggen kan altijd.
- Bestrijding: vernieuwen kan pas op de laatste dag van de looptijd; zonder geld gebeurt er niets; wespenbestrijding helpt niet tegen mieren.
- Bewust zo gelaten: de dierenarts en boetes tellen als kosten zonder rem; het loon van een meewerkende gast is nieuw geld uit het meewerkschema (zie COOP-GAST.md), nooit geld van andermans bezit.

## Prestaties (node, geen Electron)

`scripts/bezit_perf_test.mjs` meet op een synthetische provincie (14.000 percelen, 6.000 panden): zoeken in een rastercel onder 5 ms, markerplanning met 1.000 percelen en 5.000 panden 1,5 ms,
opslag 93 KB en onder 3 ms, dagtik over 30 speldagen met 300 percelen 11 ms. De grenzen in de test zijn ruim (40, 150 en 2.000 ms). Draw calls, geheugen en fps in de wereld zijn **niet gemeten**.

## Wat een mens in beeld moet nakijken

Alles uit BEZIT-VERIFICATIE-21-11.md blijft staan. Nieuw sinds deze ronde: de vier knoppen in Overzicht (Verzeker tegen stortbui, Zeg verzekering op, Bestrijd mieren, Haal wespennest weg) met hun
titelregels en uitgeschakelde stand; de regels Buren en Beheer op de perceelkaart; het bericht van het Notariaat als melding bij het openen van Land en Bedrijven.
