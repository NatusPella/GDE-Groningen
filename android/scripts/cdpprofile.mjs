// CPU-profiel van de WebView van de draaiende APK: de zwaarste functies naar eigen tijd.
//   node scripts/cdpprofile.mjs [ms=6000] [--serial emulator-5554]
import path from 'path';
import { execFileSync } from 'child_process';
import { toolEnv } from './common.mjs';

const args = process.argv.slice(2);
const ms = Number(args.find((a) => /^\d+$/.test(a))) || 6000;
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
let id = 0;
const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) waits.get(d.id)(d); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waits.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Profiler.enable');
await send('Profiler.setSamplingInterval', { interval: 1000 });
await send('Profiler.start');
await new Promise((r) => setTimeout(r, ms));
const { result } = await send('Profiler.stop');
const prof = result.profile;
const self = new Map();
const dts = prof.timeDeltas;
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
prof.samples.forEach((sid, i) => { const n = byId.get(sid); const k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dts[i] || 0)); });
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log('samples', prof.samples.length, 'totaal', Math.round(total / 1000), 'ms');
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(String(Math.round(v / 1000)).padStart(6), 'ms', k);
process.exit(0);
