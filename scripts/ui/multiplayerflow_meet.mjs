// Renderproef van de Samen-spelen-wizard (#1011): GEEN Electron en geen netwerk. Een kleine webserver geeft de echte game/js en CSS
// door aan een headless Chrome met een eigen, tijdelijk profiel (alleen die eigen PID wordt gestopt; het Chrome van de eigenaar blijft
// ongemoeid). De pagina bouwt het pauzemenu-vak na (stage met --mz, .pm-samen, .pm-samen-inner), mount de ECHTE lobbyui.js met nephooks en
// stuurt hem langs elke stap. Per stap en per venstermaat wordt gemeten: geen overlap tussen elementen, geen scrollbalk, geen afgekapte
// inhoud, tekstlengte (de korte regel hoogstens 70 tekens, geen alinea's) en dat de hoofdactie rechts in de voet staat.
//   node scripts/ui/multiplayerflow_meet.mjs            meten en keuren (exit 1 bij een overtreding; netjes overslaan zonder Chrome)
//   node scripts/ui/multiplayerflow_meet.mjs --shots    ook de PNG's voor docs/SAMEN-FLOW-UX-22-11.md schrijven (docs/beeld-22-11/samen-flow/)
//   node scripts/ui/multiplayerflow_meet.mjs --only=wie --json
// Maten: 1280x720 en 1920x1080, ui-schaal 1 en 1,5 (mz = min(h/1080, w/1920) * ui; de menustage is dan 1280x720 of 1920x1080 ontwerp-px).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GAME = path.join(ROOT, 'game');
const UIT = path.join(ROOT, 'docs/beeld-22-11/samen-flow');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const has = (k) => process.argv.includes(`--${k}`);
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

// stap = wizardstap (0 keuze, 1 wie, 2 kiezen, 3 verbinden); rol = mag scrollen binnen de inhoud (lijst, uitslag)
export const SCENES = [
  { id: 'keuze', stap: 0 }, { id: 'wie-gast', stap: 1 }, { id: 'wie-host', stap: 1 },
  { id: 'gast-code', stap: 2 }, { id: 'gast-code-ww', stap: 2 }, { id: 'gast-code-fout', stap: 2 }, { id: 'gast-lijst', stap: 2, rol: true },
  { id: 'gast-toestemming', stap: 2, query: 'consent=0' },
  { id: 'host-prive', stap: 2 }, { id: 'host-openbaar', stap: 2 }, { id: 'host-fout', stap: 2 },
  { id: 'verbinden', stap: 3 }, { id: 'verbinden-wacht', stap: 3 }, { id: 'verbinden-lang', stap: 3 },
  { id: 'host-wacht', stap: 3 }, { id: 'wachtkamer', stap: 3 }, { id: 'wachtkamer-openbaar', stap: 3 },
  { id: 'spelers-host', spelers: true }, { id: 'spelers-gast', spelers: true },
  { id: 'status-gast', stap: 0 }, { id: 'fout-vol', stap: 3 }, { id: 'verbroken', stap: 3 },
];
export const MATEN = [[1280, 720, 1.5], [1280, 720, 1], [1920, 1080, 1], [1920, 1080, 1.5]];
// de PNG's voor de docs (hoogstens 8): sleutel scene@maat
export const SHOTS = [['voor-gast', 'oud-gast-code', 1280, 720, 1.5], ['keuze', 'keuze', 1280, 720, 1.5], ['wie', 'wie-gast', 1280, 720, 1.5], ['kiezen-gast', 'gast-code', 1280, 720, 1.5],
  ['kiezen-host', 'host-openbaar', 1280, 720, 1.5], ['verbinden', 'verbinden-wacht', 1280, 720, 1.5], ['wachtkamer', 'wachtkamer', 1280, 720, 1.5], ['spelers', 'spelers-host', 1280, 720, 1.5]];

const PAGINA = String.raw`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Samen-flow meting</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#2a2d26}</style></head><body>
<script type="module">
const q = new URLSearchParams(location.search);
const scene = q.get('scene') || 'keuze', ui = Number(q.get('ui')) || 1, wizard = q.get('wizard') !== '0', consent = q.get('consent') !== '0';
const vw = innerWidth, vh = innerHeight;
// schone, tijdelijke opslag (eigen profiel); nooit de echte sleutels van de speler
localStorage.clear();
localStorage.setItem('gde-settings', JSON.stringify({ multiplayerConsentRemembered: consent, onlineMeedoen: true, onlineNaam: 'Sem', onlineKleur: '#5bd6a0' }));
// dezelfde volgorde als game/index.html; pausemenu.css laadt daar als laatste (pausemenu.js voegt het toe)
for (const f of ['fonts/fonts.css', 'js/menu.css', 'js/a11y.css', 'js/ds-tokens.css', 'js/ds-components.css', 'js/ds-keycap.css', 'js/ds-motion.css', 'js/ds-micro.css', 'js/ds-melding.css', 'js/ds-beweging.css', 'js/ds-menu-zeef.css', 'js/ds-schermen.css', 'js/samenspelen.css', 'js/onlineconsent.css', 'js/pausemenu.css']) {
  await new Promise((res) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/game/' + f; l.onload = l.onerror = res; document.head.appendChild(l); });
}
const mz = Math.max(0.5, Math.min(4, Math.min(vh / 1080, vw / 1920) * ui));
document.documentElement.style.setProperty('--mz-fit', mz.toFixed(3));
document.documentElement.style.setProperty('--ui', String(Math.max(1, ui)));
const tabs = (lijst, aan) => '<div class="m-tabs"><nav class="m-tablist ds-m-tabs" role="tablist">' + lijst.map(([id, t]) => '<button type="button" role="tab" class="m-tab" aria-selected="' + (id === aan) + '">' + t + '</button>').join('') + '</nav></div>';
document.body.innerHTML = '<div id="pause-menu" class="gm visible"><div class="pm-fold gm-stage"><section class="pm-sheet m-panel"><header class="pm-sheet-head m-head"><h1 class="m-h1">Spel</h1></header><div class="pm-sheet-body">'
  + '<section data-panel="spel" class="pm-panel pm-col pm-tabbed"><div class="pm-inner pm-settings">' + tabs([['o', 'Overzicht'], ['s', 'Samen spelen'], ['a', 'Opslaan & stoppen']], 's')
  + '<div data-of="spel" data-sub="samen" class="pm-samen pm-spelcoop">' + tabs([['s', 'Sessie'], ['p', 'Spelers']], 's') + '<div data-of="samen" data-sub="samen" class="pm-samen-inner" id="vak"></div><div data-of="samen" data-sub="spelers" class="pm-spelers pm-samen-spelers" id="spelers" hidden></div></div>'
  + '</div></section></div></section></div></div>';
const vak = document.getElementById('vak');
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const { mountLobby } = await import('/game/js/lobbyui.js');
const hooks = { startHost: () => ({ roster: { max: 8, spelers: [] }, vrijePlekken: true }), addGuest() {}, startClient() {}, setMax: (m) => m, kick() {}, canJoin: () => ({ ok: true }), joined() {}, startSpel() {}, disconnect() {}, onCode() {}, laatsteCode: '' };
const nepKamer = async () => ({ opened: new Promise(() => {}), cancel() {} }); // geen netwerk: het verbinden blijft hangen
const lobby = mountLobby(vak, hooks, { wizard, startGate: /wacht/.test(scene), spelNaam: 'Spel 1', joinRoom: nepKamer });
const klik = async (act) => { const b = vak.querySelector('[data-act="' + act + '"]'); if (!b) throw new Error('geen knop ' + act); b.click(); await tick(); };
const typ = async (klasse, tekst) => { const i = vak.querySelector('.' + klasse); if (!i) throw new Error('geen veld ' + klasse); i.value = tekst; i.dispatchEvent(new Event('input', { bubbles: true })); await tick(); };
const spelerKaarten = async (rol) => { // het tabblad Spelers (samenspelers.js, puur): tabel met detail, dezelfde HTML als coopspelersui.js, met de CSS van samenspelen.css
  const K = await import('/game/js/samenspelers.js');
  const rij = (slot, naam, kleur, vorm, o = {}) => ({ slot, naam, kleur, vorm, doet: 'loopt', verbinding: 'ok', niveau: 'goed', ms: 40, afstandTekst: slot === 1 ? '' : '120 m', richting: slot === 1 ? null : { pijl: '→', woord: 'oost' }, jij: false, passief: true, x: 10, y: 10, ...o });
  const rijen = [rij(0, 'Sem', '#4fb3ff', 'cirkel', { jij: rol === 'host', x: null }), rij(1, 'Iris', '#5bd6a0', 'ster', { jij: rol === 'gast' }), rij(2, 'Tijn', '#f2b134', 'plus', { verbinding: 'lag', niveau: 'matig', ms: 220 }), rij(3, 'Liv', '#ff9a62', 'hart', { verbinding: 'lost', niveau: 'weg', doet: 'weg' }), rij(4, 'Gijs', '#ff7ab8', 'maan', { groep: 'Taxi', passief: false })];
  document.querySelector('[data-sub="samen"].pm-samen-inner').hidden = true;
  const p = document.getElementById('spelers'); p.hidden = false;
  document.querySelectorAll('.pm-samen > .m-tabs .m-tab').forEach((b, i) => b.setAttribute('aria-selected', String(i === 1)));
  const sel = rijen.find((r) => !r.jij);
  p.innerHTML = K.aandachtHtml(K.aandachtRegels(rijen)) + '<div class="ss-md"><div class="ss-kol">' + K.tabelHtml(rijen, { sel: sel.slot }) + K.jijStrookHtml({ passief: true, kan: true, tekstUitleg: 'Op passief neem je geen schade van spelers.', roep: [{ soort: 'hier', tekst: 'Kom hier', toets: 'Z' }, { soort: 'help', tekst: 'Help', toets: 'X' }] }) + '</div>' + K.detailHtml(sel, { rol, muteStaat: () => 'gewoon', openerNaam: 'Sem' }) + '</div>';
};
const SPELERS = ['Sem', 'Iris', 'Tijn', 'Liv', 'Gijs', 'Huub', 'Roos'].map((naam, i) => ({ slot: i, naam, kleur: ['#4fb3ff', '#5bd6a0', '#f2b134', '#ff9a62', '#ff7ab8', '#b78cff', '#e86a6a'][i], vorm: ['cirkel', 'ster', 'plus', 'hart', 'maan', 'ruit', 'vierkant'][i], verbinding: 'ok', char: 'tammo' }));
const RIJEN = [['Zomeravond', 3, 8, 'a1b2c3d4'], ['Pannenkoeken', 1, 4, 'b2c3d4e5'], ['Late dienst', 8, 8, 'c3d4e5f6'], ['Fietsen in Grunn', 2, 6, 'd4e5f6a7']].map(([naam, spelers, max, id], i) => ({ id, naam, spelers, max, versie: '0.64.0', kan: spelers < max, anders: false, vol: spelers >= max, ouderdom: 5 + i * 3, niveau: 'normaal', room: '@' + id }));
const naarGastCode = async () => { await klik('kies-gast'); if (wizard) await klik('wie-verder'); };
const naarHostKiezen = async () => { await klik('kies-host'); if (wizard) await klik('wie-verder'); };
const verbindGast = async () => { await naarGastCode(); await typ('coop-input', 'K3J9D-8F2MN'); await klik('koppel'); await tick(80); };
const hostWacht = async () => { await naarHostKiezen(); lobby.event({ t: 'route', route: 'kamer' }); lobby.event({ t: 'code', code: 'K3J9D-8F2MN' }); lobby.event({ t: 'spelers', lijst: SPELERS.slice(0, 1), max: 8 }); await tick(); };
const SCENES = {
  'spelers-host': () => spelerKaarten('host'), 'spelers-gast': () => spelerKaarten('gast'),
  keuze: async () => {},
  'oud-gast-code': async () => { await klik('kies-gast'); lobby.event({ t: 'spelers', lijst: SPELERS, max: 8 }); },
  'wie-gast': async () => { await klik('kies-gast'); },
  'wie-host': async () => { await klik('kies-host'); },
  'gast-code': naarGastCode,
  'gast-code-ww': async () => { await naarGastCode(); await klik('ww-open'); await typ('coop-wachtwoord', 'geheim'); },
  'gast-code-fout': async () => { await naarGastCode(); await typ('coop-input', 'abc'); await klik('koppel'); },
  'gast-lijst': async () => { await naarGastCode(); lobby.event({ t: 'lijst-vraag' }); lobby.event({ t: 'lijst-data', lijst: RIJEN }); await tick(); },
  'gast-toestemming': async () => { await naarGastCode(); await typ('coop-input', 'K3J9D-8F2MN'); await klik('koppel'); },
  'host-prive': naarHostKiezen,
  'host-openbaar': async () => { await naarHostKiezen(); await klik('wijze-openbaar'); await typ('coop-sessienaam', 'Zomeravond'); const v = vak.querySelector('.coop-openbaar-vink'); v.checked = true; v.dispatchEvent(new Event('change', { bubbles: true })); await tick(); },
  'host-fout': async () => { await naarHostKiezen(); await klik('wijze-openbaar'); await typ('coop-sessienaam', 'Zomeravond'); await klik('host-open'); },
  verbinden: verbindGast,
  'verbinden-wacht': async () => { await verbindGast(); lobby.event({ t: 'verbind-tik', n: 3 }); await tick(); },
  'verbinden-lang': async () => { await verbindGast(); lobby.event({ t: 'verbind-tik', n: 6 }); await tick(); },
  'host-wacht': hostWacht,
  wachtkamer: async () => { await hostWacht(); lobby.event({ t: 'spelers', lijst: SPELERS, max: 8 }); await tick(); },
  'wachtkamer-openbaar': async () => { await hostWacht(); lobby.event({ t: 'spelers', lijst: SPELERS, max: 8 }); lobby.event({ t: 'openbaar-vraag' }); lobby.event({ t: 'openbaar-ja', naam: 'Zomeravond', id: 'a1b2c3d4' }); await tick(); },
  'status-gast': async () => { await verbindGast(); lobby.event({ t: 'status', status: 'ok', partner: { slot: 1 } }); lobby.event({ t: 'spelers', lijst: SPELERS.slice(0, 3), max: 8 }); await tick(); },
  'fout-vol': async () => { await verbindGast(); lobby.event({ t: 'status', status: 'geweigerd', reason: 'vol' }); await tick(); },
  verbroken: async () => { await verbindGast(); lobby.event({ t: 'status', status: 'ok', partner: { slot: 1 } }); lobby.event({ t: 'status', status: 'lost' }); await tick(); },
};
await (SCENES[scene] || (async () => { throw new Error('onbekende scene ' + scene); }))();
await tick(120);

// ---- meting
const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
const gesloten = (e) => { for (let d = e.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS' && !d.open) return !(e.tagName === 'SUMMARY' && e.parentElement === d); return false; };
const zichtbaar = (e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !gesloten(e); };
const snijdt = (a, b) => Math.min(a.r, b.r) - Math.max(a.x, b.x) > 1 && Math.min(a.b, b.b) - Math.max(a.y, b.y) > 1;
function overlap(lijst) {
  const uit = [];
  for (let i = 0; i < lijst.length; i++) for (let j = i + 1; j < lijst.length; j++) {
    const a = lijst[i], b = lijst[j];
    if (a.contains(b) || b.contains(a) || !zichtbaar(a) || !zichtbaar(b)) continue;
    if (snijdt(r(a), r(b))) uit.push((a.className || a.tagName) + ' x ' + (b.className || b.tagName));
  }
  return uit;
}
const sp = document.getElementById('spelers'), inner = scene.startsWith('spelers') ? sp : document.querySelector('.pm-samen-inner'), sw = scene.startsWith('spelers') ? null : vak.querySelector('.sw');
const scrollt = (e) => !!e && e.scrollHeight > e.clientHeight + 1;
const m = { scene, wizard, mz: Number(mz.toFixed(3)), stage: [Math.round(vw / mz), Math.round(vh / mz)], innerBox: r(inner), fouten: [] };
m.innerScroll = scrollt(inner);
if (sw) {
  const body = sw.querySelector('.sw-body'), voet = sw.querySelector('.sw-voet');
  m.stap = Number(sw.dataset.swStap);
  { const sb = sw.getBoundingClientRect().bottom; m.over = [...sw.querySelectorAll('*')].filter((e) => zichtbaar(e) && e.getBoundingClientRect().bottom > sb + 0.5).map((e) => (e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ':' + Math.round(e.getBoundingClientRect().bottom - sb)).slice(0, 6); }
  m.dims = [sw.scrollHeight, sw.clientHeight, inner.scrollHeight, inner.clientHeight, body.scrollHeight, body.clientHeight]; m.swScroll = scrollt(sw); m.bodyScroll = scrollt(body) && !body.classList.contains('sw-body--rol'); m.bodyRol = body.classList.contains('sw-body--rol');
  m.afgekapt = [...sw.querySelectorAll('*')].filter((e) => zichtbaar(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && !e.closest('.sw-body--rol') && !['INPUT'].includes(e.tagName)).map((e) => e.className || e.tagName).slice(0, 6);
  const boven = [...sw.children].filter((e) => !e.matches('.sw-info'));
  m.overlap = [...overlap([...sw.children]), ...overlap([...body.children]), ...overlap([...voet.querySelectorAll('.sw-knop')])];
  const ib = r(inner); m.buitenVak = [...sw.querySelectorAll('.sw-stappen, .sw-titel, .sw-body, .sw-voet, .sw-voet .sw-knop')].filter((e) => { const b = r(e); return b.x < ib.x - 1 || b.r > ib.r + 1 || b.y < ib.y - 1 || b.b > ib.b + 1; }).map((e) => e.className);
  const vb = r(voet), bb = r(body);
  m.voetOnder = vb.y >= bb.b - 1; // de voet staat onder de inhoud, niet erover
  const knoppen = [...voet.querySelectorAll('.sw-knop')].filter(zichtbaar), hoofd = voet.querySelector('[data-primary="1"]');
  m.hoofdRechts = !hoofd || knoppen.every((k) => r(k).r <= r(hoofd).r + 1);
  m.hoofdGeel = hoofd ? !hoofd.classList.contains('ds-z-knop--secundair') : null;
  m.hoofdToets = hoofd ? /enter|↵|⏎/i.test(hoofd.textContent) || !!hoofd.querySelector('.coop-toets') : null;
  m.focusHoofd = hoofd ? document.activeElement === hoofd : null;
  const uitleg = sw.querySelector('.sw-uitleg'); m.uitlegLen = uitleg ? uitleg.textContent.trim().length : 0;
  const kopie = sw.cloneNode(true); for (const d of kopie.querySelectorAll('details:not([open]) > :not(summary)')) d.remove();
  m.zichtbareTekens = kopie.textContent.replace(/\s+/g, ' ').trim().length;
  m.alineas = [...sw.querySelectorAll('p')].filter((p) => zichtbaar(p) && !p.closest('.sw-body--rol, .coop-lijst') && p.textContent.trim().length > 110).map((p) => p.textContent.trim().slice(0, 40));
  m.titel = sw.querySelector('.sw-titel').textContent;
  m.indicator = [...sw.querySelectorAll('.sw-stap')].map((e) => e.dataset.staat + ':' + e.textContent.trim());
  m.knoppen = [...voet.querySelectorAll('.sw-knop')].map((k) => k.textContent.trim());
  m.ip = /\b\d{1,3}(\.\d{1,3}){3}\b|GDE2-/i.test(kopie.textContent);
} else if (scene.startsWith('spelers')) {
  const kaarten = [...sp.querySelectorAll('.ss-tabel tbody tr')];
  m.spelers = {
    kaarten: kaarten.length, horizontaal: [...sp.querySelectorAll('*')].filter((e) => zichtbaar(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && e !== sp && !e.closest('.ss-tabel')).map((e) => e.className).slice(0, 5),
    overlap: [...overlap(kaarten)],
    kopTekens: 0,
    alineas: [...sp.querySelectorAll('p')].filter((p) => zichtbaar(p) && p.textContent.trim().length > 110).map((p) => p.textContent.trim().slice(0, 40)),
    eruit: sp.querySelectorAll('[data-eruit]').length, overdragen: sp.querySelectorAll('[data-geef]').length,
    eruitBijJij: !!sp.querySelector('.ss-detail[data-detail] [data-eruit], .ss-detail[data-detail] [data-geef]') && !!sp.querySelector('tr:has(.ss-jij)[aria-selected="true"]'),
    muteKnoppen: [...sp.querySelectorAll('[data-stand]')].map((b) => ({ tekst: b.textContent.trim(), titel: true, toets: 'x' })),
    ms: /\b\d+ ?ms\b/i.test(sp.textContent),
    scrollbalk: scrollt(sp), hoogte: sp.scrollHeight, zichtbaar: sp.clientHeight, ip: /\b\d{1,3}(\.\d{1,3}){3}\b|GDE2-/i.test(sp.textContent),
  };
} else {
  // de oude weergave (wizard=0): wat de eigenaar zag
  const knoppen = vak.querySelector('.coop-btns'), chips = vak.querySelector('.coop-spelers-chips');
  m.oud = { knoppenOverChips: !!(knoppen && chips && snijdt(r(knoppen), r(chips))), scrollt: scrollt(inner), hoogte: inner.scrollHeight, zichtbaar: inner.clientHeight };
}
window.__meting = m; window.__klaar = true;
</script></body></html>`;

// De CSS van het tabblad Spelers staat als sjabloon in coopspelersui.js (die laadt de hele game); hier wordt hij eruit gehaald en uitgewerkt.
function spelersCss() {
  const bron = fs.readFileSync(path.join(GAME, 'js/coopspelersui.js'), 'utf8');
  const a = bron.indexOf('const CSS = `') + 'const CSS = `'.length, b = bron.indexOf('`;', a);
  return new Function('return `' + bron.slice(a, b) + '`')();
}
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png' };
function server() {
  return http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/spelers.css') { res.writeHead(200, { 'content-type': TYPES['.css'], 'cache-control': 'no-store' }); res.end(spelersCss()); return; }
    if (u === '/mock.html') { res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' }); res.end(PAGINA); return; }
    const m = /^\/game\/(.*)$/.exec(u);
    const file = m ? path.join(GAME, m[1]) : null;
    if (!file || !file.startsWith(GAME)) { res.writeHead(404); res.end('niet gevonden'); return; }
    fs.readFile(file, (e, d) => {
      if (e) { res.writeHead(404); res.end('niet gevonden'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(d);
    });
  });
}

// Chrome sturen via het DevTools-protocol (geen puppeteer): één browser, één tabblad, per meting een nieuwe pagina.
async function startChrome() {
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'multiplayerflow-chrome-'));
  const kind = spawn(CHROME, ['--headless=new', `--user-data-dir=${profiel}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars=false', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const ws0 = await new Promise((res, rej) => {
    let buf = ''; const t = setTimeout(() => rej(new Error('Chrome start niet')), 20000);
    kind.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf); if (m) { clearTimeout(t); res(m[1]); } });
    kind.on('exit', () => rej(new Error('Chrome stopte')));
  });
  const poort = new URL(ws0).port;
  const doel = await (await fetch(`http://127.0.0.1:${poort}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(doel.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const open = new Map(); const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && open.has(m.id)) { open.get(m.id)(m); open.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled' && ['error'].includes(m.params.type)) logs.push('console: ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('uitzondering: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; open.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Runtime.enable'); await cmd('Page.enable');
  return {
    cmd, logs,
    async stop() { try { ws.close(); } catch { /* weg */ } kind.kill(); await wacht(400); try { fs.rmSync(profiel, { recursive: true, force: true }); } catch { /* Windows houdt het profiel soms nog even vast */ } },
  };
}

async function meet(chrome, poort, scene, [w, h, ui], extra = '', shotPad = null, heel = false) {
  chrome.logs.length = 0;
  await chrome.cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await chrome.cmd('Page.navigate', { url: `http://127.0.0.1:${poort}/mock.html?scene=${scene}&ui=${ui}${extra ? '&' + extra : ''}` });
  let m = null;
  for (let i = 0; i < 60 && !m; i++) { // hooguit 15 s
    await wacht(250);
    const r = await chrome.cmd('Runtime.evaluate', { expression: 'window.__klaar === true ? JSON.stringify(window.__meting) : null', returnByValue: true });
    const v = r.result && r.result.result && r.result.result.value;
    if (v) m = JSON.parse(v);
  }
  if (!m) return { scene, fouten: ['de pagina werd niet klaar: ' + (chrome.logs.join(' | ') || 'geen melding')], logs: chrome.logs.slice() };
  if (shotPad) {
    const clip = heel ? { x: 12, y: 12, w: w - 24, h: h - 24 } : m.innerBox;
    const shot = await chrome.cmd('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, clip.x - 12), y: Math.max(0, clip.y - 12), width: Math.min(w, clip.w + 24), height: Math.min(h, clip.h + 24), scale: 1 } });
    fs.mkdirSync(path.dirname(shotPad), { recursive: true });
    fs.writeFileSync(shotPad, Buffer.from(shot.result.data, 'base64'));
  }
  m.logs = chrome.logs.slice();
  return m;
}

// de regels: wat een overtreding is (per stap, per maat)
export function keur(m, sc) {
  const f = [...(m.fouten || [])];
  if (m.logs && m.logs.length) f.push('fouten in de console: ' + m.logs.slice(0, 2).join(' | '));
  if (m.spelers) { // het tabblad Spelers: kaartjes zonder overlap, geen afgekapte tekst, geen tekstmuur, de acties volgens de rol
    const s = m.spelers, host = m.scene === 'spelers-host';
    if (s.kaarten !== 5) f.push('verwacht 5 rijen, er staan ' + s.kaarten);
    if (s.overlap.length) f.push('overlap: ' + s.overlap.join('; '));
    if (s.horizontaal.length) f.push('afgekapt: ' + s.horizontaal.join(', '));
    if (s.kopTekens > 120) f.push('de kop heeft te veel tekst (' + s.kopTekens + ' tekens)');
    if (s.alineas.length) f.push('alinea\'s in beeld: ' + s.alineas.join(' | '));
    if (host && s.eruit < 1) f.push('wie het spel opende ziet Uit het spel zetten bij de gekozen speler');
    if (!host && (s.eruit || s.overdragen)) f.push('een gast ziet Eruit zetten of Overdragen');
    if (s.eruitBijJij) f.push('acties bij jezelf');
    if (s.muteKnoppen.length !== 3) f.push('Dempen en blokkeren zijn één segment met drie keuzes'); if (s.ms) f.push('milliseconden staan in beeld');
    if (s.ip) f.push('een IP-adres staat in beeld');
    return f;
  }
  if (!m.stap && m.stap !== 0) return f;
  if (m.innerScroll) f.push('het vak scrolt (scrollbalk)');
  if (m.swScroll) f.push('de wizard is hoger dan het vak ' + JSON.stringify(m.dims) + ' ' + (m.over || []).join(','));
  if (m.bodyScroll) f.push('de inhoud is afgekapt of scrolt');
  if (m.overlap && m.overlap.length) f.push('overlap: ' + m.overlap.join('; '));
  if (m.buitenVak && m.buitenVak.length) f.push('buiten het vak: ' + m.buitenVak.join(', '));
  if (m.afgekapt && m.afgekapt.length) f.push('afgekapte tekst: ' + m.afgekapt.join(', '));
  if (!m.voetOnder) f.push('de voet staat niet onder de inhoud');
  if (!m.hoofdRechts) f.push('de hoofdactie staat niet rechts');
  if (m.hoofdGeel === false) f.push('de hoofdactie is niet geel');
  if (m.uitlegLen > 70) f.push(`uitleg te lang (${m.uitlegLen} tekens, max 70)`);
  if (m.alineas && m.alineas.length) f.push('alinea\'s in beeld: ' + m.alineas.join(' | '));
  if (m.ip) f.push('een IP-adres of directe code staat in beeld');
  if (!m.indicator) return f;
  const wil = sc.stap === 0 ? 0 : 3;
  if (m.indicator.length !== wil) f.push(`stappenindicator: ${m.indicator.length} in plaats van ${wil}`);
  if (wil && !(m.indicator[sc.stap - 1] || '').startsWith('nu:')) f.push('de indicator wijst de verkeerde stap aan: ' + m.indicator.join(' '));
  if (sc.stap !== 0 && m.zichtbareTekens > 420 && !sc.rol) f.push(`te veel tekst in beeld (${m.zichtbareTekens} tekens)`);
  return f;
}

async function main() {
  if (!CHROME) { console.log('SKIP multiplayerflow_meet: geen Chrome of Edge gevonden (zet CHROME=<pad>)'); return 0; }
  const only = arg('only');
  const srv = server();
  await new Promise((r) => srv.listen(Number(arg('port')) || 0, '127.0.0.1', r));
  const poort = srv.address().port;
  let chrome;
  try { chrome = await startChrome(); } catch (e) { srv.close(); console.log('SKIP multiplayerflow_meet: Chrome startte niet (' + e.message + ')'); return 0; }
  let n = 0, fout = 0; const alle = [];
  try {
    for (const sc of SCENES) {
      if (only && !sc.id.includes(only)) continue;
      for (const maat of MATEN) {
        const m = await meet(chrome, poort, sc.id, maat, sc.query || '');
        const f = keur(m, sc); n++;
        if (sc.spelers && has('uitgebreid')) console.log('     ', JSON.stringify(m.spelers));
        alle.push({ scene: sc.id, maat: maat.join('x'), stap: m.stap, uitleg: m.uitlegLen, tekens: m.zichtbareTekens, fouten: f });
        if (f.length) { fout++; console.log(`FOUT ${sc.id} ${maat[0]}x${maat[1]} ui${maat[2]}: ${f.join(' | ')}`); }
        else if (has('uitgebreid')) console.log(`ok   ${sc.id} ${maat[0]}x${maat[1]} ui${maat[2]} stap ${m.stap} tekens ${m.zichtbareTekens} knoppen [${(m.knoppen || []).join(' | ')}]`);
      }
    }
    if (arg('png')) { // één beeld voor onderweg: --png=scene,breedte,hoogte,ui,uitvoerpad (hele venster)
      const [scene, w, h, ui, pad] = arg('png').split(',');
      const m = await meet(chrome, poort, scene, [Number(w), Number(h), Number(ui)], scene.startsWith('oud-') ? 'wizard=0' : '', pad, true);
      console.log('PNG', pad, JSON.stringify({ stap: m.stap, swScroll: m.swScroll, overlap: m.overlap, fouten: keur(m, { stap: m.stap }) }));
    }
    if (has('shots')) {
      const spelers = SHOTS.filter((s) => !only || s[0].includes(only));
      for (const [naam, scene, w, h, ui] of spelers) {
        const pad = path.join(UIT, `${naam}-${w}x${h}-ui${String(ui).replace('.', '')}.png`);
        await meet(chrome, poort, scene, [w, h, ui], scene.startsWith('oud-') ? 'wizard=0' : '', pad);
        console.log('PNG', path.relative(ROOT, pad));
      }
    }
    // het oude scherm, ter vergelijking (de overlap en de scrollbalk uit de melding van de eigenaar)
    const oud = await meet(chrome, poort, 'oud-gast-code', [1280, 720, 1.5], 'wizard=0');
    console.log('oud scherm (wizard uit): ' + JSON.stringify(oud.oud));
  } finally { await chrome.stop(); srv.close(); }
  if (has('json')) console.log(JSON.stringify(alle, null, 1));
  console.log(`multiplayerflow_meet: ${n} metingen (${SCENES.length} schermen x ${MATEN.length} maten), ${fout} met overtredingen`);
  return fout ? 1 : 0;
}

if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
}
