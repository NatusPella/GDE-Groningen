// Parkkit van streekplekken (bomen en heggen in een rechthoek om een OSM-park) tegen de wegen van de tegels.
// De rechthoek is de omhullende van het park en kan een weg kruisen; de kit hoort dan niet op het wegdek.
// Telt per park wat er zonder filter op een rijbaan staat, en wat er na de filter (dropOnRoad) overblijft.
//
//   node scripts/world/park_road_audit.mjs [--strict] [--world <map>] [--json]
//
// Gebruikt de tegels in game/world (of --world); zonder tegels: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';
import { loadTiles, mapOf, judge } from './prop_conflict_audit.mjs';
import { worldDir } from '../lib/worldlocator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import('../../game/js/gdt.js');
const PW = await import('../../game/js/provinceworld.js');
const SP = await import('../../game/js/streekplekken.js');

export async function auditParks(worldDir, plekkenFile) {
  const index = JSON.parse(fs.readFileSync(path.join(worldDir, 'index-provincie.json'), 'utf8'));
  const plekken = JSON.parse(fs.readFileSync(plekkenFile, 'utf8')).plekken.filter((p) => p.t === 'park');
  const res = { parks: 0, parksHit: 0, trees: 0, treesOnRoad: 0, hedges: 0, hedgesOnRoad: 0, treesAfter: 0, hedgesAfter: 0, worst: [] };
  for (const p of plekken) {
    const [ci, cj] = G.tileIndexOf(p.x, p.y);
    const keys = [];
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) { const k = G.tileKey(i, j); if (index.tiles[k]) keys.push(k); }
    if (!keys.length) continue;
    const tiles = loadTiles(worldDir, index, keys);
    const J = judge(mapOf(tiles));
    res.parks++;
    const parts = SP.partsToWorld(p);
    // een part is een boom (kegel) of een heg (lage lange doos in kit-ruimte); y van het wereldpunt is part.z
    let hit = 0;
    const onRoad = (q) => J.onRoad(q.x, q.z);
    for (const q of parts) {
      if (q.s === 'cone') { res.trees++; if (onRoad(q)) { res.treesOnRoad++; hit++; } }
      else if (q.s === 'box' && q.h === 1.0) { res.hedges++; if (SP.hedgeSamples(q).some((s) => J.onRoad(s[0], s[1]))) { res.hedgesOnRoad++; hit++; } }
    }
    const kept = SP.dropOnRoad(parts, (x, y) => J.onRoad(x, y));
    for (const q of kept) {
      if (q.s === 'cone' && onRoad(q)) res.treesAfter++;
      else if (q.s === 'box' && q.h === 1.0 && SP.hedgeSamples(q).some((s) => J.onRoad(s[0], s[1]))) res.hedgesAfter++;
    }
    if (hit) { res.parksHit++; res.worst.push({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), hit }); }
  }
  res.worst.sort((a, b) => b.hit - a.hit);
  res.worst = res.worst.slice(0, 10);
  return res;
}

async function main() {
  const args = process.argv.slice(2);
  const wi = args.indexOf('--world');
  const worldDir = wi >= 0 ? args[wi + 1] : worldDir();
  const plekkenFile = fs.existsSync(path.join(ROOT, 'game/streekplekken.json')) ? path.join(ROOT, 'game/streekplekken.json') : path.join(worldDir, '../streekplekken.json');
  if (!fs.existsSync(path.join(worldDir, 'index-provincie.json')) || !fs.existsSync(plekkenFile)) { console.log('SKIP geen tegels of streekplekken.json'); return; }
  const r = await auditParks(worldDir, plekkenFile);
  if (args.includes('--json')) console.log(JSON.stringify(r));
  else {
    console.log(`${r.parks} parken met tegels; ${r.parksHit} met kit op een rijbaan`);
    console.log(`bomen op de weg: ${r.treesOnRoad} van ${r.trees} (na filter ${r.treesAfter}); heggen op de weg: ${r.hedgesOnRoad} van ${r.hedges} (na filter ${r.hedgesAfter})`);
    for (const w of r.worst) console.log(`  park ${w.id} (${w.x}, ${w.y}): ${w.hit} onderdelen op de weg`);
  }
  if (args.includes('--strict') && (r.treesAfter || r.hedgesAfter)) { console.log('TE VEEL parkkit op de weg na de filter'); process.exit(1); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
