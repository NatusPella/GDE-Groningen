// Real facilities (scripts/add_facilities.py -> game/facilities.json):
// hospitals, GP posts, doctors, ambulance posts, police, fire stations,
// pharmacies, fuel, car repair, shops, horeca, parking, taxi ranks and bus
// stations, in lat/lon, projected here (geoframe.js). Only what lies in the
// part of the world that is built (the city map and the province's tiles) is
// kept. Names are invented from kind + place; no business names.
//
//   nearestFacility(kind, x, y)  kind: 'medical' | 'police' | any layer kind
//                                (or an array of them)
import { geoToGame } from './geoframe.js';
import { inProvinceData } from './provinceworld.js';
import { pushOutOfPlan } from './countryplan.js';
import { buildingAt, boxOf, pushOutOfBuildings, roadNear, roadKind, withTiles, waterGap } from './tileplace.js';
import { isInWater } from './util.js';
import { regionAt } from './regions.js';
import { SpatialGrid } from './spatialgrid.js';
import { FACILITY_KIND, REPLACED_KINDS } from './shopbind.js';

// how far an emergency-capable post may be before the nearest doctor wins
export const MEDICAL_REACH = 4500;
const CELL = 500;
const EDGE = 150;

export const FAC = { ready: false, all: [], byKind: new Map(), lanes: [] };
let grids = new Map();
let meta = null;

export async function loadFacilities(mapUrl = 'stad.json') {
  const base = mapUrl.replace(/[^/]*$/, '');
  try {
    const r = await fetch(base + 'facilities.json');
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.warn('facilities not loaded', e);
    return null;
  }
}

// Inside the built world: the city map, or any tile of the world (the province's, else
// the proefstrook's: setExtraBuiltWorld for the tiles that are built from OSM).
let extraWorld = null;
export function setExtraBuiltWorld(fn) { extraWorld = fn; }
export function inBuiltWorld(m, x, y, edge = EDGE) {
  const b = m.bounds;
  if (b && x > b[0] + edge && x < b[2] - edge && y > b[1] + edge && y < b[3] - edge) return true;
  return inProvinceData(x, y) === true || (!!extraWorld && extraWorld(x, y));
}

// The area round town where shops, cafés and garages get doors and where a
// respawn or a teleport counts as out in the country: the tiles round all of
// them are loaded at the start, so the cost grows with it ([x0, y0, x1, y1]).
export const DOOR_BOX = [-12208, -13520, 12758, 10810];
export const inDoorRange = (x, y, m = 0) => x > DOOR_BOX[0] + m && x < DOOR_BOX[2] - m && y > DOOR_BOX[1] + m && y < DOOR_BOX[3] - m;

function inCity(m, x, y) {
  const b = m.bounds;
  return !!b && x > b[0] && x < b[2] && y > b[1] && y < b[3];
}

function wijkAt(m, x, y) {
  let best = '', bd = Infinity;
  for (const h of m.neighbourhoodPoints || []) {
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) { bd = d; best = h.name; }
  }
  return best;
}

const LABEL = {
  hospital: 'Ziekenhuis', gppost: 'Huisartsenpost', doctors: 'Huisartsenpraktijk', ambulance: 'Ambulancepost',
  police: 'Politiebureau', fire: 'Brandweerkazerne', pharmacy: 'Apotheek', fuel: 'Pomp & Poets', car_repair: 'Garage Knalpot',
  taxi: 'Taxistandplaats', busstation: 'Busstation', parking: 'Parkeerplaats', garagepark: 'Parkeergarage',
};

function nameOf(f) {
  if (f.kind === 'hospital' && f.umcg) return 'UMCG';
  if (f.own) return f.own;
  const label = LABEL[f.kind];
  if (!label) return '';
  return f.place ? `${label} ${f.place}` : label;
}

export function initFacilities(map, raw) {
  FAC.ready = false;
  FAC.all = [];
  FAC.byKind = new Map();
  FAC.lanes = [];
  grids = new Map();
  if (!raw || !raw.f) return;
  meta = map.meta;
  const P = (lat, lon) => geoToGame(meta, lat, lon);
  const poly = (flat) => {
    const out = [];
    for (let i = 0; i + 1 < flat.length; i += 2) out.push(P(flat[i], flat[i + 1]));
    return out;
  };
  const taken = new Set();
  for (const r of raw.f) {
    const [x, y] = P(r[1], r[2]);
    if (!inBuiltWorld(meta, x, y, 0)) continue;
    const kind = raw.kinds[r[0]];
    const flags = r[5] || 0;
    const city = inCity(meta, x, y);
    const f = {
      kind, x, y,
      place: (city && wijkAt(meta, x, y)) || raw.places[r[3]] || '',
      street: raw.streets[r[4]] || '',
      own: (raw.names && raw.names[r[6]]) || '',
      umcg: !!(flags & 1), emergency: !!(flags & 2) || kind === 'gppost', services: !!(flags & 4), parkRide: !!(flags & 8),
      poly: Array.isArray(r[7]) ? poly(r[7]) : null,
      capacity: r[8] || 0,
      city,
    };
    let name = nameOf(f);
    if (name && taken.has(name)) name = f.street ? `${LABEL[kind] || name} ${f.street}` : name;
    for (let k = 2; name && taken.has(name); k++) name = `${nameOf(f)} ${k}`;
    if (name) taken.add(name);
    f.name = name;
    FAC.all.push(f);
    if (!FAC.byKind.has(kind)) FAC.byKind.set(kind, []);
    FAC.byKind.get(kind).push(f);
  }
  for (const [sides, flat] of raw.lanes || []) {
    const pts = poly(flat);
    if (pts.some(([x, y]) => inBuiltWorld(meta, x, y, 0))) FAC.lanes.push({ sides, pts });
  }
  FAC.ready = true;
}

export async function loadShopPlaces(mapUrl = 'stad.json') {
  const base = mapUrl.replace(/[^/]*$/, '');
  try {
    const r = await fetch(base + 'shopplaces.json');
    return r.ok ? await r.json() : null;
  } catch (e) {
    console.warn('shop places not loaded', e);
    return null;
  }
}

// The province's real shops and cafés (scripts/world/build_shopplaces.mjs, #175):
// they take the place of the same kinds from facilities.json (the same real
// spots, now with an invented name, the building and a budget per tile). The
// city keeps its own shops (meta.shops): rows inside the city map are skipped.
// Run after initFacilities.
export function initShopPlaces(map, raw) {
  if (!raw || !raw.tiles || !FAC.ready) return 0;
  const drop = new Set(REPLACED_KINDS);
  const seen = new Set();
  const rows = [];
  for (const list of Object.values(raw.tiles)) {
    for (const r of list) {
      const [x, y] = geoToGame(meta, r[0], r[1]);
      const type = raw.types[r[2]];
      const kind = FACILITY_KIND[type];
      const key = kind + '|' + Math.round(x / 4) + '|' + Math.round(y / 4);
      if (!kind || seen.has(key) || !inBuiltWorld(meta, x, y, 0) || inCity(meta, x, y)) continue;
      seen.add(key);
      rows.push({ kind, x, y, place: (raw.places && raw.places[r[6]]) || '', street: '', own: r[3], wk: type, bid: r[4] || '', chain: !!(r[5] & 1), city: false, sp: true });
    }
  }
  if (!rows.length) return 0;
  FAC.all = FAC.all.filter((f) => f.city || !drop.has(f.kind));
  for (const k of drop) {
    const keep = (FAC.byKind.get(k) || []).filter((f) => f.city);
    if (keep.length) FAC.byKind.set(k, keep); else FAC.byKind.delete(k);
  }
  for (const f of rows) {
    f.name = f.own;
    FAC.all.push(f);
    if (!FAC.byKind.has(f.kind)) FAC.byKind.set(f.kind, []);
    FAC.byKind.get(f.kind).push(f);
  }
  grids = new Map();
  return rows.length;
}

export function facilitiesOf(kind) {
  if (Array.isArray(kind)) return kind.flatMap((k) => FAC.byKind.get(k) || []);
  return FAC.byKind.get(kind) || [];
}

// Facilities of `kind` in the box (x0, y0)-(x1, y1).
export function facilitiesIn(kind, x0, y0, x1, y1) {
  return facilitiesOf(kind).filter((f) => f.x >= x0 && f.x <= x1 && f.y >= y0 && f.y <= y1);
}

function grid(key, list) {
  let g = grids.get(key);
  if (g) return g;
  g = new SpatialGrid(CELL);
  for (const f of list) g.insertPoint(f, f.x, f.y);
  g.list = list;
  grids.set(key, g);
  return g;
}

// Nearest in a list: a plain scan for the short lists (respawn sites), the
// grid's rings outwards for the long ones (parking, shops).
function nearestIn(key, list, x, y, maxD) {
  if (!list.length) return null;
  if (list.length < 400) return nearestPlain(list, x, y, maxD);
  const g = grid(key, list);
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  let best = null, bd = maxD;
  for (let r = 0; r <= 24; r++) {
    if (best && (r - 1) * CELL > bd) return best;
    for (let i = -r; i <= r; i++) {
      const edge = Math.abs(i) === r;
      for (let j = -r; j <= r; j += edge ? 1 : 2 * r) {
        const L = g.cellItems(cx + i, cy + j);
        if (!L) continue;
        for (const f of L) {
          const d = Math.hypot(f.x - x, f.y - y);
          if (d < bd) { bd = d; best = f; }
        }
      }
    }
  }
  return best || nearestPlain(list, x, y, maxD);
}

// A respawn site lies in the province: past the edge (Paterswolde, De Punt in Drenthe) the tiles
// have no road to park the car on and the player would arrive at the edge of the world (#285).
const inProvince = (f) => f.city || regionAt(f.x, f.y).id === 'groningen';

let emergencyList = null, anyMedList = null;
function medical() {
  if (!emergencyList || emergencyList.v !== FAC.all) {
    emergencyList = facilitiesOf(['hospital', 'gppost']).filter((f) => f.emergency && inProvince(f));
    emergencyList.v = FAC.all;
    anyMedList = facilitiesOf(['hospital', 'gppost', 'doctors', 'ambulance']).filter(inProvince);
  }
  return [emergencyList, anyMedList];
}

// Where to go: 'medical' takes the nearest hospital with an emergency
// department or GP post (huisartsenpost) within MEDICAL_REACH, else the
// nearest doctor, ambulance post or any hospital; 'police' the nearest
// station. Falls back on the city's meta lists when the layer is missing.
export function nearestFacility(kind, x, y, { maxD = Infinity } = {}) {
  if (kind === 'medical') {
    if (FAC.ready) {
      const [em, any] = medical();
      const e = nearestIn('med-em', em, x, y, Math.min(maxD, MEDICAL_REACH));
      if (e) return e;
      const a = nearestIn('med-any', any, x, y, maxD);
      if (a) return a;
      const far = nearestIn('med-em', em, x, y, maxD);
      if (far) return far;
    }
    const m = meta || {};
    const list = [...(m.hospital ? [{ ...m.hospital, kind: 'hospital', umcg: true, emergency: true }] : []), ...(m.careSites || []).map((s) => ({ ...s, kind: 'gppost' }))];
    return nearestPlain(list, x, y, maxD);
  }
  if (kind === 'police') {
    const f = FAC.ready ? nearestIn('police', facilitiesOf('police').filter(inProvince), x, y, maxD) : null;
    if (f) return f;
    return nearestPlain(((meta || {}).policeStations || []).map((s) => ({ ...s, kind: 'police' })), x, y, maxD);
  }
  const key = Array.isArray(kind) ? kind.join('+') : kind;
  return nearestIn(key, facilitiesOf(kind), x, y, maxD);
}

function nearestPlain(list, x, y, maxD) {
  let best = null, bd = maxD;
  for (const s of list) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Every site nearestFacility(kind) can return for a point of the built
// world (on a `step` m grid, plus the corners past the edge): the respawn
// sites that have to be reachable.
export function reachableFacilities(kind, step = 400) {
  const m = meta || {};
  const out = new Set();
  const boxes = [m.bounds, DOOR_BOX].filter(Boolean);
  for (const [x0, y0, x1, y1] of boxes) {
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        const f = nearestFacility(kind, x, y);
        if (f) out.add(f);
      }
    }
  }
  return [...out];
}

// --- doors out in the Ommelanden ------------------------------------------------

// Open ground: not in a building, a farmstead, a ditch or the water.
export function countryStandable(map, x, y) {
  return !buildingAt(map, x, y, 0.35) && waterGap(map, x, y, 3) < -0.6 && !isInWater(map, x, y) && !pushOutOfPlan({ x, y }, 0.35);
}

// The face of building b that looks at (tx, ty): {x, y, nx, ny, tx, ty, h}.
export function countryFace(b, tx, ty) {
  const q = boxOf(b);
  const c = Math.cos(q.a), sn = Math.sin(q.a);
  const dx = tx - q.x, dy = ty - q.y;
  const u = dx * c + dy * sn, v = -dx * sn + dy * c;
  const hw = q.w / 2, hl = q.l / 2;
  let eu, ev, nu = 0, nv = 0;
  if (Math.abs(u) * hl >= Math.abs(v) * hw) { nu = Math.sign(u || 1); eu = nu * hw; ev = Math.max(-hl + 1, Math.min(hl - 1, (v * hw) / (Math.abs(u) || 1))); }
  else { nv = Math.sign(v || 1); ev = nv * hl; eu = Math.max(-hw + 1, Math.min(hw - 1, (u * hl) / (Math.abs(v) || 1))); }
  return {
    x: q.x + eu * c - ev * sn, y: q.y + eu * sn + ev * c,
    nx: nu * c - nv * sn, ny: nu * sn + nv * c, tx: nu ? -sn : c, ty: nu ? c : sn,
    h: Math.max(3, q.lv * 3),
  };
}

// The street door of a real POI at (x, y) out in the Ommelanden: on the face
// of its building towards the nearest car road ({x, y, face, street}),
// else a free-standing spot between it and the road ({x, y, kiosk, street});
// null when neither is open ground or ok(x, y) says no. Reads the tiles that
// are in (placeWithTiles).
export function countryDoor(map, x, y, ok = () => true) {
  const q = roadNear(map, x, y, 80, (r) => roadKind(r) > 2);
  if (!q) return null;
  const street = q.road.name || '';
  let b = null;
  for (const m of [0, 3, 8, 15]) if ((b = buildingAt(map, x, y, m))) break;
  if (b) {
    const face = countryFace(b, q.x, q.y);
    const o = { x: face.x + face.nx * 1.3, y: face.y + face.ny * 1.3 };
    for (let k = 0; k < 3 && buildingAt(map, o.x, o.y, 0.3); k++) pushOutOfBuildings(map, o, 0.9);
    if (countryStandable(map, o.x, o.y) && ok(o.x, o.y) && map.canWalkOut(o.x, o.y, 30)) return { x: o.x, y: o.y, face, street };
  }
  const d = Math.hypot(q.x - x, q.y - y) || 1;
  for (let s = 0; s < d; s += 1) {
    const px = x + ((q.x - x) / d) * s, py = y + ((q.y - y) / d) * s;
    if (!countryStandable(map, px, py)) continue;
    const dq = Math.hypot(q.x - px, q.y - py);
    if (dq < (q.road.width || 5) / 2 + 1.5 || !ok(px, py)) return null;
    return { x: px, y: py, kiosk: { nx: (q.x - px) / dq, ny: (q.y - py) / dq }, street };
  }
  return null;
}

// The real facilities of these kinds out in the country (outside the city's
// map, inside DOOR_BOX): where shops, cafés and garages get a door.
export function countryFacilities(kinds) {
  return facilitiesOf(kinds).filter((f) => !f.city && inDoorRange(f.x, f.y));
}

// Runs fn (sync) with the tiles round those facilities in: the places that are
// fixed at the start (shop doors, café doors, garage bays) read the tiles'
// buildings and roads like everything else. Without a tile store fn runs at once.
export function placeWithTiles(map, kinds, fn, opts = {}) {
  return withTiles(map, countryFacilities(kinds).map((f) => [f.x, f.y]), fn, { radius: 160, token: 'placement', ...opts });
}

