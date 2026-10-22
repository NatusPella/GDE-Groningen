// De naam van de winkel op de gevel (issue #156, 3D-kant): voor panden binnen bereik met een
// echte winkel erin (b.shopFront.name, gezet door models3d_buildings.js) hangt een bord in de
// bovenband van de pui. Het vlak en de tekst komen uit shopsign.js (met test); dit bestand is
// de lijm met de scene. Meldt zich in main.js als kind. Alleen verzonnen namen komen in beeld.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { signLayout, signText, signColors } from './shopsign.js';

const REACH = 42;         // m: borden van panden verder weg zijn niet nodig
const DROP = 56;          // m: daarna gaat het bord weer weg
const MAX_SIGNS = 28;
const PER_TICK = 3;
const textures = new Map();
const signs = new Map();  // pand -> { mesh, key }
let acc = 0;
let geo = null;

function texFor(text, hex) {
  const key = text + '|' + hex;
  let t = textures.get(key);
  if (t) { textures.delete(key); textures.set(key, t); return t; }
  const col = signColors(hex);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = col.bg;
  g.fillRect(0, 0, 512, 80);
  g.strokeStyle = col.accent;
  g.lineWidth = 3;
  g.strokeRect(4, 4, 504, 72);
  g.fillStyle = col.fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = "bold 50px 'Bebas Neue','Arial Narrow',Arial,sans-serif";
  g.fillText(text.toUpperCase(), 256, 43, 480);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(key, t);
  if (textures.size > 80) { const k = textures.keys().next().value; textures.get(k).dispose(); textures.delete(k); }
  return t;
}

function build(b) {
  const f = b.shopFront;
  const L = signLayout(f);
  if (!geo) geo = new THREE.PlaneGeometry(1, 1);
  const text = signText(f.name);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texFor(text, f.sign), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }));
  mesh.scale.set(L.w, L.h, 1);
  mesh.position.set(L.x, L.y, L.z);
  mesh.rotation.y = L.rotY;
  mesh.userData.noBatch = true;
  return mesh;
}

function drop(b, s) {
  const scene = getScene();
  if (scene && s.mesh.parent) scene.remove(s.mesh);
  s.mesh.material.dispose();
  signs.delete(b);
}

function tick(dt, w) {
  acc += dt;
  if (acc < 0.5) return;
  acc = 0;
  const scene = getScene();
  const p = w.player;
  if (!scene || !p || !w.map || !w.map.buildingsNear) return;
  for (const [b, s] of signs) {
    const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
    if (Math.hypot(cx - p.x, cy - p.y) > DROP || !b.shopFront) drop(b, s);
  }
  let made = 0;
  for (const b of w.map.buildingsNear(p.x, p.y, REACH)) {
    if (made >= PER_TICK || signs.size >= MAX_SIGNS) break;
    if (signs.has(b) || !b.shopFront || !b.shopFront.name) continue;
    const mesh = build(b);
    scene.add(mesh);
    signs.set(b, { mesh });
    made++;
  }
}

export const shopSignKind = { id: 'shopsigns', tickPhase: 'world', tick };
export const shopSignCount = () => signs.size;
