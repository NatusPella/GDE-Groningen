// Paginascript (#435): de garage opnieuw openen, tabbladen wisselen, kaart kiezen: blijven de 3D-voorbeelden zichtbaar?
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
const root = () => document.getElementById('pause-menu');
const shot = async (n, ms = 1500) => { await sleep(ms); console.log('[capture] ' + n); await sleep(700); };
const toestand = (naam) => {
  const kaarten = [...root().querySelectorAll('.gar-card')];
  const kaart = kaarten.map((k) => { const p = k.querySelector('.gar-ph'); const c = p && p.querySelector('canvas'); return !!(c && c.width > 0) || !!(p && /url/.test(p.style.backgroundImage || '')) || !!(p && p.querySelector('img')); });
  const cv = root().querySelector('.gar-viewer canvas');
  let px = -1;
  if (cv) { try { const g = cv.getContext('2d'); const d = g.getImageData(0, 0, cv.width, cv.height).data; px = 0; for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) px++; } catch (e) { px = -2; } }
  check(naam, kaart.some(Boolean) && px !== 0, `kaarten ${kaarten.length}, met beeld ${kaart.filter(Boolean).length}, viewer ${cv ? cv.width + 'x' + cv.height : 'geen'}, pixels ${px}`);
};
PM.openPauseMenu('garage'); await sleep(2500); toestand('eerste keer'); await shot('g1');
PM.openPauseMenu('spullen'); await sleep(1200);
PM.openPauseMenu('garage'); await sleep(2500); toestand('terug uit Spullen'); await shot('g2');
PM.closePauseMenu(); await sleep(800);
PM.openPauseMenu('garage'); await sleep(2500); toestand('na sluiten en openen'); await shot('g3');
for (const t of [...root().querySelectorAll('[data-panel="garage"] [role="tab"], [data-panel="garage"] .m-tab, [data-panel="garage"] [data-garage-cat]')]) { if (/alles/i.test(t.textContent)) { t.click(); break; } }
await sleep(2500); toestand('tab Alles'); await shot('g4');
const kaarten = [...root().querySelectorAll('.gar-card')];
if (kaarten[3]) { kaarten[3].click(); await sleep(1500); toestand('kaart 4 gekozen'); await shot('g5'); }
for (const k of root().querySelectorAll('.gar-card')) if (!k.querySelector('.gar-ph canvas, .gar-ph img') && !/url/.test((k.querySelector('.gar-ph') || {style: {}}).style.backgroundImage || '')) { check('kaart zonder beeld', false, k.dataset.garageSelect); break; }
clearInterval(skipper);
return JSON.stringify({ ...uit, beelden: [{ naam: 'garage435' }] });
