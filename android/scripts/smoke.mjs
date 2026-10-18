// Rooktest op een emulator of aangesloten toestel (adb): installeert de
// debug-APK, start het spel, koppelt aan de debugbare WebView (DevTools via
// adb forward) en controleert: spel geladen, canvas, touch-UI, geen fouten,
// liggend, volledig scherm. Schrijft een screenshot naar android/out/.
//
//   node scripts/smoke.mjs [--serial emulator-5554] [--no-install] [--wait 60]
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { OUT, toolEnv } from './common.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const { sdk } = toolEnv();
const adbBin = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const serial = opt('--serial', null);
const adb = (...a) => execFileSync(adbBin, [...(serial ? ['-s', serial] : []), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
const PKG = 'nl.natuspella.gde.groningen';
const APK = path.join(OUT, 'gde-groningen-debug.apk');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FOUT'} ${what}`); if (!ok) fails.push(what); };

if (!args.includes('--no-install')) {
  console.log(adb('install', '-r', APK).split('\n').pop());
}
adb('shell', 'pm', 'clear', PKG);
adb('logcat', '-c');
adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
let pid = '';
for (let i = 0; i < 20 && !pid; i++) {
  await sleep(1000);
  try { pid = adb('shell', 'pidof', PKG); } catch (e) { pid = ''; }
}
check(!!pid, 'app draait (pid ' + pid + ')');

// DevTools-socket van de WebView
let sock = null;
for (let i = 0; i < 30 && !sock; i++) {
  sock = adb('shell', 'cat', '/proc/net/unix').split(/\r?\n/).map((l) => l.split(/\s+/).pop()).find((s) => s && s.startsWith('@webview_devtools_remote_' + pid));
  if (!sock) await sleep(1000);
}
check(!!sock, 'debugbare WebView gevonden');
if (!sock) process.exit(1);
adb('forward', 'tcp:9223', 'localabstract:' + sock.slice(1));
const list = await (await fetch('http://127.0.0.1:9223/json')).json();
const page = list.find((p) => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) pending.get(d.id)(d); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

const waitFor = Number(opt('--wait', 90)) * 1000;
const t0 = Date.now();
let ready = false;
while (Date.now() - t0 < waitFor) {
  ready = await ev("!!document.querySelector('canvas') && !!document.getElementById('touch-ui')");
  if (ready) break;
  await sleep(2000);
}
check(ready, `canvas en touch-UI aanwezig na ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log('url', await ev('location.href'), '| titel', await ev('document.title'));
check(await ev('!!window.Capacitor && Capacitor.getPlatform() === "android"'), 'Capacitor-platform = android');
check(await ev('innerWidth > innerHeight'), 'liggend: ' + await ev('innerWidth + "x" + innerHeight + " @" + devicePixelRatio'));
check(await ev('document.documentElement.classList.contains("android-app")'), 'android-bridge.js actief');
check(await ev('!!(window.__gteWeb) && !navigator.serviceWorker.controller'), 'geen service worker (APK is de cache)');
const opus = await ev('window.__gteWeb && window.__gteWeb.opus');
check(opus === true, 'WebView speelt Opus (geluidsindex)');
check(await ev("(() => { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); })()"), 'WebGL2 beschikbaar');
const gl = await ev("(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); })()");
console.log('GPU:', gl);
// terugknop: pauzemenu moet openen
await sleep(1500);
adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');
await sleep(1500);
const menuOpen = await ev("!!document.querySelector('#pause-menu.visible')");
console.log('pauzemenu na terugknop (heuristiek):', menuOpen);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'smoke.png'), execFileSync(adbBin, [...(serial ? ['-s', serial] : []), 'exec-out', 'screencap', '-p'], { maxBuffer: 1 << 26 }));
console.log('screenshot: android/out/smoke.png');
const log = adb('logcat', '-d', '-s', 'chromium:E', 'AndroidRuntime:E', 'Capacitor/Console:E');
const errs = log.split(/\r?\n/).filter((l) => /FATAL|Uncaught|NaN/.test(l));
check(errs.length === 0, 'geen fatale fouten in logcat' + (errs.length ? '\n' + errs.slice(0, 5).join('\n') : ''));
ws.close();
adb('forward', '--remove', 'tcp:9223');
console.log(fails.length ? `\n${fails.length} controle(s) mislukt` : '\nrooktest geslaagd');
process.exit(fails.length ? 1 : 0);
