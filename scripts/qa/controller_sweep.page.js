// Page half of scripts/qa/controller_sweep.mjs (desktop --perf-script body; #985, QA-controller 20-11):
// een nagebootste gamepad (navigator.getGamepads) drukt knoppen en kantelt sticks, het spel leest hem via gamepad.js zoals een echte,
// en per scherm meten we wat een speler zonder muis zou merken: is er focus, bereiken D-pad en stick elk klikdoel, doet A een klik,
// brengt B je terug, wisselen de bumpers/triggers van tabblad, scrolt de rechterstick een lange lijst, staat er geen toetsenbordhint meer
// (alleen controllerknoppen) en is er maar één focusring. window.__cs = { schermen: [..], naam, familie }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const CS = window.__cs || {};
const fouten = [];
{
  const oe = console.error.bind(console);
  console.error = (...a) => { fouten.push({ soort: 'error', tekst: a.map(String).join(' ').slice(0, 240) }); oe(...a); };
  window.addEventListener('error', (e) => fouten.push({ soort: 'window-error', tekst: String(e.message).slice(0, 240) }));
  window.addEventListener('unhandledrejection', (e) => fouten.push({ soort: 'rejection', tekst: String(e.reason && e.reason.message || e.reason).slice(0, 240) }));
}
const tap = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code || k, bubbles: true })); } };
const imp = (f) => import('/js/' + f + '.js');

// ---------- de nagebootste controller (W3C-standaardmapping) ----------
const PADB = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const ID = { xbox: 'Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)', ps: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', switch: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)' };
const fake = { id: ID[CS.familie] || ID.xbox, index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], vibrationActuator: null, buttons: PADB.map(() => ({ pressed: false, value: 0, touched: false })) };
Object.defineProperty(navigator, 'getGamepads', { value: () => [fake, null, null, null], configurable: true });
const frames = (n) => new Promise((res) => { let i = 0; const t = setTimeout(res, 40 * n + 200); const f = () => { if (++i >= n) { clearTimeout(t); res(); } else requestAnimationFrame(f); }; requestAnimationFrame(f); });
async function druk(naam, vast = 3) {
  const b = fake.buttons[PADB.indexOf(naam)];
  b.pressed = true; b.value = 1; await frames(vast);
  b.pressed = false; b.value = 0; await frames(3);
}
async function kantel(as, v, ms) { fake.axes[as] = v; await sleep(ms); fake.axes[as] = 0; await frames(3); }

// ---------- hulpjes ----------
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'; // gamepad.js
const stijl = (el) => getComputedStyle(el);
const echtZichtbaar = (el) => { if (!el.getClientRects().length) return false; for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const s = stijl(a); if (s.display === 'none' || s.visibility === 'hidden' || a.hidden || a.inert) return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const label = (el) => { if (!el) return 'null'; if (el === document.body) return 'body'; const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + id + c + ' "' + (el.textContent || el.getAttribute('aria-label') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '"'; };
const klikbaar = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((e) => echtZichtbaar(e) && !e.closest('.t-btn, #touch-controls') && !e.matches('input[type="hidden"], .m-hint') && stijl(e).pointerEvents !== 'none');
const scrollerVan = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (a.scrollHeight > a.clientHeight + 4 && /auto|scroll/.test(stijl(a).overflowY)) return a; return null; };
const handtekening = (root) => { const sel = [...root.querySelectorAll('[aria-selected="true"], .on, .active, .sel, [aria-current]')].filter(echtZichtbaar).slice(0, 12).map(label).join('|'); return sel + '#' + (root.innerText || '').length + '#' + (root.innerText || '').slice(0, 200); };

// A-klikken vangen we af zodat een test geen echte actie uitvoert (opslaan, wissen, kopen)
let klikken = [];
window.addEventListener('click', (e) => { if (e.isTrusted === false && CS.vangKlik) { klikken.push(label(e.target)); e.preventDefault(); e.stopImmediatePropagation(); } }, true);

const uit = { formaat: CS.naam, familie: CS.familie || 'xbox', schermen: {}, fouten: [], overgeslagen: [], html: {} };
const gelogd = (naam, r) => { uit.schermen[naam] = r; console.log('[capture] ctrl-' + naam); };
const wachtOp = async (f, n = 120) => { for (let i = 0; i < n; i++) { if (f()) return true; await sleep(250); } return false; };

// loopt met één richting door de focus tot hij terugkomt waar hij al was; geeft de bezochte elementen en de vallen
async function loop(dir, bezocht, max = 70) {
  const lijst = []; let body = 0;
  for (let i = 0; i < max; i++) {
    await druk(dir);
    const a = document.activeElement;
    if (!a || a === document.body) { body++; if (body > 2) break; continue; }
    if (lijst.includes(a)) break;
    lijst.push(a); bezocht.add(a);
  }
  return { n: lijst.length, body, namen: lijst.map(label) };
}

// ---------- het meten van één scherm ----------
async function meetScherm(naam, root, opties = {}) {
  const r = { naam, doelen: 0, bereikt: 0, onbereikbaar: [], geenStartFocus: false, focusVal: 0, dubbeleRing: 0, aKlik: null, bTerug: null, bumper: null, trigger: null, scroll: null, kbHint: [], woordHint: [], opm: [] };
  if (!root || !echtZichtbaar(root)) { r.opm.push('scherm niet zichtbaar'); gelogd(naam, r); return; }
  const alle = klikbaar(root);
  r.doelen = alle.length;
  const bezocht = new Set();
  // hint: toetsenbordhints die blijven staan terwijl een controller de laatste invoer was
  r.padActief = document.documentElement.classList.contains('pad-active');
  for (const el of root.querySelectorAll('[data-gk], kbd, .hud-key')) if (echtZichtbaar(el) && !el.classList.contains('is-pad') && !el.classList.contains('pad-none') && (el.textContent || '').trim()) r.kbHint.push(label(el));
  r.kbHint = [...new Set(r.kbHint)].slice(0, 10);
  const tekstNodes = []; const wl = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = wl.nextNode());) { const t = n.textContent; if (/\b(druk op|toets|klik op|klik om)\b/i.test(t) && n.parentElement && echtZichtbaar(n.parentElement) && !n.parentElement.closest('[data-gk], kbd, .hud-key, [data-g-raw]')) tekstNodes.push(t.trim().slice(0, 60)); }
  r.woordHint = [...new Set(tekstNodes)].slice(0, 8);
  // focus bij openen
  let a = document.activeElement;
  r.startFocus = a && root.contains(a) ? label(a) : null;
  if (!a || a === document.body || !root.contains(a)) {
    r.geenStartFocus = true;
    await druk('down'); a = document.activeElement;
    if (!a || a === document.body || !root.contains(a)) { r.opm.push('ook na D-pad omlaag geen focus in het scherm'); }
  }
  // de kaart: L3 gaat van het doek naar de knoppen op de kaart (padmapnav.js)
  if (opties.l3) { await druk('ls'); a = document.activeElement; r.l3Focus = label(a); if (a && a !== document.body) bezocht.add(a); }
  // loop in alle vier de richtingen
  if (a && a !== document.body) bezocht.add(a);
  const dubbel = () => { const ring = klikbaar(root).filter((e) => { if (e === document.activeElement) return false; const s = stijl(e); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== 'rgba(0, 0, 0, 0)'); }); return ring.length; };
  const lopen = [];
  for (const d of ['down', 'right', 'up', 'left']) { const t = await loop(d, bezocht); lopen.push(d + ':' + t.n); (r.spoor = r.spoor || {})[d] = t.namen.slice(0, 80); r.focusVal += t.body ? 1 : 0; r.dubbeleRing = Math.max(r.dubbeleRing, dubbel()); }
  // wat de lopen niet bereikt hebben: vanaf de drie dichtstbijzijnde bereikte elementen elke richting proberen (D-pad zoals een speler)
  let rest = alle.filter((e) => !bezocht.has(e) && echtZichtbaar(e));
  const DIRS = ['down', 'up', 'right', 'left'];
  for (let ronde = 0; ronde < 3 && rest.length; ronde++) {
    let voortgang = false;
    for (const e of rest.slice(0, opties.max || 14)) {
      if (bezocht.has(e)) continue;
      const rb = e.getBoundingClientRect();
      const buren = [...bezocht].filter((o) => o.isConnected && echtZichtbaar(o)).map((o) => { const ro = o.getBoundingClientRect(); return { o, d: Math.hypot(ro.x - rb.x, ro.y - rb.y) }; }).sort((x, y) => x.d - y.d).slice(0, 3);
      for (const { o } of buren) {
        let gevonden = false;
        for (const d of DIRS) {
          o.focus({ preventScroll: true }); await druk(d);
          const nu = document.activeElement;
          if (nu && nu !== o && root.contains(nu)) { if (!bezocht.has(nu)) { bezocht.add(nu); voortgang = true; } }
          if (nu === e) { gevonden = true; break; }
        }
        if (gevonden) break;
      }
    }
    rest = alle.filter((e) => !bezocht.has(e) && echtZichtbaar(e));
    if (!voortgang) break;
  }
  r.bereikt = alle.length - rest.length;
  r.onbereikbaar = rest.slice(0, 14).map(label);
  r.lopen = lopen.join(' ');
  // A: klikt de gefocuste knop (de klik wordt afgevangen)
  const proef = alle.find((e) => e.matches('button, [role="tab"], a') && !/verwijder|wis|reset|stop|afsluit|opslaan/i.test(e.textContent || '')) || alle[0];
  if (proef) {
    proef.focus({ preventScroll: true }); klikken = []; CS.vangKlik = true;
    await druk('a'); CS.vangKlik = false;
    r.aKlik = klikken.length > 0 ? 'ok' : (document.activeElement !== proef || !proef.isConnected ? 'ok (eigen afhandeling)' : 'GEEN KLIK op ' + label(proef));
  }
  // bumpers en triggers: wisselt er iets? (alleen waar het scherm tabbladen heeft; geen wissel is een melding, geen fout)
  const voor = handtekening(root);
  await druk('rt'); const naRt = handtekening(root); await druk('lt');
  await druk('rb'); const naRb = handtekening(root); await druk('lb');
  r.bumper = { rt: naRt !== voor, rb: naRb !== voor };
  // rechterstick: scrolt een lange lijst
  const act = document.activeElement && root.contains(document.activeElement) ? document.activeElement : root;
  const sc = scrollerVan(act) || [...root.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(stijl(e).overflowY) && echtZichtbaar(e));
  if (sc) {
    const t0 = sc.scrollTop; if (!sc.contains(document.activeElement)) { const f = sc.querySelector(FOCUSABLE); if (f) f.focus({ preventScroll: true }); }
    await kantel(3, 1, 500); const t1 = sc.scrollTop; await kantel(3, -1, 500);
    r.scroll = { el: label(sc), bewogen: Math.abs(t1 - t0) > 2, van: Math.round(t0), naar: Math.round(t1) };
  }
  // B: terug of sluiten
  const bVoor = handtekening(root); const open = echtZichtbaar(root);
  await druk('b'); await sleep(350);
  const nu = echtZichtbaar(root); const bNa = nu ? handtekening(root) : '';
  r.bTerug = !nu ? 'sluit' : bNa !== bVoor ? 'gaat terug' : 'GEEN REACTIE';
  if (opties.naB) await opties.naB(r);
  gelogd(naam, r);
}

// ---------- spel starten ----------
const start = document.querySelector('#start-screen');
await wachtOp(() => document.body.classList.contains('game-started') || (window.__debug && window.__debug.world), 400);
for (let i = 0; i < 400 && !document.body.classList.contains('game-started'); i++) {
  const b = document.querySelector('#start-screen button');
  if (i % 20 === 5 && start && b) { try { const nieuw = [...start.querySelectorAll('button')].find((x) => /nieuw spel/i.test(x.textContent)); (nieuw || b).click(); } catch { /* */ } }
  await sleep(500);
}
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tap(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
await sleep(4000);
await druk('start'); await sleep(300); // de controller wordt actief; Start opent het pauzemenu, we sluiten het weer
try { PM.closePauseMenu(); } catch { /* */ }
await sleep(500);
uit.html = { padActive: document.documentElement.classList.contains('pad-active'), dataPad: document.documentElement.dataset.pad, padCtx: document.documentElement.dataset.padCtx };
const wil = (n) => !CS.schermen || !CS.schermen.length || CS.schermen.includes(n);
const pm = () => document.querySelector('#pause-menu');

const MENU = [
  ['pauze-spel', ['spel', { sub: 'overzicht' }]], ['spel-rail-acties', ['spel', { sub: 'acties' }]], ['samen-hub', ['samen']],
  ['te-doen', ['todo']], ['kaart', ['map']], ['prestaties', ['prestaties']], ['instellingen', ['settings']],
  ['spullen', ['spullen']], ['garage', ['garage']], ['verhaal-telefoon', ['telefoon']], ['loopbaan', ['loopbaan']], ['besturing', ['controls']],
  ['veroverd', ['veroverd']], ['foto-s', ['fotos']],
];
for (const [naam, args] of MENU) {
  if (!wil(naam)) continue;
  try {
    PM.openPauseMenu(...args); await sleep(1600);
    // de onderdelen (subtabs) van dit scherm: elk een eigen meting, geopend via openPauseMenu({ sub })
    const subs = pm() ? [...pm().querySelectorAll('[role="tab"][data-subtab]')].filter(echtZichtbaar).map((b) => b.dataset.subtab) : [];
    await meetScherm(naam, pm(), naam === 'kaart' ? { l3: true } : {});
    if (!CS.zonderSubs) for (const id of [...new Set(subs)].slice(0, 10)) {
      try { PM.closePauseMenu(); } catch { /* */ } await sleep(400);
      PM.openPauseMenu(args[0], { sub: id }); await sleep(1300);
        await meetScherm(naam + '/' + id, pm());
    }
  } catch (e) { uit.overgeslagen.push(naam + ': ' + e.message); }
  try { PM.closePauseMenu(); } catch { /* */ }
  await sleep(600);
}

// kaart: stickpan, zoom met triggers, markering met A
if (wil('kaart-bediening')) {
  try {
    const MV = await imp('mapview');
    PM.openPauseMenu('map'); await sleep(1800);
    const cv = document.querySelector('#pause-menu canvas');
    const tekening = () => { try { const c = document.createElement('canvas'); c.width = 48; c.height = 32; c.getContext('2d').drawImage(cv, 0, 0, 48, 32); return c.toDataURL().length + ':' + c.toDataURL().slice(-60); } catch (e) { return 'x'; } };
    const kb = {};
    if (cv) { cv.focus({ preventScroll: true }); }
    const z0 = MV.getMapViewStats() && MV.getMapViewStats().zoom;
    await druk('rt', 6); await sleep(300); const z1 = MV.getMapViewStats() && MV.getMapViewStats().zoom;
    await druk('lt', 6); await sleep(300); const z2 = MV.getMapViewStats() && MV.getMapViewStats().zoom;
    kb.zoomRt = z1 > z0; kb.zoomLt = z2 < z1; kb.zoom = [z0, z1, z2];
    const t0 = tekening(); await kantel(0, 1, 700); await sleep(300); const t1 = tekening();
    kb.stickPan = t0 !== t1;
    // kaartmarkering: A op de kaart zelf (kruisdraad)
    if (cv) cv.focus({ preventScroll: true }); await sleep(100);
    const kaart0 = document.querySelectorAll('#pause-menu .mapview-card').length;
    await druk('a'); await sleep(500);
    const kaart1 = [...document.querySelectorAll('#pause-menu .mapview-card')].filter(echtZichtbaar).length;
    kb.aOpKaart = { kaartVoor: kaart0, kaartNa: kaart1, focus: label(document.activeElement) };
    // de kaartkaart bedienen: gaat de focus naar zijn knoppen en bereikt D-pad ze?
    const kk = [...document.querySelectorAll('#pause-menu .mapview-card button')].filter(echtZichtbaar);
    kb.kaartKnoppen = kk.map(label);
    if (kk.length) { const bez = new Set(); for (let i = 0; i < 6; i++) { bez.add(label(document.activeElement)); await druk('down'); } kb.kaartKnoppenBereikt = [...bez]; }
    // zoekveld met A: schermtoetsenbord?
    const zk = document.querySelector('#pause-menu input[type="text"], #pause-menu input[type="search"], #pause-menu input:not([type])');
    if (zk && echtZichtbaar(zk)) { zk.focus({ preventScroll: true }); await druk('a'); await sleep(400); kb.zoekToetsenbord = !!document.querySelector('.pk-val, .pad-kb, #pad-keyboard'); await druk('b'); await sleep(300); }
    uit.schermen['kaart-bediening'] = kb; console.log('[capture] ctrl-kaart-bediening');
  } catch (e) { uit.overgeslagen.push('kaart-bediening: ' + e.message); }
  try { PM.closePauseMenu(); } catch { /* */ }
  await sleep(500);
}

// tekstvelden: naam invoeren op het opslagscherm (A opent het schermtoetsenbord)
if (wil('tekstveld')) {
  try {
    const SS = await imp('saveslotsui');
    PM.openPauseMenu('spel', { sub: 'overzicht' }); await sleep(1200);
    const knop = document.querySelector('#pause-menu [data-action="saves"]');
    if (knop) { knop.click(); await sleep(1000); }
    const hern = [...document.querySelectorAll('button')].find((b) => /hernoem/i.test(b.textContent + (b.getAttribute('aria-label') || '')) && echtZichtbaar(b));
    if (hern) { hern.click(); await sleep(600); }
    const veld = [...document.querySelectorAll('input[type="text"], input:not([type]), input[type="search"], textarea')].find(echtZichtbaar);
    const r = { veld: veld ? label(veld) : null };
    if (veld) {
      veld.focus({ preventScroll: true }); await druk('a'); await sleep(500);
      r.toetsenbord = !!document.querySelector('.pk-val'); r.waarde0 = veld.value;
      if (r.toetsenbord) { await druk('a'); await sleep(200); r.waardeNaA = veld.value; await druk('y'); await druk('b'); await sleep(300); r.toetsenbordWeg = !document.querySelector('.pk-val') || !echtZichtbaar(document.querySelector('.pk-val')); }
    } else r.opm = 'geen tekstveld op het opslagscherm (misschien alleen na "Nieuw spel")';
    uit.schermen.tekstveld = r; console.log('[capture] ctrl-tekstveld');
  } catch (e) { uit.overgeslagen.push('tekstveld: ' + e.message); }
  for (let i = 0; i < 3; i++) { try { await druk('b'); await sleep(250); } catch { /* */ } }
  try { PM.closePauseMenu(); } catch { /* */ }
  await sleep(500);
}

// winkel
if (wil('winkel')) {
  try {
    const SH = await imp('shops'); const SU = await imp('shopui');
    const s = SH.getShopsForRender()[0];
    w.money = 5000;
    for (let i = 0; i < 12 && !SU.isShopOpen(); i++) { if (p.inVehicle) p.exitVehicle(map, w); p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; await sleep(250); await druk('y'); await sleep(700); }
    if (SU.isShopOpen()) { await sleep(900); await meetScherm('winkel', document.querySelector('#shop-menu')); try { SU.closeShopMenu({ save: false }); } catch { /* */ } await sleep(500); } else uit.overgeslagen.push('winkel: ging niet open met Y');
  } catch (e) { uit.overgeslagen.push('winkel: ' + e.message); }
}
uit.overgeslagen.push('dialoog met personage: geen vaste ingang zonder NPC (niet gemeten)');
clearInterval(skipper);
uit.fouten = fouten;
return JSON.stringify(uit);
