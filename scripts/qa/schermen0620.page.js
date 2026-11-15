const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 120 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const w = window.__debug.world;
const cine = await import('/js/cinematics.js');
const PM = await import('/js/pausemenu.js');
const skip = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
await sleep(2000);
window.__debug.input.canLock = () => false;
for (const tab of ['verhaal', 'loopbaan', 'veroverd', 'todo', 'spullen', 'prestaties', 'fotos', 'samen']) {
  PM.openPauseMenu(tab);
  await sleep(1200);
  console.log('[capture] scherm-' + tab);
  await sleep(400);
  PM.closePauseMenu();
  await sleep(250);
}
clearInterval(skip);
return 'ok';
