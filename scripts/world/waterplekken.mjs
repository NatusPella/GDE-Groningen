// Waterplekken in de wereld (#23, #7): leest de OSM-elementen van de provincie-extract
// (data/cache/province/c*.json.gz) en schrijft game/waterplekken.json met de sluizen,
// sluisdeuren, beweegbare-brugtorens, jachthavens, binnenvaarthavens, vuurtorens en de
// dijk- en zeewerken (strekdammen, golfbrekers, pieren, dijken, stuwen, hellingen),
// binnen het celbudget van game/js/waterplekken.js. De audit telt per type wat er
// herkenbaar wordt en wat ontbreekt.
//   node scripts/world/waterplekken.mjs                 audit
//   node scripts/world/waterplekken.mjs --write         ook game/waterplekken.json
//   --cache=<map>   de provincie-cache (standaard data/cache/province)
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { classifyPlek, lineInfo, decimate, tileBudget, auditPlekken, PLEK_TYPES, celVan } from '../../game/js/waterplekken.js';

const r1 = (v) => Math.round(v * 10) / 10;
const MIN_LEN = { strekdam: 6, pier: 8, golfbreker: 10, dijk: 25, stuw: 3, helling: 3 };
const MERGE_AFSTAND = { sluis: 40, sluisdeur: 8, brug: 20, vuurtoren: 30, jachthaven: 60, haven: 80 };

// Verzamelt de plekken uit `els` in acc (Map "type/id" -> plek), voegt tellingen toe aan acc.ruw.
export function collectPlekken(els, acc = { map: new Map(), ruw: {} }) {
  for (const el of els) {
    if (!el.tags || (el.type !== 'way' && el.type !== 'node')) continue;
    const c = classifyPlek(el.tags, el.type === 'node');
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
    const t = el.tags;
    const p = { id: el.id % 100000007, t: c.type, sub: c.sub, x: r1(li.x), y: r1(li.y), a: Math.round(li.a * 1000) / 1000, l: r1(li.len), w: r1(li.wid) };
    if (c.name) p.n = c.name.slice(0, 40);
    if (c.type === 'sluis') p.w = r1(parseFloat(t.maxwidth) || parseFloat(t.width) || 8);
    if (c.type === 'sluisdeur') { p.a = Math.round((li.a + Math.PI / 2) * 1000) / 1000; p.l = r1(Math.max(4, li.len)); }
    if (c.type === 'brug') p.w = r1(parseFloat(t.width) || 6);
    if (c.type === 'vuurtoren') p.h = r1(parseFloat(t.height) || 24);
    if (PLEK_TYPES[c.type].lijn && ['strekdam', 'pier', 'golfbreker', 'dijk'].includes(c.type)) {
      if (li.len < (MIN_LEN[c.type] || 0)) continue;
      p.pts = decimate(pts, 12).map((q) => [r1(q[0]), r1(q[1])]);
    } else if (li.len < (MIN_LEN[c.type] || 0)) continue;
    acc.map.set(key, p);
  }
  return acc;
}

// Dubbele plekken (dezelfde sluis in twee ways) samenvoegen op afstand.
export function dedupePlekken(list) {
  const out = [];
  const grid = new Map();
  for (const p of list) {
    const d = MERGE_AFSTAND[p.t];
    if (d) {
      const k = p.t + '|' + Math.floor(p.x / 100) + ',' + Math.floor(p.y / 100);
      let dubbel = false;
      for (let i = -1; i <= 1 && !dubbel; i++) for (let j = -1; j <= 1 && !dubbel; j++) {
        for (const q of grid.get(p.t + '|' + (Math.floor(p.x / 100) + i) + ',' + (Math.floor(p.y / 100) + j)) || []) {
          if (Math.hypot(q.x - p.x, q.y - p.y) < d) { dubbel = true; if (!q.n && p.n) q.n = p.n; break; }
        }
      }
      if (dubbel) continue;
      (grid.get(k) || grid.set(k, []).get(k)).push(p);
    }
    out.push(p);
  }
  return out;
}

export function buildWaterplekken(els) {
  const acc = collectPlekken(els);
  return finishPlekken(acc);
}

export function finishPlekken(acc) {
  const lijst = dedupePlekken([...acc.map.values()].sort((a, b) => a.t.localeCompare(b.t) || a.id - b.id));
  const b = tileBudget(lijst);
  const kept = b.kept.sort((p, q) => p.t.localeCompare(q.t) || p.id - q.id);
  return { plekken: kept, alle: lijst, budget: b, ruw: acc.ruw };
}

function main() {
  const args = process.argv.slice(2);
  const cacheArg = args.find((a) => a.startsWith('--cache='));
  const dir = cacheArg ? cacheArg.slice(8) : fileURLToPath(new URL('../../data/cache/province/', import.meta.url));
  const files = fs.readdirSync(dir).filter((f) => /^c.*\.json\.gz$/.test(f)).sort();
  if (!files.length) { console.log('geen provinciecache in', dir); process.exit(1); }
  const acc = { map: new Map(), ruw: {} };
  for (const f of files) {
    const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
    collectPlekken(d.elements || [], acc);
  }
  const res = finishPlekken(acc);
  const rows = auditPlekken(res.alle, res.ruw, res.budget);
  console.log(`waterplekken: ${res.ruw ? Object.values(res.ruw).reduce((a, b) => a + b, 0) : 0} gevonden, ${res.alle.length} na samenvoegen, ${res.plekken.length} binnen het celbudget`);
  console.log('type'.padEnd(18) + 'OSM'.padStart(6) + 'plekken'.padStart(9) + 'onderd.'.padStart(9) + 'herkenb.'.padStart(10) + 'benoemd'.padStart(9) + '  ontbreekt');
  for (const r of rows) console.log(r.label.padEnd(18) + String(r.ruw).padStart(6) + String(r.gebouwd).padStart(9) + String(r.onderdelen).padStart(9) + String(r.herkenbaar).padStart(10) + String(r.benoemd).padStart(9) + '  ' + r.ontbreekt.join('; '));
  const cellen = [...res.budget.perCel.values()];
  console.log(`cellen met plekken: ${cellen.length}, drukste cel ${Math.max(0, ...cellen)} onderdelen`);
  console.log('in het spel behouden:', res.plekken.length, '| weggelaten door budget:', JSON.stringify(res.budget.dropped));
  if (args.includes('--write')) {
    const out = fileURLToPath(new URL('../../game/waterplekken.json', import.meta.url));
    fs.writeFileSync(out, JSON.stringify({ v: 1, cel: 512, plekken: res.plekken }));
    console.log('geschreven', out, (fs.statSync(out).size / 1024).toFixed(0) + ' kB');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
export { celVan };
