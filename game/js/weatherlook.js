// How the weather looks (issue #194): pure numbers on top of weatherstate.js,
// no THREE, no Math.random, so it can be tested and replayed from a seed.
// weather.js turns these into rain streaks, fog and sky colour; ambience.js
// plays the thunder after the delay planned here.
//
// Always summer: nothing here knows snow, ice or frost.

import { mulberry32 } from './rng.js';

// Per quality level (settings.quality): how much of the rain pool is drawn,
// how many puddles and how much wet shine the ground gets, how strong the mist is.
export const QUALITY_LOOK = {
  laag: { rain: 0.45, puddles: 0, sheen: 0.5, mist: 0.8, flashes: 1 },
  middel: { rain: 0.75, puddles: 0.7, sheen: 0.8, mist: 1, flashes: 2 },
  hoog: { rain: 1, puddles: 1, sheen: 1, mist: 1, flashes: 3 },
};
export const qualityLook = (q) => QUALITY_LOOK[q] || QUALITY_LOOK.hoog;

// Region haze: the Hogeland and the coast hang in salty haze, the Veenkoloniën
// in peat mist, the city stays clear. tint multiplies the fog colour.
export const REGION_HAZE = {
  stad: { mistK: 1, tint: [1, 1, 1] },
  noord: { mistK: 1.25, tint: [0.97, 1, 1.05] },
  oost: { mistK: 1.4, tint: [1.03, 1, 0.94] },
  zuid: { mistK: 1.1, tint: [1, 1.02, 0.98] },
  west: { mistK: 1.15, tint: [1, 1.01, 0.99] },
};
export const regionHaze = (id) => REGION_HAZE[id] || REGION_HAZE.stad;

// Ground wetness (0..1) that follows the rain: wet in ~6 s, dry in ~40 s.
export function stepWet(wet, rain, dt) {
  const k = Math.min(1, dt / (rain > wet ? 6 : 40));
  return wet + (rain - wet) * k;
}

// Mist: fog distance (m) for a mist amount 0..1, quality and region.
// Thick mist gets the far end down to 70 m.
export function mistFog(mist, quality = 'hoog', region = 'stad', base = { near: 40, far: 400 }) {
  const m = Math.min(1, Math.max(0, mist * qualityLook(quality).mist * regionHaze(region).mistK));
  return { near: base.near * (1 - m), far: Math.max(70, base.far + (70 - base.far) * m) };
}

// Sunrise and sunset glow 0..1 from the sun's height: strongest when the sun
// stands just above the horizon, weak under cloud. The colour runs from gold
// to rose to dusk blue as the sun sinks.
export function sunGlow(elevDeg, overcast = 0) {
  const peak = Math.max(0, 1 - Math.abs(elevDeg - 2) / 9);
  const strength = peak * peak * (3 - 2 * peak) * (1 - Math.min(1, overcast) * 0.85);
  const gold = [1, 0.72, 0.38], rose = [0.95, 0.45, 0.4], dusk = [0.45, 0.4, 0.7];
  const t = Math.min(1, Math.max(0, (6 - elevDeg) / 12));   // 0 high .. 1 low
  const from = t < 0.5 ? gold : rose, to = t < 0.5 ? rose : dusk;
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return { strength, color: from.map((c, i) => c + (to[i] - c) * u) };
}

// Thunderstorms: a planner that turns time into strikes. Each strike has a
// distance, 1-3 flickers and the thunder delay (343 m/s, capped), so the
// sound can follow the light.
export function createStormPlanner(seed = 1) {
  return { rng: mulberry32(seed), next: 3, t: 0, strikes: [] };
}

export function stepStorm(p, dt, rain, quality = 'hoog') {
  p.t += dt;
  const out = [];
  if (rain >= 0.75) {
    p.next -= dt;
    if (p.next <= 0) {
      const dist = 250 + p.rng() * 3000;
      const flashes = 1 + Math.floor(p.rng() * qualityLook(quality).flashes);
      const strike = { at: p.t, dist, flashes, delay: Math.min(7, Math.max(0.3, dist / 343)) };
      p.strikes.push(strike);
      out.push(strike);
      p.next = 6 + p.rng() * 18 * (1.4 - rain);   // a heavier storm strikes more often
    }
  } else p.next = Math.max(p.next, 3);
  if (p.strikes.length > 8) p.strikes.shift();
  return out;
}

// Flash brightness 0..1 at `age` seconds after a strike with `flashes` flickers.
export function flashAt(age, flashes = 1) {
  if (age < 0) return 0;
  const step = 0.16;
  const i = Math.floor(age / step);
  if (i >= flashes) return 0;
  const a = (age - i * step) / step;
  return a < 0.3 ? 1 : Math.max(0, 1 - (a - 0.3) / 0.7) * 0.6;
}

// Everything the renderer needs for one frame.
export function weatherLook({ kind = 'helder', rain = 0, overcast = 0, mist = 0, elevation = 30, quality = 'hoog', region = 'stad', wet = 0 }) {
  const q = qualityLook(quality);
  return {
    rainDrops: rain * q.rain,
    puddles: wet * q.puddles,
    sheen: wet * q.sheen,
    fog: mistFog(mist, quality, region),
    haze: regionHaze(region).tint,
    glow: sunGlow(elevation, Math.max(overcast, rain)),
    storm: kind === 'onweer',
  };
}
