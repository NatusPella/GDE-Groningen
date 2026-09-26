// Props that story missions put into the world for a while: Jelle's giant
// flag on d'Olle Grieze (H10), held up by ropes a pigeon can peck loose.
// World (x, y, height) maps to three.js (x, height, y).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';

let flag = null;

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

export function updateStoryProps(dt) {
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
