// Echte layoutmeting van het laadscherm en het bootscherm (#1069, 22-11): opent scripts/ui/laadscherm_render.html met de
// echte CSS in headless Chrome of Edge (GEEN Electron), meet de boxen (getBoundingClientRect) en maakt desgewenst een PNG.
// De browser start als eigen kindproces met een eigen --user-data-dir in de tijdelijke map, wordt via het DevTools-protocol bestuurd
// (viewport exact w x h) en gesloten met Browser.close en, zo nodig, op de PID van dat ene kindproces. Andere Chrome-processen blijven met rust.
//   node scripts/ui/laadscherm_meet.mjs [--png=<map>] [--alles | --licht] [--json=<bestand>]
//   node scripts/ui/laadscherm_meet.mjs --een=<w>x<h>,<ui>,<naam>[,<tag>] [--kind=travel|save|snel|boot] [--png=<map>]
// Exporteert openBrowser() (null zonder browser), analyseer(), scenarios(), UI_VOOR() voor scripts/laadscherm_layout_test.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].find((p) => fs.existsSync(p)) || null;

// de --ui-factor zoals uiscale.js hem berekent (hudlook.uiScaleFor): auto = max(1, min(h/900, w/1440)), keer de keuze van de speler
export const UI_VOOR = (w, h, speler = 1) => Math.round(Math.min(4, Math.max(0.8, Math.max(1, Math.min(h / 900, w / 1440)) * speler)) * 1000) / 1000;

export const VENSTERS = [[1280, 720], [1366, 768], [1920, 1080], [2560, 1440]];
export const SCHALEN = [1, 1.25, 1.5];
export const NAMEN = ['Drenthe', 'Noordlaren', 'Vierhuizen-Oostpolder'];
export const TAG = 'Kiezelweek';

/** de scenario's van de test: elke combinatie die ertoe doet, zonder de matrix te laten exploderen */
export function scenarios({ alles = false, licht = false } = {}) {
  const S = [];
  const add = (o) => S.push({ kind: 'travel', tag: '', status: '', rustig: false, beweging: true, ...o });
  if (licht) {
    // de lichte suite (scripts/laadscherm_layout_test.mjs): de combinaties die ertoe doen, in ongeveer 40 s
    const combos = [[1280, 720, 1], [1280, 720, 1.25], [1280, 720, 1.5], [1366, 768, 1], [1920, 1080, 1], [1920, 1080, 1.5], [2560, 1440, 1]];
    for (const [w, h, speler] of combos) {
      const ui = UI_VOOR(w, h, speler);
      add({ w, h, ui, speler, naam: 'Drenthe', tag: TAG });
      add({ w, h, ui, speler, naam: 'Vierhuizen-Oostpolder', tag: TAG });
      if (w === 1280) add({ w, h, ui, speler, naam: 'Noordlaren' });
    }
    for (const speler of [1, 1.5]) {
      const ui = UI_VOOR(1280, 720, speler), w = 1280, h = 720;
      add({ w, h, ui, speler, kind: 'save', naam: 'Noordlaren', tag: TAG });
      add({ w, h, ui, speler, kind: 'snel', naam: 'Vierhuizen-Oostpolder' });
      add({ w, h, ui, speler, naam: 'Drenthe', tag: TAG, status: 'Wachten op Tessa de Vries-van-der-Meulen' });
      add({ w, h, ui, speler, naam: 'Vierhuizen-Oostpolder', tag: TAG, rustig: true, beweging: false });
      add({ w, h, ui, speler, kind: 'boot', naam: '' });
      add({ w, h, ui, speler, kind: 'boot', naam: '', status: 'Dit duurt even, niet vastgelopen: Wegen en voertuigen worden klaargezet en daarna nog een heel lang stuk tekst' });
    }
    return S;
  }
  for (const [w, h] of VENSTERS) {
    for (const speler of (alles || (w === 1280 || w === 1920)) ? SCHALEN : [1]) {
      const ui = UI_VOOR(w, h, speler);
      for (const naam of NAMEN) for (const tag of ['', TAG]) add({ w, h, ui, speler, naam, tag });
    }
  }
  const w = 1280, h = 720;
  for (const speler of SCHALEN) {
    const ui = UI_VOOR(w, h, speler);
    add({ w, h, ui, speler, kind: 'save', naam: 'Noordlaren', tag: TAG });
    add({ w, h, ui, speler, kind: 'save', naam: 'Vierhuizen-Oostpolder' });
    add({ w, h, ui, speler, kind: 'snel', naam: 'Vierhuizen-Oostpolder' });
    add({ w, h, ui, speler, kind: 'snel', naam: 'Drenthe', tag: TAG });
    add({ w, h, ui, speler, naam: 'Drenthe', tag: TAG, status: 'Wachten op Tessa de Vries-van-der-Meulen' });
    add({ w, h, ui, speler, naam: 'Noordlaren', tag: TAG, status: 'Dit duurt even, niet vastgelopen: Wegen en gebouwen rond je worden geladen' });
    add({ w, h, ui, speler, naam: 'Vierhuizen-Oostpolder', tag: TAG, rustig: true, beweging: false });
    add({ w, h, ui, speler, kind: 'boot', naam: '', status: 'De shaders worden klaargezet (dit duurt even)' });
    add({ w, h, ui, speler, kind: 'boot', naam: '', status: 'Dit duurt even, niet vastgelopen: Wegen en voertuigen worden klaargezet en daarna nog een heel lang stuk tekst' });
  }
  for (const [w2, h2] of [[1366, 768], [1920, 1080], [2560, 1440]]) add({ w: w2, h: h2, ui: UI_VOOR(w2, h2), speler: 1, kind: 'boot', naam: '' });
  return S;
}

export const naamVan = (s) => `${s.kind}-${s.w}x${s.h}-ui${s.ui}${s.rustig ? '-rustig' : ''}-${(s.naam || 'boot').replace(/[^a-z0-9]+/gi, '_')}${s.tag ? '-tag' : ''}${s.status ? '-' + s.status.length : ''}`;

function pagina(s, base) {
  const q = new URLSearchParams({ v: s.kind === 'boot' ? 'boot' : 'laad', kind: s.kind === 'boot' ? 'travel' : s.kind, naam: s.naam || '', tag: s.tag || '', ui: String(s.ui), status: s.status || '' });
  if (s.rustig) q.set('rustig', '1');
  if (s.beweging === false) q.set('beweging', '0');
  const file = path.join(base || ROOT, 'scripts/ui/laadscherm_render.html');
  return pathToFileURL(file).href + '?' + q.toString();
}

// Eén headless browser (eigen kindproces, eigen profiel) met het DevTools-protocol over een WebSocket: het viewport staat exact op w x h
// (Emulation.setDeviceMetricsOverride; --window-size zou de vensterrand meerekenen). Sluiten doet close(): Browser.close, en anders de PID van dit kindproces.
export async function openBrowser() {
  if (!BROWSER) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'laadmeet-'));
  const kind = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${path.join(dir, 'profiel')}`, 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
  const pid = kind.pid;
  let ws = null, id = 0;
  const wacht = new Map();
  const sluit = async () => {
    try { if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ id: ++id, method: 'Browser.close' })); } } catch (e) { /* al dicht */ }
    await new Promise((r) => setTimeout(r, 400));
    try { process.kill(pid, 0); kind.kill(); } catch (e) { /* het proces is al weg */ }
    try { ws.close(); } catch (e) { /* al dicht */ }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* het profiel ruimt het besturingssysteem op */ }
  };
  try {
    const poort = path.join(dir, 'profiel', 'DevToolsActivePort');
    let regels = null;
    for (let i = 0; i < 100 && !regels; i++) { try { regels = fs.readFileSync(poort, 'utf8').split(String.fromCharCode(10)).map((x) => x.trim()); } catch (e) { await new Promise((r) => setTimeout(r, 100)); } }
    if (!regels) throw new Error('de browser meldt geen DevTools-poort');
    ws = new WebSocket(`ws://127.0.0.1:${regels[0]}${regels[1]}`);
    await new Promise((ok, fout) => { ws.onopen = ok; ws.onerror = () => fout(new Error('WebSocket')); setTimeout(() => fout(new Error('WebSocket time-out')), 10000); });
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wacht.has(m.id)) { const [ok, fout] = wacht.get(m.id); wacht.delete(m.id); m.error ? fout(new Error(m.error.message)) : ok(m.result); } };
  } catch (e) { await sluit(); throw e; }
  const stuur = (method, params = {}, sessionId) => new Promise((ok, fout) => {
    const n = ++id; wacht.set(n, [ok, fout]);
    ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (wacht.has(n)) { wacht.delete(n); fout(new Error('time-out op ' + method)); } }, 30000);
  });
  return {
    pid,
    close: sluit,
    /** meet een scenario: { s, res (ruwe boxen), png } */
    async meet(s, { base, png } = {}) {
      const { targetId } = await stuur('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await stuur('Target.attachToTarget', { targetId, flatten: true });
      try {
        await stuur('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false }, sessionId);
        await stuur('Page.navigate', { url: pagina(s, base) }, sessionId);
        let res = null;
        for (let i = 0; i < 120 && !res; i++) {
          await new Promise((r) => setTimeout(r, 250));
          const r = await stuur('Runtime.evaluate', { expression: "document.title === 'klaar' ? document.getElementById('res').textContent : ''", returnByValue: true }, sessionId);
          if (r.result && r.result.value) res = JSON.parse(r.result.value);
        }
        let pngPad = null;
        if (png && res) {
          const jpg = /[.]jpe?g$/i.test(png); // een .jpg-pad geeft een klein JPEG (voor de docs), anders PNG
          const shot = await stuur('Page.captureScreenshot', jpg ? { format: 'jpeg', quality: 80 } : { format: 'png' }, sessionId);
          pngPad = path.resolve(png);
          fs.mkdirSync(path.dirname(pngPad), { recursive: true });
          fs.writeFileSync(pngPad, Buffer.from(shot.data, 'base64'));
        }
        return { s, res, png: pngPad, stderr: res ? '' : 'de pagina werd niet klaar' };
      } finally {
        try { await stuur('Target.closeTarget', { targetId }); } catch (e) { /* weg is weg */ }
      }
    },
  };
}

// --- analyse -----------------------------------------------------------------------------------------------------------------
export const MIN_PLAATS_PX = 34; // kleiner dan dit lettertype lezen we niet meer als de bestemming
export const GAP_LOGO_KAART = 24; // marge tussen het logo en de bestemming (720p en hoger; schaalt mee met --ui)
export const GAP_LOGO_KAART_LAAG = 16; // bij een logische schermhoogte onder 640 px (720p met een groot interface)
export const GAP_ZONES = 16;

/** zet de ruwe boxen om naar logische px (de stage = 100vw / ui) en rekent de marges uit. Geeft { boxes, gaps, fouten } */
export function analyseer(run) {
  const { res, s } = run;
  if (!res || !res.stage) return { fouten: ['geen meting: ' + (run.stderr || 'de pagina gaf niets terug') + ((res && res.fouten || []).join(' '))], boxes: {}, gaps: [] };
  const sc = res.stage.w / (res.vw / res.ui); // 1 als de browser in logische px meet, ui als in schermpixels
  const lw = res.vw / res.ui, lh = res.vh / res.ui;
  const b = {};
  for (const [k, r] of Object.entries(res.boxes)) {
    if (!r.w && !r.h) continue; // niet getoond (display: none), zoals het logo bij snel reizen
    b[k] = { l: r.l / sc, t: r.t / sc, r: r.r / sc + (r.sx || 0), b: r.b / sc + (r.sy || 0), fs: r.fs, ellips: r.ellips };
    b[k].w = b[k].r - b[k].l; b[k].h = b[k].b - b[k].t;
  }
  const gap = (a, c) => { const x = Math.max(a.l - c.r, c.l - a.r), y = Math.max(a.t - c.b, c.t - a.b); return Math.max(x, y); };
  const paren = s.kind === 'boot'
    ? [['logo', 'bar', 24], ['logo', 'status', 24], ['bar', 'status', 4], ['logo', 'leeftijd', 12], ['status', 'leeftijd', 12], ['status', 'versie', 12], ['bar', 'leeftijd', 12], ['leeftijd', 'versie', 12]]
    : s.kind === 'snel'
      ? [['card', 'bar', GAP_ZONES], ['bar', 'status', 4]]
      : [['logo', 'card', lh >= 640 ? GAP_LOGO_KAART : GAP_LOGO_KAART_LAAG], ['tagline', 'kick', GAP_LOGO_KAART_LAAG], ['logo', 'place', GAP_LOGO_KAART_LAAG], ['logo', 'tag', GAP_LOGO_KAART_LAAG], ['logo', 'bg', GAP_ZONES], ['card', 'bg', GAP_ZONES], ['bg', 'bar', GAP_ZONES],
        ['card', 'bar', GAP_ZONES], ['logo', 'bar', GAP_ZONES], ['logo', 'status', GAP_ZONES], ['bg', 'status', GAP_ZONES], ['card', 'status', GAP_ZONES], ['bar', 'status', 4], ['kick', 'place', 0], ['place', 'tag', 0]];
  const gaps = [], fouten = [];
  for (const [x, y, min] of paren) {
    if (!b[x] || !b[y]) continue;
    const g = gap(b[x], b[y]);
    gaps.push({ paar: `${x}/${y}`, gap: Math.round(g * 10) / 10, min });
    if (g < min - 0.5) fouten.push(`${x} en ${y}: ${g < 0 ? 'overlap ' + (-g).toFixed(1) : 'marge ' + g.toFixed(1)} px (minimaal ${min})`);
  }
  // alles binnen het scherm, met een rand van minstens 12 logische px (de harde schaduw hoort erbij)
  for (const [k, r] of Object.entries(b)) {
    if (k === 'bg' && s.kind === 'snel') continue;
    const rand = Math.min(r.l, r.t, lw - r.r, lh - r.b);
    if (rand < 12 - 0.5) fouten.push(`${k} ligt te dicht op de schermrand (${rand.toFixed(1)} px)`);
  }
  if (b.place && b.place.fs < MIN_PLAATS_PX) fouten.push(`de bestemming is te klein gezet (${b.place.fs.toFixed(0)} px)`);
  if (b.place && b.place.ellips && b.place.fs > MIN_PLAATS_PX + 2) fouten.push('de bestemming wordt afgekapt terwijl het lettertype nog kleiner kon');
  return { boxes: b, gaps, fouten, lw, lh };
}

// --- CLI -----------------------------------------------------------------------------------------------------------------------
async function main() {
  const arg = (n) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
  const vlag = (n) => process.argv.includes('--' + n);
  if (!BROWSER) { console.log('laadscherm_meet: geen Chrome of Edge gevonden, niets gemeten'); return; }
  let lijst = scenarios({ alles: vlag('alles'), licht: vlag('licht') });
  const een = arg('een');
  if (een) {
    const [wh, ui, naam, tag] = een.split(',');
    const [w, h] = wh.split('x').map(Number);
    lijst = [{ w, h, speler: Number(ui) || 1, ui: UI_VOOR(w, h, Number(ui) || 1), kind: arg('kind') || 'travel', naam: naam || '', tag: tag || '', status: arg('status') || '', rustig: vlag('rustig'), beweging: !vlag('rustig') }];
  }
  const png = arg('png');
  let kapot = 0;
  const uit = [];
  const br = await openBrowser();
  try {
  for (const s of lijst) {
    const run = await br.meet(s, { base: arg('base') || undefined, png: png ? path.join(png, naamVan(s) + (vlag('jpg') ? '.jpg' : '.png')) : null });
    const a = analyseer(run);
    kapot += a.fouten.length ? 1 : 0;
    const klein = a.gaps.filter((g) => ['logo/card', 'tagline/kick', 'logo/bar', 'card/bar', 'logo/status'].includes(g.paar)).map((g) => `${g.paar} ${g.gap}`).join(' | ');
    console.log(`${a.fouten.length ? 'FOUT' : 'ok  '} ${naamVan(s)} (stage ${a.lw ? Math.round(a.lw) + 'x' + Math.round(a.lh) : '?'})  ${klein}${a.fouten.length ? '\n     - ' + a.fouten.join('\n     - ') : ''}`);
    uit.push({ naam: naamVan(s), fouten: a.fouten, gaps: a.gaps, boxes: a.boxes });
  }
  } finally { await br.close(); }
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(uit, null, 1));
  console.log(`laadscherm_meet: ${lijst.length - kapot}/${lijst.length} scenario's zonder fouten`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
