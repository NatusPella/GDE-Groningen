// Scenes voor de beeldregressie (#994): een kleine, rustige eerste set van vijf schermen. Elk scherm is een
// pauzemenutabblad op een bevroren wereld, zodat twee runs hetzelfde beeld geven. Namen: zie SCHERMEN in
// scripts/ui/beeldregressie.mjs. Raakt alleen het wegwerpprofiel; elke synthetische keydown krijgt een keyup.
// window.__shotsOnly (--only=a,b) kiest scenes.
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
const D = window.__debug; const w = D.world;
const cine = await imp('cinematics'); const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const only = (window.__shotsOnly || '').split(',').filter(Boolean);
const wil = (n) => !only.length || only.includes(n);
w.money = 5000;
const tab = async (naam, tabId, opts = {}, wacht = 1800) => {
  if (!wil(naam)) return;
  try { PM.openPauseMenu(tabId, opts); await sleep(wacht); await shot(naam, 600); PM.closePauseMenu(); await sleep(500); }
  catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); try { PM.closePauseMenu(); } catch (e2) { /* niet open */ } }
};
await tab('menu-garage', 'garage', {}, 9000);
await tab('menu-todo', 'todo', {}, 1800);
await tab('menu-verhaal', 'verhaal', {}, 1800);
await tab('menu-telefoon', 'telefoon', {}, 1800);
await tab('samen-hub', 'spel', { sub: 'samen' }, 1800);
clearInterval(skipper);
return done;
