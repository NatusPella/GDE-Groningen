// Minigames batch 3: the rules of the disc golf extensions, the fishing at the
// Meerstad lake, the Winsum walk and the pancake boat (pure files, no browser).
//   node scripts/minigames3_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeRng, geo } from '../game/js/minigamekit.js';
import * as L3 from '../game/js/minigamelines3.js';
import { courseHoles, parFor } from '../game/js/discgolfrules.js';
import * as DG from '../game/js/discgolfext.js';
import * as FI from '../game/js/hengelrules.js';
import * as WA from '../game/js/wandelrules.js';
import * as PK from '../game/js/pannenkoekrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- disc golf extensions -------------------------------------------------------------------------------
{
  const holes = courseHoles(), back = DG.reverseHoles(holes), full = DG.fullRound(holes);
  check('the back nine has nine holes numbered 10..18', back.length === 9 && back[0].n === 10 && back[8].n === 18);
  check('a reversed hole is as long and swaps tee and basket', back.every((h, i) => Math.abs(h.len - holes[i].len) < 1e-6 && h.tee.x === holes[i].basket.x && h.basket.y === holes[i].tee.y));
  check('the par follows the length', back.every((h) => h.par === parFor(h.len)));
  check('the full round has eighteen holes in order', full.length === 18 && full.every((h, i) => h.n === i + 1) && full[9].tee.x === holes[8].basket.x);
  check('the 18-hole medals are wider than the 9-hole ones', DG.roundMedal(2, 18) === 2 && DG.roundMedal(2, 9) === 1 && DG.roundMedal(2, 18) > DG.roundMedal(7, 18) && DG.roundMedal(-5, 18) === 3);
  check('closer to the basket scores more', DG.ctpPoints(3) > DG.ctpPoints(15) && DG.ctpPoints(15) > DG.ctpPoints(30) && DG.ctpPoints(80) === 0);
  check('inside the circle gives a bonus', DG.ctpPoints(11.9) - DG.ctpPoints(12.1) > DG.CTP.bonusInside - 3);
  check('water or out of play scores nothing', DG.ctpPoints(null) === 0 && DG.ctpPoints(NaN) === 0);
  const good = DG.ctpRound([2, 4, 6]), poor = DG.ctpRound([30, 45, 60]);
  check('a good round beats a poor one and earns a medal', good.points > poor.points && good.medal >= 2 && poor.medal === 0 && good.best === 2);
}

// --- fishing --------------------------------------------------------------------------------------------
{
  const run = (react, seed) => {
    const rng = makeRng(seed), st = FI.createHengel(rng);
    for (let t = 0; t < 400 && st.phase !== 'done'; t += 1 / 60) FI.stepHengel(st, FI.botHengel(st, react, rng), 1 / 60);
    return st;
  };
  const quick = run(0.15, 11), slow = run(0.9, 11);
  check('the session ends by itself', quick.phase === 'done' && slow.phase === 'done');
  check('quick hands catch fish', quick.catches.length > 3 && quick.kg > 3, quick.kg);
  check('slow hands lose the big ones', slow.lost > quick.lost && slow.kg < quick.kg);
  check('the share of bites adds up to 1', Math.abs(FI.FISH.reduce((a, f) => a + f.share, 0) - 1) < 1e-9);
  check('bigger fish bite for a shorter time', FI.FISH.every((f, i) => i === 0 || f.window < FI.FISH[i - 1].window));
  const st = FI.createHengel(makeRng(2));
  FI.stepHengel(st, { cast: true }, 0.1);
  for (let i = 0; i < 90; i++) FI.stepHengel(st, {}, 0.02);
  const ev = FI.stepHengel(st, { cast: true }, 0.02);
  check('striking before the bite scares the fish', ev.some((e) => e.type === 'early') && st.phase === 'scare' && st.kg === 0);
  check('medal thresholds', FI.hengelMedal(3) === 0 && FI.hengelMedal(5) === 1 && FI.hengelMedal(13) === 3);
}

// --- the walk -------------------------------------------------------------------------------------------
{
  const pts = WA.routePoints(), len = WA.routeLength(pts);
  check('five stamp posts and a route of 2 to 8 km', pts.length === 5 && len > 2000 && len < 8000, len);
  // walk the straight legs at a given speed
  const walk = (v) => {
    const st = WA.createWalk(pts);
    let pos = { x: pts[0].x, y: pts[0].y }, dt = 0.5;
    WA.stepWalk(st, pos, dt);
    for (let i = 1; i < pts.length; i++) {
      const to = pts[i], d = Math.hypot(to.x - pos.x, to.y - pos.y), steps = Math.ceil(d / (v * dt));
      for (let k = 1; k <= steps; k++) { pos = { x: pos.x + (to.x - pos.x) / (steps - k + 1), y: pos.y + (to.y - pos.y) / (steps - k + 1) }; WA.stepWalk(st, pos, dt); }
    }
    return st;
  };
  const stroll = walk(1.8), brisk = walk(2.9), sprint = walk(4.5);
  check('walking the route collects all stamps in order', brisk.phase === 'done' && brisk.stamps.map((s) => s.id).join() === WA.STAMPS.map((s) => s.id).join());
  check('medals follow the pace', WA.walkMedal(stroll) === 1 && WA.walkMedal(brisk) === 2 && WA.walkMedal(sprint) === 3, [stroll, brisk, sprint].map((s) => WA.averagePace(s).toFixed(2)).join());
  const skip = WA.createWalk(pts);
  WA.stepWalk(skip, { x: pts[0].x, y: pts[0].y }, 1);
  const ev = WA.stepWalk(skip, { x: pts[3].x, y: pts[3].y }, 1);
  check('stamps cannot be skipped and a jump is not walking', ev.length === 0 && skip.next === 1 && skip.cheat === 1 && skip.dist === 0);
  check('no medal for a walk that did not cover the route', WA.walkMedal({ phase: 'done', dist: 100, t: 20, pts }) === 0);
  const t = WA.nextTarget(WA.createWalk(pts), { x: pts[0].x + 100, y: pts[0].y });
  check('the next target is the first stamp', t.id === 'station' && Math.abs(t.dist - 100) < 1e-6);
}

// --- pancake boat ---------------------------------------------------------------------------------------
{
  const run = (skill, seed) => {
    const rng = makeRng(seed), st = PK.createPan(rng);
    let guard = 0;
    while (st.phase !== 'done' && guard++ < 20000) {
      for (const a of PK.botPan(st, skill, rng)) a[0] === 'pan' ? PK.usePan(st, a[1]) : PK.serve(st, a[1], a[2]);
      PK.stepPan(st, 1 / 30);
    }
    return st;
  };
  const pro = run(1, 3), meh = run(0.2, 3);
  check('the shift ends after two minutes', pro.phase === 'done' && Math.abs(pro.t - PK.PAN.duration) < 0.1);
  check('a steady cook scores more than a sloppy one', pro.points > meh.points, `${pro.points} vs ${meh.points}`);
  check('a steady cook earns a medal', PK.pannenkoekMedal(pro.points) >= 1, pro.points);
  const st = PK.createPan(makeRng(1));
  check('pouring starts a pan', PK.usePan(st, 0).type === 'pour' && st.pans[0].state === 'cooking');
  check('flipping too early wastes the pancake', PK.usePan(st, 0).type === 'raw' && st.raw === 1 && st.pans[0].state === 'empty');
  PK.usePan(st, 1);
  for (let i = 0; i < PK.PAN.cookT * 60 + 20; i++) PK.stepPan(st, 1 / 60);
  check('the golden window is open after the cooking time', PK.goldenNow(st.pans[1]));
  check('golden pancakes are plated with a bonus', PK.usePan(st, 1).golden === true && st.plate.length === 1 && st.golden === 1);
  PK.usePan(st, 2);
  for (let i = 0; i < PK.PAN.burnT * 60 + 20; i++) { PK.stepPan(st, 1 / 60); if (st.pans[2].state === 'burnt') break; }
  check('a forgotten pan burns', st.pans[2].state === 'burnt' && st.burnt === 1 && PK.usePan(st, 2).type === 'scrape');
  st.guests = [{ topping: 'kaas', patience: 20 }];
  check('the wrong topping is refused', PK.serve(st, 0, 'spek').type === 'wrong' && st.plate.length === 1);
  const s = PK.serve(st, 0, 'kaas');
  check('the right topping is served, fast guests pay extra', s.type === 'serve' && s.fast && st.served === 1 && st.guests.length === 0);
  const imp = PK.createPan(makeRng(4));
  imp.guests.push({ topping: 'appel', patience: 0.01 });
  check('an impatient guest leaves and costs points', PK.stepPan(imp, 0.1).some((e) => e.type === 'leave') && imp.left_ === 1 && imp.points === PK.POINTS.leave);
}

// --- the lines, the achievements and the pancake boat's place -------------------------------------------

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const all = Object.values(L3).flatMap((o) => Object.entries(o).filter(([k]) => k !== 'who').flatMap(([, v]) => v));
  check('there are lines', all.length > 20);
  const brands = /swapfiets|mcdonald|anwb|nam|hanze|nike|adidas|red bull|gasunie|kroket ?koning ?bv|febo|new york pizza/i;
  check('no real brands in the lines', !all.some((l) => brands.test(l)));
  check('lines are short bubbles', all.every((l) => l.length > 3 && l.length < 140));
  check('the staff have invented names', Object.values(L3).every((o) => /^[A-Z]/.test(o.who)));
  const ach = fs.readFileSync(path.join(here, '../game/js/achievements.js'), 'utf8');
  const used = new Set();
  for (const f of ['carillon', 'pannenkoek', 'hengelen', 'wandeling', 'snackketen', 'discgolf']) {
    const src = fs.readFileSync(path.join(here, '../game/js/' + f + '.js'), 'utf8');
    for (const m of src.matchAll(/unlockAchievement\(w, '([a-z_]+)'/g)) used.add(m[1]);
  }
  const missing = [...used].filter((id) => !ach.includes(`id: '${id}'`));
  const reg = fs.readFileSync(path.join(here, '../game/js/activities.js'), 'utf8');
  const at = reg.indexOf('const LIST = [');
  const list = reg.slice(at, reg.indexOf(']', at));
  check('the new games are in the activity list (the activityhub kind)', ['CARILLON_GAME', 'PANNENKOEK', 'HENGELEN', 'WANDELING', 'SNACKKETEN'].every((n) => list.includes(n)), list);
  const goal = fs.readFileSync(path.join(here, '../game/js/goal.js'), 'utf8');
  check('goal.js knows the exclusive minigames', ['carillon', 'pannenkoek', 'hengelen'].every((id) => goal.includes(id + ': (w) =>')));
  check('every achievement the new games unlock exists', used.size > 10 && !missing.length, missing.join());
  const { loadStadData } = await import('./lib/loadworld.mjs');
  const map = await loadStadData();
  const inPoly = (x, y, p) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) r = !r; } return r; };
  const s = geo(53.2188, 6.582);
  const bad2 = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => map.buildings.concat(map.water).some((b) => inPoly(s.x + dx, s.y + dy, b.pts)));
  check('the pancake boat stand is on open ground of the city map', !bad2);
}

console.log(bad ? `${bad} of ${n} checks failed` : `minigames3_test: ${n} checks ok`);
process.exit(bad ? 1 : 0);
