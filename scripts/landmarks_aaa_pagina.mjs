// Eén webpagina bij het landmarkblad (scripts/landmarks_aaa_blad.mjs): per gebouw voor (als die er is), na overdag, na 's avonds en
// de twee lichtere detailniveaus, met driehoeken en draw calls per niveau.
//   node scripts/landmarks_aaa_pagina.mjs <uitmap>
import fs from 'node:fs';

const [dir = 'landmarks_aaa'] = process.argv.slice(2);
const read = (f) => (fs.existsSync(`${dir}/${f}`) ? JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')) : {});
const na = read('na_stats.json'), voor = read('voor_stats.json');
const fmt = (q) => (q ? `${q.tris.toLocaleString('nl-NL')} driehoeken, ${q.draws} draw calls` : '-');
const img = (f, t) => (fs.existsSync(`${dir}/${f}`) ? `<figure><img src="${f}" alt="${t}"><figcaption>${t}</figcaption></figure>` : '');
let h = `<!doctype html><html lang="nl"><meta charset="utf-8"><title>Landmarks 23-11</title>
<style>body{font:14px system-ui,sans-serif;background:#1d1f22;color:#e8e4da;margin:24px}h2{margin:28px 0 4px}p{margin:2px 0 8px;color:#b9b4a8}
.r{display:flex;flex-wrap:wrap;gap:6px}figure{margin:0}img{width:420px;border-radius:4px;display:block}figure.k img{width:240px}figcaption{font-size:12px;color:#9c978c}</style>
<h1>Herkenbare stadsgebouwen: voor en na</h1><p>Software-render (scripts/landmarks_aaa_blad.mjs) op de echte OSM-voetafdruk, geen Electron: vlakke belichting, geen texturen, geen schaduw, geen mist.
Niveaus: vol tot 170 m, massa tot 430 m, daarna silhouet.</p>`;
for (const [k, s] of Object.entries(na)) {
  const f = k.replace(/[^A-Za-z0-9]+/g, '_');
  h += `<h2>${k}</h2><p>na: ${s.map((q, i) => `${['vol', 'massa', 'silhouet'][i]} ${fmt(q)}`).join(' &middot; ')}${voor[k] ? ` &middot; voor: ${fmt(voor[k][0])}` : ' &middot; voor: geen eigen model'}</p><div class="r">`;
  h += img(`voor_${f}_dag.png`, 'voor') + img(`na_${f}_dag.png`, 'na, dag') + img(`na_${f}_avond.png`, 'na, avond');
  h += `</div><div class="r">` + img(`na_${f}_lod1.png`, 'massaniveau').replace('<figure>', '<figure class="k">') + img(`na_${f}_lod2.png`, 'silhouetniveau').replace('<figure>', '<figure class="k">') + '</div>';
}
fs.writeFileSync(`${dir}/index.html`, h + '</html>\n');
console.log('pagina', `${dir}/index.html`);
