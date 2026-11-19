// Logic test for the cutscene direction language (game/js/cutscript.js) and the
// scenes in game/js/cutscenes.js, on the real script lines of the opening:
//   node scripts/cutscript_test.mjs
import { readFileSync } from 'node:fs';
import { compileScene, validateScene, resolveTime, fitCamera, fitAnchor, ACTOR_ANIMS, PROP_KINDS, shotPoints, roadPathDef } from '../game/js/cutscript.js';
import { PROP_SOURCES, DECOR_KINDS, PLACEHOLDER_KINDS, VEHICLE_MODEL_NAMES, ANIMAL_KINDS, propKindIssue, TABLE_SIT } from '../game/js/cutscenemodels.js';
import { ANIMS } from '../game/js/actoranim.js';
import { openingActs, END_CARD, flatScene } from '../game/js/cutscenes.js';

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

// the opening: three acts (trailer in the street, the kitchen, moving day), each on its own share of the lines
const acts = openingActs(lines);
ok(acts.length === 3 && acts.map((x) => x.lines.length).join() === '3,18,5', 'the opening splits into 3 + 18 + 5 line slots (the five kitchen lines of #662 left the script in #987)', acts.map((x) => x.lines.length).join());
ok(acts.every((x) => x.lines.every((l, i) => i === 0 || l.at > x.lines[i - 1].at)), 'lines keep their order in every act');
for (const x of acts) {
  const iss = validateScene(x.def, { lines: x.lines, duration: x.duration });
  ok(iss.length === 0, `act ${x.def.id} validates`, iss.join(' | '));
}
const issues2 = validateScene(END_CARD, { duration: 6.5 });
ok(issues2.length === 0, 'end card validates', issues2.join(' | '));

// sampling is finite and deterministic over every act
const anchor = { x: 1000, y: -500, facing: 0.7, z: 0 };
const kAnchor = { x: 1000, y: -500, facing: 0, z: 345 };
const compiled = acts.map((x) => ({ ...x, scene: compileScene(x.def, { lines: x.lines, duration: x.duration }) }));
let finite = true, same = true, maxStep = 0;
let kitchenOut = 0;
for (const x of compiled) {
  const an = x.def.set === 'keuken' ? kAnchor : anchor;
  let prev = null;
  for (let t = 0; t <= x.duration; t += 0.1) {
    const s = x.scene.sample(t, an), s2 = x.scene.sample(t, an);
    if (JSON.stringify(s) !== JSON.stringify(s2)) same = false;
    const c = s.camera;
    for (const v of [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov]) if (!Number.isFinite(v)) finite = false;
    for (const a of Object.values(s.actors)) for (const v of [a.x, a.y, a.a, a.gaze, a.speed, a.sit]) if (!Number.isFinite(v)) finite = false;
    for (const p of Object.values(s.props)) for (const v of [p.x, p.y, p.h, p.a]) if (!Number.isFinite(v)) finite = false;
    // the camera stays near the set (no shot flying off into the map)
    if (Math.hypot(c.position.x - an.x, c.position.y - an.y) > 60) finite = false;
    if (x.def.set === 'keuken') {
      // before the host's clamp: look targets and cameras are meant to be in or at the room (4.4 x 3.6 x 2.6 m)
      const dx = Math.abs(c.position.x - an.x), dy = Math.abs(c.position.y - an.y), dz = c.position.z - an.z;
      if (dx > 2.15 || dy > 1.75 || dz < 0.2 || dz > 2.5) kitchenOut++;
    }
    if (prev) for (const [id, a] of Object.entries(s.actors)) if (!/^fiets/.test(id)) maxStep = Math.max(maxStep, Math.hypot(a.x - prev.actors[id].x, a.y - prev.actors[id].y));
    prev = s;
  }
}
ok(finite, 'all samples finite and near the set');
ok(same, 'sampling is deterministic');
ok(maxStep < 0.35, 'walkers move smoothly (max 0.1 s step)', String(maxStep));
ok(kitchenOut === 0, 'the kitchen cameras stay inside the room', String(kitchenOut));

const [trailer, kitchen, moving] = compiled;
// the camera varies in every act
for (const x of compiled) {
  const seen = new Set();
  for (let t = 0; t < x.duration; t += 0.25) seen.add(x.scene.sample(t, x.def.set === 'keuken' ? kAnchor : anchor).camera.shotIndex);
  ok(seen.size >= (x.def.set === 'keuken' ? 20 : 6), `the camera varies in ${x.def.id}`, String(seen.size));
}

// the kitchen: Tessa sits, Tammo walks in and sits, both stand up and leave; no animal on the set (#434)
{
  const L = kitchen.lines, sm = (t) => kitchen.scene.sample(t, kAnchor);
  const first = sm(0.5), mid = sm(L[8].at + 1), end = sm(kitchen.duration - 0.3);
  ok(first.actors.tessa.sit > 0.4 && first.actors.tammo.sit === 0, 'Tessa sits from the start, Tammo stands in the hall');
  ok(mid.actors.tessa.sit > 0.4 && mid.actors.tammo.sit > 0.4, 'both sit at the table in the middle');
  ok(end.actors.tessa.sit === 0 && end.actors.tammo.sit === 0, 'both stand at the end');
  ok(Math.hypot(end.actors.tessa.x - kAnchor.x - 1.3, end.actors.tessa.y - kAnchor.y - 2.3) < 0.3, 'Tessa leaves through the door');
  // #434: geen dier als grap. De regel over de kat blijft (die is ingesproken), de poes staat niet meer op de set;
  // in plaats van de close-up op de kat kijkt de camera op die regel naar de radio, waar Rikus het nieuws leest.
  ok(!Object.values(kitchen.def.props || {}).some((p) => p.kind === 'kat'), 'geen kat op de keukenset');
  const rad = sm(L[1].at + 0.6).camera.lookAt;
  ok(Math.hypot(rad.x - kAnchor.x + 2.05, rad.y - kAnchor.y - 0.62) < 0.05, 'de radio krijgt de cut als Rikus praat', `${rad.x - kAnchor.x} ${rad.y - kAnchor.y}`);
  ok(sm(L[2].at + 0.8).speakerActor === 'tammo' && sm(L[3].at + 0.8).speakerActor === 'tessa', 'the kitchen speakers are right');
  // every line has its own shot or shares one with a close-up on the speaker
  ok(kitchen.def.shots.length >= 26, 'the kitchen has a shot plan', String(kitchen.def.shots.length));
  // the goal line (28 augustus) has its own beat: a close shot starts on it
  ok(kitchen.def.shots.some((q) => q.t === 'L13'), 'the goal line has its own shot');
  // fx times exist and fall inside the act
  for (const f of kitchen.def.fx) {
    const t = resolveTime(f.t, L, kitchen.duration);
    ok(t != null && t >= 0 && t <= kitchen.duration, 'fx time resolves ' + JSON.stringify(f.t), String(t));
  }
}
// moving day: the Escapade drives off
{
  const a = moving.scene.sample(0.5, anchor).props.escapade, b = moving.scene.sample(moving.duration - 0.2, anchor).props.escapade;
  ok(Math.hypot(a.x - b.x, a.y - b.y) > 20, 'the Escapade drives away at the end');
  ok(moving.scene.sample(moving.duration - 0.2, anchor).actors.tessa.visible === false, 'Tessa is in the car');
  // #860: the mattress lies on the roof and must ride along with the car (it used to stay floating)
  let carried = 0, maxOff = 0, maxHeight = 0;
  let start = null;
  for (let t = 0; t <= moving.duration; t += 0.2) {
    const s = moving.scene.sample(t, anchor);
    if (!start) start = { ...s.props.escapade };
    const car = s.props.escapade, mat = s.props.matras;
    if (!mat || !car) continue;
    if (Math.hypot(car.x - start.x, car.y - start.y) > 3) {
      carried++;
      maxOff = Math.max(maxOff, Math.hypot(car.x - mat.x, car.y - mat.y));
      maxHeight = Math.max(maxHeight, Math.abs((mat.h - car.h) - 1.45));
    }
  }
  ok(carried > 20, 'the mattress is checked while the car drives', String(carried));
  ok(maxOff < 0.15, 'the mattress stays on the roof of the moving Escapade', String(maxOff));
  ok(maxHeight < 0.15, 'the mattress keeps its height above the car roof', String(maxHeight));
}
// #859: the seated kitchen pose is shared and is not the steering pose
{
  ok(TABLE_SIT.arms === 'lap', 'the table pose holds the hands on lap/tabletop, not on a wheel', TABLE_SIT.arms);
  const hostSrc = readFileSync(new URL('../game/js/cutscenehost.js', import.meta.url), 'utf8');
  const introSrc = readFileSync(new URL('../game/js/intromontage.js', import.meta.url), 'utf8');
  const uses = (src) => /import\s*\{[^}]*TABLE_SIT[^}]*\}\s*from\s*'\.\/cutscenemodels\.js'/.test(src);
  ok(uses(hostSrc) && uses(introSrc), 'the host and the intro montage use the same table pose');
  ok(!/const TABLE_SIT\s*=\s*\{[^}]*arms:\s*'wheel'/.test(hostSrc + introSrc), 'no steering pose is defined for the table');
}
// #864: a carried prop hangs by the carrier, at hand height, not floating in front of the chest
{
  const s = moving.scene.sample(1, anchor);
  for (const [actor, prop, low] of [['tessa', 'plan', 0.98], ['tammo', 'koffer', 0.9]]) {
    const a = s.actors[actor], p = s.props[prop];
    ok(a && p && a.carrying === prop, `#864: ${actor} carries ${prop}`, JSON.stringify({ carrying: a && a.carrying }));
    if (!a || !p) continue;
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    ok(d >= 0.24 && d <= 0.45, `#864: ${prop} hangs at the carrier, not in front of the chest`, String(d));
    ok(Math.abs(p.h - low) < 0.02, `#864: ${prop} hangs at hip/hand height`, String(p.h));
  }
}
// the trailer: cyclists ride, the street lives
ok(trailer.scene.sample(2, anchor).actors.fietser.anim === 'ride', 'cyclists ride');
// #862/#863: the opening's bikes and cars are marked for the road (cutscenehost.js roadPathDef)
ok(trailer.def.props.fiets1.road === 'cycle' && trailer.def.actors.fietser.road === 'fiets1', 'C00.1: the cycling postman rides the cycle path');
ok(moving.def.props.escapade.road === true && moving.def.props.fiets1.road === 'cycle', 'C00.3: the Escapade and the cyclist follow the road');
ok(moving.def.props.matras.follows === 'escapade', 'C00.3: the mattress follows the Escapade');

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
bad({ props: { x: { kind: 'auto', at: [0, 0], road: 'water' } }, cues: [] }, 'unknown road mode');
bad({ props: { x: { kind: 'auto', at: [0, 0], follows: 'ghost' } }, cues: [] }, 'follower points nowhere');
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
  // #858: a camera in the wall backs away from what it looks at (the old order pulled it towards
  // the subject, which put a back or a head in the lens in C00.3)
  const c = fitCamera({ x: 6, y: 0, z: 1.6 }, { x: -2, y: 0, z: 1.4 }, env);
  ok(!solid(c.x, c.y, c.z), 'a camera inside a building is moved to free space', JSON.stringify(c));
  ok(c.x > 11.5, 'and it steps back along the view axis, not towards the subject', JSON.stringify(c));
  ok(Math.hypot(c.x + 2, c.y, c.z - 1.4) > 8, 'the corrected camera is farther from the subject than the walled-in spot', JSON.stringify(c));
  ok(fitCamera({ x: -3, y: 0, z: 1.6 }, { x: -2, y: 0, z: 1.4 }, env).x === -3, 'a free camera stays');
  // the opening scene faces the building: the anchor turns away until nothing stands in the wall
  // the shot wants a spot inside the building, next to an actor: the camera must not end up on top of them
  {
    const def = { id: 'ring-test', actors: { a: { look: 'tammo', at: [1.0, 0], face: 0, anim: 'idle', speaker: 'Tammo' } }, shots: [{ t: 0, shot: 'cut', at: [4, 0, 1.6], look: 'speaker', fov: 40 }, { t: 1.5, shot: 'cut', at: [3, 1, 1.6], look: 'speaker', fov: 40 }] };
    const sc2 = compileScene(def, { lines: [{ speaker: 'Tammo', text: 'Hallo.', at: 0.2, dur: 2 }], duration: 3 });
    const anch = { x: 0, y: 0, facing: 0, z: 0 };
    for (const t of [0.5, 2]) {
      const s = sc2.sample(t, anch, env), cp = s.camera.position, ap = s.actors.a;
      ok(Math.hypot(cp.x - ap.x, cp.y - ap.y) >= 1.49, 'the camera keeps its distance to the actor although the wall is in the way (t=' + t + ')', JSON.stringify({ cp, ap }));
      ok(!solid(cp.x, cp.y, cp.z), 'and not in the wall (t=' + t + ')', JSON.stringify(cp));
    }
  }
  const sc = moving.scene;
  const duration = moving.duration;
  const a0 = { x: 0, y: 0, facing: 0, z: 0 };
  const count2 = (a, sol) => { let bad = 0; for (let t = 0; t <= duration; t += 1) { const s2 = sc.sample(t, a); for (const o of Object.values(s2.actors)) if (sol(o.x, o.y, 0.9)) bad++; for (const o of Object.values(s2.props)) if (o.visible && sol(o.x, o.y, o.h + 0.4)) bad++; const c = s2.camera.position; if (sol(c.x, c.y, c.z)) bad++; } return bad; };
  const count = (a) => { let bad = 0; for (let t = 0; t <= duration; t += 0.6) { const s2 = sc.sample(t, a); for (const o of Object.values(s2.actors)) if (solid(o.x, o.y, 0.9)) bad++; } return bad; };
  const a1 = fitAnchor(sc, a0, env);
  ok(count(a0) > 0, 'test setup: the unturned opening stands in the building', String(count(a0)));
  ok(count(a1) < count(a0) && a1.facing !== a0.facing, 'fitAnchor turns the scene away from the building', count(a1) + ' vs ' + count(a0));
  ok(fitAnchor(sc, a1, { solid: () => false }).facing === a1.facing, 'a clean anchor is left alone');
  // a tower all round (#321: the new home's tower beside the spawn): no clean turn, so the anchor moves to open ground
  const ring = (x, y, z) => Math.hypot(x, y) < 16 && z < 75; // open only beyond 16 m from the anchor
  const wall = { solid: (x, y, z) => ring(x, y, z) && Math.hypot(x, y) > 1.2 };
  const turned = fitAnchor(sc, a0, wall);
  ok(count2(turned, wall.solid) > 0 || turned.x === a0.x, 'test setup: no turn of the anchor helps inside the tower', String(count2(turned, wall.solid)));
  const moved = fitAnchor(sc, a0, wall, { radii: [10, 24, 40], ground: (x, y) => !wall.solid(x, y, 0.5) });
  ok(count2(moved, wall.solid) === 0, 'fitAnchor with radii moves the scene to free ground', String(count2(moved, wall.solid)));
  ok(Math.hypot(moved.x, moved.y) >= 16, 'the free ground is outside the tower', JSON.stringify(moved));
  const stay = fitAnchor(sc, a1, env, { radii: [10, 24, 40], ground: () => true });
  ok(stay.x === a1.x && stay.y === a1.y, 'a turn that is clean keeps the anchor in place');
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

// shotPoints (#157, #20): the camera path gives finite, de-duplicated, capped prewarm points near the set
for (const x of compiled) {
  const an = x.def.set === 'keuken' ? kAnchor : anchor;
  const pts = shotPoints(x.scene, an, x.duration);
  ok(pts.length >= 1 && pts.length <= 24, x.def.id + ': shotPoints count', String(pts.length));
  ok(pts.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && Math.hypot(q.x - an.x, q.y - an.y) < 80), x.def.id + ': shotPoints near the set');
}
ok(shotPoints({ sample() { throw new Error('x'); } }, anchor, 10).length === 0, 'shotPoints survives a failing sample');

// #862/#863: a moving cutscene vehicle and a cyclist follow the road instead of a straight local line
{
  const roads = [
    { cat: 'road', pts: [[-40, 0], [40, 0]] },
    { cat: 'road', pts: [[40, 0], [40, 40]] },
    { cat: 'cycle', pts: [[-40, 3], [40, 3]] },
  ];
  const onRoad = (road, x, y) => {
    let best = null;
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (!best || d < best.d) best = { d, x: ax + dx * t, y: ay + dy * t };
    }
    return best;
  };
  const map = {
    nearestRoadPoint(x, y, r = 400, drivable = false) {
      let best = null;
      for (const road of roads) {
        if (drivable && (road.cat === 'foot' || road.cat === 'cycle')) continue;
        const c = onRoad(road, x, y);
        if (c && (!best || c.d < best.d)) best = { ...c, road };
      }
      return best && best.d <= r ? best : null;
    },
    roadsNear(x, y, r) { return roads.filter((road) => onRoad(road, x, y).d <= r); },
  };
  const def = {
    id: 'road-test', duration: 18,
    actors: {
      driver: { look: 'tammo', at: [0, 0], face: 0, anim: 'idle' },
      rider: { look: 'fietser', at: [0, 10], face: 0, anim: 'ride', road: 'bike' },
    },
    props: {
      car: { kind: 'auto', at: [0, 0, 0], face: 0, road: true },
      matras: { kind: 'matras', at: [0, 0, 1.45], follows: 'car' },
      bike: { kind: 'fiets', at: [0, 10, 0], face: 0, road: 'cycle' },
    },
    cues: [
      { t: 0, prop: 'car', path: [[0, 0], [60, 0]], speed: 5 },
      { t: 0, actor: 'driver', walk: [[60, 0]], speed: 5 },
      { t: 0, prop: 'bike', path: [[0, 10], [70, 10]], speed: 5 },
      { t: 0, actor: 'rider', walk: [[70, 10]], speed: 5, ride: true },
    ],
    shots: [
      { t: 0, shot: 'dolly', from: [10, 0, 1.6], to: [12, 0, 1.6], look: 'car', fov: 40 },
      { t: 7, shot: 'cut', at: [10, 10, 1.6], look: 'bike', fov: 40 },
      { t: 12, shot: 'cut', at: [8, 4, 1.8], look: 'car', fov: 44 },
    ],
  };
  const before = JSON.stringify(def);
  const routed = roadPathDef(def, { x: 0, y: 0, facing: 0, z: 0 }, map, { duration: 18 });
  ok(routed, 'a road-bound scene is rewritten');
  ok(JSON.stringify(def) === before, 'roadPathDef does not change the scene data it is given');
  if (routed) {
    const car = routed.cues.find((c) => c.prop === 'car' && c.path);
    const bike = routed.cues.find((c) => c.prop === 'bike' && c.path);
    ok(car && car.path.length >= 2, 'the car gets a road path');
    ok(car && car.path[car.path.length - 1][0] >= 39 && Math.abs(car.path[car.path.length - 1][1] - 20) < 1, 'the car follows the road round the corner', JSON.stringify(car && car.path.slice(-2)));
    ok(car && car.path.every(([f, s]) => Math.abs(s) < 0.1 || Math.abs(f - 40) < 0.1), 'every car point lies on the road');
    ok(bike && bike.path.every(([f, s]) => Math.abs(s - 3) < 0.1 || Math.abs(f - 40) < 0.1), 'the cyclist follows the cycle path and the road, not the water');
    ok(routed.props.car.at[0] === car.path[0][0] && routed.props.car.at[1] === car.path[0][1], 'the parked start of the car is on the road too');
    const rider = routed.actors.rider;
    const walk = routed.cues.find((c) => c.actor === 'rider' && c.walk);
    ok(rider && Math.abs(rider.at[1] - 3) < 0.1, 'the cyclist and the bike start together on the cycle path', JSON.stringify(rider && rider.at));
    ok(walk && walk.walk.every(([f, s]) => Math.abs(s - 3) < 0.1 || Math.abs(f - 40) < 0.1), 'the cyclist rides the same waypoints as the bike');
    const hides = routed.cues.filter((c) => c.hide === true);
    ok(hides.some((c) => c.prop === 'bike') && hides.some((c) => c.actor === 'rider'), 'the cyclist leaves the scene after the short ride', JSON.stringify(hides));
    const matt = routed.cues.find((c) => c.prop === 'matras' && c.path);
    ok(matt && matt.path.every(([f, s, h]) => Math.abs(h - 1.45) < 1e-6), 'the mattress follows the car at its own height');
    const scene = compileScene(routed, { lines: [], duration: 18 });
    const s9 = scene.sample(15.2, { x: 0, y: 0, facing: 0, z: 0 });
    ok(s9.props.bike.visible === false && s9.actors.rider.visible === false, 'after the ride the bike and cyclist are gone, not standing still');
    const s2 = scene.sample(2, { x: 0, y: 0, facing: 0, z: 0 });
    ok(Math.abs(s2.props.matras.x - s2.props.car.x) < 0.05 && Math.abs(s2.props.matras.y - s2.props.car.y) < 0.05, 'the follower rides on the car');
    ok(Math.abs(s2.props.matras.h - 1.45) < 0.01, 'the follower keeps its own height');
  }
  // a parked vehicle marked as road-bound only moves its start
  const parked = { id: 'parked-road', actors: {}, props: { car: { kind: 'auto', at: [0, 10, 0], road: true } }, shots: [{ t: 0, shot: 'cut', at: [5, 0, 1.6], look: 'car' }], duration: 4 };
  const p = roadPathDef(parked, { x: 0, y: 0, facing: 0, z: 0 }, map);
  ok(p && Math.abs(p.props.car.at[1]) < 0.1, 'a parked car on a marked scene is put on the road', JSON.stringify(p && p.props.car.at));
  // without roads nothing changes
  ok(roadPathDef(def, { x: 0, y: 0, facing: 0, z: 0 }, { nearestRoadPoint: () => null }) === null, 'without road data the scene is left alone');
}

// cutscene props come from the world's registers (#136): no placeholder vehicles or animals
{
  const vsrc = readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8') + readFileSync(new URL('../game/js/trafficfleet.js', import.meta.url), 'utf8');
  const wsrc = readFileSync(new URL('../game/js/wildlife.js', import.meta.url), 'utf8');
  for (const n of VEHICLE_MODEL_NAMES) ok(new RegExp(`name: '${n}'`).test(vsrc), 'vehicle model in the world register: ' + n);
  for (const a of ANIMAL_KINDS) ok(new RegExp(`case '${a}':`).test(wsrc), 'animal built by the world: ' + a);
  for (const k of PROP_KINDS) ok(PROP_SOURCES[k] || DECOR_KINDS.includes(k) || PLACEHOLDER_KINDS.includes(k), 'prop kind classified: ' + k);
  for (const [k, src] of Object.entries(PROP_SOURCES)) ok((src.vehicle && VEHICLE_MODEL_NAMES.includes(src.vehicle) || src.vehicle === 'van') || (src.animal && ANIMAL_KINDS.includes(src.animal)), 'register entry is real: ' + k);
  ok(propKindIssue('aanhanger') && !propKindIssue('auto') && !propKindIssue('kat') && propKindIssue('ufo'), 'propKindIssue');
  const bad = validateScene({ id: 'x', actors: {}, props: { t: { kind: 'aanhanger', at: [0, 0] } }, shots: [], duration: 5 });
  ok(bad.some((m) => /placeholder/.test(m)), 'a placeholder prop fails validation', bad.join('|'));
}

console.log(fails ? `${fails} of ${n} checks FAILED` : `cutscript_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
