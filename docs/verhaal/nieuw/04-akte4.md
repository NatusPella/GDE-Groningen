# Akte 4: "Zuidwaarts" (Veenkoloniën en Westerwolde; ma 24 – di 25 augustus, 's nachts naar wo 26)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte4.md](09-script-akte4.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel.

## Intro van de akte

| | |
|---|---|
| **Regio** | Veenkoloniën (Veendam, het Winschoterdiep, Stadskanaal), Westerwolde (Ter Apel-bos en heide, Vesting Bourtange) |
| **Sfeer** | kanalen met bruggen, strakke akkers, stille wegen, daarna heide en bos; Bourtange bij schemer en nacht met fakkels en kartonnen kanonnen. Het is zomer; het is druk van de oefening voor Gronings Ontzet. Ter Apel zelf komt niet voor, ook niet als decor (constitutie: geen asielopvang als decor of grap) |
| **Tijd** | ca. 60-65 minuten (6 missies) |
| **Dagen** | ma 24 (4.1, 4.2, 4.3), di 25 (4.4 overdag, 4.5 's avonds, 4.6 's nachts) |
| **Wat de speler leert** | bruggen op tijd, een kantoor als speelveld, een rijdende trein, een bus met tijdstippen, een beleg, fierljeppen als slapstick, een achtervolging met een trein |
| **Plot** | De mosterd wordt gered (plakje zeven). Het spoor via Wiebelwerk leidt nergens heen, maar het logboek van 12 augustus toont een pas en een gast ("T" en "G"). De laatste juryleden worden van Jelles trein gehaald. In Bourtange blijkt dat **de J op het kaartje niet van Jelle is maar van zijn moeder: Mem Terpstra tekent al zijn hele leven met een J, en zij en Oma Trijntje hebben de bal zelf uit het museum gehaald**, met Berends bakkie. Dan breekt het dieptepunt los. |
| **Romantiek** | na de kus: ongemak, ontwijken, mooie momenten en pijnlijke. Het dieptepunt (4.5): Tammo ontdekt dat Tessa al weken met Mem appte en dat voor hem verzweeg. "Jij zegt nooit iets!" van beide kanten. Tessa vertrekt alleen. |
| **Haak naar akte 5** | Tessa achterna in de trein; Tammo staat al bij de overweg. De bal is bij Jelle, de Escapade ligt op een wagon, de jury is bij Berend. |

**Dieptepunt (vlak voor de finale, 4.5-4.6):** Jelle heeft de echte bal. De Escapade is weg (en dus de Fjord Frituur, de wagen waarmee ze moeten inschrijven). Tessa en Tammo hebben ruzie. Alle ingrediënten zijn binnen, maar niemand weet of er nog een finale is. De zin "Jij zegt nooit iets" is van allebei.

**Reisplan akte 4** (afstanden geschat, AANNAME):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Winschoten (einde 3.6) | Veendam | 17 | 13 min | streekbus (2 min in beeld) |
| Veendam centrum | Wiebelwerk (4.2) | 2 | e-step 2 min | te voet |
| Wiebelwerk | Stadskanaal (4.3) | 20 | 15 min | museumtrein-station: skip met taxi |
| Stadskanaal | Ter Apel-bos (4.4) | 22 | 18 min | Berends bus haalt je op |
| Ter Apel-bos | Bourtange | 12 | de bus-missie zelf (4.4), 12 min | geen |
| Bourtange | Zuidhorn (4.6) | 65 | 45 min | Berends bakkie, ride-along, 3 min autogesprek |

---

## 4.1 · Open, dicht (nieuw)

| | |
|---|---|
| **Id** | `A4-1` (nieuw, step `n-bruggen`) |
| **Plaats** | Veendam, het Winschoterdiep, ma 24 's ochtends |
| **Voertuig** | sloep (`BOAT_KINDS.sloep`, speedboat optioneel) |
| **Mechaniek / hergebruik** | `pg_bruggenrace.js` en `movablebridges.js`: elf bruggen, ritme-open/dicht; Wubbo bedient de bruggen (stem en HUD) |
| **Doel (hardop)** | "Vaar door elf bruggen voor Jelles mosterdschip, zodat de mosterd naar Oma gaat en niet naar Jelle." |
| **Motief** | de vijfde ingrediënt, grove mosterd, stond bij Jelle (plakje zeven); Wubbo kan de bruggen alleen openen als jij hem zegt wanneer |
| **Wat de speler weet** | Durks "Baas gaat naar Veendam" |
| **Verloop** | 1) Wubbo (naamkaart) bij de brug. 2) Race tegen Jelles mosterdschip. 3) Bruggen gaan open en dicht op het ritme van de fanfare. 4) Het schip zit vast. **Falen:** brug te laat of schip eerder: "Sikkom." |
| **Leuk-element / uitdaging** | timing in plaats van snelheid; leert de bruggen van Veendam te lezen |
| **Reizen** | Winschoten naar Veendam 17 km: bus (2 min in beeld) of auto 13 min |
| **Romantiek (5/10)** | Tammo: "Over gisteren." Tessa: "Welk gisteren?" Tammo: "Dat bedoelde ik ook." |
| **Plot** | het mosterdschip loopt vast; Wubbo geeft de mosterd |
| **Gevolg / haak** | Wubbo: "Er is een webbureau dat alles om middernacht bijwerkt. Ook mijn bruggen." Tammo: "Om middernacht. Net als de camera's van het museum." |
| **Behouden / nieuw** | NIEUW (op "Dat bedoelde ik ook." en "Plons." na) |
| **Nieuwe regels (schatting)** | 20 |

**Openingsdialoog (brug in Veendam, 9 regels):**

- **WUBBO:** Ik ben Wubbo, brugwachter. Open of dicht. Nooit allebei. Oma Trijntje belde. [NIEUW]
- **TESSA:** Jelle heeft een mosterdschip. Dat moet door elf van jouw bruggen. [NIEUW]
- **WUBBO:** Elf bruggen, en ik bedien ze allemaal. Jullie zeggen wanneer, ik draai. [NIEUW]
- **TAMMO:** Hoe weten we wanneer? [NIEUW]
- **WUBBO:** Op het ritme van de fanfare. Die speelt vanmorgen toevallig. [NIEUW]
- **TESSA:** Dan zijn we eerst. [NIEUW]
- **WUBBO:** Eén ding: niet harder dan de bruggen. Een brug is niet te overtuigen. [NIEUW]
- **TAMMO:** Hij luistert niet. [NIEUW]
- **WUBBO:** Brug luistert wel. Alleen niet naar jou. [NIEUW]

**Sleutelscène (in het diep):**

- **WUBBO (radio):** Brug acht. Open. Nu. [NIEUW]
- **TESSA:** Rechtdoor, Tammo. [NIEUW]
- **TAMMO:** Ik zie alleen een brug. [NIEUW]
- **TESSA:** Dat is ook de bedoeling. [NIEUW]
- **WUBBO (radio):** Het schip zit vast. Plons. [NIEUW]

> **Te beoordelen.** A) Bruggenrace voor de mosterd (voorstel, `pg_bruggenrace.js` bestaat). B) Een achtervolging per auto langs de kanaalwijken (veel meer actie, minder variatie). C) Alleen een gesprek met Wubbo, de mosterd krijg je gratis (goedkoper).

---

## 4.2 · Wie draaide de camera's uit? (nieuw)

| | |
|---|---|
| **Id** | `A4-2` (nieuw, step `n-wiebelwerk`) |
| **Plaats** | Wiebelwerk, een verzonnen webbureau in een kantoorpand in Veendam |
| **Voertuig** | e-step (`scooter`) |
| **Mechaniek / hergebruik** | kantoorgesprek met keuzes (`choicepanel.js`), een balie en een server-kamer (`heist.js` `updateLock`); loketketen als in 1.4 |
| **Doel (hardop)** | "Zoek uit of Wiebelwerk de camera's van het museum uitzette en kijk in de logboeken." |
| **Motief** | Tammo gelooft dat wie de camera's uitzet ook weet wie de bal heeft; Wubbo zei dat ze alles om middernacht bijwerken; Tessa laat hem gaan (om hem af te leiden) |
| **Wat de speler weet** | de camera's gingen om middernacht uit voor een update, sinds 2019 |
| **Verloop** | 1) Binnen bij Wiebelwerk als "klant". 2) Accountmanager overtuigen met het juiste antwoord (keuzepaneel). 3) Servers: het logboek. 4) De drie minuten van 12 augustus: een zijdeur is met een bruikleenpas geopend, pasnummer 1953, houder "T."; een gast: "G." Dat is vijf dagen vóór hun eigen kraak 5) Weg voor het kantoor sluit. **Falen:** de accountmanager ziet je: "Sikkom." |
| **Leuk-element / uitdaging** | geen actie: een dialoog-puzzel; de grap is het bureau zelf ("Wij zijn alleen een webbureau.") |
| **Reizen** | 2 km: e-step 2 min |
| **Romantiek (5/10)** | Tessa legt Tammo uit wat een logboek is; hij baalt dat ze gelijk heeft; ze vindt het leuk dat hij het wil weten |
| **Plot** | het is niet Wiebelwerk; maar een pas "1953, T." en een gast "G.", op 12 augustus: de bal was al weg voor zij kwamen; Tammo: "T en G." Tessa: "Dat zijn een heleboel letters." |
| **Gevolg / haak** | Tessa doet alsof ze niks snapt; haar telefoon: "Ze zoeken je. Kom naar Bourtange. – M." (stil) |
| **Behouden / nieuw** | NIEUW |
| **Nieuwe regels (schatting)** | 24 |

**Openingsdialoog (balie, 8 regels):**

- **TAMMO:** Wiebelwerk. Ze werken alles om middernacht bij. Ook de camera's van het museum. [NIEUW]
- **TESSA:** Dat is toch geen misdaad? [NIEUW]
- **TAMMO:** Het is verdacht. Wie zet er drie minuten alle camera's uit? [NIEUW]
- **TESSA:** Een webbureau, Tammo. [NIEUW]
- **ACCOUNTMANAGER:** Welkom bij Wiebelwerk. Wij maken websites. Wat is uw behoefte? [NIEUW]
- **TESSA:** Een website voor een frietwagen. [NIEUW]
- **ACCOUNTMANAGER:** Prachtig. Dan beginnen we met een intake. [NIEUW]

**Sleutelscène (de servers):**

- **TAMMO:** Hier staat de update. Om 00:00. Drie minuten. [NIEUW]
- **TESSA:** En daar staat: zijdeur, 00:01, pas 1953. Houder: T. [NIEUW]
- **TAMMO:** Een T. [NIEUW]
- **TESSA:** Een bewaarder. Dat staat erbij. [NIEUW]
- **TAMMO:** En daaronder: gast, G. [NIEUW]
- **TESSA:** …Dat zijn een heleboel letters. [NIEUW]
- **TAMMO:** Dat is het alfabet, Tessa. [NIEUW]
- **TESSA:** En kijk naar de datum. Twaalf augustus. [NIEUW]
- **TAMMO:** Dat is vijf dagen vóór ons. De bal was al weg. [NIEUW]
- **TESSA:** We moeten weg. [NIEUW]

> **Te beoordelen.** A) Wiebelwerk als komische valse piste (voorstel; de eigen grap van de eigenaar, wel een extra missie). B) Wiebelwerk alleen als bijrol in 1.4 (Het Loket). C) De pas en de gast komen direct uit het museum (geen valse piste, korter).

---

## 4.3 · Stoom (nieuw)

| | |
|---|---|
| **Id** | `A4-3` (nieuw, step `n-stoom`) |
| **Plaats** | museumstoomtrein bij Stadskanaal, door de bossen naar Veendam, ma 24 's middags |
| **Voertuig** | trein (Tammo machinist, `traindrive.js`) |
| **Mechaniek / hergebruik** | `traindrive.js` (rijden met gas en rem) en `fjordtrain.js` voor de wagon met de Escapade (zoals in H16); Tessa loopt door de wagons (AANNAME: lopen op een rijdende trein vraagt kleine code, anders alleen een scène) |
| **Doel (hardop)** | "Haal de laatste twee juryleden uit Jelles stoomtrein voor die Veendam bereikt." |
| **Motief** | plakje zes: de laatste twee juryleden zitten in Jelles salonrijtuig voor een gratis proeverij |
| **Wat de speler weet** | drie juryleden liepen al weg (3.5) |
| **Verloop** | 1) Tammo klimt in de cabine, Tessa in de wagon. 2) Stoom opbouwen, rem losgooien. 3) Tessa loopt door de wagons, Durk en Douwe zijn de kelners. 4) De juryleden stappen op een perron uit. **Falen:** de trein rijdt door het station: "Sikkom." |
| **Leuk-element / uitdaging** | de eerste en enige keer dat Tammo een trein bestuurt; grote actie met een kleine afstand |
| **Reizen** | Veendam naar Stadskanaal 20 km: 15 min met de auto |
| **Romantiek (4/10)** | "Je rijdt als een fietser met een deadline." "Ik rijd een trein." "Dat is hetzelfde." |
| **Plot** | de jury is bevrijd; de enige jury die overblijft is Berend; Jelles salonrijtuig is leeg |
| **Gevolg / haak** | Berend belt: "Ik heb een bus nodig voor het Beleg. Kom naar Ter Apel." |
| **Behouden / nieuw** | NIEUW (op "Dat bedoelde ik ook." na) |
| **Nieuwe regels (schatting)** | 16 |

**Openingsdialoog (perron Stadskanaal, 8 regels):**

- **TESSA:** De laatste twee juryleden zitten in Jelles salonrijtuig. Dat is de trein die daar staat. [NIEUW]
- **TAMMO:** Dat is een museumtrein. [NIEUW]
- **TESSA:** Dat is een stoomtrein met een gratis proeverij. [NIEUW]
- **TAMMO:** Ik heb nog nooit een trein bestuurd. [NIEUW]
- **TESSA:** Je hebt een fiets bestuurd. [NIEUW]
- **TAMMO:** Dat is vergelijkbaar. [NIEUW]
- **TESSA:** Dan rijd jij hem, ik haal de juryleden. [NIEUW]
- **DURK:** Douwe. Het is de baas niet. [NIEUW]

**Sleutelscène (in de wagon):**

- **TESSA:** Meneer de jurylid, wilt u nog een eierbal? [NIEUW]
- **JURYLID:** Heerlijk. Wie is die mevrouw? [NIEUW]
- **TESSA:** Dat is geen eierbal, dat is een boodschap: Jelle koopt u. [NIEUW]
- **JURYLID:** Dat is toch niet waar. [NIEUW]
- **DOUWE:** …Hè. [BEHOUDEN]
- **TESSA:** Het perron komt eraan. Stap maar uit. [NIEUW]

> **Te beoordelen.** A) Trein besturen, Tessa door de wagons (voorstel; spectaculair, kleine kans op code-risico). B) Alleen de scène, geen gameplay in de wagons. C) Een achtervolging per auto langs de spoorlijn (sneller te bouwen).

---

## 4.4 · De vestingbus (nieuw)

| | |
|---|---|
| **Id** | `A4-4` (nieuw, step `n-vestingbus`) |
| **Plaats** | Ter Apel-bos naar Vesting Bourtange (de heide, het bos), di 25 overdag |
| **Voertuig** | oude bus (`bus`, museumbus-lak) |
| **Mechaniek / hergebruik** | `sidejob_bus.js` (haltes, punctualiteit), `BUS_MODELS` in `vehicle.js`; Jelles trekker-limo als hindernis (`escape`) |
| **Doel (hardop)** | "Breng Berends veertig re-enactors met hun kartonnen kanonnen op tijd bij Vesting Bourtange." |
| **Motief** | het Beleg van Bourtange is Berends oefening voor het Ontzet; zijn bus is kapot; hij kent Mem en Oma (hij weet meer dan hij zegt) |
| **Wat de speler weet** | de bal zit niet bij Jelle; een T en een G |
| **Verloop** | 1) Berend bij de bus (herintroductie, kort). 2) Drie haltes in het bos. 3) De limo blokkeert de weg. 4) Aankomst bij de vesting, op tijd (stiptheid telt). **Falen:** te laat of passagiers boos: "Sikkom." |
| **Leuk-element / uitdaging** | de eerste keer dat je een bus echt bestuurt; de hindernis is de limo |
| **Reizen** | Ter Apel-bos naar Bourtange 12 km: de missie zelf, 12 min; skip: Berend neemt je mee |
| **Romantiek (4/10)** | Tessa zit naast hem, praat weinig; Tammo praat te veel; ze zeggen allebei "Moi" te zacht |
| **Plot** | Rikus: "Tammo en Tessa rijden vandaag naar Bourtange. Ik zeg niks." (radio, per ongeluk). Berend: "Ik heb niks gezien. Ik ben belegeraar, geen getuige." |
| **Gevolg / haak** | het Beleg begint 's avonds; Jelle hoort de radio. |
| **Behouden / nieuw** | Berend: "Wat mout, dat mout." BEHOUDEN; de rest NIEUW |
| **Nieuwe regels (schatting)** | 18 |

**Openingsdialoog (bus, 9 regels):**

- **BEREND:** Goidag. Ik heb veertig man, vijftien kanonnen van karton, en een bus die niet start. [NIEUW]
- **TESSA:** Wij rijden. Ter Apel-bos naar de vesting. [NIEUW]
- **BEREND:** Op tijd. Het Beleg begint om negen uur. Ik ben de bisschop. [NIEUW]
- **TAMMO:** Je valt de vesting aan. [NIEUW]
- **BEREND:** Elk jaar. En elk jaar verlies ik. Wat mout, dat mout. [NIEUW]
- **TESSA:** Waarom oefenen jullie in Bourtange? [NIEUW]
- **BEREND:** Omdat Grunn te klein is voor een echt beleg. Ik heb een vriendin in de vesting. [NIEUW]
- **TAMMO:** Een vriendin? [NIEUW]
- **BEREND:** Kom mor. Rijden. [NIEUW]
- **TINUS:** Ik ben Tinus. Ik beleg mee. Mijn trekker staat thuis, in het Westerkwartier. [NIEUW]

**Sleutelscène (onderweg):**

- **RIKUS (radio):** Een luisteraar meldt dat Tammo en Tessa vandaag naar Bourtange rijden. Ik zeg niks. [NIEUW]
- **TESSA:** Hij zegt niks. [NIEUW]
- **TAMMO:** Zo zegt hij het altijd. [NIEUW]
- **BEREND:** Ik heb niks gezien. Ik ben belegeraar, geen getuige. [NIEUW]

> **Te beoordelen.** A) Bus met Berends re-enactors (voorstel; veel kleine grappen in één rit). B) Berend rijdt zelf, jullie zijn alleen passagiers (goedkoper, minder variatie). C) De bus is van het busmuseum uit 06 (past bij dat idee).

---

## 4.5 · Het beleg van Bourtange (het dieptepunt, deel 1)

| | |
|---|---|
| **Id** | `A4-5` (nieuw, step `n-beleg`) |
| **Plaats** | Vesting Bourtange: wallen, gracht, kruitkelder, di 25 's avonds en 's nachts |
| **Voertuig** | te voet; fierljepstok (`fierljep.js`) |
| **Mechaniek / hergebruik** | `hold`-stage en `blast` (kartonnen kanonnen, `missions.js`), `fierljep.js` (de duel met Durk en Douwe), scènes in de kruitkelder; geen doden, alleen toneel |
| **Doel (hardop)** | "Houd de vesting tegen Jelles beleggers, en spring over de gracht voor Durk en Douwe." |
| **Motief** | het Beleg moet slagen; Tessa heeft een afspraak in de kruitkelder; Durk en Douwe houden Tammo bezig |
| **Wat de speler weet** | de pas T, de gast G, het appje: "Ze zoeken je." |
| **Verloop** | 1) Het Beleg: verdedig de wallen met Berends mensen (kartonnen kanon, ophaalbrug). 2) Durk en Douwe dagen Tammo uit: fierljepen over de gracht; hij valt erin. 3) Tessa gaat naar de kruitkelder. 4) Tammo komt druipend binnen: Mem, Oma en de bal. 5) Jelle komt binnen, Mem geeft hem de bal. 6) Jelle gaat. Durk en Douwe rijden met de Escapade weg. **Falen:** de vesting valt: je herstart het beleg; het dieptepunt zelf is niet te falen. |
| **Leuk-element / uitdaging** | het hoogtepunt van de komische actie: kartonnen kanonnen en fierljepen, dan een stille, pijnlijke scène |
| **Reizen** | de missie zelf |
| **Romantiek (3/10, het dieptepunt)** | Tammo: "Jij kende Mem." Tessa: "Ze vroeg me Jelle bezig te houden. Ik wist niet waarom." Tammo: "Je zegt nooit iets." Tessa: "Jij zegt nooit iets!" |
| **Plot** | **De J is Mems J.** Oma: "Elk jaar op 12 augustus poets ik de bal. Dit jaar kwam Gerda mee. Berend reed." Tessa: "Dat is niet de J van Jelle." Mem: "Dat is mijn J. Ik teken er al zijn verjaardagskaarten mee." Tessa herkent het van Mems keukentafel in Ljouwert: alleen een moeder schrijft "Tige tank" zo. Jelle komt, Mem: "Jij zei op de radio dat je hem had." Jelle: "Dat was voor de show, mem." Mem geeft hem de bal: "Hier. Nu stop je." Jelle: "Ik moet hem winnen, mem." Hij gaat. |
| **Gevolg / haak** | de bal is bij Jelle, de Escapade is weg, Tessa vertrekt met Berend; Tammo blijft bij Oma en Mem. |
| **Behouden / nieuw** | alles NIEUW (tekst); "Net fertelle" en "Hè." BEHOUDEN |
| **Nieuwe regels (schatting)** | 38 |

**Openingsdialoog (de wallen, 9 regels):**

- **BEREND:** Het Beleg van Bourtange. De vesting is van ons. [NIEUW]
- **TAMMO:** Wie valt aan? [NIEUW]
- **BEREND:** Ik, met veertig man en een paard van karton. [NIEUW]
- **TESSA:** En Jelle? [NIEUW]
- **BEREND:** Jelle is geen bisschop. Hij komt met zijn limo. [NIEUW]
- **DURK:** Tammo. Wij dagen je uit. Fierljep. [NIEUW]
- **DOUWE:** …fierljep. [NIEUW]
- **TAMMO:** Dat is een ding voor Friezen. [NIEUW]
- **DURK:** Net fertelle, hè? [BEHOUDEN]

**Sleutelscène (de kruitkelder):**

- **OMA TRIJNTJE:** Elk jaar op twaalf augustus poets ik de bal. Dit jaar kwam Gerda mee. [NIEUW]
- **TAMMO:** Gerda? [NIEUW]
- **MEM:** Gerda Terpstra. De moeder van Jelle. [NIEUW]
- **OMA TRIJNTJE:** Wij hebben hem gehaald. Berend reed. [NIEUW]
- **BEREND:** Nul krassen. Op de heenweg. [NIEUW]
- **TAMMO:** Dan heeft Jelle hem nooit gehad. [NIEUW]
- **TESSA:** "Tige tank! – J." Dat is niet de J van Jelle. [NIEUW]
- **MEM:** Dat is mijn J. Ik teken er al sinds zijn eerste verjaardag al zijn kaarten mee. [NIEUW]
- **TESSA:** Ik zag ze elke zomer op uw keukentafel in Ljouwert. Alleen een moeder schrijft "Tige tank" zo. [NIEUW]
- **TAMMO:** Jullie hebben ons een museum laten kraken dat al leeg was? [NIEUW]
- **OMA TRIJNTJE:** Jullie waren al onderweg. Rikus praat, jong. Wij waren je voor. [NIEUW]
- **TAMMO:** Tessa. Jij kende Mem. [NIEUW]
- **TESSA:** Ze vroeg me Jelle bezig te houden en niks te zeggen. Ik wist niet waarom. [NIEUW]
- **TAMMO:** Je zegt nooit iets. [NIEUW]
- **TESSA:** Jij zegt nooit iets! [NIEUW]

> **Te beoordelen.** A) De grannies hebben de bal (voorstel; het grote verrassingselement, vraagt zorgvuldig toon: satire, geen leed). B) Berend heeft hem (hij is een "bewaarder", minder lief). C) Niemand: de bal was nooit weg (ik raad af: de kraak heeft dan geen gevolg).

---

## 4.6 · Iedereen heeft een rode auto gezien (H16)

| | |
|---|---|
| **Id** | `A4-6` (`H16`, mission `fjord`, verplaatst en aangepast) |
| **Plaats** | Bourtange naar het Westerkwartier (de spoorlijn Zuidhorn-Grijpskerk), di 25 's nachts |
| **Voertuig** | Berends bakkie (ride-along), Tessa solo, de Escapade op een wagon (`fjordtrain.js`) |
| **Mechaniek / hergebruik** | `train`-stage (`fjordtrain.js`: `spawnFjordTrain`, `catchFjordTrainNow`), Henks zender (het piepje, `gps`/`heistSpotAt`), `solo: true`; bestaande def, nieuw is de locatie (de overweg bij Zuidhorn, zoals in de FLOW-ANALYSE) |
| **Doel (hardop)** | "Haal de Escapade terug van de trein naar Ljouwert, voor de trein de provinciegrens over is." |
| **Motief** | zonder de Escapade geen Fjord Frituur en geen inschrijving; Durk en Douwe hebben hem op een wagon gezet |
| **Wat de speler weet** | Jelle heeft de bal, de Escapade is weg, Tammo en zij hebben ruzie |
| **Verloop** | 1) Tessa en Berend rijden terug (autogesprek, 3 min). 2) Het piepje van Henks zender: de trein. 3) Je rijdt langs de rails, haalt de trein in, springt op de wagon. 4) Escapade losmaken, afrijden. **Falen:** de trein ontsnapt: "Sikkom." |
| **Leuk-element / uitdaging** | de enige solo-missie; een trein achterna, het bekende H16 in een nieuwe regio |
| **Reizen** | Bourtange naar Zuidhorn 65 km: bakkie ride-along (3 min autogesprek) |
| **Romantiek (3/10 → 6/10)** | Tessa rijdt boos weg; in de bakkie praat Berend ongevraagd: "Je zoekt iemand die blijft." Tammo, bij de overweg: "Sorry. Dat ik nooit wat zeg." |
| **Plot** | Mem belt in op de radio (BEHOUDEN, aangepast): "Rikus. Gerda Terpstra. Mijn zoon heeft die rode auto op de trein nei Ljouwert set. Perron 3." |
| **Gevolg / haak** | Tammo staat al bij de overweg met Tinus' trekker. De Escapade is terug. Ze zijn nog niet vrienden, maar het begin is er. |
| **Behouden / nieuw** | het merendeel van de outro BEHOUDEN; nieuwe autoscène met Berend |
| **Nieuwe regels (schatting)** | 22 |

**Openingsdialoog (in Berends bakkie, 9 regels):**

- **BEREND:** Moi. [BEHOUDEN]
- **TESSA:** Goidag, Berend. [BEHOUDEN]
- **BEREND:** Je rijdt niet, ik rijd. Jij kijkt naar je telefoon. [NIEUW]
- **TESSA:** Het piepje van Henks zender staat bij Zuidhorn. Sneller. [NIEUW]
- **BEREND:** Ik rij nooit sneller dan negentig. [NIEUW]
- **TESSA:** Dan rij je nu honderd. [NIEUW]
- **BEREND:** Je zoekt iemand die blijft. [NIEUW]
- **TESSA:** …Dat is een bijzondere zin, Berend. [NIEUW]
- **BEREND:** Ik zeg niks. [BEHOUDEN]

**Sleutelscène (de overweg, outro):**

- **MEM (radio):** Rikus. Gerda Terpstra, Ljouwert. Myn soan hat dy reade auto op de trein nei Ljouwert set. Zeg tegen dat famke: perron 3. [BEHOUDEN]
- **TESSA:** Hoe wist jij dat hij hier was? [BEHOUDEN]
- **TAMMO:** Ik luisterde naar Rikus. Tinus, van de bus, gaf me een lift op zijn trekker. Wind tegen. [NIEUW]
- **TESSA:** Beide kanten op. [BEHOUDEN]
- **TAMMO:** Sorry. Dat ik nooit wat zeg. [BEHOUDEN]
- **TESSA:** Je zei net iets. [BEHOUDEN]
- **TAMMO:** Het voelde raar. [BEHOUDEN]
- **TESSA:** Het klonk goed. [BEHOUDEN]

> **Te beoordelen.** A) H16 in het Westerkwartier, Tessa solo (voorstel; bestaande def met nieuwe plek). B) Terug naar het Stads-station (minder reizen, geen provincie). C) Tammo speelt ook mee (geen solo meer, meer samen, minder dieptepunt).
