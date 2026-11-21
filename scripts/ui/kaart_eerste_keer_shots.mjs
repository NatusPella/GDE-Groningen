// PNG's van de mock met headless Chrome (geen Electron): oud (git archive van de basis) en nieuw naast elkaar.
//   node scripts/ui/kaart_eerste_keer_shots.mjs --oud=<mock-oud.html> [--chrome=<pad>]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = '') => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const chrome = arg('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const oud = arg('oud');
const dir = path.join(ROOT, 'docs/beeld-21-11/kaart-eerste-keer');
const nieuw = pathToFileURL(path.join(dir, 'mock.html')).href;
const oudUrl = oud ? pathToFileURL(path.resolve(oud)).href : '';
const lijst = [
  [nieuw + '?scene=eerste-keer', 'nieuw-eerste-keer-1920.png', '1920,1080'],
  [nieuw + '?scene=eerste-keer', 'nieuw-eerste-keer-1280.png', '1280,720'],
  [nieuw + '?scene=eerste-keer&rustig=1', 'nieuw-eerste-keer-rustig-drukwerk-1920.png', '1920,1080'],
  [nieuw + '?scene=plekkaart', 'nieuw-reis-popup-1920.png', '1920,1080'],
];
if (oudUrl) lijst.push([oudUrl + '?scene=eerste-keer', 'oud-eerste-keer-1920.png', '1920,1080'], [oudUrl + '?scene=plekkaart', 'oud-reis-uitklap-1920.png', '1920,1080']);
for (const [url, naam, maat] of lijst) {
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${maat}`, '--virtual-time-budget=4000', `--screenshot=${path.join(dir, naam)}`, url], { stdio: 'ignore' });
  console.log(r.status === 0 ? 'ok' : 'FOUT', naam);
}
