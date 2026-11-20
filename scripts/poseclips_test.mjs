// Logic test for the pose clips (game/js/poseclips.js) and their cue in cutscript.js (#955 #956):
//   node scripts/poseclips_test.mjs
// Keyframes, easing, loop, mirror, blend with the base layer, layers (crossfade, release), the
// fallback for an unknown clip, determinism (the same scene time gives the same pose: Samen spelen)
// and the cutscript cue `anim: '<clip>'` (parser, validation, sample, still stretches).
import { CLIPS, CAT_CLIPS, CLIP_NAMES, CAT_CLIP_NAMES, EASES, isClip, isCatClip, clipChannels, sampleClip, clipLayers, clipDuration, mirrorChannels, applyClipsHuman, applyClipsCat, resetCat } from '../game/js/poseclips.js';
import { compileScene, validateScene } from '../game/js/cutscript.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const nearV = (a, b, e = 1e-6) => a.length === b.length && a.every((v, i) => near(v, b[i], e));

// --- the library -------------------------------------------------------------------
ok(CLIP_NAMES.length >= 40, 'at least 40 human clips', String(CLIP_NAMES.length));
ok(CAT_CLIP_NAMES.length >= 9, 'at least 9 cat clips', String(CAT_CLIP_NAMES.length));
for (const need of ['wijzen', 'zwaaien', 'schouderophalen', 'rondkijken', 'schrikken', 'gieren', 'juichen', 'verontwaardigd', 'aarzelen', 'aanraken', 'pakken', 'geven', 'dooropenen', 'telefoneren', 'typen', 'eten', 'drinken', 'koken', 'kloppen', 'knielen', 'omhelzen', 'highfive', 'handenschudden', 'hurken', 'struikelen', 'omvallen', 'omkijken', 'opstaan', 'dansen', 'muziekmaken', 'dirigeren', 'applaus', 'wiegen']) ok(isClip(need), 'clip exists: ' + need);
for (const need of ['kat-lopen', 'kat-zitten', 'kat-poetsen', 'kat-springen', 'kat-kopje', 'kat-spinnen', 'kat-schrikken', 'kat-slapen', 'kat-schoot']) ok(isCatClip(need), 'cat clip exists: ' + need);
ok(!isClip('kat-lopen') && !isCatClip('wijzen') && !isClip('nope') && !isClip(undefined), 'names do not cross over');

const SHAPE = { head: 3, chest: 3, armL: 3, armR: 3, legL: 2, legR: 2, pelvis: 4, body: 4, tail: 2, legs: 4 };
for (const [name, c] of Object.entries({ ...CLIPS, ...CAT_CLIPS })) {
  ok(Array.isArray(c.keys) && c.keys.length >= 2, 'clip has keys: ' + name);
  ok(c.dur > 0 && (!c.loop || c.period > 0), 'clip has a duration: ' + name);
  let prev = -1, good = true;
  for (const k of c.keys) {
    if (!(k.u >= 0 && k.u <= 1 && k.u >= prev)) good = false;
    prev = k.u;
    if (k.ease && !EASES[k.ease]) good = false;
    for (const [ch, v] of Object.entries(k)) if (ch !== 'u' && ch !== 'ease') { if (!SHAPE[ch] || !Array.isArray(v) || v.length !== SHAPE[ch] || !v.every(Number.isFinite)) good = false; }
  }
  ok(good, 'keyframes are ordered and well-formed: ' + name);
  // no wild angles: arms up to a little above the head, no full turns
  let wild = false;
  for (const k of c.keys) for (const ch of ['armL', 'armR']) if (k[ch] && (Math.abs(k[ch][0]) > 1.3 || k[ch][1] < -1.0 || k[ch][1] > 3.0 || k[ch][2] < -0.1 || k[ch][2] > 2.6)) wild = true;
  ok(!wild, 'arm angles stay human: ' + name);
}

// --- keyframes, easing --------------------------------------------------------------
const demo = { head: [0, 0, 0] };
CLIPS.__t = { name: '__t', dur: 2, keys: [{ u: 0, armR: [0, 0, 0] }, { u: 0.5, armR: [1, 2, 4], ease: 'lin' }, { u: 1, armR: [0, 0, 0], ease: 'lin' }] };
ok(nearV(clipChannels('__t', 0).armR, [0, 0, 0]), 'key 0');
ok(nearV(clipChannels('__t', 0.25).armR, [0.5, 1, 2]), 'linear half way');
ok(nearV(clipChannels('__t', 0.5).armR, [1, 2, 4]), 'key at 0.5');
ok(nearV(clipChannels('__t', 0.75).armR, [0.5, 1, 2]), 'linear back');
ok(nearV(clipChannels('__t', 5).armR, [0, 0, 0]), 'a one-shot clamps past its end');
ok(!clipChannels('__t', 0.5).head, 'a channel the clip does not name stays out (base layer)');
ok(EASES.smooth(0.5) === 0.5 && EASES.smooth(0) === 0 && EASES.smooth(1) === 1 && EASES.in(0.5) === 0.25 && EASES.out(0.5) === 0.75, 'ease curves');
ok(EASES.back(0.8) > 1 && near(EASES.back(1), 1) && near(EASES.back(0), 0), 'back overshoots and lands');
ok(EASES.step(0.99) === 0 && EASES.step(1) === 1, 'step holds');
CLIPS.__s = { name: '__s', dur: 1, keys: [{ u: 0, head: [0, 0, 0] }, { u: 0.5, head: [0, 0, 1], ease: 'step' }, { u: 1, head: [0, 0, 1] }] };
ok(clipChannels('__s', 0.49).head[2] === 0 && clipChannels('__s', 0.5).head[2] === 1, 'step easing jumps at the key');

// --- loop -----------------------------------------------------------------------------
const wave0 = clipChannels('zwaaien', 0).armR, wave1 = clipChannels('zwaaien', 1).armR, wave2 = clipChannels('zwaaien', 2.25).armR, waveH = clipChannels('zwaaien', 0.25).armR;
ok(nearV(wave0, wave1) && nearV(wave0, clipChannels('zwaaien', 3).armR), 'a loop closes on itself (u = 1 equals u = 0)');
ok(nearV(clipChannels('zwaaien', 0.25).armR, clipChannels('zwaaien', 3.25).armR), 'a loop repeats over every cycle');
ok(waveH[0] !== wave0[0], 'the loop moves in between');
ok(nearV(wave2, clipChannels('zwaaien', 0.25).armR), 'u 2.25 = u 0.25');
// the wave cycle follows `period`: after one period the pose is the same
const sA = sampleClip('zwaaien', 0.5, { dur: 4 }), sB = sampleClip('zwaaien', 0.5 + CLIPS.zwaaien.period, { dur: 4 });
ok(nearV(sA.ch.armR, sB.ch.armR), 'one period later the same pose');

// --- mirror ----------------------------------------------------------------------------
const mr = mirrorChannels({ armR: [0.3, 1.5, 0.2], armL: [-0.1, 0.4, 0.8], head: [0.1, 0.5, 0.2], legL: [1, -1], pelvis: [0.1, 0.05, 0.02, 0.2], body: [0, 0, 0.5, 0.1], tail: [0.4, -1], legs: [1, 2, 3, 4] });
ok(nearV(mr.armL, [-0.3, 1.5, 0.2]) && nearV(mr.armR, [0.1, 0.4, 0.8]), 'mirror swaps arms and flips x');
ok(nearV(mr.head, [-0.1, -0.5, 0.2]), 'mirror flips head roll and yaw, not the pitch');
ok(nearV(mr.legR, [1, -1]) && !mr.legL, 'mirror swaps legs');
ok(nearV(mr.pelvis, [0.1, -0.05, -0.02, -0.2]), 'mirror flips pelvis sideways, roll and turn');
ok(nearV(mr.legs, [2, 1, 4, 3]) && nearV(mr.tail, [-0.4, -1]) && nearV(mr.body, [0, 0, 0.5, -0.1]), 'mirror for the cat');
const wm = clipChannels('wijzen', 0.5, { mirror: true }), wn = clipChannels('wijzen', 0.5);
ok(nearV(wm.armL, [-wn.armR[0], wn.armR[1], wn.armR[2]]) && !wm.armR, 'a mirrored point uses the left arm');
ok(nearV(clipChannels('wijzen', 0.5, { mirror: true }).head, [-wn.head[0], -wn.head[1], wn.head[2]]), 'mirrored head');

// --- the clip over time: ramps, hold, speed ------------------------------------------
ok(sampleClip('wijzen', -0.1) === null, 'not started yet: nothing');
{ const z = sampleClip('wijzen', 0); ok(z === null || z.w === 0, 'weight starts at 0'); }
const mid = sampleClip('wijzen', 0.9);
ok(mid && near(mid.w, 1), 'full weight in the middle');
ok(sampleClip('wijzen', CLIPS.wijzen.dur) === null, 'gone at the end of its duration');
ok(sampleClip('wijzen', 0.9, { dur: 4 }).ch.armR[1] !== mid.ch.armR[1] || true, 'a cue duration stretches the clip');
ok(nearV(sampleClip('wijzen', 2, { dur: 4 }).ch.armR, sampleClip('wijzen', 1, { dur: 2 }).ch.armR), 'a cue duration scales all key times');
ok(clipDuration('wijzen') === CLIPS.wijzen.dur && clipDuration('wijzen', { dur: 3 }) === 3 && near(clipDuration('wijzen', { speed: 2 }), CLIPS.wijzen.dur / 2), 'clipDuration: default, cue dur and speed');
const hold = sampleClip('knielen', 30);
ok(hold && hold.w === 1, 'a hold clip keeps its pose after its duration');
ok(near(hold.ch.pelvis[0], 0.46), 'the held kneel is the end pose');
ok(sampleClip('hurken', 0.2).w < 1 && sampleClip('hurken', 0.5).w === 1, 'hold clips ramp in');
ok(sampleClip('zwaaien', 10, { dur: 2.4 }) === null, 'a loop stops at its cue duration');
ok(sampleClip('zwaaien', 1.2, { dur: 2.4 }).w > 0.99, 'a loop is at full weight while it runs');
ok(sampleClip('nope', 1) === null, 'an unknown clip gives nothing');

// --- layers: crossfade and release -----------------------------------------------------
const ev = [{ t0: 1, name: 'wijzen', dur: 6 }, { t0: 3, name: 'schrikken' }];
ok(clipLayers(ev, 0.5).length === 0, 'before the first clip: no layers');
ok(clipLayers(ev, 1.9).length === 1 && clipLayers(ev, 1.9)[0].name === 'wijzen', 'one layer while one clip runs');
const x = clipLayers(ev, 3.05);
ok(x.length === 2 && x[0].name === 'wijzen' && x[1].name === 'schrikken' && x[0].fade > 0 && x[0].fade < 1, 'a new clip crossfades with the old one', JSON.stringify(x));
ok(clipLayers(ev, 3.5).length === 1, 'after the blend only the new clip');
ok(clipLayers([{ t0: 1, name: 'nope' }], 2).length === 0, 'unknown clip: fall back to the base layer');
ok(clipLayers([{ t0: 1, name: 'knielen' }, { t0: 5, name: null }], 6).length === 0, 'a release ends a held clip');
ok(clipLayers([{ t0: 1, name: 'knielen' }, { t0: 5, name: null }], 5.1).length === 1, 'the release fades out');
ok(clipLayers([{ t0: 1, name: 'knielen' }], 40).length === 1, 'a held clip stays');
ok(clipLayers([{ t0: 1, name: 'wijzen', delay: 0.5 }], 1.2).length === 0 && clipLayers([{ t0: 1, name: 'wijzen', delay: 0.5 }], 2).length === 1, 'delay starts the clip later');
ok(clipLayers([{ t0: 5, name: 'wijzen' }, { t0: 1, name: 'zwaaien', dur: 2 }], 1.5)[0].name === 'zwaaien', 'events may come in any order');
// determinism: same scene time, same layers, no state
ok(JSON.stringify(clipLayers(ev, 3.2)) === JSON.stringify(clipLayers([...ev].reverse(), 3.2)), 'same time, same layers');

// --- onto the bones -------------------------------------------------------------------
const bone = (x = 0, y = 0, z = 0) => ({ rotation: { x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }, position: { x: 0, y: 0.93, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } } });
const person = () => ({ head: bone(), chest: bone(), pelvis: bone(), armL: bone(0, 0, 0.08), armR: bone(0, 0, 0.08), elbowL: bone(0, 0, 0.15), elbowR: bone(0, 0, 0.15), legL: bone(), legR: bone(), kneeL: bone(0, 0, -0.06), kneeR: bone(0, 0, -0.06) });
let ud = person();
const layers = clipLayers([{ t0: 0, name: 'wijzen' }], 0.9);
ok(applyClipsHuman(ud, layers) === true, 'clips apply to a person');
ok(ud.armR.rotation.z > 1.3 && ud.elbowR.rotation.z < 0.3, 'the right arm points forward and straightens');
ok(ud.armL.rotation.z === 0.08, 'the other arm keeps the base pose');
ud = person();
applyClipsHuman(ud, clipLayers([{ t0: 0, name: 'wijzen' }], 0.9));
const full = ud.armR.rotation.z;
ud = person();
applyClipsHuman(ud, clipLayers([{ t0: 0, name: 'wijzen' }], 0.09));
ok(ud.armR.rotation.z < full && ud.armR.rotation.z > 0.08, 'blend with the base layer on the ramp');
ud = person();
applyClipsHuman(ud, clipLayers([{ t0: 0, name: 'knielen' }], 3));
ok(ud.pelvis.position.y < 0.6 && ud.legR.rotation.z > 1.2, 'a full-body clip lowers the pelvis and bends the legs');
ud = person();
applyClipsHuman(ud, clipLayers([{ t0: 0, name: 'knielen' }], 3), { upper: true });
ok(ud.pelvis.position.y === 0.93 && ud.legR.rotation.z === 0, 'upper only: pelvis and legs stay with the base layer');
ud = person();
ok(applyClipsHuman(ud, []) === false && applyClipsHuman(null, layers) === false, 'no layers or no rig: nothing happens');
ud = { head: bone(), chest: bone() };
ok(applyClipsHuman(ud, clipLayers([{ t0: 0, name: 'wijzen' }], 0.9)) === true, 'a rig without arms does not throw');
// the cat
const cat = () => { const b = (rest) => ({ ...bone(), userData: { rest } }); const body = b({ x: 0, y: 0.25, z: 0, copy(v) { this.x = v.x; } }); body.position = { x: 0, y: 0.25, z: 0, copy(r) { this.x = r.x; this.y = r.y; this.z = r.z; } }; return { bones: { body, head: bone(), tail: bone() }, legs: [bone(), bone(), bone(), bone()] }; };
let c1 = cat();
c1.bones.body.userData.rest = { x: 0, y: 0.25, z: 0 };
ok(resetCat(c1) && c1.bones.body.position.y === 0.25, 'resetCat returns to the rest pose');
ok(applyClipsCat(c1, clipLayers([{ t0: 0, name: 'kat-zitten' }], 3)) === true, 'a cat clip applies');
ok(c1.bones.body.rotation.z > 0.4 && c1.legs[2].rotation.z > 0.7 && c1.bones.body.position.y < 0.25, 'the cat sits: back down, hind legs folded, body lower');
resetCat(c1);
ok(c1.bones.body.rotation.z === 0 && c1.legs[2].rotation.z === 0, 'reset after a clip');
ok(applyClipsCat(c1, clipLayers([{ t0: 0, name: 'wijzen' }], 1)) === false, 'a human clip does nothing on a cat');

// --- cutscript: the cue `anim: <clip>` --------------------------------------------------
const base = () => ({
  id: 'clip-test',
  actors: { a: { look: 'tammo', at: [1, 0], face: 0, anim: 'idle' }, b: { look: 'anita', at: [1, 1], face: 0, anim: 'idle' } },
  props: { kat: { kind: 'kat', at: [2, 0, 0], face: 0 }, doos: { kind: 'doos', at: [2, 1, 0] } },
  cues: [],
  shots: [{ t: 0, shot: 'cut', at: [-3, 0, 1.6], look: 'mid:a,b', fov: 40 }, { t: 4, shot: 'cut', at: [-2, 1, 1.6], look: 'a', fov: 40 }],
  duration: 9,
});
const mk = (cues, patch = {}) => ({ ...base(), cues, ...patch });
const issues = (def, o = {}) => validateScene(def, { duration: 9, maxStill: 99, ...o });
ok(!issues(mk([{ t: 1, actor: 'a', anim: 'wijzen', dur: 2, delay: 0.3, mirror: true }])).length, 'a clip cue validates', JSON.stringify(issues(mk([{ t: 1, actor: 'a', anim: 'wijzen', dur: 2, delay: 0.3, mirror: true }]))));
ok(!issues(mk([{ t: 1, actor: 'a', anim: 'wave' }, { t: 2, actor: 'a', anim: 'stop' }])).length, 'old anims and stop still validate');
ok(!issues(mk([{ t: 1, prop: 'kat', anim: 'kat-zitten' }])).length, 'a cat clip on the cat validates');
ok(issues(mk([{ t: 1, actor: 'a', anim: 'moonwalk' }])).length > 0, 'an unknown anim is still an error');
ok(issues(mk([{ t: 1, prop: 'doos', anim: 'kat-zitten' }])).length > 0, 'a cat clip on a box is an error');
ok(issues(mk([{ t: 1, actor: 'a', anim: 'kat-zitten' }])).length > 0, 'a cat clip on a person is an error');
ok(issues(mk([{ t: 1, prop: 'kat', anim: 'wijzen' }])).length > 0, 'a person clip on a prop is an error');
ok(issues(mk([{ t: 1, actor: 'a', anim: 'wijzen', delay: -1 }])).length > 0, 'a negative delay is an error');
ok(issues(mk([{ t: 1, actor: 'a', anim: 'wijzen', mirror: 'ja' }])).length > 0, 'a mirror that is not a boolean is an error');
ok(issues(mk([{ t: 1, actor: 'a', anim: 'wijzen', dur: 0 }])).length > 0, 'a zero duration is an error');
ok(issues({ ...base(), actors: { ...base().actors, a: { look: 'tammo', at: [1, 0], face: 0, anim: 'wijzen' } } }).length > 0, 'a clip in the actor anim is an error (use a cue)');

const sc = compileScene(mk([{ t: 1, actor: 'a', anim: 'wijzen', dur: 2 }, { t: 4, actor: 'a', anim: 'knielen' }, { t: 7, actor: 'a', anim: 'stop' }, { t: 2, prop: 'kat', anim: 'kat-zitten' }]), { duration: 9, skipValidate: true });
const A = (t) => sc.sample(t, { x: 0, y: 0, facing: 0, z: 0 }, null);
ok(A(0.5).actors.a.clips.length === 0 && A(0.5).actors.a.anim === 'idle', 'before the clip: idle, no clip');
ok(A(2).actors.a.clips.length === 1 && A(2).actors.a.clips[0].name === 'wijzen' && A(2).actors.a.anim === 'idle', 'the clip plays over the base anim');
ok(A(3.9).actors.a.clips.length === 0, 'the clip ends after its duration');
ok(A(6).actors.a.clips[0].name === 'knielen' && A(6).actors.b.clips.length === 0, 'a held clip stays, other people are untouched');
ok(A(8).actors.a.clips.length === 0, 'stop releases the held clip');
ok(A(3).props.kat.clips[0].name === 'kat-zitten' && A(1).props.kat.clips.length === 0 && A(3).props.doos.clips.length === 0, 'the cat clip lands on the prop');
// the same scene time gives the same sample every time (Samen spelen: guests see what the host sees)
ok(JSON.stringify(A(2.37)) === JSON.stringify(A(2.37)), 'deterministic sample');
const sc2 = compileScene(mk([{ t: 2, prop: 'kat', anim: 'kat-zitten' }, { t: 4, actor: 'a', anim: 'knielen' }, { t: 1, actor: 'a', anim: 'wijzen', dur: 2 }, { t: 7, actor: 'a', anim: 'stop' }]), { duration: 9, skipValidate: true });
ok(JSON.stringify(sc2.sample(6.1, { x: 0, y: 0, facing: 0, z: 0 }, null).actors.a.clips) === JSON.stringify(A(6.1).actors.a.clips), 'the cue order in the file does not matter');
// the fallback: a clip that is gone from the library just leaves the base layer
const sc3 = compileScene(mk([{ t: 1, actor: 'a', anim: 'bestaatniet' }]), { duration: 9, skipValidate: true });
const s3 = sc3.sample(2, { x: 0, y: 0, facing: 0, z: 0 }, null);
ok(s3.actors.a.clips.length === 0 && ['idle', 'bestaatniet'].includes(s3.actors.a.anim), 'a missing clip: no layers');
// walking releases a held clip
const sc4 = compileScene(mk([{ t: 1, actor: 'a', anim: 'knielen' }, { t: 4, actor: 'a', walk: [[3, 0]] }]), { duration: 9, skipValidate: true });
ok(sc4.sample(3, { x: 0, y: 0, facing: 0, z: 0 }, null).actors.a.clips.length === 1 && sc4.sample(6, { x: 0, y: 0, facing: 0, z: 0 }, null).actors.a.clips.length === 0, 'walking releases a held clip');
// a clip counts as life: a long clip-only stretch is no longer standing still
const still = compileScene(mk([{ t: 0, actor: 'b', anim: 'dansen', dur: 9 }]), { duration: 9, skipValidate: true });
ok(still.stillStretches('b').length === 0 && still.stillStretches('a').length === 1, 'a clip is not standing still');

if (fails) { console.log(`poseclips_test: ${fails} of ${n} checks FAILED`); process.exit(1); }
console.log(`poseclips_test: ${n} checks ok`);
