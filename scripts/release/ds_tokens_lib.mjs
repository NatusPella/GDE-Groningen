// Puur hulpmodule voor het designsysteem (game/js/ds-tokens.css, ds-components.css):
// tokens uit de CSS lezen, var()-ketens oplossen per oppervlak (papier of glas) en het
// WCAG-contrast rekenen. Geen fs, geen git, geen netwerk; de test en de lint voeden het met tekst.

const SCOPES = { papier: ':root', glas: '.ds-glas' };

/** Haalt de `--naam: waarde`-declaraties per selectorblok uit een CSS-tekst (zonder commentaar en @media). */
export function parseDsBlocks(css) {
  const clean = String(css ?? '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const blocks = {};
  // Alleen blokken op het hoogste niveau; @media-blokken worden overgeslagen (ze bevatten zelf blokken).
  let depth = 0; let sel = ''; let body = ''; let skip = false;
  for (const ch of clean) {
    if (ch === '{') {
      if (depth === 0) { skip = sel.trim().startsWith('@'); body = ''; }
      depth += 1; if (depth > 1) body += ch;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        if (!skip) {
          const key = sel.trim();
          const map = blocks[key] || (blocks[key] = {});
          for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim();
        }
        sel = '';
      } else body += ch;
    } else if (depth === 0) sel += ch;
    else body += ch;
  }
  return blocks;
}

/** Oppervlak 'papier' (standaard, :root + .ds-papier) of 'glas' (:root met .ds-glas eroverheen). */
export function scopeTokens(css, surface = 'papier') {
  const blocks = parseDsBlocks(css);
  const base = { ...(blocks[':root'] || {}) };
  const over = surface === 'glas' ? blocks['.ds-glas'] : blocks['.ds-papier'];
  return { ...base, ...(over || {}) };
}

/** Lost var(--x) en var(--x, fallback) op tot een eindwaarde; geeft null bij een lus of een ontbrekende token. */
export function resolveToken(tokens, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const raw = tokens[name];
  if (raw === undefined) return null;
  const m = raw.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
  return m ? resolveToken(tokens, m[1], seen) : raw;
}

export function hexToRgb(hex) {
  const h = String(hex).trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(h)) return null;
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x-contrastverhouding tussen twee #rrggbb-kleuren; null als een van beide geen hex is. */
export function contrastRatio(a, b) {
  const x = luminance(a); const y = luminance(b);
  if (x === null || y === null) return null;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * De kleurparen die de componenten werkelijk gebruiken, als rolparen per oppervlak.
 * norm 4.5 = tekst, 3 = grote tekst of niet-tekst (rand, pictogram, vulling).
 */
export const ROLE_PAIRS = [
  // tekst
  ['--ds-tx', '--ds-bg', 4.5], ['--ds-tx', '--ds-bg-2', 4.5],
  ['--ds-tx-zacht', '--ds-bg', 4.5], ['--ds-tx-zacht', '--ds-bg-2', 4.5],
  ['--ds-probleem-tx', '--ds-probleem-vlak', 4.5], ['--ds-probleem-tx', '--ds-bg', 4.5],
  ['--ds-succes-tx', '--ds-succes-vlak', 4.5], ['--ds-succes-tx', '--ds-bg', 4.5],
  ['--ds-waarschuwing-tx', '--ds-waarschuwing-vlak', 4.5],
  ['--ds-selectie-tx', '--ds-selectie-vlak', 4.5],
  ['--ds-primair-tx', '--ds-primair', 4.5], ['--ds-primair-tx', '--ds-primair-hover', 4.5], ['--ds-primair-tx', '--ds-primair-druk', 4.5],
  ['--ds-kop-tx', '--ds-kop-bg', 4.5],
  ['--ds-tab-tx', '--ds-tab-bg', 4.5], ['--ds-tab-actief-tx', '--ds-tab-actief-bg', 4.5],
  ['--ds-toets-tx', '--ds-toets-bg', 4.5],
  // rand, pictogram en vulling (niet-tekst)
  ['--ds-rand', '--ds-bg', 3], ['--ds-selectie', '--ds-bg', 3], ['--ds-probleem', '--ds-bg', 3],
  ['--ds-succes', '--ds-bg', 3], ['--ds-waarschuwing', '--ds-bg', 3],
  // geel is een vulling: op papier draagt de inktrand de knop (geel tegen papier is maar 1,4:1), op glas het geel zelf
  ['--ds-primair-rand', '--ds-bg', 3],
];

export const CONTRAST_START = '<!-- ds-contrast:start -->';
export const CONTRAST_END = '<!-- ds-contrast:end -->';

/** Rijen van de contrasttabel, uit de tokens gerekend: [oppervlak, rolpaar, voorgrond, achtergrond, norm, ratio]. */
export function contrastRows(css) {
  const rows = [];
  for (const surface of ['papier', 'glas']) {
    const tokens = scopeTokens(css, surface);
    const seen = new Set();
    for (const [fg, bg, norm] of ROLE_PAIRS) {
      const fgPal = (tokens[fg] || '').match(/^var\((--ds-c-[\w-]+)\)$/)?.[1];
      const bgPal = (tokens[bg] || '').match(/^var\((--ds-c-[\w-]+)\)$/)?.[1];
      const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
      const key = `${fgPal}|${bgPal}|${norm}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ surface, fg, bg, fgPal, bgPal, norm, ratio });
    }
  }
  return rows;
}

/** De tabel als markdown, tussen de markeringen in DESIGN_SYSTEM.md. */
export function contrastTableMarkdown(css) {
  const lines = ['| Surface | Role pair | Foreground | Background | Norm | Ratio |', '|---|---|---|---|---|---|'];
  for (const r of contrastRows(css)) {
    lines.push(`| ${r.surface} | \`${r.fg}\` on \`${r.bg}\` | \`${r.fgPal}\` | \`${r.bgPal}\` | ${r.norm} | ${r.ratio === null ? 'n/a' : r.ratio.toFixed(2)} |`);
  }
  return lines.join('\n');
}
