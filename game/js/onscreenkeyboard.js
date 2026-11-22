// Het schermtoetsenbord voor een controllerspeler (#1011, #495): één bedrading voor ALLE tekstvelden. Een veld krijgt `data-osk="naam|code|tekst|
// wachtwoord|zoek|cijfers"` (plus optioneel data-osk-label, -max, -check, -chips) en de rest regelt dit bestand: A op het veld (of een
// klik op de knop 'Toetsenbord' ernaast, of focus terwijl de laatst gebruikte invoer een controller is) opent een kaart onderin het
// scherm. Toetsenbord en muis behouden het gewone veld; aanraking gebruikt het systeemtoetsenbord. De invoer is lokaal en gaat nergens heen.
// De logica (indelingen, raster, controle) staat puur in oskmodel.js, de tekening in oskview.js, de indeling van de knoppen in
// controls.js PAD_MAPS.osk (gamepad.js kiest die indeling zolang <html> de klasse osk-open heeft).
import { createState, buildGrid, handleKey, pressKey, focusAt, insertText, defaultChips, saveNameSuggestion, bevestig, annuleer, GDE2_PREFIX, OSK_KINDS } from './oskmodel.js';
import { renderOsk } from './oskview.js';
import { isTextField, readClip } from './textfield.js';
import { getDevice, onDeviceChange } from './inputdevice.js';
import { profielNaam } from './lobby.js';
import { schoonNaam } from './net/serverlijst.js';

// Dezelfde controles als de rest van Samen spelen (constitutie 10: een lijst verboden woorden, geen echte persoonsnamen in sessienamen)
const CHECKS = new Map([['online-naam', (t) => profielNaam(t)], ['sessie-naam', (t) => schoonNaam(t)]]);
/** Een veld controleert zijn invoer met een eigen functie (tekst) => { ok, reason }; data-osk-check="naam" wijst ernaar. */
export function registerOskCheck(name, fn) { if (typeof fn === 'function') CHECKS.set(name, fn); }

// Recente invoer, alleen in het geheugen van deze sessie (nooit opgeslagen): zoekopdrachten en kamercodes. Een directe code (GDE2-)
// bevat een IP-adres en komt er nooit in (constitutie 10).
const RECENT = { zoek: [], code: [] };
const RECENT_MAX = 3;
export function noteRecent(soort, tekst) {
  const t = String(tekst || '').trim();
  if (!t || !RECENT[soort]) return;
  if (soort === 'code' && (/^GDE2-/i.test(t) || /\d+\.\d+\.\d+/.test(t))) return;
  RECENT[soort] = [t, ...RECENT[soort].filter((x) => x !== t)].slice(0, RECENT_MAX);
}
export const recentVan = (soort) => (RECENT[soort] || []).slice();

let st = null;          // de stand van het open toetsenbord
let root = null;        // de overlay in de pagina
let target = null;      // het tekstveld
let targetKey = '';     // om het veld terug te vinden als het scherm opnieuw getekend is
let parked = null;      // het veld dat net gesloten is: het opent niet meteen weer door focus
let lastArrowAt = 0;     // wanneer het pad laatst een pijl stuurde: tussen velden doorlopen opent niets
let uitDevice = null;
let wired = false;

const ARROW_KEY = /^arrow(up|down|left|right)$/;
const kindOf = (el) => (el && el.dataset && OSK_KINDS.includes(el.dataset.osk) ? el.dataset.osk : null);

/** Is dit een veld waar het toetsenbord bij hoort? */
export const heeftOsk = (el) => !!(el && isTextField(el) && kindOf(el));

function labelOf(el) {
  if (el.dataset.oskLabel) return el.dataset.oskLabel;
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  const lab = el.closest && el.closest('label');
  if (lab) { const s = lab.querySelector('.ss-label, span'); if (s && s.textContent.trim() && !s.contains(el)) return s.textContent.trim(); }
  return el.getAttribute('placeholder') || '';
}

function chipsOf(el, kind) {
  const sessie = el.dataset.oskCheck === 'sessie-naam';
  let chips = defaultChips(kind, { sessie, recent: recentVan(kind) });
  if (kind === 'zoek') {
    const vast = String(el.dataset.oskChips || '').split('|').filter(Boolean).map((t) => ({ label: t, tekst: t }));
    const recent = recentVan('zoek').map((t) => ({ label: t, tekst: t }));
    chips = [...recent, ...vast].filter((c, i, a) => a.findIndex((x) => x.tekst === c.tekst) === i).slice(0, 6);
  } else if (el.dataset.oskChips) {
    const vast = String(el.dataset.oskChips).split('|').filter(Boolean).map((t) => (t === '@datum' ? { label: saveNameSuggestion(), tekst: saveNameSuggestion() } : { label: t, tekst: t }));
    chips = [...vast, ...chips].filter((c, i, a) => a.findIndex((x) => (x.tekst || x.act) === (c.tekst || c.act)) === i).slice(0, 6);
  }
  return chips;
}

function fieldKey(el) {
  const kl = [...el.classList][0] || el.tagName.toLowerCase();
  return `${kl}|${el.dataset.osk}|${el.dataset.oskLabel || ''}`;
}

// Het scherm kan opnieuw getekend zijn (lijst, verbindingsstatus): zoek hetzelfde veld dan weer op.
function field() {
  if (target && target.isConnected) return target;
  const kl = targetKey.split('|')[0];
  const fresh = kl ? [...document.querySelectorAll(`.${CSS.escape(kl)}[data-osk]`)].find((e) => fieldKey(e) === targetKey) : null;
  if (fresh) target = fresh;
  return target && target.isConnected ? target : null;
}

function schrijf(value, caret, { change = false } = {}) {
  const el = field();
  if (!el) return;
  const fresh = value !== el.value;
  if (fresh) el.value = value;
  try { el.setSelectionRange(caret, caret); } catch (e) { /* een veld zonder selectie */ }
  if (fresh) el.dispatchEvent(new Event('input', { bubbles: true }));
  if (change) el.dispatchEvent(new Event('change', { bubbles: true }));
}

function teken() {
  if (!root) return;
  root.innerHTML = renderOsk(st);
  const card = root.firstElementChild;
  const f = card && card.querySelector('.is-focus');
  if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' });
  if (card && document.activeElement !== card && !root.contains(document.activeElement)) card.focus({ preventScroll: true });
  root.dispatchEvent(new CustomEvent('osk-draw', { bubbles: true }));
}

/** Open het toetsenbord voor een veld. Geeft false als het veld er niet voor is of het al open staat. */
export function openOsk(el) {
  if (st || !heeftOsk(el) || el.disabled || el.readOnly) return false;
  const kind = kindOf(el);
  const max = Number(el.dataset.oskMax) || (el.maxLength > 0 ? el.maxLength : 0);
  const check = CHECKS.get(el.dataset.oskCheck) || null;
  target = el; targetKey = fieldKey(el);
  st = createState({ kind, value: el.value, max, check, label: labelOf(el), chips: chipsOf(el, kind), leegMag: !el.required });
  root = document.createElement('div');
  root.id = 'onscreenkeyboard';
  root.className = 'osk';
  document.body.appendChild(root);
  document.documentElement.classList.add('osk-open');
  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('focusin', houdFocus, true);
  teken();
  return true;
}

/** Sluit het toetsenbord. wat: 'ok' (bevestigd), 'annuleer' (oude waarde terug) of 'keep' (blijft staan zoals het is). */
export function closeOsk(wat = 'keep') {
  if (!st) return;
  const el = field();
  if (wat === 'annuleer') { st = annuleer(st); schrijf(st.value, st.caret); }
  if (wat === 'ok') {
    schrijf(st.value, st.caret, { change: true });
    if (st.kind === 'zoek' || st.kind === 'code') noteRecent(st.kind, st.value);
  }
  window.removeEventListener('keydown', onKey, true);
  window.removeEventListener('keyup', onKeyUp, true);
  document.removeEventListener('focusin', houdFocus, true);
  if (root) { root.removeEventListener('click', onClick); root.remove(); }
  root = null; st = null;
  document.documentElement.classList.remove('osk-open');
  if (el) { parked = el; el.focus({ preventScroll: true }); }
  target = null;
}

// Alleen de kaart houdt de focus zolang hij open staat (aria-modal).
function houdFocus(e) {
  if (!root || root.contains(e.target)) return;
  const card = root.firstElementChild;
  if (card) card.focus({ preventScroll: true });
}

async function plakken() {
  const t = (await readClip()).replace(/[\r\n]+/g, ' ').trim();
  if (!st) return;
  if (!t) { st = { ...st, message: 'Er staat niets op het klembord.' }; teken(); return; }
  st = insertText(st, t);
  schrijf(st.value, st.caret);
  teken();
}

function pas(fresh) {
  if (!fresh) return;
  st = fresh;
  if (st.vraag === 'plakken') { st = { ...st, vraag: null }; plakken(); }
  schrijf(st.value, st.caret);
  if (st.klaar === 'ok') { closeOsk('ok'); return; }
  if (st.klaar === 'annuleer') { closeOsk('annuleer'); return; }
  teken();
}

function onKey(e) {
  if (!st) return;
  // een echte toets (toetsenbord) is de overgang naar het gewone veld: het toetsenbord klapt in, wat getypt is blijft staan
  if (!e.__gde) {
    if (e.isTrusted && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Shift') closeOsk('keep');
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.type !== 'keydown') return;
  pas(handleKey(st, e.key));
}
function onKeyUp(e) { if (e.__gde) { e.preventDefault(); e.stopImmediatePropagation(); } }

function onClick(e) {
  const b = e.target && e.target.closest ? e.target.closest('.osk-toets') : null;
  if (!b || !st) return;
  e.preventDefault();
  const r = Number(b.dataset.r), c = Number(b.dataset.c);
  st = focusAt(st, r, c);
  const g = buildGrid(st); // de toets komt uit de stand, niet uit de DOM
  pas(pressKey(st, g[r] && g[r][c]));
}

// Heeft het pad net een pijl gestuurd, dan loopt de speler langs het veld en opent niets.
function gamepadInUse() { return getDevice() === 'pad'; }

/**
 * Maak van een veld een veld met schermtoetsenbord (voor velden die niet via een sjabloon met data-osk komen).
 * opties: { kind, label, max, check, chips } met kind 'naam' | 'code' | 'tekst' | 'wachtwoord' | 'zoek' | 'cijfers'.
 */
export function attachTextInput(el, { kind = 'tekst', label = '', max = 0, check = '', chips = '' } = {}) {
  if (!el || !el.dataset) return el;
  el.dataset.osk = OSK_KINDS.includes(kind) ? kind : 'tekst';
  if (label) el.dataset.oskLabel = label;
  if (max > 0) el.dataset.oskMax = String(max);
  if (check) el.dataset.oskCheck = check;
  if (chips) el.dataset.oskChips = Array.isArray(chips) ? chips.join('|') : chips;
  return el;
}

/** Zet de bedrading van het toetsenbord aan (één keer, in main.js). */
export function initOnscreenKeyboard() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  // A (Enter van het pad) op een veld opent het toetsenbord in plaats van het veld te bevestigen
  window.addEventListener('keydown', (e) => {
    if (e.__gde === 'pad' && ARROW_KEY.test(String(e.key).toLowerCase())) lastArrowAt = Date.now();
    if (st || e.__gde !== 'pad' || String(e.key).toLowerCase() !== 'enter') return;
    const el = document.activeElement;
    if (!heeftOsk(el)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openOsk(el);
  }, true);
  // focus op een veld terwijl de laatste invoer een controller is (een klik op een kaart, een programmatische focus): open
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (st || !heeftOsk(el) || el === parked || !gamepadInUse()) return;
    if (Date.now() - lastArrowAt < 250) return; // doorlopen met het D-pad: A opent
    openOsk(el);
  });
  document.addEventListener('focusout', (e) => { if (e.target === parked) parked = null; });
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('[data-osk-open]') : null;
    if (!b) return;
    const wrap = b.closest('label, .osk-wrap, div') || b.parentElement;
    const el = wrap && wrap.querySelector('[data-osk]');
    if (el) { parked = el; openOsk(el); }
  });
  // een echte toets of muis: het toetsenbord klapt in en laat het veld met rust
  uitDevice = onDeviceChange((d) => { if (st && d !== 'pad' && !(root && root.matches(':hover'))) closeOsk('keep'); });
}

/** Voor de tests: alles terug naar af. */
export function _resetOsk() {
  if (st) closeOsk('keep');
  st = null; root = null; target = null; parked = null; wired = false; lastArrowAt = 0;
  RECENT.zoek.length = 0; RECENT.code.length = 0;
  if (uitDevice) { uitDevice(); uitDevice = null; }
}
export const _oskState = () => st;
export { GDE2_PREFIX, bevestig };
