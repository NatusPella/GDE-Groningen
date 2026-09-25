import { saveGame } from './savegame.js';
import { shopIconUrl } from './shops.js';

let root = null;
let world = null;
let shop = null;
let open = false;
let bought = false;

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
    width: min(640px, 100%); max-height: min(760px, 100%); display: flex; flex-direction: column;
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
  #shop-menu .sm-status { min-height: 26px; line-height: 26px; padding: 6px 18px; font-size: 20px; letter-spacing: 1px; text-align: center; color: #3fc97a; border-top: 1px solid rgba(63,201,122,0.2); }
  #shop-menu .sm-status[data-tone="lose"] { color: rgba(240,237,228,0.7); }
  #shop-menu .sm-status[data-tone="no"] { color: #d98a3f; }
  #shop-menu .sm-status[data-tone="win"] { color: #e8c93a; }
  #shop-menu .sm-status[data-tone="jackpot"] { color: #e8c93a; animation: sm-jackpot 0.4s ease-in-out 4 alternate; }
  #shop-menu .sm-status.pop { animation: sm-pop 0.28s ease-out; }
  @keyframes sm-pop { from { transform: scale(1.15); } to { transform: none; } }
  @keyframes sm-jackpot { from { transform: scale(1); text-shadow: none; } to { transform: scale(1.18); text-shadow: 0 0 14px rgba(232,201,58,0.7); } }
  #shop-menu .sm-foot { display: flex; justify-content: space-between; gap: 12px; padding: 8px 18px 12px; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
  #shop-menu .sm-foot b { color: #3fc97a; font-weight: normal; }
  #shop-menu .sm-close { background: transparent; border: 1px solid rgba(63,201,122,0.6); color: #f0ede4; border-radius: 4px; padding: 3px 12px; font: 16px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; cursor: pointer; }
  #shop-menu .sm-close:hover, #shop-menu .sm-close:focus-visible { border-color: #3fc97a; color: #3fc97a; outline: none; }
  #shop-menu .sm-empty { padding: 20px; text-align: center; font: 15px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.7); }
  @media (max-width: 520px) { #shop-menu h1 { font-size: 26px; } #shop-menu .sm-tag { display: none; } #shop-menu .sm-item { grid-template-columns: 30px 1fr auto; gap: 8px; } #shop-menu .sm-foot span { display: none; } }
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
      <div class="sm-list"></div>
      <div class="sm-status" role="status" aria-live="polite"></div>
      <footer class="sm-foot"><span><b>↑ ↓</b> kiezen · <b>Enter</b> kopen</span><button type="button" class="sm-close">Esc · Weglopen</button></footer>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', onClick);
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
  if (document.pointerLockElement) document.exitPointerLock();
  if (world.input) world.input.reset();
  const panel = root.querySelector('.sm-panel');
  panel.style.setProperty('--shop', s.color);
  root.querySelector('#shop-title').textContent = s.name;
  root.querySelector('.sm-tag').textContent = s.tagline || '';
  root.querySelector('.sm-icon').src = shopIconUrl(s.type, 92);
  setStatus('', '');
  root.classList.add('visible');
  render();
  const first = root.querySelector('.sm-item:not([aria-disabled="true"])') || root.querySelector('.sm-item') || root.querySelector('.sm-close');
  if (first) first.focus({ preventScroll: true });
}

export function closeShopMenu() {
  if (!open) return;
  open = false;
  root.classList.remove('visible');
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
  const price = it.price > 0 ? `<b>€${it.price}</b>` : '<b class="free">Gratis</b>';
  const reason = it.disabled ? `<small class="no">${esc(it.disabled)}</small>` : '';
  return chip + (it.disabled && it.tag ? '' : price) + reason;
}

function swatchHtml(it) {
  if (it.swatch && it.swatch.length) return it.swatch.map((c) => `<i style="background:${esc(c)}"></i>`).join('');
  return `<img src="${shopIconUrl(shop.type, 60)}" alt="">`;
}

function render() {
  const focusedId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  const money = Math.max(0, Math.floor(world.money));
  root.querySelector('.sm-money').textContent = '€' + money.toLocaleString('nl-NL');
  const sections = shop.sections();
  const list = root.querySelector('.sm-list');
  if (!sections.length) {
    list.innerHTML = '<p class="sm-empty">Hier valt niks te halen.</p>';
    return;
  }
  list.innerHTML = sections.map((sec) => `
    <h2>${esc(sec.title)}</h2>
    ${sec.note ? `<p class="sm-note">${esc(sec.note)}</p>` : ''}
    ${sec.items.map((it) => `
      <button type="button" class="sm-item" data-id="${esc(it.id)}" aria-disabled="${it.disabled ? 'true' : 'false'}">
        <span class="sm-sw">${swatchHtml(it)}</span>
        <span class="sm-txt"><b>${esc(it.label)}</b><small>${esc(it.desc || '')}</small></span>
        <span class="sm-price">${priceHtml(it)}</span>
      </button>`).join('')}`).join('');
  if (focusedId) {
    const el = list.querySelector(`[data-id="${CSS.escape(focusedId)}"]`);
    if (el) el.focus({ preventScroll: true });
  }
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
    setStatus(it.disabled, 'no');
    return;
  }
  const before = world.money;
  const res = it.buy();
  if (res == null) {
    setStatus('Te weinig geld', 'no');
    return;
  }
  bought = true;
  const r = typeof res === 'string' ? { text: res, tone: '' } : res;
  setStatus(r.text, r.tone);
  render();
  if (world.money < before) {
    const m = root.querySelector('.sm-money');
    m.classList.remove('pay');
    void m.offsetWidth;
    m.classList.add('pay');
  }
}

function onClick(e) {
  if (e.target === root) { closeShopMenu(); return; }
  if (e.target.closest('.sm-close')) { closeShopMenu(); return; }
  const btn = e.target.closest('.sm-item');
  if (btn) activate(btn.dataset.id);
}

function move(dir) {
  const items = [...root.querySelectorAll('.sm-item')];
  if (!items.length) return;
  const i = items.indexOf(document.activeElement);
  const next = items[i < 0 ? 0 : (i + dir + items.length) % items.length];
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest' });
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
    else if (a && a.classList.contains('sm-item')) activate(a.dataset.id);
  }
}
