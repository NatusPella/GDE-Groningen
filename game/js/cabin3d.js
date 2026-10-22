// De cabine van een auto, bestelbus of vrachtwagen van buiten gezien (#389): vloer, dakhemel, binnenwanden,
// stoelen, dashboard en stuur, zodat je door de ruiten en door een open portier een auto ziet en geen lege
// schil. Eén samengevoegde geometrie per voertuigsoort en maat (gedeeld, markShared), één mesh per voertuig,
// alleen voor voertuigen binnen CABIN_R van de speler. De indeling komt uit carinteriorlayout.js (dezelfde
// maten als de binnenin-camera); die camera verbergt deze cabine als hij zijn eigen interieur laat zien.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { vehicleSeat } from './seating3d.js';
import { hasCarInterior, interiorLayout, interiorKlasse, klasseStijl } from './carinteriorlayout.js';

export const CABIN_R = 25;       // m: verder weg is de cabine niet te zien
const FLOOR = 0x23262b, WALL = 0x383d44, LINING = 0x4a4f58, DARK = 0x23262b, GREY = 0x3a3f46, SEAT = 0x4a4f58, TRIM = 0x6a707a;
const geoCache = new Map();
let material = null;

function cabinMaterial() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

// seat: vehicleSeat(v, true); pure genoeg om in Node te bouwen (scripts/cabin_test.mjs)
export function buildCabinGeometry(seat, len, wid, klasse) {
  const L = interiorLayout(seat, len, wid);
  const K = klasseStijl(klasse, L, seat);
  if (K.rear !== undefined) L.rear = K.rear;
  const B = new GeoBuilder(1);
  const hw = wid / 2, sy = seat.y;
  const floorY = Math.max(0.3, sy - 0.34);
  // de schil blijft onder de raamlijn: het plaatwerk van motorkap en kofferdek ligt lager dan het dak, dus een dakhemel
  // of hoge wand zou erbovenuit steken. Door de ruiten zie je stoelen, stuur en dashboard, door een open portier ook de wand.
  const roofY = sy + 0.42;
  // een korte neus (vrachtwagen, cabine boven de as) laat het dashboard niet door de voorkant steken: de voorste onderdelen schuiven terug
  const sh = -Math.max(0, L.dash.x + L.dash.d / 2 - (len / 2 - 0.12));
  const x1 = L.dash.x + L.dash.d / 2 - 0.05 + sh;
  const x0 = (L.rear ? L.rear.x - 0.45 : L.roof.x0 - 0.1);
  const cx = (x0 + x1) / 2, cl = x1 - x0, zw = hw - 0.07;
  // de schil is enkelzijdig en kijkt naar binnen: van buiten zie je alleen de verste wand (door een open portier),
  // de wand aan jouw kant valt weg (achterkant), zodat de stoelen te zien zijn
  const P = (x, y, z) => [x, y, z];
  B.quadOut(P(x0, floorY, -zw), P(x1, floorY, -zw), P(x1, floorY, zw), P(x0, floorY, zw), [0, 1, 0], FLOOR);       // vloer
  for (const s of [-1, 1]) B.quadOut(P(x0, floorY, s * zw), P(x1, floorY, s * zw), P(x1, roofY, s * zw), P(x0, roofY, s * zw), [0, 0, -s], WALL); // binnenwanden
  B.quadOut(P(x0, floorY, -zw), P(x0, floorY, zw), P(x0, roofY, zw), P(x0, roofY, -zw), [1, 0, 0], WALL);          // achterwand
  const d = L.dash;
  B.box(d.x + sh, d.y + d.h / 2, 0, d.d, d.h, d.w, DARK);
  B.box(d.x + sh - 0.08, d.y + d.h + 0.02, 0, d.d * 0.7, 0.05, d.w, GREY);
  const b = L.binnacle;
  B.box(b.x + sh, b.y, b.z, b.d, b.h, b.w, GREY);
  const w = L.wheel;
  // stuurring recht gezet: vier dunne latjes en de naaf, kolom
  B.box(w.x + sh, w.y, w.z, 0.03, w.r * 2, 0.03, DARK, 0, 0, 0, w.tilt);
  B.box(w.x + sh, w.y, w.z, 0.03, 0.03, w.r * 2, DARK, 0, 0, 0, w.tilt);
  B.box(w.x + sh + 0.06, w.y - 0.2, w.z, 0.05, 0.3, 0.05, DARK);
  B.box(w.x + sh, w.y, w.z, 0.05, 0.05, 0.05, TRIM);
  const seatAt = (x, z, color) => {
    B.box(x, sy - 0.07, z, 0.5, 0.14, 0.5, color);
    B.box(x - 0.27, sy + 0.27, z, 0.1, 0.55, 0.48, color, 0, 0, 0, K.seatTilt);
    B.box(x - 0.3, sy + 0.62, z, 0.08, 0.16, 0.26, GREY);
  };
  for (const s of L.seats) seatAt(s.x, s.z, K.seatColor || SEAT);
  if (L.rear) {
    B.box(L.rear.x, L.rear.y - 0.07, 0, 0.5, 0.14, L.rear.w, SEAT);
    B.box(L.rear.x - 0.27, L.rear.y + 0.27, 0, 0.1, 0.55, L.rear.w, SEAT);
  }
  const c = L.console;
  B.box(c.x + sh, c.y, c.z, c.d, c.h, c.w, DARK);
  for (const e of K.extras) B.box(e.at[0] + (e.at[0] > seat.x + 0.2 ? sh : 0), e.at[1], e.at[2], e.b[0], e.b[1], e.b[2], e.color);
  return B.build();
}

function geometryFor(v) {
  const seat = vehicleSeat(v, true);
  const klasse = interiorKlasse(v);
  const key = [klasse, v.model.len, v.model.wid, seat.x.toFixed(2), seat.y.toFixed(2), seat.z.toFixed(2)].join('|');
  let g = geoCache.get(key);
  if (!g) { g = markShared(buildCabinGeometry(seat, v.model.len, v.model.wid, klasse)); geoCache.set(key, g); }
  return g;
}

// auto's, bestelbussen en vrachtwagens (geen bus: die heeft zijn eigen stoelen; geen wrak)
export const wantsCabin = (v) => !!v && hasCarInterior(v) && !v.isBus && !v.wrecked && !(v.model && v.model.name === 'midibus');

// Eén keer per frame: voertuigen binnen CABIN_R krijgen hun cabine (eerst gebouwd, daarna alleen zichtbaar
// of niet). meshes: scene3d vehicleMeshes (id -> mesh).
export function syncCabins(world, meshes, px, py) {
  for (const v of world.vehicles) {
    const mesh = meshes.get(v.id);
    if (!mesh) continue;
    let cab = mesh.userData.cabin;
    const near = Math.abs(v.x - px) < CABIN_R && Math.abs(v.y - py) < CABIN_R && wantsCabin(v);
    if (!near) { if (cab) cab.visible = false; continue; }
    if (!cab) {
      cab = new THREE.Mesh(geometryFor(v), cabinMaterial());
      cab.name = 'cabine';
      cab.renderOrder = 11;            // na de portieropening (vehicledoors3d.js, 10): die zet de diepte terug
      cab.userData.noBatch = true;
      (mesh.userData.body || mesh).add(cab);
      mesh.userData.cabin = cab;
    }
    // de binnenin-camera tekent zijn eigen interieur
    const inner = mesh.userData.interior;
    cab.visible = !(inner && inner.visible);
  }
}
