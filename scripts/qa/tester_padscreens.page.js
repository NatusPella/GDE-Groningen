// Page half van scripts/qa/tester_bugs.mjs --check=padscreens (#151): elk scherm met alleen een nep-controller.
// Per scherm: open het zoals een speler met het pad (de titelitems met D-pad omlaag en A, de pauzesecties met de pauzemenu-API),
// loop er met D-pad omlaag, rechts, omhoog en links doorheen (via de echte gamepad.js, dus met de ruimtelijke navigatie en
// de wrap-around; twee rondes, zodat ook de rail na een stap naar links wordt afgelopen) en meld welke zichtbare knoppen, links
// en velden nooit focus kregen. Het paneel en de rail van het pauzemenu worden apart geteld. Daarna: brengt B (Escape) je
// terug of sluit het scherm, en hoeveel B's zijn daarvoor nodig? A op een tekstveld: opent dat het schermtoetsenbord?
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const out = { schermen: [], fouten: [] };

const ORDER = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: ORDER.map(() => ({ pressed: false, touched: false, value: 0 })) };
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
const hold = (name, on = true) => { const b = pad.buttons[ORDER.indexOf(name)]; b.pressed = on; b.value = on ? 1 : 0; };
const tap = async (name, ms = 40) => { hold(name, true); await sleep(ms); hold(name, false); await sleep(45); };
const T0 = Date.now();
const EINDE = T0 + (((window.__tb || {}).maxS || 400) - 70) * 1000;
const SCHERM_MS = 14000;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="menuitem"]';
const shown = (e) => e.getClientRects().length > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).pointerEvents !== 'none';
const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.className || e.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' <' + e.tagName.toLowerCase() + '>';
const gezien = new Set();
const sleutel = (e) => label(e) + JSON.stringify(e.dataset || {});
document.addEventListener('focusin', (e) => gezien.add(sleutel(e.target)), true);
const hoofd = (sel) => document.querySelector(sel);
const vis = (sel) => { const e = hoofd(sel); return !!(e && shown(e)); };
const inRail = (e) => !!e.closest('.pm-rail');

async function loop(rootEl, naam, extra = {}) {
  gezien.clear();
  if (document.activeElement && rootEl.contains(document.activeElement)) gezien.add(sleutel(document.activeElement));
  const kand = () => [...rootEl.querySelectorAll(FOCUSABLE)].filter((e) => shown(e) && !e.closest('.pm-footer'));
  const n0 = kand().length;
  const tot = Math.min(Date.now() + SCHERM_MS, EINDE);
  let stappen = 0;
  // omlaag, rechts, omhoog en links tot er tien drukken lang niets nieuws meer focus kreeg; twee rondes
  for (let ronde = 0; ronde < 2; ronde++) {
    for (const dir of ['down', 'right', 'up', 'left']) {
      let stil = 0;
      for (let i = 0; i < n0 + 8 && stil < 10 && Date.now() < tot; i++) {
        const voor = gezien.size;
        await tap(dir); stappen++;
        if (document.activeElement && rootEl.contains(document.activeElement)) gezien.add(sleutel(document.activeElement));
        stil = gezien.size === voor ? stil + 1 : 0;
      }
    }
  }
  const alle = kand().filter((e) => !e.closest('[aria-hidden="true"]'));
  const mis = (lijst) => lijst.filter((e) => !gezien.has(sleutel(e))).map(label);
  const paneel = alle.filter((e) => !inRail(e)); const rail = alle.filter(inRail);
  const r = { naam, paneel: { n: paneel.length, onbereikbaar: mis(paneel) }, rail: { n: rail.length, onbereikbaar: mis(rail) }, stappen, tijdOp: Date.now() >= tot, ...extra };
  out.schermen.push(r);
  return r;
}

// ---- titelscherm: items kiezen met D-pad omlaag (het scherm houdt zelf bij welk item gekozen is)
const ss = document.getElementById('start-screen');
for (let i = 0; i < 60 && !(ss && ss.classList.contains('visible')); i++) await sleep(500);
await tap('down'); // maakt het pad actief
const items = () => [...ss.querySelectorAll('.ss-item')];
const gekozen = () => { const s = ss.querySelector('.ss-item.sel'); return s ? s.dataset.act : null; };
async function kies(act) {
  for (let i = 0; i < items().length + 1 && gekozen() !== act; i++) await tap('down', 40);
  return gekozen() === act;
}
{
  const volgorde = [];
  await kies(items()[0].dataset.act);
  for (let i = 0; i < items().length; i++) { volgorde.push(gekozen()); await tap('down'); }
  out.schermen.push({ naam: 'titel (D-pad omlaag door het menu)', items: items().map((b) => b.dataset.act), bereikt: volgorde, alleBereikt: items().every((b) => volgorde.includes(b.dataset.act)) });
}
const news = ss.querySelector('.ss-news');
async function titelItem(act, laag) {
  if (!(await kies(act))) { out.schermen.push({ naam: 'titel > ' + act, fout: 'item niet te kiezen met D-pad omlaag' }); return; }
  await tap('a'); await sleep(1100);
  if (act === 'news' || act === 'about') {
    const open = !news.hidden;
    const body = news.querySelector('.ss-news-body');
    const r = { naam: 'titel > ' + act, geopend: open, focus: document.activeElement === body };
    if (open) {
      const t0 = body.scrollTop;
      for (let i = 0; i < 6; i++) await tap('down');
      r.scrolltDoorDpad = body.scrollTop > t0 || body.scrollHeight <= body.clientHeight + 4;
      await tap('b'); await sleep(500);
      r.bSluit = news.hidden;
    }
    out.schermen.push(r);
    if (!news.hidden) { await tap('b'); await sleep(400); }
    return;
  }
  const open = laag ? vis(laag) : false;
  if (laag && open) {
    const r = await loop(hoofd(laag), 'titel > ' + act);
    await tap('b'); await sleep(700);
    r.bTerug = !vis(laag) && ss.classList.contains('visible');
  } else out.schermen.push({ naam: 'titel > ' + act, geopend: false });
  if (laag && vis(laag)) { await tap('b'); await sleep(400); }
}
await titelItem('samen', '#samenkeuze');
await titelItem('saves', '#saveslots');
await titelItem('news');
await titelItem('about');
// Instellingen vanaf de titel is het pauzemenu in "prestart"
if (await kies('settings')) {
  await tap('a'); await sleep(1200);
  const pmEl = document.getElementById('pause-menu');
  if (pmEl && shown(pmEl)) {
    const r = await loop(pmEl, 'titel > settings (prestart)');
    let b = 0;
    while (shown(pmEl) && b < 4) { await tap('b'); await sleep(500); b++; }
    r.bTotDicht = shown(pmEl) ? 'niet dicht na 4' : b;
  } else out.schermen.push({ naam: 'titel > settings (prestart)', geopend: false });
}

// ---- het spel starten (met A op Nieuw spel)
if (await kies('new')) { await tap('a'); await sleep(1500); if (!document.body.classList.contains('game-started')) await tap('a'); }
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) await sleep(500);
out.gestart = document.body.classList.contains('game-started');
await sleep(2500);

// ---- pauzemenu: elke sectie, elk subtabblad
const PM = await import('/js/pausemenu.js');
const SECTIES = ['overzicht', 'todo', 'map', 'telefoon', 'verhaal', 'spullen', 'garage', 'prestaties', 'fotos', 'samen', 'settings', 'controls', 'streken'];
const SUBS = { todo: ['verhaal', 'alles', 'dichtbij'], telefoon: ['contacten', 'berichten'], verhaal: ['personages', 'aanwijzingen'], settings: ['video', 'sound', 'camera', 'display', 'a11y', 'fouten'], controls: ['toetsen', 'knoppen', 'overzicht', 'hulp'] };
async function pauzeScherm(sectie, sub) {
  PM.openPauseMenu(sectie, sub ? { sub } : {});
  await sleep(900);
  const rootEl = document.getElementById('pause-menu');
  const naam = 'pauze > ' + sectie + (sub ? ' > ' + sub : '');
  if (!rootEl || !PM.isPauseMenuOpen()) { out.schermen.push({ naam, geopend: false }); return; }
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
    for (const sub of SUBS[s] || []) { if (Date.now() < EINDE) await pauzeScherm(s, sub); }
  } catch (e) { out.fouten.push(s + ': ' + e.message); try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch { /* weg */ } }
}

// ---- schermtoetsenbord: A op een tekstveld (de zoekbalk bij Besturing); het toetsenbord heeft een eigen cursor, geen focus
try {
  PM.openPauseMenu('controls', { sub: 'overzicht' }); await sleep(800);
  const zoek = document.querySelector('[data-controls-search]');
  if (zoek && shown(zoek)) {
    zoek.focus(); await sleep(200);
    await tap('a'); await sleep(600);
    const kb = hoofd('#padkeyboard');
    const r = { naam: 'schermtoetsenbord', geopend: !!kb };
    if (kb) {
      const knoppen = [...kb.querySelectorAll('button')];
      // typ een letter met A en kijk of hij in het veld komt; wis met X (delete)
      const voor = zoek.value;
      await tap('a'); await sleep(200);
      r.typtMetA = zoek.value !== voor;
      await tap('x'); await sleep(200);
      r.wistMetX = zoek.value === voor;
      r.toetsen = knoppen.length;
      await tap('b'); await sleep(500);
      r.bSluit = !hoofd('#padkeyboard');
    }
    out.schermen.push(r);
  } else out.fouten.push('zoekbalk niet gevonden');
} catch (e) { out.fouten.push('toetsenbord: ' + e.message); }
try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch { /* weg */ }
return JSON.stringify({ results: { padscreens: out } });
