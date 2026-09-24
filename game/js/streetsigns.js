import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Dutch-style street-name signs (blue plate, white letters, on a grey pole)
// at both ends of every named road way - OSM splits streets at junctions, so
// way ends are almost always street corners. Only signs near the player are
// built; plate textures are cached per name while in use.

const SIGN_RADIUS = 70;
const REFRESH_INTERVAL = 0.5;
const DEDUPE_DIST = 25;
const INSET_ALONG = 3;
const KERB_GAP = 1.3;
const POLE_H = 2.7;
const PLATE_H = 0.62;
const TEXT_PX = 96;
const PLATE_COLOR = '#1f3f8f';

const POLE_GEO = new THREE.CylinderGeometry(0.035, 0.035, POLE_H, 6);
const POLE_MAT = new THREE.MeshStandardMaterial({ color: 0x8d9195, roughness: 0.6, metalness: 0.4 });
const PLATE_GEO = new THREE.BoxGeometry(1, 1, 0.03);
const PLATE_EDGE_MAT = new THREE.MeshStandardMaterial({ color: PLATE_COLOR, roughness: 0.5 });
const FACE_GEO = new THREE.PlaneGeometry(1, 1);

let signs = null;
let group = null;
let refreshTimer = 0;
const active = new Map();
const faceMaterials = new Map();

function buildSignIndex(map) {
  const list = [];
  const byName = new Map();
  for (const road of map.roads) {
    if (!road.name || road.pts.length < 2 || road.bridge) continue;
    if (road.cat === 'foot' || road.cat === 'cycle') continue;
    const n = road.pts.length;
    for (const [a, b] of [[road.pts[0], road.pts[1]], [road.pts[n - 1], road.pts[n - 2]]]) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < INSET_ALONG * 2) continue;
      const ux = dx / len, uy = dy / len;
      const off = (road.width || 6) / 2 + KERB_GAP;
      const x = a[0] + ux * INSET_ALONG - uy * off;
      const y = a[1] + uy * INSET_ALONG + ux * off;
      const same = byName.get(road.name) || [];
      if (same.some((s) => Math.hypot(s.x - x, s.y - y) < DEDUPE_DIST)) continue;
      const sign = { name: road.name, x, y, angle: Math.atan2(uy, ux) };
      same.push(sign);
      byName.set(road.name, same);
      list.push(sign);
    }
  }
  return list;
}

function faceMaterial(name) {
  let entry = faceMaterials.get(name);
  if (entry) { entry.users++; return entry; }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `bold ${TEXT_PX}px 'Arial Narrow', Arial, sans-serif`;
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(name).width);
  canvas.width = textW + TEXT_PX;
  canvas.height = Math.round(TEXT_PX * 1.45);
  ctx.fillStyle = PLATE_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.font = font;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2 + TEXT_PX * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
  entry = { material, aspect: canvas.width / canvas.height, users: 1 };
  faceMaterials.set(name, entry);
  return entry;
}

function releaseFace(name) {
  const entry = faceMaterials.get(name);
  if (!entry || --entry.users > 0) return;
  entry.material.map.dispose();
  entry.material.dispose();
  faceMaterials.delete(name);
}

function buildSignMesh(sign) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(POLE_GEO, POLE_MAT);
  pole.position.y = POLE_H / 2;
  g.add(pole);
  const face = faceMaterial(sign.name);
  const w = PLATE_H * face.aspect;
  const plate = new THREE.Mesh(PLATE_GEO, PLATE_EDGE_MAT);
  plate.scale.set(w, PLATE_H, 1);
  plate.position.y = POLE_H + PLATE_H / 2 - 0.05;
  g.add(plate);
  for (const side of [1, -1]) {
    const text = new THREE.Mesh(FACE_GEO, face.material);
    text.scale.set(w, PLATE_H, 1);
    text.position.set(0, plate.position.y, side * 0.016);
    if (side < 0) text.rotation.y = Math.PI;
    g.add(text);
  }
  g.position.set(sign.x, 0, sign.y);
  g.rotation.y = -sign.angle;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function updateStreetSigns(dt, world, scene) {
  if (!scene) return;
  if (!signs) {
    signs = buildSignIndex(world.map);
    group = new THREE.Group();
    scene.add(group);
  }
  refreshTimer -= dt;
  if (refreshTimer > 0) return;
  refreshTimer = REFRESH_INTERVAL;

  const px = world.player.x, py = world.player.y;
  const wanted = new Set();
  for (const s of signs) {
    if (Math.abs(s.x - px) > SIGN_RADIUS || Math.abs(s.y - py) > SIGN_RADIUS) continue;
    if (Math.hypot(s.x - px, s.y - py) > SIGN_RADIUS) continue;
    wanted.add(s);
    if (!active.has(s)) {
      const mesh = buildSignMesh(s);
      group.add(mesh);
      active.set(s, mesh);
    }
  }
  for (const [s, mesh] of active) {
    if (wanted.has(s)) continue;
    group.remove(mesh);
    releaseFace(s.name);
    active.delete(s);
  }
}
