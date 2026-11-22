// De doelmarkering aan de rand van de minimap (#1078; docs/MINIMAP-PIJLEN-21-11.md), compact (ronde 4): de minimale set.
//
// Het doel dat je volgt is één rond Phosphor-icoon (straal 10) half op de rand van de kaart (de schijf zit niet meer dan 1 px van de rand) met een kleine afstandstag (hooguit 40 x 16 px)
// er direct naast, aan de binnenkant (ronde 5: minder ruimte; zie docs/MINIMAP-PIJLEN-21-11.md §11). Wachtende doelen (hooguit twee), medespelers en eigen voertuigen zijn kleine ronde iconen op dezelfde rand. Geen lijn, geen boog, geen apart
// plaatje: de plek langs de rand is de richting. Markers schuiven uit elkaar en wijken voor de N-badge, het windschijfje en de hitte-chip (obstakels).
// Kleur zegt de rol (navtarget.js NAV_ROL), het icoon zegt het type: nooit alleen kleur.
//
// Twee delen: de meetkunde (puur, getest in scripts/navtarget_test.mjs) en het tekenen (canvas; zonder Path2D, zoals in node, vallen de iconen weg).
import { iconInner } from './icons.js';
import { dsKleur } from './kaartkleuren.js';

export const TRACK_INSET = 12; // afstand van het hart van een marker tot de kaartrand (px, op een kaart van 250): de schijf (straal 10, buitenstraal 11,8) zit 0,2 px van de rand
const TRACK_RADIUS = 14; // de hoeken van de baan
export const ACTIVE_R = 10; // de schijf van het doel dat je volgt (icoonstraal hooguit 10)
const HALO = 1.2; // het crème randje om de schijf
export const ACTIEF_UIT = ACTIVE_R + 0.6 + HALO; // buitenstraal van het doel dat je volgt (met puls en crème rand): 11,8
export const DOT_R = 7; // de punten (straal hooguit 7)
export const MIN_ACTIEF = 24; // afstand langs de baan tussen de schijf en een punt
export const MIN_DOT = 17; // afstand langs de baan tussen twee punten
export const MAX_ANDEREN = 3; // en hooguit zoveel medespelers en eigen voertuigen als punt
export const TAG_H = 16; // de afstandstag: 13 px tekst (de DS3-vloer), hooguit 40 x 16 px
export const TAG_W_MAX = 40;
const TAG_PADDING = 2; // links en rechts van de tekst
export const TAG_GAP = 2; // tussen schijf en tag
export const TAG_TEKST_PX = 13;

// De tag-maat uit de tekstbreedte (puur, getest). De tekst wordt bij het tekenen op de binnenbreedte geperst als hij toch te breed is.
export const tagMaat = (tekstBreedte) => ({ w: Math.min(TAG_W_MAX, Math.ceil(tekstBreedte) + 2 * TAG_PADDING), h: TAG_H });
// De ruimte die het doel dat je volgt inneemt (px2): schijf met rand en harde schaduw plus tag. Het budget van ronde 5 (navtarget_test).
export const activeArea = (tekstBreedte) => { const t = tagMaat(tekstBreedte), r = ACTIEF_UIT; return Math.round(Math.PI * r * r + t.w * t.h); };

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
  // zitten twee obstakels zo dicht bij elkaar (N-badge naast het windschijfje, in een hoek) dat het uit elkaar schuiven vastloopt, dan zoekt een marker de dichtstbijzijnde vrije plek
  // op de baan (de echte cirkels van de obstakels, niet alleen de afstand langs de baan)
  const cirkels = obstakels.map((o) => obstakelCirkel(o, S)).filter(Boolean);
  if (cirkels.length) {
    const vrij = (i, s) => { const [x, y] = b.punt(s); return cirkels.every((c) => Math.hypot(x - c.x, y - c.y) >= (i.actief ? ACTIEF_UIT : DOT_R + 1.2) + c.r - 0.3); };
    const langs = (p, q) => { const d = Math.abs(p - q) % b.lengte; return Math.min(d, b.lengte - d); };
    const gezet = [];
    for (const i of [...uit].sort((p, q) => Number(q.actief) - Number(p.actief))) {
      const vrijVan = (s) => gezet.every((g) => langs(s, g.s) >= (i.actief || g.actief ? MIN_ACTIEF : MIN_DOT) - 0.6);
      if (!(vrij(i, i.s) && vrijVan(i.s))) {
        for (let k = 1; k < b.lengte / 2; k++) {
          const kies = [i.s + k, i.s - k].find((s) => vrij(i, s) && vrijVan(s));
          if (kies !== undefined) { i.s = ((kies % b.lengte) + b.lengte) % b.lengte; break; }
        }
      }
      gezet.push(i);
    }
  }
  for (const i of uit) { const [x, y] = b.punt(i.s); i.x = x; i.y = y; }
  return { items: uit, baan: b };
}

// Waar de tag komt: aan de kant van de kaart waar de schijf zit (aan de linkerrand: rechts van de schijf; bovenaan: eronder), tegen de schijf aan en binnen de kaart geklemd.
export function tagPlace(x, y, S, w, h, r = ACTIEF_UIT, hindernis = []) {
  const d = [x, y, S - x, S - y];
  const kant = d.indexOf(Math.min(...d)); // 0 links, 1 boven, 2 rechts, 3 onder
  const klem = (cx, cy) => ({ cx: Math.max(w / 2 + 2, Math.min(S - w / 2 - 2, cx)), cy: Math.max(h / 2 + 2, Math.min(S - h / 2 - 2, cy)), kant });
  const naar = r + TAG_GAP;
  // de kandidaten: eerst naar binnen, tegen de schijf (de gewone plek); raakt dat een hindernis (N-badge, windschijf, een punt), dan langs de rand ernaast, aan beide
  // kanten, en als ook dat niet past een stap verder naar binnen en opzij. Wie het minst raakt en het dichtst bij de schijf staat wint.
  const kandidaten = [];
  const naarBinnen = (e) => (kant === 0 ? klem(x + naar + w / 2 + e, y) : kant === 2 ? klem(x - naar - w / 2 - e, y) : kant === 1 ? klem(x, y + naar + h / 2 + e) : klem(x, y - naar - h / 2 - e));
  kandidaten.push(naarBinnen(0));
  if (hindernis.length) {
    const rand = kant === 0 || kant === 2;
    const langs = (o, e) => { const c = naarBinnen(e); return rand ? klem(c.cx, y + o) : klem(x + o, c.cy); };
    const flush = rand ? h / 2 + naar : w / 2 + naar;
    for (const o of [flush, -flush]) kandidaten.push(rand ? klem(x, y + o) : klem(x + o, y));
    for (const e of [0, 10, 20, 30, 40]) for (const o of [12, -12, 24, -24, 36, -36, 48, -48, 60, -60]) kandidaten.push(langs(o, e));
  }
  const alle = [...hindernis, { x, y, r: naar - 0.5 }]; // ook de eigen schijf: een tag die in de hoek geklemd op de schijf valt is geen keuze
  const raakt = (c) => alle.filter((o) => rectCirkel(c.cx - w / 2, c.cy - h / 2, w, h, o)).length;
  let best = kandidaten[0], bs = 1e9;
  for (const c of kandidaten) { const sc = raakt(c) * 1000 + Math.hypot(c.cx - kandidaten[0].cx, c.cy - kandidaten[0].cy); if (sc < bs) { bs = sc; best = c; } }
  return best;
}
// Raakt de rechthoek (x, y, w, h) de cirkel o { x, y, r }?
export function rectCirkel(x, y, w, h, o) {
  const px = Math.max(x, Math.min(o.x, x + w)), py = Math.max(y, Math.min(o.y, y + h));
  return Math.hypot(px - o.x, py - o.y) < o.r;
}
// De cirkel van een obstakel ({ a, nodig, r, inset } of { x, y, r }): de N-badge ligt op `inset` px van de rand in de richting a, het windschijfje op een vaste plek.
export function obstakelCirkel(o, S) {
  if (!o.r) return null;
  if (Number.isFinite(o.x)) return { x: o.x, y: o.y, r: o.r };
  const half = S / 2 - (o.inset || 0), dx = Math.cos(o.a), dy = Math.sin(o.a);
  const t = Math.min(half / (Math.abs(dx) || 1e-6), half / (Math.abs(dy) || 1e-6));
  return { x: S / 2 + dx * t, y: S / 2 + dy * t, r: o.r };
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
  ctx.font = `600 ${TAG_TEKST_PX}px 'Barlow Condensed', 'Bebas Neue', 'Arial Narrow', Arial, sans-serif`;
  return tagMaat(ctx.measureText(tekst).width);
}
function tag(ctx, cx, cy, w, h, tekst, k) {
  const x = cx - w / 2, y = cy - h / 2;
  const doos = (dx, dy) => { ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x + dx, y + dy, w, h, 4) : ctx.rect(x + dx, y + dy, w, h)); };
  doos(1, 1); ctx.fillStyle = k.inkt; ctx.fill();
  doos(0, 0); ctx.fillStyle = k.papier; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = k.inkt; ctx.stroke();
  ctx.fillStyle = k.inkt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tekst, cx, cy + 0.5, w - 2 * TAG_PADDING + 2);
}
// Een schijf: harde schaduw, kleur met inktrand, het icoon in inkt erin.
function schijf(ctx, k, x, y, r, kleur, naam, pulse = 0) {
  cirkel(ctx, x + 1, y + 1, r, k.inkt);
  cirkel(ctx, x, y, r + pulse, kleur, k.inkt, 2.2);
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
    cirkel(ctx, i.x, i.y, ACTIEF_UIT, k.creme); // een crème randje: de schijf leest ook op donker land
    schijf(ctx, k, i.x, i.y, ACTIVE_R, i.kleur, i.icoon, puls);
    if (i.tekst) {
      const g = tagGrootte(ctx, i.tekst);
      const hindernis = [...(opties.obstakels || []).map((o) => obstakelCirkel(o, S)).filter(Boolean), ...geplaatst.filter((q) => !q.actief).map((q) => ({ x: q.x, y: q.y, r: DOT_R + 1.2 }))];
      const p = tagPlace(i.x, i.y, S, g.w, g.h, ACTIEF_UIT, hindernis);
      tag(ctx, p.cx, p.cy, g.w, g.h, i.tekst, k);
    }
  }
  ctx.restore();
  return geplaatst;
}

// De grote kaart (mapview.js): dezelfde taal op de plek van het doel zelf. Het doel dat je volgt is een rond icoon met de afstandstag eronder, wachtende doelen
// zijn kleine iconen. items: [{ sx, sy, kleur, icoon, actief, tekst, zonderSchijf }] in schermpixels; s: kaartschaal (1 = de maat van de minikaart).
// zonderSchijf: het doel heeft al zijn eigen pin (jouw routepunt): alleen de tag komt eronder.
export function drawMapTargets(ctx, items, opties = {}) {
  if (!items.length) return;
  const k = { inkt: dsKleur('ink-inkt'), papier: dsKleur('ink-papier'), creme: dsKleur('creme') };
  const s = opties.s || 1;
  ctx.save();
  for (const i of [...items.filter((q) => !q.actief), ...items.filter((q) => q.actief)]) {
    if (!i.actief) { schijf(ctx, k, i.sx, i.sy, DOT_R * s, i.kleur, i.icoon); continue; }
    const puls = opties.beweging === false ? 0 : 0.6 * (0.5 + 0.5 * Math.sin((opties.t || 0) * 5));
    if (!i.zonderSchijf) { cirkel(ctx, i.sx, i.sy, ACTIEF_UIT * s, k.creme); schijf(ctx, k, i.sx, i.sy, ACTIVE_R * s, i.kleur, i.icoon, puls); }
    if (i.tekst) {
      const g = tagGrootte(ctx, i.tekst);
      tag(ctx, i.sx, i.sy + (i.zonderSchijf ? 14 : ACTIEF_UIT * s + TAG_GAP + g.h / 2), g.w, g.h, i.tekst, k);
    }
  }
  ctx.restore();
}
