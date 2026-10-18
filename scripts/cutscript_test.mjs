// Logic test for the cutscene direction language (game/js/cutscript.js) and the
// scenes in game/js/cutscenes.js, on the real script lines of the opening:
//   node scripts/cutscript_test.mjs
import { readFileSync } from 'node:fs';
import { compileScene, validateScene, resolveTime, fitCamera, fitAnchor, ACTOR_ANIMS } from '../game/js/cutscript.js';
import { ANIMS } from '../game/js/actoranim.js';
import { OPENING, END_CARD, flatScene } from '../game/js/cutscenes.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// the opening's lines as story.js times them (reading time, no recordings here)
const data = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const lines = [];
let at = 1.2;
for (const id of ['C00.1', 'C00.2', 'C00.3']) {
  for (const l of data.scenes.find((s) => s.id === id).lines) {
    if (l.channel === 'app-stil') continue;
    const dur = Math.max(1.8, l.text.length / 13);
    lines.push({ speaker: l.voice || l.speaker, text: l.text, at, dur });
    at += dur + 0.12;
  }
  at += 0.9;
}
const duration = at + 1;

ok(resolveTime(3, lines, duration) === 3, 'plain seconds');
ok(Math.abs(resolveTime('L2+1.5', lines, duration) - (lines[2].at + 1.5)) < 1e-9, 'line plus offset');
ok(resolveTime('L99', lines, duration) === null, 'unknown line is null');
ok(resolveTime('end', lines, duration) === duration, 'end');

// the shipped scenes are valid: no broken refs, no standing around, no dull shot
const issues = validateScene(OPENING, { lines, duration });
ok(issues.length === 0, 'opening validates', issues.join(' | '));
const issues2 = validateScene(END_CARD, { duration: 6.5 });
ok(issues2.length === 0, 'end card validates', issues2.join(' | '));

// sampling is finite and deterministic over the whole scene
const anchor = { x: 1000, y: -500, facing: 0.7, z: 0 };
const opening = compileScene(OPENING, { lines, duration });
let finite = true, same = true, maxStep = 0, prev = null;
for (let t = 0; t <= duration; t += 0.1) {
  const s = opening.sample(t, anchor), s2 = opening.sample(t, anchor);
  if (JSON.stringify(s) !== JSON.stringify(s2)) same = false;
  const c = s.camera;
  for (const v of [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov]) if (!Number.isFinite(v)) finite = false;
  for (const a of Object.values(s.actors)) for (const v of [a.x, a.y, a.a, a.gaze, a.speed]) if (!Number.isFinite(v)) finite = false;
  for (const p of Object.values(s.props)) for (const v of [p.x, p.y, p.h, p.a]) if (!Number.isFinite(v)) finite = false;
  // the camera stays near the set (no shot flying off into the map)
  if (Math.hypot(c.position.x - anchor.x, c.position.y - anchor.y) > 60) finite = false;
  if (prev) for (const [id, a] of Object.entries(s.actors)) if (id !== 'fietser' && id !== 'fietsster') maxStep = Math.max(maxStep, Math.hypot(a.x - prev.actors[id].x, a.y - prev.actors[id].y));
  prev = s;
}
ok(finite, 'all samples finite and near the set');
ok(same, 'sampling is deterministic');
ok(maxStep < 0.35, 'walkers move smoothly (max 0.1 s step)', String(maxStep));

// the story happens: people move, props move, the camera changes shot
const at0 = opening.sample(0.5, anchor), atEnd = opening.sample(duration - 0.5, anchor);
ok(Math.hypot(at0.actors.tammo.x - atEnd.actors.tammo.x, at0.actors.tammo.y - atEnd.actors.tammo.y) > 5, 'Tammo ends elsewhere');
ok(at0.props.matras.visible === false && atEnd.props.matras.visible === true, 'the matras appears on the roof');
const shotsSeen = new Set();
for (let t = 0; t < duration; t += 0.25) shotsSeen.add(opening.sample(t, anchor).camera.shotIndex);
ok(shotsSeen.size >= 15, 'the camera varies', String(shotsSeen.size));

// speakers: the speaking actor talks
const tl = lines.findIndex((l) => l.speaker === 'Tammo');
const s = opening.sample(lines[tl].at + 0.8, anchor);
ok(s.speakerActor === 'tammo' && s.actors.tammo.speaking, 'Tammo speaks on his line');
const s6 = opening.sample(lines[6].at + 0.5, anchor);
ok(s6.speakerActor === 'tessa', 'Tessa (voice key Anita) speaks on line 6');

// carrying: a carried prop rides along, a dropped prop stays
const carried = opening.sample(lines[4].at + 1.0, anchor);
ok(carried.actors.tammo.carrying === 'doos' && Math.hypot(carried.props.doos.x - carried.actors.tammo.x, carried.props.doos.y - carried.actors.tammo.y) < 0.6, 'the box rides with Tammo');
const d1 = opening.sample(lines[7].at, anchor).props.doos, d2 = opening.sample(lines[20].at, anchor).props.doos;
ok(Math.hypot(d1.x - d2.x, d1.y - d2.y) < 1e-6, 'a dropped box stays put');
// the cyclists ride, not walk
ok(opening.sample(2, anchor).actors.fietser.anim === 'ride', 'cyclists ride');

// the validator catches broken scenes
const bad = (patch, what) => {
  const def = JSON.parse(JSON.stringify({ ...END_CARD, ...patch }));
  ok(validateScene(def, { duration: 6.5 }).length > 0, 'validator rejects: ' + what);
};
bad({ cues: [{ t: 1, actor: 'nobody', anim: 'wave' }] }, 'unknown actor');
bad({ cues: [{ t: 1, actor: 'tammo', anim: 'moonwalk' }] }, 'unknown anim');
bad({ cues: [{ t: 99, actor: 'tammo', anim: 'wave' }] }, 'time outside the scene');
bad({ cues: [{ t: 'L4', actor: 'tammo', anim: 'wave' }] }, 'line reference without lines');
bad({ cues: [{ t: 1, actor: 'tammo', walk: [[1, 1]], speed: 0 }] }, 'zero speed');
bad({ cues: [{ t: 1, actor: 'tammo' }] }, 'cue without verb');
bad({ shots: [] }, 'no shots');
bad({ shots: [{ t: 1, shot: 'cut', at: [0, 0, 1], look: 'tammo' }] }, 'first shot not at 0');
bad({ shots: [{ t: 0, shot: 'cut', at: [0, 0, 1], look: 'ghost' }] }, 'unknown look target');
bad({ shots: [{ t: 0, shot: 'orbit', target: 'tammo', radius: 0.1 }] }, 'orbit too tight');
bad({ shots: [{ t: 0, shot: 'zoom' }] }, 'unknown shot type');
bad({ props: { x: { kind: 'raket', at: [0, 0] } } }, 'unknown prop kind');
// a person standing around too long and a dull long shot are flagged
const still = { id: 's', actors: { a: { look: 'tammo', at: [0, 0], face: 0 } }, shots: [{ t: 0, shot: 'cut', at: [3, 0, 1.6], look: 'a' }] };
const sv = validateScene(still, { duration: 20 });
ok(sv.some((m) => /staat .* stil/.test(m)) && sv.some((m) => /zonder camerabeweging/.test(m)), 'idle person and static long shot are flagged', sv.join('|'));
let threw = false;
try { compileScene(still, { duration: 20 }); } catch (e) { threw = true; }
ok(threw, 'compileScene throws on a flagged scene');

// evenings at home: generated from the lines, valid for any length, with real movement
for (const variant of ['eikea', 'wachten', 'avond']) {
  for (const n of [3, 8, 9, 14]) {
    const ls = [];
    let a = 2.2;
    for (let i = 0; i < n; i++) { const dur = 2 + (i % 3); ls.push({ speaker: ['Anita', 'Tammo', 'Henk'][i % 3 === 2 && i % 2 ? 2 : i % 2], text: 'x', at: a, dur }); a += dur + 0.25; }
    const dur2 = a + 0.4;
    const iss = validateScene(flatScene(variant, ls), { lines: ls, duration: dur2 });
    ok(iss.length === 0, `flatScene ${variant} (${n} regels) valideert`, iss.join(' | '));
    if (n === 14) {
      const sc = compileScene(flatScene(variant, ls), { lines: ls, duration: dur2 });
      let moved = 0, p0 = null;
      for (let t = 0; t <= dur2; t += 0.2) { const s = sc.sample(t, anchor); if (p0) for (const k of ['tammo', 'tessa']) moved += Math.hypot(s.actors[k].x - p0.actors[k].x, s.actors[k].y - p0.actors[k].y); p0 = s; }
      ok(moved > 4, `flatScene ${variant}: mensen lopen`, String(moved));
    }
  }
}

// the animation layer speaks the names the language validates against
ok(ACTOR_ANIMS.length === ANIMS.length && ACTOR_ANIMS.every((a) => ANIMS.includes(a)), 'ACTOR_ANIMS equals actoranim ANIMS');

// no clipping (#149): a synthetic building 10 x 10 m, 8 m high, next to the anchor
{
  const solid = (x, y, z) => x > 1.5 && x < 11.5 && y > -5 && y < 5 && z < 8;
  const env = { solid };
  // a camera in the wall moves out, towards what it looks at
  const c = fitCamera({ x: 6, y: 0, z: 1.6 }, { x: -2, y: 0, z: 1.4 }, env);
  ok(!solid(c.x, c.y, c.z), 'a camera inside a building is moved to free space', JSON.stringify(c));
  ok(fitCamera({ x: -3, y: 0, z: 1.6 }, { x: -2, y: 0, z: 1.4 }, env).x === -3, 'a free camera stays');
  // the opening scene faces the building: the anchor turns away until nothing stands in the wall
  const sc = compileScene(OPENING, { lines, duration });
  const a0 = { x: 0, y: 0, facing: 0, z: 0 };
  const count = (a) => { let bad = 0; for (let t = 0; t <= duration; t += 0.6) { const s2 = sc.sample(t, a); for (const o of Object.values(s2.actors)) if (solid(o.x, o.y, 0.9)) bad++; } return bad; };
  const a1 = fitAnchor(sc, a0, env);
  ok(count(a0) > 0, 'test setup: the unturned opening stands in the building', String(count(a0)));
  ok(count(a1) < count(a0) && a1.facing !== a0.facing, 'fitAnchor turns the scene away from the building', count(a1) + ' vs ' + count(a0));
  ok(fitAnchor(sc, a1, { solid: () => false }).facing === a1.facing, 'a clean anchor is left alone');
  // every sampled camera is outside the building once the env is passed
  let clipped = 0;
  for (let t = 0; t <= duration; t += 0.2) { const c2 = sc.sample(t, a0, env).camera.position; if (solid(c2.x, c2.y, c2.z)) clipped++; }
  ok(clipped === 0, 'sampled cameras never stand in the building', String(clipped));

  // the flat upstairs: a 12 x 9 m box, people and camera stay inside it, the camera above the cutaway
  const W = 12, D = 9, floor = 34, above = 2.4;
  const clamp = (x, y, z, kind) => {
    const m = kind === 'camera' ? 0.45 : 0.6;
    return { x: Math.max(m, Math.min(W - m, x)), y: Math.max(m, Math.min(D - m, y)), z: kind === 'camera' ? Math.max(z, floor + above) : z };
  };
  const flatEnv = { clamp };
  const flatAnchor = { x: 3.4, y: 2.8, facing: 0, z: floor };
  for (const variant of ['eikea', 'wachten', 'avond']) {
    const ls = [];
    let at2 = 2.2;
    for (let i = 0; i < 14; i++) { const dur = 2 + (i % 3); ls.push({ speaker: ['Anita', 'Tammo', 'Henk'][i % 3 === 2 && i % 2 ? 2 : i % 2], text: 'x', at: at2, dur }); at2 += dur + 0.25; }
    const dur2 = at2 + 0.4;
    const fs2 = compileScene(flatScene(variant, ls), { lines: ls, duration: dur2 });
    let outside = 0, low = 0;
    for (let t = 0; t <= dur2; t += 0.2) {
      const s3 = fs2.sample(t, flatAnchor, flatEnv);
      for (const o of Object.values(s3.actors)) if (o.x < 0.5 || o.x > W - 0.5 || o.y < 0.5 || o.y > D - 0.5) outside++;
      const c3 = s3.camera.position;
      if (c3.x < 0.4 || c3.x > W - 0.4 || c3.y < 0.4 || c3.y > D - 0.4) outside++;
      if (c3.z < floor + above - 1e-9) low++;
    }
    ok(outside === 0, `flat ${variant}: people and camera stay inside the walls`, String(outside));
    ok(low === 0, `flat ${variant}: the camera stays above the cutaway`, String(low));
    // and without the env the old poses did leave the box (the bug of #149)
    let leaked = 0;
    for (let t = 0; t <= dur2; t += 0.2) { const c4 = fs2.sample(t, flatAnchor).camera.position; if (c4.x < 0.4 || c4.x > W - 0.4 || c4.y < 0.4 || c4.y > D - 0.4) leaked++; }
    ok(leaked > 0, `flat ${variant}: test setup: without env the camera does leave the flat`, String(leaked));
  }
}

console.log(fails ? `${fails} of ${n} checks FAILED` : `cutscript_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
