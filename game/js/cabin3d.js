// De cabine van een auto, bestelbus of vrachtwagen van buiten gezien (#389, #442, #833): vloer, binnenwanden,
// stoelen, achterbank, dashboard en stuur, en voor een gewone personenauto ook de dakhemel, de A-stijlen en
// de binnenspiegel, op de echte raamlijn en het echte dak van de romp (carBodyFit). Zo zie je door de ruiten
// en door een open portier een gevulde auto en geen lege schil. Eén samengevoegde geometrie per
// voertuigsoort, maat en detailniveau (gedeeld, markShared), één mesh per voertuig dat alleen van geometrie
// wisselt als de afstand een ander niveau vraagt: dichtbij het volle interieur, halfverwege zonder hemel,
// stijlen, spiegel en kleine extra's, ver alleen de vloer met donkere zitblokken en het dashboardblok.
// De indeling komt uit carinteriorlayout.js (dezelfde maten als de binnenin-camera); die camera verbergt
// deze cabine als hij zijn eigen interieur laat zien.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { vehicleSeat } from './seating3d.js';
import { carBodyFit } from './models3d_vehicles.js';
import { hasCarInterior, interiorLayout, interiorKlasse, klasseStijl } from './carinteriorlayout.js';

// Afstandstrap (#833): Chebyshev-afstand tot de speler (max |dx|, |dy|), de maat die syncCabins al gebruikte.
// 0 = dichtbij (vol interieur), 1 = midden, 2 = ver, -1 = voorbij de verste. Puur, zodat scripts/cabin_test.mjs
// en syncCabins dezelfde grens gebruiken.
export const CABIN_LOD_R = [14, 38, 64];   // m: tot 14 lod 0, tot 38 lod 1, tot 64 lod 2; verder weg niets
const CABIN_BUILD_BUDGET = 3;              // nieuwe geometrieën per syncCabins-aanroep (#833): geen hapering
export const CABIN_R = CABIN_LOD_R[2];     // oude naam: de verste afstand waarop een cabine nog te zien is
const FLOOR = 0x23262b, WALL = 0x383d44, LINING = 0x4a4f58, DARK = 0x23262b, GREY = 0x3a3f46, SEAT = 0x4a4f58, TRIM = 0x6a707a;
const geoCache = new Map();
let material = null;

export function cabinLodAt(afstand) {
  if (!(afstand >= 0)) return -1;           // NaN of oneindig: geen cabine
  if (afstand < CABIN_LOD_R[0]) return 0;
  if (afstand < CABIN_LOD_R[1]) return 1;
  if (afstand < CABIN_LOD_R[2]) return 2;
  return -1;
}

function cabinMaterial() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

// seat: vehicleSeat(v, true); romp: carBodyFit(v) of null; pure genoeg om in Node te bouwen (scripts/cabin_test.mjs).
// lod 0 = het volle interieur, 1 = midden (geen hemel/stijlen/spiegel/kleine extra's), 2 = ver (vloer, donkere
// zitblokken en het dashboardblok); elk niveau is één samengevoegde geometrie.
export function buildCabinGeometry(seat, len, wid, klasse, romp = null, lod = 0) {
  const L = interiorLayout(seat, len, wid, romp);
  const K = klasseStijl(klasse, L, seat);
  if (K.rear !== undefined) L.rear = K.rear;
  const B = new GeoBuilder(1);
  const hw = wid / 2, sy = seat.y;
  const floorY = Math.max(0.3, sy - 0.34);
  // de schil blijft onder de raamlijn: het plaatwerk van motorkap en kofferdek ligt lager dan het dak, dus een hoge wand
  // zou erbovenuit steken. Met de romp weten we de echte raamlijn en komt de wand tot precies onder de ruit. Door de
  // ruiten zie je stoelen, stuur, dashboard en de binnenspiegel, door een open portier ook de wand (#442).
  const roofY = romp ? romp.belt - 0.02 : sy + 0.42;
  // een korte neus (vrachtwagen, cabine boven de as) laat het dashboard niet door de voorkant steken: de voorste onderdelen schuiven terug
  const sh = -Math.max(0, L.dash.x + L.dash.d / 2 - (len / 2 - 0.12));
  const x1 = L.dash.x + L.dash.d / 2 - 0.05 + sh;
  // zonder achterbank (bestelbus, ambulance, sportwagen) houdt de schil bij de wand achter de stoelen op,
  // niet bij de achterruit: het laadruim of de rolbeugel hoort er niet bij
  const x0 = (L.rear ? L.rear.x - 0.45 : (romp ? seat.x - 0.55 : L.roof.x0 - 0.1));
  const zw = hw - 0.07;
  // de schil is enkelzijdig en kijkt naar binnen: van buiten zie je alleen de verste wand (door een open portier),
  // de wand aan jouw kant valt weg (achterkant), zodat de stoelen te zien zijn
  const P = (x, y, z) => [x, y, z];
  const vloer = () => B.quadOut(P(x0, floorY, -zw), P(x1, floorY, -zw), P(x1, floorY, zw), P(x0, floorY, zw), [0, 1, 0], FLOOR);
  const d = L.dash;
  if (lod >= 2) {
    // ver: alleen de vloer, donkere zitblokken en het dashboardblok. Door de ruiten leest dat nog als een
    // gevulde auto; dit is het goedkoopste niveau en er hangt geen enkel klein onderdeel aan.
    vloer();
    B.box(d.x + sh, d.y + d.h / 2, 0, d.d, d.h, d.w, DARK);
    for (const s of L.seats) B.box(s.x, sy + 0.12, s.z, 0.5, 0.5, 0.5, DARK);
    if (L.rear) B.box(L.rear.x, L.rear.y + 0.12, 0, 0.5, 0.5, L.rear.w, DARK);
    return B.build();
  }
  vloer();
  for (const s of [-1, 1]) B.quadOut(P(x0, floorY, s * zw), P(x1, floorY, s * zw), P(x1, roofY, s * zw), P(x0, roofY, s * zw), [0, 0, -s], WALL); // binnenwanden
  B.quadOut(P(x0, floorY, -zw), P(x0, floorY, zw), P(x0, roofY, zw), P(x0, roofY, -zw), [1, 0, 0], WALL);          // achterwand
  B.box(d.x + sh, d.y + d.h / 2, 0, d.d, d.h, d.w, DARK);                                                          // dashboard
  B.box(d.x + sh - 0.08, d.y + d.h + 0.02, 0, d.d * 0.7, 0.05, d.w, GREY);                                        // bovenkant dashboard
  const seatColor = K.seatColor || SEAT;
  if (lod === 1) {
    // midden: voorstoelen en achterbank als zitting + rug, zonder hoofdsteun of stoelpoot; de console blijft.
    // Geen hemel, stijlen, spiegel, instrumentenkap of klasse-extra's: die zie je op deze afstand niet meer.
    for (const s of L.seats) {
      B.box(s.x, sy - 0.07, s.z, 0.5, 0.14, 0.5, seatColor);
      B.box(s.x - 0.27, sy + 0.27, s.z, 0.1, 0.55, 0.48, seatColor, 0, 0, 0, K.seatTilt);
    }
    if (L.rear) {
      const rear = K.rearColor || SEAT;
      B.box(L.rear.x, L.rear.y - 0.07, 0, 0.5, 0.14, L.rear.w, rear);
      B.box(L.rear.x - 0.27, L.rear.y + 0.27, 0, 0.1, 0.55, L.rear.w, rear);
    }
    const c = L.console;
    B.box(c.x + sh, c.y, c.z, c.d, c.h, c.w, DARK);
    return B.build();
  }
  // lod 0: het volle interieur (#389, #442), van dichtbij door de ruiten en een open portier te zien
  const b = L.binnacle;
  B.box(b.x + sh, b.y, b.z, b.d, b.h, b.w, GREY);
  const w = { ...L.wheel, ...K.wheel };
  // de stuurring en spaken zijn een eigen, meedraaiend onderdeel (autointerieur.js, #442); hier de kolom en de naaf
  B.box(w.x + sh + 0.06, w.y - 0.2, w.z, 0.05, 0.3, 0.05, DARK);
  B.box(w.x + sh, w.y, w.z, 0.05, 0.05, 0.05, TRIM);
  const seatAt = (x, z, color) => {
    B.box(x, sy - 0.07, z, 0.5, 0.14, 0.5, color);
    B.box(x - 0.27, sy + 0.27, z, 0.1, 0.55, 0.48, color, 0, 0, 0, K.seatTilt);
    B.box(x - 0.3, sy + 0.62, z, 0.08, 0.16, 0.26, GREY);
  };
  for (const s of L.seats) seatAt(s.x, s.z, seatColor);
  if (L.rear) {
    // de achterbank in de bekleding van deze klasse: een taxi heeft donker leer, een politieauto hard plastic (#442)
    const rear = K.rearColor || SEAT;
    B.box(L.rear.x, L.rear.y - 0.07, 0, 0.5, 0.14, L.rear.w, rear);
    B.box(L.rear.x - 0.27, L.rear.y + 0.27, 0, 0.1, 0.55, L.rear.w, rear);
  }
  const c = L.console;
  B.box(c.x + sh, c.y, c.z, c.d, c.h, c.w, DARK);
  for (const e of K.extras) B.box(e.at[0] + (e.at[0] > seat.x + 0.2 ? sh : 0), e.at[1], e.at[2], e.b[0], e.b[1], e.b[2], e.color);
  // dakhemel, A-stijlen en de binnenspiegel: de binnenkant van een gewone personenauto leest ook van
  // buiten door de voorruit (#442). Alleen met een romp, want alleen dan weten we het echte dak.
  if (romp) {
    const R = L.roof;
    B.box((R.x0 + R.x1) / 2, R.y, 0, R.x1 - R.x0, 0.04, R.w, LINING);
    for (const p of R.pillars) {
      const dx = p.x1 - p.x0, dy = p.y1 - p.y0, pl = Math.hypot(dx, dy);
      B.box((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, p.z, pl, 0.05, 0.05, LINING, 0, 0, 0, Math.atan2(dy, dx));
    }
    const m = L.mirror;
    B.box(m.x, m.y, m.z, 0.03, 0.07, 0.2, DARK);
    B.box(m.x - 0.018, m.y, m.z, 0.006, 0.05, 0.16, 0x9fb4d8);   // spiegelglas, naar de bestuurder
    B.box(m.x, (m.y + R.y) / 2, m.z, 0.025, Math.max(0.04, R.y - m.y), 0.03, GREY);
  }
  return B.build();
}

// Gedeelde geometrie per (klasse, maat, stoelpositie, romp, niveau). Een niveau dat nog niet bestaat wordt
// alleen gebouwd als allowBuild aan staat (het budget van deze frame, #833); anders volgt null.
function geometryFor(v, lod, allowBuild) {
  const seat = vehicleSeat(v, true);
  const klasse = interiorKlasse(v);
  const romp = carBodyFit(v);
  const key = [klasse, v.model.len, v.model.wid, seat.x.toFixed(2), seat.y.toFixed(2), seat.z.toFixed(2),
    romp ? [romp.belt, romp.roof, romp.xA, romp.xB].map((n) => n.toFixed(2)).join(',') : '', lod].join('|');
  let g = geoCache.get(key);
  if (!g && allowBuild) {
    g = markShared(buildCabinGeometry(seat, v.model.len, v.model.wid, klasse, romp, lod));
    geoCache.set(key, g);
  }
  return g || null;
}

// Waar het stuur zit in de cabine (voertuiglokaal), voor het meedraaiende stuur van autointerieur.js; dezelfde
// verschuiving als de schil, zodat een korte neus het stuur niet door de voorkant duwt.
export function cabinWheelPose(seat, len, wid, klasse, romp = null) {
  const L = interiorLayout(seat, len, wid, romp);
  const K = klasseStijl(klasse, L, seat);
  const sh = -Math.max(0, L.dash.x + L.dash.d / 2 - (len / 2 - 0.12));
  const w = { ...L.wheel, ...K.wheel };
  return { x: w.x + sh, y: w.y, z: w.z, r: w.r, tilt: w.tilt };
}

// auto's, bestelbussen en vrachtwagens (geen bus: die heeft zijn eigen stoelen; geen wrak)
export const wantsCabin = (v) => !!v && hasCarInterior(v) && !v.isBus && !v.wrecked && !(v.model && v.model.name === 'midibus');

// Eén keer per frame: voertuigen binnen CABIN_LOD_R[2] krijgen hun cabine (eerst gebouwd, daarna alleen
// zichtbaar of op het juiste detailniveau). meshes: scene3d vehicleMeshes (id -> mesh). Per aanroep worden
// hooguit CABIN_BUILD_BUDGET nieuwe geometrieën gebouwd, zodat een rij geparkeerde auto's geen hapering
// geeft; wie nog niet gebouwd is blijft die ene frame verborgen (#833).
export function syncCabins(world, meshes, px, py) {
  let budget = CABIN_BUILD_BUDGET;
  for (const v of world.vehicles) {
    const mesh = meshes.get(v.id);
    if (!mesh) continue;
    let cab = mesh.userData.cabin;
    // eerst de afstand (Chebyshev, zonder Math.hypot; Math.max maakt een NaN-positie meteen onzichtbaar)
    const dx = Math.abs(v.x - px), dy = Math.abs(v.y - py);
    const lod = cabinLodAt(Math.max(dx, dy));
    if (lod < 0 || !wantsCabin(v)) { if (cab) cab.visible = false; continue; }
    // de binnenin-camera tekent zijn eigen interieur
    const inner = mesh.userData.interior;
    if (inner && inner.visible) { if (cab) cab.visible = false; continue; }
    if (!cab || mesh.userData.cabinLod !== lod) {
      const cached = geoCache.size;
      const g = geometryFor(v, lod, budget > 0);
      if (!g) { if (cab) cab.visible = false; continue; }   // nog geen budget voor deze geometrie: één frame verborgen
      if (geoCache.size > cached) budget--;                 // er is echt een nieuwe geometrie gebouwd
      if (!cab) {
        cab = new THREE.Mesh(g, cabinMaterial());
        cab.name = 'cabine';
        cab.renderOrder = 11;            // na de portieropening (vehicledoors3d.js, 10): die zet de diepte terug
        cab.castShadow = false;          // het interieur werpt geen schaduw: dat kost een extra shadow-pass per auto
        cab.userData.noBatch = true;
        (mesh.userData.body || mesh).add(cab);
        mesh.userData.cabin = cab;
      } else cab.geometry = g;           // zelfde mesh, alleen de geometrie wisselt (#833)
      mesh.userData.cabinLod = lod;
    }
    cab.visible = true;
  }
}
