// In-world markers of the active route that depend on how you travel
// (docs/PROVINCIE-PLAN.md 2.23): buoys along a boat route, a station sign at
// the stations of a train trip, air rings with a landing pad in the air. On
// the road the route ribbon and the waypoint beacon (scene3d.js) are the
// markers; the bike ribbon only takes its own colour (routeColor).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y } from './util.js';

const MODE_COLOR = { walk: 0xc068ff, bike: 0x2fb8a0, drive: 0xc068ff, boat: 0xff6a3c, ov: 0x2d5fa8, fly: 0xffd23c };
// the ribbon's colour: a route to a mission keeps the mission colour, a bike route its own
export const routeColor = (route, fallback) => (route && route.mode === 'bike' && route.kind === 'user' ? MODE_COLOR.bike : fallback);

const BUOY_EVERY_M = 40;
const BUOYS = 12;
const RING_EVERY_M = 120;
const RINGS = 5;

let root = null;
const parts = { buoys: [], rings: [], signs: new Map(), pad: null };

function buoy() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 10), new THREE.MeshLambertMaterial({ color: 0xd8321f }));
  cone.position.y = 0.65;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.37, 0.28, 10), new THREE.MeshLambertMaterial({ color: 0xf4f0e6 }));
  band.position.y = 0.45;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  lamp.position.y = 1.4;
  g.add(cone, band, lamp);
  return g;
}

function ring(color) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(7, 0.35, 8, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  m.frustumCulled = false;
  return m;
}

function signCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#2d5fa8'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#f2ede0'; g.lineWidth = 5; g.strokeRect(5, 5, 246, 86);
  g.fillStyle = '#f2ede0'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text.length > 18 ? `${text.slice(0, 17)}…` : text, 128, 48);
  return c;
}

function stationSign(text) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 8), new THREE.MeshLambertMaterial({ color: 0x3a3f46 }));
  pole.position.y = 1.7;
  const tex = new THREE.CanvasTexture(signCanvas(text));
  tex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.97), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  plaque.position.y = 3.6;
  plaque.userData.billboard = true;
  g.add(pole, plaque);
  g.userData.plaque = plaque;
  return g;
}

function padMesh() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.5, depthWrite: false }));
  disc.position.y = 0.12;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 30;
  g.add(disc, beam);
  return g;
}

function ensure(scene) {
  if (root) return;
  root = new THREE.Group();
  root.visible = false;
  for (let i = 0; i < BUOYS; i++) { const b = buoy(); b.visible = false; root.add(b); parts.buoys.push(b); }
  for (let i = 0; i < RINGS; i++) { const r = ring(MODE_COLOR.fly); r.visible = false; root.add(r); parts.rings.push(r); }
  parts.pad = padMesh();
  parts.pad.visible = false;
  root.add(parts.pad);
  scene.add(root);
}

// the points every `step` metres along the remaining route (from `ahead`, [[x, y], ...])
function sample(ahead, step, n) {
  const out = [];
  let carry = step * 0.5;
  for (let i = 1; i < ahead.length && out.length < n; i++) {
    const a = ahead[i - 1], b = ahead[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = carry;
    while (d <= L && out.length < n) {
      const t = d / (L || 1);
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / (L || 1), dy: (b[1] - a[1]) / (L || 1) });
      d += step;
    }
    carry = d - L;
  }
  return out;
}

// route: the active route (routing.js), ahead: getRouteAhead(...) or null
export function updateWaymarkers3D(scene, time, route, ahead, camera) {
  ensure(scene);
  const mode = route && route.mode;
  const show = !!route && (mode === 'boat' || mode === 'ov' || mode === 'fly') && route.remaining > 10;
  root.visible = show;
  if (!show) return;
  const bob = Math.sin(time * 1.6);
  const buoys = mode === 'boat' && ahead ? sample(ahead, BUOY_EVERY_M, BUOYS) : [];
  parts.buoys.forEach((b, i) => {
    const s = buoys[i];
    b.visible = !!s;
    if (!s) return;
    b.position.set(s.x - s.dy * 5, WATER_Y + 0.15 + bob * 0.08 + Math.sin(time * 1.3 + i) * 0.06, s.y + s.dx * 5);
    b.rotation.z = Math.sin(time * 1.1 + i * 2) * 0.08;
  });
  const alt = route.alt || 80;
  const rings = mode === 'fly' && ahead ? sample(ahead, RING_EVERY_M, RINGS) : [];
  parts.rings.forEach((r, i) => {
    const s = rings[i];
    r.visible = !!s;
    if (!s) return;
    r.position.set(s.x, alt, s.y);
    r.rotation.set(0, Math.atan2(-s.dy, s.dx) + Math.PI / 2, 0);
    r.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.04);
  });
  const L = mode === 'fly' ? route.landing : null;
  parts.pad.visible = !!L;
  if (L) parts.pad.position.set(L.x, 0, L.y);
  // station signs: one per stop of the trip, made the first time they are needed
  const stops = mode === 'ov' ? route.stops || [] : [];
  const live = new Set();
  for (const st of stops) {
    const key = `${st.name}|${st.kind}`;
    live.add(key);
    let sign = parts.signs.get(key);
    if (!sign) {
      sign = stationSign(st.kind === 'uitstap' ? `Uitstappen: ${st.name.replace(/^Groningen\s+/, '')}` : st.kind === 'overstap' ? `Overstappen: ${st.name.replace(/^Groningen\s+/, '')}` : st.name.replace(/^Groningen\s+/, ''));
      sign.position.set(st.x, 0, st.y);
      root.add(sign);
      parts.signs.set(key, sign);
    }
    sign.visible = true;
    if (camera) sign.userData.plaque.lookAt(camera.position.x, sign.userData.plaque.position.y, camera.position.z);
  }
  for (const [k, sign] of parts.signs) if (!live.has(k)) sign.visible = false;
}

export function hideWaymarkers3D() {
  if (root) root.visible = false;
}
