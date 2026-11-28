import { icoon } from './icons.js';
import { saveGame } from './savehook.js';
import { keyTextHtml, plainKeyText, hintCapHtml } from './keycap.js';
import { navIndex, rijCijfer } from './listnav.js';
import { euro } from './geldtekst.js';
import { createVehiclePreview } from './vehiclepreview.js';
import { shopIconUrl } from './shopicon.js';
import { hudPixelRatio } from './uiscale.js';
import { isPadActive, onPadChange } from './gamepad.js';
import { padGlyphInner } from './glyphs.js';
import { shopIconSvg } from './shopicons.js';
import { deviceText } from './touchui.js';
import { bonRegels, probleemVan, risicoVan } from './shopbon.js';
import { escapeHtml as esc } from './htmlescape.js';
import {
  itemIcon, itemStatus, refusalMessage, needsConfirm as needsConfirmFor, buyLabel as buyLabelFor, shopTabs, tabSections, stepTab, keepTab,
  flatItems, keepItem, shortPerk, toonStatus, bevestigRegel, escActie, bevestigGeldig,
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

// Statuschips met een pictogram en een woord: nooit alleen kleur (designsysteem).
const CHIP_ICOON = {
  ok: icoon('vinkje', { cls: 'ds-z-chip__icoon', maat: 's' }),
  no: icoon('waarschuwing', { cls: 'ds-z-chip__icoon', maat: 's' }),
  mut: icoon('min', { cls: 'ds-z-chip__icoon', maat: 's' }),
};
const CHIP_KLASSE = { ok: 'ds-z-chip--succes', no: 'ds-z-chip--probleem', mut: '' };
const chipHtml = (st, extra = '') => `<span class="ds-z-chip ${CHIP_KLASSE[st.tone] || ''} sm-st ${st.tone}${extra}" data-st="${st.id}">${CHIP_ICOON[st.tone] || CHIP_ICOON.mut}${esc(st.label)}</span>`;
// De status staat alleen op een regel als er iets te zeggen valt (te duur, heb ik al, op slot): "Kan ik kopen" is de
// standaard en de prijs en de knop zeggen dat al (#1252).
const rijChip = (it, st) => (it.plain || !toonStatus(st) ? '' : chipHtml(st));
const euroHeel = (n) => euro(Math.max(0, Math.floor(Number(n) || 0)));


export function isShopOpen() {
  return open;
}

export function initShopUi(w) {
  world = w;
  if (root) return;
  for (const css of ['menu.css', 'ds-tokens.css', 'ds-components.css', 'ds-keycap.css', 'ds-menu-zeef.css', 'shopui.css']) {
    if (document.getElementById('style-' + css)) continue;
    const link = document.createElement('link');
    link.id = 'style-' + css;
    link.rel = 'stylesheet';
    link.href = new URL('./' + css, import.meta.url).href;
    document.head.appendChild(link);
  }
  root = document.createElement('div');
  root.id = 'shop-menu';
  root.className = 'gm gm-zeef';
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
          <div class="sm-detail ds-zeef ds-z-kaart " hidden>
            <div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel sm-ceb"></span><span class="sm-dchips"></span></div>
            <h2 class="sm-dname"></h2>
            <div class="ds-z-kaart__tekst sm-ddesc"></div><div class="ds-z-kaart__tekst sm-effect"></div>
            <div class="sm-callout ds-z-kaart ds-z-kaart--probleem ds-z-kaart--recht" role="group" hidden></div>
            <div class="sm-bon ds-z-bon" aria-label="Bon"></div>
            <div class="sm-stats" aria-label="Eigenschappen"></div>
            <div class="sm-buyrow"><button type="button" class="ds-z-knop sm-buy"></button></div>
            <div class="sm-risico" hidden></div>
          </div>
          <div class="sm-status" role="status" aria-live="polite"></div>
        </aside>
      </div>
    </section>
    <footer class="m-foot"></footer>
    </div>`;
  document.body.appendChild(root);
  syncFooter();
  onPadChange(() => { if (open) { syncFooter(); renderDetail(); } });
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
// #1258: the footer uses the same keycaps as the pause menu (keycap.js hintCapHtml), not outlined arrows and the word Enter
const cap = (t) => hintCapHtml(t);
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
    list.innerHTML = `<div class="sm-empty ds-z-leeg">
      <span class="ds-z-leeg__beeld">${shopIconSvg('standaard', 'sm-ic')}</span>
      <h3 class="ds-z-leeg__kop">Hier valt niks te halen</h3>
      <p class="ds-z-leeg__tekst">De schappen zijn leeg. Kom later terug of probeer een andere winkel in de buurt.</p>
      <button type="button" class="ds-z-knop ds-z-knop--secundair sm-close">Terug naar de straat</button>
    </div>`;
    renderDetail();
    return;
  }
  list.innerHTML = sections.map((sec) => `
    <div class="m-gh"><span>${esc(sec.title)}</span></div>
    ${sec.note ? `<p class="sm-note">${sec.keys ? keyTextHtml(esc(sec.note)) : esc(sec.note)}</p>` : ''}
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
  // een voertuig heeft zijn omschrijving in het detail (met balken): de regel houdt ruimte voor de volledige naam (#1232)
  const perk = it.desc && !(it.stats && it.stats.length) ? plainKeyText(shortPerk({ desc: it.desc }, 70)) : '';
  return `
      <button type="button" class="m-li sm-item st-${st.id}${it.story ? ' story-' + it.story : ''}" data-id="${esc(it.id)}" aria-disabled="${it.disabled ? 'true' : 'false'}">
        <span class="sm-ico">${shopIconSvg(itemIcon(it, shop.type, secTitle))}</span>
        ${swatchHtml(it)}
        <span class="nm"><span class="sm-naam">${esc(it.label)}</span>${perk ? `<span class="mut one">${esc(perk)}</span>` : ''}</span>
        ${(it.cols || []).map((c) => `<span class="v">${esc(c)}</span>`).join('')}${it.plain ? '' : priceOnly(it)}${rijChip(it, st)}
      </button>`;
}

function priceOnly(it) {
  return it.income > 0 ? `<span class="v free">+${euro(it.income)}</span>` : it.price > 0 ? `<span class="v">${euro(it.price)}</span>` : '';
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
  el.querySelector('span').textContent = storyDone ? deviceText('Druk Esc en volg de route naar de volgende stap.', 'Tik op Sluiten en volg de route naar de volgende stap.') : [storyBanner.why, storyBanner.lead].filter(Boolean).join(' ');
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

// De toets die de knop bedient, als toetsplaatje (toetsenbord) of als de A-knop (controller).
const toetsHint = () => (isPadActive() ? PG('a') : keyTextHtml('{ENTER}'));

// De bon: prijs, wat je op zak hebt en wat er na afloop overblijft, vóór je kiest.
function bonHtml(it) {
  const b = bonRegels(it, world.money);
  if (!b) return '';
  const koop = b.soort === 'koop';
  // de prijs staat al in de rij en op de knop en wat je op zak hebt staat bovenin: de bon toont alleen wat er overblijft (#1252)
  return b.mist > 0
    ? `<div class="ds-z-bon__totaal sm-bon-mist"><span>Je mist</span><span class="ds-z-bon__stippen"></span><b>${euroHeel(b.mist)}</b></div>`
    : `<div class="ds-z-bon__totaal"><span>${koop ? 'Na aankoop' : 'Na verkoop'}</span><span class="ds-z-bon__stippen"></span><b>${euroHeel(b.na)}</b></div>`;
}

// Het probleem met de oplossing eronder: waarom het niet kan, en wat je wel kunt doen.
function calloutHtml(p) {
  const knop = p.oplossing ? `<button type="button" class="ds-z-knop ds-z-knop--secundair sm-oplossing" data-oplossing="${esc(p.oplossing.id)}">${esc(p.oplossing.label)}</button>` : '';
  const mist = p.mist > 0 ? `<div class="ds-z-kaart__voet"><span class="ds-z-chip ds-z-chip--probleem">Je mist ${euroHeel(p.mist)}</span></div>` : '';
  return `<div class="ds-z-kaart__tekst sm-callout-kop">${CHIP_ICOON.no}<b>${esc(p.kop)}</b></div>` +
    `<div class="ds-z-kaart__tekst">${esc(p.tekst)}</div>${mist}` +
    (knop ? `<div class="ds-z-kaart__voet">${knop}</div>` : '');
}

function renderDetail() {
  const bar = root.querySelector('.sm-detail');
  const it = sel && currentItems().find((x) => x.id === sel);
  bar.hidden = !it;
  renderStats(it);
  if (!it) return;
  const st = itemStatus(it, world.money);
  const isArmed = !!(armed && armed.id === it.id && Date.now() < armed.until);
  // de oplossing wijst naar een rij in dezelfde afdeling, zodat je niet van tabblad wisselt
  const probleem = probleemVan(it, flatItems(tabSections(viewSections(), tab)), world.money);
  const risico = isArmed ? null : risicoVan(it, world.money);
  // de kop van de kaart is de afdeling van het gekozen ding, niet nog eens de winkelnaam (die staat al boven)
  const sec = viewSections().find((x) => (x.items || []).some((y) => y.id === it.id));
  bar.querySelector('.sm-ceb').textContent = [sec && sec.title, it.tag].filter(Boolean).join(' · ') || shop.name;
  bar.querySelector('.sm-dchips').innerHTML = it.plain ? '' : rijChip(it, st);
  bar.querySelector('.sm-dname').textContent = it.label;
  const dd = bar.querySelector('.sm-ddesc');
  if (it.route) {
    const r = it.route;
    dd.innerHTML = `<span class="sm-route"><span class="sm-rs"><span class="bebas">${esc(r.from)}</span><span class="mut">Vertrek</span></span><span class="sm-rl" aria-hidden="true"></span><span class="sm-rs"><span class="bebas">${esc(r.to)}</span><span class="mut">${r.minutes} min</span></span></span>` +
      `<span class="sm-rt">${esc(r.text)}</span>${r.teaser ? `<span class="sm-rt">${esc(r.teaser)}</span>` : ''}<span class="sm-rt mut">Bord: ${esc(r.board.toLowerCase())}. De rit is over te slaan.</span>`;
  } else dd.innerHTML = it.desc ? keyTextHtml(esc(it.desc)) : '';
  bar.querySelector('.sm-effect').textContent = it.effect || '';
  bar.querySelector('.sm-bon').innerHTML = bonHtml(it);
  const co = bar.querySelector('.sm-callout');
  co.hidden = !probleem;
  co.innerHTML = probleem ? calloutHtml(probleem) : '';
  bar.classList.toggle('ds-z-kaart--probleem', !!probleem);
  const btn = bar.querySelector('.sm-buy');
  // #1258 (hertest 24-11): de toets staat IN de knop (DS3, zoals elke knop met een toets), zonder de kleine hint "om te kopen" eronder;
  // het label zegt al wat er gebeurt ("Kopen voor", "Zeker? Nog eens: ...")
  btn.innerHTML = `<span class="sm-buy-tekst ds-z-knop__label">${esc(buyLabel(it))}</span>` + (it.disabled ? '' : `<span class="ds-z-knop__toets" aria-hidden="true">${toetsHint()}</span>`);
  btn.classList.toggle('ds-z-knop--toets', !it.disabled);
  btn.setAttribute('aria-disabled', it.disabled ? 'true' : 'false');
  btn.classList.toggle('armed', isArmed);
  // risicovol: omlijnd in plaats van geel, met de reden eronder; de ene gele knop blijft voor "kan nu"
  btn.classList.toggle('ds-z-knop--gevaar', !it.disabled && (isArmed || !!risico));
  const ri = bar.querySelector('.sm-risico');
  ri.hidden = !risico;
  ri.textContent = risico ? risico.tekst : '';
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
  if (needsConfirm(it) && armed && armed.id === id && Date.now() < armed.until && !bevestigGeldig(armed, id)) return; // een dubbelklik telt niet als bevestiging
  if (needsConfirm(it) && !bevestigGeldig(armed, id)) {
    armed = { id, at: Date.now(), until: Date.now() + ARM_TIME };
    const vraag = bevestigRegel(it);
    setStatus(vraag, it.confirmText ? 'no' : 'win');
    renderDetail();
    // verlopen: de knop valt terug en de vraag verdwijnt ook uit de statusbalk (die bleef anders staan alsof hij nog gold)
    setTimeout(() => { if (open && armed && armed.id === id && Date.now() >= armed.until) { armed = null; if (root.querySelector('.sm-status').textContent === vraag) setStatus('', ''); renderDetail(); } }, ARM_TIME + 50);
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
  // een wapen is klein in beeld: dan krijgt de bon de ruimte (een voertuig houdt zijn hero)
  root.querySelector('.sm-stage').classList.toggle('compact', !!(spec && spec.kind === 'weapon'));
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
    g.fillText(prize ? `${euro(prize)}` : 'HELAAS', win.x + win.w / 2, win.y + win.h / 2 + 2);
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
  const op = e.target.closest('.sm-oplossing');
  if (op) { toonItem(op.dataset.oplossing); return; }
  const tb = e.target.closest('.sm-tab');
  if (tb) { showTab(tb.dataset.tab); return; }
  if (e.target.closest('.sm-hbuy')) { if (sel) activate(sel); return; }
  if (e.target.closest('.sm-buy')) { if (sel) activate(sel); return; }
  const btn = e.target.closest('.sm-item');
  if (btn) { btn.focus({ preventScroll: true }); select(btn.dataset.id); }
}

// de oplossing van een probleem-callout: ga naar het voorgestelde item in de lijst
function toonItem(id) {
  const el = root.querySelector(`.sm-item[data-id="${CSS.escape(id)}"]`);
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest' });
  select(id);
}

// Home, End en de cijfertoetsen 1 tot 9 (listnav.js, het ene patroon voor toetsenbord en controller): spring naar een rij zonder te kopen.
function jump(key) {
  const items = [...root.querySelectorAll('.sm-item')];
  if (!items.length) return;
  const n = rijCijfer(key);
  const i = n ? n - 1 : navIndex(items.length, items.indexOf(document.activeElement), key);
  if (i < 0 || i >= items.length) return;
  items[i].focus({ preventScroll: true });
  items[i].scrollIntoView({ block: 'nearest' });
  select(items[i].dataset.id);
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
  if (k === 'Escape' || k === 'Backspace' || lower === 'q') {
    if (escActie(armed) === 'annuleer') { armed = null; setStatus('Niets gedaan', ''); renderDetail(); } else closeShopMenu();
  }
  else if (k === 'ArrowLeft' || k === '[') stepTabs(-1);
  else if (k === 'ArrowRight' || k === ']') stepTabs(1);
  else if (k === 'Home' || k === 'End' || rijCijfer(k)) jump(k);
  else if (k === 'ArrowUp' || lower === 'w') move(-1);
  else if (k === 'ArrowDown' || lower === 's') move(1);
  else if (k === 'Enter' || k === ' ' || lower === 'e' || lower === 'f') {
    const a = document.activeElement;
    if (a && a.classList.contains('sm-close')) closeShopMenu();
    else if (a && a.classList.contains('sm-oplossing')) toonItem(a.dataset.oplossing);
    else if (a && a.classList.contains('sm-buy')) { if (sel) activate(sel); }
    else if (a && a.classList.contains('sm-item')) { select(a.dataset.id); root.querySelector('.sm-buy').focus({ preventScroll: true }); }
  }
}
