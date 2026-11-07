// #660: G-Music zette alle 34 nummers (~128 MB) op preload='auto' en hing ze aan de
// audiograaf, terwijl er één speelt. Alleen het nummer dat speelt en de eerstvolgende
// in de wachtrij bufferen; de rest wacht tot het aan de beurt is. Deze pure teller
// houdt de grens op één plek en is los te testen.
export const GMUSIC_PRELOAD_AHEAD = 2;

// Hoeveel van n nummers bufferen: het huidige plus 'ahead' in de wachtrij.
export function gmusicPreloadCount(n, ahead = GMUSIC_PRELOAD_AHEAD) {
  const count = Number(n) || 0;
  return Math.max(0, Math.min(count, 1 + Math.max(0, ahead)));
}
