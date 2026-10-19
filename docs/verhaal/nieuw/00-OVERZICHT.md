# Het nieuwe verhaal: "Alles voor één eierbal" (de provincietour)

Voorstel voor issue [#93](https://github.com/NatusPella/GDE-Groningen/issues/93). Dit is **één verhaal in vijf akten**. Wat er in het oude spel bestaat (de oude delen en het oude plan voor een vervolg) bepaalt de structuur niet; oud materiaal komt alleen terug waar het past (de regels met de tag `[BEHOUDEN]`). Alleen documenten in `docs/verhaal/nieuw/`; er is geen code aangepast, niets opgenomen en geen TTS of netwerk gebruikt. Alles wat ik niet in de repo heb kunnen controleren, staat als **AANNAME**. Alles wat niemand in beeld heeft gezien, is **nog niet bekeken**.

Deze versie verwerkt de besluiten na drie reviews door andere taalmodellen (twist en Jelle als echte bedreiging, kanaalscheiding, samengevoegde missies, de finale als wedstrijd, het dieptepunt, de gags en de stemmen). Wat er veranderd is, staat in §11 (besluiten) en per missie in §4.

**Bestanden**

| Bestand | Inhoud |
|---|---|
| `00-OVERZICHT.md` | dit document |
| `01-akte1.md` … `05-akte5.md` | per akte: intro en alle missies, met opening en sleutelscène |
| `06-zijmissies-en-minigames.md` | 46 zijmissies en activiteiten, gerangschikt |
| `07-TTS-RAMING.md` | aantallen behouden en nieuwe regels; kostenraming alleen ter informatie (voorlopig niets opnemen) |
| `08-IMPLEMENTATIE.md` | voor een latere bouwronde, incl. productiekeuzes (drie signature-systemen) |
| `09-script-akte1.md` … `09-script-akte5.md` | het volledige script, machineleesbaar (`SPREKER: tekst [BEHOUDEN\|NIEUW]`) |
| `HET-VERHAAL.md` | het hele verhaal als filmscript in één bestand (leesbaar, zonder tags; wordt uit de 09-scripts opgebouwd) |

## 1. Titel, logline, doel en motief

**Titel:** *Alles voor één eierbal* (bestaande arc-naam; het spel heet *GDE Groningen – Zomer vol misdaad*).

**Logline:** Twee Stadjers zonder geld willen een frietwagen laten staan op de enige standplaats van Grunn, en moeten daarvoor de Noordelijke Snackprijs winnen. Een Friese snackbaron koopt plakje voor plakje de hele markt op om dat te voorkomen, en hij heeft de Gouden Eierbal echt uit het museum gehaald: vóór hen. Over de hele provincie, in twee weken, tegen een jury, een bal en een droge woordenwisseling in, tot zijn eigen moeder hem de bal afneemt en de beste eierbal wint.

**Algemeen doel (één zin, hardop in de opening door Tessa):** *"Wij winnen op 28 augustus de Noordelijke Snackprijs, dan krijgen we de enige vrije standplaats, en dan heeft de Fjord Frituur een thuis."*

**Motief (één zin):** Tessa heeft nooit langer dan een paar jaar ergens gewoond en wil een thuis met wielen; Tammo wil bij haar blijven maar zegt het niet; ze kunnen de huur niet betalen en de bank zei "uw plan is sympathiek".

**Tegenstander (één zin):** Jelle Terpstra, Friese snackbaron van *Us Mem Snacks*, wil zijn moeder Gerda de Gouden Eierbal geven die zij in 1953 net miste, en koopt daarvoor met de **salamitactiek** (de "Operaasje Aaibal") alles op wat een eierbal nodig heeft: standplaatsen, vet, eieren, zout, haven, bloem, jury, mosterd en tot slot de bewaarder; **hij is eerst kil en zakelijk, en pas langzaam komt "foar mem" boven**. Zijn moeder wil dat helemaal niet.

### De twist (nieuwe waarheid)

**JELLE HEEFT DE BAL ECHT GESTOLEN, en niet een bluf.** Hij schrijft overal een bedankje met een J onder (zijn moeder leerde het hem), dus het kaartje in de lege vitrine blijft exact **"Tige tank! – J."** (opgenomen), en het is van hem. Hij nam de bal op 12 augustus, met een omgekochte bewaker (bewaker twee, "met het koekje") en zijn tweeling; zijn radio-claim "de bal is bij mij" is **waar**. Zijn moeder Mem (Gerda) neemt de bal in Bourtange van hem af, met hulp van Oma Trijntje en Berends bakkie, om hem te stoppen. De spelers jagen de hele tijd echt op de bal; in Bourtange houden ze hem vast onder druk van Jelles beleggers en ontsnappen ermee, en in het dieptepunt verliest Tessa hem (ze redt de auto, niet de bal). In de finale is de bal geen derde roof en geen derde vlucht: de wedstrijd wordt beslist door de beste eierbal, en de bal gaat terug naar het museum.

**Hoe volg je Jelles plan?** In "Wat weten we?" staat een **plakjesbord** met acht plakjes (AANNAME: nieuw, klein). Jelle vertelt zijn eigen plan op de radio, na afloop van missies (hij is ijdel en belt graag in: dat is "wereld", geen briefing). Tessa noemt het plan in M03 hardop "salamitactiek". Het koopboek (M12) laat de acht plakjes zien.

**De draad in vier zinnen:** (1) De bal staat in het museum en moet in Stad blijven, want de bewaarder zit de jury voor (artikel 4; artikel 9: bij verhindering het oudste jurylid). (2) Tessa en Tammo besluiten hem eerst te pakken, als bewaking. (3) De vitrine is al leeg: "Tige tank! – J." en Jelle zegt op de radio dat hij hem heeft, en dat is waar. (4) Dan jagen ze Jelle en zijn plakjes door de provincie, terwijl Jelle hen actief dwarsboomt (een weg dichtkopen, een boer huren, de fanfare, de machinist, de wagen); in Bourtange neemt zijn moeder de bal van hem af, en daarna raken Tessa en Tammo elkaar kwijt tot de knuffel in Tinus' schuur.

## 2. Cast

Bestaand = uit `docs/personages.md` en `storyarc.js`; **nieuw** alleen waar nodig (vijf bondgenoten en vier kleine rollen). Stemregels volgen de personagebijbel; elke nieuwe spreker krijgt een naamkaart bij de eerste ontmoeting.

| Wie | Rol | Boog | Stemregels | Hoe en wanneer geïntroduceerd |
|---|---|---|---|---|
| **Tammo** | held, echte Stadjer uit het Oosterpark | van "ik zeg niks" naar vijf woorden: "Ik wil bij jou blijven". Leert de provincie kennen; baalt dat Tessa gelijk heeft; **eigenwijs en vaak fout**; zegt het niet, maar doet het (het horloge van zijn opa) | **droog, kort, understatement; zegt wat telt in weinig woorden (meestal vijf woorden of minder, nooit meer dan acht in NIEUW-regels); wordt langer in precies drie grote momenten:** de weigering (opa in 1953, BEHOUDEN, M02), de verontschuldiging (M22) en de vijf woorden (M26); Tessa vertaalt zijn gezicht en zwijgen ("Dat gezicht betekent: ik snap het niet." "Klopt."); geen Fries | opening (M00, cutscène), naamkaart |
| **Tessa** | heldin, de baas van het duo; **Nederlandse** (niet in Stad geboren; zomers in Ljouwert naast Mem; AANNAME: geboren in Zwolle) die Friezen kent; Tammo vindt dat gek | van "regelen en niks zeggen" naar toegeven dat ze bang is nergens te blijven; **heeft vaak gelijk, soms wat saai**; ziet Tammo's signalen en plaagt ze, zonder ze als bekentenis te lezen; verzwijgt Mems appjes (haar fout) | snel, ad rem, **standaard Nederlands** (geen Gronings), "Rijden, niet praten." Opgenomen regels met een Groninger kleur blijven staan. | opening |
| **Rikus** | nacht-dj Nachtstreek, jeugdvriend, de radio | blijft vertellen; **radio is alleen wereld en duidt de relatie niet** | warm en droog | opening, radio |
| **Jelle Terpstra** | tegenstander, ijdel, nooit gemeen; **echte dief en echte bedreiger** | van kil-zakelijk ("Mijn juristen noemen het een overname") naar "foar mem" naar "ja, mem" | Nederlands met Friese woorden; elke zin is reclame of een contract; hij grijpt actief in (zie §4) | chat (M01), in persoon in M03 |
| **Mem (Gerda) Terpstra** | Jelles moeder; **neemt de bal van hem af**; appt Tessa; tekent haar jongen zijn J | wil dat hij ophoudt; haar eierbal was beter; neemt verantwoordelijkheid ("Dat was verkeerd") | stellig, Fries-getint in appjes en vroege scènes; **in de finale Nederlands** voor de emotionele uitbetaling | appjes vanaf M07 (stil), in persoon in M20 |
| **Oma Trijntje** | mentor, 92, bakte in 1953 de beste (volgens haar) | zegt eindelijk: "Gerda. Jouw eierbal was beter." | warm, stellig | M08 (naamkaart) |
| **Mevrouw Hoving, de Bewaarder** *(nieuw, klein)* | bewaarder van de Gouden Eierbal en bij traditie voorzitter van de jury (artikel 4); wordt door Jelle met een gratis treinreis aan de kant gezet (M03, M18, M19) | vast; komt niet in de finale (zij zit in de museumtrein, artikel 9: Berend) | beleefd, oud, formeel | M03 (naamkaart) |
| **Durk en Douwe** | Jelles tweeling, "…Hè." | lopen over in M23 | traag, synchroon | M02 |
| **Berend Bos** | Bommen Berend, jurylid; **getaway-chauffeur** van de grannies ("Nul krassen. Op de heenweg.") | stiekem trots; gaat na de Snackprijs naar de politie | nors, korte zinnen, "Goidag"; "Je kijkt vaker naar die telefoon dan naar de weg. Hij komt wel." | M01 |
| **Duivenmelker Bert** | mentor-duif | kijkt toe | zacht, wijs | M04 |
| **Sjabbe** | pandhouder; **terugkerende bondgenoot**: telefoonstem in M02-M06 (hints), M18 (cameo), M22 (neemt Tammo's horloge in pand), M25 en M26 (de tip over de notaris) | vast | droog, kort, "Ik vraag niks. Ik zeg alleen:…" | M02 |
| **Sjoerd, Henk, Jelmer, Geert, Klaas, Dijkstra, Rotor Roelf** | bestaande bijrollen, ieder met één missie | vast | zoals de bijbel | M05, M06/M22, M01, M16, M11, M12 |
| **De torenwachter** | stem aan de telefoon, "Ik meld alleen." (exact drie keer: M01, de radio in M24, M26) | in de finale: "Ik meld niet alleen. Ik klap." | oud, droog | M01 |
| **Geesje** *(nieuw)* | kosteres, 84, schoolvriendin van Oma; eieren | bondgenoot | warm, nuchter | M09 |
| **Lammert** *(nieuw)* | havenmeester, danste in 1953 met Oma | bondgenoot, schuilplaats | kort, ironisch: "De kraan piept. De bewaker kijkt bij het tweede piepje omhoog." | M13 |
| **Roelfien** *(nieuw)* | graanboerin en vlieger, Oma's nicht | bondgenoot | vrolijk, praktisch: "Vlieg laag, houd de molen rechts en trek pas op na de kermis." | M15 |
| **Wubbo** *(nieuw)* | brugwachter | bondgenoot | rustig, praktisch: "Elf bruggen. Ik open ze op het ritme van de fanfare. Mis je de maat, dan wacht je." | M17 |
| **Tinus** *(nieuw)* | trekkertrekker, re-enactor | bondgenoot, lift | joviaal: "De modder pakt eerst de auto. Dan pas je plannen." | T4 (in de bus), M22 |
| **Kapitein Klaas** | visser, schipper | bondgenoot | droog: "Tot de sluis. Daarna is het open water en ben je voor eigen rekening." | M11 |
| **Loketbediende, Accountmanager, Jurylid, Buschauffeur, Kustwachter, Kermisexploitant** *(nieuw, klein)* | satire-rollen | vast | droog bureaucratisch | M03, M18, M15/M19/M26, T2, M11, M16 |

**Tessa is Nederlands, niet Gronings** (besluit van de eigenaar): ze groeide op op zeven plekken en logeerde elke zomer in Ljouwert, in het huis naast Mem. Zo kent ze Friezen, pompeblêden en Mems handschrift. Tammo, die nooit ergens anders woonde dan in Stad, vindt dat gek ("Jij? Fries?"). Al haar nieuwe regels zijn standaard Nederlands.

**Geschrapt of samengevoegd:** Femke (H7), Harm (H9), Hilly, Hilje, Boer Roelf. Rotor Roelf blijft een stem (telefoon) in M12.

## 3. De vijf akten

| Akte | Regio | Missies | Reisbeats | Tijd (incl. reizen) | Dagen |
|---|---|---|---|---|---|
| **1 · Moi, Grunn** | Stad | 6 (M01-M06) | 0 | 62 min | vr 14 - ma 17 aug |
| **2 · Het Noorden is groot** | Stad, Hogeland, Waddenzee | 5 (M07-M11) | 2 (trein Winsum, bus Zoutkamp) | 55 min | di 18 - do 20 aug |
| **3 · Aan de Eems** | Eemsdelta, Oldambt, de Dollard | 5 (M12-M16) | 1 (trein Winschoten) | 55 min | vr 21 - zo 23 aug |
| **4 · Zuidwaarts** | Veenkoloniën, Westerwolde (Bourtange), Westerkwartier | 5 (M17-M21) | 1 (bus Bourtange) | 58 min | zo 23 - wo 26 aug |
| **5 · Ontzet** | Westerkwartier, Stad | 5 (M22-M26) | 0 | 47 min | wo 26 - vr 28 aug |
| **Totaal** | **alle 7 regio's + Stad** | **26** | **4** | **277 min = 4:37** (bandbreedte 4:00-5:10) | |

**Van 30 naar 26 missies (de vier samenvoegingen):** M01 + M03 (Berends bakkie wordt voor de stunt gebruikt en moet zonder kras terug), M12 + M13 (skûtsje-afleiding en zout in één kustmissie, met sluipen langs de kustwacht), M17 + M19 (kroegentocht en één rit botsauto's waarin Durk en Douwe de informatie weggeven, met de kus), en M23 (de vestingbus) wordt een reisbeat met relatiegesprek. Elke regio houdt minstens één verplichte hoofdmissie (Stad, Hogeland, Waddenzee, Eemsdelta, Oldambt, Veenkoloniën, Westerwolde, Westerkwartier).

**Schatting:** gemiddeld 7 minuten per missie (de samengevoegde missies 11-14 minuten), plus 1-2 minuten scène per missie, plus ca. 60 minuten gecompresseerde reizen. **AANNAME:** dit is geschat uit de lengte van de bestaande missies; niemand heeft het gespeeld.

**Heldenreis:** gewone wereld en roep (A1: M01-M04), drempel (M06 kraak), beproevingen en bondgenoten (A2-A3), middenpunt (M16: "hij heeft hem echt, onder het kussen van de limo", en de kus), verdieping (A4), **dieptepunt (M20-M21, twee solodelen)**, wederopstanding (M22 knuffel), finale (M26).

### Kalender (STEP_DATES, aangepast)

| Dag | Datum | Missies | Bijzonder |
|---|---|---|---|
| 1 | vr 14 aug | M01 (+ optioneel EIKEA) | Kiezelweek (verzonnen introweek) |
| 2 | za 15 | M02 (07:30), M03 (10:00-12:00) | Loket open tot twaalf |
| 3 | zo 16 | M04, M05 | Kiezelrace |
| 4 | ma 17 | M06 (nacht) | de kraak |
| 5 | di 18 | M07, M08, trein naar Winsum | |
| 6 | wo 19 | M09, M10 | |
| 7 | do 20 | bus, M11 (middag en nacht) | het Plantsoenfestijn opent (op de radio; verzonnen festival) |
| 8 | vr 21 | M12, M13 (nacht) | Zomerkermis opent in Stad (radio) |
| 9 | za 22 | M14 (zonsopgang), trein, M15, M16 (avond) | **Kermis in Winschoten (nieuw: za 22 - zo 23; staat nu op di 29 sep)** |
| 10 | zo 23 | rustdag: reis naar Veendam, radio, appjes | |
| 11 | ma 24 | M17, M18, M19 | |
| 12 | di 25 | bus naar Bourtange (20:15), M20 (avond en nacht), M21 Tessa (nacht) | **Beleg van Bourtange (nieuw)** |
| 13 | wo 26 | M21 Tammo (ochtend), M22 | |
| 14 | do 27 | M23, M24, M25 (nacht) | |
| 15 | **vr 28 aug** | **M26, Gronings Ontzet** | |
| 29 | **vr 11 sep** | epiloog (twee weken later) en slot; daarna loopt de open wereld door | |

**Tegenstrijdigheden uit FLOW-ANALYSE §3.4, opgelost:** (a) `r-avond` en H13 stonden op dezelfde dag: beide geschrapt als hoofdstap. (b) `s-boot` ("vandaag") op ma 24 en H14 op di 25: `s-boot` opgegaan in M11. (c) Jelles ballon "vanavond" terwijl H15 de volgende dag was: de ballon vliegt nu overdag, M12 op dezelfde dag. (d) `r-kermis` "wordt opgebouwd" terwijl de kermis opent: de botsauto's spelen nu op een andere kermis (Winschoten). (e) **Nieuw opgelost:** het Loket (za 10:00-12:00) kwam na de stunt "zaterdagavond": de stunt valt nu op vrijdag, het pinnen en het Loket op zaterdag. **Constitutie 3 (altijd zomer):** de epiloog gebruikt geen koude of winterregels; Tessa zegt "Het is tweeëntwintig graden." (besluit van de eigenaar). **Constitutie 2 (geen echte merken of organisaties):** de introweek heet in de speltekst "Kiezelweek" (met "Kiezelcommissie" en "Kiezelrace"; code-ids als `kei` en `KEI_ROUTE` blijven intern), het festival "het Plantsoenfestijn".

### Tijdlijn per reisbeat

Elke reis heeft een vertrek, een bestemming, een reden en een aankomst; dit is de bron voor `STEP_DATES` en de reisplanner van #97. Afstanden zijn geschat (AANNAME).

| Beat | Van | Naar | Reden | Vertrek | Aankomst | Datum |
|---|---|---|---|---|---|---|
| opening | Oosterparkwijk | Paddepoel | verhuisdag | 08:30 | 09:00 | vr 14 aug |
| T1 trein | Station Grunn | Winsum (17 km) | Oma stuurt hen naar Geesje | 16:40 | 16:55 | di 18 aug |
| los | Winsum | Warffum (12 km), overnachten bij Geesje | de eieren | 17:15 | 17:30 | di 18 aug |
| M10 | Usquert | Uithuizen (6 km, quad) | Jelle schudden | 14:00 | 14:10 | wo 19 aug |
| T2 bus | Uithuizen | Zoutkamp (30 km) | Klaas wacht | 11:00 | 11:35 | do 20 aug |
| M11 | Zoutkamp | Lauwersoog, Noordpolderzijl en terug (boot, wad) | skûtsje, dan het zout | 13:00 | 23:30 | do 20 aug |
| M12, één keten zonder terugvlucht | Lauwersoog | UMCG (35 km, lunch) | Dijkstra's lunch | 08:00 | 08:20 | vr 21 aug |
| | UMCG | de Dollard (45 km, ballon, tas losknippen) | het koopboek | 08:35 | 09:15 | vr 21 aug |
| | de Dollard | Eemshaven (helidek, 40 km) | afzetten; M13 begint hier | 09:20 | 09:45 | vr 21 aug |
| M13 | Eemshaven (de kade, geen reis) | container 4471, daarna slapen in Lammerts havenkantoor | container 4471 | 21:00 | 21:00 | vr 21 aug |
| M14 | Eemshaven (havenkantoor, geen reis) | de race over de dijk naar de sluis van Delfzijl (8 km spel) | de deurwaarder om 08:00 | 06:30 | 07:00 | za 22 aug |
| T3 trein | Delfzijl | Winschoten (35 km) | de kermis | 10:30 | 11:05 | za 22 aug |
| M15 | Winschoten | Roelfiens strook (4 km), vliegen over de kermis (4 km) | het spandoek | 13:30 | 14:20 | za 22 aug |
| M16 | de kermis | de dijk | tenten, botsauto's, zonsondergang | 18:00 | 21:00 | za 22 aug |
| rustdag | Winschoten | Veendam (17 km, bus) | plakje zeven | 11:00 | 11:25 | zo 23 aug |
| M17-M19 | Veendam | Wiebelwerk (2 km), Stadskanaal (20 km, taxi of skip) | mosterd, logboek, de trein | 09:00 | 15:15 | ma 24 aug |
| los | Stadskanaal | Ter Apel-bos (22 km, Berends bus) | Berend belt | 18:00 | 18:25 | ma 24 aug |
| T4 bus | Ter Apel-bos | Vesting Bourtange (12 km) | het Beleg om negen uur | 20:15 | 20:59 | di 25 aug |
| M21 Tessa | Bourtange | Zuidhorn (65 km, Berends bakkie) | de trein stopt om middernacht bij de overweg (Mems stille appje) | 23:15 | 00:00 | di 25 / wo 26 aug |
| M21 Tammo | Bourtange | Tinus' schuur (65 km, Tinus' trekker) | de vrienden worden bij de schuur verwacht | 23:30 | 02:30 | di 25 / wo 26 aug |
| M23 colonne | Tinus' schuur | Aduard (12 km), Grote Markt (8 km) | het Ontzet | 08:30 | 08:55 | do 27 aug |
| finale | Grote Markt | Oude Boteringestraat (0,5 km) | notaris sluit om drie uur | 14:45 | 15:00 | vr 28 aug |

**De route van de Escapade (één keuze):** de trein is een goederentrein op de lijn Groningen-Leeuwarden, via Zuidhorn en Grijpskerk, dus de wagon met de Escapade wordt bij Zuidhorn aangekoppeld en rijdt van daar richting Ljouwert. Mems stille appje zegt waar de trein stopt (de overweg in Zuidhorn, om middernacht); Henks piepje bevestigt het. Alles wat daarna gebeurt, volgt daaruit.

## 4. Verhaal en romantiek per onderdeel (de grote tabel)

*Romantiek* en *actie* zijn 1-10. **Functie** = de ene taak van de missie in de keten: **(1)** inschrijving of financiering, **(2)** een plakje van Jelle blokkeren, **(3)** de waarheid over de bal ontdekken, **(4)** de Fjord Frituur en het recept gereedmaken. Een missie zonder functie wordt samengevoegd of een zijmissie (daarom is M23 een reisbeat geworden). **Jelle grijpt in** = het mechanische gevolg van zijn actieve rol. **Romantiek-trap** (volgorde van de eigenaar): handen (M06) → lange blik (M11) → eerste voorzichtige flirt (M14) → eerste kus (M16) → knuffel en openbaring (M22) → stel, vijf woorden (M26).

| Nr | Akte | Titel | Regio / plaats | Functie | Plotbeat (oorzaak en gevolg) | Jelle grijpt in | Romantiekbeat (R) | A | Voertuig / mechaniek |
|---|---|---|---|---|---|---|---|---|---|
| M00 | 1 | Opening en verhuisdag | Stad | | het doel wordt hardop gezegd; Rikus noemt de Fries | | "als huisgenoten, Tammo" (1) | 0 | cutscène |
| M01 | 1 | Nul krassen, vijftienhonderd punten | Stad, Martinikerkhof - Grote Markt - Boterdiep | 1 | stunt voor 150 euro (inschrijving), het bakkie ongekrast terug (50 euro); de chat leest "JelleWâld" | | Tammo is jaloers op een chatbericht (3) | 6 | bakkie, `stunt` + `deliver` |
| M02 | 1 | Even pinnen | Stad, Herestraat, Pand & Poen | 1 | pas terug, contant geld; Sjabbe: de reuzen kopen alles voor frituren | | opa in 1953: de weigering (2) | 7 | auto, `escape` |
| M03 | 1 | Het Loket | Stad, Het Loket | 1 | inschrijven; **Jelle in persoon, kil**; artikel 4 en 9; mevrouw Hoving; salamitactiek; plakje 1 definitief van Jelle | koopt de rij (klok 4093 → 4140) | Tammo bewondert haar loketkunst (3) | 2 | te voet, loket |
| M04 | 1 | Kieken van boven | Stad, Stationsplein - museum | 3 | bewaker twee krijgt een eierbal voor zijn koekje | | "Mijn vriend de duivenkoning" (3) | 4 | duif (signature) |
| M05 | 1 | Wind tegen, beide kanten op | Stad, binnenstad | 3 | de drie minuten; **besluit: eerst pakken, als bewaking** | | **oogcontact** op het kruispunt (5) | 7 | fiets, race |
| M06 | 1 | Het museum stond er al zo | Stad, Groninger Museum | 3 | **vitrine leeg onder een doek: "Tige tank! – J."**; Jelle zegt op de radio dat de bal bij hem is (waar) | | **eerste handaanraking** "Voor de grip" (6) | 8 | te voet, `heist` |
| M07 | 2 | Al het vet van Grunn | Stad, Oosterpoort | 2 | plakje 2 (vet) gered; **publieke redding**: de hele stad met lege pannen | **koopt de Europaweg dicht** (route springt om), zwaartepunt | Mems eerste appje; "Fierljepper zeker." (3) | 8 | tankwagen, `chase` |
| M08 | 2 | Fatbikes tellen niet als fiets | Stad, Noorderhaven (Oma) | 4 | 1953, Gerda; het recept met vijf vrienden; "We halen de ingrediënten voor Oma's recept bij haar vrienden" | | "Niet tegen haar." (4) | 4 | te voet, fatbikes |
| T1 | 2 | De trein naar Winsum | Stad → Hogeland | | de provincie begint | | de zee achter de dijk (4) | 1 | trein (meerijden) |
| M09 | 2 | Heel aankomen is ook een kunst | Hogeland, Warffum - Usquert | 2 | plakje 3 (eieren); **precisie en samenwerking, geen snelheid**; zestig eieren voor het recept | **sluit de Dorpsweg, huurt een boer**: de wierdepaden vol gaten | Tessa toont koeien en wierden (4) | 3 | trekker, `deliver` |
| M10 | 2 | Een trekker-limo op de wierde | Hogeland, wierdedorpen | 3 | **Jelle heeft de bal echt**, in een gouden koffer; zijn motief: Mem | hinderlaag met chantage (de museumbeelden) | "Voor de grip. Ik heb stuur." (3) | 8 | quad, `escape` |
| T2 | 2 | De streekbus naar Zoutkamp | Hogeland → Waddenzee | | reis is inhoud | | (3) | 1 | bus (meerijden of zelf) |
| M11 | 2 | Geleend van de Friezen | Waddenzee, Zoutkamp - Lauwersmeer - wad | 2 | **bedrog:** de chocolade oefenbal; dan **tijdsdruk en het wad**: plakje 4 (zout), sluipen langs de kustwacht | | "Iedereen is romantischer dan jij." en **de lange blik**; appje onderbreekt (7) | 6 | rubberboot (signature), dan te voet |
| M12 | 3 | Het staat niet in het rooster | Lauwersoog → UMCG → Dollard → Delfzijl | 2 | het **koopboek**: acht plakjes; plakje 8: notaris, 28 augustus | | "Dank je dat je het vraagt." (5) | 6 | heli, lichte uitvoering (autopilot, stil houden, lier) |
| M13 | 3 | Het containerlabyrint | Eemshaven | 2 | plakje 5 (haven); Lammert | | "Je ademt." (4) | 5 | te voet, kraan (scripted) |
| M14 | 3 | De dijk | Eemshaven - Delfzijl | 4 | de voorraden op Lammerts woonschip veiligstellen | **deurwaarder-race**: wie eerst bij het checkpoint is | **eerste voorzichtige flirt (Tammo)**; "Tammo. Je bent rood." (6) | 8 | auto, race |
| T3 | 3 | De trein naar Winschoten | Eemsdelta → Oldambt | | | | (3) | 1 | trein (meerijden) |
| M15 | 3 | Laag over het graan | Oldambt | 2 | plakje 6: twee juryleden lopen weg; **Jelle houdt definitief de bloem** (de molen); Roelfien geeft grof meel | proeverij om de jury publiek te kopen | "Jij kijkt, ik stuur." (4) | 6 | klein vliegtuig (het enige, start op echte strook) |
| M16 | 3 | Nog eentje dan | Oldambt, Winschoten, kermis en dijk | 3 | **keerpunt:** Durk verklapt waar de bal is (de koffer in de limo); maandag Veendam | | **eerste kus** in het gebots, "Dat was omdat je bleef." (8) | 7 | te voet, botsauto |
| M17 | 4 | Open, dicht | Veenkoloniën, Veendam | 2 | plakje 7 (mosterd); Wubbo | **koopt de fanfare weg** (ritme valt weg) | "Over zaterdag." "Welke zaterdag?" (5) | 5 | sloep, bruggen |
| M18 | 4 | Wie draaide de camera's uit? | Veenkoloniën, Wiebelwerk | 3 | **bewijs:** Jelle nam de bal op 12 augustus, met bewaker twee en D en D | | Tessa legt een logboek uit (5) | 2 | e-step, kantoor |
| M19 | 4 | Stoom | Veenkoloniën, museumtrein | 2 | machinist omgekocht; twee juryleden en de Bewaarder vast; **één jurylid blijft definitief bij Jelle** | **koopt de machinist** | "Je hebt hem in een station gezet." (4) | 7 | trein (machinist), lichte uitvoering |
| T4 | 4 | De bus naar Bourtange | Westerwolde | | Tinus; "Hij komt wel."; Jelle: "Gezellige bus" | | Tessa kijkt naar haar telefoon, Tammo zit twee rijen achter haar (4) | 3 | bus (meerijden) |
| M20 | 4 | **Het beleg van Bourtange** | Westerwolde, Vesting Bourtange | 3 | **Mem neemt de bal van Jelle af; de speler houdt hem vast en ontsnapt ermee**; de ruzie; de Escapade weg | **beleggers tegen de kruitkelder, steelt de Escapade** | **het dieptepunt**: "Jij zegt nooit iets!" (3) | 9 | te voet, fierljep, `hold` |
| M21 | 4 | Iedereen heeft een rode auto gezien | Bourtange → Westerkwartier | 4 | **twee solodelen:** Tessa redt de auto en verliest de bal; Tammo faalt bij de vrienden | **pakt de bal op de wagon af, advocaten bellen de vrienden** | beiden alleen (3) | 7 | bakkie, trein; trekker, gesprek |
| M22 | 5 | Een luik erin | Westerkwartier, schuur | 4 | luik, modder, trekker; **Tammo verpandt het horloge van zijn opa** | | **verontschuldiging, knuffel en openbaring** (9) | 3 | garage, trekker |
| M23 | 5 | De colonne | Westerkwartier → Stad | 4 | alle bondgenoten rijden mee; D en D lopen over | bruggenvergunningen, limo | hand op de pook (6) | 7 | alle voertuigen (signature) |
| M24 | 5 | Er hangt iets Fries aan d'Olle Grieze | Stad, Grote Markt | 4 | de vlag hangt boven de plek van de wagen | | "Voor de grip?" "Nee. Gewoon." (7) | 5 | duif (signature) |
| M25 | 5 | Het bod viel tegen | Stad, Oma's keuken | 4 | oefenronde met grof meel; Sjabbe: de notaris om drie uur | | Oma: "Ik wilde het één keer horen." (8) | 2 | bakken |
| M26 | 5 | **Ontzet, net als in 1672** | Stad, Grote Markt en Oude Boteringestraat | 1 en 2 | de regels, **bakken**, blokkade van Jelles laatste plakje, Mem kiest eerlijk proeven, jury 4-1 | de notaris (zijn laatste plakje) | **"Ik wil bij jou blijven."** "Dat bedoelde ik ook." (10) | 10 | alles |
| E | 5 | Epiloog en slot | Stad, Vismarkt | | standplaats; Jelle houdt drie plakjes en geeft drie terug | | tweeëntwintig graden (9) | 0 | cutscène |

**Tellingen:** 26 hoofdmissies (6, 5, 5, 5, 5), 4 reisbeats, 12 nieuwe missies, 14 bestaande missies in een nieuwe plek en volgorde. Voertuigen en systemen: auto, bakkie, fiets, scooter (e-step), bus, trein (meerijden en machinist), heli (licht), klein vliegtuig (één missie), boten, trekker en quad, tankwagen, duif. **Drie signature-systemen:** de duif (M04, M24, finale), de boot (M11, M17) en de finale-colonne (M23, M26); de rest is bestaand of licht (zie 08 §3c).

### Het plakjesbord: wat Jelle wint en wat niet

| Plakje | Missie | Uitkomst |
|---|---|---|
| 1 standplaatsen | M03 | **definitief van Jelle** (hij koopt alle vrije standplaatsen; één prijs-standplaats blijft vrij) |
| 2 vet | M07 | gered |
| 3 eieren | M09 | gered |
| 4 zout | M11 | gered |
| 5 haven | M13 | gered |
| 6 bloem en jury | M15, M19 | **bloem definitief van Jelle** (de molen); twee juryleden weg (M15), één bevrijd (M19), **één definitief van Jelle** (M19) |
| 7 mosterd | M17 | gered |
| 8 de bewaarder (notaris, 28 augustus) | M26 | geblokkeerd met de wagen |

De helden winnen de finale dus niet doordat al zijn zetten vooraf zijn teruggedraaid, maar met een alternatief: grof meel in plaats van fijn bloem, vier stemmen tegen één, en een standplaats die niet van hem is. Hij houdt de standplaatsen, de molen en één jurylid, en geeft in de epiloog uit eigen beweging drie plakjes terug.

### De lopende grappen (precies drie keer)

| Grap | Introductie | Verrassende variatie | Uitbetaling in de finale |
|---|---|---|---|
| "Dat bedoelde ik ook." | M00-B1 (de Apenrots, BEHOUDEN) | M14: "Dat bedoelde ik niet." ... "…Dat bedoelde ik wel." | M26: Tessa: "Dat bedoelde ik ook." |
| "Ik zeg niks." (Rikus) | M02 (de trekker in de Herestraat, BEHOUDEN) | M06: "Ik zeg niks. Ik draai drie minuten stilte." (BEHOUDEN) | slot: "…brandt 's avonds nog maar in één slaapkamer licht. Ik zeg niks." (BEHOUDEN) |
| "Ik meld alleen." (torenwachter) | M01 (de Grote Markt, BEHOUDEN) | M24: "Iets Fries. Ik meld alleen." (BEHOUDEN, radio) | M26: "Ik meld niet alleen. Ik klap." |
| "…Plons." | M10 (Jelle in de sloot) | M20: "…Plons." en dan "…Geen plons." | M26: Jelle in de gracht |
| "Gezellig programma" | M07 (Jelle op de radio, BEHOUDEN) | T4: "Gezellige bus, jongens." | slot: Jelle vond het "gezellig" |
| de fietstunnel | M06 (2029, BEHOUDEN) | M07: "Dit is erger dan de fietstunnel." (BEHOUDEN) | M26: "2031. Hij is bijna klaar. Eerste friet is voor mij." (BEHOUDEN) |

(Tammo's eigen recorded "Ik zeg niks. Dat is ook een antwoord." in de weigering van M02 is zijn karaktermotief, niet de radiograp, en is niet aangeraakt.)

## 5. Spanningsboog: actie tegen romantiek

```
M01 Bakkie+stunt  actie ██████░░░░  6  romantiek ███░░░░░░░  3
M02 Even pinnen   actie ███████░░░  7  romantiek ██░░░░░░░░  2
M03 Het Loket     actie ██░░░░░░░░  2  romantiek ███░░░░░░░  3
M04 Duif          actie ████░░░░░░  4  romantiek ███░░░░░░░  3
M05 Wind tegen    actie ███████░░░  7  romantiek █████░░░░░  5
M06 Museum        actie ████████░░  8  romantiek ██████░░░░  6
M07 Het vet       actie ████████░░  8  romantiek ███░░░░░░░  3
M08 Oma           actie ████░░░░░░  4  romantiek ████░░░░░░  4
M09 Eieren        actie ███░░░░░░░  3  romantiek ████░░░░░░  4
M10 Wierde        actie ████████░░  8  romantiek ███░░░░░░░  3
M11 Kust en wad   actie ██████░░░░  6  romantiek ███████░░░  7
M12 Heli          actie ██████░░░░  6  romantiek █████░░░░░  5
M13 Containers    actie █████░░░░░  5  romantiek ████░░░░░░  4
M14 Dijk          actie ████████░░  8  romantiek ██████░░░░  6
M15 Graan         actie ██████░░░░  6  romantiek ████░░░░░░  4
M16 Kermis+kus    actie ███████░░░  7  romantiek ████████░░  8
M17 Open, dicht   actie █████░░░░░  5  romantiek █████░░░░░  5
M18 Logboek       actie ██░░░░░░░░  2  romantiek █████░░░░░  5
M19 Stoom         actie ███████░░░  7  romantiek ████░░░░░░  4
M20 Het beleg     actie █████████░  9  romantiek ███░░░░░░░  3
M21 Twee solo's   actie ███████░░░  7  romantiek ███░░░░░░░  3
M22 Luik+knuffel  actie ███░░░░░░░  3  romantiek █████████░  9
M23 Colonne       actie ███████░░░  7  romantiek ██████░░░░  6
M24 Vlag          actie █████░░░░░  5  romantiek ███████░░░  7
M25 Het bod       actie ██░░░░░░░░  2  romantiek ████████░░  8
M26 Ontzet        actie ██████████ 10  romantiek ██████████ 10
```

Gemiddelden per akte (actie / romantiek): akte 1 5,7 / 3,7; akte 2 5,8 / 4,2; akte 3 6,4 / 5,4; akte 4 6,0 / 4,0; akte 5 5,4 / 8,0. Totaal 5,8 / 5,0.

**Kus-timing (beslissing: de kus blijft op ca. 62%, in M16).** De kus valt aan het eind van akte 3, op ca. 62% van de speeltijd (M16 van 26; 172 van 277 minuten), de breuk in M20 op ca. 78% en de verzoening in M22 op ca. 84%: dat is de klassieke romcom-structuur (kus ruim over het midden, breuk kort voor het einde, hereniging in de finale), en een kus in M20 (het dieptepunt) zou de breuk haar tegenstelling ontnemen, terwijl een eerdere kus de romantiek te vroeg op volle sterkte laat komen. De kus is nu ruwer en midden in het gebots van de botsauto's, onderbroken door een kermisexploitant, met daarna een stille dijk, zodat hij minder als vakantiefilm voelt; de breuk (M20) en de knuffel met openbaring (M22) blijven de drager van het hoogtepunt van de romantiek. Tessa heeft Tammo's signalen gezien en geplaagd ("Tammo. Je bent rood." "Wat bedoelde je dan?") zonder ze als bekentenis te lezen; in het dieptepunt zegt ze dat ze niet kan weten wat hij verwacht als hij niets zegt, en vóór de knuffel neemt Tammo verantwoordelijkheid (het horloge).

**Kritische zelf-review**

1. **Pieken zitten waar ze horen:** de eerste kus (M16) midden in het verhaal, het dieptepunt (M20-M21) laag voor romantiek en hoog voor actie, de knuffel (M22) direct erna als contrast, en de finale (M26) bij 10 en 10.
2. **Het dieptepunt duurt nu twee missies** (M20 en M21, met twee solodelen), en het eindigt pas met de knuffel in M22: Tessa kiest de auto en verliest de bal, Tammo verliest de vrienden en kan niet praten.
3. **Variatie in akte 2:** M07 is een publieke redding (de hele stad met lege pannen), M09 precisie en samenwerking zonder snelheid, M10 een hinderlaag, M11 afleiding (de oefenbal) en dan tijdsdruk, het wad en de kustwacht. Daarmee is het geen drie keer "achtervolging".
4. **Twee missies met actie 2 staan niet vlak voor elkaar** (M03 en M18, M25): M25 is bewust rustig, vlak voor de finale.
5. **M20 draagt veel:** het beleg, de fierljep, Mems afname, het vasthouden van de bal, de ruzie. Bij meer dan 15 minuten speeltijd splitsen (08 §5).
6. **Tessa's geheim (M07 tot M20) is nu precies:** ze wist niet waar de bal lag, ze wist wel dat Mem iets voor Jelle verborgen hield en had dat tegen Tammo moeten zeggen. Mems appjes zijn stil en dramatische ironie.
7. **Het mysterie is niet meer "wie heeft de bal" maar "hoe krijgen we hem":** M10 toont de bal in de koffer, M16 verklapt waar, M20 haalt hem over, M21 verliest hem, M26 brengt hem terug.
8. **Zwakke plekken:** de Waddenzee-sluispartij en de wiebelende tijdlijn tussen Dollard en Delfzijl moeten bij de bouw worden gemeten; de Bewaarder is een extra rol (klein).

## 6. Oud naar nieuw (stappen H1-H18 en bijstappen)

Het nieuwe verhaal staat op zichzelf. De tabel laat alleen zien welk bestaand materiaal (stappen, scènes, opnames) waar terugkomt, omdat dat geld en werk scheelt. Wat niet in de tabel staat, is niet nodig voor dit verhaal.

| Oud | Nieuw | Wat en waarom |
|---|---|---|
| H1 Berend + H3 Grote Markt | **M01** | samengevoegd: het bakkie wordt voor de stunt gebruikt en moet zonder kras terug; **radio-intro van Berend en Jelmer is nu ter plekke en telefoon** |
| `k-eikea` | optioneel (06) | wereldopbouw, geen plot; verplicht maakt akte 1 te traag |
| H2 Even pinnen | M02 | behouden; Sjabbe als vaste telefoonstem; de pas bevat het geld voor het Loket |
| **nieuw** | M03 Het Loket | Jelle vroeg in beeld, kil; artikel 4 en 9; de Bewaarder; salamitactiek; het doel wordt hardop |
| H4 Duif | M04 | behouden; bewaker twee met het koekje |
| `k-fiets` | geschrapt | poortwachter; de fiets is nu Sjoerds startpakket (AANNAME) |
| H5 Fietsrace | M05 | behouden; het besluit "eerst pakken" erbij; Sjoerd ter plekke, niet via de radio |
| `k-kraakspullen`, `k-nacht` | in M06 | de wachtscène en Henks zender zitten in de intro |
| H6 Kraak | M06 | behouden; **het kaartje blijft "J."** (opgenomen), en is van Jelle; de koepel hangt onder een doek |
| `r-trein` (hideouts) | reisbeat T1 | de treinscène blijft |
| H7 Heel aankomen | M09 (mechaniek) | Femke vervalt; eieren door het Hogeland |
| H8 Vet | M07 | behouden in Stad |
| `r-tuning` | M22 | het luik inbouwen, Henk |
| H9 Ring Zuid | M14 (mechaniek) | Harm vervalt; race langs de dijk |
| H10 Vlag | M24 | verplaatst naar akte 5 |
| `r-kermis`, H11 Kroegentocht | **M16** | samengevoegd naar de Winschoten-kermis; **het keerpunt zit in de botsauto's** |
| H12 Fatbikes | M08 | verplaatst naar akte 2; krijgt het recept |
| `r-avond`, H13 Rondvaart | geschrapt/bijbaan | de kus verhuist naar M16; de rondvaart blijft als bijbaan |
| `s-boot`, H14 Skûtsje + laag water | **M11** | samengevoegd: boot en achtervolging, dan zout op het wad |
| `s-proefvlucht`, H15 Heli | M12 | de heli is ook het reisalternatief; aktetas met koopboek in plaats van ballon-bal |
| `s-carbid`, `s-padel` | bijactiviteiten | blijven minigames; "de bezigheid" zit in M20 |
| H16 Rode auto | M21 | **twee solodelen** als dieptepunt; naar het Westerkwartier |
| H17 Het bod | M25 | verplaatst naar Oma's keuken, met Mem erbij |
| H18 Ontzet | M26 | behouden als finale; wedstrijd met regels, bakken, blokkade en jury |
| (was M23 De vestingbus) | reisbeat T4 | samengevoegd met de reis: geen eigen plakje of waarheid |

**Hergebruikt waar het past:** 17 van de 18 oude hoofdmissies zijn als mechaniek of scène bruikbaar (alleen H13 gaat naar de bijbanen). **Samengevoegd:** 5 bijstappen en 4 missies. **Geschrapt:** 3 (`k-fiets`, `r-avond`, de padelstap). **Nieuw:** 12 missies.

**Nieuwe nummering (30 → 26):** oud M01+M03 → M01; M02 → M02; M04 → M03; M05 → M04; M06 → M05; M07 → M06; M08 → M07; M09 → M08; M10 → M09; M11 → M10; M12+M13 → M11; M14 → M12; M15 → M13; M16 → M14; M18 → M15; M17+M19 → M16; M20 → M17; M21 → M18; M22 → M19; M23 → T4; M24 → M20; M25 → M21; M26 → M22; M27 → M23; M28 → M24; M29 → M25; M30 → M26.

## 7. Reisplan per akte

Afstanden zijn geschat uit algemene kennis (AANNAME) en moeten met de reisplanner van #97 worden gemeten; de tijdlijn per reisbeat staat in §3. Als je elke afstand zelf zou rijden (75 km/u gemiddeld) is het totaal ruim 6 uur rijden; het ontwerp gaat daarom uit van **trein, bus, heli, boot of "skip"** bij elke regiosprong, en korte ritten (1-4 minuten) tussen opeenvolgende doelen. Elke reisbeat is een **keuze**: *meerijden* (korte scène of autogesprek), *zelf rijden*, of *skippen*.

| Akte | Regiosprongen (km, schatting) | Totaal km | Reistijd als je alles rijdt | Reistijd in het ontwerp | Keuzes en alternatieven |
|---|---|---|---|---|---|
| 1 | binnen Stad: 1,5 + 0,6 + 0,4 + 0,3 + 2 + 4 | 9 | 7 min | 7 min | te voet, fiets, scooter |
| 2 | Stad-Winsum 17, Winsum-Warffum 12, Warffum-Usquert 3, Usquert-Uithuizen 6, Uithuizen-Zoutkamp 30, Zoutkamp-Lauwersoog 9, Lauwersoog-Noordpolderzijl 14, plus 5 in Stad | 96 | 77 min | 14 min | trein Winsum, streekbus Zoutkamp, Geesjes neef brengt je |
| 3 | Lauwersoog-UMCG 35, UMCG-Dollard 45, Dollard-Delfzijl 25, Delfzijl-Eemshaven 30, Eemshaven-Delfzijl 25, Delfzijl-Winschoten 35, +8 | 203 | 160 min | 12 min | heli (Dijkstra, één keten), trein Winschoten |
| 4 | Winschoten-Veendam 17, +2, Veendam-Stadskanaal 20, Stadskanaal-Ter Apel 22, Ter Apel-Bourtange 12, Bourtange-Zuidhorn 65 | 138 | 110 min | 15 min | streekbus, Berends bus en bakkie, taxi |
| 5 | Zuidhorn-schuur 3, schuur-Aduard 12, Aduard-Grote Markt 8, Markt-toren-Oma-Markt 6 | 29 | 23 min | 20 min (de colonne is een missie) | Skip met scène |
| **Totaal** | | **ca. 475** | **ca. 6 uur** | **ca. 68 min** | |

**Luchtvaartuigen: waar ze staan (spawnregel).** Helikopters staan op echte helipads (in de repo: het UMCG-dak, Rotor Roelfs pad op Eelde (niet gebruikt in dit verhaal, want Eelde ligt in Drenthe) en het dak van het eigen huis; andere helipads alleen als ze echt bestaan), kleine vliegtuigen alleen op echte vliegvelden of -stroken in de Ommeland (Eelde en een of twee andere, nog te controleren). In de stad staat geen vliegtuig, omdat daar geen vliegveld is. Allebei mogen overal in de provincie vliegen. M12 gebruikt Rotor Roelfs heli, die op het UMCG-dak staat (Dijkstra vliegt hem naar Lauwersoog om hen op te halen; één keten zonder terugvlucht, die eindigt in de Eemshaven waar M13 begint), M15 het enige vliegtuig, vanaf de strook in het Oldambt. Spawnpunten met bronnen: zie 08-IMPLEMENTATIE.md §3b.

**De zee (besluit van de eigenaar).** De Waddenzee en de Noordzee staan op de kaart en in de wereld: een zichtbare zee met kust, kwelder en strand, ook als horizon vanaf de dijk en uit de heli. Ze hoeven niet bevaarbaar te zijn; vaarbaar zijn alleen het Reitdiep, de monding van het Lauwersmeer en de havens (M11, M17). Wie verder wil, krijgt een scène: de sluis, een zandbank of Klaas weigert ("Tot de sluis. Daarna is het open water en ben je voor eigen rekening").

**Regels (uit #97):** één regio per akte (Stad is begin en eind); 1-3 minuten tussen opeenvolgende doelen, nooit meer dan 5 minuten zonder gesprek, event of keuze; reizen is inhoud (autogesprekken, radio, kleine events); de missie geeft het voertuig; bij falen respawn je bij het doel of het laatste checkpoint, niet in Stad; ETA en route op de missiekaart; de dag eindigt in de regio waar je bent (een verhaaldag dekt de reis).

## 8. Communicatiekanalen (strikt gescheiden)

| Kanaal | Mag | Mag niet |
|---|---|---|
| **Radio (Nachtstreek)** | de wereld: nieuws, rubrieken (fietstunnel, storing, torenwachter), peilingen over de wereld (wie wint de Snackprijs), bellers die opscheppen (Jelle, na afloop van een missie), lokale grapjes | de briefing van een missie of doelen en bedragen; **de relatie duiden** (geen peiling over jaloezie, handen, kussen of "zeg het voor het vuurwerk"; alleen subtekst als wereldnieuws, zoals een lichtje in Paddepoel); **praten tijdens een missie of gesprek (de radio dimt zodra een missie begint)** |
| **Telefoon en intercom** | briefings en hints op afstand: Bert, Sjabbe, Henk, Dijkstra, Jelle die dreigt, Lammert in de kraan, Klaas op de boot | de relatie duiden |
| **Ter plekke (gesprek)** | de relatie en de directe situatie: plagen, de provincie, "alweer gelijk"; de briefing van de missie door de persoon die het aangaat (Berend, Sjoerd, Geesje) | de briefing herhalen; nieuwe plot-informatie die niet al gesproken is |
| **Appjes en sms** | alleen tekst, **stil**, geen stem; Mems appjes zijn dramatische ironie, en het appje met de plek van de trein in M21 | context die alleen via een appje komt |
| **Pop-ups** | alleen knoptips ("E om aan te spreken") | verhaal, doel of motief |

Alle scènes volgen dezelfde regel: **context in de gesproken tekst** (wie, waar, waarom nu, wat net gebeurde, wat nu), één ding per zin, eerst noemen en dan verwijzen, personages noemen elkaar bij naam, het doel wordt hardop gezegd, elke scène haakt aan bij de vorige, de grap na de uitleg. In `09` begint elke missie met die uitleg, bijvoorbeeld "We staan bij Het Loket, Tammo. Om twaalf uur sluit de inschrijving."

## 9. Wat is nieuw voor ervaren spelers

Wie het spel al kent, ziet bekende regels en mechaniek op nieuwe plekken in één nieuw verhaal. Dat levert op:

1. **De hele provincie in plaats van de stad:** 7 regio's, 15 van de 26 missies spelen buiten Stad. Bekende beats keren terug op andere plekken.
2. **Een nieuw doel en een plan dat je volgt:** het plakjesbord en het koopboek; Jelle heeft een motief en grijpt actief in.
3. **Een nieuw mysterie en een keerpunt:** Jelle heeft de bal echt; in M16 verklapt Durk waar; in M20 neemt zijn moeder hem af, en jij houdt hem vast.
4. **Een dieptepunt van twee missies vlak voor de finale** (M20-M21): de ruzie, de verloren bal en wagen, de vrienden die weglopen.
5. **Een romantische boog in zes zichtbare stappen** in plaats van één kus.
6. **12 nieuwe missies** op bestaande mechaniek (Het Loket, de brugrace, de trein, de containerkraan, de colonne) en nieuwe voertuigen (klein vliegtuig, quad, trekker, rubberboot als speedboat).
7. **Bekende regels op onverwachte plekken:** de duifvlag aan de toren in de laatste akte, de kroegentocht op een provinciekermis, de heli met een aktetas.
8. **Een finale die een wedstrijd is:** bakken, een blokkade met de eigen wagen, en een jury die stemt.
9. **Een tweede doorloop (voor later):** het plakjesbord is een bron voor speedrunmedailles; "nieuw spel plus" blijft een eigen besluit.

Voor het testen van nieuwe missies zonder het verhaal te herspelen: dev-paneel (F9, `--dev`) en `--story-test` laten stappen overslaan. Verse spelers zijn nodig voor de **luistertest** (wie, waar, waarom, wat nu): wie het verhaal kent, ziet geen ontbrekende context.

## 10. Hoe de eisen worden gehaald

| Eis | Waar |
|---|---|
| 4+ uur speelduur | §3: 4:37, bandbreedte 4:00-5:10 |
| doel en motief vanaf minuut één | opening (M00), `09-script-akte1.md` |
| oorzaak en gevolg | §4, kolommen functie en plotbeat; één functie per missie |
| vroege antagonist | Rikus in minuut 2, Jelle in persoon in M03 (kil) |
| echt dieptepunt kort voor de finale | M20-M21 (di 25 aug, finale vr 28) |
| climax die alles samenbrengt | M26 (jury, bal, duiven, wagen, Berends vuurwerk, Durk en Douwe, bondgenoten) |
| groeiboog | Tammo (zwijgen naar zeggen), Tessa (regelen naar blijven), Jelle (kil naar "ja, mem") |
| hele provincie | Stad, Hogeland, Eemsdelta, Waddenzee, Westerkwartier, Oldambt, Veenkoloniën, Westerwolde incl. Bourtange, Dollard |
| bestaande voertuigen | auto, fiets, scooter, bus, trein (meerijden en rijden), heli, klein vliegtuig, boten, trekker |
| de bal blijft centraal; "de bal is Grunn" | M08, M20, M26; Oma, Mem |
| toon | droog en kort: Tammo's understatement, "…Hè.", "Ik meld alleen." (precies drie keer) |
| Moffel-en-Piertje-ritme | `09` autogesprekken per akte; "Dat bedoelde ik ook." (drie keer, met uitbetaling) |
| romantiek in stappen | §4, de trap |
| GTA-principes, knipoog naar deel zes | de trailer-regel, twee onhandige crimineeltjes op de vlucht, Sikkom-schermen |
| indie en hergebruik | 08-IMPLEMENTATIE: 14 missies op bestaande defs, 12 nieuwe op bestaande mechaniek, drie signature-systemen, de rest licht |
| kanaalscheiding | §8 |

## 11. Besluiten van de eigenaar

De acht open vragen uit het eerste voorstel zijn beantwoord; daarna zijn drie reviews door andere taalmodellen verwerkt. Dit is wat nu geldt.

**Eerste ronde (de acht besluiten):**

1. **Eén verhaal in akten.** Wat er in het oude spel bestaat bepaalt de structuur niet; oud materiaal komt alleen terug waar het past (de regels met de tag `[BEHOUDEN]`).
2. **Het kaartje blijft exact "Tige tank! – J."** (opgenomen: `game/js/missions.js:321`, `storyarc.js`; niet opnieuw opnemen). **De twist is bijgesteld:** de J is van Jelle zelf (hij schrijft overal een bedankje onder, zijn moeder leerde hem dat); hij heeft de bal echt gestolen (12 augustus) en zijn radio-claim is waar; Mem neemt hem in Bourtange van hem af, met Oma en Berends bakkie.
3. **Tessa is Nederlands, niet Gronings.** Haar nieuwe regels zijn standaard Nederlands.
4. **Eerste kus in M16 (akte 3)** blijft op ca. 62%, onderbouwd in §5 ("Kus-timing"), ruwer en met een komische onderbreking.
5. **Voertuigen per regio zijn een spawnregel:** helikopters starten op echte helipads, kleine vliegtuigen op echte vliegvelden of -stroken in de Ommeland. Het vliegtuig is een nieuwe voertuigmodus en komt in één missie (M15); de heli, de rijdende stoomtrein en de containerkraan zijn lichter uitgevoerd (08 §3c).
6. **De Waddenzee en de Noordzee bestaan op de kaart en in de wereld**, maar hoeven niet bevaarbaar te zijn.
7. **Altijd zomer:** de epiloog zegt "Het is tweeëntwintig graden."
8. **Geen nieuwe opnames voorlopig:** alle `[NIEUW]`-regels blijven tekst.

**Tweede ronde (de Gemini-besluiten):** (1) de twist hierboven, met spelersinbreng in Bourtange en minstens drie actieve ingrepen van Jelle in akte 2-4; (2) de finale: eerst een actiebeat (de wagen blokkeert de limo, Bert blokkeert het zicht, de vrienden sluiten de weg), dan pas Mem; Jelle stopt niet vrijwillig; (3) Tammo's stem: droog en kort, alleen langer in drie grote momenten; 18 lange NIEUW-regels ingekort; (4) Sjabbe blijft zichtbaar (telefoonstem in M02-M06, cameo's); Sjoerds opgenomen regels blijven; (5) M12: Tammo steelt de aktetas uit de ballonmand terwijl Tessa de heli stil houdt; (6) M19: motief (omgekochte machinist), de speler neemt de trein over; (7) M07, M09, M11, M22: de "waarom"-regels (zwaartepunt, gaten, de modder-as); stealth langs de kustwacht; (8) kus blijft (zie 4); (9) Wiebelwerk blijft (de knipoog van de eigenaar) met een nieuw doel: het logboek van 12 augustus bewijst dat Jelle de bal eerder nam, en wie hielp; (10) alle bestanden consistent.

**Derde ronde (de Copilot-besluiten):** (A) kanaalscheiding: de radio is alleen wereld, doet geen briefings, bedragen of relatiecommentaar en dimt bij een missie; briefings zijn gesprekken of telefoon; (B) causale keten: elke missie heeft één functie (1-4), vier samenvoegingen tot 26 missies; (C) Jelle wint definitief minstens twee plakjes (standplaatsen, bloem, één jurylid) en de helden winnen met een alternatief; (D) het dieptepunt duurt twee missies (twee solodelen), Tessa's geheim is precies, Oma, Mem en Berend nemen verantwoordelijkheid; (E) finale-regels in drie korte gesproken regels (Jelle geschorst, Berend plaatsvervangend voorzitter, drie van de vijf), de finale is geen derde balroof; (F) lopende grappen precies drie keer (zie §4); (G) de kus: "Je had vandaag drie keer ongelijk. Maar je bleef wel naast me." "Dat deel kan ik." en "Dat was omdat je bleef."; (H) productie: drie signature-systemen (duif, boot, finale-colonne), het vliegtuig voor één missie, heli, stoomtrein en kraan licht; (I) onderscheiden stemmen voor de bondgenoten; (J) contextregels toegevoegd.

**Vierde ronde (de ChatGPT-besluiten):** (1) de finale als echte wedstrijd: bakken, de kraam bewaken, presenteren; Berend noemt één concreet verschil (glad tegen een korrel) en de twee aparte dingen (beste eierbal wint de standplaats; de Gouden Eierbal gaat terug naar het museum) worden gesproken; (2) economische logica hardop: Jelle koopt ook voorraad en jury zodat niemand anders kan beginnen, één officiële standplaats blijft vrij, en Tessa en Tammo moeten met Oma's recept kunnen meedoen; (3) de Bewaarder is één rol met één naam, mevrouw Hoving, in M03 geïntroduceerd, door Jelle aan de kant gezet (treinreis, geblokkeerde pas), en in de finale geldt de schorsingsregel in plaats van "Ik ben de bewaarder"; (4) continuïteit: tijdlijn per reisbeat (§3), één route voor de Escapade, de heli-keten, B5 en A5 op de datum waarop ze gebeuren, de epiloog twee weken na het Ontzet (vr 11 september); (5) verzonnen namen voor echte organisaties (Kiezelweek, het Plantsoenfestijn); (6) stemmen en regels bijgesteld: geen Groningse spreuk voor Tessa, geen logica-gat over de politie, Jelle "wil dat we hem onderschatten", Tammo's "Ik heb twaalf jaar niks gezegd", Wubbo en Tinus eigen regels, Rikus doet niet aan relatiecommentaar; (7) romantiek: Tessa ziet de signalen, Tammo neemt vóór de knuffel verantwoordelijkheid (horloge), de stilte na de kus blijft; (8) structuurvariatie in M07-M11.

## 12. Hoe te beoordelen (checklist: 10 ja/nee)

Zet een vinkje bij "ja". Een verhaal dat minder dan 8 vinkjes heeft, moet worden herzien voor het wordt gebouwd.

- [ ] Is het doel duidelijk in de eerste 10 minuten (winnen op 28 augustus, een standplaats, de Fjord Frituur)?
- [ ] Weet je na M03 wie de tegenstander is, wat hij wil en hoe hij het doet (de salamitactiek), en dat hij kil en echt een bedreiging is?
- [ ] Is er een echt dieptepunt vlak voor de finale (M20-M21), waarin Tammo en Tessa echt ruzie hebben, de bal en de wagen kwijtraken en elk alleen verder gaan?
- [ ] Is de finale (M26) een climax die alle draden samenbrengt (jury, bal, duiven, wagen, Berends vuurwerk, Durk en Douwe, de bondgenoten, de vijf woorden) en is het een echte, begrijpelijke wedstrijd zonder derde balroof?
- [ ] Is er een zichtbare boog voor Tammo (van zwijgen naar zeggen) en voor Tessa (van nergens blijven naar blijven)?
- [ ] Komen alle zeven regio's, Stad en Bourtange voor, zonder dat reizen aanvoelt als tijd zitten uitzitten, en klopt de tijdlijn?
- [ ] Loopt de romantiek in zichtbare stappen (hand, blik, flirt, kus, knuffel, stel) en komt het moment "Ik wil bij jou blijven" verdiend?
- [ ] Is elke scène te volgen op de gesproken tekst alleen (wie, waar, waarom nu, wat nu), zonder contextkaartjes?
- [ ] Houden radio, telefoon, gesprek, appjes en pop-ups zich aan hun eigen kanaal?
- [ ] Is er voor spelers die het oude verhaal kennen genoeg nieuws (nieuwe plekken, een nieuwe twist, 12 nieuwe missies)?
