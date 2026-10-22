// Gebieden veroveren (#414): de kaartlaag "Veroverd" van de grote kaart (mapview.js). De echte grenzen van de provincie, de gemeenten,
// woonplaatsen, wijken en buurten (grenzen.js) in de kleur van je voortgang: wat je aan het doen bent kleurt mee van oker naar
// groen, een veroverd gebied krijgt de kleur van zijn vlag, een vlag en zijn titel bij het aanwijzen. Welke laag je ziet hangt van
// de zoom: de laag waarvan de gebieden ongeveer een handpalm groot in beeld staan, met de grenzen van de laag erboven dikker.
// Alleen canvas; de gegevens komen uit gebiedenlive.js (en gebieden.js).
import * as G from './gebieden.js';
import { getOverzicht } from './gebiedenlive.js';

let laag = null;   // { t, lijst, typisch }

// Alle gebieden met hun voortgang en kleur, 1 seconde bewaard:
// { lijst: [{ gebied, niveau, klaar, totaal, deel, voltooid, veroverbaar, kleur, alpha, vlag, titel }], typisch: { niveau: grootte in m } }
export function kaartLaag(nu = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
  if (laag && nu - laag.t < 1000) return laag;
  const o = getOverzicht();
  const lijst = [];
  const diag = new Map();
  if (o) {
    for (const g of o.ind.gebieden) {
      const n = G.niveauInfo(g.niveau);
      const v = G.voortgang(o.profiel, o.ind, g.id);
      const k = G.kaartKleur(v, n.vlag);
      lijst.push({ gebied: g, niveau: n, ...v, kleur: k ? k.kleur : null, alpha: k ? k.alpha : 0, vlag: n.vlag, titel: v.voltooid ? G.beloningVan(o.ind, g.id).titel : null });
      const b = g.grens.b;
      const a = diag.get(n.id) || [];
      a.push(Math.hypot(b[2] - b[0], b[3] - b[1]));
      diag.set(n.id, a);
    }
  }
  const typisch = {};
  for (const [id, a] of diag) { a.sort((x, y) => x - y); typisch[id] = a[a.length >> 1]; }
  laag = { t: nu, lijst, typisch };
  return laag;
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

// De laag die bij deze zoom past: die waarvan de gebieden ongeveer DOEL px groot zijn (op logschaal het dichtst erbij).
const DOEL_PX = 240;
export function kiesLaag(typisch, scale) {
  let best = null, bd = Infinity;
  for (const n of G.NIVEAUS) {
    const t = typisch[n.id];
    if (!(t > 0)) continue;
    const d = Math.abs(Math.log(t * scale / DOEL_PX));
    if (d < bd) { bd = d; best = n.id; }
  }
  return best;
}

function pad(ctx, grens, toScreen) {
  ctx.beginPath();
  for (const poly of grens.p) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        const [sx, sy] = toScreen(ring[i][0], ring[i][1]);
        if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
      }
      ctx.closePath();
    }
  }
}

// Tekent de laag op de statische overlay. toScreen(x, y) -> [sx, sy]; scale: px per meter; hover: de lijst van aanwijsbare
// dingen van mapview.js; label(ctx, tekst, x, y, kleur, uitlijning) tekent een naam met rand.
export function tekenVeroverd(ctx, toScreen, scale, cw, ch, hover, label, kleurTekst = '#f2ead8') {
  const { lijst, typisch } = kaartLaag();
  if (!lijst.length) return;
  const hoofd = kiesLaag(typisch, scale);
  if (!hoofd) return;
  const idx = G.NIVEAUS.findIndex((n) => n.id === hoofd);
  const boven = idx > 0 ? G.NIVEAUS[idx - 1].id : null;
  // wat in beeld is: de doos van het gebied in schermpixels
  const zicht = [];
  for (const r of lijst) {
    if (r.niveau.id !== hoofd && r.niveau.id !== boven) continue;
    const b = r.gebied.grens.b;
    const [x0, y0] = toScreen(b[0], b[1]), [x1, y1] = toScreen(b[2], b[3]);
    const l = Math.min(x0, x1), t = Math.min(y0, y1), rr = Math.max(x0, x1), bb = Math.max(y0, y1);
    if (rr < 0 || bb < 0 || l > cw || t > ch) continue;
    zicht.push({ r, diag: Math.hypot(rr - l, bb - t) });
  }
  ctx.save();
  ctx.lineJoin = 'round';
  // 1. de gebieden van de hoofdlaag: kleur naar voortgang, dunne grens
  for (const { r } of zicht) {
    if (r.niveau.id !== hoofd) continue;
    pad(ctx, r.gebied.grens, toScreen);
    if (r.kleur) { ctx.globalAlpha = r.alpha; ctx.fillStyle = r.kleur; ctx.fill('evenodd'); }
    ctx.globalAlpha = r.voltooid ? 0.85 : r.kleur ? 0.55 : 0.28;
    ctx.strokeStyle = r.voltooid ? r.vlag : r.kleur || kleurTekst;
    ctx.lineWidth = r.voltooid ? 2.4 : 1.2;
    ctx.stroke();
  }
  // 2. de grenzen van de laag erboven, dikker (de gemeente om haar woonplaatsen)
  if (boven) {
    for (const { r } of zicht) {
      if (r.niveau.id !== boven) continue;
      pad(ctx, r.gebied.grens, toScreen);
      ctx.globalAlpha = r.voltooid ? 0.9 : 0.5;
      ctx.strokeStyle = r.voltooid ? r.vlag : kleurTekst;
      ctx.lineWidth = r.voltooid ? 3.4 : 2.2;
      ctx.setLineDash(r.voltooid ? [] : [10, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.globalAlpha = 1;
  // 3. vlaggen en tellers: bij het binnenpunt van het gebied
  ctx.textBaseline = 'middle';
  ctx.font = '13px sans-serif';
  for (const { r, diag } of zicht) {
    const g = r.gebied;
    if (diag < 70) continue;
    const [sx, sy] = toScreen(g.x, g.y);
    if (sx < 0 || sy < 0 || sx > cw || sy > ch) continue;
    if (r.voltooid) {
      const s = Math.max(16, Math.min(30, diag * 0.12));
      tekenVlag(ctx, sx, sy, s, r.vlag);
      label(ctx, r.titel, sx, sy + 14, kleurTekst, 'center');
      hover.push({ sx, sy: sy - s * 0.5, name: r.titel, sub: `${r.niveau.enkel[0].toUpperCase()}${r.niveau.enkel.slice(1)} veroverd: alles gedaan (${r.totaal} dingen)` });
    } else if (r.veroverbaar && r.klaar > 0) {
      label(ctx, `${g.naam} ${r.klaar}/${r.totaal}`, sx, sy + 15, kleurTekst, 'center');
    }
  }
  ctx.restore();
}

// Het icoontje in de legenda van de kaart (24 px raster).
export function tekenLegendeVlag(ctx) {
  tekenVlag(ctx, 9, 20, 15, G.NIVEAUS[3].vlag);
}
