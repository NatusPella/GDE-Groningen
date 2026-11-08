// Regels voor de perf-norm (#804): puur, zodat scripts/perf_norm_test.mjs ze kan
// testen en scripts/perf/norm_check.mjs ze op een bewaarde perf-run kan toepassen.
// De norm komt uit de acceptatie van #804: geen frame boven 100 ms en een
// strakke staart (de p95-doelstelling vraagt om raw frametijden; de harness
// levert nu de hitch-tellers hieronder).
export const NORM = Object.freeze({ maxOver100: 0, maxOver50: 0 });

export function routeStats(route) {
  const h = route && route.hitch;
  return {
    frames: Number(route && route.frames) || 0,
    over50: h && Number.isFinite(h.over50) ? h.over50 : 0,
    over100: h && Number.isFinite(h.over100) ? h.over100 : 0,
    measured: !!h && Number.isFinite(h.over50) && Number.isFinite(h.over100),
  };
}

// Welke normen haalt deze route niet? Een lege lijst betekent: binnen de norm.
export function normViolations(route, norm = NORM) {
  const s = routeStats(route);
  if (!s.measured) return [{ rule: 'geen hitch-meting in deze route', ...s }];
  const out = [];
  if (s.over100 > norm.maxOver100) out.push({ rule: `meer dan ${norm.maxOver100} frame(s) boven 100 ms`, ...s });
  if (s.over50 > norm.maxOver50) out.push({ rule: `meer dan ${norm.maxOver50} frame(s) boven 50 ms`, ...s });
  return out;
}

// Een bewaarde run is { routes: { naam: route } } of zelf één route.
export function routeMap(json) {
  if (!json || typeof json !== 'object') return {};
  return json.routes && typeof json.routes === 'object' ? json.routes : json;
}
