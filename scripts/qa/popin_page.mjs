// Eén HTML-pagina met de pop-in-tabellen en de beeldreeksen voor/na (#1354).
//   node scripts/qa/popin_page.mjs <bronmap> <uitmap> <voor> <na> [routes=foot,cdrive,a7,dorp,heli] [stills=2,5] [cuts-voor] [cuts-na]
// Kopieert de gekozen stills naar <uitmap> en schrijft <uitmap>/index.html. De tabel komt uit popin_table.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [src, out, voor, na, routesArg = 'foot,cdrive,a7,dorp,heli', stillsArg = '2,5', cutVoor, cutNa] = process.argv.slice(2);
const HERE = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(out, { recursive: true });
const tags = [voor, na].concat(cutVoor ? [cutVoor, cutNa] : []);
const md = spawnSync(process.execPath, [path.join(HERE, 'popin_table.mjs'), src, ...tags], { encoding: 'utf8' }).stdout;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
let html = '';
for (const block of md.split(/\n### /).filter(Boolean)) {
  const lines = block.replace(/^### /, '').split('\n').filter((l) => l.trim());
  const title = lines.shift();
  html += `<h2>${esc(title)}</h2><table>`;
  lines.forEach((l, i) => { if (/^---/.test(l)) return; const cells = l.split(' | ').map(esc); html += '<tr>' + cells.map((c) => (i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`)).join('') + '</tr>'; });
  html += '</table>';
}
let figs = '';
for (const route of routesArg.split(',')) {
  figs += `<h2>Beeldreeks ${route}</h2><div class="rij">`;
  for (const n of stillsArg.split(',')) for (const [tag, label] of [[voor, 'voor'], [na, 'na']]) {
    const f = `shots-${tag}-${route}-${n}.png`;
    if (!fs.existsSync(path.join(src, f))) continue;
    fs.copyFileSync(path.join(src, f), path.join(out, f));
    figs += `<figure><img src="${f}" loading="lazy"><figcaption>${label} (${route}, beeld ${n})</figcaption></figure>`;
  }
  figs += '</div>';
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Tegel klaar: pop-in voor en na (#1354)</title>
<style>body{font:14px system-ui;margin:20px;max-width:1400px}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th:first-child,td:first-child{text-align:left}
.rij{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:48%}img{width:100%}figcaption{font-size:12px;color:#555}</style>
<h1>Tegel klaar voor de speler: pop-in voor en na (#1354)</h1>
<p>Kolommen: ${tags.map(esc).join(', ')}. Meting met <code>scripts/qa/popin.mjs</code>; de machine was tijdens de runs druk (andere agents), dus lees de tellingen per seconde en per kilometer als richting, niet als exacte waarde. Zie <code>docs/wereld/TEGEL-KLAAR-28-11.md</code>.</p>
${html}${figs}`);
console.log('geschreven: ' + path.join(out, 'index.html'));
