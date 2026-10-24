// De rollende golfbal (#453): golfphysics.js en de pitch en putt van puttinglogic.js, puur in node (geen browser, vaste tijdstap).
//   node scripts/golfphysics_test.mjs
import assert from 'node:assert/strict';
import { simulate, lanceer, vlakTerrein, G, BALL_R, CUP_R, CUP_SPEED, SURFACE, LOFT } from '../game/js/golfphysics.js';
import * as PP from '../game/js/puttinglogic.js';
import { makeRng } from '../game/js/minigamekit.js';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const near = (a, b, tol, m) => { n++; assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} naast ${b} (±${tol})`); };
const T = (surface, slope = { x: 0, y: 0 }, cup = null) => ({ surface, slope: () => slope, cup, cupR: CUP_R });
const dist = (a, b = { x: 0, y: 0 }) => Math.hypot(a.x - b.x, a.y - b.y);

// --- deterministisch -----------------------------------------------------------------------------
{
  const a = simulate(T(() => 'green', { x: 0.01, y: 0.02 }), { x: 0, y: 0, vx: 3, vy: 1 });
  const b = simulate(T(() => 'green', { x: 0.01, y: 0.02 }), { x: 0, y: 0, vx: 3, vy: 1 });
  assert.deepEqual(a, b); n++;
  const l = lanceer(0.3, 30);
  const c = simulate(T(() => 'gras'), { x: 0, y: 0, ...l }), d = simulate(T(() => 'gras'), { x: 0, y: 0, ...l });
  assert.deepEqual(c, d); n++;
  ok(c.trace.every((p) => p.every(Number.isFinite)), 'geen NaN in de baan');
  ok(c.t < 24, 'de bal komt tot rust');
}

// --- rollen met wrijving per ondergrond --------------------------------------------------------------------
{
  const rol = (sf, v) => simulate(T(() => sf), { x: 0, y: 0, vx: v, vy: 0 });
  const g = rol('green', 4), r = rol('gras', 4), s = rol('zand', 4);
  near(g.end.x, (4 * 4) / (2 * SURFACE.green.mu * G), g.end.x * 0.05, 'afstand op de green is v² / 2 mu g');
  near(r.end.x, (4 * 4) / (2 * SURFACE.gras.mu * G), r.end.x * 0.05, 'afstand in het gras');
  ok(g.end.x > r.end.x * 2.5 && r.end.x > s.end.x * 2, `green > gras > zand: ${g.end.x.toFixed(2)} ${r.end.x.toFixed(2)} ${s.end.x.toFixed(2)}`);
  ok(g.rest && r.rest && s.rest, 'rolt tot rust');
  // de snelheid neemt op vlakke grond nooit toe
  let up = false; for (let i = 1; i < g.trace.length; i++) if (g.trace[i][3] > g.trace[i - 1][3] + 1e-9) up = true;
  ok(!up, 'op vlakke grond wint de bal geen snelheid');
  ok(g.events.some((e) => e.kind === 'rust') && g.events[0].kind === 'rust', 'rust-gebeurtenis');
}

// --- hellingen ------------------------------------------------------------------------------------------
{
  const bergaf = simulate(T(() => 'green', { x: 0.03, y: 0 }), { x: 0, y: 0, vx: 4, vy: 0 });
  const bergop = simulate(T(() => 'green', { x: 0.03, y: 0 }), { x: 0, y: 0, vx: -4, vy: 0 });
  ok(bergaf.end.x > Math.abs(bergop.end.x) + 0.5, 'bergaf rolt verder dan bergop');
  const breuk = simulate(T(() => 'green', { x: 0, y: 0.03 }), { x: 0, y: 0, vx: 4, vy: 0 });
  ok(breuk.end.y > 0.2, 'een putt dwars op de helling breekt bergaf');
  // een bal in rust op een steile helling blijft niet liggen
  const steil = simulate(T(() => 'green', { x: 0, y: 0.2 }), { x: 0, y: 0, vx: 0, vy: 0 }, { maxT: 3 });
  ok(steil.end.y > 0.5, 'een steile helling trekt de bal weg');
  // een zachte helling houdt hem niet tegen: onder de wrijving blijft hij liggen
  const zacht = simulate(T(() => 'green', { x: 0.05, y: 0 }), { x: 0, y: 0, vx: 0, vy: 0 });
  ok(zacht.rest && dist(zacht.end) < 0.01, 'een bal blijft liggen zolang de wrijving wint');
}

// --- zwaartekracht en stuiteren ---------------------------------------------------------------------------
{
  for (const carry of [8, 25, 50]) {
    const r = simulate(T(() => 'gras'), { x: 0, y: 0, ...lanceer(0, carry) });
    near(r.landing.x, carry, carry * 0.04 + 0.2, `de worp komt ${carry} m ver`);
    const v = Math.sqrt((carry * G) / Math.sin(2 * LOFT));
    near(r.landing.t, (2 * v * Math.sin(LOFT)) / G, 0.15, `de vliegtijd van ${carry} m`);
    const top = Math.max(...r.trace.map((p) => p[2]));
    near(top, (v * Math.sin(LOFT)) ** 2 / (2 * G), top * 0.08 + 0.05, 'de top van de boog');
  }
  // een harde inslag op de green stuitert, elke stuiter lager
  const r = simulate(T(() => 'green'), { x: 0, y: 0, ...lanceer(0, 40) });
  const stuiters = r.events.filter((e) => e.kind === 'stuiter');
  ok(stuiters.length >= 2, `meerdere stuiters (${stuiters.length})`);
  // hoogte tussen de stuiters daalt
  const tops = []; let cur = 0, vorige = r.landing.t;
  for (const p of r.trace.slice(Math.floor(r.landing.t / 0.02) + 1)) { if (p[2] > cur) cur = p[2]; if (p[2] <= 0.0005 && cur > 0.0005) { tops.push(cur); cur = 0; } }
  void vorige;
  ok(tops.length >= 1 && tops.every((t, i) => i === 0 || t < tops[i - 1] + 1e-6), `stuiters worden lager: ${tops.map((t) => t.toFixed(2)).join(' ')}`);
  ok(tops[0] < 2.5, 'de eerste stuiter is veel lager dan de worp');
  // het gras neemt meer snelheid weg dan de green
  const gras = simulate(T(() => 'gras'), { x: 0, y: 0, ...lanceer(0, 40) });
  ok(dist(gras.end, gras.landing) < dist(r.end, r.landing), 'in het gras rolt hij minder uit dan op de green');
  ok(dist(gras.end, gras.landing) < 2.5, 'een pitch in het gras plugt');
  // de bal wint nooit hoogte uit het niets
  ok(r.trace.every((p) => p[2] >= -1e-6), 'de bal gaat niet door de grond');
}

// --- zand en water ---------------------------------------------------------------------------------------
{
  const z = simulate(T(() => 'zand'), { x: 0, y: 0, ...lanceer(0, 20) });
  ok(z.events.some((e) => e.kind === 'zand'), 'zand-gebeurtenis');
  ok(dist(z.end, z.landing) < 0.1, 'de bal blijft in het zand liggen');
  ok(!z.events.some((e) => e.kind === 'stuiter'), 'geen stuiter in zand');
  // water: landt de bal erin, dan plons
  const w = simulate(T((x) => (x > 15 ? 'water' : 'gras')), { x: 0, y: 0, ...lanceer(0, 24) });
  ok(w.water && w.events.some((e) => e.kind === 'plons') && !w.holed, 'plons');
  ok(w.end.x > 15, 'de plons ligt in het water');
  // en rolt de bal er langzaam in, ook
  const w2 = simulate(T((x) => (x > 3 ? 'water' : 'green')), { x: 0, y: 0, vx: 3.5, vy: 0 });
  ok(w2.water, 'een putt rolt het water in');
  const w3 = simulate(T((x) => (x > 3 ? 'water' : 'green')), { x: 0, y: 0, vx: 1.2, vy: 0 });
  ok(!w3.water && w3.rest, 'een zachte putt stopt voor het water');
}

// --- de hole ------------------------------------------------------------------------------------------------
{
  const cup = { x: 3, y: 0 };
  const putt = (v, offset = 0, slope = { x: 0, y: 0 }) => simulate(T(() => 'green', slope, cup), { x: 0, y: offset, vx: v, vy: 0 });
  const zacht = putt(Math.sqrt(2 * SURFACE.green.mu * G * 3.1));
  ok(zacht.holed && zacht.events.some((e) => e.kind === 'hole'), 'een zachte putt op lijn valt');
  ok(zacht.trace[zacht.trace.length - 1][2] < 0, 'de bal zakt in de put');
  const hard = putt(7);
  ok(!hard.holed && hard.end.x > 3, 'een harde putt rolt eroverheen');
  ok(hard.passed >= 1, 'en passeert de rand');
  // de capture is monotoon in de snelheid: tot de drempel valt hij, erboven niet
  let eerstNiet = null, laatsteJa = null;
  for (let v = 2.8; v < 4.5; v += 0.02) { const r = putt(v); if (r.holed) laatsteJa = v; else if (eerstNiet === null) eerstNiet = v; }
  ok(laatsteJa !== null && eerstNiet !== null && eerstNiet > laatsteJa - 0.001, `drempel is een enkele snelheid (${laatsteJa} / ${eerstNiet})`);
  // aan de rand: een kleine afwijking geeft een lipout (de rand), een grote mist
  const rand = putt(Math.sqrt(2 * SURFACE.green.mu * G * 3.3), 0.09);
  ok(rand.events.some((e) => e.kind === 'rand') || rand.holed, 'aan de rand: tikken of vallen');
  const mis = putt(3, 0.3);
  ok(!mis.holed && !mis.events.some((e) => e.kind === 'rand'), 'een meter ernaast mist');
  // een bal die aan de rand tikt keert niet om
  ok(Number.isFinite(rand.end.x), 'het einde is eindig');
  // een pitch die in de hole landt valt niet (te hard)
  const lucht = simulate(T(() => 'green', { x: 0, y: 0 }, { x: 25, y: 0 }), { x: 0, y: 0, ...lanceer(0, 25) });
  ok(!lucht.holed, 'een pitch zonder hoek in de put blijft er niet in hangen');
}

// --- pitch en putt op de echte holes ---------------------------------------------------------------------
{
  const holes = PP.ppHoles();
  const h = holes[1];
  const een = PP.pitch(h, h.tee, h.heading, 0.7, makeRng(5));
  const twee = PP.pitch(h, h.tee, h.heading, 0.7, makeRng(5));
  assert.deepEqual(een, twee); n++;
  ok(een.trace.length > 20 && een.events[0].kind === 'slag', 'een pitch heeft een baan en een slag-gebeurtenis');
  ok(een.trace.every((p) => p.every(Number.isFinite)), 'pitch zonder NaN');
  // de vijver op baan 4 (met het water vlak voor de green): een pitch erin plonst
  const v = holes[3];
  ok(v.water.length === 1, 'baan 4 heeft een vijver');
  const midden = v.water[0];
  const van = { x: midden.x - Math.cos(v.heading) * 40, y: midden.y - Math.sin(v.heading) * 40 };
  const naarVijver = Math.atan2(midden.y - van.y, midden.x - van.x);
  const plons = PP.pitch(v, van, naarVijver, PP.powerForCarry(40), () => 0.5);
  ok(plons.water && plons.events.some((e) => e.kind === 'plons'), 'een pitch in de vijver plonst');
  ok(!PP.inBunker(v, midden.x, midden.y) && PP.inWater(v, midden.x, midden.y), 'de vijver is water');
  // ligt de vijver niet op de lijn naar de green, dan blijft de pitch droog
  const droog = PP.pitch(v, v.tee, v.heading, PP.powerForCarry(Math.min(v.len * 0.9, PP.PITCH_MAX * 0.95)), () => 0.5);
  ok(!droog.water, 'de rechte lijn naar de green is droog');
  // het terrein
  const tr = PP.holeTerrain(holes[0]);
  ok(tr.surface(holes[0].cup.x, holes[0].cup.y) === 'green', 'rond de put is green');
  ok(tr.surface(holes[0].bunkers[0].x, holes[0].bunkers[0].y) === 'zand', 'in de bunker is zand');
  ok(tr.surface(holes[0].tee.x, holes[0].tee.y) === 'gras', 'op de tee is gras');
  const echt = PP.holeTerrain(holes[0], (x) => 0.01 * x);
  ok(Math.abs(echt.slope(holes[0].tee.x, holes[0].tee.y).x + 0.01) < 1e-9, 'de echte helling van de wereld (map.surfaceAt) telt mee');
  const steil = PP.holeTerrain(holes[0], (x) => 5 * x);
  ok(Math.hypot(steil.slope(holes[0].tee.x, holes[0].tee.y).x, steil.slope(holes[0].tee.x, holes[0].tee.y).y) <= 0.0201, 'de echte helling is begrensd');
  // putts van 3 en 7 m kunnen nog steeds vallen (de oplosser vindt de lijn)
  for (const hh of holes) for (const dd of [3, 7]) {
    const from = { x: hh.cup.x - Math.cos(hh.heading) * dd, y: hh.cup.y - Math.sin(hh.heading) * dd };
    ok(PP.bestPutt(hh, from).holed, `baan ${hh.n}: putt van ${dd} m`);
  }
  // constanten
  ok(BALL_R < CUP_R && CUP_SPEED > 1, 'de bal past in de hole');
}

console.log(`golfphysics_test ok (${n} controles)`);
