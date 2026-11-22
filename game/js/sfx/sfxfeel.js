// Sound feel (22-11): small rules that make the mix follow the place, the hour and a conversation.
// Pure numbers, no Web Audio, so scripts/sfxfeel_test.mjs can check them; audio.js, sfx/ambience.js and sfx/foley.js apply them.
//   breezeTargets     the wind bed per place, hour and weather (a sea breeze on the coast in the afternoon, a calm dawn)
//   speechDuckStep  the speech duck of ambience and engine with a hold, so the mix does not pump between two lines
//   wetStepLevel    the splash under a step: also on ground that is still wet after the rain, never indoors
//   stepSpeechGain  what is left of a footstep while someone talks (the feet of the player keep more than those of a passer-by)
// Samen spelen: all of this is local audio per player, from facts every player already has (own place, shared clock and weather).

import { speechDuckFactor } from './mixplan.js';

const clamp01 = (x) => (x > 0 ? (x < 1 ? x : 1) : 0);   // NaN becomes 0
const num = (x, d = 0) => (Number.isFinite(x) ? x : d);

// --- wind ---------------------------------------------------------------------------------------------------------------
// The wind over the day: calm at the end of the night (3 to 5 h), strongest in the afternoon (15 h), lying down in the evening.
// Returns BREEZE_DAY_MIN to BREEZE_DAY_MAX; an hour without a value counts as noon.
export const BREEZE_DAY_MIN = 0.75, BREEZE_DAY_MAX = 1.15;
export function breezeDayFactor(hour) {
  const h = ((num(hour, 12) % 24) + 24) % 24;
  const c = 0.5 + 0.5 * Math.cos(((h - 15) / 24) * Math.PI * 2);
  return BREEZE_DAY_MIN + (BREEZE_DAY_MAX - BREEZE_DAY_MIN) * c;
}
export const BREEZE_BED_MAX = 0.36;       // the bed never gets louder than this, whatever adds up
export const BREEZE_GAIN = 0.1;     // what a full breeze (weather.windStrength 1) adds on open land
// f: { open, green, coast (0..1 sea nearby), sea (bool), rain (0..1), breeze (weather.windStrength 0..1), hour, closed, paused (0..1) }
// out: { level, lp } - the target of the wind bed (same unit as the beds of ambience.js) and its low-pass in Hz.
export function breezeTargets(f, out = {}) {
  const open = clamp01(f.open), green = clamp01(f.green), rain = clamp01(f.rain), breeze = clamp01(f.breeze);
  const coast = f.sea ? 1 : clamp01(f.coast);
  // how much of the breeze reaches the ear: a street canyon shelters, open land and the coast do not
  const exposed = Math.max(0.3 + 0.7 * open, coast);
  const dry = (0.03 + open * 0.04 + green * 0.015 + coast * 0.03 + breeze * exposed * BREEZE_GAIN) * breezeDayFactor(f.hour);
  const level = Math.min(BREEZE_BED_MAX, dry + rain * 0.26);
  out.level = level * (f.closed ? 0.35 : 1) * clamp01(num(f.paused, 1));
  // more wind is a brighter hiss; a cabin keeps only the rumble
  out.lp = f.closed ? 700 : 2500 + rain * 6000 + breeze * exposed * 1500;
  return out;
}

// --- speech duck with a hold ----------------------------------------------------------------------------------------------
// audio.js let the duck go the moment a line ended (release 1.5 /s): in the 0.3 s between two lines of a conversation the
// ambience and the engine came back up by a third and dropped again (pumping). Now the duck holds SPEECH_HOLD seconds
// after the last word before it lets go; after that the release is the old one.
export const SPEECH_HOLD = 0.6, SPEECH_ATTACK = 6, SPEECH_RELEASE = 1.5;
// state: { level, hold } (kept by the caller, no allocation); talking: bool; dt in s. Returns the new level 0..1.
export function speechDuckStep(state, talking, dt) {
  const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
  let level = clamp01(state.level);
  if (talking) {
    state.hold = SPEECH_HOLD;
    level += (1 - level) * Math.min(1, d * SPEECH_ATTACK);
  } else {
    const hold = num(state.hold, 0) - d;
    state.hold = hold > 0 ? hold : 0;
    if (hold <= 0) level += (0 - level) * Math.min(1, d * SPEECH_RELEASE);
  }
  state.level = level;
  return level;
}

// --- footsteps ------------------------------------------------------------------------------------------------------------
// Surfaces that never splash: grass and water have their own sound, a floor indoors stays dry.
const DRY_ALWAYS = new Set(['gras', 'wet', 'binnen']);
// loose ground swallows half of the splash
const LOOSE = new Set(['zand', 'grind']);
export const WET_RAIN_FROM = 0.35, WET_GROUND_FROM = 0.3;
// The level of the splash layer under a step (a factor on the gain of the step, 0 = none).
// rain: weather.intensity now; wet: weather.wet (the ground: wet in ~6 s, dry in ~40 s), so puddles outlast the shower.
export function wetStepLevel(rain, wet, surface) {
  if (DRY_ALWAYS.has(surface)) return 0;
  const r = clamp01(rain), w = clamp01(wet);
  const fromRain = r > WET_RAIN_FROM ? r * 0.5 : 0;
  const fromGround = w > WET_GROUND_FROM ? ((w - WET_GROUND_FROM) / (1 - WET_GROUND_FROM)) * 0.35 : 0;
  return Math.max(fromRain, fromGround) * (LOOSE.has(surface) ? 0.5 : 1);
}

// What is left of a footstep while someone talks (speaking 0..1). The feet of other people follow the mix plan (voetstap);
// the feet of the player are feedback for what you do and keep half of what the plan takes away.
export function stepSpeechGain(own, speaking) {
  const f = speechDuckFactor('voetstap', speaking);
  return own ? 1 - (1 - f) * 0.5 : f;
}
