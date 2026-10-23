import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, addCamTargetSource } from './scene3d.js';
import { facilitiesOf } from './facilities.js';
import { addStaticCollider, removeProp } from './breakables.js';
import { Vehicle, MODELS } from './vehicle.js';
import { resetVehicle, resetWalker, placeCompanion } from './safety.js';
import { respawnFade } from './respawn.js';
import { pointInPolygon, closestPointOnSegment, isInWater } from './util.js';
import * as P from './garageplan.js';

// Parkeergarages (#418): ondergrondse garages op de plekken waar ze in de kaart staan (het Forum, de Ossenmarkt), met een poort op straat.
// De plattegrond en de plaatsing staan in garageplan.js (puur, getest); hier wordt gebouwd en gespeeld.
//
// - De POORT is een klein bovengronds gebouw met een opening: rij of loop erin en een korte zwarte overgang zet je met je auto in de hal.
//   Geen helling en geen sleuf: de hal ligt onder de stad (vloer op -5 m, plafond op -1,6 m) en bestaat alleen terwijl je erin bent.
// - In de HAL (nu een wereld apart: de kaart geeft er hoogte voor via map.groundHeightAt en map.ceilingAt, zoals het flat van home.js)
//   staan ruim vijftig plekken met een auto om te jatten (de gewone parkeerauto's, `parked`). Bij de uitrit komt de overgang terug
//   naar buiten, bij de poort. De auto die je bestuurt gaat mee; de rest van de hal wordt opgeruimd.
// - Onder -3,5 m tellen de gebouwen erboven niet (vehicle.js), de wanden en kolommen zijn eigen colliders met `z` en `top`, zodat wat boven
//   de hal rijdt of loopt er niets van merkt. De poort wordt gezocht (planGate) en pas gebouwd als je dichtbij bent.
// - Het licht in de hal is dat van een garage (world.lightMood): geen zon, een egaal wit licht, dag en nacht gelijk.

const SITES = [
  { id: 'forum', near: [350, 61], within: 70, label: 'Parkeergarage', seed: 418 },
  { id: 'ossenmarkt', near: [-136, -269], within: 70, label: 'Parkeergarage', seed: 4181 },
];
const PLAN_R = 420;          // vanaf hier wordt de plek van de poort gezocht (een stukje per beeld)
const STREAM_IN = 170;       // de poort wordt gebouwd binnen deze afstand
const STREAM_OUT = 250;
const PLAN_BUDGET_MS = 1.5;
const MAX_LEN = 5.4;         // een voertuig langer dan dit past niet door de garage
const COOLDOWN = 1.6;
const FILL = 0.55;

let world = null, map = null, scene = null;
const sites = [];
const st = { inside: null, cooldown: 0, fade: 0 };

// ---- hulp ---------------------------------------------------------------------------------------------------------------------------------

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function inBuilding(x, y, pad = 0) {
  for (const b of map.buildingsNear(x, y, pad + 0.5)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 - pad || x > x1 + pad || y < y0 - pad || y > y1 + pad) continue;
    if (pointInPolygon(x, y, b.pts)) return true;
    if (pad > 0) {
      for (let i = 0; i < b.pts.length - 1; i++) if (closestPointOnSegment(x, y, b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1]).dist2 < pad * pad) return true;
    }
  }
  return false;
}

const carRoad = (r) => r.cat !== 'foot' && r.cat !== 'cycle' && !r.z && !r.bridge;

// vrij voor de poort: geen gebouw (met een meter marge), geen water, geen weg voor auto's, geen boom
function gateFree(x, y) {
  if (inBuilding(x, y, 1.2) || isInWater(map, x, y)) return false;
  if (map.treesNear(x, y, 1.2).length) return false;
  if (map.reservedAt && map.reservedAt(x, y)) return false;
  for (const r of map.roadsNear(x, y, 12)) {
    if (!carRoad(r)) continue;
    const hw = (r.width || 6) / 2 + 1.5;
    for (let i = 0; i < r.pts.length - 1; i++) if (closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]).dist2 < hw * hw) return false;
  }
  return true;
}

// de dichtstbijzijnde weg voor auto's (tot 60 m): het punt, de afstand en de richting van het stuk
function nearestCarRoad(x, y) {
  let best = null, bd = Infinity;
  for (const r of map.roadsNear(x, y, 60)) {
    if (!carRoad(r) || (r.type === 'service' || r.type === 'track')) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const cp = closestPointOnSegment(x, y, a[0], a[1], b[0], b[1]);
      if (cp.dist2 < bd) { bd = cp.dist2; best = { x: cp.x, y: cp.y, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    }
  }
  return best ? { ...best, dist: Math.sqrt(bd) } : null;
}

// ---- bouwen: één buffer per materiaal -----------------------------------------------------------------------------------------------------------

class Buf {
  constructor() { this.pos = []; this.nor = []; this.col = []; }
  tri(a, b, c, n, col) {
    for (const p of [a, b, c]) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(col[0], col[1], col[2]); }
  }
  quad(a, b, c, d, n, col) { this.tri(a, b, c, n, col); this.tri(a, c, d, n, col); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
  get empty() { return !this.pos.length; }
}

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

// een frame f ({ x, y, angle }) en een hoogte: lokaal (p, q, h) naar de wereld van three (x, h, z)
const at = (f, p, q, h) => { const [x, y] = P.toWorld(f, p, q); return [x, h, y]; };
const axis = (f, which) => (which === 'p' ? [Math.cos(f.angle), 0, Math.sin(f.angle)] : which === 'q' ? [-Math.sin(f.angle), 0, Math.cos(f.angle)] : [0, 1, 0]);
const neg = (n) => [-n[0], -n[1], -n[2]];

// een doos in het frame: p0..p1 langs, q0..q1 dwars, h0..h1 hoog (absolute hoogte)
function box(buf, f, p0, p1, q0, q1, h0, h1, color) {
  const col = lin(color);
  const C = (p, q, h) => at(f, p, q, h);
  const np = axis(f, 'p'), nq = axis(f, 'q'), nh = axis(f, 'h');
  buf.quad(C(p1, q0, h0), C(p1, q1, h0), C(p1, q1, h1), C(p1, q0, h1), np, col);
  buf.quad(C(p0, q1, h0), C(p0, q0, h0), C(p0, q0, h1), C(p0, q1, h1), neg(np), col);
  buf.quad(C(p1, q1, h0), C(p0, q1, h0), C(p0, q1, h1), C(p1, q1, h1), nq, col);
  buf.quad(C(p0, q0, h0), C(p1, q0, h0), C(p1, q0, h1), C(p0, q0, h1), neg(nq), col);
  buf.quad(C(p0, q0, h1), C(p1, q0, h1), C(p1, q1, h1), C(p0, q1, h1), nh, col);
  buf.quad(C(p0, q1, h0), C(p1, q1, h0), C(p1, q0, h0), C(p0, q0, h0), neg(nh), col);
}

// een vlak vlak: een lijn of een stuk verf op de vloer
function flat(buf, f, pts, h, color) {
  const col = lin(color), n = [0, 1, 0];
  const C = pts.map(([p, q]) => at(f, p, q, h));
  buf.quad(C[0], C[1], C[2], C[3], n, col);
}
const strip = (buf, f, p0, q0, p1, q1, w, h, color) => {
  const dp = p1 - p0, dq = q1 - q0, l = Math.hypot(dp, dq) || 1;
  const np = -dq / l * w / 2, nq = dp / l * w / 2;
  flat(buf, f, [[p0 + np, q0 + nq], [p1 + np, q1 + nq], [p1 - np, q1 - nq], [p0 - np, q0 - nq]], h, color);
};
function arrow(buf, f, u, v, ang, h, color) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const P2 = (a, b) => [u + a * c - b * s, v + a * s + b * c];
  flat(buf, f, [P2(-1.6, -0.18), P2(0.7, -0.18), P2(0.7, 0.18), P2(-1.6, 0.18)], h, color);
  const col = lin(color), n = [0, 1, 0];
  buf.tri(at(f, ...P2(0.7, -0.6), h), at(f, ...P2(1.7, 0), h), at(f, ...P2(0.7, 0.6), h), n, col);
}

function signTexture(text, w, h, bg, fg, mark = null) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = Math.max(3, h / 16); g.strokeRect(g.lineWidth, g.lineWidth, w - 2 * g.lineWidth, h - 2 * g.lineWidth);
  let x0 = w / 2;
  if (mark) {
    // het blauwe vierkant met de P
    const s = h * 0.7;
    g.fillStyle = '#1b5cc4'; g.fillRect(h * 0.2, (h - s) / 2, s, s);
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, h / 40); g.strokeRect(h * 0.2, (h - s) / 2, s, s);
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(s * 0.8)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('P', h * 0.2 + s / 2, h / 2 + s * 0.04);
    x0 = h * 1.05 + (w - h * 1.05) / 2;
  }
  g.fillStyle = fg; g.font = `bold ${Math.round(h * 0.42)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x0, h / 2 + h * 0.03);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// een bord als vlak in het frame, aan de kant waar de normaal heen kijkt (n: 'p' of '-p')
function signPlane(f, tex, p, q, h, w, hh, facing) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  const [x, y] = P.toWorld(f, p, q);
  m.position.set(x, h, y);
  // het vlak kijkt standaard naar +z (three); naar de kant van het frame draaien: kijk naar `facing` (hoek in de wereld)
  m.rotation.y = Math.PI / 2 - facing;
  return m;
}

const litMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
const lampMat = () => new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false });

// ---- de hal -------------------------------------------------------------------------------------------------------------------------------

function buildHall(site) {
  const f = site.hall, L = site.layout;
  const FZ = P.FLOOR_Z, CZ = P.CEIL_Z, hw = L.hw;
  const lit = new Buf(), lamps = new Buf(), ceil = new Buf();
  const WALL = '#8c887e', FLOOR = '#4c4c50', CEILC = '#c4c0b4', COL = '#a09c92', YEL = '#d8b400', LINE = '#ebe6d6';
  // vloer en plafond (het plafond werpt de schaduw: binnen valt geen zon)
  box(lit, f, -P.WALL_T, L.L + P.WALL_T, -hw - P.WALL_T, hw + P.WALL_T, FZ - 0.4, FZ, FLOOR);
  box(ceil, f, -P.WALL_T, L.L + P.WALL_T, -hw - P.WALL_T, hw + P.WALL_T, CZ, CZ + 0.5, CEILC);
  // wanden; de wand bij u = 0 heeft de uitrit
  box(lit, f, 0, L.L, -hw - P.WALL_T, -hw, FZ, CZ, WALL);
  box(lit, f, 0, L.L, hw, hw + P.WALL_T, FZ, CZ, WALL);
  box(lit, f, L.L, L.L + P.WALL_T, -hw - P.WALL_T, hw + P.WALL_T, FZ, CZ, WALL);
  box(lit, f, -P.WALL_T, 0, -hw - P.WALL_T, L.opening.v0, FZ, CZ, WALL);
  box(lit, f, -P.WALL_T, 0, L.opening.v1, hw + P.WALL_T, FZ, CZ, WALL);
  box(lit, f, -P.WALL_T, 0, L.opening.v0, L.opening.v1, FZ + L.opening.h, CZ, WALL);
  // wat achter de uitrit ligt: een donkere helling omhoog
  box(lit, f, -5, -P.WALL_T, L.opening.v0, L.opening.v1, FZ - 0.4, CZ, '#171718');
  // kolommen met een gele band onderaan
  for (const c of L.columns) {
    box(lit, f, c.u - P.COLUMN / 2, c.u + P.COLUMN / 2, c.v - P.COLUMN / 2, c.v + P.COLUMN / 2, FZ, CZ, COL);
    box(lit, f, c.u - P.COLUMN / 2 - 0.02, c.u + P.COLUMN / 2 + 0.02, c.v - P.COLUMN / 2 - 0.02, c.v + P.COLUMN / 2 + 0.02, FZ, FZ + 1.1, YEL);
  }
  // belijning: de scheidingslijnen van de plekken en de randen van de rijen
  const lz = FZ + 0.012;
  L.rowsV.forEach(([v0, v1]) => {
    for (let k = 0; k <= L.n; k++) { const u = L.u0 + k * P.BAY_W; strip(lit, f, u, v0, u, v1, 0.1, lz, LINE); }
    strip(lit, f, L.u0, v0, L.u0 + L.n * P.BAY_W, v0, 0.1, lz, LINE);
    strip(lit, f, L.u0, v1, L.u0 + L.n * P.BAY_W, v1, 0.1, lz, LINE);
  });
  for (const a of L.arrows) arrow(lit, f, a.u, a.v, a.angle, lz + 0.002, '#d9d4c0');
  // lampbalken
  for (const l of L.lights) box(lamps, f, l.u - l.len / 2, l.u + l.len / 2, l.v - 0.14, l.v + 0.14, CZ - 0.07, CZ, '#fff3c4');

  const group = new THREE.Group();
  group.name = 'parkeergarage-hal';
  const litMesh = new THREE.Mesh(lit.geometry(), litMat());
  litMesh.receiveShadow = false;
  const ceilMesh = new THREE.Mesh(ceil.geometry(), litMat());
  ceilMesh.castShadow = true;
  const lampMesh = new THREE.Mesh(lamps.geometry(), lampMat());
  group.add(litMesh, ceilMesh, lampMesh);
  // borden: de uitrit en de verdieping
  const tex = [signTexture('UITRIT', 512, 96, '#0f6b3a', '#ffffff'), signTexture('P -1', 256, 128, '#1b3f8f', '#ffffff')];
  group.add(signPlane(f, tex[0], 0.12, 0, FZ + L.opening.h + 0.1, 4.2, 0.8, f.angle));
  group.add(signPlane(f, tex[1], L.L - 0.05, 0, FZ + 2.3, 2.4, 1.2, f.angle + Math.PI));
  group.add(signPlane(f, tex[1], L.L - 0.05, -9, FZ + 2.3, 2.4, 1.2, f.angle + Math.PI));
  group.userData.textures = tex;
  scene.add(group);
  site.hallGroup = group;

  // wanden en kolommen als colliders: alleen voor wat in de hal is (z en top)
  const props = [];
  const wall = (p0, q0, p1, q1) => {
    const cx = (p0 + p1) / 2, cy = (q0 + q1) / 2, half = Math.hypot(p1 - p0, q1 - q0) / 2;
    const [x, y] = P.toWorld(f, cx, cy);
    const p = addStaticCollider('garagewall', x, y, 0.3, half, f.angle + Math.atan2(q1 - q0, p1 - p0));
    p.z = FZ; p.top = CZ; p.h = CZ - FZ;
    props.push(p);
  };
  wall(0, -hw, L.L, -hw); wall(0, hw, L.L, hw); wall(L.L, -hw, L.L, hw);
  wall(0, -hw, 0, L.opening.v0); wall(0, L.opening.v1, 0, hw);
  // de gang achter de uitrit (de helling): twee zijwanden
  wall(-5, L.opening.v0, 0, L.opening.v0); wall(-5, L.opening.v1, 0, L.opening.v1); wall(-5, L.opening.v0, -5, L.opening.v1);
  for (const c of L.columns) {
    const [x, y] = P.toWorld(f, c.u, c.v);
    const p = addStaticCollider('post', x, y, P.COLUMN / 2 + 0.05);
    p.z = FZ; p.top = CZ; p.h = CZ - FZ;
    props.push(p);
  }
  site.hallProps = props;
}

function disposeGroup(group) {
  if (!group) return;
  group.removeFromParent();
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
  });
}

function spawnCars(site) {
  const f = site.hall, rng = mulberry(site.seed * 7 + 3);
  const models = MODELS.filter((m) => !m.trailer && m.len <= P.BAY_D - 0.3 && m.wid <= P.BAY_W - 0.45);
  const slots = P.carSlots(site.layout, models, rng, FILL);
  site.cars = [];
  for (const s of slots) {
    const [x, y] = P.toWorld(f, s.u, s.v);
    const v = new Vehicle(x, y, f.angle + s.angle, s.model);
    v.parked = true;
    v.z = P.FLOOR_Z;
    v.garage = site.id;
    world.vehicles.push(v);
    site.cars.push(v);
  }
}

function clearCars(site, keep) {
  for (const v of site.cars || []) {
    if (v === keep) continue;
    const i = world.vehicles.indexOf(v);
    if (i >= 0) world.vehicles.splice(i, 1);
  }
  site.cars = [];
}

// ---- de poort -----------------------------------------------------------------------------------------------------------------------------

function buildGate(site) {
  const g = site.gate, G = P.GATE;
  const lit = new Buf(), dark = new Buf(), yel = new Buf();
  const CON = '#aaa699', ROOFC = '#6e6b63', DARK = '#2a2a2d', INSIDE = '#161617', STRIPE = '#d8b400';
  const hb = G.width / 2, ho = G.opening / 2, h = G.height, w = G.wall;
  // de voorwand met de opening, de zijwanden, de achterwand en het dak
  box(lit, g, -w, 0, -hb, -ho, 0, h, CON);
  box(lit, g, -w, 0, ho, hb, 0, h, CON);
  box(lit, g, -w, 0, -ho, ho, G.openingH, h, CON);
  box(lit, g, -G.depth, 0, -hb, -hb + w, 0, h, CON);
  box(lit, g, -G.depth, 0, hb - w, hb, 0, h, CON);
  box(lit, g, -G.depth, -G.depth + w, -hb, hb, 0, h, CON);
  box(lit, g, -G.depth - 0.3, 0.7, -hb - 0.3, hb + 0.3, h, h + 0.35, ROOFC);
  // binnen: een donkere vloer, een zwarte achterwand en een geel-zwarte rand: de helling naar beneden
  box(dark, g, -G.depth + w, 0, -ho - 0.05, ho + 0.05, 0.02, 0.06, DARK);
  box(dark, g, -G.depth + w, -G.depth + w + 0.1, -ho, ho, 0.06, G.openingH, INSIDE);
  for (let i = 0; i < 8; i++) box(yel, g, -5.2 - i * 0.5, -4.95 - i * 0.5, -ho, ho, 0.065, 0.075, i % 2 ? '#1a1a1a' : STRIPE);
  // buiten: een stuk donker asfalt voor de opening, een gele rand
  box(dark, g, 0, 5.5, -ho - 0.8, ho + 0.8, 0.045, 0.065, '#3a3a3e');
  for (const s of [-1, 1]) box(yel, g, 0, 5.5, s * (ho + 0.8) - 0.06, s * (ho + 0.8) + 0.06, 0.066, 0.075, STRIPE);
  // een slagboom (omhoog) en een kaartjesautomaat aan weerszijden, gele paaltjes
  box(lit, g, 0.6, 0.95, -ho - 0.95, -ho - 0.6, 0, 1.15, '#2d2f33');
  for (let i = 0; i < 6; i++) box(yel, g, 0.65, 0.9, -ho - 0.9, -ho - 0.65, 1.15 + i * 0.42, 1.15 + (i + 1) * 0.42, i % 2 ? '#d83a2a' : '#f1efe6');
  box(lit, g, 0.6, 1.05, ho + 0.55, ho + 1.0, 0, 1.55, '#1d3f73');
  box(yel, g, 0.55, 0.62, ho + 0.6, ho + 0.95, 0.8, 1.35, '#e8c93a');
  for (const s of [-1, 1]) box(yel, g, 0.2, 0.45, s * (ho + 0.25) - 0.12, s * (ho + 0.25) + 0.12, 0, 0.85, STRIPE);

  const group = new THREE.Group();
  group.name = 'parkeergarage-poort';
  const m1 = new THREE.Mesh(lit.geometry(), litMat());
  m1.castShadow = true; m1.receiveShadow = true;
  const dm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const m2 = new THREE.Mesh(dark.geometry(), dm);
  const ym = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const m3 = new THREE.Mesh(yel.geometry(), ym);
  group.add(m1, m2, m3);
  // het bord boven de opening (en een lamp)
  const tex = signTexture('Parkeergarage', 640, 128, '#16305f', '#ffffff', true);
  group.add(signPlane(g, tex, 0.04, 0, h - 0.5, G.opening - 0.2, 0.62, g.angle));
  const tex2 = signTexture('P', 128, 128, '#1b5cc4', '#ffffff');
  for (const s of [-1, 1]) group.add(signPlane(g, tex2, 0.04, s * (hb - 0.7), h - 1.4, 0.9, 0.9, g.angle));
  group.userData.textures = [tex, tex2];
  getScene().add(group);
  site.gateGroup = group;

  // colliders van het gebouw: wat de opening vrij laat is open
  const props = [];
  const wall = (p0, q0, p1, q1) => {
    const cx = (p0 + p1) / 2, cy = (q0 + q1) / 2, half = Math.hypot(p1 - p0, q1 - q0) / 2;
    const [x, y] = P.toWorld(g, cx, cy);
    props.push(addStaticCollider('garagewall', x, y, 0.3, half, g.angle + Math.atan2(q1 - q0, p1 - p0)));
  };
  wall(-0.25, -hb, -0.25, -ho); wall(-0.25, ho, -0.25, hb);
  wall(-G.depth, -hb + 0.25, 0, -hb + 0.25); wall(-G.depth, hb - 0.25, 0, hb - 0.25);
  wall(-G.depth + 0.25, -hb, -G.depth + 0.25, hb);
  // de automaat en de slagboom
  const pole = P.toWorld(g, 0.78, -ho - 0.78), mach = P.toWorld(g, 0.82, ho + 0.78);
  props.push(addStaticCollider('post', pole[0], pole[1], 0.25), addStaticCollider('post', mach[0], mach[1], 0.35));
  site.gateProps = props;
}

function disposeGate(site) {
  disposeGroup(site.gateGroup);
  site.gateGroup = null;
  for (const p of site.gateProps || []) removeProp(p);
  site.gateProps = [];
}

// ---- overgangen ---------------------------------------------------------------------------------------------------------------------------

const GARAGE_MOOD = (L) => {
  L.sun.set(0xfff0d8); L.sunI = 0;
  L.hemiSky.set(0xf4ecda); L.hemiGnd.set(0x8e887c); L.hemiI = 1.25;
  L.fog.set(0x44413c); L.horizon.set(0x44413c); L.zenith.set(0x44413c);
  L.exp = 1.0; L.glowI = 0; L.bloomStr *= 0.4; L.sat = 1; L.vig = 0.12;
  L.shadowTint.set(0xffffff); L.hiTint.set(0xfff6e6);
};

function playerThing(w) {
  const p = w.player, v = p.inVehicle;
  return v ? { v, x: v.x, y: v.y } : { v: null, x: p.x, y: p.y };
}

function fits(v) {
  return !v || (!v.isBus && !v.isBoat && !v.isHeli && !v.model.trailer && v.model.len <= MAX_LEN);
}

function flash() {
  respawnFade(1);
  st.fade = 0.1;
}

function enter(site) {
  const w = world, p = w.player;
  const t = playerThing(w);
  if (!fits(t.v)) {
    if (!site.warned || w.time - site.warned > 4) { site.warned = w.time; w.addMessage('Te groot voor de garage', 3); }
    return;
  }
  if (w.mission && w.mission.phase === 'active' && w.mission.noGarage) return;
  buildHall(site);
  spawnCars(site);
  const L = site.layout, f = site.hall;
  st.inside = site;
  st.cooldown = COOLDOWN;
  if (!w.lightMood) { w.lightMood = GARAGE_MOOD; site.mood = true; }
  const a = L.arrive;
  const speed = t.v ? Math.min(6, Math.max(2, Math.abs(t.v.speed))) : 0;
  if (t.v) {
    const [x, y] = P.toWorld(f, a.u, a.v);
    resetVehicle(t.v, x, y, f.angle + a.angle, P.FLOOR_Z);
    t.v.surf = null; t.v.road = null; t.v.speed = speed;
    p.x = t.v.x; p.y = t.v.y; p.angle = t.v.angle; p.gz = P.FLOOR_Z; p.z = 0; p.vz = 0;
  } else {
    const [x, y] = P.toWorld(f, 3.2, 0);
    resetWalker(p, x, y, P.FLOOR_Z);
    p.angle = f.angle;
  }
  w.camYaw = p.angle;
  placeCompanion(w, p.x, p.y, p.angle);
  flash();
}

function leave(site, to) {
  const w = world, p = w.player;
  const t = playerThing(w);
  const g = site.gate;
  clearCars(site, t.v);
  if (to !== false && g) {
    const [x, y] = P.toWorld(g, P.GATE.out.a, P.GATE.out.b);
    const gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
    const speed = t.v ? Math.min(6, Math.max(2, Math.abs(t.v.speed))) : 0;
    if (t.v) {
      resetVehicle(t.v, x, y, g.angle, gz);
      t.v.surf = null; t.v.road = null; t.v.speed = speed;
      p.x = t.v.x; p.y = t.v.y; p.angle = t.v.angle; p.gz = gz; p.z = 0; p.vz = 0;
    } else {
      resetWalker(p, x, y, gz);
      p.angle = g.angle;
    }
    w.camYaw = p.angle;
    placeCompanion(w, p.x, p.y, p.angle);
    flash();
  }
  st.inside = null;
  st.cooldown = COOLDOWN;
  if (site.mood && w.lightMood === GARAGE_MOOD) w.lightMood = null;
  site.mood = false;
  for (const q of site.hallProps || []) removeProp(q);
  site.hallProps = [];
  disposeGroup(site.hallGroup);
  site.hallGroup = null;
}

// ---- de plek van de poort, een stukje per beeld -------------------------------------------------------------------------------------------------

function startPlan(site) {
  const c = P.toWorld(site.hall, P.HALL_L / 2, 0);
  site.planGen = P.planGateSteps(gateFree, nearestCarRoad, c[0], c[1], { radius: 140, step: 4, maxRoad: 50, penalty: footPenalty });
}

// de generator van garageplan.js, met de regels van deze kaart: liever niet op een voetpad of fietspad (voetgangers lopen er door)
function footPenalty(f, probe) {
  let foot = 0;
  for (const [a, b] of probe) {
    const [px, py] = P.toWorld(f, a, b);
    for (const r of map.roadsNear(px, py, 3)) { if (r.cat === 'foot' || r.cat === 'cycle') { foot++; break; } }
  }
  return foot * 1.5;
}

function planStep(site) {
  const until = performance.now() + PLAN_BUDGET_MS;
  while (performance.now() < until) {
    const r = site.planGen.next();
    if (r.done) {
      site.planGen = null;
      site.planned = true;
      site.gate = r.value ? { x: r.value.x, y: r.value.y, angle: r.value.angle } : null;
      if (typeof console !== 'undefined' && window.__garageLog) console.log('[garage] ' + site.id + ' gate ' + JSON.stringify(site.gate));
      return;
    }
  }
}

// ---- per beeld ----------------------------------------------------------------------------------------------------------------------------

export function initParkeergarages(w) {
  world = w; map = w.map; scene = getScene();
  sites.length = 0;
  st.inside = null; st.cooldown = 0; st.fade = 0;
  const gar = facilitiesOf('garagepark');
  for (const s of SITES) {
    let best = null, bd = Infinity;
    for (const f of gar) {
      const d = Math.hypot(f.x - s.near[0], f.y - s.near[1]);
      if (d < bd) { bd = d; best = f; }
    }
    if (!best || bd > s.within) continue;
    const hall = P.hallFrame(best.poly, [best.x, best.y], 0);
    sites.push({ ...s, fac: best, hall, layout: P.hallLayout(), gate: null, planned: false, planGen: null, gateGroup: null, gateProps: [], hallGroup: null, hallProps: [], cars: [], mood: false });
  }
  if (!sites.length) return;
  installMapHooks();
  addCamTargetSource((px, py, out) => {
    for (const s of sites) {
      if (s.gateGroup && s.gate && Math.hypot(px - s.gate.x, py - s.gate.y) < 60) out.push(s.gateGroup);
      if (s.hallGroup && st.inside === s) out.push(s.hallGroup);
    }
  });
  window.__garages = {
    sites: () => sites.map((s) => ({ id: s.id, gate: s.gate, hall: s.hall, planned: s.planned, cars: s.cars.length })),
    inside: () => (st.inside ? st.inside.id : null),
    enter: (id) => { const s = sites.find((q) => q.id === id); if (s) enter(s); },
    leave: () => { if (st.inside) leave(st.inside); },
    plan: (id) => { const s = sites.find((q) => q.id === id); if (s && !s.planned && !s.planGen) startPlan(s); },
    gatePoint: (id) => { const s = sites.find((q) => q.id === id); return s && s.gate ? { x: s.gate.x, y: s.gate.y, angle: s.gate.angle, zone: P.toWorld(s.gate, -2.4, 0), out: P.toWorld(s.gate, P.GATE.out.a, P.GATE.out.b) } : null; },
    hallPoint: (id) => { const s = sites.find((q) => q.id === id); return s ? { arrive: P.toWorld(s.hall, s.layout.arrive.u, s.layout.arrive.v), exit: P.toWorld(s.hall, 1.2, 0), frame: s.hall } : null; },
  };
}

// map.groundHeightAt en map.ceilingAt kennen de hal zolang je erin bent (zoals home.js voor het flat)
let hooked = false;
function installMapHooks() {
  if (hooked || !map) return;
  hooked = true;
  const ground = map.groundHeightAt.bind(map), ceiling = map.ceilingAt.bind(map);
  map.groundHeightAt = (x, y, z = 0) => {
    const s = st.inside;
    if (s && z < P.CEIL_Z - 0.2 && P.inHall(s.hall, x, y, 1.2)) return P.FLOOR_Z;
    return ground(x, y, z);
  };
  map.ceilingAt = (x, y, z) => {
    const s = st.inside;
    if (s && z < P.CEIL_Z + 0.6 && P.inHall(s.hall, x, y, 0.6)) return P.CEIL_Z;
    return ceiling(x, y, z);
  };
}

export function updateParkeergarages(dt, w) {
  if (!sites.length) return;
  if (st.fade > 0 && (st.fade -= dt) <= 0) { st.fade = 0; respawnFade(0, 600); }
  if (st.cooldown > 0) st.cooldown -= dt;
  const p = w.player;
  const focus = w.streamFocus || p;
  const t = playerThing(w);
  const inside = st.inside;

  if (inside) {
    // wie van de hal af is gezet (een respawn, vastgelopen, een sprong): de hal is dan niet meer nodig
    if (!P.inHall(inside.hall, t.x, t.y, 6) || (p.gz || 0) > P.CEIL_Z) { leave(inside, false); return; }
    if (st.cooldown <= 0 && !w.paused && P.inExitZone(inside.layout, inside.hall, t.x, t.y)) leave(inside);
    // een gestolen auto die niemand meer bestuurt of een auto die weggereden is: het is een gewone auto
    for (const v of inside.cars) if (v.driver === 'player') v.parked = false;
  }

  for (const s of sites) {
    const hc = P.toWorld(s.hall, P.HALL_L / 2, 0);
    const dHall = Math.hypot(focus.x - hc[0], focus.y - hc[1]);
    if (!s.planned && !s.planGen && dHall < PLAN_R) startPlan(s);
    if (s.planGen) planStep(s);
    if (!s.gate) continue;
    const d = Math.hypot(focus.x - s.gate.x, focus.y - s.gate.y);
    if (!s.gateGroup && d < STREAM_IN && !inside) buildGate(s);
    else if (s.gateGroup && d > STREAM_OUT) disposeGate(s);
    if (!inside && st.cooldown <= 0 && !w.paused && s.gateGroup && P.inGateZone(s.gate, t.x, t.y)) enter(s);
  }
}
