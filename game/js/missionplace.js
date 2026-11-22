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

// De grensgevallen van de missieprop-audit (scripts/world/mission_prop_audit.mjs): startplekken die op een weg, in water of in een
// gevel lagen, gemeten op de tegels met nearestClearSpot (r 1 m, stap 1 m). `van` is de plek zoals de def hem zet, `naar` de
// dichtstbijzijnde vrije plek. Een punt van een def dat binnen 2 m van `van` ligt, schuift naar `naar`: zo blijft de def zelf
// ongemoeid en volgt de fix elke def die op dezelfde plek begint (kleine verschuivingen, 1 tot 8 m).
export const PLEK_FIX = [
  { van: [19360, 17801], naar: [19368, 17801.5], missie: 'Open, dicht (de speler stond in het water)' },
  { van: [21724, 12339], naar: [21721.1, 12338.3], missie: 'Stoom (op de weg bij het perron)' },
  { van: [12039, -12622], naar: [12041.4, -12618.8], missie: 'Inpakken (op de weg voor het huis)' },
  { van: [12071, -12647], naar: [12073.4, -12643.8], missie: 'Terug (op de weg voor het erf)' },
];

// Zet de fix toe op een lijst defs (start, dest, stapdoelen, finish, aankleding). Geeft het aantal verschoven punten.
export function applyPlekFix(list, fixes = PLEK_FIX) {
  let n = 0;
  const raak = (p) => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.road) return;
    for (const f of fixes) if (Math.hypot(p.x - f.van[0], p.y - f.van[1]) < 2) { p.x = f.naar[0]; p.y = f.naar[1]; n++; return; }
  };
  for (const def of list || []) {
    raak(def.start); raak(def.dest);
    for (const st of def.stages || []) { raak(st.target); raak(st.finish); raak(st.dressingAt); }
  }
  return n;
}
