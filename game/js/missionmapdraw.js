// Canvas drawing of a mission layer (missionmap.js) for the full map and the
// minimap: the 'mm-' icon glyphs (drawn inside the disc that drawMapIconHalo
// puts under them, rim in the category colour), the lines and the areas.
// Colours of the areas follow the police and mission colours of the maps.
import { INK, ICON_RIM, inkA } from './mapstyle.js';

const AREA_COLORS = {
  danger: { fill: inkA('red', 0.16), edge: ICON_RIM.gevaar },
  police: { fill: inkA('policeBlue', 0.18), edge: ICON_RIM.politiebureau },
  safe: { fill: inkA('greenLight', 0.16), edge: INK.greenLight },
  mission: { fill: inkA('missionArea', 0.12), edge: ICON_RIM.halte },
};
const LINE_COLORS = { route: INK.routeLine, ideal: ICON_RIM.halte, crow: INK.cream, track: inkA('cream', 0.55) };

// glyph of an 'mm-' kind at (0, 0), s as the other map icons
export function drawMissionLayerIcon(ctx, kind, s) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK.cream;
  ctx.fillStyle = INK.cream;
  ctx.lineWidth = Math.max(1.1, 0.9 * s);
  ctx.beginPath();
  switch (kind) {
    case 'mm-gevaar': // warning triangle
      ctx.moveTo(0, -3.8 * s); ctx.lineTo(3.6 * s, 2.8 * s); ctx.lineTo(-3.6 * s, 2.8 * s); ctx.closePath();
      ctx.fillStyle = ICON_RIM.gevaar; ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK.dark; ctx.fillRect(-0.45 * s, -1.6 * s, 0.9 * s, 2.5 * s); ctx.fillRect(-0.45 * s, 1.3 * s, 0.9 * s, 0.8 * s);
      return;
    case 'mm-rival': // a kart seen from above: body, four wheels, a nose
      ctx.roundRect(-2.2 * s, -1.3 * s, 4.4 * s, 2.6 * s, 1 * s);
      ctx.fillStyle = ICON_RIM.rival; ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK.cream;
      for (const [wx, wy] of [[-1.7, -1.9], [1.1, -1.9], [-1.7, 1.2], [1.1, 1.2]]) ctx.fillRect(wx * s, wy * s, 1.1 * s, 0.7 * s);
      return;
    case 'mm-halte': // a stop: a ring with a dot
      ctx.arc(0, 0, 3.2 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      return;
    case 'mm-ring': // a ring to fly through
      ctx.arc(0, 0, 3.4 * s, 0, Math.PI * 2); ctx.lineWidth = Math.max(1.6, 1.4 * s); ctx.strokeStyle = INK.ringNext; ctx.stroke();
      return;
    case 'mm-pad': // the H of the landing spot
      ctx.moveTo(-2.4 * s, -3 * s); ctx.lineTo(-2.4 * s, 3 * s); ctx.moveTo(2.4 * s, -3 * s); ctx.lineTo(2.4 * s, 3 * s); ctx.moveTo(-2.4 * s, 0); ctx.lineTo(2.4 * s, 0);
      ctx.lineWidth = Math.max(1.6, 1.3 * s); ctx.stroke();
      return;
    case 'mm-brug': // a bridge: the deck on two piers with the arch under it (an arch alone reads as a bump)
      ctx.lineWidth = Math.max(1.4, 1.2 * s);
      ctx.moveTo(-3.8 * s, -1.4 * s); ctx.lineTo(3.8 * s, -1.4 * s);
      ctx.moveTo(-3.4 * s, 3.2 * s); ctx.lineTo(-3.4 * s, -1.4 * s);
      ctx.moveTo(3.4 * s, 3.2 * s); ctx.lineTo(3.4 * s, -1.4 * s);
      ctx.moveTo(-3.4 * s, 3.2 * s); ctx.quadraticCurveTo(0, -5.8 * s, 3.4 * s, 3.2 * s);
      ctx.stroke();
      return;
    case 'mm-subdoel': // an optional goal: a diamond
      ctx.moveTo(0, -3.4 * s); ctx.lineTo(3 * s, 0); ctx.lineTo(0, 3.4 * s); ctx.lineTo(-3 * s, 0); ctx.closePath();
      ctx.fillStyle = ICON_RIM.subdoel; ctx.fill(); ctx.stroke();
      return;
    default: // mm-hulp and anything unknown: a plus
      ctx.moveTo(-2.6 * s, 0); ctx.lineTo(2.6 * s, 0); ctx.moveTo(0, -2.6 * s); ctx.lineTo(0, 2.6 * s);
      ctx.lineWidth = Math.max(1.6, 1.4 * s); ctx.stroke();
  }
}

// discs of the layer; toScreen(x, y) -> [sx, sy], scale in px a metre
export function drawLayerAreas(ctx, layer, toScreen, scale, t = 0) {
  if (!layer) return;
  for (const a of layer.areas) {
    if (a.drawn) continue; // the maps draw it themselves (the police search ring)
    const c = AREA_COLORS[a.color] || AREA_COLORS.danger;
    const [sx, sy] = toScreen(a.x, a.y);
    const r = a.r * scale;
    if (!(r > 1)) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.setLineDash(a.color === 'safe' ? [] : [8, 6]);
    ctx.lineDashOffset = -t * 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.edge;
    ctx.stroke();
    ctx.restore();
  }
}

// lines of the layer: the track and ideal line under the route; `width` in px
export function drawLayerLines(ctx, layer, toScreen, width = 3) {
  if (!layer) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const order = { track: 0, route: 1, crow: 1, ideal: 2 };
  for (const l of [...layer.lines].sort((a, b) => order[a.style] - order[b.style])) {
    ctx.beginPath();
    l.pts.forEach((p, i) => { const [sx, sy] = toScreen(p.x, p.y); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    if (l.style === 'track') { ctx.setLineDash([]); ctx.lineWidth = width * 2.2; ctx.strokeStyle = inkA('dark', 0.7); ctx.stroke(); ctx.lineWidth = width * 1.4; ctx.strokeStyle = LINE_COLORS.track; ctx.stroke(); continue; }
    ctx.setLineDash(l.style === 'crow' ? [7, 6] : l.style === 'ideal' ? [3, 5] : []);
    ctx.lineWidth = width + 2;
    ctx.strokeStyle = inkA('dark', 0.75);
    ctx.stroke();
    ctx.lineWidth = l.style === 'ideal' ? Math.max(1.5, width * 0.6) : width;
    ctx.strokeStyle = LINE_COLORS[l.style] || LINE_COLORS.route;
    ctx.stroke();
  }
  ctx.restore();
}

// the one-line caption under the minimap / on the map: "420 m · noordoosten · ± 2 min"
export function layerCaption(layer) {
  const i = layer && layer.info;
  if (!i) return '';
  const parts = [];
  if (i.lap != null && i.laps) parts.push(`Ronde ${Math.min(i.lap + 1, i.laps)}/${i.laps}`);
  if (i.distanceLabel) parts.push(`${i.distanceLabel} ${i.compass ? 'richting ' + i.compass : ''}`.trim());
  if (i.etaLabel) parts.push(i.etaLabel);
  if (i.stars) parts.push(`${i.stars} ster${i.stars === 1 ? '' : 'ren'}`);
  return parts.join(' · ');
}
