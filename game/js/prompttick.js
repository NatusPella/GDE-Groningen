// #659: de primaire E-hintzoeker (findPrimary, ~20 promptbronnen) draaide 60x/s
// voor een hint die hooguit een paar keer per seconde zinvol verandert.
// Deze pure klok doet dezelfde timing als de secondaire zoeker en is los te testen.
// node scripts/prompttick_test.mjs
export const PRIMARY_INTERVAL = 0.12; // s: ~8 zoekrondes per seconde

export function makePromptClock(interval = PRIMARY_INTERVAL) {
  let t = 0;
  return {
    due(dt) {
      t -= dt;
      if (t <= 0) { t = interval; return true; }
      return false;
    },
    reset() { t = 0; },
  };
}
