// Landplekken in de wereld (#21, #23, #164, #198): leest de OSM-elementen van de provincie-extract
// (data/cache/province/c*.json.gz) en schrijft game/streekplekken.json met perrons, schoorstenen,
// zendmasten, monumenten en parken, binnen het celbudget van game/js/streekplekken.js. De audit
// telt per type en per streek wat er herkenbaar wordt, en toetst scripts/streekplekken_drempels.json
// (min = herkenbaar, kan alleen stijgen; max = zonder kit, kan alleen dalen).
//   node scripts/world/streekplekken.mjs                 audit
//   node scripts/world/streekplekken.mjs --write         ook game/streekplekken.json
//   node scripts/world/streekplekken.mjs --drempels      schrijf de drempels uit de huidige telling (aanscherpen)
//   --cache=<map>   de provincie-cache (standaard data/cache/province)
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { puntInVlak, classifyLand, lineInfo, decimate, tileBudget, auditLand, checkDrempels, streekId, kitFor, LAND_TYPES, STREEK_IDS } from '../../game/js/streekplekken.js';

const r1 = (v) => Math.round(v * 10) / 10;
const MIN_LEN = { perron: 20 };
const MIN_AREA = { park: 600 };
const MERGE_AFSTAND = { schoorsteen: 15, mast: 25, monument: 8, perron: 12 };
const DREMPELS = fileURLToPath(new URL('../streekplekken_drempels.json', import.meta.url));

export function collectLand(els, acc = { map: new Map(), ruw: {} }) {
  for (const el of els) {
    if (!el.tags || (el.type !== 'way' && el.type !== 'node')) continue;
    const c = classifyLand(el.tags);
    if (!c) continue;
    const key = c.type + '/' + el.id;
    if (acc.map.has(key)) continue;
    acc.ruw[c.type] = (acc.ruw[c.type] || 0) + 1;
    let pts;
    if (el.type === 'node') {
      if (!Number.isFinite(el.lat)) continue;
      pts = [wgsToWorld(el.lat, el.lon)];
    } else {
      if (!el.g || el.g.length < 2) continue;
      pts = el.g.map((q) => wgsToWorld(q[0], q[1]));
    }
    const li = pts.length === 1 ? { x: pts[0][0], y: pts[0][1], a: 0, len: 0, wid: 0 } : lineInfo(pts);
    if (!li || !Number.isFinite(li.x)) continue;
    if (li.len < (MIN_LEN[c.type] || 0)) continue;
    if (c.type === 'park' && li.len * li.wid < MIN_AREA.park) continue;
    const h = parseFloat(String(el.tags.height || '').replace(',', '.'));
    const p = { id: el.id % 100000007, t: c.type, sub: c.sub, x: r1(li.x), y: r1(li.y), a: Math.round(li.a * 1000) / 1000, l: r1(li.len), w: r1(li.wid) };
    if (c.name) p.n = c.name.slice(0, 40);
    if (Number.isFinite(h) && h > 0 && (c.type === 'schoorsteen' || c.type === 'mast' || c.type === 'monument')) p.h = r1(h);
    acc.map.set(key, p);
  }
  return acc;
}

// Monumenten in een gebouw en parken in water vallen af (pass 2 over de elementen): geeft het aantal weggehaald.
const WATERTAG = (t) => t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'basin' || t.landuse === 'reservoir';
export function filterVlakken(els, lijst) {
  const grid = new Map();
  for (const p of lijst) if (p.t === 'monument' || p.t === 'park') { const k = Math.floor(p.x / 200) + ',' + Math.floor(p.y / 200); (grid.get(k) || grid.set(k, []).get(k)).push(p); }
  let n = 0;
  for (const el of els) {
    const t = el.tags;
    if (!t || el.type !== 'way' || !el.g || el.g.length < 4) continue;
    const isB = !!t.building, isW = WATERTAG(t);
    if (!isB && !isW) continue;
    let pts = null, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const q of (pts = el.g.map((g) => wgsToWorld(g[0], g[1])))) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    for (let i = Math.floor(x0 / 200); i <= Math.floor(x1 / 200); i++) for (let j = Math.floor(y0 / 200); j <= Math.floor(y1 / 200); j++) {
      for (const p of grid.get(i + ',' + j) || []) {
        if (p.weg || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        if (((isB && p.t === 'monument') || (isW && p.t === 'park')) && puntInVlak(p.x, p.y, pts)) { p.weg = true; n++; }
      }
    }
  }
  return n;
}

export function dedupeLand(list) {
  const out = [], grid = new Map();
  for (const p of list) {
    const d = MERGE_AFSTAND[p.t];
    if (d) {
      let dubbel = false;
      for (let i = -1; i <= 1 && !dubbel; i++) for (let j = -1; j <= 1 && !dubbel; j++) {
        for (const q of grid.get(p.t + '|' + (Math.floor(p.x / 100) + i) + ',' + (Math.floor(p.y / 100) + j)) || []) {
          if (Math.hypot(q.x - p.x, q.y - p.y) < d) { dubbel = true; if (!q.n && p.n) q.n = p.n; break; }
        }
      }
      if (dubbel) continue;
      const k = p.t + '|' + Math.floor(p.x / 100) + ',' + Math.floor(p.y / 100);
      (grid.get(k) || grid.set(k, []).get(k)).push(p);
    }
    out.push(p);
  }
  return out;
}

export function finishLand(acc) {
  const lijst = dedupeLand([...acc.map.values()].sort((a, b) => a.t.localeCompare(b.t) || a.id - b.id));
  const b = tileBudget(lijst);
  return { plekken: b.kept.sort((p, q) => p.t.localeCompare(q.t) || p.id - q.id), alle: lijst, budget: b, ruw: acc.ruw };
}

// herkenbaar en zonder kit per type en streek (voor de drempels)
export function tellingen(res, audit) {
  const herkenbaar = {}, zonderKit = {};
  for (const type of Object.keys(LAND_TYPES)) {
    herkenbaar[type] = {}; zonderKit[type] = {};
    for (const s of STREEK_IDS) { herkenbaar[type][s] = audit.perStreek[type][s]?.herkenbaar || 0; zonderKit[type][s] = 0; }
  }
  const behouden = new Set(res.plekken);
  for (const p of res.alle) {
    if (behouden.has(p) && kitFor(p).length >= 3) continue;
    zonderKit[p.t][streekId(p.x, p.y)]++;
  }
  return { herkenbaar, zonderKit };
}

function main() {
  const args = process.argv.slice(2);
  const cacheArg = args.find((a) => a.startsWith('--cache='));
  const dir = cacheArg ? cacheArg.slice(8) : fileURLToPath(new URL('../../data/cache/province/', import.meta.url));
  const files = fs.readdirSync(dir).filter((f) => /^c.*\.json\.gz$/.test(f)).sort();
  if (!files.length) { console.log('geen provinciecache in', dir); process.exit(1); }
  const acc = { map: new Map(), ruw: {} };
  for (const f of files) collectLand(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))).elements || [], acc);
  const eerst = [...acc.map.values()].filter((q) => q.t === 'monument' || q.t === 'park');
  let weg = 0;
  for (const f of files) weg += filterVlakken(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))).elements || [], eerst);
  for (const [k, q] of acc.map) if (q.weg) acc.map.delete(k);
  console.log(`weggehaald: ${weg} monumenten in een gebouw of parken in water`);
  const res = finishLand(acc);
  const audit = auditLand(res.alle, res.ruw, res.budget);
  console.log(`landplekken: ${Object.values(res.ruw).reduce((a, b) => a + b, 0)} gevonden, ${res.alle.length} na samenvoegen, ${res.plekken.length} binnen het celbudget`);
  console.log('type'.padEnd(20) + 'OSM'.padStart(6) + 'plekken'.padStart(9) + 'onderd.'.padStart(9) + 'herkenb.'.padStart(10) + 'benoemd'.padStart(9) + '  ontbreekt');
  for (const r of audit.rows) console.log(r.label.padEnd(20) + String(r.ruw).padStart(6) + String(r.gebouwd).padStart(9) + String(r.onderdelen).padStart(9) + String(r.herkenbaar).padStart(10) + String(r.benoemd).padStart(9) + '  ' + r.ontbreekt.join('; '));
  const tel = tellingen(res, audit);
  console.log('\nherkenbaar per streek:');
  console.log('type'.padEnd(14) + STREEK_IDS.map((s) => s.slice(0, 9).padStart(10)).join(''));
  for (const type of Object.keys(LAND_TYPES)) console.log(type.padEnd(14) + STREEK_IDS.map((s) => String(tel.herkenbaar[type][s]).padStart(10)).join(''));
  const cellen = [...res.budget.perCel.values()];
  console.log(`\ncellen met plekken: ${cellen.length}, drukste cel ${Math.max(0, ...cellen)} onderdelen; weggelaten door budget: ${JSON.stringify(res.budget.dropped)}`);
  if (args.includes('--write')) {
    const out = fileURLToPath(new URL('../../game/streekplekken.json', import.meta.url));
    fs.writeFileSync(out, JSON.stringify({ v: 1, cel: 512, plekken: res.plekken }));
    console.log('geschreven', out, (fs.statSync(out).size / 1024).toFixed(0) + ' kB');
  }
  if (args.includes('--drempels')) {
    fs.writeFileSync(DREMPELS, JSON.stringify({ v: 1, min: tel.herkenbaar, max: tel.zonderKit }, null, 1) + '\n');
    console.log('drempels geschreven', DREMPELS);
  } else if (fs.existsSync(DREMPELS)) {
    const d = JSON.parse(fs.readFileSync(DREMPELS, 'utf8'));
    const bad = checkDrempels(tel.herkenbaar, { min: d.min }).concat(checkDrempels(tel.zonderKit, { max: d.max }));
    if (bad.length) { console.log('DREMPELS GESCHONDEN:\n  ' + bad.join('\n  ')); process.exit(1); }
    console.log('drempels ok');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
