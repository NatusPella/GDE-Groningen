// Bereikbaarheid van de reisdoelen van akte 2 (22-11, verhaal-perfect): staat de speler na de reis (placeParty zet hem
// precies op `at`) op open grond (droog, buiten een gebouw, uit te lopen) en bij een weg? Alleen lezen.
//   node scripts/akte2_bereik_audit.mjs [--json]
// Gebruikt de gebouwde wereld (game/world of GAME_WORLD, met de provincie); zonder wereld: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './node3d.mjs';

const dir = path.resolve(process.env.GAME_WORLD || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'world'));
if (!fs.existsSync(path.join(dir, 'index-provincie.json'))) { console.log('SKIP akte2_bereik_audit: geen wereld met de provincie (GAME_WORLD of game/world)'); process.exit(0); }
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const G = await import('../game/js/gdt.js');
const { patchRows } = await import('../game/js/vaarnet.js');
const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(path.join(dir, f))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
export const ACT2 = ['N10', 'N8', 'T1', 'N5', 'K1', 'N11', 'N12', 'N6', 'N7', 'T2', 'K2'];
const pts = ACT2.map((id) => {
  const st = STEPS.find((s) => s.id === id);
  return { id, st, p: st && st.goal && st.goal.type === 'reis' ? wgsToWorld(st.goal.at[0], st.goal.at[1]) : null };
});
const keys = new Set();
for (const { p } of pts) if (p) for (let dx = -300; dx <= 300; dx += 100) for (let dy = -300; dy <= 300; dy += 100) {
  const [i, j] = G.tileIndexOf(p[0] + dx, p[1] + dy);
  const k = G.tileKey(i, j);
  if (T.index.tiles[k]) keys.add(k);
}
await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
map.tileQueue.run(1e9);
map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))).filter((r) => !r.strip));

let fails = 0;
const out = [];
for (const { id, st, p } of pts) {
  if (!p) { console.log(`FAIL ${id}: geen reisdoel`); fails++; continue; }
  const [x, y] = p;
  const open = map.isOpenSpot(x, y);
  const road = map.nearestRoadPoint(x, y, 150, false);
  const d = road ? Math.hypot(road.x - x, road.y - y) : null;
  const near = open ? { x, y } : map.openSpotNear(x, y);
  const shift = Math.hypot(near.x - x, near.y - y);
  const good = open && d !== null && d < 80;
  if (!good) fails++;
  out.push({ id, to: st.goal.to, x: Math.round(x), y: Math.round(y), open, wegAfstand: d === null ? null : Math.round(d), verschuif: Math.round(shift), nx: Math.round(near.x), ny: Math.round(near.y) });
  console.log(`${good ? 'ok  ' : 'FAIL'} ${id} ${st.goal.to}: open=${open}, weg op ${d === null ? 'geen' : Math.round(d) + ' m'}${open ? '' : ', open plek op ' + Math.round(shift) + ' m'}`);
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
console.log(`akte2_bereik_audit: ${ACT2.length - fails}/${ACT2.length} ok`);
process.exit(fails ? 1 : 0);
