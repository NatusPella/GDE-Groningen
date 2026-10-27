// The stages of a mission with the small plane (M15 Laag over het graan, docs/verhaal/nieuw): board Roelfien's
// plane on its own strip, fly low through gates (the first one picks up the banner), land on the strip again.
// The flight itself is the arcade plane of planeflight.js / planecontrol.js; this module only places the plane,
// draws the gates and the banner and judges the passes. Pure judging lives in judgeGate (Node-testable).
//
// stage kinds (missions.js hands them over):
//   plane      { strip: { x, y, heading, length } }  the plane stands on the strip; done when the player sits in it
//   airgates   { gates: [{ x, y, r, lo, hi, say, banner }], banner: 'text' }
//              lo/hi: metres above the ground the plane has to be between; r: how close (m). Passing a gate with
//              a banner flag hangs the banner behind the plane.
//   landplane  done when the plane stands still on the strip
// update returns null while it goes on, 'next' when the stage is done, or { fail: 'text' }.
import { assistGate } from './assistlive.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { signBothSides } from './canvastex.js';
import { Vehicle } from './vehicle.js';
import { attachPlane, makeStrip } from './planecontrol.js';
import { PLANE_MODEL } from './planeflight.js';

let S0 = null;   // { plane, strip, prevStrip, group, banner }

const ground = (map, x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) : 0);

// One look at a gate: the closest approach so far decides. state: { closest, zAtClosest, past }.
// Returns 'pass' (inside the ring and at the right height), 'high' | 'low' | 'wide' once the plane has
// flown past the gate without a pass, or null while it is still coming.
export function judgeGate(g, state, d, agl) {
  if (d < g.r && agl >= g.lo && agl <= g.hi) return 'pass';
  if (d < state.closest) { state.closest = d; state.agl = agl; }
  if (state.closest < g.r * 3 && d > state.closest + Math.max(12, g.r * 0.6)) {
    if (state.closest > g.r) return 'wide';
    return state.agl > g.hi ? 'high' : 'low';
  }
  return null;
}

function bannerMesh(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe0'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#c8261e'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 88);
  g.fillStyle = '#c8261e'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = signBothSides(16, 3, new THREE.MeshBasicMaterial({ map: tex }));
  m.frustumCulled = false;
  for (const c of m.children) c.frustumCulled = false;
  return m;
}

function ringMesh(r, color) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(0.4, r * 0.05), 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  m.frustumCulled = false;
  return m;
}

function ensure(world, st) {
  if (!S0) S0 = { plane: null, strip: null, prevStrip: world.planeStrip || null, group: null, banner: null };
  if (st && st.strip && !S0.strip) {
    S0.strip = makeStrip(st.strip);
    world.planeStrip = S0.strip;
  }
  return S0;
}

// Roelfien's plane on the strip: a new one, or the old one put back after a failed run.
function placePlane(world) {
  const s = S0.strip;
  const at = s.point(30);
  const gz = ground(world.map, at.x, at.y);
  let v = S0.plane;
  if (!v || v.wrecked || !world.vehicles.includes(v)) {
    v = new Vehicle(at.x, at.y, s.heading, { ...PLANE_MODEL });
    v.isPlane = true;
    v.missionCar = true;
    v.playerOwned = false;
    v.name = 'Roelfiens gewasspuiter';
    v.groundZ = gz;
    world.vehicles.push(v);
    S0.plane = v;
  }
  attachPlane(v, at.x, at.y, gz, s.heading);
  v.speed = 0;
  return v;
}

export function enterPlaneStage(world, st, S) {
  ensure(world, st);
  if (st.kind === 'plane') {
    const v = placePlane(world);
    S.target = { x: v.x, y: v.y, label: st.label };
    world.addMessage('Gas met W, trek op met Spatie bij 30 m/s.', 5, { kind: 'tip', key: 'plane-help' });
  } else if (st.kind === 'airgates') {
    const scene = getScene();
    S.air = { i: 0, state: { closest: Infinity, agl: 0 }, rings: [], marker: null };
    if (scene) {
      const group = new THREE.Group();
      group.name = 'plane-gates';
      st.gates.forEach((g, k) => {
        const m = ringMesh(g.r, k === 0 ? 0xffc21a : 0xffe9a0);
        const gz = ground(world.map, g.x, g.y);
        m.position.set(g.x, gz + (g.lo + g.hi) / 2, g.y);
        // the hoop faces the way the plane comes through: towards the next gate (the last: away from the one before)
        const a = st.gates[k + 1] ? Math.atan2(st.gates[k + 1].y - g.y, st.gates[k + 1].x - g.x) : st.gates[k - 1] ? Math.atan2(g.y - st.gates[k - 1].y, g.x - st.gates[k - 1].x) : 0;
        m.rotation.y = -a + Math.PI / 2;
        group.add(m);
        S.air.rings.push(m);
      });
      scene.add(group);
      S0.group = group;
    }
    S.air.marker = { x: st.gates[0].x, y: st.gates[0].y, label: st.gates[0].label || st.label };
    S.target = S.air.marker;
  } else if (st.kind === 'landplane') {
    const p = S0.strip.point(S0.strip.length * 0.45);
    S.target = { x: p.x, y: p.y, label: st.label };
  }
}

function setBanner(world, text) {
  const scene = getScene();
  if (!scene || S0.banner) return;
  S0.banner = bannerMesh(text);
  scene.add(S0.banner);
}

function placeBanner(v) {
  const b = S0 && S0.banner;
  if (!b || !v) return;
  const back = 13;
  b.position.set(v.x - Math.cos(v.angle) * back, v.z - 1.5, v.y - Math.sin(v.angle) * back);
  b.rotation.y = -v.angle;
}

// per frame; returns null | 'next' | { fail }
export function updatePlaneStage(dt, world, st, S) {
  if (!S0 || !S0.plane) return null;
  const v = S0.plane;
  const p = world.player;
  const mine = p.inVehicle === v;
  if (st.kind === 'plane') {
    if (mine) return 'next';
    S.target = { x: v.x, y: v.y, label: st.label };
    return null;
  }
  if (v.wrecked) return { fail: st.crashed || 'het vliegtuig is neergestort. Roelfien is niet blij' };
  if (!mine && st.kind === 'airgates') return v.plane && !v.plane.onGround ? null : { fail: st.left || 'je liet het vliegtuig staan' };
  placeBanner(v);
  if (st.kind === 'airgates') {
    const A = S.air;
    const g0 = st.gates[A.i];
    if (!g0) return 'next';
    const g = assistGate(g0);
    const agl = v.z - ground(world.map, g.x, g.y);
    const d = Math.hypot(v.x - g.x, v.y - g.y);
    const r = judgeGate(g, A.state, d, agl);
    if (r === 'pass') {
      if (g.say) world.addMessage(g.say, 3.5);
      if (g.banner && st.banner) setBanner(world, st.banner);
      if (A.rings[A.i]) A.rings[A.i].material.color.setHex(0x5dff7a);
      A.i++;
      A.state = { closest: Infinity, agl: 0 };
      const nxt = st.gates[A.i];
      if (!nxt) return 'next';
      if (A.rings[A.i]) A.rings[A.i].material.color.setHex(0xffc21a);
      A.marker = { x: nxt.x, y: nxt.y, label: nxt.label || st.label };
      S.target = A.marker;
      return null;
    }
    if (r) {
      const why = r === 'high' ? st.high || 'te hoog: niemand ziet het spandoek' : r === 'low' ? st.low || 'te laag: de graanhalmen zitten in de wielen' : st.wide || 'de poort gemist';
      return { fail: why };
    }
    return null;
  }
  if (st.kind === 'landplane') {
    const pl = v.plane;
    if (pl && pl.onGround && pl.speed < 2 && S0.strip.contains(v.x, v.y)) return 'next';
    return null;
  }
  return null;
}

export function planeStageProgress(st, S) {
  if (st.kind === 'airgates' && S.air) return `${st.label} · poort ${Math.min(S.air.i + 1, st.gates.length)}/${st.gates.length}`;
  return null;
}

// dev cheat / story test: finish the current plane stage the way a pilot would (board, fly all gates, land); true when it did something
export function debugCompletePlaneStage(world, st, S) {
  if (!S0 || !S0.plane) return false;
  const v = S0.plane;
  if (st.kind === 'plane') { world.player.enterVehicle(v, world); return true; }
  if (st.kind === 'airgates' && S.air) {
    if (S.air.rings) S.air.rings.forEach((r) => r.material.color.setHex(0x5dff7a));
    if (st.banner) setBanner(world, st.banner);
    S.air.i = st.gates.length;
    return true;
  }
  if (st.kind === 'landplane') {
    const at = S0.strip.point(S0.strip.length * 0.45);
    v.x = at.x; v.y = at.y; v.z = ground(world.map, at.x, at.y); v.speed = 0;
    if (v.plane) { v.plane.onGround = true; v.plane.speed = 0; }
    return true;
  }
  return false;
}

// the stage is left (or the mission ended): gates and banner go, the strip of Eelde is put back
export function disposePlaneStage(world, { keepPlane = true } = {}) {
  if (!S0) return;
  const scene = getScene();
  for (const o of [S0.group, S0.banner]) {
    if (!o) continue;
    if (scene) scene.remove(o);
    o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } });
  }
  S0.group = null;
  S0.banner = null;
}

// the whole mission is over: the plane stays on the strip as an ordinary parked plane
export function releasePlaneStage(world) {
  if (!S0) return;
  disposePlaneStage(world);
  if (S0.plane) S0.plane.missionCar = false;
  world.planeStrip = S0.prevStrip;
  S0 = null;
}
