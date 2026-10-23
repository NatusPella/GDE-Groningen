// Veroverd (#414, #435): de gebieden die je hebt veroverd. Hoort bij het verhaal, dus een tabblad onder Verhaal (eerst een
// weergave van Loopbanen). De gegevens en de tekst komen uit gebiedenui.js; dit bestand tekent het tabblad en bindt de klikken.
// Niet door een mens in beeld bekeken.
import { gebiedenHtml, kiesGebied, reisNaar, GEBIEDEN_CSS } from './gebiedenui.js';
import { fillBars } from './motion.js';

const bars = new Map();
let cssAan = false;
let sluitMenu = null;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-veroverd';
  el.textContent = GEBIEDEN_CSS + '\n.vo-kop { display: flex; align-items: baseline; gap: 14px; padding: 12px 64px 0; } .vo-kop .m-num { font-size: 26px; }';
  document.head.appendChild(el);
}

export function renderVeroverdPanel(el, sluit = null) {
  if (!el) return;
  if (sluit) sluitMenu = sluit;
  zetCss();
  const g = gebiedenHtml();
  el.innerHTML = `<div class="vo-kop"><span class="pa-total">${g.totaal}</span></div>` +
    `<div class="m-main"><div class="m-list pa-list lb-list">${g.lijst}</div><aside class="m-pane pa-pane lb-pane gb-pane" aria-live="polite">${g.pane}</aside></div>`;
  fillBars(el, bars);
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  let gebied = null;
  const kies = (id) => {
    if (!id || id === gebied) return;
    gebied = id;
    for (const b of el.querySelectorAll('[data-gebied]')) { const aan = b.dataset.gebied === id; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
    el.querySelector('.lb-pane').innerHTML = kiesGebied(id);
    queueMicrotask(() => fillBars(el, bars));
  };
  el.addEventListener('click', (e) => {
    const r = e.target.closest('[data-reis]');
    if (r) { reisNaar(r.dataset.reis, r, sluitMenu); return; }
    const g2 = e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
  el.addEventListener('focusin', (e) => {
    const g2 = e.target.closest && e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
}
