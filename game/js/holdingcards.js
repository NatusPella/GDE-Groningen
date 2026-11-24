// Land en bedrijf in Designsysteem 3 (#1272, UI-kritiek 22-11): elke sectie van Overzicht, Bedrijven en Snackwagen is een DS3-kaart met
// een kop (icoon, naam, een getal) in plaats van een kale tekstkop, de uitleg staat achter één info-knop in plaats van als alinea, en een
// knop die uit staat toont een slot en de reden ("Je mist nog €25") in plaats van grijze tekst zonder uitleg.
// Puur (alleen strings), gedeeld door bezitui.js en snackui.js; scripts/holdingcards_test.mjs.
// Samen spelen: een lokale weergave per speler; er gaat niets over het net.

import { icoon } from './icons.js';
import { euro } from './geldtekst.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Een sectie als kaart. id gaat in data-sectie (tests, QA); ic is een betekenisnaam uit iconmap.js; body is al HTML.
// count: het getal rechts in de kop (null = geen getal). info: de uitleg achter de info-knop (leeg = geen knop).
export function sectionCard(id, ic, kop, body, { count = null, info = '' } = {}) {
  const n = count != null && count !== '' ? `<b class="bz-kaart-n">${esc(count)}</b>` : '';
  const infoHtml = info ? `<details class="bz-info"><summary class="bz-info-knop" aria-label="Uitleg bij ${esc(kop)}">${icoon('info', { cls: 'bz-info-ic' })}</summary><p class="bz-info-tekst">${esc(info)}</p></details>` : '';
  return `<section class="ds-z-kaart ds-z-kaart--recht bz-kaart" data-sectie="${esc(id)}">` +
    `<header class="ds-z-kaart__kop bz-kaart-kop"><h3 class="ds-z-kaart__titel bz-kaart-titel">${icoon(ic, { cls: 'bz-kaart-ic' })}${esc(kop)}</h3>${n}</header>` +
    `${infoHtml}${body}</section>`;
}

// De reden achter een koopknop die uit staat; leeg als het geld genoeg is.
export const missReason = (money, price) => (money < price ? `Je mist nog ${euro(price - money)}` : '');

// De binnenkant van een knop die uit staat: slot, de tekst en (als die er is) de reden eronder. text is al HTML (de aanroepers ontsnappen zelf).
export function lockedInner(text, reden = '') {
  return `${icoon('slot', { cls: 'bz-slot' })}<span class="bz-knoptekst">${text}</span>${reden ? `<small class="bz-reden">${esc(reden)}</small>` : ''}`;
}

// Een knop van Land en bedrijf. uit: false (aan), true (uit, met slot) of een tekst (uit, met slot en die reden zichtbaar in de knop).
// attr is het data-attribuut van het scherm (data-bz of data-sn); hoofd maakt hem de gele hoofdknop.
export function holdingButton(attr, act, text, extra = '', uit = false, hoofd = false) {
  const reden = typeof uit === 'string' ? uit : '';
  return `<button type="button" class="m-bt${hoofd ? ' bz-hoofd' : ''}${uit ? ' bz-uit' : ''}" ${attr}="${act}"${extra}${uit ? ' disabled' : ''}>${uit ? lockedInner(text, reden) : text}</button>`;
}

// Een status die geen knop is (een pand in orde, de huidige standplaats): een chip met een vinkje, zodat hij niet als grijze knop leest.
export function statusChip(text, data = '') {
  return `<span class="ds-z-chip bz-status"${data}>${icoon('vinkje', { cls: 'ds-z-chip__icoon' })}${esc(text)}</span>`;
}
