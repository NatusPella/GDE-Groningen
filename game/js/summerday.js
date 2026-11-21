// Summer variety per calendar day (21-11): the game stays always summer (constitution 3), but no two days are alike.
// Pure function of the calendar day and the clock: no THREE, no randomness source, no network traffic. Everyone with the same day
// and clock sees the same thing (Samen spelen: a guest lives on the host's day and clock, see net/speelklok.js).
//
// Six summer days: helder, hitte, bewolkt, bui (with a chance of thunder), bries (wind on the coast) and zacht. On top, per day:
// morning mist over the meadows, a rainbow after a shower and a warm evening with flies and glow.
// The layer only adds to the weather machine (weatherstate.js) and damps it on a hot day; it never makes anything cold or white.
//
//   const layer = summerLayer(day, hour);   // { kind, tempC, heat, overcast, rain, thunder, mist, rainbow, wind, ... }
//   const weather = combineSummer(regionWeather(...), layer);

import { streekZonHoogte } from './weerdag.js';

export const SUMMER_KINDS = Object.freeze(['helder', 'hitte', 'bewolkt', 'bui', 'bries', 'zacht']);
const WEIGHT = { helder: 0.24, hitte: 0.16, bewolkt: 0.18, bui: 0.16, bries: 0.14, zacht: 0.12 };
const BASE_TEMP = { helder: 25, hitte: 31, bewolkt: 20, bui: 24, bries: 21, zacht: 22 }; // degrees Celsius around the warmest hour

// Fixed limits (the test guards them): the layer adds at most this to the picture.
export const SUMMER_LIMITS = Object.freeze({
  extraDrawCalls: 2, // the rainbow is an existing sky uniform (0), the flies are one Points object, the glow is a uniform
  maxFlies: 120,
  minTempC: 14, // never colder: always summer
  maxRain: 0.85, // no full storms
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wrap24 = (h) => ((h % 24) + 24) % 24;

// Deterministic 0..1 value for a day and a channel (integer hash, no sin: same result on every platform).
function h01(day, channel) {
  let a = (Math.imul((day | 0) + 1, 0x9E3779B1) ^ Math.imul((channel | 0) + 7, 0x85EBCA6B)) >>> 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

// The kind of summer day for a calendar day. After two equal heavy days (bui, hitte) in a row a milder one follows.
export function summerKind(day) {
  const pick = (d) => {
    let r = h01(d, 1);
    for (const k of SUMMER_KINDS) { r -= WEIGHT[k]; if (r < 0) return k; }
    return 'helder';
  };
  const s = pick(day);
  if ((s === 'bui' || s === 'hitte') && pick(day - 1) === s) return h01(day, 2) < 0.5 ? 'zacht' : 'helder';
  return s;
}

// The fixed traits of a day (no hour): kind, shower hour and strength, whether morning mist lies, wind direction.
export function summerDay(day) {
  const kind = summerKind(day);
  const onsetH = 13 + h01(day, 3) * 5.5; // hour of the shower
  const showerLen = 0.5 + h01(day, 4) * 0.8; // hours
  const thunderDay = kind === 'bui' && h01(day, 5) < 0.55;
  const mist = (kind === 'helder' || kind === 'zacht' || kind === 'hitte') && h01(day, 6) < (kind === 'hitte' ? 0.25 : 0.4);
  const dir = h01(day, 7) * Math.PI * 2;
  const breeze = kind === 'bries' ? 0.65 + h01(day, 8) * 0.35 : 0.15 + h01(day, 8) * 0.3;
  return { kind, showerStart: onsetH, showerLen, thunderDay, mist, windAngle: dir, wind: breeze, showerPeak: thunderDay ? SUMMER_LIMITS.maxRain : 0.55 };
}

// Temperature (degrees Celsius) at an hour: coolest around 3, warmest around 15; never below the summer floor.
export function summerTemp(kind, hour) {
  const u = wrap24(hour);
  const curve = 0.5 + 0.5 * Math.cos(((u - 15) / 24) * Math.PI * 2); // 1 at 15:00, 0 at 03:00
  return Math.max(SUMMER_LIMITS.minTempC, (BASE_TEMP[kind] || 22) - 8 * (1 - curve));
}

const _dayCache = { day: NaN, d: null };
function dayOf(day) {
  if (_dayCache.day !== day) { _dayCache.day = day; _dayCache.d = summerDay(day); }
  return _dayCache.d;
}

// The layer for a day and clock hour (0..24). Fills `out` (no allocation per frame). All values 0..1 except tempC and windAngle.
export function summerLayer(day, hour, out = {}) {
  const d = dayOf(Math.floor(Number.isFinite(day) ? day : 1));
  const u = wrap24(Number.isFinite(hour) ? hour : 12);
  const sun = streekZonHoogte('stad', u);
  const morning = u < 12;
  const daylight = smooth(-2, 12, sun);

  out.kind = d.kind;
  out.tempC = summerTemp(d.kind, u);
  out.wind = d.wind;
  out.windAngle = d.windAngle;

  // heat: scales with the temperature above 27 degrees, and with the sun
  out.heat = d.kind === 'hitte' ? clamp01((out.tempC - 27) / 5) * daylight : 0;

  // cloud skyDeck: a bewolkte day has a deck; a shower builds up before its hour
  let clouds = d.kind === 'bewolkt' ? 0.55 + 0.1 * Math.sin(u * 0.9 + d.windAngle) : d.kind === 'zacht' ? 0.18 : d.kind === 'bries' ? 0.25 : 0;
  const afterShower = u - (d.showerStart + d.showerLen);
  let rain = 0;
  if (d.kind === 'bui') {
    const buildUp = smooth(d.showerStart - 1.2, d.showerStart - 0.1, u);
    const fade = 1 - smooth(d.showerStart + d.showerLen, d.showerStart + d.showerLen + 0.25, u);
    const clearing = 1 - smooth(d.showerStart + d.showerLen + 0.05, d.showerStart + d.showerLen + 0.9, u);
    clouds = Math.max(clouds, 0.2 + 0.7 * buildUp * clearing);
    rain = d.showerPeak * smooth(d.showerStart - 0.2, d.showerStart + 0.1, u) * fade;
  }
  out.overcast = clamp01(clouds);
  out.rain = Math.min(rain, SUMMER_LIMITS.maxRain);
  out.thunder = d.thunderDay && out.rain >= 0.75;

  // morning mist over the meadows: comes up toward sunrise and lifts as the sun climbs
  out.mist = d.mist && morning ? 0.5 * smooth(-7, -1, sun) * (1 - smooth(8, 22, sun)) : 0;

  // rainbow: up to three quarters of an hour after the shower, sun low enough (at most 42 degrees), clouds lifting
  out.rainbow = d.kind === 'bui' && afterShower > 0 && afterShower < 0.75 && sun > 2 && sun < 42
    ? smooth(0, 0.1, afterShower) * (1 - smooth(0.45, 0.75, afterShower)) * (1 - clamp01((out.overcast - 0.3) / 0.5))
    : 0;

  // warm evening: glow late in the day and flies at dusk, only without a shower and without a cloud deck
  const dry = (1 - clamp01(out.rain * 3)) * (1 - clamp01((out.overcast - 0.3) / 0.4));
  const warm = d.kind === 'hitte' ? 1 : d.kind === 'helder' ? 0.8 : d.kind === 'zacht' ? 0.6 : d.kind === 'bries' ? 0.35 : d.kind === 'bui' ? 0.3 : 0.2;
  out.glow = u >= 16 ? smooth(25, 10, sun) * smooth(-8, -1, sun) * dry * warm : 0;
  out.flies = u >= 17 && u < 24 ? Math.max(0, smooth(8, 0, sun) * smooth(-9, -3, sun) * (1 - smooth(-3, -12, sun)) * dry * warm * (1 - 0.8 * d.wind)) : 0;

  // what people do (share 0..1 of the pedestrians): sunglasses, umbrella, taking shelter
  out.sunglasses = clamp01(0.04 + (d.kind === 'hitte' ? 0.4 : d.kind === 'helder' ? 0.25 : d.kind === 'zacht' ? 0.12 : 0) * daylight - out.overcast * 0.1);
  out.umbrella = clamp01(out.rain * 0.7);
  out.shelter = clamp01((out.rain - 0.3) * 1.4);
  return out;
}

// Puts the layer on a regional weather state ({ kind, rain, overcast, mist, thunder, windAngle } from regionWeather); returns `out`.
// Deterministic: a guest has the same layer as the host and gets the host's machine state (coopweer.js).
export function combineSummer(r, layer, region = 'stad', out = {}) {
  const coast = region === 'noord' ? 1.4 : region === 'stad' ? 0.9 : 1;
  // a hot day damps the machine's random showers and clouds; a bewolkte day keeps its deck
  const damp = layer.kind === 'hitte' ? 0.25 : layer.kind === 'helder' ? 0.6 : 1;
  const rain = Math.min(SUMMER_LIMITS.maxRain, Math.max(r.rain * damp, layer.rain));
  const skyDeck = clamp01(Math.max(r.overcast * damp, layer.overcast));
  const mist = clamp01(Math.max(r.mist, layer.mist));
  const thunder = rain >= 0.75 && (!!r.thunder || layer.thunder);
  out.kind = thunder ? 'onweer' : rain > 0.45 ? 'regenbui' : rain > 0.15 ? 'motregen' : mist > 0.3 ? 'mist' : skyDeck > 0.3 ? 'bewolkt' : 'helder';
  out.rain = rain; out.overcast = skyDeck; out.mist = mist; out.thunder = thunder;
  out.windAngle = r.windAngle;
  out.windStrength = clamp01(layer.wind * coast);
  return out;
}

// Rainbow strength in the sky (uniform uRainbow, max 0.35 like for wet streets): the larger of both sources.
export const rainbowStrength = (wetStreet, layer) => Math.max(wetStreet, layer.rainbow * 0.35);

// What a pedestrian gets at spawn: sunglasses, umbrella, shelter; a fixed outcome for a 0..1 hash of the person.
export function npcSummerBehaviour(layer, hash) {
  return { sunglasses: hash < layer.sunglasses, umbrella: hash > 1 - layer.umbrella * 0.6, shelter: hash > 1 - layer.shelter };
}
