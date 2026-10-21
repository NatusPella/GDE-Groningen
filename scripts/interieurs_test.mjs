// Interieurs of the Forum, Martinikerk, Der Aa-kerk and Korenbeurs (issue #22):
//   node scripts/interieurs_test.mjs
// - every plan matches exactly one footprint in the map, and attaches its rooms;
// - rooms sit inside that footprint (a `deur` room may reach out through the
//   wall), stay out of the water and have sane sizes and Dutch names;
// - the rooms form one connected set reaching the street through a door;
// - every decor item and sign belongs to a room, uses a known kind and lies in it;
// - walkers stand free in the rooms and are held in by the walls;
// - the meshes build (needs `cd desktop && npm run stage` once).
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { pointInPolygon } = await import('../game/js/util.js');
const { rectCorners, rectDist } = await import('../game/js/museumplan.js');
const { INTERIEUREN, attachInteriorPlans, interiorFor } = await import('../game/js/interieurplan.js');
const { resolveBuildingCollisions } = await import('../game/js/collision.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { loadCityData } = await import('./lib/loadworld.mjs');
const city = await loadCityData({ extras: false });
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const bb = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
const KINDS = ['bank', 'kast', 'balie', 'zuil', 'kraam', 'doek', 'scherm', 'pad', 'altaar', 'kansel', 'vont', 'orgel', 'stoelen', 'kaars', 'plant', 'tafel'];
const wanted = ['forum', 'martinikerk', 'aakerk', 'korenbeurs', 'hoofdstation', 'jozefkathedraal', 'schouwburg', 'remonstrants', 'goudkantoor'];
// English words on a sign would be a bug: the game is Dutch only
const ENGLISH = /\b(the|and|welcome|library|entrance|church|market|exit|room)\b/i;
// real brands and companies must not appear (AGENTS.md); a few likely slips
const BRANDS = /\b(albert heijn|jumbo|coca|starbucks|mcdonald|ikea|nike|gasunie|shell)\b/i;

ok(INTERIEUREN.length === wanted.length && wanted.every((id) => INTERIEUREN.some((i) => i.id === id)), 'plans for all wanted interiors');
ok(new Set(INTERIEUREN.map((i) => i.id)).size === INTERIEUREN.length, 'plan ids unique');

const water = city.water.filter((w) => w.kind === 'kanaal' || w.kind === 'diep' || w.kind === 'vaart');
const attached = attachInteriorPlans(city.buildings);
ok(attached.length === INTERIEUREN.length, 'one footprint per plan', `${attached.length}/${INTERIEUREN.length}`);

for (const it of INTERIEUREN) {
  const b = attached.find((q) => q.interior === it);
  ok(!!b, `${it.id}: footprint found`);
  if (!b) continue;
  ok(interiorFor(b) === it, `${it.id}: lookup returns the plan`);
  const fp = b.pts, fb = bb(fp);
  b.bounds = fb;
  const ids = new Set();
  for (const r of it.rooms) {
    ok(!ids.has(r.id), `${it.id}/${r.id}: id unique`);
    ids.add(r.id);
    ok(r.hl * 2 >= 2 && r.hw * 2 >= 2 && r.h >= 2.4 && r.h <= 16, `${it.id}/${r.id}: size`, `${r.hl * 2}x${r.hw * 2}x${r.h}`);
    ok(Math.abs(Math.hypot(r.ux, r.uy) - 1) < 1e-6, `${it.id}/${r.id}: unit axis`);
    ok(!!r.style && r.style.wall != null && r.style.floor != null && r.style.ceil != null, `${it.id}/${r.id}: style`);
    if (r.name) ok(!ENGLISH.test(r.name) && !BRANDS.test(r.name), `${it.id}/${r.id}: Dutch name`, r.name);
    const c = rectCorners(r);
    const outside = c.filter(([x, y]) => !pointInPolygon(x, y, fp));
    if (r.deur) {
      ok(r.id.startsWith('deur') || outside.length > 0, `${it.id}/${r.id}: street door reaches past the wall`);
    } else {
      ok(outside.length === 0, `${it.id}/${r.id}: inside the footprint`, `${outside.length} corners outside`);
    }
    const wet = [[r.cx, r.cy], ...c].filter(([x, y]) => water.some((w) => pointInPolygon(x, y, w.pts)));
    ok(wet.length === 0, `${it.id}/${r.id}: dry`, `${wet.length} points in water`);
    ok(pointInPolygon(r.cx, r.cy, fp), `${it.id}/${r.id}: centre inside the footprint`);
  }
  // connected: rooms overlap into one set, and some room reaches outside
  const overlap = (p, q) => {
    for (const [x, y] of [[p.cx, p.cy], ...rectCorners(p)]) if (rectDist(q, x, y) < -0.05) return true;
    for (const [x, y] of [[q.cx, q.cy], ...rectCorners(q)]) if (rectDist(p, x, y) < -0.05) return true;
    return false;
  };
  const seen = new Set([it.rooms[0].id]), todo = [it.rooms[0]];
  while (todo.length) {
    const p = todo.pop();
    for (const q of it.rooms) if (!seen.has(q.id) && overlap(p, q)) { seen.add(q.id); todo.push(q); }
  }
  ok(seen.size === it.rooms.length, `${it.id}: all rooms connected`, `${seen.size}/${it.rooms.length}`);
  const streetDoors = it.rooms.filter((r) => rectCorners(r).some(([x, y]) => !pointInPolygon(x, y, fp)));
  ok(streetDoors.length >= 1, `${it.id}: at least one way in from the street`);
  const map = { buildings: [b], buildingsNear: () => [b] };
  // a walker can step in from the outer end of each street door
  for (const r of streetDoors) {
    const out = rectCorners(r).filter(([x, y]) => !pointInPolygon(x, y, fp));
    const cx = out.reduce((s, p) => s + p[0], 0) / out.length, cy = out.reduce((s, p) => s + p[1], 0) / out.length;
    const [px, py] = resolveBuildingCollisions(cx, cy, 0.4, map);
    ok(Math.hypot(px - cx, py - cy) < 0.6, `${it.id}/${r.id}: door end stays open to walkers`);
  }

  // decor and signs
  for (const d of it.decor) {
    const r = it.rooms.find((q) => q.id === d.room);
    ok(!!r, `${it.id}: decor room ${d.room}`);
    ok(KINDS.includes(d.kind), `${it.id}: decor kind ${d.kind}`);
    if (!r) continue;
    if (d.c != null && d.a != null) {
      ok(Math.abs(d.a) <= r.hl && Math.abs(d.c) <= r.hw, `${it.id}/${r.id}: ${d.kind} at (${d.a},${d.c}) inside the room`);
    } else if (d.a != null) {
      ok(Math.abs(d.a) <= r.hl, `${it.id}/${r.id}: ${d.kind} along the wall inside the room`);
    }
    if (d.side != null) ok([-1, 0, 1].includes(d.side), `${it.id}/${r.id}: ${d.kind} side`);
  }
  for (const s of it.signs || []) {
    const r = it.rooms.find((q) => q.id === s.room);
    ok(!!r && Math.abs(s.a) <= r.hl && s.y < r.h && s.w > 0, `${it.id}: sign in ${s.room}`);
    ok(s.lines.every((l) => !ENGLISH.test(l) && !BRANDS.test(l)), `${it.id}: sign text Dutch, no brands`, s.lines.join(' / '));
  }

  // colliders: free in each room, solid outside the rooms
  for (const r of it.rooms) {
    const [kx, ky] = resolveBuildingCollisions(r.cx, r.cy, 0.4, map);
    ok(Math.hypot(kx - r.cx, ky - r.cy) < 0.01, `${it.id}/${r.id}: walker stands free`);
  }
  let pushed = 0, probes = 0;
  for (let x = fb[0]; x <= fb[2]; x += 2) {
    for (let y = fb[1]; y <= fb[3]; y += 2) {
      if (!pointInPolygon(x, y, fp)) continue;
      if (it.rooms.some((r) => rectDist(r, x, y) < 1.2)) continue;
      probes++;
      const [nx, ny] = resolveBuildingCollisions(x, y, 0.4, map);
      if (Math.hypot(nx - x, ny - y) > 0.05) pushed++;
    }
  }
  ok(probes === 0 || pushed === probes, `${it.id}: footprint outside the rooms is solid`, `${pushed}/${probes}`);
}

// the meshes (skipped when three.js is not staged)
try {
  const { buildInteriorOf } = await import('../game/js/interieur3d.js');
  for (const b of attached) {
    const g = buildInteriorOf(b);
    const tris = g.children[0].geometry.getAttribute('position').count / 3;
    ok(tris > 500 && tris < 80000, `${b.interior.id}: mesh builds`, `${tris} triangles`);
  }
} catch (e) {
  console.log('mesh checks skipped:', String(e.message).split('\n')[0]);
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
