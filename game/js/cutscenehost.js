import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, seatPose, seatedY, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { buildKitchen } from './introkitchen3d.js';
import { playCinematic } from './cinematics.js';
import { compileScene, fitAnchor, resolveTime, shotPoints } from './cutscript.js';
import { roofAt } from './camerapath.js';
import { animateActor } from './actoranim.js';
import { audioPlan } from './cutaudio.js';

// The game side of the cutscene direction language (cutscript.js): puts the
// sampled actors and props on meshes, feeds the camera pose to cinematics.js
// and cleans up afterwards. Scenes are data (cutscenes.js).
//
// playScript(w, def, { lines, duration, anchor, cine }) -> boolean
//   anchor: { x, y, facing, z }  (default: the player, facing the way they look)
//   env:    { solid, clamp } keeps the set out of buildings (cutscript.js fitCamera/fitAnchor); default: the building layer
//   cine:   extra playCinematic fields (id, priority, kicker, title, tint, ...)
//   lines:  [{ speaker, text, at, dur, voice? }], untouched: they stay the story's own
//   def.set 'keuken': Tessa's kitchen (introkitchen3d.js) is built at the anchor (anchor.z = floor height) and the camera is kept inside it;
//   def.fx: host effects on the set: buzz { dur } (the phone), door { open: 0-1, dur }, cups { actor, on, hands }, tablecups { on },
//   sfx { kind } (a world sound), pulse { dur } (the radio)

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
  m.userData.shadow = sh;
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
  kat: () => {
    // a ginger cat, +x forward; the tail swings (buildScriptRun frame)
    const g = new THREE.Group();
    g.add(box(0.36, 0.15, 0.16, 0xc9803a, 0.15), box(0.14, 0.13, 0.14, 0xc9803a, 0.22, 0.22), box(0.04, 0.06, 0.03, 0xa8672c, 0.32, 0.22, 0.04), box(0.04, 0.06, 0.03, 0xa8672c, 0.32, 0.22, -0.04));
    for (const x of [-0.13, 0.13]) for (const z of [-0.05, 0.05]) g.add(box(0.04, 0.1, 0.04, 0xb06f30, 0.05, x, z));
    const tail = new THREE.Group();
    tail.position.set(-0.18, 0.2, 0);
    tail.add(box(0.3, 0.04, 0.04, 0xc9803a, 0.05, -0.15, 0));
    g.add(tail);
    g.userData.tail = tail;
    return g;
  },
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

function buildScriptRun(def, scene, anchor, env = null, w = null) {
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
  // the kitchen set and its effects
  let kit = null;
  const authored = (def.fx || []).map((f) => ({ ...f, t0: resolveTime(f.t, scene.lines, scene.duration) ?? 0 }));
  // vehicles, bikes and pigeons that move get their sound from the plan (cutaudio.js, #117)
  const planned = audioPlan(def, scene.lines, scene.duration).map((p) => ({ t: p.t, t0: p.t, fx: 'sfx', kind: p.kind, name: p.name }));
  const fx = [...authored, ...planned].sort((a, b) => a.t0 - b.t0);
  const fired = new Set();
  const cupState = {}, cupKey = {};
  if (def.set === 'keuken') {
    kit = buildKitchen(anchor.x, anchor.y, anchor.z || 0);
    group.add(kit.group);
    kit.reset();
  }
  const doorFx = fx.filter((f) => f.fx === 'door');
  const sfx = (kind, name) => { if (w) (w.audioEvents || (w.audioEvents = [])).push(name ? { kind, name, x: anchor.x, y: anchor.y } : { kind, x: anchor.x, y: anchor.y }); };
  const kitchenFrame = (t) => {
    let buzz = false;
    for (const f of fx) {
      if (f.t0 > t) break;
      if (f.fx === 'sfx' && !fired.has(f)) { fired.add(f); sfx(f.kind, f.name); }
      if (!kit) continue;
      if (f.fx === 'buzz' && t < f.t0 + (f.dur ?? 2)) buzz = true;
      if (f.fx === 'pulse' && t < f.t0 + (f.dur ?? 2)) kit.radio.rotation.z = Math.sin(t * 9) * 0.05;
      if (f.fx === 'cups') cupState[f.actor] = f;
      if (f.fx === 'tablecups') for (const c of kit.tableCups) c.visible = f.on !== false;
    }
    if (!kit) return;
    kit.buzz(t, buzz);
    if (!buzz) kit.radio.rotation.z = 0;
    // the door: nearly shut until the first door effect, then eased to its target
    let ang = doorFx.length ? -0.25 : -1.25;
    for (const f of doorFx) {
      if (f.t0 > t) break;
      const to = -0.25 - 1.0 * (f.open ?? 1), k = Math.max(0, Math.min(1, (t - f.t0) / (f.dur ?? 0.8)));
      ang = ang + (to - ang) * k * k * (3 - 2 * k);
    }
    kit.hinge.rotation.y = ang;
    for (const [id, f] of Object.entries(cupState)) {
      const key = f.on === false ? 'off' : (f.hands || 'LR');
      if (actors[id] && cupKey[id] !== key) { cupKey[id] = key; kit.holdCups(actors[id], f.on !== false, 1.6, f.hands || 'LR'); }
    }
  };
  return {
    scene, group, actors, props, anchor, env, kit,
    frame(t, dt) {
      const s = scene.sample(t, anchor, env);
      kitchenFrame(t);
      for (const [id, m] of Object.entries(actors)) {
        const st = s.actors[id];
        m.visible = st.visible !== false;
        m.position.set(st.x, st.h + (st.anim === 'ride' ? 0.4 : 0), st.y);
        m.rotation.set(0, -st.a, 0);
        if (m.userData.shadow) m.userData.shadow.visible = !st.sit;
        if (st.sit) seatedFrame(m, st, t);
        else animateActor(m, { anim: st.anim, speed: st.speed, gaze: st.gaze, t, dt });
      }
      for (const [id, m] of Object.entries(props)) {
        const st = s.props[id];
        m.visible = st.visible;
        m.position.set(st.x, st.h, st.y);
        m.rotation.y = -st.a;
        if (m.userData.wing) m.userData.wing.rotation.x = Math.PI / 2 + Math.sin(t * 22) * 0.9;
        if (m.userData.tail) m.userData.tail.rotation.y = Math.sin(t * 3.2) * 0.55;
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

// Seated at a table (the kitchen): feet on the floor, hands on the tabletop; a gesture is a head or chest movement
const TABLE_SIT = { recline: 0.02, footX: 0.42, footY: -0.44, arms: 'wheel' };
function seatedFrame(m, st, t) {
  const ud = m.userData;
  if (!ud.pelvis || !ud.head) return;
  seatPose(m, TABLE_SIT);
  m.position.y = st.h + seatedY(m, st.sit);
  const talk = st.speaking || st.anim === 'talk';
  ud.head.rotation.y = st.gaze;
  if (talk) { ud.head.rotation.z += Math.sin(t * 3.1) * 0.04; ud.head.rotation.y += Math.sin(t * 1.7) * 0.07; ud.chest.rotation.z += Math.sin(t * 2.3) * 0.015; }
  switch (st.anim) {
    case 'nod': ud.head.rotation.z += Math.sin(t * 6) * 0.14; break;
    case 'shake': ud.head.rotation.y += Math.sin(t * 8) * 0.3; break;
    case 'laugh': ud.chest.rotation.z += Math.sin(t * 15) * 0.035; ud.head.rotation.z -= 0.12 + Math.sin(t * 15) * 0.05; break;
    case 'shrug': ud.chest.rotation.z += 0.06 * Math.sin(t * 4); ud.head.rotation.x = Math.sin(t * 3) * 0.12; break;
    case 'lean': case 'point': ud.chest.rotation.z -= 0.13; ud.head.rotation.z += 0.08; break;
    case 'look': ud.head.rotation.z += 0.18; break;
    case 'phone': ud.head.rotation.z += 0.2; ud.chest.rotation.z -= 0.05; break;
    default: break;
  }
}

// camera and people stay inside the kitchen (a room of 4.4 x 3.6 x 2.6 m around the anchor)
function kitchenEnv(at) {
  return {
    solid: () => false,
    clamp(x, y, z, kind) {
      if (kind !== 'camera') return null;
      const base = at.z || 0;
      return { x: Math.max(at.x - 1.95, Math.min(at.x + 1.95, x)), y: Math.max(at.y - 1.55, Math.min(at.y + 1.55, y)), z: Math.max(base + 0.25, Math.min(base + 2.35, z)) };
    },
  };
}

export function playScript(w, def, { lines, duration, anchor, cine = {}, env: envIn = null } = {}) {
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
  // nobody and no camera inside a building: the anchor turns to free ground, a camera in a wall moves (cutscript.js)
  const indoors = def.set === 'keuken';
  const env = envIn || (indoors ? kitchenEnv({ x: a.x, y: a.y, z: a.z || 0 }) : { solid: (x, y, z) => roofAt(w.map, x, y) > z - 0.2 });
  const at = indoors ? { ...a, facing: 0 } : fitAnchor(scene, a, env);
  let run = null, lastT = 0;
  // the tiles round the camera's path are built ahead and held, so no shot cuts to the far LOD or a hole (#157, #20)
  const prewarm = cine.prewarm || shotPoints(scene, at, duration);
  const ok = playCinematic({
    priority: 4, pause: true, letterbox: true, skippable: true, hideHud: true,
    prewarm,
    ...cine, id: cine.id || def.id, duration, lines,
    onStart() {
      if (cine.onStart) cine.onStart();
      try {
        run = buildScriptRun(def, scene, at, env, w);
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
