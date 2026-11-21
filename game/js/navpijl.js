// De pijl aan de rand van de minikaart (#1078): een gevulde pijl is het doel dat je volgt, een holle pijl wacht. In de pijl staat de vorm van het type
// (navdoel.js GLYPH), zodat kleur nooit het enige signaal is. Alleen canvas-aanroepen, geen DOM: scripts/navdoel_test.mjs tekent hem op een nep-canvas.
import { GLYPH } from './navdoel.js';

// De pijl wijst naar +x. De glyph staat in het lichaam van de pijl (ongeveer 11 x 9 px bij s = 1).
function glyphPad(ctx, glyph, s) {
  ctx.beginPath();
  switch (glyph) {
    case 'ster': { // vijfpuntige ster
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 1.0 : 2.5) * s;
        const px = -0.6 * s + Math.cos(a) * r, py = Math.sin(a) * r;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'vlag': // wimpel op een paal
      ctx.moveTo(-1.8 * s, -2.6 * s); ctx.lineTo(1.6 * s, -1.2 * s); ctx.lineTo(-1.8 * s, 0.2 * s); ctx.lineTo(-1.8 * s, 2.8 * s);
      ctx.lineTo(-2.6 * s, 2.8 * s); ctx.lineTo(-2.6 * s, -2.6 * s); ctx.closePath();
      break;
    case 'ruit':
      ctx.moveTo(-0.6 * s, -2.4 * s); ctx.lineTo(1.8 * s, 0); ctx.lineTo(-0.6 * s, 2.4 * s); ctx.lineTo(-3 * s, 0); ctx.closePath();
      break;
    case 'kruis': { // plus
      const a = 0.8 * s, b = 2.4 * s, c = -0.6 * s;
      ctx.moveTo(c - a, -b); ctx.lineTo(c + a, -b); ctx.lineTo(c + a, -a); ctx.lineTo(c + b, -a); ctx.lineTo(c + b, a); ctx.lineTo(c + a, a);
      ctx.lineTo(c + a, b); ctx.lineTo(c - a, b); ctx.lineTo(c - a, a); ctx.lineTo(c - b, a); ctx.lineTo(c - b, -a); ctx.lineTo(c - a, -a);
      ctx.closePath();
      break;
    }
    case 'ring':
      ctx.arc(-0.6 * s, 0, 2 * s, 0, Math.PI * 2); ctx.moveTo(-0.6 * s + 0.9 * s, 0); ctx.arc(-0.6 * s, 0, 0.9 * s, 0, Math.PI * 2, true);
      break;
    case 'auto':
      ctx.rect(-3 * s, -1.4 * s, 5 * s, 2.8 * s);
      break;
    default: // 'punt' en alles onbekends: een stip
      ctx.arc(-0.6 * s, 0, 1.4 * s, 0, Math.PI * 2);
  }
}

// opts: kleur (de pijl), hol (gewacht: omtrek in de kleur, donker vlak), glyph (een sleutel van GLYPH), s (schaal), rand (donkere rand), licht (crème buitenrand van een gevulde pijl), vlak (vlak van een holle pijl)
export function drawNavPijl(ctx, x, y, angle, opts = {}) {
  const { kleur = '#f9c80e', hol = false, glyph = '', s = 1, rand = '#0c140e', licht = '#f0ede4', vlak = 'rgba(12, 20, 14, 0.82)' } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(7 * s, 0);
  ctx.lineTo(-4.2 * s, 4.4 * s);
  ctx.lineTo(-4.2 * s, -4.4 * s);
  ctx.closePath();
  ctx.lineJoin = 'round';
  if (hol) {
    // de donkere rand eerst (leesbaar op elk land), daarna de kleur als lijn en een donker vlak erin
    ctx.lineWidth = 3.6 * s; ctx.strokeStyle = rand; ctx.stroke();
    ctx.fillStyle = vlak; ctx.fill();
    ctx.lineWidth = 1.7 * s; ctx.strokeStyle = kleur; ctx.stroke();
  } else {
    // twee randen: crème buiten (leest op donker land: bos, weiland, park), donker erbinnen (leest op licht land en houdt de vulling los);
    // zo haalt de omtrek op elke achtergrond 3:1 (scripts/minimap_pijlen_check.mjs), ook paars en groen op bos
    ctx.lineWidth = 3.8 * s; ctx.strokeStyle = licht; ctx.stroke();
    ctx.lineWidth = 2 * s; ctx.strokeStyle = rand; ctx.stroke();
    ctx.fillStyle = kleur; ctx.fill();
  }
  if (glyph && GLYPH[glyph]) {
    // de glyph draait met de pijl mee (klein genoeg om in elke stand herkenbaar te blijven)
    glyphPad(ctx, glyph, s);
    ctx.fillStyle = hol ? kleur : rand;
    ctx.fill('evenodd');
  }
  ctx.restore();
}

export const NAV_PIJL_VORMEN = Object.keys(GLYPH);
