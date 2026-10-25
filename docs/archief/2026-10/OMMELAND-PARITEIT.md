> **Archief (oktober 2026).** Dit document is vervangen door .specs-fire/standards/wereld.md.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Ommeland parity with the city

> Historisch (stand 0.34): de gebouwen, wegen, dorpen en skyline van het oude Ommeland (`realmap`, `countryvillage`, de weg- en gebouwlagen van `countryreal`, `countryedge` en `countryside`, `countryroute`) zijn door tegels vervangen (issue #3, ontwerp in [PROVINCIE-PLAN.md](PROVINCIE-PLAN.md), §2.28); wat van `countryreal`, `countryedge`, `countrybake` en `ommeland.json`/`.bin` overblijft is het oude waterveld, het bebouwingsmasker, plaatsen, kerken en stations. De "open" punten voor die lagen worden niet meer opgepakt, `country_props_audit.mjs` en het bruggendeel van `country_vehicles_test.mjs` zijn weg.

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

## Detailniveau (visuals: city vs Ommeland)

Measured with `zsh scripts/perf/detail.sh <name>` (staged desktop build, 1600x900,
dpr 1, 14:00 clear, the player standing on a real street, same camera
framing; per area one day and one night screenshot, plus `DETAIL_ONLY=views`
for the church shots; `DETAIL_TOGGLE=1` switches `realmap.js` and the kits
on and off in one process). Counts are within 150 m: building meshes (city
generator), instanced building boxes (countryside), street furniture
(lamps, benches, bins, racks, clutter, village furniture), trees. The
machine ran at load 10-60 (other agents), so frame and GPU times are
indicative only; draw calls, triangles, materials and counts are exact.

### Before (v0.28.0 base)

| area | draw calls | triangles | materials | bld meshes | bld boxes | furniture | lamps | trees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Grote Markt | 297 | 855k | 94 | 142 | 1 | 1071 | 74 | 74 |
| Bergstraat (city street) | 632 | 731k | 163 | 337 | 0 | 141 | 83 | 1 |
| Ten Boer | 215 | 506k | 80 | 0 | 165 | 18 | 14 | 0 |
| Zuidhorn | 224 | 1024k | 71 | 0 | 149 | 0 | 0 | 34 |
| Haren | 146 | 488k | 76 | 0 | 162 | 49 | 28 | 0 |
| Winsum | 257 | 1262k | 90 | 0 | 171 | 46 | 43 | 28 |
| Bedum | 237 | 876k | 70 | 0 | 165 | 17 | 17 | 18 |

(The city's lamps are 0 in the Grote Markt / Bergstraat "before" rows only
because the lamp mesh was not tagged yet; the real count is the "after" one.)

### After

| area | draw calls | triangles | materials | bld meshes | bld boxes | furniture | lamps | trees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Grote Markt | 296 | 865k | 101 | 142 | 1 | 1145 | 74 | 74 |
| Bergstraat | 631 | 733k | 174 | 337 | 0 | 224 | 83 | 1 |
| Ten Boer | 386 | 550k | 109 | 142 | 23 | 141 | 36 | 33 |
| Zuidhorn | 339 | 1097k | 103 | 133 | 16 | 136 | 33 | 68 |
| Haren | 326 | 545k | 107 | 140 | 22 | 197 | 41 | 9 |
| Winsum | 497 | 1316k | 117 | 159 | 12 | 119 | 46 | 60 |
| Bedum | 427 | 934k | 101 | 153 | 12 | 110 | 36 | 72 |

Reading: a village street within 150 m now has the city's number of
building meshes (130-160 against 140 and 340 in town), 110-200 pieces of
street furniture (city: 140-1150) and 33-46 lamps (city 74-83); the instanced
boxes that remain are what lies past the detail radius or that keeps its
countryside model (barns, polder farmhouses, churches). Village draw calls
went from 146-257 to 326-497 (the city street has 631), at night the village
streets are lit by the same lamps and light pools as the city's.

### Fixed

| # | Difference | Status |
|---|---|---|
| 1 | Village houses, rows, blocks and sheds were instanced boxes with a shader-painted facade (no frames, sills, doors, canopies, chimneys, dormers, shopfront depth) | fixed: `realmap.js` hands the built-up houses to `models3d_buildings.js` (the city's generator) from their OSM box, colours snapped to the city palette; same detail radius, batching and facade-detail levels as the city |
| 2 | Village streets were painted on the ground (no kerbs, pavement, markings, junction joints) | fixed: built-up road runs are city roads (`roadsurface.js` per-network, `r.net`): carriageway, kerbs, pavements, markings, klinker surfaces |
| 3 | Street furniture: 2 lamps per village stretch, a brink with a bench | fixed: nightlights3d.js lamps with light pools and the real light pool, cityprops.js benches, bins, racks, kliko's, bollards, planters, bikes on the village streets (`map.centreDist`: a village counts as a centre); the village layer keeps its own brink, shopfronts and people |
| 4 | Trees: lanes along country roads only, no street trees | fixed: street trees along built-up streets (about 2/3 of the streets, a side or both), solid via treeprops.js, same crowns as the city's |
| 5 | Box LOD at 300 m vs the city's 140 m | consistent: within 140 m (160 m with prefetch) the city generator; the countryside boxes stay as the mid and far tier (gable ends within 300 m, closed roof beyond) and hide the box of what is drawn in full |
| 6 | Churches: 4 generic templates | fixed: landmark kits (below) |
| 7 | Night windows | same shader family; lit windows now also on the generator-built houses (city interior glass) |

### Landmark kits (LK1)

Module-independent of the countryside code (`landmarkkit.js`: OSM data in,
low-poly geometry per LOD out; `landmarklayer3d.js` draws any list;
`ommelandlandmarks.js` is the only adapter): the F1 world builder can call
`landmarkParams` and `createLandmarkLayer` for every place. Data:
`game/landmarkkits.json` (302 candidates: 167 churches, 46 mills, 52
towers, 12 borgen, 21 museums), made by `scripts/add_landmark_kits.py`
(one cached Overpass query). Rules: medieval (before 1600 or untagged
and not catholic or post-war): saddle-roof tower, ridge turret, needle or
spire, apse or three-sided choir, round or pointed windows, a wierde with
churchyard wall for part of them; catholic names: a spire and buttresses;
post-war names or build year: a hall with a slim open bell tower; synagogue
and small chapels: a hall; mills: stellingmolen, grondzeiler, windmotor
with turning sails; bell towers and lookouts; borgen with stepped gables
and a stair tower. OSM `height` is used as the top of the crown.
Hand-tuned looks (`LANDMARK_LOOKS`): Bedum Walfriduskerk (leaning tower),
Garmerwolde (tower, choir, roofless nave), Haren Nicolaaskerk and Witte
Kerkje, Ten Boer Kloosterkerk, Winsum Torenkerk, Zuidhorn Sebastiaan/Fabius,
Aduard abdijkerk. LOD: full detail within 320 m, masses per km cell to
1.1 km, one skyline mesh beyond (haze capped, towers stay visible on the
horizon). Night: floodlit church and tower until midnight, lit clock
faces and door lamps, mills dark. Test: `node scripts/landmark_kits_test.mjs`
(every candidate, every level, triangle budgets 16k / 4k / 900, heights).

| village | landmark (church unless noted) |
|---|---|
| Bedum | Walfriduskerk: leaning saddle-roof tower on a wierde; Martyriakerk, post-war and catholic churches from rules |
| Garmerwolde | Kerk van Garmerwolde: tower and choir with a ruin nave |
| Haren | Nicolaaskerk (wierde, tower), Witte Kerkje (white, ridge turret), 5 others from rules |
| Ten Boer | Kloosterkerk (three-sided choir, ridge turret, pointed windows), Gereformeerde Kerk (post-war rule) |
| Winsum | Torenkerk (saddle roof tower), De Vriendschap mill, 3 other churches |
| Zuidhorn | Sebastiaan/Fabius (spire), Sint Jozefkerk (catholic rule), De Rank (post-war rule) |
| elsewhere | every one of the 167 OSM churches, 46 mills, 52 bell towers and lookouts and 12 borgen in the data |

### Performance (fps / frame time)

`scripts/perf/run.sh` routes (foot city, heli, village by heli), interleaved
A (v0.28.0 base) / B (this branch), 1920x1080, dpr 1, at load 7-11 (not
quiet; GPU-bound at 33-50 ms on this machine in the heli and village
routes, both builds): foot city 29.7 / 31.2 ms, heli 22.4 / 23.4 ms, village
22.2 / 24.0 ms (frame; main-thread cpu 26.9 / 28.4, 12.1 / 14.0, 12.1 / 16.7 ms).
City draw calls and triangles are unchanged (606 / 587 calls, 867k / 862k
triangles); the village route has 254 / 368 calls. The extra main-thread
time is the streaming of generator buildings and cells; the village
frame time (24.0 ms) stays below the city's (31.2 ms, measured in the same
run), but the village main-thread cost rose 38% (12.1 to 16.7 ms): the thing
to watch in the unified pipeline (move the building and road builds of
`realmap.js` to the geometry worker).

### What carries over to the unified tile pipeline

- `landmarkkit.js`, `landmarklayer3d.js`, `landmarkkits.json` and the
  script: independent of both worlds; per tile in the F1 builder.
- `realmap.js`: a stop-gap adapter (built-up runs from `urbanWeight`,
  buildings from boxes). In the unified world the same generators read real
  footprints from the tiles; `roadsurface.js` per-network state (`r.net`),
  `models3d_buildings.js` `b.map`, and `cityprops.js` `centreDist` already
  take their map from the item.
- `scripts/perf/detail.*`: the measurement stays valid for any world.
