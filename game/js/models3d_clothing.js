import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, vcMaterial, markShared, tubeGeometry } from './pixelart3d.js';

// Kleine kledingstukken die niet in de rompgeometrie van models3d_people.js zitten: sieraden (ketting, parels, kralen, hanger),
// horloge en polsbandjes en handschoenen. Alles is low-poly en procedureel, zonder letters of logo's. Het zijn losse, ongeskinde
// meshes aan een bot van het personage (borst, onderarm): per soort één geometrie, gedeeld en gecachet op soort en kleur, één
// gedeeld materiaal. Een personage met alles aan heeft er hoogstens vier extra (ketting, horloge, twee handschoenen): geen
// drawcalls voor wie niets draagt.
//
// Maten (modelruimte van een persoon, 1 eenheid = 1 meter): de borstbot staat op CHEST_Y 1,07 (de hals op +0,36); de onderarmbot
// begint bij de elleboog, de hand hangt ongeveer 0,315 eronder (models3d_people.js buildArms).

const CHEST_Y = 1.07; // PERSON_RIG.CHEST_Y (models3d_people.js importeert dit bestand, dus geen import terug)
const ARM_SPLAY = 0.06; // idem: de armen staan een tikje uit elkaar, de losse stukken aan de onderarm draaien mee
const ACC_MAT = markShared(vcMaterial({ roughness: 0.55 }));
const cache = new Map();
const CACHE_MAX = 160;

const shade = (hex, f) => {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f)), g = Math.min(255, Math.round(((hex >> 8) & 255) * f)), b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
};

function ringAround(B, r, ry, count, size, color, y = 0, tilt = 0) {
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2;
    B.box(Math.cos(a) * r, y + Math.sin(tilt) * Math.cos(a) * r, Math.sin(a) * ry, size, size, size, color, 0, a, 0, 0);
  }
}

// Specs: [soort, hex]. Geeft { parent: 'chest'|'elbow', geometry } of null.
// Een ketting volgt het oppervlak van de romp: path (ctx.neckPath uit models3d_people.js, in de modelruimte van de persoon) loopt vanaf de
// kuil van de hals (voor, laag) over de sleutelbeenderen en de schouderrand naar de nek (achter, hoog), op 7 mm van de kleding, bij elke
// lichaamsvorm anders. Voorheen was het een vlakke ring op de hoogte van de schouders: de zijkanten zaten tot 13 cm in het shirt (clipping-audit 22-11).
function neckGeometry(kind, hex, path) {
  if (!path) return null;
  const B = new GeoBuilder(1);
  const pts = path.map((p) => [p[0], p[1] - CHEST_Y, p[2]]); // de borstbot staat op CHEST_Y
  const n = pts.length;
  if (kind === 'chain' || kind === 'pendant') {
    for (let k = 0; k < n; k++) B.geo(tubeGeometry(pts[k], pts[(k + 1) % n], 0.0055, 0.0055, 3), null, hex);
    const f = pts[0];
    if (kind === 'pendant') {
      B.box(f[0] + 0.006, f[1] - 0.032, 0, 0.012, 0.034, 0.028, hex);
      B.box(f[0] + 0.01, f[1] - 0.035, 0, 0.006, 0.02, 0.02, shade(hex, 1.25));
    } else {
      B.box(f[0] + 0.003, f[1] - 0.004, 0, 0.01, 0.012, 0.012, shade(hex, 1.2));
    }
  } else if (kind === 'pearls' || kind === 'beads') {
    const cols = kind === 'beads' ? [hex, shade(hex, 0.8), 0xe8e6e0, shade(hex, 1.15)] : [hex];
    const sz = kind === 'beads' ? 0.02 : 0.019;
    for (let k = 0; k < n; k++) {
      const p = path[k], a = Math.atan2(p[2], p[0]);
      // de kraal ligt op het oppervlak: de helft van zijn maat langs de normaal erbovenop
      B.box(pts[k][0] + p[3] * sz * 0.5, pts[k][1] + p[4] * sz * 0.5, pts[k][2] + p[5] * sz * 0.5, sz, sz, sz, cols[k % cols.length], 0, 0, -a, 0);
    }
  } else return null;
  return { parent: 'chest', geometry: markShared(B.build()) };
}

// Horloge en bandjes: op de linkeronderarm, net boven de hand (bot k = 0).
function wristGeometry(kind, hex) {
  const B = new GeoBuilder(1);
  const y = -0.235;
  if (kind === 'watch') {
    B.geo(new THREE.CylinderGeometry(0.036, 0.036, 0.028, 8, 1, true), composeMatrix(0, y, 0), shade(hex, 0.9));
    B.box(0.039, y, 0, 0.012, 0.03, 0.034, 0x2a2e36);       // de kast
    B.box(0.0455, y, 0, 0.004, 0.022, 0.026, 0xd6d2c4);    // de wijzerplaat
    B.box(0.0485, y + 0.002, 0, 0.003, 0.012, 0.003, 0x26262a, 0, 0, 0, 0.6);
  } else if (kind === 'band') {
    B.geo(new THREE.CylinderGeometry(0.037, 0.037, 0.022, 8, 1, true), composeMatrix(0, y, 0), hex);
    B.box(0.037, y, 0.006, 0.006, 0.024, 0.014, shade(hex, 1.2));
  } else if (kind === 'bracelet') {
    B.geo(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 8, 1, true), composeMatrix(0, y - 0.004, 0), hex);
    ringAround(B, 0.039, 0.039, 6, 0.012, shade(hex, 1.25), y + 0.008, 0);
  } else return null;
  return { parent: 'elbow', geometry: markShared(B.build()) };
}

// Handschoenen: een iets grotere doos om de hand (+ manchet), voor beide handen dezelfde geometrie.
function glovesGeometry(kind, hex) {
  const B = new GeoBuilder(1);
  const hand = (len, y) => composeMatrix(0.008, y, 0, 0, 0, 0.12);
  if (kind === 'glove') {
    // fietshandschoen: palm en vingerzijde bedekt, vingertoppen en duim vrij
    B.geo(new THREE.BoxGeometry(0.078, 0.076, 0.04), hand(0, -0.287), hex);
    B.box(0.008, -0.243, 0, 0.074, 0.016, 0.04, shade(hex, 0.8));
    B.box(0.015, -0.292, 0, 0.02, 0.028, 0.042, shade(hex, 1.2));
  } else if (kind === 'work') {
    // werkhandschoen: de hele hand, brede manchet, versterkte knokkels
    B.geo(new THREE.BoxGeometry(0.08, 0.126, 0.042), hand(0, -0.312), hex);
    B.geo(new THREE.CylinderGeometry(0.043, 0.047, 0.05, 6), composeMatrix(0.003, -0.235, 0), shade(hex, 0.78));
    B.box(0.012, -0.345, 0, 0.082, 0.024, 0.044, shade(hex, 1.2), 0, 0, 0, 0.12);
    B.geo(new THREE.BoxGeometry(0.022, 0.044, 0.024), composeMatrix(0.044, -0.29, -0.0, 0, 0, 0.35), shade(hex, 0.92));
  } else if (kind === 'garden') {
    // tuinhandschoen: dun, de hele hand, kort manchet
    B.geo(new THREE.BoxGeometry(0.074, 0.12, 0.034), hand(0, -0.312), hex);
    B.geo(new THREE.CylinderGeometry(0.037, 0.04, 0.03, 6), composeMatrix(0.003, -0.248, 0), shade(hex, 0.85));
    B.geo(new THREE.BoxGeometry(0.02, 0.044, 0.022), composeMatrix(0.044, -0.29, 0, 0, 0, 0.35), shade(hex, 0.95));
  } else return null;
  return { parent: 'elbow2', geometry: markShared(B.build()) };
}

function build(kind, hex, path = null, pathKey = '') {
  const key = kind + ':' + hex + (path ? ':' + pathKey : '');
  let e = cache.get(key);
  if (e !== undefined) return e;
  e = neckGeometry(kind, hex, path) || wristGeometry(kind, hex) || glovesGeometry(kind, hex);
  if (cache.size >= CACHE_MAX) cache.clear(); // een wissel van personage of kast bouwt dan opnieuw; geometrie die nog tekent blijft gedeeld
  cache.set(key, e);
  return e;
}

export const accessoryCacheSize = () => cache.size;

// acc: { j: [soort, hex], w: [soort, hex], h: [soort, hex] } (clothing.outfitToLook). person: de groep van buildPersonMesh. Voegt de meshes
// toe en geeft ze terug (ook in person.userData.clothingMeshes). Zonder acc gebeurt er niets.
export function attachAccessories(person, acc) {
  if (!acc || !person) return [];
  const ud = person.userData;
  const made = [];
  // side: +1 voor de linkerarm, -1 voor de rechter; de arm staat ARM_SPLAY uit het lood (models3d_people.js buildArms), het stuk draait om de elleboog mee
  const add = (parent, geometry, kind, side = 0, lift = 0) => {
    if (!parent) return;
    const m = new THREE.Mesh(geometry, ACC_MAT);
    m.frustumCulled = false; // klein en aan een bot: de boundingbox van de ouder is al ruim
    m.userData.clothing = true;
    m.userData.kind = kind;
    if (side) m.rotation.x = -side * ARM_SPLAY;
    if (lift) m.position.set(0, lift * Math.cos(ARM_SPLAY), -side * lift * Math.sin(ARM_SPLAY)); // omhoog langs de arm
    parent.add(m);
    made.push(m);
  };
  if (acc.j) { const e = build(acc.j[0], acc.j[1], ud.neckPath, ud.neckKey); if (e && e.parent === 'chest') add(ud.chest, e.geometry, acc.j[0]); }
  if (acc.w) { const e = build(acc.w[0], acc.w[1]); if (e && e.parent === 'elbow') add(ud.elbowL, e.geometry, acc.w[0], 1, acc.h ? 0.045 : 0); } // met handschoenen aan zit het horloge boven de manchet
  if (acc.h) {
    const e = build(acc.h[0], acc.h[1]);
    if (e && e.parent === 'elbow2') { add(ud.elbowL, e.geometry, acc.h[0], 1); add(ud.elbowR, e.geometry, acc.h[0], -1); }
  }
  ud.clothingMeshes = made;
  return made;
}

export const ACCESSORY_MATERIAL = ACC_MAT;
