// Inkthoogte per glyph van de Kenney Input Prompts-fonts (game/fonts/input), voor de maat van een toetsplaatje naast tekst (#1075).
// Elke glyph staat met de onderkant op de basislijn; de meeste zijn 983/2048 em hoog, brede toetsen (Spatie, Shift, Tab ...) lager.
// ds-keycap.css schaalt zo dat de INKT overal even hoog is (cap), dus een lage toets krijgt een groter lettertype en een leesbaar label.
//   node scripts/input_glyph_ink.mjs            schrijft game/js/inputglyphs_ink.js en het blok tussen "ink:begin" en "ink:end" in ds-keycap.css
//   node scripts/input_glyph_ink.mjs --check    faalt als die twee niet kloppen met de fonts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'game/fonts/input');
const OUT = path.join(ROOT, 'game/js/inputglyphs_ink.js');
const CSS = path.join(ROOT, 'game/js/ds-keycap.css');
const SETS = { keys: 'input-keys', xbox: 'input-xbox', ps: 'input-ps', deck: 'input-deck' };
export const NORMAL = 983;

function parse(file) {
  const b = fs.readFileSync(file);
  const nt = b.readUInt16BE(4), t = {};
  for (let i = 0; i < nt; i++) { const o = 12 + i * 16; t[b.toString('latin1', o, o + 4)] = b.readUInt32BE(o + 8); }
  const locFmt = b.readInt16BE(t.head + 50);
  const c = t.cmap, nsub = b.readUInt16BE(c + 2), map = new Map();
  for (let i = 0; i < nsub; i++) {
    const so = c + b.readUInt32BE(c + 4 + i * 8 + 4), f = b.readUInt16BE(so);
    if (f === 4) {
      const sc = b.readUInt16BE(so + 6) / 2, e = so + 14, s = e + sc * 2 + 2, d = s + sc * 2, r = d + sc * 2;
      for (let k = 0; k < sc; k++) {
        const end = b.readUInt16BE(e + k * 2), st = b.readUInt16BE(s + k * 2), dl = b.readInt16BE(d + k * 2), ro = b.readUInt16BE(r + k * 2);
        for (let ch = st; ch <= end && ch < 0xffff; ch++) { let g; if (ro === 0) g = (ch + dl) & 0xffff; else { g = b.readUInt16BE(r + k * 2 + ro + (ch - st) * 2); if (g) g = (g + dl) & 0xffff; } if (g) map.set(ch, g); }
      }
    } else if (f === 12) {
      const ng = b.readUInt32BE(so + 12);
      for (let k = 0; k < ng; k++) { const o = so + 16 + k * 12, st = b.readUInt32BE(o), en = b.readUInt32BE(o + 4), g0 = b.readUInt32BE(o + 8); for (let ch = st; ch <= en; ch++) map.set(ch, g0 + ch - st); }
    }
  }
  const loca = (g) => (locFmt ? b.readUInt32BE(t.loca + g * 4) : b.readUInt16BE(t.loca + g * 2) * 2);
  return (cp) => { const g = map.get(cp); if (g == null) return 0; const lo = loca(g), hi = loca(g + 1); if (lo === hi) return 0; const o = t.glyf + lo; return b.readInt16BE(o + 8) - b.readInt16BE(o + 4); };
}

/** { set: { codepunt-hex: inkthoogte } } voor de glyphs die niet 983 hoog zijn. */
export function meetUit() {
  const uit = {};
  for (const [set, base] of Object.entries(SETS)) {
    const h = parse(path.join(DIR, base + '.ttf'));
    const rijen = fs.readFileSync(path.join(DIR, base + '-map.txt'), 'utf8').split('\n').filter(Boolean).map((l) => l.split(': U+'));
    const o = {};
    for (const [, hex] of rijen) { const v = h(parseInt(hex, 16)); if (v && Math.abs(v - NORMAL) > 2) o[parseInt(hex, 16).toString(16)] = v; }
    uit[set] = o;
  }
  return uit;
}
export const jsTekst = (uit) => `// Gegenereerd door scripts/input_glyph_ink.mjs (niet met de hand wijzigen): inkthoogte in fonteenheden (van 2048) per glyph waarvan de\n// inkt niet 983 is (de standaard). Sleutel is het codepunt in hex. Gebruikt door inputglyphs.js (data-ink) voor ds-keycap.css (#1075).\nexport const GLYPH_INK = Object.freeze(${JSON.stringify(uit)});\n`;
export const cssRegels = (uit) => [...new Set(Object.values(uit).flatMap((o) => Object.values(o)))].sort((a, b) => a - b)
  .map((h) => `.pad-g.pad-kn[data-ink="${h}"] { --ds-kc-ink: ${(h / 2048).toFixed(4)}; }`).join('\n');
const BLOK = /(\/\* ink:begin[^\n]*\*\/\n)[\s\S]*?(\/\* ink:end \*\/)/;
export const cssMet = (css, uit) => css.replace(BLOK, (m, a, z) => `${a}${cssRegels(uit)}\n${z}`);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const uit = meetUit();
  const lf = (x) => x.replace(/\r\n/g, '\n');
  const huidigJs = fs.existsSync(OUT) ? lf(fs.readFileSync(OUT, 'utf8')) : '';
  const huidigCss = lf(fs.readFileSync(CSS, 'utf8'));
  const nieuwCss = cssMet(huidigCss, uit);
  if (process.argv.includes('--check')) {
    if (huidigJs !== jsTekst(uit) || huidigCss !== nieuwCss) { console.log('inputglyphs_ink.js of ds-keycap.css klopt niet met de fonts: draai node scripts/input_glyph_ink.mjs'); process.exit(1); }
    console.log('input_glyph_ink: ok');
  } else {
    fs.writeFileSync(OUT, jsTekst(uit));
    fs.writeFileSync(CSS, nieuwCss);
    console.log('geschreven; afwijkende glyphs per set:', Object.values(uit).map((o) => Object.keys(o).length).join(', '));
  }
}
