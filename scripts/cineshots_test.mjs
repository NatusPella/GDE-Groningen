// Logic test for the direction templates (game/js/cineshots.js), the `push` shot of cutscript.js and the
// `cuts` of a mission scene spec (cutscenes_akte1.js missionScene) (#955 #956):
//   node scripts/cineshots_test.mjs
import { SHOT_TEMPLATES, TEMPLATE_NAMES, expandTemplate, placeTemplate, shiftTime, applyShotFix } from '../game/js/cineshots.js';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { missionScene } from '../game/js/cutscenes_akte1.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

ok(TEMPLATE_NAMES.length >= 10, 'ten templates', String(TEMPLATE_NAMES.length));
for (const need of ['tweeshot', 'shotReverse', 'closeGezicht', 'closeHanden', 'insertProp', 'trackIn', 'lageHoek', 'schrikNadering', 'langzameZoom', 'wachtOpReactie']) ok(TEMPLATE_NAMES.includes(need), 'template ' + need);
// time shifting
ok(shiftTime(3, 0.5) === 3.5 && shiftTime('L2', 0.5) === 'L2+0.5' && shiftTime('L2+0.4', 0.5) === 'L2+0.9' && shiftTime('L2-0.5', 0.5) === 'L2' && shiftTime('L2', 0) === 'L2', 'shiftTime');
ok(shiftTime('end', 1) === 'end', 'shiftTime leaves odd specs');

const actors = { a: { look: 'tammo', at: [3, 0.6], face: 180, speaker: 'Tammo' }, b: { look: 'anita', at: [3, -0.6], face: 180, speaker: 'Tessa' } };
const lines = [{ speaker: 'Tammo', text: 'x', at: 1, dur: 3 }, { speaker: 'Tessa', text: 'y', at: 4.2, dur: 3 }];
const sceneWith = (shots) => ({ id: 't', actors, props: {}, cues: [{ t: 0, actor: 'a', anim: 'talk' }, { t: 0, actor: 'b', anim: 'talk' }], shots: [{ t: 0, shot: 'cut', at: [-3, 0, 1.6], look: 'mid:a,b', fov: 40 }, ...shots] });
const A = { x: 0, y: 0, facing: 0, z: 0 };
for (const name of TEMPLATE_NAMES) {
  const shots = placeTemplate(name, { target: 'a', a: 'a', b: 'b' }, 1.5);
  ok(shots.length >= 1 && shots.every((s) => s.t >= 1.5 && s.shot && !('dt' in s)), 'template places shots: ' + name);
  const issues = validateScene(sceneWith(shots), { lines, duration: 9, maxStill: 99, maxShot: 99 });
  ok(!issues.length, 'template validates: ' + name, JSON.stringify(issues));
  const sc = compileScene(sceneWith(shots), { lines, duration: 9 });
  let finite = true;
  for (let t = 1.4; t < 8; t += 0.4) { const c = sc.sample(t, A, null).camera; if (![c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.fov].every(Number.isFinite)) finite = false; }
  ok(finite, 'template samples finite: ' + name);
}
ok(throws(() => expandTemplate('bestaatniet', {})), 'unknown template throws');
ok(throws(() => expandTemplate('trackIn', {})), 'a template without its target throws');
function throws(f) { try { f(); return false; } catch { return true; } }

// the push moves: a track-in comes nearer, a rush accelerates, a zoom changes the lens only
const cam = (name, params, t0 = 1) => { const sc = compileScene(sceneWith(placeTemplate(name, params, t0)), { lines, duration: 9, skipValidate: true }); return (t) => sc.sample(t, A, null).camera; };
const dist = (c, who) => { const p = who === 'a' ? { x: 3, y: 0.6 } : { x: 3, y: -0.6 }; return Math.hypot(c.position.x - p.x, c.position.y - p.y); };
{
  const c = cam('trackIn', { target: 'a' });
  const d0 = dist(c(1.05), 'a'), d1 = dist(c(5), 'a');
  ok(d0 > d1 + 1.0, 'track-in comes nearer', `${d0} -> ${d1}`);
  ok(c(5).fov < c(1.05).fov, 'track-in tightens the lens');
}
{
  const c = cam('schrikNadering', { target: 'a' });
  const mid = dist(c(1 + 0.5 * (9 - 1) / 2), 'a');
  const d0 = dist(c(1.05), 'a'), dEnd = dist(c(8.9), 'a');
  ok(d0 > dEnd, 'the rush ends close', `${d0} -> ${dEnd}`);
  // quadratic ease: at half the shot most of the way is still ahead
  const half = (d0 - mid) / (d0 - dEnd);
  ok(half < 0.45, 'the rush is slow first, fast after', String(half));
}
{
  const c = cam('langzameZoom', { target: 'a' });
  ok(near(dist(c(1.05), 'a'), dist(c(8.9), 'a'), 0.05) && c(8.9).fov < c(1.05).fov - 10, 'a slow zoom keeps the distance and closes the lens');
}
{
  const c = cam('lageHoek', { target: 'a' });
  ok(c(3).position.z < 0.8 && c(3).lookAt.z > 1.2, 'a low angle looks up');
}
{
  const c = cam('closeGezicht', { target: 'a' });
  ok(dist(c(2), 'a') >= 1.5 - 1e-6, 'a close-up stays out of the personal space (long lens instead)', String(dist(c(2), 'a')));
}
{
  // shot-reverse-shot alternates the camera between the two shoulders
  const sh = placeTemplate('shotReverse', { a: 'a', b: 'b' }, 1);
  ok(sh.length === 3 && sh[0].target === 'a' && sh[1].target === 'b' && sh[2].target === 'a', 'shot-reverse-shot alternates');
  const sc = compileScene(sceneWith(sh), { lines, duration: 9, skipValidate: true });
  const c0 = sc.sample(1.5, A, null).camera, c1 = sc.sample(3.8, A, null).camera;
  ok(Math.hypot(c0.position.y - c1.position.y) > 0.5 || Math.hypot(c0.position.x - c1.position.x) > 0.5, 'the camera swaps shoulders');
}
// the validator for push
{
  const bad = (s) => validateScene(sceneWith([{ t: 1, shot: 'push', ...s }]), { lines, duration: 9, maxStill: 99, maxShot: 99 }).length > 0;
  ok(bad({}), 'push without target is an error');
  ok(bad({ target: 'a', d0: 0.1 }), 'push closer than 0,5 m is an error');
  ok(bad({ target: 'a', fov1: 5 }), 'push fov outside 14-90 is an error');
  ok(bad({ target: 'a', ease: 'bounce' }), 'push with an unknown ease is an error');
  ok(!bad({ target: 'a', d0: 4, d1: 2, fov0: 40, fov1: 30, ease: 'in' }), 'a good push validates');
}

// a mission scene spec with `cuts`: the templates replace the automatic coverage in their range, order stays strictly rising
{
  const looks = { npc: { name: 'Berend Bos', shirt: 0x808080, skin: 0xd0a080 } };
  const L = [];
  let t = 0.6;
  for (const [sp, tx] of [['Berend Bos', 'Eerste regel hier, lang genoeg.'], ['Tammo', 'Tweede regel hier, ook lang genoeg.'], ['Anita', 'Derde regel hier, nog langer dan eerst.'], ['Berend Bos', 'Vierde regel hier voor het slot van de scène.']]) { L.push({ speaker: sp, text: tx, at: t, dur: 3.4 }); t += 3.5; }
  const spec = { cast: { npc: { key: 'npc', at: [3, 0.2], face: 180 } }, props: {}, open: [], beats: [], shots: [], wide: { from: [-4, 3, 3], to: [-3, 2, 2.4], look: 'mid:npc,tessa@1', fov: 48, until: 1 }, cuts: [{ on: 1, tpl: 'shotReverse', a: 'npc', b: 'tammo', beats: [0, 1.6] }, { on: 'Derde regel', dt: 0.2, tpl: 'schrikNadering', target: 'tessa' }, { on: 'Onbekend', tpl: 'trackIn', target: 'tessa' }] };
  const def = missionScene('X', L, { looks, spec });
  ok(!!def, 'a spec with cuts compiles');
  const has = (tp) => def.shots.some((s) => s.shot === tp);
  ok(has('ots') && has('push'), 'the template shots are in the scene');
  const issues = validateScene(def, { lines: L, duration: t + 1 });
  ok(!issues.length, 'the scene with cuts validates', JSON.stringify(issues));
  const sc = compileScene(def, { lines: L, duration: t + 1 });
  const ts = sc.shots.map((s) => s.t);
  ok(ts.every((v, i) => i === 0 || v > ts[i - 1]), 'shot times strictly rise');
  const pushAt = sc.shots.find((s) => s.shot === 'push');
  ok(pushAt && near(pushAt.t, L[2].at + 0.2, 0.01), 'the push starts where it was put');
  ok(!sc.shots.some((s) => s.shot !== 'push' && s.t > pushAt.t - 0.01 && s.t < pushAt.t + 2.5), 'the template owns its range');
}

// shotFix (as-sprongen hersteld): vervangt de shot met dezelfde t, een tweede met dezelfde t pas bij een tweede fix
{
  const shots = [{ t: 0, shot: 'dolly' }, { t: 'L1', shot: 'cut', at: [1, 2, 1.5] }, { t: 'L2', shot: 'cut', at: [3, 4, 1.5] }];
  const nFix = applyShotFix(shots, [{ t: 'L1', shot: 'cut', at: [1, -2, 1.5] }, { t: 'L9', shot: 'cut', at: [0, 0, 1] }]);
  ok(nFix === 1, 'applyShotFix telt alleen de gevonden shots');
  ok(shots[1].at[1] === -2 && shots[2].at[1] === 4 && shots.length === 3, 'applyShotFix vervangt alleen de shot met die t');
  ok(applyShotFix(shots, null) === 0, 'applyShotFix zonder fix doet niets');
}

if (fails) { console.log(`cineshots_test: ${fails} of ${n} checks FAILED`); process.exit(1); }
console.log(`cineshots_test: ${n} checks ok`);
