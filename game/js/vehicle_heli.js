import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { composeMatrix, tubeGeometry } from './pixelart3d.js';

// De helikopter in de stijl van de andere hoofdvoertuigen (24-11): een gebogen staartboom, een gebogen kielvin met onderste vin en
// beschermpoot, een stabilisator met eindplaten, een rotorkop met stuurplateau en koppelstangen, kapramen met bogen, een motorkap met
// inlaat, rooster en uitlaat, een kruisbuisonderstel met schoenen en treden, een zoeklicht en antennes en een geknepen rotorblad.
// Vervangt de staart, de vin en de skids van heli3d.js bodyGeometry; de cabine met stoelen en dashboard blijft zoals hij was.

const METAL = 0xb9bcbf;

function extrude(pts, depth, bevel) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, depth - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  return geo;
}

// P: lak, C: crème, TRIM: donker, K: { G_BODY, G_GLASS, G_LAMP, GLASS, TAIL_X, shade }
export function heliExteriorParts(B, P, C, TRIM, wrecked, K) {
  const { G_BODY, G_GLASS, G_LAMP, GLASS, TAIL_X, shade } = K;
  const T = (a, b, r1, r2, c, sides = 8, g = G_BODY) => B.geo(tubeGeometry(a, b, r1, r2, sides), null, c, g);
  // staartboom: drie stukken die geleidelijk dunner worden en lichtjes omhoog lopen, met een band en klinknaden
  const bx = [[-1.0, 1.62, 0.245], [-2.25, 1.66, 0.185], [-3.5, 1.7, 0.135], [TAIL_X + 0.2, 1.73, 0.09]];
  for (let i = 0; i < 3; i++) {
    T([bx[i][0], bx[i][1], 0], [bx[i + 1][0], bx[i + 1][1], 0], bx[i][2], bx[i + 1][2], P, 10);
    B.geo(new THREE.CylinderGeometry(bx[i + 1][2] + 0.006, bx[i + 1][2] + 0.006, 0.03, 10).rotateZ(Math.PI / 2), composeMatrix(bx[i + 1][0] + 0.05, bx[i + 1][1], 0), shade(P, 0.7), G_BODY);
  }
  // kielvin met een afgeronde top en een onderste vin met beschermpoot, stabilisator met eindplaten
  B.geo(extrude([[-4.0, 1.7], [-4.86, 1.7], [-4.98, 2.1], [-4.92, 2.5], [-4.7, 2.6], [-4.4, 2.1]], 0.07, 0.018), null, P, G_BODY);
  B.geo(extrude([[-4.35, 1.7], [-4.8, 1.7], [-4.78, 1.2], [-4.6, 1.14]], 0.06, 0.015), null, shade(P, 0.9), G_BODY);
  T([-4.62, 1.14, 0], [-4.05, 1.36, 0], 0.025, 0.02, TRIM, 6);
  B.box(-4.3, 1.74, 0, 0.62, 0.045, 1.08, C, G_BODY);
  for (const s of [1, -1]) B.box(-4.3, 1.84, s * 0.55, 0.62, 0.22, 0.03, P, G_BODY);
  // staartrotorkast met as en de rotorbeschermkap
  B.box(TAIL_X + 0.35, 1.5, 0, 0.22, 0.16, 0.2, TRIM, G_BODY);
  T([-4.35, 1.74, 0.0], [TAIL_X + 0.05, 1.72, 0.12], 0.035, 0.03, TRIM, 6);
  // rotorkop: as, stuurplateau, koppelstangen en bladgrepen (de bladen draaien om dezelfde as)
  B.geo(new THREE.TorusGeometry(0.15, 0.022, 4, 12).rotateX(Math.PI / 2), composeMatrix(-0.2, 2.74, 0), shade(TRIM, 1.6), G_BODY);
  for (const [dx, dz] of [[0.12, 0.08], [-0.12, -0.08]]) T([-0.2 + dx, 2.74, dz], [-0.2 + dx * 1.1, 2.94, dz * 1.1], 0.012, 0.012, METAL, 4);
  B.geo(new THREE.CylinderGeometry(0.17, 0.2, 0.06, 10), composeMatrix(-0.2, 2.5, 0), TRIM, G_BODY);
  // motorkap: inlaat voorop, rooster en een uitlaat met schuin einde, een olievuldop
  B.box(0.28, 2.18, 0, 0.1, 0.22, 0.5, TRIM, G_BODY);
  for (let k = 0; k < 5; k++) B.box(-0.55 + k * 0.1, 2.2, 0, 0.03, 0.012, 0.5, shade(P, 0.55), G_BODY);
  B.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), composeMatrix(-0.5, 2.26, 0.26), METAL, G_BODY);
  B.geo(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 8).rotateZ(Math.PI / 2), composeMatrix(-1.52, 2.1, 0.0), 0x3a3836, G_BODY);
  // onderstel: skids met een opgebogen neus, twee kruisbuizen met kappen, een schoen onder elke poot en een trede
  for (const s of [1, -1]) {
    const z = s * 0.98;
    T([-1.3, 0.1, z], [1.5, 0.08, z], 0.055, 0.055, TRIM, 8);
    T([1.5, 0.08, z], [2.0, 0.26, z * 0.97], 0.055, 0.05, TRIM, 8);
    T([-1.3, 0.1, z], [-1.5, 0.18, z], 0.055, 0.05, TRIM, 8);
    for (const x of [-0.7, 1.1]) {
      T([x, 0.14, z], [x, 0.62, s * 0.62], 0.045, 0.04, TRIM, 7);
      B.box(x, 0.06, z, 0.3, 0.025, 0.1, shade(TRIM, 1.5), G_BODY);
      B.box(x, 0.5, s * 0.7, 0.22, 0.05, 0.12, C, G_BODY);
    }
    B.box(0.2, 0.32, s * 0.98, 0.5, 0.025, 0.14, C, G_BODY); // opstap
  }
  for (const x of [-0.7, 1.1]) T([x, 0.62, -0.62], [x, 0.62, 0.62], 0.03, 0.03, TRIM, 6);
  // kapramen met bogen over de bol, een middenligger, deurgrepen en een wisser
  const cx = 0.55, rx = 1.55;
  for (const x of [0.1, 0.75, 1.35]) {
    const k = Math.sqrt(Math.max(0.05, 1 - ((x - cx) / rx) ** 2));
    B.geo(new THREE.TorusGeometry(1, 0.016, 3, 14, Math.PI).rotateY(Math.PI / 2), composeMatrix(x, 1.2, 0, 0, 0, 0, 1, 0.95 * k, 0.92 * k), shade(P, 0.6), G_BODY);
  }
  T([2.0, 1.1, 0], [0.0, 2.1, 0], 0.014, 0.014, shade(P, 0.6), 4);
  for (const s of [1, -1]) {
    B.box(1.15, 1.18, s * 0.9, 0.12, 0.025, 0.03, METAL, G_BODY);
    B.box(1.05, 1.25, s * 0.912, 0.012, 0.85, 0.01, shade(P, 0.3), G_BODY);
  }
  T([1.7, 1.28, 0.1], [1.78, 1.55, -0.2], 0.007, 0.007, TRIM, 3);
  // zoeklicht onder de neus, flitser, antennes, kompas op de staartboom
  B.geo(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 9).rotateZ(Math.PI / 2), composeMatrix(1.85, 0.72, 0), shade(TRIM, 2), G_BODY);
  B.geo(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 9).rotateZ(Math.PI / 2), composeMatrix(1.92, 0.72, 0), 0xf6f2dc, G_LAMP);
  T([-1.0, 2.2, 0.0], [-1.3, 2.62, 0.0], 0.008, 0.005, TRIM, 4);
  T([-3.2, 1.78, 0.0], [-3.4, 2.05, 0.0], 0.008, 0.005, TRIM, 4);
  B.box(-3.0, 1.82, 0, 0.12, 0.05, 0.06, TRIM, G_BODY);
  void GLASS; void G_GLASS; void wrecked;
}

// Een rotorblad met een versmalling naar de tip en een gele tip, een bladgreep bij de naaf; geeft een GeoBuilder(1) terug (twee bladen).
export function heliBladeParts(BB, R) {
  for (const s of [1, -1]) {
    // een plat blad dat dunner wordt: wortel 0,3 breed, tip 0,2, in vier trapjes
    const root = 0.62, segs = 5;
    let x0 = root;
    for (let i = 0; i < segs; i++) {
      const x1 = root + ((R - 0.15 - root) * (i + 1)) / segs, chord = 0.3 - (0.1 * (i + 0.5)) / segs;
      BB.box(s * (x0 + x1) / 2, 0.0, 0, x1 - x0 + 0.002, 0.044, chord, 0x1c1d20, 0, 0, 0, 0);
      BB.box(s * (x0 + x1) / 2, 0.026, -chord * 0.34, x1 - x0, 0.01, chord * 0.28, 0x2c2e33);
      x0 = x1;
    }
    BB.box(s * (R - 0.2), 0.003, 0, 0.4, 0.047, 0.2, 0xe8c93a);
    BB.box(s * 0.42, 0.02, 0, 0.5, 0.06, 0.18, 0x3a3d42);
    BB.box(s * 0.62, 0.0, 0, 0.1, 0.07, 0.28, 0x2a2c30);
  }
  BB.geo(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 10), composeMatrix(0, 0.06, 0), 0x2a2c30);
  return BB;
}
