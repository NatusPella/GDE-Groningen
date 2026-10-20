// How map icons are sized and thinned: shared by the full map and the minimap
// (node-safe, no DOM). Every icon has a category with a priority; zoomed out
// only the important categories show, zoomed in more, and where two icons
// would overlap the one with the higher priority wins.
import { INK, inkA, ICON_RIM, ICON_FILL, ICON_GLYPH_LIGHT, iconMinZoom, iconVisibleAtZoom } from './mapstyle.js';

// pri: who wins a collision; keep: never dropped by a collision. The zoom a category
// shows from is in mapstyle.js (ICON_MIN_ZOOM), with the other layer rules.
const CATS = {
  player: { pri: 1000, keep: true },
  partner: { pri: 950, keep: true }, // medespelers (samen spelen, #95)
  goal: { pri: 900, keep: true },
  mission: { pri: 800, keep: true },
  police: { pri: 700, keep: true },
  gevaar: { pri: 650, keep: true },
  rival: { pri: 640, keep: true },
  halte: { pri: 620, keep: true },
  subdoel: { pri: 590 },
  home: { pri: 600, keep: true },
  own: { pri: 560 },
  station: { pri: 520 },
  zorg: { pri: 500 },
  politiebureau: { pri: 490 },
  garage: { pri: 450 },
  job: { pri: 400 },
  fun: { pri: 300 },
  shop: { pri: 250 },
  ommeland: { pri: 240 },
  companion: { pri: 230 },
  tip: { pri: 120 },
  horeca: { pri: 110 },
  flitspaal: { pri: 100 },
  other: { pri: 200 },
};

export function mapCategory(kind) {
  if (kind === 'player') return 'player';
  if (kind === 'partner') return 'partner';
  if (kind === 'userWaypoint' || kind === 'sj-target' || kind === 'missionActive' || kind.startsWith('ma-')) return 'goal';
  // mission layers (missionmap.js)
  if (kind === 'mm-gevaar') return 'gevaar';
  if (kind === 'mm-rival') return 'rival';
  if (kind === 'mm-halte' || kind === 'mm-ring' || kind === 'mm-pad' || kind === 'mm-brug') return 'halte';
  if (kind === 'mm-subdoel' || kind === 'mm-hulp') return 'subdoel';
  if (kind === 'waypoint' || kind === 'sj-dot') return 'mission';
  if (kind === 'missionIdle' || kind.startsWith('mi-')) return 'mission';
  if (kind === 'cash' || kind.startsWith('police')) return 'police';
  if (kind.startsWith('home')) return 'home';
  if (kind === 'own') return 'own';
  if (kind === 'station') return 'station';
  if (kind === 'hospital') return 'zorg';
  if (kind === 'politiebureau') return 'politiebureau';
  if (kind === 'garage') return 'garage';
  if (kind.startsWith('sj-')) return 'job';
  if (kind.startsWith('shop-')) return 'shop';
  if (kind === 'dorp' || kind === 'dorpKlaar' || kind === 'wereldeinde') return 'ommeland';
  if (kind === 'companion') return 'companion';
  if (kind === 'eierbalTip') return 'tip';
  if (kind === 'horeca') return 'horeca';
  if (kind === 'flitspaal') return 'flitspaal';
  if (kind === 'pigeon' || kind === 'heli' || kind === 'padel' || kind.startsWith('act-') || kind.startsWith('pg-')) return 'fun';
  return 'other';
}

export function mapPriority(kind) {
  return CATS[mapCategory(kind)].pri;
}

// whether this kind shows at this zoom
export function mapKindVisible(kind, zoom) {
  return iconVisibleAtZoom(mapCategory(kind), zoom);
}

// icon scale for the full map: 2.1 zoomed out, up to 3.2 right on the street.
// The base icon is about 10 units wide, so that is 21 to 32 px.
export function mapIconScale(zoom) {
  return Math.max(2.1, Math.min(3.2, 2.1 + Math.log2(Math.max(1, zoom)) * 0.4));
}

// Icon size floors (#114). The base icon is ICON_UNITS wide; a floor is in
// HUD px, so it grows with the HUD scale (uiscale.js zoom) by itself. The
// minimap is small and read at a glance: its icons are bigger in proportion.
export const ICON_UNITS = 10;
export const MIN_ICON_PX = 21; // full map and minimap, at any zoom
const MINI_ICON_FRAC = 0.095; // minimap icon / minimap size
const MINI_YOU_FACTOR = 1.15; // goals and routes a little bigger than places
export function miniIconScale(mapPx, you = false) {
  const px = Math.max(MIN_ICON_PX, (mapPx || 0) * MINI_ICON_FRAC) * (you ? MINI_YOU_FACTOR : 1);
  return Math.round(px / ICON_UNITS * 100) / 100;
}
// Two icons never closer than this (centre to centre, px) for a scale: a
// little more than one icon width, so rims never touch.
const ICON_GAP_FACTOR = 1.45;
export const iconGapPx = (scale) => Math.round(ICON_UNITS * scale * ICON_GAP_FACTOR);

// The rim colour of an icon's disc per category, so the kinds read apart at a glance
// (the colours are in mapstyle.js, ICON_RIM)
export function mapRimColor(kind) {
  return ICON_RIM[mapCategory(kind)] || inkA('cream', 0.92);
}

// Icons that have to be drawn, in any order: [{ kind, sx, sy }]. Returns the
// ones that fit: the highest priority first, an icon whose centre lies closer
// than `gap` px to one already placed is dropped (unless its category is kept).
export function placeIcons(items, gap) {
  const order = items.map((it, i) => ({ it, i, pri: mapPriority(it.kind) })).sort((a, b) => b.pri - a.pri || a.i - b.i);
  const cell = Math.max(1, gap);
  const grid = new Map();
  const out = [];
  for (const { it, pri } of order) {
    const gx = Math.floor(it.sx / cell), gy = Math.floor(it.sy / cell);
    let clash = false;
    for (let dx = -1; dx <= 1 && !clash; dx++) {
      for (let dy = -1; dy <= 1 && !clash; dy++) {
        const row = grid.get((gx + dx) * 65537 + gy + dy);
        if (!row) continue;
        for (const o of row) if ((o.sx - it.sx) ** 2 + (o.sy - it.sy) ** 2 < gap * gap) { clash = true; break; }
      }
    }
    if (clash && !CATS[mapCategory(it.kind)].keep) continue;
    const key = gx * 65537 + gy;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(it);
    out.push({ ...it, pri });
  }
  // drawn lowest first, so the important ones lie on top
  return out.reverse();
}

// --- contrast of the icon's halo (#114) ----------------------------------------
// An icon sits on whatever the map is: meadow, water, a building, the night
// palette. Three rings from the outside in guarantee it is outlined on any of
// them: a dark outline, a cream ring, then the category rim on the dark disc.
// The ground is either dark (the cream ring stands out) or light (the dark
// outline does), so one of the two outer rings reaches GRAPHIC_CONTRAST (WCAG
// 2.1 non-text, 3:1) on every palette; mapicons_test checks that on all of them.
export const HALO_DARK = INK.dark;
export const HALO_LIGHT = INK.cream;
export const GRAPHIC_CONTRAST = 3;
const chan = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
// relative luminance of '#rrggbb'
function hexLuminance(hex) {
  return 0.2126 * chan(parseInt(hex.slice(1, 3), 16)) + 0.7152 * chan(parseInt(hex.slice(3, 5), 16)) + 0.0722 * chan(parseInt(hex.slice(5, 7), 16));
}
export function hexContrast(a, b) {
  const [hi, lo] = [hexLuminance(a), hexLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// the rim of the category, unless it would vanish on the dark disc
export function haloRim(kind) {
  const rim = mapRimColor(kind);
  return rim[0] === '#' && hexContrast(rim, HALO_DARK) >= GRAPHIC_CONTRAST ? rim : HALO_LIGHT;
}
// the ring that outlines an icon on a given ground ('#rrggbb'): the better of cream and dark
export function haloOutline(ground) {
  return hexContrast(HALO_LIGHT, ground) >= hexContrast(HALO_DARK, ground) ? HALO_LIGHT : HALO_DARK;
}

// --- one icon, one colour (#114) -----------------------------------------------
// Like the maps of GTA or Watch Dogs: every place is a flat silhouette in the
// colour of its category with a dark outline and its detail in dark ink. The
// colour is the category (red care, blue police, orange garage ...), so the
// colour alone says what kind of place it is. hud_panel.js draws it from the
// glyphs; the pairs below are checked by mapicons_test (fill/ink 3:1, and on
// every ground at least one of the two reaches 3:1).
export const FLAT_FILL = ICON_FILL;
// The badge: one shape per category next to its colour (so colour is never the only cue),
// a light glyph on a saturated fill, a darker rim, a soft shadow (hud_panel.js flatSprite).
export const BADGE_SHAPE = {
  zorg: 'circle', politiebureau: 'shield', garage: 'hex', station: 'squircle', job: 'diamond',
  shop: 'tile', fun: 'circle', horeca: 'circle', ommeland: 'circle', flitspaal: 'tile', tip: 'circle', other: 'circle',
};
export const BADGE_UNITS = 11; // the badge's width in base units (the glyph is about 10)
export const GLYPH_LIGHT = ICON_GLYPH_LIGHT;
export function badgeShape(kind) { return BADGE_SHAPE[mapCategory(kind)] || 'circle'; }
// the glyph colour on a fill: cream where it reaches 3:1 (blue, red, purple), else dark ink (yellow, lime)
export function badgeGlyphColor(fill) {
  return hexContrast(GLYPH_LIGHT, fill) >= GRAPHIC_CONTRAST ? GLYPH_LIGHT : HALO_DARK;
}
// '#rrggbb' mixed towards white (k > 0) or black (k < 0), k in -1..1
export function shadeHex(hex, k) {
  const t = k < 0 ? 0 : 255, a = Math.abs(k);
  const c = (i) => Math.round(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) * (1 - a) + t * a);
  return '#' + [c(0), c(1), c(2)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
// states of a place: 'aanwezig' (default), 'ontdekt' (seen before, not here now: softer),
// 'vergrendeld' (not open yet: grey, dimmed)
export function stateLook(state) {
  if (state === 'vergrendeld') return { gray: true, alpha: 0.62 };
  if (state === 'ontdekt') return { gray: false, alpha: 0.82 };
  return { gray: false, alpha: 1 };
}
// low-priority categories fade in just after the zoom they appear at, so the map does not pop
export function mapIconAlpha(kind, zoom) {
  const min = iconMinZoom(mapCategory(kind));
  if (!(min > 0.5)) return 1;
  return Math.max(0.8, Math.min(1, 0.8 + (zoom - min) / (min * 0.5) * 0.2));
}
export const FLAT_INK = HALO_DARK;
// the colour of the category, or null when this kind keeps its own look (you, goals, missions,
// police, mission-layer marks, your own vehicles and home)
export function mapFillColor(kind) {
  return FLAT_FILL[mapCategory(kind)] || null;
}
