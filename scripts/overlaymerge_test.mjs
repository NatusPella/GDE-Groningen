// De overlaytegels van de stad zitten in hun stadstegel (#314, C2): merge_overlays.mjs zet de rijen van een overlay achter die van de
// stadstegel, loadTileWorld scheidt ze weer (gids vanaf 20.000.000) en zet ze in de rasters zoals de overlaytegel eerder, de hele
// arrays houden alleen de stadsrijen. Een wereld van voor de samenvoeging (overlays als eigen tegel) laadt hetzelfde.
//   node scripts/overlaymerge_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
const G = await import('../game/js/gdt.js');
const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const P = await import('./world/pack_tiles.mjs');
const { mergeOverlays } = await import('./world/merge_overlays.mjs');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const GID0 = TW.OVERLAY_GID0;
const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
const [ci, cj] = [0, 0];
const [ox, oy] = G.tileOrigin(ci, cj);
const cityBlob = G.encodeBlob({ i: ci, j: cj, flags: 1, builder: 1, sections: [
  { type: G.SECTION.BUILDINGS, rows: [{ gid: 0, pts: sq(ox + 100, oy + 100, 10), type: 'house' }, { gid: 1, pts: sq(ox + 200, oy + 100, 10), type: 'house' }] },
  { type: G.SECTION.ROADS, rows: [{ gid: 0, pts: [[ox + 50, oy + 50], [ox + 300, oy + 50]], width: 6, cat: 'minor', type: 'residential' }] },
  { type: G.SECTION.TREES, rows: [{ g: 0, p: [[ox + 10, oy + 10]], s: 1, h: 50, f: 0 }] },
] });
const ovBlob = G.encodeBlob({ i: ci, j: cj, flags: 1 | 4 | 32 | 64, builder: 1, sections: [
  { type: G.SECTION.BUILDINGS, rows: [{ gid: GID0, pts: sq(ox + 700, oy + 100, 10), type: 'house', hm: 7.5 }] },
  { type: G.SECTION.ROADS, rows: [{ gid: GID0, pts: [[ox + 600, oy + 60], [ox + 900, oy + 60]], width: 5, cat: 'minor', type: 'residential' }] },
  { type: G.SECTION.TREES, rows: [{ g: GID0, p: [[ox + 650, oy + 650]], s: 2, h: 80, f: 0 }] },
  { type: G.SECTION.FURNITURE, rows: [{ gid: GID0, k: 'hedge', pts: [[ox + 700, oy + 200], [ox + 760, oy + 200]], osm: 9 }] },
] });
const key = G.tileKey(ci, cj);
const counts = { buildings: 2, roads: 1, water: 0, green: 0, trees: 1, rails: 0, canopies: 0, passageWays: 0, furniture: 0, parcels: 0 };
const global = G.encodeBlob({ builder: 1, sections: [{ type: G.SECTION.META, json: { meta: {}, counts } }] });

// een wereld in een tijdelijke map: de stad (index.json) en de provincie met de overlay als eigen tegel (index-provincie.json)
function makeWorld(dir) {
  P.writeWorld(dir, { blobs: new Map([[key, { bytes: cityBlob, i: ci, j: cj, flags: 1, n: { buildings: 2, roads: 1, trees: 1 }, maxH: 0 }]]), global, counts }, new Set([key]));
  const z = new Uint8Array(zlib.deflateRawSync(ovBlob));
  const file = 'v0_0-test.gdp';
  fs.writeFileSync(path.join(dir, file), z);
  fs.writeFileSync(path.join(dir, 'index-provincie.json'), JSON.stringify({
    format: G.GDT_FORMAT, layer: 'provincie', packs: { v0_0: { file, size: z.length } },
    tiles: { ['o' + key]: { i: ci, j: cj, pack: 'v0_0', off: 0, len: z.length, raw: ovBlob.length, hash: G.hash64(ovBlob), flags: 1 | 4 | 32 | 64, n: { buildings: 1, roads: 1, trees: 1, furniture: 1 }, maxH: 0, ov: true } },
    global: { places: [] },
  }));
}
async function load(dir) {
  const files = {};
  for (const f of fs.readdirSync(dir)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
  return TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: [{ name: 'index-provincie.json' }] });
}
const look = (T) => {
  const m = T.world;
  const b = m.buildingsNear(ox + 705, oy + 105, 3)[0];
  return {
    arrays: [m.buildings.length, m.roads.length, m.trees.length].join('/'),
    bNear: m.buildingsNear(ox + 705, oy + 105, 3).length,
    rNear: m.roadsNear(ox + 700, oy + 60, 3).length,
    hedge: m.hedgeNear(ox + 730, oy + 200, 5).length,
    resident: [...m.resident].sort().join(' '),
    treeAt: m.treeGrid.query(ox + 640, oy + 640, ox + 660, oy + 660).length,
    hm: b && b.hm,
    hasGid: Object.hasOwn(b || {}, 'gid'),
  };
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-ovmerge-'));
const A = path.join(tmp, 'oud'), M = path.join(tmp, 'samen');
fs.mkdirSync(A); fs.mkdirSync(M);
makeWorld(A); makeWorld(M);
const before = look(await load(A));
const r = mergeOverlays(M);
ok(r.merged === 1, 'één overlay samengevoegd', JSON.stringify(r));
ok(mergeOverlays(M).merged === 0, 'nogmaals samenvoegen doet niets');
const mi = JSON.parse(fs.readFileSync(path.join(M, 'index.json'), 'utf8')), mp = JSON.parse(fs.readFileSync(path.join(M, 'index-provincie.json'), 'utf8'));
ok(mi.tiles[key].flags === 1, 'de vlag van de stadstegel verandert niet', String(mi.tiles[key].flags));
ok(mi.tiles[key].n.buildings === 3 && mi.tiles[key].n.furniture === 1, 'de tellingen van de stadstegel tellen de overlay mee', JSON.stringify(mi.tiles[key].n));
ok(mp.tiles['o' + key].in === key && mp.tiles['o' + key].flags === (1 | 4 | 32 | 64) && mp.tiles['o' + key].ov, 'de overlay blijft als lege tegel met zijn vlaggen en wijst naar de stadstegel');
const et = mp.tiles['o' + key];
const empty = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(fs.readFileSync(path.join(M, mp.packs.v0_0.file)).subarray(et.off, et.off + et.len))));
ok(empty.sections.length === 0, 'de lege overlaytegel heeft geen secties');
const after = look(await load(M));
ok(JSON.stringify(after) === JSON.stringify(before), 'samengevoegd laadt hetzelfde als met de overlay als eigen tegel', JSON.stringify(before) + ' <> ' + JSON.stringify(after));
ok(after.arrays === '2/1/1', 'de hele arrays houden alleen de stadsrijen', after.arrays);
ok(after.bNear === 1 && after.rNear === 1 && after.hedge === 1 && after.treeAt === 1, 'de overlayrijen zitten in de rasters', JSON.stringify(after));
ok(after.resident === '0,0 o0,0', 'de stadstegel en de overlay zijn resident', after.resident);
ok(after.hm === 7.5 && !after.hasGid, 'een overlayrij houdt zijn eigenschappen en heeft geen id-veld');

// splitOverlay: een tegel zonder overlayrijen blijft zoals hij is, bomen gaan op hun g
const plain = { i: 0, j: 0, sections: [{ type: G.SECTION.BUILDINGS, rows: [{ gid: 3, pts: sq(0, 0, 1) }] }] };
ok(TW.splitOverlay(plain).city === plain && TW.splitOverlay(plain).overlay === null, 'splitOverlay: zonder overlayrijen dezelfde tegel');
const mixed = { i: 0, j: 0, sections: [{ type: G.SECTION.TREES, rows: [{ g: 1, p: [[1, 1]] }, { g: GID0 + 4, p: [[2, 2]] }] }, { type: G.SECTION.JUNCTIONS, rows: [{ k: 'x' }] }] };
const sp = TW.splitOverlay(mixed);
ok(sp.city.sections[0].rows.length === 1 && sp.overlay.sections.length === 1 && sp.overlay.sections[0].rows[0].g === GID0 + 4 && sp.city.sections.length === 2, 'splitOverlay: bomen op g, andere secties blijven bij de stad');
const aside = { i: 0, j: 0, sections: [{ type: G.SECTION.ROADS, rows: [{ a: 1 }, { a: 2 }, { a: 3 }], gids: [5, GID0, GID0 + 1] }] };
const sa = TW.splitOverlay(aside);
ok(sa.city.sections[0].gids.join() === '5' && sa.overlay.sections[0].gids.join() === `${GID0},${GID0 + 1}` && sa.overlay.sections[0].rows.length === 2, 'splitOverlay: rijen en ids apart blijven gelijk');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
