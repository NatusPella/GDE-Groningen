// markDryRoad (mapdata.js) met de voorselectie per stuk (24-11): dezelfde uitkomst als de oude versie (alle monsters tegen al het water
// rond de hele weg) op 400 willekeurige wegen tussen willekeurige waterpolygonen.
//   node scripts/dryroad_test.mjs
import assert from 'node:assert/strict';
import { markDryRoad } from '../game/js/mapdata.js';
import { waterPolyIn } from '../game/js/waterlevels.js';

let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const box = (x, y, w, h) => ({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]] });

// de oude regel, letterlijk: alle monsters om de 2 m tegen al het water binnen de box van de weg
function oldDry(polys, r) {
  const pts = r.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let k = 0; k <= steps; k++) {
      const x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps;
      if (waterPolyIn(polys, x, y)) {
        if (r.z) { const za = r.z[i] || 0, zb = r.z[i + 1] || 0, zh = za + (zb - za) * (k / steps); if (zh < -1 || zh > 1.5) continue; }
        return true;
      }
    }
  }
  return false;
}

let n = 0, wet = 0;
for (let t = 0; t < 400; t++) {
  const polys = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => box(rnd() * 400, rnd() * 400, 2 + rnd() * 60, 2 + rnd() * 60));
  const map = { waterNear: () => polys, waterGrid: { query: () => polys } };
  const pts = Array.from({ length: 2 + Math.floor(rnd() * 6) }, () => [rnd() * 460, rnd() * 460]);
  const z = rnd() < 0.3 ? pts.map(() => (rnd() - 0.3) * 6) : undefined;
  const r = { cat: 'normal', pts, z };
  const want = oldDry(polys.map((p) => ({ pts: p.pts })), { pts, z });
  const got = markDryRoad(map, r);
  assert.equal(got, want, `weg ${t}: nieuw ${got}, oud ${want}`);
  assert.equal(!!r.dryCrossing, want, `weg ${t}: dryCrossing`);
  if (want) wet++;
  n++;
}
assert.ok(wet > 20 && wet < 380, `een gezonde mix van natte en droge wegen (${wet})`);
console.log(`dryroad_test: ${n} wegen gelijk aan de oude regel (${wet} over water)`);
