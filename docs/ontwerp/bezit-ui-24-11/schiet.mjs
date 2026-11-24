// Screenshots van de mockups met headless Chrome (eigen profiel in de map). node schiet.mjs [naam,naam] [1920x1080,1280x720,1280x800]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

let HERE = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(HERE, 'game', 'js', 'ds-tokens.css'))) { const up = path.dirname(HERE); if (up === HERE) throw new Error('repo-root niet gevonden'); HERE = up; }
HERE = path.join(HERE, '.scr', 'bezit-ontwerp');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const namen = (process.argv[2] || '').split(',').filter(Boolean);
const maten = (process.argv[3] || '1920x1080,1280x720,1280x800').split(',');
const alle = fs.readdirSync(path.join(HERE, 'scherm')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
for (const n of namen.length ? namen : alle) {
  for (const m of maten) {
    const [w, h] = m.split('x');
    const uit = path.join(HERE, 'shots', `${m}-${n}.png`);
    const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', `--user-data-dir=${path.join(HERE, 'prof')}`, `--window-size=${w},${h}`, '--force-device-scale-factor=1', '--virtual-time-budget=4000', `--screenshot=${uit}`, pathToFileURL(path.join(HERE, 'scherm', n + '.html')).href], { encoding: 'utf8' });
    if (r.status !== 0) console.log('fout', n, m, (r.stderr || '').slice(-200));
  }
  console.log('klaar', n);
}
