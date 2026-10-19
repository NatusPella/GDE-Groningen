// Scenes for the savegame screen and the dashboard of the pause menu (#34, #92, #208):
//   node scripts/ui_shots.mjs --scenes=scripts/ui/savegame_scenes.js --out=<map> --sizes=1920x1080
// Fills a throwaway profile with a few savegames (never real storage), then opens the screens.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
const D = window.__debug; const w = D.world;
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const SG = await imp('savegame');
const S = await imp('saveslots');
const UI = await imp('saveslotsui');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
// a save from the current game in slots 1..3, with different money / names, one with a screenshot
w.money = 1250;
SG.saveGame(w, { toast: true });
await sleep(300);
SG.saveGame(w, { toast: true });
await sleep(500);
const done = ['thumb ' + S.readThumb(null, 1).length];
for (const n of [2, 3]) S.writeThumb(null, n, S.readThumb(null, 1));
const base = JSON.parse(localStorage.getItem(S.readIndex ? 'gde-save-v1-nieuw' : 'x') || 'null');
const mk = (money, secs, ago, character) => ({ ...base, money, speeltijd: secs, savedAt: Date.now() - ago, character });
S.writeSlot(null, 2, mk(48210, 15200, 86400000 * 2, 'anita')); S.renameSlot(null, 2, 'Tessa-route');
S.writeSlot(null, 3, mk(30, 410, 600000, 'tammo'));
S.renameSlot(null, 1, 'Mijn eerste zomer');
UI.openSaveSlots({ mode: 'game', world: w });
await shot('savegames');
document.querySelector('#saveslots [data-slot="2"]').click();
await shot('savegames-sel');
document.querySelector('#saveslots [data-do="delete"]').click();
await shot('savegames-delete');
document.activeElement.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(400);
PM.openPauseMenu('overzicht');
await shot('dashboard', 1500);
PM.closePauseMenu();
clearInterval(skipper);
done.push('klaar');
return done;
