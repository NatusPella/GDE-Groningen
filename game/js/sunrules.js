// The one definition of night (#107): by the sun. Pure, no three.js, so the rules
// that only know an hour (musicpick, muggingrules, streetlifedata) and the world's
// daynight.js share it.
//
// The sun's height follows the date (calendarday.js sets the declination): in
// midsummer it is light until late and dark for a short night, in spring and autumn
// the night is longer. night(hour) is 0 by day, 1 deep in the night and smooth
// between (the twilight); "is it night" is night > NIGHT_ON, where the street lights
// come on and the streets are quiet. dayState(world) in daynight.js is the same
// answer from world.clock.

const LATITUDE = 53.2 * Math.PI / 180;
// the sun's declination: calendarday.js sets it per date (setSunDeclination);
// null (the trailer, the intro, before a game runs) is the look they were shot with
const DEFAULT_DECLINATION = 15 * Math.PI / 180;
let DECLINATION = DEFAULT_DECLINATION;
export function setSunDeclination(deg) {
  DECLINATION = Number.isFinite(deg) ? deg * Math.PI / 180 : DEFAULT_DECLINATION;
}

// night from this elevation on counts as "night" (the street lights are on)
export const NIGHT_ON = 0.5;

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function hourAngle(hour) {
  return (hour - 12) * 15 * Math.PI / 180;
}

export function sunElevationDeg(hour) {
  const s = Math.sin(LATITUDE) * Math.sin(DECLINATION) + Math.cos(LATITUDE) * Math.cos(DECLINATION) * Math.cos(hourAngle(hour));
  return Math.asin(Math.max(-1, Math.min(1, s))) * 180 / Math.PI;
}

export function nightFactor(elevDeg) {
  return smoothstep(4, -8, elevDeg);
}

const wrap = (h) => ((h % 24) + 24) % 24;

// An hour that is always usable. A NaN or infinite clock never becomes finite
// again by itself (NaN % 24 is still NaN), and every light, colour and the
// exposure are interpolated from it: one bad clock hour would leave the whole
// 3D view black for as long as nothing else sets the clock. Noon is the
// harmless stand-in, the same one dayState and the 3D lighting already use.
export const wrapHour = (h) => (Number.isFinite(h) ? wrap(h) : 12);

// 0..1: how dark it is at this clock hour (0..24), by the sun of today's date
export function nightAtHour(hour) {
  return nightFactor(sunElevationDeg(wrapHour(hour)));
}

// is it night at this clock hour: the one answer for every rule that only has an hour
export const isNightAtHour = (hour) => nightAtHour(hour) > NIGHT_ON;
