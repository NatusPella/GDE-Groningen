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
- **Altijd zomer.** Deel 4 speelt in de nazomer, 15-27 september, en blijft zomer: geen herfst, geen winter, geen vorst, geen Koningsdag. Het plan-item "de eerste vorst" in O32 is vervangen door "de laatste zomeravond" (§9). Heide in bloei, stoppelvelden, warme avonden, af en toe een bui.
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

### 1.2 Kalender (een teller, geen rooster)

De datumkaart "Deel 4 · 15 september" staat in F4a. Voor de rest geldt: de speldag is een **teller**; elke gewonnen voorronde schuift hem anderhalve dag op, zodat zeven voorrondes binnen 15-27 september passen, hoe snel of langzaam je ook speelt. Er zijn maar drie datumkaarten: O1 (15 sept), de finale (**zaterdag 27 september**) en het slot van O32. In dialogen staan daarom geen weekdagen behalve "zaterdag" voor de finale. *Dit botst met F4a, dat O10 op za 27 sept zet; voorstel: O10 naar "zo 21 sept".*

| Moment | Dagdeel | Missie |
|---|---|---|
| Oldambt | avond / ochtend / middag / avond | O19, O20, O21, O22 (kermis) |
| Veenkoloniën | middag, avond, nacht, nacht, middag | O23, O24, O25, O26, O27 |
| za 27 sept | ochtend | O28 (de rit door het bos) |
| za 27 sept | nacht ervoor | O29 (kloostertuin; speelt "de nacht voor de finale") |
| za 27 sept | middag | O30 (het beleg), O31 (de laatste ronde) |
| za 27 sept | gouden uur tot nacht | O32 (colonne naar Stad) |

(O29 speelt dus tussen O28 en O30 maar in de nacht van vrijdag op zaterdag; de HUD zet de klok daarvoor terug naar 01:00. Zo blijft de finale op één dag.)

### 1.3 Aannames over F4a en F4b (voor de schrijvers van F4b)

- **F4a:** Ubbo's keten heeft 41 snackbars; de Fjord heeft filialen in Warffum en Delfzijl; de complimentenladder staat op Ow (Rikus, Eppo), Valt mie nait of (Hennie), Braid noar de zin (Lammert, "Ik bewaar wat. Voor de finale."); Z4 geeft de medaille (Oma werd tweede in de Ommelander Ronde, **Bourtange 1953**, "De jury was van een Oldenhuis. Zijn opa."). Als Z4 niet gespeeld is, vertelt Oma het zelf in O28 en geeft Harm-Jan de medaille in O31 (`[alleen als Z4 gespeeld]` / `[alleen zonder Z4]`).
- **F4b (aanname, graag bevestigen):** na de Westerkwartier-voorronde (O18) en een Wadkust-voorronde zijn er vier voorrondes; Fenna (wadgids) en Tinus (trekkertrek) bestaan als sleutels `fenna` en `tinus`; Jelle helpt vanaf de Friese kant en komt in de finale met zijn zwarte trekker-limousine; het **grootboek uit O14** is Fokko's boekje (deel één, de Wadroute); het grootboek van O24 is Ubbo's eigen **Kasboek, deel twee**. Mem Terpstra zit in F4c alleen aan de telefoon (O32). Filialen: Wadkust en Westerkwartier tellen als nummer drie en vier, dus Beerta is nummer vijf, Veendam zes, de boshut zeven.
- **Meldersbond:** de seven melders zijn kosteres (Geesje), sluiswachter (Lammert), dijkwerker (Wadkust, F4b), molenaar (Westerkwartier, F4b), **molenaar Eilert (Oldambt)**, **brugwachter Wubbo (Veenkoloniën)** en **boswachter Siemen (Westerwolde)**; de torenwachter is de grootvader van het hele gezin.

### 1.4 Geld, bezit, overslaan

Beloningen lopen van € 1.200 (O28) tot € 6.000 (O31), samen **€ 43.400** voor O19-O32 (zie §12). Geen stap kost geld; koopbare extra's (een vliegtuig bij Oostwold, een vrachtwagen, de villa aan het meer, een brommer) zijn `optional`. `storytest.js` krijgt het doel: met `payShare` 0,5 en niets kopen komt niemand vast te zitten. Overslaan pas na één poging; verhaalstappen (n-*) kunnen niet mislukken. Een auto is alleen van jou als je hem koopt: de Fjord Frituur is van Tammo en Tessa; de leenauto's van Wubbo en Roelfien, de gewasspuiter, Lammerts bootje, de brugboot, de sloep en de loc gaan terug.

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
| `wubbo` | Brugwachter Wubbo | Brugwachter. Opent altijd. Een tel te laat. | Achernar | `#c09a3a` | nieuwe stem |
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

**Coupégesprek `train:nieuweschans`** (banter): zie §11 D.

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
1. **Scène op het plein** (zie onder): wie rijdt in welke auto; Tammo's zes woorden (nee: vijf, en Tessa telt).
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

*Waar:* **Beerta** (Roelfiens erf en het dorpsplein), eind augustus-september: het laatste graan is binnen. Trekkerparade, combineshow, een eierbalkraam van de Fjord, een orkestje, een prijs voor de beste boterham. Nooit tijdens een missie; geen herfstmarkt, geen pompoenen.
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
- **Eilert** *(bedachtzaam, droog, aan de telefoon)*: Je staat op mijn molen. Je ziet mijn graan. Ik zie jou. Ik meld alleen.
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

**De kermis in Winschoten (zomerweekend)** · groot · Winschoten
- **Tessa** *(uitgelaten)*: Botsauto's! Zweefmolen! Schiettent! Alles!
- **Tammo** *(droog)*: Ik doe de schiettent. Van de grond. Daar is hij het mooist.

**Het oogstfeest in Beerta** · groot · Beerta (zie §5.7)

**Een paardenmarkt (fictief) in Vlagtwedde** · groot · Vlagtwedde
- **Boer** *(droog, trots)*: Paarden. Alleen paarden. Geen auto's. Dit is de laatste markt waar niemand toetert.
- **Tessa** *(zacht, lachend)*: Hij is zo mooi.
- **Tammo** *(droog)*: Hij weegt meer dan de Fjord.

**Een jaarmarkt in Stadskanaal** · groot · Stadskanaal
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
