// Real building heights and roofs (docs/PROVINCIE-PLAN.md 0.1):
//   node scripts/buildingheights_test.mjs
// - the chain 3dbag > osm_height > osm_levels > default, roofs from 3D BAG and
//   OSM, the walls under a pitched roof, a tower with a low wing;
// - the map: nearly every building from the 3D BAG, the storeys from the
//   walls, recognisable skyline heights; the drawn house reaches its ridge;
// - the 3D BAG and AHN readers of the fetch scripts on the cached downloads
//   (skipped when nothing was fetched).
import './node3d.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const BH = await import('../game/js/buildingheights.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// the chain
const house = BH.heightOf(null, { hmax: 9.4, h50: 7.2, hg: 0.4, roof: 'slanted' }, 3);
ok(house.src === '3dbag' && house.hm === 9 && house.roof === 'gable', 'a 3D BAG house: ridge above the ground, gable', JSON.stringify(house));
ok(Math.abs(house.eave - (9 - 2 * (9 - 6.8))) < 0.01, 'its walls end as far under the median as the ridge is above it', house.eave);
const tower = BH.heightOf(null, { hmax: 71.4, h50: 5.4, hg: 0.9, roof: 'slanted' }, 23);
ok(tower.roof === 'flat' && tower.eave === tower.hm, 'a tower with a low wing: the tower, flat', JSON.stringify(tower));
const flat = BH.heightOf(null, { hmax: 18.2, h50: 17.9, hg: 1.2, roof: 'horizontal' }, 4);
ok(flat.roof === 'flat' && flat.eave === 17, 'a flat roof: walls to the top', JSON.stringify(flat));
ok(BH.heightOf({ h: 11.5, roof: 'hipped' }, null, 3).src === 'osm_height' && BH.heightOf({ h: 11.5, roof: 'hipped' }, null, 3).roof === 'hip', 'then OSM height (and roof:shape)');
ok(BH.heightOf({ lv: 4 }, null, 3).hm === 12.4 && BH.heightOf({ lv: 4 }, null, 3).src === 'osm_levels', 'then OSM levels');
ok(BH.heightOf(null, null, 2).src === 'default' && BH.heightOf(null, null, 2).hm === 6.2, 'last the default');
ok(BH.roofOf({ roof: 'multiple horizontal' }) === 'flat' && BH.roofOf({ roof: 'skillion' }) === 'shed' && BH.roofOf({ roof: 'unknown' }) === null, 'roof shapes');
ok(BH.levelsFor(6.2) === 2 && BH.levelsFor(1) === 0.8, 'storeys of 3.1 m');
ok(BH.bagKey('NL.IMBAG.Pand.0014100000012345') === BH.bagKey('14100000012345'), 'BAG ids with and without the prefix and zeros');

// the map
const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData({ extras: false });
const B = data.buildings;
const from = (s) => B.filter((b) => b.hsrc === s).length;
ok(from('3dbag') / B.length > 0.9, 'nearly every building from the 3D BAG', `${from('3dbag')} of ${B.length}`);
ok(B.every((b) => b.h >= 0.8 || b.landmark), 'no building under a storey');
const measured = B.filter((b) => b.hm && !b.landmark);
ok(measured.every((b) => Math.abs(BH.levelsFor(b.h * BH.LEVEL_M) - b.h) < 0.11 && b.h * BH.LEVEL_M <= Math.max(b.hm, 0.8 * BH.LEVEL_M) + 0.2), 'storeys are the walls, under the ridge (a shed: at least 0.8)');
const tall = measured.filter((b) => b.hm > 40).length;
ok(tall >= 10 && tall < 200, 'a skyline: some tens of buildings over 40 m', tall);
const homes = measured.filter((b) => b.rk === 'gable' && b.hm > 6 && b.hm < 13);
ok(homes.length > 5000, 'thousands of gabled houses of 6-13 m', homes.length);
// the drawn house reaches its ridge
{
  const M = await import('../game/js/models3d_buildings.js');
  const THREE = await import('three');
  const hs = homes.filter((b) => b.pts.length === 5 || b.pts.length === 4).slice(0, 40);
  let near = 0, tried = 0;
  for (const b of hs) {
    b.bounds = b.bounds || [Math.min(...b.pts.map((p) => p[0])), Math.min(...b.pts.map((p) => p[1])), Math.max(...b.pts.map((p) => p[0])), Math.max(...b.pts.map((p) => p[1]))];
    let g;
    try { g = M.buildBuildingMesh(b); } catch (e) { continue; }
    tried++;
    const box = new THREE.Box3().setFromObject(g);
    if (Math.abs(box.max.y - b.hm) < 1.6) near++;
  }
  ok(tried > 10 && near / tried > 0.6, 'a drawn gabled house reaches its measured ridge (within 1.6 m)', `${near} of ${tried}`);
}

// the readers of the fetch scripts on cached downloads
const idx = new URL('../data/cache/3dbag/', import.meta.url);
if (fs.existsSync(idx)) {
  const out = execFileSync('python3', ['-c', `
import sys, glob, json
sys.path.insert(0, 'scripts/world')
import importlib.util
spec = importlib.util.spec_from_file_location('f', 'scripts/world/fetch_3dbag.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
fgb = sorted(glob.glob('data/cache/3dbag/*/tile_index.fgb'))
tiles = sorted(glob.glob('data/cache/3dbag/*/tiles/*.gpkg.zip'))
feats = m.read_fgb(open(fgb[0], 'rb').read()) if fgb else []
recs = m.extract_tile(tiles[0]) if tiles else []
print(json.dumps({'index': len(feats), 'tile_id': bool(feats and feats[0][0].get('tile_id')), 'recs': len(recs), 'sample': recs[0] if recs else None}))
`], { cwd: new URL('..', import.meta.url).pathname }).toString();
  const r = JSON.parse(out);
  ok(r.index > 1000 && r.tile_id, '3D BAG tile index read (FlatGeobuf)', r.index);
  ok(r.recs > 100 && r.sample && Number.isFinite(r.sample.hmax) && r.sample.roof, 'a 3D BAG tile read (GeoPackage)', JSON.stringify(r.sample));
} else console.log('(no 3D BAG downloads cached: scripts/world/fetch_3dbag.py)');

console.log(`${n - fails}/${n} building height checks passed`);
process.exit(fails ? 1 : 0);
