// Wegcheck voor kit-props (wereldaudit 21-11): de kits van streekplekken, waterplekken en de vaste
// plannen (containerplan) staan op de plek van hun OSM-punt of vlak, niet op de kaart van de tegels.
// De tegelkaart weet wel waar de rijbaan, het huis en het water liggen; wat daar niet mee strookt
// (een mast op het asfalt, een kraan in een weiland ver van de kade, een pier zonder water) valt weg.
// Eén bron voor wat spel en audit (scripts/world/world_audit.mjs) tellen: de audit rekent met een
// eigen oordeel op de ruwe tegelrijen, het spel met dit bestand op de kaart die het ook tekent.
//
// map: het spel (TileWorld) of een kaartvorm { roadsNear, buildingsNear, waterNear } (audit).
// Leaf: geen THREE, geen DOM.
import { closestPointOnSegment, pointInPolygon, polygonBounds } from './util.js';

// Zoom van een weg vanaf zijn middellijn waarbinnen we zoeken (breedste rijbaan plus een berm).
const REACH = 12;
// Een dek hoger dan dit is niet de weg op de grond (zie tilegreenery.js).
const HOOG_MAAIVELD = 0.5;

const zAt = (r, i, t) => (!r.z || r.z.length < i + 2 ? 0 : r.z[i] + (r.z[i + 1] - r.z[i]) * t);

// Staat (x, y) op een weg op maaiveld? Alle klassen behalve voetpaden (een kit mag over een voetpad
// lopen: een park heeft zijn eigen paden), met `margin` meter extra langs de rand.
export function onGroundRoad(map, x, y, margin = 0.3, { foot = false } = {}) {
  if (!map || !map.roadsNear) return false;
  for (const r of map.roadsNear(x, y, REACH)) {
    const P = r.pts;
    if (!P || P.length < 2 || r.bridge || r.tunnel) continue;
    if (r.cat === 'foot' && !foot) continue;
    const room = (r.width || 4) / 2 + margin;
    const b = r.bounds;
    if (b && (x < b[0] - room || x > b[2] + room || y < b[1] - room || y > b[3] + room)) continue;
    for (let i = 0; i + 1 < P.length; i++) {
      const cp = closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      if (cp.dist2 > room * room) continue;
      if (zAt(r, i, cp.t) > HOOG_MAAIVELD) continue;
      return true;
    }
  }
  return false;
}

// Staat (x, y) in een gebouw (de buitenlijn, `margin` m opgerekt)?
export function inBuildingAt(map, x, y, margin = 0) {
  if (!map || !map.buildingsNear) return false;
  for (const b of map.buildingsNear(x, y, margin + 1)) {
    if (!b.pts || b.pts.length < 3) continue;
    const q = b.bounds || (b.bounds = polygonBounds(b.pts));
    if (x < q[0] - margin || x > q[2] + margin || y < q[1] - margin || y > q[3] + margin) continue;
    if (pointInPolygon(x, y, b.pts)) return true;
    if (margin > 0 && distToOutline(b.pts, x, y) <= margin) return true;
  }
  return false;
}

export function distToOutline(P, x, y) {
  let best = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const cp = closestPointOnSegment(x, y, P[j][0], P[j][1], P[i][0], P[i][1]);
    if (cp.dist2 < best) best = cp.dist2;
  }
  return Math.sqrt(best);
}

// De afstand van (x, y) tot water (0 erin), gezocht tot `reach` m; Infinity als er niets ligt.
export function waterDistance(map, x, y, reach = 60) {
  if (!map || !map.waterNear) return Infinity;
  let best = Infinity;
  for (const w of [...map.waterNear(x, y, reach), ...(map.flatWaterNear ? map.flatWaterNear(x, y, reach) : [])]) {
    if (!w.pts || w.pts.length < 3) continue;
    const q = w.bounds || (w.bounds = polygonBounds(w.pts));
    if (x < q[0] - reach || x > q[2] + reach || y < q[1] - reach || y > q[3] + reach) continue;
    if (pointInPolygon(x, y, w.pts)) return 0;
    const d = distToOutline(w.pts, x, y);
    if (d < best) best = d;
  }
  return best;
}

// Het perronkit is een plaat van 0,9 m hoog op maaiveld, tot 220 m lang (streekplekken.js). (1) Waar de kaart een echt perron heeft (de
// stationsperrons van de stad, de landhaltes van stationtravel.js) is het kit een dubbel: bij Groningen Noord lag de plaat onder het hoge
// perron over de Kastanjelaan als een drempel van 0,9 m (#1346). (2) Een lange plaat die over een weg op maaiveld loopt, valt weg: alleen
// het midden controleren liet hem over de rijbaan liggen.
const afstandTotLijn = (P, x, y) => {
  let best = Infinity;
  for (let i = 0; i + 1 < P.length; i++) best = Math.min(best, Math.sqrt(closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2));
  return best;
};
export function opEchtPerron(map, q) {
  const rows = map && map.perrons;
  if (!rows || !rows.length) return false;
  // de punten langs de as van het deel (een plaat van 160 m raakt het echte perron ook als zijn midden ernaast ligt)
  const n = Math.max(0, Math.min(40, Math.round((q.w || 0) / 4)));
  const dx = Math.cos(q.ry || 0), dz = -Math.sin(q.ry || 0);
  for (const row of rows) {
    const P = row.p;
    if (!P || P.length < 2) continue;
    const hs = Math.max(...P.map((o) => o[2]));
    for (let k = -n; k <= n; k++) {
      const t = n ? (k / n) * (q.w / 2) : 0;
      if (afstandTotLijn(P, q.x + dx * t, q.z + dz * t) < hs + 4) return true;
    }
  }
  return false;
}
// Ligt het perronkit op een echt perron (zijn plaat of een deel ervan)? Dan staat er niets van het kit: ook de lantaarns, het bordje en
// het eindstuk zouden anders los op de grond blijven staan, onder het echte perron.
export const perronKitDubbel = (map, parts) => parts.some((q) => q.w >= 8 && q.h < 2 && opEchtPerron(map, q));
export function plaatOverWeg(map, q) {
  if (!(q.w >= 8) || q.h >= 2) return false;
  const n = Math.min(60, Math.ceil(q.w / 3));
  const dx = Math.cos(q.ry || 0), dz = -Math.sin(q.ry || 0);
  for (let k = 0; k <= n; k++) {
    const t = (k / n - 0.5) * q.w;
    if (onGroundRoad(map, q.x + dx * t, q.z + dz * t, 0.3)) return true;
  }
  return false;
}

// Een streekplek zonder de onderdelen die op een weg of in een huis staan. Een perron staat naast het spoor en
// een heg knipt dropOnRoad (streekplekken.js); hier zijn het de losse masten, zuilen en schoorstenen: een
// onderdeel vervalt als zijn midden op de weg of in een gebouw valt. perron: alleen de weg telt.
export function dropStreekParts(parts, map, plekType) {
  if (!map) return parts;
  return parts.filter((q) => {
    if (plekType === 'perron' && (opEchtPerron(map, q) || plaatOverWeg(map, q))) return false;   // ook de gele strook: die zweefde op 0,9 m
    if (q.h < 0.1) return true; // vlakke delen (paden, vijver) laten we staan
    if (onGroundRoad(map, q.x, q.z, 0.3)) return false;
    if (nearRailAt(map, q.x, q.z, 2.1)) return false;
    if (plekType !== 'perron' && inBuildingAt(map, q.x, q.z, 0.2)) return false;
    return true;
  });
}

// Afstanden (m) waarbinnen een waterkit water naast zich moet hebben: een kraan op de kade staat aan het
// water, niet in een weiland (haven-kit: kraan, loods en silo leunen op de binnenhoek van het vlak, dat bij
// een schuin of onregelmatig havenvlak op het droge ligt). Strekdam en golfbreker staan in zee, waar de tegels geen vlak
// hebben (de Waddenzee): daar geen regel. Soorten zonder regel (brug, sluis, dijk, helling) blijven.
export const WATER_REACH = { haven: 60, jachthaven: 80, pier: 100 };

// Een waterplek zonder de onderdelen die op de weg of in een gebouw staan, of (voor kades en pieren) te ver van water.
export function dropWaterParts(parts, map, plek) {
  if (!map) return parts;
  const reach = WATER_REACH[plek.t];
  const roadSoort = plek.t !== 'brug' && plek.t !== 'sluis' && plek.t !== 'sluisdeur' && plek.t !== 'stuw' && plek.t !== 'dijk' && plek.t !== 'helling';
  return parts.filter((q) => {
    if (roadSoort && (onGroundRoad(map, q.x, q.z, 0.3) || inBuildingAt(map, q.x, q.z, 0.2))) return false;
    if (reach && waterDistance(map, q.x, q.z, reach + 2) > reach) return false;
    return true;
  });
}

// Staat (x, y) op of vlak naast het spoor (m vanaf de spoorlijn)?
export function nearRailAt(map, x, y, m = 2.1) {
  if (!map || !map.railNear) return false;
  for (const r of map.railNear(x, y, m + 4)) {
    const P = r.pts;
    if (!P || P.length < 2) continue;
    for (let i = 0; i + 1 < P.length; i++) if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < m * m) return true;
  }
  return false;
}

// Een stationsgebouw zonder eigen omtrek (railway=station is een punt op het spoor): de kit stond met willekeurige
// hoek midden op het punt en dus over de sporen (30 tot 60% van de plattegrond op 22 stations). Hier staat hij
// evenwijdig aan het dichtstbijzijnde spoor, naast het spoor, met de perronzijde (lokaal +z, daar hangt de overkapping)
// naar de sporen. Probeert beide kanten en verschuivingen langs het spoor en kiest de plek met de minste hinder
// (spoor, weg, huis, water). Geeft { x, y, len, wid, angle }, of null als er geen spoor in de buurt ligt.
// 'tile' als er al een stationsgebouw van de tegels binnen 60 m staat (die tekent zijn eigen kit).
export function stationFit(map, item, len = 32, wid = 12) {
  if (!map || !map.railNear) return null;
  if (map.buildingsNear) for (const b of map.buildingsNear(item.x, item.y, 60)) if (b.type === 'train_station') return 'tile';
  let best = null;
  for (const r of map.railNear(item.x, item.y, 40)) {
    const P = r.pts;
    if (!P || P.length < 2) continue;
    for (let i = 0; i + 1 < P.length; i++) {
      const cp = closestPointOnSegment(item.x, item.y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
      const d = Math.sqrt(cp.dist2);
      if (!best || d < best.d) best = { d, x: cp.x, y: cp.y, tx: P[i + 1][0] - P[i][0], ty: P[i + 1][1] - P[i][1] };
    }
  }
  if (!best) return null;
  const L = Math.hypot(best.tx, best.ty) || 1, tx = best.tx / L, ty = best.ty / L, nx = -ty, ny = tx, a0 = Math.atan2(ty, tx);
  const off0 = wid / 2 + 6.5;
  let pick = null;
  for (const shift of [0, -12, 12, -24, 24, -36, 36, -48, 48, -64, 64]) for (const extra of [0, 4, 8, 14]) for (const s of [-1, 1]) {
    const off = off0 + extra;
    const cx = best.x + tx * shift + s * nx * off, cy = best.y + ty * shift + s * ny * off, a = s < 0 ? a0 : a0 + Math.PI;
    const c = Math.cos(a), sn = Math.sin(a);
    let hits = 0;
    for (let u = -len / 2; u <= len / 2; u += 4) for (let v = -wid / 2; v <= wid / 2; v += 3) {
      const x = cx + u * c - v * sn, y = cy + u * sn + v * c;
      if (nearRailAt(map, x, y, 2.4) || onGroundRoad(map, x, y, 0.3) || inBuildingAt(map, x, y, 0.2) || waterDistance(map, x, y, 1) === 0) hits++;
    }
    const cost = hits * 10 + Math.abs(shift) * 0.05 + extra * 0.1;
    if (!pick || cost < pick.cost) pick = { cost, x: cx, y: cy, angle: a };
  }
  return pick && { x: pick.x, y: pick.y, len, wid, angle: pick.angle };
}

// Het oppervlak (m2) en het zwaartepunt van een gebouwomtrek (voor de wegcheck hieronder).
function footprint(P) {
  let a = 0, cx = 0, cy = 0;
  const n = P.length - (P.length > 1 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1] ? 1 : 0);
  for (let i = 0; i < n; i++) { cx += P[i][0]; cy += P[i][1]; const j = (i + 1) % n; a += P[i][0] * P[j][1] - P[j][0] * P[i][1]; }
  return { area: Math.abs(a) / 2, x: cx / n, y: cy / n };
}

// Hoogstens zo groot (m2) is een gebouw dat op een rijbaan vervalt: een schuur of garage op het asfalt is een
// fout in de kaart (de weg loopt er in werkelijkheid langs); een groot gebouw met een weg door zijn midden is
// een poort of tunnelpand en blijft.
export const MISPLACED_MAX_AREA = 150;
const MISPLACED_SKIP = new Set(['roof', 'houseboat', 'static_caravan', 'dock', 'train_station']);

// Staat een gebouw op een verkeerde plek in de tegelkaart (wereldaudit 21-11, #1045): zonder naam of landmark en
// 'weg' als het zwaartepunt op een rijbaan op maaiveld ligt (alleen een klein gebouw), 'water' als het in een
// watervlak staat (de benoemde, zoals Gemaal Rozema, staan terecht op het water). Anders null.
// Pure functie op de kaart (TileWorld of de auditvorm); de tegelwereld verwijdert zo'n gebouw bij het laden van de tegel.
export function misplacedBuilding(map, b) {
  if (!b || !b.pts || b.pts.length < 3 || b.landmark || b.name || MISPLACED_SKIP.has(b.type)) return null;
  const f = footprint(b.pts);
  if (waterDistance(map, f.x, f.y, 0.5) === 0) return 'water';
  if (f.area <= MISPLACED_MAX_AREA && onGroundRoad(map, f.x, f.y, 0)) return 'weg';
  return null;
}
