// Swimmer QA: builds the ambient swimmers (swimmers3d.js) in their swimwear
// and checks every pose over a full stroke cycle:
//   hands    never above the top of the head in the world (no drowning wave);
//            a back floater's hands stay in the water
//   float    the body of a back floater lies at the waterline, face up
//   sit      a bank sitter's feet reach under the water
//   node scripts/swim_audit.mjs
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';

const THREE = await import('three');
const { buildPersonMesh, swimPose, floatPose, seatPose, seatedY } = await import('../game/js/models3d_people.js');
const { WATER_Y } = await import('../game/js/util.js');

let fails = 0;
const v = new THREE.Vector3();
const world = (bone, y = 0) => bone.localToWorld(v.set(0, y, 0)).clone();
const handOf = (ud, k) => world(k ? ud.elbowR : ud.elbowL, -0.575);

for (const [variant, swim] of [['male', 'trunks'], ['female', 'swimsuit'], ['female', 'bikini']]) {
  const mesh = buildPersonMesh(0x1f3a8a, 0xcaa06f, { seed: 7, variant, swim, swimColor: 0x1f3a8a });
  const ud = mesh.userData;
  for (const mode of ['breast', 'tread', 'float']) {
    let worst = -Infinity, floatOk = true;
    for (let t = 0; t < 6; t += 0.05) {
      const tilt = mode === 'float' ? 1.42 : mode === 'breast' ? -1.1 : -0.2;
      const y = mode === 'float' ? WATER_Y - 0.1 : WATER_Y + 0.22 - 1.6 * Math.cos(tilt);
      mesh.position.set(0, y, 0);
      mesh.rotation.set(0, 0, tilt);
      if (mode === 'float') floatPose(mesh, t); else swimPose(mesh, t, mode === 'breast');
      mesh.updateMatrixWorld(true);
      const head = world(ud.head, 0.22);
      for (const k of [0, 1]) worst = Math.max(worst, handOf(ud, k).y - (mode === 'float' ? WATER_Y + 0.12 : head.y));
      if (mode === 'float') {
        const chest = world(ud.chest);
        if (Math.abs(chest.y - WATER_Y) > 0.25 || head.y < WATER_Y - 0.15) floatOk = false;
      }
    }
    const ok = worst < 0 && floatOk;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${swim.padEnd(9)} ${mode.padEnd(7)} ${mode === 'float' ? 'hand-over-water' : 'hand-over-head'} ${worst.toFixed(2)} m${mode === 'float' ? (floatOk ? ', at the waterline' : ', NOT at the waterline') : ''}`);
  }
  // on the bank: hips 0.4 m over the water, feet in it
  const bankZ = WATER_Y + 0.4;
  seatPose(mesh, { recline: 0.22, footX: 0.4, footY: -0.62, splay: 0.12, arms: 'behind' });
  mesh.position.set(0, seatedY(mesh, bankZ), 0);
  mesh.rotation.set(0, 0, 0);
  mesh.updateMatrixWorld(true);
  const foot = world(ud.kneeL, -0.42);
  const hand = handOf(ud, 0);
  const ok = foot.y < WATER_Y && hand.y < bankZ + 0.15 && hand.x < 0.05;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${swim.padEnd(9)} sit     foot ${(foot.y - WATER_Y).toFixed(2)} m vs water, hand ${(hand.y - bankZ).toFixed(2)} m vs bank, ${hand.x.toFixed(2)} m fore/aft`);
}
console.log(fails ? `\n${fails} swimmer check(s) failed` : '\nall swimmer poses ok');
process.exitCode = fails ? 1 : 0;
