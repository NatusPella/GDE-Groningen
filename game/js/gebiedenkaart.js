// Gebieden veroveren (#414): de kaartlaag "Veroverd" van de grote kaart (mapview.js). Elk gebied waar je aan begonnen
// bent kleurt mee met je voortgang (van oker naar groen); een veroverd gebied krijgt de kleur van zijn vlag, een vlag op
// zijn midden en zijn titel bij het aanwijzen. Alleen canvas; de gegevens komen uit gebiedenlive.js (en gebieden.js).
import * as G from './gebieden.js';
import { getOverzicht } from './gebiedenlive.js';

let laag = null; // { t, lijst }

// De gebieden met kleur, 1 seconde bewaard: [{ gebied, niveau, klaar, totaal, deel, voltooid, kleur, alpha, vlag, titel }].
export function kaartLaag(nu = performance.now()) {
  if (laag && nu - laag.t < 1000) return laag.lijst;
  const o = getOverzicht();
  const lijst = [];
  if (o) {
    for (const n of o.overzicht) {
      for (const r of n.gebieden) {
        const k = G.kaartKleur(r, n.niveau.vlag);
        if (!k) continue;
        lijst.push({ ...r, niveau: n.niveau, kleur: k.kleur, alpha: k.alpha, vlag: n.niveau.vlag, titel: r.voltooid ? G.beloningVan(o.ind, r.gebied.id).titel : null });
      }
    }
  }
  laag = { t: nu, lijst };
  return lijst;
}
export const vernieuwKaartLaag = () => { laag = null; };

// Een vlaggetje: paal, wimpel met donkere rand. (x, y) is de voet van de paal; s de grootte in px.
export function tekenVlag(ctx, x, y, s, kleur) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y - s);
  ctx.strokeStyle = 'rgba(12,20,14,0.95)'; ctx.lineWidth = Math.max(3, s * 0.3); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.85, y - s * 0.72); ctx.lineTo(x, y - s * 0.42); ctx.closePath();
  ctx.fillStyle = kleur; ctx.fill();
  ctx.lineWidth = Math.max(2.4, s * 0.22); ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y - s);
  ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = Math.max(1.4, s * 0.12); ctx.stroke();
  ctx.restore();
}

// Tekent de laag op de statische overlay. toScreen(x, y) -> [sx, sy]; scale: px per meter; hover: de lijst van aanwijsbare
// dingen van mapview.js; label(ctx, tekst, x, y, kleur, uitlijning) tekent een naam met rand.
export function tekenVeroverd(ctx, toScreen, scale, cw, ch, hover, label, kleurTekst = '#f2ead8') {
  const lijst = kaartLaag();
  if (!lijst.length) return;
  ctx.save();
  // eerst de grote vlakken (streken), dan plaatsen, dan wijken: de kleinste liggen bovenop
  const volgorde = { streek: 0, plaats: 1, wijk: 2 };
  const zichtbaar = [];
  for (const r of lijst) {
    const g = r.gebied;
    const [sx, sy] = toScreen(g.x, g.y);
    const px = g.r * scale;
    if (sx < -px || sy < -px || sx > cw + px || sy > ch + px) continue;
    if (r.niveau.id === 'streek' ? px > Math.max(cw, ch) * 1.6 || px < 40 : px < 9) continue;
    zichtbaar.push({ r, sx, sy, px });
  }
  zichtbaar.sort((a, b) => volgorde[a.r.niveau.id] - volgorde[b.r.niveau.id]);
  for (const { r, sx, sy, px } of zichtbaar) {
    const grote = r.niveau.id === 'streek';
    ctx.globalAlpha = r.alpha * (grote ? 0.55 : 1);
    ctx.fillStyle = r.kleur;
    ctx.beginPath(); ctx.arc(sx, sy, px, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = r.voltooid ? 0.85 : 0.5;
    ctx.strokeStyle = r.kleur;
    ctx.lineWidth = r.voltooid ? 3 : 2;
    ctx.setLineDash(r.voltooid ? [] : [7, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle';
  ctx.font = '13px sans-serif';
  for (const { r, sx, sy, px } of zichtbaar) {
    if (px < 14) continue;
    if (r.voltooid) {
      const s = Math.max(14, Math.min(26, px * 0.5));
      tekenVlag(ctx, sx, sy + s * 0.4, s, r.vlag);
      if (px >= 34) label(ctx, r.titel, sx, sy + s * 0.4 + 14, kleurTekst, 'center');
      hover.push({ sx, sy: sy - s * 0.2, name: r.titel, sub: `${r.niveau.enkel[0].toUpperCase()}${r.niveau.enkel.slice(1)} veroverd: alles gedaan (${r.totaal} dingen)` });
    } else if (px >= 22) {
      label(ctx, `${r.klaar}/${r.totaal}`, sx, sy + 15, kleurTekst, 'center');
    }
  }
  ctx.restore();
}
