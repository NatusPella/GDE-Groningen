// Bouwt de marketingpagina voor GitHub Pages (#37): website/_site.
//   node website/build.mjs
// Alleen Node built-ins, geen npm. Kopieert index.html, style.css en (als hij bestaat) script.js,
// plus de gekozen beelden uit docs/screenshots en docs/social-preview.png, naar de paden die
// index.html verwacht. Publiceert en uploadt niets: de workflow .github/workflows/pages.yml
// draait pas als de eigenaar hem met de hand start.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEBSITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(WEBSITE, '..');
const OUT = path.join(WEBSITE, '_site');

// Pad in _site -> bronbestand. Alleen beelden die de pagina echt gebruikt.
const BESTANDEN = [
  ['index.html', path.join(WEBSITE, 'index.html')],
  ['style.css', path.join(WEBSITE, 'style.css')],
  ['favicon.svg', path.join(ROOT, 'desktop', 'resources', 'icon.svg')], // het eigen app-icoon uit de repo
  ['img/stad-dag.webp', path.join(ROOT, 'docs', 'screenshots', 'stad-dag.webp')],
  ['img/stad-nacht.webp', path.join(ROOT, 'docs', 'screenshots', 'stad-nacht.webp')],
  ['img/kaart-provincie.webp', path.join(ROOT, 'docs', 'screenshots', 'kaart-provincie.webp')],
  ['img/achtervolging.webp', path.join(ROOT, 'docs', 'screenshots', 'achtervolging.webp')],
  ['img/garage.webp', path.join(ROOT, 'docs', 'screenshots', 'garage.webp')],
  ['img/samen-spelen.webp', path.join(ROOT, 'docs', 'screenshots', 'samen-spelen.webp')],
  ['img/cutscene-opening.webp', path.join(ROOT, 'docs', 'screenshots', 'cutscene-opening.webp')],
  ['img/social-preview.png', path.join(ROOT, 'docs', 'social-preview.png')],
];
// Alleen meenemen als hij bestaat; de pagina werkt ook zonder JavaScript.
const OPTIONEEL = [['script.js', path.join(WEBSITE, 'script.js')]];

function kopieer(bron, doel) {
  if (!fs.existsSync(bron)) throw new Error(`bronbestand ontbreekt: ${path.relative(ROOT, bron)}`);
  fs.mkdirSync(path.dirname(doel), { recursive: true });
  fs.copyFileSync(bron, doel);
  return fs.statSync(doel).size;
}

// Alle lokale src/href in de HTML moeten na de build in _site staan. Zo faalt een verkeerd pad
// hier en niet pas als de pagina online staat.
function lokaleVerwijzingen(html) {
  const uit = new Set();
  const re = /\b(?:src|href)\s*=\s*"([^"]+)"/gi;
  for (const m of html.matchAll(re)) {
    const url = m[1].trim();
    if (!url || url.startsWith('#') || url.startsWith('http://') || url.startsWith('https://')) continue;
    if (url.startsWith('mailto:') || url.startsWith('data:')) continue;
    uit.add(url.split('?')[0].split('#')[0]);
  }
  return uit;
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let bytes = 0, aantal = 0;
  for (const [doelpad, bron] of BESTANDEN) { bytes += kopieer(bron, path.join(OUT, doelpad)); aantal++; }
  for (const [doelpad, bron] of OPTIONEEL) {
    if (fs.existsSync(bron)) { bytes += kopieer(bron, path.join(OUT, doelpad)); aantal++; }
  }

  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  const mis = [...lokaleVerwijzingen(html)].filter((url) => !fs.existsSync(path.join(OUT, url)));
  if (mis.length) {
    console.error('website/build.mjs: deze lokale paden uit index.html bestaan niet in _site:');
    for (const m of mis) console.error('  - ' + m);
    process.exit(1);
  }

  console.log(`website/_site gebouwd: ${aantal} bestanden, ${(bytes / 1048576).toFixed(2)} MB.`);
  console.log('Lokaal bekijken: node website/serve.mjs');
}

main();
