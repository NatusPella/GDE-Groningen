// randaudit.js (#6): the checks behind scripts/world/randaudit.mjs, pure. Counts per
// edge of the world (Wadden, Eems, Duitsland, Friesland, Drenthe, lucht) how long
// the line is, which scene belongs to it, and whether the world ends believably:
//  - every kind of line has a rule text, a turn-back scene and props that build,
//  - at the spot where the turn-back fires there is still land data (a tile) on
//    the border side, so the player never ends in a void before the scene,
//  - a boat or walker coming at the line from inside gets a warning first, and
//    on the line itself nothing fires from inside.
// No packs and no three.js: the caller gives `tileHas(x, y)` and `propKinds`.
import { edgeRule, EDGE_GAGS, WARN_M, outsideDist } from './worldedge.js';
import { EDGE_SCENES, scenePlan } from './edgescene.js';

export const lineLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };

// points every `step` metres along a polyline, with the unit tangent
export function walkLine(pts, step = 250) {
  const out = [];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const L = Math.hypot(bx - ax, by - ay);
    if (!L) continue;
    const tx = (bx - ax) / L, ty = (by - ay) / L;
    for (let d = carry; d < L; d += step) out.push({ x: ax + tx * d, y: ay + ty * d, tx, ty });
    carry = ((carry - L) % step + step) % step;
  }
  return out;
}

// the point `m` metres to the outside of a sample; `out` (+1 | -1) is the side outsideDist calls outside
export const outwards = (s, out, m) => ({ x: s.x + (out === -1 ? -1 : 1) * -s.ty * m, y: s.y + (out === -1 ? -1 : 1) * s.tx * m });

// kind -> { n, km } over the lines of one group
function tallyLines(lines, dflt) {
  const t = {};
  for (const L of lines || []) {
    const k = L.kind || dflt;
    t[k] = t[k] || { n: 0, km: 0 };
    t[k].n++; t[k].km += lineLen(L.pts) / 1000;
  }
  for (const k of Object.keys(t)) t[k].km = Math.round(t[k].km * 10) / 10;
  return t;
}

// The audit of an edge layer. opts: { tileHas(x, y) -> bool (data tile there), propKinds: [kinds
// buildProp knows], step (m between samples) }. Returns { coast, border, scenes, issues, stats }.
export function auditEdge(edge, opts = {}) {
  const step = opts.step || 500;
  const tileHas = opts.tileHas || (() => true);
  const propKinds = opts.propKinds ? new Set(opts.propKinds) : null;
  const issues = [];
  const coast = tallyLines(edge.coast, 'wad');
  const border = tallyLines(edge.border, 'duitsland');
  const kinds = new Set([...Object.keys(coast), ...Object.keys(border), 'lucht']);

  // every edge kind: a text, a scene, props that build
  const scenes = {};
  for (const k of kinds) {
    const g = EDGE_GAGS[k], sc = EDGE_SCENES[k];
    scenes[k] = { props: sc ? sc.props.length : 0, text: !!g };
    if (!g) issues.push(`rand ${k}: geen regeltekst`);
    if (!sc) issues.push(`rand ${k}: geen omkeerscène`);
    else if (propKinds) for (const p of sc.props) if (!propKinds.has(p.kind)) issues.push(`rand ${k}: prop ${p.kind} bestaat niet`);
  }

  // along the border lines: warning band, then the turn-back, with land data behind it
  const b = { samples: 0, warnOk: 0, backOk: 0, noData: 0, firesOnLine: 0, plansOutside: 0 };
  for (const L of edge.border || []) {
    const buf = L.bufferM !== undefined ? L.bufferM : 300;
    for (const s of walkLine(L.pts, step)) {
      b.samples++;
      const warnP = outwards(s, L.out || 1, buf - WARN_M / 2);
      const backP = outwards(s, L.out || 1, buf + 40);
      const onLine = edgeRule(s.x, s.y, edge, { mode: 'car' });
      if (onLine && onLine.action === 'back') b.firesOnLine++;
      const w = edgeRule(warnP.x, warnP.y, edge, { mode: 'car' });
      const r = edgeRule(backP.x, backP.y, edge, { mode: 'car' });
      // the nearest line may be another one at a corner; only count when it is this kind
      if (w && w.action === 'warn') b.warnOk++;
      if (r && r.action === 'back') {
        b.backOk++;
        if (!tileHas(backP.x, backP.y)) b.noData++;
        const plan = scenePlan(r, backP.x, backP.y);
        const far = plan.props[0];
        if (!tileHas(far.x, far.y)) b.plansOutside++;
      }
    }
  }
  if (b.firesOnLine) issues.push(`grens: ${b.firesOnLine} plekken keren al op de lijn zelf om`);
  // at a bend the nearest piece of the line may be another one: a few percent of the samples is fine
  if (b.noData > Math.max(2, 0.1 * b.backOk)) issues.push(`grens: ${b.noData} van ${b.backOk} omkeerplekken zonder kaartdata erachter (leegte voor de scène)`);

  // the coast: a boat meets the warning, then the fog, before it is farther than seaM out
  const c = { samples: 0, warnOk: 0, backOk: 0 };
  for (const L of edge.coast || []) {
    const lim = L.seaM !== undefined ? L.seaM : edge.seaM || 3000;
    for (const s of walkLine(L.pts, Math.max(step, 1500))) {
      c.samples++;
      const warnP = outwards(s, L.out || 1, lim - WARN_M / 2);
      const backP = outwards(s, L.out || 1, lim + 40);
      const w = edgeRule(warnP.x, warnP.y, edge, { mode: 'boat' });
      const r = edgeRule(backP.x, backP.y, edge, { mode: 'boat' });
      if (w && (w.action === 'warn' || w.action === 'back')) c.warnOk++;
      if (r && r.action === 'back') c.backOk++;
    }
  }
  return { coast, border, scenes, issues, stats: { border: b, coast: c } };
}
