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
| E or F | enter nearest vehicle, or kiss your companion when next to them | exit |
| Left mouse | attack (fists or the equipped gun); you turn to where the camera looks | – |
| Right mouse | aim: face the camera direction while moving | – |
| 1–4 | fists / pistol / uzi / shotgun | – |
| Mouse wheel | next / previous weapon | – |
| Mouse | orbit the camera around your character | orbit around the car; eases back behind it after ~1.7 s |
| C | switch between Tammo and Anita | swap seats |
| M | city map (click a wijk to travel there) | |
| U | sound on/off | |

## What's in it

- **World**: ~35k real building footprints, roads with sidewalks and
  centerlines, canals and the Diepenring, parks, trees, bridges, traffic
  lights, flitspalen, horeca, landmarks (a real 3D Martinitoren model, the
  rest procedural for now).
- **Life**: traffic (cars, buses, bikes, scooters, boats), pedestrians,
  seagulls/cows/sheep, weather with storms, helicopters and balloons.
- **Gameplay**: driving and on-foot movement, combat, wanted level with
  police cars, foot cops, boats and a helicopter, pickups, 8 missions,
  Sikkom news feed and phone notifications.
- **Audio**: G-Music plays in the city all the time (a shuffled playlist with
  jingles in between; a toast shows the title of each new track), plus
  voicelines, police barks and synthesised effects.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the modules fit together,
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the UI and world style, and
[docs/3d-model-prompts.md](docs/3d-model-prompts.md) for the prompts used to
generate 3D models.

## Map data

`scripts/process_osm.py` pulls roads, buildings, water and parks from the
Overpass API and projects them onto a flat meter grid (`game/citymap.json`).
The other `scripts/add_*.py` scripts enrich that file with districts,
landmarks, horeca, garages and traffic lights.
`scripts/add_pois.py` adds `meta.pois`: pickup spots for health (huisarts, apotheek, ziekenhuis), money (pinautomaten, kantoren, winkels), weapons (industrieterrein, kades, steegjes) and armor (sportscholen).

## Known limits

- The map covers the city core, not all of Groningen.
- Squares mapped as OSM multipolygon relations (such as the Grote Markt
  paving) and some named canals are not in the data yet, because
  `process_osm.py` only fetches ways.
- No save/load.
