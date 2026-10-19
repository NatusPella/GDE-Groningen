import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { isInWater } from './util.js';
import { isInsideBuilding } from './pedgeom.js';
import { MARKT, isMarktFietsRoad } from './roadaccess.js';

// "Fietsroute, stapvoets" signs at the entrances of the bike route over the
// Grote Markt (rules and the painted lanes: roadaccess.js, roadsurface.js).
// Built once when the player first gets within reach of the square.
const SHOW_R = 320;
let group = null;
let built = false;

function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#1f4fa8';
  g.beginPath(); g.arc(128, 112, 104, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 8;
  g.beginPath(); g.arc(128, 112, 96, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(78, 138, 28, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(178, 138, 28, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  g.moveTo(78, 138); g.lineTo(108, 92); g.lineTo(150, 92); g.lineTo(178, 138);
  g.moveTo(78, 138); g.lineTo(128, 138); g.lineTo(108, 92);
  g.moveTo(128, 138); g.lineTo(150, 92);
  g.moveTo(98, 78); g.lineTo(116, 78);
  g.moveTo(150, 92); g.lineTo(144, 70); g.lineTo(162, 66);
  g.stroke();
  g.fillStyle = '#fff'; g.fillRect(24, 232, 208, 76);
  g.fillStyle = '#1f4fa8'; g.font = 'bold 38px Arial'; g.textAlign = 'center';
  g.fillText('FIETSROUTE', 128, 266);
  g.font = 'bold 34px Arial';
  g.fillText('stapvoets', 128, 300);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Where the signs stand: the outer ends of the bike-route ways, a metre beside the way.
export function signSpots(map) {
  const out = [];
  for (const r of map.roads) {
    if (!isMarktFietsRoad(r)) continue;
    const n = r.pts.length;
    for (const [a, b] of [[r.pts[0], r.pts[1]], [r.pts[n - 1], r.pts[n - 2]]]) {
      if (Math.hypot(a[0] - MARKT.x, a[1] - MARKT.y) < 55) continue;
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l;
      for (const side of [1, -1]) {
        const x = a[0] + ux * 3 - uy * side * ((r.width || 4) / 2 + 0.9), y = a[1] + uy * 3 + ux * side * ((r.width || 4) / 2 + 0.9);
        if (isInsideBuilding(map, x, y) || isInWater(map, x, y)) continue;
        if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 14)) break;
        out.push({ x, y, face: Math.atan2(-uy, -ux) });
        break;
      }
    }
  }
  return out;
}

export function updateMarktSigns(dt, w) {
  if (built || !w.map || !w.player) return;
  if (Math.hypot(w.player.x - MARKT.x, w.player.y - MARKT.y) > SHOW_R) return;
  built = true;
  const scene = getScene();
  if (!scene) { built = false; return; }
  group = new THREE.Group();
  const tex = plateTexture();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a4e52, metalness: 0.5, roughness: 0.6 });
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  for (const s of signSpots(w.map)) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 6), poleMat);
    pole.position.y = 1.25;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), faceMat);
    face.position.y = 2.05;
    g.add(pole, face);
    const gy = w.map.groundHeightAt ? w.map.groundHeightAt(s.x, s.y) : 0;
    g.position.set(s.x, Number.isFinite(gy) ? gy : 0, s.y);
    g.rotation.y = -s.face + Math.PI / 2;
    group.add(g);
  }
  scene.add(group);
}

export function resetMarktSigns() {
  if (group && group.parent) group.parent.remove(group);
  group = null;
  built = false;
}
