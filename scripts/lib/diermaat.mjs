// Real-world size of an animal model, measured on its skinned vertices in the pose it has now (call before animating for the
// bind pose): length along x (nose to tail tip), total height, and the shoulder height (schofthoogte): the highest vertex
// whose strongest bone is not part of the head, neck, ears, tail or mane, within the middle of the body (from 10 to 70% of the
// length, nose at +x: the neck on a body bone does not count). Import './node3d.mjs' (scripts/) first.
const THREE = await import('three');
const NOT_BODY = /head|neck|ear|horn|antler|jaw|eye|mouth|tongue|nose|tail|mane|hair|kuif/i;

export function measureAnimal(group) {
  group.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, schoft = -Infinity;
  const body = [];
  group.traverse((o) => {
    if (!o.isSkinnedMesh || !o.visible) return;
    o.skeleton.update();
    const g = o.geometry, p = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const bones = o.skeleton.bones;
    for (let i = 0; i < p.count; i++) {
      o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(v.x + v.y + v.z)) continue;
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      let best = 0;
      for (let c = 1; c < 4; c++) if (sw.getComponent(i, c) > sw.getComponent(i, best)) best = c;
      let b = bones[si.getComponent(i, best)], isBody = true;
      for (let k = 0; b && k < 12; k++, b = b.parent) if (b.isBone && NOT_BODY.test(b.name)) { isBody = false; break; }
      if (isBody) body.push(v.x, v.y);
    }
  });
  const L = x1 - x0;
  for (let i = 0; i < body.length; i += 2) if (body[i] >= x0 + 0.1 * L && body[i] <= x0 + 0.7 * L) schoft = Math.max(schoft, body[i + 1]);
  return { lengte: x1 - x0, hoogte: y1 - Math.min(0, y0), schoft: Number.isFinite(schoft) ? schoft - Math.min(0, y0) : null, bodem: y0 };
}
