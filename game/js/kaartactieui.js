// De opmaak van de actiebalk, de reiskeuze en de uitleg op de kaart (#445, #602). Alleen
// tekenreeksen en stijl; mapview.js zet ze in de kaartkaart en regelt de kliks.
// De tekst en de regels zitten in kaartactie.js.
//
// #602: de actiebalk staat op menuformaat (.m-bp/.m-bg-maten: 26 px Bebas, 18 px uitleg,
// 56 px hoge rijen), alle kleuren komen uit de tokens met een terugval (--ink, --g,
// --redtx, --line2, --mk-*), en er staat geen tekst meer onder 13 px in.
import { icoon } from './icons.js';
import { dsButtonKey, knopToets, KNOP_TOETSEN } from './dsbutton.js';
import { KAART_UITLEG, GAST_UITLEG, HIER_TITEL, HIER_HINT, legendaRegels, REIS_MODI } from './kaartactie.js';
import { uitlegBlok as iconenBlok } from './uitleg.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (naam) => icoon(naam, { maat: 'l' });

// #1215: een rij zonder icoonnaam of met een kaal getal als kosten wordt niet een vraagteken of "Trein12": het icoon volgt de vervoerswijze, een getal wordt een bedrag.
const MODUS_ICOON = Object.fromEntries(REIS_MODI.map((m) => [m.id, m.icoon]));
const feit = (x) => (typeof x === 'number' ? (x > 0 ? `€ ${x}` : '') : x);

// de drie knoppen; stap: de actie die nu is uitgeklapt (reis of info)
export function actiesHtml(model, stap) {
  return '<div class="mv-acties" role="group" aria-label="Wat wil je met deze plek?">' + model.acties.map((a) =>
    `<button type="button" class="mv-actie${a.id === stap ? ' open' : ''}" data-card="${a.id}"${a.toets ? ` data-key="${esc(a.toets)}" aria-keyshortcuts="${esc(a.toets)}"` : ''}${a.disabled ? ' aria-disabled="true"' : ''}${a.id === 'reis' ? ' aria-haspopup="dialog"' : a.id === 'info' ? ` aria-expanded="${a.id === stap}"` : ''}>` +
      `${svg(a.icoon)}<span class="mv-at"><span class="mv-al">${esc(a.label)}</span><small>${esc(a.sub)}</small></span>${knopToets(a.toets, { rechts: true })}</button>`).join('') + '</div>';
}

// Sluiten van de plekkaart: een knop met de Esc-toets erin (de B-knop van een controller), zoals alle knoppen in kaartpopups (21-11).
export function sluitHtml() {
  return `<div class="mv-btns">${dsButtonKey({ label: 'Sluiten', toets: KNOP_TOETSEN.terug, klasse: 'ds-z-knop ds-z-knop--secundair mv-sluit', attrs: 'data-card="close"' })}</div>`;
}

// de reiskeuze: een rij per vervoerswijze met icoon, een zin, de kosten, de duur, 'aanbevolen', de reden als het niet kan en de cijfertoets in de rij zelf.
// Zelf gaan is geen rij meer: dat is Zet routepunt (21-11).
export const REIS_UITLEG_KAART = 'Kies hoe je reist. Liever zelf gaan? Zet dan een routepunt.';
export function reisHtml(rijen, gekozen, kleur = {}, uitleg = REIS_UITLEG_KAART) {
  const rij = (r) => {
    const sel = r.id === gekozen && !r.geenRoute;
    const st = kleur[r.id] ? ` style="border-left-color:${esc(kleur[r.id])}"` : '';
    const toets = r.toets ? ` data-key="${esc(r.toets)}" aria-keyshortcuts="${esc(r.toets)}"` : '';
    const feiten = [feit(r.kosten), feit(r.duur), r.disabled].filter(Boolean).map(esc).join(' · ');
    return `<button type="button" class="mv-keuze${sel ? ' sel' : ''}${r.disabled ? ' uit' : ''}" data-card="kies:${esc(r.id)}"${toets}${r.disabled ? ' aria-disabled="true"' : ''}${sel ? ' aria-pressed="true"' : ''}${st}>` +
      `<span class="mv-ki" aria-hidden="true">${icoon(r.icoon || MODUS_ICOON[r.id] || 'auto', { maat: 'l' })}</span>` +
      `<span class="mv-kt"><span class="mv-kk"><span class="mv-kl">${esc(r.label)}</span> ${r.aanbevolen ? '<i class="mv-aanb">aanbevolen</i>' : ''}</span> ` +
      `${r.uitleg ? `<span class="mv-ku">${esc(r.uitleg)}</span> ` : ''}<span class="mv-kd">${feiten}</span></span>${knopToets(r.toets, { rechts: true })}</button>`;
  };
  return `<div class="mv-reiskeuze" role="group" aria-label="Hoe wil je reizen?">${uitleg ? `<p class="mv-uit">${esc(uitleg)}</p>` : ''}${rijen.map(rij).join('')}</div>`;
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
    // #989: de rijen met icoon (uit in Instellingen, geen iconen = alleen de regels); een gast leest de Samen spelen-regel als zin eronder
    (iconen || lijst) + (gast && iconen ? `<p class="ds-z-kaart__tekst mv-help-gast">${esc(GAST_UITLEG)}</p>` : '') +
    `<div class="mv-help-foot">${dsButtonKey({ label: 'Begrepen', toets: KNOP_TOETSEN.bevestig, klasse: 'ds-z-knop mv-help-ok', attrs: 'data-act="uitleg-sluit"' })}</div></div></div>`;
}

// De reiskeuze als eigen popup (21-11): de plekkaart blijft compact, 'Reis erheen' opent dit venster. Een rij per vervoerswijze (trein, bus,
// taxi, boot) met kosten, duur en de reden als het niet kan (gast, te weinig geld, geen verbinding); onderaan Reis nu (Enter, A) en Terug (Esc, B)
// met de toets IN de knop, en elke rij draagt zijn cijfertoets. Zelf gaan is er niet: dat is Zet routepunt op de plekkaart.
// #1216 (hertest 24-11): dit is DE reiskaart. De reisvraag bij een verhaalstap (reispanel.js) tekent dezelfde kaart met dezelfde kop, rijen en
// knoppen; alleen de inhoud verschilt (Snel reizen, Zelf gaan, Overslaan). Eerst waren het twee componenten voor dezelfde keuze.
// model: { titel, kicker, naam, afstand, uitleg, rijen, gekozen, kleur, melding, reis: { label, uitgeschakeld } | null, terug: label | null, hud }
export function reisKaartHtml(m) {
  const rijen = m.rijen && m.rijen.length ? reisHtml(m.rijen, m.gekozen, m.kleur || {}, m.uitleg === undefined ? REIS_UITLEG_KAART : m.uitleg) : '';
  const reden = m.melding ? `<p class="ds-z-kaart__tekst mv-reispop-reden" role="status">${esc(m.melding)}</p>` : '';
  const reis = m.reis ? dsButtonKey({ label: m.reis.label, toets: KNOP_TOETSEN.bevestig, klasse: 'ds-z-knop mv-reispop-ok', attrs: 'data-card="rij"', uit: !!m.reis.uitgeschakeld }) : '';
  const terug = m.terug === null ? '' : dsButtonKey({ label: m.terug || 'Terug', toets: KNOP_TOETSEN.terug, klasse: 'ds-z-knop ds-z-knop--secundair mv-reispop-terug', attrs: 'data-card="reis-sluit"' });
  const plek = m.naam || m.afstand ? `<p class="ds-z-kaart__tekst mv-reispop-plek">${m.naam ? `<b>${esc(m.naam)}</b>` : ''}${m.naam && m.afstand ? ' · ' : ''}${m.afstand ? esc(m.afstand) : ''}</p>` : '';
  return `<div class="mv-reispop${m.hud ? ' mv-reispop--hud' : ''}" role="dialog"${m.hud ? '' : ' aria-modal="true"'} aria-labelledby="mv-reispop-t">` +
    `<div class="ds-zeef ds-z-kaart ds-z-kaart--recht mv-reispop-box"><div class="ds-z-kaart__kop">${m.kicker ? `<span class="mv-reispop-eb">${esc(m.kicker)}</span>` : ''}<h2 id="mv-reispop-t" class="ds-z-kaart__titel">${esc(m.titel || 'Reis erheen')}</h2></div>` +
    plek + rijen + reden + `<div class="mv-help-foot">${reis}${terug}</div></div></div>`;
}
// de kaartpopup: Reis erheen naar een plek (mapview.js)
export function reisPopupHtml(m) {
  return reisKaartHtml({ ...m, titel: 'Reis erheen', naam: m.naam || 'Plek op de kaart' });
}

// De legenda bovenaan het luik Lagen (#445): wat een klik doet en, voor een
// gast, wat er in Samen spelen wel en niet kan. data-gast laat mapview.js hem
// verversen als je rol verandert.
export function legendaHintHtml({ gast = false } = {}) {
  return `<div class="mv-leg-hint" data-gast="${gast ? 1 : 0}">` + legendaRegels({ gast }).map((l) => `<p class="hint">${esc(l)}</p>`).join('') + '</div>';
}

// de kaart als je op jezelf klikt: geen routepunt naar je eigen plek, wel waar je staat
export function hierHtml(plek = '') {
  return `<div class="mv-hier"><b>${esc(HIER_TITEL)}</b>${plek ? `<p class="mv-hier-plek">${esc(plek)}</p>` : ''}<p class="mv-note">${esc(HIER_HINT)}</p></div>`;
}

// Alle maten en kleuren in de kaartkaart, op de menusset (#602). Hexen staan alleen
// als terugval ín een token: geen eigen kleur, dus de kleurenblindmodi doen mee.
export const KAART_ACTIE_CSS = `
.mapview-card .mv-acties { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 2px; }
.mapview-card .mv-actie { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 6px 14px; text-align: left; color: var(--ink, #f0ede4); background: transparent; border: 0; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--line2, rgba(240,237,228,0.16)); cursor: pointer; font: 18px/1.3 var(--ds-font-tekst); }
.mapview-card .mv-actie svg { width: 24px; height: 24px; flex: none; color: var(--g, #3fc97a); }
.mapview-card .mv-actie[data-card="haalweg"] svg { color: var(--redtx, #f08a8a); }
.mapview-card .mv-at { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mapview-card .mv-actie .mv-al { font: normal 26px/1.05 var(--ds-font-kop); letter-spacing: 0.04em; }
.mapview-card .mv-actie small { font: 18px/1.2 var(--ds-font-tekst); color: var(--mut, rgba(240,237,228,0.7)); }
.mapview-card .mv-actie:hover, .mapview-card .mv-actie.open { background: color-mix(in srgb, var(--ds-c-licht-groen) 16%, transparent); box-shadow: inset 0 0 0 1px var(--g, #3fc97a); }
.mapview-card .mv-actie:focus-visible, :is(.mapview-card, .mv-reispop) .mv-keuze:focus-visible { outline: 2px solid var(--ink, #f0ede4); outline-offset: 2px; }
.mapview-card .mv-actie[aria-disabled] { opacity: 0.55; }
:is(.mapview-card, .mv-reispop) .mv-reiskeuze { display: flex; flex-direction: column; gap: 6px; margin: 6px 0; }
:is(.mapview-card, .mv-reispop) .mv-uit, :is(.mapview-card, .mv-reispop) .mv-note { margin: 0; font: 18px/1.4 var(--ds-font-tekst); color: var(--mut, rgba(240,237,228,0.8)); }
:is(.mapview-card, .mv-reispop) .mv-keuze { display: flex; flex-direction: row; align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px; text-align: left; color: var(--ink, #f0ede4); background: transparent; border: 0; border-left: 6px solid var(--line2, rgba(240,237,228,0.16)); border-radius: 8px; cursor: pointer; font: 18px/1.35 var(--ds-font-tekst); }
:is(.mapview-card, .mv-reispop) .mv-keuze.sel { background: color-mix(in srgb, var(--ds-c-licht-groen) 18%, transparent); border-left-color: var(--g, #3fc97a); }
:is(.mapview-card, .mv-reispop) .mv-keuze[aria-disabled] { opacity: 0.55; }
:is(.mapview-card, .mv-reispop) .mv-kt { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
:is(.mapview-card, .mv-reispop) .mv-ki { display: inline-flex; flex: none; }
:is(.mapview-card, .mv-reispop) .mv-ki svg { width: 24px; height: 24px; }
:is(.mapview-card, .mv-reispop) .mv-kk { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
:is(.mapview-card, .mv-reispop) .mv-kk .mv-kl { font-family: var(--ds-font-kop); font-size: 24px; letter-spacing: 0.04em; }
:is(.mapview-card, .mv-reispop) .mv-aanb { font-style: normal; font-size: max(13px, var(--menu-min, 13px)); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ds-c-glas); background: var(--g, #3fc97a); border-radius: 4px; padding: 1px 8px; }
:is(.mapview-card, .mv-reispop) .mv-ku { color: var(--mut, rgba(240,237,228,0.78)); }
:is(.mapview-card, .mv-reispop) .mv-kd { color: var(--ink, #f0ede4); }
.mapview-card .mv-infostap p { margin: 2px 0; font: 20px/1.4 var(--ds-font-tekst); color: var(--ink, #f0ede4); }
.mapview-card .mv-hier b { display: block; font: normal 26px/1.1 var(--ds-font-kop); letter-spacing: 0.04em; }
.mapview-card .mv-hier .mv-hier-plek { margin: 2px 0 4px; font: 20px/1.35 var(--ds-font-tekst); color: var(--ink, #f0ede4); }
/* de uitleg en de reispopup (21-11): een compacte papieren kaart op een rustig gedimde kaart, zonder vervaging; tekst op 15 px of meer */
:is(.mapview-overlay, .reis-hud) :is(.mv-help, .mv-reispop) { position: absolute; inset: 0; z-index: 12; pointer-events: auto; display: grid; place-items: center; padding: var(--ds-s-5); background: color-mix(in srgb, var(--ds-c-ink-inkt, #1b1a17) 45%, transparent); animation: mv-help-in var(--ds-m, 200ms) var(--ds-ease, ease-out) both; }
:is(.mapview-overlay, .reis-hud) :is(.mv-help-box, .mv-reispop-box) { width: min(460px, 100%); max-height: 100%; overflow-y: auto; box-sizing: border-box; gap: var(--ds-s-3); font-size: max(15px, var(--menu-min, 15px)); animation: mv-help-kaart var(--ds-m, 200ms) var(--ds-ease, ease-out) both; }
:is(.mapview-overlay, .reis-hud) .mv-reispop-box { width: min(520px, 100%); }
:is(.mapview-overlay, .reis-hud) .mv-help-head .ds-z-kaart__titel, :is(.mapview-overlay, .reis-hud) .mv-reispop-box .ds-z-kaart__titel { margin: 0; }
.mapview-overlay .mv-help-regels { margin: var(--ds-s-2) 0 0 var(--ds-s-5); padding: 0; font-size: max(15px, var(--menu-min, 15px)); }
.mapview-overlay .mv-help-regels li { margin: var(--ds-s-1) 0; }
:is(.mapview-overlay, .reis-hud) .mv-help-foot { display: flex; align-items: center; flex-wrap: wrap; gap: var(--ds-s-2) var(--ds-s-3); }
.mapview-overlay .mv-help-gast { margin: 0; color: var(--ds-tx-zacht); font-size: max(15px, var(--menu-min, 15px)); line-height: 1.4; }
.mapview-card .mv-sluit { min-height: var(--ds-doel-aanraken); padding: var(--ds-s-1) var(--ds-s-4); font-size: var(--ds-t-label); box-shadow: none; }
.mapview-card .mv-sluit:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); }
:is(.mapview-overlay, .reis-hud) :is(.mv-help-ok, .mv-reispop-ok, .mv-reispop-terug) { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
:is(.mapview-overlay, .reis-hud) :is(.mv-help-ok, .mv-reispop-ok, .mv-reispop-terug):focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); }
:is(.mapview-overlay, .reis-hud) .mv-reispop-plek { margin: 0; font-size: max(15px, var(--menu-min, 15px)); }
:is(.mapview-overlay, .reis-hud) .mv-reispop-reden { margin: 0; padding: var(--ds-s-2) var(--ds-s-3); border: var(--ds-lijn-dik) dashed var(--ds-c-ink-inkt); border-radius: var(--ds-r); font-size: max(15px, var(--menu-min, 15px)); }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-reiskeuze { margin: 0; }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-keuze { min-height: var(--ds-doel-aanraken); font-size: max(15px, var(--menu-min, 15px)); color: var(--ds-zeef-tx); border-left-color: var(--ds-c-ink-inkt); }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-keuze.uit { opacity: 1; }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-keuze.uit :is(.mv-kl, .mv-ki) { opacity: 0.6; }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-keuze.sel { background: var(--ds-c-sel-vlak); box-shadow: inset 0 0 0 var(--ds-lijn-dik) var(--ds-c-ink-bord); }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-keuze:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-kk .mv-kl { font-size: max(20px, var(--menu-min, 20px)); }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-uit, :is(.mapview-overlay, .reis-hud) .mv-reispop .mv-ku, :is(.mapview-overlay, .reis-hud) .mv-reispop .mv-kd { color: var(--ds-tx-zacht); font-size: max(15px, var(--menu-min, 15px)); font-family: var(--ds-font-zeef-tekst); }
:is(.mapview-overlay, .reis-hud) .mv-reispop .mv-aanb { font-size: max(13px, var(--menu-min, 13px)); }
.mapview-overlay .mv-zoektip { position: absolute; left: 0; right: 0; top: calc(100% + var(--ds-s-2)); z-index: 12; margin: 0; padding: var(--ds-s-2) var(--ds-s-3); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-hulp); line-height: var(--ds-lh-tekst); pointer-events: none; }
@keyframes mv-help-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes mv-help-kaart { from { opacity: 0; translate: 0 var(--ds-s-2); } to { opacity: 1; translate: 0 0; } }
@media (prefers-reduced-motion: reduce) { :is(.mapview-overlay, .reis-hud) :is(.mv-help, .mv-reispop, .mv-help-box, .mv-reispop-box) { animation: none; } }
html.reduce-motion :is(.mapview-overlay, .reis-hud) :is(.mv-help, .mv-reispop, .mv-help-box, .mv-reispop-box), html.rustig-drukwerk :is(.mapview-overlay, .reis-hud) :is(.mv-help, .mv-reispop, .mv-help-box, .mv-reispop-box) { animation: none; }
@media (max-height: 760px) { .mapview-overlay :is(.mv-help-box, .mv-reispop-box) { gap: var(--ds-s-2); } .mapview-overlay :is(.mv-help, .mv-reispop) { padding: var(--ds-s-3); } }
.mapview-overlay .mv-uitleg small { display: block; margin-top: 8px; font-size: 18px; color: var(--mut, rgba(240,237,228,0.65)); }
/* #1216: de reisvraag van een verhaalstap is dezelfde kaart, bovenin het spel zonder de kaart erachter te dimmen */
.reis-hud .mv-reispop.mv-reispop--hud { position: fixed; inset: 120px 0 auto 0; z-index: 40; place-items: start center; background: none; pointer-events: none; }
.reis-hud .mv-reispop--hud .mv-reispop-box { pointer-events: auto; }
/* in de groene kop: de kicker licht boven de titel, beide links (de kop zet zijn kinderen anders uit elkaar) */
:is(.mapview-overlay, .reis-hud) .mv-reispop-box > .ds-z-kaart__kop:has(.mv-reispop-eb) { flex-direction: column; align-items: flex-start; gap: 2px; }
:is(.mapview-overlay, .reis-hud) .mv-reispop-eb { display: block; margin: 0; font-family: var(--ds-font-kop); font-size: max(13px, var(--ds-t-label, 13px)); letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--ds-c-wit, #fff) 78%, transparent); }
.mapview-legend .mv-leg-hint { margin: 0 2px 8px; }
.mapview-legend .mv-leg-hint .hint { margin: 0 0 2px; }
.mapview-legend .mv-leg-hint .hint:last-child { margin-bottom: 0; }
`;
