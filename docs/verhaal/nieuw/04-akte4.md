# Akte 4: "Zuidwaarts" (Veenkoloniën en Westerwolde; ma 24 – di 25 augustus, 's nachts naar wo 26)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte4.md](09-script-akte4.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel. Functies: (1) inschrijving of financiering, (2) een plakje van Jelle blokkeren, (3) de waarheid over de bal ontdekken, (4) de Fjord Frituur en het recept gereedmaken.

## Intro van de akte

| | |
|---|---|
| **Regio** | Veenkoloniën (Veendam, het Winschoterdiep, Stadskanaal), Westerwolde (Ter Apel-bos en heide, Vesting Bourtange), daarna het Westerkwartier (Zuidhorn) |
| **Sfeer** | kanalen met bruggen, strakke akkers, stille wegen, daarna heide en bos; Bourtange bij schemer en nacht met fakkels en kartonnen kanonnen. Het is zomer; het is druk van de oefening voor Gronings Ontzet. Ter Apel zelf komt niet voor, ook niet als decor (constitutie: geen asielopvang als decor of grap) |
| **Tijd** | ca. 58 minuten (5 missies + 1 reisbeat) |
| **Dagen** | zo 23 (rustdag, reis), ma 24 (4.1, 4.2, 4.3), di 25 (reisbeat bus in de vroege avond, 4.4 's avonds, 4.5 's nachts), wo 26 (de vrienden bij Tinus' schuur, begin van akte 5) |
| **Wat de speler leert** | bruggen op tijd, een kantoor als speelveld, een rijdende trein (licht uitgevoerd), een bus met tijdstippen, een beleg, fierljeppen als slapstick, twee solomissies tegelijk |
| **Plot** | De mosterd wordt gered (plakje zeven), maar de fanfare wordt weggekocht. Het logboek van Wiebelwerk bewijst dat **Jelle de bal al op 12 augustus nam**, met een omgekochte bewaker en zijn tweeling, en dat de pas van de Bewaarder (mevrouw Tuinstra) werd geblokkeerd. Jelle kocht de machinist van de museumtrein: de jury en de Bewaarder zitten er vier uur vast; één jurylid wordt bevrijd, één blijft **definitief bij Jelle**, de Bewaarder weigert uit te stappen (zij is "verhinderd tot na het Ontzet", artikel 9). In Bourtange **neemt Mem de bal van Jelle af**, met Oma en Berend; Jelle stuurt zijn beleggers; de speler houdt de bal vast en ontsnapt ermee. Dan breekt het dieptepunt los, en het duurt langer: twee solodelen. |
| **Romantiek** | na de kus: ongemak, ontwijken ("Over zaterdag." "Welke zaterdag?"), mooie momenten en pijnlijke. Het dieptepunt (4.4): Tammo ontdekt dat Tessa al weken met Mem appte en dat voor hem verzweeg. Tessa: "Ik kan niet weten wat je verwacht als je niets zegt." Zij vertrekt met de bal, hij blijft. |
| **Haak naar akte 5** | Tessa redt de auto en verliest de bal; Tammo faalt bij het bijeen houden van de vrienden; ze zijn nog niet vrienden, maar beiden gaan naar Tinus' schuur. |

**Dieptepunt (4.4-4.5):** Jelle heeft de echte bal terug. De Escapade is weg (en dus de Fjord Frituur, de wagen waarmee ze moeten inschrijven). Tessa en Tammo hebben ruzie en gaan elk hun eigen weg, tot het eind van 5.1 (de knuffel). De zin "Jij zegt nooit iets" is van allebei.

**Jelle grijpt in (mechanisch gevolg):** 4.1 koopt de fanfare weg (het ritme verdwijnt, Wubbo fluit); 4.3 koopt de machinist (de trein staat stil); 4.4 stuurt beleggers tegen de kruitkelder, steelt de Escapade (klomp met briefje); 4.5 pakt de bal van Tessa in het dubbele dilemma op de wagon.

**Reisplan akte 4** (afstanden geschat, AANNAME):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Winschoten (zo 23, rustdag) | Veendam | 17 | 13 min | streekbus (2 min in beeld) |
| Veendam centrum | Wiebelwerk (4.2) | 2 | e-step 2 min | te voet |
| Wiebelwerk | Stadskanaal (4.3) | 20 | 15 min | museumtrein-station: skip met taxi |
| Stadskanaal | Ter Apel-bos | 22 | 18 min | Berends bus haalt je op |
| Ter Apel-bos | Bourtange (reisbeat) | 12 | de busrit zelf, vertrek 20:15, aankomst 20:59 | meerijden of skippen |
| Bourtange | Zuidhorn (4.5) | 65 | 45 min (23:15 - 00:00) | Berends bakkie |
| Zuidhorn | Tinus' schuur | 3 | 3 min | te voet |

---

## 4.1 · Open, dicht (M17; nieuw)

| | |
|---|---|
| **Id** | `A4-1` (nieuw, step `n-bruggen`) |
| **Functie** | **2 · plakje zeven (mosterd) blokkeren** |
| **Plaats** | Veendam, het Winschoterdiep, ma 24 's ochtends |
| **Voertuig** | sloep (`BOAT_KINDS.sloep`) |
| **Mechaniek / hergebruik** | `pg_bruggenrace.js` en `movablebridges.js`: elf bruggen, ritme-open/dicht; Wubbo bedient de bruggen (stem en HUD) |
| **Doel (hardop)** | "Vaar door elf bruggen voor Jelles mosterdschip, zodat de mosterd naar Oma gaat en niet naar Jelle." |
| **Motief** | de grove mosterd stond bij Jelle (plakje zeven); Wubbo kan de bruggen alleen openen op het ritme van de fanfare, en de speler moet de maat houden |
| **Verloop** | 1) Wubbo (naamkaart): "Elf bruggen. Ik open ze op het ritme van de fanfare. Mis je de maat, dan wacht je." 2) **Jelle koopt de fanfare weg** voor zijn optocht: het ritme valt weg, Wubbo fluit (één keer open, twee keer dicht). 3) Race tegen Jelles mosterdschip. 4) Brug elf: de limo staat aan de overkant, de brug draait niet voor een limo. **Falen:** brug te laat of schip eerder: "Sikkom." |
| **Jelle grijpt in** | **koopt de fanfare weg**: het ritme van de race verandert halverwege |
| **Romantiek (5/10)** | Tammo: "Over zaterdag." Tessa: "Welke zaterdag?" |
| **Plot** | het mosterdschip loopt vast; Wubbo geeft de mosterd; de limo met de koffer staat aan de overkant |
| **Gevolg / haak** | Wubbo: "Er is een webbureau dat alles om middernacht bijwerkt. Ook mijn bruggen." |
| **Behouden / nieuw** | alles NIEUW |

> **Te beoordelen.** A) Bruggenrace voor de mosterd (voorstel). B) Een achtervolging per auto langs de kanaalwijken. C) Alleen een gesprek met Wubbo.

---

## 4.2 · Wie draaide de camera's uit? (M18; nieuw)

| | |
|---|---|
| **Id** | `A4-2` (nieuw, step `n-wiebelwerk`) |
| **Functie** | **3 · de waarheid over de bal ontdekken**: het bewijs dat Jelle de bal vóór hen nam, en wie hem hielp |
| **Plaats** | Wiebelwerk, een verzonnen webbureau in een kantoorpand in Veendam (de eigenaars knipoog) |
| **Voertuig** | e-step (`scooter`) |
| **Mechaniek / hergebruik** | kantoorgesprek met keuzes (`choicepanel.js`), een balie en een server-kamer (`heist.js` `updateLock`); loketketen als in 1.3 |
| **Doel (hardop)** | "Zoek uit wie de camera's van het museum langer uitzette, en kijk in het logboek van 12 augustus." |
| **Motief** | Tammo gelooft dat wie de camera's uitzet, de bal eerder heeft; Wubbo zei dat ze alles om middernacht bijwerken |
| **Verloop** | 1) Binnen bij Wiebelwerk als "klant"; Sjabbe belt: "Daar liet ik mijn website maken. Hij is nog steeds in aanbouw." 2) Accountmanager overtuigen met het juiste antwoord (keuzepaneel). 3) Servers: het logboek. 4) **Het bewijs:** op 12 augustus stond de update op elf minuten, aangevraagd door Us Mem Snacks; zijdeur 00:03, pas van bewaker twee; gast D en D, tilwerk; de pas van mevrouw Tuinstra (de Bewaarder) is die dag geblokkeerd. 5) Tessa print het logboek. **Falen:** de accountmanager ziet je: "Sikkom." |
| **Reizen** | 2 km: e-step 2 min |
| **Romantiek (5/10)** | Tessa legt Tammo uit wat een logboek is; hij baalt dat ze gelijk heeft; ze vindt het leuk dat hij het wil weten |
| **Plot** | het is niet Wiebelwerk zelf: het is Jelle, met iemand van binnen. De datum van de camera-ingreep is het bewijs. Het printje wordt in de finale gebruikt. |
| **Gevolg / haak** | Mems appje: "Ze zoeken je. Kom naar Bourtange. – M." (stil) |
| **Behouden / nieuw** | NIEUW |

> **Te beoordelen.** A) Wiebelwerk als bewijsmissie met komische intake (voorstel; de eigen grap van de eigenaar, nu met een doel). B) Wiebelwerk alleen als bijrol in 1.3. C) Het bewijs komt direct uit het museum.

---

## 4.3 · Stoom (M19; nieuw)

| | |
|---|---|
| **Id** | `A4-3` (nieuw, step `n-stoom`) |
| **Functie** | **2 · plakje zes (de jury) blokkeren**: twee juryleden en de Bewaarder bevrijden uit een stilstaande trein |
| **Plaats** | museumstoomtrein bij Stadskanaal, door de bossen naar Veendam, ma 24 's middags |
| **Voertuig** | trein (Tammo machinist, `traindrive.js`) |
| **Mechaniek / hergebruik** | **lichte uitvoering:** `traindrive.js` met alleen gas en rem (geen bochten, geen seinen), de rit is gescript en kort; Tessa's wandeling door de wagons is een korte scène met keuzes, geen lopen op een rijdende trein (AANNAME: scènes in plaats van physics) |
| **Doel (hardop)** | "De machinist is omgekocht en de trein staat stil: rij hem naar het volgende perron, zodat de juryleden niet vier uur vastzitten." |
| **Motief** | Jelle kocht de machinist; in het salonrijtuig zitten de laatste twee juryleden en mevrouw Tuinstra met een gratis proeverij |
| **Verloop** | 1) De machinist zit op een bank en eet een eierbal. 2) Tammo klimt in de cabine, Tessa in de wagon. 3) Gas, fluit, rem; Durk en Douwe zijn de kelners. 4) Bij het perron stapt één jurylid uit; **het andere blijft: een contract, levenslang eierballen** (definitief van Jelle). 5) De Bewaarder weigert: "Ik ben verhinderd tot na het Ontzet. Artikel 9 regelt mijn plaatsvervanger." **Falen:** de trein rijdt door het station: "Sikkom." |
| **Jelle grijpt in** | **koopt de machinist**: de trein staat uren stil |
| **Romantiek (4/10)** | "Ik heb een trein bestuurd." "Je hebt hem in een station gezet." |
| **Plot** | **Jelle wint hier definitief één jurylid.** Jury: Berend, twee die in 3.4 wegliepen, één nu bevrijd, één van Jelle: vier tegen één. De voorzitter (de Bewaarder) blijft in de trein, dus artikel 9: Berend. |
| **Gevolg / haak** | Berend belt: "Ik heb een bus nodig voor het Beleg. Kom naar Ter Apel." |
| **Behouden / nieuw** | NIEUW (op "…Hè." na) |

> **Te beoordelen.** A) Trein besturen, Tessa door de wagons, licht uitgevoerd (voorstel). B) Alleen de scène. C) Een achtervolging per auto langs de spoorlijn.

---

## Reisbeat: de bus naar Bourtange (T4; was missie M23)

**Wat:** Ter Apel-bos naar Vesting Bourtange (12 km), dinsdag 25 augustus, vertrek 20:15, aankomst 20:59 ("Op tijd. Dat is één minuut te vroeg."); de speler kiest meerijden (relatiegesprek, de kleine grappen van de veertig re-enactors), zelf besturen (`sidejob_bus.js`) of skippen. **Inhoud:** Tinus wordt geïntroduceerd; Berend: "Je kijkt vaker naar die telefoon dan naar de weg. Hij komt wel."; Tammo: "Er zijn veertig stoelen." Tessa: "Dat zie ik."; Jelle belt: "Gezellige bus, allemaal. Ik rij even langs." (tweede van drie keer "gezellig"). **Waarom een reisbeat:** de missie draagt geen eigen plakje of waarheid, dus zij is samengevoegd met de reis (zie 00-OVERZICHT §3).

---

## 4.4 · Het beleg van Bourtange (M20; het dieptepunt, deel 1)

| | |
|---|---|
| **Id** | `A4-4` (nieuw, step `n-beleg`) |
| **Functie** | **3 · de waarheid over de bal ontdekken**: Mem neemt de bal van Jelle af; de speler houdt hem vast |
| **Plaats** | Vesting Bourtange: wallen, gracht, kruitkelder, poort, di 25 's avonds en 's nachts |
| **Voertuig** | te voet; fierljepstok (`fierljep.js`) |
| **Mechaniek / hergebruik** | `hold`-stage en `blast` (kartonnen kanonnen, `missions.js`): eerst de wallen verdedigen, `fierljep.js` (het duel met Durk en Douwe), daarna in de kruitkelder de bal beschermen tegen Jelles beleggers (`hold`) en ermee naar het bakkie bij de poort lopen; geen doden, alleen toneel |
| **Doel (hardop)** | "Houd de vesting tegen Jelles beleggers, spring over de gracht voor Durk en Douwe, en bescherm de bal in de kruitkelder tot hij in het bakkie ligt." |
| **Motief** | Mem heeft Jelle uitgenodigd om de bal te laten zien; Durk en Douwe houden Tammo bezig ("de bezigheid"); Tessa wacht in de kruitkelder |
| **Verloop** | 1) Het Beleg: verdedig de wallen met Berends mensen. 2) Durk en Douwe dagen Tammo uit (fierljepen over de gracht; Douwe: "…Plons." en dan "…Geen plons."; zijn jas met de autosleutel blijft bij Douwe). 3) Kruitkelder: Jelle laat Mem de bal zien, Mem neemt hem ("Nu is hij van mij."), Berend sluit de deur. 4) Mem: "Omdat mijn zoon gekke dingen doet om iets voor mij te winnen wat ik niet meer hoef." (BEHOUDEN). 5) Jelle: "Dit is geen einde. Dit is een geschil." Hij haalt de beleggers. 6) **De speler houdt de kruitkelder met kartonnen kanonnen en draagt de bal naar het bakkie.** 7) Op de parkeerplaats: de Escapade is weg (D en D hadden de sleutel in de jas), de klomp met briefje, de ruzie, de verantwoording van Oma, Mem en Berend, en Mem geeft Tessa de bal. **Falen:** de vesting valt of de bal wordt afgepakt: je herstart het beleg; het dieptepunt zelf is niet te falen. |
| **Jelle grijpt in** | **stuurt beleggers** tegen de kruitkelder en **steelt de Escapade** (de Fjord Frituur-wagen) |
| **Leuk-element / uitdaging** | het hoogtepunt van de komische actie: kartonnen kanonnen en fierljepen, dan een echte verdediging van de bal, dan een stille, pijnlijke scène |
| **Reizen** | de missie zelf |
| **Romantiek (3/10, het dieptepunt)** | Tammo: "Jij kende Mem." Tessa: "Ik wist niet waar de bal lag. Ik wist wel dat Mem iets voor Jelle verborgen hield. Dat had ik tegen jou moeten zeggen. En ik kan niet weten wat je verwacht als je niets zegt." Tammo: "Je zegt nooit iets." Tessa: "Jij zegt nooit iets!" |
| **Plot** | **Jelle heeft de bal echt gestolen; zijn moeder neemt hem af.** Oma: "Gerda belde mij. Ze zei: mijn jongen heeft de bal. Ik zei: dan nemen we hem af. Berend reed." Tessa: "Tige tank! – J. Dat is Jelles J. Hij schrijft overal een bedankje bij." Mem: "Dat heb ik hem geleerd. Alles wat goed is in mijn jongen komt van mij. Alles wat dit is, ook." Verantwoording: Oma: "Wij waren jullie voor. En ik had jullie moeten tegenhouden. Dat heb ik niet gedaan." Mem: "Ik wilde Jelle stoppen. Ik heb jullie daarvoor gebruikt. Dat was verkeerd." Berend: "Ik rijd jullie. En na de Snackprijs ga ik naar de politie." |
| **Gevolg / haak** | Tessa vertrekt met Berend en de bal; Tammo blijft bij Oma en Mem. |
| **Behouden / nieuw** | NIEUW (tekst); "Net fertelle" en "…Hè.", Mems "Omdat mijn zoon gekke dingen doet…" en de klomp-regels BEHOUDEN |

**Openingsdialoog (de wallen):** BEREND: "Het Beleg van Bourtange. De vesting is van ons." TAMMO: "Wie valt aan?" BEREND: "Ik, met veertig man en een paard van karton." DURK: "Tammo. Wij dagen je uit. Fierljep." (NIEUW) en DURK: "Net fertelle, hè?" (BEHOUDEN).

**Sleutelscène (de kruitkelder):** JELLE: "Mem. Hier is hij. Voor u. Ik heb hem genomen zoals het hoort: netjes, met een bedankje." MEM: "Doe open, jonge." MEM: "Dank je. Nu is hij van mij." JELLE: "Mem. Dat is een inbreuk op onze overeenkomst." MEM: "Er is geen overeenkomst, jonge. Er is een moeder." (NIEUW.)

> **Te beoordelen.** A) De Mem-neemt-af-scène, de speler houdt de bal vast (voorstel; zorgvuldige toon: satire, geen leed). B) Berend heeft hem. C) Niemand: de bal was nooit weg (raad ik af). Bij meer dan 15 minuten speeltijd: splitsen in twee missies.

---

## 4.5 · Iedereen heeft een rode auto gezien (M21; H16, twee solodelen tegelijk)

| | |
|---|---|
| **Id** | `A4-5` (`H16`, mission `fjord`, verplaatst en gesplitst in twee solodelen) |
| **Functie** | **4 · de Fjord Frituur en het recept gereedmaken**: de wagen terug (Tessa) en de vrienden bij elkaar houden (Tammo) |
| **Plaats** | Deel Tessa: Bourtange naar Zuidhorn (de spoorlijn Groningen-Leeuwarden via Zuidhorn en Grijpskerk), di 25 's nachts. Deel Tammo: Tinus' schuur bij Zuidhorn, wo 26 vroege ochtend |
| **Voertuig** | Tessa: Berends bakkie (ride-along) en de Escapade op een wagon (`fjordtrain.js`); Tammo: Tinus' trekker (de nachtrit) en te voet in de schuur |
| **Mechaniek / hergebruik** | Tessa: `train`-stage (`fjordtrain.js`: `spawnFjordTrain`, `catchFjordTrainNow`), Henks zender (het piepje), `solo: true`, op de wagon een keuze: de auto of de bal (niet beide). Tammo: een gesprekspuzzel met keuzepaneel (`choicepanel.js`) waarin elke keuze faalt: de vrienden vertrekken (dit is ontworpen, geen falen) |
| **Doel (hardop)** | Tessa: "Haal de Escapade terug van de trein." Tammo: "Houd Oma's vrienden bij elkaar, ook al zeggen ze nee." |
| **Motief** | zonder de Escapade geen Fjord Frituur en geen inschrijving; zonder de vrienden geen recept; Jelles advocaten bellen de vrienden terug |
| **Verloop** | Tessa: 1) Autogesprek met Berend, 3 min ("Je zoekt iemand die blijft."). 2) Mems stille appje zegt waar de trein stopt (middernacht, de overweg in Zuidhorn); het piepje bevestigt het. 3) Op de wagon staan beleggers; Jelle belt: "U kunt de auto redden of de bal houden." Tessa kiest de auto en laat de rugzak vallen: **de beleggers pakken de bal en springen naar een limo.** 4) Op de bijrijdersstoel: een klomp, "Tige tank foar de bal. – J." Tammo: 1) Bij Tinus' schuur, 's ochtends, met Oma en Mem aan de telefoon. 2) Geesje, Klaas, Wubbo en Roelfien komen met hun ingrediënten; elk zegt dat de advocaten gebeld hebben. 3) Tammo: "Wacht." "Alsjeblieft." "Ik… zeg het niet goed." Ze vertrekken. **Falen:** Tessa: de trein ontsnapt: "Sikkom." Tammo: niet te falen. |
| **Jelle grijpt in** | **steelt de wagon met de Escapade, pakt de bal af** (dubbel dilemma) en **laat de vrienden terugroepen door advocaten** |
| **Leuk-element / uitdaging** | de enige solomissies, twee tegelijk; een trein achterna en een gesprek dat niet lukt |
| **Reizen** | Bourtange-Zuidhorn 65 km: bakkie ride-along (3 min autogesprek) |
| **Romantiek (3/10)** | Tessa verliest de bal en wéét dat ze de auto koos; Tammo verliest de vrienden en kan niet praten; beiden alleen |
| **Plot** | **De jacht op de bal is echt:** Tessa had hem en verloor hem. Jelle heeft hem weer. De Escapade is terug, de bal weg, de vrienden weg. |
| **Gevolg / haak** | Henk belt: "Tinus' schuur is drie kilometer verderop. Ik heb een luik voor jullie." Tinus: "Voor jou en je ruzie." |
| **Behouden / nieuw** | "Moi." "Goidag, Berend." BEHOUDEN, Jelmer en Rikus over de rode auto (radio, als wereld) BEHOUDEN; de Mem-radiobellen van H16 zijn vervallen (Mem appt nu); de rest NIEUW |

> **Te beoordelen.** A) Twee parallelle solodelen (voorstel; langer dieptepunt). B) Alleen Tessa solo (korter). C) Tammo speelt ook mee (geen solo meer, minder dieptepunt).
