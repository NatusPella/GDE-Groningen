// node scripts/benchstats_test.mjs: frame statistics, the profile advice, the
// run comparison, the route and its storage (game/js/benchstats.js).
import { frameStats, categoryStats, weakestCategory, recommendProfile, compareRuns, compareText, packRun, readLastRun, writeLastRun, BENCH_ROUTE, benchRouteSeconds, benchCategoryOf, heapMb, heapPeak, memText, playStats, shouldRemeasure, betterRun, ultraNote, recommendStand, STAND_LABEL, STAND_ORDER, benchMeasureAfter, benchLooksBusy } from '../game/js/benchstats.js';
import { BASE_KEYS } from '../game/js/storagekeys.js';

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); };
const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;

// 100 frames: 98 at 10 ms, 2 at 50 ms
const ms = [...Array(98).fill(10), 50, 50];
const s = frameStats(ms);
ok('frames', s.frames === 100);
ok('avg fps', near(s.avg, 1000 / 10.8), JSON.stringify(s));
ok('p95 frame time', s.p95 === 10, JSON.stringify(s));
ok('1% low is the slowest frame', near(s.low1, 20), JSON.stringify(s));
ok('empty gives null', frameStats([]) === null && frameStats(null) === null && frameStats([NaN, 0, -3]) === null);
ok('p95 sees spikes', frameStats([...Array(90).fill(10), ...Array(10).fill(40)]).p95 === 40);

const shotMs = (n, v) => Array(n).fill(v);
const cats = categoryStats([{ id: 'vismarkt', ms: shotMs(30, 10) }, { id: 'escapade', ms: shotMs(30, 20) }, { id: 'boat', ms: shotMs(30, 40) }, { id: 'kermis', ms: shotMs(5, 10) }, { id: 'onbekend', ms: shotMs(50, 10) }]);
ok('categories by route', Object.keys(cats).sort().join() === 'stad,water', Object.keys(cats).join());
ok('category avg', near(cats.stad.avg, 1000 / 15) && near(cats.water.avg, 25));
ok('weakest', weakestCategory(cats) === 'water' && weakestCategory({}) === null);

const run = (avg, low1, p95) => ({ avg, low1, p95 });
let r = recommendProfile(run(120, 80, 10), 'middel');
ok('smooth goes up', r.profile === 'hoog' && r.change === 'up');
r = recommendProfile(run(120, 80, 10), 'hoog');
ok('top stays', r.profile === 'hoog' && r.change === 'same' && /prima/.test(r.text));
r = recommendProfile(run(30, 15, 50), 'hoog');
ok('rough goes down', r.profile === 'middel' && r.change === 'down');
r = recommendProfile(run(30, 15, 50), 'laag');
ok('lowest stays, with tip', r.profile === 'laag' && r.change === 'same' && /zo licht/.test(r.text));
r = recommendProfile(run(90, 60, 48), 'middel');
ok('spikes hold back a step up', r.change === 'down', JSON.stringify(r));
r = recommendProfile(run(60, 40, 20), 'middel');
ok('in between stays', r.profile === 'middel' && r.change === 'same');
r = recommendProfile(run(120, 80, 10), null);
ok('own settings count as middel', r.profile === 'hoog');
ok('no stats', recommendProfile(null, 'laag').profile === 'laag');

ok('no earlier run', compareRuns(null, run(60, 40, 20)) === null && /Eerste/.test(compareText(null)));
let d = compareRuns(run(50, 30, 25), run(60, 36, 20));
ok('faster', d.verdict === 'sneller' && d.pct === 20 && d.p95 === -5 && /Sneller.*\+20%/.test(compareText(d)), compareText(d));
d = compareRuns(run(60, 36, 20), run(50, 30, 25));
ok('slower', d.verdict === 'trager' && d.pct === -17 && /Trager/.test(compareText(d)));
ok('same', compareRuns(run(60, 36, 20), run(61, 36, 20)).verdict === 'gelijk');

ok('route ids unique', new Set(BENCH_ROUTE.map((e) => e[0])).size === BENCH_ROUTE.length);
ok('route covers the situations', ['stad', 'provincie', 'water', 'drukte', 'cutscene'].every((c) => BENCH_ROUTE.some((e) => e[2] === c)));
ok('route length', benchRouteSeconds() > 20 && benchRouteSeconds() < 60 && benchCategoryOf('boat') === 'water' && benchCategoryOf('x') === null);

class Mem { constructor() { this.m = {}; } getItem(k) { return k in this.m ? this.m[k] : null; } setItem(k, v) { this.m[k] = String(v); } }
const st = new Mem();
ok('nothing stored', readLastRun(st) === null);
const packed = packRun({ stats: s, cats, preset: 'middel', memory: 123456.7, at: 1 });
ok('pack', packed.preset === 'middel' && packed.cats.water === 25 && packed.memory === 123457 && packRun({ stats: s, memory: 0 }).memory === null);
ok('write and read', writeLastRun(packed, st) && JSON.stringify(readLastRun(st)) === JSON.stringify(packed));
ok('uses gde key', BASE_KEYS.benchmarkLast === 'gde-benchmark-last-v1' && st.getItem('gde-benchmark-last-v1'));
st.setItem(BASE_KEYS.benchmarkLast, '{kapot');
ok('broken json is ignored', readLastRun(st) === null);
ok('no storage is fine', readLastRun({ getItem() { throw new Error('x'); } }) === null && writeLastRun(packed, { setItem() { throw new Error('x'); } }) === false);

// #216 / G28: frames over 33 ms per route, knop-tot-beeld latency
{
  const { routeHitches, latencyStats, HITCH_FRAME_MS } = await import('../game/js/benchstats.js');
  const fs = frameStats([...Array(90).fill(10), ...Array(10).fill(50)]);
  ok('frameStats telt frames > 33 ms', fs.slow33 === 10 && Math.abs(fs.slow33Share - 0.1) < 1e-9, JSON.stringify(fs));
  ok('geen hapering geeft nul', frameStats(Array(50).fill(16)).slow33 === 0 && HITCH_FRAME_MS > 33 && HITCH_FRAME_MS < 34);
  const h = routeHitches([{ id: 'vismarkt', ms: Array(20).fill(10) }, { id: 'boat', ms: [...Array(15).fill(10), ...Array(5).fill(60)] }, { id: 'leeg', ms: [] }, null]);
  ok('routeHitches: slechtste eerst, lege shots weg', h.length === 2 && h[0].id === 'boat' && h[0].slow33 === 5 && h[0].share === 0.25 && h[1].slow33 === 0, JSON.stringify(h));
  const l = latencyStats([10, 12, 14, 80, NaN, -3]);
  ok('latencyStats', l.n === 4 && l.max === 80 && l.p95 === 80 && Math.abs(l.avg - 29) < 1e-9, JSON.stringify(l));
  ok('latencyStats leeg', latencyStats([]) === null && latencyStats(null) === null);
  ok('packRun bewaart het hapering-aandeel', packRun({ stats: { ...fs, avg: 60, p95: 20, low1: 30 }, cats: {} }).slow33 === 10);
}

// #379: de JS-heap van de benchmark (alleen als de browser performance.memory geeft)
{
  ok('heapMb rekent MB', heapMb({ memory: { usedJSHeapSize: 1494 * 1048576 } }) === 1494);
  ok('heapMb zonder performance.memory is 0', heapMb({}) === 0 && heapMb(null) === 0 && heapMb({ memory: { usedJSHeapSize: NaN } }) === 0);
  ok('heapPeak pakt de hoogste stand', heapPeak([597, 1398, 1445, 0, NaN]) === 1445 && heapPeak([]) === 0 && heapPeak(null) === 0);
  ok('memText: MB onder een GB, GB erboven met een komma', memText(597) === '597 MB' && memText(1494) === '1,5 GB' && memText(2428) === '2,4 GB', [memText(597), memText(1494)]);
  ok('memText zonder heap is leeg', memText(0) === '' && memText(-1) === '' && memText(null) === '');
  ok('packRun bewaart de piek van de heap', packRun({ stats: { ...s, avg: 60, p95: 20, low1: 30 }, cats: {}, memory: 1494.4 }).memory === 1494);
}

// 0.64.1 (Nikky, RX 9070 XT): speelbeeld zonder cutscenes, opnieuw meten, advies over de vier standen, Ultra-uitleg
{
  const frames = (n, v) => Array(n).fill(v);
  const shots = [{ id: 'vismarkt', ms: frames(60, 10) }, { id: 'anita', ms: frames(60, 100) }, { id: 'vitrine', ms: frames(60, 100) }, { id: 'onbekend', ms: frames(500, 100) }];
  const p = playStats(shots);
  ok('playStats telt de cutscenes en onbekende shots niet', p && p.frames === 60 && near(p.avg, 100), JSON.stringify(p));
  ok('playStats zonder genoeg beelden is null', playStats([{ id: 'vismarkt', ms: frames(10, 10) }]) === null && playStats(null) === null);
  ok('een lage meting wordt één keer herhaald', shouldRemeasure({ avg: 24 }, 0) && !shouldRemeasure({ avg: 24 }, 1) && !shouldRemeasure({ avg: 70 }, 0) && !shouldRemeasure(null, 0));
  ok('betterRun houdt de beste', betterRun({ stats: { avg: 24 } }, { stats: { avg: 40 } }).stats.avg === 40 && betterRun({ stats: { avg: 50 } }, { stats: { avg: 40 } }).stats.avg === 50 && betterRun({ stats: { avg: 24 } }, { aborted: true }).stats.avg === 24);
  ok('de eerste shot slaat 1,5 s over, de rest 0,3 s', benchMeasureAfter(0) === 1.5 && benchMeasureAfter(3) === 0.3);
  ok('Ultra onder 60 fps krijgt uitleg met Hoog', /Ultra is de zwaarste stand/.test(ultraNote('hoog', 24, { vlot: 58 })) && /58 fps/.test(ultraNote('hoog', 24, { vlot: 58 })));
  ok('geen Ultra-uitleg op een andere stand of bij 60+', ultraNote('vlot', 24) === '' && ultraNote('hoog', 75) === '' && ultraNote('hoog', 0) === '');
  ok('stand-labels volgen presetLabel: vlot heet Hoog, hoog heet Ultra', STAND_LABEL.vlot === 'Hoog' && STAND_LABEL.hoog === 'Ultra' && STAND_ORDER.join() === 'laag,middel,vlot,hoog');
  const run = (avg, low1, p95) => ({ avg, low1, p95 });
  let r = recommendStand(run(24, 12, 60), 'hoog');
  ok('Ultra op 24 fps: advies Hoog, niet nog een keer Ultra', r.stand === 'vlot' && r.change === 'down', JSON.stringify(r));
  r = recommendStand(run(24, 12, 60), 'vlot');
  ok('Hoog op 24 fps: advies Midden', r.stand === 'middel' && r.change === 'down');
  r = recommendStand(run(100, 70, 12), 'vlot');
  ok('veel ruimte op Hoog: Ultra mag', r.stand === 'hoog' && r.change === 'up');
  r = recommendStand(run(80, 50, 20), 'vlot');
  ok('een matige ruimte op Hoog blijft Hoog (Ultra eist meer)', r.stand === 'vlot' && r.change === 'same', JSON.stringify(r));
  r = recommendStand(run(80, 50, 20), 'middel');
  ok('ruimte op Midden: Hoog', r.stand === 'vlot' && r.change === 'up');
  r = recommendStand(run(59.6, 57, 17.2), 'middel');
  ok('vergrendelde 60 fps op een 60 Hz-scherm: Midden mag naar Hoog (de monitor begrenst de fps)', r.stand === 'vlot' && r.change === 'up', JSON.stringify(r));
  r = recommendStand(run(59.6, 57, 17.2), 'vlot');
  ok('vergrendelde 60 fps met ruime marge op Hoog: Ultra mag', r.stand === 'hoog' && r.change === 'up', JSON.stringify(r));
  r = recommendStand(run(58, 53, 18), 'vlot');
  ok('60 fps met een krappe marge op Hoog blijft Hoog', r.stand === 'vlot' && r.change === 'same', JSON.stringify(r));
  r = recommendStand(run(52, 40, 24), 'middel');
  ok('50 fps met uitschieters is geen vergrendelde 60', r.change === 'same', JSON.stringify(r));
  r = recommendStand(run(120, 80, 10), null);
  ok('eigen instellingen: gelden als Hoog', r.stand === 'hoog' || r.stand === 'vlot');
  ok('drukke meting wordt herkend', benchLooksBusy({ p95: 250, low1: 4 }) && benchLooksBusy({ p95: 60, low1: 5 }) && !benchLooksBusy({ p95: 30, low1: 40 }) && !benchLooksBusy(null));
}

console.log(fail ? `${fail} FAILED` : 'all ok');
process.exit(fail ? 1 : 0);
