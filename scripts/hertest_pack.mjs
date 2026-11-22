// Hertest-ronde (docs/HERTEST-22-11.md): draait de scenes uit scripts/ui/hertest_scenes.js (alleen met --draai, in een Electron-run
// die de coordinator na de perf-meting start), verzamelt het bewijs en bouwt ÉÉN webpagina met per issue: titel, wat te controleren,
// beeld en meting, en de knoppen Opgelost / Nog niet / Nieuw punt met een kopieerbaar JSON-resultaat voor scripts/hertest_sluit.mjs.
//   node scripts/hertest_pack.mjs                       toont het plan (welke scenes, welke maten); draait niets
//   node scripts/hertest_pack.mjs --draai --uit=<map>   draait ui_shots per maat (een Electron tegelijk), bouwt daarna de pagina
//   node scripts/hertest_pack.mjs --bewijs=<map>        bouwt de pagina uit bewijs dat er al ligt (<map>/<maat>/...)
// Opties: --only=1177,1141  --uit=<map>  --beelden=inbed|verwijs (standaard inbed: een pagina, geen losse bestanden)
//         --datum=JJJJ-MM-DD  --repo=<eigenaar/naam> (maakt het issuenummer een link)
// De pagina wordt NIET geopend en er gaat niets naar buiten. De keuzes staan in de localStorage van de pagina zelf, niet van het spel.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SCENES_FILE = path.join(root, 'scripts', 'ui', 'hertest_scenes.js');
export const SIZES = ['1280x720', '1920x1080'];
export const RUN_ID = 'hertest-22-11';

// De scene-definities laden zonder Electron: het bestand is een scriptbody met top-level await; met __HERTEST_DEFS_ONLY draait alleen de data.
export async function loadScenes(file = SCENES_FILE) {
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const src = fs.readFileSync(file, 'utf8');
  const had = Object.prototype.hasOwnProperty.call(globalThis, '__HERTEST_DEFS_ONLY');
  globalThis.__HERTEST_DEFS_ONLY = true;
  try {
    await new AsyncFunction('window', 'document', src)({}, {});
    return globalThis.__HERTEST_SCENES;
  } finally { if (!had) delete globalThis.__HERTEST_DEFS_ONLY; }
}

// Het plan: per maat de lijst scenes die een beeld of meting leveren.
export function planRun(scenes, only = []) {
  const keuze = Object.values(scenes).filter((s) => s.kind !== 'question' && (!only.length || only.includes(String(s.nr))));
  const perMaat = {};
  for (const s of keuze) for (const m of s.sizes) (perMaat[m] = perMaat[m] || []).push(s.nr);
  return perMaat;
}

// '[hertest] {json}'-regels uit een _log-<maat>.txt
export function parseLog(text) {
  const out = [];
  for (const regel of String(text || '').split(/\r?\n/)) {
    const m = regel.match(/\[hertest\] (\{.*\})\s*$/);
    if (!m) continue;
    try { const ev = JSON.parse(m[1]); if (ev && ev.nr) out.push(ev); } catch (e) { /* halve regel */ }
  }
  return out;
}

// Bewijs uit een map met <maat>-submappen (of de maat-bestanden direct in de map): { [nr]: { runs: [ev], shots: [{ size, name, file }] } }
export function collectEvidence(dir) {
  const ev = {};
  const get = (nr) => ev[nr] || (ev[nr] = { runs: [], shots: [] });
  const scan = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) { scan(p); continue; }
      let m;
      if ((m = f.name.match(/^_log-(\d+x\d+)\.txt$/))) for (const r of parseLog(fs.readFileSync(p, 'utf8'))) get(r.nr).runs.push({ ...r, size: r.size || m[1] });
      else if ((m = f.name.match(/^(\d+x\d+)-h(\d+)-([A-Za-z0-9_]+)\.png$/))) get(Number(m[2])).shots.push({ size: m[1], name: m[3], file: p });
    }
  };
  if (fs.existsSync(dir)) scan(dir);
  return ev;
}

const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonInScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const KIND_LABEL = { image: 'Beeld', metric: 'Meting', question: 'Alleen een mens kan dit beoordelen' };

// De ene pagina. evidence = collectEvidence(...); images: 'inbed' (data-URI, één bestand) of 'verwijs' (relatief pad)
export function buildPage(scenes, evidence = {}, { date = '', images = 'inbed', repo = '', baseDir = '' } = {}) {
  const items = Object.values(scenes).sort((a, b) => a.nr - b.nr).map((s) => {
    const e = evidence[s.nr] || { runs: [], shots: [] };
    const shots = [...e.shots].sort((a, b) => (a.name + a.size).localeCompare(b.name + b.size)).map((sh) => {
      let src = '';
      if (images === 'inbed') { try { src = 'data:image/png;base64,' + fs.readFileSync(sh.file).toString('base64'); } catch (er) { src = ''; } }
      else src = path.relative(baseDir || path.dirname(sh.file), sh.file).replace(/\\/g, '/');
      return { ...sh, src };
    });
    const metrics = {}; const notes = []; let fout = false;
    for (const r of e.runs) { Object.assign(metrics, r.metrics || {}); for (const n of r.notes || []) notes.push(n); if (r.status !== 'ok') fout = true; }
    const hasEvidence = shots.length > 0 || Object.keys(metrics).length > 0;
    return { s, shots, metrics, notes, fout, hasEvidence, ran: e.runs.length > 0 };
  });
  const nrLink = (nr) => (repo ? `<a href="https://github.com/${esc(repo)}/issues/${nr}" rel="noreferrer">#${nr}</a>` : `#${nr}`);
  const block = (it) => {
    const { s } = it;
    const bewijs = [];
    if (it.shots.length) bewijs.push(`<div class="beelden">${it.shots.map((sh) => `<figure><img loading="lazy" src="${esc(sh.src)}" alt="Issue ${s.nr}, beeld ${esc(sh.name)}"><figcaption>${esc(sh.name)} (${esc(sh.size)})</figcaption></figure>`).join('')}</div>`);
    if (Object.keys(it.metrics).length) bewijs.push(`<table class="meting"><tbody>${Object.entries(it.metrics).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</td></tr>`).join('')}</tbody></table>`);
    if (it.notes.length) bewijs.push(`<ul class="notities">${it.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`);
    let status;
    if (s.kind === 'question') status = 'Geen scene: alleen een mens kan dit beoordelen.';
    else if (!it.ran) status = 'Nog niet gedraaid: de scene heeft geen bewijs opgeleverd.';
    else if (it.fout && !it.hasEvidence) status = 'De scene is mislukt: zie de notitie; beoordeel dit in het echte spel.';
    else if (it.fout) status = 'De scene gaf een fout; het bewijs hieronder is mogelijk onvolledig.';
    else status = 'Bewijs uit het draaiende spel; geen mens heeft het bekeken voordat jij kijkt.';
    const vragen = [...(s.questions || [])];
    return `<article id="i${s.nr}" data-nr="${s.nr}"><h2>${nrLink(s.nr)} ${esc(s.title)} <span class="soort soort-${esc(s.kind)}">${esc(KIND_LABEL[s.kind] || s.kind)}</span></h2>
<p class="check"><strong>Controleer:</strong> ${esc(s.check)}</p><p class="verwacht"><strong>Verwacht:</strong> ${esc(s.expected)}</p>
${(s.steps || []).length ? `<ol class="stappen">${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
${vragen.length ? `<ul class="vragen">${vragen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<p class="status${it.fout ? ' fout' : ''}">${esc(status)}</p>${bewijs.join('')}
<div class="keuzes"><button data-k="fixed" aria-pressed="false">Opgelost</button><button class="geel" data-k="not-yet" aria-pressed="false">Nog niet</button><button class="blauw" data-k="new-point" aria-pressed="false">Nieuw punt</button>
<textarea rows="2" placeholder="Opmerking (bij Nog niet en Nieuw punt: wat zag je?)"></textarea></div></article>`;
  };
  const titel = `GDE Groningen hertest ${date || ''}`.trim();
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>${esc(titel)}</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;background:#15181c;color:#eef1f3;font:16px/1.45 system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:#15181cf2;padding:12px 20px;border-bottom:1px solid #2c333a;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header h1{font-size:18px;margin:0}
button{font:inherit;color:inherit;background:#252b32;border:1px solid #3a434c;border-radius:8px;padding:8px 14px;cursor:pointer}
button:hover{background:#2f3740}button[aria-pressed=true]{background:#2f6b3c;border-color:#4a9a5c}
button.geel[aria-pressed=true]{background:#8a6a1f;border-color:#c9a447}button.blauw[aria-pressed=true]{background:#2f4f8a;border-color:#5b86c2}
main{max-width:1500px;margin:0 auto;padding:12px 20px 80px}
article{margin:26px 0;padding-bottom:22px;border-bottom:1px solid #2c333a}
article h2{margin:0 0 6px;font-size:19px}article p{margin:4px 0}
.soort{font-size:12px;font-weight:400;border:1px solid #3a434c;border-radius:20px;padding:2px 9px;margin-left:8px;opacity:.85}
.status{opacity:.75;font-size:14px}.status.fout{color:#e0a45a;opacity:1}
.beelden{display:flex;gap:12px;flex-wrap:wrap}figure{margin:6px 0;flex:1 1 560px;max-width:100%}
img{width:100%;height:auto;border-radius:10px;border:1px solid #2c333a;display:block;background:#000}figcaption{font-size:13px;opacity:.7}
.meting th{text-align:left;padding-right:14px;font-weight:600;vertical-align:top}.meting td{font-family:ui-monospace,monospace;font-size:14px;word-break:break-all}
.keuzes{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;align-items:center}
textarea{flex:1;min-width:260px;background:#0f1215;color:inherit;border:1px solid #3a434c;border-radius:8px;padding:8px;font:inherit}
#uitvoer{width:100%;min-height:90px;font-family:ui-monospace,monospace;font-size:13px;margin-top:10px}
.noot{opacity:.75;font-size:14px}a{color:#8fb8ff}
</style></head><body>
<header><h1>${esc(titel)}: ${items.length} issues</h1><span id="tel" class="noot"></span>
<button id="kopieer">Kopieer JSON-resultaat</button><span id="melding" class="noot"></span></header>
<main>
<p class="noot">Per issue staat wat je moet controleren, het bewijs uit het draaiende spel en drie keuzes: Opgelost, Nog niet of Nieuw punt. Je keuzes blijven in deze browser staan. "Kopieer JSON-resultaat" geeft tekst die <code>node scripts/hertest_sluit.mjs --bestand=&lt;resultaat.json&gt;</code> inleest; standaard sluit dat niets (dry-run).</p>
${items.map(block).join('\n')}
<h2>Resultaat (JSON)</h2><textarea id="uitvoer" readonly></textarea>
</main>
<script>
const KEY = ${jsonInScript('gde-' + RUN_ID)};
const RUN = ${jsonInScript(RUN_ID)};
const DATUM = ${jsonInScript(date)};
const st = JSON.parse(localStorage.getItem(KEY) || '{}');
const arts = [...document.querySelectorAll('article')];
const maak = () => ({ version: 1, run: RUN, date: DATUM, results: arts.filter((a) => (st[a.dataset.nr] || {}).k).map((a) => ({ issue: Number(a.dataset.nr), outcome: st[a.dataset.nr].k, note: st[a.dataset.nr].opm || '' })) });
const toon = () => { const r = maak(); document.getElementById('tel').textContent = r.results.length + ' van ' + arts.length + ' beoordeeld'; document.getElementById('uitvoer').value = JSON.stringify(r, null, 2); };
const bewaar = () => { localStorage.setItem(KEY, JSON.stringify(st)); toon(); };
arts.forEach((a) => {
  const n = a.dataset.nr; const s = st[n] || (st[n] = {});
  const ta = a.querySelector('textarea'); ta.value = s.opm || '';
  const knoppen = [...a.querySelectorAll('button')];
  const teken = () => knoppen.forEach((b) => b.setAttribute('aria-pressed', String(s.k === b.dataset.k)));
  knoppen.forEach((b) => { b.onclick = () => { s.k = s.k === b.dataset.k ? '' : b.dataset.k; teken(); bewaar(); }; });
  ta.oninput = () => { s.opm = ta.value; bewaar(); };
  teken();
});
document.getElementById('kopieer').onclick = async () => {
  const t = JSON.stringify(maak(), null, 2);
  try { await navigator.clipboard.writeText(t); document.getElementById('melding').textContent = 'Gekopieerd'; } catch (e) { const u = document.getElementById('uitvoer'); u.select(); document.getElementById('melding').textContent = 'Selecteer en kopieer de tekst onderaan'; }
};
toon();
</script></body></html>
`;
}

function arg(naam, d) { const a = process.argv.find((x) => x.startsWith('--' + naam + '=')); return a ? a.slice(naam.length + 3) : d; }

async function main() {
  const scenes = await loadScenes();
  const only = arg('only', '').split(',').filter(Boolean);
  const datum = arg('datum', new Date().toISOString().slice(0, 10));
  const uit = path.resolve(arg('uit', path.join(root, 'release', 'hertest-22-11')));
  const bewijsDir = arg('bewijs', '');
  const plan = planRun(scenes, only);
  const aantal = (k) => Object.values(scenes).filter((s) => s.kind === k).length;
  console.log(`${Object.keys(scenes).length} issues: ${aantal('image')} beeld, ${aantal('metric')} meting, ${aantal('question')} alleen een mens.`);
  for (const [m, nrs] of Object.entries(plan)) console.log(`  ${m}: ${nrs.length} scenes (${nrs.join(', ')})`);
  let evDir = bewijsDir ? path.resolve(bewijsDir) : null;
  if (process.argv.includes('--draai')) {
    // Een Electron tegelijk, wegwerpprofiel (ui_shots maakt dat zelf). Alleen starten na de perf-meting (docs/HERTEST-22-11.md).
    evDir = path.join(uit, 'bewijs');
    for (const [m, nrs] of Object.entries(plan)) {
      const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'ui_shots.mjs'), `--sizes=${m}`, `--scenes=${SCENES_FILE}`, `--out=${path.join(evDir, m)}`, `--only=${nrs.join(',')}`, '--timeout=1500'], { cwd: root, stdio: 'inherit' });
      console.log(`${m}: ui_shots eindigde met ${r.status}`);
    }
  } else if (!evDir) {
    console.log('Niets gedraaid (geen --draai en geen --bewijs). Zie docs/HERTEST-22-11.md.');
    return;
  }
  const page = buildPage(scenes, collectEvidence(evDir), { date: datum, images: arg('beelden', 'inbed') === 'verwijs' ? 'verwijs' : 'inbed', repo: arg('repo', ''), baseDir: uit });
  fs.mkdirSync(uit, { recursive: true });
  const pad = path.join(uit, 'hertest.html');
  fs.writeFileSync(pad, page);
  console.log('pagina: ' + pad + ' (' + Math.round(page.length / 1024) + ' kB)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((e) => { console.error(e); process.exit(1); });
