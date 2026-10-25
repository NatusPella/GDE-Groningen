> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/verhaal.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Verhaalflow: analyse en voorstel (issue #93)

Fase 1 van [#93](https://github.com/NatusPella/GDE-Groningen/issues/93): analyseren en voorstellen. Er is niets herschreven, geen stem opnieuw opgenomen en geen TTS gebruikt. Alleen dit document is nieuw.

**Hoe dit tot stand kwam.** Gelezen uit de code en de data: `game/js/storyarc.js` (STEPS, PARTS, clues), `missions.js` (intro, stages, startpunten), `calendar.js` (STEP_DATES), [D-definitief.md](D-definitief.md), [KALENDER.md](KALENDER.md), [../PROVINCIE-VERHAAL.md](../PROVINCIE-VERHAAL.md), de Deel 4-scripts (`deel4-f4a/b/c.md`, alleen de opzet) en [../personages.md](../personages.md). `node scripts/voice_coverage.mjs --quiet` is gedraaid (lokaal, zonder netwerk).
**Niet gedaan:** het spel is niet gespeeld, de verhaaltest (Electron) is niet gedraaid, en afstanden zijn uit de codecoördinaten (meters vanaf de Grote Markt, ongeveer (168, 70)) geschat. Alles in de tabel is dus "nog niet bekeken in beeld". Wat in de tekst "kloppen" of "tegenspreken" heet, is uit de bestanden gehaald.

## 0. In het kort

- De gebouwde game is **30 stappen** (18 missies H1-H18 en 12 activiteiten) in drie delen, 14 tot en met 28 augustus. **27 van de 30 stappen spelen in de stad, één op de rand, twee op Eelde** (dat in Drenthe ligt). Geen enkele stap speelt in een van de zeven regio's van de provincie. Deel 4 (32 hoofdmissies, bijna allemaal in de provincie) bestaat alleen als script en is niet gebouwd.
- De lijn is niet "kapot", maar op zeven plekken ontbreekt een **motief of een schakel**, en op twee plekken spreken tekst en kalender elkaar tegen. Het ergste: het hoofddoel van de spelers (wat willen ze met die Eierbal?) wordt nergens in de game uitgesproken, en de speler krijgt na de kraak (H6) geen doel meer dat het verhaal draagt, alleen een rij Rikus-telefoontjes.
- **Alle** gesproken verhaaltekst heeft een opname (voice_coverage: 1725/1725). Elke tekstwijziging in een bestaande regel betekent opnieuw opnemen, en dat beslist de eigenaar. Volgorde, plaats, doel en datum veranderen kost geen opname. Zie §4.4.

## 1. De echte volgorde, stap voor stap

Bron voor de volgorde: `STEPS` in `storyarc.js` (de game loopt die lijst af). Dag = `STEP_DATES` in `calendar.js`. Plek: S = stad (binnen ongeveer 1,5 km van de Grote Markt, tenzij anders), R = stadsrand, P = buiten Stad. Speler: T = Tammo, A = Tessa (in de code `anita`). Briefing = wat de `lead`, de intro in `missions.js` en de scènes zeggen.

Oordeel: **helder** (doel, motief en aansluiting zijn te volgen), **onduidelijk** (iets ontbreekt of moet geraden worden), **onlogisch** (spreekt zichzelf of de kalender tegen), **herhaling**.

### Deel 1 · Kop, "Moi, Grunn" (KEI-week, 14-17 augustus)

| # | Stap | Dag | Sp. | Waar (S/R/P) | Doel van de speler | Motief | Aansluiting op vorige stap | Wat de briefing / scène zegt | Oordeel |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **H1** Berend telt de krassen | vr 14 | A | Martinikerkhof naar Boterdiep, om het centrum heen (S) | Berends bakkie heel afleveren | Rikus zoekt een chauffeur; Berend mag niet door het centrum | Eerste stap; volgt de intro | Berend belt Rikus over een brief uit 1977 en het Boterdiep | helder, maar los van de plot: waarom werken zij voor Berend? (geld, niet gezegd) |
| 2 | **k-eikea** De flat inrichten | vr 14 | A | EIKEA, Sontweg, naar de flat in Paddepoel (S/R) | Drie dozen heel thuisbrengen | Ze slapen op een luchtbed | "De dozen kunnen wachten" (H1-lead) | Lijstje, kast die niet in de lift past | helder (wereldopbouw, geen plot) |
| 3 | **H2** Even pinnen | za 15 | A | Herestraat, Spuit & Klaar, Pand & Poen (S) | Politie kwijt, automaat afleveren | Durk en Douwe trokken een automaat met Tessa's pas eruit | Geen oorzaak uit H1; het verhaal begint hier echt | Cutscène Herestraat; Sjabbe: reuzen kochten alles voor frituren, hun baas vroeg naar de museumalarmen | helder, maar de slotzin ("wie hem eerst heeft, heeft hem") blijft in de lucht hangen |
| 4 | **H3** Iets met de Grote Markt | za 15 | T | Grote Markt (S) | 1500 stuntpunten, niemand raken | Jelmer betaalt de inschrijving voor de Snackprijs (150) | **Breuk**: H2 eindigt bij "wie steelt de bal?", H3-lead zegt "wil je die bal eerlijk?" en de Snackprijs is nog nooit genoemd | Jelmer wil content; Jelle komt in de chat | onduidelijk (de Snackprijs en het motief "eerlijk" komen uit het niets) |
| 5 | **H4** Kieken van boven | za 15 | T | Stationsplein naar het museum, per duif (S) | Drie camera's en twee bewakers fotograferen | Bert: een zwarte trekker-limo maakt zijn duiven nerveus | Past bij H2 (museum), maar niemand zegt waarom zij gaan kijken | Bert belt Rikus; "Ik ken alleen niemand die duiven spreekt" | onduidelijk (wiens plan is dit?) |
| 6 | **k-fiets** Eigen fiets kopen | zo 16 | T | Trap & Toeter (S) | Fiets kopen (75) | Sjoerd praat alleen met wie zijn KEI-race rijdt, op een eigen fiets | Lead van H4-afloop | Sjoerd heeft een neef bij museumbeveiliging | helder (poortwachter-stap, koopactie) |
| 7 | **H5** Wind tegen, beide kanten op | zo 16 | T | Binnenstad (S) | Podium in de KEI-race | Informatie voor een ritje: Sjoerd vertelt over de drie minuten zonder camera's | Volgt uit k-fiets | Eerstejaars; Tessa komt op het groene kruispunt van de andere kant | helder (romantisch hoogtepunt) |
| 8 | **k-kraakspullen** Zwart of een bootje | ma 17 | A | Kledingwinkel of Bootje Huren (S) | Spullen kopen (150) | "Niet opvallen" voor de kraak | Uit Sjoerds drie minuten | Zwart incognito of via het water | onduidelijk (**wanneer en waarom besluiten ze te stelen?** Alleen D-definitief heeft de autogesprek-scène "de weigering"; of die goed in de game zit, is niet bekeken) |
| 9 | **k-nacht** Thuis wachten | ma 17 | A | Flat (S) | Wachten tot middernacht | Camera's gaan om twaalf uur uit | Direct na de spullen | Henk belt over de zender in de Escapade | helder (dode tijd, maar Henks zender betaalt uit in H16) |
| 10 | **H6** Het museum stond er al zo | ma 17 | A | Groninger Museum, Verbindingskanaal (S) | Drie minuten: stroomkast, vitrine | De kraak zelf | Sterk, volgt uit H4/H5/9 | Lege vitrine, "Tige tank! – J."; Jelle belt live naar Nachtstreek | helder, de drempel |

### Deel 2 · Romp, "Stad in rouw" (Noorderzon, 18-23 augustus)

| # | Stap | Dag | Sp. | Waar | Doel van de speler | Motief | Aansluiting op vorige stap | Briefing / scène | Oordeel |
|---|---|---|---|---|---|---|---|---|---|
| 11 | **r-trein** Even onderduiken | di 18 | A | Hoofdstation (trein), Noorderplantsoen of Hoge der A (S; de treinrit gaat naar een station, niet bekeken waarheen) | Kies een uitje, 8 euro | De politie zoekt twee mensen in het zwart | Direct na de vlucht uit H6 | Scène per keuze, romantisch | helder |
| 12 | **H7** Heel aankomen is ook een kunst | wo 19 | T | Stadsschouwburg naar Noorderplantsoen (S) | Decor heel afleveren | Femke: wie voor haar rijdt heeft "gisteren decor gebouwd" (alibi) | **Zwak**: het verhaal over de Eierbal staat even stil, het alibi is een grap | Femke belt Rikus; na afloop Kiekdoar: al het vet is opgekocht | onduidelijk (waarom nu? waar is de bal?), goede haak naar H8 |
| 13 | **H8** Al het vet van Grunn | wo 19 | A | Bornholmstraat (1,1 km) naar de Oosterpoort (S) | Tankwagen "Us Mem Vet" kapen | Jelles stap 2: geen vet, geen Stadjer aan de start | Sterk: Kiekdoar-bericht uit H7 | Snackbar belt; Jelle op de radio; sms "Pas op dysels, famke. – M." | helder |
| 14 | **r-tuning** De Escapade opvoeren | do 20 | T | Knal & Kolder (S) | Auto die 200 km/u kan | Jelle daagt uit op de ringweg | Uit Jelles radiobericht in H8 | Tammo en Tessa: "Hij is van ons. Hij weet het alleen nog niet" | helder (doel), dun motief |
| 15 | **H9** Ring Zuid, laatste fase | do 20 | T | Zuidelijke Ringweg (S, rand) | Podium op de ring | Harm wil dat iemand erop rijdt; Jelle is er ook | Volgt uit de uitdaging | Eén lead noemt Harm én Jelle; het D-definitief-motief (Jelle daagt Tammo uit vanwege Tessa) staat er niet in | onduidelijk (twee motieven, geen uitgesproken oorzaak) |
| 16 | **H10** Er hangt iets Fries aan d'Olle Grieze | vr 21 | T | Martinitoren, Grote Markt (S) | Vlag met duif eraf halen | Stap 3 van Jelles plan: Stad vernederen | Zwak: geen eigen aanleiding, de torenwachter meldt alleen | Torenwachter: "Iets Fries"; vlag: FOAR MEM | helder als grap; het vierstappenplan van Jelle staat alleen in D-definitief, niet in de game |
| 17 | **r-kermis** Botsauto's | vr 21 | T | Grote Markt (S) | Eén ritje met Durk en Douwe | Ze moeten iets verklappen | Uit de reuzen die Jelle helpen | Durk: "Vanavond bier, de Poelestraat" | helder (kermis "wordt opgebouwd" in de lead, de kalender zegt dat hij vandaag opent; zie §3) |
| 18 | **H11** Nog eentje dan | za 22 | A | Poelestraat (S) | Vier kroegen te voet | Geert: de reuzen zingen aan zijn bar | Direct uit r-kermis | Durk zingend: "De bal leit op it skûtsje" | helder (onthulling 1) |
| 19 | **H12** Fatbikes tellen niet als fiets | za 22 | T | Oude Ebbingestraat naar de Noorderhaven (S) | Te voet langs fatbikes naar Oma | Oma wil iets over de bal vertellen; de fatbikes zijn de proef | **Zwak**: twee redenen (Oma's verhaal, fatbikes) voor één missie | Oma Trijntje, 1953, Gerda Terpstra | onduidelijk (waarom die hindernis?), sterke mentorscène |
| 20 | **r-avond** Een avond thuis | zo 23 | T | Flat (S) | Naar huis | Tessa overhoort haar gids | Voorbereiding op H13 | Lead: "Morgen de rondvaartboot" | **onlogisch**: H13 staat op dezelfde dag (zo 23) |
| 21 | **H13** Alles klopt, behalve de papieren | zo 23 | A | Spilsluizen, Diepenring, Oosterhaven (S) | Rondvaart als gids, rustig varen | Klaas heeft een boot en ziet het skûtsje | Uit "de bal leit op it skûtsje" | De kus; ze zien het skûtsje | onduidelijk (waarom een rondvaart als gids? dekmantel niet uitgelegd) |

### Deel 3 · Staart, "Gronings Ontzet" (24-28 augustus)

| # | Stap | Dag | Sp. | Waar | Doel van de speler | Motief | Aansluiting op vorige stap | Briefing / scène | Oordeel |
|---|---|---|---|---|---|---|---|---|---|
| 22 | **s-boot** Bootje huren | ma 24 | A | Bootje Huren (S) | Huurboot (40) | "Het skûtsje gooit vandaag los" | Na de rondvaart | Sloep met een bel | **onlogisch**: H14 staat op di 25 en de recap zegt "morgen"; ook **herhaling** (derde boot in een rij) |
| 23 | **H14** Geleend van de Friezen | di 25 | T | Diepenring en Oosterhaven (S) | Skûtsje achterna, aan boord springen | De Eierbal zou aan boord zijn | Uit s-boot | Chocolade-bal met "Foar mem"; Jelle: de echte gaat "vanavond" met een ballon | helder; Jelle verklapt zijn plan live op de radio ("gezellig programma") |
| 24 | **s-proefvlucht** Naar Rotor Roelf | di 25 | A | Eelde (P, 10 km, Drenthe) | Naar de demoheli lopen of rijden | "Zoek de ballon van bovenaf" | Uit Jelles ballonplan | Rotor Roelf: gratis proefvlucht | onduidelijk (een reis van 10 km voor één scène; Eelde ligt niet in de provincie Groningen) |
| 25 | **H15** Het staat niet in het rooster | wo 26 | A | Eelde, UMCG, Oosterpark (P begin, S) | Lunch naar het UMCG, daarna Eierbal uit de ballon | Dijkstra's nachtdienst heeft honger; Jelle vliegt weg | Uit proefvlucht; maar de ballon was "vanavond" op di | Dijkstra belt; scène aan de lier | onduidelijk (twee losse doelen, drie nieuwe personages), sterk als setpiece |
| 26 | **s-carbid** Carbid schieten | wo 26 | T | Beijumerweg, boer Roelf (R, ongeveer 4 km) | Carbid schieten, de bal verstoppen | "De bal moet veilig staan tot het Ontzet" | Uit H15 | Bal in een melkbus | onduidelijk (waarom niet terug naar het museum? en er zijn nu twee Roelfs: Rotor en Boer) |
| 27 | **s-padel** Padel | do 27 | T | Padelbaan (S) | Eén partij | Durk en Douwe houden je een uur bezig (bewust raadselachtig) | Uit niets; Jelle plant H16 | "Waarom hebben die twee een autosleutel?" | helder als voorbode (betaalt uit in H16) |
| 28 | **H16** Iedereen heeft een rode auto gezien | do 27 | A (solo) | Westerhaven, station, overweg Peizerweg (S, 2,6 km west) | Escapade terughalen van de trein | Jelle stal hem (klomp met briefje) | Sterk uit padel | Mem Terpstra belt; ruzie; sorry | helder, het dieptepunt; waarom Jelle de auto steelt (de Fjord Frituur "zonder Fjord") staat er niet |
| 29 | **H17** Het bod viel tegen | do 27 | T | Nait Duur, volkstuin (1,7 km), bakker, Grote Markt (S) | Mosterd, eieren, stoetbrood zonder te remmen | Echte eierbal voor het Ontzet | Jelle biedt geld, wordt afgewezen | Boodschappen als missie, de keuze in de cutscène | onduidelijk (de titel zegt "bod", de missie is boodschappen: de verhaalbeat zit niet in het spel) |
| 30 | **H18** Ontzet, net als in 1672 | vr 28 | A | Grote Markt (S) | Kraam heel houden, Snackprijs | Finale | Uit H17 | Jury, Gerda's naam op het bordje, vijf woorden | helder |

**Verteld, maar niet te spelen:** Jelles vierstappenplan "Operaasje Aaibal" (D-definitief), de bal in de melkbus tot H17, waarom de Escapade nodig is voor de Fjord Frituur.

## 2. Stadsbias in cijfers

| Maat | Stad | Rand | Buiten Stad | Regio's van de provincie |
|---|---|---|---|---|
| Stappen (30) | 27 (90%) | 1 (3%), s-carbid | 2 (7%), s-proefvlucht en H15-start op Eelde (Drenthe) | 0 van 7 |
| Hoofdmissies (18) | 17 (94%) | 0 | 1 (6%), H15 | 0 |
| Activiteiten (12) | 10 | 1 | 1 | 0 |
| Bijbanen (10) | 10 (alle startpunten op de stadskaart) | 0 | 0 | 0 |
| Startpunt van een missie, afstand tot de Grote Markt | alle 17 binnen ongeveer 1,1 km, behalve H15 (10 km); de verste doelen zijn H16 (2,6 km) en H17 (1,7 km) | | | |
| Plekken binnen de Binnenstad (Grote Markt, Poelestraat, Ebbingestraat, Diepenring, Herestraat) | ongeveer 12-13 van 30 stappen (schatting) | | | |

- **Stappen per regio:** Hogeland 0, Eemsdelta 0, Wadkust 0, Westerkwartier 0, Oldambt 0, Veenkoloniën 0, Westerwolde 0. De kaart hoeft er nergens voor open.
- **De provincie als verhaal bestaat alleen als vrij spel** na de epiloog: de Ommeland-dorpen (28 regels), de wereldeinden (13) en De Koe van Ome Jan (32), samen 73 gesproken regels, tegenover ongeveer 370 regels verhaal in de stad (Verhaal-stappen 41, contact 80, scènes 82, berichten 64, missiescènes 76, kaarten 29).
- **Deel 4 zoals gepland** (PROVINCIE-VERHAAL §3): 32 hoofdmissies, waarvan O1 in de stad, O2 stad naar Hogeland, daarna 30 in zeven regio's (Hogeland 4, Eemsdelta 4, Wadkust 4, Westerkwartier 4, Oldambt 4, Veenkoloniën 5, Westerwolde 5), plus 28 zijmissies (allemaal provincie). Samen met Deel 1-3 is dat 50 hoofdmissies, 18 in de stad (36%). Het probleem is dus de volgorde: **de eerste 18 missies spelen (op de Eelde-vlucht na) allemaal in de stad, en de provincie komt pas na de epiloog.**

## 3. Waar de flow breekt, op volgorde van ernst

Zwaarste eerst. Verwijzing = bestand en regel (op `main` van 17 oktober 2026).

1. **Het hoofddoel ontbreekt.** Wat willen Tammo en Tessa met de Gouden Eierbal? Stelen (kraak H6), eerlijk winnen (H3 "wil je die bal eerlijk?", H17-H18), veilig houden (s-carbid) en terugbrengen naar het museum zijn vier verschillende doelen. De overgang van "stelen" naar "eerlijk" (H2 naar H3, `storyarc.js:262-270`) en van "kraken" terug naar "winnen" (na H6) wordt nergens gezegd. De "weigering" (Tammo: "Dat is de bal van Grunn") staat alleen in `D-definitief.md:~262`. Gevolg: de speler weet niet waarvoor hij speelt.
2. **De Snackprijs verschijnt zonder uitleg.** Eerste vermelding is de lead van H3 (`storyarc.js:270`). De Fjord Frituur, de inschrijving en artikel 4 (H6) hangen aan elkaar, maar de speler hoort ze in de verkeerde volgorde. Hoort in H1-H2.
3. **Tussen H6 en H11 is er geen spelersdoel.** H7 (decor met alibi), r-tuning en H9 (race) en H10 (vlag) volgen alleen uit Jelles acties en Rikus' beller. Het verhaal "waar is de bal?" ligt stil, tot Durk in H11 zingt. Dat zijn 8 stappen (11-18) zonder dat de spelers iets willen.
4. **Dagboekhouding spreekt tekst tegen.** (a) r-avond (`storyarc.js:446`, "Morgen de rondvaartboot") en H13 staan allebei op zo 23 (`calendar.js:50-55`). (b) s-boot (`:474`, "gooit vandaag los") staat op ma 24, H14 op di 25, en de Staart-recap zegt "Morgen gooit er een skûtsje los". (c) Jelles ballon gaat "vanavond" de lucht in (H14 `after`/radio, di 25), H15 staat op wo 26. (d) r-kermis (`:412`, "wordt opgebouwd") speelt op de openingsavond van de kermis (KALENDER). Alle vier zijn te herstellen met datums, zie §4.3, zonder nieuwe opnames.
5. **De provincie is niet aanwezig.** Zie §2. De enige uitstap is Eelde (Drenthe) en een carbidveld op 4 km, en die zijn niet als reis bedoeld maar als startpunt van een scène.
6. **Drie stappen in een rij zijn dezelfde boot.** H13 (rondvaart), s-boot (huren), H14 (skûtsje achterna) liggen op dag 23, 24 en 25. s-proefvlucht en s-carbid zijn ook losse verplaatsingsstappen: de scène zou in de missie moeten zitten. In totaal 5 van 12 activiteiten zijn "ga ergens heen en praat" (s-boot, s-proefvlucht, s-carbid, r-avond, k-nacht).
7. **Ongelegitimeerde motieven van Jelle.** Waarom steelt hij de Escapade (H16)? Waarom vertelt hij zijn ballonplan live op de radio (H14)? Waarom is de bal eerst zichtbaar in het museum en dan op een skûtsje? Het zijn grappen, maar zonder motief kunnen ze ook lezen als willekeur. Zijn vierstappenplan (D-definitief:~38) staat niet in de game.
8. **Te veel nieuwe personages per missie.** H15 introduceert Dijkstra, Rotor Roelf en (in s-carbid) Boer Roelf en Hilje. Er zijn twee Roelfs (Rotor en Boer), wat tijdens het spelen verwarring geeft. Een naamkaart is er (`CHARACTERS`), maar de band met de plot ontbreekt. Verder opvallend: Henk (eerste keer als stem aan de telefoon in k-nacht), Femke (H7), Hilly (H16, alleen een scène).
9. **Missietitels en -inhoud wijzen elkaar niet aan.** H17 "Het bod viel tegen" is een boodschappenmissie (`missions.js:528`); het bod en de afwijzing zitten in een cutscène. H12 "Fatbikes tellen niet als fiets" heet naar de hindernis, de beat is Oma's verhaal. H13: rondvaart als gids, maar niemand zegt dat het een dekmantel is.
10. **Briefings noemen het doel, niet de reden.** Voorbeelden: H9 (twee redenen in één lead, `storyarc.js:390`), H10 (`:402`, Bert staat op de Grote Markt, "fluiten maar"), H4 (`:283`, Bert wil dat iemand gaat kijken). De speler krijgt de opdracht, maar niet het "omdat".
11. **Spelerwissel Tammo/Tessa zonder zichtbare logica.** Elke stap wisselt van speler (alleen H16 is solo), met een `why`-regel. Het is bedoeld (Tessa rijdt en praat, Tammo sluipt en duikt), maar de wisseling valt niet samen met de scènes. (Laag.)
12. **Constitutie 3 versus de epiloog.** `PARTS.staart.card` (`storyarc.js:~150`) bevat "Het is koud." en "Van de winter ook niet. Alvast." terwijl constitutie 3 "altijd zomer, geen winter" zegt. KALENDER maakt er een grap van ("de stad is het er niet mee eens"). Laag, beslissing van de eigenaar.
13. **Deel 4 begint met een nieuwe schurk.** Ubbo Oldenhuis komt pas in O1 (15 september) in beeld, Jelle verdwijnt als hoofdschurk. Zonder voorbode in Deel 1-3 voelt Deel 4 als een tweede spel. (Midden.)
14. **Deel 4 is zelf repetitief.** Zeven regio's, elk met bondgenoot, tegenstander, setpiece en voorronde (O3-O32), plus 28 zijmissies; de speler kiest de volgorde, dus de aansluiting tussen missies moet per regio standhouden zonder eerste en laatste. (Risico, te plannen.)

## 4. Voorstel

### 4.1 Uitgangspunt

Eén doel dat de speler van begin tot eind kan opzeggen: **"De Fjord Frituur moet op 28 augustus op de Grote Markt staan, en de Gouden Eierbal moet in Stad blijven."** Elk beat hieronder zegt: wat willen ze, waarom nu, wat volgt eruit. Karakters, grappen en de hartlijn (1953, "Woist ja wel", "Moi", de vijf woorden) blijven. De Deel 4-lijn wordt niet aangeraakt, behalve dat we Ubbo vooraf zaaien.

### 4.2 De ruggengraat in 14 beats

| # | Beat | Stappen (nu) | Waar | Doel, motief en gevolg |
|---|---|---|---|---|
| 1 | **De droom en het geld** | opening, H1, k-eikea | Stad | Tessa wil de Fjord Frituur; ze hebben een flat en geen geld. H1/H2 zijn gewone klussen en zaaien Berend en Jelle. *Gevolg:* ze hebben geld nodig voor een luik en een vergunning. |
| 2 | **De roep** | H2 | Stad | Durk en Douwe pakken Tessa's pas; Sjabbe: de reuzen vragen naar het museum en de Snackprijs. Voeg hier in Sjabbes slot **de Snackprijs** toe (wat het is, wat de prijs is, "de bal gaat naar de winnaar van het Ontzet"). *Gevolg:* ze weten dat iemand de bal wil. |
| 3 | **Inschrijven** | H3 | Stad | De Snackprijs is de enige eerlijke kans: inschrijven kost 150, Jelmer betaalt voor content. Doel in beeld: "aan de start staan". *Gevolg:* ze doen mee, maar de bal staat in het museum en iemand loert. |
| 4 | **Wie loert er?** | H4, k-fiets, H5 | Stad | Bert ziet een zwarte trekker-limo, Sjoerd verklapt de drie minuten zonder camera's. Expliciet: Tessa: "Pakt een ander hem, dan is hij weg uit Stad." *Gevolg:* ze besluiten **hem eerst te pakken, als bewaking**, niet als buit. |
| 5 | **De kraak** | k-kraakspullen, k-nacht, H6 | Stad | Zelfde stappen. *Gevolg:* de vitrine is leeg, Jelle belt: hij pakte hem voor het reglement (artikel 4). Nu zijn zij verdacht en moet de bal terug. |
| 6 | **Onderduiken en het alibi** | r-trein, H7 | Stad | Politie zoekt twee mensen in het zwart; Femke geeft een alibi (decor). Maak het alibi expliciet. *Gevolg:* Kiekdoar: al het vet is opgekocht, Jelles stap 2. |
| 7 | **Het vet terug** | H8 | Stad naar **Hogeland** (voorstel) | Verplaats de start van de tankwagen naar Jelles opslag in een dorp in het Hogeland; de achtervolging gaat over de N-weg terug naar de Oosterpoort. *Gevolg:* Jelle wordt persoonlijk, de eerste "M." verschijnt. |
| 8 | **Persoonlijk** | r-tuning, H9, H10 | Stad | Jelle daagt uit (ring), hangt een vlag (stap 3: Stad vernederen). Laat Jelle in H9-H10 één keer zijn vierstappenplan zeggen. *Gevolg:* de reuzen worden het zwakke punt. |
| 9 | **De reuzen praten** | r-kermis, H11 | Stad | Durk verklapt de kroeg, dan het skûtsje. *Gevolg:* de bal ligt op het skûtsje, "mem wil hem niet eens". |
| 10 | **Waarom Jelle** | H12, r-avond | Stad | Oma vertelt over 1953 en Gerda. Maak de fatbikes Oma's proef ("kom heel bij me aan, dan vertel ik het"). *Gevolg:* Tammo en Tessa begrijpen dat Jelle een zoon is, geen schurk. |
| 11 | **Het skûtsje** | H13, s-boot (samen), H14 | Stad naar **Reitdiep** (Wadkust-rand) | H13 als gids is de dekmantel om te kijken; s-boot gaat op in het begin van H14. H14 loopt het Reitdiep op richting Zoutkamp, het skûtsje vlucht naar Friesland. *Gevolg:* chocola; "de echte gaat vanavond de lucht in". |
| 12 | **De ballon** | s-proefvlucht (samen), H15, s-carbid | Stad, **Ommeland** | Rotor Roelf en Dijkstra zitten in H15 zelf (geen aparte reis naar Eelde); de ballon drijft over het Ommeland en Jelle landt bij Ten Boer. s-carbid: de bal in een melkbus bij Boer Roelf (hernoem Rotor Roelf, zie §4.4). *Gevolg:* de bal is veilig, Jelle weet dat zij hem hebben. |
| 13 | **Het dieptepunt** | s-padel, H16 | Stad, **Westerkwartier** | De Escapade is de Fjord Frituur-wagen: dat is waarom Jelle hem steelt (zeg het). H16: Tessa achtervolgt over de spoorlijn naar Leeuwarden; de overweg verplaatst naar het Westerkwartier. *Gevolg:* Mem helpt, Tammo zegt sorry. |
| 14 | **De keuze en het Ontzet** | H17, H18 | Stad en **drie regio's** | H17: de boodschappentocht gaat langs drie dorpen (mosterd Veenkoloniën, eieren Hogeland, stoetbrood Stad), met Jelles bod als scène onderweg. H18 blijft op de Grote Markt. *Gevolg:* twee namen op het bordje. |
| 15 | **Epiloog, daarna Ubbo** | epiloog, Deel 4 | Stad, provincie | Zaai Oldenhuis Bakt als 41 snackbars in een Kiekdoar- of radioregel in H7-H12. Deel 4 begint dan als vervolg met een bekende naam. |

### 4.3 Wat blijft, wat gaat, wat versmelt

**Blijft zoals het is:** H1-H6, H8, H9, H10, H11, H12 (andere aanleiding), H18, de epiloog, alle personages, grappen en naamkaarten, de spelerwissel, de rubrieken op Nachtstreek.
**Versmelt** (de stap eindigt als aparte stap, de inhoud blijft): s-boot gaat op in het begin van H14; s-proefvlucht gaat op in het begin van H15 (de Rotor Roelf-scène speelt bij de heli aan het begin van de vlucht); k-nacht blijft als wacht-scène maar wordt geen aparte stap als het geen keuze is.
**Vervalt als aparte stap:** r-avond, als de scène in het begin van H13 past (de datumbreuk verdwijnt dan ook).
**Verplaatst naar de provincie:**

| Stap | Nu | Voorstel | Regio | Kost |
|---|---|---|---|---|
| H8 | Bornholmstraat naar Oosterpoort | begin bij Jelles opslag in een Hogeland-dorp, achtervolging terug | Hogeland (ring 1) | start- en doelcoördinaten, route; geen tekst als de intro de plek niet noemt (`missions.js:347` noemt Bornholmstraat) |
| H14 | Diepenring en Oosterhaven | het skûtsje vlucht het Reitdiep op naar Zoutkamp | Wadkust (rand) | route, water in de tegelwereld nodig |
| H15 | Eelde (Drenthe) begin en eind in de stad | heli start bij het UMCG of bij Roelfs pad in het Ommeland, ballon over het Ommeland | Ommeland, Hogeland | helipad, vliegroute; de tekst "ballon richting de Ommelanden" staat er al (`missions.js:462`) |
| s-carbid | Beijumerweg (4 km) | blijft; of een dorp als Ten Boer | Ommeland | optioneel |
| H16 | Westerhaven naar overweg Peizerweg | de overweg verplaatst naar het spoor Zuidhorn-Grijpskerk | Westerkwartier | start- en doelpunt; tekst noemt de Peizerweg niet in de lead, wel in de stage-tekst (`missions.js:~509`) |
| H17 | Nait Duur, volkstuin, bakker | drie dorpen | Veenkoloniën, Hogeland, Stad | tekst van de stages (`:536-538`), ze noemen de plekken en een prijs |

Het effect: de eerste 18 missies hebben dan 5 missies met een provincieonderdeel (H8, H14, H15, H16, H17), van 0 nu.

**Datums zonder nieuwe opnames** (`calendar.js:49-55`): r-avond naar za 22; s-boot, H14, s-proefvlucht en H15 allemaal op di 25 (de Staart-recap, "vandaag" en "vanavond" kloppen dan); s-carbid en s-padel op wo 26; H16 en H17 do 27. Tests: `node scripts/calendar_test.mjs`.

### 4.4 Teksten die herschreven moeten worden, met opnamestatus

**Status van alles hieronder: voice_coverage meldt 1725/1725, dus elke bestaande regel heeft een opname. Een wijziging aan een bestaande regel (sleutel = de tekst) laat de oude opname verweesd achter en vraagt een nieuwe. Alleen nieuwe regels kosten een nieuwe opname; wijzigingen aan data (dag, plek, volgorde, doel) kosten er geen. De TTS loopt via OpenRouter-credits; de eigenaar beslist.**

| Wat | Bestand en regel | Wat verandert | Opname |
|---|---|---|---|
| Sjabbes slot in H2: de Snackprijs uitleggen | `D-definitief.md:~258`, `missionstory.js` (H2-outro) | 2-3 nieuwe zinnen | nieuw, plus mogelijk herhaling van het slot |
| H3-lead "Wil je die bal eerlijk?" | `storyarc.js:270`, `missions.js:125` | vervangen door "We doen mee met de Snackprijs: inschrijven kost 150" | wijziging (stem opnieuw) |
| Het besluit om te stelen ("hem eerst pakken") | `storyarc.js:313-316` (k-kraakspullen lead), autogesprek | 1-2 regels | nieuw of wijziging |
| H9-lead: Harm én Jelle | `storyarc.js:390`, `missions.js:171` | één motief, Jelle uit de lead | wijziging |
| H10 en H9: Jelle zegt zijn vierstappenplan | contacts van H9/H10 | 1-2 radiozinnen | nieuw |
| s-boot-lead "vandaag" en recap "morgen" | `storyarc.js:474`, `PARTS.staart.recap` | niets, als de datums worden gecorrigeerd (§4.3) | geen |
| r-avond "Morgen de rondvaartboot" | `storyarc.js:446` | niets, als r-avond naar za 22 gaat | geen |
| s-proefvlucht samengevoegd in H15 | `storyarc.js:496-510`, `meet`-scène | de Rotor Roelf-regels verhuizen; lead verdwijnt | de regels blijven bestaan, alleen de lead vervalt |
| Rotor Roelf of Boer Roelf hernoemen | `SPEAKERS` (`storyarc.js:~62`), `CHARACTERS`, `carbid.js`, `missionstory.js` | een van beide krijgt een andere naam ("Rotor Roelf" blijft, "Boer Roelf" krijgt een verzonnen andere naam; keuze voor de eigenaar) | alle regels van Boer Roelf (carbid 19 plus scènes) opnieuw |
| H15: één doel (de ballon), de lunch als grap in de scène | `storyarc.js:513-546`, `missions.js:460` | lead en intro korter | wijziging |
| H16: waarom Jelle de Escapade steelt | intro van H16 (`missions.js:474`) | 1 regel | nieuw |
| H17: bod als scène onderweg, titel | `storyarc.js:589`, `missions.js:528-538` | lead en stages; titel "Het bod viel tegen" blijft | wijziging |
| Epiloog "Het is koud" | `storyarc.js:~150` | alleen op besluit (§5) | wijziging van 2 regels |
| Oldenhuis Bakt voorzaaien | Kiekdoar- of radioregel in H7-H12 | 2-3 nieuwe regels | nieuw |
| "Wat weten we?" bij elke stap | clues in `storyarc.js:~680-725` | een regel "Doel van nu" erbij | nieuw |

**Een goedkopere eerste ronde, zonder één nieuwe opname:** alleen datums (§4.3), volgorde, startpunten en doelen van H8, H14, H15, H16 (§4.3), plus samenvoegen van s-boot en s-proefvlucht. Daarmee valt breuk 4 en 5 en een deel van 6 weg, en de provincie komt in 5 missies. Breuken 1, 2, 3 en 7 vragen tekst.

### 4.5 Deel 4 en het voorstel

- Deel 4 blijft het vervolg (O1-O32, deel4-f4a/b/c.md). Het **begin** (O1: de takelwagen op de Vismarkt) kan blijven; O2 ("Oma's lijstje") wordt dan makkelijker omdat de speler de provincie al heeft gezien (H8, H14, H15, H16, H17).
- Zaai Ubbo (breuk 13) in Deel 1-3, anders blijft hij een vreemde.
- De ring-opbouw (ring 1 tot 4) blijft; de eerste ring heeft dan al een bekende plek per regio.

## 5. Open vragen voor de eigenaar

1. **Mag Deel 1-3 inhoudelijk veranderen?** PROVINCIE-VERHAAL zegt "de drie delen blijven zoals ze zijn". A: ja, ook de tekst (met opnieuw opnemen). B: alleen datums, volgorde, plekken en doelen (geen opname). *Voorstel: eerst B, daarna A voor breuk 1-3.*
2. **Motief van de kraak:** A: ze pakken de bal eerst, als bewaking, zodat hij in Stad blijft (en brengen hem terug na het Ontzet). B: Tessa wil hem als pand voor de vergunning. *Voorstel: A.*
3. **H14 (skûtsje) naar het Reitdiep richting Zoutkamp:** ja of nee? (Vraagt water in de tegelwereld.)
4. **H15 (heli):** A: de vlucht begint in Stad (UMCG) en de ballon drijft over het Ommeland. B: Eelde blijft het startpunt, als Drentse grap. *Voorstel: A.*
5. **s-boot, s-proefvlucht (en eventueel r-avond) laten opgaan in H14/H15/H13:** ja of nee? Dan vervallen 2-3 losse reisstappen (hun bestaande regels verhuizen).
6. **H16-overweg naar het Westerkwartier en H8-start naar het Hogeland:** ja of nee, of alleen H16?
7. **H17 als boodschappentocht langs drie regio's (mosterd, eieren, brood):** ja of nee?
8. **Ubbo en de epiloog:** zaaien we Oldenhuis Bakt in Deel 1-3 (ja/nee), en blijft "Het is koud" in de epiloog (ja/nee, constitutie 3)?

## 6. Bijlage: bronnen en tellingen

- Stappen: 30 (18 missies, 12 activiteiten). Delen: Kop 10, Romp 11, Staart 9. Spelers: Tessa 15, Tammo 15 (H16 solo).
- Voice coverage (17 oktober 2026): 1725/1725; verhaalgebieden: Verhaal-stappen 41, Verhaal-contact 80, Verhaal-scènes 82, Missie-scènes 76, Verhaal-kaarten 29, Berichten (verhaal) 64.
- Deel 4: DEEL4_STEP_DAYS en SPECIAL_DAYS (`open: false`) staan al in `calendar.js`; de stappen zelf staan nog niet in `STEPS`.
- Niet bekeken in beeld: alles in de tabellen; locatie en afstand zijn geschat uit de coördinaten.
