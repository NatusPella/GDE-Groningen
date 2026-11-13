// De cabine van een auto, bestelbus, vrachtwagen, trekker, helikopter, vliegtuig of machine
// van buiten gezien (#389, #442, #833, #847): vloer, binnenwanden, stoelen, achterbank,
// dashboard en stuur, en voor een gewone personenauto ook de dakhemel, de A-stijlen en de
// binnenspiegel, op de echte raamlijn en het echte dak van de romp (carBodyFit). Voor de
// cockpitklassen komt de indeling uit cockpitlayout.js: de trekker-cabine, de bel van de
// heli, de romp van de kist (halfbreedte 0,65, niet de spanwijdte) en de cabine van de
// maaidorser/laadmachine op cabinehoogte. Zo zie je door de ruiten en door een open portier
// een gevulde auto en geen lege schil. Eén samengevoegde geometrie per voertuigsoort, maat
// en detailniveau (gedeeld, markShared), één mesh per voertuig dat alleen van geometrie
// wisselt als de afstand een ander niveau vraagt: dichtbij het volle interieur, halfverwege
// zonder hemel, stijlen, spiegel en kleine extra's, ver alleen de vloer met donkere
// zitblokken en het dashboardblok. Wrakken krijgen een eigen, gedeelde wrakvariant (#847):
// verkoold, scheve stoelen en een scheef dashboard, zichtbaar door de ruiten omdat het
// glas van dat wrak opengezet wordt.
// De indeling komt uit carinteriorlayout.js/cockpitlayout.js (dezelfde maten als de
// binnenin-camera); die camera verbergt deze cabine als hij zijn eigen interieur laat zien.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { vehicleSeat } from './seating3d.js';
import { carBodyFit } from './models3d_vehicles.js';
import { hasCarInterior, interiorLayout, interiorKlasse, klasseStijl, wrakStijl, innerShell } from './carinteriorlayout.js';
import { isCockpitKlasse } from './cockpitlayout.js';

// Afstandstrap (#833): Chebyshev-afstand tot de speler (max |dx|, |dy|), de maat die syncCabins al gebruikte.
// 0 = dichtbij (vol interieur), 1 = midden, 2 = ver, -1 = voorbij de verste. Puur, zodat scripts/cabin_test.mjs
// en syncCabins dezelfde grens gebruiken.
export const CABIN_LOD_R = [14, 38, 64];   // m: tot 14 lod 0, tot 38 lod 1, tot 64 lod 2; verder weg niets
const CABIN_BUILD_BUDGET = 3;              // nieuwe geometrieën per syncCabins-aanroep (#833): geen hapering
export const CABIN_R = CABIN_LOD_R[2];     // oude naam: de verste afstand waarop een cabine nog te zien is
const FLOOR = 0x23262b, WALL = 0x383d44, LINING = 0x4a4f58, DARK = 0x23262b, GREY = 0x3a3f46, SEAT = 0x4a4f58, TRIM = 0x6a707a;
const WRECK_GLASS_OPACITY = 0.14;          // het glas van een wrak is gebarsten/weggeslagen: je kijkt erdoor naar binnen
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
// opts.naam: de modelnaam (voor de machines); leeg is goed voor de auto's.
export function buildCabinGeometry(seat, len, wid, klasse, romp = null, lod = 0, opts = null) {
  const naam = (opts && opts.naam) || '';
  const cockpit = isCockpitKlasse(klasse);
  const L = interiorLayout(seat, len, wid, cockpit ? null : romp, klasse, naam);
  const K = klasseStijl(klasse, L, seat);
  if (K.rear !== undefined) L.rear = K.rear;
  const B = new GeoBuilder(1);
  const S = innerShell(seat, len, wid, L, cockpit ? null : romp);
  const hw = S.hw, sy = seat.y, sh = S.sh;
  const floorY = S.floorY, roofY = S.roofY;
  const x0 = S.x0, x1 = S.x1 + sh;
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
  // buiten door de voorruit (#442). Alleen met een romp (auto's) of een eigen binnenhuid (cockpits, #847).
  if (romp || L.shell) {
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

// Wrakvariant (#847): het interieur van een uitgebrand voertuig, gedeeld per klasse, maat en
// niveau. Dezelfde binnenhuid, maar in roetkleuren, met een scheefgezakt dashboard, een
// verwrongen stoel, losse panelen op de vloer en scherpe glasranden; geen dakhemel (die is
// weggeschroeid), geen spiegel, geen klasse-extra's. De bijrijdersstoel is weg.
export function buildWreckCabinGeometry(seat, len, wid, klasse, romp = null, lod = 0, opts = null) {
  const naam = (opts && opts.naam) || '';
  const cockpit = isCockpitKlasse(klasse);
  const L = interiorLayout(seat, len, wid, cockpit ? null : romp, klasse, naam);
  const W = wrakStijl(klasse, L, seat);
  const B = new GeoBuilder(1);
  const S = innerShell(seat, len, wid, L, cockpit ? null : romp);
  const hw = S.hw, sy = seat.y;
  const floorY = S.floorY, roofY = S.roofY;
  const x0 = S.x0, x1 = S.x1;
  const zw = hw - 0.07;
  const P = (x, y, z) => [x, y, z];
  const vloer = () => B.quadOut(P(x0, floorY, -zw), P(x1, floorY, -zw), P(x1, floorY, zw), P(x0, floorY, zw), [0, 1, 0], W.soot);
  const d = L.dash;
  const scheef = 0.16; // het dashboard is van zijn ophanging gerukt en staat scheef
  if (lod >= 2) {
    vloer();
    B.box(d.x, d.y + d.h / 2 - 0.08, 0, d.d, d.h, d.w, W.ash, 0, 0, 0, scheef);
    for (const s of L.seats) B.box(s.x, sy + 0.1, s.z, 0.5, 0.4, 0.5, W.seatColor);
    return B.build();
  }
  vloer();
  for (const s of [-1, 1]) B.quadOut(P(x0, floorY, s * zw), P(x1, floorY, s * zw), P(x1, roofY - 0.12, s * zw), P(x0, roofY - 0.12, s * zw), [0, 0, -s], W.soot); // binnenwanden, onder de raamlijn
  B.quadOut(P(x0, floorY, -zw), P(x0, floorY, zw), P(x0, roofY, zw), P(x0, roofY, -zw), [1, 0, 0], W.soot);      // achterwand
  B.box(d.x, d.y + d.h / 2 - 0.08, 0, d.d, d.h, d.w, W.ash, 0, 0, 0, scheef);                                     // scheef dashboard
  B.box(d.x - 0.1, d.y + d.h - 0.04, 0, d.d * 0.7, 0.05, d.w, W.rust, 0, 0, 0, scheef);                          // verbrande rand
  const seatColor = W.seatColor;
  const scheveStoel = (x, z, kleur) => {
    B.box(x, sy - 0.07, z, 0.5, 0.14, 0.5, kleur, 0, 0, 0, W.seatScheef);         // zitting opzij gedraaid
    B.box(x - 0.27, sy + 0.26, z, 0.1, 0.55, 0.48, kleur, 0, 0, 0, W.seatTilt);   // rugleuning achterover
  };
  scheveStoel(L.seats[0].x, L.seats[0].z, seatColor);
  if (W.seatKwijt && L.seats.length > 1) B.box(L.seats[1].x, Math.max(floorY + 0.05, sy - 0.32), L.seats[1].z, 0.42, 0.1, 0.42, W.panel);
  else if (L.seats.length > 1) scheveStoel(L.seats[1].x, L.seats[1].z, seatColor);
  if (lod === 1) return B.build();
  // lod 0: brokstukken, glasranden en een dichtgeslagen gat in de hemel waar de hemel zat
  for (const p of W.brokstukken) B.box(p.at[0], p.at[1], p.at[2], p.b[0], p.b[1], p.b[2], p.color, 0, 0, 0, 0.3);
  // scherpe glasranden langs de raamlijn (enkelzijdig, dus van binnen en buiten te zien)
  const shard = (x, z, h) => {
    const a = P(x - 0.11, roofY - 0.02, z), b2 = P(x + 0.11, roofY - 0.02, z), c2 = P(x + 0.03, roofY - 0.02 + h, z);
    B.tri(a, b2, c2, 0x8fa4b0);
    B.tri(a, c2, b2, 0x8fa4b0);
  };
  for (const [x, h] of [[x0 + 0.35, 0.16], [x0 + 0.85, 0.22], [x1 - 0.45, 0.13]]) { shard(x, zw, h); shard(x, -zw, h); }
  return B.build();
}

// De modelnaam van een voertuig, als los hulpje voor de cache en de bouwers.
const naamVan = (v) => (v && v.model && v.model.name) || '';

// Gedeelde geometrie per (klasse, maat, stoelpositie, romp, niveau, wrak). Een niveau dat nog niet bestaat
// wordt alleen gebouwd als allowBuild aan staat (het budget van deze frame, #833); anders volgt null.
function geometryFor(v, lod, allowBuild) {
  const seat = vehicleSeat(v, true);
  const klasse = interiorKlasse(v);
  const cockpit = isCockpitKlasse(klasse);
  // voor een wrak geeft carBodyFit() niets terug; de raamlijn en het dak van dezelfde carrosserie
  // komen uit een ondiepe kopie zonder wrecked (#847)
  const romp = cockpit ? null : (v.wrecked ? carBodyFit({ ...v, wrecked: false }) : carBodyFit(v));
  const naam = naamVan(v);
  const key = [klasse, naam, v.model.len, v.model.wid, seat.x.toFixed(2), seat.y.toFixed(2), seat.z.toFixed(2),
    romp ? [romp.belt, romp.roof, romp.xA, romp.xB].map((n) => n.toFixed(2)).join(',') : '', lod, v.wrecked ? 'w' : ''].join('|');
  let g = geoCache.get(key);
  if (!g && allowBuild) {
    const opts = { naam };
    g = markShared(v.wrecked
      ? buildWreckCabinGeometry(seat, v.model.len, v.model.wid, klasse, romp, lod, opts)
      : buildCabinGeometry(seat, v.model.len, v.model.wid, klasse, romp, lod, opts));
    geoCache.set(key, g);
  }
  return g || null;
}

// Waar het stuur zit in de cabine (voertuiglokaal), voor het meedraaiende stuur van autointerieur.js; dezelfde
// verschuiving als de schil, zodat een korte neus het stuur niet door de voorkant duwt.
export function cabinWheelPose(seat, len, wid, klasse, romp = null, naam = '') {
  const cockpit = isCockpitKlasse(klasse);
  const L = interiorLayout(seat, len, wid, cockpit ? null : romp, klasse, naam);
  const K = klasseStijl(klasse, L, seat);
  const sh = cockpit ? 0 : -Math.max(0, L.dash.x + L.dash.d / 2 - (len / 2 - 0.12));
  const w = { ...L.wheel, ...K.wheel };
  return { x: w.x + sh, y: w.y, z: w.z, r: w.r, tilt: w.tilt };
}

// auto's, bestelbussen, vrachtwagens en de cockpitklassen (#847) tonen een cabine van buiten; de
// stadsbus heeft zijn eigen passagiersruimte en een wrak krijgt de wrakvariant (hieronder). Deze
// functie wordt ook door vehicledoors3d.js gebruikt voor de portieropening: een wrak hoort daar
// ook een (donkere, stencil-)opening te krijgen, zodat je door het losse portier het wrak ziet.
export const wantsCabin = (v) => !!v && hasCarInterior(v) && !v.isBus && !(v.model && v.model.name === 'midibus');
export const wantsWreckCabin = (v) => !!v && !!v.wrecked && wantsCabin(v);
export const wantsNormalCabin = (v) => !!v && !v.wrecked && wantsCabin(v);

// Het glas van een wrak openingzetten (#847): de ruiten zijn gebarsten of weggeslagen, zodat het
// kapotte interieur erdoor te zien is. De materialen zijn per voertuig nieuw (geen gedeeld
// materiaal), dus dit raakt geen andere auto's. Bij een reparatie zet restore het glas terug.
function glasMaterialen(mesh) {
  const uit = [];
  mesh.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? [o.material[1]] : [o.material];
    for (const m of mats) if (m && (Array.isArray(o.material) || m.transparent)) uit.push(m);
  });
  return uit;
}

function setWreckGlass(mesh, aan) {
  if (!!mesh.userData.wrakGlas === !!aan) return;
  mesh.userData.wrakGlas = !!aan;
  for (const m of glasMaterialen(mesh)) {
    if (aan) {
      if (!m.userData.wrakGlasOrigineel) m.userData.wrakGlasOrigineel = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite };
      m.transparent = true;
      m.opacity = WRECK_GLASS_OPACITY;
      m.depthWrite = false;
      m.needsUpdate = true;
    } else {
      const o = m.userData.wrakGlasOrigineel;
      if (!o) continue;
      m.transparent = o.transparent;
      m.opacity = o.opacity;
      m.depthWrite = o.depthWrite;
      delete m.userData.wrakGlasOrigineel;
      m.needsUpdate = true;
    }
  }
}

// Eén keer per frame: voertuigen binnen CABIN_LOD_R[2] krijgen hun cabine (eerst gebouwd, daarna alleen
// zichtbaar of op het juiste detailniveau). meshes: scene3d vehicleMeshes (id -> mesh). Per aanroep worden
// hooguit CABIN_BUILD_BUDGET nieuwe geometrieën gebouwd, zodat een rij geparkeerde auto's geen hapering
// geeft; wie nog niet gebouwd is blijft die ene frame verborgen (#833). Een wrak wisselt naar zijn eigen
// wrakgeometrie en houdt de normale cabine verborgen (#847).
export function syncCabins(world, meshes, px, py) {
  let budget = CABIN_BUILD_BUDGET;
  for (const v of world.vehicles) {
    const mesh = meshes.get(v.id);
    if (!mesh) continue;
    let cab = mesh.userData.cabin;
    // eerst de afstand (Chebyshev, zonder Math.hypot; Math.max maakt een NaN-positie meteen onzichtbaar)
    const dx = Math.abs(v.x - px), dy = Math.abs(v.y - py);
    const lod = cabinLodAt(Math.max(dx, dy));
    const wanted = wantsCabin(v);
    if (lod < 0 || !wanted) {
      if (cab) cab.visible = false;
      if (!wanted) setWreckGlass(mesh, false);
      continue;
    }
    // de binnenin-camera tekent zijn eigen interieur
    const inner = mesh.userData.interior;
    if (inner && inner.visible) { if (cab) cab.visible = false; continue; }
    const wreck = !!v.wrecked;
    if (!cab || mesh.userData.cabinLod !== lod || !!mesh.userData.cabinWreck !== wreck) {
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
      mesh.userData.cabinWreck = wreck;
      setWreckGlass(mesh, wreck);
    }
    cab.visible = true;
  }
}
