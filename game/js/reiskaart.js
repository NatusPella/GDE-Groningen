// Reisopties op de kaart (#97): de dunne laag tussen de wereld en de pure modules
// ovopties.js / ovkaart.js. Bij het kiezen van een bestemming rekent reisOptiesVoor
// de routes per vervoerswijze uit; tekenLijnen tekent de OV-lijnen op het canvas.
import { planTrainTrip, planBoatTrip } from './routing.js';
import { getBusLines } from './vehicle.js';
import { busTrip, reisOpties } from './ovopties.js';
import { travelSeconds } from './reistijd.js';
import { lijnLagen } from './ovkaart.js';
import { INK, inkA } from './mapstyle.js';

// Onder deze afstand is meerijden geen keuze: gewoon lopen of rijden.
const MIN_OV_M = 1500;

const cache = { key: '', opts: null };

export function reisOptiesVoor(world, target) {
  const p = world.player;
  const key = `${Math.round(p.x)}|${Math.round(p.y)}|${Math.round(target.x)}|${Math.round(target.y)}|${world.money | 0}`;
  if (cache.key === key) return cache.opts;
  const a = [p.x, p.y], b = [target.x, target.y];
  const direct = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const routes = {};
  if (direct >= MIN_OV_M) {
    // wegen slingeren: de rijroute is zelden korter dan 1,25 keer hemelsbreed
    routes.auto = { length: direct * 1.25, etaS: travelSeconds(direct * 1.25, 'auto') };
    const guard = (f) => { try { return f(); } catch (e) { return null; } };
    routes.trein = guard(() => planTrainTrip(world.map, a, b, {}));
    routes.bus = guard(() => busTrip(getBusLines(), a, b));
    routes.boot = guard(() => planBoatTrip(world.map, a, b, 'sloep'));
  }
  const opts = reisOpties(routes, { directM: direct * 1.25, money: world.money });
  cache.key = key;
  cache.opts = opts;
  return opts;
}

// Het canvas: lijnen, haltes en overstappen. toScreen(x, y) -> [sx, sy], ICON schaalt haltes.
export function tekenLijnen(ctx, lagen, toScreen, scale = 1) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of lagen.paths) {
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    p.pts.forEach((q, i) => { const [sx, sy] = toScreen(q[0], q[1]); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    ctx.setLineDash(p.dash || []);
    ctx.lineWidth = p.width * scale + 3;
    ctx.strokeStyle = inkA('dark', 0.7);
    ctx.stroke();
    ctx.lineWidth = p.width * scale;
    ctx.strokeStyle = p.color;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const s of lagen.stops) {
    const [sx, sy] = toScreen(s.x, s.y);
    const r = (s.big ? 7 : 5) * scale;
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = s.big ? INK.white : s.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.big ? s.color : INK.white;
    ctx.stroke();
    if (s.alpha === 1 && s.name) {
      ctx.font = `${12 * scale}px Arial, sans-serif`;
      ctx.fillStyle = INK.white;
      ctx.strokeStyle = inkA('black', 0.75);
      ctx.lineWidth = 3;
      ctx.strokeText(s.name, sx + r + 4, sy + 4);
      ctx.fillText(s.name, sx + r + 4, sy + 4);
    }
  }
  ctx.restore();
}

export { lijnLagen };
