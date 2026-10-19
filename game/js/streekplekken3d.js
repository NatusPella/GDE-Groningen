import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { CEL, celVan, partsToWorld } from './streekplekken.js';

// Landplekken (#21, #23, #164, #198, scripts/world/streekplekken.mjs -> game/streekplekken.json): perrons,
// schoorstenen, zendmasten, monumenten en parken, per cel van 512 m als InstancedMesh (een per
// vorm: doos, cilinder, kegel), met een kleur per instantie. Het land ligt op y=0 (dijken en
// terpen volgen de hoogte niet). De budgetten (onderdelen per cel) zitten al in het bestand
// (streekplekken.js tileBudget).
// Stream: cellen binnen STREAM_IN van de speler komen erbij, buiten STREAM_OUT gaan ze weg.

const STREAM_IN = 700;
const STREAM_OUT = 900;
const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
};
// de kegel en cilinder staan op hun midden; de onderdelen willen hun onderkant op y
const BASE = { box: 0.5, cyl: 0.5, cone: 0.5 };

let cellen = null;          // null: nog niet gevraagd; Map cel -> [plek]
const live = new Map();     // cel -> group
let tick = 0;

function load() {
  if (cellen) return;
  cellen = new Map();
  fetch(new URL('streekplekken.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !Array.isArray(j.plekken)) return;
    for (const p of j.plekken) { const k = celVan(p.x, p.y); (cellen.get(k) || cellen.set(k, []).get(k)).push(p); }
  }).catch((e) => console.warn('streekplekken not loaded', e && e.message));
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

function celGroup(lijst) {
  const per = { box: [], cyl: [], cone: [] };
  for (const p of lijst) for (const q of partsToWorld(p)) per[q.s].push(q);
  const g = new THREE.Group();
  g.name = 'streekplekken';
  for (const s of Object.keys(per)) {
    const arr = per[s];
    if (!arr.length) continue;
    const im = new THREE.InstancedMesh(GEO[s], mat, arr.length);
    arr.forEach((q, i) => {
      _q.setFromAxisAngle(UP, q.ry);
      _p.set(q.x, q.y + q.h * BASE[s], q.z);
      _s.set(q.w, q.h, q.d);
      _m.compose(_p, _q, _s);
      im.setMatrixAt(i, _m);
      im.setColorAt(i, _c.setHex(q.c));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = false;
    im.frustumCulled = true;
    g.add(im);
  }
  return g;
}

export function updateStreekplekken3D(world) {
  load();
  if (!cellen.size || (tick = (tick + 1) % 20) !== 0) return;
  const scene = getScene();
  if (!scene) return;
  const p = world.player;
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  const dist = (k) => {
    const [i, j] = k.split(',').map(Number);
    const x0 = i * CEL, y0 = j * CEL;
    return Math.hypot(Math.max(x0 - px, 0, px - (x0 + CEL)), Math.max(y0 - py, 0, py - (y0 + CEL)));
  };
  for (const [k, g] of live) {
    if (dist(k) > STREAM_OUT) {
      scene.remove(g);
      g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      live.delete(k);
    }
  }
  for (const [k, lijst] of cellen) {
    if (live.has(k) || dist(k) > STREAM_IN) continue;
    const g = celGroup(lijst);
    scene.add(g);
    live.set(k, g);
    break;   // een cel per tik
  }
}
