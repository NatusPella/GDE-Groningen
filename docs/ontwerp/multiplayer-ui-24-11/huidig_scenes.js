// Beelden van het huidige Samen spelen in het echte spel (review 24-11). Draait als --perf-script; geen netwerk (de wizard stopt voor Verbinden en Open je spel).
// Een nepsessie (world.coopNet, world.coopSpelers) laat de spelerslijst zien zonder echte verbinding; alleen in dit wegwerpprofiel.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const out = [];
for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
await sleep(3000);
const D = window.__debug; const w = D.world;
w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
const PM = await imp('pausemenu'); const ST = await imp('settings');
ST.setSetting('onlineMeedoen', true); ST.setSetting('onlineNaam', 'Sem'); ST.setSetting('onlineKleur', '#4fb3ff');
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
const sluit = async () => { for (let i = 0; i < 3; i++) { tap('Escape', 'Escape'); await sleep(250); } try { PM.closePauseMenu(); } catch (e) {} await sleep(300); };
const open = async (sec, sub) => { await sluit(); PM.openPauseMenu(sec, sub ? { sub } : {}); await sleep(1600); };
const klik = async (sel, wacht = 600) => { const e = document.querySelector(sel); if (e) { e.click(); await sleep(wacht); } return !!e; };
await shot('F0-wereld', 300);
// A: zonder sessie
try {
  await open('samen'); await shot('A1-samen-stap0');
  await klik('[data-act="kies-gast"]'); await shot('A2-samen-wie-gast');
  await klik('[data-act="wie-verder"]'); await shot('A3-samen-gast-kiezen');
  await klik('[data-act="wie-terug"]'); await klik('[data-act="wie-terug"]');
  await klik('[data-act="kies-host"]'); await klik('[data-act="wie-verder"]'); await shot('A4-samen-host-kiezen');
  await klik('[data-act="wijze-openbaar"]'); await shot('A5-samen-host-openbaar');
  await klik('[data-act="wie-terug"]'); await klik('[data-act="wie-terug"]');
  await open('spel', 'overzicht'); await shot('A6-spel-overzicht');
  await open('settings', 'online'); { const t = document.querySelector('[data-of="settings"][data-subtab="online"]'); if (t) { t.click(); await sleep(700); } } await shot('A7-instellingen-samen');
  await sluit();
} catch (e) { out.push('A ' + e.message); }
// B: eerste keer (naam en akkoord)
try {
  ST.setSetting('onlineMeedoen', false);
  const OC = await imp('onlineconsentui'); OC.openOnlineStart({ naam: '', terug: true }); await sleep(900); await shot('B1-eerste-start'); const t = document.querySelector('#online-start [data-terug]'); if (t) t.click(); await sleep(400);
  ST.setSetting('onlineMeedoen', true);
} catch (e) { out.push('B1 ' + e.message); }
// C: nepsessie met vijf spelers
const rij = (slot, naam, kleur, vorm, o = {}) => ({ slot, naam, kleur, vorm, doet: 'loopt', verbinding: 'ok', ms: 40, afstandTekst: slot === 0 ? '' : '120 m', afstand: 120, richting: slot === 0 ? null : { pijl: '→', woord: 'oost' }, jij: false, passief: true, groep: null, x: 10, y: 10, klaar: null, ...o });
try {
  w.coopNet = { role: 'host', hub: { roster: { max: 8 } }, route: 'kamer', session: null }; w.coopRole = 'host'; w.coopSolo = false;
  w.coopRoster = [{ slot: 0, naam: 'Sem' }, { slot: 1, naam: 'Iris' }, { slot: 2, naam: 'Tijn' }, { slot: 3, naam: 'Liv' }, { slot: 4, naam: 'Gijs' }];
  w.coopSpelers = [rij(0, 'Sem', '#4fb3ff', 'cirkel', { jij: true }), rij(1, 'Iris', '#5bd6a0', 'ster', { doet: 'hengelt' }), rij(2, 'Tijn', '#f2b134', 'plus', { verbinding: 'lag', ms: 420, doet: 'rijdt' }), rij(3, 'Liv', '#ff9a62', 'hart', { verbinding: 'lost', doet: 'weg' }), rij(4, 'Gijs', '#ff7ab8', 'maan', { passief: false })];
  await open('spel', 'overzicht'); await shot('C1-spel-overzicht-sessie');
  await open('samen'); await sleep(600); await shot('C2-samen-sessie-tab');
  { const t = document.querySelector('[data-of="samen"][data-subtab="spelers"]'); if (t) { t.click(); await sleep(1200); } } await shot('C3-spelers-host');
  const sc = document.querySelector('[data-of="samen"][data-sub="spelers"]'); if (sc) { sc.scrollTop = 600; await sleep(400); await shot('C4-spelers-host-onder', 100); }
  await sluit();
} catch (e) { out.push('C ' + e.message); }
try { // Tab-lijst in het spel
  const CS = await imp('coopspelersui'); D.input.isDown = (k) => k === 'tab'; for (let i = 0; i < 6; i++) { CS.updateSpelersOverlay(w); await sleep(150); } await shot('D1-tablijst', 300);
  D.input.isDown = () => false; CS.updateSpelersOverlay(w);
} catch (e) { out.push('D1 ' + e.message); }
try { // Meedoen?
  const CH = await imp('coophud'); w.coopUitnodiging = { label: 'Race naar het Hoofdstation', verplicht: false, start: false, rest: 8, stap: null, status: null }; CH.updatePartnerChip(w); await sleep(700); await shot('D2-meedoen', 300); w.coopUitnodiging = null; CH.updatePartnerChip(w);
} catch (e) { out.push('D2 ' + e.message); }
try { // overdracht en wachten
  const OV = await imp('coopoverlay'); const h = OV.mountOverlay({ label: 'Spel overdragen', target: document.body, onAction: () => {} });
  h.render({ title: 'Het spel overnemen?', text: 'Sem wil het spel aan jou overdragen. Nog 14 seconden. Zonder antwoord is het nee.', buttons: [{ action: 'ja', label: 'Ja', toets: 'J', primary: true }, { action: 'nee', label: 'Nee', toets: 'N' }] }); await sleep(900); await shot('E1-overdracht-vraag', 300);
  h.render({ title: 'Even wachten', text: 'Het spel wordt overgedragen aan Iris. Je blijft verbonden.', buttons: [{ action: 'stop', label: 'Stoppen', primary: true }] }); await sleep(600); await shot('E2-overdracht-wacht', 300); h.close();
} catch (e) { out.push('E1 ' + e.message); }
try { // wegvallen: de echte hold met de lobby
  const HO = await imp('coophold'); await HO.openHold(w, "host", 3, ""); await sleep(1200); await shot('E3-wegvallen-host', 300);
} catch (e) { out.push('E3 ' + e.message); }
clearInterval(skipper);
return JSON.stringify(out);
