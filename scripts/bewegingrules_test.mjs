// Fietstrucs en standen (#207): game/js/bewegingrules.js, plus de nieuwe animaties in actoranim.js.
//   node scripts/bewegingrules_test.mjs
import { WHEELIE, createWheelie, stepWheelie, wheelieMeters, zwemStand, klimStand, sprongStand } from '../game/js/bewegingrules.js';
import { ANIMS, animateActor } from '../game/js/actoranim.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const run = (s, secs, i, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) stepWheelie(s, { dt, ...i }); return s; };
const go = { trick: true, throttle: 1, speed: 4, top: 7 };

let s = createWheelie();
run(s, 1, go);
check('wheelie komt omhoog', s.up && s.pitch > 0.4, s.pitch);
check('trager door de wheelie', s.slow < 1 && s.slow > 0.9);
run(s, 0.2, { ...go, trick: false });
check('loslaten: voorwiel zakt', s.pitch < 0.35);
run(s, 1, { ...go, trick: false });
check('voorwiel weer op de grond', s.pitch === 0 && !s.up && s.slow === 1);
check('afstand onthouden', wheelieMeters(s) > 3, wheelieMeters(s));

s = createWheelie(); run(s, 1, { ...go, speed: 1 });
check('te langzaam: geen wheelie', s.pitch === 0);
s = createWheelie(); run(s, 1, { ...go, speed: 6 });
check('te snel: geen wheelie', s.pitch === 0);
s = createWheelie(); run(s, 1, { ...go, throttle: 0 });
check('zonder trappen: geen wheelie', s.pitch === 0);
s = createWheelie(); run(s, 1, { ...go, speed: -4 });
check('achteruit telt als snelheid', s.up === true);

s = createWheelie(); run(s, WHEELIE.holdMax + 1, go);
check('balans kwijt: voorwiel zakt en blijft omlaag zolang Ctrl vast is', s.lost && s.pitch < 0.05, s.pitch);
run(s, 0.3, { ...go, trick: false });
check('opnieuw proberen na loslaten', !s.lost && (run(s, 0.8, go), s.up));

s = createWheelie(); stepWheelie(s, {}); stepWheelie(s, { trick: true, throttle: 1, speed: NaN, dt: NaN, top: NaN });
check('rare invoer blijft heel', Number.isFinite(s.pitch) && Number.isFinite(s.slow));
s = createWheelie(); run(s, 2, go);
check('pitch nooit boven de grens', s.pitch <= WHEELIE.pitch + 1e-9);

const finite = (o) => Object.values(o).every((v) => (typeof v === 'number' ? Number.isFinite(v) : finite(v)));
for (const [n, f] of [['zwem', zwemStand], ['klim', klimStand]]) {
  for (let t = 0; t < 6; t += 0.1) check(`${n}stand eindig`, finite(f(t)));
}
check('sprongstand begint en eindigt in rust', sprongStand(0).legL.k === 0 && Math.abs(sprongStand(1).legL.k) < 1e-9 && sprongStand(0.5).legL.k > 1);
check('sprongstand knipt p af', finite(sprongStand(-3)) && finite(sprongStand(NaN)) && finite(sprongStand(9)));
check('zwemmen ligt plat', zwemStand(0).chest.z < 0);

// de acteur
for (const a of ['zwem', 'klim', 'sprong']) check('ANIMS bevat ' + a, ANIMS.includes(a));
const bone = () => ({ rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } });
const mkMesh = () => ({ position: bone().position, rotation: { y: 0 }, userData: Object.fromEntries(['pelvis', 'chest', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR'].map((k) => [k, bone()])) });
for (const a of ['zwem', 'klim', 'sprong']) {
  const m = mkMesh();
  let ok = true;
  for (let t = 0; t < 3; t += 1 / 30) ok = animateActor(m, { anim: a, speed: 1, dt: 1 / 30, t }) && ok;
  const r = Object.values(m.userData).every((b) => [b.rotation.x, b.rotation.y, b.rotation.z].every(Number.isFinite));
  check(`animateActor ${a}`, ok && r);
}
const sw = mkMesh(), idle = mkMesh();
for (let t = 0; t < 1; t += 1 / 30) { animateActor(sw, { anim: 'zwem', dt: 1 / 30, t }); animateActor(idle, { anim: 'idle', dt: 1 / 30, t }); }
check('zwemmen ziet er anders uit dan staan', JSON.stringify(sw.userData.armL.rotation) !== JSON.stringify(idle.userData.armL.rotation));

// stoppie: Ctrl + remmen, achterwiel omhoog, niet voor altijd en niet te langzaam
{
  const n = createWheelie();
  run(n, 0.8, { trick: true, throttle: 0, brake: 1, speed: 5, top: 7 });
  check('stoppie: nuk omlaag', n.nose && n.pitch < -0.2, n.pitch);
  check('stoppie is geen wheelie', !n.up);
  run(n, 3, { trick: true, throttle: 0, brake: 1, speed: 5, top: 7 });
  check('stoppie zakt vanzelf terug', !n.nose && Math.abs(n.pitch) < 0.05, n.pitch);
  const l = createWheelie();
  run(l, 1, { trick: true, throttle: 0, brake: 1, speed: 2, top: 7 });
  check('te langzaam voor een stoppie', !l.nose && l.pitch === 0);
  const z = createWheelie();
  run(z, 1, { trick: false, throttle: 0, brake: 1, speed: 5, top: 7 });
  check('zonder Ctrl geen stoppie', !z.nose && z.pitch === 0);
}

console.log(bad ? `${bad} mislukt` : 'bewegingrules_test: alles goed');
process.exit(bad ? 1 : 0);
