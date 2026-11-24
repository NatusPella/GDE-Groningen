// #955: a mission can dress its own place. The race already got a finish arch and
// spectators (racedecor.js); this module gives the Bourtange mission its
// re-enactment (tents, cardboard cannons, costumed actors and an audience) and
// Tinus' barn its yard (tractor, hay, crates and the friends waiting there).
//
// The plan is pure (dressingPlan) and node-tested; drawing needs three.js and the
// scene. Props and people stand outside the stage circle so the player can still
// walk to the marker.
import * as THREE from 'three';
import { getScene } from './scene3d.js';
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { buildModularFromAppearance, modularReady, mensenFase } from './modularpeople.js';
import { FLAGS } from './devflags.js';
import { animateActor } from './actoranim.js';
import { canvasTex, signBothSides } from './canvastex.js';
import { hoofdspeler } from './players.js';
import { buildProp as buildWachtProp } from './wachtprops.js';
import { isInWater, pointInPolygon } from './util.js';
import { crowdSpecToWorld, seedFromKey } from './crowdplan.js';
import { buildCrowd, updateCrowd, disposeCrowd } from './crowd.js';

const H = 2.4; // a person's height, for scale only

// Relative to the anchor: `along` is the direction the player faces, `side` to
// the right. Negative `along` is behind the player.
const PLANS = {
  naspeling: {
    props: [
      { kind: 'tent', along: 9, side: -9.5, a: -0.25 },
      { kind: 'tent', along: 13, side: 8.5, a: 0.35 },
      { kind: 'kanon', along: 7.5, side: 7.6, a: -0.15 },
      { kind: 'kanon', along: 8.5, side: -6.4, a: 0.2 },
      { kind: 'vaandel', along: 5.5, side: 9.4, a: 0 },
      { kind: 'vaandel', along: 15, side: -7.2, a: 0 },
      { kind: 'kist', along: 11, side: 4.8, a: 0.4 },
      { kind: 'ton', along: 11.8, side: 5.6, a: 0 },
      { kind: 'banner', along: 16.5, side: 0, a: 0, title: 'HET BELEG VAN BOURTANGE', sub: 'Naspeling 1672' },
    ],
    people: [
      { look: { shirt: 0x7a3a2a, skin: 0xd9a06e, seed: 8101, variant: 'male' }, along: 6.8, side: 6.0, a: -0.5, anim: 'point' },
      { look: { shirt: 0x3f5a3a, skin: 0xf1c9a5, seed: 8102, variant: 'male' }, along: 7.4, side: 5.0, a: -0.3, anim: 'talk' },
      { look: { shirt: 0x6a4a2a, skin: 0xa9744a, seed: 8103, variant: 'female' }, along: 9.0, side: 6.6, a: -0.6, anim: 'cheer' },
      { look: { shirt: 0x8a4a2a, skin: 0xf1c9a5, seed: 8104, variant: 'female' }, along: 9.8, side: 5.2, a: -0.2, anim: 'talk' },
      // the audience behind the rope, on both sides
      ...Array.from({ length: 6 }, (_, i) => ({
        look: { shirt: [0xc8552e, 0x2f6fb0, 0xe0b93a, 0x3f8a52, 0x8a4a8a, 0x555f6e][i], skin: [0xf1c9a5, 0xd9a06e, 0xa9744a, 0x7a4e2e][i % 4], seed: 8200 + i, variant: i % 3 === 0 ? 'female' : null },
        along: 13.5 + (i % 2) * 1.1, side: (i < 3 ? -1 : 1) * (10.5 + (i % 3) * 0.9), a: i < 3 ? 2.6 : -2.6, anim: 'idle', h: 0.92 + (i % 3) * 0.03,
      })),
    ],
  },
  schuur: {
    props: [
      { kind: 'tractor', along: -7.5, side: 7.0, a: 1.2 },
      { kind: 'baal', along: 6.0, side: -7.5, a: 0.3 },
      { kind: 'baal', along: 7.0, side: -8.4, a: 1.1 },
      { kind: 'baal', along: 6.4, side: -8.0, a: 2.0, y: 0.9 },
      { kind: 'kist', along: -4.5, side: -5.8, a: -0.3 },
      { kind: 'kist', along: -5.2, side: -6.6, a: 0.4 },
      { kind: 'ton', along: -6.0, side: 5.4, a: 0 },
      { kind: 'bank', along: -3.0, side: 6.2, a: -1.2 },
    ],
    people: [
      { look: { shirt: 0x4a5a6a, skin: 0xf1c9a5, seed: 8301, variant: 'male' }, along: -4.0, side: 4.8, a: 1.1, anim: 'talk' },
      { look: { shirt: 0x6a4a3a, skin: 0xd9a06e, seed: 8302, variant: 'male' }, along: -4.8, side: 5.6, a: 1.3, anim: 'hips' },
      { look: { shirt: 0x3f6a4a, skin: 0xa9744a, seed: 8303, variant: 'female' }, along: 4.5, side: 5.6, a: -1.4, anim: 'idle' },
    ],
  },
  // bouwsteen G0b: een plein met een jury en kramen (M26), de stuntarena (M01), de kade (M13/M15) en het perron (M19);
  // het publiek komt uit crowd (crowdplan.js, lokale maten along/side) en staat nooit in water, gebouw of op de weg
  plein: {
    props: [
      { kind: 'jurytafel', along: 10, side: 0, a: Math.PI },
      { kind: 'kraam', along: 8, side: -9.5, a: -0.3 },
      { kind: 'kraam', along: 11.5, side: -10.5, a: -0.1 },
      { kind: 'kraam', along: 8, side: 9.5, a: 0.3 },
      { kind: 'kraam', along: 11.5, side: 10.5, a: 0.1 },
      { kind: 'vaandel', along: 14, side: -6, a: 0 },
      { kind: 'vaandel', along: 14, side: 6, a: 0 },
      { kind: 'banner', along: 17, side: 0, a: 0, title: 'FEEST OP HET PLEIN', sub: 'De zomermarkt' },
    ],
    people: [
      { look: { shirt: 0x2f4a6a, skin: 0xf1c9a5, seed: 8401, variant: 'male' }, along: 11.3, side: -1.3, a: Math.PI, anim: 'talk' },
      { look: { shirt: 0x7a3a4a, skin: 0xd9a06e, seed: 8402, variant: 'female' }, along: 11.3, side: 0, a: Math.PI, anim: 'nod' },
      { look: { shirt: 0x3a5a3a, skin: 0xa9744a, seed: 8403, variant: 'male' }, along: 11.3, side: 1.3, a: Math.PI, anim: 'talk' },
      { look: { shirt: 0xc8552e, skin: 0xf1c9a5, seed: 8404, variant: 'female' }, along: 9, side: -8.2, a: 1.4, anim: 'hips' },
    ],
    crowd: { shape: 'ring', x: 12, y: 0, radius: 7.5, depth: 4, count: 36, gapA: Math.PI, gapW: 0.9 },
  },
  stuntarena: {
    props: [
      { kind: 'hek', along: 14.00, side: 0.00, a: 1.57 },
      { kind: 'hek', along: 12.12, side: 7.00, a: 2.09 },
      { kind: 'hek', along: 7.00, side: 12.12, a: 2.62 },
      { kind: 'hek', along: 0.00, side: 14.00, a: 3.14 },
      { kind: 'hek', along: -7.00, side: 12.12, a: 3.67 },
      { kind: 'hek', along: -12.12, side: 7.00, a: 4.19 },
      { kind: 'hek', along: -14.00, side: 0.00, a: 4.71 },
      { kind: 'hek', along: -12.12, side: -7.00, a: 5.24 },
      { kind: 'hek', along: -7.00, side: -12.12, a: 5.76 },
      { kind: 'hek', along: -0.00, side: -14.00, a: 6.28 },
      { kind: 'hek', along: 7.00, side: -12.12, a: 6.81 },
      { kind: 'hek', along: 12.12, side: -7.00, a: 7.33 },
      { kind: 'banner', along: 0, side: -17, a: 0, title: 'STUNTAVOND', sub: 'Kom kijken, blijf achter het hek' },
    ],
    people: [
      { look: { shirt: 0xe0b93a, skin: 0xf1c9a5, seed: 8501, variant: 'male' }, along: 0, side: -12.3, a: 1.57, anim: 'point' },
      { look: { shirt: 0xe0b93a, skin: 0xa9744a, seed: 8502, variant: 'female' }, along: -10, side: 7.2, a: -0.9, anim: 'wave' },
      { look: { shirt: 0xe0b93a, skin: 0xd9a06e, seed: 8503, variant: 'male' }, along: 9, side: 8.6, a: -2.2, anim: 'talk' },
    ],
    crowd: { shape: 'ring', x: 0, y: 0, radius: 15.5, depth: 2.5, count: 12 },
  },
  kade: {
    props: [
      { kind: 'kist', along: 6, side: -9, a: 0.2 },
      { kind: 'kist', along: 7.4, side: -9.6, a: 0.7 },
      { kind: 'kist', along: 9.5, side: -8.6, a: -0.2 },
      { kind: 'ton', along: -6, side: 9, a: 0 },
      { kind: 'ton', along: -4.8, side: 9.8, a: 0 },
      { kind: 'ton', along: 8, side: 9.6, a: 0 },
      { kind: 'vaandel', along: 12, side: -9, a: 0 },
      { kind: 'vaandel', along: 12, side: 9, a: 0 },
    ],
    people: [
      { look: { shirt: 0x3a6a8a, skin: 0xf1c9a5, seed: 8601, variant: 'male' }, along: 5, side: 7, a: -1.2, anim: 'hips' },
      { look: { shirt: 0x6a4a2a, skin: 0xd9a06e, seed: 8602, variant: 'male' }, along: 6.2, side: 7.8, a: -1.0, anim: 'talk' },
      { look: { shirt: 0x8a4a6a, skin: 0xa9744a, seed: 8603, variant: 'female' }, along: -5, side: -8, a: 1.3, anim: 'point' },
    ],
    crowd: { shape: 'line', pts: [[-12, 11], [16, 11]], count: 20, side: 2, spread: 3 },
  },
  perron: {
    props: [
      { kind: 'bank', along: 6, side: -8.5, a: 0 },
      { kind: 'bank', along: 10, side: -8.5, a: 0 },
      { kind: 'bank', along: 14, side: -8.5, a: 0 },
      { kind: 'perronbord', along: 4.5, side: -9.6, a: 0 },
      { kind: 'vaandel', along: 16, side: 9, a: 0 },
      { kind: 'vaandel', along: 16, side: -9, a: 0 },
    ],
    people: [
      { look: { shirt: 0x3a3a4a, skin: 0xf1c9a5, seed: 8701, variant: 'male' }, along: 8, side: 7.5, a: -1.6, anim: 'point' },
      { look: { shirt: 0x2f4a8a, skin: 0xd9a06e, seed: 8702, variant: 'female' }, along: 12, side: 8.6, a: -1.4, anim: 'wave' },
      { look: { shirt: 0x6a6a2a, skin: 0xa9744a, seed: 8703, variant: 'male' }, along: 3, side: -8, a: 1.4, anim: 'idle' },
    ],
    crowd: { shape: 'line', pts: [[-6, 9], [16, 9]], count: 24, side: 2.5, spread: 3 },
  },
};

export const DRESSING_KINDS = Object.keys(PLANS);

// Een missiemodule (missions_akte3.js) meldt hier een eigen plan aan, zodat plannen van een akte in het bestand van die akte
// staan. Een bestaande naam wordt nooit overschreven; geeft true als het plan erbij kwam.
export function registreerAankleding(kind, plan) {
  if (!kind || PLANS[kind] || !plan || !Array.isArray(plan.props) || !Array.isArray(plan.people)) return false;
  PLANS[kind] = plan;
  DRESSING_KINDS.push(kind);
  return true;
}

// #955 (M19): de richting van het dichtstbijzijnde spoor bij (x, y), in radialen (0 tot pi), of null als er binnen maxD geen
// spoor ligt. Het perron staat zo langs het spoor in plaats van dwars erop (de aankleding kijkt anders met de speler mee en
// zette een bank, een bord en een reiziger op de rails). routes: [{ pts: [[x, y], ...] }], zoals railway.getRoutes().
export function spoorHoek(routes, x, y, maxD = 40) {
  let beste = null, bestD = maxD;
  for (const r of routes || []) {
    const pts = r && r.pts;
    if (!pts) continue;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay;
      const L2 = dx * dx + dy * dy;
      if (!L2) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (d < bestD) { bestD = d; beste = Math.atan2(dy, dx); }
    }
  }
  if (beste === null) return null;
  return ((beste % Math.PI) + Math.PI) % Math.PI;
}

// The props and people of a kind, relative to the anchor. Pure; a copy, so a
// caller cannot change the shared plan.
export function dressingPlan(kind) {
  const p = PLANS[kind];
  if (!p) return null;
  return {
    props: p.props.map((q) => ({ ...q })),
    people: p.people.map((q) => ({ ...q, look: { ...q.look } })),
    crowd: p.crowd ? { ...p.crowd, pts: p.crowd.pts ? p.crowd.pts.map((q) => [...q]) : undefined } : null,
  };
}

function stripeTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a3a2a';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 30, h);
    g.fillStyle = 'rgba(60, 40, 20, 0.18)';
    for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 2);
  });
}

function bannerTex(title, sub) {
  return canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = '#f0ede4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7a1f1f'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#7a1f1f'; g.textAlign = 'center'; g.font = 'bold 34px Georgia, serif';
    g.fillText(title, w / 2, 78);
    g.fillStyle = '#2a2a2a'; g.font = '22px Georgia, serif'; g.fillText(sub, w / 2, 126);
  });
}

function mat(color) { return new THREE.MeshLambertMaterial({ color }); }
function box(w, h, d, color, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(x, y, z); return m; }
function cyl(r, h, color, x, y, z, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(color)); m.position.set(x, y, z); return m; }

function tent() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshLambertMaterial({ map: stripeTex(), side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.0), cloth);
    roof.position.set(0, 1.25, s * 1.05);
    roof.rotation.x = s * -1.1;
    g.add(roof);
  }
  for (const x of [-1.45, 1.45]) for (const z of [-1.3, 1.3]) g.add(box(0.08, 1.45, 0.08, 0x6b4a2a, x, 0.73, z));
  g.add(box(3.0, 0.02, 2.6, 0x8a6a44, 0, 0.02, 0));
  return g;
}

function kanon() {
  const g = new THREE.Group();
  g.add(box(1.5, 0.22, 0.75, 0x7a5a36, 0, 0.46, 0));
  for (const x of [-0.45, 0.45]) for (const z of [-0.46, 0.46]) {
    const wheel = cyl(0.32, 0.12, 0x5a3f26, x, 0.34, z, 12);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 1.5, 12), mat(0x2a2d30));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, 0.72, 0);
  g.add(barrel);
  const mouth = cyl(0.2, 0.08, 0x15171a, 0.75, 0.72, 0, 12);
  mouth.rotation.z = Math.PI / 2;
  g.add(mouth);
  return g;
}

function vaandel() {
  const g = new THREE.Group();
  g.add(cyl(0.05, 3.2, 0x6b4a2a, 0, 1.6, 0, 6));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshLambertMaterial({ color: 0xc8261e, side: THREE.DoubleSide }));
  flag.position.set(0.65, 2.55, 0);
  g.add(flag);
  return g;
}

function tractor() {
  const g = new THREE.Group();
  g.add(box(2.4, 0.7, 1.2, 0x3f6a3a, 0, 0.75, 0));
  g.add(box(1.1, 1.0, 1.0, 0x355a32, -0.5, 1.55, 0));
  g.add(box(0.9, 0.03, 0.9, 0x9fd0e0, -0.5, 1.85, 0));
  for (const x of [-0.9, 0.55]) for (const z of [-0.72, 0.72]) {
    const r = x < 0 ? 0.56 : 0.34;
    const wheel = cyl(r, 0.24, 0x1d1f21, x, r, z, 14);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  }
  g.add(box(0.06, 0.9, 0.06, 0x2a2a2a, 0.6, 0.45, 0));
  return g;
}

function hek() {
  const g = new THREE.Group();
  for (const x of [-1.4, 0, 1.4]) g.add(box(0.08, 1.05, 0.08, 0x9aa0a8, x, 0.52, 0));
  g.add(box(3.1, 0.18, 0.06, 0xc8261e, 0, 0.6, 0), box(3.1, 0.18, 0.06, 0xd8d2c2, 0, 0.92, 0));
  return g;
}

function jurytafel() {
  const g = new THREE.Group();
  g.add(box(3.2, 0.06, 0.9, 0x8a6238, 0, 0.78, 0), box(3.3, 0.02, 1.0, 0xf0ede4, 0, 0.82, 0));
  for (const x of [-1.5, 1.5]) g.add(box(0.07, 0.76, 0.07, 0x6f4d2a, x, 0.38, 0.35), box(0.07, 0.76, 0.07, 0x6f4d2a, x, 0.38, -0.35));
  for (const x of [-1.1, 0, 1.1]) g.add(box(0.2, 0.3, 0.14, 0xd9a03a, x, 0.99, 0.15));
  return g;
}

function kraam() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshLambertMaterial({ map: stripeTex(), side: THREE.DoubleSide });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), cloth);
  roof.position.set(0, 2.25, 0.1);
  roof.rotation.x = -Math.PI / 2 + 0.35;
  g.add(roof, box(2.2, 0.08, 1.0, 0x8a6238, 0, 0.95, 0.3), box(2.2, 0.9, 0.9, 0x9a7a4a, 0, 0.45, 0.3));
  for (const x of [-1.1, 1.1]) g.add(box(0.07, 2.3, 0.07, 0x6b4a2a, x, 1.15, -0.55));
  return g;
}

function perronbord() {
  const g = new THREE.Group();
  g.add(cyl(0.05, 2.6, 0x777d88, 0, 1.3, 0, 6), box(1.0, 0.5, 0.06, 0x2f6fb0, 0, 2.3, 0), box(0.8, 0.08, 0.07, 0xf0ede4, 0, 2.3, 0));
  return g;
}

// Extra onderdelen van andere modules (monumentkits3d.js: linde, lantaarn, kogels): een bestaande naam wordt nooit overschreven.
const EXTRA_PROPS = {};
export function registreerPropBouwer(kind, bouwer) {
  if (!kind || EXTRA_PROPS[kind] || typeof bouwer !== 'function') return false;
  EXTRA_PROPS[kind] = bouwer;
  return true;
}

const WACHT_SPULLEN = ['bank', 'kist', 'baal', 'ton'];
export function simpleProp(kind) {
  if (EXTRA_PROPS[kind]) return EXTRA_PROPS[kind]();
  if (kind === 'hek') return hek();
  if (kind === 'jurytafel') return jurytafel();
  if (kind === 'kraam') return kraam();
  if (kind === 'perronbord') return perronbord();
  if (kind === 'tent') return tent();
  if (kind === 'kanon') return kanon();
  if (kind === 'vaandel') return vaandel();
  if (kind === 'tractor') return tractor();
  // bank, kist, baal en ton zijn dezelfde spullen als bij een wachtstap (wachtprops.js): één bouwer, geen kopie
  if (WACHT_SPULLEN.includes(kind)) return buildWachtProp(kind);
  return null;
}

// at: { x, y, a? } of the stage target; y is the map coordinate. The dressing is
// turned to the player's heading, so the tents and the audience stand beside the
// path instead of on it.
export function buildMissionDressing(world, kind, at, targetScene = null) {
  const scene = targetScene || getScene();
  const plan = dressingPlan(kind);
  if (!scene || !plan || !at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
  const a = Number.isFinite(at.a) ? at.a : 0;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const group = new THREE.Group();
  group.name = 'mission-dressing-' + kind;
  const ground = (x, y, fallback = 0) => (world && world.map && world.map.groundHeightAt ? (world.map.groundHeightAt(x, y, 50) || 0) : fallback);
  // #955: een onderdeel op water of in een gebouw schuift naar het doel toe (75, 50, 25 procent van de afstand) en vervalt anders
  // (M30: twee van de vijf onderdelen stonden in een gracht, twee in een huis)
  const map = world && world.map;
  const droog = (x, y) => {
    if (!map) return true;
    try {
      if (isInWater(map, x, y)) return false;
      if (typeof map.buildingsNear === 'function' && map.buildingsNear(x, y, 0.4).some((b) => b.pts && pointInPolygon(x, y, b.pts))) return false;
    } catch (e) { /* geen kaartgegevens: gewoon plaatsen */ }
    return true;
  };
  // de plek van een onderdeel (null: geen droge plek)
  const spot = (along, side) => {
    let x = at.x + ux * along + nx * side, y = at.y + uy * along + ny * side;
    if (droog(x, y)) return { x, y };
    for (const k of [0.75, 0.5, 0.25]) {
      x = at.x + (ux * along + nx * side) * k; y = at.y + (uy * along + ny * side) * k;
      if (droog(x, y)) return { x, y };
    }
    return null;
  };
  const place = (o, along, side, fallbackZ = 0) => {
    const q = spot(along, side);
    if (!q) return null;
    o.position.set(q.x, ground(q.x, q.y, fallbackZ), q.y);
    group.add(o);
    return o;
  };
  const props = [];
  for (const p of plan.props) {
    if (p.kind === 'banner') {
      const tex = bannerTex(p.title, p.sub);
      const b = signBothSides(4.2, 1.55, new THREE.MeshBasicMaterial({ map: tex }));
      const q = spot(p.along, p.side) || { x: at.x + ux * p.along + nx * p.side, y: at.y + uy * p.along + ny * p.side }; // het bord blijft altijd staan
      const x = q.x, y = q.y;
      b.position.set(x, ground(x, y) + 2.9, y);
      b.rotation.y = -a + Math.PI / 2;
      group.add(b);
      props.push({ mesh: b, tex });
      continue;
    }
    if (!spot(p.along, p.side)) continue;
    const o = simpleProp(p.kind);
    if (!o) continue;
    place(o, p.along, p.side);
    o.rotation.y = -a + (p.a || 0);
    if (p.y) o.position.y += p.y;
    props.push({ mesh: o });
  }
  // people: built with the same shared person geometry as the world, released
  // again on dispose (#796).
  const people = [];
  for (const p of plan.people) {
    if (!spot(p.along, p.side)) continue;
    // look.hairStyle en look.extra (zoals { age: 'old' }) laten een vaste figuur herkenbaar zijn (Oma Trijntje, M08)
    // decorsets (ADR 0050 fase 2): een vaste figuur als modulaire mens met dezelfde kleding-identiteit; een kind blijft procedureel
    const q = mensenFase(FLAGS.mensen) >= 2 && modularReady() && !(p.look.extra && p.look.extra.age === 'child')
      ? buildModularFromAppearance({ shirt: p.look.shirt, skin: p.look.skin, seed: p.look.seed, variant: p.look.variant, hairStyle: p.look.hairStyle, look: p.look.extra || {} }) : null;
    const m = q || buildPersonMesh(p.look.shirt, p.look.skin, { seed: p.look.seed, variant: p.look.variant, ...(p.look.hairStyle ? { hairStyle: p.look.hairStyle } : {}), ...(p.look.extra ? { look: p.look.extra } : {}), ...(p.look.role ? { role: p.look.role, outfitCtx: { hot: true, detail: true } } : {}) });
    place(m, p.along, p.side);
    m.rotation.y = -a + (p.a || 0);
    if (p.h) m.scale.y = p.h;
    people.push({ mesh: m, anim: p.anim || 'idle', t: (p.along || 0) * 0.3 });
  }
  // het publiek (bouwsteen G0b): lokaal uit spec en seed, uit de buurt van de props en de stage-cirkel
  let crowd = null;
  if (plan.crowd) {
    const key = `dress:${kind}:${Math.round(at.x)}:${Math.round(at.y)}`;
    const clear = [{ x: at.x, y: at.y, r: 4.5 }];
    for (const p of plan.props) {
      if (p.kind === 'banner') continue;
      clear.push({ x: at.x + ux * p.along + nx * p.side, y: at.y + uy * p.along + ny * p.side, r: p.kind === 'tent' || p.kind === 'kraam' || p.kind === 'jurytafel' ? 2.6 : 1.6 });
    }
    for (const p of plan.people) clear.push({ x: at.x + ux * p.along + nx * p.side, y: at.y + uy * p.along + ny * p.side, r: 1.0 });
    crowd = buildCrowd(world, { ...crowdSpecToWorld(plan.crowd, { x: at.x, y: at.y, facing: a }), seed: seedFromKey(key), clear }, { key, scene: group });
  }
  scene.add(group);
  return { kind, group, props, people, crowd, world, t: 0, a };
}

// Every frame: the actors breathe and talk; a tent or cannon does not move.
export function updateMissionDressing(set, dt, focus = null) {
  if (!set) return;
  if (set.crowd) {
    let f = focus;
    if (!f && set.world) { try { f = hoofdspeler(set.world); } catch (e) { f = null; } }
    updateCrowd(set.crowd, dt, f, f);
  }
  if (!set.people.length) return;
  set.t += dt;
  for (const p of set.people) animateActor(p.mesh, { anim: p.anim, speed: 0, gaze: 0, t: set.t, dt });
}

export function disposeMissionDressing(set) {
  if (!set) return;
  if (set.crowd) { disposeCrowd(set.crowd); set.crowd = null; }
  for (const p of set.people) {
    const m = p.mesh;
    m.removeFromParent();
    m.traverse((o) => {
      if (!o.isMesh) return;
      if (o.geometry && typeof o.geometry.userData.personRefs === 'number') releasePersonGeometry(o);
      else if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m2 of mats) if (m2 && m2.dispose) m2.dispose();
    });
  }
  for (const p of set.props) {
    p.mesh.removeFromParent();
    p.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m) { if (m.map) m.map.dispose(); if (m.dispose) m.dispose(); }
    });
    if (p.tex) p.tex.dispose();
  }
  set.group.removeFromParent();
  set.people.length = 0;
  set.props.length = 0;
}

// exported for the test: a person is 2.4 m, and a tent is high enough to see.
export const DRESSING_SCALE = H;
