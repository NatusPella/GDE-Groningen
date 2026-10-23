// The pause menu's Overzicht and Te doen sections (pausemenu.js owns the
// shell, keys and focus; this renders their content and handles their
// clicks). Data comes from todo.js; the look is menu.css (m-*) and
// pausemenu.css (ov-*, td-*).
import { wasHelped } from './assistlive.js';
import { getTodoItems, chooseTodo, mapIconUrl, placeName, GROUPS, STATUS_LABEL, buyFjordUpgrade } from './todo.js';
import { getStoryView, getStorySteps, getStoryJournal, requestCredits } from './story.js';
import { PARTS, CLUES, WHY } from './storyarc.js';
import { getAchievementView, getAchievementSummary, getSaveSet, EIERBAL_TOTAL, MEDALS } from './achievements.js';
import { SECRETS_TOTAL } from './geheimen.js';
import { getGoal, clearGoal, storyWaiting } from './goal.js';
import { formatDistance } from './routing.js';
import { dualHtml } from './subtitles.js';
import { fillBars, countTo } from './motion.js';
import { placeShot } from './placeshot.js';
import { todayInfo, todaySpecial, upcoming } from './calendarday.js';
import { calIcon } from './calendar.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PART_IDS = Object.keys(PARTS);

const ui = { kind: 'alles', near: false, sel: null, open: null, more: new Set(), folds: new Set(['clues', 'quick']) };
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
}
let items = [];
let byKey = new Map();

const ICON = {
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  lock: '<rect x="5.5" y="11" width="13" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  chev: '<path d="M9.5 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.4.7-2.4 1.8 0 2.5 5 1.2 5 3.8 0 1.1-1 1.9-2.6 1.9-1.2 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
  cup: '<path d="M7 3h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M12 11v5M8 20h8l-1-4H9z"/>',
};
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

function refresh(world) {
  items = getTodoItems(world);
  byKey = new Map(items.map((it) => [it.key, it]));
}


export const isFolded = (id) => ui.folds.has(id);

// a folded group (pausemenu.js tells us which ones are open)
export function foldNote(id, on) {
  if (on) ui.folds.add(id); else ui.folds.delete(id);
}

// --- rows -------------------------------------------------------------------------

const medalDot = (m) => (m == null ? '' : `<span class="m-medal m${m}" title="${m ? MEDALS[m] : 'Nog geen medaille'}"></span>`);

// the right-hand end of a row: your goal, its status, the distance
function endOf(it) {
  const bits = [];
  if (it.isGoal) bits.push('<span class="t g">Jouw doel</span>');
  else if (it.status === 'nu') bits.push('<span class="t g">Nu</span>');
  else if (it.status === 'klaar' && it.medal == null) bits.push(svg(ICON.check));
  else if (it.status === 'later') bits.push(`<span class="t">${STATUS_LABEL.later}</span>`);
  else if (it.status === 'slot') bits.push(`${svg(ICON.lock)}<span class="t">${STATUS_LABEL.slot}</span>`);
  if (it.dist != null) bits.push(`<span class="v">${formatDistance(it.dist)}</span>`);
  return bits.join('');
}

function row(it, extra = '') {
  const off = it.status === 'later' || it.status === 'slot' || (it.status === 'klaar' && it.medal == null);
  return `<button type="button" class="m-li${off ? ' off' : ''}${extra}" data-todo="${esc(it.key)}" data-status="${it.status || ''}"${it.isGoal ? ' data-goal' : ''}${ui.sel === it.key ? ' aria-current="true"' : ''}>` +
    `<span class="nm"><span class="one">${it.code ? `${esc(it.code)} · ` : ''}${esc(it.title)}</span><span class="mut one">${esc(it.record && it.status !== 'nu' && it.status !== 'later' ? it.record : it.meta)}</span></span>` +
    `${medalDot(it.medal)}${endOf(it)}</button>`;
}

// --- Overzicht ------------------------------------------------------------------

function nearlyThere() {
  const out = [];
  for (const cat of getAchievementView()) {
    for (const a of cat.items) if (!a.unlocked && !a.hidden && a.progress && a.progress.cur > 0) out.push(a);
  }
  return out.sort((a, b) => b.progress.cur / b.progress.goal - a.progress.cur / a.progress.goal).slice(0, 3);
}

const PIN_SVG = '<svg class="ov-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>';
const heroShotHtml = (url) => `<img class="ov-shot" src="${url}" alt="">`;

// the still arrives a frame after the menu opened: swap it in
function showHeroShot(key, url) {
  const hero = document.querySelector(`[data-todo-hero="${CSS.escape(key)}"]`);
  if (hero && !hero.querySelector('.ov-shot')) hero.insertAdjacentHTML('afterbegin', heroShotHtml(url));
}

function goalLine(world) {
  const g = getGoal();
  if (!g) return '';
  const wait = storyWaiting(world);
  const d = Math.hypot(g.x - world.player.x, g.y - world.player.y);
  return `<span class="ov-goal mut">${svg(ICON.flag)}<span class="one">Doel: ${esc(g.name)}${[formatDistance(d), wait ? `verhaal wacht: ${wait.code}` : ''].filter(Boolean).map((t) => ' · ' + esc(t)).join('')}</span>` +
    '<button type="button" class="m-bt" data-todo-clear>Doel wissen</button></span>';
}

function heroHtml(world) {
  const sv = getStoryView();
  if (sv.end) {
    const e = sv.ending;
    const open = e && !e.done ? [...e.challenges.map((c) => c.name), ...e.missions.map((m) => `${m.code} · ${m.title}`)] : [];
    const text = open.length
      ? `Nog te doen voor de aftiteling: ${open.join(', ')}. Een overgeslagen missie telt pas als je hem alsnog haalt.`
      : 'Speel missies opnieuw als klus voor een betere medaille, verdien bij met een bijbaantje of zoek wat er nog verstopt ligt.';
    return `<article class="ov-hero"><div class="ov-main"><span class="m-eb">Het verhaal</span><h1 class="ov-title">${esc(sv.title)}</h1><p class="ov-lead">${esc(text)}</p></div>` +
      `<div class="m-acts"><button type="button" class="m-bp" data-action="resume">Doorgaan <span class="m-kc dark">Esc</span></button><button type="button" class="m-bg" data-todo-view="alles">Alles te doen</button>` +
      `${e && e.credits ? '<button type="button" class="m-bg" data-story-credits>Aftiteling bekijken</button>' : ''}</div>${goalLine(world)}</article>`;
  }
  const steps = getStorySteps().filter((s) => s.part === sv.part && s.available);
  const done = steps.filter((s) => s.done).length;
  const cur = getStorySteps().find((s) => s.current);
  const it = cur ? byKey.get(cur.kind === 'mission' ? 'm:' + cur.mission : 'st:' + cur.id) : null;
  const goal = getGoal();
  const title = cur && cur.kind === 'mission' ? `${cur.id} · ${cur.title}` : sv.title;
  const where = it && it.x != null ? placeName(world, it.x, it.y) : '';
  const shot = it && it.x != null ? placeShot(world, it.key, it.x, it.y, (url) => showHeroShot(it.key, url)) : null;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  return `<article class="ov-hero"${it ? ` data-todo-hero="${esc(it.key)}"` : ''}>${shot ? heroShotHtml(shot) : ''}` +
    `<div class="ov-main"><span class="m-eb">Het verhaal · ${esc(PARTS[sv.part].title)}</span>` +
    `<h1 class="ov-title${title.length > 20 ? " long" : ""}">${esc(title)}</h1>${cur && cur.lead ? `<p class="ov-lead">${esc(cur.lead)}</p>` : ''}` +
    `<div class="ov-prog"><span class="m-bar"><i data-bar="ov-part" data-w="${pct}"></i></span><span class="mut">Stap <span data-num="ov-part" data-to="${done}">${done}</span> van ${steps.length}${where ? ` · ${esc(where)}` : ''}</span></div></div>` +
    `<div class="m-acts ov-acts"><button type="button" class="m-bp" data-action="resume">Doorgaan <span class="m-kc dark">Esc</span></button>` +
    `${it && !goal ? `<button type="button" class="m-bg" data-todo-goal="${esc(it.key)}">Zet als doel</button>` : ''}` +
    `${it && goal ? `<button type="button" class="m-bg" data-todo-goal="${esc(it.key)}">Terug naar het verhaal</button>` : ''}` +
    `<button type="button" class="m-bg" data-goto="map">${svg(ICON.pin)}Kaart</button>` +
    `<button type="button" class="m-bg" data-todo-view="verhaal">Alle opdrachten</button>` +
    `${sv.canSkip ? `<button type="button" class="m-bt" data-story-skip>${esc(sv.skipLabel)}</button>` : ''}</div>${goalLine(world)}</article>`;
}

// Today and the coming special days (calendarday.js)
function agendaHtml(world) {
  const t = todayInfo(world), sp = todaySpecial(world);
  const list = upcoming(world, 4).filter((u) => !sp || u.s.id !== sp.id);
  const item = (icon, name, when, on) => `<li${on ? ' data-on' : ''}>${calIcon(icon, 'ov-ag-ic')}<b>${esc(name)}</b><span class="mut">${esc(when)}</span></li>`;
  const inner = `<ul class="ov-agenda">` + (sp ? item(sp.icon, sp.name, 'vandaag', true) : '') + list.map((u) => item(u.s.icon, u.s.name, u.label, false)).join('') +
    (!sp && !list.length ? '<li><span class="mut">Geen bijzondere dagen meer. Het blijft zomer.</span></li>' : '') + '</ul>';
  return disc('agenda', 'Agenda', `${t.long} · ${t.nazomer ? 'de nazomer houdt aan' : `zomerdag ${t.n}`}`, inner);
}

function disc(id, title, hint, inner) {
  const open = ui.folds.has(id);
  return `<button type="button" class="m-disc" data-fold="${id}" aria-expanded="${open}" aria-controls="pm-f-${id}">${svg(ICON.chev)}<b>${esc(title)}</b><span class="mut one">${esc(hint)}</span></button>` +
    `<div class="m-fold" id="pm-f-${id}" data-fold-body="${id}"${open ? '' : ' hidden'}>${inner}</div>`;
}

// The state of the game in four tiles: a quick look, no text to read (#34, #92)
function tilesHtml(world, extra) {
  const ms = items.filter((it) => it.group === 'missies');
  const mDone = ms.filter((it) => it.status === 'klaar').length;
  const ach = getAchievementSummary();
  const found = getSaveSet('eierballen').size + getSaveSet('geheimen').size, all = EIERBAL_TOTAL + SECRETS_TOTAL;
  const min = Math.floor((extra.play || 0) / 60);
  const play = min < 1 ? 'net begonnen' : min < 60 ? `${min} min` : `${Math.floor(min / 60)} u ${String(min % 60).padStart(2, '0')}`;
  const tile = (ic, label, val, pct, goto) => `<button type="button" class="ov-tile" ${goto ? `data-goto="${goto}"` : 'tabindex="-1"'} aria-label="${esc(label)}: ${esc(val)}">${svg(ic)}<span class="ov-tv${val.length > 7 ? ' long' : ''}">${esc(val)}</span><span class="ov-tl mut">${esc(label)}</span>${pct == null ? '' : `<span class="m-bar"><i style="width:${pct}%"></i></span>`}</button>`;
  return '<div class="ov-tiles">' +
    tile(ICON.coin, 'Geld', `€${Math.floor(world.money || 0).toLocaleString('nl-NL')}`, null, 'spullen') +
    tile(ICON.clock, 'Speeltijd', play, null, '') +
    tile(ICON.flag, 'Missies klaar', `${mDone}/${ms.length}`, ms.length ? Math.round((mDone / ms.length) * 100) : 0, 'todo') +
    tile(ICON.cup, 'Prestaties', `${ach.done}/${ach.total}`, ach.pct, 'prestaties') +
    tile(ICON.pin, 'Gevonden', `${found}/${all}`, all ? Math.round((found / all) * 100) : 0, 'todo') + '</div>';
}

// help: [[action, icon svg, label]] for the contextual buttons (pausemenu.js decides which)
// extra: { play: seconds played, quick: html of the quick settings }
export function renderOverview(el, world, help, extra = {}) {
  refresh(world);
  const near = items.filter((it) => it.dist != null && it.goal && it.goal !== 'story' && !['later', 'slot', 'nu'].includes(it.status))
    .sort((a, b) => a.dist - b.dist).slice(0, 3);
  const ach = nearlyThere();
  const helpHtml = `<div class="ov-help">${help.map(([a, ic, label]) => `<button type="button" class="m-bg" data-action="${a}">${ic}<span>${esc(label)}</span></button>`).join('')}</div>`;
  // a running mission can be stopped from here (#390): the button asks "Missie stoppen?" first (pausemenu.js); stopping is no failure
  const stopHtml = extra.stop ? `<div class="ov-stop"><div class="m-gh"><span>Missie bezig</span></div><div class="m-li pm-row"><span class="nm"><span class="one">${esc(extra.stop.title)}</span></span><button type="button" class="m-bg" data-action="mission-stop">${ICON.stop || ''}<span>Missie stoppen</span></button></div>` +
    '<div class="pm-confirm" data-stop-confirm hidden><p>Missie stoppen?</p><p class="m-note">Je krijgt geen straf en je kunt hem opnieuw starten. Wat je in deze poging deed, telt niet mee.</p>' +
    '<div class="m-acts"><button type="button" class="m-bp" data-action="mission-stop-go">Ja, stoppen</button><button type="button" class="m-bt" data-action="mission-stop-no">Nee, doorgaan</button></div></div></div>' : '';
  el.innerHTML = heroHtml(world) + stopHtml + tilesHtml(world, extra) +
    '<div class="ov-cols"><section aria-label="Dichtbij" class="ov-col"><div class="m-gh"><span>Dichtbij</span></div>' +
    (near.length ? `<div class="ov-rows">${near.map((it) => row(it)).join('')}</div>` : '<p class="m-note">Niks in de buurt. Kijk bij Te doen.</p>') +
    '</section><section aria-label="Bijna binnen" class="ov-col"><div class="m-gh"><span>Bijna binnen</span></div>' +
    (ach.length ? `<div class="ov-rows">${ach.map((a) => `<button type="button" class="m-li ov-a" data-goto="prestaties"><span class="nm"><span class="ov-a-t"><span class="one">${dualHtml(a.title)}</span>` +
      `<span class="v"><span data-num="ach-${esc(a.id)}" data-to="${a.progress.cur}">${a.progress.cur}</span>/${a.progress.goal}</span></span>` +
      `<span class="m-bar"><i data-bar="ach-${esc(a.id)}" data-w="${Math.round((a.progress.cur / a.progress.goal) * 100)}"></i></span></span></button>`).join('')}</div>`
      : '<p class="m-note">Speel wat rond, dan komen ze vanzelf.</p>') +
    '</section></div><div class="ov-folds"><div class="m-rule"></div>' +
    (extra.quick ? disc('quick', 'Snel instellen', 'Geluid en beweging', extra.quick) : '') + disc('help', 'Vastgelopen?', 'Naar huis of jezelf vrijzetten', helpHtml) + agendaHtml(world) + '</div>';
  animateChanges(el);
}

// --- Te doen --------------------------------------------------------------------

const ACT_META = { shop: 'Kopen', require: 'Kopen', sideJob: 'Bijbaantje', night: 'Wachten', pigeon: 'Duif', train: 'Trein', hideout: 'Kies: trein, ijsje of zonsondergang', egg: 'Zoeken', padel: 'Padel', kermis: 'Kermis', flight: 'Vliegen', carbid: 'Carbid' };

function stepRow(s) {
  const meta = [ACT_META[s.goal && s.goal.type] || 'Verhaal', s.cost ? `€${s.cost}` : '', s.done && wasHelped(s.id) ? 'met hulp' : ''].filter(Boolean).join(' · ');
  const st = s.done ? 'klaar' : s.current ? 'nu' : 'later';
  const end = st === 'klaar' ? svg(ICON.check) : st === 'nu' ? '<span class="t g">Nu</span>' : '<span class="t">Later</span>';
  const inner = `<span class="nm"><span class="one">${esc(s.title)}</span><span class="mut one">${esc(meta)}</span></span>${end}`;
  return s.current ? `<button type="button" class="m-li" data-st="${st}" data-todo="st:${esc(s.id)}"${ui.sel === 'st:' + s.id ? ' aria-current="true"' : ''}>${inner}</button>`
    : `<div class="m-li off" data-st="${st}">${inner}</div>`;
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
    const count = `<span class="v">${locked ? '' : `<span data-num="part-${part}" data-to="${done}">${done}</span>/${list.length}`}</span>`;
    if (!open) {
      return `<button type="button" class="m-li off" data-part-toggle="${part}" aria-expanded="false"><span class="nm one">${esc(P.title)}</span>` +
        `${locked ? `${svg(ICON.lock)}<span class="t">Op slot</span>` : `${count}${done === list.length ? svg(ICON.check) : ''}`}</button>`;
    }
    const first = list.findIndex((s) => !s.done);
    let cut = list.length - 1;
    if (first >= 0 && !ui.more.has(part)) {
      const m = list.findIndex((s, k) => k >= first && s.kind === 'mission' && !s.current);
      if (m >= 0) cut = m;
    }
    const rest = list.length - 1 - cut;
    const body = list.slice(0, cut + 1).map((s) => {
      if (s.kind === 'mission') { const it = byKey.get('m:' + s.mission); return it ? row(it) : ''; }
      return stepRow(s);
    }).join('');
    const more = rest > 0 ? `<button type="button" class="m-more" data-part-more="${part}">Nog ${rest} ${rest === 1 ? 'stap' : 'stappen'} tot ${esc(list[list.length - 1].title)}</button>` : '';
    const why = cur && cur.part === part && WHY[part] ? `<p class="m-note"><b>Waar het om draait:</b> ${esc(WHY[part])}</p>` : '';
    const clueInner = known.map((c) => `<p class="m-note"><b>${c.kind === 'hart' ? '&#9829; ' : ''}${esc(c.title)}</b> ${esc(c.text)}</p>`).join('') +
      (known.length < clues.length ? `<p class="m-note">Nog ${clues.length - known.length} te ontdekken. Speel verder om ze te vinden.</p>` : '');
    const clueHtml = clues.length ? disc('clues', 'Wat weten we?', known.length ? `${known.length} ${known.length === 1 ? 'aanwijzing' : 'aanwijzingen'}` : 'Nog niets gevonden', clueInner) : '';
    return `<button type="button" class="m-gh m-ghbtn" data-part-toggle="${part}" aria-expanded="true"><span class="cur">${esc(P.title)}</span><span><span data-num="part-${part}" data-to="${done}">${done}</span> van ${list.length}</span></button>` +
      `<div class="m-bar td-pbar"><i data-bar="part-${part}" data-w="${list.length ? Math.round((done / list.length) * 100) : 0}"></i></div>${body}${more}${why}${clueHtml}`;
  }).join('');
}

const SHOW_FIRST = 4;

function allHtml() {
  const counts = Object.fromEntries(GROUPS.map(([g]) => [g, items.filter((it) => it.group === g).length]));
  const total = items.filter((it) => it.group !== 'verhaal').length;
  const chips = `<div class="m-chips" role="radiogroup" aria-label="Soort"><button type="button" class="m-chip" role="radio" data-todo-kind="alles" aria-checked="${ui.kind === 'alles'}">Alles <span>${total}</span></button>` +
    GROUPS.map(([g, label]) => `<button type="button" class="m-chip" role="radio" data-todo-kind="${g}" aria-checked="${ui.kind === g}">${label} <span>${counts[g]}</span></button>`).join('') + '</div>';
  const groups = GROUPS.filter(([g]) => ui.kind === 'alles' || ui.kind === g).map(([g, label, sub]) => {
    let list = items.filter((it) => it.group === g);
    if (ui.near) list = [...list].sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
    if (!list.length) return '';
    const all = ui.kind !== 'alles' || ui.more.has('g:' + g);
    const shown = all ? list : list.slice(0, SHOW_FIRST);
    // the one you picked stays in view
    const sel = list.find((it) => it.key === ui.sel);
    if (!all && sel && !shown.includes(sel)) shown[shown.length - 1] = sel;
    const rest = list.length - shown.length;
    return `<div class="m-gh"><span>${label}</span><span>${rest > 0 || all ? `${list.length} · ` : ''}${sub}</span></div>${shown.map((it) => row(it)).join('')}` +
      (rest > 0 ? `<button type="button" class="m-more" data-grp-more="${g}">Nog ${rest} ${esc(label.toLowerCase())}</button>` : '');
  }).join('');
  return chips + groups;
}

function nearHtml() {
  const list = items.filter((it) => it.dist != null).sort((a, b) => a.dist - b.dist);
  return `<div class="m-gh"><span>Dichtbij</span><span>alles met een plek, dichtstbij eerst</span></div>${list.map((it) => row(it)).join('')}`;
}

function factHtml(k, v) {
  const s = String(v);
  return `<div class="m-fact"><span>${esc(k)}</span><span class="${s.length > 13 ? 'td-fv' : 'm-num'}">${esc(s)}</span></div>`;
}

function detailHtml(world) {
  const it = byKey.get(ui.sel);
  if (!it) return '<p class="mut">Kies iets om te zien wat het is.</p>';
  const d = it.detail || {};
  const sv = getStoryView();
  const rows = (d.rows || []).map(([k, v]) => factHtml(k, v)).join('');
  const medals = d.medals ? `<div class="m-row2"><span class="mut">Medailles</span>${d.medals.map(([m, text]) => `<span${it.medal >= m ? '' : ' class="mut"'}><span class="m-medal m${m}"></span>${esc(text)}</span>`).join('')}</div>` : '';
  const story = it.goal === 'story';
  let primary = '';
  if (it.upgrade && it.status !== 'klaar') primary = `<button type="button" class="m-bp" data-todo-buy="${esc(it.upgrade)}">Kopen (${esc(it.record)})</button>`;
  else if (it.goal && !it.isGoal) primary = `<button type="button" class="m-bp" data-todo-goal="${esc(it.key)}">${svg(ICON.flag)}${story && getGoal() ? 'Terug naar het verhaal' : 'Zet als doel'}</button>`;
  let more = '';
  if (it.isGoal) more += '<button type="button" class="m-bg" data-todo-clear>Doel wissen</button>';
  if (it.dist != null) more += `<button type="button" class="m-bg" data-todo-map="${esc(it.key)}">${svg(ICON.pin)}Op de kaart</button>`;
  let quiet = '';
  if (it.status === 'nu' && sv.canSkip && (story || it.mission != null)) quiet += `<button type="button" class="m-bt" data-story-skip>${esc(sv.skipLabel)}</button>`;
  if (it.stopJob) quiet += '<button type="button" class="m-bt danger" data-todo-stopjob>Dienst stoppen</button>';
  const acts = primary + more + (quiet ? `<span class="m-grow"></span>${quiet}` : '');
  const kick = [d.kicker, it.dist != null ? formatDistance(it.dist) : ''].filter(Boolean).join(' · ');
  return `<div class="pm-pane-top"><span class="m-eb">${esc(kick)}</span><h2 class="m-h2 td-h2">${it.code ? `${esc(it.code)} · ` : ''}${esc(it.title)}</h2></div>` +
    (d.text ? `<p>${esc(d.text)}</p>` : '') + (rows ? `<div class="m-facts">${rows}</div>` : '') + medals +
    (it.record ? `<p class="mut">${medalDot(it.medal)} ${esc(it.record)}</p>` : '') +
    '<span class="m-grow"></span>' +
    (acts ? `<div class="m-acts td-acts">${acts}</div>` : '') + (it.goal == null && it.dist == null ? '<p class="mut">Hier is geen route naartoe: dit moet je zelf vinden.</p>' : '');
}

// The sub-tab counts and the sheet subtitle.
export function todoSummary(world) {
  const steps = getStorySteps().filter((s) => s.available);
  const sDone = steps.filter((s) => s.done).length;
  const ms = items.filter((it) => it.group === 'missies');
  const jr = getStoryJournal();
  const end = getStoryView().ending;
  const toEnd = end && !end.done ? ` · nog ${end.count} tot het einde` : '';
  return {
    verhaal: '', opdrachten: '', alles: String(items.filter((it) => it.group !== 'verhaal').length), dichtbij: String(items.filter((it) => it.dist != null && it.dist < 600).length || ''),
    subTodo: `${items.filter((it) => it.group !== 'verhaal').length} dingen te doen · ${items.filter((it) => it.dist != null && it.dist < 600).length} dichtbij`,
    sub: `${sDone} van ${steps.length} verhaalstappen · ${ms.filter((it) => it.status === 'klaar').length} van ${ms.length} missies · ${jr.total - jr.found.length} aanwijzingen te vinden${toEnd}`,
  };
}

// Verhaal > Opdrachten (#430): de verhaalstappen en missies, met dezelfde lijst en dezelfde details als eerst onder Te doen.
export function renderTodoStory(el, world) {
  refresh(world);
  if (!ui.sel || !byKey.has(ui.sel)) {
    const cur = items.find((it) => it.status === 'nu' && (it.goal === 'story' || it.group === 'missies')) || items[0];
    ui.sel = cur ? cur.key : null;
  }
  el.querySelector('.td-list').innerHTML = storyHtml();
  el.querySelector('.td-detail').innerHTML = detailHtml(world);
  animateChanges(el);
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
  const sort = panel.querySelector('[data-todo-sort]');
  if (sort) { sort.hidden = view !== 'alles'; sort.setAttribute('aria-pressed', String(ui.near)); }
  panel.querySelector('.td-detail').innerHTML = detailHtml(world);
  animateChanges(panel);
}

function select(panel, world, key) {
  if (!byKey.has(key)) return;
  ui.sel = key;
  for (const b of panel.querySelectorAll('[data-todo]')) b.toggleAttribute('aria-current', b.dataset.todo === key);
  panel.querySelector('.td-detail').innerHTML = detailHtml(world);
}

// Focus moving onto a row shows its details (arrow keys).
export function todoFocus(panel, world, el) {
  const c = el && el.closest && el.closest('[data-todo]');
  if (c && panel.contains(c) && c.dataset.todo !== ui.sel) select(panel, world, c.dataset.todo);
}

// Enter on a focused row: make it the goal right away.
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
  const buy = t.closest('[data-todo-buy]');
  if (buy) { world.addMessage(buyFjordUpgrade(world, buy.dataset.todoBuy), 3); api.rerender(); return true; }
  if (t.closest('[data-todo-stopjob]')) {
    if (world.sideJobActions && world.sideJobActions.active()) { world.sideJobActions.stop(); world.addMessage('Dienst gestopt', 3); }
    api.rerender();
    return true;
  }
  if (t.closest('[data-story-credits]')) { if (requestCredits() && api.close) api.close(); return true; }
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
  const gmore = t.closest('[data-grp-more]');
  if (gmore) { ui.more.add('g:' + gmore.dataset.grpMore); api.rerender(); return true; }
  const c = t.closest('[data-todo]');
  if (c) {
    // Overzicht's rows open the item in Te doen
    if (!panel.querySelector('.td-detail')) { ui.sel = c.dataset.todo; api.showView('dichtbij'); return true; }
    select(panel, world, c.dataset.todo);
    return true;
  }
  return false;
}
