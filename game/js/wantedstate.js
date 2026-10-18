// The wanted state as one word (#43): 'rustig' (no stars), 'achtervolging'
// (stars, a unit sees you or just did) or 'zoeken' (stars, the units have lost
// you and search the circle). The HUD and the tests read it; police.js keeps
// the bookkeeping (world.police.searching).
export function wantedPhase(world) {
  if (!(world.wanted > 0)) return 'rustig';
  return world.police && world.police.searching ? 'zoeken' : 'achtervolging';
}
