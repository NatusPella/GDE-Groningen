// De doelmarkering aan de rand van de minimap: ontwerp C, de kompasboog (#1078, gekozen door de eigenaar op 21-11; docs/MINIMAP-PIJLEN-21-11.md).
//
// Een rustige stippellijn loopt langs de rand van de kaart. Het doel dat je volgt is één dikke boog op die lijn, op de plek van de richting, met een
// rond Phosphor-icoon in het midden en de afstand in een papieren plaatje ernaast. Wachtende doelen (hooguit twee) en medespelers of eigen voertuigen
// zijn kleine ronde icoon-punten op dezelfde lijn: geen pijl. Markers die te dichtbij komen schuiven uit elkaar; de afstand tot de kaartrand is vast.
// Kleur zegt de rol (navdoel.js NAV_ROL), het icoon zegt het type: nooit alleen kleur.
//
// Twee delen: de meetkunde (puur, getest in scripts/navdoel_test.mjs) en het tekenen (canvas; zonder Path2D, zoals in node, vallen de iconen weg).
import { iconInner } from './icons.js';
import { dsKleur } from './kaartkleuren.js';

export const BAAN_INSET = 23; // afstand van het hart van een marker tot de kaartrand (px, op een kaart van 250)
export const BAAN_STRAAL = 24; // de hoeken van de baan
export const MIN_ACTIEF = 48; // afstand langs de baan tussen de boog en een punt
export const MIN_PUNT = 28; // afstand langs de baan tussen twee punten
export const MAX_WACHTEND = 2; // hooguit zoveel wachtende doelen (navdoel.js MAX_SECUNDAIR); medespelers en voertuigen tellen daar niet bij
export const MAX_ANDEREN = 3; // en hooguit zoveel medespelers en eigen voertuigen als punt

// ------------------------------------------------------------------ meetkunde
// Een afgeronde vierkante baan met de klok mee vanaf het begin van de bovenrand. S: de breedte van de kaart.
export function baan(S, inset = BAAN_INSET, radius = BAAN_STRAAL) {
  const a = inset, b = S - inset, r = radius, w = b - a - 2 * r;
  const stuk = [w, Math.PI * r / 2, w, Math.PI * r / 2, w, Math.PI * r / 2, w, Math.PI * r / 2];
  const lengte = stuk.reduce((p, q) => p + q, 0);
  function punt(s) {
    s = ((s % lengte) + lengte) % lengte;
    let i = 0; while (i < 7 && s > stuk[i]) { s -= stuk[i]; i++; }
    const t = s / stuk[i];
    switch (i) {
      case 0: return [a + r + w * t, a];
      case 1: { const h = -Math.PI / 2 + t * Math.PI / 2; return [b - r + Math.cos(h) * r, a + r + Math.sin(h) * r]; }
      case 2: return [b, a + r + w * t];
      case 3: { const h = t * Math.PI / 2; return [b - r + Math.cos(h) * r, b - r + Math.sin(h) * r]; }
      case 4: return [b - r - w * t, b];
      case 5: { const h = Math.PI / 2 + t * Math.PI / 2; return [a + r + Math.cos(h) * r, b - r + Math.sin(h) * r]; }
      case 6: return [a, b - r - w * t];
      default: { const h = Math.PI + t * Math.PI / 2; return [a + r + Math.cos(h) * r, a + r + Math.sin(h) * r]; }
    }
  }
  // de plek op de baan voor een schermhoek (radialen, 0 = rechts, met de klok mee): de s waarvan de hoek vanuit het midden er het dichtst bij ligt
  function sVoor(hoek) {
    const doel = ((hoek % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let best = 0, bd = 1e9;
    for (let s = 0; s < lengte; s += 0.5) {
      const [x, y] = punt(s);
      const h = (Math.atan2(y - S / 2, x - S / 2) + 2 * Math.PI) % (2 * Math.PI);
      let d = Math.abs(h - doel); d = Math.min(d, 2 * Math.PI - d);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  return { punt, sVoor, lengte, S };
}

// Markers uit elkaar schuiven langs de baan: de boog blijft staan, de rest gaat weg van wie te dichtbij zit. items: [{ s, actief }], wijzigt s.
export function spreid(items, lengte, min = { actief: MIN_ACTIEF, punt: MIN_PUNT }) {
  const afstand = (a, b) => { const d = Math.abs(a - b) % lengte; return Math.min(d, lengte - d); };
  for (let ronde = 0; ronde < 40; ronde++) {
    let veranderd = false;
    for (const r of items) {
      if (r.actief) continue;
      for (const o of items) {
        if (o === r) continue;
        const nodig = o.actief ? min.actief : min.punt;
        const d = afstand(r.s, o.s);
        if (d < nodig) {
          let delta = ((r.s - o.s) % lengte + lengte) % lengte; if (delta > lengte / 2) delta -= lengte;
          r.s += (delta >= 0 ? 1 : -1) * (nodig - d + 0.5); veranderd = true;
        }
      }
    }
    if (!veranderd) break;
  }
  return items;
}

// De hele plaatsing: items [{ a (schermhoek in radialen), actief, ... }] -> dezelfde items met s, x, y; de boog eerst, daarna de punten uit elkaar.
// Hooguit één actief item; wie er meer heeft, krijgt de rest als punt.
export function plaats(items, S) {
  const b = baan(S);
  let gezien = false;
  const uit = items.map((i) => { const actief = !!i.actief && !gezien; if (actief) gezien = true; return { ...i, actief, s: b.sVoor(i.a) }; });
  spreid(uit, b.lengte);
  for (const i of uit) { const [x, y] = b.punt(i.s); i.x = x; i.y = y; }
  return { items: uit, baan: b };
}

// ------------------------------------------------------------------ tekenen
const paden = new Map();
function iconPaden(naam) {
  if (typeof Path2D === 'undefined') return [];
  let l = paden.get(naam);
  if (!l) { l = [...iconInner(naam, true).matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1])); paden.set(naam, l); }
  return l;
}
function icoon(ctx, naam, x, y, maat, kleur) {
  const l = iconPaden(naam);
  if (!l.length) return false;
  ctx.save();
  ctx.translate(x - maat / 2, y - maat / 2); ctx.scale(maat / 256, maat / 256);
  ctx.fillStyle = kleur;
  for (const p of l) ctx.fill(p);
  ctx.restore();
  return true;
}
function cirkel(ctx, x, y, r, vul, rand, breed) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (vul) { ctx.fillStyle = vul; ctx.fill(); }
  if (rand) { ctx.lineWidth = breed; ctx.strokeStyle = rand; ctx.stroke(); }
}
function boog(ctx, b, s, half, breed, kleur) {
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) { const [x, y] = b.punt(s - half + 2 * half * i / 28); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.lineWidth = breed; ctx.strokeStyle = kleur; ctx.stroke();
}
function plaatje(ctx, cx, cy, tekst, k) {
  ctx.font = "600 14px 'Barlow Condensed', 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
  const w = Math.max(44, ctx.measureText(tekst).width + 16), h = 22, x = cx - w / 2, y = cy - h / 2;
  const doos = (dx, dy) => { ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x + dx, y + dy, w, h, 5) : ctx.rect(x + dx, y + dy, w, h)); };
  doos(2, 2); ctx.fillStyle = k.inkt; ctx.fill();
  doos(0, 0); ctx.fillStyle = k.papier; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = k.inkt; ctx.stroke();
  ctx.fillStyle = k.inkt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tekst, cx, cy + 0.5);
}

// Tekent de kompasboog. S: kaartbreedte; items: [{ a, kleur, icoon, actief, tekst }]; opties: { t (seconden), beweging (false bij Beweging beperken) }.
// Geeft de geplaatste items terug (voor de test en de schermlezer).
export function drawKompasRand(ctx, S, items, opties = {}) {
  if (!items.length) return [];
  const k = { inkt: dsKleur('ink-inkt'), papier: dsKleur('ink-papier'), creme: dsKleur('creme') };
  const { items: geplaatst, baan: b } = plaats(items, S);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // de rustige stippellijn
  const rand = baan(S);
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) { const [x, y] = rand.punt(rand.lengte * i / 240); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath();
  ctx.setLineDash([0.1, 6.2]); ctx.lineWidth = 2.4; ctx.globalAlpha = 0.7; ctx.strokeStyle = k.creme; ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // punten: wachtend, medespelers en voertuigen
  for (const i of geplaatst.filter((q) => !q.actief)) {
    cirkel(ctx, i.x + 1.5, i.y + 1.5, 10.5, k.inkt);
    cirkel(ctx, i.x, i.y, 10.5, i.kleur, k.inkt, 2.8);
    icoon(ctx, i.icoon, i.x, i.y, 13, k.inkt);
  }
  // de boog van het doel dat je volgt
  for (const i of geplaatst.filter((q) => q.actief)) {
    ctx.save(); ctx.translate(2, 2); boog(ctx, b, i.s, 34, 12, k.inkt); ctx.restore();
    boog(ctx, b, i.s, 34, 12, k.creme); boog(ctx, b, i.s, 34, 9.4, k.inkt); boog(ctx, b, i.s, 34, 5.8, i.kleur);
    const puls = opties.beweging === false ? 0 : 0.5 + 0.5 * Math.sin((opties.t || 0) * 5);
    cirkel(ctx, i.x + 2, i.y + 2, 17, k.inkt);
    cirkel(ctx, i.x, i.y, 17 + puls * 0.8, i.kleur, k.inkt, 3.6);
    cirkel(ctx, i.x, i.y, 12, k.papier, k.inkt, 2.2);
    icoon(ctx, i.icoon, i.x, i.y, 16, k.inkt);
    if (i.tekst) {
      const dx = S / 2 - i.x, dy = S / 2 - i.y, l = Math.hypot(dx, dy) || 1;
      plaatje(ctx, Math.max(30, Math.min(S - 30, i.x + dx / l * 47)), Math.max(18, Math.min(S - 18, i.y + dy / l * 47)), i.tekst, k);
    }
  }
  ctx.restore();
  return geplaatst;
}

// De grote kaart (mapview.js): dezelfde taal op de plek van het doel zelf. Het doel dat je volgt is een rond icoon met de afstand eronder, wachtende doelen
// zijn kleine iconen. items: [{ sx, sy, kleur, icoon, actief, tekst, zonderSchijf }] in schermpixels; s: kaartschaal (1 = de maat van de minikaart).
// zonderSchijf: het doel heeft al zijn eigen pin (jouw waypoint): alleen het afstandsplaatje komt eronder.
export function drawKaartDoelen(ctx, items, opties = {}) {
  if (!items.length) return;
  const k = { inkt: dsKleur('ink-inkt'), papier: dsKleur('ink-papier'), creme: dsKleur('creme') };
  const s = opties.s || 1;
  ctx.save();
  for (const i of [...items.filter((q) => !q.actief), ...items.filter((q) => q.actief)]) {
    if (!i.actief) {
      cirkel(ctx, i.sx + 1.5 * s, i.sy + 1.5 * s, 10.5 * s, k.inkt);
      cirkel(ctx, i.sx, i.sy, 10.5 * s, i.kleur, k.inkt, 2.8 * s);
      icoon(ctx, i.icoon, i.sx, i.sy, 13 * s, k.inkt);
      continue;
    }
    if (!i.zonderSchijf) {
      const puls = opties.beweging === false ? 0 : 0.5 + 0.5 * Math.sin((opties.t || 0) * 5);
      cirkel(ctx, i.sx + 2 * s, i.sy + 2 * s, 17 * s, k.inkt);
      cirkel(ctx, i.sx, i.sy, (17 + puls * 0.8) * s, i.kleur, k.inkt, 3.6 * s);
      cirkel(ctx, i.sx, i.sy, 12 * s, k.papier, k.inkt, 2.2 * s);
      icoon(ctx, i.icoon, i.sx, i.sy, 16 * s, k.inkt);
    }
    if (i.tekst) plaatje(ctx, i.sx, i.sy + (i.zonderSchijf ? 14 : 30) * s, i.tekst, k);
  }
  ctx.restore();
}
