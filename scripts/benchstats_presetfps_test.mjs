// #1184: het standadvies gebruikt de metingen per stand (presetFps). node scripts/benchstats_presetfps_test.mjs
import { recommendStand, STAND_ORDER } from '../game/js/benchstats.js';
import { reportCard } from '../game/js/benchmarkmodel.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const run = (avg, low1, p95) => ({ avg, low1, p95 });
// zonder metingen: ongewijzigd
ok(recommendStand(run(100, 70, 12), 'middel').stand === 'vlot', 'ruim op Midden: omhoog naar Hoog (zonder metingen)');
ok(recommendStand(run(100, 70, 12), 'middel', null, {}).stand === 'vlot', 'lege metingen: ongewijzigd');
// omhoog alleen als de volgende stand in de proef ook haalt
let r = recommendStand(run(100, 70, 12), 'middel', null, { middel: 100, vlot: 44, hoog: 30 });
ok(r.stand === 'middel' && r.change === 'same' && /44/.test(r.text) && /blijf bij Midden/.test(r.text), 'Hoog haalt in de proef 44: blijf op Midden');
r = recommendStand(run(100, 70, 12), 'middel', null, { middel: 100, vlot: 80, hoog: 50 });
ok(r.stand === 'vlot' && r.change === 'up', 'Hoog haalt 80: omhoog');
r = recommendStand(run(100, 70, 12), 'middel', null, { middel: 100 });
ok(r.stand === 'vlot', 'volgende stand niet gemeten: omhoog zoals voorheen');
// omlaag gaat door als de eerste lagere stand ook te traag is
r = recommendStand(run(20, 10, 70), 'hoog', null, { hoog: 20, vlot: 30, middel: 46, laag: 70 });
ok(r.stand === 'middel' && r.change === 'down', 'Ultra te traag, Hoog 30 nog te traag: direct naar Midden');
r = recommendStand(run(30, 15, 60), 'hoog', null, { hoog: 30, vlot: 45, middel: 60 });
ok(r.stand === 'vlot', 'Hoog haalt 45: een stap omlaag is genoeg');
r = recommendStand(run(30, 15, 60), 'vlot', null, { vlot: 30, middel: 31, laag: 38 });
ok(r.stand === 'laag', 'alle lagere standen ruw: door naar Laag');
// niet onder de bodem en de diagnose blijft voorgaan
r = recommendStand(run(20, 10, 70), 'laag', null, { laag: 20 });
ok(r.stand === 'laag' && r.change === 'same', 'Laag blijft Laag');
r = recommendStand(run(30, 15, 60), 'hoog', { kind: 'preset-insensitive' }, { hoog: 30, vlot: 31 });
ok(r.stand === 'hoog' && r.diag === 'preset-insensitive', 'de diagnose (niet aan de stand) gaat voor de metingen');
// rapportkaart geeft de metingen door
const stats = { avg: 100, p95: 12, low1: 70, rep: { frames: 100, avg: 100, p50: 9, p95: 12, p99: 14, low1: 70, low01: 60, slow33: 0, slow33Share: 0, over100: 0, worst: 15 }, shots: [], cats: {} };
const card = reportCard({ stats, preset: 'middel', presetFps: { middel: 100, vlot: 40 }, course: 'film', length: 'volledig', size: [1280, 720] });
ok(card.advice.stand === 'middel' && card.advice.change === 'same', 'reportCard: advies volgt presetFps');
ok(STAND_ORDER.length === 4, 'vier standen');
console.log(`benchstats_presetfps: ${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
