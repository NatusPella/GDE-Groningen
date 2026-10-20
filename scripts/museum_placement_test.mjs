// Groninger Museum placement (issue #79):
//   node scripts/museum_placement_test.mjs
// - the pavilion parts live in the same frame as the footprint (the RD rebase
//   once skipped them: the drawn walls stood 12 m off the colliders);
// - the H.N. Werkmanbrug deck does not run through the museum footprint;
// - the walkable rooms sit inside the footprint, not in the water;
// - the footprint is solid (a walker is pushed out) and the rooms stay open.
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { pointInPolygon } = await import('../game/js/util.js');
const { MUSEUM_ROOMS, rectCorners, attachMuseumPlan } = await import('../game/js/museumplan.js');
const { resolveBuildingCollisions } = await import('../game/js/collision.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { loadStadData } = await import('./lib/loadworld.mjs');
const city = await loadStadData();
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const bb = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];

const museum = city.buildings.find((b) => b.landmark === 'Groninger Museum' && b.parts);
ok(!!museum, 'museum building with parts');
const fp = museum.pts;
const fb = bb(fp);

// parts inside the footprint's box
for (const part of museum.parts) {
  const pb = bb(part.pts);
  ok(pb[0] >= fb[0] - 3 && pb[1] >= fb[1] - 3 && pb[2] <= fb[2] + 8 && pb[3] <= fb[3] + 3, `part ${part.part} in the footprint's frame`, pb.map((v) => v.toFixed(1)).join(','));
}
const partsB = bb(museum.parts.flatMap((p) => p.pts));
ok(Math.abs(partsB[0] - fb[0]) < 3 && Math.abs(partsB[3] - fb[3]) < 3, 'parts and footprint share their west and south edge');

// the Werkmanbrug deck (width-wide strip along the way) against the footprint
const decks = city.roads.filter((r) => /Werkmanbrug/.test(r.name || ''));
ok(decks.length > 0, 'H.N. Werkmanbrug in the map');
for (const r of decks) {
  const hw = (r.width || 2) / 2;
  let inside = 0, tot = 0;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let s = 0; s <= len; s += 0.5) {
      for (const o of [-hw, 0, hw]) {
        const x = ax + (bx - ax) * s / len + nx * o, y = ay + (by - ay) * s / len + ny * o;
        tot++;
        if (pointInPolygon(x, y, fp) && !(s > len - 0.6)) inside++;
      }
    }
  }
  ok(inside === 0, 'Werkmanbrug deck outside the museum footprint', `${inside}/${tot} samples inside`);
}

// rooms inside the footprint, and out of the water
const water = city.water.filter((w) => w.kind === 'kanaal' || w.kind === 'diep' || w.kind === 'vaart');
for (const r of MUSEUM_ROOMS) {
  const c = rectCorners(r);
  const outside = c.filter(([x, y]) => !pointInPolygon(x, y, fp) && !(r.bikes));
  ok(outside.length === 0, `room ${r.id} inside the footprint`, `${outside.length} corners outside`);
  if (r.bikes && /^(noord|zuid)$/.test(r.id)) continue; // the Museumeiland cycle bridges: deck over the canal
  const wet = [[r.cx, r.cy], ...c].filter(([x, y]) => water.some((w) => pointInPolygon(x, y, w.pts)));
  ok(wet.length === 0, `room ${r.id} dry`, `${wet.length} points in water`);
}

// colliders: walls are solid, rooms open
const map = {
  buildings: [museum],
  buildingsNear: () => [museum],
};
attachMuseumPlan([museum]);
museum.bounds = fb;
ok(!!museum.rooms && museum.rooms.length === MUSEUM_ROOMS.length, 'museum has its rooms (colliders)');
// a point inside a wall (in the footprint, in no room) is pushed out of it
let pushed = 0, probes = 0;
for (let x = fb[0]; x <= fb[2]; x += 2) {
  for (let y = fb[1]; y <= fb[3]; y += 2) {
    if (!pointInPolygon(x, y, fp)) continue;
    if (MUSEUM_ROOMS.some((r) => Math.abs((x - r.cx) * r.ux + (y - r.cy) * r.uy) < r.hl + 1 && Math.abs(-(x - r.cx) * r.uy + (y - r.cy) * r.ux) < r.hw + 1)) continue;
    probes++;
    const [nx, ny] = resolveBuildingCollisions(x, y, 0.4, map);
    if (Math.hypot(nx - x, ny - y) > 0.05) pushed++;
  }
}
ok(probes > 50 && pushed === probes, 'solid footprint outside the rooms pushes walkers out', `${pushed}/${probes}`);
const a = MUSEUM_ROOMS.find((r) => r.id === 'entreehal');
const [kx, ky] = resolveBuildingCollisions(a.cx, a.cy, 0.4, map);
ok(Math.hypot(kx - a.cx, ky - a.cy) < 0.01, 'walker stands free in the Entreehal');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
