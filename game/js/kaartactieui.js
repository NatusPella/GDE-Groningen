// De opmaak van de actiebalk, de reiskeuze en de uitleg op de kaart (#445, #602). Alleen
// tekenreeksen en stijl; mapview.js zet ze in de kaartkaart en regelt de kliks.
// De tekst en de regels zitten in kaartactie.js.
//
// #602: de actiebalk staat op menuformaat (.m-bp/.m-bg-maten: 26 px Bebas, 18 px uitleg,
// 56 px hoge rijen), alle kleuren komen uit de tokens met een terugval (--ink, --g,
// --redtx, --line2, --mk-*), en er staat geen tekst meer onder 13 px in.
import { KAART_UITLEG, GAST_UITLEG, HIER_TITEL, HIER_HINT, legendaRegels } from './kaartactie.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

// de drie knoppen; stap: de actie die nu is uitgeklapt (reis of info)
export function actiesHtml(model, stap) {
  return '<div class="mv-acties" role="group" aria-label="Wat wil je met deze plek?">' + model.acties.map((a) =>
    `<button type="button" class="mv-actie${a.id === stap ? ' open' : ''}" data-card="${a.id}"${a.disabled ? ' aria-disabled="true"' : ''}${a.id === 'reis' || a.id === 'info' ? ` aria-expanded="${a.id === stap}"` : ''}>` +
      `${svg(a.icoon)}<span class="mv-at"><span class="mv-al">${esc(a.label)}</span><small>${esc(a.sub)}</small></span></button>`).join('') + '</div>';
}

// de reiskeuze: een rij per keuze met een zin, de kosten, de duur en 'aanbevolen'
export function reisHtml(rijen, gekozen, kleur = {}) {
  const rij = (r) => {
    const sel = r.soort === 'snel' && r.id === gekozen;
    const attr = r.soort === 'zelf' ? 'data-card="zelf"' : `data-card="kies:${esc(r.id)}"`;
    const st = kleur[r.id] ? ` style="border-left-color:${esc(kleur[r.id])}"` : '';
    return `<button type="button" class="mv-keuze${sel ? ' sel' : ''}" ${attr}${r.disabled ? ' aria-disabled="true"' : ''}${st}>` +
      `<span class="mv-kk"><span class="mv-kl">${esc(r.label)}</span>${r.aanbevolen ? '<i class="mv-aanb">aanbevolen</i>' : ''}</span>` +
      `<span class="mv-ku">${esc(r.uitleg)}</span><span class="mv-kd">${esc(r.kosten)} · ${esc(r.duur)}${r.disabled ? ` · ${esc(r.disabled)}` : ''}</span></button>`;
  };
  return `<div class="mv-reiskeuze"><p class="mv-uit">Kies hoe je gaat. Snel reizen kost tijd en geld; Zelf gaan zet een waypoint.</p>${rijen.map(rij).join('')}</div>`;
}

export function infoHtml(regels) {
  return `<div class="mv-infostap">${regels.map((r) => `<p>${esc(r)}</p>`).join('')}</div>`;
}

// de eerste keer: korte uitleg, te sluiten (data-act="uitleg-sluit"); een gast
// leest er ook bij wat wel en niet kan in Samen spelen. De uitleg staat in de
// kaartkolom (mapview.js zet hem onder het zoekveld), niet meer over de titel (#602).
export function uitlegHtml({ gast = false } = {}) {
  const regels = gast ? [...KAART_UITLEG, GAST_UITLEG] : KAART_UITLEG;
  return `<div class="mv-uitleg m-note" role="note" data-gast="${gast ? 1 : 0}"><b>Zo werkt de kaart</b><ul>` + regels.map((l) => `<li>${esc(l)}</li>`).join('') +
    '</ul><button type="button" class="mapview-btn" data-act="uitleg-sluit">Begrepen</button><small>Terug te vinden onder Besturing › Hulp.</small></div>';
}

// De legenda bovenaan het luik Lagen (#445): wat een klik doet en, voor een
// gast, wat er in Samen spelen wel en niet kan. data-gast laat mapview.js hem
// verversen als je rol verandert.
export function legendaHintHtml({ gast = false } = {}) {
  return `<div class="mv-leg-hint" data-gast="${gast ? 1 : 0}">` + legendaRegels({ gast }).map((l) => `<p class="hint">${esc(l)}</p>`).join('') + '</div>';
}

// de kaart als je op jezelf klikt: geen waypoint naar je eigen plek, wel waar je staat
export function hierHtml(plek = '') {
  return `<div class="mv-hier"><b>${esc(HIER_TITEL)}</b>${plek ? `<p class="mv-hier-plek">${esc(plek)}</p>` : ''}<p class="mv-note">${esc(HIER_HINT)}</p></div>`;
}

// Alle maten en kleuren in de kaartkaart, op de menusset (#602). Hexen staan alleen
// als terugval ín een token: geen eigen kleur, dus de kleurenblindmodi doen mee.
export const KAART_ACTIE_CSS = `
.mapview-card .mv-acties { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 2px; }
.mapview-card .mv-actie { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 6px 14px; text-align: left; color: var(--ink, #f0ede4); background: transparent; border: 0; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--line2, rgba(240,237,228,0.16)); cursor: pointer; font: 18px/1.3 'Arial Narrow', Arial, sans-serif; }
.mapview-card .mv-actie svg { width: 24px; height: 24px; flex: none; fill: var(--g, #3fc97a); stroke: var(--g, #3fc97a); stroke-width: 0; }
.mapview-card .mv-actie[data-card="haalweg"] svg { fill: none; stroke: var(--redtx, #f08a8a); stroke-width: 2.4; stroke-linecap: round; }
.mapview-card .mv-at { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mapview-card .mv-actie .mv-al { font: normal 26px/1.05 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.mapview-card .mv-actie small { font: 18px/1.2 'Arial Narrow', Arial, sans-serif; color: var(--mut, rgba(240,237,228,0.7)); }
.mapview-card .mv-actie:hover, .mapview-card .mv-actie.open { background: rgba(63,201,122,0.16); box-shadow: inset 0 0 0 1px var(--g, #3fc97a); }
.mapview-card .mv-actie:focus-visible, .mapview-card .mv-keuze:focus-visible { outline: 2px solid var(--ink, #f0ede4); outline-offset: 2px; }
.mapview-card .mv-actie[aria-disabled] { opacity: 0.55; }
.mapview-card .mv-reiskeuze { display: flex; flex-direction: column; gap: 6px; margin: 6px 0; }
.mapview-card .mv-uit, .mapview-card .mv-note { margin: 0; font: 18px/1.4 'Arial Narrow', Arial, sans-serif; color: var(--mut, rgba(240,237,228,0.8)); }
.mapview-card .mv-keuze { display: flex; flex-direction: column; gap: 2px; min-height: 56px; padding: 8px 12px; text-align: left; color: var(--ink, #f0ede4); background: transparent; border: 0; border-left: 6px solid var(--line2, rgba(240,237,228,0.16)); border-radius: 8px; cursor: pointer; font: 18px/1.35 'Arial Narrow', Arial, sans-serif; }
.mapview-card .mv-keuze.sel { background: rgba(63,201,122,0.18); border-left-color: var(--g, #3fc97a); }
.mapview-card .mv-keuze[aria-disabled] { opacity: 0.55; }
.mapview-card .mv-kk { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mapview-card .mv-kk .mv-kl { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 24px; letter-spacing: 0.04em; }
.mapview-card .mv-aanb { font-style: normal; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #0c140e; background: var(--g, #3fc97a); border-radius: 4px; padding: 1px 8px; }
.mapview-card .mv-ku { color: var(--mut, rgba(240,237,228,0.78)); }
.mapview-card .mv-kd { color: var(--ink, #f0ede4); }
.mapview-card .mv-infostap p { margin: 2px 0; font: 20px/1.4 'Arial Narrow', Arial, sans-serif; color: var(--ink, #f0ede4); }
.mapview-card .mv-hier b { display: block; font: normal 26px/1.1 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.mapview-card .mv-hier .mv-hier-plek { margin: 2px 0 4px; font: 20px/1.35 'Arial Narrow', Arial, sans-serif; color: var(--ink, #f0ede4); }
/* de uitleg: een blok in de kaartkolom onder het zoekveld, geen los vlak over de titel (#602) */
.mapview-overlay .mv-uitleg { position: relative; z-index: 3; width: auto; max-width: 560px; box-sizing: border-box; padding: 20px 24px; border-radius: 12px; background: rgba(12,20,14,0.92); box-shadow: inset 0 0 0 1px var(--line2, rgba(240,237,228,0.16)); color: var(--ink, #f0ede4); font: 18px/1.45 'Arial Narrow', Arial, sans-serif; }
.mapview-overlay .mv-uitleg b { display: block; margin-bottom: 8px; font: normal 26px/1.1 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.mapview-overlay .mv-uitleg ul { margin: 0 0 12px 20px; padding: 0; }
.mapview-overlay .mv-uitleg li { margin: 4px 0; }
.mapview-overlay .mv-uitleg .mapview-btn { height: 44px; padding: 0 20px; border: 0; border-radius: 8px; background: var(--g, #3fc97a); color: #0c140e; font: 22px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; cursor: pointer; }
.mapview-overlay .mv-uitleg .mapview-btn:hover { background: var(--g, #3fc97a); filter: brightness(1.08); }
.mapview-overlay .mv-uitleg .mapview-btn:focus-visible { outline: 2px solid var(--ink, #f0ede4); outline-offset: 2px; }
.mapview-overlay .mv-uitleg small { display: block; margin-top: 8px; font-size: 18px; color: var(--mut, rgba(240,237,228,0.65)); }
.mapview-legend .mv-leg-hint { margin: 0 2px 8px; }
.mapview-legend .mv-leg-hint .hint { margin: 0 0 2px; }
.mapview-legend .mv-leg-hint .hint:last-child { margin-bottom: 0; }
`;
