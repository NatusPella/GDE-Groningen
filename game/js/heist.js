// H6 "De Museumkraak" as a small heist: guards with torch cones and sweeping
// cameras along the way to the fuse box (goto stages with `watch`), a timing
// minigame at the fuse box (stage kind 'fuse', three fuses = the cameras go
// dark) and the display case with its empty cushion for the reveal scene.
// Forgiving by design: being seen only puts you back where the stage started,
// and after SPOTS_BEFORE_HELP sightings Tammo distracts everyone for good; a
// missed fuse widens the window, and after MISSES_BEFORE_HELP it just works.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { findWalkPath } from './routing.js';
import { isInsideBuilding } from './pedestrians.js';
import { isInWater, dist, pointInPolygon } from './util.js';
import { spawnFxSpark } from './fx3d.js';

const SPOTS_BEFORE_HELP = 3;
const MISSES_BEFORE_HELP = 5;
const FUSES = 3;
const SEEN_DELAY = 0.9;
const GUARD_LOOK = { variant: 'male', pants: 0x1c1f24, shoes: 0x111111, hairStyle: 'short', seed: 2207 };
const GUARD_SHIRT = 0x2b3340;
const CONE_MAT = () => new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });

let H = null;

function walkable(map, x, y) {
  return (!isInWater(map, x, y) || map.isOnBridge(x, y)) && !isInsideBuilding(map, x, y);
}

function losClear(map, ax, ay, bx, by) {
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    if (isInsideBuilding(map, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

function coneMesh(range, half) {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(range, 20, -half, half * 2);
  const m = new THREE.Mesh(geo, CONE_MAT());
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  g.add(m);
  g.userData.mat = m.material;
  return g;
}

function box(parent, w, h, d, color, x, y, z, emissive) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...(emissive ? { emissive, emissiveIntensity: 1 } : {}) }));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export function startHeist() {
  disposeHeist();
  const scene = getScene();
  if (!scene) return null;
  const root = new THREE.Group();
  root.name = 'heist';
  scene.add(root);
  H = { root, watchers: [], spotted: 0, distracted: false, seen: null, fuse: null, fuseAt: null, cameraOffAt: Infinity, ui: null };
  return H;
}

export function heistActive() { return !!H; }

// A watcher looks at point q on the route from beside it: a guard with a
// torch where there's room to stand, else a camera on the nearest wall.
function addWatcher(world, q, tan, kind, phase) {
  const map = world.map;
  const nx = -tan.y, ny = tan.x;
  let at = null;
  if (kind === 'guard') {
    // an open spot beside the route with a clear view of it; in a narrow
    // passage he stands in it, looking back down the way you come
    const roomy = (x, y) => walkable(map, x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([ox, oy]) => walkable(map, x + ox, y + oy));
    for (let r = 3; r <= 8 && !at; r += 1) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, x = q.x + Math.cos(a) * r, y = q.y + Math.sin(a) * r;
        if (roomy(x, y) && losClear(map, x, y, q.x, q.y)) { at = { x, y }; break; }
      }
    }
    if (!at) at = { x: q.x + tan.x * 2, y: q.y + tan.y * 2, onPath: true };
  } else at = { x: q.x + nx * 5, y: q.y + ny * 5 };
  const center = at.onPath ? Math.atan2(-tan.y, -tan.x) : Math.atan2(q.y - at.y, q.x - at.x);
  const range = at.onPath ? 8 : dist(at.x, at.y, q.x, q.y) + (kind === 'guard' ? 5.5 : 5);
  const half = kind === 'guard' ? 0.5 : 0.38;
  const w = { kind, x: at.x, y: at.y, center, amp: kind === 'guard' ? 1.1 : 0.95, period: kind === 'guard' ? 7 : 6, phase, range, half, angle: center, on: true };
  w.cone = coneMesh(range, half);
  w.cone.position.set(at.x, kind === 'guard' ? 0.07 : 0.08, at.y);
  H.root.add(w.cone);
  if (kind === 'guard') {
    w.mesh = buildPersonMesh(GUARD_SHIRT, 0xd9b08c, GUARD_LOOK);
    w.mesh.position.set(at.x, 0, at.y);
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c4 }));
    torch.rotation.z = Math.PI / 2;
    torch.position.set(0.45, 1.15, 0.22);
    torch.userData.own = true;
    w.mesh.add(torch);
    w.mesh.userData.person = true;
    H.root.add(w.mesh);
  } else {
    const g = new THREE.Group();
    g.position.set(at.x, 0, at.y);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x2c2f33 }));
    pole.position.y = 1.7;
    g.add(pole);
    const head = new THREE.Group();
    head.position.y = 3.35;
    box(head, 0.42, 0.2, 0.2, 0xe9e9e4, 0.18, 0, 0);
    w.led = box(head, 0.05, 0.05, 0.05, 0x330000, 0.41, 0.04, 0.06, 0xff2a1a);
    g.add(head);
    w.mesh = g;
    w.head = head;
    H.root.add(g);
  }
  H.watchers.push(w);
  return w;
}

// Places a guard and a camera along the walk from (a) to (b) for a stage.
export function guardRoute(world, a, b, { guards = 1, cameras = 1 } = {}) {
  if (!H || !a || !b) return;
  const r = findWalkPath(world.map, a.x, a.y, b.x, b.y);
  let pts = r && r.pts && r.pts.length > 1 ? r.pts.map(([x, y]) => ({ x, y })) : [a, b];
  if (dist(pts[0].x, pts[0].y, a.x, a.y) > dist(pts[pts.length - 1].x, pts[pts.length - 1].y, a.x, a.y)) pts = pts.reverse();
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
  const L = acc[acc.length - 1];
  if (L < 12) return;
  const at = (f) => {
    const s = f * L;
    let i = 1;
    while (i < pts.length - 1 && acc[i] < s) i++;
    const p0 = pts[i - 1], p1 = pts[i], seg = (acc[i] - acc[i - 1]) || 1;
    const k = (s - acc[i - 1]) / seg;
    const tl = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    return { q: { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k }, tan: { x: (p1.x - p0.x) / tl, y: (p1.y - p0.y) / tl } };
  };
  const list = [];
  for (let i = 0; i < cameras; i++) list.push(['camera', 0.25 + i * 0.25]);
  for (let i = 0; i < guards; i++) list.push(['guard', 0.72 + i * 0.1]);
  list.forEach(([kind, f], i) => { const { q, tan } = at(Math.min(0.85, f)); addWatcher(world, q, tan, kind, i * 1.7 + H.watchers.length); });
}

// The fuse box at the fuse stage's target, and the display case at the
// vitrine, standing from the start of the mission.
// Under a footprint (a building, or a covered passage one can walk through).
function roofed(map, x, y) {
  return map.buildingsNear(x, y, 0.5).some((b) => pointInPolygon(x, y, b.pts));
}

// Beside the spot the player stands on: free, dry ground `r` metres away;
// with `sky`, under open sky with room around it for a camera.
function besides(map, p, r, sky = false) {
  const ok = (x, y) => walkable(map, x, y) && (!sky || !roofed(map, x, y));
  const room = (x, y) => { let n = 0; for (let k = 0; k < 8; k++) if (!roofed(map, x + Math.cos(k * Math.PI / 4) * 2.8, y + Math.sin(k * Math.PI / 4) * 2.8)) n++; return n; };
  let best = null;
  for (let rr = r; rr <= (sky ? 14 : r); rr += 1.5) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
      if (!ok(x, y) || !ok(p.x + Math.cos(a) * (rr + 0.6), p.y + Math.sin(a) * (rr + 0.6))) continue;
      const score = (sky ? room(x, y) * 2 : 0) - rr * 0.3;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (best && (!sky || best.score > 10)) break;
  }
  return best ? { x: best.x, y: best.y } : { x: p.x + r, y: p.y };
}

export function placeHeistProps(world, fuseSpot, vitrineSpot) {
  if (!H) return;
  const fuse = fuseSpot && besides(world.map, fuseSpot, 1.1);
  const vitrine = vitrineSpot && besides(world.map, vitrineSpot, 1.9, true);
  if (fuse) {
    const g = new THREE.Group();
    g.position.set(fuse.x, 0, fuse.y);
    box(g, 0.12, 1.2, 0.12, 0x3a3d42, 0, 0.6, 0);
    box(g, 0.7, 0.95, 0.3, 0x7d8388, 0, 1.45, 0);
    H.fuseLamp = box(g, 0.08, 0.08, 0.04, 0x113311, 0.22, 1.8, 0.16, 0x33ff66);
    H.root.add(g);
    H.fuseAt = { x: fuse.x, y: fuse.y };
  }
  if (vitrine) {
    const g = new THREE.Group();
    g.position.set(vitrine.x, 0, vitrine.y);
    box(g, 1.0, 1.0, 1.0, 0xd9d4c7, 0, 0.5, 0);
    box(g, 0.46, 0.08, 0.46, 0x9c1628, 0, 1.04, 0, 0x4a0010);
    // the museum spotlight on the case, as a soft beam (no real light)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.75, 3.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 3.5;
    g.add(beam);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xf4f0e2, side: THREE.DoubleSide }));
    card.rotation.x = -Math.PI / 2 + 0.25;
    card.position.set(0.05, 1.09, 0.04);
    g.add(card);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), new THREE.MeshStandardMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }));
    glass.position.y = 1.38;
    g.add(glass);
    box(g, 0.94, 0.05, 0.94, 0xb8a36a, 0, 1.77, 0);
    H.root.add(g);
    H.vitrine = { x: vitrine.x, y: vitrine.y };
    H.stand = besides(world.map, vitrine, 1.5);
  }
}

// A sighting still being played out is dropped when the stage changes.
export function heistStageChanged() {
  if (H && H.seen) { H.seen.w.cone.userData.mat.color.setHex(0xffe3a0); H.seen = null; }
}

export function vitrineSpot() { return H && H.vitrine; }
// Where you stand to look into the case (the vitrine stage's target).
export function vitrineStand() { return H && H.stand; }

// Cameras run on the fuse box: off once it is done.
export function camerasOff() {
  if (!H) return;
  for (const w of H.watchers) {
    if (w.kind !== 'camera' || !w.on) continue;
    w.on = false;
    w.cone.visible = false;
    if (w.led) w.led.material.emissiveIntensity = 0;
  }
  if (H.fuseLamp) H.fuseLamp.material.emissive.setHex(0xff3322);
}

function distract(world) {
  H.distracted = true;
  for (const w of H.watchers) { w.on = false; w.cone.visible = false; }
  world.addMessage('Tammo gooit een steentje in het water. Plons! Alle bewakers kijken de andere kant op.', 4);
}

// Per frame during the mission; `watch` when the current stage is watched.
// Returns true while the player is being sent back (the stage waits).
export function updateHeist(dt, world, watch, back) {
  if (!H) return false;
  const p = world.player;
  const t = world.time;
  for (const w of H.watchers) {
    if (!w.on) continue;
    w.angle = w.center + w.amp * Math.sin((t + w.phase) * (Math.PI * 2) / w.period);
    w.cone.rotation.y = -w.angle;
    if (w.kind === 'guard') { w.mesh.rotation.y = -w.angle; animatePersonWalk(w.mesh, 0, dt); } else w.head.rotation.y = -w.angle;
  }
  if (H.seen) {
    H.seen.t += dt;
    if (H.seen.t >= SEEN_DELAY) {
      const to = H.seen.back;
      H.seen.w.cone.userData.mat.color.setHex(0xffe3a0);
      H.seen = null;
      if (to && !p.inVehicle) { p.x = to.x; p.y = to.y; p.vx = 0; p.vy = 0; world.teleported = world.time; }
      if (H.spotted >= SPOTS_BEFORE_HELP && !H.distracted) distract(world);
    }
    return true;
  }
  if (!watch || H.distracted || p.inVehicle || world.pigeonMode) return false;
  for (const w of H.watchers) {
    if (!w.on) continue;
    const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy);
    const range = w.range * (w.kind === 'guard' && p.crouching ? 0.6 : 1);
    if (d > range || d < 0.5) continue;
    let da = Math.atan2(dy, dx) - w.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > w.half) continue;
    if (w.kind === 'guard' && !losClear(world.map, w.x, w.y, p.x, p.y)) continue;
    H.spotted++;
    H.seen = { w, t: 0, back };
    w.cone.userData.mat.color.setHex(0xff3b2e);
    world.addMessage(w.kind === 'guard' ? 'Gezien! De bewaker schijnt je recht in je gezicht. Terug het donker in.' : 'Gezien! Een camera piept. Terug, en wacht tot hij wegdraait.', 3);
    return true;
  }
  return false;
}

// --- the fuse box minigame ----------------------------------------------------

function fuseUi() {
  if (H.ui) return H.ui;
  const el = document.createElement('div');
  el.id = 'heist-fuse';
  el.style.cssText = 'position:fixed;left:50%;bottom:21%;transform:translateX(-50%);z-index:40;padding:12px 16px 14px;border-radius:12px;background:rgba(12,14,18,.84);color:#f3efe4;font:600 14px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none;min-width:300px;box-shadow:0 6px 24px rgba(0,0,0,.45)';
  el.innerHTML = '<div data-t style="margin-bottom:8px">Stroomkast</div><div style="position:relative;height:18px;border-radius:9px;background:#2c3038;overflow:hidden"><div data-z style="position:absolute;top:0;bottom:0;background:#3fbf6a"></div><div data-n style="position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#fff;border-radius:2px"></div></div><div data-h style="margin-top:8px;font-weight:500;opacity:.85">Druk op Spatie als de naald in het groen staat</div>';
  document.body.appendChild(el);
  H.ui = el;
  return el;
}

export function closeFuse() {
  if (H && H.ui) { H.ui.remove(); H.ui = null; }
}

// Returns true once all fuses are pulled.
export function updateFuse(dt, world, target, input) {
  if (!H) return true;
  const p = world.player;
  const F = H.fuse || (H.fuse = { x: 0, dir: 1, hits: 0, misses: 0, width: 0.16, center: 0.5, flash: 0 });
  const near = target && dist(p.x, p.y, target.x, target.y) < 3.2 && !p.inVehicle;
  if (!near) { closeFuse(); return false; }
  const el = fuseUi();
  F.x += F.dir * dt * (0.85 + F.hits * 0.12);
  if (F.x > 1) { F.x = 2 - F.x; F.dir = -1; }
  if (F.x < 0) { F.x = -F.x; F.dir = 1; }
  if (input && input.wasPressed(' ')) {
    if (Math.abs(F.x - F.center) <= F.width / 2) {
      F.hits++;
      world.addMessage(`Klik. Camera ${F.hits} van ${FUSES} gaat op zwart.`, 2.2);
      F.center = 0.2 + Math.random() * 0.6;
    } else {
      F.misses++;
      F.width = Math.min(0.34, F.width + 0.05);
      for (let k = 0; k < 10; k++) spawnFxSpark(target.x, 1.5, target.y, (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.5);
      world.addMessage(F.misses >= MISSES_BEFORE_HELP ? 'Anita: "Laat mij maar." Ze trekt alle zekeringen er tegelijk uit.' : 'Au, vonken! Nog een keer, rustig.', 2.2);
      if (F.misses >= MISSES_BEFORE_HELP) F.hits = FUSES;
    }
  }
  el.querySelector('[data-z]').style.cssText = `position:absolute;top:0;bottom:0;background:#3fbf6a;left:${(F.center - F.width / 2) * 100}%;width:${F.width * 100}%`;
  el.querySelector('[data-n]').style.left = `${F.x * 100}%`;
  el.querySelector('[data-t]').textContent = `Stroomkast · zekering ${Math.min(FUSES, F.hits + 1)} van ${FUSES}`;
  if (F.hits >= FUSES) { closeFuse(); camerasOff(); return true; }
  return false;
}

export function disposeHeist() {
  if (!H) return;
  closeFuse();
  H.root.removeFromParent();
  // person meshes share their materials (and all but the skinned geometry)
  const people = new Set();
  for (const w of H.watchers) if (w.kind === 'guard') w.mesh.traverse((o) => { if (!o.isSkinnedMesh && !o.userData.own) people.add(o); });
  H.root.traverse((o) => {
    if (o.geometry && (o.isSkinnedMesh || !people.has(o))) o.geometry.dispose();
    if (o.material && !people.has(o) && !o.isSkinnedMesh) o.material.dispose();
  });
  H = null;
}
