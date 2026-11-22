// Perf-normregels (#804):  node scripts/perf_norm_test.mjs
import { NORM, TIJDELIJKE_NORMEN, normForRoute, MACHINE_BUSY_PCT, routeStats, routeMeasured, routeHasFrames, normViolations, routeMap, machineBusy, slowWall } from './perf/normrules.mjs';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const schoon = { frames: 900, avg: 16.7, p95: 33, p99: 24, max: 33, hitch: { over50: 0, over100: 0, cpuP95: 30 } };
const p95TeHoog = { frames: 900, avg: 20, p95: 38, p99: 40, max: 55 };
const maxTeHoog = { frames: 900, avg: 20, p95: 22, p99: 90, max: 1415 };
const alleenHitch = { frames: 900, hitch: { over50: 3, over100: 1 } };
const zonder = { frames: 900 };
const losseMeting = { kind: 'latency', n: 20, msP50: 40, msP95: 60, msMax: 90 };

ok(NORM.maxP95Ms === 37 && NORM.maxCpuP95Ms === 35 && NORM.maxMaxMs === 1000, 'de norm is p95 <= 33,4 ms (wandklok en werktijd) en max <= 1000 ms');
ok(routeMeasured(schoon) && routeMeasured(alleenHitch), 'frametijden of hitch-tellers zijn een meting');
ok(!routeMeasured(zonder), 'zonder cijfers geen meting');
ok(routeHasFrames(schoon) && !routeHasFrames(losseMeting), 'losse metingen zijn geen frameroute');
ok(normViolations(schoon).length === 0, 'schone route haalt de norm');
ok(normViolations(p95TeHoog).some((v) => /p95/.test(v.rule)), 'p95 boven 37 ms is een overtreding');
ok(normViolations(maxTeHoog).some((v) => /max/.test(v.rule)), 'max boven 1000 ms is een overtreding');
ok(normViolations(alleenHitch).length === 0, 'hitchtellers boven 50/100 ms worden gerapporteerd, niet als poort');
ok(normViolations(zonder).length === 1 && normViolations(zonder)[0].rule === 'geen meting in deze route', 'zonder meting geen groen');
ok(normViolations(losseMeting).length === 0, 'een losse latentiemeting wordt overgeslagen, niet afgekeurd');
ok(normViolations(maxTeHoog, { maxP95Ms: 37, maxMaxMs: 2000, maxOver100: null, maxOver50: null }).length === 0, 'een ruimere norm kan tijdelijk');
ok(machineBusy({ cpuBusyBeforePct: MACHINE_BUSY_PCT + 1 }) && !machineBusy({ cpuBusyBeforePct: MACHINE_BUSY_PCT - 1 }), 'een belaste run wordt herkend', MACHINE_BUSY_PCT);
ok(slowWall(124, 15) && !slowWall(70, 15), 'een veel te lange run wordt herkend');
ok(!slowWall(NaN, 15) && !slowWall(10, 0), 'zonder echte route geen valse melding');
ok(!machineBusy(null) && !machineBusy({}), 'zonder machinegegevens geen valse melding');
ok(routeStats(p95TeHoog).p95 === 38 && routeStats(alleenHitch).p95 === null, 'stats per route');
ok(Object.keys(routeMap({ routes: { foot: schoon } }))[0] === 'foot', 'een bewaarde run met routes');
ok(routeMap(schoon).frames === 900, 'één losse route werkt ook');
ok(Object.keys(routeMap(null)).length === 0 && Object.keys(routeMap({})).length === 0, 'lege inputs zijn leeg');

// Tijdelijke herijking (#1184): alleen ring en spoor, alleen in de gate-set release.
const t50 = { frames: 900, avg: 20, p95: 50, p99: 55, max: 80 };
ok(normForRoute('ring', 'release').norm.maxP95Ms === 52 && normForRoute('spoor', 'release').norm.maxP95Ms === 52, 'ring en spoor: 52 ms in release');
ok(normForRoute('foot', 'release').norm === NORM && normForRoute('foot', 'release').tijdelijk === null, 'foot is niet verruimd');
ok(normForRoute('ring', null).norm === NORM && normForRoute('ring', 'andere').norm === NORM, 'zonder of met een andere set geldt de gewone norm');
ok(normViolations(t50, normForRoute('ring', 'release').norm).length === 0 && normViolations(t50, normForRoute('foot', 'release').norm).length === 1, 'p95 50: ring ok, foot niet');
ok(normForRoute('ring', 'release').norm.maxMaxMs === NORM.maxMaxMs && normForRoute('ring', 'release').norm.maxCpuP95Ms === NORM.maxCpuP95Ms, 'max en werktijd blijven hard');
ok(Object.keys(TIJDELIJKE_NORMEN).sort().join() === 'ring,spoor' && Object.values(TIJDELIJKE_NORMEN).every((t) => t.issue && t.sinds && t.reden && t.opheffing && t.set === 'release' && t.doc), 'elke tijdelijke norm heeft reden, datum, issue, opheffing en set');
ok(NORM.maxP95Ms === 37, 'de gewone norm blijft 37 ms');

console.log(fails ? `${fails} FAIL` : 'perf_norm_test ok');
process.exit(fails ? 1 : 0);


