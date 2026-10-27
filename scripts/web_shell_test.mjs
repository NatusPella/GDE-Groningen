// Rooktest voor de webversie (#485): de schil die naast het spel staat — de service worker, de
// loader, het startscherm en de build — had tot nu toe geen enkele test.
//
//   node scripts/web_shell_test.mjs            snel: alleen de bron en (als hij er is) de gebouwde map
//   node scripts/web_shell_test.mjs --build    bouwt web-dist/ eerst opnieuw (vraagt game/world: traag)
//
// Wat hij bewaakt, en waarom:
// - sw.js moet de drie plaatshouders hebben die web/build.mjs invult; zonder die stempeling blijft
//   een nieuwe versie in de oude cache hangen.
// - web.js moet de service worker alleen registreren buiten een secure context, precies de regel
//   die android/scripts/stage.mjs vervangt voor de APK.
// - index.html van de build moet de loader laden en niet meer de module zelf.
// - de gebouwde sw.js mag geen plaatshouder meer bevatten.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'web-dist');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fails = 0;
const ok = (v, wat, detail) => { if (!v) { console.log('FAIL ' + wat + (detail ? ': ' + detail : '')); fails++; } };

// 1. De bron van de service worker.
const sw = read('web/sw.js');
for (const ph of ['__GDE_CACHE__', '__GDE_SHELL__']) ok(sw.includes(ph), 'sw.js heeft de plaatshouder ' + ph);
ok(/caches\.open\(CACHE\)/.test(sw), 'sw.js opent de cache');
ok(/caches\.delete/.test(sw), 'sw.js ruimt de oude cache op');
ok(/self\.addEventListener\('fetch'/.test(sw), 'sw.js heeft een fetch-handler');

// 2. De build stempelt ze ook echt: de cache- en shellnaam in sw.js, de clipgroottes in web.js.
const build = read('web/build.mjs');
for (const ph of ['__GDE_CACHE__', '__GDE_SHELL__', '__GDE_SIZES__']) ok(build.includes(ph), 'build.mjs vult ' + ph + ' in');
ok(/desktop['"],\s*['"]build\.mjs/.test(build), 'build.mjs gebruikt de desktop-staging als bron');
ok(/index\.html/.test(build), 'build.mjs herschrijft index.html');

// 3. De loader: alleen registreren buiten een secure context (de APK-stage vervangt deze regel).
const webjs = read('web/web.js');
ok(webjs.includes('__GDE_SIZES__'), 'web.js heeft de plaatshouder voor de clipgroottes');
ok(webjs.includes('!window.isSecureContext'), 'web.js registreert de service worker achter de guard die stage.mjs vervangt');
ok(/\.register\('sw\.js'\)/.test(webjs), 'web.js registreert de service worker');

// 4. De server bestaat en neemt een poort (argument, met een standaard).
const serve = read('web/serve.mjs');
ok(/\.listen\(PORT/.test(serve), 'serve.mjs start een server');
ok(/const PORT = /.test(serve), 'serve.mjs neemt een poort');

// 5. Als web-dist er is: het resultaat van de build, niet de bron.
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  const page = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  ok(page.includes('src="web.js"'), 'web-dist/index.html laadt web.js');
  ok(!page.includes('type="module" src="js/main.js"'), 'web-dist/index.html laadt de module niet meer direct');
  for (const f of ['web.js', 'sw.js']) ok(fs.existsSync(path.join(DIST, f)), 'web-dist heeft ' + f);
  const distSw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
  ok(!distSw.includes('__GDE_'), 'web-dist/sw.js is gestempeld (geen plaatshouder meer)');
  console.log('web-dist gecontroleerd (bron ' + (fs.statSync(path.join(DIST, 'index.html')).mtime.toISOString().slice(0, 10)) + ')');
} else {
  console.log('geen web-dist/ in deze werkboom: alleen de bron gecontroleerd');
}

// 6. Optioneel: de build zelf. Traag en vraagt de gestagede wereld, dus niet standaard.
if (process.argv.includes('--build')) {
  console.log('web-dist/ bouwen (node web/build.mjs) ...');
  execFileSync(process.execPath, [path.join(ROOT, 'web', 'build.mjs')], { stdio: 'inherit' });
  ok(fs.existsSync(path.join(DIST, 'sw.js')), 'de build levert sw.js');
  ok(!fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8').includes('__GDE_'), 'de gebouwde sw.js is gestempeld');
}

console.log((fails ? 'FAIL ' : '') + 'web_shell_test: ' + (fails ? fails + ' fout' : 'ok'));
process.exit(fails ? 1 : 0);
