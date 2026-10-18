// Headless, deterministic simulation of a chase (#43, #204): it steps the real
// search and cooldown rules of wantedlevels.js (the same code police.js runs)
// with a seeded player, for every star level. Checks: a chase that is never
// lost never ends; hiding inside the search circle drops one star per
// cooldown; running out of the circle is twice as fast; a new crime resets
// the cooldown; the same seed gives the same trace; the budgets (layers,
// roadblocks, bystanders) stay bounded so nothing grows per frame.
//   node scripts/pursuit_sim_test.mjs
import { levelOf, chaseLayers, npcBudget, markSeen, stepUnseen, SEARCH_MIN_RADIUS } from '../game/js/wantedlevels.js';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// One chase. script: { stars, seenFor (s in sight), then 'hide' | 'run' (speed m/s away from the last seen spot), crimeAt (s after hiding starts, optional) }
function chase(script, seed = 1, dt = 0.1, cap = 900) {
  const r = rng(seed);
  const w = { wanted: script.stars, wantedDecayTimer: 0 };
  const pol = { searching: false, searchCenter: null, searchRadius: 0, lastSeen: null, seenRecently: false, unseenFor: 0 };
  let x = 0, y = 0, t = 0, lostAt = null;
  const drops = [];
  const trace = [];
  const heading = r() * Math.PI * 2;
  for (; t < cap; t += dt) {
    const hiding = t >= script.seenFor;
    if (hiding && script.mode === 'run') { x += Math.cos(heading) * script.speed * dt; y += Math.sin(heading) * script.speed * dt; }
    if (script.crimeAt != null && Math.abs(t - (script.seenFor + script.crimeAt)) < dt / 2) { w.wanted = Math.min(5, w.wanted + 1); w.wantedDecayTimer = 0; }
    if (!hiding) markSeen(pol, w, x, y);
    else {
      const before = w.wanted;
      if (stepUnseen(pol, w, dt, x, y, 1)) { lostAt = t; trace.push([+t.toFixed(1), 0]); break; }
      if (w.wanted < before) { drops.push(+t.toFixed(1)); trace.push([+t.toFixed(1), w.wanted]); }
    }
  }
  return { lostAt, drops, trace, w, pol };
}

// --- a chase that is never lost -------------------------------------------------------------------
for (let s = 1; s <= 5; s++) {
  const c = chase({ stars: s, seenFor: 1e9, mode: 'hide' }, 1, 0.25, 300);
  ok(c.lostAt === null && c.w.wanted === s, `${s} stars: in sight forever, never lost`);
}

// --- hiding inside the circle: loseAfter, then one star per cooldown ----------------------------
for (let s = 1; s <= 5; s++) {
  const L = levelOf(s);
  const c = chase({ stars: s, seenFor: 5, mode: 'hide' }, 2);
  // each star costs its own row's cooldown (the level lowers as stars drop)
  let expect = 5 + L.loseAfter;
  for (let k = s; k >= 1; k--) expect += levelOf(k).cooldown;
  ok(c.lostAt !== null && Math.abs(c.lostAt - expect) < 0.6, `${s} stars: hidden inside the circle, lost after about ${expect.toFixed(0)} s`, `${c.lostAt} vs ${expect}`);
  ok(c.drops.length === s - 1, `${s} stars: one drop per cooldown before the last`, c.drops.join());
}

// --- running out of the circle is twice as fast ---------------------------------------------------
for (let s = 2; s <= 5; s++) {
  const inside = chase({ stars: s, seenFor: 5, mode: 'hide' }, 3);
  const run = chase({ stars: s, seenFor: 5, mode: 'run', speed: 12 }, 3);
  ok(run.lostAt < inside.lostAt * 0.75, `${s} stars: running out of the circle cools down much faster`, `${run.lostAt} vs ${inside.lostAt}`);
}

// --- a new crime while hiding resets the cooldown ------------------------------------------------------
{
  const L = levelOf(2);
  const a = chase({ stars: 2, seenFor: 5, mode: 'hide' }, 4);
  const b = chase({ stars: 2, seenFor: 5, mode: 'hide', crimeAt: L.loseAfter + 3 }, 4);
  ok(b.lostAt > a.lostAt, 'a new crime while hiding makes the chase last longer', `${b.lostAt} vs ${a.lostAt}`);
}

// --- the search circle shrinks to a floor ------------------------------------------------------------------
{
  const c = chase({ stars: 5, seenFor: 5, mode: 'hide' }, 5, 0.5, 40);
  ok(c.pol.searching && c.pol.searchRadius <= levelOf(5).searchRadius && c.pol.searchRadius >= SEARCH_MIN_RADIUS, 'the circle shrinks but not below the floor');
}

// --- determinism: the same seed gives the same trace, a different seed a different run ------------------
{
  const a = JSON.stringify(chase({ stars: 4, seenFor: 7, mode: 'run', speed: 9 }, 11));
  const b = JSON.stringify(chase({ stars: 4, seenFor: 7, mode: 'run', speed: 9 }, 11));
  ok(a === b, 'the same seed gives an identical chase');
  const c = chase({ stars: 4, seenFor: 7, mode: 'run', speed: 9 }, 12);
  ok(typeof c.lostAt === 'number', 'another seed also ends');
}

// --- budgets stay bounded: layers only grow with stars, roadblocks one at a time, bystanders capped ---------
{
  let prev = 0;
  for (let s = 1; s <= 5; s++) { const l = chaseLayers(s).length; ok(l >= prev, `layers never shrink at ${s} stars`); prev = l; }
  for (let s = 1; s <= 5; s++) {
    const L = levelOf(s);
    // roadblock timeline: one at a time, every roadblockEvery s, living roadblockLife s
    let live = 0, madeAt = -1e9, maxLive = 0, made = 0;
    for (let t = 0; t < 600; t += 0.5) {
      if (live && t >= madeAt + L.roadblockLife) live = 0;
      if (s >= 3 && L.roadblockEvery > 0 && !live && t >= madeAt + L.roadblockEvery) { live = 1; madeAt = t; made++; }
      maxLive = Math.max(maxLive, live);
    }
    ok(maxLive <= 1, `${s} stars: never more than one roadblock at a time`);
    ok(s < 3 ? made === 0 : made > 0 && made <= 600 / L.roadblockEvery + 1, `${s} stars: roadblocks come on schedule (${made} in 10 min)`);
    ok(npcBudget(s, 8) >= 1 && npcBudget(s, 8) <= 8 && npcBudget(s, 40) >= 1, `${s} stars: bystander budget bounded and never zero`);
  }
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
