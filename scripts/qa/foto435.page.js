// Paginascript (#435): de fotomodus starten via Pauzemenu > Foto's, de balk bekijken, een vrije camera bewegen en met Escape terug.
// Opnames: shots-foto-*.png. Controleert dat er na Escape geen menulaag of foto-overlay overblijft.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const w = window.__debug.world;
const cine = await import('/js/cinematics.js');
const PM = await import('/js/pausemenu.js');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
await sleep(3000);
w.devInvuln = true;
window.__debug.input.canLock = () => false;
const uit = { controles: [] };
const check = (naam, ok, info = '') => uit.controles.push({ naam, ok: !!ok, info: String(info) });
const shot = async (n, ms = 1200) => { await sleep(ms); console.log('[capture] ' + n); await sleep(700); };
const toets = (k, code, ms = 0) => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true, cancelable: true })); return sleep(ms).then(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true, cancelable: true }))); };
const laag = () => {
  const pm = document.getElementById('pause-menu');
  const zicht = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0' && !el.closest('[hidden]');
  return { menu: zicht(pm) && !pm.classList.contains('closing') && (pm.classList.contains('open') || pm.classList.contains('visible') || pm.getBoundingClientRect().width > 0), foto: !!document.getElementById('foto-ui'), body: document.body.className, paused: !!w.paused, uiPaused: !!w.uiPaused };
};
PM.openPauseMenu('fotos'); await sleep(1500); await shot('foto-paneel');
document.querySelector('[data-foto-start]').click();
await sleep(1500);
check('fotomodus actief na starten', !!document.getElementById('foto-ui'), JSON.stringify(laag()));
await shot('foto-start');
const p0 = { x: w.cameraOverride && w.cameraOverride.position.x, y: w.cameraOverride && w.cameraOverride.position.y };
await toets('w', 'KeyW', 800);
await shot('foto-vooruit');
await toets('Escape', 'Escape', 50);
await sleep(2000);
const na = laag();
check('Escape sluit de fotomodus', !na.foto && !w.cameraOverride, JSON.stringify(na));
check('Escape laat geen menu eroverheen', !na.menu, JSON.stringify(na));
await shot('foto-na-escape');
clearInterval(skipper);
return JSON.stringify({ ...uit, p0, beelden: [{ naam: 'foto435' }] });
