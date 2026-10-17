// How map icons are sized and thinned: shared by the full map and the minimap
// (node-safe, no DOM). Every icon has a category with a priority; zoomed out
// only the important categories show, zoomed in more, and where two icons
// would overlap the one with the higher priority wins.

// min: the zoom (map zoom, 1 = the city's extent) from which the category shows;
// pri: who wins a collision; keep: never dropped by a collision
const CATS = {
  player: { min: 0, pri: 1000, keep: true },
  goal: { min: 0, pri: 900, keep: true },
  mission: { min: 0, pri: 800, keep: true },
  police: { min: 0, pri: 700, keep: true },
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
  if (kind === 'userWaypoint' || kind === 'sj-target' || kind === 'missionActive' || kind.startsWith('ma-')) return 'goal';
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

// icon scale for the full map: 1.5 zoomed out, up to 2.4 right on the street.
// The base icon is about 10 units wide, so that is 15 to 24 px.
export function mapIconScale(zoom) {
  return Math.max(1.5, Math.min(2.4, 1.5 + Math.log2(Math.max(1, zoom)) * 0.3));
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
