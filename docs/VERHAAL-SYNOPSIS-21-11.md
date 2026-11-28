# Synopsis van het nieuwe volledige verhaal en hoe alles in de game erin terugkomt (21-11)

Antwoord op de vraag van de eigenaar (21-11): *"Kun je mij ook een synopsis geven van het nieuwe volledige verhaal en aangeven hoe alles wat bestaat in de game daarin terugkomt? En hoe je dat allemaal samen kunt beleven?"*

> **Status van dit document.** Overzicht voor de eigenaar, geen spec. Bronnen: [VERHAALCANON-21-11.md](VERHAALCANON-21-11.md) en [VERHAAL-ANALYSE-21-11.md](VERHAAL-ANALYSE-21-11.md) (main), [verhaal/STIJLGIDS.md](verhaal/STIJLGIDS.md), [personages.md](personages.md), [verhaal/nieuw/](verhaal/nieuw/00-OVERZICHT.md) (overzicht, akte 1 t/m 5, zijmissies, Deel 4), en de epic-branches `epic-verhaal-21-11` (RUGGENGRAAT, SCHRIJFREGELS, `unlockgate.js`), `epic-bezit-21-11` (BEZIT-21-11) en `epic-kleding-21-11` (KLEDING-21-11). Voetbal en binnenmissies staan al in main (VOETBAL-CARRIERE-21-11, BINNENSETS-21-11). Bij verschil wint de spec in `.specs-fire/standards/` en daarna de code. Wat in de docs nog niet af is, staat hieronder als **voorstel**. Niets hiervan is in beeld gespeeld door een mens; de speeltijden zijn ontwerpramingen. Wat de epic-branches nog niet in main hebben, staat bij hoofdstuk 6.

> **Kern van 21-11 (tweede versie van de eigenaar; vervangt waar het botst).** Het doel van Tammo en Tessa is niet een frietwagen maar een plekje in de wereld vinden; ze zijn bang elkaar kwijt te raken, proberen allerlei loopbanen (de carrière-tour, ook de profvoetbalcarrière) en ontdekken dat ze verliefd zijn en samen kunnen werken. Pas rond akte 4 en 5 vallen de stukjes en ontstaat de snackwagen (de snackwagen, het luik in M22), gevolgd door de strijd om een standplaats met Jelle Terpstra ("Us Mem Snacks"); daarna is er een open endgame (de wagen laten groeien, standplaatsen overnemen, Jelles imperium uitdagen) waarin alles beschikbaar blijft. De slogan is **Ontdek jezelf in Grunn** (zonder snacks; de snackwagen is een verhaaltwist en geen verkoopargument). De romantiek is zoet en komisch zonder echt drama: de "ruzie" in akte 4 is een komisch misverstand. Jelle is een eikel tot de verzoening helemaal aan het eind (hij doet het voor Mem, die dat niet nodig vindt; Durk en Douwe maken hem zachter; Groningers en Friezen komen weer bij elkaar). Ze winnen met oprechte interesse, behulpzaamheid en liefde; Jelle met bureaucratie, omkoping en sabotage. Gaswinning en aardbevingen zijn uit het verhaal. Uitwerking: [verhaal/RUGGENGRAAT.md](verhaal/RUGGENGRAAT.md), [VERHAAL-RELATIE-21-11.md](VERHAAL-RELATIE-21-11.md), [verhaal/FILMSCRIPT-21-11.md](verhaal/FILMSCRIPT-21-11.md), [VERHAAL-TEMPO-21-11.md](VERHAAL-TEMPO-21-11.md), [VERHAAL-THUIS-21-11.md](VERHAAL-THUIS-21-11.md). Samen spelen: iedereen is lokaal de hoofdpersoon die de stap nodig heeft en ziet de ander als partner-NPC.

## 1. De elevator pitch en de rode draad

**Slogan:** *Een zomer in Grunn. Kon minder.* Ondertitel op de titelkaart: *Tammo en Tessa zijn net afgestudeerd en hebben samen geld voor één patatje.* (Besluit 23-11, coördinator namens de eigenaar, zie docs/SLOGAN-23-11.md; vervangt "Ontdek jezelf in Grunn." van 21-11. Nog steeds zonder snackwagen; trailer, Steam, perskit, social en de test gebruiken dit.)

**Pitch in drie zinnen.** Tammo en Tessa (allebei 24) zijn net afgestudeerd, werkloos en al vijf jaar vrienden, sinds hun eerste Kiezelweek. Tessa ontdekt dat ze een frietwagen wil, Tammo wil vooral rijden en bij haar blijven, en de enige vrije standplaats van Grunn gaat naar de winnaar van de Noordelijke Snackprijs. Jelle Terpstra, een Friese snackbaron met een bureaucratisch imperium, koopt de hele markt op om dat te voorkomen, en de grappen, de romance en de open wereld volgen uit die race.

**De canon in één blik** (VERHAALCANON §2):

| Wie of wat | Canon |
|---|---|
| Tammo en Tessa | 24, net afgestudeerd, werkloos (eerste klusjes uit het spel), vijf jaar vrienden sinds de eerste studieweek, huisgenoten in Paddepoel (flat op de Pleiadenlaan, sinds 14 augustus). Tammo is vijf jaar stiekem verliefd. Tessa komt van het platteland (boerendochter, dorpsteam); Tammo is een Stadjer uit het Oosterpark met een onverklaarde band met duiven. |
| Rikus | 25, Tammo's jeugdvriend uit het Oosterpark, nachtradio (Nachtstreek). Hij heeft werk, vertelt de wereld en duidt de relatie nooit. |
| Beppe | Tammo's Friese oma: eerst een hartelijk bezoek (ze ziet Tessa voor het eerst), een paar missies later overlijdt ze en blijft de herinnering. Ze heeft geen stem. |
| Oma Trijntje | 92, Tessa's oma in Stad en voor Tammo "Oma van de straat" (een ander personage dan Beppe, Tammo's oma). Haar recept van 1953 is de basis van de snackwagen. |
| Jelle Terpstra | Rijk, bureaucratisch, lang, arrogant en tegelijk lief ("Foar mem"). Terugkerende rivaal, in de laatste akte de eindbaas: hij wordt verslagen met bureaucratie en vette snacks, nooit met geweld. |
| De frietwagen | De rode Fjord Escapade wordt de snackwagen: thuisbasis, bedrijf en doel. |

**Drie lijnen** (RUGGENGRAAT, de toets voor elke scène):

1. **A, de frietwagen.** Tessa bakt en wil een thuis met wielen, Tammo rijdt. De wagen groeit per akte: naam, recept, stek, team, standplaats, keten.
2. **B, de romance.** Zoet en komisch, een trap in zes stappen: handen (M06), lange blik (M11), voorzichtige flirt (M14), kus (M16), ruzie (M20), knuffel en openbaring (M22), vijf woorden en samen (M26). Ze worden een stel.
3. **C, Jelle.** Hij wint met bureaucratie: regels, vergunningen en trucs. Hij heeft de Gouden Eierbal echt gestolen; zijn oma Mem neemt hem die in Bourtange af.

**De ene zin boven alles:** *Twee net afgestudeerde, werkloze vrienden van 24 willen een frietwagen laten rijden; Tessa wil dat meer dan ze zegt, Tammo wil bij haar blijven, en Jelle Terpstra koopt Grunn op voordat het kan.*

## 2. Synopsis per akte

Het verhaal loopt van vrijdag 14 augustus tot vrijdag 28 augustus, met een epiloog op 11 september en Deel 4 (Nazomer) van 14 tot 19 september. Daarna is er geen verhaaleinde meer maar een open wereld. Tijden zijn de ontwerpraming (00-OVERZICHT §3), geen meting. Alle namen en feiten staan in de akte-docs in `docs/verhaal/nieuw/`.

### Akte 1: Moi, Grunn (Stad, vr 14 tot ma 17 aug, ca. 62 min)

| | |
|---|---|
| **Doel** | Honderdvijftig euro verdienen en zich inschrijven voor de Noordelijke Snackprijs: de enige weg naar een standplaats. Wie winnen wil, kan niet zonder de jury, en de jury zit de bewaarder van de Gouden Eierbal voor. |
| **Tegenstander, inzet** | Jelle, die de markt opkoopt (hij is vroeg zichtbaar: Rikus' radio, de chat, dan in persoon in M03 kil en zakelijk). Inzet: Tessa's thuis met wielen en Tammo's wens om bij haar te blijven. |
| **Kernmissies** | M01 Nul krassen, vijftienhonderd punten; M02 Even pinnen; M03 Het Loket; M04 Kieken van boven (duif); M05 Wind tegen, beide kanten op (fietsrace); M06 Het museum stond er al zo (de kraak). |
| **Nieuwe personages** | Rikus (opening, radio), Berend (aangekondigd door Tammo, M01), Sjabbe (door Tessa, M02), Jelle (chat, Berend, Sjabbe; in persoon M03), Mevrouw Hoving de bewaarder (M03), Duivenmelker Bert (door Tammo: "de beste vriend van mijn opa"), Henk (door Berend: "mijn zwager"), Oma Trijntje (door Tammo, vroeg genoemd), Beppe (huisbezoek na M01). Regel: een ander personage kondigt aan, de scène toont één trek, radio en telefoon introduceren nooit. |
| **Woonplek** | De flat in de woontoren aan de Pleiadenlaan (Paddepoel), elfde verdieping, met garage en helidek. De opening is de verhuisdag uit de Oosterparkwijk. |
| **Romantiek** | Het kaartje van de eerste studieweek in de flat; Rikus' "vijf jaar"; oogcontact (M05); de eerste aanraking, "Voor de grip" (M06). |
| **Ontgrendelt** | Rijden en klussen: taxi, klussen, kantoor, padel, de duif. Beppes huis (na M01). |
| **Hoogtepunten** | De openingsparodie (trailer met fietsers in plaats van flamingo's), de stunt zonder kras, Jelle en het Loket (artikel 4 en 9), de duif voor het museum, de lege vitrine met het kaartje "Tige tank! - J." |
| **Einde** | De bal is al weg: Jelle is een stap voor en zegt het zelf op de radio. |

### Akte 2: Het Noorden is groot (Stad, Hogeland, Waddenzee, di 18 tot do 20 aug, ca. 55 min)

| | |
|---|---|
| **Doel** | Oma Trijntjes recept van 1953 redden (vet, eieren, zout, meel, mosterd), omdat ze eerlijk willen winnen. |
| **Tegenstander, inzet** | Jelle koopt de ingrediënten op, per missie een eigen telefoontje of scène en een offerte; hij sluit wegen en huurt een boer. Inzet: zonder recept en zonder Oma's vijf vrienden geen deelname; Tessa ontdekt dat ze het zelf wil kunnen maken. |
| **Kernmissies** | M07 Al het vet van Grunn (tankwagen); M08 Fatbikes tellen niet als fiets; reis T1 De trein naar Warffum; M09 Heel aankomen is ook een kunst (eieren, trekker); M10 Een trekker-limo op de wierde (quad); bijbaan A1 De bietenoogst bij Hoogkerk; reis T2 De streekbus naar Zoutkamp; M11 Geleend van de Friezen (skûtsje, wad). |
| **Nieuwe personages** | Oma Trijntje (naamkaart, prikbord in de flat met de vijf vrienden), Geesje (eieren, via Oma), Kapitein Klaas (via Oma), Mem (twee appjes en telefoontjes, stil), Jelle als dreiging in elke missie. |
| **Woonplek** | Nog steeds de flat; onderweg overnachten ze bij Geesje in Warffum (de eieren). |
| **Romantiek** | Mems eerste appje, "Niet tegen haar" (M08), de zee achter de dijk (T1), de Melkweg met de lange blik (M11). Tammo ziet haar, zij ziet dat hij kijkt. |
| **Ontgrendelt** | De boerderij met Tessa (Hoogkerk; zie hoofdstuk 3), vracht, bezorging, horeca, water, vissen, het spoor en de streekbus. |
| **Hoogtepunten** | De hele stad met lege pannen (M07), zestig eieren zonder snelheid (M09), Jelle in de sloot ("...Plons."), het wad bij nacht en de sterren. |
| **Einde** | Dijkstra's belletje; het koopboek van Jelle is de haak. |

### Akte 3: Aan de Eems (Eemsdelta, Oldambt, Dollard, vr 21 tot zo 23 aug, ca. 55 min)

| | |
|---|---|
| **Doel** | Jelles koopboek lezen en hem stoppen bij haven, graan en jury, terwijl ze hun eerste eigen stek leren kennen. |
| **Tegenstander, inzet** | Jelle in persoon, minstens twee scènes: zijn limo bij de kermis, een bedankbriefje. Hij legt zijn eigen plan uit (het plakjesbord met acht plakjes); een deurwaarder-race om het checkpoint. |
| **Kernmissies** | M12 Het staat niet in het rooster (heli met het koopboek); reis Lauwersoog naar Eemshaven; M13 Het containerlabyrint (kraan); M14 De dijk (race tegen de deurwaarder); reis T3 De trein naar Winschoten; M15 Laag over het graan (klein vliegtuig); M16 Nog eentje dan (kermis en botsauto's); bijbaan A2 De kermisrit. |
| **Nieuwe personages** | Dokter Dijkstra (via Oma; heli), Lammert (via Klaas; havenmeester), Roelfien (Oma's nicht; graanboerin en vlieger), Geert (kermis), Durk en Douwe (Jelles tweeling, "...Hè."; vanaf M02, hier het keerpunt), Sjabbe als verwijzing naar Bezit. |
| **Woonplek** | Lammerts havenkantoor en woonschip in Eemshaven; de wagen heeft een stek (Lammerts kade, de kermis). |
| **Romantiek** | "Dank je dat je het vraagt" (M12), "Je ademt" (M13), Tammo's eerste voorzichtige flirt ("Tammo. Je bent rood.", M14), **de eerste kus** in het gebots van de botsauto's (M16, ca. 62% van de speeltijd), daarna doen ze alsof er niets gebeurde. |
| **Ontgrendelt** | Panden en ondernemen (Bezit: de frietwagen als bedrijf), lucht, handhaving, kermis. |
| **Hoogtepunten** | Tammo steelt de aktetas uit de ballonmand terwijl Tessa de heli stil houdt, de kraan met de containers, een vliegtuig laag onder de hoogspanning door, de kus midden in het gebots. |
| **Einde** | Durk verklapt dat Jelle met de bal naar Veendam rijdt. |

### Akte 4: Zuidwaarts (Veenkoloniën, Westerwolde, Westerkwartier, zo 23 tot wo 26 aug, ca. 58 min)

| | |
|---|---|
| **Doel** | De bal terughalen in Bourtange voordat Jelle hem aan zijn moeder geeft; bewijzen dat hij hem al had. |
| **Tegenstander, inzet** | Jelle zelf op pad; zijn oma Mem als tweede gezicht. Hij koopt de fanfare en de machinist; zijn beleggers belegeren de kruitkelder. Inzet: het dieptepunt van de romance. |
| **Kernmissies** | M17 Open, dicht (sloep, bruggen); M18 Wie draaide de camera's uit? (Wiebelwerk, kantoor, serverkamer); M19 Stoom (museumtrein); reis T4 De bus naar Bourtange; **M20 Het beleg van Bourtange** (Mem neemt de bal af, de ruzie); M21 Iedereen heeft een rode auto gezien (twee solodelen: Tessa redt de auto en verliest de bal, Tammo faalt bij de vrienden). |
| **Nieuwe personages** | Wubbo (brugwachter, via Oma's vrienden), Tinus (trekkertrekker, via Henk: "hij heeft een schuur"), Mem in persoon (M20), de accountmanager. |
| **Woonplek** | Onderweg: de museumtrein, Bourtange, Tinus' schuur in het Westerkwartier. De flat is ver weg. |
| **Romantiek** | "Over zaterdag." "Welke zaterdag?" (M17), "Je hebt hem in een station gezet" (M19). Dan het dieptepunt: Tessa verzweeg Mems appjes, Tammo zegt niets ("Jij zegt nooit iets!"). Ze zijn uit elkaar; de speler wist wat Tessa verborg. |
| **Ontgrendelt** | Voetbal en regio-reizen (Tessa speelt, Tammo regelt; zie hoofdstuk 3). |
| **Hoogtepunten** | De fierljep over de gracht van Bourtange, de omgekochte machinist en de gestolen trein, Tessa die de auto redt en de bal verliest. |
| **Einde** | Uit elkaar, de auto terug, de bal weg. |

### Akte 5: Ontzet (Westerkwartier en Stad, wo 26 tot vr 28 aug, ca. 47 min)

| | |
|---|---|
| **Doel** | De standplaats krijgen en het Ontzet winnen met de beste eierbal. |
| **Tegenstander, inzet** | Jelle in zijn eigen stad: notaris, limo en kraam. Eindbaas: hij valt met zijn eigen vergunning en een formulier in drievoud, niet met geweld. |
| **Kernmissies** | M22 Een luik erin (verontschuldiging, knuffel, openbaring; Tammo verpandt het horloge van zijn opa); M23 De colonne (alle bondgenoten, alle voertuigen); M24 Er hangt iets Fries aan d'Olle Grieze (de duifvlag); M25 Het bod viel tegen (Oma's keuken, oefenbal); **M26 Ontzet, net als in 1672** (bakken, blokkade, jury 4 tegen 1); epiloog. |
| **Nieuwe personages** | Geen nieuwe: de bondgenoten komen terug. Durk en Douwe lopen over in M23. |
| **Woonplek** | Tinus' schuur, dan de Grote Markt; de wagen krijgt zijn luik. |
| **Romantiek** | **Hoogtepunt.** Knuffel en openbaring (M22), de hand op de pook (M23), "Voor de grip?" "Nee. Gewoon." (M24), Oma: "Ik wilde het één keer horen" (M25), en in M26 de vijf woorden voor iedereen: "Ik wil bij jou blijven." "Dat bedoelde ik ook." Ze zijn een stel. |
| **Ontgrendelt** | Race, de colonne, de snackwagen-dienst (de wagen mag de weg op). |
| **Hoogtepunten** | De tractorparade door het Westerkwartier, de duifvlag, de finale als echte wedstrijd, Jelle in de gracht, de rij tot de Korenbeurs. |
| **Epiloog (vr 11 sep)** | Standplaats op de Vismarkt; Jelle houdt de standplaatsen, de molen en één jurylid, en geeft uit eigen beweging drie plakjes terug. "Het is tweeëntwintig graden." |

### Deel 4: Nazomer en de open wereld (Loppersum en Bourtange, 14 tot 19 sep)

Een kort, warm deel zonder falen of tijdslimiet. M27 Inpakken, M28 De wisselwoning en M29 Terug (Willemien, familie van Oma, verhuist even uit haar huis dat wordt versterkt; het bedrijf heet alleen Delfstof Noord, geen cijfers, geen grappen over het huis, geen wraak). Reis T5, dan M30 Het proefbeleg in Bourtange: Berend wint voor het eerst en vindt dat verkeerd. De slotscène bij de snackwagen: "Thuis is waar de kar staat." Daarna is er geen hoofdlijn meer. M30 is de uitnodiging: Bezit, boerderij, voetbal, de frietwagenketen en de provincie zijn open. Jelle bestelt een eierbal; zijn imperium blijft panden kopen en is de tegenstander van de open wereld.

### Woonplekken door het verhaal

Canon: huisgenoten sinds 14 augustus in Paddepoel. Wat het verhaal laat zien is een reeks van thuisbasissen die meegroeit met lijn A: de flat (akte 1), de wagen als schuilplaats en slaapplek onderweg (akte 2 en 3), Lammerts havenkantoor (akte 3), Tinus' schuur (akte 4 en 5), de standplaats op de Vismarkt (epiloog). **Voorstel:** na Deel 4 kunnen speler en maat het thuis kiezen (flat, wagen, een pand uit Bezit); de kledingkast gaat al mee per personage (KLEDING §3). Het model "huis wisselt mee" bestaat nog niet (zie hoofdstuk 6).

## 3. Hoe alles wat bestaat terugkomt

Legenda: **Plek** is waar het verhaal het onderdeel noemt of opent (akte, scène of missie), **Via** welk personage, **Rode draad** de koppeling met wagen (A), romance (B) of Jelle (C). **Stand** = *bestaat* (in code, verhaalplek in het script of de ontgrendelpoort), *branch* (in een epic-branch, nog niet in main) of **voorstel** (nog geen plek). De ontgrendeling per akte volgt `unlockgate.js` (epic-verhaal): een nieuw spel begint dicht, bestaande saves houden alles.

### 3.1 Voertuigen en vervoer

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Auto (de Fjord Escapade) en garage in de flat | Akte 1, opening | Tammo | A: de Escapade wordt de wagen; lekke band | bestaat |
| Bakkie | M01 | Berend | A, C: "nul krassen" | bestaat |
| Fiets (en fatbikes) | M05, M08 | Sjoerd, Oma | B: oogcontact; fatbikes zonder pad | bestaat |
| Taxi | M06 (loopbaan Taxi) | Tammo | A: Tammo's rijliefde | bestaat |
| Scooter en e-step | M18 | Wiebelwerk | C: Jelles kantoor | bestaat |
| Vrachtwagen en tankwagen | M07 | Oma Trijntje | A: het vet | bestaat |
| Trekker, quad | M09, M10, M22, M23 | Oma, Tinus | A, C: Jelles hinderlaag; het luik | bestaat |
| Bus (meerijden of rijden) | T2, T4 | Klaas, Tinus | A: reizen is inhoud | bestaat |
| Trein (meerijden, machinist) | T1, T3, M19 | Tessa, Wubbo | C: omgekochte machinist | bestaat |
| Helikopter en vliegschool | M12 | Dokter Dijkstra | C: het koopboek; vliegschool = loopbaan Lucht | bestaat |
| Klein vliegtuig | M15 | Roelfien | C: de bloem; enige vliegtuigmissie | bestaat |
| Boten (rubberboot, skûtsje, sloep, rondvaart) | M11, M17 | Klaas, Wubbo | B: de Melkweg; C: bruggen | bestaat |
| Brommer met versnellingen, motoren, kart | Los | **voorstel:** Rikus' tip op Nachtstreek, kart via Tinus (M22) | A | deels (kart: via Tinus); brommer en motoren **voorstel** |
| Tuning, kopen, delen, eigen garage | Flat, garage; kopen bij de winkels | Tessa en Tammo vanaf akte 1 | A | bestaat; verhaalplek voor kopen **voorstel**: Tammo laat de garage zien in M01 |

### 3.2 Bijbanen en loopbanen

De negentien loopbanen hebben allemaal een verhaalplek (`unlockgate.js`, `CAREER_BY`): een personage opent het vak op het moment dat het verhaal erlangs komt.

| Loopbaan | Plek | Via |
|---|---|---|
| Klussen | M02 | Sjabbe ("heeft altijd werk dat niemand wil") |
| Kantoor (Het Loket, rechtbank, StudieStaat) | M03 | Sjabbe, de loketbediende |
| Taxi | M06 | Tammo |
| Padel | M05 | Sjoerd |
| Vracht | M07 | Oma Trijntje |
| Bezorging en Buiten | M08 | Oma Trijntje |
| Spoor | T1 | Tessa |
| Horeca | M09 | Geesje |
| Landbouw | M10 en A1 | Tessa |
| Bus en Vissen (hengelen) | T2 | Klaas |
| Water | M11 | Klaas |
| Lucht | M12 | Dokter Dijkstra |
| Handhaving | M13 | Lammert |
| Kermis | M16 en A2 | Geert |
| Racen | M22 | Tinus |
| Podium | M29 | Willemien |
| Golf | M30 | Berend |

Rode draad: bijbanen zijn de manier waarop twee werkloze afgestudeerden aan geld komen ("hun eerste klusjes komen uit het spel", canon); ze betalen de inschrijving, de standplaats en de frietwagen. Bijbanen zonder eigen scène in de hoofdlijn (BOA voor een dag, Krantenwijk, verhuizing, fietsdepot, Kamerkoning, veerdienst, tjalke, Pieterpad): **voorstel:** Sjabbe noemt ze als lijst op zijn prikbord in het pandhuis (past bij zijn rol "ik vraag niks, ik zeg alleen") of Rikus noemt ze als tip in Nachtstreek.

### 3.3 Minigames en lichte sims

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Hengelen | T2 | Klaas | Wadsfeer; later vis voor de wagen? | bestaat; wagenkoppeling **voorstel** |
| Bakronde (Oma's eierballen) | M25, M26 | Oma, Mem | A: het recept, de finale | bestaat |
| Bezorger | M08 (loopbaan Bezorging) | Oma | A | bestaat |
| Krantenwijk | Geen eigen plek | **voorstel:** Sjabbe's klussenlijst | geld | **voorstel** |
| Rondvaart en pannenkoekenschip | M11 (Water), Westerkwartier | Klaas | B: boot, sterren | bestaat; pannenkoekenschip **voorstel** voor Deel 4 |
| Kartbaan, Racen | M22 | Tinus | A: de wagen krijgt zijn luik; trekkertrek | bestaat |
| Padel | M05; verwijzing M20 | Sjoerd, Durk en Douwe | B | bestaat |
| Discgolf, pitch and putt | M30 (Golf); pitch and putt Stad | Berend | A: Berend en het Beleg | bestaat |
| Zwembad, skatepark, klimtoren, skiën, wandelen (Buiten) | M08 (Buiten); carillon M24 | Oma | B: samen-uitjes | bestaat; zwembad en skatepark **voorstel**: samen-uitje (zie 3.9) |
| Reuzenrad, botsauto's, kermis, carbid | M16, A2 | Geert | B: de kus | bestaat |
| Fierljep | M10, M20 | Jelle, Durk en Douwe | C | bestaat |
| Duifmodus (en Meeuw te slim af) | M04, M24, M26 | Bert | A, B: de duivenband van Tammo | bestaat; meeuwvariant **voorstel** als bijbaantje van Bert |

### 3.4 Loopbaan, geld en tempo

Loopbaan (negentien vakken, zes niveaus) staat in [LOOPBAAN.md](LOOPBAAN.md); het verhaal geeft alleen de introductie. Het geld volgt [BALANS-21-11.md](BALANS-21-11.md): ongeveer 1.100 euro netto per uur, het verhaal zelf is 24.350 euro in ongeveer 12 uur gemengd spelen.

### 3.5 Boerderij, Bezit en de frietwagen als bedrijf

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Boerderij De Zonnehoek (Hoogkerk), farmen als Tessa | Akte 2: M10, A1; hint "Tessa is boerendochter" | Tessa | A: Tessa's wereld; eigen aardappelen voor de wagen | bestaat; poort `farm` (akte 2) in de branch |
| Panden, winkels, percelen koopbaar, personeel (Bezit) | Akte 3 (poort `bezit`: "Sjabbe: aan de Eems leer je panden beheren. Jelle koopt, wij bouwen") | Sjabbe | C: elk pand dat Jelle koopt is een plakje dat je terugkoopt of omzeilt; A: pand als thuis en verkooppunt | branch (`epic-bezit-21-11`); **tegenstrijdig** met BEZIT §6.6 ("na akte 1"), zie hoofdstuk 6 |
| Productieketen boerderij naar eigen winkel | Deel 4 | Tessa, Willemien | A: de keten | branch; ontwerp |
| Flags `wagen:naam/menu/stek/team/standplaats/keten` | Akte 1 tot en met Deel 4 | het verhaal levert alleen mijlpalen | A | branch (WP13) |
| De snackwagen-dienst (rijdende wagen met wachtrij) | Na M26 | Tessa | A | bestaat (`pg_foodtruck.js`) |

### 3.6 Voetbal

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Voetbalcarrière (Speler, later Trainer en Manager; clubs met parodienamen; velden uit de hele provincie) | Akte 4; hint "In Veendam speelt Tessa met het dorpsteam" | Tammo regelt, Tessa speelt | A: geld en bekendheid voor de wagen; B: Tammo regelt, Tessa speelt; C: de bal is ook Jelles spelregel (wie de bal heeft, zit de jury voor); de koppeling zelf is **voorstel** | gebouwd (main); verhaalpoort in de branch; nog niet in beeld bekeken (VOETBAL-CARRIERE-VERIFICATIE) |
| Penaltyserie, Euroborg-wedstrijd | Los | Tessa (dorpsteam sinds haar zesde) | B: haar verleden | bestaat |

### 3.7 Politie, achtervolging en wapens

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Politie en wanted | M06 (de kraak), M01 (de torenwachter) | de torenwachter ("Ik meld alleen"), Berend (gaat later naar de politie) | C: de politie zoekt twee Stadjers in het zwart | bestaat |
| Wapens en schieten | Geen verhaalplek, bewust | satire zonder getoond geweld; echte wapens alleen in PvP bij Samen spelen (constitution 6) | | bestaat; het verhaal gebruikt ze niet |
| Gokken met spelgeld | Geen verhaalplek | **voorstel:** kermis (Geert, M16) of een tent van Jelle (reclame) | | **voorstel** |

### 3.8 Kleding, interieurs, Spullen en winkels

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Kledingsysteem (twaalf slots, kast per personage, verhaaloutfit, NPC-kleding) | M00 (flatkast), M06 (zwart voor de kraak), later winkel | Rikus' radio-tip of Tessa ("Zo ga je niet naar het Loket", M03) | A: outfit voor de standplaats; B: samen-uitje | branch (`epic-kleding-21-11`); de verhaalplek is **voorstel** |
| Interieurs ("echt binnen") | M03 (Stadhuis), M18 (kantoor en serverkamer), Beppe, Oma's keuken (M25), de flat | de missie zelf | allemaal | bestaat (BINNENSETS); Beppe-kamer en flat bestaan; winkelinterieurs zijn **voorstel** |
| Spullen (menu: voorwerpen, kleding, snacks) | Flat, prop en prikbord | Tessa | A | bestaat; verhaalplek **voorstel**: het prikbord in de flat toont de plakjes |
| Winkels en horeca, snackbar, automaten | M02 (Pand & Poen), M09 (Horeca) | Sjabbe, Geesje | A | bestaat |
| EIKEA en meubels | Optioneel bij M01 | Tammo | A: de flat inrichten | bestaat |

### 3.9 Kaart, gebieden en Ommeland

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Kaart, minikaart, gebiedstoestanden (Veroverd) | Hele verhaal; elke akte opent een regio | de reisbeats | A: de rij loopt tot de Korenbeurs | bestaat |
| Ommeland: Hogeland (akte 2), Eemsdelta en Oldambt (3), Veenkoloniën en Westerwolde (4), Westerkwartier (4 en 5), Loppersum en Bourtange (Deel 4) | Per akte | Oma's vrienden, Berend | C: Jelle jaagt door de provincie; A: standplaatsen | bestaat |
| Dorpen, dorpsuitjes, kerkenpad, geheimen | Los, na de akte van de regio | Rikus (radio), Willemien (Deel 4) | B: samen-uitjes (zie onder) | bestaat; verhaalplek **voorstel** |
| Herkenningspunten, uitkijkpunten, OV-kaart en treinen live | T1 t/m T5 | Tessa, Klaas, Tinus | A | bestaat |
| Samen-uitjes (romantiek als kleine keuzes: ritje, patatje, sterren) | Na overgangsscènes | Tessa en Tammo onderling | B | branch (WP14: `romantiek:*`-flags); optionele uitjes **voorstel** |

### 3.10 Muziek, radio, prestaties, verzamelen

| Onderdeel | Plek | Via | Rode draad | Stand |
|---|---|---|---|---|
| Radio Nachtstreek | Opening en overal | Rikus | alle lijnen; de wereld, nooit de relatie | bestaat |
| Muziek (dag en nacht, stings) | Per scène; M28: Rikus draait één nummer zonder praatje | Rikus | B | bestaat; vervolg in MUZIEK-TE-VRAGEN |
| Prestaties | Per missie een kaart; M26 "Vijf woorden" | het spel | B | bestaat |
| Foto's, fotomodus, geheimen, verzamelen | Los | **voorstel:** Tessa fotografeert de menukaart voor de wagen | A | bestaat; verhaalplek **voorstel** |
| Beppe-huis | Na M01 uitnodiging, eerste bezoek (Tessa ontmoet Beppe), overlijden na M06 of terugval M08, echo's M09, M16, M24 | Tammo | B: "jullie zijn vrienden" | bestaat (BEPPE-HUIS-21-11) |

### 3.11 Stemmen en personages

Elk verhaalpersonage heeft een stem, behalve Beppe (alleen tekst) en Mem (stille appjes en telefoontjes tot haar eerste scène in M20); Rikus, Oma Trijntje, Jelle, Sjabbe, Berend, Durk en Douwe en de bondgenoten hebben een eigen stemkleur. Tessa praat standaard Nederlands, Tammo droog en kort. Door de nieuwe canon (vijf jaar, vierentwintig) moeten vier regels opnieuw worden opgenomen, en de herschrijving per akte vraagt ongeveer driehonderdvijftig nieuwe of aangepaste gesproken regels (VERHAAL-ANALYSE §16). Tot de TTS-ronde zijn nieuwe regels alleen tekst. Spreker en kleur: [personages.md](personages.md).

### 3.12 Onderdelen zonder verhaalplek, met voorstel

| Onderdeel | Waarom nog geen plek | Voorstel |
|---|---|---|
| Krantenwijk, BOA, verhuizing, fietsdepot, Kamerkoning en andere kleine bijbanen | Niet in de hoofdlijn | Sjabbe's klussenlijst of een Nachtstreek-tip van Rikus |
| Zwembad, skatepark, klimtoren, reuzenrad, discgolf | Alleen vrije speelvormen | Samen-uitjes (B-lijn) |
| Brommer, motoren, kopen van voertuigen | Geen scène | Tammo toont de garage in M01; Tinus in akte 4 |
| Kleding en Spullen | Epic-branch, nog geen scène | Tessa: "Zo ga je niet naar het Loket" (M03) als opening van de kledingwinkel |
| Gokken, wapens, PvP | Bewust buiten het verhaal (18+, satire, alleen opt-in bij Samen spelen) | Geen verhaalplek; PvP blijft een eigen keuze |
| Foto's, verzamelen, kerkenpad | Los | Rikus' radio-uitdaging per streek |
| Thuis kiezen na Deel 4 | Model bestaat niet | Flat, wagen of een eigen pand |

## 4. Hoe je het samen beleeft (Samen spelen)

Bronnen: [MULTIPLAYER-VISIE.md](MULTIPLAYER-VISIE.md), [COOP-GAST.md](COOP-GAST.md), [DESIGN-SAMEN-SPELEN.md](DESIGN-SAMEN-SPELEN.md).

**Grondregel.** De wereld, de missies en de voertuigen zijn van wie het spel opende (de host, die wisselen kan); iedereen is gelijkwaardig en het enige hostrecht is spelers verwijderen. Verhaalvoortgang, geld, voertuigen en panden zijn **per speler** (#429): niemand verliest iets en niets telt dubbel.

**Wie speelt als Tammo en Tessa?** Iedereen is lokaal de hoofdpersoon van zijn eigen verhaal (Tammo of Tessa, wat dat verhaal vraagt) en ziet de anderen als hun online-avatar met eigen naam, kleur en kleding. In een sessie met vaste personages (#95) is de host Tammo en de gast Tessa. Twee mensen kunnen dus samen Tammo en Tessa zijn; speelt er maar één mens, dan is de ander een computermetgezel in beeld. De romantiek in de scènes is per speler lokaal, zonder rolverdeling.

**Wat doet een gast?**

| Onderdeel | Gast | Beloning en voortgang |
|---|---|---|
| Hoofdmissie | Meedoen met J of N; wie nee zegt is vrij en kan zelf iets doen (hengelen, pannenkoeken, de beiaard, boeren) | Volledige beloning en eigen verhaalstap per speler; nooit pas aan het einde |
| Cutscene | Scènes met een scènebeschrijving speelt de gast lokaal na; filmpjes zonder script (de dood, de finale, de aftiteling) zijn host-only en gaan als titelkaart met tekstregels naar de gast | Per speler |
| Bijbaan en lichte sim | Meestal lokaal bij de gast (hengelen, bakken, boeren) of een groep op de host (wat een bijbaan vraagt) | Per speler |
| Farmen en voetbal | De wissel naar Tessa is per speler en lokaal; de bonus telt, het model verandert niet | Eigen opslag |
| Beppes huis | Binnenkant lokaal per speler; anderen zien een figuur door de deur gaan | Eigen merken |
| Auto delen, waypoint delen | Een gast stapt bij de host in; eigen voertuigen kunnen mee de wereld in (#449) | Per speler |
| Kleding | Eigen kast; medespelers zien je outfit via een optioneel veld | Per speler |
| Bezit | Elke speler koopt in zijn eigen progress; een zachte claim met de laagste tijd wint | Per speler |
| Voetbal | Een gast speelt zijn eigen figuur in jouw team; elf tegen elf met twee tot vier mensen; geen instap halverwege | Per speler |

**Wat kan samen:** twee spelers als Tammo en Tessa; medespelers die op de boerderij en bij de frietwagen meewerken (Bezit: loon voor de gast, omzet voor de eigenaar); een voetbalteam; auto delen en waypoints delen; wedstrijden tegen elkaar (karts, de Elf Bruggenrace, hengelen, golf); pannenkoeken en bezorgen met verdeelde adressen; veroveren van gebieden. **Later:** pings, emotes en tekstchat of voicechat (#451, opt-in).

**Wat lokaal blijft:** elke speler zijn eigen verhaalstand, kledingkast, loopbaan, visboek, boerderij, bezit, voetbalcarrière en de Beppe-boog. Wie wegvalt of later aansluit: niets te herstellen; geen instap halverwege een race, golfronde of dienst.

**Regel voor elke nieuwe verhaalstap** (AGENTS): is het van de wereld, doet een gast mee, of doet iedereen het lokaal? Elke akte-herschrijving moet die regel in de changelog of het issue zetten.

## 5. Hoe je het solo beleeft

**Speeltempo (ontwerp, geen meting).**

| Deel | Missies | Tijd, alleen hoofdlijn |
|---|---|---|
| Akte 1 | M01 tot en met M06 | ca. 62 min |
| Akte 2 | M07 tot en met M11, T1 en T2 | ca. 55 min |
| Akte 3 | M12 tot en met M16, T3 | ca. 55 min |
| Akte 4 | M17 tot en met M21, T4 | ca. 58 min |
| Akte 5 | M22 tot en met M26 | ca. 47 min |
| Samen akte 1 tot en met 5 | 26 missies | ca. 4 uur 37 (bandbreedte 4:00 tot 5:10) |
| Deel 4 | M27 tot en met M30, T5 | **voorstel:** ca. 30 tot 45 min (DEEL4 geeft geen raming) |

Met bijbanen, reizen en zijwerk komt een gemengde speler eerder uit op ongeveer 12 uur voor het hele verhaal (BALANS-21-11: 40% verhaal, 25% bijbanen, 8% boerderij, de rest racen, eierballen, padel, hengelen en rijden).

**Richtlijn per akte:** speel de hoofdmissies, daarna één bijbaan of minigame per nieuwe wereld die het verhaal net opende (zie 3.2): akte 1 klussen en taxi, akte 2 boerderij en horeca, akte 3 Bezit en kermis, akte 4 voetbal en water, akte 5 racen en de wagen.

**Vrijheid.** De open wereld blijft altijd open: rijden, kaart, winkels, bijbanen die al open zijn. Een **nieuw spel** begint met gesloten werelden (loopbanen, boerderij, Bezit, voetbal) die het verhaal opent in de akte die het personage noemt; een gesloten wereld geeft een zachte hint van dat personage, geen harde muur. **Bestaande saves houden alles** wat al open was (migratieregel: een save zonder poortveld leest als "alles open"). Is het verhaal uit, dan staat alles open. De kalender hangt aan de verhaalstap tot de finale en loopt daarna vrij; het blijft altijd zomer.

**Tussendoor kan altijd:** bijbanen en loopbanen die al open zijn, de Beppe-bezoeken (zolang ze leeft, na M01 tot ze overlijdt na M06 of M08), hengelen, padel, kart, de kermis, het wandelen door de provincie, en de samen-uitjes (voorstel). **Wacht met** wat het verhaal pas later opent: Bezit tot akte 3, voetbal tot akte 4.

## 6. Open punten en risico's (waar de verhaal-lead nog bouwt)

1. **De verhaal-epic staat niet in main.** `epic-verhaal-21-11` heeft WP0 (ruggengraat), WP1 (akte 1), WP2 (overgangsscènes), WP3 en WP4 (akte 2 en 3), WP13 (wagen-flags), WP14 (romantiek als keuzes), de ontgrendelpoort (WP8, nog alleen module en test, niet in menu en kaart aangesloten) en de cutscene-regie. **Nog niet gebouwd:** WP5 (akte 4), WP6 (akte 5 en epiloog), WP7 (Deel 4 koppelen), WP9 (beeld en Electron-verhaaltest), WP10 (stemmen, ca. 350 regels), WP12 (lichte reputatie), WP15 en WP16 (regie en Jelle als eindbaas: handlangers, panden-plakje). Akte 4 en 5 in dit overzicht zijn dus het ontwerp, niet de afgeronde herschrijving.
2. **Bezit is een ontwerp.** `epic-bezit-21-11` bevat BEZIT-21-11 en de verificatie; de spelcode staat in de branch. Tegenstrijd: BEZIT §6.6 ontgrendelt na akte 1 (de "eerste akte" van Notariaat De Zegelhoek), de poort `bezit` staat op akte 3. **Besluit nodig.**
3. **Kleding is een branch** (`epic-kleding-21-11`): het model "kast per personage, huis wisselt mee" wacht op de verhaal-lead (KLEDING §8); winkelpoppetjes en NPC-kleding zijn niet verbonden.
4. **Huisgenoten en verhuizingen.** De canon legt alleen Paddepoel vast; het wisselen van thuis (flat, wagen, pand) is een **voorstel** en heeft nog geen model of scène.
5. **Voetbal botst zacht met de canon:** VOETBAL-CARRIERE-21-11 zegt nog "eerste volwassen baantjes" en "naast zijn eerste baan", terwijl de canon "werkloos, eerste klusjes" zegt. De tekst moet bij de eerstvolgende aanraking worden gelijkgetrokken (VERHAALCANON §2, rij Werk). Nog niet in beeld bekeken: carrière, kindscherm, wedstrijd.
6. **Gesproken regels achter:** vier opnamen (vierentwintig, vijf jaar) wachten op de TTS-ronde (`scripts/voice_wacht.json`); ongeveer 350 nieuwe of aangepaste regels volgen uit WP10. Tot dan tonen regels alleen tekst.
7. **Onzekerheden uit VERHAALCANON §7:** het Groningse "vief" in Tessa's regel; Tessa's verleden (zeven plekken, boerderij tot haar achtste, Stad vanaf haar achttiende) is niet strak; de slogan is voorlopig.
8. **Dieptepunt zwaar:** M20 draagt het beleg, de fierljep, Mems afname, het vasthouden van de bal en de ruzie; bij meer dan vijftien minuten speeltijd is splitsen een optie (00-OVERZICHT §5).
9. **Samen spelen en de romantiek:** de scènes zijn per speler lokaal; een gezamenlijke romantische scène voor twee mensen die samen Tammo en Tessa zijn (met twee echte avatars in beeld) is niet ontworpen. **Voorstel:** lokaal tonen, de ander als avatar op de achtergrond.
10. **Niet in beeld bekeken:** alle nieuwe scènes, Deel 4 (Loppersum en Bourtange), de Beppe-kamer, de voetbalcarrière, de nieuwe kleding. De proefspeler en een Electron-verhaaltest ontbreken voor de herschreven akten.
11. **Overlap met zijmissies:** gevoelige zijmissies (NAM-lijn, Tessa-onveiligheid, Jeugdinstituut) blijven alleen met zorg en akkoord; geen verhaalplek.

## 7. Samenvatting in tien regels

1. Tammo en Tessa (24, net afgestudeerd, werkloos, vijf jaar vrienden sinds de eerste studieweek) willen een frietwagen laten staan: Tessa bakt, Tammo rijdt en zwijgt vijf jaar lang over zijn verliefdheid.
2. De enige vrije standplaats gaat naar de winnaar van de Noordelijke Snackprijs; Jelle Terpstra wint Grunn met regels en trucs om dat te voorkomen en heeft de Gouden Eierbal gestolen.
3. Akte 1 (Stad) leert rijden en klussen en eindigt met de lege vitrine; akte 2 (Noorden) redt Oma's recept en opent de boerderij met Tessa.
4. Akte 3 (Eems) opent Bezit en de wagen krijgt een stek; de kus valt in de botsauto's.
5. Akte 4 (Zuid) opent voetbal en regio-reizen; het beleg van Bourtange en de ruzie zijn het dieptepunt.
6. Akte 5 (Ontzet) is de colonne en de finale als echte wedstrijd: de vijf woorden, Jelle wordt met bureaucratie verslagen, ze worden een stel.
7. Deel 4 (Nazomer) is warm en stil en opent de open wereld: boerderij, panden, voetbal, de frietwagenketen en de provincie.
8. Alle negentien loopbanen, de voertuigen, de lichte sims, Beppes huis en de radio hebben een personage en een moment; kleding, Spullen, gokken, wapens en enkele kleine bijbanen hebben nog geen plek (voorstel in 3.12).
9. Samen spelen: iedereen is lokaal hoofdpersoon (Tammo of Tessa), de wereld is van wie het spel opende, voortgang en beloning zijn per speler en niemand verliest iets.
10. Solo: ongeveer vijf uur hoofdlijn, twaalf uur gemengd; een nieuw spel begint dicht met zachte hints, bestaande saves houden alles; de verhaal-epic bouwt nog akte 4, 5 en Deel 4.
