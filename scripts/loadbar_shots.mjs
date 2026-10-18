// Headless screenshots of the boot screen (index.html #loading), the world load
// screen (loadscreen.css) and the hand-over between them (#226). Also counts the
// progress bars that are really visible per phase: it must be exactly one.
//   node scripts/loadbar_shots.mjs [--out=<map>]     (default: a temp folder)
// Needs a Chrome or Edge (GDE_CHROME=<pad> to point at another one). Uses a
// throwaway profile; no game, no Electron, nothing is written to the repo.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const out = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-loadbar-shots')));
const cands = [process.env.GDE_CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const bin = cands.find((c) => fs.existsSync(c));
if (!bin) { console.error('Geen Chrome of Edge gevonden (zet GDE_CHROME).'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const base = pathToFileURL(path.join(root, 'game') + path.sep).href;
const html = fs.readFileSync(path.join(root, 'game', 'index.html'), 'utf8');
const lsSrc = fs.readFileSync(path.join(root, 'game', 'js', 'loadscreen.js'), 'utf8');
// the real load-screen markup, taken from loadscreen.js (the template string)
const tpl = lsSrc.slice(lsSrc.indexOf('el.innerHTML ='), lsSrc.indexOf("document.body.appendChild(el)"));
const phases = ['boot', 'wereld', 'overgang'];
let fails = 0;
for (const phase of phases) {
  const page = html.replace('<head>', `<head><base href="${base}">`).replace('</body>', `<script>
const phase = ${JSON.stringify(phase)};
const esc = (s) => s, pictureHtml = (n) => '<img class="ls-bg" src="img/laad/' + n + '.jpg">', img = 'vismarkt', kind = 'travel', place = { name: 'Vismarkt' }, date = {}, TILE_COUNT = 12;
const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'js/loadscreen.css'; document.head.appendChild(link);
document.querySelector('#loading .ld-fill').style.transform = 'scaleX(0.6)';
if (phase !== 'boot') {
  const el = document.createElement('div'); el.id = 'load-screen'; el.className = 'ls ls-travel on instant';
  ${tpl.replace(/el\.innerHTML =/, 'el.innerHTML =')}
  document.body.appendChild(el);
  el.querySelector('.ls-bar i').style.transform = 'scaleX(0.45)';
  document.getElementById('loading').classList.add('ls-over');
  if (phase === 'wereld') document.getElementById('loading').style.display = 'none';
}
setTimeout(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); let o = 1; for (let n = e; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; return r.width > 20 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && o > 0.05; };
  const bars = [...document.querySelectorAll('.ld-bar, .ls-bar, .ls-tiles')].filter(vis).map((e) => e.className);
  document.title = 'BARS=' + JSON.stringify(bars);
}, 2500);
</script></body>`);
  const file = path.join(out, phase + '.html');
  fs.writeFileSync(file, page);
  const png = path.join(out, phase + '.png');
  const prof = path.join(os.tmpdir(), 'gde-loadbar-prof-' + process.pid);
  const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run', '--user-data-dir=' + prof, '--window-size=1280,720',
    '--virtual-time-budget=4000', '--screenshot=' + png, '--dump-dom', pathToFileURL(file).href];
  const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 64 << 20 });
  fs.rmSync(prof, { recursive: true, force: true });
  const m = /<title>BARS=(\[.*?\])<\/title>/.exec(r.stdout || '');
  const bars = m ? JSON.parse(m[1].replace(/&quot;/g, '"')) : null;
  const good = bars && bars.length === 1;
  if (!good) fails++;
  console.log(`${good ? 'ok  ' : 'FAIL'} ${phase}: zichtbare balken = ${bars ? bars.length + ' ' + JSON.stringify(bars) : '?'}  ${png}`);
}
process.exit(fails ? 1 : 0);
