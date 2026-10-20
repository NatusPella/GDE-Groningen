// De stadsschaduw (build_province.mjs --only) tegen citymap.json (#90 S2): in de kerntegels
// liggen gebouwen en wegen binnen 10 % van elkaar. Slaat over zonder provincie-extract.
import assert from 'node:assert/strict';
import '../scripts/node3d.mjs';
import * as P from './world/pack_tiles.mjs';
import { buildProvince, haveProvince } from './world/build_province.mjs';
import { diffTiles, CORE_BUILDINGS } from './world/city_diff.mjs';
import { loadLegacySources } from './lib/loadworld.mjs';

if (!haveProvince()) { console.log('SKIP city_diff_test: geen data/cache/province'); process.exit(0); }
const city = P.build(await loadLegacySources());
const shadow = buildProvince({ cityKeys: new Set(), only: new Set(city.blobs.keys()), map: false, fillOld: false });
assert.equal(shadow.blobs.size, city.blobs.size, 'elke stadstegel heeft een schaduw');
const { perTile } = diffTiles(city.blobs, shadow.blobs);
const core = [...perTile.values()].filter((t) => t.schaduw && t.stad.gebouwen >= CORE_BUILDINGS);
assert.ok(core.length >= 10, `kerntegels ${core.length}`);
for (const c of ['gebouwen', 'wegen']) {
  const a = core.reduce((n, t) => n + t.stad[c], 0), b = core.reduce((n, t) => n + t.schaduw[c], 0);
  assert.ok(Math.abs(b / a - 1) < 0.1, `${c}: stad ${a} schaduw ${b}`);
}
console.log(`city_diff_test: ok (${core.length} kerntegels)`);
