# Akte 5: "Ontzet" (Westerkwartier en Stad; wo 26 – vr 28 augustus, epiloog in september)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte5.md](09-script-akte5.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel.

## Intro van de akte

| | |
|---|---|
| **Regio** | Westerkwartier (Zuidhorn, Leek, Aduard: schuur, wierden, trekkers), daarna Stad |
| **Sfeer** | herstel en samenkomen: de wind draait, het is drukker op de weg, Stad hangt vol vlaggen voor het Ontzet; de zomerkermis op de Grote Markt staat vol |
| **Tijd** | ca. 45-50 minuten (5 missies) plus finale, epiloog en slot |
| **Dagen** | wo 26 (5.1), do 27 (5.2, 5.3 's avonds, 5.4 's nachts), vr 28 (5.5, de finale) |
| **Wat de speler leert** | niets nieuws: alles wat je kunt wordt hier gebruikt (auto, trekker, duif, bakken, bus, scooter, fiets) |
| **Plot** | Tessa en Tammo herstellen. De Escapade krijgt een luik: de Fjord Frituur. Alle vrienden van Oma rijden mee naar Stad. Jelles vlag aan de toren valt. Jelle komt naar Oma's keuken voor een bod, en krijgt van twee oude vrouwen zijn les. Op 28 augustus komen alle draden samen: de jury, de bal, de duiven, de wagen. |
| **Romantiek** | **De knuffel en de openbaring** (5.1): Tessa vertelt dat ze op zeven plekken woonde voor haar tiende, en elke zomer naast Mem in Ljouwert; Tammo vertelt dat hij zweeg omdat hij dacht dat ze dan zou weggaan. Ze houden handen vast in 5.3: "Voor de grip?" "Nee. Gewoon." **Het slot:** "Ik wil bij jou blijven." |
| **Haak** | epiloog en een kleine zaaiing voor later (vrij spel, Deel 4) |

**Het antwoord op het verhaal:** de vijf woorden "Ik wil bij jou blijven" zijn het antwoord op Tessa's openbaring in 5.1 ("Ik blijf nooit ergens"), en op haar zin in de opening ("Een thuis met wielen"). Dat is wat de zin verdiend heeft.

**Reisplan akte 5** (afstanden geschat, AANNAME):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Overweg bij Zuidhorn (einde 4.6) | Tinus' schuur (5.1) | 3 | 3 min | te voet |
| Tinus' schuur | Aduard | 12 | de colonne (5.2): 10 min, in groep | geen |
| Aduard | Grote Markt | 8 | de colonne: 7 min | skip met scène |
| Grote Markt | Martinitoren (5.3) | 0 | 0 | geen |
| Martinitoren | Oma's keuken (5.4) | 3 | 3 min | te voet 8 min |
| Oma's keuken | Grote Markt (5.5) | 3 | 3 min | te voet |

---

## 5.1 · Een luik erin (nieuw)

| | |
|---|---|
| **Id** | `A5-1` (mechaniek van `r-tuning`, nieuw, step `n-luik`) |
| **Plaats** | Tinus' boerderijschuur bij Zuidhorn, wo 26 |
| **Voertuig** | Escapade, daarna Tinus' trekker |
| **Mechaniek / hergebruik** | `garage`-stage (`garages.js`, `garageui.js`): luik inbouwen, Henk monteert; een korte trekkertrek-proef met Tinus' trekker (AANNAME: `racers.js` met een trekkerprofiel); de knuffelscène |
| **Doel (hardop)** | "Bouw een luik in de Escapade, dan is het de Fjord Frituur, en trek hem met Tinus' trekker uit de modder." |
| **Motief** | zonder wagen met een luik kun je niet inschrijven; de wagen moet er zijn voor het Ontzet |
| **Wat de speler weet** | ruzie, het dieptepunt, de Escapade terug |
| **Verloop** | 1) Tinus (naamkaart, trekkertrekker) en Henk. 2) Luik inbouwen (garage-keuze). 3) Trekker trekt de wagen uit de modder. 4) Avond: scène in de schuur. **Falen:** geen echt falen; de trekkertrek-proef mag je herhalen. |
| **Spaßelement / uitdaging** | rust; de zachtste missie na het dieptepunt |
| **Reizen** | 3 km |
| **Romantiek (9/10)** | **De knuffel en de openbaring.** Tessa: "Ik heb op zeven plekken gewoond voor ik tien was." Tammo: "Ik zweeg omdat ik dacht dat je dan zou weggaan." Tessa: "Ik ging niet weg." Tammo: "Je bleef nergens." Tessa: "Ik ben gebleven." Hij belooft het te zeggen: "Op het Ontzet. Voor iedereen." |
| **Plot** | Tessa's verleden: een Nederlandse (geboren in Zwolle, AANNAME), vanaf haar achtste in het Oosterpark, elke zomer bij haar Friese oma in Ljouwert, naast Mem. Daarom kent ze Friezen. Tammo vindt dat gek. |
| **Gevolg / haak** | de Fjord Frituur is klaar; de vrienden komen naar Stad. |
| **Behouden / nieuw** | "Hij is van ons. Hij weet het alleen nog niet." BEHOUDEN; Henk-regels BEHOUDEN waar mogelijk; de rest NIEUW |
| **Nieuwe regels (schatting)** | 30 |

**Openingsdialoog (schuur, 10 regels):**

- **TINUS:** Ik ben Tinus. Trekkertrekker. Henk belde. Jullie zoeken een luik. [NIEUW]
- **HENK:** Henk, Garage Knalpot. Ik heb een luik, een uitlaat en een koekje. Eén. [NIEUW]
- **TESSA:** We maken van de Escapade de Fjord Frituur. [NIEUW]
- **TAMMO:** De Escapade is van mij. [NIEUW]
- **TESSA:** Hij is van ons, Tammo. [NIEUW]
- **TAMMO:** Hij is van ons. Hij weet het alleen nog niet. [BEHOUDEN]
- **HENK:** Elke deuk is een karaktertrek. Dit wordt een karakterwagen. [NIEUW]
- **TINUS:** En dan trekt mijn trekker hem uit de modder. [NIEUW]
- **TESSA:** Waarom modder? [NIEUW]
- **TINUS:** Omdat het Westerkwartier modder heeft. [NIEUW]

**Sleutelscène (de knuffel):**

- **TESSA:** Ik moet je iets vertellen. Ik heb op zeven plekken gewoond voor ik tien was. [NIEUW]
- **TAMMO:** Zeven? [NIEUW]
- **TESSA:** En elke zomer woonde ik in Ljouwert, naast Mem. Zij leerde me suikerbrood roosteren. [NIEUW]
- **TAMMO:** Jij? Fries? [NIEUW]
- **TESSA:** Een beetje. [NIEUW]
- **TAMMO:** Dat is gek. [NIEUW]
- **TESSA:** Dat is een Fjord Frituur op wielen. Een thuis dat je kunt meenemen. [NIEUW]
- **TAMMO:** Ik zweeg twaalf jaar omdat ik dacht dat je dan wegging. [NIEUW]
- **TESSA:** Ik ging niet weg. [NIEUW]
- **TAMMO:** Je bleef nergens. [NIEUW]
- **TESSA:** Ik ben gebleven. [NIEUW]
- *(regie: ze omhelzen elkaar, lang, de trekker ratelt buiten.)*
- **TAMMO:** Ik zeg het op het Ontzet. Voor iedereen. [NIEUW]
- **TESSA:** Dat is een belofte, Tammo. [NIEUW]

> **Te beoordelen.** A) De openbaring in een schuur met trekkers (voorstel; ruw en warm). B) Op Tinus' wierde bij zonsondergang (fotogenieker, minder grappig). C) Tessa vertelt het pas in 5.4 aan Oma's tafel (later, korter).

---

## 5.2 · De colonne (nieuw)

| | |
|---|---|
| **Id** | `A5-2` (nieuw, step `n-colonne`) |
| **Plaats** | Westerkwartier naar Stad: Zuidhorn, Aduard, de ring (Stad), do 27 's ochtends |
| **Voertuig** | de Fjord Frituur (Escapade met luik), Tinus' trekker, Geesjes scooter, Wubbo's bus, Berends bakkie, Klaas' sloep op een aanhanger, Durk en Douwe op één fatbike |
| **Mechaniek / hergebruik** | `chase`-stage omgekeerd: volg de leider, en houd de groep bij elkaar; Jelles limo probeert de colonne te splitsen; `checkpoint`-waypoints |
| **Doel (hardop)** | "Rijd met alle vrienden van Oma in één colonne naar de Grote Markt, zonder dat Jelle ons splitst." |
| **Motief** | de colonne moet de Grote Markt bereiken voor het Ontzet; de ingrediënten, de wagen en de mensen moeten samen komen |
| **Wat de speler weet** | alle ingrediënten zijn binnen; Jelle heeft de bal |
| **Verloop** | 1) Elke bondgenoot sluit aan bij een checkpoint (Geesje, Klaas, Lammert, Roelfien overhead, Wubbo, Tinus, Berend). 2) Jelles limo probeert een gat te slaan. 3) Durk en Douwe lopen over: "Wij zijn alleen de bezigheid. En nu zijn wij de bezigheid van mem." 4) De colonne bereikt de Grote Markt. **Falen:** de colonne valt uiteen: "Sikkom." |
| **Spaßelement / uitdaging** | vrolijkheid en variatie: een parade van alle voertuigen; veel korte grappen |
| **Reizen** | 20 km, 17 min; skip: een korte scène |
| **Romantiek (6/10)** | Tessa stuurt, Tammo zit naast haar en zwaait naar het volk; ze houden elkaars hand op de versnellingspook |
| **Plot** | Durk en Douwe stappen over; ze brengen de sleutel van de Escapade terug (met een strikje) |
| **Gevolg / haak** | Stad is vol vlaggen; aan d'Olle Grieze hangt iets Fries. |
| **Behouden / nieuw** | NIEUW (op Durk en Douwe-regels na) |
| **Nieuwe regels (schatting)** | 28 |

**Openingsdialoog (schuur, vertrek, 9 regels):**

- **TESSA:** Dit is de colonne. Wij voorop, de rest erachter, en niemand valt weg. [NIEUW]
- **GEESJE:** Ik rij op mijn scooter. Hij is sneller dan hij lijkt. [NIEUW]
- **WUBBO:** Ik heb de bus. Ik laat de bruggen voor je open. [NIEUW]
- **KAPITEIN KLAAS:** Ik ben mijn boot op een aanhanger. Ik praat tegen hem. [NIEUW]
- **BEREND:** Nul krassen. Op de heenweg. [NIEUW]
- **TAMMO:** Je hebt dat al gezegd. [NIEUW]
- **BEREND:** Ik zeg het weer. [NIEUW]
- **TESSA:** Rijden. Niet praten. [BEHOUDEN]

**Sleutelscène (Durk en Douwe lopen over):**

- **DURK:** Douwe. Hij is niet de baas. [NIEUW]
- **DOUWE:** …niet de baas. [NIEUW]
- **DURK:** Wij zijn alleen de bezigheid. [BEHOUDEN]
- **DOUWE:** …Hè. [BEHOUDEN]
- **DURK:** En nu zijn wij de bezigheid van mem. [NIEUW]
- **TAMMO:** Van Jelles mem? [NIEUW]
- **DURK:** Van alle mems. [NIEUW]

> **Te beoordelen.** A) De colonne als grote gezamenlijke rit (voorstel; veel voertuigen, veel variatie, een emotionele beloning). B) Alleen een scène met een montage (goedkoper, minder spel). C) De colonne gaat via Hogeland en Eemsdelta (te ver, past niet in de tijd).

---

## 5.3 · Er hangt iets Fries aan d'Olle Grieze (H10)

| | |
|---|---|
| **Id** | `A5-3` (`H10`, mission `vlag`, verplaatst) |
| **Plaats** | Grote Markt, Martinitoren, do 27 's avonds |
| **Voertuig** | duif |
| **Mechaniek / hergebruik** | `pigeon`-stage met `storyprops3d.js` (`showTowerFlag`, `cutFlagRope`, `dropFlag`); bestaande def |
| **Doel (hardop)** | "Haal Jelles dertig meter lange vlag van d'Olle Grieze met een duif." |
| **Motief** | Jelle heeft Stad vernederd (plakje: de vlag); morgen is het Ontzet; de torenwachter belt |
| **Wat de speler weet** | Jelle heeft de bal; Oma, Mem en de vrienden zijn in Stad |
| **Verloop** | 1) Torenwachter: "Iets Fries." 2) Duivenmodus: vijf touwen doorpikken. 3) De vlag zakt. 4) De Grote Markt klapt. **Falen:** de duif schrikt: opnieuw. |
| **Spaßelement / uitdaging** | de eerste echte beloning voor Tammo's gave; bekend van 1.5 maar nu publiek |
| **Reizen** | 0 |
| **Romantiek (7/10)** | Tessa pakt zijn hand; hij: "Voor de grip?" Zij: "Nee. Gewoon." |
| **Plot** | de vlag valt; Tammo is Stads held; Jelle ziet het vanuit de menigte |
| **Gevolg / haak** | Rikus belt: Oma wil jullie spreken. |
| **Behouden / nieuw** | scènes BEHOUDEN, de handscène NIEUW |
| **Nieuwe regels (schatting)** | 12 |

**Openingsdialoog (Grote Markt, 9 regels):**

- **TORENWACHTER (telefoon):** Rikus. Torenwachter. Er hangt iets aan mijn toren. [BEHOUDEN]
- **RIKUS (radio):** Wat dan? [BEHOUDEN]
- **TORENWACHTER:** Iets Fries. Ik meld alleen. [BEHOUDEN]
- **BERT:** Die Fries noemde d'Olle Grieze "in aardich tuorke". Een áárdig torentje! [BEHOUDEN]
- **TESSA:** "Foar mem." Voor zijn moeder. [BEHOUDEN]
- **TAMMO:** Hij hangt een vlag aan onze toren voor zijn moeder. [BEHOUDEN]
- **TESSA:** Dat is eigenlijk best lief. [BEHOUDEN]
- **TAMMO:** Het is vandalisme. [BEHOUDEN]
- **BERT:** Vijf touwen. Een duif met een scherpe snavel. [BEHOUDEN]

**Sleutelscène (na de vlag):**

- **BERT:** Kon minder, jong. [BEHOUDEN]
- **TESSA:** Heel Grunn klapt voor een duif. [BEHOUDEN]
- **TAMMO:** Niet voor de duif. Voor mij. Ik floot. [BEHOUDEN]
- **TESSA:** Ik klapte ook. Een beetje. [BEHOUDEN]
- *(regie: Tessa pakt zijn hand.)*
- **TAMMO:** Voor de grip? [NIEUW]
- **TESSA:** Nee. Gewoon. [NIEUW]

> **Te beoordelen.** A) De vlag-missie als feestelijke opmaat (voorstel; veel BEHOUDEN, kleine kosten). B) Weglaten (past minder in de laatste akte). C) De vlag valt tijdens het finale (grootser, maar de finale wordt dan te vol).

---

## 5.4 · Het bod viel tegen (H17, Oma's keuken)

| | |
|---|---|
| **Id** | `A5-4` (`H17`, mission `bod`, aangepast; step `n-keuken`) |
| **Plaats** | Oma Trijntjes keuken aan de Noorderhaven, do 27 's nachts |
| **Voertuig** | te voet; de Fjord Frituur-keuken als oefenstation |
| **Mechaniek / hergebruik** | de bakmechaniek uit `pg_foodtruck.js` (bakken, serveren, `FJORD`), met de vijf ingrediënten van de vrienden als voorraad; de scène van het bod uit `H17` |
| **Doel (hardop)** | "Bak een oefenronde eierballen met alle vijf ingrediënten, en wijs Jelles bod af." |
| **Motief** | zo goed als klaar voor het Ontzet; Jelle komt met geld |
| **Wat de speler weet** | de ruzie is bijgelegd; de bal is bij Jelle; mem en Oma zijn samen |
| **Verloop** | 1) Bakken: ei, vet, zout, bloem, mosterd. 2) Jelle verschijnt met een koffertje. 3) Het bod: geld voor de bal en de wagen. 4) Tessa wijst het af. 5) Mem en Oma zitten aan tafel en horen alles. **Falen:** te veel mislukte eierballen: je mag opnieuw bakken. |
| **Spaßelement / uitdaging** | rustig bakken; de scène draagt het verhaal |
| **Reizen** | 3 km |
| **Romantiek (8/10)** | Oma: "Hoe zei opa het eigenlijk? Hij zei: 'Woist ja wel.' Ik wilde het één keer horen." Tammo kijkt naar Tessa. |
| **Plot** | Jelle wordt geconfronteerd: "Je biedt geld voor iets wat geen geld is. En je moeder wil iets anders: dat iemand één keer zegt dat ze de beste was." Hij zwijgt. Hij zegt: "We bakken op het Ontzet. Wie wint, krijgt de bal." |
| **Gevolg / haak** | morgen is het Ontzet; Jelle heeft de bal nog. |
| **Behouden / nieuw** | het bod en Oma's regels grotendeels BEHOUDEN; de oefenronde NIEUW |
| **Nieuwe regels (schatting)** | 22 |

**Openingsdialoog (keuken, 9 regels):**

- **OMA TRIJNTJE:** Mosterd, eieren, zout, bloem en vet. Grove mosterd, niet dat zoete spul. [NIEUW]
- **TAMMO:** Oma… hoe zei opa het eigenlijk? Tegen jou. [BEHOUDEN]
- **OMA TRIJNTJE:** Niet. Hij zei: "Woist ja wel." [BEHOUDEN]
- **TAMMO:** En wist je het? [BEHOUDEN]
- **OMA TRIJNTJE:** Al jaren. Maar ik wilde het één keer hóren, jong. Eén keer is genoeg. [BEHOUDEN]
- **MEM:** Ik zit hier ook, Trijntje. [NIEUW]
- **OMA TRIJNTJE:** Dat weet ik, Gerda. [NIEUW]
- **TESSA:** Hij is er. Jelle. [NIEUW]
- **JELLE:** Moai, Grinzers. [NIEUW]

**Sleutelscène (het bod):**

- **JELLE:** Ik ben een redelijk man. Jullie hebben iets wat van mem is. [BEHOUDEN]
- **TAMMO:** Van Grunn. [BEHOUDEN]
- **JELLE:** Details. Geef me de wagen en het recept, en ik geef jullie genoeg voor tien frietwagens. [NIEUW]
- **TESSA:** Het bod viel tegen. [BEHOUDEN]
- **TESSA:** Je biedt geld voor iets wat geen geld is. En je moeder wil iets anders. [BEHOUDEN]
- **JELLE:** Wat dan? [BEHOUDEN]
- **TESSA:** Dat iemand één keer zegt dat ze de beste was. Dat koop je niet, Jelle. [BEHOUDEN]
- *(regie: Jelle zwijgt. Dat is voor het eerst.)*
- **JELLE:** …We bakken op het Ontzet. Wie wint, krijgt de bal. [BEHOUDEN]

> **Te beoordelen.** A) Jelle komt bij Oma en ziet zijn moeder (voorstel; de emotionele kern). B) Het bod op het Stadsbalkon (zoals oorspronkelijk). C) Mem is er niet bij (minder confrontatie, minder pijn).

---

## 5.5 · Ontzet, net als in 1672 (H18, de finale)

| | |
|---|---|
| **Id** | `A5-5` (`H18`, mission `ontzet`, aangepast) |
| **Plaats** | Grote Markt, vr 28 augustus, dag en avond |
| **Voertuig** | te voet, de Fjord Frituur, duiven |
| **Mechaniek / hergebruik** | bestaande def `ontzet` in drie delen: de kraam heel houden (`stage: hold`), de achtervolging met duiven boven het vuurwerk (`pigeon`, `chase`), terug naar de kraam voor de jury (`goto` + bakken); alle bondgenoten verschijnen |
| **Doel (hardop)** | "Houd de kraam heel, haal de bal terug en bak voor de jury, voordat de eierballen koud zijn." |
| **Motief** | de Snackprijs, de standplaats, de bal, Gerda en Trijntje |
| **Wat de speler weet** | alles |
| **Verloop** | 1) De kraam heel houden: Durk en Douwe helpen nu; het vuurwerk gaat per ongeluk af. 2) Jelle grijpt de bal en vlucht in de limo; Tammo, met de duiven van Bert, haalt hem in. 3) Terug naar de kraam. 4) Jury: Berend proeft; Oma en Mem; "Gerda. Jouw eierbal was beter." 5) De vijf woorden. 6) Jelle geeft de plakjes terug. **Falen:** kraam stuk of bal kwijt: "Sikkom." |
| **Spaßelement / uitdaging** | alles samen: kraam, duif, limo, bakken, publiek |
| **Reizen** | 0 |
| **Romantiek (10/10)** | **"Ik wil bij jou blijven."** "Vijf woorden." "Ik had er meer. Die waren minder goed." |
| **Plot** | de jury: Berend; de standplaats naar de Fjord Frituur; Gerda Terpstra komt op het bordje; Jelle: "Better as ús. Net fertelle." en "Ja, mem." |
| **Gevolg / haak** | epiloog |
| **Behouden / nieuw** | bijna alles BEHOUDEN uit H18; nieuw: de plakjes terug, "blijven" als antwoord, de standplaats |
| **Nieuwe regels (schatting)** | 40 |

**Openingsdialoog (Grote Markt, 9 regels):**

- **RIKUS (radio):** Moi, Grunn. Nachtstreek, in het daglicht. Ik voel me een vleermuis. [BEHOUDEN]
- **BEREND (in de rol):** Grunn! Geef je over! [BEHOUDEN]
- **KIND IN HET PUBLIEK:** Nee! [BEHOUDEN]
- **BEREND (uit de rol):** Elk jaar hetzelfde. Straks zit ik in de jury. Ik proef, ik tel, ik oordeel. [BEHOUDEN]
- **TESSA:** Tammo bakt. Ik hou de kraam heel. [BEHOUDEN]
- **TAMMO:** Ik bak nooit onder druk. [BEHOUDEN]
- **TESSA:** Je doet alles onder druk. Daarom werkt het. [BEHOUDEN]
- **JELLE:** Ik ben de bewaarder. Ik zit de jury voor. [NIEUW]
- **BEREND:** Jij bent een dief. Ik zit voor. [NIEUW]

**Sleutelscène (achter de kraam):**

- **RIKUS (radio):** We schakelen over naar de kraam. Er is een peiling die al twee weken openstaat. [BEHOUDEN]
- **TESSA:** Tammo. Iedereen luistert. [BEHOUDEN]
- **TAMMO:** …Woist ja wel. [BEHOUDEN]
- **TESSA:** Dat telt. Maar ik wil het één keer horen. [BEHOUDEN]
- **TAMMO:** Ik wil bij jou blijven. [BEHOUDEN]
- **TESSA:** Vijf woorden. [BEHOUDEN]
- **TAMMO:** Ik had er meer. Die waren minder goed. [BEHOUDEN]
- **TESSA:** Mien jong. Dat duurde twaalf jaar. [BEHOUDEN]
- **TAMMO:** Kon minder. [BEHOUDEN]
- **TESSA:** Kon veel minder. [BEHOUDEN]
- **RIKUS (radio):** Peiling gesloten. [BEHOUDEN]

> **Te beoordelen.** A) De finale in drie delen zoals nu, met Jelle als bewaarder die weg wil (voorstel; meeste regels blijven). B) Een kortere finale zonder achtervolging (goedkoper, minder spectaculair). C) Het Ontzet in Bourtange (past bij de oorspronkelijke wens, maar breekt het Grote Markt-gevoel).

---

## Epiloog en slot (cutscène)

**Epiloog (twee weken later, Vismarkt):**

- **RIKUS (radio):** Het ruikt naar suiker. Dat komt uit Hoogkerk. De zomer is op. [BEHOUDEN]
- **TESSA:** Het is koud. [BEHOUDEN] *(voorstel: vervangen door "Het is tweeëntwintig graden." als constitutie 3 vervalt, zie open vraag)*
- **TAMMO:** Het is Grunn. [BEHOUDEN]
- **TESSA:** Spijt van de zomer? [BEHOUDEN]
- **TAMMO:** Nee. Van de winter ook niet. Alvast. [BEHOUDEN]

**Slot (Rikus, studio):**

- **RIKUS (radio):** Moi. Nachtstreek, het laatste kwartier. [BEHOUDEN]
- **RIKUS (radio):** De Gouden Eierbal staat weer in het museum, met een alarm dat het doet en met twee namen op het bordje. [BEHOUDEN]
- **RIKUS (radio):** Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs. [BEHOUDEN]
- **RIKUS (radio):** Jelle gaf alle plakjes terug. Alle acht. Hij zei dat hij het "gezellig" vond. [NIEUW]
- **RIKUS (radio):** Een luisteraar uit de Veenkoloniën belt over een patatbaron. Ik zeg niks. [NIEUW]
- **RIKUS (radio):** En ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft niet betaald. [BEHOUDEN]
- **RIKUS (radio):** Dit is voor twee Stadjers. Ze zeggen nooit wat. Vandaag wel. Moi. [BEHOUDEN]
