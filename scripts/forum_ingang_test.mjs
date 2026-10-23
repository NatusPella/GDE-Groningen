// De ingangen van het Forum zijn begaanbaar (playtester: een zichtbare opening, maar een onzichtbare muur):
//   node scripts/forum_ingang_test.mjs
// De straatdeuren (ingangZ, ingangO) liggen maar 10 cm over de foyer en de expo heen. Een wandelaar met een straal werd in
// de deur vastgehouden, 0,4 m voor het einde van die kamer, en kwam er nooit doorheen (collision.js, inDoorway).
// Puur: het Forum uit stad.json met zijn plan, zonder wereldbouw; plus een synthetisch gebouwtje met een dunne overlap.
import './node3d.mjs';
import fs from 'node:fs';
const { attachInteriorPlans } = await import('../game/js/interieurplan.js');
const { resolveBuildingCollisions } = await import('../game/js/collision.js');
const { rectsOverlap } = await import('../game/js/museumplan.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// loopt van punt naar punt met de wandelaar-botsing, 5 m/s in stappen van 1/60 s
function walk(map, R, pts) {
  let [x, y] = pts[0];
  for (const [tx, ty] of pts.slice(1)) {
    let aangekomen = false;
    for (let i = 0; i < 1500 && !aangekomen; i++) {
      const d = Math.hypot(tx - x, ty - y);
      if (d < 0.2) { aangekomen = true; break; }
      const st = Math.min(5 / 60, d);
      [x, y] = resolveBuildingCollisions(x + (tx - x) / d * st, y + (ty - y) / d * st, R, map);
    }
    if (!aangekomen) return { ok: false, x, y };
  }
  return { ok: true, x, y };
}

// --- het Forum zelf ---------------------------------------------------------------------
const stad = JSON.parse(fs.readFileSync(new URL('../game/stad.json', import.meta.url), 'utf8'));
const forum = stad.buildings.find((b) => b.landmark === 'Forum Groningen');
ok(!!forum, 'Forum in stad.json');
const [att] = attachInteriorPlans([forum]);
ok(att === forum && !!forum.rooms, 'plan aan het Forum gehecht');
forum.bounds = [Math.min(...forum.pts.map((p) => p[0])), Math.min(...forum.pts.map((p) => p[1])), Math.max(...forum.pts.map((p) => p[0])), Math.max(...forum.pts.map((p) => p[1]))];
const map = { buildings: [forum], buildingsNear: () => [forum] };
const kamer = (id) => forum.rooms.find((r) => r.id === id);
const foyer = kamer('foyer'), expo = kamer('expo');
const loc = (r, a, c) => [r.cx + a * r.ux - c * r.uy, r.cy + a * r.uy + c * r.ux];

// de deur heeft een kamer om in te komen die er maar nauwelijks aan raakt: precies het geval dat dichtzat
for (const [id, binnen] of [['ingangZ', 'foyer'], ['ingangO', 'expo']]) {
  ok(rectsOverlap(kamer(id), kamer(binnen)), `${id} raakt ${binnen}`);
}

// van buiten (c = 24 in het frame van de foyer) over de deuras naar binnen, voor een paar stralen en dwarsposities
// (waypoints: buiten, het binnenste eind van de deur, ver in de kamer erachter; de expo ligt tot c = 13)
for (const [id, a0, hw, cDeur, cBinnen] of [['ingangZ', 10, 2.2, 9, 2], ['ingangO', 28, 1.7, 13, 5]]) {
  for (const R of [0.3, 0.4, 0.5]) {
    for (let da = -hw + R + 0.05; da <= hw - R - 0.05 + 1e-6; da += 0.5) {
      const r = walk(map, R, [loc(foyer, a0 + da, 24), loc(foyer, a0 + da, cDeur), loc(foyer, a0 + da, cBinnen)]);
      ok(r.ok, `${id}: wandelaar (r ${R}) komt binnen op dwarspositie ${da.toFixed(1)}`, `blijft steken bij ${r.x.toFixed(1)}, ${r.y.toFixed(1)}`);
    }
  }
}
// en weer naar buiten
{
  const r = walk(map, 0.4, [loc(foyer, 10, 2), loc(foyer, 10, 24)]);
  ok(r.ok, 'ingangZ: wandelaar komt ook weer naar buiten');
}
// de muur ernaast blijft dicht: schuin tegen de gevel naast de deur wordt de wandelaar niet binnengelaten
{
  const [x1, y1] = loc(foyer, -4, 10);
  const [px, py] = resolveBuildingCollisions(x1, y1, 0.4, map);
  ok(Math.hypot(px - x1, py - y1) > 0.3, 'de gevel naast de deur blijft dicht', `${Math.hypot(px - x1, py - y1).toFixed(2)} m geduwd`);
}

// --- een synthetisch gebouwtje: kamer en deur met 5 cm overlap -------------------------------
{
  const hal = { id: 'hal', cx: 0, cy: 0, ux: 1, uy: 0, hl: 5, hw: 5, h: 3 };
  const deur = { id: 'deur', cx: 0, cy: 8, ux: 1, uy: 0, hl: 1.5, hw: 3.05, h: 3, deur: true }; // y 4.95 .. 11.05
  const pts = [[-6, -6], [6, -6], [6, 8], [-6, 8], [-6, -6]]; // de voorgevel op y = 8; de deur steekt 3 m over de gevel uit
  const gebouw = { pts, bounds: [-6, -6, 6, 8], rooms: [hal, deur], noPassages: true };
  const m = { buildings: [gebouw], buildingsNear: () => [gebouw] };
  ok(rectsOverlap(hal, deur), 'synthetisch: deur overlapt de hal');
  for (const R of [0.35, 0.5]) {
    const r = walk(m, R, [[0, 10.5], [0, 6], [0, 0]]);
    ok(r.ok, `synthetisch: straal ${R} loopt door een deur met 5 cm overlap`, `${r.x.toFixed(1)}, ${r.y.toFixed(1)}`);
  }
  const [px, py] = resolveBuildingCollisions(4, 7.5, 0.4, m);
  ok(Math.hypot(px - 4, py - 7.5) > 0.2, 'synthetisch: de gevel naast de deur is dicht');
}

console.log(`${n} controles, ${fails} mislukt`);
process.exit(fails ? 1 : 0);
