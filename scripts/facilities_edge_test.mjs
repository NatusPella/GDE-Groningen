// #285: a respawn never leads to a site past the province edge (Drenthe), where the tiles have no
// road for the car. Runs without the world: hand-made sites. node scripts/facilities_edge_test.mjs
import './node3d.mjs';
const Fac = await import('../game/js/facilities.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
Fac.initFacilities({ meta: { bounds: [-100000, -100000, 100000, 100000], lat0: 53.2, lon0: 6.57 } }, null);
const mk = (name, kind, x, y, extra = {}) => ({ name, kind, x, y, ...extra });
const list = [mk('Huisartsenpraktijk Paterswolde', 'doctors', 312, 7654), mk('Huisartsenpost Noord', 'gppost', 2000, 3000, { emergency: true }), mk('Doktersplek Stad', 'doctors', 0, 400)];
Fac.FAC.byKind = new Map([['doctors', list.filter((f) => f.kind === 'doctors')], ['gppost', [list[1]]], ['hospital', []], ['ambulance', []], ['police', [mk('Bureau Drenthe', 'police', 2693, 10470), mk('Bureau Stad', 'police', 100, 200)]]]);
Fac.FAC.all = list; Fac.FAC.ready = true;
const m = Fac.nearestFacility('medical', 300, 7600, { maxD: 1e9 });
ok(m && m.name !== 'Huisartsenpraktijk Paterswolde', 'medical: not the Drenthe practice, got ' + (m && m.name));
const p = Fac.nearestFacility('police', 2693, 10400);
ok(p && p.name === 'Bureau Stad', 'police: not the Drenthe station, got ' + (p && p.name));
console.log(`facilities_edge_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
