// Logic test for the automatic gestures of a spoken line (game/js/cuegestures.js) and their use in missionScene (#955 #956):
//   node scripts/cuegestures_test.mjs
import { autoClip, SPEAKER_POOLS, LISTENER_POOL } from '../game/js/cuegestures.js';
import { isClip } from '../game/js/poseclips.js';
import { missionScene } from '../game/js/cutscenes_akte1.js';
import { validateScene, compileScene } from '../game/js/cutscript.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

for (const pool of [...Object.values(SPEAKER_POOLS), LISTENER_POOL]) ok(pool.every(isClip), 'every pool clip exists');
const Q = 'Is dat nu echt jouw plan, Tammo, of ben je gewoon moe?';
const a = autoClip(Q, 'speaker', 'tessa', 3, 4);
ok(a && SPEAKER_POOLS.vraag.includes(a.anim), 'a question gets an open gesture', JSON.stringify(a));
ok(JSON.stringify(a) === JSON.stringify(autoClip(Q, 'speaker', 'tessa', 3, 4)), 'deterministic');
ok(autoClip('Ja.', 'speaker', 'tessa', 0, 3) === null, 'a short line stays calm');
ok(autoClip(Q, 'speaker', 'tessa', 3, 1.2) === null, 'a short duration stays calm');
const b = autoClip('Dat is niet waar en dat weet je best, Tammo, echt niet!', 'speaker', 'tessa', 1, 4);
ok(b && SPEAKER_POOLS.uitroep.includes(b.anim), 'an exclamation gets an exclamation gesture');
const c = autoClip('Nou…, ik weet het niet zo goed, eerlijk gezegd, hoor.', 'speaker', 'tessa', 1, 4);
ok(c && SPEAKER_POOLS.aarzeling.includes(c.anim), 'hesitation gets hesitation');
ok(autoClip('Een gewone korte zin van maar net genoeg tekens.', 'speaker', 'tessa', 1, 4) === null, 'a plain mid-length statement gets none');
let got = 0;
for (let i = 0; i < 40; i++) if (autoClip('Een luisterregel die lang genoeg is om te reageren ' + i, 'listener', 'tammo', i, 4)) got++;
ok(got > 8 && got < 32, 'listeners react to some lines, not all', String(got));
const d = autoClip(Q, 'speaker', 'tessa', 3, 2.2);
ok(d && d.delay + d.dur <= 2.2, 'the gesture ends inside the line', JSON.stringify(d));

// in a mission scene: the clips are cues, they validate, and an authored beat near the line wins
const looks = { npc: { name: 'Berend Bos', shirt: 0x808080, skin: 0xd0a080 } };
const L = [{ speaker: 'Berend Bos', text: 'Is dat nu echt jouw plan, Tammo, of ben je gewoon moe?', at: 0.6, dur: 4 }, { speaker: 'Anita', text: 'Nee, het is mijn plan, en het is een goed plan, zeg ik.', at: 4.8, dur: 4 }, { speaker: 'Tammo', text: 'Dat zeg jij, maar jij zegt wel meer dingen, hè, dingen!', at: 9, dur: 4 }];
const mk = (extra = {}) => ({ cast: { npc: { key: 'npc', at: [3, 0.2], face: 180 } }, props: {}, open: [], beats: [], shots: [], wide: { from: [-4, 3, 3], to: [-3, 2, 2.4], look: 'mid:npc,tessa@1', fov: 48, until: 1 }, ...extra });
const def = missionScene('X', L, { looks, spec: mk() });
const clips = def.cues.filter((q) => q.anim && isClip(q.anim));
ok(clips.length >= 1, 'the scene has automatic clips', String(clips.length));
ok(!validateScene(def, { lines: L, duration: 14 }).length, 'the scene validates', JSON.stringify(validateScene(def, { lines: L, duration: 14 })));
const clipsOf = (d, id, at) => d.cues.filter((q) => q.actor === id && isClip(q.anim) && typeof q.t === 'string' && q.t.startsWith(at));
const mine = clipsOf(def, 'npc', 'L0').length;
ok(mine === 1, 'the speaker of the question gets a clip');
const def2 = missionScene('X', L, { looks, spec: mk({ beats: [{ on: 0, dt: 0.5, actor: 'npc', anim: 'point' }] }) });
ok(clipsOf(def2, 'npc', 'L0').length === 0, 'an authored beat near the line wins');
const def3 = missionScene('X', L, { looks, spec: mk({ noClips: true }) });
ok(!def3.cues.some((q) => q.anim && isClip(q.anim)), 'noClips switches the layer off');
ok(JSON.stringify(def) === JSON.stringify(missionScene('X', L, { looks, spec: mk() })), 'the scene definition is deterministic (host and guest agree)');
ok(compileScene(def, { lines: L, duration: 14 }).sample(1.6, { x: 0, y: 0, facing: 0, z: 0 }, null).actors.npc.clips.length === 1, 'the clip is live in the sample');

if (fails) { console.log(`cuegestures_test: ${fails} of ${n} checks FAILED`); process.exit(1); }
console.log(`cuegestures_test: ${n} checks ok`);
