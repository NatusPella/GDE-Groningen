# Audit vervoer, water, lucht en verweven loopbanen (28-11, #1375, #1376, #1377, #1379)

Branch `audit-vervoer-water-28-11`, gebaseerd op `origin/main` (integratie-0.67, na `d745de15d`). Alleen gelezen en geschreven: geen spelcode gewijzigd.
Bron voor de gewenste diepte: `02-loopbanen.md` §3 (Vervoer), §4 (Water), §6 (Verwevenheid), §7 (Samen spelen); `01-verhaal-en-personages.md` (H7 tot H10, namenregister regel 223 tot 237); `game/js/storysteps.js` (het stappenplan H1 tot H16 als data).

## 0. Wat is gecontroleerd en wat niet

Gecontroleerd door de code te lezen en de bijbehorende puur-tests te draaien (allemaal groen): `vaarnet_test` (111), `boat_traffic_test` (11), `careerbeats_test` (6), `loopbaan_test` (36), `loopbaan_coop_test` (10), `busservice_test`, `busdienst_test`, `trainservice_test` (6082), `zeeschipvaart_test`, `airguide_test` (53), `heli_missie_test` (95), `vliegschool_test` (166), `vrachtmarkt_test` (249), `coopboot_test` (8), `coop/buscoop_test`, `coop/treincoop_test` (56).

**Niet gecontroleerd:**
- Alle tests die `game/world` met de provincie nodig hebben SKIPpen in deze worktree: `treinrit_stations_test`, `vaarwegklasse_test`, `heli_spots_world_test`, `hull_route_audit`. Over die onderdelen (route van een binnenvaartschip, vaste heliplekken op de echte kaart, stationparen) zeg ik dus niets op grond van een run, alleen op grond van de code.
- Er is niets in beeld gezien (geen Electron, geen contactvel). Of een binnenvaartschip van dichtbij goed oogt (5, 20, 60 m en alle LOD's) is dus onbekend; dat staat als open punt in W3.
- Of een gast of speler een door de AI varend binnenvaartschip echt kan overnemen is uit de code afgeleid (zie §3.2), niet gespeeld.

## 1. Belangrijkste bevindingen (kort)

1. **De mechanica bestaat grotendeels; het verhaal en de rangmomenten ontbreken.** Bus, taxi, trein, rondvaart, veer, zeeschip, vliegschool, heli-missies en een vrachtmarkt zijn gebouwd en getest. Niets daarvan is aan het nieuwe verhaal gehangen: `storysteps.js` zegt zelf dat het live verhaal (`storyarc_nieuw.js`, ARC_ID `nieuw`) nog niet is verplaatst. De stappen `h7-dries`, `h7-trein`, `h8-wiebe`, `h8-lammert`, `h8-rubberboot` en `h9-ballon` bestaan alleen als data (`storysteps.js` regel 101 tot 116), niet als speelbare stap.
2. **Namen in `02-loopbanen.md` zijn achterhaald.** Het namenregister in deel 1 (regel 230 tot 237) wint, en het issue gebruikt het ook: Schipper Okke wordt **Wiebe Hazenberg**, Schipper Geert wordt **Lammert Veenstra**, Fenna wordt **Noor**, sluiswachter Berendien wordt **Dina**, stationschef Pieter wordt **Jochem Luiken**, Chauffeur Dries heet **Dries Oltmans**. Bouwers moeten de namen uit het register nemen, niet uit §3 en §4 van deel 2.
3. **Binnenvaartschepen (spits, kempenaar) bestaan, maar alleen als sfeer.** Ze varen als AI-verkeer (`vehicle/boatwater.js` regel 181 en daaronder: hooguit 4 in de hele wereld, hooguit 2 per kanaal) en je kunt er een neerzetten via het testmenu. Er is geen baan, geen vaste kade, geen lading, geen eigen schip. Bouwen: W3 en W4.
4. **De bijbel zegt dat "vracht" voor water ontbreekt; dat klopt, maar er is een vrachtmarkt voor de weg** (`vrachtmarkt.js`, `vrachtkosten.js`, `sidejob_vracht.js`) die als sjabloon dient: contract met type, tarief per km, laad- en lostijd, pure regels en een seed. Niet hergebruiken als code (opleggers), wel als vorm.
5. **De ballon is niet bestuurbaar.** Hij is decoratief verkeer (`skyprops.js` regel 258 tot 310) en een vangdoel voor de heli (`heliplan.js` regel 162, `helirun.js` regel 75 tot 90). Het stappenplan vraagt "Stijg op in de ballon boven de Dollard" (`h9-ballon`) en de relatietabel zegt "Tessa (ballon)". Dat is een nieuw voertuig, geen verhaalschrijfwerk.
6. **Er is al een uitgewerkt patroon voor een begincutscene per carrière** (`careerdebut.js`, `careerdebutrun.js`, `docs/CARRIERESCENES-22-11.md`): eenmalig per speler via een verhaalvlag, wacht op een rustig moment, werkt voor gasten. Dat is de bouwsteen voor "verhaalingang" van vervoer, water en lucht. Er is ook een hook voor een niveau omhoog (`loopbaanlive.js` `meldOmhoog`, regel 147) en een tabel met koppelmomenten (`careerbeats.js`), maar die kent maar twee soorten momenten (begin en niveau 2), geen verhaalmoment per rang.
7. **Samen spelen bij lucht is al beperkt tot passagier.** Een gast kan geen heli of vliegtuig besturen (`coopbestuur.js` regel 25 en 161); dat past bij #1377 ("meevliegen"), maar een ballon moet in dezelfde regel komen.
8. **Alleen `loopbaan.js` en `storyarc_nieuw.js` zijn conflictgevoelig.** De bijbel zegt het zelf (fase 3: botsing op `voetbal*.js` en `loopbaan.js`). Alle drie de loopbanen hier willen in `loopbaan.js` (START, BAAN_VAK, VAARDIGHEDEN) en in `storyarc_nieuw.js`; dat bepaalt de volgorde in §6.

## 2. Gemeenschappelijke bouwstenen (nieuw te bouwen of aan te passen, één keer voor alle drie)

| Bouwsteen | Stand | Bestanden |
|---|---|---|
| Begincutscene per loopbaan, eenmalig per speler | bestaat voor voetbal en landbouw: `FOOTBALL_FLAG`/`FARM_FLAG`, `SCENES` (`careerdebut.js` regel 21 tot 96), triggers `footballDue`/`farmDue` (regel 270 tot 290), afspelen in `careerdebutrun.js` | uitbreiden met `vervoer`, `water`, `lucht`; `scripts/careerdebut_test.mjs` |
| Verhaalmoment per rang | ontbreekt. `careerbeats.js` heeft per vak `vraag` (begin) en `koppel` (niveau 2); `meldOmhoog` (`loopbaanlive.js` regel 147 tot 158) roept alleen bij `naar === 2` een talk aan | `careerbeats.js` uitbreiden met `rang: { 3: [...], 4: [...], 5: [...], 6: [...] }`; hook in `meldOmhoog`; `scripts/careerbeats_test.mjs` |
| Nieuwe stap in het live verhaal | ontbreekt voor de H7-, H8-, H9-stappen. Een toegevoegde stap hoort in `ADDED_STEPS` (`storyarc.js` regel 100) zodat een oude save hem niet opnieuw speelt; elke stap met `scene` heeft een `stepdoel.js`-regel (N7 staat op regel 38) | `storyarc_nieuw.js`, `storyarc.js`, `stepdoel.js`, `storysteps.js`; `scripts/storysteps_test.mjs`, `scripts/story_spine_test.mjs` |
| Personages in de dossiers | `wiebe` (`characterdossiers_minor.js` regel 43), `schipper_lammert` (regel 204), `klaas`, `dijkstra`, `roelfien`, `lammert` (havenmeester, `characterdossiers_story.js`) bestaan. **Ontbreken:** Dries Oltmans, Dispatcher Annemarie, mevrouw Wassink, Jochem Luiken, Noor, Dina, Tjalling, de loods | `characterdossiers_minor.js`, `characterdossiers_relations.js`; `scripts/characterdossiers_test.mjs` |
| Gebieden | `storyareas.js` (vier gebieden, loopbaan `vervoer` thuis `stad`, `water` thuis `waddenkust`) | alleen lezen |

Let op twee kleine dingen die elke bouwer moet kennen:
- De spreeksleutel van Tessa in de code is `anita`, en `careerdebut.js` regel 27 (`SPEAKER_NAME.A = 'Anita'`) en `careerbeats.js` regel 31 (`speaker.A = 'Anita'`) tonen die naam als ondertitel. Constitution 2 en de bijbel zeggen Tessa. Controleer of de ondertitel "Anita" of "Tessa" toont voordat je op deze bestanden bouwt (niet in beeld gezien).
- `loopbaan.js` regel 8 en `docs/LOOPBAAN.md`: het profiel staat in een eigen opslag (`gde-loopbaan-v1`), niet in de save. Een rangmoment of debutvlag dat in het profiel zou komen is wel per speler, maar niet in de save: gebruik de verhaalvlaggen zoals `careerdebut` doet (`storyBridgeView().flags`).

## 3. #1375 Vervoer (taxi, bus, trein; de chauffeur valt weg)

### 3.1 Wat bestaat

| Onderdeel | Bestand en regels | Staat |
|---|---|---|
| Vak Spoor, Bus, Taxi met 6 titels (Perronstaander tot Spoorbaas, Haltewachter tot Busbaas van Grunn, Meerijder tot Koning van de standplaats) | `loopbaan.js` regel 40 tot 48; XP-drempels `XP_DREMPELS` regel 15; loon `LOON_FACTOR` regel 18 | Gebouwd, titels komen overeen met de rangtabel in deel 2 |
| Eerste klus per vak | `loopbaan.js` `START` regel 129: bus `lijn` bij de streekbus, taxi `taxi` bij de standplaats, trein zonder baan (reis of machinist) | Gebouwd |
| Kaartjesknipper (niveau 3) | `loopbaan.js` `VAARDIGHEDEN` regel 182 tot 187; `kaartjescontrole.js` | Alleen bij Spoor |
| Buslijndienst, dienstregeling, punctualiteit | `busservice.js` (75 regels), `busroutes.js` (294), `sidejob_lijn.js` ("Streekbus Hunzedal", regel 29), `sidejob_bus.js` ("stadsbus lijn 3", `STOPS` regel 39) | Gebouwd, getest (`busservice_test`, `bus_lines_test`, `busdienst_test`) |
| Live bussen, bron in Instellingen | `livebussen.js`, `busbron.js`, `docs/BUSSEN-LIVE-21-11.md` | Gebouwd |
| Taxibijbaan, nacht, reclametaxi | `sidejob_taxi.js` (regel 106), `taxistatus.js`, `bijbaanregels.js` `taxinacht` (regel 47), `sidejob_bijbaan.js` regel 117, `reklametaxi.js` | Gebouwd |
| Trein: echt rooster, machinist, cabine | `trainservice.js` (deterministisch uit de spelklok), `machinist.js` (`startDienst` regel 58, `dienstBeloning` regel 159), `treindienststart.js` (vervoerder **Noorderspoor**, `dienstregeling.js` regel 11) | Gebouwd |
| Samen een bus of trein | `coopbus.js`, `buscoop.js`, `cooptrein.js`, `treincoop.js`; `BIJBAAN_REGELS.taxi` = passagier (`coopbijbaan.js` regel 32) | Gebouwd, getest (`coop/buscoop_test`, `coop/treincoop_test`) |
| Verhaalstappen die al in het live verhaal zitten | `storyarc_nieuw.js` N7 "De streekbus naar Winsum" (regel 326), N11 "Een bezorgrondje bij Bedum" (323), T2 "De streekbus naar Zoutkamp" (327, `loopbanen: ['bus','hengelen']`), T1 "De trein naar Warffum" (307, `loopbanen: ['trein']`) | Gebouwd, zonder Dries, Annemarie en Jochem |
| Stappenplan met het nieuwe verhaal | `storysteps.js` regel 101 tot 105: `h7-dries` (nieuw, `unlocks: 'vervoer'`), N7, N11 (`move`), `h7-trein` (nieuw, Jochem Luiken) | Alleen data |

### 3.2 Wat ontbreekt

- **Het verhaal zelf:** Dries Oltmans, Dispatcher Annemarie (stem op de portofoon), mevrouw Wassink, Jochem Luiken komen nergens in de code of dossiers voor (gegrepen op `Dries`, `Annemarie`, `Wassink`, `Luiken`, `Oltmans`: geen treffer in `game/`). Er is geen scène, geen koffiekan en briefje in de bus, geen portofoonregel.
- **"De chauffeur valt weg" als aanleiding:** de speler start vervoer nu bij de bus of de standplaats (`START`), niet door een gebeurtenis. De stap `h7-dries` met `unlocks: 'vervoer'` bestaat niet live.
- **Verhaalmoment per rang** (de kolom "Verhaalmoment" in de rangtabel van §3(b)): geen enkele rang heeft er een. Bus en taxi hebben ook geen vaardigheid per niveau; alleen Spoor heeft er twee.
- **Een eigen vervoersbedrijf** (wagenpark, tarieven, concessie): niet gebouwd. Het issue zegt "Vervoer blijft minimaal in het verhaal (besluit eigenaar)", dus niet in de eerste ronde.
- **De naam van de vervoerder is dubbel:** deel 2 noemt "Noorderspoor en -bus"; de code heeft **Noorderspoor** (trein, `dienstregeling.js` regel 11), **Streekbus Hunzedal** (`sidejob_lijn.js`) en **Stadsbus lijn 3** (`sidejob_bus.js`). Kies één regel: Noorderspoor voor de trein en de bus-dienst in het verhaal laten staan, en Hunzedal als bijbaannaam laten. Beslissing voor de coördinator.
- **Reisroutes "voor de rest van het verhaal":** het issue noemt ze, de bijbel definieert ze niet scherp. Aanname in W-V4: de bestaande reisstappen (`type: 'reis'`, `storyreis.js`) moeten per gebied een bus- of treinroute kunnen gebruiken. De treinritten zelf (alle stationparen) zijn door `treinrit_stations_test` gedekt, maar die test SKIPpt hier.

### 3.3 Hergebruik

`careerdebut.js` (scène), `busservice.js`/`sidejob_lijn.js` (de eerste dienst is de bestaande lijndienst), `trainservice.js` (rooster), `machinist.js` (Jochem leert hen de dienst), `coopbijbaan.js` (taxi-passagier is al gebouwd), `storyareas.js` (gebieden).

### 3.4 Risico's

- **Save-migratie:** een nieuwe live-stap vóór bestaande stappen (H7 ligt na het erf in de bijbel, maar N7 staat in het live verhaal tussen M11 en M12) verandert de volgorde voor bestaande saves. De verhaalgids wil `ADDED_STEPS`/`passedBetweenSteps`-behandeling en een test in dezelfde commit (`storysteps.js` regel 21 tot 23).
- **Conflict met voetbal- en boerbouwers** in `storyarc_nieuw.js` en `loopbaan.js` (zie bevinding 8).
- **Gasten en bus:** `BIJBAAN_REGELS` heeft geen regel voor `lijn` of `bus` (alleen `taxi`, `bezorger`, `vracht`); het meedoen aan een buslijn loopt via `coopbus.js` en niet via "Meedoen? J/N". Een nieuwe vaste lijndienst moet dat pad volgen, niet BIJBAAN_REGELS.
- **Animatie en beeld** (thema 9 van het issue): trein-, bus- en taxi-LOD en wielen zijn eerder gecontroleerd (`trein_lod_test`, `businterieur3d_test`), niet opnieuw in beeld voor deze ronde.

## 4. #1376 Water (rondvaartschipper in de stad, binnenvaartschipper door de provincie)

### 4.1 Wat bestaat

| Onderdeel | Bestand en regels | Staat |
|---|---|---|
| Vak Water met 6 titels (Dekhulp tot Zeebaas van de Waddenzee) | `loopbaan.js` regel 55 tot 57; `START.water` (regel 129 e.v.) = rondvaart; `KM_XP.water` = 3 per km (regel 229) | Gebouwd |
| Rondvaartgids en ontspannen tour | `sidejob_rondvaart.js` (route `LINE` regel 25, baan regel 55), `sidejob_rondvaarttour.js` (regel 23), `rondvaartlines.js` (Tammo gids, Tessa verbetert), `rondvaartstatus.js` | Gebouwd, `rondvaarthud_test` groen |
| Rondvaartachtervolging M8 | `rondvaartchase.js` (1236 regels): Wiebe is hier de boze eigenaar in zijn sloep (regel 269) | Gebouwd. **Let op:** Wiebe is in de missie de achtervolger, in H8 de gewonde schipper; de bijbel (deel 1 regel 183) bedoelt dat zo ("boos op de wal, warm eronder") |
| Veerdienst, strandpost | `sidejob_veer.js` (regel 18), `bijbaanregels.js` | Gebouwd |
| Zeeschepen als loopbaan: loodsen bij Lauwersoog en Eemshaven | `zeeschipvaart.js` (`HAVENS` regel 14 tot 25), `sidejob_zeeschip.js` (`KUSTVAARDER` regel 17), `zeeschip3d.js`; `zeeschipvaart_test` groen | Gebouwd. Dit is het "later zeeschepen"-deel van het provinciespoor |
| Boottypes | `boattypes.js`: `spits` (regel 30, 38,5 m, speelbaar: `playerTop`, `playerAccel`), `kempenaar` (31, 50 m), `acht`, `skiff`, `rondvaart`, `skutsje`, zeeschepen; 15 verzonnen scheepsnamen incl. **De Drie Zusters** (regel 62 tot 70, `binnenvaartName`) | Gebouwd |
| Binnenvaart als AI-verkeer | `vehicle/boatwater.js` `manageBoatPopulation` (regel 129): spawn op brede kanalen (`nav >= 4`, breedte >= 24 m, `streetlifedata.js` `pickWaterLife` regel 130), `BARGE_MAX` 4, `BARGE_PER_WATER` 2 | Gebouwd |
| Binnenvaartschip neerzetten voor de speler | `testmenulogic.js` regel 51 tot 52, `testmenu.js` regel 134 tot 139: "loop erheen en stap in". Aan boord stappen op een boot controleert niet op bezet (`player.js` regel 1036: `!v.isBoat`) | **Antwoord op "zijn ze bestuurbaar?": ja volgens de code** (een gewone `Vehicle` met `isBoat`, eigen `playerAccel`), maar niet gespeeld of in beeld gezien; bovendien alleen via een testmenu, niet via een baan of kade |
| Binnenvaartromp, stuurhut, interieur | `models3d_vehicles.js` `binnenvaartFit` (regel 3402), `bootinterieur.js` `binnenvaartHut` (regel 119), `bootinterieur3d.js` LOD's | Gebouwd |
| Vaarnet (graaf, sluizen, bruggen, klassen) | `vaarnet.js` (`routeVaar`, `planVaarRoute` regel 352, `passBridge`, `lockPassage`), `game/vaarnet.json` (1,98 MB), `vaarload.js`, `locks.js`, `sluizen.js`, `movablebridges.js`; `routing.js` regel 810 `planBoatTrip` gebruikt het net ook voor de speler (kaartroute) | Gebouwd, `vaarnet_test` 111 controles groen |
| Samen met een boot | `coopboot.js`: **alleen** het gladstrijken van een boot bij de gast (positie, koers, deining, LOD). Samen op een boot is per baan: `BIJBAAN_REGELS.rondvaart/rondvaarttour/veerdienst` = passagier (`coopbijbaan.js` regel 37 tot 41) | Gebouwd, maar de bijbel noemt `coopboot.js` ten onrechte "samen op een boot" |
| Vracht over de weg als sjabloon | `vrachtmarkt.js` (contract, `TYPES`, tarief per km), `vrachtkosten.js`, `sidejob_vracht.js` (regel 88; `betaalRitkosten` regel 73), `loopbaan.js` `BAAN_VAK` vracht regel 105 e.v. | Gebouwd voor de weg; niets voor het water |
| Rondvaartboot en eigen boot | `shops.js` regel 105: `boot: 'Bootje Huren'` (alleen huren); `home.js` steiger; `werf.js`/`werflive.js` (een werf waar een zeeschip te water gaat; geen koop) | Geen koop van een binnenvaartschip |
| Stappenplan | `storysteps.js` regel 107 tot 111: `h8-wiebe`, `h8-lammert` ("De Drie Zusters brengt leveringen voor de hoeve en voor Geesje"), `K2` (move), `h8-rubberboot` | Alleen data |

### 4.2 Wat ontbreekt

- **Het verhaal:** Wiebe die uitvalt (heup, megafoon), Noor (gids-student), het logboek, de pet, de foto van twee jonge schippers, Lammert Veenstra als mentor, havenmeester Tjalling in Zoutkamp, sluiswachter Dina, de loods op de marifoon. Wiebe en Lammert Veenstra hebben een dossier maar geen verhaalstap (Wiebe's dossier zegt het zelf: "zonder verhaalstap"). De anderen ontbreken helemaal.
- **Rangmomenten** voor Dekhulp tot Zeebaas (geen enkele rang heeft er een), en een scheiding stadsspoor (Dekhulp tot Schipper) en provinciespoor (Kapitein en verder) in de code: `loopbaan.js` kent alleen een vak Water, geen sporen. Een nieuwe `VAARDIGHEDEN.water` (zoals Spoor) kan het provinciespoor bij niveau 4 ontgrendelen.
- **Een binnenvaartbaan:** geen `sidejob_binnenvaart` of gelijkwaardig; geen vaste kade waar je het schip begint; geen lading, laden en lossen, planning; geen "De Drie Zusters" als vast schip (de naam is een willekeurige uit 15, op basis van `v.id`).
- **Havens en kades als plekken met laden en lossen**: `vaarnet.json` heeft knopen van het type `haven`, `sluis`, `brug`, `zee`, maar geen laad- en loskade met een eigen betekenis. `marinas.json` en `bootplek.js` zijn voor pleziervaart en reizen.
- **Sluistijden en wachtrijen als spel:** de sluis werkt voor de boot (`sluizen.js`, `locks.js`: aanvragen, deur, peil, uitvaren; `queue` in `makeLock`) en de route telt de wachttijd (`lockPassage`), maar een speler die in een 50 m lang schip een sluis in wil, is niet getest. Dat is een open vraag, geen vastgestelde fout.
- **Eigen schip, vloot, rederij:** niet gebouwd (zie "Rondvaartboot en eigen boot").
- **Samen spelen met rollen:** de bijbel vraagt een bemanning (stuurman, dekhulp, gids), een gezamenlijke lading en handel; er is alleen "passagier" in `BIJBAAN_REGELS` en `coopbijbaan.js`. "Het schip ligt stil aan het anker bij wegvallen" bestaat niet voor boten (de bus remt veilig af in `buscoop.js`; een boot heeft een zachte rem door zijn lage `brake`, maar geen anker- of afmeerregel).
- **Animatie en LOD op 5, 20, 60 m voor het binnenvaartschip:** niet in beeld gezien (zie §0).

### 4.3 Hergebruik

`rondvaartlines.js` en `sidejob_rondvaarttour.js` (de stadsdienst met Tammo en Tessa); `careerdebut.js` (scène op de steiger); `spawnJobBoat` (`sidejobkit.js`, gebruikt door rondvaart, veer en zeeschip) voor de binnenvaartbaan; `BOAT_KINDS.spits`; `planVaarRoute` voor de routehulp; `vrachtmarkt.js` als vorm voor de lading; `zeeschipvaart.js`/`sidejob_zeeschip.js` als voorbeeld van een haven-baan op het sidejob-contract; `coopbijbaan.js` (`BIJBAAN_REGELS`) voor een bemanningsrol; `coopbeloning.js` (`gebeurtenisId`, een beloning één keer per gebeurtenis).

### 4.4 Risico's

- **Spits en kempenaar zijn groot en traag** (`accel` 0,3 tot 0,35, `turnRate` 0,26 tot 0,3, 38,5 en 50 m). Een baan met een bocht in een smal kanaal kan onmogelijk of frustrerend zijn; `vaarnet.js` `MIN_WIDTH` (regel 315) en `hull_route_audit.mjs` zijn juist hiervoor gemaakt. **Die audit en `vaarwegklasse_test` draaien niet zonder `game/world`: de bouwer moet ze met een wereld draaien (`--kind=spits`) voordat de route in een missie komt.**
- **De AI-verkeersgrens** (`BARGE_MAX` 4, per kanaal 2) en `isBarge` in `boatwater.js`: een baan met een eigen schip mag niet meetellen in die teller of opgeruimd worden. `manageBoatPopulation` slaat `v.moored`, `v.playerOwned` en `v.missionCar` over (regel 134); de baan moet dus een van die vlaggen zetten.
- **Brug- en sluisinteractie bij een spelerschip** (`bridgehit.js` regel 16: schade voor binnenvaart 280; `movablebridges.js` opent voor boten die er niet onder passen): onbekend of een bestuurd schip altijd een brug laat openen. Testen met een schip van 38,5 m onder een vaste brug.
- **Wiebe-conflict:** in M8 vaart Wiebe jou achterna, in H8 valt hij uit. Dat is bedoeld, maar de dialoog van de H8-scène moet daarnaar verwijzen (de speler heeft hem dan al gezien; hij is dus niet nieuw, dus geen introductie, wel herinnering).
- **Naamconflict Lammert:** `schipper_lammert` (Veenstra) en `lammert` (Visser, havenmeester Eemshaven) delen een stem en klinken hetzelfde; het dossier zegt zelf "NAAMBOTSING" (`characterdossiers_minor.js` regel 208). In spreektekst en op het scherm altijd de achternaam of "Schipper" erbij.
- **Zomer en tochten:** "avondtocht" mag, maar geen winter, geen ijs; bij de `Dag van de Vaart` geen echt bedrijf of merk.

## 5. #1377 Lucht (heli en ballon)

### 5.1 Wat bestaat

| Onderdeel | Bestand en regels | Staat |
|---|---|---|
| Vak Lucht met 6 titels (Wolkenkijker tot Luchtbaas van het Noorden) | `loopbaan.js` regel 58 tot 60; eerste klus: vliegles bij Vliegschool De Windwijzer (`START.lucht`, regel 136); `STAT_VAK.heliRuns` (regel 223: 22 XP en €20) | Gebouwd |
| Vliegschool, 20 lessen met vliegtuig (Kist Kees) en heli | `vliegschool.js` (regel 656), `vliegschoolrules.js`; `vliegschool_test` 166 controles groen | Gebouwd |
| Vluchtdienst tussen de velden | `activities.js` regel 302 tot 354 (`VLUCHTDIENST`, beloning via `loopbaanVerdien(... 'lucht' ...)`), `arcadeplane.js`, `luchtverkeer.js` | Gebouwd |
| Heli: vliegen, plannen, missies | `heliflight.js` (663), `helirun.js` (1141; `VARIANTS`: `ballonjacht`, `traumaduif`, `rooster`, regel 74 tot 91), `heliplan.js` (334; `ROOSTER` regel 55 met Lauwersoog, Dollard, Eemshaven), `helictl.js`, `heligrade.js`, `helispawn.js` | Gebouwd. `heli_missie_test` 95 groen |
| Navigatie in de lucht | `airguide.js` (`isAirCraft`: wereld.pigeonMode, heliRun, `isHeli`, `isPlane`), `airprofile.js`, `airguidecard.js` | Gebouwd, `airguide_test` 53 groen |
| Story-missies in de lucht | `storyarc_nieuw.js` M12 "Het staat niet in het rooster" (regel 341, Dijkstra, `loopbanen: ['lucht']`), M15 "Laag over het graan" (regel 358, Roelfien, vliegtuig), `akte34_beats.js` | Gebouwd. Dossiers: `dijkstra` (`characterdossiers_story.js` regel 225), `roelfien` (regel 261) |
| Ballon als decor en als vangdoel | `skyprops.js` regel 258 tot 310 (ballonnen op 150 tot 400 m, starten in de ochtend en avond vanaf een veld buiten het centrum, `launchSites`), `skyprops3d.js` (model), `basketrider.js` (iemand in de mand), `helirun.js` (koppelen aan de mand) | Gebouwd, niet bestuurbaar |
| Vaste plekken op de echte kaart | `scripts/heli_spots_world_test.mjs` (regel 47: Eemshaven wordt meegenomen), `game/vliegplekken.json` (eelde, water, velden, molens, openingen) | Test **SKIPpt hier**; het commit "Heli-missies: vaste plekken ... gecontroleerd op de echte kaart (#1033)" zegt dat het gedaan is |
| Samen spelen lucht | `docs/COOP-GAST.md` regel 230 tot 232: gast is passagier, nooit piloot; uitstappen alleen op de grond (`coopgast.js` `kanUitstappen`); `coopbestuur.js` regel 25 (`vlieg`), 161 | Gebouwd |
| Stappenplan | `storysteps.js` regel 113 tot 116: M12 (`rewrite`, `unlocks: 'heli'`), M15 (`move`), `h9-ballon` (nieuw, gebied `oldambt`) | Alleen data voor de ballon |

### 5.2 Wat ontbreekt

- **Een bestuurbare of meevaarbare ballon.** Er is geen `isBalloon`-voertuig, geen vliegmodel (branden = stijgen, wind = drift), geen instap in de mand, geen HUD, geen `isAirCraft` voor de ballon, geen regel in `coopbestuur.js`. De hint in `airguidecard.js` regel 1 ("luchtballon") is een commentaar over de kaart, geen voertuig.
- **Een "verhaalstuk met aanleiding, bijfiguur en eerste rang"** (het issue): M12 en M15 zijn er al als missies; wat ontbreekt is een nieuwe ingang voor de lucht als loopbaan (de bijbel noemt lucht "geen loopbaan met aanleiding", `storysteps.js` regel 24: "eigen verhaalstuk") en rangmomenten. Een nieuwe bijfiguur is niet nodig: Dijkstra en Roelfien zijn al geïntroduceerd; de bijbel noemt als idee een ballonvaarder met een mening over wind (`03-wereld-en-bouwplan.md` regel 101), die heeft nog geen naam of dossier.
- **Landing en opstijgen op Lauwersoog, Eemshaven en Dollard zonder pop-in:** de heli start in Lauwersoog op een eigen pad (`helirun.js` regel 113 tot 114), maar `helirun.js` regel 670 zegt zelf dat de kade van de Eemshaven en het pad van Eelde "niet tegen gebouwen of water gecontroleerd" worden; alleen het dichtstbijzijnde vrije punt wordt gezocht. De Dollard is een luchtpunt (de ballon), geen landing. `helipadById` (`heliflight.js` regel 118) kent alleen `umcg`, `eelde` en `home`. Pop-in is alleen met `scripts/qa/popin.mjs` (Electron) te meten; niet gedaan.
- **Een verwijzing in de loopbaan naar de ballon** (de "uniek"-lijst van Lucht is `plekken`; een ballonvlucht heeft nog geen XP- of loonhaak).

### 5.3 Hergebruik

`heliflight.js`/`planeflight.js` als sjabloon voor een nieuw vliegmodel; `skyprops.js` ballonmodel en `launchSites`; `basketrider.js` (iemand in de mand); `airguide.js`/`airguidecard.js` (route naar de Dollard); `coopbestuur.js` (`vlieg` weigerreden uitbreiden); `careerdebut.js` en rangmomenten (§2).

### 5.4 Risico's

- **"Geen schade aan bestaande heli-missies"** (acceptatie): `helirun.js` en `heliplan.js` delen `BALLOON_AT` en de `P.ROOSTER.dollard` met het decor. Een bestuurbare ballon mag het decor-systeem (`world.balloons`) niet delen of verwijderen; draai `heli_missie_test` en `heli_sim` na elke wijziging.
- **Prestaties:** een ballon is een groot, zichtbaar object op 150 tot 400 m hoogte; tegelstreaming op hoogte (`airprofile.js`, `prewarmStreamAt`) en pop-in zijn niet gemeten voor een traag stijgend voertuig dat lang op één plek blijft hangen.
- **Samen spelen:** een gast in een ballon als passagier is een nieuw geval (vrije plek, uitstappen op de grond, wegvallen van de host in de lucht). Het wegvallen-geval "de heli blijft veilig staan" werkt alleen op de grond: staat hij in de lucht, dan blijft de gast aan boord (`COOP-GAST.md` regel 232).
- **Geen echte merken** in de ballonopschriften: "Us Mem Snacks" is verzonnen, goed; hou ballonreclame verzonnen.

## 6. #1379 Loopbanen verweven (leveringen, gedeelde personages, evenementen)

### 6.1 Wat bestaat

| Onderdeel | Bestand en regels | Staat |
|---|---|---|
| Boerderijcontracten per gewas (afnemer, kg, bonus, één keer betaald) | `boerderijcontracten.js` (`GEWAS_IDS` bieten, graan, aardappelen, gras, uien), `boerderij.js` regel 26 tot 30 (afnemers: Suikerhal Hoogkerk, Graanzolder Noorderveld, ...), `gewasmarkt.js`, `boerderijlive.js` | Gebouwd, per speler, geen levering aan een andere speler |
| Vrachtcontracten over de weg (verzonnen klanten) | `vrachtmarkt.js` (Supermarkt Driekwart, Kaasboerderij Oldambt, IJssalon Zomerzoet, ...) | Gebouwd |
| Bezorgen (pakjes, soep) | `sidejob_bezorger.js`, `deliveryteam.js` (verdeelde adressen, tot 4 spelers), `bezorgstatus.js` | Gebouwd |
| Beloning per speler, één keer per gebeurtenis | `coopbeloning.js` (`gebeurtenisId`, `beloningVoorGebeurtenis`, `BONUS_FACTOR = 1`) | Gebouwd |
| Bijbaan samen met rol | `coopbijbaan.js` `BIJBAAN_REGELS` (regel 31 tot 52) | Gebouwd |
| Evenementenagenda | `evenementen.js` (`KINDS`, `AGENDA` regel 36; Zomerkermis Zuidbroek, Zomermarkt Winsum), `evenementenlive.js`, `calendar.js` (regel 167: Zomerkermis; regel 192: **Oogstfeest in Beerta**, 28 tot 30 in de verzonnen kalender), `achievements.js` regel 176 (prestatie Waddenbeker) | Gebouwd als sfeer en afsluitingen, niet als loopbaantaak |
| Gedeelde personages | Annemarie, Lutje, Wubbo de bakker, Beppe, Jelle: zie §6.2 | Zie hieronder |
| Handel en bezorgen van eigen voertuigen | `#449`, `COOP-GAST.md` regel 279 tot 282 (`bezorg` met soort voertuig, boot, heli, pand) | Gebouwd voor voertuigen, niet voor goederen |

### 6.2 Wat ontbreekt

- **Een gedeeld begrip "goed".** Elk systeem heeft zijn eigen lading: kg per gewas (boer), een `vracht` per klant (weg), een bezorging per adres. Er is geen register dat zegt "deze 4 t bieten liggen op de kade van Hoogkerk en zijn voor het schip van speler B". `boerderijcontracten.js` heeft de afnemers als tekst, niet als plek of als levering aan een andere speler.
- **Geen enkele van de vijf leveringen uit §6 bestaat als verbinding** (Boer naar Snackwagen, Boer naar Water, Water naar Stad, Vervoer naar Alle, Voetbal naar Snackwagen). De boer verkoopt aan de afnemer in de boerderijlogica; de snackwagen (`business.js`, `snackstory.js` `wagen:menu`) koopt niet in bij een boer.
- **Evenementen als taak per loopbaan:** Oogstfeest, Waddenbeker (als evenement), Dag van de Vaart en Bietencampagne bestaan niet als agendaregel met taken. `evenementen.js` kent alleen sfeer, geluid, menigte en afsluiting.
- **Personages:** in de code bestaan **Beppe, Jelle, Dijkstra, Roelfien, Klaas** (dossiers) en **Wubbo als brugwachter** (`akte34_beats.js` M17). **Lutje** en **Dispatcher Annemarie** ontbreken. Deel 2 §6 spreekt van "Wubbo de bakker (voetbal en snack)"; in het namenregister van deel 1 is Wubbo Zijlstra de brugwachter van de elf bruggen. Dat is een botsing in de bijbel zelf: bij bouw eerst beslissen (coördinator), anders krijgen twee personages dezelfde voornaam in twee rollen.
- **Samen spelen:** een levering tussen spelers (de boer levert, de schipper vaart) heeft geen bericht of boekingsregel. De generieke vorm (`coopbeloning.js`, `bijbaan`/`bijbaangast`, het `bezorg`-bericht) is er; een vrachtbericht is nieuw en vraagt `PROTO`/`CODEC_VERSION`-aandacht (staat op 2 volgens `coopbijbaan.js` regel 13).

### 6.3 Hergebruik

`boerderijcontracten.js` (vorm: dagaanbod uit een seed, één uitbetaling), `vrachtmarkt.js` (contractvorm), `coopbeloning.js` (idempotente boeking), `coopbijbaan.js` (bericht en rol), `evenementen.js`/`evenementenlive.js` (agenda, melding eenmaal per evenement, onthouden onder `gde-evenementen-v1`), `calendar.js`.

### 6.4 Risico's

- **Volgorde:** leveringen hebben W4 (vracht) en een boer-kant nodig; de bijbel zegt zelf "pas na de losse bogen" (§10 punt 8). Bouw L-A (pure regel) vroeg, de rest laat.
- **Oogstfeest in `calendar.js` staat op dag 28 tot 30 van maand 9** in de verzonnen kalender. De bijbel zegt "altijd zomer". Controleer in `docs/verhaal/KALENDER.md` of die maand zomer is (niet nagegaan) voordat de datum in een taak komt.
- **Geen verplichting:** elke loopbaan blijft los speelbaar; een evenementstaak mag nooit een slot zijn (bijbel §6, acceptatie).
- **Geen opslag buiten de bekende sleutels:** een levering die in `gde-loopbaan-v1` of een nieuwe sleutel komt, vraagt migratie en test (AGENTS.md: laat saves nooit stuk gaan).

## 7. Bouwtaken (elk hoogstens M)

Notatie: **S** = klein, **M** = middel. Alle taken: `node --check` op gewijzigde JS, `node scripts/voice_coverage.mjs --quiet`, `node scripts/release/rules_audit.mjs --from=origin/main`, `node scripts/spec_check.mjs`, een Samen-spelen-regel in de changelog of het issue, en spelerzichtbare regels onder `[Unreleased]` in `CHANGELOG.md`. Beeldbewijs (Electron) hoort bij de coördinator of bij een apart beeldrun; elke taak noemt wat hij daarvoor oplevert.

### 7.1 Vervoer (#1375)

| Taak | Omvang | Doel | Bestanden | Tests |
|---|---|---|---|---|
| **V1 Cast vervoer** | S | Dossiers voor Dries Oltmans, Dispatcher Annemarie, mevrouw Wassink, Jochem Luiken (naam, stem-tag, rol, eerste verschijning H7), plus relaties met Tammo en Tessa | `characterdossiers_minor.js`, `characterdossiers_relations.js`, eventueel `docs/personages.md` | `scripts/characterdossiers_test.mjs` |
| **V2 Verhaalingang en eerste dienst** | M | Live stap `h7-dries` (Annemarie belt, Dries ligt op de bank, Tammo neemt zijn dienst) die `vervoer` ontgrendelt en de bestaande `sidejob_lijn`-dienst start als eerste invaldienst; N7, N11 en `h7-trein` aanhaken; debutscene `carriere-vervoer-start` in dezelfde vorm als voetbal en landbouw; `ADDED_STEPS` en een oude-save-test | `storyarc_nieuw.js`, `storyarc.js`, `stepdoel.js`, `storysteps.js`, `careerdebut.js`, `careerdebutrun.js`, `sidejob_lijn.js` (alleen koppeling), `CHANGELOG.md` | `storysteps_test`, `story_spine_test`, `careerdebut_test`, een nieuwe `vervoerstart_test.mjs` (stap volgorde, vlag per speler, oude save), `busservice_test` |
| **V3 Reisroutes en vaste lijn** | M | De eerste vaste lijn (Lijn van Dries) als bus-dienst met `Noorderspoor`-naam, de bus naar de Hogeland- en Waddenkust-stappen (T2, Lauwersoog) gekoppeld aan het rooster; Jochem Luiken leert de machinistdienst (bestaande `treindienststart.js`) | `busroutes.js` (lijndata), `sidejob_lijn.js`, `treindienststart.js`, `storyreis.js`, `storyarc_nieuw.js` | `bus_lines_test`, `busroads_test`, `trainservice_test`, `treinrit_stations_test` (met wereld) |
| **R1 Rangmomenten** (gedeeld met water en lucht, zie 7.5) | S | Per rang 3 tot 6 een korte beat voor bus, taxi en trein (Annemarie, mevrouw Wassink, Jochem) | `careerbeats.js`, `loopbaanlive.js` (`meldOmhoog`) | `careerbeats_test`, `loopbaan_test` |
| **V4 Wagenpark en eigen lijn** (later, buiten de eerste ronde) | M | Gezamenlijk wagenpark, tarieven, concessie met Jelle's papieren | nieuw `wagenpark.js`, `loopbaan.js` | nieuwe puur-test |

### 7.2 Water (#1376)

| Taak | Omvang | Doel | Bestanden | Tests |
|---|---|---|---|---|
| **W1 Cast water** | S | Dossiers Noor (gids), Dina (sluiswachter), Tjalling (havenmeester Zoutkamp), de loods (stem); Wiebe en Lammert Veenstra krijgen een verhaalstap in hun dossier; `02-loopbanen.md` §4 naar de namen van het register (coördinator) | `characterdossiers_minor.js`, `characterdossiers_relations.js`, `02-loopbanen.md` | `characterdossiers_test` |
| **W2 Stadsspoor: verhaalingang en rangen Dekhulp tot Schipper** | M | Stap `h8-wiebe` (Wiebe valt uit op de steiger, pet en logboek als props), Tammo vaart en Tessa vertelt met bestaande `rondvaartlines.js`; debutscene `carriere-water-start`; rang 1 tot 3 | `storyarc_nieuw.js`, `storyarc.js`, `stepdoel.js`, `storysteps.js`, `careerdebut.js`, `careerdebutrun.js`, `sidejob_rondvaarttour.js` (koppeling), `rondvaartlines.js` (indien Noor erbij) | `storysteps_test`, `rondvaarthud_test`, `careerdebut_test`, nieuw `watersstart_test.mjs` |
| **W3 Binnenvaartschip als baan** | M | Een vast genoemd schip **De Drie Zusters** (spits, `spawnJobBoat`) aan een kade in het Starkenborghkanaal, vlag tegen het AI-verkeer (`moored`/`playerOwned`/`missionCar`), HUD in de simhud-strook, route met `planBoatTrip`; controle dat sluis en vaste en beweegbare bruggen door een 38,5 m schip te passeren zijn; `hull_route_audit --kind=spits` op een wereld | nieuw `sidejob_binnenvaart.js`, nieuw `binnenvaartrules.js`, `sidejobs.js` (registratie), `loopbaan.js` (`BAAN_VAK`, `START`, `VAARDIGHEDEN.water` bij niveau 4), `boattypes.js` (vaste naam), `bijbaanregels.js` | nieuwe `binnenvaart_test.mjs` (pure regels), `vaarnet_test`, `boat_traffic_test`, `boat_fits_test`, `hull_route_audit` en `vaarwegklasse_test` **met `game/world`** |
| **W4 Vracht voor het water** | M | Contracten voor het schip (bieten, graan, zand, kisten) met kade, tarief per km, laad- en lostijd, vaste klanten; vorm van `vrachtmarkt.js`, geen hergebruik van opleggers; één beloning per levering | nieuw `vaarvracht.js` (puur), `sidejob_binnenvaart.js`, `vrachtkosten.js` (brandstof voor het water) | nieuwe `vaarvracht_test.mjs`, `vrachtmarkt_test` ongewijzigd |
| **W5 Provinciespoor: verhaalingang** | M | Stap `h8-lammert` (Lammert Veenstra neemt hen mee op De Drie Zusters, eerste levering voor de hoeve en voor Geesje), sluis- en haven-beats (Tjalling, Dina, de loods op de marifoon), debutscene voor het provinciespoor | `storyarc_nieuw.js`, `storysteps.js`, `careerdebut.js`, `careerbeats.js` | `storysteps_test`, `careerdebut_test`, nieuwe verhaaltest |
| **W6 Samen spelen water** | M | Bemanningsrollen (stuurman, dekhulp, gids) als `BIJBAAN_REGELS.binnenvaart`; gezamenlijke lading; het schip ligt voor anker bij wegvallen van de stuurman; later aansluiten bij de volgende kade | `coopbijbaan.js`, `coopboot.js` (uitbreiden), `buscoop.js` als sjabloon voor rollen | nieuwe `scripts/coop/binnenvaartcoop_test.mjs`, `loopbaan_coop_test`, `coopboot_test`, testbankstap in `docs/COOP-TESTBANK.md` |
| **W7 Eigen schip, vloot, rederij** (later) | M | Koop en onderhoud van een binnenvaartschip, rederij voor stad en provincie | `shops.js`, `ownedvehicles.js`, `home.js` | nieuw |
| **R1 Rangmomenten** (gedeeld, zie 7.5) | S | Beats voor rang 3 tot 6 water (Okke wordt Wiebe, Lammert, Tjalling) | `careerbeats.js` | `careerbeats_test` |

### 7.3 Lucht (#1377)

| Taak | Omvang | Doel | Bestanden | Tests |
|---|---|---|---|---|
| **L1 Cast en ingang lucht** | S | Dossier voor de ballonvaarder (naam te kiezen, geen echte persoon); `h9-ballon` en de bestaande M12 en M15 als verhaalstuk met een eerste rang (Wolkenkijker tot Helikopterhulp) en een debutscene bij de vliegschool of de heli | `characterdossiers_minor.js`, `careerdebut.js`, `storysteps.js`, `loopbaan.js` (`VAARDIGHEDEN.lucht`) | `characterdossiers_test`, `careerdebut_test`, `heli_missie_test` |
| **L2 Vaste plekken zonder pop-in** | S | Lauwersoog, Eemshaven en Dollard controleren op de echte kaart (Eemshaven-kade is nu "dichtstbijzijnde vrije punt"): registreren als pad in `helipadById` of laten staan met bewijs; pop-in meten voor en na | `heliflight.js` (`helipadById`), `heliplan.js`, `helirun.js` (regel 670), `scripts/heli_spots_world_test.mjs` | `heli_spots_world_test` **met `game/world`**, `heli_missie_test`, `heli_sim`, beeld: `scripts/qa/popin.mjs` (Electron, door de coördinator) |
| **L3a Ballonvliegmodel** | S tot M | Puur model: branden = stijgen, wind = drift, geen sturen behalve hoogte; geen THREE | nieuw `balloonflight.js` | nieuwe `balloonflight_test.mjs` |
| **L3b Ballon als voertuig** | M | `isBalloon` voertuig met instap in de mand (bij `launchSites` of de Dollard), HUD, `isAirCraft`, camera, `world.balloons`-decor blijft ongemoeid; gast als passagier | `vehicle.js` (of een eigen `vehicle_balloon.js`), `skyprops.js` (alleen een haak), `skyprops3d.js`, `airguide.js`, `coopbestuur.js` (`vlieg`), `coopgast.js` | `airguide_test`, `coop/bestuurflow_test`, nieuwe `ballonrit_test.mjs`, `heli_missie_test` |
| **L4 Samen spelen lucht** | S | Regel in `COOP-GAST.md`: de gast vliegt mee in de heli of de ballon als passagier; per speler loon en punten; wegvallen: toestel blijft op de grond, in de lucht blijft de gast aan boord | `COOP-GAST.md`, `coopbestuur.js` | `coop/bestuurflow_test`, testbankstap |
| **R1 Rangmomenten** (gedeeld) | S | Beats rang 3 tot 6 lucht (Dijkstra, Roelfien) | `careerbeats.js` | `careerbeats_test` |

### 7.4 Verweven (#1379)

| Taak | Omvang | Doel | Bestanden | Tests |
|---|---|---|---|---|
| **X1 Gedeeld register van goederen en leveringen** | S | Pure module: een levering heeft van, naar, goed, hoeveelheid, speler, id; één boeking per id; goederen als vaste lijst (bieten, graan, aardappelen, uien, kisten, zand, pakketten); geen UI | nieuw `leveringen.js` (naam te toetsen aan `ADR 0027`), gebruikt `coopbeloning.js` `gebeurtenisId` | nieuwe `leveringen_test.mjs` |
| **X2 Boer naar water** | M | Een oogst (bieten of graan) kan klaar liggen op een kade; de schipper neemt hem aan als lading van W4; boeking aan beide kanten (boer krijgt de verkoop, schipper de vracht) | `boerderijcontracten.js`, `boerderijlive.js`, `vaarvracht.js`, `leveringen.js` | `boerderijcontracten_test`, `vaarvracht_test`, nieuwe `levering_boer_water_test.mjs`, `loopbaan_dubbel_test` |
| **X3 Vervoer brengt** | M | Kisten en supporters als reizigers of lading in de bus en de trein (alleen als uitbreiding op de bestaande lijndienst) | `sidejob_lijn.js`, `busservice.js`, `leveringen.js` | `busservice_test`, `busdienst_test` |
| **X4 Evenementen als loopbaantaak** | M | Agendaregels voor Oogstfeest, Dag van de Vaart, Bietencampagne (en Waddenbeker als verwijzing naar voetbal); per loopbaan een optionele taak van een paar speluren; geen slot | `evenementen.js`, `evenementenlive.js`, `calendar.js` | `evenementen_test`, `evenementenlive_test`, nieuwe `evenement_taak_test.mjs` |
| **X5 Gedeelde personages** | S | Annemarie ook op de marifoon (water), Jelle's brief in elke loopbaan, Lutje (nieuw), de botsing tussen "Wubbo de bakker" en "Wubbo Zijlstra" oplossen | `characterdossiers_*.js`, `careerbeats.js` | `characterdossiers_test` |

### 7.5 Gedeelde taak R1 (rangmomenten voor alle drie)

Eén taak, niet drie: `careerbeats.js` krijgt een tweede tabel (per vak per niveau 3 tot 6) en `meldOmhoog` (`loopbaanlive.js` regel 147) speelt ze via `playTalk` (`storytalk.js`), met een vlag per speler zodat een rang maar één keer afspeelt. Omvang S; het schrijfwerk (24 tot 30 korte regels, elk onder 25 woorden, niets voorlezen) is het grootste deel. Uitvoeren **vóór** V2, W2 en L1, zodat zij alleen tekst toevoegen.

## 8. Volgorde en wat parallel kan

Afhankelijkheden:
- **R1** raakt `careerbeats.js` en `loopbaanlive.js` en moet eerst (klein, S).
- **V2, W2, W5, L1** raken allemaal `storyarc_nieuw.js`, `storyarc.js`, `stepdoel.js`, `storysteps.js` en `careerdebut.js`: één tegelijk, anders merge-conflicten. Volgorde die de bijbel voorstelt: vervoer (V2) vóór water (W2, W5) vóór lucht (L1).
- **W3** is afhankelijk van een draaiende `game/world` (audit); **W4** van W3; **X2** van W4; **X1** staat op zichzelf.
- **L3a** is volledig los (nieuw bestand); **L3b** raakt `vehicle.js` en `coopbestuur.js`.

Aanbevolen volgorde (de cijfers zijn niet parallel binnen hetzelfde nummer):

1. R1 (S), V1 (S), W1 (S), X1 (S), L3a (S/M): vijf onafhankelijke kleine taken, **allemaal parallel** (verschillende bestanden; R1 raakt als enige `careerbeats.js`, V1 en W1 raken beide `characterdossiers_minor.js`, dus V1 en W1 in één worktree of na elkaar).
2. V2 (M), daarna V3 (M).
3. W2 (M), W3 (M) **parallel** (W2 raakt de story-bestanden, W3 de baan en de regels), dan W4 (M), dan W5 (M).
4. L1 (S) en L3b (M), L2 (S) **parallel** met stap 3 (L1 wacht op de story-bestanden: na W2 of V2; L2 en L3b raken ze niet).
5. W6 (M) en L4 (S) na W3 en L3b.
6. X2, X3, X4, X5 pas als de loopbaan-bogen er zijn (bijbel §10 punt 8).
7. Later, buiten de eerste ronde: V4, W7.

Wat niet samen mag: twee taken tegelijk in `loopbaan.js`, `storyarc_nieuw.js`, `characterdossiers_minor.js` of `careerdebut.js`. Geen Electron tegelijk met de releasebouw (AGENTS.md).

## 9. Wat de coördinator nog moet beslissen of controleren

1. **Namen:** `02-loopbanen.md` §3 en §4 moeten het namenregister volgen (Okke, Geert, Fenna, Berendien, Pieter Luiken zijn vervallen). De coördinator voert dit register door bij de samenvoeging, zegt deel 1 zelf.
2. **Vervoerdernaam:** Noorderspoor (trein), Streekbus Hunzedal (bus) of een nieuw "Noorderspoor en -bus".
3. **Wubbo:** bakker of brugwachter (deel 2 §6 tegenover deel 1).
4. **"Anita" op het scherm:** `careerdebut.js` en `careerbeats.js` tonen de spreeksleutel als ondertitel; controleer in beeld of de speler "Anita" of "Tessa" leest.
5. **Beelden die ontbreken:** binnenvaartschip op 5, 20 en 60 m en alle LOD's; ballon en heli-landing zonder pop-in; geen van deze is in deze audit gezien.
6. **Tests die een wereld nodig hebben** (`treinrit_stations_test`, `vaarwegklasse_test`, `hull_route_audit`, `heli_spots_world_test`) moeten vóór oplevering met `game/world` draaien; hier SKIPpen ze.
7. **Samen-spelen-regel** per taak: wie ziet het (iedereen ziet de voertuigen en de figuren; de scène en het rangmoment zijn lokaal per speler), wie krijgt de beloning (elke meespelende speler volledig, geen deling: `coopbijbaan.js` regel 11 tot 14), wat bij wegvallen (niemand verliest iets; schip voor anker, heli veilig op de grond, bus remt af), later aansluiten (bij de volgende dienst of kade), welke test (pure coöp-test plus testbankstap). Eén vaste tekst per taak, in de changelog en, waar nieuw, in `docs/COOP-GAST.md`.
