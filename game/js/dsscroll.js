// DS3 scrollaanwijzing: zet .ds-scroll en data-boven/data-onder op elk scrollgebied, zodat ds-scroll.css de rand laat vervagen
// waar nog inhoud is. Scrollgebieden komen uit de stylesheets (elke regel met overflow auto of scroll), dus een nieuw scherm
// krijgt het component zonder dat iemand een klas hoeft te zetten. Geen werk per frame: alleen bij scroll, bij een wijziging in
// de DOM (gebundeld op 250 ms) en bij een nieuwe grootte.
import { scrollRanden } from './dsmicro.js';

const SCROLLING = /^(auto|scroll|overlay)$/;
let selector = '';
let sheetCount = -1;
const tracked = new WeakSet();
let resizeObs = null;

// Selectors van alle regels die zelf scrollen. Pseudo-elementen (scrollbar-opmaak) tellen niet mee.
export function scrollSelectors(sheets) {
  const found = new Set();
  const walk = (rules) => {
    for (const r of rules || []) {
      if (r.cssRules && !r.selectorText) { try { walk(r.cssRules); } catch (e) { /* cross-origin */ } continue; }
      const st = r.style;
      if (!st || !r.selectorText) continue;
      const y = st.overflowY || st.overflow;
      if (y && SCROLLING.test(y.split(/\s+/).pop())) {
        for (const s of r.selectorText.split(',')) { const t = s.trim(); if (t && !/::?(before|after|-webkit-)/.test(t)) found.add(t); }
      }
    }
  };
  for (const sh of sheets || []) { try { walk(sh.cssRules); } catch (e) { /* cross-origin */ } }
  return [...found];
}

function refresh(el) {
  const r = scrollRanden(el);
  const top = r.boven ? '1' : '0', bottom = r.onder ? '1' : '0';
  if (el.dataset.boven !== top) el.dataset.boven = top;
  if (el.dataset.onder !== bottom) el.dataset.onder = bottom;
}

function scan() {
  if (sheetCount !== document.styleSheets.length) {
    sheetCount = document.styleSheets.length;
    // A selector the browser does not understand must not drop the rest.
    const valid = scrollSelectors(document.styleSheets).filter((s) => { try { document.createDocumentFragment().querySelector(s); return true; } catch (e) { return false; } });
    selector = valid.join(',');
  }
  const areas = new Set(document.querySelectorAll('.ds-scroll'));
  if (selector) for (const el of document.querySelectorAll(selector)) areas.add(el);
  for (const el of areas) {
    if (!tracked.has(el)) { tracked.add(el); el.classList.add('ds-scroll'); if (resizeObs) resizeObs.observe(el); }
    if (el.clientHeight) refresh(el);
  }
}

export function initScrollAanwijzing() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function' || initScrollAanwijzing.started) return;
  initScrollAanwijzing.started = true;
  let timer = 0;
  const schedule = () => { if (timer) return; timer = setTimeout(() => { timer = 0; scan(); }, 250); };
  if (typeof ResizeObserver !== 'undefined') resizeObs = new ResizeObserver(schedule);
  // scroll bubbles not: catch it in the capture phase.
  document.addEventListener('scroll', (e) => { const t = e.target; if (t && t.nodeType === 1 && tracked.has(t)) refresh(t); }, { capture: true, passive: true });
  if (typeof MutationObserver !== 'undefined') new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  window.addEventListener('resize', schedule);
  schedule();
}
