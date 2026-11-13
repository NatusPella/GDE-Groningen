// Bouwt de marketingpagina voor GitHub Pages (#37): website/_site.
//   node website/build.mjs
// Alleen Node built-ins, geen npm. Kopieert index.html, style.css en (als hij bestaat) script.js,
// de gekozen beelden uit docs/screenshots, docs/steam/beelden en docs/youtube/beelden, plus de
// stills uit website/media/, en zet de slideshows uit slideshows.mjs in de pagina.
// Publiceert en uploadt niets: de workflow .github/workflows/pages.yml draait pas als de
// eigenaar hem met de hand start.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLIDESHOWS } from './slideshows.mjs';
import { HELP_PAGES } from './help-pages.mjs';

const WEBSITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(WEBSITE, '..');
const OUT = path.join(WEBSITE, '_site');
const MEDIA = path.join(WEBSITE, 'media');
const STEAM = path.join(ROOT, 'docs', 'steam', 'beelden', 'screenshots');

// Pad in _site -> bronbestand. Alleen beelden die de pagina echt gebruikt.
const BESTANDEN = [
  ['index.html', path.join(WEBSITE, 'index.html')],
  ['style.css', path.join(WEBSITE, 'style.css')],
  ['favicon.svg', path.join(ROOT, 'desktop', 'resources', 'icon.svg')], // het eigen app-icoon uit de repo
  ['img/stad-dag.webp', path.join(ROOT, 'docs', 'screenshots', 'stad-dag.webp')],
  ['img/stad-nacht.webp', path.join(ROOT, 'docs', 'screenshots', 'stad-nacht.webp')],
  ['img/kaart-provincie.webp', path.join(ROOT, 'docs', 'screenshots', 'kaart-provincie.webp')],
  ['img/kaart-stad.webp', path.join(ROOT, 'docs', 'screenshots', 'kaart-stad.webp')],
  ['img/garage.webp', path.join(ROOT, 'docs', 'screenshots', 'garage.webp')],
  ['img/samen-spelen.webp', path.join(ROOT, 'docs', 'screenshots', 'samen-spelen.webp')],
  ['img/opgeslagen-spellen.webp', path.join(ROOT, 'docs', 'screenshots', 'opgeslagen-spellen.webp')],
  ['img/cutscene-opening.webp', path.join(ROOT, 'docs', 'screenshots', 'cutscene-opening.webp')],
  ['img/kust-sluis.webp', path.join(ROOT, 'docs', 'screenshots', 'kust-sluis.webp')],
  ['img/01-missie-hud.jpg', path.join(STEAM, '01-missie-hud.jpg')],
  ['img/02-vismarkt.jpg', path.join(STEAM, '02-vismarkt.jpg')],
  ['img/03-ringrace.jpg', path.join(STEAM, '03-ringrace.jpg')],
  ['img/05-kermis.jpg', path.join(STEAM, '05-kermis.jpg')],
  ['img/08-rondvaart.jpg', path.join(STEAM, '08-rondvaart.jpg')],
  ['img/09-achtervolging.jpg', path.join(STEAM, '09-achtervolging.jpg')],
  ['img/10-duif.jpg', path.join(STEAM, '10-duif.jpg')],
  ['img/trailer.jpg', path.join(ROOT, 'docs', 'youtube', 'beelden', 'thumbnail_gameplaytrailer.jpg')],
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

// De stills uit de trailer staan als webp in website/media/ en gaan één op één naar _site/img/.
function kopieerMedia() {
  if (!fs.existsSync(MEDIA)) throw new Error('website/media ontbreekt');
  let bytes = 0, aantal = 0;
  for (const naam of fs.readdirSync(MEDIA).sort()) {
    const bron = path.join(MEDIA, naam);
    if (!fs.statSync(bron).isFile() || !/\.(webp|jpg|png)$/i.test(naam)) continue;
    bytes += kopieer(bron, path.join(OUT, 'img', naam));
    aantal++;
  }
  return { bytes, aantal };
}

// De hulppagina's (#37) gebruiken dezelfde stylesheet en een eigen, lichte header/footer.
function htmlVeilig(tekst) {
  return String(tekst)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function helpPagina(page) {
  const isIndex = page.slug === 'index';
  const bestand = isIndex ? 'index.html' : `${page.slug}.html`;
  const canonical = `https://natuspella.github.io/GDE-Groningen/help/${isIndex ? '' : bestand}`;
  const titel = isIndex ? 'Hulp – GDE Groningen' : `${page.titel} – Hulp – GDE Groningen`;
  const nav = [
    ['../#wat-je-kunt-doen', 'Wat je doet'],
    ['../#beelden', 'Beelden'],
    ['../#spelen', 'Spelen'],
    ['./', 'Hulp'],
    ['../#delen', 'Delen'],
    ['../#vragen', 'Vragen'],
  ];
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlVeilig(titel)}</title>
  <meta name="description" content="${htmlVeilig(page.beschrijving)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <meta name="theme-color" content="#0c140e">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${htmlVeilig(titel)}">
  <meta property="og:description" content="${htmlVeilig(page.beschrijving)}">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:url" content="${canonical}">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <a class="skip-link" href="#inhoud">Direct naar de inhoud</a>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="../" aria-label="GDE Groningen – naar de marketingpagina">
        <span class="brand-mark" aria-hidden="true">GDE</span>
        <span class="brand-text">Groningen <small>Zomer vol misdaad</small></span>
      </a>
      <nav class="site-nav" aria-label="Hoofdnavigatie">
        <ul>
          ${nav.map(([href, label]) => `<li><a href="${href}"${label === 'Hulp' ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n          ')}
          <li><a class="nav-cta" href="https://github.com/NatusPella/GDE-Groningen/releases/latest">Download</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="inhoud">
    <article class="wrap help-content">
      <p class="kicker">Hulp</p>
      <h1>${htmlVeilig(page.titel)}</h1>
      <p class="lead">${htmlVeilig(page.intro)}</p>
      ${page.body}
    </article>
  </main>

  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div>
        <p class="footer-brand">GDE Groningen – Zomer vol misdaad</p>
        <p>Een gratis open-wereldkomedie voor 18+ in het echte Groningen.</p>
      </div>
      <div>
        <h2 class="footer-heading">GDE</h2>
        <ul class="footer-links">
          <li><a href="../">Marketingpagina</a></li>
          <li><a href="https://github.com/NatusPella/GDE-Groningen/releases">Downloads</a></li>
          <li><a href="https://github.com/NatusPella/GDE-Groningen/issues">Issues</a></li>
          <li><a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/README.md">Documentatie</a></li>
          <li><a href="https://github.com/NatusPella/GDE-Groningen/blob/main/docs/PRIVACY-EN-CREDITS.md">Privacy en credits</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer-heading">Over deze hulp</h2>
        <p>Deze pagina is onderdeel van de marketingpagina en gebruikt geen cookies of analytics. Vragen of aanvullingen? Open een issue.</p>
      </div>
    </div>
    <div class="wrap footer-bottom">
      <p>© 2026 NatusPella · 18+ · Openbare playtest · <a href="../">Naar de marketingpagina</a></p>
    </div>
  </footer>
</body>
</html>`;
}

function schrijfHelpPaginas() {
  const dir = path.join(OUT, 'help');
  fs.mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (const page of HELP_PAGES) {
    const bestand = page.slug === 'index' ? 'index.html' : `${page.slug}.html`;
    const html = helpPagina(page);
    fs.writeFileSync(path.join(dir, bestand), html, 'utf8');
    bytes += Buffer.byteLength(html);
  }
  return { bytes, aantal: HELP_PAGES.length };
}

// Relatieve links in een hulppagina moeten na de build bestaan; zo faalt een typefout hier.
function controleerHelpPaginas() {
  const dir = path.join(OUT, 'help');
  for (const page of HELP_PAGES) {
    const bestand = page.slug === 'index' ? 'index.html' : `${page.slug}.html`;
    const html = fs.readFileSync(path.join(dir, bestand), 'utf8');
    for (const m of html.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/gi)) {
      const url = m[1].trim();
      if (!url || url.startsWith('#') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('data:')) continue;
      const doel = path.resolve(dir, url.split('?')[0].split('#')[0]);
      if (!fs.existsSync(doel)) throw new Error(`help/${bestand}: lokaal pad bestaat niet: ${url}`);
    }
  }
}

function sliderHtml(show) {
  const slides = show.slides.map((slide) => `
              <li class="slide">
                <figure class="slide-figure">
                  <img src="${htmlVeilig(slide.img)}" alt="${htmlVeilig(slide.alt)}" width="1280" height="720" loading="lazy" decoding="async">
                  <figcaption class="slide-caption"><span class="slide-tag">${htmlVeilig(slide.tag)}</span><strong>${htmlVeilig(slide.title)}</strong><span>${htmlVeilig(slide.text)}</span></figcaption>
                </figure>
              </li>`).join('');
  return `
        <section class="slideshow" id="slideshow-${htmlVeilig(show.id)}" role="tabpanel" aria-labelledby="tab-${htmlVeilig(show.id)}" data-slideshow-panel="${htmlVeilig(show.id)}">
          <div class="wrap">
            <h3 id="slideshow-${htmlVeilig(show.id)}-titel">${htmlVeilig(show.title)}</h3>
            <p class="section-lead">${htmlVeilig(show.lead)}</p>
            <div class="slider" data-slider>
              <div class="slider-viewport" tabindex="0" role="region" aria-label="${htmlVeilig(show.title)}">
                <ul class="slider-track" data-slider-track>${slides}
                </ul>
              </div>
              <div class="slider-controls" data-slider-controls hidden>
                <button type="button" class="slider-btn" data-slider-prev aria-label="Vorige highlight">←</button>
                <div class="slider-dots" data-slider-dots></div>
                <button type="button" class="slider-btn" data-slider-next aria-label="Volgende highlight">→</button>
              </div>
            </div>
          </div>
        </section>`;
}

// De zes categorieën als tabs: één slider tegelijk zichtbaar (JS), zonder JS staan ze
// onder elkaar en blijven ze allemaal leesbaar.
function showcaseHtml() {
  const tabs = SLIDESHOWS.map((show, i) => `
          <button type="button" class="showcase-tab" role="tab" id="tab-${htmlVeilig(show.id)}" aria-controls="slideshow-${htmlVeilig(show.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-slideshow-tab="${htmlVeilig(show.id)}">${htmlVeilig(show.kicker)}</button>`).join('');
  return `
      <nav class="wrap showcase-tabs" role="tablist" aria-label="Beeldcategorieën" data-showcase-tabs>${tabs}
      </nav>
      <div class="showcase-panels">${SLIDESHOWS.map(sliderHtml).join('\n')}
      </div>`;
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
  const media = kopieerMedia();
  bytes += media.bytes;
  aantal += media.aantal;

  // Hulp- en uitlegpagina's genereren.
  const help = schrijfHelpPaginas();
  bytes += help.bytes;
  aantal += help.aantal;

  // De slideshows uit één databestand in de pagina zetten.
  const indexPad = path.join(OUT, 'index.html');
  const bronHtml = fs.readFileSync(indexPad, 'utf8');
  if (!bronHtml.includes('<!-- SLIDESHOWS -->')) throw new Error('index.html mist <!-- SLIDESHOWS -->');
  const html = bronHtml.replace('<!-- SLIDESHOWS -->', showcaseHtml());
  fs.writeFileSync(indexPad, html, 'utf8');

  const mis = [...lokaleVerwijzingen(html)].filter((url) => !fs.existsSync(path.join(OUT, url)));
  if (mis.length) {
    console.error('website/build.mjs: deze lokale paden uit index.html bestaan niet in _site:');
    for (const m of mis) console.error('  - ' + m);
    process.exit(1);
  }
  controleerHelpPaginas();

  const slides = SLIDESHOWS.reduce((som, show) => som + show.slides.length, 0);
  console.log(`website/_site gebouwd: ${aantal} bestanden, ${(bytes / 1048576).toFixed(2)} MB, ${SLIDESHOWS.length} slideshows met ${slides} slides, ${HELP_PAGES.length} hulppagina's.`);
  console.log('Lokaal bekijken: node website/serve.mjs');
}

main();
