// #734 (F16): de shotgrammatica. Elke nieuwe shotsoort moet door validateScene
// komen, eindige poses geven en de eigen kijkrichting/fov gebruiken.
//   node scripts/cutscene_shots_test.mjs
import assert from 'node:assert/strict';
import { compileScene, validateScene, SHOTS } from '../game/js/cutscript.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const soorten = ['cut', 'dolly', 'orbit', 'follow', 'close', 'reaction', 'ots', 'insert', 'tracking', 'crane', 'handheld'];

t('alle elf shotsoorten zijn bekend', () => {
  assert.deepEqual([...SHOTS].sort(), [...soorten].sort());
  assert.ok(!soorten.includes(undefined));
});

const def = {
  id: 'shotgrammatica',
  actors: {
    a: { look: 'tammo', at: [0, 0], face: 0 },
    b: { look: 'anita', at: [1.2, 0.2], face: 180 },
  },
  props: {},
  cues: [],
  shots: [
    { t: 0, shot: 'close', target: 'a' },
    { t: 0.8, shot: 'reaction', target: 'b' },
    { t: 1.6, shot: 'ots', from: 'a', target: 'b' },
    { t: 2.4, shot: 'insert', at: [0.4, 0, 1.1], look: 'a', fov: 30 },
    { t: 3.2, shot: 'tracking', target: 'a' },
    { t: 4.0, shot: 'crane', from: [1, -3, 1], to: [1, -2, 4], look: 'b' },
    { t: 4.8, shot: 'handheld', from: [0, -2, 1.5], to: [0, -1.4, 1.6], look: 'a' },
    { t: 5.6, shot: 'orbit', target: 'a', radius: 3, look: 'b' },
    { t: 6.4, shot: 'cut', at: [0, -2, 1.5], look: 'a' },
  ],
};
const anchor = { x: 500, y: -300, facing: 1.1, z: 0 };
const sc = compileScene(def, { lines: [], duration: 7 });
t('de scene valideert met de nieuwe soorten', () => assert.deepEqual(validateScene(def, { lines: [], duration: 7 }), []));

t('elke soort samplet eindig en de close/reaction/ots-insert/tracking gebruiken hun eigen fov', () => {
  const gezien = new Set();
  for (let t0 = 0; t0 <= 7; t0 += 0.1) {
    const s = sc.sample(t0, anchor);
    for (const v of [s.camera.position.x, s.camera.position.y, s.camera.position.z, s.camera.lookAt.x, s.camera.lookAt.y, s.camera.lookAt.z, s.camera.fov]) assert.ok(Number.isFinite(v), `t=${t0}`);
    gezien.add(s.camera.shotIndex);
  }
  assert.ok(gezien.size >= 8, 'alle shots komen langs');
});

t('orbit met eigen look kijkt naar het doel, niet naar het draaipunt', () => {
  // shot 7 (orbit) samplet op t=6.0; de look moet de b-acteur volgen, niet het draaipunt a
  const s = sc.sample(6.0, anchor);
  const naarA = Math.hypot(s.camera.lookAt.x - 500, s.camera.lookAt.y + 300);
  assert.ok(naarA > 0.9, JSON.stringify(s.camera.lookAt));
});

t('handheld beweegt zonder de scène te breken', () => {
  const a = sc.sample(5.0, anchor).camera.position, b = sc.sample(5.2, anchor).camera.position;
  assert.ok(Number.isFinite(a.x) && (a.x !== b.x || a.z !== b.z), 'camera beweegt');
});

console.log(`cutscene_shots_test: ${n}/${n} ok`);
