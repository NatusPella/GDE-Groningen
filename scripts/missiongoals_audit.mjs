// Audit of the goals of the story missions (#243, #93): is every marker of a mission a place the
// player can reach and trigger? Pure: no browser, no Electron.
//   node scripts/missiongoals_audit.mjs [--all] [--quiet]
// Checks, per marker (start, destination, stunt centre, waypoints, stage targets):
//   - finite coordinates, resolved (a landmark or shop that does not exist gives null)
//   - on foot or by car: not inside a building or water, and a walkable spot within 3 m
//     (the player must get inside the trigger radius, 4 m for a start, 7 m / 3.5 m for a stage)
//   - a start with a vehicle sits on a drivable road
//   - not in the tiles that this checkout does not have (outside the city map): reported as "buiten stad", not an error
// Markers inside the city map only; the province (acts 2-5) lies in tiles (game/world) that are not in a worktree.
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const M = await import('../game/js/missions.js');
const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const { MISSION_IDS } = await import('../game/js/storyarc.js');
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root), 'utf8'));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root), 'utf8')));
const map = new GameMap(data);
const world = { map, onRespawn: [], addMessage() {}, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [] };
M.initMissions(world);
const defs = M.getMissionDefs();

const all = process.argv.includes('--all');
const quiet = process.argv.includes('--quiet');
const TRIGGER = 4;
const bounds = map.meta.bounds || null; // [minx, miny, maxx, maxy]
const inCity = (p) => !bounds || (p.x >= bounds[0] - 50 && p.x <= bounds[2] + 50 && p.y >= bounds[1] - 50 && p.y <= bounds[3] + 50);

const issues = [];
const info = { checked: 0, outside: 0 };
const issue = (id, where, msg) => issues.push(`${id} ${where}: ${msg}`);

// a spot is reachable on foot when it is open ground, or open ground lies within `r` m of it
function reachable(p, r) {
  if (map.isOpenSpot(p.x, p.y)) return 0;
  for (let rr = 1; rr <= r; rr += 0.5) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      if (map.isOpenSpot(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr)) return rr;
    }
  }
  return Infinity;
}

function check(id, where, p, { radius, vehicle = false, needRoad = false, building = false } = {}) {
  if (!p) { issue(id, where, 'doel is niet te bepalen (onbekende plek of winkel)'); return; }
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { issue(id, where, 'geen geldige coördinaten'); return; }
  if (!inCity(p)) { info.outside++; return; }
  info.checked++;
  if (radius != null && radius < TRIGGER - 0.01) issue(id, where, `activatiestraal ${radius} m is kleiner dan ${TRIGGER} m`);
  const d = building ? 0 : reachable(p, 3);
  if (d === Infinity) issue(id, where, `ligt in een gebouw of in water; geen begaanbare grond binnen 3 m (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
  else if (d > 0 && radius != null && d > radius * 0.6) issue(id, where, `begaanbare grond pas op ${d} m, terwijl de activatiestraal ${radius} m is`);
  if (needRoad && !p.road) issue(id, where, 'staat niet op een berijdbare weg');
  if (vehicle) {
    // the car has to get within the radius of the marker: a drivable road must pass inside it
    const r = map.nearestRoadPoint(p.x, p.y, 200, true);
    const gap = r ? Math.hypot(r.x - p.x, r.y - p.y) : Infinity;
    if (radius != null && gap > radius - 1) issue(id, where, `de dichtstbijzijnde berijdbare weg ligt ${gap === Infinity ? '>200' : gap.toFixed(1)} m weg, de aankomststraal is ${radius} m`);
  }
}

// a target spec to the places it can mean: a shop type or a garage depends on where the player is
// (nearest), so every candidate (all shops of the type, the garage nearest to the start) is checked
function targetsOf(spec, from) {
  if (spec && spec.shop) {
    const types = [].concat(spec.shop);
    // the nearest shop of the type to where the mission starts (the game takes the nearest to the player)
    const s = (map.meta.shops || []).filter((q) => types.includes(q.t)).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
    return s ? [{ x: s.x, y: s.y }] : [null];
  }
  if (spec && spec.garage) {
    const g = (map.meta.garages || []).slice().sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
    return g ? [{ x: g.x, y: g.y }] : [null];
  }
  return [M.resolveMissionTarget(world, spec, from)];
}

const kinds = new Set(['goto', 'hold', 'board']);
const stepOf = (id) => STEPS.find((s) => s.mission === id);
for (const [i, def] of defs.entries()) {
  const mid = MISSION_IDS[i];
  const step = stepOf(mid);
  if (!step || !step.built) continue;
  if (!all && step.part !== 'kop') continue;
  const id = `${step.id} ${def.label}`;
  const car = def.vehicle === 'car' || def.type === 'deliver';
  if (!def.start) { issue(id, 'start', 'geen startplek'); continue; }
  check(id, 'start', def.start, { radius: def.triggerRadius || TRIGGER, needRoad: def.type === 'deliver' && def.start.road !== undefined ? false : false });
  if (def.type === 'deliver' && !def.start.road) issue(id, 'start', 'bezorgmissie zonder berijdbare weg bij de start');
  if (def.dest) check(id, 'bestemming', def.dest, { radius: 16, vehicle: true });
  if (def.stunt && def.stunt.center) check(id, 'stuntplein', def.stunt.center, { radius: def.stunt.radius });
  for (const [k, w] of (def.waypoints || []).entries()) check(id, `waypoint ${k + 1}`, w, { radius: w.via ? 12 : 7 });
  for (const [k, st] of (def.stages || []).entries()) {
    const where = `stap ${k + 1} (${st.kind})`;
    // heist spots lie inside the building on purpose (tight radii, sneaking); pigeon targets are in the air
    if (st.target && st.target.heistSpot) continue;
    // places that only exist while the mission runs (the boat of Klaas, the skûtsje, your rented boat, the route)
    if (st.target && (st.target.storyBoat || st.target.skutsje || st.target.rental || st.target.route || st.target.shore)) continue;
    if (st.target && (kinds.has(st.kind) || st.kind === 'garage')) {
      const r = st.kind === 'garage' ? 16 : st.radius || (st.kind === 'hold' ? 3.5 : 7);
      for (const t of targetsOf(st.target, def.start)) check(id, where, t, { radius: r, vehicle: st.mode === 'vehicle' || st.kind === 'garage', building: st.kind === 'garage' || !!st.target.shop });
    }
  }
}

if (!quiet) for (const s of issues) console.log('PROBLEEM', s);
console.log(`missiongoals_audit: ${info.checked} markers binnen de stad gecontroleerd, ${info.outside} buiten de stad (niet gecontroleerd), ${issues.length} problemen`);
process.exit(issues.length ? 1 : 0);
