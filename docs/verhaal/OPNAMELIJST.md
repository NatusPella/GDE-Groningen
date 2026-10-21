# Opnamelijst: verhaalregels zonder stem

Gegenereerd door `node scripts/opnamelijst.mjs` uit `game/storydata/script.json`; niet met de hand aanpassen.

Van de 1300 gesproken verhaalregels (zonder de bewust stille appjes) hebben er 334 een opname en 966 nog niet. Een regel zonder opname wordt als ondertitel getoond (spreker, kleur, leestijd) en er klinkt niets: het gesprek wacht niet op geluid. Een speler hoort dat als "stukken zonder voiceover" (#326).

Een regel krijgt een opname door hem op te nemen onder de stem uit de kolom **Stem**, met de tekst letterlijk zoals hij hier staat (het spel zoekt de opname op "<stem>|<tekst>"), en hem in het manifest van `audio/voicelines/story` of `lines` te zetten. Daarna zet `node scripts/build_story_data.mjs` de vlag `textOnly` uit. Een andere hoofdletter, punt of een "…" vooraan telt als een andere tekst, behalve die laatste: een opname met "…" vooraan wordt ook onder de tekst zonder gevonden.

Eerst de opening en missie 1 t/m 3 (114 regels): die ziet iedere speler in het eerste uur.

## M00 (opening) · 14 regels

### C00.1 Trailer (opening; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Grunn. Tweehonderdduizend mensen, driehonderdduizend fietsen en één toren die alles ziet. | radio | NIEUW |
| Rikus | Vandaag in Grunn: weinig nieuws. Dat komt nog. | radio | NIEUW |
| Rikus | Er gaat niets boven Grunn. Behalve de Martinitoren. | radio | BEHOUDEN |

### C00.2 Opening: de keuken (opening; 8 zonder stem, 15 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Het is vrijdag 14 augustus. Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is. Ik zeg niks. | radio | NIEUW |
| Anita | …Dat komt op de zijkant van de wagen. | stem | NIEUW |
| Anita | Zonder bank blijft er één weg over: de Noordelijke Snackprijs. De winnaar krijgt de enige vrije standplaats van Grunn. | stem | NIEUW |
| Tammo | De prijs voor de beste eierbal. | stem | NIEUW |
| Anita | Wij winnen op 28 augustus, wij krijgen die standplaats, en de Fjord Frituur heeft een thuis. | stem | NIEUW |
| Tammo | Op Gronings Ontzet. | stem | NIEUW |
| Anita | Dat is de dag dat Grunn in 1672 de bisschop buiten hield. Dat spelen jullie elk jaar na. Ik heb het nog nooit gezien. | stem | NIEUW |
| Tammo | En tot die tijd? Hier past geen frietwagen. | stem | NIEUW |

### C00.3 Verhuisdag (opening; 3 zonder stem, 2 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Eerst geld. Inschrijven voor de Snackprijs kost honderdvijftig euro, contant, uiterlijk morgen om twaalf uur, bij Het Loket. | stem | NIEUW |
| Tammo | Honderdvijftig euro. Vandaag. | stem | NIEUW |
| Anita | Een streamer betaalt honderdvijftig euro voor stunts. Alleen heeft de Escapade een lekke band, dus we lenen een bakkie. Rijden, niet praten. | stem | NIEUW |

## M01 · 33 regels

### M01.1 Nul krassen, vijftienhonderd punten: intro (intro; 8 zonder stem, 7 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Mijn arm zit in het gips. Mijn bakkie, mijn pick-up, moet naar mijn zus, aan het Boterdiep. Vijftig euro voor wie hem brengt. | stem | NIEUW |
| Anita | Wij brengen hem. Eerst even een klus op de Grote Markt, dan naar uw zus. | stem | NIEUW |
| Berend Bos | Nul krassen. Of ik tel ze. | stem | NIEUW |
| Tammo | Berend geeft complimenten op een ladder. "Goidag" is trede één. | stem | NIEUW |
| Anita | En de bovenste? | stem | NIEUW |
| Tammo | "Kon minder." Daarboven zwijgt hij. Daar is nog niemand gekomen. | stem | NIEUW |
| Berend Bos | Ik zit in het gips, niet in een doos. Ik hoor alles. | stem | NIEUW |
| Anita | Vijftig euro van Berend. Met de stunts erbij is dat genoeg, Tammo. | stem | NIEUW |

### M01.2 Nul krassen, vijftienhonderd punten: de klus (key; 7 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelmer | Moi moi! Kiekdoar hier. Je reageerde op mijn oproep: stuntrijder met een bakkie. Ik wil vanavond content op de Grote Markt. | telefoon | NIEUW |
| Jelmer | Haal vijftienhonderd stuntpunten, dan betaal ik honderdvijftig euro. | telefoon | NIEUW |
| Anita | Honderdvijftig euro. Dat is precies de inschrijving voor het Loket. | stem | NIEUW |
| Tammo | Stunten in Berends bakkie. | stem | NIEUW |
| Anita | Zonder krassen. | stem | NIEUW |
| Tammo | Dat is geen stunt. Dat is een ramp met regels. | stem | NIEUW |
| Anita | Eerst de Grote Markt, dan Berends zus. | stem | NIEUW |

### M01.3 Nul krassen, vijftienhonderd punten: de Grote Markt (key; 1 zonder stem, 8 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Dit is de Grote Markt. Parasols en kliko's geven punten, mensen kosten je punten en krassen kosten je Berend. Haal die vijftienhonderd. | stem | NIEUW |

### M01.4 Nul krassen, vijftienhonderd punten: tijdens de stunts (key; 9 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelmer | Chat, kijk die parasol! Die was van het terras. Nu is hij content! | stem | NIEUW |
| Anita | Niemand raken, Tammo. Alleen de parasols. | stem | NIEUW |
| Tammo | Alleen spullen. | stem | NIEUW |
| Berend Bos | Goidag. Ik kijk mee op Kiekdoar. Ik hoor een parasol kraken. Dat klinkt als een kras. | telefoon | NIEUW |
| Anita | Het is een parasol, Berend. | stem | NIEUW |
| Berend Bos | Dat klinkt als een kras met een parasol. | telefoon | NIEUW |
| Jelmer | Chat vindt dat niet leuk! Een terrasstoel met een hoed erop! Min honderd! | stem | NIEUW |
| Anita | Dat was een mens, Tammo. | stem | NIEUW |
| Tammo | Een hoed. Die ging zelf op pad. | stem | NIEUW |

### M01.5 Nul krassen, vijftienhonderd punten: de chat (key; 4 zonder stem, 5 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelmer | Tienduizend kijkers! En kijk: ene JelleWâld typt in de chat. | stem | NIEUW |
| Anita | Dat is Fries. Ik vertaal het niet. | stem | NIEUW |
| Jelmer | Honderdvijftig euro, overgemaakt op jouw pas. | stem | NIEUW |
| Anita | Op mijn pas. Die pin ik morgenochtend, dan gaan we naar het Loket. | stem | NIEUW |

### M01.6 Nul krassen, vijftienhonderd punten: outro (outro; 4 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Ik zei nee, want nul krassen. Hier, jullie vijftig euro, voor de rit. …Moi. | stem | NIEUW |
| Anita | Een Fries in een blauw colbert. Op de radio, en nu bij Berend. | stem | NIEUW |
| Tammo | En in de chat. | stem | NIEUW |
| Anita | Dat zoeken we later uit. Eerst pinnen en inschrijven. | stem | NIEUW |

## M02 · 19 regels

### M02.1 Even pinnen: intro (intro; 5 zonder stem, 7 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Half acht. Eerst honderdvijftig euro pinnen, dan naar het Loket. | stem | NIEUW |
| Anita | Ze trokken hem met een kabel uit de muur. Ik was nog niet klaar met mijn pincode. | stem | NIEUW |
| Anita | Sjabbe van Pand & Poen koopt wat niemand wil en opent wat niemand kan. Wij brengen de automaat naar Sjabbe. | stem | NIEUW |
| Anita | Een gestolen automaat op een aanhanger, en wij ernaast. | stem | NIEUW |
| Tammo | Ik rij. | stem | NIEUW |

### M02.2 Even pinnen: onderweg (key; 4 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Sjabbe | Tessa. Sjabbe. Spuit & Klaar heeft een achterdeur. Rij door de grote poort. | telefoon | NIEUW |
| Anita | Eerst Spuit & Klaar, voor een nieuwe kleur. Dan naar Sjabbe. | stem | NIEUW |
| Tammo | Een spuiterij. Slim. | stem | NIEUW |
| Anita | Dat zeg je zelden. | stem | NIEUW |

### M02.3 Even pinnen: outro (outro; 7 zonder stem, 3 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Sjabbe | Netjes. De automaat is vierhonderd euro waard aan onderdelen. Die houd ik. Jullie krijgen je pas en een envelop. | stem | NIEUW |
| Sjabbe | Dan moet je groter denken. Die twee reuzen, Durk en Douwe, werken voor een Fries in een blauw colbert. Jelle Terpstra. | stem | NIEUW |
| Anita | Het colbert van Berend. De man uit de chat. | stem | NIEUW |
| Sjabbe | Hij betaalt alles contant, uit een klomp. Een klomp is snel leeg. Daarom halen ze pinautomaten uit de muur. | stem | NIEUW |
| Tammo | Wat wil hij? | stem | NIEUW |
| Sjabbe | Alles wat met frituren te maken heeft. En hij vroeg waar het museum alarmen heeft. | stem | NIEUW |
| Anita | Contant. Het Loket gaat om tien uur open. Nu hoeven we alleen nog in te schrijven. | stem | NIEUW |

### M02.5 Slot: naar het Loket (key; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Waarom vraagt een snackbaron naar alarmen? | stem | NIEUW |
| Anita | Dat weten we na het Loket. Hij heeft het vast over meer dan een museum. | stem | NIEUW |
| Tammo | Dan eerst het Loket. | stem | NIEUW |

## M03 · 48 regels

### M03.1 Het Loket: intro (intro; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Twaalf uur, contant. Hoe moeilijk kan een stempel zijn? | stem | NIEUW |
| Loketbediende | Nummer 4117 aan loket A. Op het scherm staat 4093. | stem | NIEUW |
| Tammo | Vierentwintig mensen voor ons. | stem | NIEUW |
| Anita | Ik haal het formulier, jij pakt de stempels. | stem | NIEUW |
| Loketbediende | Formulier 7B, in drievoud. Niet vouwen. | stem | NIEUW |
| Tammo | Wie vouwt er nou een formulier? | stem | NIEUW |
| Anita | Iedereen, Tammo. Daarom staan we hier. | stem | NIEUW |
| Loketbediende | Loket C is vandaag een stempel-loket. Loket B is vandaag Loket C. | stem | NIEUW |
| Anita | Dat gezicht betekent: ik snap het niet. | stem | NIEUW |
| Tammo | Klopt. | stem | NIEUW |
| Sjabbe | Loket C heeft een zijdeur bij de kopieermachine. | telefoon | NIEUW |

### M03.2 Het Loket: Jelle (key; 18 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Goedemorgen. Jelle Terpstra, Us Mem Snacks. Mijn juristen hebben dit loket vanochtend vooruit betaald. | stem | NIEUW |
| Anita | Jelle Terpstra. Meneer Klomp. | stem | NIEUW |
| Jelle Terpstra | Ik heb de rij gekocht. U staat nu helemaal achteraan, nummer 4140. Dat staat in de overeenkomst. | stem | NIEUW |
| Tammo | Hij kocht onze plek. | stem | NIEUW |
| Jelle Terpstra | Verder koop ik alle standplaatsen van Grunn die vrijkomen. Contant, uit een klomp, definitief. | stem | NIEUW |
| Anita | Alle? De standplaats van de winnaar is niet te koop. | stem | NIEUW |
| Jelle Terpstra | Nee. Die win ik. | stem | NIEUW |
| Anita | Salamitactiek. Plakje voor plakje, tot hij alles heeft. | stem | NIEUW |
| Jelle Terpstra | Dat noemen wij ondernemen. Oant sjen. | stem | NIEUW |
| Jelle Terpstra | Foar mem. | stem | NIEUW |
| Tammo | Wat zei hij? | stem | NIEUW |
| Anita | Voor zijn moeder. Hij doet alles voor zijn moeder. | stem | NIEUW |
| Mevrouw Hoving | Mevrouw Hoving. Ik bewaar de Gouden Eierbal, de wisselprijs van de Snackprijs, al sinds 1998. Wie de bal bewaart, zit de jury voor en tekent de uitslag. | stem | NIEUW |
| Loketbediende | Is de bewaarder er niet, dan zit het oudste jurylid voor. Dat is Berend Bos, jurylid sinds 1982. | stem | NIEUW |
| Mevrouw Hoving | Meneer Terpstra heeft de vier andere juryleden en mij uitgenodigd voor een treinreis met volpension: alle maaltijden erbij. Vanaf maandag, tot na het Ontzet. | stem | NIEUW |
| Mevrouw Hoving | Berend Bos bedankte, want hij heeft een bakkie. Een bijzonder aardige man, meneer Terpstra. | stem | NIEUW |
| Anita | En wie let dan op de bal? | stem | NIEUW |
| Mevrouw Hoving | Het museum. De koepel hangt sinds woensdag onder een doek, wegens restauratie. | stem | NIEUW |

### M03.3 Het Loket: de stempels (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Loketbediende | Uw formulier is gevouwen. | stem | NIEUW |
| Anita | Dat is het formulier dat u mij gaf. | stem | NIEUW |
| Loketbediende | Dan was het gisteren ongevouwen. | stem | NIEUW |
| Tammo | Ik haal de stempel bij loket B. | stem | NIEUW |
| Loketbediende | Loket B is nu loket A. | stem | NIEUW |
| Tammo | Een draaimolen. | stem | NIEUW |
| Anita | Dat is een gemeente. | stem | NIEUW |

### M03.4 Het Loket: outro (outro; 11 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Loketbediende | Gefeliciteerd. U bent ingeschreven voor de Noordelijke Snackprijs, met wagen. Zonder wagen vervalt uw inschrijving. | stem | NIEUW |
| Anita | Wij zijn ingeschreven. Op 28 augustus op de Grote Markt. | stem | NIEUW |
| Anita | Hij vroeg Sjabbe waar het museum alarmen heeft. Hij wil de bal, want wie de bal bewaart, zit de jury voor. | stem | NIEUW |
| Tammo | Dan wint Jelle. | stem | NIEUW |
| Anita | Tenzij iemand de bal eerder pakt. | stem | NIEUW |
| Tammo | Waarom bellen we het museum niet? | stem | NIEUW |
| Anita | En dan zeggen? Dat Jelle naar alarmen vroeg? Er hangt een doek om de koepel en dat noemen ze restauratie. | stem | NIEUW |
| Tammo | Wij stelen de Gouden Eierbal. | stem | NIEUW |
| Anita | Wij bewaken hem. Na het Ontzet brengen we hem terug. | stem | NIEUW |
| Duivenmelker Bert | Tammo. Bert, van de duiven. Er staat elke nacht een zwarte trekker bij het museum, met een limousine erachter. | telefoon | NIEUW |
| Anita | Bert kende jouw opa. Eerst kijken hoe het museum bewaakt wordt. Naar het Stationsplein. | stem | NIEUW |

### M03.5 Het Loket: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Loketbediende | Weer bij ons? Loket B is nog steeds Loket C. | stem | NIEUW |

## M04 · 17 regels

### M04.1 Kieken van boven: intro (intro; 3 zonder stem, 9 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Bert was de beste vriend van mijn opa. | stem | NIEUW |
| Anita | Dit is het plan. Jij vliegt naar het museum. Fotografeer de camera's, de bewakers en de stroomkast. Ik kijk mee. | stem | NIEUW |
| Tammo | En wat Jelle daar doet. | stem | NIEUW |

### M04.2 Kieken van boven: in de lucht (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Camera één, links van de deur. | telefoon | NIEUW |
| Sjabbe | Bewakers zijn goedkoper dan camera's. Kijk wie er iets krijgt. | telefoon | NIEUW |
| Anita | Bewaker twee, met een koekje. | telefoon | NIEUW |
| Tammo | Een Fries in een blauw colbert. | stem | NIEUW |
| Anita | Hij telt de alarmen. Fotografeer hem. | telefoon | NIEUW |
| Tammo | Ik fotografeer zijn colbert. | stem | NIEUW |
| Anita | Hij geeft bewaker twee een eierbal. Dat is zijn koekje. | telefoon | NIEUW |

### M04.3 Kieken van boven: outro (outro; 6 zonder stem, 5 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Pompeblêden. Een Fries. Hij telt de alarmen alsof hij iets controleert. Of voorbereidt. | stem | NIEUW |
| Anita | Bewaker twee is omgekocht. | stem | NIEUW |
| Tammo | En de camera's? | stem | NIEUW |
| Anita | Daar hebben we een moment voor nodig. | stem | NIEUW |
| Tammo | Sjoerd, van de Kiezelweek, die fietsrace. Zijn neef werkt 's nachts in het museum. Hij praat alleen met winnaars. | stem | NIEUW |
| Anita | Dan winnen wij die fietsrace. | stem | NIEUW |

### M04.5 Autogesprek: daarna zien we wel (banter; 1 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Als het niet gaat zoals het moet, doen we het anders. | stem | NIEUW |

## M05 · 15 regels

### M05.1 Wind tegen, beide kanten op: intro (intro; 5 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Sjoerd | Moi, Tammo. Sjoerd, Kiezelcommissie. Wie op het podium komt, mag mij iets vragen. | stem | NIEUW |
| Anita | Wij willen weten wat jouw neef 's nachts in het museum ziet. | stem | NIEUW |
| Sjoerd | Podium eerst. | stem | NIEUW |
| Sjoerd | Regels zijn regels. Behalve de mijne. | stem | NIEUW |
| Tammo | Dat is een ja. | stem | NIEUW |

### M05.2 Wind tegen, beide kanten op: het kruispunt (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Oogcontact. Zoals Sjoerd zei. | stem | NIEUW |
| Tammo | Dat doe ik al. | stem | NIEUW |
| Anita | Je kijkt nog steeds. | stem | NIEUW |
| Tammo | Ik zie een fietser. | stem | NIEUW |
| Anita | Dat ben ik. | stem | NIEUW |

### M05.3 Wind tegen, beide kanten op: outro (outro; 2 zonder stem, 8 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Dus vannacht, om twaalf uur. Drie minuten om de bal te pakken. | stem | NIEUW |
| Tammo | Eerst wachten. | stem | NIEUW |

### R1.2 Nachtstreek, zondagavond (radio; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Een luisteraar meldt een kruispunt in de binnenstad waar alles tegelijk groen was. Niemand had voorrang. Iedereen overleefde. | radio | NIEUW |
| Rikus | Peiling: wie wint de Noordelijke Snackprijs? Een Fries: 58 procent. Een Stadjer: 31 procent. Weet ik niet: 11 procent. | radio | NIEUW |
| Rikus | Een luisteraar meldt dat Oldenhuis Bakt in Veendam de eenenveertigste snackbar opent. Eenenveertig snackbars, van Lauwersoog tot Bourtange. Ik weet niet wie dat eet. | radio | NIEUW |

## M06 · 34 regels

### M06.0 Thuis wachten tot middernacht (key; 1 zonder stem, 9 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Nog een kwartier. | stem | NIEUW |

### M06.1 Het museum stond er al zo: intro (intro; 3 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Het plan. Om twaalf uur gaan de camera's drie minuten uit. In die drie minuten pakken wij de bal, voordat Jelle hem pakt. | stem | NIEUW |
| Tammo | En daarna brengen we hem terug. | stem | NIEUW |
| Anita | Na het Ontzet. Drie minuten. Hand. | stem | NIEUW |

### M06.2 Het museum stond er al zo: binnen (key; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Sjabbe | De zekering zit links. Het slot is een standaardslot. Ik heb er twintig verkocht. | telefoon | NIEUW |
| Anita | De zekering. Links. Jij houdt de bewaker bezig. | stem | NIEUW |
| Tammo | Waarmee? | stem | NIEUW |
| Anita | Met je gezicht. | stem | NIEUW |
| Tammo | Een compliment. | stem | NIEUW |
| Anita | Een tactiek. | stem | NIEUW |
| Anita | Bewaker twee met het koekje staat niet op zijn plek. | stem | NIEUW |
| Tammo | Misschien is hij ziek. | stem | NIEUW |
| Anita | Misschien is hij betaald. Nog negentig seconden. | stem | NIEUW |
| Tammo | De vitrine. Daar is hij. | stem | NIEUW |

### M06.3 Het museum stond er al zo: de lege vitrine (outro; 4 zonder stem, 11 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | De vitrine is leeg. Iemand was ons voor, en wil dat wij dat weten. | stem | NIEUW |
| Jelle Terpstra | Daarom bel ik. De Gouden Eierbal is bij mij, dus ik word de bewaarder en zit de jury voor. Mijn juristen noemen het een overname. | radio | NIEUW |
| Tammo | Bewaker twee. Met het koekje. | stem | NIEUW |
| Anita | Rennen, Tammo. | stem | NIEUW |

### R1.3 Overgang naar akte 2: Nachtstreek, nacht (radio; 2 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Er is iets gestolen dat niemand ooit zag, maar dat iedereen mist. 't Het nog nooit zo donker west, of 't wer altied wel weer licht. | radio | NIEUW |
| Rikus | De politie zoekt twee Stadjers in het zwart. Ik heb niks gezien. Dat is mijn officiële verklaring. | radio | NIEUW |

### B1 Autogesprekken akte 1 (pool, in de auto of op de fiets, nooit de briefing herhalen) (banter; 13 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Dat is de Krolbrug. Hij gaat zo open. | stem | NIEUW |
| Anita | Dat is een regel, geen brug. | stem | NIEUW |
| Tammo | Dat is de Kiekdeuse. | stem | NIEUW |
| Anita | Dat is het Forum. | stem | NIEUW |
| Tammo | Daar gaat Tessa, de wandelende encyclopedie van Grunn. | stem | NIEUW |
| Anita | Ik ben Nederlandse, Tammo. Ik ken Grunn van de achterbank van jouw auto. | stem | NIEUW |
| Tammo | Dan ken je het slecht. | stem | NIEUW |
| Anita | Dan laat jij het me zien. | stem | NIEUW |
| Tammo | Reken op een rondleiding. | stem | NIEUW |
| Tammo | De Ring. Daar sta ik elke dag. | stem | NIEUW |
| Anita | Daar sta je alleen als je omrijdt. | stem | NIEUW |
| Tammo | Ik haat omleidingen. | stem | NIEUW |
| Anita | Je haat alles wat langer duurt dan een koekje. | stem | NIEUW |

### R2.0 Nachtstreek, dinsdagochtend (radio; 1 zonder stem, 3 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Kiekdoar meldt dat er geen vet meer te koop is in heel Grunn. Een luisteraar uit de Oosterpoort belt. | radio | NIEUW |

## M07 · 14 regels

### M07.1 Al het vet van Grunn: intro (intro; 5 zonder stem, 3 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | De bal is weg en wij staan op de camera. Eerlijk winnen kan nog: jouw oma won in 1953, dus die kan bakken. Dan moet Jelle eerst ergens gestopt worden. | stem | NIEUW |
| Tammo | Salamitactiek. Plakje voor plakje. | stem | NIEUW |
| Anita | Jelle koopt het vet van heel Grunn. Zonder vet bakt niemand een eierbal. Ook Oma niet. | stem | NIEUW |
| Tammo | En de bal? | stem | NIEUW |
| Anita | Die zijn we kwijt. Het vet nog niet. | stem | NIEUW |

### M07.2 Al het vet van Grunn: onderweg (key; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Goedemorgen, mevrouw. Wij hebben de Europaweg gehuurd voor een evenement. Vanaf nu is de weg dicht. Het staat in de vergunning. | telefoon | NIEUW |
| Tammo | Je kunt geen weg kopen. | stem | NIEUW |
| Anita | Hij heeft een vergunning. Dat is hetzelfde. De route verandert: we moeten door de smalle straten. | stem | NIEUW |
| Anita | De tank is vol, Tammo. Doe alsof je een volle kop soep naar de bank draagt. | stem | NIEUW |
| Tammo | Dus niet remmen. | stem | NIEUW |
| Anita | Zacht remmen. En de bochten ruim. | stem | NIEUW |
| Tammo | Ik draai als een tankwagen. | stem | NIEUW |
| Anita | Dat is het probleem. | stem | NIEUW |

### M07.5 Al het vet van Grunn: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Snackbarhouder | Nog een tank? Voor jou zet ik de friteuse open. | stem | NIEUW |

## M08 · 20 regels

### M08.1 Fatbikes tellen niet als fiets: intro (intro; 1 zonder stem, 3 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Oma Trijntje | Tammo. Kom naar de Noorderhaven. Ik heb iets over die bal. | telefoon | NIEUW |

### M08.2 Fatbikes tellen niet als fiets: onderweg (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Links! | stem | NIEUW |
| Tammo | Een fatbike. | stem | NIEUW |
| Anita | Twee. Op één. | stem | NIEUW |
| Tammo | Op één fatbike? | stem | NIEUW |
| Anita | Durk en Douwe. Ze delen een fiets, een baas en een zin. | stem | NIEUW |
| Tammo | Weer die twee. | stem | NIEUW |

### M08.3 Fatbikes tellen niet als fiets: Oma's kamer (outro; 13 zonder stem, 8 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Oma Trijntje | 1953. Dat ik won, weet je. Wat je niet weet: tweede werd een Fries meisje. Gerda Terpstra. Haar eierbal was beter. Ik wist het, zij wist het. De jury wist het niet. | stem | NIEUW |
| Anita | Gerda. | stem | NIEUW |
| Tammo | Foar mem. Mem is Gerda. | stem | NIEUW |
| Tammo | Je kijkt raar. | stem | NIEUW |
| Anita | Ik kijk altijd zo. | stem | NIEUW |
| Oma Trijntje | Het recept van 1953 had vijf dingen van vijf vrienden: vet, eieren, zout, meel en mosterd. Jelle koopt ze allemaal. Hier is het lijstje. | stem | NIEUW |
| Anita | Vijf vrienden, vijf ingrediënten. Dan kunnen we meedoen, ook als Jelle de rest opkoopt. | stem | NIEUW |
| Anita | En als we winnen, staat de Fjord Frituur op de Vismarkt. | stem | NIEUW |
| Anita | Weet u waar de bal is, oma? | stem | NIEUW |
| Oma Trijntje | Ik weet waar hij was. In een vitrine. | stem | NIEUW |
| Tammo | Jelle zegt: bij hem. | stem | NIEUW |
| Oma Trijntje | Jelle zegt veel. | stem | NIEUW |
| Oma Trijntje | Eerst Geesje, in Warffum. Zij heeft de eieren. Zeg dat ik je stuur. | stem | NIEUW |

## T1 · 4 regels

### T1 De trein naar Warffum (travel; 4 zonder stem, 5 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | We stappen uit in Warffum. Daar begint het Hogeland, en Geesje woont in de pastorie. | stem | NIEUW |
| Tammo | Warffum. Is dat nog Grunn? | stem | NIEUW |
| Anita | Joa. Dat is het Hogeland, Tammo. Dat is groter dan je denkt. | stem | NIEUW |
| Tammo | Je zegt joa als een vraag. | stem | NIEUW |

## M09 · 34 regels

### M09.1 Heel aankomen is ook een kunst: intro (intro; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geesje | Jullie zijn van Trijntje. Het zijn eieren, geen relikwieën. Maar ik ben kosteres, dus ik behandel ze zo. | stem | NIEUW |
| Anita | Moi. …Goedemorgen, bedoel ik. Het recept van 1953 heeft er zestig nodig. | stem | NIEUW |
| Geesje | Jelle Terpstra heeft alle eieren van het Hogeland gekocht, behalve de mijne. Mijn kippen hebben geen contract. | stem | NIEUW |
| Geesje | Zijn moeder, Gerda, belt Trijntje elk jaar op haar verjaardag. Ze zeggen dan allebei niks. | stem | NIEUW |
| Geesje | Jullie brengen ze heel naar de kerkkelder in Usquert. Daar is het koel, en daar komt Jelle niet. | stem | NIEUW |
| Anita | Heel, Tammo. Niet rap. Heel. | stem | NIEUW |
| Tammo | Ik rij nooit rap. | stem | NIEUW |
| Anita | Je hebt twee keer een kar gekanteld. | stem | NIEUW |
| Tammo | Eén keer. | stem | NIEUW |
| Geesje | De trekker staat bij de schuur. Hij trekt hard. | stem | NIEUW |

### M09.2 Heel aankomen is ook een kunst: de afgesloten weg (key; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | De Dorpsweg is tot vier uur van mij. Een dorpsfeest. Ook deze heer heeft een overeenkomst met ons, dus hij mag niet weg. | telefoon | NIEUW |
| Boer | Een eierkoek per week, levenslang. Daar zeg je geen nee tegen. | stem | NIEUW |
| Anita | Dan nemen we de wierdepaden. Vol gaten. Zes kratten, Tammo, en we hebben zestig eieren nodig. | stem | NIEUW |

### M09.3 Heel aankomen is ook een kunst: onderweg (key; 12 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Die koe kijkt naar me. | stem | NIEUW |
| Anita | Koeien kieken altijd. Dat is hun hobby. | stem | NIEUW |
| Tammo | Altied. | stem | NIEUW |
| Anita | Altied. Dat is hun hobby. | stem | NIEUW |
| Tammo | In Grunn kijkt niemand zo lang. | stem | NIEUW |
| Anita | In Grunn kijkt niemand omhoog. Dit is een wierde, Tammo. Mensen bouwden hem zelf, tegen het water. | stem | NIEUW |
| Tammo | Zelf gebouwd? Met de hand? | stem | NIEUW |
| Anita | Met de hand en tweeduizend jaar geduld. | stem | NIEUW |
| Tammo | Ik kan geen kast in elkaar zetten. | stem | NIEUW |
| Anita | Dat weet ik. | stem | NIEUW |
| Anita | Een bult. Rustig. | stem | NIEUW |
| Tammo | Een ei. | stem | NIEUW |

### M09.4 Heel aankomen is ook een kunst: de kerkkelder (outro; 8 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geesje | De kratten staan heel. Dat is een kerkelijk wonder. | stem | NIEUW |
| Anita | Zes kratten, zestig eieren, alle heel. Ik heb ze drie keer geteld, voor de zekerheid. | stem | NIEUW |
| Geesje | Dat is meer dan de dominee ooit haalde. | stem | NIEUW |
| Durk | Douwe. De eieren zijn weg. | stem | NIEUW |
| Douwe | …weg. | stem | NIEUW |
| Geesje | Ze staan in de kerkkelder. Jullie komen te laat. | stem | NIEUW |
| Durk | Wij hebben geld. In een klomp. | stem | NIEUW |
| Geesje | Dan koopt u een eierkoek. | stem | NIEUW |

### M09.5 Heel aankomen is ook een kunst: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geesje | Weer eieren? De kippen sturen een kaartje. | stem | NIEUW |

## M10 · 28 regels

### M10.1 Een trekker-limo op de wierde: intro (intro; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Goedemiddag. Ik ben hier niet voor de eieren. Ik ben hier voor u. | stem | NIEUW |
| Jelle Terpstra | U bent in het museum geweest. Mijn bewaker heeft beelden. Ik stel een overeenkomst voor: u verlaat Grunn en de Snackprijs, en de beelden verdwijnen. | stem | NIEUW |
| Jelle Terpstra | Het kaartje in de vitrine was voor u. Bewaker twee belde mij vooraf. De alarmen telde ik voor de gezelligheid. | stem | NIEUW |
| Anita | En de bal? | stem | NIEUW |
| Jelle Terpstra | Die is hier. In deze koffer. Mijn juristen willen dat ik hem bij me draag. | stem | NIEUW |
| Tammo | Je hebt hem dus echt. | stem | NIEUW |
| Jelle Terpstra | Juridisch gezegd: ja. Durk, Douwe, pak ze. | stem | NIEUW |
| Anita | Uithuizen heeft een sloot en een limo heeft geen vleugels. Wij zijn daar eerder. Dan moet hij uit zijn limo, en dan zien we wat er in die koffer zit. Op de quad. Nu. | stem | NIEUW |

### M10.2 Een trekker-limo op de wierde: de achtervolging (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Links, over het kerkenpad. | stem | NIEUW |
| Tammo | Een pad voor mensen met een rouwjas. | stem | NIEUW |
| Anita | Een pad voor mensen met een quad. | stem | NIEUW |
| Jelle Terpstra | Mevrouw, u kunt niet weg. Ik heb een limo. | telefoon | NIEUW |
| Anita | En ik een quad. | stem | NIEUW |
| Tammo | Houd je vast. | stem | NIEUW |
| Anita | Ik heb stuur. | stem | NIEUW |

### M10.3 Een trekker-limo op de wierde: aan de sloot (outro; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Mem is eenennegentig. Zeventig jaar heeft ze tweede gestaan, Grinzers. | stem | NIEUW |
| Jelle Terpstra | Ik laat haar niet nog een jaar tweede staan. | stem | NIEUW |
| Anita | Wil je mem dat wel? | stem | NIEUW |
| Jelle Terpstra | Mem wil niks. Daarom doe ik het. | stem | NIEUW |
| Anita | Dat klonk bekend. | stem | NIEUW |
| Jelle Terpstra | Oant sjen! | stem | BEHOUDEN |
| Douwe | …Plons. | stem | NIEUW |

### M10.4 Autogesprek: hij heeft hem echt (banter; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Hij kijkt eerst of de koffer droog is. Dan pas of hij zelf nat is. | stem | NIEUW |
| Tammo | Dat is een prioriteit. | stem | NIEUW |
| Anita | Dat is liefde of een contract. | stem | NIEUW |
| Tammo | Bij hem is dat hetzelfde. | stem | NIEUW |
| Tammo | Of hij is dom. | stem | NIEUW |
| Anita | Hij heeft de bal. Wij hebben de eieren. | stem | NIEUW |

## T2 · 5 regels

### T2 De streekbus naar Zoutkamp (travel; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Oma Trijntje stuurt ons naar Kapitein Klaas in Zoutkamp. Hij heeft een boot, en Jelle heeft daar een skûtsje: een groot Fries zeilschip. | stem | NIEUW |
| Buschauffeur | Ik rijd tot Winsum. Daar stapt u over op de lijn naar Zoutkamp. Dat is de laatste halte, daarna is er alleen nog water. | stem | NIEUW |
| Tammo | Dat klinkt als thuis. | stem | NIEUW |
| Anita | Dat is een compliment, hè. | stem | NIEUW |
| Buschauffeur | Uitstappen bij de haven, allemaal. Dan zie je het water. | stem | NIEUW |

## M11 · 69 regels

### M11.1 Geleend van de Friezen: intro (intro; 9 zonder stem, 2 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Kapitein Klaas | Van Trijntje, hè? Jullie sliepen op mijn boot en ik heb niks gezien. Ik viste dertig jaar fietsen uit de Diepenring. Nu vis ik ze uit het Reitdiep. Bijna niemand mist ze. | stem | NIEUW |
| Kapitein Klaas | Wil je weten wat de vissers hier echt zeggen, ga dan op het Leugenbankje zitten. Daar liegen ze allemaal, behalve ik. | stem | NIEUW |
| Kapitein Klaas | Het havenkantoor meldt dat Jelle een skûtsje heeft met een gouden bal in de kist. Hij vaart naar Lauwersoog, voor de pers. | stem | NIEUW |
| Anita | Dat klinkt als een val. | stem | NIEUW |
| Kapitein Klaas | Het is een val. Maar zolang hij naar het water kijkt, kijkt hij niet naar het wad. Daar ligt vanavond het zout van Oma. | stem | NIEUW |
| Kapitein Klaas | Hier. Een snelle boot. Ik zit bovenin, ik kijk de andere kant op. Tot de sluizen bij Lauwersoog. Daarna is het open water en ben je voor eigen rekening. | stem | NIEUW |
| Kapitein Klaas | Praat tegen je boot, mensen. Dat helpt. | stem | NIEUW |
| Tammo | Hij luistert niet. | stem | NIEUW |
| Kapitein Klaas | Hij luistert wel. Alleen niet naar jou. | stem | NIEUW |

### M11.2 Geleend van de Friezen: de achtervolging (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Het skûtsje. Links van de zandplaat. | stem | NIEUW |
| Tammo | Groter dan ik dacht. | stem | NIEUW |
| Anita | Het is een skûtsje. Dat is groter dan alles. | stem | NIEUW |
| Kapitein Klaas | Niet voorbij de sluizen, mensen. Daarachter is het de Waddenzee, en daar vaar ik niet met een rubberboot. | telefoon | NIEUW |
| Jelle Terpstra | Mevrouw. U vaart op de vaargeul van Us Mem Snacks. Daar staat een tarief op. | telefoon | NIEUW |
| Anita | Nu, Tammo. Spring. | stem | NIEUW |

### M11.3 Geleend van de Friezen: aan boord (key; 2 zonder stem, 5 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Die twee mogen de chocola houden. De echte is bij mij, en daar blijft hij. | telefoon | NIEUW |
| Anita | Dus de bal is hier niet. Dan halen we het zout voor Oma's recept. | stem | NIEUW |

### M11.4 Geleend van de Friezen: het zout (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Kapitein Klaas | Het zout van Oma ligt bij Noordpolderzijl, op de kwelder. Dat is grasland aan zee, dat bij eb droog ligt. | stem | NIEUW |
| Kapitein Klaas | Een zijl is een sluis die denkt dat hij een dorp is. Jelle kocht al het zout. | stem | NIEUW |
| Kapitein Klaas | Eerst zit je een uur vast op een zandplaat: de wind duwt het water uit het meer. Daarna rijdt mijn neef jullie langs de dijk naar de kwelder. | stem | NIEUW |
| Tammo | Waarom zout? | stem | NIEUW |
| Kapitein Klaas | Oma's eierbal van 1953 had zout dat nog naar zee smaakte. | stem | NIEUW |

### M11.5 Geleend van de Friezen: de zandplaat (key; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Kapitein Klaas | Wij zitten vast, mensen. Dat is geen ramp. De wind duwt het water weg, over een uur komt het terug. | stem | NIEUW |
| Anita | Een uur. Op een zandplaat. | stem | NIEUW |
| Kapitein Klaas | Kijk omhoog. Boven het Lauwersmeer is het donkerste stuk van het land. | stem | NIEUW |
| Tammo | Dat zie ik. | stem | NIEUW |
| Anita | Dat is de Melkweg, Tammo. | stem | NIEUW |
| Tammo | Ik dacht dat dat een vlek was. | stem | NIEUW |
| Anita | Het is een vlek van driehonderd miljard sterren. | stem | NIEUW |
| Tammo | …Groter dan een vlek. | stem | NIEUW |

### M11.6 Geleend van de Friezen: de lange blik (key; 4 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Je kijkt naar mij, Tammo. De sterren zijn daar. | stem | NIEUW |
| Tammo | Die gaan toch niet onder. | stem | NIEUW |
| Tammo | Nog steeds lang? | stem | NIEUW |
| Anita | Kijk naar de sterren. | stem | NIEUW |

### M11.7 Geleend van de Friezen: de kwelder (key; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Kustwachter | Kustwacht. Melding van twee mensen in zwarte kleding op het wad. Waarschijnlijk schapen. | stem | NIEUW |
| Tammo | Ik ben geen schaap. | stem | NIEUW |
| Anita | Dat is jouw verdediging? | stem | NIEUW |
| Anita | Het licht gaat links. Wij gaan rechts, door het gras. | stem | NIEUW |
| Tammo | Drie emmers zout. | stem | NIEUW |
| Anita | Er komt water. | stem | NIEUW |
| Kapitein Klaas | Nu terug, mensen. Het water denkt niet na. | telefoon | NIEUW |
| Anita | Rennen, Tammo. | stem | NIEUW |

### M11.8 Geleend van de Friezen: outro (outro; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Kapitein Klaas | Dat zout is van Oma. Jelle kocht al het zout, maar de zee is niet te koop. Nog niet. | stem | NIEUW |
| Dokter Dijkstra | Dijkstra, van het UMCG, het ziekenhuis. Trijntje kookte vroeger voor mijn afdeling, dus ik help. | telefoon | NIEUW |
| Dokter Dijkstra | Morgen vliegt Jelle met zijn koopboek in een ballon boven de Dollard. Hij boekte de ballon via mijn zwager. | telefoon | NIEUW |
| Dokter Dijkstra | Ik heb een heli en ik haal jullie op. Dit stond niet in het rooster. | telefoon | NIEUW |
| Anita | Een koopboek met alles wat hij wil kopen. Dat moeten we hebben. | stem | NIEUW |
| Kapitein Klaas | En daarna naar de Eemshaven. Dat is Lammerts haven. Zijn vader danste met Trijntje in 1953. | stem | NIEUW |

### R2.3 Nachtstreek, donderdagnacht (radio; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Het Plantsoenfestijn opent vandaag in het Noorderplantsoen. Elf dagen theater en muziek. Het is er druk. | radio | NIEUW |
| Rikus | Het festival heeft een hoofdsponsor: Oldenhuis Bakt, de keten met de eenenveertig snackbars. Bij elke frikandel hoort een bonnetje voor een tweede. Ik zeg niks. | radio | NIEUW |
| Jelle Terpstra | Rikus. Ik ga naar de haven. De Eemshaven is van mij. | radio | NIEUW |
| Rikus | Storingsbericht: de Krolbrug is in storing. Niemand merkt verschil. | radio | NIEUW |
| Rikus | De torenwachter belde niet. Dat is ook nieuws. | radio | NIEUW |

### B2 Autogesprekken akte 2 (pool; Tessa laat Tammo de provincie zien, Tammo baalt van haar gelijk) (banter; 16 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Kijk. Dat is de Waddenzee. | stem | NIEUW |
| Tammo | Een groot nat veld. | stem | NIEUW |
| Anita | Het is werelderfgoed. | stem | NIEUW |
| Tammo | Dan is het een groot nat erfgoed. | stem | NIEUW |
| Anita | Daar. Een kerk. Honderd kerken in dit stuk. | stem | NIEUW |
| Tammo | Voor honderd mensen? | stem | NIEUW |
| Anita | Voor honderd keer één. | stem | NIEUW |
| Tammo | In Grunn hebben we de Martinitoren. | stem | NIEUW |
| Anita | Die is ook van de provincie. | stem | NIEUW |
| Tammo | Waarom ken je dit allemaal? | stem | NIEUW |
| Anita | Ik heb veel gelezen. | stem | NIEUW |
| Tammo | En je bent Nederlandse. | stem | NIEUW |
| Anita | Dat helpt niet. | stem | NIEUW |
| Anita | Knooppunt negenentachtig, dan negentig. Daar gaan we naar rechts. | stem | NIEUW |
| Tammo | Ik navigeer op gevoel. | stem | NIEUW |
| Anita | Daarom staan we hier. | stem | NIEUW |

## M12 · 24 regels

### M12.1 Het staat niet in het rooster: intro (intro; 5 zonder stem, 5 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Dokter Dijkstra | Mijn traumaheli staat in onderhoud. Dit is die van Rotor Roelf, en mijn nachtdienst heeft honger. | stem | NIEUW |
| Anita | Wij zoeken Jelles ballon. Hij vliegt boven de Dollard, met zijn koopboek in een aktetas. Daarin staat welk plakje hij als volgende koopt. | stem | NIEUW |
| Dokter Dijkstra | Eerst de lunch. Achterin staat een koeltas voor mijn collega's. Zij hebben twaalf uur niets gegeten. | stem | NIEUW |
| Dokter Dijkstra | Dan de ballon. Ik heb een lier. Tessa houdt de heli stil naast de mand. Tammo hangt aan de lier en pakt de tas. | stem | NIEUW |
| Anita | Ik heb drie lessen gehad en een jaar vlieggames gespeeld. Dat is meer dan Tammo. | stem | NIEUW |

### M12.2 Het staat niet in het rooster: de lunch (key; 4 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rotor Roelf | Moi! Rotor Roelf. Die heli is van mij, ik zette hem gisteren op het UMCG-dak. | telefoon | NIEUW |
| Rotor Roelf | De lunch is van Dijkstra. Nait tegen d'Olle Grieze aan, hè? | telefoon | NIEUW |
| Tammo | Een gewone vrijdag. | stem | NIEUW |
| Dokter Dijkstra | En nu de ballon. Naar de Dollard. | stem | NIEUW |

### M12.3 Het staat niet in het rooster: de ballon (key; 9 zonder stem, 5 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Daar. Een gele ballon, en hij staat al bol. | stem | NIEUW |
| Tammo | De aktetas. Naast Jelle. | stem | NIEUW |
| Jelle Terpstra | Goedemiddag. U nadert privé-luchtruim, mevrouw. Mijn ballon heeft voorrang. Dat staat in het contract. | stem | NIEUW |
| Anita | Wij zijn een heli. | stem | NIEUW |
| Durk | Douwe. Een heli. | stem | NIEUW |
| Douwe | …heli. | stem | NIEUW |
| Tammo | Ik heb hem! | stem | NIEUW |
| Tammo | Doe bist schier. | stem | BEHOUDEN |
| Anita | Je zei "doe bist schier" tegen de ballon. | stem | NIEUW |

### M12.4 Het staat niet in het rooster: outro (outro; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Het koopboek van Jelle. Acht plakjes, en bij elk plakje staat in de kantlijn "Foar mem", met een hartje. | stem | NIEUW |
| Tammo | En het laatste plakje? | stem | NIEUW |
| Anita | "De bewaarder." Daarbij staat: notaris, 28 augustus, drie uur. Meer niet. | stem | NIEUW |
| Tammo | Container 4471 staat bij de haven. | stem | NIEUW |
| Anita | Dan weten we waar we vannacht moeten zijn. Hier. | stem | NIEUW |
| Dokter Dijkstra | Die Fries is geland in een weiland bij Winschoten. Tussen de koeien. Hij was niet blij. De koeien ook niet. | stem | NIEUW |

## M13 · 30 regels

### M13.1 Het containerlabyrint: intro (intro; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Wij komen van Oma Trijntje. In Jelles koopboek staat: vannacht vertrekt zijn schip uit de Eemshaven, met alle reserves van Oma's vrienden aan boord. | stem | NIEUW |
| Lammert | Hier vaart de Borkum-veerboot en daar zoemt het datacenter. Ik ben de havenmeester en ik vertel altijd wat er niet is: een leeg schip en een volle kabel. | stem | NIEUW |
| Lammert | Mijn vader danste in 1953 met Trijntje. Dat vergeet zij niet. | stem | NIEUW |
| Anita | De lading staat in container 4471: alles wat de vrienden van Oma extra hadden en Jelle opkocht. Het schip vertrekt om zes uur. | stem | NIEUW |
| Lammert | Hier zijn de papieren. Jullie wisselen ze om. Dan blijft alles hier. | stem | NIEUW |
| Tammo | Eén container tussen alle windmolenbladen en kabelrollen? | stem | NIEUW |
| Lammert | Wij hebben geen containerterminal. Wij hebben één container en weten niet van wie. | stem | NIEUW |
| Lammert | Hij staat onder een stapel kabelrollen, naast de rode. | stem | NIEUW |
| Tammo | Ze zijn bijna allemaal rood. | stem | NIEUW |
| Lammert | Dan moet je de blauwe zoeken. | stem | NIEUW |
| Anita | We pakken de kraan. Dan zien we van boven welke blauw is. | stem | NIEUW |

### M13.2 Het containerlabyrint: in de kraankooi (key; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Lammert | De kraan piept. De bewaker kijkt bij het tweede piepje omhoog. | telefoon | NIEUW |
| Anita | Niet bewegen. De bewaker kijkt omhoog. | stem | NIEUW |
| Tammo | Ik beweeg niet. | stem | NIEUW |
| Anita | Je ademt. | stem | NIEUW |
| Tammo | Niet te voorkomen. | stem | NIEUW |
| Anita | Je kunt het proberen. | stem | NIEUW |
| Tammo | Ik doe mijn best. | stem | NIEUW |
| Anita | Hij loopt weg. Nu. | stem | NIEUW |

### M13.3 Het containerlabyrint: outro (outro; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Lammert | Het schip vaart leeg weg. Jelle krijgt zijn lading nooit. | stem | NIEUW |
| Lammert | Mijn vrachtwagen brengt alles wat jullie hebben gered vannacht naar mijn woonschip in Delfzijl. | stem | NIEUW |
| Lammert | Dit vat is van mijn vader: het vet van 1953. Voor Oma. | stem | NIEUW |
| Lammert | Vanochtend om acht uur tekent Trijntje op de sluis de overdracht van mijn woonschip. Dan mag de deurwaarder er niet meer bij. | stem | NIEUW |
| Lammert | Jullie slapen in mijn havenkantoor. | stem | NIEUW |
| Tammo | Een kantoor? | stem | NIEUW |
| Lammert | Met een bed. Twee bedden. | stem | NIEUW |
| Anita | Twee bedden. | stem | NIEUW |
| Anita | Dat gezicht betekent: prima. | stem | NIEUW |
| Tammo | Klopt. | stem | NIEUW |

### M13.4 Het containerlabyrint: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Lammert | De bewaker kijkt nog steeds omhoog. Hij wacht al een uur. | stem | NIEUW |

## M14 · 27 regels

### M14.1 De dijk: intro (intro; 7 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Goedemorgen. Mijn deurwaarder neemt om acht uur het woonschip van meneer Lammert in beslag. Ik heb gisteren zijn huurschuld gekocht. | stem | NIEUW |
| Anita | In beslag nemen: dan neemt hij alles mee wat Lammert voor Oma bewaart. Trijntje wacht op de sluis met de pen. Tekent ze eerst, dan komt de deurwaarder te laat. | stem | NIEUW |
| Jelle Terpstra | Dan raad ik u aan eerder aan de sluis te zijn dan mijn deurwaarder. Wie wint, mag famke een eierbal geven. | stem | NIEUW |
| Anita | We rijden over de dijk naar de sluis van Delfzijl. Eerste aan de sluis wint, en de voorraad blijft van ons. | stem | NIEUW |
| Tammo | Ik rij. | stem | NIEUW |
| Anita | Ik zeg: links, rechts, schaap. | stem | NIEUW |
| Tammo | Daar heb ik niks aan. | stem | NIEUW |

### M14.2 De dijk: tijdens de race (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Schaap links. | stem | NIEUW |
| Tammo | Ik zie het. | stem | NIEUW |
| Anita | Zijwind. Niet aan het stuur trekken. | stem | NIEUW |
| Tammo | Ik trek nooit aan het stuur. | stem | NIEUW |
| Anita | Je hebt net getrokken. | stem | NIEUW |
| Jelle Terpstra | Mevrouw, kom maar mee in mijn limo. Daar is plek. | telefoon | NIEUW |
| Anita | Rij, Tammo. | stem | NIEUW |

### M14.3 De dijk: na de finish (outro; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Lammert | De overdracht is getekend, om vijf voor acht. Het beslag mislukt. Alleen mijn kade is verhuurd, voor een evenement. | stem | NIEUW |
| Deurwaarder | Dat is nu officieel. Daar kan ik niets tegen doen. | stem | NIEUW |
| Tammo | Je ziet er goed uit met wind. | stem | NIEUW |
| Anita | Mijn haar zit overal, Tammo. | stem | NIEUW |
| Tammo | Dat bedoelde ik niet. | stem | NIEUW |
| Anita | Wat bedoelde je dan? | stem | NIEUW |
| Tammo | …Dat bedoelde ik wel. | stem | NIEUW |
| Anita | Tammo. Je bent rood. | stem | NIEUW |
| Tammo | Dat is de wind. | stem | NIEUW |
| Jelle Terpstra | Durk, Douwe, hoe vaak moet ik het zeggen? Contract is contract. Wij komen terug. | stem | NIEUW |

### M14.4 De dijk: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Een rondje meer of minder. Dat neem ik jullie niet kwalijk. | stem | NIEUW |

### R3.1 Nachtstreek na de dijk (radio; 2 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Wind uit het noordwesten. Op de Eemsdijk zijn zeventien schapen gered van een deurwaarder. Ik weet niet hoe. | radio | NIEUW |
| Rikus | Kiekdoar meldt dat Oldenhuis Bakt in Delfzijl een bestaande snackbar verbouwt, naast de visboer. De visboer lacht niet. | radio | NIEUW |

## T3 · 9 regels

### T3 De trein naar Winschoten (travel; 9 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | We nemen de trein naar Winschoten. Jelle geeft de juryleden daar een proeverij op de kermis. Dat staat in zijn koopboek. Roelfien wacht met haar vliegtuigje bij Midwolda. | stem | NIEUW |
| Anita | Let op, de trein gaat eerst terug via Station Grunn. | stem | NIEUW |
| Tammo | Dus we gaan eerst naar huis. | stem | NIEUW |
| Anita | Even groeten, dan door. | stem | NIEUW |
| Tammo | Een kermis. In de provincie. | stem | NIEUW |
| Anita | Ze hebben hier ook botsauto's. | stem | NIEUW |
| Tammo | Dat wist ik. | stem | NIEUW |
| Anita | Dat wist je niet. | stem | NIEUW |
| Tammo | Een beetje. | stem | NIEUW |

## M15 · 30 regels

### M15.1 Laag over het graan: intro (intro; 9 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Roelfien | Trijntje zei dat Tammo niks kan, maar het met overtuiging doet. Ik zeg het maar meteen, dan weten we dat allebei. | stem | NIEUW |
| Anita | Jelle wil de juryleden kopen met een proeverij. | stem | NIEUW |
| Roelfien | Dan laten we de hele kermis zien wat hij doet. Mijn vliegtuigje sleept al twintig jaar een spandoek voor de kermis. | stem | NIEUW |
| Roelfien | Vlieg laag, houd de molen rechts en trek de neus pas omhoog na de kermis. | stem | NIEUW |
| Roelfien | Het graan staat er nog. Dat wacht op het weer, niet op Jelle. | stem | NIEUW |
| Tammo | Ik heb nog nooit gevlogen. | stem | NIEUW |
| Anita | Je hing aan een touw. | stem | NIEUW |
| Tammo | Dat telt niet. | stem | NIEUW |
| Anita | Tammo, jij zegt links of rechts. | stem | NIEUW |

### M15.2 Laag over het graan: boven de kermis (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Links. Rechts. Links. | stem | NIEUW |
| Anita | Dat is niet hoe links werkt. | stem | NIEUW |
| Roelfien | Het spandoek staat recht. Ze lezen het. | telefoon | NIEUW |
| Anita | "Jelle koopt de jury. Levenslang eierballen." Dat staat erop. | stem | NIEUW |
| Tammo | Het staat goed. | stem | NIEUW |
| Jelle Terpstra | Dat is… eerlijk. | telefoon | NIEUW |

### M15.3 Laag over het graan: outro (outro; 14 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jurylid | Is dit waar? Jelle koopt de jury? | stem | NIEUW |
| Jelle Terpstra | Het is een proeverij. Er wordt alleen geproefd. | stem | NIEUW |
| Jurylid | Ik stap eruit. | stem | NIEUW |
| Jurylid | Ik ook. | stem | NIEUW |
| Roelfien | Twee van de vier andere juryleden zijn weggelopen. De andere twee zitten nog bij Jelle. | stem | NIEUW |
| Anita | Twee weg. Dat scheelt. Als ze maar wegblijven. | stem | NIEUW |
| Roelfien | De molen in Midwolda is van Jelle. Fijn meel krijg je daar niet meer. Ik heb mijn eigen graan. Dat is grof. | stem | NIEUW |
| Anita | Dan heeft Jelle al het fijne meel. | stem | NIEUW |
| Roelfien | Oma's recept lust grof. Hier is het meel. Voor Trijntje. | stem | NIEUW |
| Anita | Dan is het meel gered. Alleen de mosterd nog. | stem | NIEUW |
| Tammo | Dank je, Roelfien. | stem | NIEUW |
| Roelfien | Doe de groeten aan Trijntje. En zeg dat de kermis mooi is. | stem | NIEUW |
| Anita | Vol, tenminste. | stem | NIEUW |
| Anita | Durk en Douwe zitten nog bij Geert. Zij weten waar Jelle heen gaat. | stem | NIEUW |

### M15.4 Laag over het graan: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Roelfien | Het spandoek is gewassen. Het graan heeft niks gezien. | stem | NIEUW |

## M16 · 47 regels

### M16.1 Nog eentje dan: intro (intro; 4 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geert | Moi. Geert, van de Poelestraat. Er zitten twee Friese reuzen aan mijn bar en ze zingen al een uur. Ik heb drie tenten op deze kermis. Blijf bij ze. | stem | NIEUW |
| Geert | En Tessa: mijn nieuwe barman wil heel graag je nummer. | stem | NIEUW |
| Anita | Drie tenten. Daarna vertellen ze alles, en daarna weten ze het zelf niet meer. | stem | NIEUW |
| Tammo | Ik drink maar één. | stem | NIEUW |

### M16.2 Nog eentje dan: tussen de tenten (key; 5 zonder stem, 2 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Student | Proost! Nog eentje dan! | stem | NIEUW |
| Anita | Wie is dat? | stem | NIEUW |
| Tammo | Een eerstejaars. Ze zijn overal. | stem | NIEUW |
| Student | Ik hou van jullie allemaal! | stem | BEHOUDEN |
| Tammo | Dat geloof ik. | stem | NIEUW |

### M16.3 Nog eentje dan: de botsauto's (key; 4 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Durk | Baas zegt: jij bent de duif. Maar eerst bier. | stem | BEHOUDEN |
| Anita | Een rit. Wij tegen jullie. Wie wint, krijgt een antwoord. | stem | NIEUW |
| Durk | Welke vraag? | stem | NIEUW |
| Anita | Waar is de bal, en waar gaat Jelle maandag heen? | stem | NIEUW |

### M16.4 Nog eentje dan: de rit en de kus (key; 9 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Links, Tessa. Links. | stem | NIEUW |
| Anita | Dat is mijn links. | stem | NIEUW |
| Durk | Douwe, wij botsen. | stem | NIEUW |
| Douwe | …botsen. | stem | NIEUW |
| Anita | Je had vandaag drie keer ongelijk. Maar je bleef wel naast me. | stem | NIEUW |
| Tammo | Dat deel kan ik. | stem | NIEUW |
| Kermisexploitant | Eruit! Hier wordt gebotst, niet gekust! Wie wil er een lolly? | stem | NIEUW |
| Tammo | Au. | stem | NIEUW |
| Anita | Au. | stem | NIEUW |

### M16.5 Nog eentje dan: het antwoord (key; 4 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Durk | Baas rijdt maandag naar Veendam, voor de mosterd. De bal gaat mee, in de gouden koffer onder het kussen van de limo. | stem | NIEUW |
| Anita | Hij heeft hem echt. En hij draagt hem altijd bij zich. | stem | NIEUW |
| Tammo | Dan pakken we hem in Veendam. | stem | NIEUW |
| Durk | Net fertelle, hè? | stem | NIEUW |

### M16.6 Nog eentje dan: de dijk (outro; 4 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | In de botsauto mocht ik niet sturen. | stem | NIEUW |
| Anita | Dat zeg ik niet vaak. | stem | NIEUW |
| Anita | Dat gezicht betekent: ik leef nog. | stem | NIEUW |
| Tammo | Klopt. | stem | NIEUW |

### M16.7 Nog eentje dan: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geert | Drie tenten? Nog eentje dan. | stem | NIEUW |

### R3.3 Overgang naar akte 4: Nachtstreek (radio; 1 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Zondag. Het is stil in Winschoten. Dat is ook een kermis. | radio | NIEUW |

### B3 Autogesprekken akte 3 (pool; haven, dijk, graan; Moffel-en-Piertje) (banter; 15 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Wat draait daar? | stem | NIEUW |
| Anita | Een windturbine. Honderd meter hoog. | stem | NIEUW |
| Tammo | Dan is het een grote molen. | stem | NIEUW |
| Tammo | Wel. | stem | NIEUW |
| Anita | Daar, Appingedam. Die balkons hangen boven het Damsterdiep. | stem | NIEUW |
| Tammo | Keukens. | stem | NIEUW |
| Anita | …Hoe weet jij dat? | stem | NIEUW |
| Tammo | Een tante van mij kookte erin. Ze gooide de schillen in het water. De eenden kenden haar. | stem | NIEUW |
| Tammo | Dan zet ik mijn friteuse daar. | stem | NIEUW |
| Anita | Dan krijgt het Damsterdiep een vetlaag. | stem | NIEUW |
| Tammo | De Dollard. Een bocht in de zee. | stem | NIEUW |
| Anita | Een inham. | stem | NIEUW |
| Tammo | Een bocht met ambitie. | stem | NIEUW |
| Anita | Je geeft nooit toe. | stem | NIEUW |
| Tammo | Jij ook niet. | stem | NIEUW |

## M17 · 29 regels

### M17.1 Open, dicht: intro (intro; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Wubbo | Open of dicht. Nooit allebei. Dat is mijn hele werkfilosofie. Trijntje zocht iemand die kan wachten, en ik ben brugwachter. | stem | NIEUW |
| Anita | Jelle haalt vandaag in Veendam de mosterd, zegt Durk. Zijn mosterdschip moet door elf van jouw bruggen. De bal reist met hem mee. | stem | NIEUW |
| Wubbo | Vaar jij voor zijn schip uit, dan sluit ik de bruggen achter je. Dan zit zijn schip vast. | stem | NIEUW |
| Tammo | Hoe weten we wanneer? | stem | NIEUW |
| Wubbo | Elf bruggen. Toeter bij een gesloten brug, dan open ik op het ritme van de fanfare. Mis je de maat, dan wacht je. | stem | NIEUW |
| Wubbo | Mijn brug is op tijd. Laat je boot dat ook zijn. | stem | NIEUW |
| Tammo | Tessa. Even over zaterdag. In de botsauto. | stem | NIEUW |
| Anita | Welke zaterdag? | stem | NIEUW |

### M17.2 Open, dicht: de fanfare weg (key; 12 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Wubbo | De fanfare is vertrokken. Iemand heeft ze een contract gegeven voor een optocht. | telefoon | NIEUW |
| Jelle Terpstra | De fanfare speelt vandaag voor Us Mem Snacks. U hoort wel hoe bruggen klinken zonder muziek. | telefoon | NIEUW |
| Wubbo | Ik fluit. Eén keer fluiten is open. Twee keer is dicht. | telefoon | NIEUW |
| Anita | Luister naar de fluit, Tammo. | stem | NIEUW |
| Tammo | Fluiten kan ik. | stem | NIEUW |
| Wubbo | Brug acht. Open. Nu. | telefoon | NIEUW |
| Anita | Rechtdoor, Tammo. | stem | NIEUW |
| Tammo | Ik zie alleen een brug. | stem | NIEUW |
| Anita | Dat is ook de bedoeling. | stem | NIEUW |
| Wubbo | Brug negen. Dicht. Nog niet. | telefoon | NIEUW |
| Tammo | Dicht? Nu? | stem | NIEUW |
| Wubbo | Nu pas. | telefoon | NIEUW |

### M17.3 Open, dicht: outro (outro; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | De limo. Met de koffer. | stem | NIEUW |
| Wubbo | Die brug draait niet voor een limo. | stem | NIEUW |
| Wubbo | Het schip zit vast. De mosterd is van jullie. Grove mosterd, niet dat zoete spul. | stem | NIEUW |
| Anita | De mosterd is gered. Voor Oma. | stem | NIEUW |
| Wubbo | Er is een webbureau in Veendam dat alles om middernacht bijwerkt. Ook mijn bruggen. | stem | NIEUW |
| Tammo | Om middernacht. Net als de museumcamera's. | stem | NIEUW |
| Anita | Dat is toeval, Tammo. | stem | NIEUW |
| Tammo | Dat moeten we weten. | stem | NIEUW |

### M17.4 Open, dicht: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Wubbo | Weer elf bruggen? Open. Dicht. Ik heb het al geleerd. | stem | NIEUW |

## M18 · 42 regels

### M18.1 Wie draaide de camera's uit?: intro (intro; 9 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Wiebelwerk. Websites met karakter. | stem | NIEUW |
| Tammo | Wie de camera's uitzet, heeft de bal. | stem | NIEUW |
| Anita | Als in het logboek staat dat Jelle de bal al had, zijn wij geen dieven maar getuigen. Dan moeten we de serverkamer in. | stem | NIEUW |
| Anita | De koepel hing sinds woensdag onder een doek. Woensdag was twaalf augustus. Dat logboek wil ik zien. | stem | NIEUW |
| Sjabbe | Wiebelwerk? Daar liet ik mijn website maken. Zij beheren ook de camera's van het museum. Mijn website is nog steeds in aanbouw. | telefoon | NIEUW |
| Accountmanager | Welkom bij Wiebelwerk. Wij maken websites. Wat is uw behoefte? | stem | NIEUW |
| Anita | Een website voor een frietwagen. | stem | NIEUW |
| Accountmanager | Prachtig. Dan beginnen we met een intake. | stem | NIEUW |
| Anita | Antwoord alsof je de frietwagen zelf bent: warm, droog en eerlijk. | stem | NIEUW |

### M18.2 Wie draaide de camera's uit?: de intake gehaald (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Accountmanager | Warm, droog en een beetje Gronings. Sinds deze zomer, jong maar eerlijk. Ik zie het voor me. | stem | NIEUW |
| Accountmanager | Ik maak een offerte. Dat duurt een uur. Ik haal koffie. | stem | NIEUW |
| Anita | Neem de tijd. | stem | NIEUW |
| Accountmanager | De serverkamer is niet voor klanten. De koffieautomaat staat in de andere gang. | stem | NIEUW |
| Tammo | Dat ging makkelijk. | stem | NIEUW |
| Anita | Wacht tot we binnen zijn. | stem | NIEUW |

### M18.6 Wie draaide de camera's uit?: de accountmanager twijfelt (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Accountmanager | Interessant. Bijna alle antwoorden klopten. Eén niet. | stem | NIEUW |
| Anita | Wij zijn nieuw. | stem | NIEUW |
| Accountmanager | Iedereen is nieuw bij een intake. Ik loop even mee naar de koffieautomaat. In de gang. | stem | NIEUW |
| Tammo | Die staat bij de serverdeur. | stem | NIEUW |
| Accountmanager | Dan is dat uw route. | stem | NIEUW |

### M18.7 Wie draaide de camera's uit?: de beveiliging loopt mee (key; 4 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Accountmanager | Twee antwoorden die geen klant geeft. Ik nodig u uit voor een rondleiding. Met de beveiliging. | stem | NIEUW |
| Tammo | Is dat gratis? | stem | NIEUW |
| Accountmanager | Bij Wiebelwerk is alles gratis, behalve de website. | stem | NIEUW |
| Anita | Loop maar voor. Wij volgen. | stem | NIEUW |

### M18.3 Wie draaide de camera's uit?: de servers (key; 12 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | De update. Altijd om middernacht, drie minuten. | stem | NIEUW |
| Anita | Behalve twaalf augustus. Dan stond hij op elf minuten. Aangevraagd door: Us Mem Snacks. | stem | NIEUW |
| Tammo | Jelle. | stem | NIEUW |
| Anita | En kijk: zijdeur, drie minuten over twaalf, met de toegangspas van bewaker twee. Gasten: Durk en Douwe, om te sjouwen. | stem | NIEUW |
| Anita | Een melding van bewaker twee, 16 augustus: duif op het dak, twee Stadjers kijken mee. | stem | NIEUW |
| Tammo | De bewaker met het koekje. En twee reuzen. | stem | NIEUW |
| Tammo | De toegangspas van mevrouw Hoving. Die was die dag geblokkeerd. | stem | NIEUW |
| Anita | Zodat zij niets merkte. Dat is vijf dagen vóór onze kraak. Hij had hem toen al. | stem | NIEUW |
| Tammo | Dus wij kraakten een leeg museum. | stem | NIEUW |
| Anita | Ik print dit. Dit is een bewijs. | stem | NIEUW |
| Tammo | Waarvoor? | stem | NIEUW |
| Anita | Voor als iemand zegt dat wij de dieven zijn. | stem | NIEUW |

### M18.4 Wie draaide de camera's uit?: outro (outro; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Accountmanager | Wiebelwerk doet niets verkeerds. Wij maken alleen websites. | stem | NIEUW |
| Tammo | Een alibi. | stem | NIEUW |
| Anita | Een webbureau. | stem | NIEUW |
| Tammo | Dan is het niet Wiebelwerk. | stem | NIEUW |
| Anita | Dan is het Jelle, en iemand van binnen. | stem | NIEUW |

### M18.5 Wie draaide de camera's uit?: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Accountmanager | Nog een intake? De koffie is nog warm. | stem | NIEUW |

## M19 · 32 regels

### M19.1 Stoom: intro (intro; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | We staan op het perron in Veendam, bij de museumlijn. De machinist is omgekocht en eet al een uur een eierbal. | stem | NIEUW |
| Anita | De trein staat stil. In Jelles salonrijtuig zitten de laatste twee juryleden en de bewaarder al vier uur vast. | stem | NIEUW |
| Tammo | Wie rijdt hem dan? | stem | NIEUW |
| Anita | Jij. | stem | NIEUW |
| Tammo | Ik heb nog nooit een trein bestuurd. | stem | NIEUW |
| Anita | Je hebt een fiets bestuurd. | stem | NIEUW |
| Tammo | Vergelijkbaar. | stem | NIEUW |
| Anita | Dan rijd jij hem, ik haal de juryleden. | stem | NIEUW |
| Durk | Douwe. Er rijdt een nieuwe machinist. | stem | NIEUW |
| Douwe | …machinist. | stem | NIEUW |

### M19.2 Stoom: onderweg (key; 10 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Dit is de rem. | stem | NIEUW |
| Anita | Rem nog niet. Eerst gas. | telefoon | NIEUW |
| Tammo | Dit is gas. | stem | NIEUW |
| Anita | Dat is de fluit. | telefoon | NIEUW |
| Tammo | Die ook. | stem | NIEUW |
| Anita | Meneer, wilt u nog een eierbal? | stem | NIEUW |
| Jurylid | Heerlijk. Wie is die mevrouw? | stem | NIEUW |
| Anita | Breek hem open, meneer. Er zit een briefje in: "Jelle koopt u." | stem | NIEUW |
| Jurylid | Dat is toch niet waar. | stem | NIEUW |
| Anita | Het perron komt eraan. Stap maar uit. | stem | NIEUW |

### M19.3 Stoom: outro (outro; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jurylid | Ik stap hier uit. Ik laat me niet kopen met een eierbal. | stem | NIEUW |
| Jurylid | Ik niet. Ik heb een contract. Levenslang eierballen en elke kermis een kaartje. | stem | NIEUW |
| Mevrouw Hoving | Ik stap niet uit. Ik blijf in de trein tot na het Ontzet, dat stond op de uitnodiging. Dan zit het oudste jurylid voor: Berend Bos, sinds 1982. | stem | NIEUW |
| Anita | Eén jurylid gered. Eén is van hem. En de bewaarder blijft in de trein. | stem | NIEUW |
| Tammo | Vier van de vijf staan niet meer bij hem, Berend meegerekend. | stem | NIEUW |
| Anita | Dat is een meerderheid, als we ze tot het Ontzet vasthouden. | stem | NIEUW |
| Anita | Maar op het Ontzet gaat Jelle om drie uur naar de notaris. Schrijft hij zich in als nieuwe bewaarder, dan tekent hij zelf de uitslag. Daarom zit mevrouw Hoving in de trein: zo kan zij hem niet tegenhouden. | stem | NIEUW |
| Tammo | Ik heb een trein bestuurd. | stem | NIEUW |
| Anita | Je hebt hem in een station gezet. Dat is meer dan de machinist. | stem | NIEUW |
| Berend Bos | Goidag. Die man in dat blauwe colbert wilde mijn bakkie kopen, contant, uit een klomp. Dat vergeef ik hem niet. | telefoon | NIEUW |
| Berend Bos | Dinsdag komt hij naar het Beleg van Bourtange, met zijn mannen. Ik heb een bus nodig. Kom naar Ter Apel. | telefoon | NIEUW |

### M19.4 Stoom: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Durk | Douwe. De trein staat weer stil. Net fertelle, hè? | stem | NIEUW |

## T4 · 27 regels

### T4.1 De bus naar Bourtange: instappen (intro; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Goidag. Ik heb veertig man, vijftien kanonnen van karton, en een bus die niet start. Het gips is eraf. Het stuur ook bijna. | stem | NIEUW |
| Anita | Wij rijden. Ter Apel-bos naar de vesting, en de Escapade komt achter ons aan. | stem | NIEUW |
| Berend Bos | Op tijd. Het Beleg begint om negen uur. Ik ben de bisschop. | stem | NIEUW |
| Tammo | Je valt de vesting aan. | stem | NIEUW |
| Berend Bos | Elk jaar. En elk jaar verlies ik. Wat mout, dat mout. | stem | NIEUW |
| Anita | Waarom oefenen jullie in Bourtange? | stem | NIEUW |
| Berend Bos | Omdat Grunn te klein is voor een echt beleg. | stem | NIEUW |
| Berend Bos | Kom mor. Rijden. | stem | NIEUW |
| Tinus | Ik ben Tinus. Ik beleg mee. Mijn trekker staat thuis, in het Westerkwartier. | stem | NIEUW |
| Tammo | Welkom in de bus, Tinus. | stem | NIEUW |

### T4.2 De bus naar Bourtange: onderweg (travel; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Je kijkt vaker naar die telefoon dan naar de weg. Hij komt wel. | stem | NIEUW |
| Anita | Wie? | stem | NIEUW |
| Berend Bos | Wie het ook is. | stem | NIEUW |
| Tammo | Er zijn genoeg stoelen. | stem | NIEUW |
| Anita | Dat zie ik. | stem | NIEUW |
| Tammo | Ik zit hier. | stem | NIEUW |
| Anita | Dat zie ik ook. | stem | NIEUW |
| Jelle Terpstra | Gezellige bus, allemaal. Ik rij even langs. | telefoon | NIEUW |
| Tammo | Dat was Jelle. | stem | NIEUW |
| Anita | Dat was slecht. | stem | NIEUW |
| Berend Bos | Ik heb niks gezien. Ik ben belegeraar, geen getuige. | stem | NIEUW |

### T4.3 De bus naar Bourtange: aankomst (outro; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | De Escapade staat op de parkeerplaats bij de poort. Henk reed hem erheen, en zijn zender zit er nog in. | stem | NIEUW |
| Berend Bos | Op tijd. Dat is één minuut te vroeg. | stem | NIEUW |
| Tammo | Jij telde ze? | stem | NIEUW |
| Berend Bos | Ik tel alles. | stem | NIEUW |
| Berend Bos | Mijn bakkie staat al bij de poort. Eerst Oma en Gerda, toen de bus. | stem | NIEUW |

### T4.4 De bus naar Bourtange: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Weer veertig man? Kom mor. | stem | NIEUW |

## M20 · 55 regels

### M20.1 Het beleg van Bourtange: de wallen (intro; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Het Beleg van Bourtange. Elk jaar omsingel ik een vesting, en elk jaar houdt ze stand. | stem | NIEUW |
| Tammo | Wie valt aan? | stem | NIEUW |
| Berend Bos | Ik, met veertig man en een paard van karton. | stem | NIEUW |
| Anita | En Jelle? | stem | NIEUW |
| Berend Bos | Jelle is geen bisschop. Hij komt met zijn limo. | stem | NIEUW |
| Anita | Dan komt de bal ook hierheen, want Jelle draagt hem altijd bij zich. Dit is onze kans, Tammo. | stem | NIEUW |
| Durk | Tammo. Wij dagen je uit. Fierljep. | stem | NIEUW |
| Douwe | …fierljep. | stem | NIEUW |
| Tammo | Een ding voor Friezen. | stem | NIEUW |
| Durk | Net fertelle, hè? | stem | BEHOUDEN |
| Berend Bos | Fierljepen, met een stok over een sloot? Grijpskerk heeft er een vereniging voor, jong. Dat is ook Grunn. | stem | NIEUW |

### M20.2 Het beleg van Bourtange: de gracht (key; 9 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Durk | Wij zijn alleen de bezigheid. | stem | BEHOUDEN |
| Tammo | Wat is de bezigheid? | stem | NIEUW |
| Durk | Baas heeft een afspraak met mem in de kruitkelder. Wij houden jullie een uur bezig. | stem | NIEUW |
| Durk | Douwe. Dat was ook geheim. | stem | NIEUW |
| Tammo | Houd even vast. De sleutel zit erin. | stem | NIEUW |
| Douwe | …vast. | stem | NIEUW |
| Tammo | Ik spring. Als ik val, was het de wind. | stem | NIEUW |
| Douwe | …Plons. | stem | NIEUW |
| Douwe | …Geen plons. | stem | NIEUW |

### M20.3 Het beleg van Bourtange: de kruitkelder (key; 13 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Mem. Hier is hij. Voor u. Ik heb hem genomen zoals het hoort: netjes, met een bedankje. | stem | NIEUW |
| Mem Terpstra | Doe open, jonge. | stem | NIEUW |
| Mem Terpstra | Dank je. Nu is hij van mij. | stem | NIEUW |
| Jelle Terpstra | Mem. De afspraak was: u houdt hem vast tot ik win. Dit is een overtreding van onze overeenkomst. | stem | NIEUW |
| Mem Terpstra | Er is geen overeenkomst, jonge. Er is een moeder. | stem | NIEUW |
| Oma Trijntje | Gerda belde mij. Ze zei: mijn jongen heeft de bal. Ik zei: dan nemen we de bal van hem af. Berend reed. | stem | NIEUW |
| Berend Bos | Nul krassen. Op de heenweg. | stem | NIEUW |
| Tammo | Jij kende Mem. | stem | NIEUW |
| Anita | "Tige tank! – J." Dat is Jelles J. Hij schrijft overal een bedankje bij. | stem | NIEUW |
| Mem Terpstra | Dat heb ik hem geleerd. Alles wat goed is in mijn jongen komt van mij. Dit ook. | stem | NIEUW |
| Anita | Waarom doet u dit, mevrouw Terpstra? | stem | NIEUW |
| Jelle Terpstra | Mem. Dit is nog niet voorbij. Mijn juristen noemen het een geschil. | stem | NIEUW |
| Jelle Terpstra | Durk. Douwe. Haal mijn mannen. | stem | NIEUW |

### M20.4 Het beleg van Bourtange: de bal houden (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Oma Trijntje | De bal blijft bij ons. Tammo, de deur. | stem | NIEUW |
| Tammo | Ik houd hem. | stem | NIEUW |
| Anita | Links is vrij. Naar de poort. | stem | NIEUW |
| Berend Bos | Het bakkie staat bij de poort. | stem | NIEUW |
| Mem Terpstra | Rustig, jonge mensen. Het is maar een bal. | stem | NIEUW |
| Oma Trijntje | Dat zeg jij nu. | stem | NIEUW |

### M20.5 Het beleg van Bourtange: de klomp (outro; 14 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Wie heb je verteld waar we waren? | stem | NIEUW |
| Anita | Ik wist niet waar de bal lag. Ik wist wel dat Mem iets voor Jelle verborgen hield. Dat had ik tegen jou moeten zeggen. | stem | NIEUW |
| Anita | En ik kan niet raden wat je verwacht, als je niets zegt. | stem | NIEUW |
| Tammo | Je zegt nooit iets. | stem | NIEUW |
| Anita | Jij zegt nooit iets! | stem | NIEUW |
| Berend Bos | Twee keer "nooit" in tien seconden. Ik tel mee. | stem | NIEUW |
| Anita | Nee, dat klopt niet. Jij vraagt nooit wat. Je wordt stil, en dan boos op mij. | stem | NIEUW |
| Oma Trijntje | Wij waren jullie voor. | stem | NIEUW |
| Mem Terpstra | Ik gebruikte jullie om Jelle te stoppen. Dat was verkeerd. | stem | NIEUW |
| Berend Bos | Ik rijd jullie. Na de Snackprijs ga ik naar de politie, over dat museum. | stem | NIEUW |
| Anita | Henks zender piept: onze auto staat al op een trein. Zonder auto geen Fjord Frituur. | stem | NIEUW |
| Mem Terpstra | Neem de bal mee, famke. Bij jou is hij veiliger dan bij ons. | stem | NIEUW |
| Oma Trijntje | Eén zin, jong. | stem | NIEUW |
| Tammo | Ik heb er geen. | stem | NIEUW |

### M20.6 Het beleg van Bourtange: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Het Beleg verliest nooit van mij. Ik verlies er elk jaar van. Wat mout, dat mout. | stem | NIEUW |

### R4.1 Nachtstreek, dinsdagnacht (radio; 1 zonder stem, 2 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Storingsbericht: de Krolbrug en nog achttien bruggen in storing. Niemand merkt verschil. | radio | NIEUW |

## M21 · 48 regels

### M21.1 Iedereen heeft een rode auto gezien: Tessa, de rit (intro; 7 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Moi. | stem | BEHOUDEN |
| Berend Bos | Ik rij. Jij zoekt het piepje. | stem | NIEUW |
| Anita | Het piepje van Henks zender staat bij Zuidhorn. Sneller. | stem | NIEUW |
| Berend Bos | Ik rij nooit sneller dan negentig. | stem | NIEUW |
| Anita | Dan rij je nu honderd. | stem | NIEUW |
| Berend Bos | Je hebt negen keer op je telefoon gekeken sinds Ter Apel. Er is geen bericht. Ik heb meegeteld. | stem | NIEUW |
| Anita | …Dat is een bijzondere troost, Berend. | stem | NIEUW |

### M21.2 Iedereen heeft een rode auto gezien: Tessa, de jacht (key; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Ik wacht bij de overweg. | stem | NIEUW |
| Jelle Terpstra | Mevrouw. U kunt de auto redden of de bal houden. Beide tegelijk is juridisch niet mogelijk. | telefoon | NIEUW |
| Anita | Auto. | stem | NIEUW |

### M21.3 Iedereen heeft een rode auto gezien: Tessa, de overweg (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | "Tige tank foar de bal. – J." | stem | NIEUW |
| Berend Bos | Nul krassen op de auto. Eén bal kwijt. | stem | NIEUW |
| Anita | Dat tel je niet. | stem | NIEUW |
| Berend Bos | Ik tel alles. | stem | NIEUW |
| Anita | Zonder wagen kunnen we niet bakken. Dan wint Jelle zonder wedstrijd. | stem | NIEUW |
| Anita | Henks tweede sleutel zat onder de bumper. Tammo's sleutel zit in zijn jas, en Douwe heeft die jas. | stem | NIEUW |
| Henk | Tinus' schuur is hier vlakbij. Ik heb morgen iets voor jullie. Eén koekje. | telefoon | NIEUW |

### M21.6 Iedereen heeft een rode auto gezien: Tessa, de overweg, de bal vastgehouden (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | "Tige tank foar de bal. – J." | stem | NIEUW |
| Berend Bos | Eén kras op de auto. Eén bal kwijt. Ik tel allebei. | stem | NIEUW |
| Anita | Dat is mijn schuld. | stem | NIEUW |
| Berend Bos | Dat is een kras. Henk heeft er verf voor, en een koekje. | stem | NIEUW |
| Anita | Zonder wagen kunnen we niet bakken. Dan wint Jelle zonder wedstrijd. | stem | NIEUW |
| Henk | Tinus' schuur is hier vlakbij. Ik heb morgen iets voor jullie. Eén koekje. | telefoon | NIEUW |

### M21.4 Iedereen heeft een rode auto gezien: Tammo, de vrienden (outro; 13 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Oma Trijntje | Houd mijn vrienden bij elkaar, jong. Zonder hen is er geen recept. | telefoon | NIEUW |
| Mem Terpstra | Jelles advocaten hebben ze gebeld. Zeg het goed. | telefoon | NIEUW |
| Tinus | Laat ze gaan, jong. Praten kun je niet. | stem | NIEUW |
| Geesje | Mijn kerkvoogdij is gebeld. De kerkkelder is verhuurd. Het spijt me, jong. | stem | NIEUW |
| Tammo | Wacht. | stem | NIEUW |
| Kapitein Klaas | Mijn rubberboot is in beslag genomen. Tot de sluis ging het. Nu ben ik voor eigen rekening. | stem | NIEUW |
| Tammo | Alsjeblieft. | stem | NIEUW |
| Lammert | Mijn kade is verhuurd voor een evenement. Ik mag er zelf niet meer komen. | stem | NIEUW |
| Wubbo | De brug draait op tijd. Maar vandaag draait hij voor een evenement. | stem | NIEUW |
| Tammo | Ik… zeg het niet goed. | stem | NIEUW |
| Roelfien | Mijn vliegvergunning is ingetrokken. Zeg het tegen Trijntje. | stem | NIEUW |
| Tinus | Mijn schuur is leeg, maar Henk komt met een luik. Voor jou en je ruzie. | stem | NIEUW |
| Tammo | Voor ons. | stem | NIEUW |

### R4.2 Nachtstreek akte 4 (de wereld, geen briefing) (radio; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Een luisteraar meldt dat er gisteravond veel Berenden naar Bourtange reden. Het was een goed Beleg. | radio | NIEUW |

### B4 Autogesprekken akte 4 (pool; Tammo zwijgt, Tessa praat te veel; de ongemakkelijke dagen) (banter; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Dat is Veendam. Bijna net zo groot als Grunn. | stem | NIEUW |
| Anita | Het is een negende van Grunn. | stem | NIEUW |
| Tammo | Ik ben hier nog nooit afgeslagen. | stem | NIEUW |
| Anita | Er is ook niks om af te slaan. | stem | NIEUW |
| Tammo | Dat bedoel ik. | stem | NIEUW |
| Anita | Ruik je dat? Dat is zetmeel. | stem | NIEUW |
| Tammo | Ik dacht dat het de buren waren. | stem | NIEUW |
| Anita | Je zegt niks over zaterdag. | stem | NIEUW |
| Tammo | Dat is ook een antwoord. | stem | NIEUW |
| Anita | Dat is een antwoord dat ik niet kan gebruiken. | stem | NIEUW |
| Tammo | Een goed antwoord. | stem | NIEUW |

## M22 · 44 regels

### M22.1 Een luik erin: intro (intro; 7 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tinus | Welkom in mijn schuur. Henk belde. Jullie zoeken een luik. | stem | NIEUW |
| Henk | Ik heb een luik, een uitlaat en een koekje. Eén. | stem | NIEUW |
| Anita | Wij maken van de Escapade de Fjord Frituur. Daar hoort een luik bij. | stem | NIEUW |
| Tammo | De Escapade is van mij. | stem | NIEUW |
| Anita | Hij is van ons, Tammo. | stem | NIEUW |
| Henk | Jullie praten niet. Dat is slecht voor de lak. | stem | NIEUW |
| Henk | Elke deuk is een karaktertrek. Dit wordt een karakterwagen. | stem | NIEUW |

### M22.2 Een luik erin: de garage (key; 11 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Henk | Het luik zit aan de zijkant. Dan kun je serveren. | stem | NIEUW |
| Anita | Dat is een Fjord Frituur. | stem | NIEUW |
| Tammo | Een Escapade met een gat. | stem | NIEUW |
| Henk | Een karaktergat. | stem | NIEUW |
| Anita | Het is klaar. | stem | NIEUW |
| Tammo | Het bovenstuk is blauw. Dat was niet afgesproken. | stem | NIEUW |
| Anita | Het is de kleur van de naam. | stem | NIEUW |
| Henk | Het luik is betaald. Sjabbe vertelt wel hoe. | stem | NIEUW |
| Sjabbe | Tammo belde vannacht, via Henk. Hij verkocht het horloge van zijn opa, via Bert. Dat betaalt het luik. Ik heb niks gevraagd. | telefoon | NIEUW |
| Anita | Het horloge van je opa? | stem | NIEUW |
| Tammo | Het liep vijf minuten voor. Opa zei: dat zijn de goede minuten. | stem | NIEUW |

### M22.3 Een luik erin: de modder (key; 10 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tinus | De modder pakt eerst je auto. Je plannen komen daarna. | stem | NIEUW |
| Tinus | Met een luik is de zijkant zwakker, en een friteuse weegt vierhonderd kilo. Houdt de achteras het niet, dan breekt hij op de Grote Markt. Rij hem dus de modder in. | stem | NIEUW |
| Anita | En als hij vastzit? | stem | NIEUW |
| Tinus | Dan trekt mijn trekker hem eruit. Aan de trekhaak. Aan Tammo hebben we hier niks. | stem | NIEUW |
| Tammo | Ik zit vast. | stem | NIEUW |
| Tinus | Dan trek ik je los. Houd vast. | stem | NIEUW |
| Anita | Aan wat? | stem | NIEUW |
| Tinus | Aan je zelfvertrouwen. | stem | NIEUW |
| Tammo | Dat heb ik niet. | stem | NIEUW |
| Tinus | Dan aan de trekker. | stem | NIEUW |

### M22.4 Een luik erin: de schuur 's avonds, de knuffel (outro; 15 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | We hebben een wagen. We hebben geen bal. | stem | NIEUW |
| Tammo | Jij zweeg voor een ander. Ik zweeg voor niemand. Dat is erger. | stem | NIEUW |
| Tammo | Je ging alleen achter de trein aan. Ik zat op een hooibaal te mokken. | stem | NIEUW |
| Anita | Ik moet je iets vertellen. Ik heb op zeven plekken gewoond voor ik tien was. | stem | NIEUW |
| Tammo | Zeven? | stem | NIEUW |
| Anita | En elke zomer woonde ik in Ljouwert, naast Mem. Zij leerde me suikerbrood roosteren. | stem | NIEUW |
| Tammo | Jij? Fries? | stem | NIEUW |
| Anita | Een beetje. | stem | NIEUW |
| Tammo | Dat verklaart waarom je moi zegt als je denkt dat ik niet luister. | stem | NIEUW |
| Anita | Dat deed ik één keer. | stem | NIEUW |
| Tammo | Twee keer. | stem | NIEUW |
| Anita | De Fjord Frituur is een thuis op wielen. Een thuis dat je kunt meenemen. | stem | NIEUW |
| Anita | Ik ging niet weg. | stem | NIEUW |
| Tammo | Je bleef nergens. | stem | NIEUW |
| Anita | Ik ben gebleven. | stem | NIEUW |

### M22.5 Een luik erin: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Henk | Het luik zit er al. Een deuk meer kan geen kwaad. | stem | NIEUW |

## M23 · 49 regels

### M23.1 De colonne: intro (intro; 9 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Mem Terpstra | Famke. Trijntje en ik hebben ze gebeld. Ze komen. | telefoon | NIEUW |
| Anita | Jelle huurt morgen de hele Markt. Vandaag staan wij er eerst. Wij voorop, de rest erachter, en niemand valt weg. | stem | NIEUW |
| Geesje | Ik rij op mijn scooter. Een bedevaart op twee wielen. Hij is sneller dan hij lijkt. | stem | NIEUW |
| Wubbo | Ik rij de bus. Een bus is een brug op wielen. Ik zet de zijstraten dicht. | stem | NIEUW |
| Tinus | Ik rij de trekker. Wat Jelle ook neerzet, ik trek het weg. | stem | NIEUW |
| Kapitein Klaas | Ik heb mijn rubberboot terug. De moeder van Jelle belde de deurwaarder. De boot ligt op een aanhanger en ik praat tegen hem. | stem | NIEUW |
| Berend Bos | Ik rij achteraan, met vijftien kanonnen en een doos vuurwerk voor het Ontzet. Dan zie ik alles. | stem | NIEUW |
| Anita | Eén van jullie rijdt vlak naast ons en houdt Jelle bezig. Wie dat is, kiezen wij zo. | stem | NIEUW |
| Anita | Rijden. Niet praten. | stem | NIEUW |

### M23.2 De colonne: onderweg (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Lammert | Ik zit achterin bij Wubbo in de bus. Dit is de mooiste optocht van de provincie. | telefoon | NIEUW |
| Roelfien | Ik vlieg boven jullie. Mijn vergunning is ingetrokken, maar ze kunnen me niet vinden. | telefoon | NIEUW |
| Jelle Terpstra | Mevrouw. Elke brug op uw route heeft vandaag een vergunning van mij voor een evenement. Veel plezier. | telefoon | NIEUW |
| Anita | Jelle probeert ons te splitsen. Blijf bij elkaar. | stem | NIEUW |
| Wubbo | Brug open. Ga maar. | telefoon | NIEUW |
| Tinus | Ik trek hem weg. | stem | NIEUW |

### B5 Autogesprek in de colonne (donderdag 27 augustus, onderweg van Zuidhorn naar Stad; samen, zonder het dieptepunt te herhalen) (banter; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Dat is Aduard. Hier houdt het Westerkwartier op. | stem | NIEUW |
| Tammo | Waar zie je dat aan? | stem | NIEUW |
| Anita | Meer fietsers, minder trekkers. Dat leer je als je vaak verhuist. | stem | NIEUW |
| Anita | Ik heb nooit zo lang ergens gewoond. | stem | NIEUW |
| Tammo | Ik heb nooit ergens anders gewoond. | stem | NIEUW |
| Anita | Dan is dit een goed begin. | stem | NIEUW |
| Tammo | Een tegeltje. | stem | NIEUW |
| Anita | Een goed tegeltje. | stem | NIEUW |

### M23.3 De colonne: Durk en Douwe lopen over (key; 7 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Durk | Douwe. Jelle is niet onze baas. | stem | NIEUW |
| Douwe | …niet onze baas. | stem | NIEUW |
| Durk | Wij zijn alleen de bezigheid. | stem | BEHOUDEN |
| Durk | En nu zijn wij de bezigheid van mem. | stem | NIEUW |
| Tammo | Van Jelles mem? | stem | NIEUW |
| Durk | Van alle mems. | stem | NIEUW |
| Durk | En hier is je jas. Met een strikje. | stem | NIEUW |

### M23.6 De colonne: de bus rijdt naast jullie (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Wubbo | Ik rijd naast jullie. Een bus is breed. Ik zet elke zijstraat dicht waar Jelle langs wil. | stem | NIEUW |
| Anita | En de bruggen? | stem | NIEUW |
| Wubbo | Die open ik op afstand, met mijn sleutel. Open of dicht, nooit allebei. | stem | NIEUW |
| Tammo | En Jelle? | stem | NIEUW |
| Wubbo | Die komt een minuut later. Zijn vergunningen hebben een loket. Mijn brug niet. | stem | NIEUW |

### M23.7 De colonne: de trekker rijdt naast jullie (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tinus | Ik rij naast jullie, met de trekker. Hier kijk je niet ver: houtwallen. Maar ik trek alles weg wat Jelle neerzet. | stem | NIEUW |
| Anita | Ook een limo? | stem | NIEUW |
| Tinus | Ook een limo. Aan de trekhaak, als het moet. | stem | NIEUW |
| Tammo | Dat zei hij in de modder ook. | stem | NIEUW |
| Anita | En toen zaten we niet meer vast. | stem | NIEUW |

### M23.8 De colonne: de scooter rijdt naast jullie (key; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geesje | Ik rij naast jullie, op mijn scooter. Dit is een bedevaart. Ik ken elk steegje van hier tot de Grote Markt. | stem | NIEUW |
| Anita | Een scooter tegen een limo? | stem | NIEUW |
| Geesje | Een limo past niet in een steegje, jong. | stem | NIEUW |

### M23.4 De colonne: outro (outro; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | We zijn er. Allemaal. | stem | NIEUW |
| Tammo | De grootste stoet die Grunn ooit zag. | stem | NIEUW |
| Anita | Dat gaat Rikus niet meer zeggen. Hij heeft alle woorden al gebruikt. | stem | NIEUW |
| Rikus | De colonne is aangekomen. Het is te groot om te beschrijven. | radio | NIEUW |
| Jelle Terpstra | Mevrouw. De colonne is een evenement zonder vergunning. Ik stuur een rekening. | telefoon | NIEUW |

### M23.5 De colonne: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | De colonne wacht niet. Rijden. Niet praten. | stem | NIEUW |

## M24 · 6 regels

### M24.1 Er hangt iets Fries aan d'Olle Grieze: intro (intro; 1 zonder stem, 8 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | De vlag hangt precies boven de plek waar de Fjord Frituur morgen moet staan. Hij moet eraf. | stem | NIEUW |

### M24.2 Er hangt iets Fries aan d'Olle Grieze: de vlag (key; 3 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Torenwachter | Touw één. Doorgepikt. | telefoon | NIEUW |
| Anita | Vier nog. | stem | NIEUW |
| Duivenmelker Bert | Hij luistert, jong. | stem | NIEUW |

### M24.3 Er hangt iets Fries aan d'Olle Grieze: outro (outro; 2 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tammo | Voor de grip? | stem | NIEUW |
| Anita | Nee. Gewoon. | stem | NIEUW |

## M25 · 22 regels

### M25.1 Het bod viel tegen: intro (intro; 7 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Morgen is het Ontzet. Vannacht bakken we een proefronde, met alle vijf de ingrediënten van Oma's recept. | stem | NIEUW |
| Oma Trijntje | Mosterd van Wubbo, eieren van Geesje, zout van Klaas, meel van Roelfien en vet van Lammert. Alles grof, zoals vroeger. | stem | NIEUW |
| Mem Terpstra | Ik zit hier ook, Trijntje. | stem | NIEUW |
| Oma Trijntje | Dat weet ik, Gerda. | stem | NIEUW |
| Sjabbe | De notaris zit in de Oude Boteringestraat. Morgen om drie uur laat Jelle zich daar inschrijven als nieuwe bewaarder, met de bal. Dan tekent hij zelf de uitslag. Een notaris is ook maar een loket, met een stempel. | telefoon | NIEUW |
| Anita | Dan houden wij Jelle tegen. | stem | NIEUW |
| Sjabbe | Ik zeg alleen: breder dan een straat, dat is een frietwagen. | telefoon | NIEUW |

### M25.2 Het bod viel tegen: het bakken (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Oma Trijntje | Eerst het ei. Dan het zout. Dan het meel. | stem | NIEUW |
| Tammo | Zo? | stem | NIEUW |
| Oma Trijntje | Met liefde, jong. Anders wordt het een bal. | stem | NIEUW |
| Tammo | Het is een bal. | stem | NIEUW |
| Oma Trijntje | Een eierbal. Dat is anders. | stem | NIEUW |
| Mem Terpstra | Priuw, jonge. Dat is al beter dan de mijne. | stem | NIEUW |
| Oma Trijntje | Dat zei je in 1953 ook. | stem | NIEUW |

### M25.3 Het bod viel tegen: het bod (key; 3 zonder stem, 9 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jelle Terpstra | Goedenavond. | stem | NIEUW |
| Jelle Terpstra | Details. Geef me de wagen en het recept, en ik geef jullie genoeg voor tien frietwagens. | stem | NIEUW |
| Anita | Tammo verkocht het horloge van zijn opa voor één luik. Jij biedt tien frietwagens. | stem | NIEUW |

### M25.4 Het bod viel tegen: outro (outro; 4 zonder stem, 4 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Mem Terpstra | Ik zit hier, Trijntje. | stem | NIEUW |
| Oma Trijntje | Dan hoef ik niet te bellen. | stem | NIEUW |
| Jelle Terpstra | Mem. Kom je morgen bij mijn kraam staan? Het is mijn naam. | stem | NIEUW |
| Mem Terpstra | Ik kom, jonge. | stem | NIEUW |

### R5.2 Overgang naar de finale: Nachtstreek (radio; 1 zonder stem, 3 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | De peiling staat al twee weken open: zeggen die twee Stadjers ooit wat ze voelen? Drie procent zegt ja. | radio | NIEUW |

## M26 · 80 regels

### M26.1 Ontzet, net als in 1672: de uitzending (intro; 2 zonder stem, 6 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Kind in het publiek | Nee! | stem | BEHOUDEN |
| Anita | Vandaag winnen we eerlijk. Tot drie uur, dan zien we wel. | stem | NIEUW |

### M26.2 Ontzet, net als in 1672: de regels (key; 7 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Voor iedereen. De beste eierbal wint de standplaats. De Gouden Eierbal zelf gaat terug naar het museum. Dat zijn twee aparte dingen. | stem | NIEUW |
| Anita | Berend, dit is het logboek van Wiebelwerk. Twaalf augustus. Jelle nam de bal vijf dagen vóór ons. | stem | NIEUW |
| Berend Bos | Dat is een bewijs. Ik bewaar het. | stem | NIEUW |
| Berend Bos | Regel een: wie partij is, zit niet voor. Dat is Jelle. | stem | NIEUW |
| Berend Bos | Regel twee: mevrouw Hoving zit nog in de trein, met volpension. Dan zit het oudste jurylid voor. Dat ben ik. Ik heb nog nooit iets gewonnen en nu moet ik oordelen. | stem | NIEUW |
| Berend Bos | Regel drie: vijf juryleden, de meerderheid beslist. Mijn mening is niet het hele oordeel. | stem | NIEUW |
| Jelle Terpstra | Een notaris gaat boven een bisschop. Om drie uur schrijf ik mij in als de nieuwe bewaarder. Dan teken ik de uitslag zelf. | stem | NIEUW |

### M26.3 Ontzet, net als in 1672: bakken en de kraam heel (key; 8 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Oma Trijntje | Eerst het ei. Dan het zout. Dan het meel. De mosterd zit al in het deeg. Niet zeuren, jong. | telefoon | NIEUW |
| Tammo | Grof meel. Dat knispert. | stem | NIEUW |
| Anita | Dat is onze korrel. Zijn bal is glad. De onze niet. | stem | NIEUW |
| Durk | Douwe. De kraam. | stem | NIEUW |
| Douwe | …de kraam. | stem | NIEUW |
| Durk | Wij houden hem heel. Baas zegt… nee. Mem zegt. | stem | NIEUW |
| Anita | Dank je, Durk. Dank je, Douwe. | stem | NIEUW |
| Durk | Net fertelle, hè? | stem | BEHOUDEN |

### M26.4 Ontzet, net als in 1672: de blokkade (key; 14 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Torenwachter | Tammo. De limo gaat de Oude Boteringestraat in. Het is kwart voor drie. | telefoon | NIEUW |
| Tammo | De ballen staan bij de jury. De kraam mag weg. | stem | NIEUW |
| Anita | De Fjord Frituur is breder dan de straat. Daar ga ik staan. | stem | NIEUW |
| Tammo | Bert. Mijn duiven. | stem | NIEUW |
| Duivenmelker Bert | Ze staan klaar, jong. | stem | NIEUW |
| Tammo | Ik fluit. | stem | NIEUW |
| Anita | Hij fluit. | stem | NIEUW |
| Durk | Douwe. Niet aanraken. | stem | NIEUW |
| Anita | Rook! Links! De Fjord blijft staan. | stem | NIEUW |
| Jelle Terpstra | Mevrouw. U staat op de openbare weg. Dat is een overtreding. Het is drie minuten voor drie. Ik moet… | stem | NIEUW |
| Douwe | …Plons. | stem | NIEUW |
| Anita | Hij houdt de koffer weer boven water. | stem | NIEUW |
| Tammo | Hij is consistent. | stem | NIEUW |
| Torenwachter | Tammo. De klok staat op drie uur. De limo staat vast. Ik meld niet alleen. Ik klap. | telefoon | NIEUW |

### M26.14 Ontzet, net als in 1672: de straten dicht, de bus (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Wubbo | Poelestraat dicht. Bus dwars. De deuren heb ik open gelaten, voor de sfeer. | telefoon | NIEUW |
| Anita | Dank je, Wubbo. | stem | NIEUW |
| Wubbo | Open of dicht, Tessa. Vandaag allebei. | telefoon | NIEUW |
| Anita | Dat mag niet. | stem | NIEUW |
| Tammo | Zijn bus, zijn regels. | stem | NIEUW |

### M26.15 Ontzet, net als in 1672: de straten dicht, de trekker (key; 4 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Tinus | Gelkingestraat dicht. Trekker dwars. Wie er langs wil, moet eerst met mij praten. | telefoon | NIEUW |
| Anita | Je trekker past er net in. | stem | NIEUW |
| Tinus | Ik trek hem weg. De limo, niet de trekker. | telefoon | NIEUW |
| Tammo | In de stad ziet hij er nog groter uit. | stem | NIEUW |

### M26.16 Ontzet, net als in 1672: de straten dicht, de scooter (key; 4 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Geesje | De steeg bij de notaris is dicht. Scooter dwars. Ik zit erop te breien. | telefoon | NIEUW |
| Anita | Je zit te breien? | stem | NIEUW |
| Geesje | Wie blijft staan, mag breien. | telefoon | NIEUW |
| Tammo | Klopt. | stem | NIEUW |

### M26.5 Ontzet, net als in 1672: Mem (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Mem Terpstra | Jelle. Geef hem aan mij. | stem | NIEUW |
| Jelle Terpstra | Mem. De notaris sluit… | stem | NIEUW |
| Mem Terpstra | Dat is zijn probleem. Jij bent mijn probleem. | stem | NIEUW |
| Jelle Terpstra | …Ja, mem. | stem | NIEUW |
| Anita | Het is drie uur geweest. De notaris is dicht. Jelle tekent niets. | stem | NIEUW |

### M26.6 Ontzet, net als in 1672: de jury (key; 3 zonder stem, 3 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Mem Terpstra | Ik heb vandaag in zijn kraam gestaan. Nu wil ik dat er eerlijk wordt geproefd. | stem | NIEUW |
| Berend Bos | Eén verschil, dan stemmen we. De Friese bal is glad, van fijn meel. De Groninger heeft een korrel van grof meel. Die korrel proef je. Dat is een eierbal die ergens vandaan komt. | stem | NIEUW |
| Berend Bos | Stemmen. Jurylid één. | stem | NIEUW |

### M26.10 Ontzet, net als in 1672: de stemming, vijf van de vijf (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Berend Bos | Fjord Frituur. Vijf van de vijf. Mijn stem was niet eens nodig. | stem | NIEUW |
| Jelle Terpstra | Vijf van de vijf. Mijn juristen willen weten wie dit organiseerde. | stem | NIEUW |

### M26.11 Ontzet, net als in 1672: de stemming, vier van de vijf (key; 5 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Us Mem Snacks. Ik heb een contract. | stem | NIEUW |
| Berend Bos | Fjord Frituur. Vier van de vijf. Ik was de laatste. | stem | NIEUW |

### M26.12 Ontzet, net als in 1672: de stemming, drie van de vijf (key; 6 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Us Mem Snacks. Ik heb een contract. | stem | NIEUW |
| Jurylid | Fjord Frituur. | stem | NIEUW |
| Jurylid | Us Mem Snacks. De korrel is te grof. | stem | NIEUW |
| Berend Bos | Fjord Frituur. Drie van de vijf. Het is krap. | stem | NIEUW |
| Jelle Terpstra | Drie tegen twee. Mijn juristen willen een nieuwe stemming. | stem | NIEUW |

### M26.13 Ontzet, net als in 1672: de uitslag (key; 7 zonder stem, 8 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Mem Terpstra | Zie je? Ik had het niet nodig. Maar het is fijn. | stem | NIEUW |
| Berend Bos | De standplaats op de Vismarkt gaat naar de Fjord Frituur. | stem | NIEUW |
| Mem Terpstra | De bal gaat terug naar het museum. Dat is zijn plek. | stem | NIEUW |
| Berend Bos | En na afloop ga ik naar de politie, over twaalf augustus. Ik was belegeraar, geen getuige. Nu wel. | stem | NIEUW |
| Jelle Terpstra | De standplaatsen houd ik. Dat is juridisch dichtgetimmerd. De molen ook. De rest geef ik terug. | stem | NIEUW |
| Mem Terpstra | Dat is mijn zoon. | stem | NIEUW |
| Jelle Terpstra | Ja, mem. | stem | NIEUW |

### M26.7 Ontzet, net als in 1672: de vijf woorden (key; 1 zonder stem, 11 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Dat bedoelde ik ook. | stem | NIEUW |

### M26.8 Ontzet, net als in 1672: Jelle 's avonds (outro; 2 zonder stem, 1 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Anita | Wij komen. Met de frituur. | telefoon | NIEUW |
| Jelle Terpstra | Dan stuur ik een rekening. Voor het parkeren. | telefoon | NIEUW |

### M26.9 Ontzet, net als in 1672: herhaling (replay; 1 zonder stem, 0 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Berend Bos | Elk jaar hetzelfde Ontzet. Ik verlies graag. | stem | NIEUW |

## E · 11 regels

### E1 Epiloog (epilogue; 3 zonder stem, 2 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Het ruikt naar suiker. Dat komt uit Hoogkerk. De zomer is nog lang niet op. | radio | NIEUW |
| Anita | Het is tweeëntwintig graden. | stem | NIEUW |
| Tammo | Nee. Van de volgende ook niet. Alvast. | stem | NIEUW |

### E2 Slot (epilogue; 8 zonder stem, 7 met)

| Stem | Regel | Kanaal | Toon |
|---|---|---|---|
| Rikus | Jelle gaf bijna alles terug, helemaal vrijwillig. De standplaatsen en de molen hield hij. Hij zei dat hij het gezellig vond. | radio | NIEUW |
| Rikus | Oldenhuis Bakt sluit alle eenenveertig snackbars. De eigenaar blijkt Jelle te zijn. Nu weet ik wie dat at: niemand. | radio | NIEUW |
| Rikus | Mevrouw Hoving stapt na bijna vier weken volpension in Wildervank uit de trein. | radio | NIEUW |
| Rikus | De Krolbrug staat nu open. Niemand weet waarom. Dat is verdacht. | radio | NIEUW |
| Rikus | De politie sloot de zaak van de twee Stadjers in het zwart. Op de camerabeelden is vooral bewaker twee te zien, met een koekje. | radio | NIEUW |
| Rikus | Sjabbe bracht een horloge terug naar de Vismarkt. Hij vroeg niets. | radio | NIEUW |
| Rikus | Durk en Douwe werken nu voor Jelles moeder. Ze sturen een kaartje. | radio | NIEUW |
| Rikus | Het jurylid met het contract eet nog steeds gratis eierballen. In Ljouwert. | radio | NIEUW |

## Inclusieve taal: bij een nieuwe opname

Deze lijst komt uit `scripts/voice_stil.json`. Stille regels hebben bewust geen opname meer (ondertitel of tekstballon); bij de andere klinkt de oude opname nog en vervangt de nieuwe tekst hem bij de volgende opname.

| Stem | Nu | Wordt | Waar | Reden |
|---|---|---|---|---|
| (stil) | Politie? Een gek slaat hier mensen in elkaar! | Politie? Iemand slaat hier mensen in elkaar! | game/js/pedestrians.js | 'een gek' voor een gewelddadig mens maakt een psychische aandoening tot scheldwoord; de oude opname is niet meer in gebruik |
| Rikus | Voor wie wakker ligt van de huur: ik ook, jongens. | Voor wie wakker ligt van de huur: ik ook, luisteraars. | game/js/intromontage.js, script.json (akte 1) | de radio spreekt een gemengde groep luisteraars aan |
| Anita | En ik kom voor hem. Opzij, jongens. | En ik kom voor hem. Opzij, allemaal. | game/js/missions.js | jongens als aanspreekvorm van een gemengde groep |
| Tammo | Kom op, jongens. Eén keer luisteren. | Kom op, allemaal. Eén keer luisteren. | game/js/missions.js | idem |
| Tammo | Moi, jongens. Lekker gebotst? | Moi, allemaal. Lekker gebotst? | script.json (akte 3) | idem |
| Kapitein Klaas | Jongens. Ik heb net twee reuzen uit de haven gevist. | Mensen. Ik heb net twee reuzen uit de haven gevist. | game/js/missionstory.js, script.json (akte 2) | idem |
| Jelle Terpstra | Jim fytse mar, jonges. | Jim fytse mar, allegear. | game/js/missions.js, subtitles.js | idem; de Nederlandse ondertitel wordt 'Fietsen jullie maar, allemaal.' |
| Tammo (gids) | Dat was het rondje, dames en heren. / Dames en heren, aan uw rechterhand: Schipper Wiebe. | Dat was het rondje, beste mensen. / Beste mensen, aan uw rechterhand: Schipper Wiebe. | game/js/rondvaartlines.js | dames en heren sluit anderen uit; de gids blijft formeel |
| Schipper Wiebe (megafoon) | Dames en heren, u zit op een gestolen boot! / Hou je vast, dames en heren! | Beste mensen, u zit op een gestolen boot! / Hou je vast, beste mensen! | game/js/rondvaartchase.js | idem |
| Tammo | Zodat iedereen kan zien dat hij niet in de bus zit. | Zodat iedereen kan zien dat die niet in de bus zit. | game/js/banterlines.js | geen 'hij' voor een onbekende bestuurder |
| Rikus (nieuws, mission_up) | Mysterieuze klusjesman weer aan het werk in Groningen. | Mysterieuze klusser weer aan het werk in Groningen. | game/js/radio.js, sikkomfeed.js | mannelijk als standaard |
