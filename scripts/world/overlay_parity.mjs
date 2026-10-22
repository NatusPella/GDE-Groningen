// Bewijs voor het samenvoegen van de overlaytegels in hun stadstegel (#314, C2): dezelfde wereld, geladen met de oude manier (de
// overlays als eigen tegels, de loader van vóór de wijziging) en met de nieuwe (samengevoegd, merge_overlays.mjs, de huidige
// loader), geeft dezelfde kaart. Per aanroep één wereld en één loader; de uitkomst is een bestand met handtekeningen, --vergelijk
// zet er twee naast elkaar.
//   node scripts/world/overlay_parity.mjs <wereldmap> --uit=<a.json> [--loader=<map met game/js van vóór de wijziging>]
//   node scripts/world/overlay_parity.mjs --vergelijk=<a.json>,<b.json>
// De handtekening: de hele arrays (gebouwen, wegen, water, groen, bomen, rails: per object een hash), het register en de rasters
// (per soort de ids en hashes van wat erin staat), de tegels die resident zijn, meta, en 40.000 vaste kaartvragen (de volgorde
// van de antwoorden telt mee). Zonder wereld: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const arg = (k) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (arg('vergelijk')) {
  const [a, b] = arg('vergelijk').split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  let bad = 0;
  const cmp = (naam, x, y) => { const ok = JSON.stringify(x) === JSON.stringify(y); if (!ok) bad++; console.log(`${ok ? 'gelijk ' : 'VERSCHIL'} ${naam}`); };
  for (const k of new Set([...Object.keys(a.digests), ...Object.keys(b.digests)])) cmp(`${k} (${a.counts[k] ?? '?'} / ${b.counts[k] ?? '?'})`, a.digests[k], b.digests[k]);
  console.log(bad ? `${bad} verschillen` : 'alles gelijk');
  process.exit(bad ? 1 : 0);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
await import('../node3d.mjs');
const dir = path.resolve(POS[0] || '');
if (!POS[0] || !fs.existsSync(path.join(dir, 'index.json'))) { console.log('SKIP overlay_parity: geen wereld'); process.exit(0); }
const loaderDir = arg('loader') ? path.resolve(arg('loader')) : path.join(ROOT, 'game', 'js');
const imp = (f) => import(pathToFileURL(path.join(loaderDir, f)).href);
const S = await imp('tilestore.js');
const TW = await imp('tileworld.js');
const files = {};
for (const f of fs.readdirSync(dir)) if (/\.(gdp|json|gz)$/.test(f)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: [{ name: 'index-provincie.json' }] });
const map = T.world;

const stable = (v, seen = new Set()) => {
  if (v === null || typeof v !== 'object') return typeof v === 'number' ? String(v) : JSON.stringify(v);
  if (seen.has(v)) return '"~"';
  seen.add(v);
  const s = Array.isArray(v) ? '[' + v.map((x) => stable(x, seen)).join(',') + ']' : '{' + Object.keys(v).filter((k) => k !== 'bounds' && !k.startsWith('_')).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k], seen)).join(',') + '}';
  seen.delete(v);
  return s;
};
const h = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 12);
const digest = (list) => { const x = crypto.createHash('md5'); for (const s of list) x.update(s + '\n'); return x.digest('hex'); };
const out = { counts: {}, digests: {} };
const put = (k, list) => { out.counts[k] = list.length; out.digests[k] = digest(list); };

for (const kind of ['buildings', 'roads', 'water', 'green', 'trees', 'rails', 'canopies', 'passageWays']) put('array:' + kind, (map[kind] || []).map((o) => h(stable(o))));
put('array:furniture (op inhoud)', (map.furniture || []).map((o) => h(stable(o))).sort());
for (const kind of Object.keys(map._res)) put('register:' + kind, [...map._res[kind]].sort((a, b) => a[0] - b[0]).map(([gid, e]) => gid + ':' + h(stable(e.obj))));
put('resident', [...map.resident].sort());
put('meta', [h(stable(map.meta))]);
const E = map.elev || {};
for (const k of ['segs', 'walls', 'skirts', 'floors', 'brkWalls', 'cuts']) out.counts['elevatie:' + k] = (E[k] || []).length;
put('elevatie', Object.keys(out.counts).filter((k) => k.startsWith('elevatie:')).map((k) => k + '=' + out.counts[k]));
put('waterVer', [String(map._waterVer || 0)]);

let seed = 987654321;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pts = Array.from({ length: 40000 }, () => [(rnd() - 0.5) * 18000 - 1000, (rnd() - 0.5) * 18000 - 2000]);
const ids = new Map(); let nid = 0;
const idOf = (o) => { let i = ids.get(o); if (i === undefined) ids.set(o, i = nid++); return i; };
const names = (list) => list.map((o) => h(stable(o))).sort().join(','); // (de volgorde in een rastercel hangt af van de volgorde waarin de overlays binnenkwamen; die was bij het streamen van de store nooit vast)
const q = (f) => pts.map(([x, y]) => f(x, y));
put('vraag:buildingsNear', q((x, y) => names(map.buildingsNear(x, y, 30))));
put('vraag:roadsNear', q((x, y) => names(map.roadsNear(x, y, 30))));
put('vraag:waterNear', q((x, y) => names(map.waterNear(x, y, 30))));
put('vraag:railNear', q((x, y) => names(map.railNear(x, y, 40))));
put('vraag:hedgeNear', q((x, y) => names(map.hedgeNear(x, y, 40))));
put('vraag:landUseAt', q((x, y) => String(map.landUseAt(x, y))));
put('vraag:groundHeightAt', q((x, y) => String(Math.round(map.groundHeightAt(x, y, 0) * 1000))));
put('vraag:nearestRoadPoint', q((x, y) => { const r = map.nearestRoadPoint(x, y, 60); return r ? [Math.round(r.x * 100), Math.round(r.y * 100), h(stable(r.road || r.r || null))].join('/') : '-'; }));
put('vraag:queryView', [h(stable(Object.fromEntries(Object.entries(map.queryView(-2000, -3000, 2000, 1000, true)).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]))))]);
fs.writeFileSync(arg('uit') || 'overlay_parity.json', JSON.stringify(out));
console.log(`handtekening geschreven (${Object.keys(out.digests).length} onderdelen, ${map.resident.size} tegels resident)`);
