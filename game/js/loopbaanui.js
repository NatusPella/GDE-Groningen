// Loopbaan (#381): het onderdeel Loopbanen van het pauzemenu. Eén overzicht: links alle vakken in drie groepen (vervoer, werk,
// sport en spel), elk met een icoon, het niveau, de functietitel en een voortgangsbalk; rechts wat je in het gekozen vak bereikt
// hebt, het volgende doel, wat het vak betaalt en de bezigheden die erbij horen (vissen, boeren, taxi, bus, krant, vracht, ...),
// elk met hun eigen stand. Elke bezigheid staat er één keer: de volgende klus is een label in de lijst, geen tweede knop (#430).
// Een vak dat nog niet begonnen is, toont waar en met welke eerste klus je het begint (#431): vanaf de eigen startplek of met
// de knop hier. De gegevens komen uit loopbaanlive.js (en loopbaan.js); dit bestand is alleen DOM. Niet in beeld bekeken.
import * as L from './loopbaan.js';
import { getProfiel, startLoopbaan } from './loopbaanlive.js';
import { SIDE_JOBS } from './sidejobs.js';
import { fillBars } from './motion.js';
import { boekVoortgang } from './visboeklive.js';
import { baanDoelen } from './todoui.js';
import { loopbaanStap, STEP_BY_ID } from './storyarc.js';
import { controleStand, CONTROLE_MIN_NIVEAU } from './kaartjescontrole.js';
import { getServiceMapState } from './machinist.js';
import { sfeerStijl, sfeerBandHtml, SFEER_BAND_CSS } from './carrieresfeer.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n) => Math.round(n).toLocaleString('nl-NL');
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

// De iconen van de vakken, in dezelfde lijnstijl als de rest van het menu.
const ICONEN = {
  trein: '<rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 11h14M8 16.5V20h8v-3.5M9 20l-2 1.5M15 20l2 1.5"/><circle cx="9" cy="13.8" r=".7"/><circle cx="15" cy="13.8" r=".7"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2.5"/><path d="M4 11h16M7 17v3M17 17v3"/><circle cx="8" cy="14" r=".7"/><circle cx="16" cy="14" r=".7"/>',
  taxi: '<path d="M4 15l1.6-5.2A2 2 0 0 1 7.5 8.5h9a2 2 0 0 1 1.9 1.3L20 15M3 15h18v4H3zM9 8.5V6.5h6v2"/><circle cx="7.5" cy="17" r=".7"/><circle cx="16.5" cy="17" r=".7"/>',
  pakket: '<path d="M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9"/>',
  boot: '<path d="M3 15h18l-2.5 4h-13zM12 4v11M12 5l6 8h-6M10 8l-4 5h4"/>',
  heli: '<path d="M3 5h18M12 5v4M6 14a6 5 0 0 1 12 0v1H6zM18 14h3M8 19h8M10 15v4M14 15v4"/>',
  schild: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  balie: '<rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M9 15h6"/>',
  masker: '<path d="M5 5h14v6a7 7 0 0 1-14 0zM9 10h.01M15 10h.01M9 14.5c1 1 5 1 6 0"/>',
  pan: '<path d="M3 11h14v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM17 12h4M7 7c0-1 1-1 1-2M11 7c0-1 1-1 1-2"/>',
  rad: '<circle cx="12" cy="10" r="6.5"/><path d="M12 3.5v13M5.5 10h13M7.4 5.4l9.2 9.2M16.6 5.4l-9.2 9.2M8 21l4-4.5 4 4.5"/>',
  hamer: '<path d="M14 3l6 6-3.2 3.2-6-6zM12 8.5L4 16.5V20h3.5l8-8"/>',
  padel: '<ellipse cx="10" cy="9" rx="6" ry="6.5"/><path d="M14.5 13.8L20 19.5M8 7h.01M11 9h.01M9 12h.01"/>',
  vlag: '<path d="M8 21V4l9 4-9 4M5 21h10"/>',
  race: '<path d="M5 21V4M5 5h14v9H5zM5 9.5h14M9.5 5v9M14.5 5v9"/>',
  boom: '<path d="M12 21v-6M12 3l5 7h-3l4 6H6l4-6H7z"/>',
  vis: '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3zM16.5 11h.01"/>',
  vrachtwagen: '<path d="M2 7h12v9H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  trekker: '<circle cx="7" cy="16" r="3.4"/><circle cx="18" cy="17.5" r="2"/><path d="M7 12.6V7h6l2 5h3v3.5M10 7V4h2"/>',
};
const loopbaanIcoon = (naam, cls = 'pa-ico') => `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONEN[naam] || ICONEN.hamer}</svg></span>`;

// De sfeerband komt uit carrieresfeer.js (#492, #609), dezelfde band als Visboek en Boerderij.
// De kleine regel boven de naam is de groep van het vak, geen ontwerptaal.


const CSS = `${SFEER_BAND_CSS}
.lb-hero { flex: none; }
.lb-hero--leeg .lb-eerste { display: flex; flex-wrap: wrap; gap: var(--ds-s-2); margin-top: 2px; }
.lb-hero--leeg .lb-eerste .ds-chip { min-height: 32px; }
.lb-hero--leeg .lb-eerste .ds-chip { padding: 0 var(--ds-s-4); }
.lb-hero .pm-hero-t { font-size: 44px; }
.lb-hero > :not(.lb-hero-sfeer):not(.lb-hero-ico) { position: relative; z-index: 1; }
.lb-hero > .lb-hero-sfeer { position: absolute; z-index: 0; top: 0; right: 0; bottom: 0; width: 320px; opacity: 0.42; pointer-events: none; -webkit-mask-image: linear-gradient(90deg, transparent, #000 70%); mask-image: linear-gradient(90deg, transparent, #000 70%); }
.lb-hero > .lb-hero-ico { position: absolute; z-index: 2; right: 32px; top: 50%; width: 72px; height: 72px; margin: 0; color: rgba(240, 237, 228, 0.9); transform: translateY(-50%); }
.lb-hero-ico svg { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.lb-stats { flex: none; }
.lb-groep { display: flex; align-items: baseline; gap: 10px; margin: 16px 0 4px; font-family: "Arial Narrow", Arial, sans-serif; font-size: max(14px, var(--menu-min, 14px)); letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; }
.lb-groep:first-child { margin-top: 0; }
.lb-groep .lb-gn { margin-left: auto; letter-spacing: 0; text-transform: none; opacity: 0.85; font-size: max(14px, var(--menu-min, 14px)); }
.lb-li { gap: 12px; }
.lb-li .nm { min-width: 0; }
.lb-li .lb-niv { display: inline-flex; align-items: baseline; gap: 4px; margin-left: auto; padding: 2px 10px; border-radius: 999px; white-space: nowrap; font-size: max(14px, var(--menu-min, 14px)); opacity: 0.9; background: rgba(240, 237, 228, 0.08); }
.lb-li .lb-niv b { font-family: "Bebas Neue", "Arial Narrow", Arial, sans-serif; font-weight: normal; font-size: 20px; line-height: 1; }
.lb-li .m-bar { flex: none; width: 76px; margin-left: 12px; }
.lb-li.nul .pa-ico { opacity: 0.4; }
.lb-li.sel .lb-niv { background: rgba(63, 201, 122, 0.2); }
.m-pane.lb-pane { gap: 12px; }
.lb-pane .pa-ico svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.lb-pane .lb-blok p { margin: 4px 0; }
.lb-pane p.lb-titel { margin: 0 0 2px; font-size: 24px; }
.lb-pane .lb-kop p { margin: 0; }
.lb-kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 4px 0 2px; flex: none; }
.lb-kpi { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 8px 12px; border-radius: 8px; background: rgba(240, 237, 228, 0.05); box-shadow: inset 0 0 0 1px var(--line); }
.lb-kpi span { font-size: max(13px, var(--menu-min, 13px)); color: var(--mut); }
.lb-kpi b { font-family: "Bebas Neue", "Arial Narrow", Arial, sans-serif; font-weight: normal; font-size: 24px; line-height: 1.05; letter-spacing: 0.02em; overflow-wrap: anywhere; }
.lb-kpi small { font-size: 16px; color: var(--mut); }
.lb-voort { display: flex; align-items: center; gap: 14px; margin: 0 0 4px; }
.lb-voort .m-bar { flex: 1; max-width: 360px; height: 6px; }
.lb-pane .m-num { font-size: 26px; }
/* De ladder als trap (designsysteem v2, #980): een papieren kaart op het glas; elk niveau staat een stap verder naar rechts (--stap),
   het huidige niveau heeft de selectierand en het streepje naar het volgende, elk niveau noemt zijn loon en een chip met pictogram. */
.lb-ladder { gap: var(--ds-s-2); padding: var(--ds-s-3) var(--ds-s-4); margin: 2px 0 0; }
.lb-trap { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.lb-trap li { display: grid; grid-template-columns: 1.6em minmax(0, 1fr) auto; align-items: center; column-gap: var(--ds-s-3); row-gap: var(--ds-s-1); min-height: 44px; padding: var(--ds-s-1) var(--ds-s-3) var(--ds-s-1) calc(var(--ds-s-2) + var(--stap, 0) * 10px); border-left: var(--ds-status-rand) solid transparent; border-radius: 6px; color: var(--ds-tx-zacht); }
.lb-trap li.bereikt { color: var(--ds-tx); border-left-color: var(--ds-succes); }
.lb-trap li.nu { background: var(--ds-selectie-vlak); color: var(--ds-selectie-tx); border-left-color: var(--ds-selectie); }
.lb-trap .nr { font-family: var(--ds-font-kop); font-size: var(--ds-t-subkop); line-height: 1; text-align: right; }
.lb-trap .lb-stap-t { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.lb-trap .lb-stap-t b { font-family: var(--ds-font-kop); font-weight: normal; font-size: var(--ds-t-body); letter-spacing: var(--ds-ls-kop); text-transform: uppercase; }
.lb-trap .lb-loon { font-size: var(--ds-t-hulp); color: var(--ds-tx-zacht); }
.lb-trap li.nu .lb-loon, .lb-trap li.bereikt .lb-loon { color: var(--ds-tx); }
.lb-trap .ds-chip { min-height: 28px; }
.lb-trap .ds-streep { grid-column: 2 / -1; }
.lb-h3 { margin: 6px 0 0; }
.lb-next { padding: 10px 14px 10px 16px; border-radius: 10px; background: rgba(240, 237, 228, 0.04); box-shadow: inset 3px 0 0 var(--g, #3fc97a); }
.lb-next.klaar { box-shadow: inset 3px 0 0 var(--line2); }
.lb-next p { margin: 4px 0; }
.lb-next .lb-voort { margin: 0 0 6px; }
.lb-hero:has(.lb-hero-ico) :is(.pm-hero-h, .pm-hero-t, .pm-hero-lead) { padding-right: 120px; }
@media (max-height: 820px) {
  .lb-hero:has(.lb-hero-ico) :is(.pm-hero-h, .pm-hero-t, .pm-hero-lead) { padding-right: 92px; }
  .lb-hero > .lb-hero-ico { right: 20px; width: 54px; height: 54px; }
  .lb-trap li { min-height: 40px; }
}
.lb-banen { list-style: none; margin: 4px 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px 0; }
.lb-banen li { display: flex; gap: 8px; align-items: center; opacity: 0.6; min-height: 38px; padding: 2px 8px; border-radius: 6px; }
.lb-banen li:has(.lb-doel) { opacity: 1; background: rgba(240, 237, 228, 0.04); }
.lb-banen .lb-doel { margin-left: auto; height: 34px; white-space: nowrap; }
.lb-banen li.klaar { opacity: 1; }
.lb-banen svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; flex: none; }
.lb-banen li:not(.klaar) svg { visibility: hidden; }
.lb-kan { padding-left: 10px; box-shadow: inset 3px 0 0 var(--g, #3fc97a); }
.lb-bz { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.lb-bz > span:first-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lb-bz .mut { font-size: max(14px, var(--menu-min, 14px)); }
.lb-volg { flex: none; padding: 1px 8px; border-radius: 999px; font-family: "Arial Narrow", Arial, sans-serif; font-size: max(12px, var(--menu-min, 12px)); letter-spacing: 0.08em; text-transform: uppercase; background: rgba(63, 201, 122, 0.18); color: var(--g, #3fc97a); }
.lb-bz-link { border-top: 1px solid rgba(255, 255, 255, 0.09); padding-top: 4px; margin-top: 2px; }
.lb-leeg { margin: 4px 0 0; }
.lb-start { padding: 10px 14px; border-radius: 10px; background: rgba(63, 201, 122, 0.1); box-shadow: inset 0 0 0 1.5px rgba(63, 201, 122, 0.4); }
.lb-start p { margin: 4px 0; }
.lb-start .lb-link { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 8px; }
.lb-start .ds-knop { flex-direction: row; min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
.lb-start.klaar { background: none; box-shadow: none; padding: 0; }
.lb-stap { margin: 6px 0 2px; }
.lb-stap-actie { margin: 2px 0 8px; }
.lb-gids-lijst { margin: 4px 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; max-width: 720px; }
.lb-gids-lijst li { font-size: 17px; line-height: 1.35; }
.lb-gids .lb-kan { margin: 4px 0 0; }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

let gekozen = 'trein';
const bars = new Map();

function rij(profiel, info) {
  const d = L.volgendDoel(profiel, info.id);
  const nul = !L.isGestart(profiel, info.id);
  const aantal = bezighedenAantal(info.id);
  const namen = bezighedenNamen(info.id);
  const onder = `${nul ? 'Nog niet begonnen' : d.titel}${aantal ? ` · ${aantal} ${aantal === 1 ? 'bezigheid' : 'bezigheden'}` : ''}`;
  return `<button type="button" class="m-li lb-li${nul ? ' nul' : ''}${gekozen === info.id ? ' sel' : ''}" data-vak="${info.id}" title="${esc(namen.length ? 'Bezigheden: ' + namen.join(', ') : 'Geen aparte bijbaan')}"${gekozen === info.id ? ' aria-current="true"' : ''}>` +
    `<span class="lb-sfeer-chip" style="${sfeerStijl(info.id)}" aria-hidden="true"></span>` +
    `${loopbaanIcoon(info.icoon)}<span class="nm"><span class="one">${esc(info.naam)}</span><span class="mut one">${esc(onder)}</span></span>` +
    `<span class="lb-niv"><b>${d.niveau}</b><span>van ${L.MAX_NIVEAU}</span></span><span class="m-bar${d.deel > 0 ? ' on' : ''}"><i data-bar="lb-${info.id}" data-w="${(d.deel * 100).toFixed(1)}"></i></span></button>`;
}

// Elke bezigheid van een loopbaan staat er één keer: de bijbanen uit loopbaan.js (BAAN_VAK) en, bij Vissen en Landbouw, het
// visboek of de boerderij als eigen bezigheid. Zo zie je bij elk vak wat je er kunt doen, zonder dubbele regels (#430).
const VAK_LINK = {
  hengelen: { id: 'visboek', naam: 'Visboek', knop: 'Open je visboek', stand: () => { try { const v = boekVoortgang(); return v && v.totaal ? `${v.gevangen} van ${v.totaal} soorten` : 'Nog geen vis gevangen'; } catch (e) { return 'Al je vis van de provincie'; } } },
  landbouw: { id: 'boerderij', naam: 'Boerderij', knop: 'Open je boerderij', stand: () => 'Je akker, gewassen en machines' },
};
const NAMEN = new Map(SIDE_JOBS.map((j) => [j.id, j.name]));
const bezighedenAantal = (id) => L.banenVan(id).length + (VAK_LINK[id] ? 1 : 0);
const bezighedenNamen = (id) => [...L.banenVan(id).map((b) => NAMEN.get(b) || b), ...(VAK_LINK[id] ? [VAK_LINK[id].naam] : [])];

// De eerste klus en waar die staat (#431): elke loopbaan is vanaf zijn eigen startplek of hier te beginnen.
// Een vak dat al begonnen is (ook via de eerste punten) telt voor de verhaalstap die erbij hoort als gedaan.
function startHtml(profiel, id) {
  const s = L.startVan(id);
  if (!s) return '';
  const gestart = L.isGestart(profiel, id);
  const stap = loopbaanStap(id);
  const step = stap && STEP_BY_ID.get(stap);
  const verhaal = step ? `<p class="mut">In het verhaal: ${esc(step.title)}${gestart ? ' · telt als gedaan' : ''}</p>` : '';
  if (gestart) return `<div class="lb-start klaar"><p class="m-eb">Begonnen</p>${verhaal}</div>`;
  const baan = s.baan && doelen.has(s.baan)
    ? `<button type="button" class="ds-knop ds-knop--secundair" data-todo-goal="job:${esc(s.baan)}">Eerste klus als doel</button>` : '';
  return `<div class="lb-start"><p class="m-eb">Begin met deze loopbaan</p>` +
    `<p><b>Eerste klus:</b> ${esc(s.klus)}</p><p class="mut">${esc(s.plek)}${s.baan ? ' · loop erheen en druk E, of start hier' : ''}</p>${verhaal}` +
    `<p class="lb-link ds-glas"><button type="button" class="ds-knop" data-vak-start="${esc(id)}">Loopbaan starten</button>${baan}</p></div>`;
}

// De kaartjescontrole als echte handeling (#437): het paneel laat de teller van de lopende ronde en de uitslag van
// de laatste ronde zien, zodat niveau 3 bij Spoor niet alleen een getal en een titel is.
function kaartjesHtml(id, niveau) {
  if (id !== 'trein' || niveau < CONTROLE_MIN_NIVEAU) return '';
  const s = controleStand();
  const sessie = s.reizigers > 0 ? ` Deze sessie: ${s.rondes} ${s.rondes === 1 ? 'ronde' : 'rondes'}, ${s.reizigers} reizigers.` : '';
  if (s.station && s.gedaan > 0) {
    return `<p class="lb-kan"><b>Kaartjescontrole:</b> reiziger ${s.gedaan} van ${s.doel} op het perron van ${esc(s.station)}.${sessie}</p>`;
  }
  if (s.laatste) {
    return `<p class="mut">Laatste ronde: ${s.laatste.reizigers} reizigers in ${esc(s.laatste.station)}, €${s.laatste.betaald}${s.laatste.bonus ? ' met conducteursbonus' : ''}.${sessie}</p>`;
  }
  return `<p class="mut">Kaartjescontrole: nog geen ronde gedaan; loop op een perron naar een reiziger en druk E.${sessie}</p>`;
}

// De volledige dienst als machinist (#437): zonder lopende dienst zegt de regel waar je hem begint, met een dienst
// erbij de stand (halten klaar en de volgende). machinist.js levert de stand via getServiceMapState(world).
function dienstHtml(id, w) {
  if (id !== 'trein') return '';
  let s = null;
  try { s = w ? getServiceMapState(w) : null; } catch (e) { s = null; }
  return `<p class="${s ? 'lb-kan' : 'mut'}">${esc(L.dienstTekst(s))}</p>`;
}

// #972: de landbouw uitgelegd in het Loopbanen-scherm: wat een missie is en wat je eigen
// boerderij is, en dat je eigen percelen op de kaart staan. Alleen bij het vak Landbouw.
function landbouwGidsHtml(id) {
  if (id !== 'landbouw') return '';
  const g = L.LANDBOUW_GIDS;
  return `<div class="lb-blok lb-gids"><h3 class="m-eb">${esc(g.titel)}</h3>` +
    `<ul class="lb-gids-lijst">${g.stappen.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` +
    `<p class="lb-kan">${esc(g.verschil)}</p></div>`;
}

// De ladder van dit vak als zichtbare trap: elk niveau staat een stap verder naar rechts, het huidige niveau heeft een
// eigen rand en staat als aria-current, en per niveau staat het loon dat het oplevert. Zo lees je de klim in één oogopslag.
const TRAP_ICOON = {
  ok: '<path d="M6.2 11.6 2.8 8.2l1.4-1.4 2 2 5.6-5.6 1.4 1.4z"/>',
  nu: '<path d="M3 2.5l10 5.5-10 5.5z"/>',
  nog: '<path d="M4 7V5a4 4 0 0 1 8 0v2h1v7H3V7zm1.6 0h4.8V5a2.4 2.4 0 0 0-4.8 0z"/>',
};
const trapChip = (toon, icoon, tekst) => `<span class="ds-chip${toon ? ' ds-chip--' + toon : ''}"><svg class="ds-chip__icoon" viewBox="0 0 16 16" aria-hidden="true">${TRAP_ICOON[icoon]}</svg>${tekst}</span>`;
function trapHtml(id, d, v) {
  const info = L.vakInfo(id);
  if (!info) return '';
  return `<section class="lb-ladder ds-papier ds-kaart" aria-label="De ladder van dit vak"><div class="ds-kaart__kop"><span class="ds-kaart__label">De ladder</span><span class="ds-kaart__label">niveau ${d.niveau} van ${L.MAX_NIVEAU}</span></div>` +
    '<ol class="lb-trap" aria-label="Niveaus">' + info.titels.map((t, i) => {
      const niv = i + 1;
      const cls = niv < d.niveau ? 'bereikt' : niv === d.niveau ? 'nu' : '';
      const plus = L.percentage(L.factorVoorNiveau(niv));
      const chip = niv < d.niveau ? trapChip('succes', 'ok', 'Bereikt') : niv === d.niveau ? trapChip('selectie', 'nu', 'Nu') : trapChip('', 'nog', 'Nog niet');
      const loon = plus ? `+${plus}% loon` : 'basisloon';
      // het huidige niveau draagt het streepje naar het volgende, met altijd een getal erbij
      const streep = niv === d.niveau && d.volgend && v
        ? `<div class="ds-streep" style="--ds-streep-w:${Math.round(d.deel * 100)}%" role="img" aria-label="${nl(v.xp - L.XP_DREMPELS[d.niveau - 1])} van ${nl(L.XP_DREMPELS[d.niveau] - L.XP_DREMPELS[d.niveau - 1])} punten"><span class="ds-streep__baan"><span class="ds-streep__vul"></span></span><span class="ds-streep__label">${nl(v.xp - L.XP_DREMPELS[d.niveau - 1])} / ${nl(L.XP_DREMPELS[d.niveau] - L.XP_DREMPELS[d.niveau - 1])}</span></div>` : '';
      return `<li class="${cls}" style="--stap:${niv - 1}"${niv === d.niveau ? ' aria-current="step"' : ''}>` +
        `<span class="nr" aria-hidden="true">${niv}</span>` +
        `<span class="lb-stap-t"><b>${esc(t)}</b><span class="lb-loon">${loon}</span></span>${chip}${streep}</li>`;
    }).join('') + '</ol></section>';
}

function detailHtml(profiel, id, w = null) {
  const info = L.vakInfo(id);
  if (!info) return '<p class="mut">Kies een vak om te zien hoe het ervoor staat.</p>';
  const v = profiel.vakken[id];
  const d = L.volgendDoel(profiel, id);
  const groep = (L.GROEPEN.find((g) => g.id === info.groep) || {}).naam || '';
  const factor = L.loonFactor(profiel, id);
  const doel = d.volgend
    ? `Nog ${nl(d.nodig)} punten tot ${esc(d.volgend)}, met ${d.extra}% meer loon.`
    : 'Hoogste niveau bereikt.';
  // #671: één regel in gewone taal met de eerstvolgende stap en waar je die doet, plus de knop naar Te doen.
  const stap = L.volgendeStap(profiel, id);
  const waar = stap && stap.waar ? NAMEN.get(stap.waar) || stap.waar : '';
  const waarTekst = [waar, stap && stap.plek].filter(Boolean).join(' · ');
  const stapHtml = stap
    ? `<p class="lb-stap"><b>Eerstvolgende stap:</b> ${esc(stap.tekst)}${!stap.klaar && waarTekst ? ` <span class="mut">Waar: ${esc(waarTekst)}.</span>` : ''}</p>` +
      (!stap.klaar && stap.waar && doelen.has(stap.waar) ? `<p class="lb-stap-actie"><button type="button" class="m-bt lb-doel" data-todo-goal="job:${esc(stap.waar)}">Waar kan ik dat doen?</button></p>` : '')
    : '';
  const telt = [L.tellerTekst(profiel, id)];
  if (v.uniek.length) telt.push(`${v.uniek.length} verschillende ${esc(info.uniek)}`);
  const trap = trapHtml(id, d, v);
  const banen = L.banenVan(id);
  const bezigheden = bezighedenHtml(id, v, banen);
  // Een loopbaan die je nog niet begon, begint met zijn eerste klus: die kaart staat na de ladder en de stap,
  // zodat de ene primaire knop en de eerstvolgende stap bij elkaar staan en niet onderaan de uitleg verdwijnen.
  const start = startHtml(profiel, id);
  // wat dit niveau je aan een handeling geeft (#437): niveau 3 bij Spoor is kaartjes knippen op het perron, geen getal
  const kan = L.vaardigheidVan(id, d.niveau);
  const vaardigheid = kan ? `<p class="lb-kan"><b>${esc(kan.titel)}:</b> ${esc(kan.wat)}</p>` : '';
  // #905: de drie dingen die je van dit vak wilt weten staan naast elkaar, niet in een lange regel.
  const kpi = `<div class="lb-kpis"><div class="lb-kpi"><span>Betaalt nu</span><b>${factor > 1 ? `+${L.percentage(factor)}%` : 'basisloon'}</b></div>` +
    `<div class="lb-kpi"><span>${d.volgend ? `Nog tot ${esc(d.volgend)}` : 'Hoogste niveau'}</span><b>${d.volgend ? `${nl(d.nodig)}<small> punten</small>` : 'bereikt'}</b></div></div>`;
  // De volgorde is de leesorde: eerst wie je bent en waar je staat, dan de ladder, dan de ene volgende stap met de
  // startplek en de ene primaire knop, dan wat je hier doet; de langere uitleg en de gids komen pas daarna.
  return `<div class="pm-pane-top">${sfeerBandHtml(id, { icoon: loopbaanIcoon(info.icoon, 'lb-sfeer-ico'), klein: groep })}<h2 class="m-h2 td-h2">${loopbaanIcoon(info.icoon, 'pa-ico big')}${esc(info.naam)}</h2></div>` +
    `<div class="lb-kop"><p class="lb-titel"><b>${esc(d.titel)}</b> <span class="mut">· niveau ${d.niveau} van ${L.MAX_NIVEAU}</span></p><p class="mut">${esc(info.wat)}</p></div>` +
    // een vak dat je nog niet begon, opent met zijn ene knop (Loopbaan starten) boven de ladder: onder de ladder lag hij op 720p buiten beeld
    (L.isGestart(profiel, id) ? '' : start) +
    trap +
    kpi +
    `<div class="lb-next${stap && stap.klaar ? ' klaar' : ''}">${stapHtml}<p class="mut">${doel}</p></div>` +
    (L.isGestart(profiel, id) ? start : '') +
    bezigheden +
    `<div class="lb-blok"><h3 class="m-eb lb-h3">Over dit vak</h3>` +
    `<p>${v.xp > 0 ? esc(telt.join(' · ')) : L.isGestart(profiel, id) ? 'Begonnen, nog geen klus gedaan.' : 'Nog niet begonnen.'}</p>` +
    `<p class="${factor > 1 ? 'g' : 'mut'}">${factor > 1 ? `Dit vak betaalt nu ${L.percentage(factor)}% meer. ` : ''}${esc(L.loonTekst(id))}</p>${vaardigheid}${kaartjesHtml(id, d.niveau)}${dienstHtml(id, w)}</div>` +
    landbouwGidsHtml(id);
}

// De bezigheden van dit vak, elk met hun eigen stand en één actie. De eerste klus die je nog niet deed en die nu te kiezen is,
// krijgt het label Volgende klus; de knop Ernaartoe staat in dezelfde regel (geen tweede vermelding) (#430).
function bezighedenHtml(id, v, banen) {
  const volgende = banen.find((b) => !v.uniek.includes(b) && doelen.has(b)) || banen.find((b) => doelen.has(b));
  const rijen = banen.map((b) => {
    const klaar = v.uniek.includes(b);
    const stand = klaar ? 'Gedaan' : doelen.has(b) ? 'Nu te kiezen' : 'Nog niet gedaan';
    return `<li class="${klaar ? 'klaar' : ''}">${CHECK}<span class="lb-bz"><span>${esc(NAMEN.get(b) || b)}</span><span class="mut">${stand}</span></span>` +
      `${b === volgende ? '<span class="lb-volg">Volgende klus</span>' : ''}` +
      `${doelen.has(b) ? `<button type="button" class="m-bt lb-doel" data-todo-goal="job:${esc(b)}">Zet als doel</button>` : ''}</li>`;
  });
  const link = VAK_LINK[id];
  if (link) rijen.push(`<li class="lb-bz-link">${CHECK}<span class="lb-bz"><span>${esc(link.naam)}</span><span class="mut">${esc(link.stand())}</span></span>` +
    `<button type="button" class="m-bt lb-doel" data-goto="${link.id}">${esc(link.knop)}</button></li>`);
  if (!rijen.length) return '<h3 class="m-eb">Bezigheden</h3><p class="mut lb-leeg">Geen aparte bijbaan: je verdient hier met het spel zelf.</p>';
  return `<h3 class="m-eb">Bezigheden</h3><ul class="lb-banen">${rijen.join('')}</ul>`;
}

let wereld = null;
let doelen = new Set(); // de bijbanen die nu te kiezen zijn (todoui.js) // pausemenu.js: sluit het menu na een snelreis
export function renderLoopbaanPanel(el, sluit = null, w = null) {
  if (!el) return;
  if (w) wereld = w;
  try { doelen = wereld ? baanDoelen(wereld) : new Set(); } catch (e) { doelen = new Set(); }
  zetCss();
  const profiel = getProfiel();
  if (!L.vakInfo(gekozen)) gekozen = L.VAK_IDS[0];
  const sam = L.samenvatting(profiel);
  // #846: de overkoepelende teller naast de niveaus: hoeveel loopbanen je al met een echte eerste klus begon, en
  // op negentien de blijvende titel. De felicitatie zelf komt eenmalig als prestatiekaart (achievements.js).
  const eerste = L.eersteKlusStand(profiel);
  const duizendpoot = eerste.klaar ? ` · titel ${esc(L.DUIZENDPOOT_TITEL)}` : '';
  const omhoog = sam.som - L.VAKKEN.length;
  const maxOmhoog = sam.max - L.VAKKEN.length;
  const pctEerste = eerste.totaal ? Math.round((eerste.gedaan / eerste.totaal) * 100) : 0;
  const pctNiveau = maxOmhoog ? Math.round((omhoog / maxOmhoog) * 100) : 0;
  const pctGestart = Math.round((sam.aantal / L.VAKKEN.length) * 100);
  const hoogsteTitel = sam.hoogste ? sam.hoogste.titel : 'Je eerste titel wacht';
  // De hero draagt het sfeervlak en -icoon van het vak waar je het hoogst staat, zodat de opening niet alleen tekst is.
  // Zonder enige voortgang is er nog geen loopbaan om te tonen en blijft de hero tekst (het gekozen vak staat rechts).
  // Kleur is nooit de enige cue: het patroon, het icoon en de titel staan erbij.
  const heroVak = sam.hoogste ? sam.hoogste.vak : null;
  const heroInfo = heroVak ? L.vakInfo(heroVak) : null;
  const heroSfeer = heroInfo
    ? `<span class="lb-hero-sfeer" style="${sfeerStijl(heroVak)}" aria-hidden="true"></span>` + loopbaanIcoon(heroInfo.icoon, 'lb-hero-ico')
    : '';
  const leeg = sam.aantal === 0;
  const hero = `<section class="pm-hero lb-hero${leeg ? ' lb-hero--leeg' : ''}" aria-label="Loopbanen">${heroSfeer}<div class="pm-hero-h"><span class="m-eb">Je loopbaan</span>${leeg ? '' : `<span class="pm-badge" data-tone="ok">${sam.aantal} van ${L.VAKKEN.length} begonnen</span>`}</div>` +
    `<h2 class="pm-hero-t${hoogsteTitel.length > 22 ? ' long' : ''}">${esc(hoogsteTitel)}</h2>` +
    (leeg
      ? `<p class="pm-hero-lead">Er wachten ${L.VAKKEN.length} loopbanen op je. Doe in één vak een eerste klus en je krijgt je eerste titel, met meer loon bij elke stap omhoog.</p>` +
        `<div class="lb-eerste ds-glas" role="list" aria-label="Zo begin je"><span class="ds-chip" role="listitem">1. Kies een vak</span><span class="ds-chip" role="listitem">2. Doe de eerste klus</span><span class="ds-chip" role="listitem">3. Krijg je titel</span></div></section>`
      : `<p class="pm-hero-lead">Kies links een vak: elk vak heeft zijn eigen ladder, zijn eigen loon en de klussen die erbij horen.${eerste.klaar ? ' Je bent de duizendpoot van Grunn.' : ''}</p></section>`);
  const stats = `<div class="pm-stats lb-stats">` +
    `<span class="pm-stat" data-tone="accent"><b>${eerste.gedaan}</b><span>van ${eerste.totaal} eerste klussen${duizendpoot}</span><span class="m-bar${eerste.gedaan ? ' on' : ''}"><i data-bar="lb-eerste" data-w="${pctEerste}"></i></span></span>` +
    `<span class="pm-stat"><b>${omhoog}</b><span>van ${maxOmhoog} niveaus omhoog</span><span class="m-bar${omhoog ? ' on' : ''}"><i data-bar="lb-niveau" data-w="${pctNiveau}"></i></span></span>` +
    `<span class="pm-stat"><b>${sam.aantal}</b><span>van ${L.VAKKEN.length} loopbanen begonnen</span><span class="m-bar${sam.aantal ? ' on' : ''}"><i data-bar="lb-gestart" data-w="${pctGestart}"></i></span></span></div>`;
  const lijst = L.GROEPEN.map((g) => {
    const vakken = L.VAKKEN.filter((v) => v.groep === g.id);
    const begonnen = vakken.filter((v) => L.isGestart(profiel, v.id)).length;
    return `<div class="lb-groep"><span>${esc(g.naam)}</span><span class="lb-gn">${begonnen} van ${vakken.length} begonnen</span></div>` + vakken.map((v) => rij(profiel, v)).join('');
  }).join('');
  // zonder één begonnen loopbaan zijn drie nul-kaarten geen voortgang: de uitnodiging in de hero zegt het al (#846)
  el.innerHTML = hero + (leeg ? '' : stats) +
    `<div class="m-main"><div class="m-list pa-list lb-list">${lijst}</div><aside class="m-pane pa-pane lb-pane" aria-live="polite">${detailHtml(profiel, gekozen, wereld)}</aside></div>`;
  fillBars(el, bars);
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const kies = (id) => {
      if (!id || id === gekozen) return;
      gekozen = id;
      for (const b of el.querySelectorAll('[data-vak]')) { const aan = b.dataset.vak === gekozen; b.classList.toggle('sel', aan); b.toggleAttribute('aria-current', aan); }
      el.querySelector('.lb-pane').innerHTML = detailHtml(getProfiel(), gekozen, wereld);
      queueMicrotask(() => fillBars(el, bars));
    };
    el.addEventListener('click', (e) => {
      const start = e.target.closest('[data-vak-start]');
      if (start) { startLoopbaan(wereld, start.dataset.vakStart); renderLoopbaanPanel(el, sluit, wereld); return; }
      const b = e.target.closest('[data-vak]');
      if (b) kies(b.dataset.vak);
    });
    el.addEventListener('focusin', (e) => {
      const b = e.target.closest && e.target.closest('[data-vak]');
      if (b) kies(b.dataset.vak);
    });
  }
}
