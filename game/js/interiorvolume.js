// Binnenruimte-isolatie, de pure kern (eigenaar 22-11: "ik zie nog dingen uit de wereld door de interieurs heenkomen, los dat
// structureel op"). Eén register van BINNENVOLUMES: de plekken waar een binnenruimte staat (de hal van een gewoon interieur, de
// flat, de kamer van een binnenset). Alles wat de wereld daar neerzet (straatmeubilair, bomen, props, auto's, voetgangers, vee)
// mag er niet in staan of er doorheen steken; één vraag voor al die lagen: interiorVolumeAt(x, y, r, z).
//
// Puur: geen THREE, geen DOM, geen wereld, geen opslag (scripts/interior_isolation_test.mjs). interiorisolation.js is de lijm
// naar het spel (registreren bij het bouwen, opruimen van wat er al stond, herstel bij het weggooien); deze module weet niets
// van hoe een laag zichzelf verbergt. Samen spelen: het register is lokaal per speler (elk spel bouwt zijn eigen interieurs uit
// het pandzaad, zie interiors.js); wie binnen is, ruimt alleen zijn eigen wereld op en stuurt niets over het net.
import { toWorld } from './interiorframe.js';
import { pointInPolygon, distToRing } from './shopbind.js';

// Extra rand rond de hal (m): de muurdikte plus de speling die een voorwerp met een voetafdruk nodig heeft.
export const VOLUME_MARGIN = 0.35;
// De ruimte boven en onder het interieur (m) waarbinnen een voorwerp nog "in" het volume telt (vloerplaat en dak).
export const VOLUME_Z_MARGIN = 0.6;
// Het volume begint zo hoog boven de vloer (m): wat op de grond ligt (de vloerplaat, wegdek en markering eronder) blijft, wat erop staat valt erbinnen.
export const CUT_FLOOR = 0.03;

const volumes = new Map();

// De hal van een plan (interiorrules.js planInterior) als vierhoek in wereldcoördinaten, `margin` m naar buiten.
export function hallPolygon(plan, margin = 0) {
  const f = plan.frame, H = plan.hall;
  const u0 = H.u0 - margin, u1 = H.u1 + margin, v0 = H.v0 - margin, v1 = H.v1 + margin;
  return [toWorld(f, u0, v0), toWorld(f, u1, v0), toWorld(f, u1, v1), toWorld(f, u0, v1)];
}

// Het volume van een interieurplan: de hal met de verdiepingen erboven; z0 is de vloer (maaiveld) en z1 de bovenkant van het plafond.
export function volumeOfPlan(plan, ground = 0) {
  const f = plan.frame, H = plan.hall;
  const [cx, cy] = toWorld(f, (H.u0 + H.u1) / 2, (H.v0 + H.v1) / 2);
  const vol = makeVolume(hallPolygon(plan, 0), ground + CUT_FLOOR, ground + (plan.topY || plan.height || 3) + 0.4);
  vol.rect = { cx, cy, ux: f.tx, uy: f.ty, hu: (H.u1 - H.u0) / 2, hv: (H.v1 - H.v0) / 2 };
  return vol;
}

// Een rechthoekige kamer los van een pand (de flat, een binnenset): midden, halve breedte/diepte, draaihoek.
export function volumeOfRoom(cx, cy, hw, hd, angle = 0, z0 = -1, z1 = 1e4) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const P = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  const vol = makeVolume(P, z0, z1);
  vol.rect = { cx, cy, ux: c, uy: s, hu: hw, hv: hd };
  return vol;
}

export function makeVolume(poly, z0, z1) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { poly, z0, z1, bounds: [x0, y0, x1, y1] };
}

export function addInteriorVolume(id, volume) { volumes.set(id, { ...volume, id }); }
export function removeInteriorVolume(id) { return volumes.delete(id); }
export function interiorVolumes() { return [...volumes.values()]; }
export function clearInteriorVolumes() { volumes.clear(); }

// Staat (x, y) met een voetafdruk r in een binnenvolume? Is z gegeven, dan telt ook de hoogte (een lantaarn op de 11e etage telt niet
// als binnen op de begane grond; een voorwerp op de grond onder de flat wel niet). Geeft de volume of null.
export function interiorVolumeAt(x, y, r = 0, z = null, margin = VOLUME_MARGIN) {
  for (const vol of volumes.values()) {
    const b = vol.bounds, m = r + margin;
    if (x < b[0] - m || x > b[2] + m || y < b[1] - m || y > b[3] + m) continue;
    if (z !== null && (z < vol.z0 - VOLUME_Z_MARGIN || z > vol.z1 + VOLUME_Z_MARGIN)) continue;
    if (pointInPolygon(x, y, vol.poly) || distToRing(x, y, vol.poly) < m) return vol;
  }
  return null;
}

export const inInteriorVolume = (x, y, r = 0, z = null, margin = VOLUME_MARGIN) => !!interiorVolumeAt(x, y, r, z, margin);

// Waar komt (x, y) uit als hij recht uit het volume wordt geduwd (voor een voetganger of een los voorwerp): dichtstbijzijnde
// rand plus `gap`. Buiten het volume blijft het punt staan.
export function pushOutOfInteriorVolume(x, y, r = 0, gap = 0.4, margin = VOLUME_MARGIN) {
  const vol = interiorVolumeAt(x, y, r, null, margin);
  if (!vol) return { x, y };
  const P = vol.poly;
  let best = null;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ax = P[j][0], ay = P[j][1], bx = P[i][0], by = P[i][1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const cx = ax + dx * t, cy = ay + dy * t, d = Math.hypot(x - cx, y - cy);
    if (!best || d < best.d) best = { d, cx, cy };
  }
  let nx = best.cx - x, ny = best.cy - y;
  const inside = pointInPolygon(x, y, P);
  if (!inside) { nx = -nx; ny = -ny; }          // al buiten maar te dicht bij de muur: weg van de muur
  const l = Math.hypot(nx, ny);
  if (l < 1e-6) { nx = 1; ny = 0; } else { nx /= l; ny /= l; }
  const out = (inside ? best.d : -best.d) + margin + r + gap;   // ver genoeg voorbij de rand
  return { x: x + nx * Math.max(out, gap), y: y + ny * Math.max(out, gap) };
}
