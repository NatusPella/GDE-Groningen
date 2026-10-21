// The HUD's one visual language (#92, round 2). Pure logic, no DOM: what each
// vehicle shows, how a meter reads (colour AND shape, so colour-blind players
// lose nothing), where the edges sit from 720p to 4K, and who owns a number
// that two widgets used to show. hud_panel.js applies the answers as classes;
// scripts/hud_test.mjs checks them.
//
// Rules:
//   - little text: numbers only where they are the point (speed, money, time);
//     everything else is an icon or a meter
//   - a meter has three looks: ok, low, critical. Colour is never the only cue:
//     low gets a dashed fill, critical a dashed fill and a slow pulse
//   - one number, one owner: a distance shows in the GPS card OR the objective
//   - a vehicle shows only what it has: no gears on a bike, no revs on a boat

export const VEHICLE_KINDS = ['car', 'motor', 'scooter', 'bike', 'boat', 'heli', 'train'];

// speed: big number; gears/rpm: the arc and the gear row; damage: the
// vehicle's health meter; name: the small vehicle name card on entering.
export const VEHICLE_HUD = {
  car: { speed: true, gears: true, rpm: true, damage: true, name: true, unit: 'km/u' },
  motor: { speed: true, gears: true, rpm: true, damage: true, name: true, unit: 'km/u' },
  scooter: { speed: true, gears: false, rpm: false, damage: true, name: true, unit: 'km/u' },
  bike: { speed: true, gears: false, rpm: false, damage: false, name: false, unit: 'km/u' },
  boat: { speed: true, gears: false, rpm: false, damage: true, name: true, unit: 'km/u' },
  heli: { speed: true, gears: false, rpm: false, damage: true, name: true, unit: 'km/u' },
  train: { speed: true, gears: false, rpm: false, damage: false, name: false, unit: 'km/u' },
};

export function vehicleKind(v, { train = false } = {}) {
  if (train) return 'train';
  if (!v) return null;
  if (v.isHeli) return 'heli';
  if (v.isBoat) return 'boat';
  if (v.isBike) return 'bike';
  if (v.isScooter) return v.model && (v.model.motorbike || v.model.geared) ? 'motor' : 'scooter';
  return 'car';
}

// The classes updateSpeedo puts on the speedo. hasEngine: the vehicle has a
// readable engine (a car with a gearbox); only a car may show gears and revs.
export function speedoLook(kind, hasEngine = false) {
  const spec = VEHICLE_HUD[kind];
  if (!spec) return { visible: false, gears: false, rpm: false, damage: false, name: false, unit: '' };
  const engine = spec.rpm && hasEngine;
  return { visible: spec.speed, gears: spec.gears && hasEngine, rpm: engine, damage: spec.damage, name: spec.name, unit: spec.unit };
}

// --- meters --------------------------------------------------------------------

export const METER_LOW = 0.3;
export const METER_CRIT = 0.15;

// level of a meter for a fraction 0..1 (inverted meters, like heat, pass invert)
export function meterLevel(frac, { invert = false } = {}) {
  const f = Number.isFinite(frac) ? Math.max(0, Math.min(1, invert ? 1 - frac : frac)) : 0;
  return f <= METER_CRIT ? 'crit' : f <= METER_LOW ? 'low' : 'ok';
}

// The look of a level in a palette (a11y.js PALETTES entry): colour from the
// palette, and a shape cue that holds without colour.
export function meterLook(level, palette) {
  const p = palette || { ok: '#3fc97a', danger: '#d93f3f' };
  if (level === 'crit') return { color: p.danger, pattern: 'dashed', pulse: true, glyph: '!!' };
  if (level === 'low') return { color: p.danger, pattern: 'dashed', pulse: false, glyph: '!' };
  return { color: p.ok, pattern: 'solid', pulse: false, glyph: '' };
}

// The HUD scale (uiscale.js applies it as CSS zoom): the window against the
// 1440x900 layout, never below 1 (a 720p window keeps the full-size HUD), times
// the player's "Grootte interface", between 0.8 and 4.
export const BASE_W = 1440;
export const BASE_H = 900;
// A phone (touch, short side under 700 px) lays the HUD out smaller than the
// 1440x900 base: at 1 it would fill an 800x360 screen with the minimap and
// the cards. Short side 540 and up keeps scale 1; below it shrinks to 0.62 at
// the smallest, which still leaves 11 px for the 18 px texts.
export const PHONE_SHORT = 700;
export const PHONE_REF = 540;
export const PHONE_MIN = 0.62;
export function uiScaleFor(width, height, user = 1, touch = false) {
  const short = Math.min(width, height);
  const phone = touch && short < PHONE_SHORT;
  const auto = phone ? Math.max(PHONE_MIN, Math.min(1, short / PHONE_REF)) : Math.max(1, Math.min(height / BASE_H, width / BASE_W));
  const u = Number(user) || 1;
  return Math.round(Math.min(4, Math.max(phone ? 0.5 : 0.8, auto * u)) * 1000) / 1000;
}

// The box the HUD lays out in, in HUD px: the window divided by the scale.
export function hudViewport(width, height, user = 1) {
  const s = uiScaleFor(width, height, user);
  return { w: width / s, h: height / s, scale: s };
}

// --- screen: 720p to 4K --------------------------------------------------------

// Sizes are HUD px in a 1440x900 layout scaled by uiscale.js (never below 1).
// The edge keeps the HUD inside the title-safe area on a TV (about 3.5% of the
// short side) and never gets tighter than 24 or looser than 64 HUD px.
export const EDGE_MIN = 24;
export const EDGE_MAX = 64;
export function hudEdge(width, height, scale = 1) {
  const short = Math.min(width, height);
  const e = (short * 0.05) / Math.max(0.5, scale);
  return Math.round(Math.max(EDGE_MIN, Math.min(EDGE_MAX, e)));
}

// Smallest text on screen in device px for a HUD px size: below READABLE_MIN
// the HUD grows the text, never the other way round.
export const READABLE_MIN = 13;
export function textPx(base, scale = 1) {
  return Math.max(READABLE_MIN, base * Math.max(1, scale));
}

// --- one number, one owner -----------------------------------------------------

// A distance to the goal used to show in the GPS card, the objective and the
// route chip. The GPS card owns it while it shows; else the objective.
export function distanceOwner({ gps = false, objective = false } = {}) {
  return gps ? 'gps' : objective ? 'objective' : null;
}

// The vehicle's name and its damage meter both say which vehicle it is: the
// name card shows on entering, the meter then drops its label.
export function vehicleLabelOwner({ nameCardVisible = false } = {}) {
  return nameCardVisible ? 'card' : 'meter';
}

// --- contrast ------------------------------------------------------------------

// WCAG contrast of two #rrggbb colours. The HUD's text must reach TEXT_CONTRAST
// on its card, its meters and marks GRAPHIC_CONTRAST (WCAG 2.1 AA).
export const TEXT_CONTRAST = 4.5;
export const GRAPHIC_CONTRAST = 3;
export const HUD_CARD_BG = '#0c140e';
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
