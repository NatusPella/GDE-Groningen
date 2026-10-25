> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/verhaal.md` (Deel 4 vóór de herschrijving).
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Deel 4 · F4c: Oldambt, Veenkoloniën, Westerwolde en de finale

Productiescript voor inhoudsdrop **F4c** van Deel 4 "Nazomer" (de Ommelander Ronde), oktober 2026. Hoort bij [PROVINCIE-VERHAAL.md](../PROVINCIE-VERHAAL.md) (§2-§5, §9), [deel4-f4a.md](deel4-f4a.md) (zelfde opzet, zelfde dataformaten) en [personages.md](../personages.md). Alleen tekst: geen code, geen TTS-aanroepen. F4b (Wadkust en Westerkwartier) is parallel in de maak; wat dit script van F4b aanneemt staat in §1.3.

**Wat erin staat**
- het kader van ring 3 en ring 4, kalender, geld- en overslaanregels, aannames over F4b (§1);
- de nieuwe personages met naamkaart, stem en kleur (§2);
- de hoofdmissies **O19-O32** en de verhaalstappen ertussen, met route, verloop, falen/overslaan, cutscènes met cameranotities, alle dialoog, telefoon en radio, HUD-doelen, afrondingskaart en autogesprekken (§3), waaronder **de finale: het beleg van Vesting Bourtange** (O28-O32);
- de zijreeksen **De Randstedelingen (Z9-Z12)**, **Brugwachter Wubbo (Z13-Z16)** en **De Wolvenman (Z17-Z19)** (§4);
- activiteiten en bijbanen: museumspoor (stoker/machinist), vrachtwagenritten naar Veendam en de grens, buslijnen, driftplekken en veenwegsprints, kermiscircuit, combinerace, oogstfeest, kanaalboot-banen, grensgrappen, gewasspuiter, vliegbrevet, filialen (§5);
- toevallige ontmoetingen en events (§6), herkenningspunten en geheimen (§7), Nachtstreek (§8);
- continuïteit, eindpunt en credits, gevoelige onderwerpen (§9), echte plekken om te verifiëren (§10);
- een **data-bijlage** in de vorm van de bestaande code (§11) en de tellingen (§12).

**Vaste regels voor dit script**
- **Altijd zomer.** Deel 4 speelt in de nazomer (F4c: dag 46-51, maandag 28 september tot en met zaterdag, de finale; de HUD toont "nazomer · dag N", nooit een maand), en blijft zomer: geen herfst, geen winter, geen vorst, geen Koningsdag. Het plan-item "de eerste vorst" in O32 is vervangen door "de laatste zomeravond" (§9). Heide in bloei, stoppelvelden, warme avonden, af en toe een bui.
- **Gaswinning** komt alleen voor als stille, respectvolle zijlijn: twee momenten (O23-aankomst Hoogezand en de colonne in O32), zonder grap.
- **Ter Apel is nooit een decor**, ook niet als woord. Het klooster uit het plan is verplaatst naar een fictief landgoed (O29). Ubbo's keten loopt "van Lauwersoog tot Bourtange".
- Geen echte levende personen, geen echte merken of bedrijven (alles verzonnen: Oldenhuis Bakt, Veenmeel, de Vetinspectie, de Stichting Veenspoor, Transport Wierda, Grenswacht). 18+.
- Het is **Grunn**, nooit "de Grunn". Spelerstekst alleen Nederlands; de stemmen spreken Gronings (`scripts/gronings_spoken.json`); Friese en Duitse regels krijgen een Nederlandse ondertitel (`FY`, nieuw `DE`).
- **Missieregels:** overslaan kan pas na één poging; geld blokkeert nooit iets; een voertuig is alleen van jou als je het gekocht hebt (geleende auto's, boten, vliegtuigen en locs gaan terug via `handBack`).

**Zo lees je de dialoog.** `- **Spreker** *(tag)*: tekst`. De tag is de TTS-toon in het Nederlands; bij autogesprekken Engels zoals banterlines.js. Tessa heet in de code `anita`/`A`/spreker `Anita`; in het script staat "Tessa". `[camera: …]`, `[naamkaart: …]`, `[clue]`, `[alleen als Z4 gespeeld]` zijn regelopties zoals in missionstory.js. Tussen haakjes achter een regel: de Nederlandse ondertitel van een Friese of Duitse regel, of van een regel die al in het Gronings op het scherm staat.

**Hoe het gemaakt is.** De Groningse spreektabel (§11 F) is door een regelgebaseerde eerste pass uit de dialoog hierboven gemaakt, met de spelling van de bestaande tabel (`nait`, `gain`, `mie`, `doe`, `n`, `t`, `veur`, `noar`); net als de eerste tabel moet een redacteur met Gronings als moedertaal hem nalezen.

---

## 1. Het kader: ring 3, ring 4 en de finale

### 1.1 Volgorde en ontgrendelen

| Ring | Regio's | Hoe je er komt | Ontgrendeld door |
|---|---|---|---|
| 3 | **Oldambt** (Winschoten, Scheemda, Midwolda, Beerta, Nieuweschans; Blauwestad aan het Oldambtmeer) en **Veenkoloniën** (Veendam, Stadskanaal, Musselkanaal, Hoogezand-Sappemeer) | trein Stad - Hoogezand-Sappemeer - Zuidbroek - Winschoten - Nieuweschans, zijtak Zuidbroek - Veendam; de A7 | vier gewonnen voorrondes (F4a + F4b) |
| 4 | **Westerwolde** (Vlagtwedde, Bellingwolde, Sellingen, Bourtange) | **over de weg**; geen spoor, en dat hoort zo | zes voorrondes + O26 |

**Afwijking van het plan: ring 3 is niet vrij.** Het verhaal heeft een middenpunt (O22) en een dieptepunt (O23-O24) die op elkaar volgen: Oldambt eerst, dan Veenkoloniën. Wie liever in de Veenkoloniën begint, krijgt er wel de melder, de activiteiten en de zijreeks, maar de hoofdmissies wachten. Westerwolde opent pas na O26 (de jurylijst en de plattegrond) en zes voorrondes.

**Voorrondes in totaal:** Hogeland O6, Eemsdelta O10, Wadkust (F4b), Westerkwartier O18, Oldambt **O22** (vijfde), Veenkoloniën **O27** (zesde), Westerwolde **O30-O31** (zevende).

### 1.2 Kalender (vaste dagen, één bron: KALENDER.md)

De datumkaart "Deel 4 · 15 september" staat in F4a; de enige bron voor alle data van Deel 4 is [KALENDER.md](KALENDER.md) (Deel 4). F4a speelt dag 33-40 (di 15 - di 22 sept), F4b dag 41-45 (wo 23 - zo 27), F4c dag 46-51 (ma 28 - za). Dat zijn zeven voorrondes op zeven verschillende dagen: za, di, vr, zo, di, vr, za. De dagen na 22 september zijn "nazomer · dag N" op de HUD; in het verhaal blijft het september (O20 "Het sneeuwt. In september.", O26 "Het is september" kloppen dus). In dialogen staan weekdagen alleen voor de finale: "zaterdag" (de finale is op **dag 51, zaterdag**). *De eerdere teller ("elke voorronde schuift de speldag anderhalve dag op") en het voorstel O10 naar "zo 21 sept" zijn vervallen: O10 staat in F4a op di 22 sept.*

| Dag | Weekdag | Dagdeel | Missie |
|---|---|---|---|
| 46 | ma | middag / avond | `n-winschoten`, O19 (avond) |
| 47 | di | ochtend / middag / avond / nacht | O20, O21, O22 (**voorronde 5, kermis Winschoten**), `n-beerta`, `n-aanbod`, `n-ruzie` (nacht) |
| 48 | wo | middag, avond, nacht | `n-veendam`, O23, O24, O25 |
| 49 | do | nacht | O26 |
| 50 | vr | middag | O27 (**voorronde 6, Veendam**), `n-brugwachter`, `n-westerwolde` |
| 51 | za | ochtend | O28 (de rit door het bos) |
| 51 | za | nacht ervoor (01:00) | O29 (kloostertuin; speelt "de nacht voor de finale") |
| 51 | za | middag | O30 (het beleg), O31 (de laatste ronde, **voorronde 7**) |
| 51 | za | gouden uur tot nacht | O32 (colonne naar Stad), `n-boshut` |

Een nachtmissie hoort bij de dag waarop hij begint; na middernacht is het de volgende dag, binnen de grens van de volgende stap (O25 begint op wo, O26 op do en speelt na middernacht op vr; zie KALENDER.md).

(O29 speelt dus tussen O28 en O30 maar in de nacht van vrijdag op zaterdag; de HUD zet de klok daarvoor terug naar 01:00. Zo blijft de finale op één dag.)

### 1.3 Aannames over F4a en F4b (voor de schrijvers van F4b)

- **F4a:** Ubbo's keten heeft 41 snackbars; de Fjord heeft filialen in Warffum en Delfzijl; de complimentenladder staat op Ow (Rikus, Eppo), Valt mie nait of (Hennie), Braid noar de zin (Lammert, "Ik bewaar wat. Voor de finale."); Z4 geeft de medaille (Oma werd tweede in de Ommelander Ronde, **Bourtange 1953**, "De jury was van een Oldenhuis. Zijn opa."). Als Z4 niet gespeeld is, vertelt Oma het zelf in O28 en geeft Harm-Jan de medaille in O31 (`[alleen als Z4 gespeeld]` / `[alleen zonder Z4]`).
- **F4b (aanname, graag bevestigen):** na de Westerkwartier-voorronde (O18) en een Wadkust-voorronde zijn er vier voorrondes; Fenna (wadgids) en Tinus (trekkertrek) bestaan als sleutels `fenna` en `tinus`; Jelle helpt vanaf de Friese kant en komt in de finale met zijn zwarte trekker-limousine; het **grootboek uit O14** is Fokko's boekje (deel één, de Wadroute); het grootboek van O24 is Ubbo's eigen **Kasboek, deel twee**. Mem Terpstra zit in F4c alleen aan de telefoon (O32). Filialen: Wadkust en Westerkwartier tellen als nummer drie en vier, dus Beerta is nummer vijf, Veendam zes, de boshut zeven.
- **Meldersbond:** de zeven melders zijn kosteres (Geesje), sluiswachter (Lammert), dijkwerker (Wadkust, F4b), molenaar (Westerkwartier, F4b), **molenaar Eilert (Oldambt)**, **brugwachter Wubbo (Veenkoloniën)** en **boswachter Siemen (Westerwolde)**; de torenwachter is de grootvader van het hele gezin.

### 1.4 Geld, bezit, overslaan

Beloningen lopen van € 1.200 (O28) tot € 6.000 (O31), samen **€ 43.300** voor O19-O32 (zie §12). Geen stap kost geld; koopbare extra's (een vliegtuig bij Oostwold, een vrachtwagen, de villa aan het meer, een brommer) zijn `optional`. `storytest.js` krijgt het doel: met `payShare` 0,5 en niets kopen komt niemand vast te zitten. Overslaan pas na één poging; verhaalstappen (n-*) kunnen niet mislukken. Een auto is alleen van jou als je hem koopt: de Fjord Frituur is van Tammo en Tessa; de leenauto's van Wubbo en Roelfien, de gewasspuiter, Lammerts bootje, de brugboot, de sloep en de loc gaan terug.

### 1.5 De boog van F4c in één blik

| Moment | Missie | Wat |
|---|---|---|
| aankomst Oldambt | n-winschoten | Roelfien en Eilert; kaart klapt open |
| ring 3, begin | O19-O21 | het feest aan het meer, de jurylijst uit de lucht, de grens |
| **middenpunt** | **O22** | botsauto's; Durk en Douwe lopen over ("…Hè.") |
| **verleiding** | n-aanbod | Ubbo biedt Tessa 41 karren met haar naam en de Vismarkt terug |
| **dieptepunt** | n-ruzie, O23, O24 | "Jij wilt alles hetzelfde." "Jij wilt alles groter."; Tessa alleen; ze verscheurt het contract live |
| **verzoening** | O25 | onder het karton: "Het is hetzelfde. Maar vriendelijker." |
| bewijs | O26, O27 | de jurylijst en het vel van 1953; voorronde zes op een brug |
| **finale** | O28-O31 | de bisschop in het bos, het klooster bij nacht, **het beleg**, de laatste ronde |
| **thuis** | O32 | "Thuis is waar de kar staat." De colonne naar de Vismarkt |

### 1.6 Oma's zeven gunsten (hoe de lijst wordt afbetaald)

| # | Wie | Gunst in 1953 | Afbetaling |
|---|---|---|---|
| 1 | Geesje (Den Andel) | Trijntje droeg een jaar haar tas | draagt Oma de trap op naar het bolwerk, en luidt de klok (O30, O31) |
| 2 | Lammert (Delfzijl) | danste één keer met Trijntje ("Hij schoof.") | zet de sluis open voor de gracht (O30) en danst, eindelijk, met haar (O31) |
| 3-4 | Fenna en Jelle (Wadkust, F4b) | Mem Gerda en Trijntje | Fenna leidt het veen over; Jelle springt met zijn polsstok en valt erin (O30) |
| 5 | Tinus (Westerkwartier, F4b) | kleinzoon van een schuldenaar | trekt de belegertoren (O30) |
| 6 | Roelfien (Oldambt) | Trijntje betaalde de eerste trekker van haar vader | gewasspuiter: eerst de jurylijst (O20), dan het meel over het bolwerk (O30) |
| 7 | Wubbo (Veenkoloniën) | Trijntje leende zijn vader tien gulden voor een bromfiets | opent de ophaalbrug van de vesting, **te vroeg** voor één keer (O30) |
| +1 | Berend Bos | – (geen gunst, wel een vete) | wint, voor het eerst in veertig jaar (O30) |

---

## 2. Nieuwe personages in F4c

Naamkaarten (`CHARACTERS`), stemmen (Gemini 3.8; er waren in F4a nog twee ongebruikte stemmen over, dus hergebruik met een "nooit in dezelfde scène"-regel) en kleuren (luminantie 0,18-0,30, `speakers.js`).

| Sleutel | Naam | Naamkaart | Stem | Kleur | Let op |
|---|---|---|---|---|---|
| `roelfien` | Roelfien | Graanboerin. Oma's nicht. Vliegt een gewasspuiter zoals anderen fietsen. | Pulcherrima | `#b8683c` | nieuwe stem (F4b-tabel controleren) |
| `eilert` | Molenaar Eilert | Molenaar. Draait mee met de wind. Ziet het graan voor het groeit. | Iapetus | `#7c8f55` | torenwachter, Bert: nooit in dezelfde scène |
| `oblauw` | Mevrouw Oldenhuis-Blauw | Ubbo's zus. Villa aan het meer. Koopt wat haar broer bakt. | Vindemiatrix | `#9a74b0` | Jantina speelt hier niet |
| `wubbo` | Brugwachter Wubbo | Brugwachter. Opent altijd. Een tel te laat. | Achernar | `#a8832e` | nieuwe stem |
| `siemen` | Boswachter Siemen | Boswachter. Kent elk spoor. Meldt het, en loopt door. | Sadaltager | `#4e8a64` | Okke, Ruurd: niet in F4c |
| `gerrit` | Wolvenman Gerrit | Wolvenman. Zeker van zijn zaak. Zijn hond is minder zeker. | Rasalgethi | `#8a8f3a` | alleen Z17-Z19 |
| `dries` | Machinist Dries | Stoker, machinist. Veertig jaar kolen. Geen één klacht. | Enceladus | `#8d7f5a` | Klaas speelt niet in dezelfde scène |
| `floor` / `joost` | Floor, Joost | Uit het westen. Zoekt iets echts. Betaalt contant. (Floor) | Leda / Achird | `#c0627f` / `#4f8aa8` | Femke, Roelf: niet in Z9-Z12 |
| `dolf`, `dina`, `rieks` | Botsautobaas Dolf, Jurylid Dina, Notaris Rieks | (bijrollen) | Alnilam, Zephyr, Laomedeia | grijs | Hennie, Aaltje: niet in dezelfde scène |
| `adviseur`, `adviseuse` | Franchise-adviseur Rob, -adviseuse Sandra | (bijrollen) | Rasalgethi, Despina | grijs | alleen O23, O25 |
| `grens`, `grenzer` | Grenswacht, Grenzwächter | (bijrollen) | Umbriel, Fenrir | grijs | `grenzer` spreekt Duits (`lang: 'own'`) |
| `knecht`, `gast`, `dorpeling`, `berthus` | Knecht van Ubbo, Gast, Bourtanger, Machinist Berthus | (bijrollen) | Alnilam, Zephyr, Despina, Achird | grijs | |

**Botsende namen.** De sms-afzender blijft **"U. Oldenhuis"** (de app heet Ubbo). **Wubbo** naast Dijkstra's roepnaam "Wieken Wubbo": blijft zo. **Roelfien** naast Rotor **Roelf**: aparte sleutels. **Dina** en **Aaltje** (koe): aparte sleutels. **Siemen** is de melder van Westerwolde én Ubbo's laatste jurylid (hij zit er voor Ubbo, hij meldt voor Oma).

## 3. Het verhaal van F4c: hoofdmissies en tussenstappen

Speler per missie (vuistregel: Tessa rijden, water, praten; Tammo sluipen, trekkers, doorzetten, duiven): zeven keer Tessa (O19, O21, O23, O24, O26, O30, O32), zeven keer Tammo (O20, O22, O25, O27, O28, O29, O31, met een wissel naar Tessa).

### Ring 3 · Het Oldambt

Bondgenoot **Roelfien** (graanboerin bij Beerta), melder **molenaar Eilert** (Winschoten), tegenstander **mevrouw Oldenhuis-Blauw** (Ubbo's zus, villa aan het Oldambtmeer). Missiestarts liggen binnen 3 km van elkaar (Midwolda, Beerta, Winschoten, Nieuweschans); safehouse na O22: het dijkhuisje aan de Dollard bij Beerta (afwijking van het plan, dat Termunten noemde: Termunten hoort bij de Eemsdelta).

### Tussendoor: Met de trein naar Winschoten (`n-winschoten`)

Speler: Tammo. Doel: `{ type: 'train', to: 'Winschoten', line: 'nieuweschans', cab: 'berthus' }`. Eerste aankomst in de regio: een station, een melder, een kaartonthulling.

**Wissel:** **Tammo** *(droog)*: Ik neem de trein. Ik kijk uit het raam. Dat kan ik.

**Lead:** **Tessa** *(nieuwsgierig, aan de telefoon)*: Oma belde. Nummer drie op het lijstje heet Roelfien en woont bij Beerta. Ze haalt ons op in Winschoten. "Met iets groots," zei Oma. Ik hoop dat het geen koe is.

**Zegt de companion:** **Tessa** *(enthousiast)*: Het Oldambt. Ik heb gelezen dat het hier de beste klei van Nederland is.

**Coupégesprek Tammo en Tessa: lijn Nieuweschans (banter, `trigger: train:nieuweschans`)**

- **Tessa** *(teasing)*: Hoogezand-Sappemeer. Zuidbroek. Scheemda. Het klinkt als een opsomming van een oom.
- **Tammo** *(dry)*: Jouw oom?
- **Tessa** *(quick)*: Iedereens oom. Er is altijd een oom in Scheemda.
- **Tammo** *(dry, looking out)*: Kijk. Graan. Tot aan de hemel.
- **Tessa** *(dry)*: Dat noemen ze hier uitzicht.
- **Tammo** *(dry, small smile)*: Dat heeft ze van Eilert.
- **Tessa** *(dreamy)*: Winschoten. Ik heb een filiaal gedroomd. Hier. Aan het water.
- **Tammo** *(dry)*: Je hebt het water nog niet eens gezien.
- **Tessa** *(quick)*: Dat is het mooie van dromen.

**Radio:** **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Vanavond vanuit het Oldambt. · **Rikus** *(droog, als nacht-dj op de radio)*: De hemel is hier groter dan de dorpen. Dat zegt niks over de dorpen. Dat zegt iets over de hemel.

**Scène: Winschoten, station en molen.** *Camera:* Opent op het perron: de trein rijdt weg en onthult Roelfien naast een stoffige pick-up, armen over elkaar. Trage rit door de klei, dan een kraan omhoog naar de molengalerij, waar de mist van de kaart over het hele Oldambt wegschuift.

- **Roelfien** *(nuchter, kordaat)*: Moi. Jullie zijn van Trijntje. Jullie hebben haar kin. `[naamkaart: roelfien]`
- **Tessa** *(lachend)*: Dat zeggen ze vaker.
- **Roelfien** *(droog)*: Ik ben Roelfien. Mien moeke was Trijntjes zus. Twee meisjes op één fiets. Er is een foto van.
- **Tammo** *(beleefd, voorzichtig)*: Wat bent u haar schuldig?
- **Roelfien** *(droog, warm)*: De eerste trekker van mien vader. Trijntje betaalde hem. Ze heeft er nooit om gevraagd.
- **Roelfien** *(nuchter)*: Dat is zeventig jaar rente. Ik ben boerin. Ik reken dat uit.
- **Tammo** *(droog)*: En?
- **Roelfien** *(kordaat)*: Veel. Instappen.
- **Molenaar Eilert** *(bedachtzaam, droog)*: Dat is de wind. Hij komt van de Dollard. Daarna komt het graan. Daarna jullie. `[naamkaart: eilert, camera: wide]`
- **Molenaar Eilert** *(zacht, wijs)*: Ik zie het graan voor het groeit. Jullie zie ik ook. Jullie komen vaker dan jullie denken.
- **Tessa** *(nieuwsgierig)*: Bent u familie van de torenwachter?
- **Molenaar Eilert** *(droog)*: Ik ben familie van iedereen die hoog zit. Ik meld alleen.
- **Molenaar Eilert** *(bedachtzaam, droog)*: Dat daar is het Oldambt. En dat blauwe, dat is het meer. Dat is nieuw. Tien jaar. Dat is hier nieuw.
- **Tammo** *(droog)*: Het is erg vlak.
- **Molenaar Eilert** *(droog)*: Wij noemen dat uitzicht.
- **Tessa** *(strijdlustig)*: Waar zit de man met de eenenveertig snackbars?
- **Molenaar Eilert** *(bedachtzaam)*: Overal. Zijn zus woont aan het meer. Zij geeft vanavond een feest. Ik zie de lichtjes al.

**Klaar:** **Tessa** *(warm, aan de telefoon)*: Roelfien wacht bij het station. Naast een pick-up en een verhaal. · **HUD:** "Het Oldambt is open" · "Uitkijkpunt: molen van Winschoten"

### O19 · Blauwe stad, rode auto

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| sluipen, boot | Oldambt | Tessa | De dijk bij Midwolda, aan het Oldambtmeer (avond) | € 2600 | `O19` / missie `blauwestad` |

**Wissel:** **Tessa** *(vastberaden)*: Ik ga. Ik heb een jurk. Jij hebt een auto met de motor aan.

**Lead:** **Tammo** *(gespannen, aan de telefoon)*: Tessa. Er is een sms van hem. "Het feest van mijn zus. Kom alleen. – U.O." Ik heb er een slecht gevoel bij.

**Bel Rikus (beller: Mevrouw Oldenhuis-Blauw, Oldambtmeer)**

- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek. Aan de lijn: een dame van het Oldambtmeer.
- **Mevrouw Oldenhuis-Blauw** *(kil, elegant, aan de telefoon op de radio)*: Rikus. Ik wil een verzoek. Strijkers. Voor mijn feest vanavond, aan het water.
- **Rikus** *(droog, als nacht-dj op de radio)*: Voor wie, mevrouw?
- **Mevrouw Oldenhuis-Blauw** *(kil, aan de telefoon op de radio)*: Voor mijn gasten. U bent niet uitgenodigd.
- **Rikus** *(droog, als nacht-dj op de radio)*: Dat hoor ik vaker.
- **Mevrouw Oldenhuis-Blauw** *(geamuseerd, scherp, aan de telefoon op de radio)*: Mijn broer vindt u eerlijk. Ik vind dat een gebrek.

**Naamkaarten:** MEVROUW OLDENHUIS-BLAUW: *"Ubbo's zus. Villa aan het meer. Koopt wat haar broer bakt."*

**Route en plekken.** Station Winschoten → Roelfiens pick-up langs de dijk van het **Oldambtmeer** → **Midwolda** (dijkpad, waar Tammo de Fjord parkeert) → te voet langs het water naar **Blauwestad** en de zuidoever → "Villa Meerzicht" (fictief erf met steiger, lichtsnoeren, tent voor honderd gasten) → het meer over, ± 2,5 km, naar de jachthaven bij Midwolda. Villa, sloep en beveiliging zijn verzonnen.

**Verloop**
1. **Rij naar Midwolda** (Tammo rijdt, jij zit achterin in Roelfiens kerkjurk).
2. **Binnenkomen** via de oprit; Durk en Douwe aan de deur ("Wij kennen jou niet.").
3. **Gasten bespelen** (`mingle`, NIEUW): drie gesprekken in de tuin, elk met één jurynaam. Praat je langer dan 4 s, dan loopt een **Verdacht**-meter op; een glimlach (Q) zet hem terug.
4. **Naar de werkkamer** (sluipen, binnen): één bewaker, één camera. Fotografeer het jurylijstje en de medaille aan de muur.
5. **Scène in de werkkamer** met mevrouw Oldenhuis-Blauw.
6. **Vlucht:** alarm, tuin, steiger; steel een sloep; twee gele beveiligingsboten duwen (rompmeter, zoals O7); 90 s over het meer.
7. **Outro** op de dijk bij Midwolda.

**Falen, overslaan, bezit**
- Verdacht-meter vol: een knecht brengt je beleefd naar de poort (mislukt). Sloep gekanteld of 3 s onder een beveiligingsboot.
- **Overslaan** na één poging: je staat op de dijk, de werkkamerscène speelt wel.
- **Bezit:** de jurk is van Roelfien, de sloep van mevrouw (`handBack: moor`, "Terug naar de steiger. Ze telt hem.").

**Intro (cutscène).** *Camera:* Hoog boven het Oldambtmeer bij schemer: een nieuw stadje langs het water, een villa met lichtsnoeren, strijkers uit een tent. Kraan omlaag naar de oprit met Durk en Douwe; close op de uitnodiging; twee-shot op de dijk.

- **Tammo** *(droog)*: Alleen jij, staat er. Ik heb ook een jas.
- **Tessa** *(zakelijk)*: Jij blijft bij de auto. Hoor je een alarm, dan rijd je.
- **Tammo** *(droog)*: Waarheen?
- **Tessa** *(kort, zacht)*: Naar mij.
- **Tammo** *(droog, zacht)*: Je ziet er… duur uit.
- **Tessa** *(snel)*: Dat is de bedoeling.
- **Tammo** *(zacht)*: Dat bedoelde ik niet.
- **Tessa** *(zacht, even)*: Ik weet het.
- **Durk** *(traag, plechtig, bij de deur)*: Uitnodiging.
- **Douwe** *(traag)*: …uitnodiging.
- **Tessa** *(vriendelijk)*: Durk. Douwe. Ik ben het.
- **Durk** *(traag, plechtig, kijkt langs haar heen)*: Wij kennen jou niet.
- **Douwe** *(traag)*: …niet.
- **Tessa** *(zacht, geroerd)*: Dat is lief.
- **Durk** *(traag, trots)*: Baas zegt: niemand kennen. Dat kunnen wij.
- **Douwe** *(traag, trots)*: …kunnen.

**HUD-doelen:** "Rij naar de dijk bij Midwolda" → "Ga het feest op" → "Verzamel drie namen van juryleden (praat niet te lang)" → "Naar de werkkamer: fotografeer de jurylijst en de medaille" → "Weg! Steel een sloep en vaar naar Midwolda"

**In de missie**
- **Tammo** *(zacht, in het oortje)*: Ik zie de villa. Drie lichten in de gang. Eén bewaker bij de trap.
- **Tessa** *(fluisterend, tegen zichzelf)*: Gespreksronde. Drie namen. Glimlachen.
- **Tammo** *(droog, in het oortje)*: Je lacht te veel.
- **Tessa** *(fluisterend, scherp)*: Ik lach precies genoeg.
- **Gast** *(luid, joviaal, met een glas)*: Dolf van de botsauto's zit in de jury van de kermis. Hij vindt alles goed als hij mag meerijden.
- **Gast** *(kletserig, zacht)*: De notaris uit Veendam is er ook. Zij tekent alles wat Ubbo zegt. Zonder te lezen. Hij noemt dat vertrouwen.
- **Gast** *(kletserig, geamuseerd)*: En een boswachter uit Westerwolde. Hij praat niet. Hij kijkt alleen. Maar hij eet het buffet leeg.
- **Tessa** *(tevreden, fluisterend)*: Drie namen. Dolf, de notaris, de boswachter.
- **Tammo** *(gespannen, in het oortje)*: Bewaker bij de trap kijkt weg. Nu. Boven.
- **Tessa** *(zacht, snel)*: Het jurylijstje. Foto. En de medaille: foto.
- **Tammo** *(geschrokken, in het oortje)*: Alarm! Steiger, links! Er ligt een sloep.
- **Tessa** *(strijdlustig)*: Sleutel zit erin. Hier steelt niemand. Alleen ik.
- **Knecht van Ubbo** *(roepend, uit een gele boot)*: Stop! Dat is de sloep van mevrouw!
- **Tammo** *(gespannen)*: Twee boten achter je. Gele. Ze duwen.
- **Tessa** *(fel)*: Laat ze duwen. Ik ben zwaarder dan ik eruitzie.

**Scène: De werkkamer.** *Camera:* Lage shot achter het bureau, de medaille in een lijst aan de muur; de camera glijdt naar het gezicht van mevrouw Oldenhuis-Blauw in het lamplicht, een glas in haar hand, de deur al op slot.

- **Mevrouw Oldenhuis-Blauw** *(kil, elegant)*: Mevrouw Fjord. U kijkt naar de medaille van mijn opa. `[naamkaart: oblauw]`
- **Tessa** *(leest, zacht)*: "Eerste prijs. Ommelander Ronde. 1953. H. Oldenhuis."
- **Mevrouw Oldenhuis-Blauw** *(elegant, droog)*: Opa Hendrik. Hij begon met één kar, in Veendam. Hij leerde mijn broer alles. Behalve bakken.
- **Tessa** *(scherp)*: Kon hij niet bakken?
- **Mevrouw Oldenhuis-Blauw** *(kil)*: Hij kon winnen. Dat is iets anders. `[clue]`
- **Tessa** *(koel)*: Wat wil uw broer van mij?
- **Mevrouw Oldenhuis-Blauw** *(zacht, berekenend)*: Uw naam. Eenenveertig karren, met uw naam erop. Namen zijn goedkoper dan eierballen.
- **Tessa** *(kil)*: Mijn naam is niet te koop.
- **Mevrouw Oldenhuis-Blauw** *(geamuseerd)*: Dat zegt iedereen. Tot het bedrag er staat.
- **Mevrouw Oldenhuis-Blauw** *(kil, elegant)*: Ik geef u twee minuten. Daarna roep ik mijn beveiliging. Dat is geen vriendelijkheid. Dat is tijdsbeheer.

**Outro (cutscène).** *Camera:* Aan de dijk bij Midwolda in het laatste licht: Tessa klimt druipend uit de sloep, Tammo houdt zijn jas open. De camera trekt op naar het meer, waar de gele boten omkeren en de lichtsnoeren in het water hangen.

- **Tammo** *(droog, zacht)*: Je bent nat.
- **Tessa** *(buiten adem, grinnikend)*: Het is het meer. Ik ben nergens bang voor, behalve voor Roelfien.
- **Tammo** *(droog)*: De jurk is nat.
- **Tessa** *(snel)*: De jurk is van 1983. Hij heeft ergere dingen gezien.
- **Tammo** *(droog)*: En de foto's?
- **Tessa** *(zacht, ernstig)*: Het jurylijstje. En een medaille. Eerste prijs, 1953. Van zijn opa.
- **Tammo** *(droog, stil)*: Dat is Oma's jaar.
- **Tessa** *(zacht)*: Ja. Dat vond ik ook.
- **Tessa** *(zacht, nadenkend)*: Zijn zus zei dat hij mijn naam wil. Op eenenveertig karren.
- **Tammo** *(droog, kort)*: Die is niet te koop.
- **Tessa** *(zacht, even stil)*: Dat zei ik ook.

**Bij herhaling:** **Tammo** *(droog, zacht)*: Weer die jurk? Ik heb hem al gezien. Hij staat je goed. Nat ook.
**Mislukt:** **Tessa** *(ontdaan)*: Ze liepen me naar de poort. Beleefd. · **Tammo** *(droog)*: Dat is het ergste.

**Berichten na afloop:** *U. Oldenhuis*: "Mooie sloep. Mijn zus stuurt je de rekening voor de jurk van je nicht. – U.O." **Kiekdoar:** "Sloep gestolen op het Oldambtmeer, teruggevonden in Midwolda met een natte kerkjurk erin. Eigenaresse: 'Hij is verzekerd. De jurk niet.'"
**Afrondingskaart:** **BLAUWE STAD, RODE AUTO** · Drie namen. Eén medaille. Eén sloep, terug aan de steiger. · *+ € 2600*

**Autogesprek `o19-pass-naam`:** **Tammo** *(dry)*: "Namen zijn goedkoper dan eierballen." Wat zei jij toen? · **Tessa** *(quiet)*: Dat de mijne niet te koop is. · **Tammo** *(dry, soft)*: En wat dacht je? · **Tessa** *(honest, quiet)*: Ik dacht aan de Vismarkt.
**Autogesprek `o19-pass-opa`:** **Tessa** *(thoughtful)*: "Hij kon winnen. Dat is iets anders." Wat bedoelde ze? · **Tammo** *(dry)*: Dat jij en ik anders winnen. · **Tessa** *(curious)*: Hoe dan? · **Tammo** *(dry, small smile)*: Langzaam. Met de voeten op de grond.
**Autogesprek `o19-fail`:** **Tammo** *(dry)*: Ze begeleidden je naar de poort. Met een glas. · **Tessa** *(sheepish)*: Het was wel een goed glas.

**"Wat weten we?"** *Het feest van mevrouw Oldenhuis-Blauw* (clue): Drie namen voor de jury: Dolf (de botsauto's), de notaris uit Veendam en een boswachter uit Westerwolde. Ubbo wil Tessa's naam op eenenveertig karren. · *Hij kon winnen* (hart): Aan de muur de medaille van opa Hendrik: "Eerste prijs. Ommelander Ronde. 1953." Zijn kleindochter: "Hij kon niet bakken. Hij kon winnen. Dat is iets anders."

### O20 · Laag over het graan

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| vliegtuig | Oldambt | Tammo | Roelfiens graspiste bij Beerta (ochtend) | € 2800 | `O20` / missie `spuiter` |

**Wissel:** **Tammo** *(droog, bleek)*: Ik vlieg. Ik kijk niet naar beneden. Ik kijk naar het graan.

**Lead:** **Tessa** *(zakelijk, aan de telefoon)*: Roelfien heeft een gewasspuiter. Ze heeft het jurylijstje laten drukken: drieduizend vellen. We strooien ze uit over de markt in Winschoten. Jij vliegt. Ik ben navigator. Op de grond.

**Bel Rikus (beller: Roelfien, Beerta)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Aan de lijn: een boerin uit het Oldambt, om zes uur 's ochtends. Dat is voor haar middag.
- **Roelfien** *(droog, aan de telefoon op de radio)*: Rikus. Roelfien, Beerta. Er vliegt vanochtend een vliegtuig laag over mien graan. Dat ben ik niet. Dat is een vriend.
- **Rikus** *(droog, als nacht-dj op de radio)*: Is die vriend bang?
- **Roelfien** *(droog, geamuseerd, aan de telefoon op de radio)*: Hij zegt van niet. Hij zegt het erg zacht.

**Route en plekken.** Roelfiens graspiste (fictief erf bij **Beerta**) → laag over de stoppelvelden langs de **Dollarddijk** → **Midwolda** (kerk als baken) → **Scheemda** → het **Winschoterdiep** → **Winschoten** (Pagediep, Marktplein, molen) waar je strooit → politieheli → onder de hoogspanningslijn door → terug naar Beerta. Het vliegveldje bij **Oostwold** is te zien, geen landingsplek. Alles onder 150 m; strooipunten onder 40 m.

**Verloop**
1. Instappen in de gewasspuiter (tweezitter van Roelfien, `handBack`); zij geeft gas, jij stuurt.
2. Opstijgen van gras (korte piste, sloot aan het eind).
3. **Laag door vijf poorten** van 30 m, zijwind (`gust` voor vliegtuigen). Stoppels raken = puntaftrek, geen fail.
4. **Strooien boven Winschoten** (Marktplein, brug Pagediep, molen): houd E; de vellen waaien als papiersneeuw.
5. **Politieheli** (geen schieten): blijf onder 30 m en voorbij de bomenrij. Onder de lijn door is een bonus.
6. Terug naar Beerta en landen.

**Falen, overslaan, bezit:** neerstorten; heli > 60 s naast je. **Overslaan** na één poging: je staat op de piste, de vellen zijn "gevallen", de scène speelt. **Bezit:** de spuiter is van Roelfien; een eigen toestel koop je bij Oostwold (A14).

**Intro.** *Camera:* Laag over de klei bij zonsopgang: een gele gewasspuiter met opengeklapt dak; de camera zweeft langs de vleugel naar Tammo's grauwe gezicht; cut naar Roelfien rechts: ze trekt de riem aan alsof ze er een ding mee doodt.
- **Roelfien** *(droog, kordaat)*: Het is geen auto. Het is een paard met vleugels. Hij wil gewoon vooruit.
- **Tammo** *(droog, bleek)*: Ik wil gewoon… op de grond.
- **Tessa** *(warm, in het oortje)*: Tammo. Je kunt dit.
- **Tammo** *(droog)*: Jij zit niet in het ding.
- **Roelfien** *(droog)*: Ik zit erin. Ik heb hem veertig jaar gevlogen. Hij is nog nooit uit de lucht gevallen. Soms ernaast.
- **Tammo** *(droog, ongerust)*: Naast?
- **Roelfien** *(nuchter)*: In de sloot. Dat was mien man. Gas erop.

**HUD-doelen:** "Stap in de gewasspuiter" → "Stijg op" → "Vlieg laag door de poorten" → "Strooi de jurylijst boven Winschoten (houd E)" → "Ontwijk de politieheli: blijf laag" → "Vlieg terug naar Beerta en land"

**In de missie**
- **Roelfien** *(kordaat)*: Gas. Meer. Meer. Nu trekken.
- **Tammo** *(droog, gespannen)*: Ik kijk niet naar beneden.
- **Roelfien** *(droog)*: Dan kijk je naar voren. Daar zit het graan.
- **Tessa** *(zakelijk, in het oortje)*: Poort drie, links. Wind uit het noorden.
- **Tammo** *(droog, geschrokken)*: Ik raak de stoppels.
- **Roelfien** *(droog)*: Stoppels vergeven. Het is een stoppelveld. Daarom heet het zo.
- **Tessa** *(zakelijk, in het oortje)*: Je bent boven Scheemda. Nog twee minuten tot de markt.
- **Tammo** *(droog, gespannen)*: Het Pagediep. Ik zie het water. Het water ziet mij.
- **Roelfien** *(kordaat)*: Strooien! Nu! Houd vast en laat los!
- **Tammo** *(verbaasd, droog)*: Het sneeuwt. In september.
- **Tessa** *(lachend, in het oortje)*: Het is papier. Hij dacht dat het sneeuwde.
- **Tessa** *(gespannen, in het oortje)*: Politieheli. Links. Hij kijkt.
- **Roelfien** *(droog, scherp)*: Omlaag. Onder de bomen. Hij durft niet zo laag. Ik wel.
- **Tammo** *(gespannen)*: Lijn. Er hangt een lijn.
- **Roelfien** *(kordaat)*: Eronder. Niet erover. Eronder.
- **Tammo** *(uitgeblazen, droog)*: …Eronder.
- **Tessa** *(opgelucht, in het oortje)*: Ze keren om. Ze zagen alleen papier.

**Scène: Op de markt in Winschoten (beneden).** *Camera:* Op de grond tussen de kramen: de vellen waaien als sneeuw tussen kaaskramen; een koopman pakt er één op en leest.
- **Reiziger** *(kletserig, verbaasd)*: "De jury is gekocht." En een lijstje met namen. Ik ken er drie. Mijn zwager zit erbij.
- **Boer** *(droog)*: Dat verklaart die auto voor zijn deur.
- **Omroeper** *(luid, enthousiast)*: Dames en heren, een mededeling: er valt papier uit de lucht. Niet bukken. Wel lezen.

**Outro.** *Camera:* De graspiste: de spuiter rolt uit; Tammo blijft zitten, handen aan het stuur, ogen dicht; de heli draait een rondje en vertrekt. Roelfien klopt tweemaal op het dak.
- **Tammo** *(droog, zacht)*: Ik leef.
- **Roelfien** *(droog)*: Dat is mooi. Dat scheelt papierwerk.
- **Tessa** *(blij, in het oortje)*: Tammo! Je hebt gevlogen!
- **Tammo** *(droog, bleek)*: Ik heb mijn ogen niet open gehad. Dat is geen vliegen. Dat is gebeuren.
- **Roelfien** *(droog, warm)*: Je bent als een boer. Je doet het en je zegt er niks over.
- **Roelfien** *(droog, tevreden)*: Zo. De trekker van mien vader is betaald. Met een vliegtuig.
- **Tammo** *(droog)*: Is het genoeg?
- **Roelfien** *(droog, met een glimlach)*: Voor een trekker wel. De rente komt later.

**Bij herhaling:** **Roelfien** *(droog)*: Weer vliegen? Ik heb brandstof. Jij bent bleek. Dat wisselt af. **Mislukt:** **Tammo** *(droog, verslagen)*: Ik had me aan de grond moeten houden. · **Roelfien** *(droog)*: Dat doet iedereen. Tot hij vliegt.

**Nachtstreek, na afloop (beller: een marktkoopman, Winschoten)**
- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Er viel vanochtend papier uit de lucht boven Winschoten. De burgemeester zou het eerst "een vorm van reclame" noemen.
- **Reiziger** *(kletserig, aan de telefoon op de radio)*: Ik ken drie van die namen. Een zit in mijn kerkenraad.
- **Rikus** *(droog, als nacht-dj op de radio)*: En?
- **Reiziger** *(droog, vastberaden, aan de telefoon op de radio)*: Ik ga zondag een vraag stellen. In de koffiepauze.

**Berichten na afloop:** *U. Oldenhuis*: "Papier. Leuk. Ik heb meer papier. – U.O." **Kiekdoar:** "Papier uit de lucht boven de markt van Winschoten: een lijst met namen van de jury. Piloot onbekend. Een vlieger had zijn ogen dicht."
**Afrondingskaart:** **LAAG OVER HET GRAAN** · 3000 vellen. 3 punten. 1 piloot met zijn ogen dicht. · *+ € 2800*

**Autogesprek `o20-pass-ogen`:** **Tessa** *(teasing)*: Je had je ogen dicht. · **Tammo** *(dry)*: Ik had ze half dicht. · **Tessa** *(quick)*: Roelfien zegt dicht. · **Tammo** *(dry)*: Roelfien zat ernaast. Dat is anders.
**Autogesprek `o20-pass-sneeuw`:** **Tammo** *(dry, still amazed)*: Het sneeuwde. In september. · **Tessa** *(laughing)*: Het was papier, Tammo. · **Tammo** *(dry)*: Het voelde als sneeuw.
**Autogesprek `o20-fail`:** **Tammo** *(dry)*: Ik zei het. Ik wil op de grond. · **Tessa** *(gentle)*: Je zat er zes minuten in. · **Tammo** *(dry)*: Dat was zes minuten te veel.

**"Wat weten we?"** *Papier uit de lucht* (clue): Roelfiens gewasspuiter strooide drieduizend vellen met Ubbo's jury over de markt van Winschoten. · *Trijntjes trekker* (hart): Trijntje betaalde in 1953 de eerste trekker van Roelfiens vader. Nooit teruggevraagd. "De rente komt later."

### O21 · Grensgevoel

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| achtervolging | Oldambt | Tessa | Winschoten, Oostersingel, de N362 aan de oostkant (middag) | € 2600 | `O21` / missie `grens` |

**Wissel:** **Tessa** *(bazig)*: Ik rij. Jij houdt de kaart vast en zegt wanneer het bord komt.

**Lead:** **Tammo** *(droog, aan de telefoon)*: Tessa. Roelfien heeft drie vettrucks gezien op de weg langs de Dollard. Duits vet, uit Leer. Voor de voorronde. Ze rijden naar Winschoten, door de achterdeur.

**Bel Rikus (beller: Roelfien, Beerta)**
- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek, op tournee. Het regent papier in Winschoten en het is niet eens oktober.
- **Roelfien** *(droog, aan de telefoon op de radio)*: Rikus. Roelfien. Drie vettrucks, over de dijkweg. Zonder licht. Ze hebben geen reden om stiekem te doen.
- **Rikus** *(droog, als nacht-dj op de radio)*: Behalve één.
- **Roelfien** *(droog, aan de telefoon op de radio)*: Behalve één. Ik zie ze door de verrekijker. Ik meld alleen. Dat heb ik van de molenaar.

**Route en plekken.** Winschoten (**Oostersingel**, N362) → de oude weg langs de **Dollard** → **Beerta** (dijkweg, **Dollarddijk**) → terug richting **Nieuweschans** (Hoofdstraat, de wallen) → het **grensbord** aan de rand (grensovergang Nieuweschans/Bunde, OSM-check). Trucks en vaten zijn verzonnen.

**Verloop**
1. Instappen in de Fjord (of Roelfiens pick-up, `handBack`).
2. **Onderscheppen** bij Beerta: drie vettrucks met OB op de zijkant. Ze keren en rijden naar het grensbord.
3. **Achtervolging zonder schieten:** ram elke truck 3 keer in het achterwiel (`hits: 3`): de oplegger raakt los en blijft staan, de cabine rijdt door. Drie opleggers los = het vet haalt Winschoten niet.
4. Een lekbak vangt het vet (geen vet in de sloot: natuurgebied).
5. **Het bord:** de cabines rijden Duitsland in. Jij mag er niet achteraan.
6. **Grensgrap-scène.**

**Falen:** > 8 s uit zicht; Fjord total loss; een oplegger doorgelaten (O22 start met extra saboteurs). **Overslaan** na één poging. **Bezit:** de Fjord blijft van jou.

**Intro.** *Camera:* De Dollarddijk bij laagstaande zon: drie vettrucks achter elkaar, de rode OB op de zijkant; de camera ligt laag in de berm; close op Tessa's handen aan het stuur en Tammo's vinger op de kaart.
- **Tammo** *(droog)*: Drie trucks. Elk met een vat. Dat is een dorp aan friet.
- **Tessa** *(kil, snel)*: Zonder vet geen voorronde. Zonder voorronde geen Ronde.
- **Tammo** *(droog)*: Jelle deed dat ook. Vet opkopen.
- **Tessa** *(scherp)*: Jelle deed het uit liefde. Dit is het uit rekenwerk.

**HUD-doelen:** "Stap in de Fjord" → "Rij naar de dijk bij Beerta" → "Ram de koppelingen van de opleggers (3 trucks)" → "Achter ze aan tot het bord" → "Het grensbord"

**In de missie**
- **Tammo** *(droog, gespannen)*: Eerste truck. Rechts. Het wiel.
- **Tessa** *(scherp)*: Ik zie het. Ik ram niet. Ik controleer.
- **Tammo** *(verrast)*: Oplegger los! Hij staat. Op de dijk.
- **Tessa** *(tevreden, kort)*: Eén.
- **Tammo** *(opgelucht, droog)*: Vet in de lekbak. Niks in de sloot.
- **Tessa** *(snel)*: Tweede. Linker wiel. Hou vast.
- **Tammo** *(droog)*: Hij kijkt achterom. Hij heeft angst. Hij heeft een gele helm.
- **Tessa** *(scherp)*: Derde. Hij gaat sneller. Hij gaat naar het bord!
- **Tammo** *(droog, verbaasd)*: Hij rijdt de grens over. Met een open cabine.

**Scène: Het grensbord bij Nieuweschans.** *Camera:* De Fjord remt voor een blauw bord met sterren. Twee agenten aan weerszijden van een witte streep: links een Nederlandse in blauw, rechts een Duitse in groen, een thermoskan ertussen. De camera schuift tussen hen door en weer terug, alsof hij de streep afloopt.
- **Grenswacht** *(kortaf, onverbiddelijk)*: Hier houdt het op. Voor mij.
- **Grenzwächter** *(kortaf, vriendelijk)*: Hier hört es auf. Für mich auch. *(Hier houdt het op. Voor mij ook.)*
- **Tessa** *(buiten adem, scherp)*: Er rijdt een cabine de grens over. Hij heeft een gele helm.
- **Grenswacht** *(kortaf)*: Dat is hun probleem.
- **Grenzwächter** *(droog, kortaf)*: Das ist unser Problem. Aber nur ab hier. *(Dat is ons probleem. Maar alleen vanaf hier.)*
- **Tammo** *(droog)*: Mogen wij erover?
- **Grenswacht** *(droog, vriendelijk)*: U mag erover. Maar niet met die auto.
- **Tammo** *(droog, gekwetst)*: Wat is er mis met de auto?
- **Grenswacht** *(kortaf)*: Geen papieren. Het is een frietwagen.
- **Tammo** *(droog)*: Heeft een frietwagen papieren?
- **Grenswacht** *(droog)*: Nee. Daarom.
- **Grenzwächter** *(vriendelijk, aan de overkant)*: Wollen Sie einen Kaffee? *(Wilt u koffie?)*
- **Tessa** *(beleefd)*: Nee, dank u.
- **Grenswacht** *(kortaf, droog)*: Voor de duidelijkheid: de grens is een lijn. Er staat nergens een muur. Alleen hier.
- **Tammo** *(droog)*: Dan staan we op de streep.
- **Grenswacht** *(droog)*: Dan staat u op de streep.

**Outro.** *Camera:* Terug op de dijk: drie opleggers in een rij als oude treinwagons, de zon laag erachter; Tammo leest de stempels; Tessa blijft bij de Fjord.
- **Tammo** *(droog)*: OB. OB. OB. Hij heeft ze een voor een gestempeld.
- **Tessa** *(kil)*: Als een bakkerij die niks bakt.
- **Tammo** *(droog, tevreden)*: Zonder dit vet staat zijn kraam morgen met een lege pan.
- **Tessa** *(zakelijk)*: Hij zal een andere vinden. Hij heeft eenenveertig snackbars.
- **Tammo** *(droog, stellig)*: Dan breken we hem eenenveertig keer.
- **Tessa** *(zacht, bijna lachend)*: Kon minder.

**Bij herhaling:** **Grenswacht** *(droog)*: Weer u? Dan gelden dezelfde regels. Die verandert niemand. Dat is ook de bedoeling. **Mislukt:** **Tammo** *(droog)*: Het vet ging naar Winschoten. · **Tessa** *(scherp, moe)*: Het vet gaat altijd naar Winschoten. Dat is wat een vet doet.

**Berichten:** *U. Oldenhuis*: "Vet is vet. Ook in Duitsland. – U.O." **Kiekdoar:** "Drie opleggers zonder cabine op de Dollarddijk bij Beerta. Grenswacht: 'Wij zijn voor de lijn. De rest regelt de lijn zelf.'"
**Afrondingskaart:** **GRENSGEVOEL** · Drie opleggers. Eén streep. Twee thermoskannen. · *+ € 2600*

**Autogesprek `o21-pass-streep`:** **Tammo** *(dry, admiring)*: "Nee. Daarom." Dat vond ik het mooiste antwoord van het jaar. · **Tessa** *(dry)*: Hij had alleen gelijk. · **Tammo** *(dry)*: Dat is het mooiste.
**Autogesprek `o21-pass-koffie`:** **Tessa** *(amused)*: De Duitse agent bood koffie aan. · **Tammo** *(dry)*: Mijn buurman zegt dat de koffie daar goedkoper is. · **Tessa** *(dry)*: De koffie is overal goedkoper dan hier. · **Tammo** *(dry, deadpan)*: Dat zeg ik ook over de friet.
**Autogesprek `o21-fail`:** **Tessa** *(annoyed)*: Eén truck. Eén verloren truck. · **Tammo** *(dry)*: Hij had een gele helm. Hij was serieus.

**"Wat weten we?"** *Duits vet, Hollandse jury* (clue): Ubbo laat goedkoop vet uit Duitsland komen over de dijkweg bij Beerta. Drie opleggers met OB stonden op de dijk; de cabines reden over de grens.

### O22 · Botsauto's, deel twee

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| kermis, verdedigen, bakken | Oldambt | Tammo | Het kermisterrein in Winschoten (avond) | € 3500 | `O22` / missie `botsauto` |

Voorronde vijf, het **middenpunt** van Deel 4.

**Wissel:** **Tammo** *(droog)*: Ik pak de botsauto. Jij bakt. Jij bakt beter als ik niet kijk.

**Lead:** **Tessa** *(zakelijk, aan de telefoon)*: Voorronde vijf, in Winschoten, op de kermis. Dolf van de botsauto's zit in de jury. Eén stekker, één kraam, en Durk en Douwe aan de overkant.

**Bel Rikus (beller: Ubbo, Oldenhuis Bakt)**
- **Rikus** *(warm, als nacht-dj op de radio, kermislawaai)*: Nachtstreek, op tournee. Ik sta tussen een draaimolen en een schiettent op de kermis in Winschoten. Hier ruikt het naar suiker en vet. Dat is ook wat ik ben.
- **Ubbo Oldenhuis** *(joviaal, zakelijk, aan de telefoon op de radio)*: Rikus. Vanavond de voorronde Oldambt. Mijn mensen zijn er. Ook een paar die u kent.
- **Rikus** *(droog, als nacht-dj op de radio)*: Zijn dat de mensen die voor u betalen of de mensen die voor u rijden?
- **Ubbo Oldenhuis** *(geamuseerd, aan de telefoon op de radio)*: Ik betaal per brein, Rikus. Dat zei ik toch?

**Route en plekken.** Het kermisterrein in **Winschoten** (kermisplek uit OSM) → de **botsautobaan** met de kraam ernaast → draaimolen en schiettent → het kermisterras waar de jury zit.

**Verloop**
1. Stap in een botsauto (Dolf leent hem; de baan is een afgesloten arena van 20 × 30 m).
2. **Verdedigen in drie golven** in de arena (`defend`, NIEUW `arena`): Durk en Douwe in botsauto's plus twee knechten die de kraam door de uitgang willen rammen. Duw ze tegen de rand (flank). Tessa bakt (baktimer 3 × 60 s). Meter: **Kraam** (−34 % per raak).
3. **Golf twee:** Ubbo laat via de kermisluidspreker iets omroepen; Durk en Douwe stoppen: ze lopen over (`turncoat`).
4. **Golf drie:** twee knechten blijven over.
5. **Jury** (Dolf en Dina), dan **outro** met Ubbo.

**Falen:** Kraam op 0; je botsauto 3× achter elkaar "uitgeschakeld". **Overslaan** na één poging. Geen politie.

**Intro.** *Camera:* De kermis bij donker: lichtslingers, stekkers die lichtflitsen over Tammo's gezicht; de camera zweeft over de baan naar Durk en Douwe in twee botsauto's, als twee reuzen in een kinderstoel; pan naar de kraam waar Tessa de pan aanzet.
- **Botsautobaas Dolf** *(luid, joviaal)*: Dames en heren, de voorronde Oldambt! Eerst proeven, dan botsen, dan nog een keer proeven!
- **Durk** *(traag, plechtig, aan het stuur)*: Moi. Wij hebben botsauto's.
- **Douwe** *(traag, blij)*: …botsauto's.
- **Tammo** *(droog)*: Jullie zijn van Jelle.
- **Durk** *(traag, eerlijk)*: Wij zijn van een baas. Hij betaalt per brein.
- **Douwe** *(traag)*: …per brein.
- **Tammo** *(droog)*: Dat zeg je steeds. Rekenen jullie het wel eens uit?
- **Durk** *(traag, na lang nadenken)*: Eén brein. Tussen ons tweeën. Dat is half.
- **Douwe** *(traag, trots)*: …half.

**HUD-doelen:** "Stap in een botsauto" → "Duw de botsauto's weg van de kraam" → "Hou de kraam heel" → "De jury"

**In de missie**
- **Tessa** *(gehaast, bij de pan)*: Eerste lading in het vet. Zestig tellen.
- **Tammo** *(droog, gespannen)*: Ik raak ze. Ze merken het niet.
- **Tessa** *(snel)*: Dat is het probleem met reuzen.
- **Tammo** *(roepend)*: Durk! Rechts! Hij komt op de kraam af!
- **Durk** *(traag, roepend)*: Sorry! Hij stuurt niet!
- **Douwe** *(traag, roepend)*: …niet!
- **Tessa** *(gespannen)*: Tweede lading. Hou ze weg, Tammo.
- **Tammo** *(droog, grinnikend)*: Ik ben een Stadjer in een botsauto. Dit is mijn hoogtepunt.
- **Tessa** *(snel, lachend)*: Rustig, jongen. Je bent aan het genieten.
- **Tammo** *(droog)*: Ik geniet nooit. Ik doe alleen mee.
- **Knecht van Ubbo** *(stug, roepend)*: Aan de kant, Stadjer!

**Scène: De overloop op de baan.** *Camera:* De luidspreker kraakt; de botsauto's staan stil, de lichten flikkeren. Langzame orbit om de twee reuzen die tegelijk hun hoofd naar de luidspreker draaien. Close op Durks gezicht.
- **Ubbo Oldenhuis** *(joviaal, zelfvoldaan, door de luidspreker)*: En dames en heren, bij het succes van de dag: Oldenhuis Bakt neemt "Us Mem Snacks" over. Eenenveertig snackbars, nu tweeënveertig. De bakkerij van een Friese mevrouw. Gekocht, gesloopt, vervangen.
- **Durk** *(traag, ongelovig)*: Mem?
- **Douwe** *(traag)*: …mem?
- **Durk** *(traag, plechtig, stil)*: Niet mem.
- **Douwe** *(traag, stil)*: …niet mem.
- **Tammo** *(zacht)*: Het is Jelles moeder.
- **Durk** *(traag, stil, geroerd)*: Wij weten wie het is. Zij geeft ons pannenkoeken. Zonder te vragen.
- **Douwe** *(traag, geroerd)*: …zonder te vragen.
- **Durk** *(traag, na een lange pauze)*: Hij betaalt per brein. Maar dit brein… Dat is nu van mem.
- **Douwe** *(traag, vastberaden)*: …Hè.
- **Durk** *(traag, vastberaden)*: Hè.
- **Tammo** *(droog, voorzichtig)*: Wat gaan jullie doen?
- **Durk** *(traag, plechtig)*: Wij gaan niet meer botsen. Wij stoppen. Dan is het ook af.
- **Douwe** *(traag)*: …ook af.

**Scène: De jury.** *Camera:* Het kermisterras: de jury aan een lange tafel met tafelkleed, Dolf voorop met microfoon, naast hem Dina met een bril aan een koord; close op hun handen met de eierbal, dan de reacties.
- **Botsautobaas Dolf** *(plechtig, luid)*: Een eierbal. Gemaakt tijdens een botsautoronde. Dat is geen kunst. Dat is een sport.
- **Jurylid Dina** *(droog, kritisch, proevend)*: Het mosterdsaus-ding is bijzonder. Er zit mout in.
- **Tessa** *(trots)*: Roelfiens gerstemout. Uit het eigen graan.
- **Jurylid Dina** *(droog, kritisch)*: Het is niet slecht.
- **Botsautobaas Dolf** *(luid, plechtig)*: Goud.
- **Jurylid Dina** *(droog, na een pauze)*: Goud.
- **Botsautobaas Dolf** *(luid, enthousiast)*: De voorronde Oldambt gaat naar de Fjord Frituur! En de botsauto's zijn gratis!

**Outro.** *Camera:* Het kermisterras bij sluitingstijd: de baan leeg; Durk en Douwe lopen hand in hand de kermis af. Aan één tafel Ubbo met een bordje "Reserveringen"; de camera glijdt naar zijn gezicht; hij klapt, langzaam.
- **Ubbo Oldenhuis** *(joviaal, zakelijk, klapt langzaam)*: Mooi. Heel mooi. Een uur geleden had ik twee reuzen. Nu heb ik twee reuzen minder.
- **Tammo** *(droog)*: Ze hebben gekozen.
- **Ubbo Oldenhuis** *(vriendelijk, zacht)*: Mensen kiezen altijd. Dat is hun probleem. Ik koop de keuze.
- **Tessa** *(scherp)*: Wat wil je, Ubbo?
- **Ubbo Oldenhuis** *(tevreden)*: Vijf. Vijf voorrondes. Nog twee.
- **Ubbo Oldenhuis** *(joviaal, een knik naar Tessa)*: En een gesprek. Met jou, meisje. Alleen met jou.
- **Tammo** *(droog, kil)*: Ze is niet alleen.
- **Ubbo Oldenhuis** *(vriendelijk, dreigend)*: Dan staat u daar. Dat is ook goed.

**Bij herhaling:** **Botsautobaas Dolf** *(luid, joviaal)*: Dames en heren, de kermis kent geen herhaling. Maar wij wel! **Mislukt:** **Tessa** *(ontdaan)*: De kraam ligt tussen de botsauto's. · **Tammo** *(droog)*: Hij werd eerlijk geraakt. Dat is nog wat.

**Nachtstreek, na afloop (beller: Jelle, Ljouwert)**
- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Ik heb een beller uit Ljouwert. Hij klinkt alsof hij net gehuild heeft en dat ontkent.
- **Jelle Terpstra** *(zacht, ontroerd, aan de telefoon op de radio)*: Rikus. Jelle. Durk en Douwe zijn net bij mem aan tafel gaan zitten. Beide. Ze hebben niks gezegd. Ze eten alleen.
- **Rikus** *(warm, als nacht-dj op de radio)*: Hoe voelt dat, Jelle?
- **Jelle Terpstra** *(zacht, eerlijk, aan de telefoon op de radio)*: Als thuis. Alleen met twee extra stoelen.

**Berichten:** *U. Oldenhuis*: "Vijf. Nog twee. Kom naar het terras, Tessa. – U.O." **Kiekdoar:** "Voorronde Oldambt naar Stadse frietwagen. Botsautobaas: 'Goud.' Twee botsautochauffeurs uit Friesland nemen vroegtijdig ontslag, hand in hand."
**Afrondingskaart:** **BOTSAUTO'S, DEEL TWEE** · Voorronde Oldambt: gewonnen. Vijf van zeven. · *+ € 3500*

**Autogesprek `o22-pass-half`:** **Tessa** *(moved, amused)*: "Eén brein tussen ons tweeën. Dat is half." Ik moest bijna huilen. · **Tammo** *(dry)*: Het is de eerlijkste rekensom van het jaar.
**Autogesprek `o22-pass-mem`:** **Tammo** *(dry, angry underneath)*: Hij kocht de bakkerij van Jelles moeder. En kondigde het af over de luidspreker. · **Tessa** *(quiet)*: Hij weet precies waar het pijn doet. · **Tammo** *(dry)*: Dat is zijn vak.
**Autogesprek `o22-fail`:** **Tammo** *(dry, frustrated)*: Een botsauto stuurt als een bakfiets. · **Tessa** *(dry)*: Een bakfiets heeft meer richting.

**"Wat weten we?"** *Us Mem Snacks verkocht* (clue): Ubbo kocht de bakkerij van Jelles moeder en riep het om op de kermis. Durk en Douwe liepen er midden in een wedstrijd van weg, hand in hand. · *Voorronde Oldambt* (clue): Gewonnen in Winschoten. "Goud." Ubbo: "Vijf. Nog twee." Hij wil Tessa alleen spreken.

### Tussendoor: Een filiaal aan de Dollard (`n-beerta`)

Speler: Tessa. Doel: `{ type: 'filiaal', at: 'beerta' }` (safehouse: het dijkhuisje aan de Dollard; filiaal: Roelfiens graanschuur).
**Wissel:** **Tessa** *(bazig, warm)*: Ik regel het filiaal. Jij mag het bed testen. · **Lead:** **Tammo** *(droog)*: Roelfien zegt: ze heeft een graanschuur bij Beerta waar een luik in kan. En een dijkhuisje aan de Dollard. Het bed is groot.
**Scène: Het dijkhuisje, Beerta.** *Camera:* Avondlicht op de dijk; trage dolly langs de voordeur van een wit huisje, binnen een tafel met twee stoelen; Roelfien zet een mand eieren neer.
- **Roelfien** *(droog, warm)*: Het huisje is van mien vader. Het bed is van mien moeder. Ze zei: dat is voor Trijntjes kinderen.
- **Tessa** *(zacht)*: Wij zijn haar kleinkinderen.
- **Roelfien** *(droog)*: Dat zei ik: kinderen.
- **Roelfien** *(nuchter)*: En de graanschuur. Er staat een luik klaar. Mout, tarwe, gerst. De Oldambtster eierbal: met gerstemout.
- **Tessa** *(enthousiast)*: Dit is nummer vijf.
- **Tammo** *(droog)*: Nummer vijf van eenenveertig.
- **Tessa** *(zacht, stellig)*: Nummer vijf van zeven.
- **Tammo** *(droog, zacht)*: …Dat is wat anders.
- **Roelfien** *(droog, scherp)*: Het is hetzelfde. Zeven is ook meer dan één.
**Klaar:** **Tessa** *(warm)*: Filiaal vijf: de graanschuur bij Beerta. Roelfien bakt alleen als het droog is. Het is hier altijd bijna droog. · **HUD:** "Filiaal geopend: de graanschuur bij Beerta" · "Safehouse: het dijkhuisje aan de Dollard, garage voor één auto" · "Nieuw recept: de Oldambtster eierbal, met gerstemout" · *Optioneel te koop: de villa van mevrouw Oldenhuis-Blauw aan het meer, met helipad (duur, buiten de geldtijdlijn).*

### Tussendoor: Het aanbod (`n-aanbod`) en de ruzie (`n-ruzie`)

Het dieptepunt in twee stappen, zonder missie, zonder fail.

**n-aanbod** (speler: Tessa; doel: scène op het kermisterras). **Wissel:** **Tessa** *(vastberaden)*: Ik ga praten. Ik ga luisteren. Jij mag meekijken. · **Lead:** **Tammo** *(droog)*: Hij wacht op het terras. Alleen jij, zei hij. Ik sta bij de schiettent. Ik kijk niet. Ik kijk wel. · **Zegt:** **Tammo** *(droog)*: Ik schiet op blikjes. Dat helpt.
**Scène: Het terras van de kermis, Winschoten.** *Camera:* Een terrastafel onder een lichtsnoer, twee stoelen; dicht op het contract dat Ubbo met één vinger over de tafel schuift; een halve orbit om Tessa terwijl ze leest; op de achtergrond, vaag, de schiettent: Tammo schiet, kijkt niet, kijkt wel.
- **Ubbo Oldenhuis** *(joviaal, vriendelijk)*: Ga zitten, meisje. Ik bijt niet. Ik reken alleen.
- **Tessa** *(koel)*: Ik sta liever.
- **Ubbo Oldenhuis** *(vriendelijk)*: Dan blijf je staan. Maar lees.
- **Tessa** *(leest, langzaam)*: "Fjord Frituur. Eenenveertig locaties. Naam en gezicht: mevrouw Tessa."
- **Ubbo Oldenhuis** *(joviaal, zacht)*: Eenenveertig karren. Elk met jouw naam. Elk met jouw recept. En de Vismarkt, per direct terug.
- **Tessa** *(zacht, ongewild)*: De Vismarkt.
- **Ubbo Oldenhuis** *(vriendelijk, overtuigend)*: Dat is waar je voor reed, hè? Een plek. Een rij. Een naam. Ik geef het je. Vandaag.
- **Tessa** *(scherp)*: En de Ronde?
- **Ubbo Oldenhuis** *(zakelijk, vriendelijk)*: Die blijft bij mij. Een Ronde is een feest. Een naam is een bedrijf.
- **Tessa** *(zacht)*: En de eierbal van Oma?
- **Ubbo Oldenhuis** *(joviaal)*: Is dan een product. Hij wordt gebakken in Veendam, Stadskanaal, Musselkanaal. Overal. Door mensen die jou nooit zullen ontmoeten. Dat noemen wij groei.
- **Tessa** *(zacht, scherp)*: Dat noemen wij… verdunnen.
- **Ubbo Oldenhuis** *(geamuseerd, zacht)*: Ook goed. Verdunnen is een soort verspreiden.
- **Ubbo Oldenhuis** *(vriendelijk, dreigend)*: Denk erover na. Twee dagen. Dan is het aanbod nog van jou.
- **Tessa** *(zacht, na een lange stilte)*: Ik denk erover.
- **Tammo** *(droog, zacht, vanachter haar)*: Je denkt erover?
- **Ubbo Oldenhuis** *(vriendelijk, plagend)*: En ik zie dat je vriend ons al gevonden heeft. Mooi. Dan kan hij het ook lezen. Hij leest langzaam. Ik wacht.

**n-ruzie** (speler: Tammo). **Wissel:** **Tammo** *(droog, kort)*: Ik loop even. Ik kom terug. Of niet. · **Lead:** **Tessa** *(zacht, aan de telefoon)*: Tammo. Waar ben je? Het was een gesprek. Ik heb nog niks getekend.
**Scène: De Dollarddijk, Beerta, nacht.** *Camera:* De Fjord stilstaand op de dijk, de motor tikt na; links het donkere water van de Dollard, rechts de lichten van Beerta. De camera blijft op afstand, door de voorruit, en komt pas bij het laatste woord dichterbij. Geen muziek. Alleen wind en de motor die afkoelt.
- **Tammo** *(droog, zacht)*: Je denkt erover.
- **Tessa** *(snel, verdedigend)*: Ik denk. Dat is wat ik doe, Tammo. Ik heb altijd een plan B. Dit is een plan B.
- **Tammo** *(droog, kil)*: Het is zijn vet.
- **Tessa** *(fel)*: Het is mijn naam.
- **Tammo** *(droog)*: Hij wil jouw naam voor zijn vet.
- **Tessa** *(fel)*: Hij geeft ons de Vismarkt terug!
- **Tammo** *(droog, kort)*: Hij heeft hem afgepakt.
- **Tessa** *(snel, wanhopig)*: Dat is hetzelfde! Dan is dit gewoon… terugkopen!
- **Tammo** *(droog, zacht, gekwetst)*: Dat is niet hetzelfde. Dit is… afkopen.
- **Tessa** *(fel, snel)*: Jij wilt alles hetzelfde. Dezelfde kar. Dezelfde plek. Dezelfde rij. Je wil niet eens een tweede pan.
- **Tammo** *(droog, hard)*: Jij wilt alles groter. Altijd groter. Het is nooit genoeg.
- **Tessa** *(zacht, kil)*: Jij wilt alles hetzelfde.
- **Tammo** *(zacht)*: Jij wilt alles groter.
- **Tessa** *(stil)*: …
- **Tammo** *(droog, kort)*: Ik loop even.
- **Tessa** *(zacht, snel)*: Naar waar? Het is nacht, Tammo. Er is hier niks.
- **Tammo** *(droog, stil)*: Daarom.
**Klaar:** **Tessa** *(zacht)*: Hij pakte de laatste trein. Ik pakte de Fjord. We zeiden allebei niks. (Tammo is vanaf nu weg uit de auto tot O25: O23 en O24 zijn `solo`.)

### Ring 3 · De Veenkoloniën

Bondgenoot **Wubbo** (brugwachter van Veendam, melder), tegenstander **Ubbo zelf** (de zetmeelfabriek, zijn geboortegrond). Safehouse na O27: het brugwachtershuisje.

### Tussendoor: Naar Veendam, alleen (`n-veendam`)

Speler: Tessa (`solo`). Doel: `{ type: 'arrive', at: 'veendam-brug' }` (NIEUW). Afwijking van de aankomstregel: een brug in plaats van een station, want Tessa komt alleen met de Fjord.
**Wissel:** **Tessa** *(kort)*: Ik rij zelf. Ik wil even niet praten. · **Lead:** **Oma Trijntje** *(stellig, aan de telefoon)*: Nummer vijf op het lijstje: Wubbo, Veendam. Hij heeft een brug. Vraag of hij nog weet wie ik ben. Hij weet het. Hij is alleen traag. · **Zegt:** **Tessa** *(zacht)*: De Veenkoloniën. Rechte wegen, rechte kanalen en geen enkel excuus om te laat te zijn.
**Radio:** **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Vanavond vanuit de Veenkoloniën. Rechte kanalen, rechte wegen en mensen die je nooit hoort klagen. Ze hebben geen tijd. Ze moeten vroeg op. · **Rikus** *(zacht, als nacht-dj op de radio)*: Tessa rijdt vanavond alleen. Ik zeg niks. Dat is mijn vak.
**De gaswinning (één stille zin).** Onderweg langs Hoogezand-Sappemeer en Slochteren staan huizen in de steigers. De radio zwijgt even; **Rikus** *(ernstig, zacht, als nacht-dj op de radio)*: Hier wonen mensen die al jaren wachten op een gewoon huis. Ik zeg niks. Ik zeg: ze luisteren.
**Scène: Veendam, de brug.** *Camera:* De Fjord rijdt een lage ophaalbrug op en blijft er midden op staan; de camera ligt in de berm en kijkt omhoog naar het brugwachtershuisje, waar een hand door het raam zwaait, een tel te laat. Binnen in de wagen is de passagiersstoel leeg, het kussen nog warm.
- **Brugwachter Wubbo** *(gemoedelijk, traag)*: Moi. U bent van Trijntje. U bent alleen. Dat is niet hoe het zou moeten zijn. `[naamkaart: wubbo]`
- **Tessa** *(zacht)*: Ik ben alleen een tijdje.
- **Brugwachter Wubbo** *(gemoedelijk, filosofisch)*: Dat zeggen ze allemaal. Een tijdje is een brug die nog dicht is.
- **Brugwachter Wubbo** *(trots, rustig)*: Mien vader leende van Trijntje tien gulden. In 1953. Voor een bromfiets. Hij is nooit op tijd teruggekomen. Ik ook niet.
- **Tessa** *(droog)*: Wat is er te laat aan een brug?
- **Brugwachter Wubbo** *(trots, rustig)*: Ik open altijd. Het moment spreken we niet af.
- **Tessa** *(scherp)*: Dat is geen antwoord.
- **Brugwachter Wubbo** *(verontschuldigend, glimlachend)*: Het is het enige dat ik heb. Ik meld alleen, verder.
- **Brugwachter Wubbo** *(traag, vriendelijk, op de brug)*: Dat zijn de wijken. Dat is het kanaal. Dat daar is de fabriek. Dat is waar Ubbo opgroeide. Hij was een stille jongen. Hij had altijd vet aan zijn schoenen.
- **Tessa** *(nieuwsgierig)*: Kende u hem?
- **Brugwachter Wubbo** *(droog, vriendelijk)*: Iedereen kende hem. Hij was de enige jongen die zijn eigen verjaardagstaart verkocht.
**Klaar:** **Oma Trijntje** *(droog, liefdevol, aan de telefoon)*: Wubbo stuurt een bericht: "Ze is er. Ik heb de brug open gedaan. Een tel te laat." · **HUD:** "De Veenkoloniën zijn open" · "Uitkijkpunt: het brugwachtershuisje"

### O23 · Wijk na wijk

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| achtervolging, boot | Veenkoloniën | Tessa (alleen) | De Oldenhuis Bakt-snackbar aan het Westerdiep in Veendam (middag) | € 2400 | `O23` / missie `wijken` |

**Wissel:** **Tessa** *(kort)*: Ik ga kijken. Alleen kijken. · **Lead:** **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon)*: Mevrouw. Er zijn mensen die zeggen dat u eenenveertig snackbars wilt zien. Ze wachten bij de snackbar bij mijn brug. Ik zou het laten. Maar ik meld alleen.

**Bel Rikus (beller: Wubbo, Veendam)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Vanuit een brugwachtershuisje in Veendam. Het is klein. Er staat een stoel en een thermoskan.
- **Brugwachter Wubbo** *(gemoedelijk, traag, aan de telefoon op de radio)*: Rikus. Wubbo. Er komt vandaag een mevrouw van de Fjord kijken bij de snackbar. Ik zou haar graag een tel eerder laten openen. Maar dat doe ik nooit.
- **Rikus** *(droog, als nacht-dj op de radio)*: Waarom niet?
- **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon op de radio)*: Dan ben ik een tel te vroeg. Dat is nog erger.

**Route en plekken.** **Veendam**: de snackbar aan het **Westerdiep** (OSM-check, fictief pand) → de kanaalwijken **Westerdiep**, **Oosterdiep** en de dwarsdiepen, vijf bruggen (door Wubbo bediend) → het industrieterrein → een kade waar de adviseurs hun motorboot hebben liggen → de laatste brug en een **sluis** aan de rand van Veendam (OSM-check).

**Verloop**
1. **Scène in de snackbar:** de adviseurs Rob en Sandra laten Tessa de "modelzaak" zien. In de kassalade vijf enveloppen "Wijk A" t/m "Wijk E". Ze vluchten met de enveloppen.
2. **Achterna op de weg** in Wubbo's oude rode stationwagen (`loaner`): een bestelbus langs de kanaalwijken, vijf bruggen.
3. **Bruggen:** toeter twee keer vóór de bus de brug oprijdt. Wubbo opent **een tel te laat**, dus toeter een tel eerder dan je denkt (`bridges: honk, lag 1,0`; twee missers zijn toegestaan). Op de vijfde staat de bus klem.
4. **Aan de kade:** Wubbo gooit de sleutel van zijn brugboot uit het raam.
5. **Over het water:** rammen (hits 3) bij de sluis. Bruggen gaan voor jou open, voor de boot niet.
6. **Scène aan de sluis.**

**Falen:** bus > 400 m weg (derde misser); auto of boot total loss. **Overslaan** na één poging. **Bezit:** stationwagen en brugboot gaan terug. Geld blokkeert niets.

**Intro.** *Camera:* Binnen in een hypermoderne snackbar: gele muren, geen rij, een kassa die glinstert; de camera loopt mee achter de adviseurs door de keuken, langs de koelcel en een stapel vaten met OB, tot de kassalade die een tel te lang openstaat. Close op de vijf enveloppen.
- **Franchise-adviseur Rob** *(verkoperig, glad)*: Dit is de modelzaak. Eenenveertig zaken werken precies zo. Zelfde pan, zelfde saus, zelfde glimlach.
- **Tessa** *(droog)*: Zelfde friet?
- **Franchise-adviseuse Sandra** *(kil, snel)*: Zelfde vet. Dat is het mooie.
- **Tessa** *(scherp, kijkend)*: En deze enveloppen? "Wijk A, Wijk B, Wijk C…"
- **Franchise-adviseur Rob** *(betrapt, snel)*: Dat is… boekhouding.
- **Franchise-adviseuse Sandra** *(kil, snel)*: Rob. Doe dicht.
- **Tessa** *(kil)*: Wat staat erin?
- **Franchise-adviseuse Sandra** *(snel, ontwijkend)*: Niets. Vet. Geld. Het is hetzelfde.
- **Tessa** *(kil)*: Dat is niet hetzelfde.
- **Franchise-adviseur Rob** *(paniek, snel)*: Mevrouw, wij doen alleen de aanmeldingen!

**HUD-doelen:** "Pak de leenauto van Wubbo" → "Achter de bestelbus aan, door de kanaalwijken" → "Toeter vóór de brug (Wubbo is een tel te laat)" → "Pak de brugboot en stop de motorboot bij de sluis"

**In de missie**
- **Brugwachter Wubbo** *(gemoedelijk, via de marifoon)*: Brug één. Zeg het maar. Ik doe open.
- **Tessa** *(fel)*: Nu!
- **Brugwachter Wubbo** *(gemoedelijk, traag, via de marifoon)*: Ik ben bezig.
- **Tessa** *(fel, geërgerd)*: Je opent hem een tel te laat!
- **Brugwachter Wubbo** *(verontschuldigend, via de marifoon)*: Dan toeter je een tel eerder.
- **Tessa** *(fel)*: Dat is niet hoe bruggen werken!
- **Brugwachter Wubbo** *(trots, rustig, via de marifoon)*: Het is hoe MIJN bruggen werken.
- **Franchise-adviseuse Sandra** *(kil, snel, uit de bestelbus)*: Rij gewoon! Er komt een brug!
- **Tessa** *(strijdlustig)*: Derde. Toeter. Ik toeter ruim op tijd.
- **Brugwachter Wubbo** *(trots, rustig, via de marifoon)*: Mooi. Dat was precies een tel te laat. Dat is het goede.
- **Tessa** *(verrast)*: De bus staat klem tussen twee bruggen.
- **Brugwachter Wubbo** *(verontschuldigend, via de marifoon)*: Dat was niet zo bedoeld. Maar ik neem het.
- **Brugwachter Wubbo** *(roepend, vanuit zijn raam)*: De boot ligt aan de kade. De sleutel! Vang!
- **Tessa** *(strijdlustig, in de brugboot)*: Ik zie ze! In het water! Rammen, vanaf links.

**Scène: De sluis aan de rand van Veendam.** *Camera:* De sluis bij laagstaande zon: twee druipende mensen in de kolk, een motorboot met de neus in het riet; de camera zakt naar het water, drijft langs een envelop met vochtige letters, en komt omhoog bij Tessa's gezicht.
- **Franchise-adviseur Rob** *(snikkend, nat)*: Wij weten van niks! We zijn adviseurs!
- **Tessa** *(kil, rustig)*: Van wie zijn deze enveloppen?
- **Franchise-adviseuse Sandra** *(kil, nat, kortaf)*: Van de wijken. Elke maand. Per wijk één envelop. Ze gaan naar de fabriek.
- **Tessa** *(scherp)*: Welke fabriek?
- **Franchise-adviseur Rob** *(paniek, nat)*: De zetmeelfabriek! Van meneer Oldenhuis! Alles gaat naar de fabriek!
- **Tessa** *(kil)*: En de snackbars?
- **Franchise-adviseuse Sandra** *(kil, nat)*: De snackbars zijn de winkel. De fabriek is de bank. `[clue]`
- **Tessa** *(kil, zacht)*: Dat is geen bank. Dat is een wasserette.
- **Brugwachter Wubbo** *(gemoedelijk, vanaf de kade)*: Mevrouw. De brug is gesloten. Ik wilde alleen zeggen: dat was de snelste rit die ik ooit gezien heb.

**Outro.** *Camera:* Bij het brugwachtershuisje bij schemer: Tessa op de rand van de kade met de natte envelop in haar hand; haar telefoon in de andere, het scherm toont Tammo's naam. Ze drukt op bellen en laat afgaan. Wubbo komt naast haar zitten met twee mokken.
- **Brugwachter Wubbo** *(gemoedelijk, trots)*: Koffie. Het is zwart. Het is ook alles wat ik heb.
- **Tessa** *(zacht, vermoeid)*: Ik heb net gebeld. Niemand nam op.
- **Brugwachter Wubbo** *(gemoedelijk)*: Wie belde u?
- **Tessa** *(zacht)*: Niemand.
- **Brugwachter Wubbo** *(rustig, wijs)*: Dat is ook iemand.
- **Tessa** *(zacht, eerlijk)*: Hij is naar huis, Wubbo. We hadden ruzie.
- **Brugwachter Wubbo** *(droog, tevreden)*: Mien vrouw en ik hadden dertig jaar ruzie over een brug. Hij is er nog.
- **Tessa** *(droog)*: Wie heeft gewonnen?
- **Brugwachter Wubbo** *(rustig, wijs)*: De brug. Altijd de brug.

**Bij herhaling:** **Brugwachter Wubbo** *(gemoedelijk, trots)*: Weer de brug? Ik doe open. Een tel te laat. Dat verandert niet. Dat is het mooie. **Mislukt:** **Tessa** *(ontdaan)*: De bus is weg. Over de laatste brug. · **Brugwachter Wubbo** *(gemoedelijk)*: Hij is niet weg. Hij is nog niet terug.

**Berichten:** *U. Oldenhuis*: "Je was bij mijn snackbar. Mooi. Kom morgen naar de trein. Om te tekenen. – U.O." **Kiekdoar:** "Bestelbus klem tussen twee bruggen in Veendam. Brugwachter: 'Dat was niet de bedoeling. Ik heb het wel laten gebeuren.'"
**Afrondingskaart:** **WIJK NA WIJK** · Vijf bruggen. Vijf enveloppen. Eén tel te laat. · *+ € 2400*

**"Wat weten we?"** *De snackbars zijn de winkel. De fabriek is de bank.* (clue): In elke Oldenhuis Bakt-snackbar liggen vijf enveloppen, Wijk A t/m E, elke maand naar de zetmeelfabriek in Veendam. · *Dat is ook iemand* (hart): Tessa belde Tammo. Niemand nam op. "Wie belde u?" "Niemand." "Dat is ook iemand."

### O24 · Stoom

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| trein | Veenkoloniën | Tessa (alleen) | Station Stadskanaal, het museumspoor (avond) | € 3200 | `O24` / missie `stoom` |

**Wissel:** **Tessa** *(kort)*: Ik ga erheen. Ik wil zien wat ik teken. · **Lead:** **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon)*: Hij zet u op de trein van zeven uur. De stoomtrein, de salon. Er staat "franchise-dag" op het bordje. Er zit eenenveertig keer vet aan alles daar. Ik zou een jas aandoen.

**Bel Rikus (beller: Dries, de stoomtrein)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op de rails. Ik heb een beller met kolenstof in zijn stem.
- **Machinist Dries** *(schor, droog, aan de telefoon op de radio)*: Rikus. Dries, machinist op de stoomtrein. Vanavond is er een gesloten rit. Een salonrijtuig. Een meneer die niet eet maar wel betaalt.
- **Rikus** *(droog, als nacht-dj op de radio)*: Bent u familie van de torenwachter?
- **Machinist Dries** *(schor, droog, aan de telefoon op de radio)*: Nee. Ik ken hem van de radio. Maar ik zie alles wat achter mij rijdt. Dat is mijn werk. Het is geen melden.

**Naamkaarten:** MACHINIST DRIES: *"Stoker, machinist. Veertig jaar kolen. Geen één klacht."*

**Route en plekken.** **Stadskanaal**, station (museumspoor, OSM-check `railway=preserved`) → de museumlijn naar **Musselkanaal**, ± 8 km door weiland, een bosstrook en langs de **Mussel-Aa** (OSM-check) → overwegen → terug met alleen de loc naar Stadskanaal. Trein, salon, machinist en Stichting zijn verzonnen.

**Verloop**
1. Instappen op het museumspoor (uitnodiging bij de steward, een knecht in gele jas).
2. **Scène in de salon:** Ubbo schenkt thee, zet het contract neer en moet "even weg": de burgemeester van de trein (een franchisenemer) wil een foto.
3. **Het grootboek:** op het bijzettafeltje ligt "OB, Kasboek, deel twee". Open het (E, 3 s). Eenenveertig bladzijden, één per snackbar; de eerste regel: "1953: jury. H. O. (aan zichzelf)." Pak het.
4. **Over het dak:** klim door het raam, spring van rijtuig naar rijtuig door de bosstrook (lage takken: duiken met Ctrl; stoomwolken nemen zicht). Twee knechten achter je, één voor je.
5. **Op de tender:** Dries wijst naar de cabine. "Niet op het dak, mevrouw. Daar zit de schoorsteen."
6. **Live op Nachtstreek** (scène).
7. **De loc alleen terug:** bij Musselkanaal koppelt Dries de salonwagens af en laat jou aan de regelaar (stoom-minigame, Dries zit naast je zoals Jantina). Terug naar Stadskanaal; de Fjord staat er nog.

**Falen:** van de trein vallen (3 keer duiken missen) of 3 s vastgehouden door een knecht; op de loc een rood sein: geen fail, wel strafpunt. **Overslaan** na één poging: je staat in de cabine, de live-scène speelt. **Bezit:** de loc is van de Stichting.

**Intro.** *Camera:* Het perron van Stadskanaal bij schemer: een zwarte locomotief stoomt, de rook staat recht omhoog; een lange trage track langs de rijtuigen naar de salonwagen met dichte gordijnen en een lichtslinger; close op Tessa's laarzen op het trapje.
- **Machinist Dries** *(schor, droog)*: Instappen, mevrouw. Het is geen taxi. Het is een trein. Die doet wat hij wil, binnen het spoor. `[naamkaart: dries]`
- **Tessa** *(koel)*: Ik ga naar de salon.
- **Machinist Dries** *(schor, droog)*: Dan hoort u het niet van mij. Maar daar rookt iemand een sigaar. In een museumtrein. Dat is een misdaad op zich.
- **Knecht van Ubbo** *(stug, bij het trapje)*: Uitnodiging.
- **Tessa** *(kort)*: Hier.
- **Knecht van Ubbo** *(stug, ongelukkig)*: De baas wacht. Hij heeft thee.

**HUD-doelen:** "Stap op het museumspoor" → "Ga naar de salon" → "Open het grootboek (E)" → "Klim het dak op en kom bij de locomotief" → "Verscheur het contract live" → "Rij de locomotief terug naar Stadskanaal"

**In de missie**
- **Ubbo Oldenhuis** *(joviaal, vriendelijk)*: Thee? Het is een goed blad. Uit Veenkoloniën. Ik koop alles uit Veenkoloniën.
- **Tessa** *(koel)*: Dank u. Ik drink liever eerst.
- **Ubbo Oldenhuis** *(vriendelijk, onschuldig)*: Lees rustig. Een goed contract is geduld. Ik ben in de wagon hierachter. De burgemeester wil een foto.
- **Tessa** *(zacht, bladerend)*: "Kasboek, deel twee." Eenenveertig bladzijden. Eén per snackbar.
- **Tessa** *(zacht, ongelovig)*: "1953: jury. H. O. Aan zichzelf." `[clue]`
- **Knecht van Ubbo** *(roepend, achter haar)*: Mevrouw! Dat is niet voor u!
- **Tessa** *(strijdlustig)*: Dat is het nu wel.
- **Machinist Dries** *(roepend, vanaf de locomotief)*: Duiken! Tak!
- **Machinist Dries** *(roepend)*: Rook! Houd vast! Het zicht komt terug!
- **Knecht van Ubbo** *(roepend, uit de rook)*: Laat dat boek los!
- **Tessa** *(fel)*: Kom het halen!
- **Machinist Dries** *(schor, kort)*: Hier, naar de cabine. Handen hier. Niet daar. Daar is het heet.
- **Machinist Dries** *(schor, instruerend)*: Nu de regelaar. Zacht. Een stoomtrein is geen auto.
- **Machinist Dries** *(schor, streng)*: Rood sein. Dat is rood. Daar sta je voor stil.
- **Machinist Dries** *(schor, trots)*: Stadskanaal. Je hebt een locomotief gereden. Meer mensen hebben het op een briefje dan in het echt.

**Scène: Live op Nachtstreek, op de locomotief.** *Camera:* In de cabine: vuur, rook, het rood-oranje licht op Tessa's gezicht; laag bij de ketel, omhoog naar haar handen om het contract; achter haar glijden bomen in het donker; een blik van Dries, die naar het sein kijkt.
- **Rikus** *(warm, als nacht-dj op de radio, een beetje ongelovig)*: Nachtstreek, op de rails. Ik heb een beller op een locomotief. Ik moest het twee keer controleren.
- **Tessa** *(buiten adem, vastberaden)*: Rikus. Ik heb een boek. En een contract.
- **Rikus** *(droog, als nacht-dj op de radio)*: Welk contract?
- **Tessa** *(rustig, helder)*: Eenenveertig karren. Mijn naam erop. De Vismarkt terug.
- **Rikus** *(zacht, als nacht-dj op de radio)*: Dat klinkt als een goed contract, Tessa.
- **Tessa** *(rustig, kil)*: Het is een heel goed contract. Het is gebouwd op één regel: "1953: jury. H. O. Aan zichzelf."
- **Tessa** *(vastberaden, helder)*: Ubbo Oldenhuis. Ik verscheur het. Live. Op Nachtstreek.
- **Machinist Dries** *(schor, droog, zacht)*: Dat is het geluid van papier. Het klinkt niet zo mooi als stoom.
- **Rikus** *(warm, als nacht-dj op de radio)*: Hoorden jullie dat, Grunn? Dat was Tessa. Ze heeft een contract in tweeën gescheurd. Zonder pen.
- **Tessa** *(zacht, snel, ineens kwetsbaar)*: Rikus. Is Tammo aan het luisteren?
- **Rikus** *(zacht, als nacht-dj op de radio, een glimlach in zijn stem)*: Ik krijg net een berichtje. Van een Stadjer. Er staat: "Ik fiets." Dat is alles.
- **Tessa** *(zacht, geroerd)*: …Dank je, Rikus.

**Outro.** *Camera:* Stadskanaal bij nacht: de loc stoot een laatste pluim stoom uit en staat stil; Tessa op het perron met het leren boek tegen haar borst; de camera trekt op naar de sterren boven de rook; Dries pakt zijn pet van het dashboard.
- **Machinist Dries** *(schor, trots)*: Zo. Zeven jaar heb ik niemand achter die regelaar gezet. Het ging goed. Dat is vervelend.
- **Tessa** *(zacht)*: Dank u, Dries.
- **Machinist Dries** *(schor, droog)*: Ik heb niks gezien. Ik keek naar het sein.
- **Tessa** *(kort, met een glimlach)*: Ik weet het.
- **Machinist Dries** *(schor, vaderlijk)*: Stoom vergeeft niks. Behalve een goeie stoker. En jij bent een goeie stoker.
- **Tessa** *(scherp)*: Wat gebeurt er met de salonwagens?
- **Machinist Dries** *(droog, tevreden)*: Die staan in Musselkanaal. Er zit geen water meer in de ketel. En geen thee.

**Bij herhaling:** **Machinist Dries** *(schor, droog)*: Weer de loc? Kolen zijn duur. Maar jij mag. Jij kijkt naar het sein. **Mislukt:** **Tessa** *(ontdaan)*: Hij pakte me bij de tender. · **Machinist Dries** *(schor, droog)*: Hij had een gele jas. Die glijden. Maar ze houden vast.

**Berichten:** *U. Oldenhuis*: "Het boek is van mij, Tessa. Ik laat het niet uit mijn handen. – U.O." **Kiekdoar:** "Salonrijtuigen op het museumspoor bij Musselkanaal achtergelaten door de locomotief. Franchisenemers: 'De thee was koud, en de baas was boos.'"
**Afrondingskaart:** **STOOM** · Eén boek. Eén contract in tweeën. Eén locomotief, zacht gereden. · *+ € 3200*
*Autogesprekken:* geen (Tammo is er niet).

**"Wat weten we?"** *Kasboek, deel twee* (clue): Het grootboek, eenenveertig bladzijden. De eerste regel: "1953: jury. H. O. (aan zichzelf)." · *Het contract in tweeën* (hart): Tessa verscheurde het franchise-contract live op Nachtstreek. Tammo luisterde. "Ik fiets."

### O25 · Strokarton

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| te voet, gevecht | Veenkoloniën | Tammo | Het Oosterpark, Stad (nacht), fiets naar Hoogezand | € 2200 | `O25` / missie `strokarton` |

**Wissel:** **Tammo** *(droog)*: Ik fiets. Tegen de wind in. Dat bouwt karakter. · **Lead:** **Tessa** *(snel, aan de telefoon)*: Ik zit in de strokartonfabriek bij Hoogezand. Ze zijn met z'n zessen. Ik regel het zelf. Je hoeft niet te komen.
**Bel Rikus (beller: Rikus zelf):** **Rikus** *(zacht, samenzweerderig, laat op de avond, als nacht-dj op de radio)*: Geen beller vanavond. Ik heb een berichtje. Er staat: "Ik fiets." Het is van een Stadjer. Hij zegt niet waarheen. Ik zeg niks.

**Route en plekken.** Het **Oosterpark** (Stad) → fietspad langs het **Winschoterdiep** naar Hoogezand-Sappemeer (± 14 km, wind tegen) → **Kropswolde** → **Hoogezand-Sappemeer** → de oude strokartonfabriek aan het kanaal (verlaten terrein langs het Winschoterdiep bij Foxhol/Hoogezand, OSM-check, anders fictief) → laadperron, balenhal, pers, kraan.

**Verloop**
1. **Fiets naar Hoogezand** (`cycle`, wind tegen; de A30-regel: te hard fietsen kost je kracht). ± 3 min.
2. **De fabriek in** te voet via het laadperron: vier knechten in gele jassen en de adviseurs.
3. **Zonder wapen:** je hebt een fietspomp (`melee`, `noKill`): duwen, wegslaan, afpakken. Geen doden, geen bloed.
4. **De balenhal:** Tessa zit vastgebonden aan een pallet naast de pers; het grootboek in een plastic zak aan de kraan; de pers trekt het in (40 s).
5. **Los maken, klimmen,** zij pakt de hendel van de balenlift. **Lawine:** twaalf balen vallen om de knechten heen; ze zitten onder het karton, ongedeerd.
6. **Buiten.**

**Falen:** de zak gaat de pers in; 3 s vastgehouden door drie knechten. **Overslaan** na één poging. **Bezit:** de fiets is van jou.

**Intro.** *Camera:* Nachtelijke stad, het Oosterpark, een bankje onder een lantaarn: Tammo's telefoon licht op; hij kijkt lang, pakt zijn fiets. Een jachtige montage door nacht en wind, de lichtjes van Hoogezand. In de fabriek: balen karton tot aan het plafond; in het licht van één lamp een gezicht dat zegt dat ze alles onder controle heeft.
- **Tessa** *(fel, zacht, gebonden aan een pallet)*: Tammo! Ik had gezegd dat je niet hoefde te komen.
- **Tammo** *(droog)*: Je zit vastgebonden aan een pallet.
- **Tessa** *(scherp)*: Dat is onder controle.
- **Tammo** *(droog)*: Het is een pallet.
- **Tessa** *(stug)*: Ik ben hier met opzet.
- **Tammo** *(droog, zacht)*: Dat zeg je vaker.
- **Tessa** *(fel)*: Achter je!

**HUD-doelen:** "Fiets naar de fabriek (wind tegen)" → "Ga de fabriek in" → "Maak Tessa los en pak het boek" → "Trek de hendel van de balenlift" → "Weg uit de fabriek"

**In de missie**
- **Tammo** *(droog, gespannen)*: Eén. Rechts. Pomp.
- **Tessa** *(verbaasd)*: Pomp?
- **Tammo** *(droog, buiten adem)*: Het is mijn fiets. Ik heb alles wat ik nodig heb.
- **Tessa** *(lachend, buiten adem)*: Dat is het meest Tammo-achtige dat ik ooit heb gehoord.
- **Tessa** *(snel)*: Pakband. Jongen. Je hebt een zakmes.
- **Tammo** *(droog)*: Ik heb alles bij me.
- **Tessa** *(fel)*: De pers! Het boek!
- **Tammo** *(droog, gejaagd)*: Veertig seconden. Dat is een lang liedje.
- **Tessa** *(fel)*: Het stellingwerk! Boven! De hendel!
- **Tammo** *(droog, buiten adem)*: Ik trek. Jij duwt. Dat doen we altijd.
- **Tammo** *(verbaasd, droog)*: Het valt. Het valt allemaal om hen heen.
- **Knecht van Ubbo** *(roepend, onder het karton)*: Ik zit vast! Ik ben niet gewond! Het is zacht!

**Scène: Onder het karton.** *Camera:* Stilte na de lawine: kartonstof hangt in het licht van de lamp; een hand steekt uit het karton en zwaait. Beneden in de baal-heuvel zitten Tessa en Tammo schouder aan schouder, de rug tegen een baal, het boek tussen hen in; de camera kruipt langzaam dichterbij.
- **Tammo** *(droog, zacht, buiten adem)*: Ik heb gefietst. Veertien kilometer. Tegen de wind.
- **Tessa** *(zacht, een glimlach)*: Dat is karakter.
- **Tammo** *(droog)*: Ik heb nu genoeg karakter. Voor twee.
- **Tessa** *(zacht, eerlijk)*: …Ik heb het contract verscheurd.
- **Tammo** *(droog, zacht)*: Ik hoorde het. Op een bankje.
- **Tessa** *(zacht, verrast)*: Je luisterde.
- **Tammo** *(droog, zacht)*: Ik luister altijd. Ik zeg het alleen niet.
- **Tessa** *(zacht, geamuseerd)*: Dat is ook een soort zeggen.
- **Tessa** *(zacht, eerlijk)*: Ik zei dat jij alles hetzelfde wilt.
- **Tammo** *(droog)*: Dat was een beetje waar.
- **Tessa** *(zacht, nadenkend)*: Je wilt alleen niet minder.
- **Tammo** *(droog, zacht)*: Dat zei ik.
- **Tessa** *(zacht, bijna lachend)*: Op een woonschip.
- **Tammo** *(droog, zacht)*: En jij wil niet alles groter. Jij wilt alles kunnen.
- **Tessa** *(zacht, nieuwsgierig)*: Is dat anders?
- **Tammo** *(droog, met een glimlach)*: Het is hetzelfde. Maar vriendelijker.
- **Tessa** *(zacht, geroerd, stil)*: …
- **Tessa** *(zacht)*: Ik weet niet wat we doen met "groeien of thuis".
- **Tammo** *(droog, zacht)*: Ik ook niet.
- **Tessa** *(zacht, een glimlach)*: Dat is een begin.
- **Knecht van Ubbo** *(stug, onder het karton)*: Kunnen jullie ons hier uit halen? We hebben een gele jas aan.
- **Tammo** *(droog, kort)*: Nee.
- **Tessa** *(kordaat, zacht)*: Wij bellen de politie. Die komen zo.

**Outro.** *Camera:* Buiten de fabriek, de ochtendmist boven het Winschoterdiep, twee zwaailichten in de verte; Tammo leunt tegen zijn fiets, Tessa naast hem met het boek, schouders tegen elkaar. De camera blijft op afstand.
- **Tammo** *(droog, zacht)*: Ik breng het boek naar de agente. Zij zegt wat bewijs is.
- **Tessa** *(zacht)*: Samen.
- **Tammo** *(droog, kort)*: Samen.
- **Tessa** *(zacht, plagend)*: Ik pak jouw fiets. Jij mag achterop.
- **Tammo** *(droog)*: Ik rij zelf.
- **Tessa** *(lachend)*: Je rijdt altijd zelf.
- **Tammo** *(droog, zacht, met een glimlach)*: Dat zeg ik al twaalf jaar.

**Bij herhaling:** **Tammo** *(droog)*: Weer de fabriek? Mijn knieën zeggen nee. Ik zeg: een tweede keer is routine. **Mislukt:** **Tammo** *(droog, bleek)*: De pers was sneller dan ik. · **Tessa** *(zacht)*: Pers is pers. Je moet er vóór zijn.

**Berichten:** *U. Oldenhuis*: "Karton valt. Papier blijft. Het boek is een kopie, Tessa. Ik heb er drie. – U.O." **Kiekdoar:** "Lawine van kartonbalen in een oude fabriek bij Hoogezand. Zes mannen in gele jassen onder het karton, allen ongedeerd. Politie neemt het boek mee."
**Afrondingskaart:** **STROKARTON** · Veertien kilometer. Een fietspomp. Een gordijn van karton. · *+ € 2200*

**Autogesprek `o25-pass-pomp`:** **Tessa** *(amused)*: Je versloeg zes mannen met een fietspomp. · **Tammo** *(dry)*: Ik sloeg ze niet. Ik duwde ze weg. · **Tessa** *(laughing)*: Met een fietspomp. · **Tammo** *(dry)*: Hij zat erin. Dat is een pomp.
**Autogesprek `o25-pass-vriendelijker`:** **Tessa** *(soft)*: "Maar vriendelijker." Dat is het mooiste wat iemand ooit tegen me zei. · **Tammo** *(dry, shy)*: Ik heb nog meer. · **Tessa** *(warm)*: Bewaar ze.
**Autogesprek `o25-fail`:** **Tammo** *(dry, exhausted)*: Veertien kilometer fietsen voor een pers.

**"Wat weten we?"** *Maar vriendelijker* (hart): "Jij wilt alles kunnen." "Is dat anders?" "Het is hetzelfde. Maar vriendelijker." De vraag "groeien of thuis" is niet beantwoord. Dat is een begin. · *Het boek is bewijs* (clue): De politie nam het grootboek mee. De agente van de waterpolitie: "Een boek is geen getuige. Dat is papier." Ubbo zegt dat hij er drie heeft.

### O26 · Aardappelmeel

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| kraak (aanpak kiezen) | Veenkoloniën | Tessa | Het industrieterrein bij Veendam, de poort van de zetmeelfabriek (nacht) | € 3000 | `O26` / missie `meel` |

**Wissel:** **Tessa** *(zakelijk)*: Ik pak de aanpak. Zeg het maar: stil, slim of hard. · **Lead:** **Tammo** *(droog, aan de telefoon)*: De echte jurylijst ligt in de zetmeelfabriek, in een kluis. Plus iets uit 1953, volgens Wubbo. Er zijn drie manieren. Jij kiest.

**Bel Rikus (beller: Wubbo, Veendam)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Ik sta voor een fabriek die naar pannenkoeken ruikt. Dat is zetmeel. Ik had dat niet geweten.
- **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon op de radio)*: Rikus. Wubbo. De silo's van de zetmeelfabriek zijn vannacht open. Er staat een bewaker bij die dacht dat hij alleen was.
- **Rikus** *(droog, als nacht-dj op de radio)*: Is hij alleen?
- **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon op de radio)*: Ik meld alleen: hij had een nieuwe pet.

**Route en plekken.** **Veendam**, het industrieterrein langs het kanaal (`landuse=industrial`; de zetmeelfabriek is fictief: "Veenmeel") → poort → laadkade → silo's en transportbanden → kantoor boven de meelzolder → de kluis. Drie routes: **Stil** (rangeerspoor, loopbrug), **Slim** (als inspectrice van de verzonnen "Vetinspectie" door drie controleposten) of **Hard** (kiepwagen door de poort).

**Verloop**
1. **Kies de aanpak** (zoals H6: een bord met drie foto's; je kiest door erheen te lopen). Tammo past zich aan: stil = hij kijkt mee; slim = hij blijft bij de auto; hard = hij zit achter het stuur.
2. **Stil:** rangeerspoor, loopbrug over de banden (lawaaimeter), silotrap. **Slim:** drie controleposten met een gespreksspel (de juiste toon). **Hard:** kiepwagen door de poort tot de laadkade.
3. **Boven de meelzolder:** de kluis, cijferslot: het is **1953**.
4. **In de kluis:** de echte jurylijst van de laatste ronde (Eppo, Ruurd, Hennie, Dolf, notaris Rieks, de boswachter en "de oudste"), een plattegrond van de vesting Bourtange, en één vergeeld vel: een jurylijst uit 1953 in Hendrik Oldenhuis' handschrift: "Eigen kar: 10. Trijntje: 6." en een kilo paling per jurylid. Fotografeer alles.
5. **Alarm:** de silo gaat open; alles en iedereen wit ("Net Sinterklaas.").
6. **Weg door de wolk** zonder rennen (glad). Geen vuur: niemand rookt hier.

**Falen:** gespot door drie bewakers of 3 s in het zaklamplicht (stil); drie verkeerde tonen (slim); kiepwagen tegen de paal (hard); uitglijden in het meel en 3 s blijven liggen. **Overslaan** na één poging: de foto's zitten in je telefoon, de meelscène speelt. **Bezit:** kiepwagen en jas gaan terug.

**Intro.** *Camera:* De fabriek bij nacht: drie silo's als torens, een poort met een lampje, een bord met drie foto's; een lange kraan-shot over het hek, daalt langs de silo's naar Tessa die de foto's bestudeert, Tammo naast haar met zijn handen in zijn zakken.
- **Tammo** *(droog)*: Drie manieren. Stil. Slim. Hard.
- **Tessa** *(zakelijk)*: Stil is voor jou.
- **Tammo** *(droog)*: Slim is voor jou.
- **Tessa** *(scherp)*: Hard is voor niemand.
- **Tammo** *(droog, zacht)*: Hard is voor een kiepwagen.
- **Tessa** *(snel)*: Die we nog niet hebben.
- **Tammo** *(droog, wijst)*: Die staat daar.
- **Tessa** *(lachend, zacht)*: Je bent ongelooflijk.

**HUD-doelen:** "Kies de aanpak: stil, slim of hard" → "Kom boven de meelzolder" → "Open de kluis (het is 1953)" → "Fotografeer de lijst, de vesting en het vel" → "Weg door de wolk"

**In de missie**
- **Tammo** *(droog, gefluisterd, in het oortje)*: Bewaker links. Zaklamp. Wacht. Nu.
- **Tessa** *(fluisterend, kordaat)*: Jas van de inspectie. Klembord. Hou mijn hoofd rustig.
- **Tessa** *(zakelijk, kil, met klembord)*: Goedenavond. Ik kom voor de vetmeting.
- **Knecht van Ubbo** *(stug, argwanend)*: Om deze tijd?
- **Tessa** *(droog, scherp)*: Vet slaapt nooit.
- **Knecht van Ubbo** *(stug, na een pauze)*: …Dat klopt wel.
- **Tammo** *(droog, vastberaden, achter het stuur)*: Poort. Ik rijd.
- **Tessa** *(zacht, geconcentreerd)*: Cijferslot. Vier cijfers. Eén-negen-vijf-drie.
- **Tammo** *(droog, zacht, in het oortje)*: Dat is Oma's jaar.
- **Tessa** *(kil, zacht)*: Dit is het jaar van een misdaad.
- **Tessa** *(zacht, ongelovig)*: "Eigen kar: 10. Trijntje: 6." Hij gaf zichzelf een tien. `[clue]`
- **Tammo** *(droog, kil, in het oortje)*: Een kilo paling per jurylid. Dat is geen jury. Dat is een visafslag.
- **Tessa** *(snel)*: Foto. Foto. En foto. Het alarm gaat af.
- **Tammo** *(roepend)*: Silo. Hij gaat open. Rennen!
- **Tessa** *(roepend, hoestend)*: Niet rennen! Het is meel! Je glijdt!

**Scène: De meelwolk.** *Camera:* De silo opent met een zacht gesis en een witte stroom valt over de laadkade; de camera trekt op en kijkt toe terwijl bewakers, knechten en Tessa tot de oren wit worden; Tammo in de deuropening met een witte pet; een lange, trage stilte.
- **Knecht van Ubbo** *(stug, verbaasd, onder het meel)*: Ik ben wit.
- **Tessa** *(droog, hoestend, wit)*: Net Sinterklaas.
- **Tammo** *(droog, wit tot aan zijn pet)*: Het is september.
- **Tessa** *(snel)*: Dat is wat ik zeg.
- **Knecht van Ubbo** *(stug, beleefd)*: Mag ik even zitten?
- **Tessa** *(zacht, geamuseerd)*: Ga zitten. Het is een mooie nacht.

**Outro.** *Camera:* Aan de rand van het terrein onder een lantaarn: Tessa en Tammo, wit van top tot teen, op de bumper van de Fjord; aan de overkant van het kanaal de eerste lichtjes van de morgen. Tessa houdt haar telefoon omhoog met de foto's.
- **Tessa** *(zacht, moe, wit)*: De jurylijst. De plattegrond van de vesting. En een vel van 1953.
- **Tammo** *(droog, zacht)*: Hendrik gaf zichzelf een tien.
- **Tessa** *(snel)*: En een kilo paling per jurylid.
- **Tammo** *(droog)*: Een jury van paling. Dat verklaart veel.
- **Tessa** *(zacht, kil)*: Oma werd zes.
- **Tammo** *(droog, stil)*: Oma werd altijd een tien.
- **Tessa** *(zacht)*: Dat zeg ik haar niet.
- **Tammo** *(droog, zacht)*: Ze weet het.
- **Tessa** *(zacht, met een glimlach)*: …Ze weet alles.
- **Tammo** *(droog, vastberaden)*: Dan zaterdag. In de vesting.

**Bij herhaling:** **Tessa** *(droog, geamuseerd)*: Weer wit. Het hoort bij het beroep. **Mislukt:** **Tammo** *(droog, zacht)*: Je glijdt altijd uit in het zetmeel. · **Tessa** *(snel, wit)*: Hij is glad. Dat heet een zetmeel.

**Nachtstreek, na afloop (beller: Siebrand Mulder, politiebureau Delfzijl, de Eemsdelta-terugblik)**
- **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek. Ik heb een beller die zegt dat hij mag bellen. Dat is nieuw. Ik hoor een deur dichtgaan.
- **Siebrand Mulder** *(kil, beheerst, aan de telefoon op de radio)*: Rikus. Siebrand Mulder. Ik bel vanuit het bureau in Delfzijl. De agente zegt dat ik mag praten. Ik ben dat niet gewend.
- **Rikus** *(droog, als nacht-dj op de radio)*: Waarover wilt u praten?
- **Siebrand Mulder** *(kil, beheerst, aan de telefoon op de radio)*: Over vaten. Over OB. Over mijn opa, die in 1953 paling voer voor een kar in Veendam. Ik heb een verklaring afgelegd.
- **Rikus** *(droog, als nacht-dj op de radio)*: Waarom nu?
- **Siebrand Mulder** *(kil, beheerst, met een zweem van humor, aan de telefoon op de radio)*: Hij noemde mij betrouwbaar. Ik ben dat niet. Maar hij schreef het op papier. En papier is wat hij zelf gebruikt.

**Berichten:** *U. Oldenhuis*: "Mijn lijst. Mijn vel. Mijn opa. Ik zie je in de vesting, Tessa. Neem je vriend mee. – U.O." **Kiekdoar:** "Alles wit bij de zetmeelfabriek in Veendam. Bewakers wit tot aan hun pet. Een meneer vroeg of hij even mocht zitten. Het mocht."
**Afrondingskaart:** **AARDAPPELMEEL** · Eén lijst. Eén plattegrond. Eén vel uit 1953. Eén keer wit. · *+ € 3000*

**Autogesprek `o26-pass-sint`:** **Tammo** *(dry)*: "Net Sinterklaas." Wie zegt dat? · **Tessa** *(dry, still white)*: Iedereen die wit is, denkt dat. · **Tammo** *(dry)*: Ik denk het nu ook.
**Autogesprek `o26-pass-paling`:** **Tammo** *(dry)*: Een kilo paling per jurylid. Hij betaalde in vis. · **Tessa** *(cold)*: Zijn kleinzoon betaalt in enveloppen. · **Tammo** *(dry)*: Het is dezelfde familie. · **Tessa** *(quiet)*: Het is dezelfde kar.
**Autogesprek `o26-fail`:** **Tessa** *(sheepish)*: Ik gleed uit in het meel. · **Tammo** *(dry)*: Je bent wit. Dat is al een medaille.

**"Wat weten we?"** *Een jury van paling* (clue): In de kluis lag een jurylijst uit 1953 in Hendrik Oldenhuis' handschrift: "Eigen kar: 10. Trijntje: 6." En een kilo paling per jurylid. Siebrands opa voer de paling. · *De laatste jury* (clue): De echte jurylijst voor de finale in de vesting Bourtange, met een plattegrond. Ubbo houdt het "besloten", met zijn eigen jury. Zaterdag.

### O27 · Veendam, laatste kans

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| bakken, verdedigen | Veenkoloniën | Tammo | Een ophaalbrug over het kanaal in Veendam (middag) | € 3800 | `O27` / missie `veendam` |

Voorronde zes.

**Wissel:** **Tammo** *(droog)*: Ik bak. Ik sta op een brug. Dat voelt als thuis, op een raar soort manier. · **Lead:** **Tessa** *(zakelijk, aan de telefoon)*: Voorronde zes, in Veendam. De kraam staat op Wubbo's brug. Er komt een schip. De brug moet open. Hij kan niet wachten. De jury zit op de kade.

**Bel Rikus (beller: Ubbo, Oldenhuis Bakt)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, op tournee. Ik sta op een brug in Veendam. Hij beweegt. Ik heb geen vast gevoel in mijn knieën.
- **Ubbo Oldenhuis** *(joviaal, zakelijk, aan de telefoon op de radio)*: Rikus. Veendam is mijn thuis. Daar ben ik geboren, daar ligt mijn fabriek. Vandaag stuur ik alles.
- **Rikus** *(droog, als nacht-dj op de radio)*: Alles?
- **Ubbo Oldenhuis** *(joviaal, hard, aan de telefoon op de radio)*: Alles. Mijn mensen, mijn schepen en mijn zus. Er is een laatste kans, Rikus. En ik pak hem.

**Route en plekken.** Een ophaalbrug in **Veendam** (OSM-check welke; een brug met voetpad) → de kade met de jurytafel → het kanaal met de vrachtboot ("Vette Jaren III") → de kade tegenover de brug.

**Verloop**
1. **Opzetten:** de kraam staat op het voetpad van de brug (wielen aan de poten); de jurytafel op de kade.
2. **Bakken** (3 × 70 s) samen met Tessa: de Veenkoloniaal-eierbal met aardappelzetmeel in de korst.
3. **Het schip:** Wubbo moet de brug openen ("Schip heeft voorrang. Altijd. Ook van een eierbal."). Je hebt 25 s om de kraam naar de kade te duwen; blijf bakken terwijl je duwt.
4. **Saboteurs:** knechten trekken aan het touw, twee in een rubberboot.
5. **Drie keer open**, elke keer sneller (25, 20, 15 s).
6. **Jury:** Wubbo (de oudste op de brug, in zijn raam), notaris Rieks en een oude mevrouw uit Veendam. Outro.

**Falen:** de kraam blijft op het dek hangen (−50 % per keer); de kraam valt in het kanaal; de pan 10 s onbemand. **Overslaan** na één poging. **Bezit:** de kraam is van de Fjord.

**Intro.** *Camera:* De brug bij middag, de zon in het kanaal; camera op de reling langs het voetpad naar de gele kraam die op wieltjes wiebelt; in de verte een vrachtboot, de claxon galmt; close op Wubbo in zijn raam, duim omhoog, een tel te laat.
- **Brugwachter Wubbo** *(gemoedelijk, traag, vanuit zijn raam)*: Moi. Het is voorronde, maar ook vrachtverkeer. Ik heb geen afspraken. Ik heb schepen.
- **Tessa** *(zakelijk)*: Dat weten we.
- **Tammo** *(droog)*: We staan op een brug.
- **Brugwachter Wubbo** *(gemoedelijk)*: Dat zie ik. Het is mijn brug. Hij houdt van gewicht. Behalve als hij open gaat.
- **Tammo** *(droog, ongerust)*: Als hij open gaat?
- **Brugwachter Wubbo** *(rustig, onverstoorbaar)*: Dan gaat alles omhoog. Ook jullie.
- **Tessa** *(scherp)*: Dat zeg je pas nu?
- **Brugwachter Wubbo** *(gemoedelijk, met een knipoog)*: Ik meld alleen. Dit is geen melding. Dit is een feit.

**HUD-doelen:** "Zet de kraam op de brug" → "Bak (3 rondes)" → "Duw de kraam van het brugdek als de brug opengaat" → "Hou de saboteurs weg" → "De jury"

**In de missie**
- **Tessa** *(gehaast, bij de pan)*: Eerste lading in het vet. Zeventig tellen.
- **Tammo** *(droog, gespannen)*: Ik hoor een claxon. Hij komt dichterbij.
- **Brugwachter Wubbo** *(roepend, vanuit zijn raam)*: Schip in zicht! Brug gaat open! Vijfentwintig seconden!
- **Tammo** *(roepend)*: Duwen! Wielen vrij!
- **Tessa** *(roepend, bij de pan)*: Ik bak door! Hou hem recht!
- **Tammo** *(buiten adem, droog)*: Hij staat. Op de kade. Met eierballen erin.
- **Knecht van Ubbo** *(roepend, van de brug)*: Laat hem zakken! Het touw!
- **Tammo** *(droog, fel)*: Het touw is van mij.
- **Brugwachter Wubbo** *(roepend)*: Tweede schip! Dit keer sneller! Twintig seconden!
- **Tammo** *(roepend)*: Twintig! Ik heb dertig nodig!
- **Brugwachter Wubbo** *(verontschuldigend, vanuit zijn raam)*: Ik doe mijn best. Het is een tel te laat. Het is mijn beste.
- **Tammo** *(droog, gespannen)*: Rubberboot. Rechts. Twee mannen.
- **Tessa** *(kordaat)*: Duw ze weg. Maar rustig. Er staan mensen op de kade.
- **Brugwachter Wubbo** *(roepend, rustig)*: Derde schip. Vijftien seconden. Dit is het laatste. Denk aan de brug.
- **Tammo** *(droog, buiten adem)*: Hou vol. Hou vol. Dat is het enige wat ik kan.
- **Tessa** *(zacht, snel)*: Dat is het enige wat je nodig hebt.

**Scène: De jury op de kade.** *Camera:* De jurytafel op de kade, het kanaal erachter, de brug nog trillend; Wubbo kijkt vanuit zijn raam mee; notaris Rieks naast hem, met een eierbal in haar hand en een blik van verbazing.
- **Notaris Rieks** *(droog, verbaasd, met een eierbal)*: Ik heb dertig jaar getekend zonder te lezen. Dit is mijn eerste keer proeven.
- **Notaris Rieks** *(droog, geroerd)*: Het is… knapperig.
- **Brugwachter Wubbo** *(trots, rustig)*: Het zetmeel zit in de korst. Dat is goed. Dat komt uit de fabriek. Alleen weet de fabriek het niet.
- **Notaris Rieks** *(droog, plechtig, met een traan)*: Valt mie nait of. *(Dat valt me niet tegen.)*
- **Brugwachter Wubbo** *(trots, rustig, met een glimlach)*: Valt mie nait of. *(Dat valt me niet tegen.)*
- **Brugwachter Wubbo** *(plechtig, rustig)*: De voorronde Veenkoloniën gaat naar de Fjord Frituur. Ik meld alleen. En ik zet de brug nu dicht.

**Outro.** *Camera:* De brug in de late zon, de kraam op de kade; Tessa en Tammo met een bakje friet; Wubbo komt naar buiten en zwaait met een sleutel; de camera kraant omhoog over het kanaal en de rijen huizen.
- **Brugwachter Wubbo** *(gemoedelijk, trots)*: Hier. De sleutel van het huisje. Voor als jullie willen blijven. Het bed kraakt. De brug ook.
- **Tessa** *(warm)*: Wubbo. Dank u.
- **Brugwachter Wubbo** *(droog, tevreden)*: Dank mien vader. Hij leende tien gulden. Het is nooit teruggekomen. Maar de brug wel.
- **Tammo** *(droog, zacht)*: Vijf van zeven?
- **Tessa** *(zacht, trots)*: Zes.
- **Tammo** *(droog, kort)*: Zes. Dan blijft er één.
- **Brugwachter Wubbo** *(rustig, wijs)*: Dan is de finale in Westerwolde. Daar is geen trein. Dat hoort zo.

**Bij herhaling:** **Brugwachter Wubbo** *(gemoedelijk, trots)*: Weer het schip? Ik doe open. Een tel te laat. Dat weten jullie nu. **Mislukt:** **Tammo** *(droog, verslagen)*: De kraam ging mee omhoog. · **Brugwachter Wubbo** *(gemoedelijk)*: Dat doen kramen. Als ze op een brug staan.

**Berichten:** *U. Oldenhuis*: "Zes. Nog één. Het wordt zaterdag, Tessa. – U.O." **Kiekdoar:** "Kraam op een ophaalbrug in Veendam, drie schepen, nul schade. Brugwachter: 'Een tel te laat is ook een manier van op tijd.'"
**Afrondingskaart:** **VEENDAM, LAATSTE KANS** · Voorronde Veenkoloniën: gewonnen. Zes van zeven. · *+ € 3800*

**Autogesprek `o27-pass-brug`:** **Tammo** *(dry, amazed)*: We stonden op een brug. Die ging omhoog. En we hebben gebakken. · **Tessa** *(quick, proud)*: Dat is wat we doen. We bakken waar het niet kan.
**Autogesprek `o27-pass-rieks`:** **Tessa** *(amused)*: "Dertig jaar getekend zonder te lezen." Ik heb medelijden. · **Tammo** *(dry)*: Ze zei: Valt mie nait of. Dat is trede drie. · **Tessa** *(quiet, amazed)*: Van een notaris.
**Autogesprek `o27-fail`:** **Tammo** *(dry)*: Een kraam gaat niet mee omhoog. Hij blijft op de aarde. · **Tessa** *(dry)*: Hij zat op de brug, Tammo.

**"Wat weten we?"** *Voorronde Veenkoloniën* (clue): Gewonnen op de brug in Veendam. Notaris Rieks en Wubbo jureerden: "Valt mie nait of." Zes van zeven. De finale is in de vesting Bourtange, zaterdag.

### Tussendoor: Een brugwachtershuisje (`n-brugwachter`)

Speler: Tammo. Doel: `{ type: 'filiaal', at: 'veendam' }`. **Wissel:** **Tammo** *(droog)*: Ik ga het huisje bekijken. Ik ben goed in brugwachtershuisjes. Er zit een stoel in. · **Lead:** **Tessa** *(warm, aan de telefoon)*: Wubbo zegt: er zit een luik in zijn huisje. En een boot onder de brug. En een stoel. Hij had alleen die stoel.
**Scène: Het brugwachtershuisje, Veendam.** *Camera:* Avond aan het kanaal, het huisje klein onder de brug; trage dolly over het water naar het raam waar Wubbo zit; binnen één stoel, één thermoskan, nu twee extra stoelen.
- **Brugwachter Wubbo** *(gemoedelijk, trots)*: Er zijn nu drie stoelen. Dat is een feest.
- **Tessa** *(zacht, blij)*: Zes filialen, Tammo.
- **Tammo** *(droog, zacht)*: Zes van zeven.
- **Tessa** *(zacht, verbaasd)*: Je telt mee.
- **Tammo** *(droog)*: Ik tel altijd. Alleen niet hardop.
- **Brugwachter Wubbo** *(trots, rustig)*: Het luik komt in mijn raam. Dan serveer ik vanuit de brug. Dat is nieuw. Het is nog nooit gedaan.
- **Tessa** *(snel)*: En het schip?
- **Brugwachter Wubbo** *(gemoedelijk)*: Het schip wacht. Een tel. Dat is zijn vak.
**Klaar:** **Tessa** *(warm)*: Filiaal zes: Wubbo's brugwachtershuisje. Hij bakt alleen als er geen schip komt. Er komt altijd een schip. · **HUD:** "Filiaal geopend: het brugwachtershuisje" · "Safehouse: het brugwachtershuisje, boot onder de brug" · "Nieuw recept: de Veenkoloniale eierbal, met aardappelzetmeel in de korst"

### Ring 4 · Westerwolde en de finale

Bondgenoot **Berend Bos** (de bisschop) en de **boswachter Siemen** (melder én Ubbo's laatste jurylid); tegenstander **Ubbo zelf**, in zijn laatste voorronde. Geen spoor: "Daar is geen trein. Dat hoort zo." De finale speelt in en rond **Vesting Bourtange** (stervormige vesting uit 1593, gracht, ophaalbrug, bolwerken; de beleg van 1672 door "Bommen Berend" is hier echt gebeurd, en de vesting hield stand) en op de heide en het veen tot het grensbord. Alles wat met een beleg te maken heeft is **toneel**: karton, meel, water, geen doden.

### Tussendoor: Zonder trein (`n-westerwolde`)

Speler: Tessa. Doel: `{ type: 'arrive', at: 'westerwolde-bosrand' }`. Eerste aankomst: over de weg, bij een bosrand; een melder; de laatste kaartonthulling.
**Wissel:** **Tessa** *(zakelijk)*: Ik rij. Dit is de laatste regio. Ik wil het zien. · **Lead:** **Oma Trijntje** *(stellig, aan de telefoon)*: Nummer zeven is geen naam. Het is een man op een paard. Hij wacht bij de bosrand bij Sellingen. Hij is ook niet aardig. Maar hij is van mij.
**Radio:** **Rikus** *(droog, als nacht-dj op de radio)*: Nachtstreek, op tournee. Vanavond vanuit Westerwolde. Er is geen station. Dat hoort zo. Ik heb gevraagd waarom. Iemand zei: zo blijft het stil.
**Scène: De bosrand bij Sellingen.** *Camera:* De Fjord rijdt een zandweg op tussen paarse heide in bloei; stof dwarrelt in het slaglicht; de camera hangt achter de wagen en laat de dennen langs trekken. Aan de bosrand staat een man in een groen jasje bij een pick-up; achter hem, ver, een stipje dat een paard blijkt.
- **Boswachter Siemen** *(rustig, kort)*: Moi. Siemen. Boswachter. U bent van Trijntje. `[naamkaart: siemen]`
- **Tessa** *(vriendelijk)*: Hoe weet u dat?
- **Boswachter Siemen** *(droog, warm)*: Iedereen die hier stopt, is van iemand. Ik meld alleen.
- **Tessa** *(nieuwsgierig)*: Bent u familie van de torenwachter?
- **Boswachter Siemen** *(rustig, kort)*: Mijn neef. Ik zit tussen de bomen. Dat is hoger dan je denkt.
- **Boswachter Siemen** *(rustig, kort)*: Ik zit in de jury. Van Ubbo. Dat weet hij. Wat hij niet weet: ik hoor alles. Ik zeg weinig.
- **Tessa** *(zacht, verrast)*: U bent zijn juryman?
- **Boswachter Siemen** *(droog, warm)*: Hij heeft mij gekozen omdat ik niks zeg. Dat is een misverstand. Dat is het mooiste misverstand.
- **Boswachter Siemen** *(rustig, kort)*: Kijk. De vesting. Zaterdag. Hij sluit hem af. Berend wacht op u.
**Klaar:** **Tessa** *(zacht)*: De heide staat in bloei. Zo ver je kijkt. · **HUD:** "Westerwolde is open" · "Uitkijkpunt: de bosrand bij Sellingen"

### O28 · Een bisschop in het bos

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| verhaal, verkennen | Westerwolde | Tammo | De bosrand bij Sellingen (ochtend, zaterdag) | € 1200 | `O28` / missie `bisschop` |

**Wissel:** **Tammo** *(droog)*: Ik rij. Achter een paard aan. Dat is mijn tempo. · **Lead:** **Tessa** *(warm, aan de telefoon)*: Berend heeft een plan. Hij zegt dat hij het veertig jaar heeft geoefend. Ik snap niet wat er te oefenen valt aan verliezen.

**Bel Rikus (beller: Berend Bos, Stad)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek. Ik heb een beller uit de Schildersbuurt. Hij belt zelden. Hij brengt dan meestal een brief.
- **Berend Bos** *(nors, aan de telefoon op de radio)*: Rikus. Berend. Ik zit op een paard. Het is een heel groot paard. Hij heet Münster.
- **Rikus** *(droog, als nacht-dj op de radio)*: Gaat u het weer verliezen, Berend?
- **Berend Bos** *(nors, aan de telefoon op de radio)*: Nee. Ik heb een plan. Dit keer win ik. Ik heb veertig jaar geoefend.

**Route en plekken.** De bosrand bij **Sellingen** → heide en zandwegen (heide in bloei) → langs de **Ruiten Aa** (OSM-check) → **Vlagtwedde** niet; het pad loopt door de bossen ten noorden van **Bourtange** → een heuvel (duin) met uitzicht op de vesting van boven. ± 5 km in wandeltempo.

**Verloop**
1. **Rij de Fjord achter Berends paard aan** (`follow`, NIEUW): blijf tussen 12 en 25 m achter het paard. Te dichtbij of toeteren: Münster schrikt (Berend scheldt). Te ver: Berend raakt het spoor kwijt en stopt.
2. **Gesprekken onderweg** (companion): Tessa zit naast je; Berend roept dingen van het paard. Eén vaste stop bij een heideven (foto).
3. **Een grijze schaduw** tussen de dennen (foreshadow Z19: niemand zegt iets, de camera wel).
4. **De heuvel:** Berend legt zijn plan uit op een kaart die hij uit zijn jas haalt, met de vesting eronder.
5. **Telefoontje van Oma** (hieronder).

**Falen, overslaan:** Münster slaat op hol (3× te dichtbij): hij rent terug naar het begin. Geen fail op tijd. **Overslaan** na één poging: je staat op de heuvel, het plan speelt. **Bezit:** het paard is van Berend.

**Intro.** *Camera:* Een zandweg tussen heide in bloei; in de verte een man in vol ornaat (kuras, pluimenhoed, bisschopsmantel van een gordijn) op een groot grijs paard. De camera loopt mee op paardenpas, kijkt om naar de Fjord die zachtjes volgt.
- **Berend Bos** *(nors, grommend)*: Dat stel. Eindelijk. Ik wacht al drie kwartier. Het paard ook.
- **Tammo** *(droog)*: Dag Berend. Mooie jurk.
- **Berend Bos** *(nors)*: Het is een mantel. Hij is van de bisschop. Ik leen hem. Hij heeft hem niet nodig.
- **Tessa** *(vriendelijk)*: Hoe heet het paard?
- **Berend Bos** *(nors, een tikje trots)*: Münster. Hij is zachter dan hij klinkt.

**HUD-doelen:** "Rij achter Berends paard aan (12-25 m)" → "Stop bij het heideven" → "Volg Berend naar de heuvel" → "Luister naar zijn plan"

**In de missie**
- **Berend Bos** *(nors, roepend, van het paard)*: Niet toeteren! Hij is een paard, geen auto!
- **Tammo** *(droog)*: Ik toeter nooit. Het is Tessa.
- **Tessa** *(lachend)*: Ik doe niks. Ik zit.
- **Berend Bos** *(nors)*: Kijk. De heide. Dit is van niemand. Daarom is het van iedereen.
- **Tessa** *(zacht, in de wagen)*: Als we winnen. Dan is er een filiaal in een boshut.
- **Tammo** *(droog, zacht)*: Dan is er één kraam in een bos.
- **Tessa** *(zacht, eerlijk)*: Ik ben bang dat je meer wilt vasthouden dan ik kan loslaten.
- **Tammo** *(droog, zacht)*: Ik ben bang dat jij meer wilt dan je kunt dragen.
- **Tessa** *(zacht)*: Na de Ronde beslissen we. Samen.
- **Tammo** *(droog, zacht)*: Samen is ook een antwoord.
- **Berend Bos** *(nors, van het paard)*: Ik hoor jullie praten. Praat zachter. Mijn paard luistert mee.
- **Tammo** *(droog)*: Sorry, Münster.

**Scène: De heuvel boven de vesting.** *Camera:* Een duin met uitzicht: onder hen, in het bos, het perfecte vijfpuntige patroon van de vesting met bolwerken, gracht en een kerkje in het midden; de zon op het water; Berend trekt zijn kaart uit zijn mantel en spreidt hem over de zadelknop.
- **Berend Bos** *(nors, plechtig)*: Zestienhonderdtweeënzeventig. Bommen Berend valt Bourtange aan. Hij verliest.
- **Tammo** *(droog)*: Dat weet iedereen.
- **Berend Bos** *(nors)*: Hij verliest, omdat hij van één kant komt. Bourtange heeft vijf bolwerken. Je valt niet van één kant aan. Je valt aan van overal. Tegelijk. En je weet precies wanneer elk bolwerk te laat reageert.
- **Tessa** *(snel, scherp)*: Hoe weet u dat?
- **Berend Bos** *(nors, bijna zacht)*: Ik heb veertig jaar verloren. Ik weet precies hoe het fout gaat. Nu doe ik het andersom.
- **Berend Bos** *(nors)*: Water. Land. Lucht. En een brug die te vroeg opengaat.
- **Tammo** *(droog)*: Waar halen we dat vandaan?
- **Berend Bos** *(nors, een tikje trots)*: Van Trijntje. Zij heeft zeven mensen die haar nog wat schuldig zijn. Dat is een leger.

**Telefoon: Oma Trijntje (het 1953-verhaal; één set, twee varianten)**
- **Oma Trijntje** *(stellig, oud, aan de telefoon)*: Ik kom zaterdag. Ik laat me rijden. Durk en Douwe zorgen voor mij. Ze zijn aardig. Ze hebben ook een klomp.
- **Tessa** *(zacht, aan de telefoon)*: Oma. Waarom Bourtange?
- **Oma Trijntje** *(droog, oud, aan de telefoon)*: Dat zeg ik één keer. Ik was negentien. De Ronde was in Bourtange. Mijn eierbal was beter. De jury had een kilo paling in zijn zak. Hendrik Oldenhuis zat voorop. Hij gaf zichzelf de prijs.
- **Oma Trijntje** *(stellig, aan de telefoon)*: `[alleen als Z4 gespeeld]` Jullie hebben de medaille. Ik gooide hem in de klei, van boosheid. Dat was dom. Die klei was van iemand anders.
- **Oma Trijntje** *(droog, aan de telefoon)*: `[alleen zonder Z4]` Ik gooide mijn medaille in de klei, vanaf de dijk. Van boosheid. Er is vast iemand met een detector die hem vindt. Die zijn er altijd.
- **Tammo** *(zacht, aan de telefoon)*: Oma. Waarom heeft u dat nooit gezegd?
- **Oma Trijntje** *(stellig, aan de telefoon)*: Ik ben Gronings. Wij zeggen het één keer. Dan is het waar. Dit is die keer.

**Outro.** *Camera:* Op de heuvel, de zon hoger: de Fjord stilgezet naast het paard; Berend kijkt uit over de vesting, zijn handen op de zadelknop. Een lange stilte, dan buigt hij zijn hoofd.
- **Berend Bos** *(nors, zacht)*: Veertig jaar. Ik wil het één keer goed doen.
- **Tessa** *(zacht)*: U heeft het goed gedaan.
- **Berend Bos** *(nors, dan zacht)*: Kon minder.
- **Tammo** *(droog, zacht)*: Dat is het mooiste wat u hebt gezegd.
- **Berend Bos** *(nors)*: Ik zeg niks. Ik ben bisschop.

**Bij herhaling:** **Berend Bos** *(nors)*: Weer op de heuvel? Het paard houdt van herhalingen. Ik niet. **Mislukt:** **Berend Bos** *(nors, roepend)*: Mijn paard is weg! Dat is jouw schuld! · **Tammo** *(droog)*: Hij stond ernaast, Berend.

**Berichten:** *Harm-Jan* `[alleen zonder Z4]`: "Gevonden in de klei van Uithuizen. Geen goud. Brons. Er staat Trijntje op. Ik graaf niet. Ik piep. – H-J." · *U. Oldenhuis*: "Een bisschop. Op een paard. In een vesting. Dat is een museum. – U.O." **Kiekdoar:** "Man in bisschopsgewaad op grijs paard in de bossen bij Sellingen. Boswachter: 'Ik zag niks.'"
**Afrondingskaart:** **EEN BISSCHOP IN HET BOS** · Eén plan. Eén paard. Veertig jaar geoefend. · *+ € 1200*

**Autogesprek `o28-pass-samen`:** **Tessa** *(soft)*: "Samen is ook een antwoord." · **Tammo** *(dry, quiet)*: Ik zeg ze zelden. · **Tessa** *(warm)*: Dat is waarom ze tellen.
**Autogesprek `o28-pass-berend`:** **Tammo** *(dry)*: Berend zei "kon minder". · **Tessa** *(amazed)*: Tegen een paard. · **Tammo** *(dry)*: Tegen zichzelf.
**Autogesprek `o28-fail`:** **Tessa** *(sighing)*: Hij rent. Je was te dichtbij. · **Tammo** *(dry)*: Hij is een paard. Hij had ruimte nodig.

**"Wat weten we?"** *Het plan van de bisschop* (clue): Berend: de vesting valt je niet van één kant aan. Water, land, lucht, en een brug die te vroeg opengaat. Zeven mensen die Trijntje iets schuldig zijn: dat is een leger. · *Ommelander Ronde, 1953* (hart): Oma was negentien. De Ronde was in Bourtange. De jury had paling in de zak. Hendrik Oldenhuis zat voorop en gaf zichzelf de prijs. "Ik ben Gronings. Wij zeggen het één keer. Dit is die keer."

### O29 · Stil in het klooster

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| te voet, sluipen | Westerwolde | Tammo | Een zandweg bij Sellingen, een kwartier lopen van "Huize Stilte" (nacht, 01:00) | € 3000 | `O29` / missie `klooster` |

De nacht voor de finale. Het "klooster" uit het plan is verplaatst: **Huize Stilte** is een fictief voormalig kloosterlandgoed bij Sellingen, tegenwoordig een stiltehuis; het staat niet op een echte plek.

**Wissel:** **Tammo** *(droog, zacht)*: Ik ga. Stilte kan ik. Ik oefen het al twaalf jaar. · **Lead:** **Tessa** *(zacht, aan de telefoon)*: Ubbo's laatste jury logeert in een stiltehuis. Drie van hen krijgen morgenochtend een envelop. Als jij ze ruilt, ruilen zij mee. Je mag niets laten horen.

**Bel Rikus (beller: Rikus zelf)**
- **Rikus** *(zacht, samenzweerderig, laat op de avond, als nacht-dj op de radio)*: Nachtstreek, de stilste uitzending van het jaar. Ik draai niks. Ik zeg niks. Ik adem alleen. Als jullie dat horen, ben ik er.

**Route en plekken.** Een zandweg bij **Sellingen** → het hek van Huize Stilte → de **kruidentuin** (grind, gras, kruidenbedden, een kapelletje met een collectebus) → de gastenvleugel met drie ramen op de begane grond (de kamers van notaris Rieks, slager Ruurd en kermisbaas Hennie) → de keuken → de achterpoort.

**Verloop**
1. **Sluipen door de kruidentuin** (`noise`-meter, NIEUW): grind = luid, gras = stil, kruidenbedden = niezen (wacht). De stiltebel (een kleine klok in het kapelletje) gaat bij 100 %.
2. **Luister bij de drie ramen** (`listen`): elk jurylid praat in zijn slaap (grappen: zie scène).
3. **Ruil de enveloppen** (`swap`, NIEUW; houd E 3 s per envelop): in elke envelop zit Ubbo's geld; jij stopt Oma's receptkaartje en een warm eierbalpakket (thermoszak) ervoor in.
4. **Het geld** gaat in de collectebus van de kapel ("Voor het dak. Die lekt."): scènetje.
5. **Weg via de keuken:** Broeder Everhard (stil, met een schoolbord) zit er al; hij ziet je en schrijft iets.

**Falen:** de stiltebel gaat (noise 100 %): de gasten worden niet wakker, maar Broeder Everhard staat in de deuropening met zijn schoolbord: opnieuw vanaf het hek. Er zijn geen gevaarlijke bewakers; het is een stiltehuis. **Overslaan** na één poging: de enveloppen zijn geruild, de collectebus-scène speelt. **Bezit:** niets.

**Intro.** *Camera:* Een zandweg bij maanlicht, de heide zilver; een hek met een bordje "STILTE"; de camera gaat zonder geluid over het hek; in de kruidentuin elke stap hoorbaar groot: grind, gras, een uil. Close op Tammo's schoenen.
- **Tammo** *(droog, gefluisterd)*: Dit is een tuin met een bordje. Het bordje zegt: stil. Ik doe wat het bordje zegt.
- **Tessa** *(zacht, in het oortje)*: Grind is luid. Gras is stil. Kruiden niezen.
- **Tammo** *(droog, gefluisterd)*: Kruiden niezen?
- **Tessa** *(zacht, in het oortje)*: Lavendel. Ik heb het opgezocht.

**HUD-doelen:** "Sluip door de kruidentuin (houd de stilte-meter laag)" → "Luister bij de drie ramen" → "Ruil de drie enveloppen (houd E)" → "Stop het geld in de collectebus" → "Weg via de keuken"

**In de missie (fluisterend)**
- **Tessa** *(zacht, in het oortje)*: Gras links. Daar. Niet het grind.
- **Boswachter Siemen** *(fluisterend, door een raam)*: Ik snurk. Ga uw gang.
- **Tammo** *(gefluisterd, droog)*: Dank u.
- **Boswachter Siemen** *(fluisterend)*: Ik meld alleen: de kat zit bij de keuken. Hij is de enige die het hoort.
- **Notaris Rieks** *(slaaptalend, mompelend)*: …tekenen…lezen…ik moet lezen…
- **Slager Ruurd** *(slaaptalend, stug)*: …één kilo…per man…geen vis…
- **Kermisbaas Hennie** *(slaaptalend, plechtig)*: …eerlijk voor mij…eerlijk voor mij…
- **Tammo** *(gefluisterd, droog)*: Hij herhaalt het in zijn slaap. Dat is erg.
- **Tessa** *(zacht, in het oortje)*: Envelop. Nu. Geen geluid.
- **Tammo** *(gefluisterd, gespannen)*: Het kaartje van Oma. "Proef eerlijk. T." Erin.
- **Tessa** *(zacht, in het oortje)*: En de thermoszak. Warm. Dat ruiken ze straks.
- **Tammo** *(gefluisterd, verrast)*: Er zit… veel geld in.
- **Tessa** *(zacht, in het oortje)*: De collectebus. In het kapelletje. Daar mag het in.

**Scène: De collectebus.** *Camera:* Het kapelletje bij maanlicht; een eenvoudige houten collectebus met het plaatje "Voor het dak"; Tammo schuift één voor één de bundels naar binnen; elke bundel een zachte plof; boven in het balkenwerk een gat waar de maan doorheen schijnt.
- **Tammo** *(gefluisterd, droog)*: Voor het dak. Dat lekt. Dat zie ik.
- **Tessa** *(zacht, in het oortje, lachend)*: Dat is het eerlijkste wat dat geld ooit gedaan heeft.
- **Broeder Everhard** *(geschreven op een schoolbord)*: IK HEB NIKS GEZIEN. ZELFS NIET DE KAT. `[geschreven op het scherm; geen stem]`
- **Tammo** *(gefluisterd, zacht)*: Dank u, broeder.
- **Broeder Everhard** *(geschreven op een schoolbord)*: HET DAK DANKT U.

**Outro.** *Camera:* De zandweg bij het eerste ochtendgrauw: Tammo loopt naar de Fjord waar Tessa wacht; ze geeft hem een thermosbeker; geen woorden; alleen hun adem. De camera blijft op afstand; boven het bos de eerste vogel.
- **Tessa** *(zacht)*: Drie enveloppen geruild.
- **Tammo** *(droog, zacht)*: Drie keer eerlijk.
- **Tessa** *(zacht, een glimlach)*: Hij merkt het pas bij het ontbijt.
- **Tammo** *(droog, zacht)*: Dan zit hij al aan tafel.

**Bij herhaling:** **Tammo** *(droog, gefluisterd)*: Weer die tuin. Het gras is mijn vriend. **Mislukt:** **Tammo** *(droog, gefluisterd)*: De bel. Ik zweer dat het grind begon. · **Tessa** *(zacht)*: Grind begint nooit. Grind is gewoon grind.

**Berichten:** *U. Oldenhuis*: "Mijn jury heeft slecht geslapen. Dat is vreemd. De bedden zijn nieuw. – U.O." **Kiekdoar:** "Stiltehuis bij Sellingen: collectebus 's nachts onverwacht vol. Beheerder: 'Het dak is gered. Door wie, weten we niet. De kat zegt niks.'"
**Afrondingskaart:** **STIL IN HET KLOOSTER** · Drie enveloppen. Eén collectebus. Eén dak, gered. · *+ € 3000*

**Autogesprek `o29-pass-dak`:** **Tessa** *(amused)*: Een dak. Dat is het enige goede wat Ubbo ooit betaald heeft. · **Tammo** *(dry)*: Zonder het te weten. · **Tessa** *(dry)*: Dat is de beste soort.
**Autogesprek `o29-fail`:** **Tammo** *(whispering, dry)*: Het was lavendel. · **Tessa** *(soft)*: Het is altijd lavendel.

**"Wat weten we?"** *Drie enveloppen* (clue): Ubbo's laatste jury (notaris Rieks, slager Ruurd, Hennie) logeerde in een stiltehuis bij Sellingen. Tammo ruilde hun enveloppen voor Oma's kaartje en een warm pakket. Het geld ging in de collectebus voor het dak.

### O30 · Het beleg

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| groot gevecht (toneel, geen doden) | Westerwolde (Vesting Bourtange) | Tessa | Een hooiberg ten noorden van de vesting (zaterdag, middag) | € 5000 | `O30` / missie `beleg` |

**Wissel:** **Tessa** *(vastberaden)*: Ik leid. Jij zit bij de duiven. Zeg waar het grind begint. · **Lead:** **Berend Bos** *(nors, aan de telefoon)*: Het leger staat klaar. Ik ben de bisschop. Jij bent de generaal. Dat is voor het eerst dat een Stadjer een leger leidt dat ik niet verraad.

**Bel Rikus (beller: Rikus zelf, live)**
- **Rikus** *(warm, plechtig, als nacht-dj op de radio, in het daglicht)*: Nachtstreek, in het daglicht. Ik voel me een vleermuis. Ik sta op de heide ten noorden van Vesting Bourtange. Er zijn kartonnen kanonnen. Ik tel er zeven.
- **Rikus** *(droog, als nacht-dj op de radio)*: De torenwachter belde: "Ik zie een vesting. Er staat een leger voor. Het is Gronings." Hij meldt alleen.
- **Harm** *(gemoedelijk, trots, met een pion)*: De vesting is afgesloten. Laatste fase.
- **Tessa** *(droog)*: Harm. Dit is écht de laatste fase.
- **Harm** *(gemoedelijk, na een pauze, met overtuiging)*: …Ik zeg het nu voor het eerst met overtuiging.

**Route en plekken.** Een hooiberg op de heide ten noorden van **Vesting Bourtange** (krijgsberaad) → de **gracht** met de ophaalbrug aan de noordkant → de glooiing (de "zompige voorzijde": veen) → de vijf **bolwerken** (waarvan er drie genomen worden) → de **poort** en het centrale plein met kerkje, hoofdwacht en kruithuis (namen OSM-check). Wat daar nu staat is museum; voor het spel zijn de gebouwen leeg en de bezoekers weg (Ubbo heeft de vesting afgehuurd: "besloten finale").

**Opzet.** Zeven bondgenoten, vier fronten, één bevelwiel (`command`, NIEUW): Tessa staat op een kleine commandoplek (een hooikar) en geeft per front een teken (E + 1-4); elk front speelt dan een eigen mini-setpiece van ± 15 s, met banter. Wie geraakt wordt door meel of water wordt "wit" of "nat" (trager, geen schade); er bestaat in dit gevecht geen dood. De klok loopt 8 minuten.

**Verloop (vijf aktes, met cutscènes)**
1. **Akte 1: Het krijgsberaad** (cutscène, zie onder): de bondgenoten komen één voor één bij de hooiberg. Berend verdeelt het leger.
2. **Akte 2: De gracht.** Lammert zet de sluis op de Ruiten Aa open (de gracht stijgt zodat de boten onder de brug kunnen); Kapitein Klaas loodst de eerste boten; Fenna leidt de voetsoldaten over het veen ("Zet je voeten waar ik ze zet"); Jelle springt met zijn polsstok en valt erin. Tessa vaart mee in de voorste boot.
3. **Akte 3: De ophaalbrug.** Wubbo bedient de lier: hij opent **te vroeg**. Berend op Münster rijdt de brug over; de verdedigers deinzen terug.
4. **Akte 4: De bolwerken.** Drie bolwerken nemen: **Meel** (Roelfiens gewasspuiter laat een witte wolk vallen), **Duiven** (Bert met veertig duiven op de hoeden van de knechten) en **Kanon** (Tinus' trekker trekt de belegertoren, Durk en Douwe duwen het kartonnen kanon om). Op elk bolwerk plant Tessa de kartonnen vlag.
5. **Akte 5: De poort.** Berend wint. Cutscène.

**Falen, overslaan:** de klok (8 min) loopt af: "Het beleg is mislukt" (het toneel is afgelopen; Berend zit met zijn hoofd in zijn handen). Je kunt niet doodgaan. **Overslaan** na één poging: de vesting is genomen, de poortscène speelt. **Bezit:** niets; de boten, trekker, spuiter en het paard zijn van de bondgenoten.

**Akte 1 · Het krijgsberaad (cutscène).** *Camera:* Een hooiberg op de heide, een grote kaart op een hooikar met bierviltjes als eenheden. De camera maakt een trage cirkel om de tafel terwijl de bondgenoten één voor één in beeld komen: een boot op een aanhanger, een trekker met een torenvormige constructie, een gele gewasspuiter aan de horizon, een limousine met een trekker-motorkap. Heide in bloei rondom. Rikus staat met een microfoon op een hooibaal.
- **Berend Bos** *(nors, plechtig, op Münster)*: Dames en heren. Het beleg van Bourtange. Zestienhonderdtweeënzeventig. Ik verloor. Vandaag niet. `[camera: pan]`
- **Rikus** *(warm, plechtig, live)*: Het is half twee. De zon schijnt. Er is geen schot, geen bloed, geen kogel van ijzer. Alleen karton, meel en water. Zo is het in Grunn.
- **Tessa** *(zakelijk, boven de kaart)*: Vier fronten. Water. Land. Lucht. Brug. Wie waar?
- **Sluiswachter Lammert** *(oud, kalm)*: Ik heb de sleutel van de sluis. Vrij genomen voor het eerst in zestig jaar. Mijn neef houdt de sluis in Delfzijl. Hij meldt alleen.
- **Kapitein Klaas** *(schor, knipogend)*: Een gracht is ook water. Ik vaar ze allemaal. Behalve de zee. Die is te groot voor mijn geduld.
- **Wadgids Fenna** *(kordaat)*: Het veen is net het wad. Je moet de route kennen. Zet je voeten waar ik ze zet. En niet erbij.
- **Jelle Terpstra** *(charmant, opschepperig)*: Jelle springt. Altijd. Met polsstok. Foar mem. *(Jelle springt. Altijd. Met polsstok. Voor mijn moeder.)*
- **Tinus** *(kort, trots)*: Trekker heeft een toren. Hij trekt hem. Zonder motor ging het niet. Met motor wel.
- **Roelfien** *(droog, kordaat)*: Ik vlieg boven. Meel. Zes zakken. Eén keer wit. Daarna sta ik stil.
- **Brugwachter Wubbo** *(gemoedelijk, trots)*: Ik doe de lier van de brug. Te vroeg. Voor één keer. Ik oefen het al vanochtend.
- **Duivenmelker Bert** *(zacht, wijs)*: Veertig duiven. Ze luisteren naar niemand. Behalve naar jongen. Tammo, kom maar.
- **Durk** *(traag, plechtig)*: Wij zijn de stormram. Wij hebben er ook niets tegen.
- **Douwe** *(traag, trots)*: …tegen.
- **Dokter Dijkstra** *(droog, zakelijk)*: Er is vandaag geen gewonde. Het is toneel. Ik sta er toch. Dit stond niet in het rooster, maar het staat er nu.
- **Kosteres Geesje** *(droog, kordaat)*: Ik zie alles vanaf mijn toren. Dit is geen toren. Het is een hooiberg. Ik zie alles toch.
- **Tessa** *(zacht, bijna ontroerd)*: Zeven mensen. Zeven gunsten. Ik weet niet wat ik moet zeggen.
- **Berend Bos** *(nors, kort)*: Zeg: aanvallen. Dat is wat een generaal zegt.
- **Tessa** *(vastberaden)*: Aanvallen.

**Akte 2 · De gracht (in de missie)**
- **Sluiswachter Lammert** *(oud, kalm, via de marifoon)*: Sluis open. Het water komt. Het komt niet snel. Het komt op tijd.
- **Kapitein Klaas** *(schor, via de marifoon)*: Stuurboord, Tessa. Dat is rechts. Dat zeg ik ook tegen mijn boot.
- **Wadgids Fenna** *(kordaat, op het veen)*: Hier. Daar. Niet dáár. Ik zei: niet dáár.
- **Knecht van Ubbo** *(stug, roepend, van de wal)*: Wij houden de gracht! Dat is onze gracht!
- **Tessa** *(strijdlustig, in de voorste boot)*: Hij is van iedereen. Het is een gracht.
- **Jelle Terpstra** *(roepend, in de lucht)*: Oant sjen! *(Tot ziens!)* — *plons*
- **Tessa** *(lachend)*: Jelle ligt in de gracht.
- **Kapitein Klaas** *(schor, grinnikend)*: Hij ligt er elke keer in. Dat is een traditie.

**Akte 3 · De ophaalbrug (in de missie)**
- **Brugwachter Wubbo** *(trots, rustig, via de marifoon)*: Lier. Nu. Te vroeg. Het is gelukt.
- **Tessa** *(verbaasd)*: Hij is open. Voor we toeterden.
- **Brugwachter Wubbo** *(trots, rustig)*: Te vroeg. Dat is ook een soort op tijd. Het is mijn beste dag.
- **Berend Bos** *(nors, roepend, op Münster)*: Voor Münster! Voor het bisdom! Voor het eerst!
- **Knecht van Ubbo** *(stug, verbaasd)*: Dat is een bisschop. Daar mag je niet op schieten. Met karton.

**Akte 4 · De bolwerken (in de missie)**
- **Roelfien** *(droog, kordaat, door de marifoon)*: Boven jullie. Meel komt. Hoofd omlaag.
- **Knecht van Ubbo** *(stug, onder het meel)*: Ik ben wit. Ik ben alweer wit.
- **Tessa** *(lachend)*: Net Sinterklaas.
- **Duivenmelker Bert** *(zacht, wijs, door de marifoon)*: Laat de jongen roepen. Ze komen.
- **Tammo** *(droog, gespannen, door de marifoon)*: Duiven. Links. Op de hoeden. Nu.
- **Knecht van Ubbo** *(stug, geschrokken)*: Er zit een duif op mijn hoed.
- **Durk** *(traag, plechtig, bij het kanon)*: Dat kanon is van karton.
- **Douwe** *(traag)*: …karton.
- **Durk** *(traag, trots)*: Dat is onze specialiteit.
- **Tinus** *(kort, trots, op de trekker)*: Toren trekt. Hij leunt. Hij leunt goed.
- **Kosteres Geesje** *(droog, kordaat, op de hooikar)*: Links. Het derde bolwerk. Ze kijken niet. Ze eten.
- **Tessa** *(snel, plantend)*: Vlag. Vlag. Vlag. Drie.

**Akte 5 · De poort (cutscène).** *Camera:* De poort van de vesting, de ophaalbrug neerwaarts; een lange track achter Berend op Münster naar binnen; de knechten staan op een rij met hun gele petten in hun handen; de camera blijft laag bij het paard en kijkt omhoog naar Berend's gezicht. Dan een brede kraanshot over het plein, de vijf bolwerken met kartonnen vlaggen, de gracht met Jelle die zich eruit hijst.
- **Berend Bos** *(nors, zacht, verbaasd)*: …Het is open.
- **Tessa** *(zacht)*: Het is open, Berend.
- **Berend Bos** *(nors, onzeker)*: Ik heb gewonnen.
- **Tammo** *(droog, zacht)*: U heeft gewonnen.
- **Berend Bos** *(nors, bijna fluisterend)*: Dit is verkeerd.
- **Tessa** *(lachend, ontroerd)*: Dat is winnen, Berend.
- **Berend Bos** *(nors, na een lange pauze)*: Dan is winnen verkeerd.
- **Rikus** *(warm, plechtig, live)*: Grunn. Het is half vier. Het beleg van Bourtange is gewonnen door de belegeraars. Voor het eerst in de geschiedenis. Berend Bos heeft gewonnen. Hij zegt dat het verkeerd voelt. Dat is hoe het hoort.
- **Brugwachter Wubbo** *(trots, rustig, via de marifoon)*: Ik meld alleen: het is te vroeg gelukt. Dat is een record.
- **Harm** *(gemoedelijk, trots, bij een pion)*: Vesting is geopend. Eerste fase.
- **Berend Bos** *(nors, zacht, tegen zichzelf)*: Eindelijk. Eerste fase.
- **Ubbo Oldenhuis** *(joviaal, vanaf de trap van de hoofdwacht, klapt langzaam)*: Mooi gedaan, mevrouw. Mooi gedaan, allemaal. Ik had het niet beter kunnen regisseren. Komt u binnen. Er is een tafel gedekt. Er is een jury. Dit is wat ik wilde. `[camera: close]`
- **Tessa** *(kil, zacht)*: Dat wilde je?
- **Ubbo Oldenhuis** *(vriendelijk)*: Een finale. In mijn vesting. Met iedereen erbij. Dat is de enige manier waarop een Ronde afloopt.

**Bij herhaling:** **Berend Bos** *(nors)*: Weer het beleg? Ik win nog steeds niet graag. Doe maar. **Mislukt:** **Berend Bos** *(nors, hoofd in zijn handen)*: Het is mislukt. Zoals altijd. Ik ben er goed in. · **Tessa** *(zacht)*: Nee, Berend. Nu was het ons.

**Berichten:** *U. Oldenhuis*: "Het beleg. Karton. Meel. Duiven. Dat is geen leger. Dat is een parade. Ik was erbij. – U.O." **Kiekdoar:** "Vesting Bourtange 'genomen' door een leger van karton, meel en duiven. Voor het eerst in 354 jaar wint de belegeraar. Bisschop: 'Dit is verkeerd.' Dokter: 'Er is geen gewonde. Ik sta er toch.'"
**Afrondingskaart:** **HET BELEG** · Zeven bondgenoten. Vijf bolwerken. Nul doden. · *+ € 5000*

**Autogesprek `o30-pass-winnen`:** **Tammo** *(dry)*: "Dan is winnen verkeerd." Dat zegt hij over alles. · **Tessa** *(warm)*: Maar nu zei hij het voor het eerst na een overwinning. · **Tammo** *(dry)*: Dat is het mooiste.
**Autogesprek `o30-pass-zeven`:** **Tessa** *(moved)*: Zeven mensen. Voor Oma. · **Tammo** *(dry, soft)*: Zeventig jaar rente. · **Tessa** *(quiet)*: Ze hebben het allemaal betaald.
**Autogesprek `o30-fail`:** **Tammo** *(dry)*: Acht minuten. Berend zegt dat hij het in zeven had gedaan. · **Tessa** *(dry)*: Hij heeft veertig jaar verloren. Hij weet.

**"Wat weten we?"** *Het beleg van Bourtange* (clue): De vesting is genomen door een leger van karton, meel en duiven. Berend Bos heeft voor het eerst gewonnen. Ubbo wil dat het zo gaat: "Een finale in mijn vesting, met iedereen erbij." · *Zeven gunsten* (hart): Geesje, Lammert, Fenna, Jelle, Tinus, Roelfien, Wubbo. Zeventig jaar rente, in één middag afbetaald.

### O31 · De laatste ronde

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| bakken + achtervolging (drie stukken, zoals H18) | Westerwolde | Tammo, met een wissel naar Tessa | De hoofdwacht op het plein van Vesting Bourtange (zaterdag, laat in de middag) | € 6000 | `O31` / missie `laatste` |

**Wissel:** **Tammo** *(droog, zacht)*: Ik bak. Daar ben ik goed in. De rest is aan jou. · **Lead:** **Tessa** *(zacht, aan de telefoon)*: Het is zover. Het laatste bord. Eén jury. Eén bal. Ubbo zit op het podium. Ik zit naast je.

**Bel Rikus (beller: Oma Trijntje, in de vesting)**
- **Rikus** *(warm, plechtig, als nacht-dj op de radio, live)*: Nachtstreek, in het daglicht, het laatste uur. Aan de lijn: een dame van tweeënnegentig, uit een limousine met een motorkap van een trekker.
- **Oma Trijntje** *(droog, stellig, aan de telefoon op de radio)*: Rikus. Trijntje. Ik ben er. Ik zit in de schaduw. Het is warm. Het is een goede dag.
- **Rikus** *(warm, als nacht-dj op de radio)*: En de eierbal?
- **Oma Trijntje** *(droog, liefdevol, aan de telefoon op de radio)*: Die is van mijn kleinzoon. Die is van mijn kleinzoon en zijn vriendin. Dat is nog beter.

**Route en plekken.** De hoofdwacht en het plein van **Vesting Bourtange** (jurytafel op het plein; de keuken in een oude vestingbakkerij, fictief) → de ophaalbrug uit → de **heide en het veen ten oosten van de vesting** (zandwegen, veenwegen, hoogspanningslijn) → een verlaten laadplaats van een heli (fictief) → het **grensbord** bij het Bourtangermoor (OSM-check; grensovergang bij Rütenbrock).

**Verloop (drie stukken)**
1. **De kraam: bakken** (Tammo, `bake`, NIEUW): drie rondes van 70 s in de vestingbakkerij. Zeven ingrediënten, één van elke regio: kerkland-paneermeel (Hogeland), zeezout (Eemsdelta), de Wadkust- en Westerkwartier-ingrediënten uit F4b (ingevuld door F4b), gerstemout (Oldambt), aardappelzetmeel (Veenkoloniën) en heidehoning in de mosterd (Westerwolde: Siemens bijen). De jury proeft in de tweede ronde.
2. **De proeverij** (scène): Oldenhuis Bakt gaat eerst; dan de Fjord. Oma spreekt. Ubbo grijpt de Gouden Eierbal en vlucht.
3. **De achtervolging (wissel naar Tessa):** over de heide en het veen, achter Ubbo's gouden terreinwagen met twee quads aan; de eierballen in de Fjord moeten warm blijven (`warm`-meter; remmen voor eieren); Henk belt: de zender onder Ubbo's bumper geeft de stip op de kaart. 
4. **De duiven (wissel naar Tammo):** bij de heli-plek stuurt Tammo met Bert's duiven een zwerm voor de voorruit van Ubbo's heli: de piloot kan niets zien en landt zacht (duiven blijven heel; ze zijn "onder de indruk"). `pigeon`-stage.
5. **Het grensbord (wissel naar Tessa):** Siemens pick-up blokkeert de laatste weg; Ubbo loopt met de bal naar het bord. Scène.
6. **Terug naar de vesting:** de prijsuitreiking (outro).

**Falen, overslaan:** bakken: de eierballen verbranden (rondes mislukt = jury krijgt ze koud: dat is minder, geen fail; drie keer mislukt = fail). Achtervolging: Ubbo > 400 m weg; de `warm`-meter op nul (de Fjord-eierballen worden koud: de proeverij is dan al geweest, dus minder erg: de vraag is alleen of Ubbo bij het bord komt). Duiven: de heli stijgt op (45 s). **Overslaan** na één poging: Ubbo staat bij het bord, de bal in zijn hand; de scène en de uitreiking spelen. **Bezit:** niets; de Fjord is van jou, de quads van de knechten.

**Intro: de proeverij (cutscène).** *Camera:* Het plein van de vesting in het late licht: een lange tafel met wit kleed, vijf stoelen met namen; in het midden, onder een glazen stolp, de Gouden Eierbal, naast een bordje "Bruikleen, Groninger Museum". Een trage cirkel om de tafel. De jury komt zitten: Lammert, Berend (nog in zijn mantel), Siemen, en een stoel die leeg blijft. Een limousine met trekkermotorkap rijdt het plein op; Durk en Douwe helpen Oma Trijntje uit de auto; Geesje draagt haar tas.
- **Kosteres Geesje** *(droog, zacht, draagt een schooltas)*: Ik draag. Dat doen wij. `[camera: close]`
- **Oma Trijntje** *(droog, stellig)*: Die tas is van 1953.
- **Kosteres Geesje** *(droog, zacht)*: Ik heb hem bewaard. Er zit een eierbalrecept in. In jouw handschrift. Je vergat hem in de klas.
- **Oma Trijntje** *(zacht, dan stellig)*: Dat is… niet waar.
- **Kosteres Geesje** *(droog, warm)*: Wel waar. Nu draag ik wat terug. Ik weet nu wat. Dat weet je dan.
- **Ubbo Oldenhuis** *(joviaal, vanaf het podium)*: Welkom, mevrouwen en heren, bij de finale van de Ommelander Ronde! Voorzitter van de jury, de oudste in het gezelschap: mevrouw Trijntje. `[camera: wide]`
- **Oma Trijntje** *(droog, oud)*: Dat hoor ik voor het eerst. Dank je. Ik had het zelf nooit gedacht.
- **Sluiswachter Lammert** *(oud, kalm, zacht, kijkend)*: Trijntje. Je bent er.
- **Oma Trijntje** *(droog, zacht, even)*: Lammert. Je bent er ook.
- **Sluiswachter Lammert** *(oud, droog)*: Ik heb mijn dansschoenen bij me. Ik bewaar ze nog.
- **Oma Trijntje** *(droog, stellig, zacht)*: Dat is vroeg. Eerst proeven.

**HUD-doelen (stuk 1):** "Bak in de vestingbakkerij (3 rondes)" → "Serveer de jury"

**Stuk 1 · Bakken (in de missie)**
- **Tessa** *(gehaast, naast hem)*: Eerste ronde. Kerkland-paneermeel. Zeezout. Hou de olie op temperatuur.
- **Tammo** *(droog, geconcentreerd)*: Ik doe alles tegelijk. Zo kan ik het.
- **Tessa** *(snel)*: Tweede ronde. Mout, zetmeel. De korst moet kraken.
- **Tammo** *(droog, gespannen)*: Hij kraakt. Dat is goed. Dat is Veendam.
- **Tessa** *(snel, zacht)*: Derde. Heidehoning in de mosterd. Zeven ingrediënten. Eén bal.
- **Tammo** *(droog, zacht, even stil)*: Eén bal. Voor Oma.

**Stuk 2 · De proeverij (scène).** *Camera:* Op het plein; het bord met Ubbo's snackbar-ballen op een gele schaal komt eerst; de camera laat de gezichten één voor één passeren. Dan wordt een bordje met één eierbal van de Fjord voor Oma gezet; de camera blijft lang op haar handen, die trillen, en dan op haar gezicht.
- **Ubbo Oldenhuis** *(joviaal, trots, wijzend)*: Oldenhuis Bakt. Eenenveertig snackbars. Eén recept. Probeer.
- **Boswachter Siemen** *(rustig, kort, proevend)*: Ow.
- **Sluiswachter Lammert** *(oud, droog, proevend)*: Ow.
- **Berend Bos** *(nors, proevend)*: Ow. Hoorde u dat? Ow.
- **Oma Trijntje** *(droog, oud, proevend)*: Ow.
- **Ubbo Oldenhuis** *(joviaal, een tikje onzeker)*: Dat is vier keer Ow. Dat is veel Ow.
- **Rikus** *(droog, plechtig, live)*: Ow is de eerste trede, Ubbo. Daar sta je. Je staat er goed.
- **Tessa** *(zacht, zet het bordje voor Oma)*: Oma. De Fjord.
- **Oma Trijntje** *(zacht, een hap)*: …
- **Boswachter Siemen** *(rustig, kort, proevend)*: Braid noar de zin. *(Helemaal tevreden.)*
- **Sluiswachter Lammert** *(oud, plechtig, zacht, proevend)*: Kon minder. Ik heb dat bewaard, Trijntje. Zeventig jaar. Voor jou.
- **Berend Bos** *(nors, kauwend, een tel stil)*: …
- **Berend Bos** *(nors, hees)*: …
- **Rikus** *(zacht, plechtig, live)*: Berend Bos zegt niks. Dat is de hoogste trede. Dat is een kloet in de strotte.
- **Oma Trijntje** *(stil, een lange pauze)*: …
- **Oma Trijntje** *(droog, oud, haar stem breekt, dan stellig)*: Dit is 1953. Dit is mijn eierbal. Die van toen.
- **Oma Trijntje** *(stellig, tegen Ubbo)*: Weet je wat dat betekent? Dat hij toen ook beter was. Dat jouw opa het wist.
- **Ubbo Oldenhuis** *(joviaal, verstijfd)*: Dat is een beschuldiging.
- **Tessa** *(kil, zacht, legt een telefoon neer)*: Het is een vel papier. "Eigen kar: 10. Trijntje: 6." Met een kilo paling per jurylid.
- **Sluiswachter Lammert** *(oud, droog)*: Mijn broer was een van die juryleden. Hij heeft die paling nooit opgegeten. Hij werd zeeziek van het idee.
- **Ubbo Oldenhuis** *(stil, kil)*: …
- **Ubbo Oldenhuis** *(snel, zacht)*: Dan is dit voorbij.
- **Ubbo Oldenhuis** *(snel, grijpt de stolp)*: Dan is de bal van de sponsor.
- **Tammo** *(droog, scherp)*: Ubbo.
- **Ubbo Oldenhuis** *(snel, rent met de Gouden Eierbal)*: Vergunning verlopen, jongens! Dat is geen kwestie van willen! Dat is papier! `[camera: track]`

**Stuk 3 · De achtervolging, wissel naar Tessa (in de missie)**
- **Tammo** *(gehaast, bij de vestingpoort)*: Hij heeft een terreinwagen. Goud. Twee quads erachter. Ik zie het stofspoor. Naar het oosten.
- **Tessa** *(vastberaden, achter het stuur)*: Ik ben al weg.
- **Henk** *(gemoedelijk, aan de telefoon)*: Moi. Henk. Hij liet zijn auto bij mij nakijken. In Stad. Voor de Ronde. Ik heb alleen even onder zijn bumper gekeken.
- **Tessa** *(snel, aan de telefoon)*: Henk!
- **Henk** *(gemoedelijk, wetend, aan de telefoon)*: Ik vraag niet waarom. Er zit een schroefje. Eentje. Ik zie hem. Hij gaat naar het oosten. De heide op.
- **Tessa** *(vastberaden)*: Dank, Henk. Zeg het niet tegen de baas.
- **Henk** *(gemoedelijk)*: Die baas zit er al niet meer.
- **Tessa** *(gespannen)*: Eerst de eierballen. Ze mogen niet afkoelen. Zacht remmen.
- **Tammo** *(droog, aan de telefoon)*: Remmen voor eieren. Daar ben ik beroemd om.
- **Tessa** *(scherp)*: Niet nu, Tammo. Ik doe het zelf.
- **Wolvenman Gerrit** *(fluisterend, vanuit de heide, aan de telefoon)* `[alleen als Z17-Z19 gespeeld]`: Gerrit. Wolvenman. Ik heb een sporenlijn. Hij loopt naar het oosten. Bor wijst de andere kant op. Ik ga mee met Bor.
- **Tessa** *(snel)*: Dank, Gerrit.

**Stuk 4 · De duiven, wissel naar Tammo (in de missie)**
- **Tessa** *(gespannen, via de marifoon)*: Hij is bij de heli. Hij zit er al in. Tammo!
- **Duivenmelker Bert** *(zacht, wijs, bij de vestingmuur)*: Kom, jongen. Fluit maar. Ze staan klaar.
- **Tammo** *(droog, de ogen dicht, fluitend)*: …Ik fluit. De duif pikt.
- **Tammo** *(droog, geconcentreerd)*: Voor de voorruit. Alle veertig. Zacht.
- **Ubbo's piloot** *(roepend, vanuit de heli)*: Ik zie niks! Er zit een duif op mijn bril!
- **Tammo** *(droog, zacht, met een kleine glimlach)*: Ze willen alleen even zitten.
- **Duivenmelker Bert** *(zacht, wijs)*: Ze luisteren naar niemand. Alleen naar jou. Dat is de gave. Gebruik haar mooi.
- **Tammo** *(droog, zacht)*: Landen. Rustig. Het is maar een grasveld.
- **Ubbo's piloot** *(roepend, opgelucht)*: Ik land! Ik land! Hij staat!

**Stuk 5 · Het grensbord, wissel naar Tessa (scène).** *Camera:* Een smalle veenweg die doodloopt op een blauw bord met sterren en een witte streep; de Fjord stopt achter een boswachtersauto; vlak voor de streep staat Ubbo, de Gouden Eierbal in beide handen, ademloos; aan de ene kant een Nederlandse agent in blauw, aan de andere een Duitse in groen, een thermoskan tussen hen. De camera blijft op een hoogte van de bal, de zon laag erachter.
- **Grenswacht** *(kortaf, onverbiddelijk)*: Hier houdt het op. Voor mij.
- **Grenzwächter** *(kortaf, vriendelijk)*: Hier hört es auf. Für mich auch. *(Hier houdt het op. Voor mij ook.)*
- **Ubbo Oldenhuis** *(buiten adem, joviaal, uit gewoonte)*: Ik heb papieren, meneer. Ik heb altijd papieren.
- **Grenswacht** *(droog, vriendelijk)*: Voor u. Niet voor de bal. Uitvoervergunning ontbreekt. Dat is geen kwestie van willen. Dat is papier.
- **Ubbo Oldenhuis** *(stil, een bittere lach)*: Mijn eigen zin.
- **Grenzwächter** *(vriendelijk, aan de overkant)*: Wollen Sie einen Kaffee? *(Wilt u koffie?)*
- **Ubbo Oldenhuis** *(stil)*: …Graag.
- **Tessa** *(zacht, uit de Fjord stappend)*: Ubbo.
- **Ubbo Oldenhuis** *(stil, zonder om te kijken)*: Meisje. Je hebt de bal geroken. Hij is warm.
- **Tessa** *(zacht)*: Ja. Het is een Fjord-eierbal. Hij blijft warm.
- **Ubbo Oldenhuis** *(stil, de bal in zijn handen)*: Mijn opa wist het. Een jury is een stoel. Wie erop zit, wint. Hij zat op een kar en op een stoel tegelijk.
- **Ubbo Oldenhuis** *(stil, eerlijk)*: Ik heb zijn medaille op mijn bureau. Elke ochtend kijk ik ernaar. Ik was zes toen ik hoorde hoe hij hem kreeg. Hij lachte erom. Ik niet.
- **Ubbo Oldenhuis** *(zacht, kijkt naar de bal)*: Ik heb eenenveertig snackbars gebouwd, zodat niemand ooit meer zou proeven wat wij niet konden.
- **Tessa** *(zacht, verbaasd)*: Jij kunt wél bakken.
- **Ubbo Oldenhuis** *(zacht, een kleine lach)*: Nee. Ik ben nooit verder gekomen dan Ow.
- **Tammo** *(droog, zacht, komt naast haar staan, hijgend, met een bordje)*: Proef.
- **Ubbo Oldenhuis** *(stil)*: Wat?
- **Tammo** *(droog, zacht)*: Gewoon. Eén keer. Zonder jury.
- **Ubbo Oldenhuis** *(stil, een hap, een lange pauze)*: …
- **Ubbo Oldenhuis** *(zacht, hees)*: Ow.
- **Ubbo Oldenhuis** *(zacht, na een stilte)*: Dat is hetzelfde Ow. Maar het is niet hetzelfde.
- **Tessa** *(zacht, een glimlach)*: Dat is de eerste trede, Ubbo.
- **Ubbo Oldenhuis** *(zacht, kijkt naar de grens)*: Mijn vergunning voor de Vismarkt. Die ligt in mijn kantoor.
- **Tessa** *(zacht, scherp)*: Die liep af op één september. Dat is geen kwestie van willen. Dat is papier.
- **Ubbo Oldenhuis** *(zacht, een halve lach)*: …Dat zeg ik altijd.
- **Ubbo Oldenhuis** *(zacht, geeft de Gouden Eierbal aan Tessa)*: Hier. Hij is niet van mij. Hij was nooit van ons.
- **Grenswacht** *(droog, vriendelijk)*: Meneer Oldenhuis. Ik moet u meenemen. Voor het uitvoeren van cultuurgoed zonder vergunning. En een paar vragen over enveloppen.
- **Ubbo Oldenhuis** *(zacht, glimlachend)*: Dat is correct. Dat is papier.
- **Grenzwächter** *(vriendelijk, aan de overkant, rustig)*: Er bekommt Kaffee. Wir passen auf. *(Hij krijgt koffie. Wij letten op hem.)*

**Outro: de prijsuitreiking (cutscène).** *Camera:* Het plein van de vesting in het gouden uur: honderden schaduwen, een tafel met de Gouden Eierbal in het midden, Oma Trijntje in een stoel, Lammert naast haar met zijn dansschoenen in de hand. Een lange, langzame kraanshot over de bolwerken met de kartonnen vlaggen en de bomen; dan een close op Oma's handen. Op de achtergrond komt Ubbo, geëscorteerd, terug om iets te zeggen.
- **Rikus** *(warm, plechtig, live)*: Nachtstreek, in het daglicht, de laatste minuut van de laatste uitzending van de zomer. Er staat een bal op een tafel. Iemand draagt een medaille.
- **Ubbo Oldenhuis** *(zacht, geëscorteerd, met een gouden medaille in zijn hand)*: Mevrouw Trijntje. Dit is van mijn opa. Eerste prijs. Hij is niet van ons. Dat was hij nooit.
- **Oma Trijntje** *(stil, een lange pauze, dan droog, oud)*: Ik hang hem naast de andere. Aan het spiegeltje van die frietwagen. Dan heeft Hendrik een plek. Achterin.
- **Ubbo Oldenhuis** *(zacht, bijna glimlachend)*: Dat is een goede plek.
- **Kosteres Geesje** *(droog, kordaat)*: Ik heb hem gedragen. De tas. Dat is nu af.
- **Sluiswachter Lammert** *(oud, kalm, houdt zijn hand uit)*: Trijntje. Mag ik?
- **Oma Trijntje** *(droog, een kleine glimlach)*: Je hebt zeventig jaar gewacht. Je mag.
- **Sluiswachter Lammert** *(oud, zacht, zet zijn dansschoenen aan)*: Ik schuif niet meer. Ik dans.
- **Oma Trijntje** *(zacht, een lach, staat op met hulp van Geesje)*: Langzaam. Met de voeten op de grond.
- **Tammo** *(zacht, droog, tegen Tessa)*: Ze dansen.
- **Tessa** *(zacht, een traan)*: Ze dansen. Langzaam.
- **Rikus** *(zacht, plechtig, live)*: Lammert en Trijntje dansen. Op een plein, in een vesting. Het duurt twee minuten. Het is het mooiste wat ik dit jaar gezien heb. Ik zeg niks. Ik draai strijkers.
- **Berend Bos** *(nors, zacht, zijn hand voor zijn mond)*: Kon minder.
- **Brugwachter Wubbo** *(trots, rustig)*: Het is te vroeg gelukt. Maar het is precies op tijd gebeurd.
- **Harm-Jan** *(opgewonden, zacht, vanuit de menigte)* `[alleen zonder Z4]`: Ik graaf niet. Ik piep. Hij hing al aan haar jas, dacht ik. Het is de medaille. `[naamkaart: harmjan]`
- **Tessa** *(zacht, aan de rand van de dans, tegen Tammo)*: Het is af, hè?
- **Tammo** *(droog, zacht)*: Bijna.
- **Tessa** *(zacht)*: Wat is er nog?
- **Tammo** *(droog, zacht)*: Thuis.

**Bij herhaling:** **Oma Trijntje** *(droog)*: Weer de finale? Ik ben tweeënnegentig. Ik heb tijd. Kom maar. **Mislukt:** **Tessa** *(ontdaan)*: Hij haalde het bord. De bal is de grens over. · **Tammo** *(droog, zacht)*: Dan halen we hem terug. Het bord kan dat niet verbieden.

**Berichten:** *U. Oldenhuis*: "Ik heb geen telefoon meer. Dit is een bericht van de agent. Hij zegt dat ik 'proef' moet schrijven. Proef. – U.O." · *Mem Terpstra*: "Foar myn jonge. En foar Trijntje. Ik kom nog wel op bezoek. – M." *(Voor mijn jongen. En voor Trijntje.)* **Kiekdoar:** "Gouden Eierbal onderschept op de grens bij Bourtange. Patatbaron aangehouden voor uitvoer zonder vergunning. Grenswacht: 'Wij zijn voor de lijn.'"
**Afrondingskaart:** **DE LAATSTE RONDE** · Zeven van zeven. Eén bal, thuis. Eén dans. · *+ € 6000*

**Autogesprek `o31-pass-ow`:** **Tammo** *(dry)*: Ubbo zei Ow. · **Tessa** *(warm)*: Hij zei het alsof hij het voor het eerst hoorde. · **Tammo** *(dry, soft)*: Dat is hoe het begint.
**Autogesprek `o31-pass-dans`:** **Tessa** *(soft)*: Ze danste. Langzaam. Met de voeten op de grond. · **Tammo** *(dry, quiet)*: Ik wil niet weten wat ik daarbij voel. · **Tessa** *(teasing, warm)*: Dat is wat jij voelt, Tammo.
**Autogesprek `o31-fail`:** **Tessa** *(frustrated)*: Hij haalde het bord. · **Tammo** *(dry)*: Een grens is een lijn. Je moest alleen eerder zijn.

**"Wat weten we?"** *De laatste ronde* (hart): Oma's eierbal was in 1953 beter. De jury zat vol paling. Ubbo gaf toe dat hij nooit verder kwam dan "Ow". Zijn opa's medaille hangt nu aan het spiegeltje van de Fjord, achterin. · *Zeven van zeven* (clue): De Gouden Eierbal is terug. Ubbo is aangehouden voor uitvoer zonder vergunning en voor de enveloppen. "Dat is papier."

### Tussendoor: Een boshut (`n-boshut`)

Speler: Tessa. Doel: `{ type: 'filiaal', at: 'westerwolde' }` (safehouse: de boshut; filiaal zeven: Siemens kiosk aan de bosrand). Korte scène, direct na O31, vóór de colonne.
**Wissel:** **Tessa** *(zacht, warm)*: Ik pak de sleutel. Jij pakt het deksel van de thermoszak. · **Lead:** **Boswachter Siemen** *(rustig, kort, aan de telefoon)*: Er staat een hut bij het bos. Er kan een luik in. Ik ben boswachter. Ik hou van luiken die er niet te zien zijn.
**Scène: De boshut.** *Camera:* Een houten hut tussen dennen in het gouden uur; trage dolly door de open deur naar twee stoelen en een tafel met een bord; buiten gaat de zon onder boven de heide.
- **Boswachter Siemen** *(rustig, kort, warm)*: Dit is het. De hut. Er is hout voor de kachel. Maar het is zomer.
- **Tessa** *(zacht, glimlachend)*: Filiaal zeven.
- **Tammo** *(droog, zacht)*: Zeven van zeven.
- **Boswachter Siemen** *(rustig, droog)*: Zeven is een mooi getal. Ik heb het nooit verteld.
- **Tessa** *(zacht)*: De Westerwoldse eierbal. Met heidehoning.
- **Boswachter Siemen** *(rustig, kort)*: De bijen vinden het goed.
**Klaar:** **Tessa** *(warm)*: Filiaal zeven: de bosrand bij Sellingen. Siemen bakt niet. Hij kijkt toe. Dat is zijn manier. · **HUD:** "Filiaal geopend: de boshut (Siemen)" · "Safehouse: de boshut, met een kachel die niemand nodig heeft" · "Nieuw recept: de Westerwoldse eierbal, met heidehoning in de mosterd" · *Idee voor later: een paard bij de hut.*

### O32 · Thuis

| Type | Regio | Speler | Start | Beloning | Code |
|---|---|---|---|---|---|
| verhaal, rijden (colonne) | Westerwolde → Veenkoloniën → Stad | Tessa | Het plein van Vesting Bourtange (gouden uur, zaterdag) | € 2000 | `O32` / missie `thuis` |

**Wissel:** **Tessa** *(zacht, glimlachend)*: Ik rij. Jij zit naast me. Dat is hoe het hoort. · **Lead:** **Oma Trijntje** *(stellig, aan de telefoon)*: Het is tijd, jongens. Ik wil naar huis. En ik wil niet alleen.

**Bel Rikus (beller: de torenwachter, d'Olle Grieze)**
- **Rikus** *(warm, als nacht-dj op de radio)*: Nachtstreek, de laatste rit. De torenwachter belt.
- **Torenwachter** *(oud, droog, onverstoorbaar, aan de telefoon op de radio)*: Rikus. Torenwachter. Ik zie een colonne. Hij komt uit het oosten. Hij is lang. Hij heeft een frietwagen voorop.
- **Rikus** *(droog, als nacht-dj op de radio)*: En?
- **Torenwachter** *(oud, droog, onverstoorbaar, aan de telefoon op de radio)*: Ik meld alleen. Ik ben blij.

**Route en plekken.** Het plein van **Vesting Bourtange** → **Vlagtwedde** → de N-weg naar **Stadskanaal** (Dries blaast de fluit van de loc op het museumspoor) → **Veendam** (Wubbo opent één brug, niet te laat) → de A7 bij **Zuidbroek** (Roelfiens combines in de berm) → **Hoogezand-Sappemeer** (langs huizen met steigers: de colonne rijdt stil, niemand toetert) → Stad: de **Vismarkt**. De colonne is ± 6 minuten rijden, in een vrij tempo; je kunt toeteren (H) behalve bij de steigers en de dorpskerken.

**Verloop**
1. **Scène op het plein** (zie onder): wie rijdt in welke auto; Tammo's nieuwe woorden (het zijn er zes, zegt Tessa).
2. **Rij de colonne** (`convoy`, NIEUW): je rijdt voorop in de Fjord Frituur; achter je: de limousine met Oma, Durk, Douwe en Jelle; Roelfiens pick-up; Tinus' trekker; Lammerts bootje op een aanhanger; Wubbo's stationwagen; Eppo's combine achteraan ("Ow"); de rest komt op de weg erbij. Geen tijdslimiet, geen schade, geen politie. De beloning is het uitzicht.
3. **Cameospots** onderweg (zie onder): iedereen zwaait.
4. **Hoogezand-Sappemeer: de steigers.** De radio zwijgt; de camera blijft laag; niemand toetert.
5. **De Vismarkt:** de rij staat er nog (de oude rij uit O1). Slotscène.

**Falen, overslaan:** niet te falen. **Overslaan:** Spatie houdt de colonne in tijdsverloop; de slotscène speelt altijd. **Bezit:** niets nieuws; de Fjord is van jou.

**Scène: Het plein van de vesting (voor vertrek).** *Camera:* De zon laag achter de bolwerken, een lange rij auto's op de ophaalbrug; een lage cirkel om Tessa en Tammo bij de Fjord; Oma wordt in de limousine geholpen door Durk en Douwe, Jelle houdt het portier met een plechtig gezicht.
- **Tessa** *(zacht, bij de Fjord)*: Tammo. We hebben het nog niet beantwoord.
- **Tammo** *(droog, zacht)*: Groeien of thuis.
- **Tessa** *(zacht, eerlijk)*: Ik wil Fjord Frituren in de dorpen waar iemand het lekker vindt. Niet eenenveertig. Zeven. Door mensen die zij zelf zijn.
- **Tammo** *(droog, zacht)*: Fjord & Familie.
- **Tessa** *(zacht, verrast)*: Hoe heet dat?
- **Tammo** *(droog, zacht)*: Zo heet het. Ik heb het bedacht. Op de fiets.
- **Tessa** *(zacht, een lach)*: En jij?
- **Tammo** *(droog, kort, stellig)*: Thuis is waar de kar staat.
- **Tessa** *(zacht, telt op haar vingers)*: Thuis. Is. Waar. De. Kar. Staat. Zes.
- **Tammo** *(droog, zacht)*: Kon minder.
- **Tessa** *(lachend, zacht)*: Kon veel minder.
- **Tammo** *(droog, zacht, even)*: Eén kar. Op de Vismarkt. En één keer per zomer rijdt hij een ronde. Door alle zeven. Dat is ook thuis. Dan heb ik het verplaatst.
- **Tessa** *(zacht, kijkt hem aan)*: Je wilt dat de kar rijdt.
- **Tammo** *(droog, zacht)*: Ik wil dat hij terugkomt.
- **Tessa** *(zacht, glimlachend)*: Dat is een ronde.
- **Tammo** *(droog, zacht, een glimlach)*: Dat is een ronde.

**Cameospots onderweg**
- **Vlagtwedde:** **Boswachter Siemen** *(rustig, kort, zwaaiend vanaf de bosrand)*: Ik meld alleen: ik ben blij. · **Wolvenman Gerrit** *(fluisterend, vanuit de heide, zwaaiend)* `[alleen als Z17-Z19 gespeeld]`: Ik heb ze gezien. Ze rijden mooi.
- **Stadskanaal:** **Machinist Dries** *(schor, droog, op de loc, trekt aan de fluit)*: Dat was voor de stoker. Rijd door.
- **Veendam:** **Brugwachter Wubbo** *(trots, rustig, op zijn brug)*: Eén brug open, voor de colonne. Op tijd. Ik heb dat nooit eerder gedaan.
- **A7 bij Zuidbroek:** **Roelfien** *(droog, kordaat, van haar combine)*: Rente betaald. Een beetje extra. Voor de boterham. · **Eppo Bolt** *(luid, grinnikend, achteraan op zijn combine)*: Ow. Ik rij mee. Ik ben grondig.
- **Hoogezand-Sappemeer (de steigers):** *geen stem.* Alleen de motor, het geluid van banden op asfalt, en één hand die zacht zwaait vanuit een raam.
- **Onderweg over de weilanden:** **Koe Aaltje** *(droog, vlak, vanaf een wei)*: Ze rijden langzaam. Dat is verstandig. · **Koe Grietje** *(wijs, droog)*: Ze hebben iets goeds gedaan. Dat zie je aan de snelheid.

**Telefoon: Mem Terpstra**
- **Mem Terpstra** *(warm, stellig, aan de telefoon)*: Tessa. Famke. Ik hoor dat jullie thuiskomen. Ik hoor ook dat Durk en Douwe weer eten. Net fertelle. *(Ik hoor dat jullie thuiskomen. Ik hoor ook dat Durk en Douwe weer eten. Niet doorvertellen.)*
- **Tessa** *(warm, aan de telefoon)*: Mem. Dank u.
- **Mem Terpstra** *(warm, stellig, aan de telefoon)*: Ik heb mijn bakkerij terug. De baas zit niet meer in zijn fabriek. Dat is een goeie dag.

**Telefoon: Jelle Terpstra**
- **Jelle Terpstra** *(zacht, charmant, aan de telefoon)*: Grinzers. Durk en Douwe zitten weer bij mem aan tafel. Ze eten. Ze zeggen niks. Moai.
- **Tammo** *(droog, aan de telefoon)*: Je klinkt blij.
- **Jelle Terpstra** *(zacht, eerlijk, aan de telefoon)*: Het is stil. Maar het is een goeie stilte. Tige tank. *(Heel erg bedankt.)*

**Slotscène: De Vismarkt.** *Camera:* De Vismarkt in het laatste zomerlicht; een lange rij mensen, nog steeds tot aan de Korenbeurs; de oude rij uit O1, zonder kraam, die elke dag is blijven komen. De Fjord Frituur rijdt langzaam voorbij de rij; de camera glijdt mee langs de gezichten, dan op de gemeente-bode die een kleurloos bordje van de Oldenhuis Bakt-kraam haalt. Een tijdelijke stilte; dan gaat het luik open.
- **Rikus** *(warm, plechtig, live)*: Dames en heren. De gemeente belt. De vergunning van Oldenhuis Bakt is vervallen. Er mist een papier: een Verklaring omtrent Gedrag. Er is geen kwestie van willen. Dat is papier.
- **Rikus** *(droog, als nacht-dj op de radio)*: De plek is vrij. Er staat een frietwagen te wachten. Die rijdt nu.
- **Menigte** *(juichend, door elkaar)*: Fjord! Fjord! Fjord!
- **Tammo** *(droog, zacht, naast Tessa, kijkend naar de rij)*: Ze zijn gebleven.
- **Tessa** *(zacht, ontroerd)*: Elke dag.
- **Tammo** *(droog, zacht)*: Dat is thuis.
- **Tessa** *(zacht, een lach)*: Dat is zes woorden.
- **Tammo** *(droog, zacht, een glimlach)*: Ik heb er nog meer. Maar niet vandaag.
- **Tessa** *(zacht, legt haar hand op de zijne)*: Bewaar ze.
- **Rikus** *(zacht, plechtig, live)*: De laatste zomeravond. De zon gaat onder boven de Vismarkt. Ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft betaald. Dat is nieuw.

**Bij herhaling:** **Rikus** *(droog, als nacht-dj op de radio)*: Weer de colonne? Ik zit al in de auto. **Mislukt:** (kan niet).

**Berichten:** *Oma Trijntje*: "Goed gedaan. Ik slaap nu. – Oma." · *Mem Terpstra*: "Foar myn jonges. – M." *(Voor mijn jongens.)* **Kiekdoar:** "Colonne van tweeëndertig voertuigen rijdt door vier regio's naar de Vismarkt. Politie: 'Wij zijn alleen komen kijken.' Gemeente: 'De vergunning is weer van de Fjord Frituur. Het was een formaliteit.'"
**Afrondingskaart:** **THUIS** · Eén kar. Zeven filialen. Eén ronde per zomer. · *+ € 2000*

**Autogesprek `o32-pass-zes`:** **Tessa** *(teasing)*: "Thuis is waar de kar staat." Dat is zes woorden. · **Tammo** *(dry)*: Dat telde je met je vingers. · **Tessa** *(warm)*: Ik tel altijd mee.
**Autogesprek `o32-pass-ronde`:** **Tammo** *(dry, soft)*: Eén ronde per zomer. Dat is een soort thuis. · **Tessa** *(warm)*: Dat is een soort groei. · **Tammo** *(dry)*: Dan zijn we allebei klaar.

**"Wat weten we?"** *Thuis* (hart): Tammo: "Thuis is waar de kar staat." Tessa telde zes. Eén kar op de Vismarkt, zeven filialen onder de naam Fjord & Familie, en één ronde per zomer door de hele provincie. Allebei hebben ze hun zin.

### Het einde van Deel 4: epiloog, credits en wat daarna komt

Direct na de slotscène van O32 speelt de **epiloog** (zelfde vorm als het slot van Deel 3), met de kaart `PARTS.nazomer.card` als eindkaart (`end: 'Einde van Deel 4'`, `finale: true`):

- **Rikus** *(warm, als nacht-dj op de radio, vanuit de studio, nacht)*: Moi. Nachtstreek. Ik zei in augustus dat het het laatste kwartier was. Dat was een misrekening. Het was het eerste.
- **Rikus** *(droog, als nacht-dj op de radio)*: De Gouden Eierbal staat in het museum. Het bordje heeft drie namen. De derde is van een mevrouw van tweeënnegentig, eerste prijs, Ommelander Ronde, 1953. Ze kwam er zeventig jaar te laat. Op tijd.
- **Rikus** *(droog, als nacht-dj op de radio)*: Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt nog tot de Korenbeurs. Hij is vandaag ook gebleven.
- **Rikus** *(droog, als nacht-dj op de radio)*: De torenwachter belde: "De rij is lang. Ik meld alleen." En: "Het is zomer." Hij zei het twee keer.
- **Rikus** *(plagend, als nacht-dj op de radio)*: Berend Bos stuurde een brief. Hij wil volgend jaar niet meer verliezen. Hij heeft het niet over winnen. Hij wil gewoon niet.
- **Rikus** *(droog, als nacht-dj op de radio)*: De peiling "Groeien of thuis": uitslag. Groeien, 50. Thuis, 50. Eén luisteraar in Paddepoel heeft niet gestemd. Ik zeg niks.
- **Rikus** *(zacht, als nacht-dj op de radio)*: En ik heb de tweede friet. Hij heeft betaald. Ze zijn samen. Ze zeggen het niet. Maar dat doen ze. Moi.

**Credits (flow).** De credits blijven één keer rollen, aan het echte einde. Zie §9 voor de technische regels. De kaarten die erbij komen (rol, drie regels per beeld, geen stem):
- **Ubbo Oldenhuis** · *verkocht alles, behalve één eierbal*
- **Roelfien** · *rekende het uit, en betaalde terug*
- **Brugwachter Wubbo** · *opende altijd, een tel te laat*
- **Boswachter Siemen** · *meldde alleen, en snurkte*
- **Molenaar Eilert** · *zag het graan voor het groeide*
- **Mevrouw Oldenhuis-Blauw** · *rekende door, tot de laatste koe*
- **Machinist Dries** · *keek naar het sein*
- **Berend Bos** · *won, en vond het verkeerd*
- **Lammert en Trijntje** · *dansten, langzaam*
- **Met dank aan:** *iedereen die hoog zit of bij het water*

**Haken naar het post-game (epiloogrichting):**
1. **De Ronde als jaarlijks event:** elke zomer één ronde door zeven regio's, als herhaalbare "klus" in de bijbanenlijst (de Fjord & Familie-ronde; geld is nooit een blokkade).
2. **Fjord & Familie:** de zeven filialen blijven en leveren daginkomen (plan §6.3); een "bezoek de familie"-activiteit per regio.
3. **Mevrouw Oldenhuis-Blauw** belt na de credits (stinger, post-credits): "Ik heb een voorstel. Over de eenenveertig snackbars." Geen vervolg beloofd; wel de deur.
4. **Wolf (alleen met Z17-Z19):** een foto in het fotoalbum (A16) van de wolf bij Bourtange, met de tekst "Hij liep weg. Hij had gelijk."
5. **Rikus' nieuwe peiling:** "Welke regio wordt de volgende?" (hint naar Deel 5 of een uitbreiding; niets verplicht).

---

## 4. Zijreeksen

Elke reeks start met een "?" op de kaart. Ze zijn niet nodig voor het verhaal en volgen dezelfde regels: overslaan na één poging, geld blokkeert niets, geleende voertuigen gaan terug.

### De Randstedelingen (Oldambt)

*Start:* na `n-winschoten` (Floor staat op het erf van een boerderij bij Midwolda en wil een foto). Floor en Joost zijn rijk, vriendelijk en verdwaald; het spel lacht om hun verwachtingen, nooit om het dorp: de buren spelen mee en winnen er een glimlach bij.

#### Z9 · Echt Gronings

**Type:** regie · **Speler:** Tessa · **Start:** de boerderij van Floor en Joost bij Midwolda · **Beloning:** € 500
Ze willen een "echte boerderijdag" voor vrienden uit het westen. Regisseer een nep-boerderijdag met geleende koeien (Aaltje en Grietje!), een paar boeren en een trekker. Elke gast heeft een verwachting (hooi, een melkemmer, een koe die muu zegt); je zet mensen op hun plek (`direct`, NIEUW). **Falen:** een gast ziet een telefoon bij een boer (verdacht-meter 100 %). **Overslaan** na één poging.
**Intro.** *Camera:* Een erf in de middagzon, een grote bloemenkrans aan de schuur, twee mensen in linnen die alles filmen.
- **Floor** *(enthousiast, snel)*: Is dit nou het echte leven? Wij willen het echte. Echt Gronings. Zonder filter. `[naamkaart: floor]`
- **Joost** *(beleefd, vaag)*: We hebben een erf. We hebben geen koeien. Dat is raar, hè?
- **Tessa** *(zakelijk)*: Dat regel ik.
- **Tammo** *(droog)*: Hoeveel koeien wilt u?
- **Floor** *(ontroerd, snel)*: Eén. Een echte. Die muu zegt.
- **Koe Aaltje** *(droog, vlak)*: Muu.
- **Koe Grietje** *(wijs, droog)*: Zo. Dat was dat.
**In de missie**
- **Tessa** *(zakelijk)*: Boer links. Hooivork. Niet kijken naar de camera.
- **Boer** *(droog, op zijn paasbest)*: Ik kijk nooit naar camera's. Dat is hoe je weet dat ik echt ben.
- **Joost** *(beleefd, vaag, filmend)*: Mag ik hem aaien?
- **Koe Aaltje** *(droog, vlak)*: Liever niet.
- **Floor** *(enthousiast)*: Hij zei "liever niet"!
- **Tessa** *(snel)*: Dat is een koe, Floor. Die zegt dat altijd.
**Outro.** *Camera:* Het erf bij zonsondergang: de gasten met een glas, de koeien als achtergrond.
- **Floor** *(ontroerd, zacht)*: Dit is het mooiste dat ik ooit heb gezien.
- **Boer** *(droog, tevreden)*: Het is een gewone dag. Ik heb alleen mijn goeie laarzen aan.
- **Tammo** *(droog, zacht)*: Dat is het mooiste.
**Afrondingskaart:** **ECHT GRONINGS** · Eén boerderijdag. Twee koeien. Geen telefoons. · *+ € 500*

#### Z10 · Wolf gezien

**Type:** regie · **Speler:** Tammo · **Start:** het erf van Floor en Joost bij Midwolda (avond) · **Beloning:** € 600
Ze willen een wolf zien (er is er geen in het Oldambt). Tammo regelt een hond van een buurman in een wolvenpak, "op tijd voor de foto". De hond heet Bram en is blij. **Let op:** dit is een hond, geen wolf; het spel laat nergens toe dat je op een wilde dier schiet. **Falen:** de foto is niet op tijd (60 s). **Overslaan** na één poging.
- **Floor** *(opgewonden, zacht)*: Er is een wolf in Groningen. Dat stond in de krant. Ik wil hem zien.
- **Tammo** *(droog)*: Die zit in Westerwolde.
- **Joost** *(beleefd, vaag)*: Kan hij niet even hier komen?
- **Tammo** *(droog, zacht)*: Ik zal het vragen.
- **Buurman** *(droog)*: Hier. Mien hond Bram. Hij heeft een pak aan. Hij vindt het leuk.
- **Tessa** *(zacht, in het oortje, lachend)*: Hij kwispelt.
- **Floor** *(fluisterend, ontroerd)*: Daar. Een wolf. Hij is zo… mooi.
- **Tammo** *(droog, zacht)*: Hij is een hond.
- **Floor** *(fluisterend, zonder te horen)*: Hij heeft de ogen van een wolf.
- **Tammo** *(droog, kort)*: Dat is een compliment.
**Afrondingskaart:** **WOLF GEZIEN** · Eén wolf. Eén hond. Eén foto, op tijd. · *+ € 600*

#### Z11 · Boerenbruiloft

**Type:** regie, konvooi · **Speler:** Tammo · **Start:** de erf bij Midwolda (middag) · **Beloning:** € 800
Floor en Joost trouwen opnieuw, "zoals hier". Twaalf trekkers rijden in een stoet van het erf naar de kerk van Midwolda (rustig tempo, geen inhalen, geen toeteren in het dorp). Jij rijdt voorop op een geleende trekker. **Falen:** een trekker valt uit de stoet (> 80 m achter). **Overslaan** na één poging.
- **Floor** *(ontroerd, zacht, in een trouwjurk van linnen)*: Een stoet. Twaalf trekkers. Dat doen jullie hier toch?
- **Tammo** *(droog)*: Alleen als iemand trouwt. Of verdwaalt.
- **Joost** *(beleefd, onzeker)*: Wij zijn allebei.
- **Tammo** *(droog, zacht)*: Dan is het een goede dag.
- **Boer** *(droog, vanaf zijn trekker)*: Twaalf. Ik tel er elf.
- **Tammo** *(droog, kijkt achterom)*: Er zijn er twaalf. De twaalfde zit ver achter.
**Afrondingskaart:** **BOERENBRUILOFT** · Twaalf trekkers. Eén kerk. Twee keer ja. · *+ € 800*

#### Z12 · Verhuisd

**Type:** verhuizing · **Speler:** Tessa · **Start:** het erf bij Midwolda (ochtend) · **Beloning:** € 700
Ze gaan terug naar het westen ("Te stil."). Verhuis hun kunst (een beeld van een koe in brons, drie schilderijen, een heel groot ding) in een verhuiswagen, heel, naar het station van Winschoten. **Falen:** breekbaar-meter vol. **Overslaan** na één poging.
- **Floor** *(zacht, verbaasd)*: Het is te stil. Ik heb gisteren een uur naar een koe gekeken. Hij keek terug.
- **Joost** *(beleefd, vaag)*: Wij missen de stad. Dat is gek, want we zijn er weggegaan.
- **Tessa** *(vriendelijk)*: Dat is niet gek. Dat is stilte.
- **Floor** *(zacht, ontroerd)*: We komen terug. Als vakantie. In de zomer. Voor de heide.
- **Tessa** *(zacht, glimlachend)*: Dan zijn jullie hier thuis.
- **Floor** *(zacht)*: Dank je. Dat is het liefste dat iemand ooit tegen ons gezegd heeft.
**Afrondingskaart:** **VERHUISD** · Eén koe in brons, heel. Twee mensen, onderweg naar huis. · *+ € 700*

### Brugwachter Wubbo (Veenkoloniën)

*Start:* na `n-veendam` (Wubbo zwaait vanaf zijn brug).

#### Z13 · Open, dicht

**Type:** getimed · **Speler:** Tammo · **Start:** het brugwachtershuisje, Veendam · **Beloning:** € 500
Een botenparade, tien bruggen, één wachter. Jij bedient het paneel op het ritme van een fanfare (`rhythm`, NIEUW): open op de beat, dicht op de beat. Mist een beat = een bootje wacht. **Falen:** vijf gemiste beats. **Overslaan** na één poging.
- **Brugwachter Wubbo** *(trots, rustig)*: Tien bruggen. Eén fanfare. Ik heb de maat nooit helemaal gehad.
- **Tammo** *(droog)*: Ik wel. Ik tel altijd.
- **Brugwachter Wubbo** *(verontschuldigend)*: Dat is jouw gave. Ik heb er een tel te laat.
- **Tammo** *(droog, geconcentreerd)*: Open. Dicht. Open. Dicht.
- **Brugwachter Wubbo** *(gemoedelijk)*: Mooi. Heel mooi. Je zou brugwachter kunnen worden.
- **Tammo** *(droog)*: Ik wil niet. Maar het is leuk.
**Afrondingskaart:** **OPEN, DICHT** · Tien bruggen. Op de maat. · *+ € 500*

#### Z14 · Kanaalspringer

**Type:** stunt · **Speler:** Tessa · **Start:** een halfopen brug, Veendam · **Beloning:** € 700
Springen met de Escapade over bruggen die net opengaan (in een veilige, afgesloten stunt-zone met schansen; geen echt verkeer). Wubbo opent een tel te laat: dat is jouw schans. **Falen:** de Escapade in het kanaal (hij wordt eruit gehaald; geen verlies). **Overslaan** na één poging.
- **Tessa** *(opgewonden)*: Dit is de beste baan ter wereld.
- **Brugwachter Wubbo** *(gemoedelijk, via de marifoon)*: Ik doe open. Jij springt. Het moment spreken we niet af.
- **Tessa** *(snel)*: Dat is geen plan, Wubbo!
- **Brugwachter Wubbo** *(trots, rustig)*: Het is het enige dat ik heb.
- **Tessa** *(juichend, in de lucht)*: Ik vlieg!
**Afrondingskaart:** **KANAALSPRINGER** · Drie sprongen. Eén tel te laat. · *+ € 700*

#### Z15 · De verkeerde kant

**Type:** boot · **Speler:** Tessa · **Start:** de sluis bij Veendam · **Beloning:** € 600
Een plezierjacht vaart de verkeerde kant op in het kanaal, recht voor een vrachtboot. Sleep het jacht weg (Wubbo's brugboot met een lijn) voor de vrachtboot er is. **Falen:** de lijn breekt twee keer. **Overslaan** na één poging.
- **Plezierjachtschipper** *(luid, verbaasd, in pak)*: Ik vaar de goede kant! Het is een gewoonte!
- **Brugwachter Wubbo** *(gemoedelijk, via de marifoon)*: Er is hier geen goede kant. Er is een kant. En die is rechts.
- **Tessa** *(snel, gespannen)*: Lijn vast! Trekken! De vrachtboot toetert!
- **Plezierjachtschipper** *(luid, opgelucht)*: Dank u, mevrouw! Ik ga naar huis!
**Afrondingskaart:** **DE VERKEERDE KANT** · Eén jacht. Eén vrachtboot. Nul botsingen. · *+ € 600*

#### Z16 · Pensioen

**Type:** verhaal · **Speler:** Tammo · **Start:** het brugwachtershuisje (avond) · **Beloning:** € 1000
Wubbo wil met pensioen ("ik ben tweeënzestig, ik had het niet gedacht"). Alle bruggen van de wijken gaan één keer tegelijk open voor een vuurwerk langs het kanaal. Jij bedient ze samen met hem (rustig, geen spel, alleen kijken). Hij blijft melder: "Pensioen is een brug te ver." **Kan niet mislukken.**
- **Brugwachter Wubbo** *(gemoedelijk, trots, zacht)*: Ik wil één keer alle bruggen tegelijk open. Dat doe je nooit. Dat is verboden. Dat is een feest.
- **Tammo** *(droog, zacht)*: En dan?
- **Brugwachter Wubbo** *(rustig, wijs)*: En dan ben ik klaar. En dan ga ik thuis zitten. En dan meld ik alleen.
- **Tammo** *(droog, zacht)*: Dat is het mooiste afscheid dat ik ken.
- **Brugwachter Wubbo** *(gemoedelijk, zacht, kijkend naar het vuurwerk)*: Ik heb nooit eerder gezien wat een brug doet als hij open is. Ik zat er altijd in.
**Afrondingskaart:** **PENSIOEN** · Alle bruggen open. Eén keer. Eén brugwachter, thuis. · *+ € 1000*

### De Wolvenman (Westerwolde)

*Start:* na `n-westerwolde` (Gerrit staat met een kijker bij een heideven). Regel voor de hele reeks: er is een echte wolf; het spel laat nooit toe dat je er op schiet, hem aait of hem opjaagt: foto's op afstand.

#### Z17 · Sporen

**Type:** zoeken · **Speler:** Tammo · **Start:** een heideven bij Sellingen · **Beloning:** € 400
Gerrit is zeker dat de wolf terug is. Zoek sporen op de zandpaden (`track`: pijl op de HUD alleen bij het eerste spoor). De sporen zijn van zijn eigen hond Bor. **Falen:** geen. **Overslaan** na één poging.
- **Wolvenman Gerrit** *(opgewonden, zeker)*: Stil! Dat is een wolvenspoor. Ik voel het. `[naamkaart: gerrit]`
- **Tammo** *(droog)*: Het is een poot.
- **Wolvenman Gerrit** *(fluisterend, plechtig)*: Een wolvenpoot.
- **Tammo** *(droog, zacht)*: Er staat een hond bij.
- **Bor** *(blaft, vrolijk)*: *(blaft)*
- **Wolvenman Gerrit** *(teleurgesteld, sportief)*: Bor. Het is Bor. Ik weet het niet. Maar de volgende keer weet ik het wel.
**Afrondingskaart:** **SPOREN** · Vijf sporen. Alle vijf van Bor. · *+ € 400*

#### Z18 · Volle maan

**Type:** nacht, wachten · **Speler:** Tessa · **Start:** een nachtpost op de heide (nacht) · **Beloning:** € 500
Een hele nacht op een nachtpost: wachten (`wait`: tijd versneld met Spatie; af en toe een "schaduw"). Tessa haat wachten. Er komt een uil, een ree en een drone van de buren. **Falen:** geen. **Overslaan** na één poging.
- **Wolvenman Gerrit** *(fluisterend, plechtig)*: Zitten. Stil. Zes uur. Hij komt. Hij komt altijd als je het niet verwacht.
- **Tessa** *(zacht, ongeduldig)*: Hoe lang is zes uur?
- **Wolvenman Gerrit** *(fluisterend)*: Zes uur.
- **Tessa** *(zacht, vermoeid)*: Ik haat wachten.
- **Wolvenman Gerrit** *(fluisterend, vergevingsgezind)*: Dat weet iedereen. Het gaat vanzelf.
- **Tessa** *(zacht, verbaasd)*: Een uil. Hij kijkt me aan.
- **Wolvenman Gerrit** *(fluisterend)*: Dat is geen wolf.
- **Tessa** *(zacht, snel)*: Een drone.
- **Wolvenman Gerrit** *(fluisterend, teleurgesteld)*: Dat zijn de buren.
**Afrondingskaart:** **VOLLE MAAN** · Zes uur. Een uil, een ree en een drone. · *+ € 500*

#### Z19 · Toch een wolf

**Type:** foto · **Speler:** Tammo · **Start:** de heide bij Bourtange (ochtend) · **Beloning:** € 900
Er is echt een wolf. Fotografeer hem op afstand (> 80 m) zonder dat hij je ziet (wind, stilte); te dichtbij of te luid = hij loopt weg. Hij loopt toch weg, zoals het hoort. **Niet schieten** (het spel staat het niet toe). **Falen:** geen; de foto's tellen voor het album.
- **Wolvenman Gerrit** *(fluisterend, ongelovig)*: Daar. Tussen de berken. Een wolf.
- **Tammo** *(droog, fluisterend)*: Ik zie hem.
- **Wolvenman Gerrit** *(fluisterend, trillend)*: Ik heb hem al jaren niet gezien. Nu zie ik hem. Hij kijkt.
- **Tammo** *(droog, fluisterend)*: Klik.
- **Wolvenman Gerrit** *(fluisterend, ontroerd)*: Hij loopt weg. Dat is goed. Hij heeft gelijk.
- **Bor** *(zacht, een klein blaffend geluid)*: *(blaft zacht)*
- **Wolvenman Gerrit** *(fluisterend, zacht)*: Bor weet het. Bor wist het altijd.
**Afrondingskaart:** **TOCH EEN WOLF** · Eén foto. Op afstand. Hij liep weg. · *+ € 900*

## 5. Activiteiten en bijbanen

Alles is altijd te starten en af te breken; niets is nodig voor het verhaal. Regels uit F4a gelden: geld blokkeert niets, geleende voertuigen gaan terug, niets op wierden, kerkpaden of in natuurgebieden dat daar niet hoort.

### 5.1 Museumspoor: stoker en machinist (+ de lijn naar Nieuweschans en Veendam)

*Plan:* A27 + nieuw (wens eigenaar: machinist en passagier) · *Waar:* Stadskanaal-Musselkanaal (museumspoor, `railway=preserved`, OSM-check), Groningen-Hoogezand-Sappemeer-Zuidbroek-Scheemda-Winschoten-Nieuweschans, Zuidbroek-Veendam

**Stoomtrein (nieuw).** Stap bij een stilstaande stoomtrein in Stadskanaal voorin (E): je bent **stoker** (kolen scheppen op de maat, ketel op druk) of, na goud op de stoker-score, **machinist** (regelaar, rem, fluit). Machinist Dries zit naast je. Score: stiptheid, comfort, druk. Medailles: brons, zilver, goud, "Kon minder" (alles vol op de hele lijn). Bijbaan: een dienst = één rit heen-en-terug, betaald per rit; niveau 2 met dagjesmensen die uitstappen bij een overweg, niveau 3 de avondrit met lichtjes. Ontgrendeld na O24.
**Gewone treinen (F4a-minigame uitgebreid).** De lijn naar Nieuweschans (met Berthus als instructeur) en de zijtak naar Veendam hebben dezelfde bediening als Roodeschool en Delfzijl; snelheidsborden uit OSM (`maxspeed` op `railway=rail`), overwegen in elk dorp. Ontgrendeld na `n-winschoten`.

**Dries (stoomtrein)**
- **Machinist Dries** *(schor, instruerend)*: Kolen. Eén schep. Twee. Op de maat. Niet te veel. Stoom is een dier. Het wil eten, niet stikken.
- **Machinist Dries** *(schor, kort)*: Druk. Kijk naar de naald. Hij leest geen krant. Hij zegt de waarheid.
- **Machinist Dries** *(schor, droog)*: Fluit. Eén keer lang. Dat is voor de koeien. Die kijken altijd.
- **Machinist Dries** *(schor, trots)*: Dat was een goede stoker. Dat was een betere machinist. Zeg het niet tegen de ketel.
- **Machinist Dries** *(schor, streng)*: Te hard. Het is een museum. Het hoort langzaam.
- **Machinist Dries** *(schor, tevreden)*: Musselkanaal. Eindpunt. De koffie is er koud. Maar de rit was warm.

**Berthus (lijn Nieuweschans en Veendam)**
- **Machinist Berthus** *(droog, instruerend)*: Winschoten. Hier staat een molen. Hij kijkt naar jou. Hij kijkt altijd.
- **Machinist Berthus** *(kort, streng)*: Nieuweschans. Verder gaat het spoor niet. Daarna is het Duitsland. Dat heeft een ander spoor.
- **Machinist Berthus** *(droog)*: Veendam. Een zijtak. Hij houdt van rustig.
- **Machinist Berthus** *(droog)*: Overweg. Bel, bomen, toeter. In die volgorde. Dat zei Jantina ook. Ze heeft gelijk.

**Omroepen (nieuwe haltes)**
- **Treinomroep** *(kalm, monotoon)*: Volgende halte: Hoogezand-Sappemeer. · Volgende halte: Sappemeer Oost. · Volgende halte: Zuidbroek. · Volgende halte: Scheemda. · Volgende halte: Winschoten. · Volgende halte: Nieuweschans. Eindpunt. Wilt u bij het uitstappen op de grens letten. · Volgende halte: Veendam. Deze trein eindigt hier. · Volgende halte: Stadskanaal. Eindpunt van het museumspoor.
- **Tammo** *(droog, in de omroep)*: Volgende halte: Scheemda. Daar is een oom.
- **Tessa** *(vrolijk, in de omroep)*: Dames en heren, de machinist zegt dat hij weet wat hij doet. Hou u even vast. Het is een stoomtrein.

**Medereizigers (één zin per keer)**
- **Reiziger** *(kletserig)*: Ik ga naar mijn zus in Veendam. Ze weet het niet. Het is een verrassing. Voor haar. Voor mij ook.
- **Student** *(moe, droog)*: Eerste college in Stad om negen. Ik woon in Scheemda. Ik heb spijt van het college.
- **Boer** *(droog)*: De trein is sneller dan mijn trekker. Mijn trekker heeft meer karakter.
- **Toerist** *(nieuwsgierig)*: Is dit de grens? Ik zie alleen een bord met sterren.
- **Reiziger** *(kletserig, warm)*: Kijk, de molen van Winschoten. Hij draait. Niemand zet hem aan.

**Coupégesprek Tammo en Tessa: lijn Veendam (`trigger: train:veendam`, `needs: n-veendam`)**
- **Tessa** *(quiet)*: Zuidbroek. Hier zat ik gisteren. Alleen.
- **Tammo** *(dry, soft)*: Ik zat in de trein naar Stad. Ook alleen.
- **Tessa** *(soft)*: Dat was geen goede dag.
- **Tammo** *(dry, quiet)*: Het was een nuttige dag.
- **Tessa** *(teasing, warm)*: Dat is dezelfde dag, Tammo.
- **Tammo** *(dry, small smile)*: Het was een nuttige dag.

### 5.2 Streekbus: Oldambt, Veenkoloniën en Westerwolde

*Plan:* A1 · *Waar:* Streeklijn Winschoten-Scheemda-Midwolda-Beerta; Veendam-Stadskanaal-Musselkanaal; **Buurtbus** Vlagtwedde-Bourtange-Sellingen (klein busje, drie passagiers max.); een **grensbus** Nieuweschans-het bord (geen oversteek, alleen tot de streep). Haltes en volgorde uit OSM (`route=bus`); de bussen heten Streekbus; geen echte vervoerder. Nieuw: **wind op de klei** (open vlakte, zijwind), **bruggen die opengaan** op de lijn Veendam (wachten is geen fail: de bus staat en de passagiers kijken), **aansluiting gehaald** op de trein in Winschoten. Ontgrendeld na `n-winschoten`, `n-veendam`, `n-westerwolde`. Collega Jannes geeft de dienst.
- **Buschauffeur Jannes** *(droog, gemoedelijk)*: Nieuwe lijn. Het is het Oldambt. Er is hier niks. Dat is het mooie. Je ziet alles komen.
- **Buschauffeur Jannes** *(droog)*: In Veendam gaat een brug open. Je wacht. Er zit een man die zijn brug heeft. Hij is iets te laat. Dat is zijn vak.
- **Buschauffeur Jannes** *(droog, gemoedelijk)*: Bourtange. Het busje is klein. De vesting is groot. Er zitten mensen die er gewoon wonen. Rij zachtjes.
- **Reiziger** *(kletserig)*: Ik ga naar de kapper in Winschoten. Daar is het leuker. Hij weet alles.
- **Boer** *(droog)*: Zet me af bij het hek. Niet bij de halte. Bij het hek. Het graan wacht niet.
- **Toerist** *(nieuwsgierig, vragend)*: Waar is de grens? Ik zie alleen een bord.
- **Reiziger** *(stellig)*: Vroeger stond hier een heel dorp. Nu ook. Het is alleen kleiner geworden.
- **Student** *(moe)*: Wekt u mij in Stad? Of Veendam. Waar we dan ook als eerste zijn.

### 5.3 Vrachtwagen: Veendam en de grens

*Plan:* A26 (nu helemaal: Eemshaven → Veendam) · *Waar:* Depot "Transport Wierda" (Stad) → N33 → Veendam (zetmeelfabriek, silo-oplegger), Hoogezand (strokarton), Winschoten, de grens (Nieuweschans, paletten voor de Duitse kant)
De vrachtwagen met oplegger (F4a) rijdt nu de volle lijn **Eemshaven-Veendam** over de N33 (container ophalen aan de kraan, lossen onder de silo), en korte ritten: **strokarton** (balen, breekbaar-meter voor de stapel), **zetmeel** (tankoplegger, klotsen), en **de grensdrop** (paletten naar de laatste halte voor de streep; Grenswacht controleert, zie §5.8). Niveaus: 1 overdag, 2 met tijdvenster bij de silo, 3 's nachts met mist op de veenwegen. Geen merknamen.
- **Loodsdienst** *(zakelijk, door de marifoon)*: Silo twee. Achteruit. Aan de linkerkant. Nog een meter. Klik.
- **Buschauffeur Jannes** *(droog, aan de telefoon)*: Planner. Je moet om vier uur in Veendam zijn. Het is drie. Je zit in Hoogezand. Ik zou niet zuchten. Het is kaarsrecht.
- **Tessa** *(gespannen)*: Hij is achttien meter lang en het kanaal ligt links.
- **Tammo** *(droog)*: Rechts is een brug. Hij gaat open.
- **Tammo** *(tevreden)*: Zetmeel voor Veendam. Een container voor de silo. We bezorgen ons eigen meel.
- **Tessa** *(trots)*: Een netwerk, Tammo.
- **Tammo** *(droog)*: Een vrachtwagen.

### 5.4 Driftplekken en veenwegsprints

*Plan:* nieuw (wens eigenaar) + A10 · *Waar:* vijf driftplekken, 's avonds en 's nachts, en vier sprints op de rechte veenwegen. Driftplekken: lege verharde plekken; geen drift op erven, kerkpaden, heide of bij wierden; na 2 minuten een melding, na 4 minuten surveillance (1 ster).
1. **Het parkeerterrein van de oude strokartonfabriek** (Hoogezand-Sappemeer, `landuse=brownfield`, OSM-check): groot, leeg, rijk aan kartonstof.
2. **Industrieterrein Veendam** (bij de zetmeelfabriek): een rotonde zonder verkeer bij nacht.
3. **Het kermisterrein van Winschoten** buiten de kermisweek.
4. **De taxiebaan van het vliegveldje bij Oostwold** als er niet gevlogen wordt (afgezet met pylonen: een "rustig" uur).
5. **De carpoolplaats bij de N366 bij Vlagtwedde** (OSM-check).
**Veenwegsprints (A10):** punt-tot-punt over de kaarsrechte wegen: **N33** (Zuidbroek-Veendam), **N366** (Veendam-Stadskanaal-Vlagtwedde), **N362** (Winschoten-Beerta), en de **Dollarddijkweg** (A9, met wind). Kaarsrecht = gladde tijdrit; bochten komen als verrassing. Roelfiens combine of een trekker op de weg is hinder, geen fail.
- **Tessa** *(juichend)*: Dwars! Op een kartonrotonde!
- **Tammo** *(droog, duizelig)*: Ik zie de fabriek vier keer.
- **Durk** *(traag, plechtig)*: Douwe. Kijk. Zij rijdt opzij.
- **Douwe** *(traag)*: …opzij.
- **Agent** *(kordaat, door een luidspreker)*: Dit is een parkeerterrein. Het is geen circuit. Ga naar huis.
- **Tessa** *(grinnikend)*: Dat zeggen ze overal.
- **Tammo** *(droog)*: Ze hebben gelijk.

### 5.5 Kermiscircuit (A6)

*Plan:* A6 · *Waar:* de kermis van **Winschoten** (zomerweekend), plus vijf stadjes die per week wisselen (Veendam, Stadskanaal, Beerta, Bellingwolde en Vlagtwedde)
Minispellen: **botsauto's** (O22-stijl, arena), **schiettent** (pluche, geen echt wapen), **zweefmolen** (tijdtrap), **grijpautomaat** (een vet bakje friet als hoofdprijs), **krachtmeter** (hamer, "hoog-hoog": de bel), **eierbal-gooien** (een eierbal in een emmer). Elk spel geeft een beloning of een grap; een beker per kermis.
- **Botsautobaas Dolf** *(luid, joviaal)*: Dames en heren, de botsauto's zijn gratis! Dat is niet waar. Maar het klinkt goed!
- **Tessa** *(uitgelaten)*: De zweefmolen! Eén rondje! Je hoeft niet mee, Tammo.
- **Tammo** *(droog)*: Ik kijk wel. Van de grond. Daar is hij het mooist.
- **Kermisbaas Hennie** *(plechtig, luid)*: Krachtmeter! Wie slaat de bel? Niemand! Dat is de bedoeling!
- **Tammo** *(droog, trots, na een slag)*: De bel ging.
- **Tessa** *(verbaasd)*: Hij ging echt.
- **Tammo** *(droog)*: Dat bedoelde ik.

### 5.6 Combinerace (A33), rooien (A8) en balen rapen (A7)

*Plan:* A33, A8, A7 · *Waar:* de stoppelvelden bij Beerta en Midwolda (combine), de akkers rond Veendam (rooien), overal in de nazomer (balen rapen)
- **Combinerace:** met een combine over stoppelvelden van Roelfien, een kring om vlaggen; de combine is van Roelfien (geleend, `handBack`); zwaar en traag in de bocht; wie het maaibord tegen een boom zet, staat twee seconden stil. Eppo Bolt doet mee ("Ow").
- **Rooien:** aardappelen rooien in een race tegen de buurman; je rooimachine (geleend) vult de kiepper; elke minuut verder is een sprint naar de volgende rij.
- **Balen rapen:** ronde balen van het land naar het erf voor de bui (een wolk op de minimap); Roelfien en drie boeren bieden het aan.
- **Roelfien** *(droog, kordaat, voor de combinerace)*: Het is geen race. Het is een rondje met een prijs. Wie wint, krijgt een boterham.
- **Eppo Bolt** *(luid, grinnikend, op zijn combine)*: Ik rij vandaag clean. Voor één keer.
- **Tammo** *(droog)*: Hij zei clean.
- **Tessa** *(droog)*: Hij zei het zachtjes.
- **Tessa** *(gehaast, bij de balen)*: Naar het erf, niet de sloot in. Een baal zwemt niet.
- **Tammo** *(droog)*: Ze rollen beter dan ik dacht.

### 5.7 Oogstfeest (groot event, zomer)

*Waar:* **Beerta** (Roelfiens erf en het dorpsplein), nazomer (dag 46-48, ma 28 - wo 30): het laatste graan is binnen. Trekkerparade, combineshow, een eierbalkraam van de Fjord, een orkestje, een prijs voor de beste boterham. Nooit tijdens een missie; geen herfstmarkt, geen pompoenen.
- **Roelfien** *(droog, warm, op een podiumpje)*: Het graan is binnen. Nu de mensen nog. Bier staat klaar.
- **Omroeper** *(luid, enthousiast)*: Dames en heren, de trekkerparade! Eén trekker! Dat is het hele dorp! Hij heeft een vlag!
- **Tessa** *(lachend)*: Hij heeft ook de burgemeester achterop.
- **Tammo** *(droog, zacht)*: Dat is de burgemeester. Op een trekker. Ik zou het zo doen.

### 5.8 Grensgrappen (Nieuweschans en Bourtange)

*Waar:* het grensbord bij **Nieuweschans** (en een tweede bij Bourtange). De fictieve **Grenswacht** staat aan de Nederlandse kant, aan de overkant een Duitse collega (`grenzer`, Duits). Je mag er niet overheen met de Fjord (geen papieren, het is een frietwagen); wel te voet tot de streep. Grappen: op de streep staan; een selfie met beide agenten; koffie van de Duitse thermoskan; **de grensdrop** (paletten); een toerist die de weg naar Nederland vraagt, terwijl hij erin staat. Geen nationalistische grappen: de grap gaat over regels, lijnen en thermoskannen.
- **Grenswacht** *(droog, vriendelijk)*: Op de streep staan mag. Eén voet. Twee voeten is een mening.
- **Grenzwächter** *(vriendelijk)*: Eine Fuß. Zwei Füße sind eine Meinung. *(Eén voet. Twee voeten zijn een mening.)*
- **Toerist** *(nieuwsgierig, vragend)*: Is dit Nederland? Ik wil naar Nederland. Ik sta er in, geloof ik.
- **Grenswacht** *(droog)*: U staat er in. Het is niet te zien. Dat is het mooie.
- **Grenzwächter** *(droog, vriendelijk)*: Möchten Sie ein Foto? *(Wilt u een foto?)*
- **Tessa** *(lachend)*: Ja. Met beide. En de thermoskan.
- **Grenswacht** *(droog)*: De thermoskan is dienstmateriaal.

### 5.9 Gewasspuiter Oldambt (A2), vliegbrevet (A14), meerregatta (A12), kanaalraces (A11) en kanaalboot-banen

- **Gewasspuiter (A2):** vanaf **Roelfiens graspiste** (na O20), "groenbemester" (onschuldig); onder de lijn door = bonus; Roelfien geeft de vluchten. **Vliegbrevet (A14):** bij het vliegveldje bij **Oostwold**: taxiën, starten, landen; de eerste vlucht is Roelfiens tweezitter; een eigen toestel te koop. **Meerregatta (A12):** zeilen of motorboot op het **Oldambtmeer** (Blauwestad, Midwolda), gratis sloepen van de jachthaven. **Kanaalraces (A11):** het **Winschoterdiep** (Winschoten-Zuidbroek) en de kanalen van **Veendam** (bruggen die open moeten: toeteren en hopen; Wubbo is een tel te laat). **Kanaalboot-banen (nieuw):** de **Veenboot**: pakketten en toeristen langs de wijken van Veendam, bruggen openen via Wubbo (dispatcher): niveau 1 overdag, niveau 2 met een vaarschema, niveau 3 de avondrondvaart met lichtjes.
- **Roelfien** *(droog, kordaat, door de headset)*: Perceel vier. Begin bij de sloot, eindig bij de berm. Niet bij de buren. Ik ken ze.
- **Roelfien** *(droog)*: Onder de lijn door. Mien man deed het erover. Hij is nu boer in de sloot.
- **Brugwachter Wubbo** *(gemoedelijk, via de marifoon)*: Veenboot. Pakket naar het Oosterdiep. Brug open. Over een tel.
- **Brugwachter Wubbo** *(gemoedelijk)*: Je bent op tijd. Ik ben iets te laat. Dat compenseert.
- **Tessa** *(gespannen, op het meer)*: Zeil bij. Wind uit het noordwesten. Ik zei: bij.
- **Tammo** *(droog, zeilend)*: Ik ben bij. Alleen het zeil niet.

### 5.10 Taxi, pakketten en verhuizen

*Plan:* A23-A25 · *Waar:* taxi-standplaats Winschoten (station) en Veendam; pakketdepot Hoogezand; verhuisbusjes in Scheemda. Ritten naar de dorpen langs de Dollard, lange rondes op de rechte wegen, en één verhuizing "van Stad naar Bellingwolde, voor de rust".
- **Reiziger** *(kletserig)*: Naar Beerta graag. Ik wil de zon zien ondergaan boven de Dollard. Niet te snel, dan mis ik hem.
- **Boer** *(droog)*: Naar Midwolda. Het is maar vier kilometer. Ik zou lopen, maar ik heb een grote kist.
- **Reiziger** *(stellig)*: Een pakket voor Sellingen? Dat is voor mij. Ik heb het niet besteld. Ik neem het wel.
- **Student** *(moe)*: We verhuizen van Stad naar Bellingwolde. Voor de rust. Is het altijd zo stil? O. Fijn.

### 5.11 Fjord-filialen (Oldambt, Veenkoloniën, Westerwolde)

*Waar:* de graanschuur bij Beerta (Roelfien, na O22), het brugwachtershuisje in Veendam (Wubbo, na O27) en de bosrand bij Sellingen (Siemen, na O31). Zelfde regels als F4a: daginkomen, een tweede pan, een terras, het eigen recept (gerstemout; aardappelzetmeel; heidehoning); overvallen door Ubbo's knechten zijn na O31 weg, want hij zit vast; er blijven kleine overvallen door "ongeduldige klanten". Na O32 heten ze samen **Fjord & Familie**.
- **Roelfien** *(droog, warm, aan de telefoon)*: Vandaag tachtig eierballen. Er kwam een bus. Hij stond stil. Alle mensen bestelden. Ik heb gekeken.
- **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon)*: Veertig eierballen. Twee schepen. Een tel te laat. De klanten waren tevreden.
- **Boswachter Siemen** *(rustig, kort, aan de telefoon)*: Zes. Er komt weinig langs. Maar het zijn goede zes.
- **Tessa** *(tevreden)*: Drie filialen draaien. Zonder ons.
- **Tammo** *(droog)*: Dat is het mooie. En het enge.

### 5.12 Verkennen en verzamelen

*Plan:* A7, A15-A20, A27, A29, A34-A36 · *Waar:* Oldambt, Veenkoloniën, Westerwolde
- **Uitkijkpunten (A15):** de molen van **Winschoten** (Eilert), het **brugwachtershuisje** in Veendam (Wubbo), de bosrand bij **Sellingen** (Siemen), en de wal van **Vesting Bourtange**. Elk onthult 6 km en wordt een snelreispunt.
- **Kieken (A16):** album "Oldambt", "Veenkoloniën", "Westerwolde", elk 20-25 herkenningspunten (§7); één wolvenfoto (met Z19).
- **Kerkenpad (A17):** ± 40 kerken in Oldambt en de Veenkoloniën (de Oldambtster kerken zijn groot, de klei was rijk) en ± 15 in Westerwolde.
- **Borgenroute (A19):** **Fraeylemaborg** (Slochteren), **Wedderborg** (Wedde), en de borgen die OSM in Oldambt kent; op de fiets, één dag speltijd (OSM-check van namen).
- **Molenaar (A20):** molen van Winschoten (Eilert), de molen bij Bourtange en de molens die OSM heeft.
- **Vogels tellen (A29):** de trekvogels in de **Dollard** (nazomer: de eerste ganzen komen: dat is zomer genoeg), met een uitkijkplek bij **Nieuw-Statenzijl** of de **Punt van Reide** (OSM-check).
- **Wereldeinden (A34):** de Punt van Reide / de Dollardpunt, het uiterste oosten bij het grensbord, en het laatste huisje voor het veen.
- **Treinspotter (A27):** de lijnen Nieuweschans en Veendam en het museumspoor uitrijden; badge "Elke halte".
- **Molenaar Eilert** *(bedachtzaam, droog, aan de telefoon)*: Je staat op mijn molen. Je ziet mijn graan. Ik zie jou. Ik meld alleen.
- **Brugwachter Wubbo** *(gemoedelijk, aan de telefoon)*: Je staat op mijn brug. Ik zie je. Een tel te laat.
- **Boswachter Siemen** *(rustig, kort, aan de telefoon)*: Je staat aan de bosrand. Ik hoor je. Dat is genoeg.
- **Tessa** *(zacht, bij de Dollard)*: De ganzen komen. Dat is geen herfst, dat is… vogels.
- **Tammo** *(droog, zacht)*: Dat is zomer die doorreist.

## 6. Toevallige ontmoetingen en events

Regels als F4a: nooit tijdens een missie, één tegelijk, altijd een beloning of een grap; alleen zomer (kermis, oogstfeest, jaarmarkt, paardenmarkt, een fanfare).

**Een combine op de weg** · klein · Oldambt, Veenkoloniën
- **Tammo** *(droog)*: Een combine. Negen meter breed. Hij komt niet naar ons. Wij gaan naar hem.
- **Tessa** *(droog)*: Berm in. Hij is groter dan jouw hele flat.

**Aardappelkiepers** · klein · de veenwegen
- **Tessa** *(droog)*: Kiepers. Vier achter elkaar. Ze lossen op de brug.
- **Tammo** *(droog)*: Ze rijden harder dan ik denk. Voor een aardappel.

**Brug gaat open, rij wacht** · klein · Veendam, de kanalen
- **Brugwachter Wubbo** *(gemoedelijk, vanuit zijn raam)*: Een tel. Het duurt een tel. Dat is het.
- **Tessa** *(droog)*: Het is de langste tel van de provincie.

**Een lifter met een koffer** · klein · N33, N366
- **Reiziger** *(kletserig, stapt in)*: Naar Stad. Ik ben daar naartoe verhuisd. Ik ga terug. Ik mis de kou. Dat is een grap, het is zomer.
- **Tammo** *(droog)*: Hier is het nooit koud.
- **Reiziger** *(kletserig)*: Dat is ook zo. Ik vergeet het steeds.

**Een kapotte auto bij het veen** · klein · Veenkoloniën
- **Boer** *(droog)*: Hij loopt niet. Hij liep nooit. Maar vandaag ook niet.
- **Tessa** *(zakelijk)*: Accu. Kabels erop, Tammo.
- **Boer** *(droog, dankbaar)*: Hier. Een zak aardappels. Meer heb ik niet. Ze zijn wel goed.

**Een boer die zijn koe kwijt is** · klein · Oldambt
- **Boer** *(droog, bezorgd)*: Hebben jullie een koe gezien? Zwart-wit. Ze heet Grietje.
- **Tammo** *(droog)*: Die praat toch?
- **Boer** *(droog)*: Een andere Grietje. Deze zegt niks. Gelukkig.

**Een melder fietst voorbij** · klein · overal
- **Molenaar Eilert** *(bedachtzaam, droog, fietsend)*: Jullie rijden te hard. Ik meld alleen.
- **Brugwachter Wubbo** *(gemoedelijk, op zijn bromfiets)*: Mooi weer. Er komt geen schip. Ik meld alleen.
- **Boswachter Siemen** *(rustig, kort, op een bankje)*: Een ree. Eén. Ik meld alleen.

**Een overval op een Fjord-filiaal** · klein · Beerta, Veendam, Sellingen
- **Tessa** *(fel)*: Twee ongeduldige klanten bij het luik! Met een koevoet!
- **Tammo** *(droog)*: Ze hebben honger. Dat is geen misdaad.

**De Friese tolbrug (grensgrap, voor de neven)** · klein · Veendam
- **Wybe** *(traag, plechtig)*: Halt. Fryske tol. Ien klomp, as it jo belieft. *(Halt. Friese tol. Eén klomp, alstublieft.)*
- **Tessa** *(ongelovig)*: Dit is een Groningse brug.
- **Wiebren** *(traag, eerlijk)*: Wy oefenje. *(Wij oefenen.)*
- **Tammo** *(droog)*: Jullie hebben een klomp.
- **Wybe** *(traag, trots)*: Fan Durk en Douwe. *(Van Durk en Douwe.)*
- **Wiebren** *(traag)*: …Douwe.
- **Tessa** *(droog)*: Natuurlijk.
- **Wybe** *(traag, plechtig)*: Jim meie troch. Mar net fertelle. *(Jullie mogen door. Maar niet doorvertellen.)*

**De weekmarkt in Winschoten of Veendam** · middel
- **Reiziger** *(kletserig)*: Kaas, vis, en een mevrouw die zegt dat ze een notaris is. Ik koop de kaas.

**Een voetbalwedstrijd op het dorpsveld** · middel · Midwolda, Vlagtwedde
- **Tessa** *(lachend)*: Veertien toeschouwers. Elf spelers. Één scheidsrechter. Ze kennen elkaar allemaal.
- **Tammo** *(droog)*: Dan is het altijd een thuiswedstrijd.

**Een begrafenis (stil, niet storen; wie toetert krijgt een blik)** · middel · een dorpskerk
- **Tammo** *(zacht)*: Rustig. Even niet toeteren.
- **Tessa** *(zacht)*: Ik weet het.

**Een fanfare die oefent** · middel · Veendam, Stadskanaal
- **Tammo** *(droog)*: Hetzelfde stuk. Voor de vijfde keer.
- **Tessa** *(droog)*: Het wordt elke keer beter.
- **Tammo** *(droog)*: Het wordt elke keer langer.

**De kermis in Winschoten (dag 47-52, di - zo; de voorronde O22 is op di, het weekend is de afsluiting)** · groot · Winschoten
- **Tessa** *(uitgelaten)*: Botsauto's! Zweefmolen! Schiettent! Alles!
- **Tammo** *(droog)*: Ik doe de schiettent. Van de grond. Daar is hij het mooist.

**Het oogstfeest in Beerta** · groot · Beerta (zie §5.7)

**Een paardenmarkt (fictief) in Vlagtwedde** · groot · Vlagtwedde
- **Boer** *(droog, trots)*: Paarden. Alleen paarden. Geen auto's. Dit is de laatste markt waar niemand toetert.
- **Tessa** *(zacht, lachend)*: Hij is zo mooi.
- **Tammo** *(droog)*: Hij weegt meer dan de Fjord.

**Een jaarmarkt in Stadskanaal (do, dag 49: de stoomtreindag)** · groot · Stadskanaal
- **Machinist Dries** *(schor, knipogend)*: Jaarmarkt. Er rijdt vandaag een stoomtrein. Hij is gratis. Dat is geen grap. Dat is een jaarmarkt.

## 7. Herkenningspunten en geheimen

Bij de eerste keer dichtbij: een naamkaart (plaatsnaam groot, één droge regel klein) en één zin van Rikus (`V`, radioklank). Alle namen: zie §10 voor de OSM-controle.

| Naamkaart | Kaartregel |
|---|---|
| Winschoten, molen | Een molen in een stad. Hij kijkt. |
| Winschoten, het Pagediep | Een kanaal door het centrum. Het kijkt terug. |
| Winschoten, het Marktplein | Vandaag papier uit de lucht. Meestal kaas. |
| Heiligerlee, het monument | Een slag uit 1568. Een monument dat het niet vergeet. |
| Oostwold, het vliegveldje | Gras, een windzak, en een mevrouw met een gewasspuiter. |
| Midwolda, de kerk | Midden in het graan. Midden in het dorp. |
| Scheemda | Een oom. Altijd een oom. |
| Beerta, de kerk | Groot voor een dorp. Het dorp vond dat prima. |
| Beerta, de Dollarddijk | Land, slik, water. En daarachter Duitsland. |
| Nieuweschans, de wallen | Een vestingdorpje met een grens. De grens won. |
| Nieuweschans, het grensbord | Blauw, met sterren. En een thermoskan. |
| Blauwestad, het Oldambtmeer | Een meer van tien jaar. Het weet het nog niet. |
| Veendam, het Westerdiep | Rechte kanalen. Mensen met haast. |
| Veendam, het brugwachtershuisje | Eén stoel, één brug, één wachter. |
| Veendam, de zetmeelfabriek | Het ruikt naar pannenkoeken. Dat is zetmeel. |
| Stadskanaal, het station | Het museumspoor. De rook staat recht omhoog. |
| Stadskanaal, het Stadskanaal | Een kanaal dat de stad heet. |
| Musselkanaal, het eindpunt | Waar de stoom ophoudt. De koffie niet. |
| Hoogezand-Sappemeer, de strokartonfabriek | Karton tot aan het plafond. Nu leeg. |
| Hoogezand-Sappemeer, de steigers | Balken tegen gevels. Mensen die wachten. Stil. |
| Sellingen, de bosrand | Heide in bloei. Zo ver je kijkt. |
| Vlagtwedde | Een dorp met een lange naam. Het weet waarom. |
| Bellingwolde | Waar het Oldambt ophoudt en de heide begint. |
| Wedde, de Wedderborg | Een borg in het veen. Hij is droog gebleven. |
| Bourtange, de vesting | Vijf bolwerken, een gracht, een kerkje. Eén keer verslagen. Door karton. |
| Bourtange, de hoofdwacht | Waar de jury zat. En waar het bijna verkeerd ging. |

**Rikus bij de ontdekking**
- **Rikus (verteller)** *(droog, als nacht-dj op de radio)*: De molen van Winschoten. Hij draait mee met de wind. De wind draait niet mee met hem. `[naamkaart]`
- **Rikus (verteller)** *(warm, vertellend)*: Heiligerlee. In 1568 was hier een slag. Er staat een monument. Het houdt het vast voor ons. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Het vliegveldje bij Oostwold. Gras, een windzak en een mevrouw die zegt dat ze er geen heeft. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Beerta. Een grote kerk in een klein dorp. De klei was rijk. Dat is het hele verhaal. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Nieuweschans. Een vestingdorp met een grens. Daar stopt Nederland. Het stopt vriendelijk. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Het Oldambtmeer. Tien jaar oud, en het meer weet het niet. Het denkt dat het er altijd lag. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Veendam. Rechte kanalen, rechte mensen. Als je hier te laat bent, is dat een keuze. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Stadskanaal. Een stad die vond dat een kanaal genoeg was om haar naam te geven. Het was genoeg. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Musselkanaal. Waar het museumspoor ophoudt. De rook niet. `[naamkaart]`
- **Rikus (verteller)** *(ernstig, zacht)*: Hoogezand-Sappemeer. Balken tegen gevels, steigers langs de straat. Daar wonen mensen die wachten. Ik zeg niks. Ik zeg: ze zijn er. `[naamkaart]`
- **Rikus (verteller)** *(droog)*: Sellingen. Heide in bloei, zo ver je kijkt. Iemand heeft hier een boswachter neergezet. Hij zegt niks. Hij hoort alles. `[naamkaart]`
- **Rikus (verteller)** *(warm)*: Bourtange. Een vesting van 1593. Vijf bolwerken. In 1672 hield hij een bisschop buiten. In 2026 niet. `[naamkaart]`

**Geheimen (A36), 4 per regio**
- **De klomp van Durk** (Oldambt): in een kraam op de kermis van Winschoten staat één klomp met geld. Hij is van Durk en Douwe. Ze hebben hem "verloren".
  - **Durk** *(traag, plechtig)*: Wij hebben een klomp. Hij is weg. Dat is goed. Er zit geld in. Dat is niet goed.
- **De kerkjurk** (Oldambt): Roelfiens kerkjurk hangt, nog nat, in de schuur bij Beerta. Er zit een briefje aan: "Rekening volgt."
  - **Roelfien** *(droog)*: Hij droogt. Dat duurt. Hij is van 1983.
- **De zandweg van Berend** (Oldambt, met Westerwolde): in de heide ligt een bisschopsmuts. Hij is van Berend. Hij is hem kwijt sinds 1977.
  - **Berend Bos** *(nors)*: Dat is mijn muts. Ik zocht hem. Ik heb hem nooit gemist.
- **De tel te laat** (Veenkoloniën): op de brug in Veendam staat een bordje: "Wacht even." Daaronder, in kleiner letters: "Het duurt een tel."
  - **Brugwachter Wubbo** *(gemoedelijk, trots)*: Dat bordje is van mien vader. Hij heeft ook de tel uitgevonden.
- **De zak aardappelmeel** (Veenkoloniën): in de fabriek in Veendam staat nog één zak, ongeopend. Hij is wit. Hij is koud. Hij ruikt naar niets.
  - **Tessa** *(zacht, lachend)*: Dat is het meest eerlijke wat ik ooit gevonden heb.
- **De fietspomp** (Veenkoloniën): na O25 hangt Tammo's fietspomp in een lijst aan de muur van het brugwachtershuisje. Er staat een plaatje bij: "Nuttig."
  - **Tammo** *(droog, zacht)*: Dat is een compliment.
- **De heidehoning** (Westerwolde): bij de bosrand staat een bijenkast met een bordje "Siemens bijen. Niet aanraken. Ze meldden alleen."
  - **Boswachter Siemen** *(rustig, droog)*: Ze zijn mijn neven. Wij zeggen weinig.
- **De wolfsfoto** (Westerwolde, alleen met Z19): in een boomstam bij Bourtange is een gaatje met een kaartje: "Hij liep weg. Hij had gelijk."
  - **Wolvenman Gerrit** *(fluisterend, zacht)*: Dat heb ik geschreven. Bor is het ermee eens.
- **De dansschoenen** (Westerwolde): in de hoofdwacht van Bourtange staat een paar oude dansschoenen op een tafel. Na O31 staat er een tweede paar naast.
  - **Sluiswachter Lammert** *(oud, zacht)*: Eén paar is van 1953. Het andere van vandaag. Ze passen allebei nog.
- **De schooltas** (Westerwolde): in het kerkje van Bourtange staat een oude schooltas. Er zit een receptkaartje in, in een handschrift van een negentienjarige.
  - **Kosteres Geesje** *(droog, zacht)*: Dat is wat ik heb gedragen. Zeventig jaar. Nu ligt hij hier. Het is af.

## 8. Nachtstreek in F4c

Alle radiomomenten op een rij (de regels staan bij de missies). Rikus zendt "op tournee"; de melders bellen in; Ubbo belt drie keer live.

| Stap | Moment | Beller |
|---|---|---|
| n-winschoten | na afloop | Rikus zelf |
| O19 | Bel Rikus | Mevrouw Oldenhuis-Blauw |
| O20 | Bel Rikus + na afloop | Roelfien; een marktkoopman |
| O21 | Bel Rikus | Roelfien |
| O22 | Bel Rikus + na afloop | Ubbo, Oldenhuis Bakt; Jelle, Ljouwert |
| n-veendam | na afloop | Rikus zelf (de ene ernstige zin) |
| O23 | Bel Rikus | Wubbo, Veendam |
| O24 | Bel Rikus + live | Dries; Rikus op de rails met Tessa |
| O25 | Bel Rikus | Rikus zelf |
| O26 | Bel Rikus + na afloop | Wubbo; **Siebrand Mulder** (cel, Delfzijl) |
| O27 | Bel Rikus | Ubbo, Oldenhuis Bakt |
| O28 | Bel Rikus | Berend Bos |
| O29 | Bel Rikus | Rikus zelf |
| O30 | Bel Rikus (live) | Rikus zelf, Harm |
| O31 | Bel Rikus + live | Oma Trijntje; Rikus live |
| O32 | Bel Rikus + epiloog | De torenwachter; Rikus vanuit de studio |

**Vaste rubrieken:** de fietstunnel-update schuift door ("Bijna klaar. 2032."), het storingsbericht wordt in de Veenkoloniën "Storingsbericht: een brug bij Veendam is open. Volgens de brugwachter is dat geen storing. Dat is een tel te laat." en de peiling "Groeien of thuis?" sluit in de epiloog af (50-50).

## 9. Continuïteit, eindpunt en gevoelige onderwerpen

**Deel 1-3 blijven ongewijzigd.** F4c raakt niets wat al gespeeld is:
- De **Fjord Frituur** is de Escapade met het luik; de Gouden Eierbal staat in het museum "met twee namen op het bordje" (Deel 3), in Deel 4 komt er een derde bij (Trijntje, 1953).
- **Rikus' "laatste kwartier"** (slot Deel 3) wordt een grap: "Het was het eerste."
- **Oma Trijntje is 92** en won in 1953 de Snackprijs in Stad; de Ommelander Ronde van 1953 (Bourtange) verloor ze door een gekochte jury. Geen conflict: twee wedstrijden.
- **Mem Terpstra / Jelle:** de bakkerij die Ubbo "koopt" (O22) is Us Mem Snacks in Ljouwert; hij wordt teruggegeven (O32). Jelle's regel "Ze komen niet meer bij mem eten" (O1) wordt afgemaakt: "Ze eten weer."
- **Durk en Douwe** lopen over in O22 om Mem (niet om Tessa); in F4a waren ze nooit gemeen; nu staan ze er open. Ze brengen Oma naar Bourtange.
- **Berend Bos:** "Ik wil volgend jaar weer de bisschop zijn" (Deel 3) wordt "Ik wil niet meer verliezen". Hij zegt "Kon minder" (de hoogste trede na stilte).
- **De complimentenladder in F4c:** Goud (Dolf en Dina, O22), Valt mie nait of (Rieks en Wubbo, O27), Ow (de jury bij Ubbo's bal, O31), Braid noar de zin (Siemen), Kon minder (Lammert), stilte (Berend en Oma). Ubbo's Ow aan het einde is zijn eerste.
- **Harm** zegt "Laatste fase" sinds Deel 1; in O30 meent hij het.
- **Henks zender** (F4a O8) keert terug als het schroefje onder Ubbo's bumper (O31).
- **Siebrand en Lammert** (Eemsdelta) komen terug: Siebrand getuigt (O26), Lammert zet de sluis open en danst (O30, O31).
- **Dokter Dijkstra, Bert, Klaas** (Deel 1-3 en F4a) staan in het leger; Dijkstra "staat er toch".
- **Tammo en Tessa:** de ruzie (n-ruzie) is de enige echte; ze wordt opgelost zonder speech: Tammo zegt het in een paar woorden (vijf, dan zes). De stelregel blijft: Tammo noemt het belangrijke kort.
- **Personagebijbel:** Tessa geeft bevelen en tikt feiten af; Tammo zegt het belangrijke kort; Rikus vertelt nooit meer dan de speler weet; Durk maakt zinnen af, Douwe herhaalt.

**Credits en post-game: de technische regels.**
- De bestaande credits (`credits` in story.js) rollen één keer, als alle missies en uitdagingen af zijn (`endingProgress`). Met Deel 4 wordt dat "het echte einde" en telt `endingProgress` ook O1-O32 mee (een overgeslagen missie blijft open). **Voor saves die de credits al hebben gehad** (vlag `credits`): na O32 rolt een korte versie (vlag `credits4`) met alleen de nieuwe kaarten uit §3; ook die rolt één keer.
- `PARTS.nazomer` krijgt `end: 'Einde van Deel 4'`, `finale: true` en `card` met de epiloog. De bestaande `staart.finale` blijft zoals hij is; `story.js` moet twee finale-delen aankunnen (de epiloog van Deel 3 speelt nog steeds aan het einde van Deel 3; die van Deel 4 aan het einde van O32).
- Het "Einde"-kaartje ("Grunn is van jou") blijft het laatste beeld.
- De post-game haken (§3, einde) zijn alleen tekst; niets is vereist.

**Gevoelige onderwerpen (verhaal-document §8)**

| Onderwerp | In F4c |
|---|---|
| Gaswinning en aardbevingen | Twee stille momenten: de zin van Rikus bij de steigers (n-veendam) en de colonne die stil rijdt (O32). Geen grap, geen bedrijf, geen schurk. De naamkaart "Hoogezand-Sappemeer, de steigers" zegt het zacht. |
| Datacenters | Niet aanwezig in F4c. |
| Ter Apel | Komt niet voor, ook niet als woord. Het "klooster" uit het plan is verplaatst naar een fictief landgoed (O29); de keten loopt tot Bourtange; geen route of uitkijkpunt gaat via Ter Apel. |
| De grens | Alleen de fictieve **Grenswacht** met de Duitse collega: grappen over lijnen, papieren en thermoskannen. "Hier houdt het op. Voor mij." Geen nationalistische grap; geen echte dienst. Duitse regels zijn vriendelijk en krijgen een Nederlandse ondertitel (`DE`). |
| Armoede in Veenkoloniën en Oldambt | Mensen met trots en humor: Wubbo, Roelfien, Dries; Ubbo als uitbuiter. De Randstedelingen worden om hun verwachting geplaagd, nooit het dorp. |
| Wolven | Een foto op afstand; het spel laat niet toe dat je schiet, aait of opjaagt; Z10 is een hond in een pak, uitdrukkelijk. |
| Het beleg van Bourtange | Toneel: karton, meel, water; "geen doden". De historische beleg van 1672 wordt niet gegriefd: de vesting hield stand; wie nu wint is een bisschop in een gordijnmantel. |
| Echte bedrijven | Geen. Oldenhuis Bakt, Veenmeel, de Vetinspectie, de Stichting Veenspoor, Transport Wierda, Grenswacht zijn verzonnen. Plaatsen en gebouwen hebben hun echte naam. |
| Echte levende personen | Geen. |

**Afwijkingen van het plan (bewust)**
- Ring 3 niet vrij (O22 is het middenpunt); Westerwolde na O26 en zes voorrondes (plan: "zes voorrondes + O26": dat klopt, maar O26 hangt nu vast aan O25).
- Safehouse Oldambt in Beerta (plan: Termunten); filiaal in Roelfiens graanschuur.
- O29 verplaatst van het klooster naar een fictief landgoed.
- O32 "eerste vorst" → "de laatste zomeravond" (altijd zomer).
- O24 "Ubbo's grootboek in de stoomtrein" is "Kasboek, deel twee"; het grootboek van O14 (F4b) is Fokko's boekje (zie §1.3).
- O31 krijgt de drie stukken van H18 (kraam, achtervolging met duiven, jury) en een wissel naar Tessa.
- **Nieuwe stage-soorten** (in §11 met `NEW`): `mingle`, `fly`, `drop`, `evade`, `land`, `bridges` (honk, lag) in chase, `cycle`, `brawl`, `choose`, `arena` + `turncoat` in defend, `bridge` in defend, `follow`, `noise`, `swap`, `command`, `bake`, `pigeon` (bestaand, hergebruikt), `convoy`, `direct`, `rhythm`, `track`, `wait`, `arrive` (goal-type), `train` met `steam` en `light`. Nieuwe voertuigen: gewasspuiter (tweezitter), botsauto, brugboot, loc (stoom), paard (alleen als leidraad: Berends paard is NPC).

## 10. Echte plekken om te verifiëren (OSM)

Namen zoals ze in OSM zouden moeten staan; "Check" zegt wat de bouwer moet nakijken. Alles wat niet in deze lijst staat (de villa, de fabrieken, de snackbars, Huize Stilte, de hooiberg) is verzonnen.

| Plek | OSM (verwacht) | Gebruikt in | Check |
|---|---|---|---|
| Station Hoogezand-Sappemeer, Sappemeer Oost, Zuidbroek, Scheemda, Winschoten, Nieuweschans | `railway=station`/`halt` | n-winschoten, §5.1 | volgorde, haltenamen (Nieuweschans heet officieel "Bad Nieuweschans"?) |
| Zijtak Zuidbroek-Veendam | `railway=rail` | §5.1 | of Veendam personenhalte is |
| Museumspoor Stadskanaal-Musselkanaal | `railway=preserved` | O24, §5.1 | bestaat de lijn/halte, namen, stationsgebouwen |
| Winschoten: molen, Pagediep, Marktplein, Oostersingel, kermisplek | `man_made=windmill`, `waterway=canal`, `highway=*` | n-winschoten, O20, O21, O22 | welke molen (Molen Berg?), kermisterrein |
| Heiligerlee (monument) | `historic=monument` | §7 | naam en plek |
| Oostwold (vliegveldje) | `aeroway=aerodrome` | O20, §5 | naam, graspiste |
| Midwolda, Beerta (kerk, Dollarddijk), Scheemda | `place=village` | O19-O22 | afstanden; dijkweg |
| Oldambtmeer, Blauwestad, Midwolda (jachthaven) | `natural=water`, `place=*` | O19, §5 | bevaarbaarheid, zuidoever |
| Nieuweschans (wallen, Hoofdstraat), grensovergang bij Nieuweschans/Bunde | `historic=*`, `barrier=border_control` | O21, §5.8 | ligging van het bord |
| Veendam: Westerdiep, Oosterdiep, bruggen, sluis | `waterway=canal`, `bridge=movable` | O23, O27 | namen, beweegbare bruggen, schutting |
| Veendam industrieterrein | `landuse=industrial` | O26 | plek voor de fictieve fabriek |
| Hoogezand-Sappemeer, Kropswolde, Foxhol, Winschoterdiep (fietspad) | `place=*`, `waterway=canal` | O25, §5.4 | fietspad Stad-Hoogezand (± 14 km), strokartonterrein |
| Stadskanaal (Stadskanaal-kanaal), Musselkanaal, Mussel-Aa | `waterway=canal`, `place=town` | O24 | route langs de Mussel-Aa |
| Slochteren (Fraeylemaborg) | `historic=manor` | §5.12 | naam |
| Sellingen, Vlagtwedde, Bellingwolde, Wedde (Wedderborg) | `place=village`, `historic=manor` | O28, §5, §7 | namen, afstanden |
| Vesting Bourtange (gracht, bolwerken, poort, hoofdwacht, kerkje, molen) | `historic=fort`, `man_made=windmill` | O30, O31 | naam en vorm; ophaalbrug; stromen van de Ruiten Aa |
| Ruiten Aa | `waterway=river` | O28, O30 | stroomrichting, sluis |
| Grensovergang bij het Bourtangermoor (bij Rütenbrock) | `barrier=border_control` | O31 | ligging van het bord, wegennet |
| N33, N366, N362 | `ref=*` | §5.4 | `maxspeed` |
| Nieuw-Statenzijl, Punt van Reide | `place=*`, `natural=*` | §5.12 | bereikbaarheid, kijkplek |
| Vlagtwedde, Bellingwolde (bushaltes) | `public_transport=*` | §5.2 | buurtbus |

## 11. Data-bijlage (voor storyarc.js, missionstory.js, missions.js, banterlines.js, subtitles.js en de TTS-pijplijn)

Dezelfde vormen als F4a §11. Coördinaten staan open (`/* ... */`). Nieuwe stage-soorten en goal-types zijn met `NEW` gemarkeerd.

### A. storyarc.js

```js
// storyarc.js: add to SPEAKERS
  roelfien: 'Roelfien',
  eilert: 'Molenaar Eilert',
  oblauw: 'Mevrouw Oldenhuis-Blauw',
  wubbo: 'Brugwachter Wubbo',
  siemen: 'Boswachter Siemen',
  gerrit: 'Wolvenman Gerrit',
  floor: 'Floor',
  joost: 'Joost',
  dolf: 'Botsautobaas Dolf',
  dina: 'Jurylid Dina',
  rieks: 'Notaris Rieks',
  dries: 'Machinist Dries',
  berthus: 'Machinist Berthus',
  adviseur: 'Franchise-adviseur Rob',
  adviseuse: 'Franchise-adviseuse Sandra',
  grens: 'Grenswacht',
  grenzer: 'Grenzwächter',
  knecht: 'Knecht van Ubbo',
  gast: 'Gast',
  dorpeling: 'Bourtanger',
  everhard: 'Broeder Everhard',
  bor: 'Bor',

// storyarc.js: add to CHARACTERS (name cards)
  roelfien: { name: 'Roelfien', card: 'Graanboerin. Oma\'s nicht. Vliegt een gewasspuiter zoals anderen fietsen.', step: 'n-winschoten', bio: 'Dochter van Oma Trijntjes zus. Boert op de klei bij Beerta en vliegt zelf over haar land. Oma betaalde ooit de eerste trekker van haar vader; ze is hier om terug te betalen, en dat doet ze grondig.', quote: 'Wat je schuldig bent, betaal je terug. Met rente.' },
  eilert: { name: 'Molenaar Eilert', card: 'Molenaar. Draait mee met de wind. Ziet het graan voor het groeit.', step: 'n-winschoten', bio: 'Molenaar in Winschoten en melder van het Oldambt. Neef van de torenwachter, van de kosteres en van de sluiswachter. Hij zit hoog en kijkt ver.', quote: 'De wind komt altijd terug. De mensen ook.' },
  oblauw: { name: 'Mevrouw Oldenhuis-Blauw', card: 'Ubbo\'s zus. Villa aan het meer. Koopt wat haar broer bakt.', step: 'O19', bio: 'Ubbo\'s oudere zus, getrouwd met geld uit het meer. Zij kocht de grond, hij bakte erop. Ze eet geen eierballen, maar ze weet precies wat ze waard zijn.', quote: 'Mijn broer bakt. Ik koop.' },
  wubbo: { name: 'Brugwachter Wubbo', card: 'Brugwachter. Opent altijd. Een tel te laat.', step: 'n-veendam', bio: 'Brugwachter van de kanaalwijken van Veendam en melder van de Veenkoloniën. Zijn vader leende in 1953 tien gulden van Trijntje. Hij opent elke brug, nooit precies op tijd.', quote: 'Ik open altijd. Het moment spreken we niet af.' },
  dries: { name: 'Machinist Dries', card: 'Stoker, machinist. Veertig jaar kolen. Geen één klacht.', step: 'O24', bio: 'Rijdt de museumstoomtrein tussen Stadskanaal en Musselkanaal. Heeft de locomotief twintig jaar verzorgd en praat er zachter over dan over zijn eigen kinderen.', quote: 'Stoom vergeeft niks. Behalve een goeie stoker.' },
  siemen: { name: 'Boswachter Siemen', card: 'Boswachter. Kent elk spoor. Meldt het, en loopt door.', step: 'n-westerwolde', bio: 'Boswachter in Westerwolde en melder van de laatste regio. Zit in Ubbo\'s laatste jury en zegt niks. Zijn neven zitten in de toren, in de molen en op de sluis.', quote: 'Wie stil is, hoort alles.' },
  gerrit: { name: 'Wolvenman Gerrit', card: 'Wolvenman. Zeker van zijn zaak. Zijn hond is minder zeker.', step: 'Z17', bio: 'Is al jaren zeker dat de wolf terug is. Zijn camera, zijn kijker en zijn hond Bor wijzen elk een andere kant op.', quote: 'Hij is er. Ik voel het. Bor niet.' },
  floor: { name: 'Floor', card: 'Uit het westen. Zoekt iets echts. Betaalt contant.', step: 'Z9', bio: 'Verhuisde met haar man naar een boerderij bij Midwolda omdat het er "echt" was. Zoekt authenticiteit, en betaalt er graag voor.', quote: 'Is dit nou het echte leven?' },

// storyarc.js: PARTS.nazomer (F4c turns the ring-1 card into the ending of Deel 4; F4a/F4b stay as they are)
  nazomer: { title: 'Deel 4: Nazomer', name: 'De Ommelander Ronde', date: '15 september', open: true, end: 'Einde van Deel 4', finale: true,
    recap: [ /* unchanged from F4a */ ],
    card: [['Rikus', 'Moi. Nachtstreek. Ik zei in augustus dat het het laatste kwartier was. Dat was een misrekening. Het was het eerste.'],
      ['Rikus', 'De Gouden Eierbal staat in het museum. Het bordje heeft drie namen. De derde is van een mevrouw van tweeënnegentig, eerste prijs, Ommelander Ronde, 1953. Ze kwam er zeventig jaar te laat. Op tijd.'],
      ['Rikus', 'Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt nog tot de Korenbeurs. Hij is vandaag ook gebleven.'],
      ['Rikus', 'De torenwachter belde: "De rij is lang. Ik meld alleen." En: "Het is zomer." Hij zei het twee keer.'],
      ['Rikus', 'Berend Bos stuurde een brief. Hij wil volgend jaar niet meer verliezen. Hij heeft het niet over winnen. Hij wil gewoon niet.'],
      ['Rikus', 'De peiling "Groeien of thuis": uitslag. Groeien, 50. Thuis, 50. Eén luisteraar in Paddepoel heeft niet gestemd. Ik zeg niks.'],
      ['Rikus', 'En ik heb de tweede friet. Hij heeft betaald. Ze zijn samen. Ze zeggen het niet. Maar dat doen ze. Moi.']] },

// storyarc.js: MISSION_IDS (append only, after F4a/F4b)
  'blauwestad', 'spuiter', 'grens', 'botsauto', 'wijken', 'stoom', 'strokarton', 'meel', 'veendam', 'bisschop', 'klooster', 'beleg', 'laatste', 'thuis',

// storyarc.js: STEPS (part 'nazomer'): the n-* activity steps of F4c (the O19-O32 mission steps follow, generated from §3)
  { id: 'n-winschoten', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 3, region: 'oldambt', why: 'Ik neem de trein. Ik kijk uit het raam. Dat kan ik.',
    title: 'Met de trein naar Winschoten', goal: { type: 'train', to: 'Winschoten', line: 'nieuweschans', cab: 'berthus' },
    lead: ['A', 'Oma belde. Nummer drie op het lijstje heet Roelfien en woont bij Beerta. Ze haalt ons op in Winschoten. "Met iets groots," zei Oma. Ik hoop dat het geen koe is.'],
    say: ['A', 'Het Oldambt. Ik heb gelezen dat het hier de beste klei van Nederland is.'],
    done: ['A', 'Roelfien wacht bij het station. Naast een pick-up en een verhaal.'],
    contact: [radio([
      ['rikus', 'Nachtstreek, op tournee. Vanavond vanuit het Oldambt.', { tag: 'warm, als nacht-dj op de radio' }],
      ['rikus', 'De hemel is hier groter dan de dorpen. Dat zegt niks over de dorpen. Dat zegt iets over de hemel.', { tag: 'droog, als nacht-dj op de radio' }],
    ], '')],
    scene: { kicker: 'Winschoten, station en molen', lines: [ /* the scene lines of §3 n-winschoten, verbatim */ ] } },
  { id: 'n-beerta', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 3, region: 'oldambt', why: 'Ik regel het filiaal. Jij mag het bed testen.',
    title: 'Een filiaal aan de Dollard', goal: { type: 'filiaal', at: 'beerta' },
    lead: ['T', 'Roelfien zegt: ze heeft een graanschuur bij Beerta waar een luik in kan. En een dijkhuisje aan de Dollard. Het bed is groot.'],
    say: ['T', 'Een dijkhuisje. Met een luik. Dat is hoe iedereen hier begint.'],
    done: ['T', 'Filiaal vijf: de graanschuur bij Beerta. Roelfien bakt alleen als het droog is. Het is hier altijd bijna droog.'],
    scene: { kicker: 'Het dijkhuisje, Beerta', lines: [ /* §3 n-beerta */ ] } },
  { id: 'n-aanbod', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 3, region: 'oldambt', why: 'Ik ga praten. Ik ga luisteren. Jij mag meekijken.',
    title: 'Het terras', goal: { type: 'scene', at: 'winschoten-kermisterras' },   // NEW goal type: scene at a spot
    lead: ['T', 'Hij wacht op het terras. Alleen jij, zei hij. Ik sta bij de schiettent. Ik kijk niet. Ik kijk wel.'],
    say: ['T', 'Ik schiet op blikjes. Dat helpt.'],
    scene: { kicker: 'Het terras van de kermis, Winschoten', lines: [ /* §3 n-aanbod */ ] } },
  { id: 'n-ruzie', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 3, region: 'oldambt', why: 'Ik loop even. Ik kom terug. Of niet.',
    title: 'De dijk bij nacht', goal: { type: 'scene', at: 'dollarddijk-nacht' },
    lead: ['A', 'Tammo. Waar ben je? Het was een gesprek. Ik heb nog niks getekend.'],
    scene: { kicker: 'De Dollarddijk, Beerta, nacht', lines: [ /* §3 n-ruzie */ ] } },
  { id: 'n-veendam', part: 'nazomer', kind: 'activity', player: 'anita', solo: true, built: true, ring: 3, region: 'veenkolonien', why: 'Ik rij zelf. Ik wil even niet praten.',
    title: 'Naar Veendam, alleen', goal: { type: 'arrive', at: 'veendam-brug' },   // NEW goal type
    lead: ['trijntje', 'Nummer vijf op het lijstje: Wubbo, Veendam. Hij heeft een brug. Vraag of hij nog weet wie ik ben. Hij weet het. Hij is alleen traag.'],
    say: ['A', 'De Veenkoloniën. Rechte wegen, rechte kanalen en geen enkel excuus om te laat te zijn.'],
    done: ['trijntje', 'Wubbo stuurt een bericht: "Ze is er. Ik heb de brug open gedaan. Een tel te laat."'],
    contact: [radio([
      ['rikus', 'Nachtstreek, op tournee. Vanavond vanuit de Veenkoloniën. Rechte kanalen, rechte wegen en mensen die je nooit hoort klagen. Ze hebben geen tijd. Ze moeten vroeg op.', { tag: 'warm, als nacht-dj op de radio' }],
      ['rikus', 'Tessa rijdt vanavond alleen. Ik zeg niks. Dat is mijn vak.', { tag: 'zacht, als nacht-dj op de radio' }],
      ['rikus', 'Hier wonen mensen die al jaren wachten op een gewoon huis. Ik zeg niks. Ik zeg: ze luisteren.', { tag: 'ernstig, zacht, als nacht-dj op de radio' }],
    ], '')],
    scene: { kicker: 'Veendam, de brug', lines: [ /* §3 n-veendam */ ] } },
  { id: 'n-brugwachter', part: 'nazomer', kind: 'activity', player: 'tammo', built: true, ring: 3, region: 'veenkolonien', why: 'Ik ga het huisje bekijken. Ik ben goed in brugwachtershuisjes. Er zit een stoel in.',
    title: 'Een brugwachtershuisje', goal: { type: 'filiaal', at: 'veendam' },
    lead: ['A', 'Wubbo zegt: er zit een luik in zijn huisje. En een boot onder de brug. En een stoel. Hij had alleen die stoel.'],
    say: ['A', 'Een huisje met een luik. En een brug. Het klopt wel.'],
    done: ['A', 'Filiaal zes: Wubbo\'s brugwachtershuisje. Hij bakt alleen als er geen schip komt. Er komt altijd een schip.'],
    scene: { kicker: 'Het brugwachtershuisje, Veendam', lines: [ /* §3 n-brugwachter */ ] } },
  { id: 'n-westerwolde', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 4, region: 'westerwolde', why: 'Ik rij. Dit is de laatste regio. Ik wil het zien.',
    title: 'Zonder trein', goal: { type: 'arrive', at: 'westerwolde-bosrand' },
    lead: ['trijntje', 'Nummer zeven is geen naam. Het is een man op een paard. Hij wacht bij de bosrand bij Sellingen. Hij is ook niet aardig. Maar hij is van mij.'],
    say: ['A', 'De heide staat in bloei. Zo ver je kijkt.'],
    scene: { kicker: 'De bosrand bij Sellingen', lines: [ /* §3 n-westerwolde */ ] } },
  { id: 'n-boshut', part: 'nazomer', kind: 'activity', player: 'anita', built: true, ring: 4, region: 'westerwolde', why: 'Ik pak de sleutel. Jij pakt het deksel van de thermoszak.',
    title: 'Een boshut', goal: { type: 'filiaal', at: 'westerwolde' },
    lead: ['siemen', 'Er staat een hut bij het bos. Er kan een luik in. Ik ben boswachter. Ik hou van luiken die er niet te zien zijn.'],
    say: ['A', 'Een hut. Met een luik. Het is dezelfde methode.'],
    done: ['A', 'Filiaal zeven: de bosrand bij Sellingen. Siemen bakt niet. Hij kijkt toe. Dat is zijn manier.'],
    scene: { kicker: 'De boshut', lines: [ /* §3 n-boshut */ ] } },

// storyarc.js: SIDE series (NEW kind 'side': a "?" on the map, optional, never blocks the story; goal { type: 'side', series } )
  { id: 'Z9',  part: 'nazomer', kind: 'side', series: 'randstedelingen', player: 'anita', ring: 3, region: 'oldambt', optional: true, built: true, title: 'Echt Gronings', reward: 500,  lead: ['T', 'Floor wil een echte boerderijdag. Met een koe die muu zegt.'], done: ['T', 'Twee koeien. Geen telefoons. Floor huilde.'] },
  { id: 'Z10', part: 'nazomer', kind: 'side', series: 'randstedelingen', player: 'tammo', ring: 3, region: 'oldambt', optional: true, built: true, title: 'Wolf gezien', reward: 600,   lead: ['A', 'Ze willen een wolf zien. Je buurman heeft een hond.'], done: ['A', 'De hond heet Bram. Hij was heel overtuigend.'] },
  { id: 'Z11', part: 'nazomer', kind: 'side', series: 'randstedelingen', player: 'tammo', ring: 3, region: 'oldambt', optional: true, built: true, title: 'Boerenbruiloft', reward: 800, lead: ['A', 'Twaalf trekkers. Een kerk. Jij rijdt voorop.'], done: ['A', 'Twee keer ja. Twaalf trekkers, op tijd.'] },
  { id: 'Z12', part: 'nazomer', kind: 'side', series: 'randstedelingen', player: 'anita', ring: 3, region: 'oldambt', optional: true, built: true, title: 'Verhuisd', reward: 700,   lead: ['T', 'Ze gaan terug naar het westen. Met een koe in brons.'], done: ['T', 'Ze komen terug in de zomer. Voor de heide.'] },
  { id: 'Z13', part: 'nazomer', kind: 'side', series: 'wubbo', player: 'tammo', ring: 3, region: 'veenkolonien', optional: true, built: true, title: 'Open, dicht', reward: 500,     lead: ['wubbo', 'Tien bruggen, een fanfare. Ik heb jouw tel nodig.'], done: ['wubbo', 'Op de maat. Dat heb ik nog nooit meegemaakt.'] },
  { id: 'Z14', part: 'nazomer', kind: 'side', series: 'wubbo', player: 'anita', ring: 3, region: 'veenkolonien', optional: true, built: true, title: 'Kanaalspringer', reward: 700, lead: ['wubbo', 'Een halfopen brug. Een schans. Een Escapade.'], done: ['wubbo', 'Drie sprongen. Een tel te laat. Precies goed.'] },
  { id: 'Z15', part: 'nazomer', kind: 'side', series: 'wubbo', player: 'anita', ring: 3, region: 'veenkolonien', optional: true, built: true, title: 'De verkeerde kant', reward: 600, lead: ['wubbo', 'Een jacht vaart links. Er komt een vrachtboot. Rechts is rechts.'], done: ['wubbo', 'Hij ging naar huis. Dank.'] },
  { id: 'Z16', part: 'nazomer', kind: 'side', series: 'wubbo', player: 'tammo', ring: 3, region: 'veenkolonien', optional: true, built: true, title: 'Pensioen', reward: 1000,       lead: ['wubbo', 'Ik wil één keer alle bruggen tegelijk open. Dan ben ik klaar.'], done: ['wubbo', 'Ik meld alleen. Ik ben thuis.'] },
  { id: 'Z17', part: 'nazomer', kind: 'side', series: 'wolvenman', player: 'tammo', ring: 4, region: 'westerwolde', optional: true, built: true, title: 'Sporen', reward: 400,           lead: ['gerrit', 'De wolf is terug. Ik voel het. Bor niet.'], done: ['gerrit', 'Het was Bor. Volgende keer weet ik het.'] },
  { id: 'Z18', part: 'nazomer', kind: 'side', series: 'wolvenman', player: 'anita', ring: 4, region: 'westerwolde', optional: true, built: true, title: 'Volle maan', reward: 500,       lead: ['gerrit', 'Zes uur zitten. Stil. Jij bent daar goed in.'], done: ['gerrit', 'Een uil, een ree en de buren. Mooi.'] },
  { id: 'Z19', part: 'nazomer', kind: 'side', series: 'wolvenman', player: 'tammo', ring: 4, region: 'westerwolde', optional: true, built: true, title: 'Toch een wolf', reward: 900,    lead: ['gerrit', 'Hij is er. Echt. Kom. Zachtjes.'], done: ['gerrit', 'Eén foto. Op afstand. Hij liep weg. Hij had gelijk.'] },
```

*(De O19-O32 mission steps, de `CLUES` en de `after`-berichten volgen hieronder, gegenereerd uit §3 zodat ze letterlijk gelijk zijn.)*

```js
// storyarc.js: STEPS (part 'nazomer'), O19-O32 (generated from §3; rewards equal the missions.js rewards)
  { id: 'O19', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 3, region: 'oldambt', mission: 'blauwestad', why: 'Ik ga. Ik heb een jurk. Jij hebt een auto met de motor aan.',
    title: 'Blauwe stad, rode auto', reward: 2600,
    lead: ['T', 'Tessa. Er is een sms van hem. "Het feest van mijn zus. Kom alleen. – U.O." Ik heb er een slecht gevoel bij.'],
    contact: [belRikus([

    ], 'Mevrouw Oldenhuis-Blauw, Oldambtmeer')],
    after: [['U. Oldenhuis', 'Mooie sloep. Mijn zus stuurt je de rekening voor de jurk van je nicht. – U.O.'], ['Kiekdoar', 'Sloep gestolen op het Oldambtmeer, teruggevonden in Midwolda met een natte kerkjurk erin. Eigenaresse: \'Hij is verzekerd. De jurk niet.\'']],
  },
  { id: 'O20', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 3, region: 'oldambt', mission: 'spuiter', why: 'Ik vlieg. Ik kijk niet naar beneden. Ik kijk naar het graan.',
    title: 'Laag over het graan', reward: 2800,
    lead: ['A', 'Roelfien heeft een gewasspuiter. Ze heeft het jurylijstje laten drukken: drieduizend vellen. We strooien ze uit over de markt in Winschoten. Jij vliegt. Ik ben navigator. Op de grond.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Aan de lijn: een boerin uit het Oldambt, om zes uur \'s ochtends. Dat is voor haar middag.', {  }],
      ['roelfien', 'Rikus. Roelfien, Beerta. Er vliegt vanochtend een vliegtuig laag over mien graan. Dat ben ik niet. Dat is een vriend.', {  }],
      ['rikus', 'Is die vriend bang?', {  }],
      ['roelfien', 'Hij zegt van niet. Hij zegt het erg zacht.', {  }],
    ], 'Roelfien, Beerta'), radio([
      ['rikus', 'Nachtstreek. Er viel vanochtend papier uit de lucht boven Winschoten. De burgemeester zou het eerst "een vorm van reclame" noemen.', {  }],
      ['reiziger', 'Ik ken drie van die namen. Een zit in mijn kerkenraad.', {  }],
      ['rikus', 'En?', {  }],
      ['reiziger', 'Ik ga zondag een vraag stellen. In de koffiepauze.', {  }],
    ], 'een marktkoopman, Winschoten')],
    after: [['U. Oldenhuis', 'Papier. Leuk. Ik heb meer papier. – U.O.'], ['Kiekdoar', 'Papier uit de lucht boven de markt van Winschoten: een lijst met namen van de jury. Piloot onbekend. Een vlieger had zijn ogen dicht.']],
  },
  { id: 'O21', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 3, region: 'oldambt', mission: 'grens', why: 'Ik rij. Jij houdt de kaart vast en zegt wanneer het bord komt.',
    title: 'Grensgevoel', reward: 2600,
    lead: ['T', 'Tessa. Roelfien heeft drie vettrucks gezien op de weg langs de Dollard. Duits vet, uit Leer. Voor de voorronde. Ze rijden naar Winschoten, door de achterdeur.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Het regent papier in Winschoten en het is niet eens oktober.', {  }],
      ['roelfien', 'Rikus. Roelfien. Drie vettrucks, over de dijkweg. Zonder licht. Ze hebben geen reden om stiekem te doen.', {  }],
      ['rikus', 'Behalve één.', {  }],
      ['roelfien', 'Behalve één. Ik zie ze door de verrekijker. Ik meld alleen. Dat heb ik van de molenaar.', {  }],
    ], 'Roelfien, Beerta')],
    after: [['U. Oldenhuis', 'Vet is vet. Ook in Duitsland. – U.O.'], ['Kiekdoar', 'Drie opleggers zonder cabine op de Dollarddijk bij Beerta. Grenswacht: \'Wij zijn voor de lijn. De rest regelt de lijn zelf.\'']],
  },
  { id: 'O22', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 3, region: 'oldambt', mission: 'botsauto', why: 'Ik pak de botsauto. Jij bakt. Jij bakt beter als ik niet kijk.',
    title: 'Botsauto\'s, deel twee', reward: 3500,
    lead: ['A', 'Voorronde vijf, in Winschoten, op de kermis. Dolf van de botsauto\'s zit in de jury. Eén stekker, één kraam, en Durk en Douwe aan de overkant.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Ik sta tussen een draaimolen en een schiettent op de kermis in Winschoten. Hier ruikt het naar suiker en vet. Dat is ook wat ik ben.', {  }],
      ['ubbo', 'Rikus. Vanavond de voorronde Oldambt. Mijn mensen zijn er. Ook een paar die u kent.', {  }],
      ['rikus', 'Zijn dat de mensen die voor u betalen of de mensen die voor u rijden?', {  }],
      ['ubbo', 'Ik betaal per brein, Rikus. Dat zei ik toch?', {  }],
    ], 'Ubbo, Oldenhuis Bakt'), radio([
      ['rikus', 'Nachtstreek. Ik heb een beller uit Ljouwert. Hij klinkt alsof hij net gehuild heeft en dat ontkent.', {  }],
      ['jelle', 'Rikus. Jelle. Durk en Douwe zijn net bij mem aan tafel gaan zitten. Beide. Ze hebben niks gezegd. Ze eten alleen.', {  }],
      ['rikus', 'Hoe voelt dat, Jelle?', {  }],
      ['jelle', 'Als thuis. Alleen met twee extra stoelen.', {  }],
    ], 'Jelle, Ljouwert')],
    after: [['U. Oldenhuis', 'Vijf. Nog twee. Kom naar het terras, Tessa. – U.O.'], ['Kiekdoar', 'Voorronde Oldambt naar Stadse frietwagen. Botsautobaas: \'Goud.\' Twee botsautochauffeurs uit Friesland nemen vroegtijdig ontslag, hand in hand.']],
  },
  { id: 'O23', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 3, region: 'veenkolonien', solo: true, mission: 'wijken', why: 'Ik ga kijken. Alleen kijken.',
    title: 'Wijk na wijk', reward: 2400,
    lead: ['wubbo', 'Mevrouw. Er zijn mensen die zeggen dat u eenenveertig snackbars wilt zien. Ze wachten bij de snackbar bij mijn brug. Ik zou het laten. Maar ik meld alleen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Vanuit een brugwachtershuisje in Veendam. Het is klein. Er staat een stoel en een thermoskan.', {  }],
      ['wubbo', 'Rikus. Wubbo. Er komt vandaag een mevrouw van de Fjord kijken bij de snackbar. Ik zou haar graag een tel eerder laten openen. Maar dat doe ik nooit.', {  }],
      ['rikus', 'Waarom niet?', {  }],
      ['wubbo', 'Dan ben ik een tel te vroeg. Dat is nog erger.', {  }],
    ], 'Wubbo, Veendam')],
    after: [['U. Oldenhuis', 'Je was bij mijn snackbar. Mooi. Kom morgen naar de trein. Om te tekenen. – U.O.'], ['Kiekdoar', 'Bestelbus klem tussen twee bruggen in Veendam. Brugwachter: \'Dat was niet de bedoeling. Ik heb het wel laten gebeuren.\'']],
  },
  { id: 'O24', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 3, region: 'veenkolonien', solo: true, mission: 'stoom', why: 'Ik ga erheen. Ik wil zien wat ik teken.',
    title: 'Stoom', reward: 3200,
    lead: ['wubbo', 'Hij zet u op de trein van zeven uur. De stoomtrein, de salon. Er staat "franchise-dag" op het bordje. Er zit eenenveertig keer vet aan alles daar. Ik zou een jas aandoen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op de rails. Ik heb een beller met kolenstof in zijn stem.', {  }],
      ['dries', 'Rikus. Dries, machinist op de stoomtrein. Vanavond is er een gesloten rit. Een salonrijtuig. Een meneer die niet eet maar wel betaalt.', {  }],
      ['rikus', 'Bent u familie van de torenwachter?', {  }],
      ['dries', 'Nee. Ik ken hem van de radio. Maar ik zie alles wat achter mij rijdt. Dat is mijn werk. Het is geen melden.', {  }],
    ], 'Dries, de stoomtrein')],
    after: [['U. Oldenhuis', 'Het boek is van mij, Tessa. Ik laat het niet uit mijn handen. – U.O.'], ['Kiekdoar', 'Salonrijtuigen op het museumspoor bij Musselkanaal achtergelaten door de locomotief. Franchisenemers: \'De thee was koud, en de baas was boos.\'']],
  },
  { id: 'O25', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 3, region: 'veenkolonien', mission: 'strokarton', why: 'Ik fiets. Tegen de wind in. Dat bouwt karakter.',
    title: 'Strokarton', reward: 2200,
    lead: ['A', 'Ik zit in de strokartonfabriek bij Hoogezand. Ze zijn met z\'n zessen. Ik regel het zelf. Je hoeft niet te komen.'],
    contact: [belRikus([
      ['rikus', 'Geen beller vanavond. Ik heb een berichtje. Er staat: "Ik fiets." Het is van een Stadjer. Hij zegt niet waarheen. Ik zeg niks.', {  }],
    ], '')],
    after: [['U. Oldenhuis', 'Karton valt. Papier blijft. Het boek is een kopie, Tessa. Ik heb er drie. – U.O.'], ['Kiekdoar', 'Lawine van kartonbalen in een oude fabriek bij Hoogezand. Zes mannen in gele jassen onder het karton, allen ongedeerd. Politie neemt het boek mee.']],
  },
  { id: 'O26', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 3, region: 'veenkolonien', mission: 'meel', why: 'Ik pak de aanpak. Zeg het maar: stil, slim of hard.',
    title: 'Aardappelmeel', reward: 3000,
    lead: ['T', 'De echte jurylijst ligt in de zetmeelfabriek, in een kluis. Plus iets uit 1953, volgens Wubbo. Er zijn drie manieren. Jij kiest.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Ik sta voor een fabriek die naar pannenkoeken ruikt. Dat is zetmeel. Ik had dat niet geweten.', {  }],
      ['wubbo', 'Rikus. Wubbo. De silo\'s van de zetmeelfabriek zijn vannacht open. Er staat een bewaker bij die dacht dat hij alleen was.', {  }],
      ['rikus', 'Is hij alleen?', {  }],
      ['wubbo', 'Ik meld alleen: hij had een nieuwe pet.', {  }],
    ], 'Wubbo, Veendam'), radio([
      ['rikus', 'Nachtstreek. Ik heb een beller die zegt dat hij mag bellen. Dat is nieuw. Ik hoor een deur dichtgaan.', {  }],
      ['siebrand', 'Rikus. Siebrand Mulder. Ik bel vanuit het bureau in Delfzijl. De agente zegt dat ik mag praten. Ik ben dat niet gewend.', {  }],
      ['rikus', 'Waarover wilt u praten?', {  }],
      ['siebrand', 'Over vaten. Over OB. Over mijn opa, die in 1953 paling voer voor een kar in Veendam. Ik heb een verklaring afgelegd.', {  }],
      ['rikus', 'Waarom nu?', {  }],
      ['siebrand', 'Hij noemde mij betrouwbaar. Ik ben dat niet. Maar hij schreef het op papier. En papier is wat hij zelf gebruikt.', {  }],
    ], 'Siebrand Mulder, politiebureau Delfzijl, de Eemsdelta-terugblik')],
    after: [['U. Oldenhuis', 'Mijn lijst. Mijn vel. Mijn opa. Ik zie je in de vesting, Tessa. Neem je vriend mee. – U.O.'], ['Kiekdoar', 'Alles wit bij de zetmeelfabriek in Veendam. Bewakers wit tot aan hun pet. Een meneer vroeg of hij even mocht zitten. Het mocht.']],
  },
  { id: 'O27', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 3, region: 'veenkolonien', mission: 'veendam', why: 'Ik bak. Ik sta op een brug. Dat voelt als thuis, op een raar soort manier.',
    title: 'Veendam, laatste kans', reward: 3800,
    lead: ['A', 'Voorronde zes, in Veendam. De kraam staat op Wubbo\'s brug. Er komt een schip. De brug moet open. Hij kan niet wachten. De jury zit op de kade.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, op tournee. Ik sta op een brug in Veendam. Hij beweegt. Ik heb geen vast gevoel in mijn knieën.', {  }],
      ['ubbo', 'Rikus. Veendam is mijn thuis. Daar ben ik geboren, daar ligt mijn fabriek. Vandaag stuur ik alles.', {  }],
      ['rikus', 'Alles?', {  }],
      ['ubbo', 'Alles. Mijn mensen, mijn schepen en mijn zus. Er is een laatste kans, Rikus. En ik pak hem.', {  }],
    ], 'Ubbo, Oldenhuis Bakt')],
    after: [['U. Oldenhuis', 'Zes. Nog één. Het wordt zaterdag, Tessa. – U.O.'], ['Kiekdoar', 'Kraam op een ophaalbrug in Veendam, drie schepen, nul schade. Brugwachter: \'Een tel te laat is ook een manier van op tijd.\'']],
  },
  { id: 'O28', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 4, region: 'westerwolde', mission: 'bisschop', why: 'Ik rij. Achter een paard aan. Dat is mijn tempo.',
    title: 'Een bisschop in het bos', reward: 1200,
    lead: ['A', 'Berend heeft een plan. Hij zegt dat hij het veertig jaar heeft geoefend. Ik snap niet wat er te oefenen valt aan verliezen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek. Ik heb een beller uit de Schildersbuurt. Hij belt zelden. Hij brengt dan meestal een brief.', {  }],
      ['berend', 'Rikus. Berend. Ik zit op een paard. Het is een heel groot paard. Hij heet Münster.', {  }],
      ['rikus', 'Gaat u het weer verliezen, Berend?', {  }],
      ['berend', 'Nee. Ik heb een plan. Dit keer win ik. Ik heb veertig jaar geoefend.', {  }],
    ], 'Berend Bos, Stad')],
    after: [['Harm-Jan', 'Gevonden in de klei van Uithuizen. Geen goud. Brons. Er staat Trijntje op. Ik graaf niet. Ik piep. – H-J.'], ['U. Oldenhuis', 'Een bisschop. Op een paard. In een vesting. Dat is een museum. – U.O.'], ['Kiekdoar', 'Man in bisschopsgewaad op grijs paard in de bossen bij Sellingen. Boswachter: \'Ik zag niks.\'']],
  },
  { id: 'O29', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 4, region: 'westerwolde', mission: 'klooster', why: 'Ik ga. Stilte kan ik. Ik oefen het al twaalf jaar.',
    title: 'Stil in het klooster', reward: 3000,
    lead: ['A', 'Ubbo\'s laatste jury logeert in een stiltehuis. Drie van hen krijgen morgenochtend een envelop. Als jij ze ruilt, ruilen zij mee. Je mag niets laten horen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, de stilste uitzending van het jaar. Ik draai niks. Ik zeg niks. Ik adem alleen. Als jullie dat horen, ben ik er.', {  }],
    ], '')],
    after: [['U. Oldenhuis', 'Mijn jury heeft slecht geslapen. Dat is vreemd. De bedden zijn nieuw. – U.O.'], ['Kiekdoar', 'Stiltehuis bij Sellingen: collectebus \'s nachts onverwacht vol. Beheerder: \'Het dak is gered. Door wie, weten we niet. De kat zegt niks.\'']],
  },
  { id: 'O30', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 4, region: 'westerwolde', mission: 'beleg', why: 'Ik leid. Jij zit bij de duiven. Zeg waar het grind begint.',
    title: 'Het beleg', reward: 5000,
    lead: ['berend', 'Het leger staat klaar. Ik ben de bisschop. Jij bent de generaal. Dat is voor het eerst dat een Stadjer een leger leidt dat ik niet verraad.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, in het daglicht. Ik voel me een vleermuis. Ik sta op de heide ten noorden van Vesting Bourtange. Er zijn kartonnen kanonnen. Ik tel er zeven.', {  }],
      ['rikus', 'De torenwachter belde: "Ik zie een vesting. Er staat een leger voor. Het is Gronings." Hij meldt alleen.', {  }],
      ['harm', 'De vesting is afgesloten. Laatste fase.', {  }],
      ['A', 'Harm. Dit is écht de laatste fase.', {  }],
      ['harm', '…Ik zeg het nu voor het eerst met overtuiging.', {  }],
    ], '')],
    after: [['U. Oldenhuis', 'Het beleg. Karton. Meel. Duiven. Dat is geen leger. Dat is een parade. Ik was erbij. – U.O.'], ['Kiekdoar', 'Vesting Bourtange \'genomen\' door een leger van karton, meel en duiven. Voor het eerst in 354 jaar wint de belegeraar. Bisschop: \'Dit is verkeerd.\' Dokter: \'Er is geen gewonde. Ik sta er toch.\'']],
  },
  { id: 'O31', part: 'nazomer', kind: 'mission', player: 'tammo', built: true, ring: 4, region: 'westerwolde', mission: 'laatste', why: 'Ik bak. Daar ben ik goed in. De rest is aan jou.',
    title: 'De laatste ronde', reward: 6000,
    lead: ['A', 'Het is zover. Het laatste bord. Eén jury. Eén bal. Ubbo zit op het podium. Ik zit naast je.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, in het daglicht, het laatste uur. Aan de lijn: een dame van tweeënnegentig, uit een limousine met een motorkap van een trekker.', {  }],
      ['trijntje', 'Rikus. Trijntje. Ik ben er. Ik zit in de schaduw. Het is warm. Het is een goede dag.', {  }],
      ['rikus', 'En de eierbal?', {  }],
      ['trijntje', 'Die is van mijn kleinzoon. Die is van mijn kleinzoon en zijn vriendin. Dat is nog beter.', {  }],
    ], 'Oma Trijntje, in de vesting')],
    after: [['U. Oldenhuis', 'Ik heb geen telefoon meer. Dit is een bericht van de agent. Hij zegt dat ik \'proef\' moet schrijven. Proef. – U.O.'], ['Mem Terpstra', 'Foar myn jonge. En foar Trijntje. Ik kom nog wel op bezoek. – M.'], ['Kiekdoar', 'Gouden Eierbal onderschept op de grens bij Bourtange. Patatbaron aangehouden voor uitvoer zonder vergunning. Grenswacht: \'Wij zijn voor de lijn.\'']],
  },
  { id: 'O32', part: 'nazomer', kind: 'mission', player: 'anita', built: true, ring: 4, region: 'westerwolde', mission: 'thuis', why: 'Ik rij. Jij zit naast me. Dat is hoe het hoort.',
    title: 'Thuis', reward: 2000,
    lead: ['trijntje', 'Het is tijd, jongens. Ik wil naar huis. En ik wil niet alleen.'],
    contact: [belRikus([
      ['rikus', 'Nachtstreek, de laatste rit. De torenwachter belt.', {  }],
      ['torenwachter', 'Rikus. Torenwachter. Ik zie een colonne. Hij komt uit het oosten. Hij is lang. Hij heeft een frietwagen voorop.', {  }],
      ['rikus', 'En?', {  }],
      ['torenwachter', 'Ik meld alleen. Ik ben blij.', {  }],
    ], 'de torenwachter, d\'Olle Grieze')],
    after: [['Oma Trijntje', 'Goed gedaan. Ik slaap nu. – Oma.'], ['Mem Terpstra', 'Foar myn jonges. – M.'], ['Kiekdoar', 'Colonne van tweeëndertig voertuigen rijdt door vier regio\'s naar de Vismarkt. Politie: \'Wij zijn alleen komen kijken.\' Gemeente: \'De vergunning is weer van de Fjord Frituur. Het was een formaliteit.\'']],
  },
```

```js
// storyarc.js: CLUES (O19-O32)
  { step: 'O19', kind: 'clue', title: 'Het feest van mevrouw Oldenhuis-Blauw', text: 'Drie namen voor de jury: Dolf (de botsauto\'s), de notaris uit Veendam en een boswachter uit Westerwolde. Ubbo wil Tessa\'s naam op eenenveertig karren.' },
  { step: 'O19', kind: 'hart', title: 'Hij kon winnen', text: 'Aan de muur de medaille van opa Hendrik: "Eerste prijs. Ommelander Ronde. 1953." Zijn kleindochter: "Hij kon niet bakken. Hij kon winnen. Dat is iets anders."' },
  { step: 'O20', kind: 'clue', title: 'Papier uit de lucht', text: 'Roelfiens gewasspuiter strooide drieduizend vellen met Ubbo\'s jury over de markt van Winschoten.' },
  { step: 'O20', kind: 'hart', title: 'Trijntjes trekker', text: 'Trijntje betaalde in 1953 de eerste trekker van Roelfiens vader. Nooit teruggevraagd. "De rente komt later."' },
  { step: 'O21', kind: 'clue', title: 'Duits vet, Hollandse jury', text: 'Ubbo laat goedkoop vet uit Duitsland komen over de dijkweg bij Beerta. Drie opleggers met OB stonden op de dijk; de cabines reden over de grens.' },
  { step: 'O22', kind: 'clue', title: 'Us Mem Snacks verkocht', text: 'Ubbo kocht de bakkerij van Jelles moeder en riep het om op de kermis. Durk en Douwe liepen er midden in een wedstrijd van weg, hand in hand.' },
  { step: 'O22', kind: 'clue', title: 'Voorronde Oldambt', text: 'Gewonnen in Winschoten. "Goud." Ubbo: "Vijf. Nog twee." Hij wil Tessa alleen spreken.' },
  { step: 'O23', kind: 'clue', title: 'De snackbars zijn de winkel. De fabriek is de bank.', text: 'In elke Oldenhuis Bakt-snackbar liggen vijf enveloppen, Wijk A t/m E, elke maand naar de zetmeelfabriek in Veendam.' },
  { step: 'O23', kind: 'hart', title: 'Dat is ook iemand', text: 'Tessa belde Tammo. Niemand nam op. "Wie belde u?" "Niemand." "Dat is ook iemand."' },
  { step: 'O24', kind: 'clue', title: 'Kasboek, deel twee', text: 'Het grootboek, eenenveertig bladzijden. De eerste regel: "1953: jury. H. O. (aan zichzelf)."' },
  { step: 'O24', kind: 'hart', title: 'Het contract in tweeën', text: 'Tessa verscheurde het franchise-contract live op Nachtstreek. Tammo luisterde. "Ik fiets."' },
  { step: 'O25', kind: 'hart', title: 'Maar vriendelijker', text: '"Jij wilt alles kunnen." "Is dat anders?" "Het is hetzelfde. Maar vriendelijker." De vraag "groeien of thuis" is niet beantwoord. Dat is een begin.' },
  { step: 'O25', kind: 'clue', title: 'Het boek is bewijs', text: 'De politie nam het grootboek mee. De agente van de waterpolitie: "Een boek is geen getuige. Dat is papier." Ubbo zegt dat hij er drie heeft.' },
  { step: 'O26', kind: 'clue', title: 'Een jury van paling', text: 'In de kluis lag een jurylijst uit 1953 in Hendrik Oldenhuis\' handschrift: "Eigen kar: 10. Trijntje: 6." En een kilo paling per jurylid. Siebrands opa voer de paling.' },
  { step: 'O26', kind: 'clue', title: 'De laatste jury', text: 'De echte jurylijst voor de finale in de vesting Bourtange, met een plattegrond. Ubbo houdt het "besloten", met zijn eigen jury. Zaterdag.' },
  { step: 'O27', kind: 'clue', title: 'Voorronde Veenkoloniën', text: 'Gewonnen op de brug in Veendam. Notaris Rieks en Wubbo jureerden: "Valt mie nait of." Zes van zeven. De finale is in de vesting Bourtange, zaterdag.' },
  { step: 'O28', kind: 'clue', title: 'Het plan van de bisschop', text: 'Berend: de vesting valt je niet van één kant aan. Water, land, lucht, en een brug die te vroeg opengaat. Zeven mensen die Trijntje iets schuldig zijn: dat is een leger.' },
  { step: 'O28', kind: 'hart', title: 'Ommelander Ronde, 1953', text: 'Oma was negentien. De Ronde was in Bourtange. De jury had paling in de zak. Hendrik Oldenhuis zat voorop en gaf zichzelf de prijs. "Ik ben Gronings. Wij zeggen het één keer. Dit is die keer."' },
  { step: 'O29', kind: 'clue', title: 'Drie enveloppen', text: 'Ubbo\'s laatste jury (notaris Rieks, slager Ruurd, Hennie) logeerde in een stiltehuis bij Sellingen. Tammo ruilde hun enveloppen voor Oma\'s kaartje en een warm pakket. Het geld ging in de collectebus voor het dak.' },
  { step: 'O30', kind: 'clue', title: 'Het beleg van Bourtange', text: 'De vesting is genomen door een leger van karton, meel en duiven. Berend Bos heeft voor het eerst gewonnen. Ubbo wil dat het zo gaat: "Een finale in mijn vesting, met iedereen erbij."' },
  { step: 'O30', kind: 'hart', title: 'Zeven gunsten', text: 'Geesje, Lammert, Fenna, Jelle, Tinus, Roelfien, Wubbo. Zeventig jaar rente, in één middag afbetaald.' },
  { step: 'O31', kind: 'hart', title: 'De laatste ronde', text: 'Oma\'s eierbal was in 1953 beter. De jury zat vol paling. Ubbo gaf toe dat hij nooit verder kwam dan "Ow". Zijn opa\'s medaille hangt nu aan het spiegeltje van de Fjord, achterin.' },
  { step: 'O31', kind: 'clue', title: 'Zeven van zeven', text: 'De Gouden Eierbal is terug. Ubbo is aangehouden voor uitvoer zonder vergunning en voor de enveloppen. "Dat is papier."' },
  { step: 'O32', kind: 'hart', title: 'Thuis', text: 'Tammo: "Thuis is waar de kar staat." Tessa telde zes. Eén kar op de Vismarkt, zeven filialen onder de naam Fjord & Familie, en één ronde per zomer door de hele provincie. Allebei hebben ze hun zin.' },
```

### B. missionstory.js

```js
// missionstory.js: NPC looks (placeholders in the existing shape; storycast.js gets the real looks)
  roelfien: { name: 'Roelfien', shirt: 0xb8683c, skin: SKIN.woodLight, variant: 'female', seed: 4301, hairStyle: 'bun', look: { age: 'old', top: 'overall' } },
  eilert: { name: 'Molenaar Eilert', shirt: 0x7c8f55, skin: SKIN.woodLight, variant: 'male', seed: 4302, look: { age: 'old', hat: 'cap' } },
  oblauw: { name: 'Mevrouw Oldenhuis-Blauw', shirt: 0x9a74b0, skin: SKIN.woodLight, variant: 'female', seed: 4303, hairStyle: 'bob', look: { top: 'jacket' } },
  wubbo: { name: 'Brugwachter Wubbo', shirt: 0xc09a3a, skin: SKIN.woodMid, variant: 'male', seed: 4304, look: { age: 'old', hat: 'cap' } },
  siemen: { name: 'Boswachter Siemen', shirt: 0x4e8a64, skin: SKIN.woodMid, variant: 'male', seed: 4305, look: { top: 'jacket', hat: 'cap' } },
  dries: { name: 'Machinist Dries', shirt: 0x8d7f5a, skin: SKIN.woodLight, variant: 'male', seed: 4306, look: { age: 'old', hat: 'cap' } },
  gerrit: { name: 'Wolvenman Gerrit', shirt: 0x8a8f3a, skin: SKIN.woodMid, variant: 'male', seed: 4307 },
  floor: { name: 'Floor', shirt: 0xc0627f, skin: SKIN.woodLight, variant: 'female', seed: 4308 },
  joost: { name: 'Joost', shirt: 0x4f8aa8, skin: SKIN.woodLight, variant: 'male', seed: 4309 },
  dolf: { name: 'Botsautobaas Dolf', shirt: 0xb87a30, skin: SKIN.woodMid, variant: 'male', seed: 4310, look: { build: 'heavy' } },

// missionstory.js: STORY entries, appended in MISSION_IDS order (generated from §3). N = the entry's npc.
  {
    // O19 Blauwe stad, rode auto
    npc: 'durk', outroPose: 'hips', ask: 0,
    intro: [

    ],
    outro: [

    ],
    replay: [
      ['T', 'Weer die jurk? Ik heb hem al gezien. Hij staat je goed. Nat ook.', {  }],
    ],
    fail: [
      ['A', 'Ze liepen me naar de poort. Beleefd.'],
      ['T', 'Dat is het ergste.'],
    ],
  },
  {
    // O20 Laag over het graan
    npc: 'roelfien', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Het is geen auto. Het is een paard met vleugels. Hij wil gewoon vooruit.', {  }],
      ['T', 'Ik wil gewoon… op de grond.', {  }],
      ['A', 'Tammo. Je kunt dit.', {  }],
      ['T', 'Jij zit niet in het ding.', {  }],
      ['N', 'Ik zit erin. Ik heb hem veertig jaar gevlogen. Hij is nog nooit uit de lucht gevallen. Soms ernaast.', {  }],
      ['T', 'Naast?', {  }],
      ['N', 'In de sloot. Dat was mien man. Gas erop.', {  }],
    ],
    outroNpc: true,
    outro: [
      ['T', 'Ik leef.', {  }],
      ['N', 'Dat is mooi. Dat scheelt papierwerk.', {  }],
      ['A', 'Tammo! Je hebt gevlogen!', {  }],
      ['T', 'Ik heb mijn ogen niet open gehad. Dat is geen vliegen. Dat is gebeuren.', {  }],
      ['N', 'Je bent als een boer. Je doet het en je zegt er niks over.', {  }],
      ['N', 'Zo. De trekker van mien vader is betaald. Met een vliegtuig.', {  }],
      ['T', 'Is het genoeg?', {  }],
      ['N', 'Voor een trekker wel. De rente komt later.', {  }],
    ],
    replay: [
      ['N', 'Weer vliegen? Ik heb brandstof. Jij bent bleek. Dat wisselt af.', {  }],
    ],
    fail: [
      ['T', 'Ik had me aan de grond moeten houden.'],
      ['N', 'Dat doet iedereen. Tot hij vliegt.'],
    ],
  },
  {
    // O21 Grensgevoel
    npc: 'grens', outroPose: 'hips', ask: 0,
    intro: [
      ['T', 'Drie trucks. Elk met een vat. Dat is een dorp aan friet.', {  }],
      ['A', 'Zonder vet geen voorronde. Zonder voorronde geen Ronde.', {  }],
      ['T', 'Jelle deed dat ook. Vet opkopen.', {  }],
      ['A', 'Jelle deed het uit liefde. Dit is het uit rekenwerk.', {  }],
    ],
    outro: [
      ['T', 'OB. OB. OB. Hij heeft ze een voor een gestempeld.', {  }],
      ['A', 'Als een bakkerij die niks bakt.', {  }],
      ['T', 'Zonder dit vet staat zijn kraam morgen met een lege pan.', {  }],
      ['A', 'Hij zal een andere vinden. Hij heeft eenenveertig snackbars.', {  }],
      ['T', 'Dan breken we hem eenenveertig keer.', {  }],
      ['A', 'Kon minder.', {  }],
    ],
    replay: [
      ['N', 'Weer u? Dan gelden dezelfde regels. Die verandert niemand. Dat is ook de bedoeling.', {  }],
    ],
    fail: [
      ['T', 'Het vet ging naar Winschoten.'],
      ['A', 'Het vet gaat altijd naar Winschoten. Dat is wat een vet doet.'],
    ],
  },
  {
    // O22 Botsauto's, deel twee
    npc: 'dolf', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Dames en heren, de voorronde Oldambt! Eerst proeven, dan botsen, dan nog een keer proeven!', {  }],
      ['durk', 'Moi. Wij hebben botsauto\'s.', {  }],
      ['douwe', '…botsauto\'s.', {  }],
      ['T', 'Jullie zijn van Jelle.', {  }],
      ['durk', 'Wij zijn van een baas. Hij betaalt per brein.', {  }],
      ['douwe', '…per brein.', {  }],
      ['T', 'Dat zeg je steeds. Rekenen jullie het wel eens uit?', {  }],
      ['durk', 'Eén brein. Tussen ons tweeën. Dat is half.', {  }],
      ['douwe', '…half.', {  }],
    ],
    outro: [
      ['ubbo', 'Mooi. Heel mooi. Een uur geleden had ik twee reuzen. Nu heb ik twee reuzen minder.', {  }],
      ['T', 'Ze hebben gekozen.', {  }],
      ['ubbo', 'Mensen kiezen altijd. Dat is hun probleem. Ik koop de keuze.', {  }],
      ['A', 'Wat wil je, Ubbo?', {  }],
      ['ubbo', 'Vijf. Vijf voorrondes. Nog twee.', {  }],
      ['ubbo', 'En een gesprek. Met jou, meisje. Alleen met jou.', {  }],
      ['T', 'Ze is niet alleen.', {  }],
      ['ubbo', 'Dan staat u daar. Dat is ook goed.', {  }],
    ],
    replay: [
      ['N', 'Dames en heren, de kermis kent geen herhaling. Maar wij wel!', {  }],
    ],
    fail: [
      ['A', 'De kraam ligt tussen de botsauto\'s.'],
      ['T', 'Hij werd eerlijk geraakt. Dat is nog wat.'],
    ],
  },
  {
    // O23 Wijk na wijk
    npc: 'wubbo', outroPose: 'hips', ask: 0,
    intro: [
      ['adviseur', 'Dit is de modelzaak. Eenenveertig zaken werken precies zo. Zelfde pan, zelfde saus, zelfde glimlach.', {  }],
      ['A', 'Zelfde friet?', {  }],
      ['adviseuse', 'Zelfde vet. Dat is het mooie.', {  }],
      ['A', 'En deze enveloppen? "Wijk A, Wijk B, Wijk C…"', {  }],
      ['adviseur', 'Dat is… boekhouding.', {  }],
      ['adviseuse', 'Rob. Doe dicht.', {  }],
      ['A', 'Wat staat erin?', {  }],
      ['adviseuse', 'Niets. Vet. Geld. Het is hetzelfde.', {  }],
      ['A', 'Dat is niet hetzelfde.', {  }],
      ['adviseur', 'Mevrouw, wij doen alleen de aanmeldingen!', {  }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Koffie. Het is zwart. Het is ook alles wat ik heb.', {  }],
      ['A', 'Ik heb net gebeld. Niemand nam op.', {  }],
      ['N', 'Wie belde u?', {  }],
      ['A', 'Niemand.', {  }],
      ['N', 'Dat is ook iemand.', {  }],
      ['A', 'Hij is naar huis, Wubbo. We hadden ruzie.', {  }],
      ['N', 'Mien vrouw en ik hadden dertig jaar ruzie over een brug. Hij is er nog.', {  }],
      ['A', 'Wie heeft gewonnen?', {  }],
      ['N', 'De brug. Altijd de brug.', {  }],
    ],
    replay: [
      ['N', 'Weer de brug? Ik doe open. Een tel te laat. Dat verandert niet. Dat is het mooie.', {  }],
    ],
    fail: [
      ['A', 'De bus is weg. Over de laatste brug.'],
      ['N', 'Hij is niet weg. Hij is nog niet terug.'],
    ],
  },
  {
    // O24 Stoom
    npc: 'dries', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Instappen, mevrouw. Het is geen taxi. Het is een trein. Die doet wat hij wil, binnen het spoor.', { card: 'dries' }],
      ['A', 'Ik ga naar de salon.', {  }],
      ['N', 'Dan hoort u het niet van mij. Maar daar rookt iemand een sigaar. In een museumtrein. Dat is een misdaad op zich.', {  }],
      ['knecht', 'Uitnodiging.', {  }],
      ['A', 'Hier.', {  }],
      ['knecht', 'De baas wacht. Hij heeft thee.', {  }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Zo. Zeven jaar heb ik niemand achter die regelaar gezet. Het ging goed. Dat is vervelend.', {  }],
      ['A', 'Dank u, Dries.', {  }],
      ['N', 'Ik heb niks gezien. Ik keek naar het sein.', {  }],
      ['A', 'Ik weet het.', {  }],
      ['N', 'Stoom vergeeft niks. Behalve een goeie stoker. En jij bent een goeie stoker.', {  }],
      ['A', 'Wat gebeurt er met de salonwagens?', {  }],
      ['N', 'Die staan in Musselkanaal. Er zit geen water meer in de ketel. En geen thee.', {  }],
    ],
    replay: [
      ['N', 'Weer de loc? Kolen zijn duur. Maar jij mag. Jij kijkt naar het sein.', {  }],
    ],
    fail: [
      ['A', 'Hij pakte me bij de tender.'],
      ['N', 'Hij had een gele jas. Die glijden. Maar ze houden vast.'],
    ],
  },
  {
    // O25 Strokarton
    npc: 'knecht', outroPose: 'hips', ask: 0,
    intro: [
      ['A', 'Tammo! Ik had gezegd dat je niet hoefde te komen.', {  }],
      ['T', 'Je zit vastgebonden aan een pallet.', {  }],
      ['A', 'Dat is onder controle.', {  }],
      ['T', 'Het is een pallet.', {  }],
      ['A', 'Ik ben hier met opzet.', {  }],
      ['T', 'Dat zeg je vaker.', {  }],
      ['A', 'Achter je!', {  }],
    ],
    outro: [
      ['T', 'Ik breng het boek naar de agente. Zij zegt wat bewijs is.', {  }],
      ['A', 'Samen.', {  }],
      ['T', 'Samen.', {  }],
      ['A', 'Ik pak jouw fiets. Jij mag achterop.', {  }],
      ['T', 'Ik rij zelf.', {  }],
      ['A', 'Je rijdt altijd zelf.', {  }],
      ['T', 'Dat zeg ik al twaalf jaar.', {  }],
    ],
    replay: [
      ['T', 'Weer de fabriek? Mijn knieën zeggen nee. Ik zeg: een tweede keer is routine.', {  }],
    ],
    fail: [
      ['T', 'De pers was sneller dan ik.'],
      ['A', 'Pers is pers. Je moet er vóór zijn.'],
    ],
  },
  {
    // O26 Aardappelmeel
    npc: 'knecht', outroPose: 'hips', ask: 0,
    intro: [
      ['T', 'Drie manieren. Stil. Slim. Hard.', {  }],
      ['A', 'Stil is voor jou.', {  }],
      ['T', 'Slim is voor jou.', {  }],
      ['A', 'Hard is voor niemand.', {  }],
      ['T', 'Hard is voor een kiepwagen.', {  }],
      ['A', 'Die we nog niet hebben.', {  }],
      ['T', 'Die staat daar.', {  }],
      ['A', 'Je bent ongelooflijk.', {  }],
    ],
    outro: [
      ['A', 'De jurylijst. De plattegrond van de vesting. En een vel van 1953.', {  }],
      ['T', 'Hendrik gaf zichzelf een tien.', {  }],
      ['A', 'En een kilo paling per jurylid.', {  }],
      ['T', 'Een jury van paling. Dat verklaart veel.', {  }],
      ['A', 'Oma werd zes.', {  }],
      ['T', 'Oma werd altijd een tien.', {  }],
      ['A', 'Dat zeg ik haar niet.', {  }],
      ['T', 'Ze weet het.', {  }],
      ['A', '…Ze weet alles.', {  }],
      ['T', 'Dan zaterdag. In de vesting.', {  }],
    ],
    replay: [
      ['A', 'Weer wit. Het hoort bij het beroep.', {  }],
    ],
    fail: [
      ['T', 'Je glijdt altijd uit in het zetmeel.'],
      ['A', 'Hij is glad. Dat heet een zetmeel.'],
    ],
  },
  {
    // O27 Veendam, laatste kans
    npc: 'wubbo', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Moi. Het is voorronde, maar ook vrachtverkeer. Ik heb geen afspraken. Ik heb schepen.', {  }],
      ['A', 'Dat weten we.', {  }],
      ['T', 'We staan op een brug.', {  }],
      ['N', 'Dat zie ik. Het is mijn brug. Hij houdt van gewicht. Behalve als hij open gaat.', {  }],
      ['T', 'Als hij open gaat?', {  }],
      ['N', 'Dan gaat alles omhoog. Ook jullie.', {  }],
      ['A', 'Dat zeg je pas nu?', {  }],
      ['N', 'Ik meld alleen. Dit is geen melding. Dit is een feit.', {  }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hier. De sleutel van het huisje. Voor als jullie willen blijven. Het bed kraakt. De brug ook.', {  }],
      ['A', 'Wubbo. Dank u.', {  }],
      ['N', 'Dank mien vader. Hij leende tien gulden. Het is nooit teruggekomen. Maar de brug wel.', {  }],
      ['T', 'Vijf van zeven?', {  }],
      ['A', 'Zes.', {  }],
      ['T', 'Zes. Dan blijft er één.', {  }],
      ['N', 'Dan is de finale in Westerwolde. Daar is geen trein. Dat hoort zo.', {  }],
    ],
    replay: [
      ['N', 'Weer het schip? Ik doe open. Een tel te laat. Dat weten jullie nu.', {  }],
    ],
    fail: [
      ['T', 'De kraam ging mee omhoog.'],
      ['N', 'Dat doen kramen. Als ze op een brug staan.'],
    ],
  },
  {
    // O28 Een bisschop in het bos
    npc: 'berend', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Dat stel. Eindelijk. Ik wacht al drie kwartier. Het paard ook.', {  }],
      ['T', 'Dag Berend. Mooie jurk.', {  }],
      ['N', 'Het is een mantel. Hij is van de bisschop. Ik leen hem. Hij heeft hem niet nodig.', {  }],
      ['A', 'Hoe heet het paard?', {  }],
      ['N', 'Münster. Hij is zachter dan hij klinkt.', {  }],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Veertig jaar. Ik wil het één keer goed doen.', {  }],
      ['A', 'U heeft het goed gedaan.', {  }],
      ['N', 'Kon minder.', {  }],
      ['T', 'Dat is het mooiste wat u hebt gezegd.', {  }],
      ['N', 'Ik zeg niks. Ik ben bisschop.', {  }],
    ],
    replay: [
      ['N', 'Weer op de heuvel? Het paard houdt van herhalingen. Ik niet.', {  }],
    ],
    fail: [
      ['N', 'Mijn paard is weg! Dat is jouw schuld!'],
      ['T', 'Hij stond ernaast, Berend.'],
    ],
  },
  {
    // O29 Stil in het klooster
    npc: 'siemen', outroPose: 'hips', ask: 0,
    intro: [
      ['T', 'Dit is een tuin met een bordje. Het bordje zegt: stil. Ik doe wat het bordje zegt.', {  }],
      ['A', 'Grind is luid. Gras is stil. Kruiden niezen.', {  }],
      ['T', 'Kruiden niezen?', {  }],
      ['A', 'Lavendel. Ik heb het opgezocht.', {  }],
    ],
    outro: [
      ['A', 'Drie enveloppen geruild.', {  }],
      ['T', 'Drie keer eerlijk.', {  }],
      ['A', 'Hij merkt het pas bij het ontbijt.', {  }],
      ['T', 'Dan zit hij al aan tafel.', {  }],
    ],
    replay: [
      ['T', 'Weer die tuin. Het gras is mijn vriend.', {  }],
    ],
    fail: [
      ['T', 'De bel. Ik zweer dat het grind begon.'],
      ['A', 'Grind begint nooit. Grind is gewoon grind.'],
    ],
  },
  {
    // O30 Het beleg
    npc: 'berend', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Dames en heren. Het beleg van Bourtange. Zestienhonderdtweeënzeventig. Ik verloor. Vandaag niet.', { cam: 'pan' }],
      ['rikus', 'Het is half twee. De zon schijnt. Er is geen schot, geen bloed, geen kogel van ijzer. Alleen karton, meel en water. Zo is het in Grunn.', {  }],
      ['A', 'Vier fronten. Water. Land. Lucht. Brug. Wie waar?', {  }],
      ['lammert', 'Ik heb de sleutel van de sluis. Vrij genomen voor het eerst in zestig jaar. Mijn neef houdt de sluis in Delfzijl. Hij meldt alleen.', {  }],
      ['klaas', 'Een gracht is ook water. Ik vaar ze allemaal. Behalve de zee. Die is te groot voor mijn geduld.', {  }],
      ['fenna', 'Het veen is net het wad. Je moet de route kennen. Zet je voeten waar ik ze zet. En niet erbij.', {  }],
      ['jelle', 'Jelle springt. Altijd. Met polsstok. Foar mem.', {  }],
      ['tinus', 'Trekker heeft een toren. Hij trekt hem. Zonder motor ging het niet. Met motor wel.', {  }],
      ['roelfien', 'Ik vlieg boven. Meel. Zes zakken. Eén keer wit. Daarna sta ik stil.', {  }],
      ['wubbo', 'Ik doe de lier van de brug. Te vroeg. Voor één keer. Ik oefen het al vanochtend.', {  }],
      ['bert', 'Veertig duiven. Ze luisteren naar niemand. Behalve naar jongen. Tammo, kom maar.', {  }],
      ['durk', 'Wij zijn de stormram. Wij hebben er ook niets tegen.', {  }],
      ['douwe', '…tegen.', {  }],
      ['dijkstra', 'Er is vandaag geen gewonde. Het is toneel. Ik sta er toch. Dit stond niet in het rooster, maar het staat er nu.', {  }],
      ['geesje', 'Ik zie alles vanaf mijn toren. Dit is geen toren. Het is een hooiberg. Ik zie alles toch.', {  }],
      ['A', 'Zeven mensen. Zeven gunsten. Ik weet niet wat ik moet zeggen.', {  }],
      ['N', 'Zeg: aanvallen. Dat is wat een generaal zegt.', {  }],
      ['A', 'Aanvallen.', {  }],
    ],
    outroNpc: true,
    outro: [
      ['N', '…Het is open.', {  }],
      ['A', 'Het is open, Berend.', {  }],
      ['N', 'Ik heb gewonnen.', {  }],
      ['T', 'U heeft gewonnen.', {  }],
      ['N', 'Dit is verkeerd.', {  }],
      ['A', 'Dat is winnen, Berend.', {  }],
      ['N', 'Dan is winnen verkeerd.', {  }],
      ['rikus', 'Grunn. Het is half vier. Het beleg van Bourtange is gewonnen door de belegeraars. Voor het eerst in de geschiedenis. Berend Bos heeft gewonnen. Hij zegt dat het verkeerd voelt. Dat is hoe het hoort.', {  }],
      ['wubbo', 'Ik meld alleen: het is te vroeg gelukt. Dat is een record.', {  }],
      ['harm', 'Vesting is geopend. Eerste fase.', {  }],
      ['N', 'Eindelijk. Eerste fase.', {  }],
      ['ubbo', 'Mooi gedaan, mevrouw. Mooi gedaan, allemaal. Ik had het niet beter kunnen regisseren. Komt u binnen. Er is een tafel gedekt. Er is een jury. Dit is wat ik wilde.', { cam: 'close' }],
      ['A', 'Dat wilde je?', {  }],
      ['ubbo', 'Een finale. In mijn vesting. Met iedereen erbij. Dat is de enige manier waarop een Ronde afloopt.', {  }],
    ],
    replay: [
      ['N', 'Weer het beleg? Ik win nog steeds niet graag. Doe maar.', {  }],
    ],
    fail: [
      ['N', 'Het is mislukt. Zoals altijd. Ik ben er goed in.'],
      ['A', 'Nee, Berend. Nu was het ons.'],
    ],
  },
  {
    // O31 De laatste ronde
    npc: 'trijntje', outroPose: 'hips', ask: 0,
    intro: [
      ['geesje', 'Ik draag. Dat doen wij.', { cam: 'close' }],
      ['N', 'Die tas is van 1953.', {  }],
      ['geesje', 'Ik heb hem bewaard. Er zit een eierbalrecept in. In jouw handschrift. Je vergat hem in de klas.', {  }],
      ['N', 'Dat is… niet waar.', {  }],
      ['geesje', 'Wel waar. Nu draag ik wat terug. Ik weet nu wat. Dat weet je dan.', {  }],
      ['ubbo', 'Welkom, mevrouwen en heren, bij de finale van de Ommelander Ronde! Voorzitter van de jury, de oudste in het gezelschap: mevrouw Trijntje.', { cam: 'wide' }],
      ['N', 'Dat hoor ik voor het eerst. Dank je. Ik had het zelf nooit gedacht.', {  }],
      ['lammert', 'Trijntje. Je bent er.', {  }],
      ['N', 'Lammert. Je bent er ook.', {  }],
      ['lammert', 'Ik heb mijn dansschoenen bij me. Ik bewaar ze nog.', {  }],
      ['N', 'Dat is vroeg. Eerst proeven.', {  }],
    ],
    outroNpc: true,
    outro: [
      ['rikus', 'Nachtstreek, in het daglicht, de laatste minuut van de laatste uitzending van de zomer. Er staat een bal op een tafel. Iemand draagt een medaille.', {  }],
      ['ubbo', 'Mevrouw Trijntje. Dit is van mijn opa. Eerste prijs. Hij is niet van ons. Dat was hij nooit.', {  }],
      ['N', 'Ik hang hem naast de andere. Aan het spiegeltje van die frietwagen. Dan heeft Hendrik een plek. Achterin.', {  }],
      ['ubbo', 'Dat is een goede plek.', {  }],
      ['geesje', 'Ik heb hem gedragen. De tas. Dat is nu af.', {  }],
      ['lammert', 'Trijntje. Mag ik?', {  }],
      ['N', 'Je hebt zeventig jaar gewacht. Je mag.', {  }],
      ['lammert', 'Ik schuif niet meer. Ik dans.', {  }],
      ['N', 'Langzaam. Met de voeten op de grond.', {  }],
      ['T', 'Ze dansen.', {  }],
      ['A', 'Ze dansen. Langzaam.', {  }],
      ['rikus', 'Lammert en Trijntje dansen. Op een plein, in een vesting. Het duurt twee minuten. Het is het mooiste wat ik dit jaar gezien heb. Ik zeg niks. Ik draai strijkers.', {  }],
      ['berend', 'Kon minder.', {  }],
      ['wubbo', 'Het is te vroeg gelukt. Maar het is precies op tijd gebeurd.', {  }],
      ['A', 'Het is af, hè?', {  }],
      ['T', 'Bijna.', {  }],
      ['A', 'Wat is er nog?', {  }],
      ['T', 'Thuis.', {  }],
    ],
    replay: [
      ['N', 'Weer de finale? Ik ben tweeënnegentig. Ik heb tijd. Kom maar.', {  }],
    ],
    fail: [
      ['A', 'Hij haalde het bord. De bal is de grens over.'],
      ['T', 'Dan halen we hem terug. Het bord kan dat niet verbieden.'],
    ],
  },
  {
    // O32 Thuis
    npc: 'trijntje', outroPose: 'hips', ask: 0,
    intro: [
      ['A', 'Tammo. We hebben het nog niet beantwoord.', {  }],
      ['T', 'Groeien of thuis.', {  }],
      ['A', 'Ik wil Fjord Frituren in de dorpen waar iemand het lekker vindt. Niet eenenveertig. Zeven. Door mensen die zij zelf zijn.', {  }],
      ['T', 'Fjord & Familie.', {  }],
      ['A', 'Hoe heet dat?', {  }],
      ['T', 'Zo heet het. Ik heb het bedacht. Op de fiets.', {  }],
      ['A', 'En jij?', {  }],
      ['T', 'Thuis is waar de kar staat.', {  }],
      ['A', 'Thuis. Is. Waar. De. Kar. Staat. Zes.', {  }],
      ['T', 'Kon minder.', {  }],
      ['A', 'Kon veel minder.', {  }],
      ['T', 'Eén kar. Op de Vismarkt. En één keer per zomer rijdt hij een ronde. Door alle zeven. Dat is ook thuis. Dan heb ik het verplaatst.', {  }],
      ['A', 'Je wilt dat de kar rijdt.', {  }],
      ['T', 'Ik wil dat hij terugkomt.', {  }],
      ['A', 'Dat is een ronde.', {  }],
      ['T', 'Dat is een ronde.', {  }],
    ],
    outro: [
      ['rikus', 'Dames en heren. De gemeente belt. De vergunning van Oldenhuis Bakt is vervallen. Er mist een papier: een Verklaring omtrent Gedrag. Er is geen kwestie van willen. Dat is papier.', {  }],
      ['rikus', 'De plek is vrij. Er staat een frietwagen te wachten. Die rijdt nu.', {  }],
      ['menigte', 'Fjord! Fjord! Fjord!', {  }],
      ['T', 'Ze zijn gebleven.', {  }],
      ['A', 'Elke dag.', {  }],
      ['T', 'Dat is thuis.', {  }],
      ['A', 'Dat is zes woorden.', {  }],
      ['T', 'Ik heb er nog meer. Maar niet vandaag.', {  }],
      ['A', 'Bewaar ze.', {  }],
      ['rikus', 'De laatste zomeravond. De zon gaat onder boven de Vismarkt. Ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft betaald. Dat is nieuw.', {  }],
    ],
    replay: [
      ['rikus', 'Weer de colonne? Ik zit al in de auto.', {  }],
    ],
  },
```

### C. missions.js (stage-schetsen)

De vorm van de bestaande `stages`-missies. Stage `say`-regels en scènelijnen staan in §3 per missie; ze gaan letterlijk in `say:` en `lines:`.

```js
// O19
{ type: 'stages', label: 'Blauwe stad, rode auto',
  intro: ['Ubbo\'s zus geeft een feest aan het Oldambtmeer. Tessa gaat erheen, op uitnodiging, zonder Tammo.', 'Verzamel drie namen van juryleden, fotografeer de jurylijst en vlucht per sloep naar Midwolda.'],
  outro: 'Drie namen, een medaille en een natte jurk.', timeLimit: null, reward: 2600, clock: 20.2,
  start: walk(/* dijk bij Midwolda */), boatAt: /* steiger Villa Meerzicht */ null, ride: 'sloep-oblauw',
  handBack: { how: 'moor', say: 'De sloep gaat terug naar de steiger van mevrouw. Ze telt hem.' },
  hull: { label: 'Romp', per: 20, failAt: 100 },
  stages: [
    { kind: 'goto', target: { at: [/* oprit Villa Meerzicht */] }, mode: 'walk', label: 'Ga het feest op' },
    { kind: 'scene', kicker: 'De oprit', cast: [{ key: 'durk', look: 'suit' }, { key: 'douwe', look: 'suit' }] },
    { kind: 'mingle', label: 'Verzamel drie namen van juryleden (praat niet te lang)', talk: 3, suspicion: { per: 25, failAt: 100, calm: 'smile' } },   // NEW
    { kind: 'sneak', label: 'Naar de werkkamer: fotografeer de jurylijst en de medaille', area: 'villa-binnen', guards: 1, cams: 1, targets: [{ label: 'Het jurylijstje' }, { label: 'De medaille van 1953' }] },
    { kind: 'scene', kicker: 'De werkkamer', cast: [{ key: 'oblauw', pose: 'sit' }] },
    { kind: 'flee', mode: 'boat', label: 'Steel de sloep en vaar naar Midwolda', pursuers: 2, push: true, to: { at: [/* jachthaven Midwolda */] }, time: 90 },
  ] },
// O20
{ type: 'stages', label: 'Laag over het graan',
  intro: ['Roelfien leent haar gewasspuiter. Strooi de jurylijst over de markt van Winschoten, en laat de politieheli niet achter je komen.', 'Laag vliegen, vijf poorten, drie strooipunten, onder de lijn door.'],
  outro: 'Drieduizend vellen op de markt. Eén vlieger met zijn ogen dicht.', timeLimit: null, reward: 2800, clock: 10.0, noShoot: true,
  start: walk(/* graspiste Roelfien, Beerta */), vehicle: 'plane', ride: 'spuiter-roelfien',
  handBack: { how: 'park', say: 'De gewasspuiter blijft op de piste. Roelfien kijkt hem na als een kind.' },
  stages: [
    { kind: 'board', vehicle: 'plane', label: 'Stap in de gewasspuiter', say: 'Gas. Meer. Nu trekken.' },
    { kind: 'fly', label: 'Stijg op en vlieg laag door de poorten', gates: 5, ceil: 30, gust: true, route: 'beerta-winschoten', crash: 'stoppel' },   // NEW
    { kind: 'drop', label: 'Strooi de jurylijst boven Winschoten (houd E)', points: [{ name: 'Marktplein' }, { name: 'Brug Pagediep' }, { name: 'Molen' }], hold: 3, under: 40 },   // NEW
    { kind: 'evade', label: 'Ontwijk de politieheli: blijf laag', chaser: 'heli', maxAlt: 30, time: 60, bonus: 'onder de lijn door' },   // NEW
    { kind: 'land', label: 'Vlieg terug naar Beerta en land', target: { at: [/* graspiste */] } },   // NEW
  ] },
// O21
{ type: 'stages', label: 'Grensgevoel',
  intro: ['Drie vettrucks rijden Duits vet naar Winschoten, voor de voorronde van Ubbo. Ze rijden over de Dollarddijk.', 'Ram de koppelingen van de opleggers los en hou het vet uit Winschoten. Bij het grensbord houdt het voor jou op.'],
  outro: 'Drie opleggers op de dijk. De cabines zijn Duitsland in.', timeLimit: null, reward: 2600, clock: 14.0, noShoot: true,
  start: drive(/* Oostersingel, Winschoten */), own: 'fjord', loaner: 'roelfien-pickup',
  stages: [
    { kind: 'board', own: 'fjord', label: 'Stap in de Fjord' },
    { kind: 'goto', target: { at: [/* Dollarddijk bij Beerta */] }, mode: 'vehicle', label: 'Rij naar de dijk bij Beerta' },
    { kind: 'chase', label: 'Ram de koppelingen van de opleggers (3 trucks)', multi: 3, vehicle: { name: 'truck', len: 12, wid: 2.5, maxSpeed: 22 }, hits: 3, hitMode: 'ram', unhitch: true, flee: [/* grensbord */], escape: 400, borderStop: true },   // NEW: unhitch, borderStop
    { kind: 'scene', kicker: 'Het grensbord bij Nieuweschans', cast: [{ key: 'grens' }, { key: 'grenzer' }], props: [{ kind: 'borderline' }, { kind: 'thermos' }] },
  ] },
// O22
{ type: 'stages', label: "Botsauto's, deel twee",
  intro: ['Voorronde Oldambt op de kermis in Winschoten. Durk en Douwe rijden voor Ubbo, in botsauto\'s, en willen de kraam rammen.', 'Hou de botsauto\'s weg van de kraam. Tessa bakt.'],
  outro: 'De voorronde is van jullie. Durk en Douwe lopen weg.', timeLimit: null, reward: 3500, clock: 19.0,
  start: walk(/* kermisterrein Winschoten */), ride: 'botsauto',
  handBack: { how: 'park', say: 'De botsauto blijft op de baan. Dolf zet hem aan de lader.' },
  meters: [{ label: 'Kraam', failAt: 0, per: 34 }],
  stages: [
    { kind: 'board', vehicle: 'bumper', label: 'Stap in een botsauto' },
    { kind: 'defend', mode: 'arena', label: 'Duw de botsauto\'s weg van de kraam', waves: [4, 4, 2], bake: [60, 60, 60], flankOnly: true, arena: [20, 30], turncoat: { wave: 2, who: ['durk', 'douwe'] } },   // NEW: arena, turncoat
    { kind: 'scene', kicker: 'De overloop op de baan', cast: [{ key: 'durk' }, { key: 'douwe' }], cam: { orbit: true } },
    { kind: 'scene', kicker: 'De jury', cast: [{ key: 'dolf' }, { key: 'dina' }] },
  ] },
// O23
{ type: 'stages', label: 'Wijk na wijk',
  intro: ['Tessa kijkt in een franchise-snackbar in Veendam en ziet vijf enveloppen "Wijk A t/m E". De adviseurs vluchten.', 'Achter de bestelbus aan door de kanaalwijken. Wubbo opent de bruggen op jouw teken, een tel te laat.'],
  outro: 'De bus klem, de boot nat, de enveloppen ook.', timeLimit: null, reward: 2400, clock: 15.0, noShoot: true,
  start: walk(/* snackbar Westerdiep, Veendam */), solo: true, loaner: 'wubbo-stationwagen',
  handBack: { how: 'park', say: 'De stationwagen blijft aan de kade. Wubbo haalt hem straks. Met de bromfiets.' },
  stages: [
    { kind: 'scene', kicker: 'De modelzaak', cast: [{ key: 'adviseur' }, { key: 'adviseuse' }], cam: { track: true } },
    { kind: 'board', vehicle: 'car', loaner: 'wubbo-stationwagen', label: 'Pak de leenauto van Wubbo' },
    { kind: 'chase', label: 'Achter de bestelbus aan, door de kanaalwijken', vehicle: { name: 'bestelbus', len: 6, wid: 2.2, maxSpeed: 26 }, bridges: { n: 5, op: 'honk', lag: 1.0, misses: 2 }, escape: 400, noShoot: true },   // NEW: bridges
    { kind: 'board', mode: 'boat', loaner: 'brugboot-wubbo', label: 'Pak de brugboot' },
    { kind: 'chase', mode: 'boat', label: 'Stop de motorboot bij de sluis', name: 'Motorboot adviseurs', hits: 3, hitMode: 'ram', flee: [/* sluis Veendam */], escape: 300 },
    { kind: 'scene', kicker: 'De sluis aan de rand van Veendam', cast: [{ key: 'adviseur' }, { key: 'adviseuse' }, { key: 'wubbo' }] },
  ] },
// O24
{ type: 'stages', label: 'Stoom',
  intro: ['Ubbo houdt een franchise-dag in een salonwagen op het museumspoor van Stadskanaal. Tessa gaat erheen, met de pen in de hand.', 'Open het grootboek, vlucht over het dak van de rijdende trein en verscheur het contract live op de radio.'],
  outro: 'Het boek is van Tessa. De salonwagens staan in Musselkanaal.', timeLimit: null, reward: 3200, clock: 19.5, solo: true,
  start: walk(/* station Stadskanaal, museumspoor */),
  stages: [
    { kind: 'goto', target: { station: 'Stadskanaal' }, mode: 'walk', label: 'Stap op het museumspoor', ticket: 'invitation' },
    { kind: 'scene', kicker: 'De salon', cast: [{ key: 'ubbo', pose: 'sit' }], props: [{ kind: 'contract' }, { kind: 'ledger' }] },
    { kind: 'use', target: { prop: 'ledger' }, hold: 3, label: 'Open het grootboek (E)' },
    { kind: 'climb', label: 'Klim het dak op en kom bij de locomotief', mode: 'train-roof', cars: 4, duck: 6, chasers: 3, smoke: true, route: 'stadskanaal-musselkanaal' },   // NEW: train-roof
    { kind: 'scene', kicker: 'Live op Nachtstreek, op de locomotief', cast: [{ key: 'dries' }], cam: { cab: true }, live: true },
    { kind: 'train', line: 'musselkanaal', steam: true, to: 'Stadskanaal', light: true, instructor: 'dries', label: 'Rij de locomotief terug naar Stadskanaal' },   // NEW: steam, light
  ] },
// O25
{ type: 'stages', label: 'Strokarton',
  intro: ['Tessa zit vastgebonden in de strokartonfabriek bij Hoogezand, met het grootboek bij de balenpers. Tammo fietst erheen, veertien kilometer tegen de wind.', 'Maak haar los, haal het boek uit de pers en trek de hendel van de balenlift.'],
  outro: 'Zes mannen onder karton. Het boek is veilig.', timeLimit: null, reward: 2200, clock: 1.0, noShoot: true,
  start: walk(/* Oosterpark, Stad */),
  stages: [
    { kind: 'cycle', label: 'Fiets naar de fabriek (wind tegen)', to: { at: [/* fabriek Hoogezand */] }, wind: 'head', dist: 14000 },   // NEW
    { kind: 'goto', target: { at: [/* laadperron */] }, mode: 'walk', label: 'Ga de fabriek in' },
    { kind: 'brawl', label: 'Maak Tessa los en pak het boek', foes: 6, weapon: 'pump', melee: true, noKill: true, rescue: { who: 'anita', hold: 4 }, press: { sec: 40 } },   // NEW
    { kind: 'use', target: { prop: 'balenlift' }, hold: 2, label: 'Trek de hendel van de balenlift' },
    { kind: 'scene', kicker: 'Onder het karton', cast: [{ key: 'knecht' }], cam: { dust: true } },
  ] },
// O26
{ type: 'stages', label: 'Aardappelmeel',
  intro: ['De echte jurylijst ligt in een kluis in de zetmeelfabriek in Veendam. Kies zelf hoe je erin komt: stil, slim of hard.', 'Open de kluis (het is 1953), fotografeer wat erin ligt en kom weg door de witte wolk.'],
  outro: 'De lijst, de plattegrond en het vel uit 1953. Alles wit.', timeLimit: null, reward: 3000, clock: 23.0, choose: ['stil', 'slim', 'hard'],
  start: walk(/* poort zetmeelfabriek, Veendam */), loaner: 'kiepwagen-fabriek',
  stages: [
    { kind: 'choose', label: 'Kies de aanpak: stil, slim of hard', options: [
      { id: 'stil', label: 'Stil', route: 'spoor-loopbrug', buddy: 'tammo-eyes' },
      { id: 'slim', label: 'Slim', route: 'controleposten', talk: 3, disguise: 'vetinspectie' },
      { id: 'hard', label: 'Hard', route: 'kiepwagen-poort', buddy: 'tammo-drives' } ] },   // NEW (like H6's choice)
    { kind: 'goto', target: { at: [/* meelzolder */] }, mode: 'walk', label: 'Kom boven de meelzolder' },
    { kind: 'use', target: { prop: 'kluis' }, code: '1953', label: 'Open de kluis (het is 1953)' },
    { kind: 'sneak', label: 'Fotografeer de lijst, de vesting en het vel', targets: [{ label: 'De jurylijst' }, { label: 'Plattegrond Bourtange' }, { label: 'Het vel uit 1953' }], alarm: 'silo-open' },
    { kind: 'escape', label: 'Weg door de wolk', slippery: true, cloud: 'meel' },
    { kind: 'scene', kicker: 'De meelwolk', cast: [{ key: 'knecht' }], cam: { dust: true } },
  ] },
// O27
{ type: 'stages', label: 'Veendam, laatste kans',
  intro: ['Voorronde Veenkoloniën: je kraam staat op een ophaalbrug in Veendam. Er komen drie schepen, en Ubbo stuurt alles wat hij heeft.', 'Bak, duw de kraam van het brugdek als de brug opengaat, en hou de saboteurs weg.'],
  outro: 'Drie schepen. Nul schade. Zes van zeven.', timeLimit: null, reward: 3800, clock: 14.0,
  start: walk(/* brug Veendam */), own: 'kraam', meters: [{ label: 'Kraam', failAt: 0, per: 50 }],
  stages: [
    { kind: 'goto', target: { at: [/* brugdek */] }, mode: 'walk', label: 'Zet de kraam op de brug' },
    { kind: 'defend', label: 'Hou de kraam heel: duw hem van het brugdek als de brug opengaat', waves: [1, 1, 1], bake: [70, 70, 70], bridge: { opens: 3, secs: [25, 20, 15] }, saboteurs: { rope: 2, rubberboat: 2 } },   // NEW: bridge
    { kind: 'scene', kicker: 'De jury op de kade', cast: [{ key: 'wubbo' }, { key: 'rieks' }] },
  ] },
// O28
{ type: 'stages', label: 'Een bisschop in het bos',
  intro: ['Berend Bos speelt de bisschop, te paard, in de bossen bij Sellingen. Hij heeft een plan voor de vesting.', 'Rij de Fjord achter zijn paard aan, op wandeltempo, en luister naar wat hij bedacht heeft.'],
  outro: 'Water, land, lucht en een brug die te vroeg opengaat.', timeLimit: null, reward: 1200, noShoot: true,
  start: drive(/* bosrand bij Sellingen */), own: 'fjord',
  stages: [
    { kind: 'follow', label: 'Rij achter Berends paard aan (12-25 m)', npc: 'berend-paard', min: 12, max: 25, scare: { honk: true, close: 3 }, route: 'sellingen-heuvel' },   // NEW
    { kind: 'goto', target: { at: [/* heideven */] }, mode: 'vehicle', label: 'Stop bij het heideven', optional: true },
    { kind: 'scene', kicker: 'De heuvel boven de vesting', cast: [{ key: 'berend', pose: 'ride' }] },
  ] },
// O29
{ type: 'stages', label: 'Stil in het klooster',
  intro: ['Ubbo\'s laatste jury slaapt in een stiltehuis bij Sellingen. Drie van hen krijgen morgen een envelop.', 'Ruil de enveloppen zonder een geluid te maken, en stop het geld in de collectebus.'],
  outro: 'Drie enveloppen geruild. Eén dak gered.', timeLimit: null, reward: 3000, clock: 1.0, noShoot: true,
  start: walk(/* zandweg bij Sellingen */),
  stages: [
    { kind: 'sneak', label: 'Sluip door de kruidentuin (houd de stilte-meter laag)', area: 'huize-stilte-tuin', noise: { grind: 3, gras: 1, kruid: 'sneeuw', bell: 100 }, guards: 0 },   // NEW: noise
    { kind: 'listen', label: 'Luister bij de drie ramen', spots: 3, range: 2, hold: 4 },
    { kind: 'swap', label: 'Ruil de drie enveloppen (houd E)', props: 3, hold: 3, with: 'oma-kaartje' },   // NEW
    { kind: 'use', target: { prop: 'collectebus' }, hold: 4, label: 'Stop het geld in de collectebus' },
    { kind: 'escape', label: 'Weg via de keuken', quiet: true },
  ] },
// O30
{ type: 'stages', label: 'Het beleg',
  intro: ['De vesting Bourtange is Ubbo\'s laatste voorronde, met de hekken dicht. Berend is bisschop, Tessa generaal, en zeven mensen hebben nog een gunst te betalen.', 'Geef de bevelen: gracht, ophaalbrug, drie bolwerken, poort. Het is toneel: karton, meel en water.'],
  outro: 'Voor het eerst in 354 jaar wint de belegeraar.', timeLimit: 480, reward: 5000, clock: 13.5, noShoot: true, theater: true,
  start: walk(/* hooiberg noord van Bourtange */),
  stages: [
    { kind: 'scene', kicker: 'Het krijgsberaad', cast: [{ key: 'berend', pose: 'ride' }, { key: 'lammert' }, { key: 'klaas' }, { key: 'fenna' }, { key: 'jelle' }, { key: 'tinus' }, { key: 'roelfien' }, { key: 'wubbo' }, { key: 'bert' }, { key: 'durk' }, { key: 'douwe' }, { key: 'dijkstra' }, { key: 'geesje' }, { key: 'rikus' }], cam: { table: true } },
    { kind: 'command', label: 'Geef het bevel: gracht, brug, bolwerken', fronts: 4,   // NEW
      acts: [
        { id: 'gracht', label: 'De gracht', allies: ['lammert', 'klaas', 'fenna', 'jelle'], mode: 'boat', dur: 90 },
        { id: 'brug', label: 'De ophaalbrug', allies: ['wubbo', 'berend'], dur: 30 },
        { id: 'bolwerken', label: 'De bolwerken', flags: 3, allies: ['roelfien', 'bert', 'tinus', 'durk', 'douwe'], dur: 150 } ],
      wet: { white: 'meel', wet: 'water', slow: 0.6 }, noDeath: true },
    { kind: 'scene', kicker: 'De poort', cast: [{ key: 'berend', pose: 'ride' }, { key: 'ubbo' }, { key: 'harm' }], cam: { crane: true } },
  ] },
// O31
{ type: 'stages', label: 'De laatste ronde',
  intro: ['De finale in de vesting. Tammo bakt voor de jury; Oma Trijntje is de oudste. Ubbo grijpt de Gouden Eierbal en vlucht.', 'Bak, achtervolg hem over de heide, stuur de duiven, en stop hem bij het grensbord.'],
  outro: 'De bal is thuis. Oma danst.', timeLimit: null, reward: 6000, clock: 16.0,
  start: walk(/* hoofdwacht, Bourtange */), own: 'fjord',
  stages: [
    { kind: 'bake', label: 'Bak in de vestingbakkerij (3 rondes)', rounds: 3, per: 70, ingredients: 7, jury: 5 },   // NEW
    { kind: 'scene', kicker: 'De proeverij', cast: [{ key: 'trijntje' }, { key: 'lammert' }, { key: 'berend' }, { key: 'siemen' }, { key: 'ubbo' }, { key: 'geesje' }], props: [{ kind: 'stolp' }] },
    { kind: 'swap', to: 'anita', label: 'Wissel' },   // NEW: swap player
    { kind: 'chase', label: 'Achter Ubbo aan over de heide en het veen', name: 'Terreinwagen van Ubbo', escort: [{ kind: 'quad', n: 2 }], hits: 6, hitMode: 'ram', flee: [/* heli-plek */], escape: 400, fragile: { label: 'Warm', per: 1.2, failAt: 0 }, tracker: 'henk' },
    { kind: 'swap', to: 'tammo', label: 'Wissel' },
    { kind: 'pigeon', spot: 'vestingmuur', label: 'Stuur de duiven voor de voorruit van de heli', time: 45, targets: [{ label: 'De heli van Ubbo', ground: true }], flock: 40, bert: true },
    { kind: 'swap', to: 'anita', label: 'Wissel' },
    { kind: 'goto', target: { at: [/* grensbord */] }, mode: 'vehicle', label: 'Het grensbord' },
    { kind: 'scene', kicker: 'Het grensbord', cast: [{ key: 'ubbo' }, { key: 'grens' }, { key: 'grenzer' }], props: [{ kind: 'borderline' }, { kind: 'thermos' }] },
    { kind: 'scene', kicker: 'De prijsuitreiking', cast: [{ key: 'trijntje' }, { key: 'lammert' }, { key: 'berend' }, { key: 'geesje' }, { key: 'rikus' }] },
  ] },
// O32
{ type: 'stages', label: 'Thuis',
  intro: ['Het is af. De Ronde is gewonnen, de bal is thuis, de lijst is afbetaald. Nu naar de Vismarkt.', 'Rij de colonne van Bourtange naar Stad. Er zijn mensen langs de weg. Er is een rij die nooit weg is gegaan.'],
  outro: 'Eén kar. Zeven filialen. Eén ronde per zomer.', timeLimit: null, reward: 2000, clock: 17.5, noShoot: true, cannotFail: true,
  start: walk(/* plein Vesting Bourtange */), own: 'fjord',
  stages: [
    { kind: 'scene', kicker: 'Het plein van de vesting', cast: [{ key: 'trijntje' }, { key: 'jelle' }, { key: 'durk' }, { key: 'douwe' }] },
    { kind: 'convoy', label: 'Rij de colonne naar de Vismarkt', route: 'bourtange-vismarkt', followers: 32, spots: ['vlagtwedde', 'stadskanaal', 'veendam', 'zuidbroek', 'hoogezand', 'stad'], quiet: ['hoogezand'], honk: true },   // NEW
    { kind: 'scene', kicker: 'De Vismarkt', cast: [{ key: 'rikus' }, { key: 'menigte' }], cam: { sunset: true } },
  ] },
```


### D. banterlines.js

```js
// banterlines.js: append. New triggers: after:O19..O32 (story codes), train:nieuweschans, train:veendam
  { id: 'tr-nieuweschans', trigger: 'train:nieuweschans', needs: 'n-winschoten', lines: [
    ['A', 'Hoogezand-Sappemeer. Zuidbroek. Scheemda. Het klinkt als een opsomming van een oom.', 'teasing'],
    ['T', 'Jouw oom?', 'dry'],
    ['A', 'Iedereens oom. Er is altijd een oom in Scheemda.', 'quick'],
    ['T', 'Kijk. Graan. Tot aan de hemel.', 'dry, looking out'],
    ['A', 'Dat noemen ze hier uitzicht.', 'dry'],
    ['T', 'Dat heeft ze van Eilert.', 'dry, small smile'],
    ['A', 'Winschoten. Ik heb een filiaal gedroomd. Hier. Aan het water.', 'dreamy'],
    ['T', 'Je hebt het water nog niet eens gezien.', 'dry'],
    ['A', 'Dat is het mooie van dromen.', 'quick']] },
  { id: 'o19-pass-naam', trigger: 'after:O19:pass', needs: 'O19', lines: [
    ['T', '"Namen zijn goedkoper dan eierballen." Wat zei jij toen?', 'dry'],
    ['A', 'Dat de mijne niet te koop is.', 'quiet'],
    ['T', 'En wat dacht je?', 'dry, soft'],
    ['A', 'Ik dacht aan de Vismarkt.', 'honest, quiet']] },
  { id: 'o19-pass-opa', trigger: 'after:O19:pass', needs: 'O19', lines: [
    ['A', '"Hij kon winnen. Dat is iets anders." Wat bedoelde ze?', 'thoughtful'],
    ['T', 'Dat jij en ik anders winnen.', 'dry'],
    ['A', 'Hoe dan?', 'curious'],
    ['T', 'Langzaam. Met de voeten op de grond.', 'dry, small smile']] },
  { id: 'o19-fail', trigger: 'after:O19:fail', needs: 'O19', lines: [
    ['T', 'Ze begeleidden je naar de poort. Met een glas.', 'dry'],
    ['A', 'Het was wel een goed glas.', 'sheepish']] },
  { id: 'o20-pass-ogen', trigger: 'after:O20:pass', needs: 'O20', lines: [
    ['A', 'Je had je ogen dicht.', 'teasing'],
    ['T', 'Ik had ze half dicht.', 'dry'],
    ['A', 'Roelfien zegt dicht.', 'quick'],
    ['T', 'Roelfien zat ernaast. Dat is anders.', 'dry']] },
  { id: 'o20-pass-sneeuw', trigger: 'after:O20:pass', needs: 'O20', lines: [
    ['T', 'Het sneeuwde. In september.', 'dry, still amazed'],
    ['A', 'Het was papier, Tammo.', 'laughing'],
    ['T', 'Het voelde als sneeuw.', 'dry']] },
  { id: 'o20-fail', trigger: 'after:O20:fail', needs: 'O20', lines: [
    ['T', 'Ik zei het. Ik wil op de grond.', 'dry'],
    ['A', 'Je zat er zes minuten in.', 'gentle'],
    ['T', 'Dat was zes minuten te veel.', 'dry']] },
  { id: 'o21-pass-streep', trigger: 'after:O21:pass', needs: 'O21', lines: [
    ['T', '"Nee. Daarom." Dat vond ik het mooiste antwoord van het jaar.', 'dry, admiring'],
    ['A', 'Hij had alleen gelijk.', 'dry'],
    ['T', 'Dat is het mooiste.', 'dry']] },
  { id: 'o21-pass-koffie', trigger: 'after:O21:pass', needs: 'O21', lines: [
    ['A', 'De Duitse agent bood koffie aan.', 'amused'],
    ['T', 'Mijn buurman zegt dat de koffie daar goedkoper is.', 'dry'],
    ['A', 'De koffie is overal goedkoper dan hier.', 'dry'],
    ['T', 'Dat zeg ik ook over de friet.', 'dry, deadpan']] },
  { id: 'o21-fail', trigger: 'after:O21:fail', needs: 'O21', lines: [
    ['A', 'Eén truck. Eén verloren truck.', 'annoyed'],
    ['T', 'Hij had een gele helm. Hij was serieus.', 'dry']] },
  { id: 'o22-pass-half', trigger: 'after:O22:pass', needs: 'O22', lines: [
    ['A', '"Eén brein tussen ons tweeën. Dat is half." Ik moest bijna huilen.', 'moved, amused'],
    ['T', 'Het is de eerlijkste rekensom van het jaar.', 'dry']] },
  { id: 'o22-pass-mem', trigger: 'after:O22:pass', needs: 'O22', lines: [
    ['T', 'Hij kocht de bakkerij van Jelles moeder. En kondigde het af over de luidspreker.', 'dry, angry underneath'],
    ['A', 'Hij weet precies waar het pijn doet.', 'quiet'],
    ['T', 'Dat is zijn vak.', 'dry']] },
  { id: 'o22-fail', trigger: 'after:O22:fail', needs: 'O22', lines: [
    ['T', 'Een botsauto stuurt als een bakfiets.', 'dry, frustrated'],
    ['A', 'Een bakfiets heeft meer richting.', 'dry']] },
  { id: 'o25-pass-pomp', trigger: 'after:O25:pass', needs: 'O25', lines: [
    ['A', 'Je versloeg zes mannen met een fietspomp.', 'amused'],
    ['T', 'Ik sloeg ze niet. Ik duwde ze weg.', 'dry'],
    ['A', 'Met een fietspomp.', 'laughing'],
    ['T', 'Hij zat erin. Dat is een pomp.', 'dry']] },
  { id: 'o25-pass-vriendelijker', trigger: 'after:O25:pass', needs: 'O25', lines: [
    ['A', '"Maar vriendelijker." Dat is het mooiste wat iemand ooit tegen me zei.', 'soft'],
    ['T', 'Ik heb nog meer.', 'dry, shy'],
    ['A', 'Bewaar ze.', 'warm']] },
  { id: 'o25-fail', trigger: 'after:O25:fail', needs: 'O25', lines: [
    ['T', 'Veertien kilometer fietsen voor een pers.', 'dry, exhausted']] },
  { id: 'o26-pass-sint', trigger: 'after:O26:pass', needs: 'O26', lines: [
    ['T', '"Net Sinterklaas." Wie zegt dat?', 'dry'],
    ['A', 'Iedereen die wit is, denkt dat.', 'dry, still white'],
    ['T', 'Ik denk het nu ook.', 'dry']] },
  { id: 'o26-pass-paling', trigger: 'after:O26:pass', needs: 'O26', lines: [
    ['T', 'Een kilo paling per jurylid. Hij betaalde in vis.', 'dry'],
    ['A', 'Zijn kleinzoon betaalt in enveloppen.', 'cold'],
    ['T', 'Het is dezelfde familie.', 'dry'],
    ['A', 'Het is dezelfde kar.', 'quiet']] },
  { id: 'o26-fail', trigger: 'after:O26:fail', needs: 'O26', lines: [
    ['A', 'Ik gleed uit in het meel.', 'sheepish'],
    ['T', 'Je bent wit. Dat is al een medaille.', 'dry']] },
  { id: 'o27-pass-brug', trigger: 'after:O27:pass', needs: 'O27', lines: [
    ['T', 'We stonden op een brug. Die ging omhoog. En we hebben gebakken.', 'dry, amazed'],
    ['A', 'Dat is wat we doen. We bakken waar het niet kan.', 'quick, proud']] },
  { id: 'o27-pass-rieks', trigger: 'after:O27:pass', needs: 'O27', lines: [
    ['A', '"Dertig jaar getekend zonder te lezen." Ik heb medelijden.', 'amused'],
    ['T', 'Ze zei: Valt mie nait of. Dat is trede drie.', 'dry'],
    ['A', 'Van een notaris.', 'quiet, amazed']] },
  { id: 'o27-fail', trigger: 'after:O27:fail', needs: 'O27', lines: [
    ['T', 'Een kraam gaat niet mee omhoog. Hij blijft op de aarde.', 'dry'],
    ['A', 'Hij zat op de brug, Tammo.', 'dry']] },
  { id: 'o28-pass-samen', trigger: 'after:O28:pass', needs: 'O28', lines: [
    ['A', '"Samen is ook een antwoord."', 'soft'],
    ['T', 'Ik zeg ze zelden.', 'dry, quiet'],
    ['A', 'Dat is waarom ze tellen.', 'warm']] },
  { id: 'o28-pass-berend', trigger: 'after:O28:pass', needs: 'O28', lines: [
    ['T', 'Berend zei "kon minder".', 'dry'],
    ['A', 'Tegen een paard.', 'amazed'],
    ['T', 'Tegen zichzelf.', 'dry']] },
  { id: 'o28-fail', trigger: 'after:O28:fail', needs: 'O28', lines: [
    ['A', 'Hij rent. Je was te dichtbij.', 'sighing'],
    ['T', 'Hij is een paard. Hij had ruimte nodig.', 'dry']] },
  { id: 'o29-pass-dak', trigger: 'after:O29:pass', needs: 'O29', lines: [
    ['A', 'Een dak. Dat is het enige goede wat Ubbo ooit betaald heeft.', 'amused'],
    ['T', 'Zonder het te weten.', 'dry'],
    ['A', 'Dat is de beste soort.', 'dry']] },
  { id: 'o29-fail', trigger: 'after:O29:fail', needs: 'O29', lines: [
    ['T', 'Het was lavendel.', 'whispering, dry'],
    ['A', 'Het is altijd lavendel.', 'soft']] },
  { id: 'o30-pass-winnen', trigger: 'after:O30:pass', needs: 'O30', lines: [
    ['T', '"Dan is winnen verkeerd." Dat zegt hij over alles.', 'dry'],
    ['A', 'Maar nu zei hij het voor het eerst na een overwinning.', 'warm'],
    ['T', 'Dat is het mooiste.', 'dry']] },
  { id: 'o30-pass-zeven', trigger: 'after:O30:pass', needs: 'O30', lines: [
    ['A', 'Zeven mensen. Voor Oma.', 'moved'],
    ['T', 'Zeventig jaar rente.', 'dry, soft'],
    ['A', 'Ze hebben het allemaal betaald.', 'quiet']] },
  { id: 'o30-fail', trigger: 'after:O30:fail', needs: 'O30', lines: [
    ['T', 'Acht minuten. Berend zegt dat hij het in zeven had gedaan.', 'dry'],
    ['A', 'Hij heeft veertig jaar verloren. Hij weet.', 'dry']] },
  { id: 'o31-pass-ow', trigger: 'after:O31:pass', needs: 'O31', lines: [
    ['T', 'Ubbo zei Ow.', 'dry'],
    ['A', 'Hij zei het alsof hij het voor het eerst hoorde.', 'warm'],
    ['T', 'Dat is hoe het begint.', 'dry, soft']] },
  { id: 'o31-pass-dans', trigger: 'after:O31:pass', needs: 'O31', lines: [
    ['A', 'Ze danste. Langzaam. Met de voeten op de grond.', 'soft'],
    ['T', 'Ik wil niet weten wat ik daarbij voel.', 'dry, quiet'],
    ['A', 'Dat is wat jij voelt, Tammo.', 'teasing, warm']] },
  { id: 'o31-fail', trigger: 'after:O31:fail', needs: 'O31', lines: [
    ['A', 'Hij haalde het bord.', 'frustrated'],
    ['T', 'Een grens is een lijn. Je moest alleen eerder zijn.', 'dry']] },
  { id: 'o32-pass-zes', trigger: 'after:O32:pass', needs: 'O32', lines: [
    ['A', '"Thuis is waar de kar staat." Dat is zes woorden.', 'teasing'],
    ['T', 'Dat telde je met je vingers.', 'dry'],
    ['A', 'Ik tel altijd mee.', 'warm']] },
  { id: 'o32-pass-ronde', trigger: 'after:O32:pass', needs: 'O32', lines: [
    ['T', 'Eén ronde per zomer. Dat is een soort thuis.', 'dry, soft'],
    ['A', 'Dat is een soort groei.', 'warm'],
    ['T', 'Dan zijn we allebei klaar.', 'dry']] },
  { id: 'tr-veendam', trigger: 'train:veendam', needs: 'n-veendam', lines: [
    ['A', 'Zuidbroek. Hier zat ik gisteren. Alleen.', 'quiet'],
    ['T', 'Ik zat in de trein naar Stad. Ook alleen.', 'dry, soft'],
    ['A', 'Dat was geen goede dag.', 'soft'],
    ['T', 'Het was een nuttige dag.', 'dry, quiet'],
    ['A', 'Dat is dezelfde dag, Tammo.', 'teasing, warm'],
    ['T', 'Het was een nuttige dag.', 'dry, small smile']] },
```

### E. subtitles.js

```js
// subtitles.js GRO: lines shown in Gronings, with their Dutch
  'Valt mie nait of.': 'Dat valt me niet tegen.',
  'Braid noar de zin.': 'Helemaal tevreden.',

// subtitles.js FY: Frisian lines, with their Dutch
  'Jelle springt. Altijd. Met polsstok. Foar mem.': 'Jelle springt. Altijd. Met polsstok. Voor mijn moeder.',
  'Tessa. Famke. Ik hoor dat jullie thuiskomen. Ik hoor ook dat Durk en Douwe weer eten. Net fertelle.': 'Ik hoor dat jullie thuiskomen. Ik hoor ook dat Durk en Douwe weer eten. Niet doorvertellen.',
  'Het is stil. Maar het is een goeie stilte. Tige tank.': 'Heel erg bedankt.',
  'Halt. Fryske tol. Ien klomp, as it jo belieft.': 'Halt. Friese tol. Eén klomp, alstublieft.',
  'Wy oefenje.': 'Wij oefenen.',
  'Fan Durk en Douwe.': 'Van Durk en Douwe.',
  'Jim meie troch. Mar net fertelle.': 'Jullie mogen door. Maar niet doorvertellen.',

// subtitles.js DE: German lines (NEW table, same shape as FY), with their Dutch
  'Hier hört es auf. Für mich auch.': 'Hier houdt het op. Voor mij ook.',
  'Das ist unser Problem. Aber nur ab hier.': 'Dat is ons probleem. Maar alleen vanaf hier.',
  'Wollen Sie einen Kaffee?': 'Wilt u koffie?',
  'Er bekommt Kaffee. Wir passen auf.': 'Hij krijgt koffie. Wij letten op hem.',
  'Eine Fuß. Zwei Füße sind eine Meinung.': 'Eén voet. Twee voeten zijn een mening.',
  'Möchten Sie ein Foto?': 'Wilt u een foto?',
```

### F. scripts/gronings_spoken.json (toevoegingen)

Wat de stemmen zeggen: elke getoonde Nederlandse regel → de Groningse uitspraak (1101 regels). Zelfde spelling als de bestaande tabel. Friese en Duitse sprekers (Jelle, Durk, Douwe, Mem, Wybe, Wiebren, de Duitse grenswachter) staan er niet in: die spreken hun eigen taal (`lang: 'own'`); de blaffende Bor en het schoolbord van Broeder Everhard hebben geen stem. Regels die al in het Gronings getoond worden, staan erin met zichzelf. **Controle:** `node scripts/gronings_spoken_test.mjs` (cijfers gelijk, niet veel langer). Dit is een regelgebaseerde eerste versie; een redacteur met Gronings als moedertaal leest hem na, zoals bij de eerste tabel.

```json
{
"…Dank je, Rikus.": "…Dank je, Rikus.",
"…Dat is wat anders.": "…Dat is wat aans.",
"…Dat klopt wel.": "…Dat klopt wel.",
"…Dat zeg ik altijd.": "…Dat zeg ik aaltied.",
"…één kilo…per man…geen vis…": "…ain kilo…per man…geen vis…",
"…eerlijk voor mij…eerlijk voor mij…": "…eerlk veur mij…eerlijk veur mie…",
"…Eronder.": "…Deronder.",
"…Graag.": "…Graag.",
"…Het is open.": "…T is open.",
"…Ik fluit. De duif pikt.": "…Ik fluit. De duuf pikt.",
"…Ik heb het contract verscheurd.": "…Ik heb t contract verscheurd.",
"…Ik zeg het nu voor het eerst met overtuiging.": "…Ik zeg t nou veur t aarst mit overtuiging.",
"…tekenen…lezen…ik moet lezen…": "…tekenen…lezen…ik mout lezen…",
"…Ze weet alles.": "…Ze wait aals.",
"\"1953: jury. H. O. Aan zichzelf.\"": "\"1953: jury. H. O. Aan zichzelf.\"",
"\"Dan is winnen verkeerd.\" Dat zegt hij over alles.": "\"Dan is winnen verkeerd.\" Dat zegt hai over aals.",
"\"De jury is gekocht.\" En een lijstje met namen. Ik ken er drie. Mijn zwager zit erbij.": "\"De jury is gekocht.\" En n lijstje mit namen. Ik ken der drij. Mien zwager zit derbie.",
"\"Dertig jaar getekend zonder te lezen.\" Ik heb medelijden.": "\"Dertig joar getekend zonder te lezen.\" Ik heb medelijden.",
"\"Eén brein tussen ons tweeën. Dat is half.\" Ik moest bijna huilen.": "\"Eén brein tussen ons tweeën. Dat is half.\" Ik moest bieno huilen.",
"\"Eerste prijs. Ommelander Ronde. 1953. H. Oldenhuis.\"": "\"Aarste prijs. Ommelander Ronde. 1953. H. Oldenhuis.\"",
"\"Eigen kar: 10. Trijntje: 6.\" Hij gaf zichzelf een tien.": "\"Aigen kar: 10. Trijntje: 6.\" Hai gaf zichzelf n tien.",
"\"Fjord Frituur. Eenenveertig locaties. Naam en gezicht: mevrouw Tessa.\"": "\"Fjord Frituur. Eenenveertig locaties. Noam en gezicht: mevrouw Tessa.\"",
"\"Hij kon winnen. Dat is iets anders.\" Wat bedoelde ze?": "\"Hai kon winnen. Dat is wat aans.\" Wat bedoelde ze?",
"\"Kasboek, deel twee.\" Eenenveertig bladzijden. Eén per snackbar.": "\"Kasboek, deel twij.\" Eenenveertig bladzijden. Eén per snackbar.",
"\"Maar vriendelijker.\" Dat is het mooiste wat iemand ooit tegen me zei.": "\"Mor vriendelijker.\" Dat is t mooiste wat ain ooit tegen mie zee.",
"\"Namen zijn goedkoper dan eierballen.\" Wat zei jij toen?": "\"Namen zien goedkoper dan eierballen.\" Wat zee doe toen?",
"\"Nee. Daarom.\" Dat vond ik het mooiste antwoord van het jaar.": "\"Nee. Doarom.\" Dat vond ik t mooiste antwoord van t joar.",
"\"Net Sinterklaas.\" Wie zegt dat?": "\"Net Sinterklaas.\" Wel zegt dat?",
"\"Samen is ook een antwoord.\"": "\"Samen is ook n antwoord.\"",
"\"Thuis is waar de kar staat.\" Dat is zes woorden.": "\"Thoes is woar de kar stait.\" Dat is zes woorden.",
"`[alleen als Z4 gespeeld]` Jullie hebben de medaille. Ik gooide hem in de klei, van boosheid. Dat was dom. Die klei was van iemand anders.": "`[aleen as Z4 gespeeld]` Jullie hebben de medaille. Ik gooide hom in de klei, van boosheid. Dat was dom. Dij klei was van ain aans.",
"`[alleen zonder Z4]` Ik gooide mijn medaille in de klei, vanaf de dijk. Van boosheid. Er is vast iemand met een detector die hem vindt. Die zijn er altijd.": "`[aleen zonder Z4]` Ik gooide mien medaille in de klei, vanaf de diek. Van boosheid. Der is vast ain mit n detector dij hom vindt. Dij binnen der aaltied.",
"Aan de kant, Stadjer!": "Aan de kant, Stadjer!",
"Aanvallen.": "Aanvallen.",
"Accu. Kabels erop, Tammo.": "Accu. Kabels derop, Tammo.",
"Acht minuten. Berend zegt dat hij het in zeven had gedaan.": "Acht menuten. Berend zegt dat hai t in zeven har doan.",
"Achter je!": "Achter je!",
"Alarm! Steiger, links! Er ligt een sloep.": "Alarm! Steiger, links! Der ligt n sloep.",
"Alleen als iemand trouwt. Of verdwaalt.": "Aleen as ain trouwt. Of verdwaalt.",
"Alleen jij, staat er. Ik heb ook een jas.": "Aleen doe, stait der. Ik heb ook n jas.",
"Alles?": "Aals?",
"Alles. Mijn mensen, mijn schepen en mijn zus. Er is een laatste kans, Rikus. En ik pak hem.": "Aals. Mien mensen, mien schepen en mien zus. Der is n lèste kans, Rikus. En ik pak hom.",
"Als een bakkerij die niks bakt.": "As n bakkerij dij niks bakt.",
"Als hij open gaat?": "As hai open goat?",
"Als we winnen. Dan is er een filiaal in een boshut.": "As wie winnen. Dan is der n filiaal in n boshut.",
"Beerta. Een grote kerk in een klein dorp. De klei was rijk. Dat is het hele verhaal.": "Beerta. N grode kerk in n klain dorp. De klei was riek. Dat is t hele verhaal.",
"Behalve één.": "Behalve ain.",
"Behalve één. Ik zie ze door de verrekijker. Ik meld alleen. Dat heb ik van de molenaar.": "Behalve ain. Ik zai ze deur de verrekijker. Ik meld aleen. Dat heb ik van de molenaar.",
"Bent u familie van de torenwachter?": "Bist u familie van de torenwachter?",
"Berend Bos stuurde een brief. Hij wil volgend jaar niet meer verliezen. Hij heeft het niet over winnen. Hij wil gewoon niet.": "Berend Bos stuurde n brief. Hai wil volgend joar nait meer verliezen. Hai het t nait over winnen. Hai wil gewoon nait.",
"Berend Bos zegt niks. Dat is de hoogste trede. Dat is een kloet in de strotte.": "Berend Bos zegt niks. Dat is de hoogste trede. Dat is n kloet in de strotte.",
"Berend zei \"kon minder\".": "Berend zee \"kon minder\".",
"Berm in. Hij is groter dan jouw hele flat.": "Berm in. Hai is grötter dan dien hele flat.",
"Bewaar ze.": "Bewaar ze.",
"Bewaker bij de trap kijkt weg. Nu. Boven.": "Bewaker bie de trap kiekt weg. Nou. Boven.",
"Bewaker links. Zaklamp. Wacht. Nu.": "Bewaker links. Zaklamp. Wacht. Nou.",
"Bij de Vismarkt staat een blauwe frietwagen op een rode Escapade. De rij loopt nog tot de Korenbeurs. Hij is vandaag ook gebleven.": "Bie de Vismarkt stait n blauwe frietwagen op n rode Escapade. De rie loopt nog tot de Korenbeurs. Hai is vandoage ook bleven.",
"Bijna.": "Bieno.",
"Boer links. Hooivork. Niet kijken naar de camera.": "Boer links. Hooivork. Nait kieken noar de camera.",
"Bor weet het. Bor wist het altijd.": "Bor wait t. Bor wus t aaltied.",
"Bor. Het is Bor. Ik weet het niet. Maar de volgende keer weet ik het wel.": "Bor. T is Bor. Ik wait t nait. Mor de volgende keer wait ik t wel.",
"Botsauto's! Zweefmolen! Schiettent! Alles!": "Botsauto's! Zweefmolen! Schiettent! Aals!",
"Bourtange. Een vesting van 1593. Vijf bolwerken. In 1672 hield hij een bisschop buiten. In 2026 niet.": "Bourtange. N vesting van 1593. Vief bolwerken. In 1672 hield hai n bisschop buten. In 2026 nait.",
"Bourtange. Het busje is klein. De vesting is groot. Er zitten mensen die er gewoon wonen. Rij zachtjes.": "Bourtange. T busje is klain. De vesting is groot. Der zitten mensen dij der gewoon wonen. Rij zachtjes.",
"Boven jullie. Meel komt. Hoofd omlaag.": "Boven jim. Meel komt. Hoofd omlaag.",
"Braid noar de zin.": "Braid noar de zin.",
"Brug één. Zeg het maar. Ik doe open.": "Brug ain. Zeg t mor. Ik doe open.",
"Cijferslot. Vier cijfers. Eén-negen-vijf-drie.": "Cijferslot. Vier cijfers. Eén-negen-vijf-drie.",
"Daar. Een wolf. Hij is zo… mooi.": "Doar. N wolf. Hai is zo… mooi.",
"Daar. Tussen de berken. Een wolf.": "Doar. Tussen de berken. N wolf.",
"Daarom.": "Doarom.",
"Dag Berend. Mooie jurk.": "Dag Berend. Mooie jurk.",
"Dames en heren, de botsauto's zijn gratis! Dat is niet waar. Maar het klinkt goed!": "Dames en heren, de botsauto's zien gratis! Dat is nait woar. Mor t klinkt goud!",
"Dames en heren, de kermis kent geen herhaling. Maar wij wel!": "Dames en heren, de kermis kent gain herhaling. Mor wie wel!",
"Dames en heren, de machinist zegt dat hij weet wat hij doet. Hou u even vast. Het is een stoomtrein.": "Dames en heren, de machinist zegt dat hai wait wat hai dut. Hol u eefkes vast. T is n stoomtrein.",
"Dames en heren, de trekkerparade! Eén trekker! Dat is het hele dorp! Hij heeft een vlag!": "Dames en heren, de trekkerparade! Eén trekker! Dat is t hele dorp! Hai het n vlag!",
"Dames en heren, de voorronde Oldambt! Eerst proeven, dan botsen, dan nog een keer proeven!": "Dames en heren, de voorronde Oldambt! Aarst proeven, dan botsen, dan nog n keer proeven!",
"Dames en heren, een mededeling: er valt papier uit de lucht. Niet bukken. Wel lezen.": "Dames en heren, n mededeling: der valt papier oet de lucht. Nait bukken. Wel lezen.",
"Dames en heren. De gemeente belt. De vergunning van Oldenhuis Bakt is vervallen. Er mist een papier: een Verklaring omtrent Gedrag. Er is geen kwestie van willen. Dat is papier.": "Dames en heren. De gemeente belt. De vergunning van Oldenhuis Bakt is vervallen. Der mist n papier: n Verklaring omtrent Gedrag. Der is gain kwestie van willen. Dat is papier.",
"Dames en heren. Het beleg van Bourtange. Zestienhonderdtweeënzeventig. Ik verloor. Vandaag niet.": "Dames en heren. T beleg van Bourtange. Zestienhonderdtweeënzeventig. Ik verloor. Vandoage nait.",
"Dan ben ik een tel te vroeg. Dat is nog erger.": "Dan ben ik n tel te vroeg. Dat is nog erger.",
"Dan blijf je staan. Maar lees.": "Dan blief je stoan. Mor lees.",
"Dan breken we hem eenenveertig keer.": "Dan breken wie hom eenenveertig keer.",
"Dan gaat alles omhoog. Ook jullie.": "Dan goat aals omhoog. Ook jim.",
"Dan halen we hem terug. Het bord kan dat niet verbieden.": "Dan hoalen wie hom terug. T bord kin dat nait verbieden.",
"Dan hoort u het niet van mij. Maar daar rookt iemand een sigaar. In een museumtrein. Dat is een misdaad op zich.": "Dan heurt u t nait van mie. Mor doar rookt ain n sigaar. In n museumtrein. Dat is n misdaad op zich.",
"Dan is de bal van de sponsor.": "Dan is de bal van de sponsor.",
"Dan is de finale in Westerwolde. Daar is geen trein. Dat hoort zo.": "Dan is de finale in Westerwolde. Doar is gain trein. Dat heurt zo.",
"Dan is dit voorbij.": "Dan is dit voorbij.",
"Dan is er één kraam in een bos.": "Dan is der ain kraam in n bos.",
"Dan is het altijd een thuiswedstrijd.": "Dan is t aaltied n thuiswedstrijd.",
"Dan is het een goede dag.": "Dan is t n goie dag.",
"Dan is winnen verkeerd.": "Dan is winnen verkeerd.",
"Dan kijk je naar voren. Daar zit het graan.": "Dan kiek je noar voren. Doar zit t groan.",
"Dan staan we op de streep.": "Dan stoan wie op de streep.",
"Dan staat u daar. Dat is ook goed.": "Dan stait u doar. Dat is ook goud.",
"Dan staat u op de streep.": "Dan stait u op de streep.",
"Dan toeter je een tel eerder.": "Dan toeter je n tel aarder.",
"Dan zaterdag. In de vesting.": "Dan zaterdag. In de vesting.",
"Dan zijn jullie hier thuis.": "Dan zien jim hier thoes.",
"Dan zijn we allebei klaar.": "Dan zien wie allebei kloar.",
"Dan zit hij al aan tafel.": "Dan zit hai al aan tafel.",
"Dank je. Dat is het liefste dat iemand ooit tegen ons gezegd heeft.": "Dank je. Dat is t liefste dat ain ooit tegen ons gezegd het.",
"Dank mien vader. Hij leende tien gulden. Het is nooit teruggekomen. Maar de brug wel.": "Dank mien voader. Hai leende tien gulden. T is nooit teruggekomen. Mor de brug wel.",
"Dank u, broeder.": "Dank u, broeder.",
"Dank u, Dries.": "Dank u, Dries.",
"Dank u, mevrouw! Ik ga naar huis!": "Dank u, mevrouw! Ik goa noar hoes!",
"Dank u.": "Dank u.",
"Dank u. Ik drink liever eerst.": "Dank u. Ik drink liever aarst.",
"Dank, Gerrit.": "Dank, Gerrit.",
"Dank, Henk. Zeg het niet tegen de baas.": "Dank, Henk. Zeg t nait tegen de baas.",
"Dat bedoelde ik niet.": "Dat bedoelde ik nait.",
"Dat bedoelde ik.": "Dat bedoelde ik.",
"Dat daar is het Oldambt. En dat blauwe, dat is het meer. Dat is nieuw. Tien jaar. Dat is hier nieuw.": "Dat doar is t Oldambt. En dat blauwe, dat is t meer. Dat is nij. Tien joar. Dat is hier nij.",
"Dat de mijne niet te koop is.": "Dat de mijne nait te koop is.",
"Dat doen kramen. Als ze op een brug staan.": "Dat doun kramen. As ze op n brug stoan.",
"Dat doet iedereen. Tot hij vliegt.": "Dat dut iedereen. Tot hai vliegt.",
"Dat heeft ze van Eilert.": "Dat het ze van Eilert.",
"Dat hoor ik vaker.": "Dat hoor ik vaker.",
"Dat hoor ik voor het eerst. Dank je. Ik had het zelf nooit gedacht.": "Dat hoor ik veur t aarst. Dank je. Ik har t zulf nooit gedacht.",
"Dat is correct. Dat is papier.": "Dat is correct. Dat is papier.",
"Dat is de bedoeling.": "Dat is de bedoeling.",
"Dat is de beste soort.": "Dat is de beste soort.",
"Dat is de burgemeester. Op een trekker. Ik zou het zo doen.": "Dat is de burgemeester. Op n trekker. Ik zol t zo doun.",
"Dat is de eerste trede, Ubbo.": "Dat is de aarste trede, Ubbo.",
"Dat is de wind. Hij komt van de Dollard. Daarna komt het graan. Daarna jullie.": "Dat is de wind. Hai komt van de Dollard. Doarna komt t groan. Doarna jim.",
"Dat is dezelfde dag, Tammo.": "Dat is dezelfde dag, Tammo.",
"Dat is een begin.": "Dat is n begin.",
"Dat is een beschuldiging.": "Dat is n beschuldiging.",
"Dat is een bisschop. Daar mag je niet op schieten. Met karton.": "Dat is n bisschop. Doar mag je nait op schieten. Mit karton.",
"Dat is een compliment.": "Dat is n compliment.",
"Dat is een goede plek.": "Dat is n goie plek.",
"Dat is een koe, Floor. Die zegt dat altijd.": "Dat is n kou, Floor. Dij zegt dat aaltied.",
"Dat is een ronde.": "Dat is n ronde.",
"Dat is een soort groei.": "Dat is n soort groei.",
"Dat is geen antwoord.": "Dat is gain antwoord.",
"Dat is geen bank. Dat is een wasserette.": "Dat is gain bank. Dat is n wasserette.",
"Dat is geen plan, Wubbo!": "Dat is gain plan, Wubbo!",
"Dat is geen wolf.": "Dat is gain wolf.",
"Dat is het eerlijkste wat dat geld ooit gedaan heeft.": "Dat is t eerlijkste wat dat geld ooit doan het.",
"Dat is het enige wat je nodig hebt.": "Dat is t enige wat je nodig hest.",
"Dat is het ergste.": "Dat is t ergste.",
"Dat is het geluid van papier. Het klinkt niet zo mooi als stoom.": "Dat is t geluid van papier. T klinkt nait zo mooi as stoom.",
"Dat is het meest Tammo-achtige dat ik ooit heb gehoord.": "Dat is t meest Tammo-achtige dat ik ooit heb heurd.",
"Dat is het mooie van dromen.": "Dat is t mooie van dromen.",
"Dat is het mooie. En het enge.": "Dat is t mooie. En t enge.",
"Dat is het mooiste afscheid dat ik ken.": "Dat is t mooiste afscheid dat ik ken.",
"Dat is het mooiste wat u hebt gezegd.": "Dat is t mooiste wat u hest gezegd.",
"Dat is het mooiste.": "Dat is t mooiste.",
"Dat is het nu wel.": "Dat is t nou wel.",
"Dat is het probleem met reuzen.": "Dat is t probleem mit reuzen.",
"Dat is hetzelfde Ow. Maar het is niet hetzelfde.": "Dat is hetzelfde Ow. Mor t is nait hetzelfde.",
"Dat is hetzelfde! Dan is dit gewoon… terugkopen!": "Dat is hetzelfde! Dan is dit gewoon… terugkopen!",
"Dat is hoe het begint.": "Dat is hoe t begint.",
"Dat is hun probleem.": "Dat is heur probleem.",
"Dat is jouw gave. Ik heb er een tel te laat.": "Dat is dien gave. Ik heb der n tel te loat.",
"Dat is karakter.": "Dat is karakter.",
"Dat is lief.": "Dat is lief.",
"Dat is mooi. Dat scheelt papierwerk.": "Dat is mooi. Dat scheelt papierwerk.",
"Dat is niet gek. Dat is stilte.": "Dat is nait gek. Dat is stilte.",
"Dat is niet hetzelfde.": "Dat is nait hetzelfde.",
"Dat is niet hetzelfde. Dit is… afkopen.": "Dat is nait hetzelfde. Dit is… afkopen.",
"Dat is niet hoe bruggen werken!": "Dat is nait hoe bruggen warken!",
"Dat is Oma's jaar.": "Dat is Oma's joar.",
"Dat is onder controle.": "Dat is onder controle.",
"Dat is ook een soort zeggen.": "Dat is ook n soort zeggen.",
"Dat is ook iemand.": "Dat is ook ain.",
"Dat is ook zo. Ik vergeet het steeds.": "Dat is ook zo. Ik vergeet t steeds.",
"Dat is thuis.": "Dat is thoes.",
"Dat is vier keer Ow. Dat is veel Ow.": "Dat is vier keer Ow. Dat is veul Ow.",
"Dat is vroeg. Eerst proeven.": "Dat is vroeg. Aarst proeven.",
"Dat is waar je voor reed, hè? Een plek. Een rij. Een naam. Ik geef het je. Vandaag.": "Dat is woar je veur reed, hè? N plek. N rie. N noam. Ik geef t je. Vandoage.",
"Dat is waarom ze tellen.": "Dat is woarom ze tellen.",
"Dat is wat ik zeg.": "Dat is wat ik zeg.",
"Dat is wat jij voelt, Tammo.": "Dat is wat doe voelt, Tammo.",
"Dat is wat we doen. We bakken waar het niet kan.": "Dat is wat wie doun. Wie bakken woar t nait kin.",
"Dat is winnen, Berend.": "Dat is winnen, Berend.",
"Dat is zes woorden.": "Dat is zes woorden.",
"Dat is zeventig jaar rente. Ik ben boerin. Ik reken dat uit.": "Dat is zeventig joar rente. Ik ben boerin. Ik reken dat oet.",
"Dat is zijn vak.": "Dat is zien vak.",
"Dat is zomer die doorreist.": "Dat is zomer dij doorreist.",
"Dat is… boekhouding.": "Dat is… boekhouding.",
"Dat is… niet waar.": "Dat is… nait woar.",
"Dat jij en ik anders winnen.": "Dat doe en ik aans winnen.",
"Dat klinkt als een goed contract, Tessa.": "Dat klinkt as n goud contract, Tessa.",
"Dat noemen wij… verdunnen.": "Dat noemen wie… verdunnen.",
"Dat noemen ze hier uitzicht.": "Dat noemen ze hier uitzicht.",
"Dat regel ik.": "Dat regel ik.",
"Dat stel. Eindelijk. Ik wacht al drie kwartier. Het paard ook.": "Dat stel. Aindelk. Ik wacht al drij kwartier. T peerd ook.",
"Dat telde je met je vingers.": "Dat telde je mit je vingers.",
"Dat verklaart die auto voor zijn deur.": "Dat verklaart dij auto veur zien deur.",
"Dat was een beetje waar.": "Dat was n beetje woar.",
"Dat was een goede stoker. Dat was een betere machinist. Zeg het niet tegen de ketel.": "Dat was n goie stoker. Dat was n betere machinist. Zeg t nait tegen de ketel.",
"Dat was geen goede dag.": "Dat was gain goie dag.",
"Dat was niet zo bedoeld. Maar ik neem het.": "Dat was nait zo bedoeld. Mor ik nuim t.",
"Dat was zes minuten te veel.": "Dat was zes menuten te veul.",
"Dat weet iedereen.": "Dat wait iedereen.",
"Dat weet iedereen. Het gaat vanzelf.": "Dat wait iedereen. T goat vanzelf.",
"Dat weten we.": "Dat weten wie.",
"Dat wilde je?": "Dat wol je?",
"Dat zeg ik al twaalf jaar.": "Dat zeg ik al twaalf joar.",
"Dat zeg ik één keer. Ik was negentien. De Ronde was in Bourtange. Mijn eierbal was beter. De jury had een kilo paling in zijn zak. Hendrik Oldenhuis zat voorop. Hij gaf zichzelf de prijs.": "Dat zeg ik ain keer. Ik was negentien. De Ronde was in Bourtange. Mien eierbal was beter. De jury har n kilo paling in zien zak. Hendrik Oldenhuis zat voorop. Hai gaf zichzelf de prijs.",
"Dat zeg ik haar niet.": "Dat zeg ik heur nait.",
"Dat zeg ik ook over de friet.": "Dat zeg ik ook over de friet.",
"Dat zeg je pas nu?": "Dat zeg je pas nou?",
"Dat zeg je steeds. Rekenen jullie het wel eens uit?": "Dat zeg je steeds. Rekenen jim t wel eens oet?",
"Dat zeg je vaker.": "Dat zeg je vaker.",
"Dat zeggen ze allemaal. Een tijdje is een brug die nog dicht is.": "Dat zeggen ze allemoal. N tijdje is n brug dij nog dicht is.",
"Dat zeggen ze overal.": "Dat zeggen ze overal.",
"Dat zeggen ze vaker.": "Dat zeggen ze vaker.",
"Dat zegt iedereen. Tot het bedrag er staat.": "Dat zegt iedereen. Tot t bedrag der stait.",
"Dat zei ik ook.": "Dat zee ik ook.",
"Dat zei ik: kinderen.": "Dat zee ik: kinderen.",
"Dat zei ik.": "Dat zee ik.",
"Dat zie ik. Het is mijn brug. Hij houdt van gewicht. Behalve als hij open gaat.": "Dat zai ik. T is mien brug. Hai houdt van gewicht. Behalve as hai open goat.",
"Dat zijn de buren.": "Dat binnen de buren.",
"Dat zijn de wijken. Dat is het kanaal. Dat daar is de fabriek. Dat is waar Ubbo opgroeide. Hij was een stille jongen. Hij had altijd vet aan zijn schoenen.": "Dat binnen de wijken. Dat is t kanaal. Dat doar is de fabriek. Dat is woar Ubbo opgroeide. Hai was n stille jong. Hai har aaltied vet aan zien schoenen.",
"De baas wacht. Hij heeft thee.": "De baas wacht. Hai het thee.",
"De bel ging.": "De bel gong.",
"De bijen vinden het goed.": "De bijen vinden t goud.",
"De boot ligt aan de kade. De sleutel! Vang!": "De boot ligt aan de kaai. De sleutel! Vang!",
"De brug. Altijd de brug.": "De brug. Aaltied de brug.",
"De bus staat klem tussen twee bruggen.": "De bus stait klem tussen twij bruggen.",
"De collectebus. In het kapelletje. Daar mag het in.": "De collectebus. In t kapelletje. Doar mag t in.",
"De Duitse agent bood koffie aan.": "De Duitse agent bood koffie aan.",
"De eerste trekker van mien vader. Trijntje betaalde hem. Ze heeft er nooit om gevraagd.": "De aarste trekker van mien voader. Trijntje betaalde hom. Ze het der nooit om gevraagd.",
"De ganzen komen. Dat is geen herfst, dat is… vogels.": "De ganzen komen. Dat is gain herfst, dat is… vogels.",
"De Gouden Eierbal staat in het museum. Het bordje heeft drie namen. De derde is van een mevrouw van tweeënnegentig, eerste prijs, Ommelander Ronde, 1953. Ze kwam er zeventig jaar te laat. Op tijd.": "De Gouden Eierbal stait in t museum. T bordje het drij namen. De trede is van n mevrouw van tweeënnegentig, aarste prijs, Ommelander Ronde, 1953. Ze kwam der zeventig joar te loat. Op tied.",
"De hemel is hier groter dan de dorpen. Dat zegt niks over de dorpen. Dat zegt iets over de hemel.": "De hemel is hier grötter dan de dorpen. Dat zegt niks over de dorpen. Dat zegt wat over de hemel.",
"De jurk is nat.": "De jurk is nat.",
"De jurk is van 1983. Hij heeft ergere dingen gezien.": "De jurk is van 1983. Hai het ergere dingen zain.",
"De jurylijst. De plattegrond van de vesting. En een vel van 1953.": "De jurylijst. De plattegrond van de vesting. En n vel van 1953.",
"De koffie is overal goedkoper dan hier.": "De koffie is overal goedkoper dan hier.",
"De laatste zomeravond. De zon gaat onder boven de Vismarkt. Ik heb de tweede friet. Hij heeft betaald, zegt hij. Hij heeft betaald. Dat is nieuw.": "De lèste zomeravond. De zun goat onder boven de Vismarkt. Ik heb de tweede friet. Hai het betaald, zegt hai. Hai het betaald. Dat is nij.",
"De molen van Winschoten. Hij draait mee met de wind. De wind draait niet mee met hem.": "De molen van Winschoten. Hai draait mee mit de wind. De wind draait nait mee mit hom.",
"De notaris uit Veendam is er ook. Zij tekent alles wat Ubbo zegt. Zonder te lezen. Hij noemt dat vertrouwen.": "De notaris oet Veendam is der ook. Zai tekent aals wat Ubbo zegt. Zonder te lezen. Hai noemt dat vertrouwen.",
"De peiling \"Groeien of thuis\": uitslag. Groeien, 50. Thuis, 50. Eén luisteraar in Paddepoel heeft niet gestemd. Ik zeg niks.": "De peiling \"Groeien of thoes\": uitslag. Groeien, 50. Thoes, 50. Eén luisteraar in Paddepoel het nait gestemd. Ik zeg niks.",
"De pers! Het boek!": "De pers! T boek!",
"De plek is vrij. Er staat een frietwagen te wachten. Die rijdt nu.": "De plek is vrij. Der stait n frietwagen te wachten. Dij riedt nou.",
"De snackbars zijn de winkel. De fabriek is de bank.": "De snackbars binnen de winkel. De fabriek is de bank.",
"De thermoskan is dienstmateriaal.": "De thermoskan is dienstmateriaal.",
"De torenwachter belde: \"De rij is lang. Ik meld alleen.\" En: \"Het is zomer.\" Hij zei het twee keer.": "De torenwachter belde: \"De rie is lang. Ik meld aleen.\" En: \"T is zomer.\" Hai zee t twij keer.",
"De torenwachter belde: \"Ik zie een vesting. Er staat een leger voor. Het is Gronings.\" Hij meldt alleen.": "De torenwachter belde: \"Ik zai n vesting. Der stait n leger veur. T is Gronings.\" Hai meldt aleen.",
"De trein is sneller dan mijn trekker. Mijn trekker heeft meer karakter.": "De trein is sneller dan mien trekker. Mien trekker het meer karakter.",
"De Veenkoloniën. Rechte wegen, rechte kanalen en geen enkel excuus om te laat te zijn.": "De Veenkoloniën. Rechte wegen, rechte kanalen en gain enkel excuus om te loat te zien.",
"De vesting is afgesloten. Laatste fase.": "De vesting is afgesloten. Lèste fase.",
"De Vismarkt.": "De Vismarkt.",
"De voorronde Oldambt gaat naar de Fjord Frituur! En de botsauto's zijn gratis!": "De voorronde Oldambt goat noar de Fjord Frituur! En de botsauto's zien gratis!",
"De voorronde Veenkoloniën gaat naar de Fjord Frituur. Ik meld alleen. En ik zet de brug nu dicht.": "De voorronde Veenkoloniën goat noar de Fjord Frituur. Ik meld aleen. En ik zet de brug nou dicht.",
"De Westerwoldse eierbal. Met heidehoning.": "De Westerwoldse eierbal. Mit heidehoning.",
"De zetmeelfabriek! Van meneer Oldenhuis! Alles gaat naar de fabriek!": "De zetmeelfabriek! Van meneer Oldenhuis! Aals goat noar de fabriek!",
"De zweefmolen! Eén rondje! Je hoeft niet mee, Tammo.": "De zweefmolen! Eén rondje! Je hoeft nait mee, Tammo.",
"Denk erover na. Twee dagen. Dan is het aanbod nog van jou.": "Denk derover noa. Twij dagen. Dan is t aanbod nog van die.",
"Derde schip. Vijftien seconden. Dit is het laatste. Denk aan de brug.": "Trede schip. Vijftien seconden. Dit is t lèste. Denk aan de brug.",
"Derde. Heidehoning in de mosterd. Zeven ingrediënten. Eén bal.": "Trede. Heidehoning in de mosterd. Zeven ingrediënten. Eén bal.",
"Derde. Hij gaat sneller. Hij gaat naar het bord!": "Trede. Hai goat sneller. Hai goat noar t bord!",
"Derde. Toeter. Ik toeter ruim op tijd.": "Trede. Toeter. Ik toeter ruim op tied.",
"Die baas zit er al niet meer.": "Dij baas zit der al nait meer.",
"Die blijft bij mij. Een Ronde is een feest. Een naam is een bedrijf.": "Dij bliedt bie mie. N Ronde is n feest. N noam is n bedrijf.",
"Die is niet te koop.": "Dij is nait te koop.",
"Die is van mijn kleinzoon. Die is van mijn kleinzoon en zijn vriendin. Dat is nog beter.": "Dij is van mien kleinzoon. Dij is van mien kleinzoon en zien vriendin. Dat is nog beter.",
"Die liep af op één september. Dat is geen kwestie van willen. Dat is papier.": "Dij liep af op ain september. Dat is gain kwestie van willen. Dat is papier.",
"Die praat toch?": "Dij proat toch?",
"Die staan in Musselkanaal. Er zit geen water meer in de ketel. En geen thee.": "Dij stoan in Musselkanaal. Der zit gain woater meer in de ketel. En gain thee.",
"Die staat daar.": "Dij stait doar.",
"Die tas is van 1953.": "Dij tas is van 1953.",
"Die we nog niet hebben.": "Dij wie nog nait hebben.",
"Die zit in Westerwolde.": "Dij zit in Westerwolde.",
"Dit is 1953. Dit is mijn eierbal. Die van toen.": "Dit is 1953. Dit is mien eierbal. Dij van toen.",
"Dit is de beste baan ter wereld.": "Dit is de beste baan ter wereld.",
"Dit is de modelzaak. Eenenveertig zaken werken precies zo. Zelfde pan, zelfde saus, zelfde glimlach.": "Dit is de modelzaak. Eenenveertig zaken warken precies zo. Zelfde pan, zelfde saus, zelfde glimlach.",
"Dit is een Groningse brug.": "Dit is n Groningse brug.",
"Dit is een parkeerterrein. Het is geen circuit. Ga naar huis.": "Dit is n parkeerterrein. T is gain circuit. Goa noar hoes.",
"Dit is een tuin met een bordje. Het bordje zegt: stil. Ik doe wat het bordje zegt.": "Dit is n tuin mit n bordje. T bordje zegt: stil. Ik doe wat t bordje zegt.",
"Dit is het jaar van een misdaad.": "Dit is t joar van n misdaad.",
"Dit is het mooiste dat ik ooit heb gezien.": "Dit is t mooiste dat ik ooit heb zain.",
"Dit is het. De hut. Er is hout voor de kachel. Maar het is zomer.": "Dit is t. De hut. Der is hout veur de kachel. Mor t is zomer.",
"Dit is nummer vijf.": "Dit is nummer vief.",
"Dit is verkeerd.": "Dit is verkeerd.",
"Dolf van de botsauto's zit in de jury van de kermis. Hij vindt alles goed als hij mag meerijden.": "Dolf van de botsauto's zit in de jury van de kermis. Hai vindt aals goud as hai mag meerijden.",
"Drie enveloppen geruild.": "Drij enveloppen geruild.",
"Drie filialen draaien. Zonder ons.": "Drij filialen draaien. Zonder ons.",
"Drie keer eerlijk.": "Drij keer eerlk.",
"Drie manieren. Stil. Slim. Hard.": "Drij manieren. Stil. Slim. Hard.",
"Drie namen. Dolf, de notaris, de boswachter.": "Drij namen. Dolf, de notaris, de boswachter.",
"Drie trucks. Elk met een vat. Dat is een dorp aan friet.": "Drij trucks. Elk mit n vat. Dat is n dorp aan friet.",
"Druk. Kijk naar de naald. Hij leest geen krant. Hij zegt de waarheid.": "Drok. Kiek noar de naald. Hai leest gain krant. Hai zegt de woarheid.",
"Duiken! Tak!": "Duiken! Tak!",
"Duiven. Links. Op de hoeden. Nu.": "Duven. Links. Op de hoeden. Nou.",
"Durk! Rechts! Hij komt op de kraam af!": "Durk! Rechts! Hai komt op de kraam af!",
"Durk. Douwe. Ik ben het.": "Durk. Douwe. Ik ben t.",
"Duw ze weg. Maar rustig. Er staan mensen op de kade.": "Duw ze weg. Mor rustig. Der stoan mensen op de kaai.",
"Duwen! Wielen vrij!": "Duwen! Wielen vrij!",
"Dwars! Op een kartonrotonde!": "Dwars! Op n kartonrotonde!",
"Een andere Grietje. Deze zegt niks. Gelukkig.": "N andere Grietje. Disse zegt niks. Gelukkig.",
"Een bakfiets heeft meer richting.": "N bakfiets het meer richting.",
"Eén bal. Voor Oma.": "Eén bal. Veur Oma.",
"Een botsauto stuurt als een bakfiets.": "N botsauto stuurt as n bakfiets.",
"Een combine. Negen meter breed. Hij komt niet naar ons. Wij gaan naar hem.": "N combine. Negen meter breed. Hai komt nait noar ons. Wie goan noar hom.",
"Een dak. Dat is het enige goede wat Ubbo ooit betaald heeft.": "N dak. Dat is t enige goie wat Ubbo ooit betaald het.",
"Een drone.": "N drone.",
"Een eierbal. Gemaakt tijdens een botsautoronde. Dat is geen kunst. Dat is een sport.": "N eierbal. Moakt tijdens n botsautoronde. Dat is gain kunst. Dat is n sport.",
"Een finale. In mijn vesting. Met iedereen erbij. Dat is de enige manier waarop een Ronde afloopt.": "N finale. In mien vesting. Mit iedereen derbie. Dat is de enige manier woarop n Ronde afloopt.",
"Een gracht is ook water. Ik vaar ze allemaal. Behalve de zee. Die is te groot voor mijn geduld.": "N gracht is ook woater. Ik vaar ze allemoal. Behalve de zee. Dij is te groot veur mien geduld.",
"Een grens is een lijn. Je moest alleen eerder zijn.": "N grens is n lijn. Je moest aleen aarder zien.",
"Een jury van paling. Dat verklaart veel.": "N jury van paling. Dat verklaart veul.",
"Eén kar. Op de Vismarkt. En één keer per zomer rijdt hij een ronde. Door alle zeven. Dat is ook thuis. Dan heb ik het verplaatst.": "Eén kar. Op de Vismarkt. En ain keer per zomer riedt hai n ronde. Deur aal zeven. Dat is ook thoes. Dan heb ik t verplaatst.",
"Een kilo paling per jurylid. Dat is geen jury. Dat is een visafslag.": "N kilo paling per jurylid. Dat is gain jury. Dat is n visafslag.",
"Een kilo paling per jurylid. Hij betaalde in vis.": "N kilo paling per jurylid. Hai betaalde in vis.",
"Een kraam gaat niet mee omhoog. Hij blijft op de aarde.": "N kraam goat nait mee omhoog. Hai bliedt op de aarde.",
"Een netwerk, Tammo.": "N netwerk, Tammo.",
"Een pakket voor Sellingen? Dat is voor mij. Ik heb het niet besteld. Ik neem het wel.": "N pakket veur Sellingen? Dat is veur mie. Ik heb t nait besteld. Ik nuim t wel.",
"Een ree. Eén. Ik meld alleen.": "N ree. Eén. Ik meld aleen.",
"Eén ronde per zomer. Dat is een soort thuis.": "Eén ronde per zomer. Dat is n soort thoes.",
"Een stoet. Twaalf trekkers. Dat doen jullie hier toch?": "N stoet. Twaalf trekkers. Dat doun jim hier toch?",
"Een tel. Het duurt een tel. Dat is het.": "N tel. T duurt n tel. Dat is t.",
"Eén truck. Eén verloren truck.": "Eén truck. Eén verloren truck.",
"Een uil. Hij kijkt me aan.": "N uil. Hai kiekt mie aan.",
"Een vrachtwagen.": "N vrachtwagen.",
"Een wolvenpoot.": "N wolvenpoot.",
"Eén.": "Eén.",
"Eén. Een echte. Die muu zegt.": "Eén. N echte. Dij muu zegt.",
"Eén. Rechts. Pomp.": "Eén. Rechts. Pomp.",
"Eenenveertig karren. Elk met jouw naam. Elk met jouw recept. En de Vismarkt, per direct terug.": "Eenenveertig karren. Elk mit dien noam. Elk mit dien recept. En de Vismarkt, per direct terug.",
"Eenenveertig karren. Mijn naam erop. De Vismarkt terug.": "Eenenveertig karren. Mien noam derop. De Vismarkt terug.",
"Eerst de eierballen. Ze mogen niet afkoelen. Zacht remmen.": "Aarst de eierballen. Ze mogen nait afkoelen. Zacht remmen.",
"Eerste college in Stad om negen. Ik woon in Scheemda. Ik heb spijt van het college.": "Aarste college in Stad om negen. Ik woon in Scheemda. Ik heb spijt van t college.",
"Eerste lading in het vet. Zestig tellen.": "Aarste lading in t vet. Zestig tellen.",
"Eerste lading in het vet. Zeventig tellen.": "Aarste lading in t vet. Zeventig tellen.",
"Eerste ronde. Kerkland-paneermeel. Zeezout. Hou de olie op temperatuur.": "Aarste ronde. Kerkland-paneermeel. Zeezout. Hol de olie op temperatuur.",
"Eerste truck. Rechts. Het wiel.": "Aarste truck. Rechts. T wiel.",
"Eindelijk. Eerste fase.": "Aindelk. Aarste fase.",
"Elke dag.": "Elke dag.",
"En dames en heren, bij het succes van de dag: Oldenhuis Bakt neemt \"Us Mem Snacks\" over. Eenenveertig snackbars, nu tweeënveertig. De bakkerij van een Friese mevrouw. Gekocht, gesloopt, vervangen.": "En dames en heren, bie t succes van de dag: Oldenhuis Bakt neemt \"Us Mem Snacks\" over. Eenenveertig snackbars, nou tweeënveertig. De bakkerij van n Friese mevrouw. Gekocht, gesloopt, vervangen.",
"En dan ben ik klaar. En dan ga ik thuis zitten. En dan meld ik alleen.": "En dan ben ik kloar. En dan goa ik thoes zitten. En dan meld ik aleen.",
"En dan?": "En dan?",
"En de eierbal van Oma?": "En de eierbal van Oma?",
"En de eierbal?": "En de eierbal?",
"En de foto's?": "En de foto's?",
"En de graanschuur. Er staat een luik klaar. Mout, tarwe, gerst. De Oldambtster eierbal: met gerstemout.": "En de graanschuur. Der stait n luik kloar. Mout, tarwe, gerst. De Oldambtster eierbal: mit gerstemout.",
"En de Ronde?": "En de Ronde?",
"En de snackbars?": "En de snackbars?",
"En de thermoszak. Warm. Dat ruiken ze straks.": "En de thermoszak. Waarm. Dat ruiken ze straks.",
"En deze enveloppen? \"Wijk A, Wijk B, Wijk C…\"": "En disse enveloppen? \"Wiek A, Wijk B, Wijk C…\"",
"En een boswachter uit Westerwolde. Hij praat niet. Hij kijkt alleen. Maar hij eet het buffet leeg.": "En n boswachter oet Westerwolde. Hai proat nait. Hai kiekt aleen. Mor hai et t buffet leeg.",
"En een gesprek. Met jou, meisje. Alleen met jou.": "En n gesprek. Mit die, wicht. Aleen mit die.",
"En een kilo paling per jurylid.": "En n kilo paling per jurylid.",
"En het schip?": "En t schip?",
"En ik heb de tweede friet. Hij heeft betaald. Ze zijn samen. Ze zeggen het niet. Maar dat doen ze. Moi.": "En ik heb de tweede friet. Hai het betaald. Ze binnen samen. Ze zeggen t nait. Mor dat doun ze. Moi.",
"En ik zie dat je vriend ons al gevonden heeft. Mooi. Dan kan hij het ook lezen. Hij leest langzaam. Ik wacht.": "En ik zai dat je vriend ons al gevonden het. Mooi. Dan kin hai t ook lezen. Hai leest langzaam. Ik wacht.",
"En jij wil niet alles groter. Jij wilt alles kunnen.": "En doe wil nait aals grötter. Doe wilst aals kinnen.",
"En jij?": "En doe?",
"En wat dacht je?": "En wat dacht je?",
"En?": "En?",
"Envelop. Nu. Geen geluid.": "Envelop. Nou. Gain geluid.",
"Er is een wolf in Groningen. Dat stond in de krant. Ik wil hem zien.": "Der is n wolf in Groningen. Dat stun in de krant. Ik wil hom zain.",
"Er is hier geen goede kant. Er is een kant. En die is rechts.": "Der is hier gain goie kant. Der is n kant. En dij is rechts.",
"Er is vandaag geen gewonde. Het is toneel. Ik sta er toch. Dit stond niet in het rooster, maar het staat er nu.": "Der is vandoage gain gewonde. T is toneel. Ik sta der toch. Dit stun nait in t rooster, mor t stait der nou.",
"Er rijdt een cabine de grens over. Hij heeft een gele helm.": "Der riedt n cabine de grens over. Hai het n gele helm.",
"Er staat een hond bij.": "Der stait n hond bie.",
"Er zijn er twaalf. De twaalfde zit ver achter.": "Der binnen der twaalf. De twaalfde zit ver achter.",
"Er zijn nu drie stoelen. Dat is een feest.": "Der binnen nou drij stoelen. Dat is n feest.",
"Er zit een duif op mijn hoed.": "Der zit n duuf op mien hoed.",
"Er zit… veel geld in.": "Der zit… veul geld in.",
"Eronder. Niet erover. Eronder.": "Deronder. Nait derover. Deronder.",
"Filiaal zeven.": "Filiaal zeven.",
"Fjord & Familie.": "Fjord & Familie.",
"Fjord! Fjord! Fjord!": "Fjord! Fjord! Fjord!",
"Fluit. Eén keer lang. Dat is voor de koeien. Die kijken altijd.": "Fluit. Eén keer lang. Dat is veur de kij. Dij kieken aaltied.",
"Foto. Foto. En foto. Het alarm gaat af.": "Foto. Foto. En foto. T alarm goat af.",
"Ga zitten, meisje. Ik bijt niet. Ik reken alleen.": "Goa zitten, wicht. Ik bijt nait. Ik reken aleen.",
"Ga zitten. Het is een mooie nacht.": "Goa zitten. T is n mooie nacht.",
"Gaat u het weer verliezen, Berend?": "Goat u t weer verliezen, Berend?",
"Gas. Meer. Meer. Nu trekken.": "Gas. Meer. Meer. Nou trekken.",
"Geen beller vanavond. Ik heb een berichtje. Er staat: \"Ik fiets.\" Het is van een Stadjer. Hij zegt niet waarheen. Ik zeg niks.": "Gain beller vanoavend. Ik heb n berichtje. Der stait: \"Ik fiets.\" T is van n Stadjer. Hai zegt nait woarheen. Ik zeg niks.",
"Geen papieren. Het is een frietwagen.": "Gain papieren. T is n frietwagen.",
"Gespreksronde. Drie namen. Glimlachen.": "Gespreksronde. Drij namen. Glimlachen.",
"Gewoon. Eén keer. Zonder jury.": "Gewoon. Eén keer. Zonder jury.",
"Goedenavond. Ik kom voor de vetmeting.": "Goedenavond. Ik kom veur de vetmeting.",
"Goud.": "Goud.",
"Gras links. Daar. Niet het grind.": "Gras links. Doar. Nait t grind.",
"Grind begint nooit. Grind is gewoon grind.": "Grind begint nooit. Grind is gewoon grind.",
"Grind is luid. Gras is stil. Kruiden niezen.": "Grind is luid. Gras is stil. Kruiden niezen.",
"Groeien of thuis.": "Groeien of thoes.",
"Grunn. Het is half vier. Het beleg van Bourtange is gewonnen door de belegeraars. Voor het eerst in de geschiedenis. Berend Bos heeft gewonnen. Hij zegt dat het verkeerd voelt. Dat is hoe het hoort.": "Grunn. T is half vier. T beleg van Bourtange is wonnen deur de belegeraars. Veur t aarst in de geschiedenis. Berend Bos het wonnen. Hai zegt dat t verkeerd voelt. Dat is hoe t heurt.",
"Hard is voor een kiepwagen.": "Hard is veur n kiepwagen.",
"Hard is voor niemand.": "Hard is veur niemand.",
"Harm. Dit is écht de laatste fase.": "Harm. Dit is écht de lèste fase.",
"Hebben jullie een koe gezien? Zwart-wit. Ze heet Grietje.": "Hebben jim n kou zain? Zwart-wit. Ze heet Grietje.",
"Heeft een frietwagen papieren?": "Het n frietwagen papieren?",
"Heiligerlee. In 1568 was hier een slag. Er staat een monument. Het houdt het vast voor ons.": "Heiligerlee. In 1568 was hier n slag. Der stait n monument. T houdt t vast veur ons.",
"Hendrik gaf zichzelf een tien.": "Hendrik gaf zichzelf n tien.",
"Henk!": "Henk!",
"Het graan is binnen. Nu de mensen nog. Bier staat klaar.": "T groan is binnen. Nou de mensen nog. Bier stait kloar.",
"Het huisje is van mien vader. Het bed is van mien moeder. Ze zei: dat is voor Trijntjes kinderen.": "T huisje is van mien voader. T bed is van mien moeke. Ze zee: dat is veur Trijntjes kinderen.",
"Het is af, hè?": "T is af, hè?",
"Het is altijd lavendel.": "T is aaltied lavendel.",
"Het is de eerlijkste rekensom van het jaar.": "T is de eerlijkste rekensom van t joar.",
"Het is de langste tel van de provincie.": "T is de langste tel van de provincie.",
"Het is dezelfde familie.": "T is dezelfde familie.",
"Het is dezelfde kar.": "T is dezelfde kar.",
"Het is een gewone dag. Ik heb alleen mijn goeie laarzen aan.": "T is n gewone dag. Ik heb aleen mien goeie laarzen aan.",
"Het is een heel goed contract. Het is gebouwd op één regel: \"1953: jury. H. O. Aan zichzelf.\"": "T is n hail goud contract. T is gebouwd op ain regel: \"1953: jury. H. O. Aan zichzelf.\"",
"Het is een mantel. Hij is van de bisschop. Ik leen hem. Hij heeft hem niet nodig.": "T is n mantel. Hai is van de bisschop. Ik leen hom. Hai het hom nait nodig.",
"Het is een pallet.": "T is n pallet.",
"Het is een poot.": "T is n poot.",
"Het is een vel papier. \"Eigen kar: 10. Trijntje: 6.\" Met een kilo paling per jurylid.": "T is n vel papier. \"Aigen kar: 10. Trijntje: 6.\" Mit n kilo paling per jurylid.",
"Het is erg vlak.": "T is erg vlak.",
"Het is geen auto. Het is een paard met vleugels. Hij wil gewoon vooruit.": "T is gain auto. T is n peerd mit vleugels. Hai wil gewoon vooruit.",
"Het is geen race. Het is een rondje met een prijs. Wie wint, krijgt een boterham.": "T is gain race. T is n rondje mit n prijs. Wel wint, krijgt n boterham.",
"Het is half twee. De zon schijnt. Er is geen schot, geen bloed, geen kogel van ijzer. Alleen karton, meel en water. Zo is het in Grunn.": "T is half twij. De zun schijnt. Der is gain schot, gain bloed, gain kogel van ijzer. Aleen karton, meel en woater. Zo is t in Grunn.",
"Het is het enige dat ik heb.": "T is t enige dat ik heb.",
"Het is het enige dat ik heb. Ik meld alleen, verder.": "T is t enige dat ik heb. Ik meld aleen, verder.",
"Het is het meer. Ik ben nergens bang voor, behalve voor Roelfien.": "T is t meer. Ik ben nergens bang veur, behalve veur Roelfien.",
"Het is hetzelfde. Maar vriendelijker.": "T is hetzelfde. Mor vriendelijker.",
"Het is hetzelfde. Zeven is ook meer dan één.": "T is hetzelfde. Zeven is ook meer dan ain.",
"Het is hoe MIJN bruggen werken.": "T is hoe MIJN bruggen warken.",
"Het is Jelles moeder.": "T is Jelles moeke.",
"Het is mijn fiets. Ik heb alles wat ik nodig heb.": "T is mien fiets. Ik heb aals wat ik nodig heb.",
"Het is mijn naam.": "T is mien noam.",
"Het is niet slecht.": "T is nait slecht.",
"Het is open, Berend.": "T is open, Berend.",
"Het is papier. Hij dacht dat het sneeuwde.": "T is papier. Hai dacht dat t sneeuwde.",
"Het is september.": "T is september.",
"Het is te stil. Ik heb gisteren een uur naar een koe gekeken. Hij keek terug.": "T is te stil. Ik heb gisteren n uur noar n kou gekeken. Hai keek terug.",
"Het is te vroeg gelukt. Maar het is precies op tijd gebeurd.": "T is te vroeg gelukt. Mor t is precies op tied gebeurd.",
"Het is zijn vet.": "T is zien vet.",
"Het is… knapperig.": "T is… knapperig.",
"Het jurylijstje. En een medaille. Eerste prijs, 1953. Van zijn opa.": "T jurylijstje. En n medaille. Aarste prijs, 1953. Van zien opa.",
"Het jurylijstje. Foto. En de medaille: foto.": "T jurylijstje. Foto. En de medaille: foto.",
"Het kaartje van Oma. \"Proef eerlijk. T.\" Erin.": "T kaartje van Oma. \"Proef eerlk. T.\" Derin.",
"Het luik komt in mijn raam. Dan serveer ik vanuit de brug. Dat is nieuw. Het is nog nooit gedaan.": "T luik komt in mien raam. Dan serveer ik vanuit de brug. Dat is nij. T is nog nooit doan.",
"Het mosterdsaus-ding is bijzonder. Er zit mout in.": "T mosterdsaus-ding is bijzonder. Der zit mout in.",
"Het Oldambt. Ik heb gelezen dat het hier de beste klei van Nederland is.": "T Oldambt. Ik heb gelezen dat t hier de beste klei van Nederland is.",
"Het Oldambtmeer. Tien jaar oud, en het meer weet het niet. Het denkt dat het er altijd lag.": "T Oldambtmeer. Tien joar old, en t meer wait t nait. T denkt dat t der aaltied lag.",
"Het Pagediep. Ik zie het water. Het water ziet mij.": "T Pagediep. Ik zai t woater. T woater ziet mie.",
"Het schip wacht. Een tel. Dat is zijn vak.": "T schip wacht. N tel. Dat is zien vak.",
"Het sneeuwde. In september.": "T sneeuwde. In september.",
"Het sneeuwt. In september.": "T sneeuwt. In september.",
"Het stellingwerk! Boven! De hendel!": "T stellingwerk! Boven! De hendel!",
"Het touw is van mij.": "T touw is van mie.",
"Het valt. Het valt allemaal om hen heen.": "T valt. T valt allemoal om hen heen.",
"Het veen is net het wad. Je moet de route kennen. Zet je voeten waar ik ze zet. En niet erbij.": "T veen is net t wad. Je mout de route kennen. Zet je voeten woar ik ze zet. En nait derbie.",
"Het vet gaat altijd naar Winschoten. Dat is wat een vet doet.": "T vet goat aaltied noar Winschoten. Dat is wat n vet dut.",
"Het vliegveldje bij Oostwold. Gras, een windzak en een mevrouw die zegt dat ze er geen heeft.": "T vliegveldje bie Oostwold. Gras, n windzak en n mevrouw dij zegt dat ze der gain het.",
"Het voelde als sneeuw.": "T voelde as sneeuw.",
"Het was een nuttige dag.": "T was n nuttige dag.",
"Het was lavendel.": "T was lavendel.",
"Het was papier, Tammo.": "T was papier, Tammo.",
"Het was wel een goed glas.": "T was wel n goud glas.",
"Het wordt elke keer beter.": "T wordt elke keer beter.",
"Het wordt elke keer langer.": "T wordt elke keer langer.",
"Het zetmeel zit in de korst. Dat is goed. Dat komt uit de fabriek. Alleen weet de fabriek het niet.": "T zetmeel zit in de korst. Dat is goud. Dat komt oet de fabriek. Aleen wait de fabriek t nait.",
"Hetzelfde stuk. Voor de vijfde keer.": "Hetzelfde stuk. Veur de vijfde keer.",
"Hier houdt het op. Voor mij.": "Hier houdt t op. Veur mie.",
"Hier is het nooit koud.": "Hier is t nooit kold.",
"Hier, naar de cabine. Handen hier. Niet daar. Daar is het heet.": "Hier, noar de cabine. Handen hier. Nait doar. Doar is t heet.",
"Hier.": "Hier.",
"Hier. Daar. Niet dáár. Ik zei: niet dáár.": "Hier. Doar. Nait dáár. Ik zee: nait dáár.",
"Hier. De sleutel van het huisje. Voor als jullie willen blijven. Het bed kraakt. De brug ook.": "Hier. De sleutel van t huisje. Veur as jim willen blieven. T bed kraakt. De brug ook.",
"Hier. Een zak aardappels. Meer heb ik niet. Ze zijn wel goed.": "Hier. N zak aardappels. Meer heb ik nait. Ze binnen wel goud.",
"Hier. Hij is niet van mij. Hij was nooit van ons.": "Hier. Hai is nait van mie. Hai was nooit van ons.",
"Hier. Mien hond Bram. Hij heeft een pak aan. Hij vindt het leuk.": "Hier. Mien hond Bram. Hai het n pak aan. Hai vindt t leuk.",
"Hij geeft ons de Vismarkt terug!": "Hai geeft ons de Vismarkt terug!",
"Hij ging echt.": "Hai gong echt.",
"Hij haalde het bord.": "Hai haalde t bord.",
"Hij had alleen gelijk.": "Hai har aleen gelieke.",
"Hij had een gele helm. Hij was serieus.": "Hai har n gele helm. Hai was serieus.",
"Hij had een gele jas. Die glijden. Maar ze houden vast.": "Hai har n gele jas. Dij glijden. Mor ze hollen vast.",
"Hij heeft de ogen van een wolf.": "Hai het de ogen van n wolf.",
"Hij heeft een terreinwagen. Goud. Twee quads erachter. Ik zie het stofspoor. Naar het oosten.": "Hai het n terreinwagen. Goud. Twij quads derachter. Ik zai t stofspoor. Noar t oosten.",
"Hij heeft hem afgepakt.": "Hai het hom afgepakt.",
"Hij heeft mij gekozen omdat ik niks zeg. Dat is een misverstand. Dat is het mooiste misverstand.": "Hai het mie gekozen omdat ik niks zeg. Dat is n misverstand. Dat is t mooiste misverstand.",
"Hij heeft ook de burgemeester achterop.": "Hai het ook de burgemeester achterop.",
"Hij heeft veertig jaar verloren. Hij weet.": "Hai het veertig joar verloren. Hai wait.",
"Hij herhaalt het in zijn slaap. Dat is erg.": "Hai herhaalt t in zien sloap. Dat is erg.",
"Hij is achttien meter lang en het kanaal ligt links.": "Hai is achttien meter lang en t kanaal ligt links.",
"Hij is bij de heli. Hij zit er al in. Tammo!": "Hai is bie de heli. Hai zit der al in. Tammo!",
"Hij is een hond.": "Hai is n hond.",
"Hij is een paard. Hij had ruimte nodig.": "Hai is n peerd. Hai har ruimte nodig.",
"Hij is glad. Dat heet een zetmeel.": "Hai is glad. Dat heet n zetmeel.",
"Hij is naar huis, Wubbo. We hadden ruzie.": "Hai is noar hoes, Wubbo. Wie hadden ruzie.",
"Hij is niet weg. Hij is nog niet terug.": "Hai is nait weg. Hai is nog nait terug.",
"Hij is open. Voor we toeterden.": "Hai is open. Veur wie toeterden.",
"Hij is van iedereen. Het is een gracht.": "Hai is van iedereen. T is n gracht.",
"Hij is zo mooi.": "Hai is zo mooi.",
"Hij kijkt achterom. Hij heeft angst. Hij heeft een gele helm.": "Hai kiekt achterom. Hai het angst. Hai het n gele helm.",
"Hij kocht de bakkerij van Jelles moeder. En kondigde het af over de luidspreker.": "Hai kocht de bakkerij van Jelles moeke. En kondigde t af over de luidspreker.",
"Hij kon winnen. Dat is iets anders.": "Hai kon winnen. Dat is wat aans.",
"Hij kraakt. Dat is goed. Dat is Veendam.": "Hai kraakt. Dat is goud. Dat is Veendam.",
"Hij kwispelt.": "Hai kwispelt.",
"Hij ligt er elke keer in. Dat is een traditie.": "Hai ligt der elke keer in. Dat is n traditie.",
"Hij loopt niet. Hij liep nooit. Maar vandaag ook niet.": "Hai loopt nait. Hai liep nooit. Mor vandoage ook nait.",
"Hij loopt weg. Dat is goed. Hij heeft gelijk.": "Hai loopt weg. Dat is goud. Hai het gelieke.",
"Hij merkt het pas bij het ontbijt.": "Hai merkt t pas bie t ontbijt.",
"Hij noemde mij betrouwbaar. Ik ben dat niet. Maar hij schreef het op papier. En papier is wat hij zelf gebruikt.": "Hai noemde mie betrouwbaar. Ik ben dat nait. Mor hai schreef t op papier. En papier is wat hai zulf gebruikt.",
"Hij rent. Je was te dichtbij.": "Hai rent. Je was te dichtbij.",
"Hij rijdt de grens over. Met een open cabine.": "Hai riedt de grens over. Mit n open cabine.",
"Hij staat. Op de kade. Met eierballen erin.": "Hai stait. Op de kaai. Mit eierballen derin.",
"Hij stond ernaast, Berend.": "Hai stun dernoast, Berend.",
"Hij verliest, omdat hij van één kant komt. Bourtange heeft vijf bolwerken. Je valt niet van één kant aan. Je valt aan van overal. Tegelijk. En je weet precies wanneer elk bolwerk te laat reageert.": "Hai verliest, omdat hai van ain kant komt. Bourtange het vief bolwerken. Je valt nait van ain kant aan. Je valt aan van overal. Tegelieke. En je wait precies wanneer elk bolwerk te loat reageert.",
"Hij weegt meer dan de Fjord.": "Hai weegt meer dan de Fjord.",
"Hij weet precies waar het pijn doet.": "Hai wait precies woar t pien dut.",
"Hij werd eerlijk geraakt. Dat is nog wat.": "Hai werd eerlk geraakt. Dat is nog wat.",
"Hij wil jouw naam voor zijn vet.": "Hai wil dien noam veur zien vet.",
"Hij zal een andere vinden. Hij heeft eenenveertig snackbars.": "Hai zal n andere vinden. Hai het eenenveertig snackbars.",
"Hij zat erin. Dat is een pomp.": "Hai zat derin. Dat is n pomp.",
"Hij zat op de brug, Tammo.": "Hai zat op de brug, Tammo.",
"Hij zegt van niet. Hij zegt het erg zacht.": "Hai zegt van nait. Hai zegt t erg zacht.",
"Hij zei \"liever niet\"!": "Hai zee \"liever nait\"!",
"Hij zei clean.": "Hai zee clean.",
"Hij zei het alsof hij het voor het eerst hoorde.": "Hai zee t alsof hai t veur t aarst hoorde.",
"Hij zei het zachtjes.": "Hai zee t zachtjes.",
"Hoe dan?": "Hoe dan?",
"Hoe heet dat?": "Hoe heet dat?",
"Hoe heet het paard?": "Hoe heet t peerd?",
"Hoe lang is zes uur?": "Hoe lang is zes uur?",
"Hoe voelt dat, Jelle?": "Hoe voelt dat, Jelle?",
"Hoe weet u dat?": "Hoe wait u dat?",
"Hoeveel koeien wilt u?": "Hoeveel kij wilst u?",
"Hoogezand-Sappemeer. Balken tegen gevels, steigers langs de straat. Daar wonen mensen die wachten. Ik zeg niks. Ik zeg: ze zijn er.": "Hoogezand-Sappemeer. Balken tegen gevels, steigers langs de stroat. Doar wonen mensen dij wachten. Ik zeg niks. Ik zeg: ze binnen der.",
"Hoogezand-Sappemeer. Zuidbroek. Scheemda. Het klinkt als een opsomming van een oom.": "Hoogezand-Sappemeer. Zuidbroek. Scheemda. T klinkt as n opsomming van n oom.",
"Hoorden jullie dat, Grunn? Dat was Tessa. Ze heeft een contract in tweeën gescheurd. Zonder pen.": "Hoorden jim dat, Grunn? Dat was Tessa. Ze het n contract in tweeën gescheurd. Zonder pen.",
"Hou vol. Hou vol. Dat is het enige wat ik kan.": "Hol vol. Hol vol. Dat is t enige wat ik kin.",
"Iedereen die hier stopt, is van iemand. Ik meld alleen.": "Iedereen dij hier stopt, is van ain. Ik meld aleen.",
"Iedereen die wit is, denkt dat.": "Iedereen dij wit is, denkt dat.",
"Iedereen kende hem. Hij was de enige jongen die zijn eigen verjaardagstaart verkocht.": "Iedereen kende hom. Hai was de enige jong dij binnen aigen verjaardagstaart verkocht.",
"Iedereens oom. Er is altijd een oom in Scheemda.": "Iedereens oom. Der is aaltied n oom in Scheemda.",
"Ik bak door! Hou hem recht!": "Ik bak deur! Hol hom recht!",
"Ik bak. Daar ben ik goed in. De rest is aan jou.": "Ik bak. Doar ben ik goud in. De rest is aan die.",
"Ik bak. Ik sta op een brug. Dat voelt als thuis, op een raar soort manier.": "Ik bak. Ik sta op n brug. Dat voelt as thoes, op n roar soort manier.",
"Ik ben al weg.": "Ik ben al weg.",
"Ik ben alleen een tijdje.": "Ik ben aleen n tijdje.",
"Ik ben bang dat je meer wilt vasthouden dan ik kan loslaten.": "Ik ben bang dat je meer wilst vasthouden dan ik kin loslaten.",
"Ik ben bang dat jij meer wilt dan je kunt dragen.": "Ik ben bang dat doe meer wilst dan je kinst dragen.",
"Ik ben bezig.": "Ik ben bezig.",
"Ik ben bij. Alleen het zeil niet.": "Ik ben bie. Aleen t zeil nait.",
"Ik ben een Stadjer in een botsauto. Dit is mijn hoogtepunt.": "Ik ben n Stadjer in n botsauto. Dit is mien hoogtepunt.",
"Ik ben familie van iedereen die hoog zit. Ik meld alleen.": "Ik ben familie van iedereen dij hoog zit. Ik meld aleen.",
"Ik ben Gronings. Wij zeggen het één keer. Dan is het waar. Dit is die keer.": "Ik ben Gronings. Wie zeggen t ain keer. Dan is t woar. Dit is dij keer.",
"Ik ben hier met opzet.": "Ik ben hier mit opzet.",
"Ik ben Roelfien. Mien moeke was Trijntjes zus. Twee meisjes op één fiets. Er is een foto van.": "Ik ben Roelfien. Mien moeke was Trijntjes zus. Twij meisjes op ain fiets. Der is n foto van.",
"Ik ben wit.": "Ik ben wit.",
"Ik ben wit. Ik ben alweer wit.": "Ik ben wit. Ik ben alweer wit.",
"Ik betaal per brein, Rikus. Dat zei ik toch?": "Ik betaal per brein, Rikus. Dat zee ik toch?",
"Ik breng het boek naar de agente. Zij zegt wat bewijs is.": "Ik breng t boek noar de agente. Zai zegt wat bewijs is.",
"Ik dacht aan de Vismarkt.": "Ik dacht aan de Vismarkt.",
"Ik denk erover.": "Ik denk derover.",
"Ik denk het nu ook.": "Ik denk t nou ook.",
"Ik denk. Dat is wat ik doe, Tammo. Ik heb altijd een plan B. Dit is een plan B.": "Ik denk. Dat is wat ik doe, Tammo. Ik heb aaltied n plan B. Dit is n plan B.",
"Ik doe alles tegelijk. Zo kan ik het.": "Ik doe aals tegelieke. Zo kin ik t.",
"Ik doe de lier van de brug. Te vroeg. Voor één keer. Ik oefen het al vanochtend.": "Ik doe de lier van de brug. Te vroeg. Veur ain keer. Ik oefen t al vanochtend.",
"Ik doe de schiettent. Van de grond. Daar is hij het mooist.": "Ik doe de schiettent. Van de grond. Doar is hai t mooist.",
"Ik doe mijn best. Het is een tel te laat. Het is mijn beste.": "Ik doe mien best. T is n tel te loat. T is mien beste.",
"Ik doe niks. Ik zit.": "Ik doe niks. Ik zit.",
"Ik doe open. Jij springt. Het moment spreken we niet af.": "Ik doe open. Doe springt. T moment spreken wie nait af.",
"Ik draag. Dat doen wij.": "Ik draag. Dat doun wie.",
"Ik fiets. Tegen de wind in. Dat bouwt karakter.": "Ik fiets. Tegen de wind in. Dat bouwt karakter.",
"Ik ga erheen. Ik wil zien wat ik teken.": "Ik goa erheen. Ik wil zain wat ik teken.",
"Ik ga kijken. Alleen kijken.": "Ik goa kieken. Aleen kieken.",
"Ik ga naar de kapper in Winschoten. Daar is het leuker. Hij weet alles.": "Ik goa noar de kapper in Winschoten. Doar is t leuker. Hai wait aals.",
"Ik ga naar de salon.": "Ik goa noar de salon.",
"Ik ga naar mijn zus in Veendam. Ze weet het niet. Het is een verrassing. Voor haar. Voor mij ook.": "Ik goa noar mien zus in Veendam. Ze wait t nait. T is n verrassing. Veur heur. Veur mie ook.",
"Ik ga zondag een vraag stellen. In de koffiepauze.": "Ik goa zondag n vroag stellen. In de koffiepauze.",
"Ik ga. Ik heb een jurk. Jij hebt een auto met de motor aan.": "Ik goa. Ik heb n jurk. Doe hest n auto mit de motor aan.",
"Ik ga. Stilte kan ik. Ik oefen het al twaalf jaar.": "Ik goa. Stilte kin ik. Ik oefen t al twaalf joar.",
"Ik geef u twee minuten. Daarna roep ik mijn beveiliging. Dat is geen vriendelijkheid. Dat is tijdsbeheer.": "Ik geef u twij menuten. Doarna roep ik mien beveiliging. Dat is gain vriendelijkheid. Dat is tijdsbeheer.",
"Ik geniet nooit. Ik doe alleen mee.": "Ik geniet nooit. Ik doe aleen mee.",
"Ik gleed uit in het meel.": "Ik gleed oet in t meel.",
"Ik haat wachten.": "Ik haat wachten.",
"Ik had ze half dicht.": "Ik har ze half dicht.",
"Ik hang hem naast de andere. Aan het spiegeltje van die frietwagen. Dan heeft Hendrik een plek. Achterin.": "Ik hang hom naast de andere. Aan t spiegeltje van dij frietwagen. Dan het Hendrik n plek. Achterin.",
"Ik heb alles bij me.": "Ik heb aals bie mie.",
"Ik heb de sleutel van de sluis. Vrij genomen voor het eerst in zestig jaar. Mijn neef houdt de sluis in Delfzijl. Hij meldt alleen.": "Ik heb de sleutel van de sluis. Vrij genomen veur t aarst in zestig joar. Mien neef houdt de sluis in Delfzijl. Hai meldt aleen.",
"Ik heb dertig jaar getekend zonder te lezen. Dit is mijn eerste keer proeven.": "Ik heb dertig joar getekend zonder te lezen. Dit is mien aarste keer proeven.",
"Ik heb eenenveertig snackbars gebouwd, zodat niemand ooit meer zou proeven wat wij niet konden.": "Ik heb eenenveertig snackbars gebouwd, zodat niemand ooit meer zol proeven wat wie nait konden.",
"Ik heb er nog meer. Maar niet vandaag.": "Ik heb der nog meer. Mor nait vandoage.",
"Ik heb gefietst. Veertien kilometer. Tegen de wind.": "Ik heb gefietst. Veertien kilometer. Tegen de wind.",
"Ik heb gewonnen.": "Ik heb wonnen.",
"Ik heb hem al jaren niet gezien. Nu zie ik hem. Hij kijkt.": "Ik heb hom al joaren nait zain. Nou zai ik hom. Hai kiekt.",
"Ik heb hem bewaard. Er zit een eierbalrecept in. In jouw handschrift. Je vergat hem in de klas.": "Ik heb hom bewaard. Der zit n eierbalrecept in. In dien handschrift. Je vergat hom in de klas.",
"Ik heb hem gedragen. De tas. Dat is nu af.": "Ik heb hom gedragen. De tas. Dat is nou af.",
"Ik heb mijn dansschoenen bij me. Ik bewaar ze nog.": "Ik heb mien dansschoenen bie mie. Ik bewaar ze nog.",
"Ik heb mijn ogen niet open gehad. Dat is geen vliegen. Dat is gebeuren.": "Ik heb mien ogen nait open gehad. Dat is gain vliegen. Dat is gebeuren.",
"Ik heb net gebeld. Niemand nam op.": "Ik heb net gebeld. Niemand nam op.",
"Ik heb niks gezien. Ik keek naar het sein.": "Ik heb niks zain. Ik keek noar t sein.",
"Ik heb nog meer.": "Ik heb nog meer.",
"Ik heb nooit eerder gezien wat een brug doet als hij open is. Ik zat er altijd in.": "Ik heb nooit aarder zain wat n brug dut as hai open is. Ik zat der aaltied in.",
"Ik heb nu genoeg karakter. Voor twee.": "Ik heb nou genoeg karakter. Veur twij.",
"Ik heb papieren, meneer. Ik heb altijd papieren.": "Ik heb papieren, meneer. Ik heb aaltied papieren.",
"Ik heb veertig jaar verloren. Ik weet precies hoe het fout gaat. Nu doe ik het andersom.": "Ik heb veertig joar verloren. Ik wait precies hoe t fout goat. Nou doe ik t andersom.",
"Ik heb zijn medaille op mijn bureau. Elke ochtend kijk ik ernaar. Ik was zes toen ik hoorde hoe hij hem kreeg. Hij lachte erom. Ik niet.": "Ik heb zien medaille op mien bureau. Elke ochtend kiek ik dernoar. Ik was zes toen ik hoorde hoe hai hom kreeg. Hai lachte erom. Ik nait.",
"Ik hoor een claxon. Hij komt dichterbij.": "Ik hoor n claxon. Hai komt dichterbij.",
"Ik hoor jullie praten. Praat zachter. Mijn paard luistert mee.": "Ik hoor jim proaten. Proat zachter. Mien peerd luistert mee.",
"Ik hoorde het. Op een bankje.": "Ik hoorde t. Op n bankje.",
"Ik ken drie van die namen. Een zit in mijn kerkenraad.": "Ik ken drij van dij namen. N zit in mien kerkenraad.",
"Ik kijk niet naar beneden.": "Ik kiek nait noar beneden.",
"Ik kijk nooit naar camera's. Dat is hoe je weet dat ik echt ben.": "Ik kiek nooit noar camera's. Dat is hoe je wait dat ik echt ben.",
"Ik kijk wel. Van de grond. Daar is hij het mooist.": "Ik kiek wel. Van de grond. Doar is hai t mooist.",
"Ik kom zaterdag. Ik laat me rijden. Durk en Douwe zorgen voor mij. Ze zijn aardig. Ze hebben ook een klomp.": "Ik kom zaterdag. Ik loat mie rieden. Durk en Douwe zorgen veur mie. Ze binnen aardig. Ze hebben ook n klomp.",
"Ik krijg net een berichtje. Van een Stadjer. Er staat: \"Ik fiets.\" Dat is alles.": "Ik krijg net n berichtje. Van n Stadjer. Der stait: \"Ik fiets.\" Dat is aals.",
"Ik lach precies genoeg.": "Ik lach precies genoeg.",
"Ik land! Ik land! Hij staat!": "Ik laand! Ik laand! Hai stait!",
"Ik leef.": "Ik leef.",
"Ik leid. Jij zit bij de duiven. Zeg waar het grind begint.": "Ik leid. Doe zit bie de duven. Zeg woar t grind begint.",
"Ik loop even.": "Ik loop eefkes.",
"Ik luister altijd. Ik zeg het alleen niet.": "Ik luuster aaltied. Ik zeg t aleen nait.",
"Ik meld alleen: de kat zit bij de keuken. Hij is de enige die het hoort.": "Ik meld aleen: de kat zit bie de keuken. Hai is de enige dij t heurt.",
"Ik meld alleen: het is te vroeg gelukt. Dat is een record.": "Ik meld aleen: t is te vroeg gelukt. Dat is n record.",
"Ik meld alleen: hij had een nieuwe pet.": "Ik meld aleen: hai har n nije pet.",
"Ik meld alleen. Dit is geen melding. Dit is een feit.": "Ik meld aleen. Dit is gain melding. Dit is n feit.",
"Ik meld alleen. Ik ben blij.": "Ik meld aleen. Ik ben bliede.",
"Ik neem de trein. Ik kijk uit het raam. Dat kan ik.": "Ik nuim de trein. Ik kiek oet t raam. Dat kin ik.",
"Ik ook niet.": "Ik ook nait.",
"Ik open altijd. Het moment spreken we niet af.": "Ik open aaltied. T moment spreken wie nait af.",
"Ik pak de aanpak. Zeg het maar: stil, slim of hard.": "Ik pak de aanpak. Zeg t mor: stil, slim of hard.",
"Ik pak de botsauto. Jij bakt. Jij bakt beter als ik niet kijk.": "Ik pak de botsauto. Doe bakt. Doe bakt beter as ik nait kiek.",
"Ik pak de sleutel. Jij pakt het deksel van de thermoszak.": "Ik pak de sleutel. Doe pakt t deksel van de thermoszak.",
"Ik pak jouw fiets. Jij mag achterop.": "Ik pak dien fiets. Doe mag achterop.",
"Ik raak de stoppels.": "Ik raak de stoppels.",
"Ik raak ze. Ze merken het niet.": "Ik raak ze. Ze merken t nait.",
"Ik regel het filiaal. Jij mag het bed testen.": "Ik regel t filiaal. Doe mag t bed testen.",
"Ik rij vandaag clean. Voor één keer.": "Ik rij vandoage clean. Veur ain keer.",
"Ik rij zelf.": "Ik rij zulf.",
"Ik rij zelf. Ik wil even niet praten.": "Ik rij zulf. Ik wil eefkes nait proaten.",
"Ik rij. Achter een paard aan. Dat is mijn tempo.": "Ik rij. Achter n peerd aan. Dat is mien tempo.",
"Ik rij. Dit is de laatste regio. Ik wil het zien.": "Ik rij. Dit is de lèste regio. Ik wil t zain.",
"Ik rij. Jij houdt de kaart vast en zegt wanneer het bord komt.": "Ik rij. Doe houdt de kaart vast en zegt wanneer t bord komt.",
"Ik rij. Jij zit naast me. Dat is hoe het hoort.": "Ik rij. Doe zit naast mie. Dat is hoe t heurt.",
"Ik schiet op blikjes. Dat helpt.": "Ik schiet op blikjes. Dat helpt.",
"Ik schuif niet meer. Ik dans.": "Ik schuif nait meer. Ik dans.",
"Ik sloeg ze niet. Ik duwde ze weg.": "Ik sloeg ze nait. Ik duwde ze weg.",
"Ik snurk. Ga uw gang.": "Ik snurk. Goa uw gang.",
"Ik sta liever.": "Ik sta liever.",
"Ik tel altijd mee.": "Ik tel aaltied mee.",
"Ik tel altijd. Alleen niet hardop.": "Ik tel aaltied. Aleen nait hardop.",
"Ik toeter nooit. Het is Tessa.": "Ik toeter nooit. T is Tessa.",
"Ik trek. Jij duwt. Dat doen we altijd.": "Ik trek. Doe duwt. Dat doun wie aaltied.",
"Ik vaar de goede kant! Het is een gewoonte!": "Ik vaar de goie kant! T is n gewoonte!",
"Ik vlieg boven. Meel. Zes zakken. Eén keer wit. Daarna sta ik stil.": "Ik vlieg boven. Meel. Zes zakken. Eén keer wit. Doarna sta ik stil.",
"Ik vlieg!": "Ik vlieg!",
"Ik vlieg. Ik kijk niet naar beneden. Ik kijk naar het graan.": "Ik vlieg. Ik kiek nait noar beneden. Ik kiek noar t groan.",
"Ik vraag niet waarom. Er zit een schroefje. Eentje. Ik zie hem. Hij gaat naar het oosten. De heide op.": "Ik vroag nait woarom. Der zit n schroefje. Eentje. Ik zai hom. Hai goat noar t oosten. De heide op.",
"Ik weet het.": "Ik wait t.",
"Ik weet niet wat we doen met \"groeien of thuis\".": "Ik wait nait wat wie doun mit \"groeien of thoes\".",
"Ik wel. Ik tel altijd.": "Ik wel. Ik tel aaltied.",
"Ik wil dat hij terugkomt.": "Ik wil dat hai terugkomt.",
"Ik wil één keer alle bruggen tegelijk open. Dat doe je nooit. Dat is verboden. Dat is een feest.": "Ik wil ain keer aal bruggen tegelieke open. Dat doe je nooit. Dat is verboden. Dat is n feest.",
"Ik wil Fjord Frituren in de dorpen waar iemand het lekker vindt. Niet eenenveertig. Zeven. Door mensen die zij zelf zijn.": "Ik wil Fjord Frituren in de dorpen woar ain t lekker vindt. Nait eenenveertig. Zeven. Deur mensen dij zai zulf zien.",
"Ik wil gewoon… op de grond.": "Ik wil gewoon… op de grond.",
"Ik wil niet weten wat ik daarbij voel.": "Ik wil nait weten wat ik doarbij voel.",
"Ik wil niet. Maar het is leuk.": "Ik wil nait. Mor t is leuk.",
"Ik zal het vragen.": "Ik zal t vroagen.",
"Ik zat in de trein naar Stad. Ook alleen.": "Ik zat in de trein noar Stad. Ook aleen.",
"Ik zeg niks. Ik ben bisschop.": "Ik zeg niks. Ik ben bisschop.",
"Ik zeg ze zelden.": "Ik zeg ze zelden.",
"Ik zei dat jij alles hetzelfde wilt.": "Ik zee dat doe aals hetzelfde wilst.",
"Ik zei het. Ik wil op de grond.": "Ik zee t. Ik wil op de grond.",
"Ik zie alles vanaf mijn toren. Dit is geen toren. Het is een hooiberg. Ik zie alles toch.": "Ik zai aals vanaf mien toren. Dit is gain toren. T is n hooiberg. Ik zai aals toch.",
"Ik zie de fabriek vier keer.": "Ik zai de fabriek vier keer.",
"Ik zie de villa. Drie lichten in de gang. Eén bewaker bij de trap.": "Ik zai de villa. Drij lichten in de gang. Eén bewaker bie de trap.",
"Ik zie hem.": "Ik zai hom.",
"Ik zie het graan voor het groeit. Jullie zie ik ook. Jullie komen vaker dan jullie denken.": "Ik zai t groan veur t groeit. Jim zai ik ook. Jim komen vaker dan jim denken.",
"Ik zie het. Ik ram niet. Ik controleer.": "Ik zai t. Ik ram nait. Ik controleer.",
"Ik zie niks! Er zit een duif op mijn bril!": "Ik zai niks! Der zit n duuf op mien bril!",
"Ik zie ze! In het water! Rammen, vanaf links.": "Ik zai ze! In t woater! Rammen, vanaf links.",
"Ik zit erin. Ik heb hem veertig jaar gevlogen. Hij is nog nooit uit de lucht gevallen. Soms ernaast.": "Ik zit derin. Ik heb hom veertig joar gevlogen. Hai is nog nooit oet de lucht gevallen. Soms dernoast.",
"Ik zit in de jury. Van Ubbo. Dat weet hij. Wat hij niet weet: ik hoor alles. Ik zeg weinig.": "Ik zit in de jury. Van Ubbo. Dat wait hai. Wat hai nait wait: ik hoor aals. Ik zeg weinig.",
"Ik zit vast! Ik ben niet gewond! Het is zacht!": "Ik zit vast! Ik ben nait gewond! T is zacht!",
"In de sloot. Dat was mien man. Gas erop.": "In de sloot. Dat was mien man. Gas derop.",
"In Veendam gaat een brug open. Je wacht. Er zit een man die zijn brug heeft. Hij is iets te laat. Dat is zijn vak.": "In Veendam goat n brug open. Je wacht. Der zit n man dij binnen brug het. Hai is wat te loat. Dat is zien vak.",
"Instappen, mevrouw. Het is geen taxi. Het is een trein. Die doet wat hij wil, binnen het spoor.": "Instappen, mevrouw. T is gain taxi. T is n trein. Dij dut wat hai wil, binnen t spoor.",
"Is dan een product. Hij wordt gebakken in Veendam, Stadskanaal, Musselkanaal. Overal. Door mensen die jou nooit zullen ontmoeten. Dat noemen wij groei.": "Is dan n product. Hai wordt gebakken in Veendam, Stadskanaal, Musselkanaal. Overal. Deur mensen dij die nooit zullen ontmoeten. Dat noemen wie groei.",
"Is dat anders?": "Is dat aans?",
"Is die vriend bang?": "Is dij vriend bang?",
"Is dit de grens? Ik zie alleen een bord met sterren.": "Is dit de grens? Ik zai aleen n bord mit sterren.",
"Is dit Nederland? Ik wil naar Nederland. Ik sta er in, geloof ik.": "Is dit Nederland? Ik wil noar Nederland. Ik sta der in, geloof ik.",
"Is dit nou het echte leven? Wij willen het echte. Echt Gronings. Zonder filter.": "Is dit nou t echte leven? Wie willen t echte. Echt Gronings. Zonder filter.",
"Is het genoeg?": "Is t genoeg?",
"Is hij alleen?": "Is hai aleen?",
"Ja. Dat vond ik ook.": "Jo. Dat vond ik ook.",
"Ja. Het is een Fjord-eierbal. Hij blijft warm.": "Jo. T is n Fjord-eierbal. Hai bliedt waarm.",
"Ja. Met beide. En de thermoskan.": "Jo. Mit beide. En de thermoskan.",
"Jaarmarkt. Er rijdt vandaag een stoomtrein. Hij is gratis. Dat is geen grap. Dat is een jaarmarkt.": "Jaarmarkt. Der riedt vandoage n stoomtrein. Hai is gratis. Dat is gain grap. Dat is n jaarmarkt.",
"Jas van de inspectie. Klembord. Hou mijn hoofd rustig.": "Jas van de inspectie. Klembord. Hol mien hoofd rustig.",
"Je bent als een boer. Je doet het en je zegt er niks over.": "Je bist as n boer. Je dut t en je zegt der niks over.",
"Je bent boven Scheemda. Nog twee minuten tot de markt.": "Je bist boven Scheemda. Nog twij menuten tot de markt.",
"Je bent nat.": "Je bist nat.",
"Je bent ongelooflijk.": "Je bist ongelooflijk.",
"Je bent op tijd. Ik ben iets te laat. Dat compenseert.": "Je bist op tied. Ik ben wat te loat. Dat compenseert.",
"Je bent wit. Dat is al een medaille.": "Je bist wit. Dat is al n medaille.",
"Je denkt erover?": "Je denkt derover?",
"Je denkt erover.": "Je denkt derover.",
"Je had je ogen dicht.": "Je har je ogen dicht.",
"Je hebt het water nog niet eens gezien.": "Je hest t woater nog nait eens zain.",
"Je hebt zeventig jaar gewacht. Je mag.": "Je hest zeventig joar gewacht. Je mag.",
"Je klinkt blij.": "Je klinkt bliede.",
"Je lacht te veel.": "Je lacht te veul.",
"Je luisterde.": "Je luisterde.",
"Je opent hem een tel te laat!": "Je opent hom n tel te loat!",
"Je rijdt altijd zelf.": "Je riedt aaltied zulf.",
"Je staat aan de bosrand. Ik hoor je. Dat is genoeg.": "Je stait aan de bosrand. Ik hoor je. Dat is genoeg.",
"Je staat op mijn brug. Ik zie je. Een tel te laat.": "Je stait op mien brug. Ik zai je. N tel te loat.",
"Je staat op mijn molen. Je ziet mijn graan. Ik zie jou. Ik meld alleen.": "Je stait op mien molen. Je ziet mien groan. Ik zai die. Ik meld aleen.",
"Je telt mee.": "Je telt mee.",
"Je versloeg zes mannen met een fietspomp.": "Je versloeg zes mannen mit n fietspomp.",
"Je wilt alleen niet minder.": "Je wilst aleen nait minder.",
"Je wilt dat de kar rijdt.": "Je wilst dat de kar riedt.",
"Je zat er zes minuten in.": "Je zat der zes menuten in.",
"Je ziet er… duur uit.": "Je ziet der… duur oet.",
"Je zit vastgebonden aan een pallet.": "Je zit vastgebonden aan n pallet.",
"Jelle deed dat ook. Vet opkopen.": "Jelle deed dat ook. Vet opkopen.",
"Jelle deed het uit liefde. Dit is het uit rekenwerk.": "Jelle deed t oet liefde. Dit is t oet rekenwerk.",
"Jelle ligt in de gracht.": "Jelle ligt in de gracht.",
"Jij blijft bij de auto. Hoor je een alarm, dan rijd je.": "Doe bliedt bie de auto. Hoor je n alarm, dan rijd je.",
"Jij kunt wél bakken.": "Doe kinst wél bakken.",
"Jij wilt alles groter.": "Doe wilst aals grötter.",
"Jij wilt alles groter. Altijd groter. Het is nooit genoeg.": "Doe wilst aals grötter. Aaltied grötter. T is nooit genoeg.",
"Jij wilt alles hetzelfde.": "Doe wilst aals hetzelfde.",
"Jij wilt alles hetzelfde. Dezelfde kar. Dezelfde plek. Dezelfde rij. Je wil niet eens een tweede pan.": "Doe wilst aals hetzelfde. Dezelfde kar. Dezelfde plek. Dezelfde rij. Je wil nait eens n tweede pan.",
"Jij zit niet in het ding.": "Doe zit nait in t ding.",
"Jouw oom?": "Dien oom?",
"Jullie hebben een klomp.": "Jim hebben n klomp.",
"Jullie rijden te hard. Ik meld alleen.": "Jim rieden te hard. Ik meld aleen.",
"Jullie zijn van Jelle.": "Jim binnen van Jelle.",
"Kaas, vis, en een mevrouw die zegt dat ze een notaris is. Ik koop de kaas.": "Kaas, vis, en n mevrouw dij zegt dat ze n notaris is. Ik koop de kaas.",
"Kan hij niet even hier komen?": "Kin hai nait eefkes hier komen?",
"Kende u hem?": "Kende u hom?",
"Kiepers. Vier achter elkaar. Ze lossen op de brug.": "Kiepers. Vier achter elkaar. Ze lossen op de brug.",
"Kijk, de molen van Winschoten. Hij draait. Niemand zet hem aan.": "Kiek, de molen van Winschoten. Hai draait. Niemand zet hom aan.",
"Kijk. De heide. Dit is van niemand. Daarom is het van iedereen.": "Kiek. De heide. Dit is van niemand. Doarom is t van iedereen.",
"Kijk. De vesting. Zaterdag. Hij sluit hem af. Berend wacht op u.": "Kiek. De vesting. Zaterdag. Hai sluit hom af. Berend wacht op u.",
"Kijk. Graan. Tot aan de hemel.": "Kiek. Groan. Tot aan de hemel.",
"Klik.": "Klik.",
"Koffie. Het is zwart. Het is ook alles wat ik heb.": "Koffie. T is zwart. T is ook aals wat ik heb.",
"Kolen. Eén schep. Twee. Op de maat. Niet te veel. Stoom is een dier. Het wil eten, niet stikken.": "Kolen. Eén schep. Twij. Op de maat. Nait te veul. Stoom is n dier. T wil eten, nait stikken.",
"Kom het halen!": "Kom t hoalen!",
"Kom, jongen. Fluit maar. Ze staan klaar.": "Kom, jong. Fluit mor. Ze stoan kloar.",
"Kon hij niet bakken?": "Kon hai nait bakken?",
"Kon minder.": "Kon minder.",
"Kon minder. Ik heb dat bewaard, Trijntje. Zeventig jaar. Voor jou.": "Kon minder. Ik heb dat bewaard, Trijntje. Zeventig joar. Veur die.",
"Kon veel minder.": "Kon veul minder.",
"Krachtmeter! Wie slaat de bel? Niemand! Dat is de bedoeling!": "Krachtmeter! Wel slaat de bel? Niemand! Dat is de bedoeling!",
"Kruiden niezen?": "Kruiden niezen?",
"Kunnen jullie ons hier uit halen? We hebben een gele jas aan.": "Kinnen jim ons hier oet hoalen? Wie hebben n gele jas aan.",
"Laat dat boek los!": "Loat dat boek los!",
"Laat de jongen roepen. Ze komen.": "Loat de jong roepen. Ze komen.",
"Laat hem zakken! Het touw!": "Loat hom zakken! T touw!",
"Laat ze duwen. Ik ben zwaarder dan ik eruitzie.": "Loat ze duwen. Ik ben zwaarder dan ik eruitzie.",
"Lammert en Trijntje dansen. Op een plein, in een vesting. Het duurt twee minuten. Het is het mooiste wat ik dit jaar gezien heb. Ik zeg niks. Ik draai strijkers.": "Lammert en Trijntje dansen. Op n plein, in n vesting. T duurt twij menuten. T is t mooiste wat ik dit joar zain heb. Ik zeg niks. Ik draai strijkers.",
"Lammert. Je bent er ook.": "Lammert. Je bist der ook.",
"Landen. Rustig. Het is maar een grasveld.": "Landen. Rustig. T is mor n grasveld.",
"Langzaam. Met de voeten op de grond.": "Langzaam. Mit de voeten op de grond.",
"Lavendel. Ik heb het opgezocht.": "Lavendel. Ik heb t opgezocht.",
"Lees rustig. Een goed contract is geduld. Ik ben in de wagon hierachter. De burgemeester wil een foto.": "Lees rustig. N goud contract is geduld. Ik ben in de wagon hierachter. De burgemeester wil n foto.",
"Lier. Nu. Te vroeg. Het is gelukt.": "Lier. Nou. Te vroeg. T is gelukt.",
"Liever niet.": "Liever nait.",
"Lijn vast! Trekken! De vrachtboot toetert!": "Lijn vast! Trekken! De vrachtboot toetert!",
"Lijn. Er hangt een lijn.": "Lijn. Der hangt n lijn.",
"Links. Het derde bolwerk. Ze kijken niet. Ze eten.": "Links. T trede bolwerk. Ze kieken nait. Ze eten.",
"Maar nu zei hij het voor het eerst na een overwinning.": "Mor nou zee hai t veur t aarst noa n overwinning.",
"Mag ik even zitten?": "Mag ik eefkes zitten?",
"Mag ik hem aaien?": "Mag ik hom aaien?",
"Meisje. Je hebt de bal geroken. Hij is warm.": "Wicht. Je hest de bal geroken. Hai is waarm.",
"Mem. Dank u.": "Mem. Dank u.",
"Meneer Oldenhuis. Ik moet u meenemen. Voor het uitvoeren van cultuurgoed zonder vergunning. En een paar vragen over enveloppen.": "Meneer Oldenhuis. Ik mout u meenemen. Veur t uitvoeren van cultuurgoed zonder vergunning. En n paar vroagen over enveloppen.",
"Mensen kiezen altijd. Dat is hun probleem. Ik koop de keuze.": "Mensen kiezen aaltied. Dat is heur probleem. Ik koop de keuze.",
"Met een fietspomp.": "Mit n fietspomp.",
"Mevrouw Fjord. U kijkt naar de medaille van mijn opa.": "Mevrouw Fjord. U kiekt noar de medaille van mien opa.",
"Mevrouw Trijntje. Dit is van mijn opa. Eerste prijs. Hij is niet van ons. Dat was hij nooit.": "Mevrouw Trijntje. Dit is van mien opa. Aarste prijs. Hai is nait van ons. Dat was hai nooit.",
"Mevrouw, wij doen alleen de aanmeldingen!": "Mevrouw, wie doun aleen de aanmeldingen!",
"Mevrouw! Dat is niet voor u!": "Mevrouw! Dat is nait veur u!",
"Mevrouw. De brug is gesloten. Ik wilde alleen zeggen: dat was de snelste rit die ik ooit gezien heb.": "Mevrouw. De brug is gesloten. Ik wol aleen zeggen: dat was de snelste rit dij ik ooit zain heb.",
"Mien vader leende van Trijntje tien gulden. In 1953. Voor een bromfiets. Hij is nooit op tijd teruggekomen. Ik ook niet.": "Mien voader leende van Trijntje tien gulden. In 1953. Veur n bromfiets. Hai is nooit op tied teruggekomen. Ik ook nait.",
"Mien vrouw en ik hadden dertig jaar ruzie over een brug. Hij is er nog.": "Mien vrouw en ik hadden dertig joar ruzie over n brug. Hai is der nog.",
"Mijn broer vindt u eerlijk. Ik vind dat een gebrek.": "Mien broer vindt u eerlk. Ik vind dat n gebrek.",
"Mijn broer was een van die juryleden. Hij heeft die paling nooit opgegeten. Hij werd zeeziek van het idee.": "Mien broer was n van dij juryleden. Hai het dij paling nooit opgegeten. Hai werd zeeziek van t idee.",
"Mijn buurman zegt dat de koffie daar goedkoper is.": "Mien buurman zegt dat de koffie doar goedkoper is.",
"Mijn eigen zin.": "Mien aigen zin.",
"Mijn naam is niet te koop.": "Mien noam is nait te koop.",
"Mijn neef. Ik zit tussen de bomen. Dat is hoger dan je denkt.": "Mien neef. Ik zit tussen de bomen. Dat is hoger dan je denkt.",
"Mijn opa wist het. Een jury is een stoel. Wie erop zit, wint. Hij zat op een kar en op een stoel tegelijk.": "Mien opa wus t. N jury is n stoel. Wel derop zit, wint. Hai zat op n kar en op n stoel tegelieke.",
"Mijn vergunning voor de Vismarkt. Die ligt in mijn kantoor.": "Mien vergunning veur de Vismarkt. Dij ligt in mien kantoor.",
"Mogen wij erover?": "Mogen wie derover?",
"Moi. Henk. Hij liet zijn auto bij mij nakijken. In Stad. Voor de Ronde. Ik heb alleen even onder zijn bumper gekeken.": "Moi. Henk. Hai liet zien auto bie mie nakijken. In Stad. Veur de Ronde. Ik heb aleen eefkes onder zien bumper gekeken.",
"Moi. Het is voorronde, maar ook vrachtverkeer. Ik heb geen afspraken. Ik heb schepen.": "Moi. T is voorronde, mor ook vrachtverkeer. Ik heb gain afspraken. Ik heb schepen.",
"Moi. Jullie zijn van Trijntje. Jullie hebben haar kin.": "Moi. Jim binnen van Trijntje. Jim hebben heur kin.",
"Moi. Nachtstreek. Ik zei in augustus dat het het laatste kwartier was. Dat was een misrekening. Het was het eerste.": "Moi. Nachtstreek. Ik zee in augustus dat t t lèste kwartier was. Dat was n misrekening. T was t aarste.",
"Moi. Siemen. Boswachter. U bent van Trijntje.": "Moi. Siemen. Boswachter. U bist van Trijntje.",
"Moi. U bent van Trijntje. U bent alleen. Dat is niet hoe het zou moeten zijn.": "Moi. U bist van Trijntje. U bist aleen. Dat is nait hoe t zol mouten wezen.",
"Mooi gedaan, mevrouw. Mooi gedaan, allemaal. Ik had het niet beter kunnen regisseren. Komt u binnen. Er is een tafel gedekt. Er is een jury. Dit is wat ik wilde.": "Mooi doan, mevrouw. Mooi doan, allemoal. Ik har t nait beter kinnen regisseren. Komt u binnen. Der is n tafel gedekt. Der is n jury. Dit is wat ik wol.",
"Mooi weer. Er komt geen schip. Ik meld alleen.": "Mooi weer. Der komt gain schip. Ik meld aleen.",
"Mooi. Dat was precies een tel te laat. Dat is het goede.": "Mooi. Dat was precies n tel te loat. Dat is t goie.",
"Mooi. Heel mooi. Een uur geleden had ik twee reuzen. Nu heb ik twee reuzen minder.": "Mooi. Hail mooi. N uur geleden har ik twij reuzen. Nou heb ik twij reuzen minder.",
"Mooi. Heel mooi. Je zou brugwachter kunnen worden.": "Mooi. Hail mooi. Je zol brugwachter kinnen worden.",
"Münster. Hij is zachter dan hij klinkt.": "Münster. Hai is zachter dan hai klinkt.",
"Musselkanaal. Eindpunt. De koffie is er koud. Maar de rit was warm.": "Musselkanaal. Eindpunt. De koffie is der kold. Mor de rit was waarm.",
"Musselkanaal. Waar het museumspoor ophoudt. De rook niet.": "Musselkanaal. Woar t museumspoor ophoudt. De rook nait.",
"Muu.": "Muu.",
"Na de Ronde beslissen we. Samen.": "Noa de Ronde beslissen wie. Samen.",
"Naar Beerta graag. Ik wil de zon zien ondergaan boven de Dollard. Niet te snel, dan mis ik hem.": "Noar Beerta graag. Ik wil de zun zain ondergaan boven de Dollard. Nait te gaauw, dan mis ik hom.",
"Naar het erf, niet de sloot in. Een baal zwemt niet.": "Noar t erf, nait de sloot in. N baal zwemt nait.",
"Naar Midwolda. Het is maar vier kilometer. Ik zou lopen, maar ik heb een grote kist.": "Noar Midwolda. T is mor vier kilometer. Ik zol lopen, mor ik heb n grode kist.",
"Naar mij.": "Noar mie.",
"Naar Stad. Ik ben daar naartoe verhuisd. Ik ga terug. Ik mis de kou. Dat is een grap, het is zomer.": "Noar Stad. Ik ben doar naartoe verhuisd. Ik goa terug. Ik mis de kou. Dat is n grap, t is zomer.",
"Naar waar? Het is nacht, Tammo. Er is hier niks.": "Noar woar? T is nacht, Tammo. Der is hier niks.",
"Naast?": "Naast?",
"Nachtstreek, de laatste rit. De torenwachter belt.": "Nachtstreek, de lèste rit. De torenwachter belt.",
"Nachtstreek, de stilste uitzending van het jaar. Ik draai niks. Ik zeg niks. Ik adem alleen. Als jullie dat horen, ben ik er.": "Nachtstreek, de stilste uitzending van t joar. Ik draai niks. Ik zeg niks. Ik adem aleen. As jim dat heuren, ben ik der.",
"Nachtstreek, in het daglicht, de laatste minuut van de laatste uitzending van de zomer. Er staat een bal op een tafel. Iemand draagt een medaille.": "Nachtstreek, in t daglicht, de lèste minuut van de lèste uitzending van de zomer. Der stait n bal op n tafel. Ain draagt n medaille.",
"Nachtstreek, in het daglicht, het laatste uur. Aan de lijn: een dame van tweeënnegentig, uit een limousine met een motorkap van een trekker.": "Nachtstreek, in t daglicht, t lèste uur. Aan de lijn: n dame van tweeënnegentig, oet n limousine mit n motorkap van n trekker.",
"Nachtstreek, in het daglicht. Ik voel me een vleermuis. Ik sta op de heide ten noorden van Vesting Bourtange. Er zijn kartonnen kanonnen. Ik tel er zeven.": "Nachtstreek, in t daglicht. Ik voel mie n vleermuis. Ik sta op de heide ten noorden van Vesting Bourtange. Der binnen kartonnen kanonnen. Ik tel der zeven.",
"Nachtstreek, op de rails. Ik heb een beller met kolenstof in zijn stem.": "Nachtstreek, op de rails. Ik heb n beller mit kolenstof in zien stem.",
"Nachtstreek, op de rails. Ik heb een beller op een locomotief. Ik moest het twee keer controleren.": "Nachtstreek, op de rails. Ik heb n beller op n locomotief. Ik moest t twij keer controleren.",
"Nachtstreek, op tournee. Aan de lijn: een boerin uit het Oldambt, om zes uur 's ochtends. Dat is voor haar middag.": "Nachtstreek, op tournee. Aan de lijn: n boerin oet t Oldambt, om zes uur 's ochtends. Dat is veur heur middag.",
"Nachtstreek, op tournee. Het regent papier in Winschoten en het is niet eens oktober.": "Nachtstreek, op tournee. T regent papier in Winschoten en t is nait eens oktober.",
"Nachtstreek, op tournee. Ik sta op een brug in Veendam. Hij beweegt. Ik heb geen vast gevoel in mijn knieën.": "Nachtstreek, op tournee. Ik sta op n brug in Veendam. Hai beweegt. Ik heb gain vast gevoel in mien knieën.",
"Nachtstreek, op tournee. Ik sta tussen een draaimolen en een schiettent op de kermis in Winschoten. Hier ruikt het naar suiker en vet. Dat is ook wat ik ben.": "Nachtstreek, op tournee. Ik sta tussen n draaimolen en n schiettent op de kermis in Winschoten. Hier rukt t noar suiker en vet. Dat is ook wat ik ben.",
"Nachtstreek, op tournee. Ik sta voor een fabriek die naar pannenkoeken ruikt. Dat is zetmeel. Ik had dat niet geweten.": "Nachtstreek, op tournee. Ik sta veur n fabriek dij noar pannenkoeken rukt. Dat is zetmeel. Ik har dat nait geweten.",
"Nachtstreek, op tournee. Vanavond vanuit de Veenkoloniën. Rechte kanalen, rechte wegen en mensen die je nooit hoort klagen. Ze hebben geen tijd. Ze moeten vroeg op.": "Nachtstreek, op tournee. Vanoavend vanuit de Veenkoloniën. Rechte kanalen, rechte wegen en mensen dij je nooit heurt klagen. Ze hebben gain tied. Ze mouten vroeg op.",
"Nachtstreek, op tournee. Vanavond vanuit het Oldambt.": "Nachtstreek, op tournee. Vanoavend vanuit t Oldambt.",
"Nachtstreek, op tournee. Vanavond vanuit Westerwolde. Er is geen station. Dat hoort zo. Ik heb gevraagd waarom. Iemand zei: zo blijft het stil.": "Nachtstreek, op tournee. Vanoavend vanuit Westerwolde. Der is gain station. Dat heurt zo. Ik heb gevraagd woarom. Ain zee: zo bliedt t stil.",
"Nachtstreek, op tournee. Vanuit een brugwachtershuisje in Veendam. Het is klein. Er staat een stoel en een thermoskan.": "Nachtstreek, op tournee. Vanuit n brugwachtershuisje in Veendam. T is klain. Der stait n stoel en n thermoskan.",
"Nachtstreek. Aan de lijn: een dame van het Oldambtmeer.": "Nachtstreek. Aan de lijn: n dame van t Oldambtmeer.",
"Nachtstreek. Er viel vanochtend papier uit de lucht boven Winschoten. De burgemeester zou het eerst \"een vorm van reclame\" noemen.": "Nachtstreek. Der viel vanochtend papier oet de lucht boven Winschoten. De burgemeester zol t aarst \"n vorm van reclame\" noemen.",
"Nachtstreek. Ik heb een beller die zegt dat hij mag bellen. Dat is nieuw. Ik hoor een deur dichtgaan.": "Nachtstreek. Ik heb n beller dij zegt dat hai mag bellen. Dat is nij. Ik hoor n deur dichtgaan.",
"Nachtstreek. Ik heb een beller uit de Schildersbuurt. Hij belt zelden. Hij brengt dan meestal een brief.": "Nachtstreek. Ik heb n beller oet de Schildersbuurt. Hai belt zelden. Hai brengt dan meestal n brief.",
"Nachtstreek. Ik heb een beller uit Ljouwert. Hij klinkt alsof hij net gehuild heeft en dat ontkent.": "Nachtstreek. Ik heb n beller oet Ljouwert. Hai klinkt alsof hai net gehuild het en dat ontkent.",
"Natuurlijk.": "Natuurlijk.",
"Nee, Berend. Nu was het ons.": "Nee, Berend. Nou was t ons.",
"Nee, dank u.": "Nee, dank u.",
"Nee.": "Nee.",
"Nee. Daarom.": "Nee. Doarom.",
"Nee. Ik ben nooit verder gekomen dan Ow.": "Nee. Ik ben nooit verder gekomen dan Ow.",
"Nee. Ik heb een plan. Dit keer win ik. Ik heb veertig jaar geoefend.": "Nee. Ik heb n plan. Dit keer win ik. Ik heb veertig joar geoefend.",
"Nee. Ik ken hem van de radio. Maar ik zie alles wat achter mij rijdt. Dat is mijn werk. Het is geen melden.": "Nee. Ik ken hom van de radio. Mor ik zai aals wat achter mie riedt. Dat is mien wark. T is gain melden.",
"Net Sinterklaas.": "Net Sinterklaas.",
"Niemand.": "Niemand.",
"Niet nu, Tammo. Ik doe het zelf.": "Nait nou, Tammo. Ik doe t zulf.",
"Niet rennen! Het is meel! Je glijdt!": "Nait rennen! T is meel! Je glijdt!",
"Niet toeteren! Hij is een paard, geen auto!": "Nait toeteren! Hai is n peerd, gain auto!",
"Niets. Vet. Geld. Het is hetzelfde.": "Niks. Vet. Geld. T is hetzelfde.",
"Nieuwe lijn. Het is het Oldambt. Er is hier niks. Dat is het mooie. Je ziet alles komen.": "Nije lijn. T is t Oldambt. Der is hier niks. Dat is t mooie. Je ziet aals komen.",
"Nieuweschans. Een vestingdorp met een grens. Daar stopt Nederland. Het stopt vriendelijk.": "Nieuweschans. N vestingdorp mit n grens. Doar stopt Nederland. T stopt vriendelijk.",
"Nieuweschans. Verder gaat het spoor niet. Daarna is het Duitsland. Dat heeft een ander spoor.": "Nieuweschans. Verder goat t spoor nait. Doarna is t Duitsland. Dat het n ander spoor.",
"Nu de regelaar. Zacht. Een stoomtrein is geen auto.": "Nou de regelaar. Zacht. N stoomtrein is gain auto.",
"Nu!": "Nou!",
"Nummer vijf van eenenveertig.": "Nummer vief van eenenveertig.",
"Nummer vijf van zeven.": "Nummer vief van zeven.",
"OB. OB. OB. Hij heeft ze een voor een gestempeld.": "OB. OB. OB. Hai het ze n veur n gestempeld.",
"Oldenhuis Bakt. Eenenveertig snackbars. Eén recept. Probeer.": "Oldenhuis Bakt. Eenenveertig snackbars. Eén recept. Probeer.",
"Om deze tijd?": "Om disse tied?",
"Oma werd altijd een tien.": "Oma werd aaltied n tien.",
"Oma werd zes.": "Oma werd zes.",
"Oma. De Fjord.": "Oma. De Fjord.",
"Oma. Waarom Bourtange?": "Oma. Woarom Bourtange?",
"Oma. Waarom heeft u dat nooit gezegd?": "Oma. Woarom het u dat nooit gezegd?",
"Omlaag. Onder de bomen. Hij durft niet zo laag. Ik wel.": "Omlaag. Onder de bomen. Hai durft nait zo laag. Ik wel.",
"Onder de lijn door. Mien man deed het erover. Hij is nu boer in de sloot.": "Onder de lijn deur. Mien man deed t derover. Hai is nou boer in de sloot.",
"Ook goed. Verdunnen is een soort verspreiden.": "Ook goud. Verdunnen is n soort verspreiden.",
"Op de streep staan mag. Eén voet. Twee voeten is een mening.": "Op de streep stoan mag. Eén voet. Twij voeten is n mening.",
"Op een woonschip.": "Op n woonschip.",
"Opa Hendrik. Hij begon met één kar, in Veendam. Hij leerde mijn broer alles. Behalve bakken.": "Opa Hendrik. Hai begon mit ain kar, in Veendam. Hai leerde mien broer aals. Behalve bakken.",
"Open. Dicht. Open. Dicht.": "Open. Dicht. Open. Dicht.",
"Oplegger los! Hij staat. Op de dijk.": "Oplegger los! Hai stait. Op de diek.",
"Over vaten. Over OB. Over mijn opa, die in 1953 paling voer voor een kar in Veendam. Ik heb een verklaring afgelegd.": "Over vaten. Over OB. Over mien opa, dij in 1953 paling voer veur n kar in Veendam. Ik heb n verklaring afgelegd.",
"Overal. Zijn zus woont aan het meer. Zij geeft vanavond een feest. Ik zie de lichtjes al.": "Overal. Zien zus woont aan t meer. Zai geeft vanoavend n feest. Ik zai de lichtjes al.",
"Overweg. Bel, bomen, toeter. In die volgorde. Dat zei Jantina ook. Ze heeft gelijk.": "Overweg. Bel, bomen, toeter. In dij volgorde. Dat zee Jantina ook. Ze het gelieke.",
"Ow is de eerste trede, Ubbo. Daar sta je. Je staat er goed.": "Ow is de aarste trede, Ubbo. Doar sta je. Je stait der goud.",
"Ow.": "Ow.",
"Ow. Hoorde u dat? Ow.": "Ow. Hoorde u dat? Ow.",
"Ow. Ik rij mee. Ik ben grondig.": "Ow. Ik rij mee. Ik ben grondig.",
"Paarden. Alleen paarden. Geen auto's. Dit is de laatste markt waar niemand toetert.": "Paarden. Aleen paarden. Gain auto's. Dit is de lèste markt woar niemand toetert.",
"Pakband. Jongen. Je hebt een zakmes.": "Pakband. Jong. Je hest n zakmes.",
"Perceel vier. Begin bij de sloot, eindig bij de berm. Niet bij de buren. Ik ken ze.": "Perceel vier. Begin bie de sloot, eindig bie de berm. Nait bie de buren. Ik ken ze.",
"Pers is pers. Je moet er vóór zijn.": "Pers is pers. Je mout der vóór zien.",
"Planner. Je moet om vier uur in Veendam zijn. Het is drie. Je zit in Hoogezand. Ik zou niet zuchten. Het is kaarsrecht.": "Planner. Je mout om vier uur in Veendam binnen. T is drij. Je zit in Hoogezand. Ik zol nait zuchten. T is kaarsrecht.",
"Politieheli. Links. Hij kijkt.": "Politieheli. Links. Hai kiekt.",
"Pomp?": "Pomp?",
"Poort drie, links. Wind uit het noorden.": "Poort drij, links. Wind oet t noorden.",
"Poort. Ik rijd.": "Poort. Ik rijd.",
"Proef.": "Proef.",
"Rechts is een brug. Hij gaat open.": "Rechts is n brug. Hai goat open.",
"Remmen voor eieren. Daar ben ik beroemd om.": "Remmen veur aaien. Doar ben ik beroemd om.",
"Rij gewoon! Er komt een brug!": "Rij gewoon! Der komt n brug!",
"Rikus. Berend. Ik zit op een paard. Het is een heel groot paard. Hij heet Münster.": "Rikus. Berend. Ik zit op n peerd. T is n hail groot peerd. Hai heet Münster.",
"Rikus. Dries, machinist op de stoomtrein. Vanavond is er een gesloten rit. Een salonrijtuig. Een meneer die niet eet maar wel betaalt.": "Rikus. Dries, machinist op de stoomtrein. Vanoavend is der n gesloten rit. N salonrijtuig. N meneer dij nait et mor wel betaalt.",
"Rikus. Ik heb een boek. En een contract.": "Rikus. Ik heb n boek. En n contract.",
"Rikus. Ik wil een verzoek. Strijkers. Voor mijn feest vanavond, aan het water.": "Rikus. Ik wil n verzoek. Strijkers. Veur mien feest vanoavend, aan t woater.",
"Rikus. Is Tammo aan het luisteren?": "Rikus. Is Tammo aan t luusteren?",
"Rikus. Roelfien, Beerta. Er vliegt vanochtend een vliegtuig laag over mien graan. Dat ben ik niet. Dat is een vriend.": "Rikus. Roelfien, Beerta. Der vliegt vanochtend n vliegtuig laag over mien groan. Dat ben ik nait. Dat is n vriend.",
"Rikus. Roelfien. Drie vettrucks, over de dijkweg. Zonder licht. Ze hebben geen reden om stiekem te doen.": "Rikus. Roelfien. Drij vettrucks, over de dijkweg. Zonder licht. Ze hebben gain reden om stiekem te doun.",
"Rikus. Siebrand Mulder. Ik bel vanuit het bureau in Delfzijl. De agente zegt dat ik mag praten. Ik ben dat niet gewend.": "Rikus. Siebrand Mulder. Ik bel vanuit t bureau in Delfzijl. De agente zegt dat ik mag proaten. Ik ben dat nait gewend.",
"Rikus. Torenwachter. Ik zie een colonne. Hij komt uit het oosten. Hij is lang. Hij heeft een frietwagen voorop.": "Rikus. Torenwachter. Ik zai n colonne. Hai komt oet t oosten. Hai is lang. Hai het n frietwagen voorop.",
"Rikus. Trijntje. Ik ben er. Ik zit in de schaduw. Het is warm. Het is een goede dag.": "Rikus. Trijntje. Ik ben der. Ik zit in de schaduw. T is waarm. T is n goie dag.",
"Rikus. Vanavond de voorronde Oldambt. Mijn mensen zijn er. Ook een paar die u kent.": "Rikus. Vanoavend de voorronde Oldambt. Mien mensen binnen der. Ook n paar dij u kent.",
"Rikus. Veendam is mijn thuis. Daar ben ik geboren, daar ligt mijn fabriek. Vandaag stuur ik alles.": "Rikus. Veendam is mien thoes. Doar ben ik geboren, doar ligt mien fabriek. Vandoage stuur ik aals.",
"Rikus. Wubbo. De silo's van de zetmeelfabriek zijn vannacht open. Er staat een bewaker bij die dacht dat hij alleen was.": "Rikus. Wubbo. De silo's van de zetmeelfabriek zien vannacht open. Der stait n bewaker bie dij dacht dat hai aleen was.",
"Rikus. Wubbo. Er komt vandaag een mevrouw van de Fjord kijken bij de snackbar. Ik zou haar graag een tel eerder laten openen. Maar dat doe ik nooit.": "Rikus. Wubbo. Der komt vandoage n mevrouw van de Fjord kieken bie de snackbar. Ik zol heur graag n tel aarder loaten openen. Mor dat doe ik nooit.",
"Rob. Doe dicht.": "Rob. Doe dicht.",
"Roelfien zat ernaast. Dat is anders.": "Roelfien zat dernoast. Dat is aans.",
"Roelfien zegt dicht.": "Roelfien zegt dicht.",
"Roelfiens gerstemout. Uit het eigen graan.": "Roelfiens gerstemout. Oet t aigen groan.",
"Rood sein. Dat is rood. Daar sta je voor stil.": "Rood sein. Dat is rood. Doar sta je veur stil.",
"Rook! Houd vast! Het zicht komt terug!": "Rook! Houd vast! T zicht komt terug!",
"Rubberboot. Rechts. Twee mannen.": "Rubberboot. Rechts. Twij mannen.",
"Rustig, jongen. Je bent aan het genieten.": "Rustig, jong. Je bist aan t genieten.",
"Rustig. Even niet toeteren.": "Rustig. Eefkes nait toeteren.",
"Samen is ook een antwoord.": "Samen is ook n antwoord.",
"Samen.": "Samen.",
"Schip in zicht! Brug gaat open! Vijfentwintig seconden!": "Schip in zicht! Brug goat open! Vijfentwintig seconden!",
"Sellingen. Heide in bloei, zo ver je kijkt. Iemand heeft hier een boswachter neergezet. Hij zegt niks. Hij hoort alles.": "Sellingen. Heide in bloei, zo ver je kiekt. Ain het hier n boswachter neergezet. Hai zegt niks. Hai heurt aals.",
"Silo twee. Achteruit. Aan de linkerkant. Nog een meter. Klik.": "Silo twij. Achteruit. Aan de linkerkant. Nog n meter. Klik.",
"Silo. Hij gaat open. Rennen!": "Silo. Hai goat open. Rennen!",
"Sleutel zit erin. Hier steelt niemand. Alleen ik.": "Sleutel zit derin. Hier steelt niemand. Aleen ik.",
"Slim is voor jou.": "Slim is veur die.",
"Sluis open. Het water komt. Het komt niet snel. Het komt op tijd.": "Sluis open. T woater komt. T komt nait gaauw. T komt op tied.",
"Sorry, Münster.": "Sorry, Münster.",
"Stadskanaal. Een stad die vond dat een kanaal genoeg was om haar naam te geven. Het was genoeg.": "Stadskanaal. N stad dij vond dat n kanaal genoeg was om heur noam te geven. T was genoeg.",
"Stadskanaal. Je hebt een locomotief gereden. Meer mensen hebben het op een briefje dan in het echt.": "Stadskanaal. Je hest n locomotief gereden. Meer mensen hebben t op n briefje dan in t echt.",
"Stil is voor jou.": "Stil is veur die.",
"Stil! Dat is een wolvenspoor. Ik voel het.": "Stil! Dat is n wolvenspoor. Ik voel t.",
"Stoom vergeeft niks. Behalve een goeie stoker. En jij bent een goeie stoker.": "Stoom vergeeft niks. Behalve n goeie stoker. En doe bist n goeie stoker.",
"Stop! Dat is de sloep van mevrouw!": "Stop! Dat is de sloep van mevrouw!",
"Stoppels vergeven. Het is een stoppelveld. Daarom heet het zo.": "Stoppels vergeven. T is n stoppelveld. Doarom heet t zo.",
"Strooien! Nu! Houd vast en laat los!": "Strooien! Nou! Houd vast en loat los!",
"Stuurboord, Tessa. Dat is rechts. Dat zeg ik ook tegen mijn boot.": "Stuurboord, Tessa. Dat is rechts. Dat zeg ik ook tegen mien boot.",
"Tammo! Ik had gezegd dat je niet hoefde te komen.": "Tammo! Ik har gezegd dat je nait hoefde te komen.",
"Tammo! Je hebt gevlogen!": "Tammo! Je hest gevlogen!",
"Tammo. Je kunt dit.": "Tammo. Je kinst dit.",
"Tammo. We hebben het nog niet beantwoord.": "Tammo. Wie hebben t nog nait beantwoord.",
"Te hard. Het is een museum. Het hoort langzaam.": "Te hard. T is n museum. T heurt langzaam.",
"Te vroeg. Dat is ook een soort op tijd. Het is mijn beste dag.": "Te vroeg. Dat is ook n soort op tied. T is mien beste dag.",
"Tegen een paard.": "Tegen n peerd.",
"Tegen zichzelf.": "Tegen zichzelf.",
"Tessa rijdt vanavond alleen. Ik zeg niks. Dat is mijn vak.": "Tessa riedt vanoavend aleen. Ik zeg niks. Dat is mien vak.",
"Thee? Het is een goed blad. Uit Veenkoloniën. Ik koop alles uit Veenkoloniën.": "Thee? T is n goud blad. Oet Veenkoloniën. Ik koop aals oet Veenkoloniën.",
"Thuis is waar de kar staat.": "Thoes is woar de kar stait.",
"Thuis.": "Thoes.",
"Thuis. Is. Waar. De. Kar. Staat. Zes.": "Thoes. Is. Woar. De. Kar. Stait. Zes.",
"Tien bruggen. Eén fanfare. Ik heb de maat nooit helemaal gehad.": "Tien bruggen. Eén fanfare. Ik heb de maat nooit hielemoal gehad.",
"Toren trekt. Hij leunt. Hij leunt goed.": "Toren trekt. Hai leunt. Hai leunt goud.",
"Trekker heeft een toren. Hij trekt hem. Zonder motor ging het niet. Met motor wel.": "Trekker het n toren. Hai trekt hom. Zonder motor gong t nait. Mit motor wel.",
"Trijntje. Je bent er.": "Trijntje. Je bist der.",
"Trijntje. Mag ik?": "Trijntje. Mag ik?",
"Twaalf. Ik tel er elf.": "Twaalf. Ik tel der elf.",
"Twee boten achter je. Gele. Ze duwen.": "Twij boten achter je. Gele. Ze duwen.",
"Twee ongeduldige klanten bij het luik! Met een koevoet!": "Twij ongeduldige klanten bie t luik! Mit n koevoet!",
"Tweede lading. Hou ze weg, Tammo.": "Tweede lading. Hol ze weg, Tammo.",
"Tweede ronde. Mout, zetmeel. De korst moet kraken.": "Tweede ronde. Mout, zetmeel. De korst mout kraken.",
"Tweede schip! Dit keer sneller! Twintig seconden!": "Tweede schip! Dit keer sneller! Twintig seconden!",
"Tweede. Linker wiel. Hou vast.": "Tweede. Linker wiel. Hol vast.",
"Twintig! Ik heb dertig nodig!": "Twintig! Ik heb dertig nodig!",
"U bent zijn juryman?": "U bist zien juryman?",
"U heeft gewonnen.": "U het wonnen.",
"U heeft het goed gedaan.": "U het t goud doan.",
"U mag erover. Maar niet met die auto.": "U mag derover. Mor nait mit dij auto.",
"U staat er in. Het is niet te zien. Dat is het mooie.": "U stait der in. T is nait te zain. Dat is t mooie.",
"Ubbo Oldenhuis. Ik verscheur het. Live. Op Nachtstreek.": "Ubbo Oldenhuis. Ik verscheur t. Live. Op Nachtstreek.",
"Ubbo zei Ow.": "Ubbo zee Ow.",
"Ubbo.": "Ubbo.",
"Uitnodiging.": "Uitnodiging.",
"Uw naam. Eenenveertig karren, met uw naam erop. Namen zijn goedkoper dan eierballen.": "Uw noam. Eenenveertig karren, mit uw noam derop. Namen zien goedkoper dan eierballen.",
"Valt mie nait of.": "Valt mie nait of.",
"Van de wijken. Elke maand. Per wijk één envelop. Ze gaan naar de fabriek.": "Van de wijken. Elke moand. Per wiek ain envelop. Ze goan noar de fabriek.",
"Van een notaris.": "Van n notaris.",
"Van Trijntje. Zij heeft zeven mensen die haar nog wat schuldig zijn. Dat is een leger.": "Van Trijntje. Zai het zeven mensen dij heur nog wat schuldig zien. Dat is n leger.",
"Van wie zijn deze enveloppen?": "Van wel zien disse enveloppen?",
"Vandaag tachtig eierballen. Er kwam een bus. Hij stond stil. Alle mensen bestelden. Ik heb gekeken.": "Vandoage tachtig eierballen. Der kwam n bus. Hai stun stil. Aal mensen bestelden. Ik heb gekeken.",
"Veel. Instappen.": "Veul. Instappen.",
"Veenboot. Pakket naar het Oosterdiep. Brug open. Over een tel.": "Veenboot. Pakket noar t Oosterdiep. Brug open. Over n tel.",
"Veendam. Een zijtak. Hij houdt van rustig.": "Veendam. N zijtak. Hai houdt van rustig.",
"Veendam. Rechte kanalen, rechte mensen. Als je hier te laat bent, is dat een keuze.": "Veendam. Rechte kanalen, rechte mensen. As je hier te loat bist, is dat n keuze.",
"Veertien kilometer fietsen voor een pers.": "Veertien kilometer fietsen veur n pers.",
"Veertien toeschouwers. Elf spelers. Één scheidsrechter. Ze kennen elkaar allemaal.": "Veertien toeschouwers. Elf spelers. Ain scheidsrechter. Ze kennen elkaar allemoal.",
"Veertig duiven. Ze luisteren naar niemand. Behalve naar jongen. Tammo, kom maar.": "Veertig duven. Ze luusteren noar niemand. Behalve noar jong. Tammo, kom mor.",
"Veertig eierballen. Twee schepen. Een tel te laat. De klanten waren tevreden.": "Veertig eierballen. Twij schepen. N tel te loat. De klanten waren tevreden.",
"Veertig jaar. Ik wil het één keer goed doen.": "Veertig joar. Ik wil t ain keer goud doun.",
"Veertig seconden. Dat is een lang liedje.": "Veertig seconden. Dat is n lang liedje.",
"Vergunning verlopen, jongens! Dat is geen kwestie van willen! Dat is papier!": "Vergunning verlopen, jongens! Dat is gain kwestie van willen! Dat is papier!",
"Vesting is geopend. Eerste fase.": "Vesting is geopend. Aarste fase.",
"Vet in de lekbak. Niks in de sloot.": "Vet in de lekbak. Niks in de sloot.",
"Vet slaapt nooit.": "Vet slaapt nooit.",
"Vier fronten. Water. Land. Lucht. Brug. Wie waar?": "Vier fronten. Woater. Laand. Lucht. Brug. Wel woar?",
"Vijf van zeven?": "Vief van zeven?",
"Vijf. Vijf voorrondes. Nog twee.": "Vief. Vief voorrondes. Nog twij.",
"Vlag. Vlag. Vlag. Drie.": "Vlag. Vlag. Vlag. Drij.",
"Volgende halte: Hoogezand-Sappemeer. · Volgende halte: Sappemeer Oost. · Volgende halte: Zuidbroek. · Volgende halte: Scheemda. · Volgende halte: Winschoten. · Volgende halte: Nieuweschans. Eindpunt. Wilt u bij het uitstappen op de grens letten. · Volgende halte: Veendam. Deze trein eindigt hier. · Volgende halte: Stadskanaal. Eindpunt van het museumspoor.": "Volgende halte: Hoogezand-Sappemeer. · Volgende halte: Sappemeer Oost. · Volgende halte: Zuidbroek. · Volgende halte: Scheemda. · Volgende halte: Winschoten. · Volgende halte: Nieuweschans. Eindpunt. Wilst u bie t uitstappen op de grens letten. · Volgende halte: Veendam. Disse trein eindigt hier. · Volgende halte: Stadskanaal. Eindpunt van t museumspoor.",
"Volgende halte: Scheemda. Daar is een oom.": "Volgende halte: Scheemda. Doar is n oom.",
"Voor de duidelijkheid: de grens is een lijn. Er staat nergens een muur. Alleen hier.": "Veur de duidelijkheid: de grens is n lijn. Der stait nergens n muur. Aleen hier.",
"Voor de voorruit. Alle veertig. Zacht.": "Veur de voorruit. Aal veertig. Zacht.",
"Voor een trekker wel. De rente komt later.": "Veur n trekker wel. De rente komt later.",
"Voor het dak. Dat lekt. Dat zie ik.": "Veur t dak. Dat lekt. Dat zai ik.",
"Voor mijn gasten. U bent niet uitgenodigd.": "Veur mien gasten. U bist nait uitgenodigd.",
"Voor Münster! Voor het bisdom! Voor het eerst!": "Veur Münster! Veur t bisdom! Veur t aarst!",
"Voor u. Niet voor de bal. Uitvoervergunning ontbreekt. Dat is geen kwestie van willen. Dat is papier.": "Veur u. Nait veur de bal. Uitvoervergunning ontbreekt. Dat is gain kwestie van willen. Dat is papier.",
"Voor wie, mevrouw?": "Veur wel, mevrouw?",
"Vroeger stond hier een heel dorp. Nu ook. Het is alleen kleiner geworden.": "Vrogger stun hier n hail dorp. Nou ook. T is aleen kleiner geworden.",
"Waar halen we dat vandaan?": "Woar hoalen wie dat vandaan?",
"Waar is de grens? Ik zie alleen een bord.": "Woar is de grens? Ik zai aleen n bord.",
"Waar zit de man met de eenenveertig snackbars?": "Woar zit de man mit de eenenveertig snackbars?",
"Waarheen?": "Woarheen?",
"Waarom niet?": "Woarom nait?",
"Waarom nu?": "Woarom nou?",
"Waarover wilt u praten?": "Woarover wilst u proaten?",
"Wat bent u haar schuldig?": "Wat bist u heur schuldig?",
"Wat gaan jullie doen?": "Wat goan jim doun?",
"Wat gebeurt er met de salonwagens?": "Wat gebeurt der mit de salonwagens?",
"Wat is er mis met de auto?": "Wat is der mis mit de auto?",
"Wat is er nog?": "Wat is der nog?",
"Wat is er te laat aan een brug?": "Wat is der te loat aan n brug?",
"Wat staat erin?": "Wat stait derin?",
"Wat wil je, Ubbo?": "Wat wil je, Ubbo?",
"Wat wil uw broer van mij?": "Wat wil uw broer van mie?",
"Wat?": "Wat?",
"Water. Land. Lucht. En een brug die te vroeg opengaat.": "Woater. Laand. Lucht. En n brug dij te vroeg opengaat.",
"We hebben een erf. We hebben geen koeien. Dat is raar, hè?": "Wie hebben n erf. Wie hebben gain kij. Dat is roar, hè?",
"We komen terug. Als vakantie. In de zomer. Voor de heide.": "Wie komen terug. As vakantie. In de zomer. Veur de heide.",
"We staan op een brug.": "Wie stoan op n brug.",
"We stonden op een brug. Die ging omhoog. En we hebben gebakken.": "Wie stonden op n brug. Dij gong omhoog. En wie hebben gebakken.",
"We verhuizen van Stad naar Bellingwolde. Voor de rust. Is het altijd zo stil? O. Fijn.": "Wie verhuizen van Stad noar Bellingwolde. Veur de rust. Is t aaltied zo stil? O. Fijn.",
"Weer de brug? Ik doe open. Een tel te laat. Dat verandert niet. Dat is het mooie.": "Weer de brug? Ik doe open. N tel te loat. Dat verandert nait. Dat is t mooie.",
"Weer de colonne? Ik zit al in de auto.": "Weer de colonne? Ik zit al in de auto.",
"Weer de fabriek? Mijn knieën zeggen nee. Ik zeg: een tweede keer is routine.": "Weer de fabriek? Mien knieën zeggen nee. Ik zeg: n tweede keer is routine.",
"Weer de finale? Ik ben tweeënnegentig. Ik heb tijd. Kom maar.": "Weer de finale? Ik ben tweeënnegentig. Ik heb tied. Kom mor.",
"Weer de loc? Kolen zijn duur. Maar jij mag. Jij kijkt naar het sein.": "Weer de loc? Kolen zien duur. Mor doe mag. Doe kiekt noar t sein.",
"Weer die jurk? Ik heb hem al gezien. Hij staat je goed. Nat ook.": "Weer dij jurk? Ik heb hom al zain. Hai stait je goud. Nat ook.",
"Weer die tuin. Het gras is mijn vriend.": "Weer dij tuin. T gras is mien vriend.",
"Weer het beleg? Ik win nog steeds niet graag. Doe maar.": "Weer t beleg? Ik win nog steeds nait graag. Doe mor.",
"Weer het schip? Ik doe open. Een tel te laat. Dat weten jullie nu.": "Weer t schip? Ik doe open. N tel te loat. Dat weten jim nou.",
"Weer op de heuvel? Het paard houdt van herhalingen. Ik niet.": "Weer op de heuvel? T peerd houdt van herhalingen. Ik nait.",
"Weer u? Dan gelden dezelfde regels. Die verandert niemand. Dat is ook de bedoeling.": "Weer u? Dan gelden dezelfde regels. Dij verandert niemand. Dat is ook de bedoeling.",
"Weer vliegen? Ik heb brandstof. Jij bent bleek. Dat wisselt af.": "Weer vliegen? Ik heb brandstof. Doe bist bleek. Dat wisselt af.",
"Weer wit. Het hoort bij het beroep.": "Weer wit. T heurt bie t beroep.",
"Weet je wat dat betekent? Dat hij toen ook beter was. Dat jouw opa het wist.": "Wait je wat dat betekent? Dat hai toen ook beter was. Dat dien opa t wus.",
"Wekt u mij in Stad? Of Veendam. Waar we dan ook als eerste zijn.": "Wekt u mie in Stad? Of Veendam. Woar wie dan ook as aarste zien.",
"Wel waar. Nu draag ik wat terug. Ik weet nu wat. Dat weet je dan.": "Wel woar. Nou draag ik wat terug. Ik wait nou wat. Dat wait je dan.",
"Welk contract?": "Welk contract?",
"Welke fabriek?": "Welke fabriek?",
"Welkom, mevrouwen en heren, bij de finale van de Ommelander Ronde! Voorzitter van de jury, de oudste in het gezelschap: mevrouw Trijntje.": "Welkom, mevrouwen en heren, bie de finale van de Ommelander Ronde! Voorzitter van de jury, de oudste in t gezelschap: mevrouw Trijntje.",
"Wie belde u?": "Wel belde u?",
"Wie heeft gewonnen?": "Wel het wonnen?",
"Wij bellen de politie. Die komen zo.": "Wie bellen de politie. Dij komen zo.",
"Wij houden de gracht! Dat is onze gracht!": "Wie hollen de gracht! Dat is onze gracht!",
"Wij missen de stad. Dat is gek, want we zijn er weggegaan.": "Wie missen de stad. Dat is gek, want wie binnen der weggegaan.",
"Wij noemen dat uitzicht.": "Wie noemen dat uitzicht.",
"Wij weten van niks! We zijn adviseurs!": "Wie weten van niks! Wie binnen adviseurs!",
"Wij zijn allebei.": "Wie binnen allebei.",
"Wij zijn haar kleinkinderen.": "Wie binnen heur kleinkinderen.",
"Winschoten. Hier staat een molen. Hij kijkt naar jou. Hij kijkt altijd.": "Winschoten. Hier stait n molen. Hai kiekt noar die. Hai kiekt aaltied.",
"Winschoten. Ik heb een filiaal gedroomd. Hier. Aan het water.": "Winschoten. Ik heb n filiaal gedroomd. Hier. Aan t woater.",
"Wubbo. Dank u.": "Wubbo. Dank u.",
"Ze begeleidden je naar de poort. Met een glas.": "Ze begeleidden je noar de poort. Mit n glas.",
"Ze dansen.": "Ze dansen.",
"Ze dansen. Langzaam.": "Ze dansen. Langzaam.",
"Ze danste. Langzaam. Met de voeten op de grond.": "Ze danste. Langzaam. Mit de voeten op de grond.",
"Ze hebben gekozen.": "Ze hebben gekozen.",
"Ze hebben gelijk.": "Ze hebben gelieke.",
"Ze hebben het allemaal betaald.": "Ze hebben t allemoal betaald.",
"Ze hebben honger. Dat is geen misdaad.": "Ze hebben honger. Dat is gain misdaad.",
"Ze hebben iets goeds gedaan. Dat zie je aan de snelheid.": "Ze hebben wat goeds doan. Dat zai je aan de snelheid.",
"Ze is niet alleen.": "Ze is nait aleen.",
"Ze keren om. Ze zagen alleen papier.": "Ze keren om. Ze zagen aleen papier.",
"Ze liepen me naar de poort. Beleefd.": "Ze liepen mie noar de poort. Beleefd.",
"Ze luisteren naar niemand. Alleen naar jou. Dat is de gave. Gebruik haar mooi.": "Ze luusteren noar niemand. Aleen noar die. Dat is de gave. Gebruik heur mooi.",
"Ze rijden harder dan ik denk. Voor een aardappel.": "Ze rieden harder dan ik denk. Veur n aardappel.",
"Ze rollen beter dan ik dacht.": "Ze rollen beter dan ik dacht.",
"Ze weet het.": "Ze wait t.",
"Ze willen alleen even zitten.": "Ze willen aleen eefkes zitten.",
"Ze zei: Valt mie nait of. Dat is trede drie.": "Ze zee: Valt mie nait of. Dat is trede drij.",
"Ze zijn gebleven.": "Ze binnen bleven.",
"Zeg: aanvallen. Dat is wat een generaal zegt.": "Zeg: aanvallen. Dat is wat n generaal zegt.",
"Zeil bij. Wind uit het noordwesten. Ik zei: bij.": "Zeil bie. Wind oet t noordwesten. Ik zee: bie.",
"Zelfde friet?": "Zelfde friet?",
"Zelfde vet. Dat is het mooie.": "Zelfde vet. Dat is t mooie.",
"Zes filialen, Tammo.": "Zes filialen, Tammo.",
"Zes uur.": "Zes uur.",
"Zes van zeven.": "Zes van zeven.",
"Zes.": "Zes.",
"Zes. Dan blijft er één.": "Zes. Dan bliedt der ain.",
"Zes. Er komt weinig langs. Maar het zijn goede zes.": "Zes. Der komt weinig langs. Mor t zien goie zes.",
"Zestienhonderdtweeënzeventig. Bommen Berend valt Bourtange aan. Hij verliest.": "Zestienhonderdtweeënzeventig. Bommen Berend valt Bourtange aan. Hai verliest.",
"Zet me af bij het hek. Niet bij de halte. Bij het hek. Het graan wacht niet.": "Zet mie af bie t hek. Nait bie de halte. Bie t hek. T groan wacht nait.",
"Zetmeel voor Veendam. Een container voor de silo. We bezorgen ons eigen meel.": "Zetmeel veur Veendam. N container veur de silo. Wie bezorgen ons aigen meel.",
"Zeven is een mooi getal. Ik heb het nooit verteld.": "Zeven is n mooi getal. Ik heb t nooit verteld.",
"Zeven mensen. Voor Oma.": "Zeven mensen. Veur Oma.",
"Zeven mensen. Zeven gunsten. Ik weet niet wat ik moet zeggen.": "Zeven mensen. Zeven gunsten. Ik wait nait wat ik mout zeggen.",
"Zeven van zeven.": "Zeven van zeven.",
"Zeventig jaar rente.": "Zeventig joar rente.",
"Zijn dat de mensen die voor u betalen of de mensen die voor u rijden?": "Zien dat de mensen dij veur u betalen of de mensen dij veur u rieden?",
"Zijn kleinzoon betaalt in enveloppen.": "Zien kleinzoon betaalt in enveloppen.",
"Zijn zus zei dat hij mijn naam wil. Op eenenveertig karren.": "Zien zus zee dat hai mien noam wil. Op eenenveertig karren.",
"Zitten. Stil. Zes uur. Hij komt. Hij komt altijd als je het niet verwacht.": "Zitten. Stil. Zes uur. Hai komt. Hai komt aaltied as je t nait verwacht.",
"Zo heet het. Ik heb het bedacht. Op de fiets.": "Zo heet t. Ik heb t bedacht. Op de fiets.",
"Zo. Dat was dat.": "Zo. Dat was dat.",
"Zo. De trekker van mien vader is betaald. Met een vliegtuig.": "Zo. De trekker van mien voader is betaald. Mit n vliegtuig.",
"Zo. Zeven jaar heb ik niemand achter die regelaar gezet. Het ging goed. Dat is vervelend.": "Zo. Zeven joar heb ik niemand achter dij regelaar gezet. T gong goud. Dat is vervelend.",
"Zonder dit vet staat zijn kraam morgen met een lege pan.": "Zonder dit vet stait zien kraam mörn mit n lege pan.",
"Zonder het te weten.": "Zonder t te weten.",
"Zonder vet geen voorronde. Zonder voorronde geen Ronde.": "Zonder vet gain voorronde. Zonder voorronde gain Ronde.",
"Zuidbroek. Hier zat ik gisteren. Alleen.": "Zuidbroek. Hier zat ik gisteren. Aleen."
}
```

### G. TTS-cast en sprekerskleuren

Niets hiervan is ingesproken (geen API-aanroepen in deze ronde). Hergebruikte stemmen: zie §2. Begroting: zie §12.

```js
// scripts/tts_lines_list.mjs CAST: add
  'Roelfien': { voice: 'Pulcherrima', who: 'Roelfien, 68, graanboerin bij Beerta, Trijntjes nicht, rijdt een gewasspuiter zoals anderen een fiets, nuchter en grondig', pool: ['nuchter, kordaat', 'droog, warm', 'streng, geamuseerd'], accent: 'spoken in Oldambtster Gronings, a farmer woman in her sixties, dry and practical' },
  'Molenaar Eilert': { voice: 'Iapetus', who: 'Eilert, molenaar van Winschoten, melder, bedachtzaam', pool: ['bedachtzaam, droog', 'zacht, wijs'], accent: 'spoken in Oldambtster Gronings, an old man, slow and thoughtful' },
  'Mevrouw Oldenhuis-Blauw': { voice: 'Vindemiatrix', who: 'Ubbo\'s zus, zestig, elegant en kil, villa aan het Oldambtmeer', pool: ['kil, elegant', 'geamuseerd, scherp', 'zacht, berekenend'], accent: 'spoken in standard Dutch with a trace of Groningen, elegant and dry' },
  'Brugwachter Wubbo': { voice: 'Achernar', who: 'Wubbo, brugwachter in Veendam, vriendelijk, slaperig en een fractie te laat', pool: ['gemoedelijk, traag', 'verontschuldigend', 'trots, rustig'], accent: 'spoken in Veenkoloniaal Gronings, slow and friendly' },
  'Boswachter Siemen': { voice: 'Sadaltager', who: 'Siemen, boswachter in Westerwolde, melder, rustig, zegt weinig', pool: ['rustig, kort', 'droog, warm'], accent: 'spoken in Westerwolds Gronings, close to Drents, quiet man' },
  'Wolvenman Gerrit': { voice: 'Rasalgethi', who: 'Gerrit, wolvenman uit Westerwolde, zeker van zijn zaak', pool: ['opgewonden, zeker', 'fluisterend, plechtig', 'teleurgesteld, sportief'], accent: 'spoken in Westerwolds Gronings, earnest' },
  'Machinist Dries': { voice: 'Enceladus', who: 'Dries, machinist van de museumstoomtrein, bijna zeventig, kolenstof in de stem', pool: ['schor, droog', 'trots, kort', 'streng, vaderlijk'], accent: 'spoken in Veenkoloniaal Gronings, gruff old engine driver' },
  'Floor': { voice: 'Leda', who: 'Floor, Randstedelinge van veertig, rijk en enthousiast', pool: ['enthousiast, snel', 'beleefd, verbaasd', 'ontroerd, zacht'], accent: 'spoken in standard Dutch from the west, bright and eager' },
  'Joost': { voice: 'Achird', who: 'Joost, Randstedeling van drie-en-veertig, beleefd en vaag', pool: ['beleefd, vaag'], accent: 'spoken in standard Dutch from the west, polite' },
  'Botsautobaas Dolf': { voice: 'Alnilam', who: 'Dolf, baas van de botsautobaan in Winschoten', pool: ['luid, joviaal', 'plechtig, luid'], accent: 'spoken in Oldambtster Gronings, booming fairground voice' },
  'Jurylid Dina': { voice: 'Zephyr', who: 'Dina, oud jurylid uit Winschoten, kritisch maar eerlijk', pool: ['droog, kritisch'], accent: 'spoken in Oldambtster Gronings' },
  'Notaris Rieks': { voice: 'Laomedeia', who: 'Rieks, notaris uit Veendam, tekende dertig jaar zonder te lezen', pool: ['droog, verbaasd'], accent: 'spoken in Veenkoloniaal Gronings' },
  'Machinist Berthus': { voice: 'Achird', who: 'Berthus, machinist op de lijn naar Nieuweschans', pool: ['droog, instruerend'], accent: 'spoken in Oldambtster Gronings' },
  'Franchise-adviseur Rob': { voice: 'Rasalgethi', who: 'Rob, gladde franchise-adviseur', pool: ['verkoperig, glad', 'betrapt, snel'], accent: 'spoken in standard Dutch with a sales voice' },
  'Franchise-adviseuse Sandra': { voice: 'Despina', who: 'Sandra, kille franchise-adviseuse', pool: ['kil, snel', 'betrapt'], accent: 'spoken in standard Dutch with a sales voice' },
  'Grenswacht': { voice: 'Umbriel', who: 'een agent van de fictieve Grenswacht, kortaf en vriendelijk onverbiddelijk', pool: ['kortaf, onverbiddelijk', 'droog, vriendelijk'], accent: 'spoken in Gronings, flat and official' },
  'Grenzwächter': { voice: 'Fenrir', who: 'een Duitse grenswachter aan de overkant van de streep', pool: ['kortaf, vriendelijk'], accent: 'spoken in German, flat and official (lang own)' },
  'Knecht van Ubbo': { voice: 'Alnilam', who: 'een knecht van Oldenhuis Bakt in een gele jas', pool: ['stug, ongelukkig'], accent: 'spoken in Gronings' },
  'Gast': { voice: 'Zephyr', who: 'een gast op het feest van mevrouw Oldenhuis-Blauw', pool: ['kletserig, joviaal'], accent: 'spoken in standard Dutch' },
  'Bourtanger': { voice: 'Despina', who: 'een inwoner van Bourtange', pool: ['nuchter, verbaasd'], accent: 'spoken in Westerwolds Gronings' },

// game/js/speakers.js SPEAKER_COLORS: add
  'Roelfien': '#b8683c',
  'Molenaar Eilert': '#7c8f55',
  'Mevrouw Oldenhuis-Blauw': '#9a74b0',
  'Brugwachter Wubbo': '#a8832e',
  'Boswachter Siemen': '#4e8a64',
  'Wolvenman Gerrit': '#8a8f3a',
  'Machinist Dries': '#8d7f5a',
  'Floor': '#c0627f',
  'Joost': '#4f8aa8',
  'Botsautobaas Dolf': '#b87a30',
```

## 12. Tellingen en TTS-begroting

- **Hoofdmissies:** 14 (O19-O32), plus 7 verhaalstappen tussendoor (n-winschoten, n-beerta, n-aanbod en n-ruzie, n-veendam, n-brugwachter, n-westerwolde, n-boshut). Samen **€ 43.300** aan beloningen voor O19-O32 (plus € 7.200 voor alle zijmissies).
- **Zijmissies:** 11 in 3 reeksen (Z9-Z12 De Randstedelingen, Z13-Z16 Brugwachter Wubbo, Z17-Z19 De Wolvenman).
- **Activiteiten en bijbanen:** 12 blokken (museumspoor met stoker en machinist; streekbus; vrachtwagen Veendam en grens; driftplekken en veenwegsprints; kermiscircuit; combinerace, rooien en balen rapen; oogstfeest; grensgrappen; gewasspuiter, vliegbrevet, regatta, kanaalraces en Veenboot; taxi, pakketten, verhuizen; Fjord-filialen; verkennen en verzamelen).
- **Ontmoetingen en events:** 17. **Herkenningspunten:** 25. **Geheimen:** 10.
- **Gesproken regels in dit document:** 1192 (inclusief autogesprekken en coupégesprekken); unieke Groningse spreekregels: 1101, ± 50k tekens; Friese ondertitels: 7; Duitse ondertitels: 6; Groningse ondertitels: 2.
- **Per spreker:** Anita 340, Tammo 283, Brugwachter Wubbo 65, Rikus 61, Ubbo Oldenhuis 49, Roelfien 35, Berend Bos 30, Machinist Dries 24, Oma Trijntje 21, Durk 17, Knecht van Ubbo 17, Boswachter Siemen 16, Douwe 15, Grenswacht 14, Reiziger 12, Boer 12, Wolvenman Gerrit 12, Rikus (verteller) 12, Floor 11, Mevrouw Oldenhuis-Blauw 9, Sluiswachter Lammert 9, Molenaar Eilert 8, Grenzwächter 8, Botsautobaas Dolf 6, Jelle Terpstra 6, Franchise-adviseuse Sandra 6, Kosteres Geesje 6, Franchise-adviseur Rob 5, Joost 5, Notaris Rieks 4, Duivenmelker Bert 4, Machinist Berthus 4, Buschauffeur Jannes 4, Gast 3, Jurylid Dina 3, Siebrand Mulder 3, Harm 3, Kapitein Klaas 3, Henk 3, Student 3, Toerist 3, Wybe 3, Omroeper 2, Kermisbaas Hennie 2, Broeder Everhard 2, Wadgids Fenna 2, Tinus 2, Ubbo's piloot 2, Torenwachter 2, Eppo Bolt 2, Koe Grietje 2, Mem Terpstra 2, Koe Aaltje 2, Plezierjachtschipper 2, Bor 2, Wiebren 2, Slager Ruurd 1, Dokter Dijkstra 1, Menigte 1, Buurman 1, Treinomroep 1, Loodsdienst 1, Agent 1.
- **TTS-begroting:** de hele cast kostte op 2 oktober ± $2,70 voor ~3.400 clips via OpenRouter-credits. Voor F4c (± 1101 unieke clips) is dat naar verhouding **± $1 tot $1,50**, betaald uit OpenRouter-credits (geen directe Google-facturering).
