# Stijlgids voor schrijvers: GDE Groningen, Zomer vol misdaad

Voor wie tekst schrijft of herschrijft in het verhaal: mensen, Claude Code en andere agents.
Lees eerst [AGENTS.md](../../AGENTS.md) (de constitution) en [nieuw/00-OVERZICHT.md](nieuw/00-OVERZICHT.md).

De bron van het verhaal is de markdown in [nieuw/09-script-akte1..5.md](nieuw/). Bewerk die, nooit
`game/storydata/script.json` zelf. Daarna:

```bash
node scripts/build_story_data.mjs
node scripts/story_similarity_test.mjs
node scripts/storydata_test.mjs
```

Regels met `[BEHOUDEN]` hebben een opname. Raak hun tekst niet aan: een andere letter betekent een stille regel.
Wil je er iets omheen zetten, voeg dan een `[NIEUW]`-regel toe.

## 1. De ondertoon in vier zinnen

1. Droog, warm en een beetje Gronings. De grap zit in wat mensen niet zeggen.
2. Niemand legt een gevoel uit. Een gevoel is een gezicht, een gebaar of een zwijgen.
3. Elke scène heeft één ding dat het publiek leuk vindt en één ding dat het publiek niet verwachtte.
4. De wereld is echt (Grunn, de Krolbrug, de Martinitoren). De mensen zijn verzonnen.

## 2. De stemmen

Per hoofdpersoon: drie kenmerken (hoe hij of zij klinkt), drie lievelingswoorden (wat vaak terugkomt) en één taboe
(wat die persoon nooit zegt of doet). Het taboe is de makkelijkste manier om een verkeerde regel te herkennen.

| Wie | Drie kenmerken | Drie lievelingswoorden | Eén taboe |
|---|---|---|---|
| **Tammo** | traag, letterlijk, onverwacht scherp | *Moi*, *Klopt*, *Kon minder* | Hij zegt nooit "liefde" of "ik voel". Hij komt tot *Woist ja wel* en *Ik wil bij jou blijven*, en dat is een heel jaar. |
| **Tessa** | droog, plannerig, preciezer dan nodig | *Tammo* (als aanspreking), *lijstje*, *Rijden, niet praten* | Ze praat standaard Nederlands en nooit met een Gronings accent (zie hieronder). *Moi* glipt er twee keer per ongeluk uit, en dat is de grap. |
| **Jelle Terpstra** | juridisch proza, beleefd bedreigend, netjes tot in zijn paniek | *overeenkomst*, *mevrouw*, *juridisch* | Hij zegt nooit "sorry". Alleen tegen zijn moeder: *Ja, mem*. |
| **Mem (Gerda Terpstra)** | kort, Fries-warm, moederlijk gezag | *jonge*, *famke*, *Tige tank* | Ze praat nooit langer dan twee zinnen en verheft nooit haar stem. |
| **Oma Trijntje** | Gronings, onderkoeld, wijs | *jong*, *Eet je krentjebrij*, *Woist ja wel* | Ze legt haar eigen gevoel niet uit. Ze zegt het één keer. Dan is het waar. |
| **Berend Bos** | telt alles, nors, spaarzaam met lof | *nul krassen*, *Goidag*, *Wat mout, dat mout* | Hij zegt nooit "mooi" of "goed gedaan". Lof komt alleen op de complimentenladder (*Goud, Valt mie nait of, Braid noar de zin, Kon minder*). |
| **Rikus** (radio) | deadpan, melder, onverstoorbaar | *een luisteraar meldt*, *Ik zeg niks*, *Storingsbericht* | Hij geeft geen mening over de speler. *Ik zeg niks* is zijn mening. |
| **Durk en Douwe** | Durk praat in slogans, Douwe echoot, samen een koor | *Douwe*, *baas*, *Net fertelle, hè?* | Douwe zegt nooit een hele zin. Alleen een echo, een *Hè* of een *Plons*. |
| **De torenwachter** | meldt alleen | *Ik meld alleen*, *Er hangt iets aan mijn toren* | Een mening. Hij mag één keer zeggen *Ik meld niet alleen. Ik klap.* en daarna niet meer. |

**De stem van Tessa (besluit van de eigenaar).** Tessa is Nederlandse en praat standaard Nederlands, ook in de opname: geen Gronings accent, geen dialectspelling in haar tekst.
Ze mag af en toe een Gronings woord zeggen, maar als iemand van buiten de streek: voorzichtig, licht stuntelig, soms met een verbetering door een Groninger. Dat is een grap over haar, nooit een manier van praten.

- Goed: *Koeien kieken altijd.* / *Altied.* (M09.3), *Joa. Dat is het Hogeland.* / *Je zegt joa als een vraag.* (T1), *Moi. …Goedemorgen, bedoel ik.* (M09.1).
- Fries kent ze wel een beetje (ze woonde elke zomer in Ljouwert naast Mem, M22.4), Gronings niet. Fries mag ze vertalen of weigeren te vertalen (*Dat is Fries. Ik vertaal het niet.*).
- Geen *nait*, *mor*, *hè* aan het eind van haar zinnen, geen *jong* als aanspreking. Zij zegt *Grunn* (nooit *de Grunn*) omdat de rest van het spel het zo noemt, en *de stad* of *Groningen* waar een Stadjer *Stad* zou zeggen.
- Uitzonderingen die blijven: *Goidag, Berend* (M01.1, M21.1, opgenomen: de stuntelige groet), *Moi* (M16.6) en *Mien jong* (M26.7), het enige moment waarop ze het bewust en goed zegt.
- Nieuwe Gronings in haar mond zet je eerst in [DIALECT-NALEZING.md](DIALECT-NALEZING.md); één woord per scène is genoeg.

Bijfiguren hebben één trek, geen formule:

| Wie | De ene trek |
|---|---|
| Wubbo | *Open of dicht, nooit allebei.* Alles is een brug. |
| Tinus | Zegt *Ik trek hem weg*, en het klopt elke keer. |
| Geesje | Ze behandelt alles als kerkelijk: eieren zijn relikwieën, een scooter is een bedevaart. |
| Kapitein Klaas | Praat tegen zijn boot en vist fietsen. |
| Lammert | De haven is zijn kerk. Hij vertelt wat er niet is (leeg schip, volle kabel). |
| Roelfien | Grof graan, grote gebaren, nooit iets verzwijgen. |
| Dokter Dijkstra | Alles is een spoedje, de lunch ook. |
| Henk | Elke deuk is een karaktertrek. |
| Sjabbe | Zakelijk, regelt het contant, vraagt niets. |
| Bert | Praat met duiven en zegt *jong*. |

## 3. Verboden zinsbouw

Dit zijn de formules die het script al te vaak gebruikt had. De test `scripts/story_similarity_test.mjs`
telt ze en laat het aantal niet meer stijgen. Een regel die erop lijkt valt op, ook als hij net anders is geschreven.

| Verboden | Waarom | Doe dit |
|---|---|---|
| **Dat is een X, geen Y.** (Tessa corrigeert Tammo's woord) | Het was de enige tegelgrap van het spel. Er blijft er één over (de Krolbrug, B1). | Laat de tegenstelling in wat ze niet zeggen zitten. *"Er is ook niks om af te slaan." / "Dat bedoel ik."* |
| **Weer een X? Mijn Y zeggen dank.** (replay-regel) | Vier personen klonken hetzelfde. | Eén replay-regel die alleen deze persoon kan zeggen. *"Weer eieren? De kippen sturen een kaartje."* |
| **Ik ben X, beroep. Oma belde.** (binnenkomst) | De rol staat al op de naamkaart, en iedereen klonk als een formulier. | Laat het beroep door de regel komen. *"Het zijn eieren, geen relikwieën. Maar ik ben kosteres, dus ik behandel ze zo."* |
| **Dat zeg je altijd / Dat zeg je zo vaak.** | Een callback zonder voorbereiding is geen callback. | Zorg dat het eerder is gezegd, en laat de tweede keer een stap verder gaan. |
| **"Plakje vier", "zes voor de helft gevallen".** | Personages praten als een voortgangsbalk. | Het getal staat in de HUD. De mensen praten over de ingrediënten of over Jelle. *Salamitactiek* mag één of twee keer. |
| **Hij houdt de koffer boven water** (en de Plons) | Na twee keer is het een tic. | Draai de tweede keer om (*"Hij is consistent."*). |
| **"Eén zin, jong" als uitleg voor iets wat de scène al toonde.** | Uitleg doodt de grap. | Schrap de uitleg tot wat het publiek nog niet wist. |

Daarnaast:

- **Geen losse uitleg in de mond van iemand die het al weet.** De informatie hoort bij het personage dat het niet weet, of in een grap.
- **Een emotionele scène blijft droog.** Geen twintig regels zonder grap. De grap hoeft niet de scène te redden, wel de toon.
- **Een callback gaat verder dan het origineel.** Dezelfde twee regels herhalen is geen callback. Voeg een draai toe, of laat het personage wisselen.
- **Eén gezicht, één betekenis.** *"Dat gezicht betekent: …"* mag drie keer en loopt op in warmte (*ik snap het niet*, *prima*, *ik leef nog*). Daarna niet meer.
- **Geen scoreboekhouding in dialoog**, geen *stap vier van acht*. Dat doet de HUD.
- **Het eerste woord van een antwoord is geen herhaling van de vraag.** *"Wat moet een Fries met jouw bakkie?" / "Wat moet een Fries met ons?"* leest als een fout.

## 4. Taal en constitution in het kort

- **Alleen Nederlands.** Gronings en Fries alleen met zorg en met een ondertitel in het Nederlands. Twijfel je? Zet de regel in [DIALECT-NALEZING.md](DIALECT-NALEZING.md). Het is *Grunn*, nooit *de Grunn*.
- **Geen echte merken, bedrijven of personen.** Echte plaatsen en gebouwen mogen. Parodieën hebben een verzonnen naam (Kiekdoar, Us Mem Snacks, Delfstof Noord, Wiebelwerk, EIKEA).
- **Altijd zomer.** Geen winter, sneeuw of ijs, geen oliebollen, geen *volgend voorjaar*. De kalender staat vast (zie het feitenblad).
- **Satire, geen leed.** Berovingen kosten geld, niet bloed. Gevoelige onderwerpen (gaswinning, veiligheid) alleen met een verzonnen bedrijf en nooit een echt slachtoffer als grap. Geen "dat is Loppersum, daar schudde de grond".
- **Echte plaatsen kloppen.** Controleer afstand, ligging en naam. Zie de lijst van fouten die al zijn gerepareerd in [nieuw/ronde2-besluiten.md](nieuw/ronde2-besluiten.md).

## 5. Feitenblad: kloppen de cijfers?

Dit zijn de feiten die elke scène moet delen. Wijkt een regel af, dan gaat het feitenblad voor.

| Feit | Waarde |
|---|---|
| Tammo | 34 jaar (*Ik ben vierendertig, oma*). Woont op de Escapade. |
| Tessa en Tammo | kennen elkaar al twintig jaar, sinds de treinreis naar Delfzijl als kinderen. Tammo is er twaalf jaar verliefd op en zweeg twaalf jaar (M26.7). Ze wonen sinds 14 augustus samen (Paddepoel, Pleiadenlaan). |
| Oma Trijntje | 92. Won de Snackprijs in 1953. |
| Mem (Gerda Terpstra) | 91. Werd in 1953 tweede, tegen Trijntje. Moeder van Jelle. "Zeventig jaar" is een afronding. |
| Geesje | kosteres in Warffum, 84. Geen schoolvriendin van Trijntje: ze kent haar van de kerk. |
| Lammert | havenmeester in de Eemshaven. **Zijn vader** danste in 1953 met Trijntje, niet hij. |
| Kalender | vrijdag 14 augustus (begin) tot vrijdag 28 augustus (Gronings Ontzet, Snackprijs). Epiloog vrijdag 11 september. |
| Jelle en de bal | Jelle had de Gouden Eierbal al op 12 augustus (logboek M18). Tammo en Tessa kraken op 17 augustus een leeg museum. |
| De jury | vijf juryleden. Drie van de vijf beslist. Het oudste jurylid (Berend) zit voor als Hoving er niet is. |
| De bewaarder | Mevrouw Hoving bewaart de Gouden Eierbal sinds 1998. Wie de bal bewaart, zit de jury voor en tekent de uitslag. Is de bewaarder verhinderd, dan zit het oudste jurylid voor: Berend Bos, jurylid sinds 1982. Jelle wil zich op 28 augustus om drie uur bij de notaris laten inschrijven als nieuwe bewaarder, dan tekent hij zelf de uitslag. Zeg het zo, zonder artikelnummers en zonder het woord nietig. |
| Juryleden | Vijf: Berend en vier anderen. Twee liepen weg bij de kermis, één stapte uit de trein, één heeft een contract met Jelle (en blijft zo). Alleen dat ene jurylid stemt in de finale op Us Mem Snacks met het woord contract. |
| Plaatsen | Veendam ligt aan het Oosterdiep. De Dollard is een inham. Het Lauwersmeer heeft geen getij; de wind duwt het water. De Eemshaven heeft geen containerterminal. |

## 6. Voor je klaar bent

1. `node scripts/build_story_data.mjs` (maakt `script.json`; de test controleert dat hij actueel is).
2. `node scripts/story_similarity_test.mjs` (identieke of bijna-identieke regels, verboden zinsbouw).
3. `node scripts/storydata_test.mjs`, `node scripts/storychoice_test.mjs`, `node scripts/storyflow_nieuw_test.mjs`, `node scripts/voice_coverage.mjs --quiet`, `node scripts/text_audit.mjs`.
4. Heb je een scène toegevoegd, zet hem dan op zijn stap in `game/js/storyarc_nieuw.js` en geef hem een staging in `game/js/cutscenes_akte4.js` (de test `cutscenes_akte4_test.mjs` vraagt erom).
5. Zeg eerlijk wat je niet hebt gespeeld. Wat niemand in beeld heeft gezien, staat in het issue als "nog niet bekeken".

Wil je een regel toestaan die de test vlagt (een bedoelde terugkeer, zoals *Net fertelle, hè?*), zet hem dan met een reden in
`scripts/story_similarity_allow.json`. Dat is een besluit, geen ontsnapping.
