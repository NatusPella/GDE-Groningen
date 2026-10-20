// Ommeland road users on the tiles' roads (#165) kept 70 % of their speed at the
// end of every way, so on a straight road cut into many ways they lost speed over
// and over with no corner in sight. Now the turn to the next way sets the loss.
// With game/world and the province layer, also counts how many way ends in a
// sample of real tiles carry straight on.
//   node scripts/countrylife_turn_test.mjs [stride]
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const CL = await import('../game/js/countrylife.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const f = CL.turnSpeedFactor;
ok(f(0) === 1, 'straight on keeps all its speed');
ok(f(0.1) > 0.97 && f(-0.1) > 0.97, 'a small kink hardly matters');
ok(Math.abs(f(Math.PI / 2) - 0.7) < 1e-9 && Math.abs(f(-Math.PI / 2) - 0.7) < 1e-9, 'a right-angle corner: 70 % as before');
ok(Math.abs(f(Math.PI) - 0.4) < 1e-9, 'turning back: 40 %');
ok(Math.abs(f(2 * Math.PI) - 1) < 1e-9 && Math.abs(f(Math.PI * 2.5) - 0.7) < 1e-9, 'angles wrap round');
for (let t = -3; t < 3; t += 0.2) ok(f(t) <= 1 && f(t) >= 0.4, 'between 40 % and 100 %');

const root = new URL('../game/world/', import.meta.url);
if (fs.existsSync(new URL('index-provincie.json', root))) {
  const G = await import('../game/js/gdt.js');
  const S = await import('../game/js/tilestore.js');
  const TW = await import('../game/js/tileworld.js');
  await import('../game/js/mapdata.js');
  const files = new Proxy({}, { get: (o, k) => (typeof k === 'string' ? (o[k] || (o[k] = new Uint8Array(fs.readFileSync(new URL(k, root))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  if (T) {
    const stride = Number(process.argv[2]) || 20;
    const keys = Object.keys(T.index.tiles).filter((k, i) => i % stride === 0 && !T.index.tiles[k].ov);
    let ends = 0, straight = 0, turn = 0, dead = 0;
    const seen = new Set();
    for (const k of keys) {
      await T.store.request(k, { priority: -1 });
      T.world.tileQueue.run(1e9);
      const o = G.tileOrigin(T.index.tiles[k].i, T.index.tiles[k].j);
      for (const r of T.world.roadsNear(o[0] + 500, o[1] + 500, 520)) {
        if (seen.has(r) || !(r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor') || r.bridge) continue;
        seen.add(r);
        const P = r.pts;
        const end = P[P.length - 1], prev = P[P.length - 2];
        if (end[0] < o[0] || end[0] >= o[0] + 1000 || end[1] < o[1] || end[1] >= o[1] + 1000) continue;
        const h0 = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
        let best = null;
        for (const q of T.world.roadsNear(end[0], end[1], 3)) {
          if (q === r || q.cat === 'foot' || q.cat === 'cycle') continue;
          q.pts.forEach((p, j) => {
            if (Math.abs(p[0] - end[0]) > 1.5 || Math.abs(p[1] - end[1]) > 1.5 || j >= q.pts.length - 1) return;
            const h1 = Math.atan2(q.pts[j + 1][1] - p[1], q.pts[j + 1][0] - p[0]);
            const d = Math.abs(((h1 - h0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (best === null || d < best) best = d;
          });
        }
        ends++;
        if (best === null) dead++; else if (best < 0.35) straight++; else turn++;
      }
    }
    console.log(`${keys.length} tiles: ${ends} way ends: ${straight} carry straight on (<20 deg), ${turn} turn, ${dead} dead ends`);
    ok(ends > 100, 'a sample of real way ends');
  }
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} countrylife turn checks passed`);
process.exit(fails ? 1 : 0);
