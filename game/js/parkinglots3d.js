import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { lotsNear, lotBays } from './parkinglots.js';
import { edgeDistance } from './countryfield.js';

// The real parking lots near the player (parkinglots.js): out in the
// Ommelanden the asphalt on the lot's real outline, everywhere the white
// lines of its bays. Streamed in and out like the shop fronts.

const STREAM_IN = 200;
const STREAM_OUT = 240;
const BUILDS_PER_TICK = 2;
const LINE_W = 0.12;

const asphalt = new THREE.MeshLambertMaterial({ color: 0x4a4c4f, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
const paint = new THREE.MeshBasicMaterial({ color: 0xe8e6de, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true, side: THREE.DoubleSide });

const live = new Map();
let tick = 0;

function lotMesh(map, f) {
  const g = new THREE.Group();
  g.name = 'parkinglot';
  const n = f.poly.length;
  const cx = f.poly.reduce((a, p) => a + p[0], 0) / n, cy = f.poly.reduce((a, p) => a + p[1], 0) / n;
  const h = map.spawnZ ? map.spawnZ(cx, cy) : 0;
  if (edgeDistance(cx, cy) > 0) {
    const pts = f.poly.slice(0, f.poly[0][0] === f.poly[n - 1][0] && f.poly[0][1] === f.poly[n - 1][1] ? n - 1 : n).map(([x, y]) => new THREE.Vector2(x, y));
    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    const pos = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = h + 0.04; pos[i * 3 + 2] = p.y; });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(tris.flat());
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, asphalt);
    m.receiveShadow = true;
    g.add(m);
  }
  // a line on each long side of every bay
  const quads = [];
  for (const b of lotBays(map, f)) {
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    for (const side of [-1, 1]) {
      const ox = -s * side * (b.wid / 2), oy = c * side * (b.wid / 2);
      quads.push([b.x + ox, b.y + oy, c, s, b.len]);
    }
  }
  if (quads.length) {
    const pos = new Float32Array(quads.length * 12);
    const idx = [];
    quads.forEach(([x, y, c, s, len], i) => {
      const hx = (c * len) / 2, hy = (s * len) / 2, wx = -s * LINE_W / 2, wy = c * LINE_W / 2;
      const corners = [[x - hx - wx, y - hy - wy], [x + hx - wx, y + hy - wy], [x + hx + wx, y + hy + wy], [x - hx + wx, y - hy + wy]];
      corners.forEach(([px, py], k) => { pos[i * 12 + k * 3] = px; pos[i * 12 + k * 3 + 1] = h + 0.07; pos[i * 12 + k * 3 + 2] = py; });
      idx.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4, i * 4 + 3, i * 4 + 2);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const lines = new THREE.Mesh(geo, paint);
    g.add(lines);
  }
  return g;
}

function dispose(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

export function updateParkingLots3D(world) {
  if ((tick = (tick + 1) % 15) !== 0) return;
  const scene = getScene();
  if (!scene) return;
  const p = hoofdspeler(world);
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  const near = new Set(lotsNear(px, py, STREAM_IN).filter((f) => f.poly && f._box && !f._noMesh &&
    Math.hypot(Math.max(0, f._box[0] - px, px - f._box[2]), Math.max(0, f._box[1] - py, py - f._box[3])) < STREAM_IN));
  for (const [f, g] of live) {
    const b = f._box;
    if (Math.hypot(Math.max(0, b[0] - px, px - b[2]), Math.max(0, b[1] - py, py - b[3])) > STREAM_OUT) {
      scene.remove(g);
      dispose(g);
      live.delete(f);
    }
  }
  let builds = 0;
  for (const f of near) {
    if (live.has(f) || builds >= BUILDS_PER_TICK) continue;
    builds++;
    if (lotBays(world.map, f).length < 2) { f._noMesh = true; continue; }
    const g = lotMesh(world.map, f);
    scene.add(g);
    live.set(f, g);
  }
}


