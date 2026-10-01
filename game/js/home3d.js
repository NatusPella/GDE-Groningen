import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildBuildingMesh } from './models3d_buildings.js';

// Meshes for Tammo and Anita's home (home.js): the private garage in the
// plinth of their flat, the lobby door with the bike rack, the flat's floor
// as a cutaway (only while they are upstairs) and the tower below it.
// Geometry is baked in world coordinates, like the buildings.

const lit = (hex, glow = 0.18) => {
  const m = new THREE.MeshLambertMaterial({ color: hex });
  m.emissive = new THREE.Color(hex).multiplyScalar(glow);
  return m;
};
const M = {
  concrete: lit(0x8d8f8c), floor: lit(0x5d6062, 0.12), wall: lit(0xb7b1a6), roof: lit(0x3f4245),
  door: lit(0xc2c5c8), trim: lit(0x2f6fb0), line: new THREE.MeshBasicMaterial({ color: 0xe9e6dc }),
  hero: lit(0x8e2323, 0.1), lamp: new THREE.MeshBasicMaterial({ color: 0xfff1cf }), steel: lit(0x8a9096, 0.1),
  glass: new THREE.MeshLambertMaterial({ color: 0x9fc4d6, transparent: true, opacity: 0.28, depthWrite: false }),
  frame: lit(0x2b2d30, 0.1), screen: new THREE.MeshBasicMaterial({ color: 0x3fc97a }),
  laminate: lit(0xb88d5f, 0.22), tiles: lit(0xd9d6cf, 0.22), carpet: lit(0x6f86a3, 0.2), innerWall: lit(0xece6da, 0.25),
  sofa: lit(0x3f5d4a, 0.2), wood: lit(0x7a5436, 0.2), white: lit(0xf1efe9, 0.25), black: lit(0x1d1f22, 0.1),
  bed: lit(0xe4dccb, 0.25), duvet: lit(0x2f6fb0, 0.2), rug: lit(0xa8452f, 0.2), oil: lit(0xd9a53a, 0.35),
  fridge: lit(0xdfe3e6, 0.25), tvScreen: new THREE.MeshBasicMaterial({ color: 0x1b2a38 }), plant: lit(0x3c7a3a, 0.2),
};
for (const m of Object.values(M)) m.userData.shared = true;
const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.userData.shared = true;
const CUT_H = 1.05; // the flat's walls, cut away at hip height

function box(group, mat, x, y, z, sx, sy, sz, rotY = 0) {
  const m = new THREE.Mesh(BOX, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.y = rotY;
  group.add(m);
  return m;
}

// A box spanning world segment (x1,y1)-(x2,y2), thickness t, from y0 to y0+h.
function segBox(group, mat, x1, y1, x2, y2, t, y0, h) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return box(group, mat, (x1 + x2) / 2, y0 + h / 2, (y1 + y2) / 2, len, h, t, -Math.atan2(y2 - y1, x2 - x1));
}

function flatShape(pts, y, mat, group, thick = 0) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = thick ? new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }) : new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  const m = new THREE.Mesh(geo, mat);
  group.add(m);
  return m;
}

function signTexture(text, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1c1f';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#2f6fb0';
  g.fillRect(0, 112, 512, 16);
  g.fillStyle = '#f4f2ec';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 54px sans-serif';
  g.fillText(text, 256, 46);
  g.font = '26px sans-serif';
  g.fillStyle = 'rgba(244,242,236,0.75)';
  g.fillText(sub, 256, 92);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- garage + lobby ------------------------------------------------------------

// home: the layout from home.js (polygon, walls, bays, door, panel, rack, lobby).
export function buildHomeExterior3D(home) {
  const g = new THREE.Group();
  const H = home.garage.height;
  flatShape(home.garage.poly, 0.035, M.floor, g);
  const walls = new THREE.Group();
  for (const [x1, y1, x2, y2] of home.garage.walls) segBox(walls, M.wall, x1, y1, x2, y2, 0.3, 0, H);
  g.add(walls);
  const roof = new THREE.Group();
  flatShape(home.garage.poly, H, M.roof, roof, 0.3);
  for (const l of home.garage.lamps) box(roof, M.lamp, l.x, H - 0.04, l.y, 2.2, 0.05, 0.25, -l.angle);
  g.add(roof);
  // bay markings: one line between each pair of bays, a red floor for the Escapade
  for (const b of home.garage.bays) {
    const fx = Math.cos(b.angle), fy = Math.sin(b.angle), sx = -fy, sy = fx;
    for (const s of [-1, 1]) {
      const cx = b.x + sx * s * b.w / 2, cy = b.y + sy * s * b.w / 2;
      box(g, M.line, cx, 0.045, cy, b.d * 0.9, 0.01, 0.1, -b.angle);
    }
    if (b.hero) box(g, M.hero, b.x, 0.04, b.y, b.d * 0.85, 0.01, b.w - 0.3, -b.angle);
  }
  const d = home.garage.door;
  const door = segBox(g, M.door, d.x1, d.y1, d.x2, d.y2, 0.12, 0, H - 0.1);
  g.userData.door = door;
  const tex = signTexture('Privégarage', 'Tammo & Anita');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(d.cx + d.nx * 0.2, H + 0.7, d.cy + d.ny * 0.2);
  sign.rotation.y = -Math.atan2(d.ny, d.nx) + Math.PI / 2;
  g.add(sign);
  g.userData.sign = sign;
  const p = home.garage.panel;
  box(g, M.frame, p.x, 1.3, p.y, 0.5, 0.8, 0.12, -p.angle);
  box(g, M.screen, p.x + Math.cos(p.angle) * 0.07, 1.4, p.y + Math.sin(p.angle) * 0.07, 0.36, 0.4, 0.02, -p.angle);
  // lobby: glass door with a canopy, a rail for the bikes on either side
  const L = home.lobby;
  const lx = Math.cos(L.angle), ly = Math.sin(L.angle);
  const ax = -ly, ay = lx;
  box(g, M.frame, L.x + lx * 0.12, 1.35, L.y + ly * 0.12, 0.14, 2.7, 2.4, -L.angle);
  box(g, M.glass, L.x + lx * 0.2, 1.3, L.y + ly * 0.2, 0.04, 2.5, 2.1, -L.angle);
  box(g, M.roof, L.x + lx * 1.2, 3.05, L.y + ly * 1.2, 2.4, 0.16, 3.4, -L.angle);
  for (const s of [-1, 1]) box(g, M.steel, L.x + lx * 2.25 + ax * s * 1.55, 1.5, L.y + ly * 2.25 + ay * s * 1.55, 0.1, 3.0, 0.1);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTexture('Voordeur', 'Lift naar de 11e') }));
  front.position.set(L.x + lx * 0.16, 3.6, L.y + ly * 0.16);
  front.rotation.y = -L.angle + Math.PI / 2;
  g.add(front);
  for (const r of home.rack.rails) segBox(g, M.steel, r.x1, r.y1, r.x2, r.y2, 0.06, 0.62, 0.06);
  for (const r of home.rack.rails) {
    const n = Math.max(2, Math.round(Math.hypot(r.x2 - r.x1, r.y2 - r.y1) / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      box(g, M.steel, r.x1 + (r.x2 - r.x1) * t, 0.33, r.y1 + (r.y2 - r.y1) * t, 0.06, 0.62, 0.06);
    }
  }
  g.userData.walls = walls;
  g.userData.roof = roof;
  return g;
}

// Walls down and roof off while the player is inside the garage.
export function setGarageCutaway(root, k) {
  const { walls, roof } = root.userData;
  roof.visible = k < 0.5;
  const s = 1 - 0.72 * k;
  walls.scale.y = s;
}

export function setGarageDoor(root, open, H) {
  const door = root.userData.door;
  door.scale.y = Math.max(0.04, (H - 0.1) * (1 - open));
  door.position.y = H - 0.05 - door.scale.y / 2;
}

export function disposeHomeExterior(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if (m && !m.userData.shared) { if (m.map) m.map.dispose(); m.dispose(); }
  });
}

// --- the flat -----------------------------------------------------------------

// The tower up to the flat's floor, standing in for the full building while
// the upper floors are hidden.
export function buildLowerTower3D(tower, levels) {
  const pts = tower.pts.map((p) => [p[0], p[1]]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return buildBuildingMesh({ pts, h: levels, type: tower.type || 'apartments', bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
}

// Interior in the flat's local frame (x along the facade, z inward, y up),
// placed at the flat's origin. flat: layout from home.js; skip: the stock
// pieces an EIKEA piece replaces (furniture.js).
export function buildFlat3D(flat, skip = new Set()) {
  const g = new THREE.Group();
  const W = flat.w, D = flat.d, T = flat.tower;
  const low = CUT_H;
  // the whole floor slab of the tower, a parapet round it and the other flats as closed blocks
  const slab = new THREE.Group();
  // one storey of plain wall under the floor hides the roof clutter of the tower below
  box(slab, M.wall, T.w / 2, -1.6, T.d / 2, T.w, 3.2, T.d);
  box(slab, M.concrete, T.w / 2, -0.1, T.d / 2, T.w + 0.2, 0.2, T.d + 0.2);
  // (no parapet in front of the flat's own glass and garage-side wall)
  for (const [x, z, sx, sz] of [[(W + T.w) / 2, 0, T.w - W, 0.2], [T.w / 2, T.d, T.w, 0.2], [0, (D + T.d) / 2, 0.2, T.d - D], [T.w, T.d / 2, 0.2, T.d]]) box(slab, M.concrete, x, 0.5, z, sx, 1, sz);
  // the neighbours' flats, cut off at the same height as our walls; a corridor
  // behind the hall leads to the lift
  const cor = 1.8;
  for (const [x0, z0, x1, z1] of [[W + 0.3, 0.3, T.w - 0.3, T.d * 0.48], [W + 0.3, T.d * 0.48 + 0.3, T.w - 0.3, T.d - 0.3], [0.3, D + cor, W * 0.5, T.d - 0.3], [W * 0.5 + 0.3, D + cor, W + 0.3, T.d - 0.3]]) {
    box(slab, M.wall, (x0 + x1) / 2, low / 2, (z0 + z1) / 2, x1 - x0, low, z1 - z0);
    box(slab, M.roof, (x0 + x1) / 2, low + 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0);
  }
  box(slab, M.tiles, W / 2, 0.01, D + cor / 2, W, 0.02, cor - 0.1);
  g.add(slab);
  // floors: laminate in the living room, tiles in the kitchen and hall, carpet in the bedroom
  for (const r of flat.rooms) box(g, M[r.floor], (r.x0 + r.x1) / 2, 0.01, (r.z0 + r.z1) / 2, r.x1 - r.x0, 0.02, r.z1 - r.z0);
  // facade: glass from floor to ceiling in dark frames (lowered by setFlatFacade)
  const facade = new THREE.Group();
  box(facade, M.glass, W / 2, 1.4, 0.05, W, 2.8, 0.04);
  for (let x = 0; x <= W + 0.01; x += W / 5) box(facade, M.frame, x, 1.4, 0.05, 0.08, 2.8, 0.1);
  box(facade, M.frame, W / 2, 2.8, 0.05, W, 0.1, 0.12);
  box(facade, M.frame, W / 2, 0.05, 0.05, W, 0.1, 0.12);
  g.add(facade);
  g.userData.facade = facade;
  // cutaway walls
  for (const [x1, z1, x2, z2] of flat.walls) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    box(g, M.innerWall, (x1 + x2) / 2, low / 2, (z1 + z2) / 2, len, low, 0.14, -Math.atan2(z2 - z1, x2 - x1));
  }
  // front door in the hall, the lift right behind it in the corridor, a doormat
  const fd = flat.spots.door;
  box(g, M.steel, fd.x, low / 2 + 0.02, fd.z + 0.02, 1.2, low + 0.04, 0.18);
  box(g, M.screen, fd.x + 0.8, 0.9, fd.z - 0.08, 0.14, 0.2, 0.02);
  box(g, M.steel, fd.x, low / 2, D + cor - 0.35, 1.6, low, 0.5);
  box(g, M.rug, fd.x, 0.025, fd.z - 0.6, 1.1, 0.01, 0.7);
  // the door to the roof stairs on the hall's side wall, with its sign
  const rd = flat.spots.roof;
  if (rd) {
    box(g, M.frame, rd.x, low / 2 + 0.02, rd.z, 0.14, low + 0.04, 1.05);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: signTexture('DAK', 'helidek') }));
    sign.position.set(rd.x + 0.09, low + 0.3, rd.z);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);
  }
  // living room: sofa, coffee table, rug, tv, a plant by the window
  const s = flat.spots;
  box(g, M.rug, s.sofa.x, 0.025, s.sofa.z - 1.4, 3.0, 0.01, 2.0);
  if (!skip.has('bank')) {
    box(g, M.sofa, s.sofa.x, 0.25, s.sofa.z, 2.4, 0.5, 0.95);
    box(g, M.sofa, s.sofa.x, 0.65, s.sofa.z + 0.38, 2.4, 0.5, 0.22);
    for (const e of [-1, 1]) box(g, M.sofa, s.sofa.x + e * 1.12, 0.45, s.sofa.z, 0.2, 0.6, 0.95);
  }
  box(g, M.wood, s.sofa.x, 0.22, s.sofa.z - 1.4, 1.2, 0.08, 0.6);
  for (const [ex, ez] of [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]]) box(g, M.wood, s.sofa.x + ex, 0.1, s.sofa.z - 1.4 + ez, 0.05, 0.2, 0.05);
  if (!skip.has('tv')) {
    box(g, M.black, s.tv.x, 0.3, s.tv.z, 1.6, 0.6, 0.45);
    box(g, M.black, s.tv.x, 0.95, s.tv.z, 1.5, 0.85, 0.06);
    box(g, M.tvScreen, s.tv.x, 0.95, s.tv.z + 0.035, 1.38, 0.74, 0.01);
  }
  box(g, M.wood, 0.6, 0.2, 0.6, 0.45, 0.4, 0.45);
  box(g, M.plant, 0.6, 0.75, 0.6, 0.6, 0.8, 0.6);
  // kitchen: counter along the side wall with the snack fryer, fridge at the end
  const k = flat.spots;
  box(g, M.white, k.counter.x, 0.45, k.counter.z, k.counter.w, 0.9, 0.62);
  box(g, M.black, k.counter.x, 0.92, k.counter.z, k.counter.w, 0.04, 0.64);
  if (!skip.has('frituur')) {
    box(g, M.steel, k.fryer.x, 1.08, k.fryer.z, 0.42, 0.3, 0.36);
    box(g, M.oil, k.fryer.x, 1.235, k.fryer.z, 0.34, 0.01, 0.28);
    box(g, M.steel, k.fryer.x, 1.3, k.fryer.z - 0.1, 0.3, 0.02, 0.14);
  }
  box(g, M.fridge, k.fridge.x, 0.95, k.fridge.z, 0.7, 1.9, 0.7);
  box(g, M.steel, k.fridge.x - 0.2, 1.1, k.fridge.z - 0.36, 0.04, 0.5, 0.03);
  box(g, M.wood, k.table.x, 0.75, k.table.z, 1.1, 0.05, 0.8);
  for (const [ex, ez] of [[-0.48, -0.32], [0.48, -0.32], [-0.48, 0.32], [0.48, 0.32]]) box(g, M.wood, k.table.x + ex, 0.37, k.table.z + ez, 0.05, 0.74, 0.05);
  // bedroom: double bed, wardrobe
  if (!skip.has('bed')) {
    box(g, M.wood, s.bed.x, 0.2, s.bed.z, 1.7, 0.4, 2.1);
    box(g, M.bed, s.bed.x, 0.48, s.bed.z, 1.6, 0.16, 2.0);
    box(g, M.duvet, s.bed.x, 0.58, s.bed.z - 0.25, 1.64, 0.08, 1.4);
    for (const e of [-1, 1]) box(g, M.white, s.bed.x + e * 0.4, 0.62, s.bed.z + 0.75, 0.62, 0.12, 0.36);
    box(g, M.wood, s.bed.x, 0.75, s.bed.z + 1.02, 1.7, 0.7, 0.08);
  }
  box(g, M.wood, s.wardrobe.x, 1.0, s.wardrobe.z, 1.6, 2.0, 0.6);
  box(g, M.frame, s.wardrobe.x, 1.0, s.wardrobe.z - 0.31, 0.02, 1.8, 0.01);
  // a lamp in every room: the flat reads at night too
  for (const r of flat.rooms) box(g, M.lamp, (r.x0 + r.x1) / 2, 2.7, (r.z0 + r.z1) / 2, 0.4, 0.04, 0.4);
  g.position.set(flat.ox, flat.floorY, flat.oy);
  g.rotation.y = -flat.angle;
  return g;
}

// k 0..1: the glass facade from full height down to the cutaway walls.
export function setFlatFacade(root, k) {
  const f = root.userData.facade;
  if (f) f.scale.y = 1 - (1 - CUT_H / 2.8) * k;
}
