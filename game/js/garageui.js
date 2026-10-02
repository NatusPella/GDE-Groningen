// Garage section of the pause menu (and the styles of the phone's
// "Voertuigen" app): every vehicle as a card with a rendered thumbnail, the
// selected one turning in the viewer. Thumbnails and the viewer both come
// from vehiclepreview.js's one shared renderer, so the garage never opens a
// WebGL context of its own.
import { getGarageCatalog, whereText } from './ownedvehicles.js';
import { createSharedPreview, renderSnapshot } from './vehiclepreview.js';
import { fillBars } from './motion.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const GLYPHS = {
  car: '<path d="M6 30l4-11a5 5 0 0 1 4.7-3.3h18.6A5 5 0 0 1 38 19l4 11h1.5a2.5 2.5 0 0 1 2.5 2.5V40h-5v3a3 3 0 0 1-6 0v-3H13v3a3 3 0 0 1-6 0v-3H2v-7.5A2.5 2.5 0 0 1 4.5 30zm6-1h24l-2.8-8.2a1.5 1.5 0 0 0-1.4-1h-15.6a1.5 1.5 0 0 0-1.4 1z"/><circle cx="10" cy="35" r="2.6" fill="#10180f"/><circle cx="38" cy="35" r="2.6" fill="#10180f"/>',
  bike: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="32" r="8"/><circle cx="37" cy="32" r="8"/><path d="M11 32l8-14h12l6 14M11 32h11l9-14M16 13h6M31 18l-2-6h5"/></g>',
  bus: '<path d="M4 12a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v22a2 2 0 0 1-2 2h-2v3a3 3 0 0 1-6 0v-3H14v3a3 3 0 0 1-6 0v-3H6a2 2 0 0 1-2-2zm4 2v8h8v-8zm11 0v8h8v-8zm11 0v8h9v-8z"/>',
  truck: '<path d="M2 12h26v22H2zM30 18h8l6 8v8h-14z"/><circle cx="10" cy="36" r="4"/><circle cx="36" cy="36" r="4"/><rect x="32" y="20" width="6" height="5" fill="#10180f"/>',
  boat: '<path d="M4 28h40l-6 10H10zM14 18h14v8H14zM30 14h3v12h-3z"/><path d="M6 42c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="currentColor" stroke-width="2"/>',
  scooter: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="34" r="6"/><circle cx="38" cy="34" r="6"/><path d="M17 34h14l5-18h5M31 34l-3-9H15"/></g><path d="M14 22h13v5H12z"/>',
  heli: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 9h34M21 9v6M10 41h20M14 35v6M26 35v6M30 25h12M41 19v10"/></g><path d="M8 27a12 10 0 0 1 24 0v6H8z"/>',
};

export function vehicleGlyph(kind, color) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" style="color:${esc(color)}"><g fill="currentColor">${GLYPHS[kind] || GLYPHS.car}</g></svg>`;
}

let styled = false;
function injectStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = `
#pause-menu .pm-garage { width: min(1240px, calc(100% / var(--ui, 1))); }
#pause-menu .gar-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 12px; margin: 2px 0 6px; }
#pause-menu .gar-cats { display: flex; flex-wrap: wrap; gap: 8px; }
#pause-menu .gar-pill { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px; border-radius: 19px; cursor: pointer; font: 18px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1.2px;
  color: var(--pm-ink); background: transparent; border: 1px solid rgba(240,237,228,0.22); transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
#pause-menu .gar-pill small { font: 13px 'Arial Narrow', Arial, sans-serif; opacity: 0.8; }
#pause-menu .gar-pill:hover { border-color: rgba(63,201,122,0.6); background: rgba(30,158,86,0.14); }
#pause-menu .gar-pill[aria-pressed="true"] { background: #1e9e56; border-color: #3fc97a; color: #f6fff8; }
#pause-menu .gar-tools { display: flex; gap: 8px; }
#pause-menu .gar-tool { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 8px; cursor: pointer; font: 14px 'Arial Narrow', Arial, sans-serif;
  color: var(--pm-ink); background: transparent; border: 1px solid rgba(240,237,228,0.22); }
#pause-menu .gar-tool:hover, #pause-menu .gar-tool:focus-within { border-color: rgba(63,201,122,0.6); }
#pause-menu .gar-tool svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .gar-tool select { font: inherit; color: inherit; background: transparent; border: 0; padding: 0; cursor: pointer; }
#pause-menu .gar-tool select option { background: #0c140e; }
#pause-menu .gar-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start; }
#pause-menu .gar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; align-content: start; }
#pause-menu .gar-card { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; text-align: left; cursor: pointer; font: inherit; color: var(--pm-ink);
  background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08);
  transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out); }
#pause-menu .gar-card:hover { border-color: rgba(63,201,122,0.4); transform: translateY(-1px); }
#pause-menu .gar-card.sel { background: rgba(30,158,86,0.14); border-color: rgba(63,201,122,0.55); }
#pause-menu .gar-card[data-group="locked"] .gar-thumb img { filter: brightness(0.3) saturate(0); }
#pause-menu .gar-card[data-group="sale"] .gar-thumb img { filter: saturate(0.6); }
#pause-menu .gar-thumb { position: relative; display: grid; place-items: center; height: 96px; border-radius: 10px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 70%, #24492f 0%, #10211a 70%); border: 1px solid rgba(63,201,122,0.16); }
#pause-menu .gar-thumb > svg { width: 44px; height: 44px; color: rgba(240,237,228,0.22); transition: opacity var(--dur-slow) var(--ease-out); }
#pause-menu .gar-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity var(--dur-slow) var(--ease-out); }
#pause-menu .gar-thumb img.on { opacity: 1; }
#pause-menu .gar-thumb:has(img.on) > svg { opacity: 0; }
#pause-menu .gar-name { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
#pause-menu .gar-name small { font: 12px 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; text-transform: uppercase; color: #a3b2a6; }
#pause-menu .gar-name b { font-weight: normal; font-size: 21px; letter-spacing: 1px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pause-menu .gar-meter { display: grid; grid-template-columns: 74px minmax(0, 1fr); align-items: center; gap: 8px; font: 12px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .gar-meter > span { display: block; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; }
#pause-menu .gar-meter i { display: block; width: 0; height: 100%; border-radius: 3px; background: #3fc97a; transition: width var(--dur-bar) var(--ease-out); }
#pause-menu .gar-chip { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 10px; border-radius: 12px; white-space: nowrap;
  font: 15px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; color: #a3b2a6; border: 1.5px solid rgba(240,237,228,0.25); }
#pause-menu .gar-chip svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .gar-chip[data-k="locked"] { border-style: dashed; border-color: #6f7f73; }
#pause-menu .gar-chip[data-k="lost"] { color: #d93f3f; border-color: rgba(217,63,63,0.6); }
#pause-menu .gar-chip[data-k="mine"] { color: #3fc97a; border-color: rgba(63,201,122,0.5); }
#pause-menu .gar-viewer { position: sticky; top: 0; display: flex; flex-direction: column; gap: 14px; min-height: 520px; box-sizing: border-box; padding: 16px; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(63,201,122,0.16); }
#pause-menu .gar-viewer > :not(.gar-stage) { animation: pm-rise var(--dur-base) var(--ease-out); }
#pause-menu .gar-stage { position: relative; flex: none; height: 200px; border-radius: 10px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 70%, #24492f 0%, #10211a 70%); border: 1px solid rgba(63,201,122,0.16); }
#pause-menu .gar-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
#pause-menu .gar-stage canvas:active { cursor: grabbing; }
#pause-menu .gar-stage .gar-hint { position: absolute; right: 8px; bottom: 6px; font: 11px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; pointer-events: none; }
#pause-menu .gar-kicker { font: 13px 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; text-transform: uppercase; color: #3fc97a; }
#pause-menu .gar-viewer .gar-name b { font-size: 34px; letter-spacing: 1.5px; white-space: normal; }
#pause-menu .gar-meme { margin: 0; font: 15px/1.45 'Arial Narrow', Arial, sans-serif; }
#pause-menu .gar-facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 14px; margin: 0; font: 15px 'Arial Narrow', Arial, sans-serif; }
#pause-menu .gar-facts dt { color: #a3b2a6; }
#pause-menu .gar-facts dd { margin: 0; display: flex; align-items: center; gap: 6px; }
#pause-menu .gar-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(240,237,228,0.5); flex: none; }
#pause-menu .gar-actions { margin-top: auto; display: flex; flex-wrap: wrap; gap: 8px; }
#pause-menu .gar-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 8px; cursor: pointer;
  font: 20px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1.2px; color: var(--pm-ink); background: transparent; border: 1px solid rgba(240,237,228,0.28); }
#pause-menu .gar-actions button svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .gar-actions button:hover { border-color: #3fc97a; }
#pause-menu .gar-actions .gar-go { background: #1e9e56; color: #f6fff8; border-color: #3fc97a; }
#pause-menu .gar-actions .gar-go:hover { background: #2fb56a; }
#pause-menu .gar-msg { margin: 0; font: 14px 'Arial Narrow', Arial, sans-serif; color: #3fc97a; }
#pause-menu .gar-msg:empty { display: none; }
#pause-menu .gar-note { margin: 0; font: 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .gar-empty { padding: 18px 0; }
@media (max-width: 980px) { #pause-menu .gar-layout { grid-template-columns: 1fr; } #pause-menu .gar-viewer { position: static; order: -1; min-height: 0; } }
#hud .ph-swatch { flex: none; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(240,237,228,0.5); margin-right: 8px; }
#hud .ph-swatch.lg { width: 22px; height: 22px; }
#hud .ph-chip[data-status="lost"] { border-color: #d93f3f; color: #d93f3f; }
#hud .ph-veh { padding: 8px 8px 10px; display: flex; flex-direction: column; gap: 6px; }
#hud .ph-veh-top { display: flex; align-items: center; }
#hud .ph-veh p { margin: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 13px; line-height: 1.3; }
#hud .ph-veh-meme { font-style: italic; color: rgba(240,237,228,0.85); }
#hud .ph-veh-facts { color: rgba(240,237,228,0.6); }
#hud .ph-veh-msg { color: #3fc97a; }
`;
  document.head.appendChild(st);
}

export function initGarageStyles() {
  injectStyle();
}

const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>';
const SORT_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>';
const THUMB_W = 320, THUMB_H = 150;

const CATS = [
  ['all', 'Alles'],
  ['autos', "Auto's"],
  ['bussen', 'Bussen'],
  ['fietsen', 'Fietsen'],
  ['scooters', 'Scooters'],
  ['boten', 'Boten'],
  ['luchtvaart', 'Lucht'],
  ['speciaal', 'Speciaal'],
];
const FILTERS = [['all', 'alles'], ['owned', 'van jou'], ['sale', 'te koop'], ['locked', 'op slot']];
const SORTS = [['naam', 'Naam'], ['prijs', 'Prijs'], ['snelheid', 'Snelheid']];
const BIG_TYPES = new Set(['Bestelbus', 'Vrachtwagen', 'Midibus', 'Stadsbus', 'Tankwagen', 'Geldwagen']);
const GROUPS = ['owned', 'sale', 'locked'];
const GROUP_LABEL = { owned: 'van jou', sale: 'te koop', locked: 'op slot' };
const view = { cat: 'all', filter: 'all', sort: 'naam' };

let viewer = null;
let selected = null;
let lastList = [];
let topSpeedMax = 1;
const bars = new Map();

// Story/achievement unlocks are "Speciaal", whatever they drive like.
function categoryOf(e) {
  const spec = e.spec || {};
  if (spec.kind === 'heli') return 'luchtvaart';
  if (spec.unlock) return 'speciaal';
  if (spec.kind === 'boat') return 'boten';
  if (spec.kind === 'bike') return 'fietsen';
  if (spec.kind === 'scooter') return 'scooters';
  if (e.kind === 'bus' || e.kind === 'truck' || BIG_TYPES.has(spec.type)) return 'bussen';
  return 'autos';
}
const groupOf = (e) => e.owned ? 'owned' : e.locked ? 'locked' : 'sale';
const priceOf = (e) => e.price || (e.spec && e.spec.price) || 0;
const euro = (n) => `€${Number(n).toLocaleString('nl-NL')}`;
const SORTERS = {
  naam: (a, b) => String(a.model).localeCompare(String(b.model), 'nl'),
  prijs: (a, b) => priceOf(a) - priceOf(b) || SORTERS.naam(a, b),
  snelheid: (a, b) => b.topSpeed - a.topSpeed || SORTERS.naam(a, b),
};
const inCat = (e) => view.cat === 'all' || categoryOf(e) === view.cat;
// yours first, then for sale, then locked; within each the chosen order
const shownList = (list) => list.filter((e) => inCat(e) && (view.filter === 'all' || groupOf(e) === view.filter))
  .sort((a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || (SORTERS[view.sort] || SORTERS.naam)(a, b));

function previewSpec(e) {
  if (!e || !e.spec || !e.spec.model) return null;
  return { kind: e.spec.kind === 'scooter' ? 'scooter' : e.spec.kind, model: e.spec.model, color: e.color, nameIdx: e.spec.nameIdx || 0, flags: e.hero ? { isHeroCar: true } : e.spec.flags || null };
}

// The short chip on a card: where it is, its price, or the lock.
function chipHtml(e) {
  if (e.locked) return `<span class="gar-chip" data-k="locked">${LOCK}Op slot</span>`;
  if (!e.owned) return `<span class="gar-chip">${euro(priceOf(e))}</span>`;
  if (e.status === 'lost') return '<span class="gar-chip" data-k="lost">Total loss</span>';
  const label = e.status === 'garage' ? 'Thuis' : e.status === 'driving' ? 'Je zit erin' : 'Van jou';
  return `<span class="gar-chip" data-k="mine">${label}</span>`;
}

function meters(e) {
  const speed = Math.round(Math.min(100, (e.topSpeed / topSpeedMax) * 100));
  return `<span class="gar-meter">Snelheid<span><i data-bar="s-${esc(e.id)}" data-w="${speed}"></i></span></span>` +
    `<span class="gar-meter">Trekkracht<span><i data-bar="a-${esc(e.id)}" data-w="${e.accelScore * 10}"></i></span></span>`;
}

function card(e) {
  return `<button type="button" class="gar-card${e.id === selected ? ' sel' : ''}" data-garage-select="${esc(e.id)}" data-group="${groupOf(e)}">` +
    `<span class="gar-thumb" data-thumb="${esc(e.id)}">${vehicleGlyph(e.kind, 'currentColor')}</span>` +
    `<span class="gar-name"><small>${esc(e.make || e.kindLabel)}</small><b>${esc(e.model)}</b></span>` +
    meters(e) + chipHtml(e) + '</button>';
}

function viewerHtml(e, msg) {
  const rows = [];
  if (e.owned) rows.push(['Waar', esc([e.statusLabel, whereText(e)].filter(Boolean).join(' · '))]);
  else if (e.locked) rows.push(['Vrijspelen', esc(e.unlockText || 'Via het verhaal of een prestatie')]);
  else rows.push(['Prijs', `${euro(priceOf(e))}${e.shop ? ` bij ${esc(e.shop)}` : ''}`]);
  rows.push(['Topsnelheid', `${e.topSpeed} km/u`], ['Trekkracht', `${e.accelScore} van 10`]);
  rows.push(['Lak', `<span class="gar-dot" style="background:${esc(e.color)}"></span>${esc(e.paint)}`]);
  if (e.owned && e.kind !== 'boat' && e.kind !== 'heli') rows.push(['Upgrades', e.upgrades.length ? esc(e.upgrades.join(', ')) : `Nog niks: ${e.kind === 'bike' || e.kind === 'scooter' ? 'Spaak & Band' : 'Knal & Kolder Tuning'} helpt je graag`]);
  const actions = !e.owned ? '' : '<div class="gar-actions">' +
    (e.status !== 'driving' ? `<button type="button" class="gar-go" data-garage-deliver="${esc(e.id)}">Laten afleveren${e.fee ? ` · ${esc(e.feeLabel)}` : ''}</button>` : '') +
    (e.status === 'near' || e.status === 'far' ? `<button type="button" data-garage-find="${esc(e.id)}">${PIN}Waar staat hij?</button>` : '') + '</div>';
  return `<div class="gar-stage"><canvas aria-label="3D-model van ${esc(e.model)}"></canvas><span class="gar-hint">Sleep om te draaien</span></div>` +
    `<div class="gar-name"><span class="gar-kicker">${esc([e.make, e.kindLabel, GROUP_LABEL[groupOf(e)]].filter(Boolean).join(' · '))}</span><b>${esc(e.model)}</b></div>` +
    (e.meme ? `<p class="gar-meme">${esc(e.meme)}</p>` : '') +
    `<dl class="gar-facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` +
    `<p class="gar-msg" role="status">${esc(msg || '')}</p>` + actions;
}

// Shows vehicle `id` in the viewer (pausemenu.js: a click or Enter on a
// card). The viewer draws through the shared renderer: switching cards only
// swaps the model.
export function selectGarageVehicle(el, id, msg = '') {
  const e = lastList.find((x) => x.id === id);
  const box = el.querySelector('.gar-viewer');
  if (!e || !box) return;
  selected = id;
  for (const c of el.querySelectorAll('.gar-card')) c.classList.toggle('sel', c.dataset.garageSelect === id);
  if (viewer) viewer.dispose();
  box.innerHTML = viewerHtml(e, msg);
  const c = box.querySelector('canvas');
  viewer = createSharedPreview(c, { interactive: true, active: () => c.isConnected && c.offsetParent !== null });
  viewer.show(previewSpec(e));
}

// Drops the viewer's model (tab switched or menu closed).
export function disposeGarageViewer() {
  if (viewer) { viewer.dispose(); viewer = null; }
}

function toolbarHtml(list) {
  return '<div class="gar-cats" role="group" aria-label="Soort voertuig">' +
    CATS.map(([id, label]) => {
      const all = list.filter((e) => id === 'all' || categoryOf(e) === id);
      if (!all.length) return '';
      return `<button type="button" class="gar-pill" data-garage-cat="${id}" aria-pressed="${view.cat === id}">${esc(label)}<small>${all.filter((e) => e.owned).length}/${all.length}</small></button>`;
    }).join('') + '</div>' +
    '<div class="gar-tools"><label class="gar-tool">Toon: <select data-garage-filter>' +
    FILTERS.map(([id, label]) => `<option value="${id}"${view.filter === id ? ' selected' : ''}>${label}</option>`).join('') + '</select></label>' +
    `<button type="button" class="gar-tool" data-garage-sort aria-label="Sorteren op ${(SORTS.find(([id]) => id === view.sort) || SORTS[0])[1].toLowerCase()}">${SORT_IC}${(SORTS.find(([id]) => id === view.sort) || SORTS[0])[1]}</button></div>`;
}

function gridHtml(list) {
  const shown = shownList(list);
  if (!shown.length) return '<p class="gar-note gar-empty">Niks in deze selectie. Kies een andere soort of toon alles.</p>';
  return `<div class="gar-grid">${shown.map(card).join('')}</div>`;
}

// Fills in the rendered thumbnails as they come (a few per frame).
function loadThumbs(el) {
  for (const t of el.querySelectorAll('[data-thumb]')) {
    const spec = previewSpec(lastList.find((x) => x.id === t.dataset.thumb));
    if (!spec) continue;
    renderSnapshot(spec, THUMB_W, THUMB_H, (url) => {
      if (!url || !t.isConnected || t.querySelector('img')) return;
      const img = new Image();
      img.alt = '';
      img.src = url;
      t.appendChild(img);
      requestAnimationFrame(() => img.classList.add('on'));
    }, { angle: 0.75 });
  }
}

function pickShown(el) {
  const cards = [...el.querySelectorAll('.gar-card')];
  const keep = cards.find((c) => c.dataset.garageSelect === selected) || cards[0];
  if (!keep) { disposeGarageViewer(); const box = el.querySelector('.gar-viewer'); if (box) box.innerHTML = ''; return; }
  selectGarageVehicle(el, keep.dataset.garageSelect);
}

function showList(el) {
  const listEl = el.querySelector('.gar-list');
  listEl.innerHTML = gridHtml(lastList);
  fillBars(listEl, bars);
  loadThumbs(listEl);
}

function refreshList(el) {
  const tools = el.querySelector('.gar-toolbar');
  if (!tools || !el.querySelector('.gar-list')) return;
  tools.innerHTML = toolbarHtml(lastList);
  showList(el);
  pickShown(el);
}

function bindToolbar(el) {
  if (el.dataset.garBound) return;
  el.dataset.garBound = '1';
  el.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-garage-cat]');
    const s = ev.target.closest('[data-garage-sort]');
    if (!c && !s) return;
    if (c) view.cat = c.dataset.garageCat;
    if (s) view.sort = SORTS[(SORTS.findIndex(([id]) => id === view.sort) + 1) % SORTS.length][0];
    refreshList(el);
    const again = el.querySelector(c ? `[data-garage-cat="${view.cat}"]` : '[data-garage-sort]');
    if (again) again.focus({ preventScroll: true });
  });
  el.addEventListener('change', (ev) => {
    if (!ev.target.matches('[data-garage-filter]')) return;
    view.filter = ev.target.value;
    refreshList(el);
    const sel = el.querySelector('[data-garage-filter]');
    if (sel) sel.focus({ preventScroll: true });
  });
}

export function renderGaragePanel(el, world, msg = '') {
  injectStyle();
  bindToolbar(el);
  const list = getGarageCatalog(world);
  lastList = list;
  topSpeedMax = Math.max(1, ...list.map((e) => e.topSpeed || 0));
  const owned = list.filter((e) => e.owned);
  el.innerHTML =
    `<h2>Garage <small>${owned.length} van ${list.length} voertuigen van jou</small></h2>` +
    `<div class="gar-toolbar">${toolbarHtml(list)}</div>` +
    '<div class="gar-layout"><div class="gar-list"></div><aside class="gar-viewer" aria-live="polite" aria-label="Details"></aside></div>';
  disposeGarageViewer();
  showList(el);
  pickShown(el);
  if (msg && selected) selectGarageVehicle(el, selected, msg);
}
