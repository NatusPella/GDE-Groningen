import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared, composeMatrix } from './pixelart3d.js';
import { vehicleSeat } from './seating3d.js';
import { carBodyFit } from './models3d_vehicles.js';
import { hasCarInterior, interiorLayout, doorTrims, interiorKlasse, klasseStijl, innerShell } from './carinteriorlayout.js';
import { isCockpitKlasse } from './cockpitlayout.js';
import { doorsFor } from './vehicledoors.js';

// Low-poly car interior for the first-person camera (#833) and the "Binnenin" film camera
// (V): dashboard, steering wheel, instrument pod, two front seats, a rear bench and a
// mirror. Parts are anonymous (no emblem or badge on the wheel). Sinds #847 werkt hetzelfde
// pad voor de cockpitklassen: de trekker, heli, het vliegtuig en de machines krijgen hun
// eigen dashboard/stuur/stoelen uit cockpitlayout.js in plaats van de auto-indeling.
//
// Everything that stands still is merged into ONE geometry with baked vertex colours and
// one shared Lambert material (the same approach as cabin3d.js), so the car the player sits
// in costs 2 + (number of doors) draw calls instead of ~30-40 meshes with a material each.
// Only the parts that move by themselves stay separate: the steering wheel (it turns with
// v.steer) and the trim of each door (it disappears when that door is open or loose).
// Same shapes and colours as before; no per-box emissive, the shared material lifts the
// whole cabin out of the shadow (emissive 0x20232a, like cabin3d.js).

const DARK = 0x23262b, GREY = 0x3a3f46, SEAT = 0x4a4f58, TRIM = 0x6a707a;
// de kooi van binnen (#833): dezelfde kleuren als de cabine van buiten (cabin3d.js)
const FLOOR = 0x23262b, WALL = 0x383d44;

let material = null;
function interiorMaterial() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

// One geometry set per (class, size, seat, body shape, doors); shared between vehicles of
// the same kind, so getting into another car of the same model builds nothing.
const geoCache = new Map();

function cacheKey(seat, len, wid, defs, klasse, romp, naam) {
  const rompKey = romp ? [romp.belt, romp.roof, romp.xA, romp.xB].map((n) => n.toFixed(2)).join(',') : '';
  const doorKey = (defs || []).map((d) => `${d.id}:${d.side}:${d.x.toFixed(3)}:${(d.y0 || 0).toFixed(3)}:${(d.w || 0).toFixed(3)}:${(d.h || 0).toFixed(3)}`).join(';');
  return [klasse, naam || '', len, wid, seat.x.toFixed(2), seat.y.toFixed(2), seat.z.toFixed(2), rompKey, doorKey].join('|');
}

// De layout en de binnenhuid voor dit voertuig. Voor de cockpitklassen (#847) geeft
// carBodyFit() niets bruikbaars (het vliegtuig valt in de hatch-terugval), daarom gebruiken
// die hun eigen grenzen uit cockpitlayout.js; een wrak is nooit de eigen auto.
function layoutVan(v, seat) {
  const klasse = interiorKlasse(v);
  const cockpit = isCockpitKlasse(klasse);
  const romp = cockpit ? null : carBodyFit(v);
  const naam = (v.model && v.model.name) || '';
  const L = interiorLayout(seat, v.model.len, v.model.wid, romp, klasse, naam);
  return { klasse, cockpit, romp, naam, L, S: innerShell(seat, v.model.len, v.model.wid, L, romp) };
}

function seatBoxes(B, L, seat, K) {
  const sy = L.seatHoogte ?? seat.y;
  for (const s of L.seats) {
    B.box(s.x, sy - 0.07, s.z, 0.5, 0.14, 0.5, K.seatColor || SEAT);
    B.box(s.x - 0.27, sy + 0.27, s.z, 0.1, 0.55, 0.48, K.seatColor || SEAT, 0, 0, 0, K.seatTilt);
    // de hoofdsteun blijft onder de dakhemel van een cockpit; bij een auto hangt hij boven de raamlijn
    B.box(s.x - 0.3, L.shell ? Math.min(sy + 0.62, L.shell.roofY - 0.12) : sy + 0.62, s.z, 0.08, 0.16, 0.26, GREY);
  }
  if (L.rear) {
    const rear = K.rearColor || SEAT;
    B.box(L.rear.x, L.rear.y - 0.07, 0, 0.5, 0.14, L.rear.w, rear);
    B.box(L.rear.x - 0.27, L.rear.y + 0.27, 0, 0.1, 0.55, L.rear.w, rear);
  }
}

// All parts that never move: dashboard, instrument pod, steering column, seats, option
// parts of the class, console, rear bench, mirror, roof lining and A-pillars.
function buildStaticGeometry(seat, len, wid, klasse, romp, naam = '') {
  const cockpit = isCockpitKlasse(klasse);
  const L = interiorLayout(seat, len, wid, cockpit ? null : romp, klasse, naam);
  const K = klasseStijl(klasse, L, seat);
  if (K.rear !== undefined) L.rear = K.rear;
  const w = { ...L.wheel, ...K.wheel };
  const B = new GeoBuilder(1);
  // De kooi van binnen (#833): de carrosserie is enkelzijdig, dus zonder vloer en wanden kijk
  // je in eerste persoon door de achterkanten van het plaatwerk heen de straat op. Dezelfde
  // maten en kleuren als cabin3d.js, met de normaal naar binnen, dus van buiten onzichtbaar.
  // Acht driehoeken, mee in deze ene geometrie (geen extra mesh of draw call). De cockpitklassen
  // (#847) nemen de maten van hun eigen cabine/romp (L.shell).
  const S = innerShell(seat, len, wid, L, cockpit ? null : romp);
  const hw = S.hw;
  const floorY = S.floorY, roofY = S.roofY;
  const x1 = S.x1, x0 = S.x0;
  const zw = hw - 0.07;
  const P = (x, y, z) => [x, y, z];
  B.quadOut(P(x0, floorY, -zw), P(x1, floorY, -zw), P(x1, floorY, zw), P(x0, floorY, zw), [0, 1, 0], FLOOR);              // vloer
  for (const s of [-1, 1]) B.quadOut(P(x0, floorY, s * zw), P(x1, floorY, s * zw), P(x1, roofY, s * zw), P(x0, roofY, s * zw), [0, 0, -s], WALL); // zijwanden
  B.quadOut(P(x0, floorY, -zw), P(x0, floorY, zw), P(x0, roofY, zw), P(x0, roofY, -zw), [1, 0, 0], WALL);              // achterwand
  const d = L.dash;
  B.box(d.x, d.y + d.h / 2, 0, d.d, d.h, d.w, DARK);
  B.box(d.x - 0.08, d.y + d.h + 0.02, 0, d.d * 0.7, 0.05, d.w, GREY);
  const b = L.binnacle;
  // Het instrumentenpaneel zit achter het stuur, op de rijderskant: de indeling geeft geen
  // eigen z (dat gaf vroeger NaN-meetkunde in dit interieur), dus die van het stuur.
  const bz = w.z;
  B.box(b.x, b.y, bz, b.d, b.h, b.w, GREY);
  B.box(b.x - b.d / 2 - 0.005, b.y, bz - 0.12, 0.02, 0.1, 0.12, 0x9ad0e8); // gauge glass
  B.box(b.x - b.d / 2 - 0.005, b.y, bz + 0.12, 0.02, 0.1, 0.12, 0x9ad0e8);
  B.box(w.x + 0.06, w.y - 0.2, w.z, 0.05, 0.3, 0.05, DARK); // column
  seatBoxes(B, L, seat, K);
  for (const e of K.extras) B.box(e.at[0], e.at[1], e.at[2], e.b[0], e.b[1], e.b[2], e.color);
  const c = L.console;
  B.box(c.x, c.y, c.z, c.d, c.h, c.w, DARK);
  const m = L.mirror;
  B.box(m.x, m.y, m.z, 0.03, 0.07, 0.2, DARK);
  // roof lining and A-pillars
  const R = L.roof;
  B.box((R.x0 + R.x1) / 2, R.y, 0, R.x1 - R.x0, 0.04, R.w, GREY);
  for (const p of R.pillars) {
    const dx = p.x1 - p.x0, dy = p.y1 - p.y0, pl = Math.hypot(dx, dy);
    B.box((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, p.z, pl, 0.05, 0.05, DARK, 0, 0, 0, Math.atan2(dy, dx));
  }
  return markShared(B.build());
}

// The steering wheel alone, in the wheel's own mount space (+x = the axle the wheel turns
// around). Ring, spoke and hub are baked together; only the whole mesh turns.
function buildWheelGeometry(seat, len, wid, klasse, romp, naam = '') {
  const cockpit = isCockpitKlasse(klasse);
  const L = interiorLayout(seat, len, wid, cockpit ? null : romp, klasse, naam);
  const K = klasseStijl(klasse, L, seat);
  const w = { ...L.wheel, ...K.wheel };
  const B = new GeoBuilder(1);
  // The old interior put the ring in a turn group (rotation.y = PI/2) that spun about z;
  // baking the PI/2 turn and spinning the mesh about x is the same rotation.
  const axle = composeMatrix(0, 0, 0, 0, Math.PI / 2, 0);
  B.geo(new THREE.TorusGeometry(w.r, 0.022, 6, 14), axle, DARK);
  B.box(0, 0, 0, w.r * 1.8, 0.03, 0.03, GREY, 0, 0, Math.PI / 2, 0);
  B.geo(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), axle.clone().multiply(composeMatrix(0, 0, 0, Math.PI / 2, 0, 0)), TRIM);
  return markShared(B.build());
}

// One small mesh per door: panel, armrest and handle. Its own mesh because it has to be
// able to disappear when that door opens or comes loose (v.doors).
function buildTrimGeometry(t) {
  const B = new GeoBuilder(1);
  B.box(t.x, t.y, t.z, t.w, t.h, 0.04, SEAT);
  B.box(t.arm.x, t.arm.y, t.arm.z, t.arm.w, 0.05, 0.08, GREY);
  B.box(t.handle.x, t.handle.y, t.handle.z, 0.14, 0.03, 0.04, TRIM);
  return markShared(B.build());
}

function geometriesFor(v) {
  const seat = vehicleSeat(v, true);
  const len = v.model.len, wid = v.model.wid;
  const { klasse, romp, naam, L, S } = layoutVan(v, seat);
  const K = klasseStijl(klasse, L, seat);
  const defs = doorsFor(v);
  const key = cacheKey(seat, len, wid, defs, klasse, romp, naam);
  let geos = geoCache.get(key);
  if (geos) return geos;
  geos = {
    statisch: buildStaticGeometry(seat, len, wid, klasse, romp, naam),
    wheel: buildWheelGeometry(seat, len, wid, klasse, romp, naam),
    trims: doorTrims(defs, len, wid, S.hw).map((t) => ({ id: t.id, geometry: buildTrimGeometry(t) })),
    wheelPose: { ...L.wheel, ...K.wheel },
  };
  geoCache.set(key, geos);
  return geos;
}

// Build and hang the interior on the vehicle mesh once; from then on only visibility, the
// steering wheel and the door trims change.
function buildInterior(mesh, v) {
  const geos = geometriesFor(v);
  const g = new THREE.Group();
  g.name = 'interior';
  const mat = interiorMaterial();
  const statisch = new THREE.Mesh(geos.statisch, mat);
  statisch.name = 'interieur-vast';
  statisch.renderOrder = 12; // after the doors' opening (vehicledoors3d.js, 10) and the cabin (cabin3d.js, 11)
  statisch.castShadow = false;
  statisch.receiveShadow = false;
  g.add(statisch);
  const mount = new THREE.Group();
  mount.position.set(geos.wheelPose.x, geos.wheelPose.y, geos.wheelPose.z);
  mount.rotation.z = geos.wheelPose.tilt;
  const wheel = new THREE.Mesh(geos.wheel, mat);
  wheel.castShadow = false;
  wheel.receiveShadow = false;
  mount.add(wheel);
  g.add(mount);
  g.userData.wheel = wheel;
  g.userData.trims = geos.trims.map((t) => {
    const tm = new THREE.Mesh(t.geometry, mat);
    tm.castShadow = false;
    tm.receiveShadow = false;
    g.add(tm);
    return { id: t.id, group: tm };
  });
  mesh.userData.interior = g;
  mesh.add(g);
  return g;
}

// Called every frame from scene3d for the player's car. show = the first-person camera or
// the "Binnenin" film camera is on. Returns true when the interior is up (the driver is hidden).
// Een wrak heeft geen eigen interieur: daar rijd je niet in, en het kapotte interieur zit in de
// gedeelde cabinegeometrie (#847).
export function updateCarInterior(mesh, v, show) {
  if (!mesh || !hasCarInterior(v) || v.wrecked) return false;
  let g = mesh.userData.interior;
  if (!g && show) g = buildInterior(mesh, v);
  if (!g) return false;
  g.visible = !!show;
  if (show) {
    g.userData.wheel.rotation.x = -(v.steer || 0) * 2.2;
    const st = v.doors;
    for (const t of g.userData.trims) t.group.visible = !(st && ((st.open[t.id] || 0) > 0.2 || st.loose[t.id]));
  }
  return !!show;
}

// Eye pose (map x, y, height z) and look direction for the cinematics camera.
export function interiorEyePose(v) {
  if (!hasCarInterior(v) || v.wrecked) return null;
  const seat = vehicleSeat(v, true);
  const { klasse, romp, naam } = layoutVan(v, seat);
  const e = interiorLayout(seat, v.model.len, v.model.wid, romp, klasse, naam).eye;
  const a = v.angle, c = Math.cos(a), s = Math.sin(a);
  // vehicle-local +x forward, +z right; map y runs with local +z
  const x = v.x + e.x * c - e.z * s, y = v.y + e.x * s + e.z * c;
  return { x, y, z: (v.z || 0) + e.y, fx: c, fy: s };
}
