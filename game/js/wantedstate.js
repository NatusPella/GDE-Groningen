// The wanted state as one word (#43): 'rustig' (no stars), 'achtervolging'
// (stars, a unit sees you or just did) or 'zoeken' (stars, the units have lost
// you and search the circle). The HUD and the tests read it; police.js keeps
// the bookkeeping (world.police.searching).
export function wantedPhase(world) {
  if (!(world.wanted > 0)) return 'rustig';
  return world.police && world.police.searching ? 'zoeken' : 'achtervolging';
}

// #1080: het korte statusje in de wanted-kaart rechtsboven (de enige plek met sterren): leeg bij 0 sterren.
export function wantedStatus(ster, phase) {
  if (!(ster > 0)) return '';
  return phase === 'zoeken' ? 'Weg uit beeld' : 'Ze zoeken je';
}

// Wat de schermlezer hoort (en het aria-label van de kaart): één formulering, geen aparte tekst bij de minimap.
export function wantedAnnounce(ster, phase) {
  if (!(ster > 0)) return 'Je bent niet meer gezocht';
  return `Gezocht: ${ster} van 5 sterren, ${phase === 'zoeken' ? 'politie zoekt je' : 'achtervolging'}`;
}
