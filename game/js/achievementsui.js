// Pause-menu views for achievements.js: the Prestaties tab and the medal /
// best-time line in the Missies list.

import {
  getAchievementView, getAchievementSummary, getLifetimeStats, getMissionRecord, formatMissionTime,
  MISSION_GOALS, MEDALS, EIERBAL_TOTAL, TROPHY_SVG,
} from './achievements.js';

const LOCK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1.5v11h-13V10H7zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>';
const HIDDEN_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M11 17h2v2h-2zm1-14a5 5 0 0 1 5 5c0 2.2-1.4 3.2-2.5 4-.9.6-1.5 1-1.5 2v1h-2v-1c0-2 1.3-2.9 2.3-3.6.9-.6 1.7-1.2 1.7-2.4a3 3 0 0 0-6 0H7a5 5 0 0 1 5-5z"/></svg>';

const CSS = `
#pause-menu .pa-total { display: flex; align-items: center; gap: 12px; margin: 2px 0 6px; }
#pause-menu .pa-bar { flex: 1; height: 8px; border-radius: 4px; background: rgba(240,237,228,0.12); overflow: hidden; }
#pause-menu .pa-bar i { display: block; height: 100%; background: linear-gradient(90deg, #1e9e56, #3fc97a); box-shadow: 0 0 10px rgba(63,201,122,0.5); }
#pause-menu .pa-total b { font-weight: normal; font-size: 26px; color: #3fc97a; min-width: 3.2em; text-align: right; }
#pause-menu .pa-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 6px; margin-bottom: 6px; }
#pause-menu .pa-stat { background: rgba(12,20,14,0.6); border: 1px solid rgba(63,201,122,0.2); border-radius: 4px; padding: 6px 10px; display: flex; flex-direction: column; }
#pause-menu .pa-stat small { font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.55); letter-spacing: 0.3px; }
#pause-menu .pa-stat span { font-size: 21px; letter-spacing: 1px; }
#pause-menu .pa-cats button small { opacity: 0.7; margin-left: 4px; }
#pause-menu .pa-cat h3 { margin: 14px 0 6px; font-weight: normal; font-size: 19px; letter-spacing: 1.5px; color: #3fc97a; }
#pause-menu .pa-cat h3 small { font-size: 15px; color: rgba(240,237,228,0.55); margin-left: 6px; }
#pause-menu .pa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px; }
#pause-menu .pa-card { display: grid; grid-template-columns: 38px 1fr; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 4px;
  background: rgba(12,20,14,0.55); border: 1px solid rgba(240,237,228,0.08); border-left: 4px solid rgba(240,237,228,0.15); }
#pause-menu .pa-card[data-on="1"] { border-color: rgba(63,201,122,0.35); border-left-color: #3fc97a; background: rgba(30,158,86,0.14); }
#pause-menu .pa-card[data-on="1"][data-medal="1"] { border-left-color: #e8c93a; background: rgba(232,201,58,0.1); }
#pause-menu .pa-ico { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: rgba(240,237,228,0.08); color: rgba(240,237,228,0.4); }
#pause-menu .pa-card[data-on="1"] .pa-ico { background: radial-gradient(circle at 35% 30%, #6fe39d 0%, #1e9e56 70%); color: #0c140e; }
#pause-menu .pa-card[data-on="1"][data-medal="1"] .pa-ico { background: radial-gradient(circle at 35% 30%, #fff0a8 0%, #d9a91e 70%); }
#pause-menu .pa-txt { display: flex; flex-direction: column; min-width: 0; }
#pause-menu .pa-txt b { font-weight: normal; font-size: 18px; letter-spacing: 0.8px; line-height: 1.1; }
#pause-menu .pa-card[data-on="0"] .pa-txt b { color: rgba(240,237,228,0.7); }
#pause-menu .pa-txt small { font: 13px/1.3 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.6); letter-spacing: 0.2px; }
#pause-menu .pa-prog { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
#pause-menu .pa-prog .pa-bar { height: 5px; }
#pause-menu .pa-prog em { font: normal 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.65); white-space: nowrap; }
#pause-menu .pa-medals { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; }
#pause-menu .pa-medal { display: flex; flex-direction: column; padding: 6px 10px; border-radius: 4px; background: rgba(12,20,14,0.55); border: 1px solid rgba(240,237,228,0.08); }
#pause-menu .pa-medal small { font: 12px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.6); }
#pause-menu .pm-medal { display: inline-block; padding: 0 5px; border-radius: 3px; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 13px; letter-spacing: 1px; color: #0c140e; }
#pause-menu .pm-medal.m0 { background: transparent; color: rgba(240,237,228,0.45); border: 1px solid rgba(240,237,228,0.25); }
#pause-menu .pm-medal.m1 { background: #c8834a; }
#pause-menu .pm-medal.m2 { background: #cfd6dc; }
#pause-menu .pm-medal.m3 { background: #e8c93a; box-shadow: 0 0 8px rgba(232,201,58,0.5); }
`;

let styled = false;
let filter = 'alle';
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
  if (unit === 'm') return v >= 1000 ? `${nl(v / 1000, 1)} km` : `${nl(Math.floor(v))} m`;
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

function card(it) {
  const on = it.unlocked ? 1 : 0;
  const ico = it.unlocked ? TROPHY_SVG : it.hidden ? HIDDEN_SVG : LOCK_SVG;
  const title = it.hidden ? '???' : esc(it.title);
  const desc = it.hidden ? 'Geheime prestatie. Blijf rondkijken in Grunn.' : esc(it.desc);
  let prog = '';
  if (!it.unlocked && !it.hidden && it.progress) {
    const { cur, goal, unit } = it.progress;
    const pct = Math.max(0, Math.min(100, (cur / goal) * 100));
    prog = `<span class="pa-prog"><span class="pa-bar"><i style="width:${pct.toFixed(1)}%"></i></span><em>${fmtAmount(cur, unit)} / ${fmtAmount(goal, unit)}</em></span>`;
  }
  const when = it.at ? `<small>Behaald op ${new Date(it.at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</small>` : '';
  return `<div class="pa-card" data-on="${on}" data-medal="${it.medal ? 1 : 0}"><span class="pa-ico">${ico}</span>` +
    `<span class="pa-txt"><b>${title}</b><small>${desc}</small>${prog}${on ? when : ''}</span></div>`;
}

function medalsBlock() {
  return '<div class="pa-medals">' + MISSION_GOALS.map((g, i) => {
    const r = getMissionRecord(i);
    const m = r ? r.medal : 0;
    const best = r && r.best != null ? `record ${formatMissionTime(r.best)}` : 'nog niet gespeeld';
    return `<div class="pa-medal"><small>${i + 1}. ${esc(g.name)}</small><span>${medalChip(m)}</span><small>${best}</small></div>`;
  }).join('') + '</div>';
}

export function renderAchievementsPanel(el) {
  if (!el) return;
  ensureStyle();
  const view = getAchievementView();
  const sum = getAchievementSummary();
  const st = getLifetimeStats();
  const stats = [
    ['Eierballen', `${st.eierballen}/${EIERBAL_TOTAL}`],
    ['Wijken ontdekt', `${st.wijken}/66`],
    ['Gereden', fmtAmount(st.driven, 'm')],
    ['Gelopen', fmtAmount(st.walked, 'm')],
    ['Topsnelheid', fmtAmount(st.topSpeed, 'km/u')],
    ['Rakelings', nl(st.nearMiss)],
    ['Gejat', nl(st.stolen)],
    ['Kusjes', nl(st.kisses)],
  ];
  const cats = [['alle', 'Alles', sum.done, sum.total], ...view.map((c) => [c.cat, c.label, c.done, c.items.length])];
  if (!cats.some(([id]) => id === filter)) filter = 'alle';
  const shown = view.filter((c) => filter === 'alle' || c.cat === filter);
  el.innerHTML =
    `<h2>Prestaties <small>${sum.done}/${sum.total} behaald</small></h2>` +
    `<div class="pa-total"><span class="pa-bar"><i style="width:${sum.pct}%"></i></span><b>${sum.pct}%</b></div>` +
    `<div class="pa-stats">${stats.map(([k, v]) => `<div class="pa-stat"><small>${k}</small><span>${v}</span></div>`).join('')}</div>` +
    `<nav class="pm-subtabs pa-cats" role="tablist" aria-label="Categorie">${cats.map(([id, label, d, t]) =>
      `<button type="button" role="tab" data-achcat="${id}" aria-selected="${id === filter}">${label}<small>${d}/${t}</small></button>`).join('')}</nav>` +
    shown.map((c) => `<section class="pa-cat"><h3>${c.label} <small>${c.done}/${c.items.length}</small></h3>` +
      (c.cat === 'missies' ? medalsBlock() + '<h3>Missie-prestaties</h3>' : '') +
      `<div class="pa-grid">${c.items.map(card).join('')}</div></section>`).join('');
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
