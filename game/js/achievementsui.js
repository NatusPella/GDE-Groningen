// Pause-menu view for achievements.js: the Prestaties section. Tabs Alles,
// Bijna binnen and Behaald; in Alles every category is a tile with its icon,
// a bar and the prestatie that is next up, and a tile folds open to its
// prestaties; the one you pick is explained beside the list. Lifetime
// figures, medals per mission and the job records fold at the bottom.
import { dualHtml } from './subtitles.js';
import {
  getAchievementView, getAchievementSummary, getLifetimeStats, getMissionRecord, formatMissionTime,
  achievementsGated, MISSION_GOALS, isRetiredMission, MEDALS, EIERBAL_TOTAL, WIJKEN_TOTAL, getStat, unseenAchievementCount, isAchievementFresh, markAchievementsSeen,
} from './achievements.js';
import { SIDE_JOBS } from './sidejobs.js';
import { getOverzicht } from './gebiedenlive.js';
import { iconSvg, ICON_PATHS } from './achievementicons.js';
import { fillBars, countTo } from './motion.js';
import { achStilNoot, achPct as pctOf, achNear, achDone, achCategoryOrder, achCategoryPct, achWhen } from './menumodels.js';

const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="11" width="13" height="9" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';
const CHIP_ICOON = {
  ok: '<path d="M6.2 11.6 2.8 8.2l1.4-1.4 2 2 5.6-5.6 1.4 1.4z"/>',
  ster: '<path d="M8 1l1.8 4.2L14 6l-3.2 2.8L11.7 13 8 10.8 4.3 13l.9-4.2L2 6l4.2-.8z"/>',
};
const chip = (toon, icoon, tekst) => `<span class="ds-z-chip${toon ? ' ds-z-chip--' + toon : ''}"><svg class="ds-z-chip__icoon" viewBox="0 0 16 16" aria-hidden="true">${CHIP_ICOON[icoon]}</svg>${tekst}</span>`;
const streep = (pct, label, dik) => `<div class="ds-z-balk${dik ? ' ' : ''}" style="--ds-z-w:${Math.max(0, Math.min(100, pct))}%"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${label}</span></div>`;
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

// de categorieën zijn kaarten met een icoon, een balk en de eerstvolgende
// prestatie. De vormgeving woont hier bij de module, niet in pausemenu.css; alleen
// de bestaande tokens en lettertypen van het menu.
const CSS = `
#pause-menu .pa-cats { display: flex; flex-direction: column; gap: 12px; padding: 0 0 10px 24px; }
#pause-menu .pa-tile { flex: none; display: flex; flex-direction: column; gap: var(--ds-s-2); }
#pause-menu .pa-card { padding: var(--ds-s-3) var(--ds-s-4); gap: var(--ds-s-2); }
#pause-menu .pa-card:has(.pa-tile-top[aria-expanded="true"]) { border-color: var(--ds-c-ink-bord); outline: var(--ds-lijn-dik) solid var(--ds-c-ink-bord); outline-offset: -1px; }
#pause-menu .pa-tile-top { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; grid-template-areas: "ico head end" "ico next next"; align-items: center; column-gap: var(--ds-s-3); row-gap: 2px; width: 100%; min-height: 48px; padding: 0; text-align: left; color: inherit; }
#pause-menu .pa-tile-top:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); border-radius: var(--ds-r); }
#pause-menu .pa-tile-ico { grid-area: ico; align-self: center; display: grid; place-items: center; width: 44px; height: 44px; border-radius: var(--ds-r-pil); color: var(--ds-c-ink-bord); background: var(--ds-c-sel-vlak); box-shadow: inset 0 0 0 var(--ds-lijn) var(--ds-c-ink-bord); }
#pause-menu .pa-tile-ico svg { width: 24px; height: 24px; }
#pause-menu .pa-tile-h { grid-area: head; display: flex; align-items: center; flex-wrap: wrap; gap: 2px var(--ds-s-3); min-width: 0; }
#pause-menu .pa-tile-h b { font-family: var(--ds-font-kop-v3); font-weight: normal; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-kop); text-transform: uppercase; }
#pause-menu .pa-tile-h .ds-z-chip { min-height: 28px; padding: 0 var(--ds-s-3); }
#pause-menu .pa-tile-end { grid-area: end; align-self: center; display: flex; align-items: center; gap: var(--ds-s-2); }
#pause-menu .pa-tile-chev { display: grid; place-items: center; width: 20px; height: 20px; color: var(--ds-c-inkt-zacht); transition: transform 0.2s; }
#pause-menu .pa-tile-chev svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .pa-tile-top[aria-expanded="true"] .pa-tile-chev { transform: rotate(90deg); color: var(--ds-c-ink-bord); }
#pause-menu .pa-tile-pct { font-family: var(--ds-font-kop-v3); font-size: var(--ds-t-cijfer); line-height: 1; letter-spacing: var(--ds-ls-kop); }
#pause-menu .pa-tile-next { grid-area: next; display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px var(--ds-s-2); min-width: 0; font-size: var(--ds-t-body); line-height: var(--ds-lh-tekst); color: var(--ds-c-inkt-zacht); }
#pause-menu .pa-tile-next-t { min-width: 0; overflow-wrap: anywhere; }
#pause-menu .pa-tile-fig { font-family: var(--ds-font-kop-v3); font-size: var(--ds-t-label); letter-spacing: var(--ds-ls-label); color: var(--ds-zeef-tx); white-space: nowrap; }
#pause-menu .pa-tile .m-fold { padding: 2px 8px 8px; border-radius: 12px; background: color-mix(in srgb, var(--ink) 4.5%, transparent); box-shadow: inset 0 0 0 1px var(--line); }
#pause-menu .pa-tile .m-li { min-height: 50px; padding: 0 16px; }
#pause-menu .pa-row-end { display: inline-flex; align-items: baseline; gap: 8px; flex: none; }
#pause-menu .pa-row-pct { font-family: var(--ds-font-kop-v3); font-size: 22px; letter-spacing: 0.04em; color: var(--g); }
#pause-menu .m-li.near { color: color-mix(in srgb, var(--ink) 92%, transparent); }
#pause-menu .pa-empty-pane { display: flex; flex-direction: column; gap: 16px; }
#pause-menu .pa-next-acts { align-self: flex-start; }
#pause-menu .pa-next-acts .ds-z-knop { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
#pause-menu .pa-hero { margin: 0 24px 14px; flex: none; }
#pause-menu .pa-hero { gap: var(--ds-s-2); }
#pause-menu .pa-hero-rij { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--ds-s-2) var(--ds-s-6); }
#pause-menu .pa-hero .ds-z-kaart__tekst { flex: 1 1 320px; max-width: 640px; margin: 0; }
#pause-menu .pa-hero-cijfers { display: flex; flex-wrap: wrap; gap: var(--ds-s-2) var(--ds-s-6); }
#pause-menu .pa-hero-cijfers .ds-z-waarde__getal { font-size: var(--ds-t-subkop); }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-prestaties';
  el.textContent = CSS;
  document.head.appendChild(el);
}

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
  // #909: waar je al bijna bent laat de rij zelf zien: een dunne balk onder de titel met
  // dezelfde verhouding als het cijfer ernaast, zodat je in één oogopslag ziet hoever je bent.
  const bijna = !it.unlocked && !it.hidden && it.progress && it.progress.cur > 0;
  const rowbar = bijna ? `<span class="m-bar pa-rowbar" aria-hidden="true"><i style="width:${pctOf(it).toFixed(1)}%"></i></span>` : '';
  let end = '';
  if (it.unlocked) end = freshIds.has(it.id) ? '<span class="t g">nieuw</span>' + CHECK : CHECK;
  else if (it.hidden) end = LOCK;
  else if (bijna) end = `<span class="pa-row-end"><span class="v">${fmtAmount(it.progress.cur, it.progress.unit)}/${fmtAmount(it.progress.goal, it.progress.unit)}</span><span class="pa-row-pct">${Math.round(pctOf(it))}%</span></span>`;
  return `<button type="button" class="m-li${it.unlocked ? '' : ' off'}${bijna ? ' near' : ''}${sel === it.id ? ' sel' : ''}" data-ach="${esc(it.id)}" data-cat-label="${esc(catLabel)}"${sel === it.id ? ' aria-current="true"' : ''}>` +
    `<span class="pa-ico">${iconSvg(it)}</span><span class="nm"><span class="one">${title}</span>${it.unlocked && it.at ? `<span class="mut one">${whenText(it.at)}</span>` : ''}${rowbar}</span>${end}</button>`;
}

function disc(id, title, hintHtml, inner, open, attr) {
  return `<button type="button" class="m-disc" ${attr} aria-expanded="${open}">${CHEV}<b>${esc(title)}</b>${hintHtml}</button>` +
    `<div class="m-fold" ${open ? '' : 'hidden'}>${inner}</div>`;
}

// de eerstvolgende haalbare prestatie van een categorie, met het cijfer erbij.
// Eerst een die al begonnen is (dezelfde volgorde als "Bijna binnen"), dan een met een
// telbaar cijfer, anders de eerste die nog niet gehaald is. Zo blijft een categorie
// nooit een lege regel en staat er waar het kan een concreet getal naast.
function nextOf(items) {
  const open = items.filter((a) => !a.unlocked && !a.hidden);
  return open.find((a) => a.progress && a.progress.cur > 0) ||
    open.find((a) => a.progress) || open[0] || null;
}

function catTile(c) {
  const open = openCats.has(c.cat);
  const pct = achCategoryPct(c);
  const items = achCategoryOrder(c.items);
  const teGaan = c.items.length - c.done;
  const next = nextOf(items);
  const started = !!(next && next.progress && next.progress.cur > 0 && !next.unlocked);
  const fig = next && next.progress && !next.unlocked ? `${fmtAmount(next.progress.cur, next.progress.unit)}/${fmtAmount(next.progress.goal, next.progress.unit)}` : '';
  const nextLine = next
    ? `<span class="pa-tile-next-t">${started ? 'Bijna binnen: ' : 'Volgende: '}${dualHtml(next.title)}</span>${fig ? `<span class="pa-tile-fig">${fig}</span>` : ''}`
    : `<span class="pa-tile-next-t">${teGaan === 0 ? 'Alles in deze categorie gehaald.' : 'De rest is nog geheim.'}</span>`;
  const note = teGaan === 0 ? chip('succes', 'ok', 'Alles gehaald') : started ? chip('selectie', 'ster', 'Bijna binnen') : '';
  return `<div class="pa-tile${open ? ' open' : ''}${started ? ' near' : ''}">` +
    `<div class="ds-zeef ds-z-kaart pa-card">` +
    `<button type="button" class="pa-tile-top" data-achcat="${esc(c.cat)}" aria-expanded="${open}">` +
      `<span class="pa-tile-ico" aria-hidden="true">${iconSvg({ id: '', cat: c.cat, hidden: false })}</span>` +
      `<span class="pa-tile-h"><b>${esc(c.label)}</b>${note}</span>` +
      `<span class="pa-tile-next">${nextLine}</span>` +
      `<span class="pa-tile-end"><span class="pa-tile-pct">${pct}%</span><span class="pa-tile-chev" aria-hidden="true">${CHEV}</span></span>` +
    `</button>` +
    streep(pct, `${c.done} van ${c.items.length}`) + `</div>` +
    `<div class="m-fold" ${open ? '' : 'hidden'}>${items.map((a) => row(a, c.label)).join('')}</div></div>`;
}

// a progress bar with its own fill animation; the number is written next to it,
// so the same figure is never shown three different ways (#611)
function bar(id, pct) {
  return `<span class="m-bar on"><i data-bar="${esc(id)}" data-w="${Number(pct).toFixed(1)}"></i></span>`;
}

function medalsBlock() {
  return '<div class="pa-grid">' + MISSION_GOALS.map((g, i) => {
    const r = getMissionRecord(i);
    if (isRetiredMission(i) && !(r && (r.medal || r.runs))) return '';
    const m = r ? r.medal : 0;
    const best = r && r.best != null ? `record ${formatMissionTime(r.best)}` : 'nog niet gespeeld';
    return `<div class="pa-cell"><span>${esc(g.name)}</span><span class="mut"><span class="m-medal m${m}" aria-hidden="true"></span> ${m ? MEDALS[m] : 'Geen medaille'} · ${best}</span></div>`;
  }).join('') + '</div>';
}

function jobRecordsBlock() {
  return '<div class="pa-grid">' + SIDE_JOBS.map((j) => {
    const streak = getStat(`sj_${j.id}_streak`);
    const shift = getStat(`sj_${j.id}_shift`);
    return `<div class="pa-cell"><span>${esc(j.name)}</span><span class="mut">${streak ? `${streak} op rij · beste dienst €${shift.toLocaleString('nl-NL')}` : 'nog niet gewerkt'}</span></div>`;
  }).join('') + '</div>';
}

// a small line icon per figure, so the cijferkolommen are not a wall of text (#611)
function figIco(name) {
  return `<span class="pa-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[name]}"/></svg></span>`;
}

function figuresBlock(st) {
  const figs = [
    ['Gelopen', fmtAmount(st.walked, 'm'), 'voet'], ['Gezwommen', fmtAmount(st.swum, 'm'), 'boot'], ['Rakelings', nl(st.nearMiss), 'wiel'], ['Gejat', nl(st.stolen), 'tas'],
    ['Wrakken', nl(st.wrecks), 'wiel'], ['Kusjes', nl(st.kisses), 'ster'], ['Treinritten', nl(st.trainTrips), 'trein'], ['Bijbaan-loon', `€${nl(getStat('sjEarned'))}`, 'munt'],
    ['Eierballen', `${st.eierballen}/${EIERBAL_TOTAL}`, 'mand'], ['Buurten', `${st.wijken}/${WIJKEN_TOTAL}`, 'kompas'], ['Gereden', fmtAmount(st.driven, 'm'), 'wiel'], ['Topsnelheid', fmtAmount(st.topSpeed, 'km/u'), 'rad'],
  ];
  return `<div class="pa-grid">${figs.map(([k, v, ico]) => `<div class="pa-cell"><span class="pa-fig-k">${figIco(ico)}<span class="mut">${k}</span></span><span class="bebas">${v}</span></div>`).join('')}</div>`;
}

// De gebieden en de kaart als balken (#435, #611): dezelfde stand die de prestaties hierboven tellen (buurt tot provincie).
function gebiedenBlock() {
  const o = getOverzicht();
  if (!o) return '<p class="m-note">De kaart wordt nog ingeladen. Probeer het zo nog eens.</p>';
  const cel = (id, naam, klaar, totaal) => {
    const pct = totaal ? (klaar / totaal) * 100 : 0;
    return `<div class="pa-cell"><span>${esc(naam)}</span><span class="mut pa-inline">${bar('g-' + id, pct)}<span>${klaar} van ${totaal}</span></span></div>`;
  };
  const rijen = [cel('kaart', 'Kaart verkend', o.kaart.gedaan, o.kaart.totaal)];
  for (const n of o.overzicht) rijen.push(cel(n.niveau.id, n.niveau.naam, n.voltooid, n.gebieden.length));
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

function detailHtml(it, catLabel, next) {
  // zonder keuze is het rechterpaneel niet leeg maar bruikbaar: de eerstvolgende
  // prestatie met haar cijfer en één knop die haar in de lijst opent.
  if (!it) {
    if (!next) return '<p class="mut">Kies een prestatie om te zien wat je ervoor doet.</p>';
    const nt = next.hidden ? '???' : dualHtml(next.title);
    const np = next.progress && !next.unlocked
      ? `<div class="pa-prog"><span class="m-num">${fmtAmount(next.progress.cur, next.progress.unit)} <span class="mut">/ ${fmtAmount(next.progress.goal, next.progress.unit)}</span></span>${bar('d-' + next.id, pctOf(next))}</div>`
      : '';
    return '<div class="pa-empty-pane">' +
      '<div class="pm-pane-top"><span class="m-eb">Eerstvolgende</span><h2 class="m-h2 td-h2"><span class="pa-ico big">' + iconSvg(next) + '</span>' + nt + '</h2></div>' +
      `<p>${next.hidden ? 'Geheim. Blijf rondkijken in Grunn.' : esc(next.desc)}</p>${np}` +
      `<div class="m-acts pa-next-acts ds-zeef"><button type="button" class="ds-z-knop" data-ach-next="${esc(next.id)}">Bekijk in de lijst</button></div></div>`;
  }
  const title = it.hidden ? '???' : dualHtml(it.title);
  const desc = it.hidden ? 'Geheim. Blijf rondkijken in Grunn.' : esc(it.desc);
  let prog = '';
  if (!it.hidden && it.progress && !it.unlocked) {
    const { cur, goal, unit } = it.progress;
    prog = `<div class="pa-prog"><span class="m-num">${fmtAmount(cur, unit)} <span class="mut">/ ${fmtAmount(goal, unit)}</span></span>${bar('d-' + it.id, pctOf(it))}</div>`;
  }
  return `<div class="pm-pane-top"><span class="m-eb">${esc(catLabel || 'Prestatie')}</span><h2 class="m-h2 td-h2"><span class="pa-ico big">${iconSvg(it)}</span>${title}</h2></div><p>${desc}</p>${prog}${it.hidden ? '' : layerText(it.id)}` +
    (it.unlocked ? `<p class="g">Behaald${it.at ? ` · ${whenText(it.at)}` : ''}</p>` : '') +
    (it.hidden ? '' : !it.unlocked && !it.progress ? '<p class="mut">Nog niet behaald.</p>' : '');
}

// #909: één blok bovenaan dat zegt hoe het ervoor staat, met hetzelfde cijfer als de balk in
// de tabrij en de vier getallen die er iets betekenen. Geen nieuwe definities: alles komt uit
// getAchievementSummary en dezelfde view als de lijst eronder.
function heroHtml(sum, near, verborgen) {
  const pct = sum.total ? (sum.done / sum.total) * 100 : 0;
  const teGaan = Math.max(0, sum.total - sum.done);
  const klaar = sum.total > 0 && sum.done >= sum.total;
  const lead = klaar
    ? 'Alles gehaald. Grunn is van jou.'
    : `${teGaan} ${teGaan === 1 ? 'prestatie' : 'prestaties'} te gaan${near.length ? `, ${near.length} ${near.length === 1 ? 'is' : 'zijn'} dichtbij` : ''}. Prestaties blijven bewaard, ook bij een nieuw spel.`;
  const cijfer = (n, woord) => `<span class="ds-z-waarde"><span class="ds-z-waarde__getal">${n}</span><span class="ds-z-waarde__eenheid">${woord}</span></span>`;
  return '<section class="ds-zeef ds-z-kaart pa-hero" aria-label="Prestaties">' +
    `<div class="ds-z-kaart__kop"><span class="ds-z-kaart__titel">Prestaties</span>${chip(klaar ? 'succes' : 'selectie', klaar ? 'ok' : 'ster', `${Math.round(pct)}%`)}</div>` +
    '<div class="pa-hero-rij">' + `<p class="ds-z-kaart__tekst">${esc(lead)}</p>` +
    '<div class="pa-hero-cijfers">' + cijfer(sum.done, 'behaald') + cijfer(teGaan, 'nog te gaan') + cijfer(near.length, 'bijna binnen') + cijfer(verborgen, 'nog geheim') + '</div></div>' +
    streep(pct, `${sum.done} van ${sum.total} behaald`, true) + '</section>';
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
  // de eerstvolgende over alle categorieën heen, voor het lege detailpaneel
  const nextOverall = nextOf([...near, ...all.filter((a) => !a.unlocked && !a.hidden && !near.includes(a))]);
  const tab = (id, label, n) => `<button type="button" role="tab" class="m-tab" data-achview="${id}" aria-selected="${tabView === id}">${label}${n != null ? `<small>${n}</small>` : ''}</button>`;
  const extras = [['gebieden', 'Gebieden', 'buurt tot provincie', gebiedenBlock()], ['cijfers', 'Cijfers', 'sinds je eerste spel', figuresBlock(st)], ['medailles', 'Medailles', 'per missie', medalsBlock()], ['records', 'Records', 'per bijbaantje', jobRecordsBlock()]];
  let list;
  if (tabView === 'bijna') list = near.length ? near.map((a) => row(a, a.catLabel)).join('')
    : '<div class="pa-leeg"><b>Nog niks dichtbij</b><p class="m-note">Speel wat rond: bijna elke prestatie laat vanzelf een balk zien zodra je begint.</p></div>';
  else if (tabView === 'behaald') list = done.length ? done.map((a) => row(a, a.catLabel)).join('')
    : '<div class="pa-leeg"><b>Nog niks behaald</b><p class="m-note">De eerste komt vanzelf: een missie, een ritje of een bezoekje aan de markt.</p></div>';
  else {
    // elke categorie is een kaart met een icoon, de stand in woorden, een balk en de
    // eerstvolgende prestatie; klikken vouwt de prestaties eronder open. De extras blijven
    // gewone vouwen onder de kaarten.
    list = '<div class="pa-cats">' + view.map(catTile).join('') + '</div><div class="m-rule"></div>' +
      extras.map(([id, t, hint, inner]) => disc(id, t, `<span class="mut">${hint}</span>`, inner, openExtra.has(id), `data-achextra="${id}"`)).join('');
  }
  el.dataset.sub = `${all.some((a) => a.hidden) ? `${all.filter((a) => a.hidden).length} verborgen · ` : ''}blijven bewaard`;
  el.innerHTML = `<div class="m-tabs"><nav class="m-tablist" role="tablist" aria-label="Weergave">${tab('alles', 'Alles')}${tab('bijna', 'Bijna binnen', near.length)}${tab('behaald', 'Behaald', done.length)}</nav>` +
    `<span class="m-grow"></span><span class="pa-total">${bar('total', sum.total ? (sum.done / sum.total) * 100 : 0)}<span class="m-num" data-pa-pct>${sum.done}</span><span class="mut">van ${sum.total} behaald</span></span></div>` +
    (achStilNoot(achievementsGated()) ? `<p class="m-note pa-stil" role="status">${achStilNoot(true)}</p>` : '') +
    heroHtml(sum, near, all.filter((a) => a.hidden).length) +
    `<div class="m-main"><div class="m-list pa-list">${list}</div><aside class="m-pane pa-pane" aria-live="polite">${detailHtml(selItem, selItem && selItem.catLabel, nextOverall)}</aside></div>`;
  zetCss();
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
      const n = e.target.closest('[data-ach-next]');
      if (t) { tabView = t.dataset.achview; renderAchievementsPanel(el, { keepFresh: true }); keepFocus(`[data-achview="${tabView}"]`); }
      else if (c) { const id = c.dataset.achcat; if (openCats.has(id)) openCats.delete(id); else openCats.add(id); renderAchievementsPanel(el, { keepFresh: true }); keepFocus(`[data-achcat="${id}"]`); }
      else if (x) { const id = x.dataset.achextra; if (openExtra.has(id)) openExtra.delete(id); else openExtra.add(id); renderAchievementsPanel(el, { keepFresh: true }); keepFocus(`[data-achextra="${id}"]`); }
      else if (n) {
        // vanaf de eerstvolgende in het paneel naar diezelfde prestatie in de lijst
        const id = n.dataset.achNext;
        const cat = all.find((it) => it.id === id);
        if (cat) openCats.add(cat.cat);
        tabView = 'alles'; sel = id;
        renderAchievementsPanel(el, { keepFresh: true });
        keepFocus(`[data-ach="${id}"]`);
      }
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
