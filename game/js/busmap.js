// De live bussen op de kaart (#922): de echte busposities zijn de USP, dus ze
// staan met hun dienst en lijn op de minikaart en de grote kaart, met een eigen
// icoon en label. Alleen bussen met een liveId horen hier; een gekaapte of
// losgeraakte bus is een gewone spelbus en verdwijnt uit deze laag.
// Puur: leest de bron uit buspop.js en tekent met canvas, geen THREE en geen DOM.
import { getLiveBussen } from './vehicle/buspop.js';

export const LIVE_BUS_ZOOM = 40; // m: dichterbij dan dit staat de bus vol in beeld

// De live bussen in de buurt van de speler, als markers voor de kaarten.
// { x, y, angle, line, ref, label, sub }
export function liveBusMarks(player, max = 4, reach = 900) {
  const bron = getLiveBussen();
  if (!bron || !player) return [];
  let list = [];
  try { list = bron.kandidaten(player.x, player.y, 0, reach, max) || []; } catch (e) { return []; }
  return list.map((b) => {
    const line = b.line || {};
    const naam = line.name || 'Bus';
    return {
      x: b.x, y: b.y, angle: b.angle,
      line: naam, ref: line.ref || '', label: naam,
      sub: `${line.ref ? `Lijn ${line.ref} · ` : ''}Live bus`,
    };
  });
}

// Het icoon: een groene bus met een cream raamband en een rode live-stip.
// Zelfde maat als de andere kaarticonen (ongeveer 10 eenheden breed).
export function drawLiveBusMapIcon(ctx, s, t = 0) {
  ctx.save();
  ctx.lineJoin = 'round';
  // de bak
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-5 * s, -4.4 * s, 10 * s, 8.8 * s, 2.2 * s) : ctx.rect(-5 * s, -4.4 * s, 10 * s, 8.8 * s);
  ctx.fillStyle = '#1e9e56';
  ctx.fill();
  ctx.lineWidth = Math.max(1, 1.1 * s);
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  // ramen
  ctx.fillStyle = '#f0ede4';
  for (let i = 0; i < 3; i++) ctx.fillRect((-3.4 + i * 2.6) * s, -2.8 * s, 1.7 * s, 2.4 * s);
  // wielen
  ctx.fillStyle = '#1b1d22';
  ctx.beginPath(); ctx.arc(-2.6 * s, 4.6 * s, 1.2 * s, 0, Math.PI * 2); ctx.arc(2.6 * s, 4.6 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
  // live-stip, rustig knipperend zodat hij opvalt zonder te schreeuwen
  const aan = 0.65 + 0.35 * Math.sin((Number.isFinite(t) ? t : 0) * 2.6);
  ctx.globalAlpha = aan;
  ctx.beginPath(); ctx.arc(4.6 * s, -4.6 * s, 1.9 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#d93f3f';
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
