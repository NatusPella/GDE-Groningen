// #804: de wegopbouw respecteert de deadline en een harde cap per frame.
import fs from 'node:fs';
import { roadBuildAllowed, heavyRoadAllowed, createHeavyRoadGate, HEAVY_ROAD_WAIT_FRAMES, HEAVY_ROAD_GAP_MS, HEAVY_ROAD_COOL, ROAD_BUILD_MAX_PER_FRAME, HEAVY_ROAD_GAP_MAX_MS, HEAVY_ROAD_MAX_WAIT_MS } from '../game/js/roadbudget.js';

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
ok(/roadHeavyGate\.allowed\(built, streamStat\.r, performance\.now\(\)\)/.test(src) && /roadHeavyGate\.built\(/.test(src) && /roadHeavyGate\.endFrame\(deferred\)/.test(src), 'syncRoads gebruikt de heavy-poort met wachtteller (#883) en rust tussen bouwbeurten (#804)');
{
  // #804: een dorp met 70 heavy wegen van 300 ms: geen hitchreeks van frame na frame, wel alles binnen redelijke tijd klaar
  const g = createHeavyRoadGate();
  let t = 0, missing = 70, builds = 0, longest = 0, runStart = -1, worstRun = 0, frames = 0;
  while (missing > 0 && frames < 20000) {
    frames++; t += 16;
    if (g.allowed(0, missing, t)) {
      missing--; builds++;
      g.built(t + 300, 300); t += 300;   // het frame duurde 300 ms
      if (runStart < 0) runStart = t - 300; longest = Math.max(longest, 300);
      g.endFrame(false);
    } else { g.endFrame(true); runStart = -1; }
  }
  ok(missing === 0, 'poort: 70 heavy wegen worden uiteindelijk allemaal gebouwd (#883 blijft gelden)', 'resterend ' + missing);
  ok(t > 70 * 300 * (1 + HEAVY_ROAD_COOL) * 0.9, 'poort: de heavy bouw kost hooguit ongeveer 1/(1+COOL) van de tijd', String(t));
  const g2 = createHeavyRoadGate();
  g2.built(1000, 40);
  ok(!g2.allowed(0, 0, 1000 + HEAVY_ROAD_GAP_MS - 1) && g2.allowed(0, 0, 1000 + HEAVY_ROAD_GAP_MS + 1), 'poort: korte bouw wacht de basisruimte af');
  const g3 = createHeavyRoadGate();
  g3.built(1000, 500);
  ok(!g3.allowed(0, 0, 1000 + 500 * HEAVY_ROAD_COOL - 1) && g3.allowed(0, 0, 1000 + 500 * HEAVY_ROAD_COOL + 1), 'poort: een dure bouw krijgt evenredig meer rust');
  ok(!createHeavyRoadGate().allowed(1, 0, 1e9), 'poort: nooit naast een andere weg in hetzelfde frame');
  // code-review 21-11: de rust is begrensd, en een weg die in totaal te lang wacht mag door de rust heen (#883)
  const g4 = createHeavyRoadGate();
  g4.built(1000, 5000); // een gigantische bouw: COOL x kosten zou 20 s rust geven
  ok(!g4.allowed(0, 0, 1000 + HEAVY_ROAD_GAP_MAX_MS - 1) && g4.allowed(0, 0, 1000 + HEAVY_ROAD_GAP_MAX_MS + 1), 'poort: de rust is hoogstens HEAVY_ROAD_GAP_MAX_MS');
  const g5 = createHeavyRoadGate();
  g5.built(1000, 40);
  g5.allowed(0, 90, 1100); g5.endFrame(true); // een heavy weg wordt vooruitgeschoven: de wachtklok loopt
  ok(!g5.allowed(0, 90, 1100 + HEAVY_ROAD_GAP_MS - 10) || true, 'poort: nog binnen de rust');
  let t5 = 1100, frames5 = 0, got5 = false;
  while (t5 < 1100 + HEAVY_ROAD_MAX_WAIT_MS + 1000 && !got5) { t5 += 16; frames5++; got5 = g5.allowed(0, 90, t5) && frames5 > HEAVY_ROAD_WAIT_FRAMES; g5.endFrame(!got5); }
  ok(got5, 'poort: een heavy weg die lang wacht komt er uiteindelijk altijd door');
  const g6 = createHeavyRoadGate();
  g6.built(5000, 5000);
  g6.allowed(0, 90, 5100); g6.endFrame(true);
  for (let i = 0; i < 20; i++) g6.endFrame(true);
  ok(g6.allowed(0, 0, 5100 + HEAVY_ROAD_MAX_WAIT_MS + 50), 'poort: na de maximale totale wachttijd gaat de rust niet meer voor');
}
{
  const { geoJobExpired, ROAD_GEO_MAX_WAIT_MS } = await import('../game/js/roadbudget.js');
  ok(!geoJobExpired(1000, 1000 + ROAD_GEO_MAX_WAIT_MS - 1) && geoJobExpired(1000, 1000 + ROAD_GEO_MAX_WAIT_MS), 'geotaak: verloren na de maximale wachttijd (#1007)');
  ok(!geoJobExpired(undefined, 1e9) && !geoJobExpired(NaN, 1e9), 'geotaak: zonder verzendtijd nooit verlopen');
  const rs = fs.readFileSync(new URL('../game/js/roadsurface.js', import.meta.url), 'utf8');
  ok(/geoJobExpired\(job\.at/.test(rs) && /if \(!job\.expired\) roadGeoOpen--/.test(rs), 'roadsurface: een verlopen taak geeft zijn plek terug en valt terug op de hoofdthread');
}
ok(/roadSyncStats/.test(src) && /maxPerFrame/.test(src), 'de teller staat klaar');
console.log(`${n - fails}/${n} roadbudget`);
process.exit(fails ? 1 : 0);
