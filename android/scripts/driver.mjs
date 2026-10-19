// Bestuurt het spel in de WebView van de draaiende APK zoals een speler: aanrakingen
// (CDP Input.dispatchTouchEvent, meerdere vingers tegelijk) en de spelstatus lezen.
// Gedeeld door ride.mjs en andere scripts; niets hiervan zit in de APK zelf.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { OUT, toolEnv } from './common.mjs';

export const PKG = 'nl.natuspella.gde.groningen';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function adbTool(serial = null) {
  const { sdk } = toolEnv();
  const bin = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  return (...a) => execFileSync(bin, [...(serial ? ['-s', serial] : []), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
}

export async function connect({ serial = null, port = 9223 } = {}) {
  const adb = adbTool(serial);
  const pid = adb('shell', 'pidof', PKG);
  const sock = adb('shell', 'cat', '/proc/net/unix').split(/\r?\n/).map((l) => l.split(/\s+/).pop()).find((s) => s && s.startsWith('@webview_devtools_remote_' + pid));
  if (!sock) throw new Error('geen debugbare WebView (draait de app?)');
  adb('forward', `tcp:${port}`, 'localabstract:' + sock.slice(1));
  const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((p) => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}, timeout = 40000) => new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => { pending.delete(i); rej(new Error('CDP time-out: ' + method)); }, timeout);
    pending.set(i, (d) => { clearTimeout(t); res(d); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (expression) => {
    const d = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (d.result && d.result.exceptionDetails) throw new Error(d.result.exceptionDetails.exception?.description || 'evaluatiefout');
    return d.result?.result?.value;
  };

  // aanrakingen: elke vinger heeft een eigen id; coördinaten in CSS-px van het scherm
  const fingers = new Map();
  const touch = (type) => send('Input.dispatchTouchEvent', { type, touchPoints: [...fingers.values()].map((f) => ({ x: f.x, y: f.y, id: f.id })) });
  const api = {
    adb, ev, send,
    async down(id, x, y) { fingers.set(id, { id, x, y }); await touch('touchStart'); },
    async move(id, x, y) { fingers.set(id, { id, x, y }); await touch('touchMove'); },
    // CDP kan één vinger niet loslaten: touchEnd laat ze allemaal los. De andere vingers
    // worden daarom opnieuw neergezet (nieuwe pointerdown op hun plek; een stick krijgt een nieuwe oorsprong).
    async up(id) {
      if (!fingers.has(id)) return;
      fingers.delete(id);
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
      if (fingers.size) await touch('touchStart');
    },
    async tap(x, y) { await api.down(90, x, y); await sleep(70); await api.up(90); },
    // viewport-punt van een element: de HUD-schaal is CSS zoom en dan liegen getBoundingClientRect en quads;
    // elementFromPoint niet. Raster van 6 px, het midden van de treffers.
    async center(sel) {
      return ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; let sx = 0, sy = 0, n = 0;
        for (let y = 3; y < innerHeight; y += 6) for (let x = 3; x < innerWidth; x += 6) { const h = document.elementFromPoint(x, y); if (h && (h === el || el.contains(h))) { sx += x; sy += y; n++; } }
        return n ? { x: sx / n, y: sy / n, n } : null; })()`);
    },
    async tapEl(sel) {
      const r = await api.center(sel);
      if (!r) throw new Error('element niet gevonden: ' + sel);
      await api.tap(r.x, r.y);
    },
    // houdt een vinger vast op (x,y) en sleept naar (x2,y2) gedurende ms
    async drag(id, x, y, x2, y2, ms) {
      await api.down(id, x, y);
      const n = Math.max(2, Math.round(ms / 120));
      for (let i = 1; i <= n; i++) { await api.move(id, x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n); await sleep(ms / n); }
    },
    async shot(name) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(OUT, { recursive: true });
      const f = path.join(OUT, name + '.png');
      fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
      return f;
    },
    close() { ws.close(); },
  };
  return api;
}
