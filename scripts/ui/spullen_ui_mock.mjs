// Headless beeldmock van het Spullen-scherm, oud tegen nieuw (spullen-ui 21-11). GEEN Electron: een kleine webserver met de echte game/js
// (de nieuwe uit deze werkboom, de oude uit een basiscommit via git archive) en de gevendorde three, plus headless Chrome voor de PNG's.
//   node scripts/ui/spullen_ui_mock.mjs --serve                 server op een vrije poort (open /mock.html?v=oud|nieuw&scene=alles)
//   node scripts/ui/spullen_ui_mock.mjs --shots [--base=<commit>] schrijft docs/beeld-21-11/spullen-ui/*.png (oud en nieuw, 1920x1080 en 1280x720, ui-schaal 1,0 en 1,5), Chrome via het DevTools-protocol
// De pagina is docs/beeld-21-11/spullen-ui/mock.html. Zonder WebGL (--disable-gpu) tekent de galerij de iconen-terugval: scene 'terugval'.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const has = (k) => process.argv.includes(`--${k}`);
const PORT = Number(arg('port')) || 0; // 0 = een vrije poort (op deze machine draaien meer servers)
const UIT = path.join(ROOT, 'docs/beeld-21-11/spullen-ui');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));

// de oude versie: game/js en fonts uit de basiscommit, in een tijdelijke map
function oudeKopie(basis) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spullen-oud-'));
  const a = spawnSync('git', ['archive', basis, 'game/js', 'game/fonts'], { cwd: ROOT, maxBuffer: 1 << 29 });
  if (a.status !== 0) throw new Error('git archive faalde: ' + a.stderr);
  const t = spawnSync('tar', ['-x'], { cwd: dir, input: a.stdout, maxBuffer: 1 << 29 });
  if (t.status !== 0) throw new Error('tar faalde: ' + t.stderr);
  return path.join(dir, 'game');
}

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png' };
function server(roots) {
  return http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = null;
    if (u === '/mock.html') file = path.join(UIT, 'mock.html');
    else if (u.startsWith('/vendor/')) file = path.join(ROOT, 'desktop/vendor-cache', u.slice(8));
    else { const m = /^\/(oud|nieuw)\/(.*)$/.exec(u); if (m && roots[m[1]]) file = path.join(roots[m[1]], m[2]); }
    if (!file || !file.startsWith(ROOT) && !file.startsWith(os.tmpdir())) { res.writeHead(404); res.end('niet gevonden'); return; }
    fs.readFile(file, (e, d) => {
      if (e) { res.writeHead(404); res.end('niet gevonden'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(d);
    });
  });
}

// scenes: [naam, versie, query, breedte, hoogte, extra Chrome-vlaggen]
const SCENES = [
  ['alles', 'oud', 'scene=alles&sel=w:pistol'], ['alles', 'nieuw', 'scene=alles&sel=w:pistol'],
  ['wapens', 'oud', 'scene=wapens'], ['wapens', 'nieuw', 'scene=wapens'],
  ['detail-kleding', 'oud', 'scene=alles&sel=o:groenwit'], ['detail-kleding', 'nieuw', 'scene=alles&sel=o:groenwit'],
  ['leeg', 'nieuw', 'scene=leeg'],
  ['terugval', 'nieuw', 'scene=alles&sel=w:pistol', '--disable-gpu', '--disable-software-rasterizer'],
];
const MATEN = [[1920, 1080, 1], [1280, 720, 1]]; // ui-schaal 1,5 is hier niet los te zien (de mock leest geen instellingen); die dekt de pure test van rasterMaat

// Chrome sturen via het DevTools-protocol (geen puppeteer nodig): pagina openen, wachten tot de mock klaar is, schermafbeelding nemen.
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
async function chromeShot(url, w, h, uit, vlaggen, debug) {
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'spullen-chrome-'));
  const kind = spawn(CHROME, ['--headless=new', `--user-data-dir=${profiel}`, '--remote-debugging-port=0', '--hide-scrollbars', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', ...vlaggen, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const ws0 = await new Promise((res, rej) => {
      let buf = '';
      const t = setTimeout(() => rej(new Error('Chrome start niet')), 20000);
      kind.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf); if (m) { clearTimeout(t); res(m[1]); } });
    });
    const poort = new URL(ws0).port;
    const doel = await (await fetch(`http://127.0.0.1:${poort}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(doel.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0; const open = new Map(); const logs = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && open.has(m.id)) { open.get(m.id)(m); open.delete(m.id); return; }
      if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      if (m.method === 'Runtime.exceptionThrown') logs.push('uitzondering: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    };
    const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; open.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await cmd('Runtime.enable'); await cmd('Page.enable');
    await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await cmd('Page.navigate', { url });
    let klaar = false;
    for (let i = 0; i < 100 && !klaar; i++) { // hooguit 50 s
      await wacht(500);
      const r = await cmd('Runtime.evaluate', { expression: 'window.__klaar === true', returnByValue: true });
      klaar = r.result && r.result.result && r.result.result.value === true;
    }
    await wacht(700); // de fade-in van de plaatjes
    const shot = await cmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(uit, Buffer.from(shot.result.data, 'base64'));
    if (debug && logs.length) console.log(logs.slice(0, 12).join('\n'));
    ws.close();
    return klaar;
  } finally {
    kind.kill();
    await wacht(300);
    try { fs.rmSync(profiel, { recursive: true, force: true }); } catch { /* Windows houdt het profiel soms nog even vast */ }
  }
}

async function shots() {
  if (!CHROME) throw new Error('geen Chrome gevonden (zet CHROME=<pad>)');
  const basis = arg('base') || 'origin/main';
  const roots = { nieuw: path.join(ROOT, 'game'), oud: oudeKopie(basis) };
  const srv = server(roots);
  await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
  const poort = srv.address().port;
  fs.mkdirSync(UIT, { recursive: true });
  let n = 0;
  for (const [naam, versie, query, ...vlaggen] of SCENES) {
    for (const [w, h, ui] of MATEN) {
      const uit = path.join(UIT, `${naam}-${versie}-${w}${ui !== 1 ? `-ui${String(ui).replace('.', '')}` : ''}.png`);
      if (arg('only') && !path.basename(uit).includes(arg('only'))) continue;
      const url = `http://127.0.0.1:${poort}/mock.html?v=${versie}&${query}&ui=${ui}`;
      let klaar = false;
      try { klaar = await chromeShot(url, w, h, uit, vlaggen, has('debug')); } catch (e) { console.log('fout', e.message); }
      console.log(fs.existsSync(uit) ? (klaar ? 'ok  ' : 'ok? ') : 'FAIL', path.relative(ROOT, uit));
      n++;
    }
  }
  srv.close();
  fs.rmSync(path.dirname(roots.oud), { recursive: true, force: true });
  console.log(`${n} beelden`);
}


if (has('shots')) await shots();
else if (has('serve')) {
  const roots = { nieuw: path.join(ROOT, 'game'), oud: oudeKopie(arg('base') || 'origin/main') };
  const srv = server(roots).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${srv.address().port}/mock.html?v=nieuw&scene=alles`));
} else console.log('gebruik: --serve of --shots');
