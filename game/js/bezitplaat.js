// De waardeplaatjes van de kop van Bezit (Land en bedrijf, Spullen en Garage hebben dezelfde kop, ontwerp docs/ontwerp/BEZIT-UI-24-11.md). Puur: strings.
import { icoon } from './icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const plaatHtml = (ic, getal, label, mod = '') => `<span class="ds-z-waarde bz-plaat${mod ? ` ds-z-waarde--${mod}` : ''}" data-plaat="${esc(label)}">${icoon(ic, { cls: 'ds-z-waarde__icoon' })}<span class="bz-plaat__tekst"><span class="ds-z-waarde__getal">${esc(getal)}</span><small>${esc(label)}</small></span></span>`;

// platen: de al gebouwde plaatjes (plaatHtml); met een titel erbij (alleen buiten het pauzemenu, waar de kop van het paneel ontbreekt).
export function kopRij(platen, { titel = null, eb = 'Bezit' } = {}) {
  const t = titel ? `<div><div class="bz-kop__eb">${esc(eb)}</div><h2 class="bz-kop__titel">${esc(titel)}</h2></div>` : '';
  return `<header class="bz-kop">${t}<div class="bz-waarden" role="group" aria-label="In cijfers">${platen}</div></header>`;
}
