// The edge of the world (docs/PROVINCIE-PLAN.md 2.24) for what the
// proefstrook touches: the Wadden coast at Eemshaven and the Eems towards
// Germany. The rules are pure functions over an edge layer (index-corridor
// .json global.edge, scripts/world/build_corridor.mjs: the coastline from
// OSM, the border lines where the data has them); the turn-back scenes
// themselves come with F3. Nothing here runs without that layer.
//
//  - Sea: a boat or a swimmer may go out to `seaM` past the coast; from
//    `seaM - WARN_M` the coast guard radio warns, past it the current and
//    the fog take you back (a turn-back, facing the coast).
//  - Border: past a border line plus its buffer a road or water route turns
//    back with the gag of the land on the other side - but never on a deck,
//    a ramp or within BRIDGE_M of a bridge end: the turn-back waits until
//    after the bridge (the border-bridge rule).
//  - Air: the radio, then the autopilot turns the heli or plane back.

export const WARN_M = 250;
export const BRIDGE_M = 60;

// Dutch lines per edge (player-facing; no real organisations)
export const EDGE_GAGS = {
  wad: { warn: 'Kustwacht hier: u vaart richting open zee. Keer om, schipper.', back: 'De stroming en de mist duwen je terug naar de kust.' },
  eems: { warn: 'Een boot van de Grenswacht komt naast je varen. "Tot hier, maat."', back: 'De Grenswacht loodst je vriendelijk terug naar het Nederlandse water.' },
  duitsland: { warn: 'Een bord: "Grenswacht. Even stoppen graag."', back: 'De Grenswacht stuurt je terug. "Kom maar terug als je Platt spreekt."' },
  friesland: { warn: 'In de verte: een Friese wegversperring.', back: 'Twee neven van Durk en Douwe sturen je terug. "Hjir net, jong."' },
  drenthe: { warn: 'Er ligt een hunebed op de weg.', back: 'Drenthe is dicht. Probeer het morgen nog eens.' },
  lucht: { warn: 'Radio: u verlaat het luchtruim van de provincie.', back: 'De autopiloot draait je zachtjes terug.' },
};

function segInfo(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2));
  const qx = a[0] + dx * t, qy = a[1] + dy * t;
  return { d: Math.hypot(px - qx, py - qy), qx, qy, side: Math.sign(dx * (py - a[1]) - dy * (px - a[0])) };
}

// Signed distance to a line set: > 0 on its outer side (`out`: +1 when the
// outside is to the left of the line's direction, -1 to the right).
export function outsideDist(px, py, lines) {
  let best = null;
  for (const L of lines || []) {
    for (let i = 0; i < L.pts.length - 1; i++) {
      const s = segInfo(px, py, L.pts[i], L.pts[i + 1]);
      if (!best || s.d < best.d) best = { ...s, line: L };
    }
  }
  if (!best) return null;
  const outside = best.side === (best.line.out || 1);
  return { d: outside ? best.d : -best.d, x: best.qx, y: best.qy, line: best.line };
}

// What the edge does at (x, y). ctx: { mode: 'boat' | 'swim' | 'car' | 'bike'
// | 'foot' | 'heli' | 'plane', onDeck, bridgeDist (m to the nearest bridge
// end), heading }. -> null | { action: 'warn' | 'back', edge, text, face }
// where face is the heading back inside.
export function edgeRule(x, y, edge, ctx = {}) {
  if (!edge) return null;
  const mode = ctx.mode || 'foot';
  const face = (q) => Math.atan2(q.y - y, q.x - x);
  if (mode === 'heli' || mode === 'plane') {
    const q = outsideDist(x, y, (edge.coast || []).concat(edge.border || []));
    if (!q) return null;
    const lim = (edge.airM || 3000);
    if (q.d > lim) return { action: 'back', edge: 'lucht', text: EDGE_GAGS.lucht.back, face: face(q) };
    if (q.d > lim - WARN_M * 2) return { action: 'warn', edge: 'lucht', text: EDGE_GAGS.lucht.warn, face: face(q) };
    return null;
  }
  if (mode === 'boat' || mode === 'swim') {
    const sea = outsideDist(x, y, edge.coast);
    if (sea && sea.d > 0) {
      const kind = sea.line.kind || 'wad';
      const lim = sea.line.seaM !== undefined ? sea.line.seaM : edge.seaM || 3000;
      if (sea.d > lim) return { action: 'back', edge: kind, text: EDGE_GAGS[kind].back, face: face(sea) };
      if (sea.d > lim - WARN_M) return { action: 'warn', edge: kind, text: EDGE_GAGS[kind].warn, face: face(sea) };
    }
  }
  const b = outsideDist(x, y, edge.border);
  if (!b || b.d <= 0) return null;
  // the border-bridge rule: on a deck, a ramp or near a bridge end it waits
  if (ctx.onDeck || (ctx.bridgeDist !== undefined && ctx.bridgeDist < BRIDGE_M)) return null;
  const kind = b.line.kind || 'duitsland';
  const buf = b.line.bufferM !== undefined ? b.line.bufferM : 300;
  if (b.d > buf) return { action: 'back', edge: kind, text: EDGE_GAGS[kind].back, face: face(b) };
  if (b.d > buf - WARN_M) return { action: 'warn', edge: kind, text: EDGE_GAGS[kind].warn, face: face(b) };
  return null;
}

// The edge layer out of OSM elements (build_corridor.mjs): coastline ways
// (natural=coastline: land on the left looking along the way; in the world
// frame, y pointing south, that puts the sea on the side outsideDist calls
// +1) and the border lines when a cache has them.
export function edgeFromOsm(els, project) {
  const coast = [], border = [];
  for (const el of els) {
    const t = el.tags || {};
    const g = el.g || (el.geometry ? el.geometry.filter(Boolean).map((p) => [p.lat, p.lon]) : null);
    if (!g || g.length < 2) continue;
    if (t.natural === 'coastline') coast.push({ id: el.id, kind: 'wad', out: 1, pts: g.map(([la, lo]) => project(la, lo)) });
  }
  return { coast, border, seaM: 3000, airM: 3000 };
}
