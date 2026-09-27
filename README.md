# GTE VI – Grand Theft Eierbal VI

Third-person 3D sandbox game set in the real street and building layout of
Groningen (binnenstad plus surroundings), built from OpenStreetMap data.
Vanilla JS ES modules and Three.js (r0.160, loaded from a CDN via an import
map). No build step and no npm dependencies. All in-game text is in Dutch.

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

### Trailer mode

One scripted sequence of shots through Grunn (`js/trailer.js`, design in
`docs/verhaal-voorstel.md` section 5), used three ways:

- **Attract intro**: the short cut (~33 s, city and features only) plays
  once on the first launch, and once for existing players after the update
  that added it (`attractSeen` in `gte-settings`; *Standaardinstellingen*
  keeps it). Hold Space (~0.9 s) to skip. Never with `?stil`, `?dev`,
  `?storytest` or `?noattract`; the desktop smoke, perf and story tests add
  `noattract`. `?attract` (desktop `--attract`) plays it on request.
- **Benchmark**: *Instellingen → Beeld → Benchmark draaien* plays the full
  cut (~82 s) in real time with an fps counter, then shows average fps,
  1%-low, the heaviest shot and a quality suggestion (*Toepassen*). From a
  running game it saves first and continues that save afterwards. Esc stops.
  Desktop `--benchmark[=N]` runs it N times straight from the title screen
  on a throwaway profile, logs fps, draw calls and GPU memory
  (`renderer.info`) per shot and quits; add `--profile` for a CPU profile.
- **Recording**: `?trailer` (desktop `--trailer`) plays the full cut on a
  fixed 1/60 s step without HUD; the desktop app quits after the last frame.
  Options: `&cut=kort` / `--trailer-cut=kort` (the short cut), `&shot=N` /
  `--trailer-shot=N` (only shot N, 1-based; `window.__trailer.list()` prints
  the list), `--trailer=3840x2160` (page size in device pixels),
  `--trailer-frames=<dir>` (every frame as a png, for a smooth frame dump on
  a slow machine), `&stil` / `--stil` (no music). `--trailer` uses a
  throwaway profile, e.g.
  `cd desktop && npm run stage && GTE_TEST_PROFILE=gte-vi-trailer npx electron . --trailer=1920x1080`

## Desktop builds and releases

`desktop/` wraps the game in Electron: a standalone macOS app (universal,
Apple Silicon + Intel) and a portable Windows `.exe`, both fully offline
(three.js and the font are vendored at build time). Built locally, no CI:

```bash
cd desktop && npm install
npm start                       # run the desktop app from source
npm run release -- minor        # new features:  0.3.1 -> 0.4.0
npm run release -- patch        # bug fixes:     0.3.1 -> 0.3.2
```

`release` bumps the version (SemVer, `0.x.y` until the real launch at
1.0.0), builds both platforms, tags `vX.Y.Z` and publishes a GitHub release
with the `.dmg` and `.exe`. The apps are unsigned (no Apple Developer ID /
Windows certificate), so testers confirm them once in macOS Privacy &
Security or Windows SmartScreen.

## Controls

| Key | On foot | In a vehicle |
|---|---|---|
| W/S or ↑/↓ | walk away from / towards the camera (hold Shift to run) | throttle / reverse |
| A/D or ←/→ | strafe left/right relative to the camera | steer |
| Space | jump | brake |
| Ctrl | crouch | – |
| E or F | enter nearest vehicle, use a shop/job/station, or become a pigeon at a pigeon sign | exit |
| H | – | horn |
| L | – | lights and siren on/off (police car, ambulance): traffic moves aside |
| R | – | at Spuit & Klaar: new paint; inside a garage or at a gas station: repair / upgrade menu |
| K | kiss your companion (Tammo/Anita) when next to them | – |
| Left mouse | attack (fists or the equipped gun); you turn to where the camera looks | – |
| Right mouse | aim: face the camera direction while moving | – |
| 1–4 | fists / pistol / uzi / shotgun | – |
| Mouse wheel | next / previous weapon | – |
| Mouse | orbit the camera around your character; push it low to look up at the rooftops | orbit around the car; eases back behind it after ~1.7 s (up to ~4.5 s at speed) |
| Q or middle mouse (hold) | – | look back |
| M | city map: click to set a waypoint (GPS route on map and minimap), right-click or Del to clear it, Shift+click to teleport; one legend checkbox per category shows or hides it on both the map and the minimap (destination, route and police are always shown) | |
| U | sound on/off | |
| F11 / Alt+Enter | desktop app: fullscreen on/off (Mac also Ctrl+Cmd+F) | |
| X | as a pigeon: turn back into Tammo/Anita where you are | |

## What's in it

- **World**: ~35k real building footprints, roads with sidewalks and
  centerlines, canals and the Diepenring, parks, trees, bridges, traffic
  lights, flitspalen, horeca, landmarks (a real 3D Martinitoren model, the
  rest procedural for now).
- **Life**: traffic (cars, buses, bikes, scooters, boats), pedestrians,
  seagulls/cows/sheep, weather with storms, helicopters and balloons.
- **Gameplay**: driving and on-foot movement, combat, wanted level with
  police cars, foot cops, boats and a helicopter, 13 missions in a guided
  story ("Alles voor één eierbal": the Kop and the Romp are playable, the
  Staart follows; the story decides whether you play Tammo or Anita, the
  route always points to the next step, and after a failed mission you can
  skip it with O or from the pause menu), shops (weapons,
  armour and food are bought, not found on the street; you start with €250),
  Sikkom news feed and phone notifications. Duif-modus as an in-game
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
- No save/load.
