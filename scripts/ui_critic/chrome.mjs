// UI-kritiekharnas: een eigen headless Chrome of Edge op een eigen PID en een eigen --user-data-dir (buiten de repo),
// bestuurd via CDP over de ingebouwde WebSocket van Node. Raakt nooit een ander browserproces aan.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KANDIDATEN = [
  process.env.GDE_CRITIC_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export const vindBrowser = () => KANDIDATEN.find((p) => existsSync(p)) || null;
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startBrowser({ timeoutMs = 20000 } = {}) {
  const exe = vindBrowser();
  if (!exe) throw new Error('geen Chrome of Edge gevonden (zet GDE_CRITIC_BROWSER)');
  const profiel = mkdtempSync(join(tmpdir(), 'gde-ui-critic-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profiel}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--hide-scrollbars=false', '--force-color-profile=srgb', '--font-render-hinting=none', 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
  const einde = Date.now() + timeoutMs;
  let poort = 0, pad = '';
  while (Date.now() < einde) {
    const f = join(profiel, 'DevToolsActivePort');
    if (existsSync(f)) {
      try { const [p, ws] = readFileSync(f, 'utf8').trim().split('\n'); poort = +p; pad = ws; if (poort) break; } catch (e) { /* nog in gebruik door de browser */ }
    }
    await wacht(100);
  }
  if (!poort) { proc.kill(); throw new Error('browser startte niet binnen de tijd'); }
  const ws = new WebSocket(`ws://127.0.0.1:${poort}${pad}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP-verbinding mislukt')); setTimeout(() => rej(new Error('CDP time-out')), timeoutMs); });
  let id = 0; const open = new Map(); const luisteraars = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && open.has(m.id)) { const { res, rej } = open.get(m.id); open.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else luisteraars.forEach((l) => l(m));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const n = ++id; open.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
    setTimeout(() => { if (open.has(n)) { open.delete(n); rej(new Error('CDP time-out: ' + method)); } }, 60000);
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => send(method, params, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  const logs = [];
  luisteraars.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') logs.push('uitzondering: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
  });
  return {
    pid: proc.pid, exe, logs,
    send: s,
    async metrics(w, h) { await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); },
    async goto(url) {
      const klaar = new Promise((res) => { const l = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { luisteraars.splice(luisteraars.indexOf(l), 1); res(); } }; luisteraars.push(l); });
      await s('Page.navigate', { url });
      await Promise.race([klaar, wacht(30000)]);
    },
    async eval(expr, { awaitPromise = true } = {}) {
      const r = await s('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true, timeout: 45000 });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async jpeg(quality = 80) { const r = await s('Page.captureScreenshot', { format: 'jpeg', quality }); return Buffer.from(r.data, 'base64'); },
    async close() {
      try { ws.close(); } catch (e) { /* al dicht */ }
      try { proc.kill(); } catch (e) { /* al weg */ }
      await wacht(400);
      try { rmSync(profiel, { recursive: true, force: true }); } catch (e) { /* profiel mag blijven */ }
    },
  };
}
