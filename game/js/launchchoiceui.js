// De startkeuze op het scherm (launchchoice.js is de regel en de tekst): de kaart "Hoe wil je spelen?" met twee grote
// knoppen, en de toestemmingskaart voor Samen spelen. Dezelfde overlay (#online-start, .os-overlay) als de naamkaart,
// dus de bootwachter en de laadschermlaag kennen hem al. Geen netwerk: de kaarten leggen alleen een antwoord vast.
// Toetsen: pijlen en WASD, 1 en 2, Enter of spatie, Escape of Backspace (Alleen). Een controller geeft dezelfde toetsen (input.js).
import { icoon } from './icons.js';
import { keyLabelHtml, keyTextHtml } from './keycap.js';
import { KEUZES, LAUNCH_TEXT, TOESTEMMING_TEKST, toetsActie } from './launchchoice.js';
import { geefToestemming, moetNaamVragen, moetToestemmingVragen } from './onlineconsent.js';
import { openOnlineStart, meerInfoHtml, wieZietWatHtml } from './onlineconsentui.js';
import { getSettings } from './settings.js';
import { trapTabInCard, bewaarFocus } from './listnav.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// De keuzekaart. `index` is de knop die de voorselectie heeft (alleen voor data-voorkeur; de focus zet mountStartKeuze).
export function launchChoiceHtml({ index = 0 } = {}) {
  const knoppen = KEUZES.map((c, i) => `<button type="button" class="sk-keuze" data-keuze="${c.id}" data-i="${i}"${i === index ? ' data-voorkeur' : ''} aria-describedby="sk-u-${c.id}" aria-keyshortcuts="${c.toets}">
      <span class="sk-ic">${icoon(c.icoon, { cls: 'sk-icoon' })}</span>
      <span class="sk-label">${esc(c.label)}</span>
      <span class="sk-toets">${keyLabelHtml(c.toets)}</span>
      <span class="sk-uitleg" id="sk-u-${c.id}">${esc(c.uitleg)}</span>
    </button>`).join('');
  return `<section class="os-kaart sk-kaart" role="dialog" aria-modal="true" aria-labelledby="sk-titel">
    <p class="os-eb">${esc(LAUNCH_TEXT.eyebrow)}</p>
    <h2 id="sk-titel">${esc(LAUNCH_TEXT.titel)}</h2>
    <div class="sk-knoppen" role="group" aria-label="${esc(LAUNCH_TEXT.aria)}">${knoppen}</div>
    <p class="sk-hulp">${LAUNCH_TEXT.hulp.map((h) => `<span>${keyTextHtml(esc(h))}</span>`).join('')}</p>
  </section>`;
}

export function toestemmingHtml() {
  const T = TOESTEMMING_TEKST;
  return `<section class="os-kaart sk-kaart" role="dialog" aria-modal="true" aria-labelledby="st-titel">
    <p class="os-eb">${esc(T.eyebrow)}</p>
    <h2 id="st-titel">${esc(T.titel)}</h2>
    <label class="os-consent"><input type="checkbox" class="m-sw os-consent-vink"> <span>${esc(T.consent)}</span></label>
    <p class="os-lead">${esc(T.info)}</p>${wieZietWatHtml()}
    <p class="os-fout" role="alert" hidden>Vink eerst het akkoord aan om verder te gaan.</p>
    <div class="os-knoppen">
      <button type="button" class="os-knop os-doorgaan" data-geef aria-keyshortcuts="Enter">${esc(T.geef)} <span class="sk-toets-in">${keyTextHtml('{ENTER}')}</span></button>
      <button type="button" class="os-knop os-alleen" data-terug aria-keyshortcuts="Escape">${esc(T.terug)} <span class="sk-toets-in">${keyTextHtml('{ESC}')}</span></button>
    </div>
  </section>`;
}

let open = null; // één kaart tegelijk
function backdrop() {
  const el = document.createElement('div');
  el.id = 'online-start';
  el.className = 'os-overlay';
  document.body.appendChild(el);
  return el;
}

// Resolvet met 'alleen' of 'samen'. Geen time-out: de kaart wacht op de speler (de bootwachter staat stil zolang #online-start bestaat).
export function openLaunchChoice({ index = 0 } = {}) {
  if (open) return open.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve('alleen');
  const el = backdrop();
  el.innerHTML = launchChoiceHtml({ index });
  const knoppen = [...el.querySelectorAll('.sk-keuze')];
  let nu = Math.min(Math.max(index, 0), knoppen.length - 1);
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const zet = (i) => { nu = i; knoppen[i].focus(); };
  const sluit = (modus) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    klaar(modus);
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') { // aria-modal: Tab blijft op de kaart
      const v = trapTabInCard(knoppen, document.activeElement, e.shiftKey);
      if (v) { e.preventDefault(); e.stopPropagation(); v.focus(); nu = knoppen.indexOf(v); }
      return;
    }
    const i = knoppen.indexOf(document.activeElement);
    const a = toetsActie(e.key, i < 0 ? nu : i);
    if (!a) return; // de rest blijft gewoon werken
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (a.focus != null) zet(a.focus); else if (a.kies) sluit(a.kies);
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.sk-keuze') : null;
    if (b) sluit(b.dataset.keuze);
  });
  knoppen.forEach((b, i) => b.addEventListener('mouseenter', () => zet(i))); // de muis volgt de focus: de knop onder de muis is de gekozen knop
  open = { promise, el };
  zet(nu);
  return promise;
}

// Resolvet met true (akkoord, bewaard in gde-settings) of false (Terug naar de keuzekaart). Alleen na Samen zonder bewaarde toestemming.
export function openToestemming({ zet = undefined } = {}) {
  if (open) return open.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(false);
  const terugFocus = bewaarFocus(); // de knop die de kaart opende krijgt de focus terug
  const el = backdrop();
  el.innerHTML = toestemmingHtml();
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const sluit = (ok) => {
    window.removeEventListener('keydown', onKey, true);
    open = null;
    try { el.remove(); } catch (e) { /* al weg */ }
    terugFocus();
    klaar(ok);
  };
  const vink = el.querySelector('.os-consent-vink');
  const fout = el.querySelector('.os-fout');
  const geef = () => {
    if (!vink.checked) { fout.hidden = false; vink.focus(); return; }
    geefToestemming(zet ? { zet } : {});
    sluit(true);
  };
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') { // aria-modal: Tab blijft op de kaart
      const v = trapTabInCard([...el.querySelectorAll('.os-consent-vink, .os-info summary, [data-geef], [data-terug]')], document.activeElement, e.shiftKey);
      if (v) { e.preventDefault(); e.stopPropagation(); v.focus(); }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Backspace') {
      if (e.target && e.target.closest && e.target.closest('input[type="text"]')) return;
      e.preventDefault(); e.stopPropagation(); sluit(false);
      return;
    }
    // #1225 (hertest 24-11): Enter staat als toets in de knop Akkoord, dus Enter doet dat ook vanaf de schakelaar (een knop of Meer info doet zelf)
    if (e.key === 'Enter' && !e.repeat) {
      if (e.target && e.target.closest && e.target.closest('button, summary')) return;
      e.preventDefault(); e.stopPropagation(); geef();
    }
  }
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-geef], [data-terug]') : null;
    if (!t) return;
    if (t.hasAttribute('data-terug')) sluit(false); else geef();
  });
  open = { promise, el };
  vink.focus();
  return promise;
}

// De poort voor alles wat met Samen spelen begint buiten de keuzekaart (het hoofdmenu, het paneel in het pauzemenu): is er nog
// geen naam, dan de kaart met naam en akkoord; is alleen het akkoord weg, dan alleen de toestemmingskaart. Resolvet true als de
// speler klaar is (of al klaar was), false bij Terug. Wie al een naam en akkoord heeft ziet niets.
export async function ensureSamenProfile() {
  const s = () => getSettings();
  if (moetNaamVragen(s())) { if (!(await openOnlineStart({ terug: true }))) return false; }
  if (moetToestemmingVragen(s())) { if (!(await openToestemming())) return false; }
  return !moetNaamVragen(s()) && !moetToestemmingVragen(s());
}
