// Interieurs (epic #1150): de echte voetgangersbotsing (collision.js resolveBuildingCollisions) met het haakje b.walk:
// zonder interieur is een pand dicht; met een live interieur loop je door een open deur naar binnen en weer naar buiten,
// houdt een dichte deur je buiten, en blijf je binnen de hal en buiten de meubels. Geen game/world: een synthetisch pand.
// Draai: node scripts/interior_collision_test.mjs
import './node3d.mjs';
const { resolveBuildingCollisions } = await import('../game/js/collision.js');
const { planInterior } = await import('../game/js/interiorrules.js');
const { makeWalk } = await import('../game/js/interiorwalk.js');
const { toWorld, toLocal } = await import('../game/js/interiorframe.js');
const { building } = await import('./interior_fixtures.mjs');
const { mulberry32 } = await import('../game/js/rng.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

const { b, spot } = building('winkel', 'bakker', 8, 11, mulberry32(3));
const plan = planInterior(b, { spot });
ok(plan.ok, 'het testpand is betreedbaar');
const map = { buildingsNear: () => [b], roadsNear: () => [], railsNear: () => [], footwaysNear: () => [], waterNear: () => [], treesNear: () => [] };
b.passages = [];
const R = 0.4; // de speler
const step = (x, y, dx, dy) => resolveBuildingCollisions(x + dx, y + dy, R, map);

// loop van buiten (v = -4) recht door de deur naar v = 4, met de deur dicht, en dan open
function walkIn(open) {
  b.walk = makeWalk(plan, b.pts, () => open);
  let [x, y] = toWorld(plan.frame, 0, -4);
  const [tx, ty] = toWorld(plan.frame, 0, 4);
  for (let i = 0; i < 400; i++) {
    const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy);
    if (L < 0.05) break;
    [x, y] = step(x, y, dx / L * 0.06, dy / L * 0.06);
  }
  return toLocal(plan.frame, x, y);
}
b.walk = undefined;
{
  let [x, y] = toWorld(plan.frame, 0, -4);
  const [tx, ty] = toWorld(plan.frame, 0, 4);
  for (let i = 0; i < 300; i++) { const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy); if (L < 0.05) break; [x, y] = step(x, y, dx / L * 0.06, dy / L * 0.06); }
  ok(toLocal(plan.frame, x, y)[1] < 0.1, 'zonder interieur houdt de gevel je buiten');
}
const closed = walkIn(false);
ok(closed[1] < 0.05, 'dichte deur: je blijft buiten', `v=${closed[1].toFixed(2)}`);
const opened = walkIn(true);
ok(opened[1] > 3, 'open deur: je loopt naar binnen, tot diep in de hal', `v=${opened[1].toFixed(2)}`);

// en weer naar buiten door dezelfde deur
b.walk = makeWalk(plan, b.pts, () => true);
{
  let [x, y] = toWorld(plan.frame, 0.1, 3);
  const [tx, ty] = toWorld(plan.frame, 0.1, -4);
  for (let i = 0; i < 400; i++) { const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy); if (L < 0.05) break; [x, y] = step(x, y, dx / L * 0.06, dy / L * 0.06); }
  ok(toLocal(plan.frame, x, y)[1] < -2.5, 'uitlopen door dezelfde deur lukt', `v=${toLocal(plan.frame, x, y)[1].toFixed(2)}`);
}
// naast de deur: de gevel houdt je buiten, ook met een open deur
{
  const [x0, y0] = toWorld(plan.frame, 2.5, -2);
  let [x, y] = [x0, y0];
  const [tx, ty] = toWorld(plan.frame, 2.5, 4);
  for (let i = 0; i < 300; i++) { const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy); if (L < 0.05) break; [x, y] = step(x, y, dx / L * 0.06, dy / L * 0.06); }
  ok(toLocal(plan.frame, x, y)[1] < 0.1, 'naast de open deur blijft de gevel dicht');
}
// binnen willekeurig lopen: nooit buiten de hal, nooit in een meubel
{
  b.walk = makeWalk(plan, b.pts, () => false);
  let escaped = 0, inItem = 0;
  const solid = plan.layout.items.filter((i) => i.solid);
  const rnd = mulberry32(9);
  for (let t = 0; t < 120; t++) {
    let [x, y] = toWorld(plan.frame, plan.hall.u0 + 1 + rnd() * (plan.hall.u1 - plan.hall.u0 - 2), plan.hall.v0 + 1.5 + rnd() * 3);
    const a = rnd() * 6.28;
    for (let s = 0; s < 150; s++) {
      [x, y] = step(x, y, Math.cos(a) * 0.07, Math.sin(a) * 0.07);
      const [u, v] = toLocal(plan.frame, x, y);
      if (v < 0 && Math.abs(u) > 0.7) { escaped++; break; }
      if (u < plan.hall.u0 - 0.01 || u > plan.hall.u1 + 0.01 || v > plan.hall.v1 + 0.01) { escaped++; break; }
      for (const it of solid) { const w = it.face & 1 ? [it.d, it.w] : [it.w, it.d]; if (Math.abs(u - it.u) < w[0] / 2 - 0.05 && Math.abs(v - it.v) < w[1] / 2 - 0.05) { inItem++; break; } }
    }
  }
  ok(escaped === 0, 'binnen lopen houdt je in de hal (deur dicht)', String(escaped));
  ok(inItem === 0, 'binnen lopen zet je niet in een meubel', String(inItem));
}
console.log(bad ? `interior_collision_test: ${bad} van ${n} mislukt` : `interior_collision_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
