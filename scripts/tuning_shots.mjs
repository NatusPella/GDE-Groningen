// Maakt de PNG's van docs/beeld-21-11/tuning/mock.html met een headless Chrome (geen Electron, geen spel) (epic Autotuning #1155).
//   node scripts/tuning_shots.mjs [pad naar chrome.exe]
// Per weergave een bestand: dag, nacht (underglow), snack (de snackwagen) en snack-nacht (bakkenlicht en lampjes). Chrome wordt
// via het DevTools-protocol bestuurd (Node 22 heeft WebSocket): de pagina zet document.title op 'klaar:...' als het getekend is,
// dan pas wordt de schermafdruk genomen. De PNG's blijven klein (1400x800).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'beeld-21-11', 'tuning');
const CHROME = process.argv[2] || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
if (!CHROME) { console.log('geen Chrome of Edge gevonden: geef het pad mee'); process.exit(1); }
const PORT = 9337;
const url = (v) => 'file:///' + path.join(MAP, 'mock.html').replace(/\\/g, '/') + '#' + v;
const WEERGAVEN = [['dag', 'voertuigen-dag'], ['nacht', 'voertuigen-nacht'], ['snack', 'snackwagen-dag'], ['nacht-snack', 'snackwagen-nacht']];
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-shots-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profiel}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files', '--window-size=1400,800', 'about:blank'], { stdio: 'ignore' });
try {
  let ws = null;
  for (let i = 0; i < 50 && !ws; i++) {
    try { const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); ws = tabs.find((t) => t.type === 'page').webSocketDebuggerUrl; } catch { await wacht(200); }
  }
  if (!ws) throw new Error('Chrome start niet');
  const sock = new WebSocket(ws);
  await new Promise((r) => { sock.onopen = r; });
  let id = 0;
  const wachtend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wachtend.has(d.id)) { wachtend.get(d.id)(d); wachtend.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; wachtend.set(n, r); sock.send(JSON.stringify({ id: n, method, params })); });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1400, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const [v, naam] of WEERGAVEN) {
    await cdp('Page.navigate', { url: 'about:blank' });
    await cdp('Page.navigate', { url: url(v) });
    let titel = '';
    for (let i = 0; i < 150; i++) {
      await wacht(200);
      titel = (await cdp('Runtime.evaluate', { expression: 'document.title + "|" + (document.querySelector("pre") ? document.querySelector("pre").textContent : "")', returnByValue: true })).result.result.value || '';
      if (titel.startsWith('klaar') || titel.includes('|FOUT')) break;
    }
    const uit = path.join(MAP, `${naam}.png`);
    const shot = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(uit, Buffer.from(shot.result.data, 'base64'));
    console.log(`${titel.startsWith('klaar') ? 'ok' : 'MISLUKT'} ${naam}.png (${(fs.statSync(uit).size / 1024).toFixed(0)} kB) ${titel.slice(0, 120)}`);
  }
  sock.close();
} finally {
  chrome.kill();
  await wacht(300);
  fs.rmSync(profiel, { recursive: true, force: true });
}
