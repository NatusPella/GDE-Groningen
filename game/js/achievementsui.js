// Pause-menu views for achievements.js: the Prestaties section (a summary
// band, the categories on the left with "Bijna binnen" first, the cards and
// the latest unlocks) and the medal / best-time line in the Missies list.

import { dualHtml } from './subtitles.js';
import {
  getAchievementView, getAchievementSummary, getLifetimeStats, getMissionRecord, formatMissionTime,
  MISSION_GOALS, MEDALS, EIERBAL_TOTAL, TROPHY_SVG, getStat,
} from './achievements.js';
import { SIDE_JOBS } from './sidejobs.js';
import { fillBars, countTo, pop } from './motion.js';

const LOCK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1.5v11h-13V10H7zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>';
const HIDDEN_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M11 17h2v2h-2zm1-14a5 5 0 0 1 5 5c0 2.2-1.4 3.2-2.5 4-.9.6-1.5 1-1.5 2v1h-2v-1c0-2 1.3-2.9 2.3-3.6.9-.6 1.7-1.2 1.7-2.4a3 3 0 0 0-6 0H7a5 5 0 0 1 5-5z"/></svg>';

// one line icon per category (24x24, stroked)
const CAT_ICONS = {
  bijna: '<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z"/>',
  missies: '<path d="M6 3v18M6 4h12l-2.5 4L18 12H6"/>',
  rijden: '<path d="M4 16l1.5-5A2 2 0 0 1 7.4 9.6h9.2a2 2 0 0 1 1.9 1.4L20 16v3h-3M7 19H4v-3h16"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  tevoet: '<circle cx="13" cy="4.5" r="2"/><path d="M11 21l2-6-3-3 1-5 4 3 3 1M10 12l-3 2M13 15l3 6"/>',
  politie: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  verkennen: '<path d="M3 6.2l6-2.2 6 2.2 6-2.2v13.8l-6 2.2-6-2.2-6 2.2zM9 4v13.8M15 6.2V20"/>',
  spoor: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9 20l-2 2M15 20l2 2M8 16l-1 4M16 16l1 4"/>',
  sociaal: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 8.5h-3a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-3M12 6.5v2M12 16.5v2"/>',
  verzamelen: '<path d="M12 3c3.5 0 6.5 4 6.5 9.5S15.5 21 12 21s-6.5-3-6.5-8.5S8.5 3 12 3z"/>',
  duif: '<path d="M3 13c3 0 5-2 7-5 1 3 3 4 6 4l5-3-2 5c-2 4-6 6-10 5l-4 2 1-4c-2-1-3-2-3-4z"/>',
  bijbaan: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  nahetverhaal: '<rect x="5.5" y="11" width="13" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
};
const catIcon = (id) => `<svg class="pa-cic" viewBox="0 0 24 24" aria-hidden="true">${CAT_ICONS[id] || CAT_ICONS.bijna}</svg>`;

const CSS = `
#pause-menu .pm-ach { width: min(1240px, calc(100% / var(--ui, 1))); }
#pause-menu .pa-band { display: flex; align-items: center; gap: 18px; padding: 12px 16px; border-radius: 12px; background: rgba(30,158,86,0.1); border: 1px solid rgba(63,201,122,0.35); }
#pause-menu .pa-ring { position: relative; flex: none; width: 96px; height: 96px; }
#pause-menu .pa-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
#pause-menu .pa-ring circle { fill: none; stroke-width: 9; }
#pause-menu .pa-ring .bg { stroke: rgba(255,255,255,0.1); }
#pause-menu .pa-ring .fg { stroke: #3fc97a; stroke-linecap: round; transition: stroke-dashoffset var(--dur-slow) var(--ease-out); }
#pause-menu .pa-ring b { position: absolute; inset: 0; display: grid; place-items: center; font-weight: normal; font-size: 28px; }
#pause-menu .pa-sum { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
#pause-menu .pa-sum b { font-weight: normal; font-size: 28px; letter-spacing: 1.5px; line-height: 1; }
#pause-menu .pa-sum small { font: 14px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .pa-fig { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; padding-left: 18px; border-left: 1px solid rgba(63,201,122,0.16); }
#pause-menu .pa-fig b { font-weight: normal; font-size: 24px; white-space: nowrap; }
#pause-menu .pa-fig small { font: 12px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .pa-layout { display: grid; grid-template-columns: 236px minmax(0, 1fr); gap: 16px; align-items: start; margin-top: 6px; }
#pause-menu .pa-nav { position: sticky; top: 0; display: flex; flex-direction: column; gap: 2px; }
#pause-menu .pa-nav button { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border-radius: 8px; cursor: pointer; text-align: left;
  font: inherit; color: var(--pm-ink); background: transparent; border: 1px solid transparent; transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
#pause-menu .pa-nav button:hover { background: rgba(30,158,86,0.1); }
#pause-menu .pa-nav button[aria-selected="true"] { color: #3fc97a; background: rgba(30,158,86,0.18); border-color: rgba(63,201,122,0.45); }
#pause-menu .pa-nav .pa-nl { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
#pause-menu .pa-nav .pa-nl b { font-weight: normal; font-size: 19px; letter-spacing: 1px; line-height: 1; }
#pause-menu .pa-nav small { font: 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .pa-cic { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .pa-bar { display: block; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); overflow: hidden; }
#pause-menu .pa-bar i { display: block; width: 0; height: 100%; border-radius: 2px; background: #3fc97a; transition: width var(--dur-bar) var(--ease-out); }
#pause-menu .pa-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
#pause-menu .pa-main h3 { display: flex; align-items: baseline; gap: 10px; margin: 0; font-weight: normal; font-size: 24px; letter-spacing: 1.5px; color: #3fc97a; }
#pause-menu .pa-main h3 small { font: 14px 'Arial Narrow', Arial, sans-serif; letter-spacing: 0; color: #a3b2a6; }
#pause-menu .pa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
#pause-menu .pa-card { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 12px; align-items: center; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); }
#pause-menu .pa-ico { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: #10261a; border: 1px solid rgba(63,201,122,0.16); color: rgba(240,237,228,0.4); }
#pause-menu .pa-card[data-on="1"] { border-color: rgba(63,201,122,0.3); }
#pause-menu .pa-card[data-on="1"] .pa-ico { background: #1e9e56; border-color: #3fc97a; color: #f6fff8; }
#pause-menu .pa-txt { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
#pause-menu .pa-txt b { font-weight: normal; font-size: 20px; letter-spacing: 1px; line-height: 1; }
#pause-menu .pa-txt b .nl-sub { font-size: 0.65em; letter-spacing: 0.3px; }
#pause-menu .pa-card[data-on="0"] .pa-txt b { color: rgba(240,237,228,0.75); }
#pause-menu .pa-txt small { font: 13px/1.3 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .pa-prog { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; }
#pause-menu .pa-prog .pa-bar { height: 6px; border-radius: 3px; }
#pause-menu .pa-prog em { font: normal 13px 'Arial Narrow', Arial, sans-serif; white-space: nowrap; }
#pause-menu .pa-recent { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
#pause-menu .pa-rc { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); }
#pause-menu .pa-rc .pa-ico { width: 36px; height: 36px; background: #1e9e56; border: 0; color: #f6fff8; }
#pause-menu .pa-rc .pa-txt { flex: 1; }
#pause-menu .pa-rc .pa-txt b { font-size: 19px; }
#pause-menu .pa-rc > small { font: 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; white-space: nowrap; }
#pause-menu .pa-figs { display: flex; flex-wrap: wrap; gap: 6px; }
#pause-menu .pa-figs span { display: inline-flex; align-items: baseline; gap: 6px; padding: 5px 10px; border-radius: 8px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); font: 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .pa-figs b { font: 18px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.5px; color: var(--pm-ink); }
#pause-menu .pa-medals { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; }
#pause-menu .pa-medal { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); }
#pause-menu .pa-medal small { font: 12px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .pm-medal { display: inline-block; padding: 0 5px; border-radius: 3px; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 13px; letter-spacing: 1px; color: #0c140e; }
#pause-menu .pm-medal.m0 { background: transparent; color: rgba(240,237,228,0.45); border: 1px solid rgba(240,237,228,0.25); }
#pause-menu .pm-medal.m1 { background: #c8834a; }
#pause-menu .pm-medal.m2 { background: #cfd6dc; }
#pause-menu .pm-medal.m3 { background: #e8c93a; }
#pause-menu .pa-empty { margin: 0; font: 14px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
@media (max-width: 980px) { #pause-menu .pa-layout { grid-template-columns: 1fr; } #pause-menu .pa-nav { position: static; flex-direction: row; flex-wrap: wrap; } #pause-menu .pa-nav button { width: auto; } #pause-menu .pa-fig:nth-of-type(n+3) { display: none; } }
`;

let styled = false;
let filter = 'bijna';
const bars = new Map();
let shownPct = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = (n, d = 0) => n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });

function ensureStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}

function fmtAmount(v, unit) {
  if (unit === 'm') return v >= 1000 ? `${nl(v / 1000, v >= 100000 ? 0 : 1)} km` : `${nl(Math.floor(v))} m`;
  if (unit === '€') return `€${nl(Math.floor(v))}`;
  if (unit === 's') return formatMissionTime(v);
  if (unit === 'km/u') return `${nl(Math.floor(v))} km/u`;
  return nl(Math.floor(v));
}

function medalChip(m) {
  return `<span class="pm-medal m${m}">${m ? MEDALS[m] : 'Geen medaille'}</span>`;
}

// Extra bit for the Missies list: medal, record and the next target.
export function missionRecordHTML(i) {
  ensureStyle();
  const r = getMissionRecord(i);
  const g = MISSION_GOALS[i];
  if (!r || !r.medal) return g ? ` · goud onder ${formatMissionTime(g.gold)}` : '';
  let s = ` · ${medalChip(r.medal)}`;
  if (r.best != null) s += ` record ${formatMissionTime(r.best)}`;
  if (r.medal < 3) s += ` · goud onder ${formatMissionTime(g.gold)}`;
  return s;
}

const pctOf = (it) => (it.progress ? Math.max(0, Math.min(100, (it.progress.cur / it.progress.goal) * 100)) : 0);

function card(it) {
  const on = it.unlocked ? 1 : 0;
  const ico = it.unlocked ? TROPHY_SVG : it.hidden ? HIDDEN_SVG : LOCK_SVG;
  const title = it.hidden ? '???' : dualHtml(it.title);
  const desc = it.hidden ? 'Geheim. Blijf rondkijken in Grunn.' : esc(it.desc);
  let prog = '';
  if (!it.unlocked && !it.hidden && it.progress) {
    const { cur, goal, unit } = it.progress;
    prog = `<span class="pa-prog"><span class="pa-bar"><i data-bar="a-${esc(it.id)}" data-w="${pctOf(it).toFixed(1)}"></i></span><em>${fmtAmount(cur, unit)}/${fmtAmount(goal, unit)}</em></span>`;
  }
  return `<div class="pa-card" data-on="${on}"><span class="pa-ico">${ico}</span>` +
    `<span class="pa-txt"><b>${title}</b><small>${desc}</small>${prog}</span></div>`;
}

function whenText(at) {
  const day = (t) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 86400000);
  const d = day(Date.now()) - day(at);
  if (d <= 0) return 'vandaag';
  if (d === 1) return 'gisteren';
  if (d < 7) return `${d} dagen geleden`;
  return new Date(at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function recentBlock(all) {
  const list = all.filter((a) => a.unlocked && a.at).sort((a, b) => b.at - a.at).slice(0, 3);
  if (!list.length) return '';
  return '<h3>Onlangs behaald</h3><div class="pa-recent">' + list.map((a) =>
    `<div class="pa-rc"><span class="pa-ico">${TROPHY_SVG}</span><span class="pa-txt"><b>${dualHtml(a.title)}</b><small>${esc(a.desc)}</small></span><small>${whenText(a.at)}</small></div>`).join('') + '</div>';
}

function medalsBlock() {
  return '<h3>Medailles <small>per missie</small></h3><div class="pa-medals">' + MISSION_GOALS.map((g, i) => {
    const r = getMissionRecord(i);
    const m = r ? r.medal : 0;
    const best = r && r.best != null ? `record ${formatMissionTime(r.best)}` : 'nog niet gespeeld';
    return `<div class="pa-medal"><small>${esc(g.name)}</small><span>${medalChip(m)}</span><small>${best}</small></div>`;
  }).join('') + '</div>';
}

// Lifetime records per bijbaantje (kept in the prestaties storage).
function jobRecordsBlock() {
  return '<h3>Records <small>per bijbaantje</small></h3><div class="pa-medals">' + SIDE_JOBS.map((j) => {
    const streak = getStat(`sj_${j.id}_streak`);
    const shift = getStat(`sj_${j.id}_shift`);
    const line = streak ? `${streak} op rij · beste dienst €${shift.toLocaleString('nl-NL')}` : 'nog niet gewerkt';
    return `<div class="pa-medal"><small>${esc(j.name)}</small><small>${line}</small></div>`;
  }).join('') + '</div>';
}

function figuresBlock(st) {
  const figs = [
    ['Gelopen', fmtAmount(st.walked, 'm')], ['Gezwommen', fmtAmount(st.swum, 'm')], ['Rakelings', nl(st.nearMiss)], ['Gejat', nl(st.stolen)],
    ['Wrakken', nl(st.wrecks)], ['Kusjes', nl(st.kisses)], ['Treinritten', nl(st.trainTrips)], ['Bijbaan-loon', `€${nl(getStat('sjEarned'))}`],
  ];
  return `<h3>Cijfers <small>sinds je eerste spel</small></h3><div class="pa-figs">${figs.map(([k, v]) => `<span>${k}<b>${v}</b></span>`).join('')}</div>`;
}

const RING_C = 2 * Math.PI * 42;

export function renderAchievementsPanel(el) {
  if (!el) return;
  ensureStyle();
  const view = getAchievementView();
  const sum = getAchievementSummary();
  const st = getLifetimeStats();
  const all = view.flatMap((c) => c.items);
  const secret = all.filter((a) => a.hidden).length;
  const near = all.filter((a) => !a.unlocked && !a.hidden && a.progress && a.progress.cur > 0).sort((a, b) => pctOf(b) - pctOf(a)).slice(0, 6);
  const cats = [['bijna', 'Bijna binnen', near.length, near.length, near.length ? 100 : 0],
    ...view.map((c) => [c.cat, c.label, c.done, c.items.length, c.items.length ? (c.done / c.items.length) * 100 : 0])];
  if (!cats.some(([id]) => id === filter)) filter = 'bijna';
  const cur = view.find((c) => c.cat === filter);
  let main;
  if (filter === 'bijna') {
    main = '<h3>Bijna binnen <small>het dichtst bij als eerste</small></h3>' +
      (near.length ? `<div class="pa-grid">${near.map(card).join('')}</div>` : '<p class="pa-empty">Speel wat rond, dan komen ze vanzelf.</p>') +
      recentBlock(all) + figuresBlock(st);
  } else {
    main = `<h3>${esc(cur.label)} <small>${cur.done} van ${cur.items.length}</small></h3>` +
      `<div class="pa-grid">${[...cur.items].sort((a, b) => b.unlocked - a.unlocked || pctOf(b) - pctOf(a)).map(card).join('')}</div>` +
      (cur.cat === 'missies' ? medalsBlock() : '') + (cur.cat === 'bijbaan' ? jobRecordsBlock() : '');
  }
  const fig = (v, k) => `<span class="pa-fig"><b>${v}</b><small>${k}</small></span>`;
  el.innerHTML =
    `<h2>Prestaties <small>${sum.done} van ${sum.total} behaald</small></h2>` +
    `<div class="pa-band"><span class="pa-ring"><svg viewBox="0 0 96 96" aria-hidden="true"><circle class="bg" cx="48" cy="48" r="42"/>` +
    `<circle class="fg" cx="48" cy="48" r="42" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${(RING_C * (1 - (shownPct ?? 0) / 100)).toFixed(1)}"/></svg><b data-pa-pct>${sum.pct}%</b></span>` +
    `<span class="pa-sum"><b>${sum.done} van ${sum.total} behaald</b><small>${secret ? `${secret} verborgen ${secret === 1 ? 'prestatie' : 'prestaties'} · ` : ''}blijven bewaard, ook bij een nieuw spel</small></span>` +
    fig(`${st.eierballen}/${EIERBAL_TOTAL}`, 'Eierballen') + fig(`${st.wijken}/66`, 'Wijken') + fig(fmtAmount(st.driven, 'm'), 'Gereden') + fig(fmtAmount(st.topSpeed, 'km/u'), 'Topsnelheid') + '</div>' +
    `<div class="pa-layout"><nav class="pa-nav" role="tablist" aria-label="Categorie">${cats.map(([id, label, d, t, pct]) =>
      `<button type="button" role="tab" data-achcat="${id}" aria-selected="${id === filter}">${catIcon(id)}<span class="pa-nl"><b>${esc(label)}</b><span class="pa-bar"><i data-bar="cat-${id}" data-w="${Math.round(pct)}"></i></span></span><small>${d}/${t}</small></button>`).join('')}</nav>` +
    `<div class="pa-main">${main}</div></div>`;
  fillBars(el, bars);
  // the ring and the percentage roll to their new value
  const ring = el.querySelector('.pa-ring .fg');
  const pctEl = el.querySelector('[data-pa-pct]');
  if (shownPct != null) pctEl.dataset.moValue = String(shownPct);
  countTo(pctEl, sum.pct, (v) => `${Math.round(v)}%`);
  if (shownPct != null && shownPct !== sum.pct) pop(el.querySelector('.pa-ring'));
  requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = (RING_C * (1 - sum.pct / 100)).toFixed(1); }));
  shownPct = sum.pct;
  if (!el.dataset.bound) {
    el.dataset.bound = '1';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-achcat]');
      if (!b) return;
      filter = b.dataset.achcat;
      renderAchievementsPanel(el);
      const again = el.querySelector(`[data-achcat="${filter}"]`);
      if (again) again.focus({ preventScroll: true });
    });
  }
}
