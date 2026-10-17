# Akte 2: "Het Noorden is groot" (Stad, Hogeland, Waddenzee; di 18 – do 20 augustus)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte2.md](09-script-akte2.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel. Functies: (1) inschrijving of financiering, (2) een plakje van Jelle blokkeren, (3) de waarheid over de bal ontdekken, (4) de Fjord Frituur en het recept gereedmaken.

## Intro van de akte

| | |
|---|---|
| **Regio** | Stad (begin), Hogeland (Winsum, Warffum, Usquert), Waddenzee-kust (Zoutkamp, Reitdiep, monding Lauwersmeer, kwelder; de zee zelf is zichtbaar maar niet bevaarbaar) |
| **Sfeer** | de dag na de kraak: Grunn zoekt twee mensen in het zwart; buiten Stad is het zonnig, wijd en stil; wierden, kerken, de dijk, de zee aan de horizon en het wad bij laagwater; het Plantsoenfestijn opent do 20 in Stad (op de radio) |
| **Tijd** | ca. 55 minuten (5 missies + 2 reisbeats) |
| **Dagen** | di 18 (2.1, 2.2, trein), wo 19 (2.3, 2.4), do 20 (bus, 2.5, 's nachts) |
| **Wat de speler leert** | de provincie is groot; reizen is een keuze (trein, bus); tankwagen, trekker, quad, snelle boot, ondiep water; sluipen langs de kustwacht; de plakjes van Jelle zichtbaar maken |
| **Plot** | Jelle koopt het vet (Stad), de eieren (Hogeland) en het zout (Wad), en **grijpt actief in**: hij koopt een weg dicht, huurt een boer, rijdt hen op de wierde achterna met beeldmateriaal van het museum. Oma Trijntje geeft een lijstje met vijf oude vrienden, één per regio; elke vriend heeft een ingrediënt van de eerste echte eierbal van 1953. **Jelle heeft de bal echt**: hij draagt hem in een gouden koffer bij zich (2.4), en op het skûtsje ligt een chocolade oefenbal (2.5). |
| **Romantiek** | Tessa laat Tammo het Hogeland zien (koeien, wierden, de zee achter de dijk); **de lange blik** onder de sterren op het wad (2.5) wordt onderbroken door een appje: "Iemand uit Friesland." |
| **Haak naar akte 3** | Klaas en Dijkstra: Jelle gaat naar de Eemshaven (plakje vijf, Lammerts haven), en Dijkstra heeft een heli klaarstaan. |

**Het plakjesbord (nieuw, "Wat weten we?"):** acht plakjes van Jelles plan. In deze akte worden plakje 1 (standplaatsen; **al definitief van Jelle**, 1.3), 2 (vet), 3 (eieren) en 4 (zout) zichtbaar; elk wordt "teruggewonnen" of "verloren" in beeld (AANNAME: nieuwe lijst in het pauzemenu, `todoui.js`/`verhaalui.js`).

**Jelle grijpt in (mechanisch gevolg):** 2.1 koopt de Europaweg dicht (de route springt om door smalle straten); 2.3 sluit de Dorpsweg en huurt de boer die dwars staat (de wierdepaden vol gaten); 2.4 hinderlaag met chantage en de limo (de quad moet de limo van zich afhouden).

**Reisplan akte 2** (afstanden geschat, AANNAME; meten met de reisplanner van #97):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Bornholmstraat (2.1) | Oosterpoort | 4,5 | 4 min | de missie zelf |
| Oosterpoort | Noorderhaven (2.2) | 3 | 3 min | skip met scooter |
| Noorderhaven | Station Grunn | 2,5 | 3 min | te voet 5 min |
| Station Grunn | Winsum (trein) | 17 | 12 min | treinrit met scène, 2 min in beeld; of auto 10 min |
| Winsum | Warffum (Geesje) | 12 | 8 min | Geesjes neef brengt je (skip, scène) |
| Warffum | Usquert (2.3 doel) | 3 | tractor 5 min | geen |
| Usquert | Uithuizen (bushalte; 2.4) | 6 | quad 4 min | geen |
| Uithuizen | Zoutkamp | 30 | 20 min | streekbus (ride-along, 2 min in beeld; of zelf rijden) |
| Zoutkamp | Lauwersoog en Noordpolderzijl (2.5) | 9 + 14 | rubberboot tot de zandplaat, dan te voet langs de kwelder | Klaas' kotter, skip met scène |

---

## 2.1 · Al het vet van Grunn (M07; H8)

| | |
|---|---|
| **Id** | `A2-1` (`H8`, mission `vetgekaapt`) |
| **Functie** | **2 · plakje twee (vet) blokkeren** |
| **Plaats** | Bornholmstraat naar de Oosterpoort (Stad), di 18 augustus, ochtend |
| **Voertuig** | tankwagen "Us Mem Vet" (gekaapt) |
| **Mechaniek / hergebruik** | `chase`-stage in `missions.js` (hits 70, `flee`, `cruise 15.5`); bestaande def, geen nieuwe code; de omgeleide route is een bestaand `reroute`-gebeuren (AANNAME: kleine toevoeging) |
| **Doel (hardop)** | "Kap de tankwagen met het vet en breng het naar de snackbars in de Oosterpoort: zonder vet geen oefenronde, zonder oefenronde geen Snackprijs." |
| **Motief** | de snackbarhouder in de Oosterpoort is veertig jaar open en zijn pannen zijn leeg; Jelle koopt het vet (plakje 2) |
| **Wat de speler weet** | Jelle koopt de standplaatsen (1.3, definitief); Sjabbe: de reuzen kopen alles voor frituren |
| **Verloop** | 1) Radio (alleen de wereld): geen vet meer in Grunn. 2) Banden van de bewaking stuk, tankwagen kapen. 3) **Jelle koopt de Europaweg dicht**: hekken, de route springt om. 4) Hard remmen kantelt de tankwagen: Tessa legt het zwaartepunt uit. 5) Aflevering in de Oosterpoort. **Falen:** wagen gekanteld of tijd: "Sikkom." |
| **Jelle grijpt in** | **koopt de weg dicht** (vergunning "evenement"): route om door smalle straten, tankwagen met hoog zwaartepunt |
| **Leuk-element / uitdaging** | eerste echte kaping: de lading en de wagen zijn groter dan de auto; zacht remmen als vaardigheid |
| **Reizen** | Flat naar Bornholmstraat 4,5 km: 4 min |
| **Romantiek (3/10)** | Mems appje: "Pas op dysels, famke. – M." Tammo ziet het: "Wie appt jou nou steeds?" "Niks. Iemand uit Friesland." "Is hij lang?" "Fierljepper zeker." |
| **Plot** | eerste overwinning op een plakje; Jelle belt na afloop in bij Nachtstreek (wereld): "Dat vet was van mij. No ja. Ik heb meer." |
| **Gevolg / haak** | Oma Trijntje belt Nachtstreek over fatbikes: "Stuur die twee." |
| **Behouden / nieuw** | intro (radio, als wereld), outro en autogesprek BEHOUDEN; de ter-plekke-uitleg en de wegafsluiting NIEUW |
| **Zij-activiteiten** | vetbaantje bij een snackbar (bijbaan), Knal & Kolder (tuning) |

**Openingsdialoog (Bornholmstraat):** TESSA: "Jelle koopt het vet van heel Grunn. Zonder vet geen oefenronde, en zonder oefenronde geen Snackprijs. Dit is plakje twee, Tammo." [NIEUW]; TESSA: "Plakje één kregen we niet terug. Dit plakje kunnen we nog winnen." [NIEUW]; TESSA: "Banden stuk, tankwagen pakken, naar de Oosterpoort." [BEHOUDEN]; TAMMO: "En de Krolbrug?" [BEHOUDEN]

**Sleutelscène (onderweg):** JELLE (telefoon): "Goedemorgen, mevrouw. Wij hebben de Europaweg gehuurd voor een evenement. Vanaf nu is de weg dicht. Dat is geen oorlog, dat is een vergunning." Tessa: "Hard remmen kantelt een tankwagen. De vloeistof klotst naar voren en het zwaartepunt schuift mee." [NIEUW]. Outro: Snackbarhouder: "Vet! Valt mie nait of!" Tammo: "Dit is het eerste wat ik ooit heb gedaan waar mensen voor klapten." (BEHOUDEN.)

> **Te beoordelen.** A) De tankwagen blijft in Stad (voorstel). B) De tankwagen komt uit een Hogeland-dorp en rijdt naar Stad. C) De snackbarhouder wordt een terugkerend gezicht.

---

## 2.2 · Fatbikes tellen niet als fiets (M08; H12) en Oma's lijstje

| | |
|---|---|
| **Id** | `A2-2` (`H12`, mission `fatbike`) |
| **Functie** | **4 · de Fjord Frituur en het recept gereedmaken** (Oma's recept en het lijstje met vijf vrienden) |
| **Plaats** | Oude Ebbingestraat naar de Noorderhaven (Stad); Oma's kamer; di 18, middag |
| **Voertuig** | te voet |
| **Mechaniek / hergebruik** | `fatbike`-stage (stroom fatbikes over de stoep, `LANE_SPAWN_EVERY`); bestaande def |
| **Doel (hardop)** | "Loop heelhuids door de fatbikes naar Oma Trijntje, dan vertelt ze iets over die bal." |
| **Motief** | de politie zoekt jullie; Oma Trijntje is veilig, en ze weet iets over de bal en over Gerda Terpstra |
| **Verloop** | 1) Oma belt Tammo (en belde eerder Nachtstreek over fatbikes: wereld): "Ik heb iets over die bal." 2) Lopen door een stroom fatbikes; elke aanraking kost je een tel. 3) Aankomst bij Oma, krentjebrij. 4) Scène: 1953, Gerda, het recept met vijf vrienden. **Falen:** te vaak geraakt: "Sikkom." |
| **Reizen** | 3 km; skip: scooter |
| **Romantiek (4/10)** | Tessa vraagt Tammo naar zijn opa; Oma: "Niet tegen haar" over wat Tammo moet zeggen |
| **Plot** | 1953; Gerda's eierbal was beter; het recept van 1953 had vijf dingen van vijf vrienden (Geesje, Klaas, Lammert, Roelfien, Wubbo); Oma weet "waar hij was" en laat zich niet kennen: "Jelle zegt veel." |
| **Gevolg / haak** | Oma stuurt hen naar Geesje in Warffum |
| **Behouden / nieuw** | intro, 1953-scène BEHOUDEN, lijstje en recept NIEUW |

**Sleutelscène (Oma's kamer):** OMA TRIJNTJE: "Eet je krentjebrij." TAMMO: "Ik ben vierendertig, oma." (BEHOUDEN, niet aangeraakt.) OMA: "1953. Dat ik won, weet je. Wat je niet weet: tweede werd een Fries meisje. Gerda Terpstra. Haar eierbal was beter." [NIEUW] TESSA: "Terpstra? Van Jelle?" OMA: "Haar zoon, zeker. Ik heb het nooit gezegd. Zeventig jaar trots." (BEHOUDEN.) TAMMO: "Jelle zegt: bij hem." OMA: "Jelle zegt veel." [NIEUW] Tessa: "We halen de ingrediënten voor Oma's recept bij haar vrienden. Dan kunnen we meedoen, ook als Jelle de voorraad van iedereen opkoopt." [NIEUW]

> **Te beoordelen.** A) Oma geeft het lijstje hier (voorstel). B) Het lijstje komt in stukjes. C) Oma zegt hardop dat Gerda haar vriendin is (raad ik af).

---

## Reisbeat: de trein naar Winsum (T1)

**Wat:** station Grunn naar Winsum, treinrit (`stationtravel.js`, meerrijden, overslaanbaar). **Reiskeuze:** trein (2 min met scène, 3 euro), zelf rijden met de Escapade (10 min, autogesprekken), of skippen (montage, gratis). **Scène (de oude `r-trein`-scène, hergebruikt):** Tessa: "Een kaartje naar maakt niet uit waar. Jij kijkt te schuldig voor een conducteur." (BEHOUDEN, plus vier BEHOUDEN regels over de zee achter de dijk.)

---

## 2.3 · Heel aankomen is ook een kunst (M09; Hogeland)

| | |
|---|---|
| **Id** | `A2-3` (mechaniek van `H7`, nieuwe inhoud, step `n-eieren`) |
| **Functie** | **2 · plakje drie (eieren) blokkeren** |
| **Plaats** | Warffum (Geesjes pastorie) naar de wierdekerk in Usquert, over wierdepaden, wo 19, ochtend |
| **Voertuig** | Geesjes neefs trekker |
| **Mechaniek / hergebruik** | `deliver` met breekbare lading (zoals H7 en `TRACTOR_MODEL`); schadeboete telt eieren (AANNAME: HUD-teller, zestig eieren) |
| **Doel (hardop)** | "Breng Geesjes laatste zes kratten, zestig eieren, heel naar de kerkkelder in Usquert: Oma's recept heeft er zestig nodig." |
| **Motief** | Jelle heeft alle eieren van het Hogeland opgekocht (plakje 3); Geesjes kippen zijn de laatste die nog van niemand zijn |
| **Verloop** | 1) Kennismaking met Geesje (naamkaart). 2) Kratten laden. 3) **Jelle sluit de Dorpsweg af** en huurt de boer die dwars staat: de enige weg is de wierdepaden vol gaten (waarom traag: zestig eieren). 4) Bulten, een schaapsbarrière. 5) Kerkkelder in Usquert. **Falen:** meer dan de helft van de eieren stuk: "Sikkom." en laad opnieuw. |
| **Jelle grijpt in** | **sluit de Dorpsweg en huurt de boer** (eierkoek-contract): omleiding over de slechtste paden |
| **Reizen** | Winsum naar Warffum 12 km: 8 min; skip: Geesjes neef brengt je |
| **Romantiek (4/10)** | Tessa laat Tammo koeien zien; hij schrikt van een koe; zij legt uit wat een wierde is. Hij: "Alweer gelijk." |
| **Plot** | Geesje weet dat Gerda in Ljouwert woonde en haar elk jaar op Trijntjes verjaardag belt |
| **Gevolg / haak** | Durk en Douwe komen te laat met een klomp geld. "…Hè." Ze krijgen een eierkoek mee. |
| **Behouden / nieuw** | alles NIEUW behalve "…Hè." |

**Openingsdialoog (pastorie):** GEESJE: "Ik ben Geesje, kosteres van de wierdekerk in Usquert. Trijntje belde." TESSA: "Oma Trijntje stuurt ons voor de eieren. Het recept van 1953 heeft er zestig nodig." TESSA: "Heel, Tammo. Niet rap. Heel." TAMMO: "Ik rij nooit rap." TESSA: "Je hebt twee keer een kar gekanteld." TAMMO: "Eén keer." (allemaal NIEUW.)

> **Te beoordelen.** A) Trekker, eieren, wierdepaden (voorstel). B) Een gewone bestelbus. C) Eieren met de fiets.

---

## 2.4 · Een trekker-limo op de wierde (M10; nieuw)

| | |
|---|---|
| **Id** | `A2-4` (nieuw, step `n-wierde`) |
| **Functie** | **3 · de waarheid over de bal ontdekken**: Jelle heeft hem echt, in een gouden koffer |
| **Plaats** | Warffum, Usquert, Uithuizen: wierdepaden, kerkenpad, de dijk, wo 19, middag |
| **Voertuig** | quad (Geesjes neef, `QUAD_MODEL`) |
| **Mechaniek / hergebruik** | `escape`-stage met `trekkerlimo` als achtervolger; Jelles polsstokvlucht gebruikt `fierljep.js` voor de animatie (cutscène, geen minigame) |
| **Doel (hardop)** | "Als Jelle de koffer loslaat, pakken wij hem: schud de limo af en haal de sloot bij Uithuizen." |
| **Motief** | Jelle wil af van de enige twee mensen die hem in het museum zagen (beelden van zijn bewaker); hij biedt een overeenkomst: verlaat Grunn en de Snackprijs, dan verdwijnen de beelden |
| **Verloop** | 1) Jelles limo rijdt het erf op; kil: "Ik ben hier niet voor de eieren. Ik ben hier voor u." 2) De bal zit in de koffer in zijn hand. 3) Quad over wierdepaden en door de kerktuin. 4) Aan de sloot: Jelle springt met de polsstok, valt erin, houdt de koffer boven water; Durk en Douwe pakken hem aan. **Falen:** limo haalt je in: "Sikkom.", respawn bij Geesje. |
| **Jelle grijpt in** | **hinderlaag met chantage** (de museumbeelden) en de limo-achtervolging |
| **Reizen** | Usquert naar Uithuizen 6 km: 4 min (de missie zelf) |
| **Romantiek (3/10)** | Tessa stuurt, Tammo houdt zich vast: "Houd je vast." "Ik heb stuur." |
| **Plot** | **Jelles motief wordt hardop, en de softe kant komt boven (Tessa: "Hij is niet dom. Hij wil dat we hem onderschatten."):** Mem is eenennegentig, zeventig jaar tweede. Jelle: "Mem wil niks. Daarom doe ik het." Tessa: "Hij heeft hem echt." |
| **Gevolg / haak** | Jelle valt in de sloot ("Oant sjen!"; Douwe: "…Plons.", eerste van drie keer). Appje: "Is mijn jongen droog? Zeg niks tegen jouw jongen. – M." (stil) |
| **Behouden / nieuw** | NIEUW (één BEHOUDEN: "Oant sjen!") |

**Openingsdialoog (Geesjes erf):** JELLE: "Goedemiddag. Jelle Terpstra, Us Mem Snacks. Ik ben hier niet voor de eieren. Ik ben hier voor u." JELLE: "U bent in het museum geweest. Mijn bewaker heeft beelden. Ik stel een overeenkomst voor: u verlaat Grunn en de Snackprijs, en de beelden verdwijnen." TESSA: "En de bal?" JELLE: "Die is hier. In deze koffer. Mijn juristen willen dat ik hem bij me draag." TAMMO: "Je hebt hem dus echt." (NIEUW.)

**Sleutelscène (aan de sloot):** JELLE: "Mem is eenennegentig. Zeventig jaar heeft ze tweede gestaan, Grinzers. Ik laat haar niet nog een jaar tweede staan." TESSA: "Wil je mem dat wel?" JELLE: "Mem wil niks. Daarom doe ik het." JELLE: "Oant sjen!" (BEHOUDEN.) DOUWE: "…Plons." [NIEUW]

> **Te beoordelen.** A) Jelle zelf in de limo, hij valt in de sloot (voorstel). B) Durk en Douwe sturen. C) Alleen de politie als achtervolger.

---

## Reisbeat: de streekbus naar Zoutkamp (T2)

**Wat:** bushalte Uithuizen naar Zoutkamp (30 km), streekbus; de speler kiest meerijden (2 min in beeld, geen kosten), zelf besturen (`sidejob_bus.js`) of skippen. **Scène bij het instappen (kort):** Buschauffeur: "Zoutkamp? Dat is de laatste halte. Daarna is er alleen nog water." Tammo: "Dat klinkt als thuis." (NIEUW.)

---

## 2.5 · Geleend van de Friezen en laag water (M11; kust, was H14 en M13)

| | |
|---|---|
| **Id** | `A2-5` (`H14`, mission `skutsje`, uitgebreid met het zout van `n-laagwater`) |
| **Functie** | **2 · plakje vier (zout) blokkeren** (het skûtsje is de afleiding, het zout het doel) |
| **Plaats** | Zoutkamp, het Reitdiep, monding Lauwersmeer, een zandplaat en de kwelder bij Noordpolderzijl, do 20, middag tot nacht; de Waddenzee ligt zichtbaar ernaast |
| **Voertuig** | rubberboot (`BOAT_KINDS.rubberboot`) tot de zandplaat, daarna te voet langs de kwelder (de open zee is niet bevaarbaar: Klaas stopt bij de sluis en bij de zandplaat) |
| **Mechaniek / hergebruik** | `boatchase`-stage (skûtsje met zeil, `animateSkutsjeRig`, `heistBoat`), daarna `waterlevels.js` `shallowWater`, te voet met een oplopende waterlijn (AANNAME: kleine timer), **sluipen langs een kustwachtboot met zoeklicht** (bestaande bewakers-AI van `heist.js` met een zoeklichtkegel, AANNAME) |
| **Doel (hardop)** | "Haal Jelles skûtsje in en spring aan boord; haal daarna het wadzout van de kwelder, blijf uit het licht van de kustwacht en wees terug bij de boot voor het water komt." |
| **Motief** | de bal zou op het skûtsje liggen (havenkantoor), dat is een val; het zout van Oma's eierbal ligt bij Noordpolderzijl en Jelle kocht de zoutstekers |
| **Verloop** | 1) Klaas geeft de boot ("Tot de sluis. Daarna is het open water en ben je voor eigen rekening."). 2) Het skûtsje vaart weg; achterhalen en aan boord springen. 3) Kist: een chocoladebal met "Foar mem" (de oefenbal); Jelle belt: "De echte is bij mij." 4) Terug via het wad bij laagwater: vast op de zandplaat, een uur wachten onder de sterren (**de lange blik**). 5) Naar de kwelder, drie zoutkuipen, een kustwachtboot zoekt "twee mensen in zwarte kleding, waarschijnlijk een zeehond". 6) Terug voor de vloed. **Falen:** skûtsje ontsnapt, boot kapseist, in het licht gezien of water te hoog: "Sikkom." |
| **Leuk-element / uitdaging** | snelle boot tegen het wiegende zeil; het aanboord springen is de apotheose; dan geen race maar stilte en sluipen |
| **Reizen** | Zoutkamp-Lauwersoog 9 km: 5 min; Lauwersoog-Noordpolderzijl 14 km: 3 min boot + 5 min te voet |
| **Romantiek (5/10 en 7/10)** | "Iedereen is romantischer dan jij." op het skûtsje; dan **de lange blik:** op de zandplaat, sterrenhemel, ze kijken elkaar te lang aan, dan trilt haar telefoon: "Niks. Iemand uit Friesland." Tammo kijkt weg. |
| **Plot** | het is een oefenbal; Jelle oefent hoe hij hem aan zijn moeder geeft; plakje vier valt; Klaas: "Dat is Lammerts haven." |
| **Gevolg / haak** | Jelle op de radio, na afloop (wereld): "Ik ga naar de haven. De Eemshaven is van mij." Dijkstra belt: "Ik heb een heli. Ik haal jullie op." |
| **Behouden / nieuw** | het skûtsje-gedeelte en de lange blik grotendeels BEHOUDEN; Klaas, het zout, de kustwacht NIEUW |

**Openingsdialoog (Zoutkamp):** KLAAS: "Ik ben Klaas. Ik viste dertig jaar fietsen uit de Diepenring, nu viss ik ze uit het Reitdiep. Oma Trijntje belde." [NIEUW]; KLAAS: "Hier. Een snelle boot. Ik zit bovenin, ik kijk de andere kant op. Tot de sluis. Daarna is het open water en ben je voor eigen rekening." [NIEUW]; TAMMO: "Springen. Van een boot. Op een andere boot." [BEHOUDEN]; TESSA: "Jij stuurt, ik zeg wanneer." [BEHOUDEN]

**Sleutelscène (aan boord, en later op de kwelder):** TAMMO: "Chocola. We hebben een boot gekaapt voor chocola." TESSA: "Een oefenbal. Hij oefent hoe hij hem aan zijn moeder geeft." (BEHOUDEN.) Kustwachter: "Melding van twee mensen in zwarte kleding op het wad. Waarschijnlijk een zeehond." Tammo: "Ik ben geen zeehond." [NIEUW]

> **Te beoordelen.** A) Rubberboot achter het skûtsje, daarna het wad (voorstel, de samenvoeging). B) De rondvaartboot van H13. C) Alleen een scène zonder boot.
