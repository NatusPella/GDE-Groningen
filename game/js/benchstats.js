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
// 21-11: the film route ("Grunn in een dag", a mini film): the same fixed shots of trailer.js, in the order of a day (dawn, noon, evening, night, a storm),
// with every load in it: streaming (the province, fast flights), crowds, shadows at low sun, water, rain and storm, the helicopter. Deterministic like
// the classic route: a shot is a locked camera path with its own clock and weather. [shot id, seconds, category, short?]: 'short' is in the 30 s cut.
// BENCH_ROUTE stays as it was (the 'classic' route), so earlier measurements stay comparable.
export const FILM_ROUTE = [
  ['sunrise', 4.0, 'nacht', true],
  ['vismarkt', 4.0, 'stad'],
  ['escapade', 3.6, 'stad', true],
  ['plantsoen', 3.4, 'stad'],
  ['ommeland', 4.0, 'provincie', true],
  ['spoor', 3.6, 'spoor'],
  ['aerial', 5.6, 'provincie', true],
  ['boat', 4.0, 'water', true],
  ['gH14', 3.6, 'water'],
  ['kermis', 4.0, 'drukte', true],
  ['chase', 4.2, 'drukte', true],
  ['trauma', 3.6, 'lucht'],
  ['night', 3.8, 'nacht', true],
  ['storm', 4.0, 'weer'],
  ['race', 4.0, 'drukte'],
];
export const BENCH_CATEGORIES = { stad: 'Stad', provincie: 'Provincie', water: 'Water', spoor: 'Spoor', drukte: 'Drukke scène', cutscene: 'Cutscene', nacht: 'Ochtend en nacht', weer: 'Regen en storm', lucht: 'Lucht' };
export const benchRouteSeconds = () => BENCH_ROUTE.reduce((a, [, d]) => a + d, 0);
export const benchCategoryOf = (id) => { const e = BENCH_ROUTE.find(([i]) => i === id) || FILM_ROUTE.find(([i]) => i === id); return e ? e[2] : null; };

// 0.64.1 (Nikky, RX 9070 XT, 24 fps): the first shot also carries the shader compiles and the last streaming of the
// run, so its first seconds are not measured; every later shot skips only its cut (the camera jump).
export const BENCH_CUT_SKIP_S = 0.3;
export const BENCH_FIRST_SHOT_SKIP_S = 1.5;
export const benchMeasureAfter = (shotIdx) => (shotIdx === 0 ? BENCH_FIRST_SHOT_SKIP_S : BENCH_CUT_SKIP_S);

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
    if (!s) continue; // 22-11: een lege plek in de lijst van shots breekt de rapportkaart niet
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

// What a player really plays: the city, the countryside, the rail, the water and the crowded scenes, without the
// cutscene shots (their film light is rare in the game). `shots` is [{ id, ms: [..] }]; null without enough frames.
export function playStats(shots) {
  const ms = [];
  for (const s of shots || []) if (s && s.ms && benchCategoryOf(s.id) && benchCategoryOf(s.id) !== 'cutscene') ms.push(...s.ms);
  return ms.length >= 60 ? frameStats(ms) : null;
}

// A low first result is measured once more (shader compiles, a streaming burst or another program can hold one run
// back); the better of the two counts. -> true when the run is worth repeating.
export const BENCH_REMEASURE_BELOW_FPS = 45;
export function shouldRemeasure(stats, attempt = 0) {
  return !!stats && attempt < 1 && stats.avg > 0 && stats.avg < BENCH_REMEASURE_BELOW_FPS;
}
export function betterRun(a, b) {
  if (!a || !a.stats) return b || a;
  if (!b || !b.stats) return a;
  return b.stats.avg > a.stats.avg ? b : a;
}

// A run with very long frames (p95 from 100 ms, a 1%-low under 8 fps) says more about the computer being busy (other
// programs, a browser with many tabs) than about the settings: no firm advice then, measure again.
export const BENCH_BUSY_NOTE = 'Je pc was misschien druk tijdens de meting. Sluit andere programma’s en meet opnieuw voordat je een stand kiest.';
export const benchLooksBusy = (stats) => !!stats && (stats.p95 >= 100 || stats.low1 < 8);

// Ultra is the heaviest setting (the longest view: far terrain, countryside and ~400 draw calls more in the
// city). A run on Ultra under 60 fps gets one honest sentence with the safe advice; '' otherwise.
export function ultraNote(preset, avg, fps = {}) {
  if (preset !== 'hoog' || !(avg > 0) || avg >= 60) return '';
  const vlot = fps.vlot > 0 ? ` (Hoog haalt hier ongeveer ${Math.round(fps.vlot)} fps)` : '';
  return `Ultra is de zwaarste stand: de verste zichtafstand kost veel tekenwerk, ook bij een sterke videokaart. Kies Hoog voor soepeler spelen${vlot}.`;
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

// 0.64.1: the advice over the four settings the player sees (Laag, Midden, Hoog, Ultra). recommendProfile above knows
// three names and called the preset 'hoog' "Hoog", while that key is Ultra since #893: Nikky was advised "Hoog" and
// got Ultra. Same thresholds; a step up to Ultra needs more room, because Ultra is the heaviest setting.
export const STAND_ORDER = ['laag', 'middel', 'vlot', 'hoog'];
export const STAND_LABEL = { laag: 'Laag', middel: 'Midden', vlot: 'Hoog', hoog: 'Ultra' };
const STAND_EXPLAIN = {
  laag: 'Laag houdt het spel soepel op deze computer: kortere zichtafstand, geen schaduwen en een lagere resolutie.',
  middel: 'Midden is de balans: schaduwen aan en normale zichtafstand, met genoeg ruimte voor drukke scènes.',
  vlot: 'Hoog heeft de look van Ultra met een normale zichtafstand en zachte mist: soepel op de meeste computers.',
  hoog: 'Ultra laat Grunn zien zoals bedoeld, met de verste zichtafstand. Deze computer houdt dat bij.',
};
// #1015: two things that make a low result say nothing about the settings. (1) Preset-insensitive: the next lower preset (measured on the slowest
// scenes, presetFps) is not clearly faster, so lowering the setting cannot help; the limit is elsewhere (streaming, CPU, the driver, a busy
// machine). (2) Uneven: the pooled average is far below the median scene, so a few scenes collapse (shader compiles, streaming) and the rest
// is fine. The mean of all frames punishes such a collapse hard (24 fps on a strong AMD pc), the median over scenes does not.
export const DIAG_LOWER_GAIN = 1.15;
export const DIAG_UNEVEN_RATIO = 0.7;
const median = (a) => { const s = a.filter((x) => Number.isFinite(x) && x > 0).sort((x, y) => x - y); if (!s.length) return 0; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const medianShotFps = (shots) => median((shots || []).map((s) => s && s.fps));
export function runDiagnosis({ avg, shots, current, presetFps } = {}) {
  const i = STAND_ORDER.indexOf(current);
  const medianFps = medianShotFps(shots);
  const out = { kind: 'normal', medianFps, lowerGain: 0 };
  const nShots = (shots || []).filter((s) => s && s.fps > 0).length;
  const here = presetFps && presetFps[current] > 0 ? presetFps[current] : avg;
  if (i > 0 && here > 0 && presetFps) {
    const lower = STAND_ORDER.slice(0, i).map((k) => presetFps[k]).filter((x) => x > 0);
    if (lower.length) { out.lowerGain = Math.max(...lower) / here; if (out.lowerGain < DIAG_LOWER_GAIN) out.kind = 'preset-insensitive'; }
  }
  if (out.kind === 'normal' && nShots >= 5 && avg > 0 && medianFps > 0 && avg / medianFps < DIAG_UNEVEN_RATIO) out.kind = 'uneven';
  return out;
}
export const DIAG_TEXT = {
  'preset-insensitive': 'Een lagere stand maakt het hier niet merkbaar sneller: de rem zit waarschijnlijk niet in de grafische stand (laden, processor, stuurprogramma of een druk systeem). Zet de stand daarom niet lager; start het spel opnieuw en meet nog een keer.',
  uneven: 'Een paar scènes haperen (laden of shaders), de meeste lopen gewoon soepel. Een lagere stand lost dat niet op; start het spel opnieuw en meet nog een keer.',
};

// #1184: de metingen per stand (presetFps: de proefshots op elke stand) sturen het advies bij. Een stap omhoog mag alleen als de
// volgende stand in de proef zelf ook soepel haalt (UP_MIN_FPS); een stap omlaag gaat door naar de stand die in de proef wel
// draait (ROUGH_FPS), zodat de speler niet eerst "Hoog" en dan nog eens "Midden" krijgt. Zonder metingen blijft alles zoals het was.
export const UP_MIN_FPS = 55;
export const ROUGH_FPS = 40;
export function recommendStand(stats, current, diag = null, presetFps = null) {
  if (!stats) return { stand: current || 'vlot', change: 'same', text: 'Er is niets gemeten. Probeer het nog een keer.' };
  const i = STAND_ORDER.indexOf(current);
  const base = i < 0 ? 2 : i;
  const rough = stats.avg < 40 || stats.low1 < 22 || stats.p95 > 40;
  // a locked 60 on a 60 Hz screen (avg just under 60, every frame in time): the display caps the fps, so avg can never reach 75 and a
  // fast GPU (Nikky, RX 9070 XT) would never be offered more. The frame times show the room: nearly all frames within ~16.7 ms.
  const locked60 = stats.avg >= 57 && stats.low1 >= 52 && stats.p95 <= 18;
  const roomy = (stats.avg >= 75 && stats.low1 >= 45 && stats.p95 <= 22) || locked60;
  const roomyUltra = (stats.avg >= 90 && stats.low1 >= 55 && stats.p95 <= 18) || (locked60 && stats.low1 >= 56 && stats.p95 <= 17.4);
  let to = base;
  const blamed = rough && diag && DIAG_TEXT[diag.kind] ? diag.kind : null; // the settings are not the cause: do not lower them
  if (rough && !blamed) to = Math.max(0, base - 1);
  else if (roomy && (base + 1 < 3 || roomyUltra)) to = Math.min(STAND_ORDER.length - 1, base + 1);
  let upBlockedFps = 0;
  if (presetFps) {
    const at = (k) => (presetFps[STAND_ORDER[k]] > 0 ? presetFps[STAND_ORDER[k]] : 0);
    if (to > base && at(to) > 0 && at(to) < UP_MIN_FPS) { upBlockedFps = at(to); to = base; }
    else if (to < base) while (to > 0 && at(to) > 0 && at(to) < ROUGH_FPS) to--;
  }
  const stand = STAND_ORDER[to];
  const change = to > base ? 'up' : to < base ? 'down' : 'same';
  let text = STAND_EXPLAIN[stand];
  if (upBlockedFps) text = `${STAND_LABEL[stand]} draait prima. Een stand hoger haalt hier maar ongeveer ${Math.round(upBlockedFps)} fps: blijf bij ${STAND_LABEL[stand]}.`;
  else if (blamed) text = DIAG_TEXT[blamed];
  else if (rough && change === 'same') text = 'Alles staat al zo licht mogelijk. Sluit andere programma’s en tabbladen voor wat extra lucht.';
  else if (change === 'same' && i >= 0) text = `${STAND_LABEL[stand]} draait prima. ${STAND_EXPLAIN[stand]}`;
  return { stand, change, text, ...(blamed ? { diag: blamed } : {}) };
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

export function packRun({ stats, cats, preset, memory, at, course }) {
  const r = (x, d = 1) => +x.toFixed(d);
  return {
    v: 1, at: at || Date.now(), preset: preset || null, course: course || 'classic',
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
