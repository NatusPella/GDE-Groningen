import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { buildBuildingMesh } from './models3d_buildings.js';
import { GeoBuilder } from './pixelart3d.js';
import { LANDMARK_MATERIALS } from './landmarks3d.js';

// Meshes for Tammo and Tessa's home (home.js): the private garage in the
// plinth of their flat, the lobby door with the bike rack, the flat's floor
// as a cutaway (only while they are upstairs) and the tower below it.
// Geometry is baked in world coordinates, like the buildings.

const lit = (hex, glow = 0.18) => {
  const m = new THREE.MeshLambertMaterial({ color: hex });
  m.emissive = new THREE.Color(hex).multiplyScalar(glow);
  return m;
};
const M = {
  concrete: lit(0x8d8f8c), floor: lit(0x5d6062, 0.12), wall: lit(0xd39b55, 0.14), roof: lit(0x3f4245),
  cement: lit(0xe8d9b8, 0.16), party: lit(0xb7b1a6), vent: lit(0x2a2622, 0.05), door: lit(0x5a5f64, 0.12), trim: lit(0x2f6fb0), line: new THREE.MeshBasicMaterial({ color: 0xe9e6dc }),
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
  return canvasTex(512, 128, (g) => {
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
  });
}

// --- garage + lobby ------------------------------------------------------------

// home: the layout from home.js (polygon, walls, bays, door, panel, rack, lobby).
export function buildHomeExterior3D(home) {
  const g = new THREE.Group();
  const H = home.garage.height;
  flatShape(home.garage.poly, 0.035, M.floor, g);
  const walls = new THREE.Group();
  // the parking plinth as built (thuis3d.js has the sources): the towers'
  // golden cemented brick, a cemented string course, open brick-lattice vents
  // high in the wall, and on the roof the parking deck's masonry parapet
  for (const [x1, y1, x2, y2] of home.garage.walls) {
    segBox(walls, M.wall, x1, y1, x2, y2, 0.3, 0, H);
    const L = Math.hypot(x2 - x1, y2 - y1);
    const tx = (x2 - x1) / L, ty = (y2 - y1) / L;
    const onTower = home.tower && [[x1, y1], [x2, y2]].every(([x, y]) => home.tower.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 0.2));
    const n = onTower ? 0 : Math.floor(L / 3.2);
    for (let i = 0; i < n; i++) {
      const t = (L - n * 3.2) / 2 + 3.2 * (i + 0.5);
      segBox(walls, M.vent, x1 + tx * (t - 1.05), y1 + ty * (t - 1.05), x1 + tx * (t + 1.05), y1 + ty * (t + 1.05), 0.34, H - 1.25, 0.7);
    }
    segBox(walls, M.cement, x1, y1, x2, y2, 0.38, H - 0.4, 0.22);
  }
  g.add(walls);
  const roof = new THREE.Group();
  flatShape(home.garage.poly, H, M.roof, roof, 0.3);
  for (const [x1, y1, x2, y2] of home.garage.walls) {
    segBox(roof, M.wall, x1, y1, x2, y2, 0.3, H + 0.3, 1.0);
    segBox(roof, M.cement, x1, y1, x2, y2, 0.42, H + 1.3, 0.12);
  }
  const dr = home.garage.door;
  segBox(roof, M.wall, dr.x1, dr.y1, dr.x2, dr.y2, 0.3, H + 0.3, 1.0);
  segBox(roof, M.cement, dr.x1, dr.y1, dr.x2, dr.y2, 0.42, H + 1.3, 0.12);
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
  const tex = signTexture('Privégarage', 'Tammo & Tessa');
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
// The plinth seen from afar (past the exterior's stream radius): its walls,
// roof and deck parapet as one merged mesh in the shared landmark materials,
// so the tower never floats over an empty lot.
export function buildGarageShell(home) {
  const B = new GeoBuilder(5);
  const H = home.garage.height;
  const ring = home.garage.poly;
  const W = (x, y, z) => [x, y, z];
  const wallOf = (x1, y1, x2, y2, y0, y1h, color, g) => B.quad(W(x1, y0, y1), W(x2, y0, y2), W(x2, y1h, y2), W(x1, y1h, y1), color, g);
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
    wallOf(x1, y1, x2, y2, 0, H + 1.3, 0xd39b55, 1);
    wallOf(x1, y1, x2, y2, H - 0.4, H - 0.18, 0xe8d9b8, 0);
    wallOf(x1, y1, x2, y2, H + 1.3, H + 1.42, 0xe8d9b8, 0);
  }
  const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
  const tris = THREE.ShapeUtils.triangulateShape(shape.getPoints(), []);
  for (const [a, b, c] of tris) B.tri(W(ring[a][0], H + 0.3, ring[a][1]), W(ring[b][0], H + 0.3, ring[b][1]), W(ring[c][0], H + 0.3, ring[c][1]), 0x3f4245, 0);
  const mesh = new THREE.Mesh(B.build(), LANDMARK_MATERIALS);
  mesh.name = 'homeGarageShell';
  return mesh;
}

// The outdoor dressing round the towers (home.js picks the spots): trees and
// hedges in the green zone along the water, benches facing it, park lamps
// along the path, planters by the doors. One merged mesh.
export function buildHomeDressing(props) {
  const B = new GeoBuilder(5);
  const ob = (x, z, y0, sx, sz, h, rot, color, g) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (a, b, y) => [x + a * c - b * s, y, z + a * s + b * c];
    const p = [P(-sx / 2, -sz / 2, y0), P(sx / 2, -sz / 2, y0), P(sx / 2, sz / 2, y0), P(-sx / 2, sz / 2, y0)];
    const q = p.map(([px, , pz]) => [px, y0 + h, pz]);
    for (let i = 0; i < 4; i++) B.quad(p[i], p[(i + 1) % 4], q[(i + 1) % 4], q[i], color, g);
    B.quad(q[0], q[1], q[2], q[3], color, g);
  };
  const ico = (x, y, z, r, color) => B.geo(new THREE.IcosahedronGeometry(r, 0), new THREE.Matrix4().makeTranslation(x, y, z), color, 0);
  for (const p of props) {
    const { x, y: z, angle: a = 0 } = p;
    if (p.kind === 'tree') {
      ob(x, z, 0, 0.28, 0.28, 3.0 * p.s, 0, 0x5b4632, 0);
      ico(x, 3.0 * p.s + 1.3 * p.s, z, 1.9 * p.s, p.s > 1.1 ? 0x3d7438 : 0x4f8a40);
      ico(x + 0.6, 3.0 * p.s + 0.5 * p.s, z - 0.4, 1.3 * p.s, 0x447d3a);
    } else if (p.kind === 'hedge') {
      ob(x, z, 0, p.l || 4, 0.9, 0.95, a, 0x355f2e, 0);
    } else if (p.kind === 'bench') {
      const c = Math.cos(a), s = Math.sin(a);
      for (const k of [-0.75, 0.75]) ob(x + c * k, z + s * k, 0, 0.08, 0.5, 0.42, a, 0x2c2f33, 3);
      ob(x, z, 0.42, 1.8, 0.45, 0.06, a, 0x8a6142, 0);
      ob(x - s * 0.22, z + c * 0.22, 0.48, 1.8, 0.06, 0.4, a, 0x8a6142, 0);
    } else if (p.kind === 'lamp') {
      ob(x, z, 0, 0.14, 0.14, 4.2, 0, 0x2c2f33, 3);
      ob(x, z, 4.2, 0.42, 0.42, 0.22, 0, 0x2c2f33, 3);
      ob(x, z, 3.95, 0.36, 0.36, 0.25, 0, 0xfff1cf, 2);
    } else if (p.kind === 'planter') {
      ob(x, z, 0, 1.3, 1.3, 0.6, a, 0xd39b55, 1);
      ob(x, z, 0.6, 1.15, 1.15, 0.12, a, 0x3c2f25, 0);
      ico(x, 1.05, z, 0.62, 0x4c8a3f);
    }
  }
  const mesh = new THREE.Mesh(B.build(), LANDMARK_MATERIALS);
  mesh.name = 'homeDressing';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function setGarageCutaway(root, k) {
  const { walls, roof } = root.userData;
  roof.visible = k < 0.5;
  const s = 1 - 0.72 * k;
  walls.scale.y = s;
}

// --- a safehouse in an existing building (#458) ---------------------------------

// The sign above the door: "TE KOOP" or "JOUW HUIS" with a key in the level's
// colour. One texture per house, cached while the game runs.
const SAFEHUIS_BORD = new Map();
function safehuisBord(naam, kleur, eigen) {
  const key = `${eigen}|${kleur}|${naam}`;
  let tex = SAFEHUIS_BORD.get(key);
  if (tex) return tex;
  tex = canvasTex(512, 160, (g) => {
    g.fillStyle = '#1b1c1f';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = kleur; // de kleur van de laag (de vlag van de speler die het huis heeft)
    g.fillRect(0, 148, 512, 12);
    g.strokeStyle = kleur;
    g.lineWidth = 10;
    g.beginPath(); g.arc(72, 66, 24, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(96, 66); g.lineTo(160, 66); g.lineTo(160, 88); g.moveTo(136, 66); g.lineTo(136, 84); g.stroke();
    g.fillStyle = '#f4f2ec';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = 'bold 46px sans-serif';
    g.fillText(eigen ? 'JOUW HUIS' : 'TE KOOP', 188, 60);
    g.font = '24px sans-serif';
    g.fillStyle = 'rgba(244,242,236,0.72)';
    g.fillText(naam, 188, 104);
  });
  SAFEHUIS_BORD.set(key, tex);
  return tex;
}

// The marker of a safehouse in an existing OSM building: a door in the facade
// and a sign above it, in the level's colour once it is yours. No new volume:
// the building itself stays as the world built it. Placed at the facade point
// (x, y) of the door, ang the outward normal; the caller sets the ground height.
export function buildSafehouseMarker3D({ x, y, ang, eigen = false, kleur = '#8a3b2e', naam = 'Safehouse' }) {
  const g = new THREE.Group();
  g.position.set(x, 0, y);
  g.rotation.y = Math.PI / 2 - ang;
  const frame = new THREE.MeshLambertMaterial({ color: 0x2b2d30 });
  const deurMat = new THREE.MeshLambertMaterial({ color: eigen ? kleur : 0x8a3b2e });
  box(g, frame, 0, 1.12, 0.05, 1.36, 2.24, 0.1);
  box(g, deurMat, 0, 1.05, 0.11, 1.1, 2.1, 0.08);
  box(g, M.steel, 0.4, 1.02, 0.17, 0.1, 0.1, 0.06);
  const mat = new THREE.MeshBasicMaterial({ map: safehuisBord(naam, kleur, eigen) });
  mat.userData.shared = true;
  const bord = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.49), mat);
  bord.position.set(0, 2.56, 0.1);
  g.add(bord);
  g.userData.sign = bord;
  return g;
}

// --- the room of a safehouse in an existing building (#458) ---------------------

// One room behind the front door of a safehouse in an existing pand: the same
// cutaway style as the flat (walls up to hip height, the camera above them),
// with a bed, a wardrobe, a kitchen block, a table and the lift to the street
// next to the front door. kamer is the layout from safehuizen.js: the floor sits
// at kamer.floorY, x runs along the facade and z into the building.
export function buildSafehuisKamer3D(kamer) {
  const g = new THREE.Group();
  const g2 = new THREE.Group(); // de kamer zelf, in het frame van de gevel
  const W = kamer.w, D = kamer.d, low = CUT_H, s = kamer.spots;
  // de verdiepingsvloer van het pand en de laminaatvloer van de kamer
  box(g2, M.concrete, W / 2, -0.09, D / 2, W + 0.3, 0.16, D + 0.3);
  box(g2, M.laminate, W / 2, 0.01, D / 2, W, 0.02, D);
  // muren tot heuphoogte (de cutaway), met een plint langs de vloer
  for (const [x1, z1, x2, z2] of [[0, 0, 0, D], [W, 0, W, D], [0, D, W, D], [0, 0, W, 0]]) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    box(g2, M.innerWall, (x1 + x2) / 2, low / 2, (z1 + z2) / 2, len, low, 0.14, -Math.atan2(z2 - z1, x2 - x1));
  }
  // de voordeur in de voorgevel, met een mat; de lift ernaast naar de straat
  const dx = kamer.deurX;
  box(g2, M.frame, dx, low / 2 + 0.02, 0.08, 1.14, low, 0.12);
  box(g2, M.wood, dx, low / 2, 0.13, 1.0, low - 0.02, 0.08);
  box(g2, M.steel, dx + 0.36, low * 0.5, 0.18, 0.06, 0.06, 0.05);
  box(g2, M.rug, dx, 0.03, 0.62, 1.0, 0.02, 0.6);
  const lx = kamer.liftX;
  box(g2, M.frame, lx, low / 2 + 0.02, 0.08, 0.98, low, 0.12);
  box(g2, M.steel, lx, low / 2, 0.13, 0.9, low - 0.02, 0.08);
  box(g2, M.screen, lx, low * 0.72, 0.18, 0.1, 0.06, 0.02);
  const lift = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: signTexture('LIFT', 'naar de straat') }));
  lift.position.set(lx, low - 0.14, 0.19);
  g2.add(lift);
  // het bed tegen de achterwand, met een dekbed en een kussen
  const b = s.bed;
  box(g2, M.wood, b.x, 0.15, b.z, 1.9, 0.3, 0.9);
  box(g2, M.bed, b.x, 0.37, b.z, 1.84, 0.16, 0.86);
  box(g2, M.duvet, b.x, 0.46, b.z - 0.16, 1.8, 0.05, 0.54);
  box(g2, M.white, b.x - 0.6, 0.5, b.z + 0.28, 0.5, 0.12, 0.32);
  // de kast aan de linkermuur
  const k = s.kast;
  box(g2, M.wood, k.x, 1.0, k.z, 0.56, 2.0, 1.3);
  box(g2, M.frame, k.x + 0.29, 1.0, k.z, 0.01, 1.8, 1.2);
  box(g2, M.steel, k.x + 0.31, 1.05, k.z + 0.2, 0.03, 0.2, 0.03);
  // het keukenblok aan de rechterwand: blad, spoelbak, twee kookplaten, koelkast eronder
  const kk = s.keuken;
  box(g2, M.white, kk.x, 0.45, kk.z, 0.56, 0.9, 1.4);
  box(g2, M.black, kk.x, 0.92, kk.z, 0.58, 0.04, 1.42);
  box(g2, M.steel, kk.x - 0.06, 0.945, kk.z + 0.32, 0.36, 0.03, 0.32);
  box(g2, M.black, kk.x - 0.04, 0.945, kk.z - 0.32, 0.34, 0.02, 0.3);
  box(g2, M.fridge, kk.x + 0.02, 0.4, kk.z - 0.02, 0.5, 0.74, 1.2);
  // een tafel met een stoel, een kleed en een plant
  const t = s.tafel;
  box(g2, M.wood, t.x, 0.72, t.z, 0.7, 0.05, 0.5);
  for (const [ex, ez] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) box(g2, M.wood, t.x + ex, 0.36, t.z + ez, 0.05, 0.72, 0.05);
  box(g2, M.wood, t.x, 0.42, t.z + 0.52, 0.44, 0.05, 0.44);
  box(g2, M.wood, t.x, 0.68, t.z + 0.72, 0.44, 0.5, 0.05);
  box(g2, M.rug, t.x, 0.02, t.z - 0.05, 1.7, 0.01, 1.2);
  box(g2, M.wood, W - 0.4, 0.15, 0.45, 0.34, 0.3, 0.34);
  box(g2, M.plant, W - 0.4, 0.65, 0.45, 0.5, 0.7, 0.5);
  // een lamp, zodat de kamer ook 's nachts leesbaar is
  box(g2, M.lamp, W / 2, 2.4, D / 2, 0.5, 0.04, 0.5);
  g2.position.set(kamer.ox, kamer.floorY, kamer.oy);
  g2.rotation.y = -kamer.angle;
  g.name = 'safehuisKamer';
  g.add(g2);
  return g;
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
  return buildBuildingMesh({ pts, h: levels, type: tower.type || 'apartments', model: tower.model, modelFrame: tower.modelFrame, modelCut: true, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
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
  box(slab, M.cement, T.w / 2, -0.35, T.d / 2, T.w + 0.12, 0.3, T.d + 0.12);
  box(slab, M.concrete, T.w / 2, -0.1, T.d / 2, T.w + 0.2, 0.2, T.d + 0.2);
  // (no parapet in front of the flat's own glass and garage-side wall)
  for (const [x, z, sx, sz] of [[(W + T.w) / 2, 0, T.w - W, 0.2], [T.w / 2, T.d, T.w, 0.2], [0, (D + T.d) / 2, 0.2, T.d - D], [T.w, T.d / 2, 0.2, T.d]]) box(slab, M.concrete, x, 0.5, z, sx, 1, sz);
  // the neighbours' flats, cut off at the same height as our walls; a corridor
  // behind the hall leads to the lift
  const cor = 1.8;
  for (const [x0, z0, x1, z1] of [[W + 0.3, 0.3, T.w - 0.3, T.d * 0.48], [W + 0.3, T.d * 0.48 + 0.3, T.w - 0.3, T.d - 0.3], [0.3, D + cor, W * 0.5, T.d - 0.3], [W * 0.5 + 0.3, D + cor, W + 0.3, T.d - 0.3]]) {
    box(slab, M.party, (x0 + x1) / 2, low / 2, (z0 + z1) / 2, x1 - x0, low, z1 - z0);
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
  // two small bedrooms: a single bed and a wardrobe each (the stock beds are an air mattress on a frame)
  if (!skip.has('bed')) {
    for (const b of [s.bed, s.bed2]) {
      box(g, M.wood, b.x, 0.15, b.z, 0.95, 0.3, 2.0);
      box(g, M.bed, b.x, 0.38, b.z, 0.9, 0.16, 1.92);
      box(g, M.duvet, b.x, 0.48, b.z - 0.25, 0.92, 0.06, 1.3);
      box(g, M.white, b.x, 0.52, b.z + 0.72, 0.6, 0.12, 0.34);
    }
  }
  box(g, M.wood, s.wardrobe.x, 1.0, s.wardrobe.z, 1.6, 2.0, 0.6);
  box(g, M.frame, s.wardrobe.x, 1.0, s.wardrobe.z - 0.31, 0.02, 1.8, 0.01);
  const w2 = s.wardrobe2;
  box(g, M.wood, w2.x, 1.0, w2.z, 0.6, 2.0, 1.6);
  box(g, M.frame, w2.x - 0.31, 1.0, w2.z, 0.01, 1.8, 0.02);
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
