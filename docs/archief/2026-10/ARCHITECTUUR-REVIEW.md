> **Archief (oktober 2026).** Dit document is vervangen door `ARCHITECTURE.md` en `.specs-fire/standards/system-architecture.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Architectuurreview (#94)

Alleen-lezen analyse van `game/js`, `scripts/`, `desktop/` en `web/` op onlogische systemen, dubbele implementaties en legacy.
Stand: 2026-10-17, branch na Merge #2/#3 (3D BAG). Er is geen code gewijzigd.
Cijfers komen uit een importgraaf en greps (scripts stonden in een scratchdirectory, niet in git); wat niet is nagelopen staat bij "Niet gemeten".

**Antwoord op de vraag van de eigenaar:** ja, op zeker tien plekken is hetzelfde op twee tot elf manieren opgelost. De ergste:
water (4 regels), wegen (4 grafen, 11 "dichtstbijzijnde weg"-functies), meldingen (12 kanalen, 3 planners), activiteiten (5 registers),
hash/ruis (±40 kopieën), kaartkleuren (4 plekken). Dat is meestal gegroeid uit "stad eerst, platteland later"; veel valt weg met #3 en #90.

## 1. Omvang en structuur

| Meting | Waarde |
|---|---|
| Modules in `game/js` | 364 (+8 in `sfx/`), 147.302 regels, één platte map |
| Scripts | 134 bestanden in `scripts/` (73 `*_test.mjs`, 15 `add_*.py`), 4.447 regels in `scripts/world/*.mjs`, 6.882 regels Python |
| Functies > 300 regels | 9; > 150 regels: 34 |
| Cyclische imports | één component van 150 modules; 43 wederzijdse paren; 1 cyclus van 4 in de geometrie-worker |
| Nooit door het spel geïmporteerd | 5 build-/testmodules (zie H5) + 5 entry points (main, workers, worklet) |
| Geëxporteerd maar nergens gebruikt | 377 namen (grof: naam komt nergens anders voor) |
| TODO/FIXME | 1 echte (`storagekeys.js`, TODO 1.1), geen HACK; netjes |

Grootste modules (regels, fan-in / fan-out):

| Module | Regels | In | Uit | Opmerking |
|---|---|---|---|---|
| scene3d.js | 3471 | 49 | 76 | `update3D` is één functie van 661 regels; kent bijna alles |
| audio.js | 3364 | 29 | 16 | synthese, muziek, motor, 9 stemafspeelfuncties in één bestand |
| missions.js | 3297 | 31 | 37 | `buildDefs` 522 regels; eigen race/missie-staat |
| vehicle.js | 3193 | 50 | 26 | eigen wegengraaf (regel 1308), water, schade, boten |
| models3d_vehicles.js | 2632 | - | - | |
| trailer.js | 2494 | 3 | 34 | `buildShots` 1065 regels; promotiegereedschap in het spel (H11) |
| hud_panel.js | 2285 | 9 | 50 | minimap + kaarticonen + HUD in één |
| missionstory.js | 2214 | - | - | |
| shops.js | 2205 | - | - | |
| mapview.js | 2162 | 5 | 37 | grote kaart |
| main.js | 641 | 0 | 109 | `boot()` 407 regels |
| util.js | 206 | 116 | 1 | wiskunde + water + boot-oeverlogica in één "util" |

Hubs (hoogste fan-in): util 116, cinematics 53, vehicle 50, scene3d 49, achievements 49, models3d_people 42, countryfield 36, pedestrians 36, pixelart3d 36, settings 35.

## 2. Gedupliceerde concepten

Impact: Z = zeer hoog, H = hoog, M = midden, L = laag. Kosten: S/M/L. "Issue" is het aangemaakte GitHub-issue.

| # | Concept | Wat er nu staat (bestanden, regels) | Waarom onlogisch | Eén aanpak | Imp | Kst | Issue |
|---|---|---|---|---|---|---|---|
| H1 | Hash/ruis/random | 11 identieke `hash2` (greenery, landmarkkit, seating3d, streetfurniture, swimmers3d; marktgebouwen, models3d_*, nightlights3d, pedestrians), ±30 varianten (cityprops, grass, quaywalls, parkedcars, paddepoel3d, eventrules, trailer mulberry32, sfx/dsp ...), 12 lokale `rand(a,b)` | util.js heeft `SeededRng` maar geen hash; elke module vond hem opnieuw uit | `rng.js`: hash2/3, hash01, rand, SeededRng | M | S | #99 |
| H2 | Meetkundehulpen | 6x `segDist` (builderhooks, countryedge, models3d_buildings, ommelandplace, tileplace, worldbuilder), 11x `inPoly`, 5x `insideBuilding`, `distToOutline`; naast `util.closestPointOnSegment/pointInPolygon` | zelfde wiskunde, subtiel andere randgevallen | één set in util/geom; "gebouw hier?" alleen `tileplace.buildingAt` | M | S | #100 |
| H3 | Water ("staat hier water") | `waterlevels.waterAt` (6 modules, "de ene regel" volgens ARCHITECTURE.md), `util.isInWater` (59 modules), `inMapWater` + alias `inWaterPoly`, `waterindex.waterWet/waterIndexAt/insideWaterObstacle`, `vehicle.overOpenWater`, `railway3d.overWater`, 2x `waterPolyAt` (pg_bruggenrace, pg_skutsje), `regions.seaAt`, `tilewatermask`; Ommeland: `countryedge.canalWater/openWater`, `countryfield.realWater` | lopen, varen, vliegen, verkeer en kaart hebben andere brug-, diepte- en randregels (zie #81) | `waterAt` met dunne wrappers; Ommeland-takken verdwijnen met #3 | H | M | #101 |
| H4 | Wegen en nearest-road | 4 grafen: `vehicle.roadGraph` (verkeer), `routing.js` (stad, 867), `roadgraph.js` (provincie, 462), `pedroutes.js` (lopen, 827) + `navgraph.js` (120, door niets aangesloten); 11 nearest-road-functies (tileplace.roadNear, routing.snapToRoad, vehicle.attachToNearestRoad, streetfurniture, shops, thuis3d, cityprops, padel, pg_foodtruck, pedroutes, countrylife) | dezelfde vraag, andere toegangsregels (`roadaccess.js`) en kruispuntlogica | stap 1: één `roadNear` in tileplace; stap 2: navgraph aansluiten of schrappen; samenvoegen van de grafen hoort bij #90 | H | M | #102 |
| H5 | Dode code | `builderhooks`, `worldedge`, `locks`, `floatingorigin` (test-only), `navgraph` in game/js; 377 dode exports (worldbuilder 15, hudrules 9, pixelart3d 9, shops 7, vehicle 7 ...); `?wb=0` (functie nergens aangeroepen); verwijzingen naar bestaande niet meer: countryroute.js, realmap.js, countrywater(geo).js; bughunt `acts3/acts4/regress/rest.js`, `skutsje_race_sim`, `vault_sim`, `make_windows_zip.sh` zonder aanroeper | rommel en misleidende docs; build-code wordt meegeleverd | bouwmodules naar scripts, exports schonen, docs bijwerken | M | S | #103 |
| H6 | Communicatiekanalen | `addMessage` -> hudcards (77 modules), `showCard` (24), `showBanner` (14, in cinematics-hub 1159 r.), phonefeed (375), subtitles (436), namecard, prompts (736), choicepanel, minigamekit-bord, todoui, heistui, stunthud; 22 modules met eigen CSS-string, 43 maken eigen DOM-divs; planners: `attention.js` (85), `narrative.js` (150), `hudrules.js` (zones) | de eigenaar ziet "te veel kanalen"; drie planners zonder gedeelde prioriteitstabel | één `hudbus` met één prioriteitstabel en `mayShow(kind)`; daarna kanalen schrappen (#92) | H | M | #104 |
| H7 | Activiteiten/missies | 5 registers (activities+kit, sidejobs+kit+10 jobs, postgame+5 pg_*, dorpsuitjes/worldends/worldevents, heist/stuntavond/casework) naast missions.js; `isMissionActive() \|\| getActiveRace()` in 8 modules, `isShopOpen`/`isCinematicActive` in 17; losse `world.challenge/sideJob/padelGame/minigameUntil` | dezelfde "mag ik starten" en "toon op kaart/HUD" opnieuw per register | `playerBusy(world)` + één activiteitencontract | H | M | #105 |
| H8 | Canvas-teksttextuur | 22 lokale `canvasTex/signTexture/labelTexture/fitText` in 20 modules (flavour3d, geheimen, introkitchen3d, kartbaan, kermis, padel, garages, shops, home3d, museum3d, zwembad, ...) | bordjes verschillen, textures lekken | `canvastex.js` | M | S | #106 |
| H9 | Nacht/tijd | `nightFactor` (daynight op zonhoogte, muggingrules op uur, pedestrians), `isNight` (musicpick, missions, muggingrules, streetlifedata 22:30-06:00) + `hourOf` | straatlicht, voetgangers en muziek schakelen op andere tijdstippen | `dayState(world)` in daynight.js | M | S | #107 |
| H10 | Importcycli | zie sectie 1; hub-paren: breakables-vehicle, missions-{goal,home,helirun,shops,pigeonspots}, postgame-{5 pg_*}, cinematics-{pausemenu,respawn,intromontage}, pausemenu-{prompts,phone,hud_panel}; worker: quaywalls-roadsurface-geokernels-geojobs | live bindings, niet los testbaar, zware worker | cyclustest als bewaker, dan haken | H | M | #108 |
| H11 | Dev/promo in kritiek pad | trailer (2494), trailerprops, intromontage (1503), storytest (862), storydev, hitchprobe, spotcheck, blackframe statisch geïmporteerd; `makeBirds` uit intromontage door missionstory | ±6000 regels geparsed voor wie nooit een trailer draait | dynamic `import()` + kleine statusmodule | M | M | #109 |
| H12 | Stem | `speech.js` is "het ene kanaal", maar audio.js heeft 9 `play*Voice/Bark`; 4 manifest-loaders met dezelfde sleutel (linevoice, smsvoice, sidejobvoice, banter) | nieuwe spreker = nieuwe module + functie | `voicebank.js` + één `playVoice` via speech.js | M | M | #110 |
| H13 | Ruimtelijke rasters | `mapdata.SpatialGrid` + eigen Map-rasters in breakables, parkedcars, pedroutes, nightlights3d, facilities, countryedge (2), elevation (`Grid`), home, railprofile, junctions, streetsigns, tileworld, waterindex; 4 celsleutelformaten | dubbel werk, dubbele bugs | `spatialgrid.js` | M | M | #111 |
| H14 | Kaartrenderers/-stijl | minimap (`hud_panel.drawMinimap`, 217 r., `MINI_STYLE` komt uit `countrymap.js`), grote kaart (`mapview`, eigen WATER-consts), `countrymap` (2 paletten), `provincemap` (script-eigen kleuren), `regions`, `ommelandmap` | water ziet er buiten de stad anders uit (#87); minimap hangt van Ommeland-module af | `mapstyle.js` + één laagregel | H | M | #112 |
| H15 | URL-/debugschakelaars | 18 modules parsen `location.search` zelf; 62 `window.__x`-haken in 63 modules; dode `?wb=0`, `?legacymap`, `__noLandmarkKits` | geen lijst, dode schakelaars blijven | FLAGS-register in devflags.js | L | S | #113 |

### Al gedekt door lopende issues (geen nieuw issue)

| Onderwerp | Omvang | Gedekt door |
|---|---|---|
| Ommeland-laag: `country*.js` + `ommeland*.js` (22 modules, 8.929 regels; countryside 1608, countryedge 1082, countryfield 851, countrymodels 833, countrylife 815, countryplan 726 ...), `countryreal/edge/bake/skyline`, `game/ommeland.json` (1,7 MB) + `ommeland.bin` (2,5 MB), tweede hoogte-/weg-/waterpad (`countryfield.chash`, eigen waterregel) | de grootste dubbele wereld naast de tegels | #3 (lopende agent), #76 |
| Stad als apart pad: `citymap.json` (17 MB), `?legacymap`, `cityprops.js` + `streetclutter.js` (2.087 regels runtime-straatmeubilair) naast `streetfurniture.js` (tegelbouw, 478), stadsgraaf in `routing.js`, `farlod`/`staticbatch3d` (stads-LOD), Python-pijplijn (`build_map.py`, `process_osm.py`, 15 `add_*.py`, ~6.900 regels) naast `scripts/world/*.mjs` | twee generatoren voor straatmeubilair, wegen, gebouwen | #90, #76 |
| Hoogte/AHN-paden, `surfaceAt` per net | | #78 |
| Waterlook (kleur) provincie vs stad | | #87 (H14 levert de gedeelde tabel) |
| gte- opslagsleutels | `storagekeys.js` migreert bewust tot 1.1 (`TODO(1.1)`), `mapfilters.js` houdt `gte-minimap-layers`; een test bewaakt dat elke sleutel in `storagekeys.js` staat. Geen actie nu | n.v.t. |

## 3. Bevindingen zonder los issue

Genoteerd; pas oppakken als de bovenstaande klaar zijn (anders ontstaat dubbel werk).

| # | Bevinding | Detail | Voorstel | Imp | Kst |
|---|---|---|---|---|---|
| D1 | Monolieten | `scene3d.update3D` 661 regels, `trailer.buildShots` 1065, `intromontage.buildShots` 610, `missions.buildDefs` 522, `storytest.runStoryTest` 477, `main.boot` 407, `streetclutter.generateClutter` 347, `hud_panel.drawMapIcon` 317; audio.js 3364 | splitsen per verantwoordelijkheid (audio: synth / muziek / motor / stem); na H10 en H12 | M | L |
| D2 | `util.js` | 206 regels, fan-in 116: wiskunde, `isInWater`, `WATER_Y`, boot-oeverlogica (`boatDryPoints`, `keepBoatOffShore`), `markInstancesDirty` | opsplitsen in `math.js`, `geom.js`, `boatshore.js` (volgt H2/H3) | L | S |
| D3 | Platte map en naamgeving | 364 modules, alleen `sfx/` is een map. Families: 43x `*3d`, 11x `*lines.js` (+ `minigamelines2.js`), 10x `sidejob_*`, 6x `pg_*`, 15x `story*`, 4x `cheat*`. Mix van `snake_case` (`hud_panel`, `pg_koe`, `models3d_*`) en `lowercase` (`hudcards`); Ommeland heet `country*` én `ommeland*` | submappen (`hud/`, `world/`, `story/`, `activities/`, `data/` voor tekst); mechanische import-herschrijving met cyclustest als vangnet | M | L |
| D4 | Tekstdata in codemap | 11 `*lines.js` + `banterlines` (1312), `cardlines`, `flavourlines`, `funlines` zijn pure data | `game/js/data/` (en voor TTS-scripts één verzamelpunt: `voicelines_collect.mjs`) | L | S |
| D5 | Drie worker-mechanismen | `geojobs/geoworker` (module-worker, `?noworker`), `tilestore/tileworker`, `sfx/dspworker` + `engineworklet` | acceptabel; wel `geokernels` ontkoppelen (H10) en één worker-helper | L | M |
| D6 | Opslag-boilerplate | `localStorage` met eigen try/catch in 25 modules, sleutels wel centraal (`storagekeys.js`) | `store.js` met get/set JSON; laag risico | L | S |
| D7 | Invoer | `keydown`-luisteraars in 15 modules naast `input.js`/`controls.js`/`gamepad.js` | per scherm een invoer-laag via `input.js`; hoort bij #96 (mobiel) | M | M |
| D8 | Scripts | bughunt (11 scripts, 1.465 regels) en `perf/` buiten de testsuite; 21 `*_test.mjs` alleen via de glob; Python-stad-pijplijn en mjs-provincie-pijplijn naast elkaar | na #90: stadspijplijn schrappen; één `scripts/run_tests.mjs` (ook voor macOS zonder `timeout`) | M | S |
| D9 | Documentatie | ARCHITECTURE.md (1730 regels) noemt `countryroute.js`, `realmap.js`; één alinea "Ommelanden" is >3.000 tekens; `navgraph.js` kopregel zegt dat routers "blijven werken" | bijwerken na #3 en H5 | M | S |

## 4. Volgorde

1. Veilig en bitidentiek, snel: H1 #99, H2 #100, H5 #103, H8 #106, H9 #107, H15 #113 (kosten S).
2. Structuurwinst die #3 en #90 makkelijker maakt: H10 #108 (cyclustest eerst), H3 #101, H4 #102, H14 #112.
3. Eigenaar-zichtbaar: H6 #104 en H7 #105 (samen met #92 en #93).
4. Prestatie: H11 #109; H13 #111; H12 #110.
5. Pas daarna D1 tot D3.

Opruimen gaat per issue in kleine stappen met de echte vendor-cache en de gewone test-set (`node --check`, `voice_coverage`, alle `scripts/*_test.mjs`).

## 5. Niet gemeten

- Dode code binnen modules (functies die niemand aanroept maar niet geëxporteerd zijn) en `export`s die alleen door tests worden gebruikt.
- Runtime-gedrag (opstarttijd, geheugen): `scripts/perf/*` is niet gedraaid; de claim bij H11 is dus een schatting op regelaantal.
- Welke van de ±30 afwijkende hashes in H1 hun uitkomst moeten houden (tegelgeneratie en saves horen bit-identiek te blijven).
- Visueel: verschillen tussen bordjes (H8), kaartkleuren (H14) en waterlook zijn uit de code afgeleid, nog niet bekeken.
- Python-scripts (`scripts/*.py`) zijn alleen op omvang en aanroepers bekeken, niet gedraaid.
- Dubbele logica in `vehicle.js`, `missions.js` en `audio.js` is niet regel voor regel vergeleken.
