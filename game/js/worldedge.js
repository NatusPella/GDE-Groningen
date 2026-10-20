// The edge of the world (docs/PROVINCIE-PLAN.md 2.24) for what the
// proefstrook touches: the Wadden coast at Eemshaven and the Eems towards
// Germany. The rules are pure functions over an edge layer (index-corridor
// .json global.edge, scripts/world/build_corridor.mjs: the coastline from
// OSM, the border lines where the data has them); the turn-back scenes
// are edgescene.js. Nothing here runs without that layer.
//
//  - Sea: a boat or a swimmer may go out to `seaM` past the coast; from
//    `seaM - WARN_M` the coast guard radio warns, past it the current and
//    the fog take you back (a turn-back, facing the coast).
//  - Border: past a border line plus its buffer a road or water route turns
//    back with the gag of the land on the other side - but never on a deck,
//    a ramp or within BRIDGE_M of a bridge end: the turn-back waits until
//    after the bridge (the border-bridge rule).
//  - Air: the radio, then the autopilot turns the heli or plane back.

import { worldToWgs } from './rdnew.js';

export const WARN_M = 250;
export const BRIDGE_M = 60;

// Dutch lines per edge (player-facing; no real organisations)
export const EDGE_GAGS = {
  wad: { warn: 'Kustwacht hier: u vaart richting open zee. Keer om, schipper.', back: 'De stroming en de mist duwen je terug naar de kust.' },
  eems: { warn: 'Een boot van de Grenswacht komt naast je varen. "Tot hier, maat."', back: 'De Grenswacht loodst je vriendelijk terug naar het Nederlandse water.' },
  duitsland: { warn: 'Een bord: "Grenswacht. Even stoppen graag."', back: 'De Grenswacht stuurt je terug. "Kom maar terug als je Platt spreekt."' },
  friesland: { warn: 'In de verte: een Friese wegversperring.', back: 'Twee neven van Durk en Douwe sturen je terug. "Hjir net, jong."' },
  schier: { warn: 'De veerboot naar het eiland toetert: u vaart door het vaarwater.', back: 'De veerboot neemt je in het kielzog mee terug. "Eerst een kaartje kopen, schipper."' },
  rottum: { warn: 'Een bord in het water: "Rottum is verboden natuur. Alleen kijken."', back: 'De plaat is van de zeehonden. Een natuurwachter wuift je vriendelijk terug.' },
  drenthe: { warn: 'Er ligt een hunebed op de weg.', back: 'Drenthe is dicht. Probeer het morgen nog eens.' },
  lucht: { warn: 'Radio: u verlaat het luchtruim van de provincie.', back: 'De autopiloot draait je zachtjes terug.' },
  // the land borders over water (a boat or a swimmer where a border line crosses the Wadden Sea or a canal): a road barrier and two
  // cousins on open water were a landmass that is not there (#233); here a boat and buoys
  friesland_water: { warn: 'In de verte ligt een boot dwars op de vaargeul: de Friese grens.', back: 'De Friese vaarwacht loodst je terug naar Grunn. "Hjir net, jong."' },
  drenthe_water: { warn: 'Een boei met een bord: "Vaargeul Drenthe: dicht wegens hunebed."', back: 'Het water houdt hier op. Drenthe is dicht; probeer het morgen nog eens.' },
  duitsland_water: { warn: 'Een boot van de Grenswacht komt naast je varen. "Even stoppen graag."', back: 'De Grenswacht loodst je vriendelijk terug naar het Nederlandse water.' },
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
// where face is the heading back inside, at the nearest point of the edge
// line, d the distance past it and warnAt where the warning starts.
export function edgeRule(x, y, edge, ctx = {}) {
  if (!edge) return null;
  const mode = ctx.mode || 'foot';
  const face = (q) => Math.atan2(q.y - y, q.x - x);
  if (mode === 'heli' || mode === 'plane') {
    const q = outsideDist(x, y, (edge.coast || []).concat(edge.border || []));
    if (!q) return null;
    const lim = (edge.airM || 3000);
    if (q.d > lim) return { action: 'back', edge: 'lucht', text: EDGE_GAGS.lucht.back, face: face(q), at: { x: q.x, y: q.y }, d: q.d, warnAt: lim - WARN_M * 2 };
    if (q.d > lim - WARN_M * 2) return { action: 'warn', edge: 'lucht', text: EDGE_GAGS.lucht.warn, face: face(q), at: { x: q.x, y: q.y }, d: q.d, warnAt: lim - WARN_M * 2 };
    return null;
  }
  if (mode === 'boat' || mode === 'swim') {
    const sea = outsideDist(x, y, edge.coast);
    if (sea && sea.d > 0) {
      const kind = sea.line.kind || 'wad';
      const lim = sea.line.seaM !== undefined ? sea.line.seaM : edge.seaM || 3000;
      if (sea.d > lim) return { action: 'back', edge: kind, text: (EDGE_GAGS[kind] || EDGE_GAGS.duitsland).back, face: face(sea), at: { x: sea.x, y: sea.y }, d: sea.d, warnAt: lim - WARN_M };
      if (sea.d > lim - WARN_M) return { action: 'warn', edge: kind, text: (EDGE_GAGS[kind] || EDGE_GAGS.duitsland).warn, face: face(sea), at: { x: sea.x, y: sea.y }, d: sea.d, warnAt: lim - WARN_M };
    }
  }
  const b = outsideDist(x, y, edge.border);
  if (!b || b.d <= 0) return null;
  // the border-bridge rule: on a deck, a ramp or near a bridge end it waits
  if (ctx.onDeck || (ctx.bridgeDist !== undefined && ctx.bridgeDist < BRIDGE_M)) return null;
  const land = b.line.kind || 'duitsland';
  // on the water the gag of the land beyond is a boat and buoys, not a road barrier on the sea
  const kind = (mode === 'boat' || mode === 'swim') && EDGE_GAGS[land + '_water'] ? land + '_water' : land;
  const buf = b.line.bufferM !== undefined ? b.line.bufferM : 300;
  if (b.d > buf) return { action: 'back', edge: kind, text: (EDGE_GAGS[kind] || EDGE_GAGS.duitsland).back, face: face(b), at: { x: b.x, y: b.y }, d: b.d, warnAt: buf - WARN_M };
  if (b.d > buf - WARN_M) return { action: 'warn', edge: kind, text: (EDGE_GAGS[kind] || EDGE_GAGS.duitsland).warn, face: face(b), at: { x: b.x, y: b.y }, d: b.d, warnAt: buf - WARN_M };
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

// The coast chains of the OSM extract all come out as 'wad'; the ones along the
// Eems and the Dollard (from Delfzijl east and south, lon >= 6.88 and lat <= 53.42)
// are the Eems towards Germany: the Grenswacht boat, not the open sea. Returns a
// copy of the edge layer; a chain that already has another kind keeps it.
export const EEMS_LON = 6.88;
export const EEMS_LAT = 53.42;
// Rottumeroog and Rottumerplaat are forbidden nature; at Schiermonnikoog the
// ferry sails. [lat0, lat1, lon0, lon1] around the centre of a coast chain.
export const ROTTUM_BOX = [53.49, 53.62, 6.40, 6.70];
export const SCHIER_BOX = [53.44, 53.52, 6.05, 6.34];
const inBox = (la, lo, b) => la >= b[0] && la <= b[1] && lo >= b[2] && lo <= b[3];
export function coastKinds(edge) {
  if (!edge || !edge.coast) return edge || null;
  const coast = edge.coast.map((L) => {
    if (L.kind && L.kind !== 'wad') return L;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of L.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const [la, lo] = worldToWgs((x0 + x1) / 2, (y0 + y1) / 2);
    if (lo >= EEMS_LON && la <= EEMS_LAT) return { ...L, kind: 'eems' };
    if (inBox(la, lo, ROTTUM_BOX)) return { ...L, kind: 'rottum' };
    if (inBox(la, lo, SCHIER_BOX)) return { ...L, kind: 'schier' };
    return L;
  });
  return { ...edge, coast };
}

// The border lines come with one buffer (2500 m) but the extract has land data
// only where the neighbours' strips were built: east of the Dollard and over the
// Drentse and Friese border it often stops after a few hundred metres, and a
// turn-back scene in front of a void is no scene. This cuts every border line into
// pieces of about `pieceM` and gives each piece the buffer the data supports: the
// reach of the tiles on the outside, less `marginM` so the props stand on land,
// between `minM` and the line's own buffer. tileHas(x, y) -> bool (a data tile).
export function borderByData(edge, tileHas, { pieceM = 1000, probeM = 100, marginM = 300, minM = 200 } = {}) {
  if (!edge || !edge.border || !tileHas) return edge || null;
  const border = [];
  for (const L of edge.border) {
    const cap = L.bufferM !== undefined ? L.bufferM : 300;
    const out = L.out === -1 ? -1 : 1;
    let piece = [L.pts[0]], len = 0;
    const flush = () => {
      if (piece.length < 2) return;
      const a = piece[0], b = piece[piece.length - 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = out * -dy / l, ny = out * dx / l; // to the outside
      const at = (d) => [0, 0.25, 0.5, 0.75, 1].every((f) => tileHas(a[0] + dx * f + nx * d, a[1] + dy * f + ny * d));
      let reach = 0;
      while (reach < cap && at(reach + probeM)) reach += probeM;
      border.push({ ...L, bufferM: Math.max(minM, Math.min(cap, reach - marginM)), pts: piece });
    };
    for (let i = 1; i < L.pts.length; i++) {
      const p = L.pts[i];
      len += Math.hypot(p[0] - L.pts[i - 1][0], p[1] - L.pts[i - 1][1]);
      piece.push(p);
      if (len >= pieceM) { flush(); piece = [p]; len = 0; }
    }
    flush();
  }
  return { ...edge, border };
}
