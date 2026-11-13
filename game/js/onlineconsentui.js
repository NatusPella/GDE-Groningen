// Samen spelen (#530, ADR 0022): the one screen at the first start (a name and the question
// whether to play with others) and the switch in the players panel. The rules and the Dutch
// texts are in onlineconsent.js; this file is DOM only, in the style of the other screens.
// Neither the screen nor the switch connects to anything: they only record the answer in
// gde-settings, and the lobby (lobbyui.js) is still the one place that asks before connecting.
import { ONLINE_NAAM_MAX } from './lobby.js';
import { getSettings } from './settings.js';
import { EERSTE_START, SCHAKELAAR, moetVragen, kiesNaam } from './onlineconsent.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// De eerste-startkaart is één verplichte stap: een naam en één knop "Doorgaan".
// Geen tweede antwoord, geen "Later" en geen weg terug: altijd online.
export function onlineStartHtml({ naam = '', fout = '' } = {}) {
  return `<section class="os-kaart" role="dialog" aria-modal="true" aria-labelledby="os-titel">
    <p class="os-eb">Samen spelen</p>
    <h2 id="os-titel">${esc(EERSTE_START.titel)}</h2>
    <p class="os-uitleg">${esc(EERSTE_START.uitleg)}</p>
    <label class="os-label"><span>${esc(EERSTE_START.naamLabel)}</span>
      <input type="text" class="os-naam" maxlength="${ONLINE_NAAM_MAX}" spellcheck="false" autocomplete="off" placeholder="Je naam" required value="${esc(naam)}">
    </label>
    <p class="os-hint">${esc(EERSTE_START.naamHint)}</p>
    ${fout ? `<p class="os-fout" role="alert">${esc(fout)}</p>` : '<p class="os-fout" role="alert" hidden></p>'}
    <div class="os-knoppen">
      <button type="button" class="os-knop os-doorgaan" data-doorgaan>${esc(EERSTE_START.doorgaan)}</button>
    </div>
  </section>`;
}

// The switch in the players panel: reads the same key and shows it, so the panel never
// disagrees with what the game will do.
export function meedoenSchakelaarHtml(settings = getSettings()) {
  return `<div class="cs-meedoen"><label class="cs-meedoen-rij"><input type="checkbox" class="m-sw cs-meedoen-sw" data-meedoen${settings.onlineMeedoen === true ? ' checked' : ''}> <span>${esc(SCHAKELAAR.label)}</span></label>` +
    `<p class="cs-profiel-hint">${esc(SCHAKELAAR.uitleg)}</p></div>`;
}

// Het vinkje "Niet meer vragen" in de wachtkamer (#526): dezelfde toestemmingsvorm
// als de eerste-startkaart, maar compact. Eén component voor elk scherm dat dit vraagt
// (#634), met de menu-set in plaats van eigen inline stijl.
export function consentOnthoudenHtml({ label = 'Niet meer vragen', checked = false } = {}) {
  return `<label class="coop-consent m-li"><input type="checkbox" class="m-sw coop-consent-vink"${checked ? ' checked' : ''}> <span class="ss-label">${esc(label)}</span></label>`;
}

// Draws the card in any element that supports innerHTML and addEventListener (the real
// document, or a fake one in a test). A refused name stays on the screen with the reason
// (role="alert"), and nothing is written; the focus goes back to the name field.
export function mountOnlineStart(root, { naam = '', onKies = () => {} } = {}) {
  let fout = '';
  let getypt = naam; // what the field holds now, so a refused name is not wiped from under the player
  const veld = () => (root.querySelector ? root.querySelector('.os-naam') : null);
  const teken = () => {
    root.innerHTML = onlineStartHtml({ naam: getypt, fout });
    const v = veld();
    if (v && typeof v.focus === 'function') v.focus();
  };
  // De enige uitweg: Doorgaan met een geldige naam. Er is geen skip, geen Escape en geen
  // tweede knop; een lege of geweigerde naam blijft met een fout op de kaart staan.
  const kies = () => {
    const v = veld();
    if (v && 'value' in v) getypt = v.value;
    const r = kiesNaam(getypt);
    if (!r.ok) { fout = r.error; teken(); return r; }
    root.innerHTML = '';
    onKies({ ...r, keuze: 'doorgaan' });
    return r;
  };
  teken();
  root.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-doorgaan]') : null;
    if (b) kies();
  });
  root.addEventListener('keydown', (e) => {
    // Enter in het naamveld is dezelfde bewuste Doorgaan-actie; Escape doet niets (de vraag
    // kan niet overgeslagen worden). Tab blijft op de kaart.
    if (e && e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('os-naam')) {
      e.preventDefault();
      kies();
      return;
    }
    if (!e || e.key !== 'Tab' || !root.querySelectorAll) return;
    const velden = [...root.querySelectorAll('.os-naam, [data-doorgaan]')];
    if (!velden.length) return;
    const nu = velden.indexOf(e.target);
    const volgende = velden[(nu + (e.shiftKey ? -1 : 1) + velden.length) % velden.length];
    e.preventDefault();
    if (volgende && typeof volgende.focus === 'function') volgende.focus();
  });
  return { kies, teken };
}

let bezig = null;
// De overlay boven het laadscherm; resolvet pas met een geldige naam. Er is geen time-out of
// Escape die hem zonder antwoord sluit (altijd online, verplichte naam).
export function openOnlineStart({ naam = getSettings().onlineNaam } = {}) {
  if (bezig) return bezig.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(null);
  const el = document.createElement('div');
  el.id = 'online-start';
  el.className = 'os-overlay';
  document.body.appendChild(el);
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const sluit = (res) => {
    if (bezig && bezig.el === el) bezig = null;
    try { el.remove(); } catch (e) { if (el.parentNode) el.parentNode.removeChild(el); }
    klaar(res);
  };
  mountOnlineStart(el, { naam, onKies: sluit });
  bezig = { promise, el, sluit };
  return promise;
}


// What the boot calls: only a player who was never asked gets the screen.
export function maybeOpenOnlineStart(opts = {}) {
  const s = opts.settings || getSettings();
  return moetVragen(s) ? openOnlineStart(opts) : Promise.resolve(null);
}

