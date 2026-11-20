// Gebieden veroveren (#414, #423): de kaartlaag "Veroverd" van de grote kaart (mapview.js) en de minikaart (hud_panel.js). De echte grenzen van de provincie,
// gemeenten, woonplaatsen, wijken en buurten (grenzen.js), per zoomniveau één laag die ongeveer een handpalm groot in beeld staat:
//   ver uit   gemeenten, met de provinciegrens erom      midden   woonplaatsen, met de gemeentegrens erom      dichtbij   wijken (en buurten), met de grens van het gebied erboven
// Vier toestanden (gebiedtoestand.js), nooit alleen met kleur: onzichtbaar (raster, geen naam), zichtbaar (stippellijn, gedempte vulling), bezig (effen gele rand, voortgangsring, "6 van 80 · 8%")
// en veroverd (volle vulling in de kleur van de vlag, dikke rand, een vlag en "veroverd"). De grenslijnen hebben een donkere onderlijn voor contrast en worden dikker
// naarmate je dichterbij zoomt. Namen met voortgang worden op belang gezet (veroverd, bezig, onveroverd) en vallen weg als ze een ander label raken.
// Alleen canvas; de gegevens komen uit gebiedenlive.js (en gebieden.js).
import * as G from './gebieden.js';
import { getOverzicht } from './gebiedenlive.js';
import { landBorders } from './regions.js';
import { gebiedIn } from './grenzen.js';
import { zichtbareGebieden, toestandVan, toestandStijl, legendaRijen, toonNaam } from './gebiedtoestand.js';
import { iconInner } from './icons.js';
import { dsKleur, hexA } from './kaartkleuren.js';

let laag = null;   // { t, lijst, typisch }

// Alle gebieden met hun voortgang en kleur, 1 seconde bewaard:
// { lijst: [{ gebied, niveau, klaar, totaal, deel, pct, voltooid, veroverbaar, kleur, alpha, vlag, titel }], typisch: { niveau: grootte in m } }
export function kaartLaag(nu = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
  if (laag && nu - laag.t < 1000) return laag;
  const o = getOverzicht();
  const lijst = [];
  const diag = new Map();
  if (o) {
    const gezien = zichtbareGebieden(o.ind, o.profiel.bezocht); // per speler: het eigen profiel, de kaart is lokaal
    for (const g of o.ind.gebieden) {
      const n = G.niveauInfo(g.niveau);
      const v = G.voortgang(o.profiel, o.ind, g.id);
      const k = G.kaartKleur(v, n.vlag);
      const r = { gebied: g, niveau: n, ...v, pct: Math.floor(v.deel * 100), kleur: k ? k.kleur : null, alpha: k ? k.alpha : 0, vlag: dsKleur('licht-groen'), titel: v.voltooid ? G.beloningVan(o.ind, g.id).titel : null };
      r.toestand = toestandVan(r, gezien);
      lijst.push(r);
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

// Ligt deze plek in een buurt waar de speler nog nooit was? Voor het verminderde detail van de minikaart (de grote kaart gebruikt het masker
// van mapview.js). De bezochte buurten staan in een Set die meeloopt met het profiel; zonder indeling is niets onbezocht.
let bezochtSet = null, bezochtLen = -1, bezochtBron = null;
export function plekOnbezocht(x, y) {
  const o = getOverzicht();
  if (!o || !o.profiel || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const lijst = o.profiel.bezocht || [];
  if (bezochtBron !== lijst || bezochtLen !== lijst.length) { bezochtSet = new Set(lijst); bezochtBron = lijst; bezochtLen = lijst.length; }
  const buurt = G.gebiedenVan(o.ind, x, y).buurt;
  return !!buurt && !bezochtSet.has(buurt);
}

// Een vlaggetje: paal, wimpel met donkere rand. (x, y) is de voet van de paal; s de grootte in px.
export function tekenVlag(ctx, x, y, s, kleur) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y - s);
  ctx.strokeStyle = hexA(dsKleur('glas'), 0.95); ctx.lineWidth = Math.max(3, s * 0.3); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.85, y - s * 0.72); ctx.lineTo(x, y - s * 0.42); ctx.closePath();
  ctx.fillStyle = kleur; ctx.fill();
  ctx.lineWidth = Math.max(2.4, s * 0.22); ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y - s);
  ctx.strokeStyle = dsKleur('creme'); ctx.lineWidth = Math.max(1.4, s * 0.12); ctx.stroke();
  ctx.restore();
}

// De laag die bij deze zoom past, op vaste drempels in schermpixels per meter (de gebieden van een laag zijn niet even groot: een wijk buiten de stad is groter dan een woonplaats,
// dus de grootte is geen goede maat): ver uit gemeenten (tot de hele provincie), dan woonplaatsen, dan wijken, helemaal dichtbij buurten. Op de grote kaart is een zoom van 1 ongeveer 0,09 px per meter:
// gemeenten tot zoom 0,7, woonplaatsen tot 1,7, wijken tot 4 en daarboven buurten. De provincie is nooit de hoofdlaag: ver uit zijn het de gemeenten met de provinciegrens erom.
export const DREMPELS = [[0.06, 'gemeente'], [0.15, 'woonplaats'], [0.35, 'wijk']];
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

// #900: één niveau waarop een gebied op de kaart opengaat (hover en klik), los van de zoomlaag
// die je ziet. De wijk is de verover-eenheid (docs/GEBIEDEN.md, #716), dus je opent altijd
// dezelfde wijk, ook als de kaart ver uit gemeenten of dichtbij buurten toont.
export const OPEN_NIVEAU = 'wijk';

// Het gebied onder een plek op het open niveau (#900), of null. `lijst` is kaartLaag().lijst.
export function openGebied(lijst, x, y) {
  if (!Array.isArray(lijst) || !lijst.length || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const kandidaten = lijst.filter((q) => q && q.niveau && q.niveau.id === OPEN_NIVEAU && q.gebied && q.gebied.grens);
  if (!kandidaten.length) return null;
  const g = gebiedIn(kandidaten.map((q) => q.gebied.grens), x, y);
  return g ? kandidaten.find((q) => q.gebied.grens === g) || null : null;
}

// #900: de stand van alle gebieden waar je al iets deed, voor de strook op de kaart. Die
// staat er op elk zoomniveau (dus ook als de kaart een andere laag tekent), met dezelfde
// woorden als de kaartlaag: "naam · 2 van 5 · 40%" of "naam · veroverd".
export function statusRegels(lijst, max = 3) {
  if (!Array.isArray(lijst) || !lijst.length) return [];
  const gestart = lijst.filter((r) => r && r.gebied && (r.voltooid || r.klaar > 0));
  gestart.sort((a, b) => (b.voltooid - a.voltooid) || (b.deel - a.deel) || (b.totaal - a.totaal) || a.gebied.naam.localeCompare(b.gebied.naam, 'nl'));
  return gestart.slice(0, Math.max(0, max)).map((r) => ({
    tekst: `${r.gebied.naam} · ${r.voltooid ? 'veroverd' : `${r.klaar} van ${r.totaal} · ${r.pct}%`}`,
    kleur: r.voltooid ? r.vlag : dsKleur('creme'),
  }));
}

// Het uiterlijk van een gebied: { vul, alpha, lijn, lijnAlpha, breed, streep } (breed: veelvoud van lijnDikte; streep: gestippeld).
// De vier toestanden (gebiedtoestand.js) bepalen het uiterlijk; zonder `toestand` (een los gebied in een test) volgt hij uit de rest.
export function stijl(r, kleurTekst = dsKleur('creme')) {
  const t = r.toestand || (r.voltooid ? 'veroverd' : r.veroverbaar && r.klaar > 0 ? 'bezig' : r.veroverbaar ? 'zichtbaar' : 'onzichtbaar');
  return toestandStijl({ ...r, toestand: t }, kleurTekst);
}

// Het fijne puntraster van "nog onzichtbaar": een tegel van 6 px (de halftone van het designsysteem), één keer gemaakt. Zonder canvas null.
let rasterTegel = null;
function rasterPatroon(ctx) {
  if (typeof ctx.createPattern !== 'function' || typeof document === 'undefined') return null;
  if (!rasterTegel) {
    rasterTegel = document.createElement('canvas');
    rasterTegel.width = rasterTegel.height = 6;
    const t = rasterTegel.getContext('2d');
    t.fillStyle = hexA(dsKleur('ink-inkt'), 0.95);
    t.beginPath(); t.arc(3, 3, 1.45, 0, Math.PI * 2); t.fill();
  }
  const p = ctx.createPattern(rasterTegel, 'repeat');
  return p;
}

// Een Phosphor-icoon (icons.js) op het canvas, in een schijf met rand zodat het op elk land leesbaar is. (x, y) is het midden, px de doorsnee
// van de schijf. Zonder Path2D (node, tests) blijft het bij de schijf.
const iconPaden = new Map();
export function tekenToestandIcoon(ctx, naam, x, y, px, kleur, rand = dsKleur('ink-inkt'), glyph = dsKleur('ink-papier')) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, px / 2, 0, Math.PI * 2);
  ctx.fillStyle = rand; ctx.fill();
  ctx.lineWidth = Math.max(1.4, px * 0.09); ctx.strokeStyle = kleur; ctx.stroke();
  if (typeof Path2D !== 'undefined') {
    let lijst = iconPaden.get(naam);
    if (!lijst) { lijst = [...iconInner(naam, true).matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1])); iconPaden.set(naam, lijst); }
    const g = px * 0.62;
    ctx.translate(x - g / 2, y - g / 2); ctx.scale(g / 256, g / 256);
    ctx.fillStyle = glyph;
    for (const p of lijst) ctx.fill(p);
  }
  ctx.restore();
}

// De voortgangsring van een gebied dat bezig is: een lichte ring met daarover de gele boog voor het deel dat klaar is.
export function tekenVoortgangsring(ctx, x, y, straal, deel, dik) {
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.arc(x, y, straal + dik * 0.2, 0, Math.PI * 2);
  ctx.strokeStyle = dsKleur('ink-inkt'); ctx.lineWidth = dik + 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, straal, 0, Math.PI * 2);
  ctx.strokeStyle = hexA(dsKleur('ink-papier'), 0.45); ctx.lineWidth = dik; ctx.stroke();
  if (deel > 0) {
    ctx.beginPath(); ctx.arc(x, y, straal, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.max(0.04, deel)));
    ctx.strokeStyle = dsKleur('ink-geel'); ctx.lineWidth = dik; ctx.stroke();
  }
  ctx.restore();
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
  ctx.strokeStyle = dsKleur('glas'); ctx.lineWidth = w + 2.4; ctx.stroke();
  ctx.globalAlpha = s.lijnAlpha;
  ctx.strokeStyle = s.lijn; ctx.lineWidth = w; ctx.stroke();
  ctx.setLineDash([]);
}

// Tekent de laag op de statische overlay van de grote kaart. toScreen(x, y) -> [sx, sy]; scale: px per meter; hover: de lijst van aanwijsbare dingen van
// mapview.js; label(ctx, tekst, x, y, kleur, uitlijning) tekent een naam met rand. Geeft de naam van de getoonde laag (voor de legenda).
export function tekenVeroverd(ctx, toScreen, scale, cw, ch, hover, label, kleurTekst = dsKleur('creme')) {
  const { lijst, typisch } = kaartLaag();
  if (!lijst.length) return null;
  const hoofd = kiesLaag(typisch, scale);
  if (!hoofd) return null;
  const kader = KADER[hoofd];
  const dikte = lijnDikte(scale);
  const zicht = [];
  for (const r of lijst) {
    if (r.niveau.id !== hoofd && r.niveau.id !== kader && r.niveau.id !== 'provincie') continue; // de provinciegrens (met Drenthe, Friesland en Duitsland erachter) staat op elke zoom (#435)
    const b = r.gebied.grens.b;
    const [x0, y0] = toScreen(b[0], b[1]), [x1, y1] = toScreen(b[2], b[3]);
    const l = Math.min(x0, x1), t = Math.min(y0, y1), rr = Math.max(x0, x1), bb = Math.max(y0, y1);
    if (rr < 0 || bb < 0 || l > cw || t > ch) continue;
    zicht.push({ r, diag: Math.hypot(rr - l, bb - t), hoofd: r.niveau.id === hoofd, rand: r.niveau.id === 'provincie' && kader !== 'provincie' });
  }
  ctx.save();
  ctx.lineJoin = 'round';
  // 1. vullingen en grenzen van de hoofdlaag, per toestand (gebiedtoestand.js)
  const raster = rasterPatroon(ctx);
  for (const { r, hoofd: isHoofd } of zicht) {
    if (!isHoofd) continue;
    const s = stijl(r, kleurTekst);
    pad(ctx, r.gebied.grens, toScreen);
    if (s.vul) { ctx.globalAlpha = s.alpha; ctx.fillStyle = s.vul; ctx.fill('evenodd'); }
    if (s.raster && raster) { ctx.globalAlpha = 1; ctx.fillStyle = raster; ctx.fill('evenodd'); }
    if (s.toestand === 'veroverd') lijn(ctx, { lijn: s.rand, lijnAlpha: 0.9 }, s.breed + 1.2, dikte, false); // de dikke rand: donkere band onder de gekleurde lijn
    lijn(ctx, s, s.breed, dikte, s.streep);
  }
  // 2. de grens van de laag erboven, dikker en doorgetrokken (de gemeente om haar woonplaatsen, de provincie om de gemeenten), met een lichte vulling als daar iets gedaan is
  for (const { r, hoofd: isHoofd, rand } of zicht) {
    if (isHoofd) continue;
    if (rand) { // alleen de rand van de provincie: dik en doorgetrokken, zonder vulling
      pad(ctx, r.gebied.grens, toScreen);
      lijn(ctx, { lijn: kleurTekst, lijnAlpha: 0.9 }, 2.6, dikte, false);
      continue;
    }
    pad(ctx, r.gebied.grens, toScreen);
    const ks = stijl(r, kleurTekst);
    if (ks.vul) { ctx.globalAlpha = ks.alpha * 0.55; ctx.fillStyle = ks.vul; ctx.fill('evenodd'); }
    lijn(ctx, { lijn: r.voltooid ? r.vlag : kleurTekst, lijnAlpha: r.voltooid ? 1 : 0.85 }, 2.2, dikte, false);
  }
  // 2b. de landgrenzen met Friesland, Drenthe en Duitsland in hun eigen kleur, boven de provinciegrens (#435): zo blijft te zien waar elk buurgebied begint
  for (const b of landBorders()) {
    ctx.beginPath();
    b.pts.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    lijn(ctx, { lijn: b.color, lijnAlpha: 0.95 }, 2.6, dikte, false);
  }
  ctx.globalAlpha = 1;
  // 3. labels op belang, zonder overlap: veroverd, dan bezig (het verst gevorderd eerst), dan onveroverd
  ctx.textBaseline = 'middle';
  const kand = [];
  for (const z of zicht) {
    const r = z.r;
    if (!z.hoofd || z.diag < 90 || !toonNaam(r.toestand)) continue; // een onzichtbaar gebied heeft geen naam: geen details
    // ook een gebied waar niets te veroveren valt (de gemeente Groningen) heeft zijn naam en is aan te wijzen (#435)
    kand.push({ r, diag: z.diag, prio: r.voltooid ? 3 : r.klaar > 0 ? 2 + r.deel : r.veroverbaar ? 1 : 0 });
  }
  kand.sort((a, b) => b.prio - a.prio || b.diag - a.diag);
  const geplaatst = [];
  const geplaatstIds = new Set();
  for (const { r, diag } of kand) {
    if (geplaatst.length >= 6) break; // nooit een volle kaart: de belangrijkste zes namen
    const g = r.gebied;
    const [sx, sy] = toScreen(g.x, g.y);
    if (sx < 30 || sy < 20 || sx > cw - 30 || sy > ch - 20) continue;
    const regel2 = r.voltooid ? 'veroverd' : r.veroverbaar ? `${r.klaar} van ${r.totaal} · ${r.pct}%` : '';
    ctx.font = '600 13px sans-serif';
    const w1 = ctx.measureText(g.naam).width;
    ctx.font = '11px sans-serif';
    const w2 = ctx.measureText(regel2).width;
    const vlag = r.voltooid ? Math.max(20, Math.min(28, diag * 0.1)) : r.klaar > 0 ? 24 : 0; // de hoogte van het icoon boven de naam: vlag of voortgangsring
    const bw = Math.max(w1, w2) + 10, bh = 32 + vlag;
    const doos = [sx - bw / 2, sy - 16 - vlag, sx + bw / 2, sy - 16 - vlag + bh];
    if (geplaatst.some((p) => doos[0] < p[2] && doos[2] > p[0] && doos[1] < p[3] && doos[3] > p[1])) continue;
    geplaatst.push(doos);
    geplaatstIds.add(r.gebied.id);
    if (r.voltooid) tekenToestandIcoon(ctx, 'vlag', sx, sy - 6 - vlag * 0.5, vlag, r.vlag);
    else if (r.klaar > 0) tekenVoortgangsring(ctx, sx, sy - 6 - vlag * 0.5, 8, r.deel, 4);
    ctx.font = '600 13px sans-serif';
    label(ctx, g.naam, sx, sy + 2, kleurTekst, 'center');
    ctx.font = '11px sans-serif';
    if (regel2) label(ctx, regel2, sx, sy + 16, r.voltooid ? r.vlag : kleurTekst, 'center');
    if (r.voltooid) hover.push({ sx, sy: sy - vlag * 0.5, name: r.titel, sub: `${r.niveau.enkel[0].toUpperCase()}${r.niveau.enkel.slice(1)} veroverd: alles gedaan (${r.totaal} dingen)` });
    else hover.push({ sx, sy, name: g.naam, sub: r.veroverbaar ? `${r.niveau.enkel[0].toUpperCase()}${r.niveau.enkel.slice(1)}: ${r.klaar} van ${r.totaal} gedaan` : `${r.niveau.enkel[0].toUpperCase()}${r.niveau.enkel.slice(1)}` }); // aanwijsbaar en aan te klikken (#435)
  }
  ctx.globalAlpha = 1;
  // 4. ook zonder naam is de toestand af te lezen aan een icoon (niet alleen aan kleur): oog door voor onzichtbaar, ring voor bezig, vlag voor veroverd
  for (const z of zicht) {
    const r = z.r;
    if (!z.hoofd || z.diag < 56 || geplaatstIds.has(r.gebied.id) || r.toestand === 'zichtbaar') continue;
    const [sx, sy] = toScreen(r.gebied.x, r.gebied.y);
    if (sx < 14 || sy < 14 || sx > cw - 14 || sy > ch - 14) continue;
    const px = Math.max(16, Math.min(24, z.diag * 0.16));
    if (r.toestand === 'bezig') tekenVoortgangsring(ctx, sx, sy, px * 0.4, r.deel, 4);
    else if (r.toestand === 'veroverd') tekenToestandIcoon(ctx, 'vlag', sx, sy, px, r.vlag);
    else tekenToestandIcoon(ctx, 'oog_uit', sx, sy, px * 0.85, dsKleur('creme-zacht'));
  }
  ctx.restore();
  return hoofd;
}

// Een klein vlakje met de toestand erin getekend zoals op de kaart (de legenda): raster, stippellijn, effen geel met ring of vulling met vlag.
export function tekenToestandVlak(ctx, id, x, y, w, h, vlagKleur = dsKleur('licht-groen')) {
  const s = toestandStijl({ toestand: id, vlag: vlagKleur, deel: 0.6 }, dsKleur('ink-inkt'));
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 3);
  if (s.vul) { ctx.globalAlpha = id === 'veroverd' ? 0.75 : id === 'zichtbaar' ? 0.35 : Math.max(0.35, s.alpha + 0.2); ctx.fillStyle = s.vul; ctx.fill(); }
  const raster = s.raster ? rasterPatroon(ctx) : null;
  if (raster) { ctx.globalAlpha = 1; ctx.fillStyle = raster; ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.setLineDash(s.streep ? [4, 3] : []);
  ctx.strokeStyle = id === 'zichtbaar' || id === 'onzichtbaar' ? dsKleur('ink-inkt') : id === 'bezig' ? dsKleur('ink-geel') : s.rand;
  ctx.lineWidth = id === 'veroverd' ? 3 : id === 'bezig' ? 2.4 : 1.6;
  ctx.stroke();
  ctx.setLineDash([]);
  if (id === 'bezig') {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.lineWidth = 1; ctx.strokeStyle = dsKleur('ink-inkt'); ctx.stroke();
    tekenVoortgangsring(ctx, x + w / 2, y + h / 2, 4, 0.6, 2.4);
  } else if (id === 'veroverd') {
    tekenToestandIcoon(ctx, 'vlag', x + w / 2, y + h / 2, 13, vlagKleur);
  } else if (id === 'onzichtbaar') {
    tekenToestandIcoon(ctx, 'oog_uit', x + w / 2, y + h / 2, 13, dsKleur('creme-zacht'));
  }
  ctx.restore();
}

// De legenda linksonder: welke laag je ziet en de vier toestanden van een gebied, met woorden en met hetzelfde patroon als op de kaart.
export function tekenLegenda(ctx, cw, ch, hoofd, kleurTekst = dsKleur('creme')) {
  if (!hoofd) return;
  const rijen = legendaRijen();
  const x = 16, rij = 26, h = 34 + rij * rijen.length + 6, y = ch - 56 - h;
  ctx.save();
  ctx.globalAlpha = 1;
  const inkt = dsKleur('ink-inkt');
  ctx.fillStyle = dsKleur('ink-papier');
  ctx.strokeStyle = inkt;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, 232, h, 8); ctx.fill(); ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = inkt;
  ctx.font = '700 13px sans-serif';
  ctx.fillText(`Veroverd · ${laagNaam(hoofd).toLowerCase()}`, x + 10, y + 16);
  rijen.forEach((r, i) => {
    const cy = y + 42 + i * rij;
    tekenToestandVlak(ctx, r.id, x + 10, cy - 10, 34, 20, dsKleur('licht-groen'));
    ctx.fillStyle = inkt; ctx.font = '13px sans-serif';
    ctx.fillText(r.naam, x + 54, cy);
  });
  ctx.restore();
}

// De minikaart (hud_panel.js): ctx staat in wereldmeters rond de speler, scale is px per meter; geen labels, wel dezelfde lagen en toestanden
// (raster, stippellijn, gele rand met ring, vulling met vlag) en dezelfde kleuren.
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
  const patroon = rasterPatroon(ctx);
  if (patroon && typeof DOMMatrix !== 'undefined' && patroon.setTransform) patroon.setTransform(new DOMMatrix().scale(1 / scale)); // het raster houdt zijn schermmaat
  const buiten = (b) => b[2] < px - straal || b[0] > px + straal || b[3] < py - straal || b[1] > py + straal;
  const iconen = [];
  for (const r of lijst) {
    if (r.niveau.id !== hoofd && r.niveau.id !== kader) continue;
    if (buiten(r.gebied.grens.b)) continue;
    pad(ctx, r.gebied.grens, id);
    if (r.niveau.id === kader) { const ks = stijl(r); if (ks.vul && ks.toestand !== 'onzichtbaar') { ctx.globalAlpha = ks.alpha * 0.55; ctx.fillStyle = ks.vul; ctx.fill('evenodd'); } }
    if (r.niveau.id === hoofd) {
      const s = stijl(r);
      if (s.vul) { ctx.globalAlpha = s.toestand === 'onzichtbaar' ? 0.7 : s.alpha; ctx.fillStyle = s.vul; ctx.fill('evenodd'); } // onzichtbaar: een zware waas, zodat de minikaart er grof uitziet
      if (s.raster && patroon) { ctx.globalAlpha = 0.8; ctx.fillStyle = patroon; ctx.fill('evenodd'); }
      if (s.toestand === 'veroverd') { ctx.setLineDash([]); ctx.globalAlpha = 0.9; ctx.strokeStyle = s.rand; ctx.lineWidth = dikte * (s.breed + 1.2); ctx.stroke(); }
      ctx.setLineDash(s.streep ? [dikte * 4, dikte * 3] : []);
      ctx.globalAlpha = s.lijnAlpha; ctx.strokeStyle = s.lijn; ctx.lineWidth = dikte * s.breed; ctx.stroke();
      ctx.setLineDash([]);
      const b = r.gebied.grens.b;
      if (s.toestand !== 'zichtbaar' && Math.hypot(b[2] - b[0], b[3] - b[1]) * scale >= 34) iconen.push({ r, s });
    } else {
      ctx.globalAlpha = 0.85; ctx.strokeStyle = r.voltooid ? r.vlag : dsKleur('creme'); ctx.lineWidth = dikte * 2; ctx.stroke();
    }
  }
  // de iconen: klein, in schermpixels (de ctx staat in meters)
  ctx.globalAlpha = 1;
  for (const { r, s } of iconen) {
    const { x, y } = r.gebied;
    if (Math.abs(x - px) > straal || Math.abs(y - py) > straal) continue;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1 / scale, 1 / scale);
    if (s.toestand === 'bezig') tekenVoortgangsring(ctx, 0, 0, 4.5, r.deel, 2.6);
    else if (s.toestand === 'veroverd') tekenToestandIcoon(ctx, 'vlag', 0, 0, 14, r.vlag);
    else tekenToestandIcoon(ctx, 'oog_uit', 0, 0, 12, dsKleur('creme-zacht'));
    ctx.restore();
  }
  ctx.restore();
}

// Het icoontje in de legenda van de kaart (24 px raster).
export function tekenLegendeVlag(ctx) {
  tekenVlag(ctx, 9, 20, 15, G.NIVEAUS[3].vlag);
}
