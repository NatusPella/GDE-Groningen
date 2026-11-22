// Fuzz: de benchmark-statistiek en de rapportkaart gooien niet en geven geen NaN bij rare frametijden (nul, negatief, NaN,
// één frame, een enorme uitschieter). node scripts/benchmark_fuzz_test.mjs
import { frameStats, categoryStats, playStats, routeHitches, shouldRemeasure, benchLooksBusy } from '../game/js/benchstats.js';
import { frameReport, reportCard, cardSummary, fpsSeries, exportText } from '../game/js/benchmarkmodel.js';
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; if (fails < 12) console.log('FAIL', m, i); } };
const fin = (o, pad = '') => Object.entries(o || {}).every(([k, v]) => (typeof v === 'number' ? Number.isFinite(v) : true));
const reeksen = [[], [16], [0, 0, 0], [NaN, 16, Infinity, -5, 16], [1e9], Array(5).fill(8), Array(300).fill(16.7).concat([900]), Array.from({ length: 2000 }, () => 1 + rnd() * 80)];
for (let i = 0; i < 100; i++) reeksen.push(Array.from({ length: Math.floor(rnd() * 400) }, () => (rnd() < 0.05 ? kies() : 5 + rnd() * 60)));
function kies() { return [NaN, 0, -3, Infinity, 1e6, null, undefined, 'x'][Math.floor(rnd() * 8)]; }
for (const ms of reeksen) {
  let st = null, rep = null;
  try { st = frameStats(ms); rep = frameReport(ms); } catch (e) { ok(false, 'stats gooide', e.message); continue; }
  if (st) ok(fin(st), 'frameStats eindig', JSON.stringify(st));
  if (rep) ok(fin(rep), 'frameReport eindig', JSON.stringify(rep));
  const shots = [{ id: 'stad-1', ms }, { id: 'onbekend', ms }, null, { id: 'x' }];
  try { categoryStats(shots); playStats(shots); routeHitches(shots); fpsSeries(shots.filter(Boolean).map((s) => ({ ...s, label: 'a' }))); } catch (e) { ok(false, 'categorie gooide', e.message); }
  if (st && rep) {
    try {
      const card = reportCard({ stats: { ...st, rep, cats: categoryStats(shots), hitches: routeHitches(shots), series: [] }, preset: 'middel', presetFps: { laag: 90, middel: 60 }, course: 'film', length: 'volledig' });
      ok(Number.isFinite(card.cijfer) && card.cijfer >= 1 && card.cijfer <= 10, 'cijfer tussen 1 en 10', card.cijfer);
      ok(!/NaN|undefined|Infinity/.test(cardSummary(card)), 'samenvatting zonder NaN', cardSummary(card));
      ok(!/NaN|undefined|Infinity/.test(exportText(card, { version: 'x' })), 'export zonder NaN');
    } catch (e) { ok(false, 'rapportkaart gooide', e.message); }
    shouldRemeasure(st); benchLooksBusy(st);
  }
}
try { reportCard(null); reportCard({}); reportCard({ stats: { avg: 0, p95: 0, low1: 0 } }); ok(true, 'lege runs'); } catch (e) { ok(false, 'lege run gooide', e.message); }
console.log(`benchmark_fuzz_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
