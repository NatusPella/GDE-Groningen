// Gebieden veroveren (#414, #423): de kaartlaag "Veroverd" van de grote kaart (mapview.js) en de minikaart (hud_panel.js). De echte grenzen van de provincie,
// gemeenten, woonplaatsen, wijken en buurten (grenzen.js), per zoomniveau één laag die ongeveer een handpalm groot in beeld staat:
//   ver uit   gemeenten, met de provinciegrens erom      midden   woonplaatsen, met de gemeentegrens erom      dichtbij   wijken (en buurten), met de grens van het gebied erboven
// Drie toestanden, nooit alleen met kleur: onveroverd (stippellijn, geen vulling), bezig (vulling van oker naar groen, doorgetrokken lijn, "6 van 80 · 8%")
// en veroverd (vulling en lijn in de kleur van de vlag, een vlag en "veroverd"). De grenslijnen hebben een donkere onderlijn voor contrast en worden dikker
// naarmate je dichterbij zoomt. Namen met voortgang worden op belang gezet (veroverd, bezig, onveroverd) en vallen weg als ze een ander label raken.
// Alleen canvas; de gegevens komen uit gebiedenlive.js (en gebieden.js).
import * as G from './gebieden.js';
import { getOverzicht } from './gebiedenlive.js';

let laag = null;   // { t, lijst, typisch }

// Alle gebieden met hun voortgang en kleur, 1 seconde bewaard:
// { lijst: [{ gebied, niveau, klaar, totaal, deel, pct, voltooid, veroverbaar, kleur, alpha, vlag, titel }], typisch: { niveau: grootte in m } }
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
      lijst.push({ gebied: g, niveau: n, ...v, pct: Math.floor(v.deel * 100), kleur: k ? k.kleur : null, alpha: k ? k.alpha : 0, vlag: n.vlag, titel: v.voltooid ? G.beloningVan(o.ind, g.id).titel : null });
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

// De laag die bij deze zoom past, op vaste drempels in schermpixels per meter (de gebieden van een laag zijn niet even groot: een wijk buiten de stad is groter dan een woonplaats,
// dus de grootte is geen goede maat): ver uit gemeenten (tot de hele provincie), dan woonplaatsen, dan wijken, helemaal dichtbij buurten. Op de grote kaart is dat ongeveer
// zoom 0,6 en lager, 0,6 tot 1,3, 1,3 tot 3 en daarboven. De provincie is nooit de hoofdlaag: ver uit zijn het de gemeenten met de provinciegrens erom.
export const DREMPELS = [[0.025, 'gemeente'], [0.08, 'woonplaats'], [0.25, 'wijk']];
export function kiesLaag(typisch, scale) {
  if (!typisch || !(scale > 0)) return null;
  let id = 'buurt';
  for (const [grens, naam] of DREMPELS) if (scale < grens) { id = naam; break; }
  return typisch[id] > 0 ? id : null;
}
// De laag waarvan de grens als kader om de hoofdlaag staat.
export const KADER = { gemeente: 'provincie', woonplaats: 'gemeente', wijk: 'gemeente', buurt: 'wijk' };
export const laagNaam = (id) => (G.niveauInfo(id) || { naam: '' }).naam;

// De dikte van een grenslijn in schermpixels: dunner ver uit, dikker dichtbij (de lijn schaalt mee met de zoom).
export const lijnDikte = (scale) => Math.max(1.1, Math.min(3.4, 1 + Math.log2(1 + scale * 40) * 0.45));

// Het uiterlijk van een gebied: { vul, alpha, lijn, lijnAlpha, breed, streep } (breed: veelvoud van lijnDikte; streep: gestippeld).
export function stijl(r, kleurTekst = '#f2ead8') {
  if (r.voltooid) return { vul: r.vlag, alpha: 0.38, lijn: r.vlag, lijnAlpha: 1, breed: 1.8, streep: false };
  if (r.veroverbaar && r.klaar > 0) return { vul: r.kleur, alpha: Math.max(0.24, r.alpha + 0.1), lijn: r.kleur, lijnAlpha: 0.95, breed: 1.3, streep: false };
  if (r.veroverbaar) return { vul: null, alpha: 0, lijn: kleurTekst, lijnAlpha: 0.7, breed: 1, streep: true };
  return { vul: null, alpha: 0, lijn: kleurTekst, lijnAlpha: 0.2, breed: 0.7, streep: false };
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

// Een grenslijn met een donkere onderlijn: leesbaar op licht en donker land.
function lijn(ctx, s, breed, dikte, streep) {
  const w = dikte * breed;
  ctx.setLineDash(streep ? [w * 4, w * 3] : []);
  ctx.globalAlpha = 0.55 * Math.min(1, s.lijnAlpha + 0.2);
  ctx.strokeStyle = 'rgb(8,14,10)'; ctx.lineWidth = w + 2.4; ctx.stroke();
  ctx.globalAlpha = s.lijnAlpha;
  ctx.strokeStyle = s.lijn; ctx.lineWidth = w; ctx.stroke();
  ctx.setLineDash([]);
}

// Tekent de laag op de statische overlay van de grote kaart. toScreen(x, y) -> [sx, sy]; scale: px per meter; hover: de lijst van aanwijsbare dingen van
// mapview.js; label(ctx, tekst, x, y, kleur, uitlijning) tekent een naam met rand. Geeft de naam van de getoonde laag (voor de legenda).
export function tekenVeroverd(ctx, toScreen, scale, cw, ch, hover, label, kleurTekst = '#f2ead8') {
  const { lijst, typisch } = kaartLaag();
  if (!lijst.length) return null;
  const hoofd = kiesLaag(typisch, scale);
  if (!hoofd) return null;
  const kader = KADER[hoofd];
  const dikte = lijnDikte(scale);
  const zicht = [];
  for (const r of lijst) {
    if (r.niveau.id !== hoofd && r.niveau.id !== kader) continue;
    const b = r.gebied.grens.b;
    const [x0, y0] = toScreen(b[0], b[1]), [x1, y1] = toScreen(b[2], b[3]);
    const l = Math.min(x0, x1), t = Math.min(y0, y1), rr = Math.max(x0, x1), bb = Math.max(y0, y1);
    if (rr < 0 || bb < 0 || l > cw || t > ch) continue;
    zicht.push({ r, diag: Math.hypot(rr - l, bb - t), hoofd: r.niveau.id === hoofd });
  }
  ctx.save();
  ctx.lineJoin = 'round';
  // 1. vullingen en grenzen van de hoofdlaag
  for (const { r, hoofd: isHoofd } of zicht) {
    if (!isHoofd) continue;
    const s = stijl(r, kleurTekst);
    pad(ctx, r.gebied.grens, toScreen);
    if (s.vul) { ctx.globalAlpha = s.alpha; ctx.fillStyle = s.vul; ctx.fill('evenodd'); }
    lijn(ctx, s, s.breed, dikte, s.streep);
  }
  // 2. de grens van de laag erboven, dikker en doorgetrokken (de gemeente om haar woonplaatsen, de provincie om de gemeenten)
  for (const { r, hoofd: isHoofd } of zicht) {
    if (isHoofd) continue;
    pad(ctx, r.gebied.grens, toScreen);
    lijn(ctx, { lijn: r.voltooid ? r.vlag : kleurTekst, lijnAlpha: r.voltooid ? 1 : 0.85 }, 2.2, dikte, false);
  }
  ctx.globalAlpha = 1;
  // 3. labels op belang, zonder overlap: veroverd, dan bezig (het verst gevorderd eerst), dan onveroverd
  ctx.textBaseline = 'middle';
  const kand = [];
  for (const z of zicht) {
    const r = z.r;
    if (!z.hoofd || z.diag < 90) continue;
    if (!r.voltooid && !r.veroverbaar) continue;
    kand.push({ r, diag: z.diag, prio: r.voltooid ? 3 : r.klaar > 0 ? 2 + r.deel : 1 });
  }
  kand.sort((a, b) => b.prio - a.prio || b.diag - a.diag);
  const geplaatst = [];
  for (const { r, diag } of kand) {
    const g = r.gebied;
    const [sx, sy] = toScreen(g.x, g.y);
    if (sx < 30 || sy < 20 || sx > cw - 30 || sy > ch - 20) continue;
    const regel2 = r.voltooid ? 'veroverd' : `${r.klaar} van ${r.totaal} · ${r.pct}%`;
    ctx.font = '600 13px sans-serif';
    const w1 = ctx.measureText(g.naam).width;
    ctx.font = '11px sans-serif';
    const w2 = ctx.measureText(regel2).width;
    const vlag = r.voltooid ? Math.max(16, Math.min(26, diag * 0.1)) : 0;
    const bw = Math.max(w1, w2) + 10, bh = 32 + vlag;
    const doos = [sx - bw / 2, sy - 16 - vlag, sx + bw / 2, sy - 16 - vlag + bh];
    if (geplaatst.some((p) => doos[0] < p[2] && doos[2] > p[0] && doos[1] < p[3] && doos[3] > p[1])) continue;
    geplaatst.push(doos);
    if (r.voltooid) tekenVlag(ctx, sx, sy - 6, vlag, r.vlag);
    ctx.font = '600 13px sans-serif';
    label(ctx, g.naam, sx, sy + 2, kleurTekst, 'center');
    ctx.font = '11px sans-serif';
    label(ctx, regel2, sx, sy + 16, r.voltooid ? r.vlag : kleurTekst, 'center');
    if (r.voltooid) hover.push({ sx, sy: sy - vlag * 0.5, name: r.titel, sub: `${r.niveau.enkel[0].toUpperCase()}${r.niveau.enkel.slice(1)} veroverd: alles gedaan (${r.totaal} dingen)` });
  }
  ctx.restore();
  return hoofd;
}

// De legenda linksonder: welke laag je ziet en wat de drie toestanden zijn.
export function tekenLegenda(ctx, cw, ch, hoofd, kleurTekst = '#f2ead8') {
  if (!hoofd) return;
  const x = 16, rij = 20, h = 30 + rij * 3 + 8, y = ch - 56 - h;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(10,18,13,0.82)';
  ctx.strokeStyle = 'rgba(242,234,216,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, 176, h, 8); ctx.fill(); ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = kleurTekst;
  ctx.font = '600 12px sans-serif';
  ctx.fillText(`Veroverd · ${laagNaam(hoofd).toLowerCase()}`, x + 10, y + 16);
  const rijen = [['Nog niet begonnen', null], ['Bezig', 'rgb(150,184,70)'], ['Veroverd', G.niveauInfo(hoofd).vlag]];
  rijen.forEach(([tekst, kleur], i) => {
    const cy = y + 38 + i * rij;
    ctx.beginPath(); ctx.roundRect(x + 10, cy - 7, 24, 14, 3);
    if (kleur) { ctx.globalAlpha = i === 2 ? 0.55 : 0.45; ctx.fillStyle = kleur; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.setLineDash(kleur ? [] : [4, 3]);
    ctx.strokeStyle = kleur || kleurTekst; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = kleurTekst; ctx.font = '12px sans-serif';
    ctx.fillText(tekst, x + 44, cy);
  });
  ctx.restore();
}

// De minikaart (hud_panel.js): ctx staat in wereldmeters rond de speler, scale is px per meter; geen labels, wel dezelfde lagen en toestanden.
export function tekenVeroverdMini(ctx, scale, px, py, straal) {
  const { lijst, typisch } = kaartLaag();
  if (!lijst.length) return;
  const hoofd = kiesLaag(typisch, scale);
  if (!hoofd) return;
  const kader = KADER[hoofd];
  const id = (x, y) => [x, y];
  const dikte = Math.max(1, lijnDikte(scale) * 0.8) / scale;
  ctx.save();
  ctx.lineJoin = 'round';
  const buiten = (b) => b[2] < px - straal || b[0] > px + straal || b[3] < py - straal || b[1] > py + straal;
  for (const r of lijst) {
    if (r.niveau.id !== hoofd && r.niveau.id !== kader) continue;
    if (buiten(r.gebied.grens.b)) continue;
    pad(ctx, r.gebied.grens, id);
    if (r.niveau.id === hoofd) {
      const s = stijl(r);
      if (s.vul) { ctx.globalAlpha = s.alpha; ctx.fillStyle = s.vul; ctx.fill('evenodd'); }
      ctx.setLineDash(s.streep ? [dikte * 4, dikte * 3] : []);
      ctx.globalAlpha = s.lijnAlpha; ctx.strokeStyle = s.lijn; ctx.lineWidth = dikte * s.breed; ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = 0.85; ctx.strokeStyle = r.voltooid ? r.vlag : '#f2ead8'; ctx.lineWidth = dikte * 2; ctx.stroke();
    }
  }
  ctx.restore();
}

// Het icoontje in de legenda van de kaart (24 px raster).
export function tekenLegendeVlag(ctx) {
  tekenVlag(ctx, 9, 20, 15, G.NIVEAUS[3].vlag);
}
