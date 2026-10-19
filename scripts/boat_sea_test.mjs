// The open sea is water for boats (#233): where OSM has no water polygon, waterClearance
// asks the sea (seawater.js) instead of calling the Wadden land. Synthetic coast, then,
// when a province layer is there, the audit over the real coast (scripts/boat_sea_audit.mjs).
import './node3d.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { createSeaClearance } = await import('../game/js/seawater.js');
const { waterClearance, setSeaClearance, boatDryPoints } = await import('../game/js/waterindex.js').then(async (w) => ({ ...w, boatDryPoints: (await import('../game/js/util.js')).boatDryPoints }));

let fails = 0;
const ok = (c, m, ...x) => { if (!c) { fails++; console.log('FAIL', m, ...x); } };

// a straight coast along y = 0 (land to the south, y grows south), an island 2000..2400 x 500..900
const coast = [[-5000, 0], [5000, 0]];
const island = [[2000, 500], [2400, 500], [2400, 900], [2000, 900], [2000, 500]];
const inSea = (x, y) => y < 0;
const f = createSeaClearance(inSea, [coast, island]);
ok(f(0, -500, 4) === 4, 'open sea: room all round', f(0, -500, 4));
ok(Math.abs(f(0, -2, 4) - 2) < 1e-6, 'two metres off the coast', f(0, -2, 4));
ok(f(0, 50, 4) === null, 'land is not sea');
ok(f(0, 2, 4) === null, 'just inland is not sea');
ok(f(-4000, -3000, 4) === 4, 'far out');

// the shore test falls back on it only where no water row is
const map = { water: [], buildings: [] };
ok(waterClearance(map, 0, -500, 4) === -1, 'without the sea a boat is stopped by a wall of nothing');
setSeaClearance(f);
ok(waterClearance(map, 0, -500, 4) === 4, 'with the sea open water has room', waterClearance(map, 0, -500, 4));
ok(waterClearance(map, 0, 500, 4) === -1, 'land stays land');
ok(waterClearance(map, 0, -0.5, 4) < 1, 'the coast is still a shore');
const boat = { model: { len: 8, wid: 2.5 } };
ok(boatDryPoints(map, boat, 0, -300, 0) === 0, 'a boat in open sea has no probe dry');
ok(boatDryPoints(map, boat, 0, -2, 0) > 0, 'a boat on the coast has');
setSeaClearance(null);

// the real coast, when there is a province layer
try {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('./boat_sea_audit.mjs', import.meta.url)), '--step', '500', '--strict'], { encoding: 'utf8' });
  console.log(out.split(/\r?\n/)[0]);
} catch (e) {
  fails++;
  console.log('FAIL the audit over the real coast\n' + String(e.stdout || e.message).split(/\r?\n/).slice(0, 12).join('\n'));
}
console.log(fails ? `${fails} FAILED` : 'boat_sea_test ok');
process.exit(fails ? 1 : 0);
