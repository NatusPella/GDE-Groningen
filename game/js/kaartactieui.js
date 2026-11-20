// De opmaak van de actiebalk, de reiskeuze en de uitleg op de kaart (#445, #602). Alleen
// tekenreeksen en stijl; mapview.js zet ze in de kaartkaart en regelt de kliks.
// De tekst en de regels zitten in kaartactie.js.
//
// #602: de actiebalk staat op menuformaat (.m-bp/.m-bg-maten: 26 px Bebas, 18 px uitleg,
// 56 px hoge rijen), alle kleuren komen uit de tokens met een terugval (--ink, --g,
// --redtx, --line2, --mk-*), en er staat geen tekst meer onder 13 px in.
import { icoon } from './icons.js';
import { keyTextHtml } from './keycap.js';
import { KAART_UITLEG, GAST_UITLEG, HIER_TITEL, HIER_HINT, legendaRegels } from './kaartactie.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (naam) => icoon(naam, { maat: 'l' });

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

// De uitleg bij de kaart, als eenmalige popup over de kaart (#445, herzien): hij verschijnt
// één keer, dimt de kaart erachter en gaat weg met "Begrepen" (met de Enter-hint erin, of A op een controller), Escape of een klik ernaast; geen kruisje naast de knop.
// mapview.js bepaalt wanneer hij opengaat en onthoudt dat hij gezien is.
export function uitlegHtml({ gast = false } = {}) {
  const regels = gast ? [...KAART_UITLEG, GAST_UITLEG] : KAART_UITLEG;
  return '<div class="mv-help" role="dialog" aria-modal="true" aria-labelledby="mv-help-t">' +
    '<div class="ds-papier ds-kaart ds-kaart--kop mv-help-box"><div class="ds-kaart__kop mv-help-head"><h2 id="mv-help-t" class="ds-kaart__titel">Zo werkt de kaart</h2></div>' +
    '<ul class="ds-kaart__tekst">' + regels.map((l) => `<li>${esc(l)}</li>`).join('') + '</ul>' +
    '<div class="mv-help-foot"><button type="button" class="ds-knop mv-help-ok" data-act="uitleg-sluit">Begrepen ' + keyTextHtml('{ENTER}') + '</button>' +
    '<small>Terug te vinden onder Instellingen › Besturing › Hulp.</small></div></div></div>';
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
.mapview-card .mv-actie svg { width: 24px; height: 24px; flex: none; color: var(--g, #3fc97a); }
.mapview-card .mv-actie[data-card="haalweg"] svg { color: var(--redtx, #f08a8a); }
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
.mapview-card .mv-aanb { font-style: normal; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.14em; text-transform: uppercase; color: #0c140e; background: var(--g, #3fc97a); border-radius: 4px; padding: 1px 8px; }
.mapview-card .mv-ku { color: var(--mut, rgba(240,237,228,0.78)); }
.mapview-card .mv-kd { color: var(--ink, #f0ede4); }
.mapview-card .mv-infostap p { margin: 2px 0; font: 20px/1.4 'Arial Narrow', Arial, sans-serif; color: var(--ink, #f0ede4); }
.mapview-card .mv-hier b { display: block; font: normal 26px/1.1 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.mapview-card .mv-hier .mv-hier-plek { margin: 2px 0 4px; font: 20px/1.35 'Arial Narrow', Arial, sans-serif; color: var(--ink, #f0ede4); }
/* de uitleg: een blok in de kaartkolom onder het zoekveld, geen los vlak over de titel (#602) */
.mapview-overlay .mv-help { position: absolute; inset: 0; z-index: 12; display: grid; place-items: center; padding: 40px; background: rgba(12, 20, 14, 0.78); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); animation: mv-help-in 0.18s ease-out; }
.mapview-overlay .mv-help-box { width: min(600px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; gap: var(--ds-s-4); }
.mapview-overlay .mv-help-head { align-items: center; }
.mapview-overlay .mv-help-head .ds-kaart__titel { margin: 0; }
.mapview-overlay .mv-help-x { flex: none; display: grid; place-items: center; width: 40px; height: 40px; margin-left: auto; padding: 0; border: var(--ds-lijn) solid currentColor; border-radius: var(--ds-r); background: transparent; color: inherit; cursor: pointer; }
.mapview-overlay .mv-help-x svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.mapview-overlay .mv-help-x:hover { background: var(--ds-kop-tx); color: var(--ds-kop-bg); }
.mapview-overlay .mv-help ul { margin: 0 0 18px 20px; padding: 0; }
.mapview-overlay .mv-help li { margin: 6px 0; }
.mapview-overlay .mv-help-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 18px; }
/* Het pad naar Hulp liep buiten de popup af; het mag krimpen en doorlopen (#602). */
.mapview-overlay .mv-help-foot small { min-width: 0; flex: 1 1 220px; color: var(--ds-tx-zacht); font-size: var(--ds-t-hulp); line-height: var(--ds-lh-tekst); overflow-wrap: anywhere; }
.mapview-overlay .mv-help .mv-help-ok { display: inline-flex; align-items: center; gap: var(--ds-s-2); min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
.mapview-overlay .mv-help .mv-help-ok:focus-visible, .mapview-overlay .mv-help-x:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-kop-tx); outline-offset: var(--ds-focus-afstand); }
.mapview-overlay .mv-help .mv-help-ok:focus-visible { outline-color: var(--ds-focus); }
@keyframes mv-help-in { from { opacity: 0; } to { opacity: 1; } }
@media (max-height: 760px) { .mapview-overlay .mv-help-box { gap: var(--ds-s-3); } }
.mapview-overlay .mv-uitleg small { display: block; margin-top: 8px; font-size: 18px; color: var(--mut, rgba(240,237,228,0.65)); }
.mapview-legend .mv-leg-hint { margin: 0 2px 8px; }
.mapview-legend .mv-leg-hint .hint { margin: 0 0 2px; }
.mapview-legend .mv-leg-hint .hint:last-child { margin-bottom: 0; }
`;
