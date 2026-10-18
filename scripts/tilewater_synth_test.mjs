// Tile water on synthetic tiles (issue #1), without the province extract:
// two hand-made .gdt tiles carry a canal cut at their border, a lake with its
// own peil and a ditch; the second tile streams in after the first. Checks the
// one water path: waterAt (boats, swimmers), shallowWater (cars), the quay or
// bank of a polygon, the cut polygon carrying on over the tile border, and the
// drop of a tile taking its water away. Always summer: no ice anywhere.
//   node scripts/tilewater_synth_test.mjs
import zlib from 'node:zlib';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const L = await import('../game/js/waterlevels.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const [x0, y0] = G.tileOrigin(0, 0), [x1] = G.tileOrigin(1, 0);
const rect = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]];
// canal 30 m wide along y0+100..130, cut at the border x1
const canalA = L.annotateProvinceWater([{ gid: 0, pts: rect(x0 + 100, y0 + 100, x1, y0 + 130) }], { base: 0, village: () => true }).rows[0];
const canalB = L.annotateProvinceWater([{ gid: 1, pts: rect(x1, y0 + 100, x1 + 400, y0 + 130) }], { base: 0 }).rows[0];
canalB.body = canalA.body; // the cut polygon is one body
// a lake with its own peil, a ditch in tile 1
const lake = { gid: 2, pts: rect(x1 + 500, y0 + 500, x1 + 900, y0 + 900), kind: 'meer', lv: 0.4, dp: 3, nav: 2, body: 7, bank: 'oever' };
const ditch = { gid: 3, pts: rect(x1 + 100, y0 + 300, x1 + 300, y0 + 303), kind: 'vaart', lv: -0.5, dp: 0.5, nav: 0, body: 8, bank: 'oever' };

const blob = (i, j, rows) => G.encodeBlob({ i, j, sections: [{ type: G.SECTION.WATER, rows }] });
const meta = G.encodeBlob({ sections: [{ type: G.SECTION.META, json: { counts: { water: 1 }, meta: {} } }] });
const parts = [[blob(0, 0, [canalA]), '0_0'], [blob(1, 0, [canalB, lake, ditch]), '1_0'], [meta, 'global']].map(([b, k]) => ({ k, b, z: new Uint8Array(zlib.deflateRawSync(b)) }));
let off = 0;
const index = { format: G.GDT_FORMAT, builder: 1, frame: 'rd-new', tileM: G.TILE_M, grid: [G.GRID_X0, G.GRID_Y0], rdTile0: [G.RD_TILE_X0, G.RD_TILE_Y0], counts: {}, packs: { p: { file: 'p.gdp' } }, tiles: {}, pins: {} };
const packBytes = [];
for (const p of parts) {
  const e = { off, len: p.z.length, raw: p.b.length, hash: G.hash64(p.b) };
  off += p.z.length; packBytes.push(p.z);
  if (p.k === 'global') index.global = { pack: 'p', ...e };
  else { const [i, j] = p.k.split('_').map(Number); index.tiles[G.tileKey(i, j)] = { i, j, pack: 'p', ...e, flags: 0, n: { water: p.k === '0_0' ? 1 : 3 }, maxH: 0 }; }
}
index.packs.p.size = off;
const all = new Uint8Array(off); let o = 0; for (const z of packBytes) { all.set(z, o); o += z.length; }
index.pins.city = { tiles: [G.tileKey(0, 0)] };
const files = { 'index.json': new TextEncoder().encode(JSON.stringify(index)), 'p.gdp': all };

const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false });
const map = T.world;
const cy = y0 + 115;

ok(L.waterAt(map, x0 + 500, cy)?.navigable >= 1, 'canal in the pinned tile answers waterAt');
ok(L.waterAt(map, x0 + 500, y0 + 500) === null, 'dry land answers null');
ok(L.waterAt(map, x1 + 200, cy) === null, 'tile 1 water is not there before it streams in');
await T.store.request(G.tileKey(1, 0), { priority: 0 });
map.tileQueue.run(1e9);
const wa = L.waterAt(map, x0 + 900, cy), wb = L.waterAt(map, x1 + 200, cy);
ok(wa && wb, 'both halves of the cut canal answer');
ok(wa && wb && wa.body === wb.body && wa.kind === wb.kind && wa.level === wb.level, 'the cut canal carries on over the border as one body', JSON.stringify([wa, wb]));
ok(wa && wa.navigable >= 1 && !wa.wade, 'a canal is sailable and not wadeable');
ok(L.waterPolyAt(map, x0 + 500, cy).bank === 'kade' && L.waterPolyAt(map, x1 + 200, cy).bank === 'oever', 'quay in the village stretch, natural bank outside');
const lw = L.waterAt(map, x1 + 700, y0 + 700);
ok(lw && lw.kind === 'meer' && lw.level === 0.4 && lw.body === 7, 'a lake keeps its own peil', JSON.stringify(lw));
const sw = L.shallowWater(map, x1 + 200, y0 + 301.5);
ok(sw && sw.wade && sw.level > L.BOEZEM_Y, 'a ditch is shallow water cars drive through');
ok(L.shallowWater(map, x1 + 200, cy) === null, 'deep canal water is not shallow');
ok(Object.values(L.WATER_KINDS).every((k) => !('ice' in k) && !/ijs|ice|snow/i.test(JSON.stringify(k))), 'no ice kind: always summer');
// the border itself: no gap, both sides of the seam
for (const dx of [-0.5, 0, 0.5]) ok(!!L.waterAt(map, x1 + dx, cy), `no gap at the tile seam (dx ${dx})`);
// dropping tile 1 takes its water away, tile 0 keeps its half
T.store.unpin?.(G.tileKey(1, 0));
map.dropTile(`1,0`);
ok(L.waterAt(map, x1 + 200, cy) === null && !!L.waterAt(map, x0 + 500, cy), 'a dropped tile takes its water, the other stays');

console.log(fails ? `${fails}/${n} FAILED` : `tilewater_synth ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
