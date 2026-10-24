// De opmaak van de actiebalk, de reiskeuze en de uitleg op de kaart (#445). Alleen
// tekenreeksen en stijl; mapview.js zet ze in de kaartkaart en regelt de kliks.
// De tekst en de regels zitten in kaartactie.js.
import { KAART_UITLEG, KAART_HINT_TOKENS } from './kaartactie.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

// de drie knoppen; stap: de actie die nu is uitgeklapt (reis of info)
export function actiesHtml(model, stap) {
  return '<div class="mv-acties" role="group" aria-label="Wat wil je met deze plek?">' + model.acties.map((a) =>
    `<button type="button" class="mv-actie${a.id === stap ? ' open' : ''}" data-card="${a.id}"${a.disabled ? ' aria-disabled="true"' : ''}${a.id === 'reis' || a.id === 'info' ? ` aria-expanded="${a.id === stap}"` : ''}>${svg(a.icoon)}<b>${esc(a.label)}</b><small>${esc(a.sub)}</small></button>`).join('') + '</div>';
}

// de reiskeuze: een rij per keuze met een zin, de kosten, de duur en 'aanbevolen'
export function reisHtml(rijen, gekozen, kleur = {}) {
  const rij = (r) => {
    const sel = r.soort === 'snel' && r.id === gekozen;
    const attr = r.soort === 'zelf' ? 'data-card="zelf"' : `data-card="kies:${esc(r.id)}"`;
    const st = kleur[r.id] ? ` style="border-left:6px solid ${esc(kleur[r.id])}"` : '';
    return `<button type="button" class="mv-keuze${sel ? ' sel' : ''}" ${attr}${r.disabled ? ' aria-disabled="true"' : ''}${st}>` +
      `<span class="mv-kk"><b>${esc(r.label)}</b>${r.aanbevolen ? '<i class="mv-aanb">aanbevolen</i>' : ''}</span>` +
      `<span class="mv-ku">${esc(r.uitleg)}</span><span class="mv-kd">${esc(r.kosten)} · ${esc(r.duur)}${r.disabled ? ` · ${esc(r.disabled)}` : ''}</span></button>`;
  };
  return `<div class="mv-reiskeuze"><p class="mv-uit">Kies hoe je gaat. Snel reizen kost tijd en geld; Zelf gaan zet een waypoint.</p>${rijen.map(rij).join('')}</div>`;
}

export function infoHtml(regels) {
  return `<div class="mv-infostap">${regels.map((r) => `<p>${esc(r)}</p>`).join('')}</div>`;
}

// de eerste keer: korte uitleg, te sluiten (data-act="uitleg-sluit")
export function uitlegHtml() {
  return '<div class="mv-uitleg" role="note"><b>Zo werkt de kaart</b><ul>' + KAART_UITLEG.map((l) => `<li>${esc(l)}</li>`).join('') +
    '</ul><button type="button" class="mapview-btn" data-act="uitleg-sluit">Begrepen</button><small>Terug te vinden onder Besturing › Hulp.</small></div>';
}

// de hints onder de kaart; de toetsen worden voor een controller omgezet (glyphs.js)
export function hintHtml() {
  return KAART_HINT_TOKENS.map(([k, t]) => `<span><kbd>${esc(k)}</kbd> ${esc(t)}</span>`).join('');
}

export const KAART_ACTIE_CSS = `
.mapview-card .mv-acties { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 6px 0 2px; }
.mapview-card .mv-actie { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 7px; text-align: center; color: #f0ede4; background: rgba(255,255,255,0.07); border: 1px solid rgba(63,201,122,0.35); border-radius: 8px; cursor: pointer; font: 13px Arial, sans-serif; }
.mapview-card .mv-actie svg { width: 24px; height: 24px; fill: #3fc97a; stroke: #3fc97a; stroke-width: 0; }
.mapview-card .mv-actie[data-card="haalweg"] svg { fill: none; stroke: #ff9a8a; stroke-width: 2.4; stroke-linecap: round; }
.mapview-card .mv-actie b { font: 15px 'Bebas Neue', Arial, sans-serif; letter-spacing: 0.8px; font-weight: normal; }
.mapview-card .mv-actie small { font: 11px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); line-height: 1.15; }
.mapview-card .mv-actie:hover, .mapview-card .mv-actie.open { background: rgba(63,201,122,0.22); border-color: #3fc97a; }
.mapview-card .mv-actie:focus-visible, .mapview-card .mv-keuze:focus-visible { outline: 3px solid #f0ede4; outline-offset: 2px; }
.mapview-card .mv-actie[aria-disabled] { opacity: 0.6; }
.mapview-card .mv-reiskeuze { display: flex; flex-direction: column; gap: 4px; margin: 4px 0; }
.mapview-card .mv-uit, .mapview-card .mv-note { margin: 0; font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.8); }
.mapview-card .mv-note { color: #ffb66b; }
.mapview-card .mv-keuze { display: flex; flex-direction: column; gap: 1px; text-align: left; color: #f0ede4; background: rgba(255,255,255,0.05); border: 0; border-left: 6px solid #9aa3ad; border-radius: 4px; padding: 5px 8px; cursor: pointer; font: 13px Arial, sans-serif; }
.mapview-card .mv-keuze.sel { background: rgba(95,180,217,0.24); }
.mapview-card .mv-keuze[aria-disabled] { opacity: 0.55; }
.mapview-card .mv-kk { display: flex; align-items: center; gap: 8px; }
.mapview-card .mv-kk b { font-weight: bold; font-size: 14px; }
.mapview-card .mv-aanb { font-style: normal; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #0c140e; background: #5dff7a; border-radius: 2px; padding: 0 6px; }
.mapview-card .mv-ku { font-size: 12px; color: rgba(240,237,228,0.78); }
.mapview-card .mv-kd { font-size: 12px; color: #e8c93a; }
.mapview-card .mv-infostap p { margin: 2px 0; font: 13px Arial, sans-serif; color: rgba(240,237,228,0.9); }
.mapview-overlay .mv-uitleg { position: absolute; left: 12px; bottom: 44px; z-index: 3; width: 330px; max-width: calc(100% - 24px); box-sizing: border-box; padding: 10px 12px; border-radius: 10px; background: rgba(10,19,13,0.95); border: 1px solid rgba(63,201,122,0.6); color: #f0ede4; font: 13px Arial, sans-serif; }
.mapview-overlay .mv-uitleg b { display: block; font: 17px 'Bebas Neue', Arial, sans-serif; letter-spacing: 1px; font-weight: normal; }
.mapview-overlay .mv-uitleg ul { margin: 4px 0 8px 16px; padding: 0; }
.mapview-overlay .mv-uitleg small { display: block; margin-top: 6px; color: rgba(240,237,228,0.65); }
.mapview-overlay .mv-hint { position: absolute; left: 12px; bottom: 10px; z-index: 2; display: flex; flex-wrap: wrap; gap: 4px 14px; padding: 4px 10px; border-radius: 6px; background: rgba(10,19,13,0.78); color: rgba(240,237,228,0.85); font: 12px 'Arial Narrow', Arial, sans-serif; pointer-events: none; }
.mapview-overlay .mv-hint kbd { margin-right: 2px; }
@media (max-width: 900px) { .mapview-overlay .mv-hint { display: none; } }
`;
