import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, vcMaterial, markShared } from './pixelart3d.js';

// Kleine kledingstukken die niet in de rompgeometrie van models3d_people.js zitten: sieraden (ketting, parels, kralen, hanger),
// horloge en polsbandjes en handschoenen. Alles is low-poly en procedureel, zonder letters of logo's. Het zijn losse, ongeskinde
// meshes aan een bot van het personage (borst, onderarm): per soort één geometrie, gedeeld en gecachet op soort en kleur, één
// gedeeld materiaal. Een personage met alles aan heeft er hoogstens vier extra (ketting, horloge, twee handschoenen): geen
// drawcalls voor wie niets draagt.
//
// Maten (modelruimte van een persoon, 1 eenheid = 1 meter): de borstbot staat op CHEST_Y 1,07 (de hals op +0,36); de onderarmbot
// begint bij de elleboog, de hand hangt ongeveer 0,315 eronder (models3d_people.js buildArms).

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
function neckGeometry(kind, hex) {
  const B = new GeoBuilder(1);
  const tilt = -0.32; // de ketting hangt aan de voorkant lager
  if (kind === 'chain' || kind === 'pendant') {
    B.geo(new THREE.TorusGeometry(0.088, kind === 'chain' ? 0.0055 : 0.0045, 3, 12).rotateX(Math.PI / 2), composeMatrix(0.012, 0.335, 0, 0, 0, tilt, 1.05, 1, 1.3), hex);
    if (kind === 'pendant') {
      B.box(0.108, 0.265, 0, 0.012, 0.034, 0.028, hex);
      B.box(0.112, 0.262, 0, 0.006, 0.02, 0.02, shade(hex, 1.25));
    } else {
      B.box(0.106, 0.292, 0, 0.01, 0.012, 0.012, shade(hex, 1.2));
    }
  } else if (kind === 'pearls') {
    ringAround(B, 0.092, 0.115, 14, 0.019, hex, 0.325, tilt);
  } else if (kind === 'beads') {
    const cols = [hex, shade(hex, 0.8), 0xe8e6e0, shade(hex, 1.15)];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      B.box(Math.cos(a) * 0.092 + 0.012, 0.325 + Math.sin(tilt) * Math.cos(a) * 0.092, Math.sin(a) * 0.115, 0.02, 0.02, 0.02, cols[k % cols.length], 0, a, 0, 0);
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

function build(kind, hex) {
  const key = kind + ':' + hex;
  let e = cache.get(key);
  if (e !== undefined) return e;
  e = neckGeometry(kind, hex) || wristGeometry(kind, hex) || glovesGeometry(kind, hex);
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
  const add = (parent, geometry) => {
    if (!parent) return;
    const m = new THREE.Mesh(geometry, ACC_MAT);
    m.frustumCulled = false; // klein en aan een bot: de boundingbox van de ouder is al ruim
    m.userData.clothing = true;
    parent.add(m);
    made.push(m);
  };
  if (acc.j) { const e = build(acc.j[0], acc.j[1]); if (e && e.parent === 'chest') add(ud.chest, e.geometry); }
  if (acc.w) { const e = build(acc.w[0], acc.w[1]); if (e && e.parent === 'elbow') add(ud.elbowL, e.geometry); }
  if (acc.h) {
    const e = build(acc.h[0], acc.h[1]);
    if (e && e.parent === 'elbow2') { add(ud.elbowL, e.geometry); add(ud.elbowR, e.geometry); }
  }
  ud.clothingMeshes = made;
  return made;
}

export const ACCESSORY_MATERIAL = ACC_MAT;
