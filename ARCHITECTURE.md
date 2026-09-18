# GTA Groningen — architecture contract

Top-down 2D GTA1-style game. Real Groningen street/building data (from OSM)
projected to meters, rendered on a single `<canvas>` with vanilla JS ES
modules — no build step, no bundler, no npm deps. Everything loads straight
in the browser via `<script type="module" src="js/main.js">`.

World units = meters. `x` = east, `y` = south (canvas-down). Angles are
radians, `0` = facing +x (east), increasing clockwise (since +y is down).

## Files that already exist (read them for exact signatures — this doc is a
## summary, the code is ground truth)

- `game/js/util2.js` — math helpers: `clamp`, `lerp`, `dist`, `closestPointOnSegment`,
  `pointInPolygon`, `polygonBounds`, `normalizeAngle`, `SeededRng`.
- `game/js/mapdata2.js` — `GameMap` class wrapping the loaded `citymap.json`
  (roads/buildings/water/green polygons, each with a precomputed grid index).
  Key methods: `buildingsNear(x,y,r)`, `roadsNear(x,y,r)`, `waterNear(x,y,r)`,
  `greenNear(x,y,r)`, `queryView(minx,miny,maxx,maxy)`, `nearestRoadPoint(x,y)`.
  Buildings: `{pts:[[x,y],...] (closed ring), h (levels), name}`. Roads:
  `{pts:[[x,y],...], type, cat ('major'|'normal'|'minor'|'foot'), width (m),
  speed (m/s cruise speed), oneway, name}`.
- `game/js/camera2.js` — `Camera{x,y,zoom (px/m),w,h}`, `worldToScreen`,
  `screenToWorld`, `viewBounds(margin)`.
- `game/js/input2.js` — `Input{isDown(key), wasPressed(key) (edge-triggered,
  cleared every frame by main.js calling input.endFrame()), axis() -> [x,y]
  from WASD/arrows, mouse:{x,y (canvas-space pixels),down,rightDown,wheel}}`.
- `game/js/render2.js` — `applyCameraTransform(ctx,camera)` (sets the canvas
  transform so subsequent draws use raw world-meter coordinates),
  `drawGround`, `drawGreen`, `drawWater`, `drawRoads`, `drawBuildings`.
- `game/js/world2.js` — `World` class, the single shared mutable state object
  (see below), and `respawnPlayer(world, {busted, moneyPenalty})`.
- `game/js/vehicle2.js` — `Vehicle` class (`x,y,angle,speed,model{len,wid,
  maxSpeed,accel,brake,turnRate,color},health,wrecked,driver,isPolice`),
  `spawnVehicleOnRoad(map, road, isPolice, rng)`, `findNearestVehicle(x,y,
  vehicles,maxDist)`, `resolveVehicleBuildingCollision(v,map)`,
  `updateTrafficAI(v,dt,map,world,rng)`, `drawVehicle(ctx,v)`,
  `vehicleCorners(v)`.
- `game/js/player2.js` — `Player` class (`x,y,angle,radius,inVehicle`),
  `player.update(dt, world)` (reads `world.input/map/vehicles`, handles
  on-foot movement + collision + enter/exit vehicles on 'e'/'f'), and the
  exported `resolveBuildingCollisions(x,y,radius,map) -> [x,y]` helper (push
  a circle out of any building it overlaps — reuse this, don't reimplement).
- `game/js/main2.js` — boot + the render/update game loop. Currently wires up
  map, camera, input, player, traffic vehicles. **You do not need to edit
  this file** — write your module so `main.js` can import 1-3 functions from
  it; the integrator (a human, already familiar with this codebase) will
  wire the import + call sites into the loop afterward. Still, feel free to
  note in your summary exactly where in the frame you expect to be called
  (e.g. "after player.update, before camera.follow").

## The shared `World` object

```js
world.map          // GameMap
world.camera        // Camera
world.input         // Input
world.player        // Player (on-foot / driving state)
world.vehicles       // Vehicle[] — traffic + player's car when driving
world.pedestrians    // [] — empty today; pedestrians.js owns this array
world.bullets        // [] — empty today; combat.js owns this array
world.particles      // [] — empty today; combat.js/anyone may push visual fx
world.wanted         // 0-5 int, ANY system may increase it directly
                      // (world.wanted = Math.min(5, world.wanted+1)).
                      // police.js owns decay-over-time + spawning; nobody
                      // else should decrease it.
world.wantedDecayTimer // scratch field for police.js's own bookkeeping
world.money          // int, anyone may add/subtract
world.health         // 0-100, player HP
world.armor          // 0-100, absorbs damage before health
world.weapon         // current weapon key, owned by combat.js
world.ammo           // {weaponKey: count}, owned by combat.js
world.mission        // null | {type,label,timeLeft,...} — owned by missions.js,
                      // read-only for hud.js
world.stats          // {kills,pedKills,copKills,missionsDone} — combat.js
                      // increments kills on any kill; missions.js reads these
                      // for kill-count objectives and increments missionsDone
world.spawnPoint      // {x,y} — where respawnPlayer() sends the player back to
world.time           // seconds since boot, incremented by main.js every frame
world.addMessage(text, duration=3) // push a HUD toast
```

Rule of thumb to avoid circular imports: modules talk to each other **only**
through plain fields on `world`, never by importing each other directly,
except where explicitly noted below (e.g. police.js may import Vehicle/
spawnVehicleOnRoad from vehicle.js — that's a existing, one-directional dep).

## Rendering convention

Inside the main loop, `ctx` is put into world-space mode via
`applyCameraTransform(ctx, camera)` — every `draw*(ctx, ...)` function for
world content (buildings, vehicles, pedestrians, bullets, mission blips)
assumes `ctx` is already in that mode and just draws using raw meter
coordinates (e.g. `ctx.arc(ped.x, ped.y, ped.radius, 0, Math.PI*2)`).

HUD/minimap is different: it either (a) uses its own DOM elements appended
under `document.getElementById('hud')` (a `position:fixed;inset:0;pointer-
events:none` overlay div that already exists in `index.html`), styled via a
`<style>` tag hud.js injects or a `game/js/hud.css` it links itself, or (b) a
separate `<canvas>` it creates and appends (e.g. for the minimap), with its
own independent 2D context and transform — do not touch the main canvas'
transform from hud.js.

## Module specs to build (one file each, independent of one another)

### 1. `game/js/pedestrians2.js`
- `class Pedestrian { x, y, angle, speed, radius (~0.3), state: 'wander'|
  'flee'|'dead', health (~30), isCop: false, deadUntil }`
- `spawnPedestriansNear(map, x, y, count, rng=Math.random)` — place `count`
  peds within roughly 60m of `(x,y)`, snapped near roads/plazas (reuse
  `map.nearestRoadPoint` or `map.roadsNear` + a small perpendicular offset,
  like vehicles do in `spawnVehicleOnRoad`), rejecting spots inside a
  building (`pointInPolygon` from util.js against `map.buildingsNear`).
  Returns `Pedestrian[]`.
- `updatePedestrians(dt, world)` — wander slowly (~1.3 m/s) toward
  occasional random nearby waypoints, using `resolveBuildingCollisions` from
  `player.js` for wall avoidance (same circle-vs-polygon helper the player
  uses). Peds within a few meters of the player when `world.weapon !==
  'fists'` and the player is aiming (mouse down or just proximity — your
  call) should flip to `'flee'` state and run away from the player. Dead
  peds (`state==='dead'`) should just sit for a couple seconds
  (`deadUntil`) then be removed from `world.pedestrians`.
  **Do not implement damage/kill logic here** — combat.js's bullet/vehicle
  collision code will set `state='dead'`/`health` directly on the Pedestrian
  objects living in `world.pedestrians`; you only need to *react* to
  `state==='dead'` in your update loop (stop moving, expire after a timer).
  Also: if a fast-moving vehicle's bounding circle overlaps a pedestrian,
  that's YOUR call to detect and handle (kill the ped, `world.wanted =
  Math.min(5, world.wanted+1)`, `world.stats.pedKills++`), since combat.js
  only owns bullets, not vehicle-vs-ped contact.
- `drawPedestrians(ctx, world)` — simple top-down blob (circle body + small
  direction wedge is fine, doesn't need to be fancy), red-ish tint while
  fleeing, gray/slumped when dead.
- Spawn density: expect ~40-60 peds to exist near the player at once in the
  final game — but since you only write `spawnPedestriansNear` +
  `updatePedestrians`/`drawPedestrians`, you don't need to solve "keep peds
  near the player as they roam the whole city" — just implement the
  functions; the integrator will decide when/how often to call
  `spawnPedestriansNear` (e.g. periodically near the camera) and prune far
  ones.

### 2. `game/js/combat2.js`
Classic GTA1 weapon set: fists, pistol, uzi (fast/low-damage), shotgun
(short range/high damage, spread). Exports:
- `WEAPONS` — object keyed by name: `{fists:{damage,range,cooldown,ammo:
  Infinity}, pistol:{...,maxAmmo}, uzi:{...}, shotgun:{...}}`. Pick your own
  reasonable numbers (arcade feel, not realistic ballistics).
- `updateCombat(dt, world)` — reads `world.input` for weapon switching
  (number keys `1`-`4`, say: 1=fists,2=pistol,3=uzi,4=shotgun — only usable
  if `world.ammo[weapon] > 0` or infinite) and firing (`mouse.down`). Aim
  direction = from `world.player` toward `world.camera.screenToWorld(mouse.x,
  mouse.y)`. On fire: fists = short melee arc check against
  `world.pedestrians`/nearby `world.vehicles` (small damage, mostly for
  clearing peds cheaply); guns = spawn a bullet object into `world.bullets`:
  `{x,y,vx,vy,damage,owner:'player',range,traveled:0}`. Decrement
  `world.ammo[weapon]`.
- `updateBullets(dt, world)` — the **single** place that moves and collides
  ALL bullets in `world.bullets`, regardless of `owner` (so `police.js` can
  push `owner:'police'` bullets into the same array and get collision for
  free). Move each bullet, check against `world.pedestrians` (skip if
  `owner==='police'`&&ped.isCop), `world.vehicles` (reduce `v.health`, mark
  `v.wrecked=true` + stop it at `<=0`), buildings (`map.buildingsNear` +
  `pointInPolygon` — stop the bullet, small spark particle), and — only for
  `owner!=='player'` — the player himself (`world.health`/`world.armor` via
  a local damage helper, calling `respawnPlayer(world)` from `world.js` if
  health hits 0). On a kill: `world.stats.kills++`, and if the target was a
  civilian ped, `world.stats.pedKills++` + `world.wanted = min(5,+1)`; if it
  was a cop/police vehicle, `world.stats.copKills++` + bigger wanted bump.
  Remove expired/spent bullets (`traveled > range`).
- `drawCombat(ctx, world)` — draw bullets (small line/dot) and a brief
  muzzle-flash / melee-swing effect (use `world.particles` if you want, or
  your own local array — your call, just don't rename `world.bullets`).

### 3. `game/js/police2.js`
- `updatePolice(dt, world)`:
  - Wanted decay: if no new stars were added recently (track via
    `world.wantedDecayTimer`, e.g. reset it to 0 whenever you notice
    `world.wanted` increased since your last check, otherwise count up; past
    ~20s of no new crime, drop 1 star and reset the timer), down to 0.
  - Maintain a pool of police `Vehicle`s (reuse `spawnVehicleOnRoad(map,
    road, true, rng)` from `vehicle.js` — it already sets `isPolice:true`
    and a black-and-white color/model). Target count scales with
    `world.wanted` (e.g. 0 stars → 0-1 idle patrol cars, 5 stars → 6+
    actively chasing). Spawn them on roads near-ish the player but out of
    immediate view (e.g. 60-120m away), despawn ones that fall far behind.
  - Chase behavior: when `world.wanted > 0`, override police vehicles'
    normal `updateTrafficAI` road-following with a simple pursuit steer
    (angle toward the player, throttle proportional to distance, still call
    `resolveVehicleBuildingCollision` so they don't drive through walls).
    When `world.wanted === 0`, they can just use the normal
    `updateTrafficAI` (regular traffic behavior).
  - At `world.wanted >= 3`, let chasing cops occasionally fire at the player
    similarly to `combat.js`'s bullets — push `{x,y,vx,vy,damage,
    owner:'police',range,traveled:0}` into `world.bullets` (combat.js's
    `updateBullets` will move/collide them — this is the one place you DO
    reach into another module's array, by design, see the contract above).
  - Busted: if a police vehicle's bounding circle touches the player while
    `world.wanted > 0` and the player isn't already fleeing at high speed in
    a vehicle (your call on the exact threshold), call `respawnPlayer(world,
    {busted:true, moneyPenalty: someAmountBasedOnWanted})` (import from
    `world.js`).
- No foot police in this pass — police presence is cars only.

### 4. `game/js/missions2.js`
- `initMissions(world)` — set up a short chain of 3-4 simple GTA1-style
  missions anchored near `world.spawnPoint` (walking/driving distance):
  e.g. (a) "Steal a car and deliver it to marker X" (drive a
  `world.vehicles` entry — or spawn one yourself at the mission start — to a
  destination point within a time limit), (b) "Wasted N pedestrians in
  time T" using `world.stats.pedKills` deltas, (c) "Checkpoint race" through
  3-4 waypoints against a timer. Store mission definitions + current index
  in your own module-level state or on `world.mission`.
- `updateMissions(dt, world)` — checks the active mission's trigger
  (proximity to a start marker, or auto-start next mission after a delay),
  ticks `world.mission.timeLeft`, checks win/fail conditions, on success
  awards `world.money`, `world.stats.missionsDone++`, `world.addMessage(...)`,
  advances to the next mission; on failure/timeout, message + retry same
  mission after a short cooldown.
- `drawMissions(ctx, world)` — draw active markers as a simple pulsing
  circle/cylinder at their world x/y (checkpoint markers, destination
  markers), plus maybe a thin directional line/arrow from the player toward
  the current objective.

### 5. `game/js/hud_panel.js`
- `initHud(world)` — build whatever DOM you need under the existing
  `<div id="hud">` (already `position:fixed;inset:0;pointer-events:none` in
  `index.html`) — health/armor bars, wanted stars (0-5), money, current
  weapon+ammo, mission name/timer, a toast area for `world.messages`. Also
  create your own small `<canvas>` (e.g. `160x160`, `border-radius:50%`) for
  the minimap, appended wherever you like (bottom-right is classic GTA1).
- `updateHud(dt, world)` — refresh all of the above from `world` fields each
  frame, expire toasts whose `until < world.time`, and redraw the minimap:
  a scaled-down top-down view centered on `world.player` (roads/buildings
  from `world.map.queryView(...)` at a small scale, e.g. 4-6 px per 10m, or
  simplified colored dots — your call on fidelity vs. perf), a player arrow,
  red dots for nearby `world.vehicles` where `isPolice && driver`, and
  markers for `world.mission`'s objective if any.
- Keep this file framework-free (raw DOM APIs), matching the rest of the
  codebase.

## Style
Vanilla JS, ES modules, no comments except where something is genuinely
non-obvious (a workaround, a subtle invariant) — no restating what the code
does. Match the existing files' formatting.
