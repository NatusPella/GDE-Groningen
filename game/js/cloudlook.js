// Wolkenlaag (#194, #195): pure keuzes voor hoeveel wolken er hangen en hoe licht ze zijn.
// Los van three zodat scripts/cloudlook_test.mjs het kan toetsen; cloud3d.js tekent ze.
export const CLOUD_COUNT = 22;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// weather: { intensity, overcast, mist, kind }, daylight 0..1 (0 = nacht), night 0..1
// -> { count, spread, opacity, tint: [r,g,b] 0..1, speed }
export function cloudState(weather, daylight = 1, night = 0) {
  const w = weather || {};
  const storm = clamp01(w.intensity || 0);
  const over = clamp01(Math.max(w.overcast || 0, storm * 0.9));
  const mist = clamp01(w.mist || 0);
  // helder weer houdt een paar losse wolkjes; bewolkt vult de lucht
  const count = Math.round(4 + over * (CLOUD_COUNT - 4));
  const grey = clamp01(over * 0.55 + storm * 0.45 + mist * 0.2);
  const day = clamp01(daylight);
  const base = [1 - grey * 0.55, 1 - grey * 0.52, 1 - grey * 0.45];
  // 's nachts donker blauwgrijs, zodat sterren en maan er nog doorheen te zien zijn
  const dark = 0.12 + 0.88 * day;
  const tint = base.map((c, i) => clamp01(c * dark + night * [0.02, 0.03, 0.06][i]));
  return {
    count,
    spread: 0.6 + over * 0.4, // 1 = ook laag bij de horizon, tot boven je hoofd
    opacity: clamp01(0.55 + over * 0.4 - mist * 0.2) * (0.35 + 0.65 * day + night * 0.2),
    tint,
    speed: 0.004 + storm * 0.008, // rad/s waarmee de laag over de lucht trekt
  };
}

// Vaste wolkenplekken (seed 1), zodat elke start dezelfde lucht heeft.
export function cloudSpots(n = CLOUD_COUNT, seed = 7) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      az: ((i + rnd() * 0.6) / n) * Math.PI * 2,   // richting
      el: 0.22 + rnd() * 0.9,                      // hoogte boven de horizon, rad
      size: 0.7 + rnd() * 0.9,
      blobs: 3 + Math.floor(rnd() * 3),
      stretch: 1.6 + rnd() * 1.2,
    });
  }
  // volgorde: eerst de wolken die altijd te zien zijn, spreid over de hemel
  return out.sort((a, b) => (a.az % 1.7) - (b.az % 1.7));
}
