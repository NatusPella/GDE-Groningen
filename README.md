# GDE Groningen – Zomer vol misdaad

*GDE* stands for *Grootste Diefstal Ever*. GDE is a series name: a place on a
place-name sign plus a subtitle per game (GDE Groningen now, maybe GDE
Drenthe later). Until 0.24 the game was called "GTE VI"; see
[The old name](#the-old-name) for what deliberately keeps it.

Third-person 3D sandbox game set in the real street and building layout of
Groningen (binnenstad plus surroundings), built from OpenStreetMap data.
Vanilla JS ES modules and Three.js (r0.160, loaded from a CDN via an import
map). No build step and no npm dependencies. All in-game text is in Dutch.

> **GDE is een fanparodie op GTA, niet gelieerd aan of goedgekeurd door
> Rockstar Games of Take-Two Interactive.** A free, non-commercial fan parody. "Grand Theft
> Auto" and "GTA" are trademarks of Take-Two Interactive. Names, characters,
> brands and events in the game are fictional; real streets and public
> buildings are only the setting.

## Run it

```bash
python3 scripts/devserver.py 8765 game
```

Then open http://localhost:8765. `devserver.py` is a static file server that
disables caching, so edited modules are always reloaded.

**Windows:** unzip the project and double-click `start.bat`. It uses an
installed Python if there is one; otherwise it downloads the official portable
Python from python.org into `.python\` next to the game (once, no admin rights
needed). It then picks a free port, starts the server on 127.0.0.1 and opens
the game in the browser. Keep the window open while playing. If Windows
SmartScreen warns about the file, choose "Meer info" → "Toch uitvoeren".

### Hidden test switches

- `?dev` (desktop `--dev`): story dev panel on F9. Chapter select (jumps to
  any story step with the money, belongings and progress a player would have
  there), complete objective, win/lose mission, teleport to the next
  objective, time ×2/×4, invulnerable, money timeline. Dev runs use their own
  `gte-dev:` storage keys and never touch the real save.
- `?storytest` (desktop `--story-test[=<dir>]`): plays every available story
  step through the debug hooks and checks that the flow reaches "Wordt
  vervolgd". Storage stays in memory. The desktop run writes a screenshot per
  step plus `report.json` to `<dir>` (default: the temp dir) and exits with
  0 on PASS. Use a throwaway profile:
  `cd desktop && npm run stage && GTE_TEST_PROFILE=gte-vi-test-story npx electron . --windowed --story-test=/tmp/st`

### Performance runs

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

### Trailer mode

"GDE Groningen — Een zomer in Grunn": one scripted sequence of 24 shots through
Grunn (`js/trailer.js`, shot list in `docs/verhaal/E-trailer.md`), ~91 s,
with name cards over freeze frames (Anita, Tammo, Jelle Terpstra, Durk &
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
- **Short cut** (`kort`, ~38 s, with the Anita and Tammo name cards): the
  basis for the *Nieuw spel* opening. `?attract` (desktop `--attract`)
  plays it before the menu; hold Space (~0.9 s) to skip.
- **Recording**: `?trailer` (desktop `--trailer`) plays the full cut on a
  fixed 1/60 s step without HUD; the desktop app quits after the last frame.
  Options: `&cut=kort` / `--trailer-cut=kort` (the short cut), `&shot=N` /
  `--trailer-shot=N` (only shot N, 1-based; `window.__trailer.list()` prints
  the list, `window.__trailer.freeze(N, t)` holds shot N at t seconds),
  `--trailer=3840x2160` (page size in device pixels),
  `--trailer-frames=<dir>` (every frame as a png), `&stil` / `--stil` (no
  sound). `--trailer` uses a throwaway profile, e.g.
  `cd desktop && npm run stage && GTE_TEST_PROFILE=gte-vi-trailer npx electron . --trailer=1920x1080`
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
  is cleaned (see [steam/README.md](steam/README.md)). Nothing contacts
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
npm run web:serve    # serve it at http://localhost:8790/gte/ (add -- --log for a request log)
```

What the web build (`web/build.mjs`) adds on top of `desktop/build.mjs`:

- **Relative paths everywhere** (`GTE_STAGE_RELATIVE=1`), so it runs from any
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
- **Loading screen**: the map data (citymap, mapextras, ommeland: 15 MB) shows
  "Grunn downloaden… x / 15,1 MB"; the game starts when the code and the map
  are in, audio follows when it plays.
- **Service worker** (`sw.js`, only in the web build; `?nosw` skips it): each
  file is cached the first time the game uses it, in a cache named
  `gte-vi-<version>-<content hash>`; a new build installs before the game
  loads and deletes the old cache. The page itself is network first. A second
  visit downloads nothing, and offline the game starts with everything heard
  before (a clip never heard stays silent offline).
- Desktop-only parts stay off without `window.gteDesktop`: no *Afsluiten* in
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
it fits, with the largest file at 11.7 MB (`citymap.json`).

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
| K | kiss your companion (Tammo/Anita) when next to them | – |
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
| X | as a pigeon: turn back into Tammo/Anita where you are | |

Every key above except Esc, Enter, the arrows and the mouse can be rebound
under Instellingen › Besturing › Toetsenbord (a key already in use swaps
with the old one; "Standaard herstellen" puts them all back).

### Controller (Xbox, PlayStation, Steam Deck)

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
| LB / RB | previous / next weapon | next radio station / shoot from the window | previous / next section |
| D-pad | ↑ phone, ↓ kiss, ← skip story step, → paint/garage menu | ↑ phone, ↓ film camera | choose |
| View / Menu | map / pause menu | map / pause menu | map / close |

The helicopter climbs and descends on RT/LT and turns with LB/RB; a pigeon
flaps on A, pecks on B, dives on LT and poops on RT or X; the Fjord Frituur
puts its menu on the D-pad and bumpers. Buttons can be swapped under
Besturing › Controller; rumble, the button style and the stick speed are under
Instellingen › Controller.

### Accessibility

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
  Staart follows; the story decides whether you play Tammo or Anita, the
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
  "Duif-modus stoppen" in the menu) to land as Tammo/Anita on the nearest
  safe street spot. Not while wanted or during a mission. The poop score and
  pigeon achievements are kept in the save.
- **Audio**: G-Music plays in the city all the time (a shuffled playlist with
  jingles in between; a toast shows the title of each new track), plus
  voicelines, police barks and synthesised effects. Every speech bubble and
  subtitle is voiced; `node scripts/voice_coverage.mjs` checks that (exit
  code 1 lists the lines still without a recording, see ARCHITECTURE.md).

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the modules fit together,
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the UI and world style, and
[docs/3d-model-prompts.md](docs/3d-model-prompts.md) for the prompts used to
generate 3D models.

## Map data

`game/citymap.json` is built from OpenStreetMap data in one go:

```
python3 scripts/build_map.py            # from the caches in data/ (fetches what is missing)
python3 scripts/build_map.py --refresh  # refetch every Overpass cache first
```

The map covers the whole ringweg (Westelijke, Noordelijke, Oostelijke and
Zuidelijke Ringweg with Julianaplein, Europaplein, Euvelgunne and
Noorderhoogebrug) plus ~300 m around it; beyond that the Ommelanden take
over: real roads, rails, water and villages in low detail for ~12 km, with
the procedural fields, ditches, farms and animals in between, and fully
procedural polders further out. The origin stays at the centre of the original city
core, so all coordinates in the game keep their meaning. The steps, in order:

1. `fetch_osm.py`: the ways around the city core into `data/ring_raw.json.gz`
   and `data/ring_extra.json.gz` (only if missing). The core itself comes
   from `data/groningen_raw.json` and `data/groningen_extra.json`.
2. `process_osm.py`: roads (with their grade tags: layer, tunnel, viaduct),
   buildings, water, green and trees, cropped to the ring and its margin
   (`ringloop.py` finds the ring loop on the road graph).
3. `add_elevation.py`: heights for the ring and its grade-separated
   junctions (`road.z` per vertex): sunken Zuidelijke Ringweg, viaducts,
   ramps at most ~5%, everything else flat.
4. `add_landmarks.py`, `add_districts.py`, `add_garages.py`, `add_horeca.py`,
   `add_traffic_lights.py`, `add_pois.py` (health, money, weapons and armor
   spots; the health ones are pedestrian destinations).
5. `add_railways.py`: rails, stations, level crossings, train routes and the
   rail lifts (not where the ring already passes over or under the track).
6. `add_helipad.py`, `add_landmark_footprints.py`, `add_shops.py`.
7. `gen_ringroute.py`: writes `game/js/ringroute.js`, the ring race lap.

8. `fetch_ommeland.py` + `add_ommeland.py`: the real Ommelanden round the
   city (Zuidhorn to Ten Boer, Winsum to Eelde and the Zuidlaardermeer) into
   `game/ommeland.json` (roads, narrow waterways, rails, places, churches,
   stations and the train routes carried on to Haren, Zuidhorn, Sauwerd,
   Winsum, Bedum, Kropswolde and Martenshoek) and `game/ommeland.bin`
   (gzip: building boxes and a water distance field). `citymap.json` is not
   touched. Needs numpy and Pillow. The cache `data/ommeland_raw.json.gz`
   keeps only trimmed tags and building boxes.

Overpass responses are cached in `data/` together with the box they cover
(`osmfetch.py`) and refetched when the map outgrows them. Keys another tool
added to `citymap.json` are carried over by `build_map.py`.

## Known limits

- The detailed map covers the city inside the ringweg plus ~300 m around it.
  The real Ommelanden round it are low detail: flat ground, buildings as
  simple boxes, roads and water painted on the ground (you wade through the
  lakes rather than swim).
- Squares mapped as OSM multipolygon relations (such as the Grote Markt
  paving) and some named canals are not in the data yet, because
  `process_osm.py` only fetches ways.

## Licences and credits

Map data © OpenStreetMap contributors, available under the
[Open Database License](https://www.openstreetmap.org/copyright); the map
files (`game/citymap.json`, `game/mapextras.json`, `game/ommeland.*`,
`data/`) stay under the ODbL. Music and voices are generated with Google
Gemini. Third-party software and fonts (three.js, Bebas Neue, Big Shoulders
Display, Electron) and
their licences: [NOTICE.md](NOTICE.md) and `licenses/`. The licence for the
project's own code and content is not chosen yet; see
[docs/LICENTIES.md](docs/LICENTIES.md) for the inventory, the options and the
open risks, and [docs/PUBLICEREN.md](docs/PUBLICEREN.md) for the checklist
before the repo goes public.

Saves: progress saves on its own (and with Opslaan in the pause menu) on
your own device. From 1.0 on, a save keeps working in every later version:
each save carries a version and older ones are migrated step by step when
they load (`game/js/savemigrate.js`, checked by
`node scripts/save_migration_test.mjs` against saves from earlier versions;
see ARCHITECTURE.md, "Saves and versions").

Privacy: the game keeps progress and settings in the browser's localStorage
on your own device. No accounts, no telemetry, no analytics. The browser
version loads three.js from jsDelivr and the fonts from Google Fonts; the
desktop build loads nothing from the internet.

## The old name

The game was called "GTE VI – Grand Theft Eierbal VI" until 0.24. Everything
a player sees now says GDE, but identifiers that saves and settings depend on
keep the old name on purpose:

- localStorage keys (`gte-save-v1`, `gte-settings`, `gte-dev:` and the rest of
  `gte-*`), the web build's cache names (`gte-vi-*`) and the `gte:` IPC
  channels;
- the Electron `appId` (`nl.natuspella.gte-vi`) and the Windows
  AppUserModelId, and the userData folder: `desktop/main.js` pins it to
  `GTE VI` (`~/Library/Application Support/GTE VI`, `%APPDATA%\GTE VI`,
  `~/.config/GTE VI` on Linux),
  because the new product name would otherwise start with an empty profile;
- the npm package name `gte-vi`, the `GTE_*` environment variables, the
  repo and file names, CSS ids such as `#gte-ahead`, and the `GTE-VI/`
  folder inside the Windows zip (so `START DE GAME.bat` finds an earlier
  install);
- the recorded narrator lines that say "Eerder in GTE VI" (the recaps of
  part 2 and 3) until they are recorded again.

