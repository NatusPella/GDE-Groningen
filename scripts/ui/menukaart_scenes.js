// De kaart in het pauzemenu: staat er UI achter de vignette? Beeld plus meting van de lagen boven de paneelmiddens.
// node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/menukaart_scenes.js
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
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
PM.openPauseMenu('map'); await sleep(2500);
const ok = document.querySelector('#pause-menu button[data-act="begrepen"], #pause-menu .mapview-card button, #pause-menu [data-mv-uitleg-ok]');
const knoppen = [...document.querySelectorAll('#pause-menu button')].filter((b) => b.getClientRects().length && /begrepen/i.test(b.textContent));
if (knoppen[0]) { knoppen[0].click(); await sleep(800); }
await shot('kaart-voor', 800);
const boven = (sel) => {
  const el = document.querySelector(sel); if (!el) return sel + ': niet gevonden';
  const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 40);
  const top = document.elementsFromPoint(x, y).slice(0, 5).map((e) => e.tagName + (typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const keten = []; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (Number(cs.opacity) < 1 || cs.filter !== 'none' || cs.mixBlendMode !== 'normal') keten.push((typeof e.className === 'string' ? e.className.split(/\s+/)[0] : e.tagName) + ' op=' + cs.opacity + ' f=' + cs.filter + ' mb=' + cs.mixBlendMode); }
  const cs = getComputedStyle(el);
  return `${sel}: bg=${cs.backgroundColor} boven=[${top.join(' > ')}] gedimd=[${keten.join(' | ')}]`;
};
for (const s of ['.mapview-legend', '.mapview-title', '.mapview-search', '.mapview-zoom .m-bg', '.mv-layers', '.mv-hl .mv-eb', '.mapview-osm', '.mapview-compass, .mv-compass']) done.push(boven(s));
PM.closePauseMenu();
clearInterval(skipper);
return done;
