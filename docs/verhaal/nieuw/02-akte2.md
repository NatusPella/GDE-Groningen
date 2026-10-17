# Akte 2: "Het Noorden is groot" (Stad, Hogeland, Waddenzee; di 18 – do 20 augustus)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte2.md](09-script-akte2.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel.

## Intro van de akte

| | |
|---|---|
| **Regio** | Stad (begin), Hogeland (Winsum, Warffum, Usquert), Waddenzee (Zoutkamp, Lauwersmeer, kwelder) |
| **Sfeer** | de dag na de kraak: Grunn zoekt twee mensen in het zwart; buiten Stad is het zonnig, wijd en stil; wierden, kerken, de dijk, het wad bij laagwater; Noorderzon opent do 20 in Stad (op de radio) |
| **Tijd** | ca. 55-60 minuten (6 missies + 2 reisbeats) |
| **Dagen** | di 18 (2.1, 2.2, trein), wo 19 (2.3, 2.4), do 20 (bus, 2.5, 2.6 's nachts) |
| **Wat de speler leert** | de provincie is groot; reizen is een keuze (trein, bus); trekker, quad, snelle boot, ondiep water; de plakjes van Jelle zichtbaar maken |
| **Plot** | Jelle koopt het vet (Stad), de eieren (Hogeland) en het zout (Wad). Oma Trijntje geeft een lijstje met vijf oude vrienden, één per regio; elke vriend heeft een ingrediënt van de eerste echte eierbal van 1953. Jelle denkt dat Tammo en Tessa de bal hebben (ze waren in het museum); zij denken dat hij hem heeft (zijn radiobericht). Beide kanten bluffen |
| **Romantiek** | Tessa laat Tammo het Hogeland zien (koeien, wierden, de zee achter de dijk); Tammo leert Tessa niks nieuws maar is trots als hij iets weet (de weg in het donker). **De lange blik** onder de sterren op het wad (2.6) wordt onderbroken door een appje: "Iemand uit Friesland." |
| **Haak naar akte 3** | Klaas, op de radio: Jelle gaat naar het oosten. De haven in de Eemsdelta is slice vijf. En Dokter Dijkstra heeft een heli klaarstaan. |

**Het plakjesbord (nieuw, "Wat weten we?"):** zes plakjes van Jelles plan. In deze akte worden plakje 1 (standplaatsen, 1.4), 2 (vet), 3 (eieren) en 4 (zout) zichtbaar; elk wordt "teruggewonnen" of "verloren" in beeld (AANNAME: nieuwe lijst in het pauzemenu, `todoui.js`/`verhaalui.js`).

**Reisplan akte 2** (afstanden geschat, AANNAME; meten met de reisplanner van #97):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Oosterpoort (einde 2.1) | Noorderhaven (2.2) | 3 | 3 min | skip met scooter |
| Noorderhaven | Station Grunn | 2,5 | 3 min | te voet 5 min |
| Station Grunn | Winsum (trein) | 17 | 12 min | treinrit met scène, 2 min in beeld; of auto 10 min |
| Winsum | Warffum (Geesje) | 12 | 8 min | Geesjes neef brengt je (skip, scène) |
| Warffum | Usquert (2.3 doel) | 3 | tractor 5 min | geen |
| Usquert | Uithuizen (bushalte) | 6 | quad 4 min (2.4) | geen |
| Uithuizen | Zoutkamp | 30 | 20 min | streekbus (ride-along, 2 min in beeld; of zelf rijden) |
| Zoutkamp | Lauwersoog (2.5) | 9 | boot 5 min | geen |
| Lauwersoog | Noordpolderzijl (2.6) | 14 | boot en wad, 8 min | Klaas' kotter, skip |

---

## 2.1 · Al het vet van Grunn (H8)

| | |
|---|---|
| **Id** | `A2-1` (`H8`, mission `vetgekaapt`) |
| **Plaats** | Bornholmstraat naar de Oosterpoort (Stad) |
| **Voertuig** | tankwagen "Us Mem Vet" (gekaapt) |
| **Mechaniek / hergebruik** | `chase`-stage in `missions.js` (hits 70, `flee`, `cruise 15.5`); bestaande def, geen nieuwe code |
| **Doel (hardop)** | "Kap de tankwagen met het vet en breng het naar de snackbars in de Oosterpoort, voor de pannen koud zijn." |
| **Motief** | de snackbarhouder in de Oosterpoort is veertig jaar open en zijn pannen zijn leeg; Jelle koopt het vet (plakje 2) |
| **Wat de speler weet** | Jelle koopt de standplaatsen (1.4); Sjabbe: de reuzen kopen alles voor frituren |
| **Verloop** | 1) Rikus belt de snackbarhouder in (radio). 2) Bij de tankwagen: banden stuk. 3) Achtervolgen, kapen. 4) Terug naar de Oosterpoort zonder de lading te verliezen. **Falen:** wagen verloren of tijd: "Sikkom." |
| **Leuk-element / uitdaging** | eerste echte kaping: de lading en de wagen zijn groter dan de auto |
| **Reizen** | Flat naar Bornholmstraat 4,5 km: 4 min |
| **Romantiek (3/10)** | Tessa's telefoon trilt: "Pas op dysels, famke. – M." Tammo ziet het: "Wie appt jou nou steeds?" "Niks. Iemand uit Friesland." "Is hij lang?" "Fierljepper zeker." |
| **Plot** | eerste overwinning op een plakje; Jelle belt in: "Dat vet was van mij. No ja. Ik heb meer." |
| **Gevolg / haak** | Rikus: Oma Trijntje belt. Ze zegt dat jullie heelhuids moeten komen. |
| **Behouden / nieuw** | intro en outro BEHOUDEN; autogesprek BEHOUDEN; een nieuwe opening met het doel |
| **Nieuwe regels (schatting)** | 10 |
| **Zij-activiteiten** | vetbaantje bij een snackbar (bijbaan), Knal & Kolder (tuning) |

**Openingsdialoog (Europaweg, 9 regels):**

- **SNACKBARHOUDER (radio):** Rikus. Mijn pannen zijn leeg. Ik ben veertig jaar open en mijn pannen zijn leeg. [BEHOUDEN]
- **RIKUS (radio):** Dit is erger dan de fietstunnel. [BEHOUDEN]
- **TESSA:** Jelle koopt het vet van heel Grunn. Dat is plakje twee, Tammo. [NIEUW]
- **TAMMO:** Wat is plakje een? [NIEUW]
- **TESSA:** De standplaatsen. Ik heb het net op een briefje gezet. [NIEUW]
- **TESSA:** Banden stuk, tankwagen pakken, naar de Oosterpoort. [BEHOUDEN]
- **TAMMO:** En de Krolbrug? [BEHOUDEN]
- **RIKUS (radio):** Storingsbericht: de Krolbrug is in storing. [BEHOUDEN]
- **TESSA:** Zie je. Daar kun je op rekenen. [BEHOUDEN]

**Sleutelscène (outro Oosterpoort):** de snackbarhouder: "Vet! Valt mie nait of!" (BEHOUDEN). Tessa: "Trede drie, Tammo." Tammo: "Dit is het eerste wat ik ooit heb gedaan waar mensen voor klapten." (BEHOUDEN.) Jelle op de radio: "Rikus. Dat vet was van mij. No ja. Ik heb meer." (BEHOUDEN.)

> **Te beoordelen.** A) De tankwagen blijft in Stad (voorstel, geen nieuwe code, past bij het Stad-deel van akte 2). B) De tankwagen komt uit een Hogeland-dorp (zie FLOW-ANALYSE) en rijdt naar Stad: meer provincie, maar akte 2 begint dan met een lange rit. C) De snackbarhouder wordt een terugkerend gezicht in de Oosterpoort (kleine bijrol).

---

## 2.2 · Fatbikes tellen niet als fiets (H12) en Oma's lijstje

| | |
|---|---|
| **Id** | `A2-2` (`H12`, mission `fatbike`) |
| **Plaats** | Oude Ebbingestraat naar de Noorderhaven (Stad); Oma's kamer |
| **Voertuig** | te voet |
| **Mechaniek / hergebruik** | `fatbike`-stage (stroom fatbikes over de stoep, `LANE_SPAWN_EVERY`); bestaande def, plaats al verplaatst uit de Folkingestraat |
| **Doel (hardop)** | "Loop heelhuids door de fatbikes naar Oma Trijntje, dan vertelt ze iets over die bal." |
| **Motief** | de politie zoekt jullie; Oma Trijntje is veilig, en ze weet iets over de bal en over Gerda Terpstra |
| **Wat de speler weet** | Jelle koopt het vet; 1953 zit in de buurt |
| **Verloop** | 1) Oma belt via Rikus. 2) Lopen door een stroom fatbikes; elke aanraking kost je een tel. 3) Aankomst bij Oma, krentjebrij. 4) Scène: 1953, Gerda, het lijstje. **Falen:** te vaak geraakt: "Sikkom." |
| **Leuk-element / uitdaging** | tegenstelling met 2.1: geen auto, geen wagen, alleen voeten en reflexen |
| **Reizen** | 3 km; skip: scooter (de e-step uit 1.5 is nog steeds beschikbaar) |
| **Romantiek (4/10)** | Tessa vraagt Tammo naar zijn opa; hij vertelt de rest; Oma: "Niet tegen haar" over wat Tammo moet zeggen |
| **Plot** | 1953; Gerda's eierbal was beter; het lijstje van vijf namen (Geesje, Klaas, Lammert, Roelfien, Wubbo); Oma kent het plan van Jelle |
| **Gevolg / haak** | Tessa: "We moeten de vrienden van Oma bereiken voor Jelle ze koopt." Tammo: "Zijn er bakkers in het Hogeland?" Oma: "Een kosteres. Ga maar." |
| **Behouden / nieuw** | intro, 1953-scène BEHOUDEN, lijstje en recept NIEUW |
| **Nieuwe regels (schatting)** | 16 |

**Openingsdialoog (Oma belt, 8 regels):**

- **OMA TRIJNTJE (radio):** Rikus. Trijntje. Die fatbikes rijden over de stoep alsof Stad van hen is. Stuur die twee. [BEHOUDEN]
- **RIKUS (radio):** Welke twee, Trijntje? [BEHOUDEN]
- **OMA TRIJNTJE (radio):** De twee die het niet zeggen. Je weet best wie. [BEHOUDEN]
- **TESSA:** We lopen naar Oma Trijntje, aan de Noorderhaven. Dat is ver genoeg dat de politie ons niet zoekt. [NIEUW]
- **TAMMO:** Fatbikes tellen niet als fiets, oma. [BEHOUDEN]
- **OMA TRIJNTJE:** Loop jij daar heelhuids doorheen, jong, dan vertel ik je iets over die bal. [BEHOUDEN]
- **OMA TRIJNTJE:** Zeg dat maar tegen hen. Lopen, jong. [BEHOUDEN]

**Sleutelscène (Oma's kamer):**

- **OMA TRIJNTJE:** Eet je krentjebrij. [BEHOUDEN]
- **TAMMO:** Ik ben vierendertig, oma. [BEHOUDEN]
- **OMA TRIJNTJE:** Dan eet je hem al vierendertig jaar te weinig. [BEHOUDEN]
- **OMA TRIJNTJE:** 1953. Dat ik won, weet je. Wat je niet weet: tweede werd een Fries meisje. Gerda Terpstra. Haar eierbal was beter. Ik wist het, zij wist het. De jury wist het niet. [NIEUW]
- **TESSA:** Terpstra? Van Jelle? [BEHOUDEN]
- **OMA TRIJNTJE:** Haar zoon, zeker. Ik heb het nooit gezegd. Zeventig jaar trots. Dat is lang voor iets wat in één zin past. [BEHOUDEN]
- **OMA TRIJNTJE:** Jelle koopt alles wat een eierbal nodig heeft: vet, eieren, zout, bloem, mosterd. Voor elk een vriend van mij. Hier is het lijstje. [NIEUW]
- **TESSA:** Weet u waar de bal is, oma? [NIEUW]
- **OMA TRIJNTJE:** Ik weet waar hij niet is. In een vitrine. [NIEUW]
- **TAMMO:** Dat weten wij ook. [NIEUW]
- **OMA TRIJNTJE:** Die bal is gien geld, jong. Die bal is Grunn. En jij: één zin, hè. Niet zeventig jaar. [BEHOUDEN]
- **TAMMO:** Ik zeg wel wat. [BEHOUDEN]
- **OMA TRIJNTJE:** Niet tegen haar. [BEHOUDEN]

> **Te beoordelen.** A) Oma geeft het lijstje met vijf namen hier (voorstel). B) Het lijstje komt in stukjes: één naam per regio, via Rikus. C) Oma zegt hardop dat Gerda haar vriendin is (verklapt het W-raadsel te vroeg; ik raad af).

---

## Reisbeat: de trein naar Winsum

**Wat:** station Grunn naar Winsum, treinrit (`stationtravel.js`, meerrijden, overslaanbaar). **Reiskeuze:** trein (2 min met scène, 3 euro), zelf rijden met de Escapade (10 min, autogesprekken), of skippen (montage, gratis). **Scène (de oude `r-trein`-scène, hergebruikt):**

- **TESSA:** Een kaartje naar maakt niet uit waar. Jij kijkt te schuldig voor een conducteur. [BEHOUDEN]
- **TESSA:** Weet je nog? Met de trein naar Delfzijl, om naar de zee te kijken. [BEHOUDEN]
- **TAMMO:** Er was geen zee. Alleen een dijk. [BEHOUDEN]
- **TESSA:** Jij zei dat de zee achter de dijk lag. Ik heb het twintig jaar geloofd. [BEHOUDEN]
- **TAMMO:** Hij ligt er ook. Een beetje. [BEHOUDEN]
- **TESSA:** We stappen uit in Winsum. Daar woont Geesje, de kosteres van Oma's lijstje. [NIEUW]
- **TAMMO:** Winsum. Is dat nog Grunn? [NIEUW]
- **TESSA:** Dat is het Hogeland, Tammo. Dat is groter dan je denkt. [NIEUW]

---

## 2.3 · Heel aankomen is ook een kunst (Hogeland)

| | |
|---|---|
| **Id** | `A2-3` (mechaniek van `H7`, nieuwe inhoud, step `n-eieren`) |
| **Plaats** | Warffum (Geesjes pastorie) naar de wierdekerk in Usquert, over wierdepaden |
| **Voertuig** | Geesjes neefs trekker |
| **Mechaniek / hergebruik** | `deliver` met breekbare lading (zoals H7 en `TRACTOR_MODEL` uit `vehicle.js`); schadeboete telt eieren (AANNAME: het aantal eieren als HUD-teller) |
| **Doel (hardop)** | "Breng Geesjes laatste kratten eieren heel naar de kerkkelder in Usquert, voor Durk en Douwe ze komen kopen." |
| **Motief** | Jelle heeft alle eieren van het Hogeland opgekocht (plakje 3); Geesjes kippen zijn de laatste die nog van niemand zijn |
| **Wat de speler weet** | het lijstje; de eerste naam is Geesje, 84, kosteres en schoolvriendin van Oma |
| **Verloop** | 1) Kennismaking met Geesje (naamkaart). 2) Kratten laden. 3) Wierdepaden: bulten, een schaapsbarrière, een boer die niet wil wijken. 4) Kerkkelder in Usquert. **Falen:** meer dan de helft van de eieren stuk: "Sikkom." en laad opnieuw. |
| **Leuk-element / uitdaging** | traag rijden is nu moeilijker dan snel rijden; het landschap mag je kijken |
| **Reizen** | Winsum naar Warffum 12 km: 8 min; skip: Geesjes neef brengt je |
| **Romantiek (4/10)** | Tessa laat Tammo koeien zien; hij schrikt van een koe; zij lacht en legt uit wat een wierde is. Hij: "Alweer gelijk." |
| **Plot** | Geesje weet iets over Jelles moeder: "Gerda woonde in Ljouwert. Ze belt me nog elk jaar op Trijntjes verjaardag." |
| **Gevolg / haak** | Durk en Douwe komen te laat met een klomp geld. "…Hè." Ze krijgen een eierkoek mee. |
| **Behouden / nieuw** | alles NIEUW behalve "Heel!" (Femke is geschrapt) |
| **Nieuwe regels (schatting)** | 26 |

**Openingsdialoog (pastorie, 10 regels):**

- **GEESJE:** Ik ben Geesje, kosteres van de wierdekerk in Usquert. Trijntje belde. [NIEUW]
- **TESSA:** Oma Trijntje stuurt ons voor de eieren. [NIEUW]
- **GEESJE:** Jelle Terpstra heeft alle eieren van het Hogeland gekocht, behalve de mijne. Mijn kippen hebben geen contract. [NIEUW]
- **TAMMO:** Wat doen we ermee? [NIEUW]
- **GEESJE:** Jullie brengen ze heel naar de kerkkelder. Daar is het koel, en daar komt Jelle niet. [NIEUW]
- **TESSA:** Heel, Tammo. Niet rap. Heel. [NIEUW]
- **TAMMO:** Ik rij nooit rap. [NIEUW]
- **TESSA:** Je hebt twee keer een kar gekanteld. [NIEUW]
- **TAMMO:** Dat bedoelde ik ook. [BEHOUDEN]
- **GEESJE:** De trekker staat bij de schuur. Hij trekt hard. [NIEUW]

**Sleutelscène (onderweg, koeien):**

- **TAMMO:** Die koe kijkt naar me. [NIEUW]
- **TESSA:** Koeien kijken altijd. Dat is hun hobby. [NIEUW]
- **TAMMO:** In Grunn kijkt niemand zo lang. [NIEUW]
- **TESSA:** In Grunn kijkt niemand omhoog. Dit is een wierde, Tammo. Mensen bouwden hem zelf, tegen het water. [NIEUW]
- **TAMMO:** Dat wist ik. [NIEUW]
- **TESSA:** Dat wist je niet. [NIEUW]
- **TAMMO:** Alweer gelijk. [NIEUW]

> **Te beoordelen.** A) Trekker, eieren, wierdepaden (voorstel; de H7-mechaniek met een lokale smaak). B) Een gewone bestelbus (sneller, minder grappig). C) Eieren met de fiets (te traag, wel Stads).

---

## 2.4 · Een trekker-limo op de wierde (nieuw)

| | |
|---|---|
| **Id** | `A2-4` (nieuw, step `n-wierde`) |
| **Plaats** | Warffum, Usquert, Uithuizen: wierdepaden, kerkenpad, de dijk |
| **Voertuig** | quad (Geesjes neef, `QUAD_MODEL`) |
| **Mechaniek / hergebruik** | `escape`-stage (zoals in H2) met `trekkerlimo` als achtervolger; Jelles polsstokvlucht gebruikt `fierljep.js` voor de animatie (cutscène, geen minigame) |
| **Doel (hardop)** | "Schud Jelles trekker-limo af en haal de bushalte in Uithuizen vóór vijf uur." |
| **Motief** | Jelle denkt dat Tammo en Tessa de bal hebben; hij volgt hen over het Hogeland |
| **Wat de speler weet** | Jelle claimt de bal op de radio; zijn limo zit hen op de hielen |
| **Verloop** | 1) Jelles limo rijdt het erf op. 2) Quad over wierdepaden en door de kerktuin. 3) Door een sloot (Jelle probeert te springen: plons). 4) Bushalte. **Falen:** limo haalt je in (Jelle belt: "Gotcha"): "Sikkom.", respawn bij Geesje. |
| **Leuk-element / uitdaging** | de eerste echte offroad-achtervolging; de limo is breed en traag in bochten |
| **Reizen** | Usquert naar Uithuizen 6 km: 4 min (de missie zelf) |
| **Romantiek (3/10)** | Tessa stuurt, Tammo houdt zich vast; hij zegt "Voor de grip" en zij zegt "Ik heb stuur" |
| **Plot** | **Jelles motief wordt hardop:** Mem is eenennegentig, zeventig jaar tweede. Jelle: "Geef hem terug, famke." Tessa: "Wij hebben hem niet." Jelle: "Ik ook niet… Ik bedoel: ik zeg niks." Beide kanten bluffen. |
| **Gevolg / haak** | Jelle valt in de sloot ("Oant sjen!"). Tessa: "Hij heeft hem niet." Tammo: "Of hij is dom." Tessa: "Hij is niet dom, hij is Fries." Appje: "Hij is veilig. Zeg niks tegen je jongen. – M." (stil, alleen tekst) |
| **Behouden / nieuw** | NIEUW (twee BEHOUDEN: "Oant sjen!" en "Plons.") |
| **Nieuwe regels (schatting)** | 22 |

**Openingsdialoog (Geesjes erf, 8 regels):**

- **JELLE:** Moai, Grinzers. Wat een mooi dorp. Ik ben hier voor de eieren. [NIEUW]
- **TESSA:** Dat zijn de eieren van Geesje, Jelle. Die zijn niet te koop. [NIEUW]
- **JELLE:** Alles is te koop, famke. Behalve de bal. Die heb ik al. [NIEUW]
- **TAMMO:** Dan heb je hem dus. [NIEUW]
- **JELLE:** Ik zeg niks. Wat stond er eigenlijk op dat kaartje? [NIEUW]
- **TESSA:** Tige tank. [NIEUW]
- **JELLE:** Dat dacht ik ook. Durk, Douwe, pak ze. [NIEUW]
- **TESSA:** Op de quad. Nu. [NIEUW]

**Sleutelscène (aan de sloot):**

- **JELLE:** Mem is eenennegentig. Zeventig jaar heeft ze tweede gestaan, Grinzers. [NIEUW]
- **JELLE:** Ik laat haar niet nog een jaar tweede staan. [NIEUW]
- **TESSA:** Wil je mem dat wel? [NIEUW]
- **JELLE:** Mem wil niks. Daarom doe ik het. [NIEUW]
- **JELLE:** Oant sjen! [BEHOUDEN]
- **DOUWE:** …Plons. [NIEUW]

> **Te beoordelen.** A) Jelle zelf achter het stuur van de limo (voorstel; hij valt in de sloot). B) Durk en Douwe achter het stuur, Jelle op de achterbank (twee reuzen op een weg). C) Alleen de politie als achtervolger (geen Jelle, geen motief hier).

---

## Reisbeat: de streekbus naar Zoutkamp

**Wat:** bushalte Uithuizen naar Zoutkamp (30 km), streekbus; de speler kiest meerijden (2 min in beeld, passagiersgesprekjes, geen kosten), zelf besturen (`sidejob_bus.js`, punctualiteit telt voor een bonus) of skippen. **Scène bij het instappen (kort):**

- **BUSCHAUFFEUR:** Zoutkamp? Dat is de laatste halte. Daarna is er alleen nog water. [NIEUW]
- **TAMMO:** Dat klinkt als thuis. [NIEUW]
- **TESSA:** Dat is een compliment, hè. [NIEUW]
- **TAMMO:** Dat bedoelde ik ook. [BEHOUDEN]

---

## 2.5 · Geleend van de Friezen (H14)

| | |
|---|---|
| **Id** | `A2-5` (`H14`, mission `skutsje`) |
| **Plaats** | Zoutkamp naar het Lauwersmeer (Reitdiep) |
| **Voertuig** | rubberboot (speedboat, `BOAT_KINDS.rubberboot`) |
| **Mechaniek / hergebruik** | `boatchase`-stage in `missions.js` (skûtsje met zeil, `animateSkutsjeRig`, `heistBoat`); aanboord springen; bestaande def; water in de tegelwereld nodig bij het Reitdiep (RISICO uit FLOW-ANALYSE) |
| **Doel (hardop)** | "Haal Jelles skûtsje in en spring aan boord: daar ligt de Gouden Eierbal, zegt hij." |
| **Motief** | hij laat zijn trofee zien aan de pers en aan zijn moeder (Zoutkamp-havenfeest, AANNAME) |
| **Wat de speler weet** | Jelle bluft; de bal zou op het skûtsje zijn |
| **Verloop** | 1) Klaas geeft de boot (kennismaking). 2) Het skûtsje vaart weg met de bal in de kist. 3) Achterhalen en aan boord springen. 4) Kist openmaken: een chocoladebal met "Foar mem". **Falen:** skûtsje ontsnapt of je boot kapseist: "Sikkom." |
| **Leuk-element / uitdaging** | snelle boot tegen het wiegende zeil; het aanboord springen is de apotheose |
| **Reizen** | Zoutkamp naar Lauwersoog 9 km: 5 min (de missie zelf) |
| **Romantiek (5/10)** | "Iedereen is romantischer dan jij." "Hij is romantischer dan ik." |
| **Plot** | het is een oefenbal; Jelle oefent hoe hij hem aan zijn moeder geeft. Klaas: "Jongens. Ik heb net twee reuzen uit de haven gevist. Ze zwommen synchroon." |
| **Gevolg / haak** | Jelle op de radio: "Die twee mogen de chocola houden." Klaas: "Het zout van Oma ligt bij Noordpolderzijl. Maar je moet het halen als het water weg is." |
| **Behouden / nieuw** | outro BEHOUDEN; nieuwe opening met Klaas |
| **Nieuwe regels (schatting)** | 14 |

**Openingsdialoog (Zoutkamp, 9 regels):**

- **KAPITEIN KLAAS:** Ik ben Klaas. Ik viste dertig jaar fietsen uit de Diepenring, nu viss ik ze uit het Reitdiep. Oma Trijntje belde. [NIEUW]
- **TESSA:** Jelle heeft een skûtsje met de Gouden Eierbal, zegt hij. Het ligt in Lauwersoog. [NIEUW]
- **KAPITEIN KLAAS:** Hier. Een snelle boot. Ik zit bovenin, ik kijk de andere kant op. [NIEUW]
- **TAMMO:** Springen. Van een boot. Op een andere boot. [BEHOUDEN]
- **TESSA:** Jij stuurt, ik zeg wanneer. [BEHOUDEN]
- **KAPITEIN KLAAS:** Praat tegen je boot, jongens. Dat helpt. [NIEUW]
- **TAMMO:** Hij luistert niet. [NIEUW]
- **KAPITEIN KLAAS:** Hij luistert wel. Alleen niet naar jou. [NIEUW]

**Sleutelscène (aan boord, een kist met een gouden bal):**

- **TAMMO:** Chocola. We hebben een boot gekaapt voor chocola. [BEHOUDEN]
- **TESSA:** Een oefenbal. Hij oefent hoe hij hem aan zijn moeder geeft. [BEHOUDEN]
- **TAMMO:** Hij is romantischer dan ik. [BEHOUDEN]
- **TESSA:** Iedereen is romantischer dan jij. [BEHOUDEN]
- **KAPITEIN KLAAS (telefoon):** Jongens. Ik heb net twee reuzen uit de haven gevist. Ze zwommen synchroon. [BEHOUDEN]

> **Te beoordelen.** A) Rubberboot achter het skûtsje (voorstel). B) De rondvaartboot van H13 met Schipper Wiebe erbij (zwaarder, meer slapstick). C) Alleen een scène zonder boot (goedkoper, minder variatie in voertuigen).

---

## 2.6 · Laag water (nieuw)

| | |
|---|---|
| **Id** | `A2-6` (nieuw, step `n-laagwater`) |
| **Plaats** | Lauwersmeer en de kwelder bij Noordpolderzijl, avond en nacht (do 20) |
| **Voertuig** | Klaas' sloep (`sloep`) en te voet over het wad |
| **Mechaniek / hergebruik** | boot door ondiep water (`waterlevels.js` `shallowWater`), te voet met een oplopende waterlijn (AANNAME: nieuwe kleine timer op bestaande wandelmechaniek); geen nieuw voertuig |
| **Doel (hardop)** | "Haal het wadzout van de kwelder en ben terug bij de boot voor het water komt." |
| **Motief** | de vijfde ingrediënt is zout dat nog naar zee smaakt; Jelle kocht de zoutstekers; Klaas kent als enige de vaargeul |
| **Wat de speler weet** | het lijstje; vet en eieren zijn gered |
| **Verloop** | 1) Vaargeul zoeken bij laagwater (te ondiep: je loopt vast). 2) Aangespoeld op een zandplaat: tien minuten wachten op het getij (Klaas: "Wachten is het halve werk."). 3) Te voet naar de kwelder, drie zoutkuipen. 4) Terug voor de vloed. **Falen:** water te hoog: "Sikkom.", Klaas pikt je op, nogmaals. |
| **Leuk-element / uitdaging** | geen race, geen geweld: puur sfeer en tijdsdruk, de rustigste missie van de akte |
| **Reizen** | Lauwersoog naar Noordpolderzijl 14 km: 8 min met de boot (de missie zelf) |
| **Romantiek (7/10)** | **De lange blik:** op de zandplaat, sterrenhemel, ze kijken elkaar te lang aan, dan trilt haar telefoon. "Niks. Iemand uit Friesland." Tammo kijkt weg. |
| **Plot** | het zout is van Jelle verloren; Klaas: "Het donkerste stuk van het land. Hier ziet Jelle ons niet." |
| **Gevolg / haak** | Rikus: Noorderzon opent. Jelle belt in: "Ik ga naar de haven. Plakje vijf." Klaas: "Dat is Lammerts haven." |
| **Behouden / nieuw** | NIEUW (vier regels BEHOUDEN uit de `r-trein`- en `hogedera`-scène) |
| **Nieuwe regels (schatting)** | 22 |

**Openingsdialoog (zandplaat, 8 regels):**

- **KAPITEIN KLAAS:** Wij zitten vast, jongens. Dat is geen ramp. Het water komt over een uur terug. [NIEUW]
- **TESSA:** Een uur. Op een zandbank. [NIEUW]
- **KAPITEIN KLAAS:** Kijk omhoog. Dat is Lauwersmeer. Het donkerste stuk van het land. [NIEUW]
- **TAMMO:** Dat zie ik. [NIEUW]
- **TESSA:** Dat is de Melkweg, Tammo. [NIEUW]
- **TAMMO:** Ik dacht dat dat een vlek was. [NIEUW]
- **TESSA:** Het is een vlek van een miljard sterren. [NIEUW]
- **TAMMO:** …Dat is groter dan een vlek. [NIEUW]

**Sleutelscène (de lange blik):**

- **TAMMO:** Hier zat ik vroeger. Als het thuis te druk was. [BEHOUDEN]
- **TESSA:** Alleen? [BEHOUDEN]
- **TAMMO:** Met een zakje friet. Dat telt. [BEHOUDEN]
- **TESSA:** Je kijkt naar mij, Tammo. De sterren zijn daar. [NIEUW]
- **TAMMO:** Die gaan toch niet onder. [NIEUW]
- *(haar telefoon trilt)*
- **TESSA:** Niks. Iemand uit Friesland. [BEHOUDEN]
- **TAMMO:** Is hij lang? [BEHOUDEN]
- **TESSA:** Tammo. [BEHOUDEN]
- *(APP MEM→TESSA, stil: "Nog acht dagen. Hou Jelle bezig. – M.")*

> **Te beoordelen.** A) Rustige sfeermissie met wad en zout (voorstel, past bij het Waddenzee-gevoel). B) Een actiemissie: een vlucht over het wad bij opkomend water met een heli (spannender, duurder). C) Alleen een scène zonder gameplay (goedkoper, maar de akte verliest haar ademruimte).
