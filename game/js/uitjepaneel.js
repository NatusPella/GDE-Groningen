// #633: één presentatie voor de uitjes die geen eigen paneel hadden (snackketen, veilige huizen,
// evenementen; het reuzenrad gebruikt hetzelfde bord als de kermis). De kaart leent alles van de
// bestaande tabellen: de sfeer (naam, patroon, tint, accent, icoon, bordvorm) uit
// activiteitensfeer.js, het patroon uit carrieresfeer.js en het icoon uit minigamekit.js -- geen
// eigen hex, geen eigen font, geen tweede keycapstijl. Eén regel voortgang en één hint, zoals een
// uitje betaamt; wat de speler ziet is Nederlands, de code blijft Engels.
import { sfeerVan, TINT_RGBA } from './activiteitensfeer.js';
import { vormStijl } from './carrieresfeer.js';
import { mgIcoon } from './minigamekit.js';

// [X] wordt de canonieke toetskap (.hud-key), net als in de startkaarten.
const KEYS = 'A|D|W|S|E|F|R|T|O|K|Q|Z|M|G|H|L|N|P|X|C|U|I|Spatie|Enter|Tab|Shift|Backspace|Esc|1|2|3|4';
const KEY_RE = new RegExp(`\\[(${KEYS})\\]`, 'g');
const keysHtml = (s) => String(s).replace(KEY_RE, (m, k) => `<kbd class="hud-key">${k === 'Spatie' ? 'SPATIE' : k.toUpperCase()}</kbd>`);

// De uitjes die deze kaart gebruiken; de id's zijn ook de sleutels van de sfeertabel.
export const UITJES = {
  hoogvlieger: 'Reuzenrad',
  snackketen: 'Snackketen',
  safehuis: 'Veilig huis',
  evenementen: 'Evenement',
};

// De kaart als data (zonder DOM), zodat een test hem kan natrekken. `regel` is de ene
// voortgangsregel, `hint` de ene bedieningsregel; `titel` valt terug op de sfeernaam.
export function uitjeSpec(id, { titel = '', regel = '', hint = '', kicker = 'Uitje' } = {}) {
  const sfeer = sfeerVan(id);
  if (!sfeer) return null;
  return {
    id, sfeer, tint: TINT_RGBA[sfeer.tint] || '', accent: sfeer.accent, icoon: mgIcoon(sfeer.icoon),
    kicker, titel: titel || sfeer.naam, regel: String(regel || ''), hint: keysHtml(hint || ''),
    bordvorm: sfeer.bordvorm,
  };
}

// Eén kaart met sfeerrand, patroon, icoon, kicker, titel, één regel en één hint.
export function uitjeHtml(spec) {
  if (!spec) return '';
  const vlak = vormStijl(spec.sfeer.vorm);
  return `<div class="uitje-kaart" data-sfeer="${spec.id}" data-sfeerbord="${spec.bordvorm}" style="--uitje-acc:${spec.accent}">` +
    (vlak ? `<span class="uitje-vorm" aria-hidden="true" style="${vlak}background-color:${spec.tint};background-repeat:repeat;"></span>` : '') +
    `<small class="uitje-kicker">${spec.icoon}<span>${spec.kicker}</span></small>` +
    `<b class="uitje-titel">${spec.titel}</b>` +
    (spec.regel ? `<span class="uitje-regel">${spec.regel}</span>` : '') +
    (spec.hint ? `<span class="uitje-hint">${spec.hint}</span>` : '') +
    `</div>`;
}

const CSS = `
#uitje-paneel[hidden] { display: none; }
#uitje-paneel { position: fixed; left: 50%; bottom: max(13vh, 88px); transform: translateX(-50%) translateY(10px); z-index: 6; max-width: min(560px, calc(100vw / var(--ui, 1) - 32px)); pointer-events: none; opacity: 0; transition: opacity 0.3s, transform 0.35s; zoom: var(--ui, 1); }
#uitje-paneel.on { opacity: 1; transform: translateX(-50%) translateY(0); }
#uitje-paneel .uitje-kaart { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2px; padding: 9px 16px 10px 84px; color: #f0ede4; text-shadow: var(--hud-shadow); background: linear-gradient(90deg, rgba(12,20,14,0.94), rgba(12,20,14,0.78) 78%, rgba(12,20,14,0.5)); border-left: 3px solid var(--uitje-acc); border-radius: 0 8px 8px 0; }
#uitje-paneel .uitje-vorm { position: absolute; left: 0; top: 0; bottom: 0; width: 70px; opacity: 0.42; pointer-events: none; }
#uitje-paneel .uitje-kicker { display: flex; align-items: center; gap: 5px; font: 12px 'Arial Narrow', Arial, sans-serif; letter-spacing: 3px; color: var(--uitje-acc); text-transform: uppercase; }
#uitje-paneel .uitje-kicker .mg-ic { width: 14px; height: 14px; }
#uitje-paneel .uitje-titel { font: 22px/1.05 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1.5px; }
#uitje-paneel .uitje-regel { font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.86); }
#uitje-paneel .uitje-hint { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.72); min-height: 1em; }
#uitje-paneel .uitje-hint:empty, #uitje-paneel .uitje-regel:empty { display: none; }
#uitje-paneel .hud-key { margin: 0 2px; vertical-align: middle; }
@media (prefers-reduced-motion: reduce) { #uitje-paneel { transition: none; } }
html.reduce-motion #uitje-paneel { transition: none; }
@media (max-width: 480px) { #uitje-paneel { bottom: 16px; } #uitje-paneel .uitje-kaart { padding-left: 76px; } }
`;

let els = null;
let hideT = 0;

function ensure() {
  if (els || typeof document === 'undefined') return els;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'uitje-paneel';
  root.hidden = true;
  (document.getElementById('hud') || document.body).appendChild(root);
  els = { root, t: 0 };
  return els;
}

// Toont één uitje-kaart. `secs` is de leesduur; een volgende kaart vervangt de vorige.
export function toonUitje(world, id, { titel = '', regel = '', hint = '', secs = 4.5 } = {}) {
  const spec = uitjeSpec(id, { titel, regel, hint });
  if (!spec) return null;
  if (world && world.coopRole === 'client' && spec.id === 'hoogvlieger') return spec; // het rad is van de opener
  // Zonder DOM (tests, een dedicated host) blijft de regel als gewone melding staan, zodat een uitje
  // nooit stil verdwijnt.
  if (typeof document === 'undefined') {
    if (world && typeof world.addMessage === 'function') world.addMessage(spec.regel || spec.titel, Math.max(2, secs));
    return spec;
  }
  const e = ensure();
  if (!e) return spec;
  e.root.innerHTML = uitjeHtml(spec);
  e.root.hidden = false;
  e.root.classList.add('on');
  clearTimeout(hideT);
  hideT = setTimeout(verbergUitje, Math.max(1, secs) * 1000);
  return spec;
}

export function verbergUitje() {
  if (!els) return;
  els.root.classList.remove('on');
  els.root.hidden = true;
}
