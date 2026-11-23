// DS3 scrollaanwijzing: zet .ds-scroll en data-boven/data-onder op elk scrollgebied, zodat ds-scroll.css de rand laat vervagen
// waar nog inhoud is. Scrollgebieden komen uit de stylesheets (elke regel met overflow auto of scroll), dus een nieuw scherm
// krijgt het component zonder dat iemand een klas hoeft te zetten. Geen werk per frame: alleen bij scroll, bij een wijziging in
// de DOM (gebundeld op 250 ms) en bij een nieuwe grootte. De scan is gericht: een wijziging zoekt alleen in de nieuwe of gewijzigde
// takken (niet in het hele document), tekstwijzigingen buiten een scrollgebied doen niets, en alleen de scrollgebieden die de
// wijziging raakt (erin, erom heen of erboven) worden opnieuw gemeten. Het hele document gaat alleen bij een nieuwe stylesheet.
import { scrollRanden } from './dsmicro.js';

const SCROLLING = /^(auto|scroll|overlay)$/;
let selector = '';
let sheetCount = -1;
const tracked = new Set();   // Set (geen WeakSet): de gerichte verversing loopt erover; losgekoppelde gebieden worden bij het verversen weggehaald
const dirty = new Set();     // takken waar sinds de vorige scan iets veranderde
let dirtyAll = false;        // alles opnieuw meten (nieuwe grootte van het venster, te veel wijzigingen)
const DIRTY_MAX = 40;
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

function adopt(el) {
  if (tracked.has(el)) return;
  tracked.add(el); el.classList.add('ds-scroll'); if (resizeObs) resizeObs.observe(el);
}

// Zoekt scrollgebieden in een tak (de tak zelf en alles eronder).
function scanRoot(root) {
  if (!selector || root.nodeType !== 1) return;
  if (root.matches(selector)) adopt(root);
  for (const el of root.querySelectorAll(selector)) adopt(el);
}

function updateSelector() {
  sheetCount = document.styleSheets.length;
  // A selector the browser does not understand must not drop the rest.
  const valid = scrollSelectors(document.styleSheets).filter((s) => { try { document.createDocumentFragment().querySelector(s); return true; } catch (e) { return false; } });
  valid.push('.ds-scroll');
  selector = valid.join(',');
}

// Raakt een wijziging in `root` dit gebied (het zit erin, eromheen of het is hetzelfde)?
const touches = (el, root) => el === root || el.contains(root) || root.contains(el);

function scan() {
  let all = dirtyAll;
  dirtyAll = false;
  if (sheetCount !== document.styleSheets.length || dirty.size > DIRTY_MAX) { all = true; }
  const roots = [...dirty];
  dirty.clear();
  if (sheetCount !== document.styleSheets.length) updateSelector();
  if (all) scanRoot(document.documentElement); else for (const r of roots) scanRoot(r);
  for (const el of tracked) {
    if (!el.isConnected) { tracked.delete(el); continue; }
    if (!el.clientHeight) continue;
    if (all || roots.some((r) => touches(el, r))) refresh(el);
  }
}

// Een wijzigingsrapport van de MutationObserver: alleen wat een scrollgebied kan raken zet een scan klaar.
function noteMutations(records, schedule) {
  let any = false;
  for (const m of records) {
    if (m.type === 'childList') {
      let el = false;
      for (const n of m.addedNodes) if (n.nodeType === 1) { dirty.add(n); el = true; }
      if (el) { any = true; continue; }
      // alleen tekst of verwijderde knopen: telt alleen binnen een scrollgebied (de lengte van de inhoud verandert)
      const t = m.target;
      if (t && t.nodeType === 1 && t.closest && t.closest('.ds-scroll')) { dirty.add(t); any = true; }
    } else if (m.target && m.target.nodeType === 1) { dirty.add(m.target); any = true; }
  }
  if (any) schedule();
}
export const _scrollScan = { scan, noteMutations, tracked, dirty, init: (resizeObserver) => { resizeObs = resizeObserver; updateSelector(); } };

export function initScrollAanwijzing() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function' || initScrollAanwijzing.started) return;
  initScrollAanwijzing.started = true;
  let timer = 0;
  const schedule = () => { if (timer) return; timer = setTimeout(() => { timer = 0; scan(); }, 250); };
  const scheduleAll = () => { dirtyAll = true; schedule(); };
  if (typeof ResizeObserver !== 'undefined') resizeObs = new ResizeObserver((entries) => { for (const e of entries) dirty.add(e.target); schedule(); });
  // scroll bubbles not: catch it in the capture phase.
  document.addEventListener('scroll', (e) => { const t = e.target; if (t && t.nodeType === 1 && tracked.has(t)) refresh(t); }, { capture: true, passive: true });
  if (typeof MutationObserver !== 'undefined') new MutationObserver((records) => noteMutations(records, schedule)).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  window.addEventListener('resize', scheduleAll);
  updateSelector();
  dirtyAll = true;
  schedule();
}
