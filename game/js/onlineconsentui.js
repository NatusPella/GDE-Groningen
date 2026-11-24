// Samen spelen (#530, ADR 0022): the one screen at the first start (only a name, 21-11: the
// online agreement comes with Samen spelen, launchchoiceui.js) and the switch in the players panel. The rules and the Dutch
// texts are in onlineconsent.js; this file is DOM only, in the style of the other screens.
// Neither the screen nor the switch connects to anything: they only record the answer in
// gde-settings, and the lobby (lobbyui.js) is still the one place that asks before connecting.
import { ONLINE_NAAM_MAX } from './lobby.js';
import { oskKnop } from './oskview.js';
import { getSettings } from './settings.js';
import { EERSTE_START, SCHAKELAAR, ONLINE_INSTELLING, WIE_ZIET_WAT, WIE_ZIET_WAT_VOET, kiesNaam, wijzigNaam, zetMeedoen } from './onlineconsent.js';
import { magOnline } from './settings.js';
import { bewaarFocus } from './listnav.js';
import { keyTextHtml } from './keycap.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// De kaart "Je naam voor Samen spelen": een verplichte naam en het akkoord (vinkje met de IP-melding), één knop "Doorgaan".
// Hij komt alleen als de speler iets met Samen spelen doet (launchchoice.js); `terug` voegt Terug toe (naar de keuze).
// De uitleg achter het vinkje: een uitklapper (details), standaard dicht; met Tab en Enter of de muis te openen.
export const meerInfoHtml = (label, tekst) => `<details class="os-info"><summary>${esc(label)}</summary><p class="os-info-tekst">${esc(tekst)}</p></details>`;

// De tabel "Wie ziet wat" (puur): per partij wat die ziet. Geen jargon in de koppen.
export const wieZietWatHtml = () => `<div class="os-wie"><b class="os-wie-kop">${esc(EERSTE_START.wieZietWat)}</b><table><tbody>${WIE_ZIET_WAT.map((r) => `<tr${r.niets ? ' class="os-wie-niets"' : ''}><th scope="row">${esc(r.wie)}<small>${esc(r.klein)}</small></th><td>${esc(r.ziet)}</td></tr>`).join('')}</tbody></table><p class="os-wie-voet">${esc(WIE_ZIET_WAT_VOET)}</p></div>`;

export function onlineStartHtml({ naam = '', fout = '', consent = false, terug = false } = {}) {
  return `<section class="os-kaart" role="dialog" aria-modal="true" aria-labelledby="os-titel">
    <h2 id="os-titel">${esc(EERSTE_START.titel)}</h2>
    <label class="os-label"><span>${esc(EERSTE_START.naamLabel)}</span>
      <input type="text" class="os-naam" data-osk="naam" data-osk-check="online-naam" data-osk-label="Online naam" maxlength="${ONLINE_NAAM_MAX}" spellcheck="false" autocomplete="off" placeholder="Zo zien de anderen je" required value="${esc(naam)}">${oskKnop('je naam')}
    </label>
    <label class="os-consent"><input type="checkbox" class="m-sw os-consent-vink"${consent ? ' checked' : ''}> <span>${esc(EERSTE_START.consent)}</span></label>
    ${wieZietWatHtml()}
    ${fout ? `<p class="os-fout" role="alert">${esc(fout)}</p>` : '<p class="os-fout" role="alert" hidden></p>'}
    <div class="os-knoppen">
      <button type="button" class="os-knop os-doorgaan" data-doorgaan aria-keyshortcuts="Enter">${esc(EERSTE_START.doorgaan)} <span class="sk-toets-in">${keyTextHtml('{ENTER}')}</span></button>
      ${terug ? `<button type="button" class="os-knop os-alleen" data-terug>${esc(EERSTE_START.terug)} <span class="sk-toets-in">${keyTextHtml('{ESC}')}</span></button>` : ''}
    </div>
  </section>`;
}

// Het spelerspaneel: geen keuze meer, het spel speelt altijd online (eigenaarsbeslissing #530).
export function meedoenSchakelaarHtml() {
  return `<div class="cs-meedoen"><p class="cs-profiel-hint">Bij elke start kies je Alleen of Samen spelen; alleen bij Samen spelen gaat er iets naar buiten. Andere spelers zien je alleen als je een sessie deelt.</p></div>`;
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
export function mountOnlineStart(root, { naam = '', onKies = () => {}, onTerug = null } = {}) {
  let fout = '';
  let getypt = naam;
  let aangevinkt = false; // what the field holds now, so a refused name is not wiped from under the player
  const veld = () => (root.querySelector ? root.querySelector('.os-naam') : null);
  const teken = () => {
    root.innerHTML = onlineStartHtml({ naam: getypt, fout, consent: aangevinkt, terug: !!onTerug });
    const v = veld();
    if (v && typeof v.focus === 'function') v.focus();
  };
  // De enige uitweg: Doorgaan met een geldige naam. Er is geen skip, geen Escape en geen
  // tweede knop; een lege of geweigerde naam blijft met een fout op de kaart staan.
  const kies = () => {
    const v = veld();
    if (v && 'value' in v) getypt = v.value;
    const vink = root.querySelector ? root.querySelector('.os-consent-vink') : null;
    if (vink && 'checked' in vink) aangevinkt = !!vink.checked;
    const r = kiesNaam(getypt, { consent: vink && 'checked' in vink ? aangevinkt : true });
    if (!r.ok) {
      fout = r.error; teken();
      if (/toestemming/.test(fout)) { const c = root.querySelector && root.querySelector('.os-consent-vink'); if (c && c.focus) c.focus(); }
      return r;
    }
    root.innerHTML = '';
    onKies({ ...r, keuze: 'doorgaan' });
    return r;
  };
  teken();
  root.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[data-terug]') : null;
    if (t && onTerug) { root.innerHTML = ''; onTerug(); return; }
    const b = e.target && e.target.closest ? e.target.closest('[data-doorgaan]') : null;
    if (b) kies();
  });
  root.addEventListener('keydown', (e) => {
    // Enter in het naamveld is dezelfde bewuste Doorgaan-actie; Escape is Terug (als dat er is, anders niets: de naam
    // en het akkoord zijn verplicht voor Samen spelen). Tab blijft op de kaart.
    if (e && e.key === 'Escape' && onTerug) { e.preventDefault(); root.innerHTML = ''; onTerug(); return; }
    if (e && e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('os-naam')) {
      e.preventDefault();
      kies();
      return;
    }
    if (!e || e.key !== 'Tab' || !root.querySelectorAll) return;
    const velden = [...root.querySelectorAll('.os-naam, .os-consent-vink, .os-info summary, [data-doorgaan], [data-terug]')];
    if (!velden.length) return;
    const nu = velden.indexOf(e.target);
    const volgende = velden[(nu + (e.shiftKey ? -1 : 1) + velden.length) % velden.length];
    e.preventDefault();
    if (volgende && typeof volgende.focus === 'function') volgende.focus();
  });
  return { kies, teken };
}

let bezig = null;
// De overlay boven het laadscherm; resolvet met de uitkomst van een geldige naam plus akkoord, of met null als de speler Terug koos
// (alleen met `terug`). Er is geen time-out die hem zonder antwoord sluit.
export function openOnlineStart({ naam = getSettings().onlineNaam, terug = false } = {}) {
  if (bezig) return bezig.promise;
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(null);
  const el = document.createElement('div');
  el.id = 'online-start';
  el.className = 'os-overlay';
  const terugFocus = bewaarFocus(); // de knop die de kaart opende (Samen spelen in het menu) krijgt de focus terug
  document.body.appendChild(el);
  let klaar = () => {};
  const promise = new Promise((r) => { klaar = r; });
  const sluit = (res) => {
    if (bezig && bezig.el === el) bezig = null;
    try { el.remove(); } catch (e) { if (el.parentNode) el.parentNode.removeChild(el); }
    terugFocus();
    klaar(res);
  };
  mountOnlineStart(el, { naam, onKies: sluit, onTerug: terug ? () => sluit(null) : null });
  bezig = { promise, el, sluit };
  return promise;
}

// Instellingen, Samen spelen: het naamveld (met dezelfde filter als de kaart) en het akkoord intrekken of weer geven.
export function onlineInstellingHtml({ naam = '', meedoen = false, fout = '', melding = '' } = {}) {
  const T = ONLINE_INSTELLING;
  return `<div class="os-inst">
    <label class="os-label"><span>${esc(T.naamLabel)}</span>
      <input type="text" class="os-naam os-inst-naam" data-osk="naam" data-osk-check="online-naam" data-osk-label="Online naam" maxlength="${ONLINE_NAAM_MAX}" spellcheck="false" autocomplete="off" placeholder="Zo zien de anderen je" value="${esc(naam)}">${oskKnop('je naam')}
    </label>
    <div class="os-knoppen"><button type="button" class="os-knop os-alleen" data-naam-bewaar>${esc(T.bewaar)}</button></div>
    ${fout ? `<p class="os-fout" role="alert">${esc(fout)}</p>` : melding ? `<p class="os-hint" role="status">${esc(melding)}</p>` : ''}
    <p class="os-uitleg">${esc(meedoen ? T.akkoordAan : T.akkoordUit)}</p>${wieZietWatHtml()}
    <div class="os-knoppen">${meedoen ? `<button type="button" class="os-knop os-alleen" data-akkoord-in>${esc(T.intrekken)}</button>` : ''}</div>
  </div>`;
}

// Tekent het paneel in `root` en bindt de knoppen (één keer). Het akkoord geven gebeurt alleen bij Samen spelen (de kaart); hier alleen intrekken.
export function mountOnlineInstelling(root, { world = null } = {}) {
  if (!root) return;
  let fout = '', melding = '';
  const teken = (naam) => { root.innerHTML = onlineInstellingHtml({ naam: naam ?? getSettings().onlineNaam, meedoen: magOnline(), fout, melding }); };
  teken();
  if (root.dataset && root.dataset.gebonden) return;
  if (root.dataset) root.dataset.gebonden = '1';
  root.addEventListener('click', (e) => {
    const c = e.target && e.target.closest ? e.target.closest.bind(e.target) : null;
    if (!c) return;
    if (c('[data-naam-bewaar]')) {
      const v = root.querySelector('.os-inst-naam');
      const typ = v ? v.value : '';
      const r = wijzigNaam(typ);
      fout = r.ok ? '' : r.error; melding = r.ok ? ONLINE_INSTELLING.bewaard : '';
      teken(r.ok ? r.naam : typ);
    } else if (c('[data-akkoord-in]')) {
      zetMeedoen(false, { world });
      fout = ''; melding = '';
      teken();
    }
  });
}
