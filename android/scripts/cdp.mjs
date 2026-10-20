// Evalueert een JS-expressie in de WebView van de draaiende APK (DevTools via adb forward).
//   node scripts/cdp.mjs "document.title" [--serial emulator-5554]
import path from 'path';
import { execFileSync } from 'child_process';
import { toolEnv } from './common.mjs';

const args = process.argv.slice(2);
const expr = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--serial');
const serial = args.includes('--serial') ? args[args.indexOf('--serial') + 1] : null;
const { sdk } = toolEnv();
const adbBin = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const adb = (...a) => execFileSync(adbBin, [...(serial ? ['-s', serial] : []), ...a], { encoding: 'utf8' }).trim();
const pid = adb('shell', 'pidof', 'nl.natuspella.gde.groningen');
const sock = adb('shell', 'cat', '/proc/net/unix').split(/\r?\n/).map((l) => l.split(/\s+/).pop()).find((s) => s && s.startsWith('@webview_devtools_remote_' + pid));
adb('forward', 'tcp:9223', 'localabstract:' + sock.slice(1));
const page = (await (await fetch('http://127.0.0.1:9223/json')).json()).find((p) => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) { console.log(JSON.stringify(d.result?.result?.value ?? d.result ?? d.error)); process.exit(0); } };
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
