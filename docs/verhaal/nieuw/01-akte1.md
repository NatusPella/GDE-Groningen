# Akte 1: "Moi, Grunn" (Stad, vr 14 – ma 17 augustus)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels per scène staan in [09-script-akte1.md](09-script-akte1.md); hier staat de opzet per missie met de openingsdialoog en één sleutelscène.

**Tagregels voor dialoog in dit document:** `[BEHOUDEN]` = de regel staat letterlijk in de repo (opname bestaat). `[NIEUW]` = nieuwe of gewijzigde regel (nieuwe opname nodig). Spreker `TESSA` heet in de code `anita` / `A`.

## Intro van de akte

| | |
|---|---|
| **Regio** | Stad (Grunn): Binnenstad, Paddepoel, Oosterparkwijk, Groninger Museum |
| **Sfeer** | KEI-week: studenten met polsbandjes, lange zomeravonden, wind tegen |
| **Tijd** | ca. 60-70 minuten (7 missies + opening) |
| **Dagen** | vr 14 (1.1), za 15 (1.2-1.4), zo 16 (1.5-1.6), ma 17 (1.7, 's nachts) |
| **Wat de speler leert** | rijden, achtervolgen, stunten, formulieren, de duif, de fiets, sluipen; wie Tammo en Tessa zijn |
| **Plot** | Tessa wil een thuis met wielen: de Fjord Frituur. De enige vrije standplaats gaat naar de winnaar van de Snackprijs op 28 augustus. Een Fries (Jelle) koopt plakje voor plakje de hele markt op. Wie de Gouden Eierbal bewaart, zit de jury voor (artikel 4). Tessa en Tammo besluiten de bal eerst te pakken, als bewaking. De vitrine is al leeg: "Tige tank! – W." |
| **Romantiek** | vriendschap, plagen, Tammo is al twaalf jaar verliefd, Tessa merkt niks. Stappen: oogcontact (1.6), de eerste handaanraking "voor de grip" (1.7) |
| **Haak naar akte 2** | de politie zoekt twee Stadjers in het zwart, Jelle claimt de bal op de radio, en Tammo kijkt de hele nacht naar de letter W. |

**Doel in de eerste 10 minuten (hardop):** opening, Tessa: winnen op 28 augustus, dan een standplaats. **Motief:** de huur, de bank zegt nee, Tessa wil ergens blijven. **Vroege antagonist:** Rikus' radio noemt de Fries al in minuut 2; Berend noemt hem in 1.1 (de klomp); Jelle komt zelf in beeld in 1.4 (± minuut 30) en eerder in de chat (1.3).

### Opening (cutscène, geen missie)

**Wat je ziet:** trailerparodie (zon op d'Olle Grieze, fietsers in plaats van flamingo's, bevroren beeld TESSA en TAMMO met naamkaart), daarna zonsopgang boven de Oosterparkwijk, het zolderraam, de Escapade met een lekke band. Verhuisdag naar Paddepoel, elfde verdieping.

**Opening, de keuken (uitsnede, 12 regels):**

- **RIKUS (radio):** Moi, Nachtstreek, het laatste uur. Het is twijduustern geweest, en nu wordt het licht. Voor wie wakker ligt van de huur: ik ook, jongens. [BEHOUDEN]
- **RIKUS (radio):** Het is vrijdag 14 augustus, KEI-week. En een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is, plakje voor plakje. [NIEUW]
- **TAMMO:** Moi. De bank? [BEHOUDEN]
- **TESSA:** "Uw plan is sympathiek." Dat betekent nee, met een strikje. [BEHOUDEN]
- **TESSA:** Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto. [BEHOUDEN]
- **TAMMO:** Ik wel. De Escapade. [BEHOUDEN]
- **TESSA:** Luister. De Fjord Frituur heeft ook een plek nodig. In Grunn is er maar één vrije standplaats, en die gaat naar de winnaar van de Noordelijke Snackprijs. [NIEUW]
- **TAMMO:** De Snackprijs. Met de Gouden Eierbal. [NIEUW]
- **TESSA:** Op 28 augustus, op Gronings Ontzet. Wij winnen, wij krijgen die standplaats. Dan heeft de Fjord Frituur een thuis. [NIEUW]
- **TAMMO:** Een thuis. [NIEUW]
- **TESSA:** Een thuis met wielen. Dat kan ik aan. [NIEUW]
- **TESSA:** Als huisgenoten, Tammo. Teken nou maar. [BEHOUDEN]

---

## 1.1 · Berend telt de krassen (H1)

| | |
|---|---|
| **Id** | `A1-1` (nu step `H1`, mission `berend`) |
| **Plaats** | Martinikerkhof naar het Boterdiep, om het centrum heen (Stad) |
| **Voertuig** | Berends bakkie (auto) |
| **Mechaniek / hergebruik** | `deliver` met schadeboete (`scratchFine`), `missions.js` def `berend`; geen nieuwe code |
| **Doel (hardop)** | "Rij Berends bakkie heel naar het Boterdiep, zodat we vijftig euro verdienen en het eerste ventieldopje van de Fjord hebben." |
| **Motief** | Rikus zoekt een chauffeur; Berend mag sinds 1977 niet door het centrum; ze hebben geld nodig |
| **Wat de speler weet** | de droom, het geld, dat er een Fries rondloopt die alles opkoopt (uit de radio) |
| **Verloop** | 1) Berend geeft de sleutels. 2) Navigatie stuurt om via de Diepenring. 3) Checkpoints langs het water; elke kras kost vijftig cent. 4) Aflevering bij zijn zus. **Falen:** te veel schade of tijdslimiet (94 s in de bestaande def; aanname dat dat blijft): "Sikkom." en herstart bij het Martinikerkhof. |
| **Spaßelement / uitdaging** | rustig rijden als moeilijkheid: leren dat schade geld kost (tutorial voor de rest) |
| **Reizen** | start 1,5 km van de flat; geen reiskeuze nodig; 2 min |
| **Romantiek (2/10)** | Berend zegt "Moi" tegen Tessa; Tammo is jaloers op een bejaarde |
| **Plot** | zaait: een Fries met een klomp wilde Berends bakkie kopen (Jelles eerste plakje: alles wat rijdt) |
| **Gevolg / haak** | Tessa: vijftig euro is een ventieldopje. Dan hebben we er één. Rikus belt: Durk en Douwe trekken een pinautomaat uit de muur |
| **Behouden / nieuw** | intro en outro grotendeels BEHOUDEN (D-definitief); 3 nieuwe contextregels |
| **Nieuwe regels (schatting)** | 6 |
| **Zij-activiteiten** | EIKEA-klus (optioneel, bestaande `k-eikea`), bezorgbaantje, taxi |

**Openingsdialoog (cutscène Martinikerkhof, 10 regels):**

- **BEREND:** Goidag. [BEHOUDEN]
- **TESSA:** Goidag, Berend. [BEHOUDEN]
- **BEREND:** Ik heb gisteren alle krassen geteld. Nul. Zo blijft het. [BEHOUDEN]
- **TAMMO:** Jij bent toch Bommen Berend? Van het Ontzet? [BEHOUDEN]
- **BEREND:** Niet zo hard. Veertig jaar speel ik hem. Elk jaar val ik de stad aan, en elk jaar verlies ik. Dat doet wat met een mens. [BEHOUDEN]
- **TESSA:** Ik rij, Berend. Naar het Boterdiep, naar uw zus, om het centrum heen. [NIEUW]
- **TAMMO:** Jij rijdt als een fietser met een deadline. [BEHOUDEN]
- **TESSA:** En jij als een fietser zonder fiets. Sleutels, Berend. [BEHOUDEN]
- **TESSA:** Vijftig euro, Tammo. Dat is ons eerste ventieldopje voor de Fjord Frituur. [NIEUW]
- **BEREND:** Nul krassen. Of ik tel ze. [NIEUW]

**Sleutelscène (outro, Boterdiep):** Berend loopt om het bakkie heen: "…Goud." Tessa: "Trede twee van de complimentenladder, Tammo." Berend: "Er was hier trouwens al een Fries die mijn bakkie wilde kopen. Contant, uit een klomp. Een blauw colbert, in augustus." (BEHOUDEN, 5 regels). Dan: "Hij zei moi." "Tegen mij." (BEHOUDEN).

> **Te beoordelen.** A) Berends bakkie blijft puur tutorial (voorstel). B) Berend krijgt hier al een tweede grap: hij vraagt of Tessa geen toeristenroute wil rijden (meer humor, langer). C) EIKEA als verplichte stap in plaats van optioneel (meer wereldopbouw, minder vaart).

---

## 1.2 · Even pinnen (H2)

| | |
|---|---|
| **Id** | `A1-2` (`H2`, mission `pinautomaat`) |
| **Plaats** | Herestraat, Spuit & Klaar (spuiterij), Pand & Poen (Stad) |
| **Voertuig** | Escapade met de pinautomaat achterin |
| **Mechaniek / hergebruik** | `stages`: scène, `escape` (politie kwijt, `stars: 2`), garage-stap (spuiten), `goto` naar de heler; bestaande def |
| **Doel (hardop)** | "Pliesie kwijt, automaat naar Sjabbe, mijn pas terug." |
| **Motief** | de automaat slikte Tessa's pas; Durk en Douwe trokken hem uit de muur; de politie komt |
| **Wat de speler weet** | Durk en Douwe werken voor een baas (nog geen naam), het geld is op |
| **Verloop** | 1) Cutscène Herestraat. 2) Instappen, politie schudt je af (1 of 2 sterren). 3) Spuiten bij Spuit & Klaar. 4) Pand & Poen: Sjabbe wrikt de klep open. **Falen:** gepakt of automaat kwijt: "Sikkom.", respawn bij de Herestraat. |
| **Spaßelement / uitdaging** | variatie op 1.1: nu mag je schade, maar niet gepakt worden |
| **Reizen** | Herestraat ligt 600 m van Berends adres; 1 min |
| **Romantiek (2/10)** | Tessa regelt alles, Tammo volgt; "We pinnen even." |
| **Plot** | Sjabbe: de reuzen kochten vorige week alles voor frituren; hun baas vroeg waar het museum alarmen heeft. Tessa legt het verband: iemand wil de bal |
| **Gevolg / haak** | Rikus belt: Jelmer wil content en betaalt 150 euro; en Tessa: "inschrijven kost 150" |
| **Behouden / nieuw** | intro en Sjabbe-scène BEHOUDEN; autogesprek "de weigering" BEHOUDEN, aangevuld |
| **Nieuwe regels (schatting)** | 8 |

**Openingsdialoog (cutscène Herestraat, 9 regels):**

- **TESSA:** Hij heeft mijn pas. Hij heeft mijn pas en hij… [BEHOUDEN]
- **DURK:** Douwe. Hij is los. [BEHOUDEN]
- **DOUWE:** …los. [BEHOUDEN]
- **TAMMO:** Moi. Wat is er gebeurd? [BEHOUDEN]
- **TESSA:** Mijn pas zit in die automaat. En die automaat zit op die aanhanger. En die aanhanger is van niemand. [BEHOUDEN]
- **TAMMO:** Dus we pinnen even. [BEHOUDEN]
- **TESSA:** We pakken de automaat, schudden de politie af en brengen hem naar Sjabbe van Pand & Poen. Dan krijg ik mijn pas. [NIEUW]
- **TESSA:** Er komt een politieauto aan. Instappen. [BEHOUDEN]
- **TAMMO:** Ik rij. [NIEUW]

**Sleutelscène (outro, Pand & Poen):** Sjabbe: "Dan moet je groter denken. Die reuzen kwamen hier vorige week met een klomp vol geld. Ze kochten alles wat met frituren te maken heeft. En hun baas vroeg waar het museum alarmen heeft." Tessa: "Het museum. De Gouden Eierbal." Sjabbe: "Wie hem eerst heeft, heeft hem." (alle BEHOUDEN.) Daarna autogesprek: Tessa: "Als iemand die bal steelt, dan liever wij. Dan is hij tenminste nog in Stad." (BEHOUDEN, met de weigering van Tammo: "Mijn opa stond in 1953 op de Grote Markt...").

> **Te beoordelen.** A) De weigering in het autogesprek (voorstel: blijft, het is het hart van Tammo). B) De weigering als eigen korte scène na het slot. C) Sjabbe zegt ook het woord "Snackprijs" (nodig voor de uitleg; de nieuwe regel zit in 1.4).

---

## 1.3 · Iets met de Grote Markt (H3)

| | |
|---|---|
| **Id** | `A1-3` (`H3`, mission `chaos`) |
| **Plaats** | Grote Markt, zaterdagavond |
| **Voertuig** | Escapade |
| **Mechaniek / hergebruik** | `stunt` (`stuntavond.js`): punten voor stunts en omverrijden, strafpunten voor mensen raken; bestaande def |
| **Doel (hardop)** | "1500 stuntpunten voor Jelmers stream, niemand raken: honderdvijftig euro voor de inschrijving." |
| **Motief** | inschrijven voor de Snackprijs kost 150; Jelmer betaalt voor content |
| **Wat de speler weet** | de Snackprijs bestaat, kost 150 en is hun enige kans |
| **Verloop** | 1) Cutscène Jelmer. 2) Stunts tussen parasols, kliko's, de waterwagen; duivenzwerm laten opvliegen. 3) Mensen raken kost je combo. **Falen:** te veel strafpunten, tijd: "Sikkom." |
| **Spaßelement / uitdaging** | eerste vrije stunt, kijkt grappig; veel meer combo's dan 1.2 |
| **Reizen** | 400 m; 1 min |
| **Romantiek (3/10)** | Tammo ziet "famke yn it read" in de chat en vraagt: "Wie is die man." Eerste jaloezie |
| **Plot** | Jelle verschijnt in de chat ("JelleWâld"): Tessa: "Groot Loug. Zo noemen wíj onszelf." Hij kijkt dus mee |
| **Gevolg / haak** | 150 euro in de zak; Tessa: morgen zijn de loketten open, zaterdag tot twaalven |
| **Nieuwe regels (schatting)** | 5 |

**Openingsdialoog (cutscène, 10 regels):**

- **JELMER:** Moi moi chat! Zomeravond op de Grote Markt! En kijk: verse content! [BEHOUDEN]
- **TAMMO:** Ik ben geen content. Ik ben Tammo. [BEHOUDEN]
- **TESSA:** Spreek voor jezelf. Ik ben heel veel content. [BEHOUDEN]
- **TESSA:** Jelmer, jij betaalt honderdvijftig euro als we vijftienhonderd punten halen. Daarmee schrijven we ons in voor de Snackprijs. [NIEUW]
- **JELMER:** Niemand raken! Alleen spullen. Spullen zijn content. [BEHOUDEN]
- **TAMMO:** En die terrassen? [BEHOUDEN]
- **JELMER:** Die zijn het publiek! Niemand raken, wel laten schrikken! [BEHOUDEN]
- **TORENWACHTER (telefoon):** Tammo. Torenwachter. Er staan mensen op de Grote Markt. [BEHOUDEN]
- **TAMMO:** Het is de Grote Markt. [BEHOUDEN]
- **TORENWACHTER:** Ik meld alleen. [BEHOUDEN]

**Sleutelscène (outro):** terras klapt ("Kon minder!"), Jelmer leest "JelleWâld" voor: "En dat famke yn it read: sa'n leaf gesicht." Tammo: "Wie is die man." Tessa: "Is dat een vraag?" Tammo: "Nee." (BEHOUDEN.)

> **Te beoordelen.** A) Jelle zit alleen in de chat (voorstel; hij is dan onzichtbaar tot 1.4). B) Jelmer filmt per ongeluk Jelle's trekker-limo op de achtergrond (zichtbaar, geen dialoog). C) Het geld komt niet van Jelmer maar van Sjabbe (meer motief, minder humor).

---

## 1.4 · Het Loket (nieuw)

| | |
|---|---|
| **Id** | `A1-4` (nieuw, `mission` nieuw, step `n-loket`) |
| **Plaats** | "Het Loket", een verzonnen gemeentekantoor in een bestaand kantoorgebouw bij de Grote Markt (AANNAME: exacte gebouw kiezen in de bouw), zaterdag 10:00-12:00 |
| **Voertuig** | te voet (daarna de fiets van 1.6 op de terugweg is niet nodig) |
| **Mechaniek / hergebruik** | interactie- en afleverketen zoals `sidejob_rechtbank.js` (balie, tas afleveren) en `sidejobkit.js`: wachtnummer trekken, formulier halen, stempel halen, inleveren; nieuw is alleen de wachtrij-timer als HUD-element |
| **Doel (hardop)** | "Wij schrijven ons in voor de Snackprijs: drie formulieren, drie stempels, voor twaalven." |
| **Motief** | inschrijving sluit om twaalf uur; zonder stempel geen deelname; en zonder standplaats geen frituur |
| **Wat de speler weet** | de prijs is een standplaats; Jelle (nog niet in beeld) heeft alle bakkers van de buurt gebeld |
| **Verloop** | 1) Binnen: wachtnummer 4117, scherm toont 4093. 2) Loket A: formulier 7B. 3) Loket C: stempel (alleen als je het formulier niet vouwt). 4) Loket B: het dossier. 5) **Jelle staat in de rij vóór je**: hij betaalt contant uit een klomp en koopt "alle vrije standplaatsen van het jaar". 6) Baliemedewerker leest artikel 4 voor. 7) Inschrijfbewijs ophalen terwijl Jelle je afleidt. **Falen:** tijd (12:00): de klok springt; je moet dan terugkomen via een klusje (boete 50); het spel kan niet vastlopen. |
| **Spaßelement / uitdaging** | geen rijden: een komische puzzelmissie met een klok, in plaats van de zoveelste achtervolging |
| **Reizen** | Grote Markt naar het Loket 300 m: 1 min te voet |
| **Romantiek (3/10)** | Tessa neemt het over van Tammo en praat zich er doorheen; Tammo: "Je doet dit graag." Tessa: "Ik ben goed in loketten." Hij bewondert haar openlijk, zij merkt het niet |
| **Plot** | Jelle in eigen persoon: eerste ontmoeting. Hij schrijft in, koopt de standplaatsen, noemt "Operaasje Aaibal" nog niet maar wel zijn moeder. **Artikel 4 wordt hardop voorgelezen: "De bewaarder van de Gouden Eierbal zit de jury voor."** Tessa noemt zijn tactiek "salamitactiek". |
| **Gevolg / haak** | Tessa: wie de bal bewaart, zit de jury voor. Als Jelle hem pakt, wint hij op papier. Bert belt: "Mijn duiven zijn nerveus." |
| **Behouden / nieuw** | alles NIEUW (namecard Jelle: BEHOUDEN van `CHARACTERS.jelle`) |
| **Nieuwe regels (schatting)** | 30 |
| **Zij-activiteiten** | Het Loket als terugkerende bijbaan, "Wiebelwerk" aankondiging (zie 06) |

**Openingsdialoog (binnen, 10 regels):**

- **TESSA:** We staan bij Het Loket, Tammo. Om twaalf uur sluit de inschrijving voor de Snackprijs. Dan moeten we drie stempels hebben. [NIEUW]
- **TAMMO:** Drie stempels. In drie kwartier. [NIEUW]
- **LOKETBEDIENDE:** Nummer 4117 aan loket A. Op het scherm staat 4093. [NIEUW]
- **TAMMO:** Dat is vierentwintig mensen voor ons. [NIEUW]
- **TESSA:** Vier honderd eierballen zijn sneller klaar. Ik haal het formulier, jij pakt de stempels. [NIEUW]
- **LOKETBEDIENDE:** Formulier 7B, in drievoud. Niet vouwen. [NIEUW]
- **TAMMO:** Wie vouwt er nou een formulier? [NIEUW]
- **TESSA:** Iedereen, Tammo. Daarom staan we hier. [NIEUW]
- **LOKETBEDIENDE:** Loket C is vandaag een stempel-loket. Loket B is vandaag Loket C. [NIEUW]
- **TAMMO:** Natuurlijk. [NIEUW]

**Sleutelscène (Jelle in de rij):**

- **JELLE:** Moai, Grinzers. Jelle Terpstra, van Us Mem Snacks. [NIEUW]
- **TESSA:** Jelle Terpstra. U staat in de rij. [NIEUW]
- **JELLE:** Ik koop de rij. En alle vrije standplaatsen van het jaar. Contant. Uit een klomp. [NIEUW]
- **LOKETBEDIENDE:** Artikel 4 van het reglement: de bewaarder van de Gouden Eierbal zit de jury voor. [NIEUW]
- **JELLE:** Dat is een mooi artikel, hè. Dat heb ik zelf gelezen. [NIEUW]
- **TESSA:** Dat is salamitactiek. Eerst de standplaatsen, dan de rest, plakje voor plakje, tot er niks meer is. [NIEUW]
- **JELLE:** Dat is gewoon slim ondernemen, famke. Oant sjen. [NIEUW]
- **TAMMO:** Hij zei famke. [NIEUW]
- **TESSA:** Tammo. Concentratie. De bal. [NIEUW]

> **Te beoordelen.** A) Het Loket als lichte komische puzzel van ±6 minuten (voorstel). B) Het Loket als stealth: je glipt achter de balie langs (spannender, vraagt meer ontwerp). C) Jelle komt pas in 1.5 in beeld, zodat 1.4 puur loket is (de antagonist verschijnt dan later dan het voorstel). Kosten: de lengte van dit script: 30 regels is veel voor één missie.

---

## 1.5 · Kieken van boven (H4)

| | |
|---|---|
| **Id** | `A1-5` (`H4`, mission `duifverkenning`) |
| **Plaats** | Stationsplein naar het Groninger Museum, per duif |
| **Voertuig** | duif (Tammo, `pigeonmode.js`) |
| **Mechaniek / hergebruik** | `pigeon`-stage met `pigeonspots.js` (foto's van camera's en bewakers); bestaande def |
| **Doel (hardop)** | "Met de duif de camera's, de bewakers en de stroomkast bij het museum fotograferen." |
| **Motief** | Jelles trekker-limo staat elke nacht bij het museum; als Jelle de bal pakt, is hij weg uit Stad (en wint hij de jury) |
| **Wat de speler weet** | artikel 4; de bal moet in Stad blijven |
| **Verloop** | 1) Bert leert Tammo fluiten. 2) Duivenmodus: drie camera's en twee bewakers fotograferen. 3) De stroomkast achter de fietsenstalling. 4) Terug op Berts duiventil. **Falen:** de duif schrikt (te dichtbij), herstart bij Bert. |
| **Spaßelement / uitdaging** | ander perspectief: vliegen, foto's maken; eerste keer duivenmodus |
| **Reizen** | Stationsplein naar de flat 2 km; skip: sleep met de scooter; 2 min |
| **Romantiek (3/10)** | "Mijn vriend de duivenkoning." "Vriend." "Wat?" "Ow." |
| **Plot** | de limo, de man in het blauwe colbert die alarmen telt, vlaggetjes met pompeblêden: "Hij gaat het echt doen." |
| **Gevolg / haak** | Tessa: Sjoerd (KEI) heeft een neef bij de beveiliging. Doe de race morgen. |
| **Behouden / nieuw** | intro, outro BEHOUDEN |
| **Nieuwe regels (schatting)** | 6 |

**Openingsdialoog (Stationsplein, 9 regels):**

- **BERT:** Niemand kijkt naar een duif. Behalve als hij op je jas poept. [BEHOUDEN]
- **TAMMO:** Hoe stuur je een duif? [BEHOUDEN]
- **BERT:** Diep in de ogen kieken. Fluiten. Ogen dicht. [BEHOUDEN]
- **BERT:** Kiek. Hij luustert noar dij, jong. [BEHOUDEN]
- **TAMMO:** Duiven luisteren naar niemand. [BEHOUDEN]
- **TESSA:** Mijn vriend de duivenkoning. [BEHOUDEN]
- **TAMMO:** "Vriend." [BEHOUDEN]
- **TESSA:** Wat? [BEHOUDEN]
- **TAMMO:** Ow. [BEHOUDEN]

**Sleutelscène (outro):** Tessa: "Drie camera's, twee bewakers, en een stroomkast achter de fietsenstalling." Tammo: "En die trekker-limo. Vlaggetjes met rode blaadjes." Tessa: "Pompeblêden. Een Fries. Hij gaat het echt doen." (BEHOUDEN.)

> **Te beoordelen.** A) Intro blijft, Bert zegt ook waarom (voorstel). B) Bert leert hier ook het nieuwe "meeuw te slim af" (`summonDiveGull` bestaat al) als bonus. C) Duivenmodus verplaatsen naar 1.3 zodat de stunt ook een duif heeft (maakt 1.3 drukker).

---

## 1.6 · Wind tegen, beide kanten op (H5)

| | |
|---|---|
| **Id** | `A1-6` (`H5`, mission `kei`) |
| **Plaats** | Binnenstad: Academiegebouw naar het café; kruispunt waar alles groen is |
| **Voertuig** | fiets (`KEI_ROUTE`) |
| **Mechaniek / hergebruik** | `checkpoint` race (`racers.js`, `keiroute.js`) met een oogcontact-moment (`playEyeContact` in `missionstory.js`) |
| **Doel (hardop)** | "Podium in de KEI-race: dan vertelt Sjoerd wat zijn neef 's nachts in het museum ziet." |
| **Motief** | Sjoerd praat alleen met wie zijn KEI-race rijdt, op een eigen fiets |
| **Wat de speler weet** | de camera's, de bewakers, de stroomkast |
| **Verloop** | 1) Eerstejaars wijst route. 2) Race langs de checkpoints, altijd tegenwind. 3) Kruispunt waar alles groen is: Tessa komt van de andere kant, oogcontact, allebei remmen. 4) Finish op het podium. **Falen:** buiten podium: herstart bij de start; je mag opnieuw. |
| **Spaßelement / uitdaging** | de eerste echte race: herkenbaar Stad (wind, groen in alle richtingen) |
| **Reizen** | 1 km van de start naar het café; 1 min |
| **Romantiek (5/10)** | **Oogcontact:** de eerste lange blik, dan allebei de andere kant op |
| **Plot** | Sjoerd: om twaalf uur gaan de camera's drie minuten uit voor een update, sinds 2019 |
| **Gevolg / haak** | "Ik heb in drie minuten nog nooit iets goeds gedaan." "Dan wordt het tijd." Het plan is gemaakt: we pakken hem eerst. |
| **Behouden / nieuw** | intro en outro BEHOUDEN; een nieuwe regel waarin het besluit hardop wordt gezegd |
| **Nieuwe regels (schatting)** | 6 |

**Openingsdialoog (Academiegebouw, 8 regels):**

- **SJOERD:** Op de kruispunten is alles tegelijk groen. Niemand heeft voorrang. Maak oogcontact. [BEHOUDEN]
- **TESSA:** Tammo heeft hier nog gestudeerd. Twee weken. [BEHOUDEN]
- **TAMMO:** Drie. De derde was ik ziek. [BEHOUDEN]
- **TESSA:** Van het studeren? [BEHOUDEN]
- **TAMMO:** Van de mensa. [BEHOUDEN]
- **TESSA:** Sjoerd, jij weet wat je neef in het museum ziet. Als we het podium halen, vertel je het. [NIEUW]
- **SJOERD:** Regels zijn regels. Behalve de mijne. [NIEUW]
- **TAMMO:** Dat is een ja. [NIEUW]

**Sleutelscène (outro, café):** Sjoerd: "Om twaalf uur gaan de camera's drie minuten uit voor een update. Al sinds 2019. Niemand weet waarom." (BEHOUDEN.) Tessa (zacht): "Drie minuten." Tammo: "Ik heb in drie minuten nog nooit iets goeds gedaan." Tessa: "Dan wordt het tijd." Plus nieuw: TESSA: "Als een ander hem pakt, is hij weg uit Stad. Dan pakken wij hem eerst, als bewaking, en brengen we hem terug na het Ontzet." TAMMO: "Terugbrengen." TESSA: "Terugbrengen. Zeg ik." [NIEUW]

> **Te beoordelen.** A) Het besluit "eerst pakken, als bewaking" staat hier (voorstel). B) Het besluit valt in de eerste autoscène van 1.7 (korter, minder helder). C) Tammo's twijfel krijgt een eigen scène (de weigering van 1.2 uitbreiden).

---

## 1.7 · Het museum stond er al zo (H6, drempel)

| | |
|---|---|
| **Id** | `A1-7` (`H6`, mission `museumkraak`, met de oude `k-kraakspullen` en `k-nacht` erin) |
| **Plaats** | Groninger Museum, kade van het Verbindingskanaal, ma 17 augustus, 23:55-00:03 |
| **Voertuig** | te voet; optioneel een huurbootje (de oude kraakspullen-keuze) |
| **Mechaniek / hergebruik** | `heist.js`: plan-keuze (`sluip` of `vermomd`), camera's, zekering, slot, bewaker, timer van drie minuten; `museum3d.js`; gedeeltelijk bestaande def |
| **Doel (hardop)** | "In drie minuten bij de vitrine, de Gouden Eierbal pakken en weg voordat de camera's weer aangaan." |
| **Motief** | als Jelle hem pakt, wint hij het reglement; Tammo: "terugbrengen na het Ontzet" |
| **Wat de speler weet** | camera's, bewakers, stroomkast, drie minuten, artikel 4 |
| **Verloop** | 1) Thuis wachten tot middernacht (korte scène, Henk belt: zender in de Escapade). 2) Plan: sluipen of vermomd. 3) Zekeringkast, slot, bewaker. 4) Binnen: vitrine open, **leeg**, kaartje "Tige tank! – W." 5) Alarm, rennen, nieuwsbericht. **Falen:** gezien of te laat: "Sikkom." en de nacht begint opnieuw bij de kade. |
| **Spaßelement / uitdaging** | de eerste sluipmissie met een klok; langzaam beginnen, scherp eindigen |
| **Reizen** | flat naar museum 4 km; skip met de Escapade: 3 min of de fiets uit 1.6 |
| **Romantiek (6/10)** | **De eerste handaanraking:** "Geef me je hand. Het is donker daarbinnen." "…Voor de grip." |
| **Plot** | de vitrine is al leeg. Op het kussen: "Tige tank! – W." Jelle belt live naar Nachtstreek en claimt hem. Tammo kijkt naar de letter. |
| **Gevolg / haak** | de politie zoekt twee mensen in het zwart. De bal is weg, de camera's filmden hen, en Jelle wint de jury als hij hem echt heeft. |
| **Behouden / nieuw** | bijna alles BEHOUDEN, behalve het kaartje (J wordt W), Tessa's "J. Van Jelle" en de nieuwe vraag over de W |
| **Nieuwe regels (schatting)** | 14 |

**Openingsdialoog (kade, nacht, 9 regels):**

- **TAMMO:** Weet je zeker dat dit gebouw nog niet gekraakt is? Het ziet er al zo uit. [BEHOUDEN]
- **TESSA:** Dat is architectuur. Eerst dertig jaar mopperen, dan trots. Zo gaat dat hier. [BEHOUDEN]
- **TESSA:** Dit is het plan. Om twaalf uur gaan de camera's drie minuten uit. In die drie minuten pakken wij de bal, als bewaking, voor Jelle. [NIEUW]
- **TAMMO:** En daarna brengen we hem terug. [NIEUW]
- **TESSA:** Na het Ontzet. Om twaalf uur. Drie minuten. Hand. [BEHOUDEN]
- **TAMMO:** Wat? [BEHOUDEN]
- **TESSA:** Geef me je hand. Het is donker daarbinnen. [BEHOUDEN]
- **TAMMO:** …Voor de grip. [BEHOUDEN]
- **TESSA:** Voor de grip. [BEHOUDEN]

**Sleutelscène (de lege vitrine):**

- **TESSA:** "Tige tank! – W." Hartelijk dank. [NIEUW]
- **TAMMO:** Er staat een W. [NIEUW]
- **TESSA:** Jelle heeft een slordig handschrift. [NIEUW]
- **TAMMO:** Jelle begint met een J. [NIEUW]
- **TESSA:** Dan is het een slordige J. We moeten hier weg, Tammo. [NIEUW]
- **RIKUS (radio):** We hebben een beller. Uit… Ljouwert? [BEHOUDEN]
- **JELLE (radio):** Moai, Rikus. Jelle Terpstra, van Us Mem Snacks. Ik wil een groet doen aan twee mensen in een museum. [BEHOUDEN]
- **JELLE (radio):** Reglement van de Noordelijke Snackprijs, artikel 4. De bewaarder zit de jury voor. Ik heb hem alvast meegenomen. Dat scheelt een rit. [NIEUW]

> **Te beoordelen.** A) "W." blijft een raadsel tot 4.5 (voorstel; bijzonder, maar dwingt één opname-ronde voor de vier J-regels). B) Terug naar "J." (geen heropname, wel minder twist). C) De W staat op het kaartje én Tammo kent een W (Wiebelwerk) die later een valse piste wordt (zie 4.2).
