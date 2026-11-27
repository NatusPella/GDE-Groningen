import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { CEL, celVan, partsToWorld, dropOnRoad, roadOnMap } from './streekplekken.js';
import { roadNetReady, snapRoad } from './roadgraph.js';
import { edgeDistance } from './countryfield.js';
import { dropStreekParts, perronKitDubbel } from './propfilter.js';
import { createCalmGate } from './tilestream.js';
const tilesCalmGate = createCalmGate(); // wacht ook op de achtergrondwachtrij van de tegelwereld, hoogstens twee seconden achter elkaar (#1052)

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

// De stad heeft zijn eigen parken (tegels met gras, heggen, bomen en paden op de echte plek): het parkkit is een
// rechthoek en liep daar over wegen, voetpaden en bestrate pleinen (Prinsentuin, Martinikerkhof, #324).
const PARK_IN_STAD = -30;
const inStad = (p) => p.t === 'park' && edgeDistance(p.x, p.y) < PARK_IN_STAD;

// De rechthoek van een park kan een weg kruisen: bomen en heggen daarop vallen weg (roadgraph.js, halve breedte per
// soort plus een berm). Zolang het wegennet nog niet geladen is (of ontbreekt in de webversie) wacht een cel kort.
const HALF_W = { 1: 7, 2: 4.5, 3: 5, 4: 4, 5: 3.5, 6: 3, 7: 3 };
const BERM = 1.2, MAX_WACHT = 60;
let wacht = 0;
const opWeg = (x, y) => { const s = snapRoad(x, y, 12); return !!s && !s.bridge && s.d < (HALF_W[s.kind] || 3) + BERM; };
const wegenKlaar = () => roadNetReady() || ++wacht > MAX_WACHT;

// Elke soort gaat door de tegelkaart (propfilter.js): geen mast of zuil op het asfalt of in een huis, en bij een park
// ook geen boom in een gebouw. Een cel wordt opnieuw gebouwd als er tegels bijkwamen (map.geoVer): de eerste bouw kan
// vóór de tegels van die plek klaar zijn.
function celGroup(lijst, map) {
  const per = { box: [], cyl: [], cone: [] };
  for (const p of lijst) {
    if (inStad(p)) continue;
    const parts = p.t === 'park' ? dropOnRoad(partsToWorld(p), roadNetReady() ? opWeg : (x, y) => roadOnMap(map, x, y, BERM)) : partsToWorld(p);
    if (p.t === 'perron' && perronKitDubbel(map, parts)) continue;   // een echt perron (stad, landhalte) staat er al (#1346)
    for (const q of dropStreekParts(parts, map, p.t)) per[q.s].push(q);
  }
  const g = new THREE.Group();
  g.name = 'streekplekken';
  for (const s of Object.keys(per)) {
    const arr = per[s];
    if (!arr.length) continue;
    // an own geometry per mesh: meshes that share one make three set the vertex attributes up again at every change from one mesh to the next (~14 GL calls a draw, 164 a frame for these)
    const im = new THREE.InstancedMesh(GEO[s].clone(), mat, arr.length);
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
  const p = hoofdspeler(world);
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  const dist = (k) => {
    const [i, j] = k.split(',').map(Number);
    const x0 = i * CEL, y0 = j * CEL;
    return Math.hypot(Math.max(x0 - px, 0, px - (x0 + CEL)), Math.max(y0 - py, 0, py - (y0 + CEL)));
  };
  for (const [k, g] of live) {
    if (dist(k) > STREAM_OUT) {
      scene.remove(g);
      g.traverse((o) => { if (o.isInstancedMesh) { o.dispose(); o.geometry.dispose(); } });
      live.delete(k);
    }
  }
  for (const [k, lijst] of cellen) {
    if (live.has(k) || dist(k) > STREAM_IN) continue;
    if (!wegenKlaar()) break;
    const g = celGroup(lijst, world.map);
    g.userData.ver = world.map ? world.map.geoVer : 0;
    scene.add(g);
    live.set(k, g);
    break;   // een cel per tik
  }
  // een cel die voor de laatste tegels is gebouwd, opnieuw (een per tik, alleen binnen bereik)
  if (world.map && world.map.geoVer !== undefined && tilesCalmGate(world.map)) for (const [k, g] of live) {
    if (g.userData.ver === world.map.geoVer || dist(k) > STREAM_IN) continue;
    scene.remove(g);
    g.traverse((o) => { if (o.isInstancedMesh) { o.dispose(); o.geometry.dispose(); } });
    const g2 = celGroup(cellen.get(k) || [], world.map);
    g2.userData.ver = world.map.geoVer;
    scene.add(g2);
    live.set(k, g2);
    break;
  }
}

