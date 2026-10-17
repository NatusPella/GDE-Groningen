# Akte 3: "Aan de Eems" (Eemsdelta en Oldambt; vr 21 – zo 23 augustus)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte3.md](09-script-akte3.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel.

## Intro van de akte

| | |
|---|---|
| **Regio** | Eemsdelta (Eemshaven, Delfzijl, de dijk), Oldambt (Winschoten, graanvelden, de kermis), de Dollard |
| **Sfeer** | volle zomer: stevige wind, gouden graan, havens vol containers en windmolens, kermisgeur; vr 21 opent in Stad de Zomerkermis, in Winschoten staat een eigen kermis (verzonnen datum za 22 en zo 23, AANNAME; KALENDER heeft die kermis nu op 29 september) |
| **Tijd** | ca. 55-60 minuten (6 missies) |
| **Dagen** | vr 21 (3.1, 3.2 's nachts), za 22 (3.3, 3.4), zo 23 (3.5, 3.6) |
| **Wat de speler leert** | helikopter (aan een touw), sluipen tussen containers, een race met wind, een kermis te voet, een klein vliegtuig, botsauto's |
| **Plot** | Het koopboek van Jelle laat zien dat zijn plan uit acht plakjes bestaat. De haven (plakje 5) wordt met een lijst van Lammert, de havenmeester, ontmanteld. In Winschoten blijkt dat **Jelle en Tammo allebei denken dat de ander de bal heeft**. Jelles jury (plakje 6) loopt voor een deel weg. Durk en Douwe laten hun baas niet los, maar zijn hem kwijt in een botsauto |
| **Romantiek** | **Eerste voorzichtige flirt** (Tammo, 3.3): "Je ziet er goed uit met wind." Tessa denkt dat het een grap is. **De eerste kus** (3.6): de dijk, na de kermis. Daarna doen ze alsof het niet gebeurd is. Tessa verzwijgt Mems appjes voor Tammo (ze weet niet waar de bal is): haar eerste geheim. |
| **Haak naar akte 4** | Durk, onder invloed: "Baas gaat naar Veendam, voor de mosterd. Plakje zeven." Tessa's telefoon: "Nog vijf dagen. – M." |

**Het midden van het verhaal:** 3.4 (Durk) is het keerpunt. Tot dan jagen ze Jelle voor de bal; vanaf hier jagen ze Jelles plan en zoeken ze allebei naar wie hem wel heeft. De kus (3.6) sluit akte 3.

**Reisplan akte 3** (afstanden geschat, AANNAME):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Noordpolderzijl (einde 2.6) | UMCG (helidek) | 35 | 25 min | heli (Dijkstra haalt je op in Lauwersoog, 2 min in beeld) |
| UMCG | Dollard (ballon) | 45 | 35 min | heli, autopilot |
| Dollard | Eemshaven (3.2) | 40 | 30 min | Dijkstra zet je af, 3 min |
| Eemshaven | Delfzijl (3.3) | 25 | 20 min | de race zelf (8 km) |
| Delfzijl | Winschoten (3.4) | 35 | 25 min | trein Delfzijl-Winschoten (AANNAME: lijn in de data), 2 min in beeld |
| Winschoten | kermis, graanveld (3.5) | 4 | 4 min | geen |
| graanveld | kermis (3.6) | 4 | 4 min | geen |

---

## 3.1 · Het staat niet in het rooster (H15)

| | |
|---|---|
| **Id** | `A3-1` (`H15`, mission `traumaduif`, aangepast) |
| **Plaats** | Lauwersoog (helikopterplatform), UMCG (lunch), de Dollard (ballon) |
| **Voertuig** | helikopter (Dijkstra vliegt, Tessa vliegt het laatste stuk) |
| **Mechaniek / hergebruik** | `heli`-stage (`helirun.js`, `heliflight.js`): lier, naast de mand hangen, `heliplan.js` autopilot voor de lange vlucht; bestaande def met andere plekken en een andere inhoud van de ballon |
| **Doel (hardop)** | "Breng Dijkstra's lunch naar het UMCG, vlieg naar de Dollard en pak Jelles koffer uit zijn ballon." |
| **Motief** | Dijkstra's nachtdienst heeft honger; Jelle vliegt per ballon over zijn nieuwe gebied en neemt het koopboek mee |
| **Wat de speler weet** | Jelle koopt plakjes; de bal is wie weet waar |
| **Verloop** | 1) Dijkstra landt in Lauwersoog ("Dit stond niet in het rooster."). 2) Autopilot: UMCG, lunch afleveren op de H. 3) Autopilot oost naar de Dollard. 4) Tessa vliegt, Tammo hangt aan de lier naast de mand. 5) Koffer pakken (Jelle in de mand met Durk en Douwe). 6) Terugvliegen. **Falen:** te dicht bij de mand (valt weg): "Sikkom." met respawn op het platform. |
| **Leuk-element / uitdaging** | de enige missie in de lucht in dit deel; Tammo's hoogtevrees; kaartkijken terwijl je vliegt |
| **Reizen** | 80 km in totaal: autopilot en een scène; zonder keuze (de heli is het reisalternatief) |
| **Romantiek (5/10)** | Tessa vraagt: "Wil je hangen?" Tammo: "…Ja. Dank je dat je het vraagt." Later zegt hij tegen de ballon: "Doe bist schier." |
| **Plot** | de koffer: het koopboek met acht plakjes (standplaatsen, vet, eieren, zout, haven, bloem en jury, mosterd, de bewaarder) |
| **Gevolg / haak** | Dijkstra: "Die Fries is geland in een weiland bij Winschoten. Tussen de koeien." Het koopboek noemt container 4471 in de Eemshaven. |
| **Behouden / nieuw** | scènes grotendeels BEHOUDEN; de locaties en het koffertje NIEUW |
| **Nieuwe regels (schatting)** | 16 |

**Openingsdialoog (Lauwersoog, helikopterplatform, 9 regels):**

- **DOKTER DIJKSTRA:** Ik ben Dokter Dijkstra, UMCG. Mijn traumaheli staat in onderhoud, en de nachtdienst heeft honger. [NIEUW]
- **TESSA:** Wij zoeken Jelles ballon. Hij vliegt boven de Dollard. [NIEUW]
- **DOKTER DIJKSTRA:** Eerst de lunch. Achterin staat een koeltas. Die hebben twaalf uur niks gehad. [NIEUW]
- **TESSA:** Dat is geen noodgeval. [BEHOUDEN]
- **DOKTER DIJKSTRA:** Jij hebt nooit nachtdienst gedaan. Landen op de H van het UMCG, graag. [BEHOUDEN]
- **DOKTER DIJKSTRA:** Dan de ballon. Ik heb een lier. Zij vliegt. Hij hangt. [NIEUW]
- **TAMMO:** Natuurlijk hang ík. [BEHOUDEN]
- **TESSA:** Ik vraag het, Tammo. Wil je hangen? [BEHOUDEN]
- **TAMMO:** …Ja. Dank je dat je het vraagt. [BEHOUDEN]

**Sleutelscène (boven de Dollard):**

- **TESSA:** Daar. Een gele ballon, en hij staat al bol. [NIEUW]
- **TAMMO:** Dat is de koffer. Naast de mand. [NIEUW]
- **DOKTER DIJKSTRA:** Lier gaat uit. Rustig, Tessa. Naast de mand, niet erop. [BEHOUDEN]
- **TAMMO:** Ik hang. Ik hang echt. [BEHOUDEN]
- **JELLE:** Moai, Grinzers! Jullie komen mijn ballon bekijken? [NIEUW]
- **TAMMO:** Ik heb hem! [NIEUW]
- **TAMMO:** Doe bist schier. [BEHOUDEN]

> **Te beoordelen.** A) De heli is ook het reisalternatief tussen de Wad en de Eemsdelta (voorstel). B) De ballon blijft in Stad (past minder bij de regio-opzet). C) Dijkstra vliegt alleen, de lier voor Tammo vervalt (goedkoper, minder spannend).

---

## 3.2 · Het containerlabyrint (nieuw)

| | |
|---|---|
| **Id** | `A3-2` (nieuw, step `n-containers`) |
| **Plaats** | Eemshaven, "Noorderterminal" (verzonnen bedrijf, bestaande haven), vr 21 's nachts |
| **Voertuig** | te voet; containerkraan (interactie) |
| **Mechaniek / hergebruik** | `heist.js`-stages: camera's, bewaker, zekering, `plan` met twee aanpakken (kraanwachter of overall), `updateFuse`, `updatePickpocket`; nieuw is alleen de kraankooi (een interactiepunt met een korte animatie, AANNAME) |
| **Doel (hardop)** | "Vind container 4471 en verwissel de papieren, voor het schip van Jelle om zes uur vertrekt." |
| **Motief** | in container 4471 staan Jelles ingekochte voorraden; verwisselde papieren sturen ze naar de havenmeester Lammert |
| **Wat de speler weet** | het koopboek; plakje 5 is de haven |
| **Verloop** | 1) Lammert wacht aan de kade (naamkaart). 2) Plan: kraan of overall. 3) Bewakers en camera's. 4) Container 4471 vinden tussen duizenden. 5) Papieren verwisselen. 6) Wegkomen. **Falen:** gezien: "Sikkom." en de nacht begint opnieuw. |
| **Leuk-element / uitdaging** | tweede sluipmissie, nu met een puzzel (welke container) en geen duif |
| **Reizen** | Dollard naar Eemshaven 40 km: heli (Dijkstra zet je af) of auto 30 min met autogesprekken |
| **Romantiek (4/10)** | in de kooi van de kraan staan ze dicht bij elkaar; Tessa: "Niet bewegen." Tammo: "Ik beweeg niet." Tessa: "Je ademt." |
| **Plot** | het schip vertrekt; de voorraden gaan naar Lammert; Lammert is Oma's vriend uit de dansschool van 1953; zijn woonschip in Delfzijl wordt de schuilplaats |
| **Gevolg / haak** | de haven is gered. Plakje vijf valt. Het schip van Jelle vaart leeg weg. |
| **Behouden / nieuw** | NIEUW (op "Ik meld alleen." na) |
| **Nieuwe regels (schatting)** | 22 |

**Openingsdialoog (kade, nacht, 9 regels):**

- **LAMMERT:** Ik ben Lammert, havenmeester. Ik danste in 1953 met Trijntje. Dat vergeet ze niet. [NIEUW]
- **TESSA:** Jelles ingekochte voorraden staan in container 4471. Het schip vertrekt om zes uur. [NIEUW]
- **LAMMERT:** Hier zijn de papieren. Jullie wisselen ze om. Dan blijft alles hier. [NIEUW]
- **TAMMO:** Hoe vinden we één container tussen drieduizend? [NIEUW]
- **LAMMERT:** Hij staat naast de rode. [NIEUW]
- **TAMMO:** Ze zijn bijna allemaal rood. [NIEUW]
- **LAMMERT:** Dan moet je de blauwe zoeken. [NIEUW]
- **TESSA:** We pakken de kraan. Dan zien we van boven welke blauw is. [NIEUW]
- **LAMMERT:** Ik zeg alleen: niet piepen. Ik meld alleen. [NIEUW]

**Sleutelscène (in de kraankooi):**

- **TESSA:** Niet bewegen. De bewaker kijkt omhoog. [NIEUW]
- **TAMMO:** Ik beweeg niet. [NIEUW]
- **TESSA:** Je ademt. [NIEUW]
- **TAMMO:** Dat is niet te voorkomen. [NIEUW]
- **TESSA:** Je kunt het proberen. [NIEUW]
- **TAMMO:** Ik doe mijn best. [NIEUW]
- **TESSA:** Hij loopt weg. Nu. [NIEUW]

> **Te beoordelen.** A) Containerkraan als sluipmissie (voorstel, herkenbaar in de Eemshaven). B) Een boot-achtervolging van Jelles schip (meer actie, dubbelop met 2.5). C) Een fietsrit tussen de containers (leuk, past bij het Stads-gevoel).

---

## 3.3 · De dijk (race)

| | |
|---|---|
| **Id** | `A3-3` (nieuw, mechaniek van `H9`, step `n-dijkrace`) |
| **Plaats** | dijkweg tussen Eemshaven en Delfzijl, za 22 bij zonsopgang |
| **Voertuig** | Escapade tegen Jelles trekker-limo |
| **Mechaniek / hergebruik** | `checkpoint`-race (`racers.js`, de structuur van `RING_ROUTE`); nieuw is een route langs de dijk (AANNAME: routedata nieuw te maken uit `provinceworld.js`/de wegen) |
| **Doel (hardop)** | "Rijd de dijk van Eemshaven naar Delfzijl en kom eerder aan dan Jelle." |
| **Motief** | Jelle daagt Tammo uit: "Wie wint, mag famke een eierbal geven." Tammo kan dat niet laten staan |
| **Wat de speler weet** | de haven is gewonnen; Jelle bluft |
| **Verloop** | 1) Startschot op de kade. 2) Dijkrace met zijwind en schapen. 3) Jelle probeert te snijden. 4) Finish bij de sluis van Delfzijl. **Falen:** Jelle eerder: "Sikkom." en opnieuw. |
| **Leuk-element / uitdaging** | de racemissie met een nieuw soort bochten (dijk, zijwind), korter dan de ring |
| **Reizen** | Eemshaven naar Delfzijl 25 km: de race zelf (8 km) en een korte rit |
| **Romantiek (6/10)** | **Eerste voorzichtige flirt (Tammo):** "Je ziet er goed uit met wind." Tessa: "Dat zegt iedereen over de tegenwind." (ze denkt dat het een grap is) |
| **Plot** | Jelle verliest en scheldt zijn tweeling uit: "Durk, Douwe, hoe vaak moet ik het zeggen." Tessa: "Wij hebben hem niet, Jelle." Jelle: "Ik ook niet… Ik bedoel: ik zeg niks." |
| **Gevolg / haak** | Rikus: peiling, "Woist ja wel?" Hij pakte haar hand in een auto met stuur. Het Oldambt wacht. |
| **Behouden / nieuw** | Jelles startpraatje en Tammo's "Dat neem ik je kwalijk" BEHOUDEN; rest NIEUW |
| **Nieuwe regels (schatting)** | 14 |

**Openingsdialoog (dijk, 9 regels):**

- **JELLE:** Moai, Grinzer. Eén rondje over jullie dijk. Wie wint, mag famke een eierbal geven. [NIEUW]
- **TESSA:** Famke koopt haar eigen eierbal. [BEHOUDEN]
- **TAMMO:** Dat neem ik je kwalijk. [BEHOUDEN]
- **TESSA:** Dat was een hele zin, Tammo. [BEHOUDEN]
- **TAMMO:** Ik voelde het. [BEHOUDEN]
- **TESSA:** We rijden van Eemshaven naar Delfzijl, over de dijk. Eerste aan de sluis wint. [NIEUW]
- **TAMMO:** Ik rij. [NIEUW]
- **TESSA:** Ik zeg: links, rechts, schaap. [NIEUW]
- **TAMMO:** Daar heb ik niks aan. [NIEUW]

**Sleutelscène (na de finish):**

- **HARM:** Hij ligt er! (schrappen: Harm komt niet meer voor.) *(zie schrapnota 08)*
- **TAMMO:** Je ziet er goed uit met wind. [NIEUW]
- **TESSA:** Dat zegt iedereen over de tegenwind. [NIEUW]
- **TAMMO:** Dat bedoelde ik niet. [NIEUW]
- **TESSA:** Wat bedoelde je dan? [NIEUW]
- **TAMMO:** …Dat bedoelde ik wel. [NIEUW]

> **Te beoordelen.** A) De dijkrace vervangt Ring Zuid (voorstel, past bij de regio). B) Ring Zuid blijft in Stad (Harm blijft, een herkenbare Stads-grap, maar geen provincie). C) Een bootrace op het Winschoterdiep (de bruggen komen in 4.1 al).

---

## 3.4 · Nog eentje dan (H11, Winschoten)

| | |
|---|---|
| **Id** | `A3-4` (`H11`, mission `kroegentocht`, verplaatst; step `n-kermisbar`) |
| **Plaats** | de kermis in Winschoten, za 22 's avonds |
| **Voertuig** | te voet |
| **Mechaniek / hergebruik** | `checkpoint` te voet met dronken menigte (`CROWD_SIZE`, `CHARGE_EVERY` in `missions.js`) en `playToast`; vier kermistenten in plaats van vier kroegen |
| **Doel (hardop)** | "Loop vier kermistenten af en houd Durk en Douwe bij, tot ze iets verklappen." |
| **Motief** | Geert (kroegbaas uit de Poelestraat) heeft een tent op de kermis; twee Friese reuzen zingen aan zijn bar |
| **Wat de speler weet** | Jelle bluft, hij valt in sloten, zijn koffer is leeg |
| **Verloop** | 1) Geert belt via Rikus. 2) Vier tenten, elk een drankje (toast). 3) Dronken menigte duwt je. 4) De vierde tent: Durk zingt. **Falen:** te veel geduwd: "Sikkom." |
| **Leuk-element / uitdaging** | de kroegentocht in nieuwe vorm; de humor zit in de menigte en het zingen |
| **Reizen** | Delfzijl naar Winschoten 35 km: trein (2 min in beeld) |
| **Romantiek (5/10)** | Geerts barman wil Tessa's nummer; Tammo: "Die barman heeft het druk." Tessa: "O ja? Sinds wanneer bepaal jij dat?" Tammo: "Sinds nu." |
| **Plot** | **Het keerpunt.** Durk, zingend: "De bal… hebben wij niet. Baas denkt dat júllie hem hebben." Douwe: "Durk. Dat was geheim. …Hè." |
| **Gevolg / haak** | Tammo: "Wie heeft hem dan?" Tessa: "Geen idee." (waar: ze weet niet wie hem heeft; wat ze verzwijgt zijn Mems appjes). Durk: "Baas gaat naar Veendam. Voor de mosterd." |
| **Behouden / nieuw** | het grootste deel BEHOUDEN (Geert, Tessa en Tammo); Durks regel NIEUW |
| **Nieuwe regels (schatting)** | 14 |

**Openingsdialoog (kermis, 9 regels):**

- **GEERT (radio):** Rikus. Geert, Poelestraat. Er zitten twee Friese reuzen aan mijn bar en ze zingen al een uur. Ik zoek iemand die vier kroegen doet, om ze bij te houden. [BEHOUDEN]
- **RIKUS (radio):** Geert, dat is geen klus. Dat is een avond. [BEHOUDEN]
- **GEERT:** Vier tenten, één avond, alles te voet. En Tessa: mijn nieuwe barman wil heel graag je nummer. [NIEUW]
- **TAMMO:** Die barman heeft het druk. [BEHOUDEN]
- **TESSA:** O ja? Sinds wanneer bepaal jij dat? [BEHOUDEN]
- **TAMMO:** Sinds nu. [BEHOUDEN]
- **TESSA:** Jaloers? Jij? Wat heb je met Tammo gedaan? [BEHOUDEN]
- **TESSA:** Het plan: Durk en Douwe volgen tot ze iets zeggen over de bal. [NIEUW]
- **TAMMO:** Ik drink maar één. [NIEUW]

**Sleutelscène (de vierde tent):**

- **DURK:** De bal… hebben wij niet. Hik. En baas ook niet. [NIEUW]
- **DOUWE:** Durk. Dat was geheim. …Hè. [BEHOUDEN]
- **TAMMO:** Jullie hebben hem niet? [NIEUW]
- **DURK:** Baas denkt dat júllie hem hebben. [NIEUW]
- **TESSA:** Wij hebben hem niet. [NIEUW]
- **DURK:** Dan heeft niemand hem. [NIEUW]
- **TAMMO:** Wie heeft hem dan? [NIEUW]
- **TESSA:** Geen idee. [NIEUW]
- **TAMMO:** Nog eentje dan? [BEHOUDEN]
- **TESSA:** …Ja. Nog eentje dan. [BEHOUDEN]

> **Te beoordelen.** A) De kroegentocht naar Winschoten (voorstel). B) Terug naar de Poelestraat in Stad (minder reizen, geen provincie). C) Geen kroegentocht maar een open kermisavond met botsauto's en grijpautomaten (meer vrijheid).

---

## 3.5 · Laag over het graan (nieuw)

| | |
|---|---|
| **Id** | `A3-5` (nieuw, step `n-graan`) |
| **Plaats** | graanvelden bij Winschoten en de kermis, zo 23 overdag |
| **Voertuig** | klein vliegtuig (Roelfiens gewasspuiter, nieuw voertuig; fallback: de heli uit 3.1) |
| **Mechaniek / hergebruik** | vliegen met `heliflight.js`-physics aangepast voor vaste vleugels (AANNAME: nieuwe vliegtuigmodus, de planning noemt het "vliegtuig"); een spandoek slepen en laag door een poortcorridor vliegen (`waymarkers3d.js`) |
| **Doel (hardop)** | "Sleep een spandoek over de kermis, zodat de juryleden zien dat Jelle ze koopt." |
| **Motief** | plakje zes: Jelle betaalt de juryleden met levenslang eierballen; Roelfien levert de bloem en leent haar vliegtuig |
| **Wat de speler weet** | Jelle bluft, de bal is nergens, de jury wordt gekocht |
| **Verloop** | 1) Roelfien (naamkaart) geeft het vliegtuig. 2) Opstijgen, laag over het graan. 3) Spandoek oppikken. 4) Over de kermis vliegen, door de rij kramen. 5) Drie juryleden lopen weg. **Falen:** te hoog (niemand ziet het) of te laag: "Sikkom." |
| **Leuk-element / uitdaging** | een heel ander gevoel dan de heli: snel, laag, met een boodschap |
| **Reizen** | 4 min |
| **Romantiek (4/10)** | Tammo mag de bocht aanwijzen; Tessa: "Jij kijkt, ik stuur." Hij: "Ik voel me nuttig." |
| **Plot** | drie van de vijf juryleden stappen uit; plakje zes valt gedeeltelijk; Roelfien geeft de bloem |
| **Gevolg / haak** | Jelle zit boven in zijn ballon en ziet het spandoek: "Dat is… eerlijk." Volgende plakje: mosterd. |
| **Behouden / nieuw** | NIEUW |
| **Nieuwe regels (schatting)** | 20 |

**Openingsdialoog (Roelfiens boerderij, 8 regels):**

- **ROELFIEN:** Ik ben Roelfien. Graanboerin. Oma Trijntje is mijn nicht. [NIEUW]
- **TESSA:** Jelle koopt de juryleden. Ze zitten op de kermis voor een gratis proeverij. [NIEUW]
- **ROELFIEN:** Dan sleep je een spandoek. Mijn gewasspuiter doet dat al twintig jaar voor de kermis. [NIEUW]
- **TAMMO:** Ik heb nog nooit gevlogen. [NIEUW]
- **TESSA:** Je hing aan een touw. [NIEUW]
- **TAMMO:** Dat telt niet. [NIEUW]
- **ROELFIEN:** Laag en rustig. En raak de molen niet. [NIEUW]
- **TESSA:** Tammo, jij zegt links of rechts. [NIEUW]

**Sleutelscène (boven de kermis):**

- **TAMMO:** Links. Rechts. Links. [NIEUW]
- **TESSA:** Dat is niet hoe links werkt. [NIEUW]
- **TAMMO:** Dat bedoelde ik ook. [BEHOUDEN]
- **ROELFIEN (radio):** Het spandoek staat recht. Ze lezen het. [NIEUW]
- **TESSA:** "Jelle koopt de jury." Dat staat erop. [NIEUW]
- **TAMMO:** Het staat goed. [NIEUW]

> **Te beoordelen.** A) Klein vliegtuig als nieuw voertuig (voorstel; vraagt een vliegtuigmodus, riskant). B) Dezelfde missie in de heli (geen nieuwe code, minder variatie in voertuigen). C) Geen vliegmissie; Roelfien geeft de bloem na een gesprek (goedkoper).

---

## 3.6 · Botsauto's, deel twee (de kus)

| | |
|---|---|
| **Id** | `A3-6` (`r-kermis`, uitgebreid, step `n-botsauto2`) |
| **Plaats** | de kermis in Winschoten, daarna de Dollarddijk, zo 23 bij zonsondergang |
| **Voertuig** | botsautootje |
| **Mechaniek / hergebruik** | `kermis.js` botsauto's met Durk en Douwe erin (bestaand); nieuw is een afloop met een korte scène op de dijk |
| **Doel (hardop)** | "Win een rit botsauto's tegen Durk en Douwe, voor ze Jelle vertellen waar de bal is." |
| **Motief** | Durk en Douwe moeten iets verklappen; jullie willen weten waar Jelle heen gaat |
| **Wat de speler weet** | Jelle en zij hebben allebei geen bal; het koopboek |
| **Verloop** | 1) Botsautopist: een rit van twee minuten tegen de tweeling. 2) Durk en Douwe botsen in elkaar ("Plons" op de grond). 3) Durk: "Baas gaat naar Veendam." 4) Zonsondergang aan de dijk. **Falen:** geen echt falen; de rit is vrij herhaalbaar. |
| **Leuk-element / uitdaging** | de lichtste missie; de ontspanning vóór het zware deel |
| **Reizen** | 4 min |
| **Romantiek (8/10)** | **De eerste kus:** op de dijk, "Moi." "…Moi." Dan kust ze hem, kort. Daarna doen ze alsof het niet gebeurd is. |
| **Plot** | Jelle gaat naar Veendam voor de mosterd (plakje zeven); Tessa's telefoon: "Nog vijf dagen. – M." (stil) |
| **Gevolg / haak** | de kus; het verzwijgen; de volgende ochtend: Veendam. |
| **Behouden / nieuw** | botsautoscène BEHOUDEN; dijkscène grotendeels hergebruik van de rondvaartkus (H13) |
| **Nieuwe regels (schatting)** | 12 |

**Openingsdialoog (botsauto's, 8 regels):**

- **DURK:** Douwe… alles draait. [BEHOUDEN]
- **DOUWE:** …draait. [BEHOUDEN]
- **TAMMO:** Moi, jongens. Lekker gebotst? [BEHOUDEN]
- **DURK:** Baas zegt: jij bent de duif. Maar eerst bier. [BEHOUDEN]
- **TESSA:** Een rit. Wij tegen jullie. Wie wint, krijgt een antwoord. [NIEUW]
- **DURK:** Welke vraag? [NIEUW]
- **TESSA:** Waar gaat Jelle morgen heen? [NIEUW]
- **DOUWE:** …Hè. [BEHOUDEN]

**Sleutelscène (de dijk):**

- **TESSA:** Daar. De zon. Zeg maar iets. [NIEUW]
- **TAMMO:** Weet je nog bij Berend? Toen mocht ik niet eens rijden. [NIEUW]
- **TESSA:** Mag je nog steeds niet. [BEHOUDEN]
- **TAMMO:** Nee. Maar ik zit wel naast je. [BEHOUDEN]
- **TESSA:** Moi. [BEHOUDEN]
- **TAMMO:** …Moi. [BEHOUDEN]
- *(regie: de camera blijft net te lang hangen. Dan kust ze hem, kort. Daarna kijken ze allebei naar het water.)*
- **TESSA:** Dat was voor de kermis. [NIEUW]
- **TAMMO:** Die is al dicht. [NIEUW]
- **TESSA:** …Ja. [BEHOUDEN]
- *(APP MEM→TESSA, stil: "Nog vijf dagen. Zeg het hem niet. – M.")*

> **Te beoordelen.** A) De kus aan het eind van akte 3, midden in het verhaal (voorstel). B) De kus in akte 2 op het wad (te vroeg voor het dieptepunt). C) De kus pas na het dieptepunt (maakt de ruzie scherper, maar het verhaal wordt minder warm).
