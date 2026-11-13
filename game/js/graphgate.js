// #804: wanneer mag de routegraaf opnieuw gebouwd worden? Puur, zodat de
// wachtregel (lagen eerst een seconde stil, cadans, bovengrens) testbaar is.
export const GRAPH_REBUILD_MIN_S = 1;
export const GRAPH_QUIET_S = 1;
export const GRAPH_MAX_STALE_S = 4;

// now/builtAt/staleAt in ms (performance.now()); staleAt is het moment waarop
// de huidige laagversie voor het eerst gezien is.
export function mayBuildGraph({ now, builtAt, staleAt, quietS = GRAPH_QUIET_S, cadenceS = GRAPH_REBUILD_MIN_S, maxStaleS = GRAPH_MAX_STALE_S }) {
  if (!Number.isFinite(now)) return false;
  const sindsBouw = now - (Number.isFinite(builtAt) ? builtAt : -Infinity);
  const sindsWijziging = now - (Number.isFinite(staleAt) ? staleAt : -Infinity);
  // Nog niet stil, en de oude graaf is nog niet te oud: wachten.
  if (sindsWijziging < quietS * 1000 && sindsBouw < maxStaleS * 1000) return false;
  // Cadans: nooit twee keer binnen de minimumafstand.
  if (sindsBouw < cadenceS * 1000) return false;
  return true;
}
