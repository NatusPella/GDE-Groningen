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
2. **Elke figuur noemt bij zijn eerste verschijning zijn naam en zijn band** ("Ik ben Hindrik, de man van Beppe's overleden zus; ik heb de hond al aan jullie voorgesteld"), en een terugkerende figuur na een lange pauze herinnert zichzelf in één zin ("Wij zagen elkaar bij de tomatenkas"). Geen zin zonder dat iemand uitlegt wie wie is.
3. **De aanleiding staat herhaald in de wereld**: een brief, foto, bord of logboek in het huis, op de kade of in de club dat de gebeurtenis in drie zinnen vertelt. Daaruit leest een speler die hem nooit zag het verhaal terug.
4. **De eerste keer in een loopbaan speelt een korte terugblik van een bijfiguur** (twintig tot dertig seconden, ingesproken, overslaanbaar): wie er is weggevallen, wat dat voor Tammo en Tessa betekent en wat de volgende stap is. Wie de aanleiding zelf speelde ziet de terugblik niet; een gast, een speler die de loopbaan via het Loopbanen-scherm opent en een speler die lang weg was krijgen hem wel.
5. **Een "Wie is wie" in het menu** bij Voortgang: elke figuur die je tegenkwam, met naam, band met Tammo en Tessa en één zin over wat er gebeurd is. Een figuur komt erin op het moment dat hij zelf zijn naam noemt. (Zoiets bestaat voor zover bekend nog niet; zie bouwvolgorde.)

**Voor een gast** geldt daarbij: hij speelt zijn eigen figuur en ziet de aanleiding via de terugblik en de voorwerpen in de wereld, nooit door het verhaal van de host te volgen. Een scène waar een gast bij staat wordt voor hem niet overgeslagen en niet dubbel beloond.

### 0c. Twee dingen die de coördinator moet beslissen (niet door deze bijbel besloten)

1. *Beppe en Oma Trijntje.* Besloten (deel 1 §2.4): Beppe is de oma van Tammo (soep, zorg, de beppe-boog in `beppe_boog.js`), Oma Trijntje is de oma van Tessa en houdt het recept van 1953 (`storymilestones.js`, `snackstory.js`, `voetbaldata.js`). Het zijn twee verschillende personages.
2. *Ouder familielid voor de erfenis.* De eigenaar noemt "oom of tante". Besloten in deel 1 (§2.2 en het namenregister §2.4): **Oom Hindrik de Jong** (hoeve Zeldenrust bij Warffum en Usquert, Hogeland) schenkt de hoeve; **Tante Aaltje** zet de schenking klaar. Oom Hindrik overlijdt niet. "Tante Gesina" en "Hoeve Gesina" zijn vervallen.

Alle namen van bijfiguren hieronder zijn voorstellen, allemaal verzonnen; deel 1 moet ze op dubbelingen controleren.

---

## 1. Boer

### (a) Verhalende aanleiding

**Het bezoek, de verhuizing, de schenking.** Beppe stuurt Tammo op een gewone zomerdag met een mand eieren en een boodschap naar **Oom Hindrik de Jong**, die op hoeve **Zeldenrust** aan de Waddenkust op het Hogeland (tussen Warffum en Usquert) een gemengd bedrijf heeft. Tessa gaat mee omdat ze de trekker wil proberen. Het bezoek is zelf speelbaar: thee in de bijkeuken (die hij te slap vindt), Oom Hindrik die gewassen en machines aanwijst alsof hij ze voorstelt aan een nieuwe buurman, de hond, en een eerste klus (hek, hooi, kruiwagen). Hij stelt zichzelf voor, zegt hoe hij met Beppe verwant is (de man van haar overleden zus Tjitske) en wat hij van het land vindt. Hier leert de speler hem kennen; hij moet een echt mens worden, geen formulier.

Daarna een tussenpoos van een paar speluren waarin andere dingen gebeuren. Dan het bericht van Tante Aaltje: Oom Hindrik gaat, met een zwaai, naar Huize Waddenzicht (een verzorgingshuis in Warffum) en de hoeve wordt geschonken. Geen leed, geen drama; een notaris in Warffum met een brief. **De hoeve gaat naar Tammo en Tessa samen** ("omdat jullie de enige zijn die de hond mochten uitlaten"), met één voorwaarde: juli oogsten, dan zien we verder. Oom Hindrik blijft bereikbaar voor een bezoek. Zijn brief is het eerste voorwerp in de wereld van de loopbaan en wordt een paar keer opnieuw gelezen.

Aansluiting op de code: de eigen boerderij met erf en percelen (De Zonnehoek bij Hoogkerk blijft de eerste akker en de bietenoogst; hoeve Zeldenrust bij Warffum is er vanaf de schenking, gebouwd in #1373: `boerstory.js`, `percelen.js`) (`percelen.js`, `boerderijwereld.js`), een kasboek en een eerste klus bestaan al. Nieuw is alleen de verhaalingang; de menu-ingang blijft voor wie later terugkomt.

**Begrijpelijk voor iedereen.** De terugblik wordt verteld door **Beppe** aan de keukentafel van het erf: "Dit was het huis van Hindrik. Hij woont nu in Warffum, bij de dokter. Hij heeft het aan jullie gegeven." In de bijkeuken hangt zijn brief aan een spijker, op het kalenderblad in de schuur staat zijn laatste notitie en bij de ingang een bord "Hoeve Zeldenrust". Een gast die de loopbaan opent ziet het erf, hoort Beppe en kan de brief lezen.

### (b) Verhaalboog, rangen, bijfiguren, plekken

**Rangen** (de bestaande titels van het vak Landbouw in `loopbaan.js` blijven de ladder; het verhaal geeft elke rang een gebeurtenis):

| Rang | Titel (bestaand) | Verhaalmoment |
|---|---|---|
| 1 | Veldhulp | De eerste week op het erf van Zeldenrust: hek, hooi, eieren, de hond |
| 2 | Zaaier | De eerste eigen akker: aardappelen en uien op het erf |
| 3 | Trekkerrijder | De eerste machine van jezelf; het eerste teeltseizoen voltooid |
| 4 | Loonwerker | Je werkt voor de buren en voor een bedrijf in de Veenkoloniën |
| 5 | Akkerbouwer | Je huurt of koopt grond in het Hogeland en de Veenkoloniën |
| 6 | Bietenbaron van Oldambt | De campagne: een bietenoogst die de hele provincie ziet |

**Bijfiguren, in volgorde van opkomst** (één nieuwe per verhaalstap):

1. **Oom Hindrik de Jong** en **Tante Aaltje**: de schenking; Hindrik spreekt later in brieven en bij een bezoek, Aaltje regelt de papieren.
2. **De buurboer Ypie Boekema**: wijst de grenzen, leent een trekker en zegt "dat wordt wat" bij alles wat misgaat.
3. **De melkrijder Lutje**: brengt de dagprijzen en het nieuws; de roddelaar van de streek. Hij ziet als eerste dat Tammo en Tessa "wel heel veel samen op het land staan".
4. **Mevrouw Prins van Coöperatie Noorderveld** (die afnemer bestaat al in `boerderij.js`): bureaucratisch maar vriendelijk; haar formulieren zijn de eerste papieren van Jelle's soort.
5. **Jorrit Tilma, de jonge loonwerker uit Oldambt** (niet Wiebe: dat is Wiebe Hazenberg): de rivaal in landbouwvorm; grootste machines, kleinste geduld.
6. **De veilingmeester en de bietenbaas** (namen nog te kiezen; geen Hennie of Geert, zie het namenregister) in de Veenkoloniën: het einde van het seizoen.

**Plekken** (een band met het verhaal):

- *Hogeland (Warffum en Usquert)*: hoeve Zeldenrust met twaalf melkkoeien. *Westerkwartier en Gorecht*: de eerste percelen bij Hoogkerk (zoals in `percelen.js`), de graslanden langs het Reitdiep (Hooimarkt Reitdiep bestaat al als afnemer).
- *Hogeland en Veenkoloniën*: aardappelen, bieten en uien op grotere schaal (de afnemers Uienloods De Kleihoek, Suikerhal Hoogkerk en Graanzaak staan al in `GEWASSEN`), de bietencampagne.
- *Waddenkust en Lauwersmeer*: de kwelderlammeren, de schapen en de zoute akkers aan de dijk; een zomers uitje dat het "eerste buiten de stad" van het eerste uur kan zijn.
- *Stad*: de markt op de Vismarkt en de Groentemarkt, waar de aardappelen en uien van Zeldenrust aan de snackwagen komen.

**Jelle**: een brief per seizoen over "het verplichte formulier voor het bedrijfsmatig houden van een varken" (er zijn geen varkens), met een nummer dat steeds hoger wordt. Een bureaucratische schaduw, geen tegenstander.

**Tammo en Tessa**: Hindriks brief ("jullie weten wel wie van jullie de trekker mag en wie de boekhouding doet; ik heb er nooit iets over gezegd, jullie ook niet"); Lutje die zegt dat ze al jaren "op één akker" werken; een foto in de lade van Hindrik van zijn vrouw Tjitske en een jonge man met een sjaal, die Tessa vindt en niet laat zien; en een taak waarin één van beide de ander zijn trekker moet toevertrouwen.

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
2. **Veehouderij.** Gras en weiland bestaan, koeien, schapen en kippen niet. Voor de eieren van Zeldenrust en de kwelderlammeren is een eenvoudige veestapel (voer, verzorgen, melken of scheren, productie) de grootste inhoudelijke uitbreiding.
3. **Zwaardere machines** die bij de rangen horen (rooier, bietenrooier, maaidorser, grotere trekkers).
4. **Een markt met seizoenen**: nu een dagprijs binnen 20% van de basis; nieuw een wekelijkse veiling, een landbouwbeurs en het Oogstfeest.
5. **Verwerking en verkoop**: opslag, een hofwinkel, een eigen merk ("Hoeve Zeldenrust"), later een kleine coöperatie met buren.
6. **Verhaalkoppeling**: nu staat de boerderij los van het verhaal; elke rang hierboven heeft een gebeurtenis nodig.

### (d) Verwevenheid

- **Snackwagen**: aardappelen en uien gaan rechtstreeks naar de wagen; het eerste menu (`wagen:menu`) vraagt om jouw aardappelen.
- **Vervoer**: kisten per bus en trein naar de stad; de taxi brengt de notaris; de bus brengt het hele dorp naar het Oogstfeest.
- **Water**: bieten en graan als vracht naar de suikerfabriek of de haven; een oogst die te laat de sluis haalt is het spel.
- **Voetbal**: de dorpsclub speelt naast de akker van Zeldenrust; boeren zijn de supporters en sponsors.
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
| Verhaalingang (bezoek, verhuizing, schenking, terugblik) met stem | M |
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

**De invaller.** Het dorp heeft een zondagclub, **De Hoekers** (verzonnen). Op een zondag valt de linksbuiten uit door iets onnozels (een natte sok, een vergeten tas, een kampeeruitje dat uit de hand liep) en een kleine club heeft maar twaalf spelers. **Tessa**, die in de kennismaking al bij elk straatvoetbalpotje als scheidsrechter werd aangeroepen, wordt gevraagd: "Je kunt toch wel een bal raken?". Ze raakt hem, scoort, en niemand praat er meer over. **Tammo** staat langs de lijn als grensrechter en wordt na afloop bestuurslid, want die plek ligt altijd open.

De dagen ervoor zijn onderdeel van de aanleiding: de speler ziet de voorzitter, de trainer en de rivaal op een gewone trainingsavond (hij loopt langs het veld op weg naar iets anders) voordat de uitval gebeurt. Zo is "de invaller" een gebeurtenis met bekende mensen.

Aansluiting op de code: de carrièreboog van `docs/VOETBAL-CARRIERE-21-11.md` begint in de Talentenklasse met Tessa als ster en Tammo als amateur die de papieren regelt. De bestaande uitnodiging van Tammo (beat B1) blijft; de invalbeurt komt eraan vooraf als aanleiding.

**Begrijpelijk voor iedereen.** De terugblik wordt verteld door **Voorzitter Albert Teuben** in het clubhuis, onder het wedstrijdbord: "Onze linksbuiten ligt eruit; Tessa was er toevallig en ze kan het. Zo begon het." Op het bord in het clubhuis hangt de opstelling met een doorgestreepte naam en Tessa's naam met potlood erbij; de eerste wedstrijdfoto hangt naast de koffieautomaat. Een gast die de carrière opent, speelt als zijn eigen figuur, ziet het bord en hoort Albert. Een gast die als Tessa of Tammo een eigen carrière start, krijgt de terugblik ook.

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

1. **Voorzitter Albert Teuben** van de dorpsclub: een man met een sjaal en een ledenlijst die nooit klopt.
2. **Trainer Meester Eppo Rozema**: gepensioneerd onderwijzer die tactiek uitlegt met suikerklontjes en een koekenpan.
3. **Verslaggever Hilbrand** (bestaat al in `voetbaldata.js`): commentaar en krant.
4. **De rivaal uit de straat, Remco Zwart**: speelt linksbuiten bij de club van het buurdorp en is er altijd net voor. Goedmoedig en plagend.
5. **De scout, mevrouw De Vries-Jansen** van De Stadjers (Kroonklasse): signaleert Tessa.
6. **De bakker Jaap Roorda**: sponsor, koeken in de pauze en later leverancier van de snackwagen.
7. **Jan Kleibijter**, oud-spits en manager van de Kroonklasse: bij de Euroborg.

**Plekken**: elk dorp met een voetbalpark wordt een club met een verzonnen naam (`voetbalparken.js`, hoofdstuk 3b van de carrièredoc); de wedstrijd wordt op het echte sportpark gespeeld en uit spelen is een reis. De clubs staan in `voetbalclubs.js` (de topclub in de Euroborg is **De Noorderlichters**) en `footballstory.js` (de dorpsclub **De Hoekers** in Warffum): Wadlopers (kust), Ommelanders (Hogeland), Veenpiraten (Veenkoloniën), Kleibijters (de klei), Palingtrappers, Hunebedders, De Stadjers en de rest van de Kroonklasse, die in de Euroborg speelt. De Waddenkust en de Hogeland-dorpen zijn de eerste ritten, het stadion in de stad de bestemming.

**Jelle**: hij is de sponsor die nooit komt en stuurt een "overschrijvingsformulier met acht doorslagen" dat alleen met een stempel van een Friese gemeente geldig is. Eén brief per seizoen is genoeg. De sponsornaam wordt een verzonnen bedrijf (constitution 2).

**Tammo en Tessa**: Tammo die als bestuurslid bij elk doelpunt Tessa's naam in het wedstrijdformulier met een hartje schrijft en het zelf niet ziet; Meester Eppo die zegt dat de middenvelder altijd naar links kijkt, naar de lijn waar Tammo staat; een briefje in Tessa's kluisje "voor na de wedstrijd, niet nu"; en de aanvoerdersband die Tammo bij het bestuur voor haar regelt zonder het te zeggen.

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
- **Snackwagen**: de wagen staat bij elke thuiswedstrijd en later in de Euroborg; bakker Jaap Roorda is de schakel.
- **Evenement**: de Waddenbeker (§6).
- **Los speelbaar**: wie alleen wil voetballen speelt na de invalbeurt zonder verhaal door.

### (e) Samen spelen

De basis staat in `voetbalsamen.js`: de carrière is van de speler zelf, wie het spel opende rekent de wedstrijd en de computer, een gast doet mee (Meedoen? J of N) in jouw team, ratings van gasten worden geklemd op het niveau van de klasse, beloning per speler.

- **Samen in dezelfde club.** Twee tot vier mensen per team (`MAX_PER_TEAM`) spelen elk als hun eigen figuur. *Nieuw*: een gedeelde clubkas voor een club met meerdere mensen-managers (alleen de clubkas, nooit eigen geld) en een gedeelde trainingsavond.
- **Elk een eigen carrière in dezelfde wereld.** Standaard: eigen profiel (`gde-voetbalcarriere-v1`), eigen club, eigen seizoen; elkaars clubs zijn computerclubs in de eigen competitie.
- **Tegen elkaar.** Derby: vrienden als rivalen in team 1 (`deriveTeams`, gebouwd). *Nieuw*: een competitieronde tussen de clubs van mensen.
- **Handel.** Spelers verkopen aan elkaars clubs is een transfer met twee kassen: de verkoper krijgt zijn bedrag, de koper betaalt het. Nog niet gebouwd.
- **Beloning, wegvallen, aansluiten** (gebouwd): wegvallen laat de computer de speler overnemen en hij krijgt niets; later aansluiten kan niet halverwege een wedstrijd, wel bij de volgende. Een gast krijgt geld en ervaring uit zijn eigen uitslagsregel, geen competitiepunten of contractbonus van een ander.
- **Wat ziet een gast**: het veld, de elf, het publiek en de stand; de terugblik van Albert Teuben.
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

**De chauffeur valt weg.** **Chauffeur Dries Oltmans** rijdt al dertig jaar de laatste bus van de lijn naar het dorp. In de kennismaking is hij een vaste figuur: de bus waarin Tammo en Tessa naar huis rijden, met zijn eigen koffiekan en een groet voor iedereen die instapt. Dan krijgt hij een zere rug (niet erg, genoeg) en moet de volgende dag thuisblijven; er is niemand anders. Het streekvervoerbedrijf (verzonnen: **Noorderspoor en -bus**, zoals de bestaande vervoerder **Noorderspoor** in `treindienststart.js`) belt de enige die ze kennen die een bus kan parkeren: **Tammo**. Tessa gaat mee als "conducteur" die niets van de lijn weet en alles van de dienstregeling. Eén dienst wordt een vaste dienst; dan is de nachtrijder van de taxi ziek, dan gaat een machinist met pensioen en wil hij zijn trein aan jullie overgeven.

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

**Bijfiguren**: **Chauffeur Dries Oltmans** (de oudste, de lijnenkaart in zijn hoofd), **Dispatcher Annemarie** (alleen een stem op de portofoon, ideaal voor de stem), **de vaste klant mevrouw Wassink** (altijd net te laat en elke dag dezelfde opmerking), **stationschef Jochem Luiken** (spoor).

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

---

## 4. Water

### (a) Verhalende aanleiding

**Een schipper valt weg.** Twee sporen, één aanleiding. **Wiebe Hazenberg** is in de kennismaking de rondvaartschipper op de Diepenring, zestig jaar achter het roer; hij zwaait naar Tammo en Tessa als ze langs de steiger lopen en vertelt aan toeristen dat hij "de stad al kende toen die nog een dorp was". Op een mooie dag valt hij in het water omdat hij een eend wil redden (niets ernstigs, wel drie weken rust). De rondvaart moet doorgaan: **Tammo** neemt het roer en **Tessa** doet het verhaal (zij weet het meest: zie `rondvaartlines.js`, waar Tammo de gids is en Tessa hem verbetert). Dat is het **stadsspoor** (rondvaartschipper).

Het **provinciespoor** (binnenvaartschipper) volgt uit hetzelfde verhaal: Wiebes vriend **Lammert Veenstra** (de binnenvaartmentor van het tweede spoor) vaart met een spits (een kleine binnenvaartschip) vracht door de provincie en vraagt, als de rondvaart weer draait, of een van hen zijn schip een week wil overnemen vanwege een bruiloft. Eén week; dan blijft het.

**Begrijpelijk voor iedereen.** De terugblik wordt verteld door **Noor**, de nieuwe gids-student, op de steiger: "Wiebe ligt thuis, hij heeft een eend gered en zijn knie niet. Jullie varen hem." Op de steiger hangt Wiebes pet aan de kapstok, in het stuurhuis staat een logboek met zijn handschrift en een foto van twee jonge schippers (hij en zijn vrouw). Een gast ziet de boot, de pet, het logboek en hoort Noor. De overstap naar het provinciespoor krijgt een eigen terugblik van Lammert Veenstra aan de kade.

### (b) Verhaalboog, rangen, bijfiguren, plekken

**Rangen** (het bestaande vak Water in `loopbaan.js`): Dekhulp, Roeier, Schipper, Kapitein, Havenmeester, Zeebaas van de Waddenzee. Dekhulp tot Schipper is het stadsspoor; Kapitein en verder het provinciespoor met een binnenvaartschip, later een zeeschip (`zeeschipvaart.js`, loodsen bij Lauwersoog en de Eemshaven).

**Bijfiguren**: **Wiebe Hazenberg** (stad), **Noor** (gids-student), **Lammert Veenstra** (provincie), **havenmeester Tjalling in Zoutkamp**, **sluiswachter Dina** (bij een sluis wachten is het spel), **de loods bij Lauwersoog** (een stem op de marifoon).

**Plekken**: *stad* (Diepenring, Noord-Willemskanaal), *Westerkwartier en Gorecht* (Van Starkenborghkanaal, Aduarderdiep), *Hogeland en Veenkoloniën* (Eemskanaal, Winschoterdiep: kanalen die vracht dragen), *Waddenkust en Lauwersmeer* (Zoutkamp, Lauwersoog, Eemshaven, Dollard). Het vaarnet staat in `vaarnet.js` en de graaf in `game/vaarnet.json`.

**Jelle**: een **havenvergunning** voor de snackwagen ("een standplaats op het water is geen standplaats, zie artikel 12 lid 4"), een **omroep bij de sluis** die het "verplichte rustpunt" uitroept, en een brief over de maximale doorvaarthoogte voor wie "groot en stoer" wil lijken.

**Tammo en Tessa**: Wiebe die zegt dat ze "een goed team zijn als ze elkaar durven aan te kijken"; een foto in het logboek van twee jonge schippers waarvan er één lijkt op Tessa; en de taak "geef de stuurboordkant aan de ander", die vertrouwen vraagt.

### (c) De eindeloze modus

**Stadsspoor, eindeloos**: rondvaarten met toeristen, steeds nieuwe verhalen per bezienswaardigheid, bijzondere tochten (avond, feest), een eigen rederij met meerdere boten.

**Provinciespoor, eindeloos**: binnenvaart met vracht door de provincie (bieten, graan, zand en andere verzonnen lading), sluizen, bruggen en havens, een eigen schip en later een vloot, tot de zee met loodsen en zeeschepen.

**Wat er al is:**

| Onderdeel | Bestand | Staat |
|---|---|---|
| Rondvaart: bijbaan, tour, lijnen, achtervolging, HUD | `sidejob_rondvaart.js`, `sidejob_rondvaarttour.js`, `rondvaartlines.js`, `rondvaartchase.js`, `rondvaartstatus.js` | gebouwd |
| Boottypes, waaronder binnenvaartschepen (spits, kempenaar) en namen | `boattypes.js` (`binnenvaartName`) | typen bestaan; zo te zien alleen als schepen die zelf varen (nog te controleren) |
| Vaarnet (waterwegen, sluizen, bruggen, graaf) | `vaarnet.js`, `vaarload.js` | gebouwd |
| Zeeschepen als loopbaan: loodsen bij Lauwersoog en de Eemshaven | `zeeschipvaart.js` | gebouwd |
| Boot: dek, wake, interieur | `boatdeck.js`, `boatwake3d.js`, `bootinterieur.js`, `boatahead.js` | gebouwd |
| Samen met een boot | `coopboot.js` | gebouwd |
| Loopbaan Water | `loopbaan.js` | gebouwd |

**Wat ontbreekt**: **vracht** voor de binnenvaart (laden, lossen, planning, vaste klanten), een eigen schip kopen en onderhouden, havens en kades met laden en lossen als plekken in de wereld, sluistijden en wachtrijen, en rederij-niveau voor stad en provincie.

### (d) Verwevenheid

De boer levert bieten en graan als vracht; de snackwagen heeft een havenvergunning; voetbal gebruikt de rondvaart als uitje; vervoer sluit aan op de veerboot naar Lauwersoog; **Dag van de Vaart** (§6) is het evenement. Los speelbaar: ja.

### (e) Samen spelen

Gebouwd: samen op een boot (`coopboot.js`). *Nieuw*: een bemanning met rollen (stuurman, dekhulp, gids), een gezamenlijke lading, elk een eigen schip in dezelfde wereld, een roeiwedstrijd (de acht en de skiff bestaan in `boattypes.js`) en handel van vracht tussen spelers (de boer levert, de schipper vaart). Per speler loon en punten. Een gast die bij Geert op de spits stapt is deelnemer van de dienst; valt hij weg, dan ligt het schip stil aan het anker (nooit kapot); wie later komt stapt aan boord bij de volgende kade. Altijd beschikbaar: elke speler kan een boot nemen.

### (f) Omvang

| Onderdeel | Omvang |
|---|---|
| Stadsspoor: verhaalingang en boog | S |
| Provinciespoor: verhaalingang en boog | M |
| Vracht, laden en lossen, havens | M |
| Eigen schip, vloot, rederij | M |
| Samen spelen: bemanning, gedeelde lading | M |
| Diepte | M |

---

## 5. Snackwagen en horeca (het slotstuk)

### (a) Verhalende aanleiding

**Dit is geen loopbaan die je start; het is waar alles samenkomt.** Het slotstuk volgt uit wat de speler al deed: aardappelen van de boer, de bakker van de voetbalclub, vergunningen van Jelle, een bus die bij de kade stopt, een schip dat uien aanvoert, en Oma Trijntjes recept van 1953 (`wagen:menu`: vet, eieren, zout, meel en mosterd). Het eerste uur heeft al een terloopse hint gegeven (Jelle's eerste brief, een kroketstand op de kade).

De code kent al een ruggengraat van verhaalvlaggen (`snackstory.js`, `storymilestones.js`): `wagen:idee`, `wagen:menu`, `wagen:stek`, `wagen:team`, `wagen:naam` (de wagenbelettering "TAM & TES"), `wagen:standplaats`, `wagen:keten`. Dit document laat ze staan en geeft ze gezichten.

**Begrijpelijk voor iedereen.** Dit is het enige stuk dat niet los te spelen is zonder het verhaal. Het begint daarom met een **terugblik in beeld**: een korte fotoreeks bij Oma Trijntjes keukentafel met de mensen die hierheen leidden (Oom Hindrik, de dorpsclub, de bus, de schipper), elk met naam en één zin. Een gast die dit mee wil spelen krijgt de reeks ook. De wagen zelf is voor iedereen te begrijpen: Beppe's recept, een kassa, een rij klanten.

### (b) Verhaalboog, rangen, bijfiguren, plekken

**De boog van het slot** (de eigenaar: eerst actie, dan een feest in de stad met Jelle's bureaucratische ontknoping, dan een stille scene):

1. **Actie.** Alles misgaat en alles werkt samen: de wagen moet in één nacht van de Waddenkust naar de stad, met oogst van de boer, een voetbalploeg in de bus, een schip dat voor een brug wacht en een trein die aansluit. Elke loopbaan levert een stuk (de speler speelt zijn eigen loopbaanstuk, de rest wordt verteld of door computerfiguren gedaan). Serieus gespeeld; de humor zit in de dialoog.
2. **Feest in de stad.** Het openingsfeest op de Vismarkt of Lammerts kade. **Jelle** komt in beeld om de vergunning in te trekken en de wagen "te controleren op Friese kwaliteit". Zijn bureaucratie keert zich tegen hemzelf: de vergunning die de wagen legaal maakt blijkt zijn eigen handtekening te dragen (uit het eerste uur). Zijn oma, die ooit een prijs niet won, proeft een kroket en is trots op hem; hij had het nooit nodig om groot te lijken. Het blijft plagend en warm: Jelle is de enige die te ver gaat, en dit is zijn laatste keer.
3. **Een stille scène.** Alleen Tammo en Tessa, na sluiting, op de kade, de wagen dicht. Geen keuze en geen kus als vanzelfsprekende uitkomst: wat ze allebei niet durfden zeggen is nu half gezegd. De speler weet al wat de bijfiguren zagen.

**Rangen en systemen** (`snackvan.js`, `snackrules.js`): standplaats, wagen, menu, team, keten, concurrent (Us Mem Snacks), eindscore **Snackimperium**. De ketenlaag **Kroketkoning** (`snackketen.js`) is een tweede lijn waarin je bestaande snackbars koopt; het verhaal moet kiezen of het ze verbindt (open punt, zie §0c en §9).

**Bijfiguren** (bestaande eerst): **Berend, Tinus en Wubbo** (de eerste medewerkers, `snackstory.js`), **bakker Jaap Roorda** (uit voetbal, de leverancier), **Lammert Visser** (kade), **Us Mem Snacks** (concurrent, parodie op een Friese keten, met zorg), **Oma Trijntje** (het recept); nieuw voor het slot: **Notarisklerk Rieneke** (de papieren), **De Burgemeester van het feest** (een ambtenaar met een lintje), **Jelle's oma** (alleen een stem tot het feest).

**Plekken**: stad (Vismarkt, Lammerts kade, kermis), Waddenkust (de eerste standplaats bij Lauwersoog), Hogeland en Veenkoloniën (leveranciers), Westerkwartier en Gorecht (de eerste klanten).

### (c) De eindeloze modus

**Wat de speler eindeloos kan doen**: een snackwagen en horecaketen opbouwen: menu's, standplaatsen, medewerkers, reputatie, concurrentie en seizoensevenementen. Eindeloos betekent hier: na het slot blijft de keten groeien.

**Kernlus**: kies een standplaats, bak het menu, serveer binnen de tijd, haal reputatie, koop upgrades en een tweede wagen, regel vergunningen en leg het af tegen de concurrent.

**Wat er al is:**

| Onderdeel | Bestand | Staat |
|---|---|---|
| Snackwagen als eindgame: standplaatsen, menu, upgrades, medewerkers, reputatie, concurrent met sabotage als satire, doelen, eindscore | `snackvan.js`, `snackvanplan.js`, `snackvans3d.js`, `snacklive.js`, `snackui.js` | gebouwd (#1095, #1102) |
| Verhaalvlaggen van de wagen | `snackstory.js`, `storymilestones.js` | gebouwd |
| Ketenlaag Kroketkoning | `snackketen.js`, `snackrules.js` | gebouwd |
| Frietwagen als mobiel bedrijf, bedrijven in Bezit | `business.js`, `businessstaff.js`, `businessexclusion.js` | gebouwd |
| Horeca in de wereld | `horeca.js` | gebouwd |
| Bijbaan en missie | `sidejob_snackbar.js`, `missie_snackbar.js`, `snackautomaat.js` | gebouwd |

**Wat ontbreekt**: horeca naast de wagen (een eigen pand met keuken en terras, een café, catering voor evenementen), een echte menuopbouw met recepten en voorraad (voorraad komt van de boer en het schip), seizoensevenementen als piek, een stad die op de keten reageert (een straat met jouw naam, een buurt die verandert, aangekondigd) en wat de speler na het feest doet.

### (d) Verwevenheid

De snackwagen is het knooppunt: de boer levert, vervoer en water brengen, voetbal vult de standplaats. De bestaande bedrijf-sim werkt ook zonder verhaal; alleen het slot hangt aan de rest.

### (e) Samen spelen

Gebouwd: een eigen toestand per speler (`bezit.x.snack`), en de wagens zijn voor iedereen in de wereld zichtbaar (`snackvanplan.js`). *Nieuw*: samen in één wagen (bakker en bediening), elk een eigen wagen op de kade, een kermiswedstrijd (wie verkoopt het meest) en handel van ingrediënten. Beloning per speler. Wie wegvalt laat zijn deel van de omzet staan; wie later komt neemt de volgende ronde. Een gast ziet de wagen en de klanten en mag meedoen aan het slot (Meedoen? J of N) met zijn eigen figuur. Altijd beschikbaar: elke speler kan meteen een stek proberen.

### (f) Omvang

| Onderdeel | Omvang |
|---|---|
| Het slot (actie, feest, stille scene) met stem | L |
| Horeca naast de wagen (pand, terras, catering) | L |
| Menu, recepten, voorraad | M |
| Stad die reageert | M |
| Samen spelen | M |
| Diepte | M |

---

## 6. Verwevenheid en gezamenlijke evenementen

**Leveringen** (de ruggengraat):

| Van | Naar | Goed |
|---|---|---|
| Boer | Snackwagen | aardappelen, uien |
| Boer | Water | bieten en graan als vracht |
| Water | Stad | kisten, zand, een hele lading |
| Vervoer | Alle | supporters, kisten, mensen |
| Voetbal | Snackwagen | de standplaats bij elke thuiswedstrijd |

**Gedeelde personages**: Beppe, Jaap Roorda de bakker (voetbal en snack), Lutje (boer en vervoer), Dispatcher Annemarie (vervoer en water), Jelle (een brief in elke loopbaan).

**Gezamenlijke evenementen** (altijd zomer, eigen sfeer per gebied; de stad verandert langzaam en aangekondigd):

| Evenement | Plek | Wie doet mee |
|---|---|---|
| Oogstfeest | Hogeland en Veenkoloniën | boer, vervoer, snackwagen |
| Waddenbeker | Waddenkust en de stad | voetbal, water, vervoer |
| Dag van de Vaart | Stad en Waddenkust | water, snackwagen |
| Zomerkermis | Stad | snackwagen, voetbal (sportdag), vervoer |
| Bietencampagne | Veenkoloniën | boer, water, vervoer |

Elk evenement geeft elke loopbaan een paar speluren een eigen taak, nooit verplicht. **Los speelbaar** blijft overal gelden: verwevenheid is een bonus (extra klanten, loon, een bijfiguur), geen slot.

---

## 7. Samen spelen: gemeenschappelijke regels voor de loopbanen

De regel die AGENTS.md bij elke nieuwe functie vraagt, toegepast:

| Vraag | Antwoord (voor alle loopbanen tenzij anders vermeld) |
|---|---|
| Van wie? | De wereld is van wie het spel opende. De loopbaan en haar bezit zijn van de speler zelf. |
| Doet een gast mee (J of N)? | Diensten en wedstrijden: ja (Meedoen? J of N). Het eigen bedrijf heeft elke speler zelf. |
| Wat ziet een gast? | De wereld, de voertuigen en figuren; het verhaal van zijn eigen figuur op zijn eigen scherm, en de terugblik (§0b). |
| Wie krijgt de beloning? | Elke speler zijn eigen deel, nooit dubbel (visie punt 6, #448). |
| Wegvallen | Niemand verliest iets; de computer neemt over. |
| Later aansluiten | Bij de volgende ronde, dienst of dag, niet halverwege een wedstrijd. |
| Altijd beschikbaar | Zodra je meedoet staat elke loopbaan open op het niveau van je eigen profiel, ook voor een gast die de aanleiding niet speelde. |
| Test | Een pure coöptest per regel plus een testbankstap (`docs/COOP-TESTBANK.md`). |

Voorstel voor een nieuwe regel in `docs/COOP-GAST.md`: *"Een gast kan elke loopbaan starten zonder de verhaalingang, en krijgt dan de terugblik van die loopbaan."*

---

## 8. Valkuilen uit eerdere feedback

De volledige analyse staat in [00-feedback-lessen.md](00-feedback-lessen.md) (apart geschreven, branch `feedbacklessen-28-11`). Dit is wat hier al uit de bugs #1334 tot #1351 en de hertest-issues (#1287 tot #1299) volgt, en wat het voor de loopbanen betekent. Bouw niets wat dezelfde feedback oplevert.

| Wat misging | Wat het voor de loopbanen betekent |
|---|---|
| Een missie begint in het verkeerde voertuig of zonder het materiaal dat de tekst noemt: "pinautomaat-missie: een busje zonder aanhanger", een pijl die de garage in wijst (#1342) | Elke loopbaan-opdracht controleert bij het begin dat de speler het juiste voertuig, werktuig of schip heeft (de boer met de aanhanger, de schipper met een boot met lading) en zet het anders klaar of zegt het in een zin. |
| Een cutscene overslaan met spatie sprong door naar een volgende stap (#1341) | De terugblik en alle aanleidingen zijn overslaanbaar, maar overslaan zet de verhaalvlag altijd goed (nooit een stap overslaan; hervatten op het goede punt, #1294). |
| Een knop of actie die niets doet: "Eierbal pakken" gaf alleen een popup (#1344) | Elke knop in een loopbaanscherm (Doorgaan, Nu starten, kopen, aannemen) heeft zichtbaar effect of is niet zichtbaar; er is een test per knop, niet alleen op de bron. |
| Popups en HUD die het zicht blokkeren (#1345) | Terugblikken en dienstinfo worden in een rand getoond, niet midden in beeld; de HUD van een dienst (bus, boot, wagen) is te verplaatsen en gaat weg bij een scène. |
| Voertuigen zonder banden van dichtbij, benen die niet bewegen, een verkeerde LOD (#1337, #1340) | Elk nieuw voertuig of werktuig (zware machines, binnenvaartschip, wagens) krijgt een controle op alle afstanden voordat het in een loopbaan komt. |
| Treinen die te snel rijden, een perron waar je doorheen valt (#1339, #1348) | Vervoer blijft op het echte rooster en de bestaande regels; nieuwe stations of lijnen krijgen eerst de bestaande tests (`scripts/trainservice_test.mjs`), geen nieuwe snelheidsregels. |
| Nieuwe personages met een staart, rare animaties, ragdoll en IK die niet kloppen (#1349, #1350, #1351) | Nieuwe bijfiguren gebruiken alleen de bestaande, geteste mensen en animaties (assets centraal); geen nieuw model zonder controle van skelet, animatie en ragdoll. |
| Een huis met een laag plafond, balkon buiten de muur, een deur waar je niet in kunt (#1335, #1343) | Het erf, het clubhuis, de stuurhut en de wagen hebben een binnenruimte die je kunt betreden en die klopt; elke binnenruimte krijgt een loop- en cameracontrole. |
| Tests die niets bewijzen: een bronregex in plaats van gedrag (#1298) | Bouw voor elke loopbaan een gedragstest (de speler start, speelt, krijgt de beloning), niet een test die kijkt of een woord in de code staat. |
| Opslag die stukging bij sluiten of overzetten, een hervat die de wereld bevroor (#1295, #1293) | Een loopbaan voegt alleen nieuwe sleutels toe en migreert; het erfenis-verhaal mag een bestaande boerderij of carrière niet overschrijven. Elke Samen-spelen-stap heeft een hervat- en wegvaltest. |
| Verspild werk per beeld, het laadsysteem (#1287, #1292) | Een diepe sim (veel percelen, spelers, schepen) rekent per speldag of lazy en niet per beeld; elke loopbaan krijgt een geheugen- en tijdsmeting. |
| "Gebouwd, niet in beeld bekeken" werd gebruikt als "klaar" | Elke fase hieronder eindigt met een beeldcontrole in Electron en een hertest-issue; niets staat in Klaar zolang het niet in beeld is gezien. |

---

## 9. Eerlijke haalbaarheid

**Wat klopt en wat niet.** De loopbanen zijn grotendeels al *mechanisch* gebouwd: boer, voetbal, vervoer, snackwagen en rondvaart bestaan als systemen met regels, opslag en tests. Wat ontbreekt is vooral twee dingen: (1) het **verhaal eromheen** (scènes, bijfiguren, terugblikken, stem) en (2) de **diepte** waar de eigenaar om vraagt (veehouderij, vracht, trainer en manager, horeca). Het eerste is schrijven en inspreken; het tweede is bouwen, testen en in beeld controleren.

**Grootste risico's:**

1. **Stem.** Alles ingesproken bij 40 tot 80 uur is een enorme hoeveelheid regels, en elke loopbaan voegt terugblikken toe. Voetbal en snack hebben veel commentaar- en dialoogregels; de boog van elke loopbaan levert tientallen scènes. De TTS-achterstand (`docs/TTS-ACHTERSTAND-21-11.md`) en opslag zijn het eerste knelpunt. Aanbeveling: eerst de dialoog per loopbaan schrijven en tellen, dan pas scènes toevoegen.
2. **Simulator-diepte voor twee loopbanen tegelijk (boer én voetbal) is niet realistisch in één ronde.** Elk is zelf een groot spel. Aanbeveling: één per keer, met een heldere definitie van "klaar" (wat moet de speler na 40 uur nog kunnen), en de andere op het bestaande niveau houden.
3. **Samen spelen met gedeeld bezit** (medeboer, clubkas, lading, handel) raakt de eigen-voortgang-regel (#429) en vraagt nieuwe netwerkregels; hier zijn de meeste bugs te verwachten. Aanbeveling: eerst "elk een eigen loopbaan in dezelfde wereld" (geen nieuw gedeeld bezit), pas daarna handel en gedeeld bezit, elk met een testbankstap.
4. **Veel bestaande systemen zijn "gebouwd, niet in beeld bekeken".** Voetbalcarrière, boerderij en snackimperium hebben elk een verificatiedoc dat zegt dat een deel nog in Electron moet worden gecontroleerd. Nieuw verhaal op een niet gecontroleerde basis is risicovol (zie §8).
5. **Canon.** Beppe en Oma Trijntje en de oom/tante zijn besloten in deel 1 (§2.4, §6.4): Beppe is Tammo's oma, Oma Trijntje is Tessa's oma en houdt het recept, Oom Hindrik schenkt de hoeve.
6. **Saves.** Een speler met een bestaande boerderij of carrière moet die houden als het erfenisverhaal later komt; migratie is hier een eis.
7. **De terugblik per loopbaan** (§0b) is extra stem en extra scènes: ze moeten kort blijven (twintig tot dertig seconden), anders verdubbelt het werk.

**Wat goed uit te voeren is**: de verhaalboog per loopbaan is een afgebakend stuk schrijfwerk met voorspelbare omvang; de leveringen en evenementen bouwen voort op bestaande systemen; de eerste stappen van Samen spelen (elk een eigen loopbaan in dezelfde wereld, samen in dezelfde club of boerderij) zijn kleine uitbreidingen.

**Totaalschatting** (S = enkele dagen, M = een tot twee weken, L = meerdere weken per eenheid; alleen als relatieve maat):

| Loopbaan | Verhaal en bijfiguren | Diepte | Samen spelen | Totaal |
|---|---|---|---|---|
| Boer | M | L | L | zeer groot |
| Voetbal en sport | M | L | L | zeer groot |
| Vervoer | S | M | M | middel |
| Water | M | M | M | middel tot groot |
| Snackwagen en horeca (slot) | L | L | M | zeer groot |

## 10. Voorstel bouwvolgorde

Eén doorlopend pad, zodat elk deel apart speelbaar en te controleren is:

1. **Canon en stem vastleggen** (deel 1): namen van bijfiguren (beslist: namenregister §2.4), een stemlimiet, het "Wie is wie"-menu. Geen code.
2. **Basis voor begrijpelijkheid**: het "Wie is wie" en de terugblik-regel (§0b) als kleine, gedeelde bouwsteen, zodat elke loopbaan hem hergebruikt.
3. **Vervoer** (kortste en meest verweven): verhaalingang en eerste dienst, bijfiguren. Geeft de reisroutes die de rest nodig heeft.
4. **Boer, verhaal eerst**: erfenis, eerste seizoenen, bijfiguren. De diepte per rang erachteraan (gewasrotatie, dan veehouderij).
5. **Voetbal, verhaal eerst**: de invaller, de boog tot de Euroborg, bijfiguren. Controleer eerst de bestaande carrière in beeld; daarna de rollen Trainer en Manager.
6. **Water**: stads- en binnenvaartspoor, vracht als nieuw systeem, koppeling met de boer.
7. **Samen spelen over de loopbanen heen**: eerst elk een eigen loopbaan in dezelfde wereld, dan samen in dezelfde club of boerderij, dan handel.
8. **Verwevenheid en evenementen**: leveringen, Oogstfeest, Waddenbeker, Dag van de Vaart.
9. **Snackwagen en horeca (het slot)**: pas als de andere vier hun bogen hebben, want het slot gebruikt hun resultaten. Daarna de horeca-diepte.
10. **De eindeloze diepte** als losse werkpakketten naast het verhaal (veehouderij, spelersmarkt, trainer en manager, vracht, horeca), in volgorde van wat de speler het meest mist.

Elk stuk begint met een verhaalstap met één nieuwe bijfiguur en een eigen introductie, eindigt met de regel over Samen spelen (visie punt 10), een testbankstap en een beeldcontrole (§8).
