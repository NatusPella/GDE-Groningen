// Eén webpagina met M01-M06 zoals een speler ze ziet (scripts/qa/akte1_missies.mjs, omgezet met png_naar_jpg.mjs --voorvoegsel=missie-):
// per missie de start, een moment in het midden, een gefaalde poging, Opnieuw proberen en de eindkaart, met de bevindingen erbij.
//   node scripts/akte1/missies_pagina.mjs [--out=docs/beeld-23-11/akte1] [--stand=<akte1_missies.json>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(ROOT, arg('out', 'docs/beeld-23-11/akte1'));
const standPad = arg('stand');
const stand = standPad && fs.existsSync(standPad) ? JSON.parse(fs.readFileSync(standPad, 'utf8')) : {};
const NAMEN = { m01: 'M01 Nul krassen, vijftienhonderd punten', m02: 'M02 Even pinnen', m03: 'M03 Het Loket', m04: 'M04 Kieken van boven', m05: 'M05 Wind tegen, beide kanten op', m06: 'M06 Het museum stond er al zo' };
const MOMENTEN = [['1-start', 'Start'], ['2-midden', 'Midden'], ['3-gefaald', 'Gefaalde poging'], ['4-opnieuw', 'Opnieuw proberen'], ['5-eindkaart', 'Eindkaart']];
const img = (f) => (fs.existsSync(path.join(OUT, f)) ? `<img src="${f}" alt="${f}" loading="lazy">` : '<div class="leeg">niet gemaakt</div>');
let body = '';
for (const [m, naam] of Object.entries(NAMEN)) {
  const s = (stand.stand || {})[m];
  body += `<h2>${naam}</h2>${s ? `<p class="meta">Opnieuw proberen: ${s.viaEnter ? 'met Enter op de kaart' : s.viaKnop ? 'via Overzicht (Enter werkte niet)' : s.fase === 'idle' ? 'Enter zette de nieuwe poging klaar; de missie wacht op haar startvoorwaarde (zie het beeld)' : 'niet gelukt'}${s.blokkade ? ` · blokkade: ${s.blokkade}` : ''}</p>` : ''}<div class="rij">`;
  for (const [k, titel] of MOMENTEN) body += `<figure>${img(`missie-${m}-${k}.jpg`)}<figcaption>${titel}</figcaption></figure>`;
  body += '</div>\n';
}
const fouten = (stand.fouten || []).map((f) => `<li>${f.replace(/</g, '&lt;')}</li>`).join('');
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Akte 1: M01-M06 als speler</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:24px auto;max-width:1700px;padding:0 16px;background:#f4f1ea;color:#1d1d1d}
h2{margin-top:30px;border-bottom:2px solid #c9b48a}.rij{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}figure{margin:0}
img{width:100%;border-radius:4px;display:block}figcaption{font-size:13px;color:#555}.leeg{background:#ddd;aspect-ratio:16/9;display:grid;place-items:center}
.meta{color:#555}.let{background:#fff7e0;border-left:4px solid #d9a53a;padding:8px 12px}</style></head><body>
<h1>Akte 1: M01-M06 zoals een speler ze ziet</h1>
<p>Electron via de veilige runner (<code>scripts/qa/akte1_missies.mjs</code>): elke missie gestart, een stap verder, verloren (de faalkaart), opnieuw
geprobeerd met Enter, en gewonnen (de eindkaart). De missies zijn met de debug-haak gestart, verloren en gewonnen, niet uitgespeeld; de reden
op de faalkaart is daarom 'Afgebroken in de testmodus'.</p>
${fouten ? `<p class="let">Fouten in de run:</p><ul>${fouten}</ul>` : ''}
${body}</body></html>`;
fs.writeFileSync(path.join(OUT, 'missies.html'), html);
console.log('geschreven:', path.relative(ROOT, path.join(OUT, 'missies.html')));
