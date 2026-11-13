// Test voor de Pages-marketingpagina (#37): bouwt website/_site en controleert de eisen.
//   node scripts/website_test.mjs
// Faalt (exit 1) op: ontbrekende bron of build, externe load-time-bronnen, merknamen van anderen,
// ontbrekende title/lang/meta/og-tags, geen 18+-vermelding, dode relatieve paden, een lege CTA
// naar de releases, of een workflow die vanzelf zou publiceren. Alleen Node built-ins.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SLIDESHOWS } from '../website/slideshows.mjs';
import { HELP_PAGES } from '../website/help-pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEBSITE = path.join(ROOT, 'website');
const SITE = path.join(WEBSITE, '_site');
const RELEASES = 'https://github.com/NatusPella/GDE-Groningen/releases/latest';
const REPO = 'https://github.com/NatusPella/GDE-Groningen';
const PAGES = 'https://natuspella.github.io/GDE-Groningen/';
const OG_IMAGE = 'https://natuspella.github.io/GDE-Groningen/img/social-preview.png';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const lees = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const bestaat = (f) => fs.existsSync(path.join(SITE, f));

// Merknamen van anderen horen nergens in de site te staan; de patronen staan hier uit stukjes,
// zodat dit testbestand zichzelf niet raakt.
const VERBODEN = ['G' + 'TA', 'G' + 'TE', 'Grand' + ' Theft', 'Rock' + 'star', 'Take' + '-Two'];
const VERBODEN_RE = new RegExp('\\b(?:' + VERBODEN.join('|') + ')\\b', 'i');

// ------------------------------------------------------------------ 1. bron en build

for (const f of ['index.html', 'style.css', 'script.js', 'build.mjs', 'slideshows.mjs', 'help-pages.mjs']) {
  ok(fs.existsSync(path.join(WEBSITE, f)), `website/${f} bestaat`);
}
ok(fs.existsSync(path.join(ROOT, 'desktop', 'resources', 'icon.svg')), 'het app-icoon desktop/resources/icon.svg bestaat (favicon)');

const build = spawnSync(process.execPath, [path.join(WEBSITE, 'build.mjs')], { cwd: ROOT, encoding: 'utf8' });
ok(build.status === 0, 'website/build.mjs draait zonder fouten', (build.stderr || build.stdout || '').trim().split(/\r?\n/)[0] || '');

for (const f of ['index.html', 'style.css', '_site']) {
  ok(f === '_site' ? fs.existsSync(SITE) : bestaat(f), `website/${f} bestaat na de build`);
}

const html = bestaat('index.html') ? lees('index.html') : '';
const css = bestaat('style.css') ? lees('style.css') : '';
const gebouwd = fs.existsSync(path.join(SITE, 'index.html')) ? fs.readFileSync(path.join(SITE, 'index.html'), 'utf8') : '';
ok(html.length > 4000, 'index.html heeft echte inhoud', String(html.length));

// ------------------------------------------------------------------ 2. geen externe load-time-bronnen

const EXTERN = /^(?:https?:)?\/\//i;
const LAAD_REL = /\b(stylesheet|preload|preconnect|dns-prefetch|modulepreload|icon|manifest|apple-touch-icon)\b/i;

function externeLaders(bron) {
  const uit = [];
  for (const tag of bron.match(/<(?:img|script|source|iframe|video|audio|embed|object|link)\b[^>]*>/gi) || []) {
    const soort = (tag.match(/^<([a-z]+)/i) || [])[1].toLowerCase();
    if (soort === 'link') {
      const rel = (tag.match(/\brel\s*=\s*"([^"]*)"/i) || [])[1] || '';
      if (!LAAD_REL.test(rel)) continue; // gewone <a> mag wel naar GitHub wijzen; een link met rel=canonical laadt niets
    }
    for (const m of tag.matchAll(/\b(src|srcset|href|poster)\s*=\s*"([^"]*)"/gi)) {
      if (soort === 'link' && m[1].toLowerCase() !== 'href') continue;
      if (EXTERN.test(m[2].trim())) uit.push(`<${soort}> ${m[1]}="${m[2].trim()}"`);
    }
  }
  return uit;
}

const externeHtml = externeLaders(html);
ok(externeHtml.length === 0, 'geen externe load-time-bron in index.html', externeHtml.join('; '));
const externeCss = [
  ...(css.match(/url\(\s*['"]?(?:https?:)?\/\//gi) || []),
  ...(css.match(/@import\s+(?:url\(\s*)?['"]?(?:https?:)?\/\//gi) || []),
];
ok(externeCss.length === 0, 'geen externe url() of @import in style.css', externeCss.join('; '));
const externUitHtmlCss = [
  ...(html.match(/url\(\s*['"]?(?:https?:)?\/\//gi) || []),
  ...(html.match(/@import\s+(?:url\(\s*)?['"]?(?:https?:)?\/\//gi) || []),
];
ok(externUitHtmlCss.length === 0, 'geen externe url() of @import in de HTML', externUitHtmlCss.join('; '));
ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/.test(html), 'geen netwerkcode in de HTML');

// ------------------------------------------------------------------ 3. geen merknamen van anderen

function tekstBestanden(dir, uit = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tekstBestanden(p, uit);
    else if (/\.(html|css|js|mjs|svg|md|txt|json)$/i.test(e.name)) uit.push(p);
  }
  return uit;
}
const siteBestanden = tekstBestanden(WEBSITE);
const treffers = [];
for (const bestand of siteBestanden) {
  const tekst = fs.readFileSync(bestand, 'utf8');
  tekst.split(/\r?\n/).forEach((regel, i) => {
    if (VERBODEN_RE.test(regel)) treffers.push(`${path.relative(ROOT, bestand)}:${i + 1}`);
  });
}
ok(treffers.length === 0, 'geen merknamen van anderen in de sitebestanden', treffers.join(', '));

// ------------------------------------------------------------------ 4. meta, taal en Open Graph

const titel = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
ok(/GDE Groningen/.test(titel) && /Zomer vol misdaad/.test(titel), 'title noemt "GDE Groningen – Zomer vol misdaad"', titel.trim());
ok(/<html[^>]*\blang\s*=\s*"nl"/i.test(html), 'html heeft lang="nl"');
const omschrijving = (html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || [])[1] || '';
ok(omschrijving.length >= 50, 'meta description is gevuld', String(omschrijving.length));
ok(/<meta\s+property="og:title"\s+content="[^"]+"/i.test(html), 'og:title staat er');
ok(/<meta\s+property="og:description"\s+content="[^"]+"/i.test(html), 'og:description staat er');
const ogBeeld = (html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) || [])[1] || '';
ok(ogBeeld === OG_IMAGE, 'og:image is de absolute Pages-URL', ogBeeld);
ok(/<meta\s+property="og:locale"\s+content="nl_NL"/i.test(html), 'og:locale is nl_NL');
ok((html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1] === PAGES, 'canonical is de Pages-URL');

// ------------------------------------------------------------------ 5. inhoud: 18+, CTA en pers

ok(/18\+/.test(html), 'de pagina vermeldt 18+');
ok(/openbare playtest|publieke playtest/i.test(html), 'de pagina noemt de status "openbare playtest"');
ok(/pre-release/i.test(html), 'de pagina noemt de builds pre-releases');
ok(new RegExp('href="' + RELEASES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>[\\s\\S]*?<\\/a>', 'i').test(html), 'er is een link naar de Releases');
const releaseLinks = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
  .filter((m) => m[1].trim() === RELEASES)
  .map((m) => m[2].replace(/<[^>]*>/g, '').trim())
  .filter(Boolean);
ok(releaseLinks.length >= 1, 'de CTA naar de Releases heeft tekst', String(releaseLinks.length));
ok(html.includes('href="' + REPO + '"'), 'er is een link naar de repo');
ok(/id="delen"/.test(gebouwd) && /href="#delen"/.test(gebouwd), 'de pagina heeft een deel-sectie en een navigatielink');
ok(/https:\/\/wa\.me\//.test(gebouwd) && /twitter\.com\/intent\/tweet/.test(gebouwd) && /facebook\.com\/sharer/.test(gebouwd), 'de deellinks naar WhatsApp, X en Facebook staan er');
ok(/data-share-kopieer/.test(gebouwd), 'de kopieer-knop staat er');
ok(!/id="pers"|href="#pers"|press-panel/.test(gebouwd), 'de oude pershoek staat niet meer op de pagina');
ok((html.match(/<details\b/gi) || []).length >= 5, 'de FAQ heeft minimaal vijf vragen', String((html.match(/<details\b/gi) || []).length));

// ------------------------------------------------------------------ 6. relatieve paden en alt-teksten

const lokaal = new Set();
for (const m of gebouwd.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/gi)) {
  const url = m[1].trim();
  if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('data:')) continue;
  if (EXTERN.test(url)) continue;
  lokaal.add(url.split('?')[0].split('#')[0]);
}
const dodePaden = [...lokaal].filter((url) => !bestaat(url));
ok(dodePaden.length === 0, 'alle relatieve paden in de HTML bestaan in _site', dodePaden.join(', '));
ok(bestaat('img/social-preview.png'), 'het social-preview-beeld staat in _site');
ok(bestaat('img/trailer.jpg'), 'de trailerstill staat in _site');

// De pagina heeft meerdere slideshows (#37): per categorie een slider met pijlen, stippen en
// een script dat de navigatie doet. Zonder JavaScript blijft elke slider scrollbaar.
ok(SLIDESHOWS.length >= 6, 'er zijn minstens zes slideshows', String(SLIDESHOWS.length));
ok(SLIDESHOWS.every((s) => s.slides.length >= 3), 'elke slideshow heeft minstens drie slides');
ok(!gebouwd.includes('<!-- SLIDESHOWS -->'), 'de slideshows zijn in de pagina gezet');
const totaalSlides = SLIDESHOWS.reduce((som, s) => som + s.slides.length, 0);
ok(totaalSlides >= 25, 'samen minstens 25 slides', String(totaalSlides));
ok((gebouwd.match(/class="slide"/g) || []).length === totaalSlides, 'alle slides staan in de HTML');
ok((gebouwd.match(/data-slider>/g) || []).length === SLIDESHOWS.length, 'elke slideshow heeft een slider');
ok((gebouwd.match(/data-slider-controls/g) || []).length === SLIDESHOWS.length, 'elke slideshow heeft bediening');
ok((gebouwd.match(/role="tablist"/g) || []).length === 1, 'de slideshows zitten achter één tabbalk');
ok((gebouwd.match(/data-slideshow-tab="/g) || []).length === SLIDESHOWS.length, 'elke categorie heeft een tab');
ok((gebouwd.match(/data-slideshow-panel="/g) || []).length === SLIDESHOWS.length, 'elke categorie heeft een paneel');
ok(/aria-selected="true"/.test(gebouwd) && /aria-selected="false"/.test(gebouwd), 'de eerste tab staat geselecteerd');
for (const show of SLIDESHOWS) {
  ok(gebouwd.includes(`id="slideshow-${show.id}"`), `slideshow ${show.id} staat in de HTML`);
  for (const slide of show.slides) {
    ok(bestaat(slide.img), `beeld ${slide.img} staat in _site`);
    ok(slide.alt && slide.alt.length > 10, `slide ${slide.img} heeft een alt-tekst`);
  }
}
ok(/<script\s+src="script\.js"\s+defer><\/script>/i.test(gebouwd), 'de pagina laadt script.js');
const script = bestaat('script.js') ? lees('script.js') : '';
ok(/data-slideshow-tab/.test(script) && /panel\.hidden/.test(script), 'script.js schakelt de tabbladen');
ok(/navigator\.clipboard/.test(script), 'script.js kopieert de deellink via de clipboard-API');
ok(/youtube-nocookie\.com\/embed\//.test(script), 'de trailer wordt pas bij klik via youtube-nocookie geladen');
ok(!/https?:\/\//.test(script.replace(/https:\/\/www\.youtube-nocookie\.com\/embed\//g, '').replace(/https:\/\/natuspella\.github\.io\/GDE-Groningen\//g, '')), 'script.js laadt zelf geen externe bronnen');
ok(/data-video="jh6L9dd-YeE"/.test(gebouwd), 'de trailer-facade heeft het juiste video-id');
ok(!/<iframe\b/i.test(gebouwd), 'er staat geen iframe in de HTML; die komt pas na de klik');
ok(/laadt niets van buiten/i.test(gebouwd) && /nocookie/i.test(gebouwd), 'de privacyregel noemt de click-to-load trailer');

// Hulppagina's (#37): gegenereerd uit help-pages.mjs, met eigen titel, meta, 18+,
// een weg terug naar de marketingpagina en alleen bestaande lokale links.
const HELP_DIR = path.join(SITE, 'help');
ok(fs.existsSync(HELP_DIR), 'de hulpmap staat in _site');
const helpBestanden = fs.existsSync(HELP_DIR) ? fs.readdirSync(HELP_DIR).filter((f) => f.endsWith('.html')) : [];
ok(helpBestanden.length === HELP_PAGES.length, 'elke hulppagina is gebouwd', `${helpBestanden.length}/${HELP_PAGES.length}`);
for (const page of HELP_PAGES) {
  const bestand = page.slug === 'index' ? 'index.html' : `${page.slug}.html`;
  ok(helpBestanden.includes(bestand), `hulppagina ${bestand} bestaat`);
  const tekst = fs.existsSync(path.join(HELP_DIR, bestand)) ? fs.readFileSync(path.join(HELP_DIR, bestand), 'utf8') : '';
  ok(/<html lang="nl"/.test(tekst), `${bestand} is Nederlands`);
  ok(/<title>[^<]+<\/title>/.test(tekst) && /name="description" content="[^"]+"/.test(tekst), `${bestand} heeft titel en omschrijving`);
  ok(/18\+/.test(tekst), `${bestand} noemt 18+`);
  ok(/href="\.\.\/"/.test(tekst), `${bestand} linkt terug naar de marketingpagina`);
  ok(!/<(?:script|img|iframe)\b/i.test(tekst), `${bestand} laadt geen eigen scripts of beelden`);
  const dood = [...tekst.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/gi)]
    .map((m) => m[1].trim())
    .filter((url) => url && !url.startsWith('#') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('data:'))
    .filter((url) => !fs.existsSync(path.resolve(HELP_DIR, url.split('?')[0].split('#')[0])));
  ok(dood.length === 0, `${bestand} heeft geen dode lokale links`, dood.join(', '));
}
ok(/href="help\/"/.test(gebouwd) && /Hulp en veelgestelde vragen/.test(gebouwd), 'de marketingpagina linkt naar de hulp');

const ids = new Set([...gebouwd.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const dodeAnkers = [...gebouwd.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.has(id));
ok(dodeAnkers.length === 0, 'alle interne ankers (#...) bestaan', dodeAnkers.join(', '));

const zonderAlt = [...gebouwd.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/\balt\s*=\s*"[^"]+"/i.test(m[0]));
ok(zonderAlt.length === 0, 'elke afbeelding heeft een gevulde alt-tekst', zonderAlt.map((m) => m[0].slice(0, 60)).join('; '));
ok(!/\bautoplay\b/i.test(gebouwd), 'geen autoplay');
ok(/\bprefers-reduced-motion\b/.test(css), 'style.css respecteert prefers-reduced-motion');

// Merkenpalet uit DESIGN_SYSTEM.md: geen near-miss-hexen, geel alleen voor wanted-sterren.
const PALET = new Set(['#1e9e56', '#3fc97a', '#0f5c30', '#0c140e', '#17301f', '#f0ede4', '#f2f2f2', '#d93f3f', '#e8c93a']);
const hexen = [...new Set((css.match(/#[0-9a-f]{3,8}\b/gi) || []).map((h) => h.toLowerCase()))];
const buitenPalet = hexen.filter((h) => !PALET.has(h));
ok(buitenPalet.length === 0, 'style.css gebruikt alleen het merkenpalet', buitenPalet.join(', '));
ok(!/#e8c93a/i.test(css), 'geel is niet als merkkleur gebruikt (alleen wanted-sterren)');
ok(/h1,\s*h2,\s*h3\s*\{[^}]*font-weight:\s*900/.test(css), 'koppen staan op systeemlettertype met weight 900');
ok(/--bg-glow:\s*#17301f/.test(css) && /--bg:\s*#0c140e/.test(css) && /radial-gradient\([^;]*var\(--bg-glow\)[^;]*var\(--bg\)/.test(css), 'achtergrond is de donkergroene radial #17301f naar #0c140e');
ok(/\.plaatsbord\s*\{/.test(css) && /class="plaatsbord"/.test(html), 'de pleknaambord-stijl staat in de hero');
ok(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ink\)/.test(css), 'focus is één cream ring van 2px');

ok(/system-ui/.test(css) && !/@font-face/i.test(css), 'systeemlettertypen, geen @font-face');
ok(/<main\b/.test(html) && (html.match(/<h1\b/gi) || []).length === 1 && /<header\b/.test(html) && /<footer\b/.test(html), 'semantische HTML met precies één h1');
ok(/class="skip-link"[^>]*href="#inhoud"/i.test(html) && /id="inhoud"/.test(html), 'de pagina heeft een skip-link naar de inhoud');

// Opbouw volgens de funnel: aandacht (hero) → interesse (trailer, kort) → verlangen
// (wat je doet, de stad, beelden) → actie (zo speel je mee, CTA) → vertrouwen
// (gemaakt, delen, FAQ, 18+).
const volgorde = [
  'class="hero"',
  'id="trailer"',
  'class="intro"',
  'id="wat-je-kunt-doen"',
  'id="echt-groningen"',
  'id="beelden"',
  'id="spelen"',
  'class="cta-band"',
  'id="zo-gemaakt"',
  'id="delen"',
  'id="vragen"',
  'id="leeftijd"',
];
ok(volgorde.every((m, i) => i === 0 || html.indexOf(volgorde[i - 1]) < html.indexOf(m)), 'de secties staan in de funnel-volgorde', volgorde.filter((m) => html.includes(m)).length + '/' + volgorde.length);
ok((html.match(/<ol class="steps">/g) || []).length === 1 && (html.match(/<h3>Pak een build<\/h3>|<h3>Speel de playtest<\/h3>|<h3>Laat het weten<\/h3>/g) || []).length === 3, 'de "zo speel je mee"-sectie heeft drie stappen');
ok(/\.faq\s*\{[^}]*max-width:\s*none/.test(css), 'de FAQ gebruikt de volle breedte');

// ------------------------------------------------------------------ 7. build, gitignore en workflow

const pkg = fs.existsSync(path.join(WEBSITE, 'package.json'));
ok(!pkg, 'website/ heeft geen npm-afhankelijkheden');
for (const f of ['build.mjs', 'serve.mjs']) {
  const src = fs.readFileSync(path.join(WEBSITE, f), 'utf8');
  const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  ok(imports.every((i) => i.startsWith('node:') || i.startsWith('./') || i.startsWith('../')), `${f} importeert alleen Node built-ins`, imports.join(', '));
}

const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
ok(gitignore.includes('website/_site/'), 'website/_site/ staat in .gitignore');

const workflowPad = path.join(ROOT, '.github', 'workflows', 'pages.yml');
ok(fs.existsSync(workflowPad), '.github/workflows/pages.yml bestaat');
if (fs.existsSync(workflowPad)) {
  const wf = fs.readFileSync(workflowPad, 'utf8');
  const alleenHandmatig = /^on:\s*\r?\n((?:[ \t]+.*\r?\n?|[ \t]*\r?\n)*)/m.test(wf)
    && [...wf.match(/^on:\s*\r?\n((?:[ \t]+.*\r?\n?|[ \t]*\r?\n)*)/m)[1].matchAll(/^ {2}([A-Za-z_]+):/gm)].every((m) => m[1] === 'workflow_dispatch');
  ok(alleenHandmatig, 'pages.yml start alleen met workflow_dispatch');
  ok((wf.match(/github\.actor\s*==\s*github\.repository_owner/g) || []).length >= 2, 'beide jobs hebben de owner-guard');
  ok(/actions\/upload-pages-artifact@v3/.test(wf) && /actions\/deploy-pages@v4/.test(wf), 'de workflow gebruikt upload-pages-artifact en deploy-pages');
  ok(!/actions\/upload-artifact/.test(wf), 'de workflow gebruikt geen upload-artifact');
  ok(!/pull_request|schedule|\bpush:/.test(wf), 'de workflow publiceert niet vanzelf (geen push/PR/schema)');
}

// ------------------------------------------------------------------ samenvatting

console.log('');
if (fails) {
  console.log(`website_test: FAIL — ${n - fails}/${n} controles ok, ${fails} mislukt.`);
} else {
  console.log(`website_test: ${n}/${n} controles ok.`);
  console.log('Pagina: website/_site/index.html — lokaal bekijken met: node website/serve.mjs');
}
process.exitCode = fails ? 1 : 0;
