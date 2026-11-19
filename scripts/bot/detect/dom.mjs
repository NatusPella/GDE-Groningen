// Detector (a): de DOM-audit van de proefspeler. Twee helften in één bestand zonder imports (run.mjs plakt het als
// window.__botDetect in de pagina, zoals mens.mjs):
//   snapshotDom(doc, win)  page-kant: verzamelt de zichtbare spelerstekst (HUD, ondertitel, prompt, doelkaart) met rects,
//                          lettergrootte, kleur en achtergrond. Gebruikt alleen doc.querySelectorAll, getBoundingClientRect
//                          en win.getComputedStyle: scripts/proef_detect_test.mjs voedt het met een nepdocument.
//   auditDom(snap, opts)   pure kant: afgekapte tekst, '…', buiten beeld, overlap, lettergrootte onder de vloer, laag contrast.
// Regels: .specs-fire/standards/ui-taal.md (13 px menu en HUD, 12 px harde ondergrens).

export const DOM_WORTELS = ['#hud', '#cine', '#story-talk', '.hud-ctx', '.hud-prompts', '#dialog', '[data-dialog]'];
export const DOM_MAX = 220;

// '#rrggbb', 'rgb(r, g, b)' of 'rgba(r, g, b, a)' naar [r, g, b, a]; null als het niet te lezen is
export function parseColor(s) {
  if (Array.isArray(s)) return s;
  const x = String(s || '').trim().toLowerCase();
  if (!x || x === 'transparent') return [0, 0, 0, 0];
  let m = x.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) { const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
  m = x.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/);
  if (!m) return null;
  const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return [Number(m[1]), Number(m[2]), Number(m[3]), a];
}

// een kleur met alpha over een ondergrond leggen (ondergrond dekt volledig)
export function blendColor(fg, bg) {
  const a = fg[3] == null ? 1 : fg[3];
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat([1]);
}

// relatieve luminantie en contrastverhouding volgens WCAG 2.x
export function luminance(c) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100;
}

const zichtbaar = (cs, r) => r.width >= 1 && r.height >= 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05;
const eigenTekst = (el) => { let t = ''; for (const n of el.childNodes || []) if (n.nodeType === 3) t += n.textContent; return t.replace(/\s+/g, ' ').trim(); };
const kort = (s, n = 90) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

// De effectieve achtergrond: de eerste voorouder met een dekkende (of bijna dekkende) achtergrond; halfdoorzichtige lagen worden gemengd.
// Is er geen dekkende voorouder, dan ligt de tekst over de wereld en is het contrast niet te beoordelen: bg = null.
function achtergrond(el, win) {
  const lagen = [];
  for (let e = el, n = 0; e && n < 12; e = e.parentElement, n++) {
    const c = parseColor(win.getComputedStyle(e).backgroundColor);
    if (c && c[3] > 0.02) { lagen.push(c); if (c[3] >= 0.98) break; }
  }
  if (!lagen.length || lagen[lagen.length - 1][3] < 0.98) return null;
  let bg = lagen[lagen.length - 1];
  for (let i = lagen.length - 2; i >= 0; i--) bg = blendColor(lagen[i], bg);
  return bg;
}

// De snapshot: elk zichtbaar element onder de HUD-wortels dat zelf tekst draagt. `parent` is de index van de dichtstbijzijnde
// voorouder in de lijst (voor de overlapcontrole: een kind overlapt zijn ouder altijd).
export function snapshotDom(doc, win, { wortels = DOM_WORTELS, max = DOM_MAX } = {}) {
  const vw = win.innerWidth, vh = win.innerHeight, els = [], index = new Map();
  const gezien = new Set();
  for (const w of wortels) {
    let lijst = [];
    try { lijst = [...doc.querySelectorAll(`${w}, ${w} *`)]; } catch (e) { lijst = []; }
    for (const el of lijst) {
      if (gezien.has(el) || els.length >= max) continue;
      gezien.add(el);
      const tekst = eigenTekst(el);
      if (!tekst) continue;
      const cs = win.getComputedStyle(el), r = el.getBoundingClientRect();
      if (!zichtbaar(cs, r)) continue;
      let ouder = -1;
      for (let p = el.parentElement; p; p = p.parentElement) if (index.has(p)) { ouder = index.get(p); break; }
      index.set(el, els.length);
      els.push({
        i: els.length, parent: ouder, wortel: w, sel: (el.tagName || '').toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        tekst: kort(tekst, 160), rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight,
        overflow: cs.overflow + '|' + cs.overflowX + '|' + cs.overflowY, ellipsis: cs.textOverflow === 'ellipsis', clamp: !!(cs.webkitLineClamp && cs.webkitLineClamp !== 'none'),
        fontPx: Math.round(parseFloat(cs.fontSize) * 10) / 10, gewicht: Number(cs.fontWeight) || 400,
        kleur: parseColor(cs.color), bg: achtergrond(el, win),
      });
    }
  }
  return { vw, vh, els };
}

const inter = (a, b) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};
const isVoorouder = (els, a, b) => { for (let p = els[b].parent; p >= 0; p = els[p].parent) if (p === a) return true; return false; };

// Alle bevindingen in een snapshot. Elke bevinding: { type, ernst, tekst, sel, bewijs }. ernst: 'verwarrend' of 'cosmetisch'
// (de triage zet er 'blokkeert' bij als de tekst een doel of keuze draagt). Opties: vloer (12), norm (13), contrast (4.5), contrastGroot (3),
// overlap (0,2 van het kleinste element), rand (2 px speling aan de schermrand).
export function auditDom(snap, { vloer = 12, norm = 13, contrast = 4.5, contrastGroot = 3, overlap = 0.2, rand = 2, minOverlapPx = 80 } = {}) {
  const uit = [], { vw, vh, els } = snap;
  const meld = (e, type, ernst, bewijs) => uit.push({ type, ernst, tekst: e.tekst, sel: e.sel, rect: e.rect, bewijs });
  for (const e of els) {
    // afgekapt: de inhoud is groter dan het vak en het vak knipt af
    const knipt = /hidden|clip/.test(e.overflow) || e.ellipsis || e.clamp;
    if (knipt && e.scrollW > e.clientW + 1 && e.clientW > 0) meld(e, 'dom-afgekapt', 'verwarrend', { scrollW: e.scrollW, clientW: e.clientW });
    else if (knipt && e.scrollH > e.clientH + 2 && e.clientH > 0 && (e.ellipsis || e.clamp || /hidden/.test(e.overflow))) meld(e, 'dom-afgekapt', 'verwarrend', { scrollH: e.scrollH, clientH: e.clientH });
    // een beletselteken in de tekst die de speler ziet (alleen een losse '…' is een wachtindicator)
    if (/[…]|\.\.\./.test(e.tekst) && e.tekst.replace(/[….\s]/g, '').length >= 3) meld(e, 'dom-beletselteken', 'cosmetisch', { eind: /([…]|\.\.\.)$/.test(e.tekst) });
    // buiten het scherm
    const r = e.rect, uitL = Math.max(0, -r.x), uitR = Math.max(0, r.x + r.w - vw), uitT = Math.max(0, -r.y), uitB = Math.max(0, r.y + r.h - vh);
    if (uitL > rand || uitR > rand || uitT > rand || uitB > rand) {
      const deel = 1 - (Math.max(0, Math.min(r.x + r.w, vw) - Math.max(r.x, 0)) * Math.max(0, Math.min(r.y + r.h, vh) - Math.max(r.y, 0))) / Math.max(1, r.w * r.h);
      meld(e, 'dom-buiten-beeld', deel > 0.5 ? 'verwarrend' : 'cosmetisch', { links: uitL, rechts: uitR, boven: uitT, onder: uitB, deelBuiten: Math.round(deel * 100) / 100 });
    }
    // te klein
    if (e.fontPx < vloer) meld(e, 'dom-lettergrootte', 'verwarrend', { fontPx: e.fontPx, vloer });
    else if (e.fontPx < norm) meld(e, 'dom-lettergrootte-norm', 'cosmetisch', { fontPx: e.fontPx, norm, noot: 'onder 13 px mag alleen als uitzondering (ui-taal.md)' });
    // contrast (alleen met een bekende, dekkende achtergrond)
    if (e.kleur && e.bg) {
      const fg = blendColor(e.kleur, e.bg), ratio = contrastRatio(fg, e.bg);
      const groot = e.fontPx >= 24 || (e.fontPx >= 18.66 && e.gewicht >= 700);
      const drempel = groot ? contrastGroot : contrast;
      if (ratio < drempel) meld(e, 'dom-contrast', ratio < 2 ? 'verwarrend' : 'cosmetisch', { ratio, drempel, kleur: e.kleur.slice(0, 3), bg: e.bg.slice(0, 3) });
    }
  }
  // overlap tussen elementen die niet in elkaar zitten
  for (let a = 0; a < els.length; a++) for (let b = a + 1; b < els.length; b++) {
    if (isVoorouder(els, a, b) || isVoorouder(els, b, a)) continue;
    const ov = inter(els[a].rect, els[b].rect), klein = Math.min(els[a].rect.w * els[a].rect.h, els[b].rect.w * els[b].rect.h);
    if (ov >= minOverlapPx && klein > 0 && ov / klein >= overlap) {
      uit.push({ type: 'dom-overlap', ernst: ov / klein > 0.5 ? 'verwarrend' : 'cosmetisch', tekst: `${els[a].tekst} / ${els[b].tekst}`, sel: `${els[a].sel} x ${els[b].sel}`, rect: els[a].rect, bewijs: { deel: Math.round((ov / klein) * 100) / 100, a: els[a].tekst, b: els[b].tekst } });
    }
  }
  return uit;
}

// Dubbele meldingen binnen één snapshot wegfilteren (dezelfde tekst en soort): een prompt die op twee plekken staat is één bevinding.
export function dedupeDom(items) {
  const g = new Set();
  return items.filter((i) => { const k = i.type + '|' + i.tekst; if (g.has(k)) return false; g.add(k); return true; });
}
