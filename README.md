# GTA Groningen

Top-down GTA1-style sandbox game set in the real street/building layout of
Groningen (binnenstad + surroundings, ~3.8 × 3.7 km), built from live
OpenStreetMap data. Vanilla JS + Canvas, no build step.

## Run it

```bash
python3 -m http.server 8765 --directory game
```

Then open http://localhost:8765. (Claude Code's `.claude/launch.json` in the
project root already has this wired up for the Browser pane.)

## Controls

- **WASD / arrows** — walk (hold **Shift** to run)
- **E** or **F** — enter/exit the nearest car
- In a car: **W/S** throttle/reverse, **A/D** steer, **Space** brake
- **Mouse** — aim, **left click / hold** — attack (melee with fists, fire held guns)
- **1-4** — switch weapon (fists / pistol / uzi / shotgun)

## What's in it

- `scripts/process_osm.py` — pulls roads/buildings/water/parks for Groningen
  from the Overpass API and projects them to a flat meter grid (`game/map.json`)
- `game/js/mapdata.js`, `render.js` — spatial-grid-indexed map loading & drawing
  (steady 60fps with ~35k building footprints via viewport culling)
- `game/js/vehicle.js`, `player.js` — arcade driving physics, on-foot movement,
  building collision, vehicle enter/exit, simplified road-graph traffic AI
  (respects one-way streets)
- `game/js/pedestrians.js` — wandering/fleeing civilians, road-aware wander AI
- `game/js/combat.js` — fists/pistol/uzi/shotgun, bullets, melee, damage
- `game/js/police.js` — wanted level (0-5), spawning/chasing police cars,
  busted-on-contact
- `game/js/missions.js` — a 4-mission chain (steal & deliver, rampage,
  checkpoint race, big delivery) looping after completion
- `game/js/hud.js` — health/armor/wanted/money/weapon/mission HUD + minimap

See [ARCHITECTURE.md](ARCHITECTURE.md) for the shared-state contract between
modules.

## Known scope limits

- Map area is the city core (binnenstad + immediate surroundings), not all of
  Groningen — re-run `process_osm.py` with a wider bbox to expand it.
- Police are cars only (no foot officers); no weapon/health pickups (ammo is
  seeded once at game start); no save/load; no sound.
- Traffic/pedestrian density is maintained dynamically around the player
  rather than simulating the whole city at once.
