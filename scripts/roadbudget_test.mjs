// #804: de wegopbouw respecteert de deadline en een harde cap per frame.
import fs from 'node:fs';
import { roadBuildAllowed, ROAD_BUILD_MAX_PER_FRAME } from '../game/js/roadbudget.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info !== '' ? ' (' + info + ')' : '')); } };

ok(ROAD_BUILD_MAX_PER_FRAME === 4, 'cap 4 wegen per frame', ROAD_BUILD_MAX_PER_FRAME);
ok(roadBuildAllowed(0, 100, 50), 'de eerste weg mag altijd (voortgang)');
ok(roadBuildAllowed(1, 40, 50), 'binnen de deadline: doorbouwen');
ok(!roadBuildAllowed(1, 60, 50), 'na de deadline: stoppen');
ok(!roadBuildAllowed(4, 10, 50), 'harde cap: niet meer dan vier');
ok(roadBuildAllowed(8, 10, 50, 8) === false && roadBuildAllowed(7, 10, 50, 8) === true, 'boostcap werkt');

// meting: een frame van 16,7 ms met ROAD_BUILD_MS 2,5 bouwt hoogstens vier wegen
let built = 0, now = 0;
while (roadBuildAllowed(built, now, now + 2.5)) { built++; now += 4; }
ok(built <= 4, 'in een traag frame hoogstens vier wegen', built);
console.log('#804 meting: wegopbouw stopt na de deadline en bouwt hoogstens 4 wegen per frame (boost 8) i.p.v. alle missende wegen in één frame');

const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/roadBuildAllowed\(built, performance\.now\(\), deadline, cap\)/.test(src), 'syncRoads gebruikt de regel');
ok(/roadSyncStats/.test(src) && /maxPerFrame/.test(src), 'de teller staat klaar');
console.log(`${n - fails}/${n} roadbudget`);
process.exit(fails ? 1 : 0);
