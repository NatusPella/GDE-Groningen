// Floating origin (game/js/floatingorigin.js): at +-40 km a float32 world
// coordinate is ~4 mm coarse; relative to a render origin that follows the
// camera it is not.
//   node scripts/floatingorigin_test.mjs
import './node3d.mjs';

const { FloatingOrigin, renderOrigin } = await import('../game/js/floatingorigin.js');
const THREE = await import('three');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const f32 = Math.fround;

ok(renderOrigin.x === 0 && renderOrigin.y === 0 && renderOrigin.threshold === Infinity, 'inert in F0: origin (0, 0), no threshold');
ok(renderOrigin.toRender(123.4, -5.6).join() === '123.4,-5.6' && renderOrigin.rebaseIfNeeded(1e6, 1e6) === null, 'inert: identity, never rebases');

// the vertex of a prop at the camera, a world-baked mesh vs a render-relative mesh,
// through a float32 modelView (camera looking along +x, 1.7 m up)
function jitter(offsetX, offsetY, useOrigin) {
  const fo = new FloatingOrigin({ threshold: 2000 });
  let worst = 0;
  for (let k = 0; k < 400; k++) {
    const camX = offsetX + k * 0.37, camY = offsetY + k * 0.11;
    if (useOrigin) fo.rebaseIfNeeded(camX, camY);
    // a vertex 3.123 m ahead of the camera, in world doubles
    const vx = camX + 3.123, vy = camY + 0.456;
    // what reaches the GPU: vertex and camera, each stored as float32
    const [rvx, rvy] = useOrigin ? fo.toRender(vx, vy) : [vx, vy];
    const [rcx, rcy] = useOrigin ? fo.toRender(camX, camY) : [camX, camY];
    const px = f32(rvx) - f32(rcx), py = f32(rvy) - f32(rcy);
    worst = Math.max(worst, Math.hypot(px - 3.123, py - 0.456));
  }
  return { worst, rebases: fo.rebases };
}
for (const [ox, oy] of [[40000, 40000], [-26000, -38000], [44000, 42000], [-40000, 40000]]) {
  const bare = jitter(ox, oy, false), fo = jitter(ox, oy, true);
  ok(bare.worst > 1e-3, `without it at (${ox}, ${oy}): ${(bare.worst * 1000).toFixed(2)} mm of vertex error`, bare.worst);
  ok(fo.worst < 1e-3 && fo.worst < bare.worst / 5, `with it: ${(fo.worst * 1000).toFixed(3)} mm, ${fo.rebases} rebases`, fo.worst);
}

// rebase mechanics: whole kilometres, listeners, roots, uniform
{
  const fo = new FloatingOrigin({ threshold: 2000 });
  const seen = [];
  fo.onRebase((dx, dy) => seen.push([dx, dy]));
  const root = new THREE.Group();
  fo.attachRoot(root);
  ok(fo.rebaseIfNeeded(1500, 0) === null, 'inside the threshold: nothing happens');
  const d = fo.rebaseIfNeeded(40123.4, -26543.2);
  ok(d && fo.x === 40000 && fo.y === -27000 && seen.length === 1, 'jumps to the camera, in whole kilometres', `${fo.x},${fo.y}`);
  ok(root.position.x === -40000 && root.position.z === 27000 && root.position.y === 0, 'the scene root moves by -origin (three.js x, z)');
  ok(fo.uRenderOrigin.value.x === 40000 && fo.uRenderOrigin.value.y === -27000, 'uRenderOrigin follows');
  const [rx, ry] = fo.toRender(40123.4, -26543.2);
  const [wx, wy] = fo.fromRender(rx, ry);
  ok(wx === 40123.4 && wy === -26543.2, 'toRender and fromRender are inverses');
  ok(fo.toRenderXYZ(40100, 7, -27050).join() === '100,7,-50', 'three.js order');
  // world matrix of an object at its world position under the moved root
  root.updateMatrixWorld(true);
  const o = new THREE.Object3D();
  o.position.set(40123.4, 5, -26543.2);
  root.add(o);
  root.updateMatrixWorld(true);
  const m = new THREE.Matrix4().copy(o.matrixWorld);
  const pos = new THREE.Vector3().setFromMatrixPosition(m);
  ok(Math.abs(pos.x - 123.4) < 1e-9 && Math.abs(pos.z - 456.8) < 1e-9, 'a mesh built in world metres under the root lands where the render origin says', `${pos.x},${pos.z}`);
  // several rebases keep the doubles exact
  for (let k = 0; k < 50; k++) fo.rebaseIfNeeded(40000 + k * 3000, -27000 + k * 1500);
  ok(Number.isInteger(fo.x) && Number.isInteger(fo.y), 'many rebases: still whole kilometres');
}

console.log(`${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
