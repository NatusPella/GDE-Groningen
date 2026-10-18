// Exporteert de kanaalafbeeldingen (docs/youtube/kanaalbeelden/*.svg) naar PNG in een
// scratchmap buiten de repo, met de headless Chrome of Edge die al op de machine staat
// (geen nieuwe dependencies). Uploadt niets.
//   node scripts/export_kanaalbeelden.mjs [--out=<map>]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'docs/youtube/kanaalbeelden');
const a = process.argv.find((x) => x.startsWith('--out='));
const out = path.resolve(a ? a.slice(6) : path.join(os.tmpdir(), 'gde-kanaalbeelden'));
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel)) { console.error('kies een map buiten de repo'); process.exit(1); }
const SIZES = { avatar: [800, 800], banner: [2048, 1152] };
const cands = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const chrome = cands.find((c) => fs.existsSync(c));
if (!chrome) { console.error('geen Chrome of Edge gevonden (zet CHROME=<pad>)'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
for (const [name, [w, h]] of Object.entries(SIZES)) {
  const dest = path.join(out, `${name}.png`);
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, `--screenshot=${dest}`, pathToFileURL(path.join(SRC, `${name}.svg`)).href], { stdio: 'ignore' });
  console.log(r.status === 0 && fs.existsSync(dest) ? `${dest} (${w}x${h})` : `${name}: mislukt`);
}
