// Voertuigdeuren tekenen (#225): scharnierende of schuivende panelen op de carrosserie.
// Regels en data staan in vehicledoors.js. Een deur is een dunne doos met gedeelde
// geometrie per maat; een gesloten deur wordt niet getekend (de carrosserie heeft het
// paneel al), dus een rijdende auto kost niets extra. Deuren worden pas aangemaakt als er
// er een open moet of los is. Geen physics.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markShared } from './pixelart3d.js';
import {
  doorsFor, deurVoorRol, ensureDoors, wantDoor, stepDoors, deurStand, reconcileDoors,
  deurDoelVoorAnim, stilstandDeurOpen, DEUR_HOUD_TIJD, MAX_LOSSE_DEUREN,
} from './vehicledoors.js';

const geoCache = new Map();
const matCache = new Map();
const panelGeo = (w, h) => {
  const key = w.toFixed(2) + 'x' + h.toFixed(2);
  let g = geoCache.get(key);
  if (!g) { g = markShared(new THREE.BoxGeometry(w, h, 0.035)); geoCache.set(key, g); }
  return g;
};
const boxGeo = (x, y, z) => {
  const key = 'b' + [x, y, z].map((n) => n.toFixed(2)).join('x');
  let g = geoCache.get(key);
  if (!g) { g = markShared(new THREE.BoxGeometry(x, y, z)); geoCache.set(key, g); }
  return g;
};
const panelMat = (hex, glas) => {
  const key = hex + (glas ? 'g' : '');
  let m = matCache.get(key);
  if (!m) {
    m = glas
      ? new THREE.MeshStandardMaterial({ color: 0x2b3740, roughness: 0.28, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return m;
};
// de open deur van een bus kijkt in een verlichte bus (grijsblauw), niet in een zwart gat (#385)
const BUS_HOLE_MAT = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x59636d }); m.userData.shared = true; return m; })();
const HOLE_MAT = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x121214 }); m.userData.shared = true; return m; })();

const toHex = (c, fb) => (typeof c === 'number' ? c : typeof c === 'string' ? new THREE.Color(c).getHex() : fb);

function paintOf(v) {
  if (v.wrecked) return 0x1f1d1b;
  if (v.isPolice && !v._commandeered && !(v.model && v.model.resprayed)) return 0xeceae4;
  if (v.isAmbulance) return 0xf1d21c;
  return toHex(v.model && v.model.color, 0xc7c9cc);
}

// Op de bodem liggende losse deuren, oudste eerst weg boven het maximum.
const loseDeuren = [];
const wereld = { n: 0 };

function buildRig(mesh, v, defs) {
  const group = new THREE.Group();
  group.name = 'deuren';
  const hw = v.model.wid / 2, len = v.model.len;
  const doors = {};
  const paint = paintOf(v);
  for (const d of defs) {
    const cx = d.x * len;
    const pivot = new THREE.Group();
    let panel, hole, baseX, baseZ = 0;
    if (d.soort === 'kap' || d.soort === 'klep') {
      // horizontaal plaatwerk: scharnier achter (kap) of voor (kofferbak), klapt omhoog
      const breed = v.model.wid * 0.78, kap = d.soort === 'kap';
      baseX = kap ? cx - d.w / 2 : cx + d.w / 2;
      pivot.position.set(baseX, d.y0, 0);
      panel = new THREE.Mesh(boxGeo(d.w, 0.035, breed), panelMat(paint, false));
      panel.position.set(kap ? d.w / 2 : -d.w / 2, 0.02, 0);
      hole = new THREE.Mesh(boxGeo(d.w * 0.92, 0.02, breed * 0.92), HOLE_MAT);
      hole.position.set(cx, d.y0 + 0.005, 0);
      panel.userData.flat = true;
    } else if (d.soort === 'achterdeur') {
      // laadklep/achterdeur: scharnier links, zwaait naar achteren
      baseX = cx - 0.02; baseZ = -d.w / 2;
      pivot.position.set(baseX, d.y0 + d.h / 2, baseZ);
      panel = new THREE.Mesh(boxGeo(0.035, d.h, d.w), panelMat(paint, false));
      panel.position.set(0, 0, d.w / 2);
      hole = new THREE.Mesh(boxGeo(0.02, d.h * 0.92, d.w * 0.92), HOLE_MAT);
      hole.position.set(cx + 0.01, d.y0 + d.h / 2, 0);
    } else {
      const glas = d.h > 1.05;
      baseX = d.soort === 'scharnier' ? cx + d.w / 2 : d.soort === 'achterscharnier' ? cx - d.w / 2 : cx;
      baseZ = d.side * (hw + 0.02);
      pivot.position.set(baseX, d.y0 + d.h / 2, baseZ);
      panel = new THREE.Mesh(panelGeo(d.w, d.h), panelMat(paint, glas));
      panel.position.x = d.soort === 'scharnier' ? -d.w / 2 : d.soort === 'achterscharnier' ? d.w / 2 : 0;
      hole = new THREE.Mesh(panelGeo(d.w * 0.92, d.h * 0.92), v.isBus ? BUS_HOLE_MAT : HOLE_MAT);
      // schuifdeuren (bus): het deurblad zit al in het model op hw+0.014, de opening moet daar vóór liggen
      hole.position.set(cx, d.y0 + d.h / 2, d.side * (hw + (d.soort === 'schuif' ? 0.02 : 0.006)));
    }
    pivot.add(panel);
    hole.visible = false;
    pivot.visible = false;
    group.add(pivot, hole);
    doors[d.id] = { def: d, pivot, panel, hole, baseX, baseZ, home: panel.position.clone() };
  }
  const body = mesh.userData.body || mesh;
  body.add(group);
  mesh.userData.doorRig = { group, doors, paint, bus: !!v.isBus };
  return mesh.userData.doorRig;
}

function pose(rig, id, open, dmg) {
  const e = rig.doors[id];
  if (!e) return;
  const d = e.def, a = deurStand(d, open, dmg);
  e.pivot.visible = a > 0.002;
  e.hole.visible = e.pivot.visible || !!e.lost;
  if (!e.pivot.visible) return;
  if (d.soort === 'schuif') {
    e.pivot.position.x = e.baseX + (d.dir || 1) * a;
    // een busdeur schuift het lichaam in (het blad verdwijnt achter de romp); buiten langs de bus gleed het als een grijs
    // vlak over het wiel en voorbij de neus (#385). Een tram laat zijn deuren buitenlangs schuiven.
    e.pivot.position.z = e.baseZ + d.side * (rig.bus ? -0.06 : 0.07) * Math.min(1, a / 0.2);
    e.pivot.rotation.y = 0;
  } else if (d.soort === 'kap') {
    e.pivot.rotation.z = a;
  } else if (d.soort === 'klep') {
    e.pivot.rotation.z = -a;
  } else if (d.soort === 'achterdeur') {
    e.pivot.rotation.y = -a;
  } else {
    e.pivot.rotation.y = (d.soort === 'achterscharnier' ? -1 : 1) * d.side * a;
  }
}

// Laat een deur los: het paneel verlaat het voertuig en valt als los object op straat.
function laatLos(mesh, rig, id, v) {
  const e = rig.doors[id];
  if (!e || e.lost) return;
  e.lost = true;
  e.hole.visible = true;
  const parent = mesh.parent;
  if (parent && e.pivot) {
    e.pivot.visible = true;
    pose(rig, id, 0.35, null);
    mesh.updateMatrixWorld(true);
    const obj = e.panel;
    obj.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    obj.getWorldPosition(wp); obj.getWorldQuaternion(wq);
    e.pivot.remove(obj);
    obj.position.copy(wp); obj.quaternion.copy(wq);
    obj.userData.fall = { vy: 1.2, vx: Math.cos(v.angle) * (v.speed || 0) * 0.4, vz: Math.sin(v.angle) * (v.speed || 0) * 0.4, spin: (e.def.side || 1) * 3, life: 25, floor: (v.z || 0) + 0.06 };
    parent.add(obj);
    loseDeuren.push(obj);
    while (loseDeuren.length > MAX_LOSSE_DEUREN) removeLoose(loseDeuren.shift());
  }
  e.pivot.visible = false;
}

function removeLoose(o) {
  if (o.parent) o.parent.remove(o);
}

// Eén keer per frame: losse deuren vallen en liggen een tijd op straat.
export function tickLooseDoors(dt) {
  for (let i = loseDeuren.length - 1; i >= 0; i--) {
    const o = loseDeuren[i], f = o.userData.fall;
    f.life -= dt;
    if (f.life <= 0 || !o.parent) { removeLoose(o); loseDeuren.splice(i, 1); wereld.n = Math.max(0, wereld.n - 1); continue; }
    if (o.position.y > f.floor + 0.02) {
      f.vy -= 9.8 * dt;
      o.position.x += f.vx * dt; o.position.z += f.vz * dt; o.position.y += f.vy * dt;
      o.rotation.z += f.spin * dt;
      if (o.position.y <= f.floor + 0.02) { o.position.y = f.floor + 0.02; if (o.userData.flat) o.rotation.set(0, o.rotation.y, 0); else o.rotation.set(Math.PI / 2, o.rotation.y, 0); f.vx = f.vz = 0; }
    }
  }
}

// Eén voertuig bijwerken. vraag: { id, open } van een in-/uitstapanimatie of null.
export function syncVehicleDoors(mesh, v, dt, vraag = null) {
  if (!mesh) return;
  const defs = doorsFor(v);
  if (!defs.length) return;
  let st = v.doors;
  if (!st && !vraag && !stilstandDeurOpen(v) && !(v.dentLog && v.dentLog.length)) return;
  st = ensureDoors(v);
  const dlen = v.dentLog ? v.dentLog.length : 0;
  let rig = mesh.userData.doorRig;
  if (st.dlen !== dlen || v.wrecked !== st.wr) {
    st.dlen = dlen; st.wr = v.wrecked;
    const los = reconcileDoors(v, defs, wereld);
    if (los.length || Object.keys(st.loose).length) {
      rig = rig || buildRig(mesh, v, defs);
      for (const id of los) laatLos(mesh, rig, id, v);
      for (const id of Object.keys(st.loose)) if (rig.doors[id] && !rig.doors[id].lost) laatLos(mesh, rig, id, v);
    }
    if (!Object.keys(st.loose).length && rig) for (const e of Object.values(rig.doors)) { e.lost = false; if (!e.panel.parent) e.pivot.add(e.panel); }
    if (!Object.keys(st.loose).length && rig) for (const e of Object.values(rig.doors)) { e.panel.position.copy(e.home); e.panel.quaternion.identity(); e.hole.visible = false; }
  }
  if (vraag) {
    const d = deurVoorRol(defs, vraag.rol, st, vraag.side || 0);
    if (d) wantDoor(st, d.id, vraag.open, DEUR_HOUD_TIJD);
  } else if (stilstandDeurOpen(v)) {
    for (const d of defs) if (d.soort === 'schuif') wantDoor(st, d.id, true, DEUR_HOUD_TIJD);
  }
  const bewegend = stepDoors(st, dt, { speed: v.speed, wrecked: v.wrecked });
  if (!bewegend && !Object.keys(st.dmg).length && !rig) return;
  rig = rig || buildRig(mesh, v, defs);
  for (const d of defs) {
    if (!rig.doors[d.id] || rig.doors[d.id].lost) continue;
    pose(rig, d.id, st.open[d.id] || 0, st.dmg[d.id] || null);
  }
}

// Voor scene3d: een lopende animatie omzetten in een deurvraag.
export function vraagVoorAnim(a, rol) {
  return a ? { v: a.v, rol, open: deurDoelVoorAnim(a) === 1 } : null;
}

// Eén keer per frame: alle voertuigen in de buurt (open/dichte deuren, schade, bussen bij de halte).
// vragen: Map(voertuig -> { rol, open }) uit de in-/uitstapanimaties van speler en metgezel.
export function syncDoorsNear(world, meshes, px, py, dt, vragen) {
  tickLooseDoors(dt);
  for (const v of world.vehicles) {
    if (Math.abs(v.x - px) > 45 || Math.abs(v.y - py) > 45) continue;
    const q = vragen && vragen.get(v);
    if (!q && !v.doors && !v.isBus && !(v.dentLog && v.dentLog.length)) continue;
    const mesh = meshes.get(v.id);
    if (mesh) syncVehicleDoors(mesh, v, dt, q || null);
  }
}
