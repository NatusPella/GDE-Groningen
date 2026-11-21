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
import { uitlegBlok as iconenBlok } from './uitleg.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (naam) => icoon(naam, { maat: 'l' });

// de drie knoppen; stap: de actie die nu is uitgeklapt (reis of info)
export function actiesHtml(model, stap) {
  return '<div class="mv-acties" role="group" aria-label="Wat wil je met deze plek?">' + model.acties.map((a) =>
    `<button type="button" class="mv-actie${a.id === stap ? ' open' : ''}" data-card="${a.id}"${a.disabled ? ' aria-disabled="true"' : ''}${a.id === 'reis' ? ' aria-haspopup="dialog"' : a.id === 'info' ? ` aria-expanded="${a.id === stap}"` : ''}>` +
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

// De uitleg bij de kaart, als eenmalige kaart over de kaart (#445, herzien 21-11): compact (420 tot 480 px), vier genummerde rijen met een
// icoon en de toetsen als toetskap in de zin, één primaire knop 'Begrepen' met de Enter-toets ernaast (geen icoon in de knop), 'Meer uitleg'
// als uitklapper en de hulplink onderaan. De kaart erachter is gedimd en Lagen staat dicht; rij 1 en 2 wijzen hun onderdeel aan (mapview.js).
// Gaat weg met Begrepen, Enter, Escape (B op een controller) of een klik ernaast; geen kruisje.
// mapview.js bepaalt wanneer hij opengaat en onthoudt dat hij gezien is.
export function uitlegHtml({ gast = false } = {}) {
  const regels = gast ? [...KAART_UITLEG, GAST_UITLEG] : KAART_UITLEG;
  const iconen = iconenBlok('kaart-actie', { inline: true, genummerd: true, titel: false, zonderMeer: true });
  const lijst = '<ul class="ds-z-kaart__tekst mv-help-regels">' + regels.map((l) => `<li>${esc(l)}</li>`).join('') + '</ul>';
  return `<div class="mv-help" role="dialog" aria-modal="true" aria-labelledby="mv-help-t" data-gast="${gast ? 1 : 0}">` +
    '<div class="ds-zeef ds-z-kaart ds-z-kaart--recht mv-help-box"><div class="ds-z-kaart__kop mv-help-head"><h2 id="mv-help-t" class="ds-z-kaart__titel">Zo werkt de kaart</h2></div>' +
    // #989: eerst de rijen met icoon; de volledige regels blijven in 'Meer uitleg' staan (uit in Instellingen = alleen de regels)
    (iconen ? iconen + '<details class="ds-uitleg__meer mv-help-meer"><summary>Meer uitleg</summary>' + lijst + '</details>' : lijst) +
    '<div class="mv-help-foot"><button type="button" class="ds-z-knop mv-help-ok" data-act="uitleg-sluit">Begrepen</button>' +
    '<span class="mv-help-toets ds-toetsregel" aria-hidden="true">' + keyTextHtml('{ENTER}') + '</span></div>' +
    '<p class="mv-help-hulp">Terug te vinden onder Instellingen › Besturing › Hulp.</p></div></div>';
}

// De reiskeuze als eigen popup (21-11): de plekkaart blijft compact, 'Reis erheen' opent dit venster. Dezelfde rijen als reisHtml, de
// kosten en duur per keuze, de reden als reizen niet kan (gast, te weinig geld, geen verbinding) en onderaan Reis nu (Enter) en Terug (Esc).
// model: { naam, afstand, rijen, gekozen, kleur, gast, melding, reis: { label, uitgeschakeld, reden } | null }
export function reisPopupHtml(m) {
  const rijen = m.rijen && m.rijen.length ? reisHtml(m.rijen, m.gekozen, m.kleur || {}) : '';
  const reden = m.melding ? `<p class="ds-z-kaart__tekst mv-reispop-reden" role="status">${esc(m.melding)}</p>` : '';
  const reis = m.reis
    ? `<button type="button" class="ds-z-knop mv-reispop-ok" data-card="rij"${m.reis.uitgeschakeld ? ' disabled' : ''}>${esc(m.reis.label)}</button>` +
      (m.reis.uitgeschakeld ? '' : `<span class="mv-help-toets ds-toetsregel" aria-hidden="true">${keyTextHtml('{ENTER}')}</span>`)
    : '';
  return '<div class="mv-reispop" role="dialog" aria-modal="true" aria-labelledby="mv-reispop-t">' +
    '<div class="ds-zeef ds-z-kaart ds-z-kaart--recht mv-reispop-box"><div class="ds-z-kaart__kop"><h2 id="mv-reispop-t" class="ds-z-kaart__titel">Reis erheen</h2></div>' +
    `<p class="ds-z-kaart__tekst mv-reispop-plek"><b>${esc(m.naam || 'Plek op de kaart')}</b>${m.afstand ? ` · ${esc(m.afstand)}` : ''}</p>` +
    rijen + reden +
    `<div class="mv-help-foot">${reis}<button type="button" class="ds-z-knop ds-z-knop--secundair mv-reispop-terug" data-card="reis-sluit">Terug</button>` +
    `<span class="mv-help-toets ds-toetsregel" aria-hidden="true">${keyTextHtml('{ESC}')}</span></div></div></div>`;
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
.mapview-card .mv-actie:focus-visible, :is(.mapview-card, .mv-reispop) .mv-keuze:focus-visible { outline: 2px solid var(--ink, #f0ede4); outline-offset: 2px; }
.mapview-card .mv-actie[aria-disabled] { opacity: 0.55; }
:is(.mapview-card, .mv-reispop) .mv-reiskeuze { display: flex; flex-direction: column; gap: 6px; margin: 6px 0; }
:is(.mapview-card, .mv-reispop) .mv-uit, :is(.mapview-card, .mv-reispop) .mv-note { margin: 0; font: 18px/1.4 'Arial Narrow', Arial, sans-serif; color: var(--mut, rgba(240,237,228,0.8)); }
:is(.mapview-card, .mv-reispop) .mv-keuze { display: flex; flex-direction: column; gap: 2px; min-height: 56px; padding: 8px 12px; text-align: left; color: var(--ink, #f0ede4); background: transparent; border: 0; border-left: 6px solid var(--line2, rgba(240,237,228,0.16)); border-radius: 8px; cursor: pointer; font: 18px/1.35 'Arial Narrow', Arial, sans-serif; }
:is(.mapview-card, .mv-reispop) .mv-keuze.sel { background: rgba(63,201,122,0.18); border-left-color: var(--g, #3fc97a); }
:is(.mapview-card, .mv-reispop) .mv-keuze[aria-disabled] { opacity: 0.55; }
:is(.mapview-card, .mv-reispop) .mv-kk { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
:is(.mapview-card, .mv-reispop) .mv-kk .mv-kl { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 24px; letter-spacing: 0.04em; }
:is(.mapview-card, .mv-reispop) .mv-aanb { font-style: normal; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.14em; text-transform: uppercase; color: #0c140e; background: var(--g, #3fc97a); border-radius: 4px; padding: 1px 8px; }
:is(.mapview-card, .mv-reispop) .mv-ku { color: var(--mut, rgba(240,237,228,0.78)); }
:is(.mapview-card, .mv-reispop) .mv-kd { color: var(--ink, #f0ede4); }
.mapview-card .mv-infostap p { margin: 2px 0; font: 20px/1.4 'Arial Narrow', Arial, sans-serif; color: var(--ink, #f0ede4); }
.mapview-card .mv-hier b { display: block; font: normal 26px/1.1 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.mapview-card .mv-hier .mv-hier-plek { margin: 2px 0 4px; font: 20px/1.35 'Arial Narrow', Arial, sans-serif; color: var(--ink, #f0ede4); }
/* de uitleg en de reispopup (21-11): een compacte papieren kaart op een rustig gedimde kaart, zonder vervaging; tekst op 15 px of meer */
.mapview-overlay :is(.mv-help, .mv-reispop) { position: absolute; inset: 0; z-index: 12; pointer-events: auto; display: grid; place-items: center; padding: var(--ds-s-5); background: color-mix(in srgb, var(--ds-c-ink-inkt, #1b1a17) 45%, transparent); animation: mv-help-in var(--ds-m, 200ms) var(--ds-ease, ease-out) both; }
.mapview-overlay :is(.mv-help-box, .mv-reispop-box) { width: min(460px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; gap: var(--ds-s-3); font-size: max(15px, var(--menu-min, 15px)); animation: mv-help-kaart var(--ds-m, 200ms) var(--ds-ease, ease-out) both; }
.mapview-overlay .mv-reispop-box { width: min(520px, 100%); }
.mapview-overlay .mv-help-head .ds-z-kaart__titel, .mapview-overlay .mv-reispop-box .ds-z-kaart__titel { margin: 0; }
.mapview-overlay .mv-help-regels { margin: var(--ds-s-2) 0 0 var(--ds-s-5); padding: 0; font-size: max(15px, var(--menu-min, 15px)); }
.mapview-overlay .mv-help-regels li { margin: var(--ds-s-1) 0; }
.mapview-overlay .mv-help-meer { margin: 0; }
.mapview-overlay .mv-help-meer > summary { min-height: var(--ds-s-6); display: flex; align-items: center; }
.mapview-overlay .mv-help-foot { display: flex; align-items: center; flex-wrap: wrap; gap: var(--ds-s-2) var(--ds-s-3); }
.mapview-overlay .mv-help-toets { display: inline-flex; align-items: center; gap: var(--ds-s-1); color: var(--ds-tx-zacht, inherit); font-size: max(15px, var(--menu-min, 15px)); }
.mapview-overlay .mv-help-hulp { margin: 0; color: var(--ds-tx-zacht); font-size: max(15px, var(--menu-min, 15px)); line-height: 1.4; }
.mapview-overlay :is(.mv-help-ok, .mv-reispop-ok, .mv-reispop-terug) { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
.mapview-overlay :is(.mv-help-ok, .mv-reispop-ok, .mv-reispop-terug):focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); }
.mapview-overlay .mv-reispop-plek { margin: 0; font-size: max(15px, var(--menu-min, 15px)); }
.mapview-overlay .mv-reispop-reden { margin: 0; padding: var(--ds-s-2) var(--ds-s-3); border: var(--ds-lijn-dik) dashed var(--ds-c-ink-inkt); border-radius: var(--ds-r); font-size: max(15px, var(--menu-min, 15px)); }
.mapview-overlay .mv-reispop .mv-reiskeuze { margin: 0; }
.mapview-overlay .mv-reispop .mv-keuze { min-height: var(--ds-doel-aanraken); font-size: max(15px, var(--menu-min, 15px)); color: var(--ds-zeef-tx); border-left-color: var(--ds-c-ink-inkt); }
.mapview-overlay .mv-reispop .mv-keuze.sel { background: var(--ds-c-sel-vlak); box-shadow: inset 0 0 0 var(--ds-lijn-dik) var(--ds-c-ink-bord); }
.mapview-overlay .mv-reispop .mv-keuze:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); }
.mapview-overlay .mv-reispop .mv-kk .mv-kl { font-size: max(20px, var(--menu-min, 20px)); }
.mapview-overlay .mv-reispop .mv-uit, .mapview-overlay .mv-reispop .mv-ku, .mapview-overlay .mv-reispop .mv-kd { color: var(--ds-tx-zacht); font-size: max(15px, var(--menu-min, 15px)); font-family: var(--ds-font-zeef-tekst); }
.mapview-overlay .mv-reispop .mv-aanb { font-size: max(13px, var(--menu-min, 13px)); }
@keyframes mv-help-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes mv-help-kaart { from { opacity: 0; translate: 0 var(--ds-s-2); } to { opacity: 1; translate: 0 0; } }
@media (prefers-reduced-motion: reduce) { .mapview-overlay :is(.mv-help, .mv-reispop, .mv-help-box, .mv-reispop-box) { animation: none; } }
html.reduce-motion .mapview-overlay :is(.mv-help, .mv-reispop, .mv-help-box, .mv-reispop-box), html.rustig-drukwerk .mapview-overlay :is(.mv-help, .mv-reispop, .mv-help-box, .mv-reispop-box) { animation: none; }
@media (max-height: 760px) { .mapview-overlay :is(.mv-help-box, .mv-reispop-box) { gap: var(--ds-s-2); } .mapview-overlay :is(.mv-help, .mv-reispop) { padding: var(--ds-s-3); } }
.mapview-overlay .mv-uitleg small { display: block; margin-top: 8px; font-size: 18px; color: var(--mut, rgba(240,237,228,0.65)); }
.mapview-legend .mv-leg-hint { margin: 0 2px 8px; }
.mapview-legend .mv-leg-hint .hint { margin: 0 0 2px; }
.mapview-legend .mv-leg-hint .hint:last-child { margin-bottom: 0; }
`;
