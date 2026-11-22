// Headless render van Verhaal > Personages (personages-ui 22-11). GEEN Electron en geen build: een kleine webserver met de echte
// game/js en de gevendorde three, plus headless Chrome op een eigen profiel (eigen PID, buiten de repo) via het DevTools-protocol.
//   node scripts/ui/personages_render.mjs --serve                 server op een vrije poort (open /mock.html?sel=tammo&ui=1)
//   node scripts/ui/personages_render.mjs --shots [--uit=<map>]   PNG's van Tammo, Tessa en Overig op 1280x720, 1920x1080 en ui-schaal 1,5
//   node scripts/ui/personages_render.mjs --meet [--snel]                 meet de DOM (lege elementen, overlap, kop aanwezig, alinealengte); exit 1 bij een fout, 0 en "skip" zonder Chrome
// De pagina is scripts/ui/personages_mock.html. Raakt geen echte opslag en de Chrome van de eigenaar niet (alleen het eigen kind wordt gestopt).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const has = (k) => process.argv.includes(`--${k}`);
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
// de gevendorde three: in deze werkboom, anders in de hoofdmap van de repo (git-common-dir)
function vendorMap() {
  const eigen = path.join(ROOT, 'desktop/vendor-cache');
  if (fs.existsSync(path.join(eigen, 'npm'))) return eigen;
  const g = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' });
  const hoofd = g.status === 0 ? path.resolve(ROOT, g.stdout.trim(), '..', 'desktop/vendor-cache') : '';
  return hoofd && fs.existsSync(path.join(hoofd, 'npm')) ? hoofd : '';
}
const VENDOR = vendorMap();

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
export function server() {
  return http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = null;
    if (u === '/mock.html') file = path.join(ROOT, 'scripts/ui/personages_mock.html');
    else if (u.startsWith('/vendor/')) file = path.join(VENDOR, u.slice(8));
    else file = path.join(ROOT, 'game', u);
    if (!file || !(file.startsWith(ROOT) || (VENDOR && file.startsWith(VENDOR)))) { res.writeHead(404); res.end('niet gevonden'); return; }
    fs.readFile(file, (e, d) => {
      if (e) { res.writeHead(404); res.end('niet gevonden'); return; }
      let body = d;
      // de stappenlijst van de mock: de echte lijst, door een haakje in de pagina bijgewerkt (done/current)
      if (u === '/js/story.js') body = Buffer.from(String(d).replace('export function getStorySteps() {', 'export function getStorySteps() { const r = __origSteps(); return globalThis.__stepsPost ? globalThis.__stepsPost(r) : r; }\nfunction __origSteps() {'));
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    });
  });
}

const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
// Chrome sturen via het DevTools-protocol: pagina openen, wachten tot de mock klaar is, optioneel een PNG nemen en een uitdrukking uitrekenen.
export async function chromeRun(url, w, h, { uit = '', meet = '' } = {}) {
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'personages-chrome-'));
  const kind = spawn(CHROME, ['--headless=new', `--user-data-dir=${profiel}`, '--remote-debugging-port=0', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
      if (m.method === 'Runtime.consoleAPICalled' && ['error'].includes(m.params.type)) logs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      if (m.method === 'Runtime.exceptionThrown') logs.push('uitzondering: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    };
    const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; open.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await cmd('Runtime.enable'); await cmd('Page.enable');
    await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await cmd('Page.navigate', { url });
    let klaar = false;
    for (let i = 0; i < 60 && !klaar; i++) { // hooguit 30 s
      await wacht(500);
      const r = await cmd('Runtime.evaluate', { expression: 'window.__klaar === true', returnByValue: true });
      klaar = !!(r.result && r.result.result && r.result.result.value === true);
    }
    await wacht(500);
    let meting = null;
    if (meet) {
      const r = await cmd('Runtime.evaluate', { expression: meet, returnByValue: true });
      meting = r.result && r.result.result ? r.result.result.value : null;
    }
    if (uit) {
      const shot = await cmd('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(uit, Buffer.from(shot.result.data, 'base64'));
    }
    const paginaLog = (await cmd('Runtime.evaluate', { expression: 'JSON.stringify(window.__log || [])', returnByValue: true })).result?.result?.value;
    ws.close();
    return { klaar, meting, logs: logs.concat(paginaLog ? JSON.parse(paginaLog) : []) };
  } finally {
    kind.kill(); // alleen het eigen kind-proces, nooit op naam
    await wacht(300);
    try { fs.rmSync(profiel, { recursive: true, force: true }); } catch { /* Windows houdt het profiel soms nog even vast */ }
  }
}

// De meting in de pagina: kop aanwezig, geen leeg zichtbaar element, geen horizontale overloop, geen overlap tussen kaarten, alinealengte.
export const MEET = `(() => {
  const out = { fouten: [], info: {} };
  const rect = (e) => e.getBoundingClientRect();
  const zichtbaar = (e) => { const r = rect(e); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const pane = document.querySelector('.vh-viewer');
  if (!pane) { out.fouten.push('geen .vh-viewer'); return out; }
  // 1. een lege tabbalk of een tab zonder label
  for (const tabs of document.querySelectorAll('.m-tabs')) {
    if (!zichtbaar(tabs)) continue;
    const labels = [...tabs.querySelectorAll('[role=tab]')].filter((t) => zichtbaar(t) && t.textContent.trim());
    if (!labels.length) out.fouten.push('lege tabbalk');
    for (const t of tabs.querySelectorAll('[role=tab]')) if (zichtbaar(t) && !t.textContent.trim()) out.fouten.push('tab zonder label');
  }
  // 2. de kop van het dossier
  const kop = pane.querySelector('.vh-kop');
  const heeftKop = !!kop && !!kop.querySelector('h3, h2') && zichtbaar(kop);
  out.info.kop = heeftKop;
  if (!heeftKop && !pane.querySelector('[data-leeg-ok]')) out.fouten.push('dossier zonder kop');
  else if (kop) { const r = rect(kop), p = rect(pane); if (r.top - p.top > 4) out.fouten.push('kop staat niet bovenaan (' + Math.round(r.top - p.top) + 'px)'); }
  // 3. lege, zichtbare elementen (geen beeld, geen tekst, geen kinderen), behalve bewust decoratieve
  const SKIP = 'svg, img, canvas, input, hr, br, [aria-hidden=true], .m-bar, .m-bar *, .ds-m-tabs__lijn, .ds-z-leeg__beeld, .vh-stage, .vh-stage *';
  for (const e of document.querySelectorAll('.vh-layout *')) {
    if (e.matches(SKIP) || e.closest('[aria-hidden=true]') || e.closest('.vh-stage')) continue;
    if (e.children.length === 0 && !e.textContent.trim() && zichtbaar(e)) out.fouten.push('leeg element: ' + e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]);
  }
  // 4. horizontale overloop
  for (const sel of ['.vh-viewer', '.vh-left']) { const e = document.querySelector(sel); if (e && e.scrollWidth > e.clientWidth + 2) out.fouten.push('horizontale overloop in ' + sel + ' (' + e.scrollWidth + ' > ' + e.clientWidth + ')'); }
  // 5. overlap tussen de directe blokken van het dossier
  const blokken = [...pane.querySelectorAll(':scope > * , :scope > * > *')].filter(zichtbaar);
  const sib = [...pane.children].filter(zichtbaar);
  for (let i = 0; i < sib.length; i++) for (let j = i + 1; j < sib.length; j++) {
    const a = rect(sib[i]), b = rect(sib[j]);
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.fouten.push('overlap: ' + sib[i].className + ' en ' + sib[j].className);
  }
  // 6. alinea's van het dossier: hooguit 3 regels
  for (const p of pane.querySelectorAll('p.vh-bio, .vh-meer p, .vh-quote')) {
    if (!zichtbaar(p)) continue;
    const lh = parseFloat(getComputedStyle(p).lineHeight) || parseFloat(getComputedStyle(p).fontSize) * 1.4;
    const n = Math.round(rect(p).height / lh);
    if (n > 3) out.fouten.push('alinea langer dan 3 regels (' + n + '): ' + p.textContent.slice(0, 30));
  }
  out.info.blokken = blokken.length;
  out.info.balk = pane.offsetWidth - pane.clientWidth;
  out.info.balkLinks = (document.querySelector('.vh-left') || pane).offsetWidth - (document.querySelector('.vh-left') || pane).clientWidth;
  return out;
})()`;

const MATEN = [[1280, 720, 1], [1920, 1080, 1], [1920, 1080, 1.5]];
const SCENES = ['tammo', 'anita', 'overig', 'rikus', 'tammo-onder'];

async function main() {
  if (has('serve')) {
    const srv = server().listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${srv.address().port}/mock.html?sel=tammo`));
    return;
  }
  if (!CHROME || !VENDOR) { console.log('skip: ' + (!CHROME ? 'geen Chrome (zet CHROME=<pad>)' : 'geen gevendorde three (cd desktop && npm run stage)')); return; }
  const srv = server();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const poort = srv.address().port;
  let fouten = 0;
  const uitMap = arg('uit') || path.join(os.tmpdir(), 'personages-ui-shots');
  if (has('shots')) fs.mkdirSync(uitMap, { recursive: true });
  for (const sel of (arg('sel') ? [arg('sel')] : has('snel') ? ['tammo', 'overig'] : SCENES)) {
    for (const [w, h, ui] of (has('snel') ? [MATEN[0], MATEN[2]] : MATEN)) {
      const naam = `${sel}-${w}${ui !== 1 ? `-ui${String(ui).replace('.', '')}` : ''}.png`;
      const uit = has('shots') ? path.join(uitMap, naam) : '';
      const r = await chromeRun(`http://127.0.0.1:${poort}/mock.html?sel=${sel.replace('-onder', '').replace(/^overig$/, '__overig')}${sel.endsWith('-onder') ? '&meer=1&scroll=1' : ''}&ui=${ui}`, w, h, { uit, meet: has('meet') || has('shots') ? MEET : '' });
      const f = (r.meting && r.meting.fouten) || [];
      const log = r.logs.filter((l) => !/Failed to load resource|favicon/i.test(l));
      fouten += f.length + (r.klaar ? 0 : 1) + (log.length ? 1 : 0);
      if (has('info')) console.log(JSON.stringify(r.meting && r.meting.info));
      console.log(`${f.length || !r.klaar || log.length ? 'FOUT' : 'ok  '} ${naam}${r.klaar ? '' : ' (niet klaar)'}${f.length ? ' ' + JSON.stringify(f.slice(0, 6)) : ''}${log.length ? ' log: ' + log.slice(0, 3).join(' | ') : ''}`);
    }
  }
  srv.close();
  if (has('shots')) console.log('PNG\'s in ' + uitMap);
  if (fouten) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
