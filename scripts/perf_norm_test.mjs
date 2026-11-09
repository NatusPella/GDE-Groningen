// Perf-normregels (#804):  node scripts/perf_norm_test.mjs
import { NORM, routeStats, routeMeasured, routeHasFrames, normViolations, routeMap } from './perf/normrules.mjs';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const schoon = { frames: 900, avg: 16.7, p95: 20, p99: 24, max: 33, hitch: { over50: 0, over100: 0 } };
const p95TeHoog = { frames: 900, avg: 20, p95: 34, p99: 40, max: 55 };
const maxTeHoog = { frames: 900, avg: 20, p95: 22, p99: 90, max: 415 };
const alleenHitch = { frames: 900, hitch: { over50: 3, over100: 1 } };
const zonder = { frames: 900 };
const losseMeting = { kind: 'latency', n: 20, msP50: 40, msP95: 60, msMax: 90 };

ok(NORM.maxP95Ms === 25 && NORM.maxMaxMs === 100, 'de norm is p95 <= 25 ms en max <= 100 ms');
ok(routeMeasured(schoon) && routeMeasured(alleenHitch), 'frametijden of hitch-tellers zijn een meting');
ok(!routeMeasured(zonder), 'zonder cijfers geen meting');
ok(routeHasFrames(schoon) && !routeHasFrames(losseMeting), 'losse metingen zijn geen frameroute');
ok(normViolations(schoon).length === 0, 'schone route haalt de norm');
ok(normViolations(p95TeHoog).some((v) => /p95/.test(v.rule)), 'p95 boven 25 ms is een overtreding');
ok(normViolations(maxTeHoog).some((v) => /max/.test(v.rule)), 'max boven 100 ms is een overtreding');
ok(normViolations(alleenHitch).length === 2, 'zonder frametijden gelden de hitch-tellers');
ok(normViolations(zonder).length === 1 && normViolations(zonder)[0].rule === 'geen meting in deze route', 'zonder meting geen groen');
ok(normViolations(losseMeting).length === 0, 'een losse latentiemeting wordt overgeslagen, niet afgekeurd');
ok(normViolations(maxTeHoog, { maxP95Ms: 25, maxMaxMs: 500, maxOver100: 0, maxOver50: 0 }).length === 0, 'een ruimere norm kan tijdelijk');
ok(routeStats(p95TeHoog).p95 === 34 && routeStats(alleenHitch).p95 === null, 'stats per route');
ok(Object.keys(routeMap({ routes: { foot: schoon } }))[0] === 'foot', 'een bewaarde run met routes');
ok(routeMap(schoon).frames === 900, 'één losse route werkt ook');
ok(Object.keys(routeMap(null)).length === 0 && Object.keys(routeMap({})).length === 0, 'lege inputs zijn leeg');

console.log(fails ? `${fails} FAIL` : 'perf_norm_test ok');
process.exit(fails ? 1 : 0);
