import { saveGame } from './savegame.js';
import { createVehiclePreview } from './vehiclepreview.js';
import { shopIconUrl } from './shops.js';
import { hudPixelRatio } from './uiscale.js';

let root = null;
let world = null;
let shop = null;
let open = false;
let bought = false;
let storyBanner = null;
let storyDone = false;
// selecting (click, arrows) only shows an item; buying is the detail bar's
// button (or Enter on it), expensive items ask once more
let sel = null;
let armed = null;
const CONFIRM_FROM = 1000;
const CONFIRM_SHARE = 0.5;
const ARM_TIME = 4000;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function isShopOpen() {
  return open;
}

const SHOP_CSS = `
  #shop-menu {
    position: fixed; inset: 0; z-index: 41; display: none; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at center, rgba(23,48,31,0.78) 0%, rgba(12,20,14,0.92) 75%);
    font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; padding: 16px; box-sizing: border-box;
  }
  #shop-menu.visible { display: flex; }
  #shop-menu .sm-panel {
    zoom: var(--ui, 1);
    width: min(680px, calc(100vw / var(--ui, 1) - 32px)); max-height: min(820px, calc(100vh / var(--ui, 1) - 32px)); display: flex; flex-direction: column;
    background: rgba(12,20,14,0.96); border: 1px solid rgba(63,201,122,0.35); border-top: 4px solid var(--shop, #1e9e56);
    border-radius: 6px; box-shadow: 0 18px 60px rgba(0,0,0,0.55); overflow: hidden;
    animation: sm-in 0.18s ease-out;
  }
  @keyframes sm-in { from { transform: translateY(10px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
  #shop-menu .sm-head { display: flex; align-items: center; gap: 14px; padding: 14px 18px 12px; border-bottom: 1px solid rgba(63,201,122,0.25);
    background: linear-gradient(180deg, color-mix(in srgb, var(--shop) 28%, transparent) 0%, transparent 100%); }
  #shop-menu .sm-icon { width: 46px; height: 46px; flex: 0 0 46px; }
  #shop-menu .sm-title { flex: 1; min-width: 0; }
  #shop-menu h1 { margin: 0; font-size: 34px; line-height: 1; letter-spacing: 2px; font-weight: normal; }
  #shop-menu .sm-tag { margin: 3px 0 0; font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); letter-spacing: 0.3px; }
  #shop-menu .sm-money { font-size: 28px; letter-spacing: 1px; color: #3fc97a; white-space: nowrap; }
  #shop-menu .sm-money.pay { animation: sm-pay 0.5s ease-out; }
  @keyframes sm-pay { 0% { color: #d93f3f; transform: scale(1.12); } 100% { color: #3fc97a; transform: none; } }
  #shop-menu .sm-list { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 12px 10px; scrollbar-width: thin; scrollbar-color: rgba(63,201,122,0.5) transparent; }
  #shop-menu h2 { margin: 12px 6px 6px; font-size: 19px; letter-spacing: 1.5px; color: #3fc97a; font-weight: normal; }
  #shop-menu .sm-note { margin: -4px 6px 8px; font: 13px 'Arial Narrow', Arial, sans-serif; color: #e8c93a; }
  #shop-menu .sm-item {
    display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 12px; width: 100%;
    margin: 0 0 4px; padding: 7px 10px; box-sizing: border-box; text-align: left; cursor: pointer;
    background: rgba(30,158,86,0.07); border: 1px solid rgba(63,201,122,0.18); border-left: 4px solid transparent; border-radius: 4px;
    color: inherit; font: inherit;
  }
  #shop-menu .sm-item:hover, #shop-menu .sm-item:focus-visible, #shop-menu .sm-item:focus {
    outline: none; border-color: rgba(63,201,122,0.7); border-left-color: var(--shop); background: rgba(30,158,86,0.22);
  }
  #shop-menu .sm-item[aria-disabled="true"] { cursor: default; }
  #shop-menu .sm-item[aria-disabled="true"] .sm-txt, #shop-menu .sm-item[aria-disabled="true"] .sm-sw { opacity: 0.5; }
  #shop-menu .sm-sw { display: flex; gap: 2px; justify-content: center; align-items: center; height: 32px; }
  #shop-menu .sm-sw i { width: 12px; height: 28px; border-radius: 3px; border: 1px solid rgba(240,237,228,0.35); }
  #shop-menu .sm-sw i:only-child { width: 28px; border-radius: 50%; height: 28px; }
  #shop-menu .sm-sw img { width: 30px; height: 30px; }
  #shop-menu .sm-txt { display: flex; flex-direction: column; min-width: 0; }
  #shop-menu .sm-txt b { font-weight: normal; font-size: 21px; letter-spacing: 1px; line-height: 1.05; }
  #shop-menu .sm-txt small { font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.62); letter-spacing: 0.2px; }
  #shop-menu .sm-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap; }
  #shop-menu .sm-price b { font-weight: normal; font-size: 22px; letter-spacing: 1px; color: #f0ede4; }
  #shop-menu .sm-price b.free { color: #3fc97a; }
  #shop-menu .sm-price small { font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.55); }
  #shop-menu .sm-price small.no { color: #d98a3f; }
  #shop-menu .sm-chip { font-size: 13px; letter-spacing: 1px; padding: 1px 6px; border-radius: 3px; border: 1px solid #3fc97a; color: #3fc97a; }
  #shop-menu .sm-status { min-height: 26px; line-height: 1.15; padding: 6px 18px; font-size: 20px; letter-spacing: 1px; text-align: center; color: #3fc97a; border-top: 1px solid rgba(63,201,122,0.2); }
  #shop-menu .sm-status[data-tone="lose"] { color: rgba(240,237,228,0.7); }
  #shop-menu .sm-status[data-tone="no"] { color: #d98a3f; }
  #shop-menu .sm-status[data-tone="win"] { color: #e8c93a; }
  #shop-menu .sm-status[data-tone="jackpot"] { color: #e8c93a; animation: sm-jackpot 0.4s ease-in-out 4 alternate; }
  #shop-menu .sm-status.pop { animation: sm-pop 0.28s ease-out; }
  @keyframes sm-pop { from { transform: scale(1.15); } to { transform: none; } }
  @keyframes sm-jackpot { from { transform: scale(1); text-shadow: none; } to { transform: scale(1.18); text-shadow: 0 0 14px rgba(232,201,58,0.7); } }
  #shop-menu .sm-foot { display: flex; justify-content: space-between; gap: 12px; padding: 8px 18px 12px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
  #shop-menu .sm-foot b { display: inline-block; min-width: 12px; padding: 1px 5px; border: 1px solid rgba(240,237,228,0.45); border-bottom-width: 2px; border-radius: 4px; color: #3fc97a; font: bold 11px/1.2 system-ui, sans-serif; text-align: center; }
  #shop-menu .sm-close { background: transparent; border: 1px solid rgba(63,201,122,0.6); color: #f0ede4; border-radius: 4px; padding: 3px 12px; font: 16px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; cursor: pointer; }
  #shop-menu .sm-close:hover, #shop-menu .sm-close:focus-visible { border-color: #3fc97a; color: #3fc97a; outline: none; }
  #shop-menu .sm-empty { padding: 20px; text-align: center; font: 15px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
  #shop-menu .sm-stage { display: none; position: relative; flex: 0 0 auto; height: 184px; border-bottom: 1px solid rgba(63,201,122,0.25);
    background: radial-gradient(ellipse at 38% 72%, color-mix(in srgb, var(--shop) 30%, transparent) 0%, rgba(12,20,14,0) 68%); }
  #shop-menu .sm-stage.on { display: flex; }
  #shop-menu .sm-preview { display: none; flex: 1; min-width: 0; height: 100%; cursor: grab; touch-action: none; }
  #shop-menu .sm-preview.on { display: block; }
  #shop-menu .sm-preview:active { cursor: grabbing; }
  #shop-menu .sm-stats { flex: 0 0 250px; display: flex; flex-direction: column; justify-content: center; gap: 7px; padding: 10px 18px 10px 4px; box-sizing: border-box; }
  #shop-menu .sm-stats:empty { display: none; }
  #shop-menu .sm-preview:not(.on) + .sm-stats { flex: 1; padding-left: 18px; }
  #shop-menu .sm-stat { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.8); }
  #shop-menu .sm-stat small { font-size: 12px; color: rgba(240,237,228,0.6); text-align: right; white-space: nowrap; }
  #shop-menu .sm-bar { grid-column: 1 / -1; position: relative; height: 7px; border-radius: 4px; background: rgba(240,237,228,0.12); overflow: hidden; }
  #shop-menu .sm-bar b, #shop-menu .sm-bar em { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 4px; transition: width 0.25s ease-out, left 0.25s ease-out; }
  #shop-menu .sm-bar b { background: var(--shop); filter: brightness(1.25); }
  #shop-menu .sm-bar em { background: #3fc97a; box-shadow: 0 0 6px rgba(63,201,122,0.8); animation: sm-gain 1.2s ease-in-out infinite alternate; }
  #shop-menu .sm-bar em.down { background: #d98a3f; box-shadow: none; }
  @keyframes sm-gain { from { opacity: 0.55; } to { opacity: 1; } }
  #shop-menu .sm-scratch { display: none; position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; }
  #shop-menu .sm-scratch.on { display: block; }
  #shop-menu .sm-effect { display: inline-block; margin-top: 4px; align-self: flex-start; font: 14px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; padding: 1px 8px; border-radius: 3px; color: #0c140e; background: #3fc97a; }
  #shop-menu .sm-effect:empty { display: none; }
  @media (max-width: 520px) { #shop-menu .sm-stage { height: auto; flex-direction: column; } #shop-menu .sm-preview { flex: 0 0 120px; height: 120px; } #shop-menu .sm-stats { flex: 0 0 auto; padding: 4px 16px 10px; } }
  #shop-menu .sm-item.sel { border-color: rgba(63,201,122,0.85); border-left-color: var(--shop); background: rgba(30,158,86,0.28); }
  #shop-menu .sm-detail { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 6px 14px; padding: 10px 18px; border-top: 1px solid rgba(63,201,122,0.25); background: rgba(23,48,31,0.55); }
  #shop-menu .sm-detail[hidden] { display: none; }
  #shop-menu .sm-dtxt { min-width: 0; display: flex; flex-direction: column; }
  #shop-menu .sm-dtxt b { font-weight: normal; font-size: 24px; letter-spacing: 1px; line-height: 1.05; }
  #shop-menu .sm-dtxt small { font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.75); line-height: 1.3; }
  #shop-menu .sm-buy { min-width: 190px; padding: 9px 18px 7px; border: 0; border-bottom: 3px solid #0f5c30; border-radius: 4px; cursor: pointer;
    font: 22px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; color: #0c140e; background: #1e9e56; white-space: nowrap; }
  #shop-menu .sm-buy:hover, #shop-menu .sm-buy:focus-visible, #shop-menu .sm-buy:focus { outline: none; background: #3fc97a; box-shadow: 0 0 0 2px rgba(240,237,228,0.8); }
  #shop-menu .sm-buy.armed { background: #e8c93a; border-bottom-color: #9b8420; animation: sm-pop 0.28s ease-out; }
  #shop-menu .sm-buy[aria-disabled="true"] { cursor: default; color: #f0ede4; background: #4a4f47; border-bottom-color: #2a2e28; }
  #shop-menu .sm-buy[aria-disabled="true"]:focus { background: #5a6056; }
  @media (max-width: 520px) { #shop-menu .sm-detail { grid-template-columns: 1fr; } #shop-menu .sm-buy { width: 100%; } }
  @media (max-width: 520px) { #shop-menu h1 { font-size: 26px; } #shop-menu .sm-tag { display: none; } #shop-menu .sm-item { grid-template-columns: 30px 1fr auto; gap: 8px; } #shop-menu .sm-foot span { display: none; } }
  #shop-menu .sm-story { display: grid; grid-template-columns: 34px 1fr; gap: 2px 12px; align-items: center; padding: 10px 18px; border-bottom: 1px solid rgba(232,201,58,0.45);
    background: linear-gradient(90deg, rgba(232,201,58,0.26) 0%, rgba(232,201,58,0.08) 100%); box-shadow: inset 4px 0 0 #e8c93a; animation: sm-story 1.6s ease-in-out 3 alternate; }
  #shop-menu .sm-story[hidden] { display: none; }
  #shop-menu .sm-story i { grid-row: span 3; width: 34px; height: 34px; border-radius: 50%; background: #e8c93a; color: #0c140e; display: flex; align-items: center; justify-content: center; font: normal 24px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; }
  #shop-menu .sm-story b { font-weight: normal; font-size: 25px; letter-spacing: 1px; line-height: 1.05; color: #f5dc5c; }
  #shop-menu .sm-story span, #shop-menu .sm-story small { font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); line-height: 1.3; }
  #shop-menu .sm-story span:empty, #shop-menu .sm-story small:empty { display: none; }
  #shop-menu .sm-story small { color: #f5dc5c; }
  #shop-menu .sm-story.done { background: linear-gradient(90deg, rgba(63,201,122,0.3) 0%, rgba(63,201,122,0.08) 100%); box-shadow: inset 4px 0 0 #3fc97a; border-bottom-color: rgba(63,201,122,0.5); animation: sm-pop 0.28s ease-out; }
  #shop-menu .sm-story.done i { background: #3fc97a; }
  #shop-menu .sm-story.done b { color: #7fe0a8; }
  @keyframes sm-story { from { box-shadow: inset 4px 0 0 #e8c93a; } to { box-shadow: inset 4px 0 0 #e8c93a, inset 0 0 22px rgba(232,201,58,0.35); } }
  #shop-menu h2.story { color: #f5dc5c; }
  #shop-menu .sm-item.story-ok { border-color: rgba(232,201,58,0.55); border-left-color: #e8c93a; background: rgba(232,201,58,0.1); }
  #shop-menu .sm-item.story-ok:hover, #shop-menu .sm-item.story-ok:focus, #shop-menu .sm-item.story-ok.sel { border-color: #e8c93a; background: rgba(232,201,58,0.22); }
  #shop-menu .sm-item.story-ok .sm-chip { border-color: #e8c93a; color: #0c140e; background: #e8c93a; }
  #shop-menu .sm-item.story-no .sm-txt small { color: rgba(217,138,63,0.9); }
  @media (prefers-reduced-motion: reduce) { #shop-menu .sm-story { animation: none !important; } }
  @media (prefers-reduced-motion: reduce) { #shop-menu .sm-panel, #shop-menu .sm-status, #shop-menu .sm-money { animation: none !important; } }
`;

export function initShopUi(w) {
  world = w;
  if (root) return;
  const style = document.createElement('style');
  style.textContent = SHOP_CSS;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.id = 'shop-menu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'shop-title');
  root.innerHTML = `
    <div class="sm-panel">
      <header class="sm-head">
        <img class="sm-icon" alt="">
        <div class="sm-title"><h1 id="shop-title"></h1><p class="sm-tag"></p></div>
        <div class="sm-money" aria-label="Jouw geld"></div>
      </header>
      <div class="sm-story" role="note" hidden><i aria-hidden="true">!</i><b></b><span></span><small></small></div>
      <div class="sm-stage"><canvas class="sm-preview" aria-hidden="true"></canvas><div class="sm-stats" aria-label="Eigenschappen"></div><canvas class="sm-scratch" aria-hidden="true"></canvas></div>
      <div class="sm-list"></div>
      <div class="sm-detail" hidden><div class="sm-dtxt"><b></b><small></small><span class="sm-effect"></span></div><button type="button" class="sm-buy"></button></div>
      <div class="sm-status" role="status" aria-live="polite"></div>
      <footer class="sm-foot"><span><b>↑</b> <b>↓</b> bekijken · <b>ENTER</b> naar de knop, nog eens <b>ENTER</b> kopen · slepen draait</span><button type="button" class="sm-close">Esc · Weglopen</button></footer>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', onClick);
  root.addEventListener('focusin', onFocus);
  // the game's wheel handler (input.js) cancels scrolling page-wide
  root.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
  // registered before the phone/pause menu so an open shop gets keys first
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', (e) => { if (open && e.key === ' ') e.preventDefault(); }, true);
}

export function openShopMenu(w, s) {
  world = w;
  shop = s;
  open = true;
  bought = false;
  storyBanner = null;
  storyDone = false;
  sel = null;
  armed = null;
  if (document.pointerLockElement) document.exitPointerLock();
  if (world.input) world.input.reset();
  const panel = root.querySelector('.sm-panel');
  panel.style.setProperty('--shop', s.color);
  root.querySelector('#shop-title').textContent = s.name;
  root.querySelector('.sm-tag').textContent = s.tagline || '';
  root.querySelector('.sm-icon').src = s.icon || shopIconUrl(s.type, 92);
  setStatus('', '');
  root.classList.add('visible');
  document.body.classList.add('shop-open');
  render();
  const first = root.querySelector('.sm-item.story-ok') || root.querySelector('.sm-item:not([aria-disabled="true"])') || root.querySelector('.sm-item') || root.querySelector('.sm-close');
  if (first) first.focus({ preventScroll: true });
  if (first && first.dataset.id) select(first.dataset.id);
  else renderDetail();
}

export function closeShopMenu() {
  if (!open) return;
  open = false;
  finishScratch(false);
  setPreview(null);
  root.classList.remove('visible');
  document.body.classList.remove('shop-open');
  if (world && world.input) world.input.reset();
  if (bought && world) saveGame(world);
  if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
}

function currentItems() {
  const out = [];
  for (const sec of shop.sections()) for (const it of sec.items) out.push(it);
  return out;
}

function priceHtml(it) {
  const chip = it.tag ? `<span class="sm-chip">${esc(it.tag)}</span>` : '';
  // it.plain: a choice, not a product (the dorpsquiz answers): no price badge
  const price = it.plain ? '' : it.income > 0 ? `<b class="free">+€${it.income}</b>` : it.price > 0 ? `<b>€${it.price}</b>` : it.disabled ? '' : '<b class="free">Gratis</b>';
  const reason = it.disabled ? `<small class="no">${esc(it.disabled)}</small>` : '';
  return chip + (it.disabled && it.tag ? '' : price) + reason;
}

function swatchHtml(it) {
  if (it.swatch && it.swatch.length) return it.swatch.map((c) => `<i style="background:${esc(c)}"></i>`).join('');
  return `<img src="${shop.icon || shopIconUrl(shop.type, 60)}" alt="">`;
}

function render() {
  const focusedId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  const money = Math.max(0, Math.floor(world.money));
  root.querySelector('.sm-money').textContent = '€' + money.toLocaleString('nl-NL');
  const view = shop.view ? shop.view() : { sections: shop.sections(), banner: null };
  const sections = view.sections;
  if (view.banner) storyBanner = view.banner;
  renderStory();
  const list = root.querySelector('.sm-list');
  if (!sections.length) {
    list.innerHTML = '<p class="sm-empty">Hier valt niks te halen.</p>';
    return;
  }
  list.innerHTML = sections.map((sec) => `
    <h2${sec.story ? ' class="story"' : ''}>${esc(sec.title)}</h2>
    ${sec.note ? `<p class="sm-note">${esc(sec.note)}</p>` : ''}
    ${sec.items.map((it) => `
      <button type="button" class="sm-item${it.story ? ' story-' + it.story : ''}" data-id="${esc(it.id)}" aria-disabled="${it.disabled ? 'true' : 'false'}">
        <span class="sm-sw">${swatchHtml(it)}</span>
        <span class="sm-txt"><b>${esc(it.label)}</b><small>${esc(it.desc || '')}</small></span>
        <span class="sm-price">${priceHtml(it)}</span>
      </button>`).join('')}`).join('');
  if (focusedId) {
    const el = list.querySelector(`[data-id="${CSS.escape(focusedId)}"]`);
    if (el) el.focus({ preventScroll: true });
  }
  markSelected();
  renderDetail();
}

function renderStory() {
  const el = root.querySelector('.sm-story');
  el.hidden = !storyBanner;
  if (!storyBanner) return;
  el.classList.toggle('done', storyDone);
  el.querySelector('i').textContent = storyDone ? '✓' : '!';
  el.querySelector('b').textContent = storyDone ? 'Gelukt! Terug naar het verhaal' : storyBanner.title;
  el.querySelector('span').textContent = storyDone ? 'Druk Esc en volg de route naar de volgende stap.' : [storyBanner.why, storyBanner.lead].filter(Boolean).join(' ');
  el.querySelector('small').textContent = storyDone ? '' : storyBanner.voorschot || '';
}

function markSelected() {
  for (const el of root.querySelectorAll('.sm-item')) el.classList.toggle('sel', el.dataset.id === sel);
}

function needsConfirm(it) {
  return !!it.confirmText || it.price >= CONFIRM_FROM || (it.price >= 300 && it.price > world.money * CONFIRM_SHARE);
}

function buyLabel(it) {
  if (it.disabled) return it.disabled;
  const verb = it.verb || (shop.type === 'tuning' ? 'Betalen' : 'Kopen voor');
  if (armed && armed.id === it.id && Date.now() < armed.until) return `Zeker? Nog eens: €${it.price}`;
  if (it.income > 0) return `Verkopen voor €${it.income}`;
  if (it.price > 0) return `${verb} €${it.price}`;
  return it.verb || 'Kiezen';
}

function renderDetail() {
  const bar = root.querySelector('.sm-detail');
  const it = sel && currentItems().find((x) => x.id === sel);
  bar.hidden = !it;
  renderStats(it);
  if (!it) return;
  bar.querySelector('b').textContent = it.label;
  bar.querySelector('small').textContent = it.desc || '';
  bar.querySelector('.sm-effect').textContent = it.effect || '';
  const btn = bar.querySelector('.sm-buy');
  btn.textContent = buyLabel(it);
  btn.setAttribute('aria-disabled', it.disabled ? 'true' : 'false');
  btn.classList.toggle('armed', !!(armed && armed.id === it.id && Date.now() < armed.until));
}

function renderStats(it) {
  const box = root.querySelector('.sm-stats');
  const stats = (it && it.stats) || [];
  box.innerHTML = stats.map((st) => {
    const v = Math.round((st.v || 0) * 100);
    const to = st.to == null ? v : Math.round(st.to * 100);
    const lo = Math.min(v, to), hi = Math.max(v, to);
    const delta = hi > lo ? `<em class="${to < v ? 'down' : ''}" style="left:${lo}%;width:${hi - lo}%"></em>` : '';
    return `<div class="sm-stat"><span>${esc(st.label)}</span><small>${esc(st.text || '')}</small><span class="sm-bar"><b style="width:${lo}%"></b>${delta}</span></div>`;
  }).join('');
  syncStage();
}

function syncStage() {
  const stage = root.querySelector('.sm-stage');
  const on = root.querySelector('.sm-preview').classList.contains('on') || !!root.querySelector('.sm-stats').childElementCount || !!scratch;
  stage.classList.toggle('on', on);
}

function select(id) {
  if (sel !== id) { armed = null; finishScratch(true); }
  sel = id;
  const it = currentItems().find((x) => x.id === id);
  setPreview(it && it.preview ? it.preview : null);
  markSelected();
  renderDetail();
}

function setStatus(text, tone) {
  const el = root.querySelector('.sm-status');
  el.textContent = text;
  el.dataset.tone = tone || '';
  el.classList.remove('pop');
  void el.offsetWidth;
  if (text) el.classList.add('pop');
}

function activate(id) {
  const it = currentItems().find((x) => x.id === id);
  if (!it) return;
  if (it.disabled) {
    setStatus(it.disabled === 'Te weinig geld' ? 'Te weinig geld. Bijverdienen? Kijk in je telefoon onder Te doen › Dichtbij' : it.disabled, 'no');
    return;
  }
  if (needsConfirm(it) && !(armed && armed.id === id && Date.now() < armed.until)) {
    armed = { id, until: Date.now() + ARM_TIME };
    setStatus(it.confirmText || `${it.label}: €${it.price}. Druk nog een keer om te kopen`, it.confirmText ? 'no' : 'win');
    renderDetail();
    setTimeout(() => { if (open && armed && armed.id === id && Date.now() >= armed.until) { armed = null; renderDetail(); } }, ARM_TIME + 50);
    return;
  }
  armed = null;
  const before = world.money;
  const res = it.buy();
  if (res == null) {
    setStatus('Te weinig geld', 'no');
    return;
  }
  bought = true;
  if (shop.onBought) shop.onBought(it);
  let r = typeof res === 'string' ? { text: res, tone: '' } : res;
  if (it.story === 'ok') {
    storyDone = true;
    r = { ...r, text: `${String(r.text).replace(/[.!]+$/, '')}. Dit telt voor je missie!`, tone: 'win' };
  }
  if (it.reveal && root.querySelector('.sm-stage')) {
    setStatus('Krassen…', '');
    playScratch(it.reveal, r, () => setStatus(r.text, r.tone));
  } else {
    setStatus(r.text, r.tone);
  }
  render();
  if (world.money < before) {
    const m = root.querySelector('.sm-money');
    m.classList.remove('pay');
    void m.offsetWidth;
    m.classList.add('pay');
  }
}

// --- rotating 3D preview of the focused vehicle (vehicle shops) -------------------

let preview = null;

function onFocus(e) {
  const btn = e.target.closest && e.target.closest('.sm-item');
  if (!btn || !shop) return;
  select(btn.dataset.id);
}

function setPreview(spec) {
  const canvas = root && root.querySelector('.sm-preview');
  if (!canvas) return;
  // one small renderer for every shop, reused; its model is freed on close
  if (!preview) preview = createVehiclePreview(canvas, { interactive: true, active: () => open, pixelRatio: () => Math.min(1.5, hudPixelRatio()) });
  preview.show(spec);
  syncStage();
}

// --- scratch card / lottery reveal ---------------------------------------------------

let scratch = null;
const SCRATCH_MS = 1150;
const SCRATCH_HOLD = 2600;

function finishScratch(hide) {
  if (!scratch) return;
  const sc = scratch;
  if (!sc.done) { sc.done = true; sc.onDone(); }
  if (hide) {
    cancelAnimationFrame(sc.raf);
    clearTimeout(sc.hideTimer);
    clearTimeout(sc.fallback);
    root.querySelector('.sm-scratch').classList.remove('on');
    scratch = null;
    syncStage();
  } else {
    sc.u = 1;
  }
}

function playScratch(look, res, onDone) {
  finishScratch(true);
  const cv = root.querySelector('.sm-scratch');
  const sc = { u: 0, done: false, raf: 0, hideTimer: 0, onDone, t0: performance.now() };
  scratch = sc;
  syncStage();
  cv.classList.add('on');
  const W = cv.clientWidth || 300, H = cv.clientHeight || 150, pr = Math.min(2, hudPixelRatio());
  cv.width = Math.round(W * pr);
  cv.height = Math.round(H * pr);
  const g = cv.getContext('2d');
  g.setTransform(pr, 0, 0, pr, 0, 0);
  const cw = Math.min(W - 24, 320), ch = Math.min(H - 20, 150);
  const x0 = (W - cw) / 2, y0 = (H - ch) / 2;
  const win = { x: x0 + 16, y: y0 + 44, w: cw - 32, h: ch - 60 };
  const coat = document.createElement('canvas');
  coat.width = cv.width;
  coat.height = cv.height;
  const cg = coat.getContext('2d');
  cg.setTransform(pr, 0, 0, pr, 0, 0);
  const grad = cg.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);
  grad.addColorStop(0, '#b8bec4'); grad.addColorStop(0.5, '#e4e8ec'); grad.addColorStop(1, '#9aa2a8');
  cg.fillStyle = grad;
  cg.fillRect(win.x, win.y, win.w, win.h);
  cg.fillStyle = 'rgba(80,86,92,0.55)';
  cg.font = "bold 22px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
  cg.textAlign = 'center';
  cg.textBaseline = 'middle';
  cg.fillText('KRAS HIER  ✦  KRAS HIER', win.x + win.w / 2, win.y + win.h / 2);
  cg.globalCompositeOperation = 'destination-out';
  const prize = res.prize || 0;
  const big = res.tone === 'jackpot';
  const rows = 4;
  let erased = 0;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // zigzag strokes over the window; the coin follows u
  const pathAt = (u) => {
    const t = u * rows, row = Math.min(rows - 1, Math.floor(t)), f = t - row;
    const x = win.x + 6 + (row % 2 ? 1 - f : f) * (win.w - 12);
    return [x, win.y + 8 + (row + 0.5) * ((win.h - 16) / rows)];
  };
  const draw = (now) => {
    sc.u = reduce ? 1 : Math.max(sc.u, Math.min(1, (now - sc.t0) / SCRATCH_MS));
    const steps = Math.ceil(sc.u * 160);
    for (; erased < steps; erased++) {
      const [x, y] = pathAt(erased / 160);
      cg.beginPath();
      cg.arc(x, y, (win.h - 16) / rows * 0.95, 0, Math.PI * 2);
      cg.fill();
    }
    if (sc.u >= 1) cg.fillRect(win.x, win.y, win.w, win.h);
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x0 + 4, y0 + 6, cw, ch);
    g.fillStyle = look.bg || '#c23f78';
    g.beginPath();
    g.roundRect ? g.roundRect(x0, y0, cw, ch, 8) : g.rect(x0, y0, cw, ch);
    g.fill();
    g.fillStyle = '#f0ede4';
    g.font = "24px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(look.title || 'KRASLOT', x0 + cw / 2, y0 + 24);
    g.fillStyle = prize ? '#fff6c8' : '#e8e2d4';
    g.fillRect(win.x, win.y, win.w, win.h);
    g.fillStyle = prize ? (big ? '#c8261e' : '#1e7a44') : '#6a6f66';
    g.font = `${big ? 44 : 38}px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif`;
    g.fillText(prize ? `€${prize}` : 'HELAAS', win.x + win.w / 2, win.y + win.h / 2 + 2);
    g.drawImage(coat, 0, 0, W, H);
    if (sc.u < 1) {
      const [cx, cy] = pathAt(sc.u);
      g.fillStyle = '#d8b040';
      g.beginPath(); g.arc(cx + 10, cy - 8, 11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#9b7a20'; g.lineWidth = 2; g.stroke();
      sc.raf = requestAnimationFrame(draw);
      return;
    }
    sc.raf = 0;
    if (!sc.done) { sc.done = true; sc.onDone(); }
    if (!sc.hideTimer) sc.hideTimer = setTimeout(() => { if (scratch === sc) finishScratch(true); }, SCRATCH_HOLD);
  };
  sc.raf = requestAnimationFrame(draw);
  // the result never waits on frames (hidden window, throttled rAF)
  sc.fallback = setTimeout(() => { if (!sc.done) { sc.done = true; sc.onDone(); } }, SCRATCH_MS + 300);
  sc.redraw = () => { if (!sc.raf) sc.raf = requestAnimationFrame(draw); };
}

function onClick(e) {
  if (e.target === root) { closeShopMenu(); return; }
  if (e.target.closest('.sm-scratch')) { if (scratch && scratch.u < 1) { finishScratch(false); scratch.redraw(); } else finishScratch(true); return; }
  if (e.target.closest('.sm-close')) { closeShopMenu(); return; }
  if (e.target.closest('.sm-buy')) { if (sel) activate(sel); return; }
  const btn = e.target.closest('.sm-item');
  if (btn) { btn.focus({ preventScroll: true }); select(btn.dataset.id); }
}

function move(dir) {
  const items = [...root.querySelectorAll('.sm-item')];
  if (!items.length) return;
  const cur = document.activeElement && document.activeElement.classList.contains('sm-buy') ? items.find((el) => el.dataset.id === sel) : document.activeElement;
  const i = items.indexOf(cur);
  const next = items[i < 0 ? 0 : (i + dir + items.length) % items.length];
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest' });
  select(next.dataset.id);
}

function onKey(e) {
  if (!open) return;
  if (e.metaKey || e.ctrlKey) return;
  e.stopImmediatePropagation();
  const k = e.key;
  const lower = k.length === 1 ? k.toLowerCase() : k;
  if (k === 'Tab') return;
  e.preventDefault();
  if (e.repeat && !k.startsWith('Arrow') && lower !== 'w' && lower !== 's') return;
  if (k === 'Escape' || k === 'Backspace' || lower === 'q') closeShopMenu();
  else if (k === 'ArrowUp' || lower === 'w') move(-1);
  else if (k === 'ArrowDown' || lower === 's') move(1);
  else if (k === 'Enter' || k === ' ' || lower === 'e' || lower === 'f') {
    const a = document.activeElement;
    if (a && a.classList.contains('sm-close')) closeShopMenu();
    else if (a && a.classList.contains('sm-buy')) { if (sel) activate(sel); }
    else if (a && a.classList.contains('sm-item')) { select(a.dataset.id); root.querySelector('.sm-buy').focus({ preventScroll: true }); }
  }
}
