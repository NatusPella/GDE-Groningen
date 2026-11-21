// De wapenmodellen van het spel (21-11, Spullen-wensen): één bron voor de hand van het figuur (setHeldWeapon), de eerste-persoonhanden
// (firstpersonhands.js), de weggegooide wapens (weapondrops.js) en de 3D-voorbeelden (winkel, Spullen). Low-poly, maar herkenbaar:
// elk wapen heeft zijn eigen silhouet, onderdelen en materiaal (staal, kunststof, hout, rubber), zonder merken of tekst.
//
// Het assenstelsel van een wapen (de paal in de handpalm is de oorsprong): f = vooruit (naar de loopmond, meters), u = omhoog (de
// rug van de hand), s = opzij. In three-ruimte is dat x = u, y = -f, z = s: dezelfde oriëntatie als de oude blokjes van
// models3d_people.js, dus de handen en de zwaaihoeken blijven kloppen. Elk onderdeel is een kleine bouwsteen (box, cilinder,
// draaivorm); per wapen worden de onderdelen per materiaal tot één geometrie samengevoegd (hooguit 5 tekenaanroepen, een paar
// honderd driehoeken) en onder de sleutel gecachet. De geometrie is gedeeld (userData.shared): wie een wapen weggooit, ruimt niets op.
// Test: scripts/weapons3d_test.mjs (budget, silhouet, dispose), beeld: scripts/ui/weapons_mock.mjs.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markShared } from './pixelart3d.js';
import { mergeGeometries } from './geomerge.js';

const mat = (color, roughness = 0.7, metalness = 0) => markShared(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
// Kleuren in de lijn van de wereldpalet: gebroken zwart, staalgrijs, walnoot, esdoorn, geen zuiver wit of zwart.
export const WEAPON_MATERIALS = {
  steel: mat(0x23262b, 0.38, 0.75), // donker getint staal (slede, loop, ontvanger)
  bright: mat(0x9097a0, 0.3, 0.85), // blank staal (mondingen, bouten, ringen)
  poly: mat(0x2e3135, 0.78, 0.05), // kunststof (handgreep, beugel)
  dark: mat(0x0b0c0e, 0.9, 0), // openingen, groeven, gaten
  walnut: mat(0x6a4326, 0.6), // donker hout (kolf, voorhout)
  maple: mat(0xc9a36a, 0.6), // licht hout (knuppel)
  ash: mat(0x8a6a3e, 0.75), // staal hout (bezem, polsstok)
  rubber: mat(0x1b1c1e, 0.95), // handgrepen, kapjes
  tape: mat(0xe8e6e0, 0.85), // tape
  straw: mat(0xb89654, 0.95), // borstels
  strawDark: mat(0x8f7238, 0.95),
  pump: mat(0xb8bec4, 0.35, 0.8), // fietspomp
  klomp: mat(0xe0b640, 0.7), // klomp
  tulip: mat(0xc8402e, 0.6), // klompband, raket, carbidbus
  toyGreen: mat(0x2fb56a, 0.4),
  toyOrange: mat(0xf0892a, 0.4),
  toyBlue: mat(0x5fb8dc, 0.25),
  toyYellow: mat(0xf2d24a, 0.4),
  lens: mat(0x4f7ba0, 0.1, 0.6),
  churn: mat(0x9aa2a8, 0.4, 0.7), // carbidbus
  churnDark: mat(0x6a7278, 0.45, 0.7),
  rocket: mat(0xc8261e, 0.6),
  paper: mat(0xe8d49a, 0.85),
  pole: mat(0x7a5a34, 0.75),
};
const M = WEAPON_MATERIALS;

// ---- bouwstenen: alles in (f, u, s), meters --------------------------------------------------------
const mid = (a, b) => (a + b) / 2;
// box van f0 tot f1, u0 tot u1, s0 tot s1. o.rake: onderkant (u0) schuift zoveel naar achteren/voren (f), een schuine greep.
// o.front en o.back: schaal van doorsnede (u en s) aan het voor- of achtereinde (een taps toelopend deel).
function box(f0, f1, u0, u1, s0, s1, o = {}) {
  const g = new THREE.BoxGeometry(u1 - u0, f1 - f0, s1 - s0);
  const p = g.attributes.position;
  const cu = mid(u0, u1), cs = mid(s0, s1);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const atFront = y < 0; // y = -f: het kleinste y is het voorste vlak
    const k = atFront ? o.front : o.back;
    if (k !== undefined) { x *= k; z *= k; }
    if (o.rake && x < 0) y -= o.rake;
    p.setXYZ(i, x + cu, y - mid(f0, f1), z + cs);
  }
  g.computeVertexNormals();
  return g;
}
// Een gesloten romp door rechthoekige doorsneden [f, u0, u1, s0, s1] (oplopend in f): voor kolven, de klomp en het blad van een stick, waar
// een doorsnede mee verandert. Vlakke schaduw (elke zijde eigen normaal); de windingsrichting volgt uit het teken van het volume.
function loft(secs) {
  const v = [];
  const corner = (sec, k) => { const [f, u0, u1, s0, s1] = sec; return [k & 1 ? u1 : u0, -f, k & 2 ? s1 : s0]; }; // x = u, y = -f, z = s
  const ring = [0, 1, 3, 2];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  for (let i = 0; i + 1 < secs.length; i++) for (let k = 0; k < 4; k++) {
    const a = corner(secs[i], ring[k]), b = corner(secs[i], ring[(k + 1) % 4]), c = corner(secs[i + 1], ring[(k + 1) % 4]), d = corner(secs[i + 1], ring[k]);
    quad(a, b, c, d);
  }
  const cap = (sec) => quad(corner(sec, 0), corner(sec, 1), corner(sec, 3), corner(sec, 2));
  cap(secs[0]); cap(secs[secs.length - 1]);
  let vol = 0; // volume met teken: negatief = binnenstebuiten
  for (let i = 0; i < v.length; i += 9) vol += (v[i] * (v[i + 4] * v[i + 8] - v[i + 5] * v[i + 7]) - v[i + 1] * (v[i + 3] * v[i + 8] - v[i + 5] * v[i + 6]) + v[i + 2] * (v[i + 3] * v[i + 7] - v[i + 4] * v[i + 6])) / 6;
  if (vol < 0) for (let i = 0; i < v.length; i += 9) for (let k = 0; k < 3; k++) { const t = v[i + 3 + k]; v[i + 3 + k] = v[i + 6 + k]; v[i + 6 + k] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((v.length / 3) * 2), 2));
  return g;
}
// cilinder langs f van f0 (achter) tot f1 (voor), straal r0 achter en r1 voor, op hoogte u en zijkant s.
function cyl(f0, f1, r0, u, s, r1 = r0, seg = 8) {
  return new THREE.CylinderGeometry(r0, r1, f1 - f0, seg).translate(u, -mid(f0, f1), s);
}
// cilinder dwars (langs s), bv. een stuur of een bout
function cylS(s0, s1, r, f, u, seg = 8) {
  return new THREE.CylinderGeometry(r, r, s1 - s0, seg).rotateX(Math.PI / 2).translate(u, -f, mid(s0, s1));
}
// bol, eventueel afgeplat per as
function ball(r, f, u, s, seg = 8, sf = 1, su = 1, ss = 1) {
  return new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)).scale(su, sf, ss).translate(u, -f, s);
}
// draaivorm langs f: profiel [[f, straal], ...]; op hoogte u, zijkant s
function lathe(profile, u = 0, s = 0, seg = 10) {
  const pts = [...profile].sort((a, b) => b[0] - a[0]).map(([f, r]) => new THREE.Vector2(Math.max(r, 0), -f));
  return new THREE.LatheGeometry(pts, seg).translate(u, 0, s);
}

// ---- de wapens -----------------------------------------------------------------------------------------
// Elk wapen: een functie die [materiaalnaam, geometrie] teruggeeft. `mir` zet een spiegelbeeld in s mee.
function mirrorS(g) {
  const c = g.clone().scale(1, 1, -1);
  const ix = c.index;
  // spiegelen draait de windingsrichting om: wissel de tweede en derde hoek van elke driehoek
  if (ix) for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); }
  else {
    for (const at of Object.values(c.attributes)) {
      for (let i = 0; i + 2 < at.count; i += 3) for (let k = 0; k < at.itemSize; k++) { const t = at.array[(i + 1) * at.itemSize + k]; at.array[(i + 1) * at.itemSize + k] = at.array[(i + 2) * at.itemSize + k]; at.array[(i + 2) * at.itemSize + k] = t; }
    }
  }
  return c;
}
const mir = (list) => list.flatMap(([m, g]) => [[m, g], [m, mirrorS(g)]]);

function pistol() {
  return [
    ['steel', box(-0.075, 0.19, 0.008, 0.062, -0.017, 0.017, { front: 0.86 })], // slede
    ['steel', box(-0.07, 0.12, 0.062, 0.067, -0.006, 0.006)], // vizierrib
    ...[0, 1, 2, 3, 4].map((i) => ['dark', box(-0.07 + i * 0.011, -0.066 + i * 0.011, 0.012, 0.058, -0.0182, 0.0182)]), // grepen in de slede
    ['dark', box(0.0, 0.07, 0.04, 0.056, 0.0165, 0.0185)], // uitwerpopening
    ['bright', cyl(0.19, 0.205, 0.0095, 0.035, 0, 0.0085)], // mondingsring
    ['dark', cyl(0.205, 0.206, 0.006, 0.035, 0, 0.006)], // loopopening
    ['steel', box(0.168, 0.18, 0.062, 0.071, -0.004, 0.004)], // korrel
    ['steel', box(-0.074, -0.06, 0.062, 0.071, -0.011, 0.011)], // kimmen
    ['bright', box(-0.09, -0.074, 0.032, 0.052, -0.004, 0.004)], // haan
    ['poly', box(-0.07, 0.125, -0.014, 0.008, -0.014, 0.014)], // frame
    ['poly', box(-0.082, -0.02, -0.125, -0.014, -0.0175, 0.0175, { rake: 0.02 })], // greep
    ...mir([['steel', box(-0.068, -0.034, -0.1, -0.045, 0.0172, 0.0188, { rake: 0.012 })]]), // greepplaten
    ['steel', box(-0.088, -0.018, -0.134, -0.124, -0.0195, 0.0195, { rake: 0.02 })], // magazijnvoet
    ['poly', box(0.034, 0.042, -0.04, -0.012, -0.0055, 0.0055)], // beugel voor
    ['poly', box(-0.018, 0.042, -0.044, -0.037, -0.0055, 0.0055)], // beugel onder
    ['bright', box(0.0, 0.006, -0.036, -0.013, -0.0035, 0.0035)], // trekker
  ];
}

function uzi() {
  return [
    ['steel', box(-0.09, 0.19, 0.0, 0.07, -0.024, 0.024)], // ontvanger
    ['steel', box(-0.07, 0.17, 0.07, 0.078, -0.018, 0.018)], // deksel
    ...mir([['dark', box(-0.04, 0.16, 0.03, 0.036, 0.0242, 0.0256)], ['dark', box(-0.04, 0.16, 0.012, 0.018, 0.0242, 0.0256)]]), // geperste ribben
    ['steel', cyl(0.19, 0.27, 0.017, 0.035, 0, 0.0155, 8)], // loopmantel
    ['bright', cyl(0.27, 0.285, 0.0195, 0.035, 0, 0.0195, 8)], // mondingsmoer
    ['dark', cyl(0.285, 0.286, 0.008, 0.035, 0, 0.008, 6)],
    ...mir([['steel', box(0.236, 0.25, 0.05, 0.095, 0.01, 0.014)]]), // korrelbeschermer
    ['steel', box(-0.075, -0.058, 0.078, 0.092, -0.009, 0.009)], // diopter
    ['bright', box(0.02, 0.045, 0.078, 0.09, 0.002, 0.016)], // grendelknop
    ['poly', box(-0.075, -0.012, -0.205, 0.0, -0.02, 0.02, { rake: 0.014 })], // greep met magazijn
    ['steel', box(-0.082, -0.004, -0.212, -0.2, -0.0225, 0.0225, { rake: 0.014 })], // magazijnvoet
    ['poly', box(0.1, 0.145, -0.095, 0.0, -0.016, 0.016)], // voorgreep
    ['poly', box(0.0, 0.07, -0.03, -0.023, -0.005, 0.005)], // beugel onder
    ['poly', box(0.064, 0.071, -0.03, 0.0, -0.005, 0.005)], // beugel voor
    ['bright', box(0.01, 0.016, -0.026, -0.003, -0.003, 0.003)], // trekker
    // ingeklapte draadkolf: twee rails en een schouderplaat
    ...mir([['bright', box(-0.205, -0.09, 0.034, 0.041, 0.02, 0.026)]]),
    ['rubber', box(-0.215, -0.205, 0.0, 0.07, -0.026, 0.026)],
  ];
}

function squirtGun() {
  return [
    ['toyGreen', box(-0.075, 0.17, -0.005, 0.075, -0.03, 0.03, { front: 0.82 })], // romp
    ['toyGreen', box(0.17, 0.235, 0.022, 0.06, -0.02, 0.02)], // loop
    ['toyOrange', cyl(0.235, 0.268, 0.024, 0.041, 0, 0.026, 10)], // mondstuk
    ['dark', cyl(0.268, 0.27, 0.011, 0.041, 0, 0.011, 8)],
    ['toyBlue', cyl(-0.02, 0.14, 0.046, 0.12, 0, 0.046, 10)], // watertank
    ['toyOrange', cyl(-0.032, -0.02, 0.048, 0.12, 0, 0.048, 10)], // dop achter
    ['toyOrange', cyl(0.14, 0.152, 0.048, 0.12, 0, 0.048, 10)], // dop voor
    ['toyYellow', box(0.04, 0.05, 0.158, 0.175, -0.008, 0.008)], // vuldop
    ['toyGreen', box(0.0, 0.022, 0.07, 0.092, -0.014, 0.014)], // steun achter
    ['toyGreen', box(0.098, 0.12, 0.07, 0.092, -0.014, 0.014)], // steun voor
    ['toyOrange', box(-0.085, -0.02, -0.125, -0.005, -0.0225, 0.0225, { rake: 0.02 })], // greep
    ...[0, 1, 2].map((i) => ['toyGreen', box(-0.075 + i * 0.012, -0.068 + i * 0.012, -0.11, -0.03, -0.0235, 0.0235, { rake: 0.015 })]), // ribbels
    ['toyGreen', box(0.04, 0.05, -0.048, -0.005, -0.006, 0.006)], // beugel voor
    ['toyGreen', box(-0.02, 0.05, -0.052, -0.044, -0.006, 0.006)], // beugel onder
    ['toyYellow', box(0.0, 0.008, -0.044, -0.008, -0.005, 0.005)], // trekker
    ['toyYellow', box(0.14, 0.165, 0.075, 0.09, -0.009, 0.009)], // korrelbult
    ['toyOrange', ball(0.016, 0.01, 0.0, 0.03, 6)], // schroefknop
  ];
}

function shotgun() {
  return [
    // loop, buismagazijn en richtrib
    ['steel', cyl(0.14, 0.68, 0.0145, 0.045, 0, 0.0135, 9)],
    ['steel', cyl(0.14, 0.55, 0.0135, 0.016, 0, 0.0135, 8)],
    ['bright', cyl(0.55, 0.562, 0.0175, 0.016, 0, 0.0175, 8)], // dop op de buis
    ['steel', box(0.14, 0.67, 0.058, 0.063, -0.006, 0.006)],
    ['bright', box(0.66, 0.67, 0.063, 0.07, -0.003, 0.003)], // korrel
    ['dark', cyl(0.68, 0.681, 0.01, 0.045, 0, 0.01, 6)],
    ['steel', box(-0.1, 0.16, -0.008, 0.072, -0.023, 0.023)], // ontvanger
    ['dark', box(0.02, 0.1, 0.046, 0.064, 0.0225, 0.0238)], // uitwerpopening
    ['bright', box(0.016, 0.034, 0.03, 0.04, 0.0225, 0.0245)], // grendelknop
    // houten voorhout met groeven
    ['walnut', box(0.2, 0.4, -0.012, 0.035, -0.0255, 0.0255, { front: 0.92 })],
    ...mir([0, 1, 2, 3].map((i) => ['dark', box(0.23 + i * 0.03, 0.236 + i * 0.03, -0.004, 0.028, 0.0254, 0.0266)])),
    // kolf: hals met pistoolgreep, wang en rubber kolfplaat
    ['walnut', loft([[-0.375, -0.088, 0.054, -0.0225, 0.0225], [-0.3, -0.07, 0.05, -0.021, 0.021], [-0.18, -0.052, 0.042, -0.02, 0.02], [-0.07, -0.045, 0.04, -0.02, 0.02]])],
    ['rubber', box(-0.385, -0.375, -0.087, 0.054, -0.0235, 0.0235)],
    ['walnut', box(-0.1, -0.045, -0.105, -0.01, -0.0185, 0.0185, { rake: 0.03 })], // pistoolgreep
    ['poly', box(0.02, 0.026, -0.04, -0.01, -0.005, 0.005)], // beugel voor
    ['poly', box(-0.05, 0.026, -0.046, -0.04, -0.005, 0.005)], // beugel onder
    ['bright', box(-0.012, -0.006, -0.042, -0.012, -0.0035, 0.0035)], // trekker
    ['bright', ball(0.008, -0.3, -0.07, 0.02, 5)], // oogje voor de riem
  ];
}

function huntingRifle() {
  return [
    // zware loop, taps naar voren, met kroontje
    ['steel', cyl(0.12, 0.95, 0.0145, 0.04, 0, 0.0115, 9)],
    ['bright', cyl(0.95, 0.962, 0.0135, 0.04, 0, 0.0135, 9)],
    ['dark', cyl(0.962, 0.963, 0.007, 0.04, 0, 0.007, 6)],
    ['steel', box(-0.08, 0.15, 0.0, 0.062, -0.021, 0.021)], // ontvanger
    ['bright', cylS(0.02, 0.072, 0.0055, -0.035, 0.04, 6)], // grendelsteel
    ['bright', ball(0.0135, -0.035, 0.04, 0.076, 6)], // grendelknop
    ['steel', box(0.07, 0.15, -0.02, 0.0, -0.016, 0.016)], // magazijn
    // houten kolf: voorhout, hals, wang en greep
    ['walnut', box(0.1, 0.52, -0.034, 0.036, -0.02, 0.02, { front: 0.62 })],
    ['walnut', box(-0.1, 0.1, -0.034, 0.0, -0.0205, 0.0205)],
    ['walnut', loft([[-0.42, -0.08, 0.042, -0.0225, 0.0225], [-0.33, -0.07, 0.064, -0.021, 0.021], [-0.2, -0.045, 0.06, -0.02, 0.02], [-0.1, -0.034, 0.04, -0.0205, 0.0205]])], // kolf met wang
    ['walnut', box(-0.11, -0.045, -0.11, -0.01, -0.019, 0.019, { rake: 0.035 })], // pistoolgreep
    ['poly', box(-0.43, -0.42, -0.082, 0.044, -0.0235, 0.0235)], // kolfplaat
    ['poly', box(0.03, 0.036, -0.06, -0.02, -0.005, 0.005)], // beugel voor
    ['poly', box(-0.07, 0.036, -0.066, -0.06, -0.005, 0.005)], // beugel onder
    ['bright', box(-0.03, -0.024, -0.062, -0.026, -0.0035, 0.0035)], // trekker
    // richtkijker met steunen, bel voor en oculair achter
    ['steel', cyl(0.0, 0.26, 0.017, 0.095, 0, 0.017, 9)],
    ['steel', lathe([[0.22, 0.017], [0.25, 0.027], [0.31, 0.027]], 0.095, 0, 9)], // objectief
    ['lens', cyl(0.31, 0.312, 0.0245, 0.095, 0, 0.0245, 9)],
    ['steel', lathe([[-0.075, 0.023], [-0.045, 0.023], [-0.02, 0.017]], 0.095, 0, 9)], // oculair
    ['lens', cyl(-0.076, -0.075, 0.019, 0.095, 0, 0.019, 9)],
    ['bright', box(0.1, 0.12, 0.108, 0.124, -0.008, 0.008)], // torentje
    ['bright', cylS(0.01, 0.034, 0.008, 0.13, 0.116, 6)], // draaiknop
    ['steel', box(0.03, 0.055, 0.058, 0.082, -0.008, 0.008)], // steun achter
    ['steel', box(0.2, 0.225, 0.058, 0.082, -0.008, 0.008)], // steun voor
  ];
}

function knuppel() {
  return [
    ['maple', lathe([[-0.235, 0.0], [-0.23, 0.02], [-0.205, 0.03], [-0.19, 0.016], [-0.16, 0.0145], [0.1, 0.0165], [0.25, 0.026], [0.4, 0.04], [0.55, 0.049], [0.66, 0.047], [0.7, 0.034], [0.71, 0.0]], 0, 0, 10)],
    ['rubber', cyl(-0.13, 0.11, 0.0185, 0, 0, 0.0185, 10)], // omwikkelde greep
    ['tape', cyl(-0.135, -0.125, 0.019, 0, 0, 0.019, 10)],
    ['tape', cyl(0.105, 0.115, 0.019, 0, 0, 0.019, 10)],
    ['tulip', cyl(0.58, 0.6, 0.0495, 0, 0, 0.05, 10)], // gekleurde band
  ];
}

function hockeystick() {
  return [
    ['rubber', box(-0.2, 0.76, -0.0135, 0.0135, -0.0115, 0.0115)], // schacht
    ['tape', box(-0.205, 0.12, -0.0147, 0.0147, -0.0127, 0.0127)], // witte greeptape
    ['tape', box(-0.22, -0.205, -0.016, 0.016, -0.014, 0.014)], // eindknop
    ['rubber', loft([[0.58, -0.2, 0.0135, -0.0145, 0.0145], [0.68, -0.208, 0.0135, -0.0145, 0.0145], [0.76, -0.19, 0.0135, -0.0145, 0.0145], [0.82, -0.14, 0.0135, -0.0145, 0.0145]])], // gebogen blad met opkrullende teen
    ['steel', box(0.56, 0.62, -0.04, 0.0135, -0.0125, 0.0125)], // hiel van de schacht naar het blad
    ['tape', box(0.78, 0.84, -0.145, -0.12, -0.0158, 0.0158)], // tape op de teen
    ['tape', box(0.6, 0.64, -0.2, -0.04, -0.0158, 0.0158)], // tapewikkels op het blad
    ['tape', box(0.7, 0.74, -0.2, -0.04, -0.0158, 0.0158)],
    ['tape', box(0.58, 0.72, -0.212, -0.2, -0.0155, 0.0155)], // tape langs de onderrand
  ];
}

function bezem() {
  const rij = [];
  for (let i = 0; i < 8; i++) {
    const s = -0.165 + i * 0.0475;
    rij.push([i % 2 ? 'strawDark' : 'straw', box(0.9, 1.07 + (i % 3) * 0.016, -0.036, 0.036, s, s + 0.0475, { front: 1.12 })]);
  }
  return [
    ['ash', cyl(-0.42, 0.78, 0.014, 0, 0, 0.014, 8)], // steel
    ['ash', ball(0.018, -0.43, 0, 0, 6)], // knop
    ['rubber', cyl(-0.4, -0.3, 0.0155, 0, 0, 0.0155, 8)], // handgreep
    ['pump', cyl(0.74, 0.8, 0.02, 0, 0, 0.02, 8)], // metalen hals
    ['pole', box(0.8, 0.9, -0.03, 0.03, -0.17, 0.17)], // kop
    ['pole', box(0.77, 0.82, -0.02, 0.02, -0.045, 0.045)], // steunen naar de steel
    ...rij,
    ['pump', box(0.9, 0.915, -0.032, 0.032, -0.172, 0.172)], // binddraad
  ];
}

function bikePump() {
  return [
    ['pump', cyl(0.0, 0.4, 0.022, 0, 0, 0.022, 10)], // cilinder
    ['bright', cyl(0.0, 0.02, 0.027, 0, 0, 0.027, 10)], // kop
    ['bright', cyl(0.38, 0.4, 0.027, 0, 0, 0.027, 10)], // voet
    ['bright', cyl(-0.17, 0.0, 0.007, 0, 0, 0.007, 6)], // zuigerstang
    ['rubber', cylS(-0.095, 0.095, 0.0125, -0.18, 0, 8)], // T-handvat
    ['rubber', cylS(0.05, 0.095, 0.0175, -0.18, 0, 8)],
    ['rubber', cylS(-0.095, -0.05, 0.0175, -0.18, 0, 8)],
    ['steel', cylS(-0.052, 0.052, 0.0135, -0.18, 0, 8)],
    ['tape', cylS(0.021, 0.028, 0.019, 0.12, 0, 10)], // manometer: wijzerplaat
    ['bright', cylS(0.028, 0.032, 0.021, 0.12, 0, 10)],
    ['steel', box(0.285, 0.31, 0.022, 0.07, -0.007, 0.007)], // klapvoetje
    ['steel', box(0.285, 0.31, -0.07, -0.022, -0.007, 0.007)],
    ['rubber', cyl(0.4, 0.45, 0.0085, 0, 0, 0.0085, 6)], // slang
    ['rubber', cyl(0.45, 0.47, 0.0085, 0.0, 0.0, 0.0085, 6).translate(-0.012, 0, 0)],
    ['bright', cyl(0.47, 0.5, 0.0125, -0.012, 0, 0.01, 8)], // ventielkop
  ];
}

function klomp() {
  return [
    // de dichte voorkant: tenen, met een opkrullende punt
    ['klomp', loft([[0.09, -0.045, 0.06, -0.052, 0.052], [0.18, -0.045, 0.064, -0.048, 0.048], [0.25, -0.032, 0.062, -0.037, 0.037], [0.29, -0.008, 0.066, -0.027, 0.027], [0.315, 0.02, 0.078, -0.016, 0.016]])],
    // de open achterkant: vloer, zijwanden en achterwand rond de opening
    ['klomp', loft([[-0.1, -0.045, -0.02, -0.052, 0.052], [0.09, -0.045, -0.02, -0.052, 0.052]])],
    ['klomp', box(-0.1, -0.05, -0.06, -0.045, -0.046, 0.046)], // hak
    ...mir([['klomp', loft([[-0.1, -0.02, 0.056, 0.036, 0.054], [0.09, -0.02, 0.05, 0.038, 0.052]])]]),
    ['klomp', box(-0.1, -0.072, -0.02, 0.066, -0.054, 0.054)],
    ['dark', box(-0.07, 0.088, -0.02, -0.012, -0.036, 0.036)], // de holte
    ...mir([['tulip', box(0.045, 0.07, -0.02, 0.052, 0.0365, 0.0555)]]), // tulpband
    ['tulip', box(0.16, 0.185, 0.054, 0.0665, -0.034, 0.034)],
    ['strawDark', box(0.2, 0.225, -0.047, -0.02, -0.054, 0.054)], // nagelrand
    ['rubber', box(0.1, 0.3, -0.049, -0.045, -0.044, 0.044)], // dun zoolrubber onder de voorvoet
    ['strawDark', box(0.285, 0.31, 0.015, 0.045, -0.02, 0.02)], // houten opkrul bij de punt
  ];
}

function polsstok() {
  return [
    ['ash', cyl(-1.16, 2.2, 0.0255, 0, 0, 0.0235, 9)],
    ['rubber', cyl(-1.12, -0.6, 0.0275, 0, 0, 0.0275, 9)], // greeprubber
    ['tape', cyl(-0.62, -0.6, 0.0285, 0, 0, 0.0285, 9)],
    ['rubber', cyl(-0.1, 0.45, 0.0275, 0, 0, 0.0275, 9)], // tweede greepvlak
    ['tape', cyl(0.44, 0.46, 0.0285, 0, 0, 0.0285, 9)],
    ['tape', cyl(-0.12, -0.1, 0.0285, 0, 0, 0.0285, 9)],
    ['ash', ball(0.03, -1.17, 0, 0, 6)], // achterkant
    ['bright', lathe([[2.2, 0.024], [2.23, 0.03], [2.26, 0.03], [2.28, 0.0]], 0, 0, 8)], // metalen punt
    ['bright', cyl(2.1, 2.12, 0.075, 0, 0, 0.075, 12)], // schijf tegen wegzakken
    ['steel', cyl(2.12, 2.14, 0.0275, 0, 0, 0.026, 9)],
  ];
}

function carbidbus() {
  return [
    // melkbus-vorm: voetrand, romp, schouder, hals en deksel
    ['churn', lathe([[-0.085, 0.14], [-0.075, 0.154], [0.2, 0.154], [0.235, 0.128], [0.27, 0.078], [0.285, 0.07], [0.31, 0.07]], 0, 0, 12)],
    ['churnDark', cyl(-0.09, -0.07, 0.145, 0, 0, 0.145, 12)], // rand onderaan
    ['tulip', cyl(0.04, 0.09, 0.1565, 0, 0, 0.1565, 12)], // waarschuwingsband
    ['churnDark', cyl(0.18, 0.19, 0.1565, 0, 0, 0.1565, 12)],
    ['churnDark', lathe([[0.31, 0.082], [0.33, 0.082], [0.345, 0.07], [0.35, 0.0]], 0, 0, 12)], // deksel
    ['churnDark', cyl(0.35, 0.37, 0.016, 0, 0, 0.012, 6)], // knop
    ...mir([['churnDark', box(0.2, 0.24, -0.012, 0.012, 0.13, 0.19)]]), // oren
    ...mir([['rubber', box(0.21, 0.23, -0.015, 0.015, 0.15, 0.185)]]), // handgrepen
  ];
}

function firework() {
  return [
    ['rocket', lathe([[-0.04, 0.034], [0.15, 0.036]], 0, 0, 10)], // koker
    ['paper', cyl(0.02, 0.07, 0.0372, 0, 0, 0.0372, 10)], // papieren band
    ['paper', cyl(0.11, 0.14, 0.0372, 0, 0, 0.0372, 10)],
    ['rocket', lathe([[0.15, 0.036], [0.19, 0.03], [0.26, 0.0]], 0, 0, 10)], // neus
    ['tulip', lathe([[0.15, 0.0368], [0.165, 0.0365]], 0, 0, 10)],
    ['tape', cyl(0.235, 0.262, 0.012, 0, 0, 0.0, 6)], // witte punt
    ['paper', box(-0.065, -0.035, -0.015, 0.015, -0.014, 0.014)], // lont
    ['pole', cyl(-0.5, 0.1, 0.0065, 0.052, 0, 0.0065, 6)], // stok
    ['pole', box(0.0, 0.03, 0.036, 0.058, -0.008, 0.008)], // beugel naar de koker
    ['pole', box(0.08, 0.11, 0.036, 0.058, -0.008, 0.008)],
    // vinnen
    ...[0, 1, 2].map((i) => ['tulip', box(-0.04, 0.045, 0.034, 0.075, -0.003, 0.003, { back: 1.0 }).rotateY((i * 2 * Math.PI) / 3)]),
  ];
}

const BUILDERS = { pistol, uzi, waterpistool: squirtGun, shotgun, jachtgeweer: huntingRifle, knuppel, hockeystick, bezem, fietspomp: bikePump, klomp, polsstok, carbidbus, vuurwerk: firework };
export const WEAPON_MODEL_KEYS = Object.keys(BUILDERS);

// Per wapen: { f0, f1, ... } de uitersten in f, voor de loopmond (tip) en voor de tests
const cache = {};
// De lagen van een wapen: [{ geometry, material }], per materiaal samengevoegd. Gedeeld en gecachet.
export function weaponLayers(key) {
  if (cache[key] !== undefined) return cache[key];
  const b = BUILDERS[key];
  if (!b) { cache[key] = null; return null; }
  const per = new Map();
  for (const entry of b()) {
    if (!entry || !entry[1]) continue;
    const [m, g] = entry;
    if (!per.has(m)) per.set(m, []);
    per.get(m).push(g);
  }
  const layers = [];
  for (const [m, list] of per) {
    const geometry = markShared(mergeGeometries(list));
    for (const g of list) g.dispose();
    layers.push({ geometry, material: M[m], name: m });
  }
  cache[key] = layers;
  return layers;
}
export const hasWeaponModel = (key) => !!BUILDERS[key];

// Het aantal driehoeken van een wapen
export function weaponTriangles(key) {
  const l = weaponLayers(key);
  return l ? l.reduce((n, x) => n + x.geometry.attributes.position.count / 3, 0) : 0;
}
