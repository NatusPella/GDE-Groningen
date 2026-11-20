// Contrast- en lettergroottemeting van de menuschermen (zeefdruk, ADR 0040): elke tekstregel tegen zijn achtergrond.
// node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/menucontrast_scenes.js
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
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const TABS = [['overzicht'], ['todo'], ['map'], ['telefoon'], ['verhaal'], ['spullen'], ['garage'], ['prestaties'], ['loopbaan'], ['boerderij'], ['settings'], ['controls'], ['over'], ['fotos']];
const SUBS = { todo: ['alles'], telefoon: ['contacten', 'berichten'], verhaal: ['personages', 'aanwijzingen'], settings: ['video', 'sound', 'camera', 'display', 'hints', 'a11y'], controls: ['toetsen', 'knoppen', 'overzicht', 'aanraken', 'hulp'] };
const parse = (c) => { const m = c.match(/[0-9.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const bgOf = (el) => {
  const stack = []; let unknown = false;
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.backgroundImage !== 'none') unknown = true;
    const c = parse(cs.backgroundColor);
    if (c.a > 0) { stack.push(c); if (c.a >= 1) break; }
  }
  let base = { r: 20, g: 20, b: 20, a: 1 };
  for (let k = stack.length - 1; k >= 0; k--) base = over(stack[k], base);
  return { base, unknown };
};
const meet = () => {
  const root = document.querySelector('#pause-menu') || document.body;
  const bad = new Map();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue;
    const e = n.parentElement; if (!e) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.2) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const fs = parseFloat(cs.fontSize); const { base, unknown } = bgOf(e);
    const fg = over(parse(cs.color), base);
    const L1 = lum(fg), L2 = lum(base); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = fs >= 24 || (fs >= 18.66 && Number(cs.fontWeight) >= 700);
    const key = (typeof e.className === 'string' && e.className.trim()) ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName;
    if (ratio < (big ? 3 : 4.5) && !unknown && !bad.has(key)) bad.set(key, `${key} "${t.slice(0, 24)}" ${ratio.toFixed(2)}:1 ${fs}px`);
    if (fs < 13 && !bad.has('F' + key)) bad.set('F' + key, `${key} "${t.slice(0, 24)}" KLEIN ${fs}px`);
  }
  return [...bad.values()];
};
const info = [`viewport ${innerWidth}x${innerHeight}`];
let n = 0;
for (const [tab] of TABS) {
  for (const sub of (SUBS[tab] || [null])) {
    PM.openPauseMenu(tab, sub ? { sub } : {});
    await sleep(1400);
    const bad = meet(); n++;
    if (bad.length) info.push((tab + (sub ? '/' + sub : '')) + ': ' + bad.join(' | '));
    PM.closePauseMenu();
  }
}
info.push('contrastmeting klaar, ' + n + ' schermen');
clearInterval(skipper);
return info;
