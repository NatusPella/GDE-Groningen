// Winkel, Samen spelen-gast en de eerste kaart in beeld (zeefdruk-menu's): wacht tot het laadscherm weg is.
// node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/menuwinkel_scenes.js
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
await probeer('winkel', async () => {
  const SH = await imp('shops'); const SU = await imp('shopui'); const s = SH.getShopsForRender()[0];
  w.money = 5000;
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
  for (let i = 0; i < 90 && (laadt() || i < 6); i++) await sleep(1000);
  await sleep(2500);
  for (let i = 0; i < 12 && !SU.isShopOpen(); i++) { p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; await sleep(300); tap('e', 'KeyE'); await sleep(700); }
  if (SU.isShopOpen()) { await shot('winkel', 1500); SU.closeShopMenu({ save: false }); await sleep(400); } else done.push('winkel: ging niet open');
});
await probeer('samen-gast', async () => {
  PM.openPauseMenu('spel', { sub: 'samen' }); await sleep(1500);
  const b = document.querySelector('[data-hub-keuze="meedoen"]');
  if (b) { b.click(); await shot('samen-meedoen', 2000); }
  PM.closePauseMenu(); await sleep(500);
  PM.openPauseMenu('spel', { sub: 'samen' }); await sleep(1500);
  const h = document.querySelector('[data-hub-keuze="hosten"], [data-hub-keuze="host"]');
  if (h) { h.click(); await shot('samen-hosten', 2500); }
  PM.closePauseMenu(); await sleep(500);
});
await probeer('spel-acties', async () => { PM.openPauseMenu('spel', { sub: 'acties' }); await shot('spel-acties', 1500); PM.closePauseMenu(); await sleep(400); });
clearInterval(skipper);
return done;
