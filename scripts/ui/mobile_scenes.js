// Scenes for scripts/mobile_shots.mjs: the touch layout per situation (#96).
// Same start as shots_scenes.js (starts a game, teleports); after each scene
// it measures the touch buttons and the HUD and logs "[capture] <name>".
// Nothing writes saves: the run uses a throwaway profile.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const out = [];
let startShot = false;
const keyAll = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true })); };
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  // the 'Wat is er nieuw' panel opens on a new version: close it first
  const news = document.querySelector('#start-screen .ss-news-close');
  if (news && news.getBoundingClientRect().width > 0) { keyAll('keydown', 'Escape', 'Escape'); keyAll('keyup', 'Escape', 'Escape'); await sleep(800); }
  if (!startShot && document.querySelector('#start-screen [data-act="new"]')) {
    startShot = true;
    await sleep(3000);
    const W = innerWidth, H = innerHeight;
    const items = [...document.querySelectorAll('#start-screen .ss-item')].map((e) => { const r = e.getBoundingClientRect(); return e.dataset.act + '@' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (r.bottom > H || r.right > W || r.top < 0 ? ' BUITEN' : ''); });
    out.push({ name: 'startscherm', viewport: W + 'x' + H, items, scrollable: document.getElementById('start-screen').scrollHeight > H });
    console.log('[capture] startscherm');
    await sleep(900);
  }
  // a tap on 'Nieuw spel' (the menu can lie below the fold on a short screen; the click works anyway)
  const nieuw = document.querySelector('#start-screen [data-act="new"]');
  if (nieuw) nieuw.click(); else { keyAll('keydown', 'Enter', 'Enter'); keyAll('keyup', 'Enter', 'Enter'); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const VEH = await imp('vehicle');
const PM = await imp('pausemenu');
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const settle = async () => { await sleep(1500); for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(1500); };
const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
const visible = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 && r.height > 0; };
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// measure the touch buttons, the HUD, text size, and what is off screen
function audit(name) {
  const W = innerWidth, H = innerHeight;
  const sa = ['Top', 'Right', 'Bottom', 'Left'].map((s) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;visibility:hidden;padding-' + s.toLowerCase() + ':env(safe-area-inset-' + s.toLowerCase() + ',0px)'; document.body.appendChild(d); const v = parseFloat(getComputedStyle(d)['padding' + s]) || 0; d.remove(); return v; });
  const tui = document.getElementById('touch-ui');
  const btns = tui ? [...tui.querySelectorAll('.t-btn')].filter(visible).map((e) => ({ t: e.textContent.trim(), ...R(e) })) : [];
  const issues = [];
  for (const b of btns) {
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) issues.push('knop ' + b.t + ' valt buiten het scherm');
    if (Math.min(b.w, b.h) < 44) issues.push('knop ' + b.t + ' kleiner dan 44px (' + b.w + 'x' + b.h + ')');
    // thumb reach: distance to the nearest bottom corner
    if (b.t === 'II' || b.t === 'Meer') continue; // top corner, not a thumb action
    const reach = Math.hypot(Math.min(b.x + b.w / 2, W - (b.x + b.w / 2)), H - (b.y + b.h / 2));
    if (reach > 0.75 * Math.min(W, H) + 120) issues.push('knop ' + b.t + ' ver van de duim (' + Math.round(reach) + 'px)');
  }
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) if (hit(btns[i], btns[j])) issues.push('knoppen ' + btns[i].t + ' en ' + btns[j].t + ' overlappen');
  // HUD: the outermost visible positioned blocks, their place, what lies under a touch button, tiny text
  const hudBad = [], small = new Map(), blocks = [];
  const hud = document.getElementById('hud');
  const nameOf = (e) => ((e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(' ').filter(Boolean).join('.') : '')) || e.tagName;
  if (hud) {
    const inBlock = new Set();
    for (const e of hud.querySelectorAll('*')) {
      if (!visible(e)) continue;
      const cs = getComputedStyle(e);
      const box = R(e);
      if ((cs.position === 'absolute' || cs.position === 'fixed') && box.w > 24 && box.h > 12 && box.w * box.h < 0.6 * W * H && !inBlock.has(e.parentElement) && (e.textContent.trim() || e.querySelector('canvas,svg') || e.tagName === 'CANVAS')) {
        blocks.push({ n: nameOf(e).slice(0, 48), ...box });
        inBlock.add(e);
      } else if (inBlock.has(e.parentElement)) inBlock.add(e);
      if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        const fs = parseFloat(cs.fontSize) * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1);
        if (fs < 10.5) small.set(nameOf(e).slice(0, 40), Math.round(fs * 10) / 10);
      }
    }
    for (const bl of blocks) {
      if (bl.x < -1 || bl.y < -1 || bl.x + bl.w > W + 1 || bl.y + bl.h > H + 1) hudBad.push('buiten beeld: ' + bl.n + ' @' + bl.x + ',' + bl.y + ' ' + bl.w + 'x' + bl.h);
      for (const b of btns) if (hit(bl, b)) { hudBad.push('HUD ' + bl.n + ' onder knop ' + b.t); }
    }
  }
  out.push({ name, viewport: W + 'x' + H, safe: sa, touchClass: document.documentElement.dataset.touchClass || null, portrait: document.documentElement.classList.contains('touch-portrait'), buttons: btns.map((b) => b.t + '@' + b.x + ',' + b.y + ' ' + b.w + 'x' + b.h), issues: [...new Set(issues)], hud: [...new Set(hudBad)].slice(0, 20), blocks: blocks.slice(0, 40).map((b) => b.n + '@' + b.x + ',' + b.y + ' ' + b.w + 'x' + b.h), smallText: Object.fromEntries(small) });
}
const shot = async (name, wait = 1000) => { await sleep(wait); audit(name); console.log('[capture] ' + name); await sleep(700); };
const guard = async (name, fn) => { try { await fn(); } catch (e) { out.push({ name, error: String((e && e.message) || e) }); } };
out.push({ name: 'env', viewport: innerWidth + 'x' + innerHeight + ' dpr ' + devicePixelRatio, touch: !!document.getElementById('touch-ui'), cls: document.documentElement.dataset.touchClass, maxTouchPoints: navigator.maxTouchPoints, coarse: matchMedia('(pointer: coarse)').matches, hover: matchMedia('(hover: hover)').matches, ui: getComputedStyle(document.documentElement).getPropertyValue('--ui'), settings: (() => { try { const s = JSON.parse(localStorage.getItem('gde-settings') || '{}'); return { preset: s.preset, shadows: s.shadows, drawDistance: s.drawDistance, touchControls: s.touchControls }; } catch (e) { return null; } })() });
// hover rules in the stylesheets
out.push({ name: 'hover-regels', rules: [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules]; } catch (e) { return []; } }).filter((r) => r.selectorText && /:hover/.test(r.selectorText)).map((r) => r.selectorText).slice(0, 60) });

const ride = async (name, make, speed, at = P(100, 77), far = false) => {
  teleport(...at);
  const v = make();
  if (!v) { out.push({ name, error: 'geen voertuig' }); return; }
  v.road = null; v.perfTemp = true;
  w.vehicles.push(v);
  p.x = v.x; p.y = v.y;
  p.enterVehicle(v, w);
  await (far ? settle() : sleep(600));
  const hold = setInterval(() => { v.speed = speed; }, 50);
  await shot(name, 800);
  clearInterval(hold);
  p.exitVehicle(map, w);
  const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1);
};
const onRoad = (extra = {}) => () => {
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  return VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, extra.scooter || false, extra.model || null);
};
const MOTO = await imp('motomodels');
if (want('voet')) await guard('voet', async () => { teleport(...P(100, 77)); await shot('voet', 3500); });
if (want('gezocht')) await guard('gezocht', async () => { w.wanted = 3; await shot('gezocht', 1200); w.wanted = 0; });
if (want('auto')) await guard('auto', () => ride('auto', onRoad(), 14));
if (want('motor')) await guard('motor', () => ride('motor', onRoad({ scooter: true, model: MOTO.MOTORBIKE_MODELS.sport }), 6));
if (want('boot')) await guard('boot', async () => {
  const poly = map.water && map.water.find((q) => q.bounds && q.bounds[2] - q.bounds[0] > 40);
  if (poly) await ride('boot', () => VEH.spawnBoatOnWater(map, poly), 6, P(100, 77), true); else out.push({ name: 'boot', error: 'geen water' });
});
if (want('heli')) await guard('heli', async () => {
  const H = await imp('heliflight');
  teleport(...P(100, 77));
  const v = H.makeHeli(p.x, p.y, 40, 0);
  w.vehicles.push(v); p.enterVehicle(v, w);
  await shot('heli', 1500);
  p.exitVehicle(map, w);
  const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1);
});
if (want('duif')) await guard('duif', async () => {
  const PG = await imp('pigeonmode');
  teleport(...P(100, 77));
  if (!PG.startPigeonMode(w, null)) throw new Error('duif start mislukt');
  await shot('duif', 1500);
  PG.stopPigeonMode(w);
});
if (want('minigame')) await guard('minigame', async () => {
  teleport(...P(100, 77));
  w.activityGame = 'carillon';
  await shot('minigame-carillon', 1200);
  w.activityGame = 'pannenkoek';
  await shot('minigame-pannenkoek', 1200);
  w.activityGame = null;
});
for (const tab of ['overzicht', 'todo', 'map', 'telefoon', 'verhaal', 'spullen', 'garage', 'prestaties', 'settings', 'controls']) {
  if (!want(tab)) continue;
  await guard('menu-' + tab, async () => { teleport(...P(100, 77)); PM.openPauseMenu(tab); await shot('menu-' + tab, 1500); PM.closePauseMenu(); });
}
if (want('winkel')) await guard('winkel', async () => {
  const SU = await imp('shopui');
  const S = await imp('shops');
  const list = (S.getShops && S.getShops()) || w.shops || [];
  const s = (Array.isArray(list) ? list : Object.values(list))[0];
  if (!s) throw new Error('geen winkel gevonden');
  SU.openShopMenu(w, s); await shot('winkel', 1200); SU.closeShopMenu();
});
if (want('trein')) await guard('trein', async () => {
  const RW = await imp('railway');
  const cab = (t) => RW.routePoint(t.route, t.c + (t.halfLen - 3));
  const standing = () => RW.getTrains().filter((q) => q.state === 'dwell' || q.state === 'parked');
  const c0 = P(100, 77);
  const first = standing().sort((a, b) => Math.hypot(cab(a)[0] - c0[0], cab(a)[1] - c0[1]) - Math.hypot(cab(b)[0] - c0[0], cab(b)[1] - c0[1]))[0];
  if (!first) throw new Error('geen trein');
  teleport(...cab(first)); await settle();
  const key = (ty, k, code) => { for (const tg of [window, document]) tg.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
  key('keydown', 'e', 'KeyE'); key('keyup', 'e', 'KeyE'); key('keydown', 'w', 'KeyW');
  await shot('trein', 3000);
  key('keyup', 'w', 'KeyW');
});
clearInterval(skipper);
return JSON.stringify(out);
