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

