# Interieurs: stand en gaten (ronde 6, 22-11)

Epic #1150, pakketten 1 tot en met 9 (#1161 t/m #1165). Deze pagina is de matrix **gedaan / ontbreekt** per pakket en per soort, met wat ronde 6 erbij bouwde. Ontwerp en uitleg staan in [INTERIEURS-21-11.md](INTERIEURS-21-11.md), wat in beeld nog gecontroleerd moet worden in [INTERIEURS-VERIFICATIE-21-11.md](INTERIEURS-VERIFICATIE-21-11.md). Niets hieronder is in beeld of in het spel bekeken: alles is met pure code, mocks en de audit op de echte kaart gemeten (geen Electron).

## Per pakket

| Pakket (issue) | Gedaan | Ontbreekt |
| --- | --- | --- |
| 1 verticale slice (#1161) | deur uit de gevelbouwer, hal in de voetafdruk, portal-snede, deurvleugel, `b.walk`, camera binnen, lui bouwen bij 20 m en vrijgeven bij 32 m (max 2); stresstest en budgettest | niets in code; de snede, de camera en de deur zijn nog nooit in het echte spel gezien |
| 2 tot 6 soorten (#1162) | negen soorten, 34 varianten met een recept (nieuw in ronde 6: gebedshuis), tweede verdieping, mensen die dingen doen, drukte per uur, kopen aan de balie (nu ook apotheek, hotel, werkplaats, magazijn) | meer recepten per winkeltype (nu een recept met variatie uit het zaad), een achterdeur, een tweede trap, een lift, mensen die naar boven lopen, voorwerpen in de handen |
| 7 integraties (#1163) | Bezit-beheer bedraad (`bezitinterior.js`), kleding uit de rolpools, pashokje, haakjes, politiezicht, `interiorscene.js` met `onInteriorChange` | een missie of verhaalbeat die in een gewoon pand speelt (de scene-API bestaat en is getest, geen missie gebruikt hem), Homebase als eigen thuis (epic verhaal), een eigen outfit per rol via `assignRoleOutfit` (het haakje staat; niemand zet hem) |
| 8 geluid en kaartlaag (#1164) | kamertoon en muziekfilter per soort en variant (`sfx/binnenklank.js`, nu ook gebedshuis), kaartlaag Betreedbaar | kerken, scholen en woningen staan niet op de kaart (vraagt een lijst uit de tegels); alle geluid is nog nooit gehoord |
| 9 audit en dekkingsplan (#1165) | `scripts/interieur_dekking_audit.mjs`: typetabel, recepttabel, per bouwtype wie betreedbaar is en waarom niet, vier fasen; nieuw: `--matrix` en de matrixtest met prestatiebudget | de provincie meten met het echte spel (de audit gebruikt de echte gevelbouwer, niet het spel zelf) |

## De matrix per variant

Gegenereerd met `node scripts/interieur_dekking_audit.mjs --matrix` (recept: indelingen die slaagden op een gewone hal, van zes; items en mensen gemiddeld; "Eigen toon" is een eigen kamertoon naast die van de soort; "Eigen drukte" een eigen curve per uur). De test `scripts/interieur_matrix_test.mjs` houdt vast dat elk recept slaagt, elke rol een schema en een kledingpool heeft, elke balie eigen regels heeft, elke variant een eigen drukte heeft en dat er aan de balie iets te koop is waar dat bedoeld is.

| Variant | Recept | Items | Mensen | Rollen | Koop aan de balie | Eigen toon | Eigen drukte | Etage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| winkel/supermarkt | 6/6 | 50 | 5.2 | klant, winkelier | Boodschappentas | nee | ja | ja |
| winkel/bakker | 6/6 | 35 | 5 | bakker, klant, winkelier | Krentenbol | nee | ja | nee |
| winkel/slager | 6/6 | 35 | 4 | klant, winkelier | Rookworst | nee | ja | nee |
| winkel/snackbar | 6/6 | 28 | 4 | klant, winkelier | Eierbal | nee | ja | nee |
| winkel/kleding | 6/6 | 38 | 4 | klant, winkelier | Sjaal "Zomer" | nee | ja | ja |
| winkel/fietsen | 6/6 | 38 | 4 | klant, winkelier | Fietsbel | nee | ja | nee |
| winkel/bloemist | 6/6 | 28 | 4 | klant, winkelier | Boeket | nee | ja | nee |
| winkel/kapper | 6/6 | 40 | 18.3 | kapper, klant, knipklant, winkelier | Waspoeder voor het haar | nee | ja | nee |
| winkel/elektronica | 6/6 | 51 | 4 | klant, winkelier | Oplaadkabel | nee | ja | ja |
| winkel/tweedehands | 6/6 | 39 | 4 | klant, winkelier | Rommelkoopje | nee | ja | ja |
| winkel/souvenir | 6/6 | 40 | 3.5 | klant, winkelier | Magneetje van de Martinitoren | nee | ja | ja |
| winkel/kiosk | 6/6 | 33 | 4 | klant, winkelier | Krant en een zakje drop | nee | ja | nee |
| horeca/cafe | 6/6 | 102 | 4 | barman, gast | Koffie met koek | nee | ja | nee |
| horeca/kroeg | 6/6 | 113 | 4.2 | barman, gast | Pilsje | nee | ja | nee |
| horeca/restaurant | 6/6 | 102 | 4 | barman, gast | Dagschotel | nee | ja | nee |
| kantoor | 6/6 | 57 | 4 | medewerker, receptionist | - | ja | ja | ja |
| woning | 6/6 | 26 | 0.5 | bewoner | - | ja | ja | ja |
| woning/studentenkamer | 6/6 | 29 | 0.8 | student | - | nee | ja | ja |
| kerk | 6/6 | 33 | 3 | bezoeker, koster | - | ja | ja | nee |
| kerk/kapel | 6/6 | 36 | 2 | bezoeker, koster | - | ja | ja | nee |
| kerk/gebedshuis | 6/6 | 25 | 3 | bezoeker, koster | - | ja | ja | nee |
| station | 6/6 | 26 | 6 | loketmedewerker, reiziger | - | ja | ja | nee |
| bibliotheek | 6/6 | 57 | 3 | bibliothecaris, lezer | - | ja | ja | nee |
| garage/werkplaats | 6/6 | 33 | 1 | monteur | Fles ruitenvloeistof | nee | ja | nee |
| garage/magazijn | 6/6 | 40 | 1 | monteur | Rol pakbandtape | ja | ja | nee |
| publiek/gemeente | 6/6 | 36 | 5 | baliemedewerker, bezoeker | - | nee | ja | ja |
| publiek/politie | 6/6 | 37 | 6 | agent, baliemedewerker, bezoeker | - | nee | ja | nee |
| publiek/apotheek | 6/6 | 36 | 5 | apotheker, baliemedewerker, bezoeker | Pleisters | nee | ja | nee |
| publiek/ziekenhuis | 6/6 | 29 | 5 | arts, baliemedewerker, bezoeker | - | ja | ja | nee |
| publiek/school | 6/6 | 49 | 7 | baliemedewerker, leerling, leraar | - | ja | ja | ja |
| publiek/hotel | 6/6 | 38 | 6 | baliemedewerker, bezoeker, hotelgast | Ontbijt op de kamer | ja | ja | ja |
| publiek/sportschool | 6/6 | 44 | 7 | baliemedewerker, sporter, trainer | Dagkaart sportschool | ja | ja | nee |
| publiek/museum | 6/6 | 41 | 6 | baliemedewerker, museumbezoeker, suppoost | Museumkaartje | ja | ja | nee |
| publiek/bioscoop | 6/6 | 26 | 5 | baliemedewerker, filmbezoeker | Filmkaartje met popcorn | ja | ja | nee |

Wat de matrix nog laat zien als "nee": de winkelvarianten delen de kamertoon van de soort winkel (bewust: het ene winkeltje klinkt als het andere), kantoor en woning delen de toon van hun soort. Een tweede verdieping hebben alleen woning, kantoor, gemeente, school, hotel en de grotere winkels (supermarkt, kleding, elektronica, tweedehands, souvenir).

## Bereikbaarheid: wat ronde 6 veranderde (meting 22-11, 1 op 20 gemeten, alle panden met een plek volledig)

| | Voor | Na |
| --- | --- | --- |
| Panden in de provincie | 370.144 | 370.144 |
| Geschat betreedbaar | 148.111 (40,0%) | 157.825 (42,6%) |
| Woningen betreedbaar | 142.553 | 152.240 |
| Buiten de stad | 147.370 van 367.318 | 156.961 van 367.318 (42,7%) |
| Varianten met een recept | 28 van 28 | 29 van 29 |

Wat de audit liet zien en wat ervan gedaan is:

- **Huizen met een bekend type** (house, detached, semidetached_house) waren voor 31% te klein voor de oude minimale hal van 3,4 bij 4,5 m. De woning mag nu klein zijn (2,6 bij 3,2 m): 1240 willekeurige indelingen in de core-test en 100 kleine huizen in de dekkingstest slagen zonder uitdunnen. `findHall` groeit een hal die op het grove raster net te smal uitvalt eerst met stappen van 10 cm voor hij hem afwijst.
- **Panden zonder type (`yes`)**, 47% van alle panden, zijn meestal schuurtjes en bijgebouwen. Daar blijft de oude minimale hal (3,4 bij 4,5 m) gelden (`HOME_UNTYPED_MIN`). Een eerste proef met de kleine maat voor alles gaf 50,5% betreedbaar, maar dan werden tuinhuisjes woningen: dit is een bewuste keuze en geen gat.
- **Nieuwe typen:** boerderij, villa en chalet zijn woningen, hangaar en manege magazijnen, het rekencentrum een kantoor, religieuze gebouwen een gebedshuis. **Bewust dicht** (nu ook met naam in `NOT_ENTERABLE`): bijgebouwen (123 panden), opslagtanks (151), stallen, molens, bunkers, torens, tribunes, gemalen en paviljoens.
- **Garageboxen** (3.449 panden, 99% te klein) blijven dicht: een box is geen kamer.
- **Nog open:** 526 huizen zijn te laag (minder dan 2,3 m plafond: de gevelbouwer geeft ze een verdiepingshoogte onder 2,45 m), 555 panden met een winkel of voorziening zijn te klein (kiosken en hokjes), 29 boerderijen hebben geen voordeur in de gevel (de gevelbouwer tekent er geen en `SYNTH_KINDS` bevat woning niet).

## Prestatiebudget (in de tests)

`scripts/interieur_matrix_test.mjs` bouwt elke variant bij drie maten hal en houdt vast: driehoeken onder het harde budget van 12.000 (`MAX_TRIANGLES`), geheugen onder 1,5 MB, hooguit drie materiaalgroepen, hooguit 24 mensen in het plan (het spel laat er acht tegelijk zien, `MAX_ACTORS`), het plan maken en de geometrie bouwen elk onder 150 ms (in node, op een drukke machine; gemeten 10 tot 60 ms) en de kleinste maat onder 7.000 driehoeken.

**Een echte vondst:** de bibliotheek haalde bij een hal van 26 bij 18 m 12.042 driehoeken en brak het budget; het aantal losse kasten is nu begrensd op negen (zwaarste variant 9.942). De frametijd in het spel en de kosten na een uur lopen zijn nog steeds niet gemeten (geen Electron). De tijdsdrempels van `interior_stress_test.mjs` (3 ms per beeld voor de mensen, 40 ms per scan) zijn gevoelig voor een drukke machine: tijdens een perf-meting op dezelfde machine sloegen ze om (tussen twee runs schommelde de piek van 3,8 tot 65 ms).

## Samen spelen

Iedereen lokaal, zoals de rest van de epic. Welke panden betreedbaar zijn volgt uit het pandtype en de maat van de hal: op elke client gelijk. De nieuwe mensen zijn lokaal decor uit het pandzaad, wat je aan de balie koopt is van de speler zelf (#429). Zie [COOP-GAST.md](COOP-GAST.md) (Interieurs ronde 6).

## Nog niet in beeld bekeken

De nieuwe gebedshuis-indeling, de agent, de apotheker en de hotelgast, de nieuwe producten aan de balie en de kleinere woningen (is een hal van 2,6 bij 3,2 m niet te krap om te lopen?) zijn nog niet in het spel gezien.
