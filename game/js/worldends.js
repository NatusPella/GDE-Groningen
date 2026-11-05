import { hoofdspeler } from './players.js';
import { getScene } from './scene3d.js';
import { setRealRoadBlocks } from './countrylife.js';
import { roadNetRows } from './roadgraph.js';
import { inProvinceData } from './provinceworld.js';
import { recordUnique, hasUnique } from './achievements.js';
import { showCard } from './hudcards.js';
import { notifyPhone } from './phonefeed.js';
import { isCinematicActive } from './cinematics.js';
import { buildProp, disposeProp, animateProp } from './ommelandprops3d.js';
import { speak } from './ommelandtalk.js';
import { WORLD_ENDS, WORLD_END_TOTAL, WORLD_END_FINAL } from './ommelandlines.js';

// "Einde van de wereld": at twelve of the roads that run off the edge of
// the province's data (provinceworld.js, the road net's edge) something waits where the
// asphalt stops - a sign, a lost Frisian, a cow that won't budge. Found ends
// are a lifetime set (achievements.js 'wereldeinden'), so Prestaties shows
// "3/12" without saying where; the twelfth plays the final gag. Spots are
// picked once, deterministically, from the road data; props only exist
// while the player is within BUILD_R.

const INSET = 14;
const BUILD_R = 260, DROP_R = 380, ANIM_R = 90;
const FIND_R = 16, FIND_R_CAR = 20, TALK_R = 13, TALK_GAP = 45;
const SPACING = [1500, 900, 500];
const KIND_RANK = { 5: 0, 4: 1, 6: 2, 3: 3 };

let spots = null;
let finalAt = 0;

export const SET = 'wereldeinden';

// Where the bigger real roads cross the edge of the data (inset a little):
// { x, y, ux, uy (outwards along the road), hw, kind, name }.
// The edge of the data is where the road net leaves the tiles.
function tileCandidates(rows) {
  const out = [];
  const sideOf = (ux, uy) => (Math.abs(ux) > Math.abs(uy) ? (ux < 0 ? 0 : 1) : (uy < 0 ? 2 : 3));
  for (const r of rows) {
    if (!(r.kind in KIND_RANK) || r.bridge) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      if (!inProvinceData(a[0], a[1]) || inProvinceData(b[0], b[1])) continue;
      let lo = 0, hi = 1;
      for (let k = 0; k < 10; k++) {
        const m = (lo + hi) / 2;
        if (inProvinceData(a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m)) lo = m; else hi = m;
      }
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      // a gap in the tiles inside the province is no edge: nothing lies beyond it
      const cx = a[0] + (b[0] - a[0]) * lo, cy = a[1] + (b[1] - a[1]) * lo;
      if ([1500, 3000, 4500].some((d) => inProvinceData(cx + ux * d, cy + uy * d))) continue;
      const x = a[0] + (b[0] - a[0]) * lo - ux * INSET, y = a[1] + (b[1] - a[1]) * lo - uy * INSET;
      out.push({ x, y, ux, uy, hw: r.w / 2, kind: r.kind, name: r.name || r.ref || '', side: sideOf(ux, uy) });
    }
  }
  return out;
}

function place() {
  const all = tileCandidates(roadNetRows());
  all.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || (b.name ? 1 : 0) - (a.name ? 1 : 0) || a.x - b.x || a.y - b.y);
  // round the four edges in turn, so every side of the map gets its ends
  let pick = [];
  for (const gap of SPACING) {
    pick = [];
    const bySide = [0, 1, 2, 3].map((si) => all.filter((c) => c.side === si));
    for (let round = 0; pick.length < WORLD_END_TOTAL && round < 40; round++) {
      for (const si of [2, 1, 3, 0]) {
        if (pick.length >= WORLD_END_TOTAL) break;
        // farthest from what is picked, bigger roads first
        let c = null, cs = -Infinity;
        for (const q of bySide[si]) {
          let md = 6000;
          for (const o of pick) md = Math.min(md, Math.hypot(o.x - q.x, o.y - q.y));
          const score = md - KIND_RANK[q.kind] * 500;
          if (md >= gap && score > cs) { cs = score; c = q; }
        }
        if (c) pick.push(c);
      }
    }
    if (pick.length >= WORLD_END_TOTAL) break;
  }
  // the Frisian ones go west (Friesland is that way), the rest round the clock
  const E = [Infinity, Infinity, -Infinity, -Infinity];
  for (const c of all) { E[0] = Math.min(E[0], c.x); E[1] = Math.min(E[1], c.y); E[2] = Math.max(E[2], c.x); E[3] = Math.max(E[3], c.y); }
  const cx = (E[0] + E[2]) / 2, cy = (E[1] + E[3]) / 2;
  const byX = [...pick].sort((a, b) => a.x - b.x);
  const west = WORLD_ENDS.filter((d) => d.west), rest = WORLD_ENDS.filter((d) => !d.west);
  const used = new Set();
  const out = [];
  west.forEach((def, i) => { if (byX[i]) { used.add(byX[i]); out.push({ def, c: byX[i] }); } });
  const left = pick.filter((c) => !used.has(c)).sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  rest.forEach((def, i) => { if (left[i]) out.push({ def, c: left[i] }); });
  return out.map(({ def, c }) => ({
    def, x: c.x, y: c.y, ux: c.ux, uy: c.uy, hw: c.hw, road: c.name, a: Math.atan2(c.uy, c.ux),
    // where you stand when you find it: a few metres before the end, on the road
    sx: c.x - c.ux * 5, sy: c.y - c.uy * 5, prop: null, talkAt: -99,
  }));
}

export function worldEndsReady() {
  return !!spots;
}

export function ensureWorldEnds() {
  // once the province's road net is in (a build without tiles has no edge of the data to put them on)
  if (!spots && inProvinceData(0, 0) !== null && roadNetRows()) {
    spots = place();
    setRealRoadBlocks(spots.map((s) => ({ x: s.x - s.ux * 3, y: s.y - s.uy * 3 })));
  }
  return spots || [];
}

export function worldEndCount() {
  return WORLD_ENDS.filter((d) => hasUnique(SET, d.id)).length;
}

// The wereldeinden already found, for the maps (ommelandmap.js); the rest stay
// a secret ("zoek ze zelf").
export function getFoundWorldEnds() {
  if (!spots) return [];
  return spots.filter((s) => hasUnique(SET, s.def.id)).map((s) => ({ x: s.sx, y: s.sy, name: s.def.name, sub: 'Wereldeinde · gevonden' }));
}

// For spotcheck.js and the story test: the standing spots, on foot.
export function getWorldEndSpots() {
  return ensureWorldEnds().map((s) => ({ id: s.def.id, name: s.def.name, x: s.sx, y: s.sy, road: s.road }));
}

function toWorld(s, lx, lz) {
  const c = Math.cos(s.a), n = Math.sin(s.a);
  return [s.x + lx * c - lz * n, s.y + lx * n + lz * c];
}

function build(s) {
  s.prop = buildProp(s.def.prop, { hw: s.hw, worldEnd: true }, s.def);
  s.prop.group.position.set(s.x, 0, s.y);
  s.prop.group.rotation.y = -s.a;
  getScene().add(s.prop.group);
  s.solids = s.prop.solids.map(([lx, lz, r]) => { const [x, y] = toWorld(s, lx, lz); return { x, y, r }; });
  const who = s.prop.people[0];
  if (who) { const [x, y] = toWorld(s, who.lx, who.lz); s.mouth = { x, y, h: who.h || (who.seated ? 1.6 : 2.2) }; }
}

function drop(s) {
  disposeProp(s.prop);
  s.prop = null;
  s.solids = null;
}

function discover(w, s) {
  if (!recordUnique(w, SET, s.def.id)) return;
  const n = worldEndCount();
  showCard(w, { kind: 'prestatie', kicker: 'Wereldeinde', title: s.def.name, body: `${n} van ${WORLD_END_TOTAL} wereldeinden gevonden`, duration: 5, key: 'wereldeinde' });
  if (n >= WORLD_END_TOTAL) finalAt = w.time + 6;
}

function talk(w, s) {
  s.talkAt = w.time;
  const d = s.def;
  speak(w, d.who, d.text, d.who === 'duo' ? null : s.mouth || { x: s.x, y: s.y, h: 2.2 }, { h: s.mouth ? s.mouth.h : 2.2 });
}

export function updateWorldEnds(dt, w) {
  if (!spots) return;
  const p = hoofdspeler(w), v = p.inVehicle;
  const px = v ? v.x : p.x, py = v ? v.y : p.y;
  for (const s of spots) {
    const d = Math.hypot(s.x - px, s.y - py);
    if (!s.prop && d < BUILD_R) build(s);
    else if (s.prop && d > DROP_R) { drop(s); continue; }
    if (!s.prop) continue;
    if (d < ANIM_R) animateProp(s.prop, dt, w.time);
    if (w.pigeonMode || isCinematicActive()) continue;
    const ds = Math.hypot(s.sx - px, s.sy - py);
    if (ds < (v ? FIND_R_CAR : FIND_R) && (!v || Math.abs(v.speed || 0) < 14)) {
      const fresh = !hasUnique(SET, s.def.id);
      if (fresh || (ds < TALK_R && w.time - s.talkAt > TALK_GAP)) {
        if (fresh) discover(w, s);
        talk(w, s);
      }
    }
  }
  if (finalAt && w.time > finalAt && !isCinematicActive()) {
    finalAt = 0;
    speak(w, WORLD_END_FINAL.who, WORLD_END_FINAL.text);
    notifyPhone(w, { from: 'Kiekdoar', app: 'sikkom', text: WORLD_END_FINAL.news, duration: 8, voiced: true });
  }
}

// Solid circles near (x, y), for the shared push-out (ommelandfun.js).
export function worldEndSolids(out) {
  if (!spots) return out;
  for (const s of spots) if (s.solids) out.push(...s.solids);
  return out;
}

export function worldEndDebug() {
  return ensureWorldEnds().map((s) => ({ id: s.def.id, x: Math.round(s.sx), y: Math.round(s.sy), road: s.road, found: hasUnique(SET, s.def.id), built: !!s.prop }));
}

