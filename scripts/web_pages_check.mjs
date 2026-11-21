// Controle van de webbuild op een sub-pad zoals GitHub Pages (#57): start headless Chrome tegen
// een lopende `node web/serve.mjs <poort> --prefix=/GDE-Groningen/`, wacht op het hoofdmenu en de
// wereld, maakt screenshots en verzamelt console-fouten, mislukte requests en transfergrootte.
// Raakt geen echte opslag (eigen wegwerpprofiel) en publiceert niets.
//   node scripts/web_pages_check.mjs [--url=http://localhost:8791/GDE-Groningen/] [--out=docs/beeld-21-11/pages]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const URL0 = arg('url', 'http://localhost:8791/GDE-Groningen/');
const OUT = path.resolve(arg('out', 'docs/beeld-21-11/pages'));
const CHROME = arg('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const FLAGGED = URL0.includes('?'); // met een ?-schakelaar (bv. noattract) vervalt de eerste-startroute
const PORT = +arg('cdp', '9333');
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-pages-'));
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--headless=new', '--window-size=1280,720',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=document-user-activation-required',
  '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pend = new Map(); const handlers = [];
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
try {
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(200); } }
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } else handlers.forEach((h) => h(d)); };
  const report = { url: URL0, console: [], failed: [], requests: 0, external: {}, bytes: 0, byType: {}, status: {}, marks: {} };
  const reqs = new Map();
  handlers.push((d) => {
    const p = d.params;
    if (d.method === 'Network.requestWillBeSent') { reqs.set(p.requestId, { url: p.request.url, t: p.timestamp }); const h = new URL(p.request.url).host; if (!/^(localhost|127\.0\.0\.1)(:|$)/.test(h) && !/^(data|blob):/.test(p.request.url)) report.external[h] = (report.external[h] || 0) + 1; }
    else if (d.method === 'Network.responseReceived') { const r = reqs.get(p.requestId); if (r) { r.status = p.response.status; report.status[p.response.status] = (report.status[p.response.status] || 0) + 1; if (p.response.status >= 400) report.failed.push(`${p.response.status} ${p.response.url}`); } }
    else if (d.method === 'Network.loadingFinished') { const r = reqs.get(p.requestId); report.requests++; report.bytes += p.encodedDataLength; if (r) { const e = (r.url.split('?')[0].match(/\.(\w+)$/) || [, 'html'])[1]; report.byType[e] = (report.byType[e] || 0) + p.encodedDataLength; } }
    else if (d.method === 'Network.loadingFailed') report.failed.push(`FAILED ${reqs.get(p.requestId)?.url} ${p.errorText}${p.corsErrorStatus ? ' CORS' : ''}`);
    else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(p.type)) report.console.push(`${p.type}: ${p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`);
    else if (d.method === 'Runtime.exceptionThrown') report.console.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text).slice(0, 400));
    else if (d.method === 'Log.entryAdded' && ['error', 'warning'].includes(p.entry.level)) report.console.push(`log ${p.entry.level}: ${p.entry.text} ${p.entry.url || ''}`.slice(0, 300));
  });
  for (const m of ['Network.enable', 'Runtime.enable', 'Log.enable', 'Page.enable']) await send(m);
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result.value; };
  const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); console.log('screenshot', name); };
  const key = async (k, code, vk) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk }); };
  const waitFor = async (expr, ms, label) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return Date.now() - t; await sleep(250); } console.log('timeout waiting for', label); return -1; };

  const t0 = Date.now();
  await send('Page.navigate', { url: URL0 });
  // eerste start: de verplichte naamvraag voor Samen spelen (zonder vinkje: er gaat niets online)
  const vraag = await waitFor(`!!document.querySelector('input[placeholder="Je naam"]')`, FLAGGED ? 1500 : 180000, 'naamvraag');
  report.marks.nameQuestionMs = vraag < 0 ? null : Date.now() - t0;
  await sleep(1500);
  await shot('0-naamvraag.png');
  await ev(`(()=>{const i=document.querySelector('input[placeholder="Je naam"]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'Proefspeler');i.dispatchEvent(new Event('input',{bubbles:true}));const c=document.querySelector('.os-consent-vink');if(c&&!c.checked)c.click();document.querySelector('[data-doorgaan]').click();})()`);
  // na de naamvraag speelt de openingsfilm (eerste start): screenshot, dan Spatie ingedrukt houden om over te slaan
  await sleep(6000);
  await shot('1-intro.png');
  report.marks.introSkippable = await ev(`/over te slaan/.test(document.body.innerText)`);
  const MENU = `(()=>{const m=document.querySelector('#start-screen .ss-menu');const s=document.getElementById('start-screen');return !!m&&m.children.length>0&&s&&getComputedStyle(s).display!=='none'&&getComputedStyle(s).visibility!=='hidden'&&+getComputedStyle(s).opacity>0.9&&!document.body.innerText.includes('over te slaan')})()`;
  let menu = -1;
  const tSkip = Date.now();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  while (Date.now() - tSkip < (FLAGGED ? 1 : 150000)) { // Spatie vasthouden (met herhaling) tot het menu er is
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, autoRepeat: true });
    if (await ev(MENU)) { menu = 1; break; }
    await sleep(300);
  }
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  report.marks.menuMs = menu < 0 ? null : Date.now() - t0;
  report.marks.menuBytes = report.bytes;
  await sleep(2500);
  await shot('2-menu.png');
  report.marks.loadMarks = await ev('JSON.stringify(window.__loadMarks||{})');
  report.marks.menuItems = await ev(`[...document.querySelectorAll('#start-screen .ss-menu > *')].map(e=>e.textContent.trim()).join(' | ')`);
  report.marks.webFlags = await ev(`JSON.stringify({desktop: !!window.gdeDesktop, sw: 'serviceWorker' in navigator, secure: isSecureContext, ls: (()=>{try{localStorage.setItem('x','1');localStorage.removeItem('x');return true}catch{return false}})(), rtc: typeof RTCPeerConnection, ver: document.querySelector('.ss-ver')?.textContent})`);

  // naar de wereld: eerste menu-item (Nieuw spel of Doorgaan) met Enter
  await ev(`document.querySelector('#start-screen .ss-menu > *')?.focus()`);
  await key('Enter', 'Enter', 13);
  const t1 = Date.now();
  const inGame = await waitFor(`(()=>{const s=document.getElementById('start-screen');return !s||getComputedStyle(s).display==='none'||s.classList.contains('hidden')})()`, 120000, 'wereld');
  report.marks.startToWorldMs = inGame < 0 ? null : Date.now() - t1;
  await sleep(8000);
  await shot('3-wereld.png');
  report.marks.debug = await ev(`(()=>{const d=window.__debug;return d?JSON.stringify({p:d.player&&[d.player.x,d.player.z].map(Math.round)}):'geen __debug'})()`);
  await key('m', 'KeyM', 77);
  await sleep(3000);
  await shot('4-kaart.png');
  await sleep(2000);
  report.marks.totalMs = Date.now() - t0;
  report.marks.swState = await ev(`navigator.serviceWorker?.getRegistrations().then(r=>r.map(x=>x.active?.state||'none').join(','))`);
  fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ ...report, console: report.console.slice(0, 30), failed: report.failed.slice(0, 30) }, null, 1));
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  await sleep(500);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
process.exit(0);
