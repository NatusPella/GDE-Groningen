// Beelden voor de afronding van het designsysteem (#998 telefoon, #999 winkels en menu's, #1000 minigames, #1001 Samen spelen, #1002 laadscherm):
// één run, per scherm een [capture]. Gebruik: bash scripts/ui/ds_run.sh scripts/ui/ds_afronding_scenes.js <map> <formaten> [stage]
// Raakt alleen het wegwerpprofiel; elke synthetische keydown krijgt een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
const done = [];
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
await sleep(3000);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); try { PM.closePauseMenu(); } catch (e2) { /* niet open */ } } };
w.money = 5000;
// menutabbladen
const tab = async (naam, tabId, opts = {}, wacht = 1800, extra = null) => probeer(naam, async () => {
  PM.openPauseMenu(tabId, opts); await sleep(wacht);
  if (extra) await extra();
  await shot(naam, 600); PM.closePauseMenu(); await sleep(500);
});
await tab('garage', 'garage', {}, 9000);
await tab('garage-te-koop', 'garage', {}, 9000, async () => {
  const l = document.querySelector('#pause-menu .gar-list');
  const k = [...document.querySelectorAll('#pause-menu .gar-card')].find((c) => /te koop/i.test(c.textContent) && !/van jou/i.test(c.textContent));
  if (k) k.scrollIntoView({ block: 'center' }); else if (l) l.scrollTop = l.scrollHeight;
  await sleep(6000);
  const ph = [...document.querySelectorAll('#pause-menu .gar-card .gar-ph')];
  done.push('garage-ph ' + ph.length + ' met img ' + ph.filter((x) => x.querySelector('img')).length);
});
await tab('spullen', 'spullen', {}, 1800);
await tab('todo', 'todo', {}, 1800);
await tab('loopbaan', 'loopbaan', {}, 1800);
await tab('verhaal', 'verhaal', {}, 1800);
await tab('veroverd', 'veroverd', {}, 1800);
await tab('telefoon', 'telefoon', {}, 1800);
await tab('controls', 'controls', { sub: 'toetsen' }, 1800);
await tab('samen-hub', 'spel', { sub: 'samen' }, 1800);
await probeer('samen-meedoen', async () => {
  PM.openPauseMenu('spel', { sub: 'samen' }); await sleep(1500);
  const b = document.querySelector('[data-hub-keuze="meedoen"]'); if (b) { b.click(); await shot('samen-meedoen', 2000); }
  PM.closePauseMenu(); await sleep(500);
  PM.openPauseMenu('spel', { sub: 'samen' }); await sleep(1500);
  const h = document.querySelector('[data-hub-keuze="hosten"], [data-hub-keuze="host"]'); if (h) { h.click(); await shot('samen-hosten', 2500); }
  PM.closePauseMenu(); await sleep(500);
});
await probeer('samenkeuze', async () => { const M = await imp('samenkeuze'); M.openSamenKeuze({}); await shot('samenkeuze', 1200); tap('Escape', 'Escape'); await sleep(500); });
await probeer('consent', async () => { const M = await imp('onlineconsentui'); M.openOnlineStart({ naam: '' }); await shot('samen-starten-consent', 1500); tap('Escape', 'Escape'); await sleep(500); });
// telefoon: de parodie-apps als meldingen
const P = await imp('phonefeed');
await probeer('telefoon-meldingen', async () => {
  P.notifyPhone(w, { from: 'Tammo', app: 'bericht', title: 'Tammo', text: 'Kom je zo naar de Grote Markt? Ik heb een plan.', duration: 9 });
  await shot('telefoon-bericht', 2200); await sleep(5000);
  P.notifyPhone(w, { from: 'Kiekdoar', app: 'sikkom', text: 'Kiekdoar: Een snelle auto en drie politiewagens maken een rondje Groningen. Het verkeer vraagt vriendelijk om ruimte.', duration: 9 });
  await shot('telefoon-nieuws', 2200); await sleep(5000);
  P.notifyPhone(w, { from: 'Knipbank', app: 'geld', title: 'Knipbank', text: 'Je hebt 120 euro ontvangen van Tessa.', duration: 9 });
  await shot('telefoon-geld', 2200); await sleep(5000);
  P.startCall(w, { from: 'Tessa', lines: [{ text: 'Moi! Heb je even?' }], live: false }); await shot('telefoon-gesprek', 2600); await sleep(3000);
});
// minigamebord, een reeks varianten
const K = await imp('minigamekit');
const bord = async (naam, titel, set) => probeer(naam, async () => { const b = K.createBoard(titel); b.set(set); b.show(); await shot(naam, 1200); b.hide(); b.root.remove(); await sleep(300); });
const CELLEN = [{ t: '3', cls: 'good' }, { t: '5', cls: 'bad' }, { t: '·', cls: 'on' }, { t: '4' }, { t: '5' }, { t: '6' }];
for (const [id, row] of [['discgolf', 'Worp <b>3</b> van 9 · Par 3'], ['kartbaan', 'Ronde <b>2</b> van 3 · Plek 2 van 4'], ['skatepark', 'Trucs <b>4</b> · Combo x3'], ['zwembad', 'Baan <b>2</b> · 37 s'], ['hengelen', 'Vis <b>1</b> van 3'], ['regatta', 'Boei <b>2</b> van 5'], ['padel', 'Set <b>1</b> · 4-3'], ['pvparena', 'Ronde <b>2</b> · 3 punten'], ['klimtoren', 'Hoogte <b>34</b> m'], ['vliegschool', 'Les <b>2</b> van 5']]) {
  await bord('bord-' + id, id, { row, cells: id === 'discgolf' ? CELLEN : null, meter: { v: 0.55, text: '55%' }, flash: 'Mooie beurt!', help: K.key('SPATIE') + ' doen · ' + K.key('ESC') + ' stoppen' });
}
await probeer('stopvenster', async () => { const b = K.createBoard('discgolf'); b.set({ row: 'Worp 3 van 9' }); b.show(); await sleep(500); tap('Escape', 'Escape'); await shot('bord-stopvenster', 1200); tap('Escape', 'Escape'); await sleep(300); b.hide(); b.root.remove(); });
// winkel
await probeer('winkel', async () => {
  const SH = await imp('shops'); const SU = await imp('shopui'); const s = SH.getShopsForRender()[0];
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
  for (let i = 0; i < 90 && (laadt() || i < 6); i++) await sleep(1000);
  await sleep(2500);
  for (let i = 0; i < 12 && !SU.isShopOpen(); i++) { p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; await sleep(300); tap('e', 'KeyE'); await sleep(700); }
  if (SU.isShopOpen()) { await shot('winkel', 1500); SU.closeShopMenu({ save: false }); await sleep(400); } else done.push('winkel: ging niet open');
});
// laadscherm
await probeer('laadscherm', async () => { const LS = await imp('loadscreen'); LS.startLoadScreen(w, { kind: 'travel', name: 'Winsum' }); await shot('laadscherm', 2500); await sleep(500); });
clearInterval(skipper);
return done;
