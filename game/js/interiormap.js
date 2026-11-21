// The map layer "Betreedbaar" (epic Interieurs, #1150, round 2): the places you can walk into, as a small door badge on the full map.
// The list is the shops, cafes, public buildings, garages and stations of the facilities (the same rows the interiors read, so what
// the map promises is what the door does). A place whose building turned out to be too small is struck off the list as soon as the
// interior of that building was planned (interiors.js calls markNotEnterable). Pure data and one canvas drawing; mapview.js draws it.
import { kindOfFacility, labelOf } from './interiorkinds.js';
import { INK } from './mapstyle.js';

let cache = null, cacheN = -1;
const gone = new Set();
const keyOf = (x, y) => Math.round(x) + ',' + Math.round(y);

export function markNotEnterable(x, y) { gone.add(keyOf(x, y)); cache = null; }
export function resetEnterableMap() { gone.clear(); cache = null; cacheN = -1; }

// rows: FAC.all; returns [{ x, y, kind, sub, name, label }]
export function enterablePlaces(rows) {
  if (cache && cacheN === rows.length) return cache;
  const out = [];
  for (const f of rows || []) {
    if (!Number.isFinite(f.x) || !Number.isFinite(f.y) || gone.has(keyOf(f.x, f.y))) continue;
    const k = kindOfFacility(f);
    if (!k || k.sub === 'bus') continue;
    out.push({ x: f.x, y: f.y, kind: k.kind, sub: k.sub, name: f.name || '', label: labelOf(k.kind, k.sub) });
  }
  cacheN = rows ? rows.length : 0;
  return (cache = out);
}

// a rounded door badge: green fill, cream rim, a door with a knob. s = scale (1 = the 11-unit badge of the map icons)
export function drawDoorBadge(ctx, x, y, s = 1, open = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.roundRect(-5 * s, -5 * s, 10 * s, 10 * s, 2.4 * s);
  ctx.fillStyle = open ? INK.green : INK.locked;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = INK.cream;
  ctx.stroke();
  ctx.fillStyle = INK.cream;
  ctx.fillRect(-2.2 * s, -3.4 * s, 4.4 * s, 6.8 * s);
  ctx.fillStyle = open ? INK.green : INK.locked;
  ctx.fillRect(-1.5 * s, -2.7 * s, 3 * s, 5.4 * s);
  ctx.fillStyle = INK.cream;
  ctx.beginPath();
  ctx.arc(0.8 * s, 0.2 * s, 0.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
