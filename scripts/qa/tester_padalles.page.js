// Page half van scripts/qa/tester_bugs.mjs --check=padalles (#151): schermen, voertuigen, minigames en Samen spelen met alleen een
// nep-controller (navigator.getGamepads) tegen het echte spel. Zoekt dode einden: focus die nergens heen kan of niet terug kan,
// knoppen waar A niets zichtbaars mee doet, een minigame of voertuig waar je met het pad niet uit komt.
// Elke sectie draait los (eigen try/catch en tijdsbudget); na maxS-30 s komt het deelresultaat terug.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const T0 = Date.now();
const EINDE = T0 + (((window.__tb || {}).maxS || 600) - 40) * 1000;
const out = { secties: {}, fouten: [], consoleFouten: [] };
const origErr = console.error.bind(console);
console.error = (...a) => { out.consoleFouten.push(a.map(String).join(' ').slice(0, 200)); origErr(...a); };
window.addEventListener('error', (e) => out.consoleFouten.push('error: ' + (e.message || '').slice(0, 200)));
window.addEventListener('unhandledrejection', (e) => out.consoleFouten.push('rejection: ' + String(e.reason).slice(0, 200)));

const ORDER = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const nieuwPad = (index, id = 'Xbox 360 Controller (XInput STANDARD GAMEPAD)') => ({ id, index, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: ORDER.map(() => ({ pressed: false, touched: false, value: 0 })) });
const pad = nieuwPad(0);
const pads = [pad];
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads });
const holdP = (p, name, on = true) => { const b = p.buttons[ORDER.indexOf(name)]; b.pressed = on; b.value = on ? 1 : 0; };
const hold = (name, on = true) => holdP(pad, name, on);
const stick = (lx, ly, rx = 0, ry = 0) => { pad.axes = [lx, ly, rx, ry]; };
const frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
const tap = async (name, ms = 60) => { hold(name, true); await frames(4); await sleep(ms); hold(name, false); await frames(2); await sleep(60); };
const ctxNu = () => document.documentElement.dataset.padCtx;
const shot = async (naam) => { await sleep(500); console.log('[capture] ' + naam); await sleep(700); };
const pos = () => { const p = w.player; return [+(p.x ?? 0).toFixed(2), +(p.y ?? 0).toFixed(2)]; };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="menuitem"]';
const shown = (e) => e.getClientRects().length > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).pointerEvents !== 'none';
const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.className || e.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' <' + e.tagName.toLowerCase() + '>';
const sleutel = (e) => label(e) + JSON.stringify(e.dataset || {});
const gezien = new Set();
document.addEventListener('focusin', (e) => gezien.add(sleutel(e.target)), true);

async function sectie(naam, ms, fn) {
  if (Date.now() > EINDE) { out.secties[naam] = { overgeslagen: 'tijd op' }; return; }
  const r = {};
  out.secties[naam] = r;
  const tot = Math.min(Date.now() + ms, EINDE);
  const limiet = sleep(Math.max(1000, tot - Date.now())).then(() => 'tijdslimiet');
  const errs0 = out.consoleFouten.length;
  try { if (typeof herstel === 'function') await herstel(); } catch { /* weg */ }
  try { const x = await Promise.race([fn(r, tot).then(() => 'klaar'), limiet]); if (x === 'tijdslimiet') r.tijdslimiet = true; }
  catch (e) { r.fout = String(e && e.stack || e).slice(0, 400); }
  if (out.consoleFouten.length > errs0) r.consoleFouten = out.consoleFouten.slice(errs0, errs0 + 5);
}

// loop door een scherm met D-pad en stick: wat kreeg nooit focus, en kan de focus terug naar het begin?
async function loop(rootEl, tot, extra = {}) {
  gezien.clear();
  const kand = () => [...rootEl.querySelectorAll(FOCUSABLE)].filter((e) => shown(e) && !e.closest('.pm-footer') && !e.closest('[aria-hidden="true"]'));
  const n0 = kand().length;
  const eerste = document.activeElement && rootEl.contains(document.activeElement) ? sleutel(document.activeElement) : null;
  if (eerste) gezien.add(eerste);
  let stappen = 0;
  for (let ronde = 0; ronde < 2; ronde++) {
    for (const dir of ['down', 'right', 'up', 'left']) {
      let stil = 0;
      for (let i = 0; i < n0 + 8 && stil < 8 && Date.now() < tot; i++) {
        const voor = gezien.size;
        await tap(dir, 30); stappen++;
        if (document.activeElement && rootEl.contains(document.activeElement)) gezien.add(sleutel(document.activeElement));
        stil = gezien.size === voor ? stil + 1 : 0;
      }
    }
  }
  // terug: met omhoog en links moet je weer op een eerder gezien element kunnen komen (focus zit niet vast)
  const na = document.activeElement ? sleutel(document.activeElement) : null;
  await tap('up'); await tap('left');
  const terugBewogen = (document.activeElement ? sleutel(document.activeElement) : null) !== na || n0 <= 1;
  const alle = kand();
  return { n: alle.length, onbereikbaar: alle.filter((e) => !gezien.has(sleutel(e))).map(label), terugBewogen, stappen, ...extra };
}

// A op elke knop: doet er iets zichtbaars? (snapshot van de pagina voor en na)
const SKIP = /afsluit|hoofdmenu|verwijder|wis|herstel|opslaan|opgeslagen|laad|nieuw spel|stop|opnieuw|annuleer|ja\b|nee\b|cheat|alles|afleveren/i;
const snapshot = () => document.body.innerHTML.length + '|' + (document.activeElement ? sleutel(document.activeElement) : '') + '|' + document.body.className + '|' + document.documentElement.className + '|' + !!w.paused + '|' + (w.money | 0);
async function actieTest(rootEl, tot, heropen) {
  const knoppen = [...rootEl.querySelectorAll('button:not([disabled]), [role="button"]')].filter((e) => shown(e) && !e.closest('.pm-footer') && !e.closest('.pm-rail') && !SKIP.test(label(e)));
  const geenActie = []; let n = 0;
  for (const k of knoppen.slice(0, 25)) {
    if (Date.now() > tot) break;
    if (!document.body.contains(k) || !shown(k)) { await heropen(); continue; }
    k.focus(); await sleep(120);
    const voor = snapshot();
    await tap('a', 80); await sleep(350);
    n++;
    if (snapshot() === voor) {
      // ook met een muisklik niets? dan is het geen pad-probleem (een kaart die alleen informeert)
      if (document.body.contains(k)) { const v2 = snapshot(); k.click(); await sleep(350); geenActie.push(label(k) + (snapshot() === v2 ? ' [ook muisklik: niets]' : ' [PAD-ONLY: muisklik doet wel iets]')); }
      else geenActie.push(label(k));
    }
    // een A-druk kan een keuzeblad of dialoog openen: met B terug, en als het pauzemenu dicht is weer open
    if (document.querySelector('#padkeyboard')) await tap('b');
    await heropen();
  }
  return { geprobeerd: n, geenActie };
}

// ============ het spel starten (Alleen spelen, met A) ============
const ss = document.getElementById('start-screen');
await sleep(500);
await tap('down');
const opSolo = () => { const sel = ss && ss.querySelector('.ss-item.sel'); return !!sel && sel.dataset.act === 'solo'; };
let laatsteA = 0;
for (let i = 0; i < 400 && !document.body.classList.contains('game-started'); i++) {
  if (ss && ss.classList.contains('visible') && Date.now() - laatsteA > 20000) {
    laatsteA = Date.now();
    for (let k = 0; k < 8 && !opSolo(); k++) await tap(k < 4 ? 'up' : 'down');
    if (!opSolo()) { await sleep(1000); continue; }
    await tap('a'); await sleep(1500);
    if (!document.body.classList.contains('game-started') && ss.classList.contains('visible') && opSolo()) await tap('a');
  }
  await sleep(1000);
}
const cineAan = () => !!document.querySelector('#cine.active') || !!w.cameraOverride || w.uiPaused;
for (let t = 0; t < 40 && !cineAan(); t++) await sleep(500);
for (let k = 0; k < 12 && cineAan(); k++) { hold('a', true); await sleep(4500); hold('a', false); await sleep(1500); }
out.gestart = document.body.classList.contains('game-started');
await sleep(1500);

const PM = await import('/js/pausemenu.js');
const pauzeOpen = () => PM.isPauseMenuOpen();
const sluitPauze = async () => { for (let b = 0; b < 5 && pauzeOpen(); b++) { await tap('b'); await sleep(400); } if (pauzeOpen()) PM.closePauseMenu(); };
const herstel = async () => {
  try { const SU = await import('/js/shopui.js'); if (SU.isShopOpen()) SU.closeShopMenu({ save: false }); } catch { /* weg */ }
  try { const TD = await import('/js/traindrive.js'); if (w.trainDriving) TD.quitTrainDrive(w); } catch { /* weg */ }
  try { const AC = await import('/js/activities.js'); AC.quitActivity(w); } catch { /* weg */ }
  await sluitPauze();
  if (document.querySelector('#padkeyboard')) await tap('b');
  const p = w.player;
  if (p.inVehicle) { try { p.exitVehicle(w.map, w); } catch { /* weg */ } }
  stick(0, 0); for (const k of ORDER) hold(k, false);
  await sleep(300);
};
const teleport = (x, y) => { const p = w.player; if (p.inVehicle) return; p.x = x; p.y = y; p.vx = 0; p.vy = 0; };

// ============ pauzemenu: Loopbaan, Spelers, Overzicht (missie stoppen) ============
for (const [id, extraSub] of [['loopbaan'], ['spelers']]) {
  await sectie('pauze > ' + id, 70000, async (r, tot) => {
    PM.openPauseMenu(id); await sleep(1000);
    const rootEl = document.getElementById('pause-menu');
    if (!pauzeOpen()) { r.geopend = false; return; }
    r.geopend = true;
    await shot('pauze-' + id);
    Object.assign(r, await loop(rootEl, tot - 4000));
    let b = 0; while (pauzeOpen() && b < 5) { await tap('b'); await sleep(450); b++; }
    r.bTotDicht = pauzeOpen() ? 'niet dicht na 5' : b;
    if (pauzeOpen()) PM.closePauseMenu();
  });
}

await sectie('missie stoppen (bevestiging)', 150000, async (r, tot) => {
  const S = window.__story;
  const actief = () => !!(w.safetyActions && w.safetyActions.missionActive());
  r.actiefBegin = actief();
  if (!actief() && S) {
    try { const cur = S.current && S.current(); r.huidig = cur; if (cur && cur.id) S.jump(cur.id); } catch (e) { r.jumpFout = String(e).slice(0, 120); }
    await sleep(2500);
    if (!actief()) { try { S.teleport(); } catch { /* weg */ } await sleep(800); await tap('y'); await sleep(3000); }
    for (let k = 0; k < 8 && (cineAan() || w.uiPaused); k++) { hold('a', true); await sleep(3000); hold('a', false); await sleep(800); }
  }
  r.actief = actief();
  if (!r.actief) { r.opmerking = 'geen missie aan de praat te krijgen; bevestiging niet getest'; return; }
  PM.openPauseMenu('overzicht'); await sleep(1000);
  const rootEl = document.getElementById('pause-menu');
  const stopBtn = () => rootEl.querySelector('[data-action="mission-stop"]');
  const box = () => rootEl.querySelector('[data-stop-confirm]');
  r.knopZichtbaar = !!(stopBtn() && shown(stopBtn()));
  if (!r.knopZichtbaar) return;
  // 1. is de knop met D-pad en stick te bereiken? (de loop meet focus per knop)
  const l = await loop(rootEl, Date.now() + 70000);
  r.knopBereikbaarMetDpad = !l.onbereikbaar.some((x) => /missie stoppen/i.test(x));
  r.onbereikbaarOverzicht = l.onbereikbaar;
  // 2. A op de knop opent de vraag met de focus op Ja? (focus() zet de focus; A is Enter)
  stopBtn().focus(); await sleep(200);
  await tap('a'); await sleep(600);
  r.vraagOpen = !!(box() && !box().hidden);
  await shot('missie-stoppen-vraag');
  r.focusOpJa = !!(document.activeElement && document.activeElement.dataset.action === 'mission-stop-go');
  // 3. van Ja naar Nee met D-pad links/rechts, dan A: vraag dicht en focus terug op de knop
  const nee = rootEl.querySelector('[data-action="mission-stop-no"]');
  for (let i = 0; i < 4 && document.activeElement !== nee; i++) await tap(i % 2 ? 'left' : 'right', 30);
  r.neeBereikbaarMetDpad = document.activeElement === nee;
  if (nee) { if (!r.neeBereikbaarMetDpad) nee.focus(); await tap('a'); await sleep(500); }
  r.vraagDichtNaNee = !(box() && !box().hidden);
  r.focusTerugOpKnop = document.activeElement === stopBtn();
  // 4. B bij een open vraag: wat gebeurt er (de vraag sluiten of het menu)?
  stopBtn().focus(); await tap('a'); await sleep(400);
  await tap('b'); await sleep(600);
  r.bBijVraag = { pauzeNogOpen: pauzeOpen(), vraagOpen: !!(box() && !box().hidden) };
});

await sectie('rail: Spel opslaan en Afsluiten', 90000, async (r, tot) => {
  PM.openPauseMenu('overzicht'); await sleep(1000);
  const rootEl = document.getElementById('pause-menu');
  const acts = () => [...rootEl.querySelectorAll('.pm-rail-acts button, .pm-rail-foot button')].filter(shown);
  r.knoppen = acts().map((b) => b.dataset.action + ':' + Math.round(b.getBoundingClientRect().top) + ',' + Math.round(b.getBoundingClientRect().left));
  r.vensterHoogte = innerHeight;
  const rail = rootEl.querySelector('.pm-rail');
  r.railScrollt = rail ? rail.scrollHeight > rail.clientHeight + 2 : null;
  r.railOnderkant = rail ? Math.round(rail.getBoundingClientRect().bottom) : null;
  const laatste = acts().slice(-1)[0];
  r.laatsteKnopOnderkant = laatste ? Math.round(laatste.getBoundingClientRect().bottom) : null;
  const pad = [];
  const noteer = () => { const e = document.activeElement; pad.push(e && e.dataset && e.dataset.action ? e.dataset.action : e ? label(e) : '-'); };
  // vanaf de laatste railrij (Cheats) omlaag, links, rechts en omhoog: waar komt de focus?
  const rij = [...rootEl.querySelectorAll('.pm-rail .ra')].filter(shown).slice(-1)[0];
  if (rij) rij.focus(); await sleep(200); noteer();
  for (const d of ['down', 'down', 'down', 'down', 'left', 'right', 'down', 'down', 'left', 'up', 'up']) { await tap(d, 30); noteer(); }
  r.focusPad = pad.join(' > ');
  r.save = pad.includes('save'); r.exit = pad.includes('exit'); r.menu = pad.includes('menu'); r.saves = pad.includes('saves');
  await sluitPauze();
});

// ============ kaart ============
await sectie('kaart', 30000, async (r, tot) => {
  await sluitPauze();
  await tap('view'); for (let i = 0; i < 12 && !(PM.isPauseMenuOpen()); i++) await sleep(250);
  r.geopend = pauzeOpen();
  r.ctx = ctxNu();
  const ret = document.querySelector('.map-pad-reticle');
  r.reticleZichtbaar = !!(ret && getComputedStyle(ret).display !== 'none');
  await shot('kaart-pad');
  const doel0 = window.__goal ? JSON.stringify(window.__goal.get()) : null;
  const rectV = ret ? ret.getBoundingClientRect() : null;
  stick(0.9, 0.0); await sleep(700); stick(0, 0); await sleep(200);
  r.stickBeweegtHetBeeld = true; // de kaart pant mee; gemeten via beeld hieronder
  await shot('kaart-na-stick');
  await tap('a'); await sleep(600);
  const doel1 = window.__goal ? JSON.stringify(window.__goal.get()) : null;
  r.doelGezetMetA = doel0 !== null ? doel1 !== doel0 : 'onbekend (geen __goal)';
  for (const k of ['rb', 'lb', 'rt', 'lt']) { await tap(k); }
  r.zoomKnoppenGeenFout = true;
  let bk = 0; while (pauzeOpen() && bk < 3) { await tap('b'); await sleep(500); bk++; }
  r.bSluit = !pauzeOpen(); r.bTotDicht = bk;
  await sluitPauze();
});

// ============ winkel ============
await sectie('winkel', 90000, async (r, tot) => {
  const SH = await import('/js/shops.js');
  const SU = await import('/js/shopui.js');
  const lijst = (SH.getShopsForRender ? SH.getShopsForRender() : []) || [];
  r.winkels = lijst.length;
  const s = ['super', 'kleding', 'snack', 'wapens', 'fietsen'].map((t) => lijst.find((x) => x.type === t && Number.isFinite(x.x))).find(Boolean) || lijst.find((x) => Number.isFinite(x.x));
  if (!s) { r.opmerking = 'geen winkel gevonden'; return; }
  r.winkel = s.type + ' ' + s.name;
  teleport(s.x + 1.0, s.y + 1.0); await sleep(4000);
  await tap('y', 150); await sleep(1500);
  r.geopend = SU.isShopOpen();
  r.ctx = ctxNu();
  if (!r.geopend) { r.opmerking = 'Y bij de winkel opende hem niet (afstand, streaming of een andere hint)'; return; }
  await shot('winkel-pad');
  const paneel = document.querySelector('.sm-panel');
  Object.assign(r, await loop(paneel ? paneel.parentElement : document.body, tot - 8000));
  let b = 0; while (SU.isShopOpen() && b < 4) { await tap('b'); await sleep(450); b++; }
  r.bTotDicht = SU.isShopOpen() ? 'niet dicht na 4' : b;
});

// ============ knoppen met A: doet elke knop iets? ============
for (const sec of ['overzicht', 'todo', 'spullen', 'garage', 'prestaties', 'fotos', 'samen', 'loopbaan', 'telefoon']) {
  await sectie('actie > ' + sec, 30000, async (r, tot) => {
    const open = async () => { if (!pauzeOpen() || PM.pauseMenuTab() !== sec) { PM.openPauseMenu(sec); await sleep(700); } };
    await open();
    const rootEl = document.getElementById('pause-menu');
    Object.assign(r, await actieTest(rootEl.querySelector('.pm-panel:not([hidden])') || rootEl, tot, open));
    await sluitPauze();
  });
}

// ============ voertuigen ============
const OV = await import('/js/ownedvehicles.js');
async function voertuigTest(r, tot, { naam, id, zoek, direct }) {
  await sluitPauze();
  const p = w.player;
  if (p.inVehicle) { await tap('y'); await sleep(900); }
  let v = null;
  if (zoek) v = (w.vehicles || []).find((x) => x && Number.isFinite(x.x) && !x.wrecked && !x.driver && zoek(x));
  if (!v && id) {
    let res = OV.deliverOwnedVehicle(w, id, { here: true });
    // boot: naast een jachthaven; heli en bus hebben ruimte nodig: een paar plekken proberen
    const plekken = [];
    if (/boot|heli|bus/.test(naam)) {
      if (naam === 'boot') { try { const m = (await (await fetch('/marinas.json')).json()).marinas[0]; for (const dx of [4, 8, 12, 20, -4, -8]) plekken.push([m.x + dx, m.y]); } catch { /* weg */ } }
      else for (const [dx, dy] of [[60, 0], [0, 60], [-60, 0], [0, -60], [120, 40]]) plekken.push([p.x + dx, p.y + dy]);
    }
    for (const [px, py] of plekken) { if (res && res.ok) break; teleport(px, py); await sleep(2500); res = OV.deliverOwnedVehicle(w, id, { here: true }); }
    r.levering = res && res.text;
    await sleep(800);
    v = (w.vehicles || []).filter((x) => x && Number.isFinite(x.x) && !x.driver && !x.wrecked && Math.hypot(x.x - p.x, x.y - p.y) < 25)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  }
  if (!v) { r.opmerking = 'geen voertuig gevonden of geleverd'; return; }
  r.voertuig = { x: +v.x.toFixed(1), y: +v.y.toFixed(1), bike: !!v.isBike, scooter: !!v.isScooter, boat: !!v.isBoat, heli: !!v.isHeli, bus: !!v.isBus };
  if (direct) { p.enterVehicle(v, w); }
  else { p.x = v.x + 2.2; p.y = v.y; p.vx = 0; p.vy = 0; await sleep(900); await tap('y', 120); }
  await sleep(1200);
  r.ingestapt = !!p.inVehicle;
  r.ctxIn = ctxNu();
  if (!p.inVehicle) return;
  await shot('voertuig-' + naam);
  const q0 = pos();
  stick(0, 0); hold('rt'); await sleep(2200);
  r.snelheidMetGas = +(Math.abs(p.inVehicle ? p.inVehicle.speed || 0 : 0)).toFixed(1);
  stick(1, -0.3); await sleep(900); stick(0, 0);
  r.afstandMetGas = +Math.hypot(pos()[0] - q0[0], pos()[1] - q0[1]).toFixed(1);
  hold('rt', false);
  r.hoogte = +((p.inVehicle && (p.inVehicle.z || p.inVehicle.alt || 0)) || 0).toFixed(1);
  hold('lt'); await sleep(1500); hold('lt', false);
  r.snelheidNaRem = +(p.inVehicle ? p.inVehicle.speed || 0 : 0).toFixed(1);
  for (const k of ['x', 'b', 'lb', 'rb', 'a']) { await tap(k, 100); }
  // pauze midden in de rit en terug
  await tap('start', 120); for (let i = 0; i < 10 && !pauzeOpen(); i++) await sleep(250);
  r.pauzeInVoertuig = pauzeOpen();
  await tap('b'); for (let i = 0; i < 10 && pauzeOpen(); i++) await sleep(250);
  r.pauzeTerug = !pauzeOpen();
  // laten uitrollen (zonder gas of rem) en bij een heli landen (LT/B is dalen); pas dan Y
  if (p.inVehicle && p.inVehicle.isHeli) { hold('lt'); await sleep(7000); hold('lt', false); }
  for (let i = 0; i < 14 && p.inVehicle && Math.abs(p.inVehicle.speed || 0) > 0.6; i++) await sleep(500);
  await tap('y', 120); await sleep(1200);
  r.uitgestapt = !p.inVehicle;
  r.ctxUit = ctxNu();
  if (p.inVehicle) { try { p.exitVehicle(w.map, w); } catch { /* weg */ } r.uitgestaptMetForce = true; }
}
const VOERTUIGEN = [
  { naam: 'auto', id: 'mug' }, { naam: 'fiets', id: 'stadsfiets', direct: true }, { naam: 'scooter', id: 'brommer', direct: true }, { naam: 'bus', id: 'stadsbus' },
  { naam: 'boot', id: 'speedboot', direct: true }, { naam: 'heli', id: 'wiekenwubbo', direct: true },
];
for (const vt of VOERTUIGEN) await sectie('voertuig > ' + vt.naam, 40000, (r, tot) => voertuigTest(r, tot, vt));

await sectie('voertuig > trein', 150000, async (r) => {
  await sluitPauze();
  const RW = await import('/js/railway.js');
  const trs = RW.getTrains ? RW.getTrains() : [];
  r.treinen = trs.length;
  let t = null;
  for (let i = 0; i < 120 && !t; i++) { t = (RW.getTrains() || []).find((x) => (x.state === 'dwell' || x.state === 'parked') && x.cars && x.cars[0] && !(x.route && x.route.stops && x.route.stops[x.target] && x.route.stops[x.target].offmap)); if (!t) await sleep(1000); }
  if (!t) { r.opmerking = 'geen stilstaande trein gevonden; ctx train alleen met gamepad_live_test bewezen'; return; }
  const c = t.cars[0];
  teleport(c.x + 2.5, c.y); await sleep(1500);
  await tap('y', 150); await sleep(1200);
  r.instappen = !!w.trainDriving;
  r.ctx = ctxNu();
  if (!r.instappen) { r.opmerking = 'Y bij de trein stapte niet in (afstand tot de cabine?)'; return; }
  await shot('trein-pad');
  hold('rt'); await sleep(2500); hold('rt', false);
  r.snelheid = +(w.trainDriving.v || 0).toFixed(1);
  hold('lt'); await sleep(4500); hold('lt', false);
  await tap('x', 100);
  await tap('b', 100);
  r.uitstappenKanNiet = !!w.trainDriving && (w.trainDriving.v || 0) >= 1;
  for (let i = 0; i < 4 && w.trainDriving; i++) { await tap('y', 150); await sleep(900); hold('lt'); await sleep(1500); hold('lt', false); }
  r.uitgestapt = !w.trainDriving;
});

// ============ minigames ============
const ACT = window.__activities;
const HOOKS = { carbid: '__carbid', kermis: '__kermis', discgolf: '__discgolf', pitchputt: '__pitchputt', skatepark: '__skatepark', kartbaan: '__kartbaan', regatta: '__regatta', padel: '__padel' };
const actIds = ACT ? [...ACT.list().filter((a) => !['geheimen', 'drift', 'wandeling'].includes(a.id) && a.spots > 0).map((a) => a.id), 'padel'].filter((v, i, l) => l.indexOf(v) === i) : [];
out.activiteiten = ACT ? ACT.list().map((a) => a.id + ':' + a.spots) : [];
for (const id of actIds) {
  await sectie('minigame > ' + id, 45000, async (r, tot) => {
    const a = id === 'padel' ? { active: () => !!(window.__padel && window.__padel.state && window.__padel.state()), spots: () => [], prompt: () => null, quit: () => window.__padel && window.__padel.quit && window.__padel.quit() } : ACT.get(id);
    const spot = a.spots()[0];
    const p = w.player;
    if (spot && Number.isFinite(spot.x)) { teleport(spot.x + 1.5, spot.y); await sleep(3500); }
    r.prompt = !!(a.prompt && a.prompt(w));
    await tap('y', 150); await sleep(1800);
    r.gestartMetY = !!(a.active && a.active());
    if (!r.gestartMetY && HOOKS[id] && window[HOOKS[id]] && window[HOOKS[id]].start) {
      try { await window[HOOKS[id]].start(); } catch (e) { r.hookFout = String(e).slice(0, 100); }
      await sleep(2500);
      r.gestartViaHook = !!(a.active && a.active());
    }
    if (!(a.active && a.active())) { r.opmerking = 'niet gestart (Y noch debug-hook)'; return; }
    r.ctx = ctxNu();
    const st = () => { try { const h = window[HOOKS[id]]; return h && h.state ? JSON.stringify(h.state()).slice(0, 80) : null; } catch { return null; } };
    r.staatBegin = st();
    await shot('minigame-' + id);
    stick(0, -1); await sleep(500); stick(0, 0);
    stick(1, 0, 1, 0); await sleep(300); stick(0, 0, 0, 0);
    for (const k of ['a', 'x', 'y', 'lb', 'rb']) await tap(k, 100);
    hold('rt'); await sleep(300); hold('rt', false);
    r.staatNa = st();
    r.nogActief = !!a.active();
    // B moet de minigame stoppen; anders Start (pauze) en daar uit
    const CTX = await import('/js/controls.js');
    const kaart = CTX.PAD_MAPS[ctxNu()] || {};
    const stopSlot = id === 'hoogvlieger' ? 'y' : (Object.keys(kaart).find((k) => kaart[k] === 'backspace') || 'b');
    r.stopSlot = stopSlot;
    await tap(stopSlot, 120); for (let i = 0; i < 12 && a.active(); i++) await sleep(250);
    r.stopMetB = !a.active();
    if (a.active()) {
      await tap('start', 120); await sleep(800);
      r.pauzeInMinigame = pauzeOpen();
      await sluitPauze();
      try { a.quit(w); } catch { /* weg */ }
      r.opmerking = 'B stopt deze minigame niet; geforceerd gestopt';
    }
    await sleep(600);
    r.ctxNa = ctxNu();
  });
}

// ============ Samen spelen: meerdere controllers ============
await sectie('samen: meerdere controllers', 30000, async (r) => {
  await sluitPauze();
  const GP = await import('/js/gamepad.js');
  const coopVoor = w.coop; w.coop = coopVoor || {}; // zoals in een sessie: speler 1 blijft bij zijn pad
  try {
  r.pad1Index = GP.activePadIndex();
  const pad2 = nieuwPad(1, 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'); const pad3 = nieuwPad(2, 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)');
  pads.push(pad2, pad3);
  window.dispatchEvent(new Event('gamepadconnected'));
  // speler 2 en 3 drukken en bewegen; speler 1 blijft bij zijn pad (sticky)
  holdP(pad2, 'a'); pad2.axes = [1, 0, 0, 0]; await sleep(600); holdP(pad2, 'a', false); pad2.axes = [0, 0, 0, 0];
  holdP(pad3, 'b'); await sleep(400); holdP(pad3, 'b', false);
  const p0 = pos();
  r.padNaDrukken = GP.activePadIndex();
  stick(0, -1); await sleep(900); stick(0, 0);
  r.pad1BeweegtSpeler = Math.hypot(pos()[0] - p0[0], pos()[1] - p0[1]) > 0.3;
  r.padFamilie = GP.padState().family;
  // pad 1 eruit: wie neemt over?
  pads[0] = null; window.dispatchEvent(new Event('gamepaddisconnected')); await sleep(800);
  r.naLosPad1 = GP.activePadIndex();
  holdP(pad2, 'x'); await sleep(300); holdP(pad2, 'x', false);
  r.naPad2Drukt = GP.activePadIndex();
  pads[0] = pad; window.dispatchEvent(new Event('gamepadconnected')); await sleep(400);
  r.pad1Terug = GP.activePadIndex();
  pads.length = 1; pads[0] = pad;
  } finally { w.coop = coopVoor; }
});

await sectie('samen: lobby en roepjes met het pad', 60000, async (r, tot) => {
  await sluitPauze();
  PM.openPauseMenu('samen'); await sleep(1000);
  const rootEl = document.getElementById('pause-menu');
  r.geopend = pauzeOpen();
  if (!r.geopend) return;
  await shot('samen-pauze');
  Object.assign(r, await loop(rootEl, tot - 20000));
  await sluitPauze();
  // te voet: D-pad links, omlaag en rechts zijn de roepjes (7, 8, 9); zonder sessie mag er geen fout komen
  const toetsen = [];
  r.ctxVoet = ctxNu();
  for (const [k, t] of [['left', '7'], ['down', '8'], ['right', '9']]) { hold(k); let down = false; for (let i = 0; i < 6; i++) { await frames(1); if (D.input.isDown(t)) down = true; } hold(k, false); await frames(3); if (down) toetsen.push(t); }
  r.roepToetsenVanHetPad = toetsen.join(',');
  r.roepjesOk = toetsen.join(',') === '7,8,9';
});

out.verstreken = Math.round((Date.now() - T0) / 1000);
return JSON.stringify({ results: { padalles: out } });
