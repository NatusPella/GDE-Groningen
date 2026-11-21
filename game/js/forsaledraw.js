// Het tekenen van de kaartlaag Te koop (epic #1095, #1098): canvas-kant van forsalemap.js. Alleen tekenen, geen rekenwerk en geen staat
// (scripts/forsalemap_test.mjs dekt de stub). mapview.js roept drawForSale aan met wat forSaleView (bezitlive.js) teruggeeft.
// Kleurtaal en patronen: forsalemap.js STATES (DS3; geen geel). Een prijskaartje alleen als het vlak groot genoeg is om te lezen.

import { STATES } from './forsalemap.js';
import { INK, inkA } from './mapstyle.js';
import { euro } from './geldtekst.js';

const LABEL_MIN_PX = 46;            // zo breed moet het vlak op het scherm zijn voor een prijskaartje
const STEP_ALPHA = [0.12, 0.18, 0.25, 0.33];

const inkOf = (st, shape) => (st === 'claimed' && shape.claim && shape.claim.color ? shape.claim.color : null);

// view = { mode, shapes, clusters }; toScreen(x, y) -> [sx, sy]; hoverId = het vlak onder de muis; selectedId = het open kaartje.
export function drawForSale(ctx, view, toScreen, zoomScale, hoverId = null, selectedId = null) {
  if (!view || view.mode === 'none') return;
  if (view.mode === 'clusters') { for (const c of view.clusters) drawCluster(ctx, c, toScreen); return; }
  const z = Math.min(2, Math.max(1, zoomScale || 1));
  for (const s of view.shapes) {
    const st = STATES[s.state];
    const hot = hoverId === s.id || selectedId === s.id;
    ctx.save();
    ctx.beginPath();
    s.punten.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    ctx.closePath();
    const own = inkOf(s.state, s);
    const alpha = s.state === 'forSale' ? STEP_ALPHA[s.step] || st.alpha : st.alpha;
    ctx.fillStyle = own ? own : inkA(st.ink, hot ? alpha + 0.14 : alpha);
    if (own) ctx.globalAlpha = hot ? 0.4 : 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = (hot ? 3.2 : 2) * z;
    ctx.strokeStyle = own || inkA(st.ink, hot ? 1 : 0.9);
    ctx.setLineDash(st.dash.map((d) => d * z));
    ctx.stroke();
    ctx.setLineDash([]);
    // een tweede lijn binnenin voor "niet te koop" (slot) en "medespeler" (dubbele lijn): een vorm naast de kleur
    if (s.state === 'locked' || s.state === 'claimed') {
      ctx.lineWidth = 1 * z; ctx.strokeStyle = own || inkA(st.ink, 0.5);
      const [a, , c] = s.punten.map(([x, y]) => toScreen(x, y));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    const [p0, p1, p2] = s.punten.map(([x, y]) => toScreen(x, y));
    const w = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (w >= LABEL_MIN_PX || hot) drawTag(ctx, (p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, s, st, own);
    ctx.restore();
  }
}

// Het kaartje op het vlak: prijs bij te koop, "Van jou", de naam van de medespeler, of een slotje. Tekst in DS3-inkt op een donkere plaat.
function drawTag(ctx, x, y, s, st, own) {
  const text = s.state === 'forSale' ? euro(s.price) : s.state === 'own' ? 'Van jou' : s.state === 'claimed' ? String((s.claim && s.claim.name) || 'Medespeler').slice(0, 14) : 'Slot';
  ctx.font = '600 11px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = INK.dark; ctx.globalAlpha = 0.82;
  ctx.fillRect(x - w / 2, y - 9, w, 18);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = own || inkA(st.ink, 0.9); ctx.lineWidth = 1.2; ctx.setLineDash([]);
  ctx.strokeRect(x - w / 2, y - 9, w, 18);
  ctx.fillStyle = INK.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}

// Uitgezoomd: een schijf met het aantal te koop en, als je al percelen hebt, een groene rand.
function drawCluster(ctx, c, toScreen) {
  const [sx, sy] = toScreen(c.x, c.y);
  const r = 11 + Math.min(10, Math.log2(1 + c.n) * 2);
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = INK.dark; ctx.globalAlpha = 0.78; ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 2; ctx.setLineDash(c.own ? [] : STATES.forSale.dash);
  ctx.strokeStyle = c.own ? INK.greenLight : INK.policeBlue; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = INK.cream; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(c.forSale || c.own), sx, sy + 0.5);
  ctx.restore();
}
