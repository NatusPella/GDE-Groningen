# Humorpaneel 22-11: de nieuwe verhaalregels (epic #1121)

Scope: alle humorvoorstellen die op 21-11 nog niet beoordeeld waren: HE-01 tot HE-08 (slot, F1-F6), HJ-01 tot HJ-09 (Jelle en de romance, J1-J6), HK-01 tot HK-04 (K1-K3) en HN-16 tot HN-19 (N9-N12). In totaal 25 beats. De bestanden: `game/storydata/humor.eind.json`, `humor.jelle.json`, `humor.k.json` en `humor.ronde5.json`. De veto-lijst voor de eigenaar staat onderaan; de volledige lijst staat in [HUMOR-KEUZELIJST.md](HUMOR-KEUZELIJST.md) (gegenereerd).

## Werkwijze en eerlijke kanttekening

- Per beat vier kandidaten: het bestaande (variant 1 in het bestand, index 0), plus een nieuwe droge (index 1), een absurde (index 2) en een warme (index 3). Het neutrale terugvalalternatief blijft zoals het was.
- Drie beoordelaarsrollen: Gronings-droog, absurdist en warm-romantisch. Elke rol kreeg de beats in een eigen willekeurige volgorde (vaste zaden 11, 222 en 3333) en de kandidaten in een eigen willekeurige positie (A tot D), scoorde 1 tot 5 per kandidaat en schreef een reden. De ontsleuteling gebeurde pas daarna met een script.
- Wegingen: de droge beoordelaar telt 1,25; bij de Jelle-bureaucratie-beats (HJ-01, HJ-06, HE-04, HE-05) 1,5. De anderen tellen 1.
- Het bestaande blijft staan tenzij de winnaar het met minstens 1,0 gewogen punt verslaat (conservatief: het bestaande is al in de scène getoetst). Bij een gelijke stand wint het bestaande.
- Stemmen in het bestand: de topscore van elke beoordelaar; bij 1-1-1 is `tiebreak` de gewogen winnaar. Zekerheid: hoog bij een gewogen voorsprong van 3,5 of meer, midden vanaf 1,5, anders laag; bij een 1-1-1 met minder dan 3 voorsprong altijd laag.
- **Niet onafhankelijk getoetst.** Er was geen aparte subagent-tool beschikbaar; één model (de schrijver van de kandidaten) speelde de drie rollen achter elkaar, zonder de eigen scores van de vorige ronde in beeld. Dat is zwakker dan drie echte beoordelaars. Daarom staat hieronder een veto-lijst, en daarom zijn veel beats "laag".
- Een bestaande regel hoort bij de scène: de regels ná de grap (Tessa: "Pak je sokken.", Douwe: "Mogen wij ook soep?", enzovoort) zijn niet veranderd, dus elke kandidaat moet daarop aansluiten. Kandidaten die dat niet deden, zijn niet geschreven.

## Resultaat in cijfers

- 25 beats beoordeeld; 21 nieuwe winnaars (droog 11, absurd 8, warm 2); 4 keer blijft het bestaande staan.
- Zekerheid: hoog 2, midden 0, laag 23.
- Een telfout gevonden en gerepareerd: HE-06 ("Dat waren er drie. Kon meer.") telde de woorden van "Hier. Met jou erbij." verkeerd; het zijn er vier. De bron (`09-script-akte5.md`) en het spel zeggen nu vier, en de gekozen regel noemt ook de vijf van de Grote Markt.
- Zes regels die al waren ingesproken zijn vervangen (HN-18, HJ-06, HJ-07, HJ-08, HE-05, HE-06); die komen via `scripts/voice_wacht.json` in de TTS-ronde. In `voice_wacht.json` kwamen 7 sleutels bij en vielen 2 weg (oude tekst van een regel die al wachtte); de overige gewijzigde regels waren al tekst-alleen.
- De Groningse spreektekst voor de nieuwe Sjabbe-regel (HK-04) staat in `scripts/gronings_spoken.json` ("zied" voor "sinds"; houd dit nog even tegen een Gronings-sprekende lezer).

## Veto-lijst voor de eigenaar (de 15 onzekerste)

Je hoeft niets te doen. Wil je een andere kandidaat: zet `chosen` van de beat in het bijbehorende `humor.*.json` op 0 (bestaand), 1 (droog), 2 (absurd) of 3 (warm) en draai `node scripts/build_story_data.mjs`. Gesorteerd van onzeker naar minder onzeker (kleinste gewogen voorsprong eerst).

- **HJ-03** (J3, ANNEKE): gekozen (bestaand) "Een bank voor drie. Jullie gebruiken anderhalf."; voorsprong 0.0; stemmen bestaand, absurd, warm. Naaste alternatief: "Een bank voor drie. Jullie nemen de uiteinden.".
- **HN-19** (N9, TAMMO): gekozen (absurd) "Ik kijk naar de beer. Hij kijkt terug."; voorsprong 0.0; stemmen droog, absurd, warm. Naaste alternatief: "Ik kijk naar iets moois. Ik noem het de beer.".
- **HE-02** (F2, TAMMO): gekozen (bestaand) "Is dat een knop of een gebed?"; voorsprong 0.3; stemmen bestaand, absurd, warm. Naaste alternatief: "Is dat een knop of een voorgevoel?".
- **HJ-02** (J2, LAMMERT): gekozen (bestaand) "Een vraag. Zonder envelop. Dat heeft Jelle nog nooit geprobeerd."; voorsprong 0.3; stemmen droog, absurd, warm. Naaste alternatief: "Een vraag. Gratis. Dat is hier ongebruikelijk.".
- **HE-04** (F4, TAMMO): gekozen (bestaand) "Ik heb ook geen vergunning."; voorsprong 0.5; stemmen bestaand, absurd, warm. Naaste alternatief: "Mijn vuist wacht op goedkeuring.".
- **HJ-09** (J6, TAMMO): gekozen (droog) "Een man mag naar soep lachen."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "De soep zei net iets over een duif.".
- **HN-16** (N10, TERRASGAST): gekozen (droog) "Ik bedoelde de rekening. Samen of apart?"; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Ik bedoelde de rekening. Maar ik wens jullie het beste.".
- **HE-03** (F3, TAMMO): gekozen (absurd) "Ik ben het niemandsland. Met soep."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Ik ben de onderhandeling. Ze zijn nog bezig.".
- **HE-06** (F5, TESSA): gekozen (droog) "Vier woorden. Op de Grote Markt waren het er vijf."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Vier woorden. Ik neem ze alle vier.".
- **HE-07** (F5, TAMMO): gekozen (absurd) "Berend telde elf seconden en een duif telde mee. Dat is officieel."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Elf seconden, door Berend genoteerd. Dat telt als stel.".
- **HJ-07** (J5, TESSA): gekozen (absurd) "Het is een eierbal. Hij heeft nog geen vergunning om zo te ruiken."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Een eierbal met een briefje. Dat is geen bewijs.".
- **HK-04** (K3, SJABBE): gekozen (absurd) "Dat is mijn zin. Hij ligt hier al sinds 1974."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Dat is mijn zin. Hij is niet te koop.".
- **HN-17** (N12, TAMMO): gekozen (droog) "Daar kan ik geen bezwaar tegen maken."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Zet er maar een duif bij. Voor de zekerheid.".
- **HN-18** (N9, TESSA): gekozen (absurd) "Het schaap heeft nu een sok en een mening."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Het schaap eet je sok. Het kauwt zorgvuldig.".
- **HJ-01** (J1, TAMMO): gekozen (droog) "Dan maken wij eerst bezwaar tegen zijn bezwaar."; voorsprong 1.0; stemmen droog, absurd, warm. Naaste alternatief: "Ik heb nog geen bezwaar. Mag ik een nummertje?".

## Per beat

Kolommen: bestaand, droog, absurd, warm; gewogen totalen. De scores per beoordelaar staan tussen haakjes (droog, absurd, warm).

### HN-16 (N10, TERRASGAST)

Terras aan de Grote Markt. De gast vroeg of Tammo en Tessa al samen zijn; zij beantwoorden dat als vraag over hun relatie. De gast bedoelde iets heel anders.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik bedoelde de rekening. | 3 | 1 | 2 | 6.8 |
| droog (gekozen) | Ik bedoelde de rekening. Samen of apart? | 5 | 3 | 3 | 12.3 |
| absurd | Ik bedoelde de rekening, maar nu moet ik ook de rest weten. | 3 | 4 | 3 | 10.8 |
| warm | Ik bedoelde de rekening. Maar ik wens jullie het beste. | 3 | 3 | 5 | 11.8 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Samen of apart? sluit op Ah. Ja. Samen."; absurd "Nieuwsgierigheid die niet bij de rekening hoorde."; warm "Ik wens jullie het beste: een vreemde die meeleeft.".

### HN-17 (N12, TAMMO)

De flat, bij de koelkast. Tessa heeft een lijstje gemaakt van wie wat kan en zet SAMEN met een dubbele punt op een lege regel. Tammo kijkt naar de lege regel en dan naar haar.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat wordt een mooie regel. | 3 | 2 | 3 | 8.8 |
| droog (gekozen) | Daar kan ik geen bezwaar tegen maken. | 5 | 2 | 3 | 11.3 |
| absurd | Zet er maar een duif bij. Voor de zekerheid. | 2 | 5 | 3 | 10.5 |
| warm | Ik hoop dat die regel nooit af is. | 2 | 3 | 5 | 10.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Geen bezwaar: bureaucratisch tederheid."; absurd "De duif op de lege regel, onverwacht en in thema."; warm "Nooit af: de lege regel is het cadeau.".

### HK-01 (K1, GEESJE)

Achter de pastorie in Warffum. Tessa zegt dat ze de sleutel van de schuur niet pakt; Geesje wijst naar de spijker en laat haar bezwaar in de lucht hangen.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat hoeft ook niet. | 4 | 1 | 3 | 9.0 |
| droog (gekozen) | Nee. Hij hangt er al veertig jaar. Hij wacht wel. | 5 | 3 | 4 | 13.3 |
| absurd | Dat hoeft ook niet. De spijker hoort alles. | 2 | 4 | 2 | 8.5 |
| warm | Dat hoeft ook niet. Ik zie het aan je. | 2 | 2 | 5 | 9.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: hoog. Redenen: droog "Veertig jaar wachten: Gronings."; absurd "De spijker hoort alles."; warm "Ik zie het aan je: Geesje kent Tessa.".

### HK-02 (K2, TAMMO)

De kade van Zoutkamp bij zonsopgang. Tammo zegt dat hij het al lang wist en Tessa vraagt wat; hij redt zich met een heel kleine waarheid in plaats van het grote woord.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat je je koffie met melk drinkt. | 4 | 1 | 3 | 9.0 |
| droog (gekozen) | Hoeveel melk je in je koffie doet. Twee scheuten. | 4 | 3 | 3 | 11.0 |
| absurd | Dat je koffie met melk drinkt. Ik heb er al een thermoskan voor. | 2 | 4 | 3 | 9.5 |
| warm | Dat je je koffie met melk drinkt. Ik denk er elke ochtend aan. | 2 | 2 | 5 | 9.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Twee scheuten: heel kleine waarheid."; absurd "De thermoskan is een plan in plaats van een gevoel."; warm "Elke ochtend: een grote waarheid in een kleine zin.".

### HK-03 (K2, TESSA)

De kade van Zoutkamp. Na het bijna-moment proeft Tessa van de koffie die Tammo sinds half zes warm hield; zij ontkent met een droge zin dat er iets gebeurd is.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Hij is lauw. | 3 | 2 | 3 | 8.8 |
| droog (gekozen) | Hij is lauw. Dat is alles wat hier gebeurd is. | 5 | 3 | 3 | 12.3 |
| absurd | Hij is lauw. De koffie. Niet ik. | 3 | 4 | 2 | 9.8 |
| warm | Hij is lauw. Hij is precies goed. | 2 | 3 | 5 | 10.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Ontkenning die zichzelf verraadt."; absurd "De koffie, niet ik: verdedigt zichzelf te laat."; warm "Precies goed: ze zegt lauw en bedoelt iets anders.".

### HK-04 (K3, SJABBE)

Het havenkantoor, drie uur in de nacht. Sjabbe herhaalt zijn eigen vaste zin op het moment dat Tessa hem, onbedoeld, citeert; hij neemt hem terug alsof het een contract is.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat is mijn zin. | 3 | 1 | 2 | 6.8 |
| droog | Dat is mijn zin. Hij is niet te koop. | 4 | 3 | 2 | 10.0 |
| absurd (gekozen) | Dat is mijn zin. Hij ligt hier al sinds 1974. | 3 | 5 | 2 | 10.8 |
| warm | Dat is mijn zin. Maar jij mag hem hebben. | 2 | 2 | 5 | 9.5 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Niet te koop: contractdroog."; absurd "De zin ligt er sinds 1974."; warm "Jij mag hem hebben: Sjabbe geeft haar de zin.".

### HJ-01 (J1, TAMMO)

De flat in Paddepoel. Tessa leest een brief voor: Jelle heeft bezwaar ingediend tegen hun parkeervergunning. Tammo reageert droog; Tessa: 'Dat is het probleem. Hij was eerder.'

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Wij hebben nog geen bezwaar. | 3 | 1 | 2 | 7.5 |
| droog (gekozen) | Dan maken wij eerst bezwaar tegen zijn bezwaar. | 5 | 3 | 3 | 13.5 |
| absurd | Ik heb nog geen bezwaar. Mag ik een nummertje? | 3 | 5 | 3 | 12.5 |
| warm | Wij hebben nog nergens bezwaar tegen. We zijn net begonnen. | 2 | 2 | 5 | 10.0 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Bezwaar tegen bezwaar: Jelle-bureaucratie."; absurd "Een nummertje voor het bezwaar."; warm "We zijn net begonnen: Tammo en Tessa als team.".

### HJ-02 (J2, LAMMERT)

Appingedam, op de brug. Lammert krijgt een envelop met gratis frikandellen van Jelle om de kade niet aan Tammo en Tessa te geven. Tammo vraagt wat hij dan wel aanneemt.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Een vraag. Zonder envelop. Dat heeft Jelle nog nooit geprobeerd. | 4 | 3 | 3 | 11.0 |
| droog | Een vraag. Gratis. Dat is hier ongebruikelijk. | 5 | 2 | 3 | 11.3 |
| absurd | Een vraag. De frikandellen vroegen niks en keken me wel aan. | 2 | 5 | 2 | 9.5 |
| warm | Een vraag. Van mens tot mens. Dat is lang geleden. | 3 | 2 | 5 | 10.8 |

Stemmen: droog, absurd, warm. Keuze: bestaand (bestaand behouden: de winnaar versloeg het niet met 1,0). Zekerheid: laag. Redenen: droog "Gratis is ongebruikelijk: droog en kort."; absurd "De frikandellen kijken terug."; warm "Van mens tot mens: de brug wordt een gesprek.".

### HJ-03 (J3, ANNEKE)

Het erf bij Siddeburen, de dag na de kus in de botsauto. Tessa en Tammo zitten een halve meter uit elkaar op een bank. Tessa's moeder merkt het meteen op.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Een bank voor drie. Jullie gebruiken anderhalf. | 4 | 3 | 3 | 11.0 |
| droog | Een bank voor drie. Jullie nemen de uiteinden. | 4 | 3 | 3 | 11.0 |
| absurd | Daar past mijn breiwerk tussen. En mijn mening. | 3 | 5 | 2 | 10.8 |
| warm | Er is plek voor een derde. Of voor jullie samen. | 2 | 2 | 5 | 9.5 |

Stemmen: bestaand, absurd, warm. Keuze: bestaand. Zekerheid: laag. Redenen: droog "Uiteinden is Groninger understatement."; absurd "Breiwerk en mening tussen hen in."; warm "Plek voor jullie samen: zacht schuiven.".

### HJ-04 (J3, ANNEKE)

Koffie op het erf. Tammo begint 'Tessa, eigenlijk' (de onvoltooide zin), Tessa's moeder legt haar breiwerk neer en luistert. Tammo maakt de zin af over de koffie.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat dacht ik al. | 4 | 1 | 2 | 8.0 |
| droog (gekozen) | Dat was niet de zin waar je mee begon. | 5 | 2 | 4 | 12.3 |
| absurd | Ik zet er een pot extra voor. Je gaat het nodig hebben. | 3 | 4 | 3 | 10.8 |
| warm | Neem de tijd, jongen. De koffie loopt niet weg. | 3 | 2 | 5 | 10.8 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Tammo's afgebroken zin wordt droog teruggelegd."; absurd "Een extra pot: ze verwacht een lang verhaal."; warm "Neem de tijd: moeder wacht op wat hij niet zegt.".

### HJ-05 (J4, FEMKE)

Dubbele date op een terras in Veendam. Tammo en Tessa zeggen allebei dat het geen date is; Tessa schrijft de rekening in haar kasboekje. Femke legt het vast.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat zegt hij ook. | 3 | 1 | 2 | 6.8 |
| droog | Dat zei hij net ook. In dezelfde toonhoogte. | 4 | 2 | 3 | 10.0 |
| absurd | Als jullie het tegelijk zeggen, noemen wij het een duet. | 2 | 4 | 3 | 9.5 |
| warm (gekozen) | Jullie zijn al een koor. Dat is een begin. | 3 | 3 | 5 | 11.8 |

Stemmen: droog, absurd, warm. Keuze: warm. Zekerheid: laag. Redenen: droog "Dezelfde toonhoogte: precies opgemerkt."; absurd "Duet is een grap in beeld."; warm "Een koor is al een begin.".

### HJ-06 (J5, TESSA)

Stadskanaal. Jelle laat een wielklem op de Escapade zetten met een verzonnen artikel; Tessa heeft in J1 al zijn brieven gelezen en slaat terug met artikel 9.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Brief vier. Ik heb ze allemaal gelezen. | 3 | 1 | 2 | 7.5 |
| droog (gekozen) | Brief vier, alinea twee. Het staat er gewoon. | 5 | 3 | 3 | 13.5 |
| absurd | Brief vier. Ik heb ze voorgelezen aan de koelkast. | 2 | 5 | 3 | 11.0 |
| warm | Brief vier. Tammo en ik lazen ze samen. Het was gezellig. | 1 | 2 | 5 | 8.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Het staat er gewoon: Tessa de jurist."; absurd "Brieven voorlezen aan de koelkast: stil en zeker."; warm "Samen gelezen: de romance zit in de brieven.".

### HJ-07 (J5, TESSA)

Jelle klapt de broodtrommel open die Douwe hem geeft: een warme eierbal met een briefje. Tessa (die zijn oma Mem kent maar het niet zegt) kijkt te lang. Tammo merkt het op.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Het is een eierbal. | 3 | 1 | 2 | 6.8 |
| droog | Een eierbal met een briefje. Dat is geen bewijs. | 4 | 2 | 3 | 10.0 |
| absurd (gekozen) | Het is een eierbal. Hij heeft nog geen vergunning om zo te ruiken. | 3 | 5 | 2 | 10.8 |
| warm | Het is een eierbal. Iemand denkt aan hem. | 2 | 2 | 5 | 9.5 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Dat is geen bewijs: Tessa verdedigt zich."; absurd "Een eierbal zonder vergunning om te ruiken."; warm "Iemand denkt aan hem: Mem zit in de eierbal.".

### HJ-08 (J6, TESSA)

De flat. Beppe vraagt in het Fries wanneer ze trouwen. Tessa begint 'wij zijn...', Tammo zegt 'Huisgenoten' en Tessa maakt het af met het vakje dat ze eerder op het formulier aankruiste.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Overig. | 4 | 1 | 2 | 8.0 |
| droog (gekozen) | Overig. Dat was het enige vakje dat nog open was. | 5 | 3 | 3 | 12.3 |
| absurd | Overig. Wij hebben ook een eigen formulier. Nog niet ingediend. | 2 | 4 | 3 | 9.5 |
| warm | Overig. Voorlopig. | 3 | 2 | 5 | 10.8 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Het enige vakje dat nog open was: formulierdroogte."; absurd "Een eigen formulier, nog niet ingediend: absurd en bij Tessa passend."; warm "Voorlopig: ze zegt het zonder het te zeggen.".

### HJ-09 (J6, TAMMO)

Na zijn dagdroom (de bruiloft bij de snackwagen, de duif met de ringen) schrikt Tammo wakker. Tessa zegt dat hij naar de soep lacht.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Het is goede soep. | 3 | 1 | 2 | 6.8 |
| droog (gekozen) | Een man mag naar soep lachen. | 4 | 2 | 3 | 10.0 |
| absurd | De soep zei net iets over een duif. | 2 | 5 | 2 | 9.5 |
| warm | Ik dacht aan iets moois. De soep mocht meekijken. | 2 | 2 | 5 | 9.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Een man mag: droog, geen uitleg."; absurd "De soep spreekt over een duif."; warm "De soep mocht meekijken: hij wil het nog niet zeggen.".

### HE-01 (F1, TAMMO)

Langs de zandweg bij Zuidhorn, bij de verroeste frituuraanhanger. Tessa kijkt verlangend naar het luik; Tammo zegt dat ze kijkt zoals hij naar... en wordt onderbroken door haar vraag.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Naar de motor. | 4 | 1 | 2 | 8.0 |
| droog | Naar de motor. Ik geef het toe. | 3 | 2 | 3 | 8.8 |
| absurd (gekozen) | Naar de motor. Die ik er in gedachten al in heb gezet. | 3 | 5 | 3 | 11.8 |
| warm | Naar een motor. Voorzichtig. Met open mond. | 2 | 3 | 5 | 10.5 |

Stemmen: bestaand, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Kaal blijft beter."; absurd "Een motor in gedachten geplaatst: de wagen is een droom."; warm "Met open mond: verliefd op de motor.".

### HE-02 (F2, TAMMO)

Loods in Hoogkerk, de eerste bak. Tessa zegt dat hij de friteuse moet aanzetten; Tammo, die alleen motoren kent, vraagt wat voor knop het is.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Is dat een knop of een gebed? | 4 | 3 | 2 | 10.0 |
| droog | Is dat een knop of een voorgevoel? | 3 | 3 | 3 | 9.8 |
| absurd | Is dat een knop? Hij kijkt me aan. | 2 | 5 | 2 | 9.5 |
| warm | Is dat een knop? Ik doe het voor jou. En voor Oma. | 2 | 2 | 5 | 9.5 |

Stemmen: bestaand, absurd, warm. Keuze: bestaand. Zekerheid: laag. Redenen: droog "Voorgevoel is droog, gebed blijft staan."; absurd "De knop kijkt terug."; warm "Voor jou en voor Oma: Tammo durft.".

### HE-03 (F3, TAMMO)

Oma's keuken, Oma Trijntje (Gronings) en Beppe (Fries) kijken elkaar aan als een grensgeschil. Tessa noemt Tammo, die van beide oma's is, de verzoening.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik ben het compromis. | 3 | 1 | 2 | 6.8 |
| droog | Ik ben de onderhandeling. Ze zijn nog bezig. | 4 | 3 | 3 | 11.0 |
| absurd (gekozen) | Ik ben het niemandsland. Met soep. | 3 | 5 | 3 | 11.8 |
| warm | Ik ben waar ze elkaar ontmoeten. Dat is een goede plek. | 2 | 2 | 5 | 9.5 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Ze zijn nog bezig: onderhandelingsdroog."; absurd "Niemandsland met soep: een grens met een pan."; warm "Waar ze elkaar ontmoeten: de verzoening zelf.".

### HE-04 (F4, TAMMO)

Vismarkt, Jelle staat achteraan de rij. Tessa zegt dat Tammo hem één klap mag geven; Jelle merkt op dat het niet in zijn vergunning staat.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Ik heb ook geen vergunning. | 4 | 2 | 3 | 11.0 |
| droog | Daar heb ik geen vergunning voor. | 4 | 2 | 3 | 11.0 |
| absurd | Mijn vuist wacht op goedkeuring. | 3 | 5 | 2 | 11.5 |
| warm | Laat maar. Ik heb ook geen vergunning. | 2 | 2 | 4 | 9.0 |

Stemmen: bestaand, absurd, warm. Keuze: bestaand (bestaand behouden: de winnaar versloeg het niet met 1,0). Zekerheid: laag. Redenen: droog "De herhaling draagt het, kaal of met daar."; absurd "De vuist wacht op goedkeuring."; warm "Laat maar: de zachtmoedige Tammo.".

### HE-05 (F4, JELLE)

Vismarkt, aan het luik. Tessa vraagt een euro vijftig voor de eierbal en zegt dat dit de prijs is. Zijn eerste echte nederlaag in een onderhandeling.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | ...Dat is de eerste prijs die ik niet kon onderhandelen. | 4 | 3 | 3 | 12.0 |
| droog | ...Geen staffel, geen korting. Dit is een vreemd systeem. | 3 | 3 | 2 | 9.5 |
| absurd (gekozen) | ...Een prijs zonder bijlage. Wie doet dat? | 5 | 5 | 3 | 15.5 |
| warm | ...Eerlijk. Dat is lang geleden. Dank je. | 2 | 2 | 5 | 10.0 |

Stemmen: absurd, absurd, warm. Keuze: absurd. Zekerheid: hoog. Redenen: droog "Bureaucratisch verbaasd, zonder uitleg."; absurd "Een prijs zonder bijlage."; warm "Eerlijk, dank je: de vroege Jelle-omslag.".

### HE-06 (F5, TESSA)

De kade aan de Noorderhaven. Tammo zegt dat hij het hier het liefst wil, met haar erbij. Tessa telt de woorden, een knipoog naar de vijf woorden van de Grote Markt.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat waren er vier. Kon meer. | 3 | 2 | 3 | 8.8 |
| droog (gekozen) | Vier woorden. Op de Grote Markt waren het er vijf. | 5 | 2 | 3 | 11.3 |
| absurd | Vier. Rikus zou trots zijn. | 2 | 5 | 2 | 9.5 |
| warm | Vier woorden. Ik neem ze alle vier. | 2 | 3 | 5 | 10.5 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Redenen: droog "Vijf naar vier is een daling: Tessa telt precies."; absurd "Rikus als maatstaf van stilte."; warm "Ik neem ze alle vier: Tessa geeft toe.".

### HE-07 (F5, TAMMO)

De kade, na Tessa's vraag of ze nu een stel zijn. Tammo verwijst naar Berends tellen van de kus op de Grote Markt als bewijs.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Berend telde elf seconden. Dat is officieel. | 4 | 2 | 2 | 9.0 |
| droog | Elf seconden, door Berend genoteerd. Dat telt als stel. | 4 | 3 | 3 | 11.0 |
| absurd (gekozen) | Berend telde elf seconden en een duif telde mee. Dat is officieel. | 3 | 5 | 3 | 11.8 |
| warm | Elf seconden. Berend telde. Ik raakte de tel kwijt. | 2 | 3 | 5 | 10.5 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Genoteerd en officieel: administratief."; absurd "De duif telt mee: past bij zijn volgers."; warm "Ik raakte de tel kwijt: het kusmoment blijft.".

### HE-08 (F6, TAMMO)

Vismarkt, de kaart van de provincie ligt op het luik: eenenveertig rode stippen van Us Mem Snacks tegen één blauwe van de wagen. Tessa heeft het aantal net genoemd.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat is een goede verhouding. Voor Jelle. | 4 | 2 | 2 | 9.0 |
| droog | Hij is ons ver vooruit. Dat is zijn gewoonte. | 4 | 2 | 2 | 9.0 |
| absurd | Eenenveertig rode stippen. Mijn duiven tellen mee. | 2 | 5 | 3 | 10.5 |
| warm (gekozen) | Eén stip. Maar wel de onze. | 3 | 3 | 5 | 11.8 |

Stemmen: bestaand, absurd, warm. Keuze: warm. Zekerheid: laag. Redenen: droog "Voor Jelle blijft staan, ver vooruit is gelijkwaardig."; absurd "De duiven tellen mee."; warm "Eén stip, wel de onze: trots.".

### HN-18 (N9, TESSA)

Nacht op een dijk, in een oud busje met de achterdeuren open. Een schaap staat tussen hen in het beeld en kauwt op Tammo's sok; het bijna-moment is net voorbij.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Het eet je sok. | 4 | 1 | 2 | 8.0 |
| droog | Het schaap eet je sok. Het kauwt zorgvuldig. | 4 | 3 | 3 | 11.0 |
| absurd (gekozen) | Het schaap heeft nu een sok en een mening. | 3 | 5 | 3 | 11.8 |
| warm | Het schaap heeft je lief. Het eet je sok. | 2 | 3 | 5 | 10.5 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Zorgvuldig kauwen of kaal, geen mening van het schaap."; absurd "Het schaap met een mening."; warm "Het schaap heeft je lief: het bijna-moment blijft zacht.".

### HN-19 (N9, TAMMO)

Nacht op een dijk. Tessa wijst naar de Grote Beer en zegt dat hij niet kijkt; Tammo kijkt naar haar vinger en niet naar de lucht.

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik kijk naar de beer. | 3 | 1 | 2 | 6.8 |
| droog | Ik kijk naar de beer. Hij staat laag. | 4 | 3 | 2 | 10.0 |
| absurd (gekozen) | Ik kijk naar de beer. Hij kijkt terug. | 2 | 5 | 3 | 10.5 |
| warm | Ik kijk naar iets moois. Ik noem het de beer. | 2 | 3 | 5 | 10.5 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Redenen: droog "Staat laag: Tammo kijkt echt naar iets anders."; absurd "De beer kijkt terug: de nacht wordt even levend."; warm "Ik noem het de beer: hij kijkt naar haar.".

