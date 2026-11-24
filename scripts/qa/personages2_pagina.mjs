// Bewijspagina van personages 2 (24-11): één HTML-pagina met het contactblad (dichtbij en op 30 m), de wereld (centrum, markt, kade, terras,
// halte, straten), de kleding voor en na (met de procedurele mensen als voor) en de telling procedureel tegen modulair.
//   node scripts/qa/personages2_pagina.mjs --out=<map> --blad=<map met p2-blad-*> --wereld=<map> --kleding=<map> --oud=<map>
// De beelden worden naar <out>/beeld gekopieerd; de cijfers komen uit de electron.log van de runs ([p2]-regels).
import fs from 'node:fs';
import path from 'node:path';
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const out = path.resolve(arg('out', '.scr/personages2-pagina'));
const dirs = { blad: arg('blad', '.scr/p2b'), wereld: arg('wereld', '.scr/p2w'), kleding: arg('kleding', '.scr/p2k'), oud: arg('oud', '.scr/p2k-oud') };
fs.mkdirSync(path.join(out, 'beeld'), { recursive: true });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const png = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png') && /-p2/.test(f)).sort() : []);
const copy = (dir, f, pre) => { const to = pre + '-' + f.replace(/^\d+x\d+-/, ''); fs.copyFileSync(path.join(dir, f), path.join(out, 'beeld', to)); return 'beeld/' + to; };
const notes = (dir) => {
  const f = path.join(dir, 'electron.log'), r = {};
  if (!fs.existsSync(f)) return r;
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = l.match(/\[p2\] (\S+) (.*?)( \(js\/errorlog)?$/); if (m) { try { r[m[1]] = JSON.parse(m[2]); } catch (e) { r[m[1]] = m[2]; } } }
  return r;
};
const nw = notes(dirs.wereld), nb = notes(dirs.blad), nk = notes(dirs.kleding);
let html = `<!doctype html><meta charset="utf-8"><title>Personages 2 (24-11)</title><style>body{font:14px system-ui;background:#1b1d22;color:#e8e6df;margin:24px;max-width:1700px}h1,h2{font-weight:600}img{max-width:100%;border:1px solid #333;margin:4px 0}table{border-collapse:collapse}td,th{border:1px solid #444;padding:4px 10px;text-align:left}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.n{color:#9aa}</style><h1>Personages 2: alle mensen modulair</h1>`;
html += '<h2>Telling procedureel tegen modulair (in de echte wereld)</h2><table><tr><th>plek</th><th>modulair</th><th>procedureel (niet bewust)</th><th>bewust (zwemkleding)</th><th>wat is dat procedurele</th><th>verre menigte</th></tr>';
const row = (k, v) => {
  if (!v || typeof v !== 'object') return '';
  const proc = (v.proc || []).map((p) => `(${p[0]}, ${p[1]}) zaad ${p[3]}`).join('; ');
  return `<tr><td>${esc(k)}</td><td>${v.modulair}</td><td>${v.procedureel}</td><td>${v.bewust || 0}</td><td class="n">${esc(proc.slice(0, 220))}</td><td>${v.ver ?? ''}</td></tr>`;
};
for (const k of Object.keys(nw)) if (/^(centrum|spot-|halte|straat-)/.test(k)) html += row(k, nw[k]);
html += '</table><p class="n">Het procedurele op de kade en bij het strand zijn zwemmers (zwemkleding blijft het eigen model, bewust). Verder niets, zie de aanroepers die nog procedureel bouwen: ' + esc(JSON.stringify((nw['spot-bernard'] || {}).procStats || {})) + '</p>';
html += '<h2>Contactblad: alle typen dichtbij en op 30 m</h2><div class="g">';
for (const f of png(dirs.blad).filter((x) => /blad/.test(x))) html += `<div><img src="${copy(dirs.blad, f, 'blad')}"><div class="n">${esc(f)}</div></div>`;
html += '</div><h2>De wereld</h2><div class="g">';
for (const f of png(dirs.wereld)) html += `<div><img src="${copy(dirs.wereld, f, 'wereld')}"><div class="n">${esc(f)}</div></div>`;
html += '</div><h2>Kleding: voor (procedureel) en na (modulair)</h2>';
const na = png(dirs.kleding), voor = new Set(png(dirs.oud));
for (const f of na) {
  const v = [...voor].find((x) => x.replace(/^\d+x\d+-/, '') === f.replace(/^\d+x\d+-/, ''));
  html += `<div class="g"><div>${v ? `<img src="${copy(dirs.oud, v, 'voor')}">` : '<i>geen voor-beeld</i>'}<div class="n">voor: ${esc(f)}</div></div><div><img src="${copy(dirs.kleding, f, 'na')}"><div class="n">na</div></div></div>`;
}
html += `<h2>Cijfers uit de runs</h2><pre class="n">${esc(JSON.stringify({ blad: nb.blad, fouten: [nw.fouten, nb.fouten, nk.fouten], kleding: { npc: nk.npc, procedureelBijBouw: nk['procedureel-bij-bouw'] } }, null, 1)).slice(0, 4000)}</pre>`;
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('pagina:', path.join(out, 'index.html'), (html.match(/<img/g) || []).length, 'beelden');
