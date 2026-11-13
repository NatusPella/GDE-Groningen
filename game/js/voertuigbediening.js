// De bediening van voertuigen die je ziet en voelt (#442): een stuur dat meedraait op fiets, step en brommer,
// de ploeg en de aftakas van de trekker (Z en X; de cabine zelf komt sinds #847 uit de cockpit-interieurs),
// een roer dat meedraait op een boot en een stuurwiel op een open boot zonder roef (de stuurhutten van boten
// met een roef komen uit bootinterieur3d.js). Alles wordt pas gebouwd binnen
// LOD_R van de speler, met gedeelde geometrie; verder weg valt het weg of staat de gewone carrosserie. Het deel zonder
// THREE (de toestand van ploeg en aftakas) is puur genoeg voor scripts/voertuigbediening_test.mjs.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { stuurOverlay, boatHullProfile } from './models3d_vehicles.js';
import { boatKind, boatHasCabin } from './boattypes.js';
import { heeftBootInterieur } from './bootinterieur.js';
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

function bereidTrekker() {
  // De cabine met stoel, dashboard en stuur komt sinds #847 uit de cockpit-interieurs (cabin3d +
  // carinterior); hier blijven alleen de werktuigprops (ploeg en aftakas) over. Geen tweede
  // stuur of cabine op de mesh.
  return { cabine: null, stuur: null };
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
  // Een stuurhut met een eigen interieur (bootinterieur3d.js) tekent zijn eigen stuurwiel; alleen
  // een open boot zonder roef houdt hier het losse stuurwiel (#847).
  if (pose && !heeftBootInterieur(v)) { stuur = bouwStuurwiel(pose, materiaal()); mesh.add(stuur); }
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
        if (!vb.tr) vb.tr = bereidTrekker();
        if (vb.tr.cabine) vb.tr.cabine.visible = true;
        if (vb.tr.stuur) vb.tr.stuur.visible = true;
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
      if (vb.tr.stuur) draaiStuurwiel(vb.tr.stuur, steer, dt);
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
  if (vb.tr) {
    if (vb.tr.cabine) vb.tr.cabine.visible = false;
    if (vb.tr.stuur) vb.tr.stuur.visible = false;
  }
  if (vb.wg) vb.wg.visible = false;
  if (vb.bt) {
    if (vb.bt.roer) vb.bt.roer.visible = false;
    if (vb.bt.stuur) vb.bt.stuur.visible = false;
  }
}
