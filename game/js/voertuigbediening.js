// De bediening van voertuigen die je ziet en voelt (#442): een stuur dat meedraait op fiets, step en brommer, een
// cabine met stoel en stuur in de trekker, een ploeg en een aftakas die je zelf bedient (Z en X), een roer dat meedraait
// op een boot en een stuurwiel op de rondvaartboot, de sloep en de binnenvaartbrug. Alles wordt pas gebouwd binnen
// LOD_R van de speler, met gedeelde geometrie; verder weg valt het weg of staat de gewone carrosserie. Het deel zonder
// THREE (de toestand van ploeg en aftakas) is puur genoeg voor scripts/voertuigbediening_test.mjs.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { vehicleSeat } from './seating3d.js';
import { stuurOverlay, tractorCab, boatHullProfile } from './models3d_vehicles.js';
import { boatKind, boatHasCabin } from './boattypes.js';
import { bouwStuurwiel, draaiStuurwiel } from './autointerieur.js';

export const LOD_R = 25;                           // m: verder weg komt er niets bij
export const WERKTUIG_TOETS = { ploeg: 'z', aftakas: 'x' };
const MAX_STUUR = 0.5;                             // rad: zoals de voorwielen in updateVehicleWheelSpin

// --- de toestand van het werktuig (puur) -------------------------------------------

export function nieuwWerktuig() {
  return { gekoppeld: false, omlaag: false, aftakas: false, hoogte: 0, fase: 0 };
}

// Een knop: 'ploeg' (aankoppelen en omlaag, daarna omhoog en omlaag) of 'aftakas' (aan of uit). Geeft de melding.
export function werktuigKnop(st, knop) {
  if (knop === 'ploeg') {
    if (!st.gekoppeld) { st.gekoppeld = true; st.omlaag = true; return 'Ploeg aangekoppeld en omlaag.'; }
    st.omlaag = !st.omlaag;
    return st.omlaag ? 'Ploeg omlaag.' : 'Ploeg omhoog.';
  }
  if (knop === 'aftakas') {
    st.aftakas = !st.aftakas;
    return st.aftakas ? 'Aftakas aan.' : 'Aftakas uit.';
  }
  return '';
}

// Eén stap: de ploeg zakt of stijgt vloeiend (hoogte 1 = omlaag), de aftakas draait door
export function werktuigStap(st, dt) {
  const doel = st.gekoppeld && st.omlaag ? 1 : 0;
  st.hoogte += (doel - st.hoogte) * Math.min(1, dt * 4);
  if (Math.abs(doel - st.hoogte) < 0.002) st.hoogte = doel;
  if (st.aftakas) st.fase = (st.fase + dt * 14) % (Math.PI * 2);
}

export const isTrekker = (v) => !!v && !!v.model && v.model.name === 'tractor';

// Van player.js, voor het voertuig van de speler: Z en X op de trekker. De melding gaat naar world.addMessage.
export function bedienTrekker(v, input, world) {
  if (!isTrekker(v) || v.disabled || v.wrecked || !input || !input.wasPressed) return;
  const knop = input.wasPressed(WERKTUIG_TOETS.ploeg) ? 'ploeg' : input.wasPressed(WERKTUIG_TOETS.aftakas) ? 'aftakas' : null;
  if (!knop) return;
  const st = v.werktuig || (v.werktuig = nieuwWerktuig());
  const tekst = werktuigKnop(st, knop);
  if (tekst && world && world.addMessage) world.addMessage(tekst, 2, { kind: 'tip', key: 'trekker-' + knop });
}

// --- geometrie (gedeeld) -------------------------------------------------------------

const geoCache = new Map();
let matGedeeld = null;
const materiaal = () => {
  if (!matGedeeld) {
    matGedeeld = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x181a1e });
    matGedeeld.userData.shared = true;
  }
  return matGedeeld;
};
const gedeeld = (key, bouw) => {
  let g = geoCache.get(key);
  if (!g) { g = markShared(bouw()); geoCache.set(key, g); }
  return g;
};

// De ploeg achter de trekker, om het koppelpunt (oorsprong): balk, dwarsbalk, drie scharen met een punt
function ploegGeometrie() {
  return gedeeld('ploeg', () => {
    const B = new GeoBuilder(1);
    B.box(-0.9, 0, 0, 1.8, 0.12, 0.14, 0x7b8085);
    B.box(-1.5, -0.12, 0, 0.12, 0.12, 1.3, 0x5d6166);
    for (let k = 0; k < 3; k++) {
      const z = -0.5 + k * 0.5, x = -1.25 - k * 0.12;
      B.box(x, -0.22, z, 0.1, 0.3, 0.1, 0x5d6166);
      B.box(x - 0.08, -0.5, z, 0.55, 0.42, 0.05, 0xe2e5e8, 0, 0, 0.5, 0);
      B.box(x + 0.1, -0.72, z, 0.28, 0.06, 0.08, 0x3a3d40);
    }
    B.box(-1.62, -0.45, 0.7, 0.05, 0.4, 0.05, 0x3a3d40);
    return B.build();
  });
}
// De aftakas: een gele schacht met een vleugel, zodat je hem ziet draaien
function aftakasGeometrie() {
  return gedeeld('aftakas', () => {
    const B = new GeoBuilder(1);
    B.box(0, 0, 0, 0.9, 0.05, 0.05, 0x8a8e92);
    B.box(0, 0.05, 0, 0.9, 0.035, 0.14, 0xd8a31c);
    return B.build();
  });
}
// De cabine van de trekker: stoel, stuurkolom, dashboard en een versnellingshendel (zonder stuurwiel)
function trekkerCabineGeometrie(seat, len) {
  return gedeeld(`trekkercabine|${len}`, () => {
    const B = new GeoBuilder(1);
    const sx = seat.x, sy = seat.y, sz = seat.z, SEAT = 0x2b2d31;
    B.box(sx, sy - 0.08, sz, 0.5, 0.16, 0.5, SEAT);
    B.box(sx - 0.27, sy + 0.3, sz, 0.1, 0.62, 0.48, SEAT, 0, 0, 0, 0.12);
    B.box(sx + 0.62, sy + 0.18, sz, 0.2, 0.44, 0.95, 0x23262b);
    B.box(sx + 0.55, sy + 0.42, sz, 0.12, 0.06, 0.8, 0x3a3f46);
    B.box(sx + 0.5, sy + 0.32, sz, 0.06, 0.34, 0.06, 0x23262b, 0, 0, 0, 0.9);
    B.box(sx + 0.3, sy + 0.12, sz + 0.42, 0.06, 0.4, 0.06, 0xd8a31c, 0, 0, 0, -0.25);
    return B.build();
  });
}

// --- per voertuig, dichtbij ---------------------------------------------------------

// de naam van het soort waar dit voertuig onder valt (kort, voor de lus)
function soortVan(v) {
  if (v.isBoat) return 'boot';
  if (v.isBike) return v.model.cargo ? null : 'fiets';
  if (v.isScooter) return v.model.motorbike || v.model.geared ? null : 'scooter';
  if (v.model && v.model.name === 'tractor') return 'trekker';
  if (v.model && v.model.name === 'quad') return 'quad';
  return null;
}

function zetVoorwielen(ud, indices) {
  if (ud.frontWheels || !ud.wheels) return;
  const fw = indices.map((i) => ud.wheels[i]).filter(Boolean);
  if (fw.length) ud.frontWheels = fw;
}

function bereidStuurstang(mesh) {
  const ud = mesh.userData;
  const spec = ud.stuurSpec;
  const ov = stuurOverlay(spec);
  if (!ov) return null;
  const orig = spec.body.geometry;
  const stuur = new THREE.Mesh(ov.stuur, spec.body.material);
  stuur.name = 'stuurstang';
  stuur.position.set(ov.px * ov.sx, 0, 0);
  stuur.scale.x = ov.sx;
  mesh.add(stuur);
  return { orig, zonder: ov.zonder, stuur, body: spec.body };
}

function bereidTrekker(mesh, v) {
  const seat = vehicleSeat(v, true);
  const cab = tractorCab(v.model.len);
  const cabine = new THREE.Mesh(trekkerCabineGeometrie(seat, v.model.len), materiaal());
  cabine.name = 'trekkercabine';
  mesh.add(cabine);
  const stuur = bouwStuurwiel({ x: seat.x + 0.42, y: seat.y + 0.5, z: seat.z, r: 0.2, tilt: 0.9 }, materiaal());
  mesh.add(stuur);
  return { cabine, stuur, cab };
}

function bouwWerktuigGroep(len) {
  const g = new THREE.Group();
  g.name = 'werktuig';
  g.position.set(-len / 2 + 0.2, 0.75, 0);
  const ploeg = new THREE.Mesh(ploegGeometrie(), materiaal());
  const as = new THREE.Mesh(aftakasGeometrie(), materiaal());
  as.position.set(-0.45, -0.07, 0);
  g.add(ploeg, as);
  g.userData.as = as;
  return g;
}

const ROER_SOORTEN = new Set(['sloep', 'rondvaart', 'binnenvaart', 'sleper', 'zeeschip', 'rubberboot']);
function bereidBoot(mesh, v) {
  const len = v.model.len, hl = len / 2, wid = v.model.wid;
  const kind = boatKind(v);
  // kano, kajak, sup, waterfiets, acht en skûtsje hebben geen (los) roer: die sturen met peddel, voeten of hun eigen roer
  if (!ROER_SOORTEN.has(kind)) return { roer: null, stuur: null };
  // roer: een blad achter de spiegel, om een stijl, draait met het sturen
  const s = Math.min(1.2, 0.2 + len * 0.04);
  const roer = new THREE.Group();
  roer.name = 'roer';
  roer.position.set(-hl - 0.02, 0.35, 0);
  const blad = new THREE.Mesh(gedeeld(`roer|${s.toFixed(2)}`, () => {
    const B = new GeoBuilder(1);
    B.box(-s * 0.3, -s * 0.2, 0, s * 0.6, s * 0.9, 0.05, 0x23262b);
    B.box(0, 0.05, 0, 0.05, s * 0.5, 0.05, 0x3a3f46);
    return B.build();
  }), materiaal());
  roer.add(blad);
  mesh.add(roer);
  let pose = null;
  if (kind === 'rondvaart') pose = { x: -hl + 1.04, y: 1.0, z: 0, r: 0.13, tilt: 0.45 };
  else if (kind === 'sloep' && !boatHasCabin(v)) pose = { x: hl * 0.05 - 0.24, y: 0.86, z: wid * 0.18, r: 0.1, tilt: 0.5 };
  else if (kind === 'binnenvaart') {
    const dek = boatHullProfile(kind, len, wid).mid;
    pose = { x: -hl + 3.6 + 1.7, y: dek + 1.0, z: 0, r: 0.25, tilt: 0.5 };
  }
  let stuur = null;
  if (pose) { stuur = bouwStuurwiel(pose, materiaal()); mesh.add(stuur); }
  return { roer, stuur };
}

// Eén keer per frame, na syncCabins. meshes: scene3d vehicleMeshes (id -> mesh).
export function syncVoertuigBediening(world, meshes, px, py, dt) {
  for (const v of world.vehicles) {
    const mesh = meshes.get(v.id);
    if (!mesh) continue;
    const ud = mesh.userData;
    const soort = ud.vbSoort !== undefined ? ud.vbSoort : (ud.vbSoort = soortVan(v));
    if (!soort) continue;
    const near = !v.wrecked && Math.abs(v.x - px) < LOD_R && Math.abs(v.y - py) < LOD_R;
    let vb = ud.vb;
    if (!near) {
      if (vb && vb.aan) uitDeBuurt(ud, vb);
      continue;
    }
    if (!vb) vb = ud.vb = { aan: false };
    if (!vb.aan) {
      vb.aan = true;
      if (soort === 'fiets' || soort === 'scooter') {
        zetVoorwielen(ud, [0]);
        if (vb.sw === undefined) vb.sw = bereidStuurstang(mesh);
        if (vb.sw) { vb.sw.body.geometry = vb.sw.zonder; vb.sw.stuur.visible = true; }
      } else if (soort === 'trekker') {
        zetVoorwielen(ud, [0, 2]);
        if (!vb.tr) vb.tr = bereidTrekker(mesh, v);
        vb.tr.cabine.visible = true; vb.tr.stuur.visible = true;
      } else if (soort === 'quad') zetVoorwielen(ud, [0, 2]);
      else if (soort === 'boot') {
        if (!vb.bt) vb.bt = bereidBoot(mesh, v);
        if (vb.bt.roer) vb.bt.roer.visible = true;
        if (vb.bt.stuur) vb.bt.stuur.visible = true;
      }
    }
    // per frame
    const steer = v.steer || 0;
    if (vb.sw) {
      if (vb.sw.body.geometry !== vb.sw.zonder && vb.sw.body.geometry !== vb.sw.orig) { vb.sw.stuur.visible = false; continue; }
      const fw = ud.frontWheels && ud.frontWheels[0];
      vb.sw.stuur.rotation.y = fw ? fw.rotation.y : -steer * MAX_STUUR;
    }
    if (vb.tr) {
      draaiStuurwiel(vb.tr.stuur, steer, dt);
      const st = v.werktuig;
      let wg = vb.wg;
      if (st && st.gekoppeld && !wg) { wg = vb.wg = bouwWerktuigGroep(v.model.len); mesh.add(wg); }
      if (st && wg) {
        werktuigStap(st, dt);
        wg.visible = st.gekoppeld;
        wg.rotation.z = -(1 - st.hoogte) * 0.65;
        wg.userData.as.rotation.x = st.fase;
      }
    }
    if (vb.bt) {
      if (vb.bt.roer) vb.bt.roer.rotation.y = -steer * 0.6;
      if (vb.bt.stuur) draaiStuurwiel(vb.bt.stuur, steer, dt);
    }
  }
}

// Een voertuig dat te ver weg staat: de gewone carrosserie terug en de extra onderdelen uit beeld
function uitDeBuurt(ud, vb) {
  vb.aan = false;
  if (vb.sw) {
    if (vb.sw.body.geometry === vb.sw.zonder) vb.sw.body.geometry = vb.sw.orig;
    vb.sw.stuur.visible = false;
  }
  if (vb.tr) { vb.tr.cabine.visible = false; vb.tr.stuur.visible = false; }
  if (vb.wg) vb.wg.visible = false;
  if (vb.bt) {
    if (vb.bt.roer) vb.bt.roer.visible = false;
    if (vb.bt.stuur) vb.bt.stuur.visible = false;
  }
}
