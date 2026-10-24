// Het binnenste van de trein in beeld (#442): vloer, wanden met ramen, deuren die op een halte opengaan, rijen stoelen,
// haltestangen, lampen, een machinistencabine met bureau en zitje, en reizigers die zitten of staan. De indeling en het
// lopen staan in treinlayout.js (puur, getest). Alleen dichtbij gebouwd: alleen de trein die de speler bestuurt en alleen
// de wagens bij de speler, zolang hij binnen kijkt (C of rondlopen); de geometrie wordt per soort wagen gedeeld
// (markShared) en de schil van buiten gaat verborgen zolang je binnen bent. railway3d.js roept syncTreinInterieur aan.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { trainLayout, passengers, driverEye, WALL_Z, DOOR_W, AISLE } from './treinlayout.js';

const FLOOR = 0x2b2f36, RUNNER = 0x3b4a5c, WALL = 0xd9d7cf, CEIL = 0xeceae3, SEAT = 0x2f5d8a, SEAT_DARK = 0x233f5d, POLE = 0xe5b800, DESK = 0x2a2e35, TRIM = 0x8a8f98;
const LAMP = 0xfff4d6, GLASS = 0x9fc4d8, SCREEN = 0x3cff7a;
const SHIRTS = [0xc0392b, 0x2e7d9a, 0x6a8f3a, 0xe0a030, 0x7a4f9a, 0x4a4f58];
const SKINS = [0xf1c9a5, 0xc68d62, 0x8d5a3b];
const PANTS = 0x2a3140;
const SILL = 0.95, HEADER = 2.05;

const geoCache = new Map();
const doorGeoCache = new Map();
let mats = null;
function materials() {
  if (mats) return mats;
  mats = [
    // binnen brandt het licht van de trein: ongeschaduwd, ook 's nachts leesbaar
    markShared(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xd2d2d2 })),
    markShared(new THREE.MeshBasicMaterial({ vertexColors: true })),
    markShared(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })),
  ];
  return mats;
}

// Een wandvlak langs x tussen x0 en x1, van hoogte y0 tot y1, aan kant s (-1 of 1), met openingen voor de deuren (alleen onder HEADER).
function wall(B, s, x0, x1, y0, y1, color, gaps) {
  let from = x0;
  const cuts = (gaps || []).filter((g) => g[1] > x0 && g[0] < x1).sort((a, b) => a[0] - b[0]);
  const piece = (a, b) => { if (b - a > 0.02) B.box((a + b) / 2, (y0 + y1) / 2, s * WALL_Z, b - a, y1 - y0, 0.05, color); };
  for (const [a, b] of cuts) { piece(from, Math.max(from, a)); from = Math.max(from, b); }
  piece(from, x1);
}

// De geometrie van een wagen: groep 0 = alles dat licht vangt, 1 = lampen en schermen (zelflichtend), 2 = glas.
export function buildCarGeometry(cfg, seg, cl) {
  const B = new GeoBuilder(3);
  const L = cl.len, f = cl.floorY, c = cl.ceilY;
  const gaps = cl.doors.map((d) => [d - DOOR_W / 2, d + DOOR_W / 2]);
  // vloer, loper en plafond
  B.box(0, f - 0.03, 0, L + 0.2, 0.06, WALL_Z * 2, FLOOR);
  if (cl.kind === 'car') B.box(0, f + 0.005, 0, L - 0.2, 0.012, 0.5, RUNNER);
  B.box(0, c + 0.025, 0, L, 0.05, WALL_Z * 2, CEIL);
  for (const x of cl.lamps) B.box(x, c - 0.015, 0, 0.8, 0.03, 0.3, LAMP, 1);
  // wanden: een lage plaat, een lijst erboven, raampijlers en glas ertussen; bij de deuren geen plaat
  for (const s of [-1, 1]) {
    wall(B, s, -L / 2, L / 2, f, f + SILL, WALL, gaps);
    wall(B, s, -L / 2, L / 2, f + HEADER, c, WALL, null);
    for (const x of cl.pillars) B.box(x, f + (SILL + HEADER) / 2, s * WALL_Z, 0.14, HEADER - SILL, 0.05, WALL);
    for (const g of gaps) for (const gx of g) B.box(gx, f + HEADER / 2, s * WALL_Z, 0.07, HEADER, 0.07, POLE);
    // glas: een strook per stuk wand tussen de deuren
    let from = -L / 2;
    const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
    const strip = (a, b) => { if (b - a > 0.3) B.quad([a, f + SILL, s * (WALL_Z + 0.01)], [b, f + SILL, s * (WALL_Z + 0.01)], [b, f + HEADER, s * (WALL_Z + 0.01)], [a, f + HEADER, s * (WALL_Z + 0.01)], GLASS, 2); };
    for (const [a, b] of sorted) { strip(from, a); from = b; }
    strip(from, L / 2);
  }
  if (cl.kind === 'power') {
    // de tussenmodule: een smalle gang met een machinekast
    for (const s of [-1, 1]) B.box(0, f + 0.5, s * (WALL_Z - 0.3), L - 0.4, 1.0, 0.45, DESK);
    return B.build();
  }
  // stoelen
  for (const s of cl.seats) {
    B.box(s.x, f + 0.2, s.z, 0.4, 0.4, 0.34, SEAT_DARK);
    B.box(s.x, f + 0.44, s.z, 0.5, 0.1, 0.42, SEAT);
    B.box(s.x - 0.23, f + 0.8, s.z, 0.08, 0.62, 0.42, SEAT);
  }
  // haltestangen en de lange stang boven de stoelen
  for (const p of cl.poles) B.box(p.x, (f + c) / 2, p.z, 0.05, c - f, 0.05, POLE);
  for (const sz of [-0.5, 0.5]) B.box((cl.saloon[0] + cl.saloon[1]) / 2, c - 0.22, sz, cl.saloon[1] - cl.saloon[0], 0.035, 0.035, POLE);
  // de cabine: een wand met een deurtje in het gangpad, het bureau met instrumenten, het zitje van de machinist
  if (cl.cab) {
    const e = cl.cab, xb = cl.bulkhead;
    const wallX = (z0, z1, y0, y1) => B.box(xb, (y0 + y1) / 2, (z0 + z1) / 2, 0.05, y1 - y0, z1 - z0, WALL);
    wallX(-WALL_Z, -AISLE, f, c); wallX(AISLE, WALL_Z, f, c); wallX(-AISLE, AISLE, f + 2.0, c);
    // voorkant van de cabine: het dashboard vult de onderkant, de ruit is open (de schil is verborgen)
    const fx = e * (L / 2 - 0.2);
    B.box(fx, f + 0.5, 0, 0.06, 1.0, WALL_Z * 2, DESK);
    B.box(fx, (f + HEADER + c) / 2, 0, 0.06, c - f - HEADER, WALL_Z * 2, WALL);
    for (const z of [-WALL_Z + 0.08, WALL_Z - 0.08]) B.box(fx, f + (1 + HEADER) / 2, z, 0.1, HEADER - 1, 0.12, TRIM);
    const dx = e * (L / 2 - 0.65);
    B.box(dx, f + 0.45, 0, 0.62, 0.9, WALL_Z * 2 - 0.3, DESK);
    B.box(dx - e * 0.04, f + 0.98, 0, 0.42, 0.07, WALL_Z * 2 - 0.4, TRIM, 0, 0, 0, e * 0.35);
    for (const [z, w] of [[-0.55, 0.28], [-0.12, 0.28], [0.42, 0.22]]) B.box(dx - e * 0.12, f + 1.03, z, 0.02, 0.17, w, SCREEN, 1, 0, 0, e * 0.35);
    // de hendel en de waakzaamheidsknop
    B.box(dx - e * 0.2, f + 1.06, 0.78, 0.05, 0.16, 0.05, TRIM);
    B.box(dx - e * 0.2, f + 1.16, 0.78, 0.08, 0.05, 0.08, 0xd94a3a);
    B.box(dx - e * 0.18, f + 1.02, 0.95, 0.1, 0.03, 0.1, 0xe0a030);
    const eye = driverEye(cl);
    B.box(eye.x - e * 0.05, f + 0.22, eye.z, 0.45, 0.44, 0.45, SEAT_DARK);
    B.box(eye.x - e * 0.05, f + 0.48, eye.z, 0.5, 0.1, 0.5, SEAT);
    B.box(eye.x - e * 0.32, f + 0.85, eye.z, 0.09, 0.7, 0.5, SEAT);
  }
  return B.build();
}

function geometryFor(cfg, seg, cl) {
  const key = [cfg.front, cfg.doubleDeck, seg.len, seg.cab || 0, seg.kind].join('|');
  let g = geoCache.get(key);
  if (!g) { g = markShared(buildCarGeometry(cfg, seg, cl)); geoCache.set(key, g); }
  return g;
}

function doorLeafGeometry(cfg, cl) {
  const key = `${cfg.door}|${cl.ceilY - cl.floorY}`;
  let g = doorGeoCache.get(key);
  if (!g) {
    const B = new GeoBuilder(1);
    B.box(0, 1.0, 0, DOOR_W / 2 - 0.02, 2.0, 0.04, cfg.door);
    B.box(0, 1.55, 0, DOOR_W / 2 - 0.2, 0.6, 0.045, GLASS);
    g = markShared(B.build());
    doorGeoCache.set(key, g);
  }
  return g;
}

// Reizigers: een zittende of staande figuur per plek, in een gemeenschappelijke geometrie per wagen en zaadje.
export function buildPassengerGeometry(cl, seed) {
  const pax = passengers(cl, seed);
  if (!pax.seated.length && !pax.standing.length) return null;
  const B = new GeoBuilder(1);
  const f = cl.floorY;
  for (const p of pax.seated) {
    const shirt = SHIRTS[p.c], skin = SKINS[p.s];
    B.box(p.x + 0.12, f + 0.56, p.z, 0.42, 0.14, 0.3, PANTS);
    B.box(p.x + 0.3, f + 0.28, p.z, 0.13, 0.52, 0.26, PANTS);
    B.box(p.x - 0.04, f + 0.88, p.z, 0.22, 0.52, 0.36, shirt);
    B.box(p.x - 0.02, f + 1.27, p.z, 0.2, 0.2, 0.2, skin);
  }
  for (const p of pax.standing) {
    const shirt = SHIRTS[p.c], skin = SKINS[p.s];
    B.box(p.x, f + 0.45, p.z, 0.2, 0.9, 0.34, PANTS, 0, 0, p.a);
    B.box(p.x, f + 1.15, p.z, 0.22, 0.6, 0.38, shirt, 0, 0, p.a);
    B.box(p.x, f + 1.6, p.z, 0.2, 0.2, 0.2, skin, 0, 0, p.a);
  }
  return B.build();
}

// --- in de scene ---------------------------------------------------------------------------------------

const states = new WeakMap(); // wagengroep -> { interior, doors, pax, paxSeed, hidden }

function buildInterior(group, cfg, seg, cl, seed) {
  const interior = new THREE.Group();
  interior.userData.interieur = true;
  const m = new THREE.Mesh(geometryFor(cfg, seg, cl), materials());
  m.name = 'treininterieur';
  m.frustumCulled = false;
  interior.add(m);
  const doors = [];
  if (cl.kind === 'car') {
    const leaf = doorLeafGeometry(cfg, cl);
    const dm = materials()[0];
    for (const dx of cl.doors) for (const s of [-1, 1]) for (const half of [-1, 1]) {
      const mesh = new THREE.Mesh(leaf, dm);
      mesh.position.set(dx + half * DOOR_W / 4, cl.floorY, s * (WALL_Z + 0.02));
      mesh.frustumCulled = false;
      interior.add(mesh);
      doors.push({ mesh, x: dx, half });
    }
  }
  group.add(interior);
  const st = { interior, doors, pax: null, paxSeed: -1, hidden: false, seed };
  states.set(group, st);
  return st;
}

function setPassengers(st, cl, seed) {
  if (st.paxSeed === seed) return;
  st.paxSeed = seed;
  if (st.pax) { st.interior.remove(st.pax); st.pax.geometry.dispose(); st.pax = null; }
  const g = buildPassengerGeometry(cl, seed);
  if (!g) return;
  st.pax = new THREE.Mesh(g, materials()[0]);
  st.pax.frustumCulled = false;
  st.interior.add(st.pax);
}

function showShell(group, st, hidden) {
  if (st.hidden === hidden) return;
  st.hidden = hidden;
  for (const ch of group.children) if (!ch.userData.interieur) ch.visible = !hidden;
}

// De wagens die binnen een bouwafstand van de speler liggen: de eigen wagen en de buren.
function wantedCars(world, t) {
  const walk = world.trainWalk;
  const i = walk ? walk.car : (t.cab > 0 ? 0 : t.cars.length - 1);
  return [i - 1, i, i + 1];
}

// Eén keer per frame voor de trein die de speler bestuurt. view: { group, cars: [wagengroep] } (railway3d.js).
export function syncTreinInterieur(view, t, world, dt) {
  const tc = world.trainCam;
  const inside = !!(t === world.trainDriving && tc && tc.inside);
  const layout = trainLayout(t.cfg);
  const want = inside ? wantedCars(world, t) : [];
  const target = t.doorsOpen ? 1 : 0;
  if (view.deurOpen === undefined) view.deurOpen = 0;
  if (view.deurDoel === 1 && target === 0) view.paxSeed = (view.paxSeed || 11) + 1; // de reizigers wisselen op een halte
  view.deurDoel = target;
  view.deurOpen += (target - view.deurOpen) * Math.min(1, dt * 3.2);
  if (view.paxSeed === undefined) view.paxSeed = 11 + (Math.floor(t.c) % 97);
  view.cars.forEach((group, i) => {
    let st = states.get(group);
    const cl = layout[i];
    if (!inside || !cl || !want.includes(i)) {
      if (st) { st.interior.visible = false; showShell(group, st, false); }
      return;
    }
    if (!st) st = buildInterior(group, t.cfg, t.cars[i].seg, cl, view.paxSeed);
    st.interior.visible = true;
    showShell(group, st, true);
    setPassengers(st, cl, view.paxSeed + i * 31);
    const open = view.deurOpen;
    for (const d of st.doors) d.mesh.position.x = d.x + d.half * (DOOR_W / 4 + 0.62 * open);
  });
}

// Aantal wagens met een gebouwd binnenste (voor de test en de prestatiemeting).
export const builtCount = (view) => view.cars.filter((g) => states.has(g)).length;
