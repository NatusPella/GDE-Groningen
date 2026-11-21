// Statische bewaking van de toetsplaatjesmaat (docs/KEYCAP-MAAT-21-11.md, #1075): een toetsplaatje, muis- of knopglyph
// krijgt zijn maat van ds-keycap.css (een factor van de omliggende tekst), niet van een vaste px-maat in de context-CSS.
// Gedeeld door scripts/keycap_maat_test.mjs en scripts/ui/icon_sweep.mjs: een nieuwe plek met een px-maat voor een
// toetsplaatje faalt in allebei.
//   node scripts/ui/keycap_maat.mjs [--list]
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const JS = fileURLToPath(new URL('../../game/js/', import.meta.url));
// elementen die een toetsplaatje of knopglyph zijn
export const KEY_SEL = /\.(?:hud-key|pad-g|pad-kn|pad-key|pad-face|pad-stick|pad-dpad|hud-wasd|hud-mouse|hud-mouse-g|ds-kc[\w-]*|keycap)\b/;
// eigenschappen die de maat bepalen
const SIZE_PROP = /^(?:width|height|min-width|min-height|max-width|max-height|font-size|font|line-height|padding|padding-(?:left|right|inline|block|inline-start|inline-end)|margin|margin-(?:left|right|inline|block))$/;
const PX = /(?<![\w.-])\d*\.?\d+px\b/;

// [bestand, selector-begin, reden]: toetsplaten die zelf een onderdeel van een tabel of widget zijn (een vaste cel), geen plaatje in een zin
export const ALLOW = [
  ['a11y.css', '#pause-menu .pm-bindbtn .hud-key', 'bindknop in de besturingstabel: een vaste cel van 26 px (plaat, geen lopende tekst)'],
  ['ds-keycap.css', '.hud-key:not(.is-kbg)', 'de px staan alleen in max()/min() als vloer (--ds-kc-floor); gecontroleerd door scanKeycapPx'],
];

function strip(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
// alle `selector { declaraties }` uit een tekst (CSS-bestand of een sjabloonstring in JS)
export function rulesOf(text) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  const t = strip(text);
  while ((m = re.exec(t))) out.push({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] });
  return out;
}
const decls = (body) => body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()]; }).filter(Boolean);
// px buiten een max()/min()/clamp()-vloer
const bareFixedPx = (v) => { let depth = 0, cur = '', bare = ''; for (const ch of v) { if (ch === '(') depth++; if (ch === ')') depth--; if (depth === 0) bare += ch; } return PX.test(bare.replace(/(?:max|min|clamp)\([^()]*(?:\([^()]*\)[^()]*)*\)/g, '')); };

/** Alle plekken waar een toetsplaatje een vaste px-maat krijgt: [{ f, sel, prop, value }] (leeg is goed). */
export function scanKeycapPx(dir = JS) {
  const hits = [];
  for (const f of readdirSync(dir).filter((x) => /\.(css|js)$/.test(x))) {
    const src = readFileSync(dir + f, 'utf8');
    if (f.endsWith('.js') && !/\.hud-key|\.pad-g|\.hud-wasd|\.hud-mouse/.test(src)) continue;
    for (const { sel, body } of rulesOf(src)) {
      const selList = sel.split(',').map((x) => x.trim());
      for (const one of selList) {
        if (!KEY_SEL.test(one)) continue;
        // alleen als het plaatje zelf (het laatste deel van de selector) de maat krijgt, niet zijn wikkelaar
        const last = one.split(/[\s>+~]+/).filter(Boolean).pop() || '';
        if (!KEY_SEL.test(last)) continue;
        for (const [prop, value] of decls(body)) {
          if (!SIZE_PROP.test(prop)) continue;
          if (!bareFixedPx(value)) continue;
          if (ALLOW.some(([file, begin]) => file === f && one.startsWith(begin))) continue;
          hits.push({ f, sel: one, prop, value });
        }
      }
    }
  }
  return hits;
}

// Overslaan-hints ('Houd SPATIE ingedrukt om over te slaan'): de container is lopende tekst, geen flex of grid, en geen eigen
// uitlijning (align-items, vertical-align, flex-end) voor de toets: die staat in de regel via ds-keycap.css (#1075, eigenaar 21-11).
/** [{ f, sel, prop, value }] voor skip-hintcontainers met flex/grid of een eigen uitlijning (leeg is goed). */
export function scanSkipHints(dir = JS) {
  const hits = [];
  for (const f of readdirSync(dir).filter((x) => /\.(css|js)$/.test(x))) {
    const src = readFileSync(dir + f, 'utf8');
    if (f.endsWith('.js') && !/skip/i.test(src)) continue;
    for (const { sel, body } of rulesOf(src)) {
      for (const one of sel.split(',').map((x) => x.trim())) {
        const last = one.split(/[\s>+~]+/).filter(Boolean).pop() || '';
        if (!/skip/i.test(one) || /ring/.test(last) || /:hover|:active|:focus/.test(one)) continue;
        const isKey = KEY_SEL.test(last);
        for (const [prop, value] of decls(body)) {
          const bad = (!isKey && prop === 'display' && /flex|grid/.test(value))
            || (!isKey && /^(?:align-items|align-content|align-self)$/.test(prop))
            || (isKey && /^(?:vertical-align|align-self|position|top|bottom)$/.test(prop));
          if (bad) hits.push({ f, sel: one, prop, value });
        }
      }
    }
  }
  return hits;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const h = [...scanKeycapPx(), ...scanSkipHints()];
  for (const x of h) console.log(`  ${x.f}: ${x.sel} { ${x.prop}: ${x.value} }`);
  console.log(h.length ? `keycap_maat: ${h.length} vaste px-maat/maten of eigen uitlijning voor een toetsplaatje` : 'keycap_maat: ok');
  process.exit(h.length ? 1 : 0);
}
