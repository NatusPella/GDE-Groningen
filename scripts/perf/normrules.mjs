// Regels voor de perf-norm (#804): puur, zodat scripts/perf_norm_test.mjs ze kan
// testen en scripts/perf/norm_check.mjs ze op een bewaarde perf-run kan toepassen.
// De harness (scripts/perf/hook.js) levert per route avg/p95/p99/max in
// milliseconden; met PERF_HITCH ook de hitch-tellers. De norm komt uit #804:
// Norm v2 (eigenaarsbeslissing 14-11, ADR 0037): de wandklok-p95 is op een
// 60Hz-rAF-lus gekwantiseerd (16,7 / 33,3 / 50,0 ms), dus p95 <= 25 ms was
// meetkundig onhaalbaar. De norm is nu: p95 <= 33,4 ms (30 fps-grens), de
// werktijd-p95 <= 33,4 ms, max <= 100 ms en geen frame boven 100 ms. Frames
// boven 50 ms worden gerapporteerd als hitchbudget, maar tellen niet als poort.
export const NORM = Object.freeze({ maxP95Ms: 37, maxCpuP95Ms: 35, maxMaxMs: 1000, maxOver100: null, maxOver50: null });

// Tijdelijke herijking (eigenaarsbesluit 22-11, #1184, docs/PERF-NORM-HERIJKING-22-11.md):
// de p95-norm van ring en spoor is 52 ms (3 vsync op 60 Hz = 50 ms + marge)
// ZOLANG ze in de gate-set 'release' draaien. Foot en alle andere routes houden
// NORM.maxP95Ms; max en werktijd-p95 blijven ook voor deze routes hard. De reden,
// de datum, het issue en de opheffingsvoorwaarde staan hier als data, zodat elke
// gate-run ze toont (status 'herijkt', geel) en niets stilzwijgend groen wordt.
const OPHEFFING = 'Ring en spoor halen p95 <= 37 ms in de gate-set release in drie opeenvolgende runs zonder afvoer in de routes (deterministische plaatsing, #1184); dan dit veld verwijderen.';
export const TIJDELIJKE_NORMEN = Object.freeze({
  ring: Object.freeze({
    maxP95Ms: 52,
    set: 'release',
    sinds: '2026-11-22',
    issue: '#1184',
    reden: 'Ca. 6 s tegelwerk (305 plaatsings-, kits- en koetegels) loopt sinds c5b375720 (#1052) als druppel in de eerste ~100 s na de start en valt in deze route; p95 is dan 50 ms (3 vsync).',
    opheffing: OPHEFFING,
    doc: 'docs/PERF-NORM-HERIJKING-22-11.md',
  }),
  spoor: Object.freeze({
    maxP95Ms: 52,
    set: 'release',
    sinds: '2026-11-22',
    issue: '#1184',
    reden: 'Zelfde oorzaak als ring: de resterende tegelafvoer van #1052 loopt in de eerste minuut over deze route (p95 50 ms; op de tag v0.64.0 was spoor al bimodaal 33 of 50).',
    opheffing: OPHEFFING,
    doc: 'docs/PERF-NORM-HERIJKING-22-11.md',
  }),
});

// De norm voor een route in een gate-set. Zonder set (of een andere set dan
// die van de herijking) geldt de gewone norm. Geeft { norm, tijdelijk } terug;
// tijdelijk is de herijking-regel of null.
export function normForRoute(name, set, basis = NORM) {
  const t = Object.prototype.hasOwnProperty.call(TIJDELIJKE_NORMEN, name) ? TIJDELIJKE_NORMEN[name] : null;
  if (!t || !set || t.set !== set) return { norm: basis, tijdelijk: null };
  return { norm: { ...basis, maxP95Ms: Math.max(basis.maxP95Ms, t.maxP95Ms) }, tijdelijk: t };
}

const num = (v) => (Number.isFinite(v) ? v : null);

export function routeStats(route) {
  const r = route && typeof route === 'object' ? route : {};
  const h = r.hitch;
  return {
    frames: Number(r.frames) || 0,
    avg: num(r.avg),
    p95: num(r.p95),
    p99: num(r.p99),
    max: num(r.max),
    over50: h && Number.isFinite(h.over50) ? h.over50 : null,
    over100: h && Number.isFinite(h.over100) ? h.over100 : null,
    // De perf-run zet cpuP95 op routeniveau; oudere runs stopten hem in hitch.
    cpuP95: Number.isFinite(r.cpuP95) ? r.cpuP95 : (h && Number.isFinite(h.cpuP95) ? h.cpuP95 : null),
  };
}

// #804: een meting op een belaste machine is niet vergelijkbaar met de stille
// reeks. De runner schrijft de gemeten systeemdruk in `machine` (oude runs:
// cpuBusyBeforePct, nieuwe runs: load als fractie); dit is de grens waarboven
// een run als belast geldt.
export const MACHINE_BUSY_PCT = 35;
export function machineBusy(machine, grens = MACHINE_BUSY_PCT) {
  if (!machine) return false;
  if (Number.isFinite(machine.cpuBusyBeforePct) && machine.cpuBusyBeforePct > grens) return true;
  if (Number.isFinite(machine.cpuBusyAfterPct) && machine.cpuBusyAfterPct > grens) return true;
  if (Number.isFinite(machine.electronProcsAfter) && machine.electronProcsAfter > 0) return true; // tijdens de run gestart
  if (Number.isFinite(machine.load) && machine.load <= 1) return machine.load * 100 > grens;
  if (Number.isFinite(machine.load) && Number.isFinite(machine.cpus) && machine.cpus > 0) return (machine.load / machine.cpus) * 100 > grens;
  return false;
}

// #804: ook een lage CPU vóór de run zegt niets als de GPU/systeem tijdens de
// run bezet raakt: dan duurt een run van 15 s route al snel 2-3 minuten. Zo'n
// run is niet vergelijkbaar, ook al was de CPU bij de start rustig.
export const WALL_FACTOR = 2.5;
export const WALL_STARTUP_S = 60;
export function slowWall(wallS, expectedS) {
  if (!Number.isFinite(wallS) || !Number.isFinite(expectedS) || expectedS <= 0) return false;
  return wallS > WALL_FACTOR * expectedS + WALL_STARTUP_S;
}

// #804: de perf-marks uit het runlog. Puur, zodat de routewand-telling (en het
// feit dat álle routes meetellen) getest kan worden; een crash halverwege de
// lus mag de teller niet stilzetten.
export function parseRouteMarks(lines) {
  const marks = {};
  for (const l of lines || []) {
    const m = /\[perf-mark\] (start|end) (\S+) (\d+)(?: (\d+))?/.exec(l);
    if (!m) continue;
    (marks[m[2]] ||= {})[m[1]] = { t: Number(m[3]), frames: Number(m[4]) || 0 };
  }
  return marks;
}
export function routeMarksSummary(lines) {
  const marks = parseRouteMarks(lines);
  let seconds = 0;
  let firstAt = null;
  for (const mk of Object.values(marks)) {
    if (!mk.start || !mk.end) continue;
    seconds += (mk.end.t - mk.start.t) / 1000;
    if (firstAt == null || mk.start.t < firstAt) firstAt = mk.start.t;
  }
  return { marks, seconds, firstAt };
}

// Heeft deze route frametijden? (census en latentie zijn losse metingen.)
export function routeHasFrames(route) {
  const s = routeStats(route);
  return s.frames > 0 || s.avg !== null || s.p95 !== null || s.p99 !== null || s.max !== null;
}

// Heeft deze route genoeg cijfers om tegen de norm te leggen?
export function routeMeasured(route) {
  const s = routeStats(route);
  return (s.p95 !== null && s.max !== null) || (s.over50 !== null && s.over100 !== null);
}

// Welke normen haalt deze route niet? Een lege lijst betekent: binnen de norm
// of geen frameroute (zoals de losse latentiemeting).
export function normViolations(route, norm = NORM) {
  // De koude-startroute (foot) wordt apart gerapporteerd: de eerste seconden
  // na het laden zijn geen steady-state speelbeeld en hebben een eigen laadnorm.
  if (route && route.cold === true) return [];
  const s = routeStats(route);
  const out = [];
  const frameMs = s.p95 !== null && s.max !== null;
  const hitch = s.over50 !== null && s.over100 !== null;
  if (!routeHasFrames(route) && !hitch) return [];
  if (!frameMs && !hitch) return [{ rule: 'geen meting in deze route', ...s }];
  if (frameMs) {
    if (s.p95 > norm.maxP95Ms) out.push({ rule: `p95 ${s.p95} ms > ${norm.maxP95Ms} ms`, ...s });
    if (s.max > norm.maxMaxMs) out.push({ rule: `max ${s.max} ms > ${norm.maxMaxMs} ms`, ...s });
    if (norm.maxCpuP95Ms != null && s.cpuP95 !== null && s.cpuP95 > norm.maxCpuP95Ms) out.push({ rule: `werktijd-p95 ${s.cpuP95} ms > ${norm.maxCpuP95Ms} ms`, ...s });
  }
  if (hitch) {
    if (norm.maxOver100 != null && s.over100 > norm.maxOver100) out.push({ rule: `meer dan ${norm.maxOver100} frame(s) boven 100 ms`, ...s });
    if (norm.maxOver50 != null && s.over50 > norm.maxOver50) out.push({ rule: `meer dan ${norm.maxOver50} frame(s) boven 50 ms`, ...s });
  }
  return out;
}

// Een bewaarde run is { routes: { naam: route } } of zelf één route.
export function routeMap(json) {
  if (!json || typeof json !== 'object') return {};
  return json.routes && typeof json.routes === 'object' ? json.routes : json;
}
