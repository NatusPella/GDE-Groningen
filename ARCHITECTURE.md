# GDE Groningen – architecture

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
| Ommelanden | `countryreal.js` (the real countryside ~12 km round town from `ommeland.json` + `ommeland.bin`: OSM roads, narrow waterways, a 10 m water distance field, rails, places, churches, stations and building boxes; a built-up mask; carries the city train routes on to the real stations; `REAL`, `buildingsInTile`, `pushOutOfReal`, `realBlocked`; `clearOfReal` moves a shop door, café or padel door that landed in a real building box to its nearest free side, since those boxes are solid in the countryside), `countryfield.js` (field layout shared by JS and the ground shader; inside the real extent the polder blocks lose their procedural roads, maaren and villages), `countryedge.js` (city-edge mask; the real roads and canals as ground-shader segments with a 48 m integer lookup grid), `countryplan.js`, `countryside.js` (streamed 160 m prop tiles, incl. the real buildings, laid out a section per step by a generator; drawn per 2x2-tile chunk, one culled instanced mesh per prop type, the real buildings detailed within ~300 m and as box + closed roof beyond), `countrybake.js` (the real roads' and canals' signed distances rendered round the player into a 0.5 m and a 2 m texture, so the ground shader reads one texel instead of looping over segments; `window.__countryBake.off` switches back), `countryvillage.js` (village centres near the player: a brink by the OSM church with benches, lime trees, pump and bike rack, shopfronts with signs and a café terrace on the houses along the nearest streets, lamp posts, a few anchored pedestrians; kerb slots for parkedcars.js; its furniture is solid through `pushOutOfPlan`), `countryskyline.js` (leaves out what the props draw), `countrylife.js` (traffic on the real roads, boats on the real canals), `countrymap.js`, `countrysigns.js` |
| Input | `input.js` (`isDown`, `wasPressed`, `axis`, `mouse`; rebound keys are translated back to the default key in one capture listener), `controls.js` (the scheme as data: rebindable keys, controller tables per situation, glyph lookup; Node-safe), `gamepad.js` (Gamepad API polling: buttons become key events, sticks and triggers feed `input.js`; last-used device; rumble), `glyphs.js` (every keycap on screen shows the rebound key or the controller button), `a11y.js` + `a11y.css` (subtitle size and box, colour-blind palettes, controller glyph styles) |
| Player | `player.js` (movement, building collision, vehicles, jump, crouch, kiss), `companion.js` (Tammo/Tessa; `world.companionHold` parks them at a spot or in a vehicle for a mission) |
| Vehicles | `vehicle.js` (physics, traffic AI, boats, damage, wrecks, water; a car at zero health is `disabled` and burns until `explodeVehicle` makes it a wreck); the own helicopter: `heliflight.js` (a Vehicle with `v.isHeli`: arcade flight for the driven one via player.js `flyHeli` (W/S height, A/D or mouse yaw, arrows forward/sideways, Shift boost, Space hover, landing assist near the surface), body and rotor probes against city and real Ommeland buildings, landing only on flat ground, flat roofs and registered helipads (`registerHelipad`: home, Rotor Roelf, UMCG) at low speed, harder touchdowns damage, a crash explodes it; soft wall at the map edge, ceiling 125 m; `updateHelis` (main.js) spools rotors, poses rotor/shadow/dust and runs the flight card in the HUD; airborne helis skip vehicle-vehicle contacts, building collision, water until down on the canal, speed cameras, roadblocks, busts; police heli flies above it; discovery cinematics wait until it lands; `window.__heli`), `heli3d.js` (its mesh, helipads, downwash) |
| People and animals | `pedestrians.js`, `wildlife.js`. Nobody dies (PEGI 16, docs/LEEFTIJD.md): a car, train or car blast knocks a person out (`knockOutPed`: the `'dead'` state, which every module reads as "out of action", plus `koUntil`), they lie a few seconds and get up groggy (`groggyUntil`) to complain or run; officers stay down longer. Animals hit by a car are stunned (`a.dead` for `STUN_S`) and make off. `knockfx3d.js` draws the dust, the comic stars over a KO'd head and the feathers of a flustered bird |
| Combat and police | `combat.js` (weapons in slots 1-4 by kind: melee swings that land after a wind-up with per-weapon reach, knockdown and prop breaking, guns, water, throws; bullets swept against walls, props, car boxes and officers (civilians are never a target: bullets miss them, aim assist skips them, a swing is a shove via `shovePed`, the player's own carbidbus only blows them off their feet); recoil in `world.camKick`; `world.scoped` for the jachtgeweer scope, drawn by scene3d.js and aimassist.js), `throwables.js` (water spray, carbidbus and firework rockets: flight, fuse, blasts via pedestrians.js `blastPeople`, and their own 3D, called from gunfx3d.js), `aimassist.js` (right-mouse soft lock on the best target in a cone, hostiles first and never through walls, Tab/flick to switch, light hip-fire bend; lock reticle; setting `autoAim`), `gunfx3d.js` (muzzle flashes with a light pop, tracers, per-surface impacts, pooled bullet holes), `police.js`, `policemounts.js` (bike/horse units, crews on foot, and quiet wanted-0 patrols in the binnenstad and parks), `crime.js`, `drunk.js` (`world.drunk` from the kroegentocht pubs: camera sway, double vision in the grade pass, warm vignette, wandering feet and steering, muffled music, hiccups; setting `drunkFx`, reduced motion; drunk driving adds police heat) (small offences build heat first: a star only when police see it, a witness phones it in, or it piles up) |
| Traffic | `trafficlights.js` (conflict-free phases per axis, protected lefts or split phasing, Groningen all-bikes phase), `junctions.js` (priority classes, extra signals at busy main-road crossings, give-way arms for haaientanden and B6 signs), `trafficfleet.js` (vehicle kinds per wijk stereotype), `emergency.js` (ambulance calls, player siren on L, traffic yields) |
| Story | `storyarc.js` (the arc as data), `story.js` (director), `storycontact.js` (Radio Nachtstreek fragments ("Bel Rikus" before every mission, the rubrieken after), Jelle's and the twins' calls, voicemails, livestreams, Kiekdoar posts and cards on the phone), `namecard.js` (GTA-style name cards at a first meeting), `stuntavond.js` (H3's stunt evening; `stunthud.js` its brief, score panel and popups), `storycast.js` (the Frisian cast's looks), `storyshop.js` (story purchases: what the current step or mission gate wants bought and where, the shop menu's banner, qualifying items first with "Nodig voor je missie", others "telt niet voor je missie"; purchase counts for `goal.buy` steps), `storydev.js` (`?dev` panel), `storytest.js` (`?storytest`), `devflags.js`, `banter.js` + `banterlines.js` (Tammo and Tessa talk in the car) |
| Game systems | `missions.js`, `garages.js` (Garage Knalpot workshops and Pomp & Poets stations: roller door, R menu for repair, paint, upgrades and wrecks; Henk's phone call), `shops.js` (the only source of weapons, ammo and armour; food restores health; Rotor Roelf on Groningen Airport Eelde sells the Wieken Wubbo helicopter, delivered on its platform), `horeca.js`, `flitspaal.js`, `trafficlights.js`, `weather.js`, `skyprops.js`, `pigeonspots.js` + `pigeonmode.js` (word een duif) |
| Home | `home.js` (Thuis: Tammo and Tessa's flat in the House of Groningen tower, Paddepoel. `prepareHomeMap(map)` right after loadMap splits the OSM footprint into the tower and its plinth, which becomes the private garage; `map.reservedAt` keeps parked cars and clutter out of the garage, bike rack and kerb. Owned vehicles "in de garage" (shops.js entry without instance, or `v.homeStored`) are real parked vehicles within 200 m: bays, kerb for long ones, rack, moorings on the canal; leaving an own vehicle there stores it again; the panel pages cars when there are more than bays. The lobby door, on the garage side next to the roller door, is the one way in: a lift to the cutaway flat on the 11th floor (hall on the garage side, living room behind the glass facing the shopping centre; the facade drops too while the camera is outside it). The tower is hidden (scene3d `setBuildingHidden`), the whole storey is a surface for `groundHeightAt`, a safety net puts anyone off the floor back at the lift, and a respawn, "Vastgelopen" or load takes the flat down (never inside the tower). `world.camAdjust` (scene3d follow cam) keeps the camera closer and above the cutaway walls upstairs and out of the garage's walls outside. Bed = sleep + save, fridge = eierbal, wardrobe = owned outfits. EIKEA furniture (`furniture.js`, bought in shops.js `eikeaSections`, saved as `meubels`): delivered on the next visit, placed at fixed spots, each with a perk (sofa heal, bed armour + wake time, Kiekdoar TV replays, eierbal tips, wall-map routes, fryer armour, plant money, +10% side-job pay, night light); `window.__furniture`. New games and loaded saves start at home unless saved mid-mission (save `ctx`); "Naar huis" in the pause menu; debug `window.__home`), `home3d.js` (its meshes); the tower's roof has the helidek (`home.pad`): the flat's hall has "Trap naar het dak" (straight into the heli's seat, the companion too), landing on the deck and E parks it there and takes the lift to the flat; a stored heli waits on the deck (not while the flat is open); "Jouw steiger" (`getHomeMooringForRender`) and "Jouw helidek" icons on the map and minimap; "Laten afleveren" (ownedvehicles.js) brings boats to the moorings and the heli to the deck |
| Special gameplay | `helirun.js` (a heli run in Rotor Roelf's demo heli, a real Wieken Wubbo flown by heliflight.js `flyHeli` with the normal keys, plus a plan from `heliplan.js` (pure: legs `cruise`/`pad`/`pickup`/`rings`/`catch`, the rings, the balloon's motion, the catch zone, the steering/height/station help and a scripted pilot); standalone *Ballonjacht* off the UMCG deck, story H15 (`traumaduif`) off Rotor Roelf's pad on Eelde via the UMCG deck; an arrow, distance and height hint, a light column on the H, Tammo on the lier; the headset lines are H15's `flight:*` contacts in storyarc.js; `getHeliRunMarks()` feeds the minimap and map, `world.heliRunTarget` routing.js; parks `world.skyHeli` out of sight meanwhile; while `world.heliRun` main.js skips the player, police, combat, missions, phone and saving; `node scripts/heli_sim.mjs` flies both runs with the real flight model), `fierljep.js` (pole vault over a canal for any NPC: `poleVault(npc, from, to, { fail, appearance, camera, slowmo, keepActor, swimTime, onDone })` returns `{ done, phase, release, dispose }`; `findVaultSpot(map, x, y)` finds a 5-22 m crossing; sets `npc.scripted` / `npc.hideMesh` so pedestrians.js and scene3d.js leave the NPC to it; the camera is a cinematics.js shot). Both have a preview row in the `?dev` panel. `padel.js` (padel courts from `meta.padel`, placed on free ground next to the OSM spot; E at the door plays a short doubles match with its own camera and scoreboard, `world.padelGame` replaces the player update; rewards full health plus `world.padelFitUntil` regen; story goal `{ type: 'padel' }`; lines in `padellines.js`; `window.__padel` debug) |
| Free-roam activities | `activities.js` (one list for the activities below: their E prompts and place labels in prompts.js, E in main.js, the minigame update and camera (`world.activityGame`, input claimed with `world.minigameUntil`), map icons and legend rows ("Doen en beleven"), Ubbo rows, spot check spots; `window.__activities`), `activitykit.js` (shared helpers, no activity imports), `carbid.js` (carbid schieten on a meadow off the Beijumerweg: aim the churn with A/D/W/S, hold Space for water (too much drowns it), the gas builds and a ring shows where the lid would land, E lights it; too early a plof, too late the gas leaked away; the lid flies with gravity, drag and wind at bales, drums and the stroman down a long strip of meadow (a ditch on the way is a plons); 5 shots, points for hits and distance, medals, record `carbid`; by day it waits for dusk and holds the clock while you shoot; boer Roelf and Hilje comment in Gronings; `window.__carbid`), `kermis.js` (the botsautotent on the Grote Markt, always open (€3): 75 s of bumper cars against five drivers incl. Tammo/Tessa, points for bumps you give (flank and rear count more, combos), record `botsauto`; every evening 19:00-01:00 and in the Meikermis weeks the rest of the kermis (reuzenrad, stalls, crowd, blinking bulbs, a synthesised barrel organ through audio.js `ambientOut`, double prize money, a Kiekdoar item); its footprint is `map.reservedAt`, so market stalls (cityprops.js `isFree`), clutter and parked cars stay off it; `window.__kermis`), `geheimen.js` (eight hidden things, each found once per playthrough for a small reward and counted by the hidden achievement `geheimen_alle` (save set `geheimen`): a door behind the Martinitoren to a little room with a "Made with ❤ in Groningen" plaque (built high above the city like the radio studio), a UFO over Zernike at night, the Peerd van Ome Loeks on top of the Martinitoren one night, a golden mini Jelle in a Frisian garden in the Prinsentuin, an eierbal vending machine in an alley, a "Kon minder" bench in the Martinikerkhof, a rubber duck race with bets in the Noorderplantsoen pond, a bike in a tree on Zernike; `window.__geheimen`), `funlines.js` (their spoken lines and Radio Proat's, as data) |
| Car radio | `radiostations.js` (in a car, bus, boat or police car N/B tune G-Music, Radio Nachtstreek (the same records through an old radio, audio.js lowpass, no G-Music jingles, Rikus between them), Radio Proat (talk: Geesje's idents, ads and weather, Kiekdoar news, traffic, the cows and Rikus, all on the speech channel's `radio` class) or off; every vehicle keeps its station, a stolen taxi or bus comes with Radio Proat; on foot and on a bike G-Music as always; audio.js `setRadioStation` holds G-Music for talk and off; `window.__radio`) |
| Post-game | `postgame.js` (hub, opens once story.js shows the ending card: start markers with badge, map icon and E prompt, one challenge at a time as `world.challenge`, Jelle's voiced taunts, result banner, records via achievements.js `recordChallengeResult`, `after:<id>:pass/fail` banter, Ubbo rows via `world.postgameActions`; `window.__postgame` debug), `pg_bruggenrace.js` (Elf Bruggenrace over the rondvaart route and its 11 bridges), `pg_fierljep.js` (fierljep duel with a timing minigame on top of fierljep.js), `pg_skutsje.js` (skûtsje sprint Oosterhaven to Hoge der A: speed from wind angle and sail trim, `v.sailTop`), `pg_foodtruck.js` (the Fjord Frituur business: busy spots, order matching, upgrades), `pg_lines.js` (all their spoken lines as data), `pg_koe.js` (De Koe van Ome Jan: fetch Ome Jan's prize cow from Durk and Douwe's barn near Ten Boer and lead her home while they chase her in Jelle's trekker-limo; ram it to stall it; lines in `ommelandlines.js`). `world.challengeHud` feeds the race panel, `world.challengeTarget` the minimap, `world.challengeHoldPlayer` pauses the player update; `world.postgameGuide` is the automatic route (routing.js) to the nearest challenge without a medal, then without gold (in the Fjord Frituur its spots first), with Volgende/Uit on the map and a row in Ubbo; `queueFjordReveal` (queued by story.js after the credits) unveils the truck and seats Tessa in it |
| Story set pieces | `fjordtrain.js` (H16: a railway.js mission train, state `'mission'`, with the Fjord riding a flat; stops for a player standing at the Peizerweg crossing), `heist.js` + `heistui.js` + `heist.css` (H6 De Museumkraak: the plan on a blueprint with the choice of approach (sneak in through the back door, or as cleaners with a pass lifted from a guard), sweeping cameras and torch guards (standing, patrolling, dozing at the desk; E sends them to the window), the fuse box that loops the cameras, the lock, the laser grid in zaal 3, the case's dial (1953), the card on the empty cushion, the alarm, the getaway boat and the closing shot; doors are museumplan rooms with `shut` until their stage opens them; being seen or zapped sends you back, the companion helps after a few tries and holding O skips a stage that gives trouble; `window.__heist`). Jelle's escapes (`missionstory.js` `playVaultScene`) step a `fierljep.js` vault from the paused scene |
| Bijbaantjes | `sidejobs.js` (start points, shifts, pay, levels; publishes `world.sideJob` for HUD, map and routing), `sidejobkit.js` (shared helpers), `sidejobvoice.js` (voiced boss lines, `audio/voicelines/jobs`), one `sidejob_*.js` per job |
| World flavour | `flavour.js` (after docs/groningen-memes.md: building nicknames and "bijna thuis", the Gerrit Krolbrug's malfunction per pass, Ring Zuid navigation lines, "Kon minder" after a flawless mission (missions.js sets `world.lastPerfectRun`), the Noorderplantsoen on sunny days, the commentary cows in the Kiekdoar feed, event days (Bloemetjesmarkt, Bommen Berend, KEI-week: the real date, else a rare random day at dawn), the Peerd van Ome Loeks on another roundabout each night, AI cars stopping for crossing cyclists, stolen bikes turning up again, Nachtstreek night radio outside the city, Oosterpark chants; owns `world.flavour`, debug `window.__flavour`), `flavour3d.js` (billboards that change with story progress, the growing Krolbrug detour, picnic instancing, the statue, plaque, flags, house plants; built at boot, only toggled after), `flavourlines.js` (all text; spoken tables registered in voicelines_collect.mjs) |
| Ommeland extras | `ommelandfun.js` (hub for main.js, prompts.js and spotcheck.js; solid props push the player out; `window.__ommeland`), `worldends.js` (twelve wereldeinden where real roads cross the edge of the Ommeland data, picked round the four edges from the road data: a prop, a voiced line, a card "3 van 12", lifetime set `wereldeinden` for Prestaties, the twelfth plays the final gag), `dorpsuitjes.js` (per Ommeland station: one special (tennis, canal trip, Gronings quiz, mill, leaning tower, wierde, bell, beach), a café, farm shop, beach kiosk or bike rental, a hidden eierbal and a signpost; placed per village when the player heads its way, props only within ~300 m; sets `dorpsuitjes`, `dorpseierballen`), `ommelandplace.js` (open ground, roads, water and shore in the real data), `ommelandprops3d.js` (the props, one vertex-colour mesh each plus sign textures), `ommelandtalk.js` (voiced name bubbles; DUO lines are the companion's), `ommelandlines.js` (all text, pure data; registered in voicelines_collect.mjs). The station menu and the map name a village's things to do. |
| Soft-lock safety | `safety.js` (pause menu "Vastgelopen? Zet me vrij" and "Missie afbreken" (counts as a fail, so the story skip opens); watchdogs for cutscenes and respawn scenes that run far too long, players out of the world, scene flags left behind) |
| Title and trailer | `logo.js` (the game's name in one place: `SERIES`, `PLACE`, `SUBTITLE`, `GAME_TITLE`, and `logoHtml()` for the GDE wordmark; its CSS `.gde-logo` and a static copy for the loading and title screens live in `index.html`; a sequel swaps `PLACE` and `SUBTITLE`), `startscreen.js` (loading screen, title menu over the live city), `trailer.js` (attract intro, benchmark, recording mode), `intromontage.js` (the "Nieuw spel" opening montage) |
| UI | `hud_panel.js` + `.css` (each corner one job, nothing in the HUD takes a click: top left the player card with a portrait rendered from the real model (`renderSnapshot`, cached per look, so outfits show), ten-segment health and armour bars and, while the companion is with you, their own small portrait ("Tessa rijdt mee"); top right one block with time of day, wanted stars, money and weapon, the race panel under it; bottom right the minimap, which steps up in a vehicle (`--mm-bottom`, `body.hud-in-vehicle`) for the speed and damage badge; bottom left the location chip, where savegame.js's "opgeslagen" tick sits; minimap: player, routes and targets always; static places only the nearest few per category; the objective line), `hudcards.js` + `.css` (HUD message cards, countdowns; "2 meldingen wachten" under them while cards queue), `cardlines.js` (what Tammo/Tessa say with a card), `prompts.js` + `.css` (world prompts and the key-cap + pictogram hint chips; `world.missionPrompt` is a mission stage's own prompt), `shopui.js` (shop menus: select, then buy with the button; confirm for expensive items), `vehiclepreview.js` (rotating 3D previews of vehicles, weapons, people and products: `createVehiclePreview` with its own renderer for the shops; `createSharedPreview` and `renderSnapshot` draw through ONE shared WebGL renderer onto 2D canvases and cached stills, for the garage, Verhaal and the HUD portraits, so menus never open a context per selection; `PORTRAIT_ANGLE` turns a person to the camera), `shopmodels3d.js` (procedural shop products), `pausemenu.js` (one overlay over the paused game, the city rendering behind it: a fixed 248 px rail (Doorgaan, the sections, Opslaan/Laden, Hoofdmenu) and a sheet with one section: Overzicht, Te doen, Verhaal, Kaart, Garage, Prestaties, Instellingen, Besturing; Esc opens on Overzicht, Esc/Backspace from another section go back to it, then close; Q/E switch sections, arrows move the focus spatially, Enter on a Te doen card makes it the goal; the last section and sub-tab are kept in `gte-menu-v1`; `openPauseMenu(name, { select, view })` from M or the phone opens a section directly and Esc then closes; the start screen's Instellingen is the same menu with only Instellingen and Besturing), `todo.js` (one catalogue of everything to do: missions with status Nu/Klaar/Later/Op slot, medal and record, minigames, bijbaantjes, Ommeland, collectibles as counts only, the post-game challenges; `chooseTodo`/`playMission` make one the goal, a story mission later than the current step first asks "H9 nu al spelen?" (`confirmPlayAhead`); `mapIconUrl` caches map icons as images), `todoui.js` (Overzicht and Te doen: Verhaal per part with clues, Alles per kind, Dichtbij, and the detail panel), `verhaalui.js` (Verhaal: Personages, a card per character with a head render or a silhouette and "???" until met, the viewer with the turning model, quote in their speaker colour, bio, relation to the duo and the missions together; Aanwijzingen, the clues per story part with the unknown ones as ???), `characters.js` (the cast as data: id, name, `speakers` (subtitle names that count as them), role, bio, quote, relation, `missions` (STEPS ids), `model` (`tammo`/`anita` or a missionstory.js `NPC` key); `noteSpoken(world, speaker)` unlocks a character the first time they speak to you, in the lifetime set `personages` (achievements.js), called where a line is shown with its speaker: cinematics.js, storycontact.js, phonefeed.js, phone.js calls, postgame.js; never during the trailer or before the game starts), `achievementsui.js` (Prestaties: summary band with ring and four figures, the categories on the left with Bijna binnen first, the cards, Onlangs behaald and the lifetime figures), `goal.js` (the one player-chosen goal, `world.goal`: place, mission, minigame, bijbaantje or challenge; done when reached or played, then a "Terug naar het verhaal" card; saved as `doel`; `missionOnMap` is the map rule: a mission marker only while it runs, for the story's current step or as the goal), `motion.js` (motion tokens live on `:root` in index.html; count-ups, bar fills with a ghost on a drop, one-shot pop/ring/shine; "Beweging beperken" or the OS setting put `reduce-motion` on `<html>`), `garageui.js` (Garage section: category pills with owned/total, Toon and sort, a card per vehicle with a rendered thumbnail, speed and pull bars and a status chip, the viewer with the turning model and Laten afleveren / Waar staat hij?; all drawn by the shared preview renderer), `mapview.js` (full map, the "Op de kaart" layer panel: Altijd, Te doen, Diensten and Onderweg, a row switching one or more layer keys; a click on a marker opens a card with "Zet als doel", a click elsewhere makes the spot the goal, right-click/Del clears it; search also finds missions and activities), `mapfilters.js` (one visibility switch per layer key, shared by the full map and the minimap; `klussen` starts off), `routing.js` (GPS route for the goal, missions, the story and side jobs; a straight line in a heli; quiet during padel, carbid, the kermis and a heli run), `countryroute.js` (a road graph over the Ommeland roads; routing.js joins it to the city streets at gateways near the city edge, so places outside the city map get a route too; `node scripts/country_route_test.mjs`), `phonefeed.js` + `.css` (phone notifications and calls), `sikkomfeed.js`, `subtitles.js` (Dutch subtitles under Frisian and Gronings lines, see Spoken lines), `uiscale.js` (HUD scale `--ui`: window size times the "Grootte interface" setting, applied as CSS zoom on the HUD roots and the pause menu's card, sheet header, panels and footer) |
| Audio | `speech.js` (the one talking channel, see "Spoken lines"), `audio.js` (G-Music, voicelines, synthesised effects; buses for music, effects and voices), `linevoice.js` (recordings for speech bubbles, unvoiced cutscene subtitles and the rondvaart guide, `audio/voicelines/lines`), `scenariomusic.js` (race/chase loops that pause G-Music) |
| Building passages and interiors | `passages.js` (the corridors footways and streets cut through a footprint: mapped OSM passages from `mapextras.json` `passages`, streets, short footways/cycleways; walkers, vehicles, spawns and the camera share them; a way that ends at a facade gets a door, a footway or cycleway through a solid block is cut at the facade when the map loads, `clipWaysInBuildings`), `portalcut3d.js` (building materials discard inside the passage boxes near the player, so the facade shows a real gate; lined tunnels with lamps; the door panels), `museumplan.js` + `museum3d.js` (the Groninger Museum's walkable ground floor as rooms: cycle passage, atrium, Entreehal, zaal 1, zaal 3 with the Gouden Eierbal case used by H6; a room with `shut` is closed to walkers) |
| Validation | `spotcheck.js` (every start/target point must be open ground you can walk away from), `ringcheck.js` (nothing solid or open water on the ring race lap and ring roads, a car crosses every water crossing of the major and numbered roads at 80 km/h in both directions and three lanes, a scripted car and the AI racers drive a full lap, every rail lift can be walked, driven and cycled up), `passagecheck.js` (every street, cycleway and footway stretch inside a footprint is an opening, a door, a facade graze or clipped, never through a solid wall or an invisible hole; `node scripts/passage_audit.mjs` lists them from the map data); `node scripts/seat_audit.mjs` seats a figure on every vehicle's driver and passenger seat (seating3d.js `vehicleSeat`) and checks the head is in the cab glass under the roof, the hands ahead of the hip and the feet inside the body; all run in the story test, desktop `--validate-spots[=dir]` runs only them; out in the Ommelanden spotcheck.js also rejects spots inside what is solid there (the real building boxes, farmsteads, villages, turbines and pylons), with the same countryplan.js `pushOutOfPlan` query collision.js uses and the map-edge mask built first (`ensureCountryEdge`); garages.js keeps its bays clear of real building boxes; `node scripts/swim_audit.mjs` (not in the story test) poses the ambient swimmers (swimmers3d.js) in each swimwear over a full stroke and checks no hand goes over the head, a back floater lies at the waterline with its hands in the water and a bank sitter's feet reach the water |
| 3D | `scene3d.js` (scene, streaming, camera), `staticbatch3d.js` (static batching of city buildings and roads per 48 m cell, see Graphics settings), `gfxprofile.js` (graphics presets, GPU check, adaptive quality), `roadsurface.js` + `roadstructures3d.js` (roads; viaducts, embankments, cuttings, tunnels), `cutmask3d.js`, `terrain3d.js`, `water3d.js`, `models3d_buildings.js`, `models3d_vehicles.js`, `models3d_people.js`, `treeprops.js`, `pixelart3d.js` (shared materials), `landmarkmodels.js` (GLB landmarks) |

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
  phrases) > `radio` (Rikus on Radio Nachtstreek, G-Music jingles).
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
  little for bubbles). Radio Nachtstreek waits for the same silence.
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
Tammo's and Tessa's voices for every pipeline. Tammo's style asks for
Gronings dialect, so his clips may say a Gronings word where the subtitle
has the Dutch one ("Mien droom").

Every voicelines folder has a `tts.json` next to its `manifest.json`, keyed
the same, that says exactly how each clip was made: `src`, `model`,
`voice`, `input` (the text sent, with any inline tags), `style`, `post`
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
  (`js/radiostudio.js`, a closed room high above the city), start with a
  station sting (`playRadioSting`) and play his voice in a broadcast band
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
- Objective line (`hud_panel.js` `currentObjective`, top centre): one
  objective at a time, the mission stage (`missionProgressText` split into
  objective and counter), else the bijbaan goal (its hint first, then the
  counter), else "Ontsnap aan de politie", else the next story step
  (`world.storyGuide`: its name and how to get there, smaller); pops in
  when it changes. Deliver missions say what to do ("Stap in Berends
  bakkie", "Rij naar het Boterdiep": def `vehicleName`, `destName`).
- Phone (`phonefeed.js`, bottom left above the street name):
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
then the post-game guide. `setUserWaypoint` makes a place goal. `getActiveRoute()` is the primary one (goal, else
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
Krant & Kauwgom stamps every purchase on a spaarkaart (`state.stamps`, saved
with the shops); a full card pays a fixed prize. One small preview renderer
serves every shop (pixel ratio capped); its model is freed on close.
The panel scales with `--ui`. Shops that buy and sell list Kopen first.

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
  EIKEA landmark; bounds-matched patches remove the underground garages and bridge piers still in citymap.json and turn covered walkways into canopies), gas stations (`meta.fuel`) and padel sites (`meta.padel`:
  OSM `sport=padel` pitches grouped per site, named after their wijk). It lives outside
  citymap.json so the big file stays untouched.
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
- First run: `startGfxAdvisor` (title screen, also during the attract
  intro) classifies the GPU string (`classifyGpu`: Intel iGPU, software
  renderers and mobile GPUs -> laag; Radeon iGPU, Intel Arc iGPU, GeForce
  MX -> gemiddeld; low texture size, cores or memory step down) and takes
  the median of a few seconds of frame times; when that points below the
  current preset a card offers it (`gte-gfx-advice` remembers the answer;
  never when the settings are no longer the default preset). `?gfxadvies`
  and `?gpu=<string>` (desktop `--gfx-advice[=<string>]`) force it in tests.
- Adaptive quality (`autoResolution`, on by default): main.js feeds every
  in-game frame's interval and main-thread time to `noteFrame`; slow
  GPU-bound frames lower the render scale (down to 60%), slow CPU-bound
  frames raise `cpuLevel` (fewer facade details, the shadow map every
  other frame); one step per second down, back up after four good seconds.
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
- Village centres (`countryvillage.js`) bake every item into one mesh per
  material and shadow flag while laying out (four draws a village); the
  horeca pads and their bobbing badges near the player are one
  InstancedMesh each (the badge is a camera-facing quad, bobbing in the
  vertex shader).
- On 'laag' the Ommeland building facade shader (`countrybuilding.js`,
  `FACADE_LOW`) skips the brick and roof-tile textures and window frames.
- The minimap's Ommeland layer (`drawCountryMinimap`) is static: drawn into
  world-aligned 256 px tiles per half-octave zoom step (at most one new tile
  a frame, LRU of 40) and blitted. While the CPU is the bottleneck
  (simload.js level 1-2) the minimap redraws every second or third frame.
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
  interleaved A/B runs against another staged build (`GTE_STAGE_SRC`,
  `GTE_STAGE_OUT`, `GTE_GAME_DIR`).
- Main-thread profile per category: `docs/PERF-PROFIEL.md`. With `--hitch`
  a run also records the ms per frame of each hitchprobe section
  (`scripts/perf/sections.py` groups them); `GTE_PROFILE_OUT=<dir>` keeps the
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
- Ommeland water (`countrywater.js`, pure part in `countrywatergeo.js`): the
  map bounds, the real water and urban fields (`countryfield.js`
  `countryBounds`, `realZone`) and the canal part of the edge lookup grid
  (`countryedge.js` `canalGridSnapshot`) go to the worker once (again when
  the map edge becomes ready); per prop chunk the worker samples the tiles
  (kept for the last 160), merges them and computes the bank normals. The
  old meshes stay until the new ones arrive.
- City road surfaces (`roadsurface.js`): on the first `syncRoads` the worker
  loads its own copy of the map (`citymap.json` + extras, the same
  `GameMap`) and drops the roads the main thread no longer has (`home.js`);
  `slimWorkerMap` then drops what the worker never reads (buildings keep
  only their bounds in the grid; canopies, trees), which takes the copy from
  64 to 33 MB of heap (`scripts/perf/mapmem.mjs`); roads are matched by
  `roadKey` (class, type, width, points). `roadGeometryReady(r)` requests a
  road's sidewalk, carriageway and marking geometry
  (`roadSurfaceGeometries`, the code `buildRoadGroup` uses) and returns
  false until it is back; `syncRoads` then lets the far LOD cover from the
  nearest road still on its way. The civil works (`roadstructures3d.js`)
  stay on the main thread. Until the worker's map is ready, roads build on
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
  water chunks round the map, every road, every city shore, the terrain),
  and the road batch cells against the old one-frame finish. The kernels
  share their code with the main thread (`geokernels.js`,
  `countrywatergeo.js`, `roadSurfaceGeometries`, `shoreParts`,
  `terrainArrays`), so a change there reaches both;
  the check should pass after it.

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

Internal identifiers keep the old name "GTE VI" so nothing a player has is
lost: the `gte-*` localStorage keys, the web cache names `gte-vi-*`, the
`gte:` IPC channels, the Electron appId `nl.natuspella.gte-vi`, and the
userData folder, which `desktop/main.js` pins to `GTE VI` before setting the
new app name (Electron derives userData from the name, so the new
productName would otherwise start from an empty profile).

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
  (imported first by main.js) redirects `gte-*` localStorage keys for `?dev`
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
(voice bus, ducks G-Music). Heard exchanges are kept in `gte-banter-v1`.
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
  synthetic event with the default key (`__gte = 'remap'`), so menus and
  minigames that listen for keys directly follow the binding too. Binding a
  key that is in use swaps the two, so the table stays one key per action;
  `normalizeKeyBinds` resets a damaged table. Text fields are never remapped.
- **Controller** (`gamepad.js`): polled per animation frame. The situation
  (`menu`, `foot`, `vehicle`, `heli`, `pigeon`, `train`, `skutsje`,
  `foodtruck`, `minigame`) picks a `PAD_MAPS` table. A button sends a key
  event (`__gte = 'pad'`) to the focused element, held until release, with
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
