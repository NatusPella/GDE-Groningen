// Maakt de PNG's van docs/beeld-21-11/vertrekbord/mock.html met een headless Chrome (geen Electron, geen spel) (#1085).
//   node scripts/vertrekbord_shots.mjs [pad naar chrome.exe]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'beeld-21-11', 'vertrekbord');
const CHROME = process.argv[2] || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
if (!CHROME) { console.log('geen Chrome of Edge gevonden: geef het pad mee'); process.exit(1); }
const url = (v) => 'file:///' + path.join(MAP, 'mock.html').replace(/\\/g, '/') + '#' + v;
const WEERGAVEN = [['vergelijk', 'oud-nieuw-rooster', 1500, 620], ['live', 'oud-nieuw-live', 1500, 620], ['staten', 'staten', 1700, 520], ['smal', 'smal', 560, 560]];
for (const [v, naam, w, h] of WEERGAVEN) {
  const uit = path.join(MAP, `${naam}.png`);
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--virtual-time-budget=4000', `--screenshot=${uit}`, url(v)], { encoding: 'utf8' });
  console.log(r.status === 0 && fs.existsSync(uit) ? `ok ${naam}.png (${(fs.statSync(uit).size / 1024).toFixed(0)} kB)` : `MISLUKT ${naam}: ${(r.stderr || '').slice(0, 200)}`);
}
