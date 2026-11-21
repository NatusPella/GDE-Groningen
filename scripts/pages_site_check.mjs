// Controle van de webbuild voordat de Pages-workflow hem uploadt (#1090, docs/PAGES-WORKFLOW-21-11.md).
// Snel en zonder browser: kijkt alleen in de map. De echte browsercontrole blijft
// scripts/web_pages_check.mjs (lokaal, headless Chrome).
//   node scripts/pages_site_check.mjs <map> [--opus-only]     map = web-dist/ (of de samengestelde site met play/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Grenzen van GitHub Pages: site "aanbevolen" 1 GB, een bestand 100 MB.
export const LIMITS = { totalBytes: 950e6, fileBytes: 95e6 };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// Geeft een lijst problemen terug (leeg = goed).
export function checkSite(dir, { opusOnly = false } = {}) {
  const problems = [];
  const need = (rel) => { if (!fs.existsSync(path.join(dir, rel))) { problems.push('ontbreekt: ' + rel); return false; } return true; };
  const files = walk(dir);
  let total = 0, biggest = 0;
  for (const f of files) { const n = fs.statSync(f).size; total += n; biggest = Math.max(biggest, n); }
  if (total > LIMITS.totalBytes) problems.push(`site te groot voor Pages: ${(total / 1e6).toFixed(0)} MB > ${LIMITS.totalBytes / 1e6} MB`);
  if (biggest > LIMITS.fileBytes) problems.push(`bestand te groot voor Pages: ${(biggest / 1e6).toFixed(0)} MB`);

  if (need('index.html')) {
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    if (!html.includes('web.js')) problems.push('index.html laadt de loader web.js niet');
    // een absoluut pad (/js/...) breekt op het subpad /GDE-Groningen/play/
    const abs = html.match(/\b(?:src|href)=["']\/(?!\/)[^"']*/g);
    if (abs) problems.push('index.html heeft absolute paden: ' + abs.slice(0, 3).join(', '));
  }
  for (const f of ['sw.js', 'web.js']) {
    if (need(f) && /__GDE_[A-Z]+__/.test(fs.readFileSync(path.join(dir, f), 'utf8'))) problems.push(f + ' heeft nog een plaatshouder (build niet gestempeld)');
  }
  need('world/index.json');
  need('stad.json');
  if (need('audio/index.json')) {
    const idx = JSON.parse(fs.readFileSync(path.join(dir, 'audio', 'index.json'), 'utf8'));
    if (!idx.packs || !idx.packs.length) problems.push('audio/index.json heeft geen packs');
    if (opusOnly) {
      if (!idx.opusOnly) problems.push('audio/index.json mist opusOnly');
      const mp3 = files.filter((f) => /\.(mp3|wav)$/i.test(f));
      if (mp3.length) problems.push(`Opus-only, maar ${mp3.length} mp3/wav-bestanden staan er nog (${path.relative(dir, mp3[0])})`);
    }
  }
  return { problems, files: files.length, bytes: total, biggest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) { console.error('gebruik: node scripts/pages_site_check.mjs <map> [--opus-only]'); process.exit(2); }
  const r = checkSite(path.resolve(dir), { opusOnly: process.argv.includes('--opus-only') });
  console.log(`${dir}: ${r.files} bestanden, ${(r.bytes / 1e6).toFixed(1)} MB, grootste ${(r.biggest / 1e6).toFixed(1)} MB`);
  for (const p of r.problems) console.log('PROBLEEM ' + p);
  process.exit(r.problems.length ? 1 : 0);
}
