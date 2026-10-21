// The Groninger Museum's ground floor (museumplan.js) as one merged,
// vertex-coloured mesh: floors, walls with their doorways, ceilings with
// light panels, the art and the Gouden Eierbal case in zaal 3. The rooms are
// portal boxes (portalcut3d.js), so the landmark's own walls are cut away
// inside them and at the passage ends, and the whole interior is only drawn
// while the player is near.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { GeoBuilder, vcMaterial } from './pixelart3d.js';
import { pointInPolygon } from './util.js';
import { MUSEUM_ROOMS, MUSEUM_CASE, rectDist } from './museumplan.js';
import { registerPortalBoxes, registerInterior } from './portalcut3d.js';

export const G_SOLID = 0, G_LAMP = 1;
const SHOW_RADIUS = 95;

export const interiorMat = vcMaterial({ side: THREE.DoubleSide, emissive: 0x2e2a24, emissiveIntensity: 1 });
export const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xd6ecff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, depthWrite: false });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xf0c24e, roughness: 0.25, metalness: 0.85, emissive: 0x3a2800 });
for (const m of [interiorMat, lampMat, glassMat, goldMat]) m.userData.shared = true;

const STYLE = {
  noord: { wall: 0xe7b7a8, floor: 0x6a6e72, ceil: 0xf0e6dc },
  zuid: { wall: 0xe7b7a8, floor: 0x6a6e72, ceil: 0xf0e6dc },
  atrium: { wall: 0xf1e3c8, floor: 0xcfc8bb, ceil: 0xe9eef2 },
  atriumW: { wall: 0xf1e3c8, floor: 0xcfc8bb, ceil: 0xe9eef2 },
  gang: { wall: 0xcdb9df, floor: 0xcfc8bb, ceil: 0xf2efe8 },
  entreehal: { wall: 0xf2d56b, floor: 0xd8d2c4, ceil: 0xf6f1e4 },
  zaal1: { wall: 0xeeeae2, floor: 0x9b7650, ceil: 0xf4f2ee },
  zaal3: { wall: 0x7e2a2a, floor: 0x5e4432, ceil: 0x2b2522 },
  deur1: { wall: 0xe8e2d6, floor: 0xcfc8bb, ceil: 0xe8e2d6 },
  deur3: { wall: 0xe8e2d6, floor: 0xcfc8bb, ceil: 0xe8e2d6 },
  achterdeur: { wall: 0xb9b3a8, floor: 0x8d8a84, ceil: 0xd9d4ca },
};

// world point of room r at local (a, c), height y -> [x, y, z]
export const at = (r, a, c, y) => [r.cx + a * r.ux - c * r.uy, y, r.cy + a * r.uy + c * r.ux];

function openAt(b, r, x, y, rooms) {
  if (!pointInPolygon(x, y, b.pts)) return { open: true, top: 0 };
  let top = null;
  for (const o of rooms) {
    if (o === r || rectDist(o, x, y) > -0.05) continue;
    top = Math.max(top ?? 0, o.h);
  }
  return top === null ? null : { open: true, top };
}

// `rooms`/`r.style` let interieur3d.js shell the other buildings the same way
export function roomShell(B, b, r, i, rooms = MUSEUM_ROOMS) {
  const st = r.style || STYLE[r.id];
  const [A, Bc, Cc, D] = [at(r, -r.hl, -r.hw, 0), at(r, r.hl, -r.hw, 0), at(r, r.hl, r.hw, 0), at(r, -r.hl, r.hw, 0)];
  const fy = 0.03 + i * 0.004;
  const lift = (p, y) => [p[0], y, p[2]];
  B.quadOut(lift(A, fy), lift(Bc, fy), lift(Cc, fy), lift(D, fy), [0, 1, 0], st.floor, G_SOLID);
  B.quadOut(lift(A, r.h), lift(Bc, r.h), lift(Cc, r.h), lift(D, r.h), [0, -1, 0], st.ceil, G_SOLID);
  // walls along the four edges, open where another room or the outside continues
  const edges = [[-r.hl, -r.hw, r.hl, -r.hw, [0, 1]], [r.hl, -r.hw, r.hl, r.hw, [-1, 0]], [r.hl, r.hw, -r.hl, r.hw, [0, -1]], [-r.hl, r.hw, -r.hl, -r.hw, [1, 0]]];
  for (const [a0, c0, a1, c1, [na, nc]] of edges) {
    const L = Math.hypot(a1 - a0, c1 - c0), n = Math.max(1, Math.round(L / 0.25));
    const inward = [na * r.ux - nc * r.uy, 0, na * r.uy + nc * r.ux];
    let runStart = 0, runKind = null;
    const flush = (t0, t1, kind) => {
      if (t1 - t0 < 1e-3 || kind === 'outside') return;
      const p0a = a0 + (a1 - a0) * t0, p0c = c0 + (c1 - c0) * t0, p1a = a0 + (a1 - a0) * t1, p1c = c0 + (c1 - c0) * t1;
      const y0 = kind === 'wall' ? 0 : kind;
      if (y0 >= r.h - 0.01) return;
      B.quadOut(at(r, p0a, p0c, y0), at(r, p1a, p1c, y0), at(r, p1a, p1c, r.h), at(r, p0a, p0c, r.h), inward, st.wall, G_SOLID);
      if (kind === 'wall') B.quadOut(at(r, p0a, p0c, 0), at(r, p1a, p1c, 0), at(r, p1a, p1c, 0.12), at(r, p0a, p0c, 0.12), inward, 0x3a3632, G_SOLID);
    };
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const pa = a0 + (a1 - a0) * t, pc = c0 + (c1 - c0) * t;
      const [x, , y] = at(r, pa, pc, 0);
      const o = openAt(b, r, x, y, rooms);
      const kind = !o ? 'wall' : o.top === 0 ? 'outside' : o.top;
      if (runKind === null) { runKind = kind; runStart = t; continue; }
      if (kind !== runKind || k === n) {
        flush(runStart, t, runKind);
        runKind = kind; runStart = t;
      }
    }
  }
  // a church ceiling (style.balken: interieurplan.js, #340): dark wood with cross beams and a ridge beam, and brass
  // chandeliers with candle flames instead of the office panels
  if (st.balken) { kerkPlafond(B, r); return; }
  // light panels
  const nx = Math.max(1, Math.floor((r.hl * 2) / 3.6)), nz = Math.max(1, Math.floor((r.hw * 2) / 3.6));
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const a = -r.hl + (ix + 0.5) * (r.hl * 2) / nx, c = -r.hw + (iz + 0.5) * (r.hw * 2) / nz;
      const s = r.id === 'zaal3' ? 0.25 : 0.4;
      B.quadOut(at(r, a - s, c - s, r.h - 0.02), at(r, a + s, c - s, r.h - 0.02), at(r, a + s, c + s, r.h - 0.02), at(r, a - s, c + s, r.h - 0.02), [0, -1, 0], 0xffffff, G_LAMP);
    }
  }
}

const BEAM = 0x2c1d12, BRASS = 0xc9a04a, FLAME = 0xffd36a;
function kerkPlafond(B, r) {
  const rot = -Math.atan2(r.uy, r.ux);
  const box = (a, c, y, sa, sy, sc, color, grp = G_SOLID) => { const [x, , z] = at(r, a, c, 0); B.box(x, y, z, sa, sy, sc, color, grp, 0, rot, 0); };
  const n = Math.max(1, Math.round(r.hl * 2 / 4));
  for (let i = 0; i < n; i++) box(-r.hl + (i + 0.5) * (r.hl * 2) / n, 0, r.h - 0.3, 0.34, 0.6, r.hw * 2 - 0.1, BEAM);
  box(0, 0, r.h - 0.12, r.hl * 2 - 0.1, 0.24, 0.5, BEAM);
  // two chandeliers on the ridge beam, one in a small room; they hang up to 2.5 m (less in a low room, clear of a head): chain, ring, four candles
  const lamps = r.hl * 2 >= 14 ? [-r.hl / 2, r.hl / 2] : [0];
  const drop = Math.min(2.5, r.h * 0.22);
  for (const a of lamps) {
    box(a, 0, r.h - drop / 2 - 0.1, 0.04, drop - 0.2, 0.04, BRASS);
    box(a, 0, r.h - drop, 1.2, 0.07, 1.2, BRASS);
    box(a, 0, r.h - drop, 0.8, 0.07, 0.8, BRASS);
    for (const sa of [-0.55, 0.55]) for (const sc of [-0.55, 0.55]) {
      box(a + sa, sc, r.h - drop + 0.12, 0.06, 0.16, 0.06, 0xf4efe2);
      box(a + sa, sc, r.h - drop + 0.26, 0.07, 0.1, 0.07, FLAME, G_LAMP);
    }
  }
}

const R = (id) => MUSEUM_ROOMS.find((q) => q.id === id);

// a framed painting on the wall of room r at local a (along) on side c = +-hw
export function painting(B, r, a, side, w, h, color, seed) {
  const c = side * (r.hw - 0.06);
  const y = 1.25 + h / 2;
  const rot = Math.atan2(r.uy, r.ux);
  const [x, , z] = at(r, a, c, 0);
  B.box(x, y, z, w + 0.16, h + 0.16, 0.06, 0xb08d3c, G_SOLID, 0, -rot, 0);
  const [x2, , z2] = at(r, a, c - side * 0.035, 0);
  B.box(x2, y, z2, w, h, 0.02, color, G_SOLID, 0, -rot, 0);
  // two blocks of colour so they read as art, not as swatches
  const [x3, , z3] = at(r, a + (seed % 2 ? -1 : 1) * w * 0.18, c - side * 0.05, 0);
  B.box(x3, y + h * 0.12, z3, w * 0.34, h * 0.42, 0.02, seed % 3 ? 0xf2efe6 : 0x1f2a44, G_SOLID, 0, -rot, 0);
}

function plinth(B, r, a, c, top) {
  const [x, , z] = at(r, a, c, 0);
  const rot = Math.atan2(r.uy, r.ux);
  B.box(x, 0.5, z, 0.8, 1.0, 0.8, 0xf4f1ea, G_SOLID, 0, -rot, 0);
  if (top === 'pijp') {
    B.box(x, 1.45, z, 0.18, 0.9, 0.18, 0x2c5f8a, G_SOLID, 0, -rot + 0.4, 0);
    B.box(x, 1.95, z, 0.5, 0.14, 0.14, 0xd9412b, G_SOLID, 0.3, -rot, 0.2);
  } else {
    B.box(x, 1.25, z, 0.5, 0.5, 0.5, 0xc9a04a, G_SOLID, 0.6, -rot + 0.7, 0.4);
  }
}

function bench(B, r, a, c) {
  const [x, , z] = at(r, a, c, 0);
  const rot = Math.atan2(r.uy, r.ux);
  B.box(x, 0.42, z, 2.0, 0.08, 0.5, 0x6b4a2e, G_SOLID, 0, -rot, 0);
  for (const s of [-0.8, 0.8]) { const [px, , pz] = at(r, a + s, c, 0); B.box(px, 0.2, pz, 0.08, 0.4, 0.44, 0x2b2b2b, G_SOLID, 0, -rot, 0); }
}

function signTexture(lines, bg, fg) {
  return canvasTex(512, 128, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 52px system-ui, sans-serif';
    g.fillText(lines[0], 256, lines[1] ? 44 : 64);
    if (lines[1]) { g.font = '600 30px system-ui, sans-serif'; g.fillText(lines[1], 256, 96); }
  });
}

// a sign flat on the wall of room r (side c = +-hw), text facing into the room
export function sign(group, r, a, side, y, w, lines, bg = '#1c1c1c', fg = '#f4efe2') {
  const mat = new THREE.MeshBasicMaterial({ map: signTexture(lines, bg, fg) });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
  const [x, , z] = at(r, a, side * (r.hw - 0.05), 0);
  m.position.set(x, y, z);
  // the plane faces +z; turn it to face into the room (towards -side along v)
  const vx = -r.uy * -side, vz = r.ux * -side;
  m.rotation.y = Math.atan2(vx, vz);
  group.add(m);
}

const LAMP_DAY = new THREE.Color(0xfff1d6), LAMP_NIGHT = new THREE.Color(0x9a8f7c), LAMP_ALARM = new THREE.Color(0xff2a1a);
const GLOW_DAY = new THREE.Color(0x2e2a24), GLOW_NIGHT = new THREE.Color(0x27231e), GLOW_ALARM = new THREE.Color(0x5e1712);
// heist.js (H6): the museum after closing time, and its alarm (0..1)
export function setMuseumLights(night, alarm = 0) {
  lampMat.color.copy(night ? LAMP_NIGHT : LAMP_DAY).lerp(LAMP_ALARM, alarm);
  interiorMat.emissive.copy(night ? GLOW_NIGHT : GLOW_DAY).lerp(GLOW_ALARM, alarm * 0.5);
}

let caseGroup = null, caseBall = null, caseHidden = false;
// heist.js hides the case while H6 places its own
export function setMuseumCaseHidden(v) {
  caseHidden = !!v;
  if (caseGroup) caseGroup.visible = !caseHidden;
}

function buildCase(group) {
  const g = new THREE.Group();
  g.position.set(MUSEUM_CASE.x, 0, MUSEUM_CASE.y);
  const plinthM = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0xd9d4c7 }));
  plinthM.position.y = 0.5;
  g.add(plinthM);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), new THREE.MeshStandardMaterial({ color: 0x9c1628, emissive: 0x4a0010 }));
  cushion.position.y = 1.04;
  g.add(cushion);
  caseBall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 2), goldMat);
  caseBall.position.y = 1.24;
  g.add(caseBall);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), glassMat);
  glass.position.y = 1.38;
  g.add(glass);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.05, 0.94), new THREE.MeshStandardMaterial({ color: 0xb8a36a }));
  lid.position.y = 1.77;
  g.add(lid);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 2.9, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.y = 3.3;
  g.add(beam);
  caseGroup = g;
  caseGroup.visible = !caseHidden;
  group.add(g);
}

// the Gouden Eierbal is gone once H6 has been played (Jelle took it first);
// missions.js tells us how to know
let stolenFn = () => false;
export function setMuseumCaseStolen(fn) { stolenFn = fn; }
function refreshCase() {
  if (!caseBall) return;
  let stolen = false;
  try { stolen = !!stolenFn(); } catch (e) { stolen = false; }
  caseBall.visible = !stolen;
}

let built = null;
export function buildMuseumInterior(b) {
  if (built) return built;
  const B = new GeoBuilder(2);
  MUSEUM_ROOMS.forEach((r, i) => roomShell(B, b, r, i));
  // zaal 1: Grunneger meesters and two sculptures
  const z1 = R('zaal1');
  [[-3.6, 1, 1.6, 1.1, 0x5f7f4a], [0, 1, 2.0, 1.3, 0x3d5d8a], [3.6, 1, 1.4, 1.0, 0xc9803a], [-3.4, -1, 1.8, 1.2, 0x8a3a3a], [0.4, -1, 1.2, 1.5, 0x2f6b6b], [3.8, -1, 1.5, 1.0, 0xd6b03a]]
    .forEach(([a, side, w, h, col], k) => painting(B, z1, a, side, w, h, col, k));
  plinth(B, z1, -2.2, 2.5, 'pijp');
  plinth(B, z1, 2.4, -2.8, 'blok');
  bench(B, z1, 0, 0);
  // zaal 3: the treasure room, the case in the middle and gold-framed portraits
  const z3 = R('zaal3');
  [[-3.2, 1, 1.2, 1.5, 0x2a2440], [3.2, 1, 1.2, 1.5, 0x40302a], [-3.2, -1, 1.4, 1.1, 0x5a4a2a], [3.4, -1, 1.2, 1.4, 0x2a3a40]]
    .forEach(([a, side, w, h, col], k) => painting(B, z3, a, side, w, h, col, k + 3));
  bench(B, z3, 0, -5.2);
  // Entreehal: the desk and the shop shelves
  const eh = R('entreehal');
  { const [x, , z] = at(eh, -2, -2.4, 0); B.box(x, 0.55, z, 4.2, 1.1, 0.8, 0xe9e2d3, G_SOLID, 0, -Math.atan2(eh.uy, eh.ux), 0); }
  for (const a of [4.5, 6.3, 8.1]) { const [x, , z] = at(eh, a, 3.6, 0); B.box(x, 1.0, z, 1.4, 2.0, 0.5, 0x7a5a3c, G_SOLID, 0, -Math.atan2(eh.uy, eh.ux), 0); }
  bench(B, R('atrium'), 1.6, -5);
  bench(B, R('atrium'), 1.6, 5);
  const geo = B.build();
  const group = new THREE.Group();
  group.name = 'museum-interior';
  group.add(new THREE.Mesh(geo, [interiorMat, lampMat]));
  sign(group, eh, -2, -1, 3.8, 5.2, ['GRONINGER MUSEUM', 'Entree · Kassa · Winkel'], '#1d1b19', '#f0c24e');
  sign(group, z1, 0, -1, 3.9, 3.2, ['ZAAL 1', 'Grunneger meesters']);
  sign(group, z3, 0, -1, 3.9, 3.2, ['ZAAL 3', 'De Gouden Eierbal'], '#2b1414', '#f0c24e');
  sign(group, R('gang'), -4.3, 1, 2.6, 1.8, ['INGANG', 'Groninger Museum'], '#f4efe2', '#1c1c1c');
  sign(group, R('achterdeur'), -6.8, -1, 2.4, 1.6, ['ACHTERINGANG', 'Alleen personeel'], '#3a3a3a', '#f4efe2');
  buildCase(group);
  refreshCase();
  registerPortalBoxes(b, MUSEUM_ROOMS.map((r) => ({ cx: r.cx, cy: r.cy, ux: r.ux, uy: r.uy, hl: r.hl, hw: r.hw, top: r.h + 0.02, bottom: -2 })));
  registerInterior(group, { x: 82.44, y: 802.27 }, SHOW_RADIUS, refreshCase);
  built = group;
  return group;
}
