import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GRID_CONVERGENCE } from './rdnew.js';
import { setSunDeclination, sunElevationDeg, nightFactor, nightAtHour, smoothstep, hourAngle, wrapHour } from './sunrules.js';

// the sun and the night live in sunrules.js (one definition of night, #107)
export { setSunDeclination, sunElevationDeg, nightFactor, nightAtHour };

// world.clock: in-game hours 0..24. Advanced only from updateGameplay, so
// the pause menu and map freeze time. world.dayNight is the derived,
// read-only summary other systems (HUD, audio, AI) may use.

export const DAY_LENGTH_S = 24 * 60;
const START_HOUR = 17.5;
// Horizontal sun bearing at solar noon, in three.js x/z space: chosen for
// the look against true north, turned onto the RD grid (rdnew.js).
const NOON_BEARING = -60 * Math.PI / 180 + GRID_CONVERGENCE;

export function initDayNight(world) {
  if (typeof world.clock !== 'number' || !isFinite(world.clock)) world.clock = START_HOUR;
  world.dayNight = { hour: world.clock, sunElevation: 0, night: 0, label: '' };
  refreshDayNight(world);
}

export function updateDayNight(dt, world) {
  if (typeof world.clock !== 'number' || !isFinite(world.clock)) world.clock = START_HOUR;
  const next = world.clock + dt * 24 / DAY_LENGTH_S;
  world.clock = next % 24;
  refreshDayNight(world);
}

export function refreshDayNight(world) {
  const hour = wrapHour(world.clock);
  const elev = sunElevationDeg(hour);
  const dn = world.dayNight || (world.dayNight = {});
  dn.hour = hour;
  dn.sunElevation = elev;
  dn.night = nightFactor(elev);
  const h = Math.floor(hour), m = Math.floor((hour - h) * 60);
  dn.label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return dn;
}

function dirFromAngles(out, bearing, elevRad) {
  const c = Math.cos(elevRad);
  return out.set(Math.cos(bearing) * c, Math.sin(elevRad), Math.sin(bearing) * c).normalize();
}

// Keyframes by sun elevation (deg). Below ~-3 deg the directional light is
// the moon, so sun/sunI there describe moonlight.
const KEYS = [
  { e: 60, sun: 0xfff4e2, sunI: 3.1, hemiSky: 0xbcd3ec, hemiGnd: 0x74695a, hemiI: 0.95, zenith: 0x3a78c4, horizon: 0xc8d9e2, fog: 0xc6d4dc, glow: 0xffe6c0, glowI: 0, exp: 1.0, bloomThr: 3.2, bloomStr: 0.12, sat: 1.05, con: 1.04, shadowTint: 0xf6f6f6, hiTint: 0xfff9ef, lift: 0.008, vig: 0.18 },
  { e: 30, sun: 0xffeaca, sunI: 3.0, hemiSky: 0xb6cce6, hemiGnd: 0x74685a, hemiI: 0.9, zenith: 0x3f7cc4, horizon: 0xcfdadf, fog: 0xcbd5d8, glow: 0xffd9a8, glowI: 0.1, exp: 1.02, bloomThr: 3.0, bloomStr: 0.12, sat: 1.05, con: 1.04, shadowTint: 0xf3f6f8, hiTint: 0xfff7ea, lift: 0.008, vig: 0.18 },
  { e: 14, sun: 0xffd197, sunI: 2.9, hemiSky: 0xa9bdd6, hemiGnd: 0x735f4a, hemiI: 0.85, zenith: 0x4679bb, horizon: 0xe6d3b8, fog: 0xdacbb4, glow: 0xffb46a, glowI: 0.35, exp: 1.06, bloomThr: 2.6, bloomStr: 0.16, sat: 1.08, con: 1.05, shadowTint: 0xe6f0f5, hiTint: 0xfff0dc, lift: 0.01, vig: 0.2 },
  { e: 6, sun: 0xffa75c, sunI: 2.6, hemiSky: 0x9aa6c2, hemiGnd: 0x6d5646, hemiI: 0.78, zenith: 0x3e619e, horizon: 0xf1ae74, fog: 0xd9a67e, glow: 0xff8a3c, glowI: 0.65, exp: 1.1, bloomThr: 2.2, bloomStr: 0.22, sat: 1.12, con: 1.06, shadowTint: 0xd6eaf2, hiTint: 0xffe4c4, lift: 0.012, vig: 0.24 },
  { e: 1, sun: 0xff7d40, sunI: 1.6, hemiSky: 0x8088aa, hemiGnd: 0x5a483c, hemiI: 0.72, zenith: 0x2f4a82, horizon: 0xe5895a, fog: 0xbf8062, glow: 0xff6a30, glowI: 0.8, exp: 1.14, bloomThr: 1.8, bloomStr: 0.3, sat: 1.1, con: 1.06, shadowTint: 0xcfe4f0, hiTint: 0xffdcc0, lift: 0.014, vig: 0.26 },
  { e: -3, sun: 0xc86a4a, sunI: 0.08, hemiSky: 0x5e6a94, hemiGnd: 0x4c4644, hemiI: 0.95, zenith: 0x1e2f60, horizon: 0x9a6e7a, fog: 0x6c5a6a, glow: 0xd8604a, glowI: 0.5, exp: 1.2, bloomThr: 1.4, bloomStr: 0.3, sat: 1.0, con: 1.05, shadowTint: 0xc6dcef, hiTint: 0xf6dcd0, lift: 0.018, vig: 0.28 },
  { e: -7, sun: 0xa4b6e0, sunI: 0.3, hemiSky: 0x4c5d96, hemiGnd: 0x4a4b58, hemiI: 1.35, zenith: 0x121d3e, horizon: 0x3e4c6e, fog: 0x344058, glow: 0x6a4a6a, glowI: 0.15, exp: 1.3, bloomThr: 1.25, bloomStr: 0.36, sat: 0.94, con: 1.04, shadowTint: 0xbcd0f0, hiTint: 0xf2eadc, lift: 0.022, vig: 0.3 },
  { e: -12, sun: 0x93aadc, sunI: 0.55, hemiSky: 0x40548e, hemiGnd: 0x444654, hemiI: 1.6, zenith: 0x0a1128, horizon: 0x222c48, fog: 0x1e2638, glow: 0x000000, glowI: 0, exp: 1.45, bloomThr: 1.2, bloomStr: 0.4, sat: 0.92, con: 1.04, shadowTint: 0xb8ccf0, hiTint: 0xfff0dc, lift: 0.026, vig: 0.32 },
  { e: -25, sun: 0x8ea6d8, sunI: 0.52, hemiSky: 0x3c5088, hemiGnd: 0x424452, hemiI: 1.6, zenith: 0x080e22, horizon: 0x1e2840, fog: 0x1b2233, glow: 0x000000, glowI: 0, exp: 1.48, bloomThr: 1.2, bloomStr: 0.4, sat: 0.9, con: 1.04, shadowTint: 0xb6caf0, hiTint: 0xfff0dc, lift: 0.028, vig: 0.33 },
];
const COLOR_KEYS = ['sun', 'hemiSky', 'hemiGnd', 'zenith', 'horizon', 'fog', 'glow', 'shadowTint', 'hiTint'];
const NUM_KEYS = ['sunI', 'hemiI', 'glowI', 'exp', 'bloomThr', 'bloomStr', 'sat', 'con', 'lift', 'vig'];
const KEY_COLORS = KEYS.map((k) => Object.fromEntries(COLOR_KEYS.map((c) => [c, new THREE.Color(k[c])])));

// Fills `out` (reused between frames) with the full lighting mood for a
// clock hour. Colours are linear THREE.Colors.
export function computeLighting(hour, out = {}) {
  hour = wrapHour(hour);
  const elev = sunElevationDeg(hour);
  for (const c of COLOR_KEYS) if (!out[c]) out[c] = new THREE.Color();
  if (!out.sunDir) { out.sunDir = new THREE.Vector3(); out.moonDir = new THREE.Vector3(); out.lightDir = new THREE.Vector3(); }

  let i = 0;
  while (i < KEYS.length - 2 && elev < KEYS[i + 1].e) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = Math.max(0, Math.min(1, (elev - a.e) / (b.e - a.e)));
  for (const c of COLOR_KEYS) out[c].copy(KEY_COLORS[i][c]).lerp(KEY_COLORS[i + 1][c], t);
  for (const n of NUM_KEYS) out[n] = a[n] + (b[n] - a[n]) * t;

  const H = hourAngle(hour);
  const bearing = NOON_BEARING + H;
  dirFromAngles(out.sunDir, bearing, elev * Math.PI / 180);
  const moonElev = Math.max(12, Math.min(48, -elev * 1.4 + 8));
  dirFromAngles(out.moonDir, bearing + Math.PI * 0.92, moonElev * Math.PI / 180);
  out.isMoon = elev < -3;
  // Keep the shadow-casting light above the horizon even at sunset.
  if (out.isMoon) out.lightDir.copy(out.moonDir);
  else dirFromAngles(out.lightDir, bearing, Math.max(elev, 2.5) * Math.PI / 180);

  out.hour = hour;
  out.elevation = elev;
  out.night = nightFactor(elev);
  out.daylight = smoothstep(-6, 12, elev);
  return out;
}

// The one answer to "what time of day is it" for everything that reads
// world.clock/world.dayNight: hour (0..24), night (0..1, from the sun),
// isNight (night > 0.5, the street lights are on) and phase
// ('dag' | 'schemering' | 'nacht'). Rules that only know an hour (musicpick,
// muggingrules, streetlifedata) ask sunrules.js nightAtHour: the same sun.
export function dayState(world) {
  const dn = world && world.dayNight;
  const raw = dn && Number.isFinite(dn.hour) ? dn.hour : world && world.clock;
  const hour = Number.isFinite(raw) ? ((raw % 24) + 24) % 24 : 12;
  const night = dn && Number.isFinite(dn.night) ? dn.night : 0;
  return { hour, night, isNight: night > 0.5, phase: night > 0.5 ? 'nacht' : night > 0 ? 'schemering' : 'dag' };
}
