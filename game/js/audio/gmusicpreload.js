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

// #761: het venster wordt ook weer gedisarmd. #660 armde alleen het speelvenster; een element
// dat de wachtrij verliet bleef op preload 'auto' staan, zodat na ±11 wissels de hele cyclus
// weer mocht bufferen (~128 MB). `arm(elements)` zet het venster (het huidige element + de
// `ahead` volgende, in speelorde) op 'auto' en alles wat eruit valt terug op 'none'.
// Puur (geen DOM/audio), dus de N-wissel-test in gmusicpreload_test.mjs dekt het gedrag.
export function createGmusicPreloadWindow(ahead = GMUSIC_PRELOAD_AHEAD) {
  let armed = new Set();
  const limit = 1 + Math.max(0, ahead);
  return {
    arm(elements) {
      const next = new Set();
      for (const el of elements) {
        if (!el) continue;
        next.add(el);
        if (next.size >= limit) break;
      }
      for (const el of next) {
        if (el.preload === 'auto') continue;
        el.preload = 'auto';
        try { if (typeof el.load === 'function') el.load(); } catch (e) { /* geen bron meer */ }
      }
      for (const el of armed) if (!next.has(el) && el.preload !== 'none') el.preload = 'none';
      armed = next;
      return next;
    },
    get armed() { return [...armed]; },
  };
}
