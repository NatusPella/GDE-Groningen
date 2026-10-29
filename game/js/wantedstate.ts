// The wanted state as one word (#43): 'rustig' (no stars), 'achtervolging'
// (stars, a unit sees you or just did) or 'zoeken' (stars, the units have lost
// you and search the circle). The HUD and the tests read it; police.js keeps
// the bookkeeping (world.police.searching).

// Type only what this function needs of `world` (the full world object is huge
// and not yet typed). A wider `World` type can absorb this interface later.
export interface WantedWorld {
  wanted: number;
  police?: { searching?: boolean };
}

export type WantedPhase = 'rustig' | 'achtervolging' | 'zoeken';

export function wantedPhase(world: WantedWorld): WantedPhase {
  if (!(world.wanted > 0)) return 'rustig';
  return world.police && world.police.searching ? 'zoeken' : 'achtervolging';
}
