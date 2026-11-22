# Is het hele verhaal doorspeelbaar? (22-11, #1121)

Uitvoeringsopdracht van de coordinator: `zorg dat je als speler het hele nieuwe verhaal kunt spelen/ervaren`, van de opening tot en met de epiloog en de aftitels, in Alleen en in Samen spelen. Dit document is het bewijs; het is naslag, de bron is de code. Bewijs (logs, rapporten) staat buiten de repo in `C:\Users\abuis\gde-verhaaltest-22-11\` (zie onderaan).

## Samenvatting

**Hele verhaal speelbaar: met voorbehoud.**

- **Statisch: ja.** De ketenaudit (`node scripts/verhaal_keten_audit.mjs`, nu ook in de static-fase van de releasegate) bewijst over alle 71 stappen (M00 tot en met F6): elke stap is bereikbaar vanaf een nieuw spel, heeft een uitgang, de lijn eindigt op de finale, de poort van Deel 4 houdt het verhaal vast tot de eindkaart van akte 5 is gespeeld, de kalenderdag daalt nooit, elke gelezen vlag wordt eerder gezet, elke scene bestaat met regels en tekst als terugval, elke missiebeloning is positief en een herhaling betaalt minder. Met de wereld (`GAME_WORLD`) ook: 64 plekken (reisdoelen, startplekken, stagedoelen) liggen op open grond of binnen 60 m van een open plek. Resultaat: 0 blokkerend, 3 let op (N9 geen weg binnen 400 m van de dijk bij de Dollard; J5 en M20 liggen 5 m naast open grond, het spel verschuift de speler).
- **Dynamisch (Electron): ja, alle 71 stappen aan de beurt gekomen en afgerond.** De nieuwe doorspeeltest (`GDE_STORY_KETEN=1`, vlag `?ketentest`) speelt elke stap, ook de reis-, thuis- en tussenstappen die de gewone verhaaltest overslaat. Eindrun: `PASS`, 0 mislukte controles, 0 script- of bestandsfouten, geen NaN-melding. 63 van de 71 stappen rondden op hun eigen doel af; 4 stappen (M00, K3, F1, E) waren al afgerond binnen de scene van hun voorganger of bij aankomst en 4 stappen gebruiken een bewuste haak: A1 (de bijbaanronde zelf), V1 en V3 (het winkelmenu) en M05 (zie voorbehoud).
- **Samen spelen: gedeeltelijk bewezen.** De pure en TCP-testen van het verhaal in Samen spelen zijn groen (hieronder); de testbank met een echte Electron-gast is in deze sessie niet gelukt (de host-instantie startte niet, zie "Wat open staat").
- **Minuten per akte**: de scenetijd per akte is ontwerp (catalogus), de speelminuten zijn maar voor een deel gemeten, zie de tabel "Minuten per akte".

## Gevonden en gefixt

| # | Bevinding | Waar | Fix | Regressietest |
|---|---|---|---|---|
| 1 | De scenes F2 tot en met F6 (en M08.3 met de broodtrommel, M15.5 met het kantoor op wielen) stopten met `TypeError: DECOR_MAKERS[p.kind] is not a function`: de rekwisieten soepketel, friteuse, mosterdpot, deken, kaart, hek, frituuraanhanger, broodtrommel en kantoorwagen stonden alleen in de oude tabel `PROP_MAKERS` van `cutscenehost.js`, terwijl de host sinds de verplaatsing naar `storyprops.js` alleen `DECOR_MAKERS` raadpleegde. De speler zag de slotscenes (soep en eierbal, de kade) dus niet. | `game/js/cutscenehost.js` | `(DECOR_MAKERS[kind] \|\| PROP_MAKERS[kind])()` | `scripts/cutscene_decor_maker_test.mjs` (89 controles: elke decorsoort en elk rekwisiet van een cutscene heeft een maker) |
| 2 | De hooklijst van `docs/ONTWIKKELEN.md` miste `__cineJumps` (devflags_test rood op main) | `docs/ONTWIKKELEN.md` | toegevoegd | `scripts/devflags_test.mjs` |

Geen testverzwakking: de ketenaudit heeft een eigen test met kapotte kopieen van de keten (`scripts/verhaal_keten_audit_test.mjs`, 22 controles: niet gebouwde stap, onbekend doeltype, reisdoel zonder coordinaten, brug naar een stap die niet bestaat, terugvallende kalenderdag, vlag die niemand zet, brug die een latere vlag leest, ontbrekende scene en lege regel, negatieve beloning, betalende activiteit, cyclus, ontbrekende poort bij Deel 4, oneindige tijdlimiet, onhaalbare eis).

## De stappentabel

Gemeten met de doorspeeltest (`report.json` in `keten-eindrun`). "Duur" is rekentijd van de test in seconden met de scenes overgeslagen, geen speeltijd. "Scenes" is het aantal scenes dat de test zag en oversloeg. "Via natuurlijk" betekent: de stap rondde af op zijn eigen doel (teleport naar de gids, daarna wachten); "haak" is een debughaak, met de reden.

| stap | akte | bereikt | afgerond | via | duur (s) | scenes | bevinding |
|---|---|---|---|---|---|---|---|
| M01 | kop | ja | ja | natuurlijk | 9.1 | 2 | - |
| M02 | kop | ja | ja | natuurlijk | 5.1 | 2 | - |
| N1 | kop | ja | ja | natuurlijk | 1.2 | 0 | - |
| N2 | kop | ja | ja | natuurlijk | 6.3 | 1 | - |
| N3 | kop | ja | ja | natuurlijk | 1.2 | 0 | - |
| N4 | kop | ja | ja | natuurlijk | 1.1 | 0 | - |
| W1 | kop | ja | ja | natuurlijk | 7.1 | 1 | - |
| M03 | kop | ja | ja | natuurlijk | 20.3 | 3 | - |
| M04 | kop | ja | ja | natuurlijk | 18.1 | 2 | - |
| M05 | kop | ja | ja | haak (eis bike) | 28 | 2 | trigger startte niet in 25 s (eis: bike, de gids wijst naar de winkel), debugstart: {"view":{"end":false,"id":"M05","part":"kop","partTitle":"Akte 1: Moi, Grunn |
| M06 | kop | ja | ja | natuurlijk | 13.7 | 3 | - |
| M07 | romp | ja | ja | natuurlijk | 6.6 | 2 | - |
| M08 | romp | ja | ja | natuurlijk | 3.1 | 2 | - |
| N10 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| N8 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| T1 | romp | ja | ja | natuurlijk | 1.2 | 0 | - |
| M09 | romp | ja | ja | natuurlijk | 5 | 2 | - |
| N5 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| K1 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| M10 | romp | ja | ja | natuurlijk | 11.1 | 2 | - |
| A1 | romp | ja | ja | haak (bijbaan) | 1.1 | 0 | - |
| N11 | romp | ja | ja | natuurlijk | 2.1 | 0 | - |
| N12 | romp | ja | ja | natuurlijk | 1.2 | 0 | - |
| N6 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| N7 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| T2 | romp | ja | ja | natuurlijk | 1.1 | 0 | - |
| M11 | romp | ja | ja | natuurlijk | 7.7 | 4 | - |
| K2 | romp | ja | ja | natuurlijk | 1.1 | 1 | - |
| M12 | staart | ja | ja | natuurlijk | 3.1 | 2 | - |
| J1 | staart | ja | ja | natuurlijk | 7 | 1 | - |
| M13 | staart | ja | ja | natuurlijk | 5.5 | 2 | - |
| M14 | staart | ja | ja | natuurlijk | 3.1 | 2 | - |
| J2 | staart | ja | ja | natuurlijk | 1.1 | 0 | - |
| W2 | staart | ja | ja | natuurlijk | 1.2 | 0 | - |
| T3 | staart | ja | ja | natuurlijk | 1.1 | 0 | - |
| M15 | staart | ja | ja | natuurlijk | 4.6 | 2 | - |
| M16 | staart | ja | ja | natuurlijk | 7.9 | 4 | - |
| A2 | staart | ja | ja | natuurlijk | 8.7 | 0 | - |
| J3 | staart | ja | ja | natuurlijk | 2.6 | 1 | - |
| M17 | zuid | ja | ja | natuurlijk | 5.4 | 2 | - |
| J4 | zuid | ja | ja | natuurlijk | 1.1 | 0 | - |
| M18 | zuid | ja | ja | natuurlijk | 25.1 | 4 | - |
| N9 | zuid | ja | ja | natuurlijk | 1 | 0 | - |
| J5 | zuid | ja | ja | natuurlijk | 1.1 | 0 | - |
| M19 | zuid | ja | ja | natuurlijk | 4.6 | 2 | - |
| J6 | zuid | ja | ja | natuurlijk | 7.5 | 1 | - |
| V1 | zuid | ja | ja | haak (winkelbezoek) | 2.4 | 1 | - |
| V2 | zuid | ja | ja | natuurlijk | 1.1 | 0 | - |
| V3 | zuid | ja | ja | haak (winkelbezoek) | 1.2 | 0 | - |
| T4 | zuid | ja | ja | natuurlijk | 1.2 | 0 | - |
| M20 | zuid | ja | ja | natuurlijk | 12.7 | 4 | - |
| M21 | zuid | ja | ja | natuurlijk | 5 | 4 | - |
| M22 | ontzet | ja | ja | natuurlijk | 7.5 | 3 | - |
| F2 | ontzet | ja | ja | natuurlijk | 1.4 | 1 | - |
| M23 | ontzet | ja | ja | natuurlijk | 6.8 | 4 | - |
| M24 | ontzet | ja | ja | natuurlijk | 14.1 | 2 | - |
| M25 | ontzet | ja | ja | natuurlijk | 5.2 | 2 | - |
| M26 | ontzet | ja | ja | natuurlijk | 8.2 | 4 | - |
| F3 | ontzet | ja | ja | natuurlijk | 2.8 | 1 | - |
| F4 | ontzet | ja | ja | natuurlijk | 1.6 | 1 | - |
| F5 | ontzet | ja | ja | natuurlijk | 1.5 | 1 | - |
| M27 | nazomer | ja | ja | natuurlijk | 5.7 | 3 | - |
| M28 | nazomer | ja | ja | natuurlijk | 3.3 | 2 | - |
| M29 | nazomer | ja | ja | natuurlijk | 3.6 | 3 | - |
| T5 | nazomer | ja | ja | natuurlijk | 1.2 | 0 | - |
| M30 | nazomer | ja | ja | natuurlijk | 9.6 | 5 | - |
| F6 | nazomer | ja | ja | natuurlijk | 1.7 | 1 | - |
| M00 | kop | ja | ja | automatisch (bij aankomst) | 0 | 0 | - |
| K3 | staart | ja | ja | automatisch (bij aankomst) | 0 | 0 | - |
| F1 | ontzet | ja | ja | automatisch (bij aankomst) | 0 | 0 | - |
| E | ontzet | ja | ja | automatisch (bij aankomst) | 0 | 0 | - |

Bevindingen per stap met een haak of automatische afronding:

| Stap | Bevinding | Fix of beoordeling |
|---|---|---|
| M00 | de opening is al klaar als de test begint (de test start een spel zoals een speler en slaat de opening over) | geen; de opening wordt door de gewone verhaaltest en de bot gespeeld (zie akte 1 hieronder) |
| M05 | de KEI-weekrace is een fietsrace en eist een eigen fiets (`requires: 'bike'`); met alleen een teleport start hij niet. De gids wijst dan naar de fietsenwinkel ("Eerst: ..." met de tekst "Koop er een bij ..."); de speler kan hem dus niet missen, maar de lead van de stap noemt de fiets niet | geen blokkade; de gate is ontworpen. Wens: de lead van M05 zou de fiets mogen noemen (bij de verhaal-lead) |
| A1 | bijbaan (bieten): de ronde zelf duurt minuten en wordt met de haak overgeslagen | zoals in de gewone verhaaltest |
| V1, V3 | winkelstappen: de gids staat bij de winkel (afstand 0 tot 1 m); het bezoek zelf is een menu | dekking bij de winkeltests, hier alleen de gids |
| K3, F1, E | afgerond zodra de speler aankomt of binnen de scene van de voorgaande stap (de speler staat na M13, M21 en F5 al op de plek van het doel); E is de epiloog | geen blokkade; de epiloog is gespeeld (`ending.finale: true`) |

## Minuten per akte

| Akte | Stappen | Scenetijd (ontwerp, catalogus) | Gemeten speeltijd | Bron |
|---|---|---|---|---|
| 1 Moi, Grunn | 12 | 24:39 | 61:15 speeltijd voor M00 tot en met W1 (8 van de 12 stappen; echte tijd 21:39 op snelheid 4, 3 teleportcheats) | bot-run `bot-akte1`; M01 1:16, M02 12:23, N1 1:55, N2 15:24, N3 5:13, N4 9:56, W1 15:03 |
| 2 Het Noorden is groot | 17 | 18:36 | niet gemeten in deze sessie | oudere meting: `docs/verhaal/BALANS-TEMPO.md` |
| 3 Aan de Eems | 12 | 27:36 | niet gemeten in deze sessie | idem |
| 4 Zuidwaarts | 13 | 20:47 | niet gemeten in deze sessie | idem |
| 5 Ontzet (met F1 tot en met F5 en E) | 11 | 29:23 | niet gemeten in deze sessie | idem |
| Deel 4 Nazomer | 6 | 8:58 | niet gemeten in deze sessie | idem |

Eerlijk over de meting: de opdracht vroeg minstens drie keer een blok van 4 tot 6 opeenvolgende stappen door een spelbot of proefspeler. Er is er een gespeeld (de bot, akte 1: M00, M01, M02, N1, N2, N3, N4, W1; de overgangen tussen opeenvolgende stappen zijn daar echt doorlopen). De bot is ongeveer anderhalf uur wandtijd per blok kwijt; twee blokken meer zijn niet gedraaid. Wat dat blok liet zien:

- N2 en W1 (thuisstappen: naar huis en naar boven) kostten de bot elk 15 minuten en 7 tot 8 keer "vast" op 1 tot 20 m van het doel. Dat is grotendeels een beperking van de bot (hij weet niet dat hij bij de deur op E moet drukken of de lift moet nemen), maar of een mens de deur en de lift zonder hulp vindt, is **nog niet bekeken**.
- N3 en N4 (reisstappen van 3,7 en 1,4 km): de bot bleef bij de flat staan (6 keer vast) en kreeg na 35 s een teleportcheat. Hij pakt het voertuig niet vanzelf; de reisbeat (Meerijden of Zelf rijden) biedt de speler die keuze wel. **Nog niet bekeken** met een mens.

## Samen spelen (gast)

Regel (zie ook `docs/COOP-GAST.md`): een W-, K-, J-, N- en F-stap is van de speler die hem speelt (eigen voortgang, #429); een gast speelt zijn eigen verhaal als lokale hoofdpersoon (Tammo of Tessa) in de wereld van de host; er gaat niets over het net dat er niet al was.

Groen in deze sessie (gewoon `node`):

| Test | Uitslag | Wat ze dekt |
|---|---|---|
| `coopverhaal_test` | 14/14 | de eigen verhaalvoortgang van een gast (save, vlaggen, stappen) |
| `multiplayerstorysteps_test` | 5 ok | de stappen van het verhaal in een sessie |
| `cutgast_test` | 5/5 | de scenes aan de gastkant (regels, duur, kaarten) |
| `coopgaten_test` | 19/19 | de gaten van het nalopen voor vrijdag |
| `coop/vrijdag_test` | 22/22 | vier spelers: beloningen per speler, klok, lijst |
| `coop/regressie_test` | 467 controles (2, 4, 8, 16 spelers) | de volledige samen-scenario's |
| `unlockgate_test` | 41/41 | de poort per akte per speler |
| `storymigratie_test`, `_k_`, `_w_`, `_jelle_` | 28, 28, 24, 18 | een oude save voorbij een toegevoegde stap |

Niet gelukt: `node scripts/coop/testbank.mjs --suite=verhaal --gasten=1` (host en een Electron-gast, M01 tot en met N1). De host-instantie schreef niets (leeg `events.jsonl`) en gaf geen kamercode; oorzaak niet uitgezocht (waarschijnlijk de wegwerpprofiel-map of de zichtbaarheid van het venster in deze omgeving). Akte 1 en een later blok in Samen spelen met echte Electron-instanties zijn dus **nog niet bekeken**.

## Hoe de doorspeeltest werkt (en een valkuil)

- `GDE_STORY_KETEN=1` bij `--story-test=<map>` (vlag `?ketentest`, `game/js/storyketentest.js`): na de start speelt hij elke stap in volgorde. Activiteiten: teleport naar de gids en wachten op het eigen doel (thuisscenes via `__home`, kermis en padel via hun haak); missies: teleport naar de start en de objectives een voor een. Elke stap krijgt een rij in `report.keten` (bereikt, afgerond, via, duur, scenes, fouten); console-, script- en bestandsfouten (`fetch`, afbeelding, geluid) worden per stap opgevangen; een afgebroken tegel-fetch na een teleport telt niet.
- Een stap die niet vanzelf afrondt, krijgt een diagnose (afstand tot de gids, scene bezig, missie actief) en wordt met de haak doorgezet, zodat de rest van de keten nog draait; zo'n stap staat als `haak` in de tabel en laat de controle "zonder haak" falen.
- Valkuil: een verborgen of afgedekt Electron-venster stopt de rAF-lus en de timers; zonder aandacht kwam een run niet verder dan de eerste stappen. Hielp wel: `GDE_NO_THROTTLE=1`, `--disable-features=CalculateNativeWinOcclusion`, `--disable-renderer-backgrounding`, `--disable-background-timer-throttling` en een kleine CDP-verbinding (`--remote-debugging-port`, niet poort 9000) die elke paar seconden de pagina laat evalueren.
- Eigen profiel: `GDE_TEST_PROFILE` moet in de werkboom staan; een profiel in een andere map gaf "Toegang geweigerd".

## Wat open staat

- Een mens of de proefspeler die de blokken 2 en 3 echt speelt (akte 2 of 3 en akte 5 of Deel 4), en de thuis- en reisstappen van akte 1 zonder bot (deur, lift, reiskeuze): **nog niet bekeken**.
- Samen spelen met echte Electron-instanties: de testbank liep niet; **nog niet bekeken**.
- Wat de gewone verhaaltest nog laat falen op deze machine (niet door deze wijziging): `post-game koe` (de uitdaging "De Koe van Ome Jan" registreert geen medaille met de testhaak, waardoor "all challenges count as done" faalt en de aftitels (`credits`) niet vanzelf starten) en wat timinggevoelige minigame- en eventchecks (waterski, aardbeving) onder belasting. De Koe-uitdaging is niet uitgezocht en hangt aan de aftiteling; zie het commentaar op #1121.
- Beeld en gehoor: niets in beeld of gehoor gezien (alleen de test en de screenshots van de testrun in `keten-eindrun`).

## Bewijs

`C:\Users\abuis\gde-verhaaltest-22-11\`: `keten-eindrun\` (report.json, tabel, audit.json, log), `bot-akte1\` (report.md, result.json van de bot), `story-test-basis\` (de gewone verhaaltest met de fouten F2 tot en met F6, voor de fix), `coop1.log` (de mislukte testbankrun).
