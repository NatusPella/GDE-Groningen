// De tijdlijn op het vertrekbord tekenen (#1085, 21-11). Alle regels (volgorde, posities, labels, toon, vorm, schermlezertekst)
// komen uit departuretimeline.js; dit bestand maakt er HTML en DOM van. De HTML-functies zijn puur (mock en test), createTimeline
// houdt de rows per trein vast (sleutel = trein-id), zodat alleen een NIEUWE trein inschuift en alleen een veranderde minuut tikt.
// Beweging: alleen de DS3-klassen (ds-m-rij, ds-m-tik, ds-m-vul, ds-m-stip--live); onder "Beweging beperken" doen die niets.
import { afterFrame, rijenKlaar, staffelNa, calmState } from './dsmicro.js';
import { escapeHtml as esc } from './htmlescape.js';


// Het hoofd van de lijst: het "nu"-punt met de spelkloktijd en de streepjes van de as.
export function nowHtml(m) {
  const ticks = m.axis.map((a) => `<i class="stl-tick" style="left:${(a.pos * 100).toFixed(1)}%"><span>${esc(a.label)}</span></i>`).join('');
  return `<span class="stl-pin stl-shape-now" aria-hidden="true"></span><span class="stl-nowtxt"><b>NU</b> <span class="stl-nowtime">${esc(m.nowLabel)}</span></span><span class="stl-axis" aria-hidden="true">${ticks}</span>`;
}

// De inhoud van één rij. tick: de minuut is net veranderd (de teller krijgt één hartslag).
export function rowHtml(x, { tick = false } = {}) {
  const pip = x.first ? ' ds-m-stip ds-m-stip--live aan' : '';
  const plan = x.shifted || x.cancelled ? `<s class="stl-plan">${esc(x.plan)}</s>` : '';
  const badge = `<i class="stl-chip stl-${x.badge === 'Live' ? 'live' : 'schedule'}">${x.badge}</i>`;
  const plus = x.delayLabel ? `<i class="stl-chip stl-plus${x.high ? ' stl-high' : ''}">${esc(x.delayLabel)}</i>` : '';
  const track = x.trackLabel ? `<span class="stl-track">${esc(x.trackLabel)}</span>` : '<span class="stl-track stl-none"></span>';
  const dist = x.cancelled
    ? '<span class="stl-dist"><span class="stl-min stl-cancelled">Vervalt</span></span>'
    : `<span class="stl-dist"><span class="stl-min ds-m-tik${tick ? ' ds-m-tikt' : ''}">${esc(x.distance)}</span><span class="stl-bar"><i class="stl-fill ds-m-vul" style="--ds-m-p:${Math.max(0.03, x.pos).toFixed(3)}"></i></span></span>`;
  return `<span class="stl-pin stl-shape-${x.shape}${pip}" aria-hidden="true"></span>`
    + `<span class="stl-time"><b class="${x.cancelled ? 'stl-strike' : ''}">${esc(x.shifted ? x.time : x.cancelled ? x.plan : x.time)}</b>${plan && !x.cancelled ? plan : ''}</span>`
    + `<span class="stl-who"><b class="stl-dest">${esc(x.destination)}</b><span class="stl-meta">${x.line ? `<span class="stl-line">${esc(x.line)}</span>` : ''}${badge}${plus}</span></span>`
    + track + dist;
}

// De hele tijdlijn als één string (de mock en tests; het bord zelf patcht per rij).
export function timelineHtml(m) {
  const rows = m.items.map((x, i) => `<li class="stl-row" data-id="${esc(x.id)}" data-tone="${x.tone}" data-status="${x.status}"${x.first ? ' data-first="1"' : ''} style="--ds-m-i:${i}">${rowHtml(x)}</li>`).join('');
  const core = m.empty ? `<p class="stl-empty">${esc(m.emptyText)}</p>` : `<ol class="stl-list" aria-hidden="true"><li class="stl-row stl-now">${nowHtml(m)}</li>${rows}</ol>`;
  return `<div class="stl" data-count="${m.items.length}"><p class="stl-sr">${esc(m.aria)}</p>${core}</div>`;
}

export const STL_CSS = `
#hud .stl { position: relative; margin: 6px 0 4px; min-width: 440px; color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-tekst); }
#hud .stl-sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
#hud .stl-list { list-style: none; margin: 0; padding: 0; border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); background: var(--ds-zeef-bg); }
#hud .stl-row { position: relative; display: grid; grid-template-columns: 22px 72px minmax(0, 1fr) auto minmax(128px, max-content); align-items: center; column-gap: 10px; padding: 5px 10px 5px 8px; border-top: var(--ds-lijn) solid var(--ds-c-ink-inkt); }
#hud .stl-row:first-child { border-top: 0; }
#hud .stl-row::before { content: ''; position: absolute; left: 18px; top: 0; bottom: 0; width: var(--ds-lijn-dik); background: var(--ds-c-ink-inkt); }
#hud .stl-now::before { top: 50%; }
#hud .stl-row:last-child::before { bottom: 50%; }
#hud .stl-now { grid-template-columns: 22px auto minmax(0, 1fr); min-height: 30px; }
#hud .stl-nowtxt { font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-kop); font-weight: 800; letter-spacing: 2px; color: var(--ds-c-inkt-zacht); }
#hud .stl-nowtxt b { font-weight: 800; letter-spacing: 3px; }
#hud .stl-nowtime { font-size: var(--ds-t-kaart-titel); letter-spacing: 1px; color: var(--ds-zeef-tx); font-variant-numeric: tabular-nums; }
#hud .stl-axis { position: relative; height: 22px; margin-left: auto; width: 128px; border-bottom: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); }
#hud .stl-tick { position: absolute; bottom: -2px; width: var(--ds-lijn-dik); height: 8px; background: var(--ds-c-ink-inkt); }
#hud .stl-tick span { position: absolute; bottom: 13px; left: 0; transform: translateX(-50%); font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); color: var(--ds-c-inkt-zacht); font-style: normal; white-space: nowrap; }
#hud .stl-tick:first-child span { transform: none; }
#hud .stl-tick:last-child span { transform: translateX(-100%); }
#hud .stl-pin { position: relative; z-index: 1; justify-self: center; box-sizing: border-box; width: 14px; height: 14px; background: var(--ds-zeef-bg); border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); border-radius: 50%; }
#hud .stl-shape-now { width: 16px; height: 16px; border-width: 3px; }
#hud .stl-shape-circle { background: var(--ds-c-ink-inkt); }
#hud .stl-shape-diamond { border-radius: 0; rotate: 45deg; width: 13px; height: 13px; background: var(--ds-zeef-bg); border-width: 3px; }
#hud .stl-shape-cross { border: 0; border-radius: 0; width: 16px; height: 16px; background: var(--ds-c-rood-tx); clip-path: polygon(20% 0, 50% 30%, 80% 0, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0 80%, 30% 50%, 0 20%); }
#hud .stl-time { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.05; }
#hud .stl-time b { font: 800 var(--ds-t-kaart-titel) var(--ds-font-zeef-kop); letter-spacing: 1px; font-variant-numeric: tabular-nums; }
#hud .stl-plan { font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); color: var(--ds-c-inkt-zacht); font-variant-numeric: tabular-nums; text-decoration: line-through; }
#hud .stl-strike { text-decoration: line-through; }
#hud .stl-who { display: flex; flex-direction: column; min-width: 0; }
#hud .stl-dest { font: 800 var(--ds-t-kaart-titel) var(--ds-font-zeef-kop); letter-spacing: 0.5px; white-space: normal; overflow-wrap: anywhere; text-shadow: none; }
#hud .stl-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); color: var(--ds-c-inkt-zacht); }
#hud .stl-chip { font-style: normal; font-weight: 700; padding: 0 6px; border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil, 10px); color: var(--ds-zeef-tx); background: var(--ds-zeef-bg); letter-spacing: 0.5px; font-variant-numeric: tabular-nums; }
#hud .stl-live { background: var(--ds-c-ink-bord); border-color: var(--ds-c-ink-bord); color: var(--ds-c-ink-papier); }
#hud .stl-live::before { content: '\\25CF\\a0'; }
#hud .stl-schedule { border-style: dashed; }
#hud .stl-plus { border-style: dashed; }
#hud .stl-plus::before { content: '\\25B2\\a0'; }
#hud .stl-high { background: var(--ds-c-rood-vlak); border-color: var(--ds-c-rood-tx); border-style: solid; color: var(--ds-c-rood-tx); }
#hud .stl-track { justify-self: end; min-width: 2.9em; text-align: center; padding: 1px 6px; border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); font: 800 var(--ds-t-kaart-body) var(--ds-font-zeef-kop); letter-spacing: 1px; font-variant-numeric: tabular-nums; background: var(--ds-zeef-bg); }
#hud .stl-none { visibility: hidden; }
#hud .stl-dist { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
#hud .stl-min { font: 700 var(--ds-t-kaart-body) var(--ds-font-zeef-tekst); font-variant-numeric: tabular-nums; white-space: nowrap; align-self: flex-start; }
#hud .stl-cancelled { font-family: var(--ds-font-zeef-kop); font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--ds-c-rood-tx); background: var(--ds-c-rood-vlak); border: var(--ds-lijn-dik) solid var(--ds-c-rood-tx); padding: 0 8px; }
#hud .stl-cancelled::before { content: '\\2715\\a0'; }
#hud .stl-bar { display: block; height: 8px; border: var(--ds-lijn) solid var(--ds-c-ink-inkt); background: var(--ds-zeef-bg); overflow: hidden; }
#hud .stl-fill { display: block; width: 100%; height: 100%; background: var(--ds-c-ink-inkt); }
#hud .stl-row[data-status="cancelled"] .stl-dest { color: var(--ds-c-rood-tx); text-decoration: line-through; }
#hud .stl-row[data-first] { padding-top: 9px; padding-bottom: 9px; background: var(--ds-c-ink-bord); color: var(--ds-c-ink-papier); }
#hud .stl-row[data-first]::before { background: var(--ds-c-ink-papier); }
#hud .stl-row[data-first] .stl-time b { font-size: var(--ds-t-kaart-getal); }
#hud .stl-row[data-first] .stl-dest { font-size: var(--ds-t-kaart-getal); letter-spacing: 1px; }
#hud .stl-row[data-first] .stl-meta, #hud .stl-row[data-first] .stl-plan { color: var(--ds-c-ink-papier); }
#hud .stl-row[data-first] .stl-min { font-size: var(--ds-t-kaart-titel); }
#hud .stl-row[data-first] .stl-pin { width: 20px; height: 20px; background: var(--ds-c-ink-papier); border-color: var(--ds-c-ink-papier); }
#hud .stl-row[data-first] .stl-shape-diamond { background: var(--ds-c-ink-bord); width: 17px; height: 17px; }
#hud .stl-row[data-first] .stl-chip { background: var(--ds-c-ink-papier); border-color: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); }
#hud .stl-row[data-first] .stl-live::before { color: var(--ds-c-ink-bord); }
#hud .stl-row[data-first] .stl-schedule { background: transparent; color: var(--ds-c-ink-papier); }
#hud .stl-row[data-first] .stl-high { background: var(--ds-c-rood-vlak); border-color: var(--ds-c-rood-tx); color: var(--ds-c-rood-tx); }
#hud .stl-row[data-first] .stl-track { background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); border-color: var(--ds-c-ink-papier); }
#hud .stl-row[data-first] .stl-bar { border-color: var(--ds-c-ink-papier); background: transparent; }
#hud .stl-row[data-first] .stl-fill { background: var(--ds-c-ink-papier); }
#hud .stl-empty { margin: 0; padding: 10px 12px; border: var(--ds-lijn-dik) dashed var(--ds-c-ink-inkt); font: 700 var(--ds-t-kaart-body) var(--ds-font-zeef-tekst); }
@media (max-width: 1100px) { #hud .stl { min-width: 0; } #hud .stl-row { grid-template-columns: 22px 72px minmax(0, 1fr) auto; column-gap: 8px; } #hud .stl-dist { grid-column: 3 / -1; flex-direction: row; } #hud .stl-bar, #hud .stl-axis { display: none; } #hud .stl-now { grid-template-columns: 22px auto; } }
/* kleiner op het vertrekbord: drie treinen en geen brede tabel (vervagen zie minigamekit.js) */
#hud .mg-board[data-mg="station"] .stl { min-width: 0; }
#hud .mg-board[data-mg="station"] .stl-row:nth-child(n+5) { display: none; }
#hud .mg-board[data-mg="station"] .mg-help, #hud .mg-board[data-mg="station"] .mg-watermark { display: none; }
`;

let cssDone = false;
function injectCss(doc) {
  if (cssDone || !doc || !doc.head) return;
  const st = doc.createElement('style');
  st.textContent = STL_CSS;
  doc.head.appendChild(st);
  cssDone = true;
}

// Een tijdlijn in `parent` (vóór `before`, optioneel). set(model) patcht: nieuwe treinen schuiven in (gestaffeld, ds-m-rij),
// vertrokken treinen verdwijnen, een veranderde minuut krijgt één hartslag (ds-m-tikt), de rest blijft staan.
export function createTimeline(parent, { doc = (typeof document !== 'undefined' ? document : null), before = null } = {}) {
  injectCss(doc);
  const mk = (tag, cls) => { const e = doc.createElement(tag); if (cls) e.className = cls; return e; };
  const root = mk('div', 'stl');
  const sr = mk('p', 'stl-sr');
  const list = mk('ol', 'stl-list'); list.setAttribute('aria-hidden', 'true');
  const nowEl = mk('li', 'stl-row stl-now');
  const emptyEl = mk('p', 'stl-empty'); emptyEl.hidden = true;
  list.appendChild(nowEl);
  root.appendChild(sr); root.appendChild(list); root.appendChild(emptyEl);
  if (before) parent.insertBefore(root, before); else parent.appendChild(root);
  const rows = new Map(); // id -> { li, core, distance }
  let last = '', nowStr = '';
  return {
    root,
    set(m) {
      if (!m || m.sig === last) return;
      last = m.sig;
      sr.textContent = m.aria;
      emptyEl.hidden = !m.empty; list.hidden = !!m.empty;
      emptyEl.textContent = m.emptyText;
      if (m.empty) { for (const [, r] of rows) list.removeChild(r.li); rows.clear(); return; }
      const h = nowHtml(m);
      if (h !== nowStr) { nowStr = h; nowEl.innerHTML = h; }
      const created = [];
      const ids = new Set(m.items.map((x) => x.id));
      for (const [id, r] of [...rows]) if (!ids.has(id)) { list.removeChild(r.li); rows.delete(id); }
      m.items.forEach((x, i) => {
        const core = rowHtml(x);
        let r = rows.get(x.id);
        if (!r) {
          const li = mk('li', 'stl-row');
          li.setAttribute('data-id', x.id);
          li.style.setProperty('--ds-m-i', String(i));
          r = { li, core: null, distance: x.distance };
          rows.set(x.id, r);
          created.push(r);
        }
        const tick = r.core !== null && r.distance !== x.distance;
        if (core !== r.core) { r.li.innerHTML = tick ? rowHtml(x, { tick: true }) : core; r.core = core; }
        r.distance = x.distance;
        r.li.setAttribute('data-tone', x.tone); r.li.setAttribute('data-status', x.status);
        if (x.first) r.li.setAttribute('data-first', '1'); else r.li.removeAttribute('data-first');
        if (list.children[i + 1] !== r.li) list.insertBefore(r.li, list.children[i + 1] || null);
      });
      if (created.length && !calmState()) {
        const lis = created.map((r) => r.li);
        for (const li of lis) li.classList.add('ds-m-rij');
        afterFrame(lis);
        rijenKlaar(lis, staffelNa(lis.length) + 250);
      }
    },
    destroy() { if (root.parentNode) root.parentNode.removeChild(root); rows.clear(); last = ''; },
  };
}
