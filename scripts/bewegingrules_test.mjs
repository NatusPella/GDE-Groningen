// Fietstrucs en standen (#207): game/js/bewegingrules.js, plus de nieuwe animaties in actoranim.js.
//   node scripts/bewegingrules_test.mjs
import { WHEELIE, HOP, createWheelie, stepWheelie, wheelieMeters, zwemStand, klimStand, sprongStand, newStand, fietsHouding, HANDS } from '../game/js/bewegingrules.js';
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

// het sprongetje: de rem kort aantikken met Ctrl vast
const tap = (secs, i = {}) => { const q = createWheelie(); let hops = 0, frames = 0; const dt = 1 / 60; const f = (brake, n, extra = {}) => { for (let k = 0; k < n; k++) { stepWheelie(q, { dt, trick: true, throttle: 0, speed: 5, top: 7, brake, ...i, ...extra }); if (q.hop) { hops++; frames = k + 1; } } }; f(1, Math.round(secs / dt)); f(0, 10); return { q, hops, frames }; };
let r = tap(0.1);
check('rem kort aantikken: één sprongetje', r.hops === 1 && r.q.hops === 1, r.hops);
r = tap(0.5);
check('rem lang vasthouden: geen sprongetje (stoppie)', r.hops === 0);
r = tap(0.1, { speed: 1 });
check('te langzaam: geen sprongetje', r.hops === 0);
r = tap(0.1, { trick: false });
check('zonder Ctrl: geen sprongetje', r.hops === 0);
r = tap(0.1, { airborne: true });
check('in de lucht: geen sprongetje', r.hops === 0);
{ const q = createWheelie(); let n = 0; for (let k = 0; k < 6; k++) { for (let j = 0; j < 5; j++) { stepWheelie(q, { dt: 1 / 60, trick: true, speed: 5, top: 7, brake: 1 }); } stepWheelie(q, { dt: 1 / 60, trick: true, speed: 5, top: 7, brake: 0 }); if (q.hop) n++; }
  check('na een sprongetje even rust (cooldown)', n === 1, n); }
check('sprong is klein en veilig', HOP.vz > 2 && HOP.vz < 4.5 && HOP.vz < 7);

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

// zonder handen: Ctrl vast, trappen boven de wheelie-snelheid, rechtdoor
{
  const fast = { trick: true, throttle: 1, speed: 6, top: 7, steer: 0 };
  const h = createWheelie();
  run(h, 1, fast);
  check('zonder handen: handen omhoog', h.hands > 0.95 && h.pitch === 0, h.hands);
  check('zonder handen: tijd telt', h.handsT > 0.5 && h.handsBest >= h.handsT);
  run(h, 0.5, { ...fast, steer: 0.8 });
  check('bocht: stuur weer vast', h.hands < 0.05, h.hands);
  run(h, 0.6, fast);
  run(h, 0.5, { ...fast, trick: false });
  check('Ctrl los: stuur weer vast', h.hands < 0.05);
  run(h, 0.6, fast);
  run(h, 0.5, { ...fast, brake: 1 });
  check('remmen: stuur weer vast', h.hands < 0.05);
  const l = createWheelie();
  run(l, 1, { ...fast, speed: 4 });
  check('in het wheelie-bereik: geen handsfree', l.hands === 0 && l.up);
  const a = createWheelie();
  run(a, 1, { ...fast, airborne: true });
  check('in de lucht: geen handsfree', a.hands === 0);
  const z = createWheelie();
  run(z, 1, { ...fast, throttle: 0 });
  check('zonder trappen: geen handsfree', z.hands === 0);
  const q = createWheelie();
  run(q, 1, { trick: true, throttle: 1, speed: 6, top: 7, steer: NaN });
  check('rare stuurwaarde blijft heel', Number.isFinite(q.hands));
  check('HANDS redelijk', HANDS.steer > 0 && HANDS.steer < 0.6);
}

// de houding van de fietser
{
  const rest = fietsHouding(createWheelie(), 0.85);
  check('rust: stuurhouding', rest.lean === 0 && rest.armZ === 0.85 && rest.armX === 0, JSON.stringify(rest));
  const w = createWheelie(); run(w, 1, go);
  const wh = fietsHouding(w, 0.85);
  check('wheelie: achterover en armen gestrekt', wh.lean > 0.2 && wh.armZ > 1 && wh.armX === 0, JSON.stringify(wh));
  const n = createWheelie(); run(n, 0.8, { trick: true, throttle: 0, brake: 1, speed: 5, top: 7 });
  check('stoppie: voorover', fietsHouding(n, 0.85).lean < -0.1);
  const f = createWheelie(); run(f, 1, { trick: true, throttle: 1, speed: 6, top: 7, steer: 0 });
  const fh = fietsHouding(f, 0.85);
  check('zonder handen: armen omhoog en open', fh.armZ > 2.6 && fh.armX > 0.4, JSON.stringify(fh));
  const o = { lean: 9, armZ: 9, armX: 9 };
  check('eigen uit-object wordt gebruikt', fietsHouding(f, 0.85, o) === o && o.armZ === fh.armZ);
  check('rare staat blijft heel', Object.values(fietsHouding({ pitch: NaN, hands: undefined }, 0.85)).every((v) => Number.isFinite(v)));
}

// standen schrijven in een eigen uit-object zonder iets nieuws te maken
{
  const o = newStand();
  check('zwemstand in eigen object', zwemStand(1.3, o) === o && JSON.stringify(o) === JSON.stringify(zwemStand(1.3)));
  check('klimstand in eigen object', klimStand(0.7, o) === o && JSON.stringify(o) === JSON.stringify(klimStand(0.7)));
  check('sprongstand in eigen object', sprongStand(0.4, o) === o && JSON.stringify(o) === JSON.stringify(sprongStand(0.4)));
  const pose = { armL: { x: 0.1, z: 0, e: 0 }, armR: { x: -0.1, z: 0, e: 0 }, legL: { z: 0, k: 0 }, legR: { z: 0, k: 0 }, chest: { x: 0.3, y: 0.2, z: 0 }, head: { x: 1, y: 2, z: 3 } };
  zwemStand(0.5, pose);
  check('stand in een hele pose laat de rest met rust', pose.armL.x === 0.1 && pose.chest.x === 0.3 && pose.head.z === 3 && pose.armL.z > 1);
}

console.log(bad ? `${bad} mislukt` : 'bewegingrules_test: alles goed');
process.exit(bad ? 1 : 0);
