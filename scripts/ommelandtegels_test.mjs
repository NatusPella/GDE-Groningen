// The tiles are the one source in the old Ommeland area (issue #3): every
// building, road and rail point of game/ommeland.* lies in a tile of the
// built world (a province tile, the overlay of a city tile, or a city tile),
// so nothing in that area needs the old layers any more.
// Needs game/world (desktop stage, or pack_tiles + build_corridor + build_province).
//   node scripts/ommelandtegels_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import zlib from 'node:zlib';

const G = await import('../game/js/gdt.js');
const root = new URL('../game/', import.meta.url);
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, root)));
// GDE_WORLD_DIR: another folder with index-provincie.json (a build into a scratch folder)
const provDir = process.env.GDE_WORLD_DIR ? new URL(process.env.GDE_WORLD_DIR.replace(/\/?$/, '/'), 'file:///') : new URL('world/', root);

if (!fs.existsSync(new URL('index-provincie.json', provDir))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const city = read('world/index.json');
const prov = JSON.parse(fs.readFileSync(new URL('index-provincie.json', provDir)));
// a tile of the built world: the province's (also an overlay, keyed by the city tile it belongs to) or a city tile
const keys = new Set();
for (const t of Object.values(prov.tiles)) if (t.flags & 4 && t.flags & 32) keys.add(G.tileKey(t.i, t.j));
for (const k of Object.keys(city.tiles)) keys.add(k);
const covered = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return keys.has(G.tileKey(i, j)); };

// the boxes and roads of the old data
const om = read('ommeland.json');
const bin = zlib.gunzipSync(fs.readFileSync(new URL('ommeland.bin', root)));
const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const head = new DataView(buf, 0, 12);
const n = head.getUint32(4, true), stride = head.getUint32(8, true);
const I = new Int16Array(buf, 12, n * stride);
const gap = new Map();
const miss = (x, y) => { const [i, j] = G.tileIndexOf(x, y); const k = G.tileKey(i, j); gap.set(k, (gap.get(k) || 0) + 1); };
let b = 0, r = 0;
for (let i = 0; i < n; i++) if (!covered(I[i * stride], I[i * stride + 1])) { b++; miss(I[i * stride], I[i * stride + 1]); }
for (const road of om.roads) for (let i = 0; i < road.p.length; i += 2) if (!covered(road.p[i], road.p[i + 1])) { r++; miss(road.p[i], road.p[i + 1]); }
for (const rail of om.rails) for (let i = 0; i < rail.length; i += 2) if (!covered(rail[i], rail[i + 1])) { r++; miss(rail[i], rail[i + 1]); }
ok(b === 0, `${b} old buildings lie outside every tile (${[...gap.keys()].slice(0, 6).join(' ')})`);
ok(r === 0, `${r} old road and rail points lie outside every tile (${[...gap.keys()].slice(0, 6).join(" ")})`);

// the filled tiles (the extract's strip stops short of the old area's south-west corner)
const filled = Object.values(prov.tiles).filter((t) => t.src === 'ommeland');
ok(filled.length >= 15, `the old area's gap is filled from the old data (${filled.length} tiles)`);
ok(filled.every((t) => t.flags & 8 && t.flags & 16 && t.flags & 32 && t.flags & 4), 'filled tiles carry the old-area, buffer, province and built flags');
// the places of that corner keep their names
const names = new Set(prov.global.places.map((p) => p.name));
for (const p of ['Peize', 'Altena']) ok(names.has(p), `${p} is a place of the province layer`);
console.log(`ommelandtegels: ${n} old buildings, ${om.roads.length} roads, ${filled.length} filled tiles, ${b + r} points outside the tiles`);
console.log(fails ? `${fails} FAIL` : 'PASS');
process.exit(fails ? 1 : 0);
