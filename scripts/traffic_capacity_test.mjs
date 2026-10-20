// #265: het doelaantal auto's volgt de beschikbare weg (trafficfleet.js roadCapacityTarget / roadLengthWithin):
//   node scripts/traffic_capacity_test.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'game', 'js', 'trafficfleet.js')).href);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

ok(F.roadCapacityTarget(100000, 30) === 30, 'een stad met kilometers weg houdt het vaste doel');
ok(F.roadCapacityTarget(0, 30) === 4, 'zonder weg blijft een minimum over');
ok(F.roadCapacityTarget(450, 30) === 7, 'een gehucht met 450 m weg: 7 auto\'s');
ok(F.roadCapacityTarget(1000, 30) === 15, '1 km weg: 15 auto\'s');
ok(F.roadCapacityTarget(2100, 30) === 30 && F.roadCapacityTarget(5000, 30) === 30, 'vanaf 2,1 km het volle doel');
ok(F.roadCapacityTarget(200, 3) === 3, 'het doel zelf is de bovengrens, ook onder het minimum');
ok(F.roadCapacityTarget(NaN, 30) === 30 && F.roadCapacityTarget(-5, 30) === 30, 'een onbekende lengte laat het doel ongemoeid');
let prev = 0, mono = true;
for (let L = 0; L <= 3000; L += 50) { const t = F.roadCapacityTarget(L, 30); if (t < prev) mono = false; prev = t; }
ok(mono, 'meer weg geeft nooit minder auto\'s');

const roads = [{ pts: [[0, 0], [100, 0], [100, 100]] }, { pts: [[1000, 1000], [1100, 1000]] }];
ok(Math.abs(F.roadLengthWithin(roads, 50, 50, 120) - 200) < 1e-9, 'roadLengthWithin telt de segmenten in het bereik (2 x 100 m)');
ok(F.roadLengthWithin(roads, 5000, 5000, 100) === 0, 'ver weg: geen weg');
ok(F.roadLengthWithin([{ pts: [[0, 0]] }, {}], 0, 0, 50) === 0, 'een weg zonder segment telt niet');

console.log(`traffic_capacity_test: ${n} checks, ${fails} mislukt`);
process.exit(fails ? 1 : 0);
