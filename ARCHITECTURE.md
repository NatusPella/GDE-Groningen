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
6. Missions, Sikkom feed, phone feed, garages, horeca, shops, flitspalen
7. Audio, weather
8. `update3D` (renders), `updateHud`
9. `input.endFrame()`

`dt` is clamped to 0.05 s.

## Modules

| Area | Files |
|---|---|
| Map data | `mapdata.js` (`GameMap`: grid-indexed `buildingsNear`, `roadsNear`, `waterNear`, `nearestRoadPoint`, `isOnBridge`, `escapeBuilding`, `groundHeightAt`), `elevation.js` (ring road heights, walls, open cuts), `util.js` |
| Ommelanden | `countryreal.js` (the real countryside ~12 km round town from `ommeland.json` + `ommeland.bin`: OSM roads, narrow waterways, a 10 m water distance field, rails, places, churches, stations and building boxes; a built-up mask; carries the city train routes on to the real stations; `REAL`, `buildingsInTile`, `pushOutOfReal`, `realBlocked`; `clearOfReal` moves a shop door, café or padel door that landed in a real building box to its nearest free side, since those boxes are solid in the countryside), `countryfield.js` (field layout shared by JS and the ground shader; inside the real extent the polder blocks lose their procedural roads, maaren and villages), `countryedge.js` (city-edge mask; the real roads and canals as ground-shader segments with a 48 m integer lookup grid), `countryplan.js`, `countryside.js` (streamed 160 m prop tiles, incl. the real buildings), `countryskyline.js`, `countrylife.js` (traffic on the real roads, boats on the real canals), `countrymap.js`, `countrysigns.js` |
| Input | `input.js` (`isDown`, `wasPressed`, `axis`, `mouse`) |
| Player | `player.js` (movement, building collision, vehicles, jump, crouch, kiss), `companion.js` (Tammo/Anita; `world.companionHold` parks them at a spot or in a vehicle for a mission) |
| Vehicles | `vehicle.js` (physics, traffic AI, boats, damage, wrecks, water; a car at zero health is `disabled` and burns until `explodeVehicle` makes it a wreck) |
| People and animals | `pedestrians.js`, `wildlife.js` |
| Combat and police | `combat.js` (weapons in slots 1-4 by kind: melee swings that land after a wind-up with per-weapon reach, knockdown and prop breaking, guns, water, throws; bullets swept against walls, props, car boxes and people; recoil in `world.camKick`; `world.scoped` for the jachtgeweer scope, drawn by scene3d.js and aimassist.js), `throwables.js` (water spray, carbidbus and firework rockets: flight, fuse, blasts via pedestrians.js `blastPeople`, and their own 3D, called from gunfx3d.js), `aimassist.js` (right-mouse soft lock on the best target in a cone, hostiles first and never through walls, Tab/flick to switch, light hip-fire bend; lock reticle; setting `autoAim`), `gunfx3d.js` (muzzle flashes with a light pop, tracers, per-surface impacts, pooled bullet holes), `police.js`, `policemounts.js` (bike/horse units, crews on foot, and quiet wanted-0 patrols in the binnenstad and parks), `crime.js`, `drunk.js` (`world.drunk` from the kroegentocht pubs: camera sway, double vision in the grade pass, warm vignette, wandering feet and steering, muffled music, hiccups; setting `drunkFx`, reduced motion; drunk driving adds police heat) (small offences build heat first: a star only when police see it, a witness phones it in, or it piles up) |
| Traffic | `trafficlights.js` (conflict-free phases per axis, protected lefts or split phasing, Groningen all-bikes phase), `junctions.js` (priority classes, extra signals at busy main-road crossings, give-way arms for haaientanden and B6 signs), `trafficfleet.js` (vehicle kinds per wijk stereotype), `emergency.js` (ambulance calls, player siren on L, traffic yields) |
| Story | `storyarc.js` (the arc as data), `story.js` (director), `storycontact.js` (Jelle's and the twins' calls, voicemails, livestreams, Sikkom posts and cards on the phone), `storycast.js` (the Frisian cast's looks), `storyshop.js` (story purchases: what the current step or mission gate wants bought and where, the shop menu's banner, qualifying items first with "Nodig voor je missie", others "telt niet voor je missie"; purchase counts for `goal.buy` steps), `storydev.js` (`?dev` panel), `storytest.js` (`?storytest`), `devflags.js`, `banter.js` + `banterlines.js` (Tammo and Anita talk in the car) |
| Game systems | `missions.js`, `garages.js` (Garage Knalpot workshops and Pomp & Poets stations: roller door, R menu for repair, paint, upgrades and wrecks; Henk's phone call), `shops.js` (the only source of weapons, ammo and armour; food restores health), `horeca.js`, `flitspaal.js`, `trafficlights.js`, `weather.js`, `skyprops.js`, `pigeonspots.js` + `pigeonmode.js` (word een duif) |
| Home | `home.js` (Thuis: Tammo and Anita's flat in the House of Groningen tower, Paddepoel. `prepareHomeMap(map)` right after loadMap splits the OSM footprint into the tower and its plinth, which becomes the private garage; `map.reservedAt` keeps parked cars and clutter out of the garage, bike rack and kerb. Owned vehicles "in de garage" (shops.js entry without instance, or `v.homeStored`) are real parked vehicles within 200 m: bays, kerb for long ones, rack, moorings on the canal; leaving an own vehicle there stores it again; the panel pages cars when there are more than bays. The lobby door, on the garage side next to the roller door, is the one way in: a lift to the cutaway flat on the 11th floor (hall on the garage side, living room behind the glass facing the shopping centre; the facade drops too while the camera is outside it). The tower is hidden (scene3d `setBuildingHidden`), the whole storey is a surface for `groundHeightAt`, a safety net puts anyone off the floor back at the lift, and a respawn, "Vastgelopen" or load takes the flat down (never inside the tower). `world.camAdjust` (scene3d follow cam) keeps the camera closer and above the cutaway walls upstairs and out of the garage's walls outside. Bed = sleep + save, fridge = eierbal, wardrobe = owned outfits. EIKEA furniture (`furniture.js`, bought in shops.js `eikeaSections`, saved as `meubels`): delivered on the next visit, placed at fixed spots, each with a perk (sofa heal, bed armour + wake time, Sikkom TV replays, eierbal tips, wall-map routes, fryer armour, plant money, +10% side-job pay, night light); `window.__furniture`. New games and loaded saves start at home unless saved mid-mission (save `ctx`); "Naar huis" in the pause menu; debug `window.__home`), `home3d.js` (its meshes) |
| Special gameplay | `helirun.js` (UMCG trauma heli "on rails": height, sideways offset and speed only; rings, gusts, timer, then hold station beside a drifting balloon; standalone *Ballonjacht* at the UMCG spot, `startHeliRun({ variant: 'ballonjacht' \| 'traumaduif', onFinish })` for the story; drives `world.skyHeli` via `scriptHeli` and a `scripted` balloon in `world.balloons`; while `world.heliRun` main.js skips the player, police, combat, missions, phone and saving), `fierljep.js` (pole vault over a canal for any NPC: `poleVault(npc, from, to, { fail, appearance, camera, slowmo, keepActor, swimTime, onDone })` returns `{ done, phase, release, dispose }`; `findVaultSpot(map, x, y)` finds a 5-22 m crossing; sets `npc.scripted` / `npc.hideMesh` so pedestrians.js and scene3d.js leave the NPC to it; the camera is a cinematics.js shot). Both have a preview row in the `?dev` panel. `padel.js` (padel courts from `meta.padel`, placed on free ground next to the OSM spot; E at the door plays a short doubles match with its own camera and scoreboard, `world.padelGame` replaces the player update; rewards full health plus `world.padelFitUntil` regen; story goal `{ type: 'padel' }`; lines in `padellines.js`; `window.__padel` debug) |
| Post-game | `postgame.js` (hub, opens once story.js shows the ending card: start markers with badge, map icon and E prompt, one challenge at a time as `world.challenge`, Jelle's voiced taunts, result banner, records via achievements.js `recordChallengeResult`, `after:<id>:pass/fail` banter, Ubbo rows via `world.postgameActions`; `window.__postgame` debug), `pg_bruggenrace.js` (Elf Bruggenrace over the rondvaart route and its 11 bridges), `pg_fierljep.js` (fierljep duel with a timing minigame on top of fierljep.js), `pg_skutsje.js` (skûtsje sprint Oosterhaven to Hoge der A: speed from wind angle and sail trim, `v.sailTop`), `pg_foodtruck.js` (the Fjord Frituur business: busy spots, order matching, upgrades), `pg_lines.js` (all their spoken lines as data). `world.challengeHud` feeds the race panel, `world.challengeTarget` the minimap, `world.challengeHoldPlayer` pauses the player update; `world.postgameGuide` is the automatic route (routing.js) to the nearest challenge without a medal, then without gold (in the Fjord Frituur its spots first), with Volgende/Uit on the map and a row in Ubbo; `queueFjordReveal` (queued by story.js after the credits) unveils the truck and seats Anita in it |
| Story set pieces | `fjordtrain.js` (H16: a railway.js mission train, state `'mission'`, with the Fjord riding a flat; stops for a player standing at the Peizerweg crossing), `heist.js` + `heistui.js` + `heist.css` (H6 De Museumkraak: the plan on a blueprint with the choice of approach (sneak in through the back door, or as cleaners with a pass lifted from a guard), sweeping cameras and torch guards (standing, patrolling, dozing at the desk; E sends them to the window), the fuse box that loops the cameras, the lock, the laser grid in zaal 3, the case's dial (1953), the card on the empty cushion, the alarm, the getaway boat and the closing shot; doors are museumplan rooms with `shut` until their stage opens them; being seen or zapped sends you back, the companion helps after a few tries and holding O skips a stage that gives trouble; `window.__heist`). Jelle's escapes (`missionstory.js` `playVaultScene`) step a `fierljep.js` vault from the paused scene |
| Bijbaantjes | `sidejobs.js` (start points, shifts, pay, levels; publishes `world.sideJob` for HUD, map and routing), `sidejobkit.js` (shared helpers), `sidejobvoice.js` (voiced boss lines, `audio/voicelines/jobs`), one `sidejob_*.js` per job |
| World flavour | `flavour.js` (after docs/groningen-memes.md: building nicknames and "bijna thuis", the Gerrit Krolbrug's malfunction per pass, Ring Zuid navigation lines, "Kon minder" after a flawless mission (missions.js sets `world.lastPerfectRun`), the Noorderplantsoen on sunny days, the commentary cows in the Sikkom feed, event days (Bloemetjesmarkt, Bommen Berend, KEI-week: the real date, else a rare random day at dawn), the Peerd van Ome Loeks on another roundabout each night, AI cars stopping for crossing cyclists, stolen bikes turning up again, Nachtstreek night radio outside the city, Oosterpark chants; owns `world.flavour`, debug `window.__flavour`), `flavour3d.js` (billboards that change with story progress, the growing Krolbrug detour, picnic instancing, the statue, plaque, flags, house plants; built at boot, only toggled after), `flavourlines.js` (all text; spoken tables registered in voicelines_collect.mjs) |
| Soft-lock safety | `safety.js` (pause menu "Vastgelopen? Zet me vrij" and "Missie afbreken" (counts as a fail, so the story skip opens); watchdogs for cutscenes and respawn scenes that run far too long, players out of the world, scene flags left behind) |
| Title and trailer | `startscreen.js` (loading screen, title menu over the live city), `trailer.js` (attract intro, benchmark, recording mode), `intromontage.js` (the "Nieuw spel" opening montage) |
| UI | `hud_panel.js` + `.css` (minimap: player, routes and targets always; static places only the nearest few per category; the objective line), `hudcards.js` + `.css` (HUD message cards, countdowns), `cardlines.js` (what Tammo/Anita say with a card), `prompts.js` + `.css` (world prompts and the key-cap + pictogram hint chips; `world.missionPrompt` is a mission stage's own prompt), `shopui.js` (shop menus: select, then buy with the button; confirm for expensive items), `vehiclepreview.js` (rotating 3D preview for the shops and the garage tab: vehicles, weapons, people, products), `shopmodels3d.js` (procedural shop products), `pausemenu.js` (tabs; `addMissionsSection` for extra Missies sections), `garageui.js` (garage tab with the 3D viewer), `mapview.js` (full map, legend toggles, click/right-click waypoints), `mapfilters.js` (one visibility switch per legend category, shared by the full map and the minimap), `routing.js` (GPS route for waypoints, missions and side jobs), `phonefeed.js` + `.css` (phone notifications and calls), `sikkomfeed.js`, `subtitles.js` (Dutch subtitles under Frisian and Gronings lines, see Spoken lines), `uiscale.js` (HUD scale `--ui`: window size times the "Grootte interface" setting, applied as CSS zoom on the HUD roots and the pause menu's header, footer and panels) |
| Audio | `speech.js` (the one talking channel, see "Spoken lines"), `audio.js` (G-Music, voicelines, synthesised effects; buses for music, effects and voices), `linevoice.js` (recordings for speech bubbles, unvoiced cutscene subtitles and the rondvaart guide, `audio/voicelines/lines`), `scenariomusic.js` (race/chase loops that pause G-Music) |
| Building passages and interiors | `passages.js` (the corridors footways and streets cut through a footprint: mapped OSM passages from `mapextras.json` `passages`, streets, short footways/cycleways; walkers, vehicles, spawns and the camera share them; a way that ends at a facade gets a door, a footway or cycleway through a solid block is cut at the facade when the map loads, `clipWaysInBuildings`), `portalcut3d.js` (building materials discard inside the passage boxes near the player, so the facade shows a real gate; lined tunnels with lamps; the door panels), `museumplan.js` + `museum3d.js` (the Groninger Museum's walkable ground floor as rooms: cycle passage, atrium, Entreehal, zaal 1, zaal 3 with the Gouden Eierbal case used by H6; a room with `shut` is closed to walkers) |
| Validation | `spotcheck.js` (every start/target point must be open ground you can walk away from), `ringcheck.js` (nothing solid or open water on the ring race lap and ring roads, a car crosses every water crossing of the major and numbered roads at 80 km/h in both directions and three lanes, a scripted car and the AI racers drive a full lap, every rail lift can be walked, driven and cycled up), `passagecheck.js` (every street, cycleway and footway stretch inside a footprint is an opening, a door, a facade graze or clipped, never through a solid wall or an invisible hole; `node scripts/passage_audit.mjs` lists them from the map data); all run in the story test, desktop `--validate-spots[=dir]` runs only them |
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
  speaker = `Rikus`, the narrator) and the rondvaart guide (`Tammo`/`Anita`).
- `audio/npc`: the ambient Gronings phrases.
- `audio/voicelines/sms` (`smsvoice.js`): phone messages read aloud in the
  sender's voice (`Sikkom-redactie` reads the Sikkom news, `Ubbo` the app's
  own texts, `Onbekend nummer (058)` is Mem Terpstra).
- `audio/voicelines/hints` (`smsvoice.js` `hintVoiceFor`): HUD cards that
  are the companion talking (mission stage `say:` lines, `hint()` lines,
  `MODE_HINT`, `cardlines.js` `COMPANION_CARDS`), said by the one you don't
  play (`react` class); a line naming Tammo or Anita is only recorded for
  the other.

All voices go through the voice bus (Stemmen slider) and through one
talking channel, `speech.js` (pure state; `audio.js` plays the clips and
feeds it the AudioContext clock; debug `window.__speech.speechState()`):

- Classes, most important first: `story` (cutscenes, intro montage, the
  rondvaart chase) > `mission` (post-game challenge commentary) > `call`
  (phonefeed.js calls) > `banter` (car talk) > `job` (bijbaan bosses, the
  rondvaart guide) > `react` (Tammo/Anita voicelines, HUD-card lines, police
  barks, Sikkom, navigation, cows) > `ambient` (speech bubbles, NPC
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
`node scripts/tts_lines_list.mjs && python3 scripts/tts_lines.py` (Gemini
TTS via OpenRouter, key in `.env`; clips are trimmed and normalised to
-18 LUFS, the level of the story lines; the run stops at `--budget`).

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
  (`postgame.js`), the Sikkom/phone feed (`phonefeed.js`), phone calls,
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
  card at a time (see "Attention budget"), a short queue (dangers and police first, tips expire),
  the same key updates the card that is up; cards wait while a cutscene
  hides the HUD. `opts.exact` countdowns ("3", "GO! GO! GO!") are a big
  number in the middle. `cardlines.js` lists the few cards Tammo/Anita say
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
    card. "SIKKOM(: | MELDT:)" texts become a Sikkom headline + body;
    `app` is `sikkom`, `bericht` or `geld`. One up at a time with a "+N"
    counter for the waiting ones; story texts (`story: true`) go ahead of
    waiting news, and Sikkom's own reactions wait 12 s after a scene. Everything lands in the Sikkom history (phone.js).
    Each card pings and is read aloud in the sender's voice (`smsvoice.js`,
    `call` class under the owner `sms`: it waits for a playing line, a call
    or a story scene instead of cutting in; the card stays up until the
    voice is done). A text with numbers or names passes `say`, a fixed line
    from `SMS_SAY`, and keeps its full text on the card; `voiced: true`
    (Sikkom clips, cows, the Krolbrug on the car radio) only pings. Sikkom
    news and app texts are read aloud at most once per 45/30 s
    (`attention.js` `mayVoiceText`); story texts (`story: true`) always.
  - `startCall(world, { from, lines: [{ speaker, text, sub }], live, onEnd,
    voice })`: an incoming call (or `live: true`: a Sikkom livestream).
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

## Routes

`routing.js` keeps up to three routes at once, each in its own colour
(`hud_panel.js` `ROUTE_COLORS`): the player's own waypoint (purple), the
objective (mission/story yellow, bijbaan orange) and the care route (pink):
to the nearest snackbar, supermarket or kroeg when health is below 35 (until
50), or to the nearest garage/Pomp & Poets when the player drives their OWN
vehicle (hero or bought) below 55 health (until 90; never for stolen
vehicles). Nothing ever overrides the player's waypoint (Henk's call only
offers the garage). `getActiveRoute()` is the primary one (waypoint, else
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
upgrade, gezondheid/pantser) and `effect` (a chip in the detail bar);
`reveal` plays the kraslot scratch card before the result. One small preview
renderer serves every shop (pixel ratio capped); its model is freed on close.
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

## Trailer (`js/trailer.js`)

A list of staged shots (`buildShots`: label, cuts `vol`/`kort`, duration,
forced clock and weather, a focus the world streams around, captions,
enter/tick/exit for temporary cars, actors, props, and a camera function).
`runTrailer` owns the frame loop while it runs and drives the world through
the title screen's `tick`/`render`/`relocate`; the title screen loop idles
meanwhile. Temporary vehicles carry `cineTemp` (skipped by the title-screen
traffic AI). `Math.random` is seeded per run and world state (clock,
weather, trains, helis, balloons) is restored afterwards. Modes: `attract`
(short cut at every launch except test runs, hold Space to skip, the last shot's `continuation()` becomes the
title screen's first camera move and the logo glides into place),
`benchmark` (real time, fps per shot, results card) and `opname` (fixed
1/60 s step). The benchmark in a running game saves, reloads with a
sessionStorage flag and continues the save after "Terug". Captions are
driven by trailer time, not CSS animations, so slow fixed-step recordings
stay in sync. Actors and props (Tammo, Anita, the pigeon) are built once per
session and only hidden between shots; the colour look is a uniform in the
grade pass (`postfx.look`), not a CSS filter over the canvas. A shot with
`fadeOut` ends on black and streams the next location in there, like the
black cards.

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
- `economy.js`: the shared money numbers outside the shop stock (repair,
  wreck, plates and bust costs, fines, side-job pay factor, post-game
  prizes, the Fjord Frituur's daily wage, eierbal finds). `storytest.js`
  checks the economy targets (margins, early car/gun, cheap repairs, top
  vehicles after the Romp) against it and the shop prices.
- `story.js`: finds the current step (done = finished/skipped, a passed
  mission, or an activity made moot by a later passed mission; that also
  migrates pre-0.5 saves). It publishes `world.storyGuide` (routing.js uses
  it after the player's own waypoint, a side job and an active mission),
  sends the step's phone line, pays a one-time voorschot when the player is
  short for a required purchase, switches who you play (`step.player`:
  Tammo and Anita trade roles behind a short fade; there is no free switch)
  and waits for the night at a garage, offers
  "Sla deze missie over" (O, or the pause menu Missies tab) after a failed
  mission and for any activity, and saves under `story` in the savegame.
  `missions.js` reports back through `setMissionHooks` (passed, failed,
  gated, waived requirements).
- Missions: requirements (`requires`: weapon, bike, car, heist, night,
  boat; also an array) gate the start. Type `stages` builds a mission from
  small objectives (board, goto, hold, garage, escape, pigeon, scene, chase,
  vault; documented above `resolveTarget`); the new missions H2, H4, H6, H8
  and H10 use it (H6 adds plan, fuse, lock, pickpocket, laser, crack, getaway and shot, and `only` stages per approach), and the Staart adds boatchase (H14's skûtsje on the Diepenring
  route), heli (helirun.js as a stage), fireworks on a hold, a timed goto,
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

- Actors: `missionstory.js` builds Tammo, Anita, the mission NPC and any
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
  follow on the phone once the contact is over. `world.storyContact` keeps
  the car banter quiet meanwhile. Jelle's replies when you call him
  (phone.js) are voiced too.
- The arc: `PARTS.<part>.recap` plays an "Eerder in GTE VI" card when a later
  part starts (story.js `playRecap`, once per save, flag `recap:<part>`);
  `CLUES` and `WHY` feed "Wat weten we?" in the pause menu (Missies tab,
  story.js `getStoryJournal`: a clue shows once its step is done, a toast
  and a sting announce it); each step's `why` is the handover line when
  Tammo and Anita trade places (story.js `playHandover`: a whip in the
  character's colour, a name card, a cut to them).

Adding a part (e.g. the Staart): add new mission defs at the end of
`buildDefs` in missions.js and their ids at the end of `MISSION_IDS`, add
their dialogue at the same index in `missionstory.js` `STORY`, fill in
`mission` and `built: true` on the steps in `STEPS` (activities too; new goal
types go in `GOALS` in story.js), set `PARTS.<part>.open = true`, then run
`--story-test` (it plays every open step, checks who plays each one and
ends at the last open part's card).

## Car banter

`banter.js` plays the exchanges in `banterlines.js` while Tammo and Anita
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
