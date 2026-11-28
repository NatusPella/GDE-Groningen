// Maakt de voor/na-pagina van de visuele doorloop van de eerste 30 minuten (AAA-30, 28-11) uit een defectlijst.
//   node scripts/kwaliteit/eerste30_pagina.mjs --lijst=<defecten.json> --uit=<map> [--titel=...]
// defecten.json: [{ id, wat, waar, ernst: 'hoog'|'middel'|'laag', status: 'gerepareerd'|'open'|'artefact', voor?: <png>, na?: <png>, opmerking? }]
// De beelden (paden relatief aan het JSON-bestand of absoluut) worden naar <uit>/beelden gekopieerd; de pagina is <uit>/index.html.
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const lijstPad = path.resolve(arg('lijst', ''));
const uit = path.resolve(arg('uit', ''));
if (!arg('lijst') || !arg('uit')) { console.error('gebruik: --lijst=<json> --uit=<map>'); process.exit(2); }
const lijst = JSON.parse(fs.readFileSync(lijstPad, 'utf8'));
const dir = path.dirname(lijstPad);
fs.mkdirSync(path.join(uit, 'beelden'), { recursive: true });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kopieer = (p, naam) => {
  if (!p) return null;
  const bron = path.isAbsolute(p) ? p : path.resolve(dir, p);
  if (!fs.existsSync(bron)) return null;
  const doel = `beelden/${naam}.png`;
  fs.copyFileSync(bron, path.join(uit, doel));
  return doel;
};
const kleur = { gerepareerd: '#1f7a3a', open: '#b3261e', artefact: '#8a6d00' };
const rijen = lijst.map((d) => {
  const voor = kopieer(d.voor, `${d.id}-voor`), na = kopieer(d.na, `${d.id}-na`);
  const img = (src, cap) => (src ? `<figure><a href="${src}"><img src="${src}" loading="lazy"></a><figcaption>${cap}</figcaption></figure>` : '');
  return `<section id="${esc(d.id)}"><h2>${esc(d.id)} <span class="ernst">${esc(d.ernst)}</span> <span class="status" style="background:${kleur[d.status] || '#444'}">${esc(d.status)}</span></h2>
<p><b>${esc(d.wat)}</b><br>Waar: ${esc(d.waar)}${d.opmerking ? `<br>${esc(d.opmerking)}` : ''}</p>
<div class="beelden">${img(voor, 'voor')}${img(na, 'na')}</div></section>`;
}).join('\n');
const tel = (s) => lijst.filter((d) => d.status === s).length;
fs.writeFileSync(path.join(uit, 'index.html'), `<!doctype html><html lang="nl"><meta charset="utf-8"><title>${esc(arg('titel', 'Eerste 30 minuten: visuele doorloop'))}</title>
<style>body{font:15px/1.4 system-ui,sans-serif;margin:24px;background:#f4f1e8;color:#222}h1{margin:0 0 4px}h2{font-size:17px;margin:24px 0 4px}section{border-top:2px solid #222;padding-bottom:12px}
.ernst{font-weight:400;color:#555;font-size:13px}.status{color:#fff;font-size:12px;padding:1px 8px;border-radius:9px}.beelden{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;flex:1 1 45%}
img{width:100%;height:auto;border:1px solid #888}figcaption{font-size:12px;color:#555}</style>
<h1>${esc(arg('titel', 'Eerste 30 minuten: visuele doorloop'))}</h1>
<p>${lijst.length} bevindingen: ${tel('gerepareerd')} gerepareerd, ${tel('open')} open, ${tel('artefact')} vermoedelijk testartefact. Beelden 1920x1080, Electron, ?dynvast.</p>
${rijen}</html>`);
console.log(`pagina: ${path.join(uit, 'index.html')} (${lijst.length} bevindingen)`);
