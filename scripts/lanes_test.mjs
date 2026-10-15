// The lane model (docs/PROVINCIE-PLAN.md 2.12):
//   node scripts/lanes_test.mjs
// laneLayout on made-up roads, the map's carriageways (no one-way half of a
// dual carriageway wider than its lanes; the N7 halves at the Julianaplein
// have 2 lanes), turn arrows in the markings where turn:lanes says so, and
// the traffic AI in the middle of the right lane (the left one before a left
// turn).
import './node3d.mjs';
import fs from 'node:fs';

const { laneLayout } = await import('../game/js/lanes.js');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// made-up roads
{
  const one = laneLayout({ width: 7.5, oneway: true, lanesFwd: 2, lanesBwd: 0, laneW: 3.25 });
  ok(one.n === 2 && near(one.lw, 3.25) && one.lines.length === 1 && near(one.lines[0], 0) && one.divider === null, 'one-way, 2 lanes: one lane line in the middle', JSON.stringify(one));
  ok(near(one.lanes[0].off, -1.625) && near(one.lanes[1].off, 1.625), 'one-way lane middles', JSON.stringify(one.lanes));
  const two = laneLayout({ width: 9, oneway: false, lanesFwd: 2, lanesBwd: 1, laneW: 3 });
  ok(near(two.divider, -two.lw / 2) && two.lanes.filter((q) => q.dir === 1).length === 2 && two.lanes.filter((q) => q.dir === -1).length === 1, 'two-way 2+1: the divider moves to the side of the single lane', JSON.stringify(two));
  ok(two.lanes.filter((q) => q.dir === 1).every((q) => q.off > two.divider) && two.lanes.filter((q) => q.dir === -1).every((q) => q.off < two.divider), 'forward lanes right of the divider (NL)');
  const old = laneLayout({ width: 12, oneway: true });
  ok(old.n === 4, 'without the lane model: round(width / 3.3) as before', old.n);
}

// the map
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);
{
  const car = map.roads.filter((r) => r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor');
  const modelled = car.filter((r) => r.lanesFwd != null);
  ok(modelled.length > 0.95 * car.length, 'car roads carry the lane model', `${modelled.length}/${car.length}`);
  const wide = car.filter((r) => r.oneway && r.widthSrc !== 'tag' && /^(trunk|primary|motorway)(_link)?$/.test(r.type) && r.width > r.lanesFwd * 3.5 + 3.6);
  ok(wide.length === 0, 'no one-way trunk or primary carriageway wider than its lanes', wide.slice(0, 3).map((r) => `${r.name} ${r.width}`).join('; '));
  const n7 = map.roadsNear(-40, 1822, 10).filter((r) => r.ref === 'N7' && r.type === 'trunk' && r.oneway);
  ok(n7.length && n7.every((r) => r.lanesFwd === 2 && r.width < 9), 'the N7 halves at the Julianaplein: 2 lanes, not 4', n7.map((r) => `${r.lanesFwd}/${r.width}`).join(' '));
  const turns = car.filter((r) => r.turnFwd || r.turnBwd);
  ok(turns.length > 50 && turns.every((r) => (!r.turnFwd || r.turnFwd.length === r.lanesFwd) && (!r.turnBwd || r.turnBwd.length === r.lanesBwd)), 'turn lanes: one entry per lane', turns.length);
}

// markings: turn arrows where turn:lanes says so
{
  const RS = await import('../game/js/roadsurface.js');
  RS.setRoadNetwork(map);
  const r = map.roads.find((q) => q.turnFwd && q.turnFwd.length >= 2 && (q.cat === 'major' || q.cat === 'normal') && q.pts.length >= 2 && q.pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - q.pts[i][0], p[1] - q.pts[i][1]), 0) > 120);
  ok(!!r, 'a long road with turn lanes');
  if (r) {
    const tris = (road) => {
      const g = RS.roadSurfaceGeometries(road, 2);
      const geo = g && g.mark;
      return geo && geo.index ? geo.index.count / 3 : geo ? 0 : -1;
    };
    const with_ = tris(r);
    const copy = { ...r, turnFwd: undefined, turnBwd: undefined, _gkey: undefined };
    const without = tris(copy);
    ok(with_ > without && without >= 0, 'turn arrows add paint', `${without} -> ${with_}`);
  }
}

// traffic AI keeps to the middle of the right lane
{
  await import('../game/js/player.js');
  const V = await import('../game/js/vehicle.js');
  const r = map.roads.find((q) => q.oneway && q.type === 'trunk' && q.lanesFwd === 2 && q.pts.length >= 3 && !q.z);
  ok(!!r, 'a flat two-lane trunk carriageway');
  if (r && V.spawnVehicleOnRoad) {
    const v = V.spawnVehicleOnRoad(map, r, false, () => 0.5);
    if (v) {
      const lay = laneLayout(r);
      const want = Math.max(...lay.lanes.map((q) => q.off));
      // the offset of the spawn from the centreline, right of travel
      const [a, b] = [r.pts[0], r.pts[1]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      let best = Infinity, off = 0;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const p = r.pts[i], q = r.pts[i + 1], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        const t = Math.max(0, Math.min(1, ((v.x - p[0]) * (q[0] - p[0]) + (v.y - p[1]) * (q[1] - p[1])) / (l * l)));
        const cx = p[0] + (q[0] - p[0]) * t, cy = p[1] + (q[1] - p[1]) * t, d = Math.hypot(v.x - cx, v.y - cy);
        if (d < best) { best = d; off = ((v.x - cx) * -(q[1] - p[1]) + (v.y - cy) * (q[0] - p[0])) / l; }
      }
      void nx; void ny;
      ok(Math.abs(Math.abs(off) - want) < 0.6, 'a spawned car sits in the middle of the right lane', `${off.toFixed(2)} vs ${want.toFixed(2)}`);
    }
  }
}

console.log(`${n - fails}/${n} lane checks passed`);
process.exit(fails ? 1 : 0);
