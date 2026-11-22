# Interieurs: stand en gaten (ronde 6, 22-11)

Epic #1150, pakketten 1 tot en met 9 (#1161 t/m #1165). Deze pagina is de matrix **gedaan / ontbreekt** per pakket en per soort, met wat ronde 6 erbij bouwde. Ontwerp en uitleg staan in [INTERIEURS-21-11.md](INTERIEURS-21-11.md), wat in beeld nog gecontroleerd moet worden in [INTERIEURS-VERIFICATIE-21-11.md](INTERIEURS-VERIFICATIE-21-11.md). Niets hieronder is in beeld of in het spel bekeken: alles is met pure code, mocks en de audit op de echte kaart gemeten (geen Electron).

## Per pakket

| Pakket (issue) | Gedaan | Ontbreekt |
| --- | --- | --- |
| 1 verticale slice (#1161) | deur uit de gevelbouwer, hal in de voetafdruk, portal-snede, deurvleugel, `b.walk`, camera binnen, lui bouwen bij 20 m en vrijgeven bij 32 m (max 2); stresstest en budgettest | niets in code; de snede, de camera en de deur zijn nog nooit in het echte spel gezien |
| 2 tot 6 soorten (#1162) | negen soorten, 34 varianten met een recept (nieuw in ronde 6: gebedshuis; ronde 7: schuur, garagebox, stal, kas en het portiek van een appartementencomplex, zie onder), tweede verdieping, mensen die dingen doen, drukte per uur, kopen aan de balie (nu ook apotheek, hotel, werkplaats, magazijn) | meer recepten per winkeltype (nu een recept met variatie uit het zaad), een achterdeur, een tweede trap, een lift, mensen die naar boven lopen, voorwerpen in de handen |
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
| woning/appartement | 6/6 | 26 | 0.7 | bewoner | - | nee | ja | nee |
| kerk | 6/6 | 33 | 3 | bezoeker, koster | - | ja | ja | nee |
| kerk/kapel | 6/6 | 36 | 2 | bezoeker, koster | - | ja | ja | nee |
| kerk/gebedshuis | 6/6 | 25 | 3 | bezoeker, koster | - | ja | ja | nee |
| station | 6/6 | 26 | 6 | loketmedewerker, reiziger | - | ja | ja | nee |
| bibliotheek | 6/6 | 57 | 3 | bibliothecaris, lezer | - | ja | ja | nee |
| garage/werkplaats | 6/6 | 33 | 1 | monteur | Fles ruitenvloeistof | nee | ja | nee |
| garage/magazijn | 6/6 | 40 | 1 | monteur | Rol pakbandtape | ja | ja | nee |
| garage/schuur | 6/6 | 32 | 0 | - | - | nee | ja | nee |
| garage/box | 6/6 | 30 | 0 | - | - | nee | ja | nee |
| garage/stal | 6/6 | 26 | 0.7 | boer | - | nee | ja | nee |
| garage/kas | 6/6 | 35 | 0 | - | - | nee | ja | nee |
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

## Ronde 7 (22-11): van 42,6% naar 81,7% betreedbaar

Wens van de eigenaar: "Kunnen we meer gebouwen voorzien van interieurs?" Meting met `node scripts/interieur_dekking_audit.mjs --world=<map> --sample=20` op de echte kaart (370.144 panden, 1 op 20 gemeten, alle panden met een plek volledig; voor en na met dezelfde kaart). De redenen per type en oppervlak komen uit `node scripts/interieur_r7_analyse.mjs`. Niets hieronder is in beeld bekeken. Keuzes en afgewezen alternatieven: [ADR 0049](../.specs-fire/standards/adr/0049-interieurs-soort-uit-het-pand-en-bijgebouwen.md).

### Wat de analyse liet zien

| Reden (geschat aantal panden dat dicht bleef) | Voor | Na |
| --- | --- | --- |
| Zonder type (`yes`): hal te klein (schuurtjes, bijgebouwen) | ca. 133.000 | 42.500 |
| Huis met type: hal te klein (deur dicht bij de hoek, vorm met veel hoeken, een vleugel van 1 tot 2 m diep) | ca. 40.000 | 13.800 |
| Huis met type: plafond te laag (twee verdiepingen van 2,25 m in de gevel) | ca. 10.000 | 0 |
| Schuur, stal, kas en andere bijgebouwen met type: bewust dicht | ca. 7.000 | 4.200 |
| Bouwplaats, caravan, woonboot, tank | 4.500 | 4.500 |
| Geen deur in de gevel | ca. 1.000 | 660 (zonder type, met een kleine hal) |

De grote vondst was geen type maar een meetfout: de gevelbouwer zet de voordeur van een rijtjeshuis op 1,2 m van de hoek, `findHall` eiste 0,9 m hal naar beide kanten van het deurmidden en liep met een raster van 0,5 m net onder die grens. De deurruimte is nu 0,7 m (`DOOR_CLEAR`) en de hal groeit in stappen van 10 cm. Huizen met een type: van 68,4% naar 91,3%.

### Voor en na per bouwtype (geschat, hele provincie)

| Bouwtype | Panden | Voor | Na |
| --- | --- | --- | --- |
| yes (zonder type) | 174.042 | 33.076 (19%) | 130.848 (75,2%) |
| house | 157.800 | 107.961 (68,4%) | 144.049 (91,3%) |
| detached | 7.469 | 5.676 (76%) | 7.255 (97,1%) |
| shed | 6.524 | 0 | 2.466 (37,8%) |
| semidetached_house | 4.811 | 3.142 (65,3%) | 4.269 (88,7%) |
| industrial | 4.783 | 2.900 (60,6%) | 4.717 (98,6%) |
| construction | 3.890 | 0 | 0 (bouwplaats) |
| garage | 3.449 | 55 (1,6%) | 2.902 (84,1%) |
| apartments | 3.311 | 3.099 (93,6%) | 3.188 (96,3%) |
| retail | 1.218 | 963 (79,1%) | 1.171 (96,1%) |
| commercial | 709 | 465 (65,6%) | 685 (96,6%) |
| school | 185 | 144 (77,8%) | 185 (100%) |
| farm_auxiliary | 154 | 0 | 132 (85,7%) |
| greenhouse | 108 | 0 | 91 (84,3%) |
| Totaal | 370.144 | 157.825 (42,6%) | 302.539 (81,7%) |

Per soort (gewogen schatting na): woningen 198.883, schuren 73.116, garageboxen 18.459, magazijnen 7.158, portieken van appartementencomplexen 1.102, stallen 200, kassen 86, winkels en horeca ca. 2.700. **Zonder de bijgebouwen is 56,9% van de panden betreedbaar** (210.700): het getal van 81,7% bestaat voor een kwart uit schuurtjes en garageboxen. Dat is bedoeld (het zijn kamers met planken, een fiets en een emmer), maar het is geen woning.

### Nieuwe soorten en wat ze doen

- **Schuur** (vanaf een hal van 2,0 bij 2,2 m, plafond 2,4 m): wandplanken, gereedschapswand, fiets, emmer, krat, soms een ton. Voor panden met type `shed`, `outbuilding`, `hut`, `cabin`, `boathouse` en voor panden zonder type met een kleine hal.
- **Garagebox** (2,4 bij 2,6 m, plafond 2,5 m): smal en lang (verhouding 1,7 of meer, 14 tot 45 m²) zonder type, of type `garage`; schappen met onderdelen, banden, blikken, een werkbank bij genoeg diepte.
- **Stal** (3,6 bij 5 m): hooibalen, een trog langs de wand, emmer, ton, werkbank, en in zeven van de tien stallen een boer die voert en hooi verplaatst (nieuwe rol met schema en kledingpool). Voor `barn`, `stable`, `cowshed`, `farm_auxiliary`, `livestock`, `sty`, `agricultural`.
- **Kas** (2,4 bij 3 m): tafels met planten in rijen, een wasbak, kratten. Voor `greenhouse`.
- **Appartementencomplex** (`apartments` vanaf 220 m2): portiek met brievenbussen, fiets en plant, een tussenwand met een deur, en erachter de woning op de begane grond. Geen trap omhoog (de flats erboven bestaan niet).
- **Bedrijfshal**: een laag pand zonder type vanaf 700 m2 is een magazijn in plaats van een reusachtige woonkamer.
- Alle nieuwe varianten hebben een eigen drukte per uur; geen enkele verkoopt iets. Schuur, garagebox en kas zijn leeg (niemand staat in een schuurtje), een appartement heeft een bewoner.

### Gevraagd en bewust niet gedaan

- **Type afleiden uit ligging** (landgebruik, winkelstraat, buurpanden, adressen in de buurt): niet gedaan. Die gegevens hangen af van welke tegels geladen zijn; host en gast zouden een ander soort zien (ADR 0049). Een winkel op de begane grond blijft de POI-koppeling (al deterministisch).
- **Deur aan de straatkant naast het wegsegment**: niet gedaan (zelfde reden). De gemaakte deur kiest de langste gevel.
- **Bakkerij, slagerij, bloemist, kapper, cafe, snackbar, restaurant, hotel, school, sporthal, bibliotheek, kleine kerk, kantoor**: bestonden al als recept (zie de matrix). **Tandarts, huisarts en buurthuis**: niet gebouwd; `doctors` blijft de ziekenhuisbalie, een buurthuis heeft geen OSM-type dat we kunnen onderscheiden van `civic`.
- **Gemaal en transformatorhuisje**: blijven dicht, met reden in `NOT_ENTERABLE_WHY` (machines, geen kamer).

### Wat er nog dicht blijft (hele provincie, geschat)

| Reden | Panden |
| --- | --- |
| Zonder type, hal kleiner dan 2,0 bij 2,2 m of een deur zonder ruimte erachter (29.400 onder 10 m2, 11.300 van 10 tot 20 m2) | 42.500 |
| Huis met type, hal te klein (vorm met veel hoeken, vleugels van 1 tot 2 m diep, deur in de hoek) | 13.800 |
| Schuur met type, hal te klein (vaak 1,5 m diep) | 4.100 |
| Bouwplaats | 3.900 |
| Zonder type, geen deur en geen plek voor een gemaakte deur | 660 |
| Garage met type, te klein | 550 |
| Caravan, woonboot, tank | 600 |

### Prestatie en budget (in node, geen Electron)

Het plan maken en de geometrie bouwen blijven onder het budget: de nieuwe recepten halen op 500 panden elk hooguit 2.700 driehoeken (de grens is 12.000), plan hooguit 180 ms op een drukke machine (gemiddeld 10 tot 40) en bouwen hooguit 80 ms. `interior_budget_test` en `interieur_matrix_test` zijn groen (de tijdsdrempels van `interior_stress_test` schommelen op een drukke machine, ook op de hoofdmap zonder deze wijziging). Lui bouwen (24 m, weggooien 34 m, hooguit twee tegelijk) en het driehoeksbudget zijn niet veranderd; een pand dat dicht blijft probeert nu hooguit twee extra hallen te vinden voordat het opgeeft.

### Nog niet in beeld bekeken (hertest, screenshotjacht)

Alles hierboven: geen enkel nieuw interieur is in het spel gezien. Voor de hertest:

1. Loop in een rijtjeshuis in een Ommelander dorp (deur 1,2 m van de hoek): is de hal niet te krap en de deur niet te dicht op de muur?
2. Loop in een schuur (tuinhuisje in een achtertuin, `yes` kleiner dan 15 m2): is een kamer van 2 bij 2,2 m acceptabel, en past de camera?
3. De garagebox en de stal (een boerderij in het Hogeland): staan hooibalen en trog goed, past de boer?
4. Een kas (tuinbouwgebied bij Westerlee): staan de tafels met planten goed en is het niet te donker?
5. Een appartementencomplex (Paddepoel): is het portiek herkenbaar, werkt de deur naar de woning?
6. Een gevel waar de deur gemaakt is (`b.entrance === null`): staat de deurvleugel er niet raar bij?
7. Het plafond van 2,1 m in een laag huis: raakt de camera het plafond?
8. Een pand van 700 m2 en meer zonder type: is een magazijn daar een goede gok?
