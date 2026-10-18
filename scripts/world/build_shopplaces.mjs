// Restaurants en winkels in de hele provincie op echte plekken (issue #175).
// Leest de OSM-voorzieningen van het provincie-extract (facilities_raw.json.gz) en
// de gebouwen uit de packs (c<i>_<j>.json.gz), koppelt elke zaak aan een winkeltype
// uit de winkelkit en aan het gebouw eronder (punt-in-polygoon, anders het
// dichtstbijzijnde binnen 25 m), geeft een verzonnen naam, past een
// dichtheidsbudget per tegel toe en schrijft game/shopplaces.json (klein, versiebaar).
// Van OSM komt alleen type en plek: geen namen, merken, nummers, websites of tijden.
//
//   node scripts/world/build_shopplaces.mjs                 # bouwen + audit
//   node scripts/world/build_shopplaces.mjs --audit         # alleen de audit, schrijft niets
//   node scripts/world/build_shopplaces.mjs --cache <dir>   # andere cache-map (standaard data/cache/province)
//   node scripts/world/build_shopplaces.mjs --budget 40     # ander budget per tegel
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { tileIndexOf, tileKey } from '../../game/js/gdt.js';
import { classify, isChain, seedOf, inventName, bindBuilding, applyBudget, TILE_BUDGET } from '../../game/js/shopbind.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const CACHE = path.resolve(arg('--cache', path.join(ROOT, 'data/cache/province')));
const BUDGET = Number(arg('--budget', TILE_BUDGET));
const AUDIT_ONLY = process.argv.includes('--audit');
const DST = path.join(ROOT, 'game/shopplaces.json');
const RADIUS = 25;
const gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
const german = (lat, lon) => lon > 7.21 || (lat > 53.30 && lon > 7.05) || (lat > 53.38 && lon > 6.98);

// ---- voorzieningen ----
const raw = gz(path.join(CACHE, 'facilities_raw.json.gz'));
let facs = [];
for (const el of raw.elements) {
  const t = el.tags || {};
  const c = classify(t);
  if (!c) continue;
  let ll = null;
  if (el.type === 'node') ll = [el.lat, el.lon];
  else if (el.geometry && el.geometry.length) {
    const p = el.geometry.filter(Boolean);
    ll = [p.reduce((s, g) => s + g.lat, 0) / p.length, p.reduce((s, g) => s + g.lon, 0) / p.length];
  } else if (el.bounds) ll = [(el.bounds.minlat + el.bounds.maxlat) / 2, (el.bounds.minlon + el.bounds.maxlon) / 2];
  if (!ll || german(...ll)) continue;
  const [x, y] = wgsToWorld(ll[0], ll[1]);
  facs.push({ key: `${el.type[0]}${el.id}`, lat: ll[0], lon: ll[1], x, y, group: c.group, type: c.type, chain: isChain(t), area: el.type !== 'node' });
}
// dezelfde zaak als punt en als vlak, of dubbel getekend: houd het vlak, 20 m
facs.sort((a, b) => (a.area === b.area ? 0 : a.area ? -1 : 1) || a.key.localeCompare(b.key));
{
  const g = new Map();
  const kept = [];
  for (const f of facs) {
    const cx = Math.floor(f.x / 40), cy = Math.floor(f.y / 40);
    let dup = false;
    for (let ox = -1; ox <= 1 && !dup; ox++) for (let oy = -1; oy <= 1 && !dup; oy++) {
      for (const o of g.get(`${cx + ox},${cy + oy}`) || []) if (o.type === f.type && Math.hypot(o.x - f.x, o.y - f.y) < 20) dup = true;
    }
    if (dup) continue;
    const k = `${cx},${cy}`;
    (g.get(k) || g.set(k, []).get(k)).push(f);
    kept.push(f);
  }
  facs = kept;
}
console.log(`${facs.length} winkels en horeca uit OSM`);

// ---- gebouwen uit de packs: alleen die bij een voorziening in de buurt liggen ----
const CELL = 100;
const fgrid = new Map();
for (const f of facs) { const k = `${Math.floor(f.x / CELL)},${Math.floor(f.y / CELL)}`; (fgrid.get(k) || fgrid.set(k, []).get(k)).push(f); }
const seenB = new Set();
function takeRing(id, pts) {
  if (seenB.has(id) || pts.length < 3) return;
  const ring = pts.map(([la, lo]) => wgsToWorld(la, lo));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const m = RADIUS;
  let hit = false;
  for (let cx = Math.floor((x0 - m) / CELL); cx <= Math.floor((x1 + m) / CELL); cx++) {
    for (let cy = Math.floor((y0 - m) / CELL); cy <= Math.floor((y1 + m) / CELL); cy++) {
      for (const f of fgrid.get(`${cx},${cy}`) || []) { (f.cand || (f.cand = [])).push({ id, ring }); hit = true; }
    }
  }
  if (hit) seenB.add(id);
}
const packs = fs.readdirSync(CACHE).filter((f) => /^c-?\d+_-?\d+\.json\.gz$/.test(f));
for (const p of packs) {
  for (const el of gz(path.join(CACHE, p)).elements) {
    if (!el.tags || !el.tags.building) continue;
    const id = `${el.type[0]}${el.id}`;
    if (el.type === 'way' && el.g) takeRing(id, el.g);
    else if (el.type === 'relation') (el.members || []).forEach((m, i) => { if (m.role === 'outer' && m.g) takeRing(`${id}/${i}`, m.g); });
  }
}
console.log(`${packs.length} packs gelezen, ${seenB.size} gebouwen in de buurt van een zaak`);

// ---- plaatsen voor de audit ----
const places = gz(path.join(CACHE, 'province.json.gz')).places
  .filter((p) => ['city', 'town', 'village', 'hamlet', 'suburb'].includes(p.kind))
  .map((p) => ({ name: p.name, kind: p.kind, ...(([x, y]) => ({ x, y }))(wgsToWorld(p.lat, p.lon)) }));
const REACH = { city: 6000, town: 3500, village: 1800, suburb: 1500, hamlet: 900 };
const RANK = { city: 0, town: 0, village: 0.15, suburb: 0.15, hamlet: 0.3 };
function placeOf(x, y) {
  let best = '', bs = Infinity;
  for (const p of places) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d > REACH[p.kind]) continue;
    const s = d / REACH[p.kind] + RANK[p.kind];
    if (s < bs) { bs = s; best = p.name; }
  }
  return best;
}

// ---- koppelen, budget per tegel ----
const byTile = new Map();
let bound = 0, inside = 0;
for (const f of facs) {
  const b = bindBuilding(f.x, f.y, f.cand || [], RADIUS);
  f.bid = b ? b.id : null;
  f.inside = !!(b && b.inside);
  if (b) bound++;
  if (f.inside) inside++;
  f.place = placeOf(f.x, f.y);
  const [i, j] = tileIndexOf(f.x, f.y);
  const k = tileKey(i, j);
  (byTile.get(k) || byTile.set(k, []).get(k)).push(f);
}
let dropped = 0;
const out = {};
const types = [];
const tIdx = (t) => { let i = types.indexOf(t); if (i < 0) { i = types.length; types.push(t); } return i; };
const kept = [];
for (const k of [...byTile.keys()].sort()) {
  const all = byTile.get(k);
  const pick = applyBudget(all, BUDGET);
  dropped += all.length - pick.length;
  pick.sort((a, b) => a.key.localeCompare(b.key));
  out[k] = pick.map((f) => [+f.lat.toFixed(5), +f.lon.toFixed(5), tIdx(f.type), inventName(f.group, f.type, seedOf(f.key)), f.bid || 0, (f.chain ? 1 : 0) | (f.inside ? 2 : 0)]);
  kept.push(...pick);
}

// ---- audit per plaats ----
const per = new Map();
for (const f of kept) {
  const n = f.place || '(buiten dorpen)';
  const e = per.get(n) || { n: 0, shop: 0, horeca: 0, bound: 0, cells: new Set(), xs: [], ys: [] };
  e.n++; e[f.group]++; if (f.bid) e.bound++;
  e.cells.add(`${Math.floor(f.x / 250)},${Math.floor(f.y / 250)}`);
  e.xs.push(f.x); e.ys.push(f.y);
  per.set(n, e);
}
const rows = [...per.entries()].sort((a, b) => b[1].n - a[1].n);
console.log(`\nAudit: ${kept.length} van ${facs.length} geplaatst in ${Object.keys(out).length} tegels (budget ${BUDGET}/tegel, ${dropped} weggelaten)`);
console.log(`gekoppeld aan een gebouw: ${bound} van ${facs.length} (${inside} liggen erin), ketens met verzonnen naam: ${facs.filter((f) => f.chain).length}`);
console.log('plaats'.padEnd(26) + 'totaal winkel horeca  aan-gebouw  cellen250m  spreiding(m)');
const spread = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
for (const [n, e] of rows.slice(0, 40)) {
  console.log(n.padEnd(26) + String(e.n).padStart(6) + String(e.shop).padStart(7) + String(e.horeca).padStart(7) + String(e.bound).padStart(12) + String(e.cells.size).padStart(12) + String(Math.round(Math.hypot(spread(e.xs), spread(e.ys)))).padStart(13));
}
console.log(`... ${rows.length} plaatsen met minstens één zaak; ${rows.filter(([, e]) => e.n >= 5).length} met ≥ 5`);
const full = Object.entries(out).filter(([, v]) => v.length >= BUDGET).map(([k]) => k);
console.log(`tegels aan het budget: ${full.length}${full.length ? ' (' + full.slice(0, 8).join(', ') + ')' : ''}`);

if (!AUDIT_ONLY) {
  const doc = { v: 1, src: 'OpenStreetMap contributors (ODbL): alleen type en plek', crs: 'EPSG:4326', budget: BUDGET, types, row: ['lat', 'lon', 'type', 'naam', 'gebouw', 'vlaggen (1 keten, 2 binnen gebouw)'], tiles: out };
  fs.writeFileSync(DST, JSON.stringify(doc));
  console.log(`\n${path.relative(ROOT, DST)}: ${Math.round(fs.statSync(DST).size / 1024)} KB`);
}
