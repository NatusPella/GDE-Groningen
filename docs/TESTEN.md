# Testen met één commando

`node scripts/test_all.mjs` draait de tests in fasen en schrijft een rapport met een korte Nederlandse samenvatting bovenaan. Het hoort bij #186 (spelbot), #5 en #4. De werkafspraken staan in [AGENTS.md](../AGENTS.md) (sectie Testen); dit document beschrijft het commando.

```
node scripts/test_all.mjs [--fase=licht|zwaar|electron|alles] [--rapport=<map>]
                          [--only=<tekst>] [--jobs=2] [--test-timeout=120]
                          [--issues [--create]] [--force] [--list]
```

`--fase` mag ook een lijst zijn (`--fase=licht,zwaar`). Standaard is `licht`. `--only=<tekst>` draait alleen de items waarvan de naam de tekst bevat (handig om één test of één audit te proberen). `--list` toont de items.

## De fasen

Het onderstaande over duur en belasting zijn schattingen op een gewone ontwikkelmachine, niet gemeten op een volle run. De rapportage houdt per item de echte duur bij; kijk daar na de eerste run naar.

| Fase | Wat | Duur (schatting) | Belasting |
|---|---|---|---|
| `licht` | module-check van alle JS (`node --check`, module-bewust), `import_check`, `voice_coverage`, `text_audit`, dode-code-bewaking, alle `scripts/*_test.mjs` (dus ook `import_cycles_test` voor de cyclusbewaking) met duur en tijdslimiet per test | 5 tot 15 minuten | 2 Node-processen tegelijk (`--jobs`), geen GPU |
| `zwaar` | de wereldchecks uit AGENTS.md en de audits: `ring_probe`, `seat_audit`, `province_test`, `province_detail_test`, `drive_audit`, `junction_sim_test`, `network_drive_test`, `vaarnet_province_test`, `bridge_province_test`, weiland-randen (`prop_conflict_audit`), water-lagen, `landmark_audit`, `overlap_check`, `prop_water_audit`, placement, rand-, hoogte-, terrein-, spoor- en wateraudits | 20 tot 60 minuten | één Node-proces tegelijk, veel geheugen en een kern vol |
| `electron` | smoke-run, Electron-verhaaltest (`--story-test`), `geocheck`, spelbot-sweeps (missies, minigames) en de beeldrondes (`scripts/qa/*`, `scripts/ui_shots.mjs`) met beeldchecks | 1 tot 2 uur | één Electron tegelijk, GPU en een kern vol; de machine is merkbaar bezet |

`zwaar` en `electron` hebben `game/world` nodig (`cd desktop && npm run stage`); `electron` ook `desktop/node_modules` (`cd desktop && npm install`, of `ELECTRON_EXE=<pad>`). Ontbreekt dat, dan staat het item in het rapport als **niet gedraaid** met de reden, en niet als geslaagd.

### Aanbevolen volgorde

1. `licht` na elke wijziging en vóór elke merge.
2. `zwaar` na wijzigingen aan wereld, tegels, wegen, water of props, en vóór een release.
3. `electron` vóór een release en 's nachts; nooit tijdens het spelen.
4. `alles` is `licht`, `zwaar` en `electron` achter elkaar.

## Visuele sweep

`node scripts/qa/sweep.mjs --seed=<n> [--part=wereld,verhaal,cut] [--wereld=45] [--verhaal=26] [--cut=14] [--slot] [--plan]` maakt met een vaste seed minstens 150 beelden op willekeurige momenten en beoordeelt ze. Met dezelfde seed krijg je hetzelfde plan (`plan.json`); een nieuwe seed geeft nieuwe plekken, tijden en weersoorten.

- **Wereld:** plekken in stad, wijken, dorpen, gehuchten, Ommeland, A7, kust, Eemshaven, Delfzijl en Waddenzee, met een willekeurige tijd van de dag en een willekeurig weer. Per plek een beeld op straat (met HUD) en een hoog beeld.
- **Verhaal:** een willekeurige stap van elke missie M01 t/m M26 via `__story.jump`, twee beelden (HUD, gesprekken, cutscenes die vanzelf starten) en om de andere stap een pauzemenu-paneel.
- **Cutscenes:** een steekproef van de geregisseerde scènes via `cutscene_shots.page.js` (`sample`).
  - `node scripts/qa/cutscene_shots.mjs --only=M01,M02,M03 [--out=<map>]` (#136, #147, #209) bouwt elke scène met de echte cutscene-host op de Grote Markt en maakt een PNG per shot (batches van ~10 scènes: een lange run eindigt soms op het hoofdmenu). Naast `[cs-clip]` (camera in een dak of onder de grond) meldt het nu `[cs-blok]`: bij een still gaan 5x5 kijkstralen de wereld in en komen er minstens drie binnen 1,3 m ergens tegen aan (lantaarnpaal, bord, boom, rug). Het staat per scène als `blok` in `features.json`. De acteurs, props en de camera lopen door dezelfde `cutscript.js` als in het spel, dus een lens die vlak voor een gevel in een acteur wordt getrokken, ziet u hier. Lees de beelden met `scripts/qa/montage.mjs` (contactbladen).
- **Poort:** zwarte of lege beelden, een bijna lege wereld, een consolefout (zoals een ReferenceError per frame) of een scriptfout laten de run falen met exitcode 1 en "POORT GEFAALD" in het logboek.
- **Automatische beoordeling** (`bevindingen.json`, `logboek.md`): zwart, leeg of ongeldig beeld, NaN-geometrie, ontbrekende textures, (bijna) lege wereld, HUD buiten beeld of overlappende HUD-tekst, speler in water of gebouw of zwevend, consolefouten, mislukte sprong. Drijvende of verzonken props en z-fighting vangt dit niet; die vind je met de Read-tool op de beelden.
- Daarna kijkt een mens (of agent) alle beelden door, schrijft per probleem een korte vondst en maakt per unieke vondst een issue met `bug`, één impact- en één kostenlabel en `wacht-beeld` zolang geen mens het beeld zag. Beelden gaan niet naar GitHub; in het issue staan seed, beeldnaam en beschrijving.
- **Speeltest van #74 (`scripts/qa/speeltest74.mjs`):** de handmatige speeltests als scripted run met beelden en metingen: achteruitkijken (Q) in een auto op een Ommeland-weg (kijkrichting van de camera ten opzichte van de auto), een GPS-doel in het Ommeland (route, minimap, kaart, afslagbanner), frametijd-pieken bij het rijden met 30 m/s met zichtafstand normaal, ver en heel ver (`--only=heelver`), en een padelpotje met auto-spel (`--only=padel`). De auto rijdt kinematisch langs de langste weg, zodat de wereld streamt zoals bij een echte rit.
- Eén Electron-instantie per deel, wegwerpprofiel, `--slot` neemt een slot uit `gde-locks`. `ELECTRON_EXE` en `GAME_WORLD` wijzen een Electron en een gestagede wereld aan als de worktree er geen heeft. Het logboek zegt altijd dat niemand de beelden heeft gezien.

## Speelchecks per functie en de spelbot met reizen

- `node scripts/qa/feature_smoke.mjs [--only=winkelen,bijbanen,voertuigen,...]` draait korte scripted checks in één Electron (wegwerpprofiel). Naast de oudere checks (kaart, wanted, bus, interieur, ...) zijn er `winkelen` (per winkeltype naar de deur, E, paneel lezen, het eerste item kopen), `bijbanen` (elke bijbaan starten, vier seconden draaien, stoppen; meldt ook bijbanen die op één plek staan of niet starten) en `voertuigen` (elk winkelvoertuig neerzetten, instappen, drie seconden gas). Uitvoer in `features.json` en `shots-*.png`.
- `node scripts/bot/run.mjs --reizen` laat de spelbot de reisbeats (T1 tot en met T4) spelen: hij kiest Meerijden en slaat de reisscène over. `--from=<stap> --skip-from` begint een doorlopende run bij die stap en slaat de stap zelf over, zodat de reisstap erna bij jouw plek begint (een sprong van `--mode=missions` slaat reisstappen over). `--max-game=<s>` begrenst de speltijd (standaard 3600 s: bij een sweep over alle stappen op 30000 zetten).
- De spelbot speelt zonder cheats: het vliegtuig van M15 (opstijgen, poorten, landen), de duif van M04 en M24, het stuntvoertuig, het eigen voertuig waar het doel naartoe wijst (`status.target.vehicle`), de winkel (Enter kiest en koopt), de kraakpanelen van M06 (zekeringkast, slotje, kluisslot: de bot leest naald, pinnetje en wijzer uit het paneel) en de taartpanelen. Loopt hij te voet vast, dan probeert hij eerst vier omwegen en daarna de route die het spel zelf toont, voordat de ladder naar een cheat gaat. Te voet zoekt hij zelf een omweg om kraampalen, afvalbakken en andere obstakels: `botlogic.repairPath` controleert elk stuk van de geplande route met de botsing van het spel zelf (`resolveWalker`, dezelfde opties als de speler) en legt een A*-omweg om wat blokkeert (`omweg-plan` in de gebeurtenissen); recht op het doel af loopt hij alleen als daar niets tussen staat (#218). Wat hij niet kan: een vaarroute zonder vaarnet (M17 in Veendam, #343), een colonne op afstand houden (M23) en smaak, geluid en gevoel beoordelen.
- Stand van de doorlopende run (door een bot, snelheid 2, met reizen; drie runs achter elkaar omdat een slot soms uren duurt): M01 t/m M26 en het einde van het Ontzet in 33 cheats, tegenover ongeveer 70 voor de eerste speeltestlus. Per akte: akte 1 (M01-M06) 10, akte 2 (M07-M11 met T1 en T2) 4, akte 3 (M12-M16 met T3) 8, akte 4 (M17-M21 met T4) 6, akte 5 (M22-M26) 5. Zonder cheat: M04, M08, M15 (vliegen), M21 en M25. Wat de bot sinds de eerste lus bij kreeg: een lopende route volgen als de afstand eerst groter wordt, voertuigomwegen, uitstappen uit een brandende auto, een voertuig zoeken tot 250 m voor een lange reis te voet, geen auto met bestuurder nemen (dat gaf diefstal, politie en arrestaties), zacht remmen met eieren, de winkelwijzer van het verhaal volgen, rechtstreeks naar de stuntrekwisieten, en na drie mislukte pogingen een gelogde cheat. Wat nog cheats kost: M05 (de winkel), M06 (reis naar huis en de nachtstart), M01 (de stunt zelf), M09 (eieren die breken), M13 (33 km), M16 (kroegentocht in 100 s) en M20 (beleg).
- Een tweede build voor een run naast een draaiende: `GDE_STAGE_OUT=<map>/game node desktop/build.mjs` en dan `GDE_GAME_DIR=<map>\game` (met backslashes op Windows) bij de run. Zo hoeft een herbouw geen lopende Electron te slopen.
- Het titelmenu opent pas als de poort open is en negeert toetsen daarvoor; `--perf-script` drukt daarom Enter tot het menu weg is (op een drukke machine speelde het spel anders onder een blijvend menu).
- `node scripts/bus_audit.mjs [--sim] [--lijnen=N] [--lijn=<ref>] [--verbose] [--strikt]` (#322, zware fase): elke echte buslijn (`game/world/provincie-bus.json`, 252 lijnen) tegen de stadskaart. Statisch: de weg onder de lijn is geen voet- of fietspad, niet gesloten voor bussen (acc), geen woonerf of pad en breed genoeg. Met `--sim` rijdt de bus-AI van `vehicle.js` elke lijn (de stukken op de stadskaart) en telt de beelden waarop de bus op een weg staat waar hij niet hoort (`busMagWeg`); dat is een fout (exitcode 1). Ritten die niet aankomen en omwegen over het busnet worden gemeld maar tellen niet mee. `GDE_BUS_VEHICLE=<bestand in game/js>` zet een oude `vehicle.js` ernaast om een vorige stand te meten; `WORLD_SRC=tiles` rijdt over de tegelwereld.
- `node scripts/qa/ontvoering_beeld.mjs [--game-dir=<gestagede game/>] [--slot]` (#333, #330, #322): in één Electron: de schaapontvoering in zeven beelden, het aantal koeien, schapen en ganzen op groene plekken in de stad overdag, en het aantal bussen op het Wilgenpad, de Oude Kijk in 't Jatstraat en de Oude Boteringestraat; de tellingen staan in `result.json`.

## Brug-QA (#235, #9, #154)

Beeld voor beeld vanaf een vaste camera; zonder de cinematic-camera van het spel, want die tilt zichzelf over gebouwen en duwt zich van muren en staat dus niet stil. Eén Electron-slot, wegwerpprofiel, `GDE_GAME_DIR` naar een gestagede map met de provinciewereld.

- `node scripts/qa/brug_beeld.mjs --game-dir=<map> --lijst=<json [{naam,x,y}]>`: per brug drie beelden per stand (a, b = 4 cm verschoven, c = a) schuin langs het water, op het dek en eronder, en bij een beweegbare brug een reeks tijdens het openen en sluiten met een toestandslog (`rep.log`). `--plekken=<json>` maakt een luchtbeeld en een straatbeeld van losse plekken (water, gebouwen, hekken). `--alleen-lijst` toont de beweegbare bruggen van de geladen kaart.
- `node scripts/qa/brug_beeld_analyse.mjs <map>`: telt per stand de pixels in vlakke delen die a-b meer verschillen dan a-c (ruis van water en verkeer) en schrijft heatmaps naar `heat/`. Het is een hulpmiddel: dichtbij geeft textuur en bewegende mensen veel ruis, dus kijk de beelden zelf door.
- `node scripts/qa/brug_beeld.mjs --modus=boot --lijst=<json { open: [{naam,x,y,boot}], bots: [{naam,x,y}] }>`: een binnenvaartschip vaart op een beweegbare brug aan (opent op tijd, onderdoor, weer dicht) of vaart tegen een vaste brug (aanvaring, terugduwen, dekschade).
- `node scripts/qa/png_crop.mjs <png> <x> <y> <b> <h> [schaal]` vergroot een stuk van een beeld; `node scripts/qa/montage.mjs <map> --filter=<regex>` maakt een contactblad.
- `node scripts/qa/brug_probe.mjs` leest het dek zonder Electron (hoogtestappen, dekverschil per brug); `scripts/qa/brug_qa.mjs` is de oudere, enkelvoudige versie.
- `node scripts/qa/sluizen_run.mjs --game-dir=<map> --only=lauwersoog-heen` (#236, #299) laat een sloep door de Robbengatsluis varen en meet daarna de hoogte van alle watermeshes (het meer op -1,0, de rest op -2,3, het kolkwater) en de lift van de boot; `node scripts/bot/run.mjs --mode=bruggen --slot` rijdt een auto over 12 bruggen (stad en provincie) en meldt hoogtesprongen (#300).
- Zonder Electron: `scripts/elevation_stream_test.mjs` (het hoogtemodel van streamende tegels), `scripts/province_profile_test.mjs` (profielen, bruggen over vaarwegen, geen zinkende wegen), `scripts/vaarnet_province_test.mjs` (de binnenvaartroute naar de vier zeeën, met de echte wereld), `scripts/bridge_auto_test.mjs` (brug wacht op een leeg dek, #302).

## Meetronde voor meldingen van testers (#321, #326, #328, #329)

`node scripts/qa/tester_bugs.mjs --check=intro|audio|caption|lock [--out=<map>] [--max=<s>] [--opts='{"missions":"M01,M02"}']` draait één Electron (slot uit `gde-locks`, wegwerpprofiel, BelowNormal) en laat een page-script van `scripts/qa/tester_<check>.page.js` het hoofdmenu zelf bedienen: het kiest Nieuw spel, meet en geeft één JSON terug (`result.json`), met beelden `shots-*.png`. `GDE_GAME_DIR=<map>game` (met backslashes) en `ELECTRON_EXE=<pad>` als de worktree geen eigen build heeft; een eigen build zonder wereldbouw: `GDE_PREBUILT_WORLD=<map met index.json> GDE_STAGE_OUT=<map>game node desktop/build.mjs`.

- **intro:** de camera van Nieuw spel tot het eind van de opening, elk frame: plek, kijkrichting, camera onder een dak (in een gebouw), draai per frame zonder geplande cut (een flip) en welke cinematic en ondertitel loopt. `frames.json` is `[t, x, y, h, dx, dy, dz, fov, dak, cine, override, cut, cinematic, ondertitel]` per frame.
- **audio:** per ondertitelregel van de opening en van de introductie en afloop van M01 t/m M03 (via `playStoryIntro`/`playStoryOutro`): start de opname, wordt hij afgekapt of geweigerd, en klopt dat met `textOnly` in `game/storydata/script.json`.
- **caption:** de eerste-bezoek-cinematic bij grote gebouwen (Forum, Martinitoren, Museum, Euroborg, station, kerken): cameraplek ten opzichte van het gebouw, welke tekst waar in beeld staat en de plaatskaart erna.
- **lock:** wat `Input.tryLock` doet in een echt Electron-venster (vergrendeld, terugval naar de vrije cursor, reden van een geweigerde aanvraag).
- **pad** (#151): een nep-controller (`navigator.getGamepads`) tegen het echte spel: kiest Nieuw spel met A, slaat de opening over met A ingedrukt, en meldt per stap de situatie (`data-pad-ctx`), de stickas en de toetsen die het pad vasthoudt, of de speler beweegt, en wat Start, B, Terug en Y doen. Zo bleek in 0.38.1 dat het pad in het spel stil was (een `ReferenceError` in `gamepad.js` elk beeld; de console staat in `run.log`). Zonder Electron dekt `scripts/gamepad_live_test.mjs` dezelfde paden.
- **padscreens** (#151): elk scherm met alleen D-pad, A en B: de titelschermen (Samen spelen, Opgeslagen spellen, nieuws, instellingen, over), elke sectie en elk subtabblad van het pauzemenu (ook de garage en Samen spelen) en het schermtoetsenbord. Per scherm: hoeveel zichtbare knoppen en velden er zijn, welke nooit focus kregen (`onbereikbaar`) en hoeveel keer B nodig is om weg te komen. Kost 6 tot 10 minuten (`--max=700`).
- **achtervolging** (#117): speelt M02.intro (de trekker rijdt weg, de politie komt met sirene aan en remt) in echte tijd met de audiotap (`audiotap.js`, `--audio-graph`): het niveau per seconde voor de gedempte uitgang, de geluiden die de scène in de wereldwachtrij zet (siren_pass, car_pass, tyre_screech) en elke buffer die start, met tijd sinds het begin van de scène. `--opts='{"missions":"M02,M09"}'` kiest andere scènes. Het gemeten niveau is de hele mix (muziek en ambiance horen er ook in): kijk naar het verschil met `basisRms`, niet naar de absolute waarde.
- **cutnabij** (#136, #147): speelt de intro en afloop van de gekozen missies (`--opts='{"missions":"M01,M02,M03"}'`) in echte tijd en meet elk frame hoe dicht de echte camera (na de camera-guard van `scene3d.js` en de blend) bij een figuur staat (camera lager dan 2,4 m). Een stuk waarin de camera dichter dan `min` (standaard 0,9 m) komt staat met tijd, afstand en figuur in `result.json`. `cutscene_shots` zet elke still als harde cut en ziet dit dus niet; de twee meten verschillende dingen.
- **audio** meet daarnaast per tekstregel (zonder opname) of het gemurmel speelt (`metMurmel`, `zonderMurmel`): driehoekstonen van 100 tot 300 Hz onder de ondertitel (`playTextMumble`, #326).

`node scripts/opnamelijst.mjs` schrijft `docs/verhaal/OPNAMELIJST.md`: elke verhaalregel zonder opname (de ondertitel is dan de terugval, het spel speelt niets). `--check` faalt als de lijst achterloopt op `script.json`.

## Vaarroute-QA (#343, #184, #233)

Komt een romp door de route van het vaarnet? Twee kanten, de eerste zonder Electron:

- `node scripts/hull_route_audit.mjs [x0 y0 x1 y1] [--kind=sloep] [--half=40] [--kaart] [--max=0]`: de route van `game/vaarnet.json` (standaard van de binnenstad naar het zeewater bij Lauwersoog) gemeten met wat het spel zelf weet: een rooster van 2,5 m in een strook van `--half` m aan weerszijden van de lijn, open waar `waterClearance` (de oeverafstand die de romp tegenhoudt) minstens 1,5 m is. Van het begin af wordt het open water uitgebreid; stokt het, dan staat de plek in de uitvoer (`--kaart` tekent haar: . open, o bereikt, # dicht, * de route) en wordt ze overbrugd om verder te zoeken. Voor de wijziging van #343 gaf dit in een strook van 40 m 14 plekken en in een van 120 m 17 (een stuk van 160 m in de havenmond van Lauwersoog); erna 5 en 4, alle in de dijken bij Lauwersoog (#349): het raster zette daar twee dijken tot vaarwater, zodat de route dwars door de havendijk van het Lauwersmeer naar het havenwater liep. Nu zijn die dijken `dammen` in de fixes, de route naar het zeewater (het knooppunt 'Waddenzee bij Lauwersoog' van het vaarnet, de tong voorbij de Robbengatsluis) loopt door de sluis en geeft bij `--half=120` 0 plekken (bij `--half=40` 1: de punt van een landtong in het Lauwersmeer bij -25967,-19300, 30 m). Heeft `game/world` met de provinciewereld nodig; zonder dat SKIP.
- `node scripts/hull_route_audit.mjs --half=120 --profiel=<van>-<tot>` (#349): drukt de vrije ruimte langs de lijn zelf af, per 4 m tussen twee afstanden van het begin, met de plek; zo zie je in één keer waar een stuk land of een engte zit. Land waar het raster van het vaarnet (`closeGaps`) ten onrechte water van maakt, een dijk met een weg en geen sluis of brug, staat als `dammen` in `game/vaarnet_fixes.json` ([x, y, straal, naam]); de generator laat daar niets dichtgaan (de dijken bij Lauwersoog tussen havenwater, kolk en meer). Na een wijziging: `node scripts/world/vaarnet.mjs --fixes` en `node scripts/world/vaarnet_graph.mjs --write` op dezelfde, nieuwste `game/world` (met `data/cache`).
- `node scripts/qa/vaar_run.mjs --game-dir=<gestagede game-map> [--wait=40] [--leg=30]`: de sloep wordt per ~2,5 km op de route gezet en vaart 8 routepunten verder, nu langs de route zelf (het verste punt tot 45 m vooruit waar de koers vrij water houdt, gestuurd met de stuurinvoer, anderhalve seconde achteruit als hij twee seconden blijft hangen) in plaats van in een rechte lijn over de wal. `--wait` is de tijd die een ver punt krijgt om zijn tegels te laden (de speler stapt uit de boot en `registerShots` zet de tegels rond het punt vast: de boot hield de tegels bij het vorige punt vast en zo bleven ver weg liggende punten 'niet nat'). Een koers over zee met land binnen 600 m (de dijk bij Lauwersoog) telt niet. Het spel draait op deze machine op ongeveer 25% van de tijd; zet `--leg` op 30 of meer. Een Electron-slot, wegwerpprofiel; `GDE_DESKTOP` en `ELECTRON_EXE` als de map geen `node_modules` heeft.
- Het vaarnet maak je met `node scripts/world/vaarnet.mjs --fixes` (de gaten, de zee en de verbindingen) en dan `node scripts/world/vaarnet_graph.mjs --write` (`--spelwater`: alleen water waar het spel water heeft, voor een audit); allebei op dezelfde, nieuwste `game/world`, anders wijkt `vaarnet_province_test` af.

## Stadsplekken en straatregels (#323 t/m #335)

- `node scripts/qa/stadbugs.mjs --spots=<json> [--out=<map>] [--game-dir=<gestaged game-map>]`: één Electron (slot, wegwerpprofiel, BelowNormal) maakt per plek beelden op vaste camerastanden (`views`: `{ n, p: [x, y, hoogte boven de grond], l: [x, y, hoogte] }`, spelcoördinaten) en voert een `eval` uit in de pagina (een async functie `(w, map, imp, sleep, go, shot) => json`: bijvoorbeeld alle heginstanties van de scene tegen de wegen, of een lijst van alles wat bij een brug in de scene staat). De pagina-helft is `scripts/qa/stadbugs.page.js`.
- `node scripts/world/tegelprobe.mjs <x> <y> [--r=60] [--kind=roads,furniture,trees,water,buildings,rails,green,canopies,passages] [--naam=tekst]` leest de tegels rond een plek zonder Electron: wat de tegelbouw daar heeft.
- `node scripts/world/hedge_audit.mjs [--r=90] [--spots=Prinsentuin,Martinikerkhof,...]` (#324): de echte `generateCell` van `grass.js` rond een plek, elke heginstantie tegen de wegen binnen 30 m (rijbaan, fiets- en voetpad, ook bruggen); een heg binnen de halve breedte van een weg is een fout. `hedge_tile_audit.mjs` doet hetzelfde voor gemapte OSM-heggen (de stad heeft er geen). Zonder `game/world` SKIP.
- `node scripts/ui_shots.mjs --scenes=scripts/ui/tegels_scenes.js --sizes=1280x720,1920x1080` (#351): meet in het pauzemenu-overzicht of een tegelwaarde ('net begonnen', een groot bedrag) over de rand of de buurtegel loopt.
- `node scripts/qa/cutaudio_live.mjs [--only=M01] [--max=12]` (#117): elke gestuurde scène met rijdende voertuigen draait in echte tijd door de cutscene-host in één Electron met de audiotap; per scène staat in `cutaudio.json` wat er in de geluidsrij kwam, hoeveel bronnen er in de geluidsgraaf startten en RMS en piek tegenover de stilte ervoor. Het meet dat er geluid komt, niet hoe het klinkt.
- `scripts/lib/stadtegels.mjs` (`laadStadTegels`) geeft de stad als TileWorld uit een gebouwde wereld (`game/world` of `GAME_WORLD`), in seconden in plaats van de OSM-bouw van 7 minuten van `loadworld.mjs`. Tests die erop draaien sluiten met SKIP af zonder wereld: `garage_zone_test` (garage-ingangen vrij van bomen, geparkeerde auto's en props), `wildlife_road_test` (geen grondbeest op een rijbaan of kruispunt, de echte `wildlife.js` bij de 12 drukste kruispunten), `canopy_base_test` (perronkappen op de hoogte van het spoor), `kermis_solid_test` (kraampjes en reuzenrad zijn alleen vast als de kermis er staat).

## Veiligheid

- De Electron-stappen gebruiken een wegwerpprofiel (`GDE_TEST_PROFILE=gde-testall-<pid>-<stap>` in de tijdelijke map) en schrijven nooit naar `gde-save-v1`, `gde-settings` of `gde-prestaties-v1`. De profielen worden na afloop verwijderd.
- Het commando raakt poort 9000 en de geïnstalleerde app niet aan.
- Er draait één Electron tegelijk. Draait er al een (bijvoorbeeld omdat de eigenaar speelt), dan start de fase niet en staan alle Electron-items als niet gedraaid in het rapport. `--force` slaat die controle over; gebruik dat alleen op een machine waar niemand speelt.
- Bij een tijdslimiet wordt de hele processtructuur afgesloten.
- `--issues` is een droge run: de concepten komen in `issues-concept.md`. Pas met `--create` worden issues aangemaakt, via `gh` (labels die niet bestaan worden weggelaten).

## Het rapport

Standaard in `%TEMP%/gde-testall` (buiten de repo); met `--rapport=<map>` elders. Per run een map `<tijdstempel>/` met:

- `fase-<naam>.json` en `fase-<naam>.md` per gedraaide fase;
- `rapport.json` en `rapport.md` voor de hele run, samenvatting bovenaan; `laatste-rapport.md` in de hoofdmap is een kopie;
- `issues-concept.md` met `--issues`;
- per Electron-stap de map met `run.log` en de beelden.

`state.json` in de hoofdmap onthoudt per fase de laatste run (resultaten en kleine beeldhandtekeningen). Daarmee toont het rapport per item pass, fail, timeout en niet gedraaid, **nieuwe fouten** (een andere of nieuwe foutregel dan de vorige run), wat opgelost is, wat trager is geworden (minstens 1,5 keer en 5 seconden) en welke fasen niet gedraaid zijn. Met `--only` worden alleen de gedraaide items vervangen.

Het exitcode is 1 bij een mislukt item of timeout, 2 bij een crash van het script zelf. Een fase die crasht wordt als mislukt item vermeld; er faalt niets stil.

### Beeldchecks (fase electron)

Elk beeld uit de smoke-run, de verhaaltest, de spelbot en de beeldrondes wordt gecontroleerd op:

- **zwart** (meer dan 98% bijna zwart), **leeg** (vrijwel één kleur), **ongeldig** (meer dan de helft doorzichtig, of meer dan 20% foutkleur-magenta; een NaN in de GPU-uitvoer laat zich zo zien);
- afwijking van de vorige run: een 32x18 helderheidsraster per beeld, gemiddeld verschil boven 8% geeft een waarschuwing "let op". Dat is geen fout: beelden met verkeer en weer verschillen altijd een beetje.

Daarnaast: consolefouten uit de renderer, TDZ-fouten (`Cannot access ... before initialization`), importfouten, NaN-waarschuwingen in geometrie (`computeBoundingSphere`), de uitslag van de verhaaltest en de frametijd van de smoke-run (fout alleen bij een bijna stilstaand beeld, waarschuwing bij veel trager dan de vorige run).

**Het rapport zegt altijd dat niemand de beelden heeft gezien.** Een geslaagde beeldcheck betekent alleen: niet zwart, niet leeg, niet sterk anders dan de vorige run. Of het er goed uitziet, beoordeelt een mens. Wat een agent niet in beeld heeft gezien, staat als "nog niet bekeken" in het issue.

## Voorstel: nachtelijke run

Dit is een voorstel; er is niets ingericht. De eigenaar beslist of en wanneer.

Een taak om 03:00 die `licht`, `zwaar` en `electron` achter elkaar draait en in de ochtend `laatste-rapport.md` oplevert, bijvoorbeeld op Windows:

```
schtasks /Create /SC DAILY /ST 03:00 /TN "GDE Testrun" /TR "node <repo>\scripts\test_all.mjs --fase=alles --issues"
```

Aandachtspunten:

- Alleen op een moment dat niemand speelt; de Electron-fase start dan niet en meldt dat, dus er gaat niets stuk.
- Geen `--create` in de taak: kijk eerst een paar nachten naar de concepten en maak de issues pas aan als de dubbelen en de ruis kloppen.
- Draai niet tegelijk met een releasebouw (AGENTS.md: geen nieuwe agents tijdens een releasebouw) en houd de schijf vrij: de beelden van de Electron-stappen staan in de runmappen onder `%TEMP%/gde-testall` en kunnen oude runs vervangen worden.
- De spelbot heeft eigen dagelijkse tooling (`scripts/bot/daily.mjs`, zie [SPELBOT-RAPPORT.md](SPELBOT-RAPPORT.md)). `test_all.mjs` draait alleen de sweeps voor missies en minigames; wie `daily.mjs` al plant, kan de bot-stappen met `--only` overslaan of de twee op verschillende tijden zetten.

## Beperkingen

- De Electron-fase is niet op deze machine uitgeprobeerd tijdens het schrijven (de eigenaar speelde, en de worktree had geen `desktop/node_modules` of `game/world`). De stappen zijn gebouwd op de bestaande scripts en de pure delen (rapportage, diff, logscans, PNG-checks) hebben tests in `scripts/test_all_test.mjs`. Eerste echte run: kijk of de vlaggen voor `--perf-test` (frametijd) en de uitvoermappen kloppen.
- De frametijd is alleen te lezen als de run een `[perf]`-regel met `fps` schrijft; anders staat het item als niet gedraaid.
- Een fingerprint van een fout is de itemnaam plus de eerste foutregel zonder getallen en paden. Wisselt een test zijn foutmelding, dan telt dat als een nieuwe fout.
