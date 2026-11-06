// Profiel van de echte game via het Chrome DevTools-protocol (#553).
// Start de desktop-app met een remote-debugging-poort, wacht tot de wereld
// draait, neemt 10 s een CPU-profiel van de renderer en schrijft het als
// .cpuprofile. Daarna: node scripts/perf/selftime.mjs <bestand>.
//   node scripts/perf/cdp_profile.mjs [seconden] [poort]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SECONDS = Number(process.argv[2]) || 10;
const PORT = Number(process.argv[3]) || 9333;
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const out = path.join(process.env.TEMP || ROOT, `gde-cpuprofile-${Date.now()}.cpuprofile`);
const profileDir = path.join(ROOT, '.test-temp', 'cdp-profile');
fs.mkdirSync(profileDir, { recursive: true });
const png = path.join(profileDir, 'cdp-shot.png');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => { let b = ''; res.on('data', (d) => { b += d; }); res.on('end', () => resolve(b)); }).on('error', reject);
});

const child = spawn(electron, [path.join(ROOT, 'desktop'), '--windowed', '--stil', `--remote-debugging-port=${PORT}`, '--force-device-scale-factor=1', '--window-size=1920x1080', `--smoke-test=${png}`], {
  cwd: path.join(ROOT, 'desktop'), stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, GDE_TEST_PROFILE: `gde-cdp-${Date.now()}` },
});
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
let ws = null, id = 1;
const pending = new Map();
function cdp(method, params = {}) {
  const msg = { id: id++, method, params };
  return new Promise((resolve, reject) => {
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
    setTimeout(() => { if (pending.delete(msg.id)) reject(new Error('CDP timeout ' + method)); }, 180000);
  });
}

try {
  let target = null;
  for (let i = 0; i < 120 && !target; i++) {
    await sleep(1000);
    try {
      const list = JSON.parse(await get(`http://127.0.0.1:${PORT}/json/list`));
      target = list.find((t) => t.type === 'page' && /index\.html/.test(t.url)) || null;
    } catch (e) { /* app nog niet klaar */ }
    if (!target && /error|Error/.test(log)) break;
  }
  if (!target) throw new Error('geen renderer-pagina gevonden; log: ' + log.slice(-1500));
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket')); });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    const p = m.id && pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  };
  await cdp('Runtime.enable');
  // wacht tot de wereld bestaat en de eerste frames gelopen hebben
  let ready = false;
  for (let i = 0; i < 240 && !ready; i++) {
    await sleep(1000);
    const r = await cdp('Runtime.evaluate', { expression: "!!(window.__debug && window.__debug.world && document.body.classList.contains('game-started'))", returnByValue: true });
    ready = !!r.result.value;
  }
  if (!ready) throw new Error('wereld niet gestart binnen 240 s');
  await sleep(3000); // instroom van de eerste tegels voorbij
  await cdp('Profiler.enable');
  await cdp('Profiler.start');
  await sleep(SECONDS * 1000);
  const prof = await cdp('Profiler.stop');
  fs.writeFileSync(out, JSON.stringify(prof.profile));
  console.log('profiel: ' + out);
} catch (e) {
  console.error('cdp_profile mislukt: ' + (e && e.message ? e.message : e));
  process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch (e) { /* weg */ }
  try { child.kill(); } catch (e) { /* weg */ }
}


