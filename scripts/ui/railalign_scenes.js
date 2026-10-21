// Uitlijning van de items in de zijbalk van het pauzemenu meten en laten zien (#34, #92):
//   node scripts/ui_shots.mjs --scenes=scripts/ui/railalign_scenes.js --out=<map> --sizes=1280x720,1920x1080,2560x1440
// Levert per grootte de afwijkingen: icoon-x, tekst-x, hoogte, midden van icoon en tekst, stap tussen items.
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
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
window.__debug.world.devInvuln = true;
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const mode = (a) => { const c = {}; for (const v of a) c[v] = (c[v] || 0) + 1; return Number(Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]); };
const out = [];
const ALL = ['overzicht', 'todo', 'spullen', 'garage', 'prestaties', 'fotos', 'samen', 'settings'];
for (const tab of ALL) {
  PM.openPauseMenu(tab);
  await shot('rail-' + tab, 1500);
  const rail = document.querySelector('#pause-menu .pm-rail');
  const items = [...rail.querySelectorAll('.ra[data-goto]')];
  const z = (r) => r;
  const rows = items.map((b) => {
    const r = b.getBoundingClientRect(), ic = b.querySelector('.ra-ic'), t = b.querySelector('.ra-t');
    const ir = ic ? ic.getBoundingClientRect() : null, tr = t ? t.getBoundingClientRect() : null;
    return { id: b.dataset.goto, h: +r.height.toFixed(1), icX: ir ? +(ir.left - r.left).toFixed(1) : null, icW: ir ? +ir.width.toFixed(1) : null, icMid: ir ? +(ir.top + ir.height / 2 - r.top - r.height / 2).toFixed(1) : null,
      txX: tr ? +(tr.left - r.left).toFixed(1) : null, txMid: tr ? +(tr.top + tr.height / 2 - r.top - r.height / 2).toFixed(1) : null, left: +r.left.toFixed(1), top: r.top, w: +r.width.toFixed(1), hasIc: !!(ic && ic.querySelector('path, circle, rect')) };
  });
  const bad = [];
  const mH = mode(rows.map((x) => x.h)), mIc = mode(rows.map((x) => x.icX)), mTx = mode(rows.map((x) => x.txX)), mW = mode(rows.map((x) => x.icW)), mL = mode(rows.map((x) => x.left)), mWd = mode(rows.map((x) => x.w));
  for (const x of rows) {
    const why = [];
    if (Math.abs(x.h - mH) > 0.6) why.push('hoogte ' + x.h + ' i.p.v. ' + mH);
    if (x.icX !== mIc) why.push('icoon-x ' + x.icX + ' i.p.v. ' + mIc);
    if (x.icW !== mW) why.push('icoonbreedte ' + x.icW + ' i.p.v. ' + mW);
    if (x.txX !== mTx) why.push('tekst-x ' + x.txX + ' i.p.v. ' + mTx);
    if (x.left !== mL || x.w !== mWd) why.push('rand/breedte ' + x.left + '/' + x.w + ' i.p.v. ' + mL + '/' + mWd);
    if (Math.abs(x.icMid) > 1.5 || Math.abs(x.txMid) > 2.5) why.push('midden icoon/tekst ' + x.icMid + '/' + x.txMid);
    if (!x.hasIc) why.push('geen icoon getekend');
    if (why.length) bad.push(x.id + ': ' + why.join('; '));
  }
  // de stap tussen opeenvolgende items binnen een groep
  const steps = rows.slice(1).map((x, i) => +(x.top - rows[i].top).toFixed(1));
  out.push(`${tab} @${innerWidth}x${innerHeight}: ${rows.length} items, afwijkingen: ${bad.length ? bad.join(' | ') : 'geen'}; stappen: ${[...new Set(steps)].join(',')}`);
  // het blad: begint de eerste tekst op dezelfde x als de titel (de rest van het menu)?
  const titleX = document.querySelector('#pause-menu .pm-sheet-title').getBoundingClientRect().left;
  const panel = document.querySelector(`#pause-menu [data-panel="${tab}"]`);
  let firstX = null;
  if (panel) { const w = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim() || n.parentElement.closest('[hidden]')) continue; const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width) { firstX = Math.round(b.left); break; } } }
  out.push(`  blad ${tab}: titel-x ${Math.round(titleX)}, eerste tekst-x ${firstX}, verschil ${firstX == null ? '?' : firstX - Math.round(titleX)}`);
  PM.closePauseMenu();
  await sleep(500);
}
clearInterval(skipper);
return out;
