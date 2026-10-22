// A blob shadow that is a child of a tilting mesh (the heli: pitch and roll on the whole mesh, order YZX) lies flat and straight under it (#391).
// Straight down in the mesh's own frame slid the blob sideways by alt x sin(tilt) and tilted it along: with the heli 30 m up and rolled 20 degrees
// the shadow lay 10 m beside it. The offset and the rotation get the tilt taken out again; the heading (rotation.y) stays.
// `mesh` and `sh` are three.js objects (only their quaternion methods are used); `drop` is the metres of the blob under the mesh origin.
export function levelShadow(sh, mesh, drop) {
  const h = mesh.rotation.y;
  const yaw = mesh.quaternion.clone().set(0, Math.sin(h / 2), 0, Math.cos(h / 2));
  const untilt = yaw.invert().multiply(mesh.quaternion.clone()).invert();
  sh.position.set(0, -drop, 0).applyQuaternion(untilt);
  sh.quaternion.copy(untilt);
}
