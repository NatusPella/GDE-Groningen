# Review van alle activiteiten — GDE Groningen 0.57.4

Datum: 6-11-2026. Bron: `main` op `41340dd4` ("Docs: reviewarchieven van de andere sessies
bewaard"), nieuwste release 0.57.4. Let op: tijdens deze review was een andere sessie in
dezelfde werkboom bezig (o.a. `missions.js`, `coopnet.js`, `savegame.js`, `scripts/`), dus
regelnummers kunnen een paar regels verschuiven; de bestandsnamen en de bevindingen niet.

Scope: **alle activiteiten** — verhaalmissies, bijbanen, carrières/loopbaan, minigames,
attracties, wedstrijden, verzamelen, veroveren en de endgame — met per onderdeel wat werkt,
wat stoort en hoe het beter kan (samen spelen, plezier, uitdaging, duidelijkheid, diepgang,
UI/UX). Dit is een **spelontwerp-review**, geen code review: de technische review van dezelfde
dag staat in [docs/archief/review-archief-2026-11-06/](../../docs/archief/review-archief-2026-11-06/RAPPORT.md).

Werkwijze: eerst een inventaris en cijferbasis uit de bron (kleine pure Node-imports van
`storyarc.js`, `coopstatus.js`, `vliegschoolrules.js`, plus de co-op-audit
`scripts/coopmissie_audit.mjs`), daarna per gebied een leesreview langs de modules, de docs en
de tests, en ten slotte deze synthese. Er is **niets runtime gespeeld**: geen Electron, geen
spel, geen sessie, geen volledige testsuite. Wat een mens op een scherm ziet, is dus niet
geverifieerd; waar de docs zelf zeggen "nog niet in beeld bekeken", staat dat erbij. De cijfers
en de manier waarop ze zijn nagerekend staan in `00-CIJFERS.md` in deze map.

## Samenvatting

1. **De inhoud is enorm en gevarieerd.** 30 verhaalmissies in vijf akten plus Deel 4, 47
   bijbanen, 26 vrije activiteiten, 20 vlieglessen, 19 loopbaanvakken, 5 postgame-uitdagingen,
   193+ prestaties, 13 zomerevenementen, 9 dorpsuitjes, 30 eierballen, 8 geheimen en 151
   veroverbare plekken. Er is nauwelijks een open-wereldgame van deze omvang met zo veel
   Nederlands/Gronings maatwerk.
2. **Het verhaal is de sterkste pijler en is bijna volledig samen te spelen.** Volgens de eigen
   audit zijn 29 van de 30 missies volledig samen; 1 missie is bewust solo. Dat is een prestatie
   die je in de communicatie veel meer mag uitdragen.
3. **Het grootste structurele gat zit in de herhaalbare inhoud, niet in het verhaal.** Van de 47
   bijbanen hebben er 5 een samen-regel (taxi, bezorger, krantenwijk, vracht, bus). Van de 26
   activiteiten kan een gast er 4 lokaal zelf doen (hengelen, pannenkoek, beiaard, boeren), 8 als
   gedeelde wedstrijd, en de rest is "bij wie het spel opende". De visie zegt "iedereen kan een
   opdracht, bijbaan of wedstrijd starten"; in de praktijk is een gast bij ruim drie kwart van de
   herhaalbare inhoud (naar rato van het aantal banen en activiteiten) toeschouwer.
4. **"Te doen" belooft één catalogus van alles, maar mist ongeveer tien activiteiten.** De lijst
   (`todo.js` + `activityTodoItems`) bevat 15-16 minigames; regatta, carillon, pannenkoekenschip,
   wandeling, snackketen, evenementen, hengelen, vlucht- en vaardienst, safehuizen en de
   PvP-arena komen er niet in (of alleen op de kaart). Dat is de goedkoopste grote UX-winst.
5. **Medailles en doelen worden te laat en te verspreid uitgelegd.** De eerste kaart bij een
   minigame legt de bediening uit, maar niet de medaille-eis; die staat voor een deel van de
   activiteiten alleen in het detail van "Te doen", en voor de rest nergens. De speler begint dus
   zonder te weten waar hij naartoe speelt.
6. **Er zijn drie progressies naast elkaar** (bijbaanniveaus op rondes, loopbaan op variatie,
   veroverde gebieden op "alles gedaan") plus prestaties en records. Elke is op zich logisch,
   maar samen is niet duidelijk welke je moet volgen om "beter" te worden; ze belonen ook
   tegenstrijdig gedrag (dezelfde baan herhalen versus juist nieuwe plekken zoeken).
7. **De uitdaging is redelijk maar vlak.** Medaille-drempels zijn meestal eerlijk, maar er is
   geen moeilijkheidskeuze, geen handicap, en na goud is er geen volgende trede. Herspeelwaarde
   leunt op medailles/records en op de verzamel- en veroverlussen; de activiteiten zelf krijgen
   zelden een variant, modifier of nieuwe baan.
8. **De endgame is sterker dan hij lijkt, maar verstopt.** "Veroverd" (5 lagen, 151 taken, titels
   en een provinciebeloning van €10.000) is een echte lange-termijnlus, maar zit in een sub-tab
   van Loopbaan; de postgame-uitdagingen (€200-700 per medaille) en de Fjord-Frituur (passief
   €250 per speldag) concurreren slecht met de missiebeloningen (samen €24.350) en met elkaar.
9. **Samen spelen is technisch ver maar voelt op veel plekken als "nog niet af".** De waarschuwing
   "Dit werkt nog niet samen" is netjes, maar komt bij de meeste bijbanen en attracties; een gast
   leest vooral wat hij níet kan. De groepsbonus (1+1=3: +50% loon per extra speler, tot 3×) is
   een sterk idee dat bijna nergens wordt uitgelegd of gevierd.
10. **De dokumentatie is uitzonderlijk netjes, maar de speeltest schuift mee.** Akten 2-5 zijn
    volgens `docs/PLAYTESTPLAN.md` door geen mens gespeeld; deze review is dus een leesreview en
    geen bewijs dat het leuk voelt. De aanbevelingen zijn gericht op wat je het eerst zou moeten
    laten spelen.

## Wat goed werkt (en dus moet blijven)

- **Verhaal en toon.** Dertig missies met eigen setpieces (kei-race, museumkraak, skûtsje,
  trekker-limo, bakken op de markt, Bourtange) en een echte rode draad met Jelle, Oma Trijntje en
  de Eierbal. De keuzes, clue/hart-kaarten, radio- en telefooncontacten en de Groningse stemmen
  geven de activiteiten een reden die verder gaat dan "nog een minigame".
- **Samen spelen in het verhaal.** 29/30 missies volledig samen, rollen per speler (heistrollen),
  groepscontrolepunten, gedeelde races, "Meedoen? J/N", geen verlies bij wegvallen, hostwissel.
  Dit is het beste multiplayer-verhaal in de Nederlandse hobbyruimte.
- **Eén stijl voor minigames.** `minigamekit.js` geeft elk spel hetzelfde bord, dezelfde
  tijdnotatie, kleuren met kleurenblind-varianten en een thematabel; `standactivity.js` zorgt dat
  prompt, kaarticoon en Ubbo-hint hetzelfde werken. Waar activiteiten dat volgen, voelen ze als
  één game.
- **Diepgang in de systemen.** Loopbaan met 19 vakken, 6 niveaus en titels; veroveren met 5 lagen
  en echte grenzen (Kadaster/CBS/BAG); 193+ prestaties; medailles en records per activiteit; de
  boerderij met gewassen, machines, dagprijzen en contracten. Er is voor liefhebbers echt iets te
  halen.
- **Geld blokkeert het verhaal nooit.** Eén verplichte aankoop van €150, laagste saldo €800 in het
  slechtste geval; met de helft van de missies overgeslagen eindigt de speler nog op €12.525.
  De economie ondersteunt de verhaalflow in plaats van hem te blokkeren.
- **Veiligheid en afspraken.** Geen echte merken/personen, altijd zomer, geen geweld buiten PvP,
  geen tracking, lokale saves, duidelijke docs en tests per systeem. Dat maakt de review prettig
  en de aanbevelingen concreet.

## Inventaris (wat er is)

| Soort | Aantal | Voorbeelden | Waar |
|---|---|---|---|
| Verhaalmissies | 30 (M01-M30) + 7 verhaalactiviteiten | M01 Nul krassen, M06 museumkraak, M11 skûtsje, M26 Ontzet | `storyarc_nieuw.js`, `missions*.js` |
| Bijbanen | 47 | taxi, krantenwijk, bus, vracht, veerdienst, zeeschip, loket, cabaret, boerderij, bietenoogst | `sidejobs.js`, `sidejob_*.js` |
| Vrije activiteiten | 26 | discgolf, pitch & putt, skatepark, kartbaan, zwembad, klimtoren, waterski, carillon, pannenkoekenschip, hengelen, regatta, vliegschool | `activities.js` |
| Vliegschool | 20 lessen (11 vliegtuig, 9 heli) | opstijgen, ringen, landen, slalom, noodlanding, hoveren | `vliegschoolrules.js` |
| Loopbaan | 19 vakken in 3 groepen, 6 niveaus | Spoor, Bus, Vracht, Water, Lucht, Handhaving, Podium, Landbouw, Padel, Golf, Vissen, Racen, Buiten | `loopbaan.js` |
| Postgame | 5 uitdagingen | bruggenrace, fierljeppen, skûtsje, Fjord Frituur, koe | `postgame.js`, `pg_*.js` |
| Zomerevenementen | 13 in de agenda + 8 per streek | kermis, markt, optocht, vuurwerk, concert, wielerronde | `evenementen.js`, `regioleven.js` |
| Ommeland | 9 dorpen met uitje + eierbal, 12 wereld-einden | tennis, quiz, molen, toren, wierde | `dorpsuitjes.js`, `ommelandlines.js` |
| Verzamelen | 30 eierballen, 8 geheimen | verstopt bij bezienswaardigheden | `achievements.js`, `geheimen.js` |
| Veroveren | 151 taken in 5 lagen | buurt €80 tot provincie €10.000 + titels | `gebieden.js`, `docs/GEBIEDEN.md` |
| Prestaties | 193 statische + per missie 3 | rijden, politie, verkennen, bijbaan, spoor, duif | `achievements.js` |

## Deel A — Verhaal en missies

**Wat er is.** Dertig missies in vijf akten plus Deel 4 "Nazomer" (M27-M30), met daartussen zeven
verhaalstappen die een activiteit vragen (kermis, carbid, padel, duif, enz.). De akten hebben elk
een eigen regio en thema: Stad (1), Hogeland/Waddenzee (2), Eemsdelta (3), Zuid (4) en Ontzet (5),
met Deel 4 als epiloog in Loppersum/Bourtange. De verhaalmotor kent minstens vijftien soorten
stappen (goto, hold, scene, chase, checkpoint/race, heist, pigeon, fatbike, boatchase, heli,
board, train, vault, bake, choice, rit, timing, convoy) en de missies wisselen daar goed mee.

**Wat goed werkt.** De rode draad (Eierbal, Jelle, Oma, Tessa/Tammo) is consistent, de teksten
zijn herschreven na drie leesrondes (koude lezer haalde 13,5 van 15 op de begripsquiz,
`docs/verhaal/REVIEWS-RONDE3.md`), en de setpieces zijn memorabel. De clue/hart-kaarten, radio- en
telefoonberichten en de keuzes geven de speler het gevoel dat hij iets doet dat blijft hangen.

**Bevindingen.**

- **Hoog — het tempo van de opening en twee scènes.** De botmeting
  (`docs/verhaal/BALANS-TEMPO.md`) laat zien dat de opening ruim zestig regels tekst heeft vóór
  het eerste echt speelbare moment, en dat `M01.intro` 1:40 duurt (de langste van het spel); ook
  `M16.outro` is 1:36. Dezelfde meting noemt de akten 1-5 in totaal 49 minuten cutscene. Dat is
  veel voor een speler die nog niet weet of hij het spel leuk vindt. Suggestie: knip de opening
  tot één scène en verplaats de eerste stunt/het eerste stuur naar binnen 2-3 minuten; houd de
  rest als optionele "terugblik" in de telefoon. (S/M, content)
- **Hoog — twee lange, langzame ritten.** M09 (eieren, 2,6 km met max ~7 m/s) en M10 (quad,
  5,4 km over wierdepaden) zijn volgens de eigen botmeting de langste nominale routes zonder
  actie; de bot faalde daar drie keer. Als een mens dat ook zo ervaart, zijn dit de twee missies
  die spelers laten afhaken. Suggestie: halveer de afstand of voeg onderweg een tussenstuk toe
  (een checkpoint met een keuze, een achtervolging, een korte scène); de pure regels
  (`missions_akte2.js`, `eieren.failAt 50`) maken dat goedkoop. (M, content)
- **Midden — één gat in de kaart.** Tussen M12 (Lauwersoog) en M13 (Eemshaven) zit geen reisstap;
  de bot legde daar 43 km af. In een doorlopend spel is dat een lange, lege rit. Voeg een
  reiskeuze toe (trein/bus/meerijden) zoals T1-T5, of leg M13 dichterbij. (S, content)
- **Midden — de tijdlimieten zijn aan twee kanten scheef.** M03 en M04 gebruiken minder dan 20%
  van hun limiet (28 van 180 s, 41 van 230 s), dus er is geen enkele spanning; M05 en M01 zitten
  juist tegen de rand. Maak de ruime limieten een medaille-eis ("binnen 1:00") in plaats van een
  fail-state, en houd de krappe als echte uitdaging. (S, regels/UI)
- **Midden — de helden winnen bijna alles tussen M06 en M20.** De eigen verhaalreview noemt dit
  expliciet als open punt: één echte tegenslag en een HUD-teller ("Gronings Ontzet over X dagen")
  zouden de inzet voelbaar maken. Suggestie: laat Jelle één keer winnen (met echte gevolgen, zoals
  een tijdelijk verlies van een bondgenoot of geld) en zet de kalender in de HUD. (M, content)
- **Midden — M18 en M21 zijn "een gok en een schijnkeuze".** Dat staat in de eigen review. Een
  keuze zonder gevolg is een gemiste kans; laat één keuze later terugkomen (een personage dat je
  wel/niet helpt, een kortere route, een andere scène). (M, content)
- **Midden — Deel 4 is niet gemeten of gereviewd.** De balans- en verhaaldocs gaan over M01-M26;
  `missions_akte6.js` zegt zelf dat niets in het spel is bekeken. Laat Deel 4 in dezelfde
  speeltest meelopen voordat je verder tunet. (S, proces)
- **Laag — de verhaalstappen die een activiteit vragen, zijn niet altijd even duidelijk.** Een
  speler die een verhaalstap als "ga naar de kermis" krijgt, moet zelf ontdekken dat het om de
  botsauto's gaat. De `goal`-typen in `storyarc_nieuw.js` zijn rijk genoeg; toon de activiteit
  bij de stap in "Te doen" en op de kaart met een eigen icoon. (S, UI)

**Suggesties in het kort.** (1) Opening comprimeren en binnen 3 minuten speelbaar maken.
(2) M09/M10 halveren of onderbreken. (3) Reisstap M12→M13. (4) Ruime timers omzetten in
medaille-eisen. (5) Eén echte tegenslag + kalenderteller. (6) M18/M21 echte gevolgen geven.
(7) Deel 4 in de speeltest.

## Deel B — Bijbanen en werkcarrrières

**Wat er is.** 47 bijbanen, grofweg in vier families:

- **Rit- en dienstbanen** (~24): taxi, stadsbus lijn 3, streekbus, krantenwijk, bezorger,
  fietsdepot, verhuizing, vracht (oplegger koppelen, laden, lossen), rondvaart, rondvaarttour,
  veerdienst, tjalke, zeeschip Lauwersoog/Eemshaven, bietenoogst, boerderij, de zes banen uit
  `bijbaanregels.js` (fietssoep, taxinacht, balenrit, berging, schoolrit, melkrit).
- **Simulatie-/paneelbanen** (~16): de tien keuzewerk-banen (loket, studiestaat, vigilantia,
  promotie, kamerkoning, wolkenhal, helix, niemeyer, bernard, energielabel) met elk drie
  multiple-choicevragen, de drie paneelbanen (strandpost, kermisdraai, brugdienst), rechtbank
  (dossier met drie vragen), cabaret (heckle-timing), BOA en snackoverlast.
- **Stadszijmissies** (8): museumbus, suikerbieten, herstelploeg, OOGTV, telefoonrave, Van der
  Meden, schouwburg, Bernhards karretje — pure regelmodules met een eigen verhaal.
- **Trein** (machinist): dienstregeling, reizigers, perrons, kaartjescontrole, conducteurrol in
  co-op.

**Wat goed werkt.** De basis is sterk: elke baan heeft een baas, een startplek, een blurb, een
loonrange en een niveau (5 treden: Nieuweling → Legende op 0/5/12/25/45 rondes). De telefoon-app
toont per baan afstand, loonrange en de reden waarom het nu niet kan ("eerst de politie kwijt",
"maak eerst je missie af"). De coöp-banen hebben echte rollen (passagier, tweede bezorger, helper,
bijrijder). De boerderij en de trein zijn echte systemen met eigen regels en tests.

**Bevindingen.**

- **Hoog — de kwaliteit per baan loopt sterk uiteen.** Een taxirit, een busdienst en een
  vrachtrit zijn echte minigames met voertuig, passagiers en regels; de tien keuzewerk-banen zijn
  drie multiple-choicevragen achter elkaar. In dezelfde lijst, met hetzelfde icoon en dezelfde
  "baan"-taal, voelt dat als twee spellen. Suggestie: noem de tekstbanen in de UI "kantoorklus"
  (kort, verhaaltje, geen voertuig) en de ritbanen "dienst"; geef elke familie een eigen
  HUD-rand/icoon en een eigen "Te doen"-groep. (S/M, UI/content)
- **Hoog — de niveau-opbouw telt rondes, de loopbaan telt variatie.** Een bijbaanniveau gaat op
  5/12/25/45 rondes van dezelfde baan; de loopbaan geeft juist 8 punten voor een nieuwe plek.
  Een speler die "zo hoog mogelijk" wil, wordt dus beloond voor herhaling, terwijl het
  loopbaansysteem variatie beloont. Suggestie: laat de bijbaanniveaus ook variatie tellen (eerste
  keer een nieuwe baan in hetzelfde vak +1 niveau-teller) en toon beide balken in één scherm met
  één zin uitleg. (M, systeem)
- **Midden — de eerste minuut is niet overal duidelijk.** Bij de meeste banen loop je naar een
  badge en druk je E; de telefoon-app geeft de context. Maar de HUD tijdens de baan (dots,
  progress, doel) is per baan anders, en de "wat moet ik nu"-vraag is bij de complexere banen
  (vracht, bus, boerderij) sterker dan bij de korte. Eén generiek "eerste ronde"-kaartje per baan
  met doel en besturing zou veel schelen. (S, UI)
- **Midden — boerderij is diep maar voelt als administratie.** Vijf gewassen, groei in speluren,
  machines huren/kopen, dagprijzen, contracten (max. 3, deellevering telt). De regels zijn mooi,
  maar de speler doet "taak na taak" met E vasthouden; de lol zit in de planning, niet in de
  handeling. Suggestie: maak één dagelijkse keuze prominent ("welk gewas vandaag, welke machine
  huren") en laat de werkgang korter/ritmischer zijn; toon de winst per perceel vóór het planten.
  (M, content/UI)
- **Midden — de trein is te passief voor de host.** Reizigers in- en uitstappen, op tijd rijden,
  kaartjes contoleren: het is een dienst, geen spel. De conducteurrol in co-op is een goed begin.
  Suggestie: geef de machinist één actieve vaardigheid (vloeiend remmen voor het perron, een
  score/medaille per dienst) en laat de conducteur echte keuzes maken (controle, conflict, gemiste
  halte). (M, content)
- **Midden — veerdienst, zeeschip en tjalke zijn duur/ver weg.** Tjalke betaalt €300-400 per ronde,
  zeeschip en veerdienst liggen aan de rand van de kaart. Dat is een mooie beloning voor de
  moeite, maar de speler moet weten dat ze bestaan; de telefoon-app sorteert op afstand, dus ze
  staan onderaan. Suggestie: markeer "verre, lucratieve banen" in de app en houd de reistijd
  zichtbaar. (S, UI)
- **Laag — de buurten/gebieden-telling gebruikt 39 van de 47 banen.** Voor "Veroverd" tellen 39
  bijbanen mee; de rest (o.a. de meeste keuzewerk-banen?) telt niet. Dat is een bewuste keuze in
  `gebiedenbronnen.js`, maar de speler ziet het verschil niet. (Zie Deel G.) (S, UI)

**Suggesties in het kort.** (1) Twee families met eigen naam/icoon/HUD: "dienst" (rit) en
"kantoorklus" (tekst). (2) Variatie ook in bijbaanniveaus. (3) Eerste-ronde-kaart per baan.
(4) Boerderij: dagelijkse keuze centraal, kortere werkgang. (5) Trein: één actieve vaardigheid +
conducteurskeuzes. (6) Verre lucratieve banen in de app uitlichten.

## Deel C — Loopbaan, uitdaging en endgame

**Wat er is.** 19 vakken in drie groepen (Vervoer, Werk, Sport en spel), zes niveaus met drempels
0/50/140/300/560/950 en loonfactor 1,00 → 1,30, plus een functietitel per niveau en een sfeer per
vak (`carrieresfeer.js`). Voedingsbronnen: bijbaanrondes (8 punten, 10 zonder fout), unieke
plekken (+8), kilometers, potjes, wedstrijden en prestatietellers. Daarnaast medailles en records
per activiteit/missie, 193+ prestaties en het endgame: 5 postgame-uitdagingen, de Fjord Frituur en
het Veroverd-systeem (151 taken, 5 lagen, titels, €80 tot €10.000).

**Wat goed werkt.** De loopbaan is een van de beste systemen van het spel: het geeft elke
activiteit een plek in een groter geheel, de titels zijn grappig en verzonnen, de sfeer per vak is
verzorgd, en de factor is bewust begrensd (+30%) zodat hij de rest van de economie niet sloopt.
De docs (`docs/LOOPBAAN.md`) leggen haarfijn uit waar punten vandaan komen en de balanstest bewaakt
de verhoudingen.

**Bevindingen.**

- **Hoog — de speler kan niet zien wat hij moet doen om een vak te laten groeien.** Het
  loopbaanscherm toont niveau, titel, balk en "wat je in dit vak deed", maar niet de eerstvolgende
  stap in gewone taal ("nog 2 nieuwe plekken of 6 rondes tot niveau 3"). Suggestie: één regel per
  vak "eerstvolgende stap" plus een knop "waar kan ik dat doen" die de bijbehorende banen/plekken
  in "Te doen" zet. (S, UI)
- **Hoog — drie medaille-economieën door elkaar.** Missies betalen bij een medaille 15/25/40% van
  de missiebeloning; de vliegschool €25/€40/€60; de postgame €200/€400/€700; de losse activiteiten
  €10-20 premie via de prestatieteller. De speler kan die bedragen niet vergelijken en weet dus
  niet waar een medaille het meeste waard is. Suggestie: toon naast elke medaille het bedrag en de
  loopbaanpunten, en maak één "medaille-uitleg" die overal hetzelfde is. (S, UI)
- **Midden — de loonfactor is te zwak naast de andere bonussen.** De loopbaan geeft +30% op het
  hoogste niveau, terwijl een bijbaan zelf al ×1,5 basis heeft, het niveau-deel op niveau 5 ×1,6 is
  (`SIDEJOB_PAY_MULT × (1 + 0,15 × 4)`), een reeks tot ×1,6 komt en de groepsbonus tot ×3 gaat. Een
  speler die jaren in één vak stopt, ziet daar weinig van terug. Suggestie: geef hoge niveaus ook
  niet-geldelijke voordelen (een unieke titel naast je naam, korting, een speciale klus/contract,
  een eigen kleur op de kaart). (M, systeem)
- **Midden — na goud is er niets.** Medailles gaan tot 3; records zijn lokaal en worden alleen in
  "Te doen" getoond. Er is geen volgende trede, geen variant, geen dagelijkse uitdaging, geen
  spook/leaderboard. Suggestie: (a) toon in de resultaatbanner "nog 0:04 tot zilver"; (b) voeg per
  activiteit één variant toe die na de eerste medaille opengaat (andere baan, snellere AI,
  wind, tijdattack); (c) één lokale "uitdaging van de dag" die rouleert over de pure spellen — dat
  kan volledig offline met de bestaande seeds. (M, content/UI)
- **Midden — de postgame is klein naast Veroverd.** Vijf uitdagingen van €200-700 en een Fjord die
  €250 per speldag (24 min) geeft; Veroverd geeft titels en tot €10.000. De postgame voelt daardoor
  als een sidequest naast de echte endgame. Suggestie: verhoog de eenmalige postgame-prijzen
  (bijv. €500/€1.000/€1.500) en maak de Fjord een investeringslus (upgrades die de dagomzet
  verhogen; nu is de basis €250/dag al veel). (M, balans)
- **Midden — de Fjord is een geldautomaat.** Na het verhaal verdient hij passief €250 per speldag,
  zonder dat de speler iets doet. Dat is leuk als "je bent binnen", maar het ondermijnt de
  bijbanen (taxi €25-60 per ronde). Suggestie: laat de speler de wagen moeten openen/beheren
  (voorraad, prijs, drukte) voor de dagopbrengst, of maak de passieve opbrengst kleiner en de
  actieve shift groter. (M, systeem)
- **Laag — de "Veroverd"-catalogus is niet zichtbaar.** Zie Deel G: 151 taken, maar de speler
  ziet niet welke telling geldt en waarom sommige activiteiten niet meetellen. (S, UI)

**Suggesties in het kort.** (1) "Eerstvolgende stap" per vak. (2) Eén medaille-uitleg met bedrag
en punten. (3) Niet-geldelijke voordelen voor hoge niveaus. (4) Medaille-variant + "nog X tot
zilver" + lokale daily. (5) Postgame-prijzen omhoog, Fjord als investering. (6) Veroverd-telling
zichtbaar.

## Deel D — Minigames en attracties

**Wat er is.** 26 activiteiten in `activities.js`, met een eigen plek, prompt, kaarticoon en
meestal een medaille/record: discgolf, pitch & putt, skatepark, kartbaan, ringrace, zwembad,
klimtoren, waterski, vliegschool (20 lessen), hengelen + visboek (29 soorten), regatta, padel,
driftzones, carbid, kermis/botsauto's, reuzenrad, carillon, pannenkoekenschip, wandeling Winsum,
snackketen, geheimen, safehuizen, evenementen, vlucht- en vaardienst, PvP-arena, en de boerderij
als lokale gastactiviteit. De meesten hebben een pure regelmodule plus test (ADR 0005).

**Wat goed werkt.** De vaardigheidsspellen zijn echt goed: discgolf met wind en disc-keuze, pitch
& putt met groenlezen, kartbaan met drift-boost, skatepark met trick-ketens, klimtoren met
armbeheersing, zwembad met keerpunten, waterski met saltopogingen, vliegschool met twintig
gevarieerde lessen, hengelen met watertypen/weer/nacht en een visboek. De sfeerattracties
(carillon, pannenkoekenschip, carbid, reuzenrad) zijn uniek Nederlands en verdienden meer aandacht.
De gedeelde HUD (`minigamekit.js`) en de startkaarten met bediening zijn een sterke basis.

**Bevindingen.**

- **Hoog — twee soorten activiteiten worden hetzelfde gepresenteerd.** Echte spellen (discgolf,
  kart, skate, klim, zwem, vliegen, hengelen) en sfeer/eenmalige dingen (reuzenrad, carillon,
  pannenkoek, wandeling, snackketen, evenementen) staan in dezelfde lijst met dezelfde prompt.
  Een speler weet vooraf niet of hij een uitdaging van 90 seconden of een leuk uitstapje van 2
  minuten krijgt. Suggestie: label ze in "Te doen" en op de kaart (Wedstrijd / Uitje / Beheer /
  Verhaal) en geef ze een andere icoonvorm. (S, UI)
- **Hoog — de medaille-eis staat niet bij de activiteit.** De prompt toont je record, de startkaart
  de bediening; de eis (bijv. "goud binnen 1:04") staat alleen in het detail van "Te doen" voor
  een subset. Daarmee mist de speler het doel. Suggestie: één generiek startkaartje met "Doel:
  …", "Medailles: …", "Beloning: …", "Samen: J/N", "Record: …". `minigamekit.js` en
  `standactivity.js` kunnen dat als standaard krijgen. (S, UI)
- **Midden — niet elke activiteit heeft een meetbaar doel.** Reuzenrad, snackketen, safehuizen en
  evenementen hebben geen medaille/record; ze tellen alleen als stat. Daardoor voelen ze als
  decoratie. Suggestie: geef ze een teller of verzameldoel (rondjes, keten-omzet, huizen,
  evenementen bezocht) en toon dat in "Te doen". (S/M, content)
- **Midden — na de eerste medaille is er geen tweede laag.** Geen varianten, geen moeilijkere
  baan, geen tegenstander-niveau. Suggestie: per spel één "volgende uitdaging" (langere baan,
  hardere wind, snellere AI, geen hulp) die opengaat na de eerste medaille, met dezelfde pure
  regels en een eigen record. (M, content)
- **Midden — bediening en conventies verschillen.** De ene activiteit stopt met Backspace, de
  andere met B; hengelen gebruikt I, de rest E; de startkaart van discgolf noemt acht toetsen in
  één zin. Suggestie: één "kernbesturing" (2 regels) + "meer" in de kaart, en één stop-conventie
  voor alle activiteiten. (S, UI)
- **Midden — hengelen kan de bijbanen qua inkomen voorbijstreven.** Volgens de eigen docs levert
  hengelen 120-270 euro per uur (met alles ontdekt tot ~400), terwijl een taxironde €25-60 kost.
  Dat is niet per se fout (vissen is een vak), maar het maakt werken minder aantrekkelijk. Laat de
  vangstprijs meeschalen met zeldzaamheid/plek en houd de uurloonverhouding binnen dezelfde orde
  als de bijbanen. (M, balans)
- **Midden — de kermis is tijdgebonden en daardoor makkelijk te missen.** Botsauto's en het
  reuzenrad zijn er alleen 's avonds; carbid bij schemer; evenementen op één dag. De sfeer is
  geweldig, maar een speler die overdag speelt, ziet ze nooit. Suggestie: toon in "Te doen" en op
  de kaart "vanavond 19:00-01:00" en stuur één telefoonbericht als het bijna zover is. (S, UI)
- **Laag — de vliegschool is 20 lessen maar de UI-tekst zegt 13.** `todo.js` zegt "Zes lessen met
  het vliegtuig en zeven met de helikopter"; `vliegschoolrules.js` heeft 11 + 9. Maak van de
  vliegschool een leslijst met per les de medaille en een "volgende les"-knop; dat maakt 20 lessen
  behapbaar. (S, UI)
- **Laag — het reuzenrad heeft geen medaille/record.** Het is een mooie attractie met een eigen
  `todo`-regel (#436), maar zonder doel. Geef het een klein doel (bijv. "bekijk de stad vanaf de
  top" of een foto-moment) en tel het mee. (S, content)

**Suggesties in het kort.** (1) Activiteiten labelen (wedstrijd/uitje/beheer/verhaal). (2) Eén
standaard startkaart met doel, medailles, beloning, samen, record. (3) Tellers voor de
sfeerattracties. (4) Variant na de eerste medaille. (5) Eén besturings- en stopconventie.
(6) Hengelen-balans. (7) Kermis/evenementen aankondigen. (8) Vliegschool-lijst + tekst fixen.

## Deel E — Samen spelen

**De belofte (docs/MULTIPLAYER-VISIE.md).** Alle spelers gelijkwaardig, de opener is alleen de
wereld; tijd, reizen, slapen, laden en pauzeren zijn gezamenlijke keuzes; meedoen is J/N; elke
speler is lokaal de hoofdpersoon; volledige beloning; niemand verliest iets; elke nieuwe activiteit
krijgt een samen-regel.

**De praktijk (geverifieerd in `coopstatus.js`, `coopgast.js`, `coopbijbaan.js`, de audit).**

| Soort | Werkt | Deels | Nee | Praktijk |
|---|---|---|---|---|
| Missies | 29/30 volledig | 0 | 0 | 1 solo (M21, bedoeld) |
| Bijbanen | 5 | 0 | 42+ | taxi, bezorger, krantenwijk, vracht, bus |
| Activiteiten | 13 | 7 | 7 | 4 lokaal voor een gast (hengelen, pannenkoek, beiaard, boeren), 8 als wedstrijd |
| Minigames/wedstrijden | 3 | 0 | 9 | padel, kartrace, bruggenrace; heli, duif en postgame niet |
| Voertuigen | 12 | 1 | 2 | trein deels; trekker en heli nee |

**Wat goed werkt.** De missiecoöp is uitzonderlijk: 150 stappen, rollen per speler, gedeelde
controlepunten, "wacht op de groep"-scènes, geen verlies bij wegvallen, hostwissel, en de
1+1=3-groepsbonus (+50% per extra speler, tot 3×). De gast kan lokaal hengelen, pannenkoeken
bakken, de beiaard bespelen en boeren; hij ziet zijn eigen lichaam stilstaan bij de host en zijn
eigen voortgang in zijn eigen opslag. De "Meedoen? J/N"-kaart met 10 seconden en de wedstrijden
met gezamenlijke start zijn goed doordacht.

**Bevindingen.**

- **Hoog — de verhouding voelt scheef: verhaal samen, de rest vooral alleen.** Een gast kan 4 van
  de 26 losse activiteiten zelf doen en 5 van de 47 banen meedoen. Dat is precies het deel van het
  spel waar je als vrienden het langst blijft hangen (geld verdienen, medailles halen), en daar
  is de gast meestal toeschouwer. Suggestie: kies een groeipad per categorie (zie de
  prioriteitenlijst) en communiceer het als "nu samen" in plaats van "nog niet samen". (L,
  systeem/content)
- **Hoog — een gast leest vooral wat hij niet kan.** De waarschuwing is eerlijk en verschijnt
  vóór de start, maar bij de meeste markers staat "Alleen bij wie het spel opende". Dat is een
  slechte eerste indruk van Samen spelen. Suggestie: draai de boodschap om — "Samen kan: taxi,
  bezorgen, krantenwijk, vracht, bus, hengelen, pannenkoeken, beiaard, boeren, padel, kart, golf,
  discgolf, klimmen, skaten, ringrace" — en toon die lijst één keer in de wachtkamer. (S, UI)
- **Midden — de "Meedoen?"-stroom is goed maar eenrichtingsverkeer.** De opener start een missie
  of baan, de gast krijgt een kaart. Als de opener een solo-attractie doet (zwembad, kermis,
  vliegschool), krijgt de gast niets om te doen. Suggestie: geef de gast een "eigen plan"-kaart
  ("Doe intussen: hengelen, boeren, pannenkoeken, of verken de stad") en laat hem zelf een
  activiteit starten die de wereld niet raakt; dat bestaat al (GAST_ACTIVITEITEN), maar wordt niet
  aangeboden. (M, UI/content)
- **Midden — verhaal-keuzes zijn van de opener.** Dat staat als open besluit in
  `docs/DESIGN-SCHULD.md`; de gast leest "X kiest:". Voor een spel dat "alle spelers gelijk"
  als eerste principe heeft, is dit de grootste principiële afwijking. Suggestie: laat de groep
  stemmen bij keuzes met gevolgen (zoals de slaap/tijdstemming al werkt) of laat de gast ten
  minste één keer per akte de keuze maken. (M, systeem)
- **Midden — de opener pauzeert de wereld voor iedereen.** Een menu, de kaart of een winkel van de
  opener laat de wereld bij de gasten stilstaan; de designregel zegt dat een menu alleen de
  persoon zelf mag pauzeren. Dat is de "grootste afstand tot de visie" volgens de eigen designschuld.
  Suggestie: maak schermen die de wereld niet veranderen zacht (alleen eigen speler stil), net als
  reizen en de fotomodus al doen. (M/L, systeem)
- **Midden — de groepsbonus wordt niet gecommuniceerd.** 1+1=3 is een van de beste sociale
  ontwerpbeslissingen, maar de speler ziet alleen een geldbedrag. Suggestie: split de banner in
  "basis + groep + jouw niveau" en noem de factor één keer in de wachtkamer/uitleg. (S, UI)
- **Midden — PvP is "deels".** De host rekent en ziet het bord; de gastenkant van het bord is nog
  open (#454). Suggestie: maak het bord gast-synchroon (het is een klein, puur scorebord) en voeg
  een tweede arena/regel toe (bijv. alleen vuisten, of alleen voertuigen) voor variatie. (M,
  content/systeem)
- **Laag — geen sociale vormen buiten pings.** "Kom hier", "Help!", "Kijk daar" zijn goed, maar er
  is geen chat/emote. Suggestie: een emote-wiel met bestaande, ingesproken korte kreten (geen
  moderatieprobleem, geen chatopslag) en een "duim"/"dank" bij een medaille van een ander. (S,
  content)
- **Laag — de eerste start zet je zomaar in een openbare sessie als je "ja" zei.** Sinds de
  toestemming en het sessie-id-lek (#583) is dat veiliger, maar "meedoen" is niet hetzelfde als
  "openbaar". Suggestie: standaard "alleen" en een expliciete keuze "openbaar of besloten" bij de
  eerste start, met de uitleg in één zin. (S, UI/proces)

**Suggesties in het kort.** (1) Groeipad voor gedeelde inhoud. (2) Positieve "samen kan"-lijst.
(3) "Eigen plan"-kaart voor gasten. (4) Stemmen bij verhaal-keuzes. (5) Menu's pauzeren alleen jezelf.
(6) Groepsbonus zichtbaar. (7) PvP-bord voor gasten. (8) Emote-wiel. (9) Openbaar/besloten expliciet.

## Deel F — UI/UX en duidelijkheid

**Wat goed werkt.** "Te doen" is de beste ingang van het spel: groepen (missies, minigames,
bijbaantjes, ommeland, verzamelen, na het verhaal), status (nu/klaar/later/op slot), afstand,
"zet als doel", detailkaart met medailles/records en een knop "Alles te doen". Het HUD gebruikt
korte kaarten met een woordbudget (`hudtext.js`), de kaart heeft eigen iconen per activiteit, en
toegankelijkheid (kleurenblind, tekstgrootte, beweging beperken) is serieus genomen.

**Bevindingen.**

- **Hoog — "Te doen" is niet compleet.** `todo.js` zegt zelf "one catalogue of everything there is
  to do", maar de catalogus bestaat uit `minigameItems` (15-16 minigames), missies, bijbanen,
  ommeland, verzamelen en postgame. Van de 26 activiteiten ontbreken in de catalogus: regatta,
  carillon, pannenkoekenschip, wandeling Winsum, snackketen, evenementen, hengelen, vluchtdienst,
  vaardienst, safehuizen en de PvP-arena; alleen het reuzenrad brengt via `activityTodoItems` een
  eigen regel mee. Ze staan wél op de kaart (via `legend`/`standActivity`), dus de speler ziet een
  icoon zonder dat het in de lijst staat. Suggestie: geef elke activiteit een `todo`-regel (het
  patroon van het reuzenrad) en laat "Te doen" dezelfde bron gebruiken als de kaart. (S, UI)
- **Hoog — doel en beloning staan niet vóór de start.** De prompt zegt "Druk E" en je record; de
  startkaart zegt de bediening. De medaille-eis, het geld, de loopbaanpunten en de samen-status
  staan verspreid of nergens. Suggestie: één standaard startkaart (zie Deel D) en één regel op de
  kaart-hover. (S, UI)
- **Midden — terminologie wisselt.** "Minigames", "activiteiten", "bijbaantjes", "klussen",
  "diensten", "potjes", "rondes" door elkaar; de pauzemenu-rail noemt "Activiteiten", "Te doen"
  noemt de groep "Minigames". Kies één woord per niveau en gebruik dat overal (spelerstekst,
  knoppen, docs). (S, UI)
- **Midden — verouderde teksten.** De vliegschool zegt 13 lessen i.p.v. 20; controleer ook de
  aantallen bij eierballen/geheimen/gebieden en de "X van Y"-teksten in "Te doen" tegen de bron.
  Een kleine `todo_tekst_test` die aantallen uit de modules vergelijkt zou dit structureel
  voorkomen. (S, test/UI)
- **Midden — de kaart is rijk maar niet zelfverklarend.** 26 activiteitslagen, winkels, garages,
  bijbanen en wedstrijden; de legenda bestaat, maar de hover/klik geeft niet altijd "wat levert
  dit op" en "heb ik dit al". Suggestie: hover-kaart met naam, status (nieuw/gedaan/medaille),
  beloning en "zet als doel"; filter "toon alleen wat ik nog niet deed". (M, UI)
- **Midden — de eerste tien minuten leggen niet uit wat er allemaal te doen is.** De onboarding
  (5 kaarten) richt zich op het verhaal en de basis; een nieuwe speler ziet niet dat er 47 banen,
  26 activiteiten en 151 veroverbare plekken zijn. Suggestie: bij de eerste keer "Te doen" openen
  een korte telling ("Er is hier 151 dingen te doen; dit zijn de eerste drie") en een
  "begin hier"-route. (S, UI)
- **Midden — kleine letters en contrast op de HUD.** `docs/DESIGN-SCHULD.md` noemt 11 px-teksten
  (dronken-chip, kaart-subregel, duif-combo) en twee focusringen; de kleurenblindmodi zijn
  getest, maar niet met een echte kleurenblinde speler. Neem de 12 px-regel mee in de
  activiteitenschermen en test op 720p/Steam Deck. (S/M, UI)
- **Laag — touch en controller.** De activiteiten zijn toetsenbord-first; sommige panelen hebben
  touch-knoppen (`minigamekit` cellen), maar er is geen systematische controle per activiteit.
  Maak een lijst "per activiteit: toetsenbord/controller/touch" en dicht de gaten. (M, UI)

**Suggesties in het kort.** (1) "Te doen" compleet maken. (2) Standaard startkaart. (3) Eén
woordenlijst. (4) Aantallen-test. (5) Rijkere kaart-hover/filter. (6) Eerste-keer-telling.
(7) 12 px-regel en Deck-test. (8) Invoer per apparaat controleren.

## Deel G — Veroverd, Ommeland en verzamelen (Lead)

Deze drie lussen vallen tussen de deelgebieden in en zijn te belangrijk om te vergeten.

**Veroverd (gebieden).** Dit is de sterkste lange-termijnlus van het spel: 151 taken (30 missies,
39 bijbanen, 50 minigame-plekken, 24 vondsten, 8 geheimen) verdeeld over buurt, wijk, woonplaats,
gemeente en provincie, met titels, vlaggen, geld (€80 tot €10.000) en een safehouse per wijk of
woonplaats. Het is satire zonder geweld en past perfect bij "de provincie van jou maken".
Maar: het zit verstopt in **Loopbaan › Veroverd**, de catalogus sluit bewust een aantal dingen uit
(eierballen, geheimen, postgame, lucht, dorpsuitjes) en gebruikt 39 van de 47 bijbanen, dus de
speler die "alles" wil doen ziet een andere telling dan de speler die de rest van het spel ziet.
Advies: maak Veroverd een eigen tab naast Loopbaan, toon de eerstvolgende 3 taken in "Te doen",
en maak de catalogusregel ("wat telt mee") zichtbaar in het scherm. (M, UI)

**Ommeland.** 9 dorpen met elk een uitje, een eetplek, een fietsverhuur en een verstopte eierbal,
plus 8 streken met zomerontmoetingen en vondsten, 13 evenementen en 12 wereld-einden. Dat is samen
een echte "provincie verkennen"-lus, maar de speler krijgt hem bijna alleen via de trein en de
kaart; er is geen overzicht "welke dorpen heb ik gedaan" buiten "Te doen". Advies: één
Ommeland-paspoort (dorpen, eierballen, vondsten, evenementen) met dezelfde voortgangstaal als
Veroverd, en de trein als snelle reis ernaartoe belangrijker maken. (M, UI/content)

**Verzamelen.** 30 eierballen en 8 geheimen zijn klassieke collectibles; de eierballen betalen €50
per stuk en €1.000 als je ze alle 30 hebt. Dat is een prima beloning, maar de hints (wandkaart
thuis, Ubbo) zijn makkelijk te missen. Advies: een "bijna compleet"-hint bij 80% en een teller op
de kaart per gebied. (S, UI)

## Cross-cutting thema's en aanbevelingen

### 1. Ontdekbaarheid: één catalogus die echt alles bevat (Hoog, S/M)
`todo.js` zegt zelf "one catalogue of everything there is to do"; maak dat waar. Elke activiteit
krijgt een `todo`-regel (zoals het reuzenrad al doet) of komt in `minigameItems`, met groep,
status, medaille, record, afstand en "zet als doel". Voeg de ontbrekende activiteiten toe en laat
`coopstatus` dezelfde lijst gebruiken, zodat "werkt samen / deels / nee" ook in "Te doen" staat.
Dit is de grootste UX-winst per uur werk.

### 2. Doel en beloning vóór de start (Hoog, S/M)
Toon bij de prompt of op de eerste kaart: wat je gaat doen, welke medaille-eis geldt
(brons/zilver/goud), wat het ongeveer oplevert (geld, loopbaanpunten, record) en of het samen
werkt. De gegevens bestaan al (`MISSION_GOALS`, `medalFrom`, `mgThema`, `samenStatus`); het is
vooral één patroon voor alle activiteiten in plaats van per module.

### 3. Samen spelen: van "kan niet" naar "kan wél" (Hoog, M/L)
De techniek is ver genoeg om meer te beloven. Kies per categorie een eerlijke ambitie:
- **Bijbanen:** breng de 5 bestaande coöp-banen in de buurt en voeg de volgende 5-8 toe (bus,
  rondvaart, veerdienst, rechtbank, cabaret, loket) met dezelfde "helper"-rol als krantenwijk.
- **Activiteiten:** maak van de 7 "deels"-activiteiten een eerlijke keuze: of gasten kunnen ze
  lokaal spelen (zoals hengelen), of ze worden als wedstrijd aangeboden. Laat de rest met rust,
  maar noem het niet in de eerste minuut.
- **Communicatie:** toon "Samen: J/N" en de groepsbonus (1+1=3) op de startkaart en in de
  resultaatbanner ("+50% groep"), en vervang de algemene "werkt niet samen"-toast door een
  concrete tip ("Doe dit in je eigen spel; samen kan wel X").
- **Gasten zonder eigen activiteit:** geef ze een "meekijk-klus" (foto's maken, route uitzetten,
  kluis bewaken) in plaats van alleen een waarschuwing.

### 4. Progressie: één verhaal, drie balken (Midden, M)
Loopbaan, bijbaanniveau en Veroverd meten alle drie iets anders. Zet ze in één scherm naast elkaar
(of verwijs ernaar) en leg in één zin uit wat elke balk beloont: "deze baan wordt beter als je hem
vaak doet" vs "dit vak wordt beter als je varieert" vs "dit gebied is klaar als je alles deed".
Beloon variatie in de bijbaanniveaus ook (bijv. een bonus voor een nieuwe baan in hetzelfde vak),
zodat de twee systemen niet tegenstrijdig zijn.

### 5. Uitdaging en herspeelbaarheid (Midden, M)
- Voeg per minigame één **variant** toe die opengaat na de eerste medaille (andere baan-layout,
  tegenstander sneller, tijdslimiet, wind, of een "goud+"-doel). Dat is met de bestaande pure
  regelmodules goedkoop.
- Toon na een medaille de **volgende drempel** ("nog 0:04 tot zilver") in de resultaatbanner; dat
  is de goedkoopste herspeelprikkel die er is.
- Geef de activiteit zonder medaille/record (reuzenrad, snackketen, safehuizen, evenementen) een
  teller of verzameldoel, zodat ook zij ergens meetellen.

### 6. Endgame en economie (Midden, M)
- Maak Veroverd zichtbaar als eigen tab en als "nog 3 taken tot de titel van deze wijk".
- Herbalanceer de postgame: de uitdagingen (€200-700) zijn klein tegenover de missies en de
  Fjord-passieve €250/dag; geef de uitdagingen een grotere eenmalige prijs of een blijvende
  upgrade, en maak de Fjord een echte keuze (investeren, upgraden, dagelijkse omzet) in plaats van
  een geldautomaat.
- Laat de speler na het verhaal een **prestige-doel** kiezen: alle medailles goud, alle gebieden,
  alle vissen, alle eierballen — en toon dat als één "Grunn is van jou"-bord.

### 7. Consistentie en afwerking (Laag, S)
- Repareer verouderde UI-teksten (vliegschool "dertien" vs 20 lessen; controleer dezelfde
  aantallen in "Te doen" en de kaart).
- Laat elke activiteit dezelfde termen gebruiken: "medaille", "record", "ronde", "potje",
  "dienst" — nu wisselt dat per module.
- Zorg dat elke activiteit die een medaille heeft, die ook in "Te doen" toont (nu een subset).

## Prioriteitenlijst

**Nu doen (S, uren tot een dag):**
1. Vul "Te doen" aan met alle 26 activiteiten en de ontbrekende bijbanen; hergebruik de bestaande
   `todo`-regel van het reuzenrad als patroon.
2. Zet medaille-eis, beloning en samen-status op de prompt/startkaart van elke activiteit.
3. Herstel de vliegschool-tekst en andere verouderde aantallen; maak één woordenlijst voor
   medaille/record/ronde.
4. Toon de groepsbonus in de beloningsbanner en leg 1+1=3 één keer uit bij de eerste
   samen-sessie.
5. Herstel de reisstap tussen M12 en M13 en maak van de ruime timers (M03/M04) een medaille-eis.

**Daarna (M, dagen):**
6. Breid de coöp-bijbanen uit met 5-8 banen en maak van de 7 "deels"-activiteiten een bewuste
   keuze.
7. Voeg per minigame een variant/vervolgdoel toe na de eerste medaille, met de volgende drempel in
   de banner.
8. Maak Veroverd een eigen tab met de eerstvolgende taken en een eerlijke catalogusregel.
9. Herbalanceer postgame en Fjord; voeg een prestige-bord toe.
10. Maak de bijbaanniveaus mede op variatie, en herschrijf de boerderij/trein naar één duidelijke
    dagelijkse keuze.

**Groter (L, weken):**
11. Eén samenhangend "Samen spelen"-aanbod: elke activiteit heeft een gastrol (lokaal, wedstrijd of
    meekijk-klus) in plaats van een ja/nee-register.
12. Speeltest van akten 2-5 (inclusief Deel 4) en van de tien populairste activiteiten volgens
    `docs/PLAYTESTPLAN.md`; daarna pas verder tunen.

## Suggestietabel (voor het bord)

| # | Suggestie | Waarom | Kosten | Soort | Deel |
|---|---|---|---|---|---|
| 1 | Alle 26 activiteiten in "Te doen" | de lijst belooft alles en mist er ~10 | S | UI | F |
| 2 | Standaard startkaart: doel, medaille-eis, beloning, samen-status, record | speler begint nu zonder doel | S | UI | D/F |
| 3 | Vliegschool-tekst en aantallen rechtzetten | 13 vs 20 lessen ondermijnt vertrouwen | S | UI | D/F |
| 4 | Groepsbonus in de banner + één uitleg | 1+1=3 is onzichtbaar | S | UI | C/E |
| 5 | Reisstap M12→M13 en ruime timers als medaille-eis | 43 km leeg, geen spanning in M03/M04 | S/M | content | A |
| 6 | Opening comprimeren; eerste speelbare moment < 3 min | 60+ regels voor de eerste actie | M | content | A |
| 7 | M09/M10 halveren of onderbreken | langste langzame ritten, bot faalde 3× | M | content | A |
| 8 | Eén echte tegenslag + kalenderteller in de HUD | helden winnen bijna alles tussen M06-M20 | M | content | A |
| 9 | M18/M21-keuzes echte gevolgen geven | nu "gok en schijnkeuze" | M | content | A |
| 10 | Bijbanen splitsen in "dienst" en "kantoorklus" | 16 van 47 banen zijn tekst/keuze, rest rit | S/M | UI/content | B |
| 11 | Variatie ook in bijbaanniveaus | nu beloont niveau herhaling, loopbaan variatie | M | systeem | B |
| 12 | Boerderij: dagelijkse keuze centraal, kortere werkgang | diep systeem voelt als administratie | M | content | B |
| 13 | Trein: één actieve vaardigheid + conducteurskeuzes | host is nu passief | M | content | B |
| 14 | Hoge loopbaanniveaus geven niet-geldelijke voordelen | +30% weegt niet op tegen andere bonussen | M | systeem | C |
| 15 | "Nog X tot zilver" + variant na eerste medaille | geen tweede laag na goud | M | content/UI | C/D |
| 16 | Postgame-prijzen omhoog; Fjord als investering | endgame onevenwichtig | M | balans | C |
| 17 | Coöp: 5-8 banen en 7 "deels"-activiteiten bewust maken | 5/47 banen en 4/26 activiteiten samen | L | systeem/content | E |
| 18 | Positieve "samen kan"-lijst + "eigen plan"-kaart voor gasten | gast leest vooral wat niet kan | S/M | UI | E |
| 19 | Veroverd eigen tab + eerstvolgende taken + telling zichtbaar | sterke endgame-lus is verstopt | M | UI | G |
| 20 | Ommeland-paspoort en bijna-compleet-hints | verzamelen is makkelijk te missen | S/M | UI | G |
| 21 | Stemmen bij verhaal-keuzes; menu's pauzeren alleen jezelf | grootste afwijking van de eigen visie | M/L | systeem | E |
| 22 | Eén woordenlijst en een aantallen-test voor UI-teksten | terminologie en cijfers lopen uiteen | S | UI/test | F |
| 23 | Speeltest akten 2-5 (incl. Deel 4) en top-10 activiteiten | niets is door een mens gespeeld | L | proces | A |

## Issues (27, gefiled op 6-11-2026)

De suggestietabel is omgezet in issues op het bord: **26 × `wens` en 1 × `bug`**, elk met een
impact- en kostenlabel en in de kolom Wensen of Bugs. De volledige tabel met links en de relatie
tot bestaande issues staat in [ISSUES.md](ISSUES.md). Kort:

- **Verhaal:** [#662](https://github.com/NatusPella/GDE-Groningen/issues/662) opening,
  [#663](https://github.com/NatusPella/GDE-Groningen/issues/663) M09/M10,
  [#664](https://github.com/NatusPella/GDE-Groningen/issues/664) reis-/tijdgaten,
  [#665](https://github.com/NatusPella/GDE-Groningen/issues/665) tegenslag,
  [#666](https://github.com/NatusPella/GDE-Groningen/issues/666) M18/M21-keuzes.
- **Bijbanen en carrières:** [#667](https://github.com/NatusPella/GDE-Groningen/issues/667)
  dienst/kantoorklus, [#668](https://github.com/NatusPella/GDE-Groningen/issues/668) variatie in
  niveaus, [#669](https://github.com/NatusPella/GDE-Groningen/issues/669) boerderij,
  [#670](https://github.com/NatusPella/GDE-Groningen/issues/670) machinist.
- **Loopbaan, medailles, endgame:** [#671](https://github.com/NatusPella/GDE-Groningen/issues/671)
  eerstvolgende stap, [#672](https://github.com/NatusPella/GDE-Groningen/issues/672) medaille-uitleg,
  [#673](https://github.com/NatusPella/GDE-Groningen/issues/673) variant na goud,
  [#674](https://github.com/NatusPella/GDE-Groningen/issues/674) niet-geldelijke voordelen,
  [#675](https://github.com/NatusPella/GDE-Groningen/issues/675) postgame/Fjord,
  [#676](https://github.com/NatusPella/GDE-Groningen/issues/676) Veroverd-tab.
- **Activiteiten en verzamelen:** [#677](https://github.com/NatusPella/GDE-Groningen/issues/677)
  Te doen compleet, [#678](https://github.com/NatusPella/GDE-Groningen/issues/678) startkaart,
  [#679](https://github.com/NatusPella/GDE-Groningen/issues/679) attracties,
  [#680](https://github.com/NatusPella/GDE-Groningen/issues/680) hengelen-balans,
  [#681](https://github.com/NatusPella/GDE-Groningen/issues/681) Ommeland-paspoort,
  [#682](https://github.com/NatusPella/GDE-Groningen/issues/682) **bug**: aantallen en termen,
  [#688](https://github.com/NatusPella/GDE-Groningen/issues/688) invoer/stopconventie.
- **Samen spelen:** [#683](https://github.com/NatusPella/GDE-Groningen/issues/683) coöp-aanbod
  uitbreiden, [#684](https://github.com/NatusPella/GDE-Groningen/issues/684) positieve lijst en
  eigen plan, [#685](https://github.com/NatusPella/GDE-Groningen/issues/685) groepsbonus zichtbaar,
  [#686](https://github.com/NatusPella/GDE-Groningen/issues/686) stemmen bij keuzes,
  [#687](https://github.com/NatusPella/GDE-Groningen/issues/687) menu pauzeert alleen jezelf.
- **Al gedekt, geen nieuw issue:** de speeltest van akten 2-5 en Deel 4 (comment op #116), de
  kaart-hover en het filter (comment op #602), en de eerste-keer-telling in "Te doen" (comment op
  #607). De UI-serie #595-#636 van de parallelle review dekt de sfeer per scherm; onze issues
  verwijzen daar waar ze raken.

## Dekking en wat niet is bekeken

- **Wel:** alle modules en docs die in de deelgebieden staan, de co-op-registers en -audit, de
  loopbaan- en economiecijfers, "Te doen", de kaart-/HUD-modules, de verhaaldata en de
  activiteitenlijsten. De belangrijkste getallen zijn met kleine pure Node-imports nagerekend
  (`storyarc.js`, `coopstatus.js`, `storyarc.computeMoneyTimeline`, `vliegschoolrules.js`,
  `node scripts/coopmissie_audit.mjs --samenvatting`).
- **Niet:** niets runtime (geen Electron, geen spel, geen netwerk, geen echte sessie, geen
  volledige testsuite); geen beeld op 720p/1080p/Steam Deck; geen echte controller of touch;
  niet elke regel van `missions.js` (195 KB), `sidejobs.js` (57 KB) en de grote `pg_*`-modules;
  de precieze balans van elke afzonderlijke bijbaan is een steekproef, geen volledige
  econometrie.
- **Belangrijk:** een andere sessie was tijdens deze review de werkboom aan het bijwerken voor de
  technische reviewpunten. De designbevindingen zijn daar niet van afhankelijk, maar regelnummers
  kunnen verschuiven en sommige UI-teksten kunnen al gefixt zijn.
