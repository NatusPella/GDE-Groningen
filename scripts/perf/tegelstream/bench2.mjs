// node bench2.mjs <tag> <desktopDir> <gameDir> <presetPairs|-> <electronExe> [extra electron flags...]
//  -> .pt/out/<tag>.json (+ .log).  Own TEMP/profile in .pt, one Electron, killed afterwards (own pid tree only).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const B = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const [tag, desktop, gameDir, preset, exe, ...extra] = process.argv.slice(2);
const OUT = path.join(B, 'out'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(B, 'tmp'); fs.mkdirSync(TMP, { recursive: true });
const profile = path.join(B, 'prof', 'gde-test-stil-' + tag);
fs.rmSync(profile, { recursive: true, force: true }); fs.mkdirSync(profile, { recursive: true });
const cpu = () => os.cpus().reduce((a, c) => { const t = c.times; a.i += t.idle; a.a += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { i: 0, a: 0 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sample = async (ms) => { const a = cpu(); await sleep(ms); const b = cpu(); return Math.round(100 * (1 - (b.i - a.i) / Math.max(1, b.a - a.a))); };
// CPU and memory before the run: nothing else may run (break off above 25%)
let pre = await sample(4000);
let tries = 0;
while (pre > 25 && tries < 5) { await sleep(20000); pre = await sample(4000); tries++; }
const freeGB = +(os.freemem() / 2 ** 30).toFixed(1);
if (pre > 25) { console.log(tag, 'ABORT cpu', pre); fs.writeFileSync(path.join(OUT, tag + '.json'), JSON.stringify({ tag, ok: false, abort: 'cpu ' + pre })); process.exit(3); }
const args = ['.', '--benchmark=1', '--windowed', '--stil', '--no-sandbox', '--force-device-scale-factor=1', '--window-size=1920x1080',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
  `--bench-eval=${path.join(B, 'bhook.js')}`];
if (preset !== '-') args.push(`--preset=${preset}`);
args.push(...extra);
const env = { ...process.env, GDE_GAME_DIR: gameDir.replace(/\//g, '\\'), GDE_TEST_PROFILE: profile.replace(/\//g, '\\'), TEMP: TMP, TMP, TMPDIR: TMP };
delete env.ELECTRON_RUN_AS_NODE;
const c0 = cpu(); const t0 = Date.now();
const log = fs.createWriteStream(path.join(OUT, tag + '.log'));
const child = spawn(exe, args, { cwd: desktop, env, stdio: ['ignore', 'pipe', 'pipe'] });
let buf = '', result = null;
const onData = (d) => { log.write(d); buf += d; if (!result) { const m = /\[trailer\] bstats (\{.*\})/.exec(buf); if (m) { try { result = JSON.parse(m[1]); } catch (e) { /* partial */ } if (result) setTimeout(() => spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']), 3000); } } };
child.stdout.on('data', onData); child.stderr.on('data', onData);
const killer = setTimeout(() => { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); }, 420000);
await new Promise((res) => child.on('exit', res));
clearTimeout(killer);
spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
const c1 = cpu();
const busy = Math.round(100 * (1 - (c1.i - c0.i) / Math.max(1, c1.a - c0.a)));
// GC share from --js-flags=--trace-gc (if the lines reach the pipe): total pause ms
let gcMs = 0, gcN = 0;
for (const m of buf.matchAll(/\d+ ms: (?:Scavenge|Mark-Compact|Mark-sweep|Minor Mark-Sweep|Minor Mark-Compact)[^\n]*?([\d.]+) \/ [\d.]+ ms/g)) { gcMs += Number(m[1]); gcN++; }
const out = { tag, preset, wallS: Math.round((Date.now() - t0) / 1000), cpuPre: pre, cpuDuring: busy, freeGB, ok: !!result, gcMs: Math.round(gcMs), gcN, ...result };
fs.writeFileSync(path.join(OUT, tag + '.json'), JSON.stringify(out));
fs.rmSync(profile, { recursive: true, force: true });
console.log(tag, out.ok ? `avg ${out.avg.toFixed(1)} p95 ${out.p95} low1 ${out.low1} heapPeak ${out.heapPeak} lt ${out.longtasks} gc ${out.gcMs}ms/${out.gcN} wall ${out.wallS}s cpuPre ${pre}% cpu ${busy}% free ${freeGB}` : 'NO RESULT wall ' + out.wallS + ' cpuPre ' + pre);
