// Voor/na-beelden van voertuigen (1920x1080) met headless Chrome (geen Electron, geen spel, nooit poort 9000).
//   node scripts/voertuigklein_beeld.mjs <voor|na> <voertuig,voertuig,...> [weergave,weergave,...]
// Voertuigen: zie SPECS in docs/beeld-24-11/voertuigen-klein/pagina.html. Weergaven: buiten, schuin, achter, dicht, hoog, boven, laag.
// De PNG komt in docs/beeld-24-11/voertuigen-klein/<voor|na>-<voertuig>-<weergave>.png. Tijdelijk profiel in <worktree>/.scr.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = path.join(ROOT, 'docs', 'beeld-24-11', 'voertuigen-klein');
const [fase = 'na', lijst = 'escapade', weergaven = 'buiten,schuin,achter,dicht'] = process.argv.slice(2);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(naam) {
  const port = 9400 + Math.floor(Math.random() * 500);
  const profiel = path.join(ROOT, '.scr', 'chrome-' + process.pid + '-' + naam);
  fs.mkdirSync(profiel, { recursive: true });
  const url = 'file:///' + path.join(MAP, 'pagina.html').replace(/\\/g, '/') + '#' + naam + (fase === 'voor-oud' ? 'oud' : '');
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profiel}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', '--window-size=1920,1080', url], { stdio: 'ignore' });
  try {
    let ws = null;
    for (let i = 0; i < 60 && !ws; i++) {
      try { const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); ws = tabs.find((t) => t.type === 'page').webSocketDebuggerUrl; } catch { await wacht(250); }
    }
    if (!ws) throw new Error('Chrome start niet');
    const sock = new WebSocket(ws);
    await new Promise((r) => { sock.onopen = r; });
    let id = 0; const wachtend = new Map();
    sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wachtend.has(d.id)) { wachtend.get(d.id)(d); wachtend.delete(d.id); } };
    const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; wachtend.set(n, r); sock.send(JSON.stringify({ id: n, method, params })); });
    const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;
    let titel = '';
    for (let i = 0; i < 240; i++) { await wacht(250); titel = (await ev('document.title + "|" + (document.querySelector("pre") ? document.querySelector("pre").textContent : "")')) || ''; if (titel.startsWith('klaar') || titel.startsWith('FOUT')) break; }
    if (!titel.startsWith('klaar')) { console.log('MISLUKT', naam, titel.slice(0, 600)); return; }
    console.log(naam, JSON.stringify(await ev('window.info')));
    for (const w of weergaven.split(',')) {
      const data = await ev(`window.neem(${JSON.stringify(w)})`);
      fs.writeFileSync(path.join(MAP, `${fase === 'voor-oud' ? 'voor' : fase}-${naam}-${w}.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
    sock.close();
  } finally {
    chrome.kill();
    await wacht(700);
    try { fs.rmSync(profiel, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* blijft hooguit staan in .scr */ }
  }
}
for (const n of lijst.split(',')) await run(n);
