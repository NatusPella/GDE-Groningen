// The channel picker in Instellingen > Geluid (21-11, ADR 0046): one row per channel in the design system (ds-z-rij), the choice inside it.
// Pure: strings in, string out; pausemenu.js puts it in the panel and hands the click to radio.js selectChannel.
// Keys: arrow up/down (D-pad) walk the rows, left/right (D-pad) go to the previous or next channel, Enter or A picks.
// In the game itself Shift+N is the next channel; the button below shows that key inside the button (key-in-button, DS3).
import { glyphHtml } from './keycap.js';
import { shortcutName } from './dsbutton.js';
import { icoon } from './icons.js';
import { escapeHtml as esc } from './htmlescape.js';


// row: radio.js channelList(): { id, name, sub, dj, tracks, status: 'open' | 'soon', active }
const ARIA_SHIFT = 'Shift'; // naam van de wijzigertoets in aria-keyshortcuts (geen spelertekst)
function channelRowHtml(row) {
  const soon = row.status === 'soon';
  const value = row.active ? 'Aan' : soon ? 'Binnenkort' : '';
  return `<button type="button" role="option" class="ds-z-rij pm-channel${row.active ? ' ds-z-rij--selectie' : ''}${soon ? ' ds-z-rij--uit' : ''}" data-channel="${esc(row.id)}" aria-selected="${row.active ? 'true' : 'false'}"${soon ? ' aria-disabled="true"' : ''}>`
    + `<span class="ds-z-rij__naam">${row.icon ? `<span class="pm-channel-face" style="color:${esc(row.color || 'currentColor')}">${icoon(row.icon, { maat: 's' })}</span> ` : ''}${esc(row.name)}</span>`
    + `<span><span class="ds-z-rij__sub">${esc(row.sub)}</span><span class="ds-z-rij__sub">DJ ${esc(row.dj)}</span></span>`
    // #1277: "Binnenkort" is een klein etiket, geen waarde in kopformaat naast een "Aan"
    + `<span class="ds-z-rij__waarde">${soon ? `<span class="ds-z-chip">${esc(value)}</span>` : esc(value)}</span></button>`;
}

// The "Volgende zender" button with Shift+N inside (two glyphs in one button; data-gk sits on each of them).
function nextButtonHtml() {
  return `<button type="button" class="ds-z-knop ds-z-knop--secundair ds-z-knop--toets" data-channel-next data-key="N" aria-keyshortcuts="${esc(ARIA_SHIFT + '+' + shortcutName('N'))}">` // keywords-ok: ARIA-syntaxis, geen spelertekst
    + `<span class="ds-z-knop__label">Volgende zender</span>`
    + `<span class="ds-z-knop__toets" aria-hidden="true">${glyphHtml('SHIFT')}${glyphHtml('N')}</span></button>`;
}

export function channelPickerHtml(rows) {
  if (!rows.length) return '';
  return `<div class="pm-channels" data-channels role="listbox" aria-label="Radiozender">${rows.map(channelRowHtml).join('')}</div>`
    + `<div class="pm-channel-actie">${nextButtonHtml()}</div>`;
}
