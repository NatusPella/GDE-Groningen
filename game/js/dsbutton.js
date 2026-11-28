// Toets in de knop (DS3, 21-11): een knop met een toets of controllerknop toont die als keycap-glyph BINNEN de knop, nooit als losse hint
// ernaast. Eén plek voor alle knoppen: dsButtonKey bouwt een knop met label en toets, knopToets geeft alleen het toetsdeel voor een knop met
// eigen inhoud (een rij met icoon en twee regels). De glyph is glyphHtml (keycap.js): hij draagt data-gk, dus glyphs.js wisselt hem live naar
// de knop van het apparaat dat de speler nu gebruikt (toetsenbord, Xbox, PlayStation, Steam Deck, Switch) en verbergt hem op aanraking of
// als de controller de toets niet heeft. De maat komt uit ds-keycap.css (geen eigen px-maat hier). Puur: tekenreeksen, geen DOM.
import { glyphHtml } from './keycap.js';
import { escapeHtml as esc } from './htmlescape.js';


// De standaardtoetsen van het menupatroon (controls.js PAD_MAPS.menu: A is Enter, B is Esc); rijkeuze 1 tot 9 is een cijfertoets.
export const KNOP_TOETSEN = Object.freeze({ bevestig: 'ENTER', terug: 'ESC' });
// aria-keyshortcuts per token: schermlezers zeggen de sneltoets, het plaatje zelf is aria-hidden
const SHORTCUTS = { ENTER: 'Enter', ESC: 'Escape', SPACE: 'Space', TAB: 'Tab', DELETE: 'Delete' };
export const shortcutName = (token) => SHORTCUTS[String(token).toUpperCase()] || String(token);

/** Het toetsdeel van een knop: de glyph in een span (aria-hidden, de knop zelf noemt de sneltoets). rechts: aan de rechterrand van een rij. */
export function knopToets(token, { rechts = false } = {}) {
  if (!token) return '';
  return `<span class="ds-z-knop__toets${rechts ? ' ds-z-knop__toets--rechts' : ''}" aria-hidden="true">${glyphHtml(String(token).toUpperCase())}</span>`;
}

/**
 * Een knop met label en toets erin.
 * { label, toets: token ('ENTER', 'ESC', '1'), klasse, attrs (kant-en-klare attributen, al ge-escaped), voor: toets vóór het label, uit: disabled }
 */
export function dsButtonKey({ label, toets = '', klasse = 'ds-z-knop', attrs = '', voor = false, uit = false } = {}) {
  const t = toets ? String(toets).toUpperCase() : '';
  const kap = t && !uit ? knopToets(t) : '';
  const tekst = `<span class="ds-z-knop__label">${esc(label)}</span>`;
  return `<button type="button" class="${klasse}${kap ? ' ds-z-knop--toets' : ''}"${attrs ? ' ' + attrs : ''}${t && !uit ? ` data-key="${esc(t)}" aria-keyshortcuts="${esc(shortcutName(t))}"` : ''}${uit ? ' disabled' : ''}>${voor ? kap + tekst : tekst + kap}</button>`;
}

/** Eén controle op een stuk markup (voor tests en de regelaudit): elke knop met data-key hoort zijn glyph (data-gk in .ds-z-knop__toets) in de knop te hebben. */
export function buttonsWithoutGlyph(html) {
  const fout = [];
  for (const m of String(html).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    if (!/\bdata-key=/.test(m[1])) continue;
    if (!/class="[^"]*\bds-z-knop__toets\b[^"]*"/.test(m[2]) || !/data-gk=/.test(m[2])) fout.push(m[1].trim().slice(0, 80));
  }
  return fout;
}

/** Een losse toetshint direct NAAST een knop (`</button>` gevolgd door een toetsregel of hint): de oude vorm, in een popup niet meer toegestaan. */
export function looseHintBesideButton(html) {
  return [...String(html).matchAll(/<\/button>\s*<span class="[^"]*\b(?:ds-toetsregel|mv-help-toets|hint)\b[^"]*"/g)].length;
}
