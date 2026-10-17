# Akte 3: "Aan de Eems" (Eemsdelta en Oldambt; vr 21 – zo 23 augustus)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md). Volledige regels: [09-script-akte3.md](09-script-akte3.md). Tags: `[BEHOUDEN]` = letterlijk in de repo, `[NIEUW]` = nieuwe of gewijzigde regel. Functies: (1) inschrijving of financiering, (2) een plakje van Jelle blokkeren, (3) de waarheid over de bal ontdekken, (4) de Fjord Frituur en het recept gereedmaken.

## Intro van de akte

| | |
|---|---|
| **Regio** | Eemsdelta (Eemshaven, Delfzijl, de dijk), Oldambt (Winschoten, graanvelden, de kermis), de Dollard |
| **Sfeer** | volle zomer: stevige wind, gouden graan, havens vol containers en windmolens, kermisgeur; vr 21 opent in Stad de Zomerkermis, in Winschoten staat een eigen kermis (verzonnen datum za 22 en zo 23, AANNAME; KALENDER heeft die kermis nu op 29 september) |
| **Tijd** | ca. 55 minuten (5 missies + 1 reisbeat) |
| **Dagen** | vr 21 (3.1, 3.2 's nachts), za 22 (3.3, trein, 3.4, 3.5 's avonds), zo 23 (rustdag: radio, appjes, reis naar Veendam) |
| **Wat de speler leert** | helikopter (aan een lier), sluipen tussen containers, een race met wind, een klein vliegtuig, een kermis te voet, botsauto's |
| **Plot** | Het koopboek van Jelle laat zien dat zijn plan uit acht plakjes bestaat; plakje acht, "de bewaarder", staat op **notaris, 28 augustus**. De haven (plakje 5) wordt met een lijst van Lammert ontmanteld. Jelles deurwaarder probeert de voorraden te grijpen. De jury (plakje 6) loopt voor een deel weg, maar **de bloem is definitief van Jelle** (de molen in Oostwold). In Winschoten verklappen Durk en Douwe waar de bal is: in Jelles koffer, onder het kussen van de limo. |
| **Romantiek** | **Eerste voorzichtige flirt** (Tammo, 3.3): "Je ziet er goed uit met wind." Tessa denkt dat het een grap is. **De eerste kus** (3.5): midden in het gebots van de botsauto's, ruw en onderbroken door de kermisexploitant, daarna de stille dijk. Tessa verzwijgt Mems appjes voor Tammo: haar eerste geheim. |
| **Haak naar akte 4** | Durk onder invloed: "Baas rijdt maandag naar Veendam, voor de mosterd. Plakje zeven." Tessa's telefoon: "Nog vijf dagen. – M." |

**Het midden van het verhaal:** 3.5 (Durk) is het keerpunt. Tot dan jagen ze Jelle en zijn plakjes; vanaf hier weten ze waar de bal zit en dat hij hem nooit loslaat. De kus sluit akte 3.

**Jelle grijpt in (mechanisch gevolg):** 3.3 zijn deurwaarder en limo racen naar dezelfde sluis (wie eerst bij het checkpoint is, houdt de voorraden); 3.4 hij houdt een proeverij om de jury publiek te kopen; en zijn molen blijft van hem.

**Reisplan akte 3** (afstanden geschat, AANNAME):

| Van | Naar | km | Auto | Alternatief |
|---|---|---|---|---|
| Lauwersoog (einde 2.5) | UMCG (helidek) | 35 | 25 min | heli (Dijkstra haalt je op in Lauwersoog, vr 21 om 08:00, 2 min in beeld) |
| UMCG | Dollard (ballon) | 45 | 35 min | heli, autopilot |
| Dollard | Eemshaven (3.2) | 40 | 30 min | Dijkstra zet je af, 3 min |
| Eemshaven | Delfzijl (3.3) | 25 | 20 min | de race zelf (8 km) |
| Delfzijl | Winschoten (3.4) | 35 | 25 min | trein Delfzijl-Winschoten (AANNAME: lijn in de data), 2 min in beeld |
| Winschoten | Roelfiens strook (3.4) | 4 | 4 min | geen |
| strook | kermis (3.5) | 4 | 4 min | geen |

---

## 3.1 · Het staat niet in het rooster (M12; H15)

| | |
|---|---|
| **Id** | `A3-1` (`H15`, mission `traumaduif`, aangepast) |
| **Functie** | **2 · Jelles koopboek bemachtigen**: welke plakjes hij nog koopt, en dat plakje acht op "notaris, 28 augustus" staat |
| **Plaats** | Lauwersoog (helikopterplatform), UMCG (lunch), de Dollard (ballon), vr 21, ochtend |
| **Voertuig** | helikopter (Dijkstra vliegt de lange stukken, Tessa houdt hem stil naast de mand). **Spawn:** de heli is Rotor Roelfs heli en staat op zijn pad bij Eelde (bestaand pad `eelde`); Dijkstra vliegt naar het noorden, naar Lauwersoog, om hen op te halen. De route is één keten zonder terugvlucht: Lauwersoog, UMCG (lunch), de Dollard, Delfzijl. **Lichte uitvoering:** autopilot (`heliplan.js`) voor de lange vluchten; de enige spelhandeling is stil houden naast de mand (bestaande `helirun.js`-lier) |
| **Mechaniek / hergebruik** | `heli`-stage (`helirun.js`, `heliflight.js`), `heliplan.js` autopilot; **Tammo pakt de aktetas uit de mand terwijl Tessa de heli stil houdt, en snijdt hem los**; bestaande def met andere plekken en een andere inhoud |
| **Doel (hardop)** | "Vlieg naar de Dollard, houd de heli stil naast Jelles ballon en pak de aktetas met zijn koopboek: daarin staat welk plakje hij als volgende koopt." |
| **Motief** | Dijkstra's nachtdienst heeft honger (lunch eerst); Jelle vliegt over zijn nieuwe gebied en neemt het koopboek mee |
| **Verloop** | 1) Dijkstra landt in Lauwersoog ("Dit stond niet in het rooster."). 2) Autopilot: UMCG, lunch afleveren op de H. 3) Autopilot oost naar de Dollard. 4) Tessa houdt de heli stil, Tammo hangt aan de lier naast de mand, stapt erin en snijdt de aktetas los. 5) Terugvliegen. **Falen:** te dicht bij de mand (valt weg): "Sikkom." met respawn op het platform. |
| **Leuk-element / uitdaging** | de enige missie met een heli in dit deel; Tammo's hoogtevrees; precies stil houden |
| **Reizen** | 80 km in totaal: autopilot en een scène; de heli is het reisalternatief |
| **Romantiek (5/10)** | Tessa vraagt: "Wil je hangen?" Tammo: "…Ja. Dank je dat je het vraagt." Later zegt hij tegen de ballon: "Doe bist schier." |
| **Plot** | het koopboek: acht plakjes (standplaatsen, vet, eieren, zout, haven, bloem en jury, mosterd, de bewaarder); bij de laatste: "notaris, 28 augustus" |
| **Gevolg / haak** | Dijkstra: "Die Fries is geland in een weiland bij Winschoten. Tussen de koeien." Het koopboek noemt container 4471 in de Eemshaven. |
| **Behouden / nieuw** | scènes grotendeels BEHOUDEN; Dijkstra belt niet langer via de radio; Rotor Roelf belt per telefoon |

**Openingsdialoog (Lauwersoog):** DOKTER DIJKSTRA: "Ik ben Dokter Dijkstra, UMCG. Mijn traumaheli staat in onderhoud, en de nachtdienst heeft honger." [NIEUW]; TESSA: "Wij zoeken Jelles ballon. Hij vliegt boven de Dollard, met zijn koopboek in een aktetas." [NIEUW]; TESSA: "Dat is geen noodgeval." [BEHOUDEN]; TAMMO: "Natuurlijk hang ík." [BEHOUDEN]; TESSA: "Ik vraag het, Tammo. Wil je hangen?" [BEHOUDEN]

**Sleutelscène (boven de Dollard):** TESSA: "Daar. Een gele ballon, en hij staat al bol." [NIEUW]; DOKTER DIJKSTRA: "Lier gaat uit. Rustig, Tessa. Naast de mand, niet erop." [BEHOUDEN]; TAMMO: "Ik hang. Ik hang echt." [BEHOUDEN]; JELLE: "U nadert privé-luchtruim, mevrouw. Mijn ballon heeft voorrang. Dat staat in het contract." [NIEUW]; TAMMO: "Ik heb hem!" [NIEUW]; TAMMO: "Doe bist schier." [BEHOUDEN]

> **Te beoordelen.** A) De heli is ook het reisalternatief (voorstel). B) De ballon blijft in Stad. C) Dijkstra vliegt alleen, de lier vervalt.

---

## 3.2 · Het containerlabyrint (M13; nieuw)

| | |
|---|---|
| **Id** | `A3-2` (nieuw, step `n-containers`) |
| **Functie** | **2 · plakje vijf (haven) blokkeren** |
| **Plaats** | Eemshaven, "Noorderterminal" (verzonnen bedrijf, bestaande haven), vr 21 's nachts |
| **Voertuig** | te voet; containerkraan (interactie) |
| **Mechaniek / hergebruik** | `heist.js`-stages: camera's, bewaker, zekering, `plan` met twee aanpakken. **Lichte uitvoering:** de kraankooi is een interactiepunt met een korte scripted animatie (de speler kiest alleen het moment); geen kraanbesturing |
| **Doel (hardop)** | "Vind container 4471 en verwissel de papieren, voor het schip van Jelle om zes uur vertrekt." |
| **Motief** | in container 4471 staan Jelles ingekochte voorraden; verwisselde papieren sturen ze naar de havenmeester Lammert |
| **Verloop** | 1) Lammert wacht aan de kade (naamkaart). 2) Plan: kraan of overall. 3) Bewakers en camera's. 4) Container 4471 vinden. 5) In de kraankooi: Lammert belt "De kraan piept. De bewaker kijkt bij het tweede piepje omhoog." 6) Papieren verwisselen, wegkomen. **Falen:** gezien: "Sikkom." en de nacht begint opnieuw. |
| **Reizen** | Dollard naar Eemshaven 40 km: heli (Dijkstra zet je af) of auto 30 min met autogesprekken |
| **Romantiek (4/10)** | in de kooi van de kraan: "Niet bewegen." "Ik beweeg niet." "Je ademt." |
| **Plot** | het schip vertrekt leeg; de voorraden gaan naar Lammert; zijn woonschip in Delfzijl wordt de schuilplaats en het voorraadmagazijn |
| **Gevolg / haak** | plakje vijf valt. Het woonschip: "Een schuilplaats met een bed. Twee bedden." Tessa vertaalt Tammo's gezicht: "Dat gezicht betekent: prima." |
| **Behouden / nieuw** | NIEUW (op een paar regels na); Lammert krijgt een eigen stem (kort, ironisch, geen "Ik meld alleen") |

**Sleutelscène (in de kraankooi):** LAMMERT (telefoon): "De kraan piept. De bewaker kijkt bij het tweede piepje omhoog." TESSA: "Niet bewegen. De bewaker kijkt omhoog." TAMMO: "Ik beweeg niet." TESSA: "Je ademt." TAMMO: "Niet te voorkomen." (NIEUW.)

> **Te beoordelen.** A) Containerkraan als lichte sluipmissie (voorstel). B) Een boot-achtervolging van Jelles schip. C) Een fietsrit tussen de containers.

---

## 3.3 · De dijk (M14; race)

| | |
|---|---|
| **Id** | `A3-3` (nieuw, mechaniek van `H9`, step `n-dijkrace`) |
| **Functie** | **4 · de Fjord Frituur en het recept gereedmaken**: de voorraden van de vrienden veiligstellen op Lammerts woonschip |
| **Plaats** | dijkweg tussen Eemshaven en de sluis van Delfzijl, za 22 bij zonsopgang |
| **Voertuig** | Escapade tegen Jelles trekker-limo met de deurwaarder |
| **Mechaniek / hergebruik** | `checkpoint`-race (`racers.js`, de structuur van `RING_ROUTE`); route langs de dijk (AANNAME: routedata nieuw) |
| **Doel (hardop)** | "Wees eerder aan de sluis van Delfzijl dan Jelles deurwaarder, dan blijven de voorraden van Oma's vrienden van ons." |
| **Motief** | Jelle kocht Lammerts huurachterstand en laat om acht uur beslag leggen op de ligplaats van het woonschip, met al het vet, de eieren en het zout erin |
| **Verloop** | 1) Startschot op de kade. 2) Dijkrace met zijwind en schapen. 3) De limo probeert te snijden en belt: "Kom maar mee in mijn limo." 4) Finish bij de sluis. **Falen:** Jelle eerder: "Sikkom." en opnieuw. |
| **Jelle grijpt in** | **de deurwaarder is een wedloop naar een checkpoint**: wie eerst is, houdt de voorraden (beslag mislukt: het woonschip staat op Trijntjes naam) |
| **Reizen** | Eemshaven naar Delfzijl 25 km: de race zelf (8 km) |
| **Romantiek (6/10)** | **Eerste voorzichtige flirt (Tammo):** "Je ziet er goed uit met wind." Tessa: "Dat zegt iedereen over de tegenwind." Tammo: "Dat bedoelde ik niet." "Wat bedoelde je dan?" "…Dat bedoelde ik wel." (de omkering van "Dat bedoelde ik ook") |
| **Plot** | Jelle verliest: "Contract is contract. Wij komen terug." |
| **Gevolg / haak** | de voorraden zijn veilig; de trein naar Winschoten |
| **Behouden / nieuw** | "Famke koopt haar eigen eierbal." "Dat neem ik je kwalijk." BEHOUDEN; de rest NIEUW |

**Openingsdialoog (dijk):** JELLE: "Goedemorgen. Mijn deurwaarder legt om acht uur beslag op de ligplaats van het woonschip van meneer Lammert. Ik heb gisteren zijn huurachterstand gekocht." [NIEUW]; TESSA: "Daar liggen de eieren, het vet en het zout van de vrienden van Oma." [NIEUW]; TESSA: "Famke koopt haar eigen eierbal." [BEHOUDEN]; TAMMO: "Dat neem ik je kwalijk." [BEHOUDEN]; TESSA: "Dat was een hele zin, Tammo." [BEHOUDEN]

> **Te beoordelen.** A) De dijkrace vervangt Ring Zuid (voorstel). B) Ring Zuid blijft in Stad. C) Een bootrace op het Winschoterdiep.

---

## Reisbeat: de trein naar Winschoten (T3)

**Wat:** station Delfzijl naar Winschoten, treinrit, overslaanbaar; 2 min met scène. Tessa: "We nemen de trein naar Winschoten. Daar is een kermis." Tammo: "Een kermis. In de provincie." (NIEUW.)

---

## 3.4 · Laag over het graan (M15; nieuw)

| | |
|---|---|
| **Id** | `A3-4` (nieuw, step `n-graan`) |
| **Functie** | **2 · plakje zes (jury en bloem) blokkeren**: de jury publiek ontmaskeren; de bloem **verliezen** |
| **Plaats** | graanvelden bij Winschoten en de kermis, za 22, middag |
| **Voertuig** | klein vliegtuig (Roelfiens gewasspuiter; het enige vliegtuig in het verhaal, nieuw voertuig; fallback: heli). **Spawn:** het vliegtuig staat op een landingsstrook in het Oldambt; de bouw gebruikt een echte strook (AANNAME: vliegveld Oostwold, nog te controleren in OSM, `aeroway=aerodrome`) en verzint er geen |
| **Mechaniek / hergebruik** | vliegen met `heliflight.js`-physics aangepast voor vaste vleugels (AANNAME: nieuwe vliegtuigmodus); een spandoek slepen en laag door een poortcorridor vliegen (`waymarkers3d.js`) |
| **Doel (hardop)** | "Sleep een spandoek over de kermis, zodat iedereen ziet dat Jelle de juryleden koopt met een gratis proeverij." |
| **Motief** | plakje zes: Jelle betaalt de juryleden met levenslang eierballen; Roelfien levert het meel en leent haar vliegtuig |
| **Verloop** | 1) Roelfien (naamkaart): "Vlieg laag, houd de molen rechts en trek pas op na de kermis." 2) Opstijgen, laag over het graan. 3) Spandoek oppikken. 4) Over de kermis, door de rij kramen. 5) Twee juryleden lopen weg. **Falen:** te hoog (niemand ziet het) of te laag: "Sikkom." |
| **Romantiek (4/10)** | Tammo mag de bocht aanwijzen; Tessa: "Jij kijkt, ik stuur." |
| **Plot** | twee van de vier juryleden (naast Berend) stappen uit; plakje zes is voor de helft gevallen. **Jelle wint hier definitief de bloem:** de molen in Oostwold is van hem; Roelfien geeft alleen haar eigen **grove** meel ("Oma's recept lust grof"). |
| **Gevolg / haak** | Jelle ziet het spandoek: "Dat is… eerlijk." |
| **Behouden / nieuw** | NIEUW (op "Dat bedoelde ik ook" is geschrapt) |

**Sleutelscène (na het spandoek):** JURYLID: "Is dit waar? Jelle koopt de jury?" JELLE: "Het is een proeverij. Er wordt geproefd en er wordt gesteld." JURYLID: "Ik stap eruit." ROELFIEN: "De molen in Oostwold is van Jelle. Het fijne bloem krijg je daar niet meer. Ik heb mijn eigen graan. Dat is grof." (NIEUW.)

> **Te beoordelen.** A) Klein vliegtuig als nieuw voertuig (voorstel; het enige vliegtuig, riskant). B) Dezelfde missie in de heli. C) Geen vliegmissie; Roelfien geeft het meel na een gesprek.

---

## 3.5 · Nog eentje dan (M16; kroegentocht, botsauto's en de kus; was H11 en M19)

| | |
|---|---|
| **Id** | `A3-5` (`H11`, mission `kroegentocht`, verplaatst en uitgebreid met `r-kermis`, step `n-kermisbar`) |
| **Functie** | **3 · de waarheid over de bal ontdekken**: Durk en Douwe geven weg waar hij is |
| **Plaats** | de kermis in Winschoten, daarna de Dollarddijk, za 22 's avonds en bij zonsondergang |
| **Voertuig** | te voet, daarna het botsautootje |
| **Mechaniek / hergebruik** | `checkpoint` te voet met dronken menigte (`CROWD_SIZE`, `CHARGE_EVERY`) en `playToast`, **drie** kermistenten in plaats van vier kroegen; daarna `kermis.js` botsauto's met Durk en Douwe (bestaand), met een kusscène en een korte dijkscène |
| **Doel (hardop)** | "Loop drie kermistenten af om Durk en Douwe bij te houden, en win dan een rit botsauto's: wie wint, krijgt een antwoord." |
| **Motief** | Geert (kroegbaas uit de Poelestraat) heeft een tent op de kermis; twee Friese reuzen zingen aan zijn bar; jullie willen weten waar de bal is |
| **Verloop** | 1) Geert vraagt in persoon om de reuzen bij te houden. 2) Drie tenten, elk een drankje (toast); dronken menigte duwt je. 3) Botsauto's: een rit van twee minuten tegen de tweeling. 4) **De kus** midden in het gebots. 5) Durk verklapt: "De bal… zit in baas zijn koffer. Onder het kussen van de limo. Baas rijdt maandag naar Veendam." 6) Zonsondergang aan de dijk. **Falen:** te veel geduwd: "Sikkom."; de rit is vrij herhaalbaar. |
| **Reizen** | Delfzijl naar Winschoten 35 km: trein (2 min in beeld); op de kermis 4 min |
| **Romantiek (5/10, dan 8/10)** | Geerts barman wil Tessa's nummer: "Sinds nu." Dan, in de auto: Tessa: "Je had vandaag drie keer ongelijk. Maar je bleef wel naast me." Tammo: "Dat deel kan ik." **De eerste kus:** korte, ruwe kus midden in het gebots, hun hoofden stoten tegen elkaar, een auto ramt de hunne; de exploitant roept: "Eruit! Stilstaan op de baan is niet toegestaan! Wie wil er hier een lolly?" Op de dijk: "Dat was omdat je bleef." Tessa vertaalt: "Dat gezicht betekent: ik leef nog." |
| **Plot** | **Het keerpunt.** De bal is bij Jelle, in zijn koffer; hij draagt hem altijd bij zich; plakje zeven (mosterd) is het volgende. |
| **Gevolg / haak** | de kus; het verzwijgen; Mems appje: "Nog vijf dagen. Zeg het hem niet. – M."; maandag: Veendam. |
| **Behouden / nieuw** | Geert-regels (Tessa, Tammo) en botsautoscène BEHOUDEN; Geerts eigen intro NIEUW (hij belt niet langer Rikus); de kus is nieuw geschreven |

**Sleutelscène (de rit en de kus):**

- **TAMMO:** Links, Tessa. Links. [NIEUW]
- **TESSA:** Dat is mijn links. [NIEUW]
- **TESSA:** Je had vandaag drie keer ongelijk. Maar je bleef wel naast me. [NIEUW]
- **TAMMO:** Dat deel kan ik. [NIEUW]
- **KERMISEXPLOITANT:** Eruit! Stilstaan op de baan is niet toegestaan! Wie wil er hier een lolly? [NIEUW]
- **TAMMO:** Au. [NIEUW]
- **TESSA:** Au. [NIEUW]
- **DURK:** De bal… zit in baas zijn koffer. Hik. Onder het kussen van de limo. Baas rijdt maandag naar Veendam, voor de mosterd. [NIEUW]
- **DOUWE:** Durk. Dat was geheim. …Hè. [BEHOUDEN]

> **Te beoordelen.** A) De kus midden in het gebots, daarna de stille dijk (voorstel; ruwer, minder "vakantiefilm"). B) De kus pas op de dijk. C) De kus in akte 2 (te vroeg).
