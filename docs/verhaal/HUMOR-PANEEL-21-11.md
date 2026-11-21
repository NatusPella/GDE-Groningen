# Humorpaneel 21-11 (humorronde, 55 beats)

Dit is de humorronde die nog openstond: per komische beat drie varianten (droog, absurd, warm) naast de regel zoals hij nu in het spel staat (`huidig`), beoordeeld door drie subagent-beoordelaars met een verschillende smaak: **Gronings-droog** (beoordelaar 1), **absurdist** (2) en **warm-romantisch** (3). Elke beoordelaar kreeg dezelfde beats met de vier opties in een andere, willekeurige volgorde, zag alleen de beats (geen andermans oordeel) en gaf per optie vijf scores van 1 tot 5: timing, verrassing, past bij het personage, geen leed, geen echte merken of personen. Daarna koos elke beoordelaar de beste optie.

Winnaar: de meerderheid van de drie stemmen (zekerheid hoog bij 3-0, midden bij 2-1). Bij 1-1-1 (zekerheid laag) beslist de hoogste scoresom. De regel `huidig` doet mee als vierde optie, zodat een goede bestaande regel niet voor een slechtere wordt ingeruild.

## Samenvatting

- 15 beats voor de verhaalstappen N1-N8 (ronde 4) en 40 voetbalregels (de eerste 40 vaste regels van Hilbrand en Roelie in `game/js/voetbalcommentaardata.js` op branch `voetbal-fifa-21-11`).
- N1-N8: absurd 10, huidig 3, droog 1, warm 1. Voetbal: droog 8, absurd 29, warm 3.
- Zekerheid: hoog 12, midden 34, laag 9.
- Geen enkele optie kreeg van een beoordelaar een 2 of lager op geen leed of geen echte merken en personen.
- Eerlijk over de proef: de varianten zijn door dezelfde schrijver gemaakt als de eerdere lijst; de absurde variant won 39 van de 55 beats; dat kan aan de smaak van twee beoordelaars liggen of aan mijn eigen varianten. Wie een droger Grunn wil, zet de beat terug op `huidig` (zie "Wat de eigenaar mogelijk wil vetoën").
- Niet getest: hoe de regels klinken in de uitzending of in een scène; de timing is alleen op papier beoordeeld. Nieuwe regels hebben nog geen opname (staan op `scripts/voice_wacht.json`).

## Wat de eigenaar mogelijk wil vetoën

- **Laag**: HN-02, HN-03, HN-05, HN-06, HN-08, HN-13, HV-18, HV-25, HV-37 (1-1-1; een andere smaak kan hier de andere kant op slaan).
- **HN-05** (Tessa, punaise): de herhaling "Het is een punaise. / Het is een punaise." was een kicker; de winnaar maakt er een eigen regel van. Wil je de herhaling, zet `chosen` op `"neutral"`.
- **HN-04** (Sjabbe): de eerdere winnaar "Zwaarder dan jij denkt. Lichter dan ik vertel." is vervangen door een droger antwoord; `neutral` is de oude regel.
- **HV-04** (Roelie/Hilbrand, tribunes): "liefde of werkloosheid" raakt het thema van Tammo en Tessa; het is satire, maar het is de scherpste regel van de set.
- **HV-39, HV-26, HV-14**: verwijzen naar Warffum, duiven en Oma's tweede thermosfles; leuke terugkerende details, maar wel nieuwe canon in het voetbalcommentaar.

## Hoe het is toegepast

- N1-N8: de winnaars staan in `game/storydata/humor.ronde4.json` (`chosen`, `panel`, `neutral` = de regel van vóór deze ronde), in de 09-scripts (variant 0 als bron, de build zet de gekozen tekst in) en in `game/storydata/script.json`. `docs/verhaal/HUMOR-KEUZELIJST.md` is opnieuw gegenereerd.
- Voetbal: de regels zijn op deze branch NIET aangepast; ze staan hieronder onder "Voor voetbal-fifa".

## Voor voetbal-fifa

Pas dit toe op branch `voetbal-fifa-21-11` in `game/js/voetbalcommentaardata.js` (vervang de regel in de kolom "was" door de kolom "wordt"). Een vaste regel heeft een opname-sleutel `Hilbrand|tekst` of `Roelie|tekst`: een gewijzigde tekst heeft dus een nieuwe TTS-ronde nodig (`scripts/tts_cast.mjs`) of komt op `scripts/voice_wacht.json`. Staat de regel ergens anders nog als verwijzing, pas die dan mee aan.

Regels die blijven (huidig won): geen.

| id | soort | spreker | was | wordt |
|---|---|---|---|---|
| HV-01 | start | Hilbrand | Welkom in de Euroborg! De zon schijnt, het gras is groen en Oma Trijntje heeft haar thermosfles al open. | Welkom in de Euroborg. Zon, gras, en Oma Trijntje met haar thermosfles. Het seizoen kan niet meer stuk. |
| HV-02 | start | Hilbrand | Goedemiddag allemaal! Het is zomer in Grunn en de bal ligt klaar op de stip. | Goedemiddag! Het is zomer in Grunn en zelfs de stip lijkt er zin in te hebben. |
| HV-03 | start | Hilbrand | Daar komen de spelers het veld op. Wat een sfeer, wat een zomerdag! | Daar komen de spelers het veld op! Ze lopen heel stoer. De bal heeft het gezien en doet alsof hij niets merkt. |
| HV-04 | start | Hilbrand | De tribunes zitten vol. Nou ja, vol genoeg voor een dinsdag. | De tribunes zitten vol. Op een dinsdag. Dat is liefde of werkloosheid. |
| HV-05 | start | Hilbrand | Hier zijn we dan: elf tegen elf, één bal en een heleboel Grunnegers die het beter weten. | Elf tegen elf, één bal. En de tribune heeft al een mening over allebei de ploegen. |
| HV-06 | start | Hilbrand | De scheidsrechter kijkt op zijn horloge. Het kan beginnen. | De scheidsrechter kijkt op zijn horloge. Het horloge kijkt terug. Het kan beginnen. |
| HV-07 | start | Roelie | Ik heb er zin in, Hilbrand. Het gras ruikt precies zoals vroeger bij het dorpsteam. | Ruik dat gras, Hilbrand. Dat ruikt naar mijn jeugd, een kantine en een zak sinaasappelpartjes. |
| HV-08 | start | Roelie | Let op de middenmoot vandaag. Daar wordt het gewonnen of verloren. | Let op de middenmoot, Hilbrand. Daar wordt het gewonnen. Of verloren. Of daar staat de koffie. |
| HV-09 | start | Roelie | Mooie dag voor voetbal. Slechte dag om in de schaduw te zitten. | Mooie dag voor voetbal. Slechte dag voor wie zijn zonnebrand thuis liet. Dat ben ik. |
| HV-10 | start | Roelie | Ik zeg: de eerste tien minuten zijn de belangrijkste. Dat zeg ik elke week, en elke week heb ik gelijk. | De eerste tien minuten zijn de belangrijkste. De laatste tien ook. De tien daartussen kijk ik even weg. |
| HV-11 | start | Roelie | Oma Trijntje zit op haar vaste plek. Dan weet je dat het menens is. | Oma Trijntje zit op haar vaste plek. Haar stoel is ouder dan het stadion. Dat is geen grap, dat is wetenschap. |
| HV-12 | tweedeHelft | Hilbrand | En we zijn weer begonnen. De tweede helft, met de rust nog in de benen. | Tweede helft! De spelers komen terug met een kop thee en nieuwe plannen. Het plan is: de bal. |
| HV-13 | tweedeHelft | Hilbrand | De spelers staan weer klaar. Alles kan nog, joh. | De spelers staan weer klaar. Alles kan nog, joh. Ook dat de bal naar de kantine rolt. |
| HV-14 | tweedeHelft | Hilbrand | Daar gaan we weer. De thermosfles is leeg, de spanning niet. | Daar gaan we weer! De thermosfles is leeg, maar Oma Trijntje heeft een tweede. Ze heeft altijd een tweede. |
| HV-15 | tweedeHelft | Hilbrand | Tweede helft! Wie heeft in de rust het beste gepraat? | Tweede helft! In de rust heeft de trainer een toespraak gehouden. De bal heeft er niets van gehoord. |
| HV-16 | tweedeHelft | Roelie | In de rust wordt het gewonnen, zeggen ze. Of verloren. Het ligt eraan. | In de rust wordt het gewonnen, zeggen ze. Ik won ooit in de rust een worst. Dat was ook iets. |
| HV-17 | tweedeHelft | Roelie | Ik ben benieuwd wie er nog benen heeft. | Ik ben benieuwd wie er nog benen heeft. Ik niet. Maar dat gaat niemand op tv zien. |
| HV-18 | tweedeHelft | Roelie | Nu komt het op conditie aan. En op koffie. | Nu komt het op conditie aan. De conditie zit, geloof ik, in de linkerkuit. En in de koffie. |
| HV-19 | derby | Hilbrand | Dit is wat we noemen een Groninger derby: niemand wil verliezen, iedereen kent elkaar. | Een Groninger derby! Iedereen kent elkaar, dus als je scoort weet de keeper waar je woont. |
| HV-20 | derby | Hilbrand | Een echte derby vandaag! Dat is zweet, gras en een bakkie koffie na afloop. | Een echte derby! Zweet, gras, en een bakkie koffie dat al koud wordt voor de aftrap. |
| HV-21 | derby | Hilbrand | Het is een derby. De tribunes zijn kleurrijker dan anders, en luider. | Het is een derby. De tribunes zijn kleurrijker dan anders. Iemand heeft een sjaal om zijn hond gedaan. |
| HV-22 | derby | Roelie | Bij een derby zijn de regels dezelfde, de tackles net iets stevigeres. | Bij een derby zijn de regels dezelfde. De tackles zijn stevigeres. En de scheidsrechter houdt zijn pet extra vast. |
| HV-23 | derby | Roelie | Ik heb in mijn tijd drie derby's gespeeld. Ik heb nog steeds ruzie met een buurman. | Ik heb drie derby's gespeeld. Ik heb nog steeds ruzie met een buurman. Hij weet niet meer waarover. Ik wel. |
| HV-24 | derby | Roelie | Niemand wil de buurman laten winnen. Dat is de eerste wet van het Noorden. | Niemand wil de buurman laten winnen. Dat is de eerste wet van het Noorden. De tweede wet ligt onder een heg. |
| HV-25 | kans | Hilbrand | Wat een kans! Hij kon alles doen, maar hij deed net iets anders. | Wat een kans! Hij kon alles doen, en hij koos de verrassendste optie. Dat was bijna kunst. |
| HV-26 | kans | Hilbrand | Gevaar! Dat scheelde niet veel. | Gevaar! Dat scheelde een duif. Een kleine. |
| HV-27 | kans | Hilbrand | Dat had een doelpunt moeten zijn, vind ik. | Dat had een doelpunt moeten zijn. De bal weet dat ook. Hij kijkt nu heel erg naar het gras. |
| HV-28 | kans | Hilbrand | Een grote kans! En de bal gaat net naast. | Een grote kans, en de bal gaat net naast. Net naast is mijn favoriete plek voor een bal. |
| HV-29 | kans | Hilbrand | Dichtbij! Heel dichtbij! | Dichtbij! Heel dichtbij! Zo dichtbij dat de paal het voelde. |
| HV-30 | kans | Hilbrand | Daar komt een schot! Net niet, net niet. | Daar komt een schot! Net niet. Het schot had een afspraak en is te laat. |
| HV-31 | kans | Hilbrand | Bijna, bijna! De tribunes zuchten. | Bijna, bijna! De tribunes zuchten. En dan klappen ze toch. Dat is Grunn. |
| HV-32 | kans | Hilbrand | Wat een mogelijkheid, maar de afwerking klopt niet. | Wat een mogelijkheid! Maar de afwerking klopt niet. Hij had de bal eerst moeten vragen waar hij heen wilde. |
| HV-33 | kans | Roelie | Die moet er in, Hilbrand. Zelfs mijn oma had die gescoord. | Die moet erin, Hilbrand. Mijn oma had hem gescoord. Met haar tas aan haar arm. |
| HV-34 | kans | Roelie | Dat is het verschil tussen een goed en een geweldig schot: de laatste tien centimeter. | Het verschil tussen goed en geweldig is tien centimeter. Ik heb ze nooit gehad. |
| HV-35 | kans | Roelie | Net als bij het dorpsteam: eerst bijna, dan koffie. | Net als bij het dorpsteam: eerst bijna, dan koffie, dan een discussie over de koffie. |
| HV-36 | kans | Roelie | Hij keek te veel naar de keeper en te weinig naar de bal. | Hij keek te veel naar de keeper. Dat is lief, maar de bal wil ook aandacht. |
| HV-37 | kans | Roelie | Pech. En een beetje onhandig. | Pech. En een beetje onhandig. Dat overkomt de beste, Hilbrand. Mij ook, vorige week bij de bakker. |
| HV-38 | schot | Hilbrand | Een schot! Het gaat hard. | Een schot! Het gaat zo hard dat het gras het nog even moet verwerken. |
| HV-39 | schot | Hilbrand | Hij haalt uit! | Hij haalt uit! Zijn been maakt een cirkel waar een boer in Warffum trots op zou zijn. |
| HV-40 | schot | Hilbrand | Daar gaat de bal, richting het doel. | Daar gaat de bal, richting het doel! Hij heeft een afspraak met de keeper en komt een beetje te vroeg. |

## Verhaalstappen N1-N8

### HN-01 (N8, OMA TRIJNTJE)

Oma's logeerkamer, avond. Tessa en Tammo pakken tegelijk dezelfde punaise; een lange stilte. Beneden klinkt Oma's pollepel op een pan en ze roept dat ze niet slapen. Tessa: "We slapen, Oma." Oma antwoordt; daarna zegt Tammo "Het is een punaise."

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Ik ben tweeënnegentig. Ik weet hoe slapen klinkt. | 24/20/22 | 66 | 4.0 3.3 4.7 5.0 5.0 |
| absurd (gekozen) | Dat is geen slapen. Dat is stilte met een plan. | 18/23/24 | 65 | 3.7 3.7 4.3 5.0 5.0 |
| warm | Ik ben ook jong geweest, hoor. Slapen klinkt anders. | 17/19/19 | 55 | 2.7 2.0 3.7 5.0 5.0 |
| huidig | Dat klinkt niet als slapen, jong. | 21/20/19 | 60 | 3.3 2.3 4.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HN-02 (N6, KAPITEIN KLAAS)

Noordpolderzijl, rubberboot. Klaas zegt: praat tegen het water, dan vangt hij. Tammo zegt niets (alleen puntjes). Klaas reageert; daarna vraagt Tessa of ze weer aan land mag.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Hij zegt meer dan sommige mensen. | 20/22/23 | 65 | 3.7 3.3 4.7 5.0 5.0 |
| absurd | Het water vindt het prachtig. Je ziet het aan de rimpels. | 18/23/19 | 60 | 3.0 3.3 3.7 5.0 5.0 |
| warm | Mooi gesproken, jongen. Zo hoor ik het graag. | 15/18/19 | 52 | 2.7 1.7 3.0 5.0 5.0 |
| huidig (gekozen) | Dat telt. | 24/20/23 | 67 | 4.3 3.3 4.7 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: droog. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: huidig). Keuze: **huidig** (de bestaande regel blijft).

### HN-03 (N4, TESSA)

Station Grunn. Jelle belt dat haar auto op een stoep staat die hij gisteren kocht ("Een stoep met een overeenkomst."). Tammo vraagt: "Wie koopt een stoep?" Tessa geeft het laatste woord van de scène. Jelle is de bureaucratische, rijke eikel met een zachte kern.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Iemand die het kleine lettertje leest. Voor de lol. | 17/21/20 | 58 | 3.0 2.7 3.7 5.0 5.0 |
| absurd | Iemand met een heel groot bureau en nul vrienden. | 18/23/18 | 59 | 3.3 2.7 4.0 4.7 5.0 |
| warm | Iemand die vroeger geen stoep had om op te zitten. | 21/20/23 | 64 | 3.3 3.7 4.3 5.0 5.0 |
| huidig (gekozen) | Iemand die alle regels kent. Behalve de leuke. | 21/22/21 | 64 | 4.0 3.0 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: warm. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: huidig). Keuze: **huidig** (de bestaande regel blijft).

### HN-04 (N1, SJABBE)

Voor Pand & Poen, zaterdagmiddag. Sjabbe (vaag, zegt altijd dat hij niks vraagt) heeft een kopieermachine op een steekkar. Tammo vraagt "Hoe zwaar?" Sjabbe antwoordt; daarna biedt Tessa twintig euro aan.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Dat hangt af van wie hem tilt. Ik zeg niks. | 23/22/22 | 67 | 4.3 3.0 5.0 5.0 5.0 |
| absurd | Een kleine koe. Maar dan van metaal. | 21/24/22 | 67 | 4.0 4.3 4.0 5.0 5.0 |
| warm | Genoeg voor twee jonge mensen met een goed plan. | 15/17/17 | 49 | 2.0 1.7 2.7 5.0 5.0 |
| huidig | Zwaarder dan jij denkt. Lichter dan ik vertel. | 20/20/22 | 62 | 3.3 3.3 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: droog. Zekerheid: midden. Keuze: **droog**.

### HN-05 (N8, TESSA)

Oma's logeerkamer, na de punaise-stilte. Oma riep net "Dat klinkt niet als slapen, jong." Tammo zei: "Het is een punaise." Tessa herhaalt of vult aan; dit is de kicker van de scène.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Een punaise. Ja. | 21/18/18 | 57 | 3.3 2.3 3.3 5.0 5.0 |
| absurd (gekozen) | Een punaise. We hebben hem al een beetje lief. | 18/22/24 | 64 | 3.7 3.7 4.0 5.0 5.0 |
| warm | Het is een punaise, Oma. Een heel lieve. | 16/24/21 | 61 | 3.7 3.0 3.7 5.0 5.0 |
| huidig | Het is een punaise. | 23/20/19 | 62 | 3.7 2.7 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: warm; warm-romantisch: absurd. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: absurd). Keuze: **absurd**.

### HN-06 (N6, TESSA)

Noordpolderzijl, rubberboot. Klaas zegt: "Jij zit stil en je vangt. Zij praat en zij is groen." Tessa (zeeziek, krampachtig aan de reling) reageert; slotzin van de scène.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Het water is mijn keuze niet. De boot ook niet. | 20/18/20 | 58 | 3.0 2.7 3.7 5.0 5.0 |
| absurd | Ik praat niet tegen water. Water heeft nooit iets voor mij gedaan. | 18/25/19 | 62 | 3.3 3.7 3.7 5.0 5.0 |
| warm | Ik doe mijn best, Klaas. Mijn maag niet. | 18/20/24 | 62 | 3.7 3.0 4.0 5.0 5.0 |
| huidig (gekozen) | Ik heb het water niet gekozen. | 24/20/19 | 63 | 3.7 3.0 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: warm. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: huidig). Keuze: **huidig** (de bestaande regel blijft).

### HN-07 (N4, TESSA)

Station Grunn, maandagochtend. Ze proberen een taxirit; Tessa zegt "Taxi. Jij rijdt." Tammo vraagt "Links of rechts?" Tessa antwoordt (ze is blind en navigeert op gehoor en gevoel).

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Als het misgaat, hoor je het als eerste. Dat is mijn werk. | 17/23/19 | 59 | 3.0 2.7 4.0 5.0 5.0 |
| absurd (gekozen) | Dat merk je vanzelf. Ik schreeuw dan heel rustig. | 22/24/23 | 69 | 4.3 4.3 4.3 5.0 5.0 |
| warm | Ik zit naast je. Dan gaat het goed. | 17/20/22 | 59 | 3.0 2.7 4.0 5.0 5.0 |
| huidig | Ik zeg het wel als het fout gaat. | 20/19/19 | 58 | 3.3 2.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

### HN-08 (N1, SJABBE)

Voor Pand & Poen. Tessa bood twintig euro voor het sjouwen van de kopieermachine de trap op. Sjabbe tegenbod met een wenk naar Tammo (die tilt, Tessa wijst de trap).

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Dertig. Hij draagt, jij wijst. Zo is het eerlijk. | 19/20/24 | 63 | 3.3 3.3 4.3 5.0 5.0 |
| absurd (gekozen) | Dertig. Met de trap erbij. De trap is vandaag ook zwaarder. | 20/25/22 | 67 | 4.0 4.3 4.0 5.0 5.0 |
| warm | Dertig. En een kop koffie erbij. Ik vraag niks terug. | 21/20/20 | 61 | 3.0 3.0 4.3 5.0 5.0 |
| huidig | Dertig. Maar dan draagt hij. | 21/18/19 | 58 | 3.3 2.7 3.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: droog. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: absurd). Keuze: **absurd**.

### HN-09 (N1, SJABBE)

Na het sjouwen telt Sjabbe het geld uit. Hij vertelt dat een man in een blauw colbert gisteren al zijn kopieerpapier kocht, contant, uit een klomp. Tessa: "Wat moet hij met kopieerpapier?" Sjabbe sluit de scène af. De man is een handlanger van Jelle (onbenoemd). Eerder zei Sjabbe: "Zwaarder dan jij denkt."

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Hij zei dat het voor een plan was. Ik zeg niks. | 21/19/19 | 59 | 3.3 2.3 4.0 5.0 5.0 |
| absurd | Hij zegt dat papier de wereld regeert. Ik heb nog één pak. Ik zeg niks. | 18/22/20 | 60 | 2.7 3.3 4.0 5.0 5.0 |
| warm (gekozen) | Hij was vriendelijk. Dat vind ik het engste. Pas op, jullie. | 21/24/24 | 69 | 4.3 4.3 4.7 4.7 5.0 |
| huidig | Papier is macht. Zegt hij. Ik zeg niks. | 19/21/20 | 60 | 3.3 3.0 3.7 5.0 5.0 |

Stemmen: Gronings-droog: warm; absurdist: warm; warm-romantisch: warm. Zekerheid: hoog. Keuze: **warm**.

### HN-10 (N2, TAMMO)

Gang op de elfde verdieping van de flat in Paddepoel, vrijdagavond. Een duif zit op de deurmat; de oude buurman Veldkamp staat bij zes duiven. Tessa vraagt: "Je kent hem?" Tammo antwoordt. (Canon: duiven volgen en gehoorzamen Tammo; niemand legt het ooit uit.)

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Nee. Hij kent mij. Dat is het probleem. | 19/23/19 | 61 | 3.3 3.3 3.7 5.0 5.0 |
| absurd (gekozen) | Nee. Maar de duif heeft mijn adres. | 24/25/23 | 72 | 4.3 5.0 4.7 5.0 5.0 |
| warm | Nee. Maar ze zijn altijd lief voor me geweest. | 19/19/19 | 57 | 3.0 2.0 4.0 5.0 5.0 |
| huidig | Nee. De duiven kennen mij. | 20/18/23 | 61 | 3.7 2.7 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: huidig. Zekerheid: midden. Keuze: **absurd**.

### HN-11 (N2, VELDKAMP)

Zelfde gang. Veldkamp (oude man, zes jaar eenzaam met zijn duiven, norse buitenkant, zacht van binnen) hoort Tessa vragen: "Zal ik soep maken? Voor drie?" Zijn antwoord is zijn eerste stap naar de gezelligheid.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Ik eet alleen. Maar zes duiven eten mee. Dus ja. | 20/22/23 | 65 | 3.7 3.3 4.7 5.0 5.0 |
| absurd (gekozen) | Ik eet liever alleen. Maar de duiven hebben al ja gezegd. | 23/25/24 | 72 | 4.7 4.3 5.0 5.0 5.0 |
| warm | Zes jaar eet ik alleen. Het is tijd voor een andere stoel. | 17/20/18 | 55 | 2.7 2.3 3.7 4.7 5.0 |
| huidig | Ik eet liever alleen. Maar kom maar. | 23/19/20 | 62 | 3.7 2.3 4.7 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HN-12 (N3, TESSA)

Beppe's huis aan de westrand, zondagmiddag, soep. Beppe (Friese oma, spreekt Fries) zegt over Tammo: "Hy seit neat, mar hy docht it goed" (Hij zegt niets, maar hij doet het goed). Tessa verstaat dat niet meteen, Tammo vertaalt "Eerst eten, dan praten." Tessa reageert in het Nederlands. Tammo is stiekem verliefd; Tessa vindt hem leuk maar weet het nog niet.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Dat zag ik. De eerste week al. | 19/20/20 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| absurd (gekozen) | Ik weet het. Hij zegt niets met zijn hele gezicht. | 19/24/25 | 68 | 4.3 4.0 4.3 5.0 5.0 |
| warm | Dat zie ik elke dag. Al vijf jaar. | 16/19/20 | 55 | 2.7 2.7 3.0 5.0 5.0 |
| huidig | Dat heb ik ook al gezien. | 20/18/16 | 54 | 3.0 1.7 3.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HN-13 (N5, TESSA)

Het erf van Tessa's oom bij Warffum, woensdagochtend. Tessa leerde hier melken. Tammo: "Dat wist ik niet." Tessa antwoordt droog-lief; hij heeft vijf jaar nooit naar haar jeugd op het land gevraagd.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Je vroeg nooit naar mijn jeugd. Alleen of er internet was. | 21/22/22 | 65 | 4.0 3.3 4.3 5.0 5.0 |
| absurd (gekozen) | Je vroeg ook niet naar de kippen. Er zijn er zeventien. Ze hebben namen. | 21/24/23 | 68 | 4.0 4.7 4.0 5.0 5.0 |
| warm | Je vroeg niet naar koeien. Je vroeg wel altijd naar mij. | 19/20/22 | 61 | 3.3 3.0 4.0 5.0 5.0 |
| huidig | Je vroeg niet naar de koeien. | 21/19/16 | 56 | 3.3 1.7 3.7 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: warm. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: absurd). Keuze: **absurd**.

### HN-14 (N5, TAMMO)

Zelfde erf. Een koe die niet weg wil staat bij het hek en kijkt naar Tammo (bang voor grote dieren, maar de dieren mogen hem altijd). Tessa gaat zo zijn hand naar de koeneus leiden.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | De koe kijkt naar mij. Ze weet iets. | 22/21/20 | 63 | 3.7 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | De koe kijkt. Naar mij. Ze kent mijn duiven. | 21/24/24 | 69 | 4.0 4.3 4.7 5.0 5.0 |
| warm | De koe kijkt naar mij. Ze vindt me aardig. | 16/20/19 | 55 | 2.7 2.3 3.3 5.0 5.0 |
| huidig | De koe kijkt. Naar mij. | 21/20/22 | 63 | 3.7 3.0 4.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HN-15 (N7, TAMMO)

Streekbus naar Winsum, vrijdagochtend. Tammo bedankt altijd de chauffeur. Tessa: "Het was een bus." Tammo sluit de scène af met een serieus oordeel over de bus (zachte romantiek: hij bedankt iedereen).

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Hij stond op tijd. Dat is zeldzaam. | 20/19/20 | 59 | 3.0 2.7 4.0 5.0 5.0 |
| absurd (gekozen) | Een bus met principes. | 24/25/23 | 72 | 4.7 4.7 4.7 5.0 5.0 |
| warm | Een goede bus. Hij nam ons samen mee. | 16/20/24 | 60 | 3.3 3.0 3.7 5.0 5.0 |
| huidig | Een goede bus. | 20/19/19 | 58 | 3.3 2.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

## Voetbalcommentaar: de eerste 40 regels

### HV-01 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Welkom in de Euroborg. Zon, gras, en Oma Trijntje met haar thermosfles. Het seizoen kan niet meer stuk. | 21/21/22 | 64 | 4.0 3.0 4.3 5.0 5.0 |
| absurd | Welkom in de Euroborg! De zon schijnt, het gras groeit en Oma Trijntje heeft haar thermosfles al open. Een fles met geheimen. | 19/20/20 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| warm | Welkom in de Euroborg, allemaal! Zon aan, gras groen en Oma Trijntje zit er al. Zo hoort een zomer te beginnen. | 16/21/19 | 56 | 3.0 2.0 3.7 5.0 5.0 |
| huidig | Welkom in de Euroborg! De zon schijnt, het gras is groen en Oma Trijntje heeft haar thermosfles al open. | 19/19/19 | 57 | 3.0 2.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: droog. Zekerheid: midden. Keuze: **droog**.

### HV-02 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Goedemiddag. Zomer in Grunn betekent: zon, een bal en niemand die durft te zeggen dat het te warm is. | 22/20/20 | 62 | 3.3 3.7 3.7 5.0 5.0 |
| absurd (gekozen) | Goedemiddag! Het is zomer in Grunn en zelfs de stip lijkt er zin in te hebben. | 21/25/22 | 68 | 4.3 4.0 4.3 5.0 5.0 |
| warm | Goedemiddag, iedereen! Het is zomer in Grunn en de bal ligt klaar. Wat willen we nog meer? | 16/19/20 | 55 | 2.7 1.7 4.0 5.0 5.0 |
| huidig | Goedemiddag allemaal! Het is zomer in Grunn en de bal ligt klaar op de stip. | 17/19/19 | 55 | 3.0 1.7 3.7 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-03 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Daar komen ze het veld op. Zichtbaar blij, voor zover je dat op deze afstand kunt zien. | 23/18/19 | 60 | 3.7 3.0 3.3 5.0 5.0 |
| absurd (gekozen) | Daar komen de spelers het veld op! Ze lopen heel stoer. De bal heeft het gezien en doet alsof hij niets merkt. | 18/25/22 | 65 | 3.7 4.0 4.0 5.0 5.0 |
| warm | Daar komen de spelers het veld op, de zon in hun gezicht. Hier zijn we voor gekomen. | 16/20/19 | 55 | 2.7 2.0 3.7 5.0 5.0 |
| huidig | Daar komen de spelers het veld op. Wat een sfeer, wat een zomerdag! | 16/19/19 | 54 | 2.7 1.7 3.7 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-04 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | De tribunes zitten vol. Op een dinsdag. Dat is liefde of werkloosheid. | 23/24/23 | 70 | 5.0 4.0 4.3 5.0 5.0 |
| absurd | Volle tribunes op een dinsdag! Ergens staat vandaag een hele stad niet te werken. Ik noem geen namen. | 18/24/19 | 61 | 3.0 3.7 3.7 5.0 5.0 |
| warm | De tribunes zijn goed gevuld, ook op een dinsdag. Dat noem ik trouw. | 19/20/20 | 59 | 3.0 2.7 4.0 5.0 5.0 |
| huidig | De tribunes zitten vol. Nou ja, vol genoeg voor een dinsdag. | 21/18/18 | 57 | 3.3 2.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: droog; warm-romantisch: droog. Zekerheid: hoog. Keuze: **droog**.

### HV-05 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Elf tegen elf, één bal. En de tribune heeft al een mening over allebei de ploegen. | 22/25/20 | 67 | 4.3 3.7 4.3 5.0 5.0 |
| absurd | Elf tegen elf, één bal, en een tribune die het allemaal beter weet. De bal heeft zijn eigen plan. | 18/20/20 | 58 | 2.7 3.0 3.7 5.0 5.0 |
| warm | Elf tegen elf, één bal en een stadion vol Grunnegers die het met liefde beter weten. | 19/19/22 | 60 | 3.3 2.3 4.3 5.0 5.0 |
| huidig | Hier zijn we dan: elf tegen elf, één bal en een heleboel Grunnegers die het beter weten. | 16/20/19 | 55 | 2.7 2.0 3.7 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: droog; warm-romantisch: warm. Zekerheid: midden. Keuze: **droog**.

### HV-06 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | De scheidsrechter kijkt op zijn horloge. Hij is altijd precies op tijd. Dat is zijn hele plan. | 23/20/21 | 64 | 4.0 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | De scheidsrechter kijkt op zijn horloge. Het horloge kijkt terug. Het kan beginnen. | 17/25/22 | 64 | 3.7 4.0 3.7 5.0 5.0 |
| warm | De scheidsrechter kijkt op zijn horloge. Het wordt een mooie middag. Het kan beginnen. | 16/19/17 | 52 | 2.3 1.7 3.3 5.0 5.0 |
| huidig | De scheidsrechter kijkt op zijn horloge. Het kan beginnen. | 18/19/18 | 55 | 3.0 1.3 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-07 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Het gras ruikt zoals bij het dorpsteam. Ik krijg er rugpijn van, maar het is fijn. | 20/20/21 | 61 | 3.3 3.0 4.0 5.0 5.0 |
| absurd (gekozen) | Ruik dat gras, Hilbrand. Dat ruikt naar mijn jeugd, een kantine en een zak sinaasappelpartjes. | 23/25/22 | 70 | 4.3 4.3 4.7 5.0 5.0 |
| warm | Dat gras ruikt precies zoals vroeger bij het dorpsteam, Hilbrand. Ik word er een beetje stil van. | 19/20/23 | 62 | 3.7 2.7 4.3 5.0 5.0 |
| huidig | Ik heb er zin in, Hilbrand. Het gras ruikt precies zoals vroeger bij het dorpsteam. | 16/20/17 | 53 | 2.3 2.0 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

### HV-08 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Let op de middenmoot. Dat zeg ik altijd. Meestal wordt het daar niet gewonnen, maar ik zeg het. | 23/20/23 | 66 | 3.7 3.7 4.7 5.0 5.0 |
| absurd (gekozen) | Let op de middenmoot, Hilbrand. Daar wordt het gewonnen. Of verloren. Of daar staat de koffie. | 20/21/24 | 65 | 4.0 3.3 4.3 5.0 5.0 |
| warm | Let op de middenmoot vandaag. Daar wordt het spel gemaakt, door mensen die niemand ziet. | 17/23/19 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| huidig | Let op de middenmoot vandaag. Daar wordt het gewonnen of verloren. | 18/22/17 | 57 | 3.0 2.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-09 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Mooie dag voor voetbal. Slechte dag voor wie zijn zonnebrand thuis liet. Dat ben ik. | 24/20/22 | 66 | 4.0 3.7 4.3 5.0 5.0 |
| absurd | Mooie dag voor voetbal. Slechte dag om een schaduw te zijn. | 17/20/19 | 56 | 2.7 3.0 3.0 5.0 5.0 |
| warm | Mooie dag voor voetbal. Wie in de zon zit heeft het warm, wie in de schaduw zit heeft het gezellig. | 17/20/19 | 56 | 2.7 2.7 3.3 5.0 5.0 |
| huidig | Mooie dag voor voetbal. Slechte dag om in de schaduw te zitten. | 19/25/18 | 62 | 3.7 3.3 3.7 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: droog. Zekerheid: midden. Keuze: **droog**.

### HV-10 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | De eerste tien minuten zijn de belangrijkste. Dat zeg ik elke week, en elke week heb ik gelijk. Behalve vorige week. | 21/20/23 | 64 | 3.7 3.3 4.3 5.0 5.0 |
| absurd (gekozen) | De eerste tien minuten zijn de belangrijkste. De laatste tien ook. De tien daartussen kijk ik even weg. | 23/20/24 | 67 | 4.0 3.7 4.7 5.0 5.0 |
| warm | De eerste tien minuten zijn de belangrijkste, zeg ik elke week. Mensen knikken dan zo vriendelijk, Hilbrand. | 20/25/22 | 67 | 4.0 4.0 4.3 5.0 5.0 |
| huidig | Ik zeg: de eerste tien minuten zijn de belangrijkste. Dat zeg ik elke week, en elke week heb ik gelijk. | 19/20/20 | 59 | 3.0 2.7 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: warm; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-11 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de aftrap van de wedstrijd (Euroborg, zomerdag). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Oma Trijntje zit op haar vaste plek. Dan weet je dat het menens is, en dat de thermosfles gevuld is. | 17/25/20 | 62 | 3.3 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | Oma Trijntje zit op haar vaste plek. Haar stoel is ouder dan het stadion. Dat is geen grap, dat is wetenschap. | 17/19/22 | 58 | 3.0 3.0 3.3 5.0 5.0 |
| warm | Oma Trijntje zit op haar vaste plek. Dan weet je: het wordt een goede dag. | 15/19/16 | 50 | 2.3 1.3 3.0 5.0 5.0 |
| huidig | Oma Trijntje zit op haar vaste plek. Dan weet je dat het menens is. | 21/19/19 | 59 | 3.7 2.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-12 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | En we zijn weer begonnen. In de rust is niemand slimmer geworden, wel vollere magen. | 20/20/22 | 62 | 3.3 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | Tweede helft! De spelers komen terug met een kop thee en nieuwe plannen. Het plan is: de bal. | 22/25/23 | 70 | 4.3 4.3 4.7 5.0 5.0 |
| warm | En we zijn er weer, de tweede helft. De zon staat lager en alles is nog mogelijk. | 16/18/21 | 55 | 3.0 1.7 3.7 5.0 5.0 |
| huidig | En we zijn weer begonnen. De tweede helft, met de rust nog in de benen. | 17/20/17 | 54 | 2.7 2.0 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-13 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | De spelers staan weer klaar. Alles kan nog. Vooral de dingen die niet kunnen. | 22/19/21 | 62 | 3.7 3.0 4.0 5.0 5.0 |
| absurd (gekozen) | De spelers staan weer klaar. Alles kan nog, joh. Ook dat de bal naar de kantine rolt. | 20/25/22 | 67 | 4.0 4.0 4.3 5.0 5.0 |
| warm | De spelers staan weer klaar, en alles kan nog, joh. Dat is het mooiste van de tweede helft. | 18/19/20 | 57 | 3.0 1.7 4.3 5.0 5.0 |
| huidig | De spelers staan weer klaar. Alles kan nog, joh. | 22/19/19 | 60 | 3.7 2.0 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-14 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Daar gaan we weer. De thermosfles is leeg, de spanning niet. Dat is een goede verhouding. | 18/20/21 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| absurd (gekozen) | Daar gaan we weer! De thermosfles is leeg, maar Oma Trijntje heeft een tweede. Ze heeft altijd een tweede. | 21/25/24 | 70 | 4.3 4.3 4.7 5.0 5.0 |
| warm | Daar gaan we weer. Oma Trijntje schenkt de laatste kop in. De thermosfles is leeg, de spanning niet. | 19/19/20 | 58 | 3.0 2.7 3.7 5.0 5.0 |
| huidig | Daar gaan we weer. De thermosfles is leeg, de spanning niet. | 24/19/19 | 62 | 3.7 2.7 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-15 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Tweede helft. Wie heeft in de rust het beste gepraat? Meestal degene die niet hoefde te lopen. | 20/20/21 | 61 | 3.0 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | Tweede helft! In de rust heeft de trainer een toespraak gehouden. De bal heeft er niets van gehoord. | 22/25/22 | 69 | 4.3 4.3 4.3 5.0 5.0 |
| warm | Tweede helft! Wie heeft in de rust het beste gepraat? Ik hoop de keeper, die had een kop thee nodig. | 17/18/22 | 57 | 3.0 2.3 3.7 5.0 5.0 |
| huidig | Tweede helft! Wie heeft in de rust het beste gepraat? | 20/21/19 | 60 | 3.7 2.3 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

### HV-16 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | In de rust wordt het gewonnen, zeggen ze. Of verloren. Of gewoon even gepauzeerd. Ik ben geen kaartlezer. | 17/20/18 | 55 | 2.7 2.3 3.3 5.0 5.0 |
| absurd (gekozen) | In de rust wordt het gewonnen, zeggen ze. Ik won ooit in de rust een worst. Dat was ook iets. | 24/25/25 | 74 | 4.7 5.0 5.0 5.0 5.0 |
| warm | In de rust wordt het gewonnen, zeggen ze. Ik zeg: in de rust wordt het geschonken. Koffie, bedoel ik, en moed. | 17/20/23 | 60 | 3.0 3.0 4.0 5.0 5.0 |
| huidig | In de rust wordt het gewonnen, zeggen ze. Of verloren. Het ligt eraan. | 19/19/16 | 54 | 2.7 1.7 3.7 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-17 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Ik ben benieuwd wie er nog benen heeft. Ik niet. Maar dat gaat niemand op tv zien. | 20/25/23 | 68 | 4.0 4.0 4.7 5.0 5.0 |
| absurd | Ik ben benieuwd wie er nog benen heeft. Bij ons liet er altijd één zijn benen thuis liggen. | 24/20/23 | 67 | 4.0 3.7 4.7 5.0 5.0 |
| warm | Ik ben benieuwd wie er nog benen heeft. Een hart hebben ze in elk geval allemaal. | 15/19/21 | 55 | 3.0 2.0 3.3 5.0 5.0 |
| huidig | Ik ben benieuwd wie er nog benen heeft. | 16/19/16 | 51 | 2.3 1.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: droog; warm-romantisch: droog. Zekerheid: midden. Keuze: **droog**.

### HV-18 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: de start van de tweede helft. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Nu komt het op conditie aan. En op koffie. Maar vooral op koffie. | 19/19/20 | 58 | 3.0 2.3 4.0 5.0 5.0 |
| absurd (gekozen) | Nu komt het op conditie aan. De conditie zit, geloof ik, in de linkerkuit. En in de koffie. | 17/25/20 | 62 | 3.3 3.3 4.0 5.0 5.0 |
| warm | Nu komt het op conditie aan. En op koffie. En op elkaar, maar dat zeg je niet hardop. | 18/20/24 | 62 | 3.3 3.3 4.0 5.0 5.0 |
| huidig | Nu komt het op conditie aan. En op koffie. | 23/19/19 | 61 | 3.7 2.3 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: warm. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: absurd). Keuze: **absurd**.

### HV-19 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een Groninger derby (twee ploegen uit dezelfde streek). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Een Groninger derby: niemand wil verliezen en iedereen kent elkaar. Dat maakt het rustig en gevaarlijk tegelijk. | 19/20/20 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| absurd (gekozen) | Een Groninger derby! Iedereen kent elkaar, dus als je scoort weet de keeper waar je woont. | 22/25/21 | 68 | 4.3 4.3 4.3 4.7 5.0 |
| warm | Een Groninger derby: niemand wil verliezen, iedereen kent elkaar. Straks drinken ze samen koffie. | 20/20/24 | 64 | 3.7 3.3 4.3 5.0 5.0 |
| huidig | Dit is wat we noemen een Groninger derby: niemand wil verliezen, iedereen kent elkaar. | 16/18/16 | 50 | 2.3 1.3 3.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

### HV-20 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een Groninger derby (twee ploegen uit dezelfde streek). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Een derby. Zweet, gras en een bakkie koffie na afloop. In die volgorde, meestal. | 21/18/21 | 60 | 3.7 2.7 3.7 5.0 5.0 |
| absurd (gekozen) | Een echte derby! Zweet, gras, en een bakkie koffie dat al koud wordt voor de aftrap. | 19/25/23 | 67 | 4.0 4.0 4.3 5.0 5.0 |
| warm | Een echte derby vandaag! Zweet, gras en na afloop een bakkie koffie voor iedereen. | 16/18/19 | 53 | 2.7 1.7 3.3 5.0 5.0 |
| huidig | Een echte derby vandaag! Dat is zweet, gras en een bakkie koffie na afloop. | 18/20/16 | 54 | 2.7 2.0 3.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-21 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een Groninger derby (twee ploegen uit dezelfde streek). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Het is een derby. De tribunes zijn kleurrijker dan anders, en luider. De koffie is hetzelfde. | 23/20/21 | 64 | 4.0 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | Het is een derby. De tribunes zijn kleurrijker dan anders. Iemand heeft een sjaal om zijn hond gedaan. | 23/25/25 | 73 | 4.7 5.0 4.7 5.0 5.0 |
| warm | Het is een derby. De tribunes zijn kleurrijker dan anders, en luider. Zo klinkt een dorp dat samen leeft. | 16/19/19 | 54 | 2.7 1.7 3.7 5.0 5.0 |
| huidig | Het is een derby. De tribunes zijn kleurrijker dan anders, en luider. | 18/19/16 | 53 | 2.7 1.7 3.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-22 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een Groninger derby (twee ploegen uit dezelfde streek). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Bij een derby zijn de regels dezelfde. De tackles zijn net wat stevigeres. Dat staat niet in het boekje, maar iedereen weet het. | 17/20/18 | 55 | 2.7 2.3 3.3 5.0 5.0 |
| absurd (gekozen) | Bij een derby zijn de regels dezelfde. De tackles zijn stevigeres. En de scheidsrechter houdt zijn pet extra vast. | 24/24/22 | 70 | 4.7 4.0 4.7 5.0 5.0 |
| warm | Bij een derby zijn de regels dezelfde. De tackles net wat stevigeres, de handdruk achteraf net wat warmer. | 20/20/24 | 64 | 3.7 3.3 4.3 5.0 5.0 |
| huidig | Bij een derby zijn de regels dezelfde, de tackles net iets stevigeres. | 17/18/18 | 53 | 2.3 2.0 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

### HV-23 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een Groninger derby (twee ploegen uit dezelfde streek). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Ik heb drie derby's gespeeld. Ik heb nog steeds ruzie met een buurman. Over een heg, geloof ik. | 23/20/22 | 65 | 3.7 3.7 4.3 5.0 5.0 |
| absurd (gekozen) | Ik heb drie derby's gespeeld. Ik heb nog steeds ruzie met een buurman. Hij weet niet meer waarover. Ik wel. | 22/25/25 | 72 | 4.7 4.7 4.7 5.0 5.0 |
| warm | Ik heb drie derby's gespeeld. Met die buurman heb ik nog steeds ruzie. Ik zou hem niet willen missen. | 17/18/23 | 58 | 3.0 2.7 3.7 5.0 5.0 |
| huidig | Ik heb in mijn tijd drie derby's gespeeld. Ik heb nog steeds ruzie met een buurman. | 19/20/22 | 61 | 3.3 3.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-24 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een Groninger derby (twee ploegen uit dezelfde streek). Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Niemand wil de buurman laten winnen. Dat is de eerste wet van het Noorden. De tweede is: bak er koffie bij. | 18/20/22 | 60 | 3.3 2.7 4.0 5.0 5.0 |
| absurd (gekozen) | Niemand wil de buurman laten winnen. Dat is de eerste wet van het Noorden. De tweede wet ligt onder een heg. | 22/25/19 | 66 | 4.0 4.0 4.0 5.0 5.0 |
| warm | Niemand wil de buurman laten winnen. Maar valt hij, dan help je hem op. Dat is de tweede wet. | 17/19/20 | 56 | 2.7 2.3 3.7 5.0 5.0 |
| huidig | Niemand wil de buurman laten winnen. Dat is de eerste wet van het Noorden. | 20/19/19 | 58 | 3.3 2.0 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: droog. Zekerheid: midden. Keuze: **absurd**.

### HV-25 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Wat een kans! Hij kon alles doen, maar hij deed net iets anders. Dat is ook een keuze. | 21/18/23 | 62 | 3.7 3.0 4.0 5.0 5.0 |
| absurd (gekozen) | Wat een kans! Hij kon alles doen, en hij koos de verrassendste optie. Dat was bijna kunst. | 18/24/22 | 64 | 3.7 3.7 4.0 5.0 5.0 |
| warm | Wat een kans! Hij kon alles doen, maar hij deed net iets anders. We geven hem een applausje. | 17/19/20 | 56 | 2.7 2.3 3.7 5.0 5.0 |
| huidig | Wat een kans! Hij kon alles doen, maar hij deed net iets anders. | 23/20/19 | 62 | 3.7 2.7 4.3 5.0 5.0 |

Stemmen: Gronings-droog: huidig; absurdist: absurd; warm-romantisch: droog. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: absurd). Keuze: **absurd**.

### HV-26 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Gevaar! Dat scheelde niet veel. Ongeveer de breedte van een goed excuus. | 20/20/22 | 62 | 3.3 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | Gevaar! Dat scheelde een duif. Een kleine. | 25/25/25 | 75 | 5.0 5.0 5.0 5.0 5.0 |
| warm | Gevaar! Dat scheelde niet veel. Mijn hart sloeg even over. | 16/18/17 | 51 | 2.3 1.7 3.0 5.0 5.0 |
| huidig | Gevaar! Dat scheelde niet veel. | 16/18/16 | 50 | 2.3 1.3 3.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-27 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Dat had een doelpunt moeten zijn, vind ik. Maar ik ben ook maar een mens met een microfoon. | 21/21/22 | 64 | 4.0 3.3 4.0 5.0 5.0 |
| absurd (gekozen) | Dat had een doelpunt moeten zijn. De bal weet dat ook. Hij kijkt nu heel erg naar het gras. | 21/25/23 | 69 | 4.0 4.3 4.7 5.0 5.0 |
| warm | Dat had een doelpunt moeten zijn, vind ik. Hij weet het zelf ook. Volgende keer. | 18/20/19 | 57 | 3.0 2.3 3.7 5.0 5.0 |
| huidig | Dat had een doelpunt moeten zijn, vind ik. | 19/18/16 | 53 | 3.0 1.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-28 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Een grote kans, en de bal gaat net naast. Net naast is mijn favoriete plek voor een bal. | 21/25/23 | 69 | 4.3 4.0 4.7 5.0 5.0 |
| absurd | Een grote kans! En de bal gaat net naast, naar een mooi stuk gras waar hij graag wilde liggen. | 18/20/21 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| warm | Een grote kans, en de bal gaat net naast. Een zucht uit de tribune, maar niemand gaat weg. | 22/19/19 | 60 | 3.3 2.3 4.3 5.0 5.0 |
| huidig | Een grote kans! En de bal gaat net naast. | 17/19/16 | 52 | 2.7 1.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: warm; absurdist: droog; warm-romantisch: droog. Zekerheid: midden. Keuze: **droog**.

### HV-29 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Dichtbij. Zo dichtbij dat je het ruikt. Maar het ging niet naar binnen. | 18/18/20 | 56 | 3.0 2.3 3.3 5.0 5.0 |
| absurd (gekozen) | Dichtbij! Heel dichtbij! Zo dichtbij dat de paal het voelde. | 22/25/24 | 71 | 4.7 4.3 4.7 5.0 5.0 |
| warm | Dichtbij! Heel dichtbij! De hele tribune ging mee omhoog. | 19/20/19 | 58 | 3.0 2.3 4.0 5.0 5.0 |
| huidig | Dichtbij! Heel dichtbij! | 18/19/16 | 53 | 2.7 1.3 3.7 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-30 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Daar komt een schot. Net niet. Net niet is ook een manier van aanwezig zijn. | 19/20/20 | 59 | 3.0 3.3 3.3 5.0 5.0 |
| absurd (gekozen) | Daar komt een schot! Net niet. Het schot had een afspraak en is te laat. | 22/25/24 | 71 | 4.7 4.3 4.7 5.0 5.0 |
| warm | Daar komt een schot! Net niet, net niet. Maar wat een poging, mensen. | 16/20/19 | 55 | 2.7 2.0 3.7 5.0 5.0 |
| huidig | Daar komt een schot! Net niet, net niet. | 17/20/16 | 53 | 2.7 1.7 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-31 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Bijna, bijna. De tribunes zuchten. Dat is de beste ademoefening van de dag. | 19/24/20 | 63 | 3.7 3.3 4.0 5.0 5.0 |
| absurd | Bijna, bijna! De tribunes zuchten. Zeven vlaggen gaan tegelijk omlaag. | 19/20/20 | 59 | 3.0 3.3 3.3 5.0 5.0 |
| warm (gekozen) | Bijna, bijna! De tribunes zuchten. En dan klappen ze toch. Dat is Grunn. | 22/20/24 | 66 | 4.0 3.3 4.7 5.0 5.0 |
| huidig | Bijna, bijna! De tribunes zuchten. | 17/18/16 | 51 | 2.7 1.3 3.0 5.0 5.0 |

Stemmen: Gronings-droog: warm; absurdist: droog; warm-romantisch: warm. Zekerheid: midden. Keuze: **warm**.

### HV-32 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Wat een mogelijkheid, maar de afwerking klopt niet. Alles klopt, behalve het eind. | 22/20/20 | 62 | 3.7 3.0 4.0 5.0 5.0 |
| absurd (gekozen) | Wat een mogelijkheid! Maar de afwerking klopt niet. Hij had de bal eerst moeten vragen waar hij heen wilde. | 18/25/22 | 65 | 3.7 4.0 4.0 5.0 5.0 |
| warm | Wat een mogelijkheid. De afwerking klopt nog niet, maar de wil is er. Dat zie je toch? | 15/20/20 | 55 | 2.7 2.0 3.7 5.0 5.0 |
| huidig | Wat een mogelijkheid, maar de afwerking klopt niet. | 17/18/16 | 51 | 2.7 1.3 3.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: absurd. Zekerheid: midden. Keuze: **absurd**.

### HV-33 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Die moet erin, Hilbrand. Mijn oma had hem gescoord. Met haar tas aan haar arm. | 24/25/22 | 71 | 4.3 4.7 4.7 5.0 5.0 |
| absurd | Die moet erin, Hilbrand. Zelfs mijn oma had die gescoord. En zij houdt niet eens van voetbal. | 20/20/24 | 64 | 3.7 3.3 4.3 5.0 5.0 |
| warm | Die moet erin, Hilbrand. Zelfs mijn oma had die gescoord, en ik hou van mijn oma. | 17/19/22 | 58 | 3.0 2.3 4.0 5.0 5.0 |
| huidig | Die moet er in, Hilbrand. Zelfs mijn oma had die gescoord. | 20/19/20 | 59 | 3.3 2.3 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: droog; warm-romantisch: absurd. Zekerheid: midden. Keuze: **droog**.

### HV-34 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog (gekozen) | Het verschil tussen goed en geweldig is tien centimeter. Ik heb ze nooit gehad. | 24/25/24 | 73 | 5.0 4.3 5.0 5.0 5.0 |
| absurd | Het verschil tussen goed en geweldig: de laatste tien centimeter. En een speler die niet naar de wolken kijkt. | 17/18/17 | 52 | 2.3 2.0 3.0 5.0 5.0 |
| warm | Het verschil tussen goed en geweldig is de laatste tien centimeter. Maar goed komt ook een heel eind. | 17/18/20 | 55 | 2.7 2.3 3.3 5.0 5.0 |
| huidig | Dat is het verschil tussen een goed en een geweldig schot: de laatste tien centimeter. | 19/20/19 | 58 | 3.0 2.3 4.0 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: droog; warm-romantisch: droog. Zekerheid: hoog. Keuze: **droog**.

### HV-35 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Net als bij het dorpsteam: eerst bijna, dan koffie. Het was een goed systeem. | 17/20/20 | 57 | 2.7 2.7 3.7 5.0 5.0 |
| absurd (gekozen) | Net als bij het dorpsteam: eerst bijna, dan koffie, dan een discussie over de koffie. | 22/25/22 | 69 | 4.3 4.3 4.3 5.0 5.0 |
| warm | Net als bij het dorpsteam: eerst bijna, dan koffie. Het mooiste was altijd de koffie. | 19/20/24 | 63 | 3.7 3.0 4.3 5.0 5.0 |
| huidig | Net als bij het dorpsteam: eerst bijna, dan koffie. | 20/18/22 | 60 | 3.7 2.3 4.0 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: warm. Zekerheid: midden. Keuze: **absurd**.

### HV-36 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Hij keek te veel naar de keeper en te weinig naar de bal. De bal heeft dat gemerkt. | 22/20/22 | 64 | 3.7 3.7 4.0 5.0 5.0 |
| absurd | Hij keek te veel naar de keeper en te weinig naar de bal. Het is een kwestie van wie je vrienden zijn. | 17/20/17 | 54 | 2.3 2.7 3.0 5.0 5.0 |
| warm (gekozen) | Hij keek te veel naar de keeper. Dat is lief, maar de bal wil ook aandacht. | 18/25/24 | 67 | 4.0 4.0 4.3 5.0 5.0 |
| huidig | Hij keek te veel naar de keeper en te weinig naar de bal. | 19/19/16 | 54 | 3.0 1.3 3.7 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: warm; warm-romantisch: warm. Zekerheid: midden. Keuze: **warm**.

### HV-37 (ROELIE)

ROELIE (kleurcommentator, droog, speelde jaren in het dorpsteam, weet het altijd net iets beter). Moment: een grote kans die net niet leidt tot een doelpunt. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Pech. En een beetje onhandig. Voornamelijk onhandig. | 24/20/20 | 64 | 3.7 3.3 4.3 5.0 5.0 |
| absurd | Pech. En een beetje onhandig. Het gras had zijn voet in de weg gelegd, geloof ik. | 18/25/20 | 63 | 3.3 3.7 4.0 5.0 5.0 |
| warm (gekozen) | Pech. En een beetje onhandig. Dat overkomt de beste, Hilbrand. Mij ook, vorige week bij de bakker. | 20/21/24 | 65 | 4.0 3.3 4.3 5.0 5.0 |
| huidig | Pech. En een beetje onhandig. | 19/18/16 | 53 | 3.0 1.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: droog; absurdist: absurd; warm-romantisch: warm. Zekerheid: laag (1-1-1; de hoogste scoresom beslist: warm). Keuze: **warm**.

### HV-38 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een schot op doel. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Een schot. Het gaat hard. Voor zover een bal dat doet. | 20/20/21 | 61 | 3.7 3.0 3.7 5.0 5.0 |
| absurd (gekozen) | Een schot! Het gaat zo hard dat het gras het nog even moet verwerken. | 21/25/22 | 68 | 4.0 4.3 4.3 5.0 5.0 |
| warm | Een schot! Het gaat hard, en de hele tribune gaat mee. | 17/19/19 | 55 | 3.0 1.7 3.7 5.0 5.0 |
| huidig | Een schot! Het gaat hard. | 19/18/16 | 53 | 3.0 1.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-39 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een schot op doel. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Hij haalt uit. Met zijn been, voor de duidelijkheid. | 17/20/21 | 58 | 3.0 3.3 3.0 5.0 5.0 |
| absurd (gekozen) | Hij haalt uit! Zijn been maakt een cirkel waar een boer in Warffum trots op zou zijn. | 22/25/23 | 70 | 4.3 4.7 4.3 5.0 5.0 |
| warm | Hij haalt uit! Kom op, jongen, geef alles wat je hebt! | 16/18/19 | 53 | 2.7 1.7 3.3 5.0 5.0 |
| huidig | Hij haalt uit! | 19/18/16 | 53 | 3.0 1.3 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.

### HV-40 (HILBRAND)

HILBRAND (verslaggever, warm en vol vuur, praat het spel; Gronings "joh" en "nait" mogen met zorg). Moment: een schot op doel. Eén vaste commentaarregel, uitgesproken in de uitzending; het spel is een open-wereld-komedie in een low-poly Groningen, altijd zomer.

| optie | tekst | scores per beoordelaar (totaal van 25) | som | gem. [timing verrassing past geenleed geenmerk] |
|---|---|---|---|---|
| droog | Daar gaat de bal, richting het doel. Voor het eerst vandaag weet hij waar hij heen wil. | 19/20/20 | 59 | 3.0 3.0 3.7 5.0 5.0 |
| absurd (gekozen) | Daar gaat de bal, richting het doel! Hij heeft een afspraak met de keeper en komt een beetje te vroeg. | 22/25/24 | 71 | 4.7 4.3 4.7 5.0 5.0 |
| warm | Daar gaat de bal, richting het doel! Alle ogen volgen hem, alle harten ook. | 18/18/19 | 55 | 3.0 1.7 3.7 5.0 5.0 |
| huidig | Daar gaat de bal, richting het doel. | 17/20/16 | 53 | 2.7 1.7 3.3 5.0 5.0 |

Stemmen: Gronings-droog: absurd; absurdist: absurd; warm-romantisch: absurd. Zekerheid: hoog. Keuze: **absurd**.
