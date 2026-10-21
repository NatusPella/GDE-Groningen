# Akte 1: "Moi, Grunn" (Stad, vr 14 – ma 17 augustus)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels per scène staan in [09-script-akte1.md](09-script-akte1.md); hier staat de opzet per missie met de openingsdialoog en één sleutelscène.

**Tagregels voor dialoog in dit document:** `[BEHOUDEN]` = de regel staat letterlijk in de repo (opname bestaat). `[NIEUW]` = nieuwe of gewijzigde regel (voorlopig alleen tekst, niet opgenomen). Spreker `TESSA` heet in de code `anita` / `A`. **Functie** = de ene taak die een missie in de oorzaak-en-gevolgketen heeft: (1) inschrijving of financiering, (2) een plakje van Jelle blokkeren, (3) de waarheid over de bal ontdekken, (4) de Fjord Frituur en het recept gereedmaken. **Kanalen:** de radio vertelt alleen de wereld en dimt zodra een missie begint; briefings gebeuren ter plekke of per telefoon.

## Intro van de akte

| | |
|---|---|
| **Regio** | Stad (Grunn): Binnenstad, Paddepoel, Oosterparkwijk, Groninger Museum |
| **Sfeer** | Kiezelweek: studenten met polsbandjes, lange zomeravonden, wind tegen |
| **Tijd** | ca. 62 minuten (6 missies + opening) |
| **Dagen** | vr 14 (1.1), za 15 (1.2, 1.3), zo 16 (1.4, 1.5), ma 17 (1.6, 's nachts) |
| **Wat de speler leert** | rijden zonder krassen, stunten, achtervolgen, formulieren, de duif, de fiets, sluipen; wie Tammo en Tessa zijn |
| **Plot** | Tessa wil een thuis met wielen: de Fjord Frituur. De enige vrije standplaats gaat naar de winnaar van de Snackprijs op 28 augustus. Een Fries (Jelle) koopt plakje voor plakje de hele markt op, en dat plakje is bij de standplaatsen al definitief van hem. Wie de Gouden Eierbal bewaart, zit de jury voor (artikel 4; artikel 9: bij verhindering het oudste jurylid). Tessa en Tammo willen de bal eerst pakken, als bewaking. De vitrine is al leeg: "Tige tank! – J." Jelle zegt op de radio dat hij hem heeft, en dat is waar. |
| **Romantiek** | vriendschap, plagen, Tammo is al twaalf jaar verliefd, Tessa merkt niks. Stappen: oogcontact (1.5), de eerste handaanraking "voor de grip" (1.6) |
| **Haak naar akte 2** | de politie zoekt twee Stadjers in het zwart, Jelle is de bewaarder (hij heeft de bal), en Tammo kan het kaartje niet loslaten: een dief die bedankt. |

**Doel in de eerste 10 minuten (hardop):** opening, Tessa: winnen op 28 augustus, dan een standplaats. **Motief:** de huur, de bank zegt nee, Tessa wil ergens blijven. **Vroege antagonist:** Rikus' radio noemt de Fries al in minuut 2; Berend noemt hem in 1.1 (de klomp); Jelle komt zelf in beeld in 1.3 (± minuut 30), **eerst kil en zakelijk** ("Mijn juristen hebben dit loket vanochtend vooruit betaald"), met één "Foar mem" in de deuropening als eerste barst.

### Opening (cutscène, geen missie)

**Wat je ziet:** trailerparodie (zon op d'Olle Grieze, fietsers in plaats van flamingo's, stilstaand beeld TESSA en TAMMO met naamkaart), daarna zonsopgang boven de Oosterparkwijk, het zolderraam, de Escapade met een lekke band. Verhuisdag naar Paddepoel, elfde verdieping.

**Opening, de keuken (uitsnede):**

- **RIKUS (radio):** Moi, Nachtstreek, het laatste uur. Het is twijduustern geweest, en nu wordt het licht. Voor wie wakker ligt van de huur: ik ook, jongens. [BEHOUDEN]
- **RIKUS (radio):** Het is vrijdag 14 augustus, Kiezelweek. En een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is, plakje voor plakje. [NIEUW]
- **TAMMO:** Moi. De bank? [BEHOUDEN]
- **TESSA:** "Uw plan is sympathiek." Dat betekent nee, met een strikje. [BEHOUDEN]
- **TESSA:** Luister. De Fjord Frituur heeft ook een plek nodig. In Grunn is er maar één vrije standplaats, en die gaat naar de winnaar van de Noordelijke Snackprijs. [NIEUW]
- **TAMMO:** De Snackprijs. Met de Gouden Eierbal. [NIEUW]
- **TESSA:** Op 28 augustus, op Gronings Ontzet. Wij winnen, wij krijgen die standplaats. Dan heeft de Fjord Frituur een thuis. [NIEUW]
- **TAMMO:** Een thuis. [NIEUW]
- **TESSA:** Een thuis met wielen. Dat kan ik aan. [NIEUW]
- **TESSA:** Als huisgenoten, Tammo. Teken nou maar. [BEHOUDEN]

(Rikus' opmerking over "kom" en Tammo is geschrapt: de radio doet geen romantiekcommentaar.)

---

## 1.1 · Nul krassen, vijftienhonderd punten (M01; was H1 en H3)

| | |
|---|---|
| **Id** | `A1-1` (steps `H1` en `H3` samen, missions `berend` en `chaos`) |
| **Functie** | **1 · inschrijving en financiering**: vijftig euro van Berend en honderdvijftig voor de inschrijving |
| **Plaats** | Martinikerkhof, Grote Markt, Boterdiep (Stad), vr 14 augustus, ochtend en avond |
| **Voertuig** | Berends bakkie; de Escapade heeft een lekke band |
| **Mechaniek / hergebruik** | `deliver` met schadeboete (`scratchFine`) en `stunt` (`stuntavond.js`) in één missie: eerst de stuntpunten op de Grote Markt, daarna het bakkie ongekrast naar het Boterdiep; `missions.js` defs `berend` en `chaos` |
| **Doel (hardop)** | "Haal vijftienhonderd stuntpunten voor Jelmers stream, niemand raken, en breng Berends bakkie dan zonder kras naar het Boterdiep." |
| **Motief** | de inschrijving kost honderdvijftig euro en het Loket gaat morgen open; Jelmer betaalt voor content; Berend betaalt vijftig euro voor een ongekrast bakkie |
| **Wat de speler weet** | de droom, het geld, dat er een Fries rondloopt die alles opkoopt (uit de radio) |
| **Verloop** | 1) Berend geeft de sleutels. 2) Jelmer belt: vijftienhonderd punten is honderdvijftig euro. 3) Stunts tussen parasols, kliko's en de waterwagen; mensen raken kost combo; Berend belt bij elke kras. 4) De chat leest "JelleWâld" voor. 5) Aflevering bij Berends zus. **Falen:** te veel schade of strafpunten: "Sikkom." en herstart bij het Martinikerkhof. |
| **Leuk-element / uitdaging** | stunten zonder krassen is een tegenspraak met zichzelf: tutorial voor schade en combo's tegelijk |
| **Reizen** | start 1,5 km van de flat; 400 m naar de Grote Markt; 2 min |
| **Romantiek (3/10)** | Tammo is jaloers op een chatbericht ("Wie is die man."); Berend zegt Moi tegen Tessa |
| **Plot** | zaait: Jelle kijkt mee in de chat; een Fries met een klomp wilde Berends bakkie (Jelles eerste plakje: alles wat rijdt) |
| **Gevolg / haak** | honderdvijftig euro op Tessa's pas, vijftig euro contant; morgenochtend pinnen |
| **Behouden / nieuw** | bijna alles BEHOUDEN (intro Berend, stuntscène, chatregels, outro); de Jelmer-regels zijn nu telefoon of ter plekke, niet radio; 17 nieuwe regels |
| **Zij-activiteiten** | EIKEA-klus (optioneel, `k-eikea`), bezorgbaantje, taxi |

**Openingsdialoog (Martinikerkhof):**

- **BEREND:** Goidag. [BEHOUDEN]
- **BEREND:** Mijn bakkie moet naar het Boterdiep, naar mijn zus. Je mag er met de auto niet meer door het centrum, sinds 1977. Ik heb een brief gestuurd. [NIEUW]
- **BEREND:** Ik heb gisteren alle krassen geteld. Nul. Zo blijft het. [BEHOUDEN]
- **TESSA:** Wij lenen hem eerst even voor een klus op de Grote Markt. Daarna rijd ik hem naar uw zus, om het centrum heen. [NIEUW]
- **BEREND:** Nul krassen. Of ik tel ze. [NIEUW]
- **TAMMO:** Jij rijdt als een fietser met een deadline. [BEHOUDEN]
- **JELMER (telefoon):** Moi moi! Jelmer, van Kiekdoar. Ik wil vanavond content op de Grote Markt. Haal vijftienhonderd stuntpunten, dan betaal ik honderdvijftig euro. [NIEUW]
- **TESSA:** Honderdvijftig euro is precies de inschrijving voor de Snackprijs. Het Loket gaat morgen om tien uur open en sluit om twaalf. [NIEUW]

**Sleutelscène (stunts en outro):** Berend belt tijdens de stunts: "Ik hoor een parasol kraken. Dat is een kras met een parasol." Daarna, aan het Boterdiep: Berend loopt om het bakkie heen: "…Goud." Tessa: "Trede twee van de complimentenladder, Tammo." Berend: "Er was hier trouwens al een Fries die mijn bakkie wilde kopen. Contant, uit een klomp. Een blauw colbert, in augustus." (BEHOUDEN.) Torenwachter (telefoon) opent de Grote Markt met "Ik meld alleen." (BEHOUDEN, eerste van drie keer).

> **Te beoordelen.** A) De samengevoegde missie (voorstel; één lange dag, vijftig euro en honderdvijftig euro samen). B) Berend krijgt hier een tweede grap (meer humor, langer). C) EIKEA als verplichte stap (meer wereldopbouw, minder vaart).

---

## 1.2 · Even pinnen (M02; H2)

| | |
|---|---|
| **Id** | `A1-2` (`H2`, mission `pinautomaat`) |
| **Functie** | **1 · inschrijving en financiering**: Tessa's pas terug, zodat het geld uit de stunt contant bij het Loket kan |
| **Plaats** | Herestraat, Spuit & Klaar (spuiterij), Pand & Poen (Stad), za 15 augustus, half acht 's ochtends |
| **Voertuig** | Escapade (nieuwe band) met de pinautomaat op een aanhanger |
| **Mechaniek / hergebruik** | `stages`: scène, `escape` (politie kwijt, `stars: 2`), garage-stap (spuiten), `goto` naar de heler; bestaande def |
| **Doel (hardop)** | "Politie kwijt, automaat naar Sjabbe, mijn pas terug: het Loket neemt alleen contant." |
| **Motief** | de automaat slikte Tessa's pas, en daar zit het geld van Jelmer op; Durk en Douwe trokken hem uit de muur; Sjabbe kan elke automaat openen |
| **Wat de speler weet** | Durk en Douwe werken voor een baas (nog geen naam) |
| **Verloop** | 1) Cutscène Herestraat. 2) Instappen, politie schudt je af (1 of 2 sterren; Sjabbe belt een route). 3) Spuiten bij Spuit & Klaar. 4) Pand & Poen: Sjabbe wrikt de klep open; Tessa pint honderdvijftig euro. **Falen:** gepakt of automaat kwijt: "Sikkom.", respawn bij de Herestraat. |
| **Leuk-element / uitdaging** | variatie op 1.1: nu mag je schade, maar niet gepakt worden |
| **Reizen** | Herestraat ligt 600 m van het Boterdiep; 1 min |
| **Romantiek (2/10)** | Tessa regelt alles, Tammo volgt; "We pinnen even." En de weigering in het autogesprek: Tammo's opa huilde in 1953 (grote Tammo-moment 1) |
| **Plot** | Sjabbe: de reuzen kochten vorige week alles voor frituren; hun baas vroeg waar het museum alarmen heeft. Tessa legt het verband: iemand wil de bal |
| **Gevolg / haak** | contant geld; om tien uur gaat het Loket open |
| **Behouden / nieuw** | intro, Sjabbe-scène en de weigering BEHOUDEN; 11 nieuwe regels (waaronder Sjabbe als telefoonstem) |

**Openingsdialoog (cutscène Herestraat):**

- **TESSA:** Hij heeft mijn pas. Hij heeft mijn pas en hij… [BEHOUDEN]
- **DURK:** Douwe. Hij is los. [BEHOUDEN]
- **DOUWE:** …los. [BEHOUDEN]
- **TESSA:** Mijn pas zit in die automaat. En die automaat zit op die aanhanger. En die aanhanger is van niemand. [BEHOUDEN]
- **TESSA:** In die pas zit het geld van Jelmer. Het Loket neemt alleen contant. Zonder pas geen inschrijving. [NIEUW]
- **TAMMO:** Dus we pinnen even. [BEHOUDEN]
- **TESSA:** Sjabbe van Pand & Poen koopt wat niemand wil en opent wat niemand kan. We brengen hem de automaat, en we schudden de politie af. [NIEUW]
- **TESSA:** Er komt een politieauto aan. Instappen. [BEHOUDEN]
- **TAMMO:** Ik rij. [NIEUW]

**Sleutelscène (outro, Pand & Poen):** Sjabbe: "Dan moet je groter denken. Die reuzen kwamen hier vorige week met een klomp vol geld. Ze kochten alles wat met frituren te maken heeft. En hun baas vroeg waar het museum alarmen heeft." Tessa: "Het museum. De Gouden Eierbal." Sjabbe: "Wie hem eerst heeft, heeft hem." (BEHOUDEN.) Autogesprek, Tammo: "Mijn opa stond in 1953 op de Grote Markt toen we hem wonnen. Hij huilde. Hij huilde nooit." (BEHOUDEN, de eerste van drie grote Tammo-momenten.)

> **Te beoordelen.** A) De weigering blijft in het autogesprek (voorstel: het hart van Tammo). B) De weigering als eigen korte scène. C) Sjabbe krijgt ook een vaste telefoonstem in 1.3 t/m 1.6 (staat nu erin).

---

## 1.3 · Het Loket (M03; nieuw)

| | |
|---|---|
| **Id** | `A1-3` (nieuw, `mission` nieuw, step `n-loket`) |
| **Functie** | **1 · inschrijving en financiering** |
| **Plaats** | "Het Loket", een verzonnen gemeentekantoor in een bestaand kantoorgebouw bij de Grote Markt (AANNAME: exacte gebouw kiezen in de bouw), za 15 augustus 10:00-12:00 |
| **Voertuig** | te voet |
| **Mechaniek / hergebruik** | interactie- en afleverketen zoals `sidejob_rechtbank.js` (balie, tas afleveren) en `sidejobkit.js`: wachtnummer, formulier, stempel, inleveren; nieuw is alleen de wachtrij-timer als HUD-element |
| **Doel (hardop)** | "Wij schrijven ons in voor de Snackprijs: drie formulieren, drie stempels, contant honderdvijftig euro, voor twaalven." |
| **Motief** | inschrijving sluit om twaalf uur; zonder stempel geen deelname; zonder standplaats geen frituur |
| **Wat de speler weet** | de prijs is een standplaats; Jelle (nog niet in beeld) heeft alle bakkers van de buurt gebeld |
| **Verloop** | 1) Binnen: wachtnummer 4117, scherm toont 4093. 2) Loket A: formulier 7B. 3) Loket C: stempel (alleen als je het formulier niet vouwt; Sjabbe belt over de zijdeur bij de kopieermachine). 4) **Jelle staat vooraan**: hij koopt de rij, het scherm springt naar 4140 (de klok loopt harder), en hij koopt alle vrije standplaatsen. 5) De Loketbediende leest artikel 4 en artikel 9 voor. 6) Inschrijfbewijs ophalen. **Falen:** tijd (12:00): de klok springt; je moet dan terugkomen via een klusje (boete 50); het spel kan niet vastlopen. |
| **Jelle grijpt in** | hij **koopt de rij**: de wachtrij-klok loopt voor de speler sneller (mechanisch gevolg). Plakje één is hiermee definitief van hem. |
| **Leuk-element / uitdaging** | geen rijden: een komische puzzelmissie met een klok, in plaats van de zoveelste achtervolging |
| **Reizen** | Pand & Poen naar het Loket 300 m: 1 min te voet |
| **Romantiek (3/10)** | Tessa neemt het over van Tammo en praat zich er doorheen; Tessa vertaalt zijn gezicht ("Dat gezicht betekent: ik snap het niet." "Klopt."); hij bewondert haar openlijk, zij merkt het niet |
| **Plot** | Jelle in eigen persoon: kil, zakelijk, "Mijn juristen hebben dit loket vooruit betaald". Artikel 4 en artikel 9 worden hardop voorgelezen. Tessa noemt zijn tactiek "salamitactiek". In de deuropening mompelt hij "Foar mem" (de eerste barst). **Mevrouw Hoving, de Bewaarder** (nieuwe kleine rol: bewaarder van de Gouden Eierbal en bij traditie voorzitter van de jury, artikel 4) wordt hier bij naam en in persoon geïntroduceerd; zij heeft van Jelle een treinreis met volpension gekregen (vanaf maandag, tot na het Ontzet) en weet niet dat de koepel sinds woensdag onder een doek hangt ("restauratie"). Jelle zet haar daarmee bewust aan de kant. Tessa zegt hardop waarom Jelle ook voorraad en jury koopt: zodat niemand anders kan beginnen, en dat er één officiële standplaats vrij blijft. |
| **Gevolg / haak** | Tessa: plakje één krijgen we niet terug. Bert belt: "Mijn duiven zijn nerveus." |
| **Behouden / nieuw** | alles NIEUW (naamkaart Jelle: BEHOUDEN van `CHARACTERS.jelle`) |
| **Zij-activiteiten** | Het Loket als terugkerende bijbaan, "Wiebelwerk" aankondiging (zie 06) |

**Sleutelscène (Jelle in de rij):**

- **JELLE:** Goedemorgen. Jelle Terpstra, Us Mem Snacks. Mijn juristen hebben dit loket vanochtend vooruit betaald. [NIEUW]
- **TESSA:** Jelle Terpstra. U staat in de rij. [NIEUW]
- **JELLE:** Ik heb de rij gekocht. Vanaf nu is uw nummer 4140. Dat staat in de overeenkomst. [NIEUW]
- **LOKETBEDIENDE:** Artikel 4 van het reglement: de bewaarder van de Gouden Eierbal zit de jury voor. Artikel 9: bij verhindering van de bewaarder zit het oudste jurylid voor. [NIEUW]
- **TESSA:** Salamitactiek. Plakje voor plakje, tot hij alles heeft. [NIEUW]
- **JELLE:** Dat noemen wij ondernemen. Oant sjen. [NIEUW]
- **JELLE:** Foar mem. [NIEUW]
- **TESSA:** "Voor mem." Voor zijn moeder. [NIEUW]

> **Te beoordelen.** A) Het Loket als lichte komische puzzel van ±6 minuten (voorstel). B) Het Loket als stealth: je glipt achter de balie langs. C) Jelle komt pas in 1.4 in beeld. Kosten: de lengte van dit script.

---

## 1.4 · Kieken van boven (M04; H4)

| | |
|---|---|
| **Id** | `A1-4` (`H4`, mission `duifverkenning`) |
| **Functie** | **3 · de waarheid over de bal ontdekken**: wie is er bij het museum, en wie is betaald |
| **Plaats** | Stationsplein naar het Groninger Museum, per duif, zo 16 augustus, ochtend |
| **Voertuig** | duif (Tammo, `pigeonmode.js`) |
| **Mechaniek / hergebruik** | `pigeon`-stage met `pigeonspots.js` (foto's van camera's en bewakers); bestaande def |
| **Doel (hardop)** | "Met de duif de camera's, de bewakers en de stroomkast bij het museum fotograferen." |
| **Motief** | Jelles trekker-limo staat elke nacht bij het museum; als Jelle de bal pakt, is hij weg uit Stad en wint hij de jury |
| **Verloop** | 1) Bert leert Tammo fluiten. 2) Duivenmodus: drie camera's en twee bewakers fotograferen; Sjabbe belt: kijk wie er koekjes krijgt. 3) De stroomkast. 4) Terug op Berts duiventil. **Falen:** de duif schrikt, herstart bij Bert. |
| **Romantiek (3/10)** | "Mijn vriend de duivenkoning." "Vriend." "Wat?" "Ow." |
| **Plot** | de limo, de man in het blauwe colbert die alarmen telt, **bewaker twee die een eierbal krijgt voor zijn koekje** (de latere handlanger) |
| **Gevolg / haak** | Tessa: Sjoerd (Kiezel) heeft een neef bij de beveiliging. Doe de race. |
| **Behouden / nieuw** | intro, outro BEHOUDEN; Bert belt nu per telefoon (1.3 outro), niet via de radio; 10 nieuwe regels |

**Openingsdialoog (Stationsplein):** BERT: "Niemand kijkt naar een duif. Behalve als hij op je jas poept." TAMMO: "Hoe stuur je een duif?" BERT: "Diep in de ogen kieken. Fluiten. Ogen dicht." (allemaal BEHOUDEN) en TESSA: "We willen weten wat de Fries bij het museum doet." [NIEUW]

**Sleutelscène (outro):** Tessa: "Drie camera's, twee bewakers, en een stroomkast achter de fietsenstalling." Tammo: "En die trekker-limo. Vlaggetjes met rode blaadjes." Tessa: "Pompeblêden. Een Fries. Hij gaat het echt doen." (BEHOUDEN.)

> **Te beoordelen.** A) Intro blijft, Bert zegt ook waarom (voorstel). B) Bert leert hier ook het "meeuw te slim af". C) Duivenmodus verplaatsen naar 1.1.

---

## 1.5 · Wind tegen, beide kanten op (M05; H5)

| | |
|---|---|
| **Id** | `A1-5` (`H5`, mission `kei`) |
| **Functie** | **3 · de waarheid over de bal ontdekken** (Sjoerds insiderinfo: de drie minuten) |
| **Plaats** | Binnenstad: Academiegebouw naar het café; kruispunt waar alles groen is, zo 16 augustus, middag |
| **Voertuig** | fiets (`KEI_ROUTE`) |
| **Mechaniek / hergebruik** | `checkpoint` race (`racers.js`, `keiroute.js`) met een oogcontact-moment (`playEyeContact` in `missionstory.js`) |
| **Doel (hardop)** | "Podium in de Kiezelrace: dan vertelt Sjoerd wat zijn neef 's nachts in het museum ziet." |
| **Motief** | Sjoerd praat alleen met wie zijn Kiezelrace rijdt, op een eigen fiets |
| **Verloop** | 1) Sjoerd (ter plekke) legt de regels uit. 2) Race langs de checkpoints, altijd tegenwind. 3) Kruispunt waar alles groen is: Tessa komt van de andere kant, oogcontact, allebei remmen. 4) Finish op het podium. **Falen:** buiten podium: herstart; je mag opnieuw. |
| **Romantiek (5/10)** | **Oogcontact:** de eerste lange blik, dan allebei de andere kant op |
| **Plot** | Sjoerd: om twaalf uur gaan de camera's drie minuten uit voor een update, sinds 2019 |
| **Gevolg / haak** | "Ik heb in drie minuten nog nooit iets goeds gedaan." "Dan wordt het tijd." Het plan: we pakken hem eerst, als bewaking. |
| **Behouden / nieuw** | intro (ter plekke) en outro BEHOUDEN; Sjoerds radio-intro is nu een ter-plekke-intro (NIEUW); het besluit "eerst pakken" NIEUW |

**Openingsdialoog (Academiegebouw):** SJOERD: "Moi. Sjoerd, Kiezelcommissie. Wie op het podium komt, krijgt van mij iets te horen over het museum." [NIEUW]; "Altijd tegenwind. Beide kanten op." [BEHOUDEN]; "Op de kruispunten is alles tegelijk groen. Niemand heeft voorrang. Maak oogcontact." [BEHOUDEN].

**Sleutelscène (outro, café):** Sjoerd: "Om twaalf uur gaan de camera's drie minuten uit voor een update. Al sinds 2019. Niemand weet waarom." (BEHOUDEN.) Tessa: "Als een ander hem pakt, is hij weg uit Stad. Dan pakken wij hem eerst, als bewaking, en brengen we hem terug na het Ontzet." Tammo: "Terugbrengen." Tessa: "Terugbrengen. Zeg ik." [NIEUW]

> **Te beoordelen.** A) Het besluit "eerst pakken, als bewaking" staat hier (voorstel). B) Het besluit valt in de eerste autoscène van 1.6. C) Tammo's twijfel krijgt een eigen scène.

---

## 1.6 · Het museum stond er al zo (M06; H6, drempel)

| | |
|---|---|
| **Id** | `A1-6` (`H6`, mission `museumkraak`, met `k-kraakspullen` en `k-nacht` erin) |
| **Functie** | **3 · de waarheid over de bal ontdekken** |
| **Plaats** | Groninger Museum, kade van het Verbindingskanaal, ma 17 augustus, 23:55-00:03 |
| **Voertuig** | te voet; optioneel een huurbootje |
| **Mechaniek / hergebruik** | `heist.js`: plan-keuze (`sluip` of `vermomd`), camera's, zekering, slot, bewaker, timer van drie minuten; `museum3d.js`; Sjabbe belt hints per telefoon |
| **Doel (hardop)** | "In drie minuten bij de vitrine, de Gouden Eierbal pakken en weg voordat de camera's weer aangaan." |
| **Motief** | als Jelle hem pakt, wint hij het reglement; Tammo: "terugbrengen na het Ontzet" |
| **Verloop** | 1) Thuis wachten tot middernacht (Henk belt: zender in de Escapade; Rikus draait drie minuten stilte). 2) Plan: sluipen of vermomd. 3) Zekeringkast, slot; bewaker twee met het koekje staat niet op zijn plek. 4) Binnen: vitrine open, **leeg**, kaartje "Tige tank! – J." 5) Alarm, rennen. **Falen:** gezien of te laat: "Sikkom." en de nacht begint opnieuw bij de kade. |
| **Romantiek (6/10)** | **De eerste handaanraking:** "Geef me je hand. Het is donker daarbinnen." "…Voor de grip." |
| **Plot** | de koepel hangt onder een doek (RESTAURATIE), en de vitrine is al leeg. Op het kussen: "Tige tank! – J." Jelle belt live naar Nachtstreek en zegt dat de bal bij hem is ("de rest volgt"): **dat is waar**; hij nam hem op 12 augustus (de speler leert dat in 4.2). Tammo: "Hij bedankt ons." Tessa: "Hij wist dat we hier waren. Iemand heeft het hem verteld." Tammo: "Bewaker twee." |
| **Gevolg / haak** | de politie zoekt twee mensen in het zwart. De camera's filmden hen. De bal is bij Jelle. |
| **Behouden / nieuw** | bijna alles BEHOUDEN, ook het kaartje; Jelles radioregel over artikel 4 is NIEUW (nu letterlijk waar); 12 nieuwe regels |

**Openingsdialoog (kade, nacht):** TAMMO: "Weet je zeker dat dit gebouw nog niet gekraakt is? Het ziet er al zo uit." [BEHOUDEN]; TESSA: "Dit is het plan. Om twaalf uur gaan de camera's drie minuten uit. In die drie minuten pakken wij de bal, als bewaking, voor Jelle." [NIEUW]; "Geef me je hand. Het is donker daarbinnen." [BEHOUDEN]; TAMMO: "…Voor de grip." [BEHOUDEN].

**Sleutelscène (de lege vitrine):** TESSA: "Tige tank! – J." [BEHOUDEN]; TAMMO: "Hij bedankt ons." [BEHOUDEN]; TESSA: "Hij was hier eerder. Die J schrijft overal een bedankje bij." [NIEUW]; JELLE (radio, na afloop): "Daarom bel ik. Reglement van de Noordelijke Snackprijs, artikel 4. De bewaarder zit de jury voor. De bal is bij mij, dus de rest volgt. Mijn juristen noemen het een overname." [NIEUW]

> **Besluit van de eigenaar.** Het kaartje blijft exact "Tige tank! – J." (de regel is opgenomen). **De twist is nu:** de J is van Jelle zelf, hij schrijft overal een bedankje onder; hij nam de bal eerder dan de spelers en zegt dat terecht op de radio; zijn moeder Mem neemt hem in Bourtange van hem af (M20).
