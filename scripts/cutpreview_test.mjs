// Pure side of the cutscene preview tool (game/js/cutpreview.js, #209):
//   node scripts/cutpreview_test.mjs
// The catalogue holds every staged scene, a broken scene is reported with a reason,
// scrubbing returns finite frames, and the stills cover every shot.
import { readFileSync } from 'node:fs';
import { buildCatalog, frameAt, stillTimes, stillName, sceneBounds, summary, linesOf, sceneIdsFor, npcNamesFromSource, STATUS } from '../game/js/cutpreview.js';
import { MAX_CAMERA_STILL, projectFrame } from '../game/js/cutpreview.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';
import { SPECS, MORE_SPECS } from '../game/js/cutscenes_akte1.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const script = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const npcSource = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');

const looks = npcNamesFromSource(npcSource);
ok(looks.berend && looks.berend.name === 'Berend Bos', 'npc names parsed');
ok(sceneIdsFor('M08.intro').length > 0 && sceneIdsFor('M01.3')[0] === 'M01.3', 'scene ids resolve');

const cat = buildCatalog({ script, npcSource });
const keys = new Set([...Object.keys(SPECS), ...Object.keys(MORE_SPECS)]);
ok(cat.length === keys.size + 4, 'catalogue: every spec, three acts and the end card', `${cat.length} vs ${keys.size + 4}`);
ok(new Set(cat.map((e) => e.id)).size === cat.length, 'catalogue ids are unique');
for (const e of cat) {
  ok(Object.values(STATUS).includes(e.status), e.id + ' has a status', e.status);
  ok(e.status !== STATUS.error, e.id + ' validates', e.issues.join(' | '));
  const f = frameAt(e, e.duration / 2);
  ok(f && Number.isFinite(f.camera.position.x) && Number.isFinite(f.t), e.id + ' frame at the middle is finite');
  ok(frameAt(e, -5).t === 0 && frameAt(e, 1e6).t === e.duration, e.id + ' scrubbing clamps');
  const st = stillTimes(e);
  ok(st.length >= 1 && st.every((t) => t >= 0 && t <= e.duration), e.id + ' stills inside the scene', JSON.stringify(st));
  const shots = new Set(st.map((t) => frameAt(e, t).shot));
  ok(shots.size === st.length, e.id + ' one still per shot');
  const b = sceneBounds(e);
  ok(b && b.x1 > b.x0 && b.y1 > b.y0, e.id + ' has bounds');
}
ok(summary(cat).fout === 0, 'summary counts');
// rhythm rule (#136): no camera holds still longer than MAX_CAMERA_STILL seconds, in every act
for (const e of cat) if (e.scene) ok(e.rhythm && e.rhythm.longestStill <= MAX_CAMERA_STILL, e.id + ' camera rhythm', e.rhythm && String(e.rhythm.longestStill));
// coverage: every intro/outro of the new story has a staged scene (M21 is a solo scene in the car and stays plain)
{
  const SOLO = new Set(['M21.intro']);
  const bare = [];
  for (const s of STEPS) for (const k of ['intro', 'outro']) {
    const ids = (s.story && s.story[k]) || [];
    if (ids.length && !SOLO.has(s.id + '.' + k) && !keys.has(s.id + '.' + k) && !ids.some((i) => keys.has(i))) bare.push(s.id + '.' + k);
  }
  ok(bare.length === 0, 'no bare intro/outro scenes', bare.join(', '));
}
ok(stillName('M01.intro', 3, 12.44) === 'M01.intro-shot03-t12.4.png', 'still file name');

// a broken scene is reported, not thrown
{
  const lines = linesOf(script, ['M01.1'], looks);
  ok(lines.lines.length > 0 && lines.total > 3, 'linesOf times the lines');
  const bad = buildCatalog({ script, looks: {} });
  const broken = bad.filter((e) => e.status === STATUS.error);
  ok(broken.length > 0, 'without NPC looks the scenes with a cast fail');
  ok(broken.every((e) => e.issues.length > 0 && e.issues.some((m) => /ontbrekende acteur|geen/.test(m))), 'the reason names the missing actor', broken.map((e) => e.issues[0]).join(' / '));
  ok(frameAt(broken[0], 1) === null && stillTimes(broken[0]).length === 0, 'a broken scene has no frames');
}

// camera view (projectFrame): a known frame, then every scene sampled once a second
{
  const fr = (actors, cam) => ({ camera: { position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 10, y: 0, z: 1.6 }, fov: 46, ...cam }, actors, props: {}, speaker: 'Tammo' });
  const ent = { def: { actors: { a: { speaker: 'Tammo' }, b: { speaker: 'Anita' } }, props: {} } };
  const v = projectFrame(ent, fr({ a: { x: 5, y: 0, a: 0, visible: true }, b: { x: 5, y: 2, a: 0, visible: true } }));
  const a = v.figures.find((q) => q.id === 'a'), b = v.figures.find((q) => q.id === 'b');
  ok(a && Math.abs(a.x) < 1e-6, 'camera view: een acteur recht voor de camera staat in het midden');
  ok(b && b.x > 0.2, 'camera view: wie ten zuiden staat bij een blik naar het oosten staat rechts');
  ok(a.yTop > 0 && a.yBottom < 0 && a.yTop - a.yBottom > 0.2, 'camera view: de acteur beslaat de horizon');
  ok(v.speakerInFrame === true, 'camera view: de spreker is in beeld');
  const weg = projectFrame(ent, fr({ a: { x: -5, y: 0, a: 0, visible: true } }));
  ok(weg.figures.length === 0 && weg.speakerInFrame === null, 'camera view: wat achter de camera staat telt niet');
  const zij = projectFrame(ent, fr({ a: { x: 3, y: 30, a: 0, visible: true } }));
  ok(zij.speakerInFrame === false, 'camera view: een spreker ver naast het beeld is niet in beeld');
  let n2 = 0, speaking = 0, inFrame = 0;
  for (const e of cat) if (e.scene) for (let t = 0; t < e.duration; t += 1) {
    const p = projectFrame(e, frameAt(e, t));
    n2++;
    ok(p && p.figures.every((q) => Number.isFinite(q.x) && Number.isFinite(q.yTop) && Number.isFinite(q.w)), e.id + ' camera view finite op ' + t);
    if (p.speakerInFrame !== null) { speaking++; if (p.speakerInFrame) inFrame++; }
  }
  console.log(`camera view: ${n2} beelden, spreker in beeld bij ${inFrame} van ${speaking} spreekmomenten`);
}

console.log(fails ? `${fails} of ${n} failed` : `cutpreview_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
