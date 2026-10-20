// Minigames batch 2: the rules of the swimming pool, the climbing tower and the
// water-ski lake (pure files, no browser), their invented lines, and that every
// fixed place stands on open ground of the city map (and the ski lane in water).
//   node scripts/minigames2_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { frame, geo, makeRng, medalFrom } from '../game/js/minigamekit.js';
import * as SW from '../game/js/swimrules.js';
import * as CL from '../game/js/climbrules.js';
import * as SK from '../game/js/skirules.js';
import { POOL_LINES, CLIMB_LINES, SKI_LINES } from '../game/js/minigamelines2.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- swimming --------------------------------------------------------------------------------------

{
  const run = (skill, seed) => {
    const rng = makeRng(seed), st = SW.createSwim();
    let t = 0;
    while (st.phase !== 'done' && t < 400) { SW.stepSwim(st, SW.botInput(st, 1 / 60, skill, rng), 1 / 60); t += 1 / 60; }
    return st;
  };
  const perfect = run(1, 1), ok = run(0.7, 2), flail = run(0.1, 3);
  check('the perfect swimmer finishes in 55-64 s and wins gold', perfect.phase === 'done' && perfect.time > 55 && perfect.time < 64 && SW.swimMedal(perfect.time) === 3, perfect.time);
  check('a decent swimmer gets silver or bronze', SW.swimMedal(ok.time) >= 1 && SW.swimMedal(ok.time) < 3, ok.time);
  check('flailing is much slower', flail.time > ok.time + 20, `${flail.time} vs ${ok.time}`);
  check('four lengths, 100 m, four turns minus the last', perfect.length === 4 && Math.abs(perfect.dist - 100) < 1.5 && perfect.turns === 3, JSON.stringify({ l: perfect.length, d: perfect.dist, t: perfect.turns }));
  check('flip turns beat plain turns', perfect.flips === 3 && run(0.7, 2).flips === 0);
  const q = (gap, same) => SW.strokeQuality(gap, same);
  check('stroke quality peaks at the ideal rhythm, falls off either side', q(0.55, false) === 1 && q(0.55, false) > q(0.9, false) && q(0.55, false) > q(0.25, false) && q(0.3, true) < 0.2 && q(0.55, true) < q(0.55, false));
  check('the dive marker swings 0..1', Math.abs(SW.diveMarker(0)) < 1e-9 && Math.abs(SW.diveMarker(SW.SWIM.diveCycle / 2) - 1) < 1e-9);
  check('green dive is full quality, off by a lot is worse', SW.diveQuality(0.5) === 1 && SW.diveQuality(0.05) < 0.7 && SW.diveQuality(0.99) < 0.8);
  const st = SW.createSwim();
  SW.stepSwim(st, { dive: true }, 0.05);
  check('a flop in the dive is slower than a clean one', st.phase === 'swim' && st.flops && st.v < 3);
  const none = SW.createSwim();
  for (let i = 0; i < 100; i++) SW.stepSwim(none, {}, 1 / 60);
  check('nothing happens on the block without Space', none.phase === 'block' && none.dist === 0);
  check('medal thresholds', SW.swimMedal(63) === 3 && SW.swimMedal(70) === 2 && SW.swimMedal(95) === 1 && SW.swimMedal(120) === 0 && SW.swimMedal(NaN) === 0);
  let fin = true;
  for (const s of [run(1, 9), run(0.4, 8), run(0, 7)]) if (![s.time, s.x, s.v, s.stamina].every(Number.isFinite) || s.stamina < 0 || s.stamina > 1) fin = false;
  check('all numbers stay finite, stamina in 0..1', fin);
}

// --- climbing --------------------------------------------------------------------------------------

{
  const holds = CL.makeHolds(7);
  check('holds are deterministic', JSON.stringify(holds) === JSON.stringify(CL.makeHolds(7)) && JSON.stringify(holds) !== JSON.stringify(CL.makeHolds(8)));
  check('holds cover the wall within its width', holds.length > 50 && holds.every((h) => h.h > 0.4 && h.h < CL.WALL.height && Math.abs(h.x) <= CL.WALL.halfWidth + 0.01) && holds.some((h) => h.big));
  // every hold has a next one within reach, so the wall can always be climbed
  let stuck = 0;
  for (const h of holds) if (!holds.some((o) => o.h >= h.h + 0.4 && o.h <= h.h + CL.WALL.reachUp && Math.abs(o.x - h.x) <= CL.WALL.reachSide) && h.h < CL.WALL.height - 1.5) stuck++;
  check('every hold has a next hold in reach', stuck === 0, stuck);
  const climb = (rest) => {
    const st = CL.createClimb(holds);
    CL.startClimb(st);
    let t = 0;
    while (st.phase === 'climb' && t < 300) { CL.stepClimb(st, CL.botInput(st, rest), 1 / 60); t += 1 / 60; }
    return st;
  };
  const good = climb(0.5), tired = climb(0);
  check('a bot that rests on big holds reaches the top fast', good.phase === 'top' && good.falls === 0 && good.time > 10 && good.time < 40, `${good.phase} ${good.time}`);
  check('a bot that never rests runs out of arms and falls', tired.falls >= 1, JSON.stringify({ f: tired.falls, p: tired.phase }));
  check('three falls end the climb', tired.phase === 'over' && tired.falls === CL.WALL.tries);
  check('a fall costs the penalty in time', (() => { const s = climb(0); return s.time >= s.falls * CL.WALL.penalty; })());
  const st = CL.createClimb(holds);
  CL.startClimb(st);
  for (let i = 0; i < 20; i++) CL.stepClimb(st, { a: true }, 0.1);
  check('holding A grips a low hold', st.hands.a.state === 'grip' && st.hands.a.hold && st.hands.a.hold.h < 1.2 && st.grips === 1);
  const ev = [];
  for (let i = 0; i < 10; i++) ev.push(...CL.stepClimb(st, { a: false }, 0.1));
  check('letting go near the mat is no fall', !ev.some((e) => e.type === 'fall') && st.ground && st.falls === 0);
  const hi = CL.createClimb(holds);
  CL.startClimb(hi);
  for (let i = 0; i < 60 * 40 && hi.body < 2.5; i++) CL.stepClimb(hi, CL.botInput(hi, 0.5), 1 / 60);
  const evh = [];
  for (let i = 0; i < 10; i++) evh.push(...CL.stepClimb(hi, {}, 0.1));
  check('letting go of both hands high on the wall is a fall onto the mat', evh.some((e) => e.type === 'fall' && e.why === 'let-go' && e.height > 1.5) && hi.ground && hi.falls === 1 && hi.arms === 1);
  check('on the mat nothing falls', (() => { const s = CL.createClimb(holds); CL.startClimb(s); const e = []; for (let i = 0; i < 30; i++) e.push(...CL.stepClimb(s, {}, 0.1)); return !e.length && s.ground; })());
  const s2 = CL.createClimb(holds);
  CL.startClimb(s2);
  for (let i = 0; i < 12; i++) CL.stepClimb(s2, { a: true }, 0.1);
  s2.arms = 0.1;
  CL.stepClimb(s2, { a: true, chalk: true }, 0.1);
  check('chalk refreshes the arms once', s2.arms > 0.4 && s2.chalked && (() => { s2.arms = 0.1; CL.stepClimb(s2, { a: true, chalk: true }, 0.1); return s2.arms < 0.2; })());
  check('big holds rest the arms when both hands are on them', (() => {
    const big = holds.filter((h) => h.big).slice(0, 2);
    const s = CL.createClimb(holds); CL.startClimb(s); s.ground = false; s.arms = 0.5;
    s.hands.a = { state: 'grip', hold: { ...big[0], big: true }, t: 0, wasDown: true }; s.hands.d = { state: 'grip', hold: { ...big[1], big: true }, t: 0, wasDown: true };
    CL.stepClimb(s, { a: true, d: true }, 1);
    return s.arms > 0.5;
  })());
  check('medals', CL.climbMedal(25) === 3 && CL.climbMedal(40) === 2 && CL.climbMedal(70) === 1 && CL.climbMedal(95) === 0 && CL.climbMedal(NaN) === 0);
}

// --- water-skiing ----------------------------------------------------------------------------------

{
  const run = (skill, seed) => {
    const rng = makeRng(seed), st = SK.createSki();
    let t = 0;
    while (st.phase !== 'done' && st.phase !== 'over' && t < 200) { SK.stepSki(st, SK.botInput(st, skill, rng), 1 / 60); t += 1 / 60; }
    return st;
  };
  const expert = run(1, 1), mid = run(0.9, 1), casual = run(0.6, 1), poor = run(0.3, 1);
  check('the run ends at the end of the lake', expert.phase === 'done' && casual.phase === 'done' && Math.abs(expert.sS - SK.SKI.len) < 2, expert.sS);
  check('the expert scores gold, the casual skier bronze or less', SK.skiMedal(SK.finalScore(expert)) === 3 && SK.skiMedal(SK.finalScore(casual)) <= 1, `${SK.finalScore(expert)} ${SK.finalScore(casual)}`);
  check('scores follow skill', SK.finalScore(expert) > SK.finalScore(mid) && SK.finalScore(mid) > SK.finalScore(casual) && SK.finalScore(casual) >= SK.finalScore(poor));
  check('jumps and clean landings happen and score', expert.jumps >= 3 && expert.bestAir > 0.5);
  check('buoys are alternating and spread over the lake', (() => { const g = SK.makeGates(); return g.length >= 6 && g.every((x, i) => i === 0 || (x.side === -g[i - 1].side && x.s - g[i - 1].s === SK.SKI.gate.every)) && g[g.length - 1].s < SK.SKI.len - 15; })());
  // pure rules
  const st = SK.createSki();
  for (let i = 0; i < 60 * 8; i++) SK.stepSki(st, { steer: 0 }, 1 / 60);
  check('the boat gets up to speed and the skier follows the wake line', Math.abs(st.vB - SK.SKI.boatSpeed) < 0.3 && Math.abs(st.rel) < 3, JSON.stringify({ v: st.vB, rel: st.rel }));
  const lean = SK.createSki();
  for (let i = 0; i < 60 * 3; i++) SK.stepSki(lean, { steer: 1 }, 1 / 60);
  check('leaning out pulls you sideways, the rope pulls you back to a steady lean', lean.px > 5 && lean.rel < SK.SKI.ropeMax && lean.falls === 0);
  const shore = SK.createSki(); shore.phase = 'run'; shore.px = SK.SKI.halfWidth + 1;
  check('touching the shore is a fall', SK.stepSki(shore, {}, 1 / 60).some((e) => e.type === 'fall' && e.why === 'oever'));
  const rope = SK.createSki(); rope.phase = 'run'; rope.px = 24;
  check('a taut rope lets go', SK.stepSki(rope, {}, 1 / 60).some((e) => e.type === 'fall' && e.why === 'touw'));
  const bad = SK.createSki(); bad.phase = 'run'; bad.air = 1; bad.z = 0.01; bad.vz = -1; bad.spin = Math.PI * 0.5;
  check('a landing sideways is a fall, a straight one is not', SK.stepSki(bad, {}, 1 / 60).some((e) => e.type === 'fall' && e.why === 'landing')
    && (() => { const s = SK.createSki(); s.phase = 'run'; s.air = 1; s.z = 0.01; s.vz = -1; s.airT = 1; s.spin = Math.PI * 2.05; return SK.stepSki(s, {}, 1 / 60).some((e) => e.type === 'land'); })());
  check('a fall costs points and the multiplier, and the skier recovers', (() => {
    const s = SK.createSki(); s.score = 400; s.mult = 3; s.phase = 'run';
    s.px = 30;
    SK.stepSki(s, {}, 1 / 60);
    return s.score < 400 && s.mult === 1 && s.fall > 0 && (() => { for (let i = 0; i < 60 * 3; i++) SK.stepSki(s, { steer: 0 }, 1 / 60); return s.fall <= 0; })();
  })());
  check('three falls end the run', (() => { const s = SK.createSki(); s.phase = 'run'; for (let i = 0; i < 60 * 30 && s.phase === 'run'; i++) { if (s.fall <= 0) s.px = 30; SK.stepSki(s, {}, 1 / 60); } return s.phase === 'over' && s.falls === SK.SKI.tries; })());
  check('a jump needs Space at the wake', (() => {
    const s = SK.createSki(); s.phase = 'run'; s.vB = 11;
    let jumped = false;
    for (let i = 0; i < 60 * 6; i++) { const ev = SK.stepSki(s, { steer: 1, jump: i % 5 === 0 }, 1 / 60); if (ev.some((e) => e.type === 'jump')) jumped = true; if (s.fall > 0) break; }
    return jumped;
  })());
  check('without Space the wake is only a bump', (() => {
    const s = SK.createSki(); s.phase = 'run'; s.vB = 11;
    let ev2 = [];
    for (let i = 0; i < 60 * 6; i++) { ev2 = ev2.concat(SK.stepSki(s, { steer: 1 }, 1 / 60)); if (s.fall > 0) break; }
    return !ev2.some((e) => e.type === 'jump') && ev2.some((e) => e.type === 'bump');
  })());
  check('medal thresholds', SK.skiMedal(0) === 0 && SK.skiMedal(700) === 1 && SK.skiMedal(1400) === 2 && SK.skiMedal(2300) === 3);
  check('boat lateral path is smooth and bounded', (() => { let m = 0; for (let s = 0; s < 500; s += 0.5) m = Math.max(m, Math.abs(SK.boatLat(s))); return m <= SK.SKI.swing + 1e-9 && m > SK.SKI.swing - 0.2; })());
  check('all numbers stay finite', [expert, casual, poor].every((s) => [s.score, s.px, s.vx, s.sS].every(Number.isFinite)));
}

// --- the lines ---------------------------------------------------------------------------------------

{
  const all = [POOL_LINES, CLIMB_LINES, SKI_LINES].flatMap((o) => Object.entries(o).filter(([k]) => k !== 'who').flatMap(([, v]) => v));
  check('there are lines', all.length > 30);
  const brands = /swapfiets|mcdonald|anwb|\bnam\b|hanze|speedo|\\bnike\\b|adidas|red bull|redbull|gasunie|duo\b/i;
  check('no real brands in the lines', !all.some((l) => brands.test(l)));
  check('lines are short bubbles', all.every((l) => l.length > 3 && l.length < 140));
  check('the staff have invented names', [POOL_LINES.who, CLIMB_LINES.who, SKI_LINES.who].every((x) => /^[A-Z]/.test(x)));
}

// --- the places on the city map ------------------------------------------------------------------------

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const map = await loadCityData({ extras: false });
  const inPoly = (x, y, p) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) r = !r; } return r; };
  const bounds = (p) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const q of p) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } return [a, b, c, d]; };
  const bb = map.buildings.map((b) => ({ b: bounds(b.pts), p: b.pts }));
  const wb = map.water.map((b) => ({ b: bounds(b.pts), p: b.pts }));
  const hit = (list, x, y) => list.find(({ b, p }) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && inPoly(x, y, p));
  const around = (list, x, y, r) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]].some(([dx, dy]) => hit(list, x + dx, y + dy));
  const [x0, y0, x1, y1] = map.meta.bounds;
  const inside = (name, x, y) => check(`${name} lies inside the city map`, x > x0 && x < x1 && y > y0 && y < y1);
  // the pool: deck and pool in the frame of zwembad.js
  const pf = frame(geo(53.203403, 6.57101), 0);
  for (const [u, v] of [[0, 0], [-18, 0], [18, 0], [0, 11], [0, -11], [-18, 11], [18, -11], [-15, 9.5], [-16.5, 0]]) {
    const q = pf.toW(u, v);
    inside(`pool ${u},${v}`, q.x, q.y);
    check(`pool ${u},${v} is clear of buildings and water`, !around(bb, q.x, q.y, 1) && !around(wb, q.x, q.y, 1), `${q.x.toFixed(1)},${q.y.toFixed(1)}`);
  }
  // the tower: the footprint, the mat and the standing spot (klimtoren.js)
  const tf = frame(geo(53.236337, 6.537852), 0);
  for (const [u, v] of [[0, 0], [-2.2, 2], [-2.2, -2], [2.2, 2], [6.5, 0], [8, 3], [10, 0], [6, 4]]) {
    const q = tf.toW(u, v);
    inside(`tower ${u},${v}`, q.x, q.y);
    if (Math.abs(u) > 2.5 || Math.abs(v) > 2.5) check(`tower ${u},${v} is clear of buildings and water`, !around(bb, q.x, q.y, 1) && !around(wb, q.x, q.y, 1), `${q.x.toFixed(1)},${q.y.toFixed(1)}`);
  }
  // the ski lake: the lane is water all along, the standing spot is dry (waterski.js)
  const sf = frame(geo(53.22442, 6.59434), 0.261);
  let dry = 0, narrow = 0;
  for (let s = 0; s <= SK.SKI.len; s += 10) for (const lat of [-SK.SKI.halfWidth + 1, -13, 0, 13, SK.SKI.halfWidth - 1]) {
    const q = sf.toW(s, lat);
    if (!hit(wb, q.x, q.y)) dry++;
  }
  for (let s = 0; s <= SK.SKI.len; s += 10) { const q = sf.toW(s, SK.boatLat(s)); if (!hit(wb, q.x, q.y)) narrow++; }
  check('the whole ski lane (boat path and buoys) is open water', dry === 0 && narrow === 0, `${dry} dry samples, ${narrow} dry boat samples`);
  const stand = sf.toW(-8, 0);
  check('the jetty stand is on land', !hit(wb, stand.x, stand.y) && !hit(bb, stand.x, stand.y));
  inside('waterski stand', stand.x, stand.y);
  void medalFrom;
}

console.log(`minigames 2: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
