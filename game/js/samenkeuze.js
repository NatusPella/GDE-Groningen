// Samen spelen (#95) in het hoofdmenu: Samen spelen → "Gastheer worden" of "Meedoen". Een klein scherm in dezelfde
// taal als de andere menu's (menu.css); daarna kiest de gastheer een opgeslagen spel (saveslotsui.js) en komt
// de wachtkamer (lobbyui.js) in het spel zelf.
export const SAMEN_KEUZES = [
  { act: 'host', label: 'Een spel openen', sub: 'Jij kiest het spel en nodigt tot drie anderen uit' },
  { act: 'gast', label: 'Meedoen', sub: 'Speel mee in het spel van een ander, met een kamercode of een IP-adres' },
  { act: 'lijst', label: 'Openbare sessies', sub: 'Zie welke spelers een open sessie hebben en sluit met een klik aan' },
];

let rootEl = null;
export const isSamenKeuzeOpen = () => !!rootEl;

const ensureCss = () => {
  if (document.getElementById('style-menu.css')) return;
  const link = document.createElement('link');
  link.id = 'style-menu.css'; link.rel = 'stylesheet'; link.href = new URL('./menu.css', import.meta.url).href;
  document.head.appendChild(link);
};

// opts: { onKies(act), onClose() }
export function openSamenKeuze(opts = {}) {
  if (rootEl) return;
  ensureCss();
  const lastFocus = document.activeElement;
  rootEl = document.createElement('div');
  rootEl.id = 'samenkeuze';
  rootEl.className = 'gm';
  rootEl.setAttribute('role', 'dialog');
  rootEl.setAttribute('aria-modal', 'true');
  rootEl.setAttribute('aria-labelledby', 'sk-title');
  rootEl.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(6,12,8,0.72);backdrop-filter:blur(6px);';
  rootEl.innerHTML = '<section class="m-panel" style="position:relative;inset:auto;width:min(640px,92vw);padding:36px 40px 32px;display:flex;flex-direction:column;gap:18px;">' +
    '<header class="m-head" style="padding:0"><div><span class="m-eb">Hoofdmenu</span><h1 class="m-h1" id="sk-title">Samen spelen</h1></div></header>' +
    '<p class="mut" style="margin:0;font-size:20px">Met een vriend of vriendin, tot 4 spelers. Wie het spel opent kiest het opgeslagen spel; de anderen spelen daarin mee.</p>' +
    '<div class="sk-list" role="menu" style="display:flex;flex-direction:column;gap:10px">' +
    SAMEN_KEUZES.map((k, i) => `<button type="button" role="menuitem" class="${i === 0 ? 'm-bp' : 'm-bg'} sk-item" data-act="${k.act}" style="text-align:left;display:flex;flex-direction:column;align-items:flex-start;height:auto;padding:12px 20px;gap:2px"><span style="font-size:30px;letter-spacing:0.04em">${k.label}</span><small style="font-size:18px;opacity:0.8;letter-spacing:0">${k.sub}</small></button>`).join('') +
    '<button type="button" role="menuitem" class="m-bt sk-item" data-act="terug">Terug</button></div></section>';
  document.body.appendChild(rootEl);
  const items = () => [...rootEl.querySelectorAll('.sk-item')];
  const close = (then) => {
    window.removeEventListener('keydown', onKey, true);
    rootEl.remove(); rootEl = null;
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) { /* weg */ }
    if (then) then();
  };
  const pick = (act) => { if (act === 'terug') close(opts.onClose); else close(() => opts.onKies && opts.onKies(act)); };
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key, all = items(), i = all.indexOf(document.activeElement);
    if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); e.stopPropagation(); close(opts.onClose); return; }
    if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); e.stopPropagation(); all[(i + 1) % all.length].focus(); return; }
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); e.stopPropagation(); all[(i + all.length - 1) % all.length].focus(); return; }
    e.stopPropagation(); // Enter en spatie klikken de knop zelf; houd de toetsen weg van het menu eronder
  };
  window.addEventListener('keydown', onKey, true);
  rootEl.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.sk-item'); if (b) pick(b.dataset.act); });
  items()[0].focus();
}
