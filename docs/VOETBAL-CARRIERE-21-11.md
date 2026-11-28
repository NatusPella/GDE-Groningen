# Voetbalcarrière (ontwerp 21-11, epic #1106)

> **Status (21-11, later): gebouwd, niet in beeld bekeken.** De pure kern, de opslag, het kindscherm en de carrièrewedstrijd staan in de code; wat getest is en wat nog in Electron gecontroleerd moet worden staat in [VOETBAL-CARRIERE-VERIFICATIE-21-11.md](VOETBAL-CARRIERE-VERIFICATIE-21-11.md). Eigenaarsbesluiten 21-11 erbij: per ronde zelf spelen of laten uitrekenen, een kort seizoen (7 rondes, een ronde per 3 speldagen) en ontgrendeling per akte (akte 4). Dit document blijft het ontwerp; bij een verschil wint de code en het verificatiedocument.
>
> Oorspronkelijke status: ontwerp, geen code. Dit document is het plan voor de epic [#1106](https://github.com/NatusPella/GDE-Groningen/issues/1106): de voetbalsim in de Euroborg ([VOETBAL-SIM-21-11.md](VOETBAL-SIM-21-11.md), #981) wordt een carrière. Alle cijfers zijn startwaarden die het balanspakket (#1116) met de economie-sim moet bevestigen.
>
> **Eigenaarsbesluiten 21-11 verwerkt (zeven vragen, zie hoofdstuk 17):** Tammo en Tessa zijn allebei speelbaar (Tessa de ster), de rollen heten Speler, later Trainer en Manager, alle clubs hebben parodienamen, het spel gebruikt de voetbalvelden uit de hele provincie (lokale clubs in het begin, de top in de Euroborg), sponsors zijn parodiebedrijven die ook als panden in de wereld staan, blessures blijven.
>
> Regels: [AGENTS.md](../AGENTS.md) (constitution), [mechanica.md](../.specs-fire/standards/mechanica.md), [verhaal.md](../.specs-fire/standards/verhaal.md), [ui-taal.md](../.specs-fire/standards/ui-taal.md), [MULTIPLAYER-VISIE.md](MULTIPLAYER-VISIE.md), [COOP-GAST.md](COOP-GAST.md), [BALANS-21-11.md](BALANS-21-11.md). Plan in FIRE-stijl: [SPECS-FIRE.md](SPECS-FIRE.md) (elk werkpakket is een issue; bij uitvoering krijgt het een work item met `Refs #n`).

## Besluiten van de eigenaar (21-11)

| Vraag | Antwoord |
|---|---|
| Wat is de carrière? | Speler én manager: groei van talent naar de selectie van een verzonnen club, later ook een team managen (opstelling, transfers, tactiek). |
| Wie? | **Tessa en Tammo, allebei speelbaar** (besluit 21-11: Tessa de ster, Tammo speler en teamgenoot; de ander regelt de papieren). Rollen: Speler, later Trainer en Manager. |
| Competitie | Seizoenen met divisies, promotie en degradatie, beker en een Europees toernooi: alles verzonnen. De hoogste groep speelt in de Euroborg; clubs hebben parodienamen op echte clubs (besluit 21-11, bijlage A). |
| Integratie | Een echte agenda: trainingen en wedstrijden in speldagen, salaris, sponsors, bijbanen; je plant naast missies en bedrijven. Tijd, slapen en reizen blijven gezamenlijke keuzes. |
| Speelgevoel | Spelerscontrole plus tactiek (lichte sim, de bestaande 11v11). |
| Groei | Vaardigheden (tempo, schot, pass, uithouding), training via minigames en wedstrijdervaring, rollen en talenten. |
| Club en geld | Clubbezit mogelijk (aandeel in een club of stadion), als onderdeel van het Bezit-menu. |
| Samen spelen | Vrienden in je team (11v11) of als rivaliserend team; de carrière blijft per speler (#429). |
| **Canon (21-11)** | Tammo en Tessa zijn **net student af** en trekken de wijde wereld in. Ze waren tijdens hun studie al vrienden en zijn nu werkloos: hun eerste klusjes komen uit het spel (besluit eigenaar 21-11, zie VERHAALCANON-21-11). Dus: geen jeugd- of leeftijdsfase; Tessa begint als net-afgestudeerde amateur in de laagste klasse en Tammo regelt het naast zijn eerste baan. Alles begint klein. |

## 1. Stand van zaken

### Wat er al is

| Onderdeel | Bestand | Wat het kan |
|---|---|---|
| Regels en afmetingen | `voetbalrules.js` | twee formaten (5v5 en 11v11), vormingen (4-4-2, 4-3-3, 3-5-2 en kleine), speelstijlen, moeilijkheid (`AI_STAND`), zes clubs (`TEAMS`: alleen naam en kleuren), medailles en beloning |
| Wedstrijd | `voetbalmatch.js` | fasen, klok, uitbal, overtreding, wissels van bestuurde speler, tactiek onderweg (`zetTactiek`), tot vier mensen in team 0, momentopname van 64 getallen, `alleenAi` (computer tegen computer) |
| Computerspelers | `voetbalai.js`, `voetbalbal.js` | rollen, pressing, keeper, deterministische bal |
| Competitie | `voetbalcompetitie.js` | een halve competitie met zes clubs (5 rondes), eigen duel gespeeld, andere duels uitgerekend (Poisson, `STERKTE` per club), stand, kampioen |
| Opslag | `gde-voetbal-v1` | voorkeuren en de stand van het seizoen, per apparaat, nooit in een savegame |
| Karakter | `voetbalkarakter.js`, `karakterbonus.js` | Tessa (`anita`): sprint +6%, schot +8%, aanname +10%, wisselhaak, Tessa-regels |
| Beloning | `voetbal.js`, `loopbaan.js` | €5 tot €50 per wedstrijd, `footballMatches` telt voor het vak Buiten (14 punten), prestaties `voetbal_winst`, `voetbal_hattrick`, `voetbal_kampioen` (€120) |
| Samen spelen | `coopnet.js`-haak, `COOP-GAST.md` | de wereld van wie het spel opende rekent; gasten sturen invoer; elf tegen elf met twee tot vier mensen in één team; beloning per speler |
| Tekst | `voetbaldata.js` | Verslaggever Hilbrand, Oma Trijntje (alles verzonnen) |
| Tests | `voetbal_test`, `voetbal_botsim`, `voetbal_rook_test`, `coopwedstrijd_voetbal_test` | zie VOETBAL-SIM-21-11 |

### Wat ontbreekt voor een carrière

1. **Individuele spelers.** Een speler in de sim heeft een rol en een naam, geen eigenschappen. Alleen het team heeft een stand (`AI_STAND`), alleen mensen hebben een bonus (`deeln[].bonus`). Clubs verschillen nu alleen in kleur en een `STERKTE`-getal in de competitie. De sim moet per speler een factor kunnen lezen (`maakSpeler` in `voetbalmatch.js`).
2. **Een wereld van clubs en spelers**: namen, ratings, selecties, divisies, contracten.
3. **Een kalender.** Er is geen tijd in de competitie: je speelt ronde na ronde wanneer je wilt. Er is geen speldag-agenda en geen seizoenseinde met promotie.
4. **Ontwikkeling**: groei, training, vorm, vermoeidheid.
5. **Economie**: een salaris, sponsors, transfers, een clubkas.
6. **Een eigen profiel per speler.** `gde-voetbal-v1` is per apparaat en per apparaat is niet "per speler" in Samen spelen (#429); een loopbaan hoort in een eigen sleutel zoals `gde-loopbaan-v1`.
7. **Menu en HUD**: een overzicht, selectie, kalender, stand, transfers; een rij in Te doen.
8. **Verhaal**: een reden om te beginnen en beats onderweg.
9. **Samen spelen met ratings** en mensen in het tegenstanderteam (nu maximaal vier mensen, allemaal team 0; `MAX_SPELERS_VOETBAL = 4`).
10. **Wereld, beeld en geluid**: trainingsveld, shirts per club, publiek, fluit en crowd; nu alleen de bestaande geluiden.

### Twee dingen die het ontwerp bepalen

- **De kalender is verhaalgebonden.** `calendar.js` houdt de datum vast aan de verhaalstap (`storyBounds`); pas na de finale loopt hij vrij (`max: Infinity`), en de zonnestand blijft zomer na dag 40 (`LAST_SUMMER_DAY`). Constitution 3 laat de verzonnen kalenderdagen staan. Een carrière met meerdere seizoenen kan dus **niet** aan de datum hangen. We tellen **nachten**: een eigen dagteller (`voetbaldag`) die oploopt op hetzelfde signaal als `calendarday.js` (de klok die meer dan vier uur terugspringt: middernacht, slapen, een late trein) maar los van de verhaaldatum. Een speldag is 24 minuten echte tijd (`DAY_LENGTH_S = 24 * 60`).
- **Het menu heeft al een groep Bezit** (`RAIL_GROUPS` in `pausemenu.js`: Spel, Doen, Bezit, Voortgang, Systeem; Bezit = Spullen, Garage, Boerderij). Loopbaan staat onder Doen. Dat bepaalt de menukeuze in hoofdstuk 9.

## 2. Carrièreboog en verhaalkoppeling

### De boog

| Fase | Wat de speler doet | Marker |
|---|---|---|
| 1 Amateur | Net afgestudeerd, begint als amateur in de laagste klasse (de Talentenklasse, voor aspirant-spelers) bij De Stadjers: trainen in de avonduren naast haar klusjes, eerst invalbeurten | uitnodiging van Tammo |
| 2 Debuut | Eerste wedstrijd in de basis of als invaller; eerste doelpunt | prestatie, appje |
| 3 Selectie | Vaste basisspeler, promotie uit de Talentenklasse | promotie-ronde |
| 4 Doorbraak | Terpklasse en beker; eerste bod van een andere club | bod via Tammo |
| 5 Transfers | Contract kiezen of verlengen, van club wisselen | contractscherm |
| 6 Kapitein | Aanvoerdersband bij een goed seizoen en tevredenheid van de selectie; tactiek mee beslissen | verhaalbeat |
| 7 Trainer (rol 2) | Vanaf seizoen 3 en kapitein: de sportieve kant (selectie, opstelling, tactiek, training); je mag blijven spelen | beat B9 |
| 8 Manager (rol 3) | Later, na twee seizoenen als Trainer of bij het eerste clubaandeel: de zakelijke kant (transfers, budget, contracten, opleiding voor aspirant-spelers, sponsors) | beat B10 |

**Canon van de eigenaar (21-11), antwoord op open vraag 1:** er is **geen jeugd- of leeftijdsfase**. Tessa is net afgestudeerd en begint als amateur in de laagste klasse; "Talentenklasse" blijft alleen de naam van die klasse voor aspirant-spelers (geen leeftijd). Een jeugdacademie in de managerlaag is een **opleiding voor aspirant-spelers** (instroom van talenten uit de regio, zonder leeftijd). Het verhaal is "de wijde wereld in": voetbal is een van de dingen die ze naast hun eerste klusjes proberen, geen jeugddroom die eindelijk uitkomt. Zie hoofdstuk 2b voor wat in het bestaande verhaal hiermee botst.

### Tammo en Tessa, allebei speelbaar (besluit vraag 1)

**Besluit:** de Talentenklasse zonder leeftijd is goed, op voorwaarde dat Tammo en Tessa allebei kunnen meedoen. Ontwerp:

- **Beide spelen in het team** van de startclub, vanaf de eerste training. **Tessa is de ster** (hoger potentieel, de dorpsteambonus als startvoordeel in haar vaardigheden); **Tammo is een gewone amateur** (lagere start, gewoon potentieel, geen bonus) die door spelen en training kan groeien, nooit uitgeschakeld.
- **De speler speelt als zijn eigen figuur** (het personage van zijn verhaal, `world.player.character`: `tammo` of `anita`); de carrière dwingt geen wissel naar Tessa af (de huidige wisselhaak `karakterVoorActiviteit('voetbal')` blijft voor de losse Euroborg-wedstrijd en de vriendschappelijke competitie zoals hij is; de carrière gebruikt hem niet). De ander is teamgenoot: een **computerfiguur** met zijn eigen vaardigheden die op 60% van de snelheid van de speler meegroeit (visie punt 11: de tweede verhaalrol is een computerfiguur in het eigen beeld).
- **Wie regelt de papieren:** de figuur die niet speelt, in zijn persona. Speel je Tessa, dan regelt Tammo het (zoals nu beschreven); speel je Tammo, dan appt Tessa de voorstellen (droog en praktisch). Beide zijn evenwaardig en gaan nooit over elkaars geld.
- **Samen spelen:** twee spelers kunnen elk een figuur zijn (Tammo en Tessa) en spelen dan **allebei** mee in het team, elk met zijn eigen carrière; is er maar één mens, dan is de ander een computerteamgenoot (in de selectie en in de wedstrijd). Het speler-/gastmodel en de beloning blijven zoals in hoofdstuk 11.
- **Rollen en benamingen (besluit vraag 2):** in het spel heten de rollen **Speler**, later **Trainer** en later **Manager**, als aparte fasen met eigen schermen (zie hoofdstuk 6). "Coach" en "technisch directeur" komen niet voor in de UI.

### Wanneer ontgrendelt het

De carrière is een zijpad, geen verhaalstap. Voorwaarden (allemaal, in `voetbalbeats.js`, pakket 6):

1. **Akte 1 is klaar** (deel 1, "Moi, Grunn"; `reachedAct` uit `beppe_visit_rules.js` en `stepDone` uit `storyarc.js`). De bestaande Euroborg-wedstrijd en de vriendschappelijke competitie blijven altijd speelbaar; alleen de carrière wacht.
2. **De Beppe-boog stoort niet** (#1063): geen beat zolang het huis in fase `alive` is met een open bezoek, bericht of aanwijzing; de carrière wacht tot de afscheidsscène geweest is (fase `memory`) of Beppe's huis nog gesloten is zonder open uitnodiging. Zo komt een voetbalgrap nooit vlak voor of na haar afscheid.
3. **Geen missie of scène loopt** (`narrativeBusy()`, een actieve missie, `isCinematicActive()`), niet in dezelfde minuut als een kaart (`cardsBusy()`).
4. **Maximaal één beat per speldag**, en nooit twee dagen na elkaar tijdens een verhaalmissiedag; een gemiste beat wacht, hij vervalt niet.

### Korte beats (de regelaar appt, de speler speelt)

Alles is een appje (stil, `app-stil`, dus geen TTS-ronde) of een kort gesprek in dezelfde taal als het bestaande verhaal: Tessa standaard Nederlands, Tammo droog en kort. Gronings alleen met zorg en met Nederlandse ondertitel; de voorbeeldzinnen hieronder zijn Nederlands en moeten door de tekstronde.

| Beat | Trigger | Voorbeeld |
|---|---|---|
| B1 Uitnodiging | ontgrendeling | Tammo, tussen twee sollicitaties door: "De Stadjers zoeken nieuwe spelers. Ik heb jouw naam genoemd. Het is maar een avondje trainen." |
| B2 Eerste training | uitnodiging aangenomen | Tessa: "Het ruikt hier naar gras en oud zweet. Net als vroeger bij het dorpsteam." |
| B3 Debuut | eerste wedstrijd | Tammo: "Je speelde alsof je dit al jaren doet." Tessa: "Dat klopt ook. Het dorpsteam, weet je nog." |
| B4 Eerste doelpunt | eerste eigen goal | Oma Trijntje op de tribune (tekst) |
| B5 Promotie | einde seizoen 1 | Tammo: "Terpklasse. Je vergoeding gaat omhoog. Mijn baan betaalt nog steeds minder." |
| B6 Het eerste bod | seizoen 2, rating hoog genoeg | Tammo regelt: een club biedt; een keuze, geen druk |
| B7 Beker | beker gewonnen of finale | Hilbrand (commentaar), Tessa kort |
| B8 Kapitein | seizoen 3 | Tammo: "De selectie heeft gestemd." |
| B9 Trainer | na B8 en een volledig seizoen | Tammo: "Ik regel de papieren naast mijn werk. Jij regelt de opstelling." |
| B10 Manager | twee seizoenen Trainer, of eerste keer genoeg geld voor een clubaandeel | de regelaar: de kaart naar Bezit > Club en het Manager-scherm |

Regels voor de canon: Tammo regelt het **naast zijn eerste klusjes** (hij appt tussen klusjes en sollicitaties; hij is geen volleerd zaakwaarnemer: zijn kantoortje is een app en een koffiebon); Tessa en Tammo zijn vrienden uit hun studietijd, dus geen tekst over "al jaren" of "sinds kinderen" en geen beat die hun beginnende werkende leven tegenspreekt (geld is krap, begin klein). Regels: een beat is hooguit 14 woorden per HUD-bericht (`WORD_BUDGET`), "Grunn" nooit "de Grunn", geen echte clubs of personen, altijd zomer (geen winterstop; een seizoenspauze heet "pauze tussen de seizoenen"). Tessa en Tammo blijven in hun persona's (`PERSONA_POOL`, `karakterbonus.js`); Tammo's rol als zaakwaarnemer is nieuw en vraagt een korte regel in `docs/personages.md`.

## 2b. Canon 21-11 en wat in het bestaande verhaal botst

Canon van de eigenaar: Tammo en Tessa zijn net student af, trekken de wijde wereld in, waren tijdens hun studie al vrienden en zijn werkloos en doen klusjes uit het spel. Gecontroleerd met grep op Tammo, Tessa, student, kennen, vriend, jeugd, kinderen en jaren in `docs/verhaal/`, `docs/personages.md`, `game/js/storyarc_nieuw.js`, `karakterbonus.js`, `cutscenes_akte*.js` en `banterlines.js`. Dit zijn **voorstellen om te beslissen of aan te passen; in dit plan is niets in het verhaal gewijzigd.**

**Botst met de canon (te beslissen of aan te passen):**

| Plek | Tekst | Botsing |
|---|---|---|
| `docs/verhaal/STIJLGIDS.md:107` (feitenblad) | "kennen elkaar al twintig jaar, sinds de treinreis naar Delfzijl als kinderen. Tammo is er twaalf jaar verliefd op en zweeg twaalf jaar (M26.7)" | vriendschap sinds de kindertijd en twaalf jaar, tegen "vrienden vanaf de studie" |
| `docs/verhaal/STIJLGIDS.md:106` | "Tammo 34 jaar (Ik ben vierendertig, oma)" | een net-afgestudeerde van 34 is ongebruikelijk |
| `game/js/storyarc_nieuw.js:121` (kaart Tammo, `bio`) | "Al twaalf jaar verliefd op zijn beste vriendin" | twaalf jaar past niet bij vrienden sinds de studie |
| `game/js/storyarc_nieuw.js:418` (hint M26) | "Het duurde twaalf jaar. Kon minder." | idem |
| `docs/personages.md:24` (naamkaart) | "Tammo, Tessa en Rikus zijn het clubje van de stoep in het Oosterpark. Tammo is al twaalf jaar verliefd" | clubje van de stoep suggereert jeugd; twaalf jaar |
| `docs/personages.md:56, 222, 224` en `docs/verhaal/nieuw/00-OVERZICHT.md:50` | Rikus is Tammo's "jeugdvriend uit het Oosterpark" | jeugdvriend, tegen vrienden sinds de studie |
| `docs/personages.md` en `storyarc_nieuw.js` (Tammo "Stadjer uit het Oosterpark", woont op de Escapade, verhuisdag 14 augustus naar Paddepoel) | | past, maar "werkloos, klusjes en net studie af" is nergens genoemd: controleer of Tammo's werkende leven in de opening ergens anders uitgaat van een lange loopbaan |

**Botst niet of past juist:** Tessa's dorpsteam sinds haar zesde en koeien melken voor schooltijd (`OPENING-BIJBEL.md:89`, `karakterbonus.js:3,174`): dat is van vóór de studie, dus de dorpsteambonus blijft geldig. `TESSA-NEDERLANDS.md:76` ("Tammo heeft hier nog gestudeerd. Twee weken.") en de scène in `cutscenes_akte1.js:414-419` (mensa, studeren) passen bij de canon; controleer alleen dat "twee weken" een korte episode naast een afgeronde studie blijft. `student` in `storyarc_nieuw.js:101` is een publiekstype. De vrienden van Oma Trijntje (Lammert, Geesje, Klaas, Roelfien, Wubbo) zijn haar vrienden, niet die van Tammo.

**Wat dit voor het voetbalplan betekent:** de voetbalbeats gebruiken alleen "vrienden uit de studietijd", "mijn klusjes" en "het dorpsteam, weet je nog" (Tessa's verleden vóór de studie); ze noemen nergens een gezamenlijke jeugd, een aantal jaren vriendschap of een leeftijd. Wat de canon voor het hoofdverhaal betekent (de twintig jaar, de twaalf jaar, de 34) beslist de eigenaar; de aanpassing is een verhaalissue en geen onderdeel van deze epic. Er staat dan geen regel in het voetbalplan die mee moet.

## 3. Seizoensstructuur en agenda

### Divisies, clubs en parodienamen

**Besluit (vraag 3):** acht clubs per divisie is goed. **Alle clubs hebben een parodienaam op een echte club** (constitution 2: verzonnen namen met een duidelijke knipoog; geen directe namen en geen herkenbare logo's in speltekst of beeld). De grappen staan alleen in dit document (bijlage A), nooit in de speltekst, en een test blokkeert de echte namen in de spelgegevens (`voetbal_test` heeft die lijst al; hij wordt uitgebreid met de nieuwe clubs en de voorvoegsels VV, SV, FC, SC en RKSV).

Drie divisies van acht clubs, in oplopende klasse:

| Divisie | Wie | Waar wordt gespeeld |
|---|---|---|
| **Kroonklasse** (de top, de eredivisie-equivalent) | acht vaste parodieclubs (bijlage A.1), met De Stadjers als de club van de stad | alle thuiswedstrijden van de Kroonklasse: **de Euroborg** (geen tweede stadion, besluit vraag 4); uitwedstrijden worden uitgerekend of op de Euroborg gespeeld als "uit" (zelfde veld, andere kleuren) |
| **Terpklasse** (streek) | acht streekclubs: drie bestaande (Wadlopers, Ommelanders, Kleibijters) en vijf nieuwe parodieclubs (bijlage A.2) | de sportparken van de grotere plaatsen uit de kaartdata (de `town`-plaatsen en de stad), met een verzonnen clubnaam |
| **Talentenklasse** (de start) | acht **lokale clubs** uit de kaartdata (hoofdstuk 3b): de acht dichtstbijzijnde plaatsen met een voetbalpark bij het thuispark van de speler | de sportparken van die dorpen en wijken |

Onder de Talentenklasse ligt een **pool** van alle andere lokale clubs (de ruim honderd plaatsen met een voetbalpark): een gedegradeerde club zakt erin, een nieuwe komt de Talentenklasse in. De pool wordt nooit gespeeld, alleen bijgehouden (een naam, een sterkte). Eigen competitiecode `voetbalclubs.js` bewaart per club: id, naam, kort, kleuren, shirtpatroon, divisie, sterkte, budget, thuispark.

**De speler begint bij een lokale club** (het park dichtst bij het huis in Paddepoel), niet bij De Stadjers. De club stijgt met promotie en kan in de Kroonklasse komen; de speler kan ook eerder naar een grotere club verhuizen (transfer, B6). **De Stadjers** zijn de club van de stad in de Kroonklasse, geen startclub.

### Seizoen

### Seizoen

Een seizoen duurt ongeveer 14 wedstrijddagen:

| Onderdeel | Aantal | Opmerking |
|---|---|---|
| Competitie | 7 rondes (halve competitie, 8 clubs) | 3 punten winst, 1 gelijk |
| Beker (Dijkbeker) | tot 4 rondes, knock-out met 16 clubs uit alle divisies | gelijkspel: strafschoppen (de penaltyserie `penalty.js` wordt hier de beslissing) |
| Waddenbeker (Europees toernooi) | 3 tot 5 rondes, de top van de Kroonklasse | 16 verzonnen buitenlandse clubs met parodienamen op echte Europese clubs (besluit vraag 5, bijlage A.3), alle wedstrijden op de Euroborg als "thuis" of "uit" |
| Einde seizoen | promotie en degradatie (top 2 omhoog, onderste 2 omlaag; in de Kroonklasse geen promotie, de kampioen speelt de Waddenbeker) | |
| Pauze tussen de seizoenen | 3 speldagen: transfers, contracten, vakantiekaart, instroom van aspirant-spelers | geen winterstop, alles blijft zomer |

Seizoen 1 is de "lichte vorm" van de eerste slice: alleen de Talentenklasse bij lokale clubs, 7 rondes, geen beker en geen Europa.

### Agenda in speldagen

- **Eigen dagteller** `voetbaldag` (gehele getallen), opgehoogd per nacht (zie hierboven), lazy bijgewerkt bij het openen van het scherm of een wedstrijd (zoals `boerderijTijd`): een speler die lang weg was krijgt maximaal één verzoening, nooit achterstallig salaris.
- **Ritme:** een wedstrijdronde elke **3 speldagen** (`DAGEN_PER_RONDE = 3`, startwaarde; de balansronde meet dit). Op de andere dagen is er een trainingsslot (hooguit één training per speldag). De dagen ertussen vul je met missies, bijbanen of bezit.
- **De wedstrijd wacht op jou.** Een ronde heeft een venster van één speldag. Spring je er niet in, dan rekent de club de ronde uit met jouw rating (speelt op "reservebank": vorm -1, vertrouwen van de trainer -1) zonder geldverlies en zonder blijvende schade ("niemand verliest iets", visie punt 4). Je verliest hooguit een plek in de basis, die je terugwint.
- **Sim of spelen.** Per wedstrijd kies je: zelf spelen (volledige beloning en volle ervaring) of laten uitrekenen (alleen het contractdeel van het salaris, 60% van de ervaring). Zo is sim nooit sneller geld dan spelen.
- **Salaris per ronde, niet per nacht**: slapen of tijd verspringen levert geen salaris op (anti-uitbuiting).
- **Slapen en tijd verspringen** zijn gezamenlijke keuzes (visie punt 1): de carrière-agenda heeft er geen eigen invloed op. In Samen spelen loopt de speldag van de wereld, elke speler heeft zijn eigen `voetbaldag`-stand (zie hoofdstuk 10).
- **Verhaal gaat voor.** Een verhaalmissie of -scène die de speler vastzet, pauzeert de agenda niet, maar het wachtvenster van de ronde loopt door: wie een missie speelt mist niets onherstelbaars.

### Niet-gespeelde wedstrijden uitrekenen

Deterministisch, puur en goedkoop. Zaad: `hash(seizoenszaad, divisie, ronde, thuisId, uitId)`. Per club twee ratings: aanval (gemiddelde van de beste aanvallers en middenvelders, gewogen) en verdediging (idem met verdedigers en keeper), geschaald door vorming en stijl. Doelpunten per team: Poisson met `lambda = 1,35 x (aanval / tegenverdediging)^1,2 x thuisvoordeel(1,06)`, afgeklemd op [0,2; 4]. Dit is dezelfde familie als `simuleerDuel` in `voetbalcompetitie.js` (die blijft als de basis; de `STERKTE` wordt vervangen door de afgeleide rating). Een heel seizoen (24 clubs, 7 rondes plus beker) is minder dan 200 duels: ruim onder 1 ms per ronde.

## 3b. Voetbalvelden uit de kaart en lokale clubs (pakket 11)

**Besluit (vraag 4): geen tweede stadion; wel de clubs en velden uit de hele provincie als voetbalvelden.** In het begin speel je bij en tegen lokale clubs op de echte sportparken van de kaart, met verzonnen clubnamen per dorp. De top speelt in de Euroborg.

### Wat de kaartdata hebben (audit)

`node scripts/world/voetbalvelden_audit.mjs` (nieuw in deze tak; leest de gecachte packs, schrijft niets in de repo) telt de velden met `leisure=pitch`, `sports_centre` of `stadium` en `sport=soccer` of `football`. Gemeten op 21-11 op de provinciepacks (`data/cache/province`):

| Maat | Waarde |
|---|---:|
| voetbalvelden | **554** (537 velden, 16 sportcentra, 1 stadion) |
| waarvan kunstgras / verlicht | 63 / 50 |
| sportparken (velden binnen 150 m gebundeld) | **281** (168 met één veld, 91 met twee tot vier, 22 met vijf of meer, max 12) |
| plaatsen met minstens één park | **141** van 599 (1 van 1 steden, 13 van 14 `town`, 94 van 188 `village`, 33 van 396 `hamlet`) |
| plaatsen met meer dan één park | 59 |
| afstand van een park tot zijn plaats | mediaan 634 m, p90 1.717 m |
| afstand tot het dichtstbijzijnde andere park | mediaan 546 m, p10 200 m, p90 2.670 m |
| parken binnen 5 km van de Euroborg | 66 |
| bij het huis in Paddepoel (53,240 N; 6,533 O) | 14 parken binnen 2 km, 58 binnen 5 km, 133 binnen 15 km |

Dus: **er is genoeg voor een hele pyramide.** In de stad Groningen (de Talentenklasse van de start) liggen tientallen parken op minder dan een paar kilometer; op het platteland heeft ongeveer elk groter dorp er een. De kaart noemt de wijken van de stad `hamlet` (Selwerd, Dorkwerd), en daar zitten dus de clubnamen van de stad aan vast. De audit leest geen eigennamen van echte clubs (die staan niet of nauwelijks in de data en worden niet gebruikt).

### Koppeling dorp naar club

- **Stabiel ID:** de plaats-id uit `province.json.gz` (OSM-id) is het ID van de club; het thuispark is het grootste park binnen 3 km van de plaats, de overige parken zijn trainingsvelden (zoals de Bezit-index stabiele ID's maakt uit het OSM-id, BEZIT-21-11 hoofdstuk 2.5). Een plaats zonder park (463 plaatsen) heeft geen club.
- **Verzonnen clubnaam per dorp**, deterministisch uit het plaats-id met een van acht sjablonen die elk een knipoog zijn naar de gewone amateurclubnamen (zonder ze te herhalen): `<Plaats>er <zelfstandig naamwoord>` (Winsumer Meeuwen), `Wees Rap <Plaats>`, `Eendenkracht <Plaats>`, `Onderling Gezellig <Plaats>`, `Excuseer <Plaats>`, `Voorwaarts naar de Kroeg <Plaats>`, `Halfrood <Plaats>`, `Nooit Verlegen <Plaats>`. **Nooit** de voorvoegsels VV, SV, FC, SC, RKSV of een echte clubnaam, ook niet `<Plaats> Boys` of `<Plaats> '31`; de test controleert dat. De plaatsnaam zelf mag (echte plaatsen mogen); de combinatie is verzonnen.
- **De acht van de start:** de acht dichtstbijzijnde plaatsen met een park bij het thuispark van de speler (rangschikking op afstand, daarna op plaats-id). De Stadjers en de andere top- en streekclubs staan vast.

### Waar je speelt en reizen

- **De wedstrijd wordt gespeeld op het echte sportpark van de thuisploeg**: de bestaande 11 tegen 11-sim krijgt een veld op de locatie van het grootste veld van het park (de langste as van het veld in de kaart bepaalt de richting; ligt er iets in de weg, dan kiest hij het vlakste veld in het park), met het kleine decor van het park eromheen (boarding, doelen, een tribune of kantine als beeld alleen). De Euroborg blijft het enige echte stadion (de top, de Waddenbeker).
- **Uit spelen is een reis.** De uitwedstrijd staat op de kaart als doel; je reist er met wat je hebt (fiets, auto, trein, bus, taxi: de bestaande reisopties). De afstand uit de kaart bepaalt de benodigde tijd; de wachtvenster van de ronde (hoofdstuk 3) houdt rekening met de reisafstand (één speldag voor ritten tot 15 km, anders twee). Ben je er niet, dan rekent de club de ronde uit, zonder geldverlies (hoofdstuk 3). Reizen is een gezamenlijke keuze in Samen spelen (visie punt 1): een andere speler kan meerijden.
- **De agenda:** het schema van de Talentenklasse kiest de acht dichtstbijzijnde clubs, dus een ronde kost in de stad hooguit een kwartier reizen en in het open land hooguit een half uur. Bij vroege seizoenen houdt het schema het aantal uitritten per seizoen op hooguit vier van de zeven rondes.
- **Kaartlaag "Voetbal":** een laag in de kaartlagen (naast de bestaande "act-voetbal"-marker) met alle parken in beeld (alleen wat in beeld is, zoals de Bezit-kaartlaag), de clubnaam en het type (jouw club, de volgende tegenstander, de trainingsvelden), met de volgende uitwedstrijd als doel. Prijs/prestatie: geen extra data in de tegels nodig: de parken komen uit een kleine index (`voetbalparken.json`, ongeveer 281 regels, deterministisch gebouwd door een script uit de packs; zie Bezit 1 voor dezelfde aanpak).

### Risico's van dit pakket

- Het veld van de sim (56 x 90 m) past niet altijd binnen het echte park (jeugdveldjes zijn kleiner); het veld wordt tijdelijk **over het park heen** gelegd en de wereld eromheen blijft zoals hij is, met een lage barrière. Controleren in beeld.
- Hoogteverschil op het park: de sim speelt op één vlak; het veld wordt op de gemiddelde hoogte van het park gezet (`surfaceAt`) en de wereld eromheen blijft zichtbaar.
- Plaatsen zonder park of met een heel klein park: de club kiest dan het dichtstbijzijnde park in een naburige plaats.
- Elke koppeling is een verzonnen naam bij een echte plaats; geen echte clubnaam mag eruit komen (test).

## 4. Spelers en ratings (pakket 1)

### Attributen

Vijf attributen van 1 tot 100: **tempo**, **schot**, **pass** (inclusief aannemen), **uithouding** en **verdedigen** (tackle en dekking). De vier uit het besluit van de eigenaar plus verdedigen, zodat de rol van een verdediger ook een eigen groeilijn heeft. Een keeper heeft een zesde: **reflex** (alleen voor de keeperrol).

**Rating** per rol: gewogen gemiddelde (aanvaller: schot 0,35, tempo 0,25, pass 0,2, uithouding 0,1, verdedigen 0,1; middenvelder: pass 0,35, uithouding 0,25, tempo 0,15, schot 0,1, verdedigen 0,15; verdediger: verdedigen 0,4, tempo 0,2, uithouding 0,2, pass 0,2; keeper: reflex 0,6, pass 0,2, uithouding 0,2).

### Van rating naar de sim

Een factor `f = 0,88 + 0,0037 x attribuut` (0,88 bij 1, 1,25 bij 100), toegepast op: sprintsnelheid (tempo), schotspreiding (schot, kleiner is beter), aanname en passnauwkeurigheid (pass), staminaverbruik (uithouding) en tackle-succes en reactietijd (verdedigen). Dit is de bestaande bonusstructuur van Tessa (`deeln[].bonus`, geklemd 1 tot 1,25 in `voetbalkarakter.js`) uitgebreid naar alle spelers: **Tessa's dorpsteambonus is een startvoordeel in haar attributen** (haar eerste tempo, schot en pass liggen vast iets hoger) en geen tweede vermenigvuldiging, zodat er niet dubbel geteld wordt. De totale factor blijft geklemd op 1,30.

Zonder ratings (de vriendschappelijke competitie en de bestaande wedstrijd) is alles neutraal (factor 1): de sim verandert niet. Dat is de eis voor pakket 1: `voetbal_botsim` blijft op zijn huidige getallen (gemiddeld ongeveer 2,6 doelpunten, thuis en uit even sterk), en een tweede botsim met een ratingverschil laat het sterkere team in 60 tot 75% winnen.

### Rollen en talenten

- **Rollen:** keeper, verdediger, middenvelder, aanvaller (bestaand in `VORMINGEN`). Een speler heeft een hoofdrol en een bijrol; buiten de hoofdrol speelt hij op 90% van zijn factor.
- **Talenten** (kleine eigenschappen, een per twee niveaus, hooguit drie): Dribbelaar (betere aanname onder druk), Vroege schutter, Rustige afwerker, Pitbull (dekken), Marathonloper, Spelverdeler, Laatste man, Keepersvanger. Elk talent is een klein getal in een tabel (`TALENTEN` in `voetbalplayers.js`) en wordt getoond met naam en icoon.
- **Potentieel** (verborgen, 60 tot 95): bepaalt de plafonds van de attributen en de groeisnelheid. Tessa begint met een gemiddeld potentieel; een goed seizoen zet het niet omhoog (geen verborgen mechaniek), alleen training en spelen bouwen op.

### Namen

AI-spelers krijgen deterministische namen uit twee lijsten (voornamen en achternamen) die samen **geen bestaande persoon** vormen: gebruik bijnaam-achtige achternamen ("Bram Veenbrand", "Sieb Kleijans"), controleer de combinaties met `text_audit` tegen een lijst van bekende namen, en toon daarnaast het rugnummer en de club. Constitution 2 en 4: geen echte persoon, geen echte persoonsgegevens. Een generator zonder externe bron; geen dataset van buiten.

### Grootte

24 clubs x 18 spelers = 432 spelers, per speler zes bytes aan attributen (ratings als `Uint8Array`) en een naamindex: een paar kilobyte; de generator maakt de hele wereld uit één seizoenszaad, de opslag bewaart alleen afwijkingen (transfers, groei, blessures).

## 5. Spelersontwikkeling (pakket 3)

- **Ervaring uit wedstrijden** (per gespeelde wedstrijd, alleen als je zelf speelt): doelpunt en schot op doel voeden schot, assists en gelukte passes voeden pass, gewonnen tackles voeden verdedigen, gelopen minuten voeden uithouding, sprints voeden tempo. Een uitgerekende wedstrijd geeft 60% van de ervaring.
- **Training:** vijf oefeningen als korte minigames op het trainingsveld (`minigamekit.js`): sprintparcours (tempo), schieten op doel (schot; hergebruikt `penalty.js`), pass door hoepels (pass), conditieloop (uithouding), dekken in een-tegen-een (verdedigen). **Gebouwd (21-11, #1109):** `voetbaltraining.js` (pure regels), `voetbaltraining3d.js` (kegels, hoepels, doeltje; budget 48 objecten) en `voetbaltrainingrun.js` (uitvoering als extra activiteit; toets-in-de-knop Enter in het scherm Training; controller via de bestaande toetsvertaling). De oefeningen zijn dribbelslalom (tempo), schotprecisie (schot, vijf schoten op hoekdoeltjes), pass-parcours (pass, zes hoepels), conditiesprint (uithouding, spurten en doseren) en een tegen een dekken (verdedigen); de score wordt 0,5 tot 1,5 en gaat naar `train`. "Snel trainen" (vaste winst, score 0,8) blijft bestaan en is wat een gast krijgt. Een vrije trap als zesde oefening is niet gebouwd. Niet in beeld bekeken. Een training duurt 2 tot 3 minuten echte tijd, kost 15 vermoeidheid en geeft een score tussen 0,5 en 1,5.
- **Groeicurve:** winst per ervaringspunt neemt af naarmate het attribuut zijn plafond (potentieel, niveau) nadert; hooguit 4 punten per attribuut per seizoensfase. Dat maakt grinden zinloos en een lage start niet hopeloos.
- **Dagcap:** één training per speldag; een wedstrijd telt als de training van die dag. Wie de minigame herhaalt in dezelfde speldag krijgt niets extra.
- **Vorm** (0,92 tot 1,08 op alle factoren): het gemiddelde van de laatste vijf wedstrijden (resultaat en eigen prestatie); zichtbaar als pijltje.
- **Vermoeidheid** (0 tot 100): een wedstrijd kost 35, een training 15; elke speldag herstelt 35 (slapen herstelt volledig). Onder 25 speel je op 90% tempo en uithouding (geen straf op geld).
- **Blessures, met zorg:** nooit getoond (geen animatie, geen beeld, geen bloed, geen woord als "gebroken"), alleen een rustige melding ("Je kuit is moe; rust 2 speldagen"). Kans alleen bij overbelasting (vermoeidheid onder 20 en toch spelen), deterministisch uit het seizoenszaad, hooguit 3 speldagen rust, nooit blijvend; de fysio van de club vermindert de kans. Een schakelaar in Instellingen > Spel zet blessures helemaal uit (toegankelijkheid en voorkeur). Dit past in constitution 6: geen echt leed en geen getoond geweld buiten PvP.
- **PvP en carrière** zijn gescheiden: PvP-schade bestaat niet in voetbal; een tackle is een tackle (vrije bal), geen letsel.

## 6. Rollen: Speler, Trainer en Manager (pakket 5)

**Besluit (vraag 2): beide woorden, als aparte rollen.** In het spel heet de rol van het begin **Speler**; later komt **Trainer** (sportief) en nog later **Manager** (zakelijk). Elke rol heeft eigen schermen (een tab per rol in het kindscherm Voetbal) en je kunt er een tijd naast blijven spelen. Trainer en Manager ontgrendelen nooit tegelijk met de eerste training.

| Rol | Ontgrendeld | Wat de speler beslist |
|---|---|---|
| **Speler** | vanaf het begin | je eigen vaardigheden, training, agenda, contract (Tammo of Tessa regelt de papieren) |
| **Trainer** | vanaf seizoen 3 na B9 | **selectie** van 18 (basis, bank, tribune, rollen en bijrollen, vertrouwen); **opstelling en tactiek** (vormingen 4-4-2, 4-3-3, 3-5-2, stijlen; onderweg wisselen met {1} en {2}); **training** van het team; **coachwedstrijd** (de wedstrijd met alleen computerspelers, `alleenAi`, met live tactiek, of laten uitrekenen) |
| **Manager** | later: twee seizoenen Trainer of het eerste clubaandeel (B10) | **transfers** (bieden, verkopen, uitlenen, alleen in de transferperiode: de pauze en de eerste speldag van elke ronde); **budget** (de clubkas); **contracten**; **sponsors** (de panden uit hoofdstuk 7); **opleiding voor aspirant-spelers** (elke pauze twee talenten uit de regio, geen leeftijd); clubzaken (stadion, onderhoud, later de aandelen uit Bezit) |

Wie liever alleen speelt, kan Trainer en Manager negeren: de voorstellen van de regelaar (de ander) worden dan automatisch aanvaard of weggelaten. Geen rol is verplicht en geen rol geeft dwang in het verhaal. In de UI: tabs "Speler", "Trainer", "Manager" (de laatste twee pas zichtbaar na ontgrendeling); de woorden coach en technisch directeur komen niet voor.

### AI-clubs en transfers

Eenmaal per seizoenspauze doorloopt een deterministische routine alle AI-clubs, gesorteerd op `(budget, id)`: elke club bepaalt zijn grootste positie-behoefte uit de selectie en het budget, kiest uit de transferpool de beste speler binnen budget (de volgorde wordt bepaald door het seizoenszaad), en zet de transfer door. Voorwaarden voor determinisme en behoud: een speler zit altijd in precies één selectie; de totale som van clubkassen wijzigt alleen door de vaste bronnen en putten (omzet, salarissen, de transactiebelasting); de doorloop is een gewone `for`-lus zonder `Math.random` (alleen de eigen `makeRng`). De doorloop kost naar schatting minder dan 5 ms en draait in een idle-taak of tijdens het tussenscherm, nooit in een frame van een wedstrijd.

Contracten duren 1 tot 3 seizoenen. Een verlopend contract maakt een speler transfervrij. Er is geen koopclausule.

## 7. Contracten, salaris, sponsors en economie (pakketten 4, 5 en 10)

Alle geld loopt via `loopbaanVerdien` (spec: nooit `w.money +=` naast een haak) of de Bezit-haken; een nieuwe haak komt in de lijst `haken` van `loopbaan_balans_test.mjs`.

### Maatstaf (uit BALANS-21-11)

De gemengde speler verdient netto ongeveer **€1.100 per uur** (€440 per speldag van 24 minuten). Een carrièrewedstrijd (6 tot 8 minuten echt spelen, plus menu's) mag per actieve minuut hooguit ongeveer evenveel opleveren als het gemiddelde: dat is €110 tot €150 per gespeelde wedstrijd. Het salaris dekt een deel, zodat sim en spelen niet gelijk lopen.

### Startwaarden

| Klasse | Salaris per ronde (contractdeel) | Winstbonus | Totaal gespeeld | Uitgerekend |
|---|---:|---:|---:|---:|
| Talentenklasse (amateur: onkostenvergoeding) | €25 | €30 (winst), €10 (gelijk) | €55 tot €70 | €25 |
| Terpklasse | €60 | €60 | €120 tot €150 | €60 |
| Kroonklasse | €90 | €80 | €170 tot €210 | €90 |
| Waddenbeker-ronde | n.v.t. | €120 per ronde | €120 tot €250 | n.v.t. |

Seizoensbeloningen (eenmalig): promotie €200, bekerwinst €400, kampioen Terpklasse €500, kampioen Kroonklasse €1.200 (bestaande prestatie "Kampioen van de Euroborg" is €120 en blijft voor de vriendschappelijke competitie), Waddenbeker €1.000. Per seizoen is het totaal een kwart tot de helft van een gemiddeld inkomensblok van dezelfde speeltijd.

**Sponsors (besluit vraag 6): parodiebedrijven die ook in de wereld bestaan.** Een sponsor is een parodie op een bestaande soort bedrijf met een verzonnen naam (geen echte merken, constitution 2): een zuivelhoeve, een bakker, een bouwmarkt, een autodealer, een snackbar, een bank, een supermarkt, een fietsenmaker, een energiebedrijf (zonder gaswinning als onderwerp: gevoelig, constitution 6). Twee tot drie sleuven per seizoen, elk een eenmalige som (€150 tot €800) bij een doel (een doelpunt, drie wedstrijden zonder verlies, promotie); de regelaar stelt voor, je kiest zelf. Je kunt een sponsor nooit "verkopen" of ruilen; de sleuf is leeg tot het volgende seizoen.

**Een sponsor is een pand in de wereld** (aan te sluiten op de Bezit-epic, BEZIT-21-11 hoofdstuk 3 en 6):

- Bij een sponsorovereenkomst kiest het spel een **echt pand van het goede type in de plaats van de club** uit de bestaande winkelplekken (de panden met `shop=bakery`, `supermarket`, `car` enzovoort uit `facilities_raw`, in de Bezit-pandindex: het OSM-id is het ID) en geeft het een **verzonnen bedrijfsnaam** op de gevel (zeefdruk-bordje van `shopsigns3d.js`, de naam komt uit de bestaande winkelnaamgenerator `winkelNaam`). Staat er geen pand van het type in de plaats, dan kiest het het dichtstbijzijnde in een naburige plaats.
- Het sponsorbedrijf **staat ook op het veld**: reclameborden langs het park en op de Euroborg, een bordje op het shirt en de naam in het commentaar van Hilbrand. De speler ziet dus waar het geld vandaan komt.
- **Het pand is koopbaar** als Bezit (Bedrijven, #1102): wie het sponsorpand koopt, krijgt de omzet van het pand en **een extra klantenstroom op wedstrijddagen** (hoogstens +10% op de omzet van dat pand, bij een thuiswedstrijd van de club, nooit een tweede uitbetaling van de sponsor zelf). Zo is "eigen sponsor" een leuke koppeling zonder een geldlus: de sponsor betaalt de club, het pand betaalt de eigenaar.
- Sponsors zijn per **speler** (de sponsorsom komt in de eigen kas en loopt via de Bezit-haak en `loopbaanVerdien`); de pandkoppeling gebruikt de Bezit-claim (hoofdstuk 8) als twee spelers hetzelfde pand willen.

**Begin klein (canon 21-11):** Tessa en Tammo hebben net hun eerste klusjes. In de Talentenklasse is voetbal een **bijverdienste** (een onkostenvergoeding, geen salaris): per speelminuut ongeveer de helft van de klusjes, zodat de eerste echte verdienste uit bijbanen en loopbanen blijft komen en voetbal een keuze is om in te groeien. Het loon stijgt pas met de klasse (Terpklasse vanaf €60, Kroonklasse vanaf €90). **Bijbanen en carrière:** de agenda laat ruimte; een speler die elke speldag naar een bijbaan gaat mist training maar geen wedstrijd. Het balansdoel is dat voetbal ongeveer als elke andere loopbaan telt, niet er boven uit.

### Anti-uitbuiting

- Salaris per ronde, nooit per nacht: tijd verspringen levert niets.
- Sim betaalt alleen het contractdeel en 60% van de ervaring: sim is nooit sneller geld per minuut dan spelen.
- Training: één per speldag, afnemende winst, geen herhaling binnen een speldag.
- Transfers (managerfase): de verkoopprijs van een speler is hooguit 80% van de aankoopprijs binnen een seizoen en er is 10% transactiebelasting, zodat een koop-verkoopcyclus altijd verlies geeft; de clubkas is gescheiden van het eigen geld (geld verplaatsen uit de kas mag alleen als dividend aan een eigenaar en alleen een kwart van de winst).
- Absentie: na lange afwezigheid (meer dan 40 speldagen) volgt hooguit één verzoening zonder achterstallig salaris.
- Per carrière één club tegelijk; geen contracten bij meerdere clubs.
- Eerste slice: het totaal aan inkomsten uit voetbal blijft onder 15% van het uurtotaal; de economie-sim (pakket 10) bewaakt dat de verdienste per uur binnen 15% van €1.100 blijft.

## 8. Clubbezit als Bezit-tak (pakket 7)

**Afstemming met de Bezit-epic** ([#1095](https://github.com/NatusPella/GDE-Groningen/issues/1095), ontwerp `docs/BEZIT-21-11.md` op de branch `boerderij-provincie-plan-21-11`, nog niet gemerged; gelezen op 21-11). Voetbal dupliceert niets en gebruikt het volgende van Bezit:

| Van Bezit | Gebruik voor clubbezit |
|---|---|
| Opslag `gde-bezit-v1` per speler (#1097; compacte verzameling, `kas`, nooit polygonen, komt mee in andermans wereld, #449 en #429) | een sleutel `clubs: { <clubId>: { aandeel, sinds, prijs } }` in dat profiel; **voetbal krijgt geen eigen bezitsopslag** (de carrière blijft in `gde-voetbalcarriere-v1`) |
| Menu: groep Bezit met het onderdeel "Land en bedrijf" en subtabs Overzicht, Boerderij, Bedrijven, Te koop (#1099) | een vijfde subtab **Club**, pas zichtbaar na het eerste aandeel (of na de beat B10); het Bezit-overzicht toont de club als regel |
| Prijsmodel: schaalprijs (`x (1 + min(aantal, 200) / 100)`), `VERKOOP_FACTOR` 75%, belasting 0,1% per speldag, onderhoud 0 tot 100, geen beslag, bank-schuld tot een grens | dezelfde regels voor aandelen en tribunes; een tribune is een uitbreiding van het stadionpand, geen apart systeem |
| Bedrijven (#1102): een pand met omzet per speldag, passief plus beheer, vier knoppen (prijs, voorraad, personeel, openingstijd), verzadiging per woonplaats | het stadion (de Euroborg is een echt gebouw; het pand bestaat als OSM-pand) is een Bedrijven-pand met de rol `stadion`: kaartjesprijs is de prijsknop, het publiek komt uit de klantenpot van de stad, een tribune-upgrade is een verbouwing |
| Prestaties: een nieuwe prestatielijn per tak, kasboek met posten | clubposten (aankoop, dividend, tribune) in hetzelfde kasboek |

**Wat voetbal levert:** de soort `club` en `stadion` (regels in `voetbalclub_bezit.js`, puur), de omzetformule per ronde en de koppeling aan de competitie (stand, vorm, divisie bepalen het publiek). Zodra #1097 en #1099 gemerged zijn, is pakket 7 klein; tot dan is het een interface (`ownershipBranch`) met een stub in de test, zodat pakket 1 tot 6 en 8 tot 10 niet wachten.

**Gedeelde poort.** Bezit start ook "na akte 1" met een akte-scène (#1099), en de Beppe-boog (#1063) wil rust rond haar afscheid. Beide epics hebben dus dezelfde ontgrendelvoorwaarden. Voorstel: één helper `zijpadPoort(id)` (akte klaar, geen Beppe-conflict, geen lopende missie of scène, hooguit één zijpad-beat per speldag, gedeelde wachtrij zodat Bezit en voetbal elkaar niet tegelijk melden), gebouwd door het pakket dat het eerst landt (waarschijnlijk Bezit 4 of voetbal 6) en door het andere hergebruikt. Zonder dit krijgt de speler twee uitnodigingen in dezelfde minuut.

Ontwerp van de tak (alleen het voetbalspecifieke):

- **Aandeel in een club** (10%, 25%, 51%, 100%), eerst een club in de Talentenklasse. Waardestart (voorstel, te tunen in pakket 10): Talentenklasse €30.000, Terpklasse €80.000, Kroonklasse €250.000; een aandeel kost `aandeel x waarde x schaalprijs`. Een eigen club (100%) is een eindspel, geen begin. **Begin klein:** de speler heeft net de eerste klusjes; het eerste aandeel (10% van een Talentenklasse-club, €3.000) hoort bij het tempo van het eerste perceel uit Bezit (na ongeveer twee uur spelen; startgeld €500 plus de Duizendpoot-bonus van €2.000) en wordt pas gemeld (B10) als de speler het kan betalen zonder zijn spaargeld te legen. Het Bezit-startkapitaal is dus niet voor voetbal bedoeld: er is geen voetbalstartgeld en geen gift, en een club kopen is een late stap, na een perceel of een eerste winkeltje.
- **Omzet per wedstrijdronde:** kaartjes (publiek x prijs; publiek volgt stadiongrootte, plek in de stand, vorm en de klantenpot van de stad), sponsors (per club, eenmalig per seizoen), minus salarissen en onderhoud. Dividend naar de eigenaar = aandeel x winst, 25% van de winst blijft in de clubkas.
- **Opbrengst (balans):** een rustig passief inkomen **tussen de pacht (ongeveer 44 speeluren terugverdientijd) en de huur van een woning (ongeveer 160 speeluren) uit de Bezit-balans**: startwaarde **0,45% van de aankoopprijs per speldag** (ongeveer 60 speeluren, 1,35% per ronde van drie dagen), met een uitslag van plus of min 40% door vorm en plek. Een aandeel van 10% in een Talentenklasse-club (€3.000) levert dus ongeveer €14 per speldag. Zo is clubbezit **nooit** de snelste geldmachine en blijft het binnen de Bezit-regel dat passief hooguit een kwart van het actieve inkomen is. De getallen worden in pakket 10 met `economie_sim_test` bevestigd.
- **Sponsorpanden:** zie hoofdstuk 7: een sponsorpand is een gewoon Bedrijven-pand dat een wedstrijddag-klantenbonus (hoogstens +10%) krijgt; de koppeling zit in pakket 12 en gebruikt dezelfde pandindex als Bezit 1 (#1096).
- **Stadion en tribune:** een kleine, middelgrote en grote tribune als verbouwing van het stadionpand (prijs `m2 x €700` uit Bedrijven); capaciteit en kaartjesomzet stijgen, onderhoud ook. De tribunefase bepaalt ook het aantal toeschouwers in 3D (hoofdstuk 10).
- **Risico:** een slecht seizoen verlaagt de omzet; een negatieve clubkas geeft een achterstand en bij twee gemiste periodes verkoopt de bank het aandeel terug tegen de Bezit-regel (zoals een gehuurd perceel). Niemand verliest zijn vermogen.
- **Samen spelen:** een aandeel is van de speler (zijn eigen `gde-bezit-v1`); in andermans wereld ziet een gast de clubnaam en het stadion met de naam van de eigenaar, geen kasboek. Een stadionpand kan maar één eigenaar hebben (de Bezit-claim uit hoofdstuk 10 van BEZIT-21-11, laagste tijd en speler-id wint, de ander krijgt zijn geld terug).

## 9. UI en menu

### Waar voetbal in het menu hoort (voorkeur)

**Voorkeur: een kindscherm Voetbal onder Loopbanen, en een tab Club onder Bezit.** Redenen:

- Loopbaan staat in de groep Doen en gaat over wat je doet en wat het oplevert; de agenda, de selectie en de stand zijn dat. De bestaande `CHILD`-structuur (`visboek`, `controls`) is er al voor onderdelen zonder eigen plek in de rail.
- De groep Bezit is voor wat je hebt: een club of aandeel is bezit. Bezit-epic (#1095) maakt van Boerderij het onderdeel "Land en bedrijf" met subtabs; voetbal voegt daar een subtab Club aan toe.
- **Voetbal wordt geen twintigste vak.** `loopbaan.js` heeft negentien vakken en De Duizendpoot, de prestatie, de teller `careerFirstJobs` en de specs tellen op negentien. Een twintigste vak verandert de prestatie, Steam en de tellers; dat is een duur gevolg voor weinig winst. Wedstrijden blijven `footballMatches` (vak Buiten, 14 punten). De carrière krijgt in het Loopbanen-overzicht één kaart "Voetbal" (in de groep Sport en spel, via een extra kaartbron in `careermodel.js`) die naar het kindscherm opent, met een eigen niveau (Talent, Selectiespeler, Basisspeler, Kapitein, Trainer) en zonder loonfactor.

Zie ADR [0042](../.specs-fire/standards/adr/0042-voetbalcarriere-eigen-profiel-en-dagteller.md).

### Schermen (DS3, zomerse zeefdruk; `.gm` en `.m-*`, geen eigen componenten)

| Scherm | Inhoud | Woordbudget |
|---|---|---|
| **Vandaag** (tab 1) | volgende wedstrijd en wanneer (speldagen), een trainingsknop, vorm en vermoeidheid, de Tammo-kaart met één voorstel | 125 |
| **Selectie** | je speler (zes attributen als balkjes met cijfer en patroon), talenten, rol; later (trainer) de 18-man selectie met sorteren op rating en vorm | 125 |
| **Kalender** | de komende zeven rondes en beker/Europa, met speldagen en kleur plus patroon; een uitgerekende of gespeelde ronde wordt een uitslag | 125 |
| **Stand** | de divisietabel (8 clubs), kampioenspijl en degradatiestreep (vorm plus woord, niet alleen kleur), beker en Waddenbeker als tweede blad | 125 |
| **Transfers** | biedingen, contracten, markt (trainer) | 270 (naslag) |
| **Training** | de kaart met vijf oefeningen, plafonds, wat een oefening oplevert (trainingskaart) | 125 |

Hoofdknop per scherm: één primaire (groen), de rest stil of ghost; focus zichtbaar (2 px crème); toetsenbord, controller (`PAD_MAPS`) en aanraken (44 px) doen hetzelfde; Esc of B gaat terug. Toetsenbord- en controllerplaatjes als `{TOKEN}`. Alle schermen worden bekeken op 1280x720, 1280x800 en 4K; tot dat gebeurd is, staat het als "nog niet bekeken" in het issue.

### HUD, Te doen, telefoon

- **Te doen:** één rij Voetbal met de volgende ronde en de afstand in speldagen (zoals de rij Loopbanen).
- **Wedstrijdstrook en bord:** bestaan al; het bord toont na afloop de nieuwe stand, de ronde en eventueel promotie.
- **Telefoon:** de Tammo-appjes lopen in dezelfde (stille) appkaart als het verhaal; een kaartje "Agenda" in de telefoon (de parodie-apps van #998) kan later volgen.
- **Hint en doel:** één taak per zin; de HUD-hint bij de Euroborg zegt "Volgende ronde over 2 dagen" als de carrière loopt.

## 10. Wereld, kaart, 3D en geluid (pakket 9)

### Kaartlaag en POI's

- **Euroborg** (bestaat: poort E aan de zuidkant). De poort blijft de ingang van wedstrijd, vriendschappelijke competitie en carrièrewedstrijd.
- **Voetbalvelden en trainingsvelden:** alle parken uit de kaartdata (hoofdstuk 3b: 281 parken, 141 plaatsen) komen in een nieuwe kaartlaag **Voetbal**; het thuispark van je club en de trainingsvelden zijn de plekken voor de training (minigame via E). De Euroborg blijft de marker `act-voetbal`.
- **Clubhuis:** de kantine bij de Euroborg (een bestaand gebouw in de buurt), met de contract- en transferkaart als menu (geen nieuw gebouw nodig).
- **Markers** gebruiken Phosphor (ADR 0041; een voetbalicoon voor de kaart komt in pakket 9, nu tekent de kaart een eigen balletje).

### 3D

- **Shirts per club:** `TEAMS` heeft nu shirt, broek en keepershirt; er zijn 24 palettes nodig, elk met een **patroon** (effen, brede streep, helften, smalle streep) zodat kleur nooit het enige verschil is (ui-taal regel 4). Een kleine canvastextuur per club (128x128) uit een palet in `voetbalclubs.js`, hergebruikt voor beide teams.
- **Stadionkleuren:** de tribunes in de kleur van de thuisclub (alleen een materiaalkleur per wedstrijd; geen nieuwe meshes).
- **Publiek:** een `InstancedMesh` met 600 tot 2.000 low-poly toeschouwers op de tribune, vulling per capaciteitsfase, twee animatiestanden via een instance-attribuut (zittend, juichend) bij een doelpunt; geen CPU-update per persoon (een tijdoffset in de shader). Budget onder 0,3 ms per frame op de rook-test; uit bij verminderde beweging (alleen stilstaand) en bij de laagste kwaliteit.
- **Oma Trijntje** blijft de bekende tribune-NPC.

### Geluid

- **Crowd-ambiance** (loop, volume volgt spanning en stand), **fluit** (aftrap, einde, overtreding), **doelpuntgebrul**, **teleurgesteld gemompel**; alles CC0 of CC-BY van Freesound, Kenney of OpenGameArt (ADR 0039; handles in de credits en in `docs/AUDIO-LICENTIES.md`). Zonder bestand valt de sim terug op de gefilterde ruis van WebAudio.
- Elk geluid heeft een caption (ui-taal regel 4: een caption naast elk geluid) en volgt de bestaande volumeschuiven.
- Geen liedjes of zang met tekst (geen auteursrecht-risico); alleen een ritme van gejuich.

### AI-teams in de wereld

Zichtbare trainende teams op de sportvelden binnen 150 m van de speler: 6 tot 10 lage-poly-spelers (een geïnstantieerde pop met twee looplussen) en één bal-sprite, geen sim. Een lokaal decor (geen netwerk); gestreamd met de tegels en uit wanneer de speler weg is.

## 11. Samen spelen (pakket 8)

De zes vragen uit AGENTS.md, beantwoord per onderdeel:

| Onderdeel | Van wie | Gast (J of N) | Wat ziet een gast | Beloning en voortgang | Wegvallen / later | Test |
|---|---|---|---|---|---|---|
| **Carrière** (profiel, agenda, selectie, manager) | de speler zelf (`gde-voetbalcarriere-v1`); nooit gedeeld | n.v.t. | alleen zijn eigen profiel | per speler (#429) | n.v.t.: lokaal | `voetbal_carriere_test` |
| **Carrièrewedstrijd, vrienden in je team** | wie het spel opende rekent; de wedstrijd hoort bij de ronde van wie hem startte | Meedoen? J of N bij de poort | de momentopname van 64 getallen zoals nu | de starter krijgt competitiepunten, salaris en bonus; een gast krijgt geld, loopbaanpunten en ervaring uit zijn eigen uitslagsregel, **geen** competitiepunten en geen contractbonus van een ander | de computer neemt zijn speler over, hij krijgt niets; later aansluiten kan niet halverwege | `coopwedstrijd_voetbal_test` |
| **Derby, vrienden als rivalen** | de wereld van wie het spel opende | J of N; elke speler kiest zijn team (nieuw: mensen in team 1, hooguit vier per team) | dezelfde momentopname | vriendschappelijk: geld en ervaring per speler, geen competitie; plek bepaalt de medaille | bij wegvallen neemt de computer over; het team wordt nooit leeg | nieuwe stap in de testbank |
| **Tammo en Tessa als teamgenoten** | elke speler zijn eigen figuur (Tammo of Tessa); de ander is een computerteamgenoot als er maar één mens is | Meedoen? J of N; beide figuren spelen mee als twee mensen elk een figuur nemen | beide figuren in de momentopname | per speler eigen carrière; een computerteamgenoot krijgt niets | de computer neemt het over | `voetbal_test`, `coopwedstrijd_voetbal_test` |
| **Ratings van een gast** | elke speler eigen | bij Meedoen meegegeven | n.v.t. | geklemd op zijn niveau (host rekent met `min(rating, maxBijNiveau)`) | | test dat een opgevoerde rating niet meetelt |
| **Training en minigames** | lokaal | n.v.t. | niets | eigen profiel | | `voetbal_ontwikkeling_test` |
| **Beats** | lokaal per speler | n.v.t. | niets | eigen | | `voetbal_beats_test` |
| **Clubbezit** | de speler (Bezit-register, #449) | n.v.t. | zijn club komt mee in andermans wereld zoals een voertuig | eigen kas, eigen dividend | | `voetbal_clubbezit_test` |

Gezamenlijke keuzes: tijd verspringen, slapen, reizen en laden zijn geen hostrecht (visie 1). Elke speler heeft een eigen `voetbaldag`; omdat de wereldklok gezamenlijk loopt, schuift elke speler mee, maar de wachtvensters van de rondes zijn per speler, zodat niemand door een ander tijd mist. Een vriend die later aansluit begint zijn eigen carrière.

**Protocol:** `net/protocol.js` zegt niets over voetbal en dat blijft zo; de ratings reizen mee in het bestaande EXTRA-bericht of in de start-`v` (`duur.stand.tegenstander.formaat.vorming.stijl`, uitgebreid met een compact ratingblok), en een test bewaakt dat het protocol ongewijzigd blijft. Rollen: er zijn geen "helpers" of bijrollen (visie 11): een gast speelt zijn eigen speler in jouw team.

## 12. Opslag en compatibiliteit

- **Nieuwe sleutel** `gde-voetbalcarriere-v1` in `storagekeys.js`: het profiel van de speler (versie, speler, seizoen, agenda, selectie, contract, vorm, geld per bron), zoals `gde-loopbaan-v1` en `gde-boerderij-v1`: nooit in een savegame, `normaliseer`, kapotte data geeft een geldig leeg profiel, een versieveld voor toekomstige migraties.
- **Het bestaande `gde-voetbal-v1`** blijft zoals het is (voorkeuren en de vriendschappelijke competitie, per apparaat). Er is geen migratie van een lopend seizoen naar de carrière: wie al een seizoen speelde, houdt dat als vriendschappelijke competitie ("De Euroborg-cup") en de prestatie "Kampioen van de Euroborg" blijft geldig.
- **De `TEAMS`-lijst** in `voetbalrules.js` blijft de zes oorspronkelijke clubs; `voetbalclubs.js` (pakket 1) breidt uit naar 24. Zo breken `voetbal_test` en de Samen-spel-start-`v` niet (clubs gaan op index; de nieuwe clubs krijgen eigen indices).
- **Savegames:** de carrière staat niet in de savegame, dus er is niets te migreren. De wereld van wie het spel opende bewaart niets van gasten (visie 3 en 4).
- **Kapotte data:** een profiel met onzinwaarden valt terug op een nieuwe carrière-uitnodiging; de wedstrijdsim blijft altijd bruikbaar.

## 13. Performance

- **Wedstrijd:** 22 spelers zijn al bewezen (`voetbal_rook_test`); per speler een factor lezen is een constante-tijd-uitbreiding in `tikWedstrijd`. Het publiek komt als `InstancedMesh` bij; budget 0,3 ms.
- **Uitrekenen:** minder dan 200 duels per seizoen, minder dan 1 ms per ronde; geen frame-last.
- **Transferdoorloop:** minder dan 5 ms per seizoenspauze in een idle-taak, nooit tijdens een wedstrijd.
- **Geheugen:** 432 spelers als `Uint8Array` en een naamindex; geen objectgrafen per speler in de hete lus; JSON alleen bij opslaan.
- **Streaming:** trainende NPC's en het publiek worden met de tegels gestreamd en zijn uit buiten 150 m; geen extra werk in vrije wereld. Meting in beeld hoort bij pakket 9 (fps-metingen blijven exclusief, AGENTS.md).

## 14. Tekst, stem en prestaties

- **Nederlands** overal. Alle clubs, spelers en sponsors verzonnen. Verslaggever Hilbrand en Oma Trijntje krijgen extra regels (promotie, degradatie, beker, Waddenbeker, derby); Gronings alleen met zorg en met Nederlandse ondertitel; "Grunn" nooit "de Grunn"; geen "winterstop", geen "voorjaar", geen "volgend seizoen in de lente".
- **Geen TTS** in dit plan: alle beats zijn stil of tekst; als de eigenaar later een opname wil, vraagt dat een TTS-ronde met akkoord (`scripts/voice_stil.json`, `docs/verhaal/TTS-ACHTERSTAND-21-11.md`; de LiteLLM-sleutel is alleen voor de TTS-scripts).
- **Prestaties** (voorstel, tien; `spec_check --write` voor de tellers, Steam-teksten bijwerken): Debuut, Eerste doelpunt in de Terpklasse, Basisspeler, Promotie, Kampioen van de Terpklasse, Bekerwinnaar, Kroonklasse bereikt, Kapitein, Waddenbeker, Trainer, Manager. De bestaande drie blijven.
- **Teksten van spelers:** rugnummers en bijnamen, nooit een echte persoon.

## 15. Stappenplan (FIRE-stijl)

Epic: [#1106](https://github.com/NatusPella/GDE-Groningen/issues/1106) (milestone Voetbalcarrière). Eén work item is één run, één branch en één worktree (SPECS-FIRE: file-eigenaarschap; twee items die hetzelfde bestand raken horen bij elkaar of na elkaar). Mode is voorstel.

| # | Issue | Pakket | Kosten | Mode | Raakt vooral | Hangt af van |
|---|---|---|---|---|---|---|
| 1 | [#1107](https://github.com/NatusPella/GDE-Groningen/issues/1107) | Spelers, ratings en clubs; koppeling aan de sim | M | confirm | `voetbalplayers.js`, `voetbalclubs.js`, `voetbalrules.js`, `voetbalmatch.js`, `voetbalai.js` | |
| 2 | [#1108](https://github.com/NatusPella/GDE-Groningen/issues/1108) | Seizoenen, divisies, beker, Europa, agenda | L | validate | `voetbalseason.js`, `voetbalagenda.js`, `calendarday.js`-haak | 1 |
| 3 | [#1109](https://github.com/NatusPella/GDE-Groningen/issues/1109) | Ontwikkeling, training, vorm, blessures | M | confirm | `voetbalontwikkeling.js`, `voetbaltraining.js` | 1 |
| 4 | [#1110](https://github.com/NatusPella/GDE-Groningen/issues/1110) | Carrière-opslag, menu en de start (eerste slice) | M | validate | `voetbalcarriere.js`, `voetbalcarriereui.js`, `pausemenu.js`, `storagekeys.js`, `todoui.js` | 1, 2 (licht) |
| 5 | [#1111](https://github.com/NatusPella/GDE-Groningen/issues/1111) | Transfers, AI-clubs, managerlaag | L | validate | `voetbaltransfers.js`, `voetbalmanager.js` | 2, 3, 4 |
| 6 | [#1112](https://github.com/NatusPella/GDE-Groningen/issues/1112) | Verhaalbeats en ontgrendeling | S | confirm | `voetbalbeats.js` | 4 |
| 7 | [#1113](https://github.com/NatusPella/GDE-Groningen/issues/1113) | Clubbezit (tak van Bezit, #1095) | M | validate | `voetbalclub_bezit.js`, subtab Club in Land en bedrijf | 5 en Bezit #1097, #1099, #1102 |
| 8 | [#1114](https://github.com/NatusPella/GDE-Groningen/issues/1114) | Samen spelen (teamgenoten, rivalen, ratings) | M | validate | `voetbalmatch.js`, `coopnet.js`-haak | 1, 4 |
| 9 | [#1115](https://github.com/NatusPella/GDE-Groningen/issues/1115) | Wereld, beeld en geluid | L | confirm | `voetbal.js`, `npcvoetbal.js`, audio, kaartlaag | 1 (beeld), 4 |
| 10 | [#1116](https://github.com/NatusPella/GDE-Groningen/issues/1116) | Balans, prestaties, tellers en docs | S, doorlopend | autopilot | `economie_sim_test`, `achievements.js`, specs | alles |
| 11 | [#1117](https://github.com/NatusPella/GDE-Groningen/issues/1117) | Voetbalvelden uit de kaart en lokale clubs (de start van de slice) | M | confirm | `scripts/world/voetbalvelden_audit.mjs` (gebouwd), `voetbalparken.js`, kaartlaag, `voetbal.js` (veld op de plek) | 1 |
| 12 | [#1118](https://github.com/NatusPella/GDE-Groningen/issues/1118) | Sponsors als panden in de wereld (parodiebedrijven, Bezit-koppeling) | S tot M | confirm | `voetbalsponsors.js`, `shopsigns3d.js`-haak, Bezit-pandindex | 5 (budget), Bezit #1096, #1102 |

**Volgorde:** 1, 11 en 3 (11 na 1), daarna 2, dan 4 (eerste slice), dan 6, 8 en 9 naast elkaar, dan 5, dan 12 en 7 (zodra de Bezit-epic er is), en 10 steeds na een pakket.

**Dagen en kosten.** S ongeveer een dag, M twee tot drie dagen, L vijf of meer. De eerste slice (1 + 11 + 2 licht + 4) is ongeveer negen tot twaalf dagen.

### De eerste speelbare slice: "Seizoen 1 in de Talentenklasse"

Wat de speler doet, van begin tot eind, zonder transfers, managerlaag, bezit of Europa:

1. Na akte 1 (zonder Beppe-conflict) komt een appje van de regelaar (B1): "Ik heb je aangemeld bij de club bij jou in de buurt." Aannemen start de carrière en maakt het kindscherm Voetbal onder Loopbanen zichtbaar. Tammo en Tessa zitten allebei in het team; de speler speelt als zijn eigen figuur, de ander is computerteamgenoot.
2. Tessa heeft vijf attributen (de ster, haar dorpsteambonus zit erin), Tammo gewone amateurwaarden; beide hebben een rol.
3. **De club is een lokale club bij het huis in Paddepoel** (pakket 11): de acht dichtstbijzijnde plaatsen met een voetbalpark vormen de Talentenklasse; de wedstrijden worden gespeeld op de echte sportparken van de kaart, met verzonnen clubnamen.
4. De agenda loopt op nachten: een ronde elke 3 speldagen, een trainingsfocus per speldag (kies een attribuut; een kleine vaste winst zonder minigame).
5. Je speelt de ronde zelf op het sportpark van de thuisploeg (11v11, bestaand veld op de plek van het park; uit = een korte reis, zie 3b) of rekent hem uit; de andere zes clubs worden uitgerekend uit hun ratings.
6. Na de ronde krijg je een onkostenvergoeding en bonus (`loopbaanVerdien`), ervaring en vorm; het scherm Stand toont de tabel van acht clubs.
7. Na zeven rondes volgt een einde-seizoenskaart: kampioen of promotie, met één regel (B5) en €200 bij promotie; seizoen 2 is "komt later" (grijs) in de slice.
8. Alles per speler; een vriend kan meedoen (bestaande teamgenoot-flow, ook als de andere figuur) en krijgt geld en ervaring, geen competitie.

**Acceptatie van de slice (tests, geen beeld):** `voetbal_spelers_test`, `voetbalvelden_audit` (de telling en de naamregels), `voetbalparken_test`, `voetbal_seizoen_test` (alleen de lichte vorm), `voetbal_carriere_test`, `careermodel_test` en `pausemenu`-tests bijgewerkt, `voetbal_botsim` onveranderd, `loopbaan_balans_test` met de nieuwe haak, `spec_check`, `docs_index_test`, `voice_coverage`, `text_audit`. Alles wat niet in beeld is gezien staat als "nog niet bekeken" in de issues.

## 16. Risico's en tegenmaatregelen

| Risico | Kans | Tegenmaatregel |
|---|---|---|
| De agenda werkt niet in een open wereld (de speler is bezig met een missie en mist rondes) | hoog | wachtvenster dat nooit geld kost; sim als terugval; verhaal gaat voor; `DAGEN_PER_RONDE` in de balansronde |
| Tempo: te langzaam of te snel | hoog | de balansronde meet; parameter in één tabel; sim-keuze per wedstrijd |
| Ratings maken de sim onevenwichtig (de eerste botsim breekt) | midden | neutraal als standaard; een eigen ratingtest; wijziging per factor gemeten |
| Echte namen of clubs in de generator | midden | bijnamen, geen echte clubnamen, tekstaudit op de combinaties; geen dataset van buiten |
| Een geldmachine (sim, training, transfers) | midden | zie hoofdstuk 7; de economie-sim bewaakt |
| Samen: ratings van een gast (opgevoerd) | midden | geklemd op niveau aan de hostkant; test |
| Samen: rivalen in team 1 vraagt wijziging van de sim (alle mensen zijn nu team 0) | midden | apart pakket 8; testbank-stap; `MAX_SPELERS_VOETBAL` per team |
| Beeld: 24 shirts en publiek op de wedstrijdhelft | midden | patronen en instancing; rook-test; beeldronde |
| Bezit-epic verandert na dit plan (het ontwerp staat nog op een branch) | midden | pakket 7 pas na de merge van #1097 en #1099; stub-interface; gedeelde `zijpadPoort` afgesproken |
| Twee uitnodigingen tegelijk (Bezit en voetbal beginnen allebei na akte 1) | midden | één gedeelde poort en wachtrij (hoofdstuk 8), een zijpad-beat per speldag |
| Verhaalbotsing met de Beppe-boog of een missie | laag | ontgrendelvoorwaarden en een test (`voetbal_beats_test`) |
| Blessures voelen als leed | laag | nooit getoond, uit te zetten, nooit blijvend (besluit vraag 7: blijven) |
| Een parodienaam is te dichtbij een echte club of een logo-achtig shirt | midden | bijlage A: een knipoog, geen directe naam; shirtpatronen zonder herkenbare wapens of kleurencombinaties die een vlag of logo kopiëren; tekstronde en de eigenaar keuren de lijst; testlijst met echte namen blokkeert doorsluipen |
| Het veld van de sim past niet in het echte park of de hoogte klopt niet | midden | veld over het park heen, vlakste veld kiezen, lage barrière; beeldronde (pakket 11) |
| Een uitwedstrijd is te ver of te lang reizen | midden | de acht dichtstbijzijnde clubs; hooguit vier uitritten per seizoen; reisvenster van één of twee speldagen; reizen is een gezamenlijke keuze |
| Sponsorpand is niet in de plaats of de eigenaar verdient dubbel | laag | dichtstbijzijnde pand van het type; klantenbonus hooguit +10% en geen tweede sponsoruitbetaling |
| Tammo en Tessa allebei speelbaar maakt de wisselhaak en de Tessa-teksten onduidelijk | midden | de carrière gebruikt de wisselhaak niet; de losse Euroborg-wedstrijd houdt hem; test op beide figuren |
| Nachtsignaal bestaat niet los van de datum (calendarday) | midden | pakket 2 begint met een onderzoek van `calendarday.js` en een kleine haak; test met vastgehouden datum |

## 17. Besluiten van de eigenaar op de zeven vragen (21-11)

1. **Talentenklasse zonder leeftijd.**
   **Besluit:** ja, zolang Tammo en Tessa allebei kunnen meedoen. Tammo speelt dus ook: Tammo is speler en teamgenoot vanaf het begin, Tessa is de ster, beide zijn speelbaar, en de Samen-spelen-rollen volgen daarop (hoofdstuk 2 en 11).
2. **Trainer of Manager in de UI.**
   **Besluit:** beide. Rollen Speler (begin), later Trainer (sportief) en Manager (zakelijk) als aparte fasen met eigen tabs (hoofdstuk 6).
3. **Acht clubs per divisie.**
   **Besluit:** acht is goed; alle clubs krijgen een parodienaam op een echte club (verzonnen, met een duidelijke knipoog, geen directe namen en geen herkenbare logo's; de grappen staan in bijlage A en niet in de speltekst).
4. **Tweede stadion.**
   **Besluit:** geen tweede stadion. Wel de clubs en velden uit de hele provincie als voetbalvelden: lokale clubs en echte sportparken van de kaart in het begin (met verzonnen clubnamen per dorp), de top in de Euroborg (hoofdstuk 3 en 3b; audit `scripts/world/voetbalvelden_audit.mjs`).
5. **Verzonnen buitenlandse clubs voor het Europese toernooi.**
   **Besluit:** ja, ook met parodienamen op echte clubs (zelfde regels als vraag 3; bijlage A.3).
6. **Sponsors als parodieën op bestaande soorten bedrijven.**
   **Besluit:** ja, en ze bestaan ook in de wereld: een sponsor is gekoppeld aan een echt pand of een winkelplek met een verzonnen bedrijfsnaam, en dat pand is een Bezit-pand dat je kunt kopen en zien (hoofdstuk 7 en 8, pakket 12).
7. **Blessures.**
   **Besluit:** houden. De rustige melding zonder beeld, uit te zetten in Instellingen > Spel, nooit blijvend (hoofdstuk 5).

**Nog open (geen besluit van de eigenaar):** het bestaande verhaal en de canon (twintig jaar kennen, twaalf jaar verliefd, Tammo 34, de jeugdvriend Rikus): zie de lijst in hoofdstuk 2b. De eigenaar heeft hier nog niet over beslist; er is niets in het verhaal gewijzigd.

## 18. Wat niet in dit plan zit

Geen spelcode, geen Electron-run, geen beeldcontrole, geen push, merge of tag. Dit ontwerp is gebaseerd op het lezen van de code en de specs (stand 21-11, main 66ab3b33b) en op de besluiten hierboven; niets is gemeten. De aansluiting op de Bezit-epic volgt `docs/BEZIT-21-11.md` op de branch `boerderij-provincie-plan-21-11` (nog niet gemerged); bij een wijziging daar past hoofdstuk 8 mee.

## Bijlage A. Parodielijsten (alleen in dit document)

De grappen staan **alleen hier**, nooit in de speltekst, het beeld of de code (constitution 2: geen echte clubnamen in speltekst of beeld; parodieën hebben verzonnen namen). In het spel staat alleen de verzonnen naam; de eigenaar en de tekstronde keuren de lijst. Voor elke club geldt: geen direct echte naam, geen logo of wapen van de echte club, shirtkleuren alleen met een eigen patroon (ze mogen aan de echte club doen denken, niet erop lijken). Alle namen zijn voorstellen.

### A.1 Kroonklasse (de top, Euroborg)

| Spelnaam | Parodie op | De grap |
|---|---|---|
| De Stadjers | FC Groningen | "Stadjers" is hoe de stad zichzelf noemt; groen en wit is een eigen patroon, geen logo |
| De Veenpiraten | sc Heerenveen | Heeren-veen: het veen, plus de Friese piraat (Grutte Pier) |
| De Hunebedders | FC Emmen | Drenthe en zijn hunebedden: zo oud als de grond waarop ze spelen |
| De Grachtenhelden | Ajax | Amsterdam, grachten en een held (Ajax was een held) |
| De Gloeipeertjes | PSV | Eindhoven en het gloeilampenbedrijf: een peertje |
| De Kuipvaarders | Feyenoord | Rotterdam, De Kuip en de haven: de kuip is hun kuip |
| De Kaasdragers | AZ | Alkmaar en de kaasmarkt: de dragers dragen het kaasbrood |
| De Noorderlichters | geen echte club (verhaalclub, 28-11) | het noorderlicht boven de Euroborg: de spots gaan aan, maar het licht komt pas na de rust. Vervangt De Domtorenaars (FC Utrecht), zodat het aantal 16 blijft; de eigenaar koos een club in de Euroborg, zonder voorvoegsel (ADR 0043) |

### A.2 Terpklasse (streek)

| Spelnaam | Parodie op | De grap |
|---|---|---|
| De Wadlopers | SC Cambuur | Friesland en het wad: wie wadlopen kan, kan ook promotie halen |
| De Ommelanders | FC Twente | beide de streek rondom de stad die zich de echte noemt |
| De Kleibijters | PEC Zwolle | de IJssel-klei en het volhouden; blauwe vingers worden bijtvingers |
| De Palingtrappers | FC Volendam | Volendam en de paling: de spelers trappen alles wat kronkelt |
| De Polderpitten | Almere City FC | Almere is een polder: pit in een dijkje |
| De Spartelaars | Sparta Rotterdam | Sparta wordt spartelen: de oudste club die nog steeds spartelt |
| De Fortuinzitters | Fortuna Sittard | Fortuna (geluk) plus Sittard: wie zit mag winnen |
| De Doorgaanse Arenden | Go Ahead Eagles | Go Ahead wordt "doorgaan", de arend blijft |

### A.3 Waddenbeker (16 buitenlandse clubs)

De naam van het toernooi, de **Waddenbeker**, is zelf een parodie op de grote Europese kampioenenbeker (de beker met de "Wadden" in plaats van de grote oren). Clubs, elk met een duidelijke knipoog:

| Spelnaam | Parodie op | De grap |
|---|---|---|
| De Koninklijke Matadors | Real Madrid | Real is koninklijk, plus de stierenvechter |
| De Blauwgranaten | FC Barcelona | blauw-granaat (blaugrana) wordt een granaatappel |
| De Beierse Bierbazen | Bayern München | Beieren en het bier |
| De Oudere Dames | Juventus | de bijnaam "de Oude Dame" doorgeschoven naar meerdere |
| De Duivelsmilanezen | AC Milan | Milaan en het rood-zwart: duivels |
| De Zwartblauwe Slangen | Inter | Milaan, de slang van de stad; zwart-blauw is een eigen patroon |
| Mancheester Eenheid | Manchester United | Manchester wordt "cheese" (kaas), United wordt eenheid |
| De Leverbaders | Liverpool | Liver is lever; het bad |
| De Wapenopslag | Arsenal | arsenaal is een wapenopslag |
| De Chelzeeërs | Chelsea | zee (sea), met koeien in plaats van Chelsea |
| De Heilige Parijzenaars | Paris Saint-Germain | Saint-Germain wordt heilig |
| De Matrassenmakers | Atlético Madrid | de bijnaam "de matrassenmakers" is zelf al een grap |
| De Gele Muurbloempjes | Borussia Dortmund | de Gele Muur van het stadion wordt een bloempje |
| De Rode Adelaars van Lissabon | Benfica | de adelaar van het wapen |
| De Groene Klaverknechten | Celtic | klaver en groen-wit |
| De Gala Tafelrondes | Galatasaray | Gala wordt tafelronde |

### A.3b De dorpsclub van het verhaal (28-11)

| Spelnaam | Parodie op | De grap |
|---|---|---|
| De Hoekers | geen echte club (verhaalclub, 28-11) | de hoek van het Hogeland waar de club staat: een hoek is waar je de bal uit schopt, en hier komt hij altijd weer terug. In het verhaal heette de club eerst "VV De Hoek"; zonder voorvoegsel (ADR 0043). Staat in Warffum (`voetbalverhaal.js`) en vervangt daar de sjabloonnaam |

### A.4 Lokale clubs (acht sjablonen, hoofdstuk 3b)

| Sjabloon | Parodie op | De grap |
|---|---|---|
| `<Plaats>er <zelfstandig naamwoord>` (bijvoorbeeld Winsumer Meeuwen) | de naam van het dorp plus een bijnaam | de dorpsbijnaam is zelf de grap |
| `Wees Rap <Plaats>` | Be Quick | Be Quick wordt "wees rap" |
| `Eendenkracht <Plaats>` | Eendracht maakt macht | de eend heeft kracht |
| `Onderling Gezellig <Plaats>` | Onder Ons | onder ons, maar gezellig |
| `Excuseer <Plaats>` | Excelsior | excelsior wordt excuseer |
| `Voorwaarts naar de Kroeg <Plaats>` | Voorwaarts | voorwaarts, naar de kantine |
| `Halfrood <Plaats>` | Rood-Wit | rood-wit wordt halfrood |
| `Nooit Verlegen <Plaats>` | Nooit Gedacht | de naam zegt het zelf |

De acht sjablonen kiezen op het plaats-id; geen enkele club krijgt een voorvoegsel als VV, SV, FC, SC of RKSV.
