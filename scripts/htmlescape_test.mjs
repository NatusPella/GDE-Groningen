// Controleert escapeHtml (game/js/htmlescape.js) en bewaakt dat HTML-escaping
// niet opnieuw lokaal per module wordt gedupliceerd.
//   node scripts/htmlescape_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from '../game/js/htmlescape.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME_JS = path.join(ROOT, 'game', 'js');

let n = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  n++;
};

ok(escapeHtml('&<>"\'') === '&amp;&lt;&gt;&quot;&#39;', 'alle vijf HTML-tekens worden geëscaped');
ok(escapeHtml(null) === '' && escapeHtml(undefined) === '', 'null en undefined worden lege string');
ok(escapeHtml(0) === '0' && escapeHtml(42) === '42', 'getallen blijven behouden');
ok(escapeHtml('') === '', 'lege string blijft leeg');
ok(escapeHtml('Café de Drie Gezusters · €12,50') === 'Café de Drie Gezusters · €12,50', 'accenten en euroteken blijven intact');
ok(escapeHtml('<img src=x onerror="alert(1)">') === '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;', 'HTML-tags worden onschadelijk gemaakt');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const LOCAL_ESC_RE = /^\s*(?:export\s+)?(?:const|let|var|function)\s+(?:esc|escHtml|escapeHtml)\b[^\n]*&amp;/m;
const dupes = [];
for (const file of walk(GAME_JS)) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (rel === 'game/js/htmlescape.js') continue;
  const src = fs.readFileSync(file, 'utf8');
  if (LOCAL_ESC_RE.test(src)) dupes.push(rel);
}
ok(dupes.length === 0, `geen gedupliceerde lokale HTML-escapers in game/js (${dupes.join(', ')})`);

console.log(`htmlescape_test: ${n} checks ok`);
