# GDE Groningen – architecture

A browser game in plain ES modules: `game/index.html` loads `js/main.js`,
and Three.js is resolved through an import map (the module also imports it
by its full CDN URL; both resolve to the same instance). There is no bundler.
The code is the source of truth; this file is the map.

## Units and coordinates

- World units are meters. `x` is east, `y` is south.
- The world frame is RD New (EPSG:28992) shifted to the old origin:
  `x = RD_x − 233670`, `y = −(RD_y − 582075)` (`js/rdnew.js`, its Python twin
  `scripts/world/rdnew.py`, bit-identical; `node scripts/rdnew_test.mjs`).
  Grid north is 0.94° off true north round Stad (`GRID_CONVERGENCE`, used
  by the sun in `daynight.js`). Up to 0.28 the frame was equirectangular
  ("legacy"); `legacyToWorld` converts from it.
- Map files carry `frame: 'rd-new'` (`stad.json` meta, `mapextras.json`);
  the loaders log an error otherwise. Hand-placed
  positions in code are written in the legacy frame through the helpers in
  `js/worldframe.js` (`P(x, y)`, `{ ...PO(x, y) }`, `P3`, `PA` for headings,
  `PL` for polylines, `PB` for boxes, `L` back to legacy for old
  axis-aligned region tests). A new coordinate is either such a helper call
  or a world-frame number. Building looks stay seeded on their legacy
  centre (`b.sd`). `node scripts/world/rebase_coords.mjs --write` bakes every
  helper call with literal numbers into the numbers it returns (and drops
  the import), once the tests are green; a branch that still writes
  positions in the legacy frame wraps them in the helpers when it merges.
- In 3D: `three.x = world.x`, `three.z = world.y`, `three.y` is up.
- Angles are radians; `0` faces +x.
- Building and terrain geometry bake absolute world coordinates into their
  vertices, so their meshes sit at the origin.
- Everything is modelled 1:1: people,
  cars, props, trees and speeds. On foot the player jogs at 3.0 m/s (a light
  stick strolls at 1.5, Shift sprints at 6.8); gravity is 9.8 for the
  player, the companion, ragdolls and vehicles alike, a jump goes ~0.6 m up.

## Shared state

`World` (`js/world.js`) is the one mutable state object every system
receives. It holds `map`, `input`, `player`, `companion`, `vehicles`,
`pedestrians`, `bullets`, `particles`, `wanted`, `money`, `health`, `armor`,
`weapon`, `ammo`, `mission`, `stats`, `time` and `messages` (recent
`world.addMessage(text, seconds, opts)` messages; they show as HUD cards,
see "Messages, phone and calls"). `respawnPlayer(world, {busted})`
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
6. Missions, Kiekdoar feed, phone feed, garages, horeca, shops, flitspalen
7. Audio, weather
8. `update3D` (renders), `updateHud`
9. `input.endFrame()`

`dt` is clamped to 0.05 s.

## Modules

| Area | Files |
|---|---|
| Map data | `mapdata.js` (`GameMap`: grid-indexed `buildingsNear`, `roadsNear`, `waterNear`, `nearestRoadPoint`, `isOnBridge`, `escapeBuilding`, `groundHeightAt`), `elevation.js` (ring road heights, walls, open cuts), `util.js` |
| Ommelanden | **One system: the tiles, the city included (#90).** `game/stad.json` is the city's 0.2 MB hand layer (meta, the 30 hand-made buildings, furniture, the city's tile set; its places (shops, horeca, garages, landmarks, traffic lights, ...) are rows of the POIS section of the tile their point lies in, `poisections.js`); its roads, rails, buildings, water, green and trees come from the OSM tile build (`stad_laag.mjs`, `stad_wegen.mjs`, `stad_spoor.mjs`; docs/ONTWIKKELEN.md "Map data"). `game/citymap.json` and the Python chain (`build_map.py`, `process_osm.py`, `add_*.py`, `lanes.py`) are gone, so older mentions of them below are history.  The old Ommeland tier (`ommeland.json` + `ommeland.bin`, `countryreal.js`, the real roads, canals and rails of `countryedge.js`, `countrybake.js`, `countryskyline.js`) is gone: the province's tiles (`tileworld.js`, built by `build_corridor.mjs` / `build_province.mjs`) hold the buildings, roads, water, rails and trees of the whole province, the 27 tiles of the south-west corner past the extract's strip are built from `data/ommeland_raw.json.gz` by `build_province.mjs` `fillOldExtent`. What the tile build also writes: `provincie-land.json` (`corridor-land.json` without the province extract), the land file of the layer, read at start by `corridorrail.js loadLandData`: the city's six train routes carried on over the real track to every station (`scripts/world/cityroutes.mjs` runs `provinceRailLines` / `extendRoutes` once, from `cityroutes_src.json`; `applyCityRoutes` splices them onto the city's routes and sets `map.countryStations` and `map.countryRails`, the track railway3d.js draws outside the city), and the wind turbines and pylons (`scripts/world/farprops.mjs`: OSM power nodes; the spans between towers are worked out) that `farprops.js` draws past the detail radius with the old skyline shader (pulled in along the view ray, hazed by true distance, rotors spun in the shader) and makes solid at their feet (`farSolidsNear`, `farPropsIn` for the maps); the places are `worldplaces.js` (`worldPlaceAt`, `worldPlaceNamed`, `nearestWorldPlace`, `worldPlaceNames`). `tileplace.js` (placement queries over the streamed tiles: `buildingAt`, `roadNear`, `boxOf`, `clearOfBuildings`, `streetAt`, `waterGap` (signed metres to the tiles' water: positive on it, negative on land); `withTiles` / `tilesIn` load the tiles round a spot first, so a spot that is fixed far from the player is placed on real data: `facilities.js` `placeWithTiles` for the shop, café and garage doors inside `DOOR_BOX` (the city's shops near its data edge and the country halts' machines step out of a building of the tiles afterwards: `shops.js prepareShopDoors`, `stationtravel.js prepareCountryStations`, run by `ommelandfun.js prepareOmmeland`) (the area round town whose doors and respawns are made at the start: `inDoorRange`; `initCountryGarages`, `initCountryHoreca`, `initCountryShops`: a few ms a frame behind the title screen, the game waits for them only when you start sooner), `dorpsuitjes.js` `prepareVillages` (a water uitje loads the whole disc its shore is searched in) and `pg_koe.js` `prepareKoeSites` in the background after the start, `cheats.js` teleports, `spotcheck.js`), `countryfield.js` (the polder generator's field layout shared by JS and the ground shader; under the province's tiles the polder blocks lose their procedural roads, maaren and villages: `provinceBlock`), `countryedge.js` (what is left of the edge: the mask of where data is, the rails the props keep clear of, `roadGap` for the polder roads, `countryWater` for the polder ditches, `edgeBlocked`: the props keep off what the tiles hold, asked of `provinceworld.js` `setExtraBlocked`), `provinceworld.js` (the polder blocks and prop rule of the tiles, `coveredByTiles`, `inProvinceData`, `urbanWeight`: the built-up share from the footprints of the houses of the tiles that are in), `countryplan.js`, `countryside.js` (the polder generator: streamed 160 m prop tiles of fields, ditches, fences, farms and animals, laid out a section per step; drawn per 2x2-tile chunk, one culled instanced mesh per prop type), `countrylife.js` (country traffic on the roads of the tiles, boats on the polder maaren, birds), `countrymap.js` (the polder grid on the maps), `countrysigns.js`, `countrywalls.js` (hedge and fence walls plus tree trunks, per loaded tile), `countrycam.js` (the chase camera's ray against the country solids; parity notes in `docs/OMMELAND-PARITEIT.md`), `countryrails.js` (the polder bridge railings as solid lines for vehicles and walkers), `ommelandmap.js` (the Ommeland layer of the map and minimap); the one water rule is waterlevels.js `waterAt` over the tiles' water polygons: `tilewatermask.js` rasterises them into two masks round the player for the ground shader, a fine one (2 m a texel, ~1 km: the ground opens over the water above a bed) and a wide one (8 m, ~4 km: the water painted flat on the ground, so the ground shows the tiles' water as far as tiles are in), the meadow drag for every driver vehicle.js `offroadDrag`, police on the country roads police.js `countryFollow` |
| Input | `input.js` (`isDown`, `wasPressed`, `axis`, `mouse`; rebound keys are translated back to the default key in one capture listener), `controls.js` (the scheme as data: rebindable keys, controller tables per situation, glyph lookup; Node-safe), `inputdevice.js` (the one active input device: kb / pad / touch, the last real input wins, also when mixed; sets `dev-*` and `data-device` on `<html>`; gamepad.js, touch.js and glyphs.js follow it, the cursor hides on a pad; `deviceFor` is pure, `inputdevice_test.mjs`), `padkeyboard.js` + `padkeyslogic.js` (on-screen keyboard for text fields on a pad: A on a field opens it, only pad-made key events are intercepted; layout, cursor and editing are pure, `padkeys_test.mjs`), `framecap.js` (setting `zuinig`: frame skipping to 30 fps, `framecap_test.mjs`), `gamepad.js` (Gamepad API polling: buttons become key events, sticks and triggers feed `input.js`; last-used device; rumble), `glyphs.js` (every keycap on screen shows the rebound key or the controller button), `a11y.js` + `a11y.css` (subtitle size and box, colour-blind palettes, controller glyph styles) |
| Player | `player.js` (movement, building collision, vehicles, jump, crouch, kiss), `companion.js` (Tammo/Tessa; `world.companionHold` parks them at a spot or in a vehicle for a mission) |
| Arcade driving | `gearbox.js` (pure, node-testable: a profile per vehicle class (car, hero, sport, van, truck, bus, tractor, three motorbikes, the geared moped) with gear tops as fractions of top speed, a position layout (cars N-1-2.., bikes 1-N-2..), idle/redline, shift time and engine braking; `stepGearbox` gives gear, revs, `torque` (a curve over the rev range, 0 on the limiter, in a shift cut, in neutral or with the clutch in), `engineBrake`, shift light and stall; `shift()` is the sequential shifter and refuses over-revving downshifts or grinds without the clutch; setting `shiftMode`: `auto` (default: the box only reports, the driving model and its 0-100 in 6-8 s are untouched), `manual` (no clutch, never stalls), `clutch` (J held to shift, can stall); vehicle.js `applyControls` creates `v.gb` for the player's geared vehicles and applies torque and engine braking in the manual modes; keys `.` and `,` (rebindable), J, bumpers and L3 on the pad (`PAD_MAPS.vehicleManual`, picked by gamepad.js when `v.gb` and a manual mode); audio.js maps `gb.rpm` onto the engine's range and hud_panel.js shows the gear row with N, shift light, limiter, KRAKEN and MOTOR AF), `drift.js` (pure: slip angle, drift scoring with a multiplier that climbs with time and direction changes, a grace period, banking and crash loss, medals), `driftzone.js` (an activity-hub entry: three big roundabouts, a run starts when a car drives in and ends on leaving, after 90 s or on a crash, medals pay once per tier, a score chip anywhere you drift; vehicle.js `applyControls` holds the arcade help: setting `driftAssist` counter-steers and keeps a slide catchable, off is realistic and can spin out; the shop's `sperdiff` makes slides last), `motomodels.js` (motorbike and geared-moped models as data, no imports), motorbikes are `isScooter` two-wheelers with `model.motorbike` (`sport`, `naked`, `old`): vehicle.js `rideMotorbike` leans them (`v.roll`, capped by `bikeAssist`), Shift pops a wheelie on the gas or a stoppie on the brake (`v.pitch`, pivot compensated in scene3d.js), a hard hit or an over-lean without the assist throws the rider like a bail-out; `models3d_vehicles.js` draws them and the classic moped with a seated, helmeted rider (`riderSeatFor`, `attachHelmet`, also used for the player's own figure); the geared moped is capped at 45 km/h and a tuned one over that builds heat (`crime.js` `tunedMoped`); `node scripts/gearbox_test.mjs`, `drift_test.mjs`, `motorbike_test.mjs`, `drive_sim.mjs` |
| Vehicles | `vehicle.js` (physics, traffic AI, boats, damage, wrecks, water; a car at zero health is `disabled` and burns until `explodeVehicle` makes it a wreck; `playerTune` holds the player's own speeds: bike 25 km/h (Shift ~33), step 25, brommer 45, the tuned fatbike 50, cars at half their model accel for 0-100 in ~6-8 s; the 18 m gelede bus is an 11.2 m front unit as the body plus `model.trailer`, the rear unit `busTrailerPose` hangs off its tail, drawn and collided with along the joint's own track); the own helicopter: `heliflight.js` (a Vehicle with `v.isHeli`: arcade flight for the driven one via player.js `flyHeli` (W/S height, A/D or mouse yaw, arrows forward/sideways, Shift boost, Space hover, landing assist near the surface), body and rotor probes against city and real Ommeland buildings, landing only on flat ground, flat roofs and registered helipads (`registerHelipad`: home, Rotor Roelf, UMCG) at low speed, harder touchdowns damage, a crash explodes it; soft wall at the map edge, ceiling 125 m; `updateHelis` (main.js) spools rotors, poses rotor/shadow/dust and runs the flight card in the HUD; airborne helis skip vehicle-vehicle contacts, building collision, water until down on the canal, speed cameras, roadblocks, busts; police heli flies above it; discovery cinematics wait until it lands; `window.__heli`), `heli3d.js` (its mesh, helipads, downwash) |
| People and animals | `pedestrians.js`, `wildlife.js`. The game is 18+ (docs/LEEFTIJD.md): a car, train, weapon or blast kills a person (`killPed`: the `'dead'` state, body removed after `DEAD_DURATION`) and an animal. `gore3d.js` draws the Carmageddon-style gore behind the setting `gore` (on by default): body parts (`splatterPed` above `GIB_SPEED`, `splatterAnimal`), blood spray, pools, road splats and splats on the car, and birds the player drives through. `knockfx3d.js` keeps the non-lethal side: on H3's stunt evening (`world.stuntSafe`) a hit person gets dust, comic stars (`koUntil`, `groggyUntil`) and gets up; birds that escape flap off with a few feathers |
| Combat and police | `combat.js` (weapons in slots 1-4 by kind: melee swings that land after a wind-up with per-weapon reach, knockdown and prop breaking, guns, water, throws; bullets swept against walls, props, car boxes and people (civilians and officers alike; aim assist targets everyone); recoil in `world.camKick`; `world.scoped` for the jachtgeweer scope, drawn by scene3d.js and aimassist.js), `throwables.js` (water spray, carbidbus and firework rockets: flight, fuse, blasts via pedestrians.js `blastPeople`, and their own 3D, called from gunfx3d.js), `aimassist.js` (right-mouse soft lock on the best target in a cone, hostiles first and never through walls, Tab/flick to switch, light hip-fire bend; lock reticle; setting `autoAim`), `gunfx3d.js` (muzzle flashes with a light pop, tracers, per-surface impacts, pooled bullet holes), `police.js`, `policemounts.js` (bike/horse units, crews on foot, and quiet wanted-0 patrols in the binnenstad and parks), `crime.js`, `drunk.js` (`world.drunk` from the kroegentocht pubs: camera sway, double vision in the grade pass, warm vignette, wandering feet and steering, muffled music, hiccups; setting `drunkFx`, reduced motion; drunk driving adds police heat) (small offences build heat first: a star only when police see it, a witness phones it in, or it piles up) |
| Traffic | `trafficlights.js` (conflict-free phases per axis, protected lefts or split phasing, Groningen all-bikes phase), `junctions.js` (priority classes, extra signals at busy main-road crossings, give-way arms for haaientanden and B6 signs), `trafficfleet.js` (vehicle kinds per wijk stereotype), `emergency.js` (ambulance calls, player siren on L, traffic yields) |
| Story | `storyarc.js` (the arc as data), `story.js` (director), `storycontact.js` (Radio Nachtstreek fragments ("Bel Rikus" before every mission, the rubrieken after), Jelle's and the twins' calls, voicemails, livestreams, Kiekdoar posts and cards on the phone), `namecard.js` (trailer-style name cards at a first meeting), `stuntavond.js` (H3's stunt evening; `stunthud.js` its brief, score panel and popups), `storycast.js` (the Frisian cast's looks), `storyshop.js` (story purchases: what the current step or mission gate wants bought and where, the shop menu's banner, qualifying items first with "Nodig voor je missie", others "telt niet voor je missie"; purchase counts for `goal.buy` steps), `storydev.js` (`?dev` panel), `storytest.js` (`?storytest`), `devflags.js`, `banter.js` + `banterlines.js` (Tammo and Tessa talk in the car) |
| Game systems | `missions.js`, `garages.js` (Garage Knalpot workshops and Pomp & Poets stations: roller door, R menu for repair, paint, upgrades and wrecks; Henk's phone call), `shops.js` (the only source of weapons, ammo and armour; food restores health; Rotor Roelf on Groningen Airport Eelde sells the Wieken Wubbo helicopter, delivered on its platform), `horeca.js`, `flitspaal.js`, `trafficlights.js`, `weather.js`, `skyprops.js`, `pigeonspots.js` + `pigeonmode.js` (word een duif) |
| Home | `home.js` (Thuis: Tammo and Tessa's flat in the House of Groningen tower, Paddepoel. `prepareHomeMap(map)` right after loadMap splits the OSM footprint into the tower and its plinth, which becomes the private garage; `map.reservedAt` keeps parked cars and clutter out of the garage, bike rack and kerb. Owned vehicles "in de garage" (shops.js entry without instance, or `v.homeStored`) are real parked vehicles within 200 m: bays, kerb for long ones, rack, moorings on the canal; leaving an own vehicle there stores it again; the panel pages cars when there are more than bays. The lobby door, on the garage side next to the roller door, is the one way in: a lift to the cutaway flat on the 11th floor (hall on the garage side, living room behind the glass facing the shopping centre; the facade drops too while the camera is outside it). The tower is hidden (scene3d `setBuildingHidden`), the whole storey is a surface for `groundHeightAt`, a safety net puts anyone off the floor back at the lift, and a respawn, "Vastgelopen" or load takes the flat down (never inside the tower). `world.camAdjust` (scene3d follow cam) keeps the camera closer and above the cutaway walls upstairs and out of the garage's walls outside. Bed = sleep + save, fridge = eierbal, wardrobe = owned outfits. EIKEA furniture (`furniture.js`, bought in shops.js `eikeaSections`, saved as `meubels`): delivered on the next visit, placed at fixed spots, each with a perk (sofa heal, bed armour + wake time, Kiekdoar TV replays, eierbal tips, wall-map routes, fryer armour, plant money, +10% side-job pay, night light); `window.__furniture`. New games and loaded saves start at home unless saved mid-mission (save `ctx`); "Naar huis" in the pause menu; debug `window.__home`), `home3d.js` (its meshes); the tower's roof has the helidek (`home.pad`): the flat's hall has "Trap naar het dak" (straight into the heli's seat, the companion too), landing on the deck and E parks it there and takes the lift to the flat; a stored heli waits on the deck (not while the flat is open); "Jouw steiger" (`getHomeMooringForRender`) and "Jouw helidek" icons on the map and minimap; "Laten afleveren" (ownedvehicles.js) brings boats to the moorings and the heli to the deck |
| Special gameplay | `helirun.js` (a heli run in Rotor Roelf's demo heli, a real Wieken Wubbo flown by heliflight.js `flyHeli` with the normal keys, plus a plan from `heliplan.js` (pure: legs `cruise`/`pad`/`pickup`/`rings`/`catch`, the rings, the balloon's motion, the catch zone, the steering/height/station help and a scripted pilot); standalone *Ballonjacht* off the UMCG deck, story H15 (`traumaduif`) off Rotor Roelf's pad on Eelde via the UMCG deck; an arrow, distance and height hint, a light column on the H, Tammo on the lier; the headset lines are H15's `flight:*` contacts in storyarc.js; `getHeliRunMarks()` feeds the minimap and map, `world.heliRunTarget` routing.js; parks `world.skyHeli` out of sight meanwhile; while `world.heliRun` main.js skips the player, police, combat, missions, phone and saving; `node scripts/heli_sim.mjs` flies both runs with the real flight model), `fierljep.js` (pole vault over a canal for any NPC: `poleVault(npc, from, to, { fail, appearance, camera, slowmo, keepActor, swimTime, onDone })` returns `{ done, phase, release, dispose }`; `findVaultSpot(map, x, y)` finds a 5-22 m crossing; sets `npc.scripted` / `npc.hideMesh` so pedestrians.js and scene3d.js leave the NPC to it; the camera is a cinematics.js shot). Both have a preview row in the `?dev` panel. `padel.js` (padel courts from `meta.padel`, placed on free ground next to the OSM spot; E at the door plays a short doubles match with its own camera and scoreboard, `world.padelGame` replaces the player update; rewards full health plus `world.padelFitUntil` regen; story goal `{ type: 'padel' }`; lines in `padellines.js`; `window.__padel` debug) |
| Free-roam activities | `activities.js` (one list for the activities below: their E prompts and place labels in prompts.js, E in main.js, the minigame update and camera (`world.activityGame`, input claimed with `world.minigameUntil`), map icons and legend rows ("Doen en beleven"), Ubbo rows, spot check spots; `window.__activities`), `activitykit.js` (shared helpers, no activity imports), `carbid.js` (carbid schieten on a meadow off the Beijumerweg: aim the churn with A/D/W/S, hold Space for water (too much drowns it), the gas builds and a ring shows where the lid would land, E lights it; too early a plof, too late the gas leaked away; the lid flies with gravity, drag and wind at bales, drums and the stroman down a long strip of meadow (a ditch on the way is a plons); 5 shots, points for hits and distance, medals, record `carbid`; by day it waits for dusk and holds the clock while you shoot; boer Roelf and Hilje comment in Gronings; `window.__carbid`), `kermis.js` (the botsautotent on the Grote Markt, always open (€3): 75 s of bumper cars against five drivers incl. Tammo/Tessa, points for bumps you give (flank and rear count more, combos), record `botsauto`; every evening 19:00-01:00 and in the Meikermis weeks the rest of the kermis (reuzenrad, stalls, crowd, blinking bulbs, double prize money, a Kiekdoar item); its footprint is `map.reservedAt`, so market stalls (cityprops.js `isFree`), clutter and parked cars stay off it; `window.__kermis`), `geheimen.js` (eight hidden things, each found once per playthrough for a small reward and counted by the hidden achievement `geheimen_alle` (save set `geheimen`): a door behind the Martinitoren to a little room with a "Made with ❤ in Groningen" plaque (built high above the city like the radio studio), a UFO over Zernike at night, the Peerd van Ome Loeks on top of the Martinitoren one night, a golden mini Jelle in a Frisian garden in the Prinsentuin, an eierbal vending machine in an alley, a "Kon minder" bench in the Martinikerkhof, a rubber duck race with bets in the Noorderplantsoen pond, a bike in a tree on Zernike; `window.__geheimen`), `funlines.js` (their spoken lines and Radio Proat's, as data) |
| Minigames batch 1 | four more activities in the hub (`activities.js` LIST), each with a pure rules file (no DOM, no THREE, node-tested in `scripts/minigames_test.mjs`) and a drawing/feeding file; all fixed places are WGS84 through the shared projection (`minigamekit.js` `geo`/`frame`, rdnew.js), never old-frame coordinates; free (no fee, no prize), Backspace/B stops them anytime (Esc opens the pause menu as always; a loaded save quits them through `quitActivity`), one HUD board at the top centre (`minigamekit.js` `createBoard`, body class `mg-on` hides speedo, route and phone cards), speech only as text bubbles (`minigamelines.js`, no recorded voice). `discgolfrules.js` + `discgolf.js` (discgolf: nine holes on the meadows of the Stadspark west of the canal (tees and baskets picked from the OSM green polygons, clear of water, buildings and the football fields); a throw is power (hold Space), heading (A/D), nose angle (W/S), release hyzer/flat/anhyzer (E) and disc driver/midrange/putter (F); the flight is a point mass with drag, lift, a sideways term (`K_SET`, turn and fade) and wind scaled by `WIND_GAIN`; trees (trunk below, crown above), water (+1 and back to the previous lie), the chains of the basket (caught by speed, otherwise a rattle); par from the length, cap par + 4, medals `MEDAL_REL` strokes against par, record `discgolf` (lower is better); `window.__discgolf`), `puttinglogic.js` + `pitchputt.js` (pitch & putt: six holes inside the Concours oval at the Stadspark (no pitch & putt course is mapped: the nearest big meadow), a wedge with scatter and a roll-out, a putter with friction, a green that is a shallow bowl plus a slope (arrows on the green), bunkers that double the scatter, a cup that swallows slow balls only, a power meter with a tick at the straight-shot power; record `pitchputt`; `window.__pitchputt`), `skatetricks.js` + `skatepark.js` (skatepark at the OSM "Skatepark Stadspark" widened to 50 x 26 m: a height field of two quarter pipes, two kickers, a box and rails, a board that carries its along-surface speed up and over lips, ollie, kickflip/heelflip (E/F), spins (A/D), grabs (S), grinds with a balance, clean landing = half-turn multiples and finished flips; the combo is drift.js-like: more different tricks = a higher multiplier, repeats 0.4, banks after 1.3 s on the ground, a bail loses it; 90 s; record `skatepark`; `window.__skatepark`), `kartrace.js` + `kartbaan.js` (karten bij Kardinge: a closed Catmull-Rom track of about 560 m on the empty field north-east of the Kardinge sports centre (the OSM data only has an indoor hall there), a light kart with forward and sideways speed, grip that drops under the handbrake (drift charge, boost levels), grass, a tyre wall; three AI karts that follow a lane at the speed their skill allows for the bends, with avoidance and a rubber band; three laps, grid, start lights, ranking; medals by finishing position, records `kart-race` (time) and `kart-lap`; a synthesised engine through audio.js `ambientOut`; `window.__kartbaan`) |
| Radio | `radio.js` (one station, G-Music, for the whole game, on foot and in any vehicle; N (LB in a vehicle on a pad) or Instellingen > Geluid turns it on or off, kept in the save as `radio` `'on'`/`'off'` (save v3 migrates the old station ids, `savemigrate.js`); minigames and the heli play the soundtrack even when it is off. The programme follows the game clock (`musicpick.js` `PROGRAMMES`: Proat in de ochtend 06-10, De hits 10-18, Avondproat 18-22, Nachtstreek 22-06), each with its pool (`gmusic` by day, `nachtstreek` at night through an audio.js lowpass), jingles on or off, and a talk break every 2-3 records: audio.js `onRadioBreak` hands radio.js the break when a record ends and goes on with the music when it calls done (or after 40 s). Breaks are recorded lines only (Geesje's Radio Proat idents, ads and weather, Kiekdoar news via `smsvoice.js` and the `audio/nieuws` clips, traffic, the cows, Rikus), all on the speech channel's `radio` class, so story calls cut them off; `window.__radio`) |
| Post-game | `postgame.js` (hub, opens once story.js shows the ending card: start markers with badge, map icon and E prompt, one challenge at a time as `world.challenge`, Jelle's voiced taunts, result banner, records via achievements.js `recordChallengeResult`, `after:<id>:pass/fail` banter, Ubbo rows via `world.postgameActions`; `window.__postgame` debug), `pg_bruggenrace.js` (Elf Bruggenrace over the rondvaart route and its 11 bridges), `pg_fierljep.js` (fierljep duel with a timing minigame on top of fierljep.js), `pg_skutsje.js` (skûtsje sprint Oosterhaven to Hoge der A: speed from wind angle and sail trim, `v.sailTop`), `pg_foodtruck.js` (the Fjord Frituur business: busy spots, order matching, upgrades), `pg_lines.js` (all their spoken lines as data), `pg_koe.js` (De Koe van Ome Jan: fetch Ome Jan's prize cow from Durk and Douwe's barn near Ten Boer and lead her home while they chase her in Jelle's trekker-limo; ram it to stall it; lines in `ommelandlines.js`). `world.challengeHud` feeds the race panel, `world.challengeTarget` the minimap, `world.challengeHoldPlayer` pauses the player update; `world.postgameGuide` is the automatic route (routing.js) to the nearest challenge without a medal, then without gold (in the Fjord Frituur its spots first), with Volgende/Uit on the map and a row in Ubbo; `queueFjordReveal` (queued by story.js after the credits) unveils the truck and seats Tessa in it |
| Story set pieces | `fjordtrain.js` (H16: a railway.js mission train, state `'mission'`, with the Fjord riding a flat; stops for a player standing at the Peizerweg crossing), `heist.js` + `heistui.js` + `heist.css` (H6 De Museumkraak: the plan on a blueprint with the choice of approach (sneak in through the back door, or as cleaners with a pass lifted from a guard), sweeping cameras and torch guards (standing, patrolling, dozing at the desk; E sends them to the window), the fuse box that loops the cameras, the lock, the laser grid in zaal 3, the case's dial (1953), the card on the empty cushion, the alarm, the getaway boat and the closing shot; doors are museumplan rooms with `shut` until their stage opens them; being seen or zapped sends you back, the companion helps after a few tries and holding O skips a stage that gives trouble; `window.__heist`). Jelle's escapes (`missionstory.js` `playVaultScene`) step a `fierljep.js` vault from the paused scene |
| Bijbaantjes | `sidejobs.js` (start points, shifts, pay, levels; publishes `world.sideJob` for HUD, map and routing), `sidejobkit.js` (shared helpers), `sidejobvoice.js` (voiced boss lines, `audio/voicelines/jobs`), one `sidejob_*.js` per job |
| World flavour | `flavour.js` (after docs/groningen-memes.md: building nicknames and "bijna thuis", the Gerrit Krolbrug's malfunction per pass, Ring Zuid navigation lines, "Kon minder" after a flawless mission (missions.js sets `world.lastPerfectRun`), the Noorderplantsoen on sunny days, the commentary cows in the Kiekdoar feed, event days (Bloemetjesmarkt, Bommen Berend, KEI-week: the real date, else a rare random day at dawn), the Peerd van Ome Loeks on another roundabout each night, AI cars stopping for crossing cyclists, stolen bikes turning up again, Rikus on G-Music outside the city at night (only with the radio on), Oosterpark chants; owns `world.flavour`, debug `window.__flavour`), `flavour3d.js` (billboards that change with story progress, the growing Krolbrug detour, picnic instancing, the statue, plaque, flags, house plants; built at boot, only toggled after), `flavourlines.js` (all text; spoken tables registered in voicelines_collect.mjs) |
| Streken (cheats) | `cheatlist.js` (the 21 streken as pure data: kind toggle/action/perk, `group` for ones that exclude each other, `safe` for the cosmetic ones, the unlock `step` (storyarc.js) or `ach` (a prestatie); `storyCheatUnlocks`/`cheatUnlocksFromSave`, also used by savemigrate.js), `cheatmods.js` (`MODS`, the live switches the systems read, no imports: gravity in player.js and vehicle.js, grip in player.js, the Escapade's tune and the bounce in vehicle.js, traffic targets and the slow-mo time scale in main.js, the pigeon limit in wildlife.js, `grunnify` in subtitles.js; head size through models3d_people.js `setHeadScale`), `cheats.js` (unlocks polled once a second from the story and the prestaties, kept per save as `streken` and for good in the lifetime set `streken`, with a HUD card for a fresh one; `updateCheats` from main.js sets MODS and the clock, storm, wanted level, health and ammo; the gameplay streken pause while `cheatsBusy` (mission, cutscene, challenge, bijbaan, minigame, pigeon, train, respawn); `setAchievementGate` stops prestaties and lifetime stats while one is on or after the money grab; `world.cheatActions.teleport` puts the player (and their car) on the nearest city or Ommeland road via safety.js's reset helpers; `spawnVehicleHere` moves an owned vehicle, or spawns one from the stock with Showroom (`shops.js` `spawnStockVehicle`, not saved), onto a free spot beside the player and seats them), `cheatsui.js` (the pause-menu section; mapview.js `setMapTeleport` turns the next map click into a teleport) |
| Ommeland extras | `ommelandfun.js` (hub for main.js, prompts.js and spotcheck.js; solid props push the player out; `window.__ommeland`), `worldends.js` (twelve wereldeinden where real roads cross the edge of the Ommeland data, picked round the four edges from the road data: a prop, a voiced line, a card "3 van 12", lifetime set `wereldeinden` for Prestaties, the twelfth plays the final gag), `dorpsuitjes.js` (per Ommeland station: one special (tennis, canal trip, Gronings quiz, mill, leaning tower, wierde, bell, beach), a café, farm shop, beach kiosk or bike rental, a hidden eierbal and a signpost; placed per village when the player heads its way, props only within ~300 m; sets `dorpsuitjes`, `dorpseierballen`), `ommelandplace.js` (open ground, roads, water and shore in the real data), `ommelandprops3d.js` (the props, one vertex-colour mesh each plus sign textures), `ommelandtalk.js` (voiced name bubbles; DUO lines are the companion's), `ommelandlines.js` (all text, pure data; registered in voicelines_collect.mjs). The station menu and the map name a village's things to do. |
| Real facilities | `facilities.js` (game/facilities.json from `scripts/add_facilities.py`: hospitals, huisartsenposten, doctors, ambulance posts, police, fire stations, pharmacies, fuel, car repair, shops per kind, horeca, parking lots (with outline), parking garages, parking lanes, taxi ranks and bus stations for the whole province, in lat/lon projected at load by `geoframe.js`, so the layer moves to RD New in one place; only what lies in the built world (city map, real Ommelanden) is kept; no business names: kind + place, police keep their own "Politiebureau X"; `nearestFacility(kind, x, y)` with 'medical' (emergency hospital or huisartsenpost within 4.5 km, else the nearest doctor / ambulance post) and 'police', falling back on meta.*; `countryDoor` for a street door on a real Ommeland building). Used by respawn.js (death and arrest trips to the nearest real one, Ommeland arrivals on the real roads and boxes), garages.js and shops.js / horeca.js (Ommeland branches at the real places; the city keeps meta.*), emergency.js (ambulances waiting at the nearest hospital or post), `parkinglots.js` (bays on the real lot outlines and lanes: parkedcars.js fills them, ownedvehicles.js parks in them) and `parkinglots3d.js` (asphalt and bay lines); `scripts/facilities_test.mjs` |
| Landmark kits | `landmarkkit.js` (docs/PROVINCIE-PLAN.md 3b, LK1: data in, low-poly geometry out, no scene or map: `landmarkParams(item, fit)` turns an OSM candidate (kind, name, outline, tags) into parameters (church: nave from the outline, choir apse/three-sided/flat, west tower with saddle roof, spire or ingesnoerde spits, roof turret, post-war hall with a free bell tower, `lean`, `ruin`, wierde with churchyard wall, lime trees and graves; tower: bell tower or lookout; mill: stellingmolen, grondzeiler, windmotor; borg), `LANDMARK_LOOKS` the hand-tuned icons; `landmarkGeometry(p, lod)` LOD 0 full, 1 masses, 2 skyline, groups body/glow/glass, sails apart), `landmarklayer3d.js` (draws a list: full meshes within 320 m with shadows and turning sails, masses merged per km cell to 1.1 km, one skyline mesh beyond; the level per vertex in `aC.z`, hidden by distance in the vertex shader, one program per material; haze capped so towers stay on the horizon; floodlights until midnight, lit clocks and door lamps, mills dark), `ommelandlandmarks.js` (today's Ommeland: `game/landmarkkits.json` from `scripts/add_landmark_kits.py`, outside the city map, node and outline of a church merged, a church's own tower left to it, a church without an outline fitted to its building box; `window.__noLandmarkKits` for A/B), `node scripts/landmark_kits_test.mjs` |
| Soft-lock safety | `safety.js` (pause menu "Vastgelopen? Zet me vrij" and "Missie afbreken" (counts as a fail, so the story skip opens); watchdogs for cutscenes and respawn scenes that run far too long, players out of the world, scene flags left behind) |
| Title and trailer | `logo.js` (the game's name in one place: `SERIES`, `PLACE`, `SUBTITLE`, `GAME_TITLE`, and `logoHtml()` for the GDE wordmark; its CSS `.gde-logo` and a static copy for the loading and title screens live in `index.html`; a sequel swaps `PLACE` and `SUBTITLE`), `startscreen.js` (loading screen, title menu over the live city), `trailer.js` (attract intro, benchmark, recording mode), `intromontage.js` (the "Nieuw spel" opening montage) |
| UI | `hud_panel.js` + `.css` (each corner one job, nothing in the HUD takes a click: top left the player card with a portrait rendered from the real model (`renderSnapshot`, cached per look, so outfits show), ten-segment health and armour bars and, while the companion is with you, their own small portrait ("Tessa rijdt mee"); top right one block with time of day, wanted stars, money and weapon, the race panel under it; bottom right the minimap, which steps up in a vehicle (`--mm-bottom`, `body.hud-in-vehicle`) for the speed and damage badge; bottom left the location chip, where savegame.js's "opgeslagen" tick sits; minimap: player, routes and targets always; static places only the nearest few per category; the objective line), `hudcards.js` + `.css` (HUD message cards, countdowns; "2 meldingen wachten" under them while cards queue), `cardlines.js` (what Tammo/Tessa say with a card), `prompts.js` + `.css` (world prompts and the key-cap + pictogram hint chips; `world.missionPrompt` is a mission stage's own prompt), `shopui.js` (shop menus: select, then buy with the button; confirm for expensive items), `vehiclepreview.js` (rotating 3D previews of vehicles, weapons, people and products: `createVehiclePreview` with its own renderer for the shops; `createSharedPreview` and `renderSnapshot` draw through ONE shared WebGL renderer onto 2D canvases and cached stills, for the garage, Verhaal and the HUD portraits, so menus never open a context per selection; `PORTRAIT_ANGLE` turns a person to the camera), `shopmodels3d.js` (procedural shop products), `pausemenu.js` (one overlay over the paused game, the city rendering behind it: a fixed 248 px rail (Doorgaan, the sections, Opslaan/Laden, Hoofdmenu) and a sheet with one section: Overzicht, Te doen, Verhaal, Kaart, Garage, Prestaties, Streken, Instellingen, Besturing; Esc opens on Overzicht, Esc/Backspace from another section go back to it, then close; Q/E switch sections, arrows move the focus spatially, Enter on a Te doen card makes it the goal; the last section and sub-tab are kept in `gde-menu-v1`; `openPauseMenu(name, { select, view })` from M or the phone opens a section directly and Esc then closes; the start screen's Instellingen is the same menu with only Instellingen and Besturing), `todo.js` (one catalogue of everything to do: missions with status Nu/Klaar/Later/Op slot, medal and record, minigames, bijbaantjes, Ommeland, collectibles as counts only, the post-game challenges; `chooseTodo`/`playMission` make one the goal, a story mission later than the current step first asks "H9 nu al spelen?" (`confirmPlayAhead`); `mapIconUrl` caches map icons as images), `todoui.js` (Overzicht and Te doen: Verhaal per part with clues, Alles per kind, Dichtbij, and the detail panel), `verhaalui.js` (Verhaal: Personages, a card per character with a head render or a silhouette and "???" until met, the viewer with the turning model, quote in their speaker colour, bio, relation to the duo and the missions together; Aanwijzingen, the clues per story part with the unknown ones as ???), `characters.js` (the cast as data: id, name, `speakers` (subtitle names that count as them), role, bio, quote, relation, `missions` (STEPS ids), `model` (`tammo`/`anita` or a missionstory.js `NPC` key); `noteSpoken(world, speaker)` unlocks a character the first time they speak to you, in the lifetime set `personages` (achievements.js), called where a line is shown with its speaker: cinematics.js, storycontact.js, phonefeed.js, phone.js calls, postgame.js; never during the trailer or before the game starts), `achievementsui.js` (Prestaties: summary band with ring and four figures, the categories on the left with Bijna binnen first, the cards, Onlangs behaald and the lifetime figures), `goal.js` (the one player-chosen goal, `world.goal`: place, mission, minigame, bijbaantje or challenge; done when reached or played, then a "Terug naar het verhaal" card; saved as `doel`; `missionOnMap` is the map rule: a mission marker only while it runs, for the story's current step or as the goal), `motion.js` (motion tokens live on `:root` in index.html; count-ups, bar fills with a ghost on a drop, one-shot pop/ring/shine; "Beweging beperken" or the OS setting put `reduce-motion` on `<html>`), `garageui.js` (Garage section: category pills with owned/total, Toon and sort, a card per vehicle with a rendered thumbnail, speed and pull bars and a status chip, the viewer with the turning model and Laten afleveren / Waar staat hij?; all drawn by the shared preview renderer), `mapview.js` (full map, the "Op de kaart" layer panel: Altijd, Te doen, Diensten and Onderweg, a row switching one or more layer keys; a click on a marker opens a card with "Zet als doel", a click elsewhere makes the spot the goal, right-click/Del clears it; search also finds missions and activities), `mapfilters.js` (one visibility switch per layer key, shared by the full map and the minimap; `klussen` starts off), `routing.js` (GPS route for the goal, missions, the story and side jobs; a straight line in a heli; quiet during padel, carbid, the kermis and a heli run), `phonefeed.js` + `.css` (phone notifications and calls), `sikkomfeed.js`, `subtitles.js` (Dutch subtitles under Frisian and Gronings lines, see Spoken lines), `uiscale.js` (HUD scale `--ui`: window size times the "Grootte interface" setting, applied as CSS zoom on the HUD roots and the pause menu's card, sheet header, panels and footer) |
| Audio | `speech.js` (the one talking channel, see "Spoken lines"), `audio.js` (G-Music, voicelines, synthesised effects; buses for music, effects and voices), `linevoice.js` (recordings for speech bubbles, unvoiced cutscene subtitles and the rondvaart guide, `audio/voicelines/lines`), `scenariomusic.js` (race/chase loops that pause G-Music) |
| Building passages and interiors | `passages.js` (the corridors footways and streets cut through a footprint: mapped OSM passages from `mapextras.json` `passages`, streets, short footways/cycleways; walkers, vehicles, spawns and the camera share them; a way that ends at a facade gets a door, a footway or cycleway through a solid block is cut at the facade when the map loads, `clipWaysInBuildings`), `portalcut3d.js` (building materials discard inside the passage boxes near the player, so the facade shows a real gate; lined tunnels with lamps; the door panels), `museumplan.js` + `museum3d.js` (the Groninger Museum's walkable ground floor as rooms: cycle passage, atrium, Entreehal, zaal 1, zaal 3 with the Gouden Eierbal case used by H6; a room with `shut` is closed to walkers) |
| Validation | `spotcheck.js` (every start/target point must be open ground you can walk away from), `ringcheck.js` (nothing solid or open water on the ring race lap and ring roads, a car crosses every water crossing of the major and numbered roads at 80 km/h in both directions and three lanes, a scripted car and the AI racers drive a full lap, every rail lift can be walked, driven and cycled up), `passagecheck.js` (every street, cycleway and footway stretch inside a footprint is an opening, a door, a facade graze or clipped, never through a solid wall or an invisible hole; `node scripts/passage_audit.mjs` lists them from the map data); `node scripts/seat_audit.mjs` seats a figure on every vehicle's driver and passenger seat (seating3d.js `vehicleSeat`) and checks the head is in the cab glass under the roof, the hands ahead of the hip and the feet inside the body; all run in the story test, desktop `--validate-spots[=dir]` runs only them; out in the Ommelanden spotcheck.js loads the tiles round a far spot first (`withTiles`) and also rejects spots inside what is solid there (farmsteads, villages, turbines and pylons), with the same countryplan.js `pushOutOfPlan` query collision.js uses and the map-edge mask built first (`ensureCountryEdge`); `node scripts/swim_audit.mjs` (not in the story test) poses the ambient swimmers (swimmers3d.js) in each swimwear over a full stroke and checks no hand goes over the head, a back floater lies at the waterline with its hands in the water and a bank sitter's feet reach the water |
| 3D | `scene3d.js` (scene, streaming, camera), `staticbatch3d.js` (static batching of city buildings and roads per 48 m cell, see Graphics settings), `gfxprofile.js` (graphics presets, GPU check, adaptive quality), `roadsurface.js` + `roadstructures3d.js` (roads; viaducts, embankments, cuttings, tunnels), `cutmask3d.js`, `terrain3d.js`, `water3d.js`, `models3d_buildings.js`, `models3d_vehicles.js`, `models3d_people.js`, `treeprops.js`, `pixelart3d.js` (shared materials), `landmarkmodels.js` (GLB landmarks) |

### Import cycles (#108)

`node scripts/import_cycles_test.mjs` guards the static import graph of `game/js`: the largest group of modules that import each other, the modules in cycles and the mutual pairs. All three limits are **0**: the graph is a DAG and a new cycle fails the test. Dynamic `import()` is not followed (lazy loading breaks a cycle on purpose; `missions.js` loads `story.js` and `story.js` loads `scene3d.js` that way). When a new import would close a cycle, break it in one of three ways, in this order:

1. **A leaf module** that holds the shared state, constant or helper: `pausestate.js` (pause menu open, map open, the phone's tab, `openPauseMenu`/`closePauseMenu` proxies), `pedconst.js` and `pedgeom.js` (pedestrian constants and geometry), `weapons.js` and `combateffect.js`, `vehiclewreck.js` (`disableVehicle`, `wreckVehicle`), `vehicleimpact.js`, `trafficyield.js`, `wallpath.js` (`wallOnPath`), `clocktext.js` (`getClockText`), `missionmarker3d.js` (the 3D mission markers), `shopdata.js` (`SHOP_TYPES`, `VEHICLE_STOCK`), `landmarkmaterials.js`.
2. **A query facade** for modules that only ask: `missionquery.js` (`isMissionActive`, `getActiveRace`, `getMissionDefs`, `isNight` ...; `missions.js` registers the real functions with `registerMissionQueries`) and `storyquery.js` (`currentStep`, `storyFlag`, `getStorySave`, `getStoryView` ...; `story.js` registers with `registerStoryQueries`). Without the provider they answer as an empty chain or a story that has not started.
3. **A link the other side registers at load**, so the lower module never imports the higher one: `savehook.js` (`saveGame`, `markDirty`, `saveSoon`; `savegame.js` registers), `shopicon.js` (`registerShopIcon`), `vehiclehooks.js`, `latehooks.js` (slots for `walkPathHook` routing.js -> pedroutes.js, `throwablesHook` throwables.js -> gunfx3d.js, `furnitureShopHook` and `jobBonusHook` furniture.js -> shops.js and sidejobs.js, `cinematicLinks` respawn.js/main.js -> cinematics.js), `scene3d.js` `setRouteLinks` and `audio.js` `setAudioCamera` (`main.js` hands over the route getters and the camera). Keep the slot in a leaf (not in the module that uses it): a provider can then fill it whatever order the modules evaluate in, without a temporal-dead-zone error.

A link that is never registered does nothing (or answers with an empty value), so check that the registering module is part of the game's import graph from `main.js`. The geometry worker (`geoworker.js`, `geokernels.js`, `geojobs.js`, `quaywalls.js`, `roadsurface.js`) is acyclic too: `geojobs.js` does not import the kernels, `geokernels.js` registers them. The test also follows the subfolders `sfx/` and `net/` (`sfx/ui.js`, `sfx/foley.js` and `sfx/ambience.js` take the pause state, weapon and combat-effect leaves, `goal.js` and the `sfxLinks` slots of `latehooks.js` for the scene and the map statistics).


### Dead code and build-only modules (#103)

`node scripts/dead_code.mjs [--list|--json]` reports, from the import graph, the modules of `game/js` that no game code loads (build-only: only scripts, tests or the tile build use them) and the exports nobody imports. Build-only modules that the player never needs are listed in `scripts/lib/buildonly.mjs` and left out of the app and web build by `desktop/build.mjs` (`scripts/buildonly_test.mjs` keeps the list equal to the graph; a module that is build-only on purpose but still ships goes in that test's `KEEP` with a reason). A new export that only its own file uses should not be exported.

## Modules since 0.35

Short notes on what was added after 0.35.0 (all in `game/js/` unless stated). "Pure" means no THREE, no DOM and no clock, so Node tests load it directly; the glue module is named where there is one.

**Gates and registers**
- `busy.js`: the one "is the player busy" gate. `playerBusy(w, reasons?)` returns `{ busy, why }` (why = mission, cinematic, activity, sideJob, ...); `registerBusyProbe(reason, fn)` lets areas such as missions and cinematics report in; `gameBusy(w)` is the shortcut for "a game owns the screen". Every start rule (narrative, muggings, roadrage, safety, trafficlaw, cheats, onboarding, ...) calls it instead of testing `world.padelGame`, `sideJob` etc. Test: `busy_test.mjs`. Add a new way of being busy as a reason (an entry in `FLAGS` of busy.js) here.
- `activityhub.js`: one registry for activities, bijbanen, postgame challenges and uitjes. A kind is an adapter over its module; `main.js` calls the hub's init, interact and update once per phase. A new activity registers a kind; it adds no lines to `main.js`. Test: `activityhub_test.mjs`.
- `devflags.js`: `FLAGS` and `FLAG_DOCS`, the register of URL switches (see `docs/ONTWIKKELEN.md`).
- `storagekeys.js`: every storage key, with the `gte-` to `gde-` migration at boot (see "Saves and versions").

**Attention, HUD, voice**
- `hudbus.js`: the planner for everything that asks for the player's eyes (#104). Priority tables, `decideStart` (narrative.js), `decideMoment` (attention.js), the overlay rules (overlayrules.js), `decideSpeak` (speech.js), the HUD queue and `mayShow` (hudrules.js). Owners keep their own state; this module owns the tables and the one question `mayShow(channel, ctx)`. `SURFACES` lists every channel that asks for eyes or ears (module, gate, zone, P); a new module that puts its own overlay on screen has to be listed there. The inventory for #92 is `docs/KANALEN.md` (made by `node scripts/hudbus_inventory.mjs --md`). Tests: `hudbus_test.mjs`, `hudbus_surfaces_test.mjs`.
- `hudlook.js`: the HUD's visual language (#92): what a vehicle shows, meters with shape next to colour (colour-blind palette), edges from 720p to 4K, single owner of numbers shown twice. `hud_panel.js` applies the answers as classes. Test: `hud_test.mjs`.
- `voicebank.js`: the one loader for voice manifests (`audio/voicelines/<map>/manifest.json`). One fetch and cache per map, keys `speaker|text`; `linevoice`, `sidejobvoice`, `smsvoice`, `banter`, `storytext` and the intro/mission story modules go through it. A missing fetch gives an empty bank, so scripts can import it. Playing a clip goes through `audio.js` `playVoice`/`playExclusive`.
- `glyphs.js` and `padlogic.js`: key hints follow the controls; with a controller they switch to button symbols. `padlogic.js` is the pure part of `gamepad.js` (dead zone, which pad is player 1, direction navigation for menus). Test: `padlogic_test.mjs`.
- `touchlogic.js` (pure) and `touch.js` (DOM): virtual stick, camera swipes, situation buttons for phones and tablets; `?touch=1|0` forces it.

**Cutscenes**
- `cutscript.js`: the direction language. A scene is data (`cutscenes.js`, referencing script lines by number); `compileScene(def, { lines, duration })` validates it and returns a deterministic sampler (actors, props, camera). `cutscenehost.js` `playScript(w, def, opts)` puts the sampled state on meshes, feeds the camera to `cinematics.js` and cleans up. `actoranim.js` is the animation layer (idle, walk, talk, gestures, sitting, bystanders): `animateActor(mesh, { anim, speed, gaze, t, dt })` poses the bones of `buildPersonMesh()`; cutscript imports it dynamically and falls back to a stub. Tests: `cutscript_test.mjs`, `actoranim_test.mjs`.

**Police, traffic, simulation**
- `wantedstate.js`: the wanted state as one word (`rustig`, `achtervolging`, `zoeken`) read by the HUD; `police.js` keeps the bookkeeping, `signalement` (your vehicle's description) shortens a search after a swap. Test: `wanted_flow_test.mjs`.
- `spatialgrid.js`: the uniform bounding-box grid (`insert`, `remove`, `update`, `query`, `queryRadius`, `cellItems`) under facilities, elevation, waterindex, pedroutes, junctions, nightlights3d, parkedcars, breakables and railprofile (#111). New spatial lookups use it, not a new grid. Test: `spatialgrid_test.mjs`.
- `simlagen.js` (pure, on by default, `?zonderlagen` turns it off): per region and distance, how many vehicles and pedestrians are really simulated; `vehicle.js` reads target counts from it. `simkernel.js`, `simhost.js` and `simworker.js` (on by default, `?zonderworker` turns it off; `simambient.js` picks the ambient pedestrians that may go to it): the simulation worker (#58). One message in, at most one out; without module workers, under the story test or with `?noworker` the kernel runs on the main thread with the same numbers. The real traffic AI has not moved in yet.
- `motortraffic.js`, `busroutes.js`/`busservice.js`, `semitrailer.js`, `machinist.js`, `arcadeplane.js`: pure rules for motorbikes in traffic, bus lines and the bus service score, trailer coupling, the train-driver minigame and the arcade aeroplane; glue lives in `vehicle.js`, `sidejob_vracht.js`, `traindrive.js`, `heliflight.js`.

**Map, regions, water, placement**
- `mapstyle.js`: one style table (palettes `map` and `mini`, road order, widths, zoom rule, night palette). The minimap, the full map (`countrymap.js`), `regions.js` and `scripts/world/province_map.mjs` import it. Test: `mapstyle_test.mjs`.
- `regions.js` and `regiondata.js`: which region a point lies in (Groningen, Friesland, Drenthe, Duitsland, Waddenzee, Eems, Dollard, Noordzee), the sea polygon, borders and the name to show. `regiondata.js` is the coarse fallback. Test: `regions_test.mjs`.
- `waterlevels.js`: `waterPolyAt(map, x, y, z?, opts?)` is the one "is there water here" rule and `waterAt` the one answer with kind, depth, level and covered; `isInWater`, `inMapWater`, `overOpenWater`, `shallowWater`, `waterNearby` and the wildlife water points are wrappers. Do not add local water lookups; what stays apart on purpose is listed under "The water rule" in the water section below.
- `tileplace.js`: `nearestOnRoads` and the building queries over the streamed tiles; shops, uitjes, houses and sidejobs place themselves through it.
- `vaarnet.js` (pure, #184): the waterway network. Rules: `effectiveNav` (the shipping waterways by name, `waterlevels.js MAIN_WATERWAYS`, and big lakes are class 4 whatever the strip's width says; `tileworld.js` applies the same promotion to the tiles' rows), `passBridge(kind, bridge)` (a fixed bridge by clearance against the boat's air draft, a movable one opens by itself after its time), `lockPassage` (a lock's gates and level from `locks.js`), the fixes (`patchRows`, `linkPolygon`, `gatPolygon`) and the route graph (`createVaarNet`, `routeVaar` per boat kind, `pickTrip`, `routeAhead`). `scripts/world/vaarnet.mjs` rasterises the province's water (5 m cells, the city from citymap.json), joins the gaps under bridges and locks, audits that a boat sails from the inner city to the Waddenzee, Eems, Dollard and Lauwersmeer and names what stops it (`node scripts/world/vaarnet.mjs [--class 3,4] [--links] [--gaps]`); `--fixes` writes `game/vaarnet_fixes.json` (links over missing canal, `gaten` of water under bridges and locks, `zee` tongues off the coast up to the turn-back line of `worldedge.js`), `scripts/world/vaarnet_graph.mjs --write` writes `game/vaarnet.json`. The net covers ALL navigable water (class 2 and up: vaarten of 4 m, canals, lakes, the sea tongues; one shortest-path tree per water piece, wide water cheaper than narrow, so barges and tour boats keep to wide water where it exists; `MIN_WIDTH` per boat kind in `vaarnet.js`); class 1 (ditches, ponds) and pieces under 200 cells are left out on purpose, `vaarnet.mjs --components` reports every piece (size, place, share of class 3 and 4), the ditches, the towns without net water and the biggest gaps between pieces, and `--fixes` also writes `verbindingen` (gaps of 25 m or less in a canal, closed with small links). `planVaarRoute` (A*) plans a route between two points for a boat kind: the player's GPS (`routing.js`, boat mode) and the boats use it; `getSharedNet`/`setSharedNet` hold the loaded net. `vaarload.js` loads both at start: `TileWorld.addWaterPatches` puts the fixes in the water grid (boats, swimmers and the ground's water mask see them), `vehicle.js setVaarNet` lets a barge sail a trip over the net (`followVaarTrip`), and `vaarPrefetch` adds the tiles of the route ahead to the streamer's focus when the player sails. Tests: `vaarnet_test.mjs` (rules, router, the real graph, a barge on a trip), `vaarnet_province_test.mjs` (real province data, about 90 s, not in `run_tests`).
- `marinas.js` (pure planner) with `scripts/world/marinas.mjs` (build) and `marinas.json`; inland vessels (`barge`) stay in front of bridges they cannot pass.
- `stadsprofielen.js`, `regioleven.js`, `snackketen.js`: seven city profiles, summer events and encounters per region, and the Kroketkoning chain (storage key `gde-snackketen-v1`).
- The city is no longer a switch (#90): `scripts/lib/loadworld.mjs` loads it as the build makes it (`WORLD_SRC=json|tiles`).

**Loading, story travel, co-op, weather, shared helpers**
- `loadlogic.js` (pure) with `loadscreen.js`: which variant a load gets (`save`, `snel`, `travel`), twelve progress tiles from the streaming status, one-line tips, timing. Test: `loadlogic_test.mjs`.
- `reisbeats.js`, `reiskeuze.js`, `reistijd.js` with `reispanel.js` (behind `?reizen`): per story step after a jump over 6.5 km, the travel class, the ETA per mode and the choice (ride along, drive yourself, skip) with its arrival effect. Tests: `reisbeats_test`, `reiskeuze_test`, `reistijd_test`, `reisview_test`.
- `coop.js` (pure) with `coopglue.js` (behind `?coop`): player 2 controls the companion, on IJKL or a second pad; `companion.js` hands over its follow AI.
- `weatherstate.js` (pure): weather per region as a seeded state machine (summer kinds only); `weather.js` draws the result.
- `ghostreplay.js` (pure recorder, playback, best-run storage) and `ghostmesh.js` (the see-through car): the kart and drift-zone ghosts. Test: `ghost_test.mjs`.
- `rng.js` (`hash2`, `mulberry32`, `rand`), `canvastex.js` (`canvasTex`) and the geometry helpers in `util`: shared helpers that replaced 14 and 8 local copies. Use them.

**Desktop and tooling**
- `desktop/devtools.js`: benchmark, smoke, perf and story-test harness, loaded only when the app is unpackaged or `GDE_DEV=1` (constitution 9). `desktop/args.cjs` is the single argument parser (`desktop_args_test.mjs`); `desktop/envcompat.js` maps the old `GTE_*` environment names to `GDE_*`.
- `scripts/run_tests.mjs` runs the standard tests (`--quick`, `--only=`, `--list`); `.github/workflows/test.yml` runs it on Linux and Windows. `scripts/text_audit.mjs` checks all player-facing text against the constitution (allowlist in `text_audit_allow.json`).

## Spoken lines

Every line shown as a speech bubble or subtitle has a recording, looked up
by `"<speaker>|<text>"` in a manifest (an edited line goes silent instead of
playing the wrong clip):

- `audio/voicelines/story`: story cutscenes (`missionstory.js`), the intro
  montage and the rondvaart chase. `missionstory.js` falls back to the lines
  manifest for story lines recorded there. Re-recorded in place by
  `scripts/tts_lines*.{mjs,py}`.
- `audio/voicelines/jobs`: bijbaantje bosses and Tammo/Tessa's shift lines
  (`sidejobvoice.js`, `scripts/tts_sidejobs*.{mjs,py}`).
- `audio/voicelines/lines` (`linevoice.js`, `scripts/tts_lines*.{mjs,py}`):
  speech bubbles as `~m|`/`~f|` (scene3d speaks a new bubble in the voice
  that matches the ped's model), subtitles without their own recording
  (`cinematics.js` attaches them and stretches the timeline to fit; no
  speaker = `Rikus`, the narrator) and the rondvaart guide (`Tammo`/`Anita`).
- `audio/npc`: the ambient Gronings phrases.
- `audio/voicelines/tammo`, `audio/voicelines/anita`: the reaction barks
  `audio.js` plays for whoever you play, three WAV variants per trigger
  (`scripts/tts_barks*.{mjs,py}`; no manifest, only `tts.json`).
- `audio/voicelines/banter`: car banter (`banterlines.js`,
  `scripts/tts_banter*.{mjs,py}`).
- `audio/voicelines/sms` (`smsvoice.js`): phone messages read aloud in the
  sender's voice (`Kiekdoar-redactie` reads the Kiekdoar news, `Ubbo` the app's
  own texts, `Onbekend nummer (058)` is Mem Terpstra).
- `audio/voicelines/hints` (`smsvoice.js` `hintVoiceFor`): HUD cards that
  are the companion talking (mission stage `say:` lines, `hint()` lines,
  `MODE_HINT`, `cardlines.js` `COMPANION_CARDS`), said by the one you don't
  play (`react` class); a line naming Tammo or Tessa is only recorded for
  the other.

All voices go through the voice bus (Stemmen slider) and through one
talking channel, `speech.js` (pure state; `audio.js` plays the clips and
feeds it the AudioContext clock; debug `window.__speech.speechState()`):

- Classes, most important first: `story` (cutscenes, intro montage, the
  rondvaart chase) > `mission` (post-game challenge commentary) > `call`
  (phonefeed.js calls) > `banter` (car talk) > `job` (bijbaan bosses, the
  rondvaart guide) > `react` (Tammo/Tessa voicelines, HUD-card lines, police
  barks, Kiekdoar, navigation, cows) > `ambient` (speech bubbles, NPC
  phrases) > `radio` (the radio's talk breaks, G-Music jingles).
- One line at a time (`begin`/`extend`/`end`; a line that never reports
  its end frees the channel after its length). A newcomer of at least `job`
  cuts off a lower line below `call` (its `stop` runs); `story` cuts off
  everything; any voice cuts off the radio. Everything else waits (callers
  retry, e.g. `playLineVoice` returns false) or drops (bubbles).
- Conversations hold the channel (`hold`/`release`): a story scene
  (`setStoryScene`) blocks everything, a call blocks all but story, car
  banter blocks lower classes and is ended by a call or story (banter.js
  gets `onPreempt` and cuts the talk off).
- Short gaps after a line per class (ambient 1 s, radio 2.5 s);
  `request(cls, dur, play, { maxWait })` queues instead of dropping.
- G-Music: jingles are skipped (straight on with the next track) and the
  wanted jingle is not queued while anyone talks or talked in the last
  2.5 s (`radioMayTalk`); music ducks under every voice (`musicDuck`, a
  little for bubbles). A talk break line that cannot start retries a second later.
- `node scripts/speech_test.mjs` checks these rules on a fake clock (with
  `?stil` there is no audio, so the arbiter is tested directly).
- Watchdog (audio.js, every 2 s): `speech.sweep()` drops holds past their
  class maximum or whose `alive` probe (banter, call, contact, story scene
  via cinematics.js `setStoryProbe`) stays false for 3 s; a stopped
  AudioContext resumes (also on any key/pointer, focus, fullscreen change);
  output gains follow the mute/settings, a stale music muffle or G-Music
  hold is lifted, a failed music element is replaced, a NaN in the mix cuts
  the engine synth loose (the worklet drops non-finite params itself).
  Voice elements release their media player when done; jingles are reused.
  `setStoryScene(on, who)` counts owners. Debug `window.__audio.state()`,
  `heal()`, `poke(what)`. `--stil --audio-graph` (`?stil&audiograf`) runs
  the graph into a muted sink; `scripts/audio_check.js` is the desktop
  `--perf-script` check of that state machine.

Skipping a cutscene stops its voice. `node scripts/voice_coverage.mjs` lists spoken lines without a
recording per area and exits 1 if any are missing; new spoken tables are
registered in `scripts/voicelines_collect.mjs`. To fill the gaps:
`node scripts/tts_lines_list.mjs && python3 scripts/tts_lines.py` (clips
are trimmed and normalised to -18 LUFS, the level of the story lines; the
run stops at `--budget`).

All TTS scripts call Gemini 3.8 Flash TTS through `scripts/gemini_tts.py`
(OpenRouter, paid from its balance; key in `.env`). 3.8 reads the input
verbatim, so the delivery goes in `speech_metadata.style`, built by
`styleOf(who, tag, accent)` in `scripts/tts_cast.mjs`; that file also holds
Tammo's and Tessa's voices for every pipeline.

**The voices speak Gronings, the subtitles stay Dutch.** What a voice says
is not the shown line but its spoken Gronings spelling from
`scripts/gronings_spoken.json` (key: the line exactly as the game shows it,
or the `say` text a job overrides it with; value: the spelling sent to the
TTS, written so Gemini reads it right: `oe`, `ai`, `n`/`t` for the articles,
no apostrophes inside words). The manifests, file names and `tts.json` keys
still use the shown text, so the game needs no change; the subtitle only
turns Gronings through the *Gronings ondertiteld* streek (`grunnify`,
`cheatmods.js`). `gemini_tts.say_of(job)` does the lookup and raises when a
line has no entry, so a new line must get one before it can be recorded.
Frisian characters (Jelle, Mem, Durk, Douwe, the Verdwaalde Fries) and the
foreign tourists keep their own language (`lang: 'own'`, a non-Gronings
accent in `tts_lines_list.mjs`). Edit a Gronings spelling, delete that clip's
`tts.json` entry (or bump `TTS_LANG` in `tts_cast.mjs`) and rerun the
pipeline to record it again; `node scripts/gronings_spoken_test.mjs` checks
the table and that every logged clip says which language it was made in.

Every voicelines folder has a `tts.json` next to its `manifest.json`, keyed
the same, that says exactly how each clip was made: `src`, `model`,
`lang` (`gro` or `own`), `voice`, `input` (the spoken Gronings text sent, with any inline tags), `style`, `post`
(the ffmpeg chain) and `date`. Every pipeline writes it as it records, and
the game never loads it. A clip whose entry is missing or names another
model counts as outdated, and the next run of its pipeline re-records it in
place.

### Dialect subtitles (Frisian and Gronings)

Grunn speaks Dutch and Gronings; Jelle sprinkles Frisian into his Dutch
(a few signature lines stay fully Frisian), Durk and Douwe speak Dutch
with the odd Frisian word. Every Frisian line, and every Gronings line
that is hard to follow, shows its Dutch translation underneath, smaller
and in italics (`.nl-sub` in `hud_panel.css`).

- Lines stay plain strings everywhere, so voice keys (`speaker|text`) and
  the collectors don't change. The translation lives in
  `js/subtitles.js`: `FY` (Frisian) and `GRO` (Gronings), keyed by the
  exact shown text: `'Moai! Oant sjen, Grinzers!': 'Mooi! Tot ziens, Groningers!'`.
- A key may be a fragment: every key found inside a longer text is
  replaced by its translation, so a quote in a Dutch line
  (`'"Tige tank."'`), a toast template's fixed part (the text before a
  `{to}` or `${name}`) or a `Speaker: text` history row gets its subtitle
  too. Fragments shorter than 5 characters are ignored.
- Rendering: `setDualText(el, text)` / `dualHtml(text)` (escapes). Used by
  cutscene subtitles and the big title (`cinematics.js`), speech bubbles
  (`scene3d.js`), banter (`banter.js`), post-game subtitles
  (`postgame.js`), the Kiekdoar/phone feed (`phonefeed.js`), phone calls,
  contacts and history (`phone.js`), HUD cards (`hudcards.js`) and
  achievement titles (`achievementsui.js`). Anything shown through these
  gets its subtitle for free; a new text surface calls one of the two.
- Speaker names: every surface shows the name bold in the speaker's
  colour before the line, from one table, `js/speakers.js`
  (`SPEAKER_COLORS`, `speakerHtml(name)`, `paintSpeaker(el, name)`;
  generic NPCs neutral grey). A bubble shows a name only for a story
  character (`speechName` on a `world.extraSpeakers` entry).
- The narrator is Rikus, the Radio Nachtstreek night DJ (`NARRATOR` in
  `linevoice.js`): recaps and the epilogue cut to his studio
  (`js/radiostudio.js`, a closed room high above the city) and play his voice in a broadcast band
  (`playStoryVoice(src, { radio: true })`, a cinematic line's `radio`).
- New Frisian line: write it, add its Dutch to `FY`. `voice_coverage.mjs`
  exits 1 for any spoken line that `looksFrisian()` without a translation.
  Voice casts: Jelle/Durk/Douwe are recorded as Dutch with a Frisian
  accent; a bubble line with Gronings words (`GRO` or common dialect words)
  gets a "spreekt Gronings dialect" tag (`tts_lines_list.mjs`).

## Messages, phone and calls

There are no white toast lines. Three channels, all inside `#hud` (so
`--ui` scales them):

- HUD cards (`hudcards.js`, left under the health bars, below the "Nu op
  G-Music" card): `world.addMessage(text, seconds, opts)` or
  `showCard(world, { kind, title, body | text, duration, key, kicker,
  voice })`. Categories `missie`, `bijbaan`, `geld`, `politie`, `gevaar`,
  `prestatie`, `tip` (opts.kind, else keyword rules, else the running
  mission/bijbaan, else tip), each with accent colour and icon. "Prefix:
  rest" and "Short sentence! Rest" split into title and body. Redundant
  messages are dropped (`DROP`: death/busted, mission passed/failed, start
  location, mute, route set, the radio, ambient trains, pigeon bumps). One
  card at a time (see "Attention budget"), a short queue (dangers and police first; tips wait out the tip gap, important ones that teach a key or pass `important` longest, stale plain tips expire),
  the same key updates the card that is up; cards wait while a cutscene
  hides the HUD. `opts.exact` countdowns ("3", "GO! GO! GO!") are a big
  number in the middle. `cardlines.js` lists the few cards Tammo/Tessa say
  out loud (`react` class, lines manifest). Debug `window.__cards`.
- Objective line (`hud_panel.js` `currentObjective`, bottom centre, zone G): one
  objective at a time, the mission stage (`missionProgressText` split into
  objective and counter), else the bijbaan goal (its hint first, then the
  counter), else "Ontsnap aan de politie", else the next story step
  (`world.storyGuide`: its name and how to get there, smaller); pops in
  when it changes. Deliver missions say what to do ("Stap in Berends
  bakkie", "Rij naar het Boterdiep": def `vehicleName`, `destName`).
- Phone (`phonefeed.js`, zone A top left, see "HUD zones and rules"):
  - `notifyPhone(world, { from, app, title, text, duration })` (or push
    `{ from, text, duration }` onto `world.phoneNotifications`): a phone
    card. "KIEKDOAR(: | MELDT:)" texts become a Kiekdoar headline + body;
    `app` is `sikkom`, `bericht` or `geld`. One up at a time with a "+N"
    counter for the waiting ones; story texts (`story: true`) go ahead of
    waiting news, and Kiekdoar's own reactions wait 12 s after a scene. Everything lands in the Kiekdoar history (phone.js).
    Each card pings and is read aloud in the sender's voice (`smsvoice.js`,
    `call` class under the owner `sms`: it waits for a playing line, a call
    or a story scene instead of cutting in; the card stays up until the
    voice is done). A text with numbers or names passes `say`, a fixed line
    from `SMS_SAY`, and keeps its full text on the card; `voiced: true`
    (Kiekdoar clips, cows, the Krolbrug on the car radio) only pings. Kiekdoar
    news and app texts are read aloud at most once per 45/30 s
    (`attention.js` `mayVoiceText`); story texts (`story: true`) always.
  - `startCall(world, { from, lines: [{ speaker, text, sub }], live, onEnd,
    voice })`: an incoming call (or `live: true`: a Kiekdoar livestream).
    Rings, then plays line by line, each voiced from the lines manifest
    `"<speaker>|<text>"` (or `voice(speaker, text)` -> `{ src, dur }`) on
    the `call` class, which holds the channel for the whole call; unvoiced
    lines stay up for their reading time. `sub` is a second, smaller line
    (the Dutch under a Frisian/Gronings line). One call at a time, queued
    up to 90 s, waiting out cutscenes; a story scene ends a call early
    (`onEnd({ cut: true })`). `isCallActive()`, `hangUp()`, debug
    `window.__phonefeed`. New voiced call lines are registered in
    `scripts/voicelines_collect.mjs` ("Telefoon (gesprekken)").

## Attention budget

`attention.js` holds the rules for interrupting the player, in one place:
priority story > wanted/danger > money/achievement > discovery/flavour >
tips (`PRIORITY`, `CARD_PRIORITY` for the HUD card categories).
`mayInterrupt(kind, world)` / `noteMoment(kind)` gate the non-story
cinematic moments in cinematics.js (`wijk`, `landmark`, `ommelanden`: one
per 3.5 min together; `crash` 60 s; `wanted5` 2 min; at least 40 s between
any two; never during a mission, bijbaan, challenge, race or phone call;
discovery scenes not while driving faster than 50 km/u). A blocked
flyover or landmark stays unseen and plays later if the player is still
(or again) there. Story cutscenes, mission intros/outros and death/busted
are exempt, but when one ends it books a story-level moment, so no flyover
follows straight after an outro or the opening montage; the next story
step's text waits 2.5 s after any scene (`sinceCinematic`) and its
voorschot follows that text. On the HUD: one card at a time (`hudcards.js`, tips at most
one per 20 s via `mayShowTip`), one objective line, one phone card with a
"+N" counter (none during a call), key hints hidden while a card, a call
or car-banter subtitles are up, at most one world prompt (the E prompt, or
one place label when there is none), and during a call (`body.hud-call-on`)
the now-playing card, vehicle name and hints step aside.
`node scripts/attention_test.mjs` checks the rules.

## HUD zones and rules (`hudrules.js`)

The approved AAA HUD (mockups: Main, HUD-Rijden, HUD-Alles, HUD-Regels, in
the owner's design files) is eight fixed zones with at most one thing each:
A top left (messages: call > text > tip, `phonefeed.js` and `hudcards.js`
share it through `zones`), B top centre (mission timer + GPS turn card, a new
place's name), C top right (date and clock, stars, the search box, money
with its +/- delta, weapon), D the free centre, E left middle (achievement >
radio station), F bottom left (the rounded-square minimap, street and wijk,
health, stamina, the vehicle's damage), G bottom centre (objective, dimmed
under a subtitle), H bottom right (speed, gear row and rev arc, at most two
key hints). Layout values in `hud_panel.css` are the mockups' px / 1.2 (the
HUD zoom at 1920x1080), `--hud-edge` is the 46 px margin.

- `hudrules.js` is pure: `decideHud(situation)` answers what shows (stars
  only when wanted + 6 s, money 5 s after a change or near a shop, weapon
  only armed, bars only when not full or changing, vehicle widgets only in a
  vehicle, keys only with something to do, after 8 s without input only the
  minimap in Slim, at most 6 elements besides the minimap and at most two of message, radio/achievement and subtitle at once: P3 goes first,
  then the clock, money, keys, weapon). Priorities P0 (banner, dangers,
  police) to P3 (tips, radio, place name, money in); during a chase, fight
  or race (`hudNow.busy`) only P0-P2 show and P3 waits at most 30 s
  (`Deferred`), during a call or subtitle tips and the radio wait.
  `ZoneBoard` (`zones`) holds one occupant per zone.
- `hud_panel.js` `updateVisibility` feeds it every 0.1 s and toggles
  `hv-off` / `hv-in` classes (opacity, no layout change). Settings: `hudMode`
  `slim` (default) / `alles` / `minimaal` (pause menu > Instellingen >
  Weergave), `minimapZoom`, `minimapNorth` (`nooit` / `lucht` / `altijd`).
- `mapicons.js` (pure, `scripts/mapicons_test.mjs`): every map icon kind has a category (player, goal, mission, police, home, station, zorg, politiebureau, garage, job, fun, shop, horeca, flitspaal ...) with a minimum zoom and a priority. The full map queues its icons, drops the categories that are too small for the zoom, thins collisions (the highest priority first; goal, mission, police and home are never dropped) and draws them 15 to 24 px wide (`mapIconScale`) on a dark disc with a cream rim (`drawMapIconHalo`, so they read on sea, meadow and the darker land outside the province). The minimap uses the same halo and larger icons. Hospital and GP posts (red cross) and police stations (blue shield) come from `facilities.js`.
- `worldmarker3d.js`: the in-world objective marker: a ground ring, a thin light column of fixed height and an icon above it whose shape says what it is (start diamond, goal arrow, optional cube, door or shop hexagon, vehicle pyramid, checkpoint ring) in the map's colours (`markerColors`), with the distance; icon and label grow with the distance but stay capped. Used by missions.js (start and goal), sidejobs.js, postgame.js and the user waypoint in scene3d.js.
- `hudgps.js` (pure): `nextTurn(routeAhead, 400)`, `turnText`, `etaText` for
  the GPS card, shown only with a route, in a vehicle on roads, within ~400 m
  of a turn. `hudcalendar.js` adapts the game calendar (`calendarday.js`
  `todayInfo` / `todaySpecial`: the date chip and the special-day badge, small
  days like Marktdag stay quiet).
- `roadaccess.js` (pure): the travel mode (`lopen`, `fiets`, `auto`, `boot`,
  `ov`, `lucht`), `roadAllowed(road, mode)` (OSM highway type: no walking or
  cycling on trunk roads, no cars on footways and cycleways) and the
  minimap's zoom per mode. The minimap and the big map (`mapview.js`, mode
  selector in its header, opens on how you travel) emphasise the roads for
  your mode, dim the others and dash trunk roads red for walkers and cyclists
  ("niet voor jou"). A road may carry `acc` (bits foot 1, bike 2, car 4,
  bus 8) from the OSM tags (`foot/bicycle/motor_vehicle/motorcar/access/
  motorroad/bus/psv`, written by `scripts/process_osm.py` `access_mask` only
  when they differ from the class; the next `fetch_osm.py` run brings the
  tags, until then the class decides); `roadAllowed`, `navgraph.accessOf`
  and the routers read it first. `oneWayFor(road, mode)` (walkers ignore
  one-ways, cyclists on quiet streets), `offenceOf(road, mode)` and
  `ROUTE_MODE`/`MODE_OF_ROUTE` (router names `walk/bike/drive/boat/ov/fly`
  against these).
- `trafficlaw.js`: walking or cycling on a trunk road or the ring, a car on a
  cycle path or footway, a bike on a footway: a `politie` card at once, one
  star after `GRACE_S` (12 s) on it, once per stretch (re-armed 25 s after
  leaving), never more than one star from this alone; not during missions,
  jobs, challenges, for the emergency services, buses or in a train/heli.
  `main.js` calls `updateTrafficLaw` next to `updatePolice`. Two money
  fines when an agent is within 45 m: the phone (pause menu, Telefoon tab)
  opened while riding or driving (`checkPhoneWhileMoving`, called by
  `phone.js`, EUR 45 bike / 100 car) and cycling in the dark without a
  light (`updateBikeLight`, EUR 25, once per two minutes);
  `node scripts/fines_test.mjs`.
- `indicators.js`: turn signals (`[` `]`, D-pad left/right) and hazards
  (`P`, D-pad up) as `v.indicator` ('left' | 'right' | 'hazard'); a signal
  switches off after the swing is done and the wheels are straight; other cars
  blink while their heading swings. `models3d_vehicles.js updateIndicatorLamps`
  draws four orange lamps per vehicle (made on first use);
  `node scripts/indicators_test.mjs`.
- `lowhealth.js`: under 25 health a red vignette, drained colours (backdrop
  saturate), a heartbeat pulse and sound (`audio.js playHeartbeat`) and slower
  walking (`world.hurtWalk`, read by `player.js`); `hud_panel.js updateDamage`
  ticks it.
- `snackautomaat.js`: the Muurkroket vending machine at snack bars and the
  stations (E: EUR 3, a random eierbal, kroket or frikandel, +8 health);
  `node scripts/snackautomaat_test.mjs`.
- Street life, batch 1 (open-wereldleven; all names invented, text only, no
  voice): `streetlifedata.js` (pure: density by wijk profile and distance to
  the centre (`lifeDensity`, 0 beyond ~2.2 km: polders get none), time-of-day
  rules (`deliveryChance` x4 at dinner, `bikeBoost` rush hour and dinner,
  `pickWaterLife` rowing in the morning and evening, `slotChance`), the
  invented names (`De Reep`, `Noord-Nieuws`, `Wisselwiel`, `Bernhard met de
  Karretje`, delivery chains Happie, Flitsmaal, Gauw Gebracht), magnet loot and
  lines). `trafficfleet.pickBikeVariant(map, x, y, rng, {hour})` now also
  returns delivery riders (`model.delivery`, big cube bag), bike-share
  (`model.share`, coral front wheel), movers (`model.cargo` + `model.load`
  sofa/matras/plant/kasten) and shabby bikes with `model.noLight`
  (`nightlights3d.vehicleLightsOn` keeps their lamps dark); the news van is
  the `newsvan` fleet kind (`livery: 'nieuws'`, `v.isNewsVan`, one by day
  within 1.4 km of the centre, kept by `manageTrafficPopulation`). Boats:
  `boattypes.js` kinds `skiff` (single scull) and `acht` (cox plus eight,
  seats facing aft, `arms: 'row'` in `models3d_people.seatPose`, riggers and
  oars in `models3d_vehicles.rowFit`); `manageBoatPopulation` asks
  `pickWaterLife` per water polygon (an eight only on wide water, max 1; two
  skiffs, three stand-up paddlers). On foot: `cityprops.js` slots `seller`,
  `beggar`, `magnet` (rope and magnet like the hauler) and the fixed `bernard`
  (crate and cart; `getBernardSpot`), only on the city map (not the Ommeland);
  `streetlife.js` dresses them (`decorateScenePed`: `ped.look`, `ped.carry`,
  read by `scene3d.buildPedActor`), the E prompt (`streetLifePrompt`, wired in
  `prompts.js` and `main.js tryStreetLifeInteract`), coins, De Reep, magnet
  pulls and the rare old grenade (carry it, report it to an officer or a police
  station for EUR 120; nothing explodes, not saved), and
  `updateStreetLife` makes the odd student walk with a sofa, mattress or plant
  (`ped.carry`, `streetlife3d.js`). Tests: `node scripts/streetlife_test.mjs`.
- Open world, batch 2 (summer only; all text, no recorded voice, all names
  invented): `eventrules.js` (pure: the light earthquake, the blue-green algae,
  the Ontzet fireworks and the German tourists) played by `worldevents.js` (init
  and update from main.js, `window.__worldevents`). The quake is a respectful
  weather-style event (a rumble through audio.js `weapon` sub `rumble`,
  `world.quake` read by scene3d.js `quakeJitter`, parked bikes rattle, a few
  bystanders speak, one calm Kiekdoar line that names the fictional "Delfstof
  Noord"; never over a scene, a mission, a minigame or a call). Algae: on half
  the days the big lakes get green patches (`algaePatches`, deterministic per
  lake and day), "Niet zwemmen" signs on the shore and `world.algaeAt(x, y)`,
  which player.js uses for the swim penalty (slower, tires, a little health,
  never below 40). Fireworks: Gronings Ontzet 21:30-23:30 from around the Grote
  Markt, shells and bursts (fx3d.js) visible and audible from 2.8 km (`burst`
  with `far`), a finale at the end. Tourists: up to 12 German walkers (bubbles in
  German) in the centre on the bloemetjesmarkt. `muggings.js` +
  `muggingrules.js` (pure): berovingen in a few wijken after dark (the station
  and nightlife crowds, empty business parks): a thief snatches the wallet, you
  lose a share (20%, EUR 10-400), nobody is hit; run him down to get it back; the
  wijken carry an amber name and triangle on the map after dark (mapview.js) and
  a warning card on entering. `marktfiets.js` + roadaccess.js `isMarktFietsRoad`:
  the bike route over the Grote Markt (dashed lanes and a bike symbol painted by
  roadsurface.js, "Fietsroute" signs, a one-time hint in trafficlaw.js, a
  different one on a market day). Tests: `events_test.mjs`, `muggings_test.mjs`,
  `marktfiets_test.mjs`.
- Minigames batch 2 (`standactivity.js` builds the hub activity for a game that
  starts where you stand): `swimrules.js` + `zwembad.js` (Zwembad Het Natte Papier
  at the Papiermolenlaan: a dive on a marker, alternate A and D in rhythm, flip
  turns with Space, four lengths, records in seconds), `climbrules.js` +
  `klimtoren.js` (Klimtoren Zernike: hold A and D to reach and grip, never let go
  with both, big holds rest the arms, chalk once, falls cost four seconds and a
  try), `skirules.js` + `waterski.js` (waterskibaan at the long straight of the
  Kardinge lake, standing in for the Gruno-park: a boat, a rope, buoys, jumps over
  the wake). Lines in `minigamelines2.js`; `scripts/minigames2_test.mjs`.
- Text jobs (`casework.js`, pure, plus `choicepanel.js`, the panel): the side
  jobs `sidejob_boa.js` (BOA voor een dag: read the invented rule and pick the
  right fine), `sidejob_rechtbank.js` (carry a dossier and answer three questions)
  and `sidejob_cabaret.js` (heckle a Frisian cabaret act on the beat), all on the
  side-job core (sidejobs.js, `namedBuildingSpot` in sidejobkit.js); Backspace
  skips, wrong answers only pay less. `scripts/casework_test.mjs`.
- `node scripts/clearance_audit.mjs` lists the headroom under every road
  viaduct deck (most are 4.2 to 4.6 m; ramp feet over cycle paths are lower).
- `travelroute.js` (pure): `boatRoute` (grid A* over the water with shore
  clearance and bridge clearance, string-pulled, a goal on land ends at the
  nearest water), `trainTrip` (walk, station, train, change, station, walk
  with `uitstappen`, `changes` and `stops` for the signs; from the cab the
  start is the track under you), `airRoute` (a line round the no-fly zones, an
  altitude hint, the landing spot near the goal), `etaSeconds`. `routing.js`
  wraps them as `planBoatRoute`, `planTrainTrip`, `planAirRoute` and keeps
  `noFlyZones`/`landingSpots` (police stations are no-fly, 70 m; pads from
  `heliflight.js getHelipads`). Bridge and lock data for boats are not in the
  map yet: deck height from the z profile is all there is (`ctx.clearAt`
  hook); opening bridges and locks wait for the province tiles.
- `waymarkers3d.js`: buoys along a boat route, station signs at the stops of a
  train trip, air rings and a landing pad in the air; the bike ribbon takes
  its own colour. On the road the route ribbon and the waypoint beacon stay
  the markers. `scene3d.js` calls `updateWaymarkers3D` from the ribbon update.
- Boot screen (`#loading`, startscreen.js): dark green from the first paint
  (inline `--ui` script, Electron `backgroundColor`), the logo builds up,
  Gronings status lines rotate, no key to press: the menu waits for the menu gate (menuready.js) (runs with
  `?noattract|storytest|stil|trailer|benchmark|perf` skip the key), the menu
  slides in under it and the boot screen fades out over it
  (`dismissLoading`). The first tiles round the save are prewarmed meanwhile.
- Load screen (`loadscreen.js` + `.css`): Ken Burns picture from `img/laad/`
  (the game's own renders), logo, "Eerder in het verhaal" from the part's
  recap, the "Je gaat verder in" card and a progress bar from
  `scene3d.js streamPending()`; one short text line at a time rotates in the
  tip slot (where you are going or the story so far, then tips). Shown when loading a save (Doorgaan) and by
  `watchJumps` (main.js) for a jump over 700 m outside cutscenes.
- `node scripts/hud_test.mjs` checks the rules, the turn finder and the
  access table.

## Menus (`menu.css`)

`menu.css` is the one menu stylesheet (see DESIGN_SYSTEM.md, Menus);
`pausemenu.css`, `shopui.css` and `startscreen.css` only place things. The pause
menu (`pausemenu.js`) has a rail in three groups (Overzicht, Te doen, Kaart,
Telefoon / Verhaal, Spullen, Garage, Prestaties / Instellingen, Besturing, Cheats)
and one panel; the map section hides the rail and is the full screen. Q/E switch
the section's tabs (a section without tabs: the sections); `[` and `]` do the same
in tabbed sections. Footer hints are `HINTS` per section in pausemenu.js (keys or
controller glyphs, clickable). Settings pickers (`.m-pk`, previous / value / next)
replace the old segmented rows; the options live in `data-options`. The shop
(`shopui.js`) draws every shop and the station machine with the same panel;
an item may carry `cols` (extra values before the price) and `route` (the station's
travel card). The result screen is `showBanner` in cinematics.js, styled in
hud_panel.css. Screenshots for review: `desktop --smoke-test --perf-script` with a
script that opens each section and logs `[capture] name`.

## Narrative scheduler

`narrative.js` puts the story's items in one line, so nothing narrative
overlaps another or a cutscene. Each module keeps its own queue and asks
`mayStart(kind)` before it starts an item; it reports what plays or waits
through a probe (`registerNarrative(kind, { active, pending })`, sampled
every frame by `updateNarrative()` in main.js). Kinds: `scene`
(cinematics.js: every cutscene, the intro, the mission banner), `contact`
(storycontact.js: "Bel Rikus" and the other story contacts), `call`
(phonefeed.js calls), `text` (a story text on the phone), `say` (the
companion's remark when a step starts, story.js), `banter` (banter.js), and
the toasts `phone`, `award` (achievements.js) and `card` (hudcards.js).
- Nothing starts during a scene; talk waits 2.5 s after one, toasts 1.2 s.
- One talking item at a time (contact, call, remark, banter), 2 s apart.
- Banter waits for a contact or call that is ready, and 8 s after anything
  narrative; a running exchange stops after its line when one is ready
  (`storyWaiting`).
- A step's story text waits for its "Bel Rikus"; a contact lets a story text
  that is being read finish first.
- Toasts also wait while a subtitle shows (`sub-cine`, `sub-banter`), and the
  phone and HUD cards that are up step aside meanwhile (`heldBack`); the
  Kiekdoar news (sikkomfeed.js) is dropped then, since its voice plays at once.
- Toasts are held while a contact or call talks (HUD dangers, the police and
  the cards of a running mission or bijbaan excepted), and never pop up
  within 1.5 s of each other (`noteToast`).
- A contact cut off by a cutscene or respawn plays its rest later, except a
  "Bel Rikus" whose mission has started. story.js holds the recap, the end
  card and the Tammo/Tessa handover while something narrative plays, and
  attention.js lets no flyover start over talk (`narrativeBusy`).
`node scripts/narrative_test.mjs` checks the rules.

## Routes

`routing.js` keeps up to three routes at once, each in its own colour
(`hud_panel.js` `ROUTE_COLORS`): the player's goal (goal.js, purple), the
objective (mission/story yellow, bijbaan orange) and the care route (pink):
to the nearest snackbar, supermarket or kroeg when health is below 35 (until
50), or to the nearest garage/Pomp & Poets when the player drives their OWN
vehicle (hero or bought) below 55 health (until 90; never for stolen
vehicles). Priority: an active bijbaan or mission, then the goal (a mission
goal that still needs gear routes to the shop first), then the story step,
then the post-game guide. `setUserWaypoint(x, y, name, z)` makes a place goal
(`z`: a spot on a bridge deck).

Per travel mode (`route.mode`: `walk`, `bike`, `drive`, `boat`, `ov`, `fly`;
`route.etaS`, `route.compromise`, boat `route.dock`, air `route.alt` and
`route.landing`, train `route.uitstappen/changes/stops/legs`): the city graph
has a walk, a bike and a drive network built from `roadaccess.js` (never an
illegal edge; `planLandRoute(map, kind, a, b, { avoidMotorways, az, bz })` is
the strict version the tests hold to the rules; `route.compromise` marks the
two rule-bending fallbacks, `mixed` over a pedestrian area for a car-free goal
and `free` against a one-way at the data's edge). The Ommeland graph has a
foot network that leaves out the motorways (kind 1) and slows on links.
"Snelwegen vermijden" (a button on the map in Auto mode, `setRoutePrefs`)
makes motorway metres count 8x. A waypoint and the start snap to the nearest
road for the mode on the right level: a road on the other level (bridge
deck or the street under it, from the `z` profile) counts 40 m (start) or
12 m (goal) further away. The big map's mode buttons plan the goal for that
mode (`setRoutePrefs({ planMode })`, cleared when the map closes). The GPS
card gives turns by car, bike and boat, "Uitstappen bij" in the train and the
altitude and landing spot in the air. `node scripts/mode_route_test.mjs`
runs all of it on the city map and on the F0 tiles. `getActiveRoute()` is the primary one (goal, else
objective, else care: 3D ribbon, route chip), `getRoutes()` all of them
(minimap, full map, map header); `dismissCareRoute()` (the "Negeren" button
in the map header) hides the pink route until the need is over. In pigeon
mode every route is a straight line "as the crow flies" (`route.fly`,
dashed on the minimap and map, no 3D ribbon) and the minimap turns with
the pigeon's heading.

Shops (`shopui.js`): clicking or arrowing only selects (preview, detail
bar); the detail bar's button buys, expensive items and items flagged
`confirmText` need a second press. While a story gate is open (the current
step's `require` goal or the next mission's `requires`, read-only via
story.js/missions.js), shops.js `markGates` tags the vehicles that count
("Telt voor je missie", listed first) and warns on the ones that don't.
Spuit & Klaar shows your own vehicle in the chosen colour before you pay.
Every shop item can carry `preview` (a `vehiclepreview.js` spec: a vehicle,
`{ kind: 'weapon', weapon }`, `{ kind: 'person', look }` for the current
character in the chosen outfit or hairdo, or `{ kind: 'product', product }`
from `shopmodels3d.js`), `stats` (bars `{ label, v, to, text }`, `to` = after
buying: weapon schade/bereik/snelheid/munitie, vehicle stats before/after an
upgrade, gezondheid/pantser) and `effect` (a chip in the detail bar).
Rook & Geluk sells scratch cards and lottery tickets (`gamble` items with a
draw table; shopui.js plays the scratch reveal on `reveal`) and stamps every
other purchase on a spaarkaart (`state.stamps`, saved
with the shops); a full card pays a fixed prize. One small preview renderer
serves every shop (pixel ratio capped); its model is freed on close.
The panel scales with `--ui`. Shops that buy and sell list Kopen first.

## Heights

Groningen is flat and so is the world (y = 0), except the ringweg and its
grade-separated junctions: roads carrying `z` (one height per vertex,
metres above the terrain under it; the terrain is flat until an AHN raster
plugs into the solver's `terrain` sampler) run over viaducts and
embankments or through the sunken Zuidelijke Ringweg (open cuttings and
covered sections, under the Winschoterdiep as an aqueduct).

The profiles come from the network height solver
(`scripts/world/profile.mjs`, rules in `js/roadprofile.js`, run by
`build_map.py` after `add_elevation.py`, whose per-way heights are its
prior): one height per vertex shared by roads (joints are continuous by
construction), the grade limit per class (`MAX_GRADE`: trunk 5 %, links
6 %, urban 6-8 %), vertical curves (`MIN_RADIUS`), the clearance under every
grade separation by the class of what passes below (`CLEARANCE`: road
4.6 m, cycle/foot 2.5 m, rail 6.0 m, plus the 1 m deck; the tagged side
moves: a bridge rises, a tunnel sinks), tunnels at least 5.8 m under the
terrain (8.2 m under a canal), slip roads at their carriageway's height while
their lanes overlap; projections onto those constraints from the prior.
`node scripts/world/profile.mjs` audits the map (grades, curves, joints,
clearance; foot and cycle paths that OSM puts in a tunnel or on a bridge
are still at street level and listed as open, `--paths` gives them a
profile; `KNOWN_KNOTS` are OSM joints between ways that pass over each
other). Tiles carry the profiles in the heights section (below, "World
tiles"). `elevation.js` builds from them, once per map (`map.elev`), and
embankments, retaining walls, abutments and decks come from the profile's
difference with the terrain:

- `map.surfaceAt(x, y, state)`: the one height query, for whoever keeps a
  `state = { z, ribbon }` (its layer: its height and the road or rail deck
  it is on). It stays on its ribbon while on that ribbon's surface, however
  other decks, ramps and streets overlap it in plan (stacked roads); past the
  ribbon's end it takes the way that carries on (the same road first, so
  through traffic at a slip road's split stays on the main road); off an
  edge it falls to what is below. Vehicles (`v.surf`, the wheelbase and
  slope probes through `map.surfaceZ`), the walker (`player.surf`),
  pedestrians, the race track, cutscene paths (`cinedrive.js` pathHeights)
  and the GPS route ribbon use it. `map.ribbonAt(x, y, z)` gives the ribbon
  for something put down at a height, `map.spawnState(x, y)` the surface
  seen from street level (what `spawnZ` always gave).
- `map.groundHeightAt(x, y, zHint)`: the stateless fallback: the highest
  surface at most ~1.1 m above `zHint` - road decks, cutting floors,
  embankment slopes, else the street. Everything that has a height keeps its
  own absolute value: vehicles `v.z` (+ `v.pitch`/`v.roll` from the
  surface, falling off an edge or cresting a ramp fast goes ballistic, hard
  landings damage; `susPitch`/`susRoll`/`susHeave` are the drawn-only body
  springs), the player and companion `gz`
  (plus the jump height `z`; drops hurt), pedestrians `gz`, ragdolls.
  A patched `groundHeightAt` (the home's storey) is honoured by
  `surfaceAt` off the ribbons.
- Walls: retaining walls of cuttings (solid from inside, with a fence solid
  from the street), crash barriers on raised roads, abutments where an
  embankment meets a road passing underneath. `resolveWalker(..., z)` and
  `resolveVehicleBuildingCollision` use them. The steel crash barriers
  (not the concrete ones on viaducts) and the cutting fences are breakable
  (`w.brk`: 'vangrail'/'hek'): for the player's vehicle cityprops.js turns
  them into props like the bridge railings, and a knocked-out section is
  hidden in the roadstructures3d.js mesh (`w.collapse`/`w.restore`) until it
  respawns.
- `map.ceilingAt` (tunnel roofs, decks: the follow camera stays under them),
  `map.coveredAt` (the canal above the aqueduct is not water down there),
  `map.offStreetLevel` (no clutter, lamps, trees or spawns on the ring's
  heights), `map.spawnZ`.
- The open cuts as a mask texture (`cutmask3d.js`): terrain, canal bed and
  grass discard fragments over them near the player; streets and rails
  crossing a cutting get a deck.
  The mask has ~1 m texels, so the hole reaches a little past the walls:
  roadstructures3d.js draws a coping strip beside every open wall, a floor
  under every sunken carriageway, a floor strip between two carriageways
  without a wall, a portal with coping at every tunnel mouth, and
  `elev.skirts` (elevation.js, drawn only): low wall faces where a ramp
  starts down before a retaining wall is needed, beside a street at the top,
  and across the gaps between wall ends (`joinWallEnds`).

Nothing else needs to know about heights: vehicles on different levels
don't collide, and actors are drawn at their height.

### Track profiles

The track has its own profile per connected rail network
(`scripts/world/railprofile.mjs`, rules and the height query in
`js/railprofile.js`; docs/PROVINCIE-PLAN.md 2.11 "Spoor"): `rail.z` per
vertex (densified to 10 m where the track leaves the terrain), `rail.ly` (the
OSM grade order per segment: bridge, viaduct, layer) and `rail.el` (contact
line), matched by geometry to the rail ways in `data/railways_raw.json`;
`railPlatforms` (OSM `railway=platform` areas with their layer) go into the map
too. The solver: a level crossing's track at exactly the road's height; the
track along a platform level, on the terrain or, for a platform OSM puts on
layer 1 (Groningen Noord), at the height that clears every road under the
station; over a road it crosses away from a level crossing the road's
clearance, unless OSM grades the road above the track (the Emmaviaduct, the
Hereweg by the Verbindingskanaal), then the track stays down and
`profile.mjs` raises the road; grades of 1.25 %, 2.5 % within 900 m of a
place where 1.25 % cannot reach (exceptional); vertical curves of 5 km (2 km
there); tracks closer than 6 m (double track, yards, switches) share one
formation. Grade envelopes (lowest profile that clears everything, under the
highest the pins allow) and projections onto curves and grades. Where the
track cannot climb as high as a road under it needs, the road dips the rest
(`profile.mjs`: a car road crossing the track away from a level crossing is a
grade separation, the side OSM grades higher goes over; foot and cycle ways
within 250 m of such a crossing may ramp with it, and the road solve runs to
a fixed point, three passes). Pipeline: `add_railways.py`, `railprofile.mjs
--write`, `profile.mjs --write`, `railprofile.mjs --write` (build_map.py).

- One height query: `railHeightFn(map)` (the profile, else the radial
  `railLifts` of an older map) is `railway.js railZ` (trains, the car and
  bogie pitch, stations, cutscenes), `elevation.js` (embankments and decks
  carry walkers and cars; stubs under 0.5 m between OSM ways are left out, so
  no parapet stands across the track) and `profile.mjs` (the roads' crossing
  order). `profileLifts(rails)` gives the raised stretches to the probes.
- Constants: `RAIL_GRADE` 1.25 %, `RAIL_GRADE_MAX` 2.5 %, `RAIL_RADIUS` 5 km,
  `RAIL_TOP` 0.26 m (top of rail above the bed), platform top 0.76 m above
  the rail (`PLATFORM_RANGE` 0.76-0.84), `CATENARY_H` 5.5 m, the free height
  under a deck over any track 6.0 m (roadprofile.js `CLEARANCE.rail`).
- Audit (`node scripts/world/railprofile.mjs [--strict]`): every line of
  `railRoutes` end to end every 2 m through the query the trains use: jumps,
  grade, curves (20 m chords), level crossings at the road's height, level
  platforms, the clearance of every road crossing (road over track or track
  over road) and the contact wire under decks on electrified track.
  `node scripts/railprofile_test.mjs`: the solver on small networks, the map's
  audit, `railZ` against the profile and the rail lifts walked, driven and
  cycled up (`ringcheck.js probeRailLifts`).

### Water levels, bridges and the one water query

`js/waterlevels.js` (pure) and `scripts/world/water.mjs` (docs/PROVINCIE-PLAN.md
2.11 "Water"). `water.mjs --write` annotates the map: per water polygon
`body` (polygons whose shores touch), `kind` (`kanaal`, `diep`, `vaart`,
`vijver`, `sloot`, from the width of the channel it lies in: twice the largest
distance to its body's shore, so a sliver mapped under a bridge is the canal
it belongs to; exact distances in narrow water, a 2.5 m distance field
elsewhere), `lv` (the peil, m relative to street level), `dp` (depth) and
`nav` (largest boat class); per road that OSM tags `bridge:movable` its
`movable` kind (by OSM id, else by geometry: cycle and bus bridges carry no
id); `meta.locks` (OSM lock gates; none in the city caches). The largest body
is the stadsboezem (NAP -0.93 m, drawn at `util.js WATER_Y` -2.3); a body
that does not touch it keeps its own peil (a polder ditch -0.8 m), drawn at the
boezem height until the water renderer takes a level per polygon (F2).

- `waterAt(map, x, y, z?, opts?)` -> `{ level, depth, kind, covered, body,
  navigable, wade, lock, clearanceAbove }` or null: the water polygons of the map, the city's and
  the streamed tiles' alike (there is no other water source). `wade` is
  depth <= `WADE_MAX` 1.2 m. The
  walker wades through ditches and the shallow edge of open water (slower,
  standing in it: `player.wade`), the heli lands on the level the query gives.
- **The water rule (#101).** One finder, `waterPolyAt(map, x, y, z?, opts?)`: the water polygon holding the point (the map's own water grid, the city's and the tiles' alike); `waterAt` builds the answer from it. The two vetoes that used to be written out at every caller are arguments of the rule, not second finders: `z` (the absolute height of whoever asks: over the water on a viaduct, z > 1.5, or below it in an aqueduct, z < -3 where `map.coveredAt`, is dry; no z, no height rule) and `opts.bridgeDry` (a bridge deck at the point makes it dry: the walker's and the car's rule; a swimmer under a bridge, a boat and the plain polygon test leave it off). `opts.shallow` on `waterAt` is the vehicle's wade rule: only water of at most `WADE_MAX` with a peil of its own above the boezem's (a polder ditch, the shallows of a lake), dry under a deck. The wrappers: `util.isInWater(map, x, y, z = 0)` is `bridgeDry` (59 modules); `util.inMapWater` and `map.inWaterRaw` are the plain polygon test; `vehicle.overOpenWater` is `bridgeDry` with z, minus a road's embankment and minus `shallowWater`; `shallowWater` is `waterAt` with `shallow`; `waterNearby(map, x, y, r)` asks whether the water grid has water in the cells within r (a gull, a police boat or a pigeon looking for water round the player); `waterPolyIn(list, x, y)` is the same test over a list got once (a road's whole run in `mapdata.markDryRoad`, the footprint and furniture builders `derive.js` and `streetfurniture.js`). Test: `scripts/water_rule_test.mjs` (a made-up map, and the whole city grid against the formulas as they were written before; 0 differences).
  What stays apart, and why. (1) `waterindex.js` `inWater`, `waterClearance`, `waterIndexAt`, `insideWaterObstacle`: an index over the same polygons for bulk work (terrain holes, quay walls, grass, the shore edge flags) and a different question, the distance to the shore and to moored hulls, not "is this wet"; the test checks the index against the rule on the city (0 differences off the outlines; a point exactly on an outline is a coin toss in both). (2) `regions.seaAt`: OSM has no polygon for the open sea; `seaAt` is the coast chain and the islands of the province's edge layer, which also drive the land mask, the region names and the boats' clearance at sea (`setSeaClearance`). The sea has no water row (but the Eems and Dollard patches of `vaarnet.js`), so `waterAt` is null on most of it; letting it ask `seaAt` would change who swims or sinks out there. (3) `tilewatermask.js`, `scene3d` `syncWater`, `water3d.js`, `terrain3d.js`, `greenwater.js`: rasters and meshes of the same polygons for the GPU; the look is #87, the mask is checked against `waterAt` in `tilewater_test.mjs`. (4) `vehicle.updateOpenWater`, `tileplace.waterGap`, the `provinceworld` and `streetfurniture3d` water lists (the flat water of far tiles too), `shops.placeJetty`, `cityprops.findQuaySpot`: a distance to a shore or a polygon list to choose from, not a wet test. (5) The polygon a creature is bound to (`wildlife` ducks, seals and fish stay in their own polygon) and the candidate lists boats spawn from (`vehicle`, `police`). (6) The polder grid out past the tiles, `countryedge.countryWater`, goes with #3.
- Boats: `BOAT_CLASS` (1 paddled, 2 small motor boats, 3 tour boats and the
  city's barges, 4 inland shipping), `AIR_DRAFT` and `DRAFT` per kind;
  `bridgeClearance(road, zDeck, level)` (deck top minus 0.5 m minus the
  level: 1.8 m under a street-level city bridge; Infinity while a movable
  bridge is open), `passesUnder`.
- Audit (`node scripts/world/water.mjs [--strict]`): every navigable waterway
  sailed per class on the boezem's distance field (room for the beam plus
  0.5 m a side, depth for the draft plus 0.3 m, every bridge clearing the air
  draft or movable): the main channel per class, the polygons wide enough
  that it does not reach and the fixed bridges too low. On the city map: a
  canoe reaches 81 of 82 polygons, a sloep 79, a tour boat 62 of 81 (the
  rest narrower than its beam); a barge (class 4) is stopped by 70 fixed
  bridges at 1.8 m: the big canals' bridges need their real heights in the
  road solver (corridor work).
- Inland barges and marinas (#7): `spits` and `kempenaar` (boattypes.js, class 4) are picked by `pickWaterLife` on kanaal water 24 m or wider; `updateBoatAI` keeps a barge from sailing under a deck it does not clear (`waterAt().clearanceAbove`, feelers from the bow, a hard stop in the hull); `scripts/barge_test.mjs`. Marinas: `marinas.js` (pure planner: finger piers and berths from a quay edge, with a fairway left open) -> `scripts/world/marinas.mjs --write` -> `game/marinas.json` -> `marinas3d.js` (piers and moored boats near the player, `v.moored`); `scripts/marinas_test.mjs`.
- Movable bridges (`movablebridges.js`, drawn by `movablebridges3d.js`): a
  fixed cycle per bridge (`BRIDGE_TIMING`: warn 4 s, barriers 4 s, wait for a
  clear span, 9 s up, at least 14 s open, 9 s down, barriers 4 s;
  `raceWindow()`), opened by the horn of a boat in front of it
  (`hornAt`, player.js) or by a boat whose `needsOpening(bridge)` says so; a
  twin bridge within 30 m opens with it. While the leaf moves the span is no
  bridge (`road._open`: `map.isOnBridge` false, so a car that gets on it ends
  in the canal; `bridgeClearance` Infinity), the traffic AI stops at the
  barrier (`bridgeSpeedLimit`, beside the level crossings' limit), lowered
  barriers are solid for the player's vehicle and snap like a level
  crossing's (`loweredBridgeBoomsNear`). The leaf (one hinge, two for a
  bascule over 26 m, a swing span, a lift or retractable span) is one draw
  with vertex colours (`geomerge.js`) and is the deck while closed: quaywalls.js
  leaves movable spans out of the deck slabs, streetclutter.js their railing
  props (bridgerails.js keeps the walker lines while closed). scene3d.js hides
  the static road of a span that is not lying closed and keeps it out of the
  road batches.
- Locks (`locks.js`, pure): a chamber between two peilen with a gate at each
  end and its own level (`chamberLevelAt`): ready at one side, a boat asks
  from a side (`request`), the lock comes to it, the boat sails in (`enter`),
  the gate closes (6 s), the level moves at 5 cm/s (at least 8 s) and the
  other gate opens. The builder places them where OSM has lock gates
  (`water.mjs findLocks`) and gives each side its body and peil; the city's
  caches have none.
- `node scripts/water_test.mjs`: bodies, kinds and peil on made-up polygons, a lock's cycle,
  the query, boat classes against bridges, a bridge's cycle step by step (the
  span, the barriers, the AI, the horn), a boat never breaking a bridge
  railing (breakables.js: boats only meet water props) and the map's
  waterways per class.
- Ditches lie deeper in the Ommeland ground shader (`countryfield.js`
  COUNTRY_GLSL: a shadowed inner slope above the water line, darker water to
  the middle); the geometry cut belongs to the world builder.

### Street furniture

`js/streetfurniture.js` (pure; docs/PROVINCIE-PLAN.md 2.14) is the generator
the world builder calls per tile: `furnitureForTile({ x0, y0, size, roads,
mapped, places, opts })` -> `{ items, colliders }`. Items `{ k, x, y, z, a,
s, h, v, text, src, key }`, deterministic (no random, sorted by `key`; the
road order does not matter), each in the tile its position falls in; rules
walk whole roads, so a run carries on over a tile edge. Mapped rows (OSM, in
the map as `furniture`, `scripts/world/furniture.mjs --write`; tiles: the
FURNITURE section) and rules:

- guardrails: motorway and trunk carriageways and their slip roads between
  -0.9 and 1.2 m of profile height (above, the profile's crash barriers of
  elevation.js take over; below, a cutting's walls), on the right verge and the
  central reserve of a one-way carriageway, along the offset line (mitred,
  Douglas-Peucker 3 cm, 4 m sections), open 18 m round every join, never on
  another way; one rail on a central reserve the two carriageways share;
- gantries 140 m before every slip road that leaves a motorway or trunk
  carriageway: the road number and a real place ahead, the exit and a real
  place it leads to (`DESTINATIONS`, by bearing; no brands);
- hectometre posts every 100 m on the right verge of motorways and trunk
  roads with a ref (numbers along the ref's principal axis: invented,
  monotonic);
- lamps by road class (`LAMP_RULES`: mast, arm, lantern, path; height and
  spacing) with `opts.lamps` (the game draws its own lamps, nightlights3d.js,
  with the same rules: spacing and height by class, a taller pole lifting its
  head, light and pool), path bollards
  with `opts.bollards` (the city has streetclutter.js), woonerf plateaus with
  `opts.livingBumps`;
- mapped: guardrail, fence and noise barrier lines (sections), speed bumps
  and tables (across the road they lie on), benches, bins, bike racks,
  shelters, bollards, lamps (`mappedFromOsm`).

`furnitureColliders(items)`: breakables.js props (guardrail sections
'vangrail' and fence panels 'hek' break and respawn; gantry posts, noise
walls, bollards and shelters are static). `js/streetfurniture3d.js` generates
the tiles round the player (cached), draws one InstancedMesh per kind with
vertex colours (`geomerge.js`) and a draw distance per kind (`LOD`), the
signs of the 16 nearest gantries in one mesh over a canvas atlas, and streams
the colliders within 70 m through `breakables.js addPropStreamer`. Audit
(`node scripts/world/furniture.mjs [--strict]`): nothing a rule puts down on
a carriageway or cycle path (at the same level), guardrail holes under 5 m
that no crossing way explains (158 small ones where two carriageways merge),
one item per key, the same items twice. City map: 11.8k guardrail sections
(~47 km), 33 gantries, 191 hectometre posts, 190 fence panels, 1 speed table.
The caches hold few mapped objects; furniture.mjs documents the Overpass
query that fills them. `node scripts/furniture_test.mjs`.

### Trees and green

`js/greenery.js` (pure; docs/PROVINCIE-PLAN.md 2.15) and
`scripts/world/greenery.mjs --write`. A tree is `[x, y, sp, hdm, flags]`:
`sp` an index into `SPECIES` (linde, plataan, eik, beuk, es, esdoorn,
kastanje, populier, wilg, berk, den, and the Japanese ornamental cherry `kers`
in pink, a late bloom that stays all summer), its height in dm, flags
`fill` (put into a wood outline) and `row`. Each species has a height range
(mature street trees 12-20 m, poplars 22-30, willows and cherries low), a
crown shape (round, oval, spreading, columnar, weeping, conical), a crown
radius and clear stem, and leaf and bark colours. Where OSM names no species
(`speciesFromTags`: species/genus/species:nl/leaf_type) the rules
(`speciesFor`) pick by place: willow or poplar by the water, lime by a church,
beech, oak, birch, ash and pine in a wood, a mix by the class of the road; a
row of five or more trees (`findRows`) is one species. Wood and forest
outlines get trees on a jittered grid (9 m), cemeteries sparser with glades;
parks keep the trees OSM maps (the minigames and hidden things are laid out
round them), and the fill keeps clear of the minigame courses, the skatepark,
the kart track and the map's points (`gameplayClearings`). City map: 17.5k
trees (3.8k mapped, 14k in woods). `treeDims(t)` is the one shape: scene3d.js
draws four instanced meshes with colours per instance (trunks, leafy crowns,
conifers, and the far crowns of woods out to 260 m without shadows),
treeprops.js gives the trunk prop its species' radius, height and weight,
the camera's tree tests read it. Tiles: the TREES section rows carry `s`, `h`,
`f`. Mapped hedges (barrier=hedge) are furniture sections (`hedge`, solid).
Audit: no filled tree on a way, in a building or in water; the species mix.
`node scripts/greenery_test.mjs`.

The world builder (worldbuilder.js hooks, run per tile by
`scripts/world/build_corridor.mjs`) gets the same work from
`js/builderhooks.js` (`registerBuilderHooks`): the `greenery` hook gives a
tile's trees species, height and flags from the tile's own water, green and
roads and fills its forest outlines (ids from `FILL_GID0` per tile, so a tile
builds the same trees every time; the corridor writes `s`, `h`, `f` in its tree
rows); the `furniture` hook stores nothing, because the rule furniture is made
in the game from each tile's roads (streetfurniture3d.js).

### Building heights

Real heights and roofs (docs/PROVINCIE-PLAN.md 0.1). `scripts/world/fetch_3dbag.py`
reads the 3D BAG's official downloads (CC BY 4.0, 3DBAG by the 3D
geoinformation research group of TU Delft and 3DGI; credited in NOTICE.md,
docs/LICENTIES.md and `credits.js`): the tile index (`tile_index.fgb`, read by
its own small FlatGeobuf reader) and per tile the GeoPackage, cached in
`data/cache/3dbag/` (gitignored; the city map is 57 tiles, 133 MB), and
extracts per building the BAG id, footprint centre and area, `hmax` and `h50`
(the pand table's, else the highest `b3_h_max` and the area-weighted
`b3_h_50p` of its lod12_2d parts), `hg` (`b3_h_maaiveld`), the roof type,
storeys and year into `data/world/3dbag.json.gz` (committed, 1.8 MB, 81.6k
buildings). `js/buildingheights.js` `heightOf` walks the chain 3dbag,
osm_height, osm_levels, default: the ridge `hm` above the ground, the walls
`eave` (under a pitched roof as far under the median as the ridge is above
it; a median far under the ridge is a tower with a low wing: the tower's
height, flat; where the renderer cannot draw a pitched roof, `pitchedFits`,
the walls go half way up) and the roof (`roofOf`: 3D BAG slanted/horizontal,
OSM roof:shape). `scripts/world/building_heights.mjs --write` (pack_tiles.mjs
`joinAttrs`: by BAG id, else centre in footprint and area within 25 %) sets
on the map's buildings `h` (the walls in storeys of 3.1 m), `hm`, `rk` and
`hsrc`; landmarks keep their models and heights. models3d_buildings.js takes
the known roof over its guess by type and the ridge for the roof's height (the
far LOD too). City map: 95.8 % of the buildings from the 3D BAG (was 0),
0.02 % from OSM, 4.2 % default (mostly footprints the BAG does not have); no
built-up tile over 30 % default. `node scripts/buildingheights_test.mjs`
(the chain, the map, the drawn ridge, the readers on the cache). Refresh:
`python3 scripts/world/fetch_3dbag.py` (or `--list` for the tiles and
sizes, `--extract-only` without network), then `python3 scripts/world/building_attrs.py`
and `node scripts/world/building_heights.mjs --write`.

### Terrain

`js/terrainraster.js` (pure): a height raster per tile (`encodeTerrainRaster`,
`decodeTerrainRaster`: int16 cm relative to the tile's street level,
`sampleRaster` bilinear, `TerrainField` over the tiles that carry one; 0, flat,
elsewhere). `scripts/world/fetch_ahn.py --fetch` asks PDOK's AHN WCS (CC0)
for each 1 km tile resampled to 5 m (`dtm_05m`; GeoTIFF read by its own
reader: deflate, LZW, predictors) and writes `data/world/ahn/<tile>.bin` with
the street level per tile (the median of the AHN under the map's road centre
lines) in `index.json`; nothing is downloaded without `--fetch`, and the
rasters are not committed. Sizes: 80 kB per tile at 5 m, 4.5 MB for the city
map, ~260 MB for the province at 5 m (~26 GB at AHN's 0.5 m). The packer
puts a tile's raster in its RASTER section (codec 1, 2 bytes a cell), the
TileWorld keeps them in `map.terrain` (streamed tiles add and drop theirs),
`map.terrainAt(x, y)` reads it (flat on a GameMap). The height solvers take
it as their `terrain` sampler with `--terrain` (`scripts/world/terrain.mjs`);
until the renderer draws the terrain (F2) the game stays flat.
`node scripts/terrain_test.mjs`.

## Lanes

Every car road carries the lane model (docs/PROVINCIE-PLAN.md 2.12; set by
`scripts/world/lanemodel.py` from its OSM way's tags, in `process_osm.py`
for a new build and `scripts/world/lanes.py` on the current map):
`lanesFwd`/`lanesBwd` (`lanesBoth`), `lanes`, `turnFwd`/`turnBwd` (one
turn:lanes entry per lane, left to right), `placement`, `laneW` (NL widths:
trunk 3.25 m, urban 2.75-3.25), `widthSrc` and `osm` (the way id). A
one-way carriageway of a trunk, primary, motorway or slip road (and of a dual
secondary or tertiary road) is as wide as its lanes plus its edges: before,
each half of a dual carriageway had the width of the whole road (the N7
halves 12 m, drawn with four lanes each way where OSM has two). After
`lanes.py`, `profile.mjs --write` re-solves (slip roads couple to their
carriageway where the lanes overlap) and `ring_widths.mjs --write` brings
the race lap's half widths along. `lanes.js` `laneLayout(r)` places the
lanes across the carriageway (forward lanes right of the divider): the
markings (`roadsurface.js`: lane lines, the divider, turn arrows 10 and 40 m
before the end of a way) and the traffic AI (`vehicle.js` `laneOffset`: the
middle of the right lane, the left one when it sorts for a left turn) use
it. `scripts/world/audit_lanes.py` checks the map against the tags.
`placement` is kept but the ribbon is not yet shifted by it (the joints
would need a taper).

## Junctions

`junctions.js` `junctionModel(map)` is the one object per car junction node
(docs/PROVINCIE-PLAN.md 2.13) that the markings, signs, traffic lights, the
traffic AI and the tiles read: a control (`signals` where a signal
controller stands, `roundabout`, `priority` where a higher class road
crosses, `equal` where traffic from the right goes first, `graded` off
street level) and per arm a rule (`signal`, `priority`, `yield`, `exit`
for driveways and living streets, `right`, `free`) and a stop distance (the
edge of the crossing carriageway, where the haaientanden or the stop line
are). `yieldArms` (haaientanden and B6 signs) are exactly the arms with
`yield`; the AI (`vehicle.js` `junctionYieldLimit`) gives way by the same
Dutch rules (class, right before left, a left turn yields to oncoming
traffic, roundabout entries to the ring) and stops at the arm's stop
distance. Tiles carry it in the JUNCTIONS section (`junctionRows`).
`node scripts/junction_sim_test.mjs` checks the model and runs the AI
through the busiest signalised crossing, roundabout, priority and equal
junction on a seeded virtual clock (throughput, no deadlock, no more AI
knocks than the v0.29 AI). Junction surfaces with corner radii, islands
and per-lane stop lines are the next step (F1b).

Network audits: `node scripts/world/drive_audit.mjs [--all] [--solids]`
drives every road both ways at its speed with the player's car
(`ringcheck.js` `driveAcross`, 25 m on into the ways that carry on; knock,
jump, fall, sinking, push off) and probes every lane for solids
(`probeRoadSolids`); `scripts/network_drive_test.mjs` runs it strictly over
the main and profiled roads plus the ring's water crossings. Joints, grades,
curves and clearance: `scripts/world/profile.mjs`; lanes:
`scripts/world/audit_lanes.py`; voids, floating edges and z-fighting:
`scripts/mesh_audit.mjs`. In dev mode F8 shows the profile of the ribbon
under the player (`profileoverlay.js`).

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
  EIKEA landmark; bounds-matched patches remove the underground garages and bridge piers that the OSM build still carries and turn covered walkways into canopies), gas stations (`meta.fuel`) and padel sites (`meta.padel`:
  OSM `sport=padel` pitches grouped per site, named after their wijk). It lives outside
  stad.json: hand data next to the hand layer.
- Grote Markt and Vismarkt (`marktgebouwen.js`, notes and sources in
  `docs/markt-gebouwen.md`): `buildBuildingMesh` asks `marktKind(b)` first.
  - `'model'`: an own landmark-style model by name (Korenbeurs, Het Groot
    Handelshuis, Calmershuis, the kiosk), drawn with `LANDMARK_MATERIALS` and the
    `LM` helpers that landmarks3d.js exports.
  - `'facade'`: ordinary buildings with an open edge within 32 m of one of
    the `SQUARES` polygons, or with a mapextras `markt` key (a
    per-building override such as `drieGezusters36`). They get the
    historic-centre treatment: each street edge is split into seeded plots,
    and each plot has its own gable kind, colour, eave (0.3-1.9 m above
    the b.h body), windows, shopfront and roof volume on the body's flat
    top. The `NATALINI` and `POSTWAR` zones pick the Waagstraat complex
    and the postwar north wall mixes.
  - Geometry is a shell and a facade-detail mesh: the detail is hidden past
    the 'laag' detail radius and left out of unmerged batches. Both use
    `MARKT_FACADE_MATERIALS` (the landmark plain/brick/metal/tile
    materials and the interior glass, panes with `paneUV`), so the cells
    batch to a few draw calls.
  - Collision still uses the footprint; everything stays inside it below
    head height.
  - `scripts/markt_audit.mjs` counts the area's triangles and batched draw
    calls.
- The follow camera orbits at `ORBIT_RADIUS` and keeps `CAM_CLEARANCE` from
  nearby buildings, which must stay larger than the 0.5 m near plane.

## Graphics settings and performance

- `gfxprofile.js` holds the presets Laag / Gemiddeld / Hoog (`GFX_PRESETS`:
  quality, shadows, drawDistance, resolution, autoResolution) that
  Instellingen › Beeld applies with one click (preset cards; changing a
  control under "Zelf instellen" makes it "Eigen"). `quality` still picks
  the pixel-ratio cap, post chain (bloom only on hoog), shadow map size,
  night lights and bump detail; `resolution` scales the pixel ratio
  (render scale); 'laag' draws facade details (window frames, trims,
  shopfronts) only within 80 m.
- Zichtafstand (`viewdist.js`, pure): kort 150 m, normaal 350, ver 600,
  heel ver 900 (only the Hoog preset). The view distance sets the fog (far =
  1.02x, near rises with it), the far LOD's tile range, the Ommeland prop
  radius (`propRadius`: up to 620 m, beyond 'ver' 95% of the view distance,
  where the fog has nearly hidden the props and the skyline belts take
  over) and with it the country water, skyline near edge and country life;
  the camera far plane is set by the landmarks (1500 m) for both long
  settings. 'heel ver' acts as 'ver' while adaptive quality has stepped
  down (render scale under 90% or cpuLevel > 0; `refreshRenderScale`
  re-applies it). The default stays 'ver' (iGPU laptops): out of the box
  the settings are `GFX_DEFAULT` (Hoog with 'ver'), which the preset cards
  show as Eigen and the first-run advice treats as Hoog (`isDefaultGfx`);
  choosing Hoog gives 'heel ver'. Settings v7 changes no values: a file
  matching the old Hoog preset cannot be told from an untouched default. `scripts/viewdist_estimate.mjs`
  counts what each setting puts in range (centre: far-LOD tiles 22 -> 40,
  far buildings 8.5k -> 15.4k, ~185k -> 324k triangles; Ommeland: prop
  tiles 63 -> 111).
- First run: `startGfxAdvisor` (title screen, also during the attract
  intro) classifies the GPU string (`classifyGpu`: Intel iGPU, software
  renderers and mobile GPUs -> laag; Radeon iGPU, Intel Arc iGPU, GeForce
  MX -> gemiddeld; low texture size, cores or memory step down) and takes
  the median of a few seconds of frame times; when that points below the
  current preset a card offers it (`gde-gfx-advice` remembers the answer;
  never when the settings are no longer the default preset). `?gfxadvies`
  and `?gpu=<string>` (desktop `--gfx-advice[=<string>]`) force it in tests.
- Adaptive quality (`autoResolution`, on by default): main.js feeds every
  in-game frame's interval and main-thread time to `noteFrame`, judged per
  second by the medians (hitches do not count). Sustained GPU-bound frames
  (2 s, 3 s on Hoog) lower the render scale (down to 60%), sustained slow
  CPU-bound frames raise `cpuLevel` (fewer facade details, the shadow map
  every other frame); a step back up needs five good seconds and waits 15 s
  after the last change, doubled (up to 2 min) when a step up had to be
  undone. The canvas size and pixel ratio are only applied in `update3D`
  right before the render (`applyRenderSize`): resizing clears the canvas,
  and a cleared canvas left until the next frame shows as a black frame.
- Behind a menu the city keeps rendering at 30 fps (20 fps behind a sheet
  or the map, `MENU_FRAME_S`); in a game the shadow map is reused while
  paused.
- The benchmark (`runBenchmarkSuite`) runs the full cut on the current
  settings, then each other preset on the run's two heaviest shots; a
  preset's fps is the full average times its measured speed-up there. The
  result is a banner in Instellingen › Beeld with one recommended preset.
- `staticbatch3d.js`: the meshes of the buildings (and roads) in a 48 m cell are
  merged into one mesh per material from the buildings well inside the
  detail radius (15 m margin); a cell is unmerged at once when a member
  leaves the detail radius, is hidden or rebuilt. Hysteresis: a merged cell
  is only rebuilt for newcomers when there are a few (3, or a quarter) or
  the cell is then complete; until then they draw on their own. Roads
  merge by their nearest point (15 m inside the draw distance). A road's
  civil works (roadstructures3d.js: decks, walls, barriers) go into its
  road cell; a knocked-out crash barrier bumps its geometry's
  `userData.batchVer`, which redoes the cell. Merging is
  spread over frames (2 ms budget, roads 1 ms): first the pieces, then the
  merged buffers a chunk at a time (`finishWork`, a generator; the bounds
  are three's, computed over the chunks), and the cell swaps in when all
  is ready; the buildings' own meshes stay in the
  scene, hidden, for the camera's ray tests. `?nobatch` turns it off
  (and the wheel instancing below). On 'laag' (or a busy CPU) the facade
  details within their radius get their own batcher (`facadeBatcher`, the
  detail mesh only); roads use 96 m cells and two roads make a batch.
- `wheelinstances3d.js`: vehicle wheels keep their own meshes (spin, steer,
  skid marks) on a hidden layer; one InstancedMesh per wheel geometry and
  material draws those of the vehicles in (or near) the view each frame.
- The horeca pads and their bobbing badges near the player are one
  InstancedMesh each (the badge is a camera-facing quad, bobbing in the
  vertex shader).
- On 'laag' the Ommeland building facade shader (`countrybuilding.js`,
  `FACADE_LOW`) skips the brick and roof-tile textures and window frames.
- The minimap's Ommeland layer (`drawCountryMinimap`) is static: drawn into
  world-aligned 256 px tiles per half-octave zoom step (at most one new tile
  a frame, LRU of 40) and blitted. When the CPU is the bottleneck
  (simload.js level 2) the minimap redraws every second frame.
  Its water and meadow images (the 10 m water field is ~6 M pixels) are
  filled in row bands a few ms a frame from the title screen on
  (`warmCountryMaps`), not on the first tile.
- Loading: `window.__loadMarks` holds the boot timeline (ms since
  navigation: map, ommeland, init3D, countryEdge, world, systems, title);
  the desktop app's `--profile-load[=ms]` profiles the page load. The
  Ommeland row grouping (`ensureRows`, 40-60 ms) runs on first use (the
  skyline, while loading) or else when the title screen is idle. Large static polygons
  (water) use `pointInStaticPolygon` (edges bucketed in height bands).
- Load-adaptive simulation (`simload.js`): while `cpuLevel` is 1-2 the
  traffic, cyclist, scooter and walker targets drop to 75% / 55% (the
  farthest ordinary ones out past 110 m go first), traffic and plain walkers
  beyond 90 / 60 m think every second / third frame with the skipped time
  added, and walkers beyond 45 m animate at half rate. Player, mission,
  story, police, racer and scripted vehicles and people are never thinned.
  `window.__simLoad.force(n)` (perf runs: `PERF_SIM=n`) pins the level.
- Perf runs: `scripts/perf/run.sh` (fixed routes in the desktop build at
  1920x1080, dpr 1: city on foot, the ring by car, the heli over the
  Ommeland at 40 m/s, the pause menu, a settings sheet; frame and
  main-thread times, GPU timer query, long tasks, draw calls per frame;
  `--cpu-throttle=N`, `--preset=k:v,...`; `PERF_ONLY=village` adds the heli
  circling a village centre, `PERF_PROFILE=foot,ring` profiles several
  routes, `PERF_DIAG=1` lists draw calls per owner, `--hitch` adds the slow
  frames' breakdown), `scripts/perf/ab.sh` for
  interleaved A/B runs against another staged build (`GDE_STAGE_SRC`,
  `GDE_STAGE_OUT`, `GDE_GAME_DIR`).
- Main-thread profile per category: `docs/PERF-PROFIEL.md`. With `--hitch`
  a run also records the ms per frame of each hitchprobe section
  (`scripts/perf/sections.py` groups them); `GDE_PROFILE_OUT=<dir>` keeps the
  raw CPU profiles of `PERF_PROFILE` routes for `scripts/perf/categories.mjs`.

## Hitches and shader warm-up

- Every lit material has two program variants (night-light rig on/off).
  `scene3d.js` scans a slice of the scene per frame, compiles the unused
  variant through `KHR_parallel_shader_compile` (`renderer.compile` only
  starts the link) and draws the stand-ins once the programs report ready.
  Hidden objects are warmed for both variants.
- From the title screen on, one sample of every actor and effect that
  spawns later (all traffic models, police, wrecks, boats, people, animals,
  fire, explosions, splashes) is built one per frame and warmed the same
  way, and the fx/ko/gun pools exist before the game starts.
- `renderer.debug.checkShaderErrors` is off (the log fetch is a sync point);
  `?shaderdebug` turns it back on.
- City buildings and roads are built nearest first within a per-frame
  budget (raised for 1.5 s after a jump: teleport, train, respawn); until
  the ring is complete the far LOD's detail radius shrinks to the nearest
  building still missing, so it stands in instead of a hole. Water past
  45 m and people past a few ms also wait a frame. The map-edge layout is
  built during loading.
- Streaming is budgeted: new vehicle meshes (3 ms, one per frame beyond
  45 m), street-prop cells (one generate or build per frame), grass chunks.
  Particle pools only upload their buffers while something is alive.
- No CSS `filter` or `mix-blend-mode` over the canvas: screen-wide tints
  (death, bust, slow motion) and the trailer's cut flashes are uniforms in
  the last post pass (`postfx3d.js` `screenFx`, `flashScreen`); only 'laag'
  on a natively antialiased canvas has no pass and falls back to CSS
  (body without `gpu-screenfx`). The trailer look runs in the grade pass
  only.
- Instanced pools (country props, herds, grass, birds) upload only their
  used instances (`markInstancesDirty` in util.js), not the whole capacity.
- `?hitch` (desktop: `--hitch`) enables `hitchprobe.js`: per-section frame
  timings, time spent in blocking GL calls, new shader programs and their
  owners, large buffer uploads; read `window.__hitch.summary()`. The desktop
  app's `--perf-script=<file>` runs a script in the page after starting a
  game and logs its result; `console.log('[capture] name')` from it saves a
  screenshot. `--bench-eval=<file>` runs a script every time the page loads
  (e.g. a tracker that tags every geometry/texture with its creation stack).
- GPU memory stays flat: streamed-out actors free their geometry, materials
  and skeletons (bone textures) in `disposeObject`; warm-up stand-ins of a
  since disposed source are dropped instead of drawn (a draw would upload it
  again); the per-road and per-water-polygon geometry caches keep only the
  most recently shown ones (LRU, like the building parts).

## Geometry worker

- `geoworker.js` is a module worker that runs the kernels in
  `geokernels.js`: plain data in, typed arrays out (sent back as
  transferables). Kernels use three's math and buffer classes only, never
  the scene or the DOM. `geojobs.js` `runGeo(kind, data, done)` queues a job;
  the caller only wraps the arrays in a BufferGeometry. Without module
  workers, under the story test, with `?noworker`, or after a worker error
  the same kernel runs on the main thread and `done` is called before
  `runGeo` returns (open jobs are redone that way).
- `cityprops` cells: the distinct prop geometries and every item's matrix
  go out; the merged positions, Int8 normals, colours, Uint16 uvs and the
  bounding sphere come back. The cell's breakable props register when the
  buffers arrive (`buildToken` drops a stale result).
- City road surfaces (`roadsurface.js`): on the first `syncRoads` the worker
  loads its own copy of the map (`stad.json` + extras, the same
  `GameMap`) and drops the roads the main thread no longer has (`home.js`);
  `slimWorkerMap` then drops what the worker never reads (buildings keep
  only their bounds in the grid; canopies, trees), which takes the copy from
  64 to 33 MB of heap (`scripts/perf/mapmem.mjs`); roads are matched by
  `roadKey` (class, type, width, points). `roadGeometryReady(r)` requests a
  road's sidewalk, carriageway and marking geometry
  (`roadSurfaceGeometries`, the code `buildRoadGroup` uses) and returns
  false until it is back; `syncRoads` then lets the far LOD cover from the
  nearest road still on its way. The first request of a road also brings
  its civil works (`roadstructures3d.js` `structureArrays` /
  `overpassDeckArrays`: decks, piers, embankments, retaining walls, fences,
  crash barriers, tunnel roofs, cutting floors) as positions and normals per
  material; `structureGroup` wraps them on the main thread and hooks the
  breakable fence and barrier sections (`w.collapse` / `w.restore`) to the
  main thread's own wall by its place in `elev.walls` (checked by its first
  point; on a mismatch the road builds them here). They are kept on the
  road for good, so later requests leave them out. Collision data
  (`elev.wallGrid`, the walls) never comes from the worker. Until the
  worker's map is ready, roads build on
  the main thread as before.
- City shores (`quaywalls.js`): `shoreParts` (walls, banks, aprons,
  houseboats, bridge decks as geometry, plus the bank seats and houseboat
  hulls it places) runs on the worker's map once that is loaded; the map
  rectangle and the real water field go along once (`shoreInit`). A
  polygon is named by its place in `map.water`. `requestShore` hands the
  group to `scene3d.js` `buildWaterMesh`, which adds it to the water group
  when it arrives; the seats (`bankSeatsNear`) and hulls
  (`addWaterObstacle`) are applied then, on the main thread.
- Terrain (`terrain3d.js` `terrainArrays` / `terrainGroup`): built in the
  worker while the game loads; `init3D` adds an empty group with the
  material, and `main.js` awaits `terrainReady()` before the title screen.
- Results must stay identical to the main-thread build:
  `scripts/perf/geocheck.sh` compares the old code, the kernel on the main
  thread and the worker byte for byte (city cells round the centre, ~200
  water chunks round the map, every road with its civil works, every city
  shore, the terrain),
  and the road batch cells against the old one-frame finish. The kernels
  share their code with the main thread (`geokernels.js`,
  `roadSurfaceGeometries`, `shoreParts`,
  `terrainArrays`), so a change there reaches both;
  the check should pass after it.

## World tiles (`.gdt`, F0 of docs/PROVINCIE-PLAN.md)

The map reaches the game as tiles, one code path in the browser, Electron and
Node; the packer reads `game/stad.json` (the hand layer of the city: meta, roads, rails, hand-made buildings; see docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md 4.5), the OSM tile build's water, green, trees and buildings for the city (`stad_laag.mjs`) and `mapextras.json`. A
build without `world/` (the dev server) gets stad.json alone: roads, rails and the hand-made buildings.


- **Format (`js/gdt.js`).** Tile grid on the RD kilometre lines (key = RD km of
  the south-west corner, `234_581`; in the world frame x = 330 + 1000 i,
  y = 75 + 1000 j). A blob is `GDT1`, format and builder version, the tile, a
  section table (type, version, offset, length, rows) and the sections; one
  STRINGS section holds every string. Table sections are columnar: per column
  a kind per row (absent, null, bool, number, string, points, number list,
  json) and one value stream per kind. Numbers are integers or exact
  centimetres, else float64 per row, so a round trip gives the same doubles;
  points are tile-local centimetres, delta + zigzag varints, all dx then all
  dy. The heights section (`SECTION.HEIGHTS`, version 1) holds the vertical
  profiles: per profiled road its `gid`, `z` (m per vertex, exact cm), `pnet`
  (its connected network), `st` (per segment: 0 ground, 1 deck, 2
  embankment, 3 cutting, 4 tunnel; `roadprofile.js` STRUCT) and `ly` (the
  OSM grade order per segment); the road rows carry no `z` of their own and
  `tileworld.js` joins the profile back by gid, so meshes, colliders and the
  height query read one profile. The AHN terrain raster is a RASTER next to
  it when one was fetched (below, "Terrain"). The FURNITURE section holds the
  mapped street furniture, TREES rows species, height and flags. Section types
  reserved for the rest of F1: pois, overlay (`SECTION`). Readers skip unknown
  sections and refuse a newer format. Hashes are two xxh32 (16 hex digits).
- **Packs (`scripts/world/pack_tiles.mjs`).** The GameMap's arrays after its
  load-time derivation (doubled footprints, canopies, houseboats, roof steps,
  ways cut at a wall, dry crossings, trees off the carriageway) are cut into
  tiles: each object, with its `gid` (its place in the array), is written
  into every tile its bounds touch. Tiles are raw-deflated, 8 x 8 tiles to a
  pack named by its hash (`p0_0-<hash>.gdp`), plus `global-<hash>.gdp` (meta,
  stations and routes) and `index.json` (per tile: pack,
  offset, length, raw size, hash, counts, tallest building; the pinned city
  set). Same input, same bytes. Per building: `hm` (the ridge in metres),
  `eave`, `rk` (the roof) and `hsrc` (`3dbag`, `osm_height`, `osm_levels`,
  `default`), the 3D BAG's `hmax`/`h50`/`hg`, roof, colours, materials, BAG
  year and id (below, "Building heights"). `game/world/` is a build
  artifact (gitignored); `desktop/build.mjs` packs it into the stage, cached by
  the hash of its inputs in `desktop/.world-cache/`.
- **Loading (`js/tileworld.js`, `js/tilestore.js`).** `loadTileWorld('world/')`
  reads `index.json`, the global blob and the pinned city tiles through a
  `ByteSource` (`HttpRangeSource`: Range fetches, the same on the web and on
  Electron's `app://` protocol; `MemorySource` in tests; a remote
  download-on-demand source is another `ByteSource`), decodes them (inflate +
  decode in `tileworker.js`, or inline) and builds a `TileWorld`.
  `TileWorld extends GameMap` and `GameMap.fromParts` skips the derivation,
  so the query API (`buildingsNear`, `roadsNear`, `waterNear`, `greenNear`,
  `treesNear`, `nearestRoadPoint`, `escapeBuilding`, `isOnBridge`,
  `groundHeightAt`, `isOpenSpot`, `queryView`, ...) answers exactly as before
  (`scripts/tileworld_test.mjs` compares them at 4,000 points). Tiles that
  stream in or out go through `addTile` / `dropTile` (reference count per
  object, into the same grids) on the `FrameQueue` (a few ms a frame).
  Until F1 the systems read whole arrays and one elevation model, so the
  city is pinned; the arrays and the elevation model keep to the pinned set.
- **Store.** `TileStore` keeps an LRU of decoded tiles under a byte budget
  (150 MB), pins, a request queue by priority with `AbortController`
  cancellation (`cancel(token)`), at most four reads at once, and
  `prefetch(x, y, { vx, vy, radius, ahead })`: the tiles within radius plus
  speed x 10 s, scored by distance minus speed x 8 s x cos to the heading;
  tiles are dropped only after ten seconds outside radius + 300 m.
  `main.js` calls `map.follow` each frame with the camera or the player.
  `missing(keys)` and `TileWorld.prefetchPoints` are the hooks for a
  teleport or a cutscene pre-roll.
- **Floating origin (`js/floatingorigin.js`).** `renderOrigin.toRender(x, y)`,
  `rebaseIfNeeded(camX, camY)`, `attachRoot(group)` and the `uRenderOrigin`
  uniform; inert at (0, 0) until tile-local geometry exists (F1). Tested at
  +-40 km (`scripts/floatingorigin_test.mjs`).
- **World builder (`js/worldbuilder.js`, F1).** One generator for every tile:
  `buildRoad` (class, lanes and width from the lane model, access, grade,
  the kom speed on a village street), `buildBuilding` (an OSM outline keeps
  its tag; a box from the Ommeland gets a city type from its form; `h`
  storeys, `hm` + `hsrc` from the best height evidence, `roof`), `buildWater`,
  `buildRail`, `buildGreen`, `buildPoi`, `applyDuals`, and `registerHook` /
  `runHooks` for the furniture and greenery scatter. Adapters: `fromOsm`
  (raw OSM), the old Ommeland cache (`fillOldExtent` in build_province.mjs),
  pack_tiles.mjs (`heightFields` for the city's rows). `scripts/worldbuilder_test.mjs`
  checks that `fromOsm` over the city's own raw caches gives
  process_osm.py's rows.
- **Proefstrook (F1).** `scripts/world/corridor.mjs` (the tile set: rail and
  road strips and town discs, places from the cached place nodes),
  `fetch_corridor.py` (Overpass per 8 x 8 km pack into
  `data/world/corridor/c<pack>.json.gz`; not run by the build),
  `build_corridor.mjs` (each tile from the best cache through the world
  builder; ways cut at the tile edge with shared end points; packs
  `c<pack>-<hash>.gdp` and `index-corridor.json` with places, stations, rail
  routes, bus lines and the coastline). The stage builds it next to the
  city. `loadTileWorld(..., { extra })` merges such a layer (`mergeIndex`, the
  city's tiles win); main.js always reads its places (`worldplaces.js`) and
  with `?corridor` (desktop `--corridor`) streams its tiles, counts them as built world for the
  facilities and the trains, and runs the train routes on over the
  corridor's track (`corridorrail.js`). `worldedge.js` holds the edge rules
  (sea, border, the border-bridge rule, air). `node scripts/corridor_test.mjs`
  (`--quick` without the streaming runs, `--json` for the numbers).
- **The whole province (F2a).** `scripts/world/extract_province.py` reads the
  Geofabrik extract (`data/cache/groningen-latest.osm.pbf`, pyosmium in a
  venv under `data/cache/venv`, two passes: relations, then everything with
  node locations; multipolygon rings joined) into the same slim pack caches
  as `fetch_corridor.py` (`data/cache/province/c<pack>.json.gz`), plus
  `province.json.gz` (outline, places, stations, bus and train route
  relations, a building-density grid) and `facilities_raw.json.gz`
  (`scripts/add_facilities.py --cache`). `--near` cuts a neighbour's extract
  (Friesland, Drenthe) to a 4 km strip along the border (12 km for the
  facilities); Germany has no strip yet. `scripts/world/build_province.mjs`
  builds every tile within 3 km of the outline, pack by pack, through the
  corridor builder's `tileBlob` (one per-tile path: clip, hooks, nav, flags
  1 + 4 + 32, 8 inside the old Ommeland box, 16 in the buffer strip) into
  `v<pack>-<hash>.gdp` + `index-provincie.json` (places with districts,
  stations, train lines over the track from the OSM route relations, coast
  and border lines, outline, the base map's meta) + `provincie-bus.json` and `provincie-roads.json.gz` (the car roads of
  all packs, the route graph's source: `roadgraph.js`, used by `routing.js`
  and `police.js`); the city's tiles are built to their edges (`stad_dekking.mjs`: the tiles themselves are the city's
  coverage, no overlay tiles any more) and the tiles beside them leave out what the city takes (`outsideCover`); `province_map.mjs` paints the base map pyramid (`provmap/z0-3`, 160 to
  20 m a pixel, PNG). The stage builds it when the caches are there. In the
  game the tiles always stream; `provinceworld.js` makes the polder blocks
  under the streamed tiles real blocks (`countryfield.js setProvinceBlocks`,
  the `uProvBlocks` texture in the ground shader: no procedural roads,
  maaren, villages or farms) and keeps the countryside's props off real
  roads, buildings and water (`provinceworld.js`, through `countryedge.js setExtraBlocked`). Streamed
  tiles are drawn by the city's own detail streamers (they read the tile
  world's grids) and, past the detail radius, by `farlod.js` stream tiles
  (`TileWorld.onTiles`); their water is `flat` (drawn by the far LOD, kept
  off the water grid, `flatWaterNear`) until the province has its water
  model. `corridorrail.js provinceRailLines` runs every city route on
  over the real track (and a Veendam branch) at build time, `cityroutes.mjs` writes it
  with the countryside's track, turbines and pylons in `provincie-land.json`; `provincemap.js` puts the base
  map under the full map. `node scripts/province_test.mjs` (`--quick`
  without streaming).
- **The province gets the city's building derivation (A2 of
  docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md).** What the `GameMap` constructor
  works out from raw footprints lives in `js/derive.js` (`deriveBuildings`:
  bridge machinery dropped, doubled footprints merged, platform roofs and
  `building=roof` split off as canopies, footprints on a ring carriageway and
  houseboats that cannot float dropped; `liftNestedRoofs`), and `mapdata.js`
  calls it (`pack_tiles.mjs` output is byte-identical). `build_province.mjs`
  runs the same code per pack through `scripts/world/derive_tiles.mjs`:
  footprints kept 1.5 m off a ground-level car road (`building_clearance.mjs`;
  the city's `game/citymap.json` is untouched), the derivation, roof steps
  (`lift`) and footways cut at a solid wall (`passages.js clipWaysInBuildings`).
  Canopies go in the tile's CANOPIES section (`tileBlob` kind `canopies`, by
  centre like a building) and `canopies3d.js streamCanopies` draws them per
  streamed tile (the city's `buildCanopies` is unchanged). Not in the province
  yet: OSM `building:part` (the extract does not keep it) and the museum plan.
- **Street-level detail in the province (A6).** `fromOsm` turns
  `natural=tree_row` into a tree every 6 m (`process_osm.py`'s rule for the
  city; each row has a `rowSeed`), and the greenery hook (`builderhooks.js`)
  gives a tile's trees what `scripts/world/greenery.mjs` gives the city's: one
  species in a row (`findRows`, or the tree row's own seed, flag `row`), the
  church's trees, OSM leaf type and height. With `ctx.signs` (the province
  build) `mappedSignsFromOsm` adds stop and give-way signs, marked crossings,
  gates, barriers and post boxes as FURNITURE rows (nothing draws them yet).
  `nightlights3d.js` puts a lamp where OSM maps `highway=street_lamp` (the
  tiles' `lamp` rows) before the rule lamps of the roads fill the gaps.
- **Lanes, junctions and traffic lights in the province (A4).** The lane
  model was already in the road rows (`laneFields` from the OSM lane, turn and
  oneway tags). `scripts/world/junction_tiles.mjs` runs the city's own code
  (`junctions.js junctionModel` and `autoSignals`) over a pack's road rows with
  its lights: the OSM nodes `highway=traffic_signals` and `crossing=traffic_signals`
  snapped onto their road (2.5 m, a cycle path only: `bike`, else dropped, as
  `add_traffic_lights.py` does for the city), plus the busy crossings the
  rule adds (`auto`). `tileBlob` writes them as `signals` FURNITURE rows and
  the nodes of a tile as its JUNCTIONS rows (control, and per arm the road
  piece of that tile, the node's vertex in it, the direction, rule and stop
  line in metres; the rows `pack_tiles.mjs` writes for the city). Neither the
  city's nor the province's JUNCTIONS rows are read by the game yet:
  `junctions.js` still works the model out from `map.roads` and
  `meta.trafficLights`, so streamed tiles join it with the road-by-tile work
  (B3). Heights (`z`) are A3: until then no node counts as graded.
- **Tests.** `node scripts/world_tiles_test.mjs` (codec, determinism, round
  trips, the building attribute join), `node scripts/tileworld_test.mjs`
  (equivalence, streaming on a virtual clock, ranges), `node scripts/floatingorigin_test.mjs`,
  `node scripts/rdnew_test.mjs`, `node scripts/landfile_test.mjs` (the land file of the
  tile build: routes, track, turbines, pylons, and the queries that replaced
  the old Ommeland layers: water gap, built-up share, the cover, a village's
  shore).

## Saves and versions

One savegame (`savegame.js`, localStorage `gde-save-v1`) and one settings file
(`settings.js`, `gde-settings`), each with a version `v`. `savemigrate.js`
holds both migration chains (`SAVE_MIGRATIONS`, `SETTINGS_MIGRATIONS`) and
the generic `runMigrations(data, migrations, to)`: an older file runs through
every step, `n -> n + 1`, on a copy, before anything reads it.

- **The guarantee:** a save or settings file from 1.0 on keeps loading in
  every later version. A change to what is saved raises `SAVE_VERSION` (or
  `SETTINGS_VERSION`) and adds the step from the old version; a released step
  is never edited. Renamed ids (a step, a vehicle, an outfit) get a mapping
  in that step, since the section loaders drop ids they do not know.
- The sections inside the save (`story` `v: 1`, the shops, the bijbaantjes, ...)
  keep their own tolerant loaders (unknown ids are dropped, missing fields get
  defaults); their own `v` stays 1. Only the top-level `v` moves.
- `readSave` migrates, and before the first migration of a save keeps the
  untouched JSON in `gde-save-backup`. A save from a newer game (`v` above
  `SAVE_VERSION`) is not read, and is copied to the backup before this
  version saves over it or Nieuw spel clears it. `applySave` migrates too, so
  a test can hand it an old save directly.
- Versions: save 1 (0.2-0.24), 2 (0.25: the kill counters become
  `knockouts`/`pedKnockouts`/`copKnockouts`, the steps 0.22 retired leave the
  story save), 3 (0.27: one radio station), 4 (0.28: the streken), 5 (0.28, 18+: the knockout
  counters become `kills`/`pedKills`/`copKills` again, `copCarsWrecked`
  added to kills and copKills). Settings 1-8: see the comments in
  `SETTINGS_MIGRATIONS` (8: the `gore` switch is back).
- `storyarc.js` `nextStoryStep`/`stepDone` are the one rule for "which step is
  next", used by story.js and by `savedStoryStep(save)`.
- Save 3 (0.27): `radio` becomes `'on'`/`'off'`. Save 4 (0.28): `streken`
  (`{ v: 1, unlocked, on, used }`, cheats.js), filled for an older save with
  the streken its story already earned (`cheatlist.js` `cheatUnlocksFromSave`).
  Save 5 (0.28, 18+): knockout counters back to kills. Save 8 (0.30, F0; 7 is the calendar): the world frame
  is RD New; the player, the own vehicles (with heading) and the goal marker
  move to the same real place (`legacyToWorld`), and the save gets
  `frame: 'rd-new'`.
- `node scripts/save_migration_test.mjs` runs every fixture in
  `scripts/fixtures/saves/` (saves in the shape 0.4, 0.21, 0.22, 0.23 and 0.24
  wrote them, a save from the future, two old settings files) and checks that
  each continues at an existing step with money, mission progress, garage,
  outfits and prestaties intact. Add a fixture for every release that changes
  the save.
- The lifetime stores beside the save (prestaties `gde-prestaties-v1`, hint
  progress, the menu's last tab, ...) are read field by field and ignore what
  they do not know, so they need no chain.

## Error log (`js/errorlog.js`)

The first import in main.js, so it is listening before anything else runs.
`window` `error` and `unhandledrejection` and every `console.error`/`warn`
go into a ring buffer of 40 entries (the same message counts up on one
entry), in memory and in localStorage `gde-foutlog`. An entry has the
message, the stack, the game version, the story step, a settings summary and
the GPU class (`setErrorContext`, set in main.js from story.js and
gfxprofile.js `classifyGpu`). `scrub` cuts paths down to the game's own
folder (`js/story.js:12`) and blanks user folders, so no user name ends up in
the report. Instellingen › Foutrapport (pausemenu.js) lists the newest
entries with "Kopieer naar klembord", "Wissen" and, in the desktop app,
"Opslaan als bestand" (`gdeDesktop.saveTextFile`, `gde:save-text`: a save
dialog in main.js). Nothing is ever sent and there are no network calls;
the privacy line in Over, the README and docs/LICENTIES.md §5 say so.

Lost, restored and failed WebGL contexts (the game canvas and the shared
preview renderer) always get an entry (`blackframe.js` `watchContext`).
`?zwartcheck` (desktop `--zwartcheck`, or `window.__blackCheck`) also reads
back the centre and corners of the canvas at the end of drawn frames (right
after a renderer event, otherwise every 120 frames: a readback waits for the
GPU) and logs a black frame, or a dark full-screen overlay, with the
renderer state and the events just before it.

## Name and logo

The title is **GDE Groningen – Zomer vol misdaad** (GDE = Grootste Diefstal
Ever); `js/logo.js` holds the parts. The wordmark is HTML/CSS (`.gde-logo` in
`index.html`): "GDE" in Big Shoulders Display Black with the cream-to-green
fill, the place in white on a green place-name-sign plate (inset white
border, rounded corners), the subtitle in italic Arial Narrow, and on the
title screen "Grootste Diefstal Ever" in small spaced caps. It is sized in
`em`, so one `font-size` scales it: loading screen, title screen, the pause
menu rail (`.pm-logo`, without the subtitle), the trailer and intro logo
cards, and the end credits (`playCinematic({ logo: true })`, which puts it
in `.cine-big` over a dark radial backdrop). `desktop/resources/icon.svg`
draws the same lockup with a subset of the font embedded; `icon.png` is that
SVG rendered at 1024 px (`desktop/scripts/render-icon.cjs`, or a headless
Chrome screenshot with a transparent background).

Until 0.28 the internal identifiers used an older prefix (`gte`). From 0.29
they say GDE, and nothing a player has is lost:

- Every storage key is listed once in `game/js/storagekeys.js` (`KEYS`,
  `SESSION_KEYS`); modules import their key from there. The module is the
  first import of `main.js`, so its `migrateStorage()` runs before any module
  reads storage: each old `gte-*` key (and its `?dev` copy `gte-dev:gte-*`) is
  copied to its `gde-*` name when the new key is absent, never over a newer
  one; then `gde-migrated-v1` marks it done. Render caches (`gte-snapshots`,
  `gte6.placeshots`) are not copied. If storage runs full, the copies already
  made lose their old twin and the copy is tried again; a run that still fails
  leaves the marker unset and retries on the next boot. The old keys stay for
  a downgrade to 0.28; `removeLegacyKeys()` is there for a later release.
  `node scripts/storage_migration_test.mjs` checks all of this.
- Desktop: userData is `GDE Groningen` (Electron's default for the product
  name). `desktop/userdata.js` copies the pre-0.29 folder there once
  (without caches and lock files) into a temporary folder that is renamed
  into place, and falls back to the old folder on any error; the old folder
  is left as it was. appId and Windows AppUserModelId:
  `nl.natuspella.gde-groningen`.
- The web build's caches are `gde-<version>-<hash>`; the service worker also
  clears the pre-0.29 ones. IPC channels are `gde:*`, the preload API
  is `window.gdeDesktop`, env variables `GDE_*` (the old `GTE_*` names still
  work in `desktop/build.mjs` and `desktop/main.js`).

### Tessa (formerly Anita)

The heroine is called Tessa on screen and in the voices since 3 Oct 2026;
her internal ids keep the old name so saves and recordings stay valid: the
character key `'anita'` (`world.player.character`, the save's `character`,
`ANITA_APPEARANCE`, model and outfit keys, `audio/voicelines/anita`), and
the speaker id `Anita` (the `"Anita|<text>"` manifest and `tts.json` keys,
`SPEAKER_COLORS`, the TTS cast, `characters.js` `speakers`). `speakers.js`
is the one mapping: `DISPLAY_NAME` (speaker id to shown name, applied by
`speakerHtml`, `paintSpeaker` and `displayName()`; `speakerColor` accepts
both) and `CHARACTER_NAME` / `charName()` (character key to shown name).
Text she or others speak says "Tessa"; never put `Anita` in shown text.

## Trailer (`js/trailer.js`)

A list of staged shots (`buildShots`: label, cuts `vol`/`kort`, duration,
forced clock and weather, a focus the world streams around, captions,
enter/tick/exit for temporary cars, actors, props, and a camera function).
`runTrailer` owns the frame loop while it runs and drives the world through
the title screen's `tick`/`render`/`relocate`; the title screen loop idles
meanwhile. Temporary vehicles carry `cineTemp` (skipped by the title-screen
traffic AI). Cars that follow a road in a shot go through `cinedrive.js`:
`smoothPath` (a Catmull-Rom curve, so heading and lane offsets turn
smoothly), `pathHeights` (the road height along it, followed from the start
so viaducts and cuttings keep their level) and `cineDrive` (puts the car on
the point and lets `settleVehicleHeight` give it height, pitch and roll like
a driven car); `node scripts/cine_ring_check.mjs` samples the ring race shot
(heading snaps, sideslip, height, pitch, overlaps; `--old` for the motion
before this). The intro montage's trekker-limo on Ring Zuid uses the same. `Math.random` is seeded per run and world state (clock,
weather, trains, helis, balloons) is restored afterwards. Modes: `attract`
(short cut at every launch except test runs, hold Space to skip, the last shot's `continuation()` becomes the
title screen's first camera move and the logo glides into place),
`benchmark` (real time, fps per shot, results card) and `opname` (fixed
1/60 s step). The benchmark in a running game saves, reloads with a
sessionStorage flag and continues the save after "Terug". Captions are
driven by trailer time, not CSS animations, so slow fixed-step recordings
stay in sync. Actors and props (Tammo, Tessa, the pigeon) are built once per
session and only hidden between shots; the colour look is a uniform in the
grade pass (`postfx.look`), not a CSS filter over the canvas. A shot with
`fadeOut` ends on black and streams the next location in there, like the
black cards.

## Story

The story "Alles voor één eierbal" (docs/verhaal/D-definitief.md: one
Groningen summer, the last two weeks of August, epilogue in September) is
data plus a director:

- `storyarc.js`: `STEPS`, every main mission (H1-H18) and the guided
  activities in between, in play order, with `PARTS` (kop, romp, staart).
  A step is available when `built` and its part is `open`; the story stops
  at the first unavailable step and shows that part's "Wordt vervolgd" card.
  `MISSION_IDS` maps story mission ids to `missions.js` def indices (saves
  and medal records use those indices: only append). `computeMoneyTimeline`
  is the worst-case money over the whole arc. `RETIRED_STEPS` lists the steps
  0.22 dropped (eierbal, gun, uzi, car, bank, side jobs); a save that had them
  done just loses those ids. `SPEAKERS` maps speaker keys to names (contacts,
  scenes, the collector), `CHARACTERS` holds every character's name card,
  bio and quote; story.js keeps who was met (`met:<key>` flags,
  `getStoryCharacters`, `getStoryCluesByPart`) for a later Verhaal menu.
  A mission step with `solo` leaves the companion behind (missions.js
  `companionHold`, H16).
- `economy.js`: the shared money numbers outside the shop stock (repair,
  wreck, plates and bust costs, fines, side-job pay factor, post-game
  prizes, the Fjord Frituur's daily wage, eierbal finds, and the replay pay: a passed mission pays `klusloon` (50%) and each medal tier once per playthrough a bonus of 15/25/40% of the reward, `medalBonus`; missions.js keeps the paid tiers in the save under `missions.medals`). `storytest.js`
  checks the economy targets (margins, early car/gun, cheap repairs, top
  vehicles after the Romp) against it and the shop prices.
- `storyfun.js`: the story steps around the free-roam extras: goal `kermis`
  (r-kermis, a free bumper-car ride with Durk & Douwe in it, kermis.js reads
  `world.storyActivity`, then their scene at the booth) and `flight`
  (s-proefvlucht, Rotor Roelf's demo heli at the UMCG, a missionCar he takes
  back, and Jelle's balloon in the Oosterpark) and `carbid` (s-carbid, a round
  at boer Roelf's: he hides the Eierbal in his melkbus, a knal scares off the
  twins; far out on foot, Henk drops the Escapade off free); a step's `meet`/`scene` lines.
- `story.js`: finds the current step (done = finished/skipped, a passed
  mission, or an activity made moot by a later passed mission; that also
  migrates pre-0.5 saves). It publishes `world.storyGuide` (routing.js uses
  it after an active mission or side job and the player's own goal),
  sends the step's phone line, pays a one-time voorschot when the player is
  short for a required purchase, switches who you play (`step.player`:
  Tammo and Tessa trade roles behind a short fade; there is no free switch)
  and waits for the night at a garage, offers
  "Sla deze missie over" (O, or the pause menu's Overzicht and Te doen) only once the
  player has tried: after a failed attempt, a requirement unmet for 90 s, an
  activity open for 5 minutes or a story mission running for 6 (never
  before a first try; `skip(true)` forces it for the dev panel and the story
  test), and saves under `story` in the savegame.
  `missions.js` reports back through `setMissionHooks` (passed, failed,
  gated, waived requirements).
- Missions: requirements (`requires`: weapon, bike, car, heist, night,
  boat; also an array) gate the start. Type `stunt` (H3) scores knocked-over
  props, drifts, near misses, pigeon flocks and the water truck on the Grote
  Markt (stuntavond.js); people hit there are knocked down, never knocked out
  (`world.stuntSafe`, pedestrians.js). A def `window` (H6) is a timer over a
  range of stages, `moment` a staged scene at a checkpoint (H5: missionstory.js
  `playEyeContact`, Tessa on her own bike at the all-green crossing; its `text` is
  the fallback toast). A failed mission's
  banner reads "Sikkom.". In `missionstory.js` an entry's `replay` is the short
  outro of a replay (the mission as a klus), `outroNpcKey` another NPC for the
  outro, a line's `kiss` the line the kiss happens on. Type `stages` builds a mission from
  small objectives (board, goto, hold, garage, escape, pigeon, scene, chase,
  vault; documented above `resolveTarget`); the new missions H2, H4, H6, H8
  and H10 use it (H6 adds plan, fuse, lock, pickpocket, laser, crack, getaway and shot, and `only` stages per approach), and the Staart adds boatchase (H14's skûtsje on the Diepenring
  route), heli (helirun.js as a stage), fireworks on a hold, a chase `route` with a
  radio report per street and a `swarm` (H18's pigeons over the fireworks,
  missionstory.js `playPigeonSwarm`), a timed goto,
  `pay` and an egg meter (H17). `storyprops3d.js` holds temporary story props (H10's
  flag), `missionstory.js` `playVaultScene` Jelle's fierljep escape, and
  `racers.js` puts Jelle's trekker-limo in the ring race (`opts.jelle`). Dialogue for every mission index
  is in `missionstory.js` (`STORY`); full lines play once all story missions
  before it are done.
- Debug: `missionDebug` (missions.js) and `window.__story` (story.js: jump,
  complete, win, lose, objective, teleport, skip, timeline). `devflags.js`
  (imported by main.js right after `storagekeys.js`) redirects `gde-*` localStorage keys for `?dev`
  (prefixed) and `?storytest` (memory). The desktop `--story-test` switch
  saves a screenshot per `[storytest-capture]` console line and writes the
  `[storytest-done]` report.

The last part has `finale: true`: its card is the ending (epilogue lines,
credits, "Einde", story.js `playFinale`) instead of "Wordt vervolgd".
After the last built step `world.storyFreePlay` is set and routing.js no
longer routes to idle missions by itself.

Staging (story experience):

- Actors: `missionstory.js` builds Tammo, Tessa, the mission NPC and any
  `introCast`/`outroCast` extras (story NPC keys such as `jelle`, `durk`,
  `douwe`; `{ key, at: [forward, side], pose, face, water, jump }`) plus
  props (`limo` = the trekker-limo as a backdrop, `ball` = the Eierbal in a
  hand, `fatbike` = the twins riding one fatbike). Looks are fixed in
  `storycast.js` (`opts.look` in models3d_people.js). Mission stage scenes
  with `lines` (missions.js `scene` stages, with `cast`/`props`) play through
  `playCastScene`, so they have actors too; H14's twins go overboard on
  their "Plons." line. H4's outro opens with `playLimoReveal` (the limo at the
  museum's back door, through the pigeon's eyes); H6's livestream is
  `playLivestream` (a selfie shot inside the LIVE frame).
- Cameras: drifting over-the-shoulder shots per speaker, a close-up cut on an
  exclamation, a crane-up for the narrator, a slow hand-held float (more on a
  fail), listeners turn their heads to the one talking.
- Line format in cutscenes and contacts: `[who, text, { clue, look, tag }]`.
  A Frisian or Gronings line gets its Dutch subtitle from subtitles.js
  (keyed by the exact text, one mechanism everywhere); `clue` pushes the
  camera in, plays a sting (audio.js `playClueSting`) and marks the subtitle
  "Aanwijzing"; `look` points the camera at a prop (the fatbike, the flag's
  knots); `tag` is the TTS delivery.
- Contacts: a step's `contact` entries (storyarc.js, documented there) are
  queued by story.js on `after` or `lead` and played by storycontact.js when
  the game is quiet, voiced from the lines manifest; their `after` texts
  follow on the phone once the contact is over. `via: 'radio'` is Nachtstreek
  on the phone: a station sting, then Rikus and his caller in the broadcast
  band (audio.js `playContactVoice(src, { radio })`). Every mission opens with
  one ("Bel Rikus", on `lead`); a mission stage's `radio` puts one on air while
  it plays (H6's getaway, H16, H18's chase). A line's `card` (also in cutscene
  lines) shows that character's name card the first time. `world.storyContact` keeps
  the car banter quiet meanwhile. Jelle's replies when you call him
  (phone.js) are voiced too.
- The arc: `PARTS.<part>.recap` plays an "Eerder in GDE" card when a later
  part starts (story.js `playRecap`, once per save, flag `recap:<part>`);
  `CLUES` and `WHY` feed "Wat weten we?" in the pause menu (Te doen › Verhaal and Verhaal › Aanwijzingen;
  a new or renamed character goes in characters.js, with its subtitle names in `speakers`;
  story.js `getStoryJournal`: a clue shows once its step is done, a toast
  and a sting announce it); each step's `why` is the handover line when
  Tammo and Tessa trade places (story.js `playHandover`: a whip in the
  character's colour, a name card, a cut to them).

Adding a part (e.g. the Staart): add new mission defs at the end of
`buildDefs` in missions.js and their ids at the end of `MISSION_IDS`, add
their dialogue at the same index in `missionstory.js` `STORY`, fill in
`mission` and `built: true` on the steps in `STEPS` (activities too; new goal
types go in `GOALS` in story.js), set `PARTS.<part>.open = true`, then run
`--story-test` (it plays every open step, checks who plays each one and
ends at the last open part's card).

## Vehicles (`vehicleregister.js`)

A new vehicle is a full game object or it does not ship. `game/js/vehicleregister.js` is the one register of vehicle models (the `model.name` of `vehicle.js`); a model is complete when it (1) is in the register, (2) can be bought or collected (`VEHICLE_STOCK` in `shops.js`: shop, garage, unlock or find), (3) can be upgraded (`upgradeListForStock`, tuning, paint), (4) spawns at random (traffic weight per neighbourhood in `trafficfleet.js` with a time-of-day factor `hourFactor`, or its own manager such as buses, boats or the countryside), and (5) appears in cutscenes only as a model from the register. A model that truly cannot meet a point (public transport, a rented attraction) carries an `uitzondering` with the reason. `scripts/vehicleregister_test.mjs` checks all of this against the code and fails on a model literal (`name`, `len`, `wid`) that is not in the register, so adding a vehicle starts with a register entry.

## Car banter

`banter.js` plays the exchanges in `banterlines.js` while Tammo and Tessa
ride in the same vehicle (moving, 6 s in, no stars, no mission or bijbaantje,
no cutscene or phone). Triggers by priority: after a mission or shift
(`after:H3:pass`, `after:job:taxi:fail`, 5 minutes valid, ignores the global
cooldown), the next story step (`story:H4`, `story:end:kop`), places
(`place:<landmark>`, `wijk:<name>`, 10 min each), situations (`situation:storm`,
3 min each) and `idle`, with 75 s between conversations. A crash or new stars
cut it off with a `REACTIONS` line; an interrupted nabespreking resumes once.
Story progress is read only (story.js `getStorySave`/`currentStep`,
missions.js); `needs`/`until`/`arc` keep lines spoiler-safe. Subtitles use
the in-game subtitle style; voices come from `audio/voicelines/banter`
(manifest keyed `Speaker|text`) through `audio.js` `playBanterVoice`
(voice bus, ducks G-Music). Heard exchanges are kept in `gde-banter-v1`.
New lines: append to `BANTER` (format documented at the top of
banterlines.js), then `node scripts/tts_banter_lines.mjs && python3
scripts/tts_banter.py`. Debug: `window.__banter` (state, play, after,
eligible, anySpeed).

## Controls and accessibility

The game code only knows the default keys (`isDown('e')`, a `keydown` for
`'t'`). Everything that changes controls sits in front of that:

- **Rebinding** (`controls.js` `bindKey`, settings `keyBinds`, only the changed
  keys): `input.js` registers a window capture listener before every other
  key listener; a rebound physical key is swallowed and sent on as a
  synthetic event with the default key (`__gde = 'remap'`), so menus and
  minigames that listen for keys directly follow the binding too. Binding a
  key that is in use swaps the two, so the table stays one key per action;
  `normalizeKeyBinds` resets a damaged table. Text fields are never remapped.
- **Controller** (`gamepad.js`): polled per animation frame. The situation
  (`menu`, `foot`, `vehicle`, `heli`, `pigeon`, `train`, `skutsje`,
  `foodtruck`, `minigame`) picks a `PAD_MAPS` table. A button sends a key
  event (`__gde = 'pad'`) to the focused element, held until release, with
  key repeat for menu directions; input.js keeps those in `padKeys` so
  `axis()` uses the stick's analog value (`padAxis`) instead. `@fire`/`@aim`
  are the mouse buttons, `@wheel±` the weapon wheel, `@gas`/`@brake` the
  triggers as an analog throttle. The right stick adds to `mouse.dx/dy`
  and sets `padLook`, so the camera turns without pointer lock. Remapped
  buttons (`padBinds`) are a permutation of physical buttons; Start is fixed.
  A dialog without own key handling still works: arrows walk its buttons and
  A clicks the focused one. Rumble follows drops in health and sudden speed
  changes of your vehicle (`watchFeel`), so no damage code needs a hook.
- **Glyphs** (`glyphs.js`): a MutationObserver re-renders every `.hud-key`,
  `<kbd>` and `[data-gk]` (prompts.js `glyphHtml`) when content appears, the
  device changes or the situation changes. The original is kept and put
  back; `data-pad-ctx` on an ancestor (the Besturing groups) picks the
  situation, `data-g-raw` opts out. `html.pad-active` + `data-pad` (xbox, ps,
  deck) drive the styling and the pause menu's footer.
- **Accessibility** (`a11y.js`): `sub-<size>` classes and `--sub-scale` on
  `<html>`, `sub-box`, `cb-<mode>` and `--mk-*` colour tokens. `markerColors()`
  is the palette for canvas and 3D code (hud_panel.js `ROUTE_COLORS` and the
  map icons, the 3D mission marker); `onPaletteChange` redraws legends and
  cached icons. Route kinds also differ by pattern (`ROUTE_DASH`), edge arrows
  by a mark, and the 3D mission marker by shape (ball idle, arrow active).

`node scripts/controls_test.mjs` checks the rebinding, the swaps, damaged
tables and the glyph lookup per situation.
