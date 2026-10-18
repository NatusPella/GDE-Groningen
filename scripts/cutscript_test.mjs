// Logic test for the cutscene direction language (game/js/cutscript.js) and the
// scenes in game/js/cutscenes.js, on the real script lines of the opening:
//   node scripts/cutscript_test.mjs
import { readFileSync } from 'node:fs';
import { compileScene, validateScene, resolveTime, ACTOR_ANIMS } from '../game/js/cutscript.js';
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

console.log(fails ? `${fails} of ${n} checks FAILED` : `cutscript_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
