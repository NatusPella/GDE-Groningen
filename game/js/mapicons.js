// How map icons are sized and thinned: shared by the full map and the minimap
// (node-safe, no DOM). Every icon has a category with a priority; zoomed out
// only the important categories show, zoomed in more, and where two icons
// would overlap the one with the higher priority wins.

// min: the zoom (map zoom, 1 = the city's extent) from which the category shows;
// pri: who wins a collision; keep: never dropped by a collision
const CATS = {
  player: { min: 0, pri: 1000, keep: true },
  partner: { min: 0, pri: 950, keep: true }, // medespelers (samen spelen, #95)
  goal: { min: 0, pri: 900, keep: true },
  mission: { min: 0, pri: 800, keep: true },
  police: { min: 0, pri: 700, keep: true },
  gevaar: { min: 0, pri: 650, keep: true },
  rival: { min: 0, pri: 640, keep: true },
  halte: { min: 0, pri: 620, keep: true },
  subdoel: { min: 0, pri: 590 },
  home: { min: 0, pri: 600, keep: true },
  own: { min: 0.6, pri: 560 },
  station: { min: 0, pri: 520 },
  zorg: { min: 0.9, pri: 500 },
  politiebureau: { min: 0.9, pri: 490 },
  garage: { min: 1.1, pri: 450 },
  job: { min: 1.1, pri: 400 },
  fun: { min: 1.6, pri: 300 },
  shop: { min: 2, pri: 250 },
  ommeland: { min: 0.34, pri: 240 },
  companion: { min: 1.6, pri: 230 },
  tip: { min: 4, pri: 120 },
  horeca: { min: 6, pri: 110 },
  flitspaal: { min: 4, pri: 100 },
  other: { min: 2, pri: 200 },
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
  return zoom >= CATS[mapCategory(kind)].min;
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
const CAT_RIM = {
  zorg: '#ff5a5a', politiebureau: '#5a8bff', garage: '#ffb23f', station: '#9a7bff', job: '#4fd6c4',
  shop: '#ff8ad0', gevaar: '#ff5a5a', rival: '#ffb23f', halte: '#ffd84a', subdoel: '#4fd6c4', fun: '#a6e04f', horeca: '#ff9a4f', own: '#f5e04f', ommeland: '#7fd0ff',
};
export function mapRimColor(kind) {
  return CAT_RIM[mapCategory(kind)] || 'rgba(240, 237, 228, 0.92)';
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
export const HALO_DARK = '#0c140e';
export const HALO_LIGHT = '#f0ede4';
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
export const FLAT_FILL = {
  zorg: '#ff5a5a', politiebureau: '#5a8bff', garage: '#ffb23f', station: '#9a7bff', job: '#4fd6c4',
  shop: '#ff8ad0', fun: '#a6e04f', horeca: '#ff9a4f', ommeland: '#7fd0ff',
  flitspaal: '#ffe14a', tip: '#e8b060', other: '#f5f0e6',
};
export const FLAT_INK = HALO_DARK;
// the colour of the category, or null when this kind keeps its own look (you, goals, missions,
// police, mission-layer marks, your own vehicles and home)
export function mapFillColor(kind) {
  return FLAT_FILL[mapCategory(kind)] || null;
}
