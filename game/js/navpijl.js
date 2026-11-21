// De doelmarkering aan de rand van de minimap (#1078; docs/MINIMAP-PIJLEN-21-11.md), compact (ronde 4): de minimale set.
//
// Het doel dat je volgt is één rond Phosphor-icoon direct tegen de rand van de kaart (vaste inzet van 3 px) met een kleine afstandstag er direct naast, aan de
// binnenkant. Wachtende doelen (hooguit twee), medespelers en eigen voertuigen zijn kleine ronde iconen op dezelfde rand. Geen lijn, geen boog, geen apart
// plaatje: de plek langs de rand is de richting. Markers schuiven uit elkaar en wijken voor de N-badge, het windschijfje en de hitte-chip (obstakels).
// Kleur zegt de rol (navtarget.js NAV_ROL), het icoon zegt het type: nooit alleen kleur.
//
// Twee delen: de meetkunde (puur, getest in scripts/navtarget_test.mjs) en het tekenen (canvas; zonder Path2D, zoals in node, vallen de iconen weg).
import { iconInner } from './icons.js';
import { dsKleur } from './kaartkleuren.js';

export const TRACK_INSET = 15; // afstand van het hart van een marker tot de kaartrand (px, op een kaart van 250): de schijf (straal 12) zit 3 px van de rand
export const TRACK_RADIUS = 16; // de hoeken van de baan
export const ACTIVE_R = 12; // de schijf van het doel dat je volgt
export const DOT_R = 8.5; // de punten
export const MIN_ACTIEF = 30; // afstand langs de baan tussen de schijf en een punt
export const MIN_DOT = 21; // afstand langs de baan tussen twee punten
export const MAX_WACHTEND = 2; // hooguit zoveel wachtende doelen (navtarget.js MAX_SECUNDAIR); medespelers en voertuigen tellen daar niet bij
export const MAX_ANDEREN = 3; // en hooguit zoveel medespelers en eigen voertuigen als punt
export const TAG_H = 17; // de afstandstag: 13 px tekst
export const TAG_GAP = 3; // tussen schijf en tag

// ------------------------------------------------------------------ meetkunde
// Een afgeronde vierkante baan met de klok mee vanaf het begin van de bovenrand. S: de breedte van de kaart.
export function track(S, inset = TRACK_INSET, radius = TRACK_RADIUS) {
  const a = inset, b = S - inset, r = radius, w = b - a - 2 * r;
  const piece = [w, Math.PI * r / 2, w, Math.PI * r / 2, w, Math.PI * r / 2, w, Math.PI * r / 2];
  const lengte = piece.reduce((p, q) => p + q, 0);
  function dot(s) {
    s = ((s % lengte) + lengte) % lengte;
    let i = 0; while (i < 7 && s > piece[i]) { s -= piece[i]; i++; }
    const t = s / piece[i];
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
    const target = ((hoek % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let best = 0, bd = 1e9;
    for (let s = 0; s < lengte; s += 0.5) {
      const [x, y] = dot(s);
      const h = (Math.atan2(y - S / 2, x - S / 2) + 2 * Math.PI) % (2 * Math.PI);
      let d = Math.abs(h - target); d = Math.min(d, 2 * Math.PI - d);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  return { punt: dot, sVoor, lengte, S };
}

// Markers uit elkaar schuiven langs de baan: het doel dat je volgt blijft voor punten staan (alleen vaste obstakels duwen hem weg), de rest gaat weg van wie te dichtbij zit. Vaste obstakels ({ vast, nodig, s })
// bewegen niet en houden `nodig` px afstand. items: [{ s, actief }], wijzigt s.
export function spreid(items, lengte, min = { actief: MIN_ACTIEF, punt: MIN_DOT }) {
  const distance = (a, b) => { const d = Math.abs(a - b) % lengte; return Math.min(d, lengte - d); };
  for (let ronde = 0; ronde < 60; ronde++) {
    let veranderd = false;
    for (const r of items) {
      if (r.vast) continue;
      for (const o of items) {
        if (o === r || (r.actief && !o.vast)) continue; // het doel dat je volgt wijkt alleen voor vaste obstakels (N-badge, wind), nooit voor punten
        const nodig = o.vast ? o.nodig : o.actief ? min.actief : min.punt;
        const d = distance(r.s, o.s);
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

// De hele plaatsing: items [{ a (schermhoek in radialen), actief, ... }] -> dezelfde items met s, x, y. Hooguit één actief item; wie er meer heeft, krijgt de rest
// als punt. obstakels: [{ a (schermhoek), nodig (px langs de baan) }]: vaste dingen op of bij de rand (N-badge, wind, hitte-chip) waar markers omheen schuiven.
export function place(items, S, obstakels = []) {
  const b = track(S);
  let gezien = false;
  const uit = items.map((i) => { const actief = !!i.actief && !gezien; if (actief) gezien = true; return { ...i, actief, s: b.sVoor(i.a) }; });
  const vast = obstakels.map((o) => ({ vast: true, nodig: o.nodig, s: b.sVoor(o.a) }));
  spreid([...uit, ...vast], b.lengte);
  for (const i of uit) { const [x, y] = b.punt(i.s); i.x = x; i.y = y; }
  return { items: uit, baan: b };
}

// Waar de tag komt: aan de kant van de kaart waar de schijf zit (aan de linkerrand: rechts van de schijf; bovenaan: eronder), tegen de schijf aan en binnen de kaart geklemd.
export function tagPlek(x, y, S, w, h, r = ACTIVE_R) {
  const d = [x, y, S - x, S - y];
  const kant = d.indexOf(Math.min(...d)); // 0 links, 1 boven, 2 rechts, 3 onder
  let cx = x, cy = y;
  if (kant === 0) cx = x + r + TAG_GAP + w / 2; else if (kant === 2) cx = x - r - TAG_GAP - w / 2;
  else if (kant === 1) cy = y + r + TAG_GAP + h / 2; else cy = y - r - TAG_GAP - h / 2;
  return { cx: Math.max(w / 2 + 2, Math.min(S - w / 2 - 2, cx)), cy: Math.max(h / 2 + 2, Math.min(S - h / 2 - 2, cy)), kant };
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
// De tag: de afstand als kleine tekst (13 px) in een krappe papieren pil direct naast de schijf.
function tagGrootte(ctx, tekst) {
  ctx.font = "600 13px 'Barlow Condensed', 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
  return { w: Math.ceil(ctx.measureText(tekst).width) + 9, h: TAG_H };
}
function tag(ctx, cx, cy, w, h, tekst, k) {
  const x = cx - w / 2, y = cy - h / 2;
  const doos = (dx, dy) => { ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x + dx, y + dy, w, h, 4) : ctx.rect(x + dx, y + dy, w, h)); };
  doos(1.5, 1.5); ctx.fillStyle = k.inkt; ctx.fill();
  doos(0, 0); ctx.fillStyle = k.papier; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = k.inkt; ctx.stroke();
  ctx.fillStyle = k.inkt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tekst, cx, cy + 0.5);
}
// Een schijf: harde schaduw, kleur met inktrand, het icoon in inkt erin.
function schijf(ctx, k, x, y, r, kleur, naam, pulse = 0) {
  cirkel(ctx, x + 1.5, y + 1.5, r, k.inkt);
  cirkel(ctx, x, y, r + pulse, kleur, k.inkt, 2.4);
  icoon(ctx, naam, x, y, r * 1.05, k.inkt);
}

// Tekent de randmarkeringen. S: kaartbreedte; items: [{ a, kleur, icoon, actief, tekst }];
// opties: { t (seconden), beweging (false bij Beweging beperken), obstakels (zie place) }. Geeft de geplaatste items terug (voor de test).
export function drawKompasRand(ctx, S, items, opties = {}) {
  if (!items.length) return [];
  const k = { inkt: dsKleur('ink-inkt'), papier: dsKleur('ink-papier'), creme: dsKleur('creme') };
  const { items: geplaatst } = place(items, S, opties.obstakels || []);
  ctx.save();
  for (const i of geplaatst.filter((q) => !q.actief)) schijf(ctx, k, i.x, i.y, DOT_R, i.kleur, i.icoon);
  for (const i of geplaatst.filter((q) => q.actief)) {
    const puls = opties.beweging === false ? 0 : 0.6 * (0.5 + 0.5 * Math.sin((opties.t || 0) * 5));
    cirkel(ctx, i.x, i.y, ACTIVE_R + 1.6, k.creme); // een crème randje: de schijf leest ook op donker land
    schijf(ctx, k, i.x, i.y, ACTIVE_R, i.kleur, i.icoon, puls);
    if (i.tekst) { const g = tagGrootte(ctx, i.tekst); const p = tagPlek(i.x, i.y, S, g.w, g.h); tag(ctx, p.cx, p.cy, g.w, g.h, i.tekst, k); }
  }
  ctx.restore();
  return geplaatst;
}

// De grote kaart (mapview.js): dezelfde taal op de plek van het doel zelf. Het doel dat je volgt is een rond icoon met de afstandstag eronder, wachtende doelen
// zijn kleine iconen. items: [{ sx, sy, kleur, icoon, actief, tekst, zonderSchijf }] in schermpixels; s: kaartschaal (1 = de maat van de minikaart).
// zonderSchijf: het doel heeft al zijn eigen pin (jouw waypoint): alleen de tag komt eronder.
export function drawMapTargets(ctx, items, opties = {}) {
  if (!items.length) return;
  const k = { inkt: dsKleur('ink-inkt'), papier: dsKleur('ink-papier'), creme: dsKleur('creme') };
  const s = opties.s || 1;
  ctx.save();
  for (const i of [...items.filter((q) => !q.actief), ...items.filter((q) => q.actief)]) {
    if (!i.actief) { schijf(ctx, k, i.sx, i.sy, DOT_R * s, i.kleur, i.icoon); continue; }
    const puls = opties.beweging === false ? 0 : 0.6 * (0.5 + 0.5 * Math.sin((opties.t || 0) * 5));
    if (!i.zonderSchijf) { cirkel(ctx, i.sx, i.sy, (ACTIVE_R + 1.6) * s, k.creme); schijf(ctx, k, i.sx, i.sy, ACTIVE_R * s, i.kleur, i.icoon, puls); }
    if (i.tekst) {
      const g = tagGrootte(ctx, i.tekst);
      tag(ctx, i.sx, i.sy + (i.zonderSchijf ? 14 : (ACTIVE_R + 1.6) * s + TAG_GAP + g.h / 2), g.w, g.h, i.tekst, k);
    }
  }
  ctx.restore();
}
