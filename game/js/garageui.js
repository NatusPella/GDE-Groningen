// Garage tab of the pause menu (and the styles of the phone's "Voertuigen"
// app): every owned vehicle as a card, plus the models still for sale.
import { getGarageCatalog, whereText } from './ownedvehicles.js';
import { createVehiclePreview } from './vehiclepreview.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const GLYPHS = {
  car: '<path d="M6 30l4-11a5 5 0 0 1 4.7-3.3h18.6A5 5 0 0 1 38 19l4 11h1.5a2.5 2.5 0 0 1 2.5 2.5V40h-5v3a3 3 0 0 1-6 0v-3H13v3a3 3 0 0 1-6 0v-3H2v-7.5A2.5 2.5 0 0 1 4.5 30zm6-1h24l-2.8-8.2a1.5 1.5 0 0 0-1.4-1h-15.6a1.5 1.5 0 0 0-1.4 1z"/><circle cx="10" cy="35" r="2.6" fill="#10180f"/><circle cx="38" cy="35" r="2.6" fill="#10180f"/>',
  bike: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="32" r="8"/><circle cx="37" cy="32" r="8"/><path d="M11 32l8-14h12l6 14M11 32h11l9-14M16 13h6M31 18l-2-6h5"/></g>',
  bus: '<path d="M4 12a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v22a2 2 0 0 1-2 2h-2v3a3 3 0 0 1-6 0v-3H14v3a3 3 0 0 1-6 0v-3H6a2 2 0 0 1-2-2zm4 2v8h8v-8zm11 0v8h8v-8zm11 0v8h9v-8z"/>',
  truck: '<path d="M2 12h26v22H2zM30 18h8l6 8v8h-14z"/><circle cx="10" cy="36" r="4"/><circle cx="36" cy="36" r="4"/><rect x="32" y="20" width="6" height="5" fill="#10180f"/>',
  boat: '<path d="M4 28h40l-6 10H10zM14 18h14v8H14zM30 14h3v12h-3z"/><path d="M6 42c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="currentColor" stroke-width="2"/>',
  scooter: '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="34" r="6"/><circle cx="38" cy="34" r="6"/><path d="M17 34h14l5-18h5M31 34l-3-9H15"/></g><path d="M14 22h13v5H12z"/>',
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
#pause-menu .pm-garage { width: min(1180px, calc(100% / var(--ui, 1))); }
#pause-menu .gar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
#pause-menu .gar-card { display: flex; flex-direction: column; gap: 6px; padding: 12px; border: 1px solid rgba(63,201,122,0.35); border-left: 4px solid #3fc97a; border-radius: 6px; background: rgba(15,92,48,0.18); }
#pause-menu .gar-card[data-status="lost"] { border-left-color: #c9412e; }
#pause-menu .gar-card[data-status="locked"] { opacity: 0.6; border-style: dashed; border-left-color: #e8c93a; background: rgba(0,0,0,0.2); }
#pause-menu .gar-card[data-status="locked"] .gar-status { color: #e8c93a; }
#pause-menu .gar-card[data-status="forsale"] { opacity: 0.55; border-style: dashed; border-left-style: solid; border-left-color: rgba(240,237,228,0.3); background: rgba(0,0,0,0.15); }
#pause-menu .gar-top { display: flex; gap: 10px; align-items: center; }
#pause-menu .gar-icon { flex: none; width: 54px; height: 54px; border-radius: 8px; display: grid; place-items: center; background: rgba(240,237,228,0.08); box-shadow: inset 0 0 0 1px rgba(240,237,228,0.12); }
#pause-menu .gar-icon svg { width: 44px; height: 44px; filter: drop-shadow(0 1px 0 rgba(0,0,0,0.6)); }
#pause-menu .gar-card[data-status="forsale"] .gar-icon svg { filter: grayscale(1); }
#pause-menu .gar-name { display: flex; flex-direction: column; min-width: 0; }
#pause-menu .gar-name small { font: 12px 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; text-transform: uppercase; color: rgba(240,237,228,0.55); }
#pause-menu .gar-name b { font-weight: normal; font-size: 22px; letter-spacing: 1px; line-height: 1.05; }
#pause-menu .gar-meme { margin: 0; font: italic 14px/1.35 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
#pause-menu .gar-stats { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 0; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
#pause-menu .gar-stats dt { color: rgba(240,237,228,0.5); }
#pause-menu .gar-stats dd { margin: 0; color: #f0ede4; display: flex; align-items: center; gap: 6px; }
#pause-menu .gar-bar { display: inline-block; width: 70px; height: 6px; border-radius: 3px; background: rgba(240,237,228,0.15); overflow: hidden; }
#pause-menu .gar-bar i { display: block; height: 100%; background: #3fc97a; }
#pause-menu .gar-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(240,237,228,0.5); flex: none; }
#pause-menu .gar-status { font: 13px 'Arial Narrow', Arial, sans-serif; color: #3fc97a; letter-spacing: 0.3px; }
#pause-menu .gar-card[data-status="far"] .gar-status, #pause-menu .gar-card[data-status="garage"] .gar-status { color: #e8c93a; }
#pause-menu .gar-card[data-status="lost"] .gar-status { color: #ff7a66; }
#pause-menu .gar-card[data-status="forsale"] .gar-status { color: rgba(240,237,228,0.7); }
#pause-menu .gar-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
#pause-menu .gar-actions button { flex: 1 1 auto; font: inherit; font-size: 16px; letter-spacing: 1px; padding: 6px 10px; border-radius: 4px; cursor: pointer; color: #f0ede4; background: rgba(30,158,86,0.25); border: 1px solid rgba(63,201,122,0.6); }
#pause-menu .gar-actions button:hover, #pause-menu .gar-actions button:focus-visible { background: rgba(30,158,86,0.5); outline: none; border-color: #3fc97a; }
#pause-menu .gar-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 400px); gap: 18px; align-items: start; }
#pause-menu .gar-list { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
#pause-menu .gar-card { cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.15s; }
#pause-menu .gar-card:hover, #pause-menu .gar-card:focus-visible { outline: none; border-color: #3fc97a; background: rgba(30,158,86,0.28); transform: translateY(-1px); }
#pause-menu .gar-card.sel { border-color: #3fc97a; box-shadow: 0 0 0 2px rgba(63,201,122,0.55), 0 8px 22px rgba(0,0,0,0.35); opacity: 1; }
#pause-menu .gar-viewer { position: sticky; top: 0; display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 10px;
  background: linear-gradient(180deg, rgba(23,48,31,0.9), rgba(12,20,14,0.92)); border: 1px solid rgba(63,201,122,0.35); box-shadow: 0 14px 34px rgba(0,0,0,0.45); }
#pause-menu .gar-stage { position: relative; height: 230px; border-radius: 8px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 72%, rgba(63,201,122,0.28) 0%, rgba(12,20,14,0) 68%), linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0)); }
#pause-menu .gar-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
#pause-menu .gar-stage canvas:active { cursor: grabbing; }
#pause-menu .gar-stage .gar-hint { position: absolute; left: 10px; bottom: 8px; font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.55); pointer-events: none; }
#pause-menu .gar-lock { position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 6px; padding: 4px 10px 3px; border-radius: 4px; font-size: 16px; letter-spacing: 1px; color: #0c140e; background: #e8c93a; }
#pause-menu .gar-lock.sale { background: #f0ede4; }
#pause-menu .gar-lock svg { width: 14px; height: 14px; fill: currentColor; }
#pause-menu .gar-viewer .gar-name b { font-size: 30px; }
#pause-menu .gar-viewer .gar-actions button { font-size: 18px; padding: 9px 12px; }
@media (max-width: 980px) { #pause-menu .gar-layout { grid-template-columns: 1fr; } #pause-menu .gar-viewer { position: static; order: -1; } }
#pause-menu .gar-note { margin: 0; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.6); }
#pause-menu .gar-msg { min-height: 1.3em; margin: 0; font: 14px 'Arial Narrow', Arial, sans-serif; color: #e8c93a; }
#hud .ph-swatch { flex: none; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(240,237,228,0.5); margin-right: 8px; }
#hud .ph-swatch.lg { width: 22px; height: 22px; }
#hud .ph-chip[data-status="lost"] { border-color: #c9412e; color: #ff7a66; }
#hud .ph-veh { padding: 8px 8px 10px; display: flex; flex-direction: column; gap: 6px; }
#hud .ph-veh-top { display: flex; align-items: center; }
#hud .ph-veh p { margin: 0; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 13px; line-height: 1.3; }
#hud .ph-veh-meme { font-style: italic; color: rgba(240,237,228,0.85); }
#hud .ph-veh-facts { color: rgba(240,237,228,0.6); }
#hud .ph-veh-msg { color: #e8c93a; }
`;
  document.head.appendChild(st);
}

export function initGarageStyles() {
  injectStyle();
}

function card(e) {
  const stats = [
    ['Type', esc(e.kindLabel)],
    ['Topsnelheid', `${e.topSpeed} km/u`],
    ['Trekkracht', `<span class="gar-bar"><i style="width:${e.accelScore * 10}%"></i></span>${e.accelScore}/10`],
    ['Lak', `<span class="gar-dot" style="background:${esc(e.color)}"></span>${esc(e.paint)}`],
  ];
  if (e.owned && e.kind !== 'boat') stats.push(['Upgrades', e.upgrades.length ? esc(e.upgrades.join(', ')) : `Nog niks: ${e.kind === 'bike' || e.kind === 'scooter' ? 'Spaak & Band' : 'Knal & Kolder Tuning'} helpt je graag`]);
  else if (e.locked) stats.push(['Vrijspelen', esc(e.unlockText)]);
  else if (!e.owned) stats.push(['Prijs', `€${e.price.toLocaleString('nl-NL')}`]);
  const where = whereText(e);
  const actions = !e.owned ? '' : `<div class="gar-actions">` +
    (e.status !== 'driving' ? `<button type="button" data-garage-deliver="${esc(e.id)}">Laten afleveren · ${esc(e.feeLabel)}</button>` : '') +
    (e.status === 'near' || e.status === 'far' ? `<button type="button" data-garage-find="${esc(e.id)}">Waar staat hij?</button>` : '') +
    `</div>`;
  return `<article class="gar-card" tabindex="0" data-garage-select="${esc(e.id)}" data-status="${e.status}">` +
    `<div class="gar-top"><span class="gar-icon">${vehicleGlyph(e.kind, e.color)}</span>` +
    `<span class="gar-name"><small>${esc(e.make || e.kindLabel)}</small><b>${esc(e.model)}</b></span></div>` +
    `<p class="gar-meme">${esc(e.meme)}</p>` +
    `<dl class="gar-stats">${stats.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` +
    `<div class="gar-status">${esc(e.statusLabel)}${where ? ' · ' + esc(where) : ''}</div>` +
    actions + `</article>`;
}

// --- viewer: the selected vehicle as a rotating model --------------------------

let viewer = null;
let selected = null;
let lastList = [];
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';

function previewSpec(e) {
  if (!e || !e.spec || !e.spec.model) return null;
  return { kind: e.spec.kind === 'scooter' ? 'scooter' : e.spec.kind, model: e.spec.model, color: e.color, nameIdx: e.spec.nameIdx || 0, flags: e.hero ? { isHeroCar: true } : e.spec.flags || null };
}

function viewerHtml(e) {
  const badge = e.locked ? `<span class="gar-lock">${LOCK}Op slot</span>` : !e.owned ? `<span class="gar-lock sale">Te koop · €${e.price.toLocaleString('nl-NL')}</span>` : '';
  const actions = !e.owned ? '' : '<div class="gar-actions">' +
    (e.status !== 'driving' ? `<button type="button" data-garage-deliver="${esc(e.id)}">Laten afleveren · ${esc(e.feeLabel)}</button>` : '') +
    (e.status === 'near' || e.status === 'far' ? `<button type="button" data-garage-find="${esc(e.id)}">Waar staat hij?</button>` : '') + '</div>';
  const facts = [e.kindLabel, `${e.topSpeed} km/u`, `trekkracht ${e.accelScore}/10`, e.paint, ...(e.upgrades || [])].filter(Boolean).join(' · ');
  return `<div class="gar-stage"><canvas aria-label="3D-model van ${esc(e.model)}"></canvas>${badge}<span class="gar-hint">Slepen: draaien · scrollen: zoomen</span></div>` +
    `<div class="gar-name"><small>${esc(e.make || e.kindLabel)}</small><b>${esc(e.model)}</b></div>` +
    `<p class="gar-meme">${esc(e.meme)}</p><p class="gar-note">${esc(facts)}</p>` +
    `<div class="gar-status">${esc(e.statusLabel)}${whereText(e) ? ' · ' + esc(whereText(e)) : ''}</div>` +
    (e.locked && e.unlockText ? `<p class="gar-note">Vrijspelen: ${esc(e.unlockText)}</p>` : '') + actions;
}

// Shows vehicle `id` in the viewer (pausemenu.js: a click or Enter on a card).
export function selectGarageVehicle(el, id) {
  const e = lastList.find((x) => x.id === id);
  const box = el.querySelector('.gar-viewer');
  if (!e || !box) return;
  selected = id;
  for (const c of el.querySelectorAll('.gar-card')) c.classList.toggle('sel', c.dataset.garageSelect === id);
  if (viewer) { viewer.dispose(); viewer = null; }
  box.innerHTML = viewerHtml(e);
  viewer = createVehiclePreview(box.querySelector('canvas'), { interactive: true, active: () => !!box.isConnected && box.offsetParent !== null });
  viewer.show(previewSpec(e));
}

// Frees the viewer's GL context (tab switched or menu closed).
export function disposeGarageViewer() {
  if (viewer) { viewer.dispose(); viewer = null; }
}

export function renderGaragePanel(el, world, msg = '') {
  injectStyle();
  const list = getGarageCatalog(world);
  lastList = list;
  const owned = list.filter((e) => e.owned);
  const sale = list.filter((e) => !e.owned && !e.locked);
  const locked = list.filter((e) => e.locked);
  el.innerHTML =
    `<h2>Garage <small>${owned.length} van ${list.length} verzameld</small></h2>` +
    `<p class="gar-note">Gekocht of vrijgespeeld is voorgoed van jou; gejat telt niet. Laat je voertuig afleveren en het staat om de hoek, buiten beeld. Ook via je telefoon (T).</p>` +
    `<p class="gar-msg" role="status">${esc(msg)}</p>` +
    '<div class="gar-layout"><div class="gar-list">' +
    `<div class="gar-grid">${owned.map(card).join('')}</div>` +
    (sale.length ? `<h2>Nog te koop <small>Ome Harm Occasions, Trap & Toeter en Bootje Huren</small></h2><div class="gar-grid">${sale.map(card).join('')}</div>` : '') +
    (locked.length ? `<h2>Vrij te spelen <small>via het verhaal en prestaties</small></h2><div class="gar-grid">${locked.map(card).join('')}</div>` : '') +
    '</div><aside class="gar-viewer" aria-live="polite"></aside></div>';
  const keep = selected && list.some((e) => e.id === selected) ? selected : list[0] && list[0].id;
  if (keep) selectGarageVehicle(el, keep);
}
