import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { playCinematic } from './cinematics.js';
import { compileScene } from './cutscript.js';
import { animateActor } from './actoranim.js';

// The game side of the cutscene direction language (cutscript.js): puts the
// sampled actors and props on meshes, feeds the camera pose to cinematics.js
// and cleans up afterwards. Scenes are data (cutscenes.js).
//
// playScript(w, def, { lines, duration, anchor, cine }) -> boolean
//   anchor: { x, y, facing, z }  (default: the player, facing the way they look)
//   cine:   extra playCinematic fields (id, priority, kicker, title, tint, ...)
//   lines:  [{ speaker, text, at, dur, voice? }], untouched: they stay the story's own

const MATS = {};
const mat = (c, o = {}) => (MATS[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o }));

const SHADOW_GEO = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

function makeActor(spec) {
  const look = spec === 'tammo' ? TAMMO_APPEARANCE : spec === 'anita' ? ANITA_APPEARANCE : spec;
  const m = buildPersonMesh(look.shirt, look.skin, look);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  sh.position.y = 0.03;
  m.add(sh);
  return m;
}

const box = (w, h, d, c, y = h / 2, x = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

// Props are small low-poly groups; their origin is on the ground, +x is "forward".
const PROP_MAKERS = {
  matras: () => { const g = new THREE.Group(); g.add(box(1.9, 0.2, 1.0, 0x6b8fb8, 0.1), box(1.9, 0.02, 0.05, 0xe8e3d6, 0.21)); return g; },
  auto: () => {
    // the Escapade: red, one flat tyre (front left sags)
    const g = new THREE.Group(), body = new THREE.Group();
    body.add(box(3.9, 0.7, 1.7, 0xb02a24, 0.65), box(2.0, 0.6, 1.6, 0xb02a24, 1.25, -0.2), box(1.8, 0.4, 1.62, 0x9fc3d6, 1.28, -0.2));
    for (const x of [-1.2, 1.2]) for (const z of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), mat(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, z); body.add(w); }
    body.rotation.z = 0.025;
    body.rotation.x = 0.02;
    g.add(body);
    return g;
  },
  doos: () => { const g = new THREE.Group(); g.add(box(0.5, 0.38, 0.4, 0xb98d56), box(0.52, 0.04, 0.12, 0xe8d3a8, 0.38)); return g; },
  koffer: () => { const g = new THREE.Group(); g.add(box(0.55, 0.38, 0.2, 0x3b4a6b), box(0.2, 0.04, 0.05, 0x222222, 0.4)); return g; },
  tas: () => { const g = new THREE.Group(); g.add(box(0.4, 0.3, 0.2, 0x9e3027)); return g; },
  bal: () => { const g = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(0xf2d34f)); g.position.y = 0.15; return g; },
  bord: () => { const g = new THREE.Group(); g.add(box(0.05, 1.2, 0.05, 0x666666), box(0.7, 0.45, 0.04, 0xf2f0ea, 1.3)); return g; },
  radio: () => { const g = new THREE.Group(); g.add(box(0.4, 0.22, 0.14, 0x6b4a2e), box(0.12, 0.12, 0.02, 0xd8c88a, 0.12, 0.08, 0.08)); return g; },
  fiets: () => {
    const g = new THREE.Group();
    for (const x of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 14), mat(0x222222)); w.position.set(x, 0.36, 0); g.add(w); }
    g.add(box(1.1, 0.05, 0.05, 0x2e6a9e, 0.62), box(0.05, 0.4, 0.05, 0x2e6a9e, 0.82, 0.5), box(0.2, 0.05, 0.05, 0x111111, 1.03, 0.5));
    return g;
  },
  bestelbus: () => {
    const g = new THREE.Group();
    g.add(box(4.2, 1.6, 1.9, 0xf2f0ea, 1.2), box(1.1, 1.0, 1.9, 0xf2f0ea, 0.9, 2.4), box(0.9, 0.5, 1.85, 0x9fc3d6, 1.5, 2.55));
    for (const x of [-1.4, 1.5]) for (const z of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12), mat(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.38, z); g.add(w); }
    return g;
  },
  // act 1 (cutscenes_akte1.js)
  bakkie: () => {
    // Berend's pickup: olive green, a low bed behind the cab
    const g = new THREE.Group();
    g.add(box(4.4, 0.7, 1.85, 0x5a6b3a, 0.65), box(1.5, 0.75, 1.75, 0x5a6b3a, 1.3, 1.1), box(1.3, 0.4, 1.78, 0x9fc3d6, 1.35, 1.15), box(2.2, 0.3, 0.06, 0x4a5a2e, 1.15, -1.0, 0.9), box(2.2, 0.3, 0.06, 0x4a5a2e, 1.15, -1.0, -0.9));
    for (const x of [-1.4, 1.5]) for (const z of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12), mat(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.38, z); g.add(w); }
    return g;
  },
  automaat: () => { const g = new THREE.Group(); g.add(box(0.8, 1.5, 0.6, 0x7a808a, 0.75), box(0.5, 0.3, 0.02, 0xaee0d8, 1.15, 0.0, 0.31), box(0.4, 0.04, 0.02, 0x15181c, 0.8, 0.0, 0.31)); return g; },
  aanhanger: () => {
    const g = new THREE.Group();
    g.add(box(3.0, 0.15, 1.7, 0x3c3f45, 0.6), box(1.6, 0.08, 0.1, 0x2a2c30, 0.55, 2.2));
    for (const z of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12), mat(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(-0.3, 0.34, z); g.add(w); }
    return g;
  },
  trekker: () => {
    const g = new THREE.Group();
    g.add(box(2.4, 0.9, 1.2, 0x1c1c1f, 0.95, 0.5), box(1.1, 1.0, 1.2, 0x26262b, 1.85, -0.35), box(0.7, 0.5, 1.22, 0x9fc3d6, 1.95, -0.35), box(0.08, 0.7, 0.08, 0x555555, 1.9, 1.3));
    for (const z of [-0.85, 0.85]) {
      const big = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 14), mat(0x111111)); big.rotation.x = Math.PI / 2; big.position.set(-0.9, 0.75, z); g.add(big);
      const small = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mat(0x111111)); small.rotation.x = Math.PI / 2; small.position.set(1.15, 0.42, z); g.add(small);
    }
    return g;
  },
  politie: () => {
    const g = new THREE.Group();
    g.add(box(4.2, 0.65, 1.75, 0xf2f0ea, 0.65), box(2.0, 0.55, 1.65, 0xf2f0ea, 1.2, -0.2), box(1.8, 0.4, 1.67, 0x9fc3d6, 1.23, -0.2), box(4.22, 0.14, 1.77, 0x1f4a9e, 0.55), box(0.3, 0.12, 1.0, 0x2c5fd8, 1.55, -0.2, -0.28), box(0.3, 0.12, 1.0, 0xd83a3a, 1.55, -0.2, 0.28));
    for (const x of [-1.2, 1.2]) for (const z of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), mat(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, z); g.add(w); }
    return g;
  },
  duiventil: () => {
    // a loft on legs: planks, a pitched roof, small doorways
    const g = new THREE.Group();
    for (const x of [-0.55, 0.55]) for (const z of [-0.3, 0.3]) g.add(box(0.08, 1.0, 0.08, 0x5b4630, 0.5, x, z));
    g.add(box(1.4, 0.9, 0.8, 0x8a6a46, 1.45), box(1.6, 0.08, 1.0, 0x3c3f45, 1.95), box(1.2, 0.08, 0.9, 0x3c3f45, 2.08), box(0.02, 0.2, 0.2, 0x15181c, 1.5, 0.71, -0.2), box(0.02, 0.2, 0.2, 0x15181c, 1.5, 0.71, 0.2));
    return g;
  },
  zuil: () => { const g = new THREE.Group(); g.add(box(0.4, 1.25, 0.4, 0xb23a3a, 0.62), box(0.3, 0.2, 0.02, 0xe8d98a, 1.2, 0.0, 0.21), box(0.1, 0.06, 0.02, 0xf2f0ea, 0.9, 0.0, 0.21)); return g; },
  klembord: () => { const g = new THREE.Group(); g.add(box(0.3, 0.02, 0.4, 0x8a6a46, 0.01), box(0.26, 0.012, 0.34, 0xf2f0ea, 0.026)); return g; },
  duif: () => {
    const g = new THREE.Group();
    const body = box(0.3, 0.12, 0.14, 0x7c8088, 0);
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.34), new THREE.MeshStandardMaterial({ color: 0xa3a6ab, side: THREE.DoubleSide }));
    wing.rotation.x = Math.PI / 2;
    g.add(body, wing);
    g.userData.wing = wing;
    return g;
  },
};

function disposeTree(o) {
  o.traverse((c) => {
    if (c.isMesh && c.geometry && c.geometry !== SHADOW_GEO && !c.userData.shared) c.geometry.dispose();
  });
}

export function buildScriptRun(def, scene, anchor) {
  const group = new THREE.Group();
  group.name = 'cutscript-' + def.id;
  const actors = {}, props = {};
  for (const [id, a] of Object.entries(def.actors || {})) {
    const m = makeActor(a.look);
    group.add(m);
    actors[id] = m;
  }
  for (const [id, p] of Object.entries(def.props || {})) {
    const make = PROP_MAKERS[p.kind];
    const m = make();
    group.add(m);
    props[id] = m;
  }
  return {
    scene, group, actors, props, anchor,
    frame(t, dt) {
      const s = scene.sample(t, anchor);
      for (const [id, m] of Object.entries(actors)) {
        const st = s.actors[id];
        m.visible = st.visible !== false;
        m.position.set(st.x, st.h + (st.anim === 'ride' ? 0.4 : 0), st.y);
        m.rotation.set(0, -st.a, 0);
        animateActor(m, { anim: st.anim, speed: st.speed, gaze: st.gaze, t, dt });
      }
      for (const [id, m] of Object.entries(props)) {
        const st = s.props[id];
        m.visible = st.visible;
        m.position.set(st.x, st.h, st.y);
        m.rotation.y = -st.a;
        if (m.userData.wing) m.userData.wing.rotation.x = Math.PI / 2 + Math.sin(t * 22) * 0.9;
      }
      return s.camera;
    },
    dispose() {
      group.removeFromParent();
      disposeTree(group);
    },
  };
}

let current = null;

export function scriptActive() {
  return !!current;
}

export function playScript(w, def, { lines, duration, anchor, cine = {} } = {}) {
  if (current) return false;
  const root = getScene();
  if (!root) return false;
  const p = w.player;
  const a = anchor || { x: p.x, y: p.y, facing: p.angle || 0, z: 0 };
  let scene;
  try {
    scene = compileScene(def, { lines, duration });
  } catch (e) {
    console.error('cutscript', e);
    return false;
  }
  let run = null, lastT = 0;
  const ok = playCinematic({
    priority: 4, pause: true, letterbox: true, skippable: true, hideHud: true,
    ...cine, id: cine.id || def.id, duration, lines,
    onStart() {
      if (cine.onStart) cine.onStart();
      try {
        run = buildScriptRun(def, scene, a);
        root.add(run.group);
        current = run;
        w.cinematicHidePlayers = true;
        w.cinematicHideNav = true;
      } catch (e) {
        console.error('cutscript', def.id, e);
        run = null;
      }
    },
    shot(u, t) {
      if (!run) return null;
      const dt = Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (cine.frame) cine.frame(t, dt);
      return run.frame(t, dt);
    },
    onEnd(skipped, replaced) {
      if (run) { run.dispose(); run = null; }
      current = null;
      w.cinematicHidePlayers = false;
      w.cinematicHideNav = false;
      if (cine.onEnd) cine.onEnd(skipped, replaced);
    },
  });
  return ok;
}
