# Inspiratiepakket: doseringsplan (21-11, epic #1121)

Uitwerking van de ideeën die de eigenaar uit [VERHAAL-INSPIRATIE-21-11.md](VERHAAL-INSPIRATIE-21-11.md) goedkeurde. Niet toegevoegd (eigenaar): D21 Tessa's snackcijfers, D23 de buurman die er net niet bij is, 13 de logé, 14 Jelle als donkere spiegel, 18 huishoudgrapjes, 28 de terugblik "Weet je nog?". Werkafspraken: [verhaal/SCHRIJFREGELS-21-11.md](verhaal/SCHRIJFREGELS-21-11.md) (zuinig, elke toevoeging 2 tot 8 regels, een warme regel boven een geforceerde grap). Relatie en personages: [VERHAAL-RELATIE-21-11.md](VERHAAL-RELATIE-21-11.md), [personages.md](personages.md). Wijkt dit af van de code, dan is dit doc de fout.

## Regels

- **Dosering:** niet alles in elke akte. Elke akte krijgt twee tot vijf kleine dingen; het totaal komt neer op ongeveer 110 nieuwe regels (waarvan 19 stille appjes) en 19 nieuwe scènes. Het spel wordt hierdoor nauwelijks langer: alles speelt als autogesprek, appje, bestaande overgangsscène of één korte scène in een bestaande missie.
- **Samen spelen:** de scènes zijn van wie het spel opende (de wereld); een gast ziet ze mee in de scène, en er zit geen voortgang in (geen beloning, geen flag, geen stap). Appjes en autogesprekken zijn lokaal per speler, net als de bestaande. De overgangsscènes spelen alleen voor de host (storybridge.js: een gast en een lopende sessie spelen ze niet); wat daar bijgeschaafd is (O1, O3, O12) is dus een sfeerlaag, nooit nodig om door te kunnen. Een nieuwe figuur (buurman, ouders, nichtje) is voor een gast een gewone NPC in de scène van de host. Geen test nodig buiten de bestaande: de scènes schrijven niets in de voortgang (storybridge_test).
- **Nieuwe komische beats** (de punchline-regel) staan in `game/storydata/humor.inspiratie.json` (HI-01 tot en met HI-18), met drie varianten en een neutrale terugval; `chosen` is 0 en `panel` is leeg tot het paneel heeft gekozen. Appjes kunnen geen beat dragen (de tooling vindt alleen gesproken regels); hun grappen zijn kort en staan niet in het paneel.
- **Geen opnames:** alle nieuwe regels zijn `[NIEUW]` en alleen tekst; niets is ingesproken en er is niets met een stem gegenereerd.
- **Beppe:** Beppe heeft geen stem en overlijdt na M04 tot M08 (BEPPE-HUIS-21-11.md). Daarom is de logeerkamer-regel (C17) met Oma Trijntje gebouwd in plaats van met Beppe.

## Doseringstabel

Status: **gebouwd** = staat in de 09-scripts en in script.json; **plan** = alleen hier, met reden.

### Akte 1: Moi, Grunn

| Idee | Waar | Wie | Hoe | Status |
|---|---|---|---|---|
| A1 bijna-moment 1 + D20 (1) | O3, einde (auto, nacht) | Tammo, Tessa | bestaande overgangsscène bijgeschaafd: "Tessa, eigenlijk—", een bakfiets toetert | gebouwd |
| A4 koelkastlijst (begin) | O1 | Tessa, Tammo | bestaande overgangsscène: twee kolommen op de koelkast, "En waar staat thee?" | gebouwd |
| B8 buurman met het duivenhok | M06.0 (wachten in de flat) | Meneer Veldkamp | nieuwe regels in een bestaande thuisscène; naamkaart; de duif wil naar Tammo | gebouwd |
| A7 "zijn jullie al samen?" | B1.1 | Tessa, Tammo | nieuw autogesprek in de pool van akte 1 ("een hele goede koelkast") | gebouwd |
| D22 Tammo's "eigenlijk" | B1.2 | Tammo, Tessa | nieuw autogesprek (de ringmus) | gebouwd |
| A6 vraag van de dag | B1.3 | Tessa, Tammo | nieuw autogesprek (duiven; taxi en klussen) | gebouwd |
| F30 aftitelkaart | eindkaart akte 1 | Meneer Veldkamp | een regel erbij in `PARTS.kop.card` | gebouwd |

### Akte 2: Het Noorden is groot

| Idee | Waar | Wie | Hoe | Status |
|---|---|---|---|---|
| A2 misverstandsketen | M10.5 (autogesprek na M10) | Tammo (onduidelijk), Tessa | nieuwe korte scène, drie schakels, slot "Je hebt een huurcontract" | gebouwd |
| A1 bijna-moment 2 + D20 (2) | B2.1 | Tammo, Tessa | nieuw autogesprek: een koe onderbreekt de zin | gebouwd |
| E25 Tammo's dagdroom | T2 (streekbus) | Tammo, Tessa | korte droomsequens in de reisscène; regie-regel voor de low-poly look | gebouwd (beeld: nog te regisseren) |
| C17 logeerkamer-regel | A2.2 (appjes na M08) | Tessa, Tammo | Oma Trijntje slaapt in Tessa's bed; wie op de bank; "Ik haal de dekens. Twee." | gebouwd (met Oma, zie Beppe hierboven) |
| D24 "wanneer trouwen jullie?" | A2.2 (Mem, appjes na M10) | Mem, Tessa | Mem vraagt "voor een vriendin" | gebouwd |
| A6 vraag van de dag | B2.2 | Tessa, Tammo | nieuw autogesprek (de eierbal; vracht, landbouw en horeca) | gebouwd |
| F30 aftitelkaart | eindkaart akte 2 | Oma Trijntje | een regel erbij in `PARTS.romp.card` | gebouwd |
| A5 de ruildag | begin akte 3, na M14 | Tammo, Tessa | missie: ruil van rollen (zie hieronder) | plan |

### Akte 3: Aan de Eems

| Idee | Waar | Wie | Hoe | Status |
|---|---|---|---|---|
| A3 jaloezie-lite | M15.6 (na M15.5, kermis) | Daan, Tessa, Tammo | nieuwe korte scène; Tammo: "Ze moet nog eten"; de duif laat iets vallen; sluit aan op de bestaande "barman" in M16.1 | gebouwd |
| A1 bijna-moment 3 + D20 (3) | B3.1; O7 (bestaand) | Tammo, Tessa | autogesprek: bewust een onschuldig feit ("Het is ook iets. Een park."); O7 "Over zaterdag" blijft het echte bijna-moment | gebouwd |
| A4 koelkastlijst ("wij vinden") | A3.4 (appjes na M15) | Tessa, Tammo | nieuwe kolom, nog leeg: "Ik wacht op jou" | gebouwd |
| C16 het kasboekje | A3.4 (appjes na M14) | Tessa, Tammo | benzine 38,50, "Dan staat het er nog een tijd" | gebouwd |
| F29 autoduet | R3.4 (radio), B3.3 | Rikus, Tessa, Tammo | alleen een verzonnen nummer ("Elfde Verdieping" van De Fietstunnels), geen songtekst; Tessa het refrein, Tammo de bas | gebouwd (de zingmechaniek: plan) |
| A6 vraag van de dag | B3.2 | Tessa, Tammo | de meeuw (lucht en kermis) | gebouwd |
| F30 aftitelkaart | eindkaart akte 3 | Roelfien | een regel erbij in `PARTS.staart.card` | gebouwd |

### Akte 4: Zuidwaarts

| Idee | Waar | Wie | Hoe | Status |
|---|---|---|---|---|
| B12 mentor-frituurhouder | M17.5 (na M17.3, brug elf) | Stien, Tessa, Tammo | nieuwe korte scène; Wubbo kondigt haar aan in M17.1; Tessa durft de wagen nog niet te geloven | gebouwd |
| A1 bijna-moment 4 + D20 (4) | B4.1 | Tammo, Tessa | Tessa maakt zijn zin af, hij antwoordt "Precies. Dat bedoelde ik." | gebouwd |
| B9 ouders + B11 nichtje (aankondiging) | B4.2 | Tessa, Tammo | Tessa: Anneke, haar vader en Lieke komen naar het Ontzet | gebouwd |
| B10 tweede stel (zaad) | R4.0b (radio), A4.2 (appjes) | Rikus, Femke, Tessa | Femke belt Rikus voor een plaat; appjes "Hij zegt het wel heel mooi" | gebouwd |
| F30 aftitelkaart | eindkaart akte 4 | Meneer Veldkamp | een regel erbij in `PARTS.zuid.card` | gebouwd |
| E26 de dubbele date die geen date is | tussen M18 en M19 (Veendam) | Rikus, Femke, Tammo, Tessa | scène in een café | plan |

### Akte 5: Ontzet

| Idee | Waar | Wie | Hoe | Status |
|---|---|---|---|---|
| B9 ouderclash + E27 familiediner + B11 nichtje | M25.6 (na M25.4, Oma's keuken) | Anneke, Lieke, Oma Trijntje, Tessa, Tammo (Mem en Tessa's vader zonder tekst) | nieuwe korte scène; "Dan gaan ze er later in"; Lieke: "Jullie zijn al samen"; Tessa's vader knikt | gebouwd |
| A7 "zijn jullie al samen?" | M25.6 | Lieke, Anneke | het kind en de moeder nemen aan van wel | gebouwd |
| D24 "wanneer trouwen jullie?" | M25.6 | Oma Trijntje | de tweede keer | gebouwd |
| D20 uitbetaling | M26.7 (bestaand) | Tammo | de vijf woorden zijn de uitbetaling; niets gewijzigd | bestaand |
| C15 de nacht in de wagen | tussen M22 en M23 | Tammo, Tessa | bottle-missie, één wagen, één deken (zie hieronder) | plan |

### Deel 4: Nazomer

| Idee | Waar | Wie | Hoe | Status |
|---|---|---|---|---|
| A4 koelkastlijst (slot) | O12 | Tessa, Tammo | regie-regel: in de kolom "wij vinden" staat één regel in twee handschriften: de Fjord Frituur | gebouwd |
| B8 de buurman | O12 | Meneer Veldkamp | "De duiven vragen of jullie blijven." (derde spreker, 9 regels) | gebouwd |
| A19 koppelmoment per loopbaan | loopbaan.js, einde van een loopbaan | Tammo, Tessa | korte duo-scène per vak (zie hieronder) | plan |

## Wat alleen een plan is, en waarom

- **A5 de ruildag:** een missie met eigen gameplay (Tammo doet wat Tessa doet en andersom: plannen, schoonmaken, snacken). Vraagt een missiedefinitie in `missions_*.js`, een tijdelijke rolwissel van speler (`player: 'anita'`/'tammo') en een Samen-spelen-regel (beide spelers ruilen van rol). Past niet als tekst. Opzet: vijf stappen na M14 (vrije dag in Delfzijl): Tammo plant een rooster en struikelt over een koffiezetter; Tessa schoonmaakt de Escapade en geeft de bonnetjes door aan wie ze niet kent; slot: ze ruilen terug en zeggen allebei "Dat bedoelde ik ook." Beloning per speler (#429), geen verhaalflag.
- **A6 vraag van de dag, bij elke baan:** de hook hoort in `loopbaankaarten.js` (de kaart van een vak) en vraagt een vragenlijst per vak (veertien vragen, elk één antwoord door te doen). Drie vragen staan nu als autogesprek (B1.3, B2.2, B3.2); de rest wacht op de loopbaan-epic.
- **A19 koppelmoment aan het eind van elke loopbaan:** vraagt een hook in `loopbaan.js` (einde van een vak) en veertien korte duo-scènes (de carrière-matrix in VERHAAL-RELATIE-21-11.md §3 is de bron). Voorbeelden: Taxi: "Je rijdt als een fietser met een deadline." / "En jij betaalt als een regering." Kantoor: "Ik heb de stempels niet verloren, ze zijn verhuisd." Padel: "Wie had de bal?" "Dat wil ik niet weten."
- **C15 de nacht in de wagen:** een missie met twee kleine spelletjes (de radio afstemmen, soep maken) en één gesprek in één wagen op een dijk, na M22 (dan heeft de Escapade een luik), tijdens een zomerbui. Gameplay-arm en goedkoop, maar het is een nieuwe missie met eigen mechaniek. Samen spelen: één wagen, twee spelers. Dit is ook de plek voor een volgend bijna-moment (het vijfde); M26.7 betaalt uit.
- **E26 de dubbele date die geen date is:** Rikus is nu alleen een stem; hij heeft geen scènemodel en geen kledingrol, en de scène heeft een café nodig. Het zaad (Femke belt Rikus, appjes met Tessa) staat er al; de scène volgt als Rikus in beeld mag.
- **F29 de zingmechaniek van het autoduet:** een mini-ritmespel op een verzonnen nummer; nodig: een eigen opname van het nummer (geen muziekrechten, alleen eigen of verzonnen werk). Het nummer bestaat nu als radiozin en als autogesprek zonder tekst.

## Nieuwe personages

| Personage | Eerste scène | Aangekondigd door | Kledingrol (kleding-epic) |
|---|---|---|---|
| Meneer Veldkamp, buurman, duiven | M06.0 (naamkaart) | naamkaart | oude man, vest, duif op de schouder |
| Daan, kermiszanger | M15.6 (naamkaart) | naamkaart; M16.1 noemt "mijn nieuwe barman" | jonge man, glimmend jasje, gitaar |
| Stien, frituurhoudster | M17.5 (naamkaart) | Wubbo in M17.1 | 70, schort, mouwen omhoog |
| Anneke, Tessa's moeder | M25.6 (naamkaart) | Tessa in B4.2 | boerin, jas, mand eieren |
| Lieke, nichtje (10) | M25.6 (naamkaart) | Tessa in B4.2 | kind, gele regenjas |
| Femke, keeper | alleen appjes | Rikus (radio), Tessa | alleen later (nog niet in beeld) |

Tessa's vader komt als figurant zonder tekst in M25.6 (rol boer). Alle sprekers staan in `SPEAKER_TABLE` (build_story_data.mjs), `SPEAKERS` en `CHARACTERS` (storyarc_nieuw.js), de NPC-tabel (missionstory.js) en de kleurentabel (speakers.js).

## Veto-lijst (zelf beslist)

1. Logeerkamer met Oma Trijntje in plaats van Beppe (Beppe is dan al overleden en heeft geen stem).
2. Veldkamp komt in M06.0 binnen in plaats van in de verhuisdag (C00.3 is regel voor regel geregisseerd).
3. Het nummer "Elfde Verdieping" van De Fietstunnels is verzonnen; geen songtekst.
4. In M25.6 komen twee nieuwe figuren tegelijk (Anneke en Lieke), tegen de regel van één nieuw personage per scène; beide hebben een aankondiging en een naamkaart.
5. De onvoltooide zin staat precies vier keer (O3, B2.1, B3.1, B4.1) en staat daarom in story_similarity_allow.json met `maxKeer: 4`.
