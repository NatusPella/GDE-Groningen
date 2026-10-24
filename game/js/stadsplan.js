// stadsplan.js (#67): where the props and shops of a town profile (stadsprofielen.js)
// go. Pure and deterministic: planTown() draws raw candidate spots round the town's
// centre (the same every run; the shop boards round the shop heart, winkelhart), roadside()
// snaps one to the kerb of the nearest road on free ground. The game resolves a candidate when the player comes near it, with
// the tiles in (stadsleven.js, ommelandplace.js openGround as `isFree`); the audit
// resolves them all against the OSM packs (scripts/world/streekaudit.mjs) and counts
// what a town actually gets. Kinds that are tile work (bridges, canals, boats) are
// not placed here.
import { townCentre, winkelhart } from './stadsprofielen.js';

// profile prop kind -> prop builder of ommelandprops3d.js (null: not a street prop)
export const PROP_BUILD = {
  bank: 'stad_bank', bolder: 'stad_bolder', container: 'stad_container', bloembak: 'stad_bloembak',
  fietsenrek: 'stad_fietsenrek', vlaggenmast: 'stad_vlaggenmast', aardappelkist: 'stad_aardappelkist',
  graanbaal: 'stad_graanbaal', visnet: 'stad_visnet', wasdraad: 'stad_wasdraad', boom: 'stad_boom',
  schaap: 'stad_schaap', vuurtoren: 'stad_vuurtoren', molen: 'mill', windmolen: 'mill',
  brug: null, gracht: null, schuit: null, kotter: null, koets: null,
};
// props that only make sense next to water (harbour, quay, ditch)
const WATER_KINDS = new Set(['bolder', 'container', 'visnet', 'vuurtoren']);
// vee (#330): het dierenregister zegt dat het op weide en dijk staat, dus aan de rand van het dorp, niet in de kom
const VEE_KINDS = new Set(['schaap']);
export const VEE_RING = [0.65, 0.95];   // binnen welk deel van de reach vee-props gezocht worden

const SCALE = 0.3; // props per km² of the profile, thinned: a hint, not a promise
export const CAP = 14; // most of one kind per town
export const SPACING = 10; // m between two props
export const SHOP_SPACING = 25;
const SHOP_R = 0.35; // shops stand in the inner third of the reach
const ANKER_SHOP_R = 0.1; // met een ankerpunt (gemeten winkelmidden) staan de borden dichter bij de winkels

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const countFor = (per, reach, scale = SCALE, cap = CAP) => {
  const km2 = Math.PI * (reach / 1000) ** 2;
  const raw = per * km2 * scale;
  return Math.min(cap, per > 0 ? Math.max(1, Math.round(raw)) : 0);
};

// The candidates of a town: { id, kind, build, shop?, x, y, tries: [[x, y]...] }.
// Each wanted prop gets a first spot and a few fallbacks; the first one that
// resolves wins. Prop spots are heaviest near the centre.
export function planTown(t, { seed = 1, tries = 8 } = {}) {
  const rng = mulberry(hash(t.id) ^ seed);
  const c = townCentre(t);
  // de winkelborden staan in het winkelmidden (#422): bij Delfzijl is dat het ankerpunt,
  // want het profielhart ligt daar 500 m westelijk van de winkels en de winkelgevels
  const w = winkelhart(t);
  const at = (rMax, bias, m = c) => { const r = rMax * Math.pow(rng(), bias), a = rng() * Math.PI * 2; return [m.x + Math.cos(a) * r, m.y + Math.sin(a) * r]; };
  const ring = () => { const r = t.reach * (VEE_RING[0] + rng() * (VEE_RING[1] - VEE_RING[0])), a = rng() * Math.PI * 2; return [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r]; };
  const out = [], skipped = [];
  let n = 0;
  for (const p of t.props) {
    const build = PROP_BUILD[p.kind];
    if (!build) { skipped.push(p.kind); continue; }
    const want = countFor(p.per, t.reach);
    for (let i = 0; i < want; i++) {
      const list = [];
      const water = WATER_KINDS.has(p.kind), vee = VEE_KINDS.has(p.kind);
      for (let k = 0; k < (water ? tries * 4 : tries); k++) list.push(vee ? ring() : at(t.reach * 0.9, 0.7));
      out.push({ id: `${t.id}-${p.kind}-${n++}`, kind: p.kind, build, water, vee, x: list[0][0], y: list[0][1], tries: list });
    }
  }
  let m = 0;
  // een ankerpunt betekent een gemeten winkelmidden (#422): de borden staan dan in de
  // winkelstraten zelf, niet op de halve kilometer daarbuiten
  const shopR = t.reach * (w.x !== c.x || w.y !== c.y ? ANKER_SHOP_R : SHOP_R);
  for (const s of t.shops || []) {
    const list = [];
    for (let k = 0; k < tries * 2; k++) list.push(at(shopR, 1, w));
    out.push({ id: `${t.id}-winkel-${m++}`, kind: 'winkel', build: 'stad_bord', shop: s, x: list[0][0], y: list[0][1], tries: list });
  }
  return { town: t.id, items: out, skipped };
}

function closestOnSeg(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return { x: a[0] + dx * t, y: a[1] + dy * t, ux: dx / Math.sqrt(L2), uy: dy / Math.sqrt(L2) };
}

// The kerb spot nearest (x, y): on the side of the nearest road (within `reach`) where
// isFree(x, y) holds, `off` m from the road edge, facing the road. roads: [{ pts, width }].
// -> { x, y, a, d } or null.
export function roadside(x, y, roads, isFree, { reach = 60, off = 1.6 } = {}) {
  let best = null;
  for (const r of roads) {
    const hw = (r.width || 5) / 2;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const q = closestOnSeg(x, y, P[i], P[i + 1]);
      const d = Math.hypot(x - q.x, y - q.y);
      if (d > reach + hw || (best && d >= best.d)) continue;
      best = { ...q, d, hw };
    }
  }
  if (!best) return null;
  const side = (best.x - x) * -best.uy + (best.y - y) * best.ux; // which side (x, y) is on
  const s0 = side > 0 ? -1 : 1;
  for (const s of [s0, -s0]) {
    for (const extra of [0, 1.5, 3]) {
      const dist = best.hw + off + extra;
      const px = best.x + -best.uy * s * dist, py = best.y + best.ux * s * dist;
      if (isFree(px, py)) return { x: px, y: py, a: Math.atan2(best.y - py, best.x - px), d: best.d };
    }
  }
  return null;
}

// Resolve a candidate: the first of its tries that gives a kerb spot (spacing to `placed`
// kept). resolve(x, y, item) -> { x, y, a } | null (item.water: wants water within ~30 m). Returns the spot or null.
export function resolveItem(item, resolve, placed = []) {
  const gap = item.shop ? SHOP_SPACING : SPACING;
  for (const [x, y] of item.tries) {
    const s = resolve(x, y, item);
    if (!s) continue;
    if (placed.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < gap)) continue;
    return s;
  }
  return null;
}

// Resolve a whole plan at once (the audit, tests): -> { placed: [{ ...item, x, y, a }], missing: [item] }
export function placeAll(plan, resolve) {
  const placed = [], missing = [];
  for (const it of plan.items) {
    const s = resolveItem(it, resolve, placed);
    if (s) placed.push({ ...it, x: s.x, y: s.y, a: s.a }); else missing.push(it);
  }
  return { placed, missing };
}

// tally by kind for the audit: { kind: { want, got } }
export function tallyPlan(plan, placed) {
  const t = {};
  for (const it of plan.items) { t[it.kind] = t[it.kind] || { want: 0, got: 0 }; t[it.kind].want++; }
  for (const p of placed) t[p.kind].got++;
  return t;
}
