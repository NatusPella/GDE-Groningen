// The staged scenes of Deel 4 (game/js/cutscenes_akte6.js, M27-M30) on the real script lines:
//   node scripts/cutscenes_akte6_test.mjs
// Same checks as cutscenes_akte1_test: every scene compiles and validates, samples finite and near the set, nobody jumps.
import { readFileSync } from 'node:fs';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { MORE_SPECS as SPECS, missionScene } from '../game/js/cutscenes_akte1.js';
import '../game/js/cutscenes_akte6.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const data = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const src = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');

// the NPC table of missionstory.js (names; the looks are opaque here)
const looks = {};
for (const m of src.matchAll(/^  (\w+): \{.*?name: '([^']+)'/gm)) looks[m[1]] = { name: m[2], shirt: 0x808080, skin: 0xd0a080 };
ok(looks.berend && looks.berend.name === 'Berend Bos', 'NPC table parsed');

// spec key -> script scene ids (storyarc_nieuw.js `story`)
const SCENES = {};
for (const s of STEPS.filter((q) => q.part === 'nazomer' && q.story)) { SCENES[s.id + '.intro'] = s.story.intro; if (s.story.outro) SCENES[s.id + '.outro'] = s.story.outro; }
for (const k of Object.keys(SPECS)) if (/^M(2[7-9]|30)\.\d+$/.test(k)) SCENES[k] = [k];
// a stage scene that plays a slice of a script scene (missions_akte5.js script { ids, from, to }): 'M26.4#7-14' = lines 7 to 13 of M26.4
const SLICE = {};
for (const k of Object.keys(SPECS)) { const m = /^(M\d+\.\d+)#(\d+)-(\d+)$/.exec(k); if (m) { SCENES[k] = [m[1]]; SLICE[k] = [+m[2], +m[3]]; } }
const NAME = { T: 'Tammo', A: 'Anita' };
// the timeline of missionstory.js without recordings: reading time, 0.6 s lead, 0.1 s between
function linesOf(ids, slice = null) {
  const out = [];
  let t = 0.6;
  for (const id of ids) {
    for (const l of data.scenes.find((s) => s.id === id).lines.slice(...(slice || [0]))) {
      if (l.channel === 'app-stil') continue;
      const dur = Math.max(2.2, Math.min(8, 1.3 + l.text.length * 0.058));
      out.push({ speaker: NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key, text: l.text, at: t, dur });
      t += dur + 0.1;
    }
  }
  return { lines: out, total: t + 0.3 };
}

const KEYS = Object.keys(SPECS).filter((k) => /^M(2[7-9]|30)\./.test(k));
ok(KEYS.filter((k) => /\.(intro|outro)$/.test(k)).length === 8, 'eight staged intros and outros (M27-M30)', String(KEYS.length));
ok(KEYS.filter((k) => /\.\d+$/.test(k)).length >= 5, 'the in-mission scenes are staged (M27.2, M29.2, M30.2, M30.3, M30.5)', String(KEYS.length));
for (const key of KEYS) {
  ok(SCENES[key], key + ' has a script scene', key);
  const { lines, total } = linesOf(SCENES[key], SLICE[key]);
  // every beat finds its line (a silent skip would hide a typo)
  for (const b of SPECS[key].beats) if (typeof b.on === 'string') ok(lines.some((l) => l.text.startsWith(b.on)), key + ' beat finds its line', b.on);
  const def = missionScene(key, lines, { looks });
  ok(def, key + ' builds');
  if (!def) continue;
  const issues = validateScene(def, { lines, duration: total });
  ok(issues.length === 0, key + ' validates', issues.join(' | '));
  if (issues.length) continue;
  const scene = compileScene(def, { lines, duration: total });
  const anchor = { x: 500, y: -300, facing: 1.1, z: 0 };
  let finite = true, near = true, maxStep = 0, prev = null;
  const shotsSeen = new Set(), moved = new Set();
  for (let t = 0; t <= total; t += 0.1) {
    const s = scene.sample(t, anchor);
    const c = s.camera;
    for (const v of [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov]) if (!Number.isFinite(v)) finite = false;
    if (Math.hypot(c.position.x - anchor.x, c.position.y - anchor.y) > 45) near = false;
    for (const a of Object.values(s.actors)) for (const v of [a.x, a.y, a.a, a.gaze]) if (!Number.isFinite(v)) finite = false;
    if (prev) for (const [id, a] of Object.entries(s.actors)) maxStep = Math.max(maxStep, id.startsWith('fiets') ? 0 : Math.hypot(a.x - prev.actors[id].x, a.y - prev.actors[id].y) * (a.anim === 'ride' ? 0 : 1));
    shotsSeen.add(c.shotIndex);
    prev = s;
  }
  ok(finite, key + ' samples finite');
  ok(near, key + ' camera stays near the set');
  ok(maxStep < 0.45, key + ' nobody jumps', String(maxStep));
  ok(shotsSeen.size >= Math.min(4, lines.length), key + ' the camera varies', String(shotsSeen.size));
  // the pair must not stand still the whole scene, and every named actor does something
  const a0 = scene.sample(0.3, anchor), a1 = scene.sample(total - 0.3, anchor);
  let anyMoved = false;
  for (const id of Object.keys(a0.actors)) if (Math.hypot(a0.actors[id].x - a1.actors[id].x, a0.actors[id].y - a1.actors[id].y) > 0.5) anyMoved = true;
  ok(anyMoved || Object.keys(a0.props).some((id) => Math.hypot(a0.props[id].x - a1.props[id].x, a0.props[id].y - a1.props[id].y) > 0.5), key + ' something moves in the scene');
  // the NPC speaks as the NPC: their speaking flag follows the line
  for (const l of lines) {
    const s = scene.sample(l.at + 0.5, anchor);
    if (l.speaker === 'Tammo') ok(s.speakerActor === 'tammo', key + ' Tammo speaks', l.text);
    else if (l.speaker === 'Anita') ok(s.speakerActor === 'tessa', key + ' Tessa speaks', l.text);
  }
}

// a text edit never breaks a scene: a spec on lines that no longer match still builds and validates
{
  const { lines, total } = linesOf(SCENES['M30.intro']);
  const edited = lines.map((l, i) => ({ ...l, text: 'Bewerkte regel ' + i }));
  const def = missionScene('M30.intro', edited, { looks });
  ok(def && validateScene(def, { lines: edited, duration: total }).length === 0, 'edited lines still validate');
}

console.log(fails ? `${fails} of ${n} failed` : `cutscenes_akte6_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
