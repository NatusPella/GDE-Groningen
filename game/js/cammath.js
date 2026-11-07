// Hier en daar een blok uit de grote bestanden (#497): de pure camera-meetkunde van scene3d.js.
// Geen THREE, geen DOM: de volgcam, de prop- en boomray en de ellipsoïde-toets rekenen alleen met getallen,
// zodat een test ze los kan natrekken (scripts/cammath_test.mjs) en scene3d.js alleen de glue houdt.
import { vehicleHeight } from './vaultkit.js';

// (#463) De volgcam van de bestuurder hoort buiten de eigen carrosserie te blijven. Trekt een muur of prop
// hem naar binnen - en in de pauze blijft dat beeld staan - dan wijkt hij boven het dak uit in plaats van in
// de auto te hangen. Punt en uitkomst in beeldcoördinaten, net als de camera zelf: [x, hoogte, z] (z is de
// kaart-y), zodat de volgorde aan beide kanten gelijk is. Het dak komt uit vaultkit.js (vehicleHeight), dat
// elke soort kent: een hoge bus, een trekker of een maaidorser wijkt net zo goed uit als een auto.
export function camClearOfVehicle(x, h, z, v, marge = 0.4) {
  if (!v || !v.model || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return [x, h, z];
  const halfLen = (v.model.len || 0) / 2 + marge;
  const halfWid = (v.model.wid || 0) / 2 + marge;
  const dx = x - v.x, dz = z - v.y;
  const c = Math.cos(v.angle || 0), s = Math.sin(v.angle || 0);
  const lx = dx * c + dz * s, lz = -dx * s + dz * c;
  if (Math.abs(lx) >= halfLen || Math.abs(lz) >= halfWid) return [x, h, z];
  const roof = (v.z || 0) + vehicleHeight(v) + 0.6;
  return h < roof ? [x, roof, z] : [x, h, z];
}

// Distance along the eye->camera ray to a vertical cylinder (radius r, foot yb, top yt) around (cx, cz),
// or Infinity.
export function rayCylinder(ox, oy, oz, ux, uy, uz, len, cx, cz, r, yb, yt) {
  const fx = ox - cx, fz = oz - cz;
  const a = ux * ux + uz * uz;
  let t0 = 0, t1 = len;
  if (a < 1e-9) {
    if (fx * fx + fz * fz > r * r) return Infinity;
  } else {
    const b = fx * ux + fz * uz;
    const disc = b * b - a * (fx * fx + fz * fz - r * r);
    if (disc < 0) return Infinity;
    const sq = Math.sqrt(disc);
    t0 = Math.max(t0, (-b - sq) / a);
    t1 = Math.min(t1, (-b + sq) / a);
  }
  if (Math.abs(uy) < 1e-9) {
    if (oy < yb || oy > yt) return Infinity;
  } else {
    const s0 = (yb - oy) / uy, s1 = (yt - oy) / uy;
    t0 = Math.max(t0, Math.min(s0, s1));
    t1 = Math.min(t1, Math.max(s0, s1));
  }
  return t0 <= t1 ? t0 : Infinity;
}

// Ray/segment against an axis-aligned ellipsoid: true when the segment from o to o+d passes through it
// (or starts inside it).
export function segHitsEllipsoid(ox, oy, oz, dx, dy, dz, cx, cy, cz, rx, ry) {
  const px = (ox - cx) / rx, py = (oy - cy) / ry, pz = (oz - cz) / rx;
  const vx = dx / rx, vy = dy / ry, vz = dz / rx;
  const c = px * px + py * py + pz * pz - 1;
  if (c <= 0) return true;
  const a = vx * vx + vy * vy + vz * vz;
  if (a < 1e-12) return false;
  const b = px * vx + py * vy + pz * vz;
  const disc = b * b - a * c;
  if (disc < 0 || b > 0) return false;
  return (-b - Math.sqrt(disc)) / a <= 1;
}
