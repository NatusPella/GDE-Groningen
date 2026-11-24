// Hertest-rapport (kwaliteitsmachine): één webpagina met per issue de vraag, de beelden en een voorlopig oordeel, plus een
// samenvatting met aantallen. Beelden gaan als jpg naar <uit>/beelden (niet in git); de pagina verwijst er relatief naar.
//   node scripts/qa/hertest_rapport.mjs --oordelen=<json> --uit=docs/hertest-23-11 [--issues=<gh-json>[,<gh-json>]] [--titel=...] [--jpg=85]
// oordelen: { inleiding?, bronnen?: [tekst], items: [{ issue, titel?, vraag, oordeel: 'opgelost'|'deels'|'niet'|'niet-te-zien',
//             reden, beelden: [{ pad, bijschrift?, voor?: true }] }] }
// soorten (optioneel): eigen oordeelsoorten { sleutel: [css-klasse ok|let|fout|grijs, woord] }, bv. voor de beeldregressie.
// --issues: uitvoer van `gh issue list --json number,title` (titels als het item er zelf geen heeft).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const opt = (k, d = null) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
export const STANDAARD = {
  opgelost: ['ok', 'lijkt opgelost'],
  deels: ['let', 'deels opgelost'],
  niet: ['fout', 'niet opgelost'],
  'niet-te-zien': ['grijs', 'niet te zien'],
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Telt de oordelen; puur.
export function tel(items, OORDEEL = STANDAARD) {
  const t = { totaal: items.length };
  for (const k of Object.keys(OORDEEL)) t[k] = items.filter((i) => i.oordeel === k).length;
  return t;
}

// Bouwt de HTML; puur (beelden zijn al relatieve paden).
export function bouwHtml({ titel, inleiding = '', bronnen = [], items, soorten = null }) {
  const OORDEEL = soorten || STANDAARD;
  const t = tel(items, OORDEEL);
  const kop = Object.entries(OORDEEL).map(([k, [cls, woord]]) => `<span class="b ${cls}">${esc(woord)}: ${t[k]}</span>`).join(' ');
  const rij = (it) => {
    const [cls, woord] = OORDEEL[it.oordeel] || ['grijs', it.oordeel];
    const beelden = (it.beelden || []).map((b) => `<figure${b.voor ? ' class="voor"' : ''}><a href="${esc(b.pad)}"><img loading="lazy" src="${esc(b.pad)}" alt=""></a><figcaption>${b.voor ? '<b>voor (22-11)</b> ' : ''}${esc(b.bijschrift || path.basename(b.pad))}</figcaption></figure>`).join('');
    return `<section id="i${it.issue}" data-oordeel="${esc(it.oordeel)}"><h2>${/^\d+$/.test(String(it.issue)) ? `<a href="https://github.com/NatusPella/GDE-Groningen/issues/${it.issue}">#${it.issue}</a>` : esc(it.issue)} ${esc(it.titel)}</h2>
<p class="vraag"><b>Vraagt:</b> ${esc(it.vraag)}</p>
<p class="oordeel"><span class="b ${cls}">${esc(woord)}</span> ${esc(it.reden)}</p>
${beelden ? `<div class="beelden">${beelden}</div>` : '<p class="geen">Geen beeld.</p>'}</section>`;
  };
  const filters = ['alle', ...Object.keys(OORDEEL)].map((k) => `<button data-f="${k}">${esc(k === 'alle' ? 'alle' : OORDEEL[k][1])}</button>`).join('');
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>
body{font:15px/1.45 system-ui,sans-serif;margin:0 auto;max-width:1500px;padding:16px 24px;background:#f4efe2;color:#1d1d1b}
h1{margin:.2em 0}h2{font-size:18px;margin:0 0 .3em}section{background:#fffdf7;border:1px solid #d8d0bb;border-radius:6px;padding:12px 16px;margin:14px 0}
.b{display:inline-block;padding:1px 8px;border-radius:10px;font-weight:600;font-size:13px}.ok{background:#cdebd3;color:#145a26}.let{background:#fbe7b3;color:#6b4a00}
.fout{background:#f6c9c4;color:#7a1a10}.grijs{background:#e3e3e3;color:#444}.beelden{display:flex;flex-wrap:wrap;gap:10px}
figure{margin:0;width:470px}figure.voor{opacity:.8}figure img{width:100%;border:1px solid #bbb}figcaption{font-size:12px;color:#555}
.vraag,.oordeel{margin:.25em 0}nav button{margin-right:6px}table{border-collapse:collapse}td{padding:2px 10px}a{color:#0c5a2c}
</style></head><body><h1>${esc(titel)}</h1><p>${kop} <span class="b grijs">totaal: ${t.totaal}</span></p>
${inleiding ? `<div>${inleiding}</div>` : ''}${bronnen.length ? `<ul>${bronnen.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
<nav>Toon: ${filters}</nav>
${items.map(rij).join('\n')}
<script>for(const b of document.querySelectorAll('nav button'))b.onclick=()=>{for(const s of document.querySelectorAll('section'))s.hidden=b.dataset.f!=='alle'&&s.dataset.oordeel!==b.dataset.f;};</script>
</body></html>`;
}

function naarJpg(bron, doel, kwaliteit) {
  if (/\.jpe?g$/i.test(bron)) { fs.copyFileSync(bron, doel); return true; }
  const q = Math.max(2, Math.min(10, Math.round((100 - kwaliteit) / 5)));
  return spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', bron, '-q:v', String(q), doel]).status === 0;
}

function main() {
  const uit = path.resolve(opt('uit', 'docs/hertest'));
  const data = JSON.parse(fs.readFileSync(path.resolve(opt('oordelen')), 'utf8'));
  const titels = {};
  for (const f of String(opt('issues', '')).split(',').filter(Boolean)) for (const i of JSON.parse(fs.readFileSync(f, 'utf8'))) titels[i.number] = i.title;
  const map = path.join(uit, 'beelden'); fs.mkdirSync(map, { recursive: true });
  const kw = Number(opt('jpg', 85));
  let n = 0, mis = 0;
  const items = data.items.map((it) => ({
    ...it, titel: it.titel || titels[it.issue] || '',
    beelden: (it.beelden || []).flatMap((b) => {
      if (!fs.existsSync(b.pad)) { mis++; console.log(`ontbreekt: ${b.pad} (#${it.issue})`); return []; }
      const naam = `${it.issue}-${(b.voor ? 'voor-' : '')}${path.basename(b.pad).replace(/\.(png|jpe?g)$/i, '')}.jpg`.replace(/[^\w.+-]/g, '_');
      if (!naarJpg(b.pad, path.join(map, naam), kw)) { mis++; return []; }
      n++; return [{ ...b, pad: 'beelden/' + naam }];
    }),
  }));
  const OORDEEL = data.soorten || STANDAARD;
  fs.writeFileSync(path.join(uit, 'index.html'), bouwHtml({ titel: opt('titel', data.titel || 'Hertest in beeld'), inleiding: data.inleiding, bronnen: data.bronnen || [], items, soorten: data.soorten }));
  const t = tel(items, OORDEEL);
  console.log(`${path.join(uit, 'index.html')}: ${t.totaal} issues, ${n} beelden${mis ? `, ${mis} ontbrekend` : ''}`);
  console.log(Object.keys(OORDEEL).map((k) => `${k} ${t[k]}`).join(', '));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
