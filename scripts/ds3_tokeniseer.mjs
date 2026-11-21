// Zet harde kleuren in spelerzichtbare UI om naar designsysteemtokens, zonder iets aan het uiterlijk te veranderen:
// een hex die exact een palettoken is wordt var(--ds-c-...), een rgba() met zo'n kleur wordt color-mix(in srgb, var(...) A%, transparent).
// Alleen in CSS-contexten (CSS-bestanden, <style> in html en CSS-declaraties in JS-sjablonen), nooit in een canvas of 3D-materiaal.
// Dev-tool; draait op de werkboom. `--droog` laat alleen de aantallen zien.
//   node scripts/ds3_tokeniseer.mjs [--droog]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bestanden, bewustReden, ROOT } from './lib/ds3_telling.mjs';

export const HEX_NAAR_TOKEN = {
  '#f0ede4': '--ds-c-creme', '#3fc97a': '--ds-c-licht-groen', '#0c140e': '--ds-c-glas', '#17301f': '--ds-c-glas-2', '#1f3a28': '--ds-c-glas-3',
  '#b9b7ad': '--ds-c-creme-zacht', '#3a1816': '--ds-c-rood-glas-vlak', '#f5b5ad': '--ds-c-rood-glas-tx', '#d93f3f': '--ds-c-rood-glas',
  '#3a2a0c': '--ds-c-amber-glas-vlak', '#ffbe46': '--ds-c-amber-glas-tx', '#1d3a23': '--ds-c-sel-glas-vlak',
  '#f3ead3': '--ds-c-ink-papier', '#1d1b17': '--ds-c-ink-inkt', '#0e6b3c': '--ds-c-ink-bord', '#f9c80e': '--ds-c-ink-geel', '#e8505b': '--ds-c-ink-roze',
  '#f5efe0': '--ds-c-papier', '#ebe2cb': '--ds-c-papier-2', '#ffffff': '--ds-c-wit', '#fff': '--ds-c-wit', '#4d483c': '--ds-c-inkt-zacht',
  '#ffd633': '--ds-c-geel-hover', '#e0b000': '--ds-c-geel-druk', '#fbe1dc': '--ds-c-rood-vlak', '#8c1d18': '--ds-c-rood-tx', '#b3261e': '--ds-c-rood',
  '#dcefdc': '--ds-c-groen-vlak', '#14582f': '--ds-c-groen-tx', '#dcebdd': '--ds-c-sel-vlak', '#fdebc8': '--ds-c-amber-vlak', '#7a4a00': '--ds-c-amber-tx', '#a15c00': '--ds-c-amber',
  // de twee geeltinten en het tweede glasgroen gaan op in het palet (docs/DESIGN-SCHULD.md: één geel, één bordgroen)
  '#e8c93a': '--ds-c-ink-geel', '#0f5c30': '--ds-c-ink-bord', '#1e9e56': '--ds-c-licht-groen',
};
const RGB_NAAR_TOKEN = {};
for (const [hex, tok] of Object.entries(HEX_NAAR_TOKEN)) {
  if (hex.length !== 7) continue;
  RGB_NAAR_TOKEN[`${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`] = tok;
}
// extra bekende triples zonder eigen hex in de lijst
RGB_NAAR_TOKEN['255,255,255'] = '--ds-c-wit';

const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;
const RGBA = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\.?\d*\.?\d+)\s*)?\)/g;

function zetOm(tekst, { schaduwBlijft }) {
  let n = 0;
  let uit = tekst.replace(RGBA, (m, r, g, b, a) => {
    const tok = RGB_NAAR_TOKEN[`${+r},${+g},${+b}`];
    if (!tok) return m;
    if (schaduwBlijft && (tok === '--ds-c-wit')) return m; // een wit hooglicht in een schaduw blijft
    n++;
    if (a === undefined) return `var(${tok})`;
    const pct = Math.round(parseFloat(a) * 1000) / 10;
    if (pct >= 100) return `var(${tok})`;
    return `color-mix(in srgb, var(${tok}) ${pct}%, transparent)`;
  });
  uit = uit.replace(HEX, (m) => {
    const tok = HEX_NAAR_TOKEN[m.toLowerCase()];
    if (!tok) return m;
    n++;
    return `var(${tok})`;
  });
  return { tekst: uit, n };
}

const DECL = /((?:^|[\s;{"'`])(?:color|background(?:-color|-image)?|border(?:-[a-z]+)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|--[\w-]+)\s*:\s*)([^'"`;{}]*(?:\([^)]*\)[^'"`;{}]*)*)/gi;
const STYLE_TOEW = /(\.style(?:\.\w+|\[[^\]]+\])\s*=\s*)(['"`])([^'"`]*)\2/g;

export function zetBestandOm(f, src) {
  const css = /\.css$/.test(f);
  let totaal = 0;
  // var(--x, #hex)-terugvallen laten we staan: die zijn bedoeld als terugval
  const beschermd = [];
  const bescherm = (s) => s.replace(/var\(\s*--[\w-]+\s*,\s*[^)]*\)/g, (m) => { beschermd.push(m); return `\u0001${beschermd.length - 1}\u0002`; });
  const herstel = (s) => s.replace(/\u0001(\d+)\u0002/g, (m, i) => beschermd[+i]);
  const regels = src.split('\n');
  let inBlok = false; // binnen een /* ... */ commentaar
  let inFontFace = false;
  const uit = regels.map((regel) => {
    // commentaar laten staan
    if (inBlok) { if (regel.includes('*/')) inBlok = false; return regel; }
    if (/^\s*\/\*/.test(regel) && !regel.includes('*/')) { inBlok = true; return regel; }
    if (/^\s*(?:\/\/|\/\*|\*)/.test(regel)) return regel;
    if (/data:image|image\/svg/.test(regel)) return regel; // een SVG als plaatje kent geen var()
    if (/@font-face/.test(regel)) inFontFace = true;
    if (inFontFace) { if (regel.includes('}')) inFontFace = false; return regel; }
    let r = bescherm(regel);
    const schaduw = /shadow|filter/i.test(r);
    if (css) {
      const { tekst, n } = zetOm(r, { schaduwBlijft: schaduw });
      r = tekst; totaal += n;
    } else {
      r = r.replace(DECL, (m, kop, waarde) => { const o = zetOm(waarde, { schaduwBlijft: schaduw }); totaal += o.n; return kop + o.tekst; });
      r = r.replace(STYLE_TOEW, (m, kop, q, waarde) => { const o = zetOm(waarde, { schaduwBlijft: schaduw }); totaal += o.n; return kop + q + o.tekst + q; });
    }
    return herstel(r);
  });
  return { src: uit.join('\n'), n: totaal };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\//, ''))) {
  const droog = process.argv.includes('--droog');
  let som = 0, bestandenAangepast = 0;
  for (const f of bestanden()) {
    if (bewustReden(f)) continue;
    const abs = path.join(ROOT, f);
    const bron = fs.readFileSync(abs, 'utf8');
    const { src, n } = zetBestandOm(f, bron);
    if (!n) continue;
    som += n; bestandenAangepast++;
    console.log(String(n).padStart(4), f);
    if (!droog) fs.writeFileSync(abs, src);
  }
  console.log(`${droog ? 'zou omzetten' : 'omgezet'}: ${som} kleuren in ${bestandenAangepast} bestanden`);
}
