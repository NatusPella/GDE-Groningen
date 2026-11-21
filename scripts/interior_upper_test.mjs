// Interieurs (epic #1150, ronde 2): de tweede verdieping en de trap. Welke soorten er een krijgen, de trapgeometrie (helling,
// bordes, gat in de vloer), de bovenindeling (alles bereikbaar vanaf het bordes, niets in het gat), en lopen: van de deur de trap
// op naar boven, boven rondlopen zonder in het trapgat te vallen. Puur; geen THREE, geen game/world.
// Draai: node scripts/interior_upper_test.mjs
import { planInterior } from '../game/js/interiorrules.js';
import { hasUpper, makeStairs, floorOffset, holeRect, STAIR_W, LANDING, STEP_H } from '../game/js/interiorupper.js';
import { makeWalk } from '../game/js/interiorwalk.js';
import { toWorld, toLocal } from '../game/js/interiorframe.js';
import { rectOf, validateLayout, walkGrid } from '../game/js/interiorlayout.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

ok(hasUpper('woning', null) && hasUpper('kantoor', null) && hasUpper('publiek', 'hotel') && hasUpper('winkel', 'kleding') && !hasUpper('winkel', 'bakker') && !hasUpper('kerk', null), 'welke soorten een verdieping kunnen hebben');

// trapgeometrie
{
  const st = makeStairs({ u0: -4, u1: 4, v0: 0.3, v1: 12 }, { w: 1.2 }, () => 0.2, 3.1);
  ok(st && st.side === 'left' && st.u1 - st.u0 === STAIR_W, 'een trap langs de linkermuur');
  ok(Math.abs(st.vTop - st.vRamp - LANDING) < 1e-9 && st.vRamp - st.vBot >= 2.4, 'bordes en looplengte', JSON.stringify(st));
  ok(Math.abs(floorOffset(st, st.u0 + 0.5, st.vBot) - 0) < 1e-9 && Math.abs(floorOffset(st, st.u0 + 0.5, st.vRamp) - st.rise) < 1e-9 && floorOffset(st, st.u0 + 0.5, st.vTop - 0.1) === st.rise, 'de trap loopt van 0 tot een verdieping en het bordes is vlak');
  let mono = true, prev = -1;
  for (let v = st.vBot; v <= st.vRamp; v += 0.05) { const h = floorOffset(st, st.u0 + 0.5, v); if (h < prev - 1e-9) mono = false; prev = h; }
  ok(mono, 'de trap stijgt overal');
  ok(floorOffset(st, 0, 5) === null && floorOffset(st, st.u0 + 0.5, st.vBot - 0.5) === null, 'buiten de trap geen hoogteverschil');
  ok(st.rise / (st.vRamp - st.vBot) < 0.8, 'de helling is niet steiler dan 38 graden', String(st.rise / (st.vRamp - st.vBot)));
  ok(Math.ceil(st.rise / STEP_H) === st.n, 'aantal treden');
  ok(makeStairs({ u0: -2, u1: 2, v0: 0.3, v1: 6 }, { w: 1.2 }, () => 0.2, 3.1) === null, 'een te kleine hal krijgt geen trap');
}

// bovenindelingen
const rnd = mulberry32(21);
let planned = 0, withUpper = 0;
const kinds = [['woning', null], ['kantoor', null], ['publiek', 'hotel'], ['publiek', 'gemeente'], ['winkel', 'kleding'], ['winkel', 'tweedehands'], ['winkel', 'elektronica'], ['winkel', 'supermarkt'], ['winkel', 'bakker']];
for (const [kind, sub] of kinds) {
  for (let i = 0; i < 12; i++) {
    const { b, spot } = building(kind, sub, 6 + rnd() * 8, 9 + rnd() * 8, rnd);
    const p = planInterior(b, { spot });
    if (!p.ok) continue;
    planned++;
    if (p.levels === 2) {
      withUpper++;
      const up = p.layout.upper;
      ok(!!up && p.stairs && p.topY > p.floorH + 2, `${kind}/${sub}: bovenverdieping en plafondhoogte`);
      const start = { u: (p.stairs.u0 + p.stairs.u1) / 2, v: p.stairs.vRamp + LANDING / 2 };
      ok(validateLayout(up, start).length === 0, `${kind}/${sub}: bovenindeling is geldig`, validateLayout(up, start).slice(0, 2).join('; '));
      const hole = holeRect(p.stairs);
      ok(!up.items.some((it) => it.solid && it.u - it.w / 2 < hole.u1 && it.u + it.w / 2 > hole.u0 && it.v - it.d / 2 < hole.v1 && it.v + it.d / 2 > hole.v0 && rectOf(it).u0 < hole.u1 && rectOf(it).u1 > hole.u0 && rectOf(it).v0 < hole.v1 && rectOf(it).v1 > hole.v0), `${kind}/${sub}: niets in het trapgat`);
      ok(!p.layout.items.some((it) => { const r = rectOf(it); return it.solid && r.u0 < p.stairs.u1 && r.u1 > p.stairs.u0 && r.v0 < p.stairs.vTop && r.v1 > p.stairs.vBot; }), `${kind}/${sub}: niets op de trap beneden`);
      ok(JSON.stringify(planInterior(b, { spot }).layout.upper) === JSON.stringify(up), `${kind}/${sub}: de bovenverdieping is deterministisch`);
      ok(validateLayout(p.layout).length === 0, `${kind}/${sub}: de begane grond blijft geldig met trap`);
    }
  }
}
ok(planned > 50 && withUpper >= planned * 0.5, 'de meeste geschikte panden krijgen een verdieping', `${withUpper}/${planned}`);
{
  const { b, spot } = building('winkel', 'bakker', 8, 12, mulberry32(2));
  ok(planInterior(b, { spot }).levels === 1, 'een bakker heeft geen etage');
  const { b: b2 } = building('woning', null, 8, 12, mulberry32(2));
  ok(planInterior({ ...b2, entrance: { ...b2.entrance, floors: 1 } }).levels === 1, 'een plat huis (1 laag) heeft geen etage');
  ok(planInterior(b2, { upper: false }).levels === 1, 'upper: false schakelt de verdieping uit');
}

// lopen: de trap op en boven rondlopen
{
  const { b } = building('woning', null, 8, 13, mulberry32(4));
  b.passages = [];
  const p = planInterior(b);
  ok(p.ok && p.levels === 2, 'het testhuis heeft een trap');
  const st = p.stairs;
  const ground = 0;
  const walk = makeWalk(p, b.pts, () => true, ground);
  const R = 0.35;
  const heightAt = (u, v, z) => { const h = floorOffset(st, u, v); return h !== null ? h : (z > p.floorH * 0.6 ? p.floorH : 0); };
  // route: kortste pad over het looprooster van de deur naar de voet van de trap, dan recht de trap op
  const grid = walkGrid(p.layout), CELLS = 0.25;
  const cellOf = (uu, vv) => [Math.floor((uu - p.hall.u0) / CELLS), Math.floor((vv - p.hall.v0) / CELLS)];
  const [su, sv] = cellOf(0, 0.8), [eu, ev] = cellOf((st.u0 + st.u1) / 2, st.vBot - 0.5);
  const prev = new Map([[su + ',' + sv, null]]), queue = [[su, sv]];
  while (queue.length) {
    const [ci, ck] = queue.shift();
    if (ci === eu && ck === ev) break;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = ci + di, c2 = ck + dk;
      if (a < 0 || c2 < 0 || a >= grid.nu || c2 >= grid.nv || !grid.free[c2 * grid.nu + a] || prev.has(a + ',' + c2)) continue;
      prev.set(a + ',' + c2, ci + ',' + ck);
      queue.push([a, c2]);
    }
  }
  const path = [];
  for (let key = eu + ',' + ev; key; key = prev.get(key)) { if (!prev.has(key)) break; const [a, c2] = key.split(',').map(Number); path.unshift([p.hall.u0 + (a + 0.5) * CELLS, p.hall.v0 + (c2 + 0.5) * CELLS]); }
  ok(path.length > 3, 'er is een pad van de deur naar de voet van de trap', String(path.length));
  const waypoints = [...path.filter((_, i) => i % 3 === 0), [(st.u0 + st.u1) / 2, st.vBot], [(st.u0 + st.u1) / 2, st.vTop - 0.4], [(st.inner > 0 ? st.inner - 1.5 : st.inner + 1.5), st.vTop - 0.4]];
  let [u, v, z] = [0, -1, 0];
  let [x, y] = toWorld(p.frame, u, v);
  let reached = 0;
  for (const [tu, tv] of waypoints) {
    for (let i = 0; i < 400; i++) {
      [u, v] = toLocal(p.frame, x, y);
      const du = tu - u, dv = tv - v, L = Math.hypot(du, dv);
      if (L < 0.15) { reached++; break; }
      const [nx, ny] = toWorld(p.frame, u + du / L * 0.07, v + dv / L * 0.07);
      const r = walk.resolve(nx, ny, R, z);
      if (r === true) { x = nx; y = ny; } else if (r === null) { x = nx; y = ny; } else { x = r[0]; y = r[1]; }
      [u, v] = toLocal(p.frame, x, y);
      z = heightAt(u, v, z);
    }
  }
  ok(reached === waypoints.length, 'van de deur de trap op naar boven lopen', `${reached}/${waypoints.length} bereikt, z=${z.toFixed(2)}`);
  ok(Math.abs(z - p.floorH) < 0.05, 'je staat boven op de verdiepingsvloer', z.toFixed(2));
  // boven: loop naar het trapgat vanaf de vloer: de leuning houdt je tegen
  let fell = 0;
  const hole = holeRect(st);
  for (let t = 0; t < 40; t++) {
    let [uu, vv] = [(st.inner > 0 ? st.inner - 2 : st.inner + 2) + (t % 5) * 0.1, hole.v0 + 0.5 + (t % 7) * 0.4];
    [x, y] = toWorld(p.frame, uu, vv);
    const dir = st.inner > 0 ? -1 : 1;
    for (let s = 0; s < 80; s++) {
      [uu, vv] = toLocal(p.frame, x, y);
      const [nx, ny] = toWorld(p.frame, uu - dir * 0.07, vv);
      const r = walk.resolve(nx, ny, R, p.floorH);
      if (Array.isArray(r)) { x = r[0]; y = r[1]; } else { x = nx; y = ny; }
    }
    [uu, vv] = toLocal(p.frame, x, y);
    if (uu > hole.u0 + 0.2 && uu < hole.u1 - 0.2 && vv > hole.v0 + 0.1 && vv < hole.v1 - 0.1) fell++;
  }
  ok(fell === 0, 'boven kom je niet in het trapgat (leuning)', String(fell));
}

console.log(bad ? `interior_upper_test: ${bad} van ${n} mislukt` : `interior_upper_test: ${n} controles ok`);
if (bad) process.exitCode = 1;
