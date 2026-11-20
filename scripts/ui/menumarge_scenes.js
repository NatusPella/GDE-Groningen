// Linkermarge van elk menupaneel: waar begint de koptekst, het zoekveld, de eerste tab en de lijsttekst? Meldt wat links van de kop begint.
// Meet ook of het lettertype van de knopplaatjes geladen is en of een tab zonder toetsenbordfocus toch een kader heeft.
// node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/menumarge_scenes.js
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
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
const TABS = [['spel'], ['verhaal'], ['todo'], ['loopbaan'], ['map'], ['spullen'], ['garage'], ['veroverd'], ['prestaties'], ['fotos'], ['settings'], ['streken'], ['boerderij'], ['controls']];
const SUBS = { spel: ['overzicht', 'samen', 'acties'], verhaal: ['opdrachten', 'personages', 'aanwijzingen'], settings: ['video', 'a11y'], controls: ['toetsen', 'knoppen', 'overzicht', 'aanraken', 'hulp'] };
const info = [];
await document.fonts.ready; info.push('klaar ' + innerWidth + 'x' + innerHeight);

const meet = () => {
  const root = document.querySelector('#pause-menu .pm-sheet') || document.querySelector('#pause-menu');
  const rail = root.querySelector('.pm-rail');
  const h1 = root.querySelector('[data-panel]:not([hidden]) .m-h1, .m-h1');
  const h1x = h1 ? h1.getBoundingClientRect().left : null;
  const uit = new Map();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const panel = root.querySelector('[data-panel]:not([hidden])') || root;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue;
    const e = n.parentElement; if (!e || !panel.contains(e) || (rail && rail.contains(e))) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
    if (b.width < 2 || b.bottom < 0 || b.top > innerHeight) continue;
    if (h1x != null && b.left < h1x - 2) { const k = (typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName); if (!uit.has(k)) uit.set(k, `${k} "${t.slice(0, 18)}" x=${Math.round(b.left)}`); }
  }
  const zoek = panel.querySelector('.pm-csearch, .m-inp'); const tab = panel.querySelector('.m-tab');
  return { h1x: h1x && Math.round(h1x), zoekx: zoek && Math.round(zoek.getBoundingClientRect().left), tabx: tab && Math.round(tab.getBoundingClientRect().left), uit: [...uit.values()] };
};
const tabKaders = () => [...document.querySelectorAll('#pause-menu .m-tab')].filter((t) => t.getClientRects().length).filter((t) => { const cs = getComputedStyle(t); return t.getAttribute('aria-selected') !== 'true' && !t.matches(':focus-visible') && ((parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') || cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none' && cs.borderTopColor !== 'rgba(0, 0, 0, 0)'); }).map((t) => t.textContent.trim().slice(0, 20));
for (const [tab] of TABS) {
  for (const sub of (SUBS[tab] || [null])) {
    try { PM.openPauseMenu(tab, sub ? { sub } : {}); } catch (e) { info.push(tab + ' FOUT ' + e.message); continue; }
    await sleep(1300);
    const m = meet(); const kad = tabKaders();
    if (m.uit.length || kad.length || (m.zoekx != null && m.zoekx !== m.h1x)) info.push(`${tab}${sub ? '/' + sub : ''} kop=${m.h1x} zoek=${m.zoekx}` + (m.uit.length ? ' LINKS:' + m.uit.map((x) => x.replace(/ "[^"]*"/, '')).join('|') : '') + (kad.length ? ' KADER:' + kad.join(',') : ''));
    PM.closePauseMenu();
  }
}
clearInterval(skipper);
return info;
