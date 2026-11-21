// Writes the logo files and the Steam and social art as SVG (issue 1003, ADR 0040, DESIGN_SYSTEM.md):
//   website/brand/   logo-kleur, logo-inkt (one ink), logo-klein (calm: flat, no misprint, no subtitle), social-card
//   steam/art/       the Steam store and library sizes (header, capsules, library hero and logo)
// Letters are paths from the self-hosted Barlow Condensed ExtraBold (SIL OFL 1.1), so no file needs a font;
// flat fills only (no blur, no gradient, no raster, no screenshots, no real brand). Same ink set as the icon.
//   node desktop/scripts/make-brand-assets.cjs
const fs = require('fs');
const path = require('path');
const { textPath, capHeight, INK } = require('./make-icon-svg.cjs');

const ROOT = path.join(__dirname, '..', '..');
const SUB = 'Zomer vol misdaad';

// The mark in its own units (origin top left). variant: 'kleur' | 'inkt' | 'klein'.
function mark(variant) {
  const calm = variant === 'klein', mono = variant === 'inkt';
  const S = 300, gde = textPath('GDE', S, 4), W = Math.round(gde.width), cap = capHeight(S);
  const off = calm ? 0 : Math.round(S * 0.035);
  const base = mono ? INK.inkt : INK.bordgroen;
  const gron = textPath('GRONINGEN', 100, 6), gs = 100 * (W * 0.94) / gron.width;
  const gp = textPath('GRONINGEN', gs, gs * 0.06), plateH = Math.round(capHeight(gs) + gs * 0.5);
  const plateY = Math.round(cap + off + 22);
  const sub = textPath(SUB.toUpperCase(), 40, 4), ss = 40 * W / sub.width * (calm ? 0 : 0.9);
  const sp = calm ? null : textPath(SUB.toUpperCase(), ss, ss * 0.1);
  const subY = plateY + plateH + 30 + Math.round(capHeight(ss));
  const H = calm ? plateY + plateH : subY;
  const plateFill = mono ? INK.inkt : INK.bordgroen;
  let s = `<g>`;
  if (!calm && !mono) s += `<path d="${gde.d}" fill="${INK.roze}" transform="translate(${off} ${cap + off})"/>`;
  s += `<path d="${gde.d}" fill="${base}" transform="translate(0 ${cap})"/>`;
  s += `<rect x="0" y="${plateY}" width="${W}" height="${plateH}" fill="${plateFill}"/>`;
  s += `<path d="${gp.d}" fill="${INK.papier}" transform="translate(${((W - gp.width) / 2).toFixed(1)} ${(plateY + (plateH + capHeight(gs)) / 2).toFixed(1)})"/>`;
  if (sp) s += `<path d="${sp.d}" fill="${INK.inkt}" transform="translate(${((W - sp.width) / 2).toFixed(1)} ${subY})"/>`;
  s += '</g>';
  return { svg: s, w: W + off, h: H + off };
}

const head = (w, h, title, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">
<!-- ${title}. Zomerse zeefdruk (ADR 0040), vlakke vlakken, letters als paden (Barlow Condensed ExtraBold, SIL OFL 1.1); gemaakt met desktop/scripts/make-brand-assets.cjs. ${extra}-->
`;
function place(m, cx, cy, boxW, boxH) {
  const k = Math.min(boxW / m.w, boxH / m.h);
  return `<g transform="translate(${(cx - m.w * k / 2).toFixed(1)} ${(cy - m.h * k / 2).toFixed(1)}) scale(${k.toFixed(4)})">${m.svg}</g>\n`;
}
// a paper card with an ink edge, hard shadow and a yellow plate along the foot, with the mark on it
function card(w, h, { logo = 'kleur', tag = true, margin = 0.1, plate = 0.16 } = {}) {
  const m = mark(logo), e = Math.max(2, Math.round(h * 0.012)), sh = Math.round(h * 0.03);
  const ph = tag ? Math.round(h * plate) : 0;
  let s = head(w, h, `GDE Groningen, ${SUB} (${w} x ${h})`);
  s += `<rect width="${w}" height="${h}" fill="${INK.papier}"/>\n`;
  if (ph) s += `<rect x="0" y="${h - ph}" width="${w}" height="${ph}" fill="${INK.geel}"/>\n<rect x="0" y="${h - ph}" width="${w}" height="${e}" fill="${INK.inkt}"/>\n`;
  s += place(m, w / 2, (h - ph) / 2, w * (1 - 2 * margin), (h - ph) * (1 - 2 * margin));
  s += `<rect x="${e / 2}" y="${e / 2}" width="${w - e}" height="${h - e}" fill="none" stroke="${INK.inkt}" stroke-width="${e}"/>\n</svg>\n`;
  void sh;
  return s;
}
function loose(variant, pad = 24) {
  const m = mark(variant);
  return head(m.w + 2 * pad, m.h + 2 * pad, `GDE Groningen woordmerk (${variant})`) + `<g transform="translate(${pad} ${pad})">${m.svg}</g>\n</svg>\n`;
}

const FILES = {
  'website/brand/logo-kleur.svg': loose('kleur'),
  'website/brand/logo-inkt.svg': loose('inkt'),
  'website/brand/logo-klein.svg': loose('klein', 8),
  'website/brand/social-card.svg': card(1200, 630, { margin: 0.12 }),
  'steam/art/header-capsule-460x215.svg': card(460, 215, { margin: 0.1 }),
  'steam/art/small-capsule-231x87.svg': card(231, 87, { logo: 'klein', tag: false, margin: 0.1 }),
  'steam/art/main-capsule-616x353.svg': card(616, 353),
  'steam/art/vertical-capsule-374x448.svg': card(374, 448),
  'steam/art/library-capsule-600x900.svg': card(600, 900, { margin: 0.08 }),
  'steam/art/library-hero-3840x1240.svg': card(3840, 1240, { margin: 0.22 }),
  'steam/art/library-logo-1280x720.svg': (() => { const m = mark('kleur'); return head(1280, 720, 'GDE Groningen bibliotheeklogo (1280 x 720)') + place(m, 640, 360, 1100, 620) + '</svg>\n'; })(),
};
module.exports = { FILES, mark };
if (require.main === module) {
  for (const [rel, svg] of Object.entries(FILES)) {
    fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, rel), svg);
    console.log('wrote', rel, svg.length, 'bytes');
  }
}
