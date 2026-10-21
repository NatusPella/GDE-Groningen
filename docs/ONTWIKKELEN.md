# Ontwikkelen

Developer notes (in English, like ARCHITECTURE.md): test switches,
performance runs, the trailer mode, desktop and web builds, and how the map
is built. How the code fits together: [ARCHITECTURE.md](../ARCHITECTURE.md).
Getting started and contributing: [README.md](../README.md) and
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Running from source

```bash
python3 scripts/devserver.py 8765 game
```

Then open http://localhost:8765. `devserver.py` is a static file server that
disables caching, so edited modules are always reloaded. The browser version
loads three.js from jsDelivr and the fonts from Google Fonts; the desktop
and web builds vendor both (`desktop/build.mjs`).

**Windows without a terminal:** double-click `start.bat` (player zip: `START DE GAME.bat`). It serves `web-dist/`
with `scripts/windows/serve.ps1` (PowerShell only, no Python or Node), picks a free port, listens on
127.0.0.1 and opens the game in the browser.

**Serve paths (#143):** there are three, each with one job.

| Path | Serves | For |
| --- | --- | --- |
| `python3 scripts/devserver.py 8765 game` | `game/` without caching | working on the source |
| `node web/serve.mjs` | `web-dist/` under `/gde/` | testing the web build like a static host |
| `scripts/windows/serve.ps1` (via `start.bat`) | `web-dist/` | players on Windows; the same behaviour as `web/serve.mjs` |

The player zip is built from `web-dist/` by `scripts/make_player_zip.mjs`, never from `git archive`.


## Scripts per platform

What works where. "Git Bash" means a POSIX shell on Windows (Git Bash or WSL), not PowerShell or cmd.

| Script | macOS | Windows | Linux |
| --- | --- | --- | --- |
| `node scripts/*_test.mjs`, `voice_coverage.mjs` | yes | yes | yes |
| `desktop/` `npm start`, `npm run stage` | yes | yes | yes |
| `desktop/release.sh` (`npm run release`) | yes | Git Bash | yes (add `--linux` for the Linux build) |
| `node scripts/make_player_zip.mjs` | yes | yes | yes |
| `scripts/play_local.sh` | yes | Git Bash | yes |
| `scripts/perf/*.sh`, `scripts/bughunt/run.sh` | yes | Git Bash | yes |
| `scripts/steam_images.mjs` | yes | only with `CHROME=<path to chrome.exe>` | only with `CHROME=<path>` (the default path is macOS) |
| `start.bat` | no | yes | no |

Shell scripts and `.mjs`/`.js` stay LF (see `.gitattributes`); only `.bat` is CRLF.

## Tests

Plain Node.js scripts, no test framework (a current Node.js release):

```bash
node scripts/save_migration_test.mjs     # old saves and settings keep loading
node scripts/storage_migration_test.mjs  # the gte-* -> gde-* key and userData rename
node scripts/voice_coverage.mjs --quiet  # every subtitle has a recording
cd desktop && npm run stage && cd ..     # once: vendors three.js for the 3D tests
for t in scripts/*_test.mjs; do node "$t" || echo "FAIL $t"; done   # includes rdnew, world_tiles, tileworld, floatingorigin
```

### Test runner and audits

`scripts/run_tests.mjs` runs the standard set in one go: `node --check` on all JS, `voice_coverage`, every `scripts/*_test.mjs` and the Python tests, with plain `node` (no `timeout` needed, it has its own). CI (`.github/workflows/test.yml`) runs the same on Linux and Windows for every pull request.

```bash
node scripts/run_tests.mjs --quick        # fast subset: no full syntax sweep, no slow tests (30 s per test)
node scripts/run_tests.mjs                # everything standard (120 s per test)
node scripts/run_tests.mjs --only=busy    # tests whose name contains "busy"
node scripts/run_tests.mjs --list         # show what would run
node scripts/run_tests.mjs --timeout=300  # per-test limit in seconds
node scripts/text_audit.mjs               # player-facing text against the constitution (Dutch only, no real brands, "Grunn", summer); --all, --json
```

Tests that need `game/world` or `data/cache` and do not find it are skipped with a SKIP line. The heavy world checks are deliberately not in the runner and are run by the coordinator before a release: `province_test`, `province_detail_test`, `network_drive_test`, `junction_sim_test` (17/17), `scripts/world/ring_probe`, `scripts/world/drive_audit` (about 2 collisions), the rail and water audits and the Electron story test.

Newer helpers and tests worth knowing:

| Script | What it is |
| --- | --- |
| `scripts/lib/loadworld.mjs` | The city for tests and audits: `loadCityData()` (the map data: stad.json + the OSM layers + mapextras), `loadCityWorld()` (a GameMap, or with `WORLD_SRC=tiles` the tiles built in memory, #90). Without `data/cache/province` the test ends with SKIP. `loadworld_test.mjs` |
| `scripts/devflags_test.mjs` | Guards the `FLAGS` register: every switch has a description and is listed here |
| `scripts/storage_migration_test.mjs`, `save_migration_test.mjs` | Old keys and old saves keep loading; run these after adding any `gde-*` key (register it in `storagekeys.js`) |
| `scripts/busy_test.mjs`, `activityhub_test.mjs`, `hudbus_test.mjs`, `hudbus_surfaces_test.mjs`, `hud_test.mjs` | The player-busy gate, the activity registry, the attention planner and the HUD rules |
| `scripts/cutscript_test.mjs`, `actoranim_test.mjs` | The cutscene language (validator, sampler) and the actor animation layer |
| `scripts/spatialgrid_test.mjs`, `nearest_road_test.mjs` | The shared grid and the nearest-road query |
| `scripts/mapstyle_test.mjs`, `regions_test.mjs`, `loadlogic_test.mjs` | Map style table (palettes, `INK`, icon colours, the zoom/layer rule; no loose colour literals in the map renderers), regions and load-screen logic |
| `scripts/qa/kaartstijl_shots.mjs` | Minimap and full map, day and night, at fixed spots and zooms, for a before/after run on two staged games (`--game-dir=voor=<map>,na=<map> --slot`) |
| `scripts/simlagen_test.mjs`, `simworker_test.mjs` | Simulation layers and the simulation worker kernel |
| `scripts/padlogic_test.mjs`, `touch_test.mjs` | Controller and touch logic without hardware |
| `scripts/akte1_doelen_test.mjs`, `reisbeats_test.mjs`, `reisaudit_test.mjs` (elke sprong >6,5 km tussen opeenvolgende stappen heeft een reisbeat), `reiskeuze_test.mjs`, `reistijd_test.mjs` | Every act-1 mission goal exists on the map; travel beats |
| `scripts/placement_audit_test.mjs`, `road_seams_test.mjs`, `clearance_audit.mjs` | Placement of footprints, road seams and viaduct clearance |
| `scripts/desktop_args_test.mjs` | The desktop argument parser (`desktop/args.cjs`) |

## Controls

| Key | On foot | In a vehicle |
|---|---|---|
| W/S or ↑/↓ | walk away from / towards the camera (hold Shift to run; on a bike Shift is a short sprint) | throttle / reverse |
| A/D or ←/→ | strafe left/right relative to the camera | steer |
| Space | jump | brake |
| Ctrl | crouch | – |
| E or F | enter nearest vehicle, use a shop/job/station, or become a pigeon at a pigeon sign | exit |
| H | – | horn |
| L | – | lights and siren on/off (police car, ambulance): traffic moves aside |
| R | – | at Spuit & Klaar: new paint; inside a garage or at a gas station: repair / upgrade menu |
| K | kiss your companion (Tammo/Tessa) when next to them | – |
| Left mouse | attack with what you hold (fists, a melee weapon, a gun, a throw); you turn to where the camera looks | shoot from the window (guns and the water pistol) |
| Right mouse | aim: face the camera direction while moving; with the jachtgeweer, hold to look through the scope | – |
| 1 | melee: fists, honkbalknuppel, hockeystick, bezem, fietspomp, klomp, polsstok (press again to cycle) | – |
| 2 | pistol / uzi / waterpistool | – |
| 3 | shotgun / jachtgeweer (scoped rifle) | – |
| 4 | carbidbus (throw; crouch + click to set it down) / vuurwerkpijlen | – |
| Mouse wheel | next / previous weapon | – |
| Mouse | orbit the camera around your character; push it low to look up at the rooftops | orbit around the car; eases back behind it after ~1.7 s (up to ~4.5 s at speed) |
| Q or middle mouse (hold) | – | look back |
| M | city map: click to set a waypoint (GPS route on map and minimap), right-click or Del to clear it, Shift+click to teleport; one legend checkbox per category shows or hides it on both the map and the minimap (destination, route and police are always shown) | |
| U | sound on/off | |
| F11 / Alt+Enter | desktop app: fullscreen on/off (Mac also Ctrl+Cmd+F) | |
| X | as a pigeon: turn back into Tammo/Tessa where you are | |

Every key above except Esc, Enter, the arrows and the mouse can be rebound
under Instellingen › Besturing › Toetsenbord (a key already in use swaps
with the old one; "Standaard herstellen" puts them all back).

## Controller (Xbox, PlayStation, Steam Deck)

Any controller the browser sees in the standard layout works, also in the
menus. The on-screen hints switch to its buttons (Xbox letters, PlayStation
shapes or the Steam Deck's L1/R1) as soon as you use it, and back to keys on
the next key press or click.

| Button | On foot | In a vehicle | In menus |
|---|---|---|---|
| Left stick | walk (L3: run) | steer (L3: bike sprint) | choose |
| Right stick | camera | camera (R3: look back) | scroll |
| RT / LT | attack / aim | gas / brake and reverse | zoom the map (in Te doen and Instellingen: next / previous tab) |
| A | jump | handbrake | ok |
| B | crouch (in a minigame: stop) | lights and siren | back |
| X | F (second use key) | horn | clear the map goal |
| Y | enter, use, talk | exit | to yourself on the map |
| LB / RB | previous / next weapon | radio on/off / shoot from the window | previous / next section |
| D-pad | ↑ phone, ↓ kiss, ← skip story step, → paint/garage menu | ↑ phone, ↓ film camera | choose |
| View / Menu | map / pause menu | map / pause menu | map / close |

The helicopter climbs and descends on RT/LT and turns with LB/RB; a pigeon
flaps on A, pecks on B, dives on LT and poops on RT or X; the Fjord Frituur
puts its menu on the D-pad and bumpers. Buttons can be swapped under
Besturing › Controller; rumble, the button style and the stick speed are under
Instellingen › Controller.

## Accessibility

Instellingen › Toegankelijk: subtitle size (klein to extra groot, for
cutscenes, banter, the intro montage, phone calls, the radio and the name
cards) with an optional dark box behind them; colour-blind palettes
(deuteranopia, protanopia, tritanopia) for markers, routes, the map and HUD
states; the interface size; "Beweging beperken" (also on when the OS asks for
reduced motion). Routes never differ by colour alone: the story route is
solid, your own goal dashed, a klus dotted and repairs dash-dotted, and the
minimap's edge arrows carry a ring, a dot or a square.

## What's in it

- **World**: ~35k real building footprints, roads with sidewalks and
  centerlines, canals and the Diepenring, parks, trees, bridges, traffic
  lights, flitspalen, horeca, landmarks (a real 3D Martinitoren model, the
  rest procedural for now).
- **Life**: traffic (cars, buses, bikes, scooters, boats), pedestrians,
  seagulls/cows/sheep, weather with storms, helicopters and balloons.
- **Gameplay**: driving and on-foot movement, combat (fists; melee weapons
  with their own swings and reach: honkbalknuppel, hockeystick, bezem,
  fietspomp, a Frisian klomp and a long, slow polsstok; pistol, uzi,
  shotgun, a scoped jachtgeweer; a waterpistool that makes people run and
  puts out burning cars; a thrown or placed carbidbus with a big boom and
  firework rockets, all sold at Pang & Zo), wanted level with
  police cars, foot cops, boats and a helicopter, 13 missions in a guided
  story ("Alles voor één eierbal": the Kop and the Romp are playable, the
  Staart follows; the story decides whether you play Tammo or Tessa, the
  route always points to the next step, and every step can be skipped from
  the pause menu, after a failed mission also with O; Jelle Terpstra and the
  twins Durk & Douwe appear in the cutscenes and reach you by voiced calls,
  livestreams, Kiekdoar posts and cards; "Eerder in GDE" recaps open each
  part and "Wat weten we?" in the pause menu lists the clues so far), shops (weapons,
  armour and food are bought, not found on the street; you start with €250),
  Kiekdoar news feed and phone notifications. Duif-modus as an in-game
  activity: at six pigeon signs (Vismarkt, Grote Markt, Martinitoren,
  Noorderplantsoen, Stationsplein and a duiventil at the volkstuinen) press E
  to become a pigeon, fly and poop over the wijk you are in, and press X (or
  "Duif-modus stoppen" in the menu) to land as Tammo/Tessa on the nearest
  safe street spot. Not while wanted or during a mission. The poop score and
  pigeon achievements are kept in the save.
- **Audio**: G-Music plays in the city all the time (a shuffled playlist with
  jingles in between; a toast shows the title of each new track), plus
  voicelines, police barks and synthesised effects. Every speech bubble and
  subtitle is voiced; `node scripts/voice_coverage.mjs` checks that (exit
  code 1 lists the lines still without a recording, see ARCHITECTURE.md).
  The voices speak Gronings (the spoken spelling lives in
  `scripts/gronings_spoken.json`); the subtitles stay Dutch until the
  streek *Gronings ondertiteld* is on.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for how the modules fit together,
[DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) for the UI and world style, and
[3d-model-prompts.md](3d-model-prompts.md) for the prompts used to
generate 3D models.

## Hidden test switches

All URL switches live in one register, `FLAGS` in `game/js/devflags.js` (parsed once, with a description in `FLAG_DOCS`). A module imports `FLAGS.x` and never reads `location.search` itself.

Debug hooks on `window` (`window.__x`, read by scripts/perf, the story test and the dev panel; not for players): `__activities`, `__bot`, `__audio`, `__banter`, `__blackCheck`, `__blackFrames`, `__calendar`, `__carbid`, `__cards`, `__cutHost`, `__carillon`, `__contextHints`, `__countrylife`, `__countryside`, `__debug`, `__discgolf`, `__drift`, `__farprops`, `__evenementen`, `__fierljep`, `__flavour`, `__furniture`, `__gdeRespawn`, `__gdeSky`, `__geheimen`, `__gfxAdvice`, `__gfxDyn`, `__goal`, `__heist`, `__heli`, `__heliRun`, `__hengelen`, `__hitch`, `__hitchOn`, `__home`, `__hoogvlieger`, `__kartbaan`, `__kermis`, `__klimtoren`, `__landmarkKits`, `__loadMarks`, `__menuGate`, `__menuHang`, `__muggings`, `__narrative`, `__noLandmarkKits`, `__noPrepare`, `__ommeland`, `__onboarding`, `__ontvoering`, `__padel`, `__perfVerify`, `__pannenkoek`, `__phonefeed`, `__pitchputt`, `__postgame`, `__practice`, `__profileOverlay`, `__radio`, `__regatta`, `__roadrage`, `__scene3d`, `__simLoad`, `__skatepark`, `__snackketen`, `__speech`, `__story`, `__storyContact`, `__storyEikea`, `__storyFun`, `__storyTestReport`, `__storytalk`, `__storytext`, `__tileWindows`, `__trailer`, `__wandeling`, `__waterski`, `__worldevents`, `__zwembad`. Find the module with `grep -rn "window.__x" game/js`. `scripts/devflags_test.mjs` fails on a hook that is not in this list. They stay separate globals: the perf scripts, the story test and the dev panel read them by name.

| Switch | What it does |
| --- | --- |
| `?dev` | Verhaalpaneel op F9; eigen opslag (gde-dev:), raakt de echte save niet |
| `?storytest` | Geautomatiseerde verhaaltest; opslag alleen in het geheugen |
| `?autoplay` | Spelbot (#186; `window.__bot.speed(1..8)` of `run.mjs --speed=N` versnelt de speltijd; `run.mjs --reizen` zet de reisbeats aan, de bot kiest dan Meerijden): window.__bot (playerapi.js) levert de spelstatus en neemt acties aan; vaste seed (autoplay=seed), opslag alleen in het geheugen |
| `?stil` | Geen audio en geen pauze bij verborgen tabblad (testsessies) |
| `?audiograf` | Met stil: de audiograaf draait wel, maar eindigt in een gedempte uitgang |
| `?noattract` | Geen aantrekkingsfilmpje op het titelscherm; door naar het menu |
| `?attract` | Speel het aantrekkingsfilmpje (trailer.js) |
| `?perf` | Prestatierun: titelscherm automatisch voorbij |
| `?spotsonly` | Verhaaltest: alleen de plekkenronde |
| `?trailer` | Trailer-opnamemodus |
| `?benchmark` | Benchmarkrun; de waarde is het aantal rondes |
| `?shot` | Trailer: neem alleen die shot |
| `?cut` | Trailer: montagevariant (vol, kort, ...) |
| `?frames` | Trailer: sla beeld voor beeld op |
| `?video` | Trailer: neem video op (alleen desktop) |
| `?terrain` | Hoogtes volgen het AHN-terrein (dijken, wierden; het terrein wordt nog niet getekend) |
| `?vlakbruggen` | Provinciebruggen en viaducten vlak op straatniveau, zonder de hoogteprofielen uit de tegels (om te vergelijken; standaard hebben ze een profiel, #300) |
| `?nobatch` | Zet het samenvoegen van meshes uit (scene3d) |
| `?shaderdebug` | Laat three.js shaderfouten controleren |
| `?noworker` | Geometrie op de hoofdthread in plaats van in de worker |
| `?simauto` | Ook gewone auto's ver van de speler door de simulatie-worker laten rijden (simbridge.js, #58); nog niet standaard, wacht op meting |
| `?simworker` | Standaard aan; `?zonderworker` zet de simulatie-worker uit (simhost.js, #58), zie "Simulatielagen en worker" |
| `?gfxadvies` | Toon het grafische advies ook als de speler al koos |
| `?gpu` | Doe alsof de GPU deze renderer-tekst heeft (test van het advies) |
| `?preset` | Instellingen alleen voor deze run, bv. quality:laag,drawDistance:kort |
| `?pixeldebug` | Nabewerking verft NaN/Inf-pixels magenta en negatieve HDR-waarden cyaan (issue #35) |
| `?coop` | Lokale co-op voor twee spelers: speler 2 stuurt de metgezel (coop.js, issue #95) |
| `?marker` | `?marker=vorm`: de vaste 3D-vormen van de wereldmarker in plaats van het zachte glyph |
| `?touch` | Raakbediening aan (touch=1) of uit (touch=0), ook zonder touchscherm |
| `?hitch` | Meet haperingen (hitchprobe) |
| `?simlagen` | Standaard aan; `?zonderlagen` zet de simulatielagen uit (simlagen.js, #18) en valt terug op de vaste doelaantallen |
| `?zwartcheck` | Controleer op zwarte beelden (blackframe) |
| `?reizen` | Reisbeats in het nieuwe verhaal: keuze Meerijden, Zelf rijden of Overslaan bij een sprong (#97); staat standaard aan, uit met zonderreizen en in de testmodi |
| `?zonderreizen` | Zet de reisbeats uit (zie reizen) |
| `?preview` | Trailer-voorbeeld in echte tijd met geluid (cut=teaser of hoofd); houd Spatie ingedrukt om over te slaan |
| `?testmenu` | Testmenu op F10 met alle schakelaars en snelkoppelingen; eigen opslag (gde-dev:), raakt de echte save niet |
| `?brugbotsing` | Stuurt na een paar seconden een binnenvaartschip tegen de dichtstbijzijnde brug (#9) |
| `?sfxtest` | Geluidstest: paneel met alle effecten, een afstandsschuif en een afspeelknop per effect; F8 verbergt het (#173) |
| `?perfoff` | A/B-meting: zet prestatiestappen uit, namen gescheiden door +, bv. perfoff=schaduw+actoren (devflags.js, scripts/perf/ab.mjs) |

Every switch above is **off by default**: nothing changes for a player unless the name is in the URL. Value switches (`?shot=3`, `?marker=vorm`, `?touch=1`, `?preset=quality:laag`, `?gpu=<renderer>`, `?benchmark=<rounds>`) are null when absent. The ones to reach for most often:

- Testing without touching your save: `?dev` (F9 panel) or `?storytest`; both use `gde-dev:` storage or memory.
- Features still in trial, off by default so the game stays as it was: `?coop`.
- Diagnosis: `?pixeldebug` (NaN/Inf pixels magenta), `?hitch`, `?zwartcheck`, `?shaderdebug`, `?noworker`, `?nobatch`.
- `?marker=vorm` brings back the old fixed 3D marker shapes. A new switch is added to `FLAGS` and `FLAG_DOCS` only, and to the table above; `devflags_test.mjs` fails otherwise.

- `?dev` (desktop `--dev`): story dev panel on F9. Chapter select (jumps to
  any story step with the money, belongings and progress a player would have
  there), complete objective, win/lose mission, teleport to the next
  objective, time ×2/×4, invulnerable, money timeline. Dev runs use their own
  `gde-dev:` storage keys and never touch the real save.
- `?storytest` (desktop `--story-test[=<dir>]`): plays every available story
  step through the debug hooks and checks that the flow reaches "Wordt
  vervolgd". Storage stays in memory. The desktop run writes a screenshot per
  step plus `report.json` to `<dir>` (default: the temp dir) and exits with
  0 on PASS. Use a throwaway profile:
  `cd desktop && npm run stage && GDE_TEST_PROFILE=gde-test-story npx electron . --windowed --story-test=/tmp/st`

## Performance runs

`scripts/perf/run.sh <name> [flags]` plays fixed routes in the desktop build
(city on foot, the ring by car, the heli over the Ommeland, the pause menu
and a settings sheet) at 1920x1080 and devicePixelRatio 1, and prints frame
times, main-thread time, GPU time, long tasks and draw calls per route.
Flags: `--preset=quality:laag,shadows:false,...` (settings for that run
only, as key:value pairs), `--cpu-throttle=4` (a slower CPU), `--nobatch`,
`--hitch`; env `PERF_ONLY=foot,ring,heli,village,pause,sheet`,
`PERF_PROFILE=<routes>` (CPU profile), `PERF_DIAG=1` (draw calls per owner),
`PERF_SIM=0-2` (load-adaptive simulation level); with `--hitch`, `scripts/perf/sections.py`
prints main-thread ms per category (`docs/PERF-PROFIEL.md`). `scripts/perf/ab.sh`
alternates two staged builds (A/B) and prints medians. Map loading:
`window.__loadMarks` has the boot timeline up to the title screen and the
desktop flag `--profile-load[=ms]` logs a CPU profile of the page load. `--gfx-advice[=<GPU
string>]` shows the first-run graphics advice in a test run.
`node scripts/gfx_profile_test.mjs` checks the GPU classification.
`scripts/perf/geocheck.sh` checks that the geometry worker builds the same
buffers as the main thread, byte for byte (`?noworker` keeps it all on the
main thread).

On a machine other work runs on, frame times say little (the same route gives 21 to 60 ms depending on the
minute). `scripts/perf/run.mjs` (Windows, macOS, Linux; replaces `run.sh`) therefore also reports `mcpu`: the CPU
time of the renderer's main thread per frame, from `scripts/perf/threadcpu.ps1`, which leaves out the time the thread
was pre-empted. `PERF_ONLY=ab` runs variants in turns inside one process (`PERF_AB='aan=;uit=actoren+schaduw'`,
`PERF_AB_MOVE=0|1|2` standing, walking or both, `PERF_AB_ROUNDS`, `PERF_AB_WIN` ms per window) and
`node scripts/perf/abin.mjs <naam>.json` prints per variant the median `mcpu`, the work counts per frame (matrix
walks, frustum tests) and the paired difference per round: the variants switch with `?perfoff=` (`window.__perfOffDyn`
in a run) and feel the same load. `PERF_ONLY=verify` checks that nothing that shows is cut (actors and groups kept out of the main pass, groups kept out of the shadow pass).
`PERF_ONLY=wandel` walks at the game's own pace (3 m/s). `PERF_SETTLE=<ms>` lets a route settle longer first.

Instruments of the draw-call study (r42, #246; docs/PERF-METING-2026-10-19.md "Vervolg 9"), all routes of `scripts/perf/routes.js`:
`renderab` (CPU of the main thread per direct scene render, variants as `PERF_AB_RENDERAB='naam=stappen;...'`, table `scripts/perf/renderab.mjs`),
`renderprof` (a CPU profile of nothing but the scene render; `scripts/perf/selftime.mjs` lists the self time per function, `scripts/perf/callers.mjs` who calls one),
`glcalls` (GL calls per frame by function, by owner with `PERF_DIAG=1`, program switches; variants as `PERF_AB_GLCALLS`), `glbench` (ns per GL call),
`shadowtris` and `shadowmap` (what the shadow pass draws, the shadow map as a 16 x 16 grid; `PERF_AB_SHADOWTRIS`, `PERF_AB_SHADOWMAP`), `poolvis` (pictures of one spot with steps off, in one process;
`PERF_VIS_SPOTS`), `progready` and `startup` (linking of the shader programs after the load), `det`/`census`/`cost` as before. `scripts/perf/abpair.mjs <json>` gives the paired differences of an `ab` run with their standard error;
`scripts/perf/simbench.mjs` (Node, `GDE_PROVINCE_SRC=<repo>/data/cache/province`) measures the CPU of the traffic simulation without a browser. A step name `settle` in an `ab` variant gives that variant the long run-in
(`PERF_AB_PRE`), for steps that rebuild things. `run.mjs` takes `ELECTRON_EXE` and notes the machine's CPU use and free memory around the run (`machine` in the JSON).
`?perfoff=` steps added: `pool` (the static cells and the far LOD as separate meshes again), `poolklein` and `poolrand` (cells of one item and the small margin only with the pool), `progsort` (three's own order of the opaque draws),
`glfilter` (every GL call through), `pedtier` (walkers far away keep their pose every frame), `linkpoll` (the old per-draw question whether a program is linked).
The pool (`multidraw3d.js`, `drawpool.js`, tests `scripts/drawpool_test.mjs` and `scripts/multidraw_test.mjs`): `window.__scene3d.batches().pool` has its numbers (pools, cells, vertices, MB).

## Trailer mode

"GDE Groningen — Een zomer in Grunn": one scripted sequence of 24 shots through
Grunn (`js/trailer.js`, shot list in `docs/verhaal/E-trailer.md`), ~91 s,
with name cards over freeze frames (Tessa, Tammo, Jelle Terpstra, Durk &
Douwe), two voice lines (Rikus on the radio, Berend after the logo;
`scripts/tts_trailer.py` into `audio/voicelines/trailer/`) and the theme song
from the end of the radio intro. Used three ways:

- **Benchmark**: *Instellingen → Beeld → Benchmark draaien* plays the full
  cut in real time with an fps counter, then measures the other presets on
  the two heaviest shots; the result and the recommended preset wait in
  *Beeld*. Name-card freeze frames, title cards and the black intro are not
  measured. From a running game it saves first and continues that save
  afterwards. Esc stops. Desktop `--benchmark[=N]` runs it N times straight
  from the title screen on a throwaway profile, logs fps, draw calls and GPU
  memory (`renderer.info`) per shot and quits; add `--profile` for a CPU
  profile.
- **Steam cuts**: `gameplay` (~63 s, Steam's first trailer: the logo in
  the first seconds, then the systems with the real HUD: driving, stars,
  the heli rings, the stunt evening score, a side job, Ubbo on the phone)
  and `verhaal` (~80 s, the story up to the planned museum heist with voiced
  lines from the game). Shot lists and spoiler rules in
  `docs/steam/trailer.md`; their order is `CUT_ORDER` in `js/trailer.js`.
  `?trailer&cut=gameplay` / `--trailer-cut=verhaal` etc.
- **Short cut** (`kort`, ~38 s, with the Tessa and Tammo name cards): the
  basis for the *Nieuw spel* opening. `?attract` (desktop `--attract`)
  plays it before the menu; hold Space (~0.9 s) to skip.
- **Recording**: `?trailer` (desktop `--trailer`) plays the full cut on a
  fixed 1/60 s step without HUD; the desktop app quits after the last frame.
  Options: `&cut=kort` / `--trailer-cut=kort` (the short cut; also
  `verhaal`, `gameplay`), `&shot=N` /
  `--trailer-shot=N` (only shot N, 1-based; `window.__trailer.list()` prints
  the list, `window.__trailer.freeze(N, t)` holds shot N at t seconds),
  `--trailer=3840x2160` (page size in device pixels),
  `--trailer-frames=<dir>` (every frame as a png), `&stil` / `--stil` (no
  sound). `--trailer` uses a throwaway profile, e.g.
  `cd desktop && npm run stage && GDE_TEST_PROFILE=gde-trailer npx electron . --trailer=1920x1080`
- **Video export**: desktop `--trailer-video[=<file.mp4>]` (default
  `~/Downloads/GDE-Groningen-Een-zomer-in-Grunn.mp4`) runs the recording and pipes
  every captured frame straight into ffmpeg (no frame files on disk), with
  the theme song and the voice lines mixed in at their times. H.264 yuv420p,
  CRF 18, 60 fps, AAC 192k, `+faststart`; 1920×1080 unless `--trailer=WxH`
  (e.g. `--trailer=3840x2160` for 4K). A PNG thumbnail of the aerial shot
  lands next to it. Needs ffmpeg (`/opt/homebrew/bin/ffmpeg`, else `PATH`).
  It refuses any output path inside the repository (`*.mp4`, `*.mov` and
  `trailer-frames/` are in `.gitignore`). Slower than real time; progress is
  printed per second of video, e.g.
  `cd desktop && npm run stage && npx electron . --trailer-video`
  (with `--trailer-cut=kort` for the short cut).
- **Trailers opnemen voor YouTube** (#63): `node scripts/record_trailer.mjs` toont de
  commando's, `--run` neemt `teaser` en `hoofd` op in 1080p en 4K in een scratchmap
  buiten de repo (`--cut=` ook `gameplay`, `verhaal`, `kort`, `vol`; `--res=`, `--out=`,
  `--slot` voor het Electron-slot, `--game-dir=` voor een bestaande staged build).
  `scripts/video_check.mjs` maakt contactbladen en meet zwart, stilte en luidheid,
  `scripts/youtube_thumbnails.mjs` maakt de thumbnails. Zie `docs/youtube/pakket.md` en
  `docs/youtube/trailers.md`.

## Desktop builds and releases

`desktop/` wraps the game in Electron: a standalone macOS app (universal,
Apple Silicon + Intel), a portable Windows `.exe` and, optionally, a Linux
x64 AppImage + tar.gz (for the Steam Deck), all fully offline (three.js and
the fonts are vendored at build time). Built locally, no CI:

```bash
cd desktop && npm install
npm start                       # run the desktop app from source
npm run dist:linux              # only the Linux build, in dist/
npm run release -- minor        # new features:  0.3.1 -> 0.4.0
npm run release -- patch        # bug fixes:     0.3.1 -> 0.3.2
npm run release -- minor --linux --web --steam   # optional extras, any combination
```

`release` bumps the version (SemVer, `0.x.y` until the real launch at
1.0.0), builds both platforms, tags `vX.Y.Z` and publishes a GitHub release
with `GDE-Groningen-<version>-mac.dmg` and
`GDE-Groningen-<version>-windows-portable.exe`. The apps are unsigned (no Apple Developer ID /
Windows certificate), so testers confirm them once in macOS Privacy &
Security or Windows SmartScreen. Afterwards it deletes `dist/` and `build/`
(the builds are on GitHub). Flags:

- `--linux` also builds `GDE-Groningen-<version>-linux.AppImage` and
  `-linux.tar.gz` and uploads both to the release. This works on macOS
  without Docker or Rosetta: `toolsets.appimage` is pinned to `1.0.3`
  (electron-builder's newer, still "beta" AppImage toolset, with native
  macOS tools and a static runtime that needs no libfuse2). The legacy
  default (`0.0.0`) ships an x86_64-only `mksquashfs`, which fails on Apple
  Silicon without Rosetta 2 ("spawn Unknown system error -86"). The AppImage
  adds `--no-sandbox` itself when the system has no user namespaces.
- `--web` also runs `npm run web:zip` and leaves
  `GDE-Groningen-<version>-web.zip` in the repo root (gitignored). It is
  **not** uploaded or published anywhere; `web-dist/` is deleted after
  zipping.
- `--steam` copies the unpacked builds into `steam/content/` before `dist/`
  is cleaned (see [steam/README.md](../steam/README.md)). Nothing contacts
  Steam.

Disk: each platform build is ~250-300 MB, plus ~450 MB unpacked per
platform in `dist/`; the web build adds ~500 MB (`web-dist/` + zip). All of
it is gitignored.

## Webversie

The browser version is a static folder, `web-dist/` (gitignored), built
locally from the same staging as the desktop app. Nothing is published:

```bash
cd desktop
npm run web          # build web-dist/
npm run web:zip      # the same, plus GDE-Groningen-<version>-web.zip for itch.io
npm run web:serve    # serve it at http://localhost:8790/gde/ (add -- --log for a request log)
```

What the web build (`web/build.mjs`) adds on top of `desktop/build.mjs`:

- **Relative paths everywhere** (`GDE_STAGE_RELATIVE=1`), so it runs from any
  sub path (itch.io, GitHub Pages). three.js and the fonts are vendored, so no
  external URL is loaded.
- **Opus audio**: every clip is also encoded as Opus in WebM (voices 32 kbps
  mono, music 96 kbps stereo; cached in `web/.cache/`, so only the first
  build takes ~8 minutes). The game code and manifests keep asking for the
  `.mp3`/`.wav` names; `web.js` picks Opus when
  `canPlayType('audio/webm; codecs="opus"')` says `probably` and the original
  otherwise (Safari before 18.4). `?mp3` forces the originals.
- **Audio packs**: itch.io takes at most 1000 files, so the ~3,650 short
  clips are packed per folder (`audio/packs/*.pack`, max 4 MB, named by
  content hash) with an index in `audio/index.json`. `web.js` reads one clip
  with a Range request when it plays; a host without Range support gets the
  whole pack once. Music (G-Music, race/chase, theme) stays one file per
  track. Nothing is fetched before `play()`, so the 14 G-Music elements the
  game makes at boot stay empty.
- **Loading screen**: the map data (the world tiles, stad.json, mapextras) shows
  "Grunn downloaden… x / 15,1 MB"; the game starts when the code and the map
  are in, audio follows when it plays.
- **Service worker** (`sw.js`, only in the web build; `?nosw` skips it): each
  file is cached the first time the game uses it, in a cache named
  `gde-<version>-<content hash>`; a new build installs before the game
  loads and deletes the old cache. The page itself is network first. A second
  visit downloads nothing, and offline the game starts with everything heard
  before (a clip never heard stays silent offline).
- Desktop-only parts stay off without `window.gdeDesktop`: no *Afsluiten* in
  the title menu or pause menu, no video export or `--` switches; the `?`
  test switches work as in the browser.
- Weak devices: the first-run graphics advice (`gfxprofile.js`) already
  covers this. A weak GPU string plus slow frames suggests Laag.

Sizes (0.22.0): the staging is 172 MB in 3,935 files, 149 MB of it audio.
Opus brings the audio down to 85 MB (music -50%, voices -28%: they were
already 48 kbps mono mp3). `web-dist/` holds both formats: 521 files,
258 MB; the zip is ~242 MB. A browser with Opus downloads ~23 MB before the
title screen (code 7 MB, map 15 MB) and at most ~108 MB if every clip
plays. itch.io HTML5 limits (1000 files, 200 MB per file, 500 MB unpacked):
it fits, with the largest file at 17.3 MB (an audio pack).


## Map data

The city is built like the rest of the province (#90). There is no city map file any more: `game/citymap.json`,
`data/groningen_raw.json`, the `data/*_raw.json` hand sources and the Python chain (`build_map.py`, `process_osm.py`,
`add_*.py`, ...) are gone. What the city needs comes from two places:

- **OpenStreetMap, through the province build.** The extract in `data/cache/province` (made by
  `scripts/world/extract_province.py`, not in git) feeds `buildProvince` (`scripts/world/build_province.mjs`). For the city's 58
  tiles `scripts/world/stad_laag.mjs` takes the buildings, water, green and trees from that build, and
  `scripts/world/stad_wegen.mjs` + `stad_spoor.mjs` make the roads and rails with their height profiles: the same solvers as
  before (`profile.mjs`, `railprofile.mjs`), the ring heights in `ring_elevation.mjs` (a JS port of `add_elevation.py`), lanes,
  junctions and traffic lights from the OSM tags. `stad_na.mjs` applies the city's own rules to those rows (no trees on minigame
  courses, lanes and paths; courtyards cut out of buildings from `scripts/world/binnenplaatsen.json`); `stad_bomen.json` keeps the old
  species of the city's trees. `scripts/world/stad_cache.mjs` caches the result in the temp directory (a cold build takes 4-5
  minutes, then about 10 seconds; `GDE_STAD_CACHE=0` turns it off).
- **`game/stad.json` (0.2 MB, committed).** The hand layer: `meta` (landmarks, districts, neighbourhood points, garages, horeca, POIs,
  shops, hospital, police, bounds, locks), the 30 hand-made buildings (landmarks such as the Martinitoren, the Academiegebouw and
  Paddepoel, the helipad), the mapped street furniture, the city's tiles (`tiles`) and its coverage (`cover`, a run-length mask).
  `game/mapextras.json` (bus roads and lanes, road patches, building patches, passages, fuel stations, padel courts) and
  `game/landmarkkits.json` stay as they were.
  See docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md section 4.5 for the key table and how landmarks, POIs and names hang on tiles.
  The places of `meta` (shops, horeca, garages, landmarks, traffic lights, care sites, police stations, hospital, helipad, pois per kind) are
  rows of the POIS section of the tile their point lies in (`game/js/poisections.js`, #314): `pack_tiles.mjs` splits them off the global layer,
  `TileWorld.fromTiles` joins them back for the readers that still want the whole list; `scripts/poisections_test.mjs` proves it lossless on the
  real meta. Wide roads that lie side by side get their ribbons narrowed in the build (`stad_wegen.mjs separateRibbons`, #268; `node
  scripts/world/road_seams.mjs` lists what is left, `road_seams_test.mjs` keeps the ceilings).

The map covers the whole ringweg plus its surroundings; beyond the city's coverage the province tiles take over. Every script
projects lat/lon to the world frame, RD New shifted to the old origin (`scripts/world/rdnew.py`, see ARCHITECTURE.md "Units and
coordinates").

Then the tiles (`node scripts/world/pack_tiles.mjs [--out game/world]`; `cd desktop && npm run stage` does the whole province and
caches it by the hash of its inputs, about 15 minutes). `data/world/building_attrs.json.gz` (building tags from the former OSM city caches) is committed data now: its generator went with the old city path. Without `data/cache/province` a stage needs
`GDE_PREBUILT_WORLD=<a built world>`; tests that need the city skip with a SKIP line. The game reads `world/`; `scripts/devserver.py`
answers HTTP Range requests, like the desktop app and the web build.

Pictures say more than numbers when the city changes: `node scripts/qa/stadvergelijk.mjs --game-dir=A=<stage>,B=<stage> --out=<dir> --slot`
photographs 67 fixed places (day, and night for a part) in two staged games, `scripts/qa/stadverschil.mjs` measures the difference
per picture (a coarse signature `sg`, pixels, edges, blocks) with the noise level of a second run of the same game, and
`scripts/qa/stadblad.mjs` makes contact sheets with the pairs side by side.

Building heights and roofs of the whole province come from 3D BAG (TU Delft and 3DGI, CC BY 4.0, credited in the game's credits):

```
python3 scripts/world/fetch_3dbag.py --province --list   # tiles and sizes, no download
python3 scripts/world/fetch_3dbag.py --province          # resumable; ~436 tiles, ~0.9 GB in total
rm -rf data/cache/3dbag-province                         # the scratch directory, when done
```

One tile at a time: the GeoPackage is downloaded to a temporary file (at most
one tile of raw data exists), only the buildings' centre, footprint area, roof
heights (`b3_h_dak_max`, `b3_h_dak_50p`), ground level and roof type are kept
in a small extract per tile, and the download is deleted at once. A stopped
run skips the tiles that have an extract (`--scratch <dir>` moves the
directory); errors are retried with 2-16 s backoff, requests are one by one
with a pause. The merge, `data/world/3dbag_province.json.gz` (rows under
`cols`, committed, a few MB), is rewritten at the end of every run.
`scripts/world/build_province.mjs` joins it to the OSM buildings
(`scripts/world/bag3d.mjs`: the `ref:bag` tag, else the BAG centre inside the
footprint with an area within 25 %) and uses the height chain 3D BAG > OSM
height > OSM levels > default; every building keeps its `hsrc`.

Overpass responses that are still cached in `data/` together with the box they cover (`osmfetch.py`) are used by the corridor tools.

## Known limits

- The detailed map is the tiles: the city inside the ringweg plus ~300 m
  around it and, streaming in round the player, every village, road and
  field of the province, with the same generators, detail radius and street
  furniture (the old Ommeland box included: `build_province.mjs` fills the
  corner its OSM extract does not reach from `data/ommeland_raw.json.gz`, as
  boxes and wings instead of the real footprints). The churches, mills,
  towers and borgen are landmark kits from OSM (`landmarkkit.js`). What is
  still lower than in the city: the ground is flat where there is no AHN
  raster. The water is the tiles' water everywhere (the old Ommeland water
  layer `countrywater.js` is gone, #1/#298); `countryedge.js` `countryWater`
  only answers for the procedural polder ditches out past the tiles.
- Squares mapped as OSM multipolygon relations (such as the Grote Markt
  paving) are only in the data as far as the province extract carries them.

## AHN-hoogtes (issue #78)

Hoogtes voor dijken, wierden, de Hondsrug en opritten komen uit het AHN (PDOK WCS, CC0):

```bash
python scripts/world/fetch_ahn.py --province                 # plan, geen netwerk
python scripts/world/fetch_ahn.py --province --fetch --detail  # 25 m overal, 10 m bij dijken/wierden
python scripts/world/fetch_ahn.py --province --fetch --limit 20  # een steekproef
```

Hervatbaar (gedownloade tegels staan in `data/cache/ahn`, mislukte worden 3x herhaald en genoemd),
resultaat in `data/world/ahn` (ongecommit; `pack_tiles.mjs` zet het in de RASTER-sectie). De provincie
is in m NAP (één nulpunt voor alle tegels), gaten (water, onder viaducten) worden uit de omgeving gevuld.
AHN heeft onder viaducten geen data: daar gelden de viaducthoogteregels van #8. Het spel tekent nog geen
terrein; met `?terrain` volgen `groundHeightAt`/`surfaceAt` het terrein (profielen zijn relatief aan het
terrein, `profile.mjs --terrain`). Zonder de vlag verandert er niets. Tests: `terrain_test.mjs`, `scripts/world/fetch_ahn_test.py`.

Stand 20 oktober (#269, waarom `?terrain` nog niet standaard is). Een weg die geen dek is meet het terrein op zijn eigen hoekpunten, recht
ertussen (`deckterrain.js roadTerrainAt`, `GameMap.terrainBase`); de 54 stadstegels hebben nu ook een AHN-raster (10 m, m NAP:
`fetch_ahn.py --province --fetch --cell 10 --tiles <stad.json tiles>`; de 16 centrale stadstegels misten er een en gaven 0 m). De
stadsoplosser kan over het terrein rekenen met `GDE_STAD_TERRAIN=1` (`stad_wegen.mjs`; `GDE_STAD_RING=0` slaat `ringHeights` over, want dat
plateau is vlak gerekend en telt dubbel boven een terrein dat al een dijk is). Gemeten met `network_drive_test --terrain` (2584 ritten, 418
watersteken van de ring): vlak opgelost 437 mislukt en 118 steken; terrein-opgelost met ringplateaus 471 en 168; terrein-opgelost zonder
`ringHeights` 342 en 6. 258 verschillende faalplekken, 234 daarvan binnen 40 m van een brug of tunnel: het zijn de kunstwerken van de ring.
Oorzaak: AHN heeft onder een viaduct geen data en vult het gat uit de omgeving, dus de weg die onder het viaduct doorgaat (Groningerweg onder de
Noordzeeweg) klimt in het terrein op de dijk van 5 m en het dek zelf meet vanaf die dijk. Wat ontbreekt voor standaard: een terrein dat onder
een kunstwerk de aanloop van de onderliggende weg volgt (en niet de dijk), en een ringoplosser die in absolute hoogtes rekent. Zolang dat er niet
is, blijft `?terrain` een vlag; zonder de vlag verandert er niets.
Geprobeerd en weggehaald (21 oktober): het terrein onder een dek vervangen door wat naast het dek ligt (de lagere van beide kanten over de richting van het dek). Dat
maakte het erger (477 mislukte ritten vlak opgelost, 534 terrein-opgelost): de straat onder een viaduct loopt door de hele aanloopdijk, niet alleen onder het dek,
dus die straat heeft een eigen profiel nodig (zoals een dek: de lijn tussen zijn uiteinden buiten de dijk), in de oplosser en in het spel. Dat is de volgende stap.

## Samen spelen (issue #95)

Achter `?coop`; zonder die vlag verandert er niets. In het pauzemenu staat dan het onderdeel "Samen spelen" (Watch Dogs 2-achtig): **Iemand uitnodigen** (host, speelt Tammo) of **Code of adres invoeren** (gast, speelt Tessa). Er is geen keuze per save of bij het starten. Iedereen houdt zijn eigen voortgang: de gast verlaat zijn wereld, speelt in die van de host en komt terug op zijn eigen plek; zijn geld, spullen en prestaties blijven van hem (de sessie schrijft zijn save niet: `saveGame()` doet niets bij `world.coopRole === 'client'`). Er is geen coöp-save; alleen `gde-coop-sessie` onthoudt de laatste code van een gast.

**Twee routes, naast elkaar** (de speler kiest in het uitnodigscherm):

- **Kamercode** (`net/rtcroom.js`, `net/brokers.js`, `net/sigcrypto.js`, `net/netconfig.js`): WebRTC-datakanaal met openbare STUN-servers, signalering zonder eigen server via openbare brokers (BitTorrent-trackers en MQTT, PeerJS Cloud alleen als terugval). Het SDP/ICE-aanbod en -antwoord worden end-to-end versleuteld met de kamercode (PBKDF2 → AES-GCM); een broker ziet alleen onleesbare blobs en een uit de code afgeleid onderwerp, de code zelf gaat nooit over de lijn. Werkt ook in de webversie. Alle servers staan in **één bestand**: `game/js/net/netconfig.js` (STUN-lijst, trackers, MQTT-brokers, PeerJS, time-outs). Pas daar aan; controleer de adressen vóór een release.
- **IP-adres** (`net/upnp.js`, `net/pairing.js`, `desktop/coopcore.cjs`): alleen Electron. De host opent via UPnP (NAT-PMP als terugval) een poort op de eigen router, leest het externe adres uit de router zelf en toont een code met adres, poort, sessiesleutel en controlesom (`GDE2-...`). De gast verbindt rechtstreeks (TCP). Geen derde partij. Bij geen UPnP, CGNAT of een weigering toont het scherm een Nederlandse melding met de terugval op het lokale netwerk. De mapping sluit bij stoppen en bij afsluiten (lease 2 uur).

**Privacy en toestemming.** Beide routes delen het IP-adres met de medespeler. Vóór elk verbinden toont het spel een melding met een bevestigingsknop ("Akkoord en verbinden"); er wordt nooit stilzwijgend verbonden (`lobby.js`, stap `toestemming`). De kamercode-route stuurt bovendien het IP-adres naar de STUN-server en versleutelde signalering naar de brokers: de eigenaar heeft dat goedgekeurd (comment op #95). Geen telemetrie, geen accounts, niets van de save gaat mee. De tekst voor spelers staat bij Over › Privacy (`game/js/credits.js`).

**N spelers (minimaal 4, tot 8).** Sterntopologie: de host (Tammo, plek 0) heeft per gast een eigen verbinding (`net/hub.js`, `HostHub`), met eigen invoer, token en status. Plek 1 is altijd Tessa; plek 2 en hoger zijn eigen figuren uit een vaste lijst met verzonnen namen, kleuren, vormen en kleding (`coopplayers.js`, `EXTRA_CHARS`), zonder hoofdrol in het verhaal: ze doen mee in de open wereld en bij de coöp-activiteiten. Het maximum staat standaard op 8 en is door de host instelbaar (4, 8, 12, 16; de codec kent 16 plekken, in de praktijk bepaalt de internetverbinding van de host het); de lobby toont vanaf 5 spelers een Nederlands advies over prestaties en, voor de host, uploadbandbreedte (`coopplayers.advies`). Een extra speler houdt het spel niet op als hij wegvalt, tenzij de opdracht hem nodig heeft (`holdBeleid`, `world.coopVereist`); Tessa wel. Elke client ziet alle anderen met naam, kleur en vorm (HUD-label, `partnerhud.partnersInfo`); de host stuurt iedereen de lijst met spelers (`spelers`-bericht), pings gaan naar iedereen. Extra spelers volgen hun eigen figuur met hun eigen camera (het eenvoudigste dat werkt); de gedeelde camera voor de eerste twee is nog niet aan `scene3d` gekoppeld. Kamercode-route: na elke gast zet de host een nieuw aanbod klaar onder dezelfde code; de IP-route accepteert tot `max - 1` verbindingen (`desktop/coopcore.cjs`, id per verbinding).

**De wereld van de host bij een gast.** Een gast draait de wereld van de host niet zelf: `updateGameplay` (main.js) doet niets zolang `world.coopRole === 'client'` en de verbinding staat; de gast tekent wat de host stuurt. Dat zijn de posities van alle spelers, wanted, voertuigen binnen 150 m van een speler (als blokken in maat en kleur, `coopentities3d.js`, `coopworld.js`), het doel van de lopende opdracht (lichtzuil) en een melding van wat de host speelt (`missie`-bericht). Tot 20 voetgangers en agenten binnen 70 m van een speler gaan ook mee (soort 12 en 13, eigen id-bereik vanaf 0x8000, getekend als eenvoudige poppetjes); verkeer verder weg, weer en schade blijven lokaal. Een passagier staat in de snapshot op de plek van het voertuig (`posOf`). Wat de host op het scherm heeft, gaat als `scene`-bericht naar de gasten (`coopscene.js`, `readHostScene`): een filmpje (na 0,7 s, zodat een kort kaartje bij dood geen filmpje is), de regel die iemand zegt, de opties van een keuze en of de host op pauze staat. Een gast tekent daar een laag met zwarte balken en tekst van (`updateHostScene`), stuurt tijdens een filmpje geen invoer en kiest niet: de host beslist. Een gast kan alleen lopen en rennen (#291). De figuren van andere spelers zijn echte persoonsmodellen met eigen uiterlijk, naamlabel en loopanimatie (`coopfigures3d.js`, `coopfigures.js`). Medespelers staan met eigen vorm en kleur op de kaart (`mapview.js`, soort `partner` in `mapicons.js`/`hud_panel.js`) en op de minimap (pijl aan de rand als ze buiten beeld zijn). De eerste twee spelers delen een camera op het midden tussen hen zolang ze te voet en binnen 60 m van elkaar zijn (`coop.sharedCamera`, `world.coopCam`, een kleine aanpassing in `scene3d.js`); extra spelers volgen hun eigen figuur.

**Testbank.** `docs/COOP-TESTBANK.md`: pure scenario's met een slecht netwerk (`coop_scenarios_test`), vier headless gasten over echte TCP (`coop_tcp_test`) en `scripts/coop/testbank.mjs` met echte Electron-instanties (suites `basis`, `net`, `kamer`, `verhaal`, `touch`). Een Electron-run in een worktree vraagt `ELECTRON_EXE` en een gestagede map (`scripts/coop/restage.mjs`), en neemt de sloten van de slotenmap (`$GDE_LOCKS`, standaard `~/gde-locks`).

**Tests** gebruiken nooit echte brokers, STUN of routers: `net_codec_test`, `net_protocol_test`, `net_hostmodel_test` (in-memory transport met verlies en jitter), `net_hub_test` (4 tot 8 spelers), `net_ipctransport_test`, `coopplayers_test`, `coopfigures_test`, `coopworld_test`, `net_sigcrypto_test`, `net_brokers_test` (nepbrokers voor tracker, MQTT en PeerJS), `net_rtcroom_test` (nep-RTCPeerConnection), `net_upnp_test` (nepper-router), `net_pairing_test`, `coopcore_test` (alleen 127.0.0.1), `coopnet_test`, `lobby_test`, `partnerhud_test`, `coopactivities_test`, `cooproles_test`, `coopstate_test`, `coopsave_test`, `coop_test`. Niet getest: een echte verbinding, echte STUN/brokers/UPnP, de schermen in beeld.

**Uitbreiden.** Nieuwe scènes, minigames, voertuigen en coöp-activiteiten registreren hun regel met `registerCoop(soort, id, regel)` in `game/js/cooproles.js`; de netcode hoeft niet te veranderen. Het protocol heeft een versie en onderhandelde `caps` (`net/session.js`); onbekende gebeurtenissen worden genegeerd.

## Simulatielagen en worker (#18, #58)

Standaard aan. Uitzetten: `?zonderlagen` (doelaantallen en afstanden terug naar de oude vaste waarden) en `?zonderworker` (geen simulatie-worker).

- **Lagen** (`simlagen.js`): vol (< 150 m auto, < 70 m voetganger) = echte entiteiten; vereenvoudigd = denkt om de 3 frames (alleen wandelaars); abstract en weg = niets. Het doel per streek en uur komt uit het model; de spawnring van auto's loopt tot 1,15x de vollaag, zodat het aantal ontmoetingen dicht bij het oude pad ligt.
- **Worker-contract voor voetgangers** (`simambient.js`): wie als ambient agent naar `simkernel.js` mag (`isAmbientPed`) en waar op een voetpad hij staat. Zonder `Worker`, onder `?storytest` of met `?noworker` draait `simhost.js` dezelfde kern op de hoofdthread.
- **Beperkingen:** de echte AI (`vehicle.js`, `pedestrians.js`: politie, misdaad, botsingen, missies) blijft op de hoofdthread; de worker is nog niet door `main.js` aangeroepen, dus het scheelt nog geen frametijd. `AbstractPool` is niet aangesloten. Spiegelmeshes en de overdracht Vehicle/Pedestrian <-> agent in het spel zijn niet gebouwd. Dichtheden zijn geschat en niet visueel beoordeeld.
- **Controle:** `node scripts/simlagen_test.mjs`, `simworker_test.mjs`, `simambient_test.mjs` (deterministische headless populatiesimulatie, oud versus lagen). **Meten:** `node scripts/sim_meet.mjs [auto's] [voetgangers] [ticks]` (tijd per tick van de kern en heap; met `node --expose-gc` een zuiver geheugenverschil). De echte frametijd meet je met `?hitch` in het spel.
