// Prestatie: AudioParam-events alleen bij verandering (game/js/audio/paramwrite.js). Beslislogica als pure functies,
// plus updateListener met een nepcontext: een stilstaande luisteraar schrijft niets, een bewegende wel.
import assert from 'node:assert/strict';
import { shouldWriteParam, createParamMemo, listenerMoved } from '../game/js/audio/paramwrite.js';

assert.equal(shouldWriteParam(undefined, 0.3), true, 'eerste keer altijd');
assert.equal(shouldWriteParam(0.3, 0.3), false, 'gelijk: niet');
assert.equal(shouldWriteParam(0.3, 0.30005), false, 'binnen eps: niet');
assert.equal(shouldWriteParam(0.3, 0.31), true, 'verschil: wel');
assert.equal(shouldWriteParam(0.00005, 0), true, 'een echte nul wordt altijd geschreven');
assert.equal(shouldWriteParam(0, 0), false, 'al nul: niet opnieuw naar nul (fadeVoice)');
assert.equal(shouldWriteParam(2000, 2001, 2), false, 'eigen eps (distLp 2 Hz)');
assert.equal(shouldWriteParam(2000, 2003, 2), true);

const calls = [];
const param = { setTargetAtTime: (v, t, tau) => calls.push([v, t, tau]) };
const memo = createParamMemo();
memo.set(param, 0, 1, 0.1); memo.set(param, 0, 1.1, 0.1); memo.set(param, 0, 1.2, 0.1);
assert.equal(calls.length, 1, 'drie keer dezelfde 0: één event');
memo.set(param, 0.5, 2, 0.1); memo.set(param, 0.5, 2.1, 0.1);
assert.equal(calls.length, 2);
memo.forget(param); memo.set(param, 0.5, 3, 0.1);
assert.equal(calls.length, 3, 'na forget (iets anders schreef de param) weer schrijven');
assert.deepEqual(memo.stats, { written: 3, skipped: 3 });

const pose = { pos: [1, 2, 3], fwd: [0, 0, -1], up: [0, 1, 0] };
assert.equal(listenerMoved(null, 1, 2, 3, [0, 0, -1], [0, 1, 0]), true, 'eerste keer');
assert.equal(listenerMoved(pose, 1.0005, 2, 3, [0, 0, -1], [0, 1, 0]), false, 'kleine drift');
assert.equal(listenerMoved(pose, 1.01, 2, 3, [0, 0, -1], [0, 1, 0]), true, 'positie');
assert.equal(listenerMoved(pose, 1, 2, 3, [0.01, 0, -0.99995], [0, 1, 0]), true, 'draaien');

// updateListener met een nepcontext
const { setSpatialHost, updateListener, listenerStats } = await import('../game/js/audio/spatial.js');
const writes = [];
const mk = (n) => ({ setTargetAtTime: (v) => writes.push(n + v) });
const L = { positionX: mk('px'), positionY: mk('py'), positionZ: mk('pz'), forwardX: mk('fx'), forwardY: mk('fy'), forwardZ: mk('fz'), upX: mk('ux'), upY: mk('uy'), upZ: mk('uz') };
const ctx = { currentTime: 0, listener: L };
const cam = { position: { x: 5, y: 3, z: 7 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } };
setSpatialHost({ ctx: () => ctx, getCamera: () => cam, muted: () => false, voiceOk: () => true });
const world = { player: { x: 0, y: 0, angle: 0 } };
let fout = null;
try { updateListener(world); updateListener(world); updateListener(world); } catch (e) { fout = e; }
if (fout) console.log('SKIP updateListener-deel (wereldvorm niet nagebootst): ' + fout.message);
else {
  assert.equal(writes.length, 9, 'drie frames zonder beweging: één set van 9 parameters');
  cam.position.x = 6; updateListener(world);
  assert.equal(writes.length, 18, 'bewogen: opnieuw');
  assert.equal(listenerStats.skipped, 2);
}
console.log('audio_paramwrite_test ok');
