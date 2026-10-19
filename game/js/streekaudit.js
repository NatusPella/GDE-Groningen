// Streekaudit (#61, #66, #67, #68): telt per streek en per stad wat er is (winkels,
// padel- en golfbanen, vondsten, evenementen, ontmoetingen, straten) en wat
// ontbreekt, en controleert de handmatige data tegen de echte OSM-kaart: bestaan de
// straten uit de stadsprofielen, en ligt een vondst op land, buiten gebouwen en
// binnen bereik van een weg. Pure and Node-safe; scripts/world/streekaudit.mjs
// leest de kaartdata en geeft die aan deze functies.
import { wgsToWorld } from './rdnew.js';

const R = 6371008.8;
const rad = Math.PI / 180;

// metres between two [lat, lon] points (equirectangular, fine below ~50 km)
export function distM(a, b) {
  const dy = (b[0] - a[0]) * rad * R;
  const dx = (b[1] - a[1]) * rad * R * Math.cos(((a[0] + b[0]) / 2) * rad);
  return Math.hypot(dx, dy);
}

// metres from p to the segment a-b, all [lat, lon]
export function distToSegment(p, a, b) {
  const k = Math.cos(p[0] * rad);
  const px = p[1] * rad * R * k, py = p[0] * rad * R;
  const ax = a[1] * rad * R * k - px, ay = a[0] * rad * R - py;
  const bx = b[1] * rad * R * k - px, by = b[0] * rad * R - py;
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function distToLine(p, line) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, distToSegment(p, line[i - 1], line[i]));
  if (line.length === 1) best = distM(p, line[0]);
  return best;
}

// ray casting, ring of [lat, lon]
export function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
    if ((yi > p[0]) !== (yj > p[0]) && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// simplified name for matching street names: lowercase, no accents or punctuation
export const normName = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// A find passes when it is on land (not in water), not inside a building, and a road or
// path is within `maxRoad` metres. geo: { roads: [lines], buildings: [rings], water: [rings],
// waterLines: [lines] } near the point, all in [lat, lon].
export function checkFind(f, geo, { maxRoad = 60, waterLine = 6 } = {}) {
  const p = f.at;
  const issues = [];
  if ((geo.water || []).some((r) => inRing(p, r))) issues.push('in water');
  if ((geo.waterLines || []).some((l) => distToLine(p, l) < waterLine)) issues.push('op een waterloop');
  if ((geo.buildings || []).some((r) => inRing(p, r))) issues.push('in een gebouw');
  let road = Infinity;
  for (const l of geo.roads || []) road = Math.min(road, distToLine(p, l));
  if (road > maxRoad) issues.push(`${Math.round(road)} m van de dichtstbijzijnde weg`);
  return { id: f.id, road: Math.round(road), issues };
}

// The point of the nearest road node within `within` metres that keeps clear of buildings and
// water, or null; used to suggest a better place for a find.
export function suggestSpot(p, geo, within = 120) {
  let best = null, bestD = Infinity;
  for (const l of geo.roads || []) {
    for (const q of l) {
      const d = distM(p, q);
      if (d > within || d >= bestD) continue;
      if ((geo.buildings || []).some((r) => inRing(q, r))) continue;
      if ((geo.water || []).some((r) => inRing(q, r))) continue;
      best = q; bestD = d;
    }
  }
  return best ? { at: best, d: Math.round(bestD) } : null;
}

// Which of a town's named streets exist in OSM within its reach? names: Set of normName'd
// street names found there.
export function checkStreets(town, names) {
  const found = [], missing = [];
  for (const s of town.streets) (names.has(normName(s)) ? found : missing).push(s);
  return { id: town.id, found, missing };
}

// Per streek tally. items: [{ kind, x, y }] with kind 'winkel' | 'restaurant' | 'padel' |
// 'golf'; streekAt(x, y) -> { id } | null. Items outside every streek are counted as `buiten`.
export function tally(items, streekAt, ids) {
  const out = {};
  for (const id of ids) out[id] = {};
  const buiten = {};
  for (const it of items) {
    const s = streekAt(it.x, it.y);
    const bucket = s ? out[s.id] : buiten;
    bucket[it.kind] = (bucket[it.kind] || 0) + 1;
  }
  return { perStreek: out, buiten };
}

// Gaps of the streek content: what a streek should have for its identity and does not.
// content: { streekId: { winkel, restaurant, padel, golf, vondsten, geheimen, events, ontmoetingen, steden } }
const MIN_PER_STREEK = { vondsten: 3, geheimen: 1, events: 1, ontmoetingen: 3, steden: 1 };

export function gaps(content) {
  const out = [];
  for (const [id, c] of Object.entries(content)) {
    for (const [k, min] of Object.entries(MIN_PER_STREEK)) if ((c[k] || 0) < min) out.push({ streek: id, what: k, have: c[k] || 0, want: min });
    if (!c.winkel) out.push({ streek: id, what: 'winkel', have: 0, want: 1 });
    if (!c.restaurant) out.push({ streek: id, what: 'restaurant', have: 0, want: 1 });
  }
  return out;
}

export const toWorld = (ll) => { const [x, y] = wgsToWorld(ll[0], ll[1]); return { x, y }; };
