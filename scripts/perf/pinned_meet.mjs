// De vaste (gepinde) set van de stad meten (#314): laadtijd van loadTileWorld, heap van de wereld, lengtes van de hele arrays,
// het aantal tegels en bestanden. Variant 'worker' laadt de stad zoals de geometrieworker (loadMapAuto: de stadstegels, en bij een
// wereld van voor de samenvoeging de overlaytegels uit index-provincie.json), 'spel' zoals main.js (met index-provincie.json).
//   GAME_WORLD=<wereldmap> node scripts/perf/pinned_meet.mjs [rondes]
// Elke meting is een eigen proces (een tweede ronde in hetzelfde proces erft de vorige: caches, GC). Zonder wereld: SKIP.
// Een drukke machine maakt de ms onbruikbaar; de aantallen en de heap niet.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { wereldMap, heeftWereld } from '../lib/stadtegels.mjs';

const MB = (n) => Math.round(n / 1048576 * 10) / 10;
const VAR = process.env.PINNED_VARIANT;
if (!heeftWereld()) { console.log('SKIP pinned_meet: geen wereld (GAME_WORLD)'); process.exit(0); }
const dir = wereldMap();

if (VAR) {
  const S = await import('../../game/js/tilestore.js');
  const { loadTileWorld } = await import('../../game/js/tileworld.js');
  const files = {};
  for (const f of fs.readdirSync(dir)) if (/\.(gdp|json|gz)$/.test(f)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
  const loose = fs.existsSync(path.join(dir, 'index-provincie.json')) && Object.values(JSON.parse(fs.readFileSync(path.join(dir, 'index-provincie.json'), 'utf8')).tiles).some((t) => t.ov && !t.in);
  const extra = VAR === 'spel' ? [{ name: 'index-provincie.json' }] : loose ? [{ name: 'index-provincie.json', only: (q) => !!q.ov }] : [];
  const heap = () => { for (let i = 0; i < 4; i++) global.gc(); return process.memoryUsage().heapUsed; };
  const h0 = heap();
  const t0 = performance.now();
  const tw = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra });
  const ms = Math.round(performance.now() - t0);
  const w = tw.world;
  console.log(JSON.stringify({
    ms, heapMB: MB(heap() - h0), resident: w.resident.size,
    arrays: { buildings: w.buildings.length, roads: w.roads.length, water: w.water.length, green: w.green.length, trees: w.trees.length, rails: w.rails.length },
    grid: { buildings: w._res.buildings.size, roads: w._res.roads.size, trees: w._res.trees.size },
  }));
  process.exit(0);
}

const rondes = +process.argv[2] || 3;
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
let prov = null;
try { prov = JSON.parse(fs.readFileSync(path.join(dir, 'index-provincie.json'), 'utf8')); } catch (e) { /* geen provincie */ }
const ovl = prov ? Object.values(prov.tiles).filter((t) => t.ov && !t.in) : [];
const merged = prov ? Object.values(prov.tiles).filter((t) => t.ov && t.in).length : 0;
const out = {
  wereld: dir, stadstegels: Object.keys(index.tiles).length, gepind: index.pins.city.tiles.length, packs: Object.keys(index.packs).length,
  overlaytegels: ovl.length, samengevoegd: merged, overlayKB: Math.round(ovl.reduce((s, t) => s + t.len, 0) / 1024), provTegels: prov ? Object.keys(prov.tiles).length : 0,
  bestanden: fs.readdirSync(dir).length, counts: index.counts, varianten: {},
};
const me = fileURLToPath(import.meta.url);
for (const naam of prov ? ['worker', 'spel'] : ['worker']) {
  const rs = [];
  for (let k = 0; k < rondes; k++) {
    const r = spawnSync(process.execPath, ['--expose-gc', me], { env: { ...process.env, PINNED_VARIANT: naam }, encoding: 'utf8' });
    try { rs.push(JSON.parse(r.stdout.trim().split('\n').pop())); } catch (e) { console.error(r.stderr); }
  }
  const med = (k) => rs.map((r) => r[k]).sort((a, b) => a - b)[rs.length >> 1];
  out.varianten[naam] = { ms: rs.map((r) => r.ms), msMediaan: med('ms'), heapMB: rs.map((r) => r.heapMB), heapMediaan: med('heapMB'), resident: rs[0].resident, arrays: rs[0].arrays, grid: rs[0].grid };
}
console.log(JSON.stringify(out, null, 1));
