// Harde wegdekovergangen (issue #189), naast road_seams.mjs.
//   node scripts/world/surface_blend_audit.mjs
// Telt de knopen waar twee wegen van hetzelfde niveau met een ander dek (of een
// andere kleur van hetzelfde dek) samenkomen ('transitions') en de wegeinden
// daarvan die geen menging krijgen ('hard'): zonder menging staat de kleur- en
// patroonsprong als een rand op de weg. 'hard' hoort 0 te zijn.
import { colourJump } from '../../game/js/surfaceblend.js';

const CAR = new Set(['major', 'normal', 'minor', 'cycle']);
const key = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
const same = (r, o) => !o.bridge === !r.bridge && !o.tunnel === !r.tunnel && (o.layer || 0) === (r.layer || 0);

export function auditBlends(map, RS) {
  RS.setRoadNetwork(map);
  const nodes = new Map();
  for (const r of map.roads) {
    if (!CAR.has(r.cat) || r.pts.length < 2) continue;
    for (const i of [0, r.pts.length - 1]) {
      const k = key(r.pts[i]);
      if (!nodes.has(k)) nodes.set(k, []);
      nodes.get(k).push([r, i]);
    }
  }
  const info = new Map();
  const of = (r) => info.get(r) || (info.set(r, RS.roadBlendInfo(r)), info.get(r));
  const out = { transitions: 0, hard: [], rough: 0, worstJump: 0, kinds: {} };
  for (const list of nodes.values()) {
    for (const [r, i] of list) {
      const me = of(r);
      let worst = null;
      for (const [o] of list) {
        if (o === r || !same(r, o)) continue;
        const ot = of(o).surface;
        const jump = colourJump(me.surface.colour, ot.colour);
        if (jump >= 0.015 && (!worst || jump > worst.jump)) worst = { jump, to: ot.id };
      }
      if (!worst) continue;
      out.transitions++;
      const kind = me.surface.id + ' > ' + worst.to;
      out.kinds[kind] = (out.kinds[kind] || 0) + 1;
      const end = me.plan && (i === 0 ? me.plan.a : me.plan.b);
      if (!end) { out.hard.push({ at: r.pts[i], road: r.name, kind, jump: +worst.jump.toFixed(3) }); continue; }
      // de kleur van beide wegen op de knoop na de menging
      const colourAt = (q, qi) => {
        const inf = of(q), e = inf.plan && (qi === 0 ? inf.plan.a : inf.plan.b);
        return e ? inf.surface.colour.map((v, c) => v * e.tint[c]) : inf.surface.colour;
      };
      const other = list.find(([o]) => o !== r && same(r, o) && of(o).surface.id === worst.to);
      const left = colourJump(colourAt(r, i), colourAt(other[0], other[1]));
      out.worstJump = Math.max(out.worstJump, left);
      if (left > 0.15) out.rough++;
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('surface_blend_audit.mjs')) {
  globalThis.requestAnimationFrame = (f) => setImmediate(f);
  const { loadCityWorld } = await import('../lib/loadworld.mjs');
  const map = (await loadCityWorld()).map;
  const RS = await import('../../game/js/roadsurface.js');
  const a = auditBlends(map, RS);
  console.log('transitions', a.transitions, 'hard', a.hard.length, 'rough', a.rough, 'worst colour jump left at a node', a.worstJump.toFixed(3));
  for (const [k, v] of Object.entries(a.kinds).sort((x, y) => y[1] - x[1])) console.log('  ', String(v).padStart(5), k);
  for (const h of a.hard.slice(0, 5)) console.log('   hard', JSON.stringify(h));
}
