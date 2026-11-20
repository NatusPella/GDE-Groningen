// Loopcyclus-logica (game/js/gait.js, #985): voetcontacten uit de loopfase (de stapgeluiden volgen die), bocht-lean, blik en glimpen,
// plus de koppeling in de code (models3d_people.js, scene3d.js, sfx/foley.js) en de Samen-spelen-regel (gast rekent hetzelfde).
//   node scripts/gait_test.mjs
import fs from 'node:fs';
import { footContact, contactGain, turnLean, approachTo, gazeToward, glanceOn, wrapPi, MAX_YAW_RATE, GAZE_MAX } from '../game/js/gait.js';
import { strideFor } from '../game/js/sfx/steps.js';

let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };
const TAU = Math.PI * 2;

// de cadans van animatePersonWalk (models3d_people.js): (0,42 + 0,3 v) cycli per seconde, gait 1
const cadence = (v) => Math.min(2.1, 0.42 + 0.3 * v);
function simulate(speed, secs, dt = 1 / 60, phase0 = 0) {
  let phase = phase0, n = 0; const sides = [];
  for (let t = 0; t < secs; t += dt) {
    const next = (phase + TAU * cadence(speed) * dt) % TAU;
    const c = footContact(phase, next);
    if (c) { n++; sides.push(c); }
    phase = next;
  }
  return { n, sides };
}

// twee contacten per cyclus, links en rechts om en om
for (const v of [1.2, 2, 4, 6]) {
  const r = simulate(v, 10);
  const expect = 2 * cadence(v) * 10;
  check(`speed ${v}: two contacts per cycle (${r.n} vs ${expect.toFixed(1)})`, Math.abs(r.n - expect) <= 1.01);
  check(`speed ${v}: feet alternate`, r.sides.every((s, i) => i === 0 || s !== r.sides[i - 1]));
}
// het ritme van het geluid (strideFor) en dat van het beeld lopen gelijk: afstand tussen twee contacten = strideFor
for (const v of [1.4, 2.5, 5]) {
  const r = simulate(v, 20);
  const dist = (v * 20) / r.n;
  check(`speed ${v}: distance between contacts ${dist.toFixed(2)} m matches strideFor ${strideFor(v, false).toFixed(2)}`, Math.abs(dist - strideFor(v, false)) < 0.12 * strideFor(v, false) + 0.02);
}
// geen dubbele telling over de omslag van de fase, ook niet bij een grote tijdstap (0,1 s)
{
  let n = 0, phase = 0;
  for (let i = 0; i < 400; i++) { const next = (phase + TAU * 2.1 * 0.1) % TAU; if (footContact(phase, next)) n++; phase = next; }
  check('0,1 s steps at max cadence keep two contacts per cycle', Math.abs(n - 400 * 2 * 2.1 * 0.1 / 1) <= 2, String(n));
}
check('no movement, no contact', footContact(1, 1) === 0 && footContact(NaN, 1) === 0 && footContact(1, Infinity) === 0);
check('a backward jump of the phase is no contact', footContact(3, 2.9) === 0);
check('left at PI/2, right at 3PI/2', footContact(1.5, 1.6) === 1 && footContact(4.6, 4.8) === 2 && footContact(0, 1.0) === 0);
check('contact gain matches tickFoot', contactGain(1.5, false) === 0.2 && contactGain(6, false) === 0.3 && contactGain(0.8, true) === 0.08);

// bocht-lean: naar rechts positief, begrensd, niets bij stilstaan, rustig aan
{
  const a = turnLean(2, 3), b = turnLean(-2, 3), c = turnLean(2, 0), d = turnLean(99, 6), e = turnLean(NaN, NaN);
  check('turning right leans right, left leans left, symmetric', a.lean > 0 && b.lean < 0 && Math.abs(a.lean + b.lean) < 1e-9 && a.head > 0 && b.head < 0);
  check('standing still does not lean or turn the head', c.lean === 0 && c.head === 0);
  check('lean and head stay inside their limits for any yaw rate', Math.abs(d.lean) <= 0.14 + 1e-9 && Math.abs(d.head) <= 0.3 + 1e-9 && MAX_YAW_RATE === 6);
  check('bad input is no lean', e.lean === 0 && e.head === 0);
  check('a runner leans further than a walker at the same yaw rate', turnLean(2, 6).lean > turnLean(2, 1.6).lean);
}
check('approachTo never overshoots', approachTo(0, 1, 2, 0.1) === 0.2 && approachTo(0.95, 1, 2, 0.1) === 1 && approachTo(1, 0, 2, 1) === 0);

// blik: rechts positief, alleen vooruit en dichtbij
{
  const ang = 0; // kijkt naar +x; +y (wereld-z) is rechts
  const r = gazeToward(ang, 0, 0, 5, 2, 9), l = gazeToward(ang, 0, 0, 5, -2, 9);
  check('a target on the right gives a positive angle, on the left a negative one', r > 0 && l < 0 && Math.abs(r + l) < 1e-9);
  check('a target behind is not looked at', Number.isNaN(gazeToward(ang, 0, 0, -5, 0.2, 9)));
  check('a target too far is not looked at', Number.isNaN(gazeToward(ang, 0, 0, 12, 0, 9)));
  check('the gaze is clamped', Math.abs(gazeToward(ang, 0, 0, 0.3, 5, 9)) <= GAZE_MAX + 1e-9);
  check('wrapPi wraps', Math.abs(wrapPi(TAU + 0.5) - 0.5) < 1e-9 && Math.abs(wrapPi(-TAU - 0.5) + 0.5) < 1e-9);
}
// glimpen: ongeveer de helft van de tijd, per mens verschoven, deterministisch
{
  let on = 0, diff = 0; const N = 4000;
  for (let i = 0; i < N; i++) { const t = i * 0.05; const a = glanceOn(t, 0.2); if (a) on++; if (a !== glanceOn(t, 0.7)) diff++; }
  check('a glance is on about half of the time', on / N > 0.35 && on / N < 0.65, String(on / N));
  check('two people do not glance in step', diff / N > 0.15, String(diff / N));
  check('glanceOn is deterministic (a guest sees the same)', glanceOn(12.34, 0.5) === glanceOn(12.34, 0.5));
}

// de koppeling in de code
const src = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const people = src('../game/js/models3d_people.js'), scene = src('../game/js/scene3d.js'), foley = src('../game/js/sfx/foley.js');
check('animatePersonWalk records heel contacts and turn lean', /footContact\(prevPhase, phase\)/.test(people) && /ud\.footN/.test(people) && /turnLean\(yawRate, s\)/.test(people) && /chest\.rotation\.x \+= ud\.turnLean/.test(people));
check('scene3d hands the contacts to the sound (player and walkers)', /shareFeet\(player, playerMesh\.userData/.test(scene) && /shareFeet\(p, ud, world\.time\)/.test(scene) && /glanceAt\(ud, p, player/.test(scene));
check('foley follows the contacts and keeps the stride counter as a fall-back', /p\.footN !== footSeen/.test(foley) && /ped\.footN !== st\.n/.test(foley) && /e\.kind === 'step' && live/.test(foley) && /tickFoot\(foot, p, dt, footOut\)/.test(foley));
check('gait.js has no imports (pure; no cycle)', !/^import /m.test(src('../game/js/gait.js')));
check('the net snapshot gets no new field for this (docs/COOP-GAST.md)', !/footN|turnLean|gazeT/.test(src('../game/js/coopextra.js')) && !/footN|turnLean|gazeT/.test(src('../game/js/coopstate.js')));

console.log(fails ? `${fails} FAIL` : 'alles ok');
process.exit(fails ? 1 : 0);
