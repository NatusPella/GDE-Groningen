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
import { animateActor } from './actoranim.js';
import { canvasTex, signBothSides } from './canvastex.js';

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
};

export const DRESSING_KINDS = Object.keys(PLANS);

// The props and people of a kind, relative to the anchor. Pure; a copy, so a
// caller cannot change the shared plan.
export function dressingPlan(kind) {
  const p = PLANS[kind];
  if (!p) return null;
  return {
    props: p.props.map((q) => ({ ...q })),
    people: p.people.map((q) => ({ ...q, look: { ...q.look } })),
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

function simpleProp(kind) {
  if (kind === 'tent') return tent();
  if (kind === 'kanon') return kanon();
  if (kind === 'vaandel') return vaandel();
  if (kind === 'tractor') return tractor();
  if (kind === 'baal') {
    const g = new THREE.Group();
    g.add(cyl(0.62, 1.1, 0xd8c060, 0, 0.55, 0, 10));
    g.add(cyl(0.63, 0.06, 0xb89c40, 0, 1.1, 0, 10));
    return g;
  }
  if (kind === 'kist') {
    const g = new THREE.Group();
    g.add(box(1.1, 0.7, 0.75, 0x9a7a4a, 0, 0.35, 0));
    g.add(box(1.14, 0.08, 0.8, 0x6f4d2a, 0, 0.72, 0));
    return g;
  }
  if (kind === 'ton') {
    const g = new THREE.Group();
    g.add(cyl(0.42, 0.95, 0x6b4a2a, 0, 0.48, 0, 8));
    g.add(cyl(0.44, 0.06, 0x777d88, 0, 0.2, 0, 8));
    g.add(cyl(0.44, 0.06, 0x777d88, 0, 0.75, 0, 8));
    return g;
  }
  if (kind === 'bank') {
    const g = new THREE.Group();
    g.add(box(2.2, 0.12, 0.6, 0x8a6238, 0, 0.48, 0));
    g.add(box(2.2, 0.55, 0.1, 0x6f4d2a, 0, 0.82, -0.25));
    for (const x of [-0.9, 0.9]) g.add(box(0.12, 0.48, 0.5, 0x6f4d2a, x, 0.24, 0));
    return g;
  }
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
  const place = (o, along, side, fallbackZ = 0) => {
    const x = at.x + ux * along + nx * side, y = at.y + uy * along + ny * side;
    o.position.set(x, ground(x, y, fallbackZ), y);
    group.add(o);
    return o;
  };
  const props = [];
  for (const p of plan.props) {
    if (p.kind === 'banner') {
      const tex = bannerTex(p.title, p.sub);
      const b = signBothSides(4.2, 1.55, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      const x = at.x + ux * p.along + nx * p.side, y = at.y + uy * p.along + ny * p.side;
      b.position.set(x, ground(x, y) + 2.9, y);
      b.rotation.y = -a + Math.PI / 2;
      group.add(b);
      props.push({ mesh: b, tex });
      continue;
    }
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
    const m = buildPersonMesh(p.look.shirt, p.look.skin, { seed: p.look.seed, variant: p.look.variant });
    place(m, p.along, p.side);
    m.rotation.y = -a + (p.a || 0);
    if (p.h) m.scale.y = p.h;
    people.push({ mesh: m, anim: p.anim || 'idle', t: (p.along || 0) * 0.3 });
  }
  scene.add(group);
  return { kind, group, props, people, t: 0, a };
}

// Every frame: the actors breathe and talk; a tent or cannon does not move.
export function updateMissionDressing(set, dt) {
  if (!set || !set.people.length) return;
  set.t += dt;
  for (const p of set.people) animateActor(p.mesh, { anim: p.anim, speed: 0, gaze: 0, t: set.t, dt });
}

export function disposeMissionDressing(set) {
  if (!set) return;
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
