// Samen spelen: één overlaycomponent voor de schermen die de wereld stilzetten (#636):
// wachten op een speler, wegvallen en het spel overdragen. Eén surface met de menu-set
// (.gm, .m-bp/.m-bg, tokens), één primaire knop en aria-modal; de aanroeper levert de
// titel, de tekst en de knoppen. De HTML-functie is puur (testbaar zonder DOM).
import { knopToets, shortcutName } from './dsbutton.js';
import { escapeHtml as esc } from './htmlescape.js';

// #1220: de actienaam is `action`; een knop met alleen `id` werd stil weggelaten (een vraag zonder knoppen). Nu geldt `id` als terugval.
const actieVan = (b) => (b && (b.action || b.id)) || '';

export function overlayHtml({ title = '', text = '', buttons = [], label = '' } = {}) {
  const knoppen = (Array.isArray(buttons) ? buttons : []).map((b) => {
    const actie = actieVan(b);
    if (!actie || !b.label) return '';
    // toets: de sneltoets (J, N) als toetsplaatje IN de knop (DS3); het plaatje wisselt zelf naar de knop van de controller
    const kap = b.toets ? knopToets(b.toets) : '';
    // #1220: een DS3-kaart met DS3-knoppen (zeefdruk, toets in de knop); de menuklassen blijven staan voor de focus en de tests
    return `<button type="button" class="cp-btn${b.primary ? ' cp-primary' : ' ds-z-knop--secundair'} ds-z-knop${kap ? ' ds-z-knop--toets' : ''}" data-cp-action="${esc(actie)}"${b.toets ? ` aria-keyshortcuts="${esc(shortcutName(b.toets))}"` : ''}><span class="ds-z-knop__label">${esc(b.label)}</span>${kap}</button>`;
  }).join('');
  return `<section class="gm cp-overlay" role="dialog" aria-modal="true" aria-label="${esc(label || title || 'Samen spelen')}" data-cp-overlay>
  <div class="cp-pane ds-zeef ds-z-kaart ds-z-kaart--recht">${title ? `<div class="ds-z-kaart__kop"><h2 class="cp-title ds-z-kaart__titel">${esc(title)}</h2></div>` : ''}${text ? `<p class="cp-text ds-z-kaart__tekst">${esc(text)}</p>` : ''}${knoppen ? `<div class="cp-actions">${knoppen}</div>` : ''}</div>
</section>`;
}

// Hangt de overlay aan de pagina (of aan `target`) en geeft hem terug. set() tekent
// opnieuw met dezelfde knoppen en dezelfde actieafhandeling; close() ruimt alles op.
export function mountOverlay({ title = '', text = '', buttons = [], label = '', onAction = null, target = null } = {}) {
  if (typeof document === 'undefined') return null;
  const host = document.createElement('div');
  host.innerHTML = overlayHtml({ title, text, buttons, label });
  const el = host.firstElementChild;
  const pane = el && el.querySelector('.cp-pane');
  const root = target || document.body;
  if (!el || !root) return null;
  root.appendChild(el);
  const klik = (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-cp-action]') : null;
    if (b && onAction) onAction(b.getAttribute('data-cp-action'));
  };
  el.addEventListener('click', klik);
  const focus = () => { const b = el.querySelector('.cp-primary') || el.querySelector('button'); if (b && b.focus) b.focus({ preventScroll: true }); };
  focus();
  return {
    el, pane,
    // Tekent dezelfde surface opnieuw (andere titel/tekst/knoppen); de klikafhandeling blijft.
    render(nieuw = {}) {
      const o = { title, text, buttons, label, ...nieuw };
      const tmp = document.createElement('div');
      tmp.innerHTML = overlayHtml(o);
      const vers = tmp.firstElementChild;
      if (!vers) return;
      el.className = vers.className;
      for (const a of ['role', 'aria-modal', 'aria-label']) { const v = vers.getAttribute(a); if (v) el.setAttribute(a, v); }
      el.innerHTML = vers.innerHTML;
      focus();
    },
    close() { try { el.removeEventListener('click', klik); el.remove(); } catch (e) { /* al weg */ } },
    focus,
  };
}
