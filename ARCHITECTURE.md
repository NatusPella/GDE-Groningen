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
| Combat and police | `combat.js`, `police.js` |
| Traffic | `trafficlights.js` (conflict-free phases per axis, protected lefts or split phasing, Groningen all-bikes phase), `junctions.js` (priority classes, extra signals at busy main-road crossings, give-way arms for haaientanden and B6 signs), `trafficfleet.js` (vehicle kinds per wijk stereotype), `emergency.js` (ambulance calls, player siren on L, traffic yields) |
| Game systems | `missions.js`, `garages.js` (Garage Knalpot workshops and Pomp & Poets stations: roller door, R menu for repair, paint, upgrades and wrecks; Henk's phone call), `shops.js` (the only source of weapons, ammo and armour; food restores health), `horeca.js`, `flitspaal.js`, `trafficlights.js`, `weather.js`, `skyprops.js`, `pigeonspots.js` + `pigeonmode.js` (word een duif) |
| Bijbaantjes | `sidejobs.js` (start points, shifts, pay, levels; publishes `world.sideJob` for HUD, map and routing), `sidejobkit.js` (shared helpers), one `sidejob_*.js` per job |
| UI | `hud_panel.js` + `.css` (minimap: player, route and targets always; static places only the nearest few per category), `mapview.js` (full map, legend toggles, click/right-click waypoints), `mapfilters.js` (one visibility switch per legend category, shared by the full map and the minimap), `routing.js` (GPS route for waypoints, missions and side jobs), `phonefeed.js`, `sikkomfeed.js` |
| Audio | `audio.js` (G-Music, voicelines, synthesised effects; buses for music, effects and voices), `scenariomusic.js` (race/chase loops that pause G-Music) |
| 3D | `scene3d.js` (scene, streaming, camera), `roadsurface.js` + `roadstructures3d.js` (roads; viaducts, embankments, cuttings, tunnels), `cutmask3d.js`, `terrain3d.js`, `water3d.js`, `models3d_buildings.js`, `models3d_vehicles.js`, `models3d_people.js`, `treeprops.js`, `pixelart3d.js` (shared materials), `landmarkmodels.js` (GLB landmarks) |

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
