// Bouwt één HTML-pagina met de belangrijkste beelden van een video-QA-opname: de afbeeldingen staan als data-URI in de pagina,
// dus er is niets los te kopiëren. Invoer: bevindingen.json (lijst { id, titel, ernst, t, frame, frames, beschrijving, code }).
//
//   node scripts/videoqa/pagina.mjs <opnamemap> <bevindingen.json> <uit.html> [--w=800] [--q=5]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const [dir, listFile, outFile] = args.map((a) => path.resolve(a));
const list = JSON.parse(fs.readFileSync(listFile, 'utf8'));
const tmp = path.join(dir, '_pagina'); fs.mkdirSync(tmp, { recursive: true });
const frames = [...new Set(list.flatMap((b) => b.frames || [b.frame]).filter((f) => Number.isFinite(f)))].sort((a, b) => a - b);
const r = spawnSync(process.execPath, [path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'sheets.mjs'), dir, `--full=${frames.join(',')}`, `--out=${tmp}`, `--w=${opt('w', 800)}`], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
const img = (f) => { const p = path.join(tmp, `f${f}.jpg`); return fs.existsSync(p) ? `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}` : ''; };
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kleur = { hoog: '#c0392b', midden: '#d68910', laag: '#7f8c8d', info: '#2e86c1' };
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Video-QA 23-11: eerste 15 minuten</title>
<style>body{font:15px/1.45 system-ui,sans-serif;background:#16181b;color:#e8e8e8;margin:0;padding:24px 32px;max-width:1500px}
h1{margin:0 0 4px}h2{margin:28px 0 6px;font-size:18px}.meta{color:#9aa}.b{border-top:1px solid #333;padding:14px 0}.tag{display:inline-block;padding:1px 8px;border-radius:9px;color:#fff;font-size:12px;margin-right:8px}
.fr{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.fr figure{margin:0}.fr img{width:${opt('w', 800)}px;max-width:48vw;border:1px solid #444}figcaption{font-size:12px;color:#9aa}code{background:#23272b;padding:0 4px}</style></head><body>
<h1>Video-QA 23-11: de eerste 15 minuten van een nieuw spel</h1>
<p class="meta">De belangrijkste beelden van de opname (Spelbot met menselijk profiel, vaste tijdstap, 1920x1080). Volledige lijst en uitleg: docs/VIDEO-QA-23-11.md.</p>
${list.map((b, i) => `<div class="b"><h2>${i + 1}. ${esc(b.titel)}</h2><span class="tag" style="background:${kleur[b.ernst] || '#555'}">${esc(b.ernst)}</span><span class="meta">${esc(b.tijd || '')} &middot; beeld ${esc((b.frames || [b.frame]).join(', '))}</span>
<p>${esc(b.beschrijving)}</p>${b.code ? `<p class="meta">Waarschijnlijke code: <code>${esc(b.code)}</code></p>` : ''}
<div class="fr">${(b.frames || [b.frame]).map((f) => `<figure><img src="${img(f)}" alt="beeld ${f}"><figcaption>beeld ${f} (${(f / 30).toFixed(1)} s)</figcaption></figure>`).join('')}</div></div>`).join('\n')}
</body></html>`;
fs.writeFileSync(outFile, html);
for (const f of fs.readdirSync(tmp)) fs.unlinkSync(path.join(tmp, f));
fs.rmdirSync(tmp);
console.log(`${outFile}: ${(html.length / 1e6).toFixed(2)} MB, ${frames.length} beelden`);
