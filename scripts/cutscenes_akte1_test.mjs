// The staged scenes of act 1 (game/js/cutscenes_akte1.js, #147) on the real script lines:
//   node scripts/cutscenes_akte1_test.mjs
// Every scene compiles and validates (no broken refs, nobody standing around, no dull shot),
// samples finite and near the set, and shows what its regie promises (people walk, props move).
import { readFileSync } from 'node:fs';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { SPECS, missionScene } from '../game/js/cutscenes_akte1.js';
import { SPECS_AKTE2 } from '../game/js/cutscenes_akte2.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const data = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const src = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');

// the NPC table of missionstory.js (names; the looks are opaque here)
const looks = {};
for (const m of src.matchAll(/^  (\w+): \{.*?name: '([^']+)'/gm)) looks[m[1]] = { name: m[2], shirt: 0x808080, skin: 0xd0a080 };
ok(looks.berend && looks.berend.name === 'Berend Bos', 'NPC table parsed');

// spec key -> script scene ids (storyarc_nieuw.js `story`)
const SCENES = {
  'M01.intro': ['M01.1'], 'M01.outro': ['M01.6'], 'M02.intro': ['M02.1'], 'M02.outro': ['M02.3'],
  'M03.intro': ['M03.1'], 'M03.outro': ['M03.4'], 'M04.intro': ['M04.1'], 'M04.outro': ['M04.3'],
  'M05.intro': ['M05.1'], 'M05.outro': ['M05.3'], 'M06.intro': ['M06.1'], 'M01.3': ['M01.3'], 'M01.5': ['M01.5'], 'M03.2': ['M03.2'],
};
const NAME = { T: 'Tammo', A: 'Anita' };
// the timeline of missionstory.js without recordings: reading time, 0.6 s lead, 0.1 s between
function linesOf(ids) {
  const out = [];
  let t = 0.6;
  for (const id of ids) {
    for (const l of data.scenes.find((s) => s.id === id).lines) {
      if (l.channel === 'app-stil') continue;
      const dur = Math.max(2.2, Math.min(8, 1.3 + l.text.length * 0.058));
      out.push({ speaker: NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key, text: l.text, at: t, dur });
      t += dur + 0.1;
    }
  }
  return { lines: out, total: t + 0.3 };
}

for (const key of Object.keys(SPECS).filter((k) => !(k in SPECS_AKTE2))) {
  ok(SCENES[key], key + ' has a script scene', key);
  const { lines, total } = linesOf(SCENES[key]);
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
  const { lines, total } = linesOf(['M01.1']);
  const edited = lines.map((l, i) => ({ ...l, text: 'Bewerkte regel ' + i }));
  const def = missionScene('M01.intro', edited, { looks });
  ok(def && validateScene(def, { lines: edited, duration: total }).length === 0, 'edited lines still validate');
}
ok(missionScene('X99.intro', [{ speaker: 'Tammo', text: 'x', at: 1, dur: 2 }], { looks }) === null, 'unknown scene is null');

// specific stagings
{
  const { lines, total } = linesOf(['M02.1']);
  const scene = compileScene(missionScene('M02.intro', lines, { looks }), { lines, duration: total });
  const a = { x: 0, y: 0, facing: 0, z: 0 };
  const i1 = lines.findIndex((l) => l.text.startsWith('Douwe. Hij is los'));
  const early = scene.sample(0.5, a), late = scene.sample(lines[i1].at + 2.5, a);
  ok(late.props.trekker.x - early.props.trekker.x > 3, 'M02: the tractor drives away');
  ok(Math.abs(late.props.automaat.x - early.props.automaat.x) < 0.5, 'M02: the machine stays behind');
  ok(scene.sample(0.5, a).actors.durk.visible === false, 'M02: Durk sits in the cab');
  const end = scene.sample(total - 0.2, a);
  ok(end.actors.tammo.visible === false && end.actors.tessa.visible === false, 'M02: they get into the car');
}

console.log(fails ? `${fails} of ${n} failed` : `cutscenes_akte1_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
