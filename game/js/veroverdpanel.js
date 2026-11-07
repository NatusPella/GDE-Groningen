// Veroverd (#414, #435): de gebieden die je hebt veroverd. Hoort bij het verhaal, dus een tabblad onder Verhaal (eerst een
// weergave van Loopbanen). De gegevens en de tekst komen uit gebiedenui.js; dit bestand tekent het tabblad en bindt de klikken.
// #492: onderaan staat de Beleidswinkel: een klein, lokaal en blijvend voordeel per speler (beleidswinkel.js).
// Niet door een mens in beeld bekeken.
import { gebiedenHtml, kiesGebied, reisNaar, volgendeTaken, GEBIEDEN_CSS } from './gebiedenui.js';
import { bekijkIntocht } from './intochten.js';
import { fillBars } from './motion.js';
import { beleidOffers, koopBeleid } from './beleidswinkel.js';

const bars = new Map();
let cssAan = false;
let sluitMenu = null;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-veroverd';
  el.textContent = GEBIEDEN_CSS + '\n.vo-kop { display: flex; align-items: baseline; gap: 14px; padding: 12px 64px 0; } .vo-kop .m-num { font-size: 26px; }\n.vo-regel { margin: 4px 64px 0; padding: 0; font: 13px \'Arial Narrow\', Arial, sans-serif; color: var(--c-mut, rgba(240,237,228,0.72)); }\n.vo-regel b { font-weight: normal; color: #f0ede4; }\n.vo-volgende { margin: 10px 64px 0; padding: 0; }\n.vo-volgende ol { margin: 4px 0 0; padding-left: 20px; }\n.vo-volgende li { font: 13px \'Arial Narrow\', Arial, sans-serif; }\n.vo-beleid { margin: 14px 64px 22px; padding: 10px 14px; border: 1px solid var(--c-line, rgba(240,237,228,0.18)); border-radius: 8px; }\n.vo-beleid h3 { margin: 0 0 2px; font: 18px \'Bebas Neue\', \'Arial Narrow\', Arial, sans-serif; letter-spacing: 1.5px; }\n.vo-beleid p { margin: 0 0 8px; font: 13px \'Arial Narrow\', Arial, sans-serif; color: var(--c-mut, rgba(240,237,228,0.72)); }\n.vo-beleid .vo-rij { display: flex; align-items: center; gap: 10px; margin-top: 5px; font: 13px \'Arial Narrow\', Arial, sans-serif; }\n.vo-beleid .vo-rij b { font-weight: normal; color: #f0ede4; min-width: 150px; }\n.vo-beleid .vo-rij span { flex: 1; color: var(--c-mut, rgba(240,237,228,0.72)); }\n.vo-beleid .vo-rij button { font: 13px \'Arial Narrow\', Arial, sans-serif; padding: 4px 10px; border-radius: 5px; border: 1px solid var(--c-line, rgba(240,237,228,0.3)); background: rgba(240,237,228,0.08); color: inherit; cursor: pointer; }\n.vo-beleid .vo-rij button:disabled { opacity: .55; cursor: default; }';
  document.head.appendChild(el);
}

// De rijen van de Beleidswinkel: één maatregel per rij, met prijs of "aangenomen".
function beleidHtml() {
  const offers = beleidOffers();
  const rijen = offers.map((b) => `<div class="vo-rij"><b>${esc(b.naam)}</b><span>${esc(b.tekst)}</span>` +
    (b.gekocht ? '<span class="mut">Aangenomen</span>' : `<button type="button" data-beleid="${esc(b.id)}">€${b.prijs} kopen</button>`) + '</div>').join('');
  return `<div class="vo-beleid"><h3>Beleidswinkel</h3><p>Koop één keer een gemeentelijke maatregel die blijft: van lagere boetes tot een drukkere markt. Het is van jou, in je eigen opslag.</p>${rijen}</div>`;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderVeroverdPanel(el, sluit = null, world = null) {
  if (!el) return;
  if (sluit) sluitMenu = sluit;
  zetCss();
  const teken = () => {
    const g = gebiedenHtml();
    // #676: één regel in het scherm zegt wat er meetelt en wat bewust niet (de catalogusregel).
    const regel = '<p class="vo-regel"><b>Wat telt mee:</b> missies, 39 van de 47 bijbanen, 50 minigame-plekken, vondsten en geheimen. ' +
      'Eierballen, losse geheimen, postgame, lucht en dorpsuitjes tellen bewust niet mee; die staan in hun eigen lijst.</p>';
    // #676: de eerstvolgende drie taken, en de wederzijdse verwijzing met "Te doen".
    const taken = volgendeTaken(3);
    const volgende = taken.length
      ? '<div class="vo-volgende"><b>Eerstvolgende taken:</b><ol>' + taken.map((t) => '<li>' + t.naam + ' <span class="mut">· ' + t.gebied + '</span></li>').join('') + '</ol><p class="vo-regel">Je volgende taak staat ook in <b>Te doen</b>; daar zie je hem met de afstand vanaf hier.</p></div>'
      : '<div class="vo-volgende"><b>Eerstvolgende taken:</b><p class="vo-regel">Alles wat meetelt is gedaan. De titels staan hierboven.</p></div>';
    const titelRegel = taken.length && Number.isFinite(taken[0].totaal)
      ? '<p class="vo-regel">Nog ' + Math.max(0, taken[0].totaal - taken[0].klaar) + ' taken tot de titel van ' + taken[0].gebied + '.</p>' : '';
    el.innerHTML = `<div class="vo-kop"><span class="pa-total">${g.totaal}</span></div>` + volgende + titelRegel + regel +
      `<div class="m-main"><div class="m-list pa-list lb-list">${g.lijst}</div><aside class="m-pane pa-pane lb-pane gb-pane" aria-live="polite">${g.pane}</aside></div>` + beleidHtml();
    fillBars(el, bars);
  };
  teken();
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
    // #492: een maatregel kopen in de Beleidswinkel; daarna tekent het paneel opnieuw.
    const b = e.target.closest('[data-beleid]');
    if (b) {
      const melding = koopBeleid(world, b.dataset.beleid);
      if (world && world.addMessage) world.addMessage(melding, 3);
      teken();
      return;
    }
    const r = e.target.closest('[data-reis]');
    if (r) { reisNaar(r.dataset.reis, r, sluitMenu); return; }
    // #708: de intocht terugkijken vanuit Veroverd
    const i = e.target.closest('[data-intocht]');
    if (i) { bekijkIntocht(i.dataset.intocht); return; }
    const g2 = e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
  el.addEventListener('focusin', (e) => {
    const g2 = e.target.closest && e.target.closest('[data-gebied]');
    if (g2) kies(g2.dataset.gebied);
  });
}
