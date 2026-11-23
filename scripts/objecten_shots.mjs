// Maakt de PNG's van docs/beeld-23-11/objecten/*.html met een headless Chrome (geen Electron, geen spel, nooit poort 9000).
//   node scripts/objecten_shots.mjs <voor|na> <weergave,weergave,...> [pad naar chrome.exe]
// Weergaven (sheet.html): auto, auto-achter, bak, fiets, bus, boot, heli, limo, deur; met -achter, -zij, -open of -nacht erachter.
// Verder gebouw (gebouw.html) en props (props.html). De PNG komt in docs/beeld-23-11/objecten/<voor|na>-<weergave>.png; de
// paginatitel meldt het aantal drawcalls en driehoeken. Per weergave een eigen Chrome met een eigen profiel en poort: twee runs
// tegelijk botsen niet, en alleen de eigen PID wordt gestopt.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// GDE_SHOTS_MAP: een andere map onder docs/beeld-23-11 met een eigen sheet.html (bijvoorbeeld vettruck)
const MAP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'beeld-23-11', process.env.GDE_SHOTS_MAP || 'objecten');
const [fase = 'voor', lijst = 'auto', chromeArg] = process.argv.slice(2);
const CHROME = chromeArg || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
if (!CHROME) { console.log('geen Chrome of Edge gevonden: geef het pad mee'); process.exit(1); }
const PAGINA = (w) => (w.startsWith('props') || w.startsWith('gebouw') ? w.split('-')[0] + '.html' : 'sheet.html');
const url = (w) => 'file:///' + path.join(MAP, PAGINA(w)).replace(/\\/g, '/') + '#' + w;
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(w) {
  const port = 9400 + Math.floor(Math.random() * 500);
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-objecten-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profiel}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files', '--window-size=1400,800', url(w)], { stdio: 'ignore' });
  try {
    let ws = null;
    for (let i = 0; i < 60 && !ws; i++) {
      try { const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); ws = tabs.find((t) => t.type === 'page').webSocketDebuggerUrl; } catch { await wacht(250); }
    }
    if (!ws) throw new Error('Chrome start niet');
    const sock = new WebSocket(ws);
    await new Promise((r) => { sock.onopen = r; });
    let id = 0;
    const wachtend = new Map();
    sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wachtend.has(d.id)) { wachtend.get(d.id)(d); wachtend.delete(d.id); } };
    const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; wachtend.set(n, r); sock.send(JSON.stringify({ id: n, method, params })); });
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1400, height: 800, deviceScaleFactor: 1, mobile: false });
    let titel = '';
    for (let i = 0; i < 240; i++) {
      await wacht(250);
      titel = (await cdp('Runtime.evaluate', { expression: 'document.title + "|" + (document.querySelector("pre") ? document.querySelector("pre").textContent : "")', returnByValue: true })).result.result.value || '';
      if (titel.startsWith('klaar') || titel.includes('|FOUT')) break;
    }
    const uit = path.join(MAP, `${fase}-${w}.png`);
    const beeld = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(uit, Buffer.from(beeld.result.data, 'base64'));
    console.log(`${titel.startsWith('klaar') ? 'ok' : 'MISLUKT'} ${fase}-${w}.png (${(fs.statSync(uit).size / 1024).toFixed(0)} kB) ${titel.slice(0, 400)}`);
    sock.close();
  } finally {
    chrome.kill();
    await wacht(800);
    try { fs.rmSync(profiel, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* het tijdelijke profiel blijft hooguit staan */ }
  }
}

for (const w of lijst.split(',')) await shot(w);
