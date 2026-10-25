// Pause-menu view for achievements.js: the Prestaties section. Tabs Alles,
// Bijna binnen and Behaald; in Alles the categories fold open to their
// prestaties, the one you pick is explained beside the list. Lifetime
// figures, medals per mission and the job records fold at the bottom.
import { dualHtml } from './subtitles.js';
import {
  getAchievementView, getAchievementSummary, getLifetimeStats, getMissionRecord, formatMissionTime,
  MISSION_GOALS, isRetiredMission, MEDALS, EIERBAL_TOTAL, getStat, unseenAchievementCount, isAchievementFresh, markAchievementsSeen,
} from './achievements.js';
import { SIDE_JOBS } from './sidejobs.js';
import { getOverzicht } from './gebiedenlive.js';
import { iconSvg } from './achievementicons.js';
import { fillBars, countTo } from './motion.js';
import { achPct as pctOf, achNear, achDone, achCategoryOrder, achCategoryPct, achWhen, ringDash } from './menumodels.js';

const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="11" width="13" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

let tabView = 'alles';
let sel = null;
const openCats = new Set();
const openExtra = new Set();
const bars = new Map();
let shownPct = null;
let freshIds = new Set();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n, d = 0) => n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });

function fmtAmount(v, unit) {
  if (unit === 'm') return v >= 1000 ? `${nl(v / 1000, v >= 100000 ? 0 : 1)} km` : `${nl(Math.floor(v))} m`;
  if (unit === '€') return `€${nl(Math.floor(v))}`;
  if (unit === 's') return formatMissionTime(v);
  if (unit === 'km/u') return `${nl(Math.floor(v))} km/u`;
  return nl(Math.floor(v));
}


const whenText = (at) => achWhen(at, Date.now(), new Date(at).getTimezoneOffset(), (t) => new Date(t).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }));

function row(it, catLabel) {
  const title = it.hidden ? '???' : dualHtml(it.title);
  let end = '';
  if (it.unlocked) end = freshIds.has(it.id) ? '<span class="t g">nieuw</span>' + CHECK : CHECK;
  else if (it.hidden) end = LOCK;
  else if (it.progress && it.progress.cur > 0) end = `<span class="v">${fmtAmount(it.progress.cur, it.progress.unit)}/${fmtAmount(it.progress.goal, it.progress.unit)}</span>`;
  return `<button type="button" class="m-li${it.unlocked ? '' : ' off'}${sel === it.id ? ' sel' : ''}" data-ach="${esc(it.id)}" data-cat-label="${esc(catLabel)}"${sel === it.id ? ' aria-current="true"' : ''}>` +
    `<span class="pa-ico">${iconSvg(it)}</span><span class="nm"><span class="one">${title}</span>${it.unlocked && it.at ? `<span class="mut one">${whenText(it.at)}</span>` : ''}</span>${end}</button>`;
}

function disc(id, title, hintHtml, inner, open, attr) {
  return `<button type="button" class="m-disc" ${attr} aria-expanded="${open}">${CHEV}<b>${esc(title)}</b>${hintHtml}</button>` +
    `<div class="m-fold" ${open ? '' : 'hidden'}>${inner}</div>`;
}

// a progress ring with the figure in the middle
function ring(pct, label, size = 96) {
  const { circ, dash, pct: p } = ringDash(pct);
  return `<span class="pa-ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" cx="50" cy="50" r="40" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 50 50)"/></svg><span class="bebas">${label != null ? label : p + '%'}</span></span>`;
}

function medalsBlock() {
  return '<div class="pa-grid">' + MISSION_GOALS.map((g, i) => {
    const r = getMissionRecord(i);
    if (isRetiredMission(i) && !(r && (r.medal || r.runs))) return '';
    const m = r ? r.medal : 0;
    const best = r && r.best != null ? `record ${formatMissionTime(r.best)}` : 'nog niet gespeeld';
    return `<div class="pa-cell"><span>${esc(g.name)}</span><span class="mut"><span class="m-medal m${m}"></span> ${m ? MEDALS[m] : 'Geen medaille'} · ${best}</span></div>`;
  }).join('') + '</div>';
}

function jobRecordsBlock() {
  return '<div class="pa-grid">' + SIDE_JOBS.map((j) => {
    const streak = getStat(`sj_${j.id}_streak`);
    const shift = getStat(`sj_${j.id}_shift`);
    return `<div class="pa-cell"><span>${esc(j.name)}</span><span class="mut">${streak ? `${streak} op rij · beste dienst €${shift.toLocaleString('nl-NL')}` : 'nog niet gewerkt'}</span></div>`;
  }).join('') + '</div>';
}

function figuresBlock(st) {
  const figs = [
    ['Gelopen', fmtAmount(st.walked, 'm')], ['Gezwommen', fmtAmount(st.swum, 'm')], ['Rakelings', nl(st.nearMiss)], ['Gejat', nl(st.stolen)],
    ['Wrakken', nl(st.wrecks)], ['Kusjes', nl(st.kisses)], ['Treinritten', nl(st.trainTrips)], ['Bijbaan-loon', `€${nl(getStat('sjEarned'))}`],
    ['Eierballen', `${st.eierballen}/${EIERBAL_TOTAL}`], ['Wijken', `${st.wijken}/66`], ['Gereden', fmtAmount(st.driven, 'm')], ['Topsnelheid', fmtAmount(st.topSpeed, 'km/u')],
  ];
  return `<div class="pa-grid">${figs.map(([k, v]) => `<div class="pa-cell"><span class="mut">${k}</span><span class="bebas">${v}</span></div>`).join('')}</div>`;
}

// De gebieden en de kaart als ringen (#435): dezelfde stand die de prestaties hierboven tellen (buurt tot provincie).
function gebiedenBlock() {
  const o = getOverzicht();
  if (!o) return '<p class="m-note">De kaart wordt nog ingeladen. Probeer het zo nog eens.</p>';
  const cel = (naam, klaar, totaal) => {
    const pct = totaal ? (klaar / totaal) * 100 : 0;
    return `<div class="pa-cell"><span>${esc(naam)}</span><span class="mut" style="display:flex;align-items:center;gap:12px">${ring(pct, null, 64)}<span>${klaar} van ${totaal}</span></span></div>`;
  };
  const rijen = [cel('Kaart verkend', o.kaart.gedaan, o.kaart.totaal)];
  for (const n of o.overzicht) rijen.push(cel(n.niveau.naam, n.voltooid, n.gebieden.length));
  return `<div class="pa-grid">${rijen.join('')}</div>`;
}

// De stand van het gebied waar deze prestatie over gaat (#435), zodat de ring met het aantal gebieden erbij klopt.
function layerText(id) {
  const o = getOverzicht();
  if (!o) return '';
  if (id.startsWith('kaart_')) return `<p class="mut">Je hebt ${o.kaart.gedaan} van ${o.kaart.totaal} buurten gezien.</p>`;
  if (!id.startsWith('gebied_')) return '';
  const n = o.overzicht.find((x) => x.niveau.id === id.slice(7));
  return n ? `<p class="mut">Stand van de ${esc(n.niveau.naam.toLowerCase())}: ${n.voltooid} van ${n.gebieden.length} veroverd.</p>` : '';
}

function detailHtml(it, catLabel) {
  if (!it) return '<p class="mut">Kies een prestatie om te zien wat je ervoor doet.</p>';
  const title = it.hidden ? '???' : dualHtml(it.title);
  const desc = it.hidden ? 'Geheim. Blijf rondkijken in Grunn.' : esc(it.desc);
  let prog = '';
  if (!it.hidden && it.progress && !it.unlocked) {
    const { cur, goal, unit } = it.progress;
    prog = `<div class="pa-prog">${ring(pctOf(it), null, 120)}<span class="m-num">${fmtAmount(cur, unit)} <span class="mut">/ ${fmtAmount(goal, unit)}</span></span><span class="m-bar on"><i data-bar="d-${esc(it.id)}" data-w="${pctOf(it).toFixed(1)}"></i></span></div>`;
  }
  return `<div class="pm-pane-top"><span class="m-eb">${esc(catLabel || 'Prestatie')}</span><h2 class="m-h2 td-h2"><span class="pa-ico big">${iconSvg(it)}</span>${title}</h2></div><p>${desc}</p>${prog}${it.hidden ? '' : layerText(it.id)}` +
    (it.unlocked ? `<p class="g">Behaald${it.at ? ` · ${whenText(it.at)}` : ''}</p>` : '') +
    (it.hidden ? '' : !it.unlocked && !it.progress ? '<p class="mut">Nog niet behaald.</p>' : '');
}

export function renderAchievementsPanel(el, { keepFresh = false } = {}) {
  if (!el) return;
  const view = getAchievementView();
  if (!keepFresh) freshIds = new Set(view.flatMap((c) => c.items).filter((a) => isAchievementFresh(a.id)).map((a) => a.id));
  if (unseenAchievementCount()) markAchievementsSeen();
  const sum = getAchievementSummary();
  const st = getLifetimeStats();
  const all = view.flatMap((c) => c.items.map((a) => ({ ...a, catLabel: c.label })));
  const near = achNear(all);
  const done = achDone(all);
  if (sel && !all.some((a) => a.id === sel)) sel = null;
  const selItem = all.find((a) => a.id === sel);
  const tab = (id, label, n) => `<button type="button" role="tab" class="m-tab" data-achview="${id}" aria-selected="${tabView === id}">${label}${n != null ? `<small>${n}</small>` : ''}</button>`;
  const extras = [['gebieden', 'Gebieden', 'buurt tot provincie', gebiedenBlock()], ['cijfers', 'Cijfers', 'sinds je eerste spel', figuresBlock(st)], ['medailles', 'Medailles', 'per missie', medalsBlock()], ['records', 'Records', 'per bijbaantje', jobRecordsBlock()]];
  let list;
  if (tabView === 'bijna') list = near.length ? near.map((a) => row(a, a.catLabel)).join('') : '<p class="m-note">Speel wat rond, dan komen ze vanzelf.</p>';
  else if (tabView === 'behaald') list = done.length ? done.map((a) => row(a, a.catLabel)).join('') : '<p class="m-note">Nog niks behaald. Dat komt vanzelf.</p>';
  else {
    list = view.map((c) => {
      const open = openCats.has(c.cat);
      const pct = achCategoryPct(c);
      const items = achCategoryOrder(c.items);
      const inner = items.map((a) => row(a, c.label)).join('');
      return disc(c.cat, c.label, `<span class="m-bar${open ? ' on' : ''}"><i data-bar="cat-${c.cat}" data-w="${pct}"></i></span><span class="bebas">${c.done}/${c.items.length}</span>`, inner, open, `data-achcat="${c.cat}"`);
    }).join('') + '<div class="m-rule"></div>' +
      extras.map(([id, t, hint, inner]) => disc(id, t, `<span class="mut">${hint}</span>`, inner, openExtra.has(id), `data-achextra="${id}"`)).join('');
  }
  el.dataset.sub = `${all.some((a) => a.hidden) ? `${all.filter((a) => a.hidden).length} verborgen · ` : ''}blijven bewaard`;
  el.innerHTML = `<div class="m-tabs"><nav class="m-tablist" role="tablist" aria-label="Weergave">${tab('alles', 'Alles')}${tab('bijna', 'Bijna binnen', near.length)}${tab('behaald', 'Behaald', done.length)}</nav>` +
    `<span class="m-grow"></span><span class="pa-total">${ring(sum.total ? (sum.done / sum.total) * 100 : 0, null, 56)}<span class="m-num" data-pa-pct>${sum.done}</span><span class="mut">van ${sum.total} behaald</span></span></div>` +
    `<div class="m-main"><div class="m-list pa-list">${list}</div><aside class="m-pane pa-pane" aria-live="polite">${detailHtml(selItem, selItem && selItem.catLabel)}</aside></div>`;
  fillBars(el, bars);
  const pct = el.querySelector('[data-pa-pct]');
  if (shownPct != null) pct.dataset.moValue = String(shownPct);
  countTo(pct, sum.done, (v) => String(Math.round(v)));
  shownPct = sum.done;
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    const keepFocus = (selector) => { const again = el.querySelector(selector); if (again) again.focus({ preventScroll: true }); };
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-achview]');
      const c = e.target.closest('[data-achcat]');
      const x = e.target.closest('[data-achextra]');
      const a = e.target.closest('[data-ach]');
      if (t) { tabView = t.dataset.achview; renderAchievementsPanel(el, { keepFresh: true }); keepFocus(`[data-achview="${tabView}"]`); }
      else if (c) { const id = c.dataset.achcat; if (openCats.has(id)) openCats.delete(id); else openCats.add(id); renderAchievementsPanel(el, { keepFresh: true }); keepFocus(`[data-achcat="${id}"]`); }
      else if (x) { const id = x.dataset.achextra; if (openExtra.has(id)) openExtra.delete(id); else openExtra.add(id); renderAchievementsPanel(el, { keepFresh: true }); keepFocus(`[data-achextra="${id}"]`); }
      else if (a) { sel = a.dataset.ach; for (const b of el.querySelectorAll('[data-ach]')) { const on = b.dataset.ach === sel; b.classList.toggle('sel', on); b.toggleAttribute('aria-current', on); } const it = all2(el, sel); el.querySelector('.pa-pane').innerHTML = it; }
    });
    el.addEventListener('focusin', (e) => {
      const a = e.target.closest && e.target.closest('[data-ach]');
      if (!a || a.dataset.ach === sel) return;
      sel = a.dataset.ach;
      for (const b of el.querySelectorAll('[data-ach]')) { const on = b.dataset.ach === sel; b.classList.toggle('sel', on); b.toggleAttribute('aria-current', on); }
      el.querySelector('.pa-pane').innerHTML = all2(el, sel);
    });
  }
}

// the detail pane for one prestatie, from the freshest view
function all2(el, id) {
  const view = getAchievementView();
  for (const c of view) { const it = c.items.find((a) => a.id === id); if (it) { const html = detailHtml(it, c.label); queueMicrotask(() => fillBars(el, bars)); return html; } }
  return detailHtml(null);
}
