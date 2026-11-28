# Verhaalbijbel deel 2: de vijf loopbanen (28-11, #1357)

> **Status: ontwerp, geen code.** Dit deel hoort bij de verhaalbijbel van #1357 en bouwt op de besluiten van de eigenaar van 28-11 (zie het issue en zijn comments). Het schrijft vijf loopbanen uit: boer, voetbal en sport, vervoer, water, en snackwagen en horeca. Per loopbaan: (a) de verhalende aanleiding en hoe een nieuwe speler die begrijpt, (b) de verhaalboog, (c) de eindeloze modus, (d) de verwevenheid, (e) Samen spelen en (f) de omvang. Onderaan staan een eerlijke haalbaarheidsparagraaf en een bouwvolgorde.
>
> Regels: [AGENTS.md](../../../AGENTS.md) (constitution: alleen Nederlands, verzonnen bedrijven en personen, echte plaatsen mogen, altijd zomer, satire zonder leed), [mechanica.md](../../../.specs-fire/standards/mechanica.md), [multiplayer.md](../../../.specs-fire/standards/multiplayer.md), [MULTIPLAYER-VISIE.md](../../MULTIPLAYER-VISIE.md), [COOP-GAST.md](../../COOP-GAST.md). Wat hier over bestaande code staat komt uit de kop van de bestanden en uit de bestaande docs; niets is in beeld of in een run gecontroleerd.

## 0. Uitgangspunten voor alle vijf

Uit de besluiten van de eigenaar, zo kort als kan:

- **Geen kale menu-ingang.** Elke loopbaan begint met een gebeurtenis met personages. Het Loopbanen-scherm (`careermodel.js`, `loopbaanui.js`) blijft als overzicht, maar de eerste keer kom je er niet via dat scherm in.
- **Eén doorlopend verhaal, geen aktes, geen keuzes of vertakkingen.** De loopbanen gaan per verhaalstap open, één tegelijk, elk met een eigen kleine introductie. Daarna blijf je erin zolang je wilt.
- **Eén nieuwe bijfiguur per verhaalstap.**
- **De eindeloze modus is echt diep**, met een eigen game-gevoel. Na 40 uur moet de speler voelen: Groningen is mijn stad, ik heb echt iets opgebouwd, ik ken en hou van Tammo en Tessa, en er is altijd nog iets te doen.
- **Groei**: rangen per loopbaan, een groeiend eigen bedrijf, nieuwe voertuigen en uitrusting, een stad die op je reageert (langzaam en aangekondigd), en thuis dat meegroeit (het huis wordt opgeknapt of verruild).
- **Toon**: komisch met hart. De humor zit in dialoog en bijfiguren (droog Gronings understatement, bureaucratische absurditeit, situatiekomedie tussen Tammo en Tessa, parodie op echte plekken met verzonnen namen); de missies zelf mogen serieuzer. Rivaliteit met Friesland is goedmoedig en plagend; alleen Jelle gaat te ver (Fries met zorg, constitution 1).
- **Tammo en Tessa** beginnen als beste vrienden die vaak plagen. Het middenconflict is geen ruzie: ze weten allebei niet wat ze willen, zijn verschillend, willen elkaar niet missen en willen stiekem allebei meer, zonder dat van elkaar te weten of toe te durven. Anderen zien het al. Elke loopbaan geeft daar kleine, veelbetekenende momenten aan (per loopbaan onder "Tammo en Tessa"): een opmerking van een bijfiguur, een rol die een bijfiguur hen geeft, een taak die vertrouwen vraagt, een foto, briefje of voorwerp in de wereld. Nooit een ruzie, nooit een keuze.
- **Jelle** is tot het slot vooral hoorbaar (brieven, vergunningen, omroepen) en zelden in beeld. Hij wil groot en stoer lijken voor zijn oma (die ooit een prijs niet won), wil bewijzen dat hij en Friesland beter zijn dan Groningen, en is heel bureaucratisch. Elke loopbaan geeft hem één papieren aanwezigheid, zodat het slot een afgeronde boog is.
- **Gebieden met eigen sfeer**: Waddenkust en Lauwersmeer, Hogeland en Veenkoloniën, stad Groningen, Westerkwartier en Gorecht. Elke loopbaan gebruikt plekken uit meer dan één gebied.

### 0b. Begrijpelijk zonder voorkennis (extra eis van de eigenaar, 28-11)

Iemand die het verhaal niet kent moet alles snappen: het verhaal legt zichzelf uit en de speler mist nooit context. Dat geldt ook voor een gast die de aanleiding niet zelf speelde. Voor alle loopbanen gelden daarom vijf vaste regels; elke loopbaan hieronder werkt ze uit onder "Begrijpelijk voor iedereen".

1. **Eerst de personages, dan de gebeurtenis.** Een figuur wordt eerst op een gewone dag in beeld gebracht (naam, wat hij doet, hoe hij tegen Tammo en Tessa praat) vóórdat hij wegvalt, overlijdt of iets vraagt. De aanleiding voelt dan als verlies of kans en niet als een formulier. Zo staat het in elke loopbaan: bezoek, dan de gebeurtenis, dan de overname.
2. **Elke figuur noemt bij zijn eerste verschijning zijn naam en zijn band** ("Ik ben Gesina, de zus van Beppe's overleden zwager; ik heb de hond al aan jullie voorgesteld"), en een terugkerende figuur na een lange pauze herinnert zichzelf in één zin ("Wij zagen elkaar bij de tomatenkas"). Geen zin zonder dat iemand uitlegt wie wie is.
3. **De aanleiding staat herhaald in de wereld**: een brief, foto, bord of logboek in het huis, op de kade of in de club dat de gebeurtenis in drie zinnen vertelt. Daaruit leest een speler die hem nooit zag het verhaal terug.
4. **De eerste keer in een loopbaan speelt een korte terugblik van een bijfiguur** (twintig tot dertig seconden, ingesproken, overslaanbaar): wie er is weggevallen, wat dat voor Tammo en Tessa betekent en wat de volgende stap is. Wie de aanleiding zelf speelde ziet de terugblik niet; een gast, een speler die de loopbaan via het Loopbanen-scherm opent en een speler die lang weg was krijgen hem wel.
5. **Een "Wie is wie" in het menu** bij Voortgang: elke figuur die je tegenkwam, met naam, band met Tammo en Tessa en één zin over wat er gebeurd is. Een figuur komt erin op het moment dat hij zelf zijn naam noemt. (Zoiets bestaat voor zover bekend nog niet; zie bouwvolgorde.)

**Voor een gast** geldt daarbij: hij speelt zijn eigen figuur en ziet de aanleiding via de terugblik en de voorwerpen in de wereld, nooit door het verhaal van de host te volgen. Een scène waar een gast bij staat wordt voor hem niet overgeslagen en niet dubbel beloond.

### 0c. Twee dingen die de coördinator moet beslissen (niet door deze bijbel besloten)

1. *Beppe en Oma Trijntje.* De eigenaar zegt: Beppe is de oma van Tammo. In de code staat een Beppe-boog (`beppe_boog.js`) naast "Oma Trijntjes recept van 1953" (`storymilestones.js`, `snackstory.js`) en een Oma Trijntje in `voetbaldata.js`. Dit document gebruikt **Beppe** voor Tammo's oma en laat open of Oma Trijntje dezelfde persoon is (waarschijnlijk wel; Trijntje is dan haar voornaam). Deel 1 van de bijbel (personages) moet dit vastleggen.
2. *Ouder familielid voor de erfenis.* De eigenaar noemt "oom of tante". Dit document kiest **Tante Gesina**; verwissel de naam als deel 1 anders kiest.

Alle namen van bijfiguren hieronder zijn voorstellen, allemaal verzonnen; deel 1 moet ze op dubbelingen controleren.

---

## 1. Boer

### (a) Verhalende aanleiding

**Het bezoek, het overlijden, de erfenis.** Beppe stuurt Tammo op een gewone zomerdag met een mand eieren en een boodschap naar **Tante Gesina**, die een klein gemengd bedrijf heeft aan de rand van het Westerkwartier bij Hoogkerk. Tessa gaat mee omdat ze de trekker wil proberen. Het bezoek is zelf speelbaar: thee in de bijkeuken, tante die gewassen en machines aanwijst alsof ze die voorstelt aan een nieuwe buurman, de hond, en een eerste klus (hek, hooi, kruiwagen). Ze stelt zichzelf voor, zegt hoe ze met Beppe verwant is en wat ze van het land vindt. Hier leert de speler haar kennen; ze moet een echt mens worden, geen formulier.

Daarna een tussenpoos van een paar speluren waarin andere dingen gebeuren. Dan het bericht: Tante Gesina is overleden, in haar slaap, zoals ze zelf wilde. Geen geweld, geen drama; een begrafenis in het dorp en een notaris met een brief. **Het erf gaat naar Tammo en Tessa samen** ("omdat jullie de enige zijn die de hond mochten uitlaten"), met één voorwaarde: juli oogsten, dan zien we verder. Tante's brief is het eerste voorwerp in de wereld van de loopbaan en wordt een paar keer opnieuw gelezen.

Aansluiting op de code: de eigen boerderij met erf en percelen bij Hoogkerk (`percelen.js`, `boerderijwereld.js`), een kasboek en een eerste klus bestaan al. Nieuw is alleen de verhaalingang; de menu-ingang blijft voor wie later terugkomt.

**Begrijpelijk voor iedereen.** De terugblik wordt verteld door **Beppe** aan de keukentafel van het erf: "Dit was Gesina's huis. Zij is er niet meer. Zij heeft het aan jullie gelaten." In de bijkeuken hangt tante's brief aan een spijker, op het kalenderblad in de schuur staat haar laatste notitie en bij de ingang een bord "Hoeve Gesina". Een gast die de loopbaan opent ziet het erf, hoort Beppe en kan de brief lezen.

### (b) Verhaalboog, rangen, bijfiguren, plekken

**Rangen** (de bestaande titels van het vak Landbouw in `loopbaan.js` blijven de ladder; het verhaal geeft elke rang een gebeurtenis):

| Rang | Titel (bestaand) | Verhaalmoment |
|---|---|---|
| 1 | Veldhulp | De eerste week op tante's erf: hek, hooi, eieren, de hond |
| 2 | Zaaier | De eerste eigen akker: aardappelen en uien op het erf |
| 3 | Trekkerrijder | De eerste machine van jezelf; het eerste teeltseizoen voltooid |
| 4 | Loonwerker | Je werkt voor de buren en voor een bedrijf in de Veenkoloniën |
| 5 | Akkerbouwer | Je huurt of koopt grond in het Hogeland en de Veenkoloniën |
| 6 | Bietenbaron van Oldambt | De campagne: een bietenoogst die de hele provincie ziet |

**Bijfiguren, in volgorde van opkomst** (één nieuwe per verhaalstap):

1. **Tante Gesina**: de erfenis; spreekt later in brieven en herinneringen (foto's, aantekeningen).
2. **De buurboer Harm Veldkamp**: wijst de grenzen, leent een trekker en zegt "dat wordt wat" bij alles wat misgaat.
3. **De melkrijder Lutje**: brengt de dagprijzen en het nieuws; de roddelaar van de streek. Hij ziet als eerste dat Tammo en Tessa "wel heel veel samen op het land staan".
4. **Mevrouw Prins van Coöperatie Noorderveld** (die afnemer bestaat al in `boerderij.js`): bureaucratisch maar vriendelijk; haar formulieren zijn de eerste papieren van Jelle's soort.
5. **Wiebe, de jonge loonwerker uit Oldambt**: de rivaal in landbouwvorm; grootste machines, kleinste geduld.
6. **Hennie en Geert, de veilingmeester en de bietenbaas** in de Veenkoloniën: het einde van het seizoen.

**Plekken** (een band met het verhaal):

- *Westerkwartier en Gorecht*: tante's erf en de eerste percelen bij Hoogkerk (zoals in `percelen.js`), de graslanden langs het Reitdiep (Hooimarkt Reitdiep bestaat al als afnemer).
- *Hogeland en Veenkoloniën*: aardappelen, bieten en uien op grotere schaal (de afnemers Uienloods De Kleihoek, Suikerhal Hoogkerk en Graanzaak staan al in `GEWASSEN`), de bietencampagne.
- *Waddenkust en Lauwersmeer*: de kwelderlammeren, de schapen en de zoute akkers aan de dijk; een zomers uitje dat het "eerste buiten de stad" van het eerste uur kan zijn.
- *Stad*: de markt op de Vismarkt en de Groentemarkt, waar tante's aardappelen en uien aan de snackwagen komen.

**Jelle**: een brief per seizoen over "het verplichte formulier voor het bedrijfsmatig houden van een varken" (er zijn geen varkens), met een nummer dat steeds hoger wordt. Een bureaucratische schaduw, geen tegenstander.

**Tammo en Tessa**: tante's brief ("jullie weten wel wie van jullie de trekker mag en wie de boekhouding doet; ik heb er nooit iets over gezegd, jullie ook niet"); Lutje die zegt dat ze al jaren "op één akker" werken; een foto in de lade van tante van haar en een jonge man met een sjaal, die Tessa vindt en niet laat zien; en een taak waarin één van beide de ander zijn trekker moet toevertrouwen.

**Thuis groeit mee**: het erf wordt opgeknapt (nieuwe schuur, keuken, logeerkamer), zichtbaar op de kaart en in de wereld. Het huis in de stad blijft; het erf is het tweede thuis.

### (c) De eindeloze modus

**Wat de speler eindeloos kan doen**: een eigen bedrijf laten groeien. Percelen kopen of leasen, het gewas per seizoen kiezen, machines kopen, onderhouden en vervangen, personeel aannemen, contracten sluiten, de markt spelen en de boekhouding op orde houden.

**Kernlus** (zoals `docs/BOERDERIJ.md` hem al beschrijft): kies een perceel, bereid voor (ploegen, cultiveren, bemesten), zaai, onderhoud (spuiten), oogst, lever af met de aanhanger of verkoop, kijk in het kasboek en investeer. Een "seizoen" is een teeltcyclus in speldagen; het verhaal blijft zomer (constitution 3).

**Wat er al is:**

| Onderdeel | Bestand | Staat |
|---|---|---|
| Model, gewassen (aardappelen, bieten, graan, gras, uien, boomgaardfruit), taken, kasboek | `boerderij.js` | gebouwd |
| Percelen, erven, kopen of leasen, opslag, machinepark | `percelen.js`, `parcelfarm.js` | gebouwd (#415) |
| Machines en werktuigen (ploeg, cultivator, zaaimachine, mestverspreider, spuit, maaier, aanhanger) | `werktuigen.js`, `vehicle_farm.js` | gebouwd |
| Erf, machines en veldwerk in de wereld, HUD | `boerderijwereld.js`, `boerderijlive.js`, `boerderijui.js`, `farmhud.js` | gebouwd, deels niet in beeld bekeken (`BOERDERIJ-VISUEEL-22-11.md`) |
| Dagmarkt per gewas en leveringscontracten | `gewasmarkt.js`, `boerderijcontracten.js`, `boerderijdag.js` | gebouwd (#492) |
| Personeel en verpachten | `farmstaff.js`, `farmworkers.js`, `farmworkers3d.js` | gebouwd (#1101) |
| Loonwerker (Loonbedrijf De Ploegschaar) | `docs/BOERDERIJ.md` | gebouwd |
| Loopbaan Landbouw en de bietenoogst | `loopbaan.js`, `sidejob_boerderij.js` | gebouwd |
| Gast werkt eigen akker als minigame; vrije machine van de host besturen | `boerderijgast.js`, `docs/COOP-GAST.md` | gebouwd |

**Wat ontbreekt voor "echt diep":**

1. **Gewasrotatie, bodem en zomerweer.** Er is een teeltplan maar geen vruchtwisseling, geen bodemvruchtbaarheid en geen droge of natte zomers (er is geen winter, wel variatie). Voorstel: een vruchtbaarheidswaarde per perceel en een zomerweer per reeks speldagen.
2. **Veehouderij.** Gras en weiland bestaan, koeien, schapen en kippen niet. Voor tante's eieren en de kwelderlammeren is een eenvoudige veestapel (voer, verzorgen, melken of scheren, productie) de grootste inhoudelijke uitbreiding.
3. **Zwaardere machines** die bij de rangen horen (rooier, bietenrooier, maaidorser, grotere trekkers).
4. **Een markt met seizoenen**: nu een dagprijs binnen 20% van de basis; nieuw een wekelijkse veiling, een landbouwbeurs en het Oogstfeest.
5. **Verwerking en verkoop**: opslag, een hofwinkel, een eigen merk ("Hoeve Gesina"), later een kleine coöperatie met buren.
6. **Verhaalkoppeling**: nu staat de boerderij los van het verhaal; elke rang hierboven heeft een gebeurtenis nodig.

### (d) Verwevenheid

- **Snackwagen**: aardappelen en uien gaan rechtstreeks naar de wagen; het eerste menu (`wagen:menu`) vraagt om jouw aardappelen.
- **Vervoer**: kisten per bus en trein naar de stad; de taxi brengt de notaris; de bus brengt het hele dorp naar het Oogstfeest.
- **Water**: bieten en graan als vracht naar de suikerfabriek of de haven; een oogst die te laat de sluis haalt is het spel.
- **Voetbal**: de dorpsclub speelt naast tante's akker; boeren zijn de supporters en sponsors.
- **Evenement**: het Oogstfeest (§6).
- **Los speelbaar**: wie alleen wil boeren doet de erfenis en daarna alles op het erf zonder de andere loopbanen; verwevenheid geeft bonussen, geen verplichtingen.

### (e) Samen spelen

De visie regelt de basis: geld, voortgang en bezit zijn per speler (#429); de boerderij is per speler (`gde-boerderij-v1`).

- **Samen op dezelfde boerderij.** Een speler laat een ander meewerken op zijn erf. *Nog niet gebouwd*: nu werkt een gast op zijn eigen akker (`boerderijgast.js`) of bestuurt hij een vrije machine van de host. Voorstel: een medeboer-rol (J of N bij Meedoen?) met een vaste verdeling van de opbrengst die in beider kasboek staat.
- **Elk een eigen boerderij in dezelfde wereld.** De wereld is van de host; een gast kiest een eigen perceel zonder overlap met andermans percelen, en de oogst blijft van hem.
- **Tegen elkaar.** Een oogstwedstrijd of de ranglijst Bietenbaron per seizoen; een evenement, geen continue modus.
- **Handel tussen spelers.** Zaaigoed, mest, oogst en machines verhandelen of verhuren via een eigen aanbod (nooit een ruil midden in de lucht); elke speler boekt zijn kant. Nog niet gebouwd; het bezorgen en delen van eigen voertuigen (#449) is de eerste stap.
- **Beloning**: elke speler zijn eigen deel (geld, punten, rang), nooit dubbel.
- **Wat ziet een gast**: de wereld, de trekker van de host, de gewassen, de veldstanden en via de terugblik het erfenisverhaal.
- **Wegvallen en later aansluiten**: niemand verliest iets (#448); de dag wordt per speler uitbetaald. Wie later komt stapt in op de bestaande akker, niet halverwege een klus.
- **Altijd beschikbaar**: zodra je meedoet kun je meteen werken, ook zonder de erfenis te hebben gespeeld.

### (f) Omvang

| Onderdeel | Omvang |
|---|---|
| Verhaalingang (bezoek, overlijden, erfenis, terugblik) met stem | M |
| Boog Veldhulp tot Bietenbaron met zes bijfiguren | M |
| Gewasrotatie en bodem | S |
| Veehouderij (eerste versie: kippen en schapen) | L |
| Zware machines en werktuigen | M |
| Markt met veiling en seizoensgebeurtenissen | M |
| Verwerking, hofwinkel, eigen merk | M |
| Samen spelen: medeboer en handel | L |
| Diepte op simulator-niveau (alles bijeen) | L |


---

## 2. Voetbal en sport

### (a) Verhalende aanleiding

**De invaller.** Het dorp heeft een zondagclub, **De Hogelander Gladiolen** (verzonnen). Op een zondag valt de linksbuiten uit door iets onnozels (een natte sok, een vergeten tas, een kampeeruitje dat uit de hand liep) en een kleine club heeft maar twaalf spelers. **Tessa**, die in de kennismaking al bij elk straatvoetbalpotje als scheidsrechter werd aangeroepen, wordt gevraagd: "Je kunt toch wel een bal raken?". Ze raakt hem, scoort, en niemand praat er meer over. **Tammo** staat langs de lijn als grensrechter en wordt na afloop bestuurslid, want die plek ligt altijd open.

De dagen ervoor zijn onderdeel van de aanleiding: de speler ziet de voorzitter, de trainer en de rivaal op een gewone trainingsavond (hij loopt langs het veld op weg naar iets anders) voordat de uitval gebeurt. Zo is "de invaller" een gebeurtenis met bekende mensen.

Aansluiting op de code: de carrièreboog van `docs/VOETBAL-CARRIERE-21-11.md` begint in de Talentenklasse met Tessa als ster en Tammo als amateur die de papieren regelt. De bestaande uitnodiging van Tammo (beat B1) blijft; de invalbeurt komt eraan vooraf als aanleiding.

**Begrijpelijk voor iedereen.** De terugblik wordt verteld door **Voorzitter Albert Bos** in het clubhuis, onder het wedstrijdbord: "Onze linksbuiten ligt eruit; Tessa was er toevallig en ze kan het. Zo begon het." Op het bord in het clubhuis hangt de opstelling met een doorgestreepte naam en Tessa's naam met potlood erbij; de eerste wedstrijdfoto hangt naast de koffieautomaat. Een gast die de carrière opent, speelt als zijn eigen figuur, ziet het bord en hoort Albert. Een gast die als Tessa of Tammo een eigen carrière start, krijgt de terugblik ook.

### (b) Verhaalboog, rangen, bijfiguren, plekken

**Rangen** (de bestaande fasen van de carrière, vertaald naar het verhaal):

| Rang | Fase (bestaand) | Verhaalmoment |
|---|---|---|
| 1 | Amateur, Talentenklasse | De invalbeurt; de trainingsavond achter het dorpshuis |
| 2 | Debuut | Eerste basisplaats; Tessa's eerste doelpunt; de supporters van het dorp |
| 3 | Selectie | Promotie uit de Talentenklasse na een heet seizoen |
| 4 | Doorbraak, Terpklasse | De eerste uitwedstrijd langs de Waddenkust; een bod van een andere club |
| 5 | Transfers en kapitein | Naar een club in de stad; de band om de arm |
| 6 | Trainer en Manager | De sportieve en zakelijke kant; de Euroborg (Kroonklasse) en de Waddenbeker |

Sport is meer dan voetbal. In de code zijn padel, golf, discgolf, pitch and putt, racen en skaten aparte vakken (`loopbaan.js`). Dit document houdt **voetbal als hoofdlijn** en laat de andere sporten een **zijspoor binnen dezelfde loopbaan** zijn: een provinciale sportdag waar elke sport telt (zie omvang). Ze hebben geen eigen boog nodig.

**Bijfiguren, in volgorde van opkomst** (alles verzonnen):

1. **Voorzitter Albert Bos** van de dorpsclub: een man met een sjaal en een ledenlijst die nooit klopt.
2. **Trainer Meester Klaas**: gepensioneerd onderwijzer die tactiek uitlegt met suikerklontjes en een koekenpan.
3. **Verslaggever Hilbrand** (bestaat al in `voetbaldata.js`): commentaar en krant.
4. **De rivaal uit de straat, Remco Zwart**: speelt linksbuiten bij de club van het buurdorp en is er altijd net voor. Goedmoedig en plagend.
5. **De scout, mevrouw De Vries-Jansen** van De Stadjers (Kroonklasse): signaleert Tessa.
6. **De bakker Wubbo Hoekstra**: sponsor, koeken in de pauze en later leverancier van de snackwagen.
7. **Jan Kleibijter**, oud-spits en manager van de Kroonklasse: bij de Euroborg.

**Plekken**: elk dorp met een voetbalpark wordt een club met een verzonnen naam (`voetbalparken.js`, hoofdstuk 3b van de carrièredoc); de wedstrijd wordt op het echte sportpark gespeeld en uit spelen is een reis. De clubs staan in `voetbalclubs.js`: Wadlopers (kust), Ommelanders (Hogeland), Veenpiraten (Veenkoloniën), Kleibijters (de klei), Palingtrappers, Hunebedders, De Stadjers en de rest van de Kroonklasse, die in de Euroborg speelt. De Waddenkust en de Hogeland-dorpen zijn de eerste ritten, het stadion in de stad de bestemming.

**Jelle**: hij is de sponsor die nooit komt en stuurt een "overschrijvingsformulier met acht doorslagen" dat alleen met een stempel van een Friese gemeente geldig is. Eén brief per seizoen is genoeg. De sponsornaam wordt een verzonnen bedrijf (constitution 2).

**Tammo en Tessa**: Tammo die als bestuurslid bij elk doelpunt Tessa's naam in het wedstrijdformulier met een hartje schrijft en het zelf niet ziet; Meester Klaas die zegt dat de middenvelder altijd naar links kijkt, naar de lijn waar Tammo staat; een briefje in Tessa's kluisje "voor na de wedstrijd, niet nu"; en de aanvoerdersband die Tammo bij het bestuur voor haar regelt zonder het te zeggen.

### (c) De eindeloze modus

**Wat de speler eindeloos kan doen**: een voetbalcarrière met seizoenen, divisies, transfers en training, en later een club beheren. Zelf spelen (de bestaande voetbalsim) of laten uitrekenen.

**Kernlus**: een seizoen van zeven rondes (`voetbalseason.js`, een ronde per drie speldagen in `voetbalagenda.js`). Op de dagen ertussen trainen (minigames: `voetbaltraining.js`, `voetbaltraining3d.js`), rusten, reizen naar de uitwedstrijd en contract en sponsors regelen. Per ronde kies je zelf spelen (volle beloning) of uitrekenen (60% van de ervaring), zodat sim nooit sneller geld is dan spelen. Na zeven rondes: promotie of degradatie, beker, transfervenster, nieuw seizoen.

**Wat er al is** (veel; zie `docs/VOETBAL-CARRIERE-21-11.md`, `VOETBAL-CARRIERE-VERIFICATIE-21-11.md`, `VOETBAL-SIM-21-11.md`):

| Onderdeel | Bestand | Staat |
|---|---|---|
| Wedstrijdsim 5 tegen 5 en 11 tegen 11, vormingen, stijlen, computerspelers | `voetbalmatch.js`, `voetbalrules.js`, `voetbalai.js`, `voetbalbal.js` | gebouwd |
| Profiel, seizoen, agenda, vorm, vermoeidheid, blessure, beker, Waddenbeker | `voetbalcarriere.js`, `voetbalseason.js`, `voetbalagenda.js`, `voetbalcompetitie.js` | gebouwd, niet in beeld bekeken |
| Spelers met ratings en ontwikkeling | `voetbalplayers.js`, `voetbalontwikkeling.js` | gebouwd |
| Clubs in drie divisies en een Europees toernooi, verzonnen namen | `voetbalclubs.js` | gebouwd |
| Transfers, AI-clubs, clubkas, coach, clubbezit | `voetbaltransfers.js`, `voetbalcoach.js`, `voetbalclub_bezit.js` | gebouwd |
| Sponsors (parodiebedrijven die ook als panden in de wereld staan) | `voetbalsponsors.js` | gebouwd |
| Lokale clubs en velden uit de kaart | `voetbalparken.js`, `voetbalparkendata.js` | gebouwd |
| Shirts, publiek, commentaar, muziek, uitzending | `footballkit.js`, `voetbalpubliek.js`, `voetbalcommentaar.js`, `voetbalbeats.js`, `voetbalpresentatie.js`, `voetbaltvlayer.js`, `footballmusic.js` | gebouwd |
| Scherm en live-laag | `voetbalcarriereui.js`, `voetbalcarrierelive.js` | gebouwd |
| Samen spelen | `voetbalsamen.js` | gebouwd |

**Wat ontbreekt voor "echt diep"** (voetbalsim-gevoel, zonder echte clubs of spelers):

1. **Spelersmarkt met scouting**: dossiers, interesse van clubs, een zichtbare transferperiode per seizoen. De regels staan in `voetbaltransfers.js`; de schermen en de volledigheid zijn niet gecontroleerd.
2. **Meer speelmomenten**: twee wedstrijden per dag en een seizoen automatisch doorspelen (staat in de simdoc als "niet gedaan").
3. **Trainer en Manager als eigen spelen**: opstelling per wedstrijd, trainingsplanning, transfers, budget, contracten, sponsors, opleiding voor aspirant-spelers. Ze staan als fasen in het ontwerp; de schermen zijn de grootste open post.
4. **Clubbezit als Bezit-tak** (hoofdstuk 8 van het ontwerp): een aandeel in een club of stadion.
5. **Een sportdag over meerdere sporten**: nu staan padel, golf en voetbal los van elkaar; een lichte laag met één wedstrijd per sport en een medaillespiegel verbindt ze.
6. **Verhaalkoppeling**: de beats B1 tot B10 zijn korte appjes; de lange boog met bijfiguren hierboven is nieuw.
7. **Stem**: een hele carrière met elke regel ingesproken is veel werk (zie haalbaarheid).

### (d) Verwevenheid

- **Vervoer**: uitwedstrijden zijn reizen (bus, trein, taxi); de supportersbus is een bijbaan voor de buschauffeur; de taxichauffeur brengt Tessa als de bus staakt.
- **Boer**: de dorpsclub heeft akkerbouwsponsors; het Oogstfeest heeft een veldtoernooi.
- **Water**: een uitwedstrijd bij het Lauwersmeer waar het team per rondvaartboot heen mag (komisch, geen verplichting).
- **Snackwagen**: de wagen staat bij elke thuiswedstrijd en later in de Euroborg; Wubbo de bakker is de schakel.
- **Evenement**: de Waddenbeker (§6).
- **Los speelbaar**: wie alleen wil voetballen speelt na de invalbeurt zonder verhaal door.

### (e) Samen spelen

De basis staat in `voetbalsamen.js`: de carrière is van de speler zelf, wie het spel opende rekent de wedstrijd en de computer, een gast doet mee (Meedoen? J of N) in jouw team, ratings van gasten worden geklemd op het niveau van de klasse, beloning per speler.

- **Samen in dezelfde club.** Twee tot vier mensen per team (`MAX_PER_TEAM`) spelen elk als hun eigen figuur. *Nieuw*: een gedeelde clubkas voor een club met meerdere mensen-managers (alleen de clubkas, nooit eigen geld) en een gedeelde trainingsavond.
- **Elk een eigen carrière in dezelfde wereld.** Standaard: eigen profiel (`gde-voetbalcarriere-v1`), eigen club, eigen seizoen; elkaars clubs zijn computerclubs in de eigen competitie.
- **Tegen elkaar.** Derby: vrienden als rivalen in team 1 (`deriveTeams`, gebouwd). *Nieuw*: een competitieronde tussen de clubs van mensen.
- **Handel.** Spelers verkopen aan elkaars clubs is een transfer met twee kassen: de verkoper krijgt zijn bedrag, de koper betaalt het. Nog niet gebouwd.
- **Beloning, wegvallen, aansluiten** (gebouwd): wegvallen laat de computer de speler overnemen en hij krijgt niets; later aansluiten kan niet halverwege een wedstrijd, wel bij de volgende. Een gast krijgt geld en ervaring uit zijn eigen uitslagsregel, geen competitiepunten of contractbonus van een ander.
- **Wat ziet een gast**: het veld, de elf, het publiek en de stand; de terugblik van Albert.
- **Altijd beschikbaar**: een gast kan meteen een voetbalcarrière starten, op zijn eigen niveau binnen de klasse.

### (f) Omvang

| Onderdeel | Omvang |
|---|---|
| Verhaalingang (de invaller, terugblik) en boog met zeven bijfiguren | M |
| Spelersmarkt, scouting, transferperiode (schermen en regels) | M |
| Trainer- en Managerrol met eigen schermen | L |
| Meer speelmomenten, seizoen automatisch doorspelen | S |
| Clubbezit | M |
| Sportdag over meerdere sporten | S |
| Samen spelen: gedeelde clubkas, transfers tussen spelers, competitie tussen mensen | L |
| Stem voor een hele carrière | L |
| Diepte op simulator-niveau (alles bijeen) | L |

---

## 3. Vervoer (taxi, bus, trein)

De kortste loopbaan, zoals de eigenaar wil. Wel de loopbaan die de meeste anderen nodig hebben.

### (a) Verhalende aanleiding

**De chauffeur valt weg.** **Chauffeur Dries** rijdt al dertig jaar de laatste bus van de lijn naar het dorp. In de kennismaking is hij een vaste figuur: de bus waarin Tammo en Tessa naar huis rijden, met zijn eigen koffiekan en een groet voor iedereen die instapt. Dan krijgt hij een zere rug (niet erg, genoeg) en moet de volgende dag thuisblijven; er is niemand anders. Het streekvervoerbedrijf (verzonnen: **Noorderspoor en -bus**, zoals de bestaande vervoerder **Noorderspoor** in `treindienststart.js`) belt de enige die ze kennen die een bus kan parkeren: **Tammo**. Tessa gaat mee als "conducteur" die niets van de lijn weet en alles van de dienstregeling. Eén dienst wordt een vaste dienst; dan is de nachtrijder van de taxi ziek, dan gaat een machinist met pensioen en wil hij zijn trein aan jullie overgeven.

Aansluiting op de code: `busservice.js`, `busroutes.js`, `taxistatus.js`, `sidejob_taxi.js` en `treindienststart.js` kennen al een dienst met dienstregeling, punctualiteit en loon.

**Begrijpelijk voor iedereen.** De terugblik wordt verteld door **Dispatcher Annemarie** via de portofoon: "Dries rijdt niet meer, hij ligt met zijn rug op de bank. Wij hebben jullie nodig." In de bus hangt Dries' koffiekan op zijn plek en op het dashboard zijn briefje met de haltes die niemand op de kaart kan vinden. Een gast die de loopbaan opent ziet de bus, de kan, het briefje en hoort Annemarie.

### (b) Verhaalboog, rangen, bijfiguren, plekken

**Rangen** (de bestaande titels uit `loopbaan.js`):

| Rang | Bus | Taxi | Spoor | Verhaalmoment |
|---|---|---|---|---|
| 1 | Haltewachter | Meerijder | Perronstaander | De invaldienst van Dries |
| 2 | Invalchauffeur | Invaltaxichauffeur | Vaste reiziger | De eerste vaste lijn |
| 3 | Lijnchauffeur | Nachtrijder | Kaartjesknipper | De nachtdienst en de stationstaxi |
| 4 | Dienstroosterheld | Stadsrijder | Conducteur | De drukste zaterdag van de zomer |
| 5 | Hoofd van de halte | Taxiheld | Machinist | Een eigen standplaats en een eigen dienst |
| 6 | Busbaas van Grunn | Koning van de standplaats | Spoorbaas van het Noorden | Het jubileum van de lijn |

**Bijfiguren**: **Chauffeur Dries** (de oudste, de lijnenkaart in zijn hoofd), **Dispatcher Annemarie** (alleen een stem op de portofoon, ideaal voor de stem), **de vaste klant mevrouw Wassink** (altijd net te laat en elke dag dezelfde opmerking), **stationschef Pieter Luiken** (spoor).

**Plekken**: de stad (hoofdstation, Noord, Zuidwest), Westerkwartier en Gorecht (lijnen naar Roden, Leek en Zuidhorn), Hogeland en Veenkoloniën (lange regionale ritten), Waddenkust (de dienst naar Lauwersoog, aansluitend op de veerboot).

**Jelle**: een **vergunningsbrief voor een buslijn die nergens heen gaat** ("Lijn 0, Heerenveen-Hogeland, in verband met"), later een vervoersvergunning voor de snackwagen die terugkomt in het slot.

**Tammo en Tessa**: mevrouw Wassink die elke rit weer vraagt of "de jongedame en de heer" getrouwd zijn; een kaartje dat Tessa achterin de bus vindt met "voor als je wilt" erop (Dries, bedoeld voor zijn eigen zaak, maar het blijft); en de dienst waarin Tammo de bus rijdt en Tessa voor het eerst de lijnomroep doet.

### (c) De eindeloze modus

**Wat de speler eindeloos kan doen**: diensten rijden op de echte lijnen en het echte rooster, met punctualiteit en tevreden reizigers, en een eigen vervoersbedrijf laten groeien.

**Kernlus**: kies een dienst (bus, taxi, trein), rij hem volgens de dienstregeling, laat reizigers in- en uitstappen, haal je tijden, krijg loon en punten, stijg in rang.

**Wat er al is:**

| Onderdeel | Bestand | Staat |
|---|---|---|
| Bus: dienstregeling, punctualiteit, lijnen, live bussen, haltes | `busservice.js`, `busroutes.js`, `busbron.js`, `livebussen.js`, `bushalte.js`, `busbestuur.js`, `busstatus.js`, `businterieur.js` | gebouwd, deels live (`docs/BUSSEN-LIVE-21-11.md`) |
| Trein: echt rooster, machinist, conducteur, cabine | `trainservice.js`, `trainschedule.js`, `traindrive.js`, `treindienststart.js`, `treincabine.js`, `treinlayout.js` | gebouwd (`docs/TREINEN-LIVE-21-11.md`) |
| Taxi als bijbaan en reclametaxi | `sidejob_taxi.js`, `taxistatus.js`, `reklametaxi.js` | gebouwd |
| Loopbanen Spoor, Bus en Taxi | `loopbaan.js` | gebouwd |
| Samen een bus en een trein | `coopbus.js`, `buscoop.js`, `cooptrein.js`, `treincoop.js` | gebouwd |

**Wat ontbreekt**: een eigen vervoersbedrijf (wagenpark kopen, chauffeurs aannemen, lijnen uitbreiden, een eigen dienstregeling), tarieven en concessie (Jelle's papieren), verstoringen en drukte (werkzaamheden, een uitgevallen trein; altijd zomer) en een nachtdienst als aparte modus. Diepte op simulator-niveau is hier niet nodig; eerst de boog, dan een wagenpark-laag.

### (d) Verwevenheid

De meest verweven loopbaan: supporters, oogstkisten, toeristen en bezorgingen reizen mee (§6). Los speelbaar: ja.

### (e) Samen spelen

Gebouwd: samen een bus of trein (rollen, deuren, kaartjes, betaling per halte aan elke meespeler, afremmen als de chauffeur wegvalt). *Nieuw*: een gezamenlijk wagenpark en een vaste lijndienst met bus en taxi als aansluiting. Per speler loon en punten; een gast die de bus overneemt als de chauffeur wegvalt krijgt de dienst vanaf dat moment. Een gast ziet de bus, de reizigers en de rit; hij kan tijdens een rit meedoen maar niet halverwege een dienst instappen als bestuurder. Altijd beschikbaar: iedereen die meedoet kan opstappen.

### (f) Omvang

| Onderdeel | Omvang |
|---|---|
| Verhaalingang en boog (Dries, Annemarie, mevrouw Wassink, terugblik) | S |
| Eigen vervoersbedrijf (wagenpark, tarieven, lijnen) | M |
| Samen spelen: gedeeld wagenpark | M |
| Diepte | M |
