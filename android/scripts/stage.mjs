// Stage de webversie voor de Android-schil: web-dist/ (web/build.mjs, dat op
// zijn beurt de desktop-staging hergebruikt) naar android/www, zonder wat de
// APK niet nodig heeft, en `cap sync`.
//
//   node scripts/stage.mjs             hergebruik web-dist/ als dat er is
//   node scripts/stage.mjs --rebuild   web-dist/ eerst opnieuw bouwen
//   node scripts/stage.mjs --no-sync   alleen android/www maken
//
// Wat eruit gaat: sw.js (de APK is zelf de offline-cache), de mp3-muziek en de
// originele geluidspacks (de Android-WebView speelt Opus/WebM), cutpreview.html.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { ANDROID, ROOT, WWW, WEB_DIST, HERE, IS_WIN, mb, walk, sizeOf, toolEnv } from './common.mjs';

const REBUILD = process.argv.includes('--rebuild');
const SYNC = !process.argv.includes('--no-sync');
const rel = (p) => path.relative(WWW, p).split(path.sep).join('/');

// versienaam en -code uit desktop/package.json vóór de build (#483)
execFileSync(process.execPath, [path.join(HERE, 'version.mjs')], { stdio: 'inherit' });

if (REBUILD || !fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
  console.log('web-dist/ bouwen (web/build.mjs; de eerste keer duurt dat lang door de wereld en het geluid)');
  execFileSync(process.execPath, [path.join(ROOT, 'web', 'build.mjs')], { stdio: 'inherit' });
}

fs.rmSync(WWW, { recursive: true, force: true });
fs.cpSync(WEB_DIST, WWW, { recursive: true });
const before = sizeOf(walk(WWW));

// 1. geluid: alleen Opus (packs voor de korte clips, webm voor de muziek)
const idxFile = path.join(WWW, 'audio', 'index.json');
const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
const origPacks = new Set(Object.values(idx.files).map((v) => idx.packs[v[3]]));
const opusPacks = new Set(Object.values(idx.files).map((v) => idx.packs[v[0]]));
for (const p of origPacks) if (!opusPacks.has(p)) fs.rmSync(path.join(WWW, p), { force: true });
for (const [mp3, webm] of Object.entries(idx.music)) {
  if (mp3 !== webm) fs.rmSync(path.join(WWW, mp3), { force: true });
}
// overgebleven losse mp3/wav zou de loader toch via de index zoeken: weg ermee
for (const f of walk(WWW)) if (/\.(mp3|wav)$/i.test(f)) fs.rmSync(f);

// 2. geen service worker in de APK
fs.rmSync(path.join(WWW, 'sw.js'), { force: true });
fs.rmSync(path.join(WWW, 'cutpreview.html'), { force: true });
const webjs = path.join(WWW, 'web.js');
let w = fs.readFileSync(webjs, 'utf8');
const guard = "!window.isSecureContext";
if (!w.includes(guard)) throw new Error('web.js: service-worker-voorwaarde niet gevonden; stage.mjs bijwerken');
w = w.replace(guard, 'window.Capacitor || ' + guard); // Capacitor: de APK is de cache
fs.writeFileSync(webjs, w);

// 3. de brug (terugknop, pauzeren) vóór de loader
fs.copyFileSync(path.join(HERE, 'android-bridge.js'), path.join(WWW, 'android-bridge.js'));
const html = path.join(WWW, 'index.html');
let page = fs.readFileSync(html, 'utf8');
const tag = '<script src="web.js"></script>';
if (!page.includes(tag)) throw new Error('index.html: web.js-script niet gevonden');
page = page.replace(tag, '<script src="android-bridge.js"></script>\n' + tag);
fs.writeFileSync(html, page);

const files = walk(WWW);
const big = files.reduce((a, f) => (fs.statSync(f).size > a[1] ? [rel(f), fs.statSync(f).size] : a), ['', 0]);
console.log(`android/www: ${files.length} bestanden, ${mb(sizeOf(files))} (web-dist was ${mb(before)}); grootste ${big[0]} ${mb(big[1])}`);

if (SYNC) {
  const { env } = toolEnv();
  const cap = path.join(ANDROID, 'node_modules', '.bin', IS_WIN ? 'cap.cmd' : 'cap');
  execFileSync(cap, ['sync', 'android'], { cwd: ANDROID, env, stdio: 'inherit', shell: IS_WIN });
}
