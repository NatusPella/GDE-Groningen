# Audit speelbaarheid 23-11

Rol: een ervaren gameplay- en leveldesigner die als speler kijkt. De vraag bij elke stap, bijbaan en elk systeem: wat wil ik weten, wat is mijn doel, wat is het belangrijkste en wat heb ik nodig om verder te kunnen. Dat moet altijd beantwoord zijn, maar zuinig: één kort werkwoordelijk doel, aanwijzingen in de wereld (route, markering, NPC), hints die pas komen als de speler vastzit (tijd en positie), details op aanvraag (Te doen, het appje).

Branch `audit-speelbaarheid-23-11`, vanaf `origin/main` (v0.65.0). Er zijn nog geen issues aangemaakt; de coördinator zet de punten met label `bug` of `wens` op het bord.

## Wat is gedaan en wat niet

Gedaan, uit data en code (er is niets gespeeld en geen Electron gestart):

- De bestaande audits gedraaid, ook met de echte wereld en de stadscache uit de hoofdmap van de repo (alleen gelezen): `verhaal_keten_audit` (71 stappen, 0 blokkerend, 3 let op), `verhaal_systemen_audit` (83 ok), `missiongoals_audit` (27 markers, 0 problemen), `missie_haalbaarheid_audit` (9 missies met een klok, 0 afwijkingen), `missiebalans_audit`, `coopmissie_audit`, `coop_coverage_audit`, `verhaal_tempo`, `verhaal_onthulling`.
- Alle 71 stappen langsgelopen op doel, volgende stap, afstand tot de vorige plek en lengte van het appje (tabel onderaan).
- Vier agents lazen parallel de verhaalmotor, de missiedefinities, de bijbanen en minigames, en de Samen-spelen-paden. Hun bevindingen heb ik daarna tegen de code gehouden: wat niet klopte staat onder "Verworpen"; wat alleen een agent zei en ik niet terugvond staat als "niet geverifieerd".

Niet gedaan en niet gezien: geen enkele missie, bijbaan of minigame is gespeeld; geen beeld, geen geluid, geen gevoel van tempo of moeilijkheid; Samen spelen is niet met twee vensters geprobeerd. Alles hieronder over "saai" of "te moeilijk" is dus een vermoeden uit getallen. De mensen-test blijft nodig.

## Gevonden en gefixt in deze branch

| Ernst | Systeem | Probleem | Fix |
|---|---|---|---|
| A | Doelbalk, kaartlabel, wegwijzer, herinnering | De balk las de TITEL van de stap. De speler zag "Ga naar: Het museum stond er al zo", "Ga naar: Fatbikes tellen niet als fiets", "Ga naar: Wind tegen, beide kanten op". Een titel is een grap, geen doel; de plek stond alleen in het lange appje. De herinnering na vijf minuten zei "Nog even dit: Het museum stond er al zo." | `game/js/stepdoel.js`: per stap één werkwoordelijke zin van hoogstens 44 tekens met de plek erin ("Praat met Berend bij het Martinikerkhof", "Ga naar het museum: pak de bal"). `story.js` gebruikt hem voor `storyGuide.name` (balk, kaart, wegwijzer in de wereld) en voor de herinnering. `scripts/stepdoel_test.mjs` keurt af: een stap zonder doel, een doel boven 44 tekens, een doel dat de titel is en een doel waar de balk er nog een "Ga naar:" voor zou zetten. Een nieuwe stap zonder regel valt terug op de titel en breekt de test. |
| B | Hulp bij vastzitten | De positie- en tijdgestuurde kaart "De weg kwijt?" werkte alleen voor het eerste doel (`missionsDone === 0`) en zweeg zodra de vijf uitlegkaarten gezien waren. Wie na de eerste missie dwaalde of stilstond kreeg alleen het tijdsappje (5, 15, 30 minuten). | `onboarding.js`: de kaart geldt voor elke verhaalstap (200 m afdwalen of 90 s zonder 20 m vooruitgang), één keer per latere stap (het eerste doel houdt er twee), ook na de vijf kaarten; uit met de schakelaar Uitleg-tips. `firststeps_test` bijgewerkt. Niets wordt opgeslagen en niets gaat over het net. |
| C | M17 Open, dicht | De regelkaart zei "zeven minuten voor alle elf" met een teller van 420 s, terwijl elk deel een eigen klok heeft (190, 130, 130 en 100 s: samen ruim negen minuten; de klok staat in de balk). | Kaarttekst noemt de eigen klok per deel, teller op 190. |

Samen spelen voor de twee eerste fixes: de verhaalstap is van wie het spel opende; een gast heeft geen eigen verhaalstap, dus geen doel in zijn balk en geen herinnering (de gastkaart krijgt doelen via het EXTRA-bericht). Er hangt geen beloning of voortgang aan en er gaat niets over het net.

## Gerangschikt: open punten

Status: **geverifieerd** (in de code teruggevonden), **niet geverifieerd** (alleen door een agent genoemd of uit een auditrapport afgeleid).

| # | Ernst | Missie of systeem | Probleem | Voorstel | Status |
|---|---|---|---|---|---|
| 1 | A | M11 "Naar Noordpolderzijl" (Samen spelen) | De stap heeft als enige in het spel een `warp` (`missions_akte2.js:55`). `warpPlayer` (`missions.js:2745`) zet alleen de hoofdspeler en de metgezel neer; een gast die J zei blijft in Zoutkamp en ziet de volgende stappen (moeras, zoeklicht) kilometers verderop. De stap loopt door omdat één meespeler genoeg is, dus de gast speelt niets meer van dat stuk. Geen regel in `docs/COOP-GAST.md`. | De host stuurt bij een `warp` een bericht met de bestemming en de gast zet zijn eigen lichaam neer (zoals bij een hostwissel); zonder bericht: de stap `iedereen` laten wachten tot de gast erbij is. Eén regel in COOP-GAST.md en een test in `coopmissie_test`. | geverifieerd in de code, niet gespeeld |
| 2 | A | Samen spelen: scène- en vliegtuigstappen | `coopmissie_audit` meldt stappen met `[V?]` (scène- en verplaatsstappen waar uit de bron niet vast te stellen is of een tweede speler meegaat: M03, M06, M11, M18, M23). Een agent noemde ook M15 (vliegtuig: `tryBoardPlane` leest één lichaam). | Eén keer met twee vensters spelen. Bij M15 kiezen: de gast kijkt mee (toeschouwer met kaart) of vliegt mee. | niet geverifieerd |
| 3 | B | Lange stukken zonder gebeurtenis | Hemelsbreed tussen opeenvolgende stapplekken (tabel): M13 43,5 km vanaf M12, M21 58,8 km, T5 46,7 km, F6 47,8 km, N9 34,1 km, J5 31,0 km, T4 23,9 km, M18 23,2 km, T3 22,4 km. Reis-stappen (T, N) hebben een reisscène of keuze; de missiestarts M13, M17, M18, M21, M27 niet. De OV- en taxihint (`ovhint.js`) komt hooguit één keer per 10 minuten en vier keer in totaal; wie hem negeert rijdt tientallen minuten door een leeg landschap. | Bij een missiestart verder dan 20 km: de hint de eerste keer direct, en de radio (Rikus) of een autopraat-regel halverwege. Geen nieuw systeem. | afstanden geverifieerd; of er autopraat valt is niet gespeeld |
| 4 | B | Missiebalans (`missiebalans_audit`) | Sprongen in het aantal speelbare stappen: M19 (2) naar M20 (14) naar M21 (3); M05 (0) naar M06 (10); M29 (2) naar M30 (10). Beloning per speelbare stap loopt uiteen: M22 "Een luik erin" €300 voor 7 stappen, M06 €400 voor 10, tegen M12 €1.500 voor één heli-stap. | Beloning aan de duur koppelen (M22 en M06 omhoog, of M12 omlaag), na een playtest: de audit zegt zelf "geen eindvonnis". | geverifieerd (audit), niet gespeeld |
| 5 | B | Geld in het verhaal | Het verhaal kent één kost (M03, €150) en betaalt in het slechtste geval door tot €24.550 aan het eind van akte 5 (`computeMoneyTimeline`). Vanaf akte 2 is geld in het verhaal nooit een beperking; de enige winkelstap is M05 (fiets). Geen softlock, wel een spanningsloos stuk. | Geldsinks zitten in Bezit, Boerderij en voetbal en die staan pas open vanaf akte 3 en 4; overweeg een eerder zichtbaar doel om voor te sparen. | geverifieerd (tijdlijn) |
| 6 | B | Onthullen per akte, niet per stap (`unlockgate.js`) | `worldOpen` vergelijkt alleen de akte (`part`); het register kent wel de stap (`step`). Daardoor staan landbouw en boerderij open vanaf M07 terwijl het verhaal ze bij M10 en A1 noemt, en hengelen en de bus vanaf M07 terwijl N6 en T2 later komen. De speler heeft dan een menuonderdeel zonder uitleg. | `worldOpen` ook op `step` laten kijken waar die er is (een bestaande save houdt alles open: migratieregel). De poort is gedeeld met Bezit en voetbal en volgt een besluit van de eigenaar (aktes ontgrendelen werelden, 21-11): daarom niet aangepast, eerst vragen. | geverifieerd in de code |
| 7 | C | Voorschot (`story.js:442`, `storyshop.js`) | Er bestaat een voorschot-mechaniek voor aankopen die het verhaal vraagt, maar geen enkele stap heeft `voorschot`. De enige kost (M03) vangt een tekort zelf op met `pay` en `payShort` (Tessa legt bij). Code zonder gebruiker. | Laten staan voor een toekomstige aankoopstap of schrappen. | geverifieerd |
| 8 | C | Lange appjes | Appjes (het `lead` van een stap) van 25 tot 31 woorden: J1 en W2 (31), M18 (30), T4 (29), N9 en M20 en M27 (26 tot 27), M08, M19, M22, M26 en J5 (25 tot 26). Nu de balk het korte doel draagt kunnen ze details op aanvraag zijn (Te doen). | Eerste zin = doel, tweede = waarom; later een drempel van 30 woorden in `stepdoel_test`. | geverifieerd |
| 9 | C | "De weg kwijt?" tijdens een reis | De kaart geldt niet tijdens bijbaan, spel of eigen doel (`busy`); of een treinreis of busrit tijdens een reis-stap ook als bezig telt is niet nagelopen. | Bij de volgende speeltest op de kaart letten tijdens een treinreis. | niet geverifieerd |
| 10 | C | M17 Open, dicht | Faalt het eerste deel na 190 s, dan begint de speler het hele stuk opnieuw (kaart: "begin je opnieuw"); er is geen checkpoint per deel. | Checkpoint na deel 2 overwegen. | geverifieerd (klok en kaart), niet gespeeld |
| 11 | C | Overslaan | Een missie overslaan kan pas na één mislukking, 90 s met een tekort of 360 s vast (`story.js:1065`), een activiteit na 300 s. Dat is zuinig en bewust. Wie overslaat krijgt 50 procent van de beloning en mist de keuzes van die missie (M23: bondgenoot, M26 leest ze). | Controleren dat M26 een standaardbondgenoot heeft als M23 is overgeslagen. | niet geverifieerd |

## Wat de wereld-audit zegt

`verhaal_keten_audit` met de echte wereld: 3 "let op", geen blokkerende. N9 (de dijk bij de Dollard) heeft pas een weg op 366 m, maar de aankomststraal is 600 m: bereikbaar. J5 (Stadskanaal) en M20 (startplek) liggen niet op open grond; de speler wordt 5 m verschoven. Geen actie nodig.

## Verworpen: wat de agents zeiden en niet klopt

Opgenomen zodat niemand het opnieuw "ontdekt".

- "Een reisdoel dat de speler al bereikt had telt niet": `reis.met` meet de afstand elke tik; staat de speler er al, dan telt het meteen.
- "`rt.gate` blijft over een mislukking staan": `refreshGuide` herberekent hem elke 2,5 s.
- "Een stap met `waive: 'night'` blijft hangen": `skipCurrent` roept `markDone` altijd aan.
- "Een overgeslagen stap stuurt zijn contactregels niet": `queueContacts` staat achter `!quiet`, niet achter `!skipped`.
- "`GOALS` mist de goal-typen van storyfun en eikea": `initStory` voegt ze samen met `Object.assign`.
- "45 scènes warpen alleen de host": er is één `warp` (zie #1).
- "De klokken per brugdeel van M17 zijn onzichtbaar": de klok staat in de balk (`missions.js:2348`).
- "Een bijbaanvoertuig dat blijft staan blokkeert de volgende klus": het blijft een gewoon voertuig; geen softlock.
- "Een geldlus via `quitSideJob`": niet teruggevonden in de code; niet gespeeld.

## Nieuwe statische controles

- `scripts/stepdoel_test.mjs`: elke stap met een plek heeft een kort doel (maximaal 44 tekens) dat met een werkwoord begint en niet de titel is.
- Aanbevolen vervolg, nog niet gebouwd: (a) lengte van het appje (maximaal 30 woorden) zodra de teksten zijn ingekort; (b) elke `warp` in een missie hoort een gastregel te hebben (grep in `coopmissie_audit`); (c) afstand tussen opeenvolgende stapplekken boven 20 km vraagt een reisscène of autopraat-regel (de tabel hieronder is de eerste versie; hij is gemaakt met de wereldlader van `scripts/verhaal_keten_audit.mjs`).

## Per stap: doel, volgende stap, afstand

De kolom "Nieuw doel" is wat de balk nu toont. Elke stap met een plek heeft een werkwoordelijke zin met de plek erin; de speler hoeft niets te lezen om de volgende stap te weten: de gele route wijst, het kaartlabel noemt hetzelfde. Het appje blijft er voor wie meer wil weten. "ver" is meer dan 15 km hemelsbreed vanaf de vorige plek (zie #3); "appje lang" is boven 30 woorden (zie #8). Stappen zonder plek (M00 en E) zijn film en tonen geen doel. Hoe het met minder tekst beter kan: de balk zegt alleen het doel, gevolgd door de "Volg de gele route"-regel; geen tweede zin, geen telling; het appje en Te doen dragen de details; de hint "De weg kwijt?" en de tijdsappjes komen pas bij vastzitten.

| Stap | Titel (oud doel) | Nieuw doel in de balk | km vanaf vorige | woorden appje | Opmerking |
|---|---|---|---|---|---|
| M00 | Opening: verhuisdag | - |  |  |  |
| M01 | Nul krassen, vijftienhonderd punten | Praat met Berend bij het Martinikerkhof |  | 14 |  |
| M02 | Even pinnen | Ga naar de pinautomaat in de Herestraat | 0.4 | 10 |  |
| N1 | Een klus voor Sjabbe | Ga naar Sjabbe in de Herestraat | 0.4 | 19 |  |
| N2 | Een duif op de gang | Ga naar huis: iemand wacht op de gang |  | 20 | speelt thuis |
| N3 | Soep bij Beppe | Ga naar Beppe's huis voor soep | 5.3 | 20 |  |
| N4 | Een eerste ronde | Ga naar Station Groningen | 5.7 | 17 |  |
| W1 | Half drie | Ga naar huis: Tessa laat je iets proeven |  | 20 | speelt thuis |
| M03 | Het Loket | Ga naar Het Loket bij de Grote Markt | 0.8 | 11 | kost €150 |
| M04 | Kieken van boven | Praat met Bert op het Stationsplein | 0.8 | 10 |  |
| M05 | Wind tegen, beide kanten op | Praat met Sjoerd bij het Academiegebouw | 0.9 | 21 |  |
| M06 | Het museum stond er al zo | Ga naar het museum: pak de bal | 0.7 | 13 | speelt thuis |
| M07 | Al het vet van Grunn | Ga naar de groothandel in de Bornholmstraat | 1.2 | 24 |  |
| M08 | Fatbikes tellen niet als fiets | Loop te voet naar de Noorderhaven | 1.1 | 25 |  |
| N10 | Een middag op het terras | Ga naar het terras aan de Grote Markt | 0.0 | 20 |  |
| N8 | Een avond bij Oma | Ga naar Oma aan de Noorderhaven | 0.8 | 16 |  |
| T1 | De trein naar Warffum | Neem de trein naar Warffum | 18.4 | 15 | ver |
| M09 | Heel aankomen is ook een kunst | Praat met Geesje in Warffum | 0.5 | 20 |  |
| N5 | De boerderij in Warffum | Ga naar het erf bij Warffum | 1.4 | 21 |  |
| K1 | Het land achter de pastorie | Ga naar de pastorie in Warffum | 1.4 | 21 |  |
| M10 | Een trekker-limo op de wierde | Ga naar het erf van de kerk: Jelle komt | 3.5 | 15 |  |
| A1 | De bietenoogst bij Hoogkerk | Ga naar de bietenoogst bij Hoogkerk |  | 23 |  |
| N11 | Een bezorgrondje bij Bedum | Ga naar Bedum voor een bezorgrondje | 11.5 | 24 |  |
| N12 | De lijst op de koelkast | Ga naar de flat in Paddepoel | 8.0 | 15 |  |
| N6 | Een dag op het water | Ga naar Klaas in Noordpolderzijl | 19.5 | 14 | ver |
| N7 | De streekbus naar Winsum | Neem de streekbus naar Winsum | 9.9 | 20 |  |
| T2 | De streekbus naar Zoutkamp | Neem de streekbus naar Zoutkamp | 14.5 | 20 |  |
| M11 | Geleend van de Friezen | Praat met Klaas in Zoutkamp | 0.1 | 21 |  |
| K2 | De kade in de ochtend | Ga naar de kade in Zoutkamp | 0.1 | 17 |  |
| M12 | Het staat niet in het rooster | Praat met Dijkstra in Lauwersoog | 9.7 | 23 |  |
| J1 | Post van de gemeente | Ga naar huis: er ligt post op de mat |  | 31 | appje lang, speelt thuis |
| M13 | Het containerlabyrint | Praat met Lammert in de Eemshaven | 43.5 | 13 | ver |
| K3 | Het havenkantoor in de nacht | Ga naar Lammerts havenkantoor | 0.0 | 19 |  |
| M14 | De dijk | Ga naar de dijk bij Bierum | 5.9 | 21 |  |
| J2 | Een envelop in Appingedam | Ga naar de brug in Appingedam | 7.9 | 23 |  |
| W2 | Verkocht, zegt het bord | Ga naar het havenhuis in Delfzijl | 4.3 | 31 | appje lang |
| T3 | De trein naar Winschoten | Neem de trein naar Winschoten | 22.4 | 17 | ver |
| M15 | Laag over het graan | Praat met Roelfien bij Midwolda | 6.2 | 18 |  |
| M16 | Nog eentje dan | Zoek Durk en Douwe op de kermis | 6.2 | 23 |  |
| A2 | De kermisrit | Ga naar de botsauto's op de Grote Markt |  | 22 |  |
| J3 | Koffie bij Tessa's ouders | Ga naar het erf bij Siddeburen | 15.8 | 21 | ver |
| M17 | Open, dicht | Praat met Wubbo in Veendam | 20.8 | 21 | ver |
| J4 | Een dubbele date in Veendam | Ga naar het terras aan het Oosterdiep | 5.9 | 24 |  |
| M18 | Wie draaide de camera's uit? | Ga naar Wiebelwerk in de Stad | 23.2 | 30 | ver |
| N9 | Nacht op een dijk | Ga naar de dijk bij de Dollard | 34.1 | 27 | ver |
| J5 | Een wielklem in Stadskanaal | Ga naar de Escapade in Stadskanaal | 31.0 | 25 | ver |
| M19 | Stoom | Ga naar de stoomtrein in Veendam | 13.6 | 26 |  |
| J6 | Beppe aan de deur | Ga naar huis: Beppe komt langs |  | 19 | speelt thuis |
| V1 | Schoenen voor de ster | Koop schoenen en een shirt |  | 23 |  |
| V2 | De eerste training | Ga naar de training in Veendam | 0.7 | 18 |  |
| V3 | Het is jouw avond | Haal drinken bij de avondwinkel |  | 18 |  |
| T4 | De bus naar Bourtange | Ga naar Vesting Bourtange | 23.9 | 29 | ver |
| M20 | Het beleg van Bourtange | Ga naar het Beleg van Bourtange | 0.1 | 27 |  |
| M21 | Iedereen heeft een rode auto gezien | Haal de Escapade terug van de trein | 58.8 | 13 | ver |
| F1 | Een wagen langs de weg | Ga naar de aanhanger bij Zuidhorn | 0.4 | 21 |  |
| M22 | Een luik erin | Ga naar Tinus' schuur bij Zuidhorn | 0.4 | 25 |  |
| F2 | De eerste bak | Ga naar de loods in Hoogkerk | 6.3 | 21 |  |
| M23 | De colonne | Ga naar Tinus' schuur bij Zuidhorn | 6.3 | 17 |  |
| M24 | Er hangt iets Fries aan d'Olle Grieze | Praat met Bert op de Grote Markt | 11.2 | 23 |  |
| M25 | Het bod viel tegen | Ga naar Oma's keuken aan de Noorderhaven | 0.5 | 19 |  |
| M26 | Ontzet, net als in 1672 | Ga naar de Grote Markt: het Ontzet | 0.5 | 25 |  |
| F3 | Soep en eierbal | Ga naar Oma's keuken aan de Noorderhaven | 0.9 | 19 |  |
| F4 | Foar mem, achteraan de rij | Ga naar de Vismarkt | 0.8 | 20 |  |
| F5 | Een avond voor twee | Ga naar de kade aan de Noorderhaven | 1.0 | 14 |  |
| E | Epiloog en slot | - |  |  |  |
| M27 | Inpakken | Praat met Willemien in Loppersum | 17.2 | 26 | ver |
| M28 | De wisselwoning | Rij de verhuisbus naar de wisselwoning | 0.0 | 23 |  |
| M29 | Terug | Ga naar Willemien: het huis is klaar | 0.1 | 17 |  |
| T5 | De weg naar Bourtange | Ga naar Vesting Bourtange | 46.7 | 20 | ver |
| M30 | Het proefbeleg | Ga naar het proefbeleg in Bourtange | 0.4 | 15 |  |
| F6 | De kaart op het luik | Ga naar de Vismarkt | 47.8 | 14 | ver |
