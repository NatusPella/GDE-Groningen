// YouTube-thumbnails (1280x720) uit in-game beelden, met de titel "GDE Groningen – Zomer vol misdaad".
// Neemt stilstaande beelden (png/jpg uit de opnames, zie scripts/record_trailer.mjs) en zet er het
// woordmerk van de game overheen, met headless Chrome en ffmpeg (geen nieuwe dependencies).
// Schrijft alleen in --out (buiten de repo); uploadt niets (docs/youtube/pakket.md).
//
//   node scripts/youtube_thumbnails.mjs --game-dir=<staged game> --frames=<map met beelden> --out=<map> [--only=naam]
//
// De beelden in --frames heten zoals de namen in THUMBS (bijv. gameplay-a.png). Het lettertype
// komt uit de gestagede game (vendor/fonts/fonts.css, Big Shoulders Display en Bebas Neue).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

// naam, label op het groene bordje, ondertitel, plek van de tekst (links of rechts), schaduw
const THUMBS = [
  { name: 'gameplay-a', label: 'Gameplaytrailer', line: 'Rijden, varen en vliegen door Grunn', side: 'left' },
  { name: 'gameplay-b', label: 'Gameplaytrailer', line: 'Een hele stad. Een heel Ommeland.', side: 'left' },
  { name: 'verhaal-a', label: 'Verhaaltrailer', line: 'Twee Stadjers. Eén Gouden Eierbal.', side: 'left' },
  { name: 'verhaal-b', label: 'Verhaaltrailer', line: 'Tammo, Tessa en een frietwagen', side: 'right' },
];

const only = opt('only', '');
const gameDir = path.resolve(opt('game-dir', ''));
const frames = path.resolve(opt('frames', ''));
const out = path.resolve(opt('out', path.join(os.tmpdir(), 'gde-thumbnails')));
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel)) { console.error('kies een map buiten de repo'); process.exit(1); }
const fontsCss = path.join(gameDir, 'vendor', 'fonts', 'fonts.css');
if (!opt('game-dir', '') || !fs.existsSync(fontsCss)) { console.error('--game-dir=<gestagede game met vendor/fonts> ontbreekt'); process.exit(1); }
const cands = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const chrome = cands.find((c) => fs.existsSync(c));
if (!chrome) { console.error('geen Chrome of Edge gevonden (zet CHROME=<pad>)'); process.exit(1); }
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
fs.mkdirSync(out, { recursive: true });

const fontFaces = fs.readFileSync(fontsCss, 'utf8').replaceAll('url(/vendor/fonts/', `url(${pathToFileURL(path.join(gameDir, 'vendor', 'fonts')).href}/`);

const html = (t, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFaces}
html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; background: #0c140e; }
.bg { position: absolute; inset: 0; background: url('${pathToFileURL(bg).href}') center / cover no-repeat; }
.shade { position: absolute; inset: 0; background: linear-gradient(${t.side === 'left' ? '90deg' : '270deg'}, rgba(6,14,9,0.88) 0%, rgba(6,14,9,0.62) 34%, rgba(6,14,9,0) 62%), linear-gradient(0deg, rgba(6,14,9,0.55) 0%, rgba(6,14,9,0) 30%); }
.box { position: absolute; top: 0; bottom: 0; ${t.side === 'left' ? 'left' : 'right'}: 56px; width: 640px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding-bottom: 96px; font-family: 'Big Shoulders Display', 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; }
.mark { font-weight: 900; font-size: 250px; line-height: 0.74; padding-top: 14px; letter-spacing: 0.015em;
  background: linear-gradient(180deg, #f0ede4 0%, #f0ede4 52%, #3fc97a 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.7)) drop-shadow(0 0 24px rgba(63,201,122,0.3)); }
.sign { align-self: flex-start; margin-top: 18px; padding: 8px 26px 4px; font-weight: 800; font-size: 62px; letter-spacing: 0.09em; text-transform: uppercase; color: #fff; background: #1e9e56; border-radius: 12px;
  box-shadow: inset 0 0 0 5px #1e9e56, inset 0 0 0 10px #fff, 0 6px 18px rgba(0,0,0,0.55); }
.title { margin-top: 26px; font-weight: 900; font-size: 92px; line-height: 0.92; text-transform: uppercase; letter-spacing: 0.02em; text-shadow: 0 4px 14px rgba(0,0,0,0.85); }
.title span { color: #3fc97a; }
.line { margin-top: 18px; font: italic 700 38px/1.1 'Arial Narrow', Arial, sans-serif; color: #f0ede4; text-shadow: 0 2px 8px rgba(0,0,0,0.9); }
.label { position: absolute; ${t.side === 'left' ? 'left' : 'right'}: 56px; bottom: 36px; padding: 6px 22px 2px; font: 800 44px/1.1 'Big Shoulders Display', 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; background: #1e9e56; border-radius: 10px; box-shadow: inset 0 0 0 3px #fff, 0 4px 14px rgba(0,0,0,0.6); }
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="box"><div class="mark">GDE</div><div class="sign">Groningen</div><div class="title">Zomer vol <span>misdaad</span></div><div class="line">${t.line}</div></div>
<div class="label">${t.label}</div></body></html>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-thumb-'));
let fail = 0;
try {
  for (const t of THUMBS) {
    if (only && t.name !== only) continue;
    const bg = ['png', 'jpg'].map((e) => path.join(frames, `${t.name}.${e}`)).find((f) => fs.existsSync(f));
    if (!bg) { console.log(`  ${t.name}: geen beeld in ${frames}, overgeslagen`); continue; }
    const page = path.join(tmp, `${t.name}.html`);
    const png = path.join(tmp, `${t.name}.png`);
    fs.writeFileSync(page, html(t, bg));
    spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=5000', '--window-size=1280,720', `--screenshot=${png}`, pathToFileURL(page).href], { stdio: 'ignore' });
    const dest = path.join(out, `thumbnail_${t.name}.jpg`);
    const r = fs.existsSync(png) && spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=1280:720', '-q:v', '2', dest], { stdio: 'inherit' });
    if (r && r.status === 0 && fs.existsSync(dest)) console.log(`  ${dest} (${Math.round(fs.statSync(dest).size / 1024)} kB)`);
    else { console.log(`  ${t.name}: mislukt`); fail++; }
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
process.exit(fail ? 1 : 0);
