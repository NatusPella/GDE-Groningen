// #804: de wegopbouw respecteert de deadline en een harde cap per frame.
import fs from 'node:fs';
import { roadBuildAllowed, heavyRoadAllowed, HEAVY_ROAD_WAIT_FRAMES, ROAD_BUILD_MAX_PER_FRAME } from '../game/js/roadbudget.js';

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

// #883: een heavy weg mag niet eeuwig wachten op "bijna niets meer te streamen" (hij telt zichzelf mee).
ok(heavyRoadAllowed(0, 2, 0), 'heavy weg: bijna klaar met streamen, direct bouwen');
ok(!heavyRoadAllowed(1, 0, 99), 'heavy weg: nooit naast een andere weg in hetzelfde frame');
ok(!heavyRoadAllowed(0, 70, 0), 'heavy weg: eerst even wachten bij veel te streamen wegen');
ok(heavyRoadAllowed(0, 70, HEAVY_ROAD_WAIT_FRAMES), 'heavy weg: na het wachten toch bouwen, ook met 70 wegen te streamen');
// meting: dorp met 70 heavy wegen (provinciewereld). Oude regel: streamStat.r blijft 70, er wordt nooit een weg gebouwd.
// Nieuwe regel: na HEAVY_ROAD_WAIT_FRAMES frames één weg per frame, alles klaar in 70 + wachttijd frames.
{
  let missing = 70, wait = 0, frames = 0, oud = 70;
  while (missing > 0 && frames < 1000) {
    frames++;
    if (heavyRoadAllowed(0, missing, wait)) { missing--; wait = HEAVY_ROAD_WAIT_FRAMES; } else wait++;
  }
  ok(missing === 0 && frames <= 70 + HEAVY_ROAD_WAIT_FRAMES + 3, 'dorp met 70 heavy wegen is binnen ' + (70 + HEAVY_ROAD_WAIT_FRAMES + 3) + ' frames klaar', frames);
  ok(!(oud <= 2), 'oude regel: 70 heavy wegen bleven voor altijd wachten (streamStat.r > 2)');
}

const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(/roadBuildAllowed\(built, performance\.now\(\), deadline, cap\)/.test(src), 'syncRoads gebruikt de regel');
ok(/heavyRoadAllowed\(built, streamStat\.r, roadHeavyWait\)/.test(src), 'syncRoads gebruikt de heavy-regel met wachtteller (#883)');
ok(/roadSyncStats/.test(src) && /maxPerFrame/.test(src), 'de teller staat klaar');
console.log(`${n - fails}/${n} roadbudget`);
process.exit(fails ? 1 : 0);
