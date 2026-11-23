// Rendert een vergelijkingspagina van scripts/qa/ headless met Chrome (geen Electron, geen venster, geen dialoog) naar een png.
//   node scripts/qa/mensen_fase1_render.mjs [--page=mensen_fase1] [--out=<map in de worktree>]
// Neemt een slot in <GDE_LOCKS of ~/gde-locks> (electron-1..3, mkdir) zodat een fps-meting niet verstoord wordt, en geeft het altijd vrij.
// Dient de worktree en de vendor-cache (onder /cdn/) zelf op een vrije poort van 127.0.0.1; wegwerpprofiel onder de uitvoermap;
// stopt alleen het eigen Chrome-proces (eigen PID). Raakt poort 9000 en de geïnstalleerde app niet.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { vindVendorCache } from '../lib/vendorcache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PAGE = /^[a-z0-9_]+$/.test(arg('page', 'mensen_fase1')) ? arg('page', 'mensen_fase1') : 'mensen_fase1';
const OUT = path.resolve(arg('out', path.join(ROOT, 'beeld-mensen')));
const CHROME = process.env.GDE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const VENDOR = (vindVendorCache(ROOT).dirs[0] || path.resolve(ROOT, '..', '..', '..', 'desktop', 'vendor-cache'));
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => { const t = a.join(' '); fs.appendFileSync(path.join(OUT, 'run.log'), t + '\n'); console.log(t); };

let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
fs.mkdirSync(LOCKS, { recursive: true });
for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
if (!slot) { log('geen slot vrij'); process.exit(4); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__klaar') { let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => { fs.writeFileSync(path.join(OUT, `${PAGE}.json`), body); log('cijfers', body); res.end('ok'); }); return; }
  const file = u.startsWith('/cdn/') ? path.join(VENDOR, 'npm', u.slice(5)) : path.join(ROOT, u);
  if (!file.startsWith(ROOT) && !file.startsWith(VENDOR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (e, buf) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(buf); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const profile = path.join(OUT, `profiel-${process.pid}`);
const png = path.join(OUT, `${PAGE}.png`);
const args = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', `--user-data-dir=${profile}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-logging=stderr', '--v=0',
  '--window-size=1600,1400', '--virtual-time-budget=60000', `--screenshot=${png}`, `http://127.0.0.1:${port}/scripts/qa/${PAGE}.html`];
log('start', new Date().toISOString(), PAGE);
const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
child.stderr.on('data', (d) => fs.appendFileSync(path.join(OUT, 'chrome.log'), d));
const timer = setTimeout(() => { log('time-out: stop eigen Chrome', child.pid); child.kill(); }, 180000);
child.on('exit', (code) => {
  clearTimeout(timer);
  srv.close();
  release();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* blijft staan */ }
  log('klaar', code, fs.existsSync(png) ? png : 'geen png');
  process.exit(fs.existsSync(png) ? 0 : 1);
});
