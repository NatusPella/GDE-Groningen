// Scenes for the Opgeslagen spellen screen (#34, #92, #208):
//   node scripts/ui_shots.mjs --scenes=scripts/ui/savegame_scenes.js --out=<map> --sizes=1280x720,1920x1080
// Fills a throwaway profile with 1, 3 and 8 saves (never real storage), opens the screen in both modes, checks that
// the cards are equal, aligned on a grid and do not overlap or overflow, and takes the pictures.
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
const SG = await imp('savegame');
const S = await imp('saveslots');
const UI = await imp('saveslotsui');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (k) => { for (const t of [window]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); } };
const shot = async (name, wait = 700) => { await sleep(wait); console.log('[capture] ' + name); await sleep(500); };
w.money = 1250;
SG.saveGame(w, { toast: true });
await sleep(400);
SG.saveGame(w, { toast: true });
await sleep(400);
const base = JSON.parse(localStorage.getItem('gde-save-v1-nieuw'));
const thumb = S.readThumb(null, 1);
const NAMES = ['Mijn eerste zomer', 'Tessa-route', '', 'Proefrit', 'Reservekopie', 'Een heel lange naam voor een spel', '', 'Veilig'];
const fill = (count) => {
  for (let n = 1; n <= 8; n++) { if (n > 1) { try { S.deleteSlot(null, n); } catch (e) { /* none */ } } }
  for (let n = 2; n <= count; n++) {
    S.writeSlot(null, n, { ...base, money: 100 * n, speeltijd: 400 + n * 2300, savedAt: Date.now() - n * 7 * 3600000, character: n % 2 ? 'tammo' : 'anita' });
    if (thumb) S.writeThumb(null, n, thumb);
  }
  for (let n = 1; n <= count; n++) S.renameSlot(null, n, NAMES[n - 1]);
  S.setActive(null, 1);
};
// the check: equal cards, one grid, nothing overlapping or overflowing
const check = (label) => {
  const root = document.querySelector('#saveslots');
  const panel = root.querySelector('.ssl-panel').getBoundingClientRect();
  const cards = [...root.querySelectorAll('.ssl-card')];
  const r = cards.map((c) => c.getBoundingClientRect());
  const bad = [];
  const rd = (x) => Math.round(x * 10) / 10;
  const w0 = rd(r[0].width), h0 = rd(r[0].height);
  r.forEach((x, i) => { if (rd(x.width) !== w0 || rd(x.height) !== h0) bad.push(`kaart ${i + 1} is ${rd(x.width)}x${rd(x.height)} i.p.v. ${w0}x${h0}`); });
  const xs = [...new Set(r.map((x) => rd(x.left)))], ys = [...new Set(r.map((x) => rd(x.top)))];
  const cols = xs.length;
  r.forEach((x, i) => { if (rd(x.left) !== xs[i % cols] || (i >= cols && Math.abs(rd(x.top - r[i - cols].bottom) - rd(r[1 % r.length].left - r[0].right)) > 1 && cols > 1)) bad.push(`kaart ${i + 1} staat niet op het raster`); });
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) bad.push(`kaarten ${i + 1} en ${j + 1} overlappen`); }
  r.forEach((x, i) => { if (x.left < panel.left - 0.5 || x.right > panel.right + 0.5) bad.push(`kaart ${i + 1} valt buiten het paneel`); });
  for (const el of root.querySelectorAll('.ssl-nm, .ssl-part, .ssl-meta')) if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis') bad.push('tekst loopt over: ' + el.textContent.slice(0, 20));
  // the '…' sits in the same place on every card; the footer buttons are in the panel
  const mores = [...root.querySelectorAll('.ssl-more')].map((m, i) => { const c = m.closest('.ssl-card').getBoundingClientRect(), b = m.getBoundingClientRect(); return `${rd(b.right - c.right)},${rd(b.top - c.top)}`; });
  if (new Set(mores).size > 1) bad.push("de '…' staat niet overal op dezelfde plek");
  for (const b of root.querySelectorAll('.ssl-foot button')) { const x = b.getBoundingClientRect(); if (x.left < panel.left || x.right > panel.right || x.bottom > panel.bottom) bad.push('voetknop buiten het paneel'); }
  const grid = root.querySelector('.ssl-scroll');
  return `${label} @${innerWidth}x${innerHeight}: ${cards.length} kaarten, ${cols} kolommen, ${ys.length} rijen, ${w0}x${h0}px, scrollt: ${grid.scrollHeight > grid.clientHeight + 1}; afwijkingen: ${bad.length ? bad.join(' | ') : 'geen'}`;
};
const done = [];
for (const count of [1, 3, 8]) {
  fill(count);
  UI.openSaveSlots({ mode: 'game', world: w });
  await sleep(700);
  done.push(check(`pauze ${count}`));
  await shot(`opgeslagen-${count}`);
  if (count === 3) {
    // the '…' menu of the second card, then the question on delete
    document.querySelector('#saveslots [data-more="2"]').click();
    await shot('opgeslagen-3-menu');
    document.querySelector('#saveslots [data-do="rename"]').click();
    await shot('opgeslagen-3-hernoemen');
    key('Escape'); await sleep(300);
    document.querySelector('#saveslots [data-more="2"]').click(); await sleep(300);
    document.querySelector('#saveslots [data-do="delete"]').click();
    await shot('opgeslagen-3-verwijderen');
    key('Escape'); await sleep(200); key('Escape'); await sleep(300);
  } else { key('Escape'); await sleep(400); }
  if (document.querySelector('#saveslots')) { key('Escape'); await sleep(300); }
}
fill(3);
UI.openSaveSlots({ mode: 'start', world: w });
await sleep(700);
done.push(check('hoofdmenu 3'));
await shot('opgeslagen-hoofdmenu-3');
key('Escape'); await sleep(400);
clearInterval(skipper);
return done;
