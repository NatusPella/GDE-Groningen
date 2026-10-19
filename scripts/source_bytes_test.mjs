// Geen kapotte tekens in de broncode van het spel (#240): een NUL of ander stuurteken of een vervangend
// teken (U+FFFD) in een JS-, CSS- of HTML-bestand komt in beeld als een kapot teken in de HUD
// (een CSS-escape '\2713' dat door een shell tot '¹3\0' werd). Ook een CSS content: '\27..' in een
// template-string (een octale escape) is een fout. node scripts/source_bytes_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'game');
let bad = 0, n = 0;
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'world' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|css|html)$/.test(e.name)) check(p);
  }
};
function check(p) {
  n++;
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split(/\r?\n/);
  lines.forEach((l, i) => {
    // eslint-disable-next-line no-control-regex
    const m = l.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/);
    if (m) { bad++; console.log(`FAIL ${path.relative(ROOT, p)}:${i + 1} stuurteken of vervangend teken U+${m[0].charCodeAt(0).toString(16).padStart(4, '0')}`); }
  });
}
walk(ROOT);
if (bad) { console.log(bad + ' kapotte regels'); process.exit(1); }
console.log(`source_bytes_test: ok (${n} bestanden)`);
