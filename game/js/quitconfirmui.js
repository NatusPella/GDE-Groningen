// De vraag "Weet je het zeker?" bij Afsluiten op het startscherm (#915). Het pauzemenu heeft zijn eigen vraag
// (pausemenu.js, data-quit-confirm); dit is dezelfde regel voor de knop Afsluiten in het hoofdmenu, op de
// overlay van de startkeuze (.os-overlay, onlineconsent.css). Annuleren heeft de voorselectie, zodat een
// verdwaalde Enter niets sluit. Geen opslag, geen netwerk. Samen spelen: lokaal, het sluit alleen dit venster.
export const QUIT_TEXT = {
  eyebrow: 'Afsluiten',
  titel: 'Weet je het zeker?',
  uitleg: 'Je voortgang staat al opgeslagen. Je kunt later gewoon verdergaan waar je nu bent.',
  ja: 'Ja, afsluiten',
  nee: 'Annuleren',
};

let open = null;
export function isQuitConfirmOpen() { return !!open; }

// onYes wordt aangeroepen bij Ja; onNo bij Annuleren, Escape of Backspace. Geeft false als er al een vraag staat of geen DOM is.
export function askQuitConfirm({ onYes = () => {}, onNo = () => {} } = {}) {
  if (open || typeof document === 'undefined' || !document.body) return false;
  const el = document.createElement('div');
  el.id = 'quit-confirm';
  el.className = 'os-overlay';
  el.innerHTML = `<section class="os-kaart" role="alertdialog" aria-modal="true" aria-labelledby="qc-titel" aria-describedby="qc-uitleg">
    <p class="os-eb">${QUIT_TEXT.eyebrow}</p>
    <h2 id="qc-titel">${QUIT_TEXT.titel}</h2>
    <p class="os-uitleg" id="qc-uitleg">${QUIT_TEXT.uitleg}</p>
    <div class="os-knoppen"><button type="button" class="os-knop os-doorgaan" data-qc="nee">${QUIT_TEXT.nee}</button><button type="button" class="os-knop os-alleen" data-qc="ja">${QUIT_TEXT.ja}</button></div>
  </section>`;
  document.body.appendChild(el);
  const klaar = (ja) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    (ja ? onYes : onNo)();
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) klaar(false); return; }
    const knoppen = [...el.querySelectorAll('[data-qc]')];
    const i = knoppen.indexOf(document.activeElement);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation();
      knoppen[(Math.max(i, 0) + 1) % knoppen.length].focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat && i >= 0) klaar(knoppen[i].dataset.qc === 'ja');
    }
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-qc]') : null;
    if (t) klaar(t.dataset.qc === 'ja');
  });
  open = el;
  const eerste = el.querySelector('[data-qc="nee"]');
  if (eerste) eerste.focus();
  return true;
}
