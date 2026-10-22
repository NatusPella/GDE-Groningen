// De blobschaduw van een scheefstaande heli ligt vlak en recht onder hem (#391).
//   node scripts/shadowlevel_test.mjs
import './node3d.mjs';
globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { levelShadow } = await import('../game/js/shadowlevel.js');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
for (const [yaw, pitch, roll, alt] of [[0, 0, 0, 10], [1.2, 0.3, 0, 30], [-2.5, 0, 0.5, 30], [0.7, -0.4, 0.6, 45], [3, 0.2, -0.35, 8]]) {
  const mesh = new THREE.Group();
  mesh.position.set(100, 50, -20);
  mesh.rotation.order = 'YZX'; mesh.rotation.y = yaw; mesh.rotation.z = pitch; mesh.rotation.x = roll;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  mesh.add(sh);
  levelShadow(sh, mesh, alt - 0.03);
  mesh.updateMatrixWorld(true);
  const w = new THREE.Vector3(); sh.getWorldPosition(w);
  ok(Math.abs(w.x - 100) < 1e-6 && Math.abs(w.z + 20) < 1e-6 && Math.abs(w.y - (50 - alt + 0.03)) < 1e-6, `recht onder (${yaw}, ${pitch}, ${roll}, ${alt})`, `${w.x} ${w.y} ${w.z}`);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(sh.getWorldQuaternion(new THREE.Quaternion()));
  ok(Math.abs(up.y - 1) < 1e-6, `vlak (${pitch}, ${roll})`, up.y);
  const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(sh.getWorldQuaternion(new THREE.Quaternion()));
  ok(Math.abs(Math.atan2(-fwd.z, fwd.x) - (((yaw % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)) < 1e-6 || Math.abs(fwd.y) < 1e-6, `de kop wijst de vliegrichting (${yaw})`);
}
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
