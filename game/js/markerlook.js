// The in-world marker's numbers, pure (no THREE, no DOM): how big the icon and
// the column are at a distance, how bright they glow by day, at night and in
// rain, and the distance label. worldmarker3d.js applies them every frame;
// scripts/markerlook_test.mjs checks them (#115). The look is a thin light
// column with one floating icon under it: calm close by, still readable far
// off, a little stronger when the dark or the rain eats the light.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// icon and label grow with the distance (capped): about the same size on screen
export const iconScale = (d) => clamp(d / 40, 1, 4.5);
export const iconLift = (d) => (iconScale(d) - 1) * 0.9;
// the column gets wider far off so it never turns into a hair
// (op 400 m stond de kolom als haar achter de gebouwen: breder en hoger naarmate je verder weg bent)
export const columnWidth = (d) => clamp(d / 25, 1, 14);
// hoogte in m (basis 28): boven de daklijn van de stad uit, ook van ver
export const COLUMN_BASE_H = 28;
export const columnHeight = (d) => clamp(d * 0.3, COLUMN_BASE_H, 140);

// night, rain: 0..1. 1 by day in the clear.
export function glowBoost({ night = 0, rain = 0 } = {}) {
  return 1 + 0.55 * clamp(night, 0, 1) + 0.4 * clamp(rain, 0, 1);
}
// further away the column is a touch stronger (it is the thing you see from afar)
const farBoost = (d) => 1 + 0.5 * clamp((d - 60) / 240, 0, 1);

export const COLUMN_MIN = 0.22, COLUMN_MAX = 0.8;
// By day an additive column all but vanishes on the bright sky (the 120 m shot of #115): from the
// day side of dusk the column is drawn normally, a little darker than the marker colour, and gets
// more opaque the further away it is. night: 0..1.
export const columnNormalBlend = (env = {}) => (env.night || 0) < 0.4 && (env.rain || 0) < 0.6;
export const DAY_COLUMN_DARKEN = 0.78;
export const dayColumnOpacity = (d) => clamp(0.5 + 0.3 * clamp((d - 40) / 260, 0, 1), 0.5, 0.8);
// breath: -1..1 from the slow pulse
export function columnOpacity(breath, d, env) {
  return clamp((0.3 + 0.07 * breath) * farBoost(d) * glowBoost(env), COLUMN_MIN, COLUMN_MAX);
}
export function discOpacity(breath, env) {
  return clamp((0.14 + 0.04 * breath) * glowBoost(env), 0.08, 0.4);
}
export const glyphPulse = (breath) => 1 + (0.5 + 0.5 * breath) * 0.06;

export const LABEL_FROM_M = 14;
export const showLabel = (d) => d > LABEL_FROM_M;
export function labelText(d) {
  if (d < 100) return `${Math.round(d)} m`;
  if (d < 1000) return `${Math.round(d / 10) * 10} m`;
  return `${(d / 1000).toFixed(1).replace('.', ',')} km`;
}
