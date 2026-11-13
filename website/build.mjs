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

function htmlVeilig(tekst) {
  return String(tekst)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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
            <p class="kicker">${htmlVeilig(show.kicker)}</p>
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

  const slides = SLIDESHOWS.reduce((som, show) => som + show.slides.length, 0);
  console.log(`website/_site gebouwd: ${aantal} bestanden, ${(bytes / 1048576).toFixed(2)} MB, ${SLIDESHOWS.length} slideshows met ${slides} slides.`);
  console.log('Lokaal bekijken: node website/serve.mjs');
}

main();
