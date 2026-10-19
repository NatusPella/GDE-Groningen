// Garage section of the pause menu (and the styles of the phone's
// "Voertuigen" app): every vehicle as a card with a rendered thumbnail, the
// selected one turning in the viewer. Thumbnails and the viewer both come
// from vehiclepreview.js's one shared renderer, so the garage never opens a
// WebGL context of its own.
import { getGarageCatalog, whereText } from './ownedvehicles.js';
import { createSharedPreview } from './vehiclepreview.js';
import {
  GARAGE_FILTERS as FILTERS, GARAGE_SORTS as SORTS, garageGroup as groupOf, garagePrice as priceOf,
  garageShown, garageSections, garageTabCounts, cycleOption, keepSelection,
} from './menumodels.js';

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

function vehicleGlyph(kind, color) {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" style="color:${esc(color)}"><g fill="currentColor">${GLYPHS[kind] || GLYPHS.car}</g></svg>`;
}


// the old phone app's styles are gone with the app
export function initGarageStyles() {}

const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';

const GROUP_LABEL = { owned: 'van jou', sale: 'te koop', locked: 'op slot' };
const GROUP_HEAD = { owned: 'Van jou', sale: 'Te koop', locked: 'Op slot' };
const view = { cat: 'all', filter: 'all', sort: 'naam' };

let viewer = null;
let selected = null;
let lastList = [];

const euro = (n) => `€${Number(n).toLocaleString('nl-NL')}`;
const shownList = (list) => garageShown(list, view);

function previewSpec(e) {
  if (!e || !e.spec || !e.spec.model) return null;
  return { kind: e.spec.kind === 'scooter' ? 'scooter' : e.spec.kind, model: e.spec.model, color: e.color, nameIdx: e.spec.nameIdx || 0, flags: e.hero ? { isHeroCar: true } : e.spec.flags || null };
}

// the card's status line: where it is, its price, or the lock
function endHtml(e) {
  if (e.locked) return `${LOCK}<span class="t">${esc(e.unlockShort || 'Op slot')}</span>`;
  if (!e.owned && e.spec && e.spec.unlock) return '<span class="t g">Vrijgespeeld</span>';
  if (!e.owned) return `<span class="v">${euro(priceOf(e))}</span>`;
  if (e.status === 'lost') return '<span class="t" style="color:var(--redtx)">Afgeschreven</span>';
  const label = e.status === 'garage' ? 'Thuis' : e.status === 'driving' ? 'Je zit erin' : 'Van jou';
  return `<span class="t${e.status === 'driving' ? ' g' : ''}">${label}</span>`;
}

// a card of the grid: the vehicle's silhouette in its own paint, name, status
function row(e) {
  return `<button type="button" class="m-li gar-card${e.locked ? ' off' : ''}${e.id === selected ? ' sel' : ''}" data-garage-select="${esc(e.id)}" data-group="${groupOf(e)}"${e.id === selected ? ' aria-current="true"' : ''}>` +
    `<span class="gar-ph">${vehicleGlyph(e.kind, e.locked ? '#6d756d' : e.color)}</span>` +
    `<span class="nm"><span class="one">${esc(e.model)}</span><span class="gar-st">${endHtml(e)}</span></span></button>`;
}

function viewerHtml(e, msg) {
  const rows = [];
  if (e.owned) rows.push(['Waar', esc([e.statusLabel, whereText(e)].filter(Boolean).join(' · '))]);
  else if (e.locked) rows.push(['Vrijspelen', esc(e.unlockText || 'Via het verhaal of een prestatie')]);
  else if (e.spec && e.spec.unlock) rows.push(['Vrijgespeeld', esc(e.statusLabel)]);
  else rows.push(['Te koop', `${euro(priceOf(e))}${e.shop ? ` bij ${esc(e.shop)}` : ''}. Nog niet van jou: na het kopen staat hij thuis`]);
  rows.push(['Topsnelheid', `${e.topSpeed} km/u`], ['Trekkracht', `${e.accelScore} / 10`]);
  rows.push(['Lak', `<span class="gar-dot" style="background:${esc(e.color)}"></span>${esc(e.paint)}`]);
  if (e.owned && e.kind !== 'boat' && e.kind !== 'heli') rows.push(['Upgrades', e.upgrades.length ? esc(e.upgrades.join(', ')) : `Nog niks: ${e.kind === 'bike' || e.kind === 'scooter' ? 'Spaak & Band' : 'Knal & Kolder Tuning'} helpt je graag`]);
  const acts = !e.owned ? '' : '<div class="m-acts td-acts">' +
    (e.status !== 'driving' ? `<button type="button" class="m-bp gar-go" data-garage-deliver="${esc(e.id)}">Laten afleveren${e.fee ? ` · ${esc(e.feeLabel)}` : ''}</button>` : '') +
    (e.status === 'near' || e.status === 'far' ? `<button type="button" class="m-bg" data-garage-find="${esc(e.id)}">${PIN}Waar staat hij?</button>` : '') + '</div>';
  return `<div class="gar-stage"><canvas aria-label="3D-model van ${esc(e.model)}"></canvas><span class="gar-hint">Sleep om te draaien</span></div>` +
    `<div class="pm-pane-top"><span class="m-eb">${esc([e.make, GROUP_LABEL[groupOf(e)]].filter(Boolean).join(' · '))}</span><h2 class="m-h2 td-h2">${esc(e.model)}</h2></div>` +
    (e.meme ? `<p class="mut">${esc(e.meme)}</p>` : '') +
    `<div class="m-facts td-stack">${rows.map(([k, v]) => `<div class="m-fact"><span>${k}</span><span class="${String(v).length > 13 ? 'td-fv' : 'm-num'}">${v}</span></div>`).join('')}</div>` +
    `<p class="gar-msg g" role="status">${esc(msg || '')}</p><span class="m-grow"></span>` + acts;
}

// Shows vehicle `id` in the viewer (pausemenu.js: a click or Enter on a
// row). The viewer draws through the shared renderer: switching rows only
// swaps the model.
export function selectGarageVehicle(el, id, msg = '') {
  const e = lastList.find((x) => x.id === id);
  const box = el.querySelector('.gar-viewer');
  if (!e || !box) return;
  selected = id;
  for (const c of el.querySelectorAll('.gar-card')) { const on = c.dataset.garageSelect === id; c.classList.toggle('sel', on); c.toggleAttribute('aria-current', on); }
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

function tabsHtml(list) {
  const sort = (SORTS.find(([id]) => id === view.sort) || SORTS[0])[1];
  const filt = (FILTERS.find(([id]) => id === view.filter) || FILTERS[0])[1];
  return '<nav class="m-tablist" role="tablist" aria-label="Soort voertuig">' +
    garageTabCounts(list).map((t) => `<button type="button" role="tab" class="m-tab" data-garage-cat="${t.id}" aria-selected="${view.cat === t.id}">${esc(t.label)}<small>${t.owned}</small></button>`).join('') + '</nav><span class="m-grow"></span>' +
    `<button type="button" class="m-bt" data-garage-filter>Toon: ${filt}</button>` +
    `<button type="button" class="m-bt" data-garage-sort>${sort}</button>`;
}

function listHtml(list) {
  const shown = shownList(list);
  if (!shown.length) return '<p class="m-note">Niks in deze selectie. Kies een andere soort of toon alles.</p>';
  let out = '';
  for (const { group, items } of garageSections(shown)) out += `<div class="m-gh"><span>${GROUP_HEAD[group]}</span><span>${items.length}</span></div>${items.map(row).join('')}`;
  return out;
}

function pickShown(el) {
  const keepId = keepSelection(shownList(lastList), selected);
  if (keepId == null) { disposeGarageViewer(); const box = el.querySelector('.gar-viewer'); if (box) box.innerHTML = ''; return; }
  selectGarageVehicle(el, keepId);
}

function refreshList(el) {
  const tools = el.querySelector('.m-tabs');
  if (!tools || !el.querySelector('.gar-list')) return;
  tools.innerHTML = tabsHtml(lastList);
  el.querySelector('.gar-list').innerHTML = listHtml(lastList);
  pickShown(el);
}

function bindToolbar(el) {
  if (el.dataset.garBound) return;
  el.dataset.garBound = '1';
  el.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-garage-cat]');
    const s = ev.target.closest('[data-garage-sort]');
    const f = ev.target.closest('[data-garage-filter]');
    if (!c && !s && !f) return;
    if (c) view.cat = c.dataset.garageCat;
    if (s) view.sort = cycleOption(SORTS, view.sort);
    if (f) view.filter = cycleOption(FILTERS, view.filter);
    refreshList(el);
    const again = el.querySelector(c ? `[data-garage-cat="${view.cat}"]` : s ? '[data-garage-sort]' : '[data-garage-filter]');
    if (again) again.focus({ preventScroll: true });
  });
}

export function renderGaragePanel(el, world, msg = '') {
  bindToolbar(el);
  const list = getGarageCatalog(world);
  lastList = list;
  const owned = list.filter((e) => e.owned);
  el.dataset.sub = `${owned.length} van ${list.length} voertuigen van jou`;
  el.innerHTML = `<div class="m-tabs">${tabsHtml(list)}</div>` +
    '<div class="m-main"><div class="m-list gar-list"></div><aside class="m-pane gar-viewer" aria-live="polite" aria-label="Details"></aside></div>';
  disposeGarageViewer();
  el.querySelector('.gar-list').innerHTML = listHtml(list);
  pickShown(el);
  if (msg && selected) selectGarageVehicle(el, selected, msg);
}
