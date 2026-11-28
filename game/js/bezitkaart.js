// De kaartminiatuur van Land en bedrijf: een kleine SVG met de omtrek van je percelen, de kleur van de stand en een letter erbij (kleur is nooit het enige).
// Puur: strings. Vormen komen van parcelindex.shapeOf (punten in wereldmeters); zonder vorm een vierkantje (de schets) op de plek van het perceel.
// De standen en hun taal komen van farmstatus.js (braak, stoppel, geploegd, zaailing, groeiend, bijna, rijp). Samen spelen: alleen eigen percelen.
// Alle kleuren staan in de CSS (ds-bezit.css, klassen bzk-*) en komen uit de ds-tokens; hier staat geen hex.

import { escapeHtml as esc } from './htmlescape.js';

// stand -> vulling (een patroon of een inkt) en letter
export const STAND_KAART = {
  braak: { vul: 'raster', letter: 'B' }, stoppel: { vul: 'raster', letter: 'S' }, geploegd: { vul: 'papier', letter: 'P' },
  zaailing: { vul: 'geel', letter: 'Z' }, groeiend: { vul: 'geel', letter: 'G' }, bijna: { vul: 'geel', letter: 'G' }, rijp: { vul: 'bord', letter: 'O' },
};
export const standKaart = (statusId, level) => (statusId === 'aanbod' ? { vul: 'geel', letter: '' } : statusId === 'eigen' ? { vul: 'papier', letter: '' } : level === 'leased' ? { vul: 'papier', letter: 'V', streep: true } : STAND_KAART[statusId] || STAND_KAART.braak);

// vlakken: [{ id, shape: [[x,y],...] | null, x, y, statusId, level, naam }]; w en h in px van het vak.
export function kaartSvg(vlakken, { w = 250, h = 150, sel = null, label = 'Kaart van je velden' } = {}) {
  const lijst = (vlakken || []).filter((v) => v && (Array.isArray(v.shape) ? v.shape.length >= 3 : Number.isFinite(v.x) && Number.isFinite(v.y)));
  const defs = '<defs><pattern id="bzk-raster" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" class="bzk-papier"/><circle cx="3" cy="3" r="1.15" class="bzk-inkt"/></pattern></defs>';
  if (!lijst.length) return `<svg class="bz-kaartvlak" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${defs}<rect width="${w}" height="${h}" class="bzk-grond"/></svg>`; // ds3-uitzondering: de kaart is een tekening van percelen (data), geen icoon
  const SCHETS = 120;   // meter: de zijde van een perceel zonder vorm
  const polys = lijst.map((v) => (Array.isArray(v.shape) && v.shape.length >= 3 ? v.shape : [[v.x - SCHETS / 2, v.y - SCHETS / 2], [v.x + SCHETS / 2, v.y - SCHETS / 2], [v.x + SCHETS / 2, v.y + SCHETS / 2], [v.x - SCHETS / 2, v.y + SCHETS / 2]]));
  const xs = polys.flat().map((p) => p[0]), ys = polys.flat().map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = 14, s = Math.min((w - 2 * pad) / Math.max(1, x1 - x0), (h - 2 * pad) / Math.max(1, y1 - y0));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const px = (p) => `${(ox + (p[0] - x0) * s).toFixed(1)},${(oy + (y1 - p[1]) * s).toFixed(1)}`;   // wereld-y wijst naar het noorden: omkeren
  const body = lijst.map((v, i) => {
    const k0 = standKaart(v.statusId, v.level), k = v.letter !== undefined ? { ...k0, letter: v.letter } : k0, gekozen = v.id === sel;
    const pts = polys[i].map(px).join(' ');
    const mid = polys[i].reduce((a, p) => [a[0] + p[0] / polys[i].length, a[1] + p[1] / polys[i].length], [0, 0]);
    const [cx, cy] = px(mid).split(',').map(Number);
    return `<g data-veld="${esc(v.id)}"><title>${esc(v.naam || '')}</title><polygon points="${pts}" class="bzk-vlak bzk-${k.vul}${k.streep ? ' bzk-streep' : ''}${gekozen ? ' bzk-sel' : ''}"/>` +
      (k.letter ? `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})"><rect x="-10" y="-10" width="20" height="20" rx="3" class="bzk-letterplaat"/><text y="5" text-anchor="middle" class="bzk-letter">${k.letter}</text></g>` : '') + '</g>';
  }).join('');
  return `<svg class="bz-kaartvlak" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${defs}<rect width="${w}" height="${h}" class="bzk-grond"/>${body}</svg>`; // ds3-uitzondering: de kaart is een tekening van percelen (data), geen icoon
}

export const LEGENDA = [['raster', 'Braak'], ['geel', 'Groeit'], ['bord', 'Oogstklaar'], ['streep', 'Verpacht']];
export const legendaHtml = () => `<div class="bz-legenda">${LEGENDA.map(([k, t]) => `<span><i class="bzk-i-${k}"></i>${t}</span>`).join('')}</div>`;
