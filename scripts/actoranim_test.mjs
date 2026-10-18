// Cutscene-acteuranimatie (game/js/actoranim.js): gebaren-planning, lopen,
// zitten, kijkrichting, reacties, routines en het stage-contract.
//   node scripts/actoranim_test.mjs
import { createStage, planGestures, pointAt, pathLength, applyPose, wrapAngle, makeRng, REACTIONS, HIP_Y, SEAT_CONTACT } from '../game/js/actoranim.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const bone = () => ({ rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } });
const mkMesh = () => ({ position: bone().position, rotation: { y: 0 }, userData: Object.fromEntries(['pelvis', 'chest', 'head', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR'].map((k) => [k, bone()])) });
const run = (stage, secs, dt = 1 / 30) => { for (let t = 0; t < secs; t += dt) stage.update(dt); };
const allFinite = (o) => Object.values(o).every((v) => (typeof v === 'number' ? Number.isFinite(v) : v && typeof v === 'object' ? allFinite(v) : true));

// helpers
check('wrapAngle', Math.abs(Math.abs(wrapAngle(3 * Math.PI)) - Math.PI) < 1e-9);
const r1 = makeRng(5), r2 = makeRng(5);
check('rng deterministisch', r1() === r2());
const path = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }];
check('pathLength', pathLength(path) === 20);
check('pointAt midden', pointAt(path, 15).x === 10 && pointAt(path, 15).z === 5);
check('pointAt voorbij einde', pointAt(path, 99).z === 10);

// gebaren
const tekst = 'Zeg, wat dacht jij daarvan? Dat is toch gek!';
const g1 = planGestures(tekst, 6, 3);
check('gebaren bestaan', g1.length >= 3, g1.length);
check('gebaren binnen regel', g1.every((b) => b.t >= 0 && b.t < 6), JSON.stringify(g1));
check('gebaren niet te dicht op elkaar', g1.every((b, i) => i === 0 || b.t - g1[i - 1].t >= 0.9));
check('gebaren deterministisch', JSON.stringify(g1) === JSON.stringify(planGestures(tekst, 6, 3)));
check('korte regel geen gebaren', planGestures('Hoi', 0.3).length === 0);
check('rare invoer', planGestures(undefined, NaN).length === 0);

// lopen
const st = createStage({ seed: 1 });
st.add('tammo', { x: 0, z: 0, heading: 0 });
st.add('tessa', { x: 4, z: 0, heading: Math.PI });
check('onbekende acteur', st.cue('niemand', 'kijk', {}) === false);
check('onbekend commando', st.cue('tammo', 'dans', {}) === false);
st.cue('tammo', 'loop', { pad: [{ x: 5, z: 0 }, { x: 5, z: 5 }], snelheid: 2 });
run(st, 1);
check('loopt', st.get('tammo').x > 0.5 && st.get('tammo').mode === 'lopen', st.get('tammo').x);
let amp = 0;
for (let t = 0; t < 1; t += 1 / 30) { st.update(1 / 30); amp = Math.max(amp, Math.abs(st.pose('tammo').legL.z)); }
check('beenzwaai tijdens lopen', amp > 0.1, amp);
run(st, 8);
check('aangekomen', Math.abs(st.get('tammo').x - 5) < 1e-6 && Math.abs(st.get('tammo').z - 5) < 1e-6);
check('event aangekomen', st.drain().some((e) => e.id === 'tammo' && e.event === 'aangekomen'));
check('drain leegt', st.drain().length === 0);
check('draait mee met pad', Math.abs(wrapAngle(st.get('tammo').heading - Math.PI / 2)) < 0.3, st.get('tammo').heading);
run(st, 2);
check('staat weer stil', Math.abs(st.pose('tammo').legL.z) < 0.1);

// praten + kijken
const s2 = createStage({ seed: 2 });
s2.add('a', { x: 0, z: 0, heading: 0 });
s2.add('b', { x: 0, z: 5, heading: 0 });
s2.cue('a', 'praat', { duur: 8, tekst: 'Zeg, wat dacht jij daarvan? Het is gek, ja, echt waar. Kom op!', tot: 'b' });
let maxArm = 0;
for (let t = 0; t < 8; t += 1 / 30) { s2.update(1 / 30); const p = s2.pose('a'); maxArm = Math.max(maxArm, p.armR.z, p.armL.z); }
check('gebaar tilt een arm', maxArm > 0.7, maxArm);
check('spreker draait naar luisteraar', Math.abs(wrapAngle(s2.get('a').heading - Math.PI / 2)) < 0.5, s2.get('a').heading);
check('luisteraar kijkt naar spreker', s2.get('b').gaze && s2.get('b').gaze.actor === s2.get('a'));
run(s2, 1);
check('klaar-met-praten', s2.drain().some((e) => e.id === 'a' && e.event === 'klaar-met-praten'));
check('praten stopt', s2.get('a').talk === null);

// zitten
const s3 = createStage({ seed: 3 });
s3.add('z', { x: 0, z: 0, heading: 0, groundY: 0 });
s3.cue('z', 'zit', { x: 1, z: 0, heading: 0, zithoogte: 0.5 });
run(s3, 1.5);
const sp = s3.pose('z');
check('zit: hoogte', Math.abs(sp.y - (0.5 - SEAT_CONTACT)) < 1e-6, sp.y);
check('zit: benen naar voren', sp.legL.z > 1.2);
check('zit: positie bij stoel', Math.abs(s3.get('z').x - 1) < 1e-6);
s3.cue('z', 'sta');
run(s3, 1.5);
check('staat weer op de grond', Math.abs(s3.pose('z').y) < 1e-6 && s3.get('z').mode === 'staan');
check('events zit/sta', s3.drain().map((e) => e.event).join() === 'gaat-zitten,staat');
s3.cue('z', 'zit', {});
s3.cue('z', 'loop', { pad: [{ x: 3, z: 0 }] });
run(s3, 5);
check('lopen vanuit zitten', Math.abs(s3.get('z').x - 3) < 0.05 && s3.get('z').sit === 0, s3.get('z').x);

// reacties
for (const kind of Object.keys(REACTIONS)) {
  const s = createStage({ seed: 4 });
  s.add('r', {});
  check('reactie ' + kind, s.cue('r', 'reageer', { soort: kind }));
  const base = JSON.stringify([s.pose('r').armR, s.pose('r').head]);
  let moved = false, fin = true;
  for (let t = 0; t < REACTIONS[kind].dur + 0.5; t += 1 / 30) {
    s.update(1 / 30);
    if (!allFinite(s.pose('r'))) fin = false;
    if (JSON.stringify([s.pose('r').armR, s.pose('r').head]) !== base) moved = true;
  }
  check('reactie eindig ' + kind, fin);
  check('reactie beweegt ' + kind, moved);
  check('reactie-klaar ' + kind, s.drain().some((e) => e.event === 'reactie-klaar'));
}
const sx = createStage();
sx.add('x');
check('onbekende reactie', sx.cue('x', 'reageer', { soort: 'boos' }) === false);

// idle-variatie
const s5 = createStage({ seed: 5 });
s5.add('i', {});
const seen = new Set(), heads = [];
for (let t = 0; t < 60; t += 0.1) { s5.update(0.1); seen.add(Math.round(s5.pose('i').armL.e * 5)); heads.push(s5.pose('i').head.y); }
check('idle wisselt houding', seen.size >= 3, [...seen].join());
check('idle kijkt rond', Math.max(...heads) - Math.min(...heads) > 0.2);
check('idle blijft beperkt', Math.max(...heads.map(Math.abs)) < 1.0);

// omstanders
const s6 = createStage({ seed: 6 });
s6.add('p1', { x: 0, z: 0 });
s6.add('p2', { x: 2, z: 0, heading: Math.PI });
s6.cue('p1', 'routine', { naam: 'kletsen', met: 'p2' });
s6.cue('p2', 'routine', { naam: 'wachten' });
let talked = 0, talked2 = 0;
for (let t = 0; t < 30; t += 1 / 30) { s6.update(1 / 30); if (s6.get('p1').talk) talked++; if (s6.get('p2').talk) talked2++; }
check('kletsen: p1 praat af en toe', talked > 30 && talked < 800, talked);
s6.add('w', { x: 0, z: 10 });
s6.cue('w', 'routine', { naam: 'patrouille', pad: [{ x: 0, z: 10 }, { x: 6, z: 10 }], snelheid: 1.5 });
let minX = 99, maxX = -99;
for (let t = 0; t < 60; t += 1 / 30) { s6.update(1 / 30); minX = Math.min(minX, s6.get('w').x); maxX = Math.max(maxX, s6.get('w').x); }
check('patrouille loopt heen en weer', maxX > 5.5 && minX < 0.5, minX + ' ' + maxX);
check('routine onbekend', s6.cue('w', 'routine', { naam: 'dansen' }) === false);
check('stil stopt', s6.cue('w', 'stil') && s6.get('w').routine === null);

// applyPose
const mesh = mkMesh();
check('applyPose zonder rig', applyPose({}, s5.pose('i')) === false);
check('apply op mesh', s5.apply('i', mesh) && mesh.userData.pelvis.position.y <= HIP_Y + 1e-9);
check('apply zet heading', mesh.rotation.y === -s5.pose('i').heading);

// robuustheid
const s7 = createStage({ seed: 7 });
s7.add('n', {});
s7.cue('n', 'praat', { duur: NaN });
s7.cue('n', 'loop', { pad: [{ x: NaN, z: 1 }] });
s7.cue('n', 'kijk', { naar: { x: NaN, z: NaN } });
for (const dt of [0, -1, NaN, 5, 0.016]) s7.update(dt);
check('eindig na rare invoer', allFinite(s7.pose('n')));

console.log(bad ? `${bad} MISLUKT` : 'actoranim: alles ok');
process.exit(bad ? 1 : 0);
