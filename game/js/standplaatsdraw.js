// Het tekenen van de kaartlaag Standplaatsen (Snackimperium, epic #1095, #1102): canvas-kant van standplaatsmap.js. Alleen tekenen, geen rekenwerk en geen staat.
// mapview.js roept drawStandplaatsen aan met wat standplaatsView teruggeeft. Kleurtaal en vormen: standplaatsmap.js STATES (DS3; geen geel).

import { STATES } from './standplaatsmap.js';
import { INK, inkA } from './mapstyle.js';

const R = 9;

function shape(ctx, kind, x, y, r) {
  ctx.beginPath();
  if (kind === 'diamond') { ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y); ctx.lineTo(x, y + r + 1); ctx.lineTo(x - r - 1, y); ctx.closePath(); }
  else if (kind === 'square') ctx.rect(x - r, y - r, r * 2, r * 2);
  else ctx.arc(x, y, r, 0, Math.PI * 2);
}

// view = { mode, markers }; toScreen(x, y) -> [sx, sy]; zoomScale: de kaartzoom (1 tot 2); hoverId en selectedId: het punt onder de muis en het open kaartje.
export function drawStandplaatsen(ctx, view, toScreen, zoomScale = 1, hoverId = null, selectedId = null) {
  if (!view || view.mode !== 'markers') return;
  const z = Math.min(2, Math.max(1, zoomScale || 1));
  for (const m of view.markers) {
    const st = STATES[m.state] || STATES.vrij, [sx, sy] = toScreen(m.x, m.y), hot = hoverId === m.id || selectedId === m.id;
    const ink = m.color || INK[st.ink] || INK.policeBlue;
    ctx.save();
    shape(ctx, st.shape, sx, sy, (hot ? R + 2 : R) * z);
    ctx.fillStyle = m.state === 'jij' ? inkA(st.ink, 0.9) : INK.dark; ctx.globalAlpha = m.state === 'jij' ? 1 : 0.82; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = (hot ? 3 : 2) * z; ctx.strokeStyle = ink; ctx.setLineDash(st.dash.map((d) => d * z)); ctx.stroke(); ctx.setLineDash([]);
    if (m.wagon) { ctx.fillStyle = INK.cream; ctx.font = `700 ${Math.round(10 * z)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('W', sx, sy + 0.5); }   // een wagen staat er
    if (m.showLabel || hot) drawTag(ctx, sx, sy + (R + 12) * z, m, ink);
    ctx.restore();
  }
}

// Het kaartje onder het punt: de naam en de prijs of stand, in DS3-inkt op een donkere plaat.
function drawTag(ctx, x, y, m, ink) {
  ctx.font = '600 11px system-ui, sans-serif';
  const a = String(m.label), b = String(m.sub), w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width) + 12;
  ctx.fillStyle = INK.dark; ctx.globalAlpha = 0.84; ctx.fillRect(x - w / 2, y - 14, w, 28); ctx.globalAlpha = 1;
  ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.strokeRect(x - w / 2, y - 14, w, 28);
  ctx.fillStyle = INK.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(a, x, y - 5); ctx.fillStyle = ink; ctx.fillText(b, x, y + 7);
}
