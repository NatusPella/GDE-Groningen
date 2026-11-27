// The picture behind the load screens and the boot screen: one of the game's
// own renders (img/laad/), never a separate illustration style. This file is
// the approved set (see DESIGN_SYSTEM.md "Beeldstijl"): which picture belongs
// to which kind of place or mission, with its alt text. loadscreen.js and
// startscreen.js put it in; scripts/loadlogic_test.mjs checks the set. Pure
// string builder, no DOM.

import { escapeHtml as esc } from './htmlescape.js';

export const PICTURES = {
  vismarkt: 'Vismarkt in Groningen, overdag',
  luchtfoto: 'Luchtfoto van de binnenstad',
  rondvaart: 'Een rondvaartboot op de gracht',
  kermis: 'De kermis bij avond',
  ringrace: 'De ringweg',
  achtervolging: 'Een straat bij nacht',
  duif: 'Grunn van boven',
};
export const APPROVED = Object.keys(PICTURES);

// one background per kind of mission (story, side jobs, races, pigeon flights)
export const MISSION_PICTURE = {
  verhaal: 'vismarkt',
  rondvaart: 'rondvaart',
  race: 'ringrace',
  achtervolging: 'achtervolging',
  kermis: 'kermis',
  duif: 'duif',
  overzicht: 'luchtfoto',
};
export const missionPicture = (kind) => MISSION_PICTURE[kind] || 'vismarkt';

export const pictureOk = (name) => APPROVED.includes(name);

// cls: 'ls-bg' on the load screens, 'bt-bg' on the boot screen
export function pictureHtml(name, cls = 'ls-bg') {
  const n = pictureOk(name) ? name : 'vismarkt';
  return `<img class="${cls}" src="img/laad/${n}.jpg" alt="${PICTURES[n]}" decoding="async">`;
}


// The whole markup of a load screen (loadscreen.js puts it in #load-screen; scripts/ui/laadscherm_render.html
// renders the same string for the layout measurement, #1069). { kind: 'save' | 'travel' | 'snel', name, special, img }.
// Beweging (ds-laad.css, 23-11): het logo en de kaart stempelen binnen, het beeld drijft traag in zijn lijst, de bestemming ademt,
// een glans loopt over de balk en een nieuwe statusregel komt vloeiend binnen. Allemaal CSS (transform en opacity), stil bij Beweging beperken.
// Two columns in one flow (loadscreen.css): left the logo and the destination card ("Naar <plaats>" as one sign), right the render;
// below them the bar and the one status line. --n (the length of the name) lets the CSS size a long name down.
export function loadScreenHtml({ kind = 'travel', name = '', special = '', icon = '', img = 'vismarkt' } = {}) {
  const plaats = String(name || 'Grunn');
  return '<div class="ls-stage">' +
    '<div class="ls-main">' +
      '<div class="ls-left">' +
        '<div class="ls-brand"><div class="gde-logo" aria-hidden="true"><span class="gde-mark ds-laad__stempel" style="--i:0">GDE</span><span class="gde-sign ds-laad__stempel" style="--i:3">Groningen</span><span class="gde-sub ds-laad__stempel" style="--i:6">Zomer vol misdaad</span></div></div>' +
        '<div class="ls-card ds-laad__stempel" style="--i:2">' +
          `<span class="ls-kick">${kind === 'save' ? 'Verder in' : 'Naar'}</span>` +
          `<b class="ls-place ds-laad__adem" style="--n:${Math.max(1, plaats.length)}" title="${esc(plaats)}">${esc(plaats)}</b>` +
          (special ? `<div class="ls-when"><span class="ls-badge" aria-label="Vandaag: ${esc(special)}">${icon}${esc(special)}</span></div>` : '') + // UX-audit 23-11: met het kalendericoon van de HUD leest de chip als evenement van vandaag
        '</div>' +
      '</div>' +
      '<div class="ls-pic ds-laad__stempel" style="--i:1"><div class="ls-bg">' + pictureHtml(img, 'ls-bg__beeld ds-laad__drift') + '</div></div>' +
    '</div>' +
    '<div class="ls-bottom">' +
      '<div class="ls-prog"><div class="ls-bar" role="progressbar" aria-label="Voortgang laden" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="ds-laad__balk"></i></div><div class="ls-step ds-laad__status" role="status" aria-live="polite"></div></div>' +
    '</div>' +
  '</div>';
}
