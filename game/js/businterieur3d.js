// De passagiersruimte van de bus in beeld (#444, #442): stoelen, haltestangen, handrail en reizigers die zitten of staan,
// door de ramen en de open deuren te zien en bij de binnenin-camera (V). De maten komen uit businterieur.js (met
// tests). Alleen voor bussen dichtbij gebouwd (LOD, INT_R) en de geometrie is gedeeld: één mesh per busmaat voor de
// inrichting, en per maat en aantal reizigers één voor de mensen (blokken van 4). Meldt zich in main.js als kind.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { busInterieur, bezetting, ruimteReizigers, GANG } from './businterieur.js';

export const INT_R = 18;          // m: verder weg is de binnenruimte niet te zien
const STOEL = 0x2e5d8a, STOEL_RUG = 0x264d73, STANG = 0xd9b026, DONKER = 0x23262b;
const JASSEN = [0xc0553d, 0x4b7a5a, 0x7a5aa6, 0xd2a04a, 0x3d6e9e, 0x8a8f95, 0xa65a7a, 0x5a8f8a];
const HUIDEN = [0xe8c4a0, 0xc99a74, 0x8d5b3a, 0xf0d2b4];
const geoCache = new Map();
let material = null;

function mat() {
  if (!material) {
    material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x20232a });
    material.userData.shared = true;
  }
  return material;
}

const key = (v) => `${v.model.len}|${v.model.wid}|${v.model.trailer || 0}`;
const layoutOf = (v) => busInterieur(v.model.len, v.model.wid, { trailer: v.model.trailer || 0 });

// De inrichting: stoelen, stangen en een handrail. Gedeeld per maat.
export function buildInrichting(L) {
  const B = new GeoBuilder(1);
  const f = L.floor;
  for (const s of L.seats) {
    B.box(s.x, f + 0.27, s.z, 0.46, 0.08, 0.42, STOEL);                     // zitting
    B.box(s.x - 0.22, f + 0.58, s.z, 0.08, 0.5, 0.42, STOEL_RUG);           // rug
    B.box(s.x, f + 0.12, s.z, 0.42, 0.24, 0.1, DONKER);                     // poot
  }
  for (const p of L.poles) B.box(p.x, f + 0.95, p.z, 0.035, 1.9, 0.035, STANG);
  for (const z of L.rail.z) B.box((L.rail.x0 + L.rail.x1) / 2, L.rail.y, z, Math.abs(L.rail.x0 - L.rail.x1), 0.035, 0.035, STANG);
  B.box((L.rail.x0 + L.rail.x1) / 2, f + 0.01, 0, Math.abs(L.rail.x0 - L.rail.x1), 0.02, GANG * 2, DONKER); // loper in het gangpad
  return B.build();
}

// De reizigers: een romp en een hoofd, zittend of staand; kleuren per plek vast.
export function buildReizigers(L, n) {
  const B = new GeoBuilder(1);
  const f = L.floor;
  const { zit, sta } = bezetting(L, n);
  const kleur = (i) => JASSEN[(i * 5 + 3) % JASSEN.length];
  const huid = (i) => HUIDEN[(i * 3 + 1) % HUIDEN.length];
  zit.forEach((idx, i) => {
    const s = L.seats[idx];
    B.box(s.x - 0.05, f + 0.62, s.z, 0.26, 0.5, 0.36, kleur(idx));        // romp
    B.box(s.x + 0.1, f + 0.4, s.z, 0.34, 0.16, 0.34, DONKER);             // bovenbenen
    B.box(s.x - 0.04, f + 1.0, s.z, 0.2, 0.2, 0.2, huid(idx));            // hoofd
  });
  sta.forEach((idx, i) => {
    const s = L.stand[idx];
    B.box(s.x, f + 0.45, s.z, 0.22, 0.9, 0.3, DONKER);                    // benen
    B.box(s.x, f + 1.15, s.z, 0.26, 0.55, 0.38, kleur(idx + 7));          // romp
    B.box(s.x, f + 1.6, s.z, 0.2, 0.2, 0.2, huid(idx + 2));               // hoofd
  });
  return B.build();
}

function inrichtingGeo(v) {
  const k = 'i|' + key(v);
  let g = geoCache.get(k);
  if (!g) { g = markShared(buildInrichting(layoutOf(v))); geoCache.set(k, g); }
  return g;
}

function reizigersGeo(v, n) {
  const k = `r|${key(v)}|${n}`;
  let g = geoCache.get(k);
  if (!g) { g = markShared(buildReizigers(layoutOf(v), n)); geoCache.set(k, g); }
  return g;
}

const bucket = (n) => Math.min(48, Math.ceil(n / 4) * 4);

// Aantal reizigers aan boord voor het beeld: de lopende rit, anders een vast getal per bus.
export function reizigersAanBoord(v) {
  const r = v.busBediend && v.busBediend.ride;
  return r && !r.done && !r.failed ? r.onBoard : ruimteReizigers(v.id);
}

function updateInterieur(dt, w) {
  const p = w.player;
  for (const v of w.vehicles) {
    if (!v.isBus || v.wrecked || !v.model || v.model.name !== 'bus') continue; // de midibus heeft andere deuren en blijft leeg
    const mesh = getVehicleMesh(v.id);
    if (!mesh) continue;
    const ud = mesh.userData;
    const dichtbij = Math.abs(v.x - p.x) < INT_R && Math.abs(v.y - p.y) < INT_R;
    if (!dichtbij) { if (ud.busInt) ud.busInt.visible = false; if (ud.busPas) ud.busPas.visible = false; continue; }
    const body = ud.body || mesh;
    if (!ud.busInt) {
      ud.busInt = new THREE.Mesh(inrichtingGeo(v), mat());
      ud.busInt.name = 'businterieur';
      ud.busInt.userData.noBatch = true;
      body.add(ud.busInt);
    }
    ud.busInt.visible = true;
    const n = bucket(reizigersAanBoord(v));
    if (ud.busPasN !== n) {
      if (ud.busPas) body.remove(ud.busPas);
      ud.busPas = n > 0 ? new THREE.Mesh(reizigersGeo(v, n), mat()) : null;
      if (ud.busPas) { ud.busPas.name = 'busreizigers'; ud.busPas.userData.noBatch = true; body.add(ud.busPas); }
      ud.busPasN = n;
    }
    if (ud.busPas) ud.busPas.visible = true;
  }
}

export const busInterieurKind = { id: 'businterieur', tickPhase: 'world', tick: updateInterieur };
