// H3 "Iets met de Grote Markt": a summer stunt evening for Jelmer's stream,
// nobody gets hurt. In a car on the square you score with what you knock
// over (parasols, kliko's, cardboard boards put out for the evening), with
// drifts and near misses, with every pigeon flock you send up and once with
// the council's water truck, which sprays the terrace when you nudge it.
// Points chain into a combo. Everything else on the square that you ride over
// scores too (omverrules.js STUNT_PUNTEN: bins, bikes, benches, tables ...).
// Hitting someone costs nothing (#392: people are always in the way) and never
// kills them: they get knocked over like in a cartoon (world.stuntSafe,
// pedestrians.js). missions.js runs it as def type 'stunt'.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { makeProp, addProp, removeProp } from './breakables.js';
import { Vehicle } from './vehicle.js';
import { spawnFxPuff } from './fx3d.js';
import { isCinematicActive } from './cinematics.js';
import { showStuntHud, hideStuntHud, updateStuntHud, stuntPopup } from './stunthud.js';
import { onPropBreak, propsInRadius } from './breakables.js';
import { stuntPunten } from './omverrules.js';

let sceneMod = null;
import('./scene3d.js').then((m) => { sceneMod = m; }).catch(() => {});

const COMBO_S = 4;
const COMBO_MAX = 5;
const NEAR_MISS = 40;
const DRIFT_PER_S = 60;
const FLOCK = 120;
const SPRAY = 300;
const KINDS = [
  { kind: 'parasol', label: 'parasol', pts: 120, n: 10, opts: { r: 0.3, h: 2.4, mass: 12, material: 'plastic', breakSpeed: 0.6, breakCost: 0 } },
  { kind: 'kliko', label: 'kliko', pts: 80, n: 10, opts: { r: 0.36, h: 1.1, mass: 25, material: 'plastic', breakSpeed: 0.3, breakCost: 0, burst: 'litter' } },
  { kind: 'stoepbord', label: 'reclamebord', pts: 60, n: 10, opts: { r: 0.3, h: 1, mass: 8, material: 'wood', breakSpeed: 0.2, breakCost: 0 } },
];
const EXTRA = [
  { kind: 'chair', label: 'terrasstoel', pts: 40, n: 14, opts: { r: 0.26, h: 0.9, mass: 5, material: 'plastic', breakSpeed: 0.2, breakCost: 0 } },
  { kind: 'table', label: 'terrastafel', pts: 70, n: 8, opts: { r: 0.38, h: 0.8, mass: 14, material: 'metal', breakSpeed: 0.4, breakCost: 0 } },
];
KINDS.push(...EXTRA);
const SAY_COMBO = ['Combo!', 'Chat gaat los!', 'Dik feest!'];
// the target never asks more than this share of what the square holds, combos not counted
const REACH_SHARE = 0.55;
const LATE_HINT_S = 30;

let run = null;
let seq = 0;

const COLORS = { parasol: [0x1e9e56, 0xf0ede4, 0xc8102e], kliko: [0x3f7a3a, 0x4a4d50], stoepbord: [0x6b4a2e], chair: [0xc8102e, 0xf0ede4], table: [0x8a8f94] };
function propMesh(kind, k) {
  const g = new THREE.Group();
  const col = COLORS[kind][k % COLORS[kind].length];
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  if (kind === 'parasol') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), mat(0xdddddd));
    pole.position.y = 1.15;
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8), mat(col));
    top.position.y = 2.2;
    g.add(pole, top);
  } else if (kind === 'kliko') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.05, 0.7), mat(col));
    b.position.y = 0.53;
    g.add(b);
  } else if (kind === 'chair' || kind === 'table') {
    const w = kind === 'table' ? 0.8 : 0.45, h = kind === 'table' ? 0.75 : 0.85;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(col));
    b.position.y = h / 2;
    g.add(b);
  } else {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.04), mat(col));
    a.position.y = 0.48;
    a.rotation.x = 0.18;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), mat(0x1c2a20));
    face.position.set(0, 0.5, 0.05);
    face.rotation.x = 0.18;
    g.add(a, face);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function disposeGroup(g) {
  g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
}

// label: the popup's word ("parasol"); say: also a card, for the rare moments
function addPoints(w, pts, label, say = null) {
  const R = run;
  const now = w.time;
  const was = R.combo;
  R.combo = now - R.lastAt < COMBO_S ? Math.min(COMBO_MAX, R.combo + 1) : 1;
  R.lastAt = now;
  const got = Math.round(pts * R.combo);
  R.score += got;
  R.events++;
  stuntPopup(`+${got} ${label}`);
  if (R.combo > was && R.combo > 1) stuntPopup(`reeks x${R.combo}`, 'combo');
  if (say) w.addMessage(say, 2.2, { kind: 'missie', key: 'stunt' });
  else if (R.combo >= 3 && R.combo !== R.saidCombo) { R.saidCombo = R.combo; w.addMessage(`${SAY_COMBO[R.combo % SAY_COMBO.length]} x${R.combo}`, 1.4, { kind: 'missie', key: 'stunt' }); }
}

// opts: { center: {x, y}, radius, target }
export function startStunt(w, { center, radius = 45, target = 1500 } = {}) {
  stopStunt(w);
  const scene = sceneMod && sceneMod.getScene && sceneMod.getScene();
  const group = new THREE.Group();
  group.name = 'stuntavond';
  if (scene) scene.add(group);
  const id = ++seq;
  run = { center, radius, target, score: 0, combo: 1, lastAt: -99, saidCombo: 0, events: 0, broken: 0, flocks: new Set(), props: [], group, drift: 0, near: new WeakSet(), unlisten: null, sprayed: false, sprayT: 0, truck: null };
  // the props for the evening, on open ground round the square
  // open ground (isOpenSpot knows the footprints), not hard against a wall, and not inside another prop. Until #392 this also asked
  // for no building within 0.8 m by bounding box, which is never true on the Grote Markt: the evening's own props never stood there.
  const free = (x, y) => !w.map.isOpenSpot || w.map.isOpenSpot(x, y);
  const open = (x, y) => free(x, y) && free(x + 0.9, y) && free(x - 0.9, y) && free(x, y + 0.9) && free(x, y - 0.9) && !propsInRadius(x, y, 1.1).length;
  let k = 0;
  for (const spec of KINDS) {
    let placed = 0;
    for (let tries = 0; placed < spec.n && tries < spec.n * 12; tries++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * (radius - 8);
      const x = center.x + Math.cos(a) * r, y = center.y + Math.sin(a) * r;
      if (!open(x, y) || run.props.some((p) => Math.hypot(p.x - x, p.y - y) < 2.5)) continue;
      const mesh = propMesh(spec.kind, k++);
      mesh.position.set(x, 0, y);
      group.add(mesh);
      const p = makeProp(spec.kind, x, y, {
        ...spec.opts, key: `stunt${id}-${spec.kind}-${placed}`,
        makeMesh: () => propMesh(spec.kind, k),
        disposeMesh: (m) => disposeGroup(m),
        onBreak: () => {
          mesh.visible = false;
          if (!run || run.group !== group) return;
          run.broken++;
          addPoints(w, spec.pts, spec.label);
        },
      });
      if (addProp(p)) { run.props.push(p); placed++; } else { group.remove(mesh); disposeGroup(mesh); }
    }
  }
  // the council's water truck, parked at the edge of the terrace
  for (let tries = 0; tries < 30 && !run.truck; tries++) {
    const a = Math.random() * Math.PI * 2, r = radius * 0.6;
    const x = center.x + Math.cos(a) * r, y = center.y + Math.sin(a) * r;
    if (!open(x, y) || !open(x + Math.cos(a + 1.57) * 4, y + Math.sin(a + 1.57) * 4)) continue;
    const v = new Vehicle(x, y, a + Math.PI / 2, { name: 'truck', tank: true, len: 6.2, wid: 2.3, maxSpeed: 10, accel: 3, brake: 10, turnRate: 1.2, color: '#e8e6e0' });
    v.speed = 0;
    v.missionCar = true;
    v.label = 'Waterwagen gemeente';
    w.vehicles.push(v);
    run.truck = v;
    run.truckHp = v.health;
  }
  const avail = run.props.reduce((n, p) => n + KINDS.find((q) => q.kind === p.kind).pts, 0) + (run.truck ? SPRAY : 0);
  if (avail && run.target > avail * REACH_SHARE) run.target = Math.max(500, Math.floor((avail * REACH_SHARE) / 50) * 50);
  w.stuntSafe = { x: center.x, y: center.y, r: radius + 25 };
  // the square's own street furniture counts too, not only what the evening put out (#392)
  const mine = run;
  run.unlisten = onPropBreak((p, hit) => {
    if (run !== mine || !hit || !hit.byPlayer || !hit.heavy || p.key.startsWith('stunt')) return;
    const s = stuntPunten(p.kind);
    if (!s || Math.hypot(p.x - center.x, p.y - center.y) > radius + 10) return;
    mine.broken++;
    addPoints(w, s.pts, s.label);
  });
  showStuntHud(run.target);
  return true;
}

export function stopStunt(w) {
  if (!run) return;
  if (run.unlisten) run.unlisten();
  for (const p of run.props) removeProp(p);
  run.group.removeFromParent();
  disposeGroup(run.group);
  if (run.truck) {
    run.truck.missionCar = false;
    const i = w.vehicles.indexOf(run.truck);
    if (i >= 0 && run.truck.driver !== 'player') w.vehicles.splice(i, 1);
  }
  w.stuntSafe = null;
  run = null;
  hideStuntHud();
}

// Each frame while H3 runs: 'done' once the target is reached, else null.
// timeLeft: the mission clock, for the "nog X punten" hint near the end.
export function updateStunt(dt, w, timeLeft = Infinity) {
  const R = run;
  if (!R) return null;
  updateStuntHud(dt, { score: R.score, target: R.target, combo: R.combo, comboLeft: Math.max(0, 1 - (w.time - R.lastAt) / COMBO_S), timeLeft }, isCinematicActive());
  if (!R.lateHint && timeLeft <= LATE_HINT_S && R.score < R.target) {
    R.lateHint = true;
    w.addMessage(`Nog ${R.target - R.score} punten in ${LATE_HINT_S} seconden! Parasols, tafels en bankjes leveren het meest op.`, 4, { kind: 'missie', key: 'stunt-late' });
  }
  const p = w.player, v = p.inVehicle;
  const inZone = Math.hypot(p.x - R.center.x, p.y - R.center.y) < R.radius + 10;
  if (v && !v.isBoat && inZone) {
    // drifting through the square
    const slip = Math.hypot(v.driftX || 0, v.driftY || 0);
    if (slip > 2.2 && Math.abs(v.speed) > 6) {
      R.drift += dt;
      if (R.drift > 0.5) { R.drift = 0; addPoints(w, DRIFT_PER_S * 0.5, 'drift'); }
    } else R.drift = 0;
    // near misses: fast past someone, without touching
    if (Math.abs(v.speed) > 8) {
      for (const ped of w.pedestrians) {
        if (ped.state === 'dead' || ped.ragdoll || R.near.has(ped)) continue;
        const d = Math.hypot(ped.x - v.x, ped.y - v.y);
        if (d < 3.2 && d > 1.6) { R.near.add(ped); addPoints(w, NEAR_MISS, 'rakelings'); }
      }
    }
    // the water truck
    if (R.truck && !R.sprayed && (R.truck.health < R.truckHp - 1 || Math.hypot(R.truck.x - v.x, R.truck.y - v.y) < R.truck.model.len * 0.5)) {
      R.sprayed = true;
      R.sprayT = 4;
      addPoints(w, SPRAY, 'waterwagen', 'De waterwagen sproeit het terras nat!');
    }
  }
  if (R.sprayT > 0 && R.truck) {
    R.sprayT -= dt;
    const t = R.truck, c = Math.cos(t.angle), s = Math.sin(t.angle);
    for (let k = 0; k < 4; k++) {
      const side = k % 2 ? 1 : -1;
      spawnFxPuff(t.x - c * 2.5, 1.4, t.y - s * 2.5, -s * side * 7 + (Math.random() - 0.5) * 2, 3 + Math.random() * 2, c * side * 7 + (Math.random() - 0.5) * 2, 0.9, 0.15, 0.6, 0.85, 0.92, 0.95, 0.7, 1.4, -1);
    }
  }
  // pigeon flocks sent up from the square
  for (const a of w.wildlife || []) {
    if (a.kind !== 'pigeon' || a.state !== 'fly' || !a.flock || R.flocks.has(a.flock)) continue;
    if (Math.hypot(a.x - R.center.x, a.y - R.center.y) > R.radius + 10) continue;
    if (!(a.fledAt > (w.time - 1))) continue;
    R.flocks.add(a.flock);
    addPoints(w, FLOCK, 'duiven');
  }
  return R.score >= R.target ? 'done' : null;
}

export function stuntStatus() {
  if (!run) return null;
  return { score: run.score, target: run.target, combo: run.combo, broken: run.broken, props: run.props.length, flocks: run.flocks.size, sprayed: run.sprayed };
}
