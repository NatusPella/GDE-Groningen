// De tekening van het schermtoetsenbord (#1011): één kaart met kop, live voorbeeld, melding, suggesties, toetsen en een toetsregel.
// Puur: een stand (oskmodel.js) in, HTML uit, zodat een test en een statische beeldrun hem zonder DOM bekijken. De toetsen dragen hun
// controllerknop IN de knop (dsbutton.js knopToets, data-gk): glyphs.js toont de knop van het apparaat dat de speler gebruikt, met
// data-pad-ctx="osk" voor de indeling van PAD_MAPS.osk (A typt, B wist, X spatie, Y hoofdletter, Start klaar).
import { buildGrid, status, displayText, GDE2_PREFIX } from './oskmodel.js';
import { knopToets } from './dsbutton.js';
import { glyphHtml } from './keycap.js';
import { escapeHtml as esc } from './htmlescape.js';


const KIND_NAME = { 'naam': 'naam', code: 'code', tekst: 'tekst', wachtwoord: 'wachtwoord', zoek: 'zoekterm', cijfers: 'cijfers' };

/** De knop 'Toetsenbord' naast een veld (klein naast het veld, ds-osk.css; NIET osk-open: dat is de staatsklasse op <html> zolang het toetsenbord openstaat). */
export function oskKnop(label = '') {
  const l = label ? `Toetsenbord voor ${label}` : 'Toetsenbord';
  return `<button type="button" class="osk-knop ds-z-knop ds-z-knop--secundair" data-osk-open aria-label="${esc(l)}" title="${esc(l)}"><span class="ds-z-knop__label">Toetsenbord</span></button>`;
}

function toetsLabel(k) {
  if (k.t === 'links' || k.t === 'rechts') return `<span aria-hidden="true">${k.label}</span>`;
  return `<span class="osk-t-tekst">${esc(k.label)}</span>`;
}

const ARIA = {
  spatie: 'Spatie', wis: 'Wis een teken', shift: 'Hoofdletter', layerId: 'Andere toetsen', links: 'Cursor naar links', rechts: 'Cursor naar rechts',
  toon: 'Toon of verberg het wachtwoord', annuleer: 'Annuleren', ok: 'Klaar', prefix: `Zet ${GDE2_PREFIX} vooraan`,
};

function toets(k, r, c, st) {
  const focus = st.r === r && st.c === c;
  const kls = ['osk-toets', `osk-t-${k.t}`];
  if (focus) kls.push('is-focus');
  if (k.uit) kls.push('is-uit');
  if (k.actief) kls.push('is-aan');
  const aria = k.t === 'char' ? (k.ch === ' ' ? 'Spatie' : k.ch) : k.t === 'chip' ? k.label : ARIA[k.t] || k.label;
  const glyph = k.token ? knopToets(k.token) : '';
  return `<button type="button" id="osk-k-${r}-${c}" class="${kls.join(' ')}" style="flex:${k.w} 1 0" tabindex="-1" data-r="${r}" data-c="${c}"${k.uit ? ' aria-disabled="true"' : ''}${k.actief ? ' aria-pressed="true"' : ''} aria-label="${esc(aria)}">${toetsLabel(k)}${glyph}</button>`;
}

/** De toetsregel onderaan: de knoppen die de toetsen zelf niet dragen (A typt, de bumpers zetten de cursor, de triggers wisselen van laag). */
export function keyLegend(st) {
  const g = (t) => glyphHtml(t);
  const layerId = st.kind === 'code' || st.kind === 'cijfers' ? '' : `<span class="osk-hint-item">${g('[')}${g(']')} laag</span>`;
  return `<p class="osk-voet"><span class="osk-hint-item">${g('ENTER')} typ</span><span class="osk-hint-item">${g('PAGEUP')}${g('PAGEDOWN')} cursor</span>${layerId}</p>`;
}

/** De hele kaart voor een stand. */
export function renderOsk(st) {
  const grid = buildGrid(st);
  const s = status(st);
  const tekst = [...displayText(st)];
  const voor = tekst.slice(0, st.caret).join('');
  const na = tekst.slice(st.caret).join('');
  const leeg = !tekst.length;
  const rijen = grid.map((row, r) => `<div class="osk-rij${row[0] && row[0].t === 'chip' ? ' osk-rij--chips' : ''}" role="group" data-rij="${r}">${row.map((k, c) => toets(k, r, c, st)).join('')}</div>`).join('');
  const message = st.message || (!s.ok ? s.reason : '');
  const actief = grid[st.r] && grid[st.r][st.c] ? `osk-k-${st.r}-${st.c}` : '';
  const label = st.label || KIND_NAME[st.kind];
  const full = st.max > 0 && [...st.value].length >= st.max;
  return `<div class="osk-kaart ds-z-kaart" data-osk-kind="${esc(st.kind)}" data-pad-ctx="osk" role="dialog" aria-modal="true" aria-label="Schermtoetsenbord: ${esc(label)}" aria-activedescendant="${actief}" tabindex="-1">` +
    `<div class="osk-kop"><span class="osk-label">${esc(label)}</span><span class="osk-teller${full ? ' is-vol' : ''}" aria-label="${esc(st.max > 0 ? `${s.teller.replace('/', ' van ')} tekens` : `${s.teller} tekens`)}">${esc(s.teller)}</span></div>` +
    `<div class="osk-voorbeeld${st.kind === 'code' ? ' osk-voorbeeld--code' : ''}" role="status" aria-live="polite"><span class="osk-v-voor">${esc(voor)}</span><span class="osk-cursor" aria-hidden="true"></span><span class="osk-v-na">${esc(na)}</span>${leeg ? '<span class="osk-v-leeg">Kies een toets</span>' : ''}</div>` +
    `<p class="osk-melding${message ? (s.ok && !st.message ? '' : ' is-fout') : ''}" role="alert">${esc(message)}</p>` +
    `<div class="osk-rijen">${rijen}</div>` +
    keyLegend(st) +
    '</div>';
}
