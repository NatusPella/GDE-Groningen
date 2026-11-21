// Beeld van de declutter (21-11): de echte horeca van het centrum op zoom 4 tot 8, links zoals het was
// (alleen een rooster van 40 px), rechts zoals het nu is (groepen met aantal, een maximum per beeld).
// Een mock zonder het spel: een SVG per beeld (1280 x 720 px verkleind) met een tijdelijk Chrome-profiel.
//   node scripts/kaartdeclutter_beeld.mjs [uitmap]     (schrijft <uitmap>/declutter.svg en declutter.png)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHorecaPlanner, poiRules } from '../game/js/mapdeclutter.js';
import { mapIconScale } from '../game/js/mapicons.js';
import { wgsToWorld } from '../game/js/rdnew.js';

const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'gde-declutter'));
fs.mkdirSync(OUT, { recursive: true });
const j = JSON.parse(fs.readFileSync(new URL('../game/facilities.json', import.meta.url), 'utf8'));
const kind = j.kinds.indexOf('horeca');
const spots = j.f.filter((r) => r[0] === kind).map((r, i) => { const [x, y] = wgsToWorld(r[1], r[2]); return { x, y, name: 'plek ' + i }; });
const [CX, CY] = wgsToWorld(53.2194, 6.5665);
const CW = 1280, CH = 720, BASE = 0.2, K = 0.3125; // K: de verkleining van het paneel
const planner = createHorecaPlanner();
const zooms = [4, 5, 6, 7, 8];
const PW = CW * K, PH = CH * K + 18;
let svg = '';
const stat = [];
zooms.forEach((z, c) => {
  const s = BASE * z, sc = mapIconScale(z);
  const v = { zoom: z, scale: s, x0: CX - CW / 2 / s, x1: CX + CW / 2 / s, y0: CY - CH / 2 / s, y1: CY + CH / 2 / s };
  const px = (p) => [(p.x - v.x0) * s * K, (p.y - v.y0) * s * K + 18];
  const inBeeld = spots.filter((p) => p.x > v.x0 && p.x < v.x1 && p.y > v.y0 && p.y < v.y1);
  // ervoor: het rooster van de oude regel (alleen vanaf zoom 6 zichtbaar)
  const cellM = (z >= 8 ? 26 : 40) * sc / 1.9 / s;
  const seen = new Set();
  const oud = z < 6 ? [] : inBeeld.filter((p) => { const k = Math.floor(p.x / cellM) * 100003 + Math.floor(p.y / cellM); if (seen.has(k)) return false; seen.add(k); return true; });
  const nieuw = z < 6 ? [] : planner(spots, v);
  stat.push({ z, inBeeld: inBeeld.length, oud: oud.length, nieuw: nieuw.length, max: poiRules(z).horecaMax });
  for (const [r, lijst, titel] of [[0, oud, 'voor'], [1, nieuw, 'na']]) {
    const ox = c * (PW + 8), oy = r * (PH + 8);
    svg += `<g transform="translate(${ox},${oy})"><rect width="${PW}" height="${PH}" fill="#2d3a30"/><rect width="${PW}" height="18" fill="#101810"/>` +
      `<text x="6" y="13" font-family="sans-serif" font-size="12" fill="#f2ede0">zoom ${z} ${titel}: ${lijst.length} iconen (${inBeeld.length} plekken in beeld)</text>`;
    for (const p of lijst) {
      const [x, y] = px(p);
      const rad = 10.5 * (sc / 2.1) * K * 1.6; // het icoon op ware grootte, in dezelfde verkleining
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="#c9622a" stroke="#f2ede0" stroke-width="1"/>`;
      if (p.n > 1) svg += `<circle cx="${(x + rad).toFixed(1)}" cy="${(y - rad).toFixed(1)}" r="6" fill="#101810" stroke="#f2ede0" stroke-width="1"/><text x="${(x + rad).toFixed(1)}" y="${(y - rad + 3.5).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#f2ede0">${p.n}</text>`;
    }
    svg += '</g>';
  }
});
const W = zooms.length * (PW + 8), H = 2 * (PH + 8);
const file = path.join(OUT, 'declutter.svg');
fs.writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0b0f0b"/>${svg}</svg>`);
console.log(stat.map((s) => `zoom ${s.z}: ${s.inBeeld} plekken in beeld, voor ${s.oud} iconen, na ${s.nieuw} (maximum ${s.max})`).join('\n'));
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
if (!chrome) { console.log('SKIP geen Chrome: alleen de SVG is geschreven: ' + file); process.exit(0); }
const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-declutter-profiel-'));
spawnSync(chrome, ['--headless=new', '--no-first-run', `--user-data-dir=${profiel}`, '--disable-gpu', '--hide-scrollbars', `--screenshot=${path.join(OUT, 'declutter.png')}`, `--window-size=${Math.ceil(W)},${Math.ceil(H)}`, 'file:///' + file.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
fs.rmSync(profiel, { recursive: true, force: true });
console.log('beeld: ' + path.join(OUT, 'declutter.png'));
