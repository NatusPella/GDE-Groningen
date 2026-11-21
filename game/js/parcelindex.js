// Perceel- en pandindex voor Bezit (epic #1095, #1096): leest bezit-percelen.json en bezit-panden.json (gebouwd door
// scripts/world/bezit_index.mjs bij het bouwen van de wereld) en beantwoordt vragen met een grof raster. Puur: geen DOM, geen THREE,
// geen klok, geen netwerk (scripts/bezit_index_test.mjs). Het laden zelf (fetch) staat in loadBezitIndex en wordt alleen aangeroepen
// als de speler iets met Bezit doet: lui, nooit bij het starten. De omtrek van een perceel staat in een apart, lui nageladen bestand (bezit-vormen.json: createShapeIndex, shapeOf); zonder dat blijft de schets.
//
// places: [naam, x, y, woningen?] (woningen per woonplaats, #1103).
// Een perceel: { id, x, y (binnenpunt, RD-wereldmeters), ax, ay (ankerpunt), ha, kind: 'w'|'a'|'b', access: 'weg'|'pad'|'wegNabij'|'padNabij'|'geen' }

export const GRID_M = 1000;
const gridKey = (cx, cy) => cx * 100003 + cy;

export function createParcelIndex(file) {
  const kinds = (file && file.kinds) || ['w', 'a', 'b'];
  const access = (file && file.access) || ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'];
  const rows = (file && Array.isArray(file.rows) && file.v === 1) ? file.rows : [];
  const list = [], byId = new Map(), grid = new Map();
  for (const r of rows) {
    if (!Array.isArray(r) || typeof r[0] !== 'string' || !Number.isFinite(r[1]) || !Number.isFinite(r[2])) continue;
    const p = { id: r[0], x: r[1], y: r[2], ha: r[3] / 100, kind: kinds[r[4]] || 'a', access: access[r[5]] || 'geen', ax: r[6], ay: r[7] };
    list.push(p);
    byId.set(p.id, p);
    const k = gridKey(Math.floor(p.x / GRID_M), Math.floor(p.y / GRID_M));
    let c = grid.get(k);
    if (!c) grid.set(k, (c = []));
    c.push(p);
  }
  const places = Array.isArray(file && file.places) ? file.places.filter((q) => Array.isArray(q) && typeof q[0] === 'string' && Number.isFinite(q[1]) && Number.isFinite(q[2])) : [];
  const nearestPlace = (x, y) => {
    let best = null, bd = Infinity;
    for (const q of places) { const d = (q[1] - x) * (q[1] - x) + (q[2] - y) * (q[2] - y); if (d < bd) { bd = d; best = q; } }
    return best;
  };
  const inRect = (x0, y0, x1, y1, max = Infinity) => {
    const out = [];
    for (let cx = Math.floor(x0 / GRID_M); cx <= Math.floor(x1 / GRID_M); cx++) for (let cy = Math.floor(y0 / GRID_M); cy <= Math.floor(y1 / GRID_M); cy++) {
      const c = grid.get(gridKey(cx, cy));
      if (!c) continue;
      for (const p of c) if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) { out.push(p); if (out.length >= max) return out; }
    }
    return out;
  };
  let shapes = null;
  return {
    size: list.length,
    places,
    // de getekende omtrek (bezit-vormen.json, lui nageladen): shapeOf(id) geeft de punten in wereldmeters of null (nog niet geladen, of te klein voor een vorm)
    attachShapes(file) { shapes = file ? createShapeIndex(file, this) : null; return shapes ? shapes.size : 0; },
    shapeOf: (id) => (shapes ? shapes.shapeOf(id) : null),
    hasShapes: () => !!shapes && shapes.size > 0,
    // de dichtstbijzijnde woonplaats (naam) van een punt, of null zonder plaatsen
    placeAt(x, y) { const q = nearestPlace(x, y); return q ? q[0] : null; },
    // het aantal gewone woningen van de dichtstbijzijnde woonplaats (places[i][3], uit bezit_index.mjs), of null als het bestand het niet kent (oude bouw)
    housesAt(x, y) { const q = nearestPlace(x, y); return q && Number.isFinite(q[3]) ? q[3] : null; },
    // de dichtstbijzijnde plaats als [naam, x, y, woningen] binnen r meter (voor het kopen van een woning in de buurt), of null
    placeNear(x, y, r = 6000) { const q = nearestPlace(x, y); return q && Math.hypot(q[1] - x, q[2] - y) <= r ? q : null; },
    byId: (id) => byId.get(id) || null,
    has: (id) => byId.has(id),
    all: () => list,
    inRect,
    // dichtstbijzijnde binnenpunt binnen r meter, of null
    nearest(x, y, r = 300) {
      let best = null, bd = Infinity;
      for (const p of inRect(x - r, y - r, x + r, y + r)) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
      return best && bd <= r ? best : null;
    },
    // een bezit dat naar een niet meer bestaand ID wijst, herkoppelen: dichtstbijzijnde van dezelfde soort binnen 50 m en 20% oppervlakte (ontwerp 2.5)
    rematch(anchor, kind, ha, r = 50) {
      let best = null, bd = Infinity;
      for (const p of inRect(anchor[0] - r - 2000, anchor[1] - r - 2000, anchor[0] + r + 2000, anchor[1] + r + 2000)) { // binnenpunt kan ver van het anker liggen
        if (p.kind !== kind || Math.abs(p.ha - ha) > 0.2 * Math.max(ha, 0.01)) continue;
        const d = Math.hypot(p.ax - anchor[0], p.ay - anchor[1]);
        if (d < bd && d <= r) { bd = d; best = p; }
      }
      return best;
    },
  };
}

// De omtrekken (bezit-vormen.json, scripts/world/bezit_index.mjs): rijen [id, [dx0, dy0, dx1, dy1, ...]] in stappen van file.step meter, het eerste punt relatief aan het
// binnenpunt van het perceel, elk volgend relatief aan het vorige. shapeOf(id) geeft [[x, y], ...] in wereldmeters (gesloten, zonder herhaald slotpunt) of null.
// Een kleine cache van uitgepakte omtrekken (alleen wat in beeld is wordt uitgepakt, nooit alle 13.650 tegelijk).
export const SHAPE_CACHE_MAX = 600;
export function createShapeIndex(file, parcels) {
  const step = file && Number.isFinite(file.step) && file.step > 0 ? file.step : 5;
  const rows = (file && Array.isArray(file.rows) && file.v === 1) ? file.rows : [];
  const raw = new Map(), cache = new Map();
  for (const r of rows) if (Array.isArray(r) && typeof r[0] === 'string' && Array.isArray(r[1]) && r[1].length >= 6 && r[1].length % 2 === 0) raw.set(r[0], r[1]);
  return {
    size: raw.size,
    has: (id) => raw.has(id),
    shapeOf(id) {
      const hit = cache.get(id);
      if (hit) return hit;
      const flat = raw.get(id), p = parcels && parcels.byId ? parcels.byId(id) : null;
      if (!flat || !p) return null;
      const pts = [];
      let px = 0, py = 0;
      for (let i = 0; i < flat.length; i += 2) {
        px += flat[i]; py += flat[i + 1];
        if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
        pts.push([p.x + px * step, p.y + py * step]);
      }
      if (cache.size >= SHAPE_CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(id, pts);
      return pts;
    },
  };
}

// Pandindex: [osm, x, y, m2, typeIdx, h, landmark]
export function createBuildingIndex(file) {
  const types = (file && file.types) || [];
  const rows = (file && Array.isArray(file.rows) && file.v === 1) ? file.rows : [];
  const byId = new Map(), grid = new Map();
  for (const r of rows) {
    if (!Array.isArray(r) || !Number.isFinite(r[0]) || !Number.isFinite(r[1]) || !Number.isFinite(r[2])) continue;
    const b = { osm: r[0], x: r[1], y: r[2], m2: r[3], type: types[r[4]] || '?', h: r[5] || 0, landmark: !!r[6] };
    byId.set(b.osm, b);
    const k = gridKey(Math.floor(b.x / GRID_M), Math.floor(b.y / GRID_M));
    let c = grid.get(k);
    if (!c) grid.set(k, (c = []));
    c.push(b);
  }
  return {
    size: byId.size,
    byId: (osm) => byId.get(osm) || null,
    near(x, y, r = 200) {
      const out = [];
      for (let cx = Math.floor((x - r) / GRID_M); cx <= Math.floor((x + r) / GRID_M); cx++) for (let cy = Math.floor((y - r) / GRID_M); cy <= Math.floor((y + r) / GRID_M); cy++) {
        for (const b of grid.get(gridKey(cx, cy)) || []) if (Math.hypot(b.x - x, b.y - y) <= r) out.push(b);
      }
      return out;
    },
  };
}

// Lui laden: één keer per bestand, daarna uit het geheugen. fetchJson(url) -> Promise<object>; mislukt het, dan een lege index (het spel gaat door).
let cache = null;
export function loadBezitIndex(fetchJson, base = '', files = { percelen: 'bezit-percelen.json', panden: 'bezit-panden.json', vormen: 'bezit-vormen.json' }) {
  if (cache) return cache;
  const safe = (f) => Promise.resolve().then(() => fetchJson(base + f)).catch(() => null);
  cache = Promise.all([safe(files.percelen), safe(files.panden)]).then(([p, b]) => {
    const parcels = createParcelIndex(p);
    // de omtrekken komen erna, op de achtergrond: de index is meteen bruikbaar (met de schets) en krijgt de vormen zodra ze er zijn
    if (files.vormen) safe(files.vormen).then((v) => { if (v) parcels.attachShapes(v); });
    return { parcels, buildings: createBuildingIndex(b) };
  });
  return cache;
}
export const resetBezitIndexCache = () => { cache = null; };
