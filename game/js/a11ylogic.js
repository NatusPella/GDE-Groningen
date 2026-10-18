// Accessibility, the pure part (#200): colour contrast (WCAG), how a colour
// looks to someone with colour blindness, and which marker colours stay
// apart; the subtitle contrast and text size steps; and the effects that
// "Beweging beperken" and "Flitsen beperken" switch off. No DOM, no settings:
// a11y.js applies it, scripts/a11y_test.mjs checks it.

export const SUBTITLE_CONTRASTS = ['normaal', 'hoog'];
export const TEXT_SIZES = { normaal: 1, groot: 1.15, extragroot: 1.3 };

// '#rrggbb', 0xrrggbb or [r, g, b] -> [r, g, b] 0-255
export function toRgb(c) {
  if (Array.isArray(c)) return c;
  if (typeof c === 'number') return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c));
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const delin = (v) => { const c = Math.max(0, Math.min(1, v)); return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055); };

export function luminance(c) {
  const [r, g, b] = toRgb(c);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// WCAG contrast ratio, 1 to 21
export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// 4.5 is body text, 3 is large text and graphics (markers, icons)
export const MIN_TEXT = 4.5;
export const MIN_GRAPHIC = 3;

// Colour vision deficiencies as 3x3 matrices on linear RGB (Viénot, Brettel and Mollon 1999).
const SIM = {
  deuteranopie: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  protanopie: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
  tritanopie: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};

// how `c` looks with the given deficiency ('uit' = unchanged), as [r, g, b]
export function simulate(c, mode) {
  const rgb = toRgb(c);
  const m = SIM[mode];
  if (!m) return rgb;
  const l = rgb.map(lin);
  return m.map((row) => Math.round(delin(row[0] * l[0] + row[1] * l[1] + row[2] * l[2])));
}

function lab(c) {
  const [r, g, b] = toRgb(c).map(lin);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// colour difference (CIE76 deltaE): about 2 is just noticeable, 20+ is clearly different
export function colorDistance(a, b) {
  const p = lab(a), q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// Marker pairs that must stay apart however the player sees: a good and a bad
// thing, the chosen mission and the others, jobs and missions.
export const KEY_PAIRS = [['ok', 'danger'], ['mission', 'missionActive'], ['mission', 'job'], ['danger', 'police'], ['user', 'job']];
export const MIN_DISTANCE = 18;

// [{ pair, mode, distance }] that fall short, for one palette as seen by `mode`
export function closePairs(palette, mode, min = MIN_DISTANCE) {
  const out = [];
  for (const [a, b] of KEY_PAIRS) {
    const d = colorDistance(simulate(palette[a], mode), simulate(palette[b], mode));
    if (d < min) out.push({ pair: [a, b], mode, distance: Math.round(d * 10) / 10 });
  }
  return out;
}

// [{ key, ratio }] of palette colours that stay below `min` on `bg` (the HUD and map backdrop)
export function lowContrast(palette, bg, min = MIN_GRAPHIC) {
  const out = [];
  for (const [key, col] of Object.entries(palette)) {
    const ratio = contrastRatio(col, bg);
    if (ratio < min) out.push({ key, ratio: Math.round(ratio * 100) / 100 });
  }
  return out;
}

// What the subtitle contrast step changes: text colour, box alpha, outline.
// 'hoog' = pure white on a nearly opaque dark box with a heavier weight.
export function subtitleStyle(contrast, box) {
  const hoog = contrast === 'hoog';
  return {
    color: hoog ? '#ffffff' : '#f0ede4',
    boxAlpha: hoog || box ? (hoog ? 0.96 : 0.84) : 0,
    weight: hoog ? 700 : 600,
    outline: hoog,
  };
}

// The box colour behind a subtitle, composited on a worst-case backdrop, must keep 7:1 with its text in 'hoog'.
export function subtitleContrastRatio(contrast, backdrop = '#ffffff') {
  const st = subtitleStyle(contrast, true);
  const base = toRgb('#0c140e'), back = toRgb(backdrop);
  const mix = base.map((v, i) => Math.round(v * st.boxAlpha + back[i] * (1 - st.boxAlpha)));
  return contrastRatio(st.color, mix);
}

export function textScale(size) {
  return TEXT_SIZES[size] || 1;
}

// What the two comfort settings turn off. `reduceMotion` also covers the OS setting (passed in by the caller).
export function effectsFor({ reduceMotion = false, reduceFlash = false } = {}) {
  return {
    cameraShake: reduceMotion ? 0 : 1,
    cameraSway: reduceMotion ? 0 : 1,
    screenFlash: reduceFlash ? 0 : 1,
    // a flash that cannot go away must at least stay slow and dim (WCAG 2.3.1: no more than three flashes a second)
    flashMaxPerSecond: reduceFlash ? 0 : 3,
  };
}

// Camera shake amplitude after the setting (cutscripts shake, crashes, sprint bobbing)
export const shakeAmount = (amount, opts) => amount * effectsFor(opts).cameraShake;
