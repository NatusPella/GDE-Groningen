// Perf-normregels (#804):  node scripts/perf_norm_test.mjs
import { NORM, routeStats, normViolations, routeMap } from './perf/normrules.mjs';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const schoon = { frames: 900, hitch: { over50: 0, over100: 0 } };
const staart = { frames: 900, hitch: { over50: 3, over100: 0 } };
const hikkend = { frames: 900, hitch: { over50: 12, over100: 1 } };
const zonder = { frames: 900 };

ok(NORM.maxOver100 === 0 && NORM.maxOver50 === 0, 'de norm is streng: geen frame boven 50/100 ms');
ok(normViolations(schoon).length === 0, 'schone route haalt de norm');
ok(normViolations(staart).length === 1 && /boven 50 ms/.test(normViolations(staart)[0].rule), 'staart boven 50 ms is een overtreding');
ok(normViolations(hikkend).length === 2, 'zowel >50 als >100 zijn overtredingen');
ok(normViolations(zonder).length === 1 && /geen hitch-meting/.test(normViolations(zonder)[0].rule), 'zonder meting geen groen');
ok(normViolations(hikkend, { maxOver100: 1, maxOver50: 20 }).length === 0, 'een ruimere norm kan tijdelijk');
ok(routeStats(hikkend).over100 === 1 && routeStats(zonder).measured === false, 'stats per route');
ok(Object.keys(routeMap({ routes: { foot: schoon } }))[0] === 'foot', 'een bewaarde run met routes');
ok(routeMap(schoon).frames === 900, 'één losse route werkt ook');
ok(Object.keys(routeMap(null)).length === 0 && Object.keys(routeMap({})).length === 0, 'lege inputs zijn leeg');

console.log(fails ? `${fails} FAIL` : 'perf_norm_test ok');
process.exit(fails ? 1 : 0);
