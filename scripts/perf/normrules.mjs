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
  if (Number.isFinite(machine.cpuBusyBeforePct)) return machine.cpuBusyBeforePct > grens;
  if (Number.isFinite(machine.load) && machine.load <= 1) return machine.load * 100 > grens;
  if (Number.isFinite(machine.load) && Number.isFinite(machine.cpus) && machine.cpus > 0) return (machine.load / machine.cpus) * 100 > grens;
  return false;
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
