# GTE VI – architecture

A browser game in plain ES modules: `game/index.html` loads `js/main.js`,
and Three.js is resolved through an import map (the module also imports it
by its full CDN URL; both resolve to the same instance). There is no bundler.
The code is the source of truth; this file is the map.

## Units and coordinates

- World units are meters. `x` is east, `y` is south.
- In 3D: `three.x = world.x`, `three.z = world.y`, `three.y` is up.
- Angles are radians; `0` faces +x.
- Building and terrain geometry bake absolute world coordinates into their
  vertices, so their meshes sit at the origin.

## Shared state

`World` (`js/world.js`) is the one mutable state object every system
receives. It holds `map`, `input`, `player`, `companion`, `vehicles`,
`pedestrians`, `bullets`, `particles`, `wanted`, `money`, `health`, `armor`,
`weapon`, `ammo`, `mission`, `stats`, `time` and the `messages` toast queue
(`world.addMessage(text, seconds)`). `respawnPlayer(world, {busted})`
handles death and arrest.

Each system owns the arrays and fields it writes (for example `police.js`
owns wanted-level decay and police spawns) and only reads the rest.

## Frame loop (`js/main.js`)

`boot()` loads the map, builds the 3D scene, spawns the player at a random
landmark, initialises every system and waits for the start screen. Each
frame then runs, in order:

1. Population upkeep (traffic, bikes, buses, scooters, boats, pedestrians)
2. `player.update`, companion, map overlay
3. Traffic lights and traffic AI, boat AI
4. Police, vehicle–vehicle collisions, vehicles in water
5. Combat and bullets, pedestrians, wildlife, sky props
6. Missions, Sikkom feed, phone feed, garages, horeca, shops, flitspalen
7. Audio, weather
8. `update3D` (renders), `updateHud`
9. `input.endFrame()`

`dt` is clamped to 0.05 s.

## Modules

| Area | Files |
|---|---|
| Map data | `mapdata.js` (`GameMap`: grid-indexed `buildingsNear`, `roadsNear`, `waterNear`, `nearestRoadPoint`, `isOnBridge`, `escapeBuilding`, `groundHeightAt`), `elevation.js` (ring road heights, walls, open cuts), `util.js` |
| Input | `input.js` (`isDown`, `wasPressed`, `axis`, `mouse`) |
| Player | `player.js` (movement, building collision, vehicles, jump, crouch, kiss), `companion.js` (Tammo/Anita) |
| Vehicles | `vehicle.js` (physics, traffic AI, boats, damage, wrecks, water; a car at zero health is `disabled` and burns until `explodeVehicle` makes it a wreck) |
| People and animals | `pedestrians.js`, `wildlife.js` |
| Combat and police | `combat.js` (weapons, bullets swept against walls, props, car boxes and people; recoil in `world.camKick`), `gunfx3d.js` (muzzle flashes with a light pop, tracers, per-surface impacts, pooled bullet holes), `police.js` |
| Traffic | `trafficlights.js` (conflict-free phases per axis, protected lefts or split phasing, Groningen all-bikes phase), `junctions.js` (priority classes, extra signals at busy main-road crossings, give-way arms for haaientanden and B6 signs), `trafficfleet.js` (vehicle kinds per wijk stereotype), `emergency.js` (ambulance calls, player siren on L, traffic yields) |
| Story | `storyarc.js` (the arc as data), `story.js` (director), `storydev.js` (`?dev` panel), `storytest.js` (`?storytest`), `devflags.js` |
| Game systems | `missions.js`, `garages.js` (Garage Knalpot workshops and Pomp & Poets stations: roller door, R menu for repair, paint, upgrades and wrecks; Henk's phone call), `shops.js` (the only source of weapons, ammo and armour; food restores health), `horeca.js`, `flitspaal.js`, `trafficlights.js`, `weather.js`, `skyprops.js`, `pigeonspots.js` + `pigeonmode.js` (word een duif) |
| Bijbaantjes | `sidejobs.js` (start points, shifts, pay, levels; publishes `world.sideJob` for HUD, map and routing), `sidejobkit.js` (shared helpers), `sidejobvoice.js` (voiced boss lines, `audio/voicelines/jobs`), one `sidejob_*.js` per job |
| UI | `hud_panel.js` + `.css` (minimap: player, route and targets always; static places only the nearest few per category), `mapview.js` (full map, legend toggles, click/right-click waypoints), `mapfilters.js` (one visibility switch per legend category, shared by the full map and the minimap), `routing.js` (GPS route for waypoints, missions and side jobs), `phonefeed.js`, `sikkomfeed.js` |
| Audio | `audio.js` (G-Music, voicelines, synthesised effects; buses for music, effects and voices), `linevoice.js` (recordings for speech bubbles, unvoiced cutscene subtitles and the rondvaart guide, `audio/voicelines/lines`), `scenariomusic.js` (race/chase loops that pause G-Music) |
| 3D | `scene3d.js` (scene, streaming, camera), `roadsurface.js` + `roadstructures3d.js` (roads; viaducts, embankments, cuttings, tunnels), `cutmask3d.js`, `terrain3d.js`, `water3d.js`, `models3d_buildings.js`, `models3d_vehicles.js`, `models3d_people.js`, `treeprops.js`, `pixelart3d.js` (shared materials), `landmarkmodels.js` (GLB landmarks) |

## Spoken lines

Every line shown as a speech bubble or subtitle has a recording, looked up
by `"<speaker>|<text>"` in a manifest (an edited line goes silent instead of
playing the wrong clip):

- `audio/voicelines/story`: story cutscenes (`missionstory.js`), the intro
  montage and the rondvaart chase. `missionstory.js` falls back to the lines
  manifest for story lines recorded there.
- `audio/voicelines/jobs`: bijbaantje bosses and Tammo/Anita's shift lines
  (`sidejobvoice.js`, `scripts/tts_sidejobs*.{mjs,py}`).
- `audio/voicelines/lines` (`linevoice.js`, `scripts/tts_lines*.{mjs,py}`):
  speech bubbles as `~m|`/`~f|` (scene3d speaks a new bubble in the voice
  that matches the ped's model), subtitles without their own recording
  (`cinematics.js` attaches them and stretches the timeline to fit; no
  speaker = `Verteller`) and the rondvaart guide (`Tammo`/`Anita`).
- `audio/npc`: the ambient Gronings phrases.

All voices go through the voice bus (Stemmen slider). They never overlap:
bubbles, voicelines and the guide share one "busy until" window in
`audio.js`, and story scenes silence the rest; skipping a cutscene stops its
voice. `node scripts/voice_coverage.mjs` lists spoken lines without a
recording per area and exits 1 if any are missing; new spoken tables are
registered in `scripts/voicelines_collect.mjs`. To fill the gaps:
`node scripts/tts_lines_list.mjs && python3 scripts/tts_lines.py` (Gemini
TTS via OpenRouter, key in `.env`; clips are trimmed and normalised to
-18 LUFS, the level of the story lines; the run stops at `--budget`).

## Heights

Groningen is flat and so is the world (y = 0), except the ringweg and its
grade-separated junctions: roads carrying `z` (one height per vertex, from
`scripts/add_elevation.py`) run over viaducts and embankments or through
the sunken Zuidelijke Ringweg (open cuttings and covered sections, under
the Winschoterdiep as an aqueduct). `elevation.js` builds from them, once
per map (`map.elev`):

- `map.groundHeightAt(x, y, zHint)`: the highest surface at most ~1.1 m
  above `zHint` - road decks, cutting floors, embankment slopes, else the
  street. Everything that has a height keeps its own absolute value and
  passes it as the hint: vehicles `v.z` (+ `v.pitch`/`v.roll` from the
  surface, falling off an edge or cresting a ramp fast goes ballistic, hard
  landings damage; `susPitch`/`susRoll`/`susHeave` are the drawn-only body
  springs), the player and companion `gz`
  (plus the jump height `z`; drops hurt), pedestrians `gz`, ragdolls.
- Walls: retaining walls of cuttings (solid from inside, with a fence solid
  from the street), crash barriers on raised roads, abutments where an
  embankment meets a road passing underneath. `resolveWalker(..., z)` and
  `resolveVehicleBuildingCollision` use them.
- `map.ceilingAt` (tunnel roofs, decks: the follow camera stays under them),
  `map.coveredAt` (the canal above the aqueduct is not water down there),
  `map.offStreetLevel` (no clutter, lamps, trees or spawns on the ring's
  heights), `map.spawnZ`.
- The open cuts as a mask texture (`cutmask3d.js`): terrain, canal bed and
  grass discard fragments over them near the player; streets and rails
  crossing a cutting get a deck.

Nothing else needs to know about heights: vehicles on different levels
don't collide, and actors are drawn at their height.

## 3D notes

- `scene3d.js` only reads `world`. It streams buildings, roads, green, water
  and trees in and out around the player (`DRAW_DIST`, `UNLOAD_DIST`).
- Building meshes are cached per building and reuse shared materials, so
  they are never disposed. Actors and effects dispose their geometry and
  materials on despawn, except materials listed in `SHARED_MATERIALS`.
- Facade details (window rows, trims, doors, gable roofs) follow the real
  footprint via `outwardEdges`; gables are only added to near-rectangular
  footprints.
- The terrain is one grid mesh with triangles cut out over water, at
  `y ≈ -0.05`. Water sits at `WATER_Y = -1.1` above an opaque canal bed.
- Custom `ShaderMaterial`s must include `<colorspace_fragment>`, because the
  renderer outputs sRGB.
- Landmark GLB models live in `game/models/`. `landmarkmodels.js` normalises
  each one to its real height, and it replaces the procedural building once
  loaded.
- `game/mapextras.json` (`scripts/add_map_extras.py`) is merged by
  `loadMap` before the `GameMap` is built: OSM busways (`road.busOnly`) and
  bus lanes (`road.busLane = {fwd, bwd}`), footprints and heights missing
  from the city-core cache (Grote Markt, UMCG), per-building patches (the
  EIKEA landmark) and gas stations (`meta.fuel`). It lives outside
  citymap.json so the big file stays untouched.
- The follow camera orbits at `ORBIT_RADIUS` and keeps `CAM_CLEARANCE` from
  nearby buildings, which must stay larger than the 0.5 m near plane.

## Hitches and shader warm-up

- Every lit material has two program variants (night-light rig on/off).
  `scene3d.js` scans a slice of the scene per frame, compiles the unused
  variant through `KHR_parallel_shader_compile` (`renderer.compile` only
  starts the link) and draws the stand-ins once the programs report ready.
  Hidden objects are warmed for both variants.
- From the title screen on, one sample of every actor and effect that
  spawns later (all traffic models, police, wrecks, boats, people, animals,
  fire, explosions, splashes) is built one per frame and warmed the same
  way, and the fx/gore/gun pools exist before the game starts.
- `renderer.debug.checkShaderErrors` is off (the log fetch is a sync point);
  `?shaderdebug` turns it back on.
- Streaming is budgeted: new vehicle meshes (3 ms, one per frame beyond
  45 m), street-prop cells (one generate or build per frame), grass chunks.
  Particle pools only upload their buffers while something is alive.
- `?hitch` (desktop: `--hitch`) enables `hitchprobe.js`: per-section frame
  timings, time spent in blocking GL calls, new shader programs and their
  owners, large buffer uploads; read `window.__hitch.summary()`. The desktop
  app's `--perf-script=<file>` runs a script in the page after starting a
  game and logs its result; `console.log('[capture] name')` from it saves a
  screenshot.

## Story

The story "Alles voor één eierbal" (docs/verhaal-voorstel.md) is data plus
a director:

- `storyarc.js`: `STEPS`, every main mission (H1-H18) and the guided
  activities in between, in play order, with `PARTS` (kop, romp, staart).
  A step is available when `built` and its part is `open`; the story stops
  at the first unavailable step and shows that part's "Wordt vervolgd" card.
  `MISSION_IDS` maps story mission ids to `missions.js` def indices (saves
  and medal records use those indices: only append). `computeMoneyTimeline`
  is the worst-case money over the whole arc.
- `story.js`: finds the current step (done = finished/skipped, a passed
  mission, or an activity made moot by a later passed mission; that also
  migrates pre-0.5 saves). It publishes `world.storyGuide` (routing.js uses
  it after the player's own waypoint, a side job and an active mission),
  sends the step's phone line, pays a one-time voorschot when the player is
  short for a required purchase, waits for the night at a garage, offers
  "Sla deze missie over" (O, or the pause menu Missies tab) after a failed
  mission and for any activity, and saves under `story` in the savegame.
  `missions.js` reports back through `setMissionHooks` (passed, failed,
  gated, waived requirements).
- Missions: requirements (`requires`: weapon, bike, car, heist, night,
  boat; also an array) gate the start. Type `stages` builds a mission from
  small objectives (board, goto, hold, garage, escape, pigeon, scene); the
  Kop's new missions H2, H4 and H6 use it. Dialogue for every mission index
  is in `missionstory.js` (`STORY`); full lines play once all story missions
  before it are done.
- Debug: `missionDebug` (missions.js) and `window.__story` (story.js: jump,
  complete, win, lose, objective, teleport, skip, timeline). `devflags.js`
  (imported first by main.js) redirects `gte-*` localStorage keys for `?dev`
  (prefixed) and `?storytest` (memory). The desktop `--story-test` switch
  saves a screenshot per `[storytest-capture]` console line and writes the
  `[storytest-done]` report.

Adding a part (e.g. the Romp): add new mission defs at the end of
`buildDefs` in missions.js and their ids at the end of `MISSION_IDS`, add
their dialogue at the same index in `missionstory.js` `STORY`, fill in
`mission` and `built: true` on the steps in `STEPS` (activities too; new goal
types go in `GOALS` in story.js), set `PARTS.romp.open = true`, then run
`--story-test`.
