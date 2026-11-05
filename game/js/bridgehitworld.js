import { hoofdspeler } from './players.js';
// Ships against bridges in the world (#9): the rules are in bridgehit.js.
// Every frame the heavy boats near a shut bridge are checked at the bow; a
// hit damages the deck record (kept per road, this session only), dents the
// hull and pushes the boat back out of the span. A deck that is closed to
// traffic gets the barriers and the AI stop of movablebridges.js
// (setDamagedBridgeBarriers); walkers and the player are never blocked.
// Dev: ?brugbotsing sends a barge at the nearest bridge (startBridgeCrashDemo).
import { clearanceOver, waterAt, airDraftOf, boatModelKind } from './waterlevels.js';
import { setDamagedBridgeBarriers } from './movablebridges.js';
import * as H from './bridgehit.js';

const decks = new Map(); // road -> { d, rec }
const REACH = 40; // only boats this near the player are looked at (they are the ones simulated)

export function resetBridgeDamage() { decks.clear(); setDamagedBridgeBarriers([]); }
export const bridgeDamageOf = (road) => (decks.get(road) || {}).d || null;

// A record shaped like a movablebridges.js bridge, for boomsOf and the AI stop.
function recordFor(r) {
  const a = r.pts[0], b = r.pts[r.pts.length - 1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const wide = r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor';
  return {
    r, kind: 'damaged', ax: a[0], ay: a[1], bx: b[0], by: b[1], len, ux, uy,
    x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, half: (r.width || 4) / 2 + (wide ? 1.8 : 0.15),
    name: r.name || '', state: 'closed', t: 0, open: 0, boom: 0, flash: 0, warn: false, snapped: null, _booms: null,
  };
}

function syncBarriers() {
  const list = [];
  for (const e of decks.values()) {
    const shut = H.deckClosedToTraffic(e.d);
    e.rec.state = shut ? 'damaged' : 'closed';
    e.rec.boom = shut ? 1 : 0;
    e.rec.warn = shut;
    if (shut) list.push(e.rec);
  }
  setDamagedBridgeBarriers(list);
}

// The shut bridge deck the point is on (a fixed bridge, or a movable one that is closed), or null.
function deckAt(map, x, y) {
  if (!map.roadsNear) return null;
  for (const r of map.roadsNear(x, y, 12)) {
    if (!r.bridge || r._open || r.pts.length < 2) continue;
    const e = decks.get(r) || { d: H.newDeckDamage(), rec: recordFor(r) };
    if (e.rec.len < 3) continue;
    const b = e.rec, dx = x - b.ax, dy = y - b.ay;
    const s = dx * b.ux + dy * b.uy, o = -dx * b.uy + dy * b.ux;
    if (s < -1 || s > b.len + 1 || Math.abs(o) > b.half + 1) continue;
    return e;
  }
  return null;
}

// Returns the hits of this frame ({ boat, road, severity, line }) for callers
// that show a line or play a sound.
export function updateBridgeHits(dt, world) {
  const out = [];
  if (!(dt > 0) || !world || !world.map) return out;
  let any = false;
  for (const e of decks.values()) { if (e.d.level || e.d.cool) { H.stepDeckDamage(e.d, dt); any = true; } }
  if (any) syncBarriers();
  const map = world.map, p = hoofdspeler(world);
  for (const v of world.vehicles || []) {
    if (!v.isBoat || v.wrecked || v.sinking || !v.model) continue;
    if (p && Math.hypot(v.x - p.x, v.y - p.y) > REACH + (v.model.len || 0)) continue;
    const speed = v.speed || 0;
    if (Math.abs(speed) < H.MIN_SPEED) continue;
    const kind = boatModelKind(v);
    const massT = v.bridgeMassT ?? H.massOf(kind);
    if (massT < H.MIN_MASS_T) continue;
    // the bow, in the direction of travel
    const dir = Math.sign(speed) || 1, half = (v.model.len || 4) / 2;
    const bx = v.x + Math.cos(v.angle) * half * dir, by = v.y + Math.sin(v.angle) * half * dir;
    const e = deckAt(map, bx, by);
    if (!e || !H.canBeHit(e.d)) continue;
    const w = waterAt(map, bx, by);
    const clearance = clearanceOver(map, bx, by, w ? w.level : undefined);
    const air = v.bridgeAir ?? airDraftOf(v);
    const hit = H.shipImpact({ air, clearance, massT, speed });
    if (!hit) continue;
    decks.set(e.rec.r, e);
    H.hitDeck(e.d, hit.severity);
    const hull = H.hullHit(hit.severity, v.health ?? 100);
    v.health = hull.health;
    v.speed = speed * hull.speedKeep[hit.severity];
    // out of the span, along the water, on the side it came from
    const [nx, ny] = H.pushBackDir(e.rec, v.x, v.y);
    const gap = e.rec.half + half + 1.5 - Math.abs((v.x - e.rec.x) * nx + (v.y - e.rec.y) * ny);
    if (gap > 0) { v.x += nx * gap; v.y += ny * gap; }
    v.bridgeDents = (v.bridgeDents || 0) + 1;
    syncBarriers();
    out.push({ boat: v, road: e.rec.r, severity: hit.severity, line: hull.line });
    // the one-liner, when the player is at the spot (boats are only simulated this near)
    if (hull.line && p && world.addMessage) world.addMessage(hull.line, 5, { kind: 'tip' });
  }
  return out;
}

// Dev: put the nearest boat (made a 280 t barge for this test) 45 m from the
// nearest fixed bridge, on the water side, heading for the middle at 5 m/s.
// Returns the bridge name, or null when nothing is near.
export function startBridgeCrashDemo(world) {
  const map = world.map, p = hoofdspeler(world);
  if (!map || !p || !map.roadsNear) return null;
  let bestR = null, bd = Infinity;
  for (const r of map.roadsNear(p.x, p.y, 300)) {
    if (!r.bridge || r._open || r.pts.length < 2) continue;
    const q = recordFor(r);
    if (q.len < 3) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; bestR = r; }
  }
  let boat = null, boatD = Infinity;
  for (const v of world.vehicles || []) {
    if (!v.isBoat || v.wrecked) continue;
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d < boatD) { boatD = d; boat = v; }
  }
  if (!bestR || !boat) return null;
  const rec = recordFor(bestR), nx = -rec.uy, ny = rec.ux;
  boat.x = rec.x - nx * 45; boat.y = rec.y - ny * 45;
  boat.angle = Math.atan2(ny, nx);
  boat.speed = 5;
  boat.bridgeMassT = 280; boat.bridgeAir = 4.2;
  boat.scripted = true; // it holds its course; nothing else steers it
  boat.demoUntil = 12;
  return bestR.name || 'een brug';
}

// Dev glue: keeps a demo boat going straight until it has hit or 12 s passed.
export function stepBridgeCrashDemo(dt, world) {
  for (const v of world.vehicles || []) {
    if (!v.demoUntil) continue;
    v.demoUntil -= dt;
    if (v.demoUntil <= 0 || v.bridgeDents) { v.demoUntil = 0; v.scripted = false; continue; }
    v.applyControls(dt, 1, 0, false); // full ahead, straight
  }
}

