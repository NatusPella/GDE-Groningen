// harness-only: record every benchmark frame with its shot index in window.__bfr (staged game/js/trailer.js)
import fs from 'node:fs';
import path from 'node:path';
const B = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
for (const v of process.argv.slice(2)) {
  const f = path.join(B, 's' + v, 'game', 'js', 'trailer.js');
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('__bfr')) { console.log(v, 'already'); continue; }
  const m = '// title cards are not measured, also when a picture runs behind them';
  if (!s.includes(m)) { console.log(v, 'NO MATCH'); continue; }
  s = s.replace(m, m + "\n    (window.__bfr = window.__bfr || []).push(i + ':' + (realMs > 0 ? realMs.toFixed(1) : 0));");
  fs.writeFileSync(f, s); console.log(v, 'patched');
}
