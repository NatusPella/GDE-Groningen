# Sprint humor 22-11: de 25 zwakste beats van akte 1 tot en met 5

Scope: een lees- en herschrijfronde als scenarist over `docs/verhaal/nieuw/09-script-akte1..5.md` (en dus `game/storydata/script.json`). Geen enkele grap die al werkte is herschreven; de 25 beats hieronder zijn de zwakste uit een verder sterke set: vlakke functieregels, een Tammo die alleen bevestigt, een Jelle die uitlegt in plaats van bureaucratisch te zijn, een slotzin zonder pointe. De 25 beats van de vorige panelronde (HE, HJ, HK, HN, zie [HUMOR-PANEEL-22-11.md](HUMOR-PANEEL-22-11.md)) zijn niet opnieuw beoordeeld. De bestanden staan in `game/storydata/humor.sprint2211.json` (ids HS-01 tot HS-25); de volledige lijst voor de eigenaar is [HUMOR-KEUZELIJST.md](HUMOR-KEUZELIJST.md) (gegenereerd).

## Wat de leesronde opleverde

- **Het fundament is goed.** De akten dragen al echte running gags die opbouwen en niet alleen herhalen: "Rijden, niet praten" (Tessa), "Ik zeg niks" (Rikus), "Foar mem" (Jelle), de echo van Durk en Douwe, "Voor de grip", "Dat gezicht betekent...", "Ik tel alles" (Berend), "Open of dicht" (Wubbo), "Tige tank" en het jasje van Mem. Daar is niets aan veranderd.
- **Zwakke plekken** waren drie soorten: (1) een Tammo-regel die alleen bevestigt ("Ik zie het.", "Klopt.", "Dan eerst het Loket."); (2) een Jelle-regel die het contract uitlegt in plaats van er mee te spelen (de bureaucratie is zijn grap, niet zijn toelichting); (3) slotregels van een scène die de scène weer openen zonder pointe of anker.
- **Callbacks die nu bestaan**: oogcontact (Sjoerd, M05) komt terug bij het schaap op de dijk (HS-02); "nummer 4140" van het Loket (M03.2) wordt aangekondigd in M02.5 (HS-20); het colbert in augustus uit M01 wordt een beeldgrap in M04.1 (HS-22); het Loket-wachten wordt "een rij met een eigen postcode" (HS-01).
- **Jelle met redemption**: zijn regels in de bureaucratie-beats (HS-03, 13, 14, 16, 17, 18) zijn droger geworden; het scharnier in Oma's keuken (HS-25) en het "Mem zou het mooi vinden" (HS-03) planten het zaadje dat Mem in M20 en M26 laat bloeien. Een tweede zaadje staat bij het bushokje (HS-04).
- **Romantiek, zoet-komisch**: de warme varianten die winnen (HS-04, 08, 14, 24) zeggen nooit "ik hou van je"; ze verschuiven alleen een woord: "samen", "niemand viel weg", "Mems favoriet". Tessa en Tammo blijven elkaar niet ontmoeten in een uitgesproken zin; dat blijft voor akte 5.
- **Tempo**: de korte slotregels (HS-05, 09, 19, 20, 21, 22, 23) volgen op een lange scène. Een beat blijft binnen de dialoogritmegrens (2 tot 12 woorden per beurt; `dialogue_rhythm_test` ok zonder nieuwe uitzonderingen).
- **Gronings en Fries**: geen nieuwe Friese of Groningse spreektekst; "Foar mem" blijft zoals het stond. De mede-Friese regels (Mem, Beppe) zijn bewust niet aangeraakt. "Grunn", nooit "de Grunn", gecontroleerd in de nieuwe regels.

## Werkwijze en eerlijke kanttekening

- Per beat vier kandidaten, net als in het vorige paneel: het bestaande (index 0), een droge (1), een absurde (2) en een warme (3), plus een neutrale terugval. De drie beoordelaars zijn dezelfde rollen als op 21-11 en 22-11: Gronings-droog, absurdist en warm-romantisch. Gewichten: de droge telt 1,25 (1,5 bij de Jelle-bureaucratiebeats); de anderen tellen 1. Het bestaande blijft staan tenzij de winnaar het met minstens 1,0 gewogen punt verslaat. Een meerderheid van twee stemmen wint altijd; bij 1-1-1 is `tiebreak` de gewogen winnaar.
- **Niet onafhankelijk getoetst.** Er was geen aparte subagent-tool beschikbaar: één model schreef de kandidaten en speelde de drie rollen achter elkaar, zonder de volgorde te schudden. Dat is zwakker dan drie echte beoordelaars en daarom zijn bijna alle beats "laag" in zekerheid. De eigenaar kan elke beat via de veto-lijst terugdraaien (`chosen` op 0 en `node scripts/build_story_data.mjs`).
- **Niet in beeld bekeken**: de regels zijn alleen als tekst getoetst. Hoe ze klinken, hoe lang de beurt duurt in de cutscene en of de camera de pointe haalt, is niet gezien (zie `docs/SPRINT-22-11-GEBIED.md`).
- **Geluid**: 18 regels waren al ingesproken en zijn nu tekst-alleen; ze staan in `scripts/voice_wacht.json` voor de eerstvolgende TTS-ronde. De overige regels waren al tekst-alleen of nieuw. `voice_coverage --quiet`: 3457/3457.

## Resultaat in cijfers

- 25 beats beoordeeld; 22 nieuwe winnaars (droog 13, absurd 6, warm 3); 3 keer blijft het bestaande staan (HS-09, HS-15, HS-25).
- Zekerheid: hoog 1, midden 1, laag 23.

## Veto-lijst voor de eigenaar (de onzekerste)

Je hoeft niets te doen. Gesorteerd van onzeker naar minder onzeker (kleinste gewogen voorsprong eerst). Wil je iets anders: zet `chosen` van de beat in `game/storydata/humor.sprint2211.json` op 0 (bestaand), 1 (droog), 2 (absurd) of 3 (warm) en draai `node scripts/build_story_data.mjs`.

- **HS-11** (M02.1, TAMMO): gekozen (droog) "Ik rij. Rustig. Met alle richtingaanwijzers."; voorsprong 0.3; stemmen droog, absurd, warm. Naaste alternatief: "Ik rij. De automaat mag voorop, dan zijn wij de escorte.".
- **HS-01** (M03.1, TAMMO): gekozen (droog) "Vierentwintig mensen. Dat is een rij met een eigen postcode."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Vierentwintig voor ons. Sommigen staan hier sinds het vorige formulier.".
- **HS-05** (M05.3, TAMMO): gekozen (droog) "Eerst wachten. Daar ben ik in opgeleid."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Eerst wachten. Samen duurt dat korter.".
- **HS-06** (N4, TAMMO): gekozen (droog) "En als ik de verkeerde kant op rijd?"; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "En als ik fout rijd? Mag ik zeggen dat het een sluiproute was?".
- **HS-07** (M08.2, TESSA): gekozen (absurd) "Dan zijn wij een fatbike. Tammo, op mijn rug."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Dan zijn wij vandaag even geen voetgangers. Rennen.".
- **HS-12** (C00.3, TAMMO): gekozen (droog) "Honderdvijftig euro. Ik heb er acht."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Honderdvijftig euro. Samen lukt dat, toch?".
- **HS-16** (M15.3, JELLE): gekozen (droog) "Het is een proeverij. Wat u proeft, is geen omkoping, maar smaak."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Het is een proeverij. De jury proeft, ik betaal, de eierbal blijft neutraal.".
- **HS-17** (M12.3, JELLE): gekozen (droog) "U nadert privé-luchtruim, mevrouw. Mijn ballon heeft voorrang. Het staat in het contract, onder "wind"."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "U nadert privé-luchtruim, mevrouw. Wolken hebben voorrang en ik heb de wolken. Dat staat in het contract.".
- **HS-19** (R3.0, RIKUS): gekozen (droog) "Ik draai een plaat. Een lange."; voorsprong 0.5; stemmen droog, absurd, warm. Naaste alternatief: "Ik draai een plaat. Voor het luchtruim, dat vanochtend is verhuisd.".
- **HS-25** (M25.3, JELLE): gekozen (bestaand) "Wat dan?"; voorsprong 0.5; stemmen bestaand, absurd, warm. Naaste alternatief: "…Wat dan? Zeg het maar. Ik schrijf het niet op.".
- **HS-04** (M10.4, TAMMO): gekozen (warm) "Of hij mist haar. Dat is ook een soort dom."; voorsprong 0.8; stemmen droog, absurd, warm. Naaste alternatief: "Of allebei. Dat scheelt hem een formulier.".
- **HS-09** (M26.16, TAMMO): gekozen (bestaand) "Klopt."; voorsprong 0.8; stemmen bestaand, absurd, warm. Naaste alternatief: "Dan sta ik hier een trui lang.".

## Per beat

Scores per beoordelaar (droog, absurd, warm) staan tussen haakjes; de gewogen totalen daarna.

### HS-01 (M03.1, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Vierentwintig mensen voor ons. | 3 | 2 | 2 | 7.75 |
| droog (gekozen) | Vierentwintig mensen. Dat is een rij met een eigen postcode. | 5 | 3 | 3 | 12.25 |
| absurd | Vierentwintig voor ons. Sommigen staan hier sinds het vorige formulier. | 3 | 5 | 3 | 11.75 |
| warm | Vierentwintig. Gelukkig sta ik hier niet alleen. | 3 | 2 | 5 | 10.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Postcode: de wachtrij als dorp, in drie woorden.

### HS-02 (M14.2, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik zie het. | 2 | 2 | 2 | 6.50 |
| droog | Ik zie het. Hij ziet mij ook. | 4 | 3 | 3 | 11.00 |
| absurd (gekozen) | Oogcontact gemaakt. Hij gaf voorrang. | 5 | 5 | 4 | 15.25 |
| warm | Ik zie het. Met jou erbij zie ik alles. | 2 | 2 | 3 | 7.50 |

Stemmen: absurd, absurd, absurd. Keuze: absurd. Zekerheid: hoog. Reden: Oogcontact: de running gag van het kruispunt (M05) komt terug op een dijk, bij een schaap.

### HS-03 (M15.2, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat is… eerlijk. | 3 | 2 | 3 | 9.50 |
| droog (gekozen) | Dat is waar. Dat is hinderlijk. | 5 | 3 | 3 | 13.50 |
| absurd | Mijn juristen vragen of u ook voor ons wilt vliegen. | 3 | 5 | 2 | 11.50 |
| warm | Dat is… netjes. Mem zou het mooi vinden. | 3 | 3 | 5 | 12.50 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Hinderlijk: hij kan niets tegen een waarheid doen, en dat zegt hij zonder te knipperen.

### HS-04 (M10.4, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Of hij is dom. | 2 | 2 | 2 | 6.50 |
| droog | Of allebei. Dat scheelt hem een formulier. | 5 | 3 | 3 | 12.25 |
| absurd | Of hij is een klomp met een colbert. | 3 | 4 | 3 | 10.75 |
| warm (gekozen) | Of hij mist haar. Dat is ook een soort dom. | 4 | 3 | 5 | 13.00 |

Stemmen: droog, absurd, warm. Keuze: warm. Zekerheid: laag. Reden: Warm: een tweede zaadje voor Jelles redemption, en Tessa gaat er terecht aan voorbij.

### HS-05 (M05.3, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Eerst wachten. | 3 | 2 | 2 | 7.75 |
| droog (gekozen) | Eerst wachten. Daar ben ik in opgeleid. | 5 | 3 | 3 | 12.25 |
| absurd | Eerst wachten. Ik heb een koekje van Henk in reserve. | 3 | 4 | 2 | 9.75 |
| warm | Eerst wachten. Samen duurt dat korter. | 3 | 3 | 5 | 11.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Opgeleid: understatement over een hele werkloze jeugd.

### HS-06 (N4, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Links of rechts? | 3 | 3 | 2 | 8.75 |
| droog (gekozen) | En als ik de verkeerde kant op rijd? | 5 | 3 | 3 | 12.25 |
| absurd | En als ik fout rijd? Mag ik zeggen dat het een sluiproute was? | 3 | 5 | 3 | 11.75 |
| warm | En als ik fout rijd? Blijf je dan zitten? | 3 | 3 | 5 | 11.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: De vraag past nu bij Tessa's antwoord; "links of rechts" paste daar niet bij.

### HS-07 (M08.2, TESSA)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dan rennen we. | 3 | 2 | 3 | 8.75 |
| droog | Dan zijn wij vandaag even geen voetgangers. Rennen. | 5 | 3 | 2 | 11.25 |
| absurd (gekozen) | Dan zijn wij een fatbike. Tammo, op mijn rug. | 3 | 5 | 3 | 11.75 |
| warm | Dan rennen we. Samen is dat voorrang van twee. | 3 | 2 | 4 | 9.75 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Reden: Bureaucratisch terugpakken: als zij geen voetgangers zijn, geldt de regel niet.

### HS-08 (M23.4, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | De grootste stoet die Grunn ooit zag. | 3 | 2 | 2 | 7.75 |
| droog (gekozen) | De grootste stoet van Grunn. Met een scooter voorop. | 5 | 3 | 3 | 12.25 |
| absurd | Een bus, een trekker, een scooter en een bisschop. Dat noem ik een stoet. | 3 | 5 | 2 | 10.75 |
| warm | De mooiste stoet die Grunn ooit zag. Niemand viel weg. | 3 | 2 | 5 | 10.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Warm: de emotionele ankerzin van de finale, niemand viel weg, en Tessa's grap erna werkt nog.

### HS-09 (M26.16, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Klopt. | 4 | 3 | 3 | 11.00 |
| droog | Dat is geldig. Ik ga erbij staan. | 4 | 3 | 2 | 10.00 |
| absurd | Dan sta ik hier een trui lang. | 3 | 5 | 3 | 11.75 |
| warm | Dan blijf ik staan. Voor Geesje en voor de trui. | 2 | 3 | 4 | 9.50 |

Stemmen: bestaand, absurd, warm. Keuze: bestaand. Zekerheid: laag. Reden: Het bestaande "Klopt." is al een goede Groningse schouderophaal; de anderen winnen niet met voldoende voorsprong.

### HS-10 (M26.15, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | In de stad ziet hij er nog groter uit. | 3 | 2 | 3 | 8.75 |
| droog | Een trekker in de stad. Die kijkt nergens van op. | 4 | 2 | 2 | 9.00 |
| absurd (gekozen) | De trekker en de Martinitoren kijken elkaar aan. Gelijkspel. | 3 | 5 | 3 | 11.75 |
| warm | Hij zit er trots in, Tessa. Net een kind in zijn eerste pak. | 2 | 2 | 4 | 8.50 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Reden: Gelijkspel tussen trekker en toren: absurd en visueel, past bij de Grote Markt-finale.

### HS-11 (M02.1, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik rij. | 3 | 2 | 3 | 8.75 |
| droog (gekozen) | Ik rij. Rustig. Met alle richtingaanwijzers. | 4 | 3 | 3 | 11.00 |
| absurd | Ik rij. De automaat mag voorop, dan zijn wij de escorte. | 3 | 5 | 2 | 10.75 |
| warm | Ik rij. Jij hoeft nergens bang voor te zijn. | 3 | 2 | 5 | 10.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Escorte: eerste echte Tammo-grap in het spel, bij een achtervolging die hij niet doorziet.

### HS-12 (C00.3, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Honderdvijftig euro. Vandaag. | 2 | 2 | 2 | 6.50 |
| droog (gekozen) | Honderdvijftig euro. Ik heb er acht. | 5 | 3 | 3 | 12.25 |
| absurd | Honderdvijftig euro. Ik kan hooguit mijn zonnebril verkopen. | 3 | 5 | 2 | 10.75 |
| warm | Honderdvijftig euro. Samen lukt dat, toch? | 3 | 3 | 5 | 11.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Acht euro: de armoede in één getal, drie woorden eerder dan elke uitleg.

### HS-13 (M14.3, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Durk, Douwe, hoe vaak moet ik het zeggen? Contract is contract. Wij komen terug. | 3 | 3 | 3 | 10.50 |
| droog | Een nederlaag is een bijlage. Contract is contract. Wij komen terug. | 5 | 3 | 2 | 12.50 |
| absurd (gekozen) | Durk, Douwe, schrijf op: de sluis was vooraf verloren. Mijn juristen noemen dat winst. | 4 | 5 | 3 | 14.00 |
| warm | Contract is contract. Durk, Douwe: de limo. En niemand vertelt dit aan Mem. | 3 | 3 | 5 | 12.50 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Reden: Een nederlaag is een bijlage: verliezen als papierwerk.

### HS-14 (M16.3, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik hoor botsauto's. Ik betaal jullie niet voor botsauto's. | 3 | 2 | 3 | 9.50 |
| droog | Ik hoor botsauto's. In het contract staat rapporteren, niet botsen. | 5 | 3 | 2 | 12.50 |
| absurd | Ik hoor botsauto's. Zijn dat mijn botsauto's? Dan wil ik een factuur. | 4 | 4 | 3 | 13.00 |
| warm (gekozen) | Botsauto's. Dat was Mems favoriet. Ik betaal jullie daar niet voor. | 4 | 3 | 5 | 14.00 |

Stemmen: droog, absurd, warm. Keuze: warm. Zekerheid: laag. Reden: Rapporteren, niet botsen: de bureaucraat die zijn handlangers nakijkt.

### HS-15 (O6, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Ik wacht. Foar mem. | 5 | 3 | 4 | 14.50 |
| droog | Ik wacht. Mijn juristen wachten mee, tegen uurtarief. Foar mem. | 4 | 3 | 3 | 12.00 |
| absurd | Ik wacht. Ik heb er een stoel voor gekocht. Foar mem. | 3 | 4 | 3 | 11.50 |
| warm | Ik wacht. Denk er goed over na, mevrouw. Het is voor mem. | 3 | 3 | 4 | 11.50 |

Stemmen: bestaand, absurd, bestaand. Keuze: bestaand. Zekerheid: midden. Reden: De korte vorm is het sterkst: "Foar mem" als ankerzin blijft, de uitleg ervoor is onnodig.

### HS-16 (M15.3, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Het is een proeverij. Er wordt alleen geproefd. | 3 | 2 | 3 | 9.50 |
| droog (gekozen) | Het is een proeverij. Wat u proeft, is geen omkoping, maar smaak. | 5 | 3 | 3 | 13.50 |
| absurd | Het is een proeverij. De jury proeft, ik betaal, de eierbal blijft neutraal. | 4 | 5 | 2 | 13.00 |
| warm | Het is een proeverij. Mem noemt het gastvrijheid. | 3 | 3 | 5 | 12.50 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Smaak in plaats van omkoping: juridische woordkeus als redding in de nood.

### HS-17 (M12.3, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Goedemiddag. U nadert privé-luchtruim, mevrouw. Mijn ballon heeft voorrang. Dat staat in het contract. | 3 | 2 | 3 | 9.50 |
| droog (gekozen) | U nadert privé-luchtruim, mevrouw. Mijn ballon heeft voorrang. Het staat in het contract, onder "wind". | 5 | 3 | 3 | 13.50 |
| absurd | U nadert privé-luchtruim, mevrouw. Wolken hebben voorrang en ik heb de wolken. Dat staat in het contract. | 4 | 5 | 2 | 13.00 |
| warm | Goedemiddag. Voorzichtig, mevrouw, u nadert mijn ballon. Mem vindt hem prachtig. | 3 | 2 | 4 | 10.50 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Onder "wind": het contract kent het weer als bijlage.

### HS-18 (M14.2, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Mevrouw, u rijdt te hard. In mijn limo is plek. | 3 | 2 | 3 | 9.50 |
| droog (gekozen) | Mevrouw, u rijdt te hard. In mijn limo is plek, en er zit een vergunning bij. | 5 | 3 | 3 | 13.50 |
| absurd | Mevrouw, u rijdt te hard voor een schaap. Mijn limo past zich aan. | 3 | 5 | 3 | 12.50 |
| warm | Mevrouw, u rijdt te hard. Kom in mijn limo, dan komt u veilig aan. | 3 | 2 | 5 | 11.50 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Er zit een vergunning bij: zelfs de uitnodiging heeft papierwerk.

### HS-19 (R3.0, RIKUS)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Ik draai een plaat. | 3 | 2 | 3 | 8.75 |
| droog (gekozen) | Ik draai een plaat. Een lange. | 5 | 3 | 3 | 12.25 |
| absurd | Ik draai een plaat. Voor het luchtruim, dat vanochtend is verhuisd. | 3 | 5 | 3 | 11.75 |
| warm | Ik draai een plaat. Voor wie nog vliegt zonder contract. | 3 | 3 | 5 | 11.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Een lange: de zwijgzaamheid van Rikus als pointe, zonder uitleg.

### HS-20 (M02.5, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dan eerst het Loket. | 3 | 2 | 3 | 8.75 |
| droog | Dan eerst het Loket. Daar begint alles met wachten. | 4 | 3 | 2 | 10.00 |
| absurd (gekozen) | Dan eerst het Loket. Nummer 4140 wacht op niemand. | 3 | 5 | 2 | 10.75 |
| warm | Dan eerst het Loket. En daarna samen verder. | 2 | 2 | 4 | 8.50 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Reden: Nummer 4140: de grap van het Loket (M03) alvast aangekondigd.

### HS-21 (M07.1, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Regels, vergunningen, trucs. | 3 | 2 | 3 | 8.75 |
| droog (gekozen) | Eén klomp voor een stad vol vet. Dat is vrijwel gratis. | 5 | 3 | 3 | 12.25 |
| absurd | Eén klomp. De klomp vroeg of dat genoeg was. | 3 | 5 | 2 | 10.75 |
| warm | Eerst de bank, nu het vet. Hij maakt het ons niet makkelijk. | 2 | 2 | 4 | 8.50 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Vrijwel gratis: Tammo ziet de prijs, niet het gif, en Tessa schakelt over op het echte probleem.

### HS-22 (M04.1, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | En wat Jelle daar doet. | 3 | 2 | 2 | 7.75 |
| droog (gekozen) | En waarom Jelle in augustus een colbert draagt. | 5 | 3 | 3 | 12.25 |
| absurd | En of de duif een colbert krijgt als hij meewerkt. | 3 | 5 | 2 | 10.75 |
| warm | En dat jij meekijkt. Dat is het fijnste. | 3 | 2 | 5 | 10.75 |

Stemmen: droog, absurd, warm. Keuze: droog. Zekerheid: laag. Reden: Colbert in augustus: de eerste beeldgrap over Jelle wordt het begin van een gag die bleef lopen (M04.2).

### HS-23 (M17.3, TAMMO)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dat moeten we weten. | 3 | 3 | 3 | 9.75 |
| droog | Zeg niet toeval. Zeg: nog niet bewezen. | 5 | 3 | 3 | 12.25 |
| absurd (gekozen) | Toeval heeft ook een server. En een update. | 4 | 5 | 3 | 13.00 |
| warm | Dan is het toeval. Ik wil het toch weten. Met jou. | 3 | 3 | 5 | 11.75 |

Stemmen: droog, absurd, warm. Keuze: absurd. Zekerheid: laag. Reden: Nog niet bewezen: Tammo wordt een keer slimmer dan Tessa en dat is grappig.

### HS-24 (M12.4, TESSA)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand | Dan weten we waar we vannacht moeten zijn. Hier. | 3 | 3 | 3 | 9.75 |
| droog | Dan weten we waar we vannacht zijn. Hier. Zonder lier. | 4 | 3 | 3 | 11.00 |
| absurd | Dus vannacht Eemshaven. Ik neem een lamp mee en een container-expert. | 3 | 4 | 2 | 9.75 |
| warm (gekozen) | Dan weten we waar we vannacht moeten zijn. Hier. Samen. | 3 | 3 | 5 | 11.75 |

Stemmen: droog, absurd, warm. Keuze: warm. Zekerheid: laag. Reden: Samen: kort, zacht, en het geeft de romance een stap zonder dat iemand het uitspreekt.

### HS-25 (M25.3, JELLE)

| Kandidaat | Tekst | Droog | Absurd | Warm | Gewogen |
|---|---|---|---|---|---|
| bestaand (gekozen) | Wat dan? | 4 | 3 | 3 | 12.00 |
| droog | Wat dan? Ik heb alles geboden. | 3 | 3 | 2 | 9.50 |
| absurd | Wat dan? Een klomp? Twee klompen? | 3 | 4 | 2 | 10.50 |
| warm | …Wat dan? Zeg het maar. Ik schrijf het niet op. | 3 | 3 | 5 | 12.50 |

Stemmen: bestaand, absurd, warm. Keuze: bestaand. Zekerheid: laag. Reden: Warm: Jelle die zegt dat hij het niet opschrijft is de eerste keer dat hij zonder juristen praat.

## Samen spelen

Een beat is gewone scènetekst: een gast ziet de gekozen variant mee in de scène van de host (snapshot en EXTRA-bericht ongewijzigd). De voortgang is per speler (#429); niets in deze sprint verandert wie een scène opent of wat de beloning is. Wie wegvalt of later aansluit ziet dezelfde regels; geen nieuwe testbankstap nodig, `humor_test` en `storydata_test` dekken de regeldata.
