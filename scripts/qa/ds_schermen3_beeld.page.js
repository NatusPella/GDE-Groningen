// Page half of scripts/qa/ds_schermen3_beeld.mjs (desktop --perf-script body; designsysteem fase 3, #980):
// opent Te doen, Loopbanen, Verhaal en Veroverd zoals een speler dat doet, neemt beelden ("[capture] naam") en meet.
// window.__ds3 = { settle, prefix, stap: ['todo', 'loopbaan', 'verhaal', 'veroverd'] }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
const tap = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code || k, bubbles: true })); } };
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tap(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world;
const CFG = window.__ds3 || {};
const PRE = CFG.prefix || 'x';
const STAP = CFG.stap || ['todo', 'loopbaan', 'verhaal', 'veroverd'];
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
await sleep(CFG.settle || 8000);
const out = { stappen: [], fouten: [], venster: [innerWidth, innerHeight] };
const fps = async (ms = 1500) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); });
const geelNu = () => [...document.querySelectorAll('.ds-z-knop:not(.ds-z-knop--secundair):not(.ds-z-knop--ghost):not(.ds-z-knop--gevaar)')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.disabled).map((b) => b.textContent.trim().slice(0, 24)); // besluit eigenaar 20-11: één gele hoofdknop per scherm
const shot = async (name, wait = 900) => { await sleep(wait); out.geel = out.geel || {}; out.geel[name] = geelNu(); out.fps = out.fps || {}; out.fps[name] = await fps(600); console.log('[capture] ' + PRE + '-' + name); await sleep(600); };
const q = (s) => document.querySelector(s);
const kleinste = (el) => { let min = 99, wie = ''; for (const n of el.querySelectorAll('*')) { const heeftTekst = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()); if (!heeftTekst) continue; const r = n.getBoundingClientRect(); if (!r.width || !r.height) continue; const px = parseFloat(getComputedStyle(n).fontSize); if (px < min) { min = px; wie = (n.className && n.className.baseVal === undefined ? n.className : n.tagName) + ': ' + n.textContent.trim().slice(0, 30); } } return { px: min, wie }; };
// Hoeveel van een element is na het scrollen echt zichtbaar (alle scrolvoorouders knippen)?
const zichtbaar = (el) => {
  if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect(); let top = Math.max(0, r.top), bot = Math.min(innerHeight, r.bottom);
  for (let a = el.parentElement; a; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (/(auto|scroll|hidden|clip)/.test(cs.overflowY)) { const ar = a.getBoundingClientRect(); top = Math.max(top, ar.top); bot = Math.min(bot, ar.bottom); }
  }
  return { hoogte: Math.round(r.height), zichtbaar: Math.max(0, Math.round(bot - top)) };
};
const open = async (naam, opts) => { PM.openPauseMenu(naam, opts); await sleep(1500); };
const sluit = async () => { PM.closePauseMenu(); await sleep(500); };
out.fps0 = await fps();

if (STAP.includes('todo')) {
  await open('todo');
  const m = q('#pause-menu');
  out.todo = { kaarten: m.querySelectorAll('.td-card, .ds-z-kaart').length, chips: m.querySelectorAll('.ds-z-chip').length, knopGeel: m.querySelectorAll('.ds-z-knop:not(.ds-z-knop--secundair):not(.ds-z-knop--ghost)').length, klein: kleinste(m) };
  await shot('todo-begin', 600);
  const lijst = m.querySelector('.td-list'); if (lijst) { lijst.scrollTop = 520; await shot('todo-lijst', 500); lijst.scrollTop = 0; }
  const rij = m.querySelector('.td-list [data-todo]:not(.off)'); if (rij) { rij.click(); await sleep(500); await shot('todo-detail', 400); }
  await sluit();
}
if (STAP.includes('loopbaan')) {
  const LL = await imp('loopbaanlive');
  await open('loopbaan');
  out.loopbaanLeeg = { klein: kleinste(q('#pause-menu')), titel: (q('#pause-menu .lb-balk__t b') || {}).textContent, dood0van19: /0 van 19/.test(q('#pause-menu').innerText) };
  await shot('loopbaan-leeg', 600);
  await sluit();
  LL.startLoopbaan(w, 'trein');
  try { LL.loopbaanVerdien(w, 'trein', 120, { xp: 260, n: 3 }); } catch (e) { out.fouten.push('verdien: ' + e.message); }
  await open('loopbaan');
  out.loopbaanVoort = { klein: kleinste(q('#pause-menu')), trapRijen: document.querySelectorAll('#pause-menu .lb-trap li, #pause-menu .lb-trede').length };
  await shot('loopbaan-voort', 600);
  await sluit();
}
if (STAP.includes('verhaal')) {
  for (const sub of ['opdrachten', 'personages', 'aanwijzingen']) {
    await open('verhaal', { sub });
    out['verhaal-' + sub] = { klein: kleinste(q('#pause-menu')), missieNr: /\bM\d{1,2}\b|Missie \d+/.test(q('#pause-menu').innerText) };
    await shot('verhaal-' + sub, 800);
    await sluit();
  }
}
if (STAP.includes('veroverd')) {
  await open('veroverd');
  const m = q('#pause-menu');
  const bw = m.querySelector('.bw-beleid');
  out.veroverd = { beleid: !!bw, bereik: zichtbaar(bw), klein: kleinste(m), tabs: [...m.querySelectorAll('.ds-tab, [data-vo-tab]')].map((t) => t.textContent.trim()) };
  await shot('veroverd', 600);
  // de gebiedenlijst staat onder de taken in hetzelfde scrolvlak: scrol naar beneden en meet of hij echt zichtbaar is
  const gb = m.querySelector('.vo-gebieden'); const lst = m.querySelector('.vo-gebieden .m-list');
  if (gb && lst) { gb.scrollTop = gb.scrollHeight; out.veroverdLijst = zichtbaar(lst); await shot('veroverd-lijst', 500); gb.scrollTop = 0; }
  if (bw && !bw.closest('[hidden]')) { bw.scrollIntoView({ block: 'center' }); await shot('veroverd-beleid', 500); }
  const tab = m.querySelector('[data-vo-tab="beleid"]');
  if (tab) { tab.click(); await sleep(500); out.veroverdBeleidTab = { bereik: zichtbaar(m.querySelector('.bw-beleid')) }; await shot('veroverd-beleidtab', 500); }
  await sluit();
}
clearInterval(skipper);
return JSON.stringify(out);
