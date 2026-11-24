// Gedeelde bouwstenen voor de grote voertuigen (24-11, Quaternius-stijl: afgeronde grote vlakken met vaste facetten, egale kleuren):
// een afgeschuinde doos, een geëxtrudeerd zijprofiel met bevel, een buis tussen twee punten, glas als strook en een banden-/wielbouwer.
// Puur geometrie in een GeoBuilder (groep 0 lak, 1 glas, 2 lampen: vehicleMaterials in models3d_vehicles.js). Voertuigcoördinaten:
// x vooruit, y omhoog, z rechts.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix } from './pixelart3d.js';

export const G_BODY = 0, G_GLASS = 1, G_LAMP = 2;
export const C = {
  TRIM: 0x1f2022, DARK: 0x2a2d31, STEEL: 0x6b6e72, LIGHT: 0xa9aaa6, GLASS: 0x2b3740, HEADLAMP: 0xf2efe4, TAIL: 0xa3211b,
  INDICATOR: 0xd9822b, TIRE: 0x1b1b1c, RIM: 0x9ea2a6, CHROME: 0xb9bcbf, SEAT: 0x2b2d32, YELLOW: 0xd9a521,
};

export function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

// Doos met afgeschuinde langsribben (het profiel in het x-y-vlak is een achthoek), midden (cx, cy, cz), maat (sx, sy, sz).
export function chamfBox(B, cx, cy, cz, sx, sy, sz, c, color, group = G_BODY) {
  const hx = sx / 2, hy = sy / 2;
  const s = new THREE.Shape();
  s.moveTo(-hx + c, -hy); s.lineTo(hx - c, -hy); s.lineTo(hx, -hy + c); s.lineTo(hx, hy - c);
  s.lineTo(hx - c, hy); s.lineTo(-hx + c, hy); s.lineTo(-hx, hy - c); s.lineTo(-hx, -hy + c);
  B.geo(new THREE.ExtrudeGeometry(s, { depth: sz, bevelEnabled: false, curveSegments: 1 }).translate(cx, cy, cz - sz / 2), null, color, group);
}

// Een veelhoek in het x-y-vlak, over de breedte (z) geëxtrudeerd met een afgeronde rand (bevel). pts: [[x, y], ...].
export function prism(B, pts, depth, z, color, bevel = 0.04, group = G_BODY) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const d = Math.max(0.01, depth - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, z - d / 2);
  B.geo(g, null, color, group);
}

// Een buis (cilinder) van punt a naar punt b.
export function tube(B, a, b, r, color, seg = 8, group = G_BODY) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  B.geo(new THREE.CylinderGeometry(r, r, len, seg), m, color, group);
}

// Een balk van punt a naar punt b met een doorsnede sy x sz (sy in het x-y-vlak).
export function beam(B, a, b, sy, sz, color, group = G_BODY) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  B.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, len, sy, sz, color, group, 0, 0, Math.atan2(dy, dx));
}

// Een glasplaat als vierhoek (punten tegen de klok in gezien vanaf de zichtkant) die naar beide kanten gaat zichtbaar zijn: voor- en achterzijde.
export function glassQuad(B, a, b, c, d, out) {
  B.quadOut(a, b, c, d, out, C.GLASS, G_GLASS);
}

// Een wiel met zijwand, velg met naaf en spaken, en noppen of een profiel. lugs 0 = glad (gewone band).
export function lugWheel(r, w, { lugs = 16, rim = C.RIM, hub = 0x55585c, diep = 0.1, wall = 0xd6d0c0 } = {}) {
  const B = new GeoBuilder(1);
  const axle = (geo) => geo.rotateX(Math.PI / 2);
  B.geo(axle(new THREE.CylinderGeometry(r, r, w, 18, 1)), null, C.TIRE);
  B.geo(axle(new THREE.CylinderGeometry(r * 0.86, r * 0.86, w + 0.03, 18, 1)), null, shade(C.TIRE, 1.5));
  B.geo(axle(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.05, 12, 1)), null, rim);
  B.geo(axle(new THREE.CylinderGeometry(r * 0.34, r * 0.34, w + 0.07, 10, 1)), null, shade(rim, 0.8));
  B.geo(axle(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w + 0.1, 8, 1)), null, hub);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    B.box(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, 0, r * 0.14, r * 0.1, w + 0.06, hub, 0, 0, 0, a);
  }
  B.box(r * 0.78, 0, 0, r * 0.16, r * 0.18, w + 0.04, 0x3a3c3e);
  for (let k = 0; k < lugs; k++) {
    for (const s of [1, -1]) {
      const a = ((k + (s > 0 ? 0 : 0.5)) / lugs) * Math.PI * 2, tr = r + r * 0.02;
      B.box(Math.cos(a) * tr, Math.sin(a) * tr, s * w * 0.25, r * diep, (Math.PI * 2 * r / lugs) * 0.5, w * 0.42, 0x101011, 0, s * 0.4, 0, a);
    }
  }
  void wall;
  return B.build();
}

export { GeoBuilder, composeMatrix, THREE };
