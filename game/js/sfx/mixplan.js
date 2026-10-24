// The mixer plan (issue #173): one place for the level per sound category,
// how far a sound carries, what distance does to it and how speech ducks it.
// Pure numbers, no Web Audio, so scripts/sfx_test.mjs can check it. audio.js
// reads it for the effects of sfx/fxbank.js; the player's own "Effecten"
// slider (sfxVolume, settings.js) multiplies the whole lot on worldBus.

export const SPEED_OF_SOUND = 343;

// level: relative loudness of the category's effects (1 = the baseline);
// speech: what is left of it while someone talks (1 = untouched).
export const CATEGORIES = {
  explosie: { level: 1.0, speech: 0.7 },
  wapen: { level: 0.95, speech: 0.8 },
  voertuig: { level: 0.85, speech: 0.65 },
  spoor: { level: 0.8, speech: 0.6 },
  water: { level: 0.75, speech: 0.55 },
  brug: { level: 0.75, speech: 0.6 },
  kermis: { level: 0.7, speech: 0.5 },
  // de minigames (#460): discgolf, skatepark en klimtoren. Wat je zelf doet is
  // dichtbij en hoort vooraan; een stem eroverheen dempt het een beetje
  sport: { level: 0.8, speech: 0.65 },
  winkel: { level: 0.7, speech: 0.6 },
  deur: { level: 0.7, speech: 0.6 },
  voetstap: { level: 0.55, speech: 0.5 },
  dier: { level: 0.6, speech: 0.4 },
  omgeving: { level: 0.6, speech: 0.45 },
  ui: { level: 0.8, speech: 1 },
};

export function categoryLevel(cat) {
  const c = CATEGORIES[cat];
  return c ? c.level : 0.7;
}

// the gain factor a category keeps while a spoken line plays (speaking: 0..1)
export function speechDuckFactor(cat, speaking = 1) {
  const c = CATEGORIES[cat];
  const keep = c ? c.speech : 0.7;
  return 1 - (1 - keep) * Math.max(0, Math.min(1, speaking));
}

// inverse-distance gain, the same curve audio.js uses for its panners
export function distanceGain(d, ref = 8, rolloff = 0.8) {
  return ref / (ref + rolloff * (Math.max(d, ref) - ref));
}

// air takes the highs first: ~20 kHz up close, darker with every 100 m
export function airLowpassHz(d) {
  return Math.max(900, 20000 / (1 + Math.max(0, d - 8) / 40));
}

// seconds until the sound arrives (a far bang is heard late), capped so a
// shot at the edge of the map still lands inside the scene it belongs to
export function arrivalDelay(d, cap = 1.6) {
  return Math.min(cap, Math.max(0, d) / SPEED_OF_SOUND);
}

// a small deterministic spread per event: rate, gain and pan from a seed
export function variation(seed, spread = 0.08) {
  let a = (seed | 0) + 0x6d2b79f5;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { rate: 1 + (next() * 2 - 1) * spread, gain: 1 + (next() * 2 - 1) * spread * 0.8, pan: next() * 2 - 1 };
}

// What audio.js needs to play one named effect at distance d. The distance
// gain itself is the panner's job (distanceGain is for sounds without one).
export function plan(info, d, seed = 0) {
  const v = variation(seed);
  return {
    gain: categoryLevel(info.cat) * v.gain,
    rate: v.rate,
    delay: arrivalDelay(d),
    lp: d > 25 ? airLowpassHz(d) : 0,
  };
}
