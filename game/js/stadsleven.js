// stadsleven.js (#67): the profile towns come to life in the game. stadsplan.js
// draws the candidate spots; here the ones near the player are resolved on the
// tiles that are in (kerb spots on free ground), their props are built and dropped
// again as the player moves on, a shop's board says its line when you walk by, and
// the town's mood line (per part of the day) turns up now and then. Everything made
// up: no real shops. Needs the tiles; without the province nothing happens.
import { getScene } from './scene3d.js';
import { townAt, sfeerLine } from './stadsprofielen.js';
import { planTown, resolveItem, roadside } from './stadsplan.js';
import { buildProp, disposeProp, animateProp } from './ommelandprops3d.js';
import { openGround } from './ommelandplace.js';
import { waterGap, roadKind } from './tileplace.js';
import { urbanWeight } from './provinceworld.js';
import { BEBOUWD_VANAF } from './dierenregister.js';

const NEAR_M = 150; // candidate tries within this distance of the player are resolved
const SHOW_M = 120; // props within this are built
const DROP_M = 170; // and dropped beyond this
const SHOP_M = 9; // a board speaks within this
const SFEER_FIRST_S = 9;
const SFEER_EVERY_S = 55;
const SCAN_S = 1;

const towns = new Map(); // id -> { plan, state: Map(itemId -> { tested:Set, spot|null, prop|null }) }
let scanT = 0, sfeerT = 0, here = null, lastLine = '';
const spoken = new Map(); // shop id -> time it last spoke
const solids = [];

function townState(t) {
  let s = towns.get(t.id);
  if (!s) { s = { plan: planTown(t), st: new Map() }; towns.set(t.id, s); }
  return s;
}

// resolve one try on the tiles that are in: a kerb spot on open ground (water-wanting props within 35 m of water)
function resolveOn(map) {
  return (x, y, item) => {
    const roads = map.roadsNear(x, y, 90).filter((r) => roadKind(r) > 0 && !r.bridge).map((r) => ({ pts: r.pts, width: r.width }));
    if (!roads.length) return null;
    const q = roadside(x, y, roads, (px, py) => openGround(map, px, py, { r: 0.9, road: 0.2 }));
    if (!q) return null;
    if (item.water && waterGap(map, q.x, q.y, 40) < -35) return null;
    if (item.vee && urbanWeight(q.x, q.y) > BEBOUWD_VANAF) return null;   // #330: vee niet tussen de huizen
    return q;
  };
}

function groundAt(map, x, y) {
  try { return map.groundHeightAt ? map.groundHeightAt(x, y, 50) : 0; } catch (e) { return 0; }
}

function build(w, it, s) {
  let prop;
  try { prop = buildProp(it.build, {}, it.shop ? { name: it.shop.name, sub: it.shop.kind } : {}); } catch (e) { return; }
  const g = prop.group;
  g.position.set(s.spot.x, groundAt(w.map, s.spot.x, s.spot.y), s.spot.y);
  g.rotation.y = -s.spot.a;
  getScene().add(g);
  s.prop = prop;
  const c = Math.cos(s.spot.a), si = Math.sin(s.spot.a);
  s.solids = prop.solids.map(([lx, lz, r]) => ({ x: s.spot.x + lx * c - lz * si, y: s.spot.y + lx * si + lz * c, r }));
}

function drop(s) {
  if (s.prop) disposeProp(s.prop);
  s.prop = null; s.solids = null;
}

function scan(w, t, px, py) {
  const T = townState(t);
  const resolve = resolveOn(w.map);
  const placed = [];
  for (const s of T.st.values()) if (s.spot) placed.push(s.spot);
  for (const it of T.plan.items) {
    let s = T.st.get(it.id);
    if (!s) { s = { tested: new Set(), spot: null, prop: null }; T.st.set(it.id, s); }
    if (!s.spot) {
      // only the tries near the player have tiles round them
      const part = { ...it, tries: it.tries.filter((q, i) => !s.tested.has(i) && Math.hypot(q[0] - px, q[1] - py) < NEAR_M) };
      if (part.tries.length) {
        const idxs = it.tries.map((q, i) => i).filter((i) => !s.tested.has(i) && Math.hypot(it.tries[i][0] - px, it.tries[i][1] - py) < NEAR_M);
        const spot = resolveItem(part, resolve, placed);
        for (const i of idxs) s.tested.add(i);
        if (spot) { s.spot = spot; placed.push(spot); }
      }
    }
    if (s.spot) {
      const d = Math.hypot(s.spot.x - px, s.spot.y - py);
      if (!s.prop && d < SHOW_M) build(w, it, s);
      else if (s.prop && d > DROP_M) drop(s);
    }
  }
}

export function updateStadsleven(dt, w) {
  if (!w.map || !w.map.store || !w.player || w.paused) return;
  const p = w.player, v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  const t = townAt(x, y);
  if (t !== here) {
    here = t; sfeerT = SFEER_FIRST_S;
    if (!t) { for (const T of towns.values()) for (const s of T.st.values()) drop(s); solids.length = 0; }
  }
  if (!t) return;
  const T = townState(t);
  for (const s of T.st.values()) if (s.prop) animateProp(s.prop, dt, w.time);
  scanT -= dt;
  if (scanT <= 0) {
    scanT = SCAN_S;
    scan(w, t, x, y);
    solids.length = 0;
    for (const s of T.st.values()) if (s.solids) solids.push(...s.solids);
    // a shop board speaks when you pass it
    for (const it of T.plan.items) {
      if (!it.shop) continue;
      const s = T.st.get(it.id);
      if (!s || !s.spot || Math.hypot(s.spot.x - x, s.spot.y - y) > SHOP_M) continue;
      if (w.time - (spoken.get(it.id) ?? -Infinity) < 120) continue;
      spoken.set(it.id, w.time);
      w.addMessage(`${it.shop.name}: ${it.shop.line}`, 4, { kind: 'tip' });
    }
  }
  sfeerT -= dt;
  if (sfeerT <= 0) {
    sfeerT = SFEER_EVERY_S;
    lastLine = sfeerLine(t, w.clock || 12, Math.random, lastLine);
    w.addMessage(lastLine, 4, { kind: 'tip' });
  }
}

export function townSolids(out) {
  out.push(...solids);
  return out;
}

export function townDebug() {
  return [...towns.entries()].map(([id, T]) => ({ id, here: !!here && here.id === id, items: T.plan.items.length, resolved: [...T.st.values()].filter((s) => s.spot).length, built: [...T.st.values()].filter((s) => s.prop).length }));
}
