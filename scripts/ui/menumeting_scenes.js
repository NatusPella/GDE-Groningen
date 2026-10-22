// Meting van de rust van de menu's (#92): woorden en pictogrammen per scherm, zichtbaar in het venster.
// node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/menumeting_scenes.js   (de criteria staan in DESIGN_SYSTEM.md)
// Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
// window size). Each scene opens a screen and logs "[capture] <name>", which
// devtools.js turns into <out>/<size>-<name>.png. Nothing here writes saves:
// the run uses a throwaway profile.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  // a touch run taps the menu instead: the news panel of a fresh profile closes, 'Nieuw spel' is tapped
  if (/[?&]touch=1/.test(location.search)) {
    const news = document.querySelector('#start-screen .ss-news');
    if (news && !news.hidden) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })); } await sleep(500); }
    const item = (window.__menuStart ? { click: () => window.__menuStart('doorgaan') } : null);
    if (item) item.click();
  }
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
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
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];
const info = [];
const TABS = [['overzicht'], ['todo'], ['map'], ['telefoon'], ['verhaal'], ['spullen'], ['garage'], ['prestaties'], ['loopbaan'], ['settings'], ['controls'], ['fotos']];
const SUBS = { todo: ['verhaal', 'alles'], telefoon: ['contacten', 'berichten'], verhaal: ['personages', 'aanwijzingen'], settings: ['video', 'sound', 'camera', 'display', 'a11y'], controls: ['toetsen', 'knoppen', 'overzicht', 'hulp'] };
const meet = () => {
  const root = document.querySelector('#pause-menu .pm-sheet, #pause-menu') || document.body;
  const vh = innerHeight, vw = innerWidth;
  let words = 0, icons = 0, minFont = 99, nodes = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue;
    const e = n.parentElement; if (!e) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.2) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    if (e.closest('.pm-rail, .pm-foot, .pm-keys, nav, [data-chrome], .pm-q-head')) continue;
    words += t.split(/\s+/).length; nodes++;
    minFont = Math.min(minFont, parseFloat(cs.fontSize));
  }
  for (const e of root.querySelectorAll('svg, img, canvas')) { const r = e.getBoundingClientRect(); if (r.width > 6 && r.height > 6 && r.bottom > 0 && r.top < vh && !e.closest('.pm-rail, .pm-foot')) icons++; }
  return { words, icons, minFont: minFont === 99 ? null : minFont, nodes };
};
const rows = [];
for (const [tab] of TABS) {
  if (!want(tab) && ONLY.length) continue;
  for (const sub of (SUBS[tab] || [null])) {
    teleport(...P(100, 77));
    PM.openPauseMenu(tab, sub ? { sub } : {});
    await sleep(1400);
    const m = meet();
    rows.push({ tab, sub, ...m });
    await shot('menu-' + tab + (sub ? '-' + sub : ''), 200);
    PM.closePauseMenu();
  }
}
// criteria (DESIGN_SYSTEM.md, Menurust): een keuzescherm toont hooguit 125 woorden in het venster, een naslagscherm
// (lijsten en uitleg) hooguit 270; toetsplaatjes (toetsen en knoppen) tellen niet mee voor de lettergrootte
const REF = new Set(['todo/verhaal', 'todo/alles', 'verhaal/personages', 'controls/toetsen', 'controls/knoppen', 'controls/overzicht', 'controls/hulp']);
let fails = 0;
for (const r of rows) {
  const id = r.tab + (r.sub ? '/' + r.sub : '');
  const max = REF.has(id) ? 270 : 125;
  const bad = r.words > max;
  if (bad) fails++;
  info.push(`${id}: woorden ${r.words}/${max}, pictogrammen ${r.icons}, kleinste letter ${r.minFont}px ${bad ? 'TE VEEL TEKST' : 'ok'}`);
}
info.push('menumeting: ' + (fails ? fails + ' schermen te druk' : 'alle ' + rows.length + ' schermen binnen de criteria'));
clearInterval(skipper);
return done.concat(info);
