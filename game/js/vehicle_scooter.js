import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix } from './pixelart3d.js';
import { shade, tubeAt, cyl, arcStrip } from './vehicle_bike.js';

// De step en de snorscooter in de stijl van de andere hoofdvoertuigen (24-11): afgeronde panelen (extrusies met afschuining),
// een beenschild dat om de benen valt, spiegels, een koplamp in de kap, uitlaat en demper, spatborden, standaard en kentekenplaat;
// de step met een dek met antislip, accu, scharnier en klem, rem, bel en display. Materiaalgroepen: 0 lak, 1 glas, 2 lampen.
// Het stuur (met de kap, de vork en het voorspatbord) is een eigen onderdeel dat om de stuurpen draait (stuurOverlay, #442).

const G_LAMP = 2;
const HEADLAMP = 0xf2efe4, TAIL = 0xa3211b, METAL = 0x8a8e92, CHROME = 0xb9bcbf, DARK = 0x2a2b2e, RUBBER = 0x1b1b1c, TIRE = 0x1b1b1c, RIM = 0x9ea2a6;
const SEAT = 0x1b1b1c, SEAM = 0x3a3a3d, AMBER = 0xd9822b, PLATE = 0xe3bb1c;

// Een vlak profiel (xy) met een diepte in z en een afgeronde rand: de afgeronde panelen van een scooter.
function profile(B, pts, depth, bevel, color, z = 0, group = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, depth - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -(depth - bevel * 2) / 2 + z);
  return B.geo(geo, null, color, group);
}

// Het wiel van een step of scooter: dikke band, velg met vijf armen, naaf en een merkteken voor de draairichting (#436).
export function scooterWheelRich(B, r, tire, opts = {}) {
  B.geo(new THREE.TorusGeometry(r - tire, tire, 8, 20), null, TIRE);
  const rr = r - tire * 1.75;
  B.geo(new THREE.CylinderGeometry(rr, rr, tire * 1.5, 20).rotateX(Math.PI / 2), null, opts.rim || RIM);
  B.geo(new THREE.CylinderGeometry(rr * 0.8, rr * 0.8, tire * 1.5 + 0.012, 20).rotateX(Math.PI / 2), null, shade(opts.rim || RIM, 0.55));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    B.box(Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, 0, rr * 0.7, rr * 0.2, tire * 1.5 + 0.02, opts.rim || RIM, 0, 0, 0, a);
  }
  cyl(B, 0, 0, 0, rr * 0.22, tire * 1.5 + 0.03, 0x6a6d70, 8);
  B.box(r - tire, 0, 0, tire * 0.6, tire * 0.6, tire * 2 + 0.01, 0xd8452f); // merkteken op de flank van de band
  if (opts.disc) cyl(B, 0, 0, tire * 0.9, rr * 0.7, 0.006, 0x6a6d70, 14);
  return B;
}

// ---- de step -------------------------------------------------------------------------------------------------------------
// Vaste maten: wielen 0,11 op x = 0,42 en -0,43; stuurpen op x = 0,43; stuur 1,03 hoog.
export function stepFrameParts(B, color) {
  const lite = shade(color, 0.82);
  // dek met afgeronde randen, accu eronder, antislip bovenop en oranje reflectoren op de zijkant
  profile(B, [[-0.4, 0.125], [-0.36, 0.165], [0.28, 0.165], [0.34, 0.14], [0.36, 0.115], [0.28, 0.1], [-0.34, 0.1]], 0.2, 0.02, color);
  B.box(-0.04, 0.075, 0, 0.56, 0.05, 0.15, 0x26272a);
  B.box(-0.04, 0.045, 0, 0.5, 0.012, 0.12, 0x3a3b3e);
  B.box(-0.06, 0.172, 0, 0.6, 0.008, 0.16, 0x1d1d1e);
  for (let k = 0; k < 6; k++) B.box(-0.3 + k * 0.1, 0.177, 0, 0.012, 0.004, 0.15, 0x2c2c2e);
  for (const s of [1, -1]) { B.box(-0.3, 0.13, s * 0.103, 0.05, 0.02, 0.006, AMBER); B.box(0.22, 0.13, s * 0.103, 0.05, 0.02, 0.006, AMBER); }
  // stuurkolom: hals met het scharnier en de klem, het onderstel van de vork en de veerpoten
  B.geo(new THREE.CylinderGeometry(0.036, 0.04, 0.1, 8), composeMatrix(0.38, 0.2, 0, 0, 0, -0.12), color);
  cyl(B, 0.4, 0.3, 0, 0.04, 0.07, DARK, 8, 'y');
  B.box(0.36, 0.17, 0, 0.1, 0.07, 0.11, lite);
  for (const s of [1, -1]) {
    tubeAt(B, [0.43, 0.2, s * 0.035], [0.43, 0.115, s * 0.04], 0.013, 0.012, METAL, 6);
    cyl(B, 0.43, 0.11, s * 0.045, 0.02, 0.012, METAL, 8);
    cyl(B, -0.43, 0.11, s * 0.05, 0.02, 0.012, METAL, 8);
  }
  B.box(0.43, 0.2, 0, 0.06, 0.1, 0.06, DARK);
  // spatborden (voor en achter) en de achterlichten, de remschijf en de standaard
  arcStrip(B, 0.43, 0.11, 0.15, 0.06, 0.1, 2.0, 8, color);
  arcStrip(B, -0.43, 0.11, 0.15, 0.065, 1.1, 3.0, 8, color);
  B.box(-0.55, 0.195, 0, 0.014, 0.03, 0.08, TAIL, G_LAMP);
  B.box(-0.54, 0.145, 0, 0.012, 0.015, 0.04, 0xd8452f);
  B.box(0.405, 0.42, 0, 0.035, 0.05, 0.07, HEADLAMP, G_LAMP);
  cyl(B, 0.4, 0.42, 0, 0.03, 0.05, DARK, 8, 'x');
  tubeAt(B, [-0.14, 0.1, -0.09], [-0.26, 0.012, -0.14], 0.01, 0.01, DARK, 5);
  B.box(-0.265, 0.01, -0.14, 0.05, 0.012, 0.035, DARK);
  B.box(-0.38, 0.1, 0.0, 0.07, 0.06, 0.14, 0x3a3b3e); // motor in het achterwiel
  B.box(-0.42, 0.22, 0.0, 0.03, 0.035, 0.1, color); // kuip van de achterlamp
}

export function stepSteerParts(B, color, px) {
  const H = 1.2, BX = 0.34;   // stuurhoogte en stuurplek (de modulaire arm is kort: het stuur dicht bij de borst)
  const T = (a, b, r1, r2, c, sides = 8) => tubeAt(B, [a[0] - px, a[1], a[2]], [b[0] - px, b[1], b[2]], r1, r2, c, sides);
  const box = (x, y, z, a, b, c, col, g = 0) => B.box(x - px, y, z, a, b, c, col, g);
  // stuurpen met scharnierklem, buis en een dwarsstang met handvatten
  T([0.43, 0.1, 0], [BX + 0.02, H - 0.01, 0], 0.034, 0.027, color, 8);
  cyl(B, 0.42 - px + 0.002, 0.42, 0, 0.042, 0.06, DARK, 8, 'y');
  cyl(B, 0.39 - px, 0.95, 0, 0.037, 0.05, DARK, 8, 'y');
  box(0.405, 0.44, 0, 0.012, 0.08, 0.1, color);
  T([BX, H, -0.25], [BX, H, 0.25], 0.0155, 0.0155, 0x2a2a2b, 8);
  for (const s of [1, -1]) {
    T([BX, H, s * 0.17], [BX, H, s * 0.27], 0.022, 0.022, RUBBER, 8);
    cyl(B, BX - px, H, s * 0.275, 0.016, 0.01, METAL, 6);
    T([BX - 0.02, H + 0.01, s * 0.15], [BX - 0.07, H + 0.03, s * 0.17], 0.006, 0.005, METAL, 4); // remhendel
    T([BX - 0.04, H + 0.02, s * 0.16], [0.4, 0.8, s * 0.01], 0.003, 0.003, DARK, 3); // kabel
  }
  box(BX, H + 0.025, 0, 0.07, 0.03, 0.11, RUBBER);
  box(BX - 0.02, H + 0.042, 0, 0.012, 0.018, 0.08, 0x5fd0e0, G_LAMP);
  B.geo(new THREE.SphereGeometry(0.024, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(BX - px, H + 0.015, -0.12), METAL);
  box(BX, H + 0.01, -0.12, 0.028, 0.012, 0.028, DARK);
  T([BX, H + 0.01, 0.17], [BX, H + 0.01, 0.2], 0.026, 0.026, 0x2a5f8a, 8); // gashendel
}
export const stepGripSpec = () => ({ x: 0.34, y: 1.2, z: 0.22, px: 0.4 });

// ---- de snorscooter ------------------------------------------------------------------------------------------------------
// Ontwerplengte 1,53 m (de mesh schaalt in x naar de lengte van het model); wielen 0,23 op x = 0,55 en -0,52; zadel 0,8 hoog.
export function mopedFrameParts(B, color) {
  const lite = shade(color, 1.12), deep = shade(color, 0.78);
  // vloerplaat met rubberen ribbels en zijkanten
  B.box(0.08, 0.29, 0, 0.66, 0.045, 0.34, DARK);
  for (let k = 0; k < 6; k++) B.box(-0.14 + k * 0.1, 0.316, 0, 0.03, 0.008, 0.3, 0x3d3e42);
  for (const s of [1, -1]) {
    B.box(0.1, 0.27, s * 0.19, 0.7, 0.07, 0.03, color);
    B.box(0.1, 0.235, s * 0.19, 0.7, 0.016, 0.034, CHROME);
  }
  // beenschild: een voorste vlak met twee schuine zijvlakken die om de benen vallen, met afgeronde bovenrand
  profile(B, [[0.33, 0.28], [0.5, 0.32], [0.5, 0.56], [0.47, 0.96], [0.39, 0.96], [0.4, 0.56], [0.34, 0.36]], 0.3, 0.025, color);
  for (const s of [1, -1]) {
    B.box(0.4, 0.6, s * 0.2, 0.06, 0.6, 0.18, color, 0, 0, s * 0.5, 0);
    B.box(0.37, 0.6, s * 0.24, 0.02, 0.5, 0.1, deep, 0, 0, s * 0.5, 0);
  }
  // zijkappen achter het zadel: twee afgeronde panelen, een tunnel ertussen, bult voor de motor
  for (const s of [1, -1]) {
    profile(B, [[-0.08, 0.34], [-0.7, 0.34], [-0.8, 0.45], [-0.8, 0.6], [-0.7, 0.71], [-0.12, 0.72], [-0.06, 0.55]], 0.19, 0.035, color, s * 0.125);
    B.box(-0.42, 0.405, s * 0.225, 0.5, 0.012, 0.01, lite);
    B.box(-0.7, 0.58, s * 0.225, 0.14, 0.012, 0.01, lite);
  }
  B.box(-0.38, 0.55, 0, 0.64, 0.3, 0.1, deep);
  B.box(-0.22, 0.4, 0, 0.3, 0.1, 0.4, 0x3a3b3e); // motorblok onder het zadel
  // zadel: lang en afgerond, met een lichte naad en een opstaand achterstuk
  profile(B, [[-0.74, 0.7], [-0.74, 0.78], [-0.66, 0.815], [-0.5, 0.81], [-0.3, 0.8], [-0.14, 0.8], [-0.1, 0.77], [-0.12, 0.7]], 0.31, 0.03, SEAT);
  B.box(-0.4, 0.812, 0, 0.5, 0.004, 0.012, SEAM);
  for (const s of [1, -1]) B.box(-0.4, 0.81, s * 0.1, 0.46, 0.004, 0.01, SEAM);
  // achterkant: lichtunit, kentekenplaat, bagagedrager met rail en reflectoren
  B.box(-0.81, 0.56, 0, 0.03, 0.07, 0.2, TAIL, G_LAMP);
  B.box(-0.83, 0.545, 0, 0.012, 0.11, 0.2, 0x2a2a2d);
  B.box(-0.845, 0.46, 0, 0.008, 0.1, 0.17, PLATE);
  B.box(-0.8, 0.46, 0.0, 0.03, 0.025, 0.03, 0xd8452f);
  for (const s of [1, -1]) {
    tubeAt(B, [-0.8, 0.86, s * 0.12], [-0.42, 0.86, s * 0.12], 0.012, 0.012, CHROME, 6);
    for (const x of [-0.8, -0.42]) tubeAt(B, [x, 0.86, s * 0.12], [x, 0.74, s * 0.12], 0.01, 0.01, CHROME, 6);
  }
  tubeAt(B, [-0.8, 0.86, -0.12], [-0.8, 0.86, 0.12], 0.012, 0.012, CHROME, 6);
  for (const x of [-0.72, -0.6, -0.48]) tubeAt(B, [x, 0.86, -0.12], [x, 0.86, 0.12], 0.007, 0.007, CHROME, 5);
  // uitlaat met demper rechts, schokdemper achter, standaard en passagiersrustjes
  tubeAt(B, [-0.12, 0.34, 0.22], [-0.45, 0.34, 0.24], 0.026, 0.03, CHROME, 8);
  cyl(B, -0.6, 0.35, 0.245, 0.055, 0.34, CHROME, 10, 'x');
  cyl(B, -0.44, 0.35, 0.245, 0.058, 0.03, 0x8a8e92, 10, 'x');
  B.box(-0.6, 0.41, 0.245, 0.3, 0.012, 0.07, 0x6a6d70);
  for (const s of [1, -1]) {
    tubeAt(B, [-0.52, 0.34, s * 0.16], [-0.62, 0.62, s * 0.16], 0.014, 0.014, 0xb8932b, 6);
    cyl(B, -0.52, 0.23, s * 0.05, 0.02, 0.014, METAL, 8);
    B.box(-0.3, 0.33, s * 0.23, 0.12, 0.016, 0.06, DARK);
  }
  tubeAt(B, [-0.18, 0.24, -0.16], [-0.3, 0.02, -0.22], 0.012, 0.012, DARK, 5);
  B.box(-0.31, 0.01, -0.22, 0.07, 0.014, 0.04, DARK);
  // achterspatbord en rem rond het achterwiel (voor de wielkast)
  arcStrip(B, -0.52, 0.23, 0.29, 0.14, 0.3, 2.0, 8, color);
}

export function mopedSteerParts(B, color, px) {
  const lite = shade(color, 1.12);
  const T = (a, b, r1, r2, c, sides = 8) => tubeAt(B, [a[0] - px, a[1], a[2]], [b[0] - px, b[1], b[2]], r1, r2, c, sides);
  const box = (x, y, z, a, b, c, col, g = 0, rz = 0) => B.box(x - px, y, z, a, b, c, col, g, 0, 0, rz);
  // stuurkolom, vork met twee poten, remtrommel, afgeronde stuurkap met koplamp en meterkast
  T([0.46, 0.7, 0], [0.42, 1.04, 0], 0.032, 0.03, DARK, 8);
  T([0.545, 0.5, 0.08], [0.55, 0.23, 0.065], 0.024, 0.018, CHROME, 8);
  T([0.545, 0.5, -0.08], [0.55, 0.23, -0.065], 0.024, 0.018, CHROME, 8);
  box(0.54, 0.52, 0, 0.07, 0.05, 0.22, color);
  cyl(B, 0.55 - px, 0.23, 0, 0.1, 0.08, 0x3a3b3e, 12);
  arcStrip(B, 0.55 - px, 0.23, 0.275, 0.13, -0.3, 1.95, 10, color);
  B.geo(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), composeMatrix(0.46 - px, 0.98, 0, 0, 0, 0, 0.17, 0.11, 0.2), color);
  B.geo(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), composeMatrix(0.46 - px, 0.98, 0, 0, 0, 0, 0.16, 0.05, 0.19), shade(color, 0.7));
  cyl(B, 0.605 - px, 0.99, 0, 0.075, 0.05, CHROME, 12, 'x');
  cyl(B, 0.632 - px, 0.99, 0, 0.062, 0.012, HEADLAMP, 12, 'x');
  box(0.64, 0.99, 0, 0.008, 0.1, 0.1, HEADLAMP, G_LAMP);
  box(0.5, 1.085, 0, 0.1, 0.035, 0.15, DARK);
  box(0.46, 1.1, 0, 0.012, 0.02, 0.1, 0x5fd0e0, G_LAMP);
  // stuurstang, handvatten, hendels en spiegels
  T([0.37, 1.06, -0.32], [0.37, 1.06, 0.32], 0.017, 0.017, CHROME, 8);
  for (const s of [1, -1]) {
    T([0.37, 1.06, s * 0.22], [0.37, 1.06, s * 0.34], 0.025, 0.025, RUBBER, 8);
    cyl(B, 0.37 - px, 1.06, s * 0.345, 0.02, 0.01, METAL, 6);
    T([0.4, 1.065, s * 0.2], [0.47, 1.06, s * 0.22], 0.01, 0.008, CHROME, 6);
    T([0.36, 1.07, s * 0.3], [0.33, 1.2, s * 0.33], 0.009, 0.008, CHROME, 6);
    box(0.33, 1.225, s * 0.34, 0.022, 0.06, 0.1, DARK);
    box(0.318, 1.225, s * 0.34, 0.004, 0.045, 0.08, 0x9fb4c0);
    box(0.5, 0.99, s * 0.19, 0.02, 0.035, 0.03, AMBER, G_LAMP);
  }
  void lite;
}
export const mopedGripSpec = () => ({ x: 0.37, y: 1.06, z: 0.28, px: 0.44 });
