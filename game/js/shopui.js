import { saveGame } from './savehook.js';
import { createVehiclePreview } from './vehiclepreview.js';
import { shopIconUrl } from './shopicon.js';
import { hudPixelRatio } from './uiscale.js';
import { isPadActive, onPadChange } from './gamepad.js';
import { padGlyphInner } from './glyphs.js';
import { shopIconSvg } from './shopicons.js';
import {
  itemIcon, itemStatus, refusalMessage, needsConfirm as needsConfirmFor, buyLabel as buyLabelFor, shopTabs, tabSections, stepTab, keepTab,
  flatItems, keepItem, shortPerk,
} from './shoplist.js';

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
let tab = 'alles';
const ARM_TIME = 4000;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function isShopOpen() {
  return open;
}

export function initShopUi(w) {
  world = w;
  if (root) return;
  for (const css of ['menu.css', 'shopui.css']) {
    if (document.getElementById('style-' + css)) continue;
    const link = document.createElement('link');
    link.id = 'style-' + css;
    link.rel = 'stylesheet';
    link.href = new URL('./' + css, import.meta.url).href;
    document.head.appendChild(link);
  }
  root = document.createElement('div');
  root.id = 'shop-menu';
  root.className = 'gm';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'shop-title');
  root.innerHTML = `
    <div class="gm-stage">
    <section class="sm-panel m-panel" aria-labelledby="shop-title">
      <header class="m-head">
        <div><span class="sm-accent" aria-hidden="true"></span><span class="m-eb sm-tag"></span><h1 class="m-h1" id="shop-title"></h1><img class="sm-icon" alt=""></div>
        <div class="m-hr"><span class="mut">Op zak</span><span class="m-num sm-money" aria-label="Jouw geld"></span></div>
      </header>
      <nav class="m-tablist sm-tabs" role="tablist" aria-label="Afdeling" hidden></nav>
      <div class="sm-story" role="note" hidden><i aria-hidden="true">!</i><b></b><span></span><small></small></div>
      <div class="m-main sm-main">
        <div class="m-list sm-list"></div>
        <aside class="m-pane sm-pane">
          <div class="sm-stage"><canvas class="sm-preview" aria-hidden="true"></canvas><canvas class="sm-scratch" aria-hidden="true"></canvas></div>
          <div class="sm-detail" hidden>
            <div class="pm-pane-top"><span class="m-eb sm-ceb"></span><h2 class="m-h2 sm-dname"></h2></div>
            <p class="sm-ddesc"></p><p class="sm-effect"></p>
            <div class="sm-stats" aria-label="Eigenschappen"></div>
            <span class="m-grow"></span>
            <div class="sm-buyrow"><span class="m-num sm-pricebig"></span><button type="button" class="m-bp sm-buy"></button></div>
          </div>
          <div class="sm-status" role="status" aria-live="polite"></div>
        </aside>
      </div>
    </section>
    <footer class="m-foot"></footer>
    </div>`;
  document.body.appendChild(root);
  syncFooter();
  onPadChange(() => { if (open) syncFooter(); });
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
  tab = '';
  if (document.pointerLockElement) document.exitPointerLock();
  if (world.input) world.input.reset();
  const panel = root.querySelector('.sm-panel');
  panel.style.setProperty('--shop', s.color);
  root.querySelector('#shop-title').textContent = s.name;
  root.querySelector('.sm-tag').textContent = s.tagline || '';
  root.querySelector('.sm-tag').hidden = !s.tagline;
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

// save: false when a loaded save replaces the state this menu bought into
export function closeShopMenu({ save = true } = {}) {
  if (!open) return;
  open = false;
  finishScratch(false);
  setPreview(null);
  root.classList.remove('visible');
  document.body.classList.remove('shop-open');
  if (world && world.input) world.input.reset();
  if (save && bought && world) saveGame(world);
  if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
}

function currentItems() {
  return flatItems(shop.sections());
}

const PG = (slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
const cap = (t) => `<span class="m-kc">${t}</span>`;
function hint(caps, label, cls = '') {
  return `<button type="button" class="m-hint ${cls}" tabindex="-1">${caps}<span>${label}</span></button>`;
}
// the footer follows the last used input: white keycaps, or the controller's buttons
function syncFooter() {
  const pad = isPadActive();
  const tabs = !root.querySelector('.sm-tabs').hidden;
  root.querySelector('.m-foot').innerHTML = pad
    ? hint(PG('dpad'), 'kiezen') + (tabs ? hint(PG('dpad'), 'afdeling') : '') + hint(PG('a'), 'kopen', 'sm-hbuy') + hint(PG('b'), 'weglopen', 'sm-close')
    : hint(cap('↑') + cap('↓'), 'bekijken') + (tabs ? hint(cap('←') + cap('→'), 'afdeling') : '') + hint(cap('Enter'), 'kopen', 'sm-hbuy') + hint(cap('Esc'), 'weglopen', 'sm-close');
}

function swatchHtml(it) {
  return it.swatch && it.swatch.length ? `<span class="sm-sw">${it.swatch.map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span>` : '';
}

function render() {
  const focusedId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  const money = Math.max(0, Math.floor(world.money));
  root.querySelector('.sm-money').textContent = '€' + money.toLocaleString('nl-NL');
  const view = shop.view ? shop.view() : { sections: shop.sections(), banner: null };
  const tabs = shopTabs(view.sections);
  tab = keepTab(tabs, tab);
  const sections = tabSections(view.sections, tab);
  renderTabs(tabs);
  if (view.banner) storyBanner = view.banner;
  renderStory();
  const list = root.querySelector('.sm-list');
  if (!sections.length) {
    list.innerHTML = '<p class="sm-empty">Hier valt niks te halen.</p>';
    return;
  }
  list.innerHTML = sections.map((sec) => `
    <div class="m-gh"><span>${esc(sec.title)}</span></div>
    ${sec.note ? `<p class="sm-note">${esc(sec.note)}</p>` : ''}
    ${sec.items.map((it) => rowHtml(it, sec.title)).join('')}`).join('');
  if (focusedId) {
    const el = list.querySelector(`[data-id="${CSS.escape(focusedId)}"]`);
    if (el) el.focus({ preventScroll: true });
  }
  markSelected();
  renderDetail();
}

// a row: low-poly icon, name with the short property, price and the status chip
function rowHtml(it, secTitle) {
  const st = itemStatus(it, world.money);
  const perk = it.desc ? shortPerk({ desc: it.desc }, 70) : '';
  return `
      <button type="button" class="m-li sm-item st-${st.id}${it.story ? ' story-' + it.story : ''}" data-id="${esc(it.id)}" aria-disabled="${it.disabled ? 'true' : 'false'}">
        <span class="sm-ico">${shopIconSvg(itemIcon(it, shop.type, secTitle))}</span>
        ${swatchHtml(it)}
        <span class="nm"><span class="one">${esc(it.label)}</span>${perk ? `<span class="mut one">${esc(perk)}</span>` : ''}</span>
        ${(it.cols || []).map((c) => `<span class="v">${esc(c)}</span>`).join('')}${it.plain ? '' : priceOnly(it)}<span class="sm-st ${st.tone}" data-st="${st.id}">${esc(st.label)}</span>
      </button>`;
}

function priceOnly(it) {
  return it.income > 0 ? `<span class="v free">+€${it.income}</span>` : it.price > 0 ? `<span class="v">€${it.price.toLocaleString('nl-NL')}</span>` : '';
}

function renderTabs(tabs) {
  const nav = root.querySelector('.sm-tabs');
  const was = nav.hidden;
  nav.hidden = !tabs.length;
  nav.innerHTML = tabs.map((t) => `<button type="button" class="m-tab sm-tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${esc(t.label)}<small>${t.count}</small></button>`).join('');
  if (was !== nav.hidden) syncFooter();
}

function viewSections() {
  return shop.view ? shop.view().sections : shop.sections();
}

function showTab(id) {
  if (id === tab) return;
  tab = id;
  armed = null;
  render();
  const first = keepItem(flatItems(tabSections(viewSections(), tab)), null);
  const el = first != null && root.querySelector(`.sm-item[data-id="${CSS.escape(first)}"]`);
  if (el) { el.focus({ preventScroll: true }); select(first); } else renderDetail();
}

function stepTabs(dir) {
  const tabs = shopTabs(viewSections());
  if (tabs.length) showTab(stepTab(tabs, tab, dir));
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
  for (const el of root.querySelectorAll('.sm-item')) { const on = el.dataset.id === sel; el.classList.toggle('sel', on); el.toggleAttribute('aria-current', on); }
}

const needsConfirm = (it) => needsConfirmFor(it, world.money);
const buyLabel = (it) => buyLabelFor(it, shop.type, !!(armed && armed.id === it.id && Date.now() < armed.until));

// not enough money: the status line says how much is missing and the amount shakes
function shortOfMoney(it) {
  setStatus(refusalMessage(it, world.money), 'no');
  const m = root.querySelector('.sm-money');
  m.classList.remove('short');
  void m.offsetWidth;
  m.classList.add('short');
}

function renderDetail() {
  const bar = root.querySelector('.sm-detail');
  const it = sel && currentItems().find((x) => x.id === sel);
  bar.hidden = !it;
  renderStats(it);
  if (!it) return;
  bar.querySelector('.sm-ceb').textContent = [shop.name, it.tag].filter(Boolean).join(' · ');
  bar.querySelector('.sm-dname').textContent = it.label;
  const dd = bar.querySelector('.sm-ddesc');
  if (it.route) {
    const r = it.route;
    dd.innerHTML = `<span class="sm-route"><span class="sm-rs"><span class="bebas">${esc(r.from)}</span><span class="mut">Vertrek</span></span><span class="sm-rl" aria-hidden="true"></span><span class="sm-rs"><span class="bebas">${esc(r.to)}</span><span class="mut">${r.minutes} min</span></span></span>` +
      `<span class="sm-rt">${esc(r.text)}</span>${r.teaser ? `<span class="sm-rt">${esc(r.teaser)}</span>` : ''}<span class="sm-rt mut">Bord: ${esc(r.board.toLowerCase())}. De rit is over te slaan.</span>`;
  } else dd.textContent = it.desc || '';
  bar.querySelector('.sm-effect').textContent = it.effect || '';
  bar.querySelector('.sm-pricebig').textContent = it.plain ? '' : it.income > 0 ? `+€${it.income}` : it.price > 0 ? `€${it.price.toLocaleString('nl-NL')}` : '';
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
  const on = root.querySelector('.sm-preview').classList.contains('on') || !!scratch;
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
    if (itemStatus(it, world.money).id === 'duur') shortOfMoney(it);
    else setStatus(refusalMessage(it, world.money), 'no');
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
    shortOfMoney({ ...it, price: it.price || world.money + 1 });
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
  const tb = e.target.closest('.sm-tab');
  if (tb) { showTab(tb.dataset.tab); return; }
  if (e.target.closest('.sm-hbuy')) { if (sel) activate(sel); return; }
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
  else if (k === 'ArrowLeft' || k === '[') stepTabs(-1);
  else if (k === 'ArrowRight' || k === ']') stepTabs(1);
  else if (k === 'ArrowUp' || lower === 'w') move(-1);
  else if (k === 'ArrowDown' || lower === 's') move(1);
  else if (k === 'Enter' || k === ' ' || lower === 'e' || lower === 'f') {
    const a = document.activeElement;
    if (a && a.classList.contains('sm-close')) closeShopMenu();
    else if (a && a.classList.contains('sm-buy')) { if (sel) activate(sel); }
    else if (a && a.classList.contains('sm-item')) { select(a.dataset.id); root.querySelector('.sm-buy').focus({ preventScroll: true }); }
  }
}
