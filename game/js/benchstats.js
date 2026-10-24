// Pure logic of the built-in benchmark (no DOM, no three.js): the fixed route,
// frame-time statistics, the advised quality profile and the comparison with
// the previous run. trailer.js runs the route; scripts/benchstats_test.mjs
// covers this file.
import { KEYS } from './storagekeys.js';

// The fixed route: [trailer shot id, seconds, category]. Same shots, clocks and
// weather on every run, so two runs on one computer can be compared.
export const BENCH_ROUTE = [
  ['vismarkt', 4.0, 'stad'],
  ['escapade', 3.6, 'stad'],
  ['ommeland', 4.0, 'provincie'],
  ['spoor', 3.6, 'spoor'],
  ['aerial', 4.0, 'provincie'],
  ['boat', 4.0, 'water'],
  ['gH14', 3.6, 'water'],
  ['kermis', 4.0, 'drukte'],
  ['chase', 4.0, 'drukte'],
  ['anita', 3.0, 'cutscene'],
  ['vitrine', 4.0, 'cutscene'],
];
export const BENCH_CATEGORIES = { stad: 'Stad', provincie: 'Provincie', water: 'Water', spoor: 'Spoor', drukte: 'Drukke scène', cutscene: 'Cutscene' };
export const benchRouteSeconds = () => BENCH_ROUTE.reduce((a, [, d]) => a + d, 0);
export const benchCategoryOf = (id) => { const e = BENCH_ROUTE.find(([i]) => i === id); return e ? e[2] : null; };

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// Statistics over frame times in ms: average fps, 95th percentile frame time,
// and the fps of the slowest 1% of frames ("1%-low").
// A frame over this (30 fps) is a visible hitch in the precision stretches (races, gates). #216 / G28.
export const HITCH_FRAME_MS = 33.4;

export function frameStats(ms) {
  const v = (ms || []).filter((x) => Number.isFinite(x) && x > 0);
  if (!v.length) return null;
  const sorted = v.slice().sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  const n = Math.max(1, Math.floor(sorted.length * 0.01));
  const worst = mean(sorted.slice(sorted.length - n));
  const slow33 = v.filter((x) => x > HITCH_FRAME_MS).length;
  return { frames: v.length, avg: 1000 / mean(v), p95, low1: 1000 / worst, slow33, slow33Share: slow33 / v.length };
}

// Per category: the frame times of all its shots together. `shots` is
// [{ id, ms: [..] }]; categories without enough frames are left out.
export function categoryStats(shots) {
  const by = {};
  for (const s of shots || []) {
    const c = benchCategoryOf(s.id);
    if (c && s.ms && s.ms.length) (by[c] = by[c] || []).push(...s.ms);
  }
  const out = {};
  for (const [c, ms] of Object.entries(by)) {
    const st = ms.length >= 20 ? frameStats(ms) : null;
    if (st) out[c] = st;
  }
  return out;
}

// Frames over HITCH_FRAME_MS per shot of the route: [{ id, frames, slow33, share }], worst first.
export function routeHitches(shots) {
  const out = [];
  for (const s of shots || []) {
    if (!s || !s.ms || !s.ms.length) continue;
    const slow33 = s.ms.filter((x) => x > HITCH_FRAME_MS).length;
    out.push({ id: s.id || s.label || '?', frames: s.ms.length, slow33, share: slow33 / s.ms.length });
  }
  return out.sort((a, b) => b.share - a.share || b.slow33 - a.slow33);
}

// The JS heap in MB (#379), or 0 when the browser does not expose it (Firefox
// and Safari have no performance.memory; Electron and Chrome do). It is the
// heap of the whole page, not only the game, and never the GPU memory: the
// card says so, so nobody reads it as the memory the game needs.
export function heapMb(perf = typeof performance !== 'undefined' ? performance : null) {
  const b = perf && perf.memory && perf.memory.usedJSHeapSize;
  return Number.isFinite(b) && b > 0 ? b / 1048576 : 0;
}

// The highest of the samples (the start, a sample every second, the end).
export function heapPeak(samples) {
  return (samples || []).reduce((m, x) => (Number.isFinite(x) && x > m ? x : m), 0);
}

// A size for the result card in Dutch: 597 MB, 1,9 GB (one decimal above a GB).
export function memText(mb) {
  const m = Number(mb);
  if (!(m > 0)) return '';
  return m >= 1024 ? `${(m / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.round(m)} MB`;
}

// Button-to-frame latency samples in ms (hitchprobe.js): average, 95th percentile and the worst.
export function latencyStats(samples) {
  const v = (samples || []).filter((x) => Number.isFinite(x) && x >= 0);
  if (!v.length) return null;
  const sorted = v.slice().sort((a, b) => a - b);
  return { n: v.length, avg: mean(v), p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)], max: sorted[sorted.length - 1] };
}

// The weakest category (lowest average fps), for "hier hapert het".
export function weakestCategory(cats) {
  const e = Object.entries(cats || {});
  if (!e.length) return null;
  return e.reduce((a, b) => (b[1].avg < a[1].avg ? b : a))[0];
}

export const PROFILE_ORDER = ['laag', 'middel', 'hoog'];
const PROFILE_WORDS = { laag: 'Laag', middel: 'Gem.', hoog: 'Hoog' };
export const profileWord = (p) => PROFILE_WORDS[p] || p;

const EXPLAIN = {
  laag: 'Laag houdt het spel soepel op deze computer: kortere zichtafstand, geen schaduwen en een lagere resolutie.',
  middel: 'Gem. is de balans: schaduwen aan en normale zichtafstand, met genoeg ruimte voor drukke scènes.',
  hoog: 'Hoog laat Grunn zien zoals bedoeld: schaduwen aan en de grootste zichtafstand. Deze computer houdt dat bij.',
};

// The advised profile from a run on `current` (laag|middel|hoog|null for own
// settings). A run that is smooth with room to spare may go one step up, a run
// that stutters goes one step down; p95 and the 1%-low count as much as the
// average, because a smooth average with spikes still feels bad.
// -> { profile, change: 'up'|'down'|'same', text }
export function recommendProfile(stats, current) {
  if (!stats) return { profile: current || 'middel', change: 'same', text: 'Er is niets gemeten. Probeer het nog een keer.' };
  const i = PROFILE_ORDER.indexOf(current);
  const base = i < 0 ? 1 : i;
  const rough = stats.avg < 40 || stats.low1 < 22 || stats.p95 > 40;
  const roomy = stats.avg >= 75 && stats.low1 >= 45 && stats.p95 <= 22;
  let to = base;
  if (rough) to = Math.max(0, base - 1);
  else if (roomy) to = Math.min(PROFILE_ORDER.length - 1, base + 1);
  const profile = PROFILE_ORDER[to];
  const change = to > base ? 'up' : to < base ? 'down' : 'same';
  let text = EXPLAIN[profile];
  if (rough && change === 'same') text = 'Alles staat al zo licht mogelijk. Sluit andere programma’s en tabbladen voor wat extra lucht.';
  else if (change === 'same' && i >= 0) text = `${profileWord(profile)} draait prima. ${EXPLAIN[profile]}`;
  return { profile, change, text };
}

// Difference with the previous run: positive fps/low1 = better, positive p95 = worse.
// null when there is no earlier run.
export function compareRuns(prev, cur) {
  if (!prev || !cur || !(prev.avg > 0)) return null;
  const pct = Math.round(((cur.avg - prev.avg) / prev.avg) * 100);
  return {
    avg: cur.avg - prev.avg, low1: cur.low1 - prev.low1, p95: cur.p95 - prev.p95, pct,
    verdict: pct >= 5 ? 'sneller' : pct <= -5 ? 'trager' : 'gelijk',
  };
}

export function compareText(d) {
  if (!d) return 'Eerste meting op deze computer.';
  const sign = d.pct > 0 ? '+' : '';
  if (d.verdict === 'gelijk') return `Gelijk aan de vorige keer (${sign}${d.pct}%).`;
  return `${d.verdict === 'sneller' ? 'Sneller' : 'Trager'} dan de vorige keer (${sign}${d.pct}% fps).`;
}

// --- storage (gde-benchmark-last-v1) ------------------------------------

export function packRun({ stats, cats, preset, memory, at }) {
  const r = (x, d = 1) => +x.toFixed(d);
  return {
    v: 1, at: at || Date.now(), preset: preset || null,
    avg: r(stats.avg), p95: r(stats.p95), low1: r(stats.low1), slow33: r(100 * (stats.slow33Share || 0), 2),
    cats: Object.fromEntries(Object.entries(cats || {}).map(([c, s]) => [c, r(s.avg)])),
    memory: memory > 0 ? Math.round(memory) : null,
  };
}

export function readLastRun(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    const o = JSON.parse(storage.getItem(KEYS.benchmarkLast));
    return o && o.v === 1 && o.avg > 0 && o.low1 > 0 && o.p95 > 0 ? o : null;
  } catch (e) { return null; }
}

export function writeLastRun(run, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { storage.setItem(KEYS.benchmarkLast, JSON.stringify(run)); return true; } catch (e) { return false; }
}
