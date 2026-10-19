import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, seatPose, seatedY, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { buildKitchen } from './introkitchen3d.js';
import { playCinematic, setNameCard } from './cinematics.js';
import { buildVehicleMesh } from './models3d_vehicles.js';
import { buildWildlifeMesh3D } from './wildlife.js';
import { HERO_CAR_MODEL, TRACTOR_MODEL, POLICE_MODEL, TRAFFIC_MODELS } from './vehicle.js';
import { carModel } from './trafficfleet.js';
import { propSource } from './cutscenemodels.js';
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
//   sfx { kind } (a world sound), pulse { dur } (the radio), naam { text, dur } (a name card, any set)

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

// Vehicles and animals are the world's own (cutscenemodels.js lists which); only loose objects are built here.
// Props have their origin on the ground, +x is "forward".
let propVehicleN = 0;
function vehicleModel(src) {
  const base = src.vehicle === 'escort' ? HERO_CAR_MODEL
    : src.vehicle === 'tractor' ? TRACTOR_MODEL
      : src.vehicle === 'police' ? POLICE_MODEL
        : src.vehicle === 'bike' ? { ...TRAFFIC_MODELS().find((m) => m.name === 'bike' && !m.fat), rider: null }
          : carModel(src.vehicle, () => 0);
  return src.color ? { ...base, color: src.color } : { ...base };
}
function worldProp(src) {
  if (src.animal) {
    const g = buildWildlifeMesh3D({ kind: src.animal, variant: 0, bobSeed: 0 });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.shared = true; } }); // geometries are the world's cache: never disposed here
    return g;
  }
  const g = buildVehicleMesh({ id: 'cut-prop-' + (propVehicleN++ % 64), model: vehicleModel(src), isBike: src.vehicle === 'bike', health: 100 });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.shared = true; } }); // geometries are the world's cache: never disposed here
  return g;
}
const PROP_MAKERS = {
  matras: () => { const g = new THREE.Group(); g.add(box(1.9, 0.2, 1.0, 0x6b8fb8, 0.1), box(1.9, 0.02, 0.05, 0xe8e3d6, 0.21)); return g; },
  doos: () => { const g = new THREE.Group(); g.add(box(0.5, 0.38, 0.4, 0xb98d56), box(0.52, 0.04, 0.12, 0xe8d3a8, 0.38)); return g; },
  koffer: () => { const g = new THREE.Group(); g.add(box(0.55, 0.38, 0.2, 0x3b4a6b), box(0.2, 0.04, 0.05, 0x222222, 0.4)); return g; },
  tas: () => { const g = new THREE.Group(); g.add(box(0.4, 0.3, 0.2, 0x9e3027)); return g; },
  bal: () => { const g = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(0xf2d34f)); g.position.y = 0.15; return g; },
  bord: () => { const g = new THREE.Group(); g.add(box(0.05, 1.2, 0.05, 0x666666), box(0.7, 0.45, 0.04, 0xf2f0ea, 1.3)); return g; },
  radio: () => { const g = new THREE.Group(); g.add(box(0.4, 0.22, 0.14, 0x6b4a2e), box(0.12, 0.12, 0.02, 0xd8c88a, 0.12, 0.08, 0.08)); return g; },
  automaat: () => { const g = new THREE.Group(); g.add(box(0.8, 1.5, 0.6, 0x7a808a, 0.75), box(0.5, 0.3, 0.02, 0xaee0d8, 1.15, 0.0, 0.31), box(0.4, 0.04, 0.02, 0x15181c, 0.8, 0.0, 0.31)); return g; },
  duiventil: () => {
    // a loft on legs: planks, a pitched roof, small doorways
    const g = new THREE.Group();
    for (const x of [-0.55, 0.55]) for (const z of [-0.3, 0.3]) g.add(box(0.08, 1.0, 0.08, 0x5b4630, 0.5, x, z));
    g.add(box(1.4, 0.9, 0.8, 0x8a6a46, 1.45), box(1.6, 0.08, 1.0, 0x3c3f45, 1.95), box(1.2, 0.08, 0.9, 0x3c3f45, 2.08), box(0.02, 0.2, 0.2, 0x15181c, 1.5, 0.71, -0.2), box(0.02, 0.2, 0.2, 0x15181c, 1.5, 0.71, 0.2));
    return g;
  },
  zuil: () => { const g = new THREE.Group(); g.add(box(0.4, 1.25, 0.4, 0xb23a3a, 0.62), box(0.3, 0.2, 0.02, 0xe8d98a, 1.2, 0.0, 0.21), box(0.1, 0.06, 0.02, 0xf2f0ea, 0.9, 0.0, 0.21)); return g; },
  klembord: () => { const g = new THREE.Group(); g.add(box(0.3, 0.02, 0.4, 0x8a6a46, 0.01), box(0.26, 0.012, 0.34, 0xf2f0ea, 0.026)); return g; },
};

function disposeTree(o) {
  o.traverse((c) => {
    if (c.isMesh && c.geometry && c.geometry !== SHADOW_GEO && !c.userData.shared) c.geometry.dispose();
  });
}

export function buildScriptRun(def, scene, anchor, env = null, w = null) {
  const group = new THREE.Group();
  group.name = 'cutscript-' + def.id;
  const actors = {}, props = {};
  for (const [id, a] of Object.entries(def.actors || {})) {
    const m = makeActor(a.look);
    group.add(m);
    actors[id] = m;
  }
  for (const [id, p] of Object.entries(def.props || {})) {
    const src = propSource(p.kind);
    const m = src ? worldProp(src) : PROP_MAKERS[p.kind]();
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
        // a pigeon's wings (the world's mesh) beat while it moves
        if (m.userData.wings && st.h > 0.5) for (const w of m.userData.wings) w.rotation.x = -(w.userData.sign || 1) * (0.5 + Math.sin(t * 22) * 0.7);
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
  // name cards (fx 'naam' { text, dur }): a character is introduced at the lower left (#159)
  const cards = (def.fx || []).filter((f) => f.fx === 'naam').map((f) => ({ text: f.text, t0: resolveTime(f.t, lines, duration) ?? 0, dur: f.dur ?? 2.4 }));
  let cardNow = null;
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
      if (cards.length) {
        const cur = cards.find((k) => t >= k.t0 && t < k.t0 + k.dur) || null;
        if (cur !== cardNow) { cardNow = cur; setNameCard(cur ? cur.text : null); }
      }
      return run.frame(t, dt);
    },
    onEnd(skipped, replaced) {
      if (run) { run.dispose(); run = null; }
      current = null;
      if (cardNow) setNameCard(null);
      w.cinematicHidePlayers = false;
      w.cinematicHideNav = false;
      if (cine.onEnd) cine.onEnd(skipped, replaced);
    },
  });
  return ok;
}
