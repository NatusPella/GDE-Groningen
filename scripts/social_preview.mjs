// Social-preview-plaatje voor GitHub (#72): 1280x640 PNG, onder 1 MB, uit een in-game render (docs/steam/beelden/bron).
//   node scripts/social_preview.mjs [--bg=luchtfoto|vismarkt|zonsopgang] [--out=docs/social-preview.png]
// Zelfde woordmerk als het spel en de Steam-capsules (FONTS, LOGO_CSS en logo uit steam_images.mjs). Headless Chrome maakt
// de opname van een tijdelijke HTML-pagina; de lettertypen komen van Google Fonts (Chrome heeft dus netwerk nodig, er gaat
// niets van ons naar buiten). Geen HUD, geen wapens, geen echte merken. Uploaden kan alleen de eigenaar via GitHub
// (Settings > Social preview); dit script publiceert niets.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FONTS, LOGO_CSS, logo } from './steam_images.mjs';

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const W = 1280, H = 640;
const BG = arg('bg', 'luchtfoto');
const OUT = path.resolve(ROOT, arg('out', 'docs/social-preview.png'));
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));

export function html(bgFile) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
${LOGO_CSS}
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #0c140e; }
.bg { position: absolute; inset: 0; background: url('${pathToFileURL(bgFile).href}') 62% 58% / cover no-repeat; }
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,16,11,0.88) 0%, rgba(8,16,11,0.62) 40%, rgba(8,16,11,0) 72%); }
.wrap { position: absolute; left: 64px; top: 40px; bottom: 40px; width: 640px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.gde-logo { font-size: 250px; }
.tag { margin-top: 34px; font: 700 27px/1.25 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.02em; color: #f0ede4; text-shadow: 0 2px 8px rgba(0,0,0,0.85); }
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="wrap">${logo('big-sub', true)}<div class="tag">Gratis open-wereldkomedie in een low-poly Groningen</div></div></body></html>`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const bgFile = path.join(ROOT, 'docs/steam/beelden/bron', BG + '.jpg');
  if (!fs.existsSync(bgFile)) { console.error('geen render: ' + bgFile); process.exit(2); }
  if (!CHROME) { console.error('Chrome niet gevonden (zet CHROME=<pad>)'); process.exit(2); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-social-'));
  try {
    const page = path.join(tmp, 'social.html');
    fs.writeFileSync(page, html(bgFile));
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const r = spawnSync(CHROME, ['--headless=new', `--user-data-dir=${path.join(tmp, 'profile')}`, '--hide-scrollbars', '--force-device-scale-factor=1',
      `--window-size=${W},${H}`, '--virtual-time-budget=8000', `--screenshot=${OUT}`, pathToFileURL(page).href], { encoding: 'utf8', timeout: 120000 });
    if (r.status !== 0 || !fs.existsSync(OUT)) { console.error('Chrome faalde', r.status, (r.stderr || '').slice(0, 300)); process.exit(1); }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`${path.relative(ROOT, OUT)} ${Math.round(fs.statSync(OUT).size / 1024)} KB (${W}x${H})`);
}
