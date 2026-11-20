// Pauzemenu 21-11: de tabs uit de UX-audit (docs/ESCAPEMENU-UX-21-11.md) voor en na, plus de afsluitvraag en het zoekvenster.
// node scripts/ui_shots.mjs --sizes=1280x720,1920x1080 --scenes=scripts/ui/menu2111_scenes.js --out=<map>
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
await document.fonts.ready;
const shot = async (name, wait = 1500) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); } };
const open = async (naam, tab, opts = {}) => { PM.openPauseMenu(tab, opts); await shot(naam, 1600); };
await probeer('overzicht', () => open('overzicht', 'spel'));
await probeer('acties', () => open('acties', 'spel', { sub: 'acties' }));
await probeer('verhaal', () => open('verhaal', 'verhaal'));
await probeer('todo', () => open('activiteiten', 'todo'));
await probeer('loopbaan', () => open('loopbaan', 'loopbaan'));
await probeer('spullen', () => open('spullen', 'spullen'));
await probeer('garage', () => open('garage', 'garage'));
await probeer('boerderij', () => open('boerderij', 'boerderij'));
await probeer('besturing', () => open('besturing-toetsen', 'controls', { sub: 'toetsen' }));
await probeer('instellingen', () => open('instellingen-beeld', 'settings', { sub: 'video' }));
await probeer('afsluiten', async () => { PM.openPauseMenu('spel'); await sleep(1200); const b = document.querySelector('#pause-menu [data-action="exit"]'); if (b) b.click(); await shot('afsluitvraag', 800); tap('Escape', 'Escape'); await sleep(400); });
await probeer('zoek', async () => { PM.openPauseMenu('spel'); await sleep(1200); tap('/', 'Slash'); await sleep(400); const q = document.querySelector('#pause-menu .pm-find-inp'); if (q) { q.value = 'geluid'; q.dispatchEvent(new Event('input', { bubbles: true })); } await shot('zoeken', 800); });
PM.closePauseMenu();
clearInterval(skipper);
return done;
