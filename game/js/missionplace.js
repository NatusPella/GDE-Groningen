// Geldige plekken voor missierekwisieten (#1035): de kraan en de container van M13
// stonden de ene keer in een weiland en de andere op de weg, omdat de plekken losse
// offsets van een gok waren. Hier staat de vraag "mag dit hier staan?" (niet op een
// weg, niet in water, niet in een gebouw, niet op het spoor) en de deterministische
// zoektocht naar de dichtstbijzijnde plek waar het wel mag. Puur: geen THREE, geen DOM.
// De probe heeft dezelfde vragen als TileWorld (buildingsNear, roadsNear, waterNear,
// railNear), zodat hetzelfde oordeel in het spel, in de tests en in de audit
// (scripts/world/mission_prop_audit.mjs) geldt.
import { pointInPolygon } from './polygon.js';

export const RAIL_HALF = 2.1;

function segDist(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
}
function lineDist(x, y, P) {
  let d = Infinity;
  for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segDist(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]));
  return d;
}
const call = (map, name, x, y, r) => (map[name] ? map[name](x, y, r) : []);

// Wat staat er op (x, y), met `m` meter ruimte rondom? Lijst van 'weg', 'water', 'gebouw', 'spoor'.
export function spotProblems(map, x, y, m = 0) {
  const out = [];
  for (const r of call(map, 'roadsNear', x, y, m + 12)) {
    if (r.bridge || !r.pts) continue;
    if (lineDist(x, y, r.pts) < (r.width || 4) / 2 + m) { out.push('weg'); break; }
  }
  for (const b of call(map, 'buildingsNear', x, y, m + 1)) {
    if (!b.pts) continue;
    if (pointInPolygon(x, y, b.pts) || (m > 0 && lineDist(x, y, b.pts.concat([b.pts[0]])) < m)) { out.push('gebouw'); break; }
  }
  const waters = call(map, 'waterNear', x, y, m + 1).concat(call(map, 'flatWaterNear', x, y, m + 1));
  for (const w of waters) {
    if (!w.pts) continue;
    if (pointInPolygon(x, y, w.pts) || (m > 0 && lineDist(x, y, w.pts.concat([w.pts[0]])) < m)) { out.push('water'); break; }
  }
  for (const r of call(map, 'railNear', x, y, m + 4)) {
    if (r.pts && lineDist(x, y, r.pts) < RAIL_HALF + m) { out.push('spoor'); break; }
  }
  return out;
}

// Is de plek vrij voor een rekwisiet met straal r? Het middelpunt en acht punten op de rand moeten schoon zijn.
export function spotClear(map, x, y, r = 0) {
  if (spotProblems(map, x, y, 0).length) return false;
  if (!(r > 0)) return true;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    if (spotProblems(map, x + Math.cos(a) * r, y + Math.sin(a) * r, 0).length) return false;
  }
  return true;
}

// De dichtstbijzijnde vrije plek bij (x, y) binnen maxD, op een vast raster in vaste volgorde
// (eerst dichtbij, dan met de klok mee vanaf het noorden): dezelfde wereld geeft altijd dezelfde plek.
// `ok(x, y)` mag extra eisen stellen (bijvoorbeeld "dicht bij de kade"). Null als er niets is.
export function nearestClearSpot(map, x, y, { r = 0, maxD = 150, step = 5, ok = null } = {}) {
  const good = (px, py) => spotClear(map, px, py, r) && (!ok || ok(px, py));
  if (good(x, y)) return { x, y, moved: 0 };
  for (let d = step; d <= maxD; d += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * d) / step));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI;
      const px = x + Math.sin(a) * d, py = y - Math.cos(a) * d;
      if (good(px, py)) return { x: px, y: py, moved: d };
    }
  }
  return null;
}

// Staat de tegel rond (x, y) in het geheugen? Zo niet, dan weet de map niets en oordelen we niet (geen verschuiving).
export function tilesKnown(map, x, y, tileIndexOf, tileKey) {
  if (!map || !map.resident) return false;
  const [i, j] = tileIndexOf(x, y);
  return map.resident.has(`${i},${j}`);
}
