// Sails the player's boats out of every city canal that leaves the map, into
// the Ommeland water, and back in: the real boat physics (Vehicle.applyControls
// with the player's tuning, resolveVehicleBuildingCollision, keepBoatOffShore,
// as player.js drives a boat) and the Ommeland water as the game loads it
// (countryreal + countryedge + the clearance hook countrywater.js registers).
// A scripted helmsman steers like a player: throttle on, the stick toward the
// goal, and away from the bank it sees ahead; back in, by way of the exit.
//   node scripts/boat_edge_sim.mjs
//   BOAT_AT=x,y node scripts/boat_edge_sim.mjs   (also a clearance map round x,y:
//   # land, + under 1 m, : under 2 m, . under 3 m)
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { Vehicle, resolveVehicleBuildingCollision } = await import('../game/js/vehicle.js');
const { keepBoatOffShore, setExtraWater, normalizeAngle, clamp, pointInPolygon } = await import('../game/js/util.js');
const { initReal } = await import('../game/js/countryreal.js');
const { setCountryBounds, rectOutside, SHORE_RW } = await import('../game/js/countryfield.js');
const { initCountryEdge, wideWaterAt, openWater } = await import('../game/js/countryedge.js');
const { setCountryClearance, waterClearance } = await import('../game/js/waterindex.js');
const { countryClearance } = await import('../game/js/countrywater.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');

const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
const om = JSON.parse(fs.readFileSync(new URL('ommeland.json', root)));
const bin = zlib.gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
initReal(map, { ...om, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) });
setCountryBounds(map.meta.bounds);
initCountryEdge(map);
// as countrywater.js init() does in the game
setExtraWater(wideWaterAt);
setCountryClearance(countryClearance);

// City canals that reach the map edge: per polygon and side, the stretch of
// outline within 2 m of the edge, at least 4 m wide.
const [minx, miny, maxx, maxy] = map.meta.bounds;
const SIDES = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const exits = [];
for (const w of map.water) {
  const by = [[], [], [], []];
  for (const [x, y] of w.pts) {
    if (x - minx < 2) by[0].push(y);
    if (maxx - x < 2) by[1].push(y);
    if (y - miny < 2) by[2].push(x);
    if (maxy - y < 2) by[3].push(x);
  }
  by.forEach((v, s) => {
    if (v.length < 2) return;
    const lo = Math.min(...v), hi = Math.max(...v);
    if (hi - lo < 4) return;
    const mid = (lo + hi) / 2;
    const e = s === 0 ? [minx, mid] : s === 1 ? [maxx, mid] : s === 2 ? [mid, miny] : [mid, maxy];
    exits.push({ s, n: SIDES[s], e, wd: hi - lo, name: w.name || '', pts: w.pts });
  });
}

const DT = 1 / 30;
const clear = (x, y) => waterClearance(map, x, y, 8);

// The helmsman: of the headings within 75 degrees of the goal, the one with
// the most open water along a 14 m look-ahead, with a pull toward the goal.
function steerFor(v, gx, gy) {
  const toGoal = Math.atan2(gy - v.y, gx - v.x);
  let best = toGoal, bestScore = -Infinity;
  for (let k = -5; k <= 5; k++) {
    const a = toGoal + k * (Math.PI / 12);
    let minC = 8;
    for (let d = 3; d <= 14; d += 2.75) minC = Math.min(minC, clear(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d));
    const score = Math.min(minC, 4) * 2 - Math.abs(k) * 0.35 - (minC < 0.8 ? 20 : 0);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

let steerSign = 0;
function sail(v, goal, limitS) {
  let t = 0, slowT = 0, backUntil = -9, bumps = 0, progressAt = 0, bestD = Infinity;
  while (t < limitS) {
    const d = Math.hypot(goal[0] - v.x, goal[1] - v.y);
    if (d < 10) return { ok: true, t, bumps };
    if (d < bestD - 2) { bestD = d; progressAt = t; }
    if (t - progressAt > 25) return { ok: false, t, bumps, why: 'no progress for 25 s', at: [v.x, v.y] };
    const want = steerFor(v, goal[0], goal[1]);
    const err = normalizeAngle(want - v.angle);
    // nose against the bank: back off for a moment, the stick the other way
    if (slowT > 1.2 && t > backUntil + 1) backUntil = t + 1.8;
    const backing = t < backUntil;
    const steer = clamp(err * 2.2 * steerSign, -1, 1) * (backing ? -1 : 1);
    const throttle = backing ? -1 : 1;
    const px = v.x, py = v.y, pa = v.angle;
    const n = Math.min(4, Math.max(1, Math.ceil(Math.abs(v.speed) * DT / 0.25)));
    for (let i = 0; i < n; i++) {
      v.applyControls(DT / n, throttle, steer, false);
      resolveVehicleBuildingCollision(v, map, DT / n);
    }
    if (!keepBoatOffShore(map, v, px, py, pa)) { v.speed *= -0.25; v.driftX = 0; v.driftY = 0; bumps++; }
    t += DT;
    slowT = Math.abs(v.speed) < 0.6 ? slowT + DT : 0;
  }
  return { ok: false, t, bumps, why: 'time', at: [v.x, v.y] };
}

function makeBoat(model, x, y, angle) {
  const v = new Vehicle(x, y, angle, { ...model });
  v.isBoat = true;
  v.driver = 'player';
  v.speed = 0;
  return v;
}

// Which sign of the stick turns toward a larger angle.
{
  const v = makeBoat(BOAT_KINDS.sloep, 0, 0, 0);
  v.speed = 3;
  for (let i = 0; i < 30; i++) v.applyControls(DT, 1, 1, false);
  steerSign = normalizeAngle(v.angle) > 0 ? 1 : -1;
}

// A start well inside the canal: the spot of its own polygon with the most
// room, 35-90 m in from the edge and within 70 m of the exit.
function startFor(ex) {
  let best = null;
  for (let a = -70; a <= 70; a += 2) {
    for (let d = 35; d <= 90; d += 2) {
      const x = ex.e[0] - ex.n[0] * d + (ex.n[1] ? a : 0);
      const y = ex.e[1] - ex.n[1] * d + (ex.n[0] ? a : 0);
      if (!pointInPolygon(x, y, ex.pts)) continue;
      const c = clear(x, y) - Math.abs(a) * 0.01;
      if (!best || c > best.c) best = { x, y, c };
    }
  }
  return best && best.c >= 1.5 ? best : null;
}

// The goal out there: the open-water spot 50-160 m past the edge with room
// (3 m or more) nearest to the exit.
function goalFor(ex) {
  let best = null;
  for (let r = 4; r <= 200; r += 4) {
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const p = [ex.e[0] + Math.cos(a) * r, ex.e[1] + Math.sin(a) * r];
      const out = rectOutside(...p);
      if (out < 50 || out > 160 || clear(...p) < 3) continue;
      if (!best || r < best.r) best = { p, r };
    }
    if (best) break;
  }
  return best && best.p;
}

const HULLS = [['sloep', BOAT_KINDS.sloep], ['rubberboot', BOAT_KINDS.rubberboot], ['rondvaart', BOAT_KINDS.rondvaart]];
let outOk = 0, backOk = 0, tried = 0;
const rows = [];
for (const ex of exits) {
  const st = startFor(ex);
  const across = clear(ex.e[0] + ex.n[0] * 2, ex.e[1] + ex.n[1] * 2);
  if (!st) { rows.push(`${ex.name || '?'} side ${ex.s} (${ex.wd.toFixed(0)} m): no start with room`); continue; }
  for (const [hn, model] of HULLS) {
    // the widest hull only where the canal could ever take it
    if (hn === 'rondvaart' && ex.wd < 10) continue;
    tried++;
    const v = makeBoat(model, st.x, st.y, Math.atan2(ex.n[1], ex.n[0]));
    const g = goalFor(ex);
    if (!g) { rows.push(`${ex.name || '?'} side ${ex.s}: no open water past the edge`); tried--; break; }
    const out = sail(v, g, 150);
    const reached = rectOutside(v.x, v.y);
    let back = null;
    if (out.ok) { outOk++; back = sail(v, ex.e, 150);
      if (back.ok) { const b2 = sail(v, [st.x, st.y], 150); back = { ...b2, t: back.t + b2.t, bumps: back.bumps + b2.bumps }; } if (back.ok) backOk++; }
    rows.push(`${(ex.name || '?').padEnd(22)} side ${ex.s} ${ex.wd.toFixed(0).padStart(3)} m  edge ${across.toFixed(1).padStart(4)} m  ${hn.padEnd(10)} ` +
      `out ${out.ok ? 'ok ' : 'NO '} ${out.t.toFixed(0).padStart(3)} s ${String(out.bumps).padStart(3)} bumps  furthest ${reached.toFixed(0)} m` +
      (back ? `  back ${back.ok ? 'ok' : 'NO'} ${back.t.toFixed(0)} s` + (back.ok ? '' : ` (${back.why} at ${back.at.map((q) => q.toFixed(0)).join(',')}, ${back.bumps} bumps)`) : '') + (out.ok ? '' : `  (${out.why} at ${out.at.map((q) => q.toFixed(0)).join(',')})`));
  }
}
if (process.env.BOAT_AT) {
  const [cx, cy] = process.env.BOAT_AT.split(',').map(Number);
  for (let y = cy - 30; y <= cy + 30; y += 1.5) {
    let line = (y.toFixed(0)).padStart(6) + ' ';
    for (let x = cx - 40; x <= cx + 40; x += 1) { const c = clear(x, y); line += c < 0 ? '#' : c < 1 ? '+' : c < 2 ? ':' : c < 3 ? '.' : ' '; }
    console.log(line);
  }
}
console.log(`${exits.length} canal exits at the map edge, steer sign ${steerSign}`);
for (const r of rows) console.log('  ' + r);
console.log(`out ${outOk}/${tried}, back in ${backOk}/${outOk}`);
