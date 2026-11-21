# Verhaalanalyse 21-11: kan iemand met nul context het verhaal volgen?

Status: analyse, plan en twee kleine, zekere fixes (zie hoofdstuk 18). Geen verhaaltekst herschreven, geen Electron gedraaid, niets gespeeld: alles hieronder komt uit het lezen van de data. Wat niemand in beeld heeft gezien, is **nog niet bekeken**.

Aanleiding (eigenaar, letterlijk): *"Het overkoepelende verhaal blijft soms alleen nog niet echt te volgen, het voelt soms niet natuurlijk aan. Er komen allemaal mensen in beeld, het is niet altijd duidelijk wie dat is, waarom we daarom zouden moeten geven of wat hun persoonlijkheid is. Soms komen mensen uit de lucht vallen. Gesprekken voelen totaal niet organisch of lopend aan. (...) De hints en clues mogen wel uit het escape menu, dat voegt echt helemaal niks toe. Het verhaal moet duidelijk worden doordat mensen dingen vertellen, of het nou Rikus is of Tammo of Tessa of wie dan ook. Het verhaal moet te volgen zijn voor iemand die nul context bij de game heeft."*

Bronnen: alle 207 scènes en 1.431 regels van `game/storydata/script.json` (de bron van wat de speler hoort en leest), de akte-data in `game/js/storyarc_nieuw.js` (`PARTS`, `STEPS`, `WHY`, `lead`), `docs/verhaal/nieuw/00-OVERZICHT.md`, `docs/verhaal/STIJLGIDS.md`, `.specs-fire/standards/verhaal.md`, `docs/personages.md`, de code van het telefoon-, banter-, beat- en terugkeersysteem, en het canonblad van de andere agent (`docs/VERHAALCANON-21-11.md` op branch `verhaalcanon-21-11`). Voor Bezit en voetbal: `docs/VOETBAL-CARRIERE-21-11.md` (branch `voetbal-carriere-plan-21-11`); `docs/BEZIT-21-11.md` stond bij het schrijven niet op een branch die ik kon lezen, dus de Bezit-kant leunt op de issue-tekst van #1095 en op de VOETBAL-carrièreplannen.

Besluiten van de eigenaar die dit plan stuurt (21-11, via de coördinator): rode draad sterker, elke akte een duidelijk doel; introducties via een ander personage; korte beurten en reacties; telefoontjes en tussenscènes (Tammo en Tessa onderling, Rikus en Beppe, wisselende bijpersonages en de antagonist); verhaal eerst, bijbanen en loopbanen komen vrij via het verhaal met een migratieregel voor bestaande spelers; Tammo en Tessa zijn 24, net afgestudeerd en beiden werkloos, vijf jaar vrienden, Tammo vijf jaar stiekem verliefd; **kern: Tessa ontdekt dat ze een frietwagen wil, Tammo rijdt (zijn liefde voor autorijden + haar liefde voor vette snacks), twee afgestudeerden gaan het echte leven in en ontdekken zichzelf in Grunn**; tegenstander Jelle Terpstra en zijn snackimperium blijft en wordt het gezicht van de lijn; eind = de frietwagen groeit (ondernemerschap, Bezit en loopbanen); romance is hoofdlijn (zoet en komisch); spelersrol wisselt per verhaal of activiteit; toon warm, grappig, soms ontroerend; de aktes ontgrendelen werelden (1 rijden en klussen, 2 boerderij en Tessa, 3 panden en ondernemen, 4 voetbal en regio); missies die niet bij de lijn passen worden herschreven (speelmechaniek blijft); gewijzigde regels opnieuw opnemen.

---

## 1. Samenvatting en aanbeveling

**Wat er goed is.** De grappen en het ritme van de losse scènes zijn sterk: Tammo's korte, droge stem en Tessa's "Rijden, niet praten", het Loket, de duiven, Berends "Nul krassen", Jelle als ijdele bureaucraat met een moeder. De cast is gevarieerd en elke missie heeft één herkenbaar ding. De romantische terugkerende grappen ("Voor de grip", "Dat gezicht betekent...") werken. De opzet van de vijf akten volgt een klassieke heldenreis en de kalender klopt.

**Wat er mis is, in één alinea.** Het verhaal is een reeks sterke aflevering-missies zonder dat de speler steeds weet *waarom hij dit doet*. Het eigenlijke motief (Tessa wil een thuis met wielen; Tammo wil bij haar blijven) komt pas in akte 5 uit hun mond (M22, de knuffel). De hele eerste helft draait om "de bal pakken", daarna om "vijf ingrediënten", dan om "bewijs dat Jelle de bal nam", dan om "jury", en pas in de finale komt alles samen; het doel verschuift zonder dat iemand het hardop zegt. Er komen 43 sprekende personages in beeld; ongeveer de helft krijgt geen aanloop ("uit de lucht gevallen"), terwijl de belangrijkste tweede verhaallijn (Mem appt Tessa) een stil appje is waarvan de uitleg twaalf missies te laat komt. Gesprekken zijn vaak een uitleg door één mond (Tessa legt uit, Tammo reageert droog) in plaats van een gesprek tussen mensen met een belang.

**Aanbeveling.**
1. **Één zin boven alles, vanaf scène één:** *Twee net afgestudeerde, werkloze vrienden willen een frietwagen laten staan; Tessa wil dat meer dan ze zegt, Tammo wil bij haar blijven.* De opening laat dat zien (niet vertellen), elke akte krijgt een eigen deeldoel dat daaruit volgt (hoofdstuk 7), en Jelle is de man die dat tegenhoudt omdat hij het eerst wil.
2. **Eerst de ruggengraat vastleggen** (hoofdstuk 7, per akte een blad) en de introductie- en dialoogregels (hoofdstukken 8 en 9) als toets op *elke* nieuwe regel. Daarna pas herschrijven.
3. **Kleine, stille tussenscènes en telefoontjes** (hoofdstuk 10) zijn de goedkoopste winst: ze lossen de meeste "uit de lucht gevallen"-momenten op zonder één missie te herbouwen, en hergebruiken `storycontact.js`, `banter.js` en de terugkeervignetten.
4. **Ontgrendeling per akte** (hoofdstuk 14) pas bouwen als de ruggengraat staat, met de migratieregel "wat open was, blijft open".
5. **Volgorde van het werk:** WP0 (toets en data, S) → WP1 akte 1 (M) → WP2 tussenscènes-systeem (M) → WP3 akte 2 → ... Zie hoofdstuk 17. Reken op ongeveer **330 tot 400 regels** die opnieuw of nieuw ingesproken moeten worden (aanname, hoofdstuk 16).

---

## 2. Methode en cijfers

Ik las alle scènes in speelvolgorde zoals een speler ze tegenkomt (opening, M01 tot en met M30, reisbeats, radio, banter, appjes, epiloog) en lette per scène op: wie komt er in beeld en wordt hij geïntroduceerd; weet de speler wat het doel is; klopt de rest met wat eerder gezegd is. Daarnaast telde ik per scène beurten, regels per spreker en woorden per regel.

| Meting (script.json, stand 21-11) | Waarde |
|---|---|
| Scènes, regels | 207, 1.431 (37 stil als appje) |
| Mediaan, gemiddelde, p90 en maximum aantal woorden per regel | 7, 8,5, 17 en 38 |
| Regels per hoofdrolspeler | Tessa 459, Tammo 350, Berend 76, Jelle 66, Rikus 62, Oma Trijntje 39 |
| Regels van Jelle per akte (1 tot en met 6) | 9, 17, 8, 7, 21, 4 |
| Scènes van Jelle | 34 van 207; in akte 1 alleen M03.2 en M06.3 in persoon of op de radio |
| Scènes waarin één spreker drie of meer beurten achter elkaar heeft (niet radio, replay of appje) | 16 (o.a. M13.3 Lammert x5, M03.4 Tessa x4, de drie jurystemmen) |
| Regels van 28 woorden of meer | 15 scènes (M07.1, M08.3, M10.1, M11.1, M11.4, M13.1, M14.1, T3, M16.1, M19.3, M20.3, M22.3, M25.1, M26.2, M26.6) |
| Scènes met 14 of meer regels | 19, waarvan de vier langste M20.5 (20), M22.4 (19), M03.2 (18) en C00.2 (18) |
| Regels in stille appjes die verhaal dragen | o.a. de tip van Mem over de trein (M21.2), "Kom dinsdag naar Bourtange" (M18.4), "Nog acht dagen. Hou Jelle bezig" |
| Sprekers met één of twee regels in het hele spel | ca. 20 (Boer, Kustwachter, Deurwaarder, Student, Kermisexploitant, Kind, Buurvrouw, Jelmer, ...) |

De mediane regel is kort (zeven woorden): het probleem is dus niet de lengte van *regels*, maar de *vorm van de scène* (één mond die uitlegt, geen belang aan de andere kant, geen stilte) en de *volgorde van informatie* (het waarom komt na het wat).

---

## 3. Analyse per akte

Scorekaart: 1 tot 5 (5 is goed voor een speler zonder context). Duidelijkheid = weet je wat er speelt; natuurlijkheid = voelt het als mensen die praten; introductie = weet je wie iedereen is en waarom hij ertoe doet; doel = weet je wat je moet doen en waarom, zonder logboek.

### Akte 1: Moi, Grunn (opening, M01 tot en met M06)

**Tweezinsverhaal zoals het nu overkomt:** Twee mensen die samen een frietwagen willen, hebben geld nodig voor een wedstrijd en lopen daarbij tegen een Friese man in een blauw colbert aan die alles opkoopt. Om hem voor te zijn pakken ze een gouden eierbal uit het museum, maar de vitrine blijkt al leeg: hij had hem al.

| Duidelijkheid | Natuurlijkheid | Introductie | Doel |
|---|---|---|---|
| 3 | 3 | 3 | 3 |

Wat werkt: Jelle wordt via anderen aangekondigd (chat M01.5, Berend M01.6, Sjabbe M02.3: een blauw colbert "in augustus", een klomp met contant geld) vóór hij in beeld komt (M03.2) en krijgt dan een naamkaart en één tag (alles is een overeenkomst, "Foar mem"). Dat is precies het introductieprotocol dat hoofdstuk 8 voorstelt, alleen nog niet systematisch. Sjabbe, Berend, Bert en Sjoerd worden elk in één beat neergezet met één trek.

Wat niet werkt:
- **De opening begint midden in een gesprek.** "Moi. De bank?" Wie zijn deze twee, hoe kennen ze elkaar, waarom willen ze een frietwagen, wat is "d'Olle Grieze"? De speler hoort het woord *huisgenoten* en een grap over "samen net", maar nergens waarom Tessa dit wil. Het hart van het verhaal staat er niet.
- **Het doel verspringt in vier stappen.** Inschrijven (M01-M03) wordt "de bal stelen voordat Jelle hem pakt" (M03.4), wat gebaseerd is op een vierlaagse spelregel (de bewaarder zit de jury voor; bij verhindering het oudste jurylid; de notaris schrijft de nieuwe bewaarder in). Een nieuwe speler moet vier regels onthouden voor de eerste echte keuze.
- **De kraak is de climax van akte 1, maar de motivatie komt uit één Tessa-zin** ("Als iemand die bal steelt, dan liever wij"). Tammo's enige weerstand is een stil moment. Zijn opa en 1953 worden genoemd en niet gevoeld.
- **Rikus is alleen een stem.** Hij is Tammo's jeugdvriend (canon), maar nergens is dat te horen: de speler kent hem als radiopresentator.
- **Berends gips, de torenwachter en Henk** zijn grappige losse figuren zonder voorgeschiedenis. Henk belt in M06.0 zonder ooit te zijn geïntroduceerd.
- **Appjes** (A1.1) zijn stil: "Ik pin de honderdvijftig. Wacht bij de auto." heeft geen context.

### Akte 2: Het Noorden is groot (M07 tot en met M11, T1, T2)

**Tweezinsverhaal NU:** Jelle koopt het vet, de eieren en het zout van Grunn en omstreken op en Oma Trijntje stuurt de twee langs haar vrienden om het recept van 1953 te redden. Tussendoor jagen ze op een koffer die Jelle altijd bij zich draagt en blijkt er iets met zijn moeder te spelen.

| Duidelijkheid | Natuurlijkheid | Introductie | Doel |
|---|---|---|---|
| 2 | 3 | 2 | 2 |

Wat werkt: elke missie heeft één herkenbare grap en één plaats (Noordpolderzijl, de Melkweg op de zandplaat); de Melkwegscène (M11.5/M11.6) is het eerste moment waarop de romance echt voelbaar wordt; de sloot-scène (M10.3: "Mem is eenennegentig... Mem wil niks. Daarom doe ik het") geeft Jelle zijn eerste hart.

Wat niet werkt:
- **Een tweede doel verdringt het eerste zonder aankondiging.** Tot en met M06 is het doel *de bal*. In M07.1 zegt Tessa in één regel: "Eerlijk winnen kan nog: jouw oma won in 1953", gevolgd door het vet. De speler hoort pas in M08.3 (acht missies na het begin, via een monoloog van Oma) *waarom* ze een recept met vijf vrienden nodig hebben. Het ingrediëntenspel (vet, eieren, zout, meel, mosterd) is een goed idee en moet in akte 1 al zichtbaar zijn.
- **Oma Trijntje valt uit de lucht.** Eerste verschijning is een telefoontje op de radio (R2.2) vóór ze ooit is genoemd; Tammo zegt dan pas in M08.1 "oma". Dat zij 92 is, Tammo's oma, winnares van 1953 en Jelles moeders rivale blijkt uit één lange scène (M08.3, regel van 32 woorden).
- **Mem (Jelles moeder) bestaat alleen als stil appje** aan Tessa ("Pas op dysels, famke. – M.", M07.3) zonder dat de speler weet wie M is of waarom ze Tessa kent. De uitleg (Tessa logeerde elke zomer naast Mem) komt in M22.4. Daardoor leest de latere ruzie in M20.5 als uit de lucht, terwijl ze de romantische spanning van de hele middenakte is.
- **De koffer is eerst de bal, dan chocola, dan weer de bal** (M10.1, M11.3 "oefenbal", M16.5 "hij heeft hem echt"): drie keer hetzelfde ontdekken zonder verandering.
- **De politie** ("de politie zoekt twee Stadjers in het zwart", R1.3) is de enige stakes van de kraak en verdwijnt dan tot de epiloog.
- **Geesje, Klaas, Dijkstra** zijn leuke bijrollen met één regel uitleg, maar zonder bijbehorende reden dat Tammo en Tessa hen kennen of vertrouwen: elk is "een vriend van Oma", en dat is de enige aanloop.

### Akte 3: Aan de Eems (M12 tot en met M16, T3)

**Tweezinsverhaal NU:** De twee halen Jelles koopboek uit een ballon, saboteren zijn schip in de Eemshaven, winnen een race over de dijk en kapen met een vliegtuigje de aandacht van de jury. Op de kermis in Winschoten zoenen ze elkaar in een botsauto en doen dan alsof er niets gebeurd is.

| Duidelijkheid | Natuurlijkheid | Introductie | Doel |
|---|---|---|---|
| 3 | 3 | 2 | 2 |

Wat werkt: het koopboek als prop (acht plakjes, "Foar mem" met een hartje) is een sterk visueel hulpmiddel; de kus en de dijkscène met "Moi... Moi" zijn zoet en komisch en laten de romantische lijn lopen; Lammerts "Twee bedden. Twee bedden." is een strakke grap.

Wat niet werkt:
- **Tessa legt in elke intro uit** (M12.1, M13.1, M14.1, T3, M15.1): "Jelle vliegt met zijn koopboek in een ballon... Daarin staat welk plakje hij als volgende koopt." De speler hoort *wat Jelle doet* uit Tessa's mond, niet van Jelle zelf. Jelle verschijnt in akte 3 acht keer, vooral in bijzinnen.
- **De nieuwe cast landt zonder aanloop:** Dijkstra met een heli (M11.8 belt en "dit stond niet in het rooster"), Rotor Roelf, Lammert, Roelfien en Geert krijgen elk één regel intro, soms alleen via de naamkaart in de regie.
- **De middenakte heeft zes doelen** in vijf dagen (koopboek, container, dijk, spandoek, kermis, antwoord). Het eigenlijke keerpunt (M16.5: Durk verklapt dat Jelle de bal in zijn limo draagt) is een weggegooide regel in een kermiscène waarvan de aandacht bij de kus ligt.
- **Het alcoholpubliek en de jaloersgrap in M16.1** (Geert: "mijn nieuwe barman wil heel graag je nummer") staat vlak vóór de kus; goed als gag, maar het is de eerste keer dat de speler hoort dat Tammo jaloers is, en niemand heeft ooit gezegd dat hij verliefd is.

### Akte 4: Zuidwaarts (M17 tot en met M21, T4)

**Tweezinsverhaal NU:** Ze laten Jelles mosterdschip vastlopen, vinden in een logboek bewijs dat hij de bal al vijf dagen voor hun kraak had, en zetten een stoomtrein stil bij Veendam. In Bourtange neemt Jelles moeder de bal van hem af, daarna splitsen ze: Tessa redt de auto, Tammo probeert de vrienden van Oma bij elkaar te houden.

| Duidelijkheid | Natuurlijkheid | Introductie | Doel |
|---|---|---|---|
| 2 | 3 | 2 | 2 |

Wat werkt: de kruitkelderscène (M20.3) is de beste enkele onthulling van het spel (Mem: "Er is geen overeenkomst, jonge. Er is een moeder."); de ruzie in M20.5 is menselijk en komisch ("Twee keer 'nooit' in tien seconden. Ik tel mee").

Wat niet werkt:
- **Akte 4 heeft drie doelen** (mosterd, bewijs, jury) en `WHY` noemt er maar twee ("Bewijs dat Jelle de bal nam, en de bal terughalen"). Het jurydoel (M19) verschijnt in één Tessa-regel.
- **Jelle is bijna afwezig:** zeven regels in de hele akte. De tegenstander die de inzet maakt (hij wil de standplaats, de jury, de bal) is er het minst als de inzet het hoogst is.
- **De splitsing in M21 is twee losse solomissies met een verhuld doel**, en de rol-opsomming van Tammo (M21.4: negen vrienden die elk één slecht nieuwsbericht afgeven) is een lijst die niemand onthoudt: "Mijn rubberboot is in beslag genomen. ... Mijn kade is verhuurd... Mijn vliegvergunning is ingetrokken."
- **Beslissende informatie in stille appjes:** de trein bij Zuidhorn staat in een stil appje van Mem (M21.2), de uitnodiging voor Bourtange in M18.4. Wie de telefoon niet leest, mist twee plotpunten.
- **Het bewijs van M18 mondt nergens in uit:** Tessa print het logboek "voor als iemand zegt dat wij de dieven zijn", maar niemand zegt dat tot M26.2.

### Akte 5: Ontzet (M22 tot en met M26, epiloog)

**Tweezinsverhaal NU:** De Escapade krijgt een luik en de twee praten het uit, met als gevolg dat de hele colonne van Oma's vrienden naar Grunn rijdt. Op het Ontzet wint de beste eierbal, Jelle verliest van zijn moeder en Tammo zegt zijn vijf woorden.

| Duidelijkheid | Natuurlijkheid | Introductie | Doel |
|---|---|---|---|
| 4 | 4 | 3 | 4 |

Wat werkt: dit is de beste akte. De knuffel (M22.4), "Woist ja wel", de vijf woorden en de afloop van Jelle zijn emotioneel eerlijk en grappig; het Ontzet als wedstrijd (jury, drie uitslagen) werkt. De callbacks betalen uit.

Wat niet werkt:
- **De emotionele uitbetaling steunt op informatie die de speler pas hier krijgt** (Tessa's thuisloosheid, de zomers bij Mem, de vijf woorden): dat had een akte eerder moeten *beginnen*.
- **De regels van de jury** (regel één, regel twee, notaris, bisschop) zijn bijna een rechtbankscène in M26.2 (Berend 31 woorden).
- **De afloop van Jelle gebeurt buiten het zicht van de speler:** het is zijn moeder, niet het duo, die hem stopt (M26.5).
- **De epiloog** (E2) is vijftien regels van één spreker: een volledige vertelling van wat iedereen overkwam. Charmant op de radio, maar het is een opsomming.

### Deel 4: Nazomer (M27 tot en met M30, T5)

**Tweezinsverhaal NU:** Een oude vrouw in Loppersum moet tijdelijk uit haar versterkte huis; Tammo en Tessa helpen haar verhuizen en terugkomen en gaan daarna met Berend oefenen voor het Beleg. Warm, rustig, losstaand.

| Duidelijkheid | Natuurlijkheid | Introductie | Doel |
|---|---|---|---|
| 4 | 4 | 3 | 3 |

Wat werkt: de toon (stilte, een kat, een foto) is het meest "ontroerend" van het spel en past bij de nieuwe toonrichting van de eigenaar. Wat niet werkt voor een nieuwe speler: het sluit niet aan op Jelle of de frietwagen. Het is mooi als nazomer maar niet als het "ondernemerschap"-einde dat de eigenaar nu wil.

### Samenvattend scorebord

| Akte | Duidelijkheid | Natuurlijkheid | Introductie | Doel | Gemiddeld |
|---|---|---|---|---|---|
| 1 Moi, Grunn | 3 | 3 | 3 | 3 | 3,0 |
| 2 Het Noorden is groot | 2 | 3 | 2 | 2 | 2,3 |
| 3 Aan de Eems | 3 | 3 | 2 | 2 | 2,5 |
| 4 Zuidwaarts | 2 | 3 | 2 | 2 | 2,3 |
| 5 Ontzet | 4 | 4 | 3 | 4 | 3,8 |
| Deel 4 Nazomer | 4 | 4 | 3 | 3 | 3,5 |

---

## 4. Introducties: wie komt wanneer in beeld

Eerste verschijning en oordeel per personage (alles uit `script.json` en de regie). "Aanloop" = weet de speler al iets vóór de eerste ontmoeting; "tag" = de ene eigenschap die blijft hangen. Een rode regel in de kolom Oordeel betekent: werk nodig.

| Personage | Eerste scène | Aanloop vooraf? | Naamkaart | Tag (één trek) | Oordeel |
|---|---|---|---|---|---|
| Tammo | C00.2 | nee | opening | droog, kort | goed; maar zijn *verlangen* ontbreekt (rijden, bij Tessa blijven) |
| Tessa | C00.2 | nee | opening | regelt alles, "Rijden, niet praten" | goed; haar droom (frietwagen) wordt niet getoond |
| Rikus | C00.1 | nee | nee | radio, "Ik zeg niks" | werk: dat hij Tammo's jeugdvriend is, hoor je nergens |
| Berend Bos | M01.1 | nee | nee | "Nul krassen", telt alles | goed (zijn tag werkt bijna elke scène) |
| Streamer | M01.2 | nee | nee | content | goed (grap) |
| Torenwachter | M01.3 | nee | nee | "Ik meld alleen" | goed (running gag) |
| Sjabbe | M02.2 | nee, telefoon | M02.3 | "Ik vraag niks. Ik zeg alleen:" | goed |
| Durk en Douwe | M02.1 | nee | nee | "...Hè." / echo | goed |
| Jelle Terpstra | M03.2 | **ja**: chat (M01.5), Berend (M01.6), Sjabbe (M02.3) | M03.2 | alles is een overeenkomst, "Foar mem" | **goed; het model voor de rest** |
| Mevrouw Hoving | M03.2 | nee | nee | formeel, bewaarder | werk: regelkaart in één alinea |
| Duivenmelker Bert | M03.4 | nee, telefoon | M04.1 | luistert, duiven | redelijk |
| Sjoerd | M05.1 | ja: Tammo noemt hem in M04.3 | nee | "Regels zijn regels. Behalve de mijne." | redelijk |
| Henk | M06.0 | nee, telefoon | nee | "Eén koekje" | werk: valt uit de lucht |
| Mem (stil) | M07.3 | nee | nee | "famke" | **werk: de belangrijkste vreemde in het spel, zonder uitleg** |
| Oma Trijntje | R2.2 (radio) | nee | M08.1 | "jong", Gronings, 92 | **werk: komt via de radio vóór ze ooit genoemd is** |
| Geesje | M09.1 | ja, via Oma (M08.3) | M09.1 | nuchter kosteres | goed |
| Kapitein Klaas | M11.1 | ja, via Oma (M10.4 appje) | M11.1 | "praat tegen je boot" | goed |
| Dokter Dijkstra | M11.8 | nee, telefoon | M12.1 | "dit stond niet in het rooster" | werk: een arts met een heli, zonder aanloop |
| Lammert | M13.1 | ja (Klaas, M11.8) | M13.1 | havenmeester | redelijk |
| Roelfien | M15.1 | nee | M15.1 | "vlieg laag" | redelijk |
| Geert | M16.1 | nee | nee | barman | werk: uit de lucht |
| Wubbo | M17.1 | nee | M17.1 | "Open of dicht. Nooit allebei." | goed (de tag is meteen sterk) |
| Accountmanager | M18.1 | nee | nee | satire-kantoor | goed |
| Tinus | T4.1 | nee | nee | "Ik ben Tinus. Ik beleg mee." | werk: aankondiging van zichzelf is geen introductie |
| Mem Terpstra (in beeld) | M20.3 | **half**: stille appjes, Oma, Berend | M20.3 | "Er is een moeder." | werk: grote onthulling, kleine aanloop |
| Willemien | M27.1 | nee | nee | "Dat zegt Trijntje van alles" | goed (de sfeer zit in de eerste regel) |

**De patronen:** wie via een ander personage wordt aangekondigd, werkt (Jelle, Geesje, Klaas). Wie zichzelf voorstelt of via de radio of telefoon binnenvalt, werkt niet. De vijf zwaarste gevallen: **Mem, Oma Trijntje, Rikus, Henk en Dijkstra**.

---

## 5. De top-20 van de ergste punten

Gerangschikt op schade voor een speler zonder context (1 is het ergst).

1. **Het motief staat nergens in akte 1 tot en met 4:** Tessa's droom (een thuis met wielen) en Tammo's verlangen komen pas in M22.4 hardop. (opening C00.2; M22.4)
2. **Het doel verspringt zonder aankondiging:** de bal (akte 1) wordt ingrediënten (M07/M08) wordt bewijs (M18) wordt jury (M19) wordt finale. Nergens zegt iemand: "oké, nieuw plan, en dit is waarom". (M07.1, M08.3, M18.1, M19.3)
3. **Mem is een stil appje zonder uitleg:** de belangrijkste verborgen lijn (Tessa en Jelles moeder) leeft in `app-stil` en blijkt uit de lucht in M20.3 en M20.5; de achtergrond (zomers naast Mem) komt in M22.4. (A2.1, M07.3, M10.4, M20.3)
4. **De regels van het spel zijn te ingewikkeld voor de eerste echte keuze:** bewaarder, jurylid, artikel 9, notaris, bisschop. (M03.2, M03.4, M19.3, M26.2)
5. **Oma Trijntje valt via de radio uit de lucht** (R2.2) en haar rol (winnares 1953, Tammo's oma, rivale van Gerda) wordt in één monoloog gegeven (M08.3).
6. **Jelle is afwezig waar de inzet het hoogst is:** akte 4 heeft 7 regels van hem, akte 3 acht; hij verschijnt als telefoontje in bijzinnen, niet als tegenstander in scènes. (akte 3 en 4)
7. **De romance heeft geen begin:** niemand heeft gezegd dat Tammo verliefd is. De kus (M16.4), de jaloezie (M16.1) en de vijf woorden (M26.7) landen daardoor minder. De peiling van Rikus (R5.2) is het eerste expliciete signaal en komt in akte 5.
8. **Tessa legt in bijna elke intro uit:** ze is de informatiebron voor de speler (459 regels tegen 350 van Tammo), waardoor de gesprekken een uitleg-met-grapje zijn. (M07.1, M12.1, M13.1, M14.1, T3, M15.1, M19.1)
9. **Beslissende plotinformatie in stille appjes:** de trein (M21.2), Bourtange (M18.4). Wie de telefoon niet leest, mist twee plotpunten.
10. **Rikus is alleen een stem:** de jeugdvriend-canon wordt nergens hoorbaar; hij heeft geen gesprek met Tammo of Tessa in de scènes.
11. **Uit de lucht gevallen figuren:** Henk (M06.0), Dijkstra (M11.8), Geert (M16.1), Tinus (T4.1), Rotor Roelf (M12.2), Mevrouw Hoving (M03.2), Loket-bediende, Boer, Deurwaarder, Student. Elk verschijnt, zegt iets en gaat.
12. **De koffer is drie keer de bal** (M10.1, M11.3, M16.5): hetzelfde ontdekken zonder voortgang.
13. **De politie als stakes verdwijnt** na R1.3 en keert terug in E2: de kraak heeft geen gevolg.
14. **Akte 4 heeft drie doelen en `WHY` noemt er twee:** mosterd, bewijs, jury. (M17 tot en met M19; storyarc_nieuw.js `WHY.zuid`)
15. **Het bewijs van M18 heeft geen aanleiding:** Tessa print een bewijs "voor als iemand zegt dat wij de dieven zijn" terwijl niemand dat zegt. (M18.3)
16. **De vriendenopsomming in M21.4:** zes personages leveren elk één slecht nieuwtje af; het is een rollenlijst, geen gesprek.
17. **Overgangen zonder tussenscène:** na M06 springt het spel naar "dinsdagochtend" (R2.0), na M11 naar de Eemshaven (M12.1), na M16 naar Veendam (M17.1). Er is geen "wat gebeurde er net, wat nu"-gesprek tussen de twee. (de overgangen zitten nu in Rikus' radio)
18. **De finale-uitleg door één mond:** Berend legt in M26.2 en M26.6 (31 en 33 woorden) de wedstrijdregels uit, Jelle antwoordt met een notarisregel. (M26.2, M26.6)
19. **De epiloog is een opsomming** (E2: vijftien regels Rikus), terwijl de romantische uitbetaling al in M26.7 gebeurde.
20. **Deel 4 sluit niet aan op de lijn:** een mooie, rustige, losse bijdrage (Willemien, Loppersum) zonder Jelle of de frietwagen. Past bij toon, niet bij "frietwagen groeit".

Daarnaast, minder erg maar wel opgevallen (continuïteit): M18.3 "vijf dagen vóór onze kraak" (12 augustus tegenover 16 augustus is vier dagen); Tammo "vierendertig" tegenover de canon van 24 (loopt bij de andere agent); in M17.1 onderbreekt Tammo Wubbo's intro met "Tessa. Even over zaterdag" (een romantisch moment midden in een briefing); T3 "de trein gaat eerst terug via Station Grunn" is zonder gevolg; M21.3 en M21.6 zijn twee varianten die bijna dezelfde tekst hebben (vertakking op gameplay, geen fout).

---

## 6. Het plan: de rode draad (kern, 21-11)

### 6.1 De drie lijnen

Alles wat in het spel gebeurt, hoort bij één van drie lijnen. Een scène die bij geen van drie hoort, is een kandidaat voor schrappen, inkorten of koppelen.

1. **De frietwagen (A-lijn, het doel).** Tessa ontdekt dat ze een frietwagen wil: ze houdt van vette snacks en van mensen die ergens samenkomen; Tammo rijdt, want hij houdt van autorijden. Twee werkloze afgestudeerden worden ondernemers in Grunn. Elke akte brengt de wagen één stap verder: een naam en een plan (1), een gezicht en een recept (2), een plek en een pand (3), een team en een regio (4), een wagen die rijdt en een uitslag (5), groei (Deel 4 en daarna).
2. **De romance (B-lijn, de tweede hoofdlijn).** Tammo is vijf jaar stiekem verliefd; Tessa merkt iets maar durft het niet te lezen. Zoet en komisch, een boog met een kantelpunt en een hoogtepunt (hoofdstuk 12).
3. **Jelle (C-lijn, de tegenstander).** Een rijke, bureaucratische, arrogante, lange man die plakje voor plakje alles koopt en "foar mem" doet. Mensen willen hem slaan en tegelijk is hij ergens lief. Hij zorgt dat elke akte een obstakel heeft en dat het obstakel een gezicht heeft.

### 6.2 De bril: de eerste vijf minuten

De openingsscène (C00.2) moet in één minuut laten zien: wie zijn deze twee (24, net af, beiden zonder baan, vijf jaar vrienden, nu huisgenoten), wat willen ze (*zij*: iets eigens met friet en wielen; *hij*: rijden, en bij haar blijven, onuitgesproken) en wat staat ertegenover (de bank zegt nee, een wedstrijd is de enige weg, een Fries koopt de markt op). Beproeving: een speler die alleen die minuut ziet, kan in één zin zeggen waar het spel over gaat. Dat is de maatstaf voor akte 1 en voor het scenario van de trailer.

---

## 7. Ruggengraat per akte

Elk blad is bedoeld om vóór het herschrijven vast te leggen en is de toetssteen voor elke regel in de akte. Alle namen komen uit het bestaande spel; nieuwe bijrollen zijn voorstellen ("nieuw").

### Ruggengraat akte 1: Moi, Grunn (Stad; vr 14 tot ma 17 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel (één zin) | Tessa en Tammo moeten honderdvijftig euro verdienen en zich inschrijven voor de Noordelijke Snackprijs, de enige weg naar een standplaats voor de Fjord Frituur. |
| Tegenstander | Jelle Terpstra, die de markt opkoopt en de wedstrijd wil winnen voor zijn moeder. |
| Inzet | Tessa's droom van een thuis met wielen; Tammo blijft bij haar; zonder standplaats niets. |
| Wie leren kennen, wanneer | Opening: Tammo, Tessa, Rikus (als jeugdvriend); M01: Berend; M02: Sjabbe (via Tessa: "ik ken iemand die opent wat niemand kan"); M03: Jelle (aangekondigd door Berend, chat, Sjabbe), Hoving (in één zin); M04: Bert (Tammo: "de beste vriend van mijn opa"); M05: Sjoerd; M06: Henk (eerst in M02 of M05 een korte scène). |
| Kernscènes | (1) De keuken: Tessa bakt of bakt friet om half drie 's nachts en praat zichzelf een droom in; Tammo rijdt haar, de bank zegt nee. (2) De eerste rit: Tammo's liefde voor rijden zien. (3) Het Loket (Jelle in beeld). (4) De kraak als slotstuk. |
| Wereld die opengaat | Rijden en klussen: Klus (M02), Kantoor (M03), Padel (M05), Taxi (M06). Het Stadsnet is de speeltuin. |
| Romantiek | De opening zegt het onuitgesproken ("Als huisgenoten, Tammo."); de kraakhand ("Voor de grip") is al een goed begin. Eén extra beat: Tammo kijkt, Tessa ziet het en negeert het. |
| Jelle zichtbaar | Hij hoort meer dan één keer: een radio-uitzending (M01 tot en met M02), een geluidsbericht aan Tessa, en pas dan in persoon (M03). |
| Einde van de akte | De vitrine is leeg ("Tige tank! – J."): Jelle is hen een stap voor. Hook: de hele provincie. |
| Wijzigingen in missies | M03.4 en M05.3: de dubbele spelregel (bewaarder, notaris) naar één regel: *wie de bal heeft, zit de jury voor, en dat wil Jelle*. De rest van de regels komt later, één per scène. |

### Ruggengraat akte 2: Het Noorden is groot (Stad, Hogeland, Waddenzee; di 18 tot do 20 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel (één zin) | Een recept van Oma Trijntje redden (vet, eieren, zout, meel, mosterd), omdat ze zonder de bal toch eerlijk willen winnen. |
| Tegenstander | Jelle koopt de ingrediënten op; hij laat zich horen via Rikus' radio en een telefoontje per missie, met zijn eigen redenering ("Dat noemen wij ondernemen"). |
| Inzet | Zonder recept en zonder Oma's vrienden is er geen deelname; Tessa ontdekt dat ze het zelf wil kunnen maken (haar boerenkennis, het dorpsteam). |
| Wie leren kennen | Oma Trijntje (ingeleid in akte 1 door Tammo: de krentjebrij, een belcontact, M05 of M06; dan pas M08), Geesje, Klaas; Mem krijgt een stem (zie tussenscenes). |
| Kernscènes | (1) Oma's keuken: het recept van 1953 met vijf dingen en vijf vrienden. (2) Warffum: Tessa op het platteland, haar thuis, Tammo's verbazing (hier ontdekt de speler dat zij boerendochter is). (3) De zandplaat onder de sterren (romance). (4) De sloot (Jelle geeft zichzelf bloot). |
| Wereld die opengaat | Boerderij en Landbouw (Tessa), Vissen, Water, Vrachtwagen, Bezorging, Horeca (de eerste snacks). Tessa is de speelbare held voor de boerderijopdracht. |
| Romantiek | Kantelpunt 1: de sterren (M11.5/M11.6), met een duidelijke reactie van Tessa (ze ziet dat hij kijkt) en één regel waaruit blijkt dat Tammo het al lang weet. |
| Jelle zichtbaar | Minstens één eigen scène per missie of een duidelijk telefoontje; zijn "tweede gezicht" (de koffer, mem) begint in de sloot-scène. |
| Einde van de akte | Dijkstra's belletje en de hint naar de Eemshaven. Hook: het koopboek. |
| Wijzigingen | M07.1: uitleg door Tammo of Tessa in twee beurten; M08: Oma's rol eerder gezet en de lijst van vijf vrienden visueel (een prop in de flat: het prikbord). |

### Ruggengraat akte 3: Aan de Eems (Eemsdelta, Oldambt; vr 21 tot zo 23 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel (één zin) | Jelles koopboek lezen en hem stoppen bij de haven, het graan en de jury, terwijl Tammo en Tessa hun eerste eigen pand of stek leren kennen. |
| Tegenstander | Jelle in persoon, met een eigen scène per missie. Zijn kantoor (een mobiele kantoorwagen, "mijn juristen") is zichtbaar op de achtergrond. |
| Inzet | De drie plakjes die hij nog nodig heeft; de jury. |
| Wie leren kennen | Dijkstra (via Oma), Lammert (via Klaas), Roelfien, Geert, Rotor Roelf (elk via een eerder personage). |
| Kernscènes | (1) De ballon: Tammo hangt aan de lier (zijn ding). (2) De haven en Lammerts kantoor ("Twee bedden"). (3) De dijk. (4) De kermis en de kus. |
| Wereld die opengaat | Panden en ondernemen: Sjabbe (Pand & Poen) introduceert Bezit; Lammerts havenkantoor is het eerste pand dat Tessa en Tammo zelf mogen beheren; Kermis (loopbaan) als eerste eigen kraam. |
| Romantiek | Kantelpunt 2: de kus. Daarna doen ze alsof het niet gebeurd is. Eén extra beat: Tessa beseft dat Mem ook haar vriendin is (Mem schrijft haar), en zwijgt er over. |
| Jelle zichtbaar | Hij moet minstens twee goede scènes hebben: zijn limo bij de kermis, hij schrijft een bedankbriefje aan Tessa. |
| Einde | Durk's verklapper: Jelle rijdt maandag naar Veendam met de bal. |
| Wijzigingen | Tessa legt minder uit; Jelle legt zijn plan zelf uit op de radio of in beeld. |

### Ruggengraat akte 4: Zuidwaarts (Veenkoloniën, Westerwolde; zo 23 tot wo 26 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel (één zin) | De bal terughalen bij Jelle, in Bourtange, voordat hij hem aan zijn moeder geeft en daarmee de standplaats wint. |
| Tegenstander | Jelle, die nu zelf op pad is; zijn moeder Mem wordt een tweede gezicht (ze neemt hem af). |
| Inzet | De bal en daarmee de jury; en voor Tessa: Mems vertrouwen. |
| Wie leren kennen | Wubbo, Accountmanager (Wiebelwerk), Tinus (via Henk: "hij heeft een schuur"); Mem in beeld via een telefoontje met Tessa vóór M20. |
| Kernscènes | (1) De brug. (2) Het logboek (het bewijs dat Jelle de bal al had). (3) Bourtange en de kruitkelder. (4) Tessa en de trein; Tammo en de vrienden. |
| Wereld die opengaat | Voetbal (Veendam: de dorpsclub; Tessa's dorpsteam) en regio-reizen (bus, trein, boot); Race. |
| Romantiek | Dieptepunt: de ruzie (M20.5). Maar de speler moet vooraf weten wat Tessa verbergt (de appjes van Mem). Beide solo-delen (M21) zijn de kantelpunten van haar en zijn eigen boog. |
| Einde | De twee zijn uit elkaar, de auto is terug, de bal is weg. |
| Wijzigingen | Doel en `WHY` vernieuwd; de vriendenopsomming in M21.4 wordt een gesprek met één ruzie tussen twee vrienden. |

### Ruggengraat akte 5: Ontzet (Westerkwartier, Stad; wo 26 tot vr 28 augustus)

| Onderdeel | Inhoud |
|---|---|
| Doel (één zin) | De Fjord Frituur op de Grote Markt krijgen, en daar de wedstrijd winnen met de beste eierbal. |
| Tegenstander | Jelle in zijn eigen stad: de notaris, de limo, zijn kraam. |
| Inzet | De standplaats; de relatie. |
| Wie leren kennen | Niemand nieuws; iedereen komt terug (de colonne). Nieuwe lijn: het publiek, Rikus' uitzending. |
| Kernscènes | De knuffel (M22.4, de emotionele kern); de colonne; de bak (Tammo bakt); de vijf woorden; Jelle en Mem. |
| Wereld die opengaat | De Fjord Frituur als wagen die rijdt en groeit (ondernemerschap, Bezit-overzicht); de rest is vrij. |
| Romantiek | Hoogtepunt: de vijf woorden, voor iedereen. |
| Einde | De rij loopt tot de Korenbeurs. De wagen is een succes; wat nu? |

### Ruggengraat Deel 4: Nazomer (Loppersum, Bourtange; 14 tot 19 september) en daarna

Doel: de wagen laten groeien en de gemeenschap iets teruggeven. Aanbeveling: Willemien (M27 tot en met M29) blijft maar krijgt een koppeling: ze is een vaste klant van de Fjord Frituur geworden of ze bakt Oma's recept na. M30 (het proefbeleg) wordt de uitnodiging voor de wereld die eronder ligt: boerderij, panden en voetbal zijn nu allemaal open. Na het einde loopt de open wereld door en elke loopbaan houdt een eigen vervolg (hoofdstuk 14).

---

## 8. Introductieprotocol voor personages

Eén regel voor elk nieuw personage dat meer dan één regel krijgt (de rest is decor).

1. **Aankondiging vóór de ontmoeting.** Een ander personage zegt in één zin wie het is en waarom Tammo of Tessa hem kent. *Voorbeeld:* "Hij heeft veertig jaar elk jaar verloren." (Tammo over Berend, vóór M01.1.) Alleen Jelle, Sjabbe, Geesje en Klaas hebben dit nu.
2. **De eerste scène toont één persoonlijkheidstrek**, geen cv: één gewoonte, één zinnetje dat blijft hangen. *Wubbo* (M17.1) en *Berend* zijn het model.
3. **De relatie tot Tammo of Tessa staat er in een bijzin:** "Bert kende mijn opa." De speler hoeft niet te weten wat hij ervan vindt, wel dat het ertoe doet.
4. **Naamkaart** bij de eerste verschijning (bestaat: `namecard.js`) en pas daarna de naam in de ondertitel.
5. **Hergebruik in volgende scènes:** zijn trek komt terug als grap of als hulp. Een personage dat daarna niet meer terugkomt, is een bijrol en krijgt geen eigen naamkaart.
6. **Maximaal één nieuw personage per scène**; twee alleen als ze samen een grap zijn (Durk en Douwe).
7. **Radio en telefoon introduceren nooit:** eerst via een ander (Oma Trijntje, Mem, Henk, Dijkstra, Tinus).

Toepassing op de zwaarste vijf: Mem (een foto of kaartje in de flat in akte 1, een stem in akte 2), Oma Trijntje (Tammo noemt haar in M02 of M05; Rikus noemt haar in een uitzending; dan de telefoon), Rikus (Tammo en hij praten in de eerste scène: "Rikus draait mijn plaat"; de jeugdvriend-regel), Henk (Berend noemt hem: "mijn zwager", of Tammo: "de garage waar ik mijn banden haal"), Dijkstra (Oma: "Dijkstra van het ziekenhuis, ik kookte voor zijn afdeling").

---

## 9. Dialoogleidraad (ritme, subtekst, taal)

**Maat.**
- Een beurt is **twee tot twaalf woorden**; een uitleg langer dan 25 woorden wordt twee beurten met een reactie ertussen (de speler kijkt mee, de ander vraagt of onderbreekt).
- Maximaal **drie beurten achter elkaar** van één spreker; daarna een reactie, een grap of een stilte.
- Maximaal **zeven regels per ondertitelblok** en maximaal **drie sprekers** per scène (het publiek moet kunnen volgen; een grote groep praat via één vertegenwoordiger).
- Elke scène heeft **een wens, een belemmering en een draai**: wie wil wat van wie? Zonder belang aan de andere kant is het een mededeling.

**Technieken** (nu vooral aanwezig in de Tammo-Tessa-grappen; uitbreiden naar de rest).
- *Tussenzinnen:* "Een ei." "Twee." (de wierdepaden, M09.3).
- *Reactieshots:* de regie noemt wie kijkt; een beurt zonder woorden is toegestaan ("Tammo kijkt naar zijn schoenen").
- *Onderbreking:* een regel eindigt met "..." en de ander begint voor het einde.
- *Stilte:* Tammo zegt niks (zijn tag), en de speler hoort dat Tessa wacht; de stilte telt als beurt.
- *Subtekst:* de belangrijkste zin wordt niet gezegd. De kus gebeurt in een botsauto; de vijf woorden zijn "Ik wil bij jou blijven" en geen andere.
- *Terugkomende grappen:* een grap komt hoogstens drie keer terug met een verandering (de derde keer is de beloning).

**Wie praat tegen wie.** Een personage praat tegen een ander personage, niet tegen de speler. Uitleg aan de speler gaat via een logisch kanaal: een telefoontje van Tessa, een prikbord, een radiobericht, niet via een toespraak.

**Taal.**
- Alles Nederlands; Gronings met zorg ("Grunn", nooit "de Grunn"); Fries alleen bij Friezen (Jelle, Mem, Durk, Douwe) met een vertaling door een ander personage of door de context.
- Tessa spreekt standaard Nederlands (besluit #134): een Gronings woord is een grap over haar.
- Tammo's stemtag blijft ongewijzigd (korte, droge zinnen, meestal vijf woorden of minder; langer in drie grote momenten: de weigering, de verontschuldiging en de vijf woorden).

**Controle.** Een nieuwe test `scripts/dialoog_ritme_test.mjs` (WP0) loopt `script.json` af en meldt: regels van meer dan 25 woorden, vier of meer beurten van één spreker, scènes met één spreker, en scènes met meer dan zeven regels per blok, met een toegestane lijst voor bestaande uitzonderingen (de epiloog, de jurystemmen).

---

## 10. Tussenscènes en telefoontjes

### 10.1 Wat er al is (hergebruiken)

| Systeem | Bestand | Wat het doet |
|---|---|---|
| Verhaalcontacten | `game/js/storycontact.js` | Jelle, Durk en Douwe bereiken Tammo en Tessa: `call`, `voicemail`, `live`, `post`, `card`, `scene`, `radio`; ze spelen één voor één op een rustig moment |
| Banter | `game/js/banter.js`, `banterlines.js` | Tammo en Tessa praten in de auto; triggers op prioriteit (na een missie, volgende stap, plaatsen, situaties) |
| Missiebeats | `game/js/missionbeats.js`, `akte34_beats.js`, `sidejobbeats.js`, `reisbeats.js` | tussen-beats halverwege, nasleep, reisgesprekken |
| Verhaalpraat | `game/js/storytalk.js` | ondertitelpraat tijdens een missie |
| Cutscenes | `cutscenes*.js`, `cutscenehost.js` (`playScript`) | opening, kernscènes, regie |
| Terugkeervignetten | `terugkeer.js`, `terugkeerscenes.js`, `terugkeerrun.js` | een korte flatscène per relatiefase na Doorgaan |
| Appjes | `phone.js`, `phonefeed.js` | stille berichten |
| Radio | Nachtstreek in `storycontact.js` (`radio`) | Rikus en zijn bellers |

### 10.2 Wat er ontbreekt

Een scène tussen twee missies waarin Tammo en Tessa **zelf** zeggen wat er net gebeurde en wat nu komt, op een vaste plek en zonder dat de speler er iets voor hoeft te doen. Nu zit die duiding in Rikus' radio of in de intro van de volgende missie (Tessa legt uit).

### 10.3 Het ontwerp: de overgangsscène

- **Wanneer.** Eén per overgang tussen twee missies *binnen een akte* (bij voorkeur de belangrijkste: na de kraak, na de sloot, na de kus, na Bourtange) en één op elke aktegrens: ca. 12 in het hele verhaal. Het wordt gespeeld zodra de missie is afgerond en de speler weer vrij is, nooit tijdens een missie.
- **Wie.** Tammo en Tessa onderling: in de auto (banter-kanaal), in de flat (terugkeervignet-kanaal) of via de telefoon als ze apart zijn (M21). Soms Rikus of Beppe als derde (op de radio of in een bezoekmoment), soms de antagonist: Jelle belt, stuurt een bedankkaartje of een uitnodiging (`call`, `card`) en maakt de inzet hardop duidelijk.
- **Hoe lang.** Twee tot zes regels, 8 tot 25 seconden; één onderwerp (wat net gebeurde of wat nu komt, niet allebei). Nooit meer dan één overgangsscène per twee missies.
- **Overslaanbaar.** Altijd (Spatie of A vasthouden, zoals de terugkeerscène); de inhoud is nooit nodig om door te kunnen: het doel staat ook in de lead van de volgende stap.
- **Techniek.** Een nieuw datatype `bridges` naast `contact` in `storyarc_nieuw.js`: `{ after: 'M06', via: 'car'|'flat'|'phone', lines: [...], skippable: true }`. Het afspelen hergebruikt `playTalk` (ondertitelpraat), de banter-voorwaarden (rustig moment) en `storycontact.js` voor de telefoonvariant. Geen nieuwe cutscene-engine.
- **Samen spelen.** Een overgangsscène is van wie het spel opende; een gast die meedoet ziet de ondertitels mee (zoals de banter); wie later aansluit mist alleen een zin. Geen voortgang erin.
- **Voorbeeld (na de kraak):** Auto, 's nachts. *Tessa:* "Wij staan op de camera." / *Tammo:* "Hij had hem al." / *Tessa:* "Dan moeten we hem eerst vinden." / *Tammo:* "En daarna?" / *Tessa:* "Dan winnen we het eerlijk." (De regel "eerlijk winnen" is dan de bocht naar akte 2, zonder dat Tessa alles in M07.1 hoeft uit te leggen.)

### 10.4 Jelle en Mem als eigen kanaal

Een kort, vast ritueel: na elke missie een Jelle-moment. Variatie: radio-inbel (zijn ijdelheid), een bedankkaartje met zijn J, een offerte, een rekening (zijn bureaucratie). En Mem als stem aan de telefoon in akte 2 (twee telefoontjes) in plaats van alleen stille appjes, zodat de speler Tessa's relatie met haar kent vóór M20.

---

## 11. De recap-kaart (gebouwd in deze ronde)

Zie hoofdstuk 18.2 voor de details. Kort: na Doorgaan staat er eerst een kaart "Waar waren we?" met waar het verhaal om draait (`WHY` van de akte), wat je laatst deed en het doel nu (de lead van de huidige stap), overslaanbaar en kort. Er is **geen nieuwe verhaaltekst**: de kaart kan alleen zo goed zijn als de bestaande leads en `WHY`. Een volgende stap (WP0): elke `lead` en `WHY` laten toetsen aan de ruggengraat (6 tot 7); een betere lead is dan automatisch een betere recap.

Uitbreiding (later, S): het plakjesbord (acht plakjes van Jelle) als **prop in de flat in Paddepoel** (een prikbord dat Tessa bijwerkt) en als regel op de recap-kaart. Dat vervangt de verwijderde Aanwijzingen-tab door iets in de wereld.

---

## 12. Romantische boog (hoofdlijn, zoet en komisch)

| Moment | Waar | Wat gebeurt er | Toon |
|---|---|---|---|
| 0 Het uitgangspunt | Opening | Huisgenoten "als huisgenoten, Tammo"; hij zegt "...Samen." | zachte grap |
| 1 Het signaal | M02 tot en met M06 | Tammo kijkt naar haar rode jas; "Voor de grip"; Rikus' peiling (nu pas in akte 5: vervroegen naar akte 1) | komisch |
| 2 Het eerste echte moment | M11.5/M11.6 | De Melkweg; hij kijkt naar haar, zij ziet dat hij kijkt; één regel stilte | zoet |
| 3 Het kantelpunt | M16.4 | De kus in de botsauto; daarna "Welke zaterdag?" | komisch |
| 4 De bevriezing | M17 tot en met M19 | Ze praten er niet over; de gag "Dat is ook een antwoord"; Mem's appjes (dubbele geheimen) | ongemakkelijk-komisch |
| 5 Het dieptepunt | M20.5 | "Jij zegt nooit iets!" "Jij zegt nooit iets!"; Berend telt mee | menselijk |
| 6 Het herstel | M22.4 | De knuffel; "Sorry. Dat ik nooit wat zeg." | ontroerend |
| 7 Het hoogtepunt | M26.7 | De vijf woorden, voor iedereen op de Grote Markt | ontroerend en komisch |
| 8 Het nawoord | Deel 4 | "Voor de grip", dansen op het erf | zacht |

**Wat moet er bijkomen:** (a) een scène in akte 1 waarin de speler ziet dat Tammo al lang verliefd is (het verhaal is dat ze elkaar vijf jaar kennen: een voorwerp in de flat, een bewaard kaartje van de eerste Kiezelweek); (b) Tessa's kant van de verliefdheid wordt niet uitgesproken maar gemerkt: ze bewaart zijn eerste briefje; (c) Beppe en Rikus als getuigen: één opmerking over "vijf jaar" van Rikus aan Tammo. De Beppe-boog (#1063) is hier de natuurlijke plek voor warme momenten: haar bezoek in akte 2 of 3.

---

## 13. Jelle als gezicht van de lijn

Eigenaarsbesluit: behouden en versterken. Concreet:
- **Introductie via anderen** zoals nu (Berend, Sjabbe, chat), plus een eigen "kantoorwagen" of "klomp" als herkenbaar ding in de wereld (een gele sticker USM op elk gekocht ding: bestaat al in M07).
- **Zijn persoonlijkheid in elke scène:** rijkheid (klomp), bureaucratie ("mijn juristen", "dat staat in de overeenkomst"), lengte (hij kijkt op neer; Tammo's grap "Is hij lang?"), arrogantie, en de zachte kant ("Foar mem").
- **Zichtbaar:** minimaal twee persoonlijke verschijningen of berichten per akte (nu: akte 1 en 4 bijna niets).
- **Zijn doel hardop:** een *offerte* aan het begin van elke akte ("Ik koop X voor Y"), die de inzet duidelijk maakt (de speler weet dan elke keer wat er op het spel staat).
- **Verslagen door de lijn:** de eerlijke wedstrijd wint (de beste eierbal), niet de notaris of de moeder alleen: laat Tammo en Tessa zelf iets doen op het keerpunt (M26.5).
- **De bal als verhaalhaak, niet als hoofddoel:** in akte 1 wordt de bal de *aanleiding*, vanaf akte 2 is het doel eerlijk winnen met een goede eierbal; de bal wordt teruggebracht in M26.

---

## 14. Integratie van loopbanen, bijbanen, boerderij, panden en voetbal

### 14.1 Principe: ontdekken via het verhaal

Tammo en Tessa ontdekken zelf wat bij hen past; de speler ontdekt mee. Elke wereld wordt **door een personage genoemd, in een verhaalmoment ervaren en door een aanwijzing geopend**; daarna blijft hij open. Dat is hetzelfde patroon als de Beppe-boog en de terugkeervignetten.

### 14.2 Tabel: welke wereld, in welke akte, door wie

| Wereld | Akte | Introducerend personage | Verhaalmoment | Wat het met de hoofdlijn doet |
|---|---|---|---|---|
| Klussen, Taxi, Kantoor (Loket), Padel | 1 | Tammo (rijden), Sjabbe (klussen), Sjoerd (Kiezelweek) | M02 Even pinnen, M03 Loket, M05 Kiezelrace, M06 de kraak | geld voor de inschrijving; Tammo's gave |
| Vracht, Bezorging, Buiten, Trein | 2 | Oma Trijntje, Tessa | M07 vet, M08 fatbikes, T1 trein | de ingrediënten; Tessa wil de wagen gevuld |
| Horeca | 2 | Geesje (eieren) | M09 | de eerste snacks; Tessa bakt zelf |
| **Landbouw / boerderij** | 2 | **Tessa** (ze is boerendochter) | M10 en A1 (bietenoogst), Warffum | haar kennis is het recept; de eigen boerderij is een *Tessa-wereld* |
| Vissen, Bus, Water | 2 | Kapitein Klaas | T2, M11 | het zout; Tessa en Tammo op het water |
| Lucht, Handhaving | 3 | Dijkstra, Lammert | M12, M13 | koopboek, haven |
| **Panden en ondernemen (Bezit)** | 3 | **Sjabbe** (Pand & Poen) en Lammert | M13 (havenkantoor als eerste stek) en M15/M16 | Jelle koopt panden; zij leren te beheren: de tegenhanger van zijn "kopen" |
| Kermis | 3 | Geert | M16, A2 | de eerste eigen kraam |
| **Voetbal** | 4 | Tammo regelt (naar het voetbalplan: "B1 Uitnodiging"), Tessa speelt | M19/M20 (Veendam: de dorpsclub; de boerenjongens) | Tessa's dorpsteamverleden (canon); een sportieve ster bij de afsluiting |
| Race, Podium, Golf | 5 / 6 | Tinus, Willemien, Berend | M22, M29, M30 | afronden |

**Spelersrol wisselt:** Tessa speelt boerderij en voetbal (haar werelden); Tammo speelt rijden en klussen; bij sommige activiteiten kiest de speler. `player: 'tammo' | 'anita'` bestaat al per stap (`storyarc_nieuw.js`, M21).

### 14.3 Gating en migratie (ontgrendeling per akte)

**Stand nu.** Loopbanen zijn **geen slot, maar een wijzer**: `LOOPBAAN_STAPPEN` in `storyarc.js` koppelt 19 vakken aan een verhaalstap, de speler mag eerder beginnen op een eigen startplek of via het menu, en dan geldt de stap als gedaan (`stapAfgeleidGedaan`). `profiel.gestart` houdt bij wat begonnen is. Boerderij en voetbal zijn vrij; Bezit (#1095) en de voetbalcarrière (#1106) willen volgens hun eigen plannen een gedeelde poort `zijpadPoort(id)` "na akte 1" (zie VOETBAL-CARRIERE §8).

**Ontwerp (nieuw, na het akkoord).**
- Eén zuivere functie `worldOpen(world, id, progress)` in een nieuwe module (`storygate.js`), gebaseerd op `LOOPBAAN_STAPPEN`: een wereld is open als (a) het verhaal de bijbehorende stap heeft bereikt, of (b) de speler de wereld al begonnen is (`gestart`, xp, n of uniek), of (c) de save van vóór de poort komt (migratie, hieronder), of (d) het verhaal uit is.
- Een gesloten wereld **verdwijnt niet maar wordt een zachte hint**: op de kaart een gedimde startplek met de zin van het personage dat hem introduceert ("Vraag het Sjabbe, na het Loket"); geen harde muur, zodat verkenners niet vastlopen en bots en trailerscripts (die `devJumpTo` gebruiken) niet breken.
- **Migratie-regel (bestaande spelers verliezen niets):** bij het eerste laden na de invoering krijgt elke save `gate: { v: 1, open: [alle werelden met voortgang of waarvan de stap al bereikt is, plus alle werelden die de speler al had] }`. Een save zonder `gate`-veld wordt gelezen als "alles open" tot hij is gemigreerd. Voortgang (xp, titel, geld) wordt nooit aangeraakt; alleen *beginnen* wordt beperkt. Opslag per speler (#429); de poort leest alleen de eigen voortgang, dus een gast ziet zijn eigen poort; een wereld die de host opent, opent hem niet voor de gast.
- **Samen spelen:** een gast mag een bijbaan of loopbaan alleen beginnen als hij hem zelf heeft ontgrendeld; wie later aansluit of wegvalt verliest niets (de poort schrijft alleen een verzameling `open`).
- **Tests:** puur (`storygate_test.mjs`): elke stap opent precies zijn werelden; een oude save met voortgang opent alles; een nieuw spel opent niets voor M02; devJumpTo opent tot de stap; geen voortgang verloren; geen verandering in `gde-save-v1`-sleutels.
- **Risico:** spelers die buiten het verhaal begonnen zijn (de open wereld sinds 0.4x) verliezen niets, maar zien bij een *nieuw spel* minder. Dat is het bedoelde effect.

---

## 15. Missies die herschreven moeten worden naar de lijn

Alleen de aanleiding en de koppeling wijzigen; de speelmechaniek blijft.

| Missie | Probleem | Voorstel |
|---|---|---|
| M07 Al het vet | Doelverschuiving zonder aankondiging; Tessa legt uit | Aanleiding in de overgangsscène na de kraak ("eerlijk winnen"); Jelle belt zelf over "zijn" vet |
| M08 Fatbikes | Oma's monoloog is de doelverandering | Oma's recept in drie beurten; het prikbord in de flat toont de vijf vrienden vooraf |
| M11.3 Chocola | De oefenbal verwart | schrappen of vervangen door "een briefje van Mem" (Mem krijgt een stem) |
| M12 en M13 | Tessa legt uit | Jelle zelf legt zijn koopboek uit (radio of scène); Tammo en Tessa reageren |
| M16.1 Geert | Uit de lucht, jaloezie voor het eerst | Geert wordt eerst via Tessa of Roelfien genoemd; de jaloerse grap wordt een signaal van de boog (hoofdstuk 12) |
| M17.1 Wubbo | Wubbo's intro wordt onderbroken door "Even over zaterdag" | het zaterdag-moment naar de overgangsscène ervoor |
| M18 Wiebelwerk | het bewijs heeft geen aanleiding | in M17 of M19 zegt iemand "ze zeggen dat jullie de dieven zijn" (Berend of Rikus) |
| M19 Stoom | Tessa legt de juryregel uit | de juryregel komt in drie beurten, met Berend |
| M21.4 de vrienden | rollenlijst | één gesprek met één ruzie tussen twee vrienden en Tammo's falen |
| M26.2 en M26.6 | wedstrijdregels als toespraak | Berend in twee korte beurten met Tessa en Rikus als reactie |
| E2 Epiloog | opsomming | splitsen: Rikus en twee korte beurten van Tammo en Tessa (een foto, een bord) |
| Deel 4 | los van de lijn | koppeling aan de wagen en aan Jelle (hij bestelt een eierbal); M30 opent de werelden |

---

## 16. Stemmen: aantallen (aanname)

| Onderdeel | Nieuwe regels | Gewijzigde regels (opnieuw opnemen) |
|---|---|---|
| Canon (4 regels, andere agent, al in `voice_wacht.json`) | 0 | 4 |
| Akte 1 (opening beter, introducties, Rikus en Oma aanloop, regel van de bal) | 35 | 20 |
| Akte 2 (Oma's recept in drie beurten, Mem als stem, Tessa en de boerderij) | 40 | 25 |
| Akte 3 (Jelle zelf, panden, Geert aanloop, romantiek) | 30 | 20 |
| Akte 4 (Jelle zichtbaar, Mem's aanloop, M21.4, het bewijs) | 35 | 25 |
| Akte 5 (finale kort, regels, epiloog gesplitst) | 20 | 20 |
| Deel 4 (koppelingen) | 10 | 10 |
| Overgangsscènes en telefoontjes (12 tot 14 scènes x 4 tot 6 regels) | 60 | 0 |
| **Totaal** | **ca. 230** | **ca. 125** |

Totaal ongeveer **350 regels** (bandbreedte 300 tot 420). De manifestlijst `scripts/voice_wacht.json` is de plek; een TTS-ronde neemt ze op (geen TTS in deze ronde). Tot de opname staan de regels als `textOnly` en blijven de scènes spelen. Tammo's stemtag blijft ongewijzigd.

---

## 17. Uitvoeringsplan: werkpakketten

Kosten: S = een halve dag, M = een dag, L = meerdere dagen (incl. test). Volgorde is een voorstel; alles na WP0 wacht op akkoord van de eigenaar.

| WP | Inhoud | Kosten | Afhankelijk van | Voice-regels | Tests |
|---|---|---|---|---|---|
| **WP0** Ruggengraat en toets | Ruggengraat per akte in `docs/verhaal/RUGGENGRAAT.md`; `dialoog_ritme_test.mjs` en `introductie_test.mjs` (elk personage heeft een aanloop of een naamkaart); `lead` en `WHY` per stap opnieuw toetsen | S | dit document | 0 | de twee nieuwe tests |
| **WP1** Akte 1 | Opening laten zien (motief), Rikus en Oma aanloop, één spelregel voor de bal, Henk aanloop, een romantisch signaal, een prop in de flat | M | WP0 | ca. 55 | `akte1_test`, banter, `recapcard_test` |
| **WP2** Overgangsscène-systeem | `bridges` in `storyarc_nieuw.js`, `storybridge.js` (afspelen via `playTalk`), stop bij een missie, overslaan, Samen spelen | M | WP0 | 0 | `bridges_test.mjs` |
| **WP3** Akte 2 | Oma's recept in drie beurten, Mem als stem, Tessa en Warffum (haar thuis), M11.3 weg, het prikbord, boerderijintro | L | WP1, WP2 | ca. 65 | `akte2_doelen_test` |
| **WP4** Akte 3 | Jelle in persoon, Geert/Dijkstra aanloop, Sjabbe en Bezit-introductie, Tessa legt minder uit | L | WP3 | ca. 50 | `akte3` testen |
| **WP5** Akte 4 | Jelle zichtbaar, Mem's aanloop en stem, het bewijs, M21.4, voetbal-aanloop | L | WP4 | ca. 60 | `akte4_test` |
| **WP6** Akte 5 en epiloog | Finale kort en helder, epiloog gesplitst, hoogtepunt van de romantiek, het succes van de wagen | M | WP5 | ca. 40 | `akte5_test` |
| **WP7** Deel 4 en de wereld | Willemien aan de lijn koppelen, M30 als opening naar de open wereld | S | WP6 | ca. 20 | `akte6_test` |
| **WP8** Gating en migratie | `storygate.js`, kaart- en menugevolgen, migratieregel, tests | L | WP0, ontwerp-akkoord | 0 | `storygate_test.mjs`, savemigratietest |
| **WP9** Beeld en test | Electron-verhaaltest met de nieuwe scènes, recapkaart in beeld, overgangsscènes in beeld | M | alles | 0 | Electron-verhaaltest, beeldrun |
| **WP10** Stemmen | `voice_wacht.json` vullen, TTS-ronde, `voice_coverage` | M | WP1 tot en met WP7 | ca. 350 | `voice_coverage` |

**Risico's.**
- **Stemmen opnieuw opnemen** (ca. 350 regels) kost een TTS-ronde en kan stemverschuiving geven; de canonregels (4) zijn al gepland. Tot de opname staan ze textOnly.
- **Dubbel werk met de canon-agent:** de leeftijdsregels (M08.3, T1, M26.7) liggen bij hem; ik raak ze niet aan (zie `docs/VERHAALCANON-21-11.md`).
- **Balans:** een gedimde startplek kan de open wereld leger laten lijken; test op beginners en op de spelbot (WP8).
- **Doorgaande scripts en trailer:** de trailerscripts en `devJumpTo` mogen de poort nooit tegenhouden (dev-vlag).
- **Lengte:** de eigenaar wil niet langer, tenzij met leuke nieuwe dingen. Dit plan voegt netto ongeveer 12 korte overgangsscènes (samen ca. 4 minuten) en nieuwe ontdekmomenten toe en schrapt of kort in: de dubbele spelregel, M11.3, de rollenlijst in M21.4, de lange uitleg in de intro's en de epiloogopsomming.
- **Tests voor beats:** een `bridges_test` en de nieuwe ritme- en introductietests voorkomen dat de lijn weer verslapt.
- **Gevoelig onderwerp (Deel 4):** gaswinning en versterking blijven zorgvuldig (verzonnen bedrijf Delfstof Noord, geen echt slachtoffer als grap).

---

## 18. Wat er in deze ronde gebeurd is

### 18.1 Aanwijzingen en hints uit het pauzemenu

Verwijderd uit de interface (de data blijft; andere systemen gebruiken ze):
- Het tabblad **Verhaal > Aanwijzingen** (`pausemenu.js`: `SUBTABS.verhaal`, de sectie in de HTML, de badge "nieuw" op het tabblad, `markCluesSeen` bij sluiten en tabwissel).
- De opmaak en de lijst van Aanwijzingen **inclusief het plakjesbord** (`verhaalui.js`: `cluesHtml`, `plakjesHtml`, `partOrder`, de bijbehorende CSS); het plakjesbord als module (`game/js/plakjes.js`) blijft staan, want het wordt door tests en `getStoryJournal` gebruikt, en komt terug als prop in de flat (hoofdstuk 11).
- Het blokje **"Wat weten we?"** per hoofdstuk bij de opdrachten (`todoui.js`) en de telling "aanwijzingen te vinden" in de ondertitel van het scherm.
- De **kaart "Aanwijzingen" bij Spullen** (`spullen.js`); het 3D-model `aanwijzing` in `spullen3d.js` blijft als ongebruikt actief.
- De tekst in de rail ("Opdrachten, personages en berichten") en de uitleg onder de instelling Terugkeerscène.

Blijft: **Instellingen > Hints & uitleg** (toetshints en uitlegkaarten), want dat zijn bedieningshints, geen verhaalhints; de **"Waar het om draait"** per hoofdstuk bij de opdrachten; `CLUES` en `getStoryJournal` (het dagboek en de prestatietellers; de aanwijzingentellers in de tests blijven).

Tests aangepast: `spelmenu_test` (SUBTABS, geen `cluesHtml`, folds), `loopbaan_test`, `personages_test` (de plakjeskleuren), `verhaalopdrachten_test` (geen "Wat weten we?"). Draaien groen waar ze in deze omgeving kunnen (`todo_ui_test`, `storyclarity_test`, `terugkeer_test`, `naamtaal_test`, `spec_check`, `text_audit`); de tests die `three` nodig hebben (`verhaalopdrachten_test`, `akte2_doelen_test`, `akte4_test`, `akte6_test`) konden hier niet lopen (niet gevendord); de aanpassing aan `verhaalopdrachten_test` is alleen statisch gecontroleerd.

Bestaande opgeslagen keuze: een eerder geopend tabblad Aanwijzingen valt terug op Opdrachten. Geen savegame of voortgang veranderd.

### 18.2 De recap-kaart "Waar waren we?"

- **Pure module** `game/js/recapcard.js`: de inhoud (deel, waar het om draait, laatst gedaan, nu), de woordgrens (48 woorden: de lead wordt tot zijn eerste zin ingekort, daarna valt "waar het om draait" weg), de voorwaarden (`recapBlockers`) en de opslag per apparaat.
- **Het tonen** `game/js/recapcardrun.js` (DS3-kaart in de stijl van het hulpaanbod, `#recapkaart`), `game/js/recapstate.js` (lichte leaf zodat `phone.js` en het pauzemenu de wereldpauze en Escape respecteren) en een hook in `main.js` (`updateRecap`, vóór de terugkeerscène).
- **Wanneer:** na elke Doorgaan (een geladen opgeslagen spel) bij een lopende verhaalstap; wacht op een rustig moment (0,6 s, na de vliegende start-film, niet in een missie, een film, een menu, een activiteit of een duifstand); geeft na 20 s op.
- **Sluiten:** Enter, Esc, spatie, Backspace of een klik; sluit zichzelf na 14 s; de wereld staat stil zolang de kaart open is (`uiPaused`) en gaat daarna verder.
- **Herhaling:** dezelfde stap binnen tien minuten na de vorige kaart: niet nog eens (sleutel `gde-recap-v1`, `{ v, stap, om }`, per apparaat, nooit in de savegame).
- **Samen spelen:** lokaal; alleen bij alleen spelen (een spel laden kan niet in een sessie), een gast en een lopende sessie slaan hem over; niets over het net, niets in de voortgang (#429).
- **Instelling:** volgt Terugkeerscène (de uitleg is aangepast); de terugkeerscène wacht tot de kaart dicht is.
- **Test:** `scripts/recapcard_test.mjs` (52 asserties: inhoud, lengte op alle echte stappen, voorwaarden, opslag, bedrading). Niet in Electron of een browser bekeken: **nog niet bekeken**.
- **Naamtaal en spec:** `naamtaal_check` stil voor de nieuwe bestanden; `spec_check` 0 fouten.

### 18.3 Issues

Zie hoofdstuk 19.

---

## 19. Issues

Aangemaakt op GitHub met label `wens`, `impact-hoog` en een kostenlabel, in de mijlpaal "Verhaal: rode draad, introducties en natuurlijke dialogen" (zie de lijst onderaan dit document na het aanmaken).

---

## 20. Tweede golf besluiten (frietwagen als bedrijf, eindbaas, regie, overlap, reputatie, parallel werken)

### 20.1 De frietwagen als thuisbasis en bedrijf

De Fjord Frituur is niet alleen een doel, maar vanaf de eerste echte rit een **mobiel hoofdkwartier**: upgraden, het menu samenstellen, op locaties staan, klanten bedienen, omzet. Dat past bij de Bezit-epic (#1095, productieketen: boerderij naar eigen winkel). Verhaalkoppeling per akte (de wagen groeit mee met de lijn):

| Akte | De wagen is... | Waar het in het spel zit |
|---|---|---|
| 1 | een naam, een tekening en een auto met een lekke band (de Escapade) | prop in de flat; Tammo repareert de band (rijden) |
| 2 | een recept: wat staat er op het menu (Oma's recept) | menu-keuze: de vijf ingrediënten bepalen het eerste menu |
| 3 | een stek: waar staat hij (Lammerts kade, de kermis) | eerste locatie; de eerste omzet op de kermis |
| 4 | een team: wie werkt eraan (Berend, Tinus, Wubbo helpen) | de vrienden als personeel/hulp (koppeling aan "AI-personeel" uit Bezit) |
| 5 | een luik en een standplaats (M22, M26) | de standplaats op de Vismarkt |
| Deel 4 en daarna | een bedrijf dat groeit | keten in Bezit: tweede wagen, pand, boerderij als leverancier |

De **verhaalstappen leveren alleen mijlpalen** (flags `wagen:naam`, `wagen:menu`, `wagen:stek`, `wagen:team`, `wagen:standplaats`); de eigenlijke bedrijfsmechaniek (upgrades, omzet, locaties) hoort bij de Bezit-epic en leest die flags. Zo blokkeren de twee werkstromen elkaar niet.

### 20.2 Jelle als terugkerende rivaal en eindbaas

Zijn rol groeit van lastige rivaal (akte 1) naar eindbaas (laatste akte), niet via geweld maar via **bureaucratie en vette snacks**:
- **Sabotage per akte** (zoals nu: wegen en bruggen kopen, de fanfare, de kade), maar telkens met één zichtbare handlanger (Durk en Douwe, zijn accountmanager, een deurwaarder) in plaats van alleen een telefoontje.
- **Panden opkopen** wordt in de Bezit-spiegel een speelbare tegenstander: elk gekocht pand is een plakje dat de speler terug kan kopen of omzeilen (koppeling plakjesbord, hoofdstuk 11 en 14).
- **Verslaan in de laatste akte** met zijn eigen wapens: een vergunning die hij zelf heeft ondertekend, een formulier in drievoud, en de beste eierbal. De eindbaasscène is de finale (M26) met de volgende verhoging: Tammo en Tessa laten zijn contract voor zich werken (de notaris, het Loket), geen geweld.
- **Constitutie:** satire, geen leed; Jelle blijft nooit gemeen en wordt nooit echt kwetsbaar behalve door zijn moeder.

### 20.3 Romantiek via verhaalmomenten en kleine keuzes

Geen dating-sim, geen punten. Wel **drie tot vijf kleine keuzes in gesprekken en samen-uitjes** die de toon van een scène veranderen, niet het verloop: bijvoorbeeld bij de Melkweg (M11.6) kiest de speler of Tammo naar haar of naar de sterren kijkt; bij de rit naar Zoutkamp of hij zijn jas aanbiedt; in de flat of hij het kaartje van de eerste Kiezelweek laat liggen of verstopt. Elke keuze zet één stil flag (`romantiek:*`) dat later alleen **een andere regel of een andere blik** oplevert (nooit een ander einde). Een samen-uitje is een optionele korte activiteit (een ritje, een patatje, de sterren) die door de terugkeervignetten en de overgangsscènes wordt aangekondigd. Tests: een flag verandert nooit de voortgang; het einde is altijd hetzelfde.

### 20.4 Endgame: ondernemen als sandbox

Na Deel 4 is er geen verhaaleinde meer maar een open endgame: Bezit, boerderij, voetbalcarrière en frietwagenketen. Het verhaal levert alleen de **overgang** (M30 als uitnodiging, Rikus' uitzending als samenvatting) en blijft daarna stil. Er komt géén nieuwe hoofdlijn; de tegenstander van de endgame is Jelles imperium (hij blijft panden kopen) en de uitdagingen zijn die van de epics.

### 20.5 Parallel werken: de verbindingspunten

Verhaal, Bezit en voetbal draaien tegelijk. Om elkaar niet te blokkeren spreken we vier **vaste verbindingspunten** af; elke werkstroom mag zelfstandig doorlopen zolang hij zich daaraan houdt.

| Verbinding | Wie levert | Wie gebruikt | Afspraak |
|---|---|---|---|
| Verhaalstap-flags (`wagen:*`, `romantiek:*`, `wereld:*`) | verhaal | Bezit, voetbal, gating | alleen toevoegen, nooit hernoemen; tests in elke werkstroom lezen alleen |
| Poort `worldOpen(world, id)` (WP8) | verhaal | Bezit, voetbal, loopbanen | één poort (de gedeelde `zijpadPoort` uit het voetbalplan wordt deze); elke epic registreert zijn wereld-id en stap |
| Overgangsscènes (`bridges`, WP2) | verhaal | Bezit, voetbal | elke epic levert zijn eigen beats als data (zelfde schema); één wachtrij, nooit twee tegelijk |
| Reputatie (`reputation.js`, hieronder) | losse werkstroom | iedereen | alleen lezen via `reputationOf(player, scope)`, schrijven via `noteReputation` |

**Overlap in de planning:** WP0, WP1 (akte 1) en WP2 (overgangsscènes) kunnen tegelijk met Bezit en voetbal lopen. WP8 (poort) hoort eerst met beide epics afgestemd te worden (open vraag 5). Er is geen WP dat een Bezit- of voetbalwerkpakket blokkeert: de verhaalpakketten raken `storyarc_nieuw.js` en de script-data, de epics raken hun eigen modules.

### 20.6 Regie: meer camera en emotie in de sleutelscènes

Sleutelscènes krijgen meer regie (close-ups, gebaren, reactieshots), routinescènes blijven licht. Aanbevolen sleutelscènes (ca. 10): de opening (de keuken), de eerste ontmoeting met Jelle (Loket), de lege vitrine, de sloot (Jelle), de Melkweg, de kus, de kruitkelder (Mem), de ruzie, de knuffel, de vijf woorden. Hergebruik: `cutscripts` met de regie-velden (`regie:` in de scripts), `cineshots.js` (pan-budget), `playScript`, de gebaren in `cutscenes_akte2.js` (`on: 'Ik ben vierentwintig'`) en `akte34_beats.js` (een openingsbeeld per stap). Per sleutelscène een korte **regieregel** in het script ("Close-up op Tammo's hand; Tessa kijkt weg") en een reactieshot na elke zin die ertoe doet. Kosten: M per akte als regie-aanvulling op de scènes die er toch al worden aangepast; geen nieuwe engine.

### 20.7 Overlappende reacties, onderbrekingen en stiltes: wat de pijplijn nodig heeft

**Gecontroleerd in de code:**
- Het gesproken kanaal is **één kanaal** (`game/js/speech.js`: "one line at a time ... so two voices never overlap"); een nieuwe regel van dezelfde conversatie wacht tot de vorige klaar is. Ondertitels zijn één regel tegelijk (`setDualText`, `storytalk.js`). Elke regel is een **aparte clip** (`lineVoiceFor`), dus in principe is de afspeeltijd per regel bekend.
- Cutscenes zijn al getimed (`at`, `dur` per regel, `resolveTime` in `cutscript.js`): een gebaar, close-up of stilte kan daar al. Alleen de **stem** kan niet overlappen.

**Voorstel (WP11, M):** een lichte, achterwaarts compatibele uitbreiding met drie tags per regel in `script.json`:
- `ov: 0.3` (overlap): de volgende clip start 0,3 s vóór het einde van de vorige (kort, een reactie of "Ja, maar..."), op een tweede, zacht kanaal; de ondertitel toont de reactie naast de vorige regel (twee regels tegelijk, de tweede kleiner).
- `cut: 1.4` (onderbreking): de vorige clip wordt na 1,4 s afgekapt met een korte fade (80 ms) en de regel eindigt met "..." in de ondertitel; geen nieuwe opname nodig, alleen een tag.
- `pause: 0.8` (stilte): zoveel seconden stilte vóór de volgende regel (nu is het een vaste standaardpauze).
Zonder tags verandert niets. Tests: `speech_test.mjs` (geen drie stemmen tegelijk; overlap alleen binnen één conversatie) en een nieuwe `dialoogvorm_test.mjs`. Risico: de overlap kan clips met "Hè..." van Durk en Douwe laten klinken als een bug; daarom alleen waar het script het vraagt (nieuwe regels en de kernscènes).

### 20.8 Lichte reputatie

Ontwerp (kost M, los werkpakket, geen verhaalblokkade):

| Variabele | Bereik | Stijgt door | Daalt door | Waar het terugkomt |
|---|---|---|---|---|
| `fame` (bekendheid van de frietwagen) | 0 tot 100 | klanten bedienen, een goede dag, een viral Kiekdoar-filmpje | een slechte dag, een ramp met de wagen | NPC's herkennen je ("Jij bent van de Fjord"); de rij op de Vismarkt; hogere prijzen |
| `kind` (je gedrag naar mensen) | -50 tot 50 | helpen, een klus afmaken, geven | een overval, een ongeluk, wegrijden | een andere regel in een bijrol; sommige buurten groeten of kijken weg |
| `buurt:<naam>` (per buurt, lichte laag) | -20 tot 20 | wat je daar deed | wat je daar sloopte | lichte variatie in teksten en prijzen in die buurt |

- **Opslag:** een eigen sleutel `gde-reputatie-v1` per apparaat of per speler-profiel (#429), nooit in de savegame, nooit over het net; een gast heeft zijn eigen reputatie.
- **Waar het in het verhaal terugkomt:** alleen als **kleur**, nooit als slot: een bijpersoon zegt een andere zin, een prijs is 5% anders, een rij is langer. Jelle spiegelt de reputatie ("Uw wagen heeft een goede naam. Dat is jammer voor mij").
- **Constitutie:** reputatie is satire en geen oordeel over echte personen of leed; een ramp is een komische misser (een kar om, een frietpan in brand zonder gewonden).

### 20.9 Bijgewerkte werkpakketten

| WP | Inhoud | Kosten | Notitie |
|---|---|---|---|
| WP11 | Dialoogvorm: `ov`, `cut`, `pause` in `script.json` en de afspeelpijplijn (zie 20.7) | M | achterwaarts compatibel, nieuwe test |
| WP12 | Reputatie (`reputation.js`, opslag, lees-API, regel-variatie) | M | los; raakt het verhaal alleen met kleur |
| WP13 | Frietwagen-mijlpalen (`wagen:*` flags) en de koppeling met Bezit | S | het verhaal levert flags, Bezit de mechaniek |
| WP14 | Romantiek: 3 tot 5 keuzes en samen-uitjes (kleine data per scène) | S | stil flag, geen ander einde |
| WP15 | Regie-aanvulling per akte (sleutelscènes) | M per akte | hergebruik, geen nieuwe engine |
| WP16 | Eindbaas-opbouw: handlangers per akte, het panden-plakje, de finale als bureaucratische ontknoping | M | samen met WP4 tot WP6 |

---

## 21. Open vragen voor de eigenaar

1. **Het plakjesbord als prop in de flat** (de Aanwijzingen-tab is weg): akkoord om hem als zichtbaar prikbord terug te laten komen, of liever helemaal niet?
2. **De bal in akte 1:** akkoord om de spelregel te versimpelen tot één zin ("wie de bal heeft, zit de jury voor") en de rest later per scène te onthullen?
3. **Mem als stem in akte 2** (twee telefoontjes) in plaats van alleen stille appjes: akkoord?
4. **Gating als zachte hint** (gedimde startplek met een zin van een personage) in plaats van een harde muur: akkoord, of echt dicht?
5. **Voetbal in akte 4 (Veendam)** in plaats van "na akte 1" uit het voetbalplan: akkoord, en daarmee de gedeelde poort (`zijpadPoort`) afstemmen met Bezit en de Beppe-boog?
6. **Deel 4** koppelen aan de wagen (Willemien als klant): akkoord, of blijft het een los, stil verhaal?
7. **Rikus als jeugdvriend** laten horen in een korte scène met Tammo in akte 1: akkoord (één kleine nieuwe scène)?
8. De drie getalfouten of canonvragen die al bij de andere agent liggen (leeftijden, "vijf jaar") blijven daar; ik wijzig ze niet.
