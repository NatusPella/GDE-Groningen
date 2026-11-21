// Ronde 4 (21-11, #1078): de compacte randmarkering naast de oude, getekend door de ECHTE spelcode (game/js/navpijl.js) op canvas, op uitsneden uit de
// echte spelbeelden. Maakt docs/beeld-21-11/minimap-pijlen/ronde4/mock.html en met een headless Chrome (geen Electron) de PNG's.
//   node scripts/minimap_pijlen_ronde4.mjs [pad naar chrome.exe]
// Chrome laadt de modules van een tijdelijke lokale server (alleen deze repo, 127.0.0.1); die stopt na de opnames.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = path.join(ROOT, 'docs', 'beeld-21-11', 'minimap-pijlen', 'ronde4');
const CHROME = process.argv[2] || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const S = 262;

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Minimap: compacte randmarkering, oud en nieuw (#1078, ronde 4)</title>
<link rel="stylesheet" href="/game/js/ds-tokens.css"><link rel="stylesheet" href="/game/fonts/fonts.css">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 26px 30px 36px; background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); font: 16px/1.45 'Atkinson Hyperlegible', Arial, sans-serif; }
h1 { font: 800 36px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; margin: 0 0 4px; color: var(--ds-c-ink-bord); }
h2 { font: 800 24px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; margin: 22px 0 8px; }
p { max-width: 82ch; margin: 4px 0 12px; }
.rij { display: flex; gap: 40px; align-items: flex-start; }
.raster { display: grid; grid-template-columns: repeat(3, ${S + 40}px); gap: 26px 22px; }
figure { margin: 0; } figcaption { font-size: 14px; padding-top: 10px; max-width: ${S + 30}px; } figcaption b { display: block; font: 800 17px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; }
.kader { padding: 9px; background: var(--ds-c-ink-papier); border: 3px solid var(--ds-c-ink-inkt); border-radius: 18px; box-shadow: 4px 4px 0 var(--ds-c-ink-inkt); width: ${S + 24}px; height: ${S + 24}px; }
canvas { display: block; width: ${S}px; height: ${S}px; border-radius: 10px; }
.x2 .kader { zoom: 2; } .x2 figcaption { zoom: 1; }
body[data-view="oudnieuw"] .alles, body[data-view="alles"] .oudnieuw-zoom { display: none; }
</style></head><body data-view="alles">
<h1>Minimap: compacte randmarkering, oud en nieuw</h1>
<p>Ronde 4 bij docs/MINIMAP-PIJLEN-21-11.md. Links het spelbeeld van de eigenaar (de boog met de grote plaat), rechts de compacte versie: het icoon direct tegen de rand (3 px inzet), de afstand als kleine tag ernaast aan de binnenkant, geen lijn, boog of plaat. Getekend door de spelcode zelf (game/js/navpijl.js) op dezelfde kaartuitsnede zonder markers.</p>
<div class="oudnieuw"><h2>De situatie uit het spelbeeld: eigen doel 4,7 km</h2><div class="rij x2">
  <figure><div class="kader"><canvas id="oud" width="${S * 2}" height="${S * 2}"></canvas></div><figcaption><b>Oud</b>boog, plaat en icoon nemen een derde van de kaart</figcaption></figure>
  <figure><div class="kader"><canvas id="nieuw1" width="${S * 2}" height="${S * 2}"></canvas></div><figcaption><b>Nieuw</b>icoon op de rand, tag ernaast</figcaption></figure>
</div></div>
<div class="alles"><h2>Scenario's (nieuw)</h2><div class="raster" id="raster"></div></div>
<script type="module">
import { drawKompasRand } from '/game/js/navpijl.js';
import { compactDistance } from '/game/js/navtarget.js';
const S = ${S}, rad = (g) => g * Math.PI / 180;
document.body.dataset.view = (location.hash || '#alles').slice(1);
const KL = { geel: '#f9c80e', paars: '#c068ff', oranje: '#ff9a3c', roze: '#ff5fb4' };
const BG = {
  binnenstad: { src: '/docs/beeld-21-11/kaart/kaartlagen-na-minikaart-1920x1080.png', x: 57, y: 675, obst: [{ a: rad(180), nodig: 28 }] },
  centrum: { src: '/docs/beeld-21-11/feedback-menus/26-minikaart-hud-1920.png', x: 57, y: 675, obst: [{ a: rad(47), nodig: 28 }, { a: rad(-135), nodig: 40 }, { a: rad(-117), nodig: 56 }] },
};
const plaatje = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
async function teken(canvas, bg, items, fout) {
  const c = canvas.getContext('2d'); c.scale(2, 2);
  c.save(); c.beginPath(); c.roundRect(0, 0, S, S, 10); c.clip();
  c.drawImage(await plaatje(bg.src), bg.x, bg.y, S, S, 0, 0, S, S);
  if (items) drawKompasRand(c, S, items.map((i) => ({ ...i, a: rad(i.g), tekst: i.m != null ? compactDistance(i.m) : '' })), { t: 0.3, beweging: false, obstakels: bg.obst });
  c.restore();
}
await document.fonts.load("600 13px 'Barlow Condensed'"); await document.fonts.ready;
// de situatie van de eigenaar: paarse vlag links onder, 4,7 km
await teken(document.getElementById('oud'), { src: '/docs/beeld-21-11/minimap-pijlen/ronde4/oud-spelbeeld-21-1920.png', x: 57, y: 675 }, null);
await teken(document.getElementById('nieuw1'), BG.binnenstad, [{ g: 157, kleur: KL.paars, icoon: 'vlag', actief: true, m: 4730 }, { g: 305, kleur: KL.geel, icoon: 'ster' }]);
const SC = [
  ['Geen doel', 'Niets te volgen: geen markering.', 'binnenstad', []],
  ['Volgende missie', 'Geel, 420 m, rechtsboven.', 'binnenstad', [{ g: -45, kleur: KL.geel, icoon: 'ster', actief: true, m: 420 }]],
  ['Eigen route', 'Paars gaat voor; het verhaal wacht als punt.', 'centrum', [{ g: 20, kleur: KL.paars, icoon: 'vlag', actief: true, m: 12400 }, { g: -120, kleur: KL.geel, icoon: 'ster' }]],
  ['Klus met twee wachtenden', 'Het maximum: een tag en twee punten.', 'centrum', [{ g: 5, kleur: KL.oranje, icoon: 'tas', actief: true, m: 260 }, { g: -70, kleur: KL.geel, icoon: 'ster' }, { g: 150, kleur: KL.paars, icoon: 'vlag' }]],
  ['Samen spelen', 'Eigen doel en twee medespelers als punt.', 'binnenstad', [{ g: -20, kleur: KL.paars, icoon: 'ster', actief: true, m: 1500 }, { g: 100, kleur: '#4363d8', icoon: 'speler' }, { g: 135, kleur: '#f58231', icoon: 'speler' }]],
  ['Op de N-badge', 'Doel precies waar de N staat: het punt schuift weg, het doel blijft.', 'binnenstad', [{ g: 180, kleur: KL.geel, icoon: 'ster', actief: true, m: 980 }, { g: 176, kleur: KL.roze, icoon: 'ehbo' }]],
];
const raster = document.getElementById('raster');
for (const [titel, tekst, bg, items] of SC) {
  const f = document.createElement('figure');
  f.innerHTML = '<div class="kader"><canvas width="' + S * 2 + '" height="' + S * 2 + '"></canvas></div><figcaption><b>' + titel + '</b>' + tekst + '</figcaption>';
  raster.append(f);
  await teken(f.querySelector('canvas'), BG[bg], items);
}
document.title += ' (klaar)';
</script></body></html>
`;
fs.mkdirSync(MAP, { recursive: true });
fs.writeFileSync(path.join(MAP, 'mock.html'), html);

if (!CHROME) { console.log('mock.html geschreven; geen Chrome gevonden voor de PNG\'s'); process.exit(0); }
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0].split('#')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.statusCode = 404; r.end(); return; }
  r.setHeader('content-type', TYPES[path.extname(p)] || 'application/octet-stream'); r.end(fs.readFileSync(p));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
for (const [v, naam, w, h] of [['alles', 'overzicht', 1400, 1900], ['oudnieuw', 'oud-nieuw', 1300, 1000]]) {
  const uit = path.join(MAP, `${naam}.png`);
  const r = await new Promise((ok) => {
    const c = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${w},${h}`, '--virtual-time-budget=8000', `--screenshot=${uit}`, `http://127.0.0.1:${port}/docs/beeld-21-11/minimap-pijlen/ronde4/mock.html#${v}`], { stdio: 'ignore' });
    const klok = setTimeout(() => c.kill(), 60000);
    c.on('exit', (status) => { clearTimeout(klok); ok({ status, stderr: '' }); });
  });
  console.log(r.status === 0 && fs.existsSync(uit) ? `ok ${naam}.png (${(fs.statSync(uit).size / 1024).toFixed(0)} kB)` : `MISLUKT ${naam}: ${(r.stderr || '').slice(0, 200)}`);
}
server.close();
