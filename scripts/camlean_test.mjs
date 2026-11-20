// Camera-lean en drift-FOV (#985): game/js/camlean.js. node scripts/camlean_test.mjs
import { makeLean, stepLean, LEAN_MAX, DRIFT_FOV_MAX } from '../game/js/camlean.js';
import { effectsFor } from '../game/js/a11ylogic.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const dt = 1 / 60;
const fx = effectsFor({ reduceMotion: false });
const run = (l, kind, turn, speed, slip, secs, f = fx) => { let a = l.angle ?? 0; for (let t = 0; t < secs; t += dt) { a += turn * dt; stepLean(l, kind, a, speed, slip, dt, f); } return l; };

let l = run(makeLean(), 'car', 1, 25, 0, 1);
check('koers neemt toe (rechtsaf): rol positief, binnen de grens', l.roll > 0.01 && l.roll <= LEAN_MAX.car + 1e-9, l.roll);
l = run(makeLean(), 'car', -1, 25, 0, 1);
check('koers neemt af (linksaf): rol negatief', l.roll < -0.01, l.roll);
l = run(makeLean(), 'bike', 1.1, 18, 0, 1);
check('fiets leunt verder dan auto', l.roll > LEAN_MAX.car, l.roll);
l = run(makeLean(), 'car', 1, 1, 0, 1);
check('stapvoets: geen lean', Math.abs(l.roll) < 0.002, l.roll);
l = run(makeLean(), 'car', 0, 25, 0, 1);
check('rechtdoor: geen lean', l.roll === 0);
l = run(makeLean(), 'car', 1, 25, 0, 1, effectsFor({ reduceMotion: true }));
check('Beweging beperken: lean uit', l.roll === 0 && l.fov === 0);
l = run(makeLean(), 'car', 0, 25, 0.8, 1.5);
check('drift opent de FOV', l.fov > 1 && l.fov <= DRIFT_FOV_MAX, l.fov);
l = run(makeLean(), 'car', 0, 25, 0.8, 1.5, effectsFor({ reduceMotion: true }));
check('Beweging beperken: geen drift-FOV', l.fov === 0);
l = run(makeLean(), 'car', 1, 25, 0.8, 1);
run(l, '', 0, 0, 0, 2);
check('uitstappen: terug naar nul', l.roll === 0 && l.fov === 0 && l.angle === null);
l = makeLean(); stepLean(l, 'car', 3.1, 25, 0, dt, fx); stepLean(l, 'car', -3.1, 25, 0, dt, fx);
check('draaien over de 180-graden-naad is geen schok', Math.abs(l.roll) <= LEAN_MAX.car, l.roll);
check('dt 0 doet niets', stepLean(makeLean(), 'car', 1, 25, 0, 0, fx).roll === 0);

if (bad) { console.log(bad, 'fout(en)'); process.exit(1); }
console.log('camlean_test: ok');
