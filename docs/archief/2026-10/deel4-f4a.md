> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/verhaal.md` (Deel 4 vóór de herschrijving).
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Deel 4 · F4a: Stad, Hogeland en Eemsdelta

Productiescript voor inhoudsdrop **F4a** van Deel 4 "Nazomer" (de Ommelander Ronde), oktober 2026. Hoort bij [PROVINCIE-VERHAAL.md](../PROVINCIE-VERHAAL.md) (§2-§5, §9) en [PROVINCIE-PLAN.md](../PROVINCIE-PLAN.md) (§3, de F1-corridor Stad → Delfzijl → Eemshaven). Alleen tekst: er is nog geen code, en de provinciekaart wordt nog gebouwd.

**Wat erin staat**
- het kader van Deel 4 voor zover F4a het nodig heeft: de deelkaart, de recap, de eerste ring, de regels voor geld, bezit en overslaan (§1);
- de nieuwe personages met naamkaart, stem en kleur, en hoe we botsende namen oplossen (§2);
- de hoofdmissies **O1-O10** en de verhaalstappen ertussen, elk met route, verloop, falen/overslaan, cutscènes met cameranotities, alle dialoog, telefoon en radio, HUD-doelen, afrondingskaart en autogesprekken (§3);
- de zijreeksen **De Piepjager (Z1-Z4)**, **Loods Klaas (Z5-Z8)** en **Scheuren (Z26-Z28, alleen met een "ja" van de eigenaar)** (§4);
- activiteiten en bijbanen, met de nieuwe wensen van de eigenaar: **machinist** (mini-game én bijbaan) en **passagier**, **buschauffeur** in het Ommeland, **brommer met versnellingen en motor**, **vrachtwagenritten naar Eemshaven en Delfzijl**, **driftplekken** en een **grensgrap** met de Friese neven van Durk en Douwe (§5);
- toevallige ontmoetingen en events (§6), herkenningspunten en geheimen (§7), Nachtstreek;
- continuïteit en gevoelige onderwerpen (§9), echte plekken om te verifiëren (§10);
- een **data-bijlage** in de vorm van de bestaande code (§11) en de tellingen (§12).

**Vaste regels voor dit script**
- **Altijd zomer.** Deel 4 speelt in de nazomer, half september, en blijft zomer: geen herfst, geen winter, geen sneeuw, geen eerste vorst. Geen Koningsdag. Events alleen uit de zomer: kermis, oogst, havendag. (De plan-items carbid A21 en natuurijs A32 vallen buiten F4a en botsen met deze regel; zie §9.)
- **Deel 1-3 blijven zoals ze zijn.** Deel 4 begint na de epiloog.
- Droog en Gronings, 18+ zoals nu. Geen echte levende personen, geen echte merken of bedrijven (alles verzonnen: Oldenhuis Bakt, de Wolkenhal, de Noorderterminal, Brommer & Bougie, Transport Wierda). Plaatsen en gebouwen met hun echte naam.
- Gaswinning en aardbevingen alleen als stille, respectvolle zijlijn (§9). Ter Apel komt in F4a niet voor, ook niet als woord. Het is **Grunn**, nooit "de Grunn".
- Spelerstekst alleen Nederlands. De stemmen spreken Gronings (`scripts/gronings_spoken.json`), de ondertitels zijn Nederlands; Friese regels krijgen een Nederlandse ondertitel (`FY`), regels die al in het Gronings op het scherm staan een `GRO`-ondertitel.
- **Missieregels:** overslaan kan pas na één poging; geld blokkeert nooit iets; een voertuig is alleen van jou als je het gekocht hebt (geleende trekkers, combines, boten en auto's gaan terug via `handBack`).

**Zo lees je de dialoog.** `- **Spreker** *(tag)*: tekst`. De tag is de TTS-toon (`speech_metadata.style`), in het Nederlands zoals in storyarc.js; bij autogesprekken in het Engels zoals in banterlines.js. Tessa heet in de code `anita` / `A` / spreker `Anita` (zo staat het in de bestaande code); in het script staat "Tessa". `Rikus (verteller)` is `V`. Tussen haakjes achter een regel: de Nederlandse ondertitel van een Groningse of Friese regel. `[camera: …]`, `[naamkaart]` en `[clue]` zijn regelopties zoals in missionstory.js.

**Hoe het gemaakt is.** De regels, de code in §11 en de Groningse spreektabel komen uit één bron, zodat ze letterlijk gelijk zijn. De Groningse uitspraak volgt de spelling van de bestaande tabel (2.508 regels); die eerste versie is net zo gemaakt en moet net zo nagelezen worden door iemand die Gronings spreekt.


## 1. Het kader: Deel 4 tot en met de eerste ring

**De deelkaart.** `PARTS.nazomer`: "Deel 4: Nazomer", ondertitel "De Ommelander Ronde", datumkaart **"Deel 4 · 15 september"**. De epiloog van Deel 3 speelt "een paar weken later" in september; Deel 4 begint daarna, nog in de zomer (de terrassen staan buiten, het graan wordt binnengehaald).

**Kalender van F4a (speldagen, allemaal nazomer; de enige bron is [KALENDER.md](KALENDER.md), Deel 4):**
| Dag | Weekdag | Wat |
|---|---|---|
| 33 | di 15 sept | O1 (Vismarkt, A7, ochtend), 's nachts Ubbo op Nachtstreek |
| 34 | wo 16 sept | O2 (vroege trein naar Warffum), O3 |
| 35 | do 17 sept | O4 (late middag), `n-trekkertrek` (optioneel) |
| 36 | vr 18 sept | O5, het tuinfeest in de Menkemaborg (avond) |
| 37 | za 19 sept | O6, **voorronde Hogeland** op de kermis in Uithuizen (middag), `n-warffum` |
| 38 | zo 20 sept | Eemsdelta: `n-delfzijl`, O7 (schemer), O8 (nacht) |
| 39 | ma 21 sept | O9 (een zomerstorm, de laatste van het seizoen; nacht) |
| 40 | di 22 sept | O10, **voorronde Eemsdelta** in Appingedam (de laatste zomerdag), `n-woonschip` |

De volgorde tussen de twee regio's is vrij (hieronder), maar de dagen staan vast
op de standaardvolgorde (Hogeland eerst): een stap speelt op zijn eigen dag of
later (KALENDER.md). 15 september 2026 is een **dinsdag**, 19 en 22 september
zijn za en di; 20 en 27 september zijn zondagen. Het weer staat op "nazomer":
lange gouden avonden, af en toe een bui, één storm in O9, ochtendnevel boven
het land (geen herfstkleuren).

**"Eerder in GDE" (recap aan het begin van Deel 4; plekken: studio, Groninger Museum, Vismarkt, studio)**

- **Rikus (verteller)** *(warm, vertellend, als nacht-dj op de radio)*: Eerder in GDE. Twee Stadjers, één gouden eierbal, en een Fries die hem wilde winnen voor zijn moeder.
- **Rikus (verteller)** *(droog, met een knipoog)*: De Gouden Eierbal staat weer in het museum. Met twee namen op het bordje.
- **Rikus (verteller)** *(warm, vertellend)*: Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs.
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Het is half september. Nazomer. De terrassen staan nog buiten, en de rij ook.

**"Wordt vervolgd"-kaart na de eerste ring**

- **Tessa** *(vastberaden, zacht)*: Twee voorrondes. Nog vijf.
- **Tammo** *(droog, warm)*: Of we gaan naar huis. Dan zijn het er nul.


**De eerste ring (vrije volgorde).** Na O2 zijn het **Hogeland** en de **Eemsdelta** open. `STEPS` is in de code een lijst; daarom krijgen de stappen de nieuwe velden `ring: 1` en `region`, en biedt story.js na O2 twee leads tegelijk aan (Geesje en Lammert, allebei op de kaart en in de telefoon). Binnen een regio liggen de stappen vast. Wie een regio afmaakt, krijgt de leads van de andere. Alle regels zijn **volgorde-neutraal** geschreven: geen enkele regel in de Eemsdelta verwijst naar het Hogeland of andersom, behalve de autogesprekken met `needs`, en het slot (Nachtstreek na de tweede voorronde) zegt alleen "twee".

**Ontgrendelen.** O1 opent Deel 4 na `storyFreePlay`. O2 opent ring 1 (Hogeland en Eemsdelta; de kaartmist langs het spoor gaat weg). Twee gewonnen voorrondes (O6 en O10) openen ring 2; omdat F4b nog niet gebouwd is, stopt het verhaal daar op de "Wordt vervolgd"-kaart. Een regio "op slot" heeft geen missies, wel landschap en activiteiten.

**Geld.** Beloningen lopen van € 800 (O2) tot € 3.000 (O10); geen enkele stap kost geld (de eieren in O6 betaalt "Trijntje, in 1953"; het treinkaartje mag zwart). Koopbare extra's (een eigen trekker, een brommer, een motor) zijn `optional` en staan buiten de geldtijdlijn. `storytest.js` krijgt het doel: met `payShare` 0,5 en niets kopen komt niemand vast te zitten.

**Overslaan.** Pas na één mislukte poging (zoals nu). Elke missie zegt hieronder waar je na het overslaan staat. Verhaalstappen (O2, de tussendoor-stappen) kunnen niet mislukken; de treinrit is altijd over te slaan met Spatie.

**Bezit.** Alleen wat je koopt, wordt van jou. De Fjord Frituur (de Escapade met het luik) is van Tammo en Tessa; de auto van Rikus, Jakobs trekker en combine, Lammerts bootje en de quad van Harm-Jans neef gaan terug. Een eigen boot krijg je pas bij het woonschip (een safehouse, geen missiebuit).

**Rubrieken op Nachtstreek in F4a.** "Bel Rikus" opent elke missie; Rikus zit vaak "op tournee" in zijn busje (de prop van het wereldeinde "Het busje van Rikus"). Nieuw: de **melders** (de kosteres en de sluiswachter zijn familie van de torenwachter: "Iedereen die hoog zit of bij het water, is familie") en de peiling **"Groeien of thuis?"**, die "Woist ja wel?" opvolgt.

## 2. Nieuwe personages in F4a

Naamkaarten (`CHARACTERS` in storyarc.js, getoond door namecard.js), stemmen (Gemini 3.8 via de bestaande pijplijn; er zijn maar twee ongebruikte stemmen over, dus hergebruik met een "nooit in dezelfde scène"-regel) en sprekerskleuren (luminantie gecontroleerd op 0,18-0,30, zie `speakers.js`).

| Sleutel | Naam | Naamkaart | Stem | Kleur (lum.) | Let op |
|---|---|---|---|---|---|
| `ubbo` | Ubbo Oldenhuis | Patatbaron. Veenkoloniaal. Heeft een snackbar in elk dorp, en een vriend in elke jury. | Zubenelgenubi | `#b0702a` (0.21) | Geert (kroegbaas, Deel 2) speelt niet in Deel 4 |
| `geesje` | Kosteres Geesje | Vierentachtig. Kosteres op een wierde. Ziet alles vanaf de toren. | Aoede | `#9a6fb8` (0.22) | nieuwe stem |
| `eppo` | Eppo Bolt | De Mestkoning. Alle machines van het Hogeland. Behalve één fiets. | Achird | `#7f8f2f` (0.24) | Rotor Roelf en de verkeersinformatie: niet in dezelfde scène |
| `lammert` | Sluiswachter Lammert | Eenennegentig. Doet de deuren dicht. Op tijd. | Charon | `#4f7f9a` (0.19) | Berend Bos (Charon): nooit in dezelfde scène (let op O32) |
| `siebrand` | Siebrand Mulder | Havenbaas. Alles is openbaar, tot hij het koopt. | Umbriel | `#5d6f86` (0.15) | Sjoerd en de tweede Kiekdoar-stem |
| `jakob` | Kroegbaas Jakob | (geen naamkaart: bijrol) | Sadachbia | `#a0743f` (0.20) | Dokter Dijkstra speelt niet in F4a |
| `slager` | Slager Ruurd | (geen naamkaart: bijrol) | Sadaltager | `#8a8a8a` (0.25) |  |
| `hennie` | Kermisbaas Hennie | (geen naamkaart: bijrol) | Alnilam | `#8a8a8a` (0.25) |  |
| `harmjan` | Harm-Jan | De Piepjager. Zoekt Vikinggoud. Vindt kroonkurken. | Puck | `#3f8f73` (0.22) | Jelmer speelt niet in F4a |
| `lubbert` | Handelaar Lubbert | (geen naamkaart: bijrol) | Rasalgethi | `#8a8a8a` (0.25) |  |
| `sikko` | Boer Sikko | (geen naamkaart: bijrol) | Enceladus | `#8a8a8a` (0.25) | Kapitein Klaas (Enceladus): Sikko alleen in de Piepjager-reeks |
| `willemien` | Willemien | Oma's achternicht. Woont in Loppersum. Wacht al een tijdje. | Laomedeia | `#c06a5a` (0.22) | nieuwe stem |
| `jantina` | Machinist Jantina | Veertig jaar op de lijn. Remt nooit te laat. | Vindemiatrix | `#3b8d8d` (0.22) | Oma Geessien (bankje) is een wereldeinde-figuur |
| `okke` | Conducteur Okke | (geen naamkaart: bijrol) | Sadaltager | `#8a8a8a` (0.25) | Henk: alleen aan de telefoon, nooit samen |
| `omroep` | Treinomroep | (geen naamkaart: bijrol) | Kore | `#8a8a8a` (0.25) |  |
| `boer` | Boer | (geen naamkaart: bijrol) | Enceladus | `#8a8a8a` (0.25) |  |
| `boerin` | Boerin | (geen naamkaart: bijrol) | Despina | `#8a8a8a` (0.25) |  |
| `chauffeur` | Buschauffeur Jannes | (geen naamkaart: bijrol) | Alnilam | `#8a8a8a` (0.25) |  |
| `reiziger` | Reiziger | (geen naamkaart: bijrol) | Despina | `#8a8a8a` (0.25) |  |
| `student` | Student | (geen naamkaart: bijrol) | Puck | `#8a8a8a` (0.25) |  |
| `loods` | Loodsdienst | (geen naamkaart: bijrol) | Achird | `#8a8a8a` (0.25) |  |
| `omroeper` | Omroeper | (geen naamkaart: bijrol) | Alnilam | `#8a8a8a` (0.25) |  |
| `piloot` | Vlieger Wiep | (geen naamkaart: bijrol) | Erinome | `#8a8a8a` (0.25) |  |
| `wybe` | Wybe | (geen naamkaart: bijrol) | Algieba | `#3f9a3f` (0.25) | zelfde stem als Durk: familie, met opzet |
| `wiebren` | Wiebren | (geen naamkaart: bijrol) | Algenib | `#20968a` (0.24) | zelfde stem als Douwe: familie, met opzet |


**Botsende namen (continuïteit).** Het plan noemt een paar mensen zoals er al iemand in het spel heet. We hernoemen niets wat al ingesproken is; de botsing wordt een grap of een familieband, en de sprekersleutels blijven uniek:
- **Ubbo**: de telefoon-app en de sms-afzender heten al "Ubbo" (`smsvoice.js`, `SMS_SYSTEM`). De Patatbaron sms't daarom als **"U. Oldenhuis"** en spreekt als **"Ubbo Oldenhuis"**; nooit de afzender `Ubbo` gebruiken, anders spreekt de systeemstem zijn berichten. In het autogesprek na O1 zegt Tessa het hardop: "Net als die app op je telefoon."
- **Geesje**: er is al een **Boerin Geesje** (dorpsuitje Stedum) en een **Geesje van Radio Proat** (G-Music, overdag). De kosteres is **"Kosteres Geesje"**. Voorstel voor één extra regel bij Boerin Geesje in Stedum, na O3: *"Mien taante Geesje? Kosteres? Ik heet noar heur. Wie heten hier aal noar heur."* (GRO: "Mijn tante Geesje? Kosteres? Ik ben naar haar vernoemd. Wij zijn hier allemaal naar haar vernoemd.")
- **Lammert**: er is al een **Schipper Lammert** (rondvaartje in Zuidhorn). De sluiswachter is **"Sluiswachter Lammert"**, en in n-woonschip zegt hij: "Mijn kleinzoon vaart rondjes bij Zuidhorn. Ook een Lammert. Wij doen niet aan nieuwe namen."
- **Loods Klaas** is **Kapitein Klaas** uit Deel 2 (zie §4); geen nieuw personage.
- **Harm-Jan** (de Piepjager) naast **Harm** (de wegwerker): verschillende sleutels, Harm-Jan zegt nooit "laatste fase".
- **Fenna** (wadgids, F4b) botst met **Molenaar Fenna** (Winsum); niet in F4a, wel een punt voor F4b.
- **Wubbo** (brugwachter, F4c) naast Dijkstra's roepnaam "Wieken Wubbo": blijft zo.

## 3. Het verhaal van F4a: hoofdmissies en tussenstappen

De volgorde hieronder is de "standaard"-volgorde (Hogeland eerst); in het spel kiest de speler na O2. Speler per missie: vijf keer Tammo, vijf keer Tessa, volgens de vuistregel uit de personagebijbel (Tessa: rijden, water, praten; Tammo: sluipen, trekkers, doorzetten, duiven).

### Stad

### O1 · Vergunning verlopen

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| achtervolging | Stad | Tessa | Vismarkt, voor de Korenbeurs (ochtend, dinsdag 15 september) | € 1500 | `O1` / missie `vergunning` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(bazig, snel)*: Ik rij. Jij staart toch alleen maar naar je auto.

**Lead (telefoon)**

- **Tammo** *(gehaast, aan de telefoon)*: Tessa. Er hangt een brief op het luik. En er rijdt een takelwagen de Vismarkt op.

**Bel Rikus (beller: De torenwachter, d'Olle Grieze)**

- **Torenwachter** *(oud, droog, onverstoorbaar, aan de telefoon op de radio)*: Rikus. Torenwachter. Er staat een takelwagen op de Vismarkt.
- **Rikus** *(droog, als nacht-dj op de radio)*: Dat mag daar niet, Torenwachter.
- **Torenwachter** *(oud, droog, onverstoorbaar, aan de telefoon op de radio)*: Hij hangt aan iets blauws. Ik meld alleen.

**Naamkaarten:** UBBO OLDENHUIS: *"Patatbaron. Veenkoloniaal. Heeft een snackbar in elk dorp, en een vriend in elke jury."*

**Route en plekken.** Vismarkt → Akerkhof → Gedempte Zuiderdiep → Emmasingel → Stationsweg → Julianaplein → oprit A7 (richting Hoogezand) → Zuidelijke Ringweg tot de vluchtstrook bij het Europaplein. Alles binnen de huidige stadskaart; de achtervolging duurt 2-3 minuten.

**Verloop**

1. **Stap in de auto van Rikus** (een rode stationwagen, `ride: 'rikus'`, niet van jou: `handBack` aan het eind).
2. **Achtervolg de takelwagen** (chase zoals de tankwagen in H8, maar zonder schieten: de frietwagen hangt eraan). De takelwagen rijdt een vaste route met verkeer; afstand > 350 m = kwijt.
3. **Setpiece op de oprit van de A7 bij het Julianaplein:** de frietwagen slingert achter de takelwagen, het luik klapt open en er waaien servetten en frietbakjes over de weg (fx, geen schade). Slow-motion van 1,5 s als de speler binnen 20 m zit.
4. **Rij naast de frietwagen** (`kind: 'escort'`-achtig: 4 seconden binnen 3 m aan de linkerkant). Tammo klimt erop en trekt de handrem: de takelwagen stalt op de vluchtstrook.
5. **Scène op de vluchtstrook** met Durk en Douwe (en één zin van Harm).
6. **Rij de Fjord Frituur terug naar de Vismarkt** (eigen auto, de Escapade met het luik).
7. **Outro** op de Vismarkt.

**Falen, overslaan, bezit**

- Kwijt: de takelwagen is > 350 m weg of uit beeld voor 8 s.
- De auto van Rikus is total loss.
- Geen tijdslimiet op de terugrit; politie telt niet mee (de takelwagen rijdt "legaal").
- **Overslaan:** pas na één mislukte poging (zoals alle missies). Overslaan zet je met de Fjord op de vluchtstrook, de scène met Durk en Douwe speelt wel.
- **Bezit:** de auto van Rikus gaat terug (`handBack: { how: 'park', say: ... }`). Niets wordt je eigendom.

**Intro (cutscène).** *Camera:* Opent hoog op de Martinitoren en zakt (`introOpen: 'descend'`) langs de toren naar de Vismarkt: de rij tot de Korenbeurs, Rikus vooraan met een leeg bakje. Dan een trage track langs de rij naar de takelwagen die achteruit tegen de frietwagen rijdt (`cam: 'track'`). Close op Durk achter het stuur, two-shot bij de brief.

- **Durk** *(traag, plechtig, uit het raampje)*: Moi. Wij komen voor de auto. `[camera: track, naamkaart: durk]`
- **Douwe** *(traag, behulpzaam)*: …auto.
- **Tessa** *(verbaasd, scherp)*: Durk? Douwe? Jullie zijn van Jelle.
- **Durk** *(traag, eerlijk)*: Waren. Nu van een Grunneger. Hij betaalt per brein.
- **Douwe** *(traag, trots)*: Wij krijgen dus de helft.
- **Tammo** *(droog)*: Dat is nog best veel.
- **Durk** *(traag, plechtig)*: Hier. Een brief. Standplaats vergeven. `[camera: close]`
- **Tessa** *(leest voor, ongelovig)*: "De standplaats Vismarkt gaat per vandaag naar Oldenhuis Bakt." Wie is Oldenhuis Bakt?
- **Rikus** *(verontwaardigd, met een leeg bakje)*: Ik stond eerst. `[camera: two]`
- **Durk** *(traag, berustend)*: Baas zegt.
- **Douwe** *(traag)*: …zegt.
- **Tammo** *(zacht, ongelovig)*: Ze nemen mijn auto mee.
- **Tessa** *(fel)*: Onze frietwagen.
- **Tammo** *(droog, gekwetst)*: Met mijn auto eronder.
- **Rikus** *(droog, gooit sleutels)*: Neem de mijne.
- **Tessa** *(vangt de sleutels, kijkt)*: Rood?
- **Rikus** *(droog, berustend)*: Iedereen heeft een rode auto. Rijden.

**HUD-doelen (in volgorde):** "Stap in de auto van Rikus" → "Achtervolg de takelwagen" → "Rij naast de frietwagen, dan klimt Tammo erop" → "Rij de Fjord Frituur terug naar de Vismarkt"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(gehaast)*: Hij gaat richting het station. Niet kwijtraken.
- **Tammo** *(geschrokken)*: Mijn luik! Het luik staat open!
- **Tessa** *(geconcentreerd)*: Dat zijn servetten, Tammo. Die hebben we nog.
- **Tammo** *(droog, gespannen)*: Het zijn mijn servetten.
- **Tammo** *(vastberaden)*: Naast hem. Links. Ik klim erop.
- **Tessa** *(ongerust, snel)*: Dit is de A7.
- **Tammo** *(droog, al half uit het raam)*: Dan moet ik opschieten.
- **Tammo** *(buiten adem, in de wind)*: Handrem. Erop. Hij staat.
- **Tessa** *(opgelucht, scherp)*: Terug naar de Vismarkt. Met jouw auto. Langzaam, er zit frituurvet in.

**Scène: A7, vluchtstrook.** *Camera:* Handheld-achtige orbit om de takelwagen terwijl de twee reuzen uitstappen; verkeer raast door de voorgrond. Harm komt van achter een pion in beeld.

- **Harm** *(gemoedelijk, trots, met een pion)*: Vluchtstrook is afgesloten. Laatste fase.
- **Durk** *(traag, beteuterd)*: Wij moesten hem naar Hoogezand brengen. Naar een loods. Vol frietwagens. `[clue]`
- **Douwe** *(traag)*: …vol.
- **Tessa** *(strijdlustig)*: Zeg maar tegen je baas dat deze niet te koop is.
- **Durk** *(traag, eerlijk)*: Hij vraagt het niet. Hij koopt.
- **Douwe** *(traag, berustend)*: Wij lopen wel. Dat zijn we gewend.

**Outro (cutscène).** *Camera:* Trage push-in van achter de Fjord, door het open luik heen, op de nieuwe gele kraam van Oldenhuis Bakt op hun plek: uniformen, geen rij. Dan two-shot met Rikus, die alleen op de oude plek staat.

- **Rikus** *(droog, trouw)*: Ik heb jullie plek bewaakt.
- **Tessa** *(ongelovig)*: Er staat een kraam op.
- **Rikus** *(droog)*: Ik heb jullie plek bewaakt. Niet de kraam.
- **Rikus** *(droog, schuldig)*: Ik heb er één geproefd. Voor het onderzoek. `[camera: close]`
- **Tessa** *(scherp)*: En?
- **Rikus** *(deadpan)*: …Ow.
- **Tammo** *(droog, bijna gekwetst)*: Trede één. Op de Vismarkt.
- **Rikus** *(droog, zachter)*: Vannacht belt die baas van ze in. Ik moet hem live laten, zegt de zender.
- **Tessa** *(strijdlustig)*: Wie is hij?
- **Rikus** *(droog)*: Een man met eenenveertig snackbars. En geen één goeie.

**Bij herhaling (als klus)**

- **Rikus** *(droog, met een knipoog)*: Weer die takelwagen? Ik ga voortaan in de rij staan met een sleepkabel.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: Weg. Met de frituur erin.
- **Tammo** *(droog, verslagen)*: En de servetten.

**Nachtstreek, na afloop (beller: Ubbo, Oldenhuis Bakt)**

- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Ik heb een beller die zegt dat hij de Snackprijs heeft gekocht.
- **Ubbo Oldenhuis** *(joviaal, zelfvoldaan, aan de telefoon op de radio)*: Gesponsord, Rikus. Ubbo Oldenhuis, Oldenhuis Bakt. Eenenveertig snackbars, van Lauwersoog tot Bourtange. `[naamkaart: ubbo]`
- **Rikus** *(droog, als nacht-dj op de radio)*: En sinds vanochtend ook de Vismarkt.
- **Ubbo Oldenhuis** *(zakelijk, vriendelijk, aan de telefoon op de radio)*: Vergunning verlopen. Dat is geen kwestie van willen. Dat is papier.
- **Ubbo Oldenhuis** *(plechtig, joviaal, aan de telefoon op de radio)*: Nieuws voor je luisteraars. De Gouden Eierbal gaat dit jaar naar de winnaar van de Ommelander Ronde. Zeven voorrondes, in zeven regio's. Iedereen mag meedoen. `[clue]`
- **Rikus** *(droog, als nacht-dj op de radio)*: Ook een frietwagen zonder standplaats?
- **Ubbo Oldenhuis** *(geamuseerd, aan de telefoon op de radio)*: Juist die. Dan is het eerlijk.
- **Rikus** *(droog, als nacht-dj op de radio)*: Wie zit er in de jury?
- **Ubbo Oldenhuis** *(joviaal, aan de telefoon op de radio)*: Mensen uit de streek. Mensen die ik ken.
- **Rikus** *(droog, als nacht-dj op de radio)*: Dat is iedereen, Ubbo.
- **Ubbo Oldenhuis** *(tevreden, aan de telefoon op de radio)*: Precies.

**Nachtstreek, na afloop (beller: Jelle, Ljouwert)**

- **Jelle Terpstra** *(gepikeerd, charmant, aan de telefoon op de radio)*: Rikus. Jelle. Durk en Douwe rijden nu voor een Grinzer. *(Rikus. Jelle. Durk en Douwe rijden nu voor een Groninger.)*
- **Rikus** *(droog, als nacht-dj op de radio)*: Hoe voelt dat, Jelle?
- **Jelle Terpstra** *(zacht, eerlijk, aan de telefoon op de radio)*: Stil. Ze komen niet meer bij mem eten. *(Stil. Ze komen niet meer bij mijn moeder eten.)*

**Berichten na afloop:** *U. Oldenhuis*: "Mooi wagentje. Ik heb er al negen. – U.O."

**Kiekdoar:** "Frietwagen weggesleept van de Vismarkt, teruggehaald op de A7. Nieuwe kraam op de Vismarkt: Oldenhuis Bakt. Rij: nul. De oude rij staat er nog. Zonder kraam."

**Afrondingskaart:** **VERGUNNING VERLOPEN** · De Fjord is terug. De standplaats niet. · *+ € 1500*

**Autogesprek `o1-pass-ubbo` (after:O1:pass)**

- **Tammo** *(dry)*: Hij heet Ubbo.
- **Tessa** *(amused)*: Net als die app op je telefoon.
- **Tammo** *(dry, deadpan)*: Die zoekt tenminste werk voor me.

**Autogesprek `o1-pass-negen` (after:O1:pass)**

- **Tessa** *(angry, quiet)*: "Ik heb er al negen." Negen frietwagens. In een loods.
- **Tammo** *(dry, protective)*: Deze niet. Deze heeft een handrem.

**Autogesprek `o1-fail` (after:O1:fail)**

- **Tammo** *(sheepish)*: Hij reed harder dan ik dacht. Voor een takelwagen.
- **Tessa** *(exasperated)*: Het is een takelwagen met twee Friezen erin, Tammo. Die rijden nergens hard.

**"Wat weten we?"** *Oldenhuis Bakt* (clue): Eenenveertig snackbars, van Lauwersoog tot Bourtange. De eigenaar, Ubbo Oldenhuis, sponsort nu de Snackprijs. Durk en Douwe sleepten onze frietwagen weg "naar een loods in Hoogezand, vol frietwagens". · *De Ommelander Ronde* (clue): Nieuw reglement: de Gouden Eierbal gaat naar de winnaar van zeven voorrondes in zeven regio's. De jury: "mensen die ik ken". Dat is iedereen.

### O2 · Oma's lijstje

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| trein, verhaal | Stad → Hogeland | Tammo | Oma Trijntje, Noorderhaven (vroeg in de ochtend) | € 800 | `O2` / missie `lijstje` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog, slaperig)*: Laat mij maar. Mijn oma, mijn wekker.

**Lead (telefoon)**

- **Tessa** *(nieuwsgierig, aan de telefoon)*: Oma wil ons zien. Vroeg. Neem een treinkaartje mee, zegt ze. Naar waar, zegt ze niet.

**Bel Rikus (beller: Trijntje, 92)**

- **Oma Trijntje** *(stellig, oud, aan de telefoon op de radio)*: Rikus. Trijntje. Stuur die twee morgenvroeg naar mij. Met een treinkaartje.
- **Rikus** *(warm, als nacht-dj op de radio)*: Waarheen, Trijntje?
- **Oma Trijntje** *(droog, liefdevol, aan de telefoon op de radio)*: Dat staat op het lijstje.

**Naamkaarten:** MACHINIST JANTINA: *"Veertig jaar op de lijn. Remt nooit te laat."*; KOSTERES GEESJE: *"Vierentachtig. Kosteres op een wierde. Ziet alles vanaf de toren."*

**Route en plekken.** Noorderhaven (Oma's kamer) → te voet of met de fiets naar het Hoofdstation (± 1,5 km) → kaartautomaat → stoptrein naar Roodeschool, uitstappen in Warffum (haltes: Groningen Noord, Sauwerd, Winsum, Baflo, Warffum). De rit is de eerste "echte" rit uit de provincie: bij zonsopgang, met de kaart die openklapt.

**Verloop**

1. **Intro bij Oma** (Noorderhaven, 05:15): het lijstje. In "Wat weten we?" verschijnt **Oma's lijstje** met zeven silhouetten; twee krijgen een naam (Geesje, Lammert).
2. **Naar het Hoofdstation** voor de trein van tien over zes (zachte tijd: de trein wacht in de missie, de speler kan niet te laat komen; de HUD toont wel een klok).
3. **Kaartje kopen** (`stationtravel.js`, kost € 4; zonder geld: zwartrijden, Okke de conducteur komt langs en laat het gaan, zie §5.1).
4. **Kies op het perron:** **"Voorin, bij Jantina"** (zelf machinist, mini-game §5.1) of **"Meerijden"** (coupé, banter, Spatie houdt = versneld). Allebei eindigen in Warffum. Wie zelf rijdt en goud haalt, krijgt de medaille "Eerste dienst".
5. **Zonsopgang-setpiece** na Sauwerd: de trein komt uit de bebouwing, de zon komt op boven de wierden; de kaart klapt open (mist van de kaart weg langs de lijn, `revealCorridor('roodeschool')`).
6. **Outro op het perron van Warffum**: Geesje.

**Falen, overslaan, bezit**

- Deze missie kan niet mislukken (verhaal). In de machinistvariant kun je wel slecht rijden: dat kost een medaille, geen missie.
- **Overslaan:** de treinrit is altijd over te slaan (Spatie houden), ook de eerste keer; de missie zelf niet (het is het verhaal).
- **F1-proefdrop "Op de rails" (zonder Ubbo):** speel O2 los, vóór O1 bestaat. Laat in de intro de zin "Met eenenveertig snackbars tegen je?" weg en begin bij "Jullie hebben vrienden nodig. Ik heb er nog zeven." De rest werkt zonder Ubbo; Geesjes laatste zin wordt dan: "Maar eerst koffie. Kom maar." (alternatieve regels hieronder, `f1`).

**Intro (cutscène).** *Camera:* Begint close op de foto van 1953 aan de muur (Trijntje met de bal, haar handjes erom), trekt langzaam terug over Oma's schouder naar het duo op de bank; een trage halve orbit om de tafel terwijl ze praat. Buiten is het nog donker, één schemerlamp.

- **Oma Trijntje** *(stellig, oud)*: Jullie hebben geen plek meer. Dat hoorde ik op de radio. `[camera: close]`
- **Tessa** *(vastberaden)*: Nog niet. We krijgen hem terug.
- **Oma Trijntje** *(droog)*: Met eenenveertig snackbars tegen je? Dan heb je vrienden nodig. Ik heb er nog zeven.
- **Tammo** *(droog, verbaasd)*: Jij hebt nooit vrienden, oma.
- **Oma Trijntje** *(stellig)*: Ik heb mensen die mij nog wat schuldig zijn. Van 1953. Dat is beter. `[clue]`
- **Tessa** *(leest het lijstje)*: Geesje, Den Andel. Lammert, Delfzijl. En vijf namen met alleen een dorp erbij.
- **Oma Trijntje** *(droog)*: Die vijf leven niet allemaal meer. Dan vraag je het de kleinkinderen. Schuld erft.
- **Tammo** *(droog)*: Dat is geen Gronings recht, oma.
- **Oma Trijntje** *(stellig)*: Het is Gronings fatsoen. Dat is strenger.
- **Oma Trijntje** *(warm, met een glimlach)*: Geesje zat naast me in de klas. Lammert danste met me. Op het feest, na de prijs. Hij schoof.
- **Tammo** *(verward)*: Schoof?
- **Oma Trijntje** *(warm, dromerig)*: Dansen, jong. Langzaam. Met je voeten op de grond.
- **Tessa** *(zacht, nieuwsgierig)*: Wat zijn ze je schuldig?
- **Oma Trijntje** *(droog, stellig)*: Ieder een gunst. Ik heb ze zeventig jaar bewaard. Ik ben Gronings, ik spaar.
- **Oma Trijntje** *(droog)*: De eerste trein naar Warffum gaat om tien over zes.
- **Tammo** *(slaperig, droog)*: Het is kwart over vijf.
- **Oma Trijntje** *(droog, liefdevol)*: Dan ben je op tijd. Voor één keer.

**F1-proefdrop: vervangt de eerste drie regels van de intro**

- **Oma Trijntje** *(stellig, oud)*: Jullie hebben vrienden nodig. Ik heb er nog zeven.

**HUD-doelen (in volgorde):** "Naar het Hoofdstation, de trein van tien over zes" → "Koop een kaartje bij de automaat" → "Voorin bij Jantina, of meerijden" → "Uitstappen in Warffum"

**In de trein (coupé).** *Camera:* Vanaf het perron: de trein trekt op, de camera blijft even staan en zwiept dan mee naar het raam (`cam: 'window'`). Na Sauwerd een brede helikopterachtige zijshot langs de trein terwijl de zon opkomt boven de wierden; de kaart-UI klapt open als overgang.

- **Tessa** *(enthousiast, bij het raam)*: Zeven regio's. Zeven voorrondes. En als we winnen, overal een filiaal.
- **Tammo** *(droog)*: Een wat?
- **Tessa** *(enthousiast, snel)*: Een Fjord Frituur. In elk dorp. Niet nu. Later.
- **Tammo** *(droog)*: We hebben er één. Die hing gisteren aan een takelwagen.
- **Tessa** *(stellig)*: Daarom. Spreiden.
- **Tammo** *(deadpan)*: Spreiden is iets voor boter.
- **Tessa** *(zacht, wijst)*: Kijk. Daar begint het Hogeland.
- **Tammo** *(droog)*: Ik zie een koe.
- **Tessa** *(warm, lachend)*: Dat is het Hogeland.

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tessa** *(gehaast, slaperig)*: Lopen, Tammo. Oma zei tien over zes, en oma meent dat.
- **Tammo** *(slaperig, droog)*: Het is nog donker. Het is nacht met een wekker.
- **Tessa** *(plagend)*: Je mag voorin, zegt de machinist. Als je nergens aankomt.
- **Tammo** *(droog)*: Ik kom altijd ergens aan. Alleen niet op tijd.

**Outro (cutscène).** *Camera:* Vanuit de trein die wegrijdt: het perron van Warffum glijdt weg en onthult Geesje met haar fiets aan de hand (reveal-pan, de laatste wagon trekt als een gordijn weg). Daarna een lage two-shot met de stationskap en een kerktoren op de achtergrond.

- **Kosteres Geesje** *(droog, kordaat)*: Moi. Jullie zijn van Trijntje. `[naamkaart: geesje]`
- **Tammo** *(verbaasd)*: Hoe weet u dat?
- **Kosteres Geesje** *(droog)*: Jullie stappen om kwart voor zeven uit in Warffum. Dat doet niemand.
- **Tessa** *(vriendelijk)*: U bent Geesje.
- **Kosteres Geesje** *(droog, kordaat)*: Kosteres. Den Andel. Ik zie alles vanaf mijn toren. Ik meld alleen.
- **Tammo** *(zacht, tegen Tessa)*: Zo praat de torenwachter ook.
- **Kosteres Geesje** *(droog)*: Dat is mijn neef. Hij is ouder dan ik, maar hij zit hoger.
- **Kosteres Geesje** *(stellig)*: Trijntje krijgt haar gunst. Maar eerst mijn kerk. Er staat al drie dagen een mestinjecteur op mijn kerkpad. `[clue]`
- **Tessa** *(strijdlustig)*: Van wie?
- **Kosteres Geesje** *(droog, scherp)*: Van Eppo Bolt. Die heeft alle machines van het Hogeland. Behalve mijn fiets.

**F1-proefdrop: vervangt de laatste twee regels van de outro**

- **Kosteres Geesje** *(droog, warm)*: Maar eerst koffie. Kom maar.

**Bij herhaling (als klus)**

- **Oma Trijntje** *(droog, liefdevol)*: Weer die vroege trein? Neem een boterham mee, jong. Het Hogeland is groot.

**Berichten na afloop:** *Onbekend nummer (0596)*: "Trijntje belde. Ik zit bij de zeesluis in Delfzijl. Elke dag. – L."

**HUD-meldingen:** "Het Hogeland en de Eemsdelta zijn open" · "Oma's lijstje staat in "Wat weten we?""

**Afrondingskaart:** **OMA'S LIJSTJE** · Zeven namen. Twee dorpen. Eén trein om tien over zes. · *+ € 800*

**Autogesprek `o2-pass-schuiven` (after:O2:pass)**

- **Tessa** *(teasing, warm)*: Lammert schoof met je oma.
- **Tammo** *(dry)*: Ik wil daar niks over weten.
- **Tessa** *(teasing)*: Langzaam. Met de voeten op de grond.
- **Tammo** *(dry, pained)*: Tessa.

**Autogesprek `o2-pass-schuld` (after:O2:pass)**

- **Tammo** *(dry, thoughtful)*: "Schuld erft." Wat erf ik dan van oma?
- **Tessa** *(dry, quick)*: Haar wekker.

**"Wat weten we?"** *Oma's lijstje* (hart): Zeven mensen die Oma nog wat schuldig zijn, van 1953. Geesje (Den Andel) en Lammert (Delfzijl), en vijf namen met alleen een dorp. "Schuld erft." De rest komt later. · *De Mestkoning* (clue): Geesje: Eppo Bolt heeft alle machines van het Hogeland. Zijn mestinjecteur staat al drie dagen op haar kerkpad.

### Ring 1 · Het Hogeland

Bondgenoot **Geesje** (kosteres van Den Andel, melder), tegenstander **Eppo Bolt** (de Mestkoning). Missiestarts liggen binnen 3 km van elkaar (Warffum, Den Andel, Usquert, Uithuizen). Safehouse na O6: de kamer boven Jakobs café in Warffum.

### O3 · Een kerk op een bult

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| rijden, trekker | Hogeland | Tammo | Café van Jakob in Warffum (achter het café staat de trekker) | € 1400 | `O3` / missie `kerkpad` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Ik doe de trekker. Hard gaat hij toch niet.

**Lead (telefoon)**

- **Tessa** *(zakelijk, aan de telefoon)*: Geesjes neef Jakob heeft een café in Warffum. Achter het café staat een oude trekker. Die mogen we lenen.

**Bel Rikus (beller: Geesje, kosteres)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Vanuit een busje achter het station van Warffum. Eerste beller.
- **Kosteres Geesje** *(droog, kordaat, aan de telefoon op de radio)*: Rikus. Geesje, kosteres van Den Andel. Zondag is er dienst, en mijn kerkpad staat vol mest.
- **Rikus** *(verbaasd, als nacht-dj op de radio)*: Vol?
- **Kosteres Geesje** *(droog, aan de telefoon op de radio)*: Er staat een machine op die mest in de grond spuit. In mijn grond. Ik meld alleen.

**Naamkaarten:** EPPO BOLT: *"De Mestkoning. Alle machines van het Hogeland. Behalve één fiets."*

**Route en plekken.** Warffum, achter het café (Jakob) → de weg van Warffum naar Den Andel (± 2 km, smalle klinkerweg en een stuk dijkje) → het kerkpad aan de voet van de wierde in Den Andel → om de wierde heen en de wierde op, langs de kerkhofmuur → het erf naast de pastorie. Vooraf in OSM checken hoe de kerk van Den Andel op haar wierde ligt; de route om de muur heen is spel, geen echte weg.

**Verloop**

1. **Naar Jakob** in Warffum (te voet, 150 m). Korte scène: hij geeft de sleutel ("ouder dan ik").
2. **Rij de trekker naar Den Andel.** Onderweg komen twee konvooien van Eppo's loonbedrijf tegemoet (brede trekkers met kippers): uitwijken in de berm, niet de sloot in.
3. **Koppel de mestinjecteur aan** (E bij de trekhaak, achteruit tot de klik; de HUD toont de afstand).
4. **Trek hem van het kerkpad, de wierde op en eromheen**: de enige weg is langs de kerkhofmuur. **Muurmeter**: elke tik kost 25 %, bij 100 % mislukt. Het zware ding duwt bergaf; remmen op de helling.
5. **Parkeer hem netjes op het erf naast de pastorie** (vak met witte lijnen, binnen 1,5 m).
6. **Scène:** Eppo komt in een enorme pick-up met dubbele banden. Naamkaart.
7. **Outro** op de wierde.

**Falen, overslaan, bezit**

- De kerkhofmuur is stuk (100 %).
- De trekker of de injecteur ligt in de sloot (gekanteld of > 1 m water).
- **Geen tijdslimiet.** Konvooien zijn hinder, geen fail.
- **Overslaan** na één poging: de injecteur staat op het erf, de scène met Eppo speelt.
- **Bezit:** de trekker is van Jakob (`handBack: { how: 'park' }` op het erf). Wie een eigen trekker wil, koopt er een (§5.2, trekkertrek).

**Intro (cutscène).** *Camera:* Lage shot vanaf het kerkpad: de enorme injecteur vult het beeld, daarachter de wierde met de kerk. De camera kraant omhoog over de injecteur heen tot de kerkhofmuur en de toren in beeld komen; Geesje staat bovenaan het pad met een bezem.

- **Kosteres Geesje** *(droog, kordaat)*: Achthonderd jaar ligt dat pad er. Nooit heeft er mest op gestaan.
- **Tammo** *(droog)*: Hij staat er wel scheef op.
- **Kosteres Geesje** *(droog)*: Dat is het enige wat ik hem gun. `[camera: close]`
- **Tessa** *(zakelijk)*: Waar moet hij heen?
- **Kosteres Geesje** *(stellig)*: Naast de pastorie. Netjes. Ik wil niet dat Eppo zegt dat we slordig zijn.
- **Tammo** *(droog, kijkt naar de muur)*: En die muur?
- **Kosteres Geesje** *(droog, streng)*: Die muur blijft heel. Er liggen mensen achter die niet tegen lawaai kunnen.

**HUD-doelen (in volgorde):** "Haal de trekker bij Jakob" → "Rij naar de kerk van Den Andel" → "Koppel de mestinjecteur aan (E)" → "Trek hem de wierde op, langs de kerkhofmuur" → "Zet hem netjes naast de pastorie"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Kroegbaas Jakob** *(gemoedelijk, droog)*: Hier. De sleutel. Hij is ouder dan ik, dus rustig aan.
- **Tammo** *(droog)*: Hoe oud ben jij?
- **Kroegbaas Jakob** *(gemoedelijk)*: Oud genoeg om te weten dat hij naar links trekt.
- **Tessa** *(gespannen)*: Konvooi! Berm in, Tammo. Berm, niet sloot.
- **Tammo** *(droog, geconcentreerd)*: Ik weet wat een berm is.
- **Tessa** *(geconcentreerd)*: Achteruit. Nog een meter. Nog een halve. Klik.
- **Tammo** *(droog, gespannen)*: Hij duwt. Hij wil naar beneden.
- **Tessa** *(scherp)*: De muur, Tammo! Links is de muur!
- **Tammo** *(droog, buiten adem)*: Rechts is de sloot. Ik kies het midden.
- **Kosteres Geesje** *(streng, roepend van boven)*: Die steen is uit twaalfhonderd. Niet aankomen.
- **Tessa** *(opgelucht)*: Netjes. Geesje kijkt. Ze knikt bijna.

**Scène: Den Andel, de pastorie.** *Camera:* De pick-up van Eppo rijdt het beeld in en blokkeert de zon; camera laag bij de dubbele banden, dan omhoog langs het portier naar Eppo die uitstapt. Wissel tussen Eppo (onderaanzicht) en Geesje (bovenaanzicht van de wierde): de kleine vrouw staat hoger.

- **Eppo Bolt** *(luid, verontwaardigd)*: Wie heeft mijn injecteur verzet? `[naamkaart: eppo]`
- **Kosteres Geesje** *(droog, kordaat)*: De Heer. Met een trekker.
- **Eppo Bolt** *(stug)*: Geesje. Dat pad is van de gemeente.
- **Kosteres Geesje** *(droog, scherp)*: Dat pad is van de doden. Die liggen er al achthonderd jaar. Jij pas vijfenvijftig.
- **Eppo Bolt** *(grinnikend, dreigend)*: En jullie zijn die frietwagen. Ubbo zei al dat jullie zouden komen.
- **Tessa** *(strijdlustig)*: Wat moet Ubbo op het Hogeland?
- **Eppo Bolt** *(joviaal, dreigend)*: Ubbo moet overal wat. Hij heeft mensen. Ik ben er één. `[clue]`
- **Eppo Bolt** *(grinnikend)*: Zaterdag de voorronde in Uithuizen. Ik zit in de jury. Kom maar. Ik hou van friet.

**Outro (cutscène).** *Camera:* Kraanshot: start bij de kerkhofmuur, stijgt over het zadeldak van de toren en draait open over het Hogeland: wierden met boerderijen, in de verte de torens van Warffum en Usquert, de turbines van Eemshaven aan de horizon. Terug omlaag naar Geesje en het duo op de bank bij de kerkdeur.

- **Kosteres Geesje** *(droog)*: Zondag is er dienst. Er komen er vier. Met jullie zes.
- **Tammo** *(droog)*: Wij komen niet.
- **Kosteres Geesje** *(droog, onverstoorbaar)*: Vier dan. Dat is ook goed.
- **Tessa** *(zacht, nieuwsgierig)*: Geesje. Wat ben je oma schuldig?
- **Kosteres Geesje** *(warm, nuchter)*: In 1953 had ik mijn arm gebroken. Trijntje droeg mijn tas. Van school naar huis. Een jaar lang.
- **Tammo** *(verbaasd)*: Een jaar?
- **Kosteres Geesje** *(warm, droog)*: Na zes weken was hij genezen. Ze bleef dragen. Dat doe je dan.
- **Tessa** *(zacht)*: En nu?
- **Kosteres Geesje** *(droog)*: Nu draag ik wat terug. Ik weet alleen nog niet wat. Dat weet je dan.

**Bij herhaling (als klus)**

- **Kosteres Geesje** *(droog)*: Weer een injecteur op mijn pad. Ik begin te denken dat hij me mist.

**Mislukt** (na het "Sikkom."-scherm)

- **Tammo** *(droog, schuldig)*: Die muur stond er achthonderd jaar.
- **Tessa** *(droog)*: En jij was er tien minuten.

**Kiekdoar:** "Mestinjecteur verplaatst van kerkpad in Den Andel. Kosteres: "De Heer. Met een trekker." Loonwerker overweegt aangifte tegen onbekend."

**Afrondingskaart:** **EEN KERK OP EEN BULT** · Het kerkpad is vrij. De muur is heel. Eppo niet blij. · *+ € 1400*

**Autogesprek `o3-pass-tas` (after:O3:pass)**

- **Tessa** *(moved, quiet)*: Ze droeg haar tas. Een jaar lang.
- **Tammo** *(dry)*: Hij was na zes weken genezen.
- **Tessa** *(firm, warm)*: Dat is het punt, Tammo.
- **Tammo** *(soft)*: …Ik weet het.

**Autogesprek `o3-pass-dienst` (after:O3:pass)**

- **Tammo** *(dry)*: Vier mensen in de kerk. Met ons zes.
- **Tessa** *(teasing)*: Je overweegt het.
- **Tammo** *(dry)*: Ik overweeg niks. Ik tel.

**Autogesprek `o3-fail` (after:O3:fail)**

- **Tessa** *(dry)*: Geesje heeft de stenen al geteld.
- **Tammo** *(resigned)*: Natuurlijk heeft ze dat.

**"Wat weten we?"** *Eppo werkt voor Ubbo* (clue): Eppo Bolt, loonwerker uit Usquert: "Ubbo heeft mensen. Ik ben er één." Hij zit zaterdag in de jury van de voorronde in Uithuizen. · *Geesjes tas* (hart): In 1953 brak Geesje haar arm. Trijntje droeg een jaar lang haar tas, ook toen de arm allang genezen was. "Dat doe je dan."

### O4 · Oogst met haast

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| achtervolging (combine) | Hogeland | Tessa | Jakobs schuur aan de rand van Warffum (late middag, gouden licht) | € 1800 | `O4` / missie `oogst` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(zelfverzekerd)*: Ik rij. Een combine is ook maar een auto met een maaibord ervoor.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Eppo maait Geesjes kerkland. Jakob heeft een tweede combine in de schuur. Hij is oud, zegt Jakob. De combine ook.

**Bel Rikus (beller: Geesje, kosteres)**

- **Kosteres Geesje** *(droog, kordaat, aan de telefoon op de radio)*: Rikus. Geesje. Eppo's combine maait mijn kerkland. Per ongeluk, zegt hij.
- **Rikus** *(droog, als nacht-dj op de radio)*: Hoelang al?
- **Kosteres Geesje** *(droog, aan de telefoon op de radio)*: Een uur. Hij is grondig. Ik meld alleen.

**Route en plekken.** Jakobs schuur (Warffum) → over de Usquerterweg/een kavelpad naar het kerkland van Den Andel (± 1,5 km) → de achtervolging over stoppelvelden en smalle wegen tussen de wierden noordoostelijk richting Usquert (Eppo wil naar zijn loonbedrijf aan de rand van Usquert, fictief erf) → einde op een kavelpad voor een wierdeboerderij. Werkelijke wegnamen bij de bouw uit OSM halen; het spel gebruikt vooral kavelpaden en stoppel.

**Verloop**

1. **Stap in Jakobs combine** (traag, breed, 7 m maaibord dat overal tegenaan zit; het maaibord omhoog = smaller, maar dan geen "maaien" van gewas).
2. **Rij naar het kerkland.** Eppo maait daar, met een trekker en kipper die het graan uit zijn bunker overneemt.
3. **De achtervolging** (`chase` met `hits`): Eppo vlucht met het graan in zijn bunker naar zijn erf. Raak zijn combine vijf keer met je maaibord (elke tik: graan stuift, een meter "Graan terug" loopt op). Zijn kipperchauffeur probeert je klem te rijden.
4. **Zonsondergang-setpiece:** halverwege zakt de zon achter de wierden; camera laag tussen de twee combines in het tegenlicht, kaf en stof gloeien. Na zonsondergang gaan de werklampen aan (de AI rijdt dan voorzichtiger: een kans).
5. **Bij vijf tikken** valt Eppo's combine stil voor een wierdeboerderij. **Scène** met Eppo.
6. **Lossen:** zet je combine naast de zijne en zet de losbuis over je eigen bunker (E): zijn graan gaat naar jouw bunker (8 s, niet bewegen).
7. **Breng het graan terug naar het kerkland** en los het in Jakobs kipper. **Outro.**

**Falen, overslaan, bezit**

- Eppo bereikt zijn erf (> 600 m voor je uit, of door de poort).
- Jouw combine valt om (in een sloot gekanteld).
- **Geen schieten** (het is een landbouwvoertuig met een man erin; de missie zet `noShoot`).
- **Overslaan** na één poging: je staat met het graan in je bunker bij het kerkland.
- **Bezit:** de combine is van Jakob, die blijft op het kerkland staan.

**Intro (cutscène).** *Camera:* Opent in de stofwolk achter Eppo's combine (de camera "rijdt mee" in het kaf), tilt omhoog naar de cabine waar Eppo telefoneert en zwaait; dan een lange zijwaartse track langs het maaibord naar Geesje aan de rand van het veld, die met haar fiets op de rem staat.

- **Eppo Bolt** *(luid, joviaal, door het open raam)*: Geesje! Per ongeluk! Ik dacht dat het van Ubbo was!
- **Kosteres Geesje** *(droog, kordaat)*: Het staat op de kaart. Kerkland. Sinds zestienhonderd.
- **Eppo Bolt** *(grinnikend)*: Kaarten zijn oud. Ik ben nieuw. `[camera: close]`
- **Tessa** *(strijdlustig, uit Jakobs combine)*: Dat graan blijft hier.
- **Eppo Bolt** *(luid, grinnikend)*: Kom het maar halen, meisje. Met dat oude ding.
- **Tammo** *(droog)*: Hij zei meisje.
- **Tessa** *(kil)*: Ik hoorde het.

**HUD-doelen (in volgorde):** "Stap in Jakobs combine" → "Rij naar het kerkland" → "Raak Eppo's combine met je maaibord" → "Zet de losbuis over je bunker (E)" → "Breng het graan terug naar het kerkland"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(droog, gespannen)*: Dat maaibord is zeven meter. Jij bent één meter zestig.
- **Tessa** *(geconcentreerd)*: Ik heb het gemeten. Erachteraan.
- **Tammo** *(gespannen)*: De kipper komt van rechts. Hij wil je klemrijden.
- **Tessa** *(strijdlustig)*: Laat hem maar. Ik ben breder.
- **Tammo** *(onder de indruk)*: Raak! Kijk dat graan stuiven.
- **Tessa** *(snel)*: Dat is ons graan dat stuift. Netjes raken.
- **Tammo** *(zacht, kijkt naar de zon)*: De zon gaat onder. Nu zie je alleen nog zijn lampen.
- **Tessa** *(vastberaden)*: Dan zie ik precies waar hij is.
- **Tammo** *(opgelucht)*: Hij staat. Hij staat stil.
- **Tessa** *(zakelijk)*: Losbuis eroverheen. Niet bewegen. Acht tellen.

**Scène: Een erf aan de wierde.** *Camera:* Rond Eppo die uit zijn stilgevallen combine klimt, met de laatste zon in zijn rug; de werklampen van beide combines prikken in het beeld. Eén trage halve orbit.

- **Eppo Bolt** *(stug, buiten adem)*: Dat graan was voor Ubbo. Hij koopt het hele Hogeland. Graan, aardappels, mest.
- **Tessa** *(scherp)*: Ook het kerkland?
- **Eppo Bolt** *(stug)*: Geesje verkoopt niet. Dus maai ik het. Per ongeluk.
- **Tammo** *(droog)*: Een uur lang.
- **Eppo Bolt** *(grinnikend, onverstoorbaar)*: Ik ben grondig.
- **Eppo Bolt** *(dreigend, joviaal)*: Zaterdag, Uithuizen. Ik regel de stroom op de kermis. Denk daar maar aan. `[clue]`

**Outro (cutscène).** *Camera:* Wijd shot over het stoppelveld in de schemer: het silhouet van de kerk op de wierde, Jakobs kipper met het teruggebrachte graan. Langzame dolly naar Geesje op haar fiets, die de remmen loslaat en naar het duo rijdt.

- **Kosteres Geesje** *(droog, tevreden)*: Het graan is terug. Gemaaid, maar terug.
- **Tessa** *(nieuwsgierig)*: Wat doe je er nu mee?
- **Kosteres Geesje** *(droog)*: Verkopen. Aan iemand die geen Ubbo heet.
- **Tammo** *(droog, hoopvol)*: Aan ons?
- **Kosteres Geesje** *(droog, kordaat)*: Jullie bakken. Wat moet je anders met paneermeel? `[clue]`
- **Tessa** *(blij verrast)*: Een Hogelander eierbal. Van kerkland.
- **Kosteres Geesje** *(droog)*: Ik zeg er niks van. Ik meld alleen.
- **Kosteres Geesje** *(droog, zakelijk)*: Vrijdag is er een tuinfeest in de Menkemaborg. Ubbo zoekt daar zijn jury. Ze hebben nog bediening nodig.

**Bij herhaling (als klus)**

- **Kosteres Geesje** *(droog)*: Hij maait weer. Ik vroeg of hij een bril nodig had. Hij zei: per ongeluk.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: Hij is binnen. Met het graan.
- **Tammo** *(droog, verslagen)*: Per ongeluk.

**Kiekdoar:** "Twee combines in gevecht tussen de wierden bij Den Andel. Getuige: "Het leek wel een film. Een hele langzame.""

**Afrondingskaart:** **OOGST MET HAAST** · Het graan van het kerkland is terug. Er komt paneermeel van. · *+ € 1800*

**Autogesprek `o4-pass-meisje` (after:O4:pass)**

- **Tammo** *(dry)*: Hij zei meisje. Daarna heb je hem vijf keer geraakt.
- **Tessa** *(calm, smug)*: Vier keer. De vijfde was voor Ubbo.

**Autogesprek `o4-pass-paneermeel` (after:O4:pass)**

- **Tessa** *(excited)*: Paneermeel van kerkland. Dat is een verhaal. Dat verkoopt.
- **Tammo** *(dry)*: Het is ook gewoon lekker.
- **Tessa** *(quick)*: Dat verkoopt ook.

**Autogesprek `o4-fail` (after:O4:fail)**

- **Tessa** *(frustrated)*: Een combine stuurt als een kerk.
- **Tammo** *(dry)*: Dan had Geesje moeten rijden.

**"Wat weten we?"** *Ubbo koopt het Hogeland* (clue): Eppo: Ubbo koopt alles wat hier groeit. Graan, aardappels, mest. Wat niet te koop is, maait Eppo per ongeluk. En zaterdag "regelt hij de stroom" op de kermis. · *Het tuinfeest* (clue): Geesje: Ubbo geeft vrijdag een tuinfeest in de Menkemaborg in Uithuizen. Daar zoekt hij zijn jury. Er is bediening nodig.

### Tussendoor: Trekkertrek in Uithuizermeeden (`n-trekkertrek`, optioneel)

Speler: Tammo. Doel: `{ type: 'trekkertrek', at: 'uithuizermeeden' }`.

**Wissel**

- **Tammo** *(droog)*: Ik trek. Op een trekker kan niemand zien dat ik zenuwachtig ben.

**Lead**

- **Tessa** *(enthousiast, aan de telefoon)*: Trekkertrek in Uithuizermeeden. Eppo trekt mee met zijn monstertrekker. Jakob leent je zijn oude, als je wilt. Hoeft niet. Mag wel.

**Zegt de companion bij de start**

- **Tessa** *(aanmoedigend)*: Gas geven tot hij niet meer wil. En dan nog een beetje.

**Scène: De trekkertrekbaan.**

- **Omroeper** *(luid, enthousiast)*: En nu een Stadjer! Op de trekker van Jakob, bouwjaar onbekend!
- **Eppo Bolt** *(grinnikend, luid)*: Die trekt nog geen kruiwagen van zijn plek.
- **Tammo** *(droog)*: Hij hoeft alleen jouw ego te trekken. Dat is zwaarder.
- **Omroeper** *(luid, onder de indruk)*: Hij rijdt! Hij rijdt nog! Hij rijdt nog steeds!
- **Eppo Bolt** *(stug)*: Dat is geen trekken. Dat is volhouden.
- **Tammo** *(droog)*: Dat is hetzelfde, hier.

**Klaar (telefoon)**

- **Tessa** *(tevreden, aan de telefoon)*: Eppo trok verder, maar jij bleef langer op de baan staan. Het publiek koos jou. Dat telt hier.

### O5 · Borgfeest

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| sluipen, vermomming, duif | Hogeland | Tammo | Station Uithuizen (avond); de borg ligt aan de oostkant van het dorp | € 2000 | `O5` / missie `borgfeest` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Ik doe de tuin. Hagen geven nooit commentaar.

**Lead (telefoon)**

- **Tessa** *(samenzweerderig, aan de telefoon)*: Ubbo geeft een tuinfeest in de Menkemaborg. Ik ga als bediening, met een schort. Jij gaat als niemand. Door de tuin.

**Bel Rikus**

- **Rikus** *(samenzweerderig, droog, laat op de avond, als nacht-dj op de radio)*: Geen beller vanavond. In Uithuizen is een tuinfeest in een borg. Ik ben niet uitgenodigd. Ik zeg niks. Ik draai iets met strijkers.

**Route en plekken.** Station Uithuizen → te voet door het dorp naar de Menkemaborg (± 1 km; straatnaam bij de borg uit OSM) → langs de buitenkant van de gracht naar de achterkant van de tuin → het doolhof van hagen → de prieel-/terrasplekken waar Ubbo zijn gasten één voor één spreekt → de duiventil achter de schuur (fictief toegevoegd als de borg er geen heeft) → vlucht over de gracht. **Let op (§8 van het verhaal-document):** de borg heet echt, het museum en de organisatie niet: het feest is "een avond verhuurd aan Oldenhuis Bakt".

**Verloop**

1. **Naar de borg** te voet; aan de poort staan stewards met zaklampen. Tessa gaat met een dienblad naar binnen via de keukeningang (zij is de companion: ze praat via de telefoon in je oor, `earpiece: true`).
2. **Sluip door het doolhof** (stealth zoals de kraak in H6: zaklampkegels, stilstaan in de schaduw van de haag, rennen maakt geluid op het grind).
3. **Luister drie gesprekken af** (`listen`: binnen 8 m blijven, ongezien, 6 s per gesprek). Ubbo werft drie juryleden voor Uithuizen: Eppo, slager Ruurd en kermisbaas Hennie. Elk gesprek eindigt met een envelop.
4. **Scène op het terras** (Tessa serveert Ubbo; de speler kijkt vanuit de haag mee).
5. **Vuurwerk boven de gracht:** fluit een duif bij de duiventil (de bestaande duivenmodus, `kind: 'pigeon'`) en vlieg boven de brug terwijl Ubbo de drie enveloppen uitdeelt: drie fotodoelen (brug, terras, sloep op de gracht), met het vuurwerk als licht.
6. **Wegwezen:** terug door het doolhof, of de korte weg: de gracht in en eruit aan de overkant ("Plons.").
7. **Outro** op straat in Uithuizen.

**Falen, overslaan, bezit**

- Gezien en gepakt: drie keer in een zaklampkegel binnen een gesprek (eerst een waarschuwing en terug naar het laatste punt, zoals H6).
- Een foto gemist: het vuurwerk duurt 90 s; daarna is de uitdeling voorbij. Je mag het duifdeel opnieuw proberen zonder de hele missie.
- **Overslaan** na één poging: de foto's staan op Tessa's telefoon, de outro speelt.
- Spelen als Tessa bij het duifbord lukt niet ("Ik ben geen duivenkoning. Ik ben de baas van de duivenkoning."): deze stap is altijd Tammo.

**Intro (cutscène).** *Camera:* De gracht bij nacht, lantaarns op het water; de camera glijdt over het water naar de brug (dolly op waterhoogte), stijgt dan over de haag het doolhof in en vindt Tammo plat tegen het groen. Cut naar Tessa in schort met dienblad in de keukeningang.

- **Tessa** *(fluisterend, via de telefoon)*: Ik ben binnen. Schort, dienblad, glimlach. Niemand vraagt wat.
- **Tammo** *(fluisterend, droog)*: Ik zit in een haag.
- **Tessa** *(fluisterend, plagend)*: Dat staat je.
- **Tammo** *(fluisterend)*: Er loopt iemand met een zaklamp.
- **Tessa** *(fluisterend, bazig)*: Dan sta je stil. Een haag beweegt niet.

**HUD-doelen (in volgorde):** "Sluip door het doolhof" → "Luister het gesprek af (blijf ongezien)" → "Fluit een duif bij de duiventil" → "Fotografeer de enveloppen van boven" → "Wegwezen: terug door het doolhof, of de gracht in"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tessa** *(fluisterend, via de telefoon)*: Links, bij het prieel. Ubbo en een man in een ruitjeshemd.
- **Eppo Bolt** *(grinnikend, zacht)*: Wat krijg ik ervoor, Ubbo?
- **Ubbo Oldenhuis** *(zakelijk, vriendelijk)*: Een envelop, Eppo. En volgend jaar alle machines van het Westerkwartier erbij.
- **Tessa** *(fluisterend)*: Nummer twee. Een man met een slagersschort. Op een feest.
- **Slager Ruurd** *(nors, zwijgzaam)*: Hoeveel?
- **Ubbo Oldenhuis** *(joviaal, zacht)*: Genoeg om niks te zeggen, Ruurd. Dat kun jij goed.
- **Tessa** *(fluisterend)*: Nummer drie. De kermisbaas. Hij is zenuwachtig.
- **Kermisbaas Hennie** *(nerveus, plechtig)*: Ubbo, ik ben voorzitter. Ik moet eerlijk zijn.
- **Ubbo Oldenhuis** *(geamuseerd, vriendelijk dreigend)*: Dat ben je ook, Hennie. Eerlijk voor mij.
- **Tammo** *(fluisterend, droog)*: Drie enveloppen. Drie juryleden.
- **Tessa** *(fluisterend, scherp)*: Op de foto. Van boven. Achter de schuur staat een duiventil.
- **Tammo** *(zacht, fluit)*: Kom maar.
- **Tessa** *(opgewonden, fluisterend)*: Vuurwerk. Nu ziet iedereen omhoog, en jij kijkt naar beneden.
- **Tammo** *(droog, geconcentreerd)*: Brug. Terras. De sloep. Klik, klik, klik.
- **Tessa** *(gehaast)*: Ze tellen hun stewards. Wegwezen.
- **Tammo** *(droog)*: De gracht is korter.
- **Tessa** *(fluisterend, waarschuwend)*: Tammo. Niet de gracht.

**Scène: Het terras van de borg.** *Camera:* Over de schouder van Tessa met het dienblad; scherpte verspringt van de glazen naar Ubbo aan zijn tafel. Ubbo kijkt op, de camera blijft op zijn ooghoogte, langzaam inzoomend terwijl hij praat.

- **Ubbo Oldenhuis** *(geamuseerd, kijkt op)*: Jij bent niet van de catering.
- **Tessa** *(koel, glimlachend)*: Ik ben van de friet.
- **Ubbo Oldenhuis** *(joviaal, onder de indruk)*: De Fjord Frituur. Dat wagentje.
- **Ubbo Oldenhuis** *(zakelijk, warm)*: Jij kunt verkopen. Dat zie ik aan hoe je dat blad draagt.
- **Tessa** *(droog)*: Het is een blad.
- **Ubbo Oldenhuis** *(vriendelijk dreigend)*: Alles is verkopen, meisje. Ik onthoud gezichten. `[clue]`
- **Tessa** *(koel)*: Ik ook.

**Outro (cutscène).** *Camera:* Weerspiegeling van het vuurwerk in een plas op straat; de camera tilt omhoog naar Tammo, druipend, en Tessa nog in schort. Ze lopen weg van de borg; trage track ernaast, met het laatste vuurwerk achter ze.

- **Tessa** *(droog)*: Je bent nat.
- **Tammo** *(droog)*: Er zat een gracht om.
- **Tessa** *(droog)*: Daar is hij voor.
- **Tammo** *(droog, tevreden)*: Drie juryleden. Drie enveloppen. En de duif heeft het allemaal.
- **Tessa** *(zakelijk)*: Zet maar op mijn telefoon.
- **Tammo** *(zacht)*: Hij zei "meisje" tegen je.
- **Tessa** *(koel)*: Ik zei niks terug.
- **Tammo** *(droog, trots)*: Dat is het ergste wat jij kunt doen.
- **Tessa** *(zacht, met een glimlach)*: …Ja.

**Bij herhaling (als klus)**

- **Ubbo Oldenhuis** *(geamuseerd, joviaal)*: Weer bediening tekort? Ik huur jou wel in, meisje.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(zuchtend)*: Ze zetten je eruit. Met je pet.
- **Tammo** *(droog)*: De pet blijft.

**Kiekdoar:** "Tuinfeest in de Menkemaborg: vuurwerk boven de gracht, één gast in de gracht. Gastheer: "Niemand die nat werd, was uitgenodigd.""

**Afrondingskaart:** **BORGFEEST** · Drie juryleden, drie enveloppen, één natte Stadjer. · *+ € 2000*

**Autogesprek `o5-pass-gezichten` (after:O5:pass)**

- **Tammo** *(dry, uneasy)*: "Ik onthoud gezichten." Wat bedoelt hij daarmee?
- **Tessa** *(dry)*: Dat ik verkopen kan.
- **Tammo** *(dry)*: Dat wist ik al.

**Autogesprek `o5-pass-gracht` (after:O5:pass)**

- **Tessa** *(teasing)*: Je hebt de borg van achteren gezien. En van onderen.
- **Tammo** *(dry, wet)*: De gracht is zestig centimeter. Ik heb gestaan.
- **Tessa** *(laughing)*: Op je knieën.

**Autogesprek `o5-fail` (after:O5:fail)**

- **Tessa** *(dry)*: Een haag beweegt niet, zei ik.
- **Tammo** *(dry)*: Hij niesde. Ik niet.

**"Wat weten we?"** *Drie enveloppen* (clue): Op de foto's van de duif: Ubbo geeft drie enveloppen aan de jury van Uithuizen. Eppo Bolt, slager Ruurd en kermisbaas Hennie. Hennie wilde eerlijk zijn. "Eerlijk voor mij," zei Ubbo. · *Ik onthoud gezichten* (hart): Ubbo tegen Tessa, op het terras: "Jij kunt verkopen. Alles is verkopen, meisje." Tessa zei niks terug. Tammo vond dat het ergste wat ze kan doen.

### O6 · Eén ei per wierde

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| getimed rijden (breekbaar), verdedigen, bakken | Hogeland | Tammo | De kermis in Uithuizen, de kraam van de Fjord Frituur (zaterdagmiddag) | € 2500 | `O6` / missie `wierde-ei` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Ik haal de eieren. Remmen voor eieren, daar ben ik bekend om.

**Lead (telefoon)**

- **Tessa** *(gehaast, aan de telefoon)*: Voorronde één. Uithuizen. Eieren uit vijf wierdedorpen, vers, voor vier uur. Geesje heeft de adressen. Jij rijdt, ik zet de kraam op.

**Bel Rikus (beller: Ubbo, Oldenhuis Bakt)**

- **Rikus** *(warm, als nacht-dj op de radio, kermislawaai)*: Nachtstreek, op tournee. Ik sta op de kermis in Uithuizen, naast een zweefmolen. De zweefmolen wint.
- **Rikus** *(droog, leest voor, als nacht-dj op de radio)*: Reglement, voorronde één: de eierbal is van streekeieren. Vers. Uit vijf wierdedorpen. Wie bedenkt zoiets?
- **Ubbo Oldenhuis** *(joviaal, zelfvoldaan, aan de telefoon op de radio)*: Ik, Rikus. Streekproducten. Daar houden mensen van.

**Route en plekken.** Kermis Uithuizen (centrum; het exacte kermisterrein uit OSM of de gemeentelijke kermislocatie) → vijf erven in vijf wierdedorpen, vrije volgorde: **Oldenzijl** (ten noordoosten), **Zandeweer**, **Rottum**, **Kantens** (ten zuidwesten, dicht bij elkaar), **Usquert** (ten westen) → terug naar de kermis. Samen ± 22 km over smalle wegen: met de Fjord (± 25 m/s op de provinciale stukken) 6-7 minuten. De erven zijn fictief, de dorpen echt.

**Verloop**

1. **Instappen in de Fjord Frituur** (eigen auto). Er staan vijf lege eierdozen op de passagiersstoel.
2. **Vijf erven, vrije volgorde.** Bij elk erf stoppen (binnen 4 m van de boer, < 1 m/s): een regel van de boer, tien eieren erbij. **Breekbaar** zoals het decor in H7: elke klap breekt eieren (per 1,8 per km/u boven 25). **Minstens 30 van de 50** moeten heel aankomen.
3. **Tijd:** vóór vier uur (in speltijd; ± 7 minuten echte tijd). Eppo's loonwerkkonvooien rijden op de smalle wegen (hinder, net als O3).
4. **Terug op de kermis: verdedigen.** Tessa bakt. Eppo's knecht trekt drie keer de stroomkabel van het aggregaat los. **Ren erheen** (te voet, ≤ 20 s per keer, anders koelt het vet af; de vetmeter op de HUD), steek de stekker terug (E) en jaag de knecht weg (duwen of achterna rennen).
5. **Jury** (scène): Tessa legt haar telefoon op de jurytafel. Uitslag.

**Falen, overslaan, bezit**

- Minder dan 30 eieren heel, of te laat (na vier uur).
- Het vet is te koud geworden (stroom te lang los: de vetmeter onder de streep).
- **Overslaan** na één poging, per stuk: alleen de eierrit (dan begin je bij de kraam), of de hele missie.
- **Geld blokkeert niets:** de eieren zijn gratis ("Trijntje betaalt. Dat zegt Geesje.").

**Intro (cutscène).** *Camera:* POV vanuit een zweefmolenstoeltje dat rondzwiert; de camera zwaait uit de rondgang naar beneden (whip) op twee kramen naast elkaar: de kleine blauwe Fjord Frituur en de grote gele kraam van Oldenhuis Bakt. Daarna two-shot Ubbo en Tessa over de toonbank, Tammo met de lege eierdozen tussen hen in.

- **Ubbo Oldenhuis** *(joviaal)*: Buren. Gezellig.
- **Tessa** *(koel)*: Jouw kraam is groter.
- **Ubbo Oldenhuis** *(zelfvoldaan)*: Al mijn kramen zijn groter. Dat is het idee.
- **Tammo** *(droog, met eierdozen)*: Wij hebben eieren nodig.
- **Ubbo Oldenhuis** *(geamuseerd)*: Ik heb ze al. Uit een legbatterij bij Veendam. Dat is ook streek.
- **Tessa** *(scherp)*: Dat is geen wierde.
- **Ubbo Oldenhuis** *(vriendelijk dreigend)*: Het staat niet in het reglement wat een wierde is. Ik heb het reglement geschreven.
- **Ubbo Oldenhuis** *(joviaal)*: Succes. Je hebt tot vier uur.

**HUD-doelen (in volgorde):** "Stap in de Fjord Frituur" → "Haal eieren in vijf wierdedorpen (minstens 30 heel)" → "Terug naar de kermis in Uithuizen, voor vier uur" → "De stroom ligt eruit! Stekker erin (E)" → "Jaag de knecht van het aggregaat weg"

**De vijf erven (één regel per erf, bij het stoppen)**

- **Boer** *(droog, hartelijk)*: Oldenzijl. Tien stuks. Mijn kippen leggen op een wierde. Ze weten niet beter.
- **Boerin** *(droog)*: Zandeweer. Ze zijn nog warm. Niet van de kip, van de zon.
- **Boer** *(nors maar goedmoedig)*: Rottum. Tien eieren. Geen rekening. Trijntje heeft al betaald, in 1953.
- **Boerin** *(hartelijk, kletserig)*: Kantens. Rustig rijden, hè. Op de brug bij de kerk staat altijd een kip.
- **Boer** *(droog)*: Usquert. Hier. En zeg tegen Eppo dat zijn konvooi mijn hek heeft geraakt.

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tessa** *(gehaast, via de telefoon)*: Vijf erven. Geesje zegt: de volgorde maakt niet uit, als je maar niet remt als een Stadjer.
- **Tammo** *(droog, rijdend)*: Hoe remt een Stadjer?
- **Tessa** *(snel)*: Te laat, en dan boos op de fiets.
- **Tammo** *(geschrokken)*: Gat in de weg. Zeven eieren.
- **Tessa** *(ongeduldig)*: Tammo. Tám-mo. Je hebt nog tweeëntwintig minuten en eenendertig eieren.
- **Tammo** *(droog, gespannen)*: Ik hou ze vast met mijn gedachten.
- **Tessa** *(paniekerig, achter de kraam)*: De stroom! De pan koelt af!
- **Tammo** *(buiten adem)*: Ik zie hem. Een knecht van Eppo. Met de kabel in zijn hand.
- **Tessa** *(fel)*: Stekker erin, en hem eruit!
- **Tammo** *(droog, hijgend)*: Hij rent. Laat hem rennen. Hij heeft de stekker niet meer.
- **Tessa** *(opgelucht, bakkend)*: Honderdtachtig graden. We bakken weer.

**Outro (cutscène).** *Camera:* Lage hoek achter de jurytafel, stoom van de eierballen in het tegenlicht; scherpte verspringt van juror naar juror, met Ubbo onscherp op de achtergrond bij zijn eigen kraam. Bij Eppo's beurt zoomt de camera in op de telefoon op tafel (de foto van de envelop). Aan het eind een trage tilt naar Geesje in het publiek.

- **Tessa** *(koel, zacht)*: Ik leg mijn telefoon hier even neer. Niet op letten.
- **Slager Ruurd** *(nors, kauwend)*: …Goud.
- **Kermisbaas Hennie** *(nerveus, plechtig, kijkt naar de telefoon)*: Valt mie nait of. *(Dat valt me niet tegen.)*
- **Eppo Bolt** *(stug, met tegenzin)*: …Ow.
- **Tessa** *(droog)*: Trede één. Dat telt ook.
- **Kermisbaas Hennie** *(luid, plechtig)*: De voorronde Hogeland gaat naar… de Fjord Frituur!
- **Ubbo Oldenhuis** *(applaudisseert langzaam, joviaal)*: Eén van zeven. Ik heb er eenenveertig.
- **Tammo** *(droog)*: Wij hebben er één. Die is warm.
- **Kosteres Geesje** *(droog, warm, uit het publiek)*: Ik meld alleen. Maar dit meld ik graag.

**Bij herhaling (als klus)**

- **Ubbo Oldenhuis** *(geamuseerd)*: Weer eieren rapen? Ik koop ze gewoon. Scheelt rijden.

**Mislukt** (na het "Sikkom."-scherm)

- **Tammo** *(droog, verslagen)*: Roerei.
- **Tessa** *(zacht, wanhopig)*: Voor de jury. Ze kijken.

**Berichten na afloop:** *U. Oldenhuis*: "Gefeliciteerd. Eén. – U.O."

**Kiekdoar:** "Fjord Frituur wint voorronde Hogeland op de kermis in Uithuizen. Jurylid en loonwerker: "Ow." Stroomstoring op de kermis: drie keer, op één kraam."

**Afrondingskaart:** **EÉN EI PER WIERDE** · Voorronde Hogeland: gewonnen. Eén van zeven. · *+ € 2500*

**Autogesprek `o6-pass-ow` (after:O6:pass)**

- **Tessa** *(laughing)*: Eppo zei "ow". Ik heb het opgenomen.
- **Tammo** *(dry)*: Voor de kleinkinderen.
- **Tessa** *(quick, then caught)*: Voor de… voor de radio, Tammo.
- **Tammo** *(dry, small smile)*: Ik zeg niks.

**Autogesprek `o6-pass-een` (after:O6:pass)**

- **Tessa** *(excited)*: Eén voorronde. Nog zes. En dan in elk dorp een kraam.
- **Tammo** *(dry)*: Eén voorronde. En de Vismarkt terug. Dat was het plan.
- **Tessa** *(quick)*: Dat is plan A. Ik heb ook een plan B.
- **Tammo** *(dry)*: Die is altijd groter.

**Autogesprek `o6-fail` (after:O6:fail)**

- **Tammo** *(dry)*: Een kip op de brug in Kantens. Ze had gelijk.
- **Tessa** *(exasperated)*: Je remde voor een kip en niet voor het gat erna.

**"Wat weten we?"** *Voorronde Hogeland* (clue): Gewonnen in Uithuizen. De jury durfde niet anders: Tessa's telefoon lag op tafel, met de foto van de enveloppen. Ubbo applaudisseerde. "Eén van zeven."

### Tussendoor: Een filiaal in Warffum (`n-warffum`)

Speler: Tessa. Doel: `{ type: 'filiaal', at: 'warffum' }   // NEW: walk up to the spot; the scene plays, the filiaal and the safehouse open`.

**Wissel**

- **Tessa** *(enthousiast)*: Ik regel het filiaal. Jij mag het bed testen.

**Lead**

- **Tammo** *(droog, aan de telefoon)*: Jakob zegt: de kamer boven het café is van ons, zolang we willen. En hij heeft een luik in zijn pui.

**Zegt de companion bij de start**

- **Tammo** *(droog)*: Een luik in een pui. Dat is hoe het bij ons ook begon.

**Scène: Café van Jakob, Warffum.**

- **Kroegbaas Jakob** *(gemoedelijk)*: De kamer boven is van jullie. Het bed kraakt. Het is een oud bed.
- **Tessa** *(enthousiast)*: En het luik in de pui? Een Fjord Frituur in Warffum.
- **Kroegbaas Jakob** *(droog)*: Op vrijdag. Na de bingo.
- **Tessa** *(enthousiast, snel)*: Eén in Stad, één in Warffum. Dat is het begin.
- **Tammo** *(droog)*: Van wat?
- **Tessa** *(stellig)*: Van zeven.
- **Tammo** *(droog, zacht)*: Of van twee. Twee is ook een mooi getal.
- **Kroegbaas Jakob** *(gemoedelijk)*: Geesje zegt: de Hogelander eierbal met kerkland-paneermeel. Ze heeft het recept al opgeschreven. Op de achterkant van een liedblad.

**Klaar (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Filiaal één: Warffum. Op vrijdag, na de bingo. Het bed kraakt.

**HUD-meldingen:** "Filiaal geopend: Fjord Frituur Warffum" · "Safehouse: de kamer boven het café (garage voor één auto)" · "Nieuw recept: de Hogelander eierbal"

### Ring 1 · De Eemsdelta

Bondgenoot **Lammert** (sluiswachter bij Delfzijl, melder), tegenstander **Siebrand Mulder** (havenbaas). De eerste aankomst is altijd per trein (n-delfzijl). Safehouse na O10: het woonschip in de haven van Delfzijl.

### Tussendoor: Met de trein naar Delfzijl (`n-delfzijl`)

Speler: Tessa. Doel: `{ type: 'train', to: 'Delfzijl', line: 'delfzijl', cab: 'jantina' }   // the first ride may always be by train (plan §3.7); cab optional`.

**Wissel**

- **Tessa** *(bazig, vrolijk)*: Ik koop de kaartjes. Jij vergeet altijd retour.

**Lead**

- **Tammo** *(droog, aan de telefoon)*: Lammert stuurde een sms. "Ik zit bij de zeesluis. Elke dag." De trein naar Delfzijl gaat elk halfuur.

**Zegt de companion bij de start**

- **Tammo** *(droog)*: Delfzijl. Daar zijn we als kind een keer geweest.

**Scène: Delfzijl, op de dijk.** *Camera:* Vanaf het perron achter het duo aan de dijk op; de camera stijgt mee boven de kruin uit en onthult in één beweging de Eems, de haven en molen Adam. Als Tessa praat, draait de camera naar hun gezichten met het water erachter.

- **Tessa** *(warm, nostalgisch)*: Delfzijl. Weet je nog? Jij zei dat de zee achter de dijk lag.
- **Tammo** *(droog)*: Hij ligt er ook.
- **Tessa** *(zacht, verrast, bovenaan de dijk)*: …Hij ligt er echt.
- **Tammo** *(droog, met een glimlach)*: Een beetje.

**Klaar (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Lammert zit in het huisje bij de zeesluis. Hij zwaaide al. Hij zag ons van ver.

**Nachtstreek, daarna (de enige keer dat Rikus iets zegt over de gaswinning; zonder grap)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Vanavond vanuit de Eemsdelta.
- **Rikus** *(ernstig, rustig, als nacht-dj op de radio)*: Wie hier met de trein doorheen rijdt, ziet balken tegen gevels en huizen in de steigers. Daar wonen mensen die al jaren wachten op een gewoon huis.
- **Rikus** *(ernstig, zacht, als nacht-dj op de radio)*: Daar maak ik geen grap over. Ik zeg alleen dat ze er wonen. En dat ze ook luisteren. Goedenavond, Eemsdelta.

### O7 · Lammert schuift

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| boot, sluipen op het water, vlucht | Eemsdelta | Tessa | Het sluiswachtershuisje bij de zeesluis aan het eind van het Eemskanaal (Farmsum/Delfzijl), schemer | € 2000 | `O7` / missie `sluis` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(zelfverzekerd)*: Ik vaar. Jij kijkt door de verrekijker en zegt wat je ziet.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Lammert zit in het sluiswachtershuisje. Hij heeft een bootje, en een verrekijker. Hij wil ons iets laten zien.

**Bel Rikus (beller: Lammert, zeesluis)**

- **Sluiswachter Lammert** *(oud, traag, aan de telefoon op de radio)*: Rikus. Lammert, zeesluis Delfzijl. Er ligt een kustvaarder in de haven die 's nachts lost. Zonder lampen. Ik meld alleen.
- **Rikus** *(verbaasd, als nacht-dj op de radio)*: Lammert, ben jij familie van de torenwachter?
- **Sluiswachter Lammert** *(oud, droog, aan de telefoon op de radio)*: Iedereen die hoog zit of bij het water, is familie. Ik meld alleen.

**Naamkaarten:** SLUISWACHTER LAMMERT: *"Eenennegentig. Doet de deuren dicht. Op tijd."*; SIEBRAND MULDER: *"Havenbaas. Alles is openbaar, tot hij het koopt."*

**Route en plekken.** Sluiswachtershuisje bij de zeesluizen van Farmsum (eind van het Eemskanaal) → schutten naar de zeehaven → door het Zeehavenkanaal oostwaarts naar de Oosterhornhaven (industriehaven, fictieve kustvaarder "Noorderling II" aan een fictieve kade) → terug dezelfde weg naar de sluis (± 2 km) met de ribs erachter. Exacte sluisligging, kaden en havennamen uit OSM (`waterway=lock_gate`, `landuse=port`).

**Verloop**

1. **Intro** in het huisje.
2. **Instappen** in Lammerts dienstbootje in de sluiskolk; korte schutting (Lammert doet de deuren, 15 s, overslaanbaar met Spatie).
3. **Varen naar de Oosterhornhaven** in de schemer, lichten uit (een knop: varen zonder navigatielichten maakt je minder zichtbaar, maar de waterpolitie ziet het als overtreding, 1 ster als ze je zien).
4. **Sluipen op het water:** drie zoeklichtkegels op de kade en het schip. Kom binnen 30 m van drie dingen en blijf 4 s stil en in het donker: Tammo fotografeert (1) vaten met **OB** gestempeld (vet), (2) kratten sigaretten, (3) een open palingtank. Op het derde doel gaat altijd een zoeklicht aan (scripted, ook als je perfect was).
5. **Vlucht:** twee ribs van Siebrand. **Rompmeter** van het bootje (rammen kost 20 %). Siebrand praat via de marifoon (naamkaart bij zijn eerste zin).
6. **Setpiece bij de sluis:** Lammert houdt de buitendeuren open; je vaart erdoor, de deuren sluiten achter je in slow motion (1,5 s), de eerste rib botst tegen het hout.
7. **Outro** in het huisje.

**Falen, overslaan, bezit**

- De rompmeter is op (het bootje zinkt).
- Gepakt tijdens het sluipen (drie keer in een zoeklicht vóór het derde doel).
- Te laat bij de sluis: Lammert kan de deuren 4 minuten open houden ("Langer niet. Dan komt er een schip, en dat is wel echt.").
- **Overslaan** na één poging: je staat in de sluiskolk met de foto's.
- **Bezit:** het bootje is van Lammert (`handBack: { how: 'moor' }`). Na O10 krijg je een eigen boot bij het woonschip (safehouse), zie n-woonschip.

**Intro (cutscène).** *Camera:* Begint op de sluisdeuren die langzaam sluiten, water dat kolkt; tilt omhoog langs de wal naar het raam van het huisje, waar Lammert zit met een radio en een kop koffie. Dolly naar binnen door de deur; Lammert kijkt niet op.

- **Sluiswachter Lammert** *(oud, traag, onverstoorbaar)*: Jij bent van Trijntje. Je loopt net als zij. Snel, en de verkeerde kant op. `[naamkaart: lammert]`
- **Tammo** *(droog)*: Dat is Tessa. Die loopt zo.
- **Sluiswachter Lammert** *(oud, droog)*: Dan lopen jullie allebei zo.
- **Tessa** *(nieuwsgierig)*: U danste met haar.
- **Sluiswachter Lammert** *(warm, droog)*: Ik schoof. In 1953. Eén keer. Ze trapte op mijn voet en zei sorry. Daarna heeft ze nooit meer sorry gezegd. `[camera: close]`
- **Tammo** *(droog)*: Dat klopt. Dat doet ze niet.
- **Sluiswachter Lammert** *(zakelijk, traag)*: Daar. Aan de Oosterhornhaven. De kustvaarder. Hij lost 's nachts, zonder lampen. Van Siebrand Mulder. Havenbaas, zegt hij.
- **Tessa** *(scherp)*: Wat lossen ze?
- **Sluiswachter Lammert** *(droog)*: Dat zie ik niet. Daar heb ik jullie voor.
- **Sluiswachter Lammert** *(oud, kalm)*: Neem mijn bootje. Gaat het mis, kom dan terug door mijn sluis. Ik doe hem voor jullie open. En daarna dicht.

**HUD-doelen (in volgorde):** "Stap in Lammerts bootje" → "Vaar naar de Oosterhornhaven (lichten uit)" → "Fotografeer wat ze lossen (blijf in het donker)" → "Terug naar de zeesluis!" → "Door de sluisdeuren, voor ze sluiten"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(fluisterend, door de verrekijker)*: Vaten. Er staat OB op gestempeld.
- **Tessa** *(fluisterend)*: Oldenhuis Bakt. Klik.
- **Tammo** *(fluisterend)*: Kratten. Sigaretten. Heel veel sigaretten.
- **Tessa** *(fluisterend, droog)*: Voor een snackbar.
- **Tammo** *(fluisterend, verbaasd)*: Een tank. Er zwemt iets in. Paling. Levend.
- **Tessa** *(fluisterend, scherp)*: Vet, sigaretten en paling. Klik.
- **Tammo** *(geschrokken)*: Licht! Ze zien ons!
- **Tessa** *(fel)*: Vasthouden, Tammo. Terug naar Lammert.
- **Tammo** *(gespannen, kijkt om)*: Twee boten. Snelle boten.
- **Tessa** *(vastberaden)*: Wij zijn klein. Klein draait sneller.
- **Tammo** *(opgelucht, roepend)*: De deuren staan open! Hij wacht!

**Scène: Marifoon, kanaal tien.** *Camera:* Close op de marifoon in het bootje, het rode lampje knippert bij elke zin van Siebrand; tussendoor achtervolgingsbeeld van achteren, de ribs met hun koplampen in het water.

- **Siebrand Mulder** *(kil, zakelijk, door de marifoon)*: Kleine boot, hier Siebrand Mulder, havenbaas. Jullie zijn in mijn haven. `[naamkaart: siebrand]`
- **Tessa** *(fel, in de marifoon)*: Het is een openbare haven.
- **Siebrand Mulder** *(kalm, dreigend, door de marifoon)*: Alles is openbaar. Tot ik het koop.
- **Siebrand Mulder** *(woedend, beheerst, door de marifoon)*: Lammert! Deuren open! Dat is een bevel!
- **Sluiswachter Lammert** *(oud, onverstoorbaar, door de marifoon)*: Ik meld alleen. Ik beveel niks. De sluis is dicht. Volgende schutting morgen om zes.

**Outro (cutscène).** *Camera:* Buiten het huisje, nacht: de dichte sluisdeuren, aan de overkant de koplampen van de ribs die zich omdraaien. Langzame dolly naar het raam; binnen zet Lammert een plaat op. De camera gaat naar binnen als de muziek begint.

- **Tammo** *(droog, onder de indruk)*: U deed de deuren dicht. Voor zijn neus.
- **Sluiswachter Lammert** *(droog, tevreden)*: Ik deed ze op tijd dicht. Dat is mijn werk. Zijn neus is zijn werk.
- **Tessa** *(zacht)*: Lammert. Wat bent u oma schuldig?
- **Sluiswachter Lammert** *(zacht, ontroerd)*: Een dans. Ze zei: dan dans je maar met iemand anders. Dat heb ik nooit gedaan.
- **Tammo** *(zacht)*: Zeventig jaar.
- **Sluiswachter Lammert** *(warm, droog)*: Ik ben sluiswachter. Wachten kan ik.
- **Tessa** *(zakelijk, zacht)*: Vet met OB erop. Sigaretten. En paling, levend.
- **Sluiswachter Lammert** *(oud, droog)*: Siebrand haalt het binnen. Oldenhuis bakt het. Ik meld alleen. `[clue]`

**Bij herhaling (als klus)**

- **Sluiswachter Lammert** *(oud, droog)*: Weer de haven in? Ik zet de deuren alvast op een kier.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: Hij heeft onze boot.
- **Tammo** *(droog)*: Lammerts boot.
- **Tessa** *(zacht)*: Dat maakt het erger.

**Berichten na afloop:** *S. Mulder*: "Mooie foto's. Ik heb er ook een paar. Van jullie. – S.M."

**Kiekdoar:** "Zeesluis Delfzijl sluit om onduidelijke reden vervroegd. Sluiswachter: "Op tijd. Niet vervroegd.""

**Afrondingskaart:** **LAMMERT SCHUIFT** · Vet, sigaretten en paling. De sluis ging op tijd dicht. · *+ € 2000*

**Autogesprek `o7-pass-dans` (after:O7:pass)**

- **Tessa** *(soft)*: Zeventig jaar wachten op één dans.
- **Tammo** *(dry)*: Hij wacht graag. Het is zijn vak.
- **Tessa** *(teasing, warm)*: Jij wachtte twaalf jaar.
- **Tammo** *(dry)*: Ik ben geen sluiswachter. Ik ben gewoon traag.

**Autogesprek `o7-pass-paling` (after:O7:pass)**

- **Tammo** *(puzzled)*: Waarom smokkel je paling?
- **Tessa** *(dry)*: Omdat het mag. Nee. Omdat het niet mag.

**Autogesprek `o7-fail` (after:O7:fail)**

- **Tammo** *(dry)*: Lammert zei: kom terug door mijn sluis. Niet: kom terug zonder boot.

**"Wat weten we?"** *De kustvaarder* (clue): In de Oosterhornhaven lost een kustvaarder van Siebrand Mulder 's nachts, zonder lampen: vaten frituurvet met OB erop, kratten sigaretten, en levende paling. "Siebrand haalt het binnen. Oldenhuis bakt het." · *Lammert schoof* (hart): In 1953 danste Lammert één keer met Trijntje. Ze zei: "Dan dans je maar met iemand anders." Hij heeft het nooit gedaan. "Wachten kan ik."

### O8 · Vet in de container

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| sluipen, kraan | Eemsdelta (Eemshaven) | Tammo | De vuurtoren van Eemshaven (nacht) | € 2200 | `O8` / missie `container` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Ik ga wel. In het donker ben ik niet te zien. Op een pet na.

**Lead (telefoon)**

- **Tessa** *(samenzweerderig, aan de telefoon)*: Lammert heeft drie containernummers uit zijn logboek. Siebrand zet het vet door naar Eemshaven. We zien elkaar bij de vuurtoren.

**Bel Rikus (beller: Henk, Garage Knalpot)**

- **Henk** *(gemoedelijk, aan de telefoon op de radio)*: Rikus. Henk, Garage Knalpot. Die twee van de frietwagen. Er zit nog een zender in hun bak. Van mij.
- **Rikus** *(droog, als nacht-dj op de radio)*: Wat moeten ze ermee, Henk?
- **Henk** *(gemoedelijk, wetend, aan de telefoon op de radio)*: Ik vraag niet waarom. Schroefje los, onder het dashboard.

**Route en plekken.** Vuurtoren Eemshaven (de rood-witte toren bij de haveningang; OSM `man_made=lighthouse`) → het hek van de **Wolkenhal** (fictief datacenter, "de grote grijze dozen") → over het terrein naar de containerterminal (fictieve **Noorderterminal**) → de containerkraan (ladder, 50 m) → de stapel met het doelcontainer → weg over de zeedijk. Reizen naar Eemshaven: de trein (Roodeschool–Eemshaven) of rijden met "Rijd me erheen"; de missie start pas bij de vuurtoren.

**Verloop**

1. **Haal Henks zender** onder het dashboard van de Fjord (E bij de auto, 3 s). Continuïteit: Henk zette hem erin in de Kop (k-nacht).
2. **Langs de Wolkenhal**: scène met Durk en Douwe als bewakers. Ze kijken de andere kant op.
3. **Sluip over de terminal** (stealth, zes bewakers met zaklampen, straddle carriers die rijden: geraakt = terug naar het laatste punt).
4. **Klim in de containerkraan** (ladder, 20 s, stilstaan als er licht langskomt).
5. **Kraanspel:** drie containers liggen op het doelcontainer (nummer eindigt op 38). Til ze één voor één met de spreader naar een lege plek (`crane`: links/rechts, hijsen, vieren, vastklikken; schommelen dempen). Laat je er één vallen, dan gaat het alarm (een fail-waarschuwing; tweede keer is fail).
6. **Naar beneden**, open de container (kniptang, E), foto (vaten OB) en plak de zender eronder.
7. **Weg**: over het hek bij de dijk. Durk en Douwe "achtervolgen" op een fatbike, op afstand.
8. **Outro** op de dijk bij zonsopgang.

**Falen, overslaan, bezit**

- Gepakt: drie keer gezien in één fase.
- Twee containers laten vallen.
- Zonsopgang: de klok (speltijd 05:40) loopt af.
- **Overslaan** na één poging: de zender zit eronder, de outro speelt.
- **Duiven** zijn niet nodig; dit is Tammo te voet.

**Intro (cutscène).** *Camera:* De vuurtoren draait zijn bundel over het beeld; bij elke zwaai zie je meer: de turbines met rode lichten, de Wolkenhal, de kranen. De camera volgt de bundel tot hij Tammo vindt, die naast de Fjord ligt met zijn hoofd onder het dashboard.

- **Tessa** *(via de telefoon, fluisterend)*: Heb je hem?
- **Tammo** *(droog, onder het dashboard)*: Ik heb een schroefje. En een kauwgom van in de Kop.
- **Tessa** *(fluisterend, ongeduldig)*: De zender, Tammo.
- **Tammo** *(droog)*: Ook. Hij zat er de hele tijd. We hadden hem kunnen volgen.
- **Tessa** *(droog)*: Wie dan?
- **Tammo** *(droog)*: Onszelf. Als we kwijt waren.

**HUD-doelen (in volgorde):** "Haal Henks zender onder het dashboard (E)" → "Langs de Wolkenhal" → "Sluip naar de containerkraan" → "Klim de kraan in" → "Til de drie bovenste containers weg" → "Open de container en plak de zender eronder" → "Weg, over het hek bij de dijk"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tessa** *(fluisterend, via de telefoon)*: Bewaker links. Hij kijkt naar zijn telefoon. Nu.
- **Tammo** *(fluisterend)*: Er rijdt een ding over me heen. Op poten.
- **Tessa** *(fluisterend, zakelijk)*: Straddle carrier. Niet onder gaan liggen.
- **Tammo** *(buiten adem, op de ladder)*: Vijftig meter. Ik ben in d'Olle Grieze geweest. Die was hoger. Dat vond ik toen ook al niks.
- **Tessa** *(fluisterend)*: Wat zie je?
- **Tammo** *(zacht, onder de indruk)*: Tweeduizend containers. En Duitsland.
- **Tessa** *(fluisterend, zakelijk)*: Nummer eindigt op achtendertig. Rood. Onderop.
- **Tammo** *(geconcentreerd)*: Eén eraf. Schommelt. Rustig, rustig.
- **Tessa** *(gespannen)*: Netjes. Nog twee.
- **Tammo** *(droog, gespannen)*: Ik til een container. Mijn moeder mag dit nooit weten.
- **Tessa** *(fluisterend)*: Kniptang. Foto. Zender. En dan weg.
- **Tammo** *(fluisterend, tevreden)*: Vaten met OB. Klik. Zender zit.
- **Durk** *(traag, roepend vanaf een fatbike)*: Stop! …Stop.
- **Douwe** *(traag, trappend)*: Niet zo hard, Durk. Dan halen we hem in.

**Scène: De Wolkenhal.** *Camera:* Opent als beeld van een bewakingscamera (zwart-wit, tijdcode), dan een harde overgang naar een lage two-shot van Durk en Douwe in te kleine bewakersjasjes voor de grijze gevel. Langzame push-in op Douwe bij "…Hè."

- **Durk** *(traag, plechtig)*: Halt. Dit is de Wolkenhal. Wij bewaken de cloud.
- **Tammo** *(droog)*: Waar is hij?
- **Douwe** *(traag, na een lange stilte)*: …Hè.
- **Durk** *(traag, eerlijk)*: Overdag werken we voor Ubbo. 's Nachts voor de cloud.
- **Douwe** *(traag, trots)*: Twee banen. Eén brein.
- **Tammo** *(droog)*: Ik ben hier niet.
- **Durk** *(samenzweerderig, traag)*: Wij hebben niks gezien. Wij kijken naar de cloud.
- **Douwe** *(traag, kijkt omhoog)*: …De hele nacht.

**Outro (cutscène).** *Camera:* Zonsopgang achter de turbines; kraanshot omlaag van de wieken naar de zeedijk, waar Tammo en Tessa zitten met haar telefoon tussen hen in. Op het scherm beweegt een stip.

- **Tessa** *(zakelijk, moe)*: Het vet is van Ubbo, de container van Siebrand en de zender van Henk.
- **Tammo** *(droog, moe)*: En de nacht was van mij.
- **Tessa** *(kijkt naar haar telefoon)*: Hij beweegt. Een vrachtwagen. Over de dijk, naar Delfzijl.
- **Tammo** *(droog)*: Nu?
- **Tessa** *(ernstig)*: Er komt storm. Dan kijkt niemand.

**Bij herhaling (als klus)**

- **Durk** *(traag, plechtig)*: Wij bewaken nog steeds de cloud. Hij is er nog steeds niet.

**Mislukt** (na het "Sikkom."-scherm)

- **Tammo** *(droog, verslagen)*: Gezien. Door de cloud.
- **Tessa** *(zuchtend)*: De cloud ziet niks, Tammo.
- **Tammo** *(droog)*: Dan door die twee.

**Kiekdoar:** "Containerkraan in Eemshaven 's nachts in beweging. Terminal: "Niemand bediende hem. Hij heeft wel drie containers verzet. Netjes.""

**Afrondingskaart:** **VET IN DE CONTAINER** · Henks zender zit onder Siebrands container. En die rijdt. · *+ € 2200*

**Autogesprek `o8-pass-cloud` (after:O8:pass)**

- **Tessa** *(amused)*: Wat zeiden Durk en Douwe?
- **Tammo** *(dry)*: Dat ze de cloud bewaken.
- **Tessa** *(dry)*: En?
- **Tammo** *(deadpan)*: Hij is er nog.

**Autogesprek `o8-pass-henk` (after:O8:pass)**

- **Tessa** *(thoughtful)*: Die zender zat er sinds de Kop in. Henk heeft ons al die tijd kunnen volgen.
- **Tammo** *(dry)*: Henk vraagt niet waarom. Hij kijkt ook niet.

**Autogesprek `o8-fail` (after:O8:fail)**

- **Tammo** *(dry)*: Die container viel heel netjes.
- **Tessa** *(dry)*: Op het dak van een bewaker.
- **Tammo** *(dry)*: Hij stond er net naast.

**"Wat weten we?"** *De zender van Henk* (clue): Henk zette in de Kop een zender in de Escapade. Die zit nu onder een rode container met vaten OB in Eemshaven. Durk en Douwe bewaken 's nachts de Wolkenhal en hebben niks gezien.

### O9 · Storm op de Eems

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| achtervolging, politie, storm | Eemsdelta | Tessa | Holwierde, aan de dijkweg (nacht, windkracht 9) | € 2400 | `O9` / missie `storm` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(vastberaden)*: Ik rij. Jij kijkt naar de stip.

**Lead (telefoon)**

- **Tammo** *(gespannen, aan de telefoon)*: Henks zender rijdt over de dijkweg naar Delfzijl. Siebrand haalt zijn container weg, nu het stormt en niemand kijkt. Ik zie hem bij Bierum.

**Bel Rikus (beller: Lammert, zeesluis)**

- **Rikus** *(ernstig, droog, als nacht-dj op de radio)*: Code oranje voor de kust. Windkracht negen. De torenwachter belde: zijn toren beweegt. Hij meldt alleen.
- **Sluiswachter Lammert** *(oud, kalm, aan de telefoon op de radio)*: Rikus. Lammert. Ik doe de sluis dicht vannacht. Wie nu op de dijk rijdt, is gek of heeft haast.
- **Rikus** *(droog, als nacht-dj op de radio)*: En als het allebei is?
- **Sluiswachter Lammert** *(oud, droog, aan de telefoon op de radio)*: Dan ken ik ze.

**Route en plekken.** Start bij Holwierde aan de weg langs de Eemsdijk → noordwaarts de vrachtwagen tegemoet (bij Bierum) → keren en achtervolgen zuidwaarts over de dijkweg via Holwierde en Uitwierde naar Delfzijl → de Oosterhornhaven, waar Siebrands kustvaarder ligt. Totaal ± 7 km achtervolging (3-4 minuten). Welke weg precies langs of over de dijk loopt (en waar golven het asfalt kunnen halen) uit OSM + AHN bepalen; het spel mag het golfwater op een buitendijks stuk zetten.

**Verloop**

1. **Instappen** (eigen auto naar keuze; de Fjord mag, maar heeft een luik dat openwaait: de HUD waarschuwt). Een geleende auto staat klaar als je er geen hebt: Jakobs pick-up (`handBack`).
2. **De vrachtwagen tegemoet** bij Bierum, keren in de storm (zijwind duwt de auto: nieuwe `gust`-kracht op voertuigen).
3. **Achtervolging:** stop de vrachtwagen (banden kapotrijden of hem tegen de berm duwen: `hits` 6). Siebrand rijdt ernaast in zijn SUV en ramt je. **Golven** slaan op drie plekken over de weg (aquaplaning, 1,5 s geen grip). Turbines in de mist; bliksem laat ze even zien.
4. **Politie:** de regionale politie zit achter iedereen die zo rijdt (2 sterren vanaf het begin, ze blijven op afstand tot de vrachtwagen stilstaat).
5. **De vrachtwagen staat:** Siebrand springt uit zijn SUV in een rib aan de havenkade en vlucht het water op (scripted, niet te stoppen).
6. **Scène:** de agent bij de open container.

**Falen, overslaan, bezit**

- De vrachtwagen bereikt de kade bij de kustvaarder (container aan boord).
- Je auto is total loss of ligt in de Eems.
- Je wordt gearresteerd vóór de vrachtwagen stilstaat (na de stop is de politie juist je getuige).
- **Overslaan** na één poging: de vrachtwagen staat, de scène speelt.
- **Geen geld nodig:** de leenauto staat altijd klaar.

**Intro (cutscène).** *Camera:* Regen tegen de lens; een lange zijwaartse drone-track op dijkhoogte, de golven slaan links over de kruin, rechts de donkere polder. De koplampen van de vrachtwagen komen uit de mist; bliksem toont één seconde de turbines. Dan in de auto: Tessa's handen aan het stuur, Tammo's telefoon met de stip.

- **Tammo** *(gespannen, kijkt naar de stip)*: Hij komt eraan. Achthonderd meter.
- **Tessa** *(vastberaden)*: Ik zie hem. Twee lampen en een container.
- **Tammo** *(droog, nerveus)*: En een golf.
- **Tessa** *(geconcentreerd)*: Die zie ik ook.

**HUD-doelen (in volgorde):** "De vrachtwagen tegemoet, bij Bierum" → "Stop de vrachtwagen" → "Pas op: golven over de weg" → "Hou Siebrand van je af"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(geschrokken)*: Golf! Gas eraf!
- **Tessa** *(geconcentreerd)*: Niet remmen in het water. Rechtdoor.
- **Tammo** *(gespannen)*: Siebrand. Rechts. Hij duwt.
- **Tessa** *(fel)*: Laat hem duwen. Ik ben zwaarder dan ik eruitzie.
- **Tammo** *(droog, nerveus)*: Pliesie achter ons. Twee auto's.
- **Tessa** *(snel)*: Die komen straks goed uit. Eerst de vrachtwagen.
- **Tammo** *(onder de indruk)*: Band eraf! Hij slingert.
- **Tessa** *(strijdlustig)*: Nog één keer. Tegen de berm. Rustig.
- **Tammo** *(opgelucht)*: Hij staat. Hij staat stil.
- **Tessa** *(ongelovig)*: Siebrand springt in een boot. In dít weer.

**Scène: De dijkweg bij Delfzijl.** *Camera:* Handheld tussen de blauwe zwaailichten en de open containerdeuren, regen in het licht; de agent schijnt met een zaklamp op de vaten. Push-in op het stempel OB.

- **Agent** *(streng, kortaf, in de regen)*: Rijbewijs. …En wat zit er in die container?
- **Tessa** *(buiten adem)*: Vet. Van Oldenhuis.
- **Agent** *(droog, schijnt met zijn lamp)*: Dat staat er niet op.
- **Tammo** *(droog)*: Daarom.
- **Agent** *(droog, bekijkt het stempel)*: O. B. Op elk vat. `[clue]`
- **Agent** *(streng, maar mild)*: Jullie reden honderdtwintig op een dijk in een storm. Daar hebben we het morgen over. Nu eerst dit.

**Outro (cutscène).** *Camera:* De storm luwt; vanaf de sluis kijkt de camera over het water naar het Damsterdiep, waar ver weg een rib zonder lichten verdwijnt. Cut naar het huisje van Lammert: hij hangt op en schenkt twee koppen koffie in.

- **Sluiswachter Lammert** *(oud, kalm, aan de telefoon)*: De sluis is dicht. Daar is hij niet door. Hij is het Damsterdiep op, naar Appingedam.
- **Tessa** *(moe, vastberaden)*: Morgen is de voorronde in Appingedam.
- **Sluiswachter Lammert** *(droog)*: Dan weet je waar hij is. Hij zit in de jury. `[clue]`
- **Tammo** *(ongelovig)*: Siebrand?
- **Sluiswachter Lammert** *(oud, droog)*: Voorzitter. Ubbo vond hem betrouwbaar. Ik meld alleen.

**Bij herhaling (als klus)**

- **Sluiswachter Lammert** *(oud, droog)*: Weer storm? Dan zet ik koffie. Jullie komen toch.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: Weg. In de mist.
- **Tammo** *(droog)*: Met ons bewijs. En de zender van Henk.

**Berichten na afloop:** *U. Oldenhuis*: "Vet is maar vet. Ik heb meer. – U.O."

**Kiekdoar:** "Windkracht negen op de Eemsdijk. Politie vindt container vol frituurvet. Eigenaar onbekend. Op elk vat: OB."

**Afrondingskaart:** **STORM OP DE EEMS** · De container is van de politie. Siebrand is van het Damsterdiep. · *+ € 2400*

**Autogesprek `o9-pass-meer` (after:O9:pass)**

- **Tessa** *(dry)*: "Vet is maar vet. Ik heb meer." Dat zei Jelle ook.
- **Tammo** *(dry)*: Iedereen heeft altijd meer vet. Behalve wij.

**Autogesprek `o9-pass-golf` (after:O9:pass)**

- **Tammo** *(shaky, dry)*: Je reed door een golf.
- **Tessa** *(calm)*: Hij reed door ons. Ik reed gewoon door.

**Autogesprek `o9-fail` (after:O9:fail)**

- **Tessa** *(angry at herself)*: Ik had hem. Bij Uitwierde had ik hem.
- **Tammo** *(soft)*: Je had een golf. Dat is anders.

**"Wat weten we?"** *OB op elk vat* (clue): De politie heeft de container: vaten frituurvet met OB erop. "Eigenaar onbekend." Siebrand vluchtte in een rib het Damsterdiep op. Morgen zit hij in de jury van de voorronde in Appingedam. Als voorzitter.

### O10 · Hangende keukens

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| verdedigen, boot, bakken | Eemsdelta (Appingedam) | Tessa | Appingedam, de kade aan het Damsterdiep tegenover de hangende keukens (dinsdag 22 september, middag) | € 3000 | `O10` / missie `keukens` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(bazig, warm)*: Ik pak de boot. Jij bakt. Jij bakt beter als ik niet kijk.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Voorronde twee. Appingedam, bij de hangende keukens. Siebrand zit in de jury. Zijn boot ligt in het Damsterdiep.

**Bel Rikus (beller: Ubbo, Oldenhuis Bakt)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Ik sta op een brug in Appingedam. Onder mij hangen keukens boven het water. Al eeuwen. Niemand weet waarom ze niet vallen. Ik ook niet.
- **Ubbo Oldenhuis** *(joviaal, zakelijk, aan de telefoon op de radio)*: Rikus. Vandaag de voorronde Eemsdelta. Voorzitter van de jury is Siebrand Mulder. Havenbaas. Een man van de streek.
- **Rikus** *(droog, als nacht-dj op de radio)*: Werd die niet gezocht, Ubbo?
- **Ubbo Oldenhuis** *(geamuseerd, aan de telefoon op de radio)*: Eigenaar onbekend, stond er. Zo onbekend is hij niet.

**Route en plekken.** De kade aan het Damsterdiep in Appingedam, met de hangende keukens aan de overkant (Solwerderstraat-zijde; uit OSM) → het water tussen de brug (de Vrouwenbrug als uitkijkpunt) en de bocht stroomafwaarts → de rietkraag aan de rand van de stad. De kraam staat op de kade, de jurytafel op de brug.

**Verloop**

1. **Instappen** in Lammerts bootje (hij is erheen gevaren; hij zit in het publiek op de brug).
2. **Verdedigen in drie golven** (`defend` op het water): ribs en Siebrands werkboot met een rammende boeg varen op de kraam of de keukens af. Duw ze weg met je boot (rammen in de flank telt, frontaal niet), of laat ze in het riet lopen. Tammo bakt ondertussen (baktimer op de HUD: 3 x 60 s).
3. **Twee meters:** **Kraam** (raakt een boot de kade: -34 %) en **Keukens** (raakt iets de hangende keukens: -50 %; dit is een monument, zegt Tessa, en daar gaat ze niet over onderhandelen).
4. **Golf drie:** Siebrand verlaat de jurytafel en springt zelf in zijn werkboot. Duw hem drie keer in het riet; de **waterpolitie** komt de bocht om (scripted zodra hij vastzit).
5. **Jury:** de voorzittersstoel is leeg; de oudste op de brug neemt het over. **Outro.**

**Falen, overslaan, bezit**

- Kraam of keukens op 0.
- Je boot zinkt (rompmeter, zoals O7).
- **Overslaan** na één poging: Siebrand zit vast in het riet, de jury speelt.
- **Waterpolitie:** pas als Siebrand vastzit. Jijzelf krijgt geen ster (het is een verdediging, en de agente heeft het gezien).

**Intro (cutscène).** *Camera:* Begint onder de hangende keukens op waterhoogte, omhoog kijkend naar de houten balken en de bloembakken; de camera stijgt langs de gevels tot de brug met de jurytafel, waar Siebrand rustig gaat zitten en een servet in zijn kraag doet. Pan naar de kade: Tessa springt in het bootje, Tammo zet de pan aan.

- **Siebrand Mulder** *(kil, beleefd, aan de jurytafel)*: Voorzitter. Siebrand Mulder. Ik proef alles. Ik zie alles.
- **Tessa** *(koel, vanaf de kade)*: Ook containers?
- **Siebrand Mulder** *(kalm, glimlachend)*: Die zie ik niet. Daar heb ik mensen voor. Ze varen hier vandaag ook.
- **Tammo** *(droog, bij de pan)*: Hij heeft het over boten.
- **Tessa** *(strijdlustig, springt in het bootje)*: Ik ook.
- **Sluiswachter Lammert** *(oud, droog, vanaf de brug)*: Niet de keukens raken. Die hangen er al langer dan ik.

**HUD-doelen (in volgorde):** "Stap in Lammerts bootje" → "Hou de boten weg van de kraam en de keukens" → "Siebrand vaart zelf! Duw hem het riet in" → "De jury"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(gehaast, bij de pan)*: Eerste lading in het vet. Zestig tellen.
- **Tessa** *(strijdlustig)*: Rib van links. In de flank, niet van voren.
- **Tammo** *(droog)*: Hij zit in het riet. Hij is boos op het riet.
- **Tessa** *(fel, roepend)*: Niet de keukens! Dat is een monument!
- **Tammo** *(gespannen)*: Tweede lading. Ze komen met z'n tweeën.
- **Tessa** *(geconcentreerd)*: Twee is ook een mooi getal. Zei iemand.
- **Tammo** *(verrast)*: Siebrand staat op. Hij laat zijn servet liggen.
- **Tessa** *(vastberaden)*: Mooi. Dan heeft hij nog niks geproefd.
- **Tammo** *(opgelucht)*: Waterpolitie. Om de bocht. Met zwaailicht.

**Scène: Het riet bij Appingedam.** *Camera:* Lage shot vanaf het water: Siebrands werkboot schuin in het riet, de boot van de waterpolitie schuift in beeld met het zwaailicht dat over de keukens strijkt.

- **Agente** *(kordaat, zakelijk)*: Siebrand Mulder? Waterpolitie. We hebben een paar vragen over vaten. Met OB erop.
- **Siebrand Mulder** *(kil, beheerst)*: Ik zit in de jury.
- **Agente** *(droog)*: Niet meer.
- **Siebrand Mulder** *(woedend, beheerst, tegen Tessa)*: Ubbo heeft er nog veertig.
- **Tessa** *(koel)*: Wij hebben er één. En die hangt boven het water, heel.

**Outro (cutscène).** *Camera:* Van onder het water omhoog (spiegeling van de brug), dan op de brug: de lege voorzittersstoel, Lammert die er langzaam in gaat zitten. Close op zijn hand met de eierbal; daarna het publiek dat wacht, met Rikus en zijn microfoon aan de reling.

- **Rikus** *(droog, live, als nacht-dj op een brug)*: Ik krijg net door: de voorzitter is met de waterpolitie mee. Volgens het reglement jureert nu de oudste op de brug.
- **Sluiswachter Lammert** *(oud, droog)*: Dat ben ik. Ik ben overal de oudste.
- **Sluiswachter Lammert** *(oud, zacht, proeft)*: …Braid noar de zin. *(…Helemaal tevreden.)*
- **Tammo** *(zacht, onder de indruk)*: Trede vier.
- **Tessa** *(zacht)*: Hij had nog hoger gekund.
- **Sluiswachter Lammert** *(oud, droog, met een glimlach)*: Ik bewaar wat. Voor de finale.
- **Sluiswachter Lammert** *(oud, plechtig)*: De voorronde Eemsdelta gaat naar de Fjord Frituur. Ik meld alleen.

**Bij herhaling (als klus)**

- **Sluiswachter Lammert** *(oud, droog)*: Weer de voorronde? Ik ben nog steeds de oudste. Dat gaat vanzelf.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: De kraam ligt in het Damsterdiep.
- **Tammo** *(droog)*: De eierballen drijven. Dat is wel knap.

**Berichten na afloop:** *U. Oldenhuis*: "Twee. Ik heb er nog negenendertig. – U.O."

**Kiekdoar:** "Havenbaas uit Delfzijl tijdens voorronde in Appingedam meegenomen door de waterpolitie. Hangende keukens ongedeerd. Voorronde naar Stadse frietwagen."

**Afrondingskaart:** **HANGENDE KEUKENS** · Voorronde Eemsdelta: gewonnen. Twee van zeven. · *+ € 3000*

**Autogesprek `o10-pass-tellen` (after:O10:pass)**

- **Tessa** *(amused)*: "Ik heb er nog negenendertig." Hij telt verkeerd.
- **Tammo** *(dry)*: Hij telt snackbars. Wij tellen voorrondes.
- **Tessa** *(dry)*: Hij telt wat hij heeft. Wij wat we winnen.

**Autogesprek `o10-pass-braid` (after:O10:pass)**

- **Tammo** *(moved, hiding it)*: Braid noar de zin. Van een sluiswachter.
- **Tessa** *(soft)*: Hij bewaart de rest voor de finale.
- **Tammo** *(dry)*: Dan moeten we er nog komen.

**Autogesprek `o10-fail` (after:O10:fail)**

- **Tammo** *(dry)*: Ze varen hier al eeuwen langs die keukens. En wij raken ze in één middag.

**"Wat weten we?"** *Siebrand opgepakt* (clue): De waterpolitie nam Siebrand Mulder mee, midden in de voorronde, voor "vaten met OB erop". "Ubbo heeft er nog veertig," zei hij. · *Voorronde Eemsdelta* (clue): Gewonnen in Appingedam. Lammert jureerde als oudste op de brug: "Braid noar de zin." De rest bewaart hij voor de finale.

### Tussendoor: Een woonschip in Delfzijl (`n-woonschip`)

Speler: Tammo. Doel: `{ type: 'filiaal', at: 'delfzijl' }   // the woonschip (safehouse, own boat at the jetty) and the filiaal at the sluis`.

**Wissel**

- **Tammo** *(droog)*: Ik ga wel kijken. Ik ben de enige die niet zeeziek wordt van een woonschip.

**Lead**

- **Tessa** *(warm, aan de telefoon)*: Lammert heeft een sleutel voor ons. Van een woonschip in de haven. En hij wil een luik in zijn huisje.

**Zegt de companion bij de start**

- **Tessa** *(plagend)*: Een woonschip. Dan heb jij eindelijk een huis dat ook weg kan rijden.

**Scène: Het woonschip, Delfzijl.** *Camera:* Avond op het dek, de sluis met haar lampjes in de verte. Trage dolly langs de reling naar het duo op twee klapstoeltjes; geen muziek, alleen water en een meeuw.

- **Sluiswachter Lammert** *(oud, droog)*: Van mijn broer. Hij woont nu op het land. Hij werd zeeziek.
- **Tammo** *(droog)*: Op een woonschip?
- **Sluiswachter Lammert** *(oud, droog)*: Het duurde veertig jaar. Toen was het genoeg.
- **Sluiswachter Lammert** *(oud, warm, bij het weggaan)*: Mijn kleinzoon vaart rondjes bij Zuidhorn. Ook een Lammert. Wij doen niet aan nieuwe namen.
- **Tessa** *(zacht, op het dek)*: Twee filialen. Warffum en Delfzijl.
- **Tammo** *(droog)*: En de Vismarkt.
- **Tessa** *(zacht)*: Die zijn we kwijt.
- **Tammo** *(vastberaden, zacht)*: Die halen we terug. Daar doen we dit voor.
- **Tessa** *(eerlijk, zacht)*: Ik doe het voor zeven.
- **Tammo** *(zacht)*: …Ik weet het.
- **Tessa** *(zacht, aarzelend)*: Is het erg? Dat ik meer wil?
- **Tammo** *(droog, warm)*: Nee. Ik wil alleen niet minder.

**Klaar (telefoon)**

- **Tessa** *(warm, aan de telefoon)*: Filiaal twee: de zeesluis. Lammert bakt alleen als er geen schip komt. Er komt bijna nooit een schip.

**HUD-meldingen:** "Filiaal geopend: Fjord Frituur aan de zeesluis (Lammert)" · "Safehouse: het woonschip in de haven van Delfzijl, met een eigen boot aan de steiger" · "Nieuw recept: de Eemsdelta-eierbal, met een snufje zeezout"

### Na beide voorrondes: Nachtstreek en "Wordt vervolgd"

Speelt na de tweede gewonnen voorronde (welke dat ook is) als radiofragment; daarna stopt het gebouwde verhaal op de kaart van `PARTS.nazomer.card` (§1).

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek. Twee voorrondes, twee filialen, één woonschip.
- **Rikus** *(droog, als nacht-dj op de radio)*: De torenwachter belde. Zijn nicht in Den Andel had al gebeld. En een sluiswachter in Delfzijl. Ze melden alleen. Ze melden alleen nogal veel.
- **Rikus** *(plagend, als nacht-dj op de radio)*: Peiling, voor het eerst in Deel vier: groeien of thuis? Groeien: 51 procent. Thuis: 49. Eén luisteraar in Paddepoel heeft twee keer gestemd. Ik zeg niks.
- **Ubbo Oldenhuis** *(joviaal, zelfvoldaan, aan de telefoon op de radio)*: Rikus. Twee van zeven. Mooi begin. Ik zie ze graag in het Westerkwartier.
- **Rikus** *(droog, als nacht-dj op de radio)*: Waarom, Ubbo?
- **Ubbo Oldenhuis** *(vriendelijk dreigend, aan de telefoon op de radio)*: Daar zijn de wegen van grind.

## 4. Zijreeksen

Elke reeks start met een "?" op de kaart. Ze zijn niet nodig voor het verhaal en volgen dezelfde regels: overslaan na één poging, geld blokkeert niets, geleende voertuigen gaan terug.

### De Piepjager (Hogeland)

*Start:* na O3 (Harm-Jan staat op de wierde naast de weg naar Den Andel).

Harm-Jan loopt elke zaterdag met zijn metaaldetector over het Hogeland, op zoek naar "Vikinggoud". Vier missies, steeds iets serieuzer, en de laatste raakt aan Oma's lijstje. Tessa weet dat graven op een wierde niet mag (wierden zijn beschermd); Harm-Jan "graaft niet, hij piept". **Regel voor het hele spel:** op een wierde graaft niemand echt. De detector piept, de vondsten liggen bovenop of in de klei van een sloot of kwelder, nooit in de wierde zelf.

#### Z1 · Piepen in de klei

**Type:** te voet, zoeken · **Speler:** Tammo · **Start:** Een wierde met een boerderij bij Usquert (fictief erf; de wierde zelf echt of bij de bouw te kiezen) · **Beloning:** € 300

**Verloop**

1. Neem de detector van Harm-Jan over (een nieuw handding, `detector`: hoe dichterbij, hoe sneller het piepen; een pijl op de HUD alleen bij de eerste vondst).
2. Vind vijf dingen in de **sloot en de akkerrand onderaan de wierde**: een kroonkurk van een vergeten frisdrank, een hoefijzer, een trekkerbout, een wieldop van een Fjord ("Die is van mij." "Hij is van een Fjord." "Dat zei ik."), en een oude sleutel.
3. Boer Sikko komt met een riek. Wegwezen over het hek (achtervolging te voet, 30 s, hij is oud maar kent zijn land).

**Falen en overslaan.** Gepakt door Sikko (hij geeft je een uitbrander, de missie begint opnieuw bij het hek). Geen tijdslimiet. Overslaan na één poging.

**Intro.** *Camera:* Close op het display van de detector dat piept, uitzoomen naar Harm-Jan die met een koptelefoon op over een akkerrand loopt, de wierde met boerderij erachter.

- **Harm-Jan** *(opgewonden, snel)*: Stil! Hoor je dat? Vikinggoud. Ik weet het zeker. `[naamkaart: harmjan]`
- **Tessa** *(droog)*: Je mag op een wierde niet graven. Het zijn monumenten.
- **Harm-Jan** *(plechtig, fluisterend)*: Ik graaf niet. Ik piep.
- **Tammo** *(droog)*: En als het piept?
- **Harm-Jan** *(opgewonden)*: Dan kijk ik heel goed. Met mijn handen.

**In de missie**

- **Harm-Jan** *(opgewonden)*: Sneller piepen is dichterbij. Heel snel is goud.
- **Tammo** *(droog)*: Een kroonkurk.
- **Harm-Jan** *(teleurgesteld, hoopvol)*: Vikingen dronken ook.
- **Tammo** *(droog)*: Een hoefijzer.
- **Harm-Jan** *(opgewonden)*: Van een Vikingpaard!
- **Tessa** *(droog)*: Er staat een fabrieksnummer op.
- **Tammo** *(verbaasd, droog)*: Een wieldop. Van een Fjord. Die is van mij.
- **Tessa** *(droog)*: Hij is van een Fjord, Tammo. Niet van jou.
- **Tammo** *(droog)*: Dat zei ik.
- **Boer Sikko** *(nors, roepend)*: Wat doen jullie op mien laand! *(Wat doen jullie op mijn land!)*
- **Harm-Jan** *(paniekerig)*: Sikko! Rennen! Hij heeft een riek, en hij weet hoe hij moet.

**Outro.** *Camera:* Achter het hek, buiten adem in de berm; de camera zakt naar het zakje met de vijf vondsten op het gras.

- **Harm-Jan** *(teleurgesteld, buiten adem)*: Geen goud.
- **Tammo** *(droog)*: Wel een sleutel.
- **Harm-Jan** *(opgewonden, plechtig)*: Een sleutel is het begin van een schat. Dat staat in elk boek.
- **Tessa** *(droog)*: In welk boek?
- **Harm-Jan** *(snel)*: Dat moet ik nog vinden.

**Bij herhaling**

- **Harm-Jan** *(opgewonden)*: Hij piept weer! Het is vast weer een kroonkurk. Maar stel.

**Afrondingskaart:** **PIEPEN IN DE KLEI** · Vijf vondsten. Nul goud. Eén boer met een riek.

#### Z2 · Vikingschat

**Type:** achtervolging (quad), kwelder · **Speler:** Tessa · **Start:** De weekmarkt in Uithuizen (Lubbert met een kraam vol "Vikinggoud") · **Beloning:** € 500

**Verloop**

1. Harm-Jan heeft "echt Vikinggoud" gekocht van Lubbert op de markt: tweehonderd euro voor drie munten. Tessa ziet het meteen: het zijn koperen jasknopen.
2. Lubbert ruikt onraad en vlucht op een quad, naar buiten de dijk, de **kwelder** in (buitendijks land bij de Waddenkust ten noorden van Uithuizen; kwelderpaden, slenken, schapen).
3. Achtervolging op een tweede quad (van Harm-Jans neef, `handBack`). Slenken zijn sprongen; in een diepe slenk blijf je hangen (3 s vast). Schapen gaan niet opzij.
4. Klem Lubbert tegen een hek of laat hem in een slenk rijden. Geld terug voor Harm-Jan.

**Falen en overslaan.** Lubbert is weg (> 400 m) of je quad ligt om. Overslaan na één poging. **Geen schieten** (het is een oplichter, geen schurk).

**Intro.** *Camera:* Markt van Uithuizen: kramen, kaas, een draaiorgel; de camera loopt mee achter Harm-Jan die trots een doosje openmaakt voor Tessa, close op drie glimmende knopen.

- **Harm-Jan** *(opgewonden, trots)*: Vikinggoud. Echt. Met papieren.
- **Tessa** *(droog, bekijkt een munt)*: Er staan vier gaatjes in.
- **Harm-Jan** *(snel)*: Om ze aan elkaar te rijgen. Vikingen deden dat.
- **Tessa** *(droog)*: Het zijn jasknopen, Harm-Jan.
- **Handelaar Lubbert** *(verkoperig, glad)*: Wie zegt dat Vikingen geen jassen hadden? `[camera: close]`
- **Tammo** *(droog)*: Hij heeft een punt.
- **Tessa** *(scherp)*: Tweehonderd euro, voor drie knopen.
- **Handelaar Lubbert** *(betrapt, snel)*: Dat was korting!

**In de missie**

- **Tessa** *(strijdlustig)*: De dijk over! Hij gaat de kwelder in.
- **Tammo** *(gespannen)*: Slenk! Gas erop, of we blijven erin hangen.
- **Tessa** *(geconcentreerd)*: Schapen. Ze gaan niet opzij.
- **Tammo** *(droog)*: Ze waren hier eerst.
- **Handelaar Lubbert** *(betrapt, roepend)*: Het was een schappelijke prijs!
- **Tessa** *(fel)*: Voor knopen!
- **Tammo** *(tevreden)*: Hij hangt. In de slenk. Met zijn quad op zijn kant.

**Outro.** *Camera:* Lubbert tot zijn knieën in de slenk, de quad scheef, schapen in een kring eromheen; de camera draait langzaam rond terwijl hij geld telt.

- **Handelaar Lubbert** *(betrapt, mopperend)*: Tweehonderd. Hier. Ik had er nog wat op willen verdienen.
- **Harm-Jan** *(teleurgesteld, hoopvol)*: Mag ik de knopen houden?
- **Tessa** *(droog)*: Die zijn van hem.
- **Handelaar Lubbert** *(glad, opeens vriendelijk)*: Voor tien euro.
- **Harm-Jan** *(opgewonden)*: Deal!
- **Tammo** *(droog)*: Hij koopt ze terug.
- **Tessa** *(zuchtend)*: Hij koopt ze terug.

**Bij herhaling**

- **Handelaar Lubbert** *(verkoperig)*: Vikinggoud! Ook voor mensen die het al eens gekocht hebben!

**Afrondingskaart:** **VIKINGSCHAT** · Tweehonderd euro terug. Drie knopen voor tien euro. Harm-Jan is blij.

#### Z3 · Het ijzeren varken

**Type:** trekker, tegen het getij · **Speler:** Tammo · **Start:** De rand van de kwelder bij Uithuizen, met laag water · **Beloning:** € 700

**Verloop**

1. Harm-Jans detector piept als een gek: in de klei van een oude slenk zit een **trekker** ("het ijzeren varken"), die zijn opa er in 1971 in liet zakken bij een springtij.
2. Haal je eigen trekker (gekocht) of die van Jakob (geleend, `handBack`), rij over het dijkpad de kwelder in.
3. Haak de ketting aan (E) en trek. Eerste poging: **de ketting breekt** als het water komt (scripted; de getijmeter op de HUD stijgt).
4. Een tweede, langere ketting ligt bij Sikko op het erf (hij geeft hem mopperend mee: "Veur de opa, nait veur die."). Terug, aanhaken, trekken met het water tot je wielen. De trekker komt los.
5. Sleep het ijzeren varken naar de dijk, voor het water de weg afsnijdt.

**Falen en overslaan.** Het water staat te hoog (getijmeter vol: je trekker staat vast). Overslaan na één poging. Geld speelt geen rol.

**Intro.** *Camera:* Het display van de detector geeft "MAX"; de camera volgt de kabel van de koptelefoon naar beneden, de klei in, en daar steekt een roestig stuur uit. Tilt omhoog: Harm-Jan op zijn knieën, met tranen in zijn ogen.

- **Harm-Jan** *(plechtig, fluisterend)*: Het ijzeren varken. Van mijn opa. Hij liet hem hier zakken. In 1971, bij springtij.
- **Tammo** *(droog)*: En toen?
- **Harm-Jan** *(zacht)*: Toen liep hij naar huis. Hij zei: het varken slaapt. Hij heeft het nooit meer over gehad.
- **Tessa** *(zacht)*: Je wilt hem eruit.
- **Harm-Jan** *(vastberaden)*: Voor opa. Hij ligt hier al langer dan ik leef.

**In de missie**

- **Tessa** *(gespannen)*: Het water komt. Zie je die slenk vollopen?
- **Tammo** *(geconcentreerd)*: Ketting zit. Trekken.
- **Tammo** *(geschrokken)*: Ketting! Hij is gebroken.
- **Harm-Jan** *(wanhopig)*: Sikko heeft een lange. Van zijn opa.
- **Boer Sikko** *(nors, geeft een ketting)*: Veur de opa, nait veur die. *(Voor de opa, niet voor jou.)*
- **Tessa** *(snel)*: Water tot de as. Nu of nooit, Tammo.
- **Tammo** *(droog, vastberaden)*: Nu dan.
- **Harm-Jan** *(juichend)*: Hij komt! Het varken komt!

**Outro.** *Camera:* Bovenop de dijk, avondlicht: twee trekkers naast elkaar, de ene glimmend, de andere een klomp roest en klei. Harm-Jan legt zijn hand op het stuur.

- **Harm-Jan** *(zacht, ontroerd)*: Hij is wakker.
- **Tessa** *(zacht)*: Hij doet niks meer, Harm-Jan.
- **Harm-Jan** *(zacht)*: Dat deed hij toen ook al niet. Daarom liet opa hem slapen.
- **Tammo** *(droog, warm)*: Kon minder.

**Bij herhaling**

- **Harm-Jan** *(opgewonden)*: Er ligt nog een varken. Denk ik. Of een fiets.

**Afrondingskaart:** **HET IJZEREN VARKEN** · Opa's trekker is wakker. Hij doet verder niks.

#### Z4 · Wat de wierde wist

**Type:** verhaal, zoeken · **Speler:** Tammo · **Start:** De slenk waar het ijzeren varken lag (laag water) · **Beloning:** € 1000

**Verloop**

1. Waar de trekker lag, piept de detector nog één keer. In de klei zit een **medaille**: brons, met een lint dat ooit oranje was.
2. Breng de medaille naar Geesje in Den Andel (zij leest het opschrift met een loep in de consistorie), en bel Oma (telefoongesprek, `via: 'call'`).
3. Een rustige missie: geen fail. Afsluiting met een kaartje in "Wat weten we?".

**Falen en overslaan.** Kan niet mislukken.

**Intro.** *Camera:* Laag water, ochtend; Harm-Jan op zijn knieën met een tandenborstel; de camera schuift over zijn schouder naar de medaille die uit de klei komt.

- **Harm-Jan** *(plechtig, fluisterend)*: Geen goud. Brons. Er staat iets op.
- **Tessa** *(leest, zacht)*: "Ommelander Ronde, 1953. Tweede prijs." En een naam. Trijntje.
- **Tammo** *(stil, ongelovig)*: Oma.
- **Harm-Jan** *(opgewonden, zacht)*: Er was al een Ommelander Ronde? In 1953?
- **Tessa** *(ernstig)*: Ubbo heeft dat reglement niet bedacht. Hij heeft het opgegraven.
- **Harm-Jan** *(snel)*: Ik graaf niet.
- **Tessa** *(droog)*: Ik weet het. Jij piept.

**In de missie**

- **Kosteres Geesje** *(droog, met een loep)*: Tweede prijs. Vesting Bourtange. Dat staat op de rand. Heel klein.
- **Tammo** *(verbaasd)*: Oma werd tweede? Ze wint altijd.
- **Kosteres Geesje** *(droog, zacht)*: Bel haar maar. Ze heeft er zeventig jaar niet over gepraat. Dat is lang genoeg.

**Telefoon**

- **Tammo** *(voorzichtig, aan de telefoon)*: Oma. We hebben een medaille gevonden. In de klei. Met jouw naam.
- **Oma Trijntje** *(stil, dan stellig, aan de telefoon)*: Die heb ik daar zelf gegooid. Vanaf de dijk. Van boosheid.
- **Tessa** *(zacht, aan de telefoon)*: Waarom?
- **Oma Trijntje** *(droog, oud, aan de telefoon)*: Tweede, in Bourtange. Mijn eierbal was beter. De jury was van een Oldenhuis. `[clue]`
- **Tammo** *(stil)*: Een Oldenhuis.
- **Oma Trijntje** *(stellig, aan de telefoon)*: Zijn opa. Ik ben Gronings. Ik vergeet niks. Ik zeg het alleen niet.
- **Oma Trijntje** *(warm, aan de telefoon)*: Houd hem maar, jong. Hang hem op in die frietwagen. Dan ziet Ubbo hem.

**Outro.** *Camera:* In de Fjord: Tammo hangt de medaille aan het spiegeltje; de camera kijkt van buiten door de voorruit, de medaille draait langzaam in het licht.

- **Tammo** *(droog, zacht)*: Ze gooide hem in de klei. Zeventig jaar geleden.
- **Tessa** *(zacht)*: En ze heeft het nooit gezegd.
- **Tammo** *(droog)*: Gronings.
- **Tessa** *(droog)*: Daar ken ik er nog één van.

**Bij herhaling**

- **Harm-Jan** *(opgewonden)*: Ik heb nog een keer gekeken. Alleen kroonkurken. Ik ben blij.

**Afrondingskaart:** **WAT DE WIERDE WIST** · Ommelander Ronde, 1953. Tweede prijs. Trijntje.

**"Wat weten we?"** *Ommelander Ronde, 1953*: Er was al eens een Ommelander Ronde. In 1953 werd Oma tweede, in de vesting Bourtange. "De jury was van een Oldenhuis. Zijn opa." Ze gooide haar medaille in de klei. Nu hangt hij aan het spiegeltje van de Fjord. (Aanwijzing voor de finale.)

### Loods Klaas (Eemsdelta)

*Start:* na n-delfzijl (Klaas staat op de dijk bij molen Adam); Z5-Z6 kunnen al eerder in de F1-proefdrop.

**Continuïteit:** "Loods Klaas" is **Kapitein Klaas** uit Deel 2 (H13): de schorre schipper die dertig jaar fietsen uit de Diepenring viste. Dáárvoor was hij dertig jaar loods op de Eems. Zelfde stem (Enceladus), zelfde naamkaart; bij zijn eerste verschijning hier komt alleen een tweede regel onder zijn kaart: *"Daarvoor dertig jaar loods op de Eems."* Hij wil nog één keer. Tessa vaart (water is van haar), Tammo luistert.

#### Z5 · Mist op de Eems

**Type:** boot, op geluid · **Speler:** Tessa · **Start:** De loodssteiger in de haven van Delfzijl (vroege ochtend, dichte mist) · **Beloning:** € 600

**Verloop**

1. Klaas stapt bij je in een loodsboot (geleend van een oude vriend, `handBack`). Een kustvaarder, de *Grietje Dollard* (fictief), ligt op de rede en durft niet binnen in de mist.
2. Vaar naar het schip **op geluid**: het zicht is 40 m, de minimap staat uit. Je hoort de misthoorn van het schip (richting via stereo en een kleine HUD-boog), en de boeien: elke boei heeft een eigen bel (`buoySounds`).
3. Klaas gaat aan boord (scène op de touwladder). Daarna **loods het schip naar binnen**: jij vaart voorop, het schip volgt je op 150 m. Volg de boeien op geluid: rood links, groen rechts, en Klaas zegt het als je fout gaat.
4. Het schip ligt aan de kade. Klaas komt terug, met een appel van de kapitein.

**Falen en overslaan.** Het schip loopt vast (te ver buiten de boeienlijn, 3 s). Je loodsboot raakt iets hards. Overslaan na één poging.

**Intro.** *Camera:* Wit beeld: mist. Een misthoorn. De camera vindt langzaam de contour van Klaas op de steiger, pijp in de mond, ogen dicht.

- **Kapitein Klaas** *(schor, knipogend)*: Moi. Daar zijn jullie. Ik hoorde jullie lopen. `[naamkaart: klaas]`
- **Tessa** *(verbaasd)*: Klaas? Uit Stad?
- **Kapitein Klaas** *(schor, droog)*: Dertig jaar fietsen uit de Diepenring. Daarvoor dertig jaar loods op de Eems. Ik wil nog één keer.
- **Tammo** *(droog)*: We zien niks.
- **Kapitein Klaas** *(schor, wijs)*: Dan hoeven jullie ook niet te kijken. Luisteren. Een schip praat.

**In de missie**

- **Kapitein Klaas** *(schor, zacht)*: Hoor je die hoorn? Daar ligt hij. Een beetje naar stuurboord.
- **Tessa** *(geconcentreerd)*: Stuurboord is rechts.
- **Kapitein Klaas** *(schor, droog)*: Dat zeg ik. Een beetje.
- **Tammo** *(fluisterend)*: Een bel. Links.
- **Kapitein Klaas** *(schor)*: Rode boei. Die hoort links. Goed zo.
- **Kapitein Klaas** *(schor, streng)*: Nee, nee. Die bel klinkt te dichtbij. Je zit ernaast.
- **Kapitein Klaas** *(schor, tevreden)*: Hij volgt ons. Een schip van negentig meter achter een bootje van zes. Zo hoort het.

**Outro.** *Camera:* De mist trekt op aan de kade; de hoge boeg van het schip komt achter het duo tevoorschijn als een muur. Klaas klimt de ladder af met een appel.

- **Kapitein Klaas** *(schor, tevreden)*: Van de kapitein. Hij zei: welkom thuis. Ik zei: ik ben er nooit weggeweest.
- **Tessa** *(warm)*: Hoe was het?
- **Kapitein Klaas** *(schor, zacht)*: Zoals vroeger. Alleen mijn knieën zijn nieuw.

**Bij herhaling**

- **Kapitein Klaas** *(schor, knipogend)*: Weer mist? Mooi. Dan ziet niemand hoe oud ik ben.

**Afrondingskaart:** **MIST OP DE EEMS** · Een schip binnengebracht op geluid. Een appel van de kapitein.

#### Z6 · Douane op de dijk

**Type:** boot, achtervolging, laagwater · **Speler:** Tessa · **Start:** Delfzijl, loodssteiger · **Beloning:** € 800

**Verloop**

1. Klaas is "zijn papieren vergeten" voor zijn loodsboot (hij heeft al vijftien jaar geen papieren meer). Een douaneboot wil hem spreken.
2. Vlucht over de Eems richting de Dollard bij **laagwater**: het vaarwater is smal, de platen vallen droog. Volg de geul (diepte op de HUD); de douaneboot is groter en loopt vast als hij jou volgt over een ondiepte.
3. Lok de douaneboot op een plaat (het spel geeft er drie langs de route). Daarna terug naar de haven, voor het water weer opkomt.

**Falen en overslaan.** Je loopt zelf vast (2 s geen water onder de kiel). De douane gaat langszij (8 s binnen 15 m). Overslaan na één poging. Geen sterren: dit is de douane, en het blijft droog en vriendelijk.

**Intro.** *Camera:* Een douaneboot met blauwe streep schuift het beeld in achter Klaas, die net zijn pet rechtzet; close op zijn knipoog.

- **Kapitein Klaas** *(schor, samenzweerderig)*: Mijn papieren liggen thuis. Al vijftien jaar.
- **Tessa** *(droog)*: Die douaneboot wil ze zien.
- **Kapitein Klaas** *(schor, knipogend)*: Dan moet hij ze komen halen. Bij laagwater. Ik weet waar het ondiep is. Hij niet.

**In de missie**

- **Kapitein Klaas** *(schor)*: Volg de geul. Waar het water donker is, is het diep.
- **Tessa** *(geconcentreerd)*: Alles is donker, Klaas.
- **Kapitein Klaas** *(schor, droog)*: Dan is alles diep. Gas erop.
- **Tammo** *(opgetogen)*: Hij zit vast! De douaneboot zit op het zand!
- **Kapitein Klaas** *(schor, vriendelijk, roepend)*: Over twee uur komt het water! Neem een boterham!

**Outro.** *Camera:* In de haven, Klaas zet de motor uit; ver weg op de plaat staat de douaneboot scheef, met een agent die met zijn armen over elkaar wacht.

- **Tammo** *(droog)*: Die papieren. Gaat u die halen?
- **Kapitein Klaas** *(schor, wijs)*: Morgen. Ik breng hem koffie. Dan is het goed.
- **Tessa** *(lachend)*: U kent hem.
- **Kapitein Klaas** *(schor)*: Ik heb hem leren varen. Hij was een goeie leerling. Te goed.

**Bij herhaling**

- **Kapitein Klaas** *(schor, knipogend)*: Mijn papieren zijn weer weg. Ze zijn er nooit.

**Afrondingskaart:** **DOUANE OP DE DIJK** · Een douaneboot op het zand. Morgen krijgt hij koffie.

#### Z7 · Sluiten om middernacht

**Type:** getimed, sluizen · **Speler:** Tessa · **Start:** De zeesluis bij Farmsum, 23:00 · **Beloning:** € 1000

**Verloop**

1. Klaas moet een oude tjalk (fictief, *De Twee Gebroeders*) naar Termunterzijl brengen voor de restauratie. De laatste schutting is om middernacht.
2. **Drie schuttingen** in één uur speltijd (± 6 minuten echt): de zeesluis bij Farmsum naar buiten, langs de kust naar Termunterzijl, door de sluis daar het Termunterzijldiep op, en (zonder de tjalk) terug door Farmsum vóór middernacht. Volgorde vast, de klok loopt.
3. Bij elke sluis meldt de sluiswachter wat hij ziet (Lammert bij Farmsum; bij Termunterzijl een collega via de marifoon: "Ik meld alleen. Ik ben zijn neef.").
4. In de sluiskolk: aanleggen binnen het vak, touw om de bolder (E), wachten (overslaanbaar).

**Falen en overslaan.** Na middernacht bij de laatste sluis. De tjalk raakt een sluisdeur. Overslaan na één poging. **Plan-afwijking:** het verhaal-document noemt "drie sluizen"; met twee echte sluizen aan deze kust worden het drie schuttingen. Controleer de sluis van Termunterzijl in OSM.

**Intro.** *Camera:* Nachtelijke kolk, de sluislampen in het water; de camera kijkt van boven het huisje van Lammert naar beneden, waar Klaas en het duo op de tjalk staan.

- **Kapitein Klaas** *(schor)*: Drie keer schutten voor middernacht. Daarna gaat alles dicht.
- **Sluiswachter Lammert** *(oud, onverstoorbaar, door de marifoon)*: Klaas. Ik zie je. Ik meld alleen.
- **Kapitein Klaas** *(schor, knipogend)*: Lammert. Je bent nog niet dood.
- **Sluiswachter Lammert** *(oud, droog, door de marifoon)*: Ik ben sluiswachter. Ik wacht.

**In de missie**

- **Kapitein Klaas** *(schor)*: Touw om de bolder. Niet te strak. Een sluis ademt.
- **Tessa** *(geconcentreerd)*: Twintig minuten. Termunterzijl.
- **Kapitein Klaas** *(schor, zacht)*: Daar heb ik mijn eerste schip gestuurd. Ik was negentien. Het schip ook, ongeveer.
- **Tammo** *(droog)*: Hier ligt de restauratiewerf. De tjalk is thuis.
- **Tessa** *(gehaast)*: Elf minuten. Terug naar Farmsum.
- **Sluiswachter Lammert** *(oud, droog, door de marifoon)*: Twee minuten voor twaalf. Ik meld alleen. Ik doe hem ook open.

**Outro.** *Camera:* De sluisdeuren gaan om precies middernacht dicht achter het bootje; een klok op het huisje slaat twaalf. Lammert en Klaas zwaaien naar elkaar, allebei zonder te glimlachen.

- **Kapitein Klaas** *(schor, tevreden)*: Op tijd.
- **Sluiswachter Lammert** *(oud, droog)*: Op tijd is niet vroeg. Op tijd is op tijd.
- **Kapitein Klaas** *(schor, droog)*: Hij zegt dat al vijftig jaar.
- **Tammo** *(droog)*: Hij heeft gelijk.

**Bij herhaling**

- **Kapitein Klaas** *(schor)*: Middernacht. Je kunt erop wachten.

**Afrondingskaart:** **SLUITEN OM MIDDERNACHT** · Drie schuttingen. Eén tjalk thuis. Twaalf uur, op tijd.

#### Z8 · Laatste reis

**Type:** boot, verhaal · **Speler:** Tammo · **Start:** De haven van Termunterzijl, laat in de middag · **Beloning:** € 1200

**Verloop**

1. Klaas vraagt of ze hem naar de dijk bij **Termunten** varen. Hij wil zien waar zijn as later moet. Hij leeft nog, en is van plan dat zo te houden.
2. Een kalme vaart langs de Dollard-kust (geen tijd, geen tegenstanders; vogels op de slikken).
3. Aanleggen, de dijk op, en kijken naar de zonsondergang. De speler kan alleen nog **Wacht** kiezen (de camera loopt door, de zon zakt, één minuut die je mag overslaan).
4. Klaas wordt daarna vaste beller van Nachtstreek bij mist ("Mist bij Delfzijl. Ik hoor het.") en zijn bootje is een **havenloods-startpunt** (§5.4).

**Falen en overslaan.** Kan niet mislukken.

**Intro.** *Camera:* Klaas aan het roer van het bootje, de dijk van Termunten in de verte; de camera zit laag op het voordek en kijkt achterom naar hem.

- **Kapitein Klaas** *(schor, rustig)*: Ik wil zien waar ik later moet. Mijn as. Bij de dijk van Termunten.
- **Tessa** *(geschrokken, zacht)*: Klaas. Bent u ziek?
- **Kapitein Klaas** *(schor, knipogend)*: Nee. Ik wilde het alleen even zien. Zolang ik nog zelf kan kijken.

**In de missie**

- **Kapitein Klaas** *(schor, zacht)*: Daar. Dat stuk dijk met dat bankje. Daar zat ik als jongen. Ik telde schepen.
- **Tammo** *(droog, zacht)*: Hoeveel?
- **Kapitein Klaas** *(schor, warm)*: Allemaal. Ik ben er nooit mee opgehouden.

**Outro.** *Camera:* Op de dijk, de zon zakt achter Delfzijl; heel trage orbit om het bankje, drie silhouetten. Geen muziek. Pas als de zon weg is, zegt Klaas iets.

- **Kapitein Klaas** *(schor, zacht)*: Ik wilde het alleen even zien.
- **Tessa** *(zacht)*: Het is mooi, Klaas.
- **Kapitein Klaas** *(schor, droog)*: Het is goed. Mooi is voor Stad.
- **Tammo** *(zacht)*: Kon minder.
- **Kapitein Klaas** *(schor, warm)*: Kon minder, jong. Kom. Ik heb honger. Dood ga ik later wel.

**Bij herhaling**

- **Kapitein Klaas** *(schor, rustig)*: Nog één keer kijken? Het bankje staat er nog. Ik ook.

**Afrondingskaart:** **LAATSTE REIS** · Een bankje op de dijk bij Termunten. Klaas leeft nog, en dat blijft zo.

### Scheuren (Eemsdelta (Loppersum))

*Start:* na O7, **alleen als de eigenaar ja zegt** (verhaal-document §10, vraag 3). Zonder "ja" bestaat de reeks niet in het spel en komt het onderwerp alleen terug in Rikus' ene zin (n-delfzijl) en in het decor..

**Toon en regels (§8):** warm en stil. De gaswinning zelf wordt niet genoemd als schurk, er komt geen bedrijf of instantie in voor, niemand lacht om de schade en niemand maakt er een grap over. De humor komt uit gewone dingen (dozen, een kat, een buurman die te veel helpt), nooit uit het huis of de scheuren. Er is geen fail, geen tijdslimiet en geen politie. Willemien is Oma's achternicht: ze klaagt niet en ze is ook niet heldhaftig; ze wacht, ze pakt in, ze komt terug. De plek is "een huis in Loppersum", zonder straatnaam.

#### Z26 · Inpakken

**Type:** te voet, inpakken · **Speler:** Tessa · **Start:** Willemiens huis in Loppersum (een gewone woning met steunbalken tegen de zijgevel) · **Beloning:** geen geld

**Verloop**

1. Oma belt: Willemien moet een tijdje uit haar huis, het wordt versterkt. "Help haar inpakken. Niet praten over wat je ziet. Gewoon dozen."
2. **Inpakken** (`kind: 'pack'`, hergebruikt van de verhuizing-bijbaan): breekbaar in de krant, boeken in kleine dozen, de kat in de mand (de kat wil niet: drie pogingen, dit is het enige "spel").
3. In een la ligt een **foto uit 1953**: twee meisjes op fietsen voor het oude station van Loppersum, Trijntje en haar zus (Willemiens oma). Tessa geeft hem aan Willemien.
4. Geen beloning in geld (`reward: 0`); wel de foto in "Wat weten we?" en een kopje koffie.

**Falen en overslaan.** Geen.

**Intro.** *Camera:* Statische dingen, bewegende camera: een trage dolly door een gang vol lege dozen, langs een muur met een lange haarscheur die de camera niet uitlicht en niet vermijdt, naar de keuken waar Willemien koffie zet.

- **Willemien** *(rustig, nuchter)*: Jullie zijn van Trijntje. Kom binnen. Schoenen mogen aan. Het huis is toch even niet van mij. `[naamkaart: willemien]`
- **Tessa** *(zacht)*: Hoe lang?
- **Willemien** *(droog, moe)*: Nog een paar weken, zeggen ze. Dat zeggen ze al twee jaar. Koffie?
- **Tammo** *(zacht)*: Graag.
- **Willemien** *(rustig)*: Breekbaar in de krant. Boeken in kleine dozen. Anders krijg je ze niet getild. En de kat is het moeilijkste.

**In de missie**

- **Tammo** *(droog, zacht)*: De kat wil niet in de mand.
- **Willemien** *(rustig, met een glimlach)*: Hij wil nergens in. Hij woont hier. Hij snapt het nog minder dan ik.
- **Tessa** *(zacht, vindt iets)*: Willemien. Een foto. Twee meisjes op een fiets. Voor het station.
- **Willemien** *(zacht, warm)*: Mijn oma. En Trijntje. Negentienhonderddrieënvijftig. Ze fietsten naar Stad, voor de prijs.
- **Tammo** *(zacht)*: Twintig kilometer.
- **Willemien** *(droog, warm)*: Tegen de wind in. Dat stond er niet bij, maar zo was het.

**Outro.** *Camera:* Op de stoep, de dozen in de bus; de camera blijft binnen staan en kijkt door het lege raam naar buiten, waar Willemien de deur op slot doet en even met haar hand op het kozijn blijft staan.

- **Willemien** *(rustig, nuchter)*: Het is een huis. Het moet alleen even blijven staan.
- **Tessa** *(zacht)*: Het blijft staan.
- **Willemien** *(droog, zacht)*: Dat zeggen ze. Ik zeg het ook. Dan zijn we het eens.

**Bij herhaling**

- **Willemien** *(rustig)*: Nog een doos? Er is altijd nog een doos.

**Afrondingskaart:** **INPAKKEN** · Twaalf dozen, één kat, één foto uit 1953.

**"Wat weten we?"** *Twee meisjes op een fiets*: Een foto uit 1953: Trijntje en haar zus op de fiets voor het station van Loppersum, op weg naar Stad, voor de prijs. Tegen de wind in.

#### Z27 · De wisselwoning

**Type:** rijden, breekbaar, stil · **Speler:** Tammo · **Start:** Voor Willemiens huis, met de verhuisbus · **Beloning:** geen geld

**Verloop**

1. Rij de verhuisbus (`handBack`) naar de **wisselwoning** aan de rand van het dorp (een rij tijdelijke woningen; fictieve plek). ± 1,5 km. Breekbaar (zoals H7), maar zonder fail: een klap laat alleen iets rinkelen en Willemien zegt niets.
2. De radio staat zacht; Rikus draait een rustig nummer zonder te praten (`radio: 'quiet'`, geen jingles).
3. Uitladen (zes dozen, de kat als laatste).

**Falen en overslaan.** Geen. Een klap kost niets behalve een stilte.

**Intro.** *Camera:* In de bus: de camera op het dashboard kijkt naar binnen, naar Willemien met de kattenmand op schoot en Tammo achter het stuur; buiten glijdt het dorp voorbij, met hier en daar een steiger.

- **Willemien** *(zacht, rustig)*: Rustig rijden. Niet om de spullen. Om mij.
- **Tammo** *(zacht)*: Ik rij altijd rustig.
- **Willemien** *(droog, zacht)*: Dat zei Trijntje al. Ze zei: dat is het enige wat hij altijd doet.

**In de missie**

- **Willemien** *(zacht, kijkt naar buiten)*: Daar woonde mijn buurvrouw. Die is al terug. Ze zegt dat het nu beter is dan eerst.
- **Tammo** *(zacht)*: En u?
- **Willemien** *(rustig)*: Ik geloof het als ik het zie. Dat is niet boos. Dat is Gronings.

**Outro.** *Camera:* Bij de wisselwoning: een klein, schoon huis, een plantje dat Willemien uit de bus tilt en meteen in de vensterbank zet. Kat uit de mand; de camera volgt de kat die de nieuwe kamer verkent.

- **Willemien** *(droog, met een glimlach)*: Hij vindt het niks.
- **Tammo** *(droog, zacht)*: Hij went wel.
- **Willemien** *(rustig, warm)*: Hij niet. Ik wel. Dank je, jong. Zeg tegen Trijntje dat ik niet klaag.
- **Tammo** *(zacht)*: Dat weet ze.

**Bij herhaling**

- **Willemien** *(rustig)*: Nog een ritje? De kat blijft hier. Die heeft het wel gezien.

**Afrondingskaart:** **DE WISSELWONING** · Zes dozen, een plantje in de vensterbank. Een kat die het niks vindt.

#### Z28 · Terug

**Type:** verhaal, buurtfeest · **Speler:** Tessa · **Start:** Willemiens huis, versterkt en klaar (pas na O10 en minstens één speldag na Z27) · **Beloning:** geen geld

**Verloop**

1. Willemien appt: "Het is klaar. Kom je? Rikus komt ook, zegt hij."
2. Terugverhuizen (de bus andersom, zonder breekbaar-meter: het huis wacht).
3. **Buurtfeest op het erf:** tafels, een barbecue, kinderen, de buurvrouw. Rikus draait vanaf zijn busje (de prop van het wereldeinde "Het busje van Rikus"). De speler kan rondlopen; vier mensen hebben elk één zin. Geen gesprek gaat over de schade.
4. Einde: de foto van 1953 hangt in de gang. De reeks levert geen geld op en geen filiaal; wel een **ontmoetingsplek** (Willemien is daarna een dorpsuitje in Loppersum: koffie en een plak koek).

**Falen en overslaan.** Geen.

**Intro.** *Camera:* Een strakke, nieuwe gevel zonder balken; de camera begint bij de voordeur, waar de kat al op de stoep zit, en trekt achteruit het erf op, waar mensen tafels neerzetten.

- **Willemien** *(rustig, opgelucht)*: Een paar weken, zeiden ze. Het waren er een paar. Voor het eerst klopte het.
- **Tessa** *(warm)*: En hij staat goed.
- **Willemien** *(droog, warm)*: De kat was eerder terug dan ik. Hij liep gewoon. Twee kilometer.
- **Tammo** *(droog)*: Die wist de weg.
- **Willemien** *(zacht)*: Die wist het al die tijd.

**In de missie**

- **Rikus** *(warm, live, vanaf zijn busje)*: Nachtstreek, op tournee. Vanavond vanaf een erf in Loppersum. Iemand is thuis. Dit nummer is voor haar.
- **Reiziger** *(kletserig, warm)*: Ik ben de buurvrouw. Ik heb gekookt voor twintig. We zijn met twaalf. Dat is hier normaal.
- **Boer** *(droog, hartelijk)*: Ik heb de tafels gebracht. En weer opgehaald. En weer gebracht. Ze wist niet waar ze moesten.
- **Tessa** *(zacht, tegen Willemien)*: Waar hangt de foto?
- **Willemien** *(warm)*: In de gang. Waar je hem ziet als je weggaat. En als je terugkomt.

**Outro.** *Camera:* Avond, lampjes boven het erf; een trage kraan omhoog van de tafels naar het dak en de lucht, het busje van Rikus met zijn antenne. Geen grote muziek, alleen het nummer van Rikus.

- **Willemien** *(zacht, warm)*: Zeg tegen Trijntje: ik ben thuis.
- **Tammo** *(zacht)*: Ik zal het zeggen.
- **Willemien** *(droog, warm)*: Eén keer is genoeg. Dan is het waar.

**Bij herhaling**

- **Willemien** *(warm)*: Kom maar binnen. Koffie staat. Het huis ook.

**Afrondingskaart:** **TERUG** · Willemien is thuis. Eén keer zeggen is genoeg.

## 5. Activiteiten en bijbanen

Wat er in de eerste ring te doen is naast het verhaal, met de wensen van de eigenaar erbij (machinist, buschauffeur, brommer en motor, vrachtwagen, driftplekken). Alles is altijd te starten en af te breken; geen enkele activiteit is nodig voor het verhaal.

### 5.1 Machinist en passagier

*Plan:* plan §3.2, A27 + nieuw: bijbaan machinist · *Waar:* Groningen–Roodeschool–Eemshaven en Groningen–Delfzijl

**Zelf machinist (mini-game).** Stap voorin bij een stilstaande stoptrein (de cabine-ingang, E) of kies "Voorin, bij Jantina" in een missie. Jantina zit naast je en praat; ze neemt het over als je drie keer een rood sein negeert (dan word je passagier, geen fail).
- **Bediening:** W = tractie (vijf standen), S = remmen (drie standen + noodrem), deuren met E (alleen stilstaand, perron aan de goede kant), toeter H.
- **Regels:** snelheidsborden (de lijn naar Roodeschool heeft 100, 80 en bij overwegen in de dorpen 60; Delfzijl idem, de waarden uit OSM `maxspeed` op `railway=rail`), seinen (rood = stoppen voor het sein, geel = remmen naar 40), overwegen (bellen, bomen dicht), stoppen bij de perronmarkering.
- **Score per halte:** **stiptheid** (± 30 s = vol), **comfort** (geen rukken: de afgeleide van de versnelling), **stopplek** (binnen 2 m = vol). Medailles per lijn: brons, zilver, goud en daarboven **"Kon minder"** (alles vol op de hele lijn).
- **Altijd overslaan:** na elke halte "Naar de coupé" of "Snelreizen".
- **Bijbaan machinist** (nieuw, wens eigenaar): bij het Hoofdstation een dienstrooster. Een dienst = één lijn heen of terug, per halte betaald; niveaus zoals de andere bijbaantjes (`sidejobkit.js`): niveau 2 de lijn naar Eemshaven met goederentreinen ernaast, niveau 3 nachtdienst met mist. Ontgrendeld na O2.

**Passagier.** In de coupé, met uitzicht en gesprekjes; Spatie houden = versneld (4×) of korte cinematic. Per lijn een paar medereizigers met één zin. **Zwartrijden:** kleine kans op conducteur Okke: een droge mini-scène, geen wanted, en je mag blijven zitten.

**Jantina in de cabine (instructie en commentaar)**

- **Machinist Jantina** *(kalm, instruerend)*: Ga maar zitten. Niet aan de rode knop. De rest mag, als ik het zeg. `[naamkaart: jantina]`
- **Machinist Jantina** *(kalm, instruerend)*: Tractie op twee. Rustig. Een trein stuurt niet. Hij gaat waar het spoor gaat.
- **Machinist Jantina** *(droog)*: Tachtig hier. Het bord staat er al veertig jaar. Ik ook.
- **Machinist Jantina** *(streng, kort)*: Geel. Remmen. Nu, niet straks.
- **Machinist Jantina** *(streng)*: Rood. Daar sta je voor stil. Niet ervoor, niet erna. Ervoor.
- **Machinist Jantina** *(droog, streng)*: Dat was rood. Ik zeg het één keer. Daarna rij ik.
- **Machinist Jantina** *(kalm)*: Overweg. Bel, bomen, toeter. In die volgorde.
- **Machinist Jantina** *(droog)*: Te vroeg geremd. De mensen staan nog in het gangpad. Ze kijken naar je.
- **Machinist Jantina** *(droog)*: Te laat. Het perron is daar. Wij zijn hier.
- **Machinist Jantina** *(tevreden, kort)*: Op de streep. Goed.
- **Machinist Jantina** *(tevreden, droog)*: Op de streep, op tijd, en niemand morste koffie. Kon minder.
- **Machinist Jantina** *(droog)*: Deuren. Aan de perronkant. De andere kant is een sloot.
- **Machinist Jantina** *(droog)*: Er rukt iets. Dat ben jij.
- **Machinist Jantina** *(kalm, warm)*: Winsum. Hier zag ik ooit een ijsvogel. Daarna nooit meer. Ik kijk nog steeds.
- **Machinist Jantina** *(droog)*: Roodeschool. Eindpunt. Of je moet naar Eemshaven. Dan is het eindpunt daar.
- **Machinist Jantina** *(droog)*: Delfzijl. Verder gaat het spoor niet. Daar is de zee. Die heeft geen perron.

**Omroepen (beide lijnen; de speler zet ze aan met O, of ze gaan vanzelf)**

- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Groningen Noord.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Sauwerd.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Winsum.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Baflo.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Warffum.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Usquert.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Uithuizen.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Uithuizermeeden.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Roodeschool. Deze trein eindigt hier.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Eemshaven. Eindpunt. Wilt u bij het uitstappen op de wind letten.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Bedum.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Stedum.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Loppersum.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Appingedam.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Delfzijl West.
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Delfzijl. Deze trein eindigt hier. Dank voor het reizen, en tot ziens.
- **Tammo** *(droog, in de omroep)*: Volgende halte: Warffum. Daar stapt niemand uit. Behalve wij.
- **Tessa** *(vrolijk, in de omroep)*: Dames en heren, de machinist zegt dat hij weet wat hij doet. Hou u even vast.

**Medailles en dienst (HUD-kaart met stem van Jantina)**

- **Machinist Jantina** *(kort)*: Brons. Je bent aangekomen. Dat is al wat.
- **Machinist Jantina** *(kort)*: Zilver. Op tijd, bijna.
- **Machinist Jantina** *(tevreden)*: Goud. De reizigers merkten niet eens dat jij reed.
- **Machinist Jantina** *(droog, warm)*: Kon minder. Zeg het niet tegen de dienstregeling. Die wordt jaloers.
- **Machinist Jantina** *(zakelijk)*: Dienst erop. Morgen vroeg weer. De eerste trein wacht op niemand.

**Conducteur Okke (zwartrijden)**

- **Conducteur Okke** *(vriendelijk, onverstoorbaar)*: Kaartjes, graag. …Geen kaartje?
- **Tammo** *(droog)*: Ik dacht dat het een gratis rit was.
- **Conducteur Okke** *(vriendelijk)*: Dat denkt iedereen. Op deze lijn is het bijna waar. Volgende keer een kaartje, hè.
- **Tessa** *(betrapt, poeslief)*: Wij zijn de frietwagen.
- **Conducteur Okke** *(vriendelijk, droog)*: Dan wil ik volgende keer een patatje. Met. Dan staan we quitte.

**Medereizigers (één zin per keer, willekeurig)**

- **Student** *(moe, droog)*: Eerste college om negen uur in Stad. Ik woon in Uithuizermeeden. Ik heb er spijt van. Van het college.
- **Reiziger** *(kletserig)*: Ik ga elke dinsdag naar mijn zus in Winsum. Ze weet het niet. Het is een verrassing.
- **Boer** *(droog)*: De trein is sneller dan mijn trekker. Mijn trekker komt wel overal.
- **Toerist** *(nieuwsgierig, vragend)*: Is dit de trein naar de zee? Het lijkt allemaal op land.
- **Reiziger** *(kletserig, warm)*: Kijk, de toren van Bedum. Hij staat nog steeds scheef. Ik kijk elke keer.
- **Student** *(droog)*: In Delfzijl is wifi op het perron. Daarom stap ik hier uit. Ik woon in Appingedam.

**Coupégesprek Tammo en Tessa: lijn Roodeschool (banter, `trigger: train:roodeschool`)**

- **Tessa** *(dreamy)*: Winsum. Hier wil ik een filiaal. Aan het water.
- **Tammo** *(dry)*: Je hebt het water nog niet eens gezien.
- **Tessa** *(quick)*: Ik zie het. In mijn hoofd. Met een terras.
- **Tammo** *(dry)*: Baflo. Jij hebt hier ook een plan voor.
- **Tessa** *(laughing)*: Nee. Baflo is gewoon mooi.
- **Tammo** *(dry)*: Eindelijk één dorp zonder kraam.
- **Tessa** *(curious)*: Waarom heet het Roodeschool?
- **Tammo** *(confident)*: Er stond een rode school.
- **Tessa** *(dry, knowing)*: Er stond een rode school. Dat klopt zelfs.
- **Tammo** *(dry)*: Dat bedoelde ik ook.

**Coupégesprek Tammo en Tessa: lijn Delfzijl (`trigger: train:delfzijl`)**

- **Tammo** *(dry, looking out)*: Bedum. De toren staat nog scheef.
- **Tessa** *(teasing)*: Je zegt het alsof hij het expres doet.
- **Tammo** *(dry)*: Iedereen hier doet alles expres.
- **Tessa** *(soft)*: Loppersum. Kijk, steigers. Overal.
- **Tammo** *(quiet)*: Ja.
- **Tessa** *(quiet)*: …Ja.
- **Tessa** *(excited)*: Appingedam! De hangende keukens.
- **Tammo** *(dry)*: Je wilt er een filiaal.
- **Tessa** *(quick)*: In een hangende keuken.
- **Tammo** *(deadpan)*: Dan valt hij er wel af.

### 5.2 Buschauffeur in het Ommeland

*Plan:* A1 + nieuw: bijbaan buschauffeur provincie · *Waar:* Streeklijn Stad–Bedum–Loppersum–Appingedam, Stad–Winsum–Warffum–Uithuizen, en de Sneldienst Stad–Delfzijl over de N360

De bestaande bijbaan (`sidejob_bus.js`) krijgt in F4a drie streeklijnen. Haltes en volgorde uit OSM (`route=bus`), geen echte vervoerder: de bussen heten **Streekbus** en de snelle lijn **Sneldienst** (plan §3.3). Nieuw per lijn:
- **Wind op de dijk**: op de Sneldienst langs de N360 bij Appingedam en op de dijkweg naar Uithuizen staat een **zijwind-meter**; bij windkracht 8 (niveau 3) moet je de bus rechthouden.
- **Overstappen** op de trein: bij station Appingedam wachten op een vertraagde trein levert een bonus ("aansluiting gehaald").
- **Rare passagiers**: één per rit, met één zin (hieronder).
- Ontgrendeld na O2 (Hogeland) en n-delfzijl (Eemsdelta). Collega Jannes geeft de dienst.

**Jannes (dienst en commentaar)**

- **Buschauffeur Jannes** *(droog, gemoedelijk)*: Jij bent de nieuwe? Lijn naar Uithuizen. De dijk is het mooiste stuk. En het winderigste.
- **Buschauffeur Jannes** *(droog)*: Bij de halte stoppen, niet ervoor. De mensen hier lopen niet naar een bus. De bus komt naar hen.
- **Buschauffeur Jannes** *(droog, gemoedelijk)*: Zijwind. Stuur ertegenin, maar niet te veel. De wind is hier al langer dan jij.
- **Buschauffeur Jannes** *(tevreden)*: Op tijd in Appingedam. De trein was te laat. Dus jij was vroeg. Zo werkt dat hier.
- **Buschauffeur Jannes** *(droog)*: Niemand ingestapt in Westeremden. Dat is normaal. Ze wilden alleen even zwaaien.

**Passagiers**

- **Reiziger** *(kletserig)*: Ik ga maar tot de volgende halte. Lopen is ook zo ver.
- **Boer** *(droog)*: Zet me af bij het hek. Niet bij de halte. Bij het hek.
- **Student** *(moe)*: Wekt u mij in Stad? Of in Uithuizen. Waar we dan ook als eerste zijn.
- **Toerist** *(nieuwsgierig, vragend)*: Waar is de zee? Ik zie alleen een dijk.
- **Reiziger** *(kletserig, warm)*: Ik heb soep bij me. Voor mijn moeder. Rustig remmen, hè.
- **Reiziger** *(stellig)*: Vroeger reed de bus hier vier keer per dag. Nu twee keer per uur. Het is te druk geworden.

### 5.3 Motor en brommer met versnellingen

*Plan:* nieuw (wens eigenaar) · *Waar:* Brommer & Bougie in Winsum (winkel), rondes over het Hogeland

**Nieuw voertuig: de brommer met versnellingen** (een oude bromfiets met drie versnellingen en een koppeling, geen merk) en **een lichte motor** (125 cc). Te koop bij **Brommer & Bougie** in Winsum (fictief), vanaf O3. Een owned voertuig is alleen wat je koopt: geen brommer uit een missie blijft van jou.
- **Schakelen**: Q/E (of de schouderknoppen), met een koppelingsmoment; verkeerd schakelen = de motor slaat af (één tel, een plof). Automatisch schakelen kan in de instellingen (toegankelijkheid).
- **Activiteit "Het rondje"**: de klassieke zondagrit langs vijf wierdedorpen (Winsum–Baflo–Den Andel–Warffum–Usquert–terug), tijdrit met schakelscore. Medailles; goud geeft een helm met een eierbal erop (cosmetisch).
- **Waarom het past**: op het Hogeland reed iedereen ooit een brommer. Tammo heeft er herinneringen aan; Tessa niet ("Ik had een fiets. Met bonnetje.").

**Brommer & Bougie (winkel) en het rondje**

- **Boer** *(droog, trots, achter de toonbank)*: Brommer & Bougie. Drie versnellingen, één koppeling, nul geduld. Proefrit mag. Valpartij betaal je.
- **Boer** *(droog)*: Koppeling in, schakelen, koppeling los. Als hij hoest, ben jij het. Niet hij.
- **Tammo** *(nostalgisch, droog)*: Ik had er een toen ik zestien was. Hij reed vijfenveertig. Bergaf.
- **Tessa** *(plagend)*: Er zijn hier geen bergen.
- **Tammo** *(droog)*: Daarom reed hij nooit vijfenveertig.
- **Tessa** *(ongeduldig, achterop)*: Schakel nou! Hij schreeuwt.
- **Tammo** *(droog, rijdend)*: Hij zingt. Dat is anders.
- **Tammo** *(tevreden)*: Het rondje in elf minuten. Ik ben weer zestien.
- **Tessa** *(droog)*: Je rijdt als iemand van zestien. Dat klopt.

### 5.4 Vrachtwagen: leveringen naar Eemshaven en Delfzijl

*Plan:* A26 + nieuw (wens eigenaar) · *Waar:* Depot aan de rand van Stad (Eemspoort-kant, fictief "Transport Wierda") → Eemshaven, Delfzijl (Oosterhorn), Appingedam

Een vrachtwagen met oplegger (nieuw voertuig: lang, traag in de bocht, achteruit inparkeren met de oplegger). Ritten:
- **Eemshaven** (container ophalen of brengen, inparkeren onder de kraan, de N46 Eemshavenweg op met de wind);
- **Delfzijl, Oosterhorn** (vaten, met een tankoplegger: breekbaar-meter zoals de tankwagen in H8, maar dan voor klotsen);
- **Appingedam** (een levering voor de filialen: vet, eieren, paneermeel, die je eigen filialen in Warffum en Delfzijl een dag extra inkomen geven).
Niveaus: 1 overdag, 2 met tijdvenster bij de terminal, 3 's nachts met een smalle dijkweg. Vanaf O8 (de chauffeur die het aanbiedt, heeft van de kraan gehoord) of eerder als losse bijbaan na n-delfzijl. **Geen merknamen** op de opleggers.

**Planner en terminal**

- **Loodsdienst** *(zakelijk, door de marifoon)*: Terminal. Je staat in rij vier. Rij naar de kraan als het groene licht brandt. Niet eerder.
- **Loodsdienst** *(zakelijk)*: Achteruit, onder de kraan. Twee meter. Nog één. Klik. Goed.
- **Buschauffeur Jannes** *(droog, aan de telefoon)*: Planner. Je moet om drie uur in Delfzijl zijn. Het is kwart voor drie. Je bent in Uithuizen. Succes.
- **Tessa** *(gespannen)*: Hij is achttien meter lang en hij wil rechtdoor.
- **Tammo** *(droog)*: Bochten zijn hier ook niet bedoeld voor dit.
- **Tammo** *(tevreden)*: Paneermeel voor Warffum, vet voor Delfzijl. We bezorgen onze eigen spullen.
- **Tessa** *(trots)*: Een netwerk, Tammo.
- **Tammo** *(droog)*: Een vrachtwagen.

### 5.5 Driftplekken

*Plan:* nieuw (wens eigenaar) · *Waar:* Vijf vaste plekken in F4a, 's avonds en 's nachts

Een driftplek is een lege, verharde plek met een start-icoon; een sessie duurt 60 s en telt hoek × snelheid × duur (zoals de stuntavond, `stunthud.js`). Medailles per plek. **Politie**: een plek is "rustig" tot je 2 minuten driftt; daarna komt een melding en na 4 minuten een surveillance (1 ster). **Geen** driftplekken op erven, kerkpaden of bij wierden.
1. **Het parkeerterrein bij de Wolkenhal**, Eemshaven: groot, leeg en verlicht; Durk en Douwe kijken toe.
2. **Industrieterrein Oosterhorn**, Delfzijl: een rotonde zonder verkeer bij nacht.
3. **Het kermisterrein in Uithuizen**, als er geen kermis is.
4. **De carpoolplaats bij de N360** (bij Garrelsweer of Ten Post, plek uit OSM): een klassieker voor de Stadse jeugd.
5. **De Eemspoort in Stad** (bedrijventerrein, 's nachts leeg).

**Commentaar**

- **Tessa** *(juichend)*: Dwars! Helemaal dwars! Hou hem!
- **Tammo** *(droog, duizelig)*: Ik zie de Wolkenhal vier keer.
- **Durk** *(traag, onder de indruk)*: Douwe. Kijk. Hij rijdt opzij.
- **Douwe** *(traag)*: …opzij.
- **Durk** *(traag, plechtig)*: Wij hebben niks gezien. Wij kijken naar de cloud.
- **Tessa** *(grinnikend)*: Rubber op de rotonde. Delfzijl gaat praten.
- **Tammo** *(droog)*: Delfzijl praat niet. Delfzijl kijkt.
- **Agente** *(kordaat, door een luidspreker)*: Dit is geen circuit. Het is een rotonde. Ga naar huis.

### 5.6 Trekkertrek

*Plan:* A5 (Hogeland-deel) · *Waar:* Uithuizermeeden (de baan bij het sportveld, fictief) en Warffum; de Westerkwartier-finale is F4b

Een sleepslee met oplopend gewicht; zo ver mogelijk komen voor de wielen slippen of de motor afslaat. Tunen bij Jakob of bij de trekkerservice in Usquert (gewichten voorop, banden, een turbo "van een vriend"). **Eigen trekker** te koop (oud, € 2.500, of een nieuwe, € 9.000); de geleende van Jakob mag ook, maar die blijft van Jakob. Eppo doet altijd mee met zijn monstertrekker en wint altijd de eerste ronde. Na n-trekkertrek (optioneel verhaal) is de activiteit vrij.

**Omroeper en publiek**

- **Omroeper** *(luid, enthousiast)*: Op de baan: een Stadjer! Laat hem maar komen, dames en heren, hij heeft het zelf gewild!
- **Omroeper** *(luid, enthousiast)*: Hij trekt! Hij trekt! Hij trekt nog steeds!
- **Omroeper** *(luid, teleurgesteld)*: Ah. Afgeslagen. Hij keek naar het publiek. Dat moet je nooit doen.
- **Omroeper** *(luid, plechtig)*: Full pull! Hij is over de streep! Dat hebben we hier in geen jaren gezien. Vorig jaar wel. Maar daarvoor niet.
- **Eppo Bolt** *(luid, grinnikend)*: Leuk geprobeerd, Stadjer. Mijn trekker weegt meer dan jouw hele dorp.
- **Tammo** *(droog)*: Ik woon in een flat.

### 5.7 Races: dijk, N-weg, kanaal, turbines

*Plan:* A9, A10, A11, A13 · *Waar:* Eemsdijk, N360 / N46 / N33, Eemskanaal en Damsterdiep, windpark Eemshaven

- **Dijkraces (A9):** tijdritten over de wegen langs de Eemsdijk (Delfzijl–Holwierde–Bierum, en de dijk bij Uithuizen); wind van opzij, schapen op de weg (stilstaan = wachten, niet toeteren).
- **N-wegsprints (A10):** N360 Stad–Delfzijl (de hele lengte, met verkeer en de flitspaal als bonusvalkuil), N46 Eemshavenweg (recht en winderig), N33 bij Appingedam (op- en afritten). Punt-tot-punt.
- **Kanaalraces (A11):** Eemskanaal van de Oostersluis tot Farmsum (bruggen die open moeten: toeteren en hopen), en het Damsterdiep van Ten Boer tot Appingedam (smal, lage bruggen: bukken is niet nodig, maar Tammo doet het toch).
- **Turbineslalom (A13):** met de heli tussen de turbines van Eemshaven door, poorten om de masten, wieken die draaien. Raak je een wiek, dan is het geen fail maar een "storing" (je heli tolt 2 s).

**Commentaar**

- **Tessa** *(gespannen)*: Schapen. Stilstaan. Niet toeteren, Tammo, ze worden er alleen maar langzamer van.
- **Tammo** *(droog)*: Ze kijken alsof ik te laat ben.
- **Tessa** *(strijdlustig)*: Brug gaat open. We halen het. We halen het niet. We halen het.
- **Tammo** *(droog, opgelucht)*: Ik heb gebukt.
- **Tessa** *(droog)*: Er zat drie meter tussen.
- **Tammo** *(gespannen, in de heli)*: Die wiek draait sneller dan ik dacht.
- **Tessa** *(droog)*: Ze draaien altijd sneller dan je denkt. Daarom staan ze hier en niet in Stad.

### 5.8 Gewasspuiter (Hogeland)

*Plan:* A2 · *Waar:* Een graspiste bij een boerderij bij Kloosterburen (fictief); velden rond de wierden

Laag over percelen, aan/uit boven het juiste veld, niet boven sloten of erven. In de nazomer spuit je vooral "groenbemester" (iets onschuldigs, geen gif-grappen). Hoogspanningslijn bij Eemshaven: eronder door is een bonus, ertegen is een fail. Wiep regelt de vluchten.

**Wiep (headset)**

- **Vlieger Wiep** *(zakelijk, door de headset)*: Perceel drie. Begin bij de sloot, eindig bij de boom. Niet bij de buren.
- **Vlieger Wiep** *(droog, door de headset)*: Je spuit de wierde. Daar groeit al achthonderd jaar niks nieuws. Zo laten.
- **Vlieger Wiep** *(droog)*: Onder de lijn door. Niet erover. Ik heb het één keer erover gedaan. Ik vlieg nu alleen nog op dinsdag.
- **Tammo** *(droog)*: Ik zie mijn eigen schaduw over het graan gaan.
- **Tessa** *(gespannen)*: Die is te dichtbij, Tammo.

### 5.9 Havenloods

*Plan:* A3 · *Waar:* Delfzijl en Eemshaven (start bij Klaas' bootje na Z8)

Schepen binnenbrengen: aan boord gaan van een schip op de rede (touwladder-minispel), het schip door de boeienlijn sturen met vertraging (een schip reageert pas na 4 s), en aanleggen. Mist en stroming wisselen; bij laagwater is de geul smaller. Klaas is de dispatcher.

**Klaas (dispatcher)**

- **Kapitein Klaas** *(schor, door de marifoon)*: Schip op de rede. Negentig meter, een kapitein die geen Nederlands spreekt en geen haast heeft. Net als ik.
- **Kapitein Klaas** *(schor, droog)*: Een schip draait pas als je het al vergeten bent. Vooruitdenken.
- **Kapitein Klaas** *(schor, tevreden)*: Aan de kade. Geen kras. Je bent beter dan ik was. Zeg het niet verder.

### 5.10 Taxi, pakketten, verhuizen

*Plan:* A23, A24, A25 · *Waar:* Taxi-standplaats Delfzijl (station), pakketdepot Appingedam, verhuisbusjes in Winsum

De bestaande bijbaantjes, met nieuwe ritten en een paar regels per regio. Taxi in Delfzijl: ritten naar de dorpen langs de Eems. Pakketten: lange rondes over dijkwegen, met wind. Verhuizen: van dorp naar dorp (en één keer van Stad naar Uithuizen, "voor de rust").

**Klanten**

- **Reiziger** *(kletserig)*: Naar Termunten graag. Ik wil de zon zien ondergaan. Niet te snel rijden, dan mis ik hem.
- **Boer** *(droog)*: Naar Spijk. Het is maar vijf kilometer. Ik zou lopen, maar ik heb een kast.
- **Reiziger** *(stellig)*: Een pakket voor Godlinze? Dat is voor mij. Ik heb het niet besteld. Ik neem het wel.
- **Student** *(moe)*: We verhuizen van Stad naar Uithuizen. Voor de rust. Is het hier altijd zo stil? O. Fijn.

### 5.11 Fjord-filialen en overvallen

*Plan:* A22 · *Waar:* Warffum (café van Jakob, na O6) en de zeesluis in Delfzijl (Lammert, na O10)

Elk filiaal geeft daginkomen (economy.js; nooit een blokkade). Verbeteren: een tweede frituurpan, een terras, het eigen recept (de Hogelander eierbal met kerkland-paneermeel; de Eemsdelta-eierbal met zeezout). **Overvallen** door Ubbo's mensen zijn een event (`§6`): een melding van de melder ("Twee mannen bij het luik. Ik meld alleen."), je hebt 4 minuten om er te komen; daarna verdedigen (wegjagen, niet schieten: het zijn knechten met een koevoet). Niet op tijd = een dag geen inkomen, verder niks.

**Melders en bondgenoten**

- **Kosteres Geesje** *(droog, aan de telefoon)*: Twee mannen bij Jakobs luik. Met een koevoet. Ik meld alleen.
- **Sluiswachter Lammert** *(oud, kalm, aan de telefoon)*: Er staat iemand bij mijn luik die geen eierbal wil. Ik meld alleen.
- **Kroegbaas Jakob** *(gemoedelijk)*: Vandaag veertig eierballen. Na de bingo nog twintig. De dominee nam er drie.
- **Sluiswachter Lammert** *(oud, droog)*: Ik heb er zes verkocht. Er kwam geen schip. Goede dag.
- **Tessa** *(tevreden)*: Twee filialen draaien. Zonder ons.
- **Tammo** *(droog)*: Dat is het eng aan filialen.

### 5.12 Verkennen en verzamelen

*Plan:* A7, A15-A20, A27, A30, A31, A34-A36 · *Waar:* Hogeland en Eemsdelta

- **Uitkijkpunten (A15):** Hogeland: de toren van de Hippolytuskerk in **Middelstum**; Eemsdelta: de stelling van **molen Adam** in Delfzijl. Elk onthult de kaart in een straal van 6 km en wordt een snelreispunt. Op de toren meldt de melder iets.
- **Kieken (A16):** album "Hogeland" en "Eemsdelta", elk 20-25 herkenningspunten (§7).
- **Kerkenpad (A17):** een stempelkaart; in F4a ± 45 kerken. Bij elke kerk een korte regel (§7); de koster of kosteres zegt soms iets.
- **Wierden (A18):** op de top staan van 12 wierden in het Hogeland (de lijst komt uit AHN + OSM `place`; zie §9).
- **Borgenroute (A19):** het Hogeland-deel: Menkemaborg (Uithuizen), Verhildersum (Leens), Ewsum (Middelstum), Dijksterhuis (Pieterburen), te controleren in OSM; op de fiets, één dag speltijd.
- **Molenaar (A20):** de wieken op de wind en het zeil voor: molen Adam (Delfzijl), De Goliath (bij Uithuizen), plus de molens die OSM in deze regio's heeft.
- **Balen rapen (A7):** in de nazomer: ronde balen van het land naar het erf voor de bui (een wolk op de minimap). Jakob en drie boeren bieden het aan.
- **Treinspotter (A27):** beide lijnen helemaal uitrijden en elk station aandoen; badge "Elke halte".
- **Wind tegen (A30):** fietstijdrit over de zeedijk bij Uithuizen tegen windkracht 6.
- **Vissen bij de sluis (A31):** bij Lammert: een vis, een gesprek, een melding.
- **Wereldeinden, dorpsuitjes, geheimen (A34-A36):** zie §7.

**Uitkijkpunten**

- **Kosteres Geesje** *(droog, aan de telefoon)*: Je staat op de toren van Middelstum. Zie je Den Andel? Daar sta ik. Zwaai maar. Ik zie het.
- **Sluiswachter Lammert** *(oud, droog, aan de telefoon)*: Je staat op molen Adam. Je ziet mijn sluis. Ik zie jou. Ik meld alleen.

**Balen rapen**

- **Kroegbaas Jakob** *(gemoedelijk)*: Er komt een bui. Twintig balen naar het erf. Rond is makkelijk rollen, maar niet makkelijk stoppen.
- **Tammo** *(droog)*: Ze rollen beter dan ik dacht.
- **Tessa** *(gehaast)*: Naar het erf, niet de sloot in. Een baal zwemt niet.

**Vissen bij de sluis**

- **Sluiswachter Lammert** *(oud, kalm)*: Hier vis je niet voor de vis. Je vist omdat je hier zit.
- **Sluiswachter Lammert** *(oud, droog)*: Een bot. Gooi maar terug. Hij heeft zijn hele leven nog voor zich. Ik niet. Ik vis verder.
- **Sluiswachter Lammert** *(oud, droog)*: Daar vaart een zeiljacht uit Duitsland. Te laat voor de schutting. Ik meld alleen. Ik doe hem toch open.

**Wind tegen**

- **Tessa** *(buiten adem, plagend)*: Windkracht zes. Tegen. Dit bouwt karakter, zei je.
- **Tammo** *(buiten adem, droog)*: Ik heb nu genoeg karakter. Voor twee.

## 6. Toevallige ontmoetingen en events

Regels uit het verhaal-document §6.1: nooit tijdens een missie, maar één tegelijk in beeld, en altijd een beloning of een grap. **Alleen zomer:** geen carbid, geen natuurijs, geen Koningsdag; de grote events in F4a zijn de kermis, het oogstfeest en de havendag.

**Een loonwerkkonvooi van Eppo** · klein · smalle wegen Hogeland

- **Tammo** *(droog)*: Drie trekkers, twee kippers en een man die zwaait. Niet naar ons.
- **Tessa** *(droog)*: Berm in. Hij gaat niet opzij. Het is zijn weg, vindt hij.

**Schapen op de dijk** · klein · Eemsdijk, dijk bij Uithuizen

- **Tessa** *(droog)*: Schapen. Ze kijken alsof wíj op hun dijk staan.
- **Tammo** *(droog)*: Dat klopt ook.

**Een lifter met een verhaal** · klein · N360, N46

- **Reiziger** *(kletserig, stapt in)*: Naar Delfzijl. Ik ben daar geboren. Ik ben er nooit weggeweest. Ik stond hier alleen even.
- **Tammo** *(droog)*: Even?
- **Reiziger** *(kletserig)*: Sinds vanochtend. Er stopt hier niemand. Behalve jullie. Dank je.

**Een kapotte auto bij een wierde** · klein · Hogeland

- **Boer** *(droog)*: Hij doet het niet. Hij heeft het nooit gedaan. Maar vandaag ook niet.
- **Tessa** *(zakelijk)*: Accu. Kabels erop, Tammo.
- **Boer** *(droog, dankbaar)*: Hier. Een zak aardappels. Meer heb ik niet. Ze zijn wel goed.

**Een boer die zijn koe kwijt is** · klein · Eemsdelta

- **Boer** *(droog, bezorgd)*: Hebben jullie een koe gezien? Zwart-wit. Ze heet Aaltje.
- **Tammo** *(droog)*: Die ken ik. Ze praat.
- **Boer** *(droog)*: Een andere Aaltje. Deze praat niet. Gelukkig.

**Een melder fietst voorbij** · klein · overal in F4a

- **Kosteres Geesje** *(droog, fietsend)*: Jullie rijden te hard. Ik meld alleen.
- **Sluiswachter Lammert** *(oud, droog, vanaf een bankje)*: Mooi weer. Er komt niks aan. Ik meld alleen.

**Een overval op een Fjord-filiaal** · klein · Warffum, Delfzijl

- **Tessa** *(fel)*: Twee knechten van Ubbo bij het luik. Erheen!
- **Tammo** *(droog)*: Ze willen de pannen. Ze kunnen niet eens bakken.

**De Friese wegversperring (grensgag; voorproef voor F4b, spawnt op de weg van Kloosterburen naar Lauwersoog)** · klein · westrand Hogeland

- **Wybe** *(traag, plechtig)*: Halt. Fryske grins. Paspoart, as it jo belieft. *(Halt. Friese grens. Paspoort, alstublieft.)*
- **Tessa** *(ongelovig)*: Dit is Groningen. De grens is twintig kilometer verderop.
- **Wiebren** *(traag, eerlijk)*: Wy oefenje. *(Wij oefenen.)*
- **Tammo** *(droog)*: Jullie lijken op iemand.
- **Wybe** *(traag, trots)*: Wy binne de neven fan Durk en Douwe. *(Wij zijn de neven van Durk en Douwe.)*
- **Wiebren** *(traag)*: …Douwe.
- **Tessa** *(droog)*: Natuurlijk.
- **Wybe** *(traag, plechtig)*: Jim meie troch. Mar net fertelle. *(Jullie mogen door. Maar niet doorvertellen.)*

**De weekmarkt in Uithuizen of Appingedam** · middel · dorpscentra

- **Reiziger** *(kletserig)*: Kaas, vis, en een man die zegt dat hij Vikinggoud verkoopt. Ik koop de kaas.

**Een voetbalwedstrijd op het dorpsveld** · middel · Zandeweer, Holwierde

- **Tessa** *(lachend)*: Twaalf toeschouwers. Elf spelers. Eén scheidsrechter. Ze kennen elkaar allemaal.
- **Tammo** *(droog)*: Dan is het altijd een thuiswedstrijd.

**Een begrafenis (stil, niet storen; wie toetert krijgt een blik)** · middel · een dorpskerk

- **Tammo** *(zacht)*: Rustig. Even niet toeteren.
- **Tessa** *(zacht)*: Ik weet het.

**Een fanfare die oefent** · middel · Uithuizermeeden, Loppersum

- **Tammo** *(droog)*: Ze spelen hetzelfde stuk voor de vierde keer.
- **Tessa** *(droog)*: Het wordt elke keer beter.
- **Tammo** *(droog)*: Het wordt elke keer harder.

**De kermis in Uithuizen (zomerweekend; botsauto's, zweefmolen, schiettent)** · groot · Uithuizen

- **Tessa** *(uitgelaten)*: De zweefmolen! Eén rondje.
- **Tammo** *(droog)*: Ik kijk wel. Van de grond. Daar is hij het mooist.

**Het oogstfeest (nazomer, het laatste graan binnen)** · groot · Warffum of Middelstum

- **Kroegbaas Jakob** *(gemoedelijk)*: Het graan is binnen. Nu de mensen nog. Bier staat klaar.

**Havendag in Delfzijl (zomer, open schepen, rondvaarten)** · groot · Delfzijl haven

- **Kapitein Klaas** *(schor, knipogend)*: Havendag. Iedereen mag aan boord. Vroeger moest je daar loods voor zijn.

## 7. Herkenningspunten en geheimen

Bij de eerste keer dichtbij: een naamkaart (de plaatsnaam groot, één droge regel klein) en één zin van Rikus (`V`, in de radioklank). De plaatsen en gebouwen hebben hun echte naam; zie §10 voor wat er te verifiëren is.

| Naamkaart | Kaartregel |
|---|---|
| Bedum, Walfriduskerk | Scheef sinds de middeleeuwen. Niemand is van plan hem recht te zetten. |
| Stedum, wierdekerk | Op een bult. Al eeuwen droog. |
| Loppersum, Petrus en Pauluskerk | Groot genoeg voor het hele dorp. En de buurdorpen. |
| Zeerijp, Jacobuskerk | Kerk en toren, elk een eigen plek. |
| Krewerd, kerk | Klein dorp. Oud orgel. Stil publiek. |
| Appingedam, hangende keukens | Hangen al eeuwen boven het Damsterdiep. Vallen niet. |
| Delfzijl, molen Adam | Een molen in de haven. Hij weet het. |
| Farmsum, zeesluizen | Waar het Eemskanaal ophoudt en de Eems begint. |
| Eemshaven, vuurtoren | Rood-wit, tussen de turbines. |
| Eemshaven, de Wolkenhal | Grijze doos. Bewaakt door twee reuzen. |
| Uithuizen, Menkemaborg | Een borg met een gracht. En een doolhof voor wie verdwalen wil. |
| Uithuizen, Jacobuskerk | Groot dorp. Grote kerk. |
| Usquert, kerk | Kerk op de wierde, molen erbij. |
| Warffum | Wierde, station, café. Alles wat je nodig hebt. |
| Den Andel, kerk | Klein. Op een bult. Met een kosteres die alles ziet. |
| Middelstum, Hippolytuskerk | Hoge toren. Laag land. Uitkijkpunt. |
| Leens, Verhildersum | Borg, tuin, stilte. |
| Roodeschool, station | Ooit het eindpunt. Nu bijna. |
| Termunten, kerk | Achter de dijk. Uitzicht op de Dollard. |
| Winsum, het Winsumerdiep | Water, molens, een brug voor de foto. |
| Garmerwolde, ruïnekerk | Half een kerk. Helemaal mooi. |
| Uithuizen, de zeedijk | Land, kwelder, wad. In die volgorde. |

**Rikus bij de ontdekking**

- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: De scheve toren van Bedum. Pisa heeft er ook een. Die van Bedum is eerlijker over zichzelf. `[naamkaart]`
- **Rikus (verteller)** *(warm, vertellend)*: De wierde van Stedum. Een bult tegen de zee, eeuwen voor de dijken. De zee is weg. De bult is gebleven. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Loppersum. Een grote kerk, en een klokkenstoel waar je één keer mag luiden. Voor de gezelligheid. Vraag het de koster. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Zeerijp. Een kerk met een losse klokkentoren. Ze staan naast elkaar, al eeuwen, zonder ruzie. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Krewerd. Een klein dorp met een grote kerk en een orgel waar mensen voor van ver komen. Ze komen, luisteren, en gaan weer. `[naamkaart]`
- **Rikus (verteller)** *(warm, vertellend)*: Appingedam. Keukens die boven het water hangen. Ooit was er geen ruimte. Nu is het het mooiste stukje van de Eemsdelta. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Molen Adam, Delfzijl. Een molen op een dijk in een havenstad. Hij maalt niet voor de haven. Hij staat er om naar te kijken. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: De zeesluizen bij Farmsum. Hier wordt het kanaal de zee. Of andersom. Lammert weet het. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Eemshaven. Turbines, kranen, grijze dozen en een vuurtoren die het allemaal belicht. Aan de overkant ligt Duitsland. Het zwaait niet. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: De Wolkenhal. Een grijze doos zo groot als een dorp. Hier staat de cloud, zeggen ze. Niemand heeft hem gezien. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: De Menkemaborg in Uithuizen. Een borg met een gracht en een doolhof. Wie de weg kwijt is, is hier op de goede plek. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Uithuizen. Een grote kerk voor een dorp dat vindt dat het een stad is. Het heeft gelijk, op kermisdagen. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Usquert. Een kerk, een molen, en een loonbedrijf dat ik niet ga noemen. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Warffum. Een wierdedorp met een station, een café en een kamer boven het café. Je weet wel welke. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Den Andel. Een kleine kerk op een wierde. Hier zit Geesje. Ze ziet je al. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Middelstum. Een hoge toren in een laag land. Van bovenaf zie je het hele Hogeland. Het ziet jou ook. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Leens en de borg Verhildersum. Een borg met een tuin waar je stil van wordt. Dat is hier geen compliment, dat is een feit. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Roodeschool. Hier hield het spoor op. Toen kwam Eemshaven. Nu houdt het daar op. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Termunten. Een dorp achter de dijk met een kerk die naar de Dollard kijkt. Klaas wil hier ooit liggen. Later. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Winsum. Een dorp met water, molens en een brug waar iedereen een foto van maakt. Ik ook. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Garmerwolde. Een kerk zonder schip, alleen het koor staat er nog. De rest is weg. Het koor zingt toch. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: De zeedijk bij Uithuizen. Aan de ene kant land, aan de andere kant kwelder, en daarachter het wad. Hier begint het eind van Nederland. `[naamkaart]`

**Geheimen (A36), 4 per regio**

- **De sleutel van Harm-Jan** (Hogeland): Na Z1 past de oude sleutel op een kist in de toren van Den Andel. Er zit een kerkboek in uit 1953, met in de kantlijn: "Trijntje droeg weer mijn tas. G."
  - **Kosteres Geesje** *(droog, zacht)*: Die kist was op slot. Nu niet meer. Ik meld alleen.
- **Het bankje op de dijk bij Uithuizen** (Hogeland): Een bankje met een plaatje: "Voor wie de wind niet erg vindt." Wie er zit bij zonsondergang, krijgt een eierbal-kieken.
  - **Tammo** *(droog, zacht)*: Hier zat ik ooit met opa. Hij zei niks. Ik ook niet. Het was een goede dag.
- **De verdwaalde zeehond** (Hogeland): Een zeehond in een sloot bij Oldenzijl. Bel de zeehondenopvang (fictief "Zeehondenhuis") en wacht op afstand; niet aanraken.
  - **Tessa** *(zacht)*: Afstand houden. Hij is niet verdwaald. Hij is gewoon nieuwsgierig.
- **De Fjord-wieldop** (Hogeland): Uit Z1: als je de wieldop bij Brommer & Bougie inlevert, monteren ze hem op de Escapade. Hij past. "Dat zei ik."
  - **Tammo** *(droog, tevreden)*: Hij past. Ik zei het.
- **De ijsvogel van Jantina** (Eemsdelta): Bij de brug over het Winsumerdiep (op de lijn) zit soms een ijsvogel. Fotografeer hem vanuit de trein.
  - **Machinist Jantina** *(zacht, ontroerd)*: Daar. Ik zie hem. Veertig jaar. Kijk niet naar mij, kijk naar het sein.
- **De kelder onder het woonschip** (Eemsdelta): Onder het woonschip ligt een luik met een kist van Lammerts broer: dertig flessen jenever en een brief: "Voor als je weer aan land gaat."
  - **Sluiswachter Lammert** *(oud, droog)*: Mijn broer. Hij heeft het nooit opgedronken. Hij werd zeeziek van de gedachte.
- **De dansschoenen** (Eemsdelta): In het sluiswachtershuisje staan in een kast een paar oude dansschoenen. Na O10 vraagt Tessa ernaar.
  - **Sluiswachter Lammert** *(oud, zacht)*: Van 1953. Ze passen nog. Ik heb ze nooit meer aangehad. Ik wacht.
- **De kat van Willemien (alleen met Scheuren)** (Eemsdelta): Na Z27 zit de kat soms op de oude stoep in Loppersum. Breng hem naar de wisselwoning; na Z28 zit hij er niet meer.
  - **Willemien** *(rustig, warm)*: Hij was weer thuis. Hij snapt het nog niet. Dank je.

## 8. Nachtstreek in F4a

Alle radiomomenten op een rij (de regels staan bij de missies). Rikus zendt vaak "op tournee" vanuit zijn busje; de melders bellen in; Ubbo belt drie keer live.

| Stap | Moment | Beller |
|---|---|---|
| O1 | Bel Rikus | De torenwachter, d'Olle Grieze |
| O1 | na afloop | Ubbo, Oldenhuis Bakt |
| O1 | na afloop | Jelle, Ljouwert |
| O2 | Bel Rikus | Trijntje, 92 |
| O3 | Bel Rikus | Geesje, kosteres |
| O4 | Bel Rikus | Geesje, kosteres |
| O5 | Bel Rikus | Rikus zelf |
| O6 | Bel Rikus | Ubbo, Oldenhuis Bakt |
| n-delfzijl | na afloop | Rikus zelf (de ene ernstige zin over de gaswinning) |
| O7 | Bel Rikus | Lammert, zeesluis |
| O8 | Bel Rikus | Henk, Garage Knalpot |
| O9 | Bel Rikus | Lammert, zeesluis |
| O10 | Bel Rikus | Ubbo, Oldenhuis Bakt |
| tweede voorronde | rubrieken: de melders, peiling "Groeien of thuis?", Ubbo | Ubbo Oldenhuis |
| Z28 | live vanaf een erf in Loppersum (alleen met Scheuren) | Rikus zelf |

**Vaste rubrieken die doorlopen** (voor de schrijvers van de radiofragmenten tussen missies): de fietstunnel-update schuift door ("Bijna klaar. 2032."), het storingsbericht wordt in de Eemsdelta "Storingsbericht: de zeesluis bij Farmsum is dicht. Volgens de sluiswachter is dat geen storing. Dat is op tijd.", en de peiling "Groeien of thuis?" vervangt "Woist ja wel?".

## 9. Continuïteit, personages en gevoelige onderwerpen

**Deel 1-3 blijven ongewijzigd.** F4a raakt niets wat al gespeeld is; het leunt erop:
- De **Fjord Frituur** is de Escapade met het luik (epiloog), en daarom kan een takelwagen haar meenemen (O1).
- **Henks zender** (k-nacht, Kop: "Er zit nou een zender in.") wordt in O8 de zender onder Siebrands container.
- **Rikus heeft zelf een rode auto** (H16: "Ik heb er zelf een.") en leent hem uit in O1.
- **De zee achter de dijk** (de treinscène "Even onderduiken", Romp) betaalt zich uit op de dijk in Delfzijl (n-delfzijl): "Hij ligt er ook." "Een beetje."
- **Durk en Douwe** werken in F4a voor Ubbo ("Hij betaalt per brein. Wij krijgen dus de helft.", plan §2.2) en zijn nooit gemeen: ze kijken weg (O8) en lopen naar huis (O1, net als na de koe van Ome Jan). Ze lopen pas in F4c (O22) echt over.
- **Jelle** komt alleen aan de telefoon (na O1): hij mist zijn jongens. Zijn wrok tegen Ubbo (de bakkerij van zijn Mem) is voor F4b.
- **Oma Trijntje** is 92 en Tammo's oma; opa leeft niet meer (alleen "zei"). Haar 1953 heeft nu drie kanten: de Snackprijs (Deel 3), Geesjes tas (O3), de dans met Lammert (O7), en de **tweede plaats in de Ommelander Ronde van 1953** (Z4, een aanwijzing voor de finale: "De jury was van een Oldenhuis. Zijn opa."). Dat laatste is een **voorstel** voor F4c; past het niet, dan blijft Z4 bij "er was al eens een Ronde" en valt de zin over de jury weg.
- **De complimentenladder** loopt mee: Rikus' "Ow" (O1), Eppo's "Ow" en Hennies "Valt mie nait of" (O6), Lammerts "Braid noar de zin" (O10, "Ik bewaar wat. Voor de finale."). De bovenste treden blijven voor later.
- **Tammo en Tessa zijn samen.** Ze zeggen het niet hardop (dat deed hij al, één keer). De spanning van Deel 4 begint klein: zij telt filialen ("Van zeven."), hij telt wat hij heeft ("Twee is ook een mooi getal.", "Ik wil alleen niet minder."). Geen ruzie in F4a; die is voor O23.
- **Ubbo** is in F4a geduldig en joviaal en verliest twee keer zonder boos te worden ("Eén van zeven. Ik heb er eenenveertig."). De franchise-verleiding wordt alleen gezaaid ("Jij kunt verkopen. Ik onthoud gezichten.", O5).
- **Personagebijbel:** Tammo zegt nooit "super" en geen Fries; hij zegt het belangrijke kort ("Wij hebben er één. Die is warm."). Tessa geeft bevelen, weet de feiten (wierden zijn monumenten, stuurboord is rechts) en geeft niet op. Rikus vertelt nooit meer dan de speler weet. Durk maakt zinnen af, Douwe herhaalt het laatste woord. Kapitein Klaas is schor en knipoogt.
- **Dialoogregels** (uit de dialoogreview van oktober 2026): de `why`-regels verwijzen niet naar wat pas in de intro gebeurt; niemand legt uit wat de ander al weet; "Ik meld alleen" komt per scène hooguit één keer per melder; "Kon minder" spaarzaam.

**Gevoelige onderwerpen (verhaal-document §8)**
| Onderwerp | In F4a |
|---|---|
| Gaswinning en aardbevingen | Achtergrond in het decor (steunbalken, steigers, versterkte huizen langs de lijn naar Delfzijl). Rikus zegt er **één keer** iets over, ernstig en zonder grap (n-delfzijl). De reeks **Scheuren** is warm en stil, zonder fail, zonder bedrijven of instanties, zonder schurk; de humor zit in dozen en een kat. Alleen als de eigenaar ja zegt. |
| Datacenters in Eemshaven | De fictieve **Wolkenhal**, "grijze doos zo groot als een dorp". Eén komische scène met Durk en Douwe ("Wij bewaken de cloud." "Waar is hij?" "…Hè."). Geen sabotage of hacken; de speler gaat er alleen langs. |
| Wierden | Archeologische monumenten: niemand graaft erin. Harm-Jan "piept", vondsten liggen in sloot of kwelder. |
| Echte bedrijven | Geen. De haven, de terminal, de vervoerders en de winkels zijn verzonnen of naamloos ("de stoptrein", "de Streekbus"). De Menkemaborg heet echt; het feest is een verhuring aan Oldenhuis Bakt, het museum speelt geen rol. |
| Ter Apel | Komt niet voor. Ubbo's keten loopt "van Lauwersoog tot Bourtange" (het plan zei "tot Ter Apel"; aangepast). |
| De grens | Alleen de Friese wegversperring van de neven (een grap over neven, niet over Friezen) en Duitsland als iets wat je vanaf de kraan "ook ziet". |
| Zeehonden, vogels | Afstand houden; de verdwaalde zeehond is een telefoontje, geen aanraking. |

**Afwijkingen van het plan (bewust)**
- O7 heeft Lammert als melder én bondgenoot; Geesje idem (het plan noemt de kosteres en de sluiswachter als melders van deze regio's).
- Z7 "drie sluizen" wordt drie schuttingen door twee sluizen (Farmsum, Termunterzijl).
- Activiteit A26 (containerchauffeur Eemshaven → Veendam) is in F4a ingekort tot ritten binnen Hogeland en Eemsdelta; Veendam komt met F4c.
- Carbid (A21) en natuurijs (A32) vallen weg uit het plan zolang het spel altijd zomer is.
- Nieuwe stage-soorten (in §11 met `NEW`): `escort`, `ticket`, `train`, `hitch`, `unload`, `listen`, `collect` (ongeordend), `defend` (stroom en water), `lock`, `flee` (boot), `use`, `climb`, `crane`, `push`; nieuwe goal-types `trekkertrek` en `filiaal`. Nieuwe voertuigen: combine, mestinjecteur (aanhanger), quad, loodsboot, vrachtwagen met oplegger, brommer met versnellingen, motor 125 cc.

## 10. Echte plekken om te verifiëren (OSM)

Namen zoals ze in OSM zouden moeten staan; de kolom "Check" zegt wat de bouwer moet nakijken. Alles wat niet in deze lijst staat (cafés, erven, terminals, de Wolkenhal) is verzonnen en heeft geen echt adres nodig.

| Plek | OSM (verwacht) | Gebruikt in | Check |
|---|---|---|---|
| Vismarkt, Korenbeurs, Akerkhof, Gedempte Zuiderdiep, Emmasingel, Stationsweg | `highway=*`/`place=square` in Groningen | O1 | route van de takelwagen rijdbaar in de stadskaart |
| Julianaplein, oprit A7, Zuidelijke Ringweg, Europaplein | `highway=motorway_link`, `ref=A7` | O1 | oprit richting Hoogezand bij het Julianaplein |
| Noorderhaven | `name=Noorderhaven` | O2 | Oma's kamer (al in H12) |
| Station Groningen, Groningen Noord, Sauwerd, Winsum, Baflo, Warffum, Usquert, Uithuizen, Uithuizermeeden, Roodeschool, Eemshaven | `railway=station`/`halt` | O2, §5.1 | volgorde en of Eemshaven een reizigershalte is |
| Bedum, Stedum, Loppersum, Appingedam, Delfzijl West, Delfzijl | `railway=station`/`halt` | n-delfzijl, §5.1 | waar de lijnen naar Delfzijl en Roodeschool splitsen |
| Den Andel (kerk op de wierde) | `amenity=place_of_worship`, `place=village` | O2, O3, O4 | ligt de kerk op een wierde, met kerkhofmuur; weg Warffum–Den Andel |
| Warffum, Usquert, Rottum, Kantens, Zandeweer, Oldenzijl | `place=village` | O3-O6 | afstanden voor de eierrit (≤ 22 km totaal) |
| Menkemaborg (Uithuizen) | `historic=manor`/`castle`, `name=Menkemaborg` | O5 | gracht, doolhof in de tuin; of er een duiventil is (anders fictief) |
| Kermisterrein Uithuizen | – | O6, §5, §6 | waar de kermis echt staat |
| Uithuizermeeden (trekkertrek) | `place=village` | n-trekkertrek | sportveld als plek |
| Middelstum, Hippolytuskerk | `amenity=place_of_worship` | §5 uitkijkpunt | beklimbare toren (spel) |
| Leens, Verhildersum; Middelstum, Ewsum; Pieterburen, Dijksterhuis | `historic=manor` | §5 borgenroute | bestaan en namen |
| Kwelder ten noorden van Uithuizen, zeedijk Uithuizen | `natural=wetland` (`wetland=saltmarsh`), `man_made=dyke` | Z2, Z3, §5 | buitendijks bereikbaar via een dijkpad |
| Zeesluizen bij Farmsum (Eemskanaal) | `waterway=lock_gate`, `lock=yes` | O7, Z7 | ligging sluiswachtershuisje (spel), schutrichting |
| Zeehavenkanaal, Oosterhornhaven (Delfzijl) | `waterway=canal`, `landuse=port`/`industrial` | O7, O9, §5 | vaarroute sluis → Oosterhorn (± 2 km) |
| Molen Adam (Delfzijl) | `man_made=windmill`, `name=Adam` | n-delfzijl, §5 | stelling als uitkijkpunt |
| Eemshaven, vuurtoren | `man_made=lighthouse` | O8, §5 | ligging t.o.v. de terminal en de windturbines |
| Holwierde, Uitwierde, Bierum, Spijk | `place=village` | O9, §5 | welke weg langs/over de Eemsdijk loopt; buitendijkse stukken voor de golven |
| Damsterdiep, Appingedam, hangende keukens, Vrouwenbrug | `waterway=canal`, `bridge` | O9, O10 | bevaarbaarheid Delfzijl–Appingedam (anders komt Siebrand via een zijvaart); kade tegenover de keukens |
| Termunterzijl (sluis), Termunten (kerk, dijk) | `waterway=lock_gate`, `place=village` | Z7, Z8 | is de sluis van Termunterzijl schutbaar |
| Loppersum | `place=village` | Z26-Z28 | geen straatnaam gebruiken |
| N360, N46 (Eemshavenweg), N33 | `ref=*` | §5 races, bus | maxspeed |
| Bedum (scheve toren), Stedum, Zeerijp, Krewerd, Garmerwolde, Winsum, Roodeschool | diverse | §7 | herkenningspunten en kaartregels |
| Kloosterburen → Lauwersoog (weg) | `highway=*` | §6 grensgrap | plek voor de Friese wegversperring |

## 11. Data-bijlage (voor storyarc.js, missionstory.js, missions.js, banterlines.js, subtitles.js en de TTS-pijplijn)

Alles hieronder is gegenereerd uit dezelfde bron als het script hierboven: regels zijn letterlijk gelijk. Coördinaten staan open (`/* ... */`), want de provinciekaart bestaat nog niet. Nieuwe stage-soorten en goal-types zijn gemarkeerd met `NEW`.

### A. storyarc.js

```js
// storyarc.js: add to SPEAKERS
  ubbo: 'Ubbo Oldenhuis',
  geesje: 'Kosteres Geesje',
  eppo: 'Eppo Bolt',
  lammert: 'Sluiswachter Lammert',
  siebrand: 'Siebrand Mulder',
  jakob: 'Kroegbaas Jakob',
  slager: 'Slager Ruurd',
  hennie: 'Kermisbaas Hennie',
  harmjan: 'Harm-Jan',
  lubbert: 'Handelaar Lubbert',
  sikko: 'Boer Sikko',
  willemien: 'Willemien',
  jantina: 'Machinist Jantina',
  okke: 'Conducteur Okke',
  chauffeur: 'Buschauffeur Jannes',
  loods: 'Loodsdienst',
  omroeper: 'Omroeper',
  piloot: 'Vlieger Wiep',
  wybe: 'Wybe',
  wiebren: 'Wiebren',

// storyarc.js: add to CHARACTERS (name cards)
  ubbo: { name: 'Ubbo Oldenhuis', card: 'Patatbaron. Veenkoloniaal. Heeft een snackbar in elk dorp, en een vriend in elke jury.', step: 'O1', bio: 'Eigenaar van Oldenhuis Bakt, eenenveertig snackbars van Lauwersoog tot Bourtange. Nieuwe hoofdsponsor van de Noordelijke Snackprijs. Joviaal, geduldig, en hij onthoudt gezichten.', quote: 'Alles is verkopen.' },
  geesje: { name: 'Kosteres Geesje', card: 'Vierentachtig. Kosteres op een wierde. Ziet alles vanaf de toren.', step: 'O2', bio: 'Zat in 1953 naast Trijntje in de klas. Houdt al zestig jaar de kerk van Den Andel bij en is de melder van het Hogeland. Half het Hogeland is naar haar vernoemd, zegt ze.', quote: 'De Heer. Met een trekker.' },
  eppo: { name: 'Eppo Bolt', card: 'De Mestkoning. Alle machines van het Hogeland. Behalve één fiets.', step: 'O3', bio: 'Loonwerker uit Usquert. Maait, spuit, rijdt en zit in de jury. Werkt voor Ubbo, omdat Ubbo alles koopt wat hier groeit.', quote: 'Ik ben grondig.' },
  lammert: { name: 'Sluiswachter Lammert', card: 'Eenennegentig. Doet de deuren dicht. Op tijd.', step: 'O7', bio: 'Zat zestig jaar in het huisje bij de zeesluis van Delfzijl, en zit er nog. Danste in 1953 één keer met Trijntje. De melder van de Eemsdelta.', quote: 'Ik ben sluiswachter. Wachten kan ik.' },
  siebrand: { name: 'Siebrand Mulder', card: 'Havenbaas. Alles is openbaar, tot hij het koopt.', step: 'O7', bio: 'Haalt voor Ubbo binnen wat niemand mag zien: goedkoop vet, sigaretten en paling. Rijdt een grote auto en praat via de marifoon.', quote: 'Alles is openbaar. Tot ik het koop.' },
  harmjan: { name: 'Harm-Jan', card: 'De Piepjager. Zoekt Vikinggoud. Vindt kroonkurken.', step: 'Z1', bio: 'Loopt elke zaterdag met zijn metaaldetector over het Hogeland. Graaft nooit, zegt hij: hij piept.', quote: 'Ik graaf niet. Ik piep.' },
  willemien: { name: 'Willemien', card: 'Oma\'s achternicht. Woont in Loppersum. Wacht al een tijdje.', step: 'Z26', bio: 'Haar huis wordt versterkt. Ze pakt in, ze verhuist tijdelijk, en ze komt terug. Ze maakt er geen drama van. Dat laat ze aan anderen.', quote: 'Het is een huis. Het moet alleen even blijven staan.' },
  jantina: { name: 'Machinist Jantina', card: 'Veertig jaar op de lijn. Remt nooit te laat.', step: 'O2', bio: 'Rijdt de stoptreinen naar Roodeschool en Delfzijl. Laat je voorin zitten, als je niet aan de knoppen komt. Of juist wel.', quote: 'Een trein stuurt niet. Hij gaat waar het spoor gaat.' },

// storyarc.js: PARTS (a fourth part; story.js walks it after staart)
  nazomer: { title: 'Deel 4: Nazomer', name: 'De Ommelander Ronde', date: '15 september', open: true, end: 'Einde van de eerste ring',
    recap: [
      ['studio', 'Eerder in GDE. Twee Stadjers, één gouden eierbal, en een Fries die hem wilde winnen voor zijn moeder.'],
      ['Groninger Museum', 'De Gouden Eierbal staat weer in het museum. Met twee namen op het bordje.'],
      ['Vismarkt', 'Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs.'],
      ['studio', 'Het is half september. Nazomer. De terrassen staan nog buiten, en de rij ook.'],
    ],
    card: [['Anita', 'Twee voorrondes. Nog vijf.'], ['Tammo', 'Of we gaan naar huis. Dan zijn het er nul.']] },

// storyarc.js: MISSION_IDS (append only)
  'vergunning', 'lijstje', 'kerkpad', 'oogst', 'borgfeest', 'wierde-ei', 'sluis', 'container', 'storm', 'keukens',

// storyarc.js: WHY
  nazomer: 'De standplaats terug, en de Gouden Eierbal in Grunn houden. Zeven regio\'s, zeven namen op Oma\'s lijstje, en een patatbaron met een snackbar in elk dorp.',

// storyarc.js: STEPS (part 'nazomer'). ring/region are NEW fields: story.js offers both ring-1 regions after O2 (see §1).
  { id: 'O1', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 0, region: 'stad', mission: 'vergunning', why: 'Ik rij. Jij staart toch alleen maar naar je auto.',
    title: 'Vergunning verlopen', reward: 1500,
    lead: ['T', 'Tessa. Er hangt een brief op het luik. En er rijdt een takelwagen de Vismarkt op.'],
    contact: [belRikus([
      ['torenwachter', 'Rikus. Torenwachter. Er staat een takelwagen op de Vismarkt.', { tag: 'oud, droog, onverstoorbaar, aan de telefoon op de radio' }],
      ['rikus', 'Dat mag daar niet, Torenwachter.', { tag: 'droog, als nacht-dj op de radio' }],
      ['torenwachter', 'Hij hangt aan iets blauws. Ik meld alleen.', { tag: 'oud, droog, onverstoorbaar, aan de telefoon op de radio' }],
    ], 'De torenwachter, d\'Olle Grieze'), radio([
      ['rikus', 'Nachtstreek. Ik heb een beller die zegt dat hij de Snackprijs heeft gekocht.', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Gesponsord, Rikus. Ubbo Oldenhuis, Oldenhuis Bakt. Eenenveertig snackbars, van Lauwersoog tot Bourtange.', { tag: 'joviaal, zelfvoldaan, aan de telefoon op de radio', card: 'ubbo' }],
      ['rikus', 'En sinds vanochtend ook de Vismarkt.', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Vergunning verlopen. Dat is geen kwestie van willen. Dat is papier.', { tag: 'zakelijk, vriendelijk, aan de telefoon op de radio' }],
      ['ubbo', 'Nieuws voor je luisteraars. De Gouden Eierbal gaat dit jaar naar de winnaar van de Ommelander Ronde. Zeven voorrondes, in zeven regio\'s. Iedereen mag meedoen.', { tag: 'plechtig, joviaal, aan de telefoon op de radio', clue: true }],
      ['rikus', 'Ook een frietwagen zonder standplaats?', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Juist die. Dan is het eerlijk.', { tag: 'geamuseerd, aan de telefoon op de radio' }],
      ['rikus', 'Wie zit er in de jury?', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Mensen uit de streek. Mensen die ik ken.', { tag: 'joviaal, aan de telefoon op de radio' }],
      ['rikus', 'Dat is iedereen, Ubbo.', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Precies.', { tag: 'tevreden, aan de telefoon op de radio' }],
    ], 'Ubbo, Oldenhuis Bakt'), radio([
      ['jelle', 'Rikus. Jelle. Durk en Douwe rijden nu voor een Grinzer.', { tag: 'gepikeerd, charmant, aan de telefoon op de radio' }],
      ['rikus', 'Hoe voelt dat, Jelle?', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'Stil. Ze komen niet meer bij mem eten.', { tag: 'zacht, eerlijk, aan de telefoon op de radio' }],
    ], 'Jelle, Ljouwert')],
    after: [['U. Oldenhuis', 'Mooi wagentje. Ik heb er al negen. – U.O.'], ['Kiekdoar', 'Frietwagen weggesleept van de Vismarkt, teruggehaald op de A7. Nieuwe kraam op de Vismarkt: Oldenhuis Bakt. Rij: nul. De oude rij staat er nog. Zonder kraam.']],
  },
  { id: 'O2', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 0, region: 'stad', mission: 'lijstje', why: 'Laat mij maar. Mijn oma, mijn wekker.',
    title: 'Oma\'s lijstje', reward: 800,
    lead: ['A', 'Oma wil ons zien. Vroeg. Neem een treinkaartje mee, zegt ze. Naar waar, zegt ze niet.'],
    contact: [belRikus([
      ['trijntje', 'Rikus. Trijntje. Stuur die twee morgenvroeg naar mij. Met een treinkaartje.', { tag: 'stellig, oud, aan de telefoon op de radio' }],
      ['rikus', 'Waarheen, Trijntje?', { tag: 'warm, als nacht-dj op de radio' }],
      ['trijntje', 'Dat staat op het lijstje.', { tag: 'droog, liefdevol, aan de telefoon op de radio' }],
    ], 'Trijntje, 92')],
    after: [['Onbekend nummer (0596)', 'Trijntje belde. Ik zit bij de zeesluis in Delfzijl. Elke dag. – L.']],
  },
  { id: 'O3', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 1, region: 'hogeland', mission: 'kerkpad', why: 'Ik doe de trekker. Hard gaat hij toch niet.',
    title: 'Een kerk op een bult', reward: 1400,
    lead: ['A', 'Geesjes neef Jakob heeft een café in Warffum. Achter het café staat een oude trekker. Die mogen we lenen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Vanuit een busje achter het station van Warffum. Eerste beller.', { tag: 'warm, als nacht-dj op de radio' }],
      ['geesje', 'Rikus. Geesje, kosteres van Den Andel. Zondag is er dienst, en mijn kerkpad staat vol mest.', { tag: 'droog, kordaat, aan de telefoon op de radio' }],
      ['rikus', 'Vol?', { tag: 'verbaasd, als nacht-dj op de radio' }],
      ['geesje', 'Er staat een machine op die mest in de grond spuit. In mijn grond. Ik meld alleen.', { tag: 'droog, aan de telefoon op de radio' }],
    ], 'Geesje, kosteres')],
    after: [['Kiekdoar', 'Mestinjecteur verplaatst van kerkpad in Den Andel. Kosteres: "De Heer. Met een trekker." Loonwerker overweegt aangifte tegen onbekend.']],
  },
  { id: 'O4', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 1, region: 'hogeland', mission: 'oogst', why: 'Ik rij. Een combine is ook maar een auto met een maaibord ervoor.',
    title: 'Oogst met haast', reward: 1800,
    lead: ['T', 'Eppo maait Geesjes kerkland. Jakob heeft een tweede combine in de schuur. Hij is oud, zegt Jakob. De combine ook.'],
    contact: [belRikus([
      ['geesje', 'Rikus. Geesje. Eppo\'s combine maait mijn kerkland. Per ongeluk, zegt hij.', { tag: 'droog, kordaat, aan de telefoon op de radio' }],
      ['rikus', 'Hoelang al?', { tag: 'droog, als nacht-dj op de radio' }],
      ['geesje', 'Een uur. Hij is grondig. Ik meld alleen.', { tag: 'droog, aan de telefoon op de radio' }],
    ], 'Geesje, kosteres')],
    after: [['Kiekdoar', 'Twee combines in gevecht tussen de wierden bij Den Andel. Getuige: "Het leek wel een film. Een hele langzame."']],
  },
  { id: 'n-trekkertrek', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 1, optional: true, why: 'Ik trek. Op een trekker kan niemand zien dat ik zenuwachtig ben.',
    title: 'Trekkertrek in Uithuizermeeden', goal: { type: 'trekkertrek', at: 'uithuizermeeden' },
    lead: ['A', 'Trekkertrek in Uithuizermeeden. Eppo trekt mee met zijn monstertrekker. Jakob leent je zijn oude, als je wilt. Hoeft niet. Mag wel.'],
    say: ['A', 'Gas geven tot hij niet meer wil. En dan nog een beetje.'],
    done: ['A', 'Eppo trok verder, maar jij bleef langer op de baan staan. Het publiek koos jou. Dat telt hier.'],
    scene: { kicker: 'De trekkertrekbaan',
      lines: [
        ['omroeper', 'En nu een Stadjer! Op de trekker van Jakob, bouwjaar onbekend!', { tag: 'luid, enthousiast' }],
        ['eppo', 'Die trekt nog geen kruiwagen van zijn plek.', { tag: 'grinnikend, luid' }],
        ['T', 'Hij hoeft alleen jouw ego te trekken. Dat is zwaarder.', { tag: 'droog' }],
        ['omroeper', 'Hij rijdt! Hij rijdt nog! Hij rijdt nog steeds!', { tag: 'luid, onder de indruk' }],
        ['eppo', 'Dat is geen trekken. Dat is volhouden.', { tag: 'stug' }],
        ['T', 'Dat is hetzelfde, hier.', { tag: 'droog' }],
      ] } },
  { id: 'O5', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 1, region: 'hogeland', mission: 'borgfeest', why: 'Ik doe de tuin. Hagen geven nooit commentaar.',
    title: 'Borgfeest', reward: 2000,
    lead: ['A', 'Ubbo geeft een tuinfeest in de Menkemaborg. Ik ga als bediening, met een schort. Jij gaat als niemand. Door de tuin.'],
    contact: [belRikus([
      ['rikus', 'Geen beller vanavond. In Uithuizen is een tuinfeest in een borg. Ik ben niet uitgenodigd. Ik zeg niks. Ik draai iets met strijkers.', { tag: 'samenzweerderig, droog, laat op de avond, als nacht-dj op de radio' }],
    ], '')],
    after: [['Kiekdoar', 'Tuinfeest in de Menkemaborg: vuurwerk boven de gracht, één gast in de gracht. Gastheer: "Niemand die nat werd, was uitgenodigd."']],
  },
  { id: 'O6', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 1, region: 'hogeland', mission: 'wierde-ei', why: 'Ik haal de eieren. Remmen voor eieren, daar ben ik bekend om.',
    title: 'Eén ei per wierde', reward: 2500,
    lead: ['A', 'Voorronde één. Uithuizen. Eieren uit vijf wierdedorpen, vers, voor vier uur. Geesje heeft de adressen. Jij rijdt, ik zet de kraam op.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Ik sta op de kermis in Uithuizen, naast een zweefmolen. De zweefmolen wint.', { tag: 'warm, als nacht-dj op de radio, kermislawaai' }],
      ['rikus', 'Reglement, voorronde één: de eierbal is van streekeieren. Vers. Uit vijf wierdedorpen. Wie bedenkt zoiets?', { tag: 'droog, leest voor, als nacht-dj op de radio' }],
      ['ubbo', 'Ik, Rikus. Streekproducten. Daar houden mensen van.', { tag: 'joviaal, zelfvoldaan, aan de telefoon op de radio' }],
    ], 'Ubbo, Oldenhuis Bakt')],
    after: [['U. Oldenhuis', 'Gefeliciteerd. Eén. – U.O.'], ['Kiekdoar', 'Fjord Frituur wint voorronde Hogeland op de kermis in Uithuizen. Jurylid en loonwerker: "Ow." Stroomstoring op de kermis: drie keer, op één kraam.']],
  },
  { id: 'n-warffum', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 1, why: 'Ik regel het filiaal. Jij mag het bed testen.',
    title: 'Een filiaal in Warffum', goal: { type: 'filiaal', at: 'warffum' },
    lead: ['T', 'Jakob zegt: de kamer boven het café is van ons, zolang we willen. En hij heeft een luik in zijn pui.'],
    say: ['T', 'Een luik in een pui. Dat is hoe het bij ons ook begon.'],
    done: ['T', 'Filiaal één: Warffum. Op vrijdag, na de bingo. Het bed kraakt.'],
    scene: { kicker: 'Café van Jakob, Warffum',
      lines: [
        ['jakob', 'De kamer boven is van jullie. Het bed kraakt. Het is een oud bed.', { tag: 'gemoedelijk' }],
        ['A', 'En het luik in de pui? Een Fjord Frituur in Warffum.', { tag: 'enthousiast' }],
        ['jakob', 'Op vrijdag. Na de bingo.', { tag: 'droog' }],
        ['A', 'Eén in Stad, één in Warffum. Dat is het begin.', { tag: 'enthousiast, snel' }],
        ['T', 'Van wat?', { tag: 'droog' }],
        ['A', 'Van zeven.', { tag: 'stellig' }],
        ['T', 'Of van twee. Twee is ook een mooi getal.', { tag: 'droog, zacht' }],
        ['jakob', 'Geesje zegt: de Hogelander eierbal met kerkland-paneermeel. Ze heeft het recept al opgeschreven. Op de achterkant van een liedblad.', { tag: 'gemoedelijk' }],
      ] } },
  { id: 'n-delfzijl', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 1, why: 'Ik koop de kaartjes. Jij vergeet altijd retour.',
    title: 'Met de trein naar Delfzijl', goal: { type: 'train', to: 'Delfzijl', line: 'delfzijl', cab: 'jantina' },
    lead: ['T', 'Lammert stuurde een sms. "Ik zit bij de zeesluis. Elke dag." De trein naar Delfzijl gaat elk halfuur.'],
    say: ['T', 'Delfzijl. Daar zijn we als kind een keer geweest.'],
    done: ['T', 'Lammert zit in het huisje bij de zeesluis. Hij zwaaide al. Hij zag ons van ver.'],
    contact: [radio([
      ['rikus', 'Nachtstreek, op tournee. Vanavond vanuit de Eemsdelta.', { tag: 'warm, als nacht-dj op de radio' }],
      ['rikus', 'Wie hier met de trein doorheen rijdt, ziet balken tegen gevels en huizen in de steigers. Daar wonen mensen die al jaren wachten op een gewoon huis.', { tag: 'ernstig, rustig, als nacht-dj op de radio' }],
      ['rikus', 'Daar maak ik geen grap over. Ik zeg alleen dat ze er wonen. En dat ze ook luisteren. Goedenavond, Eemsdelta.', { tag: 'ernstig, zacht, als nacht-dj op de radio' }],
    ], '')],
    scene: { kicker: 'Delfzijl, op de dijk',
      lines: [
        ['A', 'Delfzijl. Weet je nog? Jij zei dat de zee achter de dijk lag.', { tag: 'warm, nostalgisch' }],
        ['T', 'Hij ligt er ook.', { tag: 'droog' }],
        ['A', '…Hij ligt er echt.', { tag: 'zacht, verrast, bovenaan de dijk' }],
        ['T', 'Een beetje.', { tag: 'droog, met een glimlach' }],
      ] } },
  { id: 'O7', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 1, region: 'eemsdelta', mission: 'sluis', why: 'Ik vaar. Jij kijkt door de verrekijker en zegt wat je ziet.',
    title: 'Lammert schuift', reward: 2000,
    lead: ['T', 'Lammert zit in het sluiswachtershuisje. Hij heeft een bootje, en een verrekijker. Hij wil ons iets laten zien.'],
    contact: [belRikus([
      ['lammert', 'Rikus. Lammert, zeesluis Delfzijl. Er ligt een kustvaarder in de haven die \'s nachts lost. Zonder lampen. Ik meld alleen.', { tag: 'oud, traag, aan de telefoon op de radio' }],
      ['rikus', 'Lammert, ben jij familie van de torenwachter?', { tag: 'verbaasd, als nacht-dj op de radio' }],
      ['lammert', 'Iedereen die hoog zit of bij het water, is familie. Ik meld alleen.', { tag: 'oud, droog, aan de telefoon op de radio' }],
    ], 'Lammert, zeesluis')],
    after: [['S. Mulder', 'Mooie foto\'s. Ik heb er ook een paar. Van jullie. – S.M.'], ['Kiekdoar', 'Zeesluis Delfzijl sluit om onduidelijke reden vervroegd. Sluiswachter: "Op tijd. Niet vervroegd."']],
  },
  { id: 'O8', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 1, region: 'eemsdelta', mission: 'container', why: 'Ik ga wel. In het donker ben ik niet te zien. Op een pet na.',
    title: 'Vet in de container', reward: 2200,
    lead: ['A', 'Lammert heeft drie containernummers uit zijn logboek. Siebrand zet het vet door naar Eemshaven. We zien elkaar bij de vuurtoren.'],
    contact: [belRikus([
      ['henk', 'Rikus. Henk, Garage Knalpot. Die twee van de frietwagen. Er zit nog een zender in hun bak. Van mij.', { tag: 'gemoedelijk, aan de telefoon op de radio' }],
      ['rikus', 'Wat moeten ze ermee, Henk?', { tag: 'droog, als nacht-dj op de radio' }],
      ['henk', 'Ik vraag niet waarom. Schroefje los, onder het dashboard.', { tag: 'gemoedelijk, wetend, aan de telefoon op de radio' }],
    ], 'Henk, Garage Knalpot')],
    after: [['Kiekdoar', 'Containerkraan in Eemshaven \'s nachts in beweging. Terminal: "Niemand bediende hem. Hij heeft wel drie containers verzet. Netjes."']],
  },
  { id: 'O9', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 1, region: 'eemsdelta', mission: 'storm', why: 'Ik rij. Jij kijkt naar de stip.',
    title: 'Storm op de Eems', reward: 2400,
    lead: ['T', 'Henks zender rijdt over de dijkweg naar Delfzijl. Siebrand haalt zijn container weg, nu het stormt en niemand kijkt. Ik zie hem bij Bierum.'],
    contact: [belRikus([
      ['rikus', 'Code oranje voor de kust. Windkracht negen. De torenwachter belde: zijn toren beweegt. Hij meldt alleen.', { tag: 'ernstig, droog, als nacht-dj op de radio' }],
      ['lammert', 'Rikus. Lammert. Ik doe de sluis dicht vannacht. Wie nu op de dijk rijdt, is gek of heeft haast.', { tag: 'oud, kalm, aan de telefoon op de radio' }],
      ['rikus', 'En als het allebei is?', { tag: 'droog, als nacht-dj op de radio' }],
      ['lammert', 'Dan ken ik ze.', { tag: 'oud, droog, aan de telefoon op de radio' }],
    ], 'Lammert, zeesluis')],
    after: [['U. Oldenhuis', 'Vet is maar vet. Ik heb meer. – U.O.'], ['Kiekdoar', 'Windkracht negen op de Eemsdijk. Politie vindt container vol frituurvet. Eigenaar onbekend. Op elk vat: OB.']],
  },
  { id: 'O10', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 1, region: 'eemsdelta', mission: 'keukens', why: 'Ik pak de boot. Jij bakt. Jij bakt beter als ik niet kijk.',
    title: 'Hangende keukens', reward: 3000,
    lead: ['T', 'Voorronde twee. Appingedam, bij de hangende keukens. Siebrand zit in de jury. Zijn boot ligt in het Damsterdiep.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Ik sta op een brug in Appingedam. Onder mij hangen keukens boven het water. Al eeuwen. Niemand weet waarom ze niet vallen. Ik ook niet.', { tag: 'warm, als nacht-dj op de radio' }],
      ['ubbo', 'Rikus. Vandaag de voorronde Eemsdelta. Voorzitter van de jury is Siebrand Mulder. Havenbaas. Een man van de streek.', { tag: 'joviaal, zakelijk, aan de telefoon op de radio' }],
      ['rikus', 'Werd die niet gezocht, Ubbo?', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Eigenaar onbekend, stond er. Zo onbekend is hij niet.', { tag: 'geamuseerd, aan de telefoon op de radio' }],
    ], 'Ubbo, Oldenhuis Bakt')],
    after: [['U. Oldenhuis', 'Twee. Ik heb er nog negenendertig. – U.O.'], ['Kiekdoar', 'Havenbaas uit Delfzijl tijdens voorronde in Appingedam meegenomen door de waterpolitie. Hangende keukens ongedeerd. Voorronde naar Stadse frietwagen.']],
  },
  { id: 'n-woonschip', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 1, why: 'Ik ga wel kijken. Ik ben de enige die niet zeeziek wordt van een woonschip.',
    title: 'Een woonschip in Delfzijl', goal: { type: 'filiaal', at: 'delfzijl' },
    lead: ['A', 'Lammert heeft een sleutel voor ons. Van een woonschip in de haven. En hij wil een luik in zijn huisje.'],
    say: ['A', 'Een woonschip. Dan heb jij eindelijk een huis dat ook weg kan rijden.'],
    done: ['A', 'Filiaal twee: de zeesluis. Lammert bakt alleen als er geen schip komt. Er komt bijna nooit een schip.'],
    scene: { kicker: 'Het woonschip, Delfzijl',
      lines: [
        ['lammert', 'Van mijn broer. Hij woont nu op het land. Hij werd zeeziek.', { tag: 'oud, droog' }],
        ['T', 'Op een woonschip?', { tag: 'droog' }],
        ['lammert', 'Het duurde veertig jaar. Toen was het genoeg.', { tag: 'oud, droog' }],
        ['lammert', 'Mijn kleinzoon vaart rondjes bij Zuidhorn. Ook een Lammert. Wij doen niet aan nieuwe namen.', { tag: 'oud, warm, bij het weggaan' }],
        ['A', 'Twee filialen. Warffum en Delfzijl.', { tag: 'zacht, op het dek' }],
        ['T', 'En de Vismarkt.', { tag: 'droog' }],
        ['A', 'Die zijn we kwijt.', { tag: 'zacht' }],
        ['T', 'Die halen we terug. Daar doen we dit voor.', { tag: 'vastberaden, zacht' }],
        ['A', 'Ik doe het voor zeven.', { tag: 'eerlijk, zacht' }],
        ['T', '…Ik weet het.', { tag: 'zacht' }],
        ['A', 'Is het erg? Dat ik meer wil?', { tag: 'zacht, aarzelend' }],
        ['T', 'Nee. Ik wil alleen niet minder.', { tag: 'droog, warm' }],
      ] } },

// storyarc.js: CLUES
  { step: 'O1', kind: 'clue', title: 'Oldenhuis Bakt', text: 'Eenenveertig snackbars, van Lauwersoog tot Bourtange. De eigenaar, Ubbo Oldenhuis, sponsort nu de Snackprijs. Durk en Douwe sleepten onze frietwagen weg "naar een loods in Hoogezand, vol frietwagens".' },
  { step: 'O1', kind: 'clue', title: 'De Ommelander Ronde', text: 'Nieuw reglement: de Gouden Eierbal gaat naar de winnaar van zeven voorrondes in zeven regio\'s. De jury: "mensen die ik ken". Dat is iedereen.' },
  { step: 'O2', kind: 'hart', title: 'Oma\'s lijstje', text: 'Zeven mensen die Oma nog wat schuldig zijn, van 1953. Geesje (Den Andel) en Lammert (Delfzijl), en vijf namen met alleen een dorp. "Schuld erft." De rest komt later.' },
  { step: 'O2', kind: 'clue', title: 'De Mestkoning', text: 'Geesje: Eppo Bolt heeft alle machines van het Hogeland. Zijn mestinjecteur staat al drie dagen op haar kerkpad.' },
  { step: 'O3', kind: 'clue', title: 'Eppo werkt voor Ubbo', text: 'Eppo Bolt, loonwerker uit Usquert: "Ubbo heeft mensen. Ik ben er één." Hij zit zaterdag in de jury van de voorronde in Uithuizen.' },
  { step: 'O3', kind: 'hart', title: 'Geesjes tas', text: 'In 1953 brak Geesje haar arm. Trijntje droeg een jaar lang haar tas, ook toen de arm allang genezen was. "Dat doe je dan."' },
  { step: 'O4', kind: 'clue', title: 'Ubbo koopt het Hogeland', text: 'Eppo: Ubbo koopt alles wat hier groeit. Graan, aardappels, mest. Wat niet te koop is, maait Eppo per ongeluk. En zaterdag "regelt hij de stroom" op de kermis.' },
  { step: 'O4', kind: 'clue', title: 'Het tuinfeest', text: 'Geesje: Ubbo geeft vrijdag een tuinfeest in de Menkemaborg in Uithuizen. Daar zoekt hij zijn jury. Er is bediening nodig.' },
  { step: 'O5', kind: 'clue', title: 'Drie enveloppen', text: 'Op de foto\'s van de duif: Ubbo geeft drie enveloppen aan de jury van Uithuizen. Eppo Bolt, slager Ruurd en kermisbaas Hennie. Hennie wilde eerlijk zijn. "Eerlijk voor mij," zei Ubbo.' },
  { step: 'O5', kind: 'hart', title: 'Ik onthoud gezichten', text: 'Ubbo tegen Tessa, op het terras: "Jij kunt verkopen. Alles is verkopen, meisje." Tessa zei niks terug. Tammo vond dat het ergste wat ze kan doen.' },
  { step: 'O6', kind: 'clue', title: 'Voorronde Hogeland', text: 'Gewonnen in Uithuizen. De jury durfde niet anders: Tessa\'s telefoon lag op tafel, met de foto van de enveloppen. Ubbo applaudisseerde. "Eén van zeven."' },
  { step: 'O7', kind: 'clue', title: 'De kustvaarder', text: 'In de Oosterhornhaven lost een kustvaarder van Siebrand Mulder \'s nachts, zonder lampen: vaten frituurvet met OB erop, kratten sigaretten, en levende paling. "Siebrand haalt het binnen. Oldenhuis bakt het."' },
  { step: 'O7', kind: 'hart', title: 'Lammert schoof', text: 'In 1953 danste Lammert één keer met Trijntje. Ze zei: "Dan dans je maar met iemand anders." Hij heeft het nooit gedaan. "Wachten kan ik."' },
  { step: 'O8', kind: 'clue', title: 'De zender van Henk', text: 'Henk zette in de Kop een zender in de Escapade. Die zit nu onder een rode container met vaten OB in Eemshaven. Durk en Douwe bewaken \'s nachts de Wolkenhal en hebben niks gezien.' },
  { step: 'O9', kind: 'clue', title: 'OB op elk vat', text: 'De politie heeft de container: vaten frituurvet met OB erop. "Eigenaar onbekend." Siebrand vluchtte in een rib het Damsterdiep op. Morgen zit hij in de jury van de voorronde in Appingedam. Als voorzitter.' },
  { step: 'O10', kind: 'clue', title: 'Siebrand opgepakt', text: 'De waterpolitie nam Siebrand Mulder mee, midden in de voorronde, voor "vaten met OB erop". "Ubbo heeft er nog veertig," zei hij.' },
  { step: 'O10', kind: 'clue', title: 'Voorronde Eemsdelta', text: 'Gewonnen in Appingedam. Lammert jureerde als oudste op de brug: "Braid noar de zin." De rest bewaart hij voor de finale.' },
  { step: 'Z4', kind: 'clue', title: 'Ommelander Ronde, 1953', text: 'Er was al eens een Ommelander Ronde. In 1953 werd Oma tweede, in de vesting Bourtange. "De jury was van een Oldenhuis. Zijn opa." Ze gooide haar medaille in de klei. Nu hangt hij aan het spiegeltje van de Fjord. (Aanwijzing voor de finale.)' },
  { step: 'Z26', kind: 'hart', title: 'Twee meisjes op een fiets', text: 'Een foto uit 1953: Trijntje en haar zus op de fiets voor het station van Loppersum, op weg naar Stad, voor de prijs. Tegen de wind in.' },
```

### B. missionstory.js

```js
// missionstory.js: NPC looks (storycast.js gets the real looks; these are placeholders in the existing shape)
  ubbo: { name: 'Ubbo Oldenhuis', shirt: 0xe2b93b, skin: SKIN.woodLight, variant: 'male', seed: 4101, look: { top: 'jacket', build: 'heavy' } },
  geesje: { name: 'Kosteres Geesje', shirt: 0x2f3a4a, skin: SKIN.woodLight, variant: 'female', seed: 4102, hairStyle: 'bun', look: { age: 'old' } },
  eppo: { name: 'Eppo Bolt', shirt: 0x8a3b2e, skin: SKIN.woodMid, variant: 'male', seed: 4103, look: { build: 'heavy', top: 'overall' } },
  lammert: { name: 'Sluiswachter Lammert', shirt: 0x1f2f4a, skin: SKIN.woodLight, variant: 'male', seed: 4104, look: { age: 'old', hat: 'cap' } },
  siebrand: { name: 'Siebrand Mulder', shirt: 0x3a3a42, skin: SKIN.woodLight, variant: 'male', seed: 4105, look: { top: 'jacket' } },
  jakob: { name: 'Kroegbaas Jakob', shirt: 0xe8e3d6, skin: SKIN.woodLight, variant: 'male', seed: 4106 },
  harmjan: { name: 'Harm-Jan', shirt: 0x3f8f73, skin: SKIN.woodMid, variant: 'male', seed: 4107, look: { hat: 'cap' } },
  willemien: { name: 'Willemien', shirt: 0xc06a5a, skin: SKIN.woodLight, variant: 'female', seed: 4108 },
  jantina: { name: 'Machinist Jantina', shirt: 0x24476b, skin: SKIN.woodLight, variant: 'female', seed: 4109, hairStyle: 'bob' },

// missionstory.js: STORY entries, appended in MISSION_IDS order. N = the entry's npc. tag is extra (TTS delivery), missionstory ignores it.
  {
    // O1 Vergunning verlopen
    npc: 'durk', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Moi. Wij komen voor de auto.', { tag: 'traag, plechtig, uit het raampje', card: 'durk', cam: 'track' }],
      ['douwe', '…auto.', { tag: 'traag, behulpzaam' }],
      ['A', 'Durk? Douwe? Jullie zijn van Jelle.', { tag: 'verbaasd, scherp' }],
      ['N', 'Waren. Nu van een Grunneger. Hij betaalt per brein.', { tag: 'traag, eerlijk' }],
      ['douwe', 'Wij krijgen dus de helft.', { tag: 'traag, trots' }],
      ['T', 'Dat is nog best veel.', { tag: 'droog' }],
      ['N', 'Hier. Een brief. Standplaats vergeven.', { tag: 'traag, plechtig', cam: 'close' }],
      ['A', '"De standplaats Vismarkt gaat per vandaag naar Oldenhuis Bakt." Wie is Oldenhuis Bakt?', { tag: 'leest voor, ongelovig' }],
      ['rikus', 'Ik stond eerst.', { tag: 'verontwaardigd, met een leeg bakje', cam: 'two' }],
      ['N', 'Baas zegt.', { tag: 'traag, berustend' }],
      ['douwe', '…zegt.', { tag: 'traag' }],
      ['T', 'Ze nemen mijn auto mee.', { tag: 'zacht, ongelovig' }],
      ['A', 'Onze frietwagen.', { tag: 'fel' }],
      ['T', 'Met mijn auto eronder.', { tag: 'droog, gekwetst' }],
      ['rikus', 'Neem de mijne.', { tag: 'droog, gooit sleutels' }],
      ['A', 'Rood?', { tag: 'vangt de sleutels, kijkt' }],
      ['rikus', 'Iedereen heeft een rode auto. Rijden.', { tag: 'droog, berustend' }],
    ],
    outroNpc: true,
    outro: [
      ['rikus', 'Ik heb jullie plek bewaakt.', { tag: 'droog, trouw' }],
      ['A', 'Er staat een kraam op.', { tag: 'ongelovig' }],
      ['rikus', 'Ik heb jullie plek bewaakt. Niet de kraam.', { tag: 'droog' }],
      ['rikus', 'Ik heb er één geproefd. Voor het onderzoek.', { tag: 'droog, schuldig', cam: 'close' }],
      ['A', 'En?', { tag: 'scherp' }],
      ['rikus', '…Ow.', { tag: 'deadpan' }],
      ['T', 'Trede één. Op de Vismarkt.', { tag: 'droog, bijna gekwetst' }],
      ['rikus', 'Vannacht belt die baas van ze in. Ik moet hem live laten, zegt de zender.', { tag: 'droog, zachter' }],
      ['A', 'Wie is hij?', { tag: 'strijdlustig' }],
      ['rikus', 'Een man met eenenveertig snackbars. En geen één goeie.', { tag: 'droog' }],
    ],
    replay: [
      ['rikus', 'Weer die takelwagen? Ik ga voortaan in de rij staan met een sleepkabel.', { tag: 'droog, met een knipoog' }],
    ],
    fail: [
      ['A', 'Weg. Met de frituur erin.'],
      ['T', 'En de servetten.'],
    ],
  },
  {
    // O2 Oma's lijstje
    npc: 'trijntje', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Jullie hebben geen plek meer. Dat hoorde ik op de radio.', { tag: 'stellig, oud', cam: 'close' }],
      ['A', 'Nog niet. We krijgen hem terug.', { tag: 'vastberaden' }],
      ['N', 'Met eenenveertig snackbars tegen je? Dan heb je vrienden nodig. Ik heb er nog zeven.', { tag: 'droog' }],
      ['T', 'Jij hebt nooit vrienden, oma.', { tag: 'droog, verbaasd' }],
      ['N', 'Ik heb mensen die mij nog wat schuldig zijn. Van 1953. Dat is beter.', { tag: 'stellig', clue: true }],
      ['A', 'Geesje, Den Andel. Lammert, Delfzijl. En vijf namen met alleen een dorp erbij.', { tag: 'leest het lijstje' }],
      ['N', 'Die vijf leven niet allemaal meer. Dan vraag je het de kleinkinderen. Schuld erft.', { tag: 'droog' }],
      ['T', 'Dat is geen Gronings recht, oma.', { tag: 'droog' }],
      ['N', 'Het is Gronings fatsoen. Dat is strenger.', { tag: 'stellig' }],
      ['N', 'Geesje zat naast me in de klas. Lammert danste met me. Op het feest, na de prijs. Hij schoof.', { tag: 'warm, met een glimlach' }],
      ['T', 'Schoof?', { tag: 'verward' }],
      ['N', 'Dansen, jong. Langzaam. Met je voeten op de grond.', { tag: 'warm, dromerig' }],
      ['A', 'Wat zijn ze je schuldig?', { tag: 'zacht, nieuwsgierig' }],
      ['N', 'Ieder een gunst. Ik heb ze zeventig jaar bewaard. Ik ben Gronings, ik spaar.', { tag: 'droog, stellig' }],
      ['N', 'De eerste trein naar Warffum gaat om tien over zes.', { tag: 'droog' }],
      ['T', 'Het is kwart over vijf.', { tag: 'slaperig, droog' }],
      ['N', 'Dan ben je op tijd. Voor één keer.', { tag: 'droog, liefdevol' }],
    ],
    outroNpc: true,
    outro: [
      ['geesje', 'Moi. Jullie zijn van Trijntje.', { tag: 'droog, kordaat', card: 'geesje' }],
      ['T', 'Hoe weet u dat?', { tag: 'verbaasd' }],
      ['geesje', 'Jullie stappen om kwart voor zeven uit in Warffum. Dat doet niemand.', { tag: 'droog' }],
      ['A', 'U bent Geesje.', { tag: 'vriendelijk' }],
      ['geesje', 'Kosteres. Den Andel. Ik zie alles vanaf mijn toren. Ik meld alleen.', { tag: 'droog, kordaat' }],
      ['T', 'Zo praat de torenwachter ook.', { tag: 'zacht, tegen Tessa' }],
      ['geesje', 'Dat is mijn neef. Hij is ouder dan ik, maar hij zit hoger.', { tag: 'droog' }],
      ['geesje', 'Trijntje krijgt haar gunst. Maar eerst mijn kerk. Er staat al drie dagen een mestinjecteur op mijn kerkpad.', { tag: 'stellig', clue: true }],
      ['A', 'Van wie?', { tag: 'strijdlustig' }],
      ['geesje', 'Van Eppo Bolt. Die heeft alle machines van het Hogeland. Behalve mijn fiets.', { tag: 'droog, scherp' }],
    ],
    replay: [
      ['N', 'Weer die vroege trein? Neem een boterham mee, jong. Het Hogeland is groot.', { tag: 'droog, liefdevol' }],
    ],
  },
  {
    // O3 Een kerk op een bult
    npc: 'geesje', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Achthonderd jaar ligt dat pad er. Nooit heeft er mest op gestaan.', { tag: 'droog, kordaat' }],
      ['T', 'Hij staat er wel scheef op.', { tag: 'droog' }],
      ['N', 'Dat is het enige wat ik hem gun.', { tag: 'droog', cam: 'close' }],
      ['A', 'Waar moet hij heen?', { tag: 'zakelijk' }],
      ['N', 'Naast de pastorie. Netjes. Ik wil niet dat Eppo zegt dat we slordig zijn.', { tag: 'stellig' }],
      ['T', 'En die muur?', { tag: 'droog, kijkt naar de muur' }],
      ['N', 'Die muur blijft heel. Er liggen mensen achter die niet tegen lawaai kunnen.', { tag: 'droog, streng' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Zondag is er dienst. Er komen er vier. Met jullie zes.', { tag: 'droog' }],
      ['T', 'Wij komen niet.', { tag: 'droog' }],
      ['N', 'Vier dan. Dat is ook goed.', { tag: 'droog, onverstoorbaar' }],
      ['A', 'Geesje. Wat ben je oma schuldig?', { tag: 'zacht, nieuwsgierig' }],
      ['N', 'In 1953 had ik mijn arm gebroken. Trijntje droeg mijn tas. Van school naar huis. Een jaar lang.', { tag: 'warm, nuchter' }],
      ['T', 'Een jaar?', { tag: 'verbaasd' }],
      ['N', 'Na zes weken was hij genezen. Ze bleef dragen. Dat doe je dan.', { tag: 'warm, droog' }],
      ['A', 'En nu?', { tag: 'zacht' }],
      ['N', 'Nu draag ik wat terug. Ik weet alleen nog niet wat. Dat weet je dan.', { tag: 'droog' }],
    ],
    replay: [
      ['N', 'Weer een injecteur op mijn pad. Ik begin te denken dat hij me mist.', { tag: 'droog' }],
    ],
    fail: [
      ['T', 'Die muur stond er achthonderd jaar.'],
      ['A', 'En jij was er tien minuten.'],
    ],
  },
  {
    // O4 Oogst met haast
    npc: 'eppo', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Geesje! Per ongeluk! Ik dacht dat het van Ubbo was!', { tag: 'luid, joviaal, door het open raam' }],
      ['geesje', 'Het staat op de kaart. Kerkland. Sinds zestienhonderd.', { tag: 'droog, kordaat' }],
      ['N', 'Kaarten zijn oud. Ik ben nieuw.', { tag: 'grinnikend', cam: 'close' }],
      ['A', 'Dat graan blijft hier.', { tag: 'strijdlustig, uit Jakobs combine' }],
      ['N', 'Kom het maar halen, meisje. Met dat oude ding.', { tag: 'luid, grinnikend' }],
      ['T', 'Hij zei meisje.', { tag: 'droog' }],
      ['A', 'Ik hoorde het.', { tag: 'kil' }],
    ],
    outroNpc: true,
    outro: [
      ['geesje', 'Het graan is terug. Gemaaid, maar terug.', { tag: 'droog, tevreden' }],
      ['A', 'Wat doe je er nu mee?', { tag: 'nieuwsgierig' }],
      ['geesje', 'Verkopen. Aan iemand die geen Ubbo heet.', { tag: 'droog' }],
      ['T', 'Aan ons?', { tag: 'droog, hoopvol' }],
      ['geesje', 'Jullie bakken. Wat moet je anders met paneermeel?', { tag: 'droog, kordaat', clue: true }],
      ['A', 'Een Hogelander eierbal. Van kerkland.', { tag: 'blij verrast' }],
      ['geesje', 'Ik zeg er niks van. Ik meld alleen.', { tag: 'droog' }],
      ['geesje', 'Vrijdag is er een tuinfeest in de Menkemaborg. Ubbo zoekt daar zijn jury. Ze hebben nog bediening nodig.', { tag: 'droog, zakelijk' }],
    ],
    replay: [
      ['geesje', 'Hij maait weer. Ik vroeg of hij een bril nodig had. Hij zei: per ongeluk.', { tag: 'droog' }],
    ],
    fail: [
      ['A', 'Hij is binnen. Met het graan.'],
      ['T', 'Per ongeluk.'],
    ],
  },
  {
    // O5 Borgfeest
    npc: 'ubbo', outroPose: 'hips', ask: 0,
    intro: [
      ['A', 'Ik ben binnen. Schort, dienblad, glimlach. Niemand vraagt wat.', { tag: 'fluisterend, via de telefoon' }],
      ['T', 'Ik zit in een haag.', { tag: 'fluisterend, droog' }],
      ['A', 'Dat staat je.', { tag: 'fluisterend, plagend' }],
      ['T', 'Er loopt iemand met een zaklamp.', { tag: 'fluisterend' }],
      ['A', 'Dan sta je stil. Een haag beweegt niet.', { tag: 'fluisterend, bazig' }],
    ],
    outroNpc: true,
    outro: [
      ['A', 'Je bent nat.', { tag: 'droog' }],
      ['T', 'Er zat een gracht om.', { tag: 'droog' }],
      ['A', 'Daar is hij voor.', { tag: 'droog' }],
      ['T', 'Drie juryleden. Drie enveloppen. En de duif heeft het allemaal.', { tag: 'droog, tevreden' }],
      ['A', 'Zet maar op mijn telefoon.', { tag: 'zakelijk' }],
      ['T', 'Hij zei "meisje" tegen je.', { tag: 'zacht' }],
      ['A', 'Ik zei niks terug.', { tag: 'koel' }],
      ['T', 'Dat is het ergste wat jij kunt doen.', { tag: 'droog, trots' }],
      ['A', '…Ja.', { tag: 'zacht, met een glimlach' }],
    ],
    replay: [
      ['N', 'Weer bediening tekort? Ik huur jou wel in, meisje.', { tag: 'geamuseerd, joviaal' }],
    ],
    fail: [
      ['A', 'Ze zetten je eruit. Met je pet.'],
      ['T', 'De pet blijft.'],
    ],
  },
  {
    // O6 Eén ei per wierde
    npc: 'ubbo', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Buren. Gezellig.', { tag: 'joviaal' }],
      ['A', 'Jouw kraam is groter.', { tag: 'koel' }],
      ['N', 'Al mijn kramen zijn groter. Dat is het idee.', { tag: 'zelfvoldaan' }],
      ['T', 'Wij hebben eieren nodig.', { tag: 'droog, met eierdozen' }],
      ['N', 'Ik heb ze al. Uit een legbatterij bij Veendam. Dat is ook streek.', { tag: 'geamuseerd' }],
      ['A', 'Dat is geen wierde.', { tag: 'scherp' }],
      ['N', 'Het staat niet in het reglement wat een wierde is. Ik heb het reglement geschreven.', { tag: 'vriendelijk dreigend' }],
      ['N', 'Succes. Je hebt tot vier uur.', { tag: 'joviaal' }],
    ],
    outroNpc: true,
    outro: [
      ['A', 'Ik leg mijn telefoon hier even neer. Niet op letten.', { tag: 'koel, zacht' }],
      ['slager', '…Goud.', { tag: 'nors, kauwend' }],
      ['hennie', 'Valt mie nait of.', { tag: 'nerveus, plechtig, kijkt naar de telefoon' }],
      ['eppo', '…Ow.', { tag: 'stug, met tegenzin' }],
      ['A', 'Trede één. Dat telt ook.', { tag: 'droog' }],
      ['hennie', 'De voorronde Hogeland gaat naar… de Fjord Frituur!', { tag: 'luid, plechtig' }],
      ['N', 'Eén van zeven. Ik heb er eenenveertig.', { tag: 'applaudisseert langzaam, joviaal' }],
      ['T', 'Wij hebben er één. Die is warm.', { tag: 'droog' }],
      ['geesje', 'Ik meld alleen. Maar dit meld ik graag.', { tag: 'droog, warm, uit het publiek' }],
    ],
    replay: [
      ['N', 'Weer eieren rapen? Ik koop ze gewoon. Scheelt rijden.', { tag: 'geamuseerd' }],
    ],
    fail: [
      ['T', 'Roerei.'],
      ['A', 'Voor de jury. Ze kijken.'],
    ],
  },
  {
    // O7 Lammert schuift
    npc: 'lammert', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Jij bent van Trijntje. Je loopt net als zij. Snel, en de verkeerde kant op.', { tag: 'oud, traag, onverstoorbaar', card: 'lammert' }],
      ['T', 'Dat is Tessa. Die loopt zo.', { tag: 'droog' }],
      ['N', 'Dan lopen jullie allebei zo.', { tag: 'oud, droog' }],
      ['A', 'U danste met haar.', { tag: 'nieuwsgierig' }],
      ['N', 'Ik schoof. In 1953. Eén keer. Ze trapte op mijn voet en zei sorry. Daarna heeft ze nooit meer sorry gezegd.', { tag: 'warm, droog', cam: 'close' }],
      ['T', 'Dat klopt. Dat doet ze niet.', { tag: 'droog' }],
      ['N', 'Daar. Aan de Oosterhornhaven. De kustvaarder. Hij lost \'s nachts, zonder lampen. Van Siebrand Mulder. Havenbaas, zegt hij.', { tag: 'zakelijk, traag' }],
      ['A', 'Wat lossen ze?', { tag: 'scherp' }],
      ['N', 'Dat zie ik niet. Daar heb ik jullie voor.', { tag: 'droog' }],
      ['N', 'Neem mijn bootje. Gaat het mis, kom dan terug door mijn sluis. Ik doe hem voor jullie open. En daarna dicht.', { tag: 'oud, kalm' }],
    ],
    outroNpc: true,
    outro: [
      ['T', 'U deed de deuren dicht. Voor zijn neus.', { tag: 'droog, onder de indruk' }],
      ['N', 'Ik deed ze op tijd dicht. Dat is mijn werk. Zijn neus is zijn werk.', { tag: 'droog, tevreden' }],
      ['A', 'Lammert. Wat bent u oma schuldig?', { tag: 'zacht' }],
      ['N', 'Een dans. Ze zei: dan dans je maar met iemand anders. Dat heb ik nooit gedaan.', { tag: 'zacht, ontroerd' }],
      ['T', 'Zeventig jaar.', { tag: 'zacht' }],
      ['N', 'Ik ben sluiswachter. Wachten kan ik.', { tag: 'warm, droog' }],
      ['A', 'Vet met OB erop. Sigaretten. En paling, levend.', { tag: 'zakelijk, zacht' }],
      ['N', 'Siebrand haalt het binnen. Oldenhuis bakt het. Ik meld alleen.', { tag: 'oud, droog', clue: true }],
    ],
    replay: [
      ['N', 'Weer de haven in? Ik zet de deuren alvast op een kier.', { tag: 'oud, droog' }],
    ],
    fail: [
      ['A', 'Hij heeft onze boot.'],
      ['T', 'Lammerts boot.'],
      ['A', 'Dat maakt het erger.'],
    ],
  },
  {
    // O8 Vet in de container
    npc: 'durk', outroPose: 'hips', ask: 0,
    intro: [
      ['A', 'Heb je hem?', { tag: 'via de telefoon, fluisterend' }],
      ['T', 'Ik heb een schroefje. En een kauwgom van in de Kop.', { tag: 'droog, onder het dashboard' }],
      ['A', 'De zender, Tammo.', { tag: 'fluisterend, ongeduldig' }],
      ['T', 'Ook. Hij zat er de hele tijd. We hadden hem kunnen volgen.', { tag: 'droog' }],
      ['A', 'Wie dan?', { tag: 'droog' }],
      ['T', 'Onszelf. Als we kwijt waren.', { tag: 'droog' }],
    ],
    outroNpc: true,
    outro: [
      ['A', 'Het vet is van Ubbo, de container van Siebrand en de zender van Henk.', { tag: 'zakelijk, moe' }],
      ['T', 'En de nacht was van mij.', { tag: 'droog, moe' }],
      ['A', 'Hij beweegt. Een vrachtwagen. Over de dijk, naar Delfzijl.', { tag: 'kijkt naar haar telefoon' }],
      ['T', 'Nu?', { tag: 'droog' }],
      ['A', 'Er komt storm. Dan kijkt niemand.', { tag: 'ernstig' }],
    ],
    replay: [
      ['N', 'Wij bewaken nog steeds de cloud. Hij is er nog steeds niet.', { tag: 'traag, plechtig' }],
    ],
    fail: [
      ['T', 'Gezien. Door de cloud.'],
      ['A', 'De cloud ziet niks, Tammo.'],
      ['T', 'Dan door die twee.'],
    ],
  },
  {
    // O9 Storm op de Eems
    npc: 'lammert', outroPose: 'hips', ask: 0,
    intro: [
      ['T', 'Hij komt eraan. Achthonderd meter.', { tag: 'gespannen, kijkt naar de stip' }],
      ['A', 'Ik zie hem. Twee lampen en een container.', { tag: 'vastberaden' }],
      ['T', 'En een golf.', { tag: 'droog, nerveus' }],
      ['A', 'Die zie ik ook.', { tag: 'geconcentreerd' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'De sluis is dicht. Daar is hij niet door. Hij is het Damsterdiep op, naar Appingedam.', { tag: 'oud, kalm, aan de telefoon' }],
      ['A', 'Morgen is de voorronde in Appingedam.', { tag: 'moe, vastberaden' }],
      ['N', 'Dan weet je waar hij is. Hij zit in de jury.', { tag: 'droog', clue: true }],
      ['T', 'Siebrand?', { tag: 'ongelovig' }],
      ['N', 'Voorzitter. Ubbo vond hem betrouwbaar. Ik meld alleen.', { tag: 'oud, droog' }],
    ],
    replay: [
      ['N', 'Weer storm? Dan zet ik koffie. Jullie komen toch.', { tag: 'oud, droog' }],
    ],
    fail: [
      ['A', 'Weg. In de mist.'],
      ['T', 'Met ons bewijs. En de zender van Henk.'],
    ],
  },
  {
    // O10 Hangende keukens
    npc: 'lammert', outroPose: 'hips', ask: 0,
    intro: [
      ['siebrand', 'Voorzitter. Siebrand Mulder. Ik proef alles. Ik zie alles.', { tag: 'kil, beleefd, aan de jurytafel' }],
      ['A', 'Ook containers?', { tag: 'koel, vanaf de kade' }],
      ['siebrand', 'Die zie ik niet. Daar heb ik mensen voor. Ze varen hier vandaag ook.', { tag: 'kalm, glimlachend' }],
      ['T', 'Hij heeft het over boten.', { tag: 'droog, bij de pan' }],
      ['A', 'Ik ook.', { tag: 'strijdlustig, springt in het bootje' }],
      ['N', 'Niet de keukens raken. Die hangen er al langer dan ik.', { tag: 'oud, droog, vanaf de brug' }],
    ],
    outroNpc: true,
    outro: [
      ['rikus', 'Ik krijg net door: de voorzitter is met de waterpolitie mee. Volgens het reglement jureert nu de oudste op de brug.', { tag: 'droog, live, als nacht-dj op een brug' }],
      ['N', 'Dat ben ik. Ik ben overal de oudste.', { tag: 'oud, droog' }],
      ['N', '…Braid noar de zin.', { tag: 'oud, zacht, proeft' }],
      ['T', 'Trede vier.', { tag: 'zacht, onder de indruk' }],
      ['A', 'Hij had nog hoger gekund.', { tag: 'zacht' }],
      ['N', 'Ik bewaar wat. Voor de finale.', { tag: 'oud, droog, met een glimlach' }],
      ['N', 'De voorronde Eemsdelta gaat naar de Fjord Frituur. Ik meld alleen.', { tag: 'oud, plechtig' }],
    ],
    replay: [
      ['N', 'Weer de voorronde? Ik ben nog steeds de oudste. Dat gaat vanzelf.', { tag: 'oud, droog' }],
    ],
    fail: [
      ['A', 'De kraam ligt in het Damsterdiep.'],
      ['T', 'De eierballen drijven. Dat is wel knap.'],
    ],
  },
```

### C. missions.js (stage-schetsen)

De vorm van de bestaande `stages`-missies (H2, H8, H10). Stage `say`-regels en stage-scènes staan in §3 per missie; ze gaan letterlijk in `say:` en `lines:`.

```js
// O1
{
  type: 'stages',
  label: 'Vergunning verlopen',
  intro: ['De Fjord Frituur hangt achter een takelwagen. Durk en Douwe zitten erin, en ze werken voor Oldenhuis Bakt.', 'Achter ze aan in de auto van Rikus. Op de oprit van de A7 kan Tammo erop klimmen.'],
  outro: 'De Fjord is terug. Op de Vismarkt staat een andere kraam.',
  timeLimit: null,
  reward: 1500,
  vehicle: 'car', ride: 'rikus',
  start: drive(/* Vismarkt bij de Korenbeurs */),
  handBack: { how: 'park', say: 'De auto van Rikus laten we hier staan. Hij weet waar hij is. Hij weet altijd alles.' },
  stages: [
    { kind: 'board', label: 'Stap in de auto van Rikus', say: 'Rood. Iedereen heeft een rode auto. Instappen.' },
    { kind: 'chase', label: 'Achtervolg de takelwagen', tow: 'fjord', noShoot: true, escape: 350, route: 'vismarkt-a7', slowmo: { at: 'julianaplein-oprit', s: 1.5 } },
    { kind: 'escort', label: 'Rij naast de frietwagen, dan klimt Tammo erop', side: 'left', within: 3, hold: 4 },   // NEW stage kind
    { kind: 'scene', label: 'A7, vluchtstrook', kicker: 'A7, vluchtstrook', cast: [{ key: 'durk' }, { key: 'douwe' }, { key: 'harm' }] },
    { kind: 'goto', target: { landmark: 'Vismarkt' }, mode: 'vehicle', own: 'fjord', label: 'Rij de Fjord Frituur terug naar de Vismarkt' },
  ],
},
// O2
{
  type: 'stages',
  label: "Oma's lijstje",
  intro: ['Oma Trijntje heeft een lijstje. Zeven namen, van 1953.', 'De eerste trein naar Warffum gaat om tien over zes. Voorin bij de machinist, of gewoon meerijden.'],
  outro: 'Warffum, kwart voor zeven. Er stond al iemand op het perron.',
  timeLimit: null, reward: 800, cannotFail: true,
  start: walk(/* Noorderhaven, Oma */),
  stages: [
    { kind: 'goto', target: { station: 'Groningen' }, mode: 'any', label: 'Naar het Hoofdstation, de trein van tien over zes', clock: 6.17 },
    { kind: 'ticket', label: 'Koop een kaartje bij de automaat', price: 4, dodge: 'okke' },   // NEW: wraps stationtravel.js
    { kind: 'train', line: 'roodeschool', to: 'Warffum', choose: ['cab', 'coupe'], instructor: 'jantina', reveal: 'roodeschool', label: 'Voorin bij Jantina, of meerijden' },   // NEW goal/stage kind
  ],
},
// O3
{
  type: 'stages',
  label: 'Een kerk op een bult',
  intro: ['Eppo Bolt heeft een mestinjecteur op het kerkpad van Den Andel gezet.', 'Leen de trekker van Jakob, trek de injecteur de wierde op en zet hem naast de pastorie. De kerkhofmuur blijft heel.'],
  outro: 'Het kerkpad is vrij. Eppo is langsgeweest. Hij was niet blij.',
  timeLimit: null, reward: 1400,
  start: walk(/* Warffum, café van Jakob */),
  handBack: { how: 'park', say: 'De trekker blijft hier. Jakob haalt hem straks op, zegt Geesje. Ze heeft hem al gebeld.' },
  wall: { label: 'Kerkhofmuur', per: 25, failAt: 100, fail: 'de kerkhofmuur ligt open. Geesje zegt niks, en dat is erger' },
  stages: [
    { kind: 'board', vehicle: 'tractor', label: 'Haal de trekker bij Jakob', say: 'Achter het café. Jakob zegt: hij trekt naar links.' },
    { kind: 'goto', target: { at: [/* Den Andel kerkpad */] }, mode: 'vehicle', label: 'Rij naar de kerk van Den Andel', convoys: 2 },
    { kind: 'hitch', target: 'injecteur', label: 'Koppel de mestinjecteur aan (E)' },   // NEW stage kind (trailer hitch)
    { kind: 'goto', target: { at: [/* erf naast de pastorie */] }, mode: 'vehicle', towing: true, park: 1.5, label: 'Trek hem de wierde op en zet hem naast de pastorie' },
    { kind: 'scene', kicker: 'Den Andel, de pastorie', cast: [{ key: 'eppo' }, { key: 'geesje' }], props: [{ kind: 'pickup', from: [24, 6], to: [5, 2] }] },
  ],
},
// O4
{
  type: 'stages',
  label: 'Oogst met haast',
  intro: ['Eppo maait het kerkland van Geesje leeg. Per ongeluk, zegt hij.', 'Neem Jakobs combine, raak de zijne vijf keer met je maaibord, en haal het graan terug.'],
  outro: 'Het graan ligt weer op het kerkland. Geesje maakt er paneermeel van.',
  timeLimit: null, reward: 1800, noShoot: true,
  start: drive(/* Jakobs schuur, Warffum */), clock: 19.2,
  handBack: { how: 'park', say: 'De combine blijft op het kerkland. Jakob komt hem halen, met een biertje.' },
  stages: [
    { kind: 'board', vehicle: 'combine', label: 'Stap in Jakobs combine', say: 'Maaibord omhoog op de weg. Anders maai je de berm.' },
    { kind: 'goto', target: { at: [/* kerkland Den Andel */] }, mode: 'vehicle', label: 'Rij naar het kerkland' },
    { kind: 'chase', label: "Raak Eppo's combine met je maaibord", vehicle: { name: 'combine', len: 9, wid: 3.4, maxSpeed: 9 }, name: 'Combine van Eppo', hits: 5, hitMode: 'ram', flee: [/* erf bij Usquert */], escape: 600, blocker: { kind: 'kipper', aggressive: true }, sunset: true },
    { kind: 'unload', label: 'Zet de losbuis over je bunker (E)', hold: 8 },   // NEW stage kind
    { kind: 'goto', target: { at: [/* kerkland */] }, mode: 'vehicle', label: 'Breng het graan terug naar het kerkland' },
  ],
},
// O5
{
  type: 'stages',
  label: 'Borgfeest',
  intro: ['Ubbo werft zijn jury op een tuinfeest in de Menkemaborg. Tessa serveert, Tammo sluipt.', 'Luister drie gesprekken af in het doolhof, en fotografeer de enveloppen van boven, met een duif, als het vuurwerk begint.'],
  outro: 'Drie enveloppen op de foto. Eén Stadjer in de gracht.',
  timeLimit: null, reward: 2000, clock: 21.5,
  start: walk(/* station Uithuizen */),
  stages: [
    { kind: 'sneak', label: 'Sluip door het doolhof', area: 'menkema-doolhof', guards: 4, earpiece: true },   // stealth like the H6 kraak
    { kind: 'listen', label: 'Luister het gesprek af (blijf ongezien)', spots: 3, range: 8, hold: 6 },        // NEW stage kind
    { kind: 'scene', kicker: 'Het terras van de borg', cast: [{ key: 'ubbo', pose: 'sit' }] },
    { kind: 'pigeon', spot: 'menkema-til', label: 'Fotografeer de enveloppen van boven', time: 90, fireworks: true,
      targets: [{ label: 'De brug' }, { label: 'Het terras' }, { label: 'De sloep op de gracht' }] },
    { kind: 'escape', label: 'Wegwezen: terug door het doolhof, of de gracht in', water: 'plons' },
  ],
},
// O6
{
  type: 'stages',
  label: 'Eén ei per wierde',
  intro: ['Voorronde één: eierballen van streekeieren uit vijf wierdedorpen, vers, voor vier uur.', 'Haal de eieren met de Fjord, heel. Terug op de kermis trekt iemand steeds de stroom eruit.'],
  outro: 'Voorronde Hogeland gewonnen. Ubbo klapte. Langzaam.',
  timeLimit: 420, reward: 2500, own: 'fjord',
  start: drive(/* kermis Uithuizen */),
  fragile: { label: 'Eieren', per: 1.8, failAt: 40, of: 50, fail: 'er zijn minder dan dertig eieren heel. Het wordt roerei' },
  stages: [
    { kind: 'board', own: 'fjord', label: 'Stap in de Fjord Frituur' },
    { kind: 'collect', label: 'Haal eieren in vijf wierdedorpen (minstens 30 heel)', any: true,   // NEW: unordered pickups
      stops: [{ name: 'Oldenzijl' }, { name: 'Zandeweer' }, { name: 'Rottum' }, { name: 'Kantens' }, { name: 'Usquert' }] },
    { kind: 'goto', target: { at: [/* kermis */] }, mode: 'vehicle', label: 'Terug naar de kermis in Uithuizen, voor vier uur' },
    { kind: 'defend', label: 'Hou de stroom erop', saboteur: 'knecht', cuts: 3, run: 20, meter: 'vet' },   // NEW stage kind
    { kind: 'scene', kicker: 'De jury', cast: [{ key: 'eppo' }, { key: 'slager' }, { key: 'hennie' }, { key: 'ubbo' }, { key: 'geesje' }] },
  ],
},
// O7
{
  type: 'stages',
  label: 'Lammert schuift',
  intro: ['Een kustvaarder van Siebrand Mulder lost \'s nachts in de Oosterhornhaven, zonder lampen.', 'Vaar erheen in Lammerts bootje, fotografeer wat ze lossen, en kom terug door zijn sluis.'],
  outro: 'Vet, sigaretten en paling. Lammert deed de deuren op tijd dicht.',
  timeLimit: null, reward: 2000, clock: 20.8,
  start: walk(/* sluiswachtershuisje, zeesluizen Farmsum */),
  boatAt: /* sluiskolk */ null, ride: 'lammert-boot',
  handBack: { how: 'moor', say: 'Het bootje gaat terug aan Lammerts steiger. Hij heeft het touw al vast.' },
  hull: { label: 'Romp', per: 20, failAt: 100 },
  stages: [
    { kind: 'board', label: 'Stap in Lammerts bootje' },
    { kind: 'lock', label: 'Schutten', gates: 'farmsum', dur: 15, skippable: true },          // NEW stage kind (sluis)
    { kind: 'goto', target: { at: [/* Oosterhornhaven */] }, mode: 'boat', darkRun: true, label: 'Vaar naar de Oosterhornhaven (lichten uit)' },
    { kind: 'sneak', mode: 'boat', label: 'Fotografeer wat ze lossen (blijf in het donker)', searchlights: 3,
      targets: [{ label: 'Vaten met OB' }, { label: 'Kratten sigaretten' }, { label: 'Een palingtank', reveal: true }] },
    { kind: 'flee', mode: 'boat', label: 'Terug naar de zeesluis!', pursuers: 2, to: { lock: 'farmsum' }, gateOpen: 240, slowmo: 1.5 },  // NEW stage kind
  ],
},
// O8
{
  type: 'stages',
  label: 'Vet in de container',
  intro: ['Ergens in Eemshaven staat een container vol vet van Oldenhuis Bakt. Lammert heeft het nummer.', 'Haal Henks zender uit de Fjord, sluip de terminal over, til met de kraan de bovenste containers weg en plak de zender eronder.'],
  outro: 'De zender zit. De container rijdt al, over de dijk.',
  timeLimit: null, reward: 2200, clock: 1.5, dawnAt: 5.67,
  start: walk(/* vuurtoren Eemshaven */),
  stages: [
    { kind: 'use', target: { own: 'fjord', part: 'dash' }, hold: 3, label: "Haal Henks zender onder het dashboard (E)" },   // NEW stage kind
    { kind: 'scene', kicker: 'De Wolkenhal', cast: [{ key: 'durk', look: 'guard' }, { key: 'douwe', look: 'guard' }], cam: { cctv: true } },
    { kind: 'sneak', label: 'Sluip naar de containerkraan', area: 'noorderterminal', guards: 6, movers: 'straddle' },
    { kind: 'climb', label: 'Klim de kraan in', height: 50, dur: 20 },
    { kind: 'crane', label: 'Til de drie bovenste containers weg', lifts: 3, dropsAllowed: 1 },   // NEW stage kind
    { kind: 'use', target: { container: 'C-38' }, hold: 4, label: 'Open de container en plak de zender eronder' },
    { kind: 'escape', label: 'Weg, over het hek bij de dijk', chasers: [{ kind: 'fatbike', riders: ['durk', 'douwe'], slow: true }] },
  ],
},
// O9
{
  type: 'stages',
  label: 'Storm op de Eems',
  intro: ['Windkracht negen. Siebrand haalt zijn container weg over de dijkweg, nu niemand kijkt.', 'Haal de vrachtwagen in en stop hem. Pas op voor de golven over de weg, en voor Siebrand.'],
  outro: 'De container staat stil, met de politie erbij. Siebrand is het water op.',
  timeLimit: null, reward: 2400, weather: 'storm9', clock: 23.4,
  start: drive(/* Holwierde, dijkweg */), loaner: 'jakob-pickup',
  stages: [
    { kind: 'goto', target: { at: [/* bij Bierum */] }, mode: 'vehicle', label: 'De vrachtwagen tegemoet, bij Bierum', gusts: true },
    { kind: 'chase', label: 'Stop de vrachtwagen', name: 'Vrachtwagen met container', hits: 6, escort: { name: 'SUV van Siebrand', rams: true }, waves: 3, police: 2, flee: [/* Oosterhornhaven */] },
    { kind: 'scene', kicker: 'De dijkweg bij Delfzijl', cast: [{ key: 'agent' }], props: [{ kind: 'rib', from: 'kade', to: 'damsterdiep' }] },
  ],
},
// O10
{
  type: 'stages',
  label: 'Hangende keukens',
  intro: ['Voorronde twee, aan het Damsterdiep in Appingedam. Siebrand is juryvoorzitter, en zijn boten liggen in het water.', 'Hou de boten weg van de kraam en van de hangende keukens. Tammo bakt.'],
  outro: 'De keukens hangen nog. Siebrand zit bij de waterpolitie. De voorronde is van jullie.',
  timeLimit: null, reward: 3000,
  start: walk(/* kade Damsterdiep, Appingedam */), ride: 'lammert-boot',
  handBack: { how: 'moor', say: 'Lammerts bootje blijft aan de kade. Hij vaart zelf terug, zegt hij. Morgen.' },
  meters: [{ label: 'Kraam', failAt: 0, per: 34 }, { label: 'Keukens', failAt: 0, per: 50 }],
  hull: { label: 'Romp', per: 20, failAt: 100 },
  stages: [
    { kind: 'board', label: 'Stap in Lammerts bootje' },
    { kind: 'defend', mode: 'boat', label: 'Hou de boten weg van de kraam en de keukens', waves: [2, 3, 'boss'], bake: [60, 60, 60], flankOnly: true },
    { kind: 'push', mode: 'boat', label: 'Siebrand vaart zelf! Duw hem het riet in', target: 'werkboot', into: 'riet', times: 3 },   // NEW stage kind
    { kind: 'scene', kicker: 'Het riet bij Appingedam', cast: [{ key: 'agente' }, { key: 'siebrand' }] },
  ],
},
```

### D. banterlines.js

```js
// banterlines.js: append. New triggers: after:O1..O10 (story codes), train:roodeschool, train:delfzijl
  { id: 'o1-pass-ubbo', trigger: 'after:O1:pass', needs: 'O1', lines: [
    ['T', 'Hij heet Ubbo.', 'dry'],
    ['A', 'Net als die app op je telefoon.', 'amused'],
    ['T', 'Die zoekt tenminste werk voor me.', 'dry, deadpan']] },
  { id: 'o1-pass-negen', trigger: 'after:O1:pass', needs: 'O1', lines: [
    ['A', '"Ik heb er al negen." Negen frietwagens. In een loods.', 'angry, quiet'],
    ['T', 'Deze niet. Deze heeft een handrem.', 'dry, protective']] },
  { id: 'o1-fail', trigger: 'after:O1:fail', needs: 'O1', lines: [
    ['T', 'Hij reed harder dan ik dacht. Voor een takelwagen.', 'sheepish'],
    ['A', 'Het is een takelwagen met twee Friezen erin, Tammo. Die rijden nergens hard.', 'exasperated']] },
  { id: 'o2-pass-schuiven', trigger: 'after:O2:pass', needs: 'O2', lines: [
    ['A', 'Lammert schoof met je oma.', 'teasing, warm'],
    ['T', 'Ik wil daar niks over weten.', 'dry'],
    ['A', 'Langzaam. Met de voeten op de grond.', 'teasing'],
    ['T', 'Tessa.', 'dry, pained']] },
  { id: 'o2-pass-schuld', trigger: 'after:O2:pass', needs: 'O2', lines: [
    ['T', '"Schuld erft." Wat erf ik dan van oma?', 'dry, thoughtful'],
    ['A', 'Haar wekker.', 'dry, quick']] },
  { id: 'o3-pass-tas', trigger: 'after:O3:pass', needs: 'O3', lines: [
    ['A', 'Ze droeg haar tas. Een jaar lang.', 'moved, quiet'],
    ['T', 'Hij was na zes weken genezen.', 'dry'],
    ['A', 'Dat is het punt, Tammo.', 'firm, warm'],
    ['T', '…Ik weet het.', 'soft']] },
  { id: 'o3-pass-dienst', trigger: 'after:O3:pass', needs: 'O3', lines: [
    ['T', 'Vier mensen in de kerk. Met ons zes.', 'dry'],
    ['A', 'Je overweegt het.', 'teasing'],
    ['T', 'Ik overweeg niks. Ik tel.', 'dry']] },
  { id: 'o3-fail', trigger: 'after:O3:fail', needs: 'O3', lines: [
    ['A', 'Geesje heeft de stenen al geteld.', 'dry'],
    ['T', 'Natuurlijk heeft ze dat.', 'resigned']] },
  { id: 'o4-pass-meisje', trigger: 'after:O4:pass', needs: 'O4', lines: [
    ['T', 'Hij zei meisje. Daarna heb je hem vijf keer geraakt.', 'dry'],
    ['A', 'Vier keer. De vijfde was voor Ubbo.', 'calm, smug']] },
  { id: 'o4-pass-paneermeel', trigger: 'after:O4:pass', needs: 'O4', lines: [
    ['A', 'Paneermeel van kerkland. Dat is een verhaal. Dat verkoopt.', 'excited'],
    ['T', 'Het is ook gewoon lekker.', 'dry'],
    ['A', 'Dat verkoopt ook.', 'quick']] },
  { id: 'o4-fail', trigger: 'after:O4:fail', needs: 'O4', lines: [
    ['A', 'Een combine stuurt als een kerk.', 'frustrated'],
    ['T', 'Dan had Geesje moeten rijden.', 'dry']] },
  { id: 'o5-pass-gezichten', trigger: 'after:O5:pass', needs: 'O5', lines: [
    ['T', '"Ik onthoud gezichten." Wat bedoelt hij daarmee?', 'dry, uneasy'],
    ['A', 'Dat ik verkopen kan.', 'dry'],
    ['T', 'Dat wist ik al.', 'dry']] },
  { id: 'o5-pass-gracht', trigger: 'after:O5:pass', needs: 'O5', lines: [
    ['A', 'Je hebt de borg van achteren gezien. En van onderen.', 'teasing'],
    ['T', 'De gracht is zestig centimeter. Ik heb gestaan.', 'dry, wet'],
    ['A', 'Op je knieën.', 'laughing']] },
  { id: 'o5-fail', trigger: 'after:O5:fail', needs: 'O5', lines: [
    ['A', 'Een haag beweegt niet, zei ik.', 'dry'],
    ['T', 'Hij niesde. Ik niet.', 'dry']] },
  { id: 'o6-pass-ow', trigger: 'after:O6:pass', needs: 'O6', lines: [
    ['A', 'Eppo zei "ow". Ik heb het opgenomen.', 'laughing'],
    ['T', 'Voor de kleinkinderen.', 'dry'],
    ['A', 'Voor de… voor de radio, Tammo.', 'quick, then caught'],
    ['T', 'Ik zeg niks.', 'dry, small smile']] },
  { id: 'o6-pass-een', trigger: 'after:O6:pass', needs: 'O6', lines: [
    ['A', 'Eén voorronde. Nog zes. En dan in elk dorp een kraam.', 'excited'],
    ['T', 'Eén voorronde. En de Vismarkt terug. Dat was het plan.', 'dry'],
    ['A', 'Dat is plan A. Ik heb ook een plan B.', 'quick'],
    ['T', 'Die is altijd groter.', 'dry']] },
  { id: 'o6-fail', trigger: 'after:O6:fail', needs: 'O6', lines: [
    ['T', 'Een kip op de brug in Kantens. Ze had gelijk.', 'dry'],
    ['A', 'Je remde voor een kip en niet voor het gat erna.', 'exasperated']] },
  { id: 'o7-pass-dans', trigger: 'after:O7:pass', needs: 'O7', lines: [
    ['A', 'Zeventig jaar wachten op één dans.', 'soft'],
    ['T', 'Hij wacht graag. Het is zijn vak.', 'dry'],
    ['A', 'Jij wachtte twaalf jaar.', 'teasing, warm'],
    ['T', 'Ik ben geen sluiswachter. Ik ben gewoon traag.', 'dry']] },
  { id: 'o7-pass-paling', trigger: 'after:O7:pass', needs: 'O7', lines: [
    ['T', 'Waarom smokkel je paling?', 'puzzled'],
    ['A', 'Omdat het mag. Nee. Omdat het niet mag.', 'dry']] },
  { id: 'o7-fail', trigger: 'after:O7:fail', needs: 'O7', lines: [
    ['T', 'Lammert zei: kom terug door mijn sluis. Niet: kom terug zonder boot.', 'dry']] },
  { id: 'o8-pass-cloud', trigger: 'after:O8:pass', needs: 'O8', lines: [
    ['A', 'Wat zeiden Durk en Douwe?', 'amused'],
    ['T', 'Dat ze de cloud bewaken.', 'dry'],
    ['A', 'En?', 'dry'],
    ['T', 'Hij is er nog.', 'deadpan']] },
  { id: 'o8-pass-henk', trigger: 'after:O8:pass', needs: 'O8', lines: [
    ['A', 'Die zender zat er sinds de Kop in. Henk heeft ons al die tijd kunnen volgen.', 'thoughtful'],
    ['T', 'Henk vraagt niet waarom. Hij kijkt ook niet.', 'dry']] },
  { id: 'o8-fail', trigger: 'after:O8:fail', needs: 'O8', lines: [
    ['T', 'Die container viel heel netjes.', 'dry'],
    ['A', 'Op het dak van een bewaker.', 'dry'],
    ['T', 'Hij stond er net naast.', 'dry']] },
  { id: 'o9-pass-meer', trigger: 'after:O9:pass', needs: 'O9', lines: [
    ['A', '"Vet is maar vet. Ik heb meer." Dat zei Jelle ook.', 'dry'],
    ['T', 'Iedereen heeft altijd meer vet. Behalve wij.', 'dry']] },
  { id: 'o9-pass-golf', trigger: 'after:O9:pass', needs: 'O9', lines: [
    ['T', 'Je reed door een golf.', 'shaky, dry'],
    ['A', 'Hij reed door ons. Ik reed gewoon door.', 'calm']] },
  { id: 'o9-fail', trigger: 'after:O9:fail', needs: 'O9', lines: [
    ['A', 'Ik had hem. Bij Uitwierde had ik hem.', 'angry at herself'],
    ['T', 'Je had een golf. Dat is anders.', 'soft']] },
  { id: 'o10-pass-tellen', trigger: 'after:O10:pass', needs: 'O10', lines: [
    ['A', '"Ik heb er nog negenendertig." Hij telt verkeerd.', 'amused'],
    ['T', 'Hij telt snackbars. Wij tellen voorrondes.', 'dry'],
    ['A', 'Hij telt wat hij heeft. Wij wat we winnen.', 'dry']] },
  { id: 'o10-pass-braid', trigger: 'after:O10:pass', needs: 'O10', lines: [
    ['T', 'Braid noar de zin. Van een sluiswachter.', 'moved, hiding it'],
    ['A', 'Hij bewaart de rest voor de finale.', 'soft'],
    ['T', 'Dan moeten we er nog komen.', 'dry']] },
  { id: 'o10-fail', trigger: 'after:O10:fail', needs: 'O10', lines: [
    ['T', 'Ze varen hier al eeuwen langs die keukens. En wij raken ze in één middag.', 'dry']] },
  { id: 'tr-roodeschool', trigger: 'train:roodeschool', needs: 'O2', lines: [
    ['A', 'Winsum. Hier wil ik een filiaal. Aan het water.', 'dreamy'],
    ['T', 'Je hebt het water nog niet eens gezien.', 'dry'],
    ['A', 'Ik zie het. In mijn hoofd. Met een terras.', 'quick'],
    ['T', 'Baflo. Jij hebt hier ook een plan voor.', 'dry'],
    ['A', 'Nee. Baflo is gewoon mooi.', 'laughing'],
    ['T', 'Eindelijk één dorp zonder kraam.', 'dry'],
    ['A', 'Waarom heet het Roodeschool?', 'curious'],
    ['T', 'Er stond een rode school.', 'confident'],
    ['A', 'Er stond een rode school. Dat klopt zelfs.', 'dry, knowing'],
    ['T', 'Dat bedoelde ik ook.', 'dry']] },
  { id: 'tr-delfzijl', trigger: 'train:delfzijl', needs: 'n-delfzijl', lines: [
    ['T', 'Bedum. De toren staat nog scheef.', 'dry, looking out'],
    ['A', 'Je zegt het alsof hij het expres doet.', 'teasing'],
    ['T', 'Iedereen hier doet alles expres.', 'dry'],
    ['A', 'Loppersum. Kijk, steigers. Overal.', 'soft'],
    ['T', 'Ja.', 'quiet'],
    ['A', '…Ja.', 'quiet'],
    ['A', 'Appingedam! De hangende keukens.', 'excited'],
    ['T', 'Je wilt er een filiaal.', 'dry'],
    ['A', 'In een hangende keuken.', 'quick'],
    ['T', 'Dan valt hij er wel af.', 'deadpan']] },
```

### E. subtitles.js

```js
// subtitles.js GRO: lines shown in Gronings, with their Dutch
  'Valt mie nait of.': 'Dat valt me niet tegen.',
  '…Braid noar de zin.': '…Helemaal tevreden.',
  'Wat doen jullie op mien laand!': 'Wat doen jullie op mijn land!',
  'Veur de opa, nait veur die.': 'Voor de opa, niet voor jou.',
  // proposed extra line for Boerin Geesje (ommelandlines.js, Stedum), see §2
  'Mien taante Geesje? Kosteres? Ik heet noar heur. Wie heten hier aal noar heur.': 'Mijn tante Geesje? Kosteres? Ik ben naar haar vernoemd. Wij zijn hier allemaal naar haar vernoemd.',

// subtitles.js FY: Frisian lines (Jelle, Durk & Douwe's cousins), with their Dutch
  'Rikus. Jelle. Durk en Douwe rijden nu voor een Grinzer.': 'Rikus. Jelle. Durk en Douwe rijden nu voor een Groninger.',
  'Stil. Ze komen niet meer bij mem eten.': 'Stil. Ze komen niet meer bij mijn moeder eten.',
  'Halt. Fryske grins. Paspoart, as it jo belieft.': 'Halt. Friese grens. Paspoort, alstublieft.',
  'Wy oefenje.': 'Wij oefenen.',
  'Wy binne de neven fan Durk en Douwe.': 'Wij zijn de neven van Durk en Douwe.',
  'Jim meie troch. Mar net fertelle.': 'Jullie mogen door. Maar niet doorvertellen.',
```

### F. scripts/gronings_spoken.json (toevoegingen)

Wat de stemmen zeggen: elke getoonde Nederlandse regel → de Groningse uitspraak (928 regels). Zelfde spelling als de bestaande tabel (`nait`, `gain`, `mie`, `doe`, `n`, `t`, `veur`, `noar`). Friese sprekers (Jelle, Durk, Douwe, Wybe, Wiebren) staan er niet in: die spreken hun eigen taal (`lang: 'own'`). Regels die al in het Gronings getoond worden, staan erin met zichzelf. **Controle:** `node scripts/gronings_spoken_test.mjs` (cijfers gelijk, niet veel langer). Een redacteur met Gronings als moedertaal leest dit nog één keer na, zoals bij de eerste tabel.

```json
{
"…Braid noar de zin.":"…Braid noar de zin.",
"…Goud.":"…Goud.",
"…Hij ligt er echt.":"…Hai ligt der echt.",
"…Ik weet het.":"…Ik wait t.",
"…Ja.":"…Ja.",
"…Ow.":"…Ow.",
"\"De standplaats Vismarkt gaat per vandaag naar Oldenhuis Bakt.\" Wie is Oldenhuis Bakt?":"\"De standplaats Vismark goat per vandoage noar Oldenhuis Bakt.\" Wie is Oldenhuis Bakt?",
"\"Ik heb er al negen.\" Negen frietwagens. In een loods.":"\"Ik heb der al negen.\" Negen frietwagens. In n loods.",
"\"Ik heb er nog negenendertig.\" Hij telt verkeerd.":"\"Ik heb der nog negenendertig.\" Hai telt verkeerd.",
"\"Ik onthoud gezichten.\" Wat bedoelt hij daarmee?":"\"Ik onthoud gezichten.\" Wat bedoelt hai doarmit?",
"\"Ommelander Ronde, 1953. Tweede prijs.\" En een naam. Trijntje.":"\"Ommelander Ronde, 1953. Tweede prijs.\" En n naam. Trijntje.",
"\"Schuld erft.\" Wat erf ik dan van oma?":"\"Schuld erft.\" Wat erf ik dan van oma?",
"\"Vet is maar vet. Ik heb meer.\" Dat zei Jelle ook.":"\"Vet is mor vet. Ik heb meer.\" Dat zee Jelle ook.",
"Aan de kade. Geen kras. Je bent beter dan ik was. Zeg het niet verder.":"Aan de kaai. Gain kras. Je bist beter as ik was. Zeg t nait verder.",
"Aan ons?":"Aan ons?",
"Accu. Kabels erop, Tammo.":"Accu. Kabels derop, Tammo.",
"Achteruit, onder de kraan. Twee meter. Nog één. Klik. Goed.":"Achteruit, onder de kraan. Twij meter. Nog ain. Klik. Goud.",
"Achteruit. Nog een meter. Nog een halve. Klik.":"Achteruit. Nog n meter. Nog n halve. Klik.",
"Achthonderd jaar ligt dat pad er. Nooit heeft er mest op gestaan.":"Achthonderd joar ligt dat pad der. Nooit het der mest op gestaan.",
"Afstand houden. Hij is niet verdwaald. Hij is gewoon nieuwsgierig.":"Afstand hollen. Hai is nait verdwaald. Hai is gewoon nieuwsgierig.",
"Ah. Afgeslagen. Hij keek naar het publiek. Dat moet je nooit doen.":"Ah. Afgeslagen. Hai keek noar t publiek. Dat mout je nooit doun.",
"Al mijn kramen zijn groter. Dat is het idee.":"Al mien kramen zijn grötter. Dat is t idee.",
"Allemaal. Ik ben er nooit mee opgehouden.":"Allemoal. Ik bin der nooit mit opgehouden.",
"Alles is donker, Klaas.":"Aals is duuster, Klaas.",
"Alles is openbaar. Tot ik het koop.":"Aals is openbaar. Tot ik t koop.",
"Alles is verkopen, meisje. Ik onthoud gezichten.":"Aals is verkopen, wicht. Ik onthoud gezichten.",
"Appingedam! De hangende keukens.":"Appingedam! De hangende keukens.",
"Appingedam. Keukens die boven het water hangen. Ooit was er geen ruimte. Nu is het het mooiste stukje van de Eemsdelta.":"Appingedam. Keukens dij boven t woater hangen. Ooit was der gain ruimte. Nou is t t mooiste stukje van de Eemsdelta.",
"Baflo. Jij hebt hier ook een plan voor.":"Baflo. Doe hest hier ook n plan veur.",
"Band eraf! Hij slingert.":"Band eraf! Hai slingert.",
"Bedum. De toren staat nog scheef.":"Bedum. De toren stait nog scheef.",
"Bel haar maar. Ze heeft er zeventig jaar niet over gepraat. Dat is lang genoeg.":"Bel heur mor. Zai het der zeventig joar nait over gepraat. Dat is lang genoeg.",
"Berm in. Hij gaat niet opzij. Het is zijn weg, vindt hij.":"Berm in. Hai goat nait opzied. 't is zijn vot, vindt hai.",
"Bewaker links. Hij kijkt naar zijn telefoon. Nu.":"Bewaker links. Hai kiekt noar zijn telefoon. Nou.",
"Bij de halte stoppen, niet ervoor. De mensen hier lopen niet naar een bus. De bus komt naar hen.":"Bie de halte stoppen, nait ervoor. De mensen hier lopen nait noar n bus. De bus komt noar hen.",
"Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt tot de Korenbeurs.":"Bie de Vismark stait n blauwe frietwagen op n rode Escapade. De rie lopt tot de Korenbeurs.",
"Bochten zijn hier ook niet bedoeld voor dit.":"Bochten zijn hier ook nait bedoeld veur dit.",
"Braid noar de zin. Van een sluiswachter.":"Braid noar de zin. Van n sluiswachter.",
"Breekbaar in de krant. Boeken in kleine dozen. Anders krijg je ze niet getild. En de kat is het moeilijkste.":"Breekbaar in de krant. Boeken in kleine dozen. Anders krieg je ze nait getild. En de kat is t moeilijkste.",
"Brommer & Bougie. Drie versnellingen, één koppeling, nul geduld. Proefrit mag. Valpartij betaal je.":"Brommer & Bougie. Drij versnellingen, ain koppeling, nul geduld. Proefrit mag. Valpartij betaal je.",
"Brons. Je bent aangekomen. Dat is al wat.":"Brons. Je bist aangekomen. Dat is al wat.",
"Brug gaat open. We halen het. We halen het niet. We halen het.":"Brug goat open. Wie halen t. Wie halen t nait. Wie halen t.",
"Brug. Terras. De sloep. Klik, klik, klik.":"Brug. Terras. De sloep. Klik, klik, klik.",
"Buren. Gezellig.":"Buren. Gezellig.",
"Code oranje voor de kust. Windkracht negen. De torenwachter belde: zijn toren beweegt. Hij meldt alleen.":"Code oranje veur de kust. Windkracht negen. De torenwachter belde: zijn toren beweegt. Hai meldt aleen.",
"Daar heb ik mijn eerste schip gestuurd. Ik was negentien. Het schip ook, ongeveer.":"Doar heb ik mien aarste schip stuurd. Ik was negentien. 't schip ook, ongeveer.",
"Daar is hij voor.":"Doar is hai veur.",
"Daar ken ik er nog één van.":"Doar ken ik der nog ain van.",
"Daar maak ik geen grap over. Ik zeg alleen dat ze er wonen. En dat ze ook luisteren. Goedenavond, Eemsdelta.":"Doar moak ik gain grap over. Ik zeg aleen dat ze der woonen. En dat ze ook luusteren. Goedenavond, Eemsdelta.",
"Daar vaart een zeiljacht uit Duitsland. Te laat voor de schutting. Ik meld alleen. Ik doe hem toch open.":"Doar vaart n zeiljacht oet Duitsland. Te loat veur de schutting. Ik meld aleen. Ik doe hom toch open.",
"Daar woonde mijn buurvrouw. Die is al terug. Ze zegt dat het nu beter is dan eerst.":"Doar woonde mien buurvrouw. Dij is al terug. Zai zegt dat t nou beter is dan aarst.",
"Daar zijn de wegen van grind.":"Doar zijn de wegen van grind.",
"Daar. Aan de Oosterhornhaven. De kustvaarder. Hij lost 's nachts, zonder lampen. Van Siebrand Mulder. Havenbaas, zegt hij.":"Doar. Aan de Oosterhornhaven. De kustvaarder. Hai lost s nachts, zonder lampen. Van Siebrand Mulder. Havenbaas, zegt hai.",
"Daar. Dat stuk dijk met dat bankje. Daar zat ik als jongen. Ik telde schepen.":"Doar. Dat stuk diek mit dat bankje. Doar zat ik as jong. Ik telde schepen.",
"Daar. Ik zie hem. Veertig jaar. Kijk niet naar mij, kijk naar het sein.":"Doar. Ik zai hom. Veertig joar. Kiek nait noar mie, kiek noar t sein.",
"Daarom reed hij nooit vijfenveertig.":"Doarom reed hai nooit vijfenveertig.",
"Daarom.":"Doarom.",
"Daarom. Spreiden.":"Doarom. Spreiden.",
"Dames en heren, de machinist zegt dat hij weet wat hij doet. Hou u even vast.":"Dames en heren, de machinist zegt dat hai wait wat hai dut. Hol u eefkes vast.",
"Dan ben je op tijd. Voor één keer.":"Dan bin je op tied. Veur ain keer.",
"Dan door die twee.":"Dan deur dij twij.",
"Dan had Geesje moeten rijden.":"Dan har Geesje mouten rieden.",
"Dan hoeven jullie ook niet te kijken. Luisteren. Een schip praat.":"Dan hoeven jim ook nait te kieken. Luisteren. N schip proat.",
"Dan is alles diep. Gas erop.":"Dan is aals diep. Gas derop.",
"Dan is het altijd een thuiswedstrijd.":"Dan is t aaltied n thuiswedstrijd.",
"Dan ken ik ze.":"Dan ken ik ze.",
"Dan kijk ik heel goed. Met mijn handen.":"Dan kiek ik hail goud. Mit mien handen.",
"Dan lopen jullie allebei zo.":"Dan lopen jim allebei zo.",
"Dan moet hij ze komen halen. Bij laagwater. Ik weet waar het ondiep is. Hij niet.":"Dan mout hai ze komen halen. Bie laagwater. Ik wait woar t ondiep is. Hai nait.",
"Dan moet ik opschieten.":"Dan mout ik opschieten.",
"Dan moeten we er nog komen.":"Dan mouten wie der nog komen.",
"Dan sta je stil. Een haag beweegt niet.":"Dan stoa je still. N haag beweegt nait.",
"Dan valt hij er wel af.":"Dan valt hai der wel af.",
"Dan weet je waar hij is. Hij zit in de jury.":"Dan waist woar hai is. Hai zit in de jury.",
"Dan wil ik volgende keer een patatje. Met. Dan staan we quitte.":"Dan wil ik volgende keer n patatje. Mit. Dan stoan wie quitte.",
"Dan zie ik precies waar hij is.":"Dan zai ik precies woar hai is.",
"Dansen, jong. Langzaam. Met je voeten op de grond.":"Dansen, jong. Langzaam. Mit je voeten op de grond.",
"Dat bedoelde ik ook.":"Dat bedoelde ik ook.",
"Dat ben ik. Ik ben overal de oudste.":"Dat bin ik. Ik bin aaloverst de oudste.",
"Dat ben je ook, Hennie. Eerlijk voor mij.":"Dat bin je ook, Hennie. Eerlijk veur mie.",
"Dat deed hij toen ook al niet. Daarom liet opa hem slapen.":"Dat deed hai toen ook al nait. Doarom liet opa hom slapen.",
"Dat denkt iedereen. Op deze lijn is het bijna waar. Volgende keer een kaartje, hè.":"Dat denkt iedereen. Op disse lien is t bieno woar. Volgende keer n kaartje, hè.",
"Dat graan blijft hier.":"Dat graan bliedt hier.",
"Dat graan was voor Ubbo. Hij koopt het hele Hogeland. Graan, aardappels, mest.":"Dat graan was veur Ubbo. Hai koopt t hiele Hogeland. Graan, aardappels, mest.",
"Dat ik verkopen kan.":"Dat ik verkopen kin.",
"Dat is geen Gronings recht, oma.":"Dat is gain Gronings recht, oma.",
"Dat is geen trekken. Dat is volhouden.":"Dat is gain trekken. Dat is volhouden.",
"Dat is geen wierde.":"Dat is gain wierde.",
"Dat is het eng aan filialen.":"Dat is t eng aan filialen.",
"Dat is het enige wat ik hem gun.":"Dat is t enige wat ik hom gun.",
"Dat is het ergste wat jij kunt doen.":"Dat is t ergste wat doe kunt doun.",
"Dat is het Hogeland.":"Dat is t Hogeland.",
"Dat is het punt, Tammo.":"Dat is t punt, Tammo.",
"Dat is hetzelfde, hier.":"Dat is hetzelfde, hier.",
"Dat is iedereen, Ubbo.":"Dat is iedereen, Ubbo.",
"Dat is mijn neef. Hij is ouder dan ik, maar hij zit hoger.":"Dat is mien neef. Hai is older as ik, mor hai zit hoger.",
"Dat is nog best veel.":"Dat is nog best veul.",
"Dat is ons graan dat stuift. Netjes raken.":"Dat is ons graan dat stuift. Netjes raken.",
"Dat is plan A. Ik heb ook een plan B.":"Dat is plan A. Ik heb ook n plan B.",
"Dat is Tessa. Die loopt zo.":"Dat is Tessa. Dij lopt zo.",
"Dat klopt ook.":"Dat klopt ook.",
"Dat klopt. Dat doet ze niet.":"Dat klopt. Dat dut ze nait.",
"Dat maaibord is zeven meter. Jij bent één meter zestig.":"Dat maaibord is zeuven meter. Doe bist ain meter zestig.",
"Dat maakt het erger.":"Dat moakt t erger.",
"Dat mag daar niet, Torenwachter.":"Dat mag doar nait, Torenwachter.",
"Dat moet ik nog vinden.":"Dat mout ik nog vinden.",
"Dat pad is van de doden. Die liggen er al achthonderd jaar. Jij pas vijfenvijftig.":"Dat pad is van de doden. Dij liggen der al achthonderd joar. Doe pas vijfenvijftig.",
"Dat staat er niet op.":"Dat stait der nait op.",
"Dat staat je.":"Dat stait je.",
"Dat staat op het lijstje.":"Dat stait op t lieske.",
"Dat verkoopt ook.":"Dat verkoopt ook.",
"Dat was korting!":"Dat was korting!",
"Dat was rood. Ik zeg het één keer. Daarna rij ik.":"Dat was rood. Ik zeg t ain keer. Doarnoa rie ik.",
"Dat weet ze.":"Dat wait ze.",
"Dat wist ik al.":"Dat wus ik al.",
"Dat ze de cloud bewaken.":"Dat ze de cloud bewaken.",
"Dat zeg ik. Een beetje.":"Dat zeg ik. N betje.",
"Dat zeggen ze. Ik zeg het ook. Dan zijn we het eens.":"Dat zeggen ze. Ik zeg t ook. Dan zijn wie t ains.",
"Dat zei ik.":"Dat zee ik.",
"Dat zei Trijntje al. Ze zei: dat is het enige wat hij altijd doet.":"Dat zee Trijntje al. Zai zee: dat is t enige wat hai aaltied dut.",
"Dat zie ik niet. Daar heb ik jullie voor.":"Dat zai ik nait. Doar heb ik jim veur.",
"Dat zijn servetten, Tammo. Die hebben we nog.":"Dat zijn servetten, Tammo. Dij hebben wie nog.",
"De cloud ziet niks, Tammo.":"De cloud ziet niks, Tammo.",
"De deuren staan open! Hij wacht!":"De deuren stoan open! Hai wacht!",
"De dijk over! Hij gaat de kwelder in.":"De diek over! Hai goat de kwelder in.",
"De eerste trein naar Warffum gaat om tien over zes.":"De aarste trein noar Warffum goat om tien over zes.",
"De eierballen drijven. Dat is wel knap.":"De eierballen drijven. Dat is wel knap.",
"De Fjord Frituur. Dat wagentje.":"De Fjord Frituur. Dat wagentje.",
"De Gouden Eierbal staat weer in het museum. Met twee namen op het bordje.":"De Gouden Eierbal stait weer in t museum. Mit twij nammen op t bordje.",
"De gracht is korter.":"De gracht is korter.",
"De gracht is zestig centimeter. Ik heb gestaan.":"De gracht is zestig centimeter. Ik heb gestaan.",
"De Heer. Met een trekker.":"De Heer. Mit n trekker.",
"De kamer boven is van jullie. Het bed kraakt. Het is een oud bed.":"De kamer boven is van jim. 't bed kraakt. 't is n old bed.",
"De kat was eerder terug dan ik. Hij liep gewoon. Twee kilometer.":"De kat was aarder terug dan ik. Hai liep gewoon. Twij kilometer.",
"De kat wil niet in de mand.":"De kat wil nait in de mand.",
"De kipper komt van rechts. Hij wil je klemrijden.":"De kipper komt van rechts. Hai wilst klemrijden.",
"De kraam ligt in het Damsterdiep.":"De kraam ligt in t Damsterdiep.",
"De Menkemaborg in Uithuizen. Een borg met een gracht en een doolhof. Wie de weg kwijt is, is hier op de goede plek.":"De Menkemaborg in Uithuizen. N borg mit n gracht en n doolhof. Wie de vot kwiet is, is hier op de goie plek.",
"De muur, Tammo! Links is de muur!":"De muur, Tammo! Links is de muur!",
"De pet blijft.":"De pet bliedt.",
"De scheve toren van Bedum. Pisa heeft er ook een. Die van Bedum is eerlijker over zichzelf.":"De scheve toren van Bedum. Pisa het der ook n. Dij van Bedum is eerlijker over zichzelf.",
"De sluis is dicht. Daar is hij niet door. Hij is het Damsterdiep op, naar Appingedam.":"De sluis is dicht. Doar is hai nait deur. Hai is t Damsterdiep op, noar Appingedam.",
"De stroom! De pan koelt af!":"De stroom! De pan koelt af!",
"De torenwachter belde. Zijn nicht in Den Andel had al gebeld. En een sluiswachter in Delfzijl. Ze melden alleen. Ze melden alleen nogal veel.":"De torenwachter belde. Zien nicht in Den Andel har al gebeld. En n sluiswachter in Delfzijl. Zai melden aleen. Zai melden aleen nogal veul.",
"De trein is sneller dan mijn trekker. Mijn trekker komt wel overal.":"De trein is sneller as mien trekker. Mien trekker komt wel aaloverst.",
"De voorronde Eemsdelta gaat naar de Fjord Frituur. Ik meld alleen.":"De voorronde Eemsdelta goat noar de Fjord Frituur. Ik meld aleen.",
"De voorronde Hogeland gaat naar… de Fjord Frituur!":"De voorronde Hogeland goat noar… de Fjord Frituur!",
"De wierde van Stedum. Een bult tegen de zee, eeuwen voor de dijken. De zee is weg. De bult is gebleven.":"De wierde van Stedum. N bult tegen de zee, eeuwen veur de diekken. De zee is vot. De bult is bleven.",
"De Wolkenhal. Een grijze doos zo groot als een dorp. Hier staat de cloud, zeggen ze. Niemand heeft hem gezien.":"De Wolkenhal. N grijze doos zo groot as n dörp. Hier stait de cloud, zeggen ze. Niemand het hom zain.",
"De zeedijk bij Uithuizen. Aan de ene kant land, aan de andere kant kwelder, en daarachter het wad. Hier begint het eind van Nederland.":"De zeedijk bie Uithuizen. Aan de ene kaant land, aan de aander kaant kwelder, en daarachter t wad. Hier begint t eind van Nederland.",
"De zeesluizen bij Farmsum. Hier wordt het kanaal de zee. Of andersom. Lammert weet het.":"De zeesluizen bie Farmsum. Hier wordt t kanaal de zee. Of andersom. Lammert wait t.",
"De zender, Tammo.":"De zender, Tammo.",
"De zon gaat onder. Nu zie je alleen nog zijn lampen.":"De zun goat onder. Nou zugst aleen nog zijn lampen.",
"De zweefmolen! Eén rondje.":"De zweefmolen! Ain rondje.",
"Deal!":"Deal!",
"Delfzijl praat niet. Delfzijl kijkt.":"Delfzijl proat nait. Delfzijl kiekt.",
"Delfzijl. Daar zijn we als kind een keer geweest.":"Delfzijl. Doar zijn wie as kind n keer west.",
"Delfzijl. Verder gaat het spoor niet. Daar is de zee. Die heeft geen perron.":"Delfzijl. Verder goat t spoor nait. Doar is de zee. Dij het gain perron.",
"Delfzijl. Weet je nog? Jij zei dat de zee achter de dijk lag.":"Delfzijl. Waist nog? Doe zee dat de zee achter de diek lag.",
"Den Andel. Een kleine kerk op een wierde. Hier zit Geesje. Ze ziet je al.":"Den Andel. N kleine kerk op n wierde. Hier zit Geesje. Zai ziet je al.",
"Dertig jaar fietsen uit de Diepenring. Daarvoor dertig jaar loods op de Eems. Ik wil nog één keer.":"Dartig joar fietsen oet de Diepenring. Daarvoor dartig joar loods op de Eems. Ik wil nog ain keer.",
"Deuren. Aan de perronkant. De andere kant is een sloot.":"Deuren. Aan de perronkant. De aander kaant is n sloot.",
"Deze niet. Deze heeft een handrem.":"Disse nait. Disse het n handrem.",
"Die container viel heel netjes.":"Dij container vol hail netjes.",
"Die douaneboot wil ze zien.":"Dij douaneboot wil ze zain.",
"Die halen we terug. Daar doen we dit voor.":"Dij halen wie terug. Doar doun wie dit veur.",
"Die heb ik daar zelf gegooid. Vanaf de dijk. Van boosheid.":"Dij heb ik doar zulf gegooid. Vanaf de diek. Van boosheid.",
"Die is altijd groter.":"Dij is aaltied grötter.",
"Die is te dichtbij, Tammo.":"Dij is te dichtbij, Tammo.",
"Die ken ik. Ze praat.":"Dij ken ik. Zai proat.",
"Die kist was op slot. Nu niet meer. Ik meld alleen.":"Dij kist was op slot. Nou nait meer. Ik meld aleen.",
"Die komen straks goed uit. Eerst de vrachtwagen.":"Dij komen straks goud oet. Aarst de vrachtwagen.",
"Die muur blijft heel. Er liggen mensen achter die niet tegen lawaai kunnen.":"Dij muur bliedt hail. Der liggen mensen achter dij nait tegen lawaai kinnen.",
"Die muur stond er achthonderd jaar.":"Dij muur stun der achthonderd joar.",
"Die papieren. Gaat u die halen?":"Dij papieren. Gaat u dij halen?",
"Die steen is uit twaalfhonderd. Niet aankomen.":"Dij steen is oet twaalfhonderd. Nait aankomen.",
"Die trekt nog geen kruiwagen van zijn plek.":"Dij trekt nog gain kruiwagen van zijn plek.",
"Die vijf leven niet allemaal meer. Dan vraag je het de kleinkinderen. Schuld erft.":"Dij vief leven nait allemoal meer. Dan vroag je t de kleinkinderen. Schuld erft.",
"Die wiek draait sneller dan ik dacht.":"Dij wiek draait sneller as ik docht.",
"Die wist de weg.":"Dij wus de vot.",
"Die wist het al die tijd.":"Dij wus t al dij tied.",
"Die zender zat er sinds de Kop in. Henk heeft ons al die tijd kunnen volgen.":"Dij zender zat der zied de Kop in. Henk het ons al dij tied kinnen volgen.",
"Die zie ik niet. Daar heb ik mensen voor. Ze varen hier vandaag ook.":"Dij zai ik nait. Doar heb ik mensen veur. Zai vaaren hier vandoage ook.",
"Die zie ik ook.":"Dij zai ik ook.",
"Die zijn van hem.":"Dij zijn van hom.",
"Die zijn we kwijt.":"Dij zijn wie kwiet.",
"Die zoekt tenminste werk voor me.":"Dij zoekt tenminste wark veur mie.",
"Dienst erop. Morgen vroeg weer. De eerste trein wacht op niemand.":"Dienst derop. Mörn vroeg weer. De aarste trein wacht op niemand.",
"Dit is de A7.":"Dit is de A7.",
"Dit is geen circuit. Het is een rotonde. Ga naar huis.":"Dit is gain circuit. 't is n rotonde. Ga noar hoes.",
"Dit is Groningen. De grens is twintig kilometer verderop.":"Dit is Groningen. De grens is twintig kilometer verderop.",
"Drie enveloppen. Drie juryleden.":"Drij enveloppen. Drij juryleden.",
"Drie juryleden. Drie enveloppen. En de duif heeft het allemaal.":"Drij juryleden. Drij enveloppen. En de duuf het t allemoal.",
"Drie keer schutten voor middernacht. Daarna gaat alles dicht.":"Drij keer schutten veur middernacht. Doarnoa goat aals dicht.",
"Drie trekkers, twee kippers en een man die zwaait. Niet naar ons.":"Drij trekkers, twij kippers en n man dij zwaait. Nait noar ons.",
"Durk? Douwe? Jullie zijn van Jelle.":"Durk? Douwe? Jim binnen van Jelle.",
"Dwars! Helemaal dwars! Hou hem!":"Dwars! Helemaal dwars! Hol hom!",
"Eemshaven. Turbines, kranen, grijze dozen en een vuurtoren die het allemaal belicht. Aan de overkant ligt Duitsland. Het zwaait niet.":"Eemshaven. Turbines, kranen, grijze dozen en n vuurtoren dij t allemoal belicht. Aan de overkant ligt Duitsland. 't zwaait nait.",
"Een andere Aaltje. Deze praat niet. Gelukkig.":"N aander Aaltje. Disse proat nait. Gelukkig.",
"Een beetje.":"N betje.",
"Een bel. Links.":"N bel. Links.",
"Een bot. Gooi maar terug. Hij heeft zijn hele leven nog voor zich. Ik niet. Ik vis verder.":"N bot. Gooi mor terug. Hai het zijn hiele leven nog veur zich. Ik nait. Ik vis verder.",
"Een combine stuurt als een kerk.":"N combine stuurt as n kerk.",
"Een dans. Ze zei: dan dans je maar met iemand anders. Dat heb ik nooit gedaan.":"N dans. Zai zee: dan dans je mor mit iemand aans. Dat heb ik nooit doan.",
"Een envelop, Eppo. En volgend jaar alle machines van het Westerkwartier erbij.":"N envelop, Eppo. En volgend joar aal machines van t Westerkwartier erbij.",
"Eén eraf. Schommelt. Rustig, rustig.":"Ain eraf. Schommelt. Rustig, rustig.",
"Een Fjord Frituur. In elk dorp. Niet nu. Later.":"N Fjord Frituur. In elk dörp. Nait nou. Later.",
"Een haag beweegt niet, zei ik.":"N haag beweegt nait, zee ik.",
"Een hoefijzer.":"N hoefijzer.",
"Een Hogelander eierbal. Van kerkland.":"N Hogelander eierbal. Van kerkland.",
"Eén in Stad, één in Warffum. Dat is het begin.":"Ain in Stad, ain in Warffum. Dat is t begin.",
"Een jaar?":"N joar?",
"Eén keer is genoeg. Dan is het waar.":"Ain keer is genoeg. Dan is t woar.",
"Een kip op de brug in Kantens. Ze had gelijk.":"N kip op de brug in Kantens. Zai har gelieke.",
"Een kroonkurk.":"N kroonkurk.",
"Een luik in een pui. Dat is hoe het bij ons ook begon.":"N luik in n pui. Dat is hoe t bie ons ook begon.",
"Een man met eenenveertig snackbars. En geen één goeie.":"N man mit eenenveertig snackbars. En gain ain goeie.",
"Een netwerk, Tammo.":"N netwerk, Tammo.",
"Een Oldenhuis.":"N Oldenhuis.",
"Een paar weken, zeiden ze. Het waren er een paar. Voor het eerst klopte het.":"N peer weken, zeden ze. 't waren der n peer. Veur t aarst klopte t.",
"Een pakket voor Godlinze? Dat is voor mij. Ik heb het niet besteld. Ik neem het wel.":"N pakket veur Godlinze? Dat is veur mie. Ik heb t nait besteld. Ik nuim t wel.",
"Een schip draait pas als je het al vergeten bent. Vooruitdenken.":"N schip draait pas as je t al vergeten bist. Vooruitdenken.",
"Een sleutel is het begin van een schat. Dat staat in elk boek.":"N sleutel is t begin van n schat. Dat stait in elk boek.",
"Een tank. Er zwemt iets in. Paling. Levend.":"N tank. Der zwemt wat in. Paling. Levend.",
"Een uur lang.":"N uur lang.",
"Een uur. Hij is grondig. Ik meld alleen.":"N uur. Hai is grondig. Ik meld aleen.",
"Eén van zeven. Ik heb er eenenveertig.":"Ain van zeuven. Ik heb der eenenveertig.",
"Eén voorronde. En de Vismarkt terug. Dat was het plan.":"Ain voorronde. En de Vismark terug. Dat was t plan.",
"Eén voorronde. Nog zes. En dan in elk dorp een kraam.":"Ain voorronde. Nog zes. En dan in elk dörp n kraam.",
"Een vrachtwagen.":"N vrachtwagen.",
"Een wat?":"N wat?",
"Een wieldop. Van een Fjord. Die is van mij.":"N wieldop. Van n Fjord. Dij is van mie.",
"Een woonschip. Dan heb jij eindelijk een huis dat ook weg kan rijden.":"N woonschip. Dan hest doe aindelk n hoes dat ook vot kin rieden.",
"Eerder in GDE. Twee Stadjers, één gouden eierbal, en een Fries die hem wilde winnen voor zijn moeder.":"Eerder in GDE. Twij Stadjers, ain gouden eierbal, en n Fries dij hom wol winnen veur zijn moeke.",
"Eerste college om negen uur in Stad. Ik woon in Uithuizermeeden. Ik heb er spijt van. Van het college.":"Aarste college om negen uur in Stad. Ik woon in Uithuizermeeden. Ik heb der spijt van. Van t college.",
"Eerste lading in het vet. Zestig tellen.":"Aarste lading in t vet. Zestig tellen.",
"Eigenaar onbekend, stond er. Zo onbekend is hij niet.":"Eigenaar onbekend, stun der. Zo onbekend is hai nait.",
"Eindelijk één dorp zonder kraam.":"Aindelk ain dörp zonder kraam.",
"Elf minuten. Terug naar Farmsum.":"Elf menuten. Terug noar Farmsum.",
"En als het allebei is?":"En as t allebei is?",
"En als het piept?":"En as t piept?",
"En de nacht was van mij.":"En de nacht was van mie.",
"En de servetten.":"En de servetten.",
"En de Vismarkt.":"En de Vismark.",
"En die muur?":"En dij muur?",
"En een golf.":"En n golf.",
"En het luik in de pui? Een Fjord Frituur in Warffum.":"En t luik in de pui? N Fjord Frituur in Warffum.",
"En hij staat goed.":"En hai stait goud.",
"En jij was er tien minuten.":"En doe was der tien menuten.",
"En jullie zijn die frietwagen. Ubbo zei al dat jullie zouden komen.":"En jim binnen dij frietwagen. Ubbo zee al dat jim zouden komen.",
"En nu een Stadjer! Op de trekker van Jakob, bouwjaar onbekend!":"En nou n Stadjer! Op de trekker van Jakob, bouwjaar onbekend!",
"En nu?":"En nou?",
"En sinds vanochtend ook de Vismarkt.":"En zied vanochtend ook de Vismark.",
"En toen?":"En toen?",
"En u?":"En u?",
"En ze heeft het nooit gezegd.":"En ze het t nooit gezegd.",
"En?":"En?",
"Eppo maait Geesjes kerkland. Jakob heeft een tweede combine in de schuur. Hij is oud, zegt Jakob. De combine ook.":"Eppo maait Geesjes kerkland. Jakob het n tweede combine in de schuur. Hai is old, zegt Jakob. De combine ook.",
"Eppo trok verder, maar jij bleef langer op de baan staan. Het publiek koos jou. Dat telt hier.":"Eppo trok verder, mor doe bleef langer op de baan stoan. 't publiek koos die. Dat telt hier.",
"Eppo zei \"ow\". Ik heb het opgenomen.":"Eppo zee \"ow\". Ik heb t opgenomen.",
"Er komt een bui. Twintig balen naar het erf. Rond is makkelijk rollen, maar niet makkelijk stoppen.":"Der komt n bui. Twintig balen noar t erf. Rond is makkelijk rollen, mor nait makkelijk stoppen.",
"Er komt storm. Dan kijkt niemand.":"Der komt storm. Dan kiekt niemand.",
"Er ligt nog een varken. Denk ik. Of een fiets.":"Der ligt nog n varken. Denk ik. Of n fiets.",
"Er loopt iemand met een zaklamp.":"Der lopt iemand mit n zaklamp.",
"Er rijdt een ding over me heen. Op poten.":"Der riedt n ding over mie hen. Op poten.",
"Er rukt iets. Dat ben jij.":"Der rukt wat. Dat bist doe.",
"Er staan vier gaatjes in.":"Der stoan vaar gaatjes in.",
"Er staat een fabrieksnummer op.":"Der stait n fabrieksnummer op.",
"Er staat een kraam op.":"Der stait n kraam op.",
"Er staat een machine op die mest in de grond spuit. In mijn grond. Ik meld alleen.":"Der stait n machine op dij mest in de grond spuit. In mien grond. Ik meld aleen.",
"Er staat iemand bij mijn luik die geen eierbal wil. Ik meld alleen.":"Der stait iemand bie mien luik dij gain eierbal wil. Ik meld aleen.",
"Er stond een rode school.":"Der stun n rode school.",
"Er stond een rode school. Dat klopt zelfs.":"Der stun n rode school. Dat klopt zulfs.",
"Er was al een Ommelander Ronde? In 1953?":"Der was al n Ommelander Ronde? In 1953?",
"Er zat drie meter tussen.":"Der zat drij meter tussen.",
"Er zat een gracht om.":"Der zat n gracht om.",
"Er zijn hier geen bergen.":"Der zijn hier gain bergen.",
"Even?":"Eefkes?",
"Filiaal één: Warffum. Op vrijdag, na de bingo. Het bed kraakt.":"Filiaal ain: Warffum. Op vrijdag, noa de bingo. 't bed kraakt.",
"Filiaal twee: de zeesluis. Lammert bakt alleen als er geen schip komt. Er komt bijna nooit een schip.":"Filiaal twij: de zeesluis. Lammert bakt aleen as der gain schip komt. Der komt bieno nooit n schip.",
"Full pull! Hij is over de streep! Dat hebben we hier in geen jaren gezien. Vorig jaar wel. Maar daarvoor niet.":"Full pull! Hai is over de streep! Dat hebben wie hier in gain joaren zain. Vorig joar wel. Mor daarvoor nait.",
"Ga maar zitten. Niet aan de rode knop. De rest mag, als ik het zeg.":"Ga mor zitten. Nait aan de rode knop. De rest mag, as ik t zeg.",
"Garmerwolde. Een kerk zonder schip, alleen het koor staat er nog. De rest is weg. Het koor zingt toch.":"Garmerwolde. N kerk zonder schip, aleen t koor stait der nog. De rest is vot. 't koor zingt toch.",
"Gas geven tot hij niet meer wil. En dan nog een beetje.":"Gas geven tot hai nait meer wil. En dan nog n betje.",
"Gat in de weg. Zeven eieren.":"Gat in de vot. Zeven aaien.",
"Geel. Remmen. Nu, niet straks.":"Geel. Remmen. Nou, nait straks.",
"Geen beller vanavond. In Uithuizen is een tuinfeest in een borg. Ik ben niet uitgenodigd. Ik zeg niks. Ik draai iets met strijkers.":"Gain beller vanoavend. In Uithuizen is n tuinfeest in n borg. Ik bin nait uitgenodigd. Ik zeg niks. Ik draai wat mit strijkers.",
"Geen goud.":"Gain goud.",
"Geen goud. Brons. Er staat iets op.":"Gain goud. Brons. Der stait wat op.",
"Geesje heeft de stenen al geteld.":"Geesje het de stenen al teld.",
"Geesje verkoopt niet. Dus maai ik het. Per ongeluk.":"Geesje verkoopt nait. Dus maai ik t. Per ongeluk.",
"Geesje zat naast me in de klas. Lammert danste met me. Op het feest, na de prijs. Hij schoof.":"Geesje zat noast mie in de klas. Lammert danste mit mie. Op t feest, noa de prijs. Hai schoof.",
"Geesje zegt: de Hogelander eierbal met kerkland-paneermeel. Ze heeft het recept al opgeschreven. Op de achterkant van een liedblad.":"Geesje zegt: de Hogelander eierbal mit kerkland-paneermeel. Zai het t recept al opgeschreven. Op de achterkaant van n liedblad.",
"Geesje, Den Andel. Lammert, Delfzijl. En vijf namen met alleen een dorp erbij.":"Geesje, Den Andel. Lammert, Delfzijl. En vief nammen mit aleen n dörp erbij.",
"Geesje! Per ongeluk! Ik dacht dat het van Ubbo was!":"Geesje! Per ongeluk! Ik docht dat t van Ubbo was!",
"Geesje. Dat pad is van de gemeente.":"Geesje. Dat pad is van de gemeente.",
"Geesje. Wat ben je oma schuldig?":"Geesje. Wat bin je oma schuldig?",
"Geesjes neef Jakob heeft een café in Warffum. Achter het café staat een oude trekker. Die mogen we lenen.":"Geesjes neef Jakob het n café in Warffum. Achter t café stait n olle trekker. Dij mogen wie lenen.",
"Genoeg om niks te zeggen, Ruurd. Dat kun jij goed.":"Genoeg om niks te zeggen, Ruurd. Dat kinst doe goud.",
"Gesponsord, Rikus. Ubbo Oldenhuis, Oldenhuis Bakt. Eenenveertig snackbars, van Lauwersoog tot Bourtange.":"Gesponsord, Rikus. Ubbo Oldenhuis, Oldenhuis Bakt. Eenenveertig snackbars, van Lauwersoog tot Bourtange.",
"Gezien. Door de cloud.":"Gezien. Deur de cloud.",
"Golf! Gas eraf!":"Golf! Gas eraf!",
"Goud. De reizigers merkten niet eens dat jij reed.":"Goud. De reizigers merkten nait ains dat doe reed.",
"Graag.":"Graag.",
"Gronings.":"Gronings.",
"Haar wekker.":"Heur wekker.",
"Handrem. Erop. Hij staat.":"Handrem. Erop. Hai stait.",
"Havendag. Iedereen mag aan boord. Vroeger moest je daar loods voor zijn.":"Havendag. Iedereen mag aan boord. Vroeger mos je doar loods veur zijn.",
"Heb je hem?":"Heb je hom?",
"Hebben jullie een koe gezien? Zwart-wit. Ze heet Aaltje.":"Hebben jim n kou zain? Zwart-wit. Zai hait Aaltje.",
"Henk vraagt niet waarom. Hij kijkt ook niet.":"Henk vraagt nait woarom. Hai kiekt ook nait.",
"Henks zender rijdt over de dijkweg naar Delfzijl. Siebrand haalt zijn container weg, nu het stormt en niemand kijkt. Ik zie hem bij Bierum.":"Henks zender riedt over de dijkweg noar Delfzijl. Siebrand haalt zijn container vot, nou t stormt en niemand kiekt. Ik zai hom bie Bierum.",
"Het blijft staan.":"'t bliedt stoan.",
"Het duurde veertig jaar. Toen was het genoeg.":"'t duurde veertig joar. Toen was t genoeg.",
"Het graan is binnen. Nu de mensen nog. Bier staat klaar.":"'t graan is binnen. Nou de mensen nog. Bier stait kloar.",
"Het graan is terug. Gemaaid, maar terug.":"'t graan is terug. Gemaaid, mor terug.",
"Het ijzeren varken. Van mijn opa. Hij liet hem hier zakken. In 1971, bij springtij.":"'t ijzeren varken. Van mien opa. Hai liet hom hier zakken. In 1971, bie springtij.",
"Het is een blad.":"'t is n blad.",
"Het is een huis. Het moet alleen even blijven staan.":"'t is n hoes. 't mout aleen eefkes blieven stoan.",
"Het is een openbare haven.":"'t is n openbare haven.",
"Het is een takelwagen met twee Friezen erin, Tammo. Die rijden nergens hard.":"'t is n takelwagen mit twij Friezen erin, Tammo. Dij rieden nergens hard.",
"Het is goed. Mooi is voor Stad.":"'t is goud. Mooi is veur Stad.",
"Het is Gronings fatsoen. Dat is strenger.":"'t is Gronings fatsoen. Dat is strenger.",
"Het is half september. Nazomer. De terrassen staan nog buiten, en de rij ook.":"'t is half september. Nazomer. De terrassen stoan nog buiten, en de rie ook.",
"Het is kwart over vijf.":"'t is kwart over vief.",
"Het is mooi, Klaas.":"'t is mooi, Klaas.",
"Het is nog donker. Het is nacht met een wekker.":"'t is nog duuster. 't is nacht mit n wekker.",
"Het is ook gewoon lekker.":"'t is ook gewoon lekker.",
"Het rondje in elf minuten. Ik ben weer zestien.":"'t rondje in elf menuten. Ik bin weer zestien.",
"Het staat niet in het reglement wat een wierde is. Ik heb het reglement geschreven.":"'t stait nait in t reglement wat n wierde is. Ik heb t reglement geschreven.",
"Het staat op de kaart. Kerkland. Sinds zestienhonderd.":"'t stait op de kaart. Kerkland. Zied zestienhonderd.",
"Het vet is van Ubbo, de container van Siebrand en de zender van Henk.":"'t vet is van Ubbo, de container van Siebrand en de zender van Henk.",
"Het was een schappelijke prijs!":"'t was n schappelijke prijs!",
"Het water komt. Zie je die slenk vollopen?":"'t woater komt. Zugst dij slenk vollopen?",
"Het wordt elke keer beter.":"'t wordt elke keer beter.",
"Het wordt elke keer harder.":"'t wordt elke keer harder.",
"Het zijn jasknopen, Harm-Jan.":"'t zijn jasknopen, Harm-Jan.",
"Het zijn mijn servetten.":"'t zijn mien servetten.",
"Hier ligt de restauratiewerf. De tjalk is thuis.":"Hier ligt de restauratiewerf. De tjalk is thoes.",
"Hier vis je niet voor de vis. Je vist omdat je hier zit.":"Hier vis je nait veur de vis. Je vist omdat je hier zit.",
"Hier zat ik ooit met opa. Hij zei niks. Ik ook niet. Het was een goede dag.":"Hier zat ik ooit mit opa. Hai zee niks. Ik ook nait. 't was n goie dag.",
"Hier. De sleutel. Hij is ouder dan ik, dus rustig aan.":"Hier. De sleutel. Hai is older as ik, dus rustig aan.",
"Hier. Een zak aardappels. Meer heb ik niet. Ze zijn wel goed.":"Hier. N zak aardappels. Meer heb ik nait. Zai binnen wel goud.",
"Hij bewaart de rest voor de finale.":"Hai bewaart de rest veur de finale.",
"Hij beweegt. Een vrachtwagen. Over de dijk, naar Delfzijl.":"Hai beweegt. N vrachtwagen. Over de diek, noar Delfzijl.",
"Hij doet het niet. Hij heeft het nooit gedaan. Maar vandaag ook niet.":"Hai dut t nait. Hai het t nooit doan. Mor vandoage ook nait.",
"Hij doet niks meer, Harm-Jan.":"Hai dut niks meer, Harm-Jan.",
"Hij duwt. Hij wil naar beneden.":"Hai duwt. Hai wil noar beneden.",
"Hij gaat richting het station. Niet kwijtraken.":"Hai goat richting t station. Nait kwijtraken.",
"Hij had nog hoger gekund.":"Hai har nog hoger gekund.",
"Hij hangt aan iets blauws. Ik meld alleen.":"Hai hangt aan wat blauws. Ik meld aleen.",
"Hij hangt. In de slenk. Met zijn quad op zijn kant.":"Hai hangt. In de slenk. Mit zijn quad op zijn kaant.",
"Hij heeft een punt.":"Hai het n punt.",
"Hij heeft gelijk.":"Hai het gelieke.",
"Hij heeft het over boten.":"Hai het t over boten.",
"Hij heeft onze boot.":"Hai het onze boot.",
"Hij heet Ubbo.":"Hai hait Ubbo.",
"Hij hoeft alleen jouw ego te trekken. Dat is zwaarder.":"Hai hoeft aleen dien ego te trekken. Dat is zwoarder.",
"Hij is achttien meter lang en hij wil rechtdoor.":"Hai is achttien meter lang en hai wil rechtdoor.",
"Hij is binnen. Met het graan.":"Hai is binnen. Mit t graan.",
"Hij is er nog.":"Hai is der nog.",
"Hij is van een Fjord, Tammo. Niet van jou.":"Hai is van n Fjord, Tammo. Nait van die.",
"Hij is wakker.":"Hai is wakker.",
"Hij komt eraan. Achthonderd meter.":"Hai komt eraan. Achthonderd meter.",
"Hij komt! Het varken komt!":"Hai komt! 't varken komt!",
"Hij koopt ze terug.":"Hai koopt ze terug.",
"Hij ligt er ook.":"Hai ligt der ook.",
"Hij maait weer. Ik vroeg of hij een bril nodig had. Hij zei: per ongeluk.":"Hai maait weer. Ik vroeg of hai n bril neudig har. Hai zee: per ongeluk.",
"Hij niesde. Ik niet.":"Hai niesde. Ik nait.",
"Hij niet. Ik wel. Dank je, jong. Zeg tegen Trijntje dat ik niet klaag.":"Hai nait. Ik wel. Dank je, jong. Zeg tegen Trijntje dat ik nait klaag.",
"Hij past. Ik zei het.":"Hai past. Ik zee t.",
"Hij piept weer! Het is vast weer een kroonkurk. Maar stel.":"Hai piept weer! 't is vast weer n kroonkurk. Mor stel.",
"Hij reed door ons. Ik reed gewoon door.":"Hai reed deur ons. Ik reed gewoon deur.",
"Hij reed harder dan ik dacht. Voor een takelwagen.":"Hai reed harder as ik docht. Veur n takelwagen.",
"Hij rent. Laat hem rennen. Hij heeft de stekker niet meer.":"Hai rent. Loat hom rennen. Hai het de stekker nait meer.",
"Hij rijdt! Hij rijdt nog! Hij rijdt nog steeds!":"Hai riedt! Hai riedt nog! Hai riedt nog steeds!",
"Hij staat er wel scheef op.":"Hai stait der wel scheef op.",
"Hij staat. Hij staat stil.":"Hai stait. Hai stait still.",
"Hij stond er net naast.":"Hai stun der net noast.",
"Hij telt snackbars. Wij tellen voorrondes.":"Hai telt snackbars. Wie tellen voorrondes.",
"Hij telt wat hij heeft. Wij wat we winnen.":"Hai telt wat hai het. Wie wat wie winnen.",
"Hij trekt! Hij trekt! Hij trekt nog steeds!":"Hai trekt! Hai trekt! Hai trekt nog steeds!",
"Hij vindt het niks.":"Hai vindt t niks.",
"Hij volgt ons. Een schip van negentig meter achter een bootje van zes. Zo hoort het.":"Hai volgt ons. N schip van negentig meter achter n bootje van zes. Zo heurt t.",
"Hij wacht graag. Het is zijn vak.":"Hai wacht graag. 't is zijn vak.",
"Hij was na zes weken genezen.":"Hai was noa zes weken genezen.",
"Hij was weer thuis. Hij snapt het nog niet. Dank je.":"Hai was weer thoes. Hai snapt t nog nait. Dank je.",
"Hij went wel.":"Hai went wel.",
"Hij wil nergens in. Hij woont hier. Hij snapt het nog minder dan ik.":"Hai wil nergens in. Hai woont hier. Hai snapt t nog minder as ik.",
"Hij zegt dat al vijftig jaar.":"Hai zegt dat al vijftig joar.",
"Hij zei \"meisje\" tegen je.":"Hai zee \"wicht\" tegen je.",
"Hij zei meisje.":"Hai zee wicht.",
"Hij zei meisje. Daarna heb je hem vijf keer geraakt.":"Hai zee wicht. Doarnoa heb je hom vief keer raakt.",
"Hij zingt. Dat is anders.":"Hai zingt. Dat is aans.",
"Hij zit in het riet. Hij is boos op het riet.":"Hai zit in t riet. Hai is boos op t riet.",
"Hij zit vast! De douaneboot zit op het zand!":"Hai zit vast! De douaneboot zit op t zand!",
"Hoe lang?":"Hoe lang?",
"Hoe oud ben jij?":"Hoe old bist doe?",
"Hoe remt een Stadjer?":"Hoe remt n Stadjer?",
"Hoe voelt dat, Jelle?":"Hoe voelt dat, Jelle?",
"Hoe was het?":"Hoe was t?",
"Hoe weet u dat?":"Hoe wait u dat?",
"Hoelang al?":"Hoelang al?",
"Hoeveel?":"Hoeveul?",
"Honderdtachtig graden. We bakken weer.":"Honderdtachtig groden. Wie bakken weer.",
"Hoor je die hoorn? Daar ligt hij. Een beetje naar stuurboord.":"Hoor je dij hoorn? Doar ligt hai. N betje noar stuurboord.",
"Houd hem maar, jong. Hang hem op in die frietwagen. Dan ziet Ubbo hem.":"Houd hom mor, jong. Hang hom op in dij frietwagen. Dan ziet Ubbo hom.",
"Ieder een gunst. Ik heb ze zeventig jaar bewaard. Ik ben Gronings, ik spaar.":"Ieder n gunst. Ik heb ze zeventig joar bewaard. Ik bin Gronings, ik spaar.",
"Iedereen die hoog zit of bij het water, is familie. Ik meld alleen.":"Iedereen dij hoog zit of bie t woater, is familie. Ik meld aleen.",
"Iedereen heeft altijd meer vet. Behalve wij.":"Iedereen het aaltied meer vet. Behalve wie.",
"Iedereen heeft een rode auto. Rijden.":"Iedereen het n rode auto. Rieden.",
"Iedereen hier doet alles expres.":"Iedereen hier dut aals expres.",
"Ik ben binnen. Schort, dienblad, glimlach. Niemand vraagt wat.":"Ik bin binnen. Schort, dienblad, glimlach. Niemand vraagt wat.",
"Ik ben de buurvrouw. Ik heb gekookt voor twintig. We zijn met twaalf. Dat is hier normaal.":"Ik bin de buurvrouw. Ik heb gekookt veur twintig. Wie binnen mit twaalf. Dat is hier normoal.",
"Ik ben geen sluiswachter. Ik ben gewoon traag.":"Ik bin gain sluiswachter. Ik bin gewoon traag.",
"Ik ben grondig.":"Ik bin grondig.",
"Ik ben hier niet.":"Ik bin hier nait.",
"Ik ben sluiswachter. Ik wacht.":"Ik bin sluiswachter. Ik wacht.",
"Ik ben sluiswachter. Wachten kan ik.":"Ik bin sluiswachter. Wachten kin ik.",
"Ik ben van de friet.":"Ik bin van de friet.",
"Ik bewaar wat. Voor de finale.":"Ik bewaar wat. Veur de finale.",
"Ik dacht dat het een gratis rit was.":"Ik docht dat t n gratis rit was.",
"Ik deed ze op tijd dicht. Dat is mijn werk. Zijn neus is zijn werk.":"Ik deed ze op tied dicht. Dat is mien wark. Zien neus is zijn wark.",
"Ik doe de trekker. Hard gaat hij toch niet.":"Ik doe de trekker. Hard goat hai toch nait.",
"Ik doe de tuin. Hagen geven nooit commentaar.":"Ik doe de tuin. Hagen geven nooit commentaar.",
"Ik doe het voor zeven.":"Ik doe t veur zeuven.",
"Ik ga elke dinsdag naar mijn zus in Winsum. Ze weet het niet. Het is een verrassing.":"Ik goa elke dinsdag noar mien zus in Winsum. Zai wait t nait. 't is n verrassing.",
"Ik ga maar tot de volgende halte. Lopen is ook zo ver.":"Ik goa mor tot de volgende halte. Lopen is ook zo ver.",
"Ik ga wel kijken. Ik ben de enige die niet zeeziek wordt van een woonschip.":"Ik goa wel kieken. Ik bin de enige dij nait zeeziek wordt van n woonschip.",
"Ik ga wel. In het donker ben ik niet te zien. Op een pet na.":"Ik goa wel. In t duuster bin ik nait te zain. Op n pet noa.",
"Ik geloof het als ik het zie. Dat is niet boos. Dat is Gronings.":"Ik geloof t as ik t zai. Dat is nait boos. Dat is Gronings.",
"Ik graaf niet.":"Ik graaf nait.",
"Ik graaf niet. Ik piep.":"Ik graaf nait. Ik piep.",
"Ik haal de eieren. Remmen voor eieren, daar ben ik bekend om.":"Ik haal de aaien. Remmen veur aaien, doar bin ik bekend om.",
"Ik had er een toen ik zestien was. Hij reed vijfenveertig. Bergaf.":"Ik har der n toen ik zestien was. Hai reed vijfenveertig. Bergaf.",
"Ik had hem. Bij Uitwierde had ik hem.":"Ik har hom. Bie Uitwierde har ik hom.",
"Ik heb de tafels gebracht. En weer opgehaald. En weer gebracht. Ze wist niet waar ze moesten.":"Ik heb de tafels gebracht. En weer opgehaald. En weer gebracht. Zai wus nait woar ze moesten.",
"Ik heb een schroefje. En een kauwgom van in de Kop.":"Ik heb n schroefje. En n kauwgom van in de Kop.",
"Ik heb er één geproefd. Voor het onderzoek.":"Ik heb der ain geproefd. Veur t onderzoek.",
"Ik heb er zes verkocht. Er kwam geen schip. Goede dag.":"Ik heb der zes verkocht. Der kwam gain schip. Goede dag.",
"Ik heb gebukt.":"Ik heb gebukt.",
"Ik heb hem leren varen. Hij was een goeie leerling. Te goed.":"Ik heb hom leren vaaren. Hai was n goeie leerling. Te goud.",
"Ik heb het gemeten. Erachteraan.":"Ik heb t gemeten. Erachteraan.",
"Ik heb jullie plek bewaakt.":"Ik heb jim plek bewaakt.",
"Ik heb jullie plek bewaakt. Niet de kraam.":"Ik heb jim plek bewaakt. Nait de kraam.",
"Ik heb mensen die mij nog wat schuldig zijn. Van 1953. Dat is beter.":"Ik heb mensen dij mie nog wat schuldig zijn. Van 1953. Dat is beter.",
"Ik heb nog een keer gekeken. Alleen kroonkurken. Ik ben blij.":"Ik heb nog n keer gekeken. Aleen kroonkurken. Ik bin bliede.",
"Ik heb nu genoeg karakter. Voor twee.":"Ik heb nou genoeg karakter. Veur twij.",
"Ik heb soep bij me. Voor mijn moeder. Rustig remmen, hè.":"Ik heb soep bie mie. Veur mien moeke. Rustig remmen, hè.",
"Ik heb ze al. Uit een legbatterij bij Veendam. Dat is ook streek.":"Ik heb ze al. Oet n legbatterij bie Veendam. Dat is ook streek.",
"Ik hoorde het.":"Ik heurde t.",
"Ik hou ze vast met mijn gedachten.":"Ik hol ze vast mit mien gedachten.",
"Ik kijk wel. Van de grond. Daar is hij het mooist.":"Ik kiek wel. Van de grond. Doar is hai t mooist.",
"Ik kom altijd ergens aan. Alleen niet op tijd.":"Ik kom aaltied ergens aan. Aleen nait op tied.",
"Ik koop de kaartjes. Jij vergeet altijd retour.":"Ik koop de kaartjes. Doe vergeet aaltied retour.",
"Ik krijg net door: de voorzitter is met de waterpolitie mee. Volgens het reglement jureert nu de oudste op de brug.":"Ik krieg net deur: de voorzitter is mit de waterpolitie mit. Volgens t reglement jureert nou de oudste op de brug.",
"Ik leg mijn telefoon hier even neer. Niet op letten.":"Ik leg mien telefoon hier eefkes neer. Nait op letten.",
"Ik meld alleen. Ik beveel niks. De sluis is dicht. Volgende schutting morgen om zes.":"Ik meld aleen. Ik beveel niks. De sluis is dicht. Volgende schutting mörn om zes.",
"Ik meld alleen. Maar dit meld ik graag.":"Ik meld aleen. Mor dit meld ik graag.",
"Ik ook.":"Ik ook.",
"Ik overweeg niks. Ik tel.":"Ik overweeg niks. Ik tel.",
"Ik pak de boot. Jij bakt. Jij bakt beter als ik niet kijk.":"Ik pak de boot. Doe bakt. Doe bakt beter as ik nait kiek.",
"Ik regel het filiaal. Jij mag het bed testen.":"Ik regel t filiaal. Doe mag t bed testen.",
"Ik rij altijd rustig.":"Ik rie aaltied rustig.",
"Ik rij. Een combine is ook maar een auto met een maaibord ervoor.":"Ik rie. N combine is ook mor n auto mit n maaibord ervoor.",
"Ik rij. Jij kijkt naar de stip.":"Ik rie. Doe kiekt noar de stip.",
"Ik rij. Jij staart toch alleen maar naar je auto.":"Ik rie. Doe staart toch aleen mor noar je auto.",
"Ik schoof. In 1953. Eén keer. Ze trapte op mijn voet en zei sorry. Daarna heeft ze nooit meer sorry gezegd.":"Ik schoof. In 1953. Ain keer. Zai trapte op mien voet en zee sorry. Doarnoa het ze nooit meer sorry gezegd.",
"Ik stond eerst.":"Ik stun aarst.",
"Ik til een container. Mijn moeder mag dit nooit weten.":"Ik til n container. Mien moeke mag dit nooit weten.",
"Ik trek. Op een trekker kan niemand zien dat ik zenuwachtig ben.":"Ik trek. Op n trekker kin niemand zain dat ik zenuwachtig bin.",
"Ik vaar. Jij kijkt door de verrekijker en zegt wat je ziet.":"Ik vaar. Doe kiekt deur de verrekijker en zegt wat je ziet.",
"Ik vraag niet waarom. Schroefje los, onder het dashboard.":"Ik vroag nait woarom. Schroefje los, onder t dashboard.",
"Ik weet het.":"Ik wait t.",
"Ik weet het. Jij piept.":"Ik wait t. Doe piept.",
"Ik weet wat een berm is.":"Ik wait wat n berm is.",
"Ik wil daar niks over weten.":"Ik wil doar niks over weten.",
"Ik wil zien waar ik later moet. Mijn as. Bij de dijk van Termunten.":"Ik wil zain woar ik later mout. Mien as. Bie de diek van Termunten.",
"Ik wilde het alleen even zien.":"Ik wol t aleen eefkes zain.",
"Ik woon in een flat.":"Ik woon in n flat.",
"Ik zal het zeggen.":"Ik zal t zeggen.",
"Ik zeg er niks van. Ik meld alleen.":"Ik zeg der niks van. Ik meld aleen.",
"Ik zeg niks.":"Ik zeg niks.",
"Ik zei niks terug.":"Ik zee niks terug.",
"Ik zie de Wolkenhal vier keer.":"Ik zai de Wolkenhal vaar keer.",
"Ik zie een koe.":"Ik zai n kou.",
"Ik zie hem. Een knecht van Eppo. Met de kabel in zijn hand.":"Ik zai hom. N knecht van Eppo. Mit de kabel in zijn hand.",
"Ik zie hem. Twee lampen en een container.":"Ik zai hom. Twij lampen en n container.",
"Ik zie het. In mijn hoofd. Met een terras.":"Ik zai t. In mien hoofd. Mit n terras.",
"Ik zie mijn eigen schaduw over het graan gaan.":"Ik zai mien aigen schaduw over t graan goan.",
"Ik zit in de jury.":"Ik zit in de jury.",
"Ik zit in een haag.":"Ik zit in n haag.",
"Ik, Rikus. Streekproducten. Daar houden mensen van.":"Ik, Rikus. Streekproducten. Doar hollen mensen van.",
"In 1953 had ik mijn arm gebroken. Trijntje droeg mijn tas. Van school naar huis. Een jaar lang.":"In 1953 har ik mien arm gebroken. Trijntje droeg mien tas. Van school noar hoes. N joar lang.",
"In de gang. Waar je hem ziet als je weggaat. En als je terugkomt.":"In de gang. Woar je hom ziet as je weggaat. En as je terugkomt.",
"In Delfzijl is wifi op het perron. Daarom stap ik hier uit. Ik woon in Appingedam.":"In Delfzijl is wifi op t perron. Doarom stap ik hier oet. Ik woon in Appingedam.",
"In een hangende keuken.":"In n hangende keuken.",
"In welk boek?":"In welk boek?",
"Is dit de trein naar de zee? Het lijkt allemaal op land.":"Is dit de trein noar de zee? 't likt allemoal op land.",
"Is het erg? Dat ik meer wil?":"Is t erg? Dat ik meer wil?",
"Ja.":"Ja.",
"Jakob zegt: de kamer boven het café is van ons, zolang we willen. En hij heeft een luik in zijn pui.":"Jakob zegt: de kamer boven t café is van ons, zolang wie willen. En hai het n luik in zijn pui.",
"Je bent nat.":"Je bist nat.",
"Je had een golf. Dat is anders.":"Je har n golf. Dat is aans.",
"Je hebt de borg van achteren gezien. En van onderen.":"Doe hest de borg van achteren zain. En van onderen.",
"Je hebt het water nog niet eens gezien.":"Doe hest t woater nog nait ains zain.",
"Je mag op een wierde niet graven. Het zijn monumenten.":"Je mag op n wierde nait graven. 't zijn monumenten.",
"Je mag voorin, zegt de machinist. Als je nergens aankomt.":"Je mag voorin, zegt de machinist. As je nergens aankomt.",
"Je overweegt het.":"Je overweegt t.",
"Je reed door een golf.":"Je reed deur n golf.",
"Je remde voor een kip en niet voor het gat erna.":"Je remde veur n kip en nait veur t gat erna.",
"Je rijdt als iemand van zestien. Dat klopt.":"Je riedt as iemand van zestien. Dat klopt.",
"Je spuit de wierde. Daar groeit al achthonderd jaar niks nieuws. Zo laten.":"Je spuit de wierde. Doar groeit al achthonderd joar niks nieuws. Zo loaten.",
"Je staat op de toren van Middelstum. Zie je Den Andel? Daar sta ik. Zwaai maar. Ik zie het.":"Je stait op de toren van Middelstum. Zugst Den Andel? Doar stoa ik. Zwaai mor. Ik zai t.",
"Je staat op molen Adam. Je ziet mijn sluis. Ik zie jou. Ik meld alleen.":"Je stait op molen Adam. Je ziet mien sluis. Ik zai die. Ik meld aleen.",
"Je wilt er een filiaal.":"Je wilt der n filiaal.",
"Je wilt hem eruit.":"Je wilt hom eruit.",
"Je zegt het alsof hij het expres doet.":"Je zegt t alsof hai t expres dut.",
"Jij bent de nieuwe? Lijn naar Uithuizen. De dijk is het mooiste stuk. En het winderigste.":"Doe bist de nije? Lien noar Uithuizen. De diek is t mooiste stuk. En t winderigste.",
"Jij bent niet van de catering.":"Doe bist nait van de catering.",
"Jij bent van Trijntje. Je loopt net als zij. Snel, en de verkeerde kant op.":"Doe bist van Trijntje. Je lopt net as zij. Snel, en de verkeerde kaant op.",
"Jij hebt nooit vrienden, oma.":"Doe hest nooit vrunden, oma.",
"Jij kunt verkopen. Dat zie ik aan hoe je dat blad draagt.":"Doe kunt verkopen. Dat zai ik aan hoe je dat blad draagt.",
"Jij wachtte twaalf jaar.":"Doe wachtte twaalf joar.",
"Jouw kraam is groter.":"Dien kraam is grötter.",
"Juist die. Dan is het eerlijk.":"Juist dij. Dan is t eerlk.",
"Jullie bakken. Wat moet je anders met paneermeel?":"Jim bakken. Wat mout je aans mit paneermeel?",
"Jullie hebben geen plek meer. Dat hoorde ik op de radio.":"Jim hebben gain plek meer. Dat heurde ik op de radio.",
"Jullie hebben vrienden nodig. Ik heb er nog zeven.":"Jim hebben vrunden neudig. Ik heb der nog zeuven.",
"Jullie lijken op iemand.":"Jim lijken op iemand.",
"Jullie reden honderdtwintig op een dijk in een storm. Daar hebben we het morgen over. Nu eerst dit.":"Jim reden honderdtwintig op n diek in n storm. Doar hebben wie t mörn over. Nou aarst dit.",
"Jullie rijden te hard. Ik meld alleen.":"Jim rieden te hard. Ik meld aleen.",
"Jullie stappen om kwart voor zeven uit in Warffum. Dat doet niemand.":"Jim stappen om kwart veur zeuven oet in Warffum. Dat dut niemand.",
"Jullie zijn van Trijntje. Kom binnen. Schoenen mogen aan. Het huis is toch even niet van mij.":"Jim binnen van Trijntje. Kom binnen. Schoenen mogen aan. 't hoes is toch eefkes nait van mie.",
"Kaarten zijn oud. Ik ben nieuw.":"Kaarten zijn old. Ik bin nij.",
"Kaartjes, graag. …Geen kaartje?":"Kaartjes, graag. …Gain kaartje?",
"Kaas, vis, en een man die zegt dat hij Vikinggoud verkoopt. Ik koop de kaas.":"Kaas, vis, en n man dij zegt dat hai Vikinggoud verkoopt. Ik koop de kaas.",
"Kantens. Rustig rijden, hè. Op de brug bij de kerk staat altijd een kip.":"Kantens. Rustig rieden, hè. Op de brug bie de kerk stait aaltied n kip.",
"Ketting zit. Trekken.":"Ketting zit. Trekken.",
"Ketting! Hij is gebroken.":"Ketting! Hai is gebroken.",
"Kijk, de toren van Bedum. Hij staat nog steeds scheef. Ik kijk elke keer.":"Kiek, de toren van Bedum. Hai stait nog steeds scheef. Ik kiek elke keer.",
"Kijk. Daar begint het Hogeland.":"Kiek. Doar begint t Hogeland.",
"Klaas? Uit Stad?":"Klaas? Oet Stad?",
"Klaas. Bent u ziek?":"Klaas. Bent u ziek?",
"Klaas. Ik zie je. Ik meld alleen.":"Klaas. Ik zugst. Ik meld aleen.",
"Kleine boot, hier Siebrand Mulder, havenbaas. Jullie zijn in mijn haven.":"Kleine boot, hier Siebrand Mulder, havenbaas. Jim binnen in mien haven.",
"Kniptang. Foto. Zender. En dan weg.":"Kniptang. Foto. Zender. En dan vot.",
"Kom het maar halen, meisje. Met dat oude ding.":"Kom t mor halen, wicht. Mit dat olle ding.",
"Kom maar binnen. Koffie staat. Het huis ook.":"Kom mor binnen. Koffie stait. 't hoes ook.",
"Kom maar.":"Kom mor.",
"Kon minder, jong. Kom. Ik heb honger. Dood ga ik later wel.":"Kon minder, jong. Kom. Ik heb honger. Dood goa ik later wel.",
"Kon minder.":"Kon minder.",
"Kon minder. Zeg het niet tegen de dienstregeling. Die wordt jaloers.":"Kon minder. Zeg t nait tegen de dienstregeling. Dij wordt jaloers.",
"Konvooi! Berm in, Tammo. Berm, niet sloot.":"Konvooi! Berm in, Tammo. Berm, nait sloot.",
"Koppeling in, schakelen, koppeling los. Als hij hoest, ben jij het. Niet hij.":"Koppeling in, schakelen, koppeling los. As hai hoest, bist doe t. Nait hai.",
"Kosteres. Den Andel. Ik zie alles vanaf mijn toren. Ik meld alleen.":"Kosteres. Den Andel. Ik zai aals vanof mien toren. Ik meld aleen.",
"Kratten. Sigaretten. Heel veel sigaretten.":"Kratten. Sigaretten. Hail veul sigaretten.",
"Krewerd. Een klein dorp met een grote kerk en een orgel waar mensen voor van ver komen. Ze komen, luisteren, en gaan weer.":"Krewerd. N klain dörp mit n grode kerk en n orgel woar mensen veur van ver komen. Zai komen, luusteren, en goan weer.",
"Laat hem duwen. Ik ben zwaarder dan ik eruitzie.":"Loat hom duwen. Ik bin zwoarder as ik eruitzie.",
"Laat hem maar. Ik ben breder.":"Loat hom mor. Ik bin breder.",
"Laat mij maar. Mijn oma, mijn wekker.":"Loat mie mor. Mien oma, mien wekker.",
"Lammert heeft drie containernummers uit zijn logboek. Siebrand zet het vet door naar Eemshaven. We zien elkaar bij de vuurtoren.":"Lammert het drij containernummers oet zijn logboek. Siebrand zet t vet deur noar Eemshaven. Wie zain mekoar bie de vuurtoren.",
"Lammert heeft een sleutel voor ons. Van een woonschip in de haven. En hij wil een luik in zijn huisje.":"Lammert het n sleutel veur ons. Van n woonschip in de haven. En hai wil n luik in zijn huisje.",
"Lammert schoof met je oma.":"Lammert schoof mit je oma.",
"Lammert stuurde een sms. \"Ik zit bij de zeesluis. Elke dag.\" De trein naar Delfzijl gaat elk halfuur.":"Lammert stuurde n sms. \"Ik zit bie de zeesluis. Elke dag.\" De trein noar Delfzijl goat elk halfuur.",
"Lammert zei: kom terug door mijn sluis. Niet: kom terug zonder boot.":"Lammert zee: kom terug deur mien sluis. Nait: kom terug zonder boot.",
"Lammert zit in het huisje bij de zeesluis. Hij zwaaide al. Hij zag ons van ver.":"Lammert zit in t huisje bie de zeesluis. Hai zwaaide al. Hai zag ons van ver.",
"Lammert zit in het sluiswachtershuisje. Hij heeft een bootje, en een verrekijker. Hij wil ons iets laten zien.":"Lammert zit in t sluiswachtershuisje. Hai het n bootje, en n verrekijker. Hai wil ons wat loaten zain.",
"Lammert, ben jij familie van de torenwachter?":"Lammert, bist doe familie van de torenwachter?",
"Lammert! Deuren open! Dat is een bevel!":"Lammert! Deuren open! Dat is n bevel!",
"Lammert. Je bent nog niet dood.":"Lammert. Je bist nog nait dood.",
"Lammert. Wat bent u oma schuldig?":"Lammert. Wat bist u oma schuldig?",
"Lammerts boot.":"Lammerts boot.",
"Langzaam. Met de voeten op de grond.":"Langzaam. Mit de voeten op de grond.",
"Leens en de borg Verhildersum. Een borg met een tuin waar je stil van wordt. Dat is hier geen compliment, dat is een feit.":"Leens en de borg Verhildersum. N borg mit n tuin woar je still van wordt. Dat is hier gain compliment, dat is n feit.",
"Leuk geprobeerd, Stadjer. Mijn trekker weegt meer dan jouw hele dorp.":"Leuk geprobeerd, Stadjer. Mien trekker weegt meer as dien hiele dörp.",
"Licht! Ze zien ons!":"Licht! Zai zain ons!",
"Links, bij het prieel. Ubbo en een man in een ruitjeshemd.":"Links, bie t prieel. Ubbo en n man in n ruitjeshemd.",
"Lopen, Tammo. Oma zei tien over zes, en oma meent dat.":"Lopen, Tammo. Oma zee tien over zes, en oma meent dat.",
"Loppersum. Een grote kerk, en een klokkenstoel waar je één keer mag luiden. Voor de gezelligheid. Vraag het de koster.":"Loppersum. N grode kerk, en n klokkenstoel woar je ain keer mag luiden. Veur de gezelligheid. Vraag t de koster.",
"Loppersum. Kijk, steigers. Overal.":"Loppersum. Kiek, steigers. Aaloverst.",
"Losbuis eroverheen. Niet bewegen. Acht tellen.":"Losbuis eroverheen. Nait bewegen. Acht tellen.",
"Maar eerst koffie. Kom maar.":"Mor aarst koffie. Kom mor.",
"Mag ik de knopen houden?":"Mag ik de knopen hollen?",
"Mensen uit de streek. Mensen die ik ken.":"Mensen oet de streek. Mensen dij ik ken.",
"Met eenenveertig snackbars tegen je? Dan heb je vrienden nodig. Ik heb er nog zeven.":"Mit eenenveertig snackbars tegen je? Dan heb je vrunden neudig. Ik heb der nog zeuven.",
"Met mijn auto eronder.":"Mit mien auto eronder.",
"Met ons bewijs. En de zender van Henk.":"Mit ons bewijs. En de zender van Henk.",
"Middelstum. Een hoge toren in een laag land. Van bovenaf zie je het hele Hogeland. Het ziet jou ook.":"Middelstum. N hoge toren in n laag land. Van bovenaf zugst t hiele Hogeland. 't ziet die ook.",
"Middernacht. Je kunt erop wachten.":"Middernacht. Je kunt derop wachten.",
"Mijn broer. Hij heeft het nooit opgedronken. Hij werd zeeziek van de gedachte.":"Mien broer. Hai het t nooit opgedronken. Hai werd zeeziek van de gedachte.",
"Mijn kleinzoon vaart rondjes bij Zuidhorn. Ook een Lammert. Wij doen niet aan nieuwe namen.":"Mien kleinzoon vaart rondjes bie Zuidhorn. Ook n Lammert. Wie doun nait aan nije nammen.",
"Mijn luik! Het luik staat open!":"Mien luik! 't luik stait open!",
"Mijn oma. En Trijntje. Negentienhonderddrieënvijftig. Ze fietsten naar Stad, voor de prijs.":"Mien oma. En Trijntje. Negentienhonderddrieënvijftig. Zai fietsten noar Stad, veur de prijs.",
"Mijn papieren liggen thuis. Al vijftien jaar.":"Mien papieren liggen thoes. Al vijftien joar.",
"Mijn papieren zijn weer weg. Ze zijn er nooit.":"Mien papieren zijn weer vot. Zai binnen der nooit.",
"Moi. Daar zijn jullie. Ik hoorde jullie lopen.":"Moi. Doar zijn jim. Ik heurde jim lopen.",
"Moi. Jullie zijn van Trijntje.":"Moi. Jim binnen van Trijntje.",
"Molen Adam, Delfzijl. Een molen op een dijk in een havenstad. Hij maalt niet voor de haven. Hij staat er om naar te kijken.":"Molen Adam, Delfzijl. N molen op n diek in n havenstad. Hai maalt nait veur de haven. Hai stait der om noar te kieken.",
"Mooi weer. Er komt niks aan. Ik meld alleen.":"Mooi weer. Der komt niks aan. Ik meld aleen.",
"Mooi. Dan heeft hij nog niks geproefd.":"Mooi. Dan het hai nog niks geproefd.",
"Morgen is de voorronde in Appingedam.":"Mörn is de voorronde in Appingedam.",
"Morgen. Ik breng hem koffie. Dan is het goed.":"Mörn. Ik breng hom koffie. Dan is t goud.",
"Na zes weken was hij genezen. Ze bleef dragen. Dat doe je dan.":"Noa zes weken was hai genezen. Zai bleef dragen. Dat doe je dan.",
"Naar Delfzijl. Ik ben daar geboren. Ik ben er nooit weggeweest. Ik stond hier alleen even.":"Noar Delfzijl. Ik bin doar geboren. Ik bin der nooit weggeweest. Ik stun hier aleen eefkes.",
"Naar het erf, niet de sloot in. Een baal zwemt niet.":"Noar t erf, nait de sloot in. N baal zwemt nait.",
"Naar Spijk. Het is maar vijf kilometer. Ik zou lopen, maar ik heb een kast.":"Noar Spijk. 't is mor vief kilometer. Ik zol lopen, mor ik heb n kast.",
"Naar Termunten graag. Ik wil de zon zien ondergaan. Niet te snel rijden, dan mis ik hem.":"Noar Termunten graag. Ik wil de zun zain ondergaan. Nait te snel rieden, dan mis ik hom.",
"Naast de pastorie. Netjes. Ik wil niet dat Eppo zegt dat we slordig zijn.":"Naast de pastorie. Netjes. Ik wil nait dat Eppo zegt dat wie slordig zijn.",
"Naast hem. Links. Ik klim erop.":"Naast hom. Links. Ik klim derop.",
"Nachtstreek, op tournee. Ik sta op de kermis in Uithuizen, naast een zweefmolen. De zweefmolen wint.":"Nachtstreek, op tournee. Ik stoa op de kermis in Uithuizen, noast n zweefmolen. De zweefmolen wint.",
"Nachtstreek, op tournee. Ik sta op een brug in Appingedam. Onder mij hangen keukens boven het water. Al eeuwen. Niemand weet waarom ze niet vallen. Ik ook niet.":"Nachtstreek, op tournee. Ik stoa op n brug in Appingedam. Onder mie hangen keukens boven t woater. Al eeuwen. Niemand wait woarom ze nait vallen. Ik ook nait.",
"Nachtstreek, op tournee. Vanavond vanaf een erf in Loppersum. Iemand is thuis. Dit nummer is voor haar.":"Nachtstreek, op tournee. Vanoavend vanof n erf in Loppersum. Iemand is thoes. Dit nummer is veur heur.",
"Nachtstreek, op tournee. Vanavond vanuit de Eemsdelta.":"Nachtstreek, op tournee. Vanoavend vanuit de Eemsdelta.",
"Nachtstreek, op tournee. Vanuit een busje achter het station van Warffum. Eerste beller.":"Nachtstreek, op tournee. Vanuit n busje achter t station van Warffum. Aarste beller.",
"Nachtstreek. Ik heb een beller die zegt dat hij de Snackprijs heeft gekocht.":"Nachtstreek. Ik heb n beller dij zegt dat hai de Snackprijs het kocht.",
"Nachtstreek. Twee voorrondes, twee filialen, één woonschip.":"Nachtstreek. Twij voorrondes, twij filialen, ain woonschip.",
"Natuurlijk heeft ze dat.":"Natuurlijk het ze dat.",
"Natuurlijk.":"Natuurlijk.",
"Nee, nee. Die bel klinkt te dichtbij. Je zit ernaast.":"Nee, nee. Dij bel klinkt te dichtbij. Je zit ernaast.",
"Nee. Baflo is gewoon mooi.":"Nee. Baflo is gewoon mooi.",
"Nee. Ik wil alleen niet minder.":"Nee. Ik wil aleen nait minder.",
"Nee. Ik wilde het alleen even zien. Zolang ik nog zelf kan kijken.":"Nee. Ik wol t aleen eefkes zain. Zolang ik nog zulf kin kieken.",
"Neem de mijne.":"Neem de mijne.",
"Neem mijn bootje. Gaat het mis, kom dan terug door mijn sluis. Ik doe hem voor jullie open. En daarna dicht.":"Neem mien bootje. Gaat t mis, kom dan terug deur mien sluis. Ik doe hom veur jim open. En doarnoa dicht.",
"Net als die app op je telefoon.":"Net as dij app op je telefoon.",
"Netjes. Geesje kijkt. Ze knikt bijna.":"Netjes. Geesje kiekt. Zai knikt bieno.",
"Netjes. Nog twee.":"Netjes. Nog twij.",
"Niemand ingestapt in Westeremden. Dat is normaal. Ze wilden alleen even zwaaien.":"Niemand ingestapt in Westeremden. Dat is normoal. Zai wilden aleen eefkes zwaaien.",
"Niet de keukens raken. Die hangen er al langer dan ik.":"Nait de keukens raken. Dij hangen der al langer as ik.",
"Niet de keukens! Dat is een monument!":"Nait de keukens! Dat is n monument!",
"Niet meer.":"Nait meer.",
"Niet remmen in het water. Rechtdoor.":"Nait remmen in t woater. Rechtdoor.",
"Nieuws voor je luisteraars. De Gouden Eierbal gaat dit jaar naar de winnaar van de Ommelander Ronde. Zeven voorrondes, in zeven regio's. Iedereen mag meedoen.":"Nieuws veur je luisteraars. De Gouden Eierbal goat dit joar noar de winnaar van de Ommelander Ronde. Zeven voorrondes, in zeuven regio's. Iedereen mag meedoen.",
"Nog een doos? Er is altijd nog een doos.":"Nog n doos? Der is aaltied nog n doos.",
"Nog één keer kijken? Het bankje staat er nog. Ik ook.":"Nog ain keer kieken? 't bankje stait der nog. Ik ook.",
"Nog één keer. Tegen de berm. Rustig.":"Nog ain keer. Tegen de berm. Rustig.",
"Nog een paar weken, zeggen ze. Dat zeggen ze al twee jaar. Koffie?":"Nog n peer weken, zeggen ze. Dat zeggen ze al twij joar. Koffie?",
"Nog een ritje? De kat blijft hier. Die heeft het wel gezien.":"Nog n ritje? De kat bliedt hier. Dij het t wel zain.",
"Nog niet. We krijgen hem terug.":"Nog nait. Wie kriegen hom terug.",
"Nu dan.":"Nou dan.",
"Nu draag ik wat terug. Ik weet alleen nog niet wat. Dat weet je dan.":"Nou draag ik wat terug. Ik wait aleen nog nait wat. Dat waist dan.",
"Nu?":"Nou?",
"Nummer drie. De kermisbaas. Hij is zenuwachtig.":"Nummer drij. De kermisbaas. Hai is zenuwachtig.",
"Nummer eindigt op achtendertig. Rood. Onderop.":"Nummer eindigt op achtendertig. Rood. Onderop.",
"Nummer twee. Een man met een slagersschort. Op een feest.":"Nummer twij. N man mit n slagersschort. Op n feest.",
"O. B. Op elk vat.":"O. B. Op elk vat.",
"Of van twee. Twee is ook een mooi getal.":"Of van twij. Twij is ook n mooi getal.",
"Of we gaan naar huis. Dan zijn het er nul.":"Of wie goan noar hoes. Dan zijn t der nul.",
"Oldenhuis Bakt. Klik.":"Oldenhuis Bakt. Klik.",
"Oldenzijl. Tien stuks. Mijn kippen leggen op een wierde. Ze weten niet beter.":"Oldenzijl. Tien stuks. Mien kippen leggen op n wierde. Zai weten nait beter.",
"Om ze aan elkaar te rijgen. Vikingen deden dat.":"Om ze aan mekoar te rijgen. Vikingen deden dat.",
"Oma werd tweede? Ze wint altijd.":"Oma werd tweede? Zai wint aaltied.",
"Oma wil ons zien. Vroeg. Neem een treinkaartje mee, zegt ze. Naar waar, zegt ze niet.":"Oma wil ons zain. Vroeg. Neem n treinkaartje mit, zegt ze. Noar woar, zegt ze nait.",
"Oma.":"Oma.",
"Oma. We hebben een medaille gevonden. In de klei. Met jouw naam.":"Oma. Wie hebben n medaille gevonden. In de klei. Mit dien naam.",
"Omdat het mag. Nee. Omdat het niet mag.":"Omdat t mag. Nee. Omdat t nait mag.",
"Onder de lijn door. Niet erover. Ik heb het één keer erover gedaan. Ik vlieg nu alleen nog op dinsdag.":"Onder de lien deur. Nait erover. Ik heb t ain keer erover doan. Ik vlieg nou aleen nog op dinsdag.",
"Onszelf. Als we kwijt waren.":"Onszelf. As wie kwiet waren.",
"Onze frietwagen.":"Onze frietwagen.",
"Ook containers?":"Ook containers?",
"Ook een frietwagen zonder standplaats?":"Ook n frietwagen zonder standplaats?",
"Ook het kerkland?":"Ook t kerkland?",
"Ook. Hij zat er de hele tijd. We hadden hem kunnen volgen.":"Ook. Hai zat der de hiele tied. Wie hadden hom kinnen volgen.",
"Op de baan: een Stadjer! Laat hem maar komen, dames en heren, hij heeft het zelf gewild!":"Op de baan: n Stadjer! Loat hom mor komen, dames en heren, hai het t zulf gewild!",
"Op de foto. Van boven. Achter de schuur staat een duiventil.":"Op de foto. Van boven. Achter de schuur stait n duiventil.",
"Op de streep, op tijd, en niemand morste koffie. Kon minder.":"Op de streep, op tied, en niemand morste koffie. Kon minder.",
"Op de streep. Goed.":"Op de streep. Goud.",
"Op een woonschip?":"Op n woonschip?",
"Op het dak van een bewaker.":"Op t dak van n bewaker.",
"Op je knieën.":"Op je knieën.",
"Op tijd in Appingedam. De trein was te laat. Dus jij was vroeg. Zo werkt dat hier.":"Op tied in Appingedam. De trein was te loat. Dus doe was vroeg. Zo werkt dat hier.",
"Op tijd is niet vroeg. Op tijd is op tijd.":"Op tied is nait vroeg. Op tied is op tied.",
"Op tijd.":"Op tied.",
"Op vrijdag. Na de bingo.":"Op vrijdag. Noa de bingo.",
"Oud genoeg om te weten dat hij naar links trekt.":"Oud genoeg om te weten dat hai noar links trekt.",
"Over twee uur komt het water! Neem een boterham!":"Over twij uur komt t woater! Neem n boterham!",
"Overweg. Bel, bomen, toeter. In die volgorde.":"Overweg. Bel, bomen, toeter. In dij volgorde.",
"Paneermeel van kerkland. Dat is een verhaal. Dat verkoopt.":"Paneermeel van kerkland. Dat is n verhaal. Dat verkoopt.",
"Paneermeel voor Warffum, vet voor Delfzijl. We bezorgen onze eigen spullen.":"Paneermeel veur Warffum, vet veur Delfzijl. Wie bezorgen onze aigen spullen.",
"Peiling, voor het eerst in Deel vier: groeien of thuis? Groeien: 51 procent. Thuis: 49. Eén luisteraar in Paddepoel heeft twee keer gestemd. Ik zeg niks.":"Peiling, veur t aarst in Deel vaar: groeien of thoes? Groeien: 51 procent. Thuis: 49. Ain luusteraar in Paddepoel het twij keer gestemd. Ik zeg niks.",
"Per ongeluk.":"Per ongeluk.",
"Perceel drie. Begin bij de sloot, eindig bij de boom. Niet bij de buren.":"Perceel drij. Begin bie de sloot, eindig bie de boom. Nait bie de buren.",
"Planner. Je moet om drie uur in Delfzijl zijn. Het is kwart voor drie. Je bent in Uithuizen. Succes.":"Planner. Je mout om drij uur in Delfzijl zijn. 't is kwart veur drij. Je bist in Uithuizen. Succes.",
"Pliesie achter ons. Twee auto's.":"Pliesie achter ons. Twij auto's.",
"Precies.":"Precies.",
"Raak! Kijk dat graan stuiven.":"Raak! Kiek dat graan stuiven.",
"Rechts is de sloot. Ik kies het midden.":"Rechts is de sloot. Ik kies t midden.",
"Reglement, voorronde één: de eierbal is van streekeieren. Vers. Uit vijf wierdedorpen. Wie bedenkt zoiets?":"Reglement, voorronde ain: de eierbal is van streekeieren. Vers. Oet vief wierdedorpen. Wie bedenkt zoiets?",
"Rib van links. In de flank, niet van voren.":"Rib van links. In de flank, nait van voren.",
"Rijbewijs. …En wat zit er in die container?":"Rijbewijs. …En wat zit der in dij container?",
"Rikus. Geesje, kosteres van Den Andel. Zondag is er dienst, en mijn kerkpad staat vol mest.":"Rikus. Geesje, kosteres van Den Andel. Zondag is der dienst, en mien kerkpad stait vol mest.",
"Rikus. Geesje. Eppo's combine maait mijn kerkland. Per ongeluk, zegt hij.":"Rikus. Geesje. Eppo's combine maait mien kerkland. Per ongeluk, zegt hai.",
"Rikus. Henk, Garage Knalpot. Die twee van de frietwagen. Er zit nog een zender in hun bak. Van mij.":"Rikus. Henk, Garage Knalpot. Dij twij van de frietwagen. Der zit nog n zender in hun bak. Van mie.",
"Rikus. Lammert, zeesluis Delfzijl. Er ligt een kustvaarder in de haven die 's nachts lost. Zonder lampen. Ik meld alleen.":"Rikus. Lammert, zeesluis Delfzijl. Der ligt n kustvaarder in de haven dij s nachts lost. Zonder lampen. Ik meld aleen.",
"Rikus. Lammert. Ik doe de sluis dicht vannacht. Wie nu op de dijk rijdt, is gek of heeft haast.":"Rikus. Lammert. Ik doe de sluis dicht vannacht. Wie nou op de diek riedt, is gek of het haast.",
"Rikus. Torenwachter. Er staat een takelwagen op de Vismarkt.":"Rikus. Torenwachter. Der stait n takelwagen op de Vismark.",
"Rikus. Trijntje. Stuur die twee morgenvroeg naar mij. Met een treinkaartje.":"Rikus. Trijntje. Stuur dij twij morgenvroeg noar mie. Mit n treinkaartje.",
"Rikus. Twee van zeven. Mooi begin. Ik zie ze graag in het Westerkwartier.":"Rikus. Twij van zeuven. Mooi begin. Ik zai ze graag in t Westerkwartier.",
"Rikus. Vandaag de voorronde Eemsdelta. Voorzitter van de jury is Siebrand Mulder. Havenbaas. Een man van de streek.":"Rikus. Vandoage de voorronde Eemsdelta. Voorzitter van de jury is Siebrand Mulder. Havenbaas. N man van de streek.",
"Rode boei. Die hoort links. Goed zo.":"Rode boei. Dij heurt links. Goud zo.",
"Roerei.":"Roerei.",
"Rood?":"Rood?",
"Rood. Daar sta je voor stil. Niet ervoor, niet erna. Ervoor.":"Rood. Doar stoa je veur still. Nait ervoor, nait erna. Ervoor.",
"Roodeschool. Eindpunt. Of je moet naar Eemshaven. Dan is het eindpunt daar.":"Roodeschool. Eindpunt. Of je mout noar Eemshaven. Dan is t eindpunt doar.",
"Roodeschool. Hier hield het spoor op. Toen kwam Eemshaven. Nu houdt het daar op.":"Roodeschool. Hier hol t spoor op. Toen kwam Eemshaven. Nou houdt t doar op.",
"Rottum. Tien eieren. Geen rekening. Trijntje heeft al betaald, in 1953.":"Rottum. Tien aaien. Gain rekening. Trijntje het al betoald, in 1953.",
"Rubber op de rotonde. Delfzijl gaat praten.":"Rubber op de rotonde. Delfzijl goat proaten.",
"Rustig rijden. Niet om de spullen. Om mij.":"Rustig rieden. Nait om de spullen. Om mie.",
"Rustig. Even niet toeteren.":"Rustig. Eefkes nait toeteren.",
"Schakel nou! Hij schreeuwt.":"Schakel nou! Hai schreeuwt.",
"Schapen. Stilstaan. Niet toeteren, Tammo, ze worden er alleen maar langzamer van.":"Schapen. Stilstaan. Nait toeteren, Tammo, ze worden der aleen mor langzamer van.",
"Schapen. Ze gaan niet opzij.":"Schapen. Zai goan nait opzied.",
"Schapen. Ze kijken alsof wíj op hun dijk staan.":"Schapen. Zai kieken alsof wíj op hun diek stoan.",
"Schip op de rede. Negentig meter, een kapitein die geen Nederlands spreekt en geen haast heeft. Net als ik.":"Schip op de rede. Negentig meter, n kapitein dij gain Nederlands spreekt en gain haast het. Net as ik.",
"Schoof?":"Schoof?",
"Siebrand haalt het binnen. Oldenhuis bakt het. Ik meld alleen.":"Siebrand haalt t binnen. Oldenhuis bakt t. Ik meld aleen.",
"Siebrand Mulder? Waterpolitie. We hebben een paar vragen over vaten. Met OB erop.":"Siebrand Mulder? Waterpolitie. Wie hebben n peer vragen over vaten. Mit OB derop.",
"Siebrand springt in een boot. In dít weer.":"Siebrand springt in n boot. In dít weer.",
"Siebrand staat op. Hij laat zijn servet liggen.":"Siebrand stait op. Hai loat zijn servet liggen.",
"Siebrand?":"Siebrand?",
"Siebrand. Rechts. Hij duwt.":"Siebrand. Rechts. Hai duwt.",
"Sikko heeft een lange. Van zijn opa.":"Sikko het n lange. Van zijn opa.",
"Sikko! Rennen! Hij heeft een riek, en hij weet hoe hij moet.":"Sikko! Rennen! Hai het n riek, en hai wait hoe hai mout.",
"Sinds vanochtend. Er stopt hier niemand. Behalve jullie. Dank je.":"Zied vanochtend. Der stopt hier niemand. Behalve jim. Dank je.",
"Slenk! Gas erop, of we blijven erin hangen.":"Slenk! Gas derop, of wie blieven erin hangen.",
"Sneller piepen is dichterbij. Heel snel is goud.":"Sneller piepen is dichterbij. Hail snel is goud.",
"Spreiden is iets voor boter.":"Spreiden is wat veur boter.",
"Stekker erin, en hem eruit!":"Stekker erin, en hom eruit!",
"Stil! Hoor je dat? Vikinggoud. Ik weet het zeker.":"Stil! Hoor je dat? Vikinggoud. Ik wait t zeker.",
"Straddle carrier. Niet onder gaan liggen.":"Straddle carrier. Nait onder goan liggen.",
"Stuurboord is rechts.":"Stuurboord is rechts.",
"Succes. Je hebt tot vier uur.":"Succes. Doe hest tot vaar uur.",
"Tachtig hier. Het bord staat er al veertig jaar. Ik ook.":"Tachtig hier. 't bord stait der al veertig joar. Ik ook.",
"Tammo. Niet de gracht.":"Tammo. Nait de gracht.",
"Tammo. Tám-mo. Je hebt nog tweeëntwintig minuten en eenendertig eieren.":"Tammo. Tám-mo. Doe hest nog tweeëntwintig menuten en eenendertig aaien.",
"Te laat, en dan boos op de fiets.":"Te loat, en dan boos op de fiets.",
"Te laat. Het perron is daar. Wij zijn hier.":"Te loat. 't perron is doar. Wie binnen hier.",
"Te vroeg geremd. De mensen staan nog in het gangpad. Ze kijken naar je.":"Te vroeg geremd. De mensen stoan nog in t gangpad. Zai kieken noar je.",
"Tegen de wind in. Dat stond er niet bij, maar zo was het.":"Tegen de wind in. Dat stun der nait bie, mor zo was t.",
"Terminal. Je staat in rij vier. Rij naar de kraan als het groene licht brandt. Niet eerder.":"Terminal. Je stait in rie vaar. Rie noar de kraan as t groene licht brandt. Nait aarder.",
"Termunten. Een dorp achter de dijk met een kerk die naar de Dollard kijkt. Klaas wil hier ooit liggen. Later.":"Termunten. N dörp achter de diek mit n kerk dij noar de Dollard kiekt. Klaas wil hier ooit liggen. Later.",
"Terug naar de Vismarkt. Met jouw auto. Langzaam, er zit frituurvet in.":"Terug noar de Vismark. Mit dien auto. Langzaam, der zit frituurvet in.",
"Tessa.":"Tessa.",
"Tessa. Er hangt een brief op het luik. En er rijdt een takelwagen de Vismarkt op.":"Tessa. Der hangt n brief op t luik. En der riedt n takelwagen de Vismark op.",
"Toen liep hij naar huis. Hij zei: het varken slaapt. Hij heeft het nooit meer over gehad.":"Toen liep hai noar hoes. Hai zee: t varken slaapt. Hai het t nooit meer over gehad.",
"Touw om de bolder. Niet te strak. Een sluis ademt.":"Touw om de bolder. Nait te strak. N sluis ademt.",
"Tractie op twee. Rustig. Een trein stuurt niet. Hij gaat waar het spoor gaat.":"Tractie op twij. Rustig. N trein stuurt nait. Hai goat woar t spoor goat.",
"Trede één. Dat telt ook.":"Trede ain. Dat telt ook.",
"Trede één. Op de Vismarkt.":"Trede ain. Op de Vismark.",
"Trede vier.":"Trede vaar.",
"Trekkertrek in Uithuizermeeden. Eppo trekt mee met zijn monstertrekker. Jakob leent je zijn oude, als je wilt. Hoeft niet. Mag wel.":"Trekkertrek in Uithuizermeeden. Eppo trekt mit mit zijn monstertrekker. Jakob leent je zijn olle, as je wilt. Hoeft nait. Mag wel.",
"Trijntje krijgt haar gunst. Maar eerst mijn kerk. Er staat al drie dagen een mestinjecteur op mijn kerkpad.":"Trijntje kriegt heur gunst. Mor aarst mien kerk. Der stait al drij dagen n mestinjecteur op mien kerkpad.",
"Twaalf toeschouwers. Elf spelers. Eén scheidsrechter. Ze kennen elkaar allemaal.":"Twaalf toeschouwers. Elf spelers. Ain scheidsrechter. Zai kennen mekoar allemoal.",
"Twee boten. Snelle boten.":"Twij boten. Snelle boten.",
"Twee filialen draaien. Zonder ons.":"Twij filialen draaien. Zonder ons.",
"Twee filialen. Warffum en Delfzijl.":"Twij filialen. Warffum en Delfzijl.",
"Twee is ook een mooi getal. Zei iemand.":"Twij is ook n mooi getal. Zee iemand.",
"Twee knechten van Ubbo bij het luik. Erheen!":"Twij knechten van Ubbo bie t luik. Derhen!",
"Twee mannen bij Jakobs luik. Met een koevoet. Ik meld alleen.":"Twij mannen bie Jakobs luik. Mit n koevoet. Ik meld aleen.",
"Twee minuten voor twaalf. Ik meld alleen. Ik doe hem ook open.":"Twij menuten veur twaalf. Ik meld aleen. Ik doe hom ook open.",
"Twee voorrondes. Nog vijf.":"Twij voorrondes. Nog vief.",
"Tweede lading. Ze komen met z'n tweeën.":"Tweede lading. Zai komen mit zien twij.",
"Tweede prijs. Vesting Bourtange. Dat staat op de rand. Heel klein.":"Tweede prijs. Vesting Bourtange. Dat stait op de rand. Hail klain.",
"Tweede, in Bourtange. Mijn eierbal was beter. De jury was van een Oldenhuis.":"Tweede, in Bourtange. Mien eierbal was beter. De jury was van n Oldenhuis.",
"Tweeduizend containers. En Duitsland.":"Tweeduizend containers. En Duitsland.",
"Tweehonderd euro, voor drie knopen.":"Tweehonderd euro, veur drij knopen.",
"Tweehonderd. Hier. Ik had er nog wat op willen verdienen.":"Tweehonderd. Hier. Ik har der nog wat op willen verdienen.",
"Twintig kilometer.":"Twintig kilometer.",
"Twintig minuten. Termunterzijl.":"Twintig menuten. Termunterzijl.",
"U bent Geesje.":"U bist Geesje.",
"U danste met haar.":"U danste mit heur.",
"U deed de deuren dicht. Voor zijn neus.":"U deed de deuren dicht. Veur zijn neus.",
"U kent hem.":"U kent hom.",
"Ubbo geeft een tuinfeest in de Menkemaborg. Ik ga als bediening, met een schort. Jij gaat als niemand. Door de tuin.":"Ubbo geeft n tuinfeest in de Menkemaborg. Ik goa as bediening, mit n schort. Doe goat as niemand. Deur de tuin.",
"Ubbo heeft dat reglement niet bedacht. Hij heeft het opgegraven.":"Ubbo het dat reglement nait bedacht. Hai het t opgegraven.",
"Ubbo heeft er nog veertig.":"Ubbo het der nog veertig.",
"Ubbo moet overal wat. Hij heeft mensen. Ik ben er één.":"Ubbo mout aaloverst wat. Hai het mensen. Ik bin der ain.",
"Ubbo, ik ben voorzitter. Ik moet eerlijk zijn.":"Ubbo, ik bin voorzitter. Ik mout eerlk zijn.",
"Uithuizen. Een grote kerk voor een dorp dat vindt dat het een stad is. Het heeft gelijk, op kermisdagen.":"Uithuizen. N grode kerk veur n dörp dat vindt dat t n stad is. 't het gelieke, op kermisdagen.",
"Usquert. Een kerk, een molen, en een loonbedrijf dat ik niet ga noemen.":"Usquert. N kerk, n molen, en n loonbedrijf dat ik nait goa nuimen.",
"Usquert. Hier. En zeg tegen Eppo dat zijn konvooi mijn hek heeft geraakt.":"Usquert. Hier. En zeg tegen Eppo dat zijn konvooi mien hek het raakt.",
"Valt mie nait of.":"Valt mie nait of.",
"Van 1953. Ze passen nog. Ik heb ze nooit meer aangehad. Ik wacht.":"Van 1953. Zai passen nog. Ik heb ze nooit meer aangehad. Ik wacht.",
"Van de kapitein. Hij zei: welkom thuis. Ik zei: ik ben er nooit weggeweest.":"Van de kapitein. Hai zee: welkom thoes. Ik zee: ik bin der nooit weggeweest.",
"Van een Vikingpaard!":"Van n Vikingpaard!",
"Van Eppo Bolt. Die heeft alle machines van het Hogeland. Behalve mijn fiets.":"Van Eppo Bolt. Dij het aal machines van t Hogeland. Behalve mien fiets.",
"Van mijn broer. Hij woont nu op het land. Hij werd zeeziek.":"Van mien broer. Hai woont nou op t land. Hai werd zeeziek.",
"Van wat?":"Van wat?",
"Van wie?":"Van wel?",
"Van zeven.":"Van zeuven.",
"Vandaag veertig eierballen. Na de bingo nog twintig. De dominee nam er drie.":"Vandoage veertig eierballen. Noa de bingo nog twintig. De dominee nam der drij.",
"Vannacht belt die baas van ze in. Ik moet hem live laten, zegt de zender.":"Vannacht belt dij baas van ze in. Ik mout hom live loaten, zegt de zender.",
"Vasthouden, Tammo. Terug naar Lammert.":"Vasthouden, Tammo. Terug noar Lammert.",
"Vaten met OB. Klik. Zender zit.":"Vaten mit OB. Klik. Zender zit.",
"Vaten. Er staat OB op gestempeld.":"Vaten. Der stait OB op gestempeld.",
"Vergunning verlopen. Dat is geen kwestie van willen. Dat is papier.":"Vergunning verlopen. Dat is gain kwestie van willen. Dat is papier.",
"Verkopen. Aan iemand die geen Ubbo heet.":"Verkopen. Aan iemand dij gain Ubbo hait.",
"Vet met OB erop. Sigaretten. En paling, levend.":"Vet mit OB derop. Sigaretten. En paling, levend.",
"Vet, sigaretten en paling. Klik.":"Vet, sigaretten en paling. Klik.",
"Vet. Van Oldenhuis.":"Vet. Van Oldenhuis.",
"Veur de opa, nait veur die.":"Veur de opa, nait veur die.",
"Vier dan. Dat is ook goed.":"Vier as. Dat is ook goud.",
"Vier keer. De vijfde was voor Ubbo.":"Vier keer. De vijfde was veur Ubbo.",
"Vier mensen in de kerk. Met ons zes.":"Vier mensen in de kerk. Mit ons zes.",
"Vijf erven. Geesje zegt: de volgorde maakt niet uit, als je maar niet remt als een Stadjer.":"Vief erven. Geesje zegt: de volgorde moakt nait oet, as je mor nait remt as n Stadjer.",
"Vijftig meter. Ik ben in d'Olle Grieze geweest. Die was hoger. Dat vond ik toen ook al niks.":"Viefteg meter. Ik bin in d'Olle Grieze west. Dij was hoger. Dat vond ik toen ook al niks.",
"Vikingen dronken ook.":"Vikingen dronken ook.",
"Vikinggoud! Ook voor mensen die het al eens gekocht hebben!":"Vikinggoud! Ook veur mensen dij t al ains kocht hebben!",
"Vikinggoud. Echt. Met papieren.":"Vikinggoud. Echt. Mit papieren.",
"Vluchtstrook is afgesloten. Laatste fase.":"Vluchtstrook is afgesloten. Lèste fase.",
"Vol?":"Vol?",
"Volg de geul. Waar het water donker is, is het diep.":"Volg de geul. Woar t woater duuster is, is t diep.",
"Volgende halte: Appingedam.":"Volgende halte: Appingedam.",
"Volgende halte: Baflo.":"Volgende halte: Baflo.",
"Volgende halte: Bedum.":"Volgende halte: Bedum.",
"Volgende halte: Delfzijl West.":"Volgende halte: Delfzijl West.",
"Volgende halte: Delfzijl. Deze trein eindigt hier. Dank voor het reizen, en tot ziens.":"Volgende halte: Delfzijl. Disse trein eindigt hier. Dank veur t reizen, en tot ziens.",
"Volgende halte: Eemshaven. Eindpunt. Wilt u bij het uitstappen op de wind letten.":"Volgende halte: Eemshaven. Eindpunt. Wilt u bie t oetstappen op de wind letten.",
"Volgende halte: Groningen Noord.":"Volgende halte: Groningen Noord.",
"Volgende halte: Loppersum.":"Volgende halte: Loppersum.",
"Volgende halte: Roodeschool. Deze trein eindigt hier.":"Volgende halte: Roodeschool. Disse trein eindigt hier.",
"Volgende halte: Sauwerd.":"Volgende halte: Sauwerd.",
"Volgende halte: Stedum.":"Volgende halte: Stedum.",
"Volgende halte: Uithuizen.":"Volgende halte: Uithuizen.",
"Volgende halte: Uithuizermeeden.":"Volgende halte: Uithuizermeeden.",
"Volgende halte: Usquert.":"Volgende halte: Usquert.",
"Volgende halte: Warffum.":"Volgende halte: Warffum.",
"Volgende halte: Warffum. Daar stapt niemand uit. Behalve wij.":"Volgende halte: Warffum. Doar stapt niemand oet. Behalve wie.",
"Volgende halte: Winsum.":"Volgende halte: Winsum.",
"Voor de jury. Ze kijken.":"Veur de jury. Zai kieken.",
"Voor de kleinkinderen.":"Veur de kleinkinderen.",
"Voor de… voor de radio, Tammo.":"Veur de… veur de radio, Tammo.",
"Voor een snackbar.":"Veur n snackbar.",
"Voor knopen!":"Veur knopen!",
"Voor opa. Hij ligt hier al langer dan ik leef.":"Veur opa. Hai ligt hier al langer as ik leef.",
"Voor tien euro.":"Veur tien euro.",
"Voorronde één. Uithuizen. Eieren uit vijf wierdedorpen, vers, voor vier uur. Geesje heeft de adressen. Jij rijdt, ik zet de kraam op.":"Voorronde ain. Uithuizen. Aaien oet vief wierdedorpen, vers, veur vaar uur. Geesje het de adressen. Doe riedt, ik zet de kraam op.",
"Voorronde twee. Appingedam, bij de hangende keukens. Siebrand zit in de jury. Zijn boot ligt in het Damsterdiep.":"Voorronde twij. Appingedam, bie de hangende keukens. Siebrand zit in de jury. Zien boot ligt in t Damsterdiep.",
"Voorzitter. Siebrand Mulder. Ik proef alles. Ik zie alles.":"Voorzitter. Siebrand Mulder. Ik proef aals. Ik zai aals.",
"Voorzitter. Ubbo vond hem betrouwbaar. Ik meld alleen.":"Voorzitter. Ubbo vond hom betrouwbaar. Ik meld aleen.",
"Vroeger reed de bus hier vier keer per dag. Nu twee keer per uur. Het is te druk geworden.":"Vroeger reed de bus hier vaar keer per dag. Nou twij keer per uur. 't is te drok geworden.",
"Vuurwerk. Nu ziet iedereen omhoog, en jij kijkt naar beneden.":"Vuurwerk. Nou ziet iedereen omhoog, en doe kiekt noar beneden.",
"Waar hangt de foto?":"Woar hangt de foto?",
"Waar is de zee? Ik zie alleen een dijk.":"Woar is de zee? Ik zai aleen n diek.",
"Waar is hij?":"Woar is hai?",
"Waar moet hij heen?":"Woar mout hai hen?",
"Waarheen, Trijntje?":"Waarheen, Trijntje?",
"Waarom heet het Roodeschool?":"Woarom hait t Roodeschool?",
"Waarom smokkel je paling?":"Woarom smokkel je paling?",
"Waarom, Ubbo?":"Woarom, Ubbo?",
"Waarom?":"Woarom?",
"Warffum. Een wierdedorp met een station, een café en een kamer boven het café. Je weet wel welke.":"Warffum. N wierdedorp mit n station, n café en n kamer boven t café. Je wait wel welke.",
"Wat doe je er nu mee?":"Wat doe je der nou mit?",
"Wat doen jullie op mien laand!":"Wat doen jullie op mien laand!",
"Wat krijg ik ervoor, Ubbo?":"Wat krieg ik ervoor, Ubbo?",
"Wat lossen ze?":"Wat lossen ze?",
"Wat moet Ubbo op het Hogeland?":"Wat mout Ubbo op t Hogeland?",
"Wat moeten ze ermee, Henk?":"Wat mouten ze dermit, Henk?",
"Wat zeiden Durk en Douwe?":"Wat zeden Durk en Douwe?",
"Wat zie je?":"Wat zugst?",
"Wat zijn ze je schuldig?":"Wat zijn ze je schuldig?",
"Water tot de as. Nu of nooit, Tammo.":"Woater tot de as. Nou of nooit, Tammo.",
"Waterpolitie. Om de bocht. Met zwaailicht.":"Waterpolitie. Om de bocht. Mit zwaailicht.",
"We hebben er één. Die hing gisteren aan een takelwagen.":"Wie hebben der ain. Dij hing gisteren aan n takelwagen.",
"We verhuizen van Stad naar Uithuizen. Voor de rust. Is het hier altijd zo stil? O. Fijn.":"Wie verhuizen van Stad noar Uithuizen. Veur de rust. Is t hier aaltied zo still? O. Fijn.",
"We zien niks.":"Wie zain niks.",
"Weer bediening tekort? Ik huur jou wel in, meisje.":"Weer bediening tekort? Ik huur die wel in, wicht.",
"Weer de haven in? Ik zet de deuren alvast op een kier.":"Weer de haven in? Ik zet de deuren alvast op n kier.",
"Weer de voorronde? Ik ben nog steeds de oudste. Dat gaat vanzelf.":"Weer de voorronde? Ik bin nog steeds de oudste. Dat goat vanzelf.",
"Weer die takelwagen? Ik ga voortaan in de rij staan met een sleepkabel.":"Weer dij takelwagen? Ik goa voortoan in de rie stoan mit n sleepkabel.",
"Weer die vroege trein? Neem een boterham mee, jong. Het Hogeland is groot.":"Weer dij vroege trein? Neem n boterham mit, jong. 't Hogeland is groot.",
"Weer een injecteur op mijn pad. Ik begin te denken dat hij me mist.":"Weer n injecteur op mien pad. Ik begin te denken dat hai mie mist.",
"Weer eieren rapen? Ik koop ze gewoon. Scheelt rijden.":"Weer aaien rapen? Ik koop ze gewoon. Scheelt rieden.",
"Weer mist? Mooi. Dan ziet niemand hoe oud ik ben.":"Weer mist? Mooi. Dan ziet niemand hoe old ik bin.",
"Weer storm? Dan zet ik koffie. Jullie komen toch.":"Weer storm? Dan zet ik koffie. Jim komen toch.",
"Weg. In de mist.":"Weg. In de mist.",
"Weg. Met de frituur erin.":"Weg. Mit de frituur erin.",
"Wekt u mij in Stad? Of in Uithuizen. Waar we dan ook als eerste zijn.":"Wekt u mie in Stad? Of in Uithuizen. Woar wie dan ook as aarste zijn.",
"Wel een sleutel.":"Wel n sleutel.",
"Werd die niet gezocht, Ubbo?":"Werd dij nait gezocht, Ubbo?",
"Wie dan?":"Wie dan?",
"Wie heeft mijn injecteur verzet?":"Wie het mien injecteur verzet?",
"Wie hier met de trein doorheen rijdt, ziet balken tegen gevels en huizen in de steigers. Daar wonen mensen die al jaren wachten op een gewoon huis.":"Wie hier mit de trein doorheen riedt, ziet balken tegen gevels en huzen in de steigers. Doar woonen mensen dij al joaren wachten op n gewoon hoes.",
"Wie is hij?":"Wie is hai?",
"Wie zegt dat Vikingen geen jassen hadden?":"Wie zegt dat Vikingen gain jassen hadden?",
"Wie zit er in de jury?":"Wie zit der in de jury?",
"Wij hebben eieren nodig.":"Wie hebben aaien neudig.",
"Wij hebben er één. Die is warm.":"Wie hebben der ain. Dij is waarm.",
"Wij hebben er één. En die hangt boven het water, heel.":"Wie hebben der ain. En dij hangt boven t woater, hail.",
"Wij komen niet.":"Wie komen nait.",
"Wij zijn de frietwagen.":"Wie binnen de frietwagen.",
"Wij zijn klein. Klein draait sneller.":"Wie binnen klain. Klein draait sneller.",
"Willemien. Een foto. Twee meisjes op een fiets. Voor het station.":"Willemien. N foto. Twij meisjes op n fiets. Veur t station.",
"Windkracht zes. Tegen. Dit bouwt karakter, zei je.":"Windkracht zes. Tegen. Dit bouwt karakter, zee je.",
"Winsum. Een dorp met water, molens en een brug waar iedereen een foto van maakt. Ik ook.":"Winsum. N dörp mit woater, molens en n brug woar iedereen n foto van moakt. Ik ook.",
"Winsum. Hier wil ik een filiaal. Aan het water.":"Winsum. Hier wil ik n filiaal. Aan t woater.",
"Winsum. Hier zag ik ooit een ijsvogel. Daarna nooit meer. Ik kijk nog steeds.":"Winsum. Hier zag ik ooit n ijsvogel. Doarnoa nooit meer. Ik kiek nog steeds.",
"Zandeweer. Ze zijn nog warm. Niet van de kip, van de zon.":"Zandeweer. Zai binnen nog waarm. Nait van de kip, van de zun.",
"Zaterdag de voorronde in Uithuizen. Ik zit in de jury. Kom maar. Ik hou van friet.":"Zaterdag de voorronde in Uithuizen. Ik zit in de jury. Kom mor. Ik hol van friet.",
"Vrijdag is er een tuinfeest in de Menkemaborg. Ubbo zoekt daar zijn jury. Ze hebben nog bediening nodig.":"Vrijdag is der n tuinfeest in de Menkemaborg. Ubbo zoekt doar zijn jury. Zai hebben nog bediening neudig.",
"Zaterdag, Uithuizen. Ik regel de stroom op de kermis. Denk daar maar aan.":"Zaterdag, Uithuizen. Ik regel de stroom op de kermis. Denk doar mor aan.",
"Ze draaien altijd sneller dan je denkt. Daarom staan ze hier en niet in Stad.":"Zai draaien aaltied sneller as je denkt. Doarom stoan ze hier en nait in Stad.",
"Ze droeg haar tas. Een jaar lang.":"Zai droeg heur tas. N joar lang.",
"Ze gooide hem in de klei. Zeventig jaar geleden.":"Zai gooide hom in de klei. Zeventig joar geleden.",
"Ze kijken alsof ik te laat ben.":"Zai kieken alsof ik te loat bin.",
"Ze nemen mijn auto mee.":"Zai nemen mien auto mit.",
"Ze rollen beter dan ik dacht.":"Zai rollen beter as ik docht.",
"Ze spelen hetzelfde stuk voor de vierde keer.":"Zai spelen hetzelfde stuk veur de vierde keer.",
"Ze tellen hun stewards. Wegwezen.":"Zai tellen hun stewards. Wegwezen.",
"Ze varen hier al eeuwen langs die keukens. En wij raken ze in één middag.":"Zai vaaren hier al eeuwen langs dij keukens. En wie raken ze in ain middag.",
"Ze waren hier eerst.":"Zai waren hier aarst.",
"Ze willen de pannen. Ze kunnen niet eens bakken.":"Zai willen de pannen. Zai kinnen nait ains bakken.",
"Ze zetten je eruit. Met je pet.":"Zai zetten je eruit. Mit je pet.",
"Zeerijp. Een kerk met een losse klokkentoren. Ze staan naast elkaar, al eeuwen, zonder ruzie.":"Zeerijp. N kerk mit n losse klokkentoren. Zai stoan noast mekoar, al eeuwen, zonder ruzie.",
"Zeg maar tegen je baas dat deze niet te koop is.":"Zeg mor tegen je baas dat disse nait te koop is.",
"Zeg tegen Trijntje: ik ben thuis.":"Zeg tegen Trijntje: ik bin thoes.",
"Zet maar op mijn telefoon.":"Zet mor op mien telefoon.",
"Zet me af bij het hek. Niet bij de halte. Bij het hek.":"Zet mie af bie t hek. Nait bie de halte. Bie t hek.",
"Zeven regio's. Zeven voorrondes. En als we winnen, overal een filiaal.":"Zeven regio's. Zeven voorrondes. En as wie winnen, aaloverst n filiaal.",
"Zeventig jaar wachten op één dans.":"Zeventig joar wachten op ain dans.",
"Zeventig jaar.":"Zeventig joar.",
"Zijn opa. Ik ben Gronings. Ik vergeet niks. Ik zeg het alleen niet.":"Zien opa. Ik bin Gronings. Ik vergeet niks. Ik zeg t aleen nait.",
"Zijwind. Stuur ertegenin, maar niet te veel. De wind is hier al langer dan jij.":"Zijwind. Stuur ertegenin, mor nait te veul. De wind is hier al langer as doe.",
"Zilver. Op tijd, bijna.":"Zilver. Op tied, bieno.",
"Zo praat de torenwachter ook.":"Zo proat de torenwachter ook.",
"Zoals vroeger. Alleen mijn knieën zijn nieuw.":"Zoals vrogger. Aleen mien knieën zijn nij.",
"Zondag is er dienst. Er komen er vier. Met jullie zes.":"Zondag is der dienst. Der komen der vaar. Mit jim zes."
}
```

### G. TTS-cast en sprekerskleuren

Niets hiervan is ingesproken (geen API-aanroepen in deze ronde). Begroting: zie §12.

```js
// scripts/tts_lines_list.mjs CAST: add
  'Ubbo Oldenhuis': { voice: 'Zubenelgenubi', who: 'Ubbo Oldenhuis, de Patatbaron: joviale, zelfvoldane Veenkoloniale zakenman van in de zestig, eigenaar van eenenveertig snackbars', pool: ['joviaal, zelfvoldaan', 'zakelijk, vriendelijk dreigend', 'geamuseerd, neerbuigend'], accent: 'spoken in Veenkoloniaal Gronings, slow and warm, the voice of a man who owns the room' },
  'Kosteres Geesje': { voice: 'Aoede', who: 'Geesje, 84, kosteres van de wierdekerk van Den Andel, droog, scherp en kerkelijk zonder zalvend te zijn', pool: ['droog, kordaat', 'oud, scherp, licht geamuseerd', 'warm, nuchter'], accent: 'spoken in Hogelandster Gronings, old woman, clear and dry' },
  'Eppo Bolt': { voice: 'Achird', who: 'Eppo Bolt, de Mestkoning: grote, luide loonwerker uit Usquert met alle oogstmachines van het Hogeland', pool: ['luid, joviaal dreigend', 'stug, beledigd', 'grinnikend, zelfvoldaan'], accent: 'spoken in Hogelandster Gronings, loud, boorish but not stupid' },
  'Sluiswachter Lammert': { voice: 'Charon', who: 'Lammert, 91, oude sluiswachter van de zeesluis bij Delfzijl, melder, traag en onverstoorbaar, danste in 1953 met Trijntje', pool: ['oud, traag, onverstoorbaar', 'droog, warm', 'zacht, ontroerd'], accent: 'spoken in Gronings from the Eems coast, very old man, slow and calm' },
  'Siebrand Mulder': { voice: 'Umbriel', who: 'Siebrand Mulder, havenbaas in Delfzijl, kil, zakelijk en zeker van zichzelf, smokkelt voor Ubbo', pool: ['kil, zakelijk', 'dreigend, kalm', 'woedend, beheerst'], accent: 'spoken in Gronings with a clipped harbour-boss delivery' },
  'Kroegbaas Jakob': { voice: 'Sadachbia', who: 'Jakob, Geesjes neef, kroegbaas in Warffum en deeltijdboer', pool: ['gemoedelijk, droog', 'hartelijk'], accent: 'spoken in Hogelandster Gronings, friendly' },
  'Slager Ruurd': { voice: 'Sadaltager', who: 'slager uit Usquert in de jury, zwijgzaam', pool: ['zwijgzaam, nors'], accent: 'spoken in Hogelandster Gronings' },
  'Kermisbaas Hennie': { voice: 'Alnilam', who: 'kermisbaas van Uithuizen, voorzitter van de jury, omroepstem', pool: ['luid, plechtig', 'nerveus, plechtig'], accent: 'spoken in Hogelandster Gronings, booming fairground voice' },
  'Harm-Jan': { voice: 'Puck', who: 'Harm-Jan, de Piepjager: enthousiaste dertiger met een metaaldetector, zeker van Vikinggoud', pool: ['opgewonden, snel', 'teleurgesteld, hoopvol', 'plechtig, fluisterend'], accent: 'spoken in Hogelandster Gronings, fast and eager' },
  'Handelaar Lubbert': { voice: 'Rasalgethi', who: 'Lubbert, gladde marktkoopman met nep-Vikinggoud', pool: ['verkoperig, glad', 'betrapt, snel'], accent: 'spoken in Gronings, smooth market seller' },
  'Boer Sikko': { voice: 'Enceladus', who: 'Sikko, oude boer met een riek, eigenaar van de wierde', pool: ['nors, roepend', 'droog'], accent: 'spoken in Hogelandster Gronings, old farmer' },
  'Willemien': { voice: 'Laomedeia', who: 'Willemien, Trijntjes achternicht uit Loppersum, rustig, nuchter, moe van het wachten maar niet verbitterd', pool: ['rustig, nuchter', 'zacht, warm', 'droog, moe'], accent: 'spoken in Gronings from the Loppersum area, calm' },
  'Machinist Jantina': { voice: 'Vindemiatrix', who: 'Jantina, machinist, veertig jaar op de lijnen naar Roodeschool en Delfzijl, kalm en streng', pool: ['kalm, instruerend', 'droog, streng', 'tevreden, kort'], accent: 'spoken in Gronings, calm and instructive, over a cab intercom' },
  'Conducteur Okke': { voice: 'Sadaltager', who: 'Okke, conducteur, onverstoorbaar en vriendelijk', pool: ['vriendelijk, onverstoorbaar'], accent: 'spoken in Gronings' },
  'Treinomroep': { voice: 'Kore', who: 'omroepstem in een stoptrein', pool: ['kalm, monotoon'], accent: 'spoken in Gronings exactly as written, calm and clear like a train announcement' },
  'Boer': { voice: 'Enceladus', who: 'een boer of boerin op het erf', pool: ['droog, hartelijk'], accent: 'spoken in Hogelandster Gronings' },
  'Boerin': { voice: 'Despina', who: 'een boerin op het erf', pool: ['droog, hartelijk'], accent: 'spoken in Hogelandster Gronings' },
  'Buschauffeur Jannes': { voice: 'Alnilam', who: 'Jannes, buschauffeur van de Streekbus, droog', pool: ['droog, gemoedelijk'], accent: 'spoken in Gronings' },
  'Reiziger': { voice: 'Despina', who: 'een medereiziger', pool: ['kletserig'], accent: 'spoken in Gronings' },
  'Student': { voice: 'Puck', who: 'een student uit Stad', pool: ['moe, droog'], accent: 'spoken in standard Dutch with a light Groningen accent' },
  'Loodsdienst': { voice: 'Achird', who: 'de marifoonstem van de loodsdienst', pool: ['zakelijk, door de marifoon'], accent: 'spoken in Gronings, over a marine radio' },
  'Omroeper': { voice: 'Alnilam', who: 'omroeper bij de trekkertrek', pool: ['luid, enthousiast'], accent: 'spoken in Hogelandster Gronings, booming PA voice' },
  'Vlieger Wiep': { voice: 'Erinome', who: 'Wiep, gewasspuitvlieger die de bijbaan regelt', pool: ['zakelijk, droog'], accent: 'spoken in Gronings, over a headset' },
  'Wybe': { voice: 'Algieba', who: 'Wybe, neef van Durk en Douwe, groot en traag, speelt grenswacht', pool: ['traag, plechtig'], accent: 'spoken in Frisian (Frysk), slow and heavy' },
  'Wiebren': { voice: 'Algenib', who: 'Wiebren, neef van Durk en Douwe, herhaalt het laatste woord', pool: ['traag, eerlijk'], accent: 'spoken in Frisian (Frysk), slow' },

// game/js/speakers.js SPEAKER_COLORS: add
  'Ubbo Oldenhuis': '#b0702a',
  'Kosteres Geesje': '#9a6fb8',
  'Eppo Bolt': '#7f8f2f',
  'Sluiswachter Lammert': '#4f7f9a',
  'Siebrand Mulder': '#5d6f86',
  'Kroegbaas Jakob': '#a0743f',
  'Harm-Jan': '#3f8f73',
  'Willemien': '#c06a5a',
  'Machinist Jantina': '#3b8d8d',
  'Wybe': '#3f9a3f',
  'Wiebren': '#20968a',
```

## 12. Tellingen en TTS-begroting

- **Hoofdmissies:** 10 (O1, O2, O3, O4, O5, O6, O7, O8, O9, O10), plus 4 verhaalstappen tussendoor (n-trekkertrek, n-warffum, n-delfzijl, n-woonschip).
- **Zijmissies:** 11 in 3 reeksen (Z1, Z2, Z3, Z4, Z5, Z6, Z7, Z8, Z26, Z27, Z28); Scheuren (Z26-Z28) alleen als de eigenaar ja zegt.
- **Activiteiten en bijbanen:** 12 blokken (Machinist en passagier; Buschauffeur in het Ommeland; Motor en brommer met versnellingen; Vrachtwagen: leveringen naar Eemshaven en Delfzijl; Driftplekken; Trekkertrek; Races: dijk, N-weg, kanaal, turbines; Gewasspuiter (Hogeland); Havenloods; Taxi, pakketten, verhuizen; Fjord-filialen en overvallen; Verkennen en verzamelen).
- **Ontmoetingen en events:** 15. **Herkenningspunten:** 22. **Geheimen:** 8.
- **Gesproken regels in dit document:** 967 (inclusief autogesprekken); unieke Groningse spreekregels: 928, ± 42k tekens; Friese ondertitels: 6; Groningse ondertitels: 4.
- **Per spreker:** Anita 257, Tammo 255, Rikus 65, Sluiswachter Lammert 42, Kosteres Geesje 38, Kapitein Klaas 38, Harm-Jan 27, Ubbo Oldenhuis 26, Willemien 24, Machinist Jantina 22, Oma Trijntje 18, Eppo Bolt 17, Treinomroep 16, Durk 13, Boer 13, Reiziger 11, Douwe 10, Kroegbaas Jakob 8, Siebrand Mulder 7, Omroeper 6, Handelaar Lubbert 6, Buschauffeur Jannes 6, Agent 4, Student 4, Kermisbaas Hennie 3, Agente 3, Conducteur Okke 3, Vlieger Wiep 3, Wybe 3, Torenwachter 2, Jelle Terpstra 2, Slager Ruurd 2, Boerin 2, Henk 2, Boer Sikko 2, Toerist 2, Loodsdienst 2, Wiebren 2, Harm 1.
- **TTS-begroting:** de hele cast kostte op 2 oktober ± $2,70 voor ~3.400 clips via OpenRouter-credits. Voor F4a (± 967 clips, banter voor Tammo én Tessa dubbel waar het companion-regels zijn) is dat naar verhouding **± $1 tot $1,50**, betaald uit OpenRouter-credits (geen directe Google-facturering).
