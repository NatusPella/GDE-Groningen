// Gedeelde bouwstenen voor de opgewaardeerde bestelbus, ambulance, foodtruck en vrachtwagen (24-11, voertuigen-weg):
// afgeronde profielen en plattegronden, een dik wiel met flank, velg en spaken, en kleine onderdelen (koplamp, spiegel, handvat,
// grille). Alles in vertexkleuren op een GeoBuilder, zonder textuur, in de vormtaal van het Quaternius-autopakket (CC0): grote,
// afgeronde vlakken met vaste facetten. Geen imports uit models3d_vehicles.js: de kleuren en groepen komen mee in `K`.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, composeMatrix } from './pixelart3d.js';

// Rondt de hoeken van een veelhoek af: elke hoek wordt een boog met n stukken, met straal r (kleiner als de zijden korter zijn).
export function fillet(pts, r, n = 3, closed = true) {
  const out = [];
  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    if (!closed && (i === 0 || i === N - 1)) { out.push(p); continue; }
    const a = pts[(i + N - 1) % N], b = pts[(i + 1) % N];
    const ra = Array.isArray(r) ? r[i] : r;
    const u = [a[0] - p[0], a[1] - p[1]], w = [b[0] - p[0], b[1] - p[1]];
    const lu = Math.hypot(...u), lw = Math.hypot(...w);
    if (!ra || lu < 1e-6 || lw < 1e-6) { out.push(p); continue; }
    const k = Math.min(ra, lu * 0.48, lw * 0.48);
    const s = [p[0] + u[0] / lu * k, p[1] + u[1] / lu * k], e = [p[0] + w[0] / lw * k, p[1] + w[1] / lw * k];
    for (let j = 0; j <= n; j++) {
      const t = j / n, m1 = (1 - t) * (1 - t), m2 = 2 * t * (1 - t), m3 = t * t; // kwadratische Bezier met het hoekpunt als stuurpunt
      out.push([m1 * s[0] + m2 * p[0] + m3 * e[0], m1 * s[1] + m2 * p[1] + m3 * e[1]]);
    }
  }
  return out;
}

// Een plattegrond (x, z) uitgetrokken tussen y0 en y0 + h, met afgeronde randen (bevel). Voor bumpers, dakkappen en dakplaten.
export function planExtrude(ptsXZ, y0, h, bevel = 0.02, segs = 1) {
  const shape = new THREE.Shape();
  ptsXZ.forEach((p, i) => (i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1])));
  const dep = Math.max(0.01, h - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: dep, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments: segs, curveSegments: 1 });
  geo.translate(0, 0, -dep / 2);
  geo.rotateX(-Math.PI / 2); // (x, y, z) -> (x, z, -y): de diepte wordt de hoogte, de y van de vorm wordt -z
  geo.translate(0, y0 + h / 2, 0);
  return geo;
}

// Een cilinder langs een as, op een plek.
export function cyl(B, x, y, z, r0, r1, len, axis, color, seg = 8, group = 0) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1);
  if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  B.geo(g, composeMatrix(x, y, z), color, group);
}

// Een balk tussen twee punten (spiegelarm, stang, steun).
export function bar(B, a, b, t, color, group = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(len, t, t);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
  B.geo(g, new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1)), color, group);
}

// Een dik wiel met bolle flank, velg met rand, vijf spaken, naaf met moeren en een donker merkteken (de draairichting). Vijf spaken
// staan op 72 graden: de wieldraaistap van models3d_vehicles.js (SPIN_STEP) laat het niet achteruit lijken. Eén gedeelde geometrie.
export function richWheelGeometry(r, w, K) {
  const B = new GeoBuilder(1);
  const axleZ = (g) => g.rotateX(Math.PI / 2);
  // de band als omwenteling: loopvlak, afgeronde schouders, bolle flank tot de velgrand
  const hw = w / 2, rim = r * 0.6;
  const prof = [[rim - 0.01, -hw * 0.96], [r * 0.8, -hw], [r * 0.94, -hw * 0.9], [r, -hw * 0.6], [r, hw * 0.6], [r * 0.94, hw * 0.9], [r * 0.8, hw], [rim - 0.01, hw * 0.96]].map((p) => new THREE.Vector2(p[0], p[1]));
  B.geo(axleZ(new THREE.LatheGeometry(prof, 14)), null, K.TIRE);
  // velg: schijf met opstaande rand, spaken en naaf
  B.geo(axleZ(new THREE.CylinderGeometry(rim, rim, w + 0.012, 12, 1)), null, K.RIM);
  B.geo(axleZ(new THREE.CylinderGeometry(rim * 0.84, rim * 0.84, w + 0.03, 12, 1)), null, 0x5b5e62);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    B.box(Math.cos(a) * rim * 0.45, Math.sin(a) * rim * 0.45, 0, rim * 0.8, rim * 0.22, w + 0.045, K.RIM, 0, 0, 0, a);
  }
  B.geo(axleZ(new THREE.CylinderGeometry(rim * 0.26, rim * 0.3, w + 0.07, 10, 1)), null, 0x7a7e82);
  B.box(r * 0.8, 0, 0, r * 0.14, r * 0.17, w + 0.012, 0x3a3c3e);
  return B.build();
}

// Een ronde koplamp in een donkere behuizing met een chromen rand (kijkt langs +x), een kleine richtingaanwijzer eronder.
export function headlamp(B, x, y, z, r, K, side = 1) {
  cyl(B, x - 0.012, y, z, r * 1.18, r * 1.18, 0.05, 'x', 0x1e1f21, 8);
  B.geo(new THREE.RingGeometry(r * 0.9, r * 1.1, 8, 1).rotateY(Math.PI / 2), composeMatrix(x + 0.026, y, z), K.CHROME); // een chromen ring om de lens, geen schijf onder de lens
  cyl(B, x + 0.035, y, z, r * 0.92, r * 0.92, 0.05, 'x', K.HEADLAMP, 8, 2); // de lens steekt ruim voor de rand uit (geen vlakken op elkaar)
  B.box(x + 0.012, y - r * 1.38, z + side * r * 0.1, 0.03, r * 0.42, r * 1.3, K.INDICATOR, 2);
}

// Een buitenspiegel: arm vanaf de stijl, huis in lak met een glasvlak, aan de kant `s` (+1 rechts).
export function mirror(B, x, y, z, s, paint, K, arm = 0.2) {
  bar(B, [x - 0.04, y - 0.05, z], [x - 0.02, y + 0.02, z + s * arm], 0.035, 0x1c1c1e);
  B.box(x - 0.03, y + 0.1, z + s * (arm + 0.05), 0.09, 0.26, 0.1, 0x1f2022);
  B.box(x - 0.055, y + 0.1, z + s * (arm + 0.05), 0.012, 0.2, 0.09, K.GLASS, 1);
  B.box(x - 0.03, y + 0.1, z + s * (arm + 0.05), 0.05, 0.2, 0.082, paint);
}

// Een deurklink: plaatje met een greep, op de flank (+s kant).
export function handle(B, x, y, z, s, K) {
  B.box(x, y, z + s * 0.004, 0.17, 0.045, 0.014, 0x2a2b2d);
  B.box(x, y + 0.004, z + s * 0.013, 0.13, 0.022, 0.012, K.CHROME);
}

// Een grille met chromen kader en lamellen (voorkant, kijkt langs +x), midden op z = 0.
export function grille(B, x, y, w, h, n, K) {
  B.box(x, y, 0, 0.02, h + 0.05, w + 0.05, K.CHROME);
  B.box(x + 0.012, y, 0, 0.02, h, w, 0x1b1c1e);
  for (let i = 0; i < n; i++) B.box(x + 0.024, y - h / 2 + h * (i + 0.5) / n, 0, 0.012, h / n * 0.45, w * 0.96, 0x4a4d52);
}

// Een achterlichtblok: donkere behuizing met een rode en een oranje lamp, kijkt langs -x.
export function taillight(B, x, y, z, h, K, w = 0.14) {
  B.box(x, y, z, 0.03, h, w, 0x2a1a1a);
  B.box(x - 0.012, y + h * 0.2, z, 0.02, h * 0.5, w * 0.8, K.TAIL, 2);
  B.box(x - 0.012, y - h * 0.3, z, 0.02, h * 0.2, w * 0.8, K.INDICATOR, 2);
}

// Knipt de driehoeken van een groep langs vlakken x = c (de plekken waar de plattegrondafronding van neus en kont begint). Een
// driehoek van de hele flank kantelt anders mee als alleen zijn hoeken verschuiven en geeft diagonale lichtbanden; met een knip op
// elke plek van de afronding blijft de rest van het vlak vlak. Alleen driehoeken die een vlak kruisen krijgen er een of twee bij.
export function splitGroupAtX(B, gi, xs, minEdge = 0.7) {
  const G = B.groups[gi], p = G.p.slice(), c = G.c.slice();
  G.p.length = 0; G.c.length = 0; G.uv.length = 0;
  const lang = (t) => Math.max(Math.hypot(t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]), Math.hypot(t[2][0] - t[1][0], t[2][1] - t[1][1], t[2][2] - t[1][2]), Math.hypot(t[0][0] - t[2][0], t[0][1] - t[2][1], t[0][2] - t[2][2]));
  const cut = (t, k, rgb) => {
    if (k >= xs.length || (k === 0 && lang(t) < minEdge)) { B._push(gi, t[0], t[1], t[2], rgb, null); return; }
    const x = xs[k], d = t.map((q) => q[0] - x);
    const pos = d.filter((v) => v > 1e-6).length, neg = d.filter((v) => v < -1e-6).length;
    if (!pos || !neg) { cut(t, k + 1, rgb); return; }
    // één hoekpunt aan de ene kant, twee aan de andere: een driehoek en een vierhoek (twee driehoeken)
    const alone = pos === 1 ? d.findIndex((v) => v > 1e-6) : neg === 1 ? d.findIndex((v) => v < -1e-6) : -1;
    if (alone < 0) { cut(t, k + 1, rgb); return; } // een hoekpunt op het vlak: niets te knippen
    const a = t[alone], b = t[(alone + 1) % 3], e = t[(alone + 2) % 3];
    const lerp = (u, v) => { const f = (x - u[0]) / (v[0] - u[0]); return [x, u[1] + (v[1] - u[1]) * f, u[2] + (v[2] - u[2]) * f]; };
    const ab = lerp(a, b), ae = lerp(a, e);
    cut([a, ab, ae], k + 1, rgb); cut([ab, b, e], k + 1, rgb); cut([ab, e, ae], k + 1, rgb);
  };
  for (let o = 0; o < p.length; o += 9) cut([[p[o], p[o + 1], p[o + 2]], [p[o + 3], p[o + 4], p[o + 5]], [p[o + 6], p[o + 7], p[o + 8]]], 0, [c[o], c[o + 1], c[o + 2]]);
}

// Een lage rib op de flank (z = het vlak van de flank, s = kant, th = hoogte van de rib): alleen de buitenkant en de boven- en
// onderkant (6 driehoeken in plaats van 12; de rest zit in de romp). Voor persribben, strips en markeringslichten.
export function ridge(B, x, y, z, sx, sy, th, color, s, group = 0) {
  const x0 = x - sx / 2, x1 = x + sx / 2, y0 = y - sy / 2, y1 = y + sy / 2, zo = z + s * th;
  B.quadOut([x0, y0, zo], [x1, y0, zo], [x1, y1, zo], [x0, y1, zo], [0, 0, s], color, group);
  B.quadOut([x0, y1, z], [x1, y1, z], [x1, y1, zo], [x0, y1, zo], [0, 1, 0], color, group);
  B.quadOut([x0, y0, z], [x1, y0, z], [x1, y0, zo], [x0, y0, zo], [0, -1, 0], color, group);
}
