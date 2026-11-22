// UI-kritiekharnas: pure tripwire-logica (geen DOM). De verzamelaar (collector.mjs) levert per
// zichtbaar element een record; hier worden de records beoordeeld. Zie docs/UI-KRITIEK-HARNAS-22-11.md.

export const DREMPELS = {
  minFont: 11,            // px: kleiner is onleesbaar
  minContrast: 4.5,       // WCAG AA, gewone tekst
  minContrastGroot: 3,    // grote tekst (>= 24 px, of >= 18,66 px vet)
  overlapMinPx: 6,        // overlap smaller dan dit telt niet (randen die elkaar raken)
  overlapMinFractie: 0.15, // overlap moet minstens dit deel van het kleinste element zijn
  massaScherm: 1800,      // tekens op een scherm
  massaBlok: 450,         // tekens in een enkel element
  maxPerSoort: 40,        // voorbeelden per tripwire in index.json
};

const CODE_TERMEN = /\b(undefined|NaN|null|\[object [A-Za-z]+\]|Infinity)\b|=>|\bfunction\s*\(|\$\{|\{\{|\bTODO\b|\bFIXME\b|\bnull\b|\.js\b|_id\b/;

export function parseColor(s) {
  if (!s) return null;
  const m = String(s).match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.%]+))?\s*\)/);
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), a];
}

// Legt een kleur met alpha over een ondergrond (rgb) heen.
export function composite(fg, bg) {
  const a = fg[3] === undefined ? 1 : fg[3];
  return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a)));
}

export function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function intersectie(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? { w, h, area: w * h } : null;
}

const isNazaat = (recs, i, j) => { // is j een afstammeling van i?
  for (let p = recs[j].parent; p != null && p >= 0; p = recs[p].parent) if (p === i) return true;
  return false;
};

// Twee elementen met eigen inhoud (tekst, knop, plaatje) die over elkaar heen liggen.
export function boxOverlap(recs, d = DREMPELS) {
  const kand = [];
  recs.forEach((r, i) => { if (r.ownText || r.interactive || r.media) kand.push(i); });
  const uit = [];
  for (let a = 0; a < kand.length; a++) {
    for (let b = a + 1; b < kand.length; b++) {
      const i = kand[a], j = kand[b];
      const ri = recs[i], rj = recs[j];
      if (isNazaat(recs, i, j) || isNazaat(recs, j, i)) continue;
      if (ri.layer !== rj.layer) continue; // bewust gestapeld (andere z-laag of positioned overlay)
      const x = intersectie(ri.rect, rj.rect);
      if (!x || x.w < d.overlapMinPx || x.h < d.overlapMinPx) continue;
      const klein = Math.min(ri.rect.w * ri.rect.h, rj.rect.w * rj.rect.h) || 1;
      if (x.area / klein < d.overlapMinFractie) continue;
      uit.push({ a: ri.sel, b: rj.sel, px: Math.round(x.area), fractie: +(x.area / klein).toFixed(2) });
    }
  }
  return uit;
}

export function truncatedText(recs) {
  return recs.filter((r) => r.ownText && !r.scroller && r.clipsX && r.scrollW > r.clientW + 1)
    .map((r) => ({ sel: r.sel, scrollW: r.scrollW, clientW: r.clientW, text: r.ownText.slice(0, 60) }));
}

export function textMass(recs, d = DREMPELS) {
  const totaal = recs.reduce((s, r) => s + (r.ownText ? r.ownText.length : 0), 0);
  const zwaar = recs.filter((r) => r.ownText && r.ownText.length > d.massaBlok)
    .map((r) => ({ sel: r.sel, tekens: r.ownText.length }));
  return { totaal, zwaar, boven: totaal > d.massaScherm };
}

export function emptyBoxes(recs) {
  return recs.filter((r) => (r.hasBorder || r.hasBg) && r.childCount === 0 && !r.ownText && !r.media && !r.decor
    && r.rect.w >= 12 && r.rect.h >= 12)
    .map((r) => ({ sel: r.sel, w: Math.round(r.rect.w), h: Math.round(r.rect.h) }));
}

export function nativeScrollbars(recs) {
  return recs.filter((r) => r.scroller && r.scrolls && !r.customScrollbar)
    .map((r) => ({ sel: r.sel, scrollH: r.scrollH, clientH: r.clientH, scrollW: r.scrollW, clientW: r.clientW }));
}

export function smallText(recs, d = DREMPELS) {
  return recs.filter((r) => r.ownText && r.fontSize < d.minFont)
    .map((r) => ({ sel: r.sel, px: r.fontSize, text: r.ownText.slice(0, 40) }));
}

export function lowContrast(recs, d = DREMPELS) {
  const uit = [];
  for (const r of recs) {
    if (!r.ownText || !r.color || !r.bg || r.bgOnbekend) continue;
    const fg = composite(r.color, r.bg);
    const ratio = contrastRatio(fg, r.bg.slice(0, 3));
    const groot = r.fontSize >= 24 || (r.fontSize >= 18.66 && r.fontWeight >= 700);
    const grens = groot ? d.minContrastGroot : d.minContrast;
    if (ratio < grens) uit.push({ sel: r.sel, ratio: +ratio.toFixed(2), grens, text: r.ownText.slice(0, 40) });
  }
  return uit;
}

export function outOfFrame(recs, vw, vh) {
  return recs.filter((r) => !r.inScroller && (r.ownText || r.interactive || r.media)
    && (r.rect.x + r.rect.w > vw + 1 || r.rect.y + r.rect.h > vh + 1 || r.rect.x < -1 || r.rect.y < -1))
    .map((r) => ({ sel: r.sel, rect: [r.rect.x, r.rect.y, r.rect.w, r.rect.h].map(Math.round) }));
}

export function badText(recs) {
  return recs.filter((r) => r.ownText && CODE_TERMEN.test(r.ownText))
    .map((r) => ({ sel: r.sel, text: r.ownText.slice(0, 60) }));
}

export function unfocusable(recs) {
  return recs.filter((r) => r.interactive && !r.focusable && !r.disabled)
    .map((r) => ({ sel: r.sel, text: (r.ownText || '').slice(0, 30) }));
}

const SOORTEN = ['overlap', 'afgekapt', 'tekstmassa', 'leeg', 'scrollbar', 'klein', 'contrast', 'buitenKader', 'codeTekst', 'zonderFocus'];

// Alle tripwires voor een scherm. Geeft per soort { aantal, voorbeelden }.
export function analyseer(recs, { vw, vh } = { vw: 1280, vh: 720 }, d = DREMPELS) {
  const massa = textMass(recs, d);
  const ruw = {
    overlap: boxOverlap(recs, d), afgekapt: truncatedText(recs), tekstmassa: massa.zwaar, leeg: emptyBoxes(recs),
    scrollbar: nativeScrollbars(recs), klein: smallText(recs, d), contrast: lowContrast(recs, d),
    buitenKader: outOfFrame(recs, vw, vh), codeTekst: badText(recs), zonderFocus: unfocusable(recs),
  };
  const uit = { tekens: massa.totaal, tekstmassaBoven: massa.boven, elementen: recs.length, soorten: {} };
  for (const k of SOORTEN) uit.soorten[k] = { aantal: ruw[k].length, voorbeelden: ruw[k].slice(0, d.maxPerSoort) };
  if (massa.boven) uit.soorten.tekstmassa.aantal += 1;
  uit.totaal = SOORTEN.reduce((s, k) => s + uit.soorten[k].aantal, 0);
  return uit;
}

export { SOORTEN };
