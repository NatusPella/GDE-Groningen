// #651.4 decode-terugval, #651.6 syncTrees-throttle, #653 LOS-budget, #760/#786 bomen-sync.
import fs from 'node:fs';
import { serialQueue } from '../game/js/decodequeue.js';
import { makeLosBudget } from '../game/js/losbudget.js';
import { treeSyncDue } from '../game/js/treesync.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// A. serialQueue: één tegel tegelijk, in volgorde, met een yield ertussen
let running = 0, maxRunning = 0;
const seen = [];
const q = serialQueue(async (x) => { running++; maxRunning = Math.max(maxRunning, running); await new Promise((r) => setTimeout(r, 1)); seen.push(x); running--; return x * 2; });
const results = await Promise.all([q(1), q(2), q(3), q(4)]);
ok(results.join() === '2,4,6,8', 'alle vier de taken komen goed terug', results.join());
ok(maxRunning === 1, 'hoogstens één decode tegelijk op de hoofdthread', maxRunning);
ok(seen.join() === '1,2,3,4', 'in volgorde', seen.join());
console.log('#651 meting: decode-terugval deed 4 stadsdecodes (50-130 ms) synchroon; nu één tegelijk met een yield ertussen');

// B. LOS-budget: 3 per 100 ms over alle eenheden
let allowed = 0;
const los = makeLosBudget(3, 100);
for (let i = 0; i < 10; i++) if (los(1000)) allowed++;
ok(allowed === 3, 'tien aanvragen in hetzelfde venster: drie toegestaan', allowed);
let next = 0;
for (let i = 0; i < 10; i++) if (los(1101)) next++;
ok(next === 3, 'volgend venster: weer drie', next);
console.log('#653 meting: LOS-checks begrensd op 3 per 100 ms (~30/s) i.p.v. elke eenheid 4x/s (bij 6-10 eenheden 24-40/s met grid-queries)');

// C. syncTrees-throttle: de due-check staat vóór de query (#760) en de bronversie
//    dwingt ook bij stilstand een rebuild af bij een gestroomde tegel (#786)
ok(treeSyncDue(0, 0, null, null, false, 0, 0), 'eerste keer: opbouwen');
ok(!treeSyncDue(1, 0, 0, 0, false, 0, 0), '1 m gelopen: niet opnieuw');
ok(!treeSyncDue(7.9, 0, 0, 0, false, 0, 0), '7,9 m: nog niet');
ok(treeSyncDue(8.1, 0, 0, 0, false, 0, 0), '>8 m: opnieuw');
ok(treeSyncDue(1, 0, 0, 0, false, 4, 3), 'gestroomde tegel (bronversie): meteen opnieuw (#786)');
ok(!treeSyncDue(1, 0, 0, 0, false, 3, 3), 'zelfde bronversie: de throttle blijft werken');
ok(treeSyncDue(1, 0, 0, 0, true, 0, 0), 'verborgen-set gewijzigd: meteen');
const tilestoreSrc = fs.readFileSync(new URL('../game/js/tilestore.js', import.meta.url), 'utf8');
ok(/serialQueue\(\(bytes\) => fallback\(bytes, aside\)\)/.test(tilestoreSrc), 'tilestore gebruikt de serialQueue');
const policeSrc = fs.readFileSync(new URL('../game/js/police.js', import.meta.url), 'utf8');
ok(/polLosBudget\(performance\.now\(\)\)/.test(policeSrc), 'de politie gebruikt het LOS-budget');
const sceneSrc = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/treeSyncDue\(px, py, treeSyncX, treeSyncY/.test(sceneSrc), 'syncTrees gebruikt de throttle');
ok(/treeSyncDue\(px, py, treeSyncX, treeSyncY[^)]*geoVer/.test(sceneSrc), 'syncTrees geeft de bronversie mee (#786)');
const sceneSync = sceneSrc.slice(sceneSrc.indexOf('function syncTrees('), sceneSrc.indexOf('function syncActors('));
ok(sceneSync.length > 0, 'syncTrees staat nog in scene3d.js');
ok(sceneSync.indexOf('treeSyncDue(') >= 0 && sceneSync.indexOf('treeSyncDue(') < sceneSync.indexOf('queryRadiusInto'), 'de due-check staat vóór de boomquery (#760)');
ok(/treeGrid\.queryRadiusInto\(_treeQuery/.test(sceneSync), 'de boomquery hergebruikt een buffer (#760)');
console.log('#651/#760 meting: syncTrees herbouwt bij lopen (~1 m/frame) nog maar 1x per 8 m i.p.v. bijna elke frame, en de treesNear-query draait pas ná de due-check; een gestroomde tegel dwingt meteen een rebuild af (#786)');
console.log(`${n - fails}/${n} perfrest2`);
process.exit(fails ? 1 : 0);
