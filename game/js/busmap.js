// De live bussen op de kaart (#922): de echte busposities zijn de USP, dus ze
// staan met hun dienst en lijn op de minikaart en de grote kaart, met een eigen
// icoon en label. Alleen bussen met een liveId horen hier; een gekaapte of
// losgeraakte bus is een gewone spelbus en verdwijnt uit deze laag.
// Puur: leest de bron uit buspop.js en tekent met canvas, geen THREE en geen DOM.
import { getLiveBussen } from './vehicle/buspop.js';
import { getSettings } from './settings.js';
import { bronStand, busLabel, SOORT } from './busbron.js';

export const LIVE_BUS_ZOOM = 40; // m: dichterbij dan dit staat de bus vol in beeld

// De stand van de bron nu (Live, Rooster of uit), uit de bron zelf en de instelling. Elke fout geeft Rooster, nooit een uitzondering.
export function busBronNu(nu = Date.now()) {
  const bron = getLiveBussen();
  let instelling = true;
  try { instelling = getSettings().liveBussen !== false; } catch (e) { /* standaard aan */ }
  let stand = null;
  try { stand = bron && typeof bron.stand === 'function' ? bron.stand() : null; } catch (e) { stand = null; }
  // een bron zonder stand() (een test of een oudere bron) telt als live zolang hij bussen levert
  if (bron && !stand) stand = { aan: true, laatsteOk: nu, aantal: 1 };
  return bronStand({ instelling, stand, nu });
}

// De live bussen in de buurt van de speler, als markers voor de kaarten: lijn, richting en hoe oud de positie is.
// { x, y, angle, line, ref, label, sub, soort: 'live' }
export function liveBusMarks(player, max = 4, reach = 900) {
  const bron = getLiveBussen();
  if (!bron || !player) return [];
  let list = [];
  try { list = bron.kandidaten(player.x, player.y, 0, reach, max) || []; } catch (e) { return []; }
  const st = busBronNu();
  return list.map((b) => {
    const line = b.line || {};
    const t = busLabel(line, b.dir, SOORT.live, st.soort === SOORT.live ? st.leeftijdS : null);
    return { x: b.x, y: b.y, angle: b.angle, line: t.label, ref: line.ref || '', label: t.label, sub: t.sub, soort: SOORT.live };
  });
}

// De terugval, duidelijk gemarkeerd: alleen als er GEEN live gegevens zijn (uit, niet bereikbaar, te oud of geen bussen) tonen we de bussen van het spel zelf als
// 'Rooster'. Met live gegevens staan er op de kaart alleen echte bussen, geen verzonnen erbij (#922). Een bus die de speler bestuurt hoort er niet bij.
export function roosterBusMarks(world, max = 3, reach = 700) {
  if (!world || !world.vehicles) return [];
  if (busBronNu().soort === SOORT.live) return [];
  const p = world.player || {};
  const uit = [];
  for (const v of world.vehicles) {
    if (!v.isBus || !v.busRun || v.wrecked || v.driver === 'player' || v.liveId != null) continue;
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d > reach) continue;
    const line = v.busRun.line || {};
    const t = busLabel(line, v.busRun.dir, SOORT.rooster);
    uit.push({ d, x: v.x, y: v.y, angle: v.angle, line: t.label, ref: line.ref || '', label: t.label, sub: t.sub, soort: SOORT.rooster });
  }
  return uit.sort((a, b) => a.d - b.d).slice(0, max);
}

// Het icoon: een groene bus met een cream raamband en een rode live-stip.
// Zelfde maat als de andere kaarticonen (ongeveer 10 eenheden breed).
// rooster: dezelfde bus, zonder rode live-stip en met een klokje (de bus rijdt de dienstregeling, geen echte positie)
export function drawLiveBusMapIcon(ctx, s, t = 0, rooster = false) {
  ctx.save();
  ctx.lineJoin = 'round';
  // de bak
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-5 * s, -4.4 * s, 10 * s, 8.8 * s, 2.2 * s) : ctx.rect(-5 * s, -4.4 * s, 10 * s, 8.8 * s);
  ctx.fillStyle = rooster ? '#6b8f7b' : '#1e9e56';
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
  if (rooster) {
    ctx.beginPath(); ctx.arc(4.4 * s, -4.4 * s, 2.1 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#f0ede4'; ctx.fill(); ctx.lineWidth = Math.max(0.8, 0.7 * s); ctx.strokeStyle = '#0c140e'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4.4 * s, -5.6 * s); ctx.lineTo(4.4 * s, -4.4 * s); ctx.lineTo(5.3 * s, -3.9 * s); ctx.stroke();
    ctx.restore();
    return;
  }
  // live-stip, rustig knipperend zodat hij opvalt zonder te schreeuwen
  const aan = 0.65 + 0.35 * Math.sin((Number.isFinite(t) ? t : 0) * 2.6);
  ctx.globalAlpha = aan;
  ctx.beginPath(); ctx.arc(4.6 * s, -4.6 * s, 1.9 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#d93f3f';
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
