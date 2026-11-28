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

