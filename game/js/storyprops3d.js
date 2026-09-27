// Props that story missions put into the world for a while: Jelle's giant
// flag on d'Olle Grieze (H10), held up by ropes a pigeon can peck loose, and
// the mast and tanned sail of his skûtsje (H14), riding on a boat vehicle.
// World (x, y, height) maps to three.js (x, height, y).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';

let flag = null;
let sail = null;

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ea';
  g.fillRect(0, 0, 256, 384);
  // diagonal blue stripes with red leaves: a friendly nod to the pompeblêd
  g.save();
  g.translate(128, 192);
  g.rotate(-0.62);
  g.fillStyle = '#2553a6';
  for (let k = -5; k <= 5; k += 2) g.fillRect(-400, k * 44 - 22, 800, 44);
  g.restore();
  g.fillStyle = '#c8102e';
  for (const [x, y] of [[60, 70], [190, 120], [80, 210], [200, 280], [70, 330]]) {
    g.beginPath();
    g.moveTo(x, y + 26);
    g.bezierCurveTo(x - 34, y - 2, x - 14, y - 30, x, y - 10);
    g.bezierCurveTo(x + 14, y - 30, x + 34, y - 2, x, y + 26);
    g.fill();
  }
  g.fillStyle = '#141414';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.fillText('MOAI!', 128, 372);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A banner hanging on the tower between heights z0 and z1, centred on (x, y)
// and facing +y; ropes: [{ x, y, z }] knots (glowing targets) holding it.
export function showTowerFlag({ x, y, z0, z1, width, ropes }) {
  clearStoryProps();
  const scene = getScene && getScene();
  if (!scene) return false;
  const group = new THREE.Group();
  group.name = 'story-flag';
  const tex = flagTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(width, z1 - z0, 6, 8), mat);
  cloth.position.set(x, (z0 + z1) / 2, y);
  group.add(cloth);
  const knotGeo = new THREE.SphereGeometry(0.7, 12, 8);
  const knotMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  // ropes run from each knot back to the tower wall (towards -y)
  const ropeGeo = new THREE.BoxGeometry(0.12, 0.12, 5);
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x6b5a3a });
  const knots = ropes.map((r) => {
    const k = new THREE.Group();
    const ball = new THREE.Mesh(knotGeo, knotMat);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.z = -2.5;
    k.add(ball, rope);
    k.position.set(r.x, r.z, r.y);
    group.add(k);
    return k;
  });
  scene.add(group);
  flag = { group, cloth, knots, mat, tex, t: 0, cut: 0, fall: -1, base: { x, y, z0, z1 }, geos: [cloth.geometry, knotGeo, ropeGeo], mats: [mat, knotMat, ropeMat] };
  return true;
}

// Rope k pecked loose: its knot goes and the banner sags a little further.
export function cutFlagRope(k) {
  if (!flag || !flag.knots[k] || !flag.knots[k].visible) return;
  flag.knots[k].visible = false;
  flag.cut++;
}

export function dropFlag() {
  if (flag && flag.fall < 0) flag.fall = 0;
}

// Mast, gaff sail and pennant on boat vehicle v (bow = +x in boat space).
export function showSkutsjeSail(v) {
  clearSkutsjeSail();
  const scene = getScene && getScene();
  if (!scene) return false;
  const group = new THREE.Group();
  group.name = 'story-sail';
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a3d22 });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0x8a3b1e, side: THREE.DoubleSide });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0x2553a6, side: THREE.DoubleSide });
  const mastGeo = new THREE.CylinderGeometry(0.09, 0.12, 9, 6);
  const mast = new THREE.Mesh(mastGeo, woodMat);
  mast.position.set(1.2, 5, 0);
  const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.2, 5);
  const boom = new THREE.Mesh(boomGeo, woodMat);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-1.4, 1.9, 0);
  // a four-sided gaff sail aft of the mast
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(-5, 0); shape.lineTo(-4.2, 5.2); shape.lineTo(0, 6.4); shape.lineTo(0, 0);
  const sailGeo = new THREE.ShapeGeometry(shape);
  const cloth = new THREE.Mesh(sailGeo, sailMat);
  cloth.position.set(1.1, 2, 0);
  const flagGeo = new THREE.PlaneGeometry(1.1, 0.5);
  const pennant = new THREE.Mesh(flagGeo, flagMat);
  pennant.position.set(0.6, 9.3, 0);
  const inner = new THREE.Group();
  inner.add(mast, boom, cloth, pennant);
  group.add(inner);
  scene.add(group);
  sail = { v, group, cloth, pennant, t: 0, geos: [mastGeo, boomGeo, sailGeo, flagGeo], mats: [woodMat, sailMat, flagMat] };
  return true;
}

export function clearSkutsjeSail() {
  if (!sail) return;
  sail.group.removeFromParent();
  for (const g of sail.geos) g.dispose();
  for (const m of sail.mats) m.dispose();
  sail = null;
}

function updateSail(dt) {
  const q = sail;
  q.t += dt;
  const v = q.v;
  q.group.position.set(v.x, 0.35 + (v.z || 0), v.y);
  q.group.rotation.y = -v.angle;
  q.cloth.rotation.y = 0.25 + Math.sin(q.t * 0.7) * 0.05;
  q.pennant.rotation.y = Math.sin(q.t * 4) * 0.3;
  if (v.wrecked || v.sinking) clearSkutsjeSail();
}

export function updateStoryProps(dt) {
  if (sail) updateSail(dt);
  if (!flag) return;
  const f = flag;
  f.t += dt;
  const c = f.cloth;
  const h = f.base.z1 - f.base.z0;
  if (f.fall < 0) {
    // wind ripple, and a lean for every rope that's gone
    c.rotation.z = Math.sin(f.t * 1.3) * 0.015 + f.cut * 0.035;
    c.rotation.x = Math.sin(f.t * 0.9) * 0.03 - f.cut * 0.02;
    return;
  }
  f.fall += dt;
  const u = Math.min(1, f.fall / 2.6);
  const e = u * u;
  c.position.y = (f.base.z0 + f.base.z1) / 2 * (1 - e) + 0.15 * e;
  c.position.z = f.base.y + e * (h / 2 + 2);
  c.rotation.x = -e * Math.PI / 2;
  c.rotation.z = (1 - e) * 0.2;
  if (f.fall > 90) clearStoryProps();
}

export function clearStoryProps() {
  if (!flag) return;
  flag.group.removeFromParent();
  for (const g of flag.geos) g.dispose();
  for (const m of flag.mats) m.dispose();
  flag.tex.dispose();
  flag = null;
}
