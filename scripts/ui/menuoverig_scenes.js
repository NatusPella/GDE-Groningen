// Overige menuschermen in zeefdruk, in één run: Samen spelen-keuze, Opgeslagen spellen, Samen spelen starten (toestemming),
// menumelding en telefoonkaarten in de HUD.
// node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/menuoverig_scenes.js
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
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); } };
await probeer('samenkeuze', async () => { const M = await imp('samenkeuze'); M.openSamenKeuze({}); await shot('samenkeuze', 1500); tap('Escape', 'Escape'); await sleep(500); });
await probeer('saveslots', async () => { const M = await imp('saveslotsui'); M.openSaveSlots({}); await shot('opgeslagen-spellen', 2500); tap('Escape', 'Escape'); await sleep(600); });
await probeer('onlinestart', async () => { const M = await imp('onlineconsentui'); M.openOnlineStart({ naam: '' }); await shot('samen-starten', 1500); tap('Escape', 'Escape'); await sleep(500); const o = document.querySelector('.os-overlay'); if (o) o.remove(); });
await probeer('menumelding', async () => { const PM = await imp('pausemenu'); const M = await imp('menumelding'); PM.openPauseMenu('spel'); await sleep(1200); M.menuMelding('Opgeslagen: Spel van 20 nov'); await shot('menumelding', 800); PM.closePauseMenu(); await sleep(400); });
await probeer('telefoonkaart', async () => {
  const P = await imp('phonefeed');
  P.notifyPhone(w, { from: 'Tammo', app: 'bericht', title: 'Tammo', text: 'Kom je zo naar de Grote Markt? Ik heb een plan.' });
  await shot('telefoonkaart-bericht', 2500);
  P.startCall(w, { from: 'Tessa', lines: [{ text: 'Moi! Heb je even?' }], live: false });
  await shot('telefoonkaart-gesprek', 2500);
});
clearInterval(skipper);
return done;
