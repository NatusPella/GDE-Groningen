// Page half van scripts/qa/tester_bugs.mjs --check=padscreens (#151): elk scherm met alleen een nep-controller.
// Per scherm: open het, loop er met D-pad omlaag, rechts, omhoog en links doorheen (via de echte gamepad.js, dus met de
// ruimtelijke navigatie en de wrap-around) en meld welke zichtbare knoppen, links en velden nooit focus kregen. Daarna: sluit
// B (Escape) het scherm, of brengt het je een stap terug? A op een tekstveld: opent dat het schermtoetsenbord?
// Titelschermen worden met A geopend, pauzesecties met openPauseMenu (de plek waar de speler ze met het pad vindt: de rail).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const out = { schermen: [], fouten: [] };

const ORDER = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: ORDER.map(() => ({ pressed: false, touched: false, value: 0 })) };
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
const hold = (name, on = true) => { const b = pad.buttons[ORDER.indexOf(name)]; b.pressed = on; b.value = on ? 1 : 0; };
const tap = async (name, ms = 50) => { hold(name, true); await sleep(ms); hold(name, false); await sleep(60); };
const T0 = Date.now();
const EINDE = T0 + (((window.__tb || {}).maxS || 400) - 70) * 1000;
const SCHERM_MS = 9000;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="menuitem"]';
const shown = (e) => e.getClientRects().length > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).pointerEvents !== 'none';
const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.className || e.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' <' + e.tagName.toLowerCase() + (e.dataset && e.dataset.tab ? ' ' + e.dataset.tab : '') + '>';

// activeElement-wissels bijhouden (ook een element dat alleen kort focus krijgt)
const gezien = new Set();
document.addEventListener('focusin', (e) => gezien.add(e.target), true);
const hoofd = (sel) => document.querySelector(sel);

async function loop(rootEl, naam, extra = {}) {
  gezien.clear();
  if (document.activeElement && rootEl.contains(document.activeElement)) gezien.add(document.activeElement);
  const kand = () => [...rootEl.querySelectorAll(FOCUSABLE)].filter(shown);
  const n0 = kand().length;
  const tot = Math.min(Date.now() + SCHERM_MS, EINDE);
  let stappen = 0;
  // omlaag en rechts tot er twaalf drukken lang niets nieuws meer focus kreeg; dan omhoog en links
  for (const dir of ['down', 'right', 'up', 'left']) {
    let stil = 0;
    for (let i = 0; i < n0 * 2 + 6 && stil < 12 && Date.now() < tot; i++) {
      const voor = gezien.size;
      await tap(dir); stappen++;
      if (document.activeElement && rootEl.contains(document.activeElement)) gezien.add(document.activeElement);
      stil = gezien.size === voor ? stil + 1 : 0;
    }
  }
  const alle = kand();
  const onbereikbaar = alle.filter((e) => !gezien.has(e) && !e.closest('[aria-hidden="true"]')).map(label);
  const r = { naam, kandidaten: alle.length, bereikt: alle.length - onbereikbaar.length, onbereikbaar, stappen, ...extra };
  out.schermen.push(r);
  return r;
}
const vis = (sel) => { const e = hoofd(sel); return !!(e && shown(e)); };

// ---- titelscherm
const ss = document.getElementById('start-screen');
for (let i = 0; i < 60 && !(ss && ss.classList.contains('visible')); i++) await sleep(500);
await tap('down'); // maakt het pad actief
const items = () => [...ss.querySelectorAll('.ss-item')];
await loop(ss.querySelector('.ss-menu') || ss, 'titel', { items: items().map((b) => b.dataset.act) });

// elk item met A openen (behalve nieuw spel, doorgaan, afsluiten) en met B terug
async function itemMetA(act, sel) {
  const it = items().find((b) => b.dataset.act === act);
  if (!it) { out.fouten.push('titel: geen item ' + act); return; }
  it.focus(); await tap('a'); await sleep(900);
  const rootEl = (sel && hoofd(sel)) || ss;
  const open = sel ? vis(sel) : true;
  const r = open ? await loop(rootEl, 'titel > ' + act) : { naam: 'titel > ' + act, geopend: false };
  out.schermen.push(...(open ? [] : [r]));
  await tap('b'); await sleep(700);
  const terug = ss.classList.contains('visible') && items().some((b) => shown(b)) && (!sel || !vis(sel));
  (out.schermen[out.schermen.length - 1] || {}).bTerug = terug;
}
await itemMetA('samen', '#samenkeuze');
await itemMetA('saves', '#saveslots');
await itemMetA('news');
await itemMetA('settings');
await itemMetA('about');

// ---- het spel starten (met A op Nieuw spel)
const nieuw = items().find((b) => b.dataset.act === 'new');
if (nieuw) { nieuw.focus(); await tap('a'); await sleep(1500); const ja = [...document.querySelectorAll('.ss-item')].find((b) => b.dataset.act === 'new'); if (ja && !document.body.classList.contains('game-started')) { await tap('a'); } }
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) await sleep(500);
out.gestart = document.body.classList.contains('game-started');
await sleep(2500);

// ---- pauzemenu: elke sectie, elk subtabblad
const PM = await import('/js/pausemenu.js');
const SECTIES = ['overzicht', 'todo', 'map', 'telefoon', 'verhaal', 'spullen', 'garage', 'prestaties', 'fotos', 'samen', 'settings', 'controls', 'streken'];
const SUBS = { todo: ['verhaal', 'alles', 'dichtbij'], telefoon: ['contacten', 'berichten'], verhaal: ['personages', 'aanwijzingen'], settings: ['video', 'sound', 'camera', 'display', 'a11y', 'fouten'], controls: ['toetsen', 'knoppen', 'overzicht', 'hulp'] };
const pm = () => document.getElementById('pause-menu');
async function pauzeScherm(sectie, sub) {
  PM.openPauseMenu(sectie, sub ? { sub } : {});
  await sleep(900);
  const rootEl = pm();
  const naam = 'pauze > ' + sectie + (sub ? ' > ' + sub : '');
  if (!rootEl || !PM.isPauseMenuOpen()) { out.schermen.push({ naam, geopend: false }); return; }
  // het blad zelf (het paneel van de sectie) en de rail apart: de rail bereik je met links
  const blad = rootEl.querySelector('.pm-sheet') || rootEl;
  const r = await loop(rootEl, naam);
  // B: terug (naar het overzicht) of dicht; tel hoeveel B's tot het pauzemenu dicht is
  let b = 0;
  while (PM.isPauseMenuOpen() && b < 4) { await tap('b'); await sleep(500); b++; }
  r.bTotDicht = PM.isPauseMenuOpen() ? 'niet dicht na 4' : b;
}
for (const s of SECTIES) {
  if (Date.now() > EINDE) { out.fouten.push('tijd op bij ' + s); break; }
  try {
    await pauzeScherm(s);
    for (const sub of SUBS[s] || []) await pauzeScherm(s, sub);
  } catch (e) { out.fouten.push(s + ': ' + e.message); try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch { /* weg */ } }
}

// ---- schermtoetsenbord: A op een tekstveld (de zoekbalk bij Besturing)
try {
  PM.openPauseMenu('controls', { sub: 'overzicht' }); await sleep(800);
  const zoek = document.querySelector('[data-controls-search]');
  if (zoek && shown(zoek)) {
    zoek.focus(); await sleep(200);
    await tap('a'); await sleep(600);
    const kb = [...document.querySelectorAll('body > div')].find((d) => /toetsenbord|Klaar/i.test(d.textContent) && d.querySelectorAll('button').length > 20);
    const r = { naam: 'schermtoetsenbord', geopend: !!kb };
    if (kb) {
      Object.assign(r, await loop(kb, 'schermtoetsenbord'));
      out.schermen.pop();
      await tap('b'); await sleep(500);
      r.bSluit = !document.body.contains(kb);
    }
    out.schermen.push(r);
  } else out.fouten.push('zoekbalk niet gevonden');
} catch (e) { out.fouten.push('toetsenbord: ' + e.message); }
try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch { /* weg */ }
return JSON.stringify({ results: { padscreens: out } });
