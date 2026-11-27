import { icoon } from './icons.js';
import { keyTextHtml } from './keycap.js';
import { euro } from './geldtekst.js';
import { createShowroom } from './tuningshowroom.js';
import { VIEW_IDS, VIEW_LABELS, TAB_ICON, iconOfField, EFFECT_OF_CATEGORY, categoryOfField, blurbOf } from './showroomplan.js';
import { navIndex } from './listnav.js';
import { playChange, playInstall } from './tuningsfx.js';
import { finishSphere, rimPicture, decalPicture, stripePicture } from './tuningtiles.js';
import { hudPixelRatio } from './uiscale.js';
import { isPadActive, onPadChange } from './gamepad.js';
import { padGlyphInner } from './glyphs.js';
import { oskKnop } from './oskview.js';
import { saveGame } from './savehook.js';
import { vehiclePreviewOf, setTuningOpener } from './shops.js';
import { reducedMotion } from './motion.js';
import { optionOf, DEFAULT_CUSTOM_COLOR, FIELD_LABELS, KIND_LABELS, cleanColor, cleanPlate, isStock, PRESETS_PER_VEHICLE } from './vehiclelook.js';
import { garageLevel, dealLines, MAX_LEVEL } from './tuningoffer.js';
import {
  changeField, changePart, applyBuild, quote, canInstall, tabsFor, tabChanges, groupsFor, changedEffectRows, summaryText, sameState, showiness,
} from './tuningdraft.js';
import { tuneId, tuneKind, partsKindOf, readState, readBuilds, installState, saveBuild, deleteBuild } from './tuningbind.js';
import { escapeHtml as esc } from './htmlescape.js';

// De pimp-werkplaats (epic Autotuning, #1155): een DS3-paneel (zeefdruk) met links de keuzes per tabblad en rechts
// het 3D-voorbeeld van je eigen voertuig. Preview-eerst: elke keuze staat meteen op het voertuig, pas Installeren betaalt.
// Bediening: pijl omhoog/omlaag kiest een rij, pijl links/rechts een waarde, [ en ] (of LT/RT) het tabblad, Enter (A)
// installeert, Delete (X) draait terug, Spatie (Y) of V houdt "voor" in beeld, Esc (B) sluit. Alles ook met de muis en aanraking.
// Het model (concept, kosten, aanbod) staat in tuningdraft.js; dit bestand tekent alleen.

const ARM_TIME = 4000, ARM_FROM = 200;
const KEY_CONFIRM = 'Enter';
const KEY_VIEW = 'Tab'; // het toetsplaatje van installeren

let root = null, world = null, veh = null, site = null;
let open = false, installed = null, draft = null, tabId = 'lak', ctx = null, compare = false, armed = null, closeArmed = 0, showroom = null;
let dayIndex = 0;

function css() {
  for (const f of ['menu.css', 'ds-tokens.css', 'ds-components.css', 'ds-keycap.css', 'ds-menu-zeef.css', 'tuningui.css']) {
    if (document.getElementById('style-' + f)) continue;
    const l = document.createElement('link');
    l.id = 'style-' + f; l.rel = 'stylesheet'; l.href = new URL('./' + f, import.meta.url).href;
    document.head.appendChild(l);
  }
}

function build() {
  css();
  root = document.createElement('div');
  root.id = 'tune-menu';
  root.className = 'gm gm-zeef';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tune-title');
  root.innerHTML = `
    <div class="tm-stage"><canvas class="tm-preview" aria-label="De showroom: je voertuig op de draaitafel"></canvas><span class="tm-badge" aria-hidden="true"></span><div class="tm-splitlab" aria-hidden="true" hidden><b>Voor</b><b>Na</b></div></div>
    <nav class="tm-views" aria-label="Camerastand"></nav>
    <div class="gm-stage gm-zeef-stage">
    <section class="tm-panel m-panel" aria-labelledby="tune-title">
      <header class="m-head">
        <div><span class="tm-accent" aria-hidden="true"></span><span class="m-eb tm-tag"></span><h1 class="m-h1" id="tune-title">Pimp-werkplaats</h1></div>
        <div class="m-hr"><span class="mut">Op zak</span><span class="m-num tm-money" aria-label="Jouw geld"></span></div>
      </header>
      <nav class="m-tablist tm-tabs" role="tablist" aria-label="Onderdeel"></nav>
      <div class="tm-deals" role="note"></div>
      <div class="m-main tm-main">
        <div class="m-list tm-list" aria-label="Keuzes"></div>
        <aside class="m-pane tm-pane">
          <div class="tm-card ds-zeef ds-z-kaart">
            <div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel tm-ctitle"></span><span class="tm-chips"></span></div>
            <div class="tm-lines"></div>
            <div class="tm-fx"></div>
            <div class="tm-buyrow"><span class="tm-total"></span><button type="button" class="ds-z-knop tm-buy"></button></div>
            <div class="tm-sub"><button type="button" class="ds-z-knop ds-z-knop--secundair tm-revert"><span class="tm-bt">Terugdraaien</span><span class="tm-bk"></span></button><button type="button" class="ds-z-knop ds-z-knop--secundair tm-compare" aria-pressed="false"><span class="tm-bt">Voor en na</span><span class="tm-bk"></span></button></div>
          </div>
          <div class="tm-status" role="status" aria-live="polite"></div>
        </aside>
      </div>
    </section>
    <footer class="m-foot"></footer>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);
  onPadChange(() => { if (open) syncFooter(); });
}

// --- open en dicht --------------------------------------------------------------------------------------------------
function openTuningWorkshop(w, v, s = {}) {
  if (!tuneId(v) || !tuneKind(v)) return false;
  world = w; veh = v; site = s;
  if (!root) build();
  installed = readState(v);
  draft = installed;
  const kind = tuneKind(v);
  const tabs = tabsFor(kind, partsKindOf(v));
  tabId = tabs[0].id;
  compare = false; armed = null; closeArmed = 0;
  dayIndex = (w.calendar && Number(w.calendar.day)) || 0; // het aanbod wisselt per spelkalenderdag
  ctx = { site: s, dayIndex, kind, partsKind: partsKindOf(v) };
  if (document.pointerLockElement) document.exitPointerLock();
  if (world.input) world.input.reset();
  world.uiPaused = true;
  (world.pauseHolds || (world.pauseHolds = new Set())).add('tuning'); // phone.js refreshPause rewrites uiPaused every frame (#1292)
  open = true;
  root.classList.add('visible');
  document.body.classList.add('shop-open');
  root.querySelector('.tm-tag').textContent = `${s.name || 'Garage'} · ${KIND_LABELS[kind] || ''} · Niveau ${garageLevel(s)} van ${MAX_LEVEL}`;
  showStatus('', '');
  render();
  focusRow(0);
  showPreview();
  return true;
}

function closeTuningWorkshop() {
  if (!open) return;
  open = false;
  if (showroom) showroom.clear();
  root.classList.remove('visible');
  document.body.classList.remove('shop-open');
  if (world) { if (world.pauseHolds) world.pauseHolds.delete('tuning'); world.uiPaused = false; if (world.input) world.input.reset(); }
  if (world) saveGame(world);
  if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
}

// --- tekenen ------------------------------------------------------------------------------------------------------------
const kind = () => ctx.kind;
const money = () => Math.max(0, Math.floor(world.money));

function render(keepFocus = true) {
  const f = keepFocus && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.field : null;
  root.querySelector('.tm-money').textContent = '€' + money().toLocaleString('nl-NL');
  const tabs = tabsFor(kind(), ctx.partsKind);
  const nav = root.querySelector('.tm-tabs');
  nav.innerHTML = tabs.map((t) => {
    const n = tabChanges(t, draft, installed, kind());
    return `<button type="button" class="m-tab tm-tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === tabId}" tabindex="-1">${icoon(TAB_ICON[t.id] || 'tune_onderdelen', { cls: 'tm-ti', maat: 's' })}${esc(t.label)}${n ? `<small aria-label="${n} wijzigingen">${n}</small>` : ''}</button>`;
  }).join('');
  nav.insertAdjacentHTML('afterbegin', `<span class="tm-tabk" aria-hidden="true">${keyChip('[', 'lt')}</span>`);
  nav.insertAdjacentHTML('beforeend', `<span class="tm-tabk" aria-hidden="true">${keyChip(']', 'rt')}</span>`);
  renderDeals();
  renderViews();
  const tab = tabs.find((t) => t.id === tabId) || tabs[0];
  const list = root.querySelector('.tm-list');
  list.innerHTML = catHeadHtml(tab) + (tab.id === 'builds' ? buildsHtml() : groupsFor(tab, draft, installed, ctx, money()).map(rowHtml).join(''));
  if (f) { const el = list.querySelector(`[data-field="${CSS.escape(f)}"]`); if (el) el.focus({ preventScroll: true }); }
  renderCard();
  syncFooter();
}

// De kop van een categorie: groot icoon, naam, een zin uitleg en hoeveel wijzigingen er nog niet geïnstalleerd zijn (geen focusdoel: de rijen zijn het).
function catHeadHtml(tab) {
  const n = tabChanges(tab, draft, installed, kind());
  return `<header class="tm-cat" aria-hidden="false">${icoon(TAB_ICON[tab.id] || 'tune_onderdelen', { cls: 'tm-cat-i', maat: 'xl' })}<div class="tm-cat-t"><span class="tm-cat-n">${esc(tab.label)}</span><span class="tm-cat-b">${esc(blurbOf(tab.id))}</span></div>${n ? `<span class="ds-z-chip tm-cat-c">${n} nieuw</span>` : ''}</header>`;
}

function renderViews() {
  const cur = showroom ? showroom.view() : 'schuin';
  root.querySelector('.tm-views').innerHTML = icoon('tune_camera', { cls: 'tm-vi', maat: 's' }) + VIEW_IDS.map((id) => `<button type="button" class="tm-vw" data-view="${id}" aria-pressed="${id === cur}" tabindex="-1">${VIEW_LABELS[id]}</button>`).join('') + `<span class="tm-vk">${keyChip(KEY_VIEW, 'ls')}</span>`;
}

function renderDeals() {
  const el = root.querySelector('.tm-deals');
  const lines = dealLines(site, dayIndex, kind(), (f, id) => (optionOf(f, id) || { label: id }).label);
  el.innerHTML = lines.length ? `<span class="tm-deal-k">Dagaanbieding</span>${lines.map((d) => `<span class="ds-z-chip ds-z-chip--succes tm-deal">${esc(FIELD_LABELS[d.field])}: ${esc(d.label)} <b>${euro(d.price)}</b> <s>${euro(d.base)}</s></span>`).join('')}` : '';
}

function priceTag(o) {
  if (o.locked) return `<span class="tm-p lock">${icoon('slot', { cls: 'ds-z-chip__icoon', maat: 's' })}Slot</span>`;
  if (o.installed && !o.state) return '<span class="tm-p mut">Zit erop</span>';
  if (o.price <= 0) return '<span class="tm-p mut">Gratis</span>';
  return `<span class="tm-p${o.deal ? ' deal' : ''}">${o.deal ? `<s>${euro(o.base)}</s> ` : ''}${euro(o.price)}</span>`;
}

function rowHtml(g) {
  const label = esc(g.label);
  if (g.type === 'text') {
    return `<div class="tm-row" data-field="${g.field}" data-type="text" tabindex="0"><div class="tm-rh">${icoon(iconOfField(g.field), { cls: 'tm-ri', maat: 'm' })}<span class="tm-rl">${label}</span><span class="tm-rv">${g.value ? esc(g.value) : 'Geen'}</span><span class="tm-rp">${euro(g.price)}</span></div>
      <div class="tm-opts"><input class="tm-plate" type="text" data-osk="tekst" data-osk-label="Tekst op het nummerbord" maxlength="${g.max}" value="${esc(g.value || '')}" placeholder="Eigen tekst, hoogstens ${g.max} tekens" aria-label="Tekst op het nummerbord" autocomplete="off" spellcheck="false">${oskKnop('het nummerbord')}<span class="tm-hint">Verzonnen tekst, geen echt kenteken</span></div></div>`;
  }
  if (g.type === 'color') {
    const cur = g.palette.find((c) => c.state === 'on');
    const custom = g.value && !cur ? g.value : '';
    return `<div class="tm-row" data-field="${g.field}" data-type="color" tabindex="0" role="radiogroup" aria-label="${label}"><div class="tm-rh">${icoon(iconOfField(g.field), { cls: 'tm-ri', maat: 'm' })}<span class="tm-rl">${label}</span><span class="tm-rv">${cur ? esc(cur.label) : g.value ? 'Eigen kleur' : g.noneLabel || 'Standaard'}</span><span class="tm-rp">${g.value !== g.installed ? euro(g.price) : 'Zit erop'}</span></div>
      <div class="tm-opts tm-sws">${g.noneLabel ? `<button type="button" class="tm-sw none" data-val="" role="radio" aria-checked="${!g.value}" tabindex="-1" aria-label="${esc(g.noneLabel)}"><span>Geen</span></button>` : ''}${g.palette.map((c) => `<button type="button" class="tm-sw" data-val="${c.color}" role="radio" aria-checked="${c.state === 'on'}" tabindex="-1" aria-label="${esc(c.label)}" title="${esc(c.label)}" style="--sw:${c.color}"></button>`).join('')}
      <label class="tm-sw own${custom ? ' on' : ''}" title="Eigen kleur"><input type="color" class="tm-colorin" data-field="${g.field}" value="${esc(custom || (cur && cur.color) || DEFAULT_CUSTOM_COLOR)}" aria-label="Eigen kleur kiezen"><span>Eigen</span></label></div></div>`;
  }
  const cur = g.options.find((o) => o.state === 'on');
  return `<div class="tm-row" data-field="${g.field}" data-type="${g.type}" tabindex="0" role="radiogroup" aria-label="${label}"><div class="tm-rh">${icoon(iconOfField(g.field), { cls: 'tm-ri', maat: 'm' })}<span class="tm-rl">${label}</span><span class="tm-rv">${esc(cur ? cur.label : '')}</span><span class="tm-rp">${cur && cur.price > 0 && !cur.installed ? euro(cur.price) : ''}</span></div>
    <div class="tm-opts tm-tiles">${g.options.map((o) => tileHtml(g, o)).join('')}</div></div>`;
}

// Een keuzetegel: een voorbeeld (bol, velg, sticker, strepen of het icoon van het veld), de naam, de prijs of het slot, en een vinkje als hij gekozen is.
function tilePicture(g, o) {
  const body = draft.body || installed.body, L = draft.look;
  const none = o.id === null || o.id === 'none' || o.id === 'stock' || o.id === 'off';
  switch (g.field) {
    case 'finish': return `<img src="${finishSphere(o.id, body)}" alt="">`;
    case 'rimStyle': return `<img src="${rimPicture(o.id, L.rimColor, L.rimSize, L.tire)}" alt="">`;
    case 'rimSize': return `<img src="${rimPicture(L.rimStyle || 'spoke', L.rimColor, o.id, L.tire)}" alt="">`;
    case 'tire': return `<img src="${rimPicture(L.rimStyle || 'spoke', L.rimColor, L.rimSize, o.id)}" alt="">`;
    case 'decal': return o.id === 'none' ? icoon('kruis', { cls: 'tm-tic', maat: 'xl' }) : `<img src="${decalPicture(o.id)}" alt="" class="wide">`;
    case 'stripe': return o.id === 'none' ? icoon('kruis', { cls: 'tm-tic', maat: 'xl' }) : `<img src="${stripePicture(o.id, L.color2, body)}" alt="" class="wide">`;
    default: return icoon(none ? 'kruis' : iconOfField(g.field), { cls: 'tm-tic', maat: 'xl' });
  }
}
function tileHtml(g, o) {
  return `<button type="button" class="tm-o tm-tile${o.state ? ' on' : ''}${o.locked ? ' locked' : ''}" data-val="${esc(o.id ?? '')}" role="radio" aria-checked="${!!o.state}" aria-disabled="${o.locked ? 'true' : 'false'}" tabindex="-1" title="${esc(o.locked || o.desc || '')}"><span class="tm-pic">${tilePicture(g, o)}<span class="tm-on" aria-hidden="true">${o.state ? '✓' : ''}</span></span><span class="nm">${esc(o.label)}</span>${priceTag(o)}</button>`;
}

function buildsHtml() {
  const builds = readBuilds(veh);
  const rows = [];
  for (let i = 0; i < PRESETS_PER_VEHICLE; i++) {
    const b = builds[i];
    rows.push(`<div class="tm-row tm-build" data-field="build${i}" data-slot="${i}" data-type="build" tabindex="0"><div class="tm-rh"><span class="tm-rl">Build ${i + 1}</span><span class="tm-rv">${b ? esc(b.naam) : 'Leeg'}</span></div>
      <div class="tm-opts"><button type="button" class="ds-z-knop ds-z-knop--secundair tm-bact" data-act="load" ${b ? '' : 'disabled'} tabindex="-1">Laden</button><button type="button" class="ds-z-knop ds-z-knop--secundair tm-bact" data-act="save" ${isStock(draft.look) ? 'disabled' : ''} tabindex="-1">${b ? 'Overschrijven' : 'Opslaan'}</button><button type="button" class="ds-z-knop ds-z-knop--secundair tm-bact" data-act="del" ${b ? '' : 'disabled'} tabindex="-1">Wissen</button></div></div>`);
  }
  return `<p class="tm-note">Een build bewaart het uiterlijk (niet de lak en niet de onderdelen). Laden zet hem in het voorbeeld; pas Installeren betaalt.</p>${rows.join('')}`;
}

function renderCard() {
  const q = quote(draft, installed, ctx);
  const chk = canInstall(draft, installed, ctx, world.money);
  root.querySelector('.tm-ctitle').textContent = summaryText(q);
  root.querySelector('.tm-chips').innerHTML = (() => { const s = Math.round(showiness(draft) * 100); return s > 0 ? `<span class="ds-z-chip tm-flash" title="Hoe in het oog springend je uiterlijk is">Opvallend ${s}%</span>` : ''; })();
  root.querySelector('.tm-lines').innerHTML = q.lines.length ? q.lines.map((l) => `<div class="tm-line${l.locked ? ' locked' : ''}"><span class="nm">${esc(l.label)}</span><span class="v">${l.locked ? esc(l.locked) : l.price > 0 ? euro(l.price) : 'Gratis'}${l.deal ? ' <i class="tm-dealmark">korting</i>' : ''}</span></div>`).join('') : '<p class="tm-empty">Kies links iets. Je ziet het meteen op je voertuig; betalen doe je pas bij Installeren.</p>';
  const fx = changedEffectRows(installed.parts, draft.parts);
  root.querySelector('.tm-fx').innerHTML = fx.map((r) => `<div class="tm-stat"><span>${esc(r.label)}</span><small>${r.before} → ${r.after}${r.unit === '%' ? '%' : ''}</small><span class="tm-bar" aria-hidden="true"><b style="width:${Math.min(100, Math.max(0, Math.min(r.before, r.after) / 1.5))}%"></b><em class="${r.delta < 0 ? 'down' : ''}" style="left:${Math.min(100, Math.min(r.before, r.after) / 1.5)}%;width:${Math.min(100, Math.abs(r.delta) / 1.5)}%"></em></span></div>`).join('');
  root.querySelector('.tm-total').textContent = q.total > 0 ? euro(q.total) : '';
  const btn = root.querySelector('.tm-buy');
  btn.disabled = false;
  btn.setAttribute('aria-disabled', chk.ok ? 'false' : 'true');
  btn.classList.toggle('armed', !!armed);
  const sub = chk.ok ? keyChip(KEY_CONFIRM, 'a') : esc(chk.reason);
  btn.innerHTML = `<span class="tm-buy-t">${armed ? `Nog een keer: ${euro(q.total)}` : q.changed ? 'Installeren' : 'Niets te installeren'}</span><span class="ds-z-knop__sub">${sub}</span>`;
  root.querySelector('.tm-revert').disabled = sameState(draft, installed);
  root.querySelector('.tm-revert .tm-bk').innerHTML = keyChip('Del', 'x');
  root.querySelector('.tm-compare .tm-bk').innerHTML = keyChip('V', 'y');
  const cmp = root.querySelector('.tm-compare');
  cmp.setAttribute('aria-pressed', String(compare));
  cmp.disabled = sameState(draft, installed);
}

const PG = (slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
const cap = (t) => `<span class="m-kc">${t}</span>`;
const keyChip = (key, slot) => (isPadActive() ? PG(slot) : cap(key));
const hint = (caps, label, cls = '') => `<button type="button" class="m-hint ${cls}" tabindex="-1">${caps}<span>${label}</span></button>`;
function syncFooter() {
  const isGamepad = isPadActive();
  root.querySelector('.m-foot').innerHTML = isGamepad
    ? hint(PG('dpad'), 'kiezen') + hint(PG('lt') + PG('rt'), 'tabblad') + hint(PG('a'), 'installeren', 'tm-hbuy') + hint(PG('x'), 'terugdraaien') + hint(PG('y'), 'voor en na') + hint(PG('b'), 'sluiten', 'tm-close')
    : hint(cap('↑') + cap('↓'), 'kiezen') + hint(cap('←') + cap('→'), 'waarde') + hint(cap('['), 'tabblad') + hint(cap('Enter'), 'installeren', 'tm-hbuy') + hint(cap('Del'), 'terugdraaien') + hint(cap('V'), 'voor en na') + hint(cap('Esc'), 'sluiten', 'tm-close');
}

function showStatus(text, tone) {
  const el = root.querySelector('.tm-status');
  el.textContent = text || '';
  el.dataset.tone = tone || '';
  if (text && !reducedMotion()) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

// --- voorbeeld -----------------------------------------------------------------------------------------------------------
function previewSpec(st) {
  const spec = vehiclePreviewOf(veh, st.body || undefined);
  return isStock(st.look) ? spec : { ...spec, tune: st.look };
}
function freeOffset() {
  // het voertuig in het midden van de vrije ruimte tussen het paneel links en de kaart rechts
  const a = root.querySelector('.tm-panel'), b = root.querySelector('.tm-pane');
  if (!a || !b) return 0;
  const left = a.getBoundingClientRect().right, right = b.getBoundingClientRect().left;
  return Math.round((left + right) / 2 - window.innerWidth / 2);
}
function showPreview() {
  const canvas = root.querySelector('.tm-preview');
  if (!showroom) showroom = createShowroom(canvas, { active: () => open, reduced: reducedMotion });
  showroom.setEnv(site && site.kind);
  showroom.setOffset(freeOffset());
  showroom.show(previewSpec(draft), compare ? previewSpec(installed) : null);
  root.querySelector('.tm-splitlab').hidden = !compare;
  const badge = root.querySelector('.tm-badge');
  badge.textContent = compare ? '' : sameState(draft, installed) ? '' : 'Na';
  badge.hidden = !badge.textContent;
  renderViews();
}

// Het effect bij een wissel (showroomplan.js): spuitbus bij lak, wieldraai bij velgen, neon bij licht, anders een flits.
function playEffect(field) {
  if (!field || !showroom || compare) return;
  const kindOf = EFFECT_OF_CATEGORY[categoryOfField(field)] || 'flash';
  const col = field === 'body' && draft.body ? parseInt(draft.body.slice(1), 16) : 0xffffff;
  showroom.effect(kindOf, field, col);
}

// --- handelingen ----------------------------------------------------------------------------------------------------------
function change(next, what, field = '') {
  if (next === draft) return;
  draft = next;
  armed = null; closeArmed = 0;
  if (compare) compare = false;
  render();
  showPreview();
  playEffect(field);
  if (field) playChange(world, categoryOfField(field));
  if (what) showStatus(what, '');
}

function pickValue(row, val) {
  const field = row.dataset.field, type = row.dataset.type;
  if (type === 'part') { change(changePart(draft, field, val || null, ctx.partsKind), '', field); return; }
  if (type === 'color') { change(changeField(draft, field, val ? val : (field === 'body' ? draft.body : null), kind()), '', field); return; }
  const lockedBtn = row.querySelector(`.tm-o[data-val="${CSS.escape(val)}"]`);
  if (lockedBtn && lockedBtn.classList.contains('locked')) { showStatus(lockedBtn.title || 'Dat kan hier niet', 'no'); }
  change(changeField(draft, field, val === '' ? null : val, kind()), '', field);
}

function install() {
  const q = quote(draft, installed, ctx);
  const chk = canInstall(draft, installed, ctx, world.money);
  if (!chk.ok) { showStatus(chk.reason, 'no'); flashMoney(); return; }
  if (q.total >= ARM_FROM && !(armed && Date.now() < armed.until)) {
    armed = { until: Date.now() + ARM_TIME };
    showStatus(`${euro(q.total)} voor ${summaryText(q)}. Druk nog een keer om te installeren`, 'win');
    renderCard();
    setTimeout(() => { if (open && armed && Date.now() >= armed.until) { armed = null; renderCard(); } }, ARM_TIME + 50);
    return;
  }
  armed = null;
  const fields = changedFieldIds(), partsChanged = JSON.stringify(draft.parts || {}) !== JSON.stringify(installed.parts || {});
  const r = installState(world, veh, draft, ctx);
  showStatus(r.text, r.tone);
  if (r.ok) {
    playInstall(world, fields, partsChanged); installed = readState(veh); draft = installed; compare = false; flashMoney(); }
  render();
  showPreview();
}

// Welke velden zijn anders dan wat er nu op zit (voor het geluid bij Installeren).
function changedFieldIds() {
  const out = [];
  for (const k of new Set([...Object.keys(draft.look || {}), ...Object.keys(installed.look || {})])) if (((draft.look || {})[k] ?? null) !== ((installed.look || {})[k] ?? null)) out.push(k);
  if ((draft.body || null) !== (installed.body || null)) out.push('body');
  return out;
}

function flashMoney() {
  const m = root.querySelector('.tm-money');
  m.classList.remove('pay'); void m.offsetWidth; m.classList.add('pay');
}

function revert() {
  if (sameState(draft, installed)) return;
  draft = installed; compare = false; armed = null;
  render(); showPreview(); showStatus('Teruggezet naar wat er nu op zit', '');
}

function toggleCompare(on) {
  if (sameState(draft, installed)) return;
  compare = on ?? !compare;
  showPreview(); renderCard();
}

function rows() { return [...root.querySelectorAll('.tm-row')]; }
function focusRow(i) { const r = rows(); const el = r[Math.max(0, Math.min(r.length - 1, i))]; if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); } }

function moveRow(dir) {
  const r = rows(), i = r.indexOf(document.activeElement.closest ? document.activeElement.closest('.tm-row') : null);
  const j = navIndex(r.length, i, dir > 0 ? 'ArrowDown' : 'ArrowUp'); // listnav.js: hetzelfde pad voor toetsenbord en controller
  if (j >= 0 && j !== i) { focusRow(j); return; }
  // voorbij het eind: het volgende (of vorige) tabblad, zodat een controller zonder tabknoppen overal komt
  const tabs = tabsFor(kind(), ctx.partsKind), ti = tabs.findIndex((t) => t.id === tabId), nt = tabs[ti + dir];
  if (nt) { showTab(nt.id); focusRow(dir > 0 ? 0 : rows().length - 1); }
}

function showTab(id) {
  if (id === tabId) return;
  tabId = id; armed = null;
  render(false);
  focusRow(0);
}
function stepTab(dir) {
  const tabs = tabsFor(kind(), ctx.partsKind), i = tabs.findIndex((t) => t.id === tabId);
  const t = tabs[navIndex(tabs.length, i, dir > 0 ? 'ArrowRight' : 'ArrowLeft', { wrap: true })];
  if (t) showTab(t.id);
}

// pijl links of rechts: de volgende waarde van de rij (of de volgende knop bij een build)
function stepValue(row, dir) {
  const type = row.dataset.type;
  if (type === 'build') {
    const btns = [...row.querySelectorAll('.tm-bact:not([disabled])')], i = btns.indexOf(document.activeElement);
    const n = btns[(i < 0 ? (dir > 0 ? 0 : btns.length - 1) : i + dir + btns.length) % btns.length];
    if (n) n.focus({ preventScroll: true });
    return;
  }
  if (type === 'text') return;
  const vals = [...row.querySelectorAll('.tm-o, .tm-sw[data-val]')].filter((b) => !b.classList.contains('locked'));
  if (!vals.length) return;
  let i = vals.findIndex((b) => b.getAttribute('aria-checked') === 'true');
  if (i < 0) i = 0;
  const next = vals[navIndex(vals.length, i, dir > 0 ? 'ArrowRight' : 'ArrowLeft')];
  if (next) pickValue(row, next.dataset.val);
}

function buildAction(row, act) {
  const index = Number(row.dataset.slot);
  const builds = readBuilds(veh);
  if (act === 'load') { if (builds[index]) { change(applyBuild(draft, builds[index].code, kind()), `${builds[index].naam} staat in het voorbeeld`); } return; }
  if (act === 'save') {
    const label = `Build ${index + 1}`;
    if (saveBuild(veh, index, builds[index] ? builds[index].naam : label, draft.look)) { showStatus(`Opgeslagen als ${builds[index] ? builds[index].naam : label}`, 'win'); render(); focusRow(index); }
    return;
  }
  if (act === 'del') { if (deleteBuild(veh, index)) { showStatus('Build gewist', ''); render(); focusRow(index); } }
}

function onClick(e) {
  if (!open) return;
  const t = e.target;
  const tab = t.closest('.tm-tab'); if (tab) { showTab(tab.dataset.tab); return; }
  const ba = t.closest('.tm-bact'); if (ba && !ba.disabled) { buildAction(ba.closest('.tm-row'), ba.dataset.act); return; }
  const opt = t.closest('.tm-o, .tm-sw[data-val]'); if (opt) { const row = opt.closest('.tm-row'); row.focus({ preventScroll: true }); pickValue(row, opt.dataset.val); return; }
  const vw = t.closest('.tm-vw'); if (vw) { if (showroom) { showroom.setView(vw.dataset.view); renderViews(); } return; }
  if (t.closest('.tm-buy')) { install(); return; }
  if (t.closest('.tm-revert')) { revert(); return; }
  if (t.closest('.tm-compare')) { toggleCompare(); return; }
  if (t.closest('.tm-close')) { tryClose(); }
}

function onInput(e) {
  const t = e.target;
  if (t.classList.contains('tm-colorin')) {
    const c = cleanColor(t.value);
    if (!c) return;
    const f = t.dataset.field;
    change(changeField(draft, f === 'body' ? 'body' : f, c, kind()), '', f);
  } else if (t.classList.contains('tm-plate')) {
    const clean = cleanPlate(t.value);
    const next = changeField(draft, 'plate', clean || null, kind());
    if (next !== draft) { draft = next; armed = null; renderCard(); showPreview(); const rv = t.closest('.tm-row').querySelector('.tm-rv'); if (rv) rv.textContent = clean || 'Geen'; }
  }
}

function tryClose() {
  if (!sameState(draft, installed) && Date.now() > closeArmed) {
    closeArmed = Date.now() + 3000;
    showStatus('Dit is nog niet geïnstalleerd. Druk nog een keer om te sluiten', 'no');
    return;
  }
  closeTuningWorkshop();
}

function onKey(e) {
  if (!open) return;
  if (e.metaKey || e.ctrlKey) return;
  const k = e.key, lower = k.length === 1 ? k.toLowerCase() : k;
  const inText = e.target && e.target.classList && e.target.classList.contains('tm-plate');
  if (inText) { // tekstveld: alles is typen, behalve Enter en Esc
    e.stopImmediatePropagation();
    if (k === 'Enter' || k === 'Escape') { e.preventDefault(); e.target.closest('.tm-row').focus({ preventScroll: true }); }
    return;
  }
  e.stopImmediatePropagation();
  e.preventDefault();
  if (k === 'Tab') { if (!e.repeat && showroom) { showroom.nextView(e.shiftKey ? -1 : 1); renderViews(); } return; }
  if (e.repeat && !k.startsWith('Arrow')) return;
  if (k === 'Escape' || k === 'Backspace' || lower === 'q') tryClose();
  else if (k === 'ArrowUp' || lower === 'w') moveRow(-1);
  else if (k === 'ArrowDown' || lower === 's') moveRow(1);
  else if (k === 'ArrowLeft' || k === 'ArrowRight') { const row = document.activeElement.closest && document.activeElement.closest('.tm-row'); if (row) stepValue(row, k === 'ArrowLeft' ? -1 : 1); }
  else if (k === 'Home' || k === 'End') focusRow(navIndex(rows().length, -1, k));
  else if (k === '[') stepTab(-1);
  else if (k === ']') stepTab(1);
  else if (k === 'Delete' || lower === 'r') revert();
  else if (k === ' ' || lower === 'v') toggleCompare(true);
  else if (k === 'Enter' || lower === 'e' || lower === 'f') {
    const a = document.activeElement;
    if (a && a.classList.contains('tm-bact')) { if (!a.disabled) buildAction(a.closest('.tm-row'), a.dataset.act); return; }
    if (a && a.dataset && a.dataset.type === 'text') { const inp = a.querySelector('.tm-plate'); if (inp) { inp.focus(); inp.select(); } return; }
    if (a && a.classList.contains('tm-close')) { tryClose(); return; }
    if (a && a.dataset && a.dataset.type === 'build') { buildAction(a, readBuilds(veh)[Number(a.dataset.slot)] ? 'load' : 'save'); return; }
    install();
  }
}
function onKeyUp(e) {
  if (!open) return;
  if (e.key === ' ' || e.key.toLowerCase() === 'v') { e.preventDefault(); e.stopImmediatePropagation(); toggleCompare(false); }
}

// Via shops.js (werf, fietsenmaker, tuningwinkel) en garages.js: één opener voor alle werkplaatsen.
setTuningOpener((w, v, s) => openTuningWorkshop(w, v, s));
