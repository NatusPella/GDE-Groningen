// Garage section of the pause menu (and the styles of the phone's
// "Voertuigen" app): every vehicle as a card with a picture of the real model
// (three-quarter view from the front, in its own paint), the selected one
// turning in the viewer. A card also turns on a turntable while the mouse is
// on it, or it has keyboard or controller focus, or (touch) it was tapped.
// Stills, turntable and viewer all come from vehiclepreview.js's one shared
// renderer, so the garage never opens a WebGL context of its own.
import { icoon } from './icons.js';
import { glyphHtml, plainKeyText } from './keycap.js';
import { getGarageCatalog, whereText, actieBevestiging } from './ownedvehicles.js';
import { garageToestand, statusToon, vraagSoort, chipHtml, TOESTAND_ICOON } from './garagetoestand.js';
import { createSharedPreview, renderSnapshot, cancelSnapshots } from './vehiclepreview.js';
import { reducedMotion } from './motion.js';
import { visibleList, knownCount, knownText } from './garageknown.js'; // alleen wat je kent (22-11)
import { getShopsForRender, SHOP_TYPES, getOwnedEntries } from './shops.js';
import { setUserWaypoint } from './routing.js';
import { hoofdspeler } from './players.js'; // de speler van dit apparaat (#500)
import {
  GARAGE_3Q_ANGLE, GARAGE_PIC_W, GARAGE_PIC_H, garagePicZoom, TURN_SPEED, TURN_FPS,
  garagePreviewSpec as previewSpec, garageCardLook, garageSaleShop, turntableTarget, stageSilhouetteStyle,
} from './garagepics.js';
import {
  GARAGE_FILTERS as FILTERS, GARAGE_SORTS as SORTS, garageGroup as groupOf, garagePrice as priceOf,
  garageShown, garageSections, garageTabCounts, cycleOption, keepSelection,
} from './menumodels.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const GLYPHS = {
  car: '<path d="M6 30l4-11a5 5 0 0 1 4.7-3.3h18.6A5 5 0 0 1 38 19l4 11h1.5a2.5 2.5 0 0 1 2.5 2.5V40h-5v3a3 3 0 0 1-6 0v-3H13v3a3 3 0 0 1-6 0v-3H2v-7.5A2.5 2.5 0 0 1 4.5 30zm6-1h24l-2.8-8.2a1.5 1.5 0 0 0-1.4-1h-15.6a1.5 1.5 0 0 0-1.4 1z"/><circle cx="10" cy="35" r="2.6" style="fill:var(--ds-c-ink-inkt)"/><circle cx="38" cy="35" r="2.6" style="fill:var(--ds-c-ink-inkt)"/>',
  bike: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="32" r="8"/><circle cx="37" cy="32" r="8"/><path d="M11 32l8-14h12l6 14M11 32h11l9-14M16 13h6M31 18l-2-6h5"/></g>',
  bus: '<path d="M4 12a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v22a2 2 0 0 1-2 2h-2v3a3 3 0 0 1-6 0v-3H14v3a3 3 0 0 1-6 0v-3H6a2 2 0 0 1-2-2zm4 2v8h8v-8zm11 0v8h8v-8zm11 0v8h9v-8z"/>',
  truck: '<path d="M2 12h26v22H2zM30 18h8l6 8v8h-14z"/><circle cx="10" cy="36" r="4"/><circle cx="36" cy="36" r="4"/><rect x="32" y="20" width="6" height="5" style="fill:var(--ds-c-ink-inkt)"/>',
  boat: '<path d="M4 28h40l-6 10H10zM14 18h14v8H14zM30 14h3v12h-3z"/><path d="M6 42c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="currentColor" stroke-width="2"/>',
  scooter: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="34" r="6"/><circle cx="38" cy="34" r="6"/><path d="M17 34h14l5-18h5M31 34l-3-9H15"/></g><path d="M14 22h13v5H12z"/>',
  heli: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 9h34M21 9v6M10 41h20M14 35v6M26 35v6M30 25h12M41 19v10"/></g><path d="M8 27a12 10 0 0 1 24 0v6H8z"/>',
};

function vehicleGlyph(kind, color) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" style="color:${esc(color)}"><g fill="currentColor">${GLYPHS[kind] || GLYPHS.car}</g></svg>`;
}


// The garage's own rules. The shared menu chrome lives in pausemenu.css; these
// fix the grid and the detail pane here, next to the markup they describe (the
// same pattern as verhaalui.js). Injected once, after the menu's stylesheets,
// so an equal-specificity rule here wins.
const CSS = `
/* Elke kaart is even hoog en nooit afgeknipt: een vaste minimumhoogte per kaart
   in plaats van grid-auto-rows: min-content, dat de rij op de kleinste inhoud zette
   terwijl de kaart zelf hoger werd (de onderste regel viel buiten de rij). */
#pause-menu .m-main > .m-list.gar-list { grid-auto-rows: auto; align-items: stretch; overflow-x: hidden; }
#pause-menu .gar-card { justify-content: flex-start; min-height: 192px; }
#pause-menu .gar-card .gar-ph { flex: 0 0 104px; }
#pause-menu .gar-card .nm { flex: 0 0 auto; min-width: 0; gap: 4px; }
/* een lange modelnaam stopt met een … in plaats van onder de buurkaart te lopen */
#pause-menu .gar-card .nm .one { max-width: 100%; }
#pause-menu .gar-card .gar-st { flex-wrap: nowrap; min-width: 0; }
#pause-menu .gar-card .gar-st .t { display: block; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
/* 1280x720: dezelfde kaart, compacter, zodat er meer rijen volledig in beeld staan */
@media (max-height: 820px) {
  #pause-menu .gar-card { min-height: 178px; }
  #pause-menu .gar-card .gar-ph { flex-basis: 86px; height: 86px; }
}
/* Het detailpaneel (designsysteem, #980): de draaiende auto is de hero, eronder een papieren kaart met
   titel en status, de toestand als chips, de feiten en pas dan de actie. Kleuren en maten komen uit
   ds-tokens.css; de glazen lijst links blijft zoals hij was. */
#pause-menu .gar-viewer { gap: var(--ds-s-3); }
#pause-menu .gar-stage { height: clamp(260px, 45vh, 340px); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); box-shadow: var(--ds-schaduw-hard-klein); }
#pause-menu .gar-stage .gar-hint, #pause-menu .gar-stage:hover .gar-hint, #pause-menu .gar-stage:focus-within .gar-hint { color: var(--ds-zeef-tx); }
#pause-menu .gar-stage .gar-hint { padding-left: var(--ds-s-3); }
#pause-menu .gar-bon { flex: none; gap: var(--ds-s-3); padding-top: var(--ds-s-4); }
#pause-menu .gar-bon .ds-z-kaart__kop { padding-top: var(--ds-s-2); padding-bottom: var(--ds-s-2); }
#pause-menu .gar-bon .ds-z-kaart__titel { font-size: max(var(--ds-t-subkop), var(--menu-min, 13px)); text-shadow: none; }
/* koppen van een blok (Cijfers, Uitvoering): links, boven hun eigen blok, met een inktstreep; .ds-z-kaart__voet zet ze anders rechts */
#pause-menu .gar-blok > h3 { justify-content: flex-start; align-items: baseline; margin: 0; padding-bottom: var(--ds-s-1); border-bottom: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: max(var(--ds-t-label), var(--menu-min, 13px)); letter-spacing: var(--ds-ls-label); text-transform: uppercase; color: var(--ds-zeef-kop); }
#pause-menu .gar-blok > h3 > span { font-family: var(--ds-font-zeef-tekst); font-weight: normal; text-transform: none; letter-spacing: 0; color: var(--ds-tx-zacht); }
#pause-menu .gar-naam { overflow-wrap: anywhere; }
#pause-menu .gar-bon .mut, #pause-menu .gar-meme { color: var(--ds-c-inkt-zacht); font-size: var(--ds-t-hulp); }
#pause-menu .gar-bon .gar-state { flex: none; }
#pause-menu .gar-chips { display: flex; flex-wrap: wrap; gap: var(--ds-s-2); }
#pause-menu .gar-chips:empty { display: none; }
#pause-menu .gar-blok { display: flex; flex-direction: column; gap: var(--ds-s-1); }
#pause-menu .gar-bon .gar-where, #pause-menu .gar-bon .gar-look { color: var(--ds-zeef-tx); font-size: var(--ds-t-body); }
#pause-menu .gar-stats { display: flex; flex-wrap: wrap; align-items: center; gap: var(--ds-s-2) var(--ds-s-5); }
#pause-menu .gar-stats .ds-z-balk { flex: 1 1 200px; }
#pause-menu .gar-bon .gar-dot { box-shadow: 0 0 0 var(--ds-lijn-zeef) var(--ds-c-ink-inkt); }
#pause-menu .gar-acts { display: flex; flex-wrap: wrap; gap: var(--ds-s-2) var(--ds-s-3); padding: var(--ds-s-3) 0 0; border-top: var(--ds-lijn-dik) dashed var(--ds-c-inkt-zacht); }
#pause-menu .gar-acts .ds-z-knop { min-height: var(--ds-doel-aanraken); padding: var(--ds-s-1) var(--ds-s-4); font-size: var(--ds-t-body); }
#pause-menu .gar-acts .ds-z-knop { flex-direction: row; gap: var(--ds-s-2); }
#pause-menu .gar-acts .ds-z-knop svg { width: var(--ds-s-5); height: var(--ds-s-5); flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .gar-msg { margin: 0; min-height: 0; font-size: var(--ds-t-body); }
#pause-menu .gar-msg:empty { display: none; }
#pause-menu .gar-msg:not(.gar-vraag) { color: var(--ds-c-groen-tx); font-weight: var(--ds-gewicht-vet); }
#pause-menu .gar-vraag-kop { display: flex; align-items: center; gap: var(--ds-s-2); }
#pause-menu .gar-naam { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-kop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-kop); }
#pause-menu .gar-leeg { margin: var(--ds-s-3) 0 0 var(--ds-s-5); }
/* #999 (24-11): "nog te ontdekken" is een lege tegel in het raster (stippelrand = nog niet van jou), even groot als een kaart, niet een losse regel ernaast */
#pause-menu .gar-meer { display: flex; flex-direction: column; justify-content: center; gap: var(--ds-s-1); min-height: 192px; padding: var(--ds-s-4); border: var(--ds-lijn-zeef) dashed var(--ds-c-ink-inkt); color: var(--ds-c-inkt-zacht); font-size: var(--ds-t-hulp); line-height: 1.35; text-align: center; }
#pause-menu .gar-meer b { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); color: var(--ds-c-ink-inkt); }
#pause-menu .gar-meer br { display: none; }
#pause-menu .gar-leeg .ds-z-leeg__tekst { color: var(--ds-zeef-tx); }
#pause-menu .gar-leeg .gar-ic { width: var(--ds-s-6); height: var(--ds-s-6); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
/* De draaihint staat als eigen strook onder het model (nooit erover) en licht op
   zodra de muis of de focus op de draaitafel staat, zodat hij leesbaar blijft.
   Het silhouet en de stilstaande foto houden die strook vrij, zodat ook zij de
   hint niet afdekken. */
#pause-menu .gar-stage > svg { bottom: 34px; }
#pause-menu .gar-stage .gar-still { inset: 0 0 34px; height: auto; }
#pause-menu .gar-stage .gar-hint { flex-wrap: wrap; row-gap: 2px; min-height: 32px; font-size: max(18px, var(--menu-min, 18px)); white-space: normal; }
#pause-menu .gar-stage:hover .gar-hint, #pause-menu .gar-stage:focus-within .gar-hint { color: var(--ink); }
`;

let styled = false;
export function initGarageStyles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const st = document.createElement('style');
  st.id = 'style-garage';
  st.textContent = CSS;
  document.head.appendChild(st);
}

const LOCK = icoon('slot', { maat: 'm' });
const PIN = icoon('plek', { maat: 'm' });

const GROUP_LABEL = { owned: 'van jou', sale: 'te koop', locked: 'op slot' };
const GROUP_HEAD = { owned: 'Van jou', sale: 'Te koop', locked: 'Op slot' };
// De standaardtab is Alles (in het begin heb je weinig voertuigen); kiest de speler zelf een tab (eigen), dan blijft die staan zolang het spel draait.
const view = { cat: 'all', eigen: false, filter: 'all', sort: 'naam' };

let viewer = null;
let viewerCanvas = null;
let selected = null;
let lastList = [];
let lastVerborgen = 0; // hoeveel voertuigen nog niet ontdekt zijn (blijven verborgen, zonder naam)
// the viewer's own stills (a separate group, so a card that is still drawing is not dropped)
const VIEWER_GROUP = 'garage-viewer';
// how far one arrow press turns the model (rad); the drag follows the pointer
const TURN_STEP = 0.4;

const euro = (n) => `€${Number(n).toLocaleString('nl-NL')}`;
const shownList = (list) => garageShown(list, view);

// the card's status line: where it is, its price, or the lock
function endHtml(e) {
  if (e.locked) return `${LOCK}<span class="t">${esc(e.unlockShort || 'Op slot')}</span>`;
  if (!e.owned && e.spec && e.spec.unlock) return '<span class="t g">Vrijgespeeld</span>';
  if (!e.owned) return `<span class="v">${euro(priceOf(e))}</span>`;
  if (e.status === 'lost') return '<span class="t" style="color:var(--redtx)">Afgeschreven</span>';
  const label = e.status === 'garage' ? 'Thuis' : e.status === 'driving' ? 'Je zit erin' : 'Van jou';
  return `<span class="t${e.status === 'driving' ? ' g' : ''}">${label}</span>`;
}

// a card of the grid: its picture (filled in by fillPics), name, status. The
// silhouette stands in from the first paint, so a card is never a blank block
// while its snapshot is still being drawn (#610).
function row(e) {
  return `<button type="button" class="m-li gar-card${e.locked ? ' off' : ''}${e.id === selected ? ' sel' : ''}" data-garage-select="${esc(e.id)}" data-group="${groupOf(e)}"${e.id === selected ? ' aria-current="true"' : ''}>` +
    `<span class="gar-ph" data-look="${garageCardLook(e)}" aria-hidden="true">${vehicleGlyph(e.kind, e.locked ? 'var(--ds-c-inkt-zacht)' : e.color)}</span>` +
    `<span class="nm"><span class="one">${esc(e.model)}</span><span class="gar-st">${endHtml(e)}</span></span></button>`;
}

// The stage with the turning model. The silhouette and a still from the
// shared renderer stand behind the live canvas, so the pane is never empty:
// the first frame of the live preview (or the still) covers them (#435).
// The canvas takes focus so the model turns on the arrow keys or the D-pad
// too; the keycaps follow the last used device (#610).
function stageHtml(e) {
  const model = esc(e.model);
  // #892: het model en de hint staan onder elkaar in plaats van over elkaar: de auto zakte
  // over "Sleep of draai met ← →" heen, waardoor de hint onleesbaar werd.
  return `<div class="gar-stage">${vehicleGlyph(e.kind, e.locked ? 'var(--ds-c-inkt-zacht)' : e.color)}` +
    '<img class="gar-still" alt="" draggable="false" hidden>' +
    `<canvas tabindex="0" role="img" aria-label="3D-model van ${model}: ${plainKeyText('sleep of gebruik {ARROWS} om te draaien')}"></canvas>` +
    '<span class="gar-hint">Sleep of gebruik ' + glyphHtml('ARROWLEFT') + glyphHtml('ARROWRIGHT') + '</span></div>';
}

// Everything beside the stage: name, facts, the message and the buttons.
// #892: de tekst rechtsonder had geen hiërarchie (een rij feiten, een losse melding en de
// knoppen door elkaar). Nu drie rustige blokken met een eigen kop — waar hij staat, de cijfers
// en de uitvoering — en de knoppen onderaan op één regel.
function secHtml(title, note, inner) {
  return `<div class="gar-blok"><h3 class="ds-z-kaart__voet">${esc(title)}${note ? ` <span>${note}</span>` : ''}</h3>${inner}</div>`;
}

// De cijfers: topsnelheid als getal met eenheid, trekkracht als streep met altijd het getal erbij.
function statsHtml(e) {
  const kracht = Math.max(0, Math.min(10, Number(e.accelScore) || 0));
  return '<div class="gar-stats">' +
    `<span class="ds-z-waarde"><span class="ds-z-waarde__getal">${e.topSpeed}</span><span class="ds-z-waarde__eenheid">km/u topsnelheid</span></span>` +
    `<span class="ds-z-balk" style="--ds-z-w:${kracht * 10}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">trekkracht ${kracht} / 10</span></span></div>`;
}

// De korte status naast de titel: thuis, in de buurt, te koop, op slot. De kaart
// toont dezelfde woorden, zodat lijst en paneel hetzelfde zeggen.
function statusText(e) {
  if (e.locked) return 'Op slot';
  if (!e.owned) return e.spec && e.spec.unlock ? 'Vrijgespeeld' : 'Te koop';
  if (e.status === 'lost') return 'Afgeschreven';
  if (e.status === 'garage') return 'Thuis';
  return e.statusLabel || 'Van jou';
}

function detailsHtml(e, msg) {
  const status = statusText(e);
  const vraag = vraagSoort(msg, { verkoop: actieBevestiging(e, 'verkoop'), aflever: actieBevestiging(e, 'aflever') });
  // WAAR gaat over de plek. De korte status staat al naast de titel; hier komt de
  // volledige plek (straat en afstand, of de winkel waar hij te koop staat). Zegt
  // die niets meer dan de titel, dan valt het blok weg in plaats van het te herhalen.
  let waar = '';
  if (e.owned) waar = e.status !== 'lost' ? esc(whereText(e)) : '';
  else if (e.locked) waar = '';
  else if (e.spec && e.spec.unlock) waar = esc(e.statusLabel || '');
  else waar = `${euro(priceOf(e))}${e.shop ? ` bij ${esc(e.shop)}` : ''} · na het kopen staat hij thuis`;
  // Op slot: geen plek maar de weg ernaartoe, onder een eigen kop in plaats van
  // de status nog eens als feit te herhalen.
  const slotHtml = e.locked ? secHtml('Vrijspelen', '', `<div class="gar-where">${esc(e.unlockText || 'Via het verhaal of een prestatie')}</div>`) : '';
  const uitvoering = `<div class="gar-look"><span class="gar-dot" style="background:${esc(e.color)}"></span>${esc(e.paint)}` +
    (e.owned && e.kind !== 'boat' && e.kind !== 'heli'
      ? `<span class="mut">${e.upgrades.length ? esc(e.upgrades.join(', ')) : `Nog niks: ${e.kind === 'bike' || e.kind === 'scooter' ? 'Spaak & Band' : 'Knal & Kolder Tuning'} helpt je graag`}</span>`
      : '') + '</div>';
  // te koop: "Kopen" zet een routepunt naar de winkel waar hij staat (#435)
  const koop = garageSaleShop(e);
  // De knoppenrij is een eigen blok onder de gegevens (gar-acts), geen plakkerige voetregel:
  // anders schoof hij over de laatste regel van WAAR (review 0.62). Eén gele hoofdknop; wat je niet
  // terugdraait (verkopen, slopen) en wat nu om een tweede druk vraagt staat omlijnd.
  const acts = koop ? `<div class="m-acts td-acts gar-acts"><button type="button" class="ds-z-knop" data-garage-koop="${esc(koop)}">${PIN}Kopen</button></div>` : !e.owned ? '' : '<div class="m-acts td-acts gar-acts">' +
    (e.status !== 'driving' ? `<button type="button" class="ds-z-knop${vraag === 'aflever' ? ' ds-z-knop--gevaar' : ''} gar-go" data-garage-deliver="${esc(e.id)}">Laten afleveren${e.fee ? ` · ${esc(e.feeLabel)}` : ''}</button>` : '') +
    (e.status === 'near' || e.status === 'far' ? `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-garage-find="${esc(e.id)}">${PIN}Waar staat hij?</button>` : '') +
    (e.canSell ? `<button type="button" class="ds-z-knop ds-z-knop--${vraag === 'verkoop' ? 'gevaar' : 'secundair'}" data-garage-sell="${esc(e.id)}">${esc(e.sellLabel)}</button>` : '') + '</div>';
  const waarHtml = waar && waar.trim() ? secHtml('Waar', '', `<div class="gar-where">${waar}</div>`) : '';
  // Eerst wie en wat (titel, status, sfeerregel), dan de feiten (waar, cijfers,
  // uitvoering) en pas daarna de actie: de knop hoort bij het besluit dat de
  // feiten boven hem onderbouwen, niet andersom.
  const toestand = garageToestand(e, { entry: getOwnedEntries().find((o) => o.key === e.key) });
  const kaartToon = e.locked ? ' ds-z-kaart--uit' : e.status === 'lost' ? '' : e.status === 'driving' ? ' ds-z-kaart--selectie' : '';
  const stoon = statusToon(e);
  const vraagHtml = vraag
    ? `<div class="gar-msg gar-vraag ds-z-kaart ds-z-kaart--probleem ds-z-kaart--recht" role="status"><div class="ds-z-kaart__tekst gar-vraag-kop">${TOESTAND_ICOON.warn}<b>Even checken</b></div><div class="ds-z-kaart__tekst">${esc(msg)}</div></div>`
    : `<div class="gar-msg" role="status">${esc(msg || '')}</div>`;
  return `<div class="gar-bon ds-zeef ds-z-kaart ${kaartToon}">` +
    `<div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel">${esc([e.make, GROUP_LABEL[groupOf(e)]].filter(Boolean).join(' · '))}</span>` +
    chipHtml(stoon, status, ' gar-state') + '</div>' +
    `<h2 class="gar-naam">${esc(e.model)}</h2>` +
    (e.meme ? `<div class="mut gar-meme">${esc(e.meme)}</div>` : '') +
    `<div class="gar-chips" aria-label="Toestand">${toestand.map((t) => chipHtml(t.tone, t.label)).join('')}</div>` +
    waarHtml + slotHtml + secHtml('Cijfers', '', statsHtml(e)) + secHtml('Uitvoering', '', uitvoering) +
    acts + vraagHtml + '</div>';
}

function viewerHtml(e, msg) {
  return stageHtml(e) + detailsHtml(e, msg);
}

// Waypoint naar de dichtstbijzijnde winkel van dit soort (autodealer, fietsenwinkel, ...); geeft de melding terug.
export function garageNaarWinkel(world, type) {
  let best = null, bd = Infinity;
  const p = hoofdspeler(world); // afstand tot de speler van dit apparaat (#500)
  for (const s of getShopsForRender()) {
    if (s.type !== type) continue;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best) return { ok: false, text: 'Deze winkel staat nog niet op de kaart.' };
  setUserWaypoint(best.x, best.y, best.name || (SHOP_TYPES[type] || {}).chain || 'Winkel');
  return { ok: true, text: `Route naar ${best.name || (SHOP_TYPES[type] || {}).chain || 'de winkel'} staat op de kaart.`, x: best.x, y: best.y };
}

// Shows vehicle `id` in the viewer (pausemenu.js: a click or Enter on a
// row). The stage and its preview stay: switching rows only swaps the model,
// so the garage never builds a second renderer or a second canvas (#435).
export function selectGarageVehicle(el, id, msg = '') {
  const e = lastList.find((x) => x.id === id);
  const box = el.querySelector('.gar-viewer');
  if (!e || !box) return;
  selected = id;
  for (const c of el.querySelectorAll('.gar-card')) { const on = c.dataset.garageSelect === id; c.classList.toggle('sel', on); c.toggleAttribute('aria-current', on); }
  const stage = box.querySelector('.gar-stage');
  if (stage) {
    // only the text beside the stage changes; the canvas keeps its preview
    for (const ch of [...box.children]) if (ch !== stage) ch.remove();
    const tmp = document.createElement('div');
    tmp.innerHTML = detailsHtml(e, msg);
    for (const ch of [...tmp.children]) box.appendChild(ch);
    const cv = stage.querySelector('canvas');
    if (cv) cv.setAttribute('aria-label', `3D-model van ${e.model}`);
  } else {
    box.innerHTML = viewerHtml(e, msg);
  }
  // de bevestigingsvraag staat onderaan het paneel: breng hem in beeld, anders zie je alleen dat er niets gebeurt
  const vraagEl = box.querySelector('.gar-msg.gar-vraag');
  if (vraagEl && vraagEl.scrollIntoView) vraagEl.scrollIntoView({ block: 'nearest' });
  const c = box.querySelector('canvas');
  if (!c) return;
  if (!viewer || viewerCanvas !== c) {
    if (viewer) viewer.dispose();
    viewerCanvas = c;
    viewer = createSharedPreview(c, {
      interactive: true, angle: GARAGE_3Q_ANGLE,
      active: () => c.isConnected && c.offsetParent !== null,
      // het echte model tekent: de stilleggevallen achtergrond mag weg
      onFirstFrame: () => { box.dataset.drawn = '1'; showStageFallback(box, false); },
    });
  }
  box.dataset.drawn = '';
  showStageFallback(box, true);
  viewer.show(previewSpec(e));
  showStill(box, previewSpec(e));
  // a tap selects the card: on touch that is the one to turn
  if (aim.touch) syncTurn(el);
}

// Draaien met de pijltjes of de D-pad (#610): de hint bij het model volgt via
// data-gk vanzelf het laatst gebruikte apparaat. pausemenu.js stuurt de
// richting hierheen als de focus op de draaitafel staat.
export function turnGarageViewer(dir) {
  if (!viewer || !dir) return false;
  viewer.turn(dir * TURN_STEP);
  return true;
}

// The silhouette and the still behind the live canvas: on while the preview
// has not drawn yet, off as soon as it has.
// Het silhouet is een SVG en die kent geen `hidden` (zie stageSilhouetteStyle,
// #463): het werd nooit verborgen en scheen in de lakkleur door het model en het
// glas heen. Een stijl op het element zelf werkt wel; de <img> eronder is HTML
// en gebruikt gewoon `hidden`.
function showStageFallback(box, on) {
  const glyph = box.querySelector('.gar-stage > svg');
  if (glyph) glyph.style.display = stageSilhouetteStyle(on);
  const still = box.querySelector('.gar-still');
  if (still && !on) still.hidden = true;
}

// A still of the selected model through the same shared renderer, so the pane
// shows the vehicle even while the live preview is still starting (or when
// this machine has no WebGL: then the silhouette stays).
let stillKey = '';
function showStill(box, spec) {
  const img = box.querySelector('.gar-still');
  if (!img || !spec) return;
  const key = JSON.stringify(spec);
  stillKey = key;
  img.hidden = true;
  img.removeAttribute('src');
  renderSnapshot(spec, GARAGE_PIC_W * 2, GARAGE_PIC_H * 2, (url) => {
    if (!url || !img.isConnected || stillKey !== key || box.dataset.drawn) return;
    img.src = url;
    img.hidden = false;
  }, { angle: GARAGE_3Q_ANGLE, zoom: garagePicZoom(spec), group: VIEWER_GROUP });
}

// Drops the viewer's model, the turntable and the pictures still to come
// (tab switched or menu closed).
export function disposeGarageViewer() {
  if (viewer) { viewer.dispose(); viewer = null; }
  viewerCanvas = null;
  stillKey = '';
  stopTurn();
  if (turn) { turn.dispose(); turn = null; turnCanvas = null; }
  cancelSnapshots(VIEWER_GROUP);
  cancelSnapshots(PIC_GROUP);
}

// --- card pictures and the turntable ---------------------------------------

const PIC_GROUP = 'garage';
let turn = null;
let turnCanvas = null;
let turnId = null;
let turnTimer = 0;
const aim = { hover: null, touch: false, latest: 'hover', downAt: -1e9, byPointer: false };

// The pictures are drawn one by one in idle time, in list order; until a
// card's picture is there it shows a quiet placeholder, and without WebGL the
// old silhouette.
// #999: wat in beeld staat (met wat marge) komt eerst, in lijstvolgorde; de rest volgt. Zo blijft "Te koop" onderaan de lijst niet
// als silhouet staan terwijl de wachtrij nog bij de bovenste kaarten bezig is; bij het scrollen komt het nieuwe beeld vooraan.
const inBeeld = (lijst, card) => {
  const r = lijst.getBoundingClientRect(); const c = card.getBoundingClientRect();
  return c.bottom > r.top - 120 && c.top < r.bottom + 120;
};
function fillPics(el, alleenZichtbaar = false) {
  const lijst = el.querySelector('.gar-list');
  const kaarten = [...el.querySelectorAll('.gar-list .gar-card')].map((card) => ({ card, prio: !!lijst && inBeeld(lijst, card) }));
  // eerst de rest in volgorde (achteraan de wachtrij), dan het zichtbare in omgekeerde volgorde vooraan: samen blijft de lijstvolgorde
  const volgorde = [...kaarten.filter((k) => !k.prio), ...kaarten.filter((k) => k.prio).reverse()];
  for (const { card, prio } of volgorde) {
    const e = lastList.find((x) => x.id === card.dataset.garageSelect);
    const ph = card.querySelector('.gar-ph');
    const spec = e && previewSpec(e);
    if (!ph) continue;
    if (alleenZichtbaar && (!prio || ph.querySelector('img'))) continue; // bij het scrollen: geen kaart opnieuw tekenen die al een beeld heeft
    const put = (url) => {
      if (!ph.isConnected) return;
      ph.innerHTML = url ? `<img alt="" draggable="false" src="${url}">` : vehicleGlyph(e.kind, e.locked ? 'var(--ds-c-inkt-zacht)' : e.color);
    };
    if (!spec) { if (!alleenZichtbaar) put(''); continue; }
    renderSnapshot(spec, GARAGE_PIC_W, GARAGE_PIC_H, put, { angle: GARAGE_3Q_ANGLE, zoom: garagePicZoom(spec), group: PIC_GROUP, prio });
  }
}

function stopTurn() {
  clearTimeout(turnTimer);
  if (turn) turn.clear();
  if (turnCanvas && turnCanvas.parentNode) turnCanvas.parentNode.classList.remove('spin');
  if (turnCanvas) turnCanvas.remove();
  turnId = null;
}

function startTurn(el, id) {
  const card = [...el.querySelectorAll('.gar-list .gar-card')].find((c) => c.dataset.garageSelect === id);
  const ph = card && card.querySelector('.gar-ph');
  const e = lastList.find((x) => x.id === id);
  const spec = e && previewSpec(e);
  if (!ph || !spec || !ph.querySelector('img')) return;
  if (!turnCanvas) {
    turnCanvas = document.createElement('canvas');
    turnCanvas.className = 'gar-turn';
    turnCanvas.setAttribute('aria-hidden', 'true');
  }
  if (!turn) turn = createSharedPreview(turnCanvas, { angle: GARAGE_3Q_ANGLE, zoom: garagePicZoom(spec), speed: TURN_SPEED, fps: TURN_FPS, active: () => turnCanvas.isConnected });
  if (turnId === id) return;
  stopTurn();
  turnId = id;
  ph.appendChild(turnCanvas);
  turn.show(spec);
  // the still steps aside once the first turning frame is drawn
  requestAnimationFrame(() => { if (turnId === id) ph.classList.add('spin'); });
}

// One card turns: the pointer's or the focused one (the latest of the two; a
// focus that a click gave does not count: the pointer has moved on), else on
// touch the tapped one.
function syncTurn(el) {
  const focus = document.activeElement;
  const focused = !aim.byPointer && focus && focus.classList && focus.classList.contains('gar-card') && el.contains(focus) ? focus.dataset.garageSelect : null;
  const id = turntableTarget({ hover: aim.hover, focus: focused, selected, touch: aim.touch, reduced: reducedMotion(), latest: aim.latest });
  clearTimeout(turnTimer);
  if (id === null) { stopTurn(); return; }
  if (id === turnId) return;
  // a short wait, so sweeping the mouse over the grid builds no models
  turnTimer = setTimeout(() => startTurn(el, id), turnId === null ? 110 : 40);
}

function bindTurntable(el) {
  const cardOf = (t) => (t && t.closest ? t.closest('.gar-card') : null);
  el.addEventListener('pointerover', (ev) => {
    aim.touch = ev.pointerType === 'touch' || ev.pointerType === 'pen';
    const c = ev.pointerType === 'mouse' ? cardOf(ev.target) : null;
    const id = c ? c.dataset.garageSelect : null;
    if (id === aim.hover) return;
    aim.hover = id;
    if (id) aim.latest = 'hover';
    syncTurn(el);
  });
  el.addEventListener('pointerdown', (ev) => { aim.touch = ev.pointerType === 'touch' || ev.pointerType === 'pen'; aim.downAt = performance.now(); });
  el.addEventListener('pointerleave', () => { aim.hover = null; syncTurn(el); });
  el.addEventListener('focusin', () => {
    aim.byPointer = performance.now() - aim.downAt < 500;
    if (!aim.byPointer) aim.latest = 'focus';
    syncTurn(el);
  });
  el.addEventListener('focusout', () => setTimeout(() => syncTurn(el), 0));
}

function tabsHtml(list) {
  const sort = (SORTS.find(([id]) => id === view.sort) || SORTS[0])[1];
  const filt = (FILTERS.find(([id]) => id === view.filter) || FILTERS[0])[1];
  return '<nav class="m-tablist" role="tablist" aria-label="Soort voertuig">' +
    garageTabCounts(list).map((t) => `<button type="button" role="tab" class="m-tab${t.owned ? '' : ' is-leeg'}" data-garage-cat="${t.id}" aria-selected="${view.cat === t.id}"${t.owned ? '' : ` aria-label="${esc(t.label)}, ${t.total} te koop of op slot"`}>${esc(t.label)}${t.owned ? `<small>${t.owned}</small>` : ''}</button>`).join('') + '</nav><span class="m-grow"></span>' +
    `<button type="button" class="ds-z-chip ds-z-chip--selectie gar-chip" data-garage-filter>Toon: ${filt}</button>` +
    `<button type="button" class="ds-z-chip ds-z-chip--selectie gar-chip" data-garage-sort>${sort}</button>`;
}

// Onderaan de lijst: hoeveel er nog te ontdekken zijn, zonder te verklappen welke.
function meerHtml() {
  return lastVerborgen > 0 ? `<div class="gar-meer"><b>Nog ${lastVerborgen} te ontdekken</b><br>Stap in een voertuig of koop er een.</div>` : '';
}

function listHtml(list) {
  const shown = shownList(list);
  if (!shown.length) {
    return '<div class="gar-leeg ds-z-leeg ds-zeef"><span class="ds-z-leeg__beeld">' + icoon('zoek', { cls: 'gar-ic' }) + '</span>' +
      '<h3 class="ds-z-leeg__kop">Niks in deze selectie</h3><div class="ds-z-leeg__tekst">Kies een andere soort of toon alles.</div>' +
      '<button type="button" class="ds-z-knop ds-z-knop--secundair" data-garage-cat="all">Alle soorten</button></div>';
  }
  let out = '';
  for (const { group, items } of garageSections(shown)) out += `<div class="m-gh"><span>${GROUP_HEAD[group]}</span><span>${items.length}</span></div>${items.map(row).join('')}`;
  return out + meerHtml();
}

function pickShown(el) {
  const keepId = keepSelection(shownList(lastList), selected);
  if (keepId == null) { disposeGarageViewer(); const box = el.querySelector('.gar-viewer'); if (box) box.innerHTML = ''; return; }
  selectGarageVehicle(el, keepId);
}

function refreshList(el) {
  const tools = el.querySelector('.m-tabs');
  if (!tools || !el.querySelector('.gar-list')) return;
  stopTurn();
  cancelSnapshots(PIC_GROUP);
  cancelSnapshots(VIEWER_GROUP);
  aim.hover = null;
  tools.innerHTML = tabsHtml(lastList);
  el.querySelector('.gar-list').innerHTML = listHtml(lastList);
  fillPics(el);
  pickShown(el);
}

function bindToolbar(el) {
  if (el.dataset.garBound) return;
  el.dataset.garBound = '1';
  bindTurntable(el);
  // #999: scrolt de lijst naar kaarten zonder beeld, dan komen die vooraan de wachtrij
  let scrolT = 0;
  el.addEventListener('scroll', (ev) => {
    if (!ev.target || !ev.target.classList || !ev.target.classList.contains('gar-list')) return;
    clearTimeout(scrolT);
    scrolT = setTimeout(() => fillPics(el, true), 120);
  }, true);
  el.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-garage-cat]');
    const s = ev.target.closest('[data-garage-sort]');
    const f = ev.target.closest('[data-garage-filter]');
    if (!c && !s && !f) return;
    if (c) { view.cat = c.dataset.garageCat; view.eigen = true; }
    if (s) view.sort = cycleOption(SORTS, view.sort);
    if (f) view.filter = cycleOption(FILTERS, view.filter);
    refreshList(el);
    const again = el.querySelector(c ? `[data-garage-cat="${view.cat}"]` : s ? '[data-garage-sort]' : '[data-garage-filter]');
    if (again) again.focus({ preventScroll: true });
  });
}

export function renderGaragePanel(el, world, msg = '') {
  initGarageStyles(); // het paneel kan zonder phone.js openen; de stijl hoort er dan ook te zijn
  bindToolbar(el);
  const alle = getGarageCatalog(world);
  const telling = knownCount(alle);
  const list = visibleList(alle);
  const tabsNu = garageTabCounts(list); // Alles bestaat pas bij meer dan één soort; anders is de enige tab de keuze
  if (tabsNu.length && (!view.eigen || !tabsNu.some((t) => t.id === view.cat))) view.cat = tabsNu.some((t) => t.id === 'all') && !view.eigen ? 'all' : tabsNu.some((t) => t.id === view.cat) ? view.cat : tabsNu[0].id;
  lastList = list;
  lastVerborgen = telling.verborgen;
  el.dataset.sub = knownText(telling);
  el.innerHTML = `<div class="m-tabs">${tabsHtml(list)}</div>` +
    '<div class="m-main"><div class="m-list gar-list"></div><aside class="m-pane gar-viewer" aria-live="polite" aria-label="Details"></aside></div>';
  aim.hover = null;
  disposeGarageViewer();
  el.querySelector('.gar-list').innerHTML = listHtml(list);
  fillPics(el);
  pickShown(el);
  if (msg && selected) selectGarageVehicle(el, selected, msg);
}
