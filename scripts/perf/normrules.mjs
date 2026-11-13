// Regels voor de perf-norm (#804): puur, zodat scripts/perf_norm_test.mjs ze kan
// testen en scripts/perf/norm_check.mjs ze op een bewaarde perf-run kan toepassen.
// De harness (scripts/perf/hook.js) levert per route avg/p95/p99/max in
// milliseconden; met PERF_HITCH ook de hitch-tellers. De norm komt uit #804:
// p95 <= 25 ms, max <= 100 ms, en (als ze er zijn) geen frame boven 50/100 ms.
export const NORM = Object.freeze({ maxP95Ms: 25, maxMaxMs: 100, maxOver100: 0, maxOver50: 0 });

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
  const s = routeStats(route);
  const out = [];
  const frameMs = s.p95 !== null && s.max !== null;
  const hitch = s.over50 !== null && s.over100 !== null;
  if (!routeHasFrames(route) && !hitch) return [];
  if (!frameMs && !hitch) return [{ rule: 'geen meting in deze route', ...s }];
  if (frameMs) {
    if (s.p95 > norm.maxP95Ms) out.push({ rule: `p95 ${s.p95} ms > ${norm.maxP95Ms} ms`, ...s });
    if (s.max > norm.maxMaxMs) out.push({ rule: `max ${s.max} ms > ${norm.maxMaxMs} ms`, ...s });
  }
  if (hitch) {
    if (s.over100 > norm.maxOver100) out.push({ rule: `meer dan ${norm.maxOver100} frame(s) boven 100 ms`, ...s });
    if (s.over50 > norm.maxOver50) out.push({ rule: `meer dan ${norm.maxOver50} frame(s) boven 50 ms`, ...s });
  }
  return out;
}

// Een bewaarde run is { routes: { naam: route } } of zelf één route.
export function routeMap(json) {
  if (!json || typeof json !== 'object') return {};
  return json.routes && typeof json.routes === 'object' ? json.routes : json;
}
