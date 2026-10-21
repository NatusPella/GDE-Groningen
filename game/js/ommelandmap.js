import { getVillageMapSpots } from './dorpsuitjes.js';
import { getFoundWorldEnds } from './worldends.js';
import { INK } from './mapstyle.js';

// The Ommeland's own places on the full map and the minimap (layer
// 'ommeland'): the dorpsuitjes of every village the player has been near
// (its station's things to do, a tick once done) and the wereldeinden
// already found. The villages and stations have their own labels and
// icons; the villages' eierballen come up like the city's, as tips from the
// Buukenkaas (furniture.js).
export function ommelandMapSpots() {
  const out = [];
  for (const s of getVillageMapSpots()) out.push({ kind: s.done ? 'dorpKlaar' : 'dorp', x: s.x, y: s.y, name: s.name, sub: s.sub });
  for (const s of getFoundWorldEnds()) out.push({ kind: 'wereldeinde', x: s.x, y: s.y, name: s.name, sub: s.sub });
  return out;
}

// The map icons: a pennant on a green disc for an uitje (ticked once done),
// a ringed dark disc with a cream rim for a wereldeinde.
export function drawOmmelandMapIcon(ctx, kind, s) {
  if (kind === 'wereldeinde') {
    ctx.beginPath();
    ctx.arc(0, 0, 4.8 * s, 0, Math.PI * 2);
    ctx.fillStyle = INK.worldEnd;
    ctx.fill();
    ctx.lineWidth = 1.2 * s;
    ctx.strokeStyle = INK.dark;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2.9 * s, Math.PI * 0.15, Math.PI * 1.85);
    ctx.lineWidth = 1.1 * s;
    ctx.strokeStyle = INK.cream;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1.2 * s, 0);
    ctx.lineTo(4.2 * s, 0);
    ctx.stroke();
    return true;
  }
  if (kind !== 'dorp' && kind !== 'dorpKlaar') return false;
  ctx.beginPath();
  ctx.arc(0, 0, 4.8 * s, 0, Math.PI * 2);
  ctx.fillStyle = kind === 'dorpKlaar' ? INK.greenDark : INK.green;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = INK.dark;
  ctx.stroke();
  ctx.strokeStyle = INK.cream;
  ctx.fillStyle = INK.yellow;
  ctx.lineWidth = 0.9 * s;
  if (kind === 'dorpKlaar') {
    ctx.beginPath();
    ctx.moveTo(-2.2 * s, 0.2 * s);
    ctx.lineTo(-0.6 * s, 1.8 * s);
    ctx.lineTo(2.4 * s, -1.6 * s);
    ctx.lineWidth = 1.3 * s;
    ctx.stroke();
    return true;
  }
  ctx.beginPath();
  ctx.moveTo(-1.6 * s, 3 * s);
  ctx.lineTo(-1.6 * s, -3 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-1.6 * s, -3 * s);
  ctx.lineTo(2.6 * s, -1.8 * s);
  ctx.lineTo(-1.6 * s, -0.6 * s);
  ctx.closePath();
  ctx.fill();
  return true;
}
