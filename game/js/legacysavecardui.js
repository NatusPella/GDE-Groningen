// De kaart "Nieuw verhaal" op het scherm (22-11; legacysave.js is de regel en de tekst). Dezelfde overlay als de afsluitvraag en de
// startkeuze (.os-overlay, onlineconsent.css; DS3: toets in de knop, zichtbare focus, microanimatie uit bij Beweging beperken). Voor de
// paden die een save zonder het Opgeslagen-spellen-scherm laden (de boot, Doorgaan in het hoofdmenu); dat scherm heeft dezelfde kaart zelf
// (saveslotsui.js). Doorgaan heeft de voorselectie en de Enter-toets in de knop; Escape en Backspace doen niets, want de speler moet kiezen.
// Pijlen, Tab en een controller (gamepad.js geeft dezelfde toetsen) wisselen van knop. Geen opslag, geen netwerk: de aanroeper zet de vlag.
import { LEGACY_CARD } from './legacysave.js';
import { keyLabelHtml } from './keycap.js';
import { navIndex, trapTabInCard } from './listnav.js';
import { escapeHtml as esc } from './htmlescape.js';

let open = null;
const ARIA_ENTER = 'Enter'; // naam van de toets in aria-keyshortcuts (geen spelertekst)
export function isLegacyCardOpen() { return !!open; }


export function legacyCardHtml() {
  return `<section class="os-kaart" role="alertdialog" aria-modal="true" aria-labelledby="ok-titel" aria-describedby="ok-tekst">
    <h2 id="ok-titel">${esc(LEGACY_CARD.titel)}</h2>
    <p class="os-uitleg" id="ok-tekst">${esc(LEGACY_CARD.tekst)} <span class="os-gevolg">${esc(LEGACY_CARD.gevolg)}</span></p>
    <div class="os-knoppen"><button type="button" class="os-knop os-doorgaan" data-ok="door" aria-keyshortcuts="${ARIA_ENTER}">${esc(LEGACY_CARD.doorgaan)} <span class="sk-toets-in">${keyLabelHtml('Enter')}</span></button><button type="button" class="os-knop os-alleen" data-ok="nieuw" aria-keyshortcuts="N">${esc(LEGACY_CARD.nieuw)} <span class="sk-toets-in">${keyLabelHtml('N')}</span></button></div>
  </section>`;
}

// onDoorgaan: de oude save laden zoals hij is; onNieuw: een nieuw spel zonder de oude te wissen. Geeft false als er al een kaart staat of geen DOM is.
export function askLegacyCard({ onDoorgaan = () => {}, onNieuw = () => {} } = {}) {
  if (open || typeof document === 'undefined' || !document.body) return false;
  const el = document.createElement('div');
  el.id = 'legacy-save-card';
  el.className = 'os-overlay';
  el.innerHTML = legacyCardHtml();
  document.body.appendChild(el);
  const knoppen = () => [...el.querySelectorAll('[data-ok]')];
  const finish = (door) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    (door ? onDoorgaan : onNieuw)();
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const list = knoppen();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); return; }
    if ((e.key === 'n' || e.key === 'N') && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) finish(false); return; } // #1226: ook Nieuw spel heeft zijn toets
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat && i >= 0) finish(list[i].dataset.ok === 'door');
      return;
    }
    if (e.key === 'Tab') {
      const v = trapTabInCard(list, document.activeElement, e.shiftKey);
      if (v) { e.preventDefault(); e.stopPropagation(); v.focus(); }
      return;
    }
    const naar = navIndex(list.length, i, e.key, { wrap: true });
    if (naar >= 0) { e.preventDefault(); e.stopPropagation(); list[naar].focus(); }
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-ok]') : null;
    if (t) finish(t.dataset.ok === 'door');
  });
  open = el;
  const eerste = el.querySelector('[data-ok="door"]');
  if (eerste) eerste.focus();
  return true;
}
