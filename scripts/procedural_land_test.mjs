// The polder grid (ditches, fences, farms, villages, trees, herds) only on the province's land (#233): the land mask of
// regions.js, the map's drawing (countrymap.js) and the 3D countryside (countryside.js) none over the sea or beyond the
// border. Needs game/world with the province layer for the real outline; about 30 s.
//   node scripts/procedural_land_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const out = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', out))) { console.log('SKIP no game/world with the province layer'); process.exit(0); }
const index = JSON.parse(fs.readFileSync(new URL('index-provincie.json', out), 'utf8'));
const A = await import('./world/procedural_land_audit.mjs');
const R = await import('../game/js/regions.js');
const CF = await import('../game/js/countryfield.js');
const CE = await import('../game/js/countryedge.js');
const CM = await import('../game/js/countrymap.js');

A.setup(index, { mask: true });
// the mask: land where the province is, none at sea or beyond the border
ok(R.provinceLandAt(201, 45), 'the city is land');
ok(R.provinceLandAt(12852, 5971) && R.provinceLandAt(-12463, 6451), 'Hoogezand and Leek are land');
ok(!R.provinceLandAt(0, -31000) && !R.provinceLandAt(-20000, -30000), 'the Wadden Sea is not');
ok(!R.provinceLandAt(0, -60000), 'the North Sea is not');
ok(!R.provinceLandAt(60000, 40000) && !R.provinceLandAt(-40000, 20000), 'beyond the province is not (Germany, Friesland)');
const land = [], sea = [];
for (let x = -20000; x < 40000; x += 2000) for (let y = -34000; y < 40000; y += 2000) (R.provinceLandAt(x, y) ? land : sea).push([x, y]);
ok(land.length > 100 && sea.length > 100, 'both exist on the map grid', `${land.length}/${sea.length}`);
ok(land.every(([x, y]) => R.regionAt(x, y).id === 'groningen') || land.filter(([x, y]) => R.regionAt(x, y).id !== 'groningen').length <= land.length * 0.01, 'the mask agrees with the regions (within a cell of the coast)');

// the 3D countryside: none outside, plenty inside (the audit's windows)
const per = A.pickWindows(index, { n: 2, seed: 11 });
let off = 0, on = 0;
for (const [id, list] of Object.entries(per)) for (const [x, y] of list) { const c = A.total(A.countWindow(x, y)); if (id === 'groningen') on += c; else off += c; }
ok(on > 1000, 'objects on the land', String(Math.round(on)));
ok(off <= on * A.MAX_OFF_SHARE, 'objects off the land stay under the limit', `${Math.round(off)} vs ${Math.round(on)}`);
// the same windows without the mask: the grid is everywhere (the test sees the bug)
A.setup(index, { mask: false });
let off2 = 0;
for (const [id, list] of Object.entries(per)) if (id !== 'groningen') for (const [x, y] of list) off2 += A.total(A.countWindow(x, y));
ok(off2 > off * 20 && off2 > 1000, 'and without the mask there would be plenty', `${Math.round(off2)}`);
A.setup(index, { mask: true });

// the map: the drawing calls over a window of sea are nil, over land there are some
// (the countryside reaches as far as the province map does: provincemap.js bounds; its rect is the old +-2 km round the city)
const PM = await import('../game/js/provincemap.js');
PM.setProvinceMap(index.global.map || null);
CF.setCountryBounds([-2000, -2000, 2000, 2000]);
ok(!!PM.provinceMapBounds(), 'the province map has bounds to draw within');
const rec = () => { const c = { n: 0 }; const f = () => { c.n++; }; return new Proxy({}, { get: (t, k) => (k === 'count' ? c : (k === 'clip' || k === 'save' || k === 'restore' || k === 'beginPath' || k === 'setLineDash' ? () => {} : f)), set: () => true }); };
const draw = (x0, y0, x1, y1) => { const ctx = rec(); CM.drawCountryDetail(ctx, x0, y0, x1, y1, 0.5, CM.MAP_STYLE); return ctx.count.n; };
const seaDraw = draw(-1000, -33000, 2000, -30000), landDraw = draw(9000, -3000, 12000, 0);
ok(landDraw > 100, 'the map draws polder over land', String(landDraw));
ok(seaDraw <= 5, 'and no ditch, road, farm or village over the Wadden Sea (the strokes of empty paths only)', String(seaDraw));
// beyond the border: a 3 km window whose points all lie in Drenthe, Germany or Friesland
const abroad = sea.find(([x, y]) => [[0, 0], [3000, 0], [0, 3000], [3000, 3000]].every(([dx, dy]) => ['drenthe', 'duitsland', 'friesland'].includes(R.regionAt(x + dx, y + dy).id)));
if (abroad) ok(draw(abroad[0], abroad[1], abroad[0] + 3000, abroad[1] + 3000) <= 5, 'and none beyond the border', JSON.stringify(abroad));
else console.log('note: no window beyond the border found on the grid');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
