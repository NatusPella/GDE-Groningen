// Gate 0.65: losse speelbaarheidschecks na de laatste fixes (Doorgaan-spawn bij thuisstappen, steigermarker, kaart slepen/zoomen).
// Page-script voor scripts/qa/menufoto.mjs --page=gate_checks.page.js. Geeft JSON terug en maakt beelden. Alleen het wegwerpprofiel wordt geraakt.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const uit = { stappen: [], fouten: [] };
window.addEventListener('error', (e) => uit.fouten.push('onerror: ' + (e.message || '') + ' @' + ((e.filename || '').split('/').pop()) + ':' + e.lineno));
const ce = console.error.bind(console); console.error = (...a) => { if (uit.fouten.length < 40) uit.fouten.push('console.error: ' + a.map(String).join(' ').slice(0, 240)); ce(...a); };
const note = (naam, data) => uit.stappen.push({ naam, ...data });
for (let i = 0; i < 240; i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map) break;
  await sleep(1000);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics'); const PM = await imp('pausemenu'); const MV = await imp('mapview');
for (let i = 0; i < 120 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(300); }
await sleep(3000);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const pos = () => ({ x: Math.round(p.x), y: Math.round(p.y), z: Math.round((p.z || 0) * 10) / 10, binnen: !!(w.interior || w.inInterior || p.inside || (w.home && w.home.active)) });
const tekst = (el) => ((el && el.innerText) || '').replace(/\s+/g, ' ').trim();
// A. thuisstap N2 (en W1): springt het verhaal erheen, staat de speler dan in/bij de flat en speelt de scene?
const S = window.__story;
for (const id of ['N2', 'W1']) {
  try {
    if (!S || !S.jump) { note('thuisstap ' + id, { fout: 'geen __story.jump' }); continue; }
    S.jump(id);
    await sleep(6000);
    const a = { cutscene: cine.isCinematicActive(), pos: pos(), stap: S.state ? JSON.stringify(S.state()).slice(0, 160) : null };
    console.log('[capture] gate-thuisstap-' + id + '-6s');
    await sleep(8000);
    for (let i = 0; i < 80 && cine.isCinematicActive(); i++) await sleep(500);
    note('thuisstap ' + id, { ...a, nadien: pos(), cutsceneKlaar: !cine.isCinematicActive() });
    console.log('[capture] gate-thuisstap-' + id + '-na');
  } catch (e) { note('thuisstap ' + id, { fout: String(e && e.message) }); }
}
// B. de steiger: staat de marker, en is er een boot/steiger bij de flat (kaart en minikaart)
try {
  const OV = await imp('ownedvehicles');
  const sm = (window.__debug.markers && window.__debug.markers()) || null;
  note('steiger', { markersBeschikbaar: !!sm, ovExports: Object.keys(OV).filter((k) => /steiger|boat|jetty|dock/i.test(k)).slice(0, 8) });
} catch (e) { note('steiger', { fout: String(e && e.message) }); }
PM.openPauseMenu('map'); await sleep(3500);
for (const b of document.querySelectorAll('button')) if (/begrepen/i.test(b.textContent)) { b.click(); await sleep(500); }
const kaartTekst = tekst(document.querySelector('[data-panel="map"]'));
note('kaart', { steigerInTekst: /steiger/i.test(kaartTekst), tekst: kaartTekst.slice(0, 300) });
console.log('[capture] gate-kaart-start');
// C. kaart-handtest: slepen en zoomen, labels scherp na stilstand
const cv = document.querySelector('.mapview-canvas');
if (cv) {
  const r = cv.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const m = (type, el, x, y, extra = {}) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, ...extra }));
  for (let rep = 0; rep < 3; rep++) { cv.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, deltaY: -240 })); await sleep(180); }
  console.log('[capture] gate-kaart-zoom-bezig'); await sleep(900);
  console.log('[capture] gate-kaart-zoom-stil');
  m('mousedown', cv, cx, cy); for (let i = 1; i <= 12; i++) { m('mousemove', window, cx + i * 14, cy + i * 8); await sleep(40); } m('mouseup', window, cx + 170, cy + 100);
  await sleep(150); console.log('[capture] gate-kaart-slepen-bezig'); await sleep(1100);
  console.log('[capture] gate-kaart-slepen-stil');
  for (let rep = 0; rep < 4; rep++) { cv.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, deltaY: 300 })); await sleep(150); }
  await sleep(1200); console.log('[capture] gate-kaart-uitgezoomd');
  note('kaart-hand', { ok: true, fouten: uit.fouten.length });
} else note('kaart-hand', { fout: 'geen kaartcanvas' });
PM.closePauseMenu(); await sleep(600);
note('einde', { pos: pos() });
return JSON.stringify(uit);
