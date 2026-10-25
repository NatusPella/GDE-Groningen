> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/verhaal.md` (Deel 4 vóór de herschrijving).
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Deel 4 · F4b: Wadkust, Lauwersmeer en Westerkwartier

Productiescript voor inhoudsdrop **F4b** van Deel 4 "Nazomer" (de Ommelander Ronde), oktober 2026. Hoort bij [PROVINCIE-VERHAAL.md](../PROVINCIE-VERHAAL.md) (§2-§5, §9), [PROVINCIE-PLAN.md](../PROVINCIE-PLAN.md) (§3.6 water en veer, §3.7 treinen en snelreizen, §2.7 het getij) en het vorige script [deel4-f4a.md](deel4-f4a.md). Alleen tekst: er is nog geen code, en de provinciekaart wordt nog gebouwd.

**Wat erin staat**
- het kader van ring 2: ontgrendelen, kalender, geld, bezit, overslaan, melders, de "Wordt vervolgd"-kaart (§1);
- de nieuwe personages met naamkaart, stem en kleur, en hoe we botsende namen oplossen (§2);
- de hoofdmissies **O11-O14 (Wadkust & Lauwersmeer)** en **O15-O18 (Westerkwartier)** en de verhaalstappen ertussen, elk met route door echte plekken, verloop, falen/overslaan, cutscènes met cameranotities, alle dialoog, telefoon en radio, HUD-doelen, afrondingskaart en autogesprekken (§3);
- de zijreeksen **Rally-Rennie (Z20-Z22)** en **Wadgids Fenna (Z23-Z25)** (§4);
- activiteiten en bijbanen: wadgids als respectvol minispel, havenloods en het veer van Lauwersoog, de veerboot naar Schier (cutscène), boot-klussen, regatta's, dijk- en driftplekken, trekker- en loonwerkklussen, het kermiscircuit in Zuidhorn, bus en vrachtwagen (§5);
- toevallige ontmoetingen en events, met drie Friese wegversperringen, een hunebed en de rand van het Wad (§6);
- herkenningspunten en geheimen, met Rottumeroog als verboden natuur (§7), Nachtstreek (§8);
- continuïteit en gevoelige onderwerpen (§9), echte plekken om te verifiëren in OSM (§10);
- een **data-bijlage** in de vorm van de bestaande code (§11) en de tellingen (§12).

**Vaste regels voor dit script** (de besluiten van de eigenaar van 15 oktober en de regels van F4a)
- **Altijd zomer.** Deel 4 is de late zomer (F4b: dag 41-45, woensdag 23 tot en met zondag 27 september, in de "nazomer · dag N" van de HUD); er komen geen herfst, winter, vorst of Koningsdag in voor. Events alleen uit de zomer: havenfeest, kermis, maïsfeest, paardenmarkt.
- **Deel 1-3 en F4a blijven zoals ze zijn.** F4b leunt op Henks zender, de lier van Dijkstra, Mem en Jelle, Oma's lijstje en de ladder van complimenten.
- Droog en Gronings, 18+ zoals nu. Geen echte levende personen, geen echte merken of bedrijven (verzonnen: Oldenhuis Bakt, het Zeehondenhuis, het Rijtuigenhuis, Sloperij De Laatste Versnelling, Rallyclub De Vierde Versnelling, Wietse's Werkplaats, de veerboot "Robbenplaat"). Plaatsen en gebouwen met hun echte naam. Het is **Grunn**, nooit "de Grunn".
- **Rottumeroog en Rottumerplaat** zijn verboden natuur, gezien vanaf zee: één geheim, en een gag van de vogelwachter als je toch landt. **Schiermonnikoog** is een Fries eiland dat alleen als cutscène van de veerboot voorkomt (kade en silhouet, geen landing).
- **Gaswinning** is alleen een stille, respectvolle zijlijn (één scène in Z24); geen grap over schade of slachtoffers, geen bedrijf, geen schurk.
- **Grensgrappen** aan de randen: de Friese wegversperring met de neven van Durk en Douwe, en het hunebed van Drenthe; droog, over regels, nooit over mensen.
- Spelerstekst alleen Nederlands. De stemmen spreken Gronings (`scripts/gronings_spoken.json`), de ondertitels zijn Nederlands; Friese regels (Jelle, Mem, Kapitein Sybren, Wybe, Wiebren) krijgen een Nederlandse ondertitel (`FY`); Durk en Douwe spreken Nederlands met een Fries accent.
- **Missieregels:** overslaan kan pas na één poging; geld blokkeert nooit iets; een voertuig is alleen van jou als je het gekocht hebt (geleende boten, trekkers, koetsen en rallyauto's gaan terug via `handBack`).

**Zo lees je de dialoog.** `- **Spreker** *(tag)*: tekst`. De tag is de TTS-toon (`speech_metadata.style`), in het Nederlands zoals in storyarc.js; bij autogesprekken in het Engels zoals in banterlines.js. Tessa heet in de code `anita` / `A`; in het script staat "Tessa". `Rikus (verteller)` is `V`. Tussen haakjes achter een regel: de Nederlandse ondertitel van een Friese regel. `[camera: ...]`, `[naamkaart: ...]` en `[clue]` zijn regelopties zoals in missionstory.js.

**Hoe het gemaakt is.** De regels, de code in §11 en de Groningse spreektabel komen uit één bron, zodat ze letterlijk gelijk zijn. De Groningse uitspraak volgt de spelling van de bestaande tabel en van F4a; ook deze versie moet nagelezen worden door iemand die Gronings spreekt (en de Friese regels door iemand die Fries spreekt).


## 1. Het kader: ring 2

**De deelkaart.** F4b maakt geen nieuw deel: `PARTS.nazomer` blijft staan en de stappen krijgen `ring: 2` en `region: 'wadkust'` of `'westerkwartier'` (zie §11A). Het verhaal van F4a stopte op de kaart "Twee voorrondes. Nog vijf."; F4b is wat daarna komt. Wie F4b speelt, speelt twee regio's in vrije volgorde.

**Ontgrendelen.** Twee gewonnen voorrondes (O6 en O10) openen ring 2 (plan §2.3): de **Wadkust & Lauwersmeer** (aankomst per waterbus over het Reitdiep naar Zoutkamp, `n-zoutkamp`) en het **Westerkwartier** (aankomst per trein naar Zuidhorn, `n-zuidhorn`). Binnen een regio liggen de stappen vast; een regio "op slot" heeft geen missies maar wel landschap, activiteiten en een "binnenkort"-melding van Rikus. Vier gewonnen voorrondes (twee uit F4a, twee uit F4b) openen ring 3; omdat F4c nog niet gebouwd is, stopt het verhaal op de "Wordt vervolgd"-kaart hieronder.

**Kalender van F4b (speldagen; de enige bron is [KALENDER.md](KALENDER.md), Deel 4).** De HUD toont na 22 september geen datum meer, alleen de weekdag en "nazomer · dag N"; de data hieronder zijn voor de schrijvers. In 2026 valt 22 september op een dinsdag, dus de dagen 41-45 zijn woensdag 23 tot zondag 27 september. F4a eindigt op dag 40 (di 22: voorronde Eemsdelta); F4c begint op dag 46 (ma 28).

| Dag | Speldag | Wat |
|---|---|---|
| 41 | wo 23 sept | `n-zoutkamp`, O11 (ochtend), O12 (nacht, nieuwe maan) |
| 42 | do 24 sept | O13 (laagwater 15:30, de vloed komt anderhalf uur te vroeg) |
| 43 | vr 25 sept | O14 (**voorronde Wadkust**, havenfeest in Lauwersoog, 18:30, laatste boot 19:05), `n-kotter`, `n-zuidhorn` |
| 44 | za 26 sept | Westerkwartier: O15 (09:00, trekkertrek-finale 's middags), O16 (nacht, 22:30) |
| 45 | zo 27 sept | O17 (open dag in het park van Nienoord, 10:30), O18 (**voorronde Westerkwartier**, rally in Zuidhorn, 14:00), `n-schuur` |

Een stap krijgt altijd de dag van de stap ervoor of later, nooit eerder (KALENDER.md): wie eerst het Westerkwartier doet, ziet de Wadkust-stappen op dezelfde of latere dagen. `n-zuidhorn` staat daarom in de data op dag 43 (de stap staat in `STEPS` na `n-kotter`); het Westerkwartier is open vanaf dag 41. Het weer is "nazomer": heldere nachten (O12), wind uit het noordwesten (O11, O13), warme middagen. De weekenden zijn de voorrondes: vrijdagavond (Wadkust) en zondagmiddag (Westerkwartier). Dit is de kalender die in F4a en F4c is overgenomen (F4a ma 15 / za 20 / za 27 is rechtgetrokken, zie §9).

**Geld.** Beloningen lopen van € 1.600 (O11) tot € 3.400 (O18); de zijmissies van € 400 tot € 900. Geen enkele stap kost geld: het motorblok van O15 is gratis, het kaartje naar Schier is "verhalen", een leenauto staat altijd klaar. Koopbare extra's (een eigen trekker, een rallyauto, de clubauto van Rennie) zijn `optional` en staan buiten de geldtijdlijn. `storytest.js` krijgt het doel: met `payShare` 0,5 en niets kopen komt niemand vast te zitten.

**Overslaan.** Pas na één mislukte poging (zoals nu). Elke missie zegt waar je na het overslaan staat. Verhaalstappen (de `n-`stappen) kunnen niet mislukken; de waterbus en de trein zijn altijd over te slaan met Spatie.

**Bezit.** Alleen wat je koopt, wordt van jou. Van Tinus (trekker, pick-up), de dijkwerker (sloep), Fenna (roeiboot), Wessel (platbodem), Wiegert (koets) en Tinus' oom (rallyauto) is niets van jou; ze gaan terug via `handBack`. Een **eigen boot** en een **wadkaart** krijg je pas bij de kotter (een safehouse, geen missiebuit); een **stalplek** voor een eigen trekker bij de schuur. **Oma's fiets uit 1953** is geleend en gaat terug naar Oma.

**De melders.** De meldersbond groeit: de **dijkwerker** (Wadkust, neef van Harm), de **molenaar** (Westerkwartier, nicht van Molenaar Fenna) en **Oma Sientje** (neef met een dijk). Allemaal met dezelfde zin: "Ik meld alleen." Per scène hooguit één keer per melder.

**De ladder van complimenten.** Ow (F4a: Rikus, Eppo) → Goud → Valt mie nait of → Braid noar de zin → Kon minder → stilte. In F4b: Oma Sientje zegt "Valt mie nait of." (O14); Hilko, een rivaal die verliest, zegt "Goud." (O18); "Kon minder" blijft voor de finale.

**Rubrieken op Nachtstreek in F4b.** "Bel Rikus" opent elke missie; Rikus zit "op tournee" aan het Wad, in het park van Nienoord en op het startterrein in Zuidhorn. De peiling **"Groeien of thuis?"** draait: na de vierde voorronde is het 49 procent groeien, 51 thuis. Rikus zegt na O13 één korte, ernstige mededeling over het Wad (zonder grap).

**"Wordt vervolgd"-kaart na de tweede F4b-voorronde (vier voorrondes in totaal)**

- **Tessa** *(vastberaden, zacht)*: Vier voorrondes. Nog drie.
- **Tammo** *(droog, warm)*: Ubbo heeft vier snackbars minder. Dat is ook een manier om te tellen.


## 2. Nieuwe personages in F4b

Naamkaarten (`CHARACTERS` in storyarc.js, getoond door namecard.js), stemmen (Gemini 3.8 via de bestaande pijplijn) en sprekerskleuren (luminantie gecontroleerd op 0,15-0,30, zie `speakers.js`). **Alle dertig stemmen zijn al in gebruik** (F4a gebruikte de laatste twee); nieuwe personages delen daarom een stem met iemand uit een andere regio ("nooit in dezelfde scène"), en elke deling staat in §11G.

| Sleutel | Naam | Naamkaart | Stem | Kleur (lum.) | Let op |
|---|---|---|---|---|---|
| `fenna` | Wadgids Fenna | Kent het Wad. Het Wad kent haar. Ze zijn het eens. | Zephyr | `#3a9bb5` (0.28) | Molenaar Fenna (Winsum): "Wij heten hier allemaal Fenna." |
| `fokko` | Fokko de Visser | Wadvisser. Palingman. Vangt wat hij niet mag houden en houdt wat hij niet mag vangen. | Umbriel | `#8a7a64` (0.20) | in F4b alleen Wadkust |
| `dijkwerker` | Dijkwerker | Werkt aan de dijk. De dijk is nooit af. Ziet alles van dichtbij. | Sadaltager | `#8f8a4a` (0.25) | neef van Harm; spreekt zoals de torenwachter |
| `sientje` | Oma Sientje | Achtentachtig. Wadvissersvrouw. Heeft nooit iets teruggebracht. Dat gaat nu veranderen. | Autonoe | `#b0709a` (0.23) | noemt haar kotter naar Trijntje |
| `molenaar` | Molenaar | Draait met de wind of ertegenin. Meldt alleen. | Alnilam | `#6a8f5a` (0.23) | nicht van Molenaar Fenna |
| `tinus` | Tinus | Trekkertrekker. Rijdt voor opa. De motor zit in een emmer. | Sadachbia | `#8a7fc0` (0.24) | Hinderks kleinzoon |
| `hilko` | Hilko Kremer | Rallyrijder. Heeft de snelste auto en het meeste geld van Ubbo. | Achird | `#c0503f` (0.17) | neef Siemen is clubkampioen |
| `rennie` | Rally-Rennie | Secretaris van een rallyclub zonder auto. Rijdt harder in gedachten dan jij in een auto. | Erinome | `#c0702a` (0.23) | naamkaart bij de eerste ontmoeting, in O17 of Z20 |
| `sybren` | Kapitein Sybren | (geen naamkaart: bijrol) | Iapetus | `#4a86b0` (0.22) | spreekt Fries; Torenwachter en Bert alleen aan de telefoon |
| `koetsier` | Koetsier Wiegert | (geen naamkaart: bijrol) | Zubenelgenubi | `#9a76aa` (0.20) | |
| `siemen`, `wessel` | Neef Siemen, Wessel | (geen naamkaart: bijrollen) | Puck, Alnilam | `#5f9a50`, `#968a3a` | |
| `havenmeester` | Havenmeester Tjerk | (geen naamkaart: bijrol) | Alnilam | `#5a8a9a` | |
| overige bijrollen | visser, knecht, vader, influencer, verzorger, vogelwachter, commissaris, monteur, sander, e.a. | (geen) | gedeeld, zie §11G | `#8a8a8a` | |

**Botsende namen (continuïteit).** Net als in F4a hernoemen we niets wat al ingesproken is; de botsing wordt een grap of een familieband, en de sprekerssleutels blijven uniek:
- **Fenna**: er is al een **Molenaar Fenna** (Winsum, `Leda`). De wadgids heet **"Wadgids Fenna"** (stem Zephyr) en zegt in O12: "Mijn tante. Wij heten hier allemaal Fenna. Er is een tekort aan namen." (het punt dat F4a §2 openliet).
- **Lammert**: Schipper Lammert (Zuidhorn) is de kleinzoon van Sluiswachter Lammert (F4a n-woonschip: "Ook een Lammert."). Voorstel voor één extra regel bij Schipper Lammert in Zuidhorn na `n-zuidhorn`: *"Mien opa zit bie de zeesluus. Hai zegt niks. Ik zeg het veur hom."* (GRO: "Mijn opa zit bij de zeesluis. Hij zegt niks. Ik zeg het voor hem.")
- **Geesje**: Kosteres Geesje (F4a) en Boerin Geesje (Stedum) blijven zoals ze zijn; in F4b komt geen derde Geesje.
- **Harm / Harm-Jan**: de dijkwerker is Harms neef en heet gewoon "Dijkwerker"; hij zegt nooit "laatste fase".
- **Mem Terpstra** (sleutel `mem`, Deel 3) is hier niet nieuw: ze verschijnt in O14 op de kade van Schier. **Jelle** speelt in O11, O16 en als beller.
- **Ubbo** blijft als "U. Oldenhuis" sms'en (zie F4a §2: de afzender `Ubbo` is de telefoon-app).
- **Fokko**: een Fokko komt in Deel 1-3 en F4a niet voor; "Fokko de Visser" houdt zijn volledige naam om niet te verwarren met Henk of Harm.


## 3. Het verhaal van F4b: hoofdmissies en tussenstappen

De volgorde hieronder is de "standaard"-volgorde (Wadkust eerst); in het spel kiest de speler. Speler per missie: vijf keer Tessa (O11, O14, O16, O17, O18), drie keer Tammo (O12, O13, O15), volgens de vuistregel (Tessa: water, rijden, praten; Tammo: sluipen, trekkers, doorzetten). Elke regio heeft vier missies; de laatste van elke regio (O14, O18) is de **voorronde**.

### Ring 2 · De Wadkust en het Lauwersmeer

Bondgenoot **Fenna** en haar oma **Sientje** (Oma's lijstje: "Sientje, Noordpolderzijl"), tegenstander **Fokko de Visser** (Ubbo's palingman), medestander uit wrok **Jelle**, melder de **dijkwerker**. Missiestarts liggen binnen 3 km van elkaar (Zoutkamp, Lauwersoog, Noordpolderzijl, het Lauwersmeer). Safehouse na O14: de kotter *Trijntje* (ZK 53) in Lauwersoog.

### Tussendoor: Met de waterbus naar Zoutkamp (`n-zoutkamp`)

Speler: Tessa. Doel: `{ type: 'waterbus', from: 'Stad', to: 'Zoutkamp', via: 'reitdiep' }   // NEW: the rondvaart boat as waterbus on the Reitdiep (plan 3.6); the first arrival may always be by boat, skippable with Spatie`.

**Wissel**

- **Tessa** *(bazig, vrolijk)*: Ik pak de waterbus. Jij mag voorop staan en naar water kijken.

**Lead**

- **Tammo** *(droog, aan de telefoon)*: Oma belde. Er staat een naam bij het Wad: Sientje, Noordpolderzijl. De waterbus naar Zoutkamp vaart om negen uur, over het Reitdiep.

**Onderweg (companion)**

- **Tammo** *(droog)*: Een bus die op het water rijdt. Dat is een boot met ambities.
- **Tessa** *(vrolijk, wijzend)*: Kijk, daar gaat het Reitdiep de polder in. Hier ging vroeger alles langs: turf, graan, mensen.
- **Tammo** *(droog)*: En nu vooral toeristen met een visje in hun hoofd.

**Scène: Zoutkamp, de haven.** *Camera:* Vanaf de waterbus: het Reitdiep opent zich naar de haven, de garnalenkotters liggen met uitgeklapte bomen als de poten van een insect. De camera stijgt met een meeuw over de dijk: links het Lauwersmeer in de ochtendzon, rechts de haven; dan omlaag naar een man met een schop bovenop de dijk. Kaartonthulling langs het Reitdiep (`revealCorridor('reitdiep')`).

- **Dijkwerker** *(droog, kalm, leunend op zijn schop)*: Moi. Ik zag jullie van Stad komen. Kijken is mijn werk. Ik werk aan de dijk. De dijk is nooit af. `[naamkaart: dijkwerker]`
- **Tammo** *(droog)*: Wij kennen een wegwerker. Harm. Laatste fase.
- **Dijkwerker** *(droog, trots)*: Mijn neef. Hij werkt aan een ring, ik aan een dijk. Het zit in de familie.
- **Tessa** *(nieuwsgierig)*: En wat meldt u?
- **Dijkwerker** *(droog, kalm)*: Er ligt een kotter in de haven met een naam van zilver. Hij vaart nooit overdag. Ik meld alleen. `[clue]`
- **Tammo** *(droog, zacht)*: Iedereen die hoog zit of bij het water, is familie.
- **Dijkwerker** *(droog)*: Iedereen met een schop ook.

**Klaar (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Zoutkamp. Kotters, een brug en een man met een schop. Het ruikt naar zout. Ik wil niet meer weg.

**HUD-meldingen:** "Het Wad en het Lauwersmeer zijn open" · "Oma's lijstje: Sientje, Noordpolderzijl"

### O11 · Jelle aan de grens

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| boot, race | Wadkust & Lauwersmeer (Zoutkamp) | Tessa | Zoutkamp, de haven aan het Reitdiep (ochtend, woensdag 23 september) | € 1600 | `O11` / missie `grens` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(bazig)*: Ik vaar. Jij houdt Jelle in de gaten. Dat doe je toch al.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Jelle stuurde een bericht. "Zoutkamp, de haven. Ik ben hier voor de paling. – J." Hij typt met een uitroepteken.

**Bel Rikus (beller: Jelle, Ljouwert)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Ik sta in Zoutkamp naast een kotter en ik ruik garnalen. Eerste beller.
- **Jelle Terpstra** *(charmant, opgewekt, aan de telefoon op de radio)*: Moai, Rikus. Jelle. Ik sta ook in Zoutkamp. Gezellig, zo bij elkaar. *(Mooi, Rikus. Jelle. Ik sta ook in Zoutkamp. Gezellig, zo bij elkaar.)*
- **Rikus** *(droog, als nacht-dj op de radio)*: Wat doe je daar, Jelle?
- **Jelle Terpstra** *(zelfvoldaan, aan de telefoon op de radio)*: Paling, Rikus. Alles wat glibberig en lekker is, is Fries. Wis en wrachtich. *(Paling, Rikus. Alles wat glibberig en lekker is, is Fries. Echt waar.)*
- **Rikus** *(droog, als nacht-dj op de radio)*: En die kotter naast mij?
- **Jelle Terpstra** *(zacht, gepikeerd, aan de telefoon op de radio)*: De Zilveren Aal. Zijn naam is gelogen, Rikus. Hij is niet van zilver en hij vaart niet op aal. Hij vaart op Ubbo.

**Naamkaarten:** FOKKO DE VISSER: *"Wadvisser. Palingman. Vangt wat hij niet mag houden en houdt wat hij niet mag vangen."*

**Route en plekken.** Zoutkamp, de haven aan het Reitdiep (steiger van de dijkwerker) → onder de brug door → de schutsluis van Zoutkamp naar het Lauwersmeer (12 s, overslaanbaar met Spatie) → het Lauwersmeer over, een boeienlijn naar het noordwesten (± 7 km, wind uit het noordwesten) → de zeesluizen van Lauwersoog aan de kant van de Waddenzee. Totaal ± 9 km, 5-6 minuten. De exacte ligging van sluis en boeien uit OSM (`waterway=lock_gate`, `seamark:*`); het Lauwersmeer is volledig speelbaar (plan §3.6).

**Verloop**

1. **Intro** op de kade: Jelle in een zwemvest, Fokko aan dek van de *Zilveren Aal*.
2. **Stap in de motorsloep van de dijkwerker** (leenboot, geen auto: `handBack`). Jelle vaart naast je in de *Foar Mem II* (een oude skûtsje-racer met een buitenboordmotor en een pompeblêd-vlag).
3. **Race door het Reitdiep** langs vier boeien. Kotters komen uit het haventje (toeteren = voorrang), een brug draait pas open als je toetert.
4. **De sluis van Zoutkamp:** de deuren gaan open als je toetert. Jelle probeert met zijn polsstok over een halfopen sluisdeur te springen en valt in de kolk (scripted, ook als je achterligt).
5. **Het Lauwersmeer:** open water, golfslag, een boeienlijn. De *Zilveren Aal* heeft een voorsprong en vaart op de sluizen van Lauwersoog af; haal haar in.
6. **Rij naast de Aal** de sluiskolk in: vier seconden binnen 12 m, dan fotografeert Tammo de laadbon.
7. **Scène bij de sluis** met Fokko en **outro** op de pier van Lauwersoog.

**Falen, overslaan, bezit**

- De *Zilveren Aal* is door de sluis voor je binnen 12 m kwam (de klok loopt: 6 minuten).
- De rompmeter van de sloep is op (rammen kost 20 %).
- **Overslaan** na één poging: je ligt naast de Aal in de kolk en de foto is genomen. Jelle zit dan al op de pier.
- **Bezit:** de sloep is van de dijkwerker en gaat terug (`handBack: { how: 'moor' }`). Niets wordt je eigendom; een eigen boot krijg je pas bij de kotter (safehouse, zie n-kotter).
- **Jelle kan niet winnen:** hij valt altijd, en zijn val is het enige scripted moment. Wie hem toch tot de sluis voorblijft, krijgt de prestatie "Droog gebleven".

**Intro (cutscène).** *Camera:* Opent op het wateroppervlak van het Reitdiep, vlak boven het water: de garnalenkotters schuiven voorbij met hun uitgeklapte bomen als de poten van een insect. De camera stijgt met een meeuw over de steiger, draait langzaam om Jelle in zijn zwemvest en zakt naar Fokko, die op de *Zilveren Aal* een koffiebeker opheft. Orbit om Jelle bij "Ik val vaak".

- **Jelle Terpstra** *(charmant, opgewekt, in een zwemvest)*: Grinzers! Moai dat jullie er zijn. Jullie zijn te laat. Ik ben altijd te vroeg. Dat is Fries. *(Groningers! Mooi dat jullie er zijn. Jullie zijn te laat. Ik ben altijd te vroeg. Dat is Fries.)* `[camera: orbit]`
- **Tammo** *(droog)*: Waarom heb je een zwemvest aan?
- **Jelle Terpstra** *(plechtig)*: Voorzorg. Ik val vaak. Dat is geen schande, dat is statistiek.
- **Tessa** *(scherp)*: Wat doe je in Zoutkamp, Jelle?
- **Jelle Terpstra** *(zacht, gekrenkt)*: Mem had een bakkerij in Ljouwert. Zevenenveertig jaar. Elke zaterdag gaf ze een brood weg aan wie geen geld had.
- **Jelle Terpstra** *(zacht, gekrenkt)*: In juni kocht Ubbo hem op. Nu is het Oldenhuis Bakt nummer zeventien. Gele gevel. Het brood is voorgebakken. `[camera: close]`
- **Tammo** *(droog, zacht)*: Dat is erg.
- **Jelle Terpstra** *(gepikeerd, dan opgewekt)*: Daarom: paling. Alle paling van het Wad gaat bij Fokko de Visser de kotter in. Fokko vaart hem naar Ubbo's rokerij. Zonder papieren. Foar mem. *(Daarom: paling. Alle paling van het Wad gaat bij Fokko de Visser de kotter in. Fokko vaart hem naar Ubbo's rokerij. Zonder papieren. Voor mem.)*
- **Fokko de Visser** *(rauw, vriendelijk dreigend, vanaf het dek van de kotter)*: Moi, Jelle. Je staat op mijn kade. `[naamkaart: fokko]`
- **Jelle Terpstra** *(opgewekt)*: Openbare kade, Fokko. Zeg ik als bezoeker.
- **Fokko de Visser** *(rauw, kalm)*: Openbaar is een woord voor mensen die zelf geen kade hebben.
- **Tessa** *(koel)*: Wij hebben een luik. Dat is ook een soort kade.
- **Jelle Terpstra** *(plechtig)*: Race. Wie het eerst bij de sluis van Lauwersoog is, mag de laadbon van de Aal fotograferen. Dat ben ik.
- **Tammo** *(droog)*: Hij valt in het water voor het bord. Dat zegt de statistiek.
- **Tessa** *(strijdlustig)*: Jelle. Je weet dat ik win.
- **Jelle Terpstra** *(zelfverzekerd)*: Jij wint. Ik val. Zo gaat het altijd.

**HUD-doelen (in volgorde):** "Stap in de sloep van de dijkwerker" → "Race over het Reitdiep, door de sluis van Zoutkamp" → "Over het Lauwersmeer naar de sluizen van Lauwersoog" → "Rij naast de Zilveren Aal en fotografeer de laadbon"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tessa** *(geconcentreerd)*: Boei één. Links. Jelle gaat rechts. Hij weet niet dat het links is.
- **Tammo** *(droog)*: Er komt een kotter uit het haventje. Toeteren.
- **Tessa** *(strijdlustig)*: Hij gaat opzij. Ze gaan altijd opzij voor een dame in een sloep.
- **Tammo** *(droog)*: Hij gaat opzij omdat hij bang is.
- **Tessa** *(geconcentreerd)*: De sluis. Deuren open. Toeter, Tammo.
- **Tammo** *(verbaasd, in de verte)*: Hij springt. Jelle springt. Met een stok. Over een sluisdeur.
- **Tessa** *(droog)*: Hij landt.
- **Tammo** *(droog)*: Hij landt. In de kolk.
- **Jelle Terpstra** *(verbaasd, in het water)*: Oant sjen! *(Tot ziens!)*
- **Tessa** *(opgewekt)*: Eén minder. Hij is nat en tevreden.
- **Tammo** *(gespannen)*: Open water. Wind uit het noordwesten. Hou rechtdoor.
- **Tessa** *(geconcentreerd)*: De Aal. Daar. Hij gaat de kolk in.
- **Tammo** *(fluisterend)*: Naast hem. Vier tellen. Dan klik.
- **Tammo** *(zacht)*: Achthonderd kilo paling. Geen vergunning. Ontvanger: O.B. Rokerij.
- **Tessa** *(tevreden)*: Klik. Hij heeft me gezien.

**Scène: De sluis van Lauwersoog.** *Camera:* Lage shot vanuit de sloep: de sluisdeuren sluiten achter de Aal, het water zakt, een meeuw zit op de bolder. Fokko leunt over de reling. Langzame push-in op zijn gezicht bij "Opgeschreven".

- **Fokko de Visser** *(woedend, beheerst, vanaf het dek)*: Weg met die sloep! Dit is een sluis, geen terras!
- **Fokko de Visser** *(kalm, dreigend)*: Ik ken jullie gezichten. Ik onthoud ze. Net als Ubbo.
- **Tessa** *(koel)*: Ubbo onthoudt graag. Hij vergeet alleen wat hij schuldig is.
- **Fokko de Visser** *(rauw)*: Hij is niemand iets schuldig. Hij heeft alles opgeschreven.
- **Tammo** *(droog)*: Opgeschreven. In een boek.
- **Fokko de Visser** *(kort, te laat)*: …Daar praat ik niet over.
- **Tessa** *(zacht, tegen Tammo)*: Een boek. Jelle had gelijk.

**Outro (cutscène).** *Camera:* Late ochtend op de pier van Lauwersoog: het licht komt laag over de zeesluis, kotters en een veerboot ver weg. Jelle klimt druipend de ladder op; handheld two-shot met Tessa en Tammo. Als Oma belt, schuift de camera naar het gezicht van Tessa en laat de pier uitzoomen.

- **Jelle Terpstra** *(druipend, waardig)*: Ik kwam als tweede. Als je telt wie er nat is, win ik.
- **Tessa** *(geamuseerd)*: Je hebt een sluisdeur gekust.
- **Jelle Terpstra** *(waardig, zacht)*: Een Friese polsstokspringer valt nooit. Hij landt anders dan gepland.
- **Tammo** *(droog)*: Je landde in de sluis.
- **Jelle Terpstra** *(plechtig)*: Anders dan gepland.
- **Jelle Terpstra** *(ernstig, zacht)*: Fokko bewaart het Wadkust-deel van Ubbo's boeken op zijn kotter. Daar staat in wie wat schuldig is. Aan wie. Alle vissers.
- **Tessa** *(scherp)*: Een grootboek.
- **Jelle Terpstra** *(zacht)*: Eén deel. Er zijn er zeven. Eén per regio. Zeven delen, zeven schulden, zeven handtekeningen. Ubbo schrijft alles op. Dat is zijn fout. `[clue]`
- **Jelle Terpstra** *(opgewekt)*: Zoek Fenna. Wadgids. Ze kent het Wad en ze kent Fokko. Ze heeft mij ooit van een zandplaat gehaald. Dat heb ik nooit gezegd.
- **Tammo** *(droog)*: Je hebt het net gezegd.
- **Jelle Terpstra** *(plechtig)*: Net fertelle. *(Niet doorvertellen.)*
- **Tessa** *(zacht, neemt op)*: Oma. Ja. We staan op de pier.
- **Oma Trijntje** *(stellig, oud, aan de telefoon)*: Sientje woonde aan de dijk in Noordpolderzijl. Haar kleindochter loopt nu over het Wad. Zeg dat ze weet wie ik ben.
- **Tammo** *(droog, aan de telefoon)*: Dat weet iedereen, oma.
- **Oma Trijntje** *(droog, aan de telefoon)*: Zeg haar ook dat ik mijn fiets terug wil. Uit 1953.
- **Tessa** *(verbaasd, zacht)*: Welke fiets?
- **Oma Trijntje** *(stellig, aan de telefoon)*: Dat vraagt ze maar aan haar oma. Ik ben Gronings. Ik vergeet niks.

**Bij herhaling (als klus)**

- **Jelle Terpstra** *(opgewekt)*: Weer racen? Ik heb een zwemvest met een tweede zwemvest erin.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: De Aal is weg. Door de sluis.
- **Tammo** *(droog)*: Met paling zonder papieren.
- **Tessa** *(zuchtend)*: En Jelle?
- **Tammo** *(droog)*: Die drijft.

**Nachtstreek, na afloop (beller: Jelle, Zoutkamp)**

- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Jelle belt weer in. Hij is nat.
- **Jelle Terpstra** *(waardig, aan de telefoon op de radio)*: Dat is statistiek, Rikus.
- **Rikus** *(droog, als nacht-dj op de radio)*: Ik zeg niks. Ik draai drie minuten Fries.

**Berichten na afloop:** *U. Oldenhuis*: "Paling is geduldig. Ik ook. – U.O."

**Kiekdoar:** "Man in zwemvest springt over sluisdeur bij Zoutkamp. Slaagt voor de helft. Schipper: "Hij landde. Alleen anders.""

**Afrondingskaart:** **PALING ZONDER PAPIEREN** · Achthonderd kilo, één laadbon en een Fries in een zwemvest. · *+ € 1600*

**Autogesprek `o11-pass-zwemvest` (after:O11:pass)**

- **Tammo** *(dry)*: Hij had een zwemvest aan en het ging toch mis.
- **Tessa** *(amused)*: Hij landde. Dat telt voor hem.
- **Tammo** *(dry, deadpan)*: Anders dan gepland.

**Autogesprek `o11-pass-bakkerij` (after:O11:pass)**

- **Tessa** *(angry, quiet)*: Zevenenveertig jaar. Elke zaterdag een brood weg.
- **Tammo** *(soft)*: En nu voorgebakken.
- **Tessa** *(cold)*: Ubbo koopt zachte dingen.
- **Tammo** *(dry)*: Die zijn het makkelijkst.

**Autogesprek `o11-fail` (after:O11:fail)**

- **Tammo** *(dry)*: We waren er bijna.
- **Tessa** *(exasperated)*: Bijna is Fries voor te laat.
- **Tammo** *(dry)*: Zeg dat niet tegen Jelle.

**"Wat weten we?"** *De Zilveren Aal* (clue): Fokko de Visser vaart in een kotter vol paling zonder papieren: achthonderd kilo, ontvanger O.B. Rokerij. Jelle is hier uit wraak: Ubbo kocht Mems bakkerij in Ljouwert. "Foar mem." · *Zeven delen* (clue): Fokko bewaart het Wadkust-deel van Ubbo's grootboek op zijn kotter: wie wat schuldig is, aan wie. Er zijn er zeven, één per regio. · *Fenna* (clue): Jelle: zoek Fenna, de wadgids. Ze kent het Wad en ze kent Fokko. Oma wil haar fiets terug. Uit 1953.

### O12 · Donker genoeg

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| sluipen (nacht), roeien | Wadkust & Lauwersmeer (oostoever van het Lauwersmeer) | Tammo | Een steiger aan de oostoever van het Lauwersmeer bij Ezumazijl (nieuwe maan, 23:20) | € 1800 | `O12` / missie `donker` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Ik ga. In het donker kan niemand mijn gezicht zien. Dat is al jaren mijn beste punt.

**Lead (telefoon)**

- **Tessa** *(samenzweerderig, aan de telefoon)*: Jelle noemde een wadgids. Fenna. Ze weet waar de kotter 's nachts overlaadt en ze heeft een roeiboot. Geen motor, geen lamp. Ik blijf bij de telefoon.

**Bel Rikus (beller: Fenna, wadgids)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, vanuit het donkerste stuk van Nederland. Het is hier zo donker dat ik mijn eigen studiolamp een belediging vind.
- **Wadgids Fenna** *(helder, rustig, aan de telefoon op de radio)*: Rikus. Fenna, wadgids. Het is nieuwe maan. Wie hier een lamp aandoet, is een vuurtoren. Een slechte.
- **Rikus** *(droog, als nacht-dj op de radio)*: En wat doe je dan?
- **Wadgids Fenna** *(helder, rustig, aan de telefoon op de radio)*: Omhoog kijken. De sterren zijn de lamp. Dat is de afspraak.

**Naamkaarten:** WADGIDS FENNA: *"Kent het Wad. Het Wad kent haar. Ze zijn het eens."*

**Route en plekken.** Een steiger aan de oostoever van het Lauwersmeer (Ezumazijl, OSM; anders een verzonnen steiger) → roeien langs de rietkraag naar het zuiden (± 1,2 km, geen motor) → de oude, verlaten pier waar de *Zilveren Aal* 's nachts overlaadt → te voet langs de schuur en de kleine kajuit op de wal → dezelfde weg terug. De plek is verzonnen; alleen het meer, de rietkraag en de oever zijn echt. Het donkerste stuk van het Lauwersmeer is een Dark Sky Park (te controleren in OSM, `leisure=nature_reserve`); de kaart toont daar geen lantaarns.

**Verloop**

1. **Intro** op de steiger: Fenna, een roeiboot, geen lamp. De telefoon op "nachtstand" (schermhelderheid 10 %).
2. **Roeien in stilte** (Fenna zit voorop en wijst, jij roeit): roeien met ritme (A/D of de schouderknoppen), snelheid begrensd. Te snel, dan hoor je het water: een **geluidsmeter** op de HUD.
3. **Sterrenkaart (A28-voorproef):** in de rietkraag lijkt alles op elkaar. Fenna leert je de Poolster te vinden (de laatste ster van de steel van de Kleine Beer); drie keer een ster kiezen om de koers te houden.
4. **Aanleggen** bij de pier en te voet sluipen. Drie **kijkpunten** (blijf 4 s stil en uit het licht): (1) de vaten met O.B. en de tanks van de Aal, (2) twee knechten die levende paling in een bestelbus overladen, (3) het kajuitje op de wal waar het Wadkust-deel van het grootboek op tafel ligt. Tammo fotografeert het omslag en één pagina.
5. **Elke lamp verraadt je:** koplampen van een auto op de dijk, een zaklamp, een scherm. Er is geen schakelaar om het te "omzeilen": duik weg, wacht, ga door. Een reiger schrikt op bij het tweede kijkpunt (scripted).
6. **Terug naar de boot** en roeien in stilte tot de steiger. **Outro** op het water: de pagina.

**Falen, overslaan, bezit**

- Drie keer in een zaklamp of koplamp tijdens het sluipen.
- De geluidsmeter loopt vol tijdens het roeien (twee keer).
- **Overslaan** na één poging: je zit weer in de boot en de pagina is gefotografeerd; de outro speelt.
- **Bezit:** de roeiboot is van Fenna en gaat terug naar haar steiger (`handBack: { how: 'moor' }`). Niets wordt je eigendom.
- **Toegankelijkheid:** wie niet op het donker kan spelen, kan "heldere nacht" aanzetten (maanlicht op 60 %), zodat het sluipen even eerlijk blijft. Die optie telt niet mee voor de medaille.

**Intro (cutscène).** *Camera:* De camera begint op de sterrenhemel (het Lauwersmeer zonder een enkele lamp, de Melkweg als een lichtspoor) en zakt traag naar het water. Op het donkere meer verschijnt het silhouet van een roeiboot; de camera vindt Fenna, die haar vinger op haar lippen legt. Er is bijna geen kleur, alleen blauw en zwart; als Tammo zijn telefoon aanzet, wordt het scherm dimmer.

- **Wadgids Fenna** *(helder, fluisterend)*: Telefoon op nachtstand. Geen zaklamp. Geen scherm. Alleen jij en de sterren. `[naamkaart: fenna]`
- **Tammo** *(droog, fluisterend)*: Ik zie niks.
- **Wadgids Fenna** *(helder, rustig)*: Dat zie je goed. Over een kwartier zie je alles.
- **Tammo** *(droog, fluisterend)*: Jij bent Fenna. Van Jelle.
- **Wadgids Fenna** *(droog, zacht)*: Jelle is van Jelle. Ik ben van mijn oma. Maar hij heeft me wel eens gebeld. Met een zandplaat in zijn broek.
- **Tammo** *(droog, fluisterend)*: En de naam Fenna? Ik ken een molenaar die zo heet.
- **Wadgids Fenna** *(helder, zacht, geamuseerd)*: Mijn tante. Wij heten hier allemaal Fenna. Er is een tekort aan namen.
- **Wadgids Fenna** *(helder, rustig)*: Zo. Jij roeit. Ik wijs. Als je me hoort ademen, ga je te snel.

**HUD-doelen (in volgorde):** "Roei in stilte langs het riet (geluidsmeter)" → "Houd de koers met de sterren" → "Sluip naar de pier" → "Fotografeer: de vaten, de bestelbus, het grootboek" → "Terug naar de boot, geen lamp"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Wadgids Fenna** *(helder, fluisterend)*: Poolster. Zie je de steel van de Kleine Beer? De laatste ster. Daar.
- **Tammo** *(droog, fluisterend)*: Ik zie een vliegtuig.
- **Wadgids Fenna** *(helder, geduldig)*: Vliegtuigen knipperen. Sterren niet. Dat is het verschil.
- **Tammo** *(zacht, onder de indruk)*: Dat is een heleboel.
- **Wadgids Fenna** *(zacht)*: Dat is de Melkweg. Mijn oma noemt hem de Dijk van de Nacht.
- **Wadgids Fenna** *(fluisterend, scherp)*: Stop. Geen riem meer. Er komt een auto op de dijk.
- **Tammo** *(fluisterend)*: Koplampen. Over het water. Ik ben een steiger.
- **Wadgids Fenna** *(fluisterend, droog)*: Je bent een heel slechte steiger. Maar het is donker.
- **Tammo** *(fluisterend)*: Vaten. Twaalf. O.B. in de zijkant.
- **Tammo** *(fluisterend)*: Een bus. Twee mannen. Ze hangen paling over uit een tank. Hij leeft.
- **Tammo** *(fluisterend, ongelovig)*: Op tafel in dat huisje. Een boek. Kasboek, staat er. Deel drie: Wadkust.
- **Tammo** *(fluisterend)*: Ik fotografeer één pagina. Het scherm is dim. Klik.
- **Wadgids Fenna** *(fluisterend, scherp)*: Een lamp. Daar. Op! Op de grond, Tammo.
- **Tammo** *(fluisterend, buiten adem)*: Een reiger. Hij schrok net zo hard als ik.
- **Wadgids Fenna** *(fluisterend, zacht)*: Ze hoorden hem niet. Een reiger is hier een gewone avond. Ga.

**Scène: Het boek op tafel.** *Camera:* Een lage camera achter de schuur: een raampje met kaarslicht, daarbinnen een tafel, een open boek met een pen eraan. Tammo kruipt in beeld, tilt zijn telefoon omhoog; push-in op de pagina met de namen en getallen. Er is geen muziek, alleen water en riet.

- **Tammo** *(fluisterend, ongelovig)*: Kolom één: namen. Kolom twee: bedragen. Kolom drie: een handtekening.
- **Tammo** *(fluisterend, stil)*: Visser Dolf, achtentwintigduizend. Visser Hendrik, elfduizend. S. de Boer, kotter Trijntje, ZK 53: achttienduizend vierhonderd. Verpand. `[clue]`
- **Wadgids Fenna** *(zacht, geschrokken)*: Dat is mijn oma.
- **Tammo** *(zacht)*: Ik weet het. Ik zie de naam.
- **Wadgids Fenna** *(stil, dan rustig)*: Ze heeft nooit iets gezegd.
- **Tammo** *(zacht, droog)*: Gronings.
- **Wadgids Fenna** *(zacht)*: Nee. Dat is gewoon oma.

**Outro (cutscène).** *Camera:* Op het water, de eerste grijze streep boven de dijk. Fenna roeit nu zelf, Tammo zit met de telefoon op schoot. De camera zweeft laag over het meer, het riet scheert langs, de sterren worden één voor één weggeveegd. Close op de handen van Fenna die het roer vastklemmen.

- **Wadgids Fenna** *(zacht, helder)*: Pandrecht. Op de kotter van mijn opa. De kotter heet Trijntje.
- **Tammo** *(stil, verbaasd)*: Trijntje?
- **Wadgids Fenna** *(zacht, met een glimlach)*: Mijn oma beloofde in 1953 haar eerste schip naar een vriendin te noemen. Dat was een vriendin die haar fiets leende.
- **Tammo** *(droog, zacht)*: De fiets die Oma terugwil.
- **Wadgids Fenna** *(droog, helder)*: Die staat in onze schuur. Onder een zeil. Ze durft hem niet terug te brengen. Dan moet ze zeggen waarom het zeventig jaar duurde.
- **Tammo** *(droog)*: Gronings.
- **Wadgids Fenna** *(helder, vastberaden)*: Fokko heeft het deel. Fokko heeft het Wad. Ik laat mijn oma niet van een boek afhangen.
- **Tammo** *(zacht, vastberaden)*: Wij ook niet.

**Bij herhaling (als klus)**

- **Wadgids Fenna** *(helder, fluisterend)*: Weer donker? Mooi. Dan heb ik de Dijk van de Nacht nog een keer.

**Mislukt** (na het "Sikkom."-scherm)

- **Tammo** *(droog, buiten adem)*: Een lamp op de dijk. En ik ben heel zichtbaar.
- **Wadgids Fenna** *(zacht, droog)*: Het is niet erg. Morgen is het ook donker.

**Berichten na afloop:** *U. Oldenhuis*: "Ik slaap goed in het donker. Jullie hopelijk ook. – U.O."

**Kiekdoar:** "Reiger schrikt op bij het Lauwersmeer. Vogelaar: "Hij had een slechte nacht. Een Stadjer in het riet, zegt hij.""

**Afrondingskaart:** **DONKER GENOEG** · Eén pagina met een naam die Fenna kent. De sterren deden de rest. · *+ € 1800*

**Autogesprek `o12-pass-reiger` (after:O12:pass)**

- **Tessa** *(amused)*: Een reiger. Heeft hij je gezien?
- **Tammo** *(dry)*: Hij schrok net zo hard als ik.
- **Tessa** *(dry)*: Dan hadden jullie samen geschrokken. Dat bindt.

**Autogesprek `o12-pass-sterren` (after:O12:pass)**

- **Tammo** *(soft, wondering)*: Ze noemt de Melkweg de Dijk van de Nacht.
- **Tessa** *(warm)*: Dat is mooi.
- **Tammo** *(dry)*: Zeg het niet tegen Rikus. Hij maakt er een jingle van.

**Autogesprek `o12-fail` (after:O12:fail)**

- **Tammo** *(dry)*: Die lamp had een eigen mening.
- **Tessa** *(quiet)*: Het is donker genoeg als je stilstaat.

**"Wat weten we?"** *Deel drie: Wadkust* (clue): Fokko bewaart het Wadkust-deel van Ubbo's grootboek op de wal bij het Lauwersmeer. Visser Dolf: 28.000. Visser Hendrik: 11.000. Een kotter, ZK 53, "Trijntje": verpand voor 18.400. De vissers staan bij Ubbo in het krijt. · *De kotter Trijntje* (hart): Fenna's oma Sientje noemde in 1953 haar eerste schip naar de vriendin die haar een fiets leende. De fiets staat nog in de schuur, onder een zeil. Zeventig jaar. "Ze durft hem niet terug te brengen."

### O13 · Laag water

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| wad, te voet (getij) | Wadkust & Lauwersmeer (Noordpolderzijl, het Wad) | Tammo | De dijk bij de zijl van Noordpolderzijl (donderdag 24 september, 14:10, laagwater) | € 2200 | `O13` / missie `laagwater` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Ik loop. Doorzetten is het enige wat ik kan.

**Lead (telefoon)**

- **Tessa** *(gespannen, aan de telefoon)*: Fokko liep net het Wad op. Alleen, met een rugzak, bij eb. Fenna zegt dat hij iets heel doms doet.

**Bel Rikus (beller: Dijkwerker, Noordpolderzijl)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee, in het daglicht. Ik voel me een vleermuis. Ik sta op de dijk bij Noordpolderzijl en voor me ligt het Wad, zo ver je kunt kijken.
- **Dijkwerker** *(droog, ernstig, aan de telefoon op de radio)*: Rikus. Dijkwerker, Noordpolderzijl. Er loopt een man het Wad op. Zonder gids. Er staat wind uit het noordwesten. Ik meld alleen.
- **Rikus** *(ernstig, als nacht-dj op de radio)*: Is dat erg?
- **Dijkwerker** *(droog, zacht, aan de telefoon op de radio)*: Dan komt het water eerder. Een uur, soms anderhalf. Hij weet dat. Hij denkt dat hij sneller is.

**Route en plekken.** Noordpolderzijl (de dijk, de zijl en het haventje; start 14:10) → het Wad op via het wadpad langs de bakens (drie geulen; de eerste is een gat van 60 cm) → langs de mosselbank (niet betreden: omlopen) → een dichtgeslibd gat → de plek waar Fokko vastzit (± 3 km uit de kust, richting de Simonszand; naam en ligging uit OSM/zeekaart te controleren) → de hoogste plaat in de buurt, de laatste vluchtplek waar de heli landt. ± 4 km te voet, 10-12 minuten, getij via de **Getijmeter** op de HUD. Een echte eb-vloedcurve voor het Wad bij Lauwersoog (plan 2.7: ~2,5 m verschil); in F4b mag de curve vast staan op de uren van deze missie.

**Verloop**

1. **Intro** op de dijk: Fenna met haar wadkaart, laarzen voor Tammo, de dijkwerker met een verrekijker.
2. **Lopen met Fenna** het Wad op. Ze legt drie regels uit (en herhaalt ze onderweg): de gids bepaalt, je kijkt naar het water, je loopt nooit alleen. Een **tempometer** laat zien of je te snel of te langzaam loopt.
3. **Het Wad oversteken:** een gat (60 cm water), een mosselbank (omlopen: erop stappen kost 20 s en een berisping van Fenna), steltlopers (laat ze, loop er in een boog omheen) en zeehonden op een verre plaat (afstand houden).
4. **De wind draait:** de dijkwerker meldt de **opzet**. De plaat kleurt zilver, de Getijmeter loopt anderhalf uur sneller dan de tabel.
5. **Fokko zit vast** in de klei naast zijn garnalenkar (een smalle kar met brede banden). **Redden in ritme:** plat op je buik (verdeel je gewicht), wachten, draaien, trekken; vier ronden van 4 s. Niet trekken: dan zakt hij dieper.
6. **De terugweg is afgesneden:** het gat achter jullie is nu twee meter. Naar de **hoogste plaat** onder het commando van Fenna ("Links. Nu rechts. Nu staan.").
7. **De heli:** Dokter Dijkstra, met de lier. Eerst Fokko, dan Tammo, de gids als laatste.
8. **Outro** op de dijk met de deken en het boek.

**Falen, overslaan, bezit**

- De Getijmeter is vol voor jullie op de hoogste plaat staan (het water staat op de plaat; geen drama, wel mislukt).
- Tammo staat meer dan 20 s stil in de klei zonder te bewegen.
- Tammo loopt meer dan 40 m van Fenna weg (regel drie): twee waarschuwingen, de derde is mislukt.
- **Overslaan** na één poging: je staat op de hoogste plaat en de heli komt; de scène speelt.
- **Bezit:** niets. De heli is van het UMCG. De laarzen zijn een cadeau van Fenna (cosmetisch; ze zitten in de kledingwinkel onder "Wadloper").
- **Toon:** er is nooit een verdrinkingsgrap. Het Wad is gevaarlijk; Fenna zegt dat met een gewone stem, en het spel luistert naar haar. Het fail-scherm is het gewone "Sikkom." met een extra regel van Fenna.

**Intro (cutscène).** *Camera:* Vanaf de kruin van de dijk kijkt de camera langzaam omlaag: het Wad ligt als een grijze spiegel tot aan de horizon, met zilveren geulen en kleine zwarte vlekken (vogels). Ver weg een eenzaam figuurtje, Fokko. De camera draait naar Fenna, die haar kaart op de motorkap van de dijkwerker uitspreidt, en eindigt bij Tammo's sneakers naast haar laarzen.

- **Dijkwerker** *(droog, ernstig, op de dijk)*: Hij is een uur geleden gegaan. Rugzak, een kar met een motor. Hij loopt naar de Simonszand.
- **Wadgids Fenna** *(helder, ernstig)*: Fokko kent het Wad. Dat is het probleem. Het Wad heeft in de laatste storm een nieuw gat gemaakt. Hij loopt in het oude.
- **Tessa** *(gespannen, aan de telefoon)*: Gaat u erachteraan?
- **Wadgids Fenna** *(helder)*: Ik ga niet achter iemand aan op het Wad. Ik ga naar iemand toe. Dat is iets anders.
- **Tammo** *(droog)*: Wat is het verschil?
- **Wadgids Fenna** *(helder, kort)*: Achter iemand aan haast je. Naar iemand toe kijk je.
- **Wadgids Fenna** *(streng, vriendelijk)*: Drie regels. Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen.
- **Tammo** *(droog)*: Ik ben nooit alleen. Ik loop altijd met Tessa.
- **Wadgids Fenna** *(helder)*: Tessa is er niet. Je hebt mij. Ik ben strenger.
- **Tessa** *(zacht, aan de telefoon)*: Ik blijf op de dijk. Ik hoor alles. Loop, Tammo.
- **Wadgids Fenna** *(helder)*: Laarzen. Geen schoenen. Schoenen blijven in de klei.

**HUD-doelen (in volgorde):** "Loop met Fenna het Wad op" → "Steek het gat over, loop om de mosselbank" → "Vind Fokko, richting de Simonszand" → "Help hem uit de klei (plat, wachten, draaien, trekken)" → "Naar de hoogste plaat, Fenna roept de route" → "Wacht op de heli"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Wadgids Fenna** *(helder)*: Ritme. Niet te snel. Het Wad houdt van tempo, niet van haast.
- **Tammo** *(droog, buiten adem)*: Mijn voeten zijn er nog. Ze voelen niks.
- **Wadgids Fenna** *(kort)*: Gat. Zestig centimeter. Rechtdoor, geen bocht.
- **Tammo** *(verbaasd)*: Dat is koud.
- **Wadgids Fenna** *(helder, ernstig)*: Mosselbank. Rechts omlopen. Daar stap je niet op. Dat is een heel dorp.
- **Wadgids Fenna** *(zacht)*: Steltlopers. Laat ze. Ze staan op de rand van hun eigen eten.
- **Tammo** *(zacht)*: Zeehonden. Op de plaat. Ver weg.
- **Wadgids Fenna** *(helder)*: Ver weg is goed. Ver weg blijft goed.
- **Tessa** *(gespannen, via de telefoon)*: De dijkwerker zegt: het water komt anderhalf uur eerder. Wind uit het noordwesten.
- **Wadgids Fenna** *(ernstig, snel)*: Opzet. De wind duwt het water naar de kust. Het komt sneller dan de tabel. Tammo: tempo omhoog. Niet rennen. Harder lopen, niet sneller haasten.
- **Tammo** *(verbaasd)*: Dat is hem. Dat is Fokko. Hij zit tot zijn heupen in de klei.
- **Fokko de Visser** *(rauw, buiten adem, vastzittend)*: Ga weg. Ik red me wel.
- **Wadgids Fenna** *(helder, kordaat)*: Fokko. Niet trekken. Als je trekt, zak je dieper. Tammo: plat. Op je buik. Gewicht verdelen.
- **Tammo** *(gespannen, plat op de klei)*: Ik lig plat. Hij trekt.
- **Wadgids Fenna** *(kalm)*: Wachten. Draaien. Trekken. Wachten. Draaien. Trekken.
- **Fokko de Visser** *(rauw, hijgend)*: Mijn been komt los.
- **Wadgids Fenna** *(ernstig)*: Het gat achter ons is vol. Twee meter. We kunnen niet terug. De hoogste plaat, daar. Nu.
- **Wadgids Fenna** *(rustig, vastberaden)*: Als je wacht, blijf je staan. Als je loopt, ga je de goede kant op. Dit is lopen.
- **Tessa** *(gespannen)*: Dijkstra is in de lucht. Vier minuten.

**Scène: De hoogste plaat.** *Camera:* De camera zakt van boven: drie figuren op een bult zand, rondom zilver water dat steeds dichterbij komt. Het geluid van een heli komt van links; de camera zwiept omhoog met de heli en draait terug op de plaat. Een lier zakt langzaam in beeld; close op Tammo's gezicht als hij omhoog kijkt.

- **Dokter Dijkstra** *(droog, zakelijk, door de heliradio)*: Wad, hier Dijkstra, UMCG. Mijn heli is terug uit onderhoud. Ik heb hem nog geen lunch gegeven.
- **Dokter Dijkstra** *(nuchter, laconiek)*: Het stond niet in het rooster. Ik heb het er nu onder "wad" in gezet.
- **Wadgids Fenna** *(helder, ernstig)*: Eerst Fokko. Dan Tammo. De gids gaat als laatste.
- **Dokter Dijkstra** *(droog)*: Dat is het enige wat ik vandaag begrijp. Lier gaat naar beneden. Ik vlieg zelf. Jij hangt. Dat zit je blijkbaar in.
- **Tammo** *(droog, aan de lier)*: Mijn moeder mag dit nooit weten.

**Outro (cutscène).** *Camera:* Late middag op de dijk: het water is over het hele Wad gekomen en glinstert in laag licht, de plaat waar ze stonden is verdwenen. Beneden, bij de zijl, zitten Fokko, Tammo en Fenna in folie-dekens op de dijkrand; de dijkwerker schenkt thee uit een thermos. De camera blijft lang op het water staan voor hij naar de gezichten gaat. Geen muziek.

- **Fokko de Visser** *(rauw, stil)*: Ik dank jullie niet.
- **Wadgids Fenna** *(helder, kalm)*: Dat hoeft ook niet. Ik doe het voor het Wad. Niet voor jou.
- **Fokko de Visser** *(stil, rauw)*: Zoals mijn vader. Hij zei dat ook. Hij is er een keer niet teruggekomen.
- **Wadgids Fenna** *(zacht, stil)*: …Dat wist ik niet.
- **Fokko de Visser** *(rauw, kort)*: Niemand weet het. Daarom loop ik. Elke dag. Tot ik de weg ken.
- **Tessa** *(gespannen, zacht, tegen Tammo)*: Tammo. Het boek zit in zijn rugzak. Jij had hem.
- **Tammo** *(zacht, droog)*: Ik weet het. Hij zat net bijna onder de klei. Eén ding tegelijk. Eerst het leven.
- **Tessa** *(zacht)*: Dan het boek.
- **Fokko de Visser** *(rauw, kort)*: Dat is van Ubbo. En Ubbo bijt.
- **Wadgids Fenna** *(koel)*: Ubbo's tanden zijn niet van hier.
- **Fokko de Visser** *(rauw, kort)*: …Ik jureer morgen. Op de pier in Lauwersoog. Ubbo zei: een man van de streek.
- **Tammo** *(zacht, tegen Tessa)*: Ik wil niet dat je overal naartoe loopt.
- **Tessa** *(zacht)*: Ik wil niet dat jij nergens naartoe gaat.
- **Tammo** *(zacht, droog)*: Dat is geen ruzie.
- **Tessa** *(zacht)*: Nee. Dat is een lijstje.

**Bij herhaling (als klus)**

- **Wadgids Fenna** *(helder)*: Weer het Wad? Dan bepaal ik. Dat weet je.

**Mislukt** (na het "Sikkom."-scherm)

- **Wadgids Fenna** *(helder, kalm)*: Het water wint altijd. Daarom lopen we er niet tegenin. Opnieuw, en eerder.
- **Tammo** *(droog, zacht)*: Sorry. Ik keek naar mijn voeten.
- **Wadgids Fenna** *(helder)*: Dat was regel twee. Dat doet iedereen. Eén keer.

**Nachtstreek, na afloop (een korte mededeling, zonder grap) (beller: Rikus zelf)**

- **Rikus** *(ernstig, rustig, als nacht-dj op de radio)*: Nachtstreek. Een korte mededeling. Wie het Wad op gaat, gaat met een gids. Dat is geen advies. Dat is een afspraak. Goedenavond.

**Berichten na afloop:** *U. Oldenhuis*: "Het Wad is groot. Mijn geduld ook. – U.O."

**Kiekdoar:** "Drie mensen van het Wad gehaald bij Noordpolderzijl, met de traumaheli. Arts: "Het stond niet in het rooster. Nu wel." Dijkwerker: "Ik meld alleen: iedereen gaat naar huis.""

**Afrondingskaart:** **LAAG WATER** · Het Wad komt altijd terug. Iedereen ook. · *+ € 2200*

**Autogesprek `o13-pass-laarzen` (after:O13:pass)**

- **Tammo** *(dry)*: Mijn schoenen zitten nog in de klei.
- **Tessa** *(teasing)*: Het Wad heeft ze nu.
- **Tammo** *(dry)*: Hij mag ze houden.

**Autogesprek `o13-pass-regels` (after:O13:pass)**

- **Tessa** *(soft)*: Eén: de gids bepaalt.
- **Tammo** *(dry)*: Twee: je kijkt naar het water.
- **Tessa** *(soft)*: Drie: je loopt nooit alleen.
- **Tammo** *(dry)*: Jij liep niet mee.
- **Tessa** *(warm)*: Ik stond op de dijk. Dat telt als meelopen.

**Autogesprek `o13-fail` (after:O13:fail)**

- **Tammo** *(soft)*: Fenna zegt: het water wint altijd.
- **Tessa** *(quiet)*: Daarom lopen we er niet tegenin.
- **Tammo** *(dry)*: Volgende keer een uur eerder.

**"Wat weten we?"** *Fokko op het Wad* (clue): Fokko liep bij eb het Wad op, richting de Simonszand, met het grootboek-deel in zijn rugzak. Het Wad was hem te snel af. Tammo gaf het boek terug: "Eerst het leven. Dan het boek." Morgen jureert Fokko in Lauwersoog. · *Drie regels van het Wad* (hart): Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen. Fenna: "Ik ga niet achter iemand aan op het Wad. Ik ga naar iemand toe."

### O14 · De boot naar Schier

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| bakken, voorronde, achtervolging, springen, cutscène | Wadkust & Lauwersmeer (Lauwersoog) | Tessa | Lauwersoog, de pier bij de veerboot (havenfeest, vrijdag 25 september, 18:30) | € 3200 | `O14` / missie `schier` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(bazig, warm)*: Ik regel de pier. Jij bakt. Jij bakt beter als ik niet kijk.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Voorronde drie. Lauwersoog, havenfeest. Het reglement zegt: het Wad moet in de eierbal. Fenna heeft zeekraal van een kwelderboer. Fokko zit in de jury.

**Bel Rikus (beller: Ubbo, Oldenhuis Bakt)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee, vanaf de pier in Lauwersoog. Havenfeest. Er speelt een fanfare die alleen marsen kent.
- **Ubbo Oldenhuis** *(joviaal, zakelijk, aan de telefoon op de radio)*: Rikus. Voorronde drie, Wadkust. Reglement: het Wad moet in de eierbal. Paling, bijvoorbeeld.
- **Rikus** *(droog, als nacht-dj op de radio)*: Wie heeft alle paling, Ubbo?
- **Ubbo Oldenhuis** *(tevreden, aan de telefoon op de radio)*: Het is het Wad. Dat is van iedereen. Ik heb alleen de papieren.
- **Rikus** *(droog, als nacht-dj op de radio)*: Er zijn geen papieren.
- **Ubbo Oldenhuis** *(tevreden, aan de telefoon op de radio)*: Precies. Dan is het eerlijk.

**Naamkaarten:** OMA SIENTJE: *"Achtentachtig. Wadvissersvrouw. Heeft nooit iets teruggebracht. Dat gaat nu veranderen."*

**Route en plekken.** Lauwersoog: de pier van het havenfeest (kraam van de Fjord, jurytafel) → langs de kramen en de visafslag-loods → de veerbootterminal en de loopplank (de laatste boot van de dag, 19:05) → **de overtocht naar Schiermonnikoog** (een cutscène, ± 45 s; het eiland zelf bestaat alleen als kade en silhouet) → terug naar Lauwersoog (cutscène, ± 25 s) → de pier voor de uitslag. De pier, de terminal en de veerboot zijn echt (OSM: `amenity=ferry_terminal`, `route=ferry`); de boot en de kapitein zijn verzonnen ("Robbenplaat"). Het eiland komt alleen als Fries decor (plan §3.6): geen landing, geen spelbare kaart.

**Verloop**

1. **Intro** bij de kraam: de jury neemt plaats (Oma Sientje als voorzitter, Visser Dolf, Visser Hendrik, en Fokko namens "de visserij"). Reglement: het Wad in de bal.
2. **Serveren (Tessa):** drie rondes bordjes naar de jury (Tammo bakt, jij loopt de bordjes heen en weer); een balkje "Warm" toont of je op tijd bent. Na de tweede ronde stuurt Jelle een sms.
3. **De bagagekar:** een knecht van Fokko rijdt een kar met een kist met O.B. richting de loopplank van de laatste boot.
4. **Achtervolging te voet** over de pier: kramen, een fanfare, kinderen met suikerspinnen, Havenmeester Tjerk met een fluit. Duw niemand om (een duwtje in de menigte kost seconden, geen wanted).
5. **Springen:** de boot vaart uit (de loopplank gaat omhoog). Spring op de achterkant, de kloof wordt steeds groter (slow motion 1,5 s).
6. **Aan boord:** de knecht rent door de salon en het autodek naar het achterdek met de kist. Pak hem op het achterdek (geen gevecht: vasthouden, E). De kapitein: "Geen gedoe aan boord."
7. **De overtocht (cutscène):** de zee, de zeehonden op de platen, Rottumeroog aan de horizon, Schier. Mem Terpstra op de kade.
8. **De terugvaart (cutscène)** en **de uitslag** op de pier, met het boek op de jurytafel.

**Falen, overslaan, bezit**

- De sprong mislukt drie keer (de boot vaart zonder jou).
- De knecht gooit de kist in de zee (je was op het achterdek niet binnen 8 m na 20 s).
- De bordjes bij de jury koud: drie keer te laat.
- **Overslaan** na één poging: je staat op het achterdek met de kist, de cutscènes spelen, de uitslag volgt.
- **Bezit:** niets. De veerboot is van de veerdienst, het boek komt na de uitslag in de zak van Tessa en gaat in "Wat weten we?".
- **Geld:** een kaartje kost € 7,50, maar een sprong is gratis; Sybren: "Ik reken af in verhalen."

**Intro (cutscène).** *Camera:* De camera opent boven de pier van Lauwersoog in avondlicht: slingers, de fanfare, de Fjord-kraam tussen twee kotters; de camera daalt langs de rij naar de jurytafel (vier stoelen, één vol jenever) en blijft een tel op Fokko, die zijn servet aanraakt. Langzame draai naar Tammo bij de pan.

- **Oma Sientje** *(oud, helder, droog)*: Ik zit in het midden. Ik ben achtentachtig. Ik jureer nu. Niemand durft iets te zeggen. `[naamkaart: sientje]`
- **Tessa** *(strijdlustig, bij de kraam)*: Dag mevrouw Sientje. Wij zijn de Fjord Frituur.
- **Oma Sientje** *(droog)*: Ik weet het. Jullie eierbal heeft zeekraal. Mijn kleindochter heeft het geplukt. Bij de kwelderboer. Niet in de kwelder.
- **Fokko de Visser** *(rauw, vriendelijk dreigend, aan de jurytafel)*: Ik zit hier als iemand van de visserij. Dat zegt mijn naamkaartje.
- **Tammo** *(droog, bij de pan)*: Het naamkaartje zegt niet wie het betaald heeft.
- **Visser** *(droog, zwaar)*: Dolf. Visser. Ik zeg weinig. Dat komt door de schuld.
- **Visser** *(zacht, zwaar)*: Hendrik. Dat is mijn schuld ook.
- **Oma Sientje** *(oud, droog, kijkt naar Fokko)*: Hier wordt niet gepraat over schulden. Hier wordt geproefd.
- **Tessa** *(scherp, zacht, tegen Tammo)*: Hij kijkt de hele tijd naar de kar. Ik ook.

**HUD-doelen (in volgorde):** "Serveer de jury, Tammo bakt" → "Jelle belt: let op de bagagekar" → "Achter de knecht aan over de pier" → "Spring op de vertrekkende veerboot" → "Pak de kist op het achterdek" → "Terug naar de pier voor de uitslag"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(gehaast, bij de pan)*: Eerste lading. Zestig tellen. Zeekraal erin. Het ruikt naar zee.
- **Tessa** *(gehaast)*: Bordje één naar Dolf. Warm. Warm is het hele punt.
- **Visser** *(zwaar, proevend)*: …Ja.
- **Tessa** *(opgelucht, snel)*: Hij zei ja. Dat is voor hem een boek.
- **Tammo** *(droog)*: Jelle heeft een sms gestuurd. Er staat: kijk naar de kar. Er staat ook: moai.
- **Tessa** *(scherp)*: De kar. Met een kist. O.B. aan de zijkant. En de boot vertrekt over drie minuten.
- **Tammo** *(gespannen, bij de pan)*: Ga. Ik red de eierballen. Ik bak niet beter als jij kijkt.
- **Tessa** *(strijdlustig, rennend)*: Ik ben weg. Hou de pan warm.
- **Havenmeester Tjerk** *(streng, fluitend)*: Rustig! Dit is een havenfeest, geen nood! Niet door de kinderen!
- **Tessa** *(buiten adem)*: Sorry! Dringend! Fanfare, opzij!
- **Havenmeester Tjerk** *(waarschuwend, roepend)*: De loopplank gaat omhoog! Niet springen!
- **Tessa** *(gespannen, in de lucht)*: Ik spring altijd. Dat is mijn plan B.
- **Knecht** *(gehaast, op de boot)*: Wat doe jij hier?! Dit is een privékist!
- **Tessa** *(scherp)*: Dat staat erop. In grote letters. O.B. Daarom.
- **Knecht** *(hijgend, wanhopig)*: Ik doe dit voor drie euro per uur. Dat is niet eens vast.
- **Tessa** *(koel)*: Dan hoef je geen kist te verdedigen. Geef maar.

**Scène: De loopplank.** *Camera:* Lage camera op het water tussen kade en boot: de loopplank klapt omhoog, de kloof wordt breder, rook uit de schoorsteen. Een tel stilte, dan Tessa's sprong in slow motion (1,5 s) tegen de rode lucht, haar hand grijpt de reling. De fanfare speelt door, wat zachter dan eerst.

- **Kapitein Sybren** *(kalm, traag, door de boordradio)*: Wy fertrekke. Hâld jo fêst, en jo hoed. *(Wij vertrekken. Houd u vast, en uw hoed.)*
- **Havenmeester Tjerk** *(verontwaardigd, roepend)*: Dat mag niet! Wie springt er nou op een boot?!
- **Tammo** *(droog, aan de telefoon)*: Tessa. Dat is een boot. Geen trampoline.
- **Tessa** *(buiten adem, aan de telefoon)*: Ik zit erop. Het gaat goed. Hij vaart.

**Scène: Het achterdek.** *Camera:* Vanaf het achterdek: het kielzog, de pier die kleiner wordt, meeuwen. Tessa staat tegenover de knecht met de kist tussen hen in; de camera draait langzaam om hen heen terwijl de kapitein verschijnt, in een jas met vier strepen en een pijp in zijn mond.

- **Kapitein Sybren** *(kalm, droog, in de deuropening)*: Jimme sprongen. Ik seach it. De rinplanke wie al omheech. Dat is in "te let". *(Jullie sprongen. Ik zag het. De loopplank was al omhoog. Dat is een "te laat".)*
- **Kapitein Sybren** *(droog, vriendelijk)*: Gjin gedoch oan board. Dit is in fearboat, gjin kroech. *(Geen gedoe aan boord. Dit is een veerboot, geen kroeg.)*
- **Tessa** *(zuiver, vriendelijk)*: Geen gedoe. Alleen een kist. Die is van een man in Lauwersoog die hem niet mag bezitten.
- **Kapitein Sybren** *(kalm, droog)*: Dan is er hjir gast. Ik ha gasten. Hâld him mar. *(Dan is hij hier gast. Ik heb gasten. Houd hem maar.)*
- **Tammo** *(droog, aan de telefoon)*: Heeft hij een kaartje?
- **Kapitein Sybren** *(droog)*: Ik rekkenje ôf yn ferhalen. Fertel it straks mar. Oan mem op Skier. Sy is der al. *(Ik reken af in verhalen. Vertel het straks maar. Aan mem op Schier. Zij is er al.)*

**Scène: De overtocht.** *Camera:* Cutscène, ± 45 s, overslaanbaar: het kielzog in avondlicht; een brede zijshot over de reling met platen vol zeehonden; de camera klimt langs de brug omhoog, richting horizon waar een dunne streep boven het water ligt (Rottumeroog); dan Schiermonnikoog, laag en duinig, met een haventje en een witte dijk. De camera zakt naar de kade en vindt een oude vrouw in een marineblauwe jas met een tas. De tekst "Je bent op Schier geweest" verschijnt pas als de loopplank weer omhoog gaat.

- **Kapitein Sybren** *(droog, kalm, wijzend)*: Dêr. Rottumeroer. Dêr mei gjinien hinne. Ik ek net. Ik sjoch. *(Daar. Rottumeroog. Daar mag niemand heen. Ik ook niet. Ik kijk.)*
- **Tammo** *(zacht)*: Hij is zo plat.
- **Tessa** *(zacht, wijzend)*: Zeehonden. Op elke plaat. Ze liggen te liggen.
- **Kapitein Sybren** *(droog, vriendelijk)*: Dat is de Waadsee. Dy lizze dêr al langer as ik. *(Dat is de Waddenzee. Die liggen daar al langer dan ik.)*
- **Mem Terpstra** *(warm, stellig, op de kade)*: Famke! Jonge! Ik ken jimme fan de radio. Kom hjir, jou dy doaze oan in mem. *(Meisje! Jongen! Ik ken jullie van de radio. Kom hier, geef die doos aan een moeder.)* `[naamkaart: mem]`
- **Mem Terpstra** *(zacht, droog)*: Ik wachtte hier al. Jelle belde. Hy belt altyd te let. Mar ik ha gjin haast. *(Ik wachtte hier al. Jelle belde. Hij belt altijd te laat. Maar ik heb geen haast.)*
- **Tessa** *(zacht, verbaasd)*: Mevrouw Terpstra. Ik had u niet hier verwacht.
- **Mem Terpstra** *(warm, stellig)*: Sinds juni. Bij mijn zus. Mijn bakkerij is een gele gevel. Ik bak nu voor mezelf. Alleen koekjes.
- **Tammo** *(droog, zacht)*: Het spijt me van uw bakkerij.
- **Mem Terpstra** *(zacht, droog)*: Een bakkerij is een stuk gebak. Het deeg blijft. Dat zit in mijn handen.
- **Mem Terpstra** *(warm, stellig)*: Groet Trijntje. Ze belt elke zondag. Ze zegt niks. Ik zeg alles. Dat is een goed gesprek.
- **Mem Terpstra** *(zacht, samenzweerderig)*: En zeg tegen mijn zoon dat hij niet in water moet springen.
- **Tessa** *(geamuseerd)*: Hij weet het.
- **Mem Terpstra** *(warm, droog)*: Hij weet het. Hij doet het toch. Dat is een Terpstra.
- **Kapitein Sybren** *(droog, kalm)*: Wy kearen werom. Gjin kaartsje. Foar mem. *(Wij keren terug. Geen kaartje. Voor mem.)*

**Outro (cutscène).** *Camera:* Schemer op de pier: de fanfare speelt zacht, de lampjes aan, de jurytafel is onveranderd, vier stoelen, een lege vijfde voor Tammo. Tessa stapt uit de menigte met de kist, zet hem op de tafel; de camera gaat laag over het tafelblad en kijkt omhoog naar Dolf en Hendrik terwijl ze het boek openslaan. Close op Sientje bij het proeven. Langzame push-in.

- **Tessa** *(buiten adem, vastberaden)*: Excuses voor de vertraging. Ik was even op Schier.
- **Oma Sientje** *(oud, droog)*: Dat is niet nodig. Hier. Eerst proeven. De rest is voor straks.
- **Visser** *(zwaar, openend het boek)*: Dolf. Achtentwintigduizend. Dat staat hier. Met mijn handtekening.
- **Visser** *(zacht, zwaar)*: Hendrik. Elfduizend. Met de mijne.
- **Fokko de Visser** *(rauw, kort)*: Dat is niet voor jullie.
- **Oma Sientje** *(oud, helder, streng)*: Mijn naam staat er ook in, Fokko. Ik mag hem lezen.
- **Oma Sientje** *(oud, helder)*: …Valt mie nait of. `[clue]`
- **Visser** *(zwaar, proevend)*: Goud.
- **Visser** *(zacht, zwaar)*: Goud.
- **Fokko de Visser** *(rauw, stil, staat op)*: …Ik jureer niet meer. Ik ga naar het Wad. Mijn vader heeft nog een plek.
- **Oma Sientje** *(oud, helder, plechtig)*: De voorronde Wadkust gaat naar de Fjord Frituur. Ik meld alleen.
- **Tammo** *(droog, zacht)*: Hoe weet u dat u mag melden?
- **Oma Sientje** *(oud, droog)*: Dat is mijn nicht. Zij werkt aan een dijk.

**Bij herhaling (als klus)**

- **Oma Sientje** *(oud, droog)*: Weer de voorronde? Ik heb nog tijd. Ik ben achtentachtig.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: De boot is weg. Zonder mij.
- **Tammo** *(droog)*: Met de kist. En met de loopplank.
- **Tessa** *(zuchtend)*: Ik had een tel langer moeten wachten.
- **Tammo** *(droog)*: Op niks?
- **Tessa** *(zacht)*: Nee. Op de sprong.

**Nachtstreek, na afloop (beller: Jelle, Schier)**

- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Jelle belt. Hij belt vanaf een eiland.
- **Jelle Terpstra** *(zacht, ontroerd, aan de telefoon op de radio)*: Mem had de doos niet open gemaakt. Ze zegt dat dat niet netjes is.
- **Rikus** *(droog, als nacht-dj op de radio)*: En het boek, Jelle?
- **Jelle Terpstra** *(waardig, aan de telefoon op de radio)*: Het boek is gered. Ik ben ook gered. Door een klein, gerimpeld vrouwtje. Dat is mem.

**Berichten na afloop:** *U. Oldenhuis*: "Weer één. Ik tel mee. – U.O."

**Kiekdoar:** "Man springt vanaf pier in Lauwersoog op vertrekkende veerboot. Havenmeester: "Dat mag niet." Kapitein: "Het is vrijdag." Voorronde Wadkust gewonnen door Stadse frietwagen; jury unaniem."

**Afrondingskaart:** **DE BOOT NAAR SCHIER** · Voorronde Wadkust: gewonnen. En een boek van een eiland. · *+ € 3200*

**Autogesprek `o14-pass-springen` (after:O14:pass)**

- **Tammo** *(dry)*: Je sprong op een boot.
- **Tessa** *(calm)*: Ik had een plan B. Plan A was een brug.
- **Tammo** *(dry)*: Er was geen brug.
- **Tessa** *(dry)*: Dat is plan B.

**Autogesprek `o14-pass-mem` (after:O14:pass)**

- **Tessa** *(soft)*: Mem Terpstra bakt nu voor zichzelf.
- **Tammo** *(dry)*: Alleen koekjes.
- **Tessa** *(warm)*: Daar zijn we nog niks mee kwijt.

**Autogesprek `o14-pass-drie` (after:O14:pass)**

- **Tessa** *(amused)*: Weer een voorronde. Zeven is een lang getal.
- **Tammo** *(dry)*: En een boot waar je op sprong.
- **Tessa** *(quick)*: Dat is plan B. Die is groter.

**Autogesprek `o14-fail` (after:O14:fail)**

- **Tammo** *(dry)*: De boot vertrok om vijf over zeven.
- **Tessa** *(exasperated)*: De sprong was bedoeld voor vier over.

**"Wat weten we?"** *Het boek op Schier* (clue): Fokko stuurde het Wadkust-deel van Ubbo's grootboek met de laatste boot naar het eiland, in een kist met O.B. Tessa sprong er achteraan. Mem Terpstra stond op de kade. Op de pier las Visser Dolf zijn eigen schuld: achtentwintigduizend, met zijn handtekening. · *Voorronde Wadkust* (clue): Gewonnen in Lauwersoog. Oma Sientje jureerde als voorzitter: "Valt mie nait of." Fokko stond op en ging. "Ik ga naar het Wad. Mijn vader heeft nog een plek." · *Mem op Schier* (hart): Mem Terpstra woont sinds juni bij haar zus op het eiland. Haar bakkerij in Ljouwert is nu een gele gevel. Ze bakt alleen koekjes, voor zichzelf. "Het deeg blijft. Dat zit in mijn handen."

### Tussendoor: Een kotter in Lauwersoog (`n-kotter`)

Speler: Tammo. Doel: `{ type: 'filiaal', at: 'lauwersoog' }   // the kotter (safehouse, a jolly boat at the quay, the wadkaart) and the filiaal at the quay (A22)`.

**Wissel**

- **Tammo** *(droog)*: Ik ga wel kijken. Een schip dat niet vaart is het enige schip waar ik niet zeeziek van word.

**Lead**

- **Tessa** *(warm, aan de telefoon)*: Oma Sientje heeft een sleutel voor ons. Van de kotter. En Fenna wil een luik in de zijkant.

**Onderweg (companion)**

- **Tessa** *(plagend)*: Een kotter. Dan heb jij eindelijk een huis dat ook kan zinken.
- **Tammo** *(droog)*: Hij ligt vast aan de kade. Hij zinkt niet. Dat is de afspraak.

**Scène: De kotter Trijntje, Lauwersoog.** *Camera:* Avond op de kade: trage dolly langs de oude kotter, ZK 53 in witte letters op de boeg, netten over de reling, de kajuit met een gordijntje. Sientje zit op een klapstoeltje op het dek; Fenna rolt een fiets uit het ruim. De zon zakt achter de dijk.

- **Oma Sientje** *(oud, droog)*: Daar is ze. ZK 53. Vierenzestig jaar. Ze vaart niet meer. Ze ligt graag.
- **Tammo** *(droog)*: Ze heet Trijntje.
- **Oma Sientje** *(oud, droog, zacht)*: Ik heb het beloofd. In 1953. Ze leende me haar fiets voor mijn trouwdag. Ik heb hem nooit teruggebracht.
- **Tessa** *(zacht)*: Oma wil hem terug.
- **Oma Sientje** *(oud, droog, zacht)*: Hij staat achter in het ruim. Poetsen kan ik niet meer. Jullie mogen hem rijden. Niet houden. Hij is van haar.
- **Oma Sientje** *(oud, droog)*: Ik was haar iets schuldig. Nu ben ik jullie iets schuldig. Dat is erger.
- **Tessa** *(zacht)*: Het pandrecht is weg. De pagina's zijn van ons.
- **Oma Sientje** *(oud, helder)*: Papier is papier. Ik schrijf "betaald" in de kantlijn. Dan is het van mij.
- **Wadgids Fenna** *(helder, geamuseerd)*: Mijn oma schrijft in andermans boeken. Dat doet ze al zeventig jaar.
- **Tessa** *(zacht, enthousiast)*: Een Fjord Frituur aan de kade. De Wad-eierbal, met zeekraal.
- **Tammo** *(droog)*: En een kotter die nooit vaart.
- **Tessa** *(zacht)*: Een basis, Tammo. Geen wagen. Een basis.
- **Tammo** *(droog, zacht)*: Zo begint een filiaal.

**Klaar (telefoon)**

- **Tessa** *(warm, aan de telefoon)*: Filiaal: Lauwersoog. Sientje bakt alleen als het stil is. Het is bijna altijd stil.

**HUD-meldingen:** "Filiaal geopend: Fjord Frituur Lauwersoog (Sientje en Fenna)" · "Safehouse: de kotter Trijntje in Lauwersoog, met een beiboot en de wadkaart" · "Nieuw recept: de Wad-eierbal, met zeekraal" · "Oma's fiets (geleend): staat in het ruim"


### Ring 2 · Het Westerkwartier

Bondgenoot **Tinus** (kleinzoon van **Hinderk**, "Hinderk, Tolbert" op Oma's lijstje), tegenstander **Hilko Kremer** (rally en trekkertrek met Ubbo's geld), melder de **molenaar**. Het landschap is het **coulisselandschap**: houtwallen, grindwegen, kleine dorpen (Zuidhorn, Grijpskerk, Leek, Marum, Aduard, Niekerk, Tolbert). Safehouse na O18: de schuur van opa bij Leek.

### Tussendoor: Met de trein naar Zuidhorn (`n-zuidhorn`)

Speler: Tammo. Doel: `{ type: 'train', to: 'Zuidhorn', line: 'leeuwarden', cab: 'jantina' }   // the first ride may always be by train (plan 3.7); the line Groningen-Zuidhorn-Grijpskerk-Leeuwarden`.

**Wissel**

- **Tammo** *(droog)*: Ik reis. Treinen zijn de enige voertuigen die nooit mijn schuld zijn.

**Lead**

- **Tessa** *(nieuwsgierig, aan de telefoon)*: Oma had een naam: Hinderk, Tolbert. Hij is dood, zegt ze. Maar zijn kleinzoon heeft een trekker. De trein naar Leeuwarden stopt in Zuidhorn.

**Onderweg (companion)**

- **Tessa** *(vrolijk, bij het raam)*: Kijk. Houtwallen. Alles hier staat achter een rij bomen.
- **Tammo** *(droog)*: Alsof ze zich verstoppen.
- **Tessa** *(plagend)*: Net als jij. Op feestjes.
- **Tammo** *(droog)*: Ik verstop me niet. Ik sta strategisch.

**Scène: Station Zuidhorn.** *Camera:* Vanaf de treindeur: het perron, een rij bomen, achter de bomen een molen. De camera blijft hangen op een man op een fiets die over het perronpad aankomt, en volgt hem naar het duo; als hij praat, trekt de camera zachtjes terug en laat het weidse land met de houtwallen zien (kaartonthulling langs de lijn, `revealCorridor('leeuwarden')`).

- **Molenaar** *(droog, kalm, stappend van zijn fiets)*: Moi. Ik zag jullie uit de trein komen. Hier stopt hij twee keer per uur. Ik tel ze allebei. Ik ben molenaar. De wind is mijn collega. `[naamkaart: molenaar]`
- **Tammo** *(droog)*: Wij kennen een molenaar in Winsum. Fenna.
- **Molenaar** *(droog)*: Mijn nicht. Zij draait met de wind. Ik draai er tegenin. Dat geeft evenwicht.
- **Tessa** *(nieuwsgierig)*: En wat meldt u?
- **Molenaar** *(droog, kalm)*: Er rijden 's nachts drie witte vrachtwagens langs mijn molen. Zonder naam. Ze rijden niet naar Friesland. Ze rijden er langs. Ik meld alleen. `[clue]`
- **Tammo** *(zacht, droog tegen Tessa)*: Zo praat de dijkwerker ook.
- **Molenaar** *(droog)*: Die ken ik niet. Maar dat klinkt familie.

**Klaar (telefoon)**

- **Tessa** *(warm, aan de telefoon)*: Zuidhorn. Een station, een molen aan de horizon en geen haast. Ik zou hier een filiaal willen.

**HUD-meldingen:** "De Wadkust en het Westerkwartier: de ring is open" · "Oma's lijstje: Hinderk, Tolbert"

### O15 · Trekkertrek

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| trekker, tunen, trekkertrek | Westerkwartier (Tolbert, Zuidhorn, Leek, Niekerk) | Tammo | Het erf van Tinus aan de rand van Tolbert (fictief erf; zaterdag 26 september, 09:00) | € 2000 | `O15` / missie `trekker` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tammo** *(droog)*: Een trekker kan ik. Een trekker oordeelt niet.

**Lead (telefoon)**

- **Tessa** *(droog, aan de telefoon)*: Tinus. Kleinzoon van Hinderk. Hij heeft een trekker en geen motor, en vanmiddag is de finale trekkertrek. Hilko rijdt mee.

**Bel Rikus (beller: Tinus, Tolbert)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee, tussen de houtwallen. Ik sta op een erf. Naast me staat een trekker zonder motor. Hij kijkt me aan.
- **Tinus** *(gehaast, jong, aan de telefoon op de radio)*: Rikus. Tinus, Tolbert. Mijn opa is dood. Zijn trekker leeft. De motor niet.
- **Rikus** *(droog, zacht, als nacht-dj op de radio)*: Wat is er met de motor?
- **Tinus** *(stug, aan de telefoon op de radio)*: Hij ligt in een emmer. In stukken. Opa zei: schroef hem maar uit elkaar, dan zie je wat er mis is. Dat heb ik gedaan.
- **Rikus** *(droog, als nacht-dj op de radio)*: En de trekkertrek, Tinus?
- **Tinus** *(stil, droog, aan de telefoon op de radio)*: Zaterdag. Finale. Opa heeft me ingeschreven. In maart. Hij wist het al.

**Naamkaarten:** TINUS: *"Trekkertrekker. Rijdt voor opa. De motor zit in een emmer."* · HILKO KREMER: *"Rallyrijder. Heeft de snelste auto en het meeste geld van Ubbo."*

**Route en plekken.** Het erf van Tinus (Tolbert, fictief; de plek krijgt geen straatnaam) → een sloperij bij Zuidhorn (fictief, "Sloperij De Laatste Versnelling": het motorblok) → de werkplaats van een vriend van Henk in Leek (een turbo in een melkbus) → het erf van Boer Evert (dertig betonnen gewichten) → terug naar Tinus (tunen) → de trekkertrekbaan bij Niekerk (een fictieve baan naast het sportveld; naam en plek in OSM te controleren). Rijden tussen de plekken: een geleende pick-up met aanhanger (Tinus' pick-up, `handBack`); de Fjord mag ook, maar de aanhanger is te zwaar voor de Escapade.

**Verloop**

1. **Intro** op het erf: de grijze trekker van Hinderk, de motor in een emmer, Tinus op een kist.
2. **Drie onderdelen halen** (vrije volgorde): (1) het motorblok bij de sloperij (gratis, je moet hem zelf op de kar tillen: E ingedrukt houden, 4 s), (2) de turbo bij Henks vriend in Leek (Henk belt: "Ik vraag niet waarom."), (3) dertig gewichten bij Boer Evert (laden en weer terugbrengen na de trek).
3. **Tunen** op het erf (drie schuiven: toeren, gewichten voorop, bandenspanning). Een proefstart toont hoe ver de slee komt; "goed genoeg" is genoeg.
4. **De trekkertrek:** kwalificatie en halve finale (de slee wordt zwaarder; zo ver mogelijk komen voor de wielen slippen of de motor afslaat). Hilko rijdt tegen je in de finale met een zwarte monstertrekker met een logo.
5. **De finale:** de baan is vol zwarte rook. Hilko's ballast schuift (zijn slee "verschuift" het gewicht naar voren). Een *Full pull* is mogelijk, maar niet verplicht om door te gaan: de volgende ronde telt.
6. **Outro** op de baan met Tinus en het briefje van opa.

**Falen, overslaan, bezit**

- De motor slaat drie keer af tijdens de trek (elke trek is een poging; na drie pogingen is het mislukt).
- Je kwalificatietijd is langer dan die van Hilko én je haalt de halve finale niet.
- **Overslaan** na één poging: je staat in de finale met de motor erin; de trek speelt als scène en Tinus wint.
- **Bezit:** de trekker is van Tinus en blijft van opa (`handBack`, de pick-up idem). Een **eigen trekker** kun je kopen (activiteit trekkertrek; oud € 2.500, nieuw € 9.000, optional).
- **Geld:** het blok is gratis, de turbo een gunst, de gewichten komen terug; geen stap kost geld.

**Intro (cutscène).** *Camera:* Het erf in de ochtend, een druppende kraan; de camera begint op een emmer met koperkleurige onderdelen en tilt dan langzaam langs de grijze trekker omhoog tot de zwarte stuurkolom. Tinus zit op een kist met een kop koffie, zijn handen om de beker, zijn blik op de emmer. Een korte dolly naar Tammo, die zijn hand op het stuurwiel legt.

- **Tinus** *(stug, jong, droog)*: Moi. Jij bent die Stadjer van de radio. Ik heb een trekker en geen motor. De motor zit in die emmer. `[naamkaart: tinus]`
- **Tammo** *(droog)*: Ik zie de emmer. Ik zie geen motor.
- **Tinus** *(stil, droog)*: Mijn opa zei: Tinus, schroef hem maar uit elkaar. Dan zie je wat er mis is. Hij overleed in april. Ik heb hem uit elkaar geschroefd. Nu zie ik niks.
- **Tammo** *(zacht, droog)*: Dat is ook een manier om verdriet te hebben.
- **Tinus** *(stug)*: Ik ben ingeschreven voor de finale. Vanmiddag. Opa heeft me ingeschreven. Hij wist het al.
- **Tessa** *(warm, aan de telefoon)*: Wie rijdt er nog meer mee?
- **Tinus** *(stug, droog)*: Hilko Kremer. Rallyrijder. Hij heeft sinds mei een trekker. Hij heeft een sponsor en een logo. Hij is groot en zwart.
- **Tammo** *(droog)*: Wij hebben een emmer.
- **Tinus** *(droog)*: Ik heb drie plekken. Een sloper bij Zuidhorn: een blok. Een vriend van Henk in Leek: een turbo. Boer Evert: gewichten.
- **Tammo** *(droog)*: Henk. Natuurlijk.
- **Tinus** *(stug, zacht)*: Hij belde gisteren. Hij zei: ik vraag niet waarom. Dat was alles. Ik vond het heel veel.

**HUD-doelen (in volgorde):** "Haal het motorblok bij de sloper" → "Haal de turbo bij Henks vriend in Leek" → "Haal de gewichten bij Boer Evert" → "Tune de trekker op het erf" → "Trek in de kwalificatie en de halve finale" → "De finale tegen Hilko"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Monteur** *(droog, vermoeid, bij de sloperij)*: Het blok is gratis. Je moet hem er zelf uit tillen. Dat is mijn tarief.
- **Tammo** *(gespannen, tillend)*: Hij weegt als een wasmachine met een geheim.
- **Henk** *(gemoedelijk, aan de telefoon)*: De turbo ligt bij Wietse in Leek. Onder de werkbank. In een melkbus. Ik weet niet waarom. Ik vraag het ook niet.
- **Tammo** *(droog)*: Een turbo in een melkbus. Dat is Leek.
- **Boer Evert** *(droog, nuchter)*: Evert. Gewichten. Dertig stuks. Ze zijn van beton en ze zijn van mijn vader. Breng ze terug. En nog een beetje meer.
- **Tinus** *(stug, bij de trekker)*: Banden lager. Dan grijpen ze. Hoger, dan glijden ze. Jij voelt het met je rug. Zei opa.
- **Tinus** *(stil, bij de trekker)*: Hij start. Opa. Hij start.
- **Tammo** *(droog, zacht)*: Hij start op je opa. Dat is geen motor. Dat is een belofte.
- **Omroeper** *(luid, enthousiast, op de baan)*: En nu de finale! Tinus, een jongen met een emmer! Tegen Hilko Kremer, de man met de sponsor!
- **Hilko Kremer** *(luid, zelfverzekerd, vanuit zijn monstertrekker)*: Moi, Stadjer. Ik heb een logo. Jij hebt een emmer. `[naamkaart: hilko]`
- **Tammo** *(droog)*: De emmer is leeg. De motor niet.
- **Hilko Kremer** *(grinnikend)*: Het is een trekker, geen vrijgezellenfeest.
- **Tinus** *(gespannen)*: Niet te hard. Niet te zacht. Een trekker voel je met je rug.
- **Omroeper** *(luid, ademloos)*: Hij trekt! De slee zit vol! Hij trekt nog steeds!
- **Tammo** *(geconcentreerd)*: Ik voel hem. Hij trekt mee.
- **Tammo** *(droog, verbaasd)*: Zijn gewicht ligt voor. Op de slee van Hilko. Het schuift.
- **Omroeper** *(luid, plechtig)*: Twee-en-veertig meter voor de Grijze! Dat heeft hier in geen jaren iemand met een emmer gehaald!
- **Hilko Kremer** *(woedend, door de rook)*: Mijn gewicht verschoof! Dat kan niet!
- **Tammo** *(droog)*: Dat zeggen ze ook van een boom.

**Outro (cutscène).** *Camera:* Het veld na de finale: de rook trekt op, de zon laag, Tinus staat naast de trekker met zijn hand op het spatbord. De camera zweeft langzaam rond hem en beweegt naar Tammo, die bij het hek leunt. Dan een inzoom op de koektrommel die Tinus openmaakt.

- **Tinus** *(stil, droog)*: Opa kreeg nooit een beker. Hij kreeg een stukje vlees van de slager.
- **Tammo** *(zacht)*: Dat is ook een beker.
- **Tinus** *(stil)*: In zijn koektrommel zat een briefje. Ik vond het gisteren. "Rit naar Bourtange. Trijntje. Schuldig sinds 1953."
- **Tessa** *(zacht, aan de telefoon)*: Hij schreef het op.
- **Tinus** *(stug, zacht)*: Hij kon niet meer rijden. Ik wel. Schuld erft. Dat zegt jullie oma toch?
- **Tammo** *(droog, ontroerd)*: Dat zegt ze. Ze heeft gelijk. Dat zeg ik niet vaak.
- **Tinus** *(stug, droog)*: Mijn oom heeft een rallyauto. Zijn rug doet het niet meer. Hij leent hem. Voor het geval jullie hem nodig hebben.
- **Tinus** *(stil)*: En jullie mogen de trekker lenen. Niet houden. Hij is van opa. Hij blijft van opa.
- **Oma Trijntje** *(stellig, oud, aan de telefoon)*: Hinderk. Vijf uur in de regen heb ik gelopen. Ik werd tweede. Dat is zijn schuld.
- **Tammo** *(droog, aan de telefoon)*: Dat is niet de schuld van de jury van Oldenhuis, oma?
- **Oma Trijntje** *(droog, aan de telefoon)*: Dat ook. Maar eerst Hinderk. Eén ding tegelijk. Rij me nog eens naar Bourtange, jong. Op die trekker. Als het zover is.

**Bij herhaling (als klus)**

- **Tinus** *(stug, droog)*: Weer trekken? De emmer is leeg. Dat is een goed teken.

**Mislukt** (na het "Sikkom."-scherm)

- **Tinus** *(stil)*: Hij slaat af. Zoals opa. Altijd net voor het einde.
- **Tammo** *(droog, zacht)*: Dan is hij tenminste op tijd. Opnieuw.

**Nachtstreek, na afloop (beller: Hilko, Westerkwartier)**

- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Hilko Kremer belt in. Dat was geen verlies, zegt hij.
- **Hilko Kremer** *(luid, zelfverzekerd, aan de telefoon op de radio)*: Dat was een testrit, Rikus. Met een emmer.
- **Rikus** *(droog, als nacht-dj op de radio)*: Je gewicht schoof.
- **Hilko Kremer** *(stug, aan de telefoon op de radio)*: Dat is een kenmerk. En vanavond rijden de vrachtwagens. Denk daar maar aan.

**Berichten na afloop:** *U. Oldenhuis*: "Een emmer. Mooi verhaal. Ik koop verhalen. – U.O."

**Kiekdoar:** "Trekkertrek Niekerk: Stadjer wint met opa's trekker en een emmer. Loonwerker van de zwarte: "Mijn gewicht schoof." Organisatie: "Dat is nu eenmaal een kenmerk.""

**Afrondingskaart:** **TREKKERTREK** · Opa's trekker startte. De emmer was leeg. · *+ € 2000*

**Autogesprek `o15-pass-emmer` (after:O15:pass)**

- **Tessa** *(amused)*: Je won met een emmer.
- **Tammo** *(dry)*: Hij was leeg. Dat helpt.
- **Tessa** *(warm)*: Opa zou trots zijn.

**Autogesprek `o15-pass-schuld` (after:O15:pass)**

- **Tessa** *(soft)*: Rit naar Bourtange. Schuldig sinds 1953.
- **Tammo** *(dry)*: Oma heeft overal een lijstje.
- **Tessa** *(quiet)*: En de mensen komen terug. Dat is het mooie.

**Autogesprek `o15-fail` (after:O15:fail)**

- **Tammo** *(dry)*: De motor sloeg af.
- **Tessa** *(gentle)*: Hij gaat altijd net voor het einde af. Dat is een karakter.

**"Wat weten we?"** *De Grijze* (hart): Hinderks grijze trekker, met een motor die in een emmer lag. Tinus startte hem op zijn opa. Een koektrommel met een briefje: "Rit naar Bourtange. Trijntje. Schuldig sinds 1953." · *Hilko Kremer* (clue): Rallyrijder met een zwarte monstertrekker, een logo en het geld van Ubbo. Zijn ballast "schoof". Hij zegt: vanavond rijden de vrachtwagens. De molenaar telt er drie, elke nacht. · *Tinus' oom* (clue): Tinus' oom heeft een rallyauto en een slechte rug. Hij leent hem uit, voor het geval we hem nodig hebben.

### O16 · Over het kanaal

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| konvooi volgen, sluipen, grensrit | Westerkwartier (Zuidhorn, het Van Starkenborghkanaal, de Friese grens) | Tessa | Zuidhorn, de brug over het Van Starkenborghkanaal (zaterdagnacht 26 september, 22:30) | € 2200 | `O16` / missie `kanaal` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(zakelijk)*: Ik rij. Een konvooi kun je niet verstoppen. Wel volgen.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: De molenaar telde drie witte vrachtwagens langs zijn molen. Henk heeft nog een zender. In het handschoenenvak van de Fjord. Hij vraagt niet waarom.

**Bel Rikus (beller: Molenaar, Zuidhorn)**

- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek, op tournee, langs het kanaal. De schepen zijn weg. Het is stil. Dat klopt niet.
- **Molenaar** *(droog, kalm, aan de telefoon op de radio)*: Rikus. Molenaar, Zuidhorn. Er rijden drie witte vrachtwagens langs mijn molen. Elke nacht. Ze rijden niet naar Friesland. Ze rijden er langs. Ik meld alleen.
- **Rikus** *(droog, als nacht-dj op de radio)*: Wat is het verschil?
- **Molenaar** *(droog, kalm, aan de telefoon op de radio)*: Wie naar Friesland rijdt, gaat over de brug. Zij gaan eromheen. Op de N355 staat een weegbrug. Daar willen ze niet langs.

**Route en plekken.** Zuidhorn (de brug over het Van Starkenborghkanaal) → de kanaalweg westwaarts langs het water (± 10 km, de molen, de houtwallen, geen verlichting) → de beweegbare brug bij Gaarkeuken (de grens met Friesland; het spel zet er een Friese kant aan) → de weegbrug op de N355 bij Zuidhorn (het konvooi wordt teruggestuurd). Welke bruggen echt beweegbaar zijn, en waar de weegbrug ligt, uit OSM (`bridge=movable`, `highway=*`); anders verzonnen op de echte plek. Leenauto: Tinus' pick-up (`handBack`).

**Verloop**

1. **Henks tweede zender** uit het handschoenenvak van de Fjord (E, 3 s). Henk zette er ooit twee in; de eerste deed zijn werk in O8.
2. **Volg het konvooi** (drie witte vrachtwagens, "O.B." in kleine letters onder de bumpervlag): blijf tussen 40 en 120 m en laat je lampen aan. Een **Alertmeter** loopt op als je te dichtbij komt of in een spiegel zichtbaar bent; te ver weg (> 200 m) = kwijt.
3. **De grensbrug:** het konvooi stopt voor de brug (er moet een boot door). Jelle in de *Foar Mem II* vaart onder de brug door, draait om, en vaart er weer onder: volgens het "Friese recht" blijft een brug open zolang er een Fries onder vaart. De brug blijft open (4 minuten).
4. **De zender plakken:** loop langs de wachtende trucks; plak de zender onder de derde, de truck van Durk en Douwe. Kom niet in de spiegels.
5. **Scène bij de brug:** Durk en Douwe stappen uit; aan de overkant staan Wybe en Wiebren, hun neven, de Friese "grenswacht".
6. **De weegbrug:** de brug blijft open, dus het konvooi moet terug naar Zuidhorn, waar de weegbrug staat. De agent weegt.

**Falen, overslaan, bezit**

- De Alertmeter is vol (de trucks keren om en zijn weg).
- Je raakt het konvooi kwijt (> 200 m, 12 s).
- De zender zit er niet op voor de brug sluit (4 minuten, Jelle kan niet langer varen).
- Je auto is total loss of ligt in het kanaal (het water is geen shortcut).
- **Overslaan** na één poging: de zender zit op truck drie, de scène speelt.
- **Bezit:** de pick-up is van Tinus (`handBack: { how: 'park' }`); niets wordt je eigendom.

**Intro (cutscène).** *Camera:* De camera begint laag langs het kanaalwater: een lange rij donkere houtwallen, daarachter de molen zonder zeilen. Koplampen komen van achter de bocht, drie witte vrachtwagens, langzaam, met een rij op afstand. De camera glijdt langs de molen naar het duo in de pick-up, die de lichten uitdoet.

- **Molenaar** *(droog, kalm, bij de molen)*: Ze komen om half elf. Ik heb een stopwatch en een kijker. Ik meld alleen als ze er zijn.
- **Tessa** *(zakelijk)*: Wat zit er in?
- **Molenaar** *(droog)*: Vet. Geen idee van wie. Maar het ruikt naar Ubbo. En aan de zijkant staat een O en een B. Dat is geen toeval.
- **Tammo** *(droog)*: Waarom nemen ze niet de N355?
- **Molenaar** *(droog, kalm)*: Daar staat een weegbrug. Ze zijn te zwaar. Op elke as. Dus gaan ze via Friesland. Over het kanaal, om de weegbrug heen.
- **Tessa** *(strijdlustig)*: Dan zorgen we dat de weegbrug naar hen toe komt.
- **Molenaar** *(droog)*: Dat is ook een manier. Ik meld alleen.

**HUD-doelen (in volgorde):** "Haal Henks tweede zender uit het handschoenenvak" → "Volg het konvooi (40-120 m, Alertmeter)" → "De grensbrug: Jelle houdt hem open" → "Plak de zender onder de derde truck" → "Zie wat er aan de brug gebeurt" → "Naar de weegbrug"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(droog, aan de telefoon)*: Henk belt. Hij zegt: schroefje los, voor het handschoenenvak. Hij vraagt niet waarom.
- **Tessa** *(zakelijk)*: Hij zit in mijn zak. Drie trucks. Vierhonderd meter. Niet naderen.
- **Tammo** *(droog)*: We zijn blauw, Tessa. We zijn heel blauw in een zwarte nacht.
- **Tessa** *(droog)*: Daarom hebben we een pick-up. Die is niet blauw.
- **Tammo** *(gespannen)*: De achterste kijkt in de spiegel. Terug. Rustig.
- **Tessa** *(zacht)*: Er zit een bocht aan. Lichten uit tot de bocht. Nu.
- **Tammo** *(verbaasd)*: Ze stoppen. Voor de brug. Er komt een boot.
- **Tessa** *(ongelovig)*: Het is Jelle. In dat bootje. Met die vlag.
- **Jelle Terpstra** *(opgewekt, vanaf het water)*: Wis en wrachtich! Een Fries mag altijd onder een brug door! Zolang ik eronder vaar, blijft hij open! *(Echt waar! Een Fries mag altijd onder een brug door! Zolang ik eronder vaar, blijft hij open!)*
- **Tammo** *(droog)*: Hij vaart rondjes. Onder een brug. Dat is ook een soort wereldrecord.
- **Tessa** *(zacht, geconcentreerd)*: De derde. Onder de derde truck. Langs de spiegel. Nu.
- **Tammo** *(fluisterend)*: Plakken. Klik. Hij zit.
- **Tessa** *(opgelucht)*: De zender zit. De brug blijft open. Jelle blijft varen.

**Scène: De brug over het kanaal.** *Camera:* Over het water: de brug staat omhoog, het licht van de koplampen trilt in het kanaal. Aan de overkant twee grote mannen in te kleine uniformen achter een klaptafel met een bordje "Fryske Grins", aan deze kant twee grote mannen in een vrachtwagenhut. Tweeshots over het water, heen en weer; Jelle vaart door het kader.

- **Wybe** *(traag, plechtig, over het water)*: Halt. Fryske grins. Paspoart, as it jo belieft. *(Halt. Friese grens. Paspoort, alstublieft.)*
- **Durk** *(traag, verbaasd, uit de cabine)*: Wybe?
- **Wiebren** *(traag, verrast)*: …Durk?
- **Douwe** *(traag)*: …Wiebren.
- **Durk** *(traag, blij)*: Neven!
- **Wybe** *(traag, plechtig)*: Wy binne hjir net. Wy steane hjir gewoan. *(Wij zijn hier niet. Wij staan hier gewoon.)*
- **Durk** *(traag, eerlijk)*: Wij moeten naar Kollum. Naar een koelhuis. De baas zegt.
- **Douwe** *(traag)*: …zegt.
- **Wiebren** *(traag, ontzet)*: Net fertelle, Durk. *(Niet doorvertellen, Durk.)*
- **Durk** *(traag, schuldig)*: …Ik heb het al verteld.
- **Wybe** *(traag, plechtig)*: De brêge is iepen. De brêge bliuwt iepen. Dat is it Fryske rjocht. *(De brug is open. De brug blijft open. Dat is het Friese recht.)*
- **Tessa** *(droog, zacht, vanuit de pick-up)*: Het Friese recht. Dat is nieuw.
- **Tammo** *(droog)*: Dat is oud. Ze hebben het net bedacht.
- **Durk** *(traag, plechtig)*: Wij kunnen niet terug. Achter ons staat een trailer.
- **Douwe** *(traag)*: …trailer.
- **Agent** *(droog, kortaf, bij het bord)*: Weegbrug. De N355 is open. Wie niet over de brug kan, kan naar de weegbrug. Iedereen mee.
- **Agent** *(droog, tevreden, bij de weegbrug)*: Gewogen en te zwaar bevonden. Op elke as. Dat is een prestatie.
- **Durk** *(traag, plechtig)*: Wij kwamen niet langs de weegbrug. Wij kwamen er alleen.
- **Agent** *(droog)*: Dan zijn jullie er nu langs.

**Outro (cutscène).** *Camera:* Midden in de nacht bij de weegbrug: de trucks staan in rij met het zwaailicht van een politieauto over de laadbakken; de agent met een klembord. De pick-up staat op afstand, Tessa en Tammo leunen op de motorkap; op Tessa's telefoon beweegt een stip. Een lange totaal van het kanaal met de open brug erachter en een klein zwaaiend figuur op een bootje.

- **Tammo** *(droog, aan de motorkap)*: Elke as te zwaar. Dat is zijn grootste fout.
- **Tessa** *(tevreden)*: Niet de enige. Kijk. De zender beweegt. Truck drie gaat straks naar Kollum, als hij gewogen is. Een koelhuis. In Friesland.
- **Tammo** *(droog)*: Dat is buiten ons gebied.
- **Tessa** *(scherp)*: Daarom hebben we Jelle. Hij woont er.
- **Tammo** *(droog)*: Hij woont in een zwemvest.
- **Molenaar** *(droog, kalm, aan de telefoon)*: Ik zag het van mijn molen. Het was een mooie nacht. Ik meld alleen: ik ga slapen.

**Bij herhaling (als klus)**

- **Molenaar** *(droog, kalm)*: Weer een konvooi? Ik tel mee. Ik heb de tijd.

**Mislukt** (na het "Sikkom."-scherm)

- **Tammo** *(droog)*: Ze zagen ons. In de spiegel. Het is een brede spiegel.
- **Tessa** *(koel)*: Het is een vrachtwagen, Tammo. Alles aan hem is breed.

**Berichten na afloop:** *U. Oldenhuis*: "Een weegbrug. Wie bedenkt zoiets. – U.O."

**Kiekdoar:** "Drie vrachtwagens op de weegbrug in Zuidhorn: "Op elke as te zwaar." Politie: "Dat is een prestatie." Bij de brug bij Gaarkeuken blijft een brug open voor een Fries in een bootje: "Dat is het Friese recht.""

**Afrondingskaart:** **OVER HET KANAAL** · Drie witte trucks, één weegbrug en een brug die bleef openstaan. · *+ € 2200*

**Autogesprek `o16-pass-brug` (after:O16:pass)**

- **Tessa** *(amused)*: Het Friese recht. Dat bestaat niet.
- **Tammo** *(dry)*: Nu wel. Hij vaart er nog steeds rond.
- **Tessa** *(dry)*: Hij gaat niet weg. Dat is ook Fries.

**Autogesprek `o16-pass-neven` (after:O16:pass)**

- **Tammo** *(dry)*: Durk vertelde alles aan zijn neef.
- **Tessa** *(dry)*: Zijn neef zei: niet doorvertellen.
- **Tammo** *(deadpan)*: Het was al verteld.

**Autogesprek `o16-fail` (after:O16:fail)**

- **Tessa** *(quiet)*: Een konvooi kijkt ook achterom.
- **Tammo** *(dry)*: Dat is niet eerlijk.

**"Wat weten we?"** *Drie witte trucks* (clue): Ubbo's vettrucks rijden 's nachts via Friesland om de weegbrug op de N355 heen: ze zijn op elke as te zwaar. Een brug bleef open voor een Fries in een bootje; de trucks moesten terug en werden gewogen. Truck drie draagt Henks tweede zender. · *Het koelhuis in Kollum* (clue): Durk vertelde zijn neven waar het vet heen gaat: een koelhuis bij Kollum, aan het kanaal. "De baas zegt." Het ligt in Friesland; Jelle weet de weg.

### O17 · Koetsen kijken

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| achtervolging (koets tegen rallyauto), zoeken | Westerkwartier (Leek, het park van Nienoord) | Tessa | Het park van Nienoord in Leek, de ingang bij het Rijtuigenhuis (zondag 27 september, 10:30, open dag) | € 2400 | `O17` / missie `koetsen` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(bazig)*: Ik pak de teugels. Een koets is een auto met een mening.

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Rennie belde. Hilko heeft zijn rallyauto verstopt. In een museum, in het park van Nienoord. Er zitten enveloppen in de portieren, zegt ze. Voor de baancommissarissen.

**Bel Rikus (beller: Rally-Rennie, Rallyclub)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee, in een park in Leek. Er staat een kasteel, een vijver en een museum met koetsen. Ik voel me een vleermuis in een prentenboek.
- **Rally-Rennie** *(kordaat, snel, aan de telefoon op de radio)*: Rikus. Rennie, Rallyclub De Vierde Versnelling. Hilko Kremer heeft de baancommissarissen een envelop beloofd. Alle drie. Het zijn mijn collega's. Ik weet niet wie ik nog kan vertrouwen. `[naamkaart: rennie]`
- **Rikus** *(droog, als nacht-dj op de radio)*: En de auto?
- **Rally-Rennie** *(kordaat, kil, aan de telefoon op de radio)*: Hij staat in een museum. Hilko denkt dat niemand in een museum zoekt. Dat is zijn eerste fout. De tweede is een koets.

**Naamkaarten:** RALLY-RENNIE: *"Secretaris van een rallyclub zonder auto. Rijdt harder in gedachten dan jij in een auto."*

**Route en plekken.** Het park van Nienoord in Leek: de ingang → het Rijtuigenhuis (een fictief museum in de koetsenstal; de borg Nienoord zelf is echt, het museum niet) → de kasteellaan → langs de vijver (de zwanen) → de brug over de gracht → de beukenlaan → de slotgracht, waar de achtervolging eindigt. De lanen zijn smal; een rallyauto kan nergens keren en rijdt dus over het gazon, een koets zoekt de wei. Ligging van laan, vijver en gracht uit OSM; of het park publiek toegankelijk is voor spel (ja: een open dag).

**Verloop**

1. **Intro** in het Rijtuigenhuis: Koetsier Wiegert geeft een rondleiding. Onder een kap staat iets wat geen koets is.
2. **Zoek de enveloppen:** drie portieren, drie enveloppen (E, 2 s per portier). Tammo fotografeert de lijst.
3. **Hilko ziet je** en rijdt de rallyauto door de achterdeur het park in.
4. **Spring op de bok** van de dichtstbijzijnde koets (de paarden heten Jan en Alleman, vijftien en veertien). Wiegert springt mee: "Anders is het diefstal."
5. **Achtervolging door het park:** de koets heeft een draafmeter (tongklik T = sneller; de paarden worden moe), een wiegende bak (te scherpe bocht = bijna om) en vrijheid: hij mag over het gras. De rallyauto is sneller, maar moet de lanen volgen. Zwanen, fietsers en bezoekers springen opzij (nooit geraakt).
6. **Snijd de bocht af** door de wei bij de beukenlaan.
7. **De gracht:** Hilko rijdt de rallyauto in de slotgracht. De enveloppen drijven.
8. **Outro** aan de rand van het water.

**Falen, overslaan, bezit**

- De koets raakt drie keer een boom (een wiel breekt).
- De draafmeter is twee keer leeg (de paarden gaan wandelen: dat mag, maar dan ontsnapt Hilko).
- Hilko is meer dan 250 m weg.
- **Overslaan** na één poging: Hilko zit in de gracht, de enveloppen drijven, de scène speelt.
- **Bezit:** de koets en de paarden zijn van het Rijtuigenhuis en blijven daar (`handBack`). Niets wordt je eigendom; de rallyauto van Hilko ligt in de gracht en is voor niemand.
- **Dieren:** paarden en zwanen raken we nooit; een tongklik is een tongklik, een zweep bestaat niet. Wie een zwaan toch raakt, krijgt een uitbrander van Wiegert en een foutmelding, geen schade.

**Intro (cutscène).** *Camera:* De camera begint in het halfdonker van de koetsenstal: rijen glimmende koetsen, een landauer, een brandspuit, een slee. Een lange dolly door het gangpad; Wiegert wijst en praat. Bij een kap in de hoek zoomt de camera in op een velg die niet bij een koets past; Tessa tilt de kap op; push-in op de rallybanden met modder.

- **Koetsier Wiegert** *(trots, plechtig, in livrei)*: Dames en heren, welkom in het Rijtuigenhuis. Veertig koetsen. Eén brandspuit. Nul auto's.
- **Tessa** *(scherp, fluisterend)*: Daar. Onder die kap. Dat is geen koets. Dat is een rallyauto met een gordijn.
- **Koetsier Wiegert** *(verontwaardigd)*: Dat is een landauer uit negentienhonderd!
- **Tessa** *(droog)*: Hij heeft vier velgen en een uitlaat.
- **Koetsier Wiegert** *(beteuterd)*: …Dat klopt. Hij is gisteren gebracht. Door een man die zei dat het een bruikleen was.
- **Tessa** *(scherp)*: Dat was Hilko.
- **Tammo** *(droog, aan de telefoon)*: Kijk in de portieren. Rennie zei: drie.
- **Hilko Kremer** *(luid, geschrokken, achter een koets vandaan)*: Wat doe jij hier?! Dit is een museum!
- **Tessa** *(koel)*: Dit is jouw auto. Met enveloppen in de portieren.
- **Hilko Kremer** *(woedend, instappend)*: Dat is mijn bagage!
- **Koetsier Wiegert** *(ontzet)*: Hij start de motor in een museum!
- **Tessa** *(strijdlustig)*: Meneer Wiegert. Jan en Alleman. Nu.
- **Koetsier Wiegert** *(trots, dan beteuterd)*: Het is een koets. Hij heeft geen rem. Hij heeft een mening.

**HUD-doelen (in volgorde):** "Zoek de enveloppen in de portieren (3)" → "Hilko rijdt weg! Spring op de bok" → "Achter Hilko aan door het park (tongklik T = sneller)" → "Snijd de bocht af door de wei" → "Pak de enveloppen bij de gracht"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Tammo** *(gespannen, aan de telefoon)*: Eén. Een bedrag. Een naam. Een handtekening. Twee. Drie. Ik fotografeer alles.
- **Koetsier Wiegert** *(trots, gehaast, op de bok)*: Tongklik: sneller. Twee tongklikken: nog sneller. Drie tongklikken: een ruzie.
- **Tessa** *(geconcentreerd)*: Hij heeft geen stuur. Hij heeft touwen.
- **Koetsier Wiegert** *(droog)*: De teugels. Links trekken is links. Rechts is rechts. De paarden doen de rest. Ze hebben een mening.
- **Tammo** *(gespannen, aan de telefoon)*: Hilko rijdt over het gras! Een rallyauto op een gazon!
- **Tessa** *(strijdlustig)*: Dan gaan wij ook over het gras. Een koets heeft meer vrijheid. Geen wegen nodig.
- **Koetsier Wiegert** *(ontzet, op de bok)*: Niet over de vijverrand! Het zijn zwanen! Ze weten dat ze zwanen zijn!
- **Hilko Kremer** *(luid, door het raam)*: Een koets! Een koets tegen een rallyauto! Wie bedenkt zoiets?!
- **Tessa** *(strijdlustig)*: Ik. Vanochtend. Het ging ook niet anders.
- **Koetsier Wiegert** *(waarschuwend)*: Draaf! Draaf! Anders gaan ze wandelen! Jan is vijftien. Alleman is veertien. Dat is een leeftijd.
- **Tammo** *(droog, aan de telefoon)*: De beukenlaan. Hij kan niet keren. Er staan beuken.
- **Tessa** *(scherp)*: Dan snij ik de bocht af. Door de wei. Hou je vast, meneer Wiegert.
- **Koetsier Wiegert** *(gillend, blij)*: Dit is de mooiste dag van mijn leven! Nog nooit zo hard gereden!
- **Tammo** *(gespannen)*: De gracht! Hij komt op de gracht af! Hij remt niet!
- **Hilko Kremer** *(luid, dan steeds zachter)*: Ik rem! Ik… rem… niet. Ik…

**Scène: De slotgracht.** *Camera:* Laag over het water: de rallyauto staat neus-omlaag in de gracht, de ramen open, Hilko zit op het dak met zijn helm in zijn handen. De enveloppen drijven rond als waterlelies; een zwaan zwemt er majestueus langs. De koets komt aan de rand tot stilstand; de paarden snuiven kalm. Wiegert wuift zijn pet.

- **Hilko Kremer** *(woedend, druipend, op het dak)*: Mijn auto! Hij is een rallyauto! Hij zwemt niet!
- **Tessa** *(droog, aan de rand)*: Hij zwemt. Dat is zijn allereerste keer.
- **Koetsier Wiegert** *(trots, hijgend)*: Een koets haalt een rallyauto in. Dat staat vanaf nu in het gastenboek.
- **Tammo** *(zacht, met een envelop uit het water)*: Naam. Naam. Naam. Bedrag. Bedrag. Handtekening.
- **Tessa** *(koel)*: De baancommissarissen van vanmiddag. Alle drie. Met elk een bedrag en een handtekening. `[clue]`
- **Hilko Kremer** *(woedend, kortaf)*: Dat is een privéalbum.
- **Tessa** *(koel)*: Het is een bewijsstuk. Het drijft.

**Outro (cutscène).** *Camera:* Aan de rand van de gracht, ochtendlicht: de koets staat stil, twee paarden drinken uit de bak. De camera gaat laag langs de wielen naar het water, waar Hilko kleiner wordt terwijl hij door het park wegsjokt. Trage push-in op de koetsier die zijn jas afstoft.

- **Koetsier Wiegert** *(trots, hijgend)*: Dat was de beste rondleiding in veertig jaar. Niemand viel in slaap.
- **Hilko Kremer** *(stug, nat, wegsjokkend)*: Ik rij vanmiddag gewoon mee. Met mijn reserveauto. Ik heb er drie.
- **Tessa** *(koel)*: Dan rijden wij ook mee.
- **Hilko Kremer** *(woedend, kort)*: Waarmee?!
- **Tessa** *(droog)*: Tinus' oom heeft een rallyauto. Zijn rug doet het niet meer.
- **Hilko Kremer** *(stug)*: Rij maar. Er zijn sloten genoeg.
- **Koetsier Wiegert** *(droog, zacht)*: Jan en Alleman mogen naar huis. Ze hebben genoeg gehad. En ik ook. Het was prachtig.

**Bij herhaling (als klus)**

- **Koetsier Wiegert** *(trots)*: Weer koetsen kijken? Dit keer geen auto's. Ik zet de achterdeur op slot.

**Mislukt** (na het "Sikkom."-scherm)

- **Tessa** *(ontdaan)*: De koets staat in de beuk.
- **Koetsier Wiegert** *(zacht, kalm)*: Dat gebeurt. Jan en Alleman zijn er niet van geschrokken. Ik wel.
- **Tammo** *(droog)*: Hij heeft een wiel verloren.

**Berichten na afloop:** *U. Oldenhuis*: "Een koets. Geef toe, dat is Gronings. – U.O."

**Kiekdoar:** "Rallyauto in slotgracht bij Nienoord. Koetsier: "Ik heb hem niet geraakt." Zwaan: geen commentaar."

**Afrondingskaart:** **KOETSEN KIJKEN** · Drie enveloppen, één gracht en twee paarden met een mening. · *+ € 2400*

**Autogesprek `o17-pass-koets` (after:O17:pass)**

- **Tammo** *(dry)*: Je haalde een rallyauto in met een koets.
- **Tessa** *(calm)*: Hij had een gazon nodig. Ik had er vier.
- **Tammo** *(dry)*: Dat is een voordeel.

**Autogesprek `o17-pass-wiegert` (after:O17:pass)**

- **Tessa** *(warm)*: Meneer Wiegert had de mooiste dag van zijn leven.
- **Tammo** *(dry)*: Hij was veertig jaar koetsier.
- **Tessa** *(warm)*: Dan was dit de eerste dag.

**Autogesprek `o17-fail` (after:O17:fail)**

- **Tessa** *(frustrated)*: Een koets stuurt als een kerk.
- **Tammo** *(dry)*: Dan had Geesje moeten rijden.

**"Wat weten we?"** *Drie enveloppen in de portieren* (clue): Hilko Kremer verstopte zijn rallyauto in het Rijtuigenhuis bij Nienoord. In de portieren: drie enveloppen voor de baancommissarissen van de rally in Zuidhorn, met een naam, een bedrag en een handtekening. De auto ligt nu in de slotgracht. · *Rally-Rennie* (clue): Rennie, secretaris van Rallyclub De Vierde Versnelling (zonder auto), belde Rikus: Hilko heeft alle drie de baancommissarissen een envelop beloofd. "Ik weet niet wie ik nog kan vertrouwen."

### O18 · Grind

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| race, voorronde (rollende keuken) | Westerkwartier (Zuidhorn, de N355 en de grindwegen) | Tessa | Zuidhorn, het startterrein bij het kermisterrein (zondag 27 september, 14:00) | € 3400 | `O18` / missie `grind` |

**Wissel (`why`, bij het overnemen, vóór de intro)**

- **Tessa** *(strijdlustig)*: Ik rij. Jij bakt. Een rallyauto met een friteuse. Wat kan er misgaan?

**Lead (telefoon)**

- **Tammo** *(droog, aan de telefoon)*: Voorronde vier. Zuidhorn. Het reglement van Ubbo: een rollende keuken. De eierbal wordt gebakken tijdens het rijden. De jury zit op de finish. Tinus' oom leent zijn rallyauto, met een friteuse op de achterbank.

**Bel Rikus (beller: Rally-Rennie, Rallyclub)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, live van het startterrein in Zuidhorn. Er staan auto's met nummers en een kraam met een luik. Dat is nieuw voor me.
- **Rally-Rennie** *(kordaat, snel, aan de telefoon op de radio)*: Rikus. Rennie, Rallyclub De Vierde Versnelling. Ik ben secretaris. De club heeft geen auto. Ik heb wel een stopwatch. `[naamkaart: rennie]`
- **Rikus** *(droog, als nacht-dj op de radio)*: Wat is het reglement van vandaag, Rennie?
- **Rally-Rennie** *(kordaat, droog, leest voor, aan de telefoon op de radio)*: De eierbal wordt onderweg gebakken. Eén bijrijder bakt. Eén bestuurder rijdt. Wie het eerst finisht met minstens dertig van de veertig eierballen heel, wint. Opgesteld door de sponsor.
- **Rikus** *(droog, als nacht-dj op de radio)*: Wie is de sponsor?
- **Rally-Rennie** *(kordaat, kil, aan de telefoon op de radio)*: Dat vraag ik me ook af. Ik ken alleen zijn initialen. U.O.

**Route en plekken.** Zuidhorn (het startterrein naast het kermisterrein) → de N355 westwaarts (± 3 km, rustig verkeer; tijdens een rally kijkt de politie de andere kant op, in het spel is de weg afgezet) → de grindwegen langs de houtwallen (± 5 km, drie bochten met pacenotes) → drie sloten achter elkaar (een schans van strobalen) → het erf van Boer Evert (kippen, een trekker die de weg oversteekt) → de finish op het kermisterrein van Zuidhorn. ± 12 km, 7-8 minuten. Wegen en grindwegen uit OSM (`highway=track`, `surface=gravel`); de sloten en schans zijn spel.

**Verloop**

1. **Intro** op het startterrein: de rollende keuken (een friteuse met spanbanden op de achterbank, Tammo met schort, helm en vizier).
2. **Stap in de rallyauto van Tinus' oom** (leenauto, `handBack`). Rennie leest de pacenotes (door de rallyradio): "Links vier. Sloot. Niet kijken."
3. **De N355 en het grind:** harde bochten laten de friteuse klotsen. Een **Eierballen-meter** (40 stuks) daalt als je te hard remt of schuin raakt; Tammo roept hoeveel er nog heel zijn. Pionnen die de baancommissarissen verzet hebben (voor Hilko's deal): de pacenotes waarschuwen ("Pion staat verkeerd. Rechts!").
4. **Drie sloten:** een schans van strobalen; een landing is een klots, geen ramp (elke sprong kost gemiddeld 3 eierballen).
5. **Het erf:** een trekker (van Boer Evert) steekt de weg over; slalom tussen de kippen.
6. **De finish:** het kermisterrein, de jurytafel van drie baancommissarissen. Hilko komt later, met de reserveauto in een sloot.

**Falen, overslaan, bezit**

- Minder dan dertig eierballen heel bij de finish.
- Hilko finisht eerder (hij is 7:10 als je netjes rijdt; bij de derde sloot gaat hij gegarandeerd in de berm als je binnen 15 s zit, zodat het rechtvaardig blijft).
- Je auto ligt in de sloot of op zijn dak (de friteuse is vastgesnoerd; Tammo is veilig).
- **Overslaan** na één poging: je staat bij de finish met 33 eierballen heel; de jury speelt.
- **Bezit:** de rallyauto is van Tinus' oom (`handBack`). Een eigen rallyauto is te koop bij Henks vriend in Leek (optional, € 4.800, buiten de geldtijdlijn).
- **Veiligheid:** de friteuse is elektrisch en vastgesnoerd, de olie "loopt niet over de bijrijder"; Tammo draagt helm en vizier. Het spel toont geen verbrandingen: het schort is het maximum.

**Intro (cutscène).** *Camera:* De camera begint hoog op het startterrein: auto's met stickers en nummers, de kermis aan de rand, een startvlag. Daaruit zakt hij naar een rallyauto met open achterdeur: een friteuse met spanbanden op de achterbank, Tammo met een schort en een helm met vizier die zijn duimen opsteekt. Close op Tessa die haar handschoenen aantrekt; kort tweeshot.

- **Rally-Rennie** *(kordaat, snel, naast de auto)*: Pacenotes zitten in de radio. Ik zit op de kermis, met mijn stopwatch. Ik zeg wat er komt. Jij rijdt wat er komt.
- **Tammo** *(droog, in schort en helm)*: Ik zit in een friteuse. Niet andersom.
- **Rally-Rennie** *(kordaat)*: Hij is vastgesnoerd. Jij ook. Dat is geen kritiek.
- **Hilko Kremer** *(luid, zelfverzekerd, in zijn reserveauto)*: Moi, Stadjer. Ik ben nat geweest. Dat is nu droog. Het is jouw beurt.
- **Tessa** *(koel)*: Ik zie het. Je banden zijn nog steeds nat.
- **Rally-Rennie** *(kordaat)*: Vandaag weegt elke eierbal tweeënveertig gram. Ik heb ze gewogen. Ik weeg alles.
- **Tammo** *(droog)*: Veertig eierballen. Dertig moeten heel. Dat zijn tien dingen die mogen sterven.
- **Tessa** *(scherp)*: Niemand sterft. Ze worden gegeten.

**HUD-doelen (in volgorde):** "Stap in de rallyauto van Tinus' oom" → "Rij de N355 en het grind (minstens 30 eierballen heel)" → "De sloten: spring en landing" → "Het erf: de trekker" → "De finish op het kermisterrein"

**In de missie (meldingen en hints van de companion, `say` / `hint`)**

- **Rally-Rennie** *(kordaat, door de rallyradio)*: Start. Rechts één. Rechtdoor. Links vier. Sloot. Niet kijken.
- **Tammo** *(gespannen, bij de friteuse)*: Eerste lading draait. Vier eierballen schuin. Tessa, bocht rustig.
- **Tessa** *(gejaagd)*: Ik probeer het! Het is een rallyauto, geen vaatwasser!
- **Rally-Rennie** *(kordaat)*: Pion staat verkeerd. Rechts, niet links. De commissaris heeft zijn pion verzet. Natuurlijk.
- **Tammo** *(droog, bij de pan)*: Nog vierendertig heel. Dat is een goed getal.
- **Rally-Rennie** *(kordaat)*: Drie sloten. Rechts, schans, landen. Niet remmen in de lucht.
- **Tessa** *(uitgelaten)*: Vliegen! Ik vlieg! Hou vast, Tammo!
- **Tammo** *(droog, dan geschrokken)*: Dat was een sloot. Ik was bang voor een tel. Eén. Twee. Drie eierballen weg.
- **Rally-Rennie** *(kordaat)*: Erf. Trekker. Evert steekt over. Hij kijkt altijd naar links. Hij is Evert.
- **Tessa** *(gespannen)*: Kippen! Links! Rechts! Er zijn kippen overal!
- **Boer Evert** *(droog, vanaf de trekker)*: Rustig, meisje. Het zijn mijn kippen.
- **Tammo** *(droog)*: Eenendertig. Dat is meer dan genoeg. Niemand ademen.
- **Rally-Rennie** *(kordaat, opgetogen)*: Finish! Zeven twee-en-twintig! De stopwatch lijkt het niet te geloven!

**Scène: De jury.** *Camera:* De finish op het kermisterrein, tussen de zweefmolen en de botsauto's: drie baancommissarissen in oranje hesjes achter een klaptafel met een stopwatch en een lege envelop. De camera loopt mee met Tammo die met een bakje eierballen uit de auto stapt, dan een korte close-up op een telefoonscherm met foto's van enveloppen. Als Hilko aankomt, met modder tot zijn knieën, zakt de camera naar zijn laarzen.

- **Baancommissaris** *(zakelijk, verlegen)*: Eierballen: eenendertig van veertig heel. Tijd: zeven minuten tweeëntwintig.
- **Baancommissaris** *(verlegen, zacht)*: …We hebben een envelop gekregen. Het spijt ons. Hij ligt in een gracht.
- **Tessa** *(koel, houdt haar telefoon omhoog)*: Drie namen. Drie bedragen. Drie handtekeningen. Ik heb ze allemaal.
- **Baancommissaris** *(verlegen)*: Wij hebben het niet aangenomen. Wij hebben het alleen niet teruggebracht.
- **Hilko Kremer** *(woedend, modderig, aankomend)*: Sloot! Dat was de sloot! Er stond een koe!
- **Tessa** *(koel)*: Er stond geen koe.
- **Hilko Kremer** *(nors)*: Eén koe. Misschien.
- **Hilko Kremer** *(stug, proeft een eierbal uit de doos)*: …Goud.
- **Baancommissaris** *(plechtig)*: De voorronde Westerkwartier gaat naar de Fjord Frituur. De eierballen zijn warm. De rest is van de rest.

**Outro (cutscène).** *Camera:* Het kermisterrein bij ondergaande zon: de zweefmolen draait, de kermislampjes gaan aan, Rennie komt aangelopen met haar stopwatch in de hand. Tinus staat met zijn oom aan de rand van het gras. De camera zweeft over de gezichten naar de rallyauto, die er als een Stadjer uitziet na een dag op het land.

- **Rally-Rennie** *(kordaat, opgetogen)*: Dat was een rally. Een echte. Zonder auto van de club.
- **Tessa** *(warm, buiten adem)*: Met de auto van Tinus' oom. En een friteuse.
- **Rally-Rennie** *(kordaat, droog)*: Wij zijn niet jaloers. Een beetje. Ik heb mijn stopwatch gebroken.
- **Tammo** *(droog)*: Hij loopt nog.
- **Rally-Rennie** *(kordaat)*: Dat is de tweede. Ik had er twee. De club heeft nog steeds geen auto. Als je tijd hebt.
- **Tessa** *(zacht)*: Dat doen we. Maar eerst eten.
- **Tinus** *(stug, droog)*: Mijn oom wil een eierbal. Hij heeft er nog nooit een gehad. Hij zit in de auto.

**Bij herhaling (als klus)**

- **Rally-Rennie** *(kordaat)*: Weer de rollende keuken? Ik heb de stopwatch hersteld.

**Mislukt** (na het "Sikkom."-scherm)

- **Tammo** *(droog, bij de friteuse)*: Nog negentien heel. Dat is meer dan niets.
- **Rally-Rennie** *(kordaat, zacht)*: Negentien is geen dertig. Maar het is wel een mooi getal. Opnieuw.

**Berichten na afloop:** *U. Oldenhuis*: "Weer één. Ik tel nog steeds. – U.O."

**Kiekdoar:** "Rally Zuidhorn: bijrijder bakt eierballen op de achterbank. Winnaar: de Stadse frietwagen, 31 van 40 heel. Baancommissaris: "Wij hebben niks aangenomen. Wij hebben het alleen niet teruggebracht.""

**Afrondingskaart:** **GRIND** · Voorronde Westerkwartier: gewonnen. Eenendertig eierballen heel, en een stopwatch gebroken. · *+ € 3400*

**Autogesprek `o18-pass-friteuse` (after:O18:pass)**

- **Tammo** *(dry)*: Ik heb in een rallyauto gebakken.
- **Tessa** *(amused)*: Je hebt nog tien vingers.
- **Tammo** *(deadpan)*: Ze zijn allemaal heel. Dat is meer dan de eierballen.

**Autogesprek `o18-pass-koe` (after:O18:pass)**

- **Tessa** *(dry)*: Hilko zag een koe.
- **Tammo** *(dry)*: Er was een koe.
- **Tessa** *(exasperated)*: Er was geen koe, Tammo.
- **Tammo** *(dry)*: Wij hebben hem niet gezien. Hij ook niet.

**Autogesprek `o18-fail` (after:O18:fail)**

- **Tammo** *(dry)*: Negentien heel. Ik tel ze elke keer.
- **Tessa** *(quiet)*: Bij de volgende sloot rij ik rechter. Of ik vlieg rechter.

**"Wat weten we?"** *Voorronde Westerkwartier* (clue): Gewonnen in Zuidhorn, in een rallyauto met een friteuse op de achterbank: eenendertig van veertig eierballen heel. De drie baancommissarissen hadden elk een envelop gekregen en niet teruggebracht. Hilko: "…Goud." · *De club zonder auto* (hart): Rennie heeft een rallyclub met een stopwatch en zonder auto. Ze zegt: "Wij zijn niet jaloers. Een beetje."

### Tussendoor: Een schuur bij Leek (`n-schuur`)

Speler: Tammo. Doel: `{ type: 'filiaal', at: 'leek' }   // the schuur (safehouse, garage for three, a spot for an owned tractor) and the filiaal in the barn wall (A22)`.

**Wissel**

- **Tammo** *(droog)*: Ik ga kijken. Een schuur is een garage met een ziel.

**Lead**

- **Tessa** *(warm, aan de telefoon)*: Tinus zegt: de schuur van opa is van ons, zolang we willen. En zijn tante wil een luik in de zijmuur.

**Onderweg (companion)**

- **Tessa** *(plagend)*: Plek voor drie auto's. Jij hebt er één.
- **Tammo** *(droog)*: Ik heb een Fjord, een frietwagen en een oma. Dat is meer dan drie.

**Scène: De schuur van opa, Leek.** *Camera:* Late middag: de grote schuurdeur schuift open, stof in het licht, een lege plek voor drie auto's en in de hoek de grijze trekker, glanzend. Tinus staat in het midden, zijn handen in zijn zakken. Trage dolly langs de muur waar een luik is uitgezaagd; een tante met een schort zet de eerste bak met havermout-korst neer.

- **Tinus** *(droog, trots)*: Hier. De schuur van opa. Hij is van mij nu. Hij is van jullie, zolang jullie willen.
- **Tammo** *(droog)*: Er staat een trekker in.
- **Tinus** *(stug, zacht)*: Die is van opa. Hij blijft van opa. Maar hij mag in de schuur.
- **Tessa** *(enthousiast)*: Plek voor drie auto's. En een luik in de zijmuur. Een Fjord Frituur in Leek.
- **Tinus** *(droog)*: Mijn tante bakt. Ze heeft een eigen recept. De Westerkwartier-eierbal, met een korst van haver.
- **Tessa** *(zacht)*: Vier regio's. Vier plekken. Dit gaat harder dan ik dacht.
- **Tammo** *(droog, zacht)*: Dat dacht ik ook.
- **Tessa** *(zacht)*: Jij zei niks.
- **Tammo** *(droog)*: Ik zei: dat dacht ik ook. Dat is veel, voor mij.

**Klaar (telefoon)**

- **Tessa** *(warm, aan de telefoon)*: Een schuur in Leek. Een luik in de muur. Tinus zegt dat het naar koeien ruikt. Het ruikt naar haver.

**HUD-meldingen:** "Filiaal geopend: Fjord Frituur Leek (Tinus en zijn tante)" · "Safehouse: de schuur van opa bij Leek (garage voor drie, plek voor een eigen trekker)" · "Nieuw recept: de Westerkwartier-eierbal, met een korst van haver" · "Rallyauto van Tinus' oom: te leen bij de schuur"


### Na beide F4b-voorrondes: Nachtstreek en "Wordt vervolgd"

Speelt na de tweede gewonnen F4b-voorronde (welke dat ook is) als radiofragment; daarna stopt het gebouwde verhaal op de kaart van §1.

**Nachtstreek, na de tweede F4b-voorronde (vier voorrondes in totaal) (beller: Ubbo, Oldenhuis Bakt)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek. Vier voorrondes, vier filialen, een kotter en een schuur.
- **Rikus** *(droog, als nacht-dj op de radio)*: De torenwachter belde. Zijn neven in het noorden hadden ook gebeld: een dijkwerker, een molenaar. De meldersbond groeit.
- **Rikus** *(plagend, als nacht-dj op de radio)*: Peiling: groeien of thuis? Groeien: 49 procent. Thuis: 51. Het is gedraaid. Eén luisteraar in Paddepoel heeft nu twee telefoons. Ik zeg niks.
- **Ubbo Oldenhuis** *(joviaal, zelfvoldaan, aan de telefoon op de radio)*: Rikus. Vier van zeven. Mooie reeks. Ik zie ze graag in het Oldambt.
- **Rikus** *(droog, als nacht-dj op de radio)*: Waarom, Ubbo?
- **Ubbo Oldenhuis** *(vriendelijk dreigend, aan de telefoon op de radio)*: Daar is de lucht groot. En mijn zus.


## 4. Zijreeksen

Elke reeks start met een "?" op de kaart. Ze zijn niet nodig voor het verhaal en volgen dezelfde regels: overslaan na één poging, geld blokkeert niets, geleende voertuigen gaan terug.

### Rally-Rennie (Westerkwartier)

*Start:* na n-zuidhorn: een "?" bij het clubhuis van Rallyclub De Vierde Versnelling, een schuurtje achter het dorpshuis van Niekerk (fictief). Rennie is niet nodig voor het verhaal, maar komt terug in O17 (de enveloppen) en O18 (de pacenotes); de naamkaart verschijnt bij de eerste ontmoeting, in welke missie dat ook is.

Rennie is de secretaris van een rallyclub met twaalf leden en geen enkele auto, en ze rijdt al jaren in gedachten harder dan jij ooit in een auto. Drie missies, steeds een stap verder: de club moet bestaan (Z20), de club moet gezien worden (Z21), de club moet een kampioen hebben (Z22). Humor uit de club en de sloten, nooit uit mensen die weinig hebben.

#### Z20 · Grind

**Type:** race (tijdrit op grind) · **Speler:** Tessa · **Start:** Het clubhuis van Rallyclub De Vierde Versnelling, Niekerk (fictief schuurtje; een bord "Gesloten, tenzij wij er zijn") · **Beloning:** € 400

**Verloop**

1. Rennie legt uit: de gemeente wil bewijs dat de club bestaat. Drie tijdritten op grindwegen langs de houtwallen, elk onder 2:10.
2. Rij in de auto van Rennies neef Gerben (leenauto, `handBack`) drie secties: (1) bochten, (2) een zandweg met koeienrooster, (3) een houten brug.
3. Rennie zit naast je en leest de pacenotes door de rallyradio.
4. Aan het eind een ambtenaar met een formulier.

**Falen en overslaan.** Een sectie langer dan 2:40 of op zijn dak (drie pogingen). **Overslaan** na één poging: de ambtenaar tekent, de scène speelt. **Bezit:** de auto is van Gerben en gaat terug naar zijn erf.

**Intro.** *Camera:* De camera begint in het schuurtje: een lege garage met een wand vol bekers en foto's, een koffiemachine met een briefje "Stuk". Rennie staat met een stopwatch in de deuropening, haar silhouet tegen het licht. Langzaam in op het bord aan de muur.

- **Rally-Rennie** *(kordaat, snel)*: Moi. Jij bent die van de frietwagen. Rallyclub De Vierde Versnelling. Twaalf leden. Nul auto's. `[naamkaart: rennie]`
- **Tessa** *(droog)*: Hoe kan een rallyclub nul auto's hebben?
- **Rally-Rennie** *(kordaat, kil)*: De vorige penningmeester verkocht de clubauto. Voor een koffiemachine. De koffiemachine is stuk. De auto rijdt nog.
- **Tammo** *(droog, aan de telefoon)*: Dat is de wereld op zijn kop.
- **Rally-Rennie** *(kordaat)*: De gemeente wil bewijs dat we bestaan. Drie tijdritten op grind. Mijn neef Gerben leent zijn auto. Jij rijdt. Ik lees.
- **Tessa** *(strijdlustig)*: Dat is mijn werk.
- **Rally-Rennie** *(droog)*: Dan werkt het.

**In de missie**

- **Rally-Rennie** *(kordaat, door de rallyradio)*: Start. Links vier. Sloot. Niet kijken.
- **Rally-Rennie** *(kordaat)*: Rechts drie. Houtwal. Mooi uitzicht. Niet kijken.
- **Tessa** *(opgetogen)*: Waarom is alles "niet kijken"?
- **Rally-Rennie** *(droog)*: Omdat je dan misschien gaat remmen.
- **Rally-Rennie** *(kordaat)*: Koeienrooster. Gas erop. Niet remmen. Koeien kijken er niet naar.
- **Rally-Rennie** *(kordaat)*: Brug. Hobbel. Springen. Niet kijken. Ik zei het al.
- **Rally-Rennie** *(kordaat, opgetogen)*: Twee-en-vijftig. Het kan sneller. Het kan altijd sneller.

**Outro.** *Camera:* Het schuurtje, middag. Een dame in een mantel en een hoed met een klembord staat naast een gekreukelde auto; Rennie staat kaarsrecht, haar stopwatch in haar hand. Langzame push-in op de pen die het formulier tekent.

- **Dame met hoed** *(formeel, droog, met een klembord)*: Rallyclub De Vierde Versnelling. Drie secties. Alle drie onder de tijd. Ik teken.
- **Rally-Rennie** *(kordaat, ontroerd)*: De club bestaat.
- **Dame met hoed** *(droog)*: Dat is de strekking.
- **Rally-Rennie** *(kordaat, stil)*: Ik was bang dat ik iets moest bewijzen wat ik al wist.
- **Tessa** *(warm)*: Dat is vaak het moeilijkste.

**Bij herhaling**

- **Rally-Rennie** *(kordaat)*: Weer het grind? De houtwallen staan er nog.

**Afrondingskaart:** **GRIND** · Drie secties, alle drie onder de tijd. De club bestaat.

#### Z21 · Sloot

**Type:** stunt (drie sloten op een rij) · **Speler:** Tessa · **Start:** De trainingsweide van de club, een weiland met sloten bij Niekerk · **Beloning:** € 600

**Verloop**

1. Rennie wil een filmpje voor sponsors: drie sloten op een rij, één take. Sander (14) filmt met een drone.
2. Rij tegen een schans van strobalen op en spring: sloot één (4 m), twee (5 m) en drie (6 m). Elke sloot heeft een snelheidsvenster; Rennie roept hoe het zit.
3. De drone vliegt mee. Hij hoort niet in een kippenren te belanden, maar dat doet hij.

**Falen en overslaan.** Een sprong mis: de auto staat in de sloot (een takelwagen van de boer trekt hem eruit; geen schade, wel opnieuw). **Overslaan** na één poging: de drie sprongen staan op video, de scène speelt. **Bezit:** de clubauto van Gerben (`handBack`).

**Intro.** *Camera:* De camera begint met de drone: een zwevend beeld over drie sloten en een rij houtwallen, daaronder een schans van balen en een auto. De beelden komen van een tablet in de handen van een jongen met een koptelefoon.

- **Sander** *(opgewonden, jong, met een tablet)*: Drone klaar! Drie sloten, één take! Ik heb geen tweede batterij!
- **Rally-Rennie** *(kordaat)*: Eén take. Dat is een recht van de rallyrijder.
- **Tessa** *(droog)*: Eén take betekent dat ik niet in de sloot mag.
- **Rally-Rennie** *(droog)*: Dat is altijd het advies geweest.
- **Boer** *(droog, van de heg)*: Mijn kippen weten nergens van. Hou dat zo.

**In de missie**

- **Sander** *(opgewonden, via de tablet)*: Hij vliegt boven de auto! Ik heb de camera op de bumper! Hij is mooi!
- **Rally-Rennie** *(kordaat)*: Eerste sloot. Vier meter. Gas, niet remmen, niet piekeren.
- **Tessa** *(uitgelaten)*: Vier meter. Hup!
- **Rally-Rennie** *(kordaat)*: Tweede. Vijf meter. Iets meer gas. Het is een sloot, geen mening.
- **Sander** *(geschrokken)*: Hij vliegt de kippenren in! Wegwezen, drone!
- **Boer** *(droog, van ver)*: Mijn kippen leggen nu in stereo.
- **Rally-Rennie** *(kordaat, gespannen)*: Derde. Zes meter. Dit is de lange. Voluit. Niet kijken.

**Outro.** *Camera:* De weide in de schemer: de auto staat stil aan de kant, Sander kijkt naar zijn tablet, de drone rust in het gras met een stukje kippenveer. Rennie en Tessa kijken mee over zijn schouder naar het filmpje; de camera schuift tussen hen door naar het scherm.

- **Sander** *(stil, onder de indruk)*: Het ziet eruit als een film.
- **Rally-Rennie** *(kordaat, zacht)*: Het is een film. Alleen met kippen.
- **Sander** *(trots)*: De sponsor krijgt het vanavond. Wietse uit Leek. Hij sponsort met banden. Dat is het.
- **Rally-Rennie** *(kordaat)*: Banden zijn een begin. Een club met banden is een club.

**Bij herhaling**

- **Sander** *(opgewonden)*: Nog een take? Ik heb een nieuwe batterij!

**Afrondingskaart:** **SLOOT** · Drie sloten, één take, nul kippen geraakt. Bijna.

#### Z22 · Kampioen

**Type:** race (clubkampioenschap) · **Speler:** Tessa · **Start:** Het erf van Boer Evert (kippen, een schuur, een klaptafel met oranjekoek) · **Beloning:** € 900

**Verloop**

1. Het clubkampioenschap: Tessa tegen Siemen Kremer, neef van Hilko, kampioen sinds drie jaar. Er was nooit iemand anders.
2. Een tijdrit op grind en klinker rond het erf en twee polderwegen (± 4 km), in twee manches (heen en terug).
3. De finish op het erf, tussen de kippen, bij de klaptafel.

**Falen en overslaan.** Siemen eerder over de streep in beide manches (de rubber band houdt het eerlijk). **Overslaan** na één poging: de eerste manche is gelopen, de tweede speelt als scène. **Bezit:** de auto is van Gerben (`handBack`); de clubauto is te koop bij de club voor € 4.800 (optional, geen verplichting, buiten de geldtijdlijn).

**Intro.** *Camera:* Het erf in de middag: een klaptafel met oranjekoek, vier tractoren als tribune, een startlijn van krijtpoeder. Twee auto's naast elkaar: Siemens glanzende rallyauto en Gerbens versleten leenauto. Een lage two-shot van de bestuurders door de voorruit.

- **Neef Siemen** *(luid, jong, zelfverzekerd)*: Siemen Kremer. Neef van Hilko. Clubkampioen, drie jaar achter elkaar. Er was nooit iemand anders.
- **Rally-Rennie** *(kordaat)*: Er was ook nooit een tweede auto.
- **Neef Siemen** *(grinnikend)*: Dat is mijn voordeel.
- **Tessa** *(koel)*: Dan is dit mijn voordeel.
- **Neef Siemen** *(brutaal)*: Welk?
- **Tessa** *(koel)*: Ik rijd niet voor een oom.

**In de missie**

- **Rally-Rennie** *(kordaat)*: Manche één. Start. Rechts twee. Links drie. Erf. Houd het hoofd erbij.
- **Neef Siemen** *(luid, in zijn auto)*: Ik heb de binnenbocht! Ik heb altijd de binnenbocht!
- **Tessa** *(strijdlustig)*: Dan neem ik de buitenbocht. Daar ligt meer grind.
- **Rally-Rennie** *(kordaat)*: Manche twee. De wind is gedraaid. De kippen niet.
- **Neef Siemen** *(luid, dan stil)*: Waar kom jij ineens vandaan? Ik… ik zie je niet meer.
- **Rally-Rennie** *(kordaat, ademloos)*: Finish! Een-minuut-vier-en-vijftig! Het verschil is een stopwatchfout. Of een Stadjer.

**Outro.** *Camera:* Het erf bij de finish: de klaptafel, de oranjekoek, Siemen die uit zijn auto klimt en zijn helm af zet. Hij loopt met een beker in zijn handen naar Tessa; de camera blijft bij zijn schoenen. Eén kip loopt tussen hen door.

- **Neef Siemen** *(stil, ademloos)*: Eindelijk. Iemand die harder rijdt dan ik. Dat is een opluchting.
- **Tessa** *(warm)*: Het was dichtbij.
- **Neef Siemen** *(stug, eerlijk)*: Mijn oom heeft de commissarissen betaald voor vandaag. Ik wist het. Ik heb er niks van gezegd. Ik wilde winnen zonder.
- **Rally-Rennie** *(kordaat, zacht)*: Dat is het eerste wat je ooit goed deed.
- **Neef Siemen** *(trots, stil)*: Hier. De Gouden Moersleutel. Ik heb hem gekocht. Van de penningmeester. Voor een koffiemachine.
- **Tessa** *(zacht)*: Nu is hij van de club.
- **Rally-Rennie** *(kordaat, ontroerd)*: Nu is hij van de club. De club heeft een kampioen. Zij heeft er twee.

**Bij herhaling**

- **Neef Siemen** *(luid)*: Revanche? Ik heb geoefend. Een uur.

**Afrondingskaart:** **KAMPIOEN** · Twee manches, één Gouden Moersleutel, en een club met een kampioen.

### Wadgids Fenna (Wadkust)

*Start:* na O12 (Fenna staat op de dijk bij Pieterburen met haar wadkaart en een bordje "Wadgids, vandaag met groep"). Fenna is **Wadgids Fenna**, niet te verwarren met Molenaar Fenna in Winsum: haar tante. "Wij heten hier allemaal Fenna."

**Toon en regels (§9):** respect voor het Wad en de dieren. Er is nooit een grap over verdrinken, vastzitten of een gids die faalt. De humor zit in toeristen die niet luisteren, een laars die in de klei blijft, en een zeehond die gewoon blijft liggen. **Regels voor het hele spel:** niemand loopt op een mosselbank; vogels worden niet opgejaagd; zeehonden blijven op afstand (een afstandsring op de HUD); het Wad op gaat alleen met een gids, en wie het toch probeert, hoort Fenna in zijn kop.

#### Z23 · Toeristen

**Type:** wad, te voet (staartgids) · **Speler:** Tessa · **Start:** De wadloopstart aan de dijk bij Pieterburen (het pad dat in het Wad verdwijnt, ochtend bij eb) · **Beloning:** € 500

**Verloop**

1. Fenna heeft een groep van negen: een vader met twee kinderen, een toerist uit de Randstad, een influencer, een wandelaar met te goede laarzen en drie anderen. Jij bent **staartgids**: je loopt achteraan en houdt de groep bij elkaar.
2. **Groepsmeter:** blijft iedereen binnen 30 m van Fenna, dan loopt de groep vlot. Roep (Q) naar wie achterblijft; roep niet naar iemand die net een zeehond ziet: die schrikt.
3. Vier momenten: (1) een laars blijft in de klei (help, rustig), (2) de influencer loopt op zeehonden af (houd hem op afstand), (3) een kind pakt een schelp (laten liggen of terugleggen, een uitleg), (4) de toerist wil terug (kalmeren).
4. **Terug voor de vloed:** Fenna telt: "Negen. Weer negen."

**Falen en overslaan.** De groep is verspreid over meer dan 80 m voor de eerste mosselbank (twee waarschuwingen, de derde is mislukt). De influencer komt dichter dan 80 m bij de zeehonden. **Overslaan** na één poging: de groep staat veilig op de dijk, Fenna telt, de scène speelt. **Bezit:** niets. De laarzen van Tessa en Tammo zijn een cadeau (cosmetisch).

**Intro.** *Camera:* De camera begint op de dijk met negen mensen in te nieuwe laarzen die in een rij staan; Fenna loopt langs ze met haar kaart. Achter haar verdwijnt het pad in een grijze, glinsterende vlakte. Een kind draagt een rugzakje met een zeehondje erop.

- **Wadgids Fenna** *(helder, vriendelijk, streng)*: Goedemorgen. Ik ben Fenna. Drie regels. Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen. Jij loopt achteraan. Jij bent mijn ogen.
- **Vader** *(joviaal, een tikje bezorgd)*: Mijn dochter wil een zeehond zien. Mag dat?
- **Wadgids Fenna** *(helder, vriendelijk)*: Van ver. Heel ver. Een zeehond kijkt terug. Hij is niet beleefd, maar hij is wel eerlijk.
- **Influencer** *(opgewonden, in een goudkleurig jack)*: Ik wil een selfie met een zeehond. Het is voor mijn volgers.
- **Wadgids Fenna** *(helder, kil)*: Het is voor je zeehond. Die volgt je niet.
- **Toerist** *(verbaasd, een tikje bekakt)*: Is het hier veilig? Er is zo weinig… land.
- **Wadgids Fenna** *(helder, vriendelijk)*: Met mij wel. Dat is het hele idee.

**In de missie**

- **Wadgids Fenna** *(helder, vooraan)*: Eén voor één. Zachte stappen. Het Wad is zacht en dat is niet erg.
- **Wandelaar** *(trots, in zijn beste laarzen)*: Ik heb deze laarzen drie jaar bewaard voor vandaag.
- **Wadgids Fenna** *(helder)*: Dan zijn ze nu eindelijk nat.
- **Kind** *(blij, verbaasd)*: Mijn laars zit vast! Hij is weg! Hij is weg!
- **Tessa** *(kalm, bij het kind)*: Rustig. Trek niet. Je voet blijft erin. Je laars gaat eruit. Zo. En dan je voet.
- **Kind** *(opgelucht)*: Het is een grotere laars dan ik. Hij is heel gelukkig.
- **Influencer** *(roepend, rennend)*: Een zeehond! Eén! Ik pak hem! Mijn volgers!
- **Tessa** *(luid, scherp)*: Stop! Niet dichterbij! Hij gaat weg, en jij blijft hier!
- **Influencer** *(beteuterd)*: Maar mijn volgers…
- **Tessa** *(droog)*: Die zien je op de foto. Van ver. Dat is mooier.
- **Vader** *(zacht, onder de indruk)*: Een schelp. Mag ze hem houden?
- **Wadgids Fenna** *(helder, vriendelijk)*: Leg hem op de plaat. Dan blijft het een stuk Wad. Ze mag hem uit je hoofd meenemen.
- **Toerist** *(angstig)*: Ik wil terug. Het is zo groot. Mag ik terug?
- **Tessa** *(zacht, geruststellend)*: Je loopt niet alleen. Ik loop achter je. Dat is mijn werk. Je hoeft niets te doen, alleen te lopen.

**Outro.** *Camera:* De dijk, middagzon: de negen komen een voor een het pad af, nat tot de knieën, een man met zijn laarzen in zijn handen. Fenna staat bovenaan met een clipboard en telt hardop; Tessa komt als laatste het pad af. De camera blijft op Fenna terwijl haar lippen meetellen.

- **Wadgids Fenna** *(helder, tevreden)*: Negen. Weer negen.
- **Vader** *(blij, moe)*: Dat was het mooiste wat mijn kinderen ooit gezien hebben. Die zeehond keek terug.
- **Toerist** *(stil, geraakt)*: Het was… niet eng. Het was groot. Dat is anders.
- **Influencer** *(beteuterd, stil)*: Ik heb geen selfie. Maar ik heb het gezien. Mag ik dat zeggen?
- **Wadgids Fenna** *(helder, vriendelijk)*: Dat mag. Dat is de beste foto.

**Bij herhaling**

- **Wadgids Fenna** *(helder)*: Weer een groep? Altijd negen. Of tien. Of acht. Ik tel.

**Afrondingskaart:** **TOERISTEN** · Negen op, negen terug. Een laars gered, een zeehond met rust gelaten.

#### Z24 · Tellen

**Type:** foto, geduld (zeehondentelling) · **Speler:** Tammo · **Start:** De steiger van de kotter Trijntje in Lauwersoog; een beiboot naar een zandplaat in het Wad (laagwater, middag) · **Beloning:** € 700

**Verloop**

1. Verzorgster Marit van het Zeehondenhuis (fictief) vraagt Fenna: de jaarlijkse telling. Jij helpt, met een camera en een verrekijker, vanuit de beiboot.
2. Vaar op 300 m van een zandplaat vol zeehonden. **Afstandsring:** blijf erbuiten (150 m). Dichterbij en ze schuiven het water in: mislukt.
3. Fotografeer drie keer (links, midden, rechts): per foto telt de camera de zeehonden. Zoomen mag, bewegen niet. Wacht op windstilte.
4. Wind en stroming drukken de boot af; corrigeer rustig. Geen motor in de buurt van de plaat.
5. Vertel het resultaat aan Marit.

**Falen en overslaan.** De boot komt binnen 150 m van de plaat (zeehonden schuiven weg; opnieuw). Een foto is onscherp of bewogen (opnieuw, geen straf). **Overslaan** na één poging: de telling staat op de kaart, de scène speelt. **Bezit:** de beiboot is van de kotter (safehouse); niets wordt je eigendom.

**Intro.** *Camera:* De camera hangt laag boven de beiboot op het stille water. Fenna zit voorop met de verrekijker, Tammo achterin met een camera met een lange lens. Aan het eind van de rechte horizon liggen donkere vlekken op een zandplaat die langzaam, een voor een, een kop optillen.

- **Verzorger Marit** *(rustig, vriendelijk, via de marifoon)*: Zeehondenhuis, Marit. Wij tellen elk jaar. Gewone zeehonden, grijze zeehonden. Op afstand. Dat is het hele werk.
- **Tammo** *(zacht, droog)*: Hoeveel verwacht je?
- **Wadgids Fenna** *(helder, zacht)*: Dat is de vraag. Er is geen verwachting. Er is alleen tellen.
- **Tammo** *(zacht)*: Ik ben goed in wachten.
- **Wadgids Fenna** *(helder, vriendelijk)*: Dat weet ik. Daarom ben je hier.

**In de missie**

- **Wadgids Fenna** *(helder, fluisterend)*: Motor uit. Peddelen. Driehonderd meter. De ring op de kaart. Daarbuiten.
- **Tammo** *(zacht, verbaasd)*: Ze liggen te liggen. Heel veel. Eén is wakker. Hij kijkt naar mij.
- **Wadgids Fenna** *(helder, zacht)*: Dat is een gewone zeehond. Die met die lange neus is een grijze. Hij is groter. Hij kijkt trotser.
- **Tammo** *(fluisterend)*: Foto één. Links. Zeventig.
- **Tammo** *(fluisterend)*: Foto twee. Midden. Honderdtwaalf. Een pup. Ik zie een pup.
- **Wadgids Fenna** *(zacht, ontroerd)*: Ze zijn er. Dat is genoeg.
- **Tammo** *(fluisterend)*: Foto drie. Rechts. Eenendertig. Ik zie een zeehond die niets doet. Dat is ook een soort talent.

**Outro.** *Camera:* De beiboot op de terugweg; de zandplaat wordt kleiner, een zeehond tilt zijn kop op. Verder weg, aan de horizon, staat een klein donker kruis boven het water: een platform. De camera blijft er een tel op rusten. Fenna kijkt ernaar, Tammo kijkt naar Fenna.

- **Tammo** *(zacht, voorzichtig)*: Zeventig, honderdtwaalf, eenendertig. Tweehonderdveertien.
- **Wadgids Fenna** *(helder, zacht)*: Tweehonderdveertien. Dat is goed. Dat is meer dan vorig jaar. Dat is niet genoeg om te juichen. Genoeg om blij te zijn.
- **Wadgids Fenna** *(zacht, stil, kijkt naar de horizon)*: Daar staat een platform. Alleen bij helder weer. Mijn opa werkte ooit bij het gas. Hij sprak er nooit over. Hij keek alleen naar het Wad.
- **Tammo** *(zacht, stil)*: …Ik weet het.
- **Wadgids Fenna** *(helder, zacht)*: Ja. Hij wist het ook.
- **Verzorger Marit** *(vriendelijk, via de marifoon)*: Tweehonderdveertien. Dat gaat in het boek. Met jullie naam. Het Wad dankt jullie. Een zeehond doet dat niet. Maar hij blijft liggen. Dat is zijn manier.

**Bij herhaling**

- **Verzorger Marit** *(rustig, via de marifoon)*: Weer tellen? Elke dag een ander getal. Dat is de bedoeling.

**Afrondingskaart:** **TELLEN** · Tweehonderdveertien zeehonden, op afstand geteld. Ze bleven liggen.

#### Z25 · Het verboden eiland

**Type:** boot, kijken (niet landen) · **Speler:** Tessa · **Start:** Zoutkamp, de haven (een platbodem van Fenna's neef Wessel, hoogwater, ochtend) · **Beloning:** € 900

**Verloop**

1. Wessel heeft een weddenschap: wie het eerst voet zet op Rottumeroog krijgt een krat bier. Fenna gaat mee met één voorwaarde: **kijken, niet landen**.
2. Vaar over het Wad bij hoogwater langs de bakens en de geulen (± 14 km, 12 minuten), met zeehonden op de platen en vogels in zwermen; blijf op de aangegeven vaargeul.
3. **Het eiland, 300 m uit de kust:** Rottumeroog is beschermd natuurgebied; er staat een hut van de vogelwachters en een bord. Fotografeer drie dingen: de strandlijn, de hut en het bord. De boot mag niet dichterbij (een afstandsring); de speler **kan** toch landen: dan volgt de gag van de vogelwachter en de boot staat weer buiten de ring.
4. **Het geheim van het eiland** (§7): wie 60 s stil blijft liggen, ziet de zeehonden een voor een van de plaat in het water glijden, als een golf.
5. Terug naar Zoutkamp, met de foto's.

**Falen en overslaan.** De platbodem loopt vast op een plaat (laagwater komt eerder dan gepland: een korte waarschuwing, geen drama; opnieuw). De rompmeter is op. **Overslaan** na één poging: je ligt 300 m uit de kust, de foto's staan, de scène speelt. **Landen:** is geen fail: de vogelwachter komt aan het strand, de scène speelt en de boot wordt teruggezet. De prestatie "Alleen kijken" krijg je niet. **Bezit:** de platbodem is van Wessel (`handBack`).

**Intro.** *Camera:* De camera begint in het ochtendlicht in Zoutkamp op een platbodem: een jonge man in een trui stopt een krat bier in het ruim, Fenna staat aan het roer met haar armen over elkaar. De camera zweeft door de haven naar buiten, het Wad op, de horizon een rechte streep.

- **Wessel** *(opgewekt, jong)*: Moi. Wessel. Neef van Fenna. Ik heb een weddenschap. Wie het eerst op Rottumeroog staat krijgt een krat bier van Klaas-Jan.
- **Wadgids Fenna** *(helder, streng)*: Niemand zet daar voet. Het is natuur. Wij gaan kijken.
- **Wessel** *(opgewekt)*: Kijken is ook een soort aanwezigheid.
- **Wadgids Fenna** *(helder, droog)*: Kijken is de enige.
- **Tessa** *(geamuseerd)*: Heb je het bier alvast ingeladen?
- **Wessel** *(trots)*: Voor als we het vieren. Op afstand.

**In de missie**

- **Wadgids Fenna** *(helder)*: Bakens volgen. Rood links, groen rechts. De geul is smal. De plaat links is droog.
- **Wessel** *(opgewekt)*: Zeehonden! Dat is een hele rij! Ze liggen te zonnen!
- **Tessa** *(geconcentreerd)*: Niet te dichtbij. De ring staat op de kaart. Ik rij eromheen.
- **Wadgids Fenna** *(helder, ontroerd)*: Daar. Rottumeroog. Zie je de hut? Daar wonen mensen die er voor zorgen. Verder niemand.
- **Wessel** *(zacht, plots stil)*: Het is mooier dan ik dacht. En het is leeg.
- **Wadgids Fenna** *(helder, zacht)*: Dat is het mooie. Het is leeg voor zichzelf.
- **Tessa** *(zacht)*: Strandlijn. Hut. Het bord. Klik. Klik. Klik.
- **Wessel** *(zacht)*: Dat bord. Wat staat erop?
- **Tessa** *(stil, leest voor)*: "Natuurgebied. Hier is niemand welkom. Behalve de wind."
- **Wessel** *(stil, onder de indruk)*: Ik hoef geen bier. Dit is genoeg.

**Outro.** *Camera:* De platbodem keert; de eilandstreep wordt kleiner, een zwerm vogels trekt over het water als een zwarte vlek. Fenna zit nu naast Wessel, haar hand op zijn schouder. De camera blijft lang op de horizon.

- **Wadgids Fenna** *(helder, tevreden)*: Je hebt geen voet gezet. Dat is de enige manier om er te zijn.
- **Wessel** *(stil, grijnzend)*: Klaas-Jan betaalt dus niet. Ik ook niet. Dat is eerlijk.
- **Tessa** *(warm)*: Dat is het slimste wat ik ooit iemand heb zien verliezen.
- **Wadgids Fenna** *(helder, zacht)*: Het is geen verlies. Het is een foto.

**Bij herhaling**

- **Wessel** *(opgewekt)*: Weer kijken? Ik neem geen bier mee. Alleen een stoel.

**Afrondingskaart:** **HET VERBODEN EILAND** · Rottumeroog gezien vanaf zee. Niemand zette voet aan wal. Dat is de enige manier.

**Als je toch landt op Rottumeroog (Z25, de gag van de vogelwachter; je wordt op de boot teruggezet)**

- **Vogelwachter Joop** *(droog, kalm, aan het strand met een verrekijker)*: Dit is Rottumeroog. Hier mag niemand komen. Ook ik niet, eigenlijk. Ik werk hier.
- **Vogelwachter Joop** *(droog, kalm)*: U staat op het enige stuk Nederland dat u niet mag betreden. Behalve ik. En de eidereenden. Ik meld alleen: de boot ligt die kant op.
- **Wadgids Fenna** *(helder, vlak, aan de reling)*: Ik zei: kijken.
- **Tessa** *(beteuterd)*: Ik wilde de strandlijn van dichtbij zien.
- **Vogelwachter Joop** *(droog, vriendelijk)*: Van dichtbij is hij hetzelfde. Alleen natter.


## 5. Activiteiten en bijbanen

Wat er in ring 2 te doen is naast het verhaal. Alles is altijd te starten en af te breken; geen enkele activiteit is nodig voor het verhaal.

### 5.1 Wadgids (bijbaan en respectvol minispel)

*Plan:* A4 · *Waar:* Pieterburen en Noordpolderzijl (start bij Fenna; vanaf Z23 vrij)

Een groep over het Wad brengen, met Fenna voorop en jij als **staartgids**. Het is geen race en er valt niets te winnen op snelheid; het spel beloont rust.
- **Regels van het spel:** (1) de gids bepaalt (Fenna loopt voor, jij volgt haar route), (2) de **Groepsmeter**: blijft de groep binnen 30 m, dan loopt het vlot, (3) afstand tot zeehonden en vogels (een ring op de HUD), (4) nooit op een mosselbank, (5) **terug voor de vloed**: de Getijmeter loopt door ook als je niet kijkt. Een eb-vloedcurve voor het Wad (plan 2.7) bepaalt het raam; wie te laat is, wacht op een **hoge plaat** onder Fenna's bevel (geen fail, wel een medaille minder).
- **Niveaus:** 1 de wadloopstart bij Pieterburen (korte tocht naar de eerste plaat), 2 de Engelsmanplaat of de Simonszand (langer, een geul van 60 cm), 3 een nachttocht bij maan (alleen met vooruit gereserveerde groep).
- **Medailles:** brons: iedereen terug, zilver: niemand verdwaald, goud: ook zonder een waarschuwing, en daarboven **"Negen op, negen terug"** (een volle groep, alle regels, geen enkele berisping).
- **Toon:** Fenna is vriendelijk en streng en zegt de regels als regels. Er is geen enkele grap over verdrinken, vast zitten of een gids die faalt.

**Fenna (instructie en commentaar)**

- **Wadgids Fenna** *(helder, vriendelijk)*: Groep staat. Negen. Ik tel nog eens. Jij loopt achteraan en roept als iemand achterblijft.
- **Wadgids Fenna** *(helder)*: Hoger, de hoge plaat. Daar wachten we. Je loopt niet harder. Je loopt gewoon.
- **Wadgids Fenna** *(helder, streng)*: Niemand op de mosselbank. Daar woont iemand anders.
- **Wadgids Fenna** *(helder, tevreden)*: Op de streep. Alle negen. Geen berisping. Dat is het hoogste dat er is.
- **Wadgids Fenna** *(helder, kalm)*: De vloed komt. Niet sneller dan de tabel. Wel stiller. Dat is zijn manier.
- **Wadloper** *(tevreden, moe)*: We hebben de zee niet gezien. Hij was er alleen. Dat is eigenlijk beter.

### 5.2 Havenloods Lauwersoog en het veer aanleggen

*Plan:* A3 · *Waar:* de haven en de zeesluizen van Lauwersoog (startpunt bij Havenmeester Tjerk, vanaf O11)

Havenloods werkt als in F4a: een schip door de boeienlijn sturen met vertraging (4 s), aanleggen, mist en stroming. In Lauwersoog komt erbij:
- **De zeesluizen van Lauwersoog:** schutten tussen het Lauwersmeer en de Waddenzee; het waterpeil verschilt, de deuren zijn zwaar, en de sluiswachter zegt niks.
- **Het veer aanleggen (nieuw):** de laatste 300 m van de veerboot naar Schier aan de pier van Lauwersoog; de boot reageert 6 s later, het getij trekt aan de romp. Kapitein Sybren geeft instructies. **De overtocht zelf blijft een cutscène** (plan §3.6): je legt alleen in Lauwersoog aan.
- **Bonus:** wie een volle boot zonder kras aanlegt, krijgt een prestatie "Op de millimeter" en een kaartje naar Schier (de cutscène, gratis).

**Havenmeester Tjerk en Kapitein Sybren**

- **Havenmeester Tjerk** *(streng, vriendelijk, via de marifoon)*: Schip op de rede. Zeehonden op de plaat links. De zeesluis staat open. Niet toeteren, ze kijken toch.
- **Havenmeester Tjerk** *(droog, tevreden)*: Aan de kade. Geen kras. De havenmeester is tevreden. Dat gebeurt twee keer per jaar.
- **Kapitein Sybren** *(kalm, droog, door de boordradio)*: Stjoer ûnder it stjoer. Oan stjoerboard. In bytsje. Bytsje mear. *(Stuur onder het roer. Aan stuurboord. Een beetje. Een beetje meer.)*
- **Kapitein Sybren** *(droog, tevreden)*: Op 'e kade. Gjin skram. Goed dien. *(Aan de kade. Geen kras. Goed gedaan.)*
- **Havenmeester Tjerk** *(streng)*: De sluis sluit. De eerste die dat niet merkt, gaat de zee op. Dat is meestal een toerist.

### 5.3 Veerboot naar Schier (cutscène)

*Plan:* §3.6 · *Waar:* de veerpier van Lauwersoog (na O14 te herhalen)

Een kaartje kopen (€ 7,50, zwart kan niet: Sybren rekent af in verhalen, dus gratis), de overtocht van ± 45 s als cutscène met commentaar van de passagiers, een aankomst op de kade van Schier met de tekst **"Je bent op Schier geweest"** en direct de terugvaart. **Geen landing:** het eiland is Fries en bestaat alleen als kade en silhouet; wie van boord wil lopen, hoort de kapitein ("Dit is een veerboot, geen trampoline"). Elke overtocht heeft één passagier met één zin.

**Passagiers en omroep**

- **Passagier** *(opgewekt, in een regenjas)*: Ik ga elk jaar. Het eiland is er nog. Dat verbaast me elke keer.
- **Reiziger** *(kletserig)*: Ik heb mijn fiets bij me. Op Schier mogen geen auto's. Dat is mijn favoriete verkeersregel.
- **Kapitein Sybren** *(droog, kalm, door de omroep)*: Wy komme oan. Net springe. Net hjoed. *(Wij komen aan. Niet springen. Niet vandaag.)*
- **Toerist** *(verbaasd, bekakt)*: Is dit het eiland? Het is erg… laag.
- **Kapitein Sybren** *(droog, vriendelijk)*: Dat is it hiele eilân. Dêr komme jo foar. *(Dat is het hele eiland. Daar komt u voor.)*
- **Student** *(moe, opgewekt)*: Ik werk op het eiland in de zomer. Het is ook laag als je eraan werkt.

### 5.4 Boot-klussen: garnalenkotter, waterbus, vogels en sterren

*Plan:* A3, A28, A29 + nieuw · *Waar:* Zoutkamp, het Reitdiep, het Lauwersmeer

- **Garnalenkotter (Zoutkamp):** meevaren met een kotter van een vriend van de dijkwerker: de netten uitzetten en binnenhalen (timing met de boom), garnalen sorteren (maat en bijvangst gaat terug de zee in), terug voor het getij. Niveau 2: 's nachts, met de lampen aan. Er is geen gevoelige bijvangst: de rest gaat terug.
- **Waterbus Reitdiep:** de rondvaartboot tussen Stad en Zoutkamp als bijbaan: passagiers, bruggen die open moeten (toeteren), een zijwind bij het open water. Ook je snelreis naar Zoutkamp.
- **Vogels tellen (A29):** vanaf een vogelhut aan het Lauwersmeer: ganzen, eenden, steltlopers; foto's op afstand; per soort een album. In de nazomer trekken er vogels; geen jacht, geen verstoring.
- **Sterren kijken (A28):** bij helder weer en nieuwe maan op de dijk of de pier van het Lauwersmeer: sterrenbeelden vinden (Poolster, Grote Beer, Cassiopeia, Melkweg) met Fenna's uitleg. Elk gevonden beeld in een album; geen lamp meenemen.

**Garnalenvisser, waterbus en sterrenkijker**

- **Garnalenvisser** *(droog, kalm, op de kotter)*: Net eruit. Net erin. Hij komt vanzelf. Garnalen zijn geduldig. Wij ook.
- **Garnalenvisser** *(droog)*: Deze is te klein. Terug. Hij komt volgend jaar. Dan is hij groter.
- **Buschauffeur Jannes** *(droog, gemoedelijk)*: Waterbus naar Zoutkamp. Vijf bruggen. Toeteren bij elke brug. Ze doen alsof ze het niet horen.
- **Sterrenkijker** *(fluisterend, geboeid)*: Daar. Cassiopeia. Een W. Een W die zich verstopt.
- **Wadgids Fenna** *(zacht, helder)*: Geen lamp. Je ogen hebben tien minuten nodig. Daarna zie je meer dan ooit.

### 5.5 Meerregatta en kanaalraces

*Plan:* A11, A12 · *Waar:* het Lauwersmeer, het Reitdiep (Zoutkamp-Stad), het Van Starkenborghkanaal (Zuidhorn-Gaarkeuken)

- **Meerregatta (A12):** zeilen of motorboot over het Lauwersmeer, een boeienlijn van 6 km met een wind uit het noordwesten; vier klassen, medailles. Zijwind, een bui en één zandplaat die er niet mag staan.
- **Reitdiep-race:** Zoutkamp tot de Oostersluis in Stad (≈ 25 km, 15 minuten), bruggen die open moeten: toeteren en hopen.
- **Van Starkenborghkanaal-race:** Zuidhorn tot de grensbrug bij Gaarkeuken, met de wind van opzij en de beweegbare brug als finish. Je mag de brug niet openhouden; dat is Jelles werk.

**Commentaar**

- **Tessa** *(gespannen)*: Boei. Links. Wind van achter. Ik heb een zeil. Ik heb ook een motor. De motor is mijn plan B.
- **Tammo** *(droog)*: Het zeil klapt. Dat is een mening.
- **Tessa** *(strijdlustig)*: Brug gaat open. We halen het. We halen het niet. We halen het.
- **Jelle Terpstra** *(opgewekt, in de verte)*: Moai, Grinzers! Tige tank foar de race! Ik vaar mee! *(Mooi, Groningers! Bedankt voor de race! Ik vaar mee!)*
- **Tammo** *(droog)*: Hij valt over het zeil. Plons. Hij heeft een zwemvest.

### 5.6 Dijkraces en driftplekken

*Plan:* A9 + nieuw · *Waar:* de zeedijk Noordpolderzijl-Pieterburen-Kloosterburen, de Lauwersmeerdijk, vijf driftplekken

- **Dijkraces (A9):** tijdritten over de wegen langs de dijk (Noordpolderzijl-Pieterburen, de Lauwersmeerdijk N361). Schapen op de weg, wind van opzij, een wadloper die oversteekt (stilstaan = wachten, niet toeteren). Niet racen over de dijk zelf; alleen de weg.
- **Driftplekken (F4b, 's avonds en 's nachts):** (1) het parkeerterrein bij de haven van Lauwersoog (buiten de pier), (2) het bedrijventerrein van Zuidhorn, (3) de grindplaats van de rallyclub bij Niekerk (de oefenplek van Rennie, officieel toegestaan), (4) het kermisterrein van Grijpskerk als er geen kermis is, (5) het parkeerterrein bij het Lauwersmeer (Dark Sky: niet na zonsondergang met lampen aan; Fenna meldt het).
- **Regels:** een sessie duurt 60 s en telt hoek × snelheid × duur; na 2 minuten komt een melding, na 4 minuten een surveillance (1 ster). **Geen** driftplekken op erven, dijkwegen, bij wierden of in een natuurgebied. Op de grindplaats van de club mag het altijd; Rennie zit met een stopwatch.

**Commentaar**

- **Tessa** *(juichend)*: Dwars! Helemaal dwars! Hou hem!
- **Tammo** *(droog, duizelig)*: Ik zie de haven vier keer.
- **Rally-Rennie** *(kordaat, op de grindplaats)*: Hoek achtendertig graden. Duur negenenvijftig seconden. Dat is een club.
- **Agent** *(droog, door een luidspreker)*: Dit is geen circuit. Het is een parkeerterrein. Ga naar huis.
- **Wadgids Fenna** *(helder, aan de telefoon)*: Het Lauwersmeer is donker. Geen koplampen na zonsondergang. De uilen vinden dat ook.

### 5.7 N-wegsprints

*Plan:* A10 · *Waar:* N355 (Stad-Zuidhorn-Grijpskerk), N361 (Winsum-Zoutkamp-Lauwersoog), de Lauwersmeerdijk

Punt-tot-punt, met verkeer. **N355:** Zuidhorn tot Grijpskerk (recht, houtwallen, fietsers). **N361:** Zoutkamp tot Lauwersoog (de Lauwersmeerdijk, zijwind, een ganzenzwerm op de weg). Een flitspaal is een bonusvalkuil (de verzonnen flitspaal van Zuidhorn "staat er voor de sier"). Wegnummers en maximumsnelheden uit OSM (`ref`, `maxspeed`).

**Commentaar**

- **Tammo** *(droog)*: Ganzen. Op de weg. Ze lopen. Ze vliegen niet. Ze hebben het druk.
- **Tessa** *(gespannen)*: Houtwal. Fietser. Houtwal. Fietser. Dat is Zuidhorn.
- **Tammo** *(droog, opgelucht)*: De flitspaal. Ik heb remgelopen. Hij heeft niks gezien. Hij staat er voor de sier.

### 5.8 Trekker- en loonwerkklussen

*Plan:* A5, A7 + nieuw · *Waar:* Westerkwartier (Niekerk, Tolbert, Leek, Grootegast)

- **Trekkertrek (A5, Westerkwartier-finale):** zoals in F4a, met de baan bij Niekerk (fictief). Vrij na O15; **eigen trekker** koopbaar (oud € 2.500, nieuw € 9.000, optional); de trekker van Tinus mag ook, maar blijft van opa.
- **Maïs hakselen (nieuw, nazomer):** de wagen naast de hakselaar houden terwijl hij de maïs in de bak blaast (snelheid synchroon houden, 20-30 km/u), daarna naar het erf. Niveau 2: twee wagens wisselen.
- **Balen rapen (A7):** ronde balen van het land naar het erf voor de bui; in het Westerkwartier met een kleine bui die uit het westen komt.
- **Wissel:** een bijbaan "Loonwerker" (bij Boer Evert): vier opdrachten per dag, per hectare betaald; geen mest, geen gifgrap, geen bieten.

**Boer Evert en de omroeper**

- **Boer Evert** *(droog, nuchter, bij de hakselaar)*: Naast hem blijven. Niet voor, niet achter. Hij blaast, jij vangt. Zo gaat dat.
- **Tammo** *(droog, geconcentreerd)*: De maïs vliegt. Hij hoeft niet. Hij doet het toch.
- **Boer Evert** *(droog, tevreden)*: Vol. Tweeduizend kilo. Dat is een dag.
- **Omroeper** *(luid, enthousiast)*: En nu een Stadjer op een trekker! Hij trekt niet hard. Hij trekt wel steeds!
- **Tinus** *(stug, zacht, langs de baan)*: Opa zou kijken en niks zeggen. Dat was zijn stijl.

### 5.9 Kermiscircuit: Zuidhorn

*Plan:* A6 · *Waar:* het kermisterrein van Zuidhorn (zomerweekend; de finish van O18)

Een van de zes stops van het kermiscircuit (wisselt per week): **botsauto's** (tegen Siemen of een wisselend vriendengroepje), **schiettent** (met rubber ballen op eendjes, geen echte wapens), **zweefmolen** (eenmalig rondje met uitzicht over de houtwallen), **grijpautomaat** (een pluchen zeehond, een pluchen emmer), **touwtrekken** Wadkust tegen Westerkwartier (twee teams; Tinus en Fenna als aanvoerders). Beloning: een tokenkaart, geen vaste prijs.

**Kermisbaas Hennie en het touwtrekken**

- **Kermisbaas Hennie** *(luid, plechtig, door de speaker)*: Dames en heren, hier is de Zuidhorner kermis! Het is geen Uithuizen, maar het draait!
- **Tammo** *(droog)*: Ik kijk wel. Van de grond. Daar is hij het mooist.
- **Omroeper** *(luid, enthousiast)*: Touwtrekken! Wad tegen Hout! Fenna tegen Tinus! Dat is een familiezaak!
- **Wadgids Fenna** *(helder, strijdlustig)*: Wij trekken met het getij. Dat is eerlijk. Het komt altijd terug.
- **Tinus** *(stug, droog)*: Wij trekken met een trekker. Dat is ook eerlijk. Hij staat naast het touw.

### 5.10 Bus- en vrachtwagenritten

*Plan:* A1, A26 · *Waar:* Stad-Zuidhorn-Grijpskerk, Stad-Winsum-Zoutkamp-Lauwersoog, Lauwersoog naar de Vismarkt

- **Streekbus (Jannes):** twee nieuwe lijnen: *Lijn Westerkwartier* (Stad-Zuidhorn-Grijpskerk, houtwallen, zijwind op open stukken, overstap op de trein in Zuidhorn) en *Lijn Wad* (Stad-Winsum-Zoutkamp-Lauwersoog, wind op de dijk, wadlopers met laarzen, toeristen naar de veerboot, een enkele zeehond op het fietspad).
- **Vrachtwagen (A26 gedeeltelijk):** **de visauto**: verse vis van de visafslag in Lauwersoog naar de Vismarkt in Stad (± 45 km, 40 minuten; de vis mag niet warm worden, de Vismarkt-kraam wacht); **de melkwagen** (Westerkwartier): erven langs de grindwegen, een tankmeter die niet mag klotsen. Beide met een oplegger; een wegwerker (Harm) staat altijd bij de afrit.
- **Taxi, pakketten, verhuizen:** de taxistandplaats bij station Zuidhorn; pakketten naar Pieterburen en Kloosterburen langs de dijk; een verhuizing van Zuidhorn naar Pieterburen ("voor de rust, en voor de zeehonden").

**Passagiers en klanten**

- **Buschauffeur Jannes** *(droog, gemoedelijk)*: Lijn Wad. Elke halte is een dorp. Elk dorp heeft een dijk. Elke dijk heeft wind.
- **Reiziger** *(kletserig)*: Ik ga naar de veerboot. Ik heb mijn fiets. Mijn fiets heeft een mening over de wind.
- **Boer** *(droog)*: Zet me af bij het hek. Niet bij de halte. Bij het hek. Mijn koeien wachten niet.
- **Toerist** *(nieuwsgierig, vragend)*: Waar is de zee? Ik zie alleen een dijk.
- **Marktkoopman** *(gehaast, aan de telefoon)*: Waar blijft de vis? De Vismarkt is om acht uur open. De vis is om zeven nog zee.
- **Reiziger** *(kletserig)*: Naar Pieterburen graag. Ik wil de zeehonden zien. Niet te snel rijden. Ze schrikken.

### 5.11 Fjord-filialen en overvallen

*Plan:* A22 · *Waar:* Lauwersoog (de kade, Sientje en Fenna) en Leek (de schuur, Tinus en zijn tante)

Twee nieuwe filialen met het eigen recept: de **Wad-eierbal** (zeekraal van de kwelderboer) en de **Westerkwartier-eierbal** (korst van haver). Overvallen door Ubbo's mensen zijn een event: een melding van de melder ("Twee mannen bij het luik. Ik meld alleen."), je hebt 4 minuten, daarna verdedigen (wegjagen, niet schieten). Niet op tijd: een dag geen inkomen.

**Melders en bondgenoten**

- **Dijkwerker** *(droog, kalm, aan de telefoon)*: Twee mannen bij het luik van Sientje. Met een koevoet. Ik meld alleen.
- **Molenaar** *(droog, kalm, aan de telefoon)*: Er staan twee knechten bij het luik in de schuur. Zij hebben een busje. Ik meld alleen.
- **Oma Sientje** *(oud, droog)*: Vandaag vijftig eierballen. De zeekraal was uitverkocht. Dat vond ik prettig.
- **Tinus** *(stug, droog)*: Mijn tante bakt. Ik ruim op. Dat is de verdeling.

### 5.12 Verkennen en verzamelen

*Plan:* A7, A15-A20, A27, A30, A31, A34-A36 · *Waar:* Wadkust en Westerkwartier

- **Uitkijkpunten (A15):** Wadkust: de vuurtoren van Lauwersoog (anders de kerktoren van Pieterburen; te controleren in OSM); Westerkwartier: de kerktoren van Zuidhorn. Elk onthult de kaart in een straal van 6 km en wordt een snelreispunt.
- **Kieken (A16):** album "Wadkust" en "Westerkwartier", elk 20-25 herkenningspunten (§7).
- **Kerkenpad (A17):** ± 40 kerken in deze twee regio's, met een stempel per kerk en een regel van de koster.
- **Wierden (A18):** Ezinge, Garnwerd, Oldehove, Feerwerd, Den Ham, Saaksum, Den Horn en nog vijf, volgens AHN + OSM `place`; niemand graaft erin.
- **Borgenroute (A19):** Nienoord (Leek) en Dijksterhuis (Pieterburen), en de borgen die OSM nog meer heeft; één dag speltijd.
- **Molenaar (A20):** de molens van het Westerkwartier met de molenaar van Zuidhorn als gids (een nieuw gesprek per molen).
- **Treinspotter (A27):** de lijn Groningen-Leeuwarden (Zuidhorn en Grijpskerk), badge "Elke halte".
- **Wind tegen (A30):** fietstijdrit over de dijk bij Noordpolderzijl op **Oma's fiets uit 1953** (geleend uit n-kotter): een bel, een mand, windkracht zes.
- **Vissen bij de sluis (A31):** bij de sluis van Lauwersoog, met de sluiswachter die niks zegt: dat is het gesprek.
- **Wereldeinden, dorpsuitjes, geheimen (A34-A36):** zie §7 en de data-bijlage H.

**Uitkijkpunten, wind tegen en sluis**

- **Wadgids Fenna** *(helder, aan de telefoon)*: Je staat op de vuurtoren. Zie je het Wad? Daar loop ik. Zwaai maar. Ik zie het niet. Maar ik voel het.
- **Molenaar** *(droog, aan de telefoon)*: Je staat op mijn kerktoren. Ik zie jou. Mijn molen ziet je ook. Hij kijkt anders.
- **Tessa** *(buiten adem, plagend)*: Windkracht zes. Tegen. Dit bouwt karakter, zei je.
- **Tammo** *(buiten adem, droog)*: Oma's fiets heeft een bel. Ik bel. De wind hoort het niet.
- **Havenmeester Tjerk** *(droog, bij de sluis)*: Hier vis je niet voor de vis. Je vist omdat je hier zit.


## 6. Toevallige ontmoetingen en events

Regels uit het verhaal-document §6.1: nooit tijdens een missie, één tegelijk in beeld, en altijd een beloning of een grap. **Alleen zomer:** de grote events zijn het havenfeest, de Garnalendag, de paardenmarkt en het maïsfeest. De **Friese wegversperringen** zijn de volle versie van de voorproef uit F4a §6: drie plekken, elk een korte, overslaanbare scène waarna je met je gezicht naar binnen wordt teruggezet.

**Een loonwerkkonvooi van Tinus' buren** · klein · smalle wegen Westerkwartier

- **Tammo** *(droog)*: Twee trekkers, een hakselaar en een man die zwaait. Niet naar ons.
- **Tessa** *(droog)*: Berm in. Het is hun weg. Hun houtwal.

**Schapen op de dijk** · klein · zeedijk Noordpolderzijl, Lauwersmeerdijk

- **Tessa** *(droog)*: Schapen. Ze kijken alsof wij op hun dijk staan.
- **Tammo** *(droog)*: Dat klopt ook.

**Een lifter met laarzen** · klein · N361, N355

- **Reiziger** *(kletserig, stapt in)*: Naar Pieterburen. Ik loop het Wad op. Nee. Ik loop er naar toe. Mijn gids wacht.
- **Tammo** *(droog)*: Hij loopt dus niet alleen.
- **Reiziger** *(opgelucht)*: Dat is regel drie. Ik heb ze allemaal geleerd. Behalve de eerste.

**Een kapotte trekker bij een houtwal** · klein · Westerkwartier

- **Boer** *(droog)*: Hij doet het niet. Hij deed het nooit. Vandaag ook niet.
- **Tessa** *(zakelijk)*: Accu. Kabels erop, Tammo.
- **Boer** *(droog, dankbaar)*: Hier. Een zak haver. Meer heb ik niet. Hij is wel goed.

**Een boer die zijn koe kwijt is** · klein · Westerkwartier, Wadkust

- **Boer** *(droog, bezorgd)*: Hebben jullie een koe gezien? Zwart-wit. Ze heet Geertje. Niet die van Ome Jan.
- **Tammo** *(droog)*: Geertje. Die ken ik. Ze is kampioen.
- **Boer** *(droog)*: Een andere Geertje. Gelukkig.

**Een melder fietst voorbij** · klein · overal in F4b

- **Dijkwerker** *(droog, kalm, fietsend)*: Jullie rijden te hard op mijn dijk. Ik meld alleen.
- **Molenaar** *(droog, kalm, vanaf een bankje)*: Mooi weer. De molen draait niet. Hij heeft vrij. Ik meld alleen.
- **Oma Sientje** *(oud, droog, vanuit een raam)*: Ik zie jullie. De haven ziet jullie. Dat is hetzelfde. Ik meld alleen.

**Een overval op een Fjord-filiaal** · klein · Lauwersoog, Leek

- **Tessa** *(fel)*: Twee knechten van Ubbo bij het luik. Erheen!
- **Tammo** *(droog)*: Ze willen de pannen. Ze kunnen niet eens bakken.

**De Friese wegversperring (Lauwersmeerdijk)** · klein · N361 aan de Friese kant van de Lauwersmeerdijk

- **Wybe** *(traag, plechtig)*: Halt. Fryske grins. Paspoart, as it jo belieft. *(Halt. Friese grens. Paspoort, alstublieft.)*
- **Tessa** *(ongelovig)*: Dit is de Lauwersmeerdijk. De grens is daar. Met een bord.
- **Wiebren** *(traag, eerlijk)*: Wy oefenje foar de dyk. *(Wij oefenen voor de dijk.)*
- **Tammo** *(droog)*: Jullie lijken op Durk en Douwe.
- **Wybe** *(traag, trots)*: Wy binne harren neven. Wy binne grutter. *(Wij zijn hun neven. Wij zijn groter.)*
- **Wiebren** *(traag)*: …grutter. *(…groter.)*
- **Tessa** *(droog)*: Natuurlijk.
- **Wybe** *(traag, plechtig)*: Jim meie troch. Mar net fertelle. *(Jullie mogen door. Maar niet doorvertellen.)*

**De Friese wegversperring (N355)** · klein · N355 bij Grijpskerk, richting Kollum

- **Wiebren** *(traag, plechtig, achter een klaptafel)*: Fryske grins. Wy kontrolearje. *(Friese grens. Wij controleren.)*
- **Tammo** *(droog)*: Wat controleren jullie?
- **Wybe** *(traag, serieus)*: Of jo de goeie kant út geane. *(Of u de goede kant op gaat.)*
- **Tessa** *(geduldig)*: En welke is de goede kant?
- **Wybe** *(traag, na een lange stilte)*: …Dizze. *(…Deze.)*
- **Wiebren** *(traag)*: …Dizze. *(…Deze.)*
- **Tammo** *(droog)*: Dan gaan we toch gewoon door.

**De Friese grenswacht op het water (kanaal)** · klein · Van Starkenborghkanaal bij Gaarkeuken

- **Wybe** *(traag, plechtig, in een roeiboot)*: Stopje! Fryske grinswacht! Stopje, mei jo tastimming! *(Stop! Friese grenswacht! Stop, met uw toestemming!)*
- **Wiebren** *(traag, trots, roeiend)*: Wy hawwe in boat. *(Wij hebben een boot.)*
- **Tessa** *(droog)*: Jullie hebben een roeiboot.
- **Wybe** *(traag)*: In grutte. *(Een grote.)*
- **Tammo** *(droog)*: Hij is zes meter.
- **Wiebren** *(traag, beteuterd)*: …Grutter as wy tochten. *(…Groter dan we dachten.)*

**Drenthe is dicht (het hunebed op de weg)** · klein · de weg bij Leek/Marum richting Drenthe

- **Boer** *(droog, naast een hunebed op de weg)*: Doar achter is Drenthe. Drenthe is dicht. Het hunebed ligt er al vijfduizend jaar. Ik kan er niks aan doen.
- **Tessa** *(droog)*: Dit is een weg.
- **Boer** *(stellig)*: Dit was een weg. Nu is het een hunebed. Het is een verbetering.
- **Tammo** *(droog, zacht)*: Hij heeft een punt.

**Kustwacht-radio op het open Wad** · klein · het Wad voorbij Rottumeroog (de randen van het speelbare Wad)

- **Loodsdienst** *(zakelijk, door de marifoon)*: Open zee. Hier is de kustwacht. Het speelbare Wad houdt hier op. Keer om. Het is mooi en het is groot en het is niet van jou.
- **Tessa** *(zacht)*: Hij heeft gelijk. Het is niet van ons.

**De weekmarkt in Zuidhorn** · middel · dorpscentra

- **Reiziger** *(kletserig)*: Kaas, vis en een man die zegt dat hij zeekraal heeft. Ik koop de kaas.

**Een voetbalwedstrijd op het dorpsveld** · middel · Niekerk, Grijpskerk

- **Tessa** *(lachend)*: Twaalf toeschouwers. Elf spelers. Eén scheidsrechter. Ze kennen elkaar allemaal.
- **Tammo** *(droog)*: Dan is het altijd een thuiswedstrijd.

**Een begrafenis (stil, niet storen; wie toetert krijgt een blik)** · middel · een dorpskerk

- **Tammo** *(zacht)*: Rustig. Even niet toeteren.
- **Tessa** *(zacht)*: Ik weet het.

**Een fanfare die oefent** · middel · Zoutkamp, Grijpskerk

- **Tammo** *(droog)*: Ze spelen hetzelfde stuk voor de vijfde keer.
- **Tessa** *(droog)*: Het wordt elke keer beter.
- **Tammo** *(droog)*: Het wordt elke keer harder.

**De paardenmarkt van Marum (verzonnen)** · groot · Marum (zomerweekend: zo 27 sept, dag 45)

- **Marktkoopman** *(luid, joviaal)*: Paarden! Pony's! Een koets met een mening! Alles voor de liefhebber!
- **Tessa** *(uitgelaten)*: Ik wil een pony. Alleen om te kijken.
- **Tammo** *(droog)*: Je wilt altijd alleen kijken. Daarna sta je met een pony in de Fjord.

**Het havenfeest van Lauwersoog (vrijdag)** · groot · Lauwersoog (de pier)

- **Havenmeester Tjerk** *(luid, plechtig)*: Havenfeest! Iedereen op de pier! Niemand in het water! Dat is het hele programma!

**De Garnalendag in Zoutkamp (verzonnen)** · groot · Zoutkamp (zomerweekend: za 26 sept, dag 44)

- **Garnalenvisser** *(droog, trots)*: Vandaag pellen we. Geen wedstrijd. Gewoon pellen. Het is een meditatie.

**Het maïsfeest (laatste maïs binnen)** · groot · Niekerk of Grootegast

- **Boer Evert** *(droog, tevreden)*: De maïs is binnen. Nu de mensen nog. Bier staat klaar.


## 7. Herkenningspunten en geheimen

Bij de eerste keer dichtbij: een naamkaart (de plaatsnaam groot, één droge regel klein) en één zin van Rikus (`V`, in de radioklank). De plaatsen en gebouwen hebben hun echte naam; zie §10 voor wat er te verifiëren is. Wat verzonnen is staat erbij.

| Naamkaart | Kaartregel |
|---|---|
| Zoutkamp, de haven | Garnalenkotters met uitgeklapte bomen. Het ruikt naar werk. |
| Zoutkamp, de schutsluis | Waar het Reitdiep het Lauwersmeer in kijkt. |
| Lauwersoog, de haven | Visafslag, veerboot en een zeesluis. Alles wat varen wil, komt hier langs. |
| Lauwersoog, de zeesluizen | Meer links, zee rechts. De sluiswachter zegt niks. |
| Lauwersoog, de veerpier | Naar Schier. Je ziet het eiland als een streep. |
| Lauwersmeer, Dark Sky Park | Het donkerste stuk van Nederland. Neem geen lamp mee. |
| Noordpolderzijl | Kleinste haventje, grootste Wad. |
| Pieterburen, de kerk | Dorp aan het Wad met een kerk die ouder is dan zijn dijk. |
| Pieterburen, het Zeehondenhuis (fictief) | Zeehonden die even bijkomen. |
| Pieterburen, Dijksterhuis | Borg achter een dijk. |
| Hornhuizen en Kloosterburen | Laatste dorpen voor de zee. |
| Niekerk, de kerk | Klein dorp. Grote houtwal. |
| Zuidhorn, het station | Twee treinen per uur en een molen aan de horizon. |
| Zuidhorn, het Van Starkenborghkanaal | Een kanaal naar Friesland. |
| Grijpskerk | Laatste station voor Friesland. |
| Aduard, de abdijresten | De abdij is weg. Het dorp is gebleven. |
| Aduarderzijl | Een zijl, een café, een stilte. |
| Leek, Nienoord | Borg met park. Het koetsenhuis is verzonnen. |
| Marum | Dorp aan de rand. Daarachter begint Drenthe. |
| Oldehove, de kerk | Toren op een wierde. |
| Ezinge, de wierde | Hier is gegraven door mensen die het mochten. |
| Garnwerd | Dorp aan het Reitdiep. |
| Kommerzijl en Gaarkeuken | Waar Groningen ophoudt en Friesland begint. |
| Rottumeroog (gezien vanaf zee) | Een eiland waar niemand komt. |
| Schiermonnikoog (gezien vanaf de veerboot) | Fries eiland. Het blijft een streep. |

**Rikus bij de ontdekking**

- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Zoutkamp. Kotters met uitgeklapte bomen, als insecten op de kade. Het ruikt naar zout en naar werk, in die volgorde. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: De sluis van Zoutkamp. Water aan de ene kant, water aan de andere. Het scheelt twintig centimeter. Dat is genoeg voor een sluiswachter. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Lauwersoog. Een visafslag, een veer en een zeesluis. Alles wat wil varen, komt hier even kijken. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: De sluizen van Lauwersoog. Aan de ene kant het meer, aan de andere kant de zee. De deuren zijn zwaar. Ze weten het. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: De veerpier van Lauwersoog. Hier vertrekt de boot naar Schier. Het eiland is er niet. Het is een streep. Maar hij komt. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Het Lauwersmeer. Het donkerste stuk van Nederland. De sterren komen er gratis bij. Maar je moet je lamp uitdoen. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Noordpolderzijl. Een zijl, een haventje en een dijk. Daarachter begint het Wad. Het is het einde van het land en het begin van iets anders. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Pieterburen. Een dorp aan het Wad met een oude kerk. Hier begint de weg het Wad op. Met een gids. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Het Zeehondenhuis in Pieterburen. Zeehonden die even bijkomen. Ze kijken er verbaasd bij, zoals alle zeehonden. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: De borg van Pieterburen. Een huis achter een dijk met een stilte eromheen. Gewoon even staan. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Hornhuizen en Kloosterburen. De laatste dorpen voor de zee. De kerken staan op wierden en kijken naar het water. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Niekerk. Een kerk, een sportveld en een rallyclub zonder auto. Meer heeft een dorp niet nodig. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Zuidhorn. Een station, een molen en twee treinen per uur. De molenaar telt ze allebei. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Het Van Starkenborghkanaal. Het gaat helemaal naar Friesland. Het wil er niet naartoe. Maar het heeft geen keus. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Grijpskerk. Het laatste station voor Friesland. Daarna gaat de trein door, maar hij kijkt erbij of het mag. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Aduard. Hier stond een abdij. De abdij is weg. Het dorp is gebleven. Dat is een soort winst. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Aduarderzijl. Een zijl, een café en een stilte die tegen je aan komt zitten. Het diepje doet mee. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Nienoord in Leek. Een borg met een park, een vijver en zwanen. Het Rijtuigenhuis is een verzinsel. De zwanen zijn echt. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Marum. Het dorp aan de rand. Daarachter begint Drenthe. Of niet. Dat staat nog open. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Oldehove. Een toren op een wierde. Hij staat al langer dan de weg. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Ezinge. Een wierde waar echte archeologen gegraven hebben. Nu graaft niemand meer. Er staat een dorp bovenop. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Garnwerd. Een dorp aan het Reitdiep, met een kerk en een uitzicht op een bocht. De bocht is bijna beroemd. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Kommerzijl en Gaarkeuken. De grens met Friesland. Hij loopt over een brug die soms openstaat. Voor een Fries. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Rottumeroog. Een eiland waar niemand mag komen. Dat is het mooiste wat je over een eiland kunt zeggen. `[naamkaart]`
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: Schiermonnikoog. Een Fries eiland, gezien vanaf de boot. Het blijft een streep tot je er bent. Dan is het een kade. `[naamkaart]`

**Geheimen (A36), 4 per regio, en het ene geheim van Rottumeroog**

- **De fiets van 1953** (Wadkust): Na n-kotter staat Oma's fiets in het ruim; wie hem naar Stad rijdt (of er "Wind tegen" mee fietst), krijgt een bel-geluid en een regel van Oma.
  - **Oma Trijntje** *(stellig, oud, aan de telefoon)*: Die bel is van mij. Ze bellen er al zeventig jaar mee. Ik heb er nooit zelf op gebeld.
- **De Dijk van de Nacht** (Wadkust): Bij nieuwe maan op de pier van het Lauwersmeer: 60 s stilstaan met de telefoon uit onthult de Melkweg als een spoor. Fenna noemt hem de Dijk van de Nacht.
  - **Wadgids Fenna** *(zacht, helder)*: Zie je? Hij loopt van hier tot Friesland. Mijn oma loopt er elke avond over. In gedachten.
- **Rottumeroog, gezien vanaf zee (het ene geheim)** (Wadkust): Wie 60 s stil blijft liggen op 300 m van Rottumeroog (Z25 of vrij), ziet de zeehonden een voor een van de plaat in het water glijden, als een golf. Prestatie "Alleen kijken" (niet landen).
  - **Wadgids Fenna** *(zacht, ontroerd)*: Daar. Ze gaan. Allemaal tegelijk, maar niet tegelijk. Dat is een golf die mag.
- **De boei die belt** (Wadkust): Een boei in het Lauwersmeer met een bel; de bel klinkt alleen bij wind. Wie ernaast ligt, hoort een melodie van Kapitein Klaas.
  - **Kapitein Klaas** *(schor, knipogend, aan de telefoon)*: Die boei. Ik heb hem in 1973 de weg gewezen. Hij belt sindsdien als hij dank wil zeggen.
- **De emmer van Tinus** (Westerkwartier): Op het erf bij Tolbert staat de emmer van O15 op een kist. Wie er een bloem in zet (E bij het veld), krijgt een kaartje "Opa".
  - **Tinus** *(stil, droog)*: Hij staat er nog. Ik laat hem staan. Dat is een soort grafsteen die nog nuttig is.
- **Het gastenboek van het Rijtuigenhuis** (Westerkwartier): Na O17: tik in het gastenboek van het museum: "Koets haalt rallyauto in" met de datum en een handtekening van Wiegert.
  - **Koetsier Wiegert** *(trots, plechtig)*: Het staat erin. Met een pen. Dat is langer dan een auto.
- **De Gouden Moersleutel** (Westerkwartier): Na Z22 hangt de beker aan de muur van het clubhuis in Niekerk. Wie ernaast gaat staan, hoort Rennies stopwatch tikken.
  - **Rally-Rennie** *(kordaat, zacht)*: Hij is van de club. De club is van ons. Het is een cirkel. Een rallycirkel.
- **De melkbus met de turbo** (Westerkwartier): In de werkplaats van Wietse in Leek staat een tweede melkbus op de werkbank. Wie hem schudt, hoort iets rammelen en een stem: "Dat is ook een turbo."
  - **Henk** *(gemoedelijk, aan de telefoon)*: Ik vraag niet wat erin zit. Ik hoop op een turbo. Maar ik vraag het niet.

## 8. Nachtstreek in F4b

Alle radiomomenten op een rij (de regels staan bij de missies). Rikus zendt "op tournee"; de melders bellen in; Ubbo belt twee keer live.

| Stap | Moment | Beller |
|---|---|---|
| n-zoutkamp | – | (de dijkwerker op de dijk, geen radio) |
| O11 | Bel Rikus | Jelle, Ljouwert |
| O11 | na afloop | Jelle, Zoutkamp |
| O12 | Bel Rikus | Fenna, wadgids |
| O13 | Bel Rikus | Dijkwerker, Noordpolderzijl |
| O13 | na afloop | Rikus zelf (één korte, ernstige mededeling over het Wad) |
| O14 | Bel Rikus | Ubbo, Oldenhuis Bakt |
| O14 | na afloop | Jelle, Schier |
| O15 | Bel Rikus | Tinus, Tolbert |
| O15 | na afloop | Hilko, Westerkwartier |
| O16 | Bel Rikus | Molenaar, Zuidhorn |
| O17 | Bel Rikus | Rally-Rennie |
| O18 | Bel Rikus | Rally-Rennie |
| tweede F4b-voorronde | rubrieken: melders, peiling, Ubbo | Ubbo Oldenhuis |

**Vaste rubrieken die doorlopen:** de fietstunnel-update schuift door ("Bijna klaar. 2032."), het storingsbericht wordt aan het Wad "Storingsbericht: de zeesluis bij Lauwersoog is dicht. Volgens de sluiswachter is dat geen storing. Dat is het getij.", en de peiling "Groeien of thuis?" staat op 49-51.


## 9. Continuïteit, personages en gevoelige onderwerpen

**Deel 1-3 en F4a blijven ongewijzigd.** F4b raakt niets wat al gespeeld is; het leunt erop:
- **Oma's lijstje:** F4a sloot met "Geesje" en "Lammert" en vijf namen met alleen een dorp. F4b vult er twee in: **Sientje (Noordpolderzijl)** en **Hinderk (Tolbert)**. Er blijven drie over voor F4c (Roelfien, Wubbo, Berend + de boswachter).
- **1953 krijgt twee kanten erbij:** Sientje leende Trijntjes fiets voor haar trouwdag en noemde haar kotter *Trijntje* (de fiets staat nog in het ruim); Hinderk beloofde Trijntje een rit naar Bourtange en liet haar lopen ("vijf uur in de regen, ik werd tweede, dat is zijn schuld"). Dat sluit aan op Z4 (F4a): tweede plaats in de Ommelander Ronde van 1953, in de vesting Bourtange. **Voorstel voor F4c (O30-O32):** Oma rijdt op Hinderks trekker, door Tinus bestuurd, naar Bourtange; Tinus' briefje ("Rit naar Bourtange. Trijntje. Schuldig sinds 1953.") is de reden.
- **Het grootboek:** Jelle zegt in O11 dat Ubbo zeven delen heeft, één per regio. F4b levert **deel drie (Wadkust)**: schulden van vissers, met handtekeningen, en een pandrecht op Sientjes kotter. **Voorstel voor F4c (O24):** het salonrijtuig bevat alle zeven delen; de enveloppen van O17 zijn het "Westerkwartier-deel" in kleine vorm. Deel één (Hogeland) en twee (Eemsdelta) uit F4a bestaan als verwijzing ("Ubbo heeft er nog veertig", O10).
- **Henks zenders:** de eerste zat in O8 onder Siebrands container; de tweede ("Schroefje los, voor het handschoenenvak") speelt in O16. Henk vraagt nog steeds niet waarom.
- **Dokter Dijkstra** (Deel 3, H15: "Zij vliegt. Hij hangt.", "Het staat niet in het rooster.") komt terug in O13 met een gerepareerde heli en zet het Wad nu "in het rooster". Tammo: "Mijn moeder mag dit nooit weten."
- **Mem Terpstra** (Deel 3: ze belt Trijntje elke zondag, in de finale zegt Trijntje "Gerda. Jouw eierbal was beter.") woont sinds juni bij haar zus op Schier; haar bakkerij in Ljouwert is Oldenhuis Bakt nummer zeventien. Dat is de wrok van Jelle (plan §2.2), nu in beeld.
- **Durk en Douwe** werken voor Ubbo (F4a); in O16 zitten ze achter het stuur van de derde truck en lekken alles aan hun neven ("Net fertelle, Durk." "…Ik heb het al verteld."). Ze lopen pas in F4c over.
- **Jelle** valt in het water (personagebijbel: "elke ontsnapping is een polsstokspringen, en de laatste gaat mis"), zegt "Net fertelle" en helpt uit wrok; hij is nooit gemeen.
- **Tammo en Tessa:** in O13 zeggen ze het zachtjes: "Ik wil niet dat je overal naartoe loopt." "Ik wil niet dat jij nergens naartoe gaat." "Dat is geen ruzie." "Nee. Dat is een lijstje." In n-schuur: "Dit gaat harder dan ik dacht." "Dat dacht ik ook." De echte ruzie is nog steeds voor O23.
- **Personagebijbel:** Tammo zegt nooit "super" en geen Fries; hij zegt het belangrijke kort ("Eerst het leven. Dan het boek."). Tessa geeft bevelen en weet de feiten (Poolster, stuurboord, regel twee). Rikus vertelt nooit meer dan de speler weet. Durk maakt zinnen af, Douwe herhaalt het laatste woord; in O16 doen Wybe en Wiebren hetzelfde.
- **Dialoogregels** (uit de dialoogreview van oktober 2026): de `why`-regels verwijzen niet naar wat pas in de intro gebeurt; niemand legt uit wat de ander al weet; "Ik meld alleen" komt per scène hooguit één keer per melder; "Kon minder" spaarzaam (in F4b nergens als compliment).

**Gevoelige onderwerpen (verhaal-document §8)**

| Onderwerp | In F4b |
|---|---|
| Gaswinning | Eén stille scène in Z24 (Fenna kijkt naar een platform: "Mijn opa werkte ooit bij het gas. Hij sprak er nooit over."). Geen grap, geen bedrijf, geen schurk, geen schade in beeld. |
| Het Wad en wadlopen | Altijd met een gids; Fenna zegt de regels als regels. Er is nooit een verdrinkingsgrap. O13 toont de opzet (wind duwt het water naar de kust) als iets wat ook een kenner overkomt; Fokko's vader kwam ooit niet terug en dat wordt één keer stil gezegd. Het spel luistert naar Fenna (Groepsmeter, afstandsringen, Getijmeter). |
| Zeehonden, vogels, mosselbanken | Afstand en rust; niets wordt aangeraakt of opgejaagd; een mosselbank betreden kost een berisping en tijd. |
| Rottumeroog en Rottumerplaat | Verboden natuur, gezien vanaf zee (Z25, het veer, de kustwacht-radio). Landen mag technisch, maar levert alleen de gag van de vogelwachter en een teruggezette boot op. Eén geheim: de zeehonden die als een golf het water in glijden. |
| Schiermonnikoog | Fries eiland, alleen als cutscène van de veerboot (kade en silhouet). Geen landing; de kaart toont geen binnenland. |
| De grens met Friesland en Drenthe | De Friese wegversperring (drie plekken) en het hunebed van Drenthe: grappen over regels en neven, nooit over mensen. |
| Armoede in de visserij | De vissers (Dolf, Hendrik, Sientje) staan bij Ubbo in het krijt, met trots en humor; Ubbo is de uitbuiter en wordt nooit gezien. Niemand wordt neergekeken. |
| Paard en dier | Geen zweep, geen geraakte zwaan, geen letsel; een tongklik en een mening. |
| Echte bedrijven en merken | Geen. De veerboot, de sloperij, de rallyclub, de werkplaats, het Zeehondenhuis en het Rijtuigenhuis zijn verzonnen; Nienoord, Lauwersoog en Zoutkamp heten echt. |
| Bieten, mest, gif | Geen grappen over bieten (personagebijbel); geen mest in F4b; geen gif. |

**Afwijkingen van het plan (bewust)**
- **De voorronde van elke regio is de laatste missie** (O14, O18); het plan noemt voor O14 alleen de veerbootjacht. De voorronde en de jacht lopen in O14 door elkaar (Tessa springt weg uit het serveren), zodat de regio vier missies houdt.
- **O14:** het plan zegt dat Fokko "Ubbo's grootboek" met de veerboot meestuurt; in F4b is het **deel drie (Wadkust)** van zeven. Het hele grootboek hoort bij O24.
- **Z25:** het plan wilde "voet zetten" op Rottumeroog; in F4b is het **kijken, niet landen**, met de gag als je toch landt (besluit eigenaar van 15 oktober).
- **Nieuwe `n-`stappen:** `n-zoutkamp` (waterbus), `n-zuidhorn` (trein), `n-kotter` en `n-schuur` (safehouses en filialen), zoals F4a ze voor Delfzijl en Warffum had.
- **Calendar (opgelost):** F4a zette 15 september op "ma" en de voorrondes op "za 20" en "za 27"; in 2026 zijn dat dinsdag, zondag en zondag. De kalender is voor F4a, F4b en F4c in één keer rechtgetrokken in KALENDER.md (Deel 4): F4a dag 33-40 (di 15 - di 22 sept), F4b dag 41-45 (ongewijzigd), F4c dag 46-51 (ma 28 - za, de finale op dag 51). De voorrondes vallen op dag 37 (za), 40 (di), 43 (vr), 45 (zo), 47 (di), 50 (vr) en 51 (za); alles na dag 40 is "nazomer · dag N".
- Nieuwe stage-soorten (in §11 met `NEW`): `wad`, `rescue`, `lift`, `serve`, `jump`, `grab`, `cutscene` (veerboot), `tune`, `tail`, `plant`, `race` met pacenotes en rivaal; nieuwe goal-types `waterbus` en (herbruikt) `trekkertrek`, `filiaal`, `train`. Nieuwe voertuigen: roeiboot, platbodem, koets met paarden, rallyauto, hakselaar met wagen, garnalenkar, waterbus. Nieuwe systemen: getij met opzet, groepsmeter, afstandsringen (dieren), geluidsmeter, alertmeter.
- **Zeven voorrondes, vier regio's:** Hogeland (O6), Eemsdelta (O10), Wadkust (O14), Westerkwartier (O18); drie te gaan voor F4c: Oldambt, Veenkoloniën, Westerwolde.


## 10. Echte plekken om te verifiëren (OSM)

Namen zoals ze in OSM zouden moeten staan; de kolom "Check" zegt wat de bouwer moet nakijken. Alles wat niet in deze lijst staat (cafés, erven, de pier-kraam, het Rijtuigenhuis, de sloperij, het clubhuis) is verzonnen en heeft geen echt adres nodig.

| Plek | OSM (verwacht) | Gebruikt in | Check |
|---|---|---|---|
| Zoutkamp (haven, Reitdiep, schutsluis) | `place=village`, `waterway=lock_gate`, `landuse=port` | n-zoutkamp, O11, §5 | ligging sluis en haven; of het Reitdiep bevaarbaar is van Stad tot hier |
| Lauwersoog (haven, zeesluizen, veerpier) | `waterway=lock_gate`, `amenity=ferry_terminal`, `route=ferry` | O11, O14, §5 | schutrichting, veerverbinding naar Schiermonnikoog, pier voor het havenfeest |
| Lauwersmeer (meer, Dark Sky Park) | `natural=water`, `leisure=nature_reserve` | O11, O12, §5 | boeienlijn, of er een Dark Sky-tag is, ligging van Ezumazijl |
| Ezumazijl, Robbenplaat, Ezumakeeg | `place=*`, `natural=*` | O12, Z-reeksen | of Ezumazijl een echte steiger is (anders verzonnen op de oever) |
| Noordpolderzijl (zijl, haventje, dijk) | `waterway=lock_gate`, `man_made=dyke` | O13, Z24, §6 | het wadpad, de zijl, de waterlijn bij eb |
| Het Wad: Simonszand en de geulen | `natural=sand`, `natural=wetland`, zeekaart | O13, §5 | ligging en naam van de plaat; hoogste plaat; wadlopen-routes |
| Pieterburen (kerk, dijk, wadloopstart), Dijksterhuis | `place=village`, `historic=manor` | Z23, §7, §10 | wadloopstart; borg Dijksterhuis (ook in F4a §10) |
| Hornhuizen, Kloosterburen, Westernieland, Vierhuizen | `place=village` | §7 | kerken op wierden, afstanden |
| Rottumeroog, Rottumerplaat | `place=island`, `leisure=nature_reserve` | Z25, §6, §7 | ligging t.o.v. Lauwersoog; speelbaar tot de afstandsring |
| Schiermonnikoog (kade, silhouet) | `place=island` | O14, §5 | alleen silhouet en kade; de veerroute |
| Reitdiep (Stad-Zoutkamp) | `waterway=river`, `bridge=movable` | n-zoutkamp, §5 | vijf bruggen die open moeten |
| Zuidhorn (station, molen, kanaal) | `railway=station`, `man_made=windmill`, `waterway=canal` | n-zuidhorn, O16, §5 | molen van Zuidhorn; Van Starkenborghkanaal; weegbrug op de N355 (anders verzonnen) |
| Grijpskerk (station), Kommerzijl, Gaarkeuken (grensbrug) | `railway=station`, `bridge=movable` | O16, §6 | welke brug echt beweegbaar is, en de Friese kant |
| Van Starkenborghkanaal (Zuidhorn-Gaarkeuken) | `waterway=canal` | O16, §5 | bevaarbaarheid en bruggen |
| Leek (Nienoord, park, vijver, gracht) | `historic=manor`, `leisure=park` | O17, §5, §7 | lanen, vijver en gracht; de koetsenstal is verzonnen |
| Marum (kerk, rand van Drenthe) | `place=village` | §6, §7 | de weg richting de provinciegrens voor het hunebed |
| Niekerk, Tolbert, Grootegast, Oldehove, Den Horn, Noordhorn | `place=village` | O15-O18, §7 | sportveld Niekerk als trekkertrekbaan (fictief); plekken voor erven (fictief) |
| Aduard, Aduarderzijl | `place=village`, `waterway=lock_gate` | §7 | abdijresten; zijl |
| Ezinge, Garnwerd, Feerwerd, Den Ham, Saaksum | `place=village` | §5, §7 | wierden (AHN + OSM `place`) |
| N355, N361, N388 | `ref=*` | §5 races, bus | maxspeed; N361 Zoutkamp-Lauwersoog; N355 Zuidhorn-Grijpskerk |
| Lauwersmeerdijk (N361) naar Friesland | `highway=*` | §6 grensgrap | plek voor de Friese wegversperring |
| Station Zuidhorn, Grijpskerk (lijn naar Leeuwarden) | `railway=station` | n-zuidhorn, §5 | volgorde en frequentie |
| Vuurtoren van Lauwersoog (of kerktoren van Pieterburen) | `man_made=lighthouse` | §5 uitkijkpunt | ligging en beklimbaarheid; anders de kerktoren |
| Kerktoren van Zuidhorn | `amenity=place_of_worship` | §5 uitkijkpunt | beklimbare toren (spel) |
| Kermisterrein Zuidhorn | – | §5, O18 | waar de kermis echt staat |
| Dorpsuitjes (Zoutkamp, Pieterburen, Grijpskerk, Leek, Marum, Aduard, Niekerk) | `place=village` | §11H | de plek per uitje |


## 11. Data-bijlage (voor storyarc.js, missionstory.js, missions.js, banterlines.js, subtitles.js, ommelandlines.js en de TTS-pijplijn)

Alles hieronder is gegenereerd uit dezelfde bron als het script hierboven: regels zijn letterlijk gelijk. Coördinaten staan open (`/* ... */`), want de provinciekaart bestaat nog niet. Nieuwe stage-soorten en goal-types zijn gemarkeerd met `NEW`.

### A. storyarc.js

```js
// storyarc.js: add to SPEAKERS (F4a keys such as ubbo, geesje, lammert, wybe, wiebren stay as they are)
  fenna: 'Wadgids Fenna',
  fokko: 'Fokko de Visser',
  dijkwerker: 'Dijkwerker',
  sientje: 'Oma Sientje',
  visser: 'Visser',
  sybren: 'Kapitein Sybren',
  wessel: 'Wessel',
  vogelwachter: 'Vogelwachter Joop',
  verzorger: 'Verzorger Marit',
  vader: 'Vader',
  influencer: 'Influencer',
  tinus: 'Tinus',
  hilko: 'Hilko Kremer',
  molenaar: 'Molenaar',
  rennie: 'Rally-Rennie',
  siemen: 'Neef Siemen',
  koetsier: 'Koetsier Wiegert',
  knecht: 'Knecht',
  havenmeester: 'Havenmeester Tjerk',
  trekkerboer: 'Boer Evert',
  commissaris: 'Baancommissaris',
  dame: 'Dame met hoed',
  monteur: 'Monteur',
  sander: 'Sander',
  wandelaar: 'Wandelaar',
  garnalenvisser: 'Garnalenvisser',
  marktkoopman: 'Marktkoopman',
  sterrenkijker: 'Sterrenkijker',
  passagier: 'Passagier',
  groep: 'Wadloper',

// storyarc.js: add to CHARACTERS (name cards; jelle and mem keep their cards)
  fenna: { name: 'Wadgids Fenna', card: 'Kent het Wad. Het Wad kent haar. Ze zijn het eens.', step: 'O12', bio: 'Wadgids bij Pieterburen en Noordpolderzijl, kleindochter van Sientje. Streng en vriendelijk, en nooit achter iemand aan: ze gaat naar iemand toe.', quote: 'Ik ga niet achter iemand aan op het Wad. Ik ga naar iemand toe.' },
  fokko: { name: 'Fokko de Visser', card: 'Wadvisser. Palingman. Vangt wat hij niet mag houden en houdt wat hij niet mag vangen.', step: 'O11', bio: 'Ubbo\'s man op het Wad: smokkelt paling en bewaart het Wadkust-deel van het grootboek. Zijn vader kwam ooit niet terug van het Wad. Hij loopt er elke dag, tot hij de weg kent.', quote: 'Openbaar is een woord voor mensen die zelf geen kade hebben.' },
  dijkwerker: { name: 'Dijkwerker', card: 'Werkt aan de dijk. De dijk is nooit af. Ziet alles van dichtbij.', step: 'n-zoutkamp', bio: 'De melder van de Wadkust. Neef van wegwerker Harm; zij werken allebei aan iets wat nooit af is.', quote: 'Ik meld alleen.' },
  sientje: { name: 'Oma Sientje', card: 'Achtentachtig. Wadvissersvrouw. Heeft nooit iets teruggebracht. Dat gaat nu veranderen.', step: 'O14', bio: 'Fenna\'s oma. Noemde in 1953 haar eerste schip naar Trijntje, die haar een fiets leende. Zit in de jury en meldt (met een neef die een dijk heeft).', quote: 'Papier is papier.' },
  molenaar: { name: 'Molenaar', card: 'Draait met de wind of ertegenin. Meldt alleen.', step: 'n-zuidhorn', bio: 'De melder van het Westerkwartier. Nicht van Molenaar Fenna in Winsum. Telt elke trein en elke vrachtwagen.', quote: 'Ik meld alleen.' },
  tinus: { name: 'Tinus', card: 'Trekkertrekker. Rijdt voor opa. De motor zit in een emmer.', step: 'O15', bio: 'Kleinzoon van Hinderk uit Tolbert. Erfde een trekker, een schuur en een briefje: "Rit naar Bourtange. Trijntje. Schuldig sinds 1953."', quote: 'Schuld erft.' },
  hilko: { name: 'Hilko Kremer', card: 'Rallyrijder. Heeft de snelste auto en het meeste geld van Ubbo.', step: 'O15', bio: 'Rijdt rally en trekkertrek met Ubbo\'s sponsorgeld, en deelt enveloppen uit aan baancommissarissen. Valt vaak in sloten.', quote: 'Ik heb een logo.' },
  rennie: { name: 'Rally-Rennie', card: 'Secretaris van een rallyclub zonder auto. Rijdt harder in gedachten dan jij in een auto.', step: 'O17', bio: 'Secretaris van Rallyclub De Vierde Versnelling in Niekerk. Heeft een stopwatch en pacenotes: "Links vier. Sloot. Niet kijken."', quote: 'Niet kijken.' },

// storyarc.js: MISSION_IDS (append only, after the F4a ids)
  'grens', 'donker', 'laagwater', 'schier', 'trekker', 'kanaal', 'koetsen', 'grind',

// storyarc.js: STEPS (part 'nazomer', ring 2). Order: Wadkust, then Westerkwartier; story.js offers both regions after two voorrondes (ring 2) and each region runs in the fixed order below.
  { id: 'n-zoutkamp', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 2, why: 'Ik pak de waterbus. Jij mag voorop staan en naar water kijken.',
    title: 'Met de waterbus naar Zoutkamp', goal: { type: 'waterbus', from: 'Stad', to: 'Zoutkamp', via: 'reitdiep' }   // NEW: the rondvaart boat as waterbus on the Reitdiep (plan 3.6); the first arrival may always be by boat, skippable with Spatie,
    lead: ['T', 'Oma belde. Er staat een naam bij het Wad: Sientje, Noordpolderzijl. De waterbus naar Zoutkamp vaart om negen uur, over het Reitdiep.'],
    say: ['T', 'Een bus die op het water rijdt. Dat is een boot met ambities.'],
    done: ['T', 'Zoutkamp. Kotters, een brug en een man met een schop. Het ruikt naar zout. Ik wil niet meer weg.'],
    scene: { kicker: 'Zoutkamp, de haven',
      lines: [
        ['dijkwerker', 'Moi. Ik zag jullie van Stad komen. Kijken is mijn werk. Ik werk aan de dijk. De dijk is nooit af.', { tag: 'droog, kalm, leunend op zijn schop', card: 'dijkwerker' }],
        ['T', 'Wij kennen een wegwerker. Harm. Laatste fase.', { tag: 'droog' }],
        ['dijkwerker', 'Mijn neef. Hij werkt aan een ring, ik aan een dijk. Het zit in de familie.', { tag: 'droog, trots' }],
        ['A', 'En wat meldt u?', { tag: 'nieuwsgierig' }],
        ['dijkwerker', 'Er ligt een kotter in de haven met een naam van zilver. Hij vaart nooit overdag. Ik meld alleen.', { tag: 'droog, kalm', clue: true }],
        ['T', 'Iedereen die hoog zit of bij het water, is familie.', { tag: 'droog, zacht' }],
        ['dijkwerker', 'Iedereen met een schop ook.', { tag: 'droog' }],
      ] } },
  { id: 'O11', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 2, region: 'wadkust', mission: 'grens', why: 'Ik vaar. Jij houdt Jelle in de gaten. Dat doe je toch al.',
    title: 'Jelle aan de grens', reward: 1600,
    lead: ['T', 'Jelle stuurde een bericht. "Zoutkamp, de haven. Ik ben hier voor de paling. – J." Hij typt met een uitroepteken.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Ik sta in Zoutkamp naast een kotter en ik ruik garnalen. Eerste beller.', { tag: 'warm, als nacht-dj op de radio' }],
      ['jelle', 'Moai, Rikus. Jelle. Ik sta ook in Zoutkamp. Gezellig, zo bij elkaar.', { tag: 'charmant, opgewekt, aan de telefoon op de radio' }],
      ['rikus', 'Wat doe je daar, Jelle?', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'Paling, Rikus. Alles wat glibberig en lekker is, is Fries. Wis en wrachtich.', { tag: 'zelfvoldaan, aan de telefoon op de radio' }],
      ['rikus', 'En die kotter naast mij?', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'De Zilveren Aal. Zijn naam is gelogen, Rikus. Hij is niet van zilver en hij vaart niet op aal. Hij vaart op Ubbo.', { tag: 'zacht, gepikeerd, aan de telefoon op de radio' }],
    ], 'Jelle, Ljouwert'), radio([
      ['rikus', 'Nachtstreek. Jelle belt weer in. Hij is nat.', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'Dat is statistiek, Rikus.', { tag: 'waardig, aan de telefoon op de radio' }],
      ['rikus', 'Ik zeg niks. Ik draai drie minuten Fries.', { tag: 'droog, als nacht-dj op de radio' }],
    ], 'Jelle, Zoutkamp')],
    after: [['U. Oldenhuis', 'Paling is geduldig. Ik ook. – U.O.'], ['Kiekdoar', 'Man in zwemvest springt over sluisdeur bij Zoutkamp. Slaagt voor de helft. Schipper: "Hij landde. Alleen anders."']],
  },
  { id: 'O12', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 2, region: 'wadkust', mission: 'donker', why: 'Ik ga. In het donker kan niemand mijn gezicht zien. Dat is al jaren mijn beste punt.',
    title: 'Donker genoeg', reward: 1800,
    lead: ['A', 'Jelle noemde een wadgids. Fenna. Ze weet waar de kotter \'s nachts overlaadt en ze heeft een roeiboot. Geen motor, geen lamp. Ik blijf bij de telefoon.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, vanuit het donkerste stuk van Nederland. Het is hier zo donker dat ik mijn eigen studiolamp een belediging vind.', { tag: 'warm, als nacht-dj op de radio' }],
      ['fenna', 'Rikus. Fenna, wadgids. Het is nieuwe maan. Wie hier een lamp aandoet, is een vuurtoren. Een slechte.', { tag: 'helder, rustig, aan de telefoon op de radio' }],
      ['rikus', 'En wat doe je dan?', { tag: 'droog, als nacht-dj op de radio' }],
      ['fenna', 'Omhoog kijken. De sterren zijn de lamp. Dat is de afspraak.', { tag: 'helder, rustig, aan de telefoon op de radio' }],
    ], 'Fenna, wadgids')],
    after: [['U. Oldenhuis', 'Ik slaap goed in het donker. Jullie hopelijk ook. – U.O.'], ['Kiekdoar', 'Reiger schrikt op bij het Lauwersmeer. Vogelaar: "Hij had een slechte nacht. Een Stadjer in het riet, zegt hij."']],
  },
  { id: 'O13', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 2, region: 'wadkust', mission: 'laagwater', why: 'Ik loop. Doorzetten is het enige wat ik kan.',
    title: 'Laag water', reward: 2200,
    lead: ['A', 'Fokko liep net het Wad op. Alleen, met een rugzak, bij eb. Fenna zegt dat hij iets heel doms doet.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee, in het daglicht. Ik voel me een vleermuis. Ik sta op de dijk bij Noordpolderzijl en voor me ligt het Wad, zo ver je kunt kijken.', { tag: 'warm, als nacht-dj op de radio' }],
      ['dijkwerker', 'Rikus. Dijkwerker, Noordpolderzijl. Er loopt een man het Wad op. Zonder gids. Er staat wind uit het noordwesten. Ik meld alleen.', { tag: 'droog, ernstig, aan de telefoon op de radio' }],
      ['rikus', 'Is dat erg?', { tag: 'ernstig, als nacht-dj op de radio' }],
      ['dijkwerker', 'Dan komt het water eerder. Een uur, soms anderhalf. Hij weet dat. Hij denkt dat hij sneller is.', { tag: 'droog, zacht, aan de telefoon op de radio' }],
    ], 'Dijkwerker, Noordpolderzijl'), radio([
      ['rikus', 'Nachtstreek. Een korte mededeling. Wie het Wad op gaat, gaat met een gids. Dat is geen advies. Dat is een afspraak. Goedenavond.', { tag: 'ernstig, rustig, als nacht-dj op de radio' }],
    ], 'Rikus zelf')],
    after: [['U. Oldenhuis', 'Het Wad is groot. Mijn geduld ook. – U.O.'], ['Kiekdoar', 'Drie mensen van het Wad gehaald bij Noordpolderzijl, met de traumaheli. Arts: "Het stond niet in het rooster. Nu wel." Dijkwerker: "Ik meld alleen: iedereen gaat naar huis."']],
  },
  { id: 'O14', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 2, region: 'wadkust', mission: 'schier', why: 'Ik regel de pier. Jij bakt. Jij bakt beter als ik niet kijk.',
    title: 'De boot naar Schier', reward: 3200,
    lead: ['T', 'Voorronde drie. Lauwersoog, havenfeest. Het reglement zegt: het Wad moet in de eierbal. Fenna heeft zeekraal van een kwelderboer. Fokko zit in de jury.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee, vanaf de pier in Lauwersoog. Havenfeest. Er speelt een fanfare die alleen marsen kent.', { tag: 'warm, als nacht-dj op de radio' }],
      ['ubbo', 'Rikus. Voorronde drie, Wadkust. Reglement: het Wad moet in de eierbal. Paling, bijvoorbeeld.', { tag: 'joviaal, zakelijk, aan de telefoon op de radio' }],
      ['rikus', 'Wie heeft alle paling, Ubbo?', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Het is het Wad. Dat is van iedereen. Ik heb alleen de papieren.', { tag: 'tevreden, aan de telefoon op de radio' }],
      ['rikus', 'Er zijn geen papieren.', { tag: 'droog, als nacht-dj op de radio' }],
      ['ubbo', 'Precies. Dan is het eerlijk.', { tag: 'tevreden, aan de telefoon op de radio' }],
    ], 'Ubbo, Oldenhuis Bakt'), radio([
      ['rikus', 'Nachtstreek. Jelle belt. Hij belt vanaf een eiland.', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'Mem had de doos niet open gemaakt. Ze zegt dat dat niet netjes is.', { tag: 'zacht, ontroerd, aan de telefoon op de radio' }],
      ['rikus', 'En het boek, Jelle?', { tag: 'droog, als nacht-dj op de radio' }],
      ['jelle', 'Het boek is gered. Ik ben ook gered. Door een klein, gerimpeld vrouwtje. Dat is mem.', { tag: 'waardig, aan de telefoon op de radio' }],
    ], 'Jelle, Schier')],
    after: [['U. Oldenhuis', 'Weer één. Ik tel mee. – U.O.'], ['Kiekdoar', 'Man springt vanaf pier in Lauwersoog op vertrekkende veerboot. Havenmeester: "Dat mag niet." Kapitein: "Het is vrijdag." Voorronde Wadkust gewonnen door Stadse frietwagen; jury unaniem.']],
  },
  { id: 'n-kotter', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 2, why: 'Ik ga wel kijken. Een schip dat niet vaart is het enige schip waar ik niet zeeziek van word.',
    title: 'Een kotter in Lauwersoog', goal: { type: 'filiaal', at: 'lauwersoog' }   // the kotter (safehouse, a jolly boat at the quay, the wadkaart) and the filiaal at the quay (A22),
    lead: ['A', 'Oma Sientje heeft een sleutel voor ons. Van de kotter. En Fenna wil een luik in de zijkant.'],
    say: ['A', 'Een kotter. Dan heb jij eindelijk een huis dat ook kan zinken.'],
    done: ['A', 'Filiaal: Lauwersoog. Sientje bakt alleen als het stil is. Het is bijna altijd stil.'],
    scene: { kicker: 'De kotter Trijntje, Lauwersoog',
      lines: [
        ['sientje', 'Daar is ze. ZK 53. Vierenzestig jaar. Ze vaart niet meer. Ze ligt graag.', { tag: 'oud, droog' }],
        ['T', 'Ze heet Trijntje.', { tag: 'droog' }],
        ['sientje', 'Ik heb het beloofd. In 1953. Ze leende me haar fiets voor mijn trouwdag. Ik heb hem nooit teruggebracht.', { tag: 'oud, droog, zacht' }],
        ['A', 'Oma wil hem terug.', { tag: 'zacht' }],
        ['sientje', 'Hij staat achter in het ruim. Poetsen kan ik niet meer. Jullie mogen hem rijden. Niet houden. Hij is van haar.', { tag: 'oud, droog, zacht' }],
        ['sientje', 'Ik was haar iets schuldig. Nu ben ik jullie iets schuldig. Dat is erger.', { tag: 'oud, droog' }],
        ['A', 'Het pandrecht is weg. De pagina\'s zijn van ons.', { tag: 'zacht' }],
        ['sientje', 'Papier is papier. Ik schrijf "betaald" in de kantlijn. Dan is het van mij.', { tag: 'oud, helder' }],
        ['fenna', 'Mijn oma schrijft in andermans boeken. Dat doet ze al zeventig jaar.', { tag: 'helder, geamuseerd' }],
        ['A', 'Een Fjord Frituur aan de kade. De Wad-eierbal, met zeekraal.', { tag: 'zacht, enthousiast' }],
        ['T', 'En een kotter die nooit vaart.', { tag: 'droog' }],
        ['A', 'Een basis, Tammo. Geen wagen. Een basis.', { tag: 'zacht' }],
        ['T', 'Zo begint een filiaal.', { tag: 'droog, zacht' }],
      ] } },
  { id: 'n-zuidhorn', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 2, why: 'Ik reis. Treinen zijn de enige voertuigen die nooit mijn schuld zijn.',
    title: 'Met de trein naar Zuidhorn', goal: { type: 'train', to: 'Zuidhorn', line: 'leeuwarden', cab: 'jantina' }   // the first ride may always be by train (plan 3.7); the line Groningen-Zuidhorn-Grijpskerk-Leeuwarden,
    lead: ['A', 'Oma had een naam: Hinderk, Tolbert. Hij is dood, zegt ze. Maar zijn kleinzoon heeft een trekker. De trein naar Leeuwarden stopt in Zuidhorn.'],
    say: ['A', 'Kijk. Houtwallen. Alles hier staat achter een rij bomen.'],
    done: ['A', 'Zuidhorn. Een station, een molen aan de horizon en geen haast. Ik zou hier een filiaal willen.'],
    scene: { kicker: 'Station Zuidhorn',
      lines: [
        ['molenaar', 'Moi. Ik zag jullie uit de trein komen. Hier stopt hij twee keer per uur. Ik tel ze allebei. Ik ben molenaar. De wind is mijn collega.', { tag: 'droog, kalm, stappend van zijn fiets', card: 'molenaar' }],
        ['T', 'Wij kennen een molenaar in Winsum. Fenna.', { tag: 'droog' }],
        ['molenaar', 'Mijn nicht. Zij draait met de wind. Ik draai er tegenin. Dat geeft evenwicht.', { tag: 'droog' }],
        ['A', 'En wat meldt u?', { tag: 'nieuwsgierig' }],
        ['molenaar', 'Er rijden \'s nachts drie witte vrachtwagens langs mijn molen. Zonder naam. Ze rijden niet naar Friesland. Ze rijden er langs. Ik meld alleen.', { tag: 'droog, kalm', clue: true }],
        ['T', 'Zo praat de dijkwerker ook.', { tag: 'zacht, droog tegen Tessa' }],
        ['molenaar', 'Die ken ik niet. Maar dat klinkt familie.', { tag: 'droog' }],
      ] } },
  { id: 'O15', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 2, region: 'westerkwartier', mission: 'trekker', why: 'Een trekker kan ik. Een trekker oordeelt niet.',
    title: 'Trekkertrek', reward: 2000,
    lead: ['A', 'Tinus. Kleinzoon van Hinderk. Hij heeft een trekker en geen motor, en vanmiddag is de finale trekkertrek. Hilko rijdt mee.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee, tussen de houtwallen. Ik sta op een erf. Naast me staat een trekker zonder motor. Hij kijkt me aan.', { tag: 'warm, als nacht-dj op de radio' }],
      ['tinus', 'Rikus. Tinus, Tolbert. Mijn opa is dood. Zijn trekker leeft. De motor niet.', { tag: 'gehaast, jong, aan de telefoon op de radio' }],
      ['rikus', 'Wat is er met de motor?', { tag: 'droog, zacht, als nacht-dj op de radio' }],
      ['tinus', 'Hij ligt in een emmer. In stukken. Opa zei: schroef hem maar uit elkaar, dan zie je wat er mis is. Dat heb ik gedaan.', { tag: 'stug, aan de telefoon op de radio' }],
      ['rikus', 'En de trekkertrek, Tinus?', { tag: 'droog, als nacht-dj op de radio' }],
      ['tinus', 'Zaterdag. Finale. Opa heeft me ingeschreven. In maart. Hij wist het al.', { tag: 'stil, droog, aan de telefoon op de radio' }],
    ], 'Tinus, Tolbert'), radio([
      ['rikus', 'Nachtstreek. Hilko Kremer belt in. Dat was geen verlies, zegt hij.', { tag: 'droog, als nacht-dj op de radio' }],
      ['hilko', 'Dat was een testrit, Rikus. Met een emmer.', { tag: 'luid, zelfverzekerd, aan de telefoon op de radio' }],
      ['rikus', 'Je gewicht schoof.', { tag: 'droog, als nacht-dj op de radio' }],
      ['hilko', 'Dat is een kenmerk. En vanavond rijden de vrachtwagens. Denk daar maar aan.', { tag: 'stug, aan de telefoon op de radio' }],
    ], 'Hilko, Westerkwartier')],
    after: [['U. Oldenhuis', 'Een emmer. Mooi verhaal. Ik koop verhalen. – U.O.'], ['Kiekdoar', 'Trekkertrek Niekerk: Stadjer wint met opa\'s trekker en een emmer. Loonwerker van de zwarte: "Mijn gewicht schoof." Organisatie: "Dat is nu eenmaal een kenmerk."']],
  },
  { id: 'O16', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 2, region: 'westerkwartier', mission: 'kanaal', why: 'Ik rij. Een konvooi kun je niet verstoppen. Wel volgen.',
    title: 'Over het kanaal', reward: 2200,
    lead: ['T', 'De molenaar telde drie witte vrachtwagens langs zijn molen. Henk heeft nog een zender. In het handschoenenvak van de Fjord. Hij vraagt niet waarom.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee, langs het kanaal. De schepen zijn weg. Het is stil. Dat klopt niet.', { tag: 'droog, als nacht-dj op de radio' }],
      ['molenaar', 'Rikus. Molenaar, Zuidhorn. Er rijden drie witte vrachtwagens langs mijn molen. Elke nacht. Ze rijden niet naar Friesland. Ze rijden er langs. Ik meld alleen.', { tag: 'droog, kalm, aan de telefoon op de radio' }],
      ['rikus', 'Wat is het verschil?', { tag: 'droog, als nacht-dj op de radio' }],
      ['molenaar', 'Wie naar Friesland rijdt, gaat over de brug. Zij gaan eromheen. Op de N355 staat een weegbrug. Daar willen ze niet langs.', { tag: 'droog, kalm, aan de telefoon op de radio' }],
    ], 'Molenaar, Zuidhorn')],
    after: [['U. Oldenhuis', 'Een weegbrug. Wie bedenkt zoiets. – U.O.'], ['Kiekdoar', 'Drie vrachtwagens op de weegbrug in Zuidhorn: "Op elke as te zwaar." Politie: "Dat is een prestatie." Bij de brug bij Gaarkeuken blijft een brug open voor een Fries in een bootje: "Dat is het Friese recht."']],
  },
  { id: 'O17', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 2, region: 'westerkwartier', mission: 'koetsen', why: 'Ik pak de teugels. Een koets is een auto met een mening.',
    title: 'Koetsen kijken', reward: 2400,
    lead: ['T', 'Rennie belde. Hilko heeft zijn rallyauto verstopt. In een museum, in het park van Nienoord. Er zitten enveloppen in de portieren, zegt ze. Voor de baancommissarissen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee, in een park in Leek. Er staat een kasteel, een vijver en een museum met koetsen. Ik voel me een vleermuis in een prentenboek.', { tag: 'warm, als nacht-dj op de radio' }],
      ['rennie', 'Rikus. Rennie, Rallyclub De Vierde Versnelling. Hilko Kremer heeft de baancommissarissen een envelop beloofd. Alle drie. Het zijn mijn collega\'s. Ik weet niet wie ik nog kan vertrouwen.', { tag: 'kordaat, snel, aan de telefoon op de radio', card: 'rennie' }],
      ['rikus', 'En de auto?', { tag: 'droog, als nacht-dj op de radio' }],
      ['rennie', 'Hij staat in een museum. Hilko denkt dat niemand in een museum zoekt. Dat is zijn eerste fout. De tweede is een koets.', { tag: 'kordaat, kil, aan de telefoon op de radio' }],
    ], 'Rally-Rennie, Rallyclub')],
    after: [['U. Oldenhuis', 'Een koets. Geef toe, dat is Gronings. – U.O.'], ['Kiekdoar', 'Rallyauto in slotgracht bij Nienoord. Koetsier: "Ik heb hem niet geraakt." Zwaan: geen commentaar.']],
  },
  { id: 'O18', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 2, region: 'westerkwartier', mission: 'grind', why: 'Ik rij. Jij bakt. Een rallyauto met een friteuse. Wat kan er misgaan?',
    title: 'Grind', reward: 3400,
    lead: ['T', 'Voorronde vier. Zuidhorn. Het reglement van Ubbo: een rollende keuken. De eierbal wordt gebakken tijdens het rijden. De jury zit op de finish. Tinus\' oom leent zijn rallyauto, met een friteuse op de achterbank.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, live van het startterrein in Zuidhorn. Er staan auto\'s met nummers en een kraam met een luik. Dat is nieuw voor me.', { tag: 'warm, als nacht-dj op de radio' }],
      ['rennie', 'Rikus. Rennie, Rallyclub De Vierde Versnelling. Ik ben secretaris. De club heeft geen auto. Ik heb wel een stopwatch.', { tag: 'kordaat, snel, aan de telefoon op de radio', card: 'rennie' }],
      ['rikus', 'Wat is het reglement van vandaag, Rennie?', { tag: 'droog, als nacht-dj op de radio' }],
      ['rennie', 'De eierbal wordt onderweg gebakken. Eén bijrijder bakt. Eén bestuurder rijdt. Wie het eerst finisht met minstens dertig van de veertig eierballen heel, wint. Opgesteld door de sponsor.', { tag: 'kordaat, droog, leest voor, aan de telefoon op de radio' }],
      ['rikus', 'Wie is de sponsor?', { tag: 'droog, als nacht-dj op de radio' }],
      ['rennie', 'Dat vraag ik me ook af. Ik ken alleen zijn initialen. U.O.', { tag: 'kordaat, kil, aan de telefoon op de radio' }],
    ], 'Rally-Rennie, Rallyclub')],
    after: [['U. Oldenhuis', 'Weer één. Ik tel nog steeds. – U.O.'], ['Kiekdoar', 'Rally Zuidhorn: bijrijder bakt eierballen op de achterbank. Winnaar: de Stadse frietwagen, 31 van 40 heel. Baancommissaris: "Wij hebben niks aangenomen. Wij hebben het alleen niet teruggebracht."']],
  },
  { id: 'n-schuur', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 2, why: 'Ik ga kijken. Een schuur is een garage met een ziel.',
    title: 'Een schuur bij Leek', goal: { type: 'filiaal', at: 'leek' }   // the schuur (safehouse, garage for three, a spot for an owned tractor) and the filiaal in the barn wall (A22),
    lead: ['A', 'Tinus zegt: de schuur van opa is van ons, zolang we willen. En zijn tante wil een luik in de zijmuur.'],
    say: ['A', 'Plek voor drie auto\'s. Jij hebt er één.'],
    done: ['A', 'Een schuur in Leek. Een luik in de muur. Tinus zegt dat het naar koeien ruikt. Het ruikt naar haver.'],
    scene: { kicker: 'De schuur van opa, Leek',
      lines: [
        ['tinus', 'Hier. De schuur van opa. Hij is van mij nu. Hij is van jullie, zolang jullie willen.', { tag: 'droog, trots' }],
        ['T', 'Er staat een trekker in.', { tag: 'droog' }],
        ['tinus', 'Die is van opa. Hij blijft van opa. Maar hij mag in de schuur.', { tag: 'stug, zacht' }],
        ['A', 'Plek voor drie auto\'s. En een luik in de zijmuur. Een Fjord Frituur in Leek.', { tag: 'enthousiast' }],
        ['tinus', 'Mijn tante bakt. Ze heeft een eigen recept. De Westerkwartier-eierbal, met een korst van haver.', { tag: 'droog' }],
        ['A', 'Vier regio\'s. Vier plekken. Dit gaat harder dan ik dacht.', { tag: 'zacht' }],
        ['T', 'Dat dacht ik ook.', { tag: 'droog, zacht' }],
        ['A', 'Jij zei niks.', { tag: 'zacht' }],
        ['T', 'Ik zei: dat dacht ik ook. Dat is veel, voor mij.', { tag: 'droog' }],
      ] } },

// storyarc.js: CLUES
  { step: 'O11', kind: 'clue', title: 'De Zilveren Aal', text: 'Fokko de Visser vaart in een kotter vol paling zonder papieren: achthonderd kilo, ontvanger O.B. Rokerij. Jelle is hier uit wraak: Ubbo kocht Mems bakkerij in Ljouwert. "Foar mem."' },
  { step: 'O11', kind: 'clue', title: 'Zeven delen', text: 'Fokko bewaart het Wadkust-deel van Ubbo\'s grootboek op zijn kotter: wie wat schuldig is, aan wie. Er zijn er zeven, één per regio.' },
  { step: 'O11', kind: 'clue', title: 'Fenna', text: 'Jelle: zoek Fenna, de wadgids. Ze kent het Wad en ze kent Fokko. Oma wil haar fiets terug. Uit 1953.' },
  { step: 'O12', kind: 'clue', title: 'Deel drie: Wadkust', text: 'Fokko bewaart het Wadkust-deel van Ubbo\'s grootboek op de wal bij het Lauwersmeer. Visser Dolf: 28.000. Visser Hendrik: 11.000. Een kotter, ZK 53, "Trijntje": verpand voor 18.400. De vissers staan bij Ubbo in het krijt.' },
  { step: 'O12', kind: 'hart', title: 'De kotter Trijntje', text: 'Fenna\'s oma Sientje noemde in 1953 haar eerste schip naar de vriendin die haar een fiets leende. De fiets staat nog in de schuur, onder een zeil. Zeventig jaar. "Ze durft hem niet terug te brengen."' },
  { step: 'O13', kind: 'clue', title: 'Fokko op het Wad', text: 'Fokko liep bij eb het Wad op, richting de Simonszand, met het grootboek-deel in zijn rugzak. Het Wad was hem te snel af. Tammo gaf het boek terug: "Eerst het leven. Dan het boek." Morgen jureert Fokko in Lauwersoog.' },
  { step: 'O13', kind: 'hart', title: 'Drie regels van het Wad', text: 'Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen. Fenna: "Ik ga niet achter iemand aan op het Wad. Ik ga naar iemand toe."' },
  { step: 'O14', kind: 'clue', title: 'Het boek op Schier', text: 'Fokko stuurde het Wadkust-deel van Ubbo\'s grootboek met de laatste boot naar het eiland, in een kist met O.B. Tessa sprong er achteraan. Mem Terpstra stond op de kade. Op de pier las Visser Dolf zijn eigen schuld: achtentwintigduizend, met zijn handtekening.' },
  { step: 'O14', kind: 'clue', title: 'Voorronde Wadkust', text: 'Gewonnen in Lauwersoog. Oma Sientje jureerde als voorzitter: "Valt mie nait of." Fokko stond op en ging. "Ik ga naar het Wad. Mijn vader heeft nog een plek."' },
  { step: 'O14', kind: 'hart', title: 'Mem op Schier', text: 'Mem Terpstra woont sinds juni bij haar zus op het eiland. Haar bakkerij in Ljouwert is nu een gele gevel. Ze bakt alleen koekjes, voor zichzelf. "Het deeg blijft. Dat zit in mijn handen."' },
  { step: 'O15', kind: 'hart', title: 'De Grijze', text: 'Hinderks grijze trekker, met een motor die in een emmer lag. Tinus startte hem op zijn opa. Een koektrommel met een briefje: "Rit naar Bourtange. Trijntje. Schuldig sinds 1953."' },
  { step: 'O15', kind: 'clue', title: 'Hilko Kremer', text: 'Rallyrijder met een zwarte monstertrekker, een logo en het geld van Ubbo. Zijn ballast "schoof". Hij zegt: vanavond rijden de vrachtwagens. De molenaar telt er drie, elke nacht.' },
  { step: 'O15', kind: 'clue', title: 'Tinus\' oom', text: 'Tinus\' oom heeft een rallyauto en een slechte rug. Hij leent hem uit, voor het geval we hem nodig hebben.' },
  { step: 'O16', kind: 'clue', title: 'Drie witte trucks', text: 'Ubbo\'s vettrucks rijden \'s nachts via Friesland om de weegbrug op de N355 heen: ze zijn op elke as te zwaar. Een brug bleef open voor een Fries in een bootje; de trucks moesten terug en werden gewogen. Truck drie draagt Henks tweede zender.' },
  { step: 'O16', kind: 'clue', title: 'Het koelhuis in Kollum', text: 'Durk vertelde zijn neven waar het vet heen gaat: een koelhuis bij Kollum, aan het kanaal. "De baas zegt." Het ligt in Friesland; Jelle weet de weg.' },
  { step: 'O17', kind: 'clue', title: 'Drie enveloppen in de portieren', text: 'Hilko Kremer verstopte zijn rallyauto in het Rijtuigenhuis bij Nienoord. In de portieren: drie enveloppen voor de baancommissarissen van de rally in Zuidhorn, met een naam, een bedrag en een handtekening. De auto ligt nu in de slotgracht.' },
  { step: 'O17', kind: 'clue', title: 'Rally-Rennie', text: 'Rennie, secretaris van Rallyclub De Vierde Versnelling (zonder auto), belde Rikus: Hilko heeft alle drie de baancommissarissen een envelop beloofd. "Ik weet niet wie ik nog kan vertrouwen."' },
  { step: 'O18', kind: 'clue', title: 'Voorronde Westerkwartier', text: 'Gewonnen in Zuidhorn, in een rallyauto met een friteuse op de achterbank: eenendertig van veertig eierballen heel. De drie baancommissarissen hadden elk een envelop gekregen en niet teruggebracht. Hilko: "…Goud."' },
  { step: 'O18', kind: 'hart', title: 'De club zonder auto', text: 'Rennie heeft een rallyclub met een stopwatch en zonder auto. Ze zegt: "Wij zijn niet jaloers. Een beetje."' },
  { step: 'Z25', kind: 'hart', title: 'Rottumeroog, gezien vanaf zee', text: 'Een eiland waar niemand komt. Wij zetten geen voet aan wal. Dat is de enige manier om er te zijn.' },
  { step: 'Z24', kind: 'clue', title: 'Tweehonderdveertien', text: 'Zeehonden op een plaat, op afstand geteld voor het Zeehondenhuis. Ze bleven liggen.' },
  { step: 'Z23', kind: 'hart', title: 'Drie regels van Fenna', text: 'De gids bepaalt. Je kijkt naar het water, niet naar je voeten. Je loopt nooit alleen.' },

// storyarc.js: the closing card of ring 2 (after the second F4b voorronde); PARTS.nazomer.card is replaced when F4c exists
  card: [['Anita', 'Vier voorrondes. Nog drie.'], ['Tammo', 'Ubbo heeft vier snackbars minder. Dat is ook een manier om te tellen.']],
```

### B. missionstory.js

```js
// missionstory.js: NPC looks (placeholders in the existing shape; storycast.js gets the real looks)
  fenna: { name: 'Wadgids Fenna', shirt: 0x2f6f8a, skin: SKIN.woodLight, variant: 'female', seed: 4201, hairStyle: 'ponytail', look: { top: 'jacket' } },
  fokko: { name: 'Fokko de Visser', shirt: 0x3a4a5a, skin: SKIN.woodMid, variant: 'male', seed: 4202, look: { build: 'heavy', hat: 'cap' } },
  dijkwerker: { name: 'Dijkwerker', shirt: 0x8f8a4a, skin: SKIN.woodLight, variant: 'male', seed: 4203, look: { age: 'old', top: 'overall' } },
  sientje: { name: 'Oma Sientje', shirt: 0x6a3f5a, skin: SKIN.woodLight, variant: 'female', seed: 4204, hairStyle: 'bun', look: { age: 'old' } },
  molenaar: { name: 'Molenaar', shirt: 0x6a8f5a, skin: SKIN.woodLight, variant: 'male', seed: 4205, look: { age: 'old', hat: 'cap' } },
  tinus: { name: 'Tinus', shirt: 0x5a5a6a, skin: SKIN.woodLight, variant: 'male', seed: 4206, look: { top: 'overall' } },
  hilko: { name: 'Hilko Kremer', shirt: 0x1a1a1a, skin: SKIN.woodMid, variant: 'male', seed: 4207, look: { top: 'jacket', build: 'heavy' } },
  rennie: { name: 'Rally-Rennie', shirt: 0xc0702a, skin: SKIN.woodLight, variant: 'female', seed: 4208, hairStyle: 'bob' },
  sybren: { name: 'Kapitein Sybren', shirt: 0x1a2a4a, skin: SKIN.woodLight, variant: 'male', seed: 4209, look: { age: 'old', hat: 'cap' } },
  koetsier: { name: 'Koetsier Wiegert', shirt: 0x7a1f2a, skin: SKIN.woodLight, variant: 'male', seed: 4210, look: { age: 'old', top: 'jacket' } },
  siemen: { name: 'Neef Siemen', shirt: 0x3a6a2a, skin: SKIN.woodLight, variant: 'male', seed: 4211 },
  wessel: { name: 'Wessel', shirt: 0x4a3a2a, skin: SKIN.woodLight, variant: 'male', seed: 4212 },

// missionstory.js: STORY entries, appended in MISSION_IDS order. N = the entry's npc. tag is extra (TTS delivery), missionstory ignores it.
  {
    // O11 Jelle aan de grens
    npc: 'jelle', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Grinzers! Moai dat jullie er zijn. Jullie zijn te laat. Ik ben altijd te vroeg. Dat is Fries.', { tag: 'charmant, opgewekt, in een zwemvest', cam: 'orbit' }],
      ['T', 'Waarom heb je een zwemvest aan?', { tag: 'droog' }],
      ['N', 'Voorzorg. Ik val vaak. Dat is geen schande, dat is statistiek.', { tag: 'plechtig' }],
      ['A', 'Wat doe je in Zoutkamp, Jelle?', { tag: 'scherp' }],
      ['N', 'Mem had een bakkerij in Ljouwert. Zevenenveertig jaar. Elke zaterdag gaf ze een brood weg aan wie geen geld had.', { tag: 'zacht, gekrenkt' }],
      ['N', 'In juni kocht Ubbo hem op. Nu is het Oldenhuis Bakt nummer zeventien. Gele gevel. Het brood is voorgebakken.', { tag: 'zacht, gekrenkt', cam: 'close' }],
      ['T', 'Dat is erg.', { tag: 'droog, zacht' }],
      ['N', 'Daarom: paling. Alle paling van het Wad gaat bij Fokko de Visser de kotter in. Fokko vaart hem naar Ubbo\'s rokerij. Zonder papieren. Foar mem.', { tag: 'gepikeerd, dan opgewekt' }],
      ['fokko', 'Moi, Jelle. Je staat op mijn kade.', { tag: 'rauw, vriendelijk dreigend, vanaf het dek van de kotter', card: 'fokko' }],
      ['N', 'Openbare kade, Fokko. Zeg ik als bezoeker.', { tag: 'opgewekt' }],
      ['fokko', 'Openbaar is een woord voor mensen die zelf geen kade hebben.', { tag: 'rauw, kalm' }],
      ['A', 'Wij hebben een luik. Dat is ook een soort kade.', { tag: 'koel' }],
      ['N', 'Race. Wie het eerst bij de sluis van Lauwersoog is, mag de laadbon van de Aal fotograferen. Dat ben ik.', { tag: 'plechtig' }],
      ['T', 'Hij valt in het water voor het bord. Dat zegt de statistiek.', { tag: 'droog' }],
      ['A', 'Jelle. Je weet dat ik win.', { tag: 'strijdlustig' }],
      ['N', 'Jij wint. Ik val. Zo gaat het altijd.', { tag: 'zelfverzekerd' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Ik kwam als tweede. Als je telt wie er nat is, win ik.', { tag: 'druipend, waardig' }],
      ['A', 'Je hebt een sluisdeur gekust.', { tag: 'geamuseerd' }],
      ['N', 'Een Friese polsstokspringer valt nooit. Hij landt anders dan gepland.', { tag: 'waardig, zacht' }],
      ['T', 'Je landde in de sluis.', { tag: 'droog' }],
      ['N', 'Anders dan gepland.', { tag: 'plechtig' }],
      ['N', 'Fokko bewaart het Wadkust-deel van Ubbo\'s boeken op zijn kotter. Daar staat in wie wat schuldig is. Aan wie. Alle vissers.', { tag: 'ernstig, zacht' }],
      ['A', 'Een grootboek.', { tag: 'scherp' }],
      ['N', 'Eén deel. Er zijn er zeven. Eén per regio. Zeven delen, zeven schulden, zeven handtekeningen. Ubbo schrijft alles op. Dat is zijn fout.', { tag: 'zacht', clue: true }],
      ['N', 'Zoek Fenna. Wadgids. Ze kent het Wad en ze kent Fokko. Ze heeft mij ooit van een zandplaat gehaald. Dat heb ik nooit gezegd.', { tag: 'opgewekt' }],
      ['T', 'Je hebt het net gezegd.', { tag: 'droog' }],
      ['N', 'Net fertelle.', { tag: 'plechtig' }],
      ['A', 'Oma. Ja. We staan op de pier.', { tag: 'zacht, neemt op' }],
      ['trijntje', 'Sientje woonde aan de dijk in Noordpolderzijl. Haar kleindochter loopt nu over het Wad. Zeg dat ze weet wie ik ben.', { tag: 'stellig, oud, aan de telefoon' }],
      ['T', 'Dat weet iedereen, oma.', { tag: 'droog, aan de telefoon' }],
      ['trijntje', 'Zeg haar ook dat ik mijn fiets terug wil. Uit 1953.', { tag: 'droog, aan de telefoon' }],
      ['A', 'Welke fiets?', { tag: 'verbaasd, zacht' }],
      ['trijntje', 'Dat vraagt ze maar aan haar oma. Ik ben Gronings. Ik vergeet niks.', { tag: 'stellig, aan de telefoon' }],
    ],
    replay: [
      ['N', 'Weer racen? Ik heb een zwemvest met een tweede zwemvest erin.', { tag: 'opgewekt' }],
    ],
    fail: [
      ['A', 'De Aal is weg. Door de sluis.', { tag: 'ontdaan' }],
      ['T', 'Met paling zonder papieren.', { tag: 'droog' }],
      ['A', 'En Jelle?', { tag: 'zuchtend' }],
      ['T', 'Die drijft.', { tag: 'droog' }],
    ],
  },
  {
    // O12 Donker genoeg
    npc: 'fenna', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Telefoon op nachtstand. Geen zaklamp. Geen scherm. Alleen jij en de sterren.', { tag: 'helder, fluisterend', card: 'fenna' }],
      ['T', 'Ik zie niks.', { tag: 'droog, fluisterend' }],
      ['N', 'Dat zie je goed. Over een kwartier zie je alles.', { tag: 'helder, rustig' }],
      ['T', 'Jij bent Fenna. Van Jelle.', { tag: 'droog, fluisterend' }],
      ['N', 'Jelle is van Jelle. Ik ben van mijn oma. Maar hij heeft me wel eens gebeld. Met een zandplaat in zijn broek.', { tag: 'droog, zacht' }],
      ['T', 'En de naam Fenna? Ik ken een molenaar die zo heet.', { tag: 'droog, fluisterend' }],
      ['N', 'Mijn tante. Wij heten hier allemaal Fenna. Er is een tekort aan namen.', { tag: 'helder, zacht, geamuseerd' }],
      ['N', 'Zo. Jij roeit. Ik wijs. Als je me hoort ademen, ga je te snel.', { tag: 'helder, rustig' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Pandrecht. Op de kotter van mijn opa. De kotter heet Trijntje.', { tag: 'zacht, helder' }],
      ['T', 'Trijntje?', { tag: 'stil, verbaasd' }],
      ['N', 'Mijn oma beloofde in 1953 haar eerste schip naar een vriendin te noemen. Dat was een vriendin die haar fiets leende.', { tag: 'zacht, met een glimlach' }],
      ['T', 'De fiets die Oma terugwil.', { tag: 'droog, zacht' }],
      ['N', 'Die staat in onze schuur. Onder een zeil. Ze durft hem niet terug te brengen. Dan moet ze zeggen waarom het zeventig jaar duurde.', { tag: 'droog, helder' }],
      ['T', 'Gronings.', { tag: 'droog' }],
      ['N', 'Fokko heeft het deel. Fokko heeft het Wad. Ik laat mijn oma niet van een boek afhangen.', { tag: 'helder, vastberaden' }],
      ['T', 'Wij ook niet.', { tag: 'zacht, vastberaden' }],
    ],
    replay: [
      ['N', 'Weer donker? Mooi. Dan heb ik de Dijk van de Nacht nog een keer.', { tag: 'helder, fluisterend' }],
    ],
    fail: [
      ['T', 'Een lamp op de dijk. En ik ben heel zichtbaar.', { tag: 'droog, buiten adem' }],
      ['fenna', 'Het is niet erg. Morgen is het ook donker.', { tag: 'zacht, droog' }],
    ],
  },
  {
    // O13 Laag water
    npc: 'fenna', outroPose: 'hips', ask: 0,
    intro: [
      ['dijkwerker', 'Hij is een uur geleden gegaan. Rugzak, een kar met een motor. Hij loopt naar de Simonszand.', { tag: 'droog, ernstig, op de dijk' }],
      ['N', 'Fokko kent het Wad. Dat is het probleem. Het Wad heeft in de laatste storm een nieuw gat gemaakt. Hij loopt in het oude.', { tag: 'helder, ernstig' }],
      ['A', 'Gaat u erachteraan?', { tag: 'gespannen, aan de telefoon' }],
      ['N', 'Ik ga niet achter iemand aan op het Wad. Ik ga naar iemand toe. Dat is iets anders.', { tag: 'helder' }],
      ['T', 'Wat is het verschil?', { tag: 'droog' }],
      ['N', 'Achter iemand aan haast je. Naar iemand toe kijk je.', { tag: 'helder, kort' }],
      ['N', 'Drie regels. Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen.', { tag: 'streng, vriendelijk' }],
      ['T', 'Ik ben nooit alleen. Ik loop altijd met Tessa.', { tag: 'droog' }],
      ['N', 'Tessa is er niet. Je hebt mij. Ik ben strenger.', { tag: 'helder' }],
      ['A', 'Ik blijf op de dijk. Ik hoor alles. Loop, Tammo.', { tag: 'zacht, aan de telefoon' }],
      ['N', 'Laarzen. Geen schoenen. Schoenen blijven in de klei.', { tag: 'helder' }],
    ],
    outro: [
      ['fokko', 'Ik dank jullie niet.', { tag: 'rauw, stil' }],
      ['N', 'Dat hoeft ook niet. Ik doe het voor het Wad. Niet voor jou.', { tag: 'helder, kalm' }],
      ['fokko', 'Zoals mijn vader. Hij zei dat ook. Hij is er een keer niet teruggekomen.', { tag: 'stil, rauw' }],
      ['N', '…Dat wist ik niet.', { tag: 'zacht, stil' }],
      ['fokko', 'Niemand weet het. Daarom loop ik. Elke dag. Tot ik de weg ken.', { tag: 'rauw, kort' }],
      ['A', 'Tammo. Het boek zit in zijn rugzak. Jij had hem.', { tag: 'gespannen, zacht, tegen Tammo' }],
      ['T', 'Ik weet het. Hij zat net bijna onder de klei. Eén ding tegelijk. Eerst het leven.', { tag: 'zacht, droog' }],
      ['A', 'Dan het boek.', { tag: 'zacht' }],
      ['fokko', 'Dat is van Ubbo. En Ubbo bijt.', { tag: 'rauw, kort' }],
      ['N', 'Ubbo\'s tanden zijn niet van hier.', { tag: 'koel' }],
      ['fokko', '…Ik jureer morgen. Op de pier in Lauwersoog. Ubbo zei: een man van de streek.', { tag: 'rauw, kort' }],
      ['T', 'Ik wil niet dat je overal naartoe loopt.', { tag: 'zacht, tegen Tessa' }],
      ['A', 'Ik wil niet dat jij nergens naartoe gaat.', { tag: 'zacht' }],
      ['T', 'Dat is geen ruzie.', { tag: 'zacht, droog' }],
      ['A', 'Nee. Dat is een lijstje.', { tag: 'zacht' }],
    ],
    replay: [
      ['N', 'Weer het Wad? Dan bepaal ik. Dat weet je.', { tag: 'helder' }],
    ],
    fail: [
      ['fenna', 'Het water wint altijd. Daarom lopen we er niet tegenin. Opnieuw, en eerder.', { tag: 'helder, kalm' }],
      ['T', 'Sorry. Ik keek naar mijn voeten.', { tag: 'droog, zacht' }],
      ['fenna', 'Dat was regel twee. Dat doet iedereen. Eén keer.', { tag: 'helder' }],
    ],
  },
  {
    // O14 De boot naar Schier
    npc: 'sientje', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Ik zit in het midden. Ik ben achtentachtig. Ik jureer nu. Niemand durft iets te zeggen.', { tag: 'oud, helder, droog', card: 'sientje' }],
      ['A', 'Dag mevrouw Sientje. Wij zijn de Fjord Frituur.', { tag: 'strijdlustig, bij de kraam' }],
      ['N', 'Ik weet het. Jullie eierbal heeft zeekraal. Mijn kleindochter heeft het geplukt. Bij de kwelderboer. Niet in de kwelder.', { tag: 'droog' }],
      ['fokko', 'Ik zit hier als iemand van de visserij. Dat zegt mijn naamkaartje.', { tag: 'rauw, vriendelijk dreigend, aan de jurytafel' }],
      ['T', 'Het naamkaartje zegt niet wie het betaald heeft.', { tag: 'droog, bij de pan' }],
      ['visser', 'Dolf. Visser. Ik zeg weinig. Dat komt door de schuld.', { tag: 'droog, zwaar' }],
      ['visser', 'Hendrik. Dat is mijn schuld ook.', { tag: 'zacht, zwaar' }],
      ['N', 'Hier wordt niet gepraat over schulden. Hier wordt geproefd.', { tag: 'oud, droog, kijkt naar Fokko' }],
      ['A', 'Hij kijkt de hele tijd naar de kar. Ik ook.', { tag: 'scherp, zacht, tegen Tammo' }],
    ],
    outroNpc: true,
    outro: [
      ['A', 'Excuses voor de vertraging. Ik was even op Schier.', { tag: 'buiten adem, vastberaden' }],
      ['N', 'Dat is niet nodig. Hier. Eerst proeven. De rest is voor straks.', { tag: 'oud, droog' }],
      ['visser', 'Dolf. Achtentwintigduizend. Dat staat hier. Met mijn handtekening.', { tag: 'zwaar, openend het boek' }],
      ['visser', 'Hendrik. Elfduizend. Met de mijne.', { tag: 'zacht, zwaar' }],
      ['fokko', 'Dat is niet voor jullie.', { tag: 'rauw, kort' }],
      ['N', 'Mijn naam staat er ook in, Fokko. Ik mag hem lezen.', { tag: 'oud, helder, streng' }],
      ['N', '…Valt mie nait of.', { tag: 'oud, helder', clue: true }],
      ['visser', 'Goud.', { tag: 'zwaar, proevend' }],
      ['visser', 'Goud.', { tag: 'zacht, zwaar' }],
      ['fokko', '…Ik jureer niet meer. Ik ga naar het Wad. Mijn vader heeft nog een plek.', { tag: 'rauw, stil, staat op' }],
      ['N', 'De voorronde Wadkust gaat naar de Fjord Frituur. Ik meld alleen.', { tag: 'oud, helder, plechtig' }],
      ['T', 'Hoe weet u dat u mag melden?', { tag: 'droog, zacht' }],
      ['N', 'Dat is mijn nicht. Zij werkt aan een dijk.', { tag: 'oud, droog' }],
    ],
    replay: [
      ['N', 'Weer de voorronde? Ik heb nog tijd. Ik ben achtentachtig.', { tag: 'oud, droog' }],
    ],
    fail: [
      ['A', 'De boot is weg. Zonder mij.', { tag: 'ontdaan' }],
      ['T', 'Met de kist. En met de loopplank.', { tag: 'droog' }],
      ['A', 'Ik had een tel langer moeten wachten.', { tag: 'zuchtend' }],
      ['T', 'Op niks?', { tag: 'droog' }],
      ['A', 'Nee. Op de sprong.', { tag: 'zacht' }],
    ],
  },
  {
    // O15 Trekkertrek
    npc: 'tinus', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Moi. Jij bent die Stadjer van de radio. Ik heb een trekker en geen motor. De motor zit in die emmer.', { tag: 'stug, jong, droog', card: 'tinus' }],
      ['T', 'Ik zie de emmer. Ik zie geen motor.', { tag: 'droog' }],
      ['N', 'Mijn opa zei: Tinus, schroef hem maar uit elkaar. Dan zie je wat er mis is. Hij overleed in april. Ik heb hem uit elkaar geschroefd. Nu zie ik niks.', { tag: 'stil, droog' }],
      ['T', 'Dat is ook een manier om verdriet te hebben.', { tag: 'zacht, droog' }],
      ['N', 'Ik ben ingeschreven voor de finale. Vanmiddag. Opa heeft me ingeschreven. Hij wist het al.', { tag: 'stug' }],
      ['A', 'Wie rijdt er nog meer mee?', { tag: 'warm, aan de telefoon' }],
      ['N', 'Hilko Kremer. Rallyrijder. Hij heeft sinds mei een trekker. Hij heeft een sponsor en een logo. Hij is groot en zwart.', { tag: 'stug, droog' }],
      ['T', 'Wij hebben een emmer.', { tag: 'droog' }],
      ['N', 'Ik heb drie plekken. Een sloper bij Zuidhorn: een blok. Een vriend van Henk in Leek: een turbo. Boer Evert: gewichten.', { tag: 'droog' }],
      ['T', 'Henk. Natuurlijk.', { tag: 'droog' }],
      ['N', 'Hij belde gisteren. Hij zei: ik vraag niet waarom. Dat was alles. Ik vond het heel veel.', { tag: 'stug, zacht' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Opa kreeg nooit een beker. Hij kreeg een stukje vlees van de slager.', { tag: 'stil, droog' }],
      ['T', 'Dat is ook een beker.', { tag: 'zacht' }],
      ['N', 'In zijn koektrommel zat een briefje. Ik vond het gisteren. "Rit naar Bourtange. Trijntje. Schuldig sinds 1953."', { tag: 'stil' }],
      ['A', 'Hij schreef het op.', { tag: 'zacht, aan de telefoon' }],
      ['N', 'Hij kon niet meer rijden. Ik wel. Schuld erft. Dat zegt jullie oma toch?', { tag: 'stug, zacht' }],
      ['T', 'Dat zegt ze. Ze heeft gelijk. Dat zeg ik niet vaak.', { tag: 'droog, ontroerd' }],
      ['N', 'Mijn oom heeft een rallyauto. Zijn rug doet het niet meer. Hij leent hem. Voor het geval jullie hem nodig hebben.', { tag: 'stug, droog' }],
      ['N', 'En jullie mogen de trekker lenen. Niet houden. Hij is van opa. Hij blijft van opa.', { tag: 'stil' }],
      ['trijntje', 'Hinderk. Vijf uur in de regen heb ik gelopen. Ik werd tweede. Dat is zijn schuld.', { tag: 'stellig, oud, aan de telefoon' }],
      ['T', 'Dat is niet de schuld van de jury van Oldenhuis, oma?', { tag: 'droog, aan de telefoon' }],
      ['trijntje', 'Dat ook. Maar eerst Hinderk. Eén ding tegelijk. Rij me nog eens naar Bourtange, jong. Op die trekker. Als het zover is.', { tag: 'droog, aan de telefoon' }],
    ],
    replay: [
      ['N', 'Weer trekken? De emmer is leeg. Dat is een goed teken.', { tag: 'stug, droog' }],
    ],
    fail: [
      ['tinus', 'Hij slaat af. Zoals opa. Altijd net voor het einde.', { tag: 'stil' }],
      ['T', 'Dan is hij tenminste op tijd. Opnieuw.', { tag: 'droog, zacht' }],
    ],
  },
  {
    // O16 Over het kanaal
    npc: 'molenaar', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Ze komen om half elf. Ik heb een stopwatch en een kijker. Ik meld alleen als ze er zijn.', { tag: 'droog, kalm, bij de molen' }],
      ['A', 'Wat zit er in?', { tag: 'zakelijk' }],
      ['N', 'Vet. Geen idee van wie. Maar het ruikt naar Ubbo. En aan de zijkant staat een O en een B. Dat is geen toeval.', { tag: 'droog' }],
      ['T', 'Waarom nemen ze niet de N355?', { tag: 'droog' }],
      ['N', 'Daar staat een weegbrug. Ze zijn te zwaar. Op elke as. Dus gaan ze via Friesland. Over het kanaal, om de weegbrug heen.', { tag: 'droog, kalm' }],
      ['A', 'Dan zorgen we dat de weegbrug naar hen toe komt.', { tag: 'strijdlustig' }],
      ['N', 'Dat is ook een manier. Ik meld alleen.', { tag: 'droog' }],
    ],
    outro: [
      ['T', 'Elke as te zwaar. Dat is zijn grootste fout.', { tag: 'droog, aan de motorkap' }],
      ['A', 'Niet de enige. Kijk. De zender beweegt. Truck drie gaat straks naar Kollum, als hij gewogen is. Een koelhuis. In Friesland.', { tag: 'tevreden' }],
      ['T', 'Dat is buiten ons gebied.', { tag: 'droog' }],
      ['A', 'Daarom hebben we Jelle. Hij woont er.', { tag: 'scherp' }],
      ['T', 'Hij woont in een zwemvest.', { tag: 'droog' }],
      ['N', 'Ik zag het van mijn molen. Het was een mooie nacht. Ik meld alleen: ik ga slapen.', { tag: 'droog, kalm, aan de telefoon' }],
    ],
    replay: [
      ['N', 'Weer een konvooi? Ik tel mee. Ik heb de tijd.', { tag: 'droog, kalm' }],
    ],
    fail: [
      ['T', 'Ze zagen ons. In de spiegel. Het is een brede spiegel.', { tag: 'droog' }],
      ['A', 'Het is een vrachtwagen, Tammo. Alles aan hem is breed.', { tag: 'koel' }],
    ],
  },
  {
    // O17 Koetsen kijken
    npc: 'koetsier', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Dames en heren, welkom in het Rijtuigenhuis. Veertig koetsen. Eén brandspuit. Nul auto\'s.', { tag: 'trots, plechtig, in livrei' }],
      ['A', 'Daar. Onder die kap. Dat is geen koets. Dat is een rallyauto met een gordijn.', { tag: 'scherp, fluisterend' }],
      ['N', 'Dat is een landauer uit negentienhonderd!', { tag: 'verontwaardigd' }],
      ['A', 'Hij heeft vier velgen en een uitlaat.', { tag: 'droog' }],
      ['N', '…Dat klopt. Hij is gisteren gebracht. Door een man die zei dat het een bruikleen was.', { tag: 'beteuterd' }],
      ['A', 'Dat was Hilko.', { tag: 'scherp' }],
      ['T', 'Kijk in de portieren. Rennie zei: drie.', { tag: 'droog, aan de telefoon' }],
      ['hilko', 'Wat doe jij hier?! Dit is een museum!', { tag: 'luid, geschrokken, achter een koets vandaan' }],
      ['A', 'Dit is jouw auto. Met enveloppen in de portieren.', { tag: 'koel' }],
      ['hilko', 'Dat is mijn bagage!', { tag: 'woedend, instappend' }],
      ['N', 'Hij start de motor in een museum!', { tag: 'ontzet' }],
      ['A', 'Meneer Wiegert. Jan en Alleman. Nu.', { tag: 'strijdlustig' }],
      ['N', 'Het is een koets. Hij heeft geen rem. Hij heeft een mening.', { tag: 'trots, dan beteuterd' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Dat was de beste rondleiding in veertig jaar. Niemand viel in slaap.', { tag: 'trots, hijgend' }],
      ['hilko', 'Ik rij vanmiddag gewoon mee. Met mijn reserveauto. Ik heb er drie.', { tag: 'stug, nat, wegsjokkend' }],
      ['A', 'Dan rijden wij ook mee.', { tag: 'koel' }],
      ['hilko', 'Waarmee?!', { tag: 'woedend, kort' }],
      ['A', 'Tinus\' oom heeft een rallyauto. Zijn rug doet het niet meer.', { tag: 'droog' }],
      ['hilko', 'Rij maar. Er zijn sloten genoeg.', { tag: 'stug' }],
      ['N', 'Jan en Alleman mogen naar huis. Ze hebben genoeg gehad. En ik ook. Het was prachtig.', { tag: 'droog, zacht' }],
    ],
    replay: [
      ['N', 'Weer koetsen kijken? Dit keer geen auto\'s. Ik zet de achterdeur op slot.', { tag: 'trots' }],
    ],
    fail: [
      ['A', 'De koets staat in de beuk.', { tag: 'ontdaan' }],
      ['koetsier', 'Dat gebeurt. Jan en Alleman zijn er niet van geschrokken. Ik wel.', { tag: 'zacht, kalm' }],
      ['T', 'Hij heeft een wiel verloren.', { tag: 'droog' }],
    ],
  },
  {
    // O18 Grind
    npc: 'rennie', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Pacenotes zitten in de radio. Ik zit op de kermis, met mijn stopwatch. Ik zeg wat er komt. Jij rijdt wat er komt.', { tag: 'kordaat, snel, naast de auto' }],
      ['T', 'Ik zit in een friteuse. Niet andersom.', { tag: 'droog, in schort en helm' }],
      ['N', 'Hij is vastgesnoerd. Jij ook. Dat is geen kritiek.', { tag: 'kordaat' }],
      ['hilko', 'Moi, Stadjer. Ik ben nat geweest. Dat is nu droog. Het is jouw beurt.', { tag: 'luid, zelfverzekerd, in zijn reserveauto' }],
      ['A', 'Ik zie het. Je banden zijn nog steeds nat.', { tag: 'koel' }],
      ['N', 'Vandaag weegt elke eierbal tweeënveertig gram. Ik heb ze gewogen. Ik weeg alles.', { tag: 'kordaat' }],
      ['T', 'Veertig eierballen. Dertig moeten heel. Dat zijn tien dingen die mogen sterven.', { tag: 'droog' }],
      ['A', 'Niemand sterft. Ze worden gegeten.', { tag: 'scherp' }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Dat was een rally. Een echte. Zonder auto van de club.', { tag: 'kordaat, opgetogen' }],
      ['A', 'Met de auto van Tinus\' oom. En een friteuse.', { tag: 'warm, buiten adem' }],
      ['N', 'Wij zijn niet jaloers. Een beetje. Ik heb mijn stopwatch gebroken.', { tag: 'kordaat, droog' }],
      ['T', 'Hij loopt nog.', { tag: 'droog' }],
      ['N', 'Dat is de tweede. Ik had er twee. De club heeft nog steeds geen auto. Als je tijd hebt.', { tag: 'kordaat' }],
      ['A', 'Dat doen we. Maar eerst eten.', { tag: 'zacht' }],
      ['tinus', 'Mijn oom wil een eierbal. Hij heeft er nog nooit een gehad. Hij zit in de auto.', { tag: 'stug, droog' }],
    ],
    replay: [
      ['N', 'Weer de rollende keuken? Ik heb de stopwatch hersteld.', { tag: 'kordaat' }],
    ],
    fail: [
      ['T', 'Nog negentien heel. Dat is meer dan niets.', { tag: 'droog, bij de friteuse' }],
      ['rennie', 'Negentien is geen dertig. Maar het is wel een mooi getal. Opnieuw.', { tag: 'kordaat, zacht' }],
    ],
  },
```

### C. missions.js (stage-schetsen, met de say- en scene-regels)

De vorm van de bestaande `stages`-missies (H2, H8, H10, F4a O1-O10). De `say`- en scène-regels staan als aparte constanten; ze gaan letterlijk in `say:` en `lines:` van de stages.

```js
// O11
{
  type: 'stages',
  label: 'Jelle aan de grens',
  intro: ['Jelle staat in Zoutkamp in een zwemvest en heeft een plan met paling.', 'Race hem door het Reitdiep en over het Lauwersmeer naar de sluizen van Lauwersoog, en fotografeer de laadbon van de Zilveren Aal.'],
  outro: 'Achthonderd kilo paling, één laadbon en een Fries in een zwemvest.',
  timeLimit: 360, reward: 1600, clock: 6.8, weather: 'clear',
  start: walk(/* steiger van de dijkwerker, Zoutkamp */),
  boatAt: /* Zoutkamp haven */ null, ride: 'dijkwerker-sloep',
  handBack: { how: 'moor', say: 'De sloep gaat terug aan de steiger van de dijkwerker. Hij heeft het touw al vast.' },
  hull: { label: 'Romp', per: 20, failAt: 100 },
  stages: [
    { kind: 'board', label: 'Stap in de sloep van de dijkwerker' },
    { kind: 'goto', mode: 'boat', label: 'Race over het Reitdiep, door de sluis van Zoutkamp', race: { rival: 'jelle-skutsje', buoys: 4, scriptedFall: { at: 'sluis-zoutkamp', plons: true } }, lock: 'zoutkamp', horn: true },   // NEW: boat race with a rival and horn-to-open locks
    { kind: 'goto', mode: 'boat', label: 'Over het Lauwersmeer naar de sluizen van Lauwersoog', buoyLine: 'lauwersmeer', target: { lock: 'lauwersoog' } },
    { kind: 'escort', mode: 'boat', label: 'Rij naast de Zilveren Aal en fotografeer de laadbon', target: 'zilveren-aal', within: 12, hold: 4, photo: true },   // NEW stage kind (reuses O1 escort)
    { kind: 'scene', kicker: 'De sluis van Lauwersoog', cast: [{ key: 'fokko' }] },
  ],
},
// O11: say lines (companion, in order) and scene lines for the stages above
const O11_SAY = [
  ['A', 'Boei één. Links. Jelle gaat rechts. Hij weet niet dat het links is.', { tag: 'geconcentreerd' }],
  ['T', 'Er komt een kotter uit het haventje. Toeteren.', { tag: 'droog' }],
  ['A', 'Hij gaat opzij. Ze gaan altijd opzij voor een dame in een sloep.', { tag: 'strijdlustig' }],
  ['T', 'Hij gaat opzij omdat hij bang is.', { tag: 'droog' }],
  ['A', 'De sluis. Deuren open. Toeter, Tammo.', { tag: 'geconcentreerd' }],
  ['T', 'Hij springt. Jelle springt. Met een stok. Over een sluisdeur.', { tag: 'verbaasd, in de verte' }],
  ['A', 'Hij landt.', { tag: 'droog' }],
  ['T', 'Hij landt. In de kolk.', { tag: 'droog' }],
  ['jelle', 'Oant sjen!', { tag: 'verbaasd, in het water' }],
  ['A', 'Eén minder. Hij is nat en tevreden.', { tag: 'opgewekt' }],
  ['T', 'Open water. Wind uit het noordwesten. Hou rechtdoor.', { tag: 'gespannen' }],
  ['A', 'De Aal. Daar. Hij gaat de kolk in.', { tag: 'geconcentreerd' }],
  ['T', 'Naast hem. Vier tellen. Dan klik.', { tag: 'fluisterend' }],
  ['T', 'Achthonderd kilo paling. Geen vergunning. Ontvanger: O.B. Rokerij.', { tag: 'zacht' }],
  ['A', 'Klik. Hij heeft me gezien.', { tag: 'tevreden' }],
];
const O11_SCENES = {
  'De sluis van Lauwersoog': [
    ['fokko', 'Weg met die sloep! Dit is een sluis, geen terras!', { tag: 'woedend, beheerst, vanaf het dek' }],
    ['fokko', 'Ik ken jullie gezichten. Ik onthoud ze. Net als Ubbo.', { tag: 'kalm, dreigend' }],
    ['A', 'Ubbo onthoudt graag. Hij vergeet alleen wat hij schuldig is.', { tag: 'koel' }],
    ['fokko', 'Hij is niemand iets schuldig. Hij heeft alles opgeschreven.', { tag: 'rauw' }],
    ['T', 'Opgeschreven. In een boek.', { tag: 'droog' }],
    ['fokko', '…Daar praat ik niet over.', { tag: 'kort, te laat' }],
    ['A', 'Een boek. Jelle had gelijk.', { tag: 'zacht, tegen Tammo' }],
  ],
};
// O12
{
  type: 'stages',
  label: 'Donker genoeg',
  intro: ['Fokko de Visser laadt \'s nachts paling over aan het Lauwersmeer, en zijn boek ligt op een tafel.', 'Roei in stilte met Fenna, sluip naar de pier en fotografeer wat er gebeurt. Elke lamp verraadt je.'],
  outro: 'Eén pagina, één naam die Fenna kent, en een hemel zonder lampen.',
  timeLimit: null, reward: 1800, clock: 23.3, weather: 'clear', moon: 'new',
  start: walk(/* steiger Ezumazijl */),
  boatAt: /* steiger */ null, ride: 'fenna-roeiboot',
  handBack: { how: 'moor', say: 'De roeiboot gaat terug naar Fenna\'s steiger. Ze legt het touw altijd zelf.' },
  stages: [
    { kind: 'board', label: 'Stap in Fenna\'s roeiboot', say: 'Telefoon op nachtstand. Geen zaklamp.' },
    { kind: 'goto', mode: 'row', label: 'Roei in stilte langs het riet (geluidsmeter)', noise: { per: 2.4, failAt: 100 }, stars: { picks: 3, star: 'poolster' } },   // NEW: silent rowing + star navigation (reuses A28 sky)
    { kind: 'sneak', label: 'Sluip naar de pier', area: 'ezumazijl-pier', guards: 3, lights: 'verraadt', darkRun: true },
    { kind: 'listen', label: 'Fotografeer: de vaten, de bestelbus, het grootboek', spots: 3, range: 8, hold: 4, photo: true },
    { kind: 'scene', kicker: 'Het kajuitje op de wal', cast: [{ key: 'fenna' }], props: [{ kind: 'book', open: true }] },
    { kind: 'goto', mode: 'row', label: 'Terug naar de boot, geen lamp', noise: { per: 2.4, failAt: 100 } },
  ],
},
// O12: say lines (companion, in order) and scene lines for the stages above
const O12_SAY = [
  ['fenna', 'Poolster. Zie je de steel van de Kleine Beer? De laatste ster. Daar.', { tag: 'helder, fluisterend' }],
  ['T', 'Ik zie een vliegtuig.', { tag: 'droog, fluisterend' }],
  ['fenna', 'Vliegtuigen knipperen. Sterren niet. Dat is het verschil.', { tag: 'helder, geduldig' }],
  ['T', 'Dat is een heleboel.', { tag: 'zacht, onder de indruk' }],
  ['fenna', 'Dat is de Melkweg. Mijn oma noemt hem de Dijk van de Nacht.', { tag: 'zacht' }],
  ['fenna', 'Stop. Geen riem meer. Er komt een auto op de dijk.', { tag: 'fluisterend, scherp' }],
  ['T', 'Koplampen. Over het water. Ik ben een steiger.', { tag: 'fluisterend' }],
  ['fenna', 'Je bent een heel slechte steiger. Maar het is donker.', { tag: 'fluisterend, droog' }],
  ['T', 'Vaten. Twaalf. O.B. in de zijkant.', { tag: 'fluisterend' }],
  ['T', 'Een bus. Twee mannen. Ze hangen paling over uit een tank. Hij leeft.', { tag: 'fluisterend' }],
  ['T', 'Op tafel in dat huisje. Een boek. Kasboek, staat er. Deel drie: Wadkust.', { tag: 'fluisterend, ongelovig' }],
  ['T', 'Ik fotografeer één pagina. Het scherm is dim. Klik.', { tag: 'fluisterend' }],
  ['fenna', 'Een lamp. Daar. Op! Op de grond, Tammo.', { tag: 'fluisterend, scherp' }],
  ['T', 'Een reiger. Hij schrok net zo hard als ik.', { tag: 'fluisterend, buiten adem' }],
  ['fenna', 'Ze hoorden hem niet. Een reiger is hier een gewone avond. Ga.', { tag: 'fluisterend, zacht' }],
];
const O12_SCENES = {
  'Het kajuitje op de wal': [
    ['T', 'Kolom één: namen. Kolom twee: bedragen. Kolom drie: een handtekening.', { tag: 'fluisterend, ongelovig' }],
    ['T', 'Visser Dolf, achtentwintigduizend. Visser Hendrik, elfduizend. S. de Boer, kotter Trijntje, ZK 53: achttienduizend vierhonderd. Verpand.', { tag: 'fluisterend, stil', clue: true }],
    ['fenna', 'Dat is mijn oma.', { tag: 'zacht, geschrokken' }],
    ['T', 'Ik weet het. Ik zie de naam.', { tag: 'zacht' }],
    ['fenna', 'Ze heeft nooit iets gezegd.', { tag: 'stil, dan rustig' }],
    ['T', 'Gronings.', { tag: 'zacht, droog' }],
    ['fenna', 'Nee. Dat is gewoon oma.', { tag: 'zacht' }],
  ],
};
// O13
{
  type: 'stages',
  label: 'Laag water',
  intro: ['Fokko is bij eb het Wad opgelopen, richting de Simonszand, en de wind draait.', 'Loop met Fenna naar hem toe, haal hem uit de klei, en kom op de hoogste plaat voor het water komt.'],
  outro: 'Het Wad komt altijd terug. Iedereen ook.',
  timeLimit: null, reward: 2200, clock: 14.2, weather: 'wind-nw',
  tide: { phase: 'ebb', floodAt: 17.0, early: 1.5 },   // NEW: tide model for the Wad (plan 2.7); the flood arrives 1.5 h early (opzet)
  start: walk(/* dijk bij de zijl, Noordpolderzijl */),
  stages: [
    { kind: 'wad', label: 'Loop met Fenna het Wad op', guide: 'fenna', pace: { min: 0.7, max: 1.2 }, stay: 40, rules: 3 },   // NEW stage kind: walk on the flats with a guide (pace, "never alone")
    { kind: 'goto', mode: 'wad', label: 'Steek het gat over, loop om de mosselbank', crossings: [{ kind: 'gat', depth: 0.6 }], avoid: [{ kind: 'mosselbank', pen: 20 }, { kind: 'vogels' }, { kind: 'zeehond', min: 80 }] },
    { kind: 'goto', mode: 'wad', label: 'Vind Fokko, richting de Simonszand', target: { at: [/* plaat bij de Simonszand */] }, opzet: true },
    { kind: 'rescue', label: 'Help hem uit de klei (plat, wachten, draaien, trekken)', rounds: 4, hold: 4, pull: false },   // NEW stage kind: rhythm rescue
    { kind: 'wad', label: 'Naar de hoogste plaat, Fenna roept de route', guide: 'fenna', route: 'hoogste-plaat', callouts: true },
    { kind: 'lift', label: 'Wacht op de heli', heli: 'dijkstra', order: ['fokko', 'tammo', 'fenna'], winch: true },   // NEW stage kind: winch rescue (reuses H15 lier)
    { kind: 'scene', kicker: 'De hoogste plaat', cast: [{ key: 'dijkstra' }, { key: 'fenna' }] },
  ],
},
// O13: say lines (companion, in order) and scene lines for the stages above
const O13_SAY = [
  ['fenna', 'Ritme. Niet te snel. Het Wad houdt van tempo, niet van haast.', { tag: 'helder' }],
  ['T', 'Mijn voeten zijn er nog. Ze voelen niks.', { tag: 'droog, buiten adem' }],
  ['fenna', 'Gat. Zestig centimeter. Rechtdoor, geen bocht.', { tag: 'kort' }],
  ['T', 'Dat is koud.', { tag: 'verbaasd' }],
  ['fenna', 'Mosselbank. Rechts omlopen. Daar stap je niet op. Dat is een heel dorp.', { tag: 'helder, ernstig' }],
  ['fenna', 'Steltlopers. Laat ze. Ze staan op de rand van hun eigen eten.', { tag: 'zacht' }],
  ['T', 'Zeehonden. Op de plaat. Ver weg.', { tag: 'zacht' }],
  ['fenna', 'Ver weg is goed. Ver weg blijft goed.', { tag: 'helder' }],
  ['A', 'De dijkwerker zegt: het water komt anderhalf uur eerder. Wind uit het noordwesten.', { tag: 'gespannen, via de telefoon' }],
  ['fenna', 'Opzet. De wind duwt het water naar de kust. Het komt sneller dan de tabel. Tammo: tempo omhoog. Niet rennen. Harder lopen, niet sneller haasten.', { tag: 'ernstig, snel' }],
  ['T', 'Dat is hem. Dat is Fokko. Hij zit tot zijn heupen in de klei.', { tag: 'verbaasd' }],
  ['fokko', 'Ga weg. Ik red me wel.', { tag: 'rauw, buiten adem, vastzittend' }],
  ['fenna', 'Fokko. Niet trekken. Als je trekt, zak je dieper. Tammo: plat. Op je buik. Gewicht verdelen.', { tag: 'helder, kordaat' }],
  ['T', 'Ik lig plat. Hij trekt.', { tag: 'gespannen, plat op de klei' }],
  ['fenna', 'Wachten. Draaien. Trekken. Wachten. Draaien. Trekken.', { tag: 'kalm' }],
  ['fokko', 'Mijn been komt los.', { tag: 'rauw, hijgend' }],
  ['fenna', 'Het gat achter ons is vol. Twee meter. We kunnen niet terug. De hoogste plaat, daar. Nu.', { tag: 'ernstig' }],
  ['fenna', 'Als je wacht, blijf je staan. Als je loopt, ga je de goede kant op. Dit is lopen.', { tag: 'rustig, vastberaden' }],
  ['A', 'Dijkstra is in de lucht. Vier minuten.', { tag: 'gespannen' }],
];
const O13_SCENES = {
  'De hoogste plaat': [
    ['dijkstra', 'Wad, hier Dijkstra, UMCG. Mijn heli is terug uit onderhoud. Ik heb hem nog geen lunch gegeven.', { tag: 'droog, zakelijk, door de heliradio' }],
    ['dijkstra', 'Het stond niet in het rooster. Ik heb het er nu onder "wad" in gezet.', { tag: 'nuchter, laconiek' }],
    ['fenna', 'Eerst Fokko. Dan Tammo. De gids gaat als laatste.', { tag: 'helder, ernstig' }],
    ['dijkstra', 'Dat is het enige wat ik vandaag begrijp. Lier gaat naar beneden. Ik vlieg zelf. Jij hangt. Dat zit je blijkbaar in.', { tag: 'droog' }],
    ['T', 'Mijn moeder mag dit nooit weten.', { tag: 'droog, aan de lier' }],
  ],
};
// O14
{
  type: 'stages',
  label: 'De boot naar Schier',
  intro: ['Voorronde drie in Lauwersoog: het Wad moet in de eierbal. Tammo bakt, Tessa serveert de jury.', 'Een knecht van Fokko rijdt een kist van Ubbo naar de laatste veerboot. Spring erachteraan, pak de kist, en kom terug voor de uitslag.'],
  outro: 'Voorronde Wadkust gewonnen. Het boek ligt op de jurytafel.',
  timeLimit: null, reward: 3200, clock: 18.5, own: 'fjord',
  start: walk(/* pier Lauwersoog, havenfeest */),
  stages: [
    { kind: 'serve', label: 'Serveer de jury, Tammo bakt', rounds: 3, warm: true, jurors: ['sientje', 'visser', 'visser', 'fokko'] },   // NEW stage kind: counter mini-game
    { kind: 'goto', label: 'Achter de knecht aan over de pier', mode: 'foot', target: { follow: 'bagagekar' }, crowd: true, slowdown: 'duwen' },
    { kind: 'jump', label: 'Spring op de vertrekkende veerboot', target: 'veerboot-robbenplaat', window: 3.0, slowmo: 1.5 },   // NEW stage kind: leap onto a moving vehicle
    { kind: 'grab', label: 'Pak de kist op het achterdek', target: { carrier: 'knecht', deck: 'achter' }, hold: 4, range: 8 },   // NEW stage kind (reuses sneak/use)
    { kind: 'cutscene', label: 'De overtocht', id: 'ferry-schier', dur: 45, skippable: true, card: 'Je bent op Schier geweest', cast: [{ key: 'sybren' }, { key: 'mem' }] },   // NEW stage kind: ferry cutscene (plan 3.6)
    { kind: 'cutscene', label: 'De terugvaart', id: 'ferry-lauwersoog', dur: 25, skippable: true },
    { kind: 'scene', kicker: 'De uitslag', cast: [{ key: 'sientje' }, { key: 'fokko' }], props: [{ kind: 'book', open: true }] },
  ],
},
// O14: say lines (companion, in order) and scene lines for the stages above
const O14_SAY = [
  ['T', 'Eerste lading. Zestig tellen. Zeekraal erin. Het ruikt naar zee.', { tag: 'gehaast, bij de pan' }],
  ['A', 'Bordje één naar Dolf. Warm. Warm is het hele punt.', { tag: 'gehaast' }],
  ['visser', '…Ja.', { tag: 'zwaar, proevend' }],
  ['A', 'Hij zei ja. Dat is voor hem een boek.', { tag: 'opgelucht, snel' }],
  ['T', 'Jelle heeft een sms gestuurd. Er staat: kijk naar de kar. Er staat ook: moai.', { tag: 'droog' }],
  ['A', 'De kar. Met een kist. O.B. aan de zijkant. En de boot vertrekt over drie minuten.', { tag: 'scherp' }],
  ['T', 'Ga. Ik red de eierballen. Ik bak niet beter als jij kijkt.', { tag: 'gespannen, bij de pan' }],
  ['A', 'Ik ben weg. Hou de pan warm.', { tag: 'strijdlustig, rennend' }],
  ['havenmeester', 'Rustig! Dit is een havenfeest, geen nood! Niet door de kinderen!', { tag: 'streng, fluitend' }],
  ['A', 'Sorry! Dringend! Fanfare, opzij!', { tag: 'buiten adem' }],
  ['havenmeester', 'De loopplank gaat omhoog! Niet springen!', { tag: 'waarschuwend, roepend' }],
  ['A', 'Ik spring altijd. Dat is mijn plan B.', { tag: 'gespannen, in de lucht' }],
  ['knecht', 'Wat doe jij hier?! Dit is een privékist!', { tag: 'gehaast, op de boot' }],
  ['A', 'Dat staat erop. In grote letters. O.B. Daarom.', { tag: 'scherp' }],
  ['knecht', 'Ik doe dit voor drie euro per uur. Dat is niet eens vast.', { tag: 'hijgend, wanhopig' }],
  ['A', 'Dan hoef je geen kist te verdedigen. Geef maar.', { tag: 'koel' }],
];
const O14_SCENES = {
  'De loopplank': [
    ['sybren', 'Wy fertrekke. Hâld jo fêst, en jo hoed.', { tag: 'kalm, traag, door de boordradio' }],
    ['havenmeester', 'Dat mag niet! Wie springt er nou op een boot?!', { tag: 'verontwaardigd, roepend' }],
    ['T', 'Tessa. Dat is een boot. Geen trampoline.', { tag: 'droog, aan de telefoon' }],
    ['A', 'Ik zit erop. Het gaat goed. Hij vaart.', { tag: 'buiten adem, aan de telefoon' }],
  ],
  'Het achterdek': [
    ['sybren', 'Jimme sprongen. Ik seach it. De rinplanke wie al omheech. Dat is in "te let".', { tag: 'kalm, droog, in de deuropening' }],
    ['sybren', 'Gjin gedoch oan board. Dit is in fearboat, gjin kroech.', { tag: 'droog, vriendelijk' }],
    ['A', 'Geen gedoe. Alleen een kist. Die is van een man in Lauwersoog die hem niet mag bezitten.', { tag: 'zuiver, vriendelijk' }],
    ['sybren', 'Dan is er hjir gast. Ik ha gasten. Hâld him mar.', { tag: 'kalm, droog' }],
    ['T', 'Heeft hij een kaartje?', { tag: 'droog, aan de telefoon' }],
    ['sybren', 'Ik rekkenje ôf yn ferhalen. Fertel it straks mar. Oan mem op Skier. Sy is der al.', { tag: 'droog' }],
  ],
  'De overtocht': [
    ['sybren', 'Dêr. Rottumeroer. Dêr mei gjinien hinne. Ik ek net. Ik sjoch.', { tag: 'droog, kalm, wijzend' }],
    ['T', 'Hij is zo plat.', { tag: 'zacht' }],
    ['A', 'Zeehonden. Op elke plaat. Ze liggen te liggen.', { tag: 'zacht, wijzend' }],
    ['sybren', 'Dat is de Waadsee. Dy lizze dêr al langer as ik.', { tag: 'droog, vriendelijk' }],
    ['mem', 'Famke! Jonge! Ik ken jimme fan de radio. Kom hjir, jou dy doaze oan in mem.', { tag: 'warm, stellig, op de kade', card: 'mem' }],
    ['mem', 'Ik wachtte hier al. Jelle belde. Hy belt altyd te let. Mar ik ha gjin haast.', { tag: 'zacht, droog' }],
    ['A', 'Mevrouw Terpstra. Ik had u niet hier verwacht.', { tag: 'zacht, verbaasd' }],
    ['mem', 'Sinds juni. Bij mijn zus. Mijn bakkerij is een gele gevel. Ik bak nu voor mezelf. Alleen koekjes.', { tag: 'warm, stellig' }],
    ['T', 'Het spijt me van uw bakkerij.', { tag: 'droog, zacht' }],
    ['mem', 'Een bakkerij is een stuk gebak. Het deeg blijft. Dat zit in mijn handen.', { tag: 'zacht, droog' }],
    ['mem', 'Groet Trijntje. Ze belt elke zondag. Ze zegt niks. Ik zeg alles. Dat is een goed gesprek.', { tag: 'warm, stellig' }],
    ['mem', 'En zeg tegen mijn zoon dat hij niet in water moet springen.', { tag: 'zacht, samenzweerderig' }],
    ['A', 'Hij weet het.', { tag: 'geamuseerd' }],
    ['mem', 'Hij weet het. Hij doet het toch. Dat is een Terpstra.', { tag: 'warm, droog' }],
    ['sybren', 'Wy kearen werom. Gjin kaartsje. Foar mem.', { tag: 'droog, kalm' }],
  ],
};
// O15
{
  type: 'stages',
  label: 'Trekkertrek',
  intro: ['Tinus heeft Hinderks trekker, maar de motor ligt in een emmer. Vanmiddag is de finale trekkertrek.', 'Haal een blok, een turbo en gewichten, tune de trekker, en trek de slee verder dan Hilko\'s zwarte monstertrekker.'],
  outro: 'Opa\'s trekker startte. De emmer was leeg.',
  timeLimit: null, reward: 2000, clock: 9.0,
  start: walk(/* erf van Tinus, Tolbert */),
  loaner: 'tinus-pickup', handBack: { how: 'park', say: 'De pick-up blijft op het erf. Tinus wil hem zelf terugzetten, zegt hij.' },
  stages: [
    { kind: 'collect', label: 'Haal blok, turbo en gewichten', any: true,
      stops: [{ name: 'Sloperij', part: 'blok', lift: 4 }, { name: 'Leek', part: 'turbo' }, { name: 'Boer Evert', part: 'gewichten', n: 30 }] },
    { kind: 'tune', label: 'Tune de trekker op het erf', sliders: ['toeren', 'gewichten', 'banden'], testPull: true },   // NEW stage kind: tuning mini-game (plan A5)
    { kind: 'trekkertrek', label: 'Trek in de kwalificatie en de halve finale', rounds: ['kwalificatie', 'halve'], attempts: 3, sled: { weight: 'oplopend' }, at: 'niekerk' },   // NEW goal/stage kind (A5)
    { kind: 'trekkertrek', label: 'De finale tegen Hilko', rounds: ['finale'], rival: 'hilko-monster', cheat: { ballast: 'schuift' }, smoke: true },
    { kind: 'scene', kicker: 'De baan', cast: [{ key: 'tinus' }, { key: 'hilko' }] },
  ],
},
// O15: say lines (companion, in order) and scene lines for the stages above
const O15_SAY = [
  ['monteur', 'Het blok is gratis. Je moet hem er zelf uit tillen. Dat is mijn tarief.', { tag: 'droog, vermoeid, bij de sloperij' }],
  ['T', 'Hij weegt als een wasmachine met een geheim.', { tag: 'gespannen, tillend' }],
  ['henk', 'De turbo ligt bij Wietse in Leek. Onder de werkbank. In een melkbus. Ik weet niet waarom. Ik vraag het ook niet.', { tag: 'gemoedelijk, aan de telefoon' }],
  ['T', 'Een turbo in een melkbus. Dat is Leek.', { tag: 'droog' }],
  ['trekkerboer', 'Evert. Gewichten. Dertig stuks. Ze zijn van beton en ze zijn van mijn vader. Breng ze terug. En nog een beetje meer.', { tag: 'droog, nuchter' }],
  ['tinus', 'Banden lager. Dan grijpen ze. Hoger, dan glijden ze. Jij voelt het met je rug. Zei opa.', { tag: 'stug, bij de trekker' }],
  ['tinus', 'Hij start. Opa. Hij start.', { tag: 'stil, bij de trekker' }],
  ['T', 'Hij start op je opa. Dat is geen motor. Dat is een belofte.', { tag: 'droog, zacht' }],
  ['omroeper', 'En nu de finale! Tinus, een jongen met een emmer! Tegen Hilko Kremer, de man met de sponsor!', { tag: 'luid, enthousiast, op de baan' }],
  ['hilko', 'Moi, Stadjer. Ik heb een logo. Jij hebt een emmer.', { tag: 'luid, zelfverzekerd, vanuit zijn monstertrekker', card: 'hilko' }],
  ['T', 'De emmer is leeg. De motor niet.', { tag: 'droog' }],
  ['hilko', 'Het is een trekker, geen vrijgezellenfeest.', { tag: 'grinnikend' }],
  ['tinus', 'Niet te hard. Niet te zacht. Een trekker voel je met je rug.', { tag: 'gespannen' }],
  ['omroeper', 'Hij trekt! De slee zit vol! Hij trekt nog steeds!', { tag: 'luid, ademloos' }],
  ['T', 'Ik voel hem. Hij trekt mee.', { tag: 'geconcentreerd' }],
  ['T', 'Zijn gewicht ligt voor. Op de slee van Hilko. Het schuift.', { tag: 'droog, verbaasd' }],
  ['omroeper', 'Twee-en-veertig meter voor de Grijze! Dat heeft hier in geen jaren iemand met een emmer gehaald!', { tag: 'luid, plechtig' }],
  ['hilko', 'Mijn gewicht verschoof! Dat kan niet!', { tag: 'woedend, door de rook' }],
  ['T', 'Dat zeggen ze ook van een boom.', { tag: 'droog' }],
];
// O16
{
  type: 'stages',
  label: 'Over het kanaal',
  intro: ['Drie witte vrachtwagens van Ubbo rijden elke nacht via Friesland om de weegbrug heen.', 'Volg ze langs het kanaal, plak Henks tweede zender onder de derde, en laat Jelle een brug openhouden.'],
  outro: 'Drie witte trucks, één weegbrug en een brug die bleef openstaan.',
  timeLimit: 240, reward: 2200, clock: 22.5, weather: 'clear',
  start: drive(/* brug Zuidhorn, kanaal */), loaner: 'tinus-pickup', handBack: { how: 'park', say: 'De pick-up gaat terug naar Tinus. Hij zegt: geen kras. Er zit een kras.' },
  stages: [
    { kind: 'use', target: { own: 'fjord', part: 'glovebox' }, hold: 3, label: 'Haal Henks tweede zender uit het handschoenenvak' },
    { kind: 'tail', label: 'Volg het konvooi (40-120 m)', convoy: ['truck-1', 'truck-2', 'truck-3'], min: 40, max: 120, lose: 200, alert: { mirrors: true } },   // NEW stage kind: tail a convoy with an alert meter (O16 konvooi)
    { kind: 'scene', kicker: 'De grensbrug', cast: [{ key: 'jelle', boat: true }], cam: { bridge: 'gaarkeuken' } },
    { kind: 'plant', label: 'Plak de zender onder de derde truck', target: 'truck-3', range: 3, mirrors: true, time: 240 },   // NEW stage kind (reuses O8 `use`)
    { kind: 'scene', kicker: 'De brug over het kanaal', cast: [{ key: 'wybe' }, { key: 'wiebren' }, { key: 'durk' }, { key: 'douwe' }] },
    { kind: 'scene', kicker: 'De weegbrug', cast: [{ key: 'agent' }, { key: 'durk' }] },
  ],
},
// O16: say lines (companion, in order) and scene lines for the stages above
const O16_SAY = [
  ['T', 'Henk belt. Hij zegt: schroefje los, voor het handschoenenvak. Hij vraagt niet waarom.', { tag: 'droog, aan de telefoon' }],
  ['A', 'Hij zit in mijn zak. Drie trucks. Vierhonderd meter. Niet naderen.', { tag: 'zakelijk' }],
  ['T', 'We zijn blauw, Tessa. We zijn heel blauw in een zwarte nacht.', { tag: 'droog' }],
  ['A', 'Daarom hebben we een pick-up. Die is niet blauw.', { tag: 'droog' }],
  ['T', 'De achterste kijkt in de spiegel. Terug. Rustig.', { tag: 'gespannen' }],
  ['A', 'Er zit een bocht aan. Lichten uit tot de bocht. Nu.', { tag: 'zacht' }],
  ['T', 'Ze stoppen. Voor de brug. Er komt een boot.', { tag: 'verbaasd' }],
  ['A', 'Het is Jelle. In dat bootje. Met die vlag.', { tag: 'ongelovig' }],
  ['jelle', 'Wis en wrachtich! Een Fries mag altijd onder een brug door! Zolang ik eronder vaar, blijft hij open!', { tag: 'opgewekt, vanaf het water' }],
  ['T', 'Hij vaart rondjes. Onder een brug. Dat is ook een soort wereldrecord.', { tag: 'droog' }],
  ['A', 'De derde. Onder de derde truck. Langs de spiegel. Nu.', { tag: 'zacht, geconcentreerd' }],
  ['T', 'Plakken. Klik. Hij zit.', { tag: 'fluisterend' }],
  ['A', 'De zender zit. De brug blijft open. Jelle blijft varen.', { tag: 'opgelucht' }],
];
const O16_SCENES = {
  'De grensbrug': [
    ['wybe', 'Halt. Fryske grins. Paspoart, as it jo belieft.', { tag: 'traag, plechtig, over het water' }],
    ['durk', 'Wybe?', { tag: 'traag, verbaasd, uit de cabine' }],
    ['wiebren', '…Durk?', { tag: 'traag, verrast' }],
    ['douwe', '…Wiebren.', { tag: 'traag' }],
    ['durk', 'Neven!', { tag: 'traag, blij' }],
    ['wybe', 'Wy binne hjir net. Wy steane hjir gewoan.', { tag: 'traag, plechtig' }],
    ['durk', 'Wij moeten naar Kollum. Naar een koelhuis. De baas zegt.', { tag: 'traag, eerlijk' }],
    ['douwe', '…zegt.', { tag: 'traag' }],
    ['wiebren', 'Net fertelle, Durk.', { tag: 'traag, ontzet' }],
    ['durk', '…Ik heb het al verteld.', { tag: 'traag, schuldig' }],
    ['wybe', 'De brêge is iepen. De brêge bliuwt iepen. Dat is it Fryske rjocht.', { tag: 'traag, plechtig' }],
    ['A', 'Het Friese recht. Dat is nieuw.', { tag: 'droog, zacht, vanuit de pick-up' }],
    ['T', 'Dat is oud. Ze hebben het net bedacht.', { tag: 'droog' }],
    ['durk', 'Wij kunnen niet terug. Achter ons staat een trailer.', { tag: 'traag, plechtig' }],
    ['douwe', '…trailer.', { tag: 'traag' }],
    ['agent', 'Weegbrug. De N355 is open. Wie niet over de brug kan, kan naar de weegbrug. Iedereen mee.', { tag: 'droog, kortaf, bij het bord' }],
    ['agent', 'Gewogen en te zwaar bevonden. Op elke as. Dat is een prestatie.', { tag: 'droog, tevreden, bij de weegbrug' }],
    ['durk', 'Wij kwamen niet langs de weegbrug. Wij kwamen er alleen.', { tag: 'traag, plechtig' }],
    ['agent', 'Dan zijn jullie er nu langs.', { tag: 'droog' }],
  ],
};
// O17
{
  type: 'stages',
  label: 'Koetsen kijken',
  intro: ['Hilko Kremer heeft zijn rallyauto verstopt in het Rijtuigenhuis bij Nienoord, met enveloppen in de portieren.', 'Vind de enveloppen, spring op een koets en haal de rallyauto in door het park.'],
  outro: 'Drie enveloppen, één gracht en twee paarden met een mening.',
  timeLimit: null, reward: 2400, clock: 10.5, noShoot: true,
  start: walk(/* ingang park Nienoord, Leek */),
  loaner: 'koets-wiegert', handBack: { how: 'park', say: 'De koets blijft bij het Rijtuigenhuis. De paarden kennen de weg.' },
  stages: [
    { kind: 'use', label: 'Zoek de enveloppen in de portieren (3)', targets: ['portier-1', 'portier-2', 'portier-3'], hold: 2, photo: true },
    { kind: 'board', vehicle: 'koets', label: 'Spring op de bok', say: 'Tongklik: sneller. Twee tongklikken: een ruzie.' },   // NEW vehicle: horse-drawn carriage (meter: trot; no whip exists)
    { kind: 'chase', label: 'Achter Hilko aan door het park (tongklik T = sneller)', vehicle: { name: 'rallyauto', maxSpeed: 20, route: 'lanen' }, name: 'Rallyauto van Hilko', escape: 250, shortcuts: 'gazon', noHurt: ['paard', 'zwaan', 'bezoeker'], flee: [/* slotgracht */] },
    { kind: 'goto', mode: 'vehicle', label: 'Snijd de bocht af door de wei', target: { at: [/* weide bij de beukenlaan */] } },
    { kind: 'scene', kicker: 'De slotgracht', cast: [{ key: 'hilko' }, { key: 'koetsier' }], props: [{ kind: 'envelopes', float: true }] },
  ],
},
// O17: say lines (companion, in order) and scene lines for the stages above
const O17_SAY = [
  ['T', 'Eén. Een bedrag. Een naam. Een handtekening. Twee. Drie. Ik fotografeer alles.', { tag: 'gespannen, aan de telefoon' }],
  ['koetsier', 'Tongklik: sneller. Twee tongklikken: nog sneller. Drie tongklikken: een ruzie.', { tag: 'trots, gehaast, op de bok' }],
  ['A', 'Hij heeft geen stuur. Hij heeft touwen.', { tag: 'geconcentreerd' }],
  ['koetsier', 'De teugels. Links trekken is links. Rechts is rechts. De paarden doen de rest. Ze hebben een mening.', { tag: 'droog' }],
  ['T', 'Hilko rijdt over het gras! Een rallyauto op een gazon!', { tag: 'gespannen, aan de telefoon' }],
  ['A', 'Dan gaan wij ook over het gras. Een koets heeft meer vrijheid. Geen wegen nodig.', { tag: 'strijdlustig' }],
  ['koetsier', 'Niet over de vijverrand! Het zijn zwanen! Ze weten dat ze zwanen zijn!', { tag: 'ontzet, op de bok' }],
  ['hilko', 'Een koets! Een koets tegen een rallyauto! Wie bedenkt zoiets?!', { tag: 'luid, door het raam' }],
  ['A', 'Ik. Vanochtend. Het ging ook niet anders.', { tag: 'strijdlustig' }],
  ['koetsier', 'Draaf! Draaf! Anders gaan ze wandelen! Jan is vijftien. Alleman is veertien. Dat is een leeftijd.', { tag: 'waarschuwend' }],
  ['T', 'De beukenlaan. Hij kan niet keren. Er staan beuken.', { tag: 'droog, aan de telefoon' }],
  ['A', 'Dan snij ik de bocht af. Door de wei. Hou je vast, meneer Wiegert.', { tag: 'scherp' }],
  ['koetsier', 'Dit is de mooiste dag van mijn leven! Nog nooit zo hard gereden!', { tag: 'gillend, blij' }],
  ['T', 'De gracht! Hij komt op de gracht af! Hij remt niet!', { tag: 'gespannen' }],
  ['hilko', 'Ik rem! Ik… rem… niet. Ik…', { tag: 'luid, dan steeds zachter' }],
];
const O17_SCENES = {
  'De slotgracht': [
    ['hilko', 'Mijn auto! Hij is een rallyauto! Hij zwemt niet!', { tag: 'woedend, druipend, op het dak' }],
    ['A', 'Hij zwemt. Dat is zijn allereerste keer.', { tag: 'droog, aan de rand' }],
    ['koetsier', 'Een koets haalt een rallyauto in. Dat staat vanaf nu in het gastenboek.', { tag: 'trots, hijgend' }],
    ['T', 'Naam. Naam. Naam. Bedrag. Bedrag. Handtekening.', { tag: 'zacht, met een envelop uit het water' }],
    ['A', 'De baancommissarissen van vanmiddag. Alle drie. Met elk een bedrag en een handtekening.', { tag: 'koel', clue: true }],
    ['hilko', 'Dat is een privéalbum.', { tag: 'woedend, kortaf' }],
    ['A', 'Het is een bewijsstuk. Het drijft.', { tag: 'koel' }],
  ],
};
// O18
{
  type: 'stages',
  label: 'Grind',
  intro: ['Voorronde vier in Zuidhorn: de eierbal wordt gebakken tijdens het rijden. Tammo bakt op de achterbank, Tessa rijdt.', 'Haal de finish met minstens dertig van de veertig eierballen heel, en voor Hilko.'],
  outro: 'Voorronde Westerkwartier gewonnen. Eenendertig eierballen heel.',
  timeLimit: 450, reward: 3400, clock: 14.0, weather: 'clear',
  start: drive(/* startterrein Zuidhorn */), loaner: 'oom-rally', handBack: { how: 'park', say: 'De rallyauto gaat terug naar Tinus\' oom. Hij zit al achterin, zegt hij. Met een eierbal.' },
  fragile: { label: 'Eierballen', per: 1.1, failAt: 10, of: 40, fail: 'er zijn minder dan dertig eierballen heel. Het wordt friet' },
  stages: [
    { kind: 'board', label: 'Stap in de rallyauto van Tinus\' oom', say: 'Rennie leest de pacenotes. Tammo bakt.' },
    { kind: 'race', label: 'Rij de N355 en het grind (minstens 30 eierballen heel)', route: 'n355-grind', pacenotes: 'rennie', rival: { name: 'Hilko', time: 430, ditch: 3 }, hazards: [{ kind: 'pion', moved: true }, { kind: 'sloot', n: 3, jump: true }] },   // NEW: pacenotes + rival + jumps
    { kind: 'goto', mode: 'vehicle', label: 'Het erf: de trekker', target: { at: [/* erf Boer Evert */] }, crossing: 'trekker', chickens: true },
    { kind: 'goto', mode: 'vehicle', label: 'De finish op het kermisterrein', target: { at: [/* kermisterrein Zuidhorn */] } },
    { kind: 'scene', kicker: 'De jurytafel', cast: [{ key: 'commissaris' }, { key: 'hilko' }] },
  ],
},
// O18: say lines (companion, in order) and scene lines for the stages above
const O18_SAY = [
  ['rennie', 'Start. Rechts één. Rechtdoor. Links vier. Sloot. Niet kijken.', { tag: 'kordaat, door de rallyradio' }],
  ['T', 'Eerste lading draait. Vier eierballen schuin. Tessa, bocht rustig.', { tag: 'gespannen, bij de friteuse' }],
  ['A', 'Ik probeer het! Het is een rallyauto, geen vaatwasser!', { tag: 'gejaagd' }],
  ['rennie', 'Pion staat verkeerd. Rechts, niet links. De commissaris heeft zijn pion verzet. Natuurlijk.', { tag: 'kordaat' }],
  ['T', 'Nog vierendertig heel. Dat is een goed getal.', { tag: 'droog, bij de pan' }],
  ['rennie', 'Drie sloten. Rechts, schans, landen. Niet remmen in de lucht.', { tag: 'kordaat' }],
  ['A', 'Vliegen! Ik vlieg! Hou vast, Tammo!', { tag: 'uitgelaten' }],
  ['T', 'Dat was een sloot. Ik was bang voor een tel. Eén. Twee. Drie eierballen weg.', { tag: 'droog, dan geschrokken' }],
  ['rennie', 'Erf. Trekker. Evert steekt over. Hij kijkt altijd naar links. Hij is Evert.', { tag: 'kordaat' }],
  ['A', 'Kippen! Links! Rechts! Er zijn kippen overal!', { tag: 'gespannen' }],
  ['trekkerboer', 'Rustig, meisje. Het zijn mijn kippen.', { tag: 'droog, vanaf de trekker' }],
  ['T', 'Eenendertig. Dat is meer dan genoeg. Niemand ademen.', { tag: 'droog' }],
  ['rennie', 'Finish! Zeven twee-en-twintig! De stopwatch lijkt het niet te geloven!', { tag: 'kordaat, opgetogen' }],
];
const O18_SCENES = {
  'De jurytafel': [
    ['commissaris', 'Eierballen: eenendertig van veertig heel. Tijd: zeven minuten tweeëntwintig.', { tag: 'zakelijk, verlegen' }],
    ['commissaris', '…We hebben een envelop gekregen. Het spijt ons. Hij ligt in een gracht.', { tag: 'verlegen, zacht' }],
    ['A', 'Drie namen. Drie bedragen. Drie handtekeningen. Ik heb ze allemaal.', { tag: 'koel, houdt haar telefoon omhoog' }],
    ['commissaris', 'Wij hebben het niet aangenomen. Wij hebben het alleen niet teruggebracht.', { tag: 'verlegen' }],
    ['hilko', 'Sloot! Dat was de sloot! Er stond een koe!', { tag: 'woedend, modderig, aankomend' }],
    ['A', 'Er stond geen koe.', { tag: 'koel' }],
    ['hilko', 'Eén koe. Misschien.', { tag: 'nors' }],
    ['hilko', '…Goud.', { tag: 'stug, proeft een eierbal uit de doos' }],
    ['commissaris', 'De voorronde Westerkwartier gaat naar de Fjord Frituur. De eierballen zijn warm. De rest is van de rest.', { tag: 'plechtig' }],
  ],
};
```

### D. banterlines.js

```js
// banterlines.js: append. New triggers: after:O11..O18 (story codes). train:leeuwarden and ferry:schier are new triggers (see below).
  { id: 'o11-pass-zwemvest', trigger: 'after:O11:pass', needs: 'O11', lines: [
    ['T', 'Hij had een zwemvest aan en het ging toch mis.', 'dry'],
    ['A', 'Hij landde. Dat telt voor hem.', 'amused'],
    ['T', 'Anders dan gepland.', 'dry, deadpan']]},
  { id: 'o11-pass-bakkerij', trigger: 'after:O11:pass', needs: 'O11', lines: [
    ['A', 'Zevenenveertig jaar. Elke zaterdag een brood weg.', 'angry, quiet'],
    ['T', 'En nu voorgebakken.', 'soft'],
    ['A', 'Ubbo koopt zachte dingen.', 'cold'],
    ['T', 'Die zijn het makkelijkst.', 'dry']]},
  { id: 'o11-fail', trigger: 'after:O11:fail', needs: 'O11', lines: [
    ['T', 'We waren er bijna.', 'dry'],
    ['A', 'Bijna is Fries voor te laat.', 'exasperated'],
    ['T', 'Zeg dat niet tegen Jelle.', 'dry']]},
  { id: 'o12-pass-reiger', trigger: 'after:O12:pass', needs: 'O12', lines: [
    ['A', 'Een reiger. Heeft hij je gezien?', 'amused'],
    ['T', 'Hij schrok net zo hard als ik.', 'dry'],
    ['A', 'Dan hadden jullie samen geschrokken. Dat bindt.', 'dry']]},
  { id: 'o12-pass-sterren', trigger: 'after:O12:pass', needs: 'O12', lines: [
    ['T', 'Ze noemt de Melkweg de Dijk van de Nacht.', 'soft, wondering'],
    ['A', 'Dat is mooi.', 'warm'],
    ['T', 'Zeg het niet tegen Rikus. Hij maakt er een jingle van.', 'dry']]},
  { id: 'o12-fail', trigger: 'after:O12:fail', needs: 'O12', lines: [
    ['T', 'Die lamp had een eigen mening.', 'dry'],
    ['A', 'Het is donker genoeg als je stilstaat.', 'quiet']]},
  { id: 'o13-pass-laarzen', trigger: 'after:O13:pass', needs: 'O13', lines: [
    ['T', 'Mijn schoenen zitten nog in de klei.', 'dry'],
    ['A', 'Het Wad heeft ze nu.', 'teasing'],
    ['T', 'Hij mag ze houden.', 'dry']]},
  { id: 'o13-pass-regels', trigger: 'after:O13:pass', needs: 'O13', lines: [
    ['A', 'Eén: de gids bepaalt.', 'soft'],
    ['T', 'Twee: je kijkt naar het water.', 'dry'],
    ['A', 'Drie: je loopt nooit alleen.', 'soft'],
    ['T', 'Jij liep niet mee.', 'dry'],
    ['A', 'Ik stond op de dijk. Dat telt als meelopen.', 'warm']]},
  { id: 'o13-fail', trigger: 'after:O13:fail', needs: 'O13', lines: [
    ['T', 'Fenna zegt: het water wint altijd.', 'soft'],
    ['A', 'Daarom lopen we er niet tegenin.', 'quiet'],
    ['T', 'Volgende keer een uur eerder.', 'dry']]},
  { id: 'o14-pass-springen', trigger: 'after:O14:pass', needs: 'O14', lines: [
    ['T', 'Je sprong op een boot.', 'dry'],
    ['A', 'Ik had een plan B. Plan A was een brug.', 'calm'],
    ['T', 'Er was geen brug.', 'dry'],
    ['A', 'Dat is plan B.', 'dry']]},
  { id: 'o14-pass-mem', trigger: 'after:O14:pass', needs: 'O14', lines: [
    ['A', 'Mem Terpstra bakt nu voor zichzelf.', 'soft'],
    ['T', 'Alleen koekjes.', 'dry'],
    ['A', 'Daar zijn we nog niks mee kwijt.', 'warm']]},
  { id: 'o14-pass-drie', trigger: 'after:O14:pass', needs: 'O14', lines: [
    ['A', 'Weer een voorronde. Zeven is een lang getal.', 'amused'],
    ['T', 'En een boot waar je op sprong.', 'dry'],
    ['A', 'Dat is plan B. Die is groter.', 'quick']]},
  { id: 'o14-fail', trigger: 'after:O14:fail', needs: 'O14', lines: [
    ['T', 'De boot vertrok om vijf over zeven.', 'dry'],
    ['A', 'De sprong was bedoeld voor vier over.', 'exasperated']]},
  { id: 'o15-pass-emmer', trigger: 'after:O15:pass', needs: 'O15', lines: [
    ['A', 'Je won met een emmer.', 'amused'],
    ['T', 'Hij was leeg. Dat helpt.', 'dry'],
    ['A', 'Opa zou trots zijn.', 'warm']]},
  { id: 'o15-pass-schuld', trigger: 'after:O15:pass', needs: 'O15', lines: [
    ['A', 'Rit naar Bourtange. Schuldig sinds 1953.', 'soft'],
    ['T', 'Oma heeft overal een lijstje.', 'dry'],
    ['A', 'En de mensen komen terug. Dat is het mooie.', 'quiet']]},
  { id: 'o15-fail', trigger: 'after:O15:fail', needs: 'O15', lines: [
    ['T', 'De motor sloeg af.', 'dry'],
    ['A', 'Hij gaat altijd net voor het einde af. Dat is een karakter.', 'gentle']]},
  { id: 'o16-pass-brug', trigger: 'after:O16:pass', needs: 'O16', lines: [
    ['A', 'Het Friese recht. Dat bestaat niet.', 'amused'],
    ['T', 'Nu wel. Hij vaart er nog steeds rond.', 'dry'],
    ['A', 'Hij gaat niet weg. Dat is ook Fries.', 'dry']]},
  { id: 'o16-pass-neven', trigger: 'after:O16:pass', needs: 'O16', lines: [
    ['T', 'Durk vertelde alles aan zijn neef.', 'dry'],
    ['A', 'Zijn neef zei: niet doorvertellen.', 'dry'],
    ['T', 'Het was al verteld.', 'deadpan']]},
  { id: 'o16-fail', trigger: 'after:O16:fail', needs: 'O16', lines: [
    ['A', 'Een konvooi kijkt ook achterom.', 'quiet'],
    ['T', 'Dat is niet eerlijk.', 'dry']]},
  { id: 'o17-pass-koets', trigger: 'after:O17:pass', needs: 'O17', lines: [
    ['T', 'Je haalde een rallyauto in met een koets.', 'dry'],
    ['A', 'Hij had een gazon nodig. Ik had er vier.', 'calm'],
    ['T', 'Dat is een voordeel.', 'dry']]},
  { id: 'o17-pass-wiegert', trigger: 'after:O17:pass', needs: 'O17', lines: [
    ['A', 'Meneer Wiegert had de mooiste dag van zijn leven.', 'warm'],
    ['T', 'Hij was veertig jaar koetsier.', 'dry'],
    ['A', 'Dan was dit de eerste dag.', 'warm']]},
  { id: 'o17-fail', trigger: 'after:O17:fail', needs: 'O17', lines: [
    ['A', 'Een koets stuurt als een kerk.', 'frustrated'],
    ['T', 'Dan had Geesje moeten rijden.', 'dry']]},
  { id: 'o18-pass-friteuse', trigger: 'after:O18:pass', needs: 'O18', lines: [
    ['T', 'Ik heb in een rallyauto gebakken.', 'dry'],
    ['A', 'Je hebt nog tien vingers.', 'amused'],
    ['T', 'Ze zijn allemaal heel. Dat is meer dan de eierballen.', 'deadpan']]},
  { id: 'o18-pass-koe', trigger: 'after:O18:pass', needs: 'O18', lines: [
    ['A', 'Hilko zag een koe.', 'dry'],
    ['T', 'Er was een koe.', 'dry'],
    ['A', 'Er was geen koe, Tammo.', 'exasperated'],
    ['T', 'Wij hebben hem niet gezien. Hij ook niet.', 'dry']]},
  { id: 'o18-fail', trigger: 'after:O18:fail', needs: 'O18', lines: [
    ['T', 'Negentien heel. Ik tel ze elke keer.', 'dry'],
    ['A', 'Bij de volgende sloot rij ik rechter. Of ik vlieg rechter.', 'quiet']]},
  { id: 'tr-leeuwarden', trigger: 'train:leeuwarden', needs: 'n-zuidhorn', lines: [
    ['A', 'Zuidhorn. Daarna Grijpskerk. Daarna Friesland. Ik kijk uit het raam naar het verschil.', 'dreamy'],
    ['T', 'Er is geen verschil. Het is hier ook land.', 'dry'],
    ['A', 'Friesland heeft een andere taal.', 'teasing'],
    ['T', 'En dezelfde koeien.', 'dry']]},
  { id: 'ferry-schier', trigger: 'ferry:schier', needs: 'O14', lines: [
    ['T', 'Je bent op Schier geweest.', 'dry'],
    ['A', 'Ik heb het eiland niet aangeraakt.', 'amused'],
    ['T', 'Dat is de enige manier.', 'dry']]},
```

### E. subtitles.js

```js
// subtitles.js GRO: lines shown in Gronings, with their Dutch (none new in F4b; "Valt mie nait of." and "…Braid noar de zin." exist from F4a)
  // (nothing to add)

// subtitles.js FY: Frisian lines (Jelle, Mem, Kapitein Sybren, Wybe and Wiebren), with their Dutch
  'Moai, Rikus. Jelle. Ik sta ook in Zoutkamp. Gezellig, zo bij elkaar.': 'Mooi, Rikus. Jelle. Ik sta ook in Zoutkamp. Gezellig, zo bij elkaar.',
  'Paling, Rikus. Alles wat glibberig en lekker is, is Fries. Wis en wrachtich.': 'Paling, Rikus. Alles wat glibberig en lekker is, is Fries. Echt waar.',
  'Grinzers! Moai dat jullie er zijn. Jullie zijn te laat. Ik ben altijd te vroeg. Dat is Fries.': 'Groningers! Mooi dat jullie er zijn. Jullie zijn te laat. Ik ben altijd te vroeg. Dat is Fries.',
  'Daarom: paling. Alle paling van het Wad gaat bij Fokko de Visser de kotter in. Fokko vaart hem naar Ubbo\'s rokerij. Zonder papieren. Foar mem.': 'Daarom: paling. Alle paling van het Wad gaat bij Fokko de Visser de kotter in. Fokko vaart hem naar Ubbo\'s rokerij. Zonder papieren. Voor mem.',
  'Oant sjen!': 'Tot ziens!',
  'Net fertelle.': 'Niet doorvertellen.',
  'Wy fertrekke. Hâld jo fêst, en jo hoed.': 'Wij vertrekken. Houd u vast, en uw hoed.',
  'Jimme sprongen. Ik seach it. De rinplanke wie al omheech. Dat is in "te let".': 'Jullie sprongen. Ik zag het. De loopplank was al omhoog. Dat is een "te laat".',
  'Gjin gedoch oan board. Dit is in fearboat, gjin kroech.': 'Geen gedoe aan boord. Dit is een veerboot, geen kroeg.',
  'Dan is er hjir gast. Ik ha gasten. Hâld him mar.': 'Dan is hij hier gast. Ik heb gasten. Houd hem maar.',
  'Ik rekkenje ôf yn ferhalen. Fertel it straks mar. Oan mem op Skier. Sy is der al.': 'Ik reken af in verhalen. Vertel het straks maar. Aan mem op Schier. Zij is er al.',
  'Dêr. Rottumeroer. Dêr mei gjinien hinne. Ik ek net. Ik sjoch.': 'Daar. Rottumeroog. Daar mag niemand heen. Ik ook niet. Ik kijk.',
  'Dat is de Waadsee. Dy lizze dêr al langer as ik.': 'Dat is de Waddenzee. Die liggen daar al langer dan ik.',
  'Famke! Jonge! Ik ken jimme fan de radio. Kom hjir, jou dy doaze oan in mem.': 'Meisje! Jongen! Ik ken jullie van de radio. Kom hier, geef die doos aan een moeder.',
  'Ik wachtte hier al. Jelle belde. Hy belt altyd te let. Mar ik ha gjin haast.': 'Ik wachtte hier al. Jelle belde. Hij belt altijd te laat. Maar ik heb geen haast.',
  'Wy kearen werom. Gjin kaartsje. Foar mem.': 'Wij keren terug. Geen kaartje. Voor mem.',
  'Wis en wrachtich! Een Fries mag altijd onder een brug door! Zolang ik eronder vaar, blijft hij open!': 'Echt waar! Een Fries mag altijd onder een brug door! Zolang ik eronder vaar, blijft hij open!',
  'Halt. Fryske grins. Paspoart, as it jo belieft.': 'Halt. Friese grens. Paspoort, alstublieft.',
  'Wy binne hjir net. Wy steane hjir gewoan.': 'Wij zijn hier niet. Wij staan hier gewoon.',
  'Net fertelle, Durk.': 'Niet doorvertellen, Durk.',
  'De brêge is iepen. De brêge bliuwt iepen. Dat is it Fryske rjocht.': 'De brug is open. De brug blijft open. Dat is het Friese recht.',
  'Stjoer ûnder it stjoer. Oan stjoerboard. In bytsje. Bytsje mear.': 'Stuur onder het roer. Aan stuurboord. Een beetje. Een beetje meer.',
  'Op \'e kade. Gjin skram. Goed dien.': 'Aan de kade. Geen kras. Goed gedaan.',
  'Wy komme oan. Net springe. Net hjoed.': 'Wij komen aan. Niet springen. Niet vandaag.',
  'Dat is it hiele eilân. Dêr komme jo foar.': 'Dat is het hele eiland. Daar komt u voor.',
  'Moai, Grinzers! Tige tank foar de race! Ik vaar mee!': 'Mooi, Groningers! Bedankt voor de race! Ik vaar mee!',
  'Wy oefenje foar de dyk.': 'Wij oefenen voor de dijk.',
  'Wy binne harren neven. Wy binne grutter.': 'Wij zijn hun neven. Wij zijn groter.',
  '…grutter.': '…groter.',
  'Jim meie troch. Mar net fertelle.': 'Jullie mogen door. Maar niet doorvertellen.',
  'Fryske grins. Wy kontrolearje.': 'Friese grens. Wij controleren.',
  'Of jo de goeie kant út geane.': 'Of u de goede kant op gaat.',
  '…Dizze.': '…Deze.',
  'Stopje! Fryske grinswacht! Stopje, mei jo tastimming!': 'Stop! Friese grenswacht! Stop, met uw toestemming!',
  'Wy hawwe in boat.': 'Wij hebben een boot.',
  'In grutte.': 'Een grote.',
  '…Grutter as wy tochten.': '…Groter dan we dachten.',
  'Wolkom yn Fryslân. Dit is in grins.': 'Welkom in Friesland. Dit is een grens.',
```

### F. scripts/gronings_spoken.json (toevoegingen)

Wat de stemmen zeggen: elke getoonde Nederlandse regel → de Groningse uitspraak (810 nieuwe regels; 24 regels die al in F4a of de bestaande tabel staan zijn niet herhaald). Zelfde spelling als de bestaande tabel (`nait`, `gain`, `mie`, `doe`, `n`, `t`, `veur`, `noar`). Friese sprekers (Jelle, Mem, Kapitein Sybren, Wybe, Wiebren, Durk, Douwe) staan er niet in: die spreken hun eigen taal (`lang: 'own'`). **Controle:** `node scripts/gronings_spoken_test.mjs` (cijfers gelijk, niet veel langer). Een redacteur met Gronings als moedertaal leest dit nog één keer na.

```json
{
"\"Natuurgebied. Hier is niemand welkom. Behalve de wind.\"":"\"Natuurgebied. Hier is niemand welkom. Behalve de wind.\"",
"Aan de kade. Geen kras. De havenmeester is tevreden. Dat gebeurt twee keer per jaar.":"Aan de kaai. Gain kras. De havenmeester is tevreden. Dat gebeurt twij keer per joar.",
"Achter iemand aan haast je. Naar iemand toe kijk je.":"Achter ain aan haast je. Noar ain toe kiek je.",
"Achthonderd kilo paling. Geen vergunning. Ontvanger: O.B. Rokerij.":"Achthonderd kilo paling. Gain vergunning. Ontvanger: O.B. Rokerij.",
"Aduard. Hier stond een abdij. De abdij is weg. Het dorp is gebleven. Dat is een soort winst.":"Aduard. Hier stond n abdij. De abdij is vot. t Dörp is bleven. Dat is n soort winst.",
"Aduarderzijl. Een zijl, een café en een stilte die tegen je aan komt zitten. Het diepje doet mee.":"Aduarderzijl. N zijl, n café en n stilte dij tegen die aan komt zitten. t Diepie dut mit.",
"Alleen koekjes.":"Aleen koekjes.",
"Als je wacht, blijf je staan. Als je loopt, ga je de goede kant op. Dit is lopen.":"As je wacht, blief je stoan. As je lopst, goa je de goie kaant op. Dit is lopen.",
"Alsof ze zich verstoppen.":"Aalsof zai zichzulf verstoppen.",
"Anders dan gepland.":"Aars as pland.",
"Bakens volgen. Rood links, groen rechts. De geul is smal. De plaat links is droog.":"Bakens volgen. Rood links, groen rechts. De geul is smal. De ploat links is dreug.",
"Banden lager. Dan grijpen ze. Hoger, dan glijden ze. Jij voelt het met je rug. Zei opa.":"Bannen lager. Dan griepen zai. Hoger, dan glieden zai. Doe veulst t mit je rug. Zee opa.",
"Banden zijn een begin. Een club met banden is een club.":"Bannen binnen n begin. N club mit bannen is n club.",
"Berm in. Het is hun weg. Hun houtwal.":"Berm in. t Is hun vot. Hun houtwal.",
"Bij de volgende sloot rij ik rechter. Of ik vlieg rechter.":"Bie de volgende sloot rie ik rechter. Of ik vlieg rechter.",
"Bijna is Fries voor te laat.":"Bieno is Fries veur te loat.",
"Boei één. Links. Jelle gaat rechts. Hij weet niet dat het links is.":"Boei ain. Links. Jelle goat rechts. Hai wait nait dat t links is.",
"Boei. Links. Wind van achter. Ik heb een zeil. Ik heb ook een motor. De motor is mijn plan B.":"Boei. Links. Wind van achter. Ik heb n zail. Ik heb ook n motor. De motor is mien plan B.",
"Bordje één naar Dolf. Warm. Warm is het hele punt.":"Bordje ain noar Dolf. Waarm. Waarm is t hele punt.",
"Brug. Hobbel. Springen. Niet kijken. Ik zei het al.":"Brug. Hobbel. Springen. Nait kieken. Ik zee t al.",
"Daar is de lucht groot. En mijn zus.":"Doar is de locht groot. En mien zus.",
"Daar is ze. ZK 53. Vierenzestig jaar. Ze vaart niet meer. Ze ligt graag.":"Doar is zai. ZK 53. Vierenzestig joar. Zai vaart nait meer. Zai ligt gaarn.",
"Daar staat een platform. Alleen bij helder weer. Mijn opa werkte ooit bij het gas. Hij sprak er nooit over. Hij keek alleen naar het Wad.":"Doar stait n platform. Aleen bie hailer weer. Mien opa werkte ooit bie t gas. Hai sprak der nooit over. Hai keek aleen noar t Wad.",
"Daar staat een weegbrug. Ze zijn te zwaar. Op elke as. Dus gaan ze via Friesland. Over het kanaal, om de weegbrug heen.":"Doar stait n weegbrug. Zai binnen te zwoar. Op elke as. Dus goan zai via Friesland. Over t kanaal, um de weegbrug hin.",
"Daar zijn we nog niks mee kwijt.":"Doar binnen wie nog niks mit kwiet.",
"Daar. Cassiopeia. Een W. Een W die zich verstopt.":"Doar. Cassiopeia. N W. N W dij zich verstopt.",
"Daar. Onder die kap. Dat is geen koets. Dat is een rallyauto met een gordijn.":"Doar. Onder dij kap. Dat is gain koets. Dat is n rallyauto mit n gerdien.",
"Daar. Rottumeroog. Zie je de hut? Daar wonen mensen die er voor zorgen. Verder niemand.":"Doar. Rottumeroog. Zai je de hut? Doar woonen mensen dij der veur zörgen. Verder niemand.",
"Daar. Ze gaan. Allemaal tegelijk, maar niet tegelijk. Dat is een golf die mag.":"Doar. Zai goan. Alle tegelieke, mor nait tegelieke. Dat is n golf dij mag.",
"Daarom hebben we Jelle. Hij woont er.":"Doarom hebben wie Jelle. Hai woont der.",
"Daarom hebben we een pick-up. Die is niet blauw.":"Doarom hebben wie n pick-up. Dij is nait blauw.",
"Daarom lopen we er niet tegenin.":"Doarom lopen wie der nait tegenin.",
"Dag mevrouw Sientje. Wij zijn de Fjord Frituur.":"Dag mevrouw Sientje. Wie binnen de Fjord Frituur.",
"Dames en heren, hier is de Zuidhorner kermis! Het is geen Uithuizen, maar het draait!":"Dames en heren, hier is de Zuudhorner kermis! t Is gain Uithuzen, mor t draait!",
"Dames en heren, welkom in het Rijtuigenhuis. Veertig koetsen. Eén brandspuit. Nul auto's.":"Dames en heren, welkom in t Rijtuigenhuus. Veertig koetsen. Ain brandspuit. Nul auto's.",
"Dan gaan we toch gewoon door.":"Dan goan wie toch gewoon deur.",
"Dan gaan wij ook over het gras. Een koets heeft meer vrijheid. Geen wegen nodig.":"Dan goan wie ook over t gras. N koets het meer vriedom. Gain wegen neudig.",
"Dan hadden jullie samen geschrokken. Dat bindt.":"Dan harren jim samen schrokken. Dat bindt.",
"Dan het boek.":"Dan t book.",
"Dan hoef je geen kist te verdedigen. Geef maar.":"Dan hoef je gain kist te verdedigen. Geef mor.",
"Dan is dit mijn voordeel.":"Dan is dit mien veurdail.",
"Dan is hij tenminste op tijd. Opnieuw.":"Dan is hai tenminst op tied. Opnij.",
"Dan komt het water eerder. Een uur, soms anderhalf. Hij weet dat. Hij denkt dat hij sneller is.":"Dan komt t woater aarder. N uur, soms anderhalf. Hai wait dat. Hai denkt dat hai sneller is.",
"Dan neem ik de buitenbocht. Daar ligt meer grind.":"Dan nem ik de boetenbocht. Doar ligt meer grind.",
"Dan rijden wij ook mee.":"Dan rieden wie ook mit.",
"Dan snij ik de bocht af. Door de wei. Hou je vast, meneer Wiegert.":"Dan snie ik de bocht af. Deur de wei. Hol je vast, menear Wiegert.",
"Dan was dit de eerste dag.":"Dan was dit de aarste dag.",
"Dan werkt het.":"Dan wark t.",
"Dan zijn jullie er nu langs.":"Dan binnen jim der nou langs.",
"Dan zijn ze nu eindelijk nat.":"Dan binnen zai nou aindelk nat.",
"Dan zorgen we dat de weegbrug naar hen toe komt.":"Dan zörgen wie dat de weegbrug noar hun toe komt.",
"Dat bord. Wat staat erop?":"Dat bord. Wat stait der op?",
"Dat dacht ik ook.":"Dat docht ik ook.",
"Dat doen we. Maar eerst eten.":"Dat doun wie. Mor aarst aiten.",
"Dat gebeurt. Jan en Alleman zijn er niet van geschrokken. Ik wel.":"Dat gebeurt. Jan en Alleman binnen der nait van schrokken. Ik wel.",
"Dat hoeft ook niet. Ik doe het voor het Wad. Niet voor jou.":"Dat hoeft ook nait. Ik doe t veur t Wad. Nait veur die.",
"Dat is altijd het advies geweest.":"Dat is aaltied t advies west.",
"Dat is buiten ons gebied.":"Dat is boeten ons gebied.",
"Dat is de Melkweg. Mijn oma noemt hem de Dijk van de Nacht.":"Dat is de Melkweg. Mien oma neumt hom de Diek van de Nacht.",
"Dat is de strekking.":"Dat is de strekking.",
"Dat is de tweede. Ik had er twee. De club heeft nog steeds geen auto. Als je tijd hebt.":"Dat is de twijde. Ik har der twij. De club het nog aaltied gain auto. As je tied hebben.",
"Dat is de vraag. Er is geen verwachting. Er is alleen tellen.":"Dat is de vroag. Der is gain verwachting. Der is aleen tellen.",
"Dat is de wereld op zijn kop.":"Dat is de wereld op zien kop.",
"Dat is een gewone zeehond. Die met die lange neus is een grijze. Hij is groter. Hij kijkt trotser.":"Dat is n gewone zeeheund. Dij mit dij lange noes is n grieze. Hai is grötter. Hai kiekt trotser.",
"Dat is een heleboel.":"Dat is n hail boel.",
"Dat is een kenmerk. En vanavond rijden de vrachtwagens. Denk daar maar aan.":"Dat is n kenmerk. En vanoavend rieden de vrachtwagens. Denk doar mor aan.",
"Dat is een landauer uit negentienhonderd!":"Dat is n landauer oet negentienhonderd!",
"Dat is een privéalbum.":"Dat is n privé-albom.",
"Dat is een voordeel.":"Dat is n veurdail.",
"Dat is er één die kijkt. Hij weet dat jij naar hem kijkt. Dat is wederzijds.":"Dat is der ain dij kiekt. Hai wait dat doe noar hom kiekst. Dat is wederzieds.",
"Dat is erg.":"Dat is erg.",
"Dat is geen ruzie.":"Dat is gain ruzie.",
"Dat is hem. Dat is Fokko. Hij zit tot zijn heupen in de klei.":"Dat is hom. Dat is Fokko. Hai zit tot zien heupen in de klei.",
"Dat is het eerste wat je ooit goed deed.":"Dat is t aarste wat doe ooit goud dust.",
"Dat is het enige wat ik vandaag begrijp. Lier gaat naar beneden. Ik vlieg zelf. Jij hangt. Dat zit je blijkbaar in.":"Dat is t ainige wat ik vandoage begriep. Lier goat noar beneden. Ik vlieg zulf. Doe hangst. Dat zit die blieke in.",
"Dat is het mooie. Het is leeg voor zichzelf.":"Dat is t mooie. t Is laig veur zichzulf.",
"Dat is het slimste wat ik ooit iemand heb zien verliezen.":"Dat is t slimste wat ik ooit ain heb zain verliezen.",
"Dat is koud.":"Dat is kold.",
"Dat is mijn bagage!":"Dat is mien bagage!",
"Dat is mijn nicht. Zij werkt aan een dijk.":"Dat is mien nicht. Zai warkt aan n diek.",
"Dat is mijn oma.":"Dat is mien oma.",
"Dat is mijn voordeel.":"Dat is mien veurdail.",
"Dat is mijn werk.":"Dat is mien wark.",
"Dat is mooi.":"Dat is mooi.",
"Dat is niet de schuld van de jury van Oldenhuis, oma?":"Dat is nait de schuld van de jury van Oldenhuis, oma?",
"Dat is niet eerlijk.":"Dat is nait aarlijk.",
"Dat is niet nodig. Hier. Eerst proeven. De rest is voor straks.":"Dat is nait neudig. Hier. Aarst proeven. De rest is veur straks.",
"Dat is niet voor jullie.":"Dat is nait veur jim.",
"Dat is ook een beker.":"Dat is ook n beker.",
"Dat is ook een manier om verdriet te hebben.":"Dat is ook n manier om verdriet te hebben.",
"Dat is ook een manier. Ik meld alleen.":"Dat is ook n manier. Ik meld aleen.",
"Dat is oud. Ze hebben het net bedacht.":"Dat is old. Zai hebben t net bedacht.",
"Dat is plan B.":"Dat is plan B.",
"Dat is plan B. Die is groter.":"Dat is plan B. Dij is grötter.",
"Dat is regel drie. Ik heb ze allemaal geleerd. Behalve de eerste.":"Dat is regel drij. Ik heb ze aal leerd. Behalve de aarste.",
"Dat is vaak het moeilijkste.":"Dat is vaak t moeilijkste.",
"Dat is van Ubbo. En Ubbo bijt.":"Dat is van Ubbo. En Ubbo bait.",
"Dat mag niet! Wie springt er nou op een boot?!":"Dat mag nait! Wel springt der nou op n boot?!",
"Dat mag. Dat is de beste foto.":"Dat mag. Dat is de beste foto.",
"Dat ook. Maar eerst Hinderk. Eén ding tegelijk. Rij me nog eens naar Bourtange, jong. Op die trekker. Als het zover is.":"Dat ook. Mor aarst Hinderk. Ain ding tegeliek. Rie mie nog ais noar Bourtange, jong. Op dij trekker. As t zo wied is.",
"Dat staat erop. In grote letters. O.B. Daarom.":"Dat stait der op. In grode letters. O.B. Doarom.",
"Dat vraag ik me ook af. Ik ken alleen zijn initialen. U.O.":"Dat vroag ik mie ook af. Ik ken aleen zien initialen. U.O.",
"Dat vraagt ze maar aan haar oma. Ik ben Gronings. Ik vergeet niks.":"Dat vroagt zai mor aan heur oma. Ik bin Gronings. Ik vergeet niks.",
"Dat was Hilko.":"Dat was Hilko.",
"Dat was de beste rondleiding in veertig jaar. Niemand viel in slaap.":"Dat was de beste rondlaiding in veertig joar. Niemand vol in slaop.",
"Dat was een rally. Een echte. Zonder auto van de club.":"Dat was n rally. N echte. Zonder auto van de club.",
"Dat was een sloot. Ik was bang voor een tel. Eén. Twee. Drie eierballen weg.":"Dat was n sloot. Ik was bang veur n tel. Ain. Twij. Drij aierballen vot.",
"Dat was een testrit, Rikus. Met een emmer.":"Dat was n testrit, Rikus. Mit n emmer.",
"Dat was het mooiste wat mijn kinderen ooit gezien hebben. Die zeehond keek terug.":"Dat was t mooiste wat mien kinder ooit zain hebben. Dij zeeheund keek weerom.",
"Dat was regel twee. Dat doet iedereen. Eén keer.":"Dat was regel twij. Dat dut iedereen. Ain keer.",
"Dat weet iedereen, oma.":"Dat wait iedereen, oma.",
"Dat weet ik. Daarom ben je hier.":"Dat wait ik. Doarom bist doe hier.",
"Dat zeggen ze ook van een boom.":"Dat zeggen zai ook van n boom.",
"Dat zegt ze. Ze heeft gelijk. Dat zeg ik niet vaak.":"Dat zegt zai. Zai het gelieke. Dat zeg ik nait vaak.",
"Dat zie je goed. Over een kwartier zie je alles.":"Dat zai je goud. Over n kertier zai je aals.",
"De Aal is weg. Door de sluis.":"De Aal is vot. Deur de sluus.",
"De Aal. Daar. Hij gaat de kolk in.":"De Aal. Doar. Hai goat de kolk in.",
"De achterste kijkt in de spiegel. Terug. Rustig.":"De achterste kiekt in de spiegel. Weerom. Rustig.",
"De baancommissarissen van vanmiddag. Alle drie. Met elk een bedrag en een handtekening.":"De boancommissarissen van vanmiddag. Alle drij. Mit elk n bedrag en n haandtekening.",
"De beukenlaan. Hij kan niet keren. Er staan beuken.":"De beukenloan. Hai kin nait keren. Der stoan beuken.",
"De boot is weg. Zonder mij.":"De boot is vot. Zonder mie.",
"De boot vertrok om vijf over zeven.":"De boot vertrok om vief over zeuven.",
"De borg van Pieterburen. Een huis achter een dijk met een stilte eromheen. Gewoon even staan.":"De borg van Pieterburen. N huus achter n diek mit n stilte omhin. Gewoon eefkes stoan.",
"De club bestaat.":"De club bestait.",
"De derde. Onder de derde truck. Langs de spiegel. Nu.":"De dairde. Onder de dairde truck. Langs de spiegel. Nou.",
"De dijkwerker zegt: het water komt anderhalf uur eerder. Wind uit het noordwesten.":"De dijkwarker zegt: t woater komt anderhalf uur aarder. Wind oet t noordwesten.",
"De eierbal wordt onderweg gebakken. Eén bijrijder bakt. Eén bestuurder rijdt. Wie het eerst finisht met minstens dertig van de veertig eierballen heel, wint. Opgesteld door de sponsor.":"De aierbal wordt ondervot bakken. Ain bieriedder bakt. Ain bestuurder riedt. Wel t aarst finisht mit minstens dertig van de veertig aierballen hail, wint. Opstald deur de sponsor.",
"De emmer is leeg. De motor niet.":"De emmer is laig. De motor nait.",
"De fiets die Oma terugwil.":"De fiets dij Oma weerom wil.",
"De flitspaal. Ik heb remgelopen. Hij heeft niks gezien. Hij staat er voor de sier.":"De flitspaal. Ik heb remgeloop. Hai het niks zain. Hai stait der veur de sier.",
"De gemeente wil bewijs dat we bestaan. Drie tijdritten op grind. Mijn neef Gerben leent zijn auto. Jij rijdt. Ik lees.":"De gemainte wil bewies dat wie bestoan. Drij tiedritten op grind. Mien noaf Gerben leent zien auto. Doe riedst. Ik lees.",
"De gracht! Hij komt op de gracht af! Hij remt niet!":"De gracht! Hai komt op de gracht af! Hai remt nait!",
"De kar. Met een kist. O.B. aan de zijkant. En de boot vertrekt over drie minuten.":"De kar. Mit n kist. O.B. aan de kaant. En de boot vertrekt over drij menuten.",
"De koets staat in de beuk.":"De koets stait in de beuk.",
"De laatste visafslag voor de zee. En hij is dicht. De zee is open. Dat is het verschil.":"De lèste visafslag veur de zee. En hai is dicht. De zee is open. Dat is t verschil.",
"De loopplank gaat omhoog! Niet springen!":"De loopplank goat omhoog! Nait springen!",
"De maïs is binnen. Nu de mensen nog. Bier staat klaar.":"De mais is binnen. Nou de mensen nog. Bier stait klaar.",
"De maïs vliegt. Hij hoeft niet. Hij doet het toch.":"De mais vlugt. Hai hoeft nait. Hai dut t toch.",
"De molenaar telde drie witte vrachtwagens langs zijn molen. Henk heeft nog een zender. In het handschoenenvak van de Fjord. Hij vraagt niet waarom.":"De molenoar telde drij witte vrachtwagens langs zien molen. Henk het nog n zender. In t handschoenenvak van de Fjord. Hai vroagt nait woarom.",
"De motor sloeg af.":"De motor sloeg af.",
"De sluis sluit. De eerste die dat niet merkt, gaat de zee op. Dat is meestal een toerist.":"De sluus sluit. De aarste dij dat nait merkt, goat de zee op. Dat is meestal n toerist.",
"De sluis van Zoutkamp. Water aan de ene kant, water aan de andere. Het scheelt twintig centimeter. Dat is genoeg voor een sluiswachter.":"De sluus van Zoutkamp. Woater aan de ainen kaant, woater aan de aandere. t Scheelt twientig centimeter. Dat is genoeg veur n sluuswachter.",
"De sluis. Deuren open. Toeter, Tammo.":"De sluus. Deuren open. Toeter, Tammo.",
"De sluizen van Lauwersoog. Aan de ene kant het meer, aan de andere kant de zee. De deuren zijn zwaar. Ze weten het.":"De sluzen van Lauwersoog. Aan de ainen kaant t meer, aan de aandere kaant de zee. De deuren binnen zwoar. Zai waiten t.",
"De sponsor krijgt het vanavond. Wietse uit Leek. Hij sponsort met banden. Dat is het.":"De sponsor kriegt t vanoavend. Wietse oet Leek. Hai sponsort mit bannen. Dat is t.",
"De sprong was bedoeld voor vier over.":"De sprong was bedoeld veur vaar over.",
"De teugels. Links trekken is links. Rechts is rechts. De paarden doen de rest. Ze hebben een mening.":"De teugels. Links trekken is links. Rechts is rechts. De peerden doun de rest. Zai hebben n mainen.",
"De torenwachter belde. Zijn neven in het noorden hadden ook gebeld: een dijkwerker, een molenaar. De meldersbond groeit.":"De torenwachter belde. Zien noaven in t noorden harren ook beld: n diekwarker, n molenoar. De meldersbond groait.",
"De turbo ligt bij Wietse in Leek. Onder de werkbank. In een melkbus. Ik weet niet waarom. Ik vraag het ook niet.":"De turbo ligt bie Wietse in Leek. Onder de warkbank. In n melkbus. Ik wait nait woarom. Ik vroag t ook nait.",
"De veerpier van Lauwersoog. Hier vertrekt de boot naar Schier. Het eiland is er niet. Het is een streep. Maar hij komt.":"De veerpier van Lauwersoog. Hier vertrekt de boot noar Schier. t Aailand is der nait. t Is n streep. Mor hai komt.",
"De vloed komt. Niet sneller dan de tabel. Wel stiller. Dat is zijn manier.":"De vloed komt. Nait sneller as de tabel. Wel stiller. Dat is zien manier.",
"De voorronde Wadkust gaat naar de Fjord Frituur. Ik meld alleen.":"De voorronde Wadkust goat noar de Fjord Frituur. Ik meld aleen.",
"De voorronde Westerkwartier gaat naar de Fjord Frituur. De eierballen zijn warm. De rest is van de rest.":"De voorronde Westerkwartier goat noar de Fjord Frituur. De aierballen binnen waarm. De rest is van de rest.",
"De vorige penningmeester verkocht de clubauto. Voor een koffiemachine. De koffiemachine is stuk. De auto rijdt nog.":"De vorige penningmaister verkocht de clubauto. Veur n koffiemachine. De koffiemachine is stuk. De auto riedt nog.",
"De zender zit. De brug blijft open. Jelle blijft varen.":"De zender zit. De brug blift open. Jelle blift varen.",
"Derde. Zes meter. Dit is de lange. Voluit. Niet kijken.":"Dairde. Zes meter. Dit is de lange. Voluit. Nait kieken.",
"Deze is te klein. Terug. Hij komt volgend jaar. Dan is hij groter.":"Disse is te klaain. Weerom. Hai komt volgend joar. Dan is hai grötter.",
"Die bel is van mij. Ze bellen er al zeventig jaar mee. Ik heb er nooit zelf op gebeld.":"Dij bel is van mie. Zai bellen der al zeventig joar mit. Ik heb der nooit zulf op beld.",
"Die boei. Ik heb hem in 1973 de weg gewezen. Hij belt sindsdien als hij dank wil zeggen.":"Dij boei. Ik heb hom in 1973 de vot wezen. Hai belt sindsdien as hai dank wil zeggen.",
"Die drijft.":"Dij drift.",
"Die is van opa. Hij blijft van opa. Maar hij mag in de schuur.":"Dij is van opa. Hai blift van opa. Mor hai mag in de schuur.",
"Die ken ik niet. Maar dat klinkt familie.":"Dij ken ik nait. Mor dat klinkt femilie.",
"Die lamp had een eigen mening.":"Dij lamp har n aigen mainen.",
"Die staat in onze schuur. Onder een zeil. Ze durft hem niet terug te brengen. Dan moet ze zeggen waarom het zeventig jaar duurde.":"Dij stait in oenze schuur. Onder n zeil. Zai dur hom nait weerom te brengen. Dan mout zai zeggen woarom t zeventig joar duurde.",
"Die zien je op de foto. Van ver. Dat is mooier.":"Dij zain die op de foto. Van ver. Dat is mooier.",
"Die zijn het makkelijkst.":"Dij binnen t makkelkst.",
"Dijkstra is in de lucht. Vier minuten.":"Dijkstra is in de locht. Vaar menuten.",
"Dit is Rottumeroog. Hier mag niemand komen. Ook ik niet, eigenlijk. Ik werk hier.":"Dit is Rottumeroog. Hier mag niemand komen. Ook ik nait, aigenlk. Ik wark hier.",
"Dit is de Lauwersmeerdijk. De grens is daar. Met een bord.":"Dit is de Lauwersmeerdiek. De grens is doar. Mit n bord.",
"Dit is de mooiste dag van mijn leven! Nog nooit zo hard gereden!":"Dit is de mooiste dag van mien leven! Nog nooit zo haard riedt!",
"Dit is een weg.":"Dit is n vot.",
"Dit is geen circuit. Het is een parkeerterrein. Ga naar huis.":"Dit is gain circuit. t Is n parkeerterrein. Ga noar huus.",
"Dit is jouw auto. Met enveloppen in de portieren.":"Dit is dien auto. Mit enveloppen in de portieren.",
"Dit paard is zeven. Hij vindt jou aardig. Dat is een prijs op zich.":"Dit peerd is zeuven. Hai vindt die aardig. Dat is n prieze op zichzulf.",
"Dit was een weg. Nu is het een hunebed. Het is een verbetering.":"Dit was n vot. Nou is t n hunebed. t Is n verbetering.",
"Doar achter is Drenthe. Drenthe is dicht. Het hunebed ligt er al vijfduizend jaar. Ik kan er niks aan doen.":"Doar achter is Drenthe. Drenthe is dicht. t Hunebed ligt der al vieftuzend joar. Ik kin der niks aan doen.",
"Doar achter is Drenthe. Het hunebed zegt dat het dicht is. Dat zegt hij al vijfduizend jaar.":"Doar achter is Drenthe. t Hunebed zegt dat t dicht is. Dat zegt hai al vieftuzend joar.",
"Dolf. Achtentwintigduizend. Dat staat hier. Met mijn handtekening.":"Dolf. Achtentwintigduizend. Dat stait hier. Mit mien haandtekening.",
"Dolf. Visser. Ik zeg weinig. Dat komt door de schuld.":"Dolf. Visser. Ik zeg wainig. Dat komt deur de schuld.",
"Draaf! Draaf! Anders gaan ze wandelen! Jan is vijftien. Alleman is veertien. Dat is een leeftijd.":"Draaf! Draaf! Aars goan zai wanneln! Jan is vieftien. Alleman is veertien. Dat is n leeftied.",
"Drie namen. Drie bedragen. Drie handtekeningen. Ik heb ze allemaal.":"Drij nammen. Drij bedragen. Drij haandtekeningen. Ik heb ze aal.",
"Drie regels. Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen.":"Drij regels. Ain: de gids bepaalt. Twij: je kiekst noar t woater, nait noar je veuten. Drij: je lopst nooit aleen.",
"Drie sloten. Rechts, schans, landen. Niet remmen in de lucht.":"Drij sloten. Rechts, schans, landen. Nait remmen in de locht.",
"Drie: je loopt nooit alleen.":"Drij: je lopst nooit aleen.",
"Drone klaar! Drie sloten, één take! Ik heb geen tweede batterij!":"Drone klaar! Drij sloten, ain take! Ik heb gain twijde batterij!",
"Durk vertelde alles aan zijn neef.":"Durk vertelde aals aan zien noaf.",
"Een Fjord Frituur aan de kade. De Wad-eierbal, met zeekraal.":"N Fjord Frituur aan de kaai. De Wad-aierbal, mit zeekraal.",
"Een andere Geertje. Gelukkig.":"N aander Geertje. Gelukkig.",
"Een bakje. Voor onderweg. Geen vis, geen garnaal, een bakje.":"N bakkie. Veur ondervot. Gain vis, gain garnoal, n bakkie.",
"Een basis, Tammo. Geen wagen. Een basis.":"N basis, Tammo. Gain wagen. N basis.",
"Een boek. Jelle had gelijk.":"N book. Jelle har gelieke.",
"Een bus die op het water rijdt. Dat is een boot met ambities.":"Ain bus dij op t woater riedt. Dat is n boot mit ambities.",
"Een bus. Twee mannen. Ze hangen paling over uit een tank. Hij leeft.":"N bus. Twij mannen. Zai hangen paling over oet n tank. Hai leeft.",
"Een grootboek.":"N grootbook.",
"Een koets haalt een rallyauto in. Dat staat vanaf nu in het gastenboek.":"N koets haalt n rallyauto in. Dat stait vanof nou in t gastenbook.",
"Een koets stuurt als een kerk.":"N koets stuurt as n kerk.",
"Een koets! Een koets tegen een rallyauto! Wie bedenkt zoiets?!":"N koets! N koets tegen n rallyauto! Wel bedenkt zoks?!",
"Een konvooi kijkt ook achterom.":"N konvooi kiekt ook achterom.",
"Een kotter. Dan heb jij eindelijk een huis dat ook kan zinken.":"N kotter. Dan hest doe aindelk n huus dat ook kin zinken.",
"Een lamp op de dijk. En ik ben heel zichtbaar.":"N lamp op de diek. En ik bin hail zichtboar.",
"Een lamp. Daar. Op! Op de grond, Tammo.":"N lamp. Doar. Op! Op de grond, Tammo.",
"Een reiger. Heeft hij je gezien?":"N reiger. Het hai die zain?",
"Een reiger. Hij schrok net zo hard als ik.":"N reiger. Hai schrok net zo haard as ik.",
"Een schelp. Mag ze hem houden?":"N schaal. Mag zai hom holen?",
"Een schuur in Leek. Een luik in de muur. Tinus zegt dat het naar koeien ruikt. Het ruikt naar haver.":"N schuur in Leek. N luik in de muur. Tinus zegt dat t noar kij rukt. t Rukt noar haver.",
"Een trekker kan ik. Een trekker oordeelt niet.":"Ain trekker kin ik. Ain trekker oordailt nait.",
"Een turbo in een melkbus. Dat is Leek.":"N turbo in n melkbus. Dat is Leek.",
"Een zeehond! Eén! Ik pak hem! Mijn volgers!":"N zeeheund! Ain! Ik pak hom! Mien volgers!",
"Eenendertig. Dat is meer dan genoeg. Niemand ademen.":"Eenendartig. Dat is meer as genoeg. Niemand aanden.",
"Eerst Fokko. Dan Tammo. De gids gaat als laatste.":"Aarst Fokko. Dan Tammo. De gids goat as lèste.",
"Eerste lading draait. Vier eierballen schuin. Tessa, bocht rustig.":"Aarste lading draait. Vaar aierballen schoef. Tessa, bocht rustig.",
"Eerste lading. Zestig tellen. Zeekraal erin. Het ruikt naar zee.":"Aarste lading. Zestig tellen. Zeekraal der in. t Rukt noar zee.",
"Eerste sloot. Vier meter. Gas, niet remmen, niet piekeren.":"Aarste sloot. Vaar meter. Gas, nait remmen, nait piekeren.",
"Eierballen: eenendertig van veertig heel. Tijd: zeven minuten tweeëntwintig.":"Aierballen: eenendartig van veertig hail. Tied: zeuven menuten twij-en-twintig.",
"Eindelijk. Iemand die harder rijdt dan ik. Dat is een opluchting.":"Aindelk. Ain dij haarder riedt as ik. Dat is n opluchting.",
"Elke as te zwaar. Dat is zijn grootste fout.":"Elke as te zwoar. Dat is zien grootste fout.",
"En Jelle?":"En Jelle?",
"En de auto?":"En de auto?",
"En de mensen komen terug. Dat is het mooie.":"En de mensen komen weerom. Dat is t mooie.",
"En de naam Fenna? Ik ken een molenaar die zo heet.":"En de noam Fenna? Ik ken n molenoar dij zo hait.",
"En de trekkertrek, Tinus?":"En de trekkertrek, Tinus?",
"En die kotter naast mij?":"En dij kotter noast mie?",
"En een boot waar je op sprong.":"En n boot woar doe op sprong.",
"En een kotter die nooit vaart.":"En n kotter dij nooit vaart.",
"En het boek, Jelle?":"En t book, Jelle?",
"En jullie mogen de trekker lenen. Niet houden. Hij is van opa. Hij blijft van opa.":"En jim mogen de trekker lenen. Nait holen. Hai is van opa. Hai blift van opa.",
"En nu de finale! Tinus, een jongen met een emmer! Tegen Hilko Kremer, de man met de sponsor!":"En nou de finale! Tinus, n jong mit n emmer! Tegen Hilko Kremer, de man mit de sponsor!",
"En nu een Stadjer op een trekker! Hij trekt niet hard. Hij trekt wel steeds!":"En nou n Stadjer op n trekker! Hai trekt nait haard. Hai trekt wel aaltied!",
"En nu vooral toeristen met een visje in hun hoofd.":"En nou vooral toeristen mit n visje in hun kop.",
"En nu voorgebakken.":"En nou veurbakken.",
"En wat doe je dan?":"En wat dust doe dan?",
"En wat meldt u?":"En wat meldt u?",
"En welke is de goede kant?":"En wel is de goie kaant?",
"Er komt een kotter uit het haventje. Toeteren.":"Der komt n kotter oet t haventje. Toeteren.",
"Er ligt een kotter in de haven met een naam van zilver. Hij vaart nooit overdag. Ik meld alleen.":"Der ligt n kotter in de haven mit n noam van zulver. Hai vaart nooit overdag. Ik meld aleen.",
"Er rijden 's nachts drie witte vrachtwagens langs mijn molen. Zonder naam. Ze rijden niet naar Friesland. Ze rijden er langs. Ik meld alleen.":"Der rieden s nachts drij witte vrachtwagens langs mien molen. Zonder noam. Zai rieden nait noar Friesland. Zai rieden der langs. Ik meld aleen.",
"Er staan twee knechten bij het luik in de schuur. Zij hebben een busje. Ik meld alleen.":"Der stoan twij knechten bie t luik in de schuur. Zai hebben n busie. Ik meld aleen.",
"Er staat een trekker in.":"Der stait n trekker in.",
"Er stond geen koe.":"Der stond gain kou.",
"Er was een koe.":"Der was n kou.",
"Er was geen brug.":"Der was gain brug.",
"Er was geen koe, Tammo.":"Der was gain kou, Tammo.",
"Er was ook nooit een tweede auto.":"Der was ook nooit n twijde auto.",
"Er zijn geen papieren.":"Der binnen gain pepieren.",
"Er zit een bocht aan. Lichten uit tot de bocht. Nu.":"Der zit n bocht aan. Lichten oet tot de bocht. Nou.",
"Erf. Trekker. Evert steekt over. Hij kijkt altijd naar links. Hij is Evert.":"Erf. Trekker. Evert stekt over. Hai kiekt aaltied noar links. Hai is Evert.",
"Evert. Gewichten. Dertig stuks. Ze zijn van beton en ze zijn van mijn vader. Breng ze terug. En nog een beetje meer.":"Evert. Gewichten. Dertig stuks. Zai binnen van beton en zai binnen van mien voader. Breng ze weerom. En nog n betje meer.",
"Excuses voor de vertraging. Ik was even op Schier.":"Excuses veur de vertroging. Ik was ais op Schier.",
"Ezinge. Een wierde waar echte archeologen gegraven hebben. Nu graaft niemand meer. Er staat een dorp bovenop.":"Ezinge. N wierde woar echte archeologen graven hebben. Nou graaft niemand meer. Der stait n dörp bovenop.",
"Eén koe. Misschien.":"Ain kou. Misschien.",
"Eén minder. Hij is nat en tevreden.":"Ain minder. Hai is nat en tevreden.",
"Eén minuut stilte. Voor een abdij die weg is. En voor een dorp dat bleef. Welterusten, Aduard.":"Ain menuut stilte. Veur n abdij dij vot is. En veur n dörp dat bleef. Welterusten, Aduard.",
"Eén take betekent dat ik niet in de sloot mag.":"Ain take betekent dat ik nait in de sloot mag.",
"Eén take. Dat is een recht van de rallyrijder.":"Ain take. Dat is n recht van de rallyrieder.",
"Eén voor één. Zachte stappen. Het Wad is zacht en dat is niet erg.":"Ain veur ain. Zachte stappen. t Wad is zacht en dat is nait erg.",
"Eén. Een bedrag. Een naam. Een handtekening. Twee. Drie. Ik fotografeer alles.":"Ain. N bedrag. N noam. N haandtekening. Twij. Drij. Ik fotografeer aals.",
"Eén: de gids bepaalt.":"Ain: de gids bepaalt.",
"Fenna zegt: het water wint altijd.":"Fenna zegt: t woater wint aaltied.",
"Filiaal: Lauwersoog. Sientje bakt alleen als het stil is. Het is bijna altijd stil.":"Filiaal: Lauwersoog. Sientje bakt aleen as t stil is. t Is bieno aaltied stil.",
"Finish! Een-minuut-vier-en-vijftig! Het verschil is een stopwatchfout. Of een Stadjer.":"Finish! Ain-menuut-vaar-en-vieftig! t Verschil is n stopwatchfout. Of n Stadjer.",
"Finish! Zeven twee-en-twintig! De stopwatch lijkt het niet te geloven!":"Finish! Zeuven twij-en-twintig! De stopwatch liekt t nait te geloven!",
"Fokko heeft het deel. Fokko heeft het Wad. Ik laat mijn oma niet van een boek afhangen.":"Fokko het t diel. Fokko het t Wad. Ik loat mien oma nait van n book afhangen.",
"Fokko kent het Wad. Dat is het probleem. Het Wad heeft in de laatste storm een nieuw gat gemaakt. Hij loopt in het oude.":"Fokko kent t Wad. Dat is t probleem. t Wad het in de lèste storm n nij gat moakt. Hai lopt in t olle.",
"Fokko liep net het Wad op. Alleen, met een rugzak, bij eb. Fenna zegt dat hij iets heel doms doet.":"Fokko liep net t Wad op. Aleen, mit n rugzak, bie eb. Fenna zegt dat hai wat hail doms dut.",
"Fokko. Niet trekken. Als je trekt, zak je dieper. Tammo: plat. Op je buik. Gewicht verdelen.":"Fokko. Nait trekken. As je trekst, zak je deper. Tammo: plat. Op je buuk. Gewicht verdailen.",
"Foto drie. Rechts. Eenendertig. Ik zie een zeehond die niets doet. Dat is ook een soort talent.":"Foto drij. Rechts. Eenendartig. Ik zai n zeeheund dij niks dut. Dat is ook n soort talent.",
"Foto twee. Midden. Honderdtwaalf. Een pup. Ik zie een pup.":"Foto twij. Midden. Honderdtwaalf. N pup. Ik zai n pup.",
"Foto één. Links. Zeventig.":"Foto ain. Links. Zeuventig.",
"Ga weg. Ik red me wel.":"Ga vot. Ik red mie wel.",
"Ga. Ik red de eierballen. Ik bak niet beter als jij kijkt.":"Ga. Ik red de aierballen. Ik bak nait beter as doe kiekst.",
"Gaat u erachteraan?":"Goa je der achteraan?",
"Ganzen. Op de weg. Ze lopen. Ze vliegen niet. Ze hebben het druk.":"Ganzen. Op de weg. Zai lopen. Zai vliegen nait. Zai hebben t drok.",
"Garnwerd. Een dorp aan het Reitdiep, met een kerk en een uitzicht op een bocht. De bocht is bijna beroemd.":"Garnwerd. N dörp aan t Reitdiep, mit n kerk en n oetzicht op n bocht. De bocht is bieno beroemd.",
"Gas. Niet te veel. Hij voelt je. Alle trekkers voelen je. Dat zegt niemand.":"Gas. Nait te veul. Hai veult die. Alle trekkers veulen die. Dat zegt niemand.",
"Gat. Zestig centimeter. Rechtdoor, geen bocht.":"Gat. Zestig centimeter. Rechtdeur, gain bocht.",
"Geen gedoe. Alleen een kist. Die is van een man in Lauwersoog die hem niet mag bezitten.":"Gain gedoe. Aleen n kist. Dij is van n man in Lauwersoog dij hom nait mag bezitten.",
"Geen lamp. Je ogen hebben tien minuten nodig. Daarna zie je meer dan ooit.":"Gain lamp. Je ogen hebben tien menuten neudig. Doarnoa zai je meer as ooit.",
"Geertje. Die ken ik. Ze is kampioen.":"Geertje. Dij ken ik. Zai is kampioen.",
"Gewogen en te zwaar bevonden. Op elke as. Dat is een prestatie.":"Wegen en te zwoar bevonden. Op elke as. Dat is n prestatie.",
"Goedemorgen. Ik ben Fenna. Drie regels. Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen. Jij loopt achteraan. Jij bent mijn ogen.":"Goedemörn. Ik bin Fenna. Drij regels. Ain: de gids bepaalt. Twij: je kieken noar t woater, nait noar je veuten. Drij: je lopen nooit aleen. Doe lopst achteraan. Doe bist mien ogen.",
"Goud.":"Goud.",
"Grijpskerk. Het laatste station voor Friesland. Daarna gaat de trein door, maar hij kijkt erbij of het mag.":"Grijpskerk. t Lèste station veur Friesland. Doarnoa goat de trein deur, mor hai kiekt derbie of t mag.",
"Groep staat. Negen. Ik tel nog eens. Jij loopt achteraan en roept als iemand achterblijft.":"Groep stait. Negen. Ik tel nog ais. Doe lopst achteraan en roepst as ain achterblift.",
"Havenfeest! Iedereen op de pier! Niemand in het water! Dat is het hele programma!":"Havenfeest! Iedereen op de pier! Niemand in t woater! Dat is t hele programma!",
"Heb je het bier alvast ingeladen?":"Hest doe t bier al ingeloaden?",
"Hebben jullie een koe gezien? Zwart-wit. Ze heet Geertje. Niet die van Ome Jan.":"Hebben jim n kou zain? Zwart-wit. Zai hait Geertje. Nait dij van Ome Jan.",
"Heeft hij een kaartje?":"Het hai n kaartje?",
"Hendrik. Dat is mijn schuld ook.":"Hendrik. Dat is mien schuld ook.",
"Hendrik. Elfduizend. Met de mijne.":"Hendrik. Elfduizend. Mit de mien.",
"Henk belt. Hij zegt: schroefje los, voor het handschoenenvak. Hij vraagt niet waarom.":"Henk belt. Hai zegt: schroefie los, veur t handschoenenvak. Hai vroagt nait woarom.",
"Henk. Natuurlijk.":"Henk. Natuurlijk.",
"Het Friese recht. Dat bestaat niet.":"t Friese recht. Dat bestait nait.",
"Het Friese recht. Dat is nieuw.":"t Friese recht. Dat is nij.",
"Het Lauwersmeer is donker. Geen koplampen na zonsondergang. De uilen vinden dat ook.":"t Lauwersmeer is duuster. Gain koplampen noa zunsondergang. De ulen vienen dat ook.",
"Het Lauwersmeer. Het donkerste stuk van Nederland. De sterren komen er gratis bij. Maar je moet je lamp uitdoen.":"t Lauwersmeer. t Duusterste stuk van Nederland. De starren komen der gratis bie. Mor je mouten je lamp oetdoun.",
"Het Van Starkenborghkanaal. Het gaat helemaal naar Friesland. Het wil er niet naartoe. Maar het heeft geen keus.":"t Van Starkenborghkanaal. t Goat hailemoal noar Friesland. t Wil der nait noartoe. Mor t het gain keus.",
"Het Wad heeft ze nu.":"t Wad het ze nou.",
"Het Zeehondenhuis in Pieterburen. Zeehonden die even bijkomen. Ze kijken er verbaasd bij, zoals alle zeehonden.":"t Zeeheundenhuus in Pieterburen. Zeeheunden dij eefkes bietkomen. Zai kieken der verbaasd bie, zoas aal zeeheunden.",
"Het blok is gratis. Je moet hem er zelf uit tillen. Dat is mijn tarief.":"t Blok is gratis. Je mouten hom der zulf oet tillen. Dat is mien tarief.",
"Het gat achter ons is vol. Twee meter. We kunnen niet terug. De hoogste plaat, daar. Nu.":"t Gat achter ons is vol. Twij meter. Wie kinnen nait weerom. De hoogste ploat, doar. Nou.",
"Het is Jelle. In dat bootje. Met die vlag.":"t Is Jelle. In dat bootie. Mit dij vlag.",
"Het is donker genoeg als je stilstaat.":"t Is duuster genoeg as je stilstoanst.",
"Het is een bewijsstuk. Het drijft.":"t Is n bewiesstuk. t Dräft.",
"Het is een film. Alleen met kippen.":"t Is n film. Aleen mit kippen.",
"Het is een grotere laars dan ik. Hij is heel gelukkig.":"t Is n grötter loarze as ik. Hai is hail gelokkig.",
"Het is een koets. Hij heeft geen rem. Hij heeft een mening.":"t Is n koets. Hai het gain rem. Hai het n mainen.",
"Het is een trekker, geen vrijgezellenfeest.":"t Is n trekker, gain vrijgezellenfeest.",
"Het is een vrachtwagen, Tammo. Alles aan hem is breed.":"t Is n vrachtwagen, Tammo. Aals aan hom is bree.",
"Het is geen verlies. Het is een foto.":"t Is gain verlies. t Is n foto.",
"Het is het Wad. Dat is van iedereen. Ik heb alleen de papieren.":"t Is t Wad. Dat is van iedereen. Ik heb aleen de pepieren.",
"Het is mooier dan ik dacht. En het is leeg.":"t Is mooier as ik docht. En t is laig.",
"Het is niet erg. Morgen is het ook donker.":"t Is nait erg. Mörn is t ook duuster.",
"Het is voor je zeehond. Die volgt je niet.":"t Is veur je zeeheund. Dij volgt die nait.",
"Het naamkaartje zegt niet wie het betaald heeft.":"t Noamkaartje zegt nait wel t betoald het.",
"Het pandrecht is weg. De pagina's zijn van ons.":"t Pandrecht is vot. De bladzies binnen van ons.",
"Het spijt me van uw bakkerij.":"t Spiet mie van oenze bakkerij.",
"Het staat erin. Met een pen. Dat is langer dan een auto.":"t Stait derin. Mit n pen. Dat is langer as n auto.",
"Het stond niet in het rooster. Ik heb het er nu onder \"wad\" in gezet.":"t Stond nait in t rooster. Ik heb t der nou onder \"Wad\" in zet.",
"Het was al verteld.":"t Was al vertold.",
"Het was dichtbij.":"t Was dichtbie.",
"Het was… niet eng. Het was groot. Dat is anders.":"t Was… nait eng. t Was groot. Dat is aars.",
"Het water wint altijd. Daarom lopen we er niet tegenin. Opnieuw, en eerder.":"t Woater wint aaltied. Doarom lopen wie der nait tegenin. Opnij, en aarder.",
"Het zeil klapt. Dat is een mening.":"t Zail klapt. Dat is n mainen.",
"Het ziet eruit als een film.":"t Zocht uut as n film.",
"Hier houdt het land op. Daarachter is alleen nog water. En soms ook niet. Kon minder.":"Hier holdt t laand op. Doarachter is aleen nog woater. En soms ook nait. Kon minder.",
"Hier is de kustwacht. Het Wad houdt hier op. Daarachter is de zee. Daar kom je niet terug van zonder motor.":"Hier is de kustwacht. t Wad holdt hier op. Doarachter is de zee. Doar komst nait weerom van zonder motor.",
"Hier wordt niet gepraat over schulden. Hier wordt geproefd.":"Hier wordt nait proat over schulden. Hier wordt proefd.",
"Hier. De Gouden Moersleutel. Ik heb hem gekocht. Van de penningmeester. Voor een koffiemachine.":"Hier. De Gouden Moersleutel. Ik heb hom kocht. Van de penningmaister. Veur n koffiemachine.",
"Hier. De schuur van opa. Hij is van mij nu. Hij is van jullie, zolang jullie willen.":"Hier. De schuur van opa. Hai is van mie nou. Hai is van jim, zolang jim willen.",
"Hier. Een zak haver. Meer heb ik niet. Hij is wel goed.":"Hier. N zak haver. Meer heb ik nait. Hai is wel goud.",
"Hij belde gisteren. Hij zei: ik vraag niet waarom. Dat was alles. Ik vond het heel veel.":"Hai belde gistern. Hai zee: ik vroag nait woarom. Dat was aals. Ik vun t hail veul.",
"Hij doet het niet. Hij deed het nooit. Vandaag ook niet.":"Hai dut t nait. Hai deed t nooit. Vandoage ook nait.",
"Hij gaat altijd net voor het einde af. Dat is een karakter.":"Hai goat aaltied net veur t aande af. Dat is n karakter.",
"Hij gaat niet weg. Dat is ook Fries.":"Hai goat nait vot. Dat is ook Fries.",
"Hij gaat opzij omdat hij bang is.":"Hai goat opzied omdat hai bang is.",
"Hij gaat opzij. Ze gaan altijd opzij voor een dame in een sloep.":"Hai goat opzied. Zai goan aaltied opzied veur n dame in n sloep.",
"Hij had een gazon nodig. Ik had er vier.":"Hai har n gazon neudig. Ik har der vaar.",
"Hij had een zwemvest aan en het ging toch mis.":"Hai har n zwemvest aan en t ging toch mis.",
"Hij heeft een wiel verloren.":"Hai het n wiel verlezen.",
"Hij heeft geen stuur. Hij heeft touwen.":"Hai het gain stuur. Hai het touwen.",
"Hij heeft gelijk. Het is niet van ons.":"Hai het gelieke. t Is nait van ons.",
"Hij heeft vier velgen en een uitlaat.":"Hai het vaar velgen en n oetlaat.",
"Hij is een uur geleden gegaan. Rugzak, een kar met een motor. Hij loopt naar de Simonszand.":"Hai is n uur leden gaan. Rugzak, n kar mit n motor. Hai lopt noar de Simonszand.",
"Hij is niemand iets schuldig. Hij heeft alles opgeschreven.":"Hai is niemand wat schuldig. Hai het aals opschreven.",
"Hij is van de club. De club is van ons. Het is een cirkel. Een rallycirkel.":"Hai is van de club. De club is van ons. t Is n cirkel. N rallycirkel.",
"Hij is vastgesnoerd. Jij ook. Dat is geen kritiek.":"Hai is vastsnoerd. Doe ook. Dat is gain kritiek.",
"Hij is zes meter.":"Hai is zes meter.",
"Hij is zo plat.":"Hai is zo plat.",
"Hij kijkt de hele tijd naar de kar. Ik ook.":"Hai kiekt de hele tied noar de kar. Ik ook.",
"Hij kon niet meer rijden. Ik wel. Schuld erft. Dat zegt jullie oma toch?":"Hai kon nait meer rieden. Ik wel. Schuld erft. Dat zegt jim oma toch?",
"Hij landde. Dat telt voor hem.":"Hai landde. Dat telt veur hom.",
"Hij landt.":"Hai landt.",
"Hij landt. In de kolk.":"Hai landt. In de kolk.",
"Hij ligt in een emmer. In stukken. Opa zei: schroef hem maar uit elkaar, dan zie je wat er mis is. Dat heb ik gedaan.":"Hai ligt in n emmer. In stukken. Opa zee: schroef hom mor oet mekoar, dan zai je wat der mis is. Dat heb ik doan.",
"Hij ligt vast aan de kade. Hij zinkt niet. Dat is de afspraak.":"Hai ligt vast aan de kaai. Hai zinkt nait. Dat is de afspraak.",
"Hij loopt dus niet alleen.":"Hai lopt dus nait aleen.",
"Hij loopt nog.":"Hai lopt nog.",
"Hij mag ze houden.":"Hai mag ze holen.",
"Hij schreef het op.":"Hai schreef t op.",
"Hij schrok net zo hard als ik.":"Hai schrok net zo haard as ik.",
"Hij slaat af. Zoals opa. Altijd net voor het einde.":"Hai slait af. Zoas opa. Aaltied net veur t aande.",
"Hij springt. Jelle springt. Met een stok. Over een sluisdeur.":"Hai springt. Jelle springt. Mit n stok. Over n sluusdeur.",
"Hij staat achter in het ruim. Poetsen kan ik niet meer. Jullie mogen hem rijden. Niet houden. Hij is van haar.":"Hai stait achter in t ruum. Poetsen kin ik nait meer. Jim mogen hom rieden. Nait holen. Hai is van heur.",
"Hij staat er nog. Ik laat hem staan. Dat is een soort grafsteen die nog nuttig is.":"Hai stait der nog. Ik loat hom stoan. Dat is n soort groafstain dij nog nuttig is.",
"Hij staat in een museum. Hilko denkt dat niemand in een museum zoekt. Dat is zijn eerste fout. De tweede is een koets.":"Hai stait in n museum. Hilko denkt dat niemand in n museum zöcht. Dat is zien aarste fout. De twijde is n koets.",
"Hij start de motor in een museum!":"Hai start de motor in n museum!",
"Hij start op je opa. Dat is geen motor. Dat is een belofte.":"Hai start op je opa. Dat is gain motor. Dat is n belofte.",
"Hij start. Opa. Hij start.":"Hai start. Opa. Hai start.",
"Hij trekt! De slee zit vol! Hij trekt nog steeds!":"Hai trekt! De slee zit vol! Hai trekt nog aaltied!",
"Hij vaart rondjes. Onder een brug. Dat is ook een soort wereldrecord.":"Hai vaart rondjes. Onder n brug. Dat is ook n soort wereldrecord.",
"Hij valt in het water voor het bord. Dat zegt de statistiek.":"Hai valt in t woater veur t bord. Dat zegt de statistiek.",
"Hij valt over het zeil. Plons. Hij heeft een zwemvest.":"Hai valt over t zail. Plons. Hai het n zwemvest.",
"Hij vliegt boven de auto! Ik heb de camera op de bumper! Hij is mooi!":"Hai vlugt boven de auto! Ik heb de camera op de bumper! Hai is mooi!",
"Hij vliegt de kippenren in! Wegwezen, drone!":"Hai vlugt de kippenrain in! Vot, drone!",
"Hij was leeg. Dat helpt.":"Hai was laig. Dat helpt.",
"Hij was veertig jaar koetsier.":"Hai was veertig joar koetsier.",
"Hij weegt als een wasmachine met een geheim.":"Hai wigt as n wasmachine mit n geheim.",
"Hij weet het.":"Hai wait t.",
"Hij woont in een zwemvest.":"Hai woont in n zwemvest.",
"Hij zei ja. Dat is voor hem een boek.":"Hai zee ja. Dat is veur hom n book.",
"Hij zit in mijn zak. Drie trucks. Vierhonderd meter. Niet naderen.":"Hai zit in mien zak. Drij trucks. Vaarhonderd meter. Nait naderen.",
"Hij zwemt. Dat is zijn allereerste keer.":"Hai zwemt. Dat is zien aarste keer.",
"Hilko Kremer. Rallyrijder. Hij heeft sinds mei een trekker. Hij heeft een sponsor en een logo. Hij is groot en zwart.":"Hilko Kremer. Rallyrieder. Hai het sinds mei n trekker. Hai het n sponsor en n logo. Hai is groot en zwart.",
"Hilko rijdt over het gras! Een rallyauto op een gazon!":"Hilko riedt over t gras! N rallyauto op n gazon!",
"Hilko zag een koe.":"Hilko zag n kou.",
"Hinderk. Vijf uur in de regen heb ik gelopen. Ik werd tweede. Dat is zijn schuld.":"Hinderk. Vief uur in de rein heb ik lopen. Ik wör twijde. Dat is zien schuld.",
"Hoe kan een rallyclub nul auto's hebben?":"Hoe kin n rallyclub nul auto's hebben?",
"Hoe weet u dat u mag melden?":"Hoe wait u dat u mag melden?",
"Hoek achtendertig graden. Duur negenenvijftig seconden. Dat is een club.":"Hoek achtendartig groden. Duur negenenvieftig sekonden. Dat is n club.",
"Hoeveel verwacht je?":"Hoeveul verwacht je?",
"Hoger, de hoge plaat. Daar wachten we. Je loopt niet harder. Je loopt gewoon.":"Hoger, de hoge ploat. Doar wachten wie. Je lopen nait haarder. Je lopen gewoon.",
"Hornhuizen en Kloosterburen. De laatste dorpen voor de zee. De kerken staan op wierden en kijken naar het water.":"Hornhuizen en Kloosterburen. De lèste dörpen veur de zee. De kerken stoan op wierden en kieken noar t woater.",
"Houtwal. Fietser. Houtwal. Fietser. Dat is Zuidhorn.":"Houtwal. Fietser. Houtwal. Fietser. Dat is Zuudhorn.",
"Iedereen die hoog zit of bij het water, is familie.":"Ieder dij hoog zit of bie t woater, is femilie.",
"Iedereen met een schop ook.":"Ieder mit n schop ook.",
"Ik ben goed in wachten.":"Ik bin goud in wachten.",
"Ik ben ingeschreven voor de finale. Vanmiddag. Opa heeft me ingeschreven. Hij wist het al.":"Ik bin ingeschreven veur de finale. Vanmiddag. Opa het mie ingeschreven. Hai wus t al.",
"Ik ben nooit alleen. Ik loop altijd met Tessa.":"Ik bin nooit aleen. Ik loop aaltied mit Tessa.",
"Ik ben weg. Hou de pan warm.":"Ik bin vot. Hol de pan waarm.",
"Ik blijf op de dijk. Ik hoor alles. Loop, Tammo.":"Ik bliev op de diek. Ik heur aals. Loop, Tammo.",
"Ik dank jullie niet.":"Ik dank jim nait.",
"Ik doe dit voor drie euro per uur. Dat is niet eens vast.":"Ik doe dit veur drij euro per uur. Dat is nait ains vast.",
"Ik fotografeer één pagina. Het scherm is dim. Klik.":"Ik fotografeer ain bladzie. t Scherm is dim. Klik.",
"Ik ga elk jaar. Het eiland is er nog. Dat verbaast me elke keer.":"Ik goa elk joar. t Aailand is der nog. Dat verbaast mie elke keer.",
"Ik ga kijken. Een schuur is een garage met een ziel.":"Ik goa kieken. N schuur is n garage mit n ziel.",
"Ik ga naar de veerboot. Ik heb mijn fiets. Mijn fiets heeft een mening over de wind.":"Ik goa noar de veerboot. Ik heb mien fiets. Mien fiets het n mainen over de wind.",
"Ik ga niet achter iemand aan op het Wad. Ik ga naar iemand toe. Dat is iets anders.":"Ik goa nait achter ain aan op t Wad. Ik goa noar ain toe. Dat is wat aars.",
"Ik ga wel kijken. Een schip dat niet vaart is het enige schip waar ik niet zeeziek van word.":"Ik goa wel kieken. N schip dat nait vaart is t ainige schip woar ik nait zeeziek van wor.",
"Ik ga. In het donker kan niemand mijn gezicht zien. Dat is al jaren mijn beste punt.":"Ik goa. In t duuster kin niemand mien gezicht zain. Dat is al joaren mien beste punt.",
"Ik had een plan B. Plan A was een brug.":"Ik har n plan B. Plan A was n brug.",
"Ik had een tel langer moeten wachten.":"Ik har n tel langer mouten wachten.",
"Ik heb de binnenbocht! Ik heb altijd de binnenbocht!":"Ik heb de binnenbocht! Ik heb aaltied de binnenbocht!",
"Ik heb deze laarzen drie jaar bewaard voor vandaag.":"Ik heb dissen loarzen drij joar bewoard veur vandoage.",
"Ik heb drie plekken. Een sloper bij Zuidhorn: een blok. Een vriend van Henk in Leek: een turbo. Boer Evert: gewichten.":"Ik heb drij plekken. N sloper bie Zuudhorn: n blok. N vriend van Henk in Leek: n turbo. Boer Evert: gewichten.",
"Ik heb een Fjord, een frietwagen en een oma. Dat is meer dan drie.":"Ik heb n Fjord, n frietwagen en n oma. Dat is meer as drij.",
"Ik heb geen selfie. Maar ik heb het gezien. Mag ik dat zeggen?":"Ik heb gain selfie. Mor ik heb t zain. Mag ik dat zeggen?",
"Ik heb het beloofd. In 1953. Ze leende me haar fiets voor mijn trouwdag. Ik heb hem nooit teruggebracht.":"Ik heb t beloofd. In 1953. Zai leende mie heur fiets veur mien trouwdag. Ik heb hom nooit weerom brocht.",
"Ik heb in een rallyauto gebakken.":"Ik heb in n rallyauto bakken.",
"Ik heb mijn fiets bij me. Op Schier mogen geen auto's. Dat is mijn favoriete verkeersregel.":"Ik heb mien fiets bie mie. Op Schier mogen gain auto's. Dat is mien lievelings-verkeersregel.",
"Ik hoef geen bier. Dit is genoeg.":"Ik hoef gain bier. Dit is genoeg.",
"Ik ken jullie gezichten. Ik onthoud ze. Net als Ubbo.":"Ik ken jim gezichten. Ik onthoud ze. Net as Ubbo.",
"Ik lig plat. Hij trekt.":"Ik lig plat. Hai trekt.",
"Ik loop. Doorzetten is het enige wat ik kan.":"Ik loop. Deurzetten is t ainige wat ik kin.",
"Ik pak de teugels. Een koets is een auto met een mening.":"Ik pak de teugels. N koets is n auto mit n mainen.",
"Ik pak de waterbus. Jij mag voorop staan en naar water kijken.":"Ik pak de woaterbus. Doe mogst veuran stoan en noar woater kieken.",
"Ik probeer het! Het is een rallyauto, geen vaatwasser!":"Ik probeer t! t Is n rallyauto, gain vaatwasser!",
"Ik regel de pier. Jij bakt. Jij bakt beter als ik niet kijk.":"Ik regel de pier. Doe bakst. Doe bakst beter as ik nait kiek.",
"Ik reis. Treinen zijn de enige voertuigen die nooit mijn schuld zijn.":"Ik riez. Treinen binnen de ainige voertuugen dij nooit mien schuld binnen.",
"Ik rem! Ik… rem… niet. Ik…":"Ik rem! Ik… rem… nait. Ik…",
"Ik rij vanmiddag gewoon mee. Met mijn reserveauto. Ik heb er drie.":"Ik rie vanmiddag gewoon mit. Mit mien reserveauto. Ik heb der drij.",
"Ik rij. Een konvooi kun je niet verstoppen. Wel volgen.":"Ik rie. N konvooi kinst nait verstoppen. Wel volgen.",
"Ik rij. Jij bakt. Een rallyauto met een friteuse. Wat kan er misgaan?":"Ik rie. Doe bakst. N rallyauto mit n friteuse. Wat kin der misgoan?",
"Ik rijd niet voor een oom.":"Ik rie nait veur n oom.",
"Ik spring altijd. Dat is mijn plan B.":"Ik spring aaltied. Dat is mien plan B.",
"Ik stond op de dijk. Dat telt als meelopen.":"Ik stond op de diek. Dat telt as mitlopen.",
"Ik vaar. Jij houdt Jelle in de gaten. Dat doe je toch al.":"Ik vaar. Doe holst Jelle in de goaten. Dat dust toch al.",
"Ik verstop me niet. Ik sta strategisch.":"Ik verstop mie nait. Ik sta strategisch.",
"Ik voel hem. Hij trekt mee.":"Ik veul hom. Hai trekt mit.",
"Ik vraag niet wat erin zit. Ik hoop op een turbo. Maar ik vraag het niet.":"Ik vroag nait wat der in zit. Ik hoop op n turbo. Mor ik vroag t nait.",
"Ik was bang dat ik iets moest bewijzen wat ik al wist.":"Ik was bang dat ik wat mos bewiezen wat ik al wus.",
"Ik was haar iets schuldig. Nu ben ik jullie iets schuldig. Dat is erger.":"Ik was heur wat schuldig. Nou bin ik jim wat schuldig. Dat is erger.",
"Ik weet het. Hij zat net bijna onder de klei. Eén ding tegelijk. Eerst het leven.":"Ik wait t. Hai zat net bieno onder de klei. Ain ding tegeliek. Aarst t leven.",
"Ik weet het. Ik zie de naam.":"Ik wait t. Ik zai de noam.",
"Ik weet het. Jullie eierbal heeft zeekraal. Mijn kleindochter heeft het geplukt. Bij de kwelderboer. Niet in de kwelder.":"Ik wait t. Jim aierbal het zeekraal. Mien kleindochter het t plukt. Bie de kwelderboer. Nait in de kwelder.",
"Ik werk op het eiland in de zomer. Het is ook laag als je eraan werkt.":"Ik wark op t aailand in de zomer. t Is ook laag as je der aan warkst.",
"Ik wil een pony. Alleen om te kijken.":"Ik wil n pony. Aleen om te kieken.",
"Ik wil een selfie met een zeehond. Het is voor mijn volgers.":"Ik wil n selfie mit n zeeheund. t Is veur mien volgers.",
"Ik wil niet dat je overal naartoe loopt.":"Ik wil nait dat doe aaloverst noartoe lopst.",
"Ik wil niet dat jij nergens naartoe gaat.":"Ik wil nait dat doe nargens noartoe goast.",
"Ik wil terug. Het is zo groot. Mag ik terug?":"Ik wil weerom. t Is zo groot. Mag ik weerom?",
"Ik wilde de strandlijn van dichtbij zien.":"Ik wol de stroandlien van dichtbie zain.",
"Ik zag het van mijn molen. Het was een mooie nacht. Ik meld alleen: ik ga slapen.":"Ik zag t van mien molen. t Was n mooie nacht. Ik meld aleen: ik goa slopen.",
"Ik zeg niks. Ik draai drie minuten Fries.":"Ik zeg niks. Ik draai drij menuten Fries.",
"Ik zei: dat dacht ik ook. Dat is veel, voor mij.":"Ik zee: dat docht ik ook. Dat is veul, veur mie.",
"Ik zei: kijken.":"Ik zee: kieken.",
"Ik zie de emmer. Ik zie geen motor.":"Ik zai de emmer. Ik zai gain motor.",
"Ik zie de haven vier keer.":"Ik zai de haven vaar keer.",
"Ik zie een vliegtuig.":"Ik zai n vliegtuug.",
"Ik zie het. Je banden zijn nog steeds nat.":"Ik zai t. Dien bannen binnen nog aaltied nat.",
"Ik zie jullie. De haven ziet jullie. Dat is hetzelfde. Ik meld alleen.":"Ik zai jim. De haven zit jim. Dat is hetzelfde. Ik meld aleen.",
"Ik zie niks.":"Ik zai niks.",
"Ik zit erop. Het gaat goed. Hij vaart.":"Ik zit der op. t Gaat goud. Hai vaart.",
"Ik zit hier als iemand van de visserij. Dat zegt mijn naamkaartje.":"Ik zit hier as ain van de visserij. Dat zegt mien noamkaartje.",
"Ik zit in een friteuse. Niet andersom.":"Ik zit in n friteuse. Nait aars om.",
"Ik zit in het midden. Ik ben achtentachtig. Ik jureer nu. Niemand durft iets te zeggen.":"Ik zit in t midden. Ik bin achtentachtig. Ik jureer nou. Niemand dur wat te zeggen.",
"Ik. Vanochtend. Het ging ook niet anders.":"Ik. Vanmörn. t Ging ook nait aars.",
"In zijn koektrommel zat een briefje. Ik vond het gisteren. \"Rit naar Bourtange. Trijntje. Schuldig sinds 1953.\"":"In zien koektrommel zat n briefie. Ik vun t gistern. \"Rit noar Bourtange. Trijntje. Schuldig sinds 1953.\"",
"Is dat erg?":"Is dat erg?",
"Is dit het eiland? Het is erg… laag.":"Is dit t aailand? t Is hail… laag.",
"Is het hier veilig? Er is zo weinig… land.":"Is t hier veilig? Der is zo wainig… laand.",
"Ja. Hij wist het ook.":"Ja. Hai wus t ook.",
"Jan en Alleman mogen naar huis. Ze hebben genoeg gehad. En ik ook. Het was prachtig.":"Jan en Alleman mogen noar huus. Zai hebben genoeg haad. En ik ook. t Was prachtig.",
"Je bent een heel slechte steiger. Maar het is donker.":"Doe bist n hail slechte steiger. Mor t is duuster.",
"Je gewicht schoof.":"Je gewicht schoof.",
"Je haalde een rallyauto in met een koets.":"Doe haalde n rallyauto in mit n koets.",
"Je hebt een sluisdeur gekust.":"Doe hest n sluusdeur kuszt.",
"Je hebt geen voet gezet. Dat is de enige manier om er te zijn.":"Doe hest gain voet zet. Dat is de ainige manier om der te wezen.",
"Je hebt het net gezegd.":"Doe hest t nou zegd.",
"Je hebt nog tien vingers.":"Doe hest nog tien vingers.",
"Je landde in de sluis.":"Doe landde in de sluus.",
"Je loopt niet alleen. Ik loop achter je. Dat is mijn werk. Je hoeft niets te doen, alleen te lopen.":"Doe lopst nait aleen. Ik loop achter die. Dat is mien wark. Je hoeven niks te doun, aleen te lopen.",
"Je sprong op een boot.":"Doe sprong op n boot.",
"Je staat op de vuurtoren. Zie je het Wad? Daar loop ik. Zwaai maar. Ik zie het niet. Maar ik voel het.":"Je stoanst op de vuurtoren. Zai je t Wad? Doar loop ik. Zwaai mor. Ik zai t nait. Mor ik veul t.",
"Je staat op mijn kerktoren. Ik zie jou. Mijn molen ziet je ook. Hij kijkt anders.":"Je stoanst op mien kerktoren. Ik zai die. Mien molen zit die ook. Hai kiekt aars.",
"Je wilt altijd alleen kijken. Daarna sta je met een pony in de Fjord.":"Doe wilst aaltied aleen kieken. Doarnoa stoanst doe mit n pony in de Fjord.",
"Je won met een emmer.":"Doe wunst mit n emmer.",
"Jelle heeft een sms gestuurd. Er staat: kijk naar de kar. Er staat ook: moai.":"Jelle het n sms stuurd. Der stait: kiek noar de kar. Der stait ook: moai.",
"Jelle is van Jelle. Ik ben van mijn oma. Maar hij heeft me wel eens gebeld. Met een zandplaat in zijn broek.":"Jelle is van Jelle. Ik bin van mien oma. Mor hai het mie wel ais beld. Mit n zandploat in zien broek.",
"Jelle noemde een wadgids. Fenna. Ze weet waar de kotter 's nachts overlaadt en ze heeft een roeiboot. Geen motor, geen lamp. Ik blijf bij de telefoon.":"Jelle neumde n wadgids. Fenna. Zai wait woar de kotter s nachts overlaadt en zai het n roeiboot. Gain motor, gain lamp. Ik bliev bie de telefoon.",
"Jelle stuurde een bericht. \"Zoutkamp, de haven. Ik ben hier voor de paling. – J.\" Hij typt met een uitroepteken.":"Jelle stuurde n berichtje. \"Zoutkamp, de haven. Ik bin hier veur de paling. – J.\" Hai typt mit n oetroepteken.",
"Jelle. Je weet dat ik win.":"Jelle. Je waiten dat ik win.",
"Jij bent Fenna. Van Jelle.":"Doe bist Fenna. Van Jelle.",
"Jij liep niet mee.":"Doe liepst nait mit.",
"Jij zei niks.":"Doe zeest niks.",
"Jullie hebben een roeiboot.":"Jim hebben n roeiboot.",
"Jullie lijken op Durk en Douwe.":"Jim lieken op Durk en Douwe.",
"Jullie rijden te hard op mijn dijk. Ik meld alleen.":"Jim rieden te haard op mien diek. Ik meld aleen.",
"Kaas, vis en een man die zegt dat hij zeekraal heeft. Ik koop de kaas.":"Kaas, vis en n man dij zegt dat hai zeekraal het. Ik koop de kaas.",
"Kijk in de portieren. Rennie zei: drie.":"Kiek in de portieren. Rennie zee: drij.",
"Kijk, daar gaat het Reitdiep de polder in. Hier ging vroeger alles langs: turf, graan, mensen.":"Kiek, doar goat t Reitdiep de polder in. Hier ging vrogger aals langs: turf, groan, mensen.",
"Kijk. Houtwallen. Alles hier staat achter een rij bomen.":"Kiek. Houtwallen. Aals hier stait achter n riege bomen.",
"Kijken is de enige.":"Kieken is de ainige.",
"Kijken is ook een soort aanwezigheid.":"Kieken is ook n soort anwezigheid.",
"Kippen! Links! Rechts! Er zijn kippen overal!":"Kippen! Links! Rechts! Der binnen kippen aaloverst!",
"Klaas-Jan betaalt dus niet. Ik ook niet. Dat is eerlijk.":"Klaas-Jan betoalt dus nait. Ik ook nait. Dat is aarlijk.",
"Klik. Hij heeft me gezien.":"Klik. Hai het mie zain.",
"Koeienrooster. Gas erop. Niet remmen. Koeien kijken er niet naar.":"Koeienrooster. Gas derop. Nait remmen. Kij kieken der nait noar.",
"Kolom één: namen. Kolom twee: bedragen. Kolom drie: een handtekening.":"Kolom ain: nammen. Kolom twij: bedragen. Kolom drij: n haandtekening.",
"Kommerzijl en Gaarkeuken. De grens met Friesland. Hij loopt over een brug die soms openstaat. Voor een Fries.":"Kommerzijl en Gaarkeuken. De grens mit Friesland. Hai lopt over n brug dij soms openstait. Veur n Fries.",
"Koplampen. Over het water. Ik ben een steiger.":"Koplampen. Over t woater. Ik bin n steiger.",
"Laarzen. Geen schoenen. Schoenen blijven in de klei.":"Loarzen. Gain schoenen. Schoenen blieven in de klei.",
"Lauwersoog. Een visafslag, een veer en een zeesluis. Alles wat wil varen, komt hier even kijken.":"Lauwersoog. N visafslag, n veer en n zeesluus. Aals wat wil varen, komt hier eefkes kieken.",
"Leg hem op de plaat. Dan blijft het een stuk Wad. Ze mag hem uit je hoofd meenemen.":"Leg hom op de ploat. Dan blift t n stuk Wad. Zai mag hom oet je heufd mitnemen.",
"Lijn Wad. Elke halte is een dorp. Elk dorp heeft een dijk. Elke dijk heeft wind.":"Lien Wad. Elke halte is n dörp. Elk dörp het n diek. Elke diek het wind.",
"Links de vijver. Rechts nog een vijver. Voor ons de beukenlaan. Jan en Alleman kennen de weg.":"Links de vieter. Rechts nog n vieter. Veur ons de beukenloan. Jan en Alleman kennen de vot.",
"Links liggen er honderd. Rechts ook. Het zijn er altijd meer dan je telt.":"Links liggen der honderd. Rechts ook. t Binnen der aaltied meer as je tellen.",
"Maar mijn volgers…":"Mor mien volgers…",
"Manche twee. De wind is gedraaid. De kippen niet.":"Manche twij. De wind is draaid. De kippen nait.",
"Manche één. Start. Rechts twee. Links drie. Erf. Houd het hoofd erbij.":"Manche ain. Start. Rechts twij. Links drij. Erf. Hol t heufd derbie.",
"Marum. Het dorp aan de rand. Daarachter begint Drenthe. Of niet. Dat staat nog open.":"Marum. t Dörp aan de rand. Doarachter begint Drenthe. Of nait. Dat stait nog open.",
"Mem Terpstra bakt nu voor zichzelf.":"Mem Terpstra bakt nou veur zichzulf.",
"Meneer Wiegert had de mooiste dag van zijn leven.":"Menear Wiegert har de mooiste dag van zien leven.",
"Meneer Wiegert. Jan en Alleman. Nu.":"Menear Wiegert. Jan en Alleman. Nou.",
"Met de auto van Tinus' oom. En een friteuse.":"Mit de auto van Tinus zien oom. En n friteuse.",
"Met de kist. En met de loopplank.":"Mit de kist. En mit de loopplank.",
"Met mij wel. Dat is het hele idee.":"Mit mie wel. Dat is t hele idee.",
"Met paling zonder papieren.":"Mit paling zonder papieren.",
"Mevrouw Terpstra. Ik had u niet hier verwacht.":"Mevrouw Terpstra. Ik har u nait hier verwacht.",
"Mijn auto! Hij is een rallyauto! Hij zwemt niet!":"Mien auto! Hai is n rallyauto! Hai zwemt nait!",
"Mijn been komt los.":"Mien bain komt los.",
"Mijn dochter wil een zeehond zien. Mag dat?":"Mien dochter wil n zeeheund zain. Mag dat?",
"Mijn gewicht verschoof! Dat kan niet!":"Mien gewicht verschoof! Dat kin nait!",
"Mijn kippen leggen nu in stereo.":"Mien kippen leggen nou in stereo.",
"Mijn kippen weten nergens van. Hou dat zo.":"Mien kippen waiten nargens van. Hol dat zo.",
"Mijn laars zit vast! Hij is weg! Hij is weg!":"Mien loarze zit vast! Hai is vot! Hai is vot!",
"Mijn moeder mag dit nooit weten.":"Mien moeke mag dit nooit weten.",
"Mijn naam staat er ook in, Fokko. Ik mag hem lezen.":"Mien noam stait der ook in, Fokko. Ik mag hom lezen.",
"Mijn neef. Hij werkt aan een ring, ik aan een dijk. Het zit in de familie.":"Mien noaf. Hai warkt aan n ring, ik aan n diek. t Zit in de femilie.",
"Mijn nicht. Zij draait met de wind. Ik draai er tegenin. Dat geeft evenwicht.":"Mien nicht. Zai draait mit de wind. Ik draai der tegenin. Dat geft evenwicht.",
"Mijn oma beloofde in 1953 haar eerste schip naar een vriendin te noemen. Dat was een vriendin die haar fiets leende.":"Mien oma beloofde in 1953 heur aarste schip noar n vriendin te neumen. Dat was n vriendin dij heur fiets leende.",
"Mijn oma schrijft in andermans boeken. Dat doet ze al zeventig jaar.":"Mien oma schrift in aandermans bouken. Dat dut zai al zeventig joar.",
"Mijn oom heeft de commissarissen betaald voor vandaag. Ik wist het. Ik heb er niks van gezegd. Ik wilde winnen zonder.":"Mien oom het de commissarissen betoald veur vandoage. Ik wus t. Ik heb der niks van zegd. Ik wol wennen zonder.",
"Mijn oom heeft een rallyauto. Zijn rug doet het niet meer. Hij leent hem. Voor het geval jullie hem nodig hebben.":"Mien oom het n rallyauto. Zien rug dut t nait meer. Hai leent hom. Veur t geval jim hom neudig hebben.",
"Mijn oom wil een eierbal. Hij heeft er nog nooit een gehad. Hij zit in de auto.":"Mien oom wil n aierbal. Hai het der nog nooit ain haad. Hai zit in de auto.",
"Mijn opa zei: Tinus, schroef hem maar uit elkaar. Dan zie je wat er mis is. Hij overleed in april. Ik heb hem uit elkaar geschroefd. Nu zie ik niks.":"Mien opa zee: Tinus, schroef hom mor oet mekoar. Dan zai je wat der mis is. Hai overleed in april. Ik heb hom oet mekoar schroefd. Nou zai ik niks.",
"Mijn schoenen zitten nog in de klei.":"Mien schoenen zitten nog in de klei.",
"Mijn tante bakt. Ik ruim op. Dat is de verdeling.":"Mien taante bakt. Ik ruum op. Dat is de verdailing.",
"Mijn tante bakt. Ze heeft een eigen recept. De Westerkwartier-eierbal, met een korst van haver.":"Mien taante bakt. Zai het n aigen recept. De Westerkwartier-aierbal, mit n korst van haver.",
"Mijn tante. Wij heten hier allemaal Fenna. Er is een tekort aan namen.":"Mien taante. Wie hieten hier aal Fenna. Der is n tekort aan nammen.",
"Mijn voeten zijn er nog. Ze voelen niks.":"Mien veuten binnen der nog. Zai voelen niks.",
"Moi, Jelle. Je staat op mijn kade.":"Moi, Jelle. Je stoanst op mien kaai.",
"Moi, Stadjer. Ik ben nat geweest. Dat is nu droog. Het is jouw beurt.":"Moi, Stadjer. Ik bin nat west. Dat is nou dreug. t Is dien beurt.",
"Moi, Stadjer. Ik heb een logo. Jij hebt een emmer.":"Moi, Stadjer. Ik heb n logo. Doe hest n emmer.",
"Moi. Ik zag jullie uit de trein komen. Hier stopt hij twee keer per uur. Ik tel ze allebei. Ik ben molenaar. De wind is mijn collega.":"Moi. Ik zag jim oet de trein komen. Hier stopt hai twij keer per uur. Ik tel ze allebei. Ik bin molenoar. De wind is mien collega.",
"Moi. Ik zag jullie van Stad komen. Kijken is mijn werk. Ik werk aan de dijk. De dijk is nooit af.":"Moi. Ik zag jim van Stad komen. Kieken is mien wark. Ik wark aan de diek. De diek is nooit af.",
"Moi. Jij bent die Stadjer van de radio. Ik heb een trekker en geen motor. De motor zit in die emmer.":"Moi. Doe bist dij Stadjer van de radio. Ik heb n trekker en gain motor. De motor zit in dij emmer.",
"Moi. Jij bent die van de frietwagen. Rallyclub De Vierde Versnelling. Twaalf leden. Nul auto's.":"Moi. Doe bist dij van de frietwagen. Rallyclub De Vierde Versnelling. Twaalf leden. Nul auto's.",
"Moi. Wessel. Neef van Fenna. Ik heb een weddenschap. Wie het eerst op Rottumeroog staat krijgt een krat bier van Klaas-Jan.":"Moi. Wessel. Noaf van Fenna. Ik heb n weddenschap. Wel t aarst op Rottumeroog stait kriegt n krat bier van Klaas-Jan.",
"Mooi weer. De molen draait niet. Hij heeft vrij. Ik meld alleen.":"Mooi weer. De molen draait nait. Hai het vrie. Ik meld aleen.",
"Mooi! Het was bijna een mars!":"Mooi! t Was bieno n mars!",
"Mosselbank. Rechts omlopen. Daar stap je niet op. Dat is een heel dorp.":"Mosselbank. Rechts omlopen. Doar stap je nait op. Dat is n hail dörp.",
"Motor uit. Peddelen. Driehonderd meter. De ring op de kaart. Daarbuiten.":"Motor oet. Peddeln. Drijhonderd meter. De ring op de kaart. Doarboeten.",
"Naam. Naam. Naam. Bedrag. Bedrag. Handtekening.":"Noam. Noam. Noam. Bedrag. Bedrag. Haandtekening.",
"Naar Pieterburen graag. Ik wil de zeehonden zien. Niet te snel rijden. Ze schrikken.":"Noar Pieterburen gaarn. Ik wil de zeeheunden zain. Nait te snel rieden. Zai schrikken.",
"Naar Pieterburen. Ik loop het Wad op. Nee. Ik loop er naar toe. Mijn gids wacht.":"Noar Pieterburen. Ik loop t Wad op. Nee. Ik loop der noar toe. Mien gids wacht.",
"Naast hem blijven. Niet voor, niet achter. Hij blaast, jij vangt. Zo gaat dat.":"Noast hom bliven. Nait veur, nait achter. Hai blaost, doe vangst. Zo goat dat.",
"Naast hem. Vier tellen. Dan klik.":"Noast hom. Vaar tellen. Dan klik.",
"Nachtstreek, live van het startterrein in Zuidhorn. Er staan auto's met nummers en een kraam met een luik. Dat is nieuw voor me.":"Nachtstreek, live van t startterrein in Zuudhorn. Der stoan auto's mit nummers en n kraam mit n luik. Dat is nij veur mie.",
"Nachtstreek, op tournee, in een park in Leek. Er staat een kasteel, een vijver en een museum met koetsen. Ik voel me een vleermuis in een prentenboek.":"Nachtstreek, op tournee, in n park in Leek. Der stait n kasteel, n vieter en n museum mit koetsen. Ik veul mie n vleermoes in n prentenbouk.",
"Nachtstreek, op tournee, in het daglicht. Ik voel me een vleermuis. Ik sta op de dijk bij Noordpolderzijl en voor me ligt het Wad, zo ver je kunt kijken.":"Nachtstreek, op tournee, in t daglicht. Ik veul mie n vleermoes. Ik sta op de diek bie Noordpolderzijl en veur mie ligt t Wad, zo ver as je kinnen kieken.",
"Nachtstreek, op tournee, langs het kanaal. De schepen zijn weg. Het is stil. Dat klopt niet.":"Nachtstreek, op tournee, langs t kanaal. De schepen binnen vot. t Is stil. Dat klopt nait.",
"Nachtstreek, op tournee, tussen de houtwallen. Ik sta op een erf. Naast me staat een trekker zonder motor. Hij kijkt me aan.":"Nachtstreek, op tournee, tussen de houtwallen. Ik sta op n erf. Noast mie stait n trekker zonder motor. Hai kiekt mie aan.",
"Nachtstreek, op tournee, vanaf de pier in Lauwersoog. Havenfeest. Er speelt een fanfare die alleen marsen kent.":"Nachtstreek, op tournee, vanaf de pier in Lauwersoog. Havenfeest. Der spaelt n fanfare dij aleen marsen kent.",
"Nachtstreek, op tournee. Ik sta in Zoutkamp naast een kotter en ik ruik garnalen. Eerste beller.":"Nachtstreek, op tournee. Ik sta in Zoutkamp noast n kotter en ik ruik garnalen. Aarste beller.",
"Nachtstreek, vanuit het donkerste stuk van Nederland. Het is hier zo donker dat ik mijn eigen studiolamp een belediging vind.":"Nachtstreek, vanoet t duusterste stuk van Nederland. t Is hier zo duuster dat ik mien aigen studiolamp n belediging vind.",
"Nachtstreek. Een korte mededeling. Wie het Wad op gaat, gaat met een gids. Dat is geen advies. Dat is een afspraak. Goedenavond.":"Nachtstreek. N korte mededailing. Wel t Wad op goat, goat mit n gids. Dat is gain advies. Dat is n afspraak. Goedenoavend.",
"Nachtstreek. Hilko Kremer belt in. Dat was geen verlies, zegt hij.":"Nachtstreek. Hilko Kremer belt in. Dat was gain verlies, zegt hai.",
"Nachtstreek. Jelle belt weer in. Hij is nat.":"Nachtstreek. Jelle belt weer in. Hai is nat.",
"Nachtstreek. Jelle belt. Hij belt vanaf een eiland.":"Nachtstreek. Jelle belt. Hai belt vanof n aailand.",
"Nachtstreek. Vier voorrondes, vier filialen, een kotter en een schuur.":"Nachtstreek. Vaar voorrondes, vaar filialen, n kotter en n schuur.",
"Nee. Dat is een lijstje.":"Nee. Dat is n lieske.",
"Nee. Dat is gewoon oma.":"Nee. Dat is gewoon oma.",
"Nee. Op de sprong.":"Nee. Op de sprong.",
"Negen. Weer negen.":"Negen. Weer negen.",
"Negentien heel. Ik tel ze elke keer.":"Negentien hail. Ik tel ze elke keer.",
"Negentien is geen dertig. Maar het is wel een mooi getal. Opnieuw.":"Negentien is gain dartig. Mor t is wel n mooi getal. Opnij.",
"Net als jij. Op feestjes.":"Net as doe. Op feestjes.",
"Net eruit. Net erin. Hij komt vanzelf. Garnalen zijn geduldig. Wij ook.":"Net derut. Net derin. Hai komt vanzulf. Garnalen binnen geduldig. Wie ook.",
"Niekerk. Een kerk, een sportveld en een rallyclub zonder auto. Meer heeft een dorp niet nodig.":"Niekerk. N kerk, n sportveld en n rallyclub zonder auto. Meer het n dörp nait neudig.",
"Niemand op de mosselbank. Daar woont iemand anders.":"Niemand op de mosselbank. Doar woont ain aars.",
"Niemand sterft. Ze worden gegeten.":"Niemand stirft. Zai wörden aiten.",
"Niemand weet het. Daarom loop ik. Elke dag. Tot ik de weg ken.":"Niemand wait t. Doarom loop ik. Elke dag. Tot ik de weg ken.",
"Niemand zet daar voet. Het is natuur. Wij gaan kijken.":"Niemand zet doar voet. t Is natuur. Wie goan kieken.",
"Nienoord in Leek. Een borg met een park, een vijver en zwanen. Het Rijtuigenhuis is een verzinsel. De zwanen zijn echt.":"Nienoord in Leek. N borg mit n park, n vieter en zwanen. t Rijtuigenhuus is n verzinsel. De zwanen binnen echt.",
"Niet de enige. Kijk. De zender beweegt. Truck drie gaat straks naar Kollum, als hij gewogen is. Een koelhuis. In Friesland.":"Niet de ainige. Kiek. De zender beweegt. Truck drij goat straks noar Kollum, as hai wegen is. N koelhuus. In Friesland.",
"Niet kopen. Alleen aaien. Dat is het hele systeem.":"Nait kopen. Aleen aaien. Dat is t hele systeem.",
"Niet over de vijverrand! Het zijn zwanen! Ze weten dat ze zwanen zijn!":"Nait over de vieterkaant! t Binnen zwanen! Zai waiten dat zai zwanen binnen!",
"Niet te dichtbij. De ring staat op de kaart. Ik rij eromheen.":"Nait te dichtbie. De ring stait op de kaart. Ik rie der omhin.",
"Niet te hard. Niet te zacht. Een trekker voel je met je rug.":"Nait te haard. Nait te zacht. N trekker veul je mit je rug.",
"Nog een take? Ik heb een nieuwe batterij!":"Nog n take? Ik heb n nij batterij!",
"Nog negentien heel. Dat is meer dan niets.":"Nog negentien hail. Dat is meer as niks.",
"Nog vierendertig heel. Dat is een goed getal.":"Nog vierendartig hail. Dat is n goud getal.",
"Noordpolderzijl. Een zijl, een haventje en een dijk. Daarachter begint het Wad. Het is het einde van het land en het begin van iets anders.":"Noordpolderzijl. N zijl, n haventie en n diek. Doarachter begint t Wad. t Is t aande van t laand en t begin van wat aars.",
"Nu is hij van de club.":"Nou is hai van de club.",
"Nu is hij van de club. De club heeft een kampioen. Zij heeft er twee.":"Nou is hai van de club. De club het n kampioen. Zai het der twij.",
"Nu wel. Hij vaart er nog steeds rond.":"Nou wel. Hai vaart der nog aaltied rond.",
"Oldehove. Een toren op een wierde. Hij staat al langer dan de weg.":"Oldehove. N toren op n wierde. Hai stait al langer as de vot.",
"Oma Sientje heeft een sleutel voor ons. Van de kotter. En Fenna wil een luik in de zijkant.":"Oma Sientje het n sleutel veur ons. Van de kotter. En Fenna wil n luik in de kaant.",
"Oma belde. Er staat een naam bij het Wad: Sientje, Noordpolderzijl. De waterbus naar Zoutkamp vaart om negen uur, over het Reitdiep.":"Oma belde. Der stait n noam bie t Wad: Sientje, Noordpolderzijl. De woaterbus noar Zoutkamp vaart om negen uur, over t Reitdiep.",
"Oma had een naam: Hinderk, Tolbert. Hij is dood, zegt ze. Maar zijn kleinzoon heeft een trekker. De trein naar Leeuwarden stopt in Zuidhorn.":"Oma har n noam: Hinderk, Tolbert. Hai is dood, zegt zai. Mor zien kleinzeun het n trekker. De trein noar Leeuwarden stopt in Zuudhorn.",
"Oma heeft overal een lijstje.":"Oma het aaloverst n lieske.",
"Oma wil hem terug.":"Oma wil hom weerom.",
"Oma's fiets heeft een bel. Ik bel. De wind hoort het niet.":"Oma's fiets het n bel. Ik bel. De wind hoort t nait.",
"Oma. Ja. We staan op de pier.":"Oma. Ja. Wie stoan op de pier.",
"Omdat je dan misschien gaat remmen.":"Omdat je dan misschien goan remmen.",
"Omhoog kijken. De sterren zijn de lamp. Dat is de afspraak.":"Omhoog kieken. De starren binnen de lamp. Dat is de afspraak.",
"Op de streep. Alle negen. Geen berisping. Dat is het hoogste dat er is.":"Op de streep. Alle negen. Gain berisping. Dat is t hoogste dat der is.",
"Op niks?":"Op niks?",
"Op tafel in dat huisje. Een boek. Kasboek, staat er. Deel drie: Wadkust.":"Op toavel in dat huusje. N book. Kasbook, stait der. Diel drij: Wadkust.",
"Opa kreeg nooit een beker. Hij kreeg een stukje vlees van de slager.":"Opa kreeg nooit n beker. Hai kreeg n stukje vleis van de slager.",
"Opa zou kijken en niks zeggen. Dat was zijn stijl.":"Opa zol kieken en niks zeggen. Dat was zien stiel.",
"Opa zou trots zijn.":"Opa zol trots wezen.",
"Open water. Wind uit het noordwesten. Hou rechtdoor.":"Open woater. Wind oet t noordwesten. Hol rechtdeur.",
"Open zee. Hier is de kustwacht. Het speelbare Wad houdt hier op. Keer om. Het is mooi en het is groot en het is niet van jou.":"Open zee. Hier is de kustwacht. t Speulbare Wad holdt hier op. Keer om. t Is mooi en t is groot en t is nait van die.",
"Openbaar is een woord voor mensen die zelf geen kade hebben.":"Openbaar is n woord veur mensen dij zulf gain kaai hebben.",
"Opgeschreven. In een boek.":"Opschreven. In n book.",
"Opzet. De wind duwt het water naar de kust. Het komt sneller dan de tabel. Tammo: tempo omhoog. Niet rennen. Harder lopen, niet sneller haasten.":"Opzet. De wind duwt t woater noar de kust. t Komt sneller as de tabel. Tammo: tempo omhoog. Nait rennen. Haarder lopen, nait sneller haasten.",
"Paarden! Pony's! Een koets met een mening! Alles voor de liefhebber!":"Peerden! Pony's! N koets mit n mainen! Aals veur de liefhebber!",
"Pacenotes zitten in de radio. Ik zit op de kermis, met mijn stopwatch. Ik zeg wat er komt. Jij rijdt wat er komt.":"Pacenotes zitten in de radio. Ik zit op de kermis, mit mien stopwatch. Ik zeg wat der komt. Doe riedst wat der komt.",
"Pandrecht. Op de kotter van mijn opa. De kotter heet Trijntje.":"Pandrecht. Op de kotter van mien opa. De kotter hait Trijntje.",
"Papier is papier. Ik schrijf \"betaald\" in de kantlijn. Dan is het van mij.":"Pepier is pepier. Ik schrief \"betoald\" in de kaantlien. Dan is t van mie.",
"Peiling: groeien of thuis? Groeien: 49 procent. Thuis: 51. Het is gedraaid. Eén luisteraar in Paddepoel heeft nu twee telefoons. Ik zeg niks.":"Peiling: groaien of thoes? Groaien: 49 procent. Thoes: 51. t Is draaid. Ain luusteraar in Paddepoel het nou twij telefoons. Ik zeg niks.",
"Pellen. Gewoon pellen. Je hoeft niets te zeggen. Dat is het mooie.":"Pellen. Gewoon pellen. Je hoeven niks te zeggen. Dat is t mooie.",
"Pieterburen. Een dorp aan het Wad met een oude kerk. Hier begint de weg het Wad op. Met een gids.":"Pieterburen. N dörp aan t Wad mit n olde kerk. Hier begint de weg t Wad op. Mit n gids.",
"Pion staat verkeerd. Rechts, niet links. De commissaris heeft zijn pion verzet. Natuurlijk.":"Pion stait verkeerd. Rechts, nait links. De commissaris het zien pion verzet. Natuurlijk.",
"Plakken. Klik. Hij zit.":"Plakken. Klik. Hai zit.",
"Plek voor drie auto's. En een luik in de zijmuur. Een Fjord Frituur in Leek.":"Plek veur drij auto's. En n luik in de ziedmuur. N Fjord Frituur in Leek.",
"Plek voor drie auto's. Jij hebt er één.":"Plek veur drij auto's. Doe hest der ain.",
"Poolster. Zie je de steel van de Kleine Beer? De laatste ster. Daar.":"Poolster. Zai je de steel van de Klaine Beer? De lèste starre. Doar.",
"Precies. Dan is het eerlijk.":"Precies. Dan is t aarlijk.",
"Radio Nachtstreek, live vanaf de dijk bij het Wad. Het bereik is hier prima. Er staat ook niks in de weg. Behalve water.":"Radio Nachtstreek, live vanof de diek bie t Wad. t Bereik is hier prima. Der stait ook niks in de vot. Behalve woater.",
"Rallyclub De Vierde Versnelling. Drie secties. Alle drie onder de tijd. Ik teken.":"Rallyclub De Vierde Versnelling. Drij secties. Alle drij onder de tied. Ik tekin.",
"Rechts drie. Houtwal. Mooi uitzicht. Niet kijken.":"Rechts drij. Houtwal. Mooi oetzicht. Nait kieken.",
"Rennie belde. Hilko heeft zijn rallyauto verstopt. In een museum, in het park van Nienoord. Er zitten enveloppen in de portieren, zegt ze. Voor de baancommissarissen.":"Rennie belde. Hilko het zien rallyauto verstopt. In n museum, in t park van Nienoord. Der zitten enveloppen in de portieren, zegt zai. Veur de boancommissarissen.",
"Revanche? Ik heb geoefend. Een uur.":"Revanche? Ik heb oefend. N uur.",
"Rij maar. Er zijn sloten genoeg.":"Rie mor. Der binnen sloten genoeg.",
"Rikus. Dijkwerker, Noordpolderzijl. Er loopt een man het Wad op. Zonder gids. Er staat wind uit het noordwesten. Ik meld alleen.":"Rikus. Dijkwarker, Noordpolderzijl. Der lopt n man t Wad op. Zonder gids. Der stait wind oet t noordwesten. Ik meld aleen.",
"Rikus. Fenna, wadgids. Het is nieuwe maan. Wie hier een lamp aandoet, is een vuurtoren. Een slechte.":"Rikus. Fenna, wadgids. t Is nij moan. Wel hier n lamp aandut, is n vuurtoren. N slechte.",
"Rikus. Molenaar, Zuidhorn. Er rijden drie witte vrachtwagens langs mijn molen. Elke nacht. Ze rijden niet naar Friesland. Ze rijden er langs. Ik meld alleen.":"Rikus. Molenoar, Zuudhorn. Der rieden drij witte vrachtwagens langs mien molen. Elke nacht. Zai rieden nait noar Friesland. Zai rieden der langs. Ik meld aleen.",
"Rikus. Rennie, Rallyclub De Vierde Versnelling. Hilko Kremer heeft de baancommissarissen een envelop beloofd. Alle drie. Het zijn mijn collega's. Ik weet niet wie ik nog kan vertrouwen.":"Rikus. Rennie, Rallyclub De Vierde Versnelling. Hilko Kremer het de boancommissarissen n envelop beloofd. Alle drij. t Binnen mien collega's. Ik wait nait wel ik nog kin vertrouwen.",
"Rikus. Rennie, Rallyclub De Vierde Versnelling. Ik ben secretaris. De club heeft geen auto. Ik heb wel een stopwatch.":"Rikus. Rennie, Rallyclub De Vierde Versnelling. Ik bin secretaris. De club het gain auto. Ik heb wel n stopwatch.",
"Rikus. Tinus, Tolbert. Mijn opa is dood. Zijn trekker leeft. De motor niet.":"Rikus. Tinus, Tolbert. Mien opa is dood. Zien trekker leeft. De motor nait.",
"Rikus. Vier van zeven. Mooie reeks. Ik zie ze graag in het Oldambt.":"Rikus. Vaar van zeuven. Mooie riege. Ik zai ze gaarn in t Oldambt.",
"Rikus. Voorronde drie, Wadkust. Reglement: het Wad moet in de eierbal. Paling, bijvoorbeeld.":"Rikus. Voorronde drij, Wadkust. Reglement: t Wad mout in de aierbal. Paling, bieveurbeeld.",
"Rit naar Bourtange. Schuldig sinds 1953.":"Rit noar Bourtange. Schuldig sinds 1953.",
"Ritme. Niet te snel. Het Wad houdt van tempo, niet van haast.":"Ritme. Nait te snel. t Wad holdt van tempo, nait van haast.",
"Rottumeroog. Een eiland waar niemand mag komen. Dat is het mooiste wat je over een eiland kunt zeggen.":"Rottumeroog. N aailand woar niemand mag komen. Dat is t mooiste wat je over n aailand kinnen zeggen.",
"Rustig! Dit is een havenfeest, geen nood! Niet door de kinderen!":"Rustig! Dit is n havenfeest, gain noud! Nait deur de kinder!",
"Rustig, meisje. Het zijn mijn kippen.":"Rustig, wicht. t Binnen mien kippen.",
"Rustig. Trek niet. Je voet blijft erin. Je laars gaat eruit. Zo. En dan je voet.":"Rustig. Trek nait. Dien voet blift der in. Dien loarze goat der oet. Zo. En dan dien voet.",
"Schapen. Ze kijken alsof wij op hun dijk staan.":"Schaiven. Zai kieken aalsof wie op hun diek stoan.",
"Schiermonnikoog. Een Fries eiland, gezien vanaf de boot. Het blijft een streep tot je er bent. Dan is het een kade.":"Schiermonnikoog. N Fries aailand, zain vanof de boot. t Blift n streep tot je der bin. Dan is t n kaai.",
"Schip op de rede. Zeehonden op de plaat links. De zeesluis staat open. Niet toeteren, ze kijken toch.":"Schip op de rede. Zeeheunden op de ploat links. De zeesluus stait open. Nait toeteren, zai kieken toch.",
"Siemen Kremer. Neef van Hilko. Clubkampioen, drie jaar achter elkaar. Er was nooit iemand anders.":"Siemen Kremer. Noaf van Hilko. Clubkampioen, drij joar achter mekoar. Der was nooit ain aars.",
"Sientje woonde aan de dijk in Noordpolderzijl. Haar kleindochter loopt nu over het Wad. Zeg dat ze weet wie ik ben.":"Sientje woonde aan de diek in Noordpolderzijl. Heur kleindochter lopt nou over t Wad. Zeg dat zai wait wie ik bin.",
"Sloot! Dat was de sloot! Er stond een koe!":"Sloot! Dat was de sloot! Der stond n kou!",
"Sorry! Dringend! Fanfare, opzij!":"Sorry! Dringend! Fanfare, opzied!",
"Sorry. Ik keek naar mijn voeten.":"Sorry. Ik keek noar mien veuten.",
"Start. Links vier. Sloot. Niet kijken.":"Start. Links vaar. Sloot. Nait kieken.",
"Start. Rechts één. Rechtdoor. Links vier. Sloot. Niet kijken.":"Start. Rechts ain. Rechtdeur. Links vaar. Sloot. Nait kieken.",
"Steltlopers. Laat ze. Ze staan op de rand van hun eigen eten.":"Steltlopers. Loat ze. Zai stoan op de rand van hun aigen aiten.",
"Stop! Niet dichterbij! Hij gaat weg, en jij blijft hier!":"Stop! Nait dichterbie! Hai goat vot, en doe blift hier!",
"Stop. Geen riem meer. Er komt een auto op de dijk.":"Stop. Gain riem meer. Der komt n auto op de diek.",
"Strandlijn. Hut. Het bord. Klik. Klik. Klik.":"Stroandlien. Hut. t Bord. Klik. Klik. Klik.",
"Tammo. Het boek zit in zijn rugzak. Jij had hem.":"Tammo. t Book zit in zien rugzak. Doe hadst hom.",
"Telefoon op nachtstand. Geen zaklamp. Geen scherm. Alleen jij en de sterren.":"Telefoon op nachtstand. Gain zaklamp. Gain scherm. Aleen doe en de starren.",
"Tessa is er niet. Je hebt mij. Ik ben strenger.":"Tessa is der nait. Je hebben mie. Ik bin strenger.",
"Tessa. Dat is een boot. Geen trampoline.":"Tessa. Dat is n boot. Gain trampoline.",
"Tinus zegt: de schuur van opa is van ons, zolang we willen. En zijn tante wil een luik in de zijmuur.":"Tinus zegt: de schuur van opa is van ons, zolang wie willen. En zien taante wil n luik in de ziedmuur.",
"Tinus' oom heeft een rallyauto. Zijn rug doet het niet meer.":"Tinus zien oom het n rallyauto. Zien rug dut t nait meer.",
"Tinus. Kleinzoon van Hinderk. Hij heeft een trekker en geen motor, en vanmiddag is de finale trekkertrek. Hilko rijdt mee.":"Tinus. Kleinzeun van Hinderk. Hai het n trekker en gain motor, en vanmiddag is de finale trekkertrek. Hilko rit mit.",
"Tongklik: sneller. Twee tongklikken: nog sneller. Drie tongklikken: een ruzie.":"Tongklik: sneller. Twij tongklikken: nog sneller. Drij tongklikken: n ruzie.",
"Touwtrekken! Wad tegen Hout! Fenna tegen Tinus! Dat is een familiezaak!":"Touwtrekken! Wad tegen Hout! Fenna tegen Tinus! Dat is n femiliezoak!",
"Trijntje?":"Trijntje?",
"Twee mannen bij het luik van Sientje. Met een koevoet. Ik meld alleen.":"Twij mannen bie t luik van Sientje. Mit n koevoet. Ik meld aleen.",
"Twee trekkers, een hakselaar en een man die zwaait. Niet naar ons.":"Twij trekkers, n hakselaar en n man dij zwaait. Nait noar ons.",
"Twee-en-veertig meter voor de Grijze! Dat heeft hier in geen jaren iemand met een emmer gehaald!":"Twij-en-veertig meter veur de Grieze! Dat het hier in gain joaren ain mit n emmer haald!",
"Twee-en-vijftig. Het kan sneller. Het kan altijd sneller.":"Twij-en-vieftig. t Kin sneller. t Kin aaltied sneller.",
"Twee: je kijkt naar het water.":"Twij: je kiekst noar t woater.",
"Tweede. Vijf meter. Iets meer gas. Het is een sloot, geen mening.":"Twijde. Vief meter. Wat meer gas. t Is n sloot, gain mainen.",
"Tweehonderdveertien. Dat gaat in het boek. Met jullie naam. Het Wad dankt jullie. Een zeehond doet dat niet. Maar hij blijft liggen. Dat is zijn manier.":"Twijhonderdveertien. Dat goat in t book. Mit jim noam. t Wad dankt jim. N zeeheund dut dat nait. Mor hai blift liggen. Dat is zien manier.",
"Tweehonderdveertien. Dat is goed. Dat is meer dan vorig jaar. Dat is niet genoeg om te juichen. Genoeg om blij te zijn.":"Twijhonderdveertien. Dat is goud. Dat is meer as vorig joar. Dat is nait genoeg om te juchen. Genoeg om blied te wezen.",
"U staat op het enige stuk Nederland dat u niet mag betreden. Behalve ik. En de eidereenden. Ik meld alleen: de boot ligt die kant op.":"U stoan op t ainige stuk Nederland dat u nait mag betreden. Behalve ik. En de aidereenden. Ik meld aleen: de boot ligt dij kaant op.",
"Ubbo heeft vier snackbars minder. Dat is ook een manier om te tellen.":"Ubbo het vaar snackbars minder. Dat is ook n manier om te tellen.",
"Ubbo koopt zachte dingen.":"Ubbo koopt zachte dingen.",
"Ubbo onthoudt graag. Hij vergeet alleen wat hij schuldig is.":"Ubbo onthoudt gaarn. Hai vergeet aleen wat hai schuldig is.",
"Ubbo's tanden zijn niet van hier.":"Ubbo zien tanden binnen nait van hier.",
"Van dichtbij is hij hetzelfde. Alleen natter.":"Van dichtbie is hai hetzelfde. Aleen natter.",
"Van ver. Heel ver. Een zeehond kijkt terug. Hij is niet beleefd, maar hij is wel eerlijk.":"Van ver. Hail ver. N zeeheund kiekt weerom. Hai is nait beleefd, mor hai is wel aarlijk.",
"Vandaag pellen we. Geen wedstrijd. Gewoon pellen. Het is een meditatie.":"Vandoage pellen wie. Gain wedstrijd. Gewoon pellen. t Is n meditatie.",
"Vandaag vijftig eierballen. De zeekraal was uitverkocht. Dat vond ik prettig.":"Vandoage vieftig aierballen. De zeekraal was oetverkocht. Dat vun ik prettig.",
"Vandaag weegt elke eierbal tweeënveertig gram. Ik heb ze gewogen. Ik weeg alles.":"Vandoage wigt elke aierbal twijenveertig gram. Ik heb ze wegen. Ik weeg aals.",
"Vaten. Twaalf. O.B. in de zijkant.":"Vaten. Twaalf. O.B. in de kaant.",
"Veertig eierballen. Dertig moeten heel. Dat zijn tien dingen die mogen sterven.":"Veertig aierballen. Dertig mouten hail. Dat binnen tien dingen dij mogen stedden.",
"Ver weg is goed. Ver weg blijft goed.":"Ver vot is goud. Ver vot blift goud.",
"Vet. Geen idee van wie. Maar het ruikt naar Ubbo. En aan de zijkant staat een O en een B. Dat is geen toeval.":"Vet. Gain idee van wel. Mor t rukt noar Ubbo. En aan de kaant stait n O en n B. Dat is gain toeval.",
"Vier meter. Hup!":"Vaar meter. Hup!",
"Vier regio's. Vier plekken. Dit gaat harder dan ik dacht.":"Vaar regio's. Vaar plekken. Dit goat haarder as ik docht.",
"Vier voorrondes. Nog drie.":"Vaar voorrondes. Nog drij.",
"Visser Dolf, achtentwintigduizend. Visser Hendrik, elfduizend. S. de Boer, kotter Trijntje, ZK 53: achttienduizend vierhonderd. Verpand.":"Visser Dolf, achtentwintigduizend. Visser Hendrik, elfduizend. S. de Boer, kotter Trijntje, ZK 53: achttienduizend vierhonderd. Verpand.",
"Vliegen! Ik vlieg! Hou vast, Tammo!":"Vlieg! Ik vlieg! Hol vast, Tammo!",
"Vliegtuigen knipperen. Sterren niet. Dat is het verschil.":"Vliegtuigen knipperen. Starren nait. Dat is t verschil.",
"Vol. Tweeduizend kilo. Dat is een dag.":"Vol. Twijduuzend kilo. Dat is n dag.",
"Volgende keer een uur eerder.":"Volgende keer n uur aarder.",
"Voor als we het vieren. Op afstand.":"Veur as wie t vieren. Op afstand.",
"Voorronde drie. Lauwersoog, havenfeest. Het reglement zegt: het Wad moet in de eierbal. Fenna heeft zeekraal van een kwelderboer. Fokko zit in de jury.":"Voorronde drij. Lauwersoog, havenfeest. t Reglement zegt: t Wad mout in de aierbal. Fenna het zeekraal van n kwelderboer. Fokko zit in de jury.",
"Voorronde vier. Zuidhorn. Het reglement van Ubbo: een rollende keuken. De eierbal wordt gebakken tijdens het rijden. De jury zit op de finish. Tinus' oom leent zijn rallyauto, met een friteuse op de achterbank.":"Voorronde vaar. Zuudhorn. t Reglement van Ubbo: n rollende kouken. De aierbal wordt bakken tiedens t rieden. De jury zit op de finish. Tinus zien oom leent zien rallyauto, mit n friteuse op de achterbaank.",
"Waar blijft de vis? De Vismarkt is om acht uur open. De vis is om zeven nog zee.":"Woar blift de vis? De Vismark is om acht uur open. De vis is om zeuven nog zee.",
"Waar kom jij ineens vandaan? Ik… ik zie je niet meer.":"Woar kom doe ains vandan? Ik… ik zai die nait meer.",
"Waarmee?!":"Woarmit?!",
"Waarom heb je een zwemvest aan?":"Woarom hest doe n zwemvest aan?",
"Waarom is alles \"niet kijken\"?":"Woarom is aals \"nait kieken\"?",
"Waarom nemen ze niet de N355?":"Woarom nemen zai nait de N355?",
"Wachten. Draaien. Trekken. Wachten. Draaien. Trekken.":"Wachten. Draaien. Trekken. Wachten. Draaien. Trekken.",
"Wad, hier Dijkstra, UMCG. Mijn heli is terug uit onderhoud. Ik heb hem nog geen lunch gegeven.":"Wad, hier Dijkstra, UMCG. Mien heli is weerom oet onderhoud. Ik heb hom nog gain lunch geven.",
"Wat controleren jullie?":"Wat controleren jim?",
"Wat doe je daar, Jelle?":"Wat dust doe doar, Jelle?",
"Wat doe je in Zoutkamp, Jelle?":"Wat dust doe in Zoutkamp, Jelle?",
"Wat doe jij hier?! Dit is een museum!":"Wat dust doe hier?! Dit is n museum!",
"Wat doe jij hier?! Dit is een privékist!":"Wat dust doe hier?! Dit is n privékist!",
"Wat is er met de motor?":"Wat is der mit de motor?",
"Wat is het reglement van vandaag, Rennie?":"Wat is t reglement van vandoage, Rennie?",
"Wat is het verschil?":"Wat is t verschil?",
"Wat zit er in?":"Wat zit der in?",
"Waterbus naar Zoutkamp. Vijf bruggen. Toeteren bij elke brug. Ze doen alsof ze het niet horen.":"Woaterbus noar Zoutkamp. Vief bruggen. Toeteren bie elke brug. Zai doun aalsof zai t nait heuren.",
"We hebben de zee niet gezien. Hij was er alleen. Dat is eigenlijk beter.":"Wie hebben de zee nait zain. Hai was der aleen. Dat is aigenlk beter.",
"We waren er bijna.":"Wie waren der bieno.",
"We zijn blauw, Tessa. We zijn heel blauw in een zwarte nacht.":"Wie binnen blauw, Tessa. Wie binnen hail blauw in n zwarte nacht.",
"Weegbrug. De N355 is open. Wie niet over de brug kan, kan naar de weegbrug. Iedereen mee.":"Weegbrug. De N355 is open. Wel nait over de brug kin, kin noar de weegbrug. Iedereen mit.",
"Weer de rollende keuken? Ik heb de stopwatch hersteld.":"Weer de rollende kouken? Ik heb de stopwatch harsteld.",
"Weer de voorronde? Ik heb nog tijd. Ik ben achtentachtig.":"Weer de voorronde? Ik heb nog tied. Ik bin achtentachtig.",
"Weer donker? Mooi. Dan heb ik de Dijk van de Nacht nog een keer.":"Weer duuster? Mooi. Dan heb ik de Diek van de Nacht nog n keer.",
"Weer een groep? Altijd negen. Of tien. Of acht. Ik tel.":"Weer n groep? Aaltied negen. Of tien. Of acht. Ik tel.",
"Weer een konvooi? Ik tel mee. Ik heb de tijd.":"Weer n konvooi? Ik tel mit. Ik heb de tied.",
"Weer een voorronde. Zeven is een lang getal.":"Weer n voorronde. Zeuven is n lang getal.",
"Weer het Wad? Dan bepaal ik. Dat weet je.":"Weer t Wad? Dan bepaal ik. Dat wait je.",
"Weer het grind? De houtwallen staan er nog.":"Weer t grind? De houtwallen stoan der nog.",
"Weer kijken? Ik neem geen bier mee. Alleen een stoel.":"Weer kieken? Ik nem gain bier mit. Aleen n stoul.",
"Weer koetsen kijken? Dit keer geen auto's. Ik zet de achterdeur op slot.":"Weer koetsen kieken? Dit keer gain auto's. Ik zet de achterdeur op slot.",
"Weer tellen? Elke dag een ander getal. Dat is de bedoeling.":"Weer tellen? Elke dag n aander getal. Dat is de bedoailing.",
"Weer trekken? De emmer is leeg. Dat is een goed teken.":"Weer trekken? De emmer is laig. Dat is n goud teken.",
"Weg met die sloep! Dit is een sluis, geen terras!":"Vot mit dij sloep! Dit is n sluus, gain terras!",
"Welk?":"Wel?",
"Welke fiets?":"Wel fiets?",
"Wie heeft alle paling, Ubbo?":"Wel het aal paling, Ubbo?",
"Wie is de sponsor?":"Wel is de sponsor?",
"Wie kan toeteren? Iedereen. Een maat, een toeter, geen toonladder.":"Wel kin toeteren? Iedereen. N moat, n toeter, gain toonladder.",
"Wie naar Friesland rijdt, gaat over de brug. Zij gaan eromheen. Op de N355 staat een weegbrug. Daar willen ze niet langs.":"Wel noar Friesland riedt, goat over de brug. Zai goan der omhin. Op de N355 stait n weegbrug. Doar willen zai nait langs.",
"Wie rijdt er nog meer mee?":"Wel rit der nog meer mit?",
"Wij hebben een emmer.":"Wie hebben n emmer.",
"Wij hebben een luik. Dat is ook een soort kade.":"Wie hebben n luik. Dat is ook n soort kaai.",
"Wij hebben hem niet gezien. Hij ook niet.":"Wie hebben hom nait zain. Hai ook nait.",
"Wij hebben het niet aangenomen. Wij hebben het alleen niet teruggebracht.":"Wie hebben t nait annomen. Wie hebben t aleen nait weerom brocht.",
"Wij kennen een molenaar in Winsum. Fenna.":"Wie kennen n molenoar in Winsum. Fenna.",
"Wij kennen een wegwerker. Harm. Laatste fase.":"Wie kennen n wegwarker. Harm. Lèste fase.",
"Wij ook niet.":"Wie ook nait.",
"Wij trekken met een trekker. Dat is ook eerlijk. Hij staat naast het touw.":"Wie trekken mit n trekker. Dat is ook aarlijk. Hai stait noast t touw.",
"Wij trekken met het getij. Dat is eerlijk. Het komt altijd terug.":"Wie trekken mit t getij. Dat is aarlijk. t Komt aaltied weerom.",
"Wij zijn niet jaloers. Een beetje. Ik heb mijn stopwatch gebroken.":"Wie binnen nait jaloers. N betje. Ik heb mien stopwatch braken.",
"Zaterdag. Finale. Opa heeft me ingeschreven. In maart. Hij wist het al.":"Zoaterdag. Finale. Opa het mie ingeschreven. In moart. Hai wus t al.",
"Ze heeft nooit iets gezegd.":"Zai het nooit niks zegd.",
"Ze heet Trijntje.":"Zai hait Trijntje.",
"Ze hoorden hem niet. Een reiger is hier een gewone avond. Ga.":"Zai heurden hom nait. N reiger is hier n gewone oavend. Ga.",
"Ze komen om half elf. Ik heb een stopwatch en een kijker. Ik meld alleen als ze er zijn.":"Zai komen om half elf. Ik heb n stopwatch en n kieker. Ik meld aleen as zai der binnen.",
"Ze liggen te liggen. Heel veel. Eén is wakker. Hij kijkt naar mij.":"Zai liggen te liggen. Hail veul. Ain is wakker. Hai kiekt noar mie.",
"Ze noemt de Melkweg de Dijk van de Nacht.":"Zai neumt de Melkweg de Diek van de Nacht.",
"Ze spelen hetzelfde stuk voor de vijfde keer.":"Zai spelen hetzelfde stuk veur de vieftste keer.",
"Ze stoppen. Voor de brug. Er komt een boot.":"Zai stoppen. Veur de brug. Der komt n boot.",
"Ze zagen ons. In de spiegel. Het is een brede spiegel.":"Zai zagen ons. In de spiegel. t Is n brede spiegel.",
"Ze zijn allemaal heel. Dat is meer dan de eierballen.":"Zai binnen aal hail. Dat is meer as de aierballen.",
"Ze zijn er. Dat is genoeg.":"Zai binnen der. Dat is genoeg.",
"Zeehonden! Dat is een hele rij! Ze liggen te zonnen!":"Zeeheunden! Dat is n hele riege! Zai liggen te zonnen!",
"Zeehonden. Op de plaat. Ver weg.":"Zeehonden. Op de ploat. Ver vot.",
"Zeehonden. Op elke plaat. Ze liggen te liggen.":"Zeehonden. Op elke ploat. Zai liggen te liggen.",
"Zeehondenhuis, Marit. Wij tellen elk jaar. Gewone zeehonden, grijze zeehonden. Op afstand. Dat is het hele werk.":"Zeeheundenhuus, Marit. Wie tellen elk joar. Gewone zeeheunden, grieze zeeheunden. Op afstand. Dat is t hele wark.",
"Zeg dat niet tegen Jelle.":"Zeg dat nait tegen Jelle.",
"Zeg haar ook dat ik mijn fiets terug wil. Uit 1953.":"Zeg heur ook dat ik mien fiets weerom wil. Oet 1953.",
"Zeg het niet tegen Rikus. Hij maakt er een jingle van.":"Zeg t nait tegen Rikus. Hai moakt der n jingle van.",
"Zet me af bij het hek. Niet bij de halte. Bij het hek. Mijn koeien wachten niet.":"Zet mie af bie t hek. Nait bie de halte. Bie t hek. Mien kij wachten nait.",
"Zevenenveertig jaar. Elke zaterdag een brood weg.":"Zevenenveertig joar. Elke zoaterdag n stoet vot.",
"Zeventig, honderdtwaalf, eenendertig. Tweehonderdveertien.":"Zeuventig, honderdtwaalf, eenendartig. Twijhonderdveertien.",
"Zie je? Hij loopt van hier tot Friesland. Mijn oma loopt er elke avond over. In gedachten.":"Zai je? Hai lopt van hier tot Friesland. Mien oma lopt der elke oavend over. In gedachten.",
"Zijn gewicht ligt voor. Op de slee van Hilko. Het schuift.":"Zien gewicht ligt veur. Op de slee van Hilko. t Schoeft.",
"Zijn neef zei: niet doorvertellen.":"Zien noaf zee: nait deurvertellen.",
"Zo begint een filiaal.":"Zo begint n filiaal.",
"Zo praat de dijkwerker ook.":"Zo proat de dijkwarker ook.",
"Zo. Het was een rondje. Mooier wordt het niet. Dat is een compliment aan het park.":"Zo. t Was n rondie. Mooier wordt t nait. Dat is n compliment aan t park.",
"Zo. Jij roeit. Ik wijs. Als je me hoort ademen, ga je te snel.":"Zo. Doe roeist. Ik wies. As je mie hoorst ademen, goa je te snel.",
"Zoals mijn vader. Hij zei dat ook. Hij is er een keer niet teruggekomen.":"Zoas mien voader. Hai zee dat ook. Hai is der ain keer nait weerom komen.",
"Zoutkamp. Kotters met uitgeklapte bomen, als insecten op de kade. Het ruikt naar zout en naar werk, in die volgorde.":"Zoutkamp. Kotters mit oetklapte bomen, as insekten op de kaai. t Rukt noar zout en noar wark, in dij volgorde.",
"Zoutkamp. Kotters, een brug en een man met een schop. Het ruikt naar zout. Ik wil niet meer weg.":"Zoutkamp. Kotters, n brug en n man mit n schop. t Rukt noar zout. Ik wil nait meer vot.",
"Zuidhorn. Een station, een molen aan de horizon en geen haast. Ik zou hier een filiaal willen.":"Zuudhorn. N station, n molen aan de horizon en gain haast. Ik wol hier n filiaal willen.",
"Zuidhorn. Een station, een molen en twee treinen per uur. De molenaar telt ze allebei.":"Zuudhorn. N station, n molen en twij treinen per uur. De molenoar telt ze allebei.",
"…Daar praat ik niet over.":"…Doar proat ik nait over.",
"…Dat klopt. Hij is gisteren gebracht. Door een man die zei dat het een bruikleen was.":"…Dat klopt. Hai is gistern brocht. Deur n man dij zee dat t n bruikleen was.",
"…Dat wist ik niet.":"…Dat wus ik nait.",
"…Ik jureer morgen. Op de pier in Lauwersoog. Ubbo zei: een man van de streek.":"…Ik jureer mörn. Op de pier in Lauwersoog. Ubbo zee: n man van de streek.",
"…Ik jureer niet meer. Ik ga naar het Wad. Mijn vader heeft nog een plek.":"…Ik jureer nait meer. Ik goa noar t Wad. Mien voader het nog n plek.",
"…Valt mie nait of.":"…Valt mie nait of.",
"…We hebben een envelop gekregen. Het spijt ons. Hij ligt in een gracht.":"…Wie hebben n envelop kregen. t Spiet ons. Hai ligt in n gracht."
}
```

### G. TTS-cast en sprekerskleuren

Niets hiervan is ingesproken (geen API-aanroepen in deze ronde).

```js
// scripts/tts_lines_list.mjs CAST: add (all 30 Gemini voices are in use: shared voices follow the "never in the same scene" note; Frisian speakers use lang: 'own')
  'Wadgids Fenna': { voice: 'Zephyr', who: 'Fenna, wadgids, helder, jong en streng; kleindochter van Sientje', pool: ['helder, rustig, aan de telefoon op de radio', 'helder, fluisterend', 'helder, rustig'], accent: 'spoken in Gronings from the Wadkust, bright young woman, clear and steady' },   // Koe Aaltje (Zephyr): nooit in dezelfde scène
  'Fokko de Visser': { voice: 'Umbriel', who: 'Fokko de Visser, palingsmokkelaar en wadvisser, rauw en kalm, vader nooit teruggekomen', pool: ['rauw, vriendelijk dreigend, vanaf het dek van de kotter', 'rauw, kalm', 'woedend, beheerst, vanaf het dek'], accent: 'spoken in Gronings from the Wadkust, rough fisherman, low and quiet' },   // Siebrand en Sjoerd (Umbriel): niet in F4b
  'Dijkwerker': { voice: 'Sadaltager', who: 'de dijkwerker van Noordpolderzijl, melder, droog en kalm, neef van Harm', pool: ['droog, kalm, leunend op zijn schop', 'droog, trots', 'droog, kalm'], accent: 'spoken in Gronings, dry and calm, "ik meld alleen"' },   // Henk (Sadaltager): alleen aan de telefoon, nooit samen
  'Oma Sientje': { voice: 'Autonoe', who: 'Sientje, 88, wadvissersvrouw, droog en helder, Fenna\'s oma', pool: ['oud, helder, droog', 'droog', 'oud, droog, kijkt naar Fokko'], accent: 'spoken in Gronings from the Wadkust, very old woman, dry and clear' },   // Koe Grietje (Autonoe): nooit in dezelfde scène
  'Visser': { voice: 'Rasalgethi', who: 'Visser Dolf en Visser Hendrik, zware oude vissers met schulden, weinig woorden', pool: ['droog, zwaar', 'zacht, zwaar', 'zwaar, proevend'], accent: 'spoken in Gronings, heavy, slow, few words' },   // Sjabbe en Lubbert (Rasalgethi): niet in F4b
  'Kapitein Sybren': { voice: 'Iapetus', who: 'Kapitein Sybren van de veerboot, kalm en droog, spreekt Fries met een Nederlands zinnetje', pool: ['kalm, traag, door de boordradio', 'kalm, droog, in de deuropening', 'droog, vriendelijk'], accent: 'spoken in Frisian (Frysk), calm old captain' },   // torenwachter en Bert (Iapetus): alleen aan de telefoon
  'Wessel': { voice: 'Alnilam', who: 'Wessel, Fenna\'s neef, jonge visser met een weddenschap', pool: ['opgewekt, jong', 'opgewekt', 'trots'], accent: 'spoken in Gronings, young and cheerful' },   // Harm (Alnilam): niet in dezelfde scène
  'Vogelwachter Joop': { voice: 'Charon', who: 'Vogelwachter Joop op Rottumeroog, droog en vriendelijk', pool: ['droog, kalm, aan het strand met een verrekijker', 'droog, kalm', 'droog, vriendelijk'], accent: 'spoken in Gronings, dry and calm' },   // Berend (Charon): niet in F4b
  'Verzorger Marit': { voice: 'Erinome', who: 'Marit van het Zeehondenhuis, rustig en vriendelijk', pool: ['rustig, vriendelijk, via de marifoon', 'vriendelijk, via de marifoon', 'rustig, via de marifoon'], accent: 'spoken in Gronings, calm and kind, over a marine radio' },
  'Vader': { voice: 'Rasalgethi', who: 'een vader met twee kinderen op het Wad', pool: ['joviaal, een tikje bezorgd', 'zacht, onder de indruk', 'blij, moe'], accent: 'spoken in Gronings, jovial' },
  'Influencer': { voice: 'Puck', who: 'een influencer in een goudkleurig jack', pool: ['opgewonden, in een goudkleurig jack', 'roepend, rennend', 'beteuterd'], accent: 'spoken in standard Dutch, eager' },   // Jelmer (Puck): niet in dezelfde scène
  'Tinus': { voice: 'Sadachbia', who: 'Tinus, 24, trekkertrekker uit Tolbert, stug en droog, rouwt om zijn opa', pool: ['gehaast, jong, aan de telefoon op de radio', 'stug, aan de telefoon op de radio', 'stil, droog, aan de telefoon op de radio'], accent: 'spoken in Gronings from the Westerkwartier, young and terse' },   // Dijkstra (Sadachbia): niet in F4b
  'Hilko Kremer': { voice: 'Achird', who: 'Hilko Kremer, rallyrijder en trekkertrekker met sponsorgeld, luid en zelfverzekerd', pool: ['luid, zelfverzekerd, vanuit zijn monstertrekker', 'grinnikend', 'woedend, door de rook'], accent: 'spoken in Gronings, loud and cocky' },   // Eppo (Achird): niet in dezelfde scène
  'Molenaar': { voice: 'Alnilam', who: 'de molenaar van Zuidhorn, melder, droog en kalm', pool: ['droog, kalm, stappend van zijn fiets', 'droog', 'droog, kalm'], accent: 'spoken in Gronings from the Westerkwartier, dry' },
  'Rally-Rennie': { voice: 'Erinome', who: 'Rally-Rennie, secretaris van een rallyclub zonder auto, kordaat en snel', pool: ['kordaat, snel, aan de telefoon op de radio', 'kordaat, kil, aan de telefoon op de radio', 'kordaat, droog, leest voor, aan de telefoon op de radio'], accent: 'spoken in Gronings, brisk and clipped, like pacenotes over a radio' },   // Verzorger Marit (Erinome): nooit in dezelfde scène
  'Neef Siemen': { voice: 'Puck', who: 'Neef Siemen Kremer, clubkampioen, luid en jong', pool: ['luid, jong, zelfverzekerd', 'grinnikend', 'brutaal'], accent: 'spoken in Gronings, young and brash' },
  'Koetsier Wiegert': { voice: 'Zubenelgenubi', who: 'Koetsier Wiegert, veertig jaar koetsier, trots en plechtig', pool: ['trots, plechtig, in livrei', 'verontwaardigd', 'beteuterd'], accent: 'spoken in Gronings, proud and ceremonial' },   // Ubbo en Geert (Zubenelgenubi): niet in dezelfde scène
  'Knecht': { voice: 'Sadaltager', who: 'een knecht van Fokko, wanhopig en slecht betaald', pool: ['gehaast, op de boot', 'hijgend, wanhopig'], accent: 'spoken in Gronings' },
  'Havenmeester Tjerk': { voice: 'Alnilam', who: 'Havenmeester Tjerk van Lauwersoog, streng en vriendelijk, met een fluit', pool: ['streng, fluitend', 'waarschuwend, roepend', 'verontwaardigd, roepend'], accent: 'spoken in Gronings, stern but friendly, over a marine radio' },
  'Boer Evert': { voice: 'Enceladus', who: 'Boer Evert, nuchter loonwerker', pool: ['droog, nuchter', 'droog, vanaf de trekker', 'droog, nuchter, bij de hakselaar'], accent: 'spoken in Gronings from the Westerkwartier' },   // Kapitein Klaas (Enceladus): niet in dezelfde scène
  'Baancommissaris': { voice: 'Sadaltager', who: 'baancommissarissen van de rally, verlegen', pool: ['zakelijk, verlegen', 'verlegen, zacht', 'verlegen'], accent: 'spoken in Gronings, shy and formal' },
  'Dame met hoed': { voice: 'Despina', who: 'een ambtenaar met hoed en klembord', pool: ['formeel, droog, met een klembord', 'droog'], accent: 'spoken in standard Dutch, formal' },
  'Monteur': { voice: 'Sadaltager', who: 'de sloper bij Zuidhorn, vermoeid', pool: ['droog, vermoeid, bij de sloperij'], accent: 'spoken in Gronings, tired' },
  'Sander': { voice: 'Puck', who: 'Sander, 14, filmt met een drone', pool: ['opgewonden, jong, met een tablet', 'opgewonden, via de tablet', 'geschrokken'], accent: 'spoken in Gronings, excited teenager' },
  'Wandelaar': { voice: 'Achird', who: 'een wandelaar met te goede laarzen', pool: ['trots, in zijn beste laarzen'], accent: 'spoken in standard Dutch with a Brabant lilt' },
  'Garnalenvisser': { voice: 'Enceladus', who: 'een garnalenvisser in Zoutkamp, droog en trots', pool: ['droog, kalm, op de kotter', 'droog', 'droog, trots'], accent: 'spoken in Gronings from the coast' },
  'Marktkoopman': { voice: 'Rasalgethi', who: 'een marktkoopman, joviaal', pool: ['gehaast, aan de telefoon', 'luid, joviaal', 'joviaal'], accent: 'spoken in Gronings, smooth' },
  'Sterrenkijker': { voice: 'Iapetus', who: 'een sterrenkijker, fluisterend en geboeid', pool: ['fluisterend, geboeid'], accent: 'spoken in Gronings, whispering' },
  'Passagier': { voice: 'Despina', who: 'een passagier op de veerboot', pool: ['opgewekt, in een regenjas'], accent: 'spoken in standard Dutch' },
  'Wadloper': { voice: 'Alnilam', who: 'een wadloper uit de groep', pool: ['tevreden, moe'], accent: 'spoken in standard Dutch, tired and content' },

// game/js/speakers.js SPEAKER_COLORS: add (luminance 0.18-0.30 checked)
  'Wadgids Fenna': '#3a9bb5',   // lum 0.28
  'Fokko de Visser': '#8a7a64',   // lum 0.20
  'Dijkwerker': '#8f8a4a',   // lum 0.25
  'Oma Sientje': '#b0709a',   // lum 0.23
  'Molenaar': '#6a8f5a',   // lum 0.23
  'Tinus': '#8a7fc0',   // lum 0.24
  'Hilko Kremer': '#c0503f',   // lum 0.17
  'Rally-Rennie': '#c0702a',   // lum 0.23
  'Kapitein Sybren': '#4a86b0',   // lum 0.22
  'Koetsier Wiegert': '#9a76aa',   // lum 0.23
  'Neef Siemen': '#5f9a50',   // lum 0.26
  'Wessel': '#968a3a',   // lum 0.25
  'Havenmeester Tjerk': '#5a8a9a',   // lum 0.23
```

### H. ommelandlines.js (wereldeinden en dorpsuitjes)

```js
// ommelandlines.js: add to WORLD_ENDS
  { id: 'zijl', name: 'Het einde van het land', prop: 'bord', sign: ['Hier houdt het land op.', 'Het Wad begint.'], who: DUO, text: 'Hier houdt het land op. Daarachter is alleen nog water. En soms ook niet. Kon minder.', tag: 'droog, kijkend over het Wad' },
  { id: 'visafslag', name: 'De laatste visafslag', prop: 'frituur', sign: ['Laatste visafslag voor de zee', 'Gesloten wegens zee'], who: DUO, text: 'De laatste visafslag voor de zee. En hij is dicht. De zee is open. Dat is het verschil.', tag: 'droog, teleurgesteld' },
  { id: 'fryske-dyk', name: 'De Friese dijk', prop: 'friesland', west: true, sign: ['Welkom in Fryslân', 'Net fertelle'], who: 'Wybe', text: 'Wolkom yn Fryslân. Dit is in grins.', tag: 'traag, plechtig' },
  { id: 'hunebed', name: 'Drenthe is dicht', prop: 'hunebed', sign: ['Drenthe is dicht', 'Sinds 3400 voor Christus'], who: 'Boer', text: 'Doar achter is Drenthe. Het hunebed zegt dat het dicht is. Dat zegt hij al vijfduizend jaar.', tag: 'droog, stellig' },
  { id: 'open-zee', name: 'Open zee', prop: 'radio', sign: ['Hier eindigt het Wad', 'De zee begint'], who: 'Loodsdienst', text: 'Hier is de kustwacht. Het Wad houdt hier op. Daarachter is de zee. Daar kom je niet terug van zonder motor.', tag: 'zakelijk, door de marifoon' },
  { id: 'rikus-wad', name: 'Het busje van Rikus aan het Wad', prop: 'radio', who: 'Rikus', text: 'Radio Nachtstreek, live vanaf de dijk bij het Wad. Het bereik is hier prima. Er staat ook niks in de weg. Behalve water.', tag: 'warm, droog, als nacht-dj op de radio' },

// ommelandlines.js: add to VILLAGES (the spoken lines come from gronings_spoken.json; text is the Dutch shown)
  Zoutkamp: {
    teaser: 'Garnalen pellen op de kade en een visje bij het sluisje',
    special: { kind: 'pellen', name: 'Garnalen pellen op de kade', label: 'Meepellen', sub: 'Een halfuur pellen: meditatie en een bakje om mee te nemen', who: 'Garnalenvisser', tag: 'droog, trots',
      lines: ['Pellen. Gewoon pellen. Je hoeft niets te zeggen. Dat is het mooie.', 'Een bakje. Voor onderweg. Geen vis, geen garnaal, een bakje.'] },
    amenity: { kind: 'cafe', name: 'Visrokerij Het Sluisje (verzonnen)' },
  },
  Pieterburen: {
    teaser: 'Zeehonden kijken door de verrekijker en een kerkje',
    special: { kind: 'verrekijker', name: 'Zeehonden kijken aan de dijk', label: 'Door de verrekijker', sub: 'Een munt, een verrekijker, honderden zeehonden', who: 'Verzorger Marit', tag: 'rustig, vriendelijk',
      lines: ['Links liggen er honderd. Rechts ook. Het zijn er altijd meer dan je telt.', 'Dat is er één die kijkt. Hij weet dat jij naar hem kijkt. Dat is wederzijds.'] },
    amenity: { kind: 'winkel', name: 'Kerkwinkel Pieterburen' },
  },
  Grijpskerk: {
    teaser: 'Een fanfare in het park en een station met een vertraagde trein',
    special: { kind: 'fanfare', name: 'Fanfare in het park', label: 'Meespelen', sub: 'Een toeter en een maat', who: 'Omroeper', tag: 'luid, enthousiast',
      lines: ['Wie kan toeteren? Iedereen. Een maat, een toeter, geen toonladder.', 'Mooi! Het was bijna een mars!'] },
    amenity: { kind: 'cafe', name: 'Café Het Grijpstation (verzonnen)' },
  },
  Leek: {
    teaser: 'Een ritje in het park van Nienoord en een melkbus in een werkplaats',
    special: { kind: 'koets', name: 'Een ritje met de koets', label: 'Meerijden', sub: 'Een rondje door het park met Wiegert, Jan en Alleman', who: 'Koetsier Wiegert', tag: 'trots, vertellend',
      lines: ['Links de vijver. Rechts nog een vijver. Voor ons de beukenlaan. Jan en Alleman kennen de weg.', 'Zo. Het was een rondje. Mooier wordt het niet. Dat is een compliment aan het park.'] },
    amenity: { kind: 'winkel', name: 'Wietse\'s Werkplaats (verzonnen)' },
  },
  Marum: {
    teaser: 'Een paard aanraken op de markt en een uitzicht op Drenthe',
    special: { kind: 'paard', name: 'De paardenmarkt (verzonnen)', label: 'Naar het paard kijken', sub: 'Eén paard, één mening, geen koop', who: 'Marktkoopman', tag: 'joviaal',
      lines: ['Dit paard is zeven. Hij vindt jou aardig. Dat is een prijs op zich.', 'Niet kopen. Alleen aaien. Dat is het hele systeem.'] },
    amenity: { kind: 'cafe', name: 'Café De Rand (verzonnen)' },
  },
  Aduard: {
    teaser: 'Een stilte bij de abdijresten en een zijl',
    special: { kind: 'stilte', name: 'Bij de abdijresten', label: 'Even stil staan', sub: 'Eén minuut zonder iets te doen', who: 'Rikus', tag: 'warm, vertellend',
      lines: ['Eén minuut stilte. Voor een abdij die weg is. En voor een dorp dat bleef. Welterusten, Aduard.'] },
    amenity: { kind: 'cafe', name: 'Café Aduarderzijl (verzonnen)' },
  },
  Niekerk: {
    teaser: 'Proefzitten op een trekker en een rallyclub zonder auto',
    special: { kind: 'trekker', name: 'Proefzitten op een trekker', label: 'Een rondje trekker', sub: 'Eén ronde over het sportveld op een leen-trekker', who: 'Tinus', tag: 'stug, droog',
      lines: ['Gas. Niet te veel. Hij voelt je. Alle trekkers voelen je. Dat zegt niemand.'] },
    amenity: { kind: 'winkel', name: 'Clubhuis De Vierde Versnelling' },
  },
```

### I. Zijmissies (nieuw soort: `side`)

```js
// storyarc.js (NEW kind: 'side'): side missions start from a "?" icon on the map; same rules as the main missions (skip only after one try, money never blocks, loaned vehicles go back)
  { id: 'Z20', part: 'nazomer', kind: 'side', chain: 'rennie', player: 'anita', ring: 2, region: 'westerkwartier', title: 'Grind', reward: 400,
    start: 'Het clubhuis van Rallyclub De Vierde Versnelling, Niekerk (fictief schuurtje; een bord "Gesloten, tenzij wij er zijn")',
    intro: [
      ['rennie', 'Moi. Jij bent die van de frietwagen. Rallyclub De Vierde Versnelling. Twaalf leden. Nul auto\'s.', { tag: 'kordaat, snel', card: 'rennie' }],
      ['A', 'Hoe kan een rallyclub nul auto\'s hebben?', { tag: 'droog' }],
      ['rennie', 'De vorige penningmeester verkocht de clubauto. Voor een koffiemachine. De koffiemachine is stuk. De auto rijdt nog.', { tag: 'kordaat, kil' }],
      ['T', 'Dat is de wereld op zijn kop.', { tag: 'droog, aan de telefoon' }],
      ['rennie', 'De gemeente wil bewijs dat we bestaan. Drie tijdritten op grind. Mijn neef Gerben leent zijn auto. Jij rijdt. Ik lees.', { tag: 'kordaat' }],
      ['A', 'Dat is mijn werk.', { tag: 'strijdlustig' }],
      ['rennie', 'Dan werkt het.', { tag: 'droog' }],
    ],
    say: [
      ['rennie', 'Start. Links vier. Sloot. Niet kijken.', { tag: 'kordaat, door de rallyradio' }],
      ['rennie', 'Rechts drie. Houtwal. Mooi uitzicht. Niet kijken.', { tag: 'kordaat' }],
      ['A', 'Waarom is alles "niet kijken"?', { tag: 'opgetogen' }],
      ['rennie', 'Omdat je dan misschien gaat remmen.', { tag: 'droog' }],
      ['rennie', 'Koeienrooster. Gas erop. Niet remmen. Koeien kijken er niet naar.', { tag: 'kordaat' }],
      ['rennie', 'Brug. Hobbel. Springen. Niet kijken. Ik zei het al.', { tag: 'kordaat' }],
      ['rennie', 'Twee-en-vijftig. Het kan sneller. Het kan altijd sneller.', { tag: 'kordaat, opgetogen' }],
    ],
    outro: [
      ['dame', 'Rallyclub De Vierde Versnelling. Drie secties. Alle drie onder de tijd. Ik teken.', { tag: 'formeel, droog, met een klembord' }],
      ['rennie', 'De club bestaat.', { tag: 'kordaat, ontroerd' }],
      ['dame', 'Dat is de strekking.', { tag: 'droog' }],
      ['rennie', 'Ik was bang dat ik iets moest bewijzen wat ik al wist.', { tag: 'kordaat, stil' }],
      ['A', 'Dat is vaak het moeilijkste.', { tag: 'warm' }],
    ],
    replay: [
      ['rennie', 'Weer het grind? De houtwallen staan er nog.', { tag: 'kordaat' }],
    ],
    card: ['GRIND', 'Drie secties, alle drie onder de tijd. De club bestaat.'],
  },
  { id: 'Z21', part: 'nazomer', kind: 'side', chain: 'rennie', player: 'anita', ring: 2, region: 'westerkwartier', title: 'Sloot', reward: 600,
    start: 'De trainingsweide van de club, een weiland met sloten bij Niekerk',
    intro: [
      ['sander', 'Drone klaar! Drie sloten, één take! Ik heb geen tweede batterij!', { tag: 'opgewonden, jong, met een tablet' }],
      ['rennie', 'Eén take. Dat is een recht van de rallyrijder.', { tag: 'kordaat' }],
      ['A', 'Eén take betekent dat ik niet in de sloot mag.', { tag: 'droog' }],
      ['rennie', 'Dat is altijd het advies geweest.', { tag: 'droog' }],
      ['boer', 'Mijn kippen weten nergens van. Hou dat zo.', { tag: 'droog, van de heg' }],
    ],
    say: [
      ['sander', 'Hij vliegt boven de auto! Ik heb de camera op de bumper! Hij is mooi!', { tag: 'opgewonden, via de tablet' }],
      ['rennie', 'Eerste sloot. Vier meter. Gas, niet remmen, niet piekeren.', { tag: 'kordaat' }],
      ['A', 'Vier meter. Hup!', { tag: 'uitgelaten' }],
      ['rennie', 'Tweede. Vijf meter. Iets meer gas. Het is een sloot, geen mening.', { tag: 'kordaat' }],
      ['sander', 'Hij vliegt de kippenren in! Wegwezen, drone!', { tag: 'geschrokken' }],
      ['boer', 'Mijn kippen leggen nu in stereo.', { tag: 'droog, van ver' }],
      ['rennie', 'Derde. Zes meter. Dit is de lange. Voluit. Niet kijken.', { tag: 'kordaat, gespannen' }],
    ],
    outro: [
      ['sander', 'Het ziet eruit als een film.', { tag: 'stil, onder de indruk' }],
      ['rennie', 'Het is een film. Alleen met kippen.', { tag: 'kordaat, zacht' }],
      ['sander', 'De sponsor krijgt het vanavond. Wietse uit Leek. Hij sponsort met banden. Dat is het.', { tag: 'trots' }],
      ['rennie', 'Banden zijn een begin. Een club met banden is een club.', { tag: 'kordaat' }],
    ],
    replay: [
      ['sander', 'Nog een take? Ik heb een nieuwe batterij!', { tag: 'opgewonden' }],
    ],
    card: ['SLOOT', 'Drie sloten, één take, nul kippen geraakt. Bijna.'],
  },
  { id: 'Z22', part: 'nazomer', kind: 'side', chain: 'rennie', player: 'anita', ring: 2, region: 'westerkwartier', title: 'Kampioen', reward: 900,
    start: 'Het erf van Boer Evert (kippen, een schuur, een klaptafel met oranjekoek)',
    intro: [
      ['siemen', 'Siemen Kremer. Neef van Hilko. Clubkampioen, drie jaar achter elkaar. Er was nooit iemand anders.', { tag: 'luid, jong, zelfverzekerd' }],
      ['rennie', 'Er was ook nooit een tweede auto.', { tag: 'kordaat' }],
      ['siemen', 'Dat is mijn voordeel.', { tag: 'grinnikend' }],
      ['A', 'Dan is dit mijn voordeel.', { tag: 'koel' }],
      ['siemen', 'Welk?', { tag: 'brutaal' }],
      ['A', 'Ik rijd niet voor een oom.', { tag: 'koel' }],
    ],
    say: [
      ['rennie', 'Manche één. Start. Rechts twee. Links drie. Erf. Houd het hoofd erbij.', { tag: 'kordaat' }],
      ['siemen', 'Ik heb de binnenbocht! Ik heb altijd de binnenbocht!', { tag: 'luid, in zijn auto' }],
      ['A', 'Dan neem ik de buitenbocht. Daar ligt meer grind.', { tag: 'strijdlustig' }],
      ['rennie', 'Manche twee. De wind is gedraaid. De kippen niet.', { tag: 'kordaat' }],
      ['siemen', 'Waar kom jij ineens vandaan? Ik… ik zie je niet meer.', { tag: 'luid, dan stil' }],
      ['rennie', 'Finish! Een-minuut-vier-en-vijftig! Het verschil is een stopwatchfout. Of een Stadjer.', { tag: 'kordaat, ademloos' }],
    ],
    outro: [
      ['siemen', 'Eindelijk. Iemand die harder rijdt dan ik. Dat is een opluchting.', { tag: 'stil, ademloos' }],
      ['A', 'Het was dichtbij.', { tag: 'warm' }],
      ['siemen', 'Mijn oom heeft de commissarissen betaald voor vandaag. Ik wist het. Ik heb er niks van gezegd. Ik wilde winnen zonder.', { tag: 'stug, eerlijk' }],
      ['rennie', 'Dat is het eerste wat je ooit goed deed.', { tag: 'kordaat, zacht' }],
      ['siemen', 'Hier. De Gouden Moersleutel. Ik heb hem gekocht. Van de penningmeester. Voor een koffiemachine.', { tag: 'trots, stil' }],
      ['A', 'Nu is hij van de club.', { tag: 'zacht' }],
      ['rennie', 'Nu is hij van de club. De club heeft een kampioen. Zij heeft er twee.', { tag: 'kordaat, ontroerd' }],
    ],
    replay: [
      ['siemen', 'Revanche? Ik heb geoefend. Een uur.', { tag: 'luid' }],
    ],
    card: ['KAMPIOEN', 'Twee manches, één Gouden Moersleutel, en een club met een kampioen.'],
  },
  { id: 'Z23', part: 'nazomer', kind: 'side', chain: 'fenna', player: 'anita', ring: 2, region: 'wadkust', title: 'Toeristen', reward: 500,
    start: 'De wadloopstart aan de dijk bij Pieterburen (het pad dat in het Wad verdwijnt, ochtend bij eb)',
    intro: [
      ['fenna', 'Goedemorgen. Ik ben Fenna. Drie regels. Eén: de gids bepaalt. Twee: je kijkt naar het water, niet naar je voeten. Drie: je loopt nooit alleen. Jij loopt achteraan. Jij bent mijn ogen.', { tag: 'helder, vriendelijk, streng' }],
      ['vader', 'Mijn dochter wil een zeehond zien. Mag dat?', { tag: 'joviaal, een tikje bezorgd' }],
      ['fenna', 'Van ver. Heel ver. Een zeehond kijkt terug. Hij is niet beleefd, maar hij is wel eerlijk.', { tag: 'helder, vriendelijk' }],
      ['influencer', 'Ik wil een selfie met een zeehond. Het is voor mijn volgers.', { tag: 'opgewonden, in een goudkleurig jack' }],
      ['fenna', 'Het is voor je zeehond. Die volgt je niet.', { tag: 'helder, kil' }],
      ['toerist', 'Is het hier veilig? Er is zo weinig… land.', { tag: 'verbaasd, een tikje bekakt' }],
      ['fenna', 'Met mij wel. Dat is het hele idee.', { tag: 'helder, vriendelijk' }],
    ],
    say: [
      ['fenna', 'Eén voor één. Zachte stappen. Het Wad is zacht en dat is niet erg.', { tag: 'helder, vooraan' }],
      ['wandelaar', 'Ik heb deze laarzen drie jaar bewaard voor vandaag.', { tag: 'trots, in zijn beste laarzen' }],
      ['fenna', 'Dan zijn ze nu eindelijk nat.', { tag: 'helder' }],
      ['kind', 'Mijn laars zit vast! Hij is weg! Hij is weg!', { tag: 'blij, verbaasd' }],
      ['A', 'Rustig. Trek niet. Je voet blijft erin. Je laars gaat eruit. Zo. En dan je voet.', { tag: 'kalm, bij het kind' }],
      ['kind', 'Het is een grotere laars dan ik. Hij is heel gelukkig.', { tag: 'opgelucht' }],
      ['influencer', 'Een zeehond! Eén! Ik pak hem! Mijn volgers!', { tag: 'roepend, rennend' }],
      ['A', 'Stop! Niet dichterbij! Hij gaat weg, en jij blijft hier!', { tag: 'luid, scherp' }],
      ['influencer', 'Maar mijn volgers…', { tag: 'beteuterd' }],
      ['A', 'Die zien je op de foto. Van ver. Dat is mooier.', { tag: 'droog' }],
      ['vader', 'Een schelp. Mag ze hem houden?', { tag: 'zacht, onder de indruk' }],
      ['fenna', 'Leg hem op de plaat. Dan blijft het een stuk Wad. Ze mag hem uit je hoofd meenemen.', { tag: 'helder, vriendelijk' }],
      ['toerist', 'Ik wil terug. Het is zo groot. Mag ik terug?', { tag: 'angstig' }],
      ['A', 'Je loopt niet alleen. Ik loop achter je. Dat is mijn werk. Je hoeft niets te doen, alleen te lopen.', { tag: 'zacht, geruststellend' }],
    ],
    outro: [
      ['fenna', 'Negen. Weer negen.', { tag: 'helder, tevreden' }],
      ['vader', 'Dat was het mooiste wat mijn kinderen ooit gezien hebben. Die zeehond keek terug.', { tag: 'blij, moe' }],
      ['toerist', 'Het was… niet eng. Het was groot. Dat is anders.', { tag: 'stil, geraakt' }],
      ['influencer', 'Ik heb geen selfie. Maar ik heb het gezien. Mag ik dat zeggen?', { tag: 'beteuterd, stil' }],
      ['fenna', 'Dat mag. Dat is de beste foto.', { tag: 'helder, vriendelijk' }],
    ],
    replay: [
      ['fenna', 'Weer een groep? Altijd negen. Of tien. Of acht. Ik tel.', { tag: 'helder' }],
    ],
    card: ['TOERISTEN', 'Negen op, negen terug. Een laars gered, een zeehond met rust gelaten.'],
  },
  { id: 'Z24', part: 'nazomer', kind: 'side', chain: 'fenna', player: 'tammo', ring: 2, region: 'wadkust', title: 'Tellen', reward: 700,
    start: 'De steiger van de kotter Trijntje in Lauwersoog; een beiboot naar een zandplaat in het Wad (laagwater, middag)',
    intro: [
      ['verzorger', 'Zeehondenhuis, Marit. Wij tellen elk jaar. Gewone zeehonden, grijze zeehonden. Op afstand. Dat is het hele werk.', { tag: 'rustig, vriendelijk, via de marifoon' }],
      ['T', 'Hoeveel verwacht je?', { tag: 'zacht, droog' }],
      ['fenna', 'Dat is de vraag. Er is geen verwachting. Er is alleen tellen.', { tag: 'helder, zacht' }],
      ['T', 'Ik ben goed in wachten.', { tag: 'zacht' }],
      ['fenna', 'Dat weet ik. Daarom ben je hier.', { tag: 'helder, vriendelijk' }],
    ],
    say: [
      ['fenna', 'Motor uit. Peddelen. Driehonderd meter. De ring op de kaart. Daarbuiten.', { tag: 'helder, fluisterend' }],
      ['T', 'Ze liggen te liggen. Heel veel. Eén is wakker. Hij kijkt naar mij.', { tag: 'zacht, verbaasd' }],
      ['fenna', 'Dat is een gewone zeehond. Die met die lange neus is een grijze. Hij is groter. Hij kijkt trotser.', { tag: 'helder, zacht' }],
      ['T', 'Foto één. Links. Zeventig.', { tag: 'fluisterend' }],
      ['T', 'Foto twee. Midden. Honderdtwaalf. Een pup. Ik zie een pup.', { tag: 'fluisterend' }],
      ['fenna', 'Ze zijn er. Dat is genoeg.', { tag: 'zacht, ontroerd' }],
      ['T', 'Foto drie. Rechts. Eenendertig. Ik zie een zeehond die niets doet. Dat is ook een soort talent.', { tag: 'fluisterend' }],
    ],
    outro: [
      ['T', 'Zeventig, honderdtwaalf, eenendertig. Tweehonderdveertien.', { tag: 'zacht, voorzichtig' }],
      ['fenna', 'Tweehonderdveertien. Dat is goed. Dat is meer dan vorig jaar. Dat is niet genoeg om te juichen. Genoeg om blij te zijn.', { tag: 'helder, zacht' }],
      ['fenna', 'Daar staat een platform. Alleen bij helder weer. Mijn opa werkte ooit bij het gas. Hij sprak er nooit over. Hij keek alleen naar het Wad.', { tag: 'zacht, stil, kijkt naar de horizon' }],
      ['T', '…Ik weet het.', { tag: 'zacht, stil' }],
      ['fenna', 'Ja. Hij wist het ook.', { tag: 'helder, zacht' }],
      ['verzorger', 'Tweehonderdveertien. Dat gaat in het boek. Met jullie naam. Het Wad dankt jullie. Een zeehond doet dat niet. Maar hij blijft liggen. Dat is zijn manier.', { tag: 'vriendelijk, via de marifoon' }],
    ],
    replay: [
      ['verzorger', 'Weer tellen? Elke dag een ander getal. Dat is de bedoeling.', { tag: 'rustig, via de marifoon' }],
    ],
    card: ['TELLEN', 'Tweehonderdveertien zeehonden, op afstand geteld. Ze bleven liggen.'],
  },
  { id: 'Z25', part: 'nazomer', kind: 'side', chain: 'fenna', player: 'anita', ring: 2, region: 'wadkust', title: 'Het verboden eiland', reward: 900,
    start: 'Zoutkamp, de haven (een platbodem van Fenna\'s neef Wessel, hoogwater, ochtend)',
    intro: [
      ['wessel', 'Moi. Wessel. Neef van Fenna. Ik heb een weddenschap. Wie het eerst op Rottumeroog staat krijgt een krat bier van Klaas-Jan.', { tag: 'opgewekt, jong' }],
      ['fenna', 'Niemand zet daar voet. Het is natuur. Wij gaan kijken.', { tag: 'helder, streng' }],
      ['wessel', 'Kijken is ook een soort aanwezigheid.', { tag: 'opgewekt' }],
      ['fenna', 'Kijken is de enige.', { tag: 'helder, droog' }],
      ['A', 'Heb je het bier alvast ingeladen?', { tag: 'geamuseerd' }],
      ['wessel', 'Voor als we het vieren. Op afstand.', { tag: 'trots' }],
    ],
    say: [
      ['fenna', 'Bakens volgen. Rood links, groen rechts. De geul is smal. De plaat links is droog.', { tag: 'helder' }],
      ['wessel', 'Zeehonden! Dat is een hele rij! Ze liggen te zonnen!', { tag: 'opgewekt' }],
      ['A', 'Niet te dichtbij. De ring staat op de kaart. Ik rij eromheen.', { tag: 'geconcentreerd' }],
      ['fenna', 'Daar. Rottumeroog. Zie je de hut? Daar wonen mensen die er voor zorgen. Verder niemand.', { tag: 'helder, ontroerd' }],
      ['wessel', 'Het is mooier dan ik dacht. En het is leeg.', { tag: 'zacht, plots stil' }],
      ['fenna', 'Dat is het mooie. Het is leeg voor zichzelf.', { tag: 'helder, zacht' }],
      ['A', 'Strandlijn. Hut. Het bord. Klik. Klik. Klik.', { tag: 'zacht' }],
      ['wessel', 'Dat bord. Wat staat erop?', { tag: 'zacht' }],
      ['A', '"Natuurgebied. Hier is niemand welkom. Behalve de wind."', { tag: 'stil, leest voor' }],
      ['wessel', 'Ik hoef geen bier. Dit is genoeg.', { tag: 'stil, onder de indruk' }],
    ],
    outro: [
      ['fenna', 'Je hebt geen voet gezet. Dat is de enige manier om er te zijn.', { tag: 'helder, tevreden' }],
      ['wessel', 'Klaas-Jan betaalt dus niet. Ik ook niet. Dat is eerlijk.', { tag: 'stil, grijnzend' }],
      ['A', 'Dat is het slimste wat ik ooit iemand heb zien verliezen.', { tag: 'warm' }],
      ['fenna', 'Het is geen verlies. Het is een foto.', { tag: 'helder, zacht' }],
    ],
    replay: [
      ['wessel', 'Weer kijken? Ik neem geen bier mee. Alleen een stoel.', { tag: 'opgewekt' }],
    ],
    card: ['HET VERBODEN EILAND', 'Rottumeroog gezien vanaf zee. Niemand zette voet aan wal. Dat is de enige manier.'],
  },
  // Z25 landing gag (the player lands on Rottumeroog; the boat is put back outside the ring)
  // landing: [
  //   ['vogelwachter', 'Dit is Rottumeroog. Hier mag niemand komen. Ook ik niet, eigenlijk. Ik werk hier.', { tag: 'droog, kalm, aan het strand met een verrekijker' }],
  //   ['vogelwachter', 'U staat op het enige stuk Nederland dat u niet mag betreden. Behalve ik. En de eidereenden. Ik meld alleen: de boot ligt die kant op.', { tag: 'droog, kalm' }],
  //   ['fenna', 'Ik zei: kijken.', { tag: 'helder, vlak, aan de reling' }],
  //   ['A', 'Ik wilde de strandlijn van dichtbij zien.', { tag: 'beteuterd' }],
  //   ['vogelwachter', 'Van dichtbij is hij hetzelfde. Alleen natter.', { tag: 'droog, vriendelijk' }],
  // ],
```


## 12. Tellingen en TTS-begroting

- **Hoofdmissies:** 8 (O11, O12, O13, O14, O15, O16, O17, O18), plus 4 verhaalstappen tussendoor (n-zoutkamp, n-kotter, n-zuidhorn, n-schuur).
- **Zijmissies:** 6 in 2 reeksen (Z20, Z21, Z22 Rally-Rennie; Z23, Z24, Z25 Wadgids Fenna).
- **Activiteiten en bijbanen:** 12 blokken (wadgids, havenloods en veer aanleggen, veerboot naar Schier, boot-klussen, regatta en kanaalraces, dijkraces en driftplekken, N-wegsprints, trekker- en loonwerkklussen, kermiscircuit Zuidhorn, bus en vrachtwagen, filialen, verkennen en verzamelen).
- **Ontmoetingen en events:** 20. **Herkenningspunten:** 25. **Geheimen:** 8 (waarvan één Rottumeroog). **Wereldeinden:** 6. **Dorpsuitjes:** 7. **Autogesprekken:** 27.
- **Gesproken regels in dit document:** 910 (inclusief autogesprekken); unieke Groningse spreekregels: 834, waarvan 810 nieuw (± 45k tekens); Friese ondertitels: 38; Groningse ondertitels: 0.
- **Per spreker:** Tammo 201, Anita 191, Wadgids Fenna 84, Rikus 58, Rally-Rennie 46, Tinus 28, Jelle Terpstra 25, Hilko Kremer 18, Koetsier Wiegert 18, Fokko de Visser 16, Oma Sientje 16, Molenaar 15, Kapitein Sybren 12, Wybe 11, Boer 10, Dijkwerker 9, Neef Siemen 9, Wessel 9, Havenmeester Tjerk 8, Wiebren 8, Visser 7, Mem Terpstra 7, Omroeper 7, Oma Trijntje 6, Durk 6, Sander 6, Reiziger 6, Ubbo Oldenhuis 5, Boer Evert 5, Toerist 5, Verzorger Marit 5, Garnalenvisser 5, Agent 4, Baancommissaris 4, Influencer 4, Marktkoopman 4, Dokter Dijkstra 3, Douwe 3, Vader 3, Vogelwachter Joop 3, Knecht 2, Henk 2, Dame met hoed 2, Kind 2, Buschauffeur Jannes 2, Loodsdienst 2, Monteur 1, Wandelaar 1, Wadloper 1, Passagier 1, Student 1, Sterrenkijker 1, Kermisbaas Hennie 1, Kapitein Klaas 1.
- **TTS-begroting:** ± 810 nieuwe Groningse regels, ruim 834 als je de hergebruikte meetelt; Friese regels van Jelle, Mem, Sybren, Wybe en Wiebren zijn `lang: 'own'`. De betaling verloopt via OpenRouter-credits (zie het geheugen over TTS-kosten); niets is nu uitgevoerd.
