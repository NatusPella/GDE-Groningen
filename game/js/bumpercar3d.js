// De botsauto van de kermis (#389), het model: een ovaal chassis met een rubberen rand rondom, een lage motorkap met
// koplampen, een stoel, een stuur op een kolom en de contactpaal naar het rooster. Voorkant is +x. Eén samengevoegde
// geometrie per kleur (vertexkleuren, gedeeld door elke auto van die kleur), dus een draw call per auto in plaats van
// de zeven losse blokken van vroeger. Puur three.js, geen scene: scripts/bumpercar_test.mjs bouwt hem in Node.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix, markShared } from './pixelart3d.js';

const RUBBER = 0x1c1c1e, STEEL = 0x8a9096, DARK = 0x26292d, SEAT = 0x2a2a32, LAMP = 0xfff1c4, CHROME = 0xcfd3d6;
const cache = new Map();

export function buildBumperCarGeometry(color) {
  const B = new GeoBuilder(1);
  const oval = (r, h, sx, sz, y, c, seg = 14) => B.geo(new THREE.CylinderGeometry(r, r * 1.04, h, seg), composeMatrix(0, y, 0, 0, 0, 0, sx, 1, sz), c);
  oval(0.5, 0.16, 1.55, 1.1, 0.2, DARK);                               // chassisplaat
  oval(0.5, 0.34, 1.4, 0.96, 0.45, color);                             // kuipschil
  B.geo(new THREE.TorusGeometry(0.5, 0.085, 6, 18).rotateX(Math.PI / 2), composeMatrix(0, 0.36, 0, 0, 0, 0, 1.6, 1, 1.15), RUBBER); // rubberen rand
  // motorkap: een schuin aflopend blok voor, met de neus iets omlaag
  B.box(0.52, 0.66, 0, 0.62, 0.14, 0.86, color);
  B.box(0.78, 0.6, 0, 0.18, 0.2, 0.8, color);
  B.box(0.84, 0.62, 0, 0.04, 0.1, 0.5, DARK);                         // grille
  for (const s of [-1, 1]) {
    B.box(0.8, 0.7, s * 0.34, 0.07, 0.1, 0.16, LAMP);                  // koplampen
    B.box(-0.78, 0.6, s * 0.34, 0.05, 0.08, 0.12, 0xd8262e);          // achterlichten
  }
  // dashboard en stuur
  B.box(0.3, 0.78, 0, 0.16, 0.16, 0.7, 0x4a5058);
  B.geo(new THREE.TorusGeometry(0.13, 0.022, 6, 12), composeMatrix(0.12, 0.98, 0, 0.5, Math.PI / 2, 0), DARK);
  B.box(0.19, 0.9, 0, 0.04, 0.2, 0.04, STEEL, 0, 0, 0, -0.5);
  // stoel: zitting en rug, een hoofdsteun
  B.box(-0.2, 0.62, 0, 0.46, 0.14, 0.62, SEAT);
  B.box(-0.46, 0.86, 0, 0.1, 0.5, 0.58, color, 0, 0, 0, 0.12);   // rugleuning in de kleur van de auto
  B.box(-0.5, 1.15, 0, 0.08, 0.14, 0.3, SEAT);
  // contactpaal met de beugel erop
  B.geo(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6), composeMatrix(-0.62, 2.0, 0), STEEL);
  B.box(-0.62, 3.62, 0, 0.18, 0.05, 0.18, CHROME);
  B.box(-0.62, 0.62, 0, 0.1, 0.08, 0.1, STEEL);
  // een wit nummerbordje op elke flank
  B.box(0, 0.5, 0.52, 0.5, 0.1, 0.03, 0xf4f0e0);
  B.box(0, 0.5, -0.52, 0.5, 0.1, 0.03, 0xf4f0e0);
  return B.build();
}

export function bumperCarGeometry(color) {
  let g = cache.get(color);
  if (!g) { g = markShared(buildBumperCarGeometry(color)); cache.set(color, g); }
  return g;
}

let material = null;
export function bumperCarMaterial() {
  if (!material) {
    material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 });
    material.userData.shared = true;
  }
  return material;
}
