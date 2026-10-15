# Ommeland parity with the city

The Ommeland (countryside around the city) was built later and took shortcuts.
This lists where it behaved differently from the city for no design reason, and
what was done. Status: **fixed**, **deliberate** (a design choice, kept) or
**open** (a known difference, not touched and why).

Checked by: `scripts/country_route_test.mjs` (GPS, drives every road),
`scripts/country_camera_test.mjs` (camera ray and trunks), `scripts/country_vehicles_test.mjs`,
`scripts/country_props_audit.mjs`, `scripts/controls_test.mjs` (`country_vehicles_test.mjs` also
checks parked cars never overlap, the meadow drag for AI and player, the one
water rule, the bridge decks and railings, and police chasing a player parked in
the fields at three spots), plus a headless
Electron drive (a car at 40 m/s over an Ommeland road, 20 vehicle models, Q held;
a car into a barn).

## Look-back (Q / stick press / middle mouse)

`lookBackActive` and `chaseFollowLerp` (controls.js, scene3d.js `update3D`) take
no branch for the Ommeland: on an open Ommeland road the camera cuts to 5-11 m
ahead of the car and stays rigid at 40 m/s for every vehicle model, exactly like
the city. The difference found is the camera's collision: its eye-to-camera ray
only tested city building meshes, city trees and city props, so out in the
Ommeland a camera ahead of (or behind) the car went straight through barns, real
buildings, silos, village furniture and tree trunks. Now `countrycam.js`
`countryRayHit` samples the ray against the same solids vehicles and walkers
collide with, and the camera is pulled in like in town. The cause the user saw
could not be reproduced on an open road; this is the Ommeland-only difference
that fits (the look-back camera sits ahead of the car, where the barns and trunks
are).

## GPS

| # | Difference | Status |
|---|---|---|
| 1 | Roads flagged `cycle` (a car road with a painted cycle lane, 256 secondary and tertiary roads) were dropped from the route graph, so a car on one had nothing to snap to and the GPS locked onto another road | fixed (countryroute.js) |
| 2 | "In the city" was a city street within 150 m, so a car on an Ommeland road inside the city bounds (Meerstad, the ring's carriageways, roads along the edge) got a route from a street 100 m away | fixed: a point is in the city only when no country road is nearer (routing.js `inCity`) |
| 3 | A one-way ramp the city map cuts off at its edge left the drive router no way at all: the route was empty for every target, even the city centre | fixed: last resort `free` mode (one-ways ignored) |
| 4 | The country graph ignored one-ways (2169 roads, the A7 carriageways, roundabouts) | fixed: directed edges, costs forward from the player and backward to the target; walking and biking ignore one-ways like the city's walk graph, and a car whose one-way leads into a dead end (a ramp cut at the data's edge: 72 roads) gets the one-ways ignored as a last resort instead of no route |
| 5 | No simulation | `country_route_test.mjs` drives every Ommeland road (10310) and 400 polder roads in both directions at 20 m/s: the route must exist, start at the car, stay within 25 m (4 s grace for a missed turn), no reroute while following its own road; cycle-lane roads must be in the graph; no route starts against a one-way. Before: 266 roads failed (255 inside the city bounds), 152 lane roads missing from the graph. After: 0 |
| 6 | Village streets and polder roads drawn by the ground shader | polder roads are in the graph and tested; village streets are real roads (`REAL.roads`) |

## Vehicle physics and collision

| # | City | Ommeland (before) | Status |
|---|---|---|---|
| 1 | Vehicle vs walls: body corners, impulse, spin, damage, impact sound/shake/wanted (`resolveVehicleBuildingCollision`) | one circle push of the centre point, player's vehicle only: a bus poked 5 m into a barn, no damage or sound; AI and racers drove through | fixed: the corner probes test the countryplan solids (real buildings, farms, silos, village colliders, turbines, pylons) and trunks in the same function |
| 2 | Trees solid for walkers and vehicles | trunks (poplar lanes, road oaks, willows) not solid | fixed: per loaded tile (`countrywalls.js` `setTileTrunks`), for vehicles, the player and every walker (`collision.js`) |
| 3 | Camera ray vs buildings, trees, props | blind to Ommeland solids | fixed (see look-back) |
| 4 | An AI driver is pulled out when the car is stolen / shot (`v.road`) | Ommeland road users have `countryDrive`, not `road`: no "auto gejat", no driver bailing out | fixed (player.js, vehicle.js, pedestrians.js) |
| 5 | Surface for grip and sound: asphalt on the paving | farm yard paving counted as grass for grip but hard for the drag | fixed: `surfaceUnder` uses `onFarmPaving` like `groundAt` |
| 6 | "Vastgelopen? Zet me vrij" puts you on the nearest street | out in the Ommeland it moved you to a city street kilometres away or back to a landmark | fixed: nearest real road (safety.js) |
| 7 | Loading a save respawns the hero car near you | out in the Ommeland the old hero car was deleted and no new one spawned | fixed: the old one stays unless a new one is placed (savegame.js) |
| 8 | Additive night decals are fog-free (`nightlights3d.js`) | `countryglow.js` pools tinted towards the fog colour | fixed |
| 9 | Hedges and fences (props) stop cars | hedges and wire fences are low walls you vault; vehicles drive through (countrywalls.js header) | deliberate, kept: the fences already open at every gate and farm lane (countryside.js `genFieldEdges`), but nearly every pasture is fenced, so solid fences would wall the polder into pens and take away driving across the fields (the meadow drag already slows it). Like the city's breakable props they would need a break speed, which is a new subsystem, not a consistency fix. Walkers are held by them now (see 15) |
| 10 | Grass drag and wobble for any driver | `countryside.js gameplay()` caps speed and wobbles only the player's vehicle; police cross meadows at full speed | fixed: `vehicle.js offroadDrag` at the end of `applyControls` for every driver (AI, police, racers, the player), keyed on `offroadGround` (the same ground rule as before, sampled every 0.6 m); same numbers, so the player's feel is unchanged; the AI's stronger top-end pull leaves a sedan ~2 m/s faster than the player on grass |
| 11 | Water: one test (`overOpenWater`) | `wideWaterAt` (sinking) and `wideDitch` (wading) use different thresholds, a procedural maar wades at 2.5 m/s but never sinks | fixed: `countryedge.js countryWater` is the one rule for vehicles and walkers: `deep` = drawn at canal level (`wideWaterAt`, what `isInWater`/`inWaterPoly` sink and swim in), `wade` = a maar or open-water rim painted on the ground (crawl / wade), `ditch` = a dip. The procedural maaren stay `wade`: they are painted on the ground, not drawn as water, so a car sinking into them would vanish into grass |
| 12 | Bridges have railings and a deck height | Ommeland bridges are a mesh; a car one metre off the painted road sinks | fixed: a bridge deck is dry out to its railings (`deckHalf`, matching the mesh's scale), and `countryrails.js` makes the drawn railings of real and polder bridges solid: vehicle corner probes (impact, sound, damage) and walkers unless they jump over. The deck is at road level like the mesh |
| 13 | Ground height and viaducts (elevation.js) | flat zero | deliberate: the countryside is polder |
| 14 | Village furniture / world-end props pushed by `ommelandfun.js pushOut` (circle, speed x0.6 per frame) | only the player; no damage or sound | fixed: the props' circles are part of `countryplan.js pushOutOfPlan` (every walker, the camera ray) and `resolveVehicleBuildingCollision` tests them against the whole body box (impulse, impact sound, damage) for every vehicle |
| 15 | Walkers (companion, peds) vs hedges and fences | only the player is pushed out | fixed: `collision.js` holds peds, animals and the companion at hedges and fences; the player keeps the vault rule (countryside.js). The companion left behind a vaulted hedge catches up like behind a city railing (stuck, then repositioned) |

## Other systems (from the code audit, not touched)

| # | Difference | Status |
|---|---|---|
| 1 | Police: `findSpawnPoint`, roadblocks and boats use city roads only; no new units or roadblocks past ~40 m from a city road, followers drive `_direct` across fields | fixed (police.js): spawn points, roadblocks and officers on foot fall back to a country road (`realRoadNear`, past the real data the polder grid); units follow the roads with a bounded A* (`countryroute.js countryPathNear`) and pure pursuit, braking for bends; only the last stretch from the road nearest the player goes across the field, and never through water (they wait at the road instead); line of sight is blocked by real buildings; police boats come out on the open country water; a unit left out there at wanted 0 drives on along the roads. Bike and horse units stay in town (they belong to the binnenstad patrols, deliberate) |
| 2 | Ambience (`sfx/ambience.js`) reads city green/trees/water: city hum bed in open polder, no crickets or water lap | fixed: out in the Ommeland the meadows count as green, the road and hedgerow trunks as trees, the open water and maren give the lap (placed down the water's distance field), the polder is open (wind), and the city hum fades out except in a village's built-up part |
| 3 | `isEngineRunning` / engine range ignore `countryDrive` cars (idling country car silent, light meshes beyond 70 m silent) | fixed: a country road user idles like city traffic; the tractor gets the slow diesel, the quad the small single. The light meshes beyond 70 m match the city (`ENGINE_RANGE` 70 m is the conversion radius) |
| 4 | Minimap and map show no Ommeland places (dorpsuitjes, wereldeinden, eierballen) | fixed (`ommelandmap.js`, layer "Ommeland"): the uitjes of every village you have been near (ticked once done), the wereldeinden already found (the rest stays "zoek ze zelf"); the villages' eierballen join the Buukenkaas tips like the city's; villages and stations already had labels and icons |
| 5 | Country traffic is removed at once at the city edge (`active = edgeDistance > 60`), including real vehicles 20 m away | fixed (countrylife.js): back in town no new road users come, the ones about drive on and go once out of sight; a real vehicle reaching the city's edge is handed over to the city traffic AI on the street there; a road user with nowhere to go waits until hidden |
| 6 | Garage "Waar staat hij?" names a city district for a car in the Ommeland | fixed: country road and village, or "bij <village>" in the fields (`ommelandplace.js ommelandArea`, shared with the location chip); status "In het Ommeland" |
| 7 | Parked cars: `countrySlots` and `villageKerbs` can fill the same village street | fixed: `parkedcars.js slotOverlaps` (box test) keeps a kerb slot clear of every slot already in the cell |
| 8 | Fog, shadows, view distance, day/night | same code path: no difference found |
| 9 | Speed cameras, traffic lights, rural pedestrians | deliberate: none in the countryside |
