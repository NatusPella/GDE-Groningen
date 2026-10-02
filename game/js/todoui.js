// The pause menu's Overzicht and Te doen sections (pausemenu.js owns the
// shell, keys and focus; this renders their content and handles their
// clicks). Data comes from todo.js; styles live with the pause menu's in
// index.html (td-*, ov-*).
import { getTodoItems, chooseTodo, mapIconUrl, placeName, GROUPS, STATUS_LABEL } from './todo.js';
import { getStoryView, getStorySteps, getStoryJournal } from './story.js';
import { PARTS, CLUES, WHY } from './storyarc.js';
import { getAchievementView, MEDALS } from './achievements.js';
import { getGoal, clearGoal, storyWaiting } from './goal.js';
import { formatDistance } from './routing.js';
import { dualHtml } from './subtitles.js';
import { fillBars, pop, shine, countTo } from './motion.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PART_IDS = Object.keys(PARTS);

const ui = { kind: 'alles', near: false, sel: null, open: null, more: new Set() };
// what each card showed last time, so a change pops once (motion.js)
const seen = new Map();
const bars = new Map();

const nums = new Map();

function animateChanges(scope) {
  fillBars(scope, bars);
  for (const n of scope.querySelectorAll('[data-num]')) {
    const to = Number(n.dataset.to);
    if (nums.has(n.dataset.num)) n.dataset.moValue = String(nums.get(n.dataset.num));
    nums.set(n.dataset.num, to);
    countTo(n, to, (v) => Math.round(v).toLocaleString('nl-NL'));
  }
  for (const c of scope.querySelectorAll('[data-todo]')) {
    const it = byKey.get(c.dataset.todo);
    if (!it) continue;
    const prev = seen.get(it.key);
    seen.set(it.key, { status: it.status, medal: it.medal || 0 });
    if (!prev) continue;
    if (prev.status !== it.status) pop(c.querySelector('.td-pill:not([data-st="doel"])'));
    for (const pip of c.querySelectorAll('.td-pip[data-on]')) {
      if (Number(pip.dataset.m) > prev.medal) { pop(pip); shine(pip); }
    }
  }
}
let items = [];
let byKey = new Map();

const STATUS_ICON = {
  nu: '<path d="M8 5l11 7-11 7z"/>',
  klaar: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  later: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  slot: '<rect x="5.5" y="11" width="13" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
};
const svg = (d, cls = 'td-sv') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

function refresh(world) {
  items = getTodoItems(world);
  byKey = new Map(items.map((it) => [it.key, it]));
}

export function todoItem(key) {
  return byKey.get(key) || null;
}

const pill = (st) => (st && STATUS_LABEL[st] ? `<span class="td-pill" data-st="${st}">${svg(STATUS_ICON[st])}${STATUS_LABEL[st]}</span>` : '');
const goalTag = (it) => (it.isGoal ? '<span class="td-pill" data-st="doel">Jouw doel</span>' : '');

function pips(medal) {
  if (medal == null) return '';
  return '<span class="td-pips">' + ['B', 'Z', 'G'].map((l, k) => `<span class="td-pip" data-m="${k + 1}"${medal > k ? ' data-on' : ''} title="${MEDALS[k + 1]}">${l}</span>`).join('') + '</span>';
}

function card(it, extra = '') {
  const rec = it.medal != null || it.record ? `<span class="td-rec">${pips(it.medal)}${esc(it.record)}</span>` : '';
  return `<button type="button" class="td-card${extra}" data-todo="${esc(it.key)}" data-status="${it.status || ''}"${it.isGoal ? ' data-goal' : ''}${ui.sel === it.key ? ' aria-current="true"' : ''}>` +
    `<span class="td-ico"><img src="${mapIconUrl(it.icon)}" alt=""></span>` +
    `<span class="td-txt"><b>${it.code ? `<em>${esc(it.code)}</em> · ` : ''}${esc(it.title)}</b><small>${esc(it.meta)}</small>${rec}</span>` +
    `<span class="td-side">${goalTag(it)}${pill(it.status)}${it.dist != null ? `<span class="td-dist">${formatDistance(it.dist)}</span>` : ''}</span></button>`;
}

// --- Overzicht ------------------------------------------------------------------

function nearlyThere() {
  const out = [];
  for (const cat of getAchievementView()) {
    for (const a of cat.items) if (!a.unlocked && !a.hidden && a.progress && a.progress.cur > 0) out.push(a);
  }
  return out.sort((a, b) => b.progress.cur / b.progress.goal - a.progress.cur / a.progress.goal).slice(0, 4);
}

function heroHtml(world) {
  const sv = getStoryView();
  if (sv.end) {
    return `<article class="ov-hero"><span class="ov-tile"><img src="${mapIconUrl('missionIdle', 64)}" alt=""></span><div class="ov-hero-txt">` +
      `<span class="td-kicker">Het verhaal</span><h3>${esc(sv.title)}</h3><p>Speel missies opnieuw als klus voor een betere medaille, verdien bij met een bijbaantje of zoek wat er nog verstopt ligt.</p>` +
      `<div class="ov-btns"><button type="button" class="pm-primary pm-small" data-todo-view="alles">Alles te doen</button></div></div></article>`;
  }
  const steps = getStorySteps().filter((s) => s.part === sv.part && s.available);
  const done = steps.filter((s) => s.done).length;
  const cur = getStorySteps().find((s) => s.current);
  const it = cur ? byKey.get(cur.kind === 'mission' ? 'm:' + cur.mission : 'st:' + cur.id) : null;
  const goal = getGoal();
  const title = cur && cur.kind === 'mission' ? `${cur.id} · ${cur.title}` : sv.title;
  const where = it && it.x != null ? placeName(world, it.x, it.y) : '';
  return `<article class="ov-hero"${it ? ` data-todo-hero="${esc(it.key)}"` : ''}>` +
    `<span class="ov-tile"><img src="${mapIconUrl(it ? it.icon : 'missionIdle', 64)}" alt="">${where ? `<small>${esc(where)}</small>` : ''}</span>` +
    `<div class="ov-hero-txt"><span class="td-kicker">Nu in het verhaal ${pill('nu')}${it && it.dist != null ? `<span class="td-dist">${formatDistance(it.dist)}</span>` : ''}</span>` +
    `<h3>${esc(title)}</h3>${cur && cur.lead ? `<p>${esc(cur.lead)}</p>` : ''}` +
    `<div class="ov-part"><span>${esc(PARTS[sv.part].title)}</span><span class="td-bar"><i data-bar="ov-part" data-w="${steps.length ? Math.round((done / steps.length) * 100) : 0}"></i></span><span><span data-num="ov-part" data-to="${done}">${done}</span> van ${steps.length} stappen</span></div>` +
    `<div class="ov-btns">${it ? `<button type="button" class="pm-primary pm-small" data-todo-goal="${esc(it.key)}">${goal ? 'Terug naar het verhaal' : 'Zet als doel'}</button>` : ''}` +
    `<button type="button" class="pm-secondary pm-small" data-todo-view="verhaal">Hele verhaal</button>` +
    `${sv.canSkip ? `<button type="button" class="pm-secondary pm-small" data-story-skip>${esc(sv.skipLabel)}</button>` : ''}</div></div></article>`;
}

function goalStrip(world) {
  const g = getGoal();
  if (!g) return '';
  const wait = storyWaiting(world);
  const d = Math.hypot(g.x - world.player.x, g.y - world.player.y);
  return `<div class="ov-goal"><span class="td-pill" data-st="doel">Jouw doel</span><b>${esc(g.name)}</b><small>${[g.sub, formatDistance(d), wait ? `verhaal wacht: ${wait.code}` : ''].filter(Boolean).map(esc).join(' · ')}</small>` +
    '<button type="button" class="pm-secondary pm-small" data-todo-clear>Doel wissen</button></div>';
}

// help: [[action, icon svg, label]] for the contextual buttons (pausemenu.js decides which)
export function renderOverview(el, world, help) {
  refresh(world);
  const near = items.filter((it) => it.dist != null && it.goal && it.goal !== 'story' && !['later', 'slot', 'nu'].includes(it.status))
    .sort((a, b) => a.dist - b.dist).slice(0, 3);
  const ach = nearlyThere();
  el.innerHTML = goalStrip(world) + heroHtml(world) +
    '<div class="ov-cols"><div class="ov-col"><h2>Dichtbij te doen <small>op afstand van jou</small></h2>' +
    (near.length ? near.map((it) => card(it)).join('') : '<p class="pm-note">Niks in de buurt. Kijk bij Te doen.</p>') +
    '</div><div class="ov-col"><h2>Bijna binnen <small>prestaties</small></h2><div class="ov-ach">' +
    (ach.length ? ach.map((a) => `<button type="button" class="ov-a" data-goto="prestaties"><b>${dualHtml(a.title)}</b><small>${esc(a.desc)}</small>` +
      `<span class="td-bar"><i data-bar="ach-${esc(a.id)}" data-w="${Math.round((a.progress.cur / a.progress.goal) * 100)}"></i></span><span class="ov-a-n"><span data-num="ach-${esc(a.id)}" data-to="${a.progress.cur}">${a.progress.cur}</span> van ${a.progress.goal}${a.progress.unit ? ' ' + esc(a.progress.unit) : ''}</span></button>`).join('')
      : '<p class="pm-note">Speel wat rond, dan komen ze vanzelf.</p>') +
    '</div></div></div>' +
    (help.length ? `<div class="ov-help"><span>Hulp</span>${help.map(([a, ic, label]) => `<button type="button" class="pm-secondary pm-small" data-action="${a}">${ic}<span>${esc(label)}</span></button>`).join('')}</div>` : '');
  animateChanges(el);
}

// --- Te doen --------------------------------------------------------------------

const ACT_META = { shop: 'Kopen', require: 'Kopen', sideJob: 'Bijbaantje', night: 'Wachten', pigeon: 'Duif', train: 'Trein', egg: 'Zoeken', padel: 'Padel', kermis: 'Kermis', flight: 'Vliegen', carbid: 'Carbid' };

function stepRow(s) {
  const meta = [ACT_META[s.goal && s.goal.type] || 'Verhaal', s.cost ? `€${s.cost}` : ''].filter(Boolean).join(' · ');
  const st = s.done ? 'klaar' : s.current ? 'nu' : 'later';
  const inner = `${svg(STATUS_ICON[st], 'td-sv td-row-ic')}<span>${esc(s.title)}</span><small>${meta}</small>`;
  return s.current ? `<button type="button" class="td-row" data-st="${st}" data-todo="st:${esc(s.id)}"${ui.sel === 'st:' + s.id ? ' aria-current="true"' : ''}>${inner}</button>`
    : `<div class="td-row" data-st="${st}">${inner}</div>`;
}

function storyHtml() {
  const steps = getStorySteps();
  const jr = getStoryJournal();
  const found = new Set(jr.found.map((c) => c.title));
  const cur = steps.find((s) => s.current);
  if (!ui.open) ui.open = new Set([cur ? cur.part : PART_IDS[PART_IDS.length - 1]]);
  return PART_IDS.map((part) => {
    const P = PARTS[part];
    const list = steps.filter((s) => s.part === part);
    const done = list.filter((s) => s.done).length;
    const clues = CLUES.filter((c) => list.some((s) => s.id === c.step));
    const known = clues.filter((c) => found.has(c.title));
    const open = ui.open.has(part);
    const locked = !P.open || !list.some((s) => s.available);
    const head = `<button type="button" class="td-part-head" data-part-toggle="${part}" aria-expanded="${open}">` +
      `<b>${esc(P.title)}</b>${known.length ? `<span class="td-chip">${known.length} ${known.length === 1 ? 'aanwijzing' : 'aanwijzingen'}</span>` : ''}${locked ? pill('slot') : ''}` +
      `<span class="td-bar"><i data-bar="part-${part}" data-w="${list.length ? Math.round((done / list.length) * 100) : 0}"></i></span><span class="td-count"><span data-num="part-${part}" data-to="${done}">${done}</span> van ${list.length}</span><span class="td-pm">${open ? '–' : '+'}</span></button>`;
    if (!open) return `<section class="td-part">${head}</section>`;
    const first = list.findIndex((s) => !s.done);
    let cut = list.length - 1;
    if (first >= 0 && !ui.more.has(part)) {
      const m = list.findIndex((s, k) => k >= first && s.kind === 'mission' && !s.current);
      if (m >= 0) cut = m;
    }
    const rest = list.length - 1 - cut;
    const body = list.slice(0, cut + 1).map((s) => {
      if (s.kind === 'mission') { const it = byKey.get('m:' + s.mission); return it ? card(it) : ''; }
      return stepRow(s);
    }).join('');
    const more = rest > 0 ? `<button type="button" class="td-more" data-part-more="${part}">+ nog ${rest} ${rest === 1 ? 'stap' : 'stappen'} tot ${esc(list[list.length - 1].title)}</button>` : '';
    const why = cur && cur.part === part && WHY[part] ? `<p class="td-why"><b>Waar het om draait:</b> ${esc(WHY[part])}</p>` : '';
    const clueHtml = clues.length ? `<div class="td-clues"><h4>Wat weten we?</h4>${known.length ? known.map((c) => `<p><b>${c.kind === 'hart' ? '&#9829; ' : ''}${esc(c.title)}</b> ${esc(c.text)}</p>`).join('') : ''}` +
      (known.length < clues.length ? `<p class="pm-note">Nog ${clues.length - known.length} te ontdekken. Speel verder om ze te vinden.</p>` : '') + '</div>' : '';
    return `<section class="td-part" data-open>${head}<div class="td-part-body">${why}${body}${more}${clueHtml}</div></section>`;
  }).join('');
}

function allHtml() {
  const counts = Object.fromEntries(GROUPS.map(([g]) => [g, items.filter((it) => it.group === g).length]));
  const chips = `<div class="td-kinds" role="group" aria-label="Soort"><button type="button" data-todo-kind="alles" aria-pressed="${ui.kind === 'alles'}">Alles<small>${items.filter((it) => it.group !== 'verhaal').length}</small></button>` +
    GROUPS.map(([g, label]) => `<button type="button" data-todo-kind="${g}" aria-pressed="${ui.kind === g}">${label}<small>${counts[g]}</small></button>`).join('') +
    `<button type="button" class="td-sort" data-todo-sort aria-pressed="${ui.near}">Dichtbij eerst</button></div>`;
  const groups = GROUPS.filter(([g]) => ui.kind === 'alles' || ui.kind === g).map(([g, label, sub]) => {
    let list = items.filter((it) => it.group === g);
    if (ui.near) list = [...list].sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
    if (!list.length) return '';
    return `<h2>${label} <small>${list.length} · ${sub}</small></h2><div class="td-grid">${list.map((it) => card(it)).join('')}</div>`;
  }).join('');
  return chips + groups;
}

function nearHtml() {
  const list = items.filter((it) => it.dist != null).sort((a, b) => a.dist - b.dist);
  return `<h2>Dichtbij <small>alles met een plek, dichtstbij eerst</small></h2><div class="td-grid">${list.map((it) => card(it)).join('')}</div>`;
}

function detailHtml(world) {
  const it = byKey.get(ui.sel);
  if (!it) return '<p class="pm-note">Kies iets om te zien wat het is.</p>';
  const d = it.detail || {};
  const sv = getStoryView();
  const rows = (d.rows || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const medals = d.medals ? `<div class="td-medals"><span>Medailles</span>${d.medals.map(([m, text]) => `<p${it.medal >= m ? ' data-on' : ''}><span class="td-pip" data-m="${m}"${it.medal >= m ? ' data-on' : ''}>${'BZG'[m - 1]}</span>${esc(text)}</p>`).join('')}</div>` : '';
  const story = it.goal === 'story';
  let btns = '';
  if (it.isGoal) btns += '<button type="button" class="pm-secondary pm-small" data-todo-clear>Doel wissen</button>';
  else if (it.goal) btns += `<button type="button" class="pm-primary pm-small" data-todo-goal="${esc(it.key)}">${story && getGoal() ? 'Terug naar het verhaal' : 'Zet als doel'}</button>`;
  if (it.dist != null) btns += `<button type="button" class="pm-secondary pm-small" data-todo-map="${esc(it.key)}">Op de kaart</button>`;
  if (it.status === 'nu' && sv.canSkip && (story || it.mission != null)) btns += `<button type="button" class="pm-secondary pm-small" data-story-skip>${esc(sv.skipLabel)}</button>`;
  return `<span class="td-thumb"><img src="${mapIconUrl(it.icon, 72)}" alt=""></span>` +
    `<span class="td-kicker">${esc(d.kicker || '')}${it.dist != null ? ` · ${formatDistance(it.dist)}` : ''}</span><h3>${it.code ? `${esc(it.code)} · ` : ''}${esc(it.title)}</h3>` +
    `<div class="td-dpills">${goalTag(it)}${pill(it.status)}</div>` +
    (d.text ? `<p>${esc(d.text)}</p>` : '') + (rows ? `<dl>${rows}</dl>` : '') + medals +
    (it.record ? `<p class="td-drec">${pips(it.medal)}${esc(it.record)}</p>` : '') +
    (btns ? `<div class="ov-btns">${btns}</div>` : '') + (it.goal == null && it.dist == null ? '<p class="pm-note">Hier is geen route naartoe: dit moet je zelf vinden.</p>' : '');
}

// The sub-tab counts and the sheet subtitle.
export function todoSummary(world) {
  const steps = getStorySteps().filter((s) => s.available);
  const sDone = steps.filter((s) => s.done).length;
  const ms = items.filter((it) => it.group === 'missies');
  const jr = getStoryJournal();
  return {
    verhaal: `${sDone}/${steps.length}`, alles: String(items.filter((it) => it.group !== 'verhaal').length), dichtbij: '',
    sub: `${sDone} van ${steps.length} verhaalstappen · ${ms.filter((it) => it.status === 'klaar').length} van ${ms.length} missies · ${jr.total - jr.found.length} aanwijzingen te vinden`,
  };
}

export function renderTodo(panel, world, view) {
  refresh(world);
  if (!ui.sel || !byKey.has(ui.sel)) {
    const cur = items.find((it) => it.status === 'nu' && (it.goal === 'story' || it.group === 'missies')) || items[0];
    ui.sel = cur ? cur.key : null;
  }
  const list = panel.querySelector(`[data-of="todo"][data-sub="${view}"]`);
  if (list) list.innerHTML = view === 'verhaal' ? storyHtml() : view === 'alles' ? allHtml() : nearHtml();
  for (const sub of panel.querySelectorAll('[data-of="todo"][data-sub]')) if (sub.dataset.sub !== view) sub.innerHTML = '';
  panel.querySelector('.td-detail').innerHTML = detailHtml(world);
  animateChanges(panel);
}

function select(panel, world, key) {
  if (!byKey.has(key)) return;
  ui.sel = key;
  for (const b of panel.querySelectorAll('[data-todo]')) b.toggleAttribute('aria-current', b.dataset.todo === key);
  panel.querySelector('.td-detail').innerHTML = detailHtml(world);
}

// Focus moving onto a card shows its details (arrow keys).
export function todoFocus(panel, world, el) {
  const c = el && el.closest && el.closest('[data-todo]');
  if (c && panel.contains(c) && c.dataset.todo !== ui.sel) select(panel, world, c.dataset.todo);
}

// Enter on a focused card: make it the goal right away.
export function todoEnter(world, key, api) {
  const it = byKey.get(key);
  if (!it || !it.goal) return false;
  chooseTodo(world, it, () => api.rerender());
  return true;
}

export function selectTodo(key) {
  ui.sel = key;
}

// Clicks in Overzicht and Te doen; api: { rerender(), showView(view), showOnMap(x, y) }.
export function todoClick(e, world, panel, api) {
  const t = e.target;
  const goal = t.closest('[data-todo-goal]');
  if (goal) { chooseTodo(world, byKey.get(goal.dataset.todoGoal), () => api.rerender()); return true; }
  if (t.closest('[data-todo-clear]')) { clearGoal(); api.rerender(); return true; }
  const map = t.closest('[data-todo-map]');
  if (map) { const it = byKey.get(map.dataset.todoMap); if (it) api.showOnMap(it.x, it.y); return true; }
  const view = t.closest('[data-todo-view]');
  if (view) { api.showView(view.dataset.todoView); return true; }
  const kind = t.closest('[data-todo-kind]');
  if (kind) { ui.kind = kind.dataset.todoKind; api.rerender(kind); return true; }
  if (t.closest('[data-todo-sort]')) { ui.near = !ui.near; api.rerender(t.closest('[data-todo-sort]')); return true; }
  const part = t.closest('[data-part-toggle]');
  if (part) { const p = part.dataset.partToggle; if (ui.open.has(p)) ui.open.delete(p); else ui.open.add(p); api.rerender(part); return true; }
  const more = t.closest('[data-part-more]');
  if (more) { ui.more.add(more.dataset.partMore); api.rerender(); return true; }
  const c = t.closest('[data-todo]');
  if (c) {
    // Overzicht's cards open the item in Te doen
    if (!panel.querySelector('.td-detail')) { ui.sel = c.dataset.todo; api.showView('dichtbij'); return true; }
    select(panel, world, c.dataset.todo);
    return true;
  }
  return false;
}
