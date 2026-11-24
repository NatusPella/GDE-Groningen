// The pause menu's Overzicht and Te doen sections (pausemenu.js owns the
// shell, keys and focus; this renders their content and handles their
// clicks). Data comes from todo.js; the look is menu.css (m-*) and
// pausemenu.css (ov-*, td-*).
import { icoon } from './icons.js';
import { hoofdspeler } from './players.js';
import { keyTextHtml } from './keycap.js';
import { wasHelped } from './assistlive.js';
import { getTodoItems, chooseTodo, mapIconUrl, placeName, GROUPS, STATUS_LABEL, buyFjordUpgrade, paspoortOverzicht, beginHierItems, beginHierCount } from './todo.js';
import { activityTodoItems } from './activities.js';
import { getStoryView, getStorySteps, requestCredits } from './story.js';
import { PARTS, WHY, partName } from './storyarc.js';
import { getAchievementView, getAchievementSummary, getSaveSet, EIERBAL_TOTAL, MEDALS } from './achievements.js';
import { SECRETS_TOTAL } from './geheimen.js';
import { getGoal, clearGoal, storyWaiting } from './goal.js';
import { formatDistance } from './routing.js';
import { deviceText } from './touchui.js';
import { KEYS } from './storagekeys.js';
import { dualHtml } from './subtitles.js';
import { loopbaanSamenvatting, loopbaanEersteKlusStand } from './loopbaanlive.js'; // #821, #846: de lussen in gewone taal
import { getSideJobList } from './sidejobs.js';
import { getOverzicht } from './gebiedenlive.js';
import { getStrekenStand } from './explorationlive.js';
import { streekOpenTekst } from './verkenpunten.js'; // #985: voortgang van de streken
import { samenvatting as gebiedenSamenvatting } from './gebieden.js';
import { fillBars, countTo } from './motion.js';
import { placeShot } from './placeshot.js';
import { todayInfo, todaySpecial, upcoming, today as calendarToday } from './calendarday.js';
import { agendaRegels } from './agendaregels.js'; // #985: evenementen staan ook vooruit in de agenda
import { calIcon } from './calendar.js';
import { tijdStreep } from './todotijd.js'; // #980: het tijdstreepje van een evenement

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PART_IDS = Object.keys(PARTS);

// Soort en Dichtbij blijven bewaard (#QoL): wie "Minigames" koos, begon na het sluiten van het
// menu weer op Alles. Alleen deze twee, geen selectie: een rij die je aanklikte hoeft niet terug.
const FILTER_KEY = KEYS.todoFilter;
function leesFilter() {
  try {
    const d = JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    // GROUPS, niet SHOWN: die wordt verderop in dit bestand pas bepaald
    const kind = GROUPS.some(([g]) => g === d.kind) ? d.kind : 'alles';
    return { kind, near: d.near === true };
  } catch (e) { return { kind: 'alles', near: false }; }
}
const bewaarFilter = () => {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify({ kind: ui.kind, near: ui.near })); } catch (e) { /* privémodus */ }
};
const startFilter = leesFilter();
const ui = { kind: startFilter.kind, near: startFilter.near, sel: null, open: null, more: new Set(), folds: new Set(['quick', 'voortgang']) };
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

// Betekenisnamen (icons.js, Phosphor, ADR 0041).
const ICON = { check: 'vinkje', lock: 'slot', flag: 'todo', pin: 'plek', chev: 'volgende', clock: 'tijd', coin: 'geld', cup: 'prestaties', stop: 'stop' };
const svg = (naam) => icoon(naam);

// Statuschips (designsysteem, #980): altijd een pictogram plus een woord, nooit alleen kleur. Op papier (in een kaart)
// erft de chip de rol van de kaart; in de lijst op glas draagt hij zelf de glasrol.
const CHIP_ICOON = { ok: 'vinkje', kan: 'afspelen', doel: 'todo', later: 'tijd', slot: 'slot', pin: 'plek', nieuw: 'ster', klok: 'tijd' };
const icoonSvg = icoon;
const chip = (toon, icoon, tekst, glas = false) => `<span class="${glas ? 'ds-zeef ' : ''}ds-z-chip${toon ? ' ds-z-chip--' + toon : ''}">${icoon ? icoonSvg(CHIP_ICOON[icoon], { cls: 'ds-z-chip__icoon', maat: 's' }) : ''}${esc(tekst)}</span>`;

const tijdStreepHtml = (tijd) => {
  const t = tijdStreep(tijd);
  return t ? `<div class="ds-z-balk ds-z-balk--tijd" style="--ds-z-w:${t.pct}%" role="img" aria-label="${esc(t.label)}"><span class="ds-z-balk__baan"><span class="ds-z-balk__vul"></span></span><span class="ds-z-balk__label">${esc(t.label)}</span></div>` : '';
};

// De kaarten van "Begin hier" en de rangorde in het detailpaneel zijn eigen opmaak. Die
// staat hier, zodat dit scherm zijn eigen vorm kan geven zonder menu.css of pausemenu.css
// te raken; de kleuren en lijnen komen uit de bestaande tokens.
const TDOU_CSS = `
#pause-menu .td-begin-cards { display: flex; flex-direction: column; gap: 10px; padding: 2px 0 10px; }
#pause-menu .td-card { gap: var(--ds-s-2); padding: var(--ds-s-3) var(--ds-s-4); }
#pause-menu .td-card:has(.td-card-main[aria-current="true"]) { border-color: var(--ds-c-ink-bord); box-shadow: var(--ds-schaduw-hard-bord); outline: var(--ds-lijn-dik) solid var(--ds-c-ink-bord); outline-offset: -1px; }
#pause-menu .td-card-main { display: grid; grid-template-columns: 24px 34px minmax(0, 1fr) auto; align-items: center; gap: var(--ds-s-3); width: 100%; min-height: 48px; padding: 0; border-radius: var(--ds-r); text-align: left; color: inherit; }
#pause-menu .td-card-main:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-focus); outline-offset: var(--ds-focus-afstand); }
#pause-menu .td-card-nm { display: flex; flex-direction: column; min-width: 0; }
#pause-menu .td-card-nm b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-kop); text-transform: uppercase; }
#pause-menu .td-card-ico { width: 30px; height: 30px; display: block; justify-self: center; }
#pause-menu .td-card-pin { display: grid; place-items: center; }
#pause-menu .td-card-pin svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .td-card-dist { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); }
#pause-menu .td-begin-nr { font-family: var(--ds-font-zeef-kop); font-size: var(--ds-t-subkop); line-height: 1; text-align: center; color: var(--ds-c-inkt-zacht); }
#pause-menu .td-card-chips { display: flex; flex-wrap: wrap; align-items: center; gap: var(--ds-s-2); }
#pause-menu .td-card-chips .ds-z-chip { min-height: 28px; padding: 0 var(--ds-s-3); }
#pause-menu .td-card .ds-z-balk { margin-top: 0; }
#pause-menu .ds-zeef.ds-z-chip { font-size: var(--ds-t-label); }
#pause-menu .td-begin-lead { padding: 0 0 8px; font-size: max(16px, var(--menu-min, 16px)); line-height: 1.35; }
/* Het detail: eerst wat dit is en wat het oplevert, dan de drie kloppende cijfers groot,
   en pas daarna de volledige lijst achter een vouw. */
#pause-menu .td-dtop .m-eb { white-space: normal; line-height: 1.35; letter-spacing: 0.14em; }
#pause-menu .td-dlead { display: flex; flex-direction: column; gap: 10px; }
#pause-menu .td-dlead p { max-width: 640px; }
#pause-menu .td-yield { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 20px; font-size: max(18px, var(--menu-min, 18px)); color: var(--mut); }
#pause-menu .td-yield-item { display: inline-flex; align-items: baseline; gap: 8px; min-width: 0; }
#pause-menu .td-yield b { font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 24px; letter-spacing: 0.03em; color: var(--g); }
#pause-menu .td-medals { font-size: max(18px, var(--menu-min, 18px)); }
#pause-menu .td-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
#pause-menu .td-kpi { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 10px 14px 12px; background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); box-shadow: var(--ds-schaduw-hard-klein); }
#pause-menu .td-kpi-v { font-family: var(--ds-font-zeef-kop); font-size: 34px; line-height: 1; letter-spacing: 0.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pause-menu .td-kpi-v small { font-size: 20px; color: var(--mut); }
#pause-menu .td-kpi-v.long { font-size: 22px; line-height: 1.15; white-space: normal; overflow-wrap: break-word; }
#pause-menu .td-kpi-l { font-size: max(15px, var(--menu-min, 15px)); line-height: 1.25; color: var(--mut); }
#pause-menu .td-kpi .m-bar { margin-top: 4px; }
#pause-menu .td-numgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px 24px; padding: 4px 0 8px; }
#pause-menu .td-numgrid .td-fact .m-num { font-size: 22px; }
#pause-menu .td-acts.ds-zeef { background: none; }
#pause-menu .td-next-acts .ds-z-knop { flex-direction: row; gap: var(--ds-s-2); min-height: var(--ds-doel-aanraken); padding: var(--ds-s-1) var(--ds-s-4); font-size: var(--ds-t-label); }
#pause-menu .td-next-acts .ds-z-knop svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .td-acts .ds-z-knop { flex-direction: row; gap: var(--ds-s-2); min-height: var(--ds-doel-aanraken); padding: var(--ds-s-1) var(--ds-s-4); font-size: var(--ds-t-label); }
#pause-menu .td-acts .ds-z-knop svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .td-acts .ds-z-knop--ghost { margin-left: auto; }
#pause-menu .td-dtijd { max-width: 420px; }
#pause-menu .td-leeg { margin: 8px 24px 16px; }
#pause-menu .td-leeg .ds-z-knop { min-height: var(--ds-doel-aanraken); font-size: var(--ds-t-label); }
#pause-menu .td-dleeg { margin: 24px 0; max-width: 520px; }
#pause-menu .td-drec { font-size: max(16px, var(--menu-min, 16px)); color: var(--mut); }
`;
let cssReady = false;
function ensureCss() {
  if (cssReady || typeof document === 'undefined') return;
  cssReady = true;
  const el = document.createElement('style');
  el.textContent = TDOU_CSS;
  document.head.appendChild(el);
}

let worldNow = null;

function refresh(world) {
  worldNow = world;
  items = getTodoItems(world);
  // attracties die alleen activities.js kent (#436, het reuzenrad): dezelfde afstand en hetzelfde
  // doel als de gewone regels, zodat kiezen, 'Op de kaart' en het overzicht gewoon werken
  const goal = getGoal();
  for (const it of activityTodoItems(world)) {
    if (items.some((q) => q.key === it.key)) continue; // staat hij er later toch in todo.js, dan één keer
    it.dist = Number.isFinite(it.x) ? Math.hypot(it.x - hoofdspeler(world).x, it.y - hoofdspeler(world).y) : null;
    it.isGoal = !!(goal && it.goal && goal.kind === it.goal.kind && goal.id === it.goal.id && (goal.kind !== 'place' || goal.name === it.goal.name));
    items.push(it);
  }
  byKey = new Map(items.map((it) => [it.key, it]));
}


export const isFolded = (id) => ui.folds.has(id);

// a folded group (pausemenu.js tells us which ones are open)
export function foldNote(id, on) {
  if (on) ui.folds.add(id); else ui.folds.delete(id);
}

// --- rows -------------------------------------------------------------------------

// Een medaille is een icoon plus het woord (#607): de naam van de medaille staat niet meer
// in een tooltip die je met een controller of schermlezer mist. Kleur wordt nooit de enige cue.
const medalDot = (m) => (m == null || !MEDALS[m] ? '' : `<span class="m-medal m${m}" aria-hidden="true"></span><span class="m-medal-t">${esc(MEDALS[m])}</span>`);

// the right-hand end of a row: your goal, its status, the distance
function endOf(it) {
  const bits = [];
  if (it.isGoal) bits.push(chip('succes', 'doel', 'Jouw doel', true));
  else if (it.status === 'nu') bits.push(chip('selectie', 'kan', 'Nu', true));
  else if (it.status === 'klaar' && it.medal == null) bits.push(chip('succes', 'ok', 'Klaar', true));
  else if (it.status === 'later') bits.push(chip('', 'later', STATUS_LABEL.later, true));
  else if (it.status === 'slot') bits.push(chip('', 'slot', STATUS_LABEL.slot, true));
  if (it.dist != null) bits.push(`<span class="v">${formatDistance(it.dist)}</span>`);
  return bits.join('');
}

function row(it, extra = '') {
  const off = it.status === 'later' || it.status === 'slot' || (it.status === 'klaar' && it.medal == null);
  // De catalogus (Activiteiten) heeft een eigen taal: het kaartpictogram van de activiteit (#607).
  // De verhaalmissies in Verhaal > Opdrachten houden hun eigen regel, zonder pictogram. Het
  // missienummer staat niet meer in beeld (#913): de titel en de context vertellen waar het over gaat.
  const ico = it.icon && it.group !== 'missies' && it.group !== 'verhaal' ? `<img class="td-ico" src="${mapIconUrl(it.icon, 22)}" alt="">` : '';
  // #681: het Ommeland-paspoort laat per dorp een voortgangsbalk zien; de rest van de rijen houdt zijn taal.
  const progress = it.progress ? `<span class="m-bar td-pbar" aria-hidden="true"><i data-bar="om-${esc(it.key)}" data-w="${it.progress.pct}"></i></span>` : '';
  return `<button type="button" class="m-li${off ? ' off' : ''}${extra}" data-todo="${esc(it.key)}" data-status="${it.status || ''}"${it.isGoal ? ' data-goal' : ''}${ui.sel === it.key ? ' aria-current="true"' : ''}>` + ico +
    `<span class="nm"><span class="one">${esc(it.title)}</span><span class="mut one">${esc(it.record && it.status !== 'nu' && it.status !== 'later' ? it.record : it.meta)}</span></span>` +
    `${progress}${medalDot(it.medal)}${endOf(it)}</button>`;
}

// --- Overzicht ------------------------------------------------------------------

function nearlyThere() {
  const out = [];
  for (const cat of getAchievementView()) {
    for (const a of cat.items) if (!a.unlocked && !a.hidden && a.progress && a.progress.cur > 0) out.push(a);
  }
  return out.sort((a, b) => b.progress.cur / b.progress.goal - a.progress.cur / a.progress.goal).slice(0, 3);
}

const PIN_SVG = icoon('plek', { cls: 'ov-pin' });
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
  const d = Math.hypot(g.x - hoofdspeler(world).x, g.y - hoofdspeler(world).y);
  return `<span class="ov-goal mut">${svg(ICON.flag)}<span class="one">Doel: ${esc(g.name)}${[formatDistance(d), wait ? `verhaal wacht: ${wait.label}` : ''].filter(Boolean).map((t) => ' · ' + esc(t)).join('')}</span>` +
    '<button type="button" class="m-bt" data-todo-clear>Doel wissen</button></span>';
}

function heroHtml(world) {
  const sv = getStoryView();
  if (sv.end) {
    const e = sv.ending;
    const open = e && !e.done ? [...e.challenges.map((c) => c.name), ...e.missions.map((m) => m.title)] : [];
    const text = open.length
      ? `Nog te doen voor de aftiteling: ${open.join(', ')}. Een overgeslagen missie telt pas als je hem alsnog haalt.`
      : 'Speel missies opnieuw als klus voor een betere medaille, verdien bij met een bijbaantje of zoek wat er nog verstopt ligt.';
    return `<article class="ov-hero"><div class="ov-main"><span class="m-eb">Het verhaal</span><h1 class="ov-title">${esc(sv.title)}</h1><p class="ov-lead">${esc(text)}</p></div>` +
      `<div class="m-acts"><button type="button" class="m-bg" data-todo-view="alles">Alles te doen</button>` +
      `${e && e.credits ? '<button type="button" class="m-bg" data-story-credits>Aftiteling bekijken</button>' : ''}</div>${goalLine(world)}</article>`;
  }
  const steps = getStorySteps().filter((s) => s.part === sv.part && s.available);
  const done = steps.filter((s) => s.done).length;
  const cur = getStorySteps().find((s) => s.current);
  const it = cur ? byKey.get(cur.kind === 'mission' ? 'm:' + cur.mission : 'st:' + cur.id) : null;
  const goal = getGoal();
  const title = cur ? cur.title : sv.title;
  const where = it && it.x != null ? placeName(world, it.x, it.y) : '';
  const shot = it && it.x != null ? placeShot(world, it.key, it.x, it.y, (url) => showHeroShot(it.key, url)) : null;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const stapNu = Math.min(done + 1, steps.length); // #1259: "Stap 0 van 12" bestaat niet: je bent bezig met stap 1
  return `<article class="ov-hero"${it ? ` data-todo-hero="${esc(it.key)}"` : ''}>${shot ? heroShotHtml(shot) : ''}` +
    `<div class="ov-main"><span class="m-eb">Het verhaal · ${esc(partName(sv.part))}</span>` +
    `<h1 class="ov-title${title.length > 20 ? " long" : ""}">${esc(title)}</h1>${cur && cur.lead ? `<p class="ov-lead">${esc(cur.lead)}</p>` : ''}` +
    `<div class="ov-prog"><span class="m-bar"><i data-bar="ov-part" data-w="${pct}"></i></span><span class="mut">Stap <span data-num="ov-part" data-to="${stapNu}">${stapNu}</span> van ${steps.length}${where ? ` · ${esc(where)}` : ''}</span></div></div>` +
    // UX-audit 23-11 (S7): Doorgaan staat al geel bovenaan de rail; een tweede gele Doorgaan hier was dubbel. De rest is secundair.
    `<div class="m-acts ov-acts">` +
    `${it && !goal ? `<button type="button" class="m-bg" data-todo-goal="${esc(it.key)}">Zet als doel</button>` : ''}` +
    `${it && goal ? `<button type="button" class="m-bg" data-todo-goal="${esc(it.key)}">Terug naar het verhaal</button>` : ''}` +
    `<button type="button" class="m-bg" data-goto="map">${svg(ICON.pin)}Op de kaart</button>` +
    `<button type="button" class="m-bg" data-todo-view="verhaal">Alle opdrachten</button>` +
    `<button type="button" class="m-bg" data-action="save" title="Bewaart je voortgang">Opslaan</button>` +
    `${sv.canSkip ? `<button type="button" class="m-bt" data-story-skip>${esc(sv.skipLabel)}</button>` : ''}</div>${goalLine(world)}</article>`;
}

// Today and the coming special days (calendarday.js)
function agendaHtml(world) {
  const t = todayInfo(world), sp = todaySpecial(world);
  const list = agendaRegels(calendarToday(world), { special: sp, specials: upcoming(world, 4), count: 6 });
  const item = (icon, name, when, on) => `<li${on ? ' data-on' : ''}>${calIcon(icon, 'ov-ag-ic')}<b>${esc(name)}</b><span class="mut">${esc(when)}</span></li>`;
  const inner = `<ul class="ov-agenda">` + list.map((r) => item(r.icon, r.name, r.when, r.on)).join('') +
    (!list.length ? '<li><span class="mut">Geen bijzondere dagen meer. Het blijft zomer.</span></li>' : '') + '</ul>';
  return disc('agenda', 'Agenda', `${t.long} · ${t.nazomer ? 'de nazomer houdt aan' : `zomerdag ${t.n}`}`, inner);
}

// #821: één blok "Je voortgang" dat de drie lussen naast elkaar zet, met alleen de bestaande
// systemen als bron (loopbaanlive, sidejobs, gebieden) en geen nieuwe teller of opslagsleutel.
function voortgangHtml(world) {
  let lb = null, ek = null, banen = [], gebieden = null, streken = null;
  try { lb = loopbaanSamenvatting(); } catch (e) { lb = null; }
  try { ek = loopbaanEersteKlusStand(); } catch (e) { ek = null; }
  try { banen = getSideJobList() || []; } catch (e) { banen = []; }
  try { const o = getOverzicht(); if (o) gebieden = gebiedenSamenvatting(o.profiel, o.ind); } catch (e) { gebieden = null; }
  try { streken = getStrekenStand(world); } catch (e) { streken = null; }
  const lbTekst = ek ? `${ek.gedaan} van ${ek.totaal} eerste klussen${ek.klaar ? ` · titel ${esc(ek.titel)}` : ''}${lb && lb.hoogste ? ` · hoogste titel: ${esc(lb.hoogste.titel)}` : ''}` : 'Nog niet geladen';
  const niveau2 = banen.filter((b) => b.level >= 2).length;
  const baanTekst = banen.length ? `${niveau2} van ${banen.length} banen op niveau 2 of hoger` : 'Nog geen baan gedaan';
  const gebiedTekst = gebieden ? `${gebieden.voltooid} van ${gebieden.totaal} gebieden veroverd` : 'De kaart wordt nog geladen';
  const rij = (naam, tekst) => `<div class="m-li pm-row"><span class="nm"><span class="one">${naam}</span><span class="mut one">${tekst}</span></span></div>`;
  const inner = '<div class="ov-voortgang">' + rij('Loopbaan', lbTekst) + rij('Bijbanen', baanTekst) + rij('Veroverd', gebiedTekst) + strekenHtml(streken, rij) +
    '<p class="m-note">Herhalen maakt één baan beter, variëren maakt je loopbaan breder, en alles in een gebied maakt je wijkheld.</p></div>';
  return disc('voortgang', 'Je voortgang', 'Drie lussen in gewone taal', inner);
}

// #985: "3 van 8 streken verkend" en per ontdekte streek wat er nog openstaat; onbekende streken
// blijven zonder naam, zoals op de kaart.
function strekenHtml(st, rij) {
  if (!st) return '';
  const onbekend = st.totaal - st.ontdekt;
  let uit = rij('Streken', `${st.verkend} van ${st.totaal} verkend${st.ontdekt > st.verkend ? ` · ${st.ontdekt - st.verkend} nog niet af` : ''}`);
  for (const r of st.rijen) if (r.ontdekt) uit += rij(esc(r.naam), esc(streekOpenTekst(r)));
  if (onbekend > 0) uit += rij('Nog onbekend', `${onbekend} ${onbekend === 1 ? 'streek' : 'streken'}: rij of loop erheen, of zoek het uitkijkpunt`);
  return uit;
}

function disc(id, title, hint, inner) {
  const open = ui.folds.has(id);
  return `<button type="button" class="m-disc" data-fold="${id}" aria-expanded="${open}" aria-controls="pm-f-${id}">${svg(ICON.chev)}<b>${esc(title)}</b><span class="mut one">${esc(hint)}</span></button>` +
    `<div class="m-fold" id="pm-f-${id}" data-fold-body="${id}"${open ? '' : ' hidden'}>${inner}</div>`;
}

// #1259: the Doorgaan button with its key as a keycap (never raw {ESC}); no key on a touch device.

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
    // #1259: "0/0 Missies klaar" zegt niets: de tegel komt er pas als er missies zijn
    // #1259 (hertest 24-11): geen "0/31" in een nieuw spel: zolang er niets af is, zegt de tegel hoeveel er te doen is
    (ms.length ? (mDone ? tile(ICON.flag, 'Missies klaar', `${mDone}/${ms.length}`, Math.round((mDone / ms.length) * 100), 'todo') : tile(ICON.flag, 'Missies te doen', String(ms.length), null, 'todo')) : '') +
    // #1259: staat Prestaties al in het voortgangsblok (pausemenu.js), dan geen tweede cijfer in een tegel
    ((extra.skipTiles || []).includes('prestaties') ? '' : tile(ICON.cup, 'Prestaties', `${ach.done}/${ach.total}`, ach.pct, 'prestaties')) +
    (found ? tile(ICON.pin, 'Gevonden', `${found}/${all}`, all ? Math.round((found / all) * 100) : 0, 'todo') : tile(ICON.pin, 'Te vinden', String(all), null, 'todo')) + '</div>';
}

// help: [[action, icon svg, label]] for the contextual buttons (pausemenu.js decides which)
// extra: { play: seconds played, quick: html of the quick settings }
export function renderOverview(el, world, help, extra = {}) {
  ensureCss();
  refresh(world);
  const near = items.filter((it) => it.dist != null && it.goal && it.goal !== 'story' && !['later', 'slot', 'nu'].includes(it.status))
    .sort((a, b) => a.dist - b.dist).slice(0, 3);
  const ach = nearlyThere();
  const helpHtml = `<div class="ov-help">${help.map(([a, ic, label]) => `<button type="button" class="m-bg" data-action="${a}">${ic}<span>${esc(label)}</span></button>`).join('')}</div>`;
  // a running mission can be stopped from here (#390): the button asks "Missie stoppen?" first (pausemenu.js); stopping is no failure
  // #985 punt 16: na een mislukking is er geen lopende missie, maar wel een aanbod om opnieuw te
  // beginnen. Dat stond hier niet, terwijl de Enter-hint na 40 s verdween: dan was de startmarker
  // de enige weg terug. Nu staat er dezelfde actie als Enter, zonder bevestiging (er valt niets
  // te verliezen: je begint gewoon opnieuw).
  const stopHtml = extra.stop && extra.stop.herstart
    ? `<div class="ov-stop"><div class="m-gh"><span>Mislukt</span></div><div class="m-li pm-row"><span class="nm"><span class="one">${esc(extra.stop.title)}</span></span><button type="button" class="m-bp" data-action="mission-retry"><span>Opnieuw beginnen</span></button></div></div>`
    : extra.stop ? `<div class="ov-stop"><div class="m-gh"><span>Missie bezig</span></div><div class="m-li pm-row"><span class="nm"><span class="one">${esc(extra.stop.title)}</span></span><button type="button" class="m-bg" data-action="mission-stop">${ICON.stop || ''}<span>Missie stoppen</span></button></div>` +
    '<div class="pm-confirm" data-stop-confirm hidden><p>Missie stoppen?</p><p class="m-note">Je krijgt geen straf en je kunt hem opnieuw starten. Wat je in deze poging deed, telt niet mee.</p>' +
    '<div class="m-acts"><button type="button" class="m-bp" data-action="mission-stop-go">Ja, stoppen</button><button type="button" class="m-bt" data-action="mission-stop-no">Nee, doorgaan</button></div></div></div>' : '';
  // #965: de hero staat buiten de scroller. De tabs en de grote kop blijven staan
  // en alleen wat eronder komt (voortgang, tegels, dichtbij, vouwen) scrolt; eerst
  // schoof de kop onder de tabbalk en werd hij daar afgekapt.
  el.innerHTML = heroHtml(world) + '<div class="ov-scroll">' + stopHtml + tilesHtml(world, extra) + voortgangHtml(world) +
    '<div class="ov-cols"><section aria-label="Dichtbij" class="ov-col"><div class="m-gh"><span>Dichtbij</span></div>' +
    (near.length ? `<div class="ov-rows">${near.map((it) => row(it)).join('')}</div>` : '<p class="m-note">Niks in de buurt. Kijk bij Activiteiten.</p>') +
    '</section><section aria-label="Bijna binnen" class="ov-col"><div class="m-gh"><span>Bijna binnen</span></div>' +
    (ach.length ? `<div class="ov-rows">${ach.map((a) => `<button type="button" class="m-li ov-a" data-goto="prestaties"><span class="nm"><span class="ov-a-t"><span class="one">${dualHtml(a.title)}</span>` +
      `<span class="v"><span data-num="ach-${esc(a.id)}" data-to="${a.progress.cur}">${a.progress.cur}</span>/${a.progress.goal}</span></span>` +
      `<span class="m-bar"><i data-bar="ach-${esc(a.id)}" data-w="${Math.round((a.progress.cur / a.progress.goal) * 100)}"></i></span></span></button>`).join('')}</div>`
      : '<p class="m-note">Speel wat rond, dan komen ze vanzelf.</p>') +
    '</section></div><div class="ov-folds"><div class="m-rule"></div>' +
    (extra.quick ? disc('quick', 'Snel instellen', 'Geluid en beweging', extra.quick) : '') + disc('help', 'Vastgelopen?', 'Naar huis of jezelf vrijzetten', helpHtml) + agendaHtml(world) + '</div></div>';
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

// De volgende stap (#435): de stap die nu loopt; loopt er geen, dan de eerste
// die je kunt doen en nog niet klaar is. Puur, zodat verhaalopdrachten_test hem
// kan natrekken.
export function volgendeStap(steps) {
  const lijst = Array.isArray(steps) ? steps : [];
  return lijst.find((s) => s.current) || lijst.find((s) => s.available && !s.done) || null;
}

// Bovenaan Opdrachten: wat je nu moet doen, met de context erbij (#435, #912) en één knop naar de
// plek. Het missienummer staat er niet in (#913): titel, hoofdstuk en voortgang vertellen genoeg.
function nextHtml(cur) {
  if (!cur) return '';
  const it = byKey.get(cur.kind === 'mission' ? 'm:' + cur.mission : 'st:' + cur.id);
  const list = getStorySteps().filter((s) => s.part === cur.part);
  const done = list.filter((s) => s.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const goal = getGoal();
  return `<section class="td-next" aria-label="Volgende stap"><div class="td-next-top"><span class="m-eb">Waar je nu bent · ${esc(partName(cur.part))}</span>${chip('selectie', 'kan', 'Nu', true)}</div>` +
    `<b class="td-next-t">${esc(cur.title)}</b>${cur.lead ? `<p class="td-next-lead">${esc(cur.lead)}</p>` : ''}` +
    `<div class="td-next-prog"><span class="m-bar on"><i data-bar="next-${cur.part}" data-w="${pct}"></i></span><span class="mut">${done} van ${list.length} in dit hoofdstuk</span></div>` +
    (it ? `<div class="m-acts td-next-acts ds-zeef"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-todo-goal="${esc(it.key)}">${svg(ICON.flag)}${goal ? 'Terug naar het verhaal' : 'Zet als doel'}</button></div>` : '') + '</section>';
}

// De hoofdstukken als één rustige lijst (#912): het hoofdstuk waar je bent staat open, afgeronde
// hoofdstukken zijn één regel met hun stand, en wat nog komt staat op slot of te wachten. De namen
// komen uit partName(), zodat "Akte 3: Aan de Eems" en "Deel 4: Nazomer" geen administratie meer
// zijn maar gewoon twee hoofdstukken na elkaar.
function storyHtml() {
  const steps = getStorySteps();
  const cur = volgendeStap(steps);
  const curPart = cur ? cur.part : null;
  if (!ui.open) ui.open = new Set([curPart || PART_IDS[PART_IDS.length - 1]]);
  const info = PART_IDS.map((part) => {
    const list = steps.filter((s) => s.part === part);
    return { part, P: PARTS[part], list, done: list.filter((s) => s.done).length };
  });
  const byPart = new Map(info.map((p) => [p.part, p]));
  const klaar = new Set(info.filter((p) => p.list.length && p.done === p.list.length).map((p) => p.part));
  return nextHtml(cur) + PART_IDS.map((part) => {
    const { P, list, done } = byPart.get(part);
    const naam = partName(part);
    // Een hoofdstuk na een finale (Nazomer) wacht op de eindkaart van het hoofdstuk ervoor: het
    // staat niet als "nu te spelen" in de lijst voordat die kaart is geweest.
    const wacht = !!(P.after && !klaar.has(P.after));
    const openbaar = !!P.open && !wacht && list.some((s) => s.available);
    const af = list.length > 0 && done === list.length;
    const nu = part === curPart;
    const open = ui.open.has(part) && openbaar;
    const count = `<span class="v"><span data-num="part-${part}" data-to="${done}">${done}</span>/${list.length}</span>`;
    const stand = af ? `Afgerond · ${done} van ${list.length}` : nu ? `${done} van ${list.length} · nu` : openbaar ? `${done} van ${list.length}` : wacht ? 'Wacht op het einde hiervoor' : 'Op slot';
    const ico = af ? svg(ICON.check) : !openbaar ? svg(ICON.lock) : svg(ICON.chev);
    if (!open) {
      // Een hoofdstuk dat nog niet kan, is geen knop die niets doet: het staat als rustige regel
      // met een slot. Een hoofdstuk dat je al haalde of waar je bent, klapt wel open.
      const inner = `<span class="td-chapter-ico" aria-hidden="true">${ico}</span>` +
        `<span class="nm"><span class="one">${esc(naam)}</span><span class="mut one">${esc(stand)}</span></span>` +
        `${openbaar ? count : ''}${nu ? chip('selectie', 'kan', 'Hier ben je', true) : af ? chip('succes', 'ok', 'Klaar', true) : ''}`;
      return `<section class="td-chapter${nu ? ' td-here' : ''}${af ? ' td-done' : ''}">` +
        (openbaar ? `<button type="button" class="m-li td-chapter-row" data-part-toggle="${part}" aria-expanded="false">${inner}</button>` : `<div class="m-li td-chapter-row off">${inner}</div>`) + '</section>';
    }
    const first = list.findIndex((s) => !s.done);
    let cut = list.length - 1;
    if (first >= 0 && !ui.more.has(part) && !af) {
      const m = list.findIndex((s, k) => k >= first && s.kind === 'mission' && !s.current);
      if (m >= 0) cut = m;
    }
    const rest = list.length - 1 - cut;
    const body = list.slice(0, cut + 1).map((s) => {
      if (s.kind === 'mission') { const it = byKey.get('m:' + s.mission); return it ? row(it, nu && s.current ? ' td-current' : '') : ''; }
      return stepRow(s);
    }).join('');
    const more = rest > 0 ? `<button type="button" class="m-more" data-part-more="${part}">Nog ${rest} ${rest === 1 ? 'stap' : 'stappen'} tot ${esc(list[list.length - 1].title)}</button>` : '';
    const why = nu && WHY[part] ? `<p class="m-note td-why"><b>Waar het om draait:</b> ${esc(WHY[part])}</p>` : '';
    return `<section class="td-chapter td-chapter-open${nu ? ' td-here' : ''}${af ? ' td-done' : ''}">` +
      `<button type="button" class="m-gh m-ghbtn td-chapter-head" data-part-toggle="${part}" aria-expanded="true"><span class="cur">${esc(naam)}</span><span>${esc(stand)}</span></button>` +
      `<div class="m-bar td-pbar on"><i data-bar="part-${part}" data-w="${list.length ? Math.round((done / list.length) * 100) : 0}"></i></div>` +
      `${body}${more}${why}</section>`;
  }).join('');
}

const SHOW_FIRST = 4;

// De Dichtbij-filter (#607): het is een filter boven dezelfde lijst, geen eigen weergave met
// eigen klikgedrag. Elke rij opent het detail, waar je hem ook aanklikt.
export function setTodoFilter(near) { ui.near = !!near; }

// De kop van Activiteiten (#907): in één oogopslag hoeveel er te doen is en hoeveel daarvan
// een plek op de kaart heeft. Dezelfde tellingen als de filters eronder, dus geen tweede waarheid.
// Wat "dichtbij" heet: één grens voor de hero, de filterchip en de ondertitel van het scherm,
// zodat dezelfde drie plekken nooit verschillende getallen met hetzelfde woord tonen.
const DICHTBIJ_M = 600;
const telDichtbij = (lijst) => lijst.filter((it) => it.dist != null && it.dist < DICHTBIJ_M).length;

function activiteitenHero(eigen, metPlek) {
  const dichtbij = telDichtbij(eigen);
  return `<section class="td-acthero" aria-label="Activiteiten"><div class="td-acthero-main"><b class="td-acthero-t">${eigen.length} ${eigen.length === 1 ? 'ding' : 'dingen'} in en om Grunn</b>` +
    `<span class="td-acthero-lead">Kies er een voor de uitleg, de afstand en de knop naar de plek.</span></div>` +
    `<div class="td-acthero-facts ds-zeef">${chip('selectie', 'pin', `${dichtbij} dichtbij`)}${chip('', 'pin', `${metPlek} met een plek`)}</div></section>`;
}

// #681: het Ommeland-paspoort boven de lijst: één balk voor de dorpen en de hint vanaf 80%.
// De dorpen zelf staan als gewone rijen in de groep Ommeland (todo.js), dus de kaart leest ze ook.
function paspoortHtml() {
  if (!worldNow) return '';
  const p = paspoortOverzicht(worldNow);
  const hint = p.hint.length ? `<p class="m-note">${p.hint.map((h) => esc(h)).join(' · ')}</p>` : '';
  return `<section class="td-passport"><div class="m-gh"><span>Ommeland-paspoort</span><span>${p.klaar} van ${p.totaal} dorpen · ${p.onderdelenKlaar} van ${p.onderdelenTotaal} onderdelen</span></div>` +
    `<div class="td-passport-row"><span class="m-num">${p.pct}%</span><span class="m-bar on"><i data-bar="om-paspoort" data-w="${p.pct}"></i></span><span class="mut">vier dingen per dorp</span></div>${hint}</section>`;
}

// #813: bovenaan Te doen de telling en de drie dichtstbijzijnde dingen. De
// rijen zijn gewone data-todo-rijen, zodat kiezen en het detail gelijk blijven.
// Sinds het Activiteiten-scherm is opgeschoond is elke rij een kaart met het
// categoriepictogram, de naam, de afstand en één knop naar de plek; de eerste
// kaart zegt waarom hij de eerstvolgende is.
const GROUP_LABEL = Object.fromEntries(GROUPS.map(([g, label]) => [g, label]));

function beginCard(it, i) {
  const first = i === 0;
  const ico = it.icon ? `<img class="td-card-ico" src="${mapIconUrl(it.icon, 30)}" alt="">` : `<span class="td-card-pin" aria-hidden="true">${svg(ICON.pin)}</span>`;
  // De statuschips: wat je er mee kunt (Kan nu), waarom hij bovenaan staat, en de soort. "Kan nu" alleen als hij nu te starten is.
  const chips = [];
  if (it.isGoal) chips.push(chip('succes', 'doel', 'Jouw doel'));
  else if (first) chips.push(chip('selectie', 'ok', 'Eerstvolgende'));
  if (it.status === 'nu' && !it.isGoal) chips.push(chip('primair', 'kan', 'Kan nu'));
  if (it.key === 'om:uitkijk' && it.pin) chips.push(chip('selectie', 'nieuw', 'Nieuwe streek'));
  const ts = tijdStreep(it.tijd);
  if (ts) chips.push(chip(it.tijd.loopt ? 'waarschuwing' : '', 'klok', ts.chip));
  chips.push(chip('', null, GROUP_LABEL[it.group] || it.where || 'In Grunn'));
  // #1267 (hertest 24-11): de kaart zelf heeft geen knoppen meer. "Zet als doel" en "Op de kaart" staan op één plek, in het detail
  // rechts (de kaart kiezen toont het detail; Enter op een kaart zet hem meteen als doel). Zo zie je ze niet per kaart en nog eens in het detail.
  return `<div class="td-card ds-zeef ds-z-kaart${first ? ' td-card-next' : ''}" data-status="${it.status || ''}">` +
    `<button type="button" class="td-card-main" data-todo="${esc(it.key)}" data-status="${it.status || ''}"${it.isGoal ? ' data-goal' : ''}${ui.sel === it.key ? ' aria-current="true"' : ''}>` +
    `<span class="td-begin-nr" aria-hidden="true">${i + 1}</span>${ico}` +
    `<span class="td-card-nm"><b>${esc(it.title)}</b></span>` +
    `<span class="td-card-dist">${it.dist != null ? formatDistance(it.dist) : ''}</span></button>` +
    `<div class="td-card-chips">${chips.join('')}</div>${tijdStreepHtml(it.tijd)}</div>`;
}

function beginHierHtml() {
  if (!worldNow) return '';
  const p = hoofdspeler(worldNow);
  const near = beginHierItems(items, p, 3);
  const n = beginHierCount(items, p);
  if (!n) return '';
  const next = near[0];
  return `<section class="td-begin" aria-label="Begin hier"><div class="m-gh"><span>Begin hier</span><span>${n} te doen</span></div>` +
    `<p class="m-note td-begin-lead">Er is hier ${n} te doen.${next ? ` De eerste kaart is het dichtstbij: <b>${esc(next.title)}</b>${next.dist != null ? `, ${esc(formatDistance(next.dist))} van hier` : ''}.` : ''}</p>` +
    `<div class="td-begin-list td-begin-cards">${near.map(beginCard).join('')}</div></section>`;
}

function allHtml() {
  const eigen = items.filter(isActiviteit);
  const counts = Object.fromEntries(SHOWN.map(([g]) => [g, eigen.filter((it) => it.group === g).length]));
  const total = eigen.length;
  const metPlek = eigen.filter((it) => it.dist != null).length;
  // De chip heet Dichtbij en telt daarom hetzelfde als de hero: wat binnen 600 m is. Eerst stond er
  // "Dichtbij 140" naast "12 dichtbij" (het aantal met een plek), twee getallen met één woord.
  const dichtbij = telDichtbij(eigen);
  const begin = beginHierHtml();
  const filter = `<div class="m-chips" role="group" aria-label="Filter"><button type="button" class="m-chip" data-todo-near aria-pressed="${ui.near}">Dichtbij <span>${dichtbij}</span></button></div>`;
  const chips = `<div class="m-chips" role="radiogroup" aria-label="Soort"><button type="button" class="m-chip" role="radio" data-todo-kind="alles" aria-checked="${ui.kind === 'alles'}">Alles <span>${total}</span></button>` +
    SHOWN.map(([g, label]) => `<button type="button" class="m-chip" role="radio" data-todo-kind="${g}" aria-checked="${ui.kind === g}">${label} <span>${counts[g]}</span></button>`).join('') + '</div>';
  const tools = `<div class="td-acttools"><div class="m-gh"><span>Wat wil je doen?</span><span>Kies een soort of blijf bij alles</span></div>${filter}${chips}</div>`;
  const hero = activiteitenHero(eigen, metPlek);
  if (!total) {
    return `<div class="ds-zeef ds-z-leeg td-leeg"><span class="ds-z-leeg__beeld">${svg(ICON.pin)}</span><div class="ds-z-leeg__kop">Nog niets te doen in de buurt</div><p class="ds-z-leeg__tekst">Loop of rij door Grunn: klussen, minigames en uitjes verschijnen hier zodra je ze tegenkomt. Op de kaart zie je waar je heen kunt.</p><button type="button" class="ds-z-knop" data-goto="map">Naar de kaart</button></div>`;
  }
  if (ui.near) {
    const label = ((SHOWN.find(([g]) => g === ui.kind) || [])[1] || '');
    const list = eigen.filter((it) => it.dist != null && (ui.kind === 'alles' || it.group === ui.kind))
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
    return hero + begin + tools + `<div class="m-gh"><span>Dichtbij${label ? ` · ${esc(label)}` : ''}</span><span>${list.length} ${list.length === 1 ? 'ding' : 'dingen'} met een plek, dichtstbij eerst</span></div>` + list.map((it) => row(it)).join('') +
      (!list.length ? `<div class="ds-zeef ds-z-leeg td-leeg"><div class="ds-z-leeg__kop">Niks met een plek in deze soort</div><p class="ds-z-leeg__tekst">Kies een andere soort, of zet de filter Dichtbij uit om alles te zien.</p><button type="button" class="ds-z-knop" data-todo-near>Filter uitzetten</button></div>` : '');
  }
  const groups = SHOWN.filter(([g]) => ui.kind === 'alles' || ui.kind === g).map(([g, label, sub]) => {
    let list = eigen.filter((it) => it.group === g);
    if (!list.length) return '';
    const all = ui.kind !== 'alles' || ui.more.has('g:' + g);
    const shown = all ? list : list.slice(0, SHOW_FIRST);
    // the one you picked stays in view
    const sel = list.find((it) => it.key === ui.sel);
    if (!all && sel && !shown.includes(sel)) shown[shown.length - 1] = sel;
    const rest = list.length - shown.length;
    return `<section class="td-group"><div class="m-gh"><span>${esc(label)}</span><span>${list.length} · ${esc(sub)}</span></div><div class="td-group-rows">${shown.map((it) => row(it)).join('')}</div>` +
      (rest > 0 ? `<button type="button" class="m-more" data-grp-more="${g}">Nog ${rest} ${esc(label.toLowerCase())}</button>` : '') + '</section>';
  }).join('');
  return hero + begin + tools + ((ui.kind === 'alles' || ui.kind === 'ommeland') ? paspoortHtml() : '') + groups;
}

// Eén vaste opmaak voor een feit, niet afhankelijk van de lengte van de tekst (#607): het
// label staat ernaast, de waarde heeft altijd dezelfde cijferstijl.
function factHtml(k, v) {
  return `<div class="m-fact td-fact"><span>${esc(k)}</span><span class="m-num">${esc(String(v))}</span></div>`;
}

function detailHtml(world) {
  const it = byKey.get(ui.sel);
  if (!it) return `<div class="ds-zeef ds-z-leeg td-dleeg"><span class="ds-z-leeg__beeld">${svg(ICON.pin)}</span><div class="ds-z-leeg__kop">Kies iets uit de lijst</div><p class="ds-z-leeg__tekst">Dan zie je wat het is, wat het oplevert en hoe ver het is.</p></div>`;
  const d = it.detail || {};
  const sv = getStoryView();
  // Rangorde in het detail. Eerst wat dit is en wat het oplevert, dan de drie
  // belangrijkste getallen groot, en pas daarna de volledige lijst achter een vouw.
  // Een teller ("Kerken 0 van 353") is een cijfer om te halen; een gewone regel
  // ("Dichtstbijzijnde · De Fontein · 290 m", "Beloning €120") vertelt het verhaal
  // en hoort dus boven, niet in het raster.
  const all = d.rows || [];
  const isCount = ([, v]) => /^\d[\d.]*\s+van\s+\d/.test(String(v));
  const isYield = ([k]) => /^(Beloning|Prijs|Verdien|Niveau|Loon|Kosten|Opbrengst)\b/i.test(k);
  const counts = all.filter(isCount);
  const plain = all.filter((r) => !isCount(r));
  const yields = plain.filter(isYield);
  const kpis = [];
  const rest = plain.filter((r) => !isYield(r));
  // een sleutel bevat een dubbele punt ("col:herkenningspunten"); in een id en een
  // data-bar-naam is dat onhandig, dus daar alleen letters, cijfers en streepjes
  const id = String(it.key).replace(/[^a-z0-9-]+/gi, '-');
  const prog = /^(\d[\d.]*)\s+van\s+(\d[\d.]*)(?:\s+(.*))?$/.exec(String(it.record || ''));
  if (prog) {
    const cur = Number(prog[1].replace(/\./g, '')), tot = Number(prog[2].replace(/\./g, ''));
    kpis.push(`<div class="td-kpi"><span class="td-kpi-v"><span data-num="td-${id}" data-to="${cur}">${esc(prog[1])}</span><small> van ${esc(prog[2])}</small></span>` +
      `<span class="td-kpi-l">${esc((prog[3] || 'gedaan').replace(/^·\s*/, ''))}</span><span class="m-bar" aria-hidden="true"><i data-bar="td-${id}" data-w="${tot ? Math.round((cur / tot) * 100) : 0}"></i></span></div>`);
  }
  // Een groot cijfer is alleen een cijfer als er ook iets te tellen valt: een regel met
  // een getal (afstand, bedrag, niveau) of een korte plek/aanduiding. Een zin als
  // "Eerste klus gedaan" hoort in de lijst eronder, niet in een kader.
  const isMetric = (k, v) => /\d/.test(String(v)) || /^(Start|Waar|Hier begin je|Route|Zones?|Banen)$/i.test(k);
  const kpiTaken = new Set();
  for (let i = 0; i < rest.length; i++) {
    const [k, v] = rest[i];
    if (kpis.length >= 3) break;
    // dezelfde stand niet twee keer groot: de teller uit `record` zegt het al
    if (prog && /^stand$/i.test(k)) continue;
    const parts = String(v).split(' · ');
    const tail = parts.length > 1 ? parts[parts.length - 1] : '';
    if (/^\d+([.,]\d+)?\s*(m|km)$/.test(tail)) {
      kpis.push(`<div class="td-kpi"><span class="td-kpi-v">${esc(tail)}</span><span class="td-kpi-l">${esc(k)}${parts.length > 1 ? ` · ${esc(parts.slice(0, -1).join(' · '))}` : ''}</span></div>`);
    } else if (isMetric(k, v) && String(v).length <= 24) {
      kpis.push(`<div class="td-kpi"><span class="td-kpi-v${String(v).length > 14 ? ' long' : ''}">${esc(v)}</span><span class="td-kpi-l">${esc(k)}</span></div>`);
    } else continue;
    kpiTaken.add(i);
  }
  // de teller uit `record` staat al groot; een tweede "Stand 0/353" eronder is dubbel
  const usedRest = rest.filter((r, i) => !kpiTaken.has(i) && !(prog && /^stand$/i.test(r[0])));
  const medals = d.medals ? `<div class="m-row2 td-medals"><span class="mut">Medailles</span>${d.medals.map(([m, text]) => `<span${it.medal >= m ? '' : ' class="mut"'}><span class="m-medal m${m}"></span>${esc(text)}</span>`).join('')}</div>` : '';
  const story = it.goal === 'story';
  let primary = '';
  if (it.upgrade && it.status !== 'klaar') primary = `<button type="button" class="ds-z-knop" data-todo-buy="${esc(it.upgrade)}">Kopen (${esc(it.record)})</button>`;
  else if (it.goal && !it.isGoal) primary = `<button type="button" class="ds-z-knop" data-todo-goal="${esc(it.key)}">${svg(ICON.flag)}${story && getGoal() ? 'Terug naar het verhaal' : 'Zet als doel'}${deviceText(keyTextHtml('{ENTER}'), '')}</button>`;
  let more = '';
  if (it.isGoal) more += '<button type="button" class="ds-z-knop ds-z-knop--secundair" data-todo-clear>Doel wissen</button>';
  if (it.dist != null) more += `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-todo-map="${esc(it.key)}">${svg(ICON.pin)}Op de kaart</button>`;
  // #681: vanuit het paspoort de trein plannen: de kaart opent op het station, waar de reisopties staan.
  if (it.trein && it.trein.lijnen && it.trein.lijnen.length) more += `<button type="button" class="ds-z-knop ds-z-knop--secundair" data-todo-trein="${esc(it.key)}">${svg(ICON.clock)}Trein plannen</button>`;
  let quiet = '';
  if (it.status === 'nu' && sv.canSkip && (story || it.mission != null)) quiet += `<button type="button" class="ds-z-knop ds-z-knop--ghost" data-story-skip>${esc(sv.skipLabel)}</button>`;
  if (it.stopJob) quiet += '<button type="button" class="ds-z-knop ds-z-knop--gevaar" data-todo-stopjob>Dienst stoppen</button>';
  const acts = primary + more + quiet;
  const kick = [d.kicker, it.dist != null ? formatDistance(it.dist) : ''].filter(Boolean).join(' · ');
  // De stand staat als woord naast de titel (#907): kleur of een streepje is nooit de enige aanwijzing.
  const stand = it.isGoal ? 'Jouw doel' : it.status === 'nu' ? 'Nu' : it.status === 'klaar' ? 'Klaar' : it.status === 'later' ? 'Later' : it.status === 'slot' ? 'Op slot' : '';
  const standChip = it.isGoal ? chip('succes', 'doel', 'Jouw doel', true) : it.status === 'nu' ? chip('primair', 'kan', 'Kan nu', true) : it.status === 'klaar' ? chip('succes', 'ok', 'Klaar', true) : it.status === 'later' ? chip('', 'later', 'Later', true) : it.status === 'slot' ? chip('', 'slot', 'Op slot', true) : '';
  // wat dit oplevert staat direct onder de uitleg, als label plus bedrag; deze regels
  // gaan niet nog eens in het cijferraster
  const yieldLine = yields.length ? `<p class="td-yield">${yields.map(([k, v]) => `<span class="td-yield-item"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</p>` : '';
  const tijdLijn = it.tijd ? `<div class="td-dtijd ds-zeef">${tijdStreepHtml(it.tijd)}</div>` : '';
  const recLine = it.record && !prog ? `<p class="td-drec">${medalDot(it.medal)} ${esc(it.record)}</p>` : '';
  // het volledige raster staat achter een vouw: het vertelt de fijnere standen (kerken,
  // molens, borgen) pas als je erom vraagt, in plaats van als muur van getallen bovenaan
  const detailRows = usedRest.length + counts.length;
  const facts = detailRows
    ? disc('td-feiten-' + id, 'Meer details', '', // #1267: geen telling van regels (leek een debugregel)
      `<div class="td-numgrid">${usedRest.map(([k, v]) => factHtml(k, v)).join('')}${counts.map(([k, v]) => factHtml(k, v)).join('')}</div>`)
    : '';
  return `<div class="pm-pane-top td-dtop"><span class="m-eb">${esc(kick)}</span><div class="td-dhead"><h2 class="m-h2 td-h2">${esc(it.title)}</h2>${stand ? standChip : ''}</div></div>` +
    `<div class="td-dlead">${d.text ? `<p>${esc(d.text)}</p>` : ''}${tijdLijn}${yieldLine}${medals}${recLine}</div>` +
    (kpis.length ? `<div class="td-kpis">${kpis.join('')}</div>` : '') + facts +
    '<span class="m-grow"></span>' +
    (acts ? `<div class="m-acts td-acts ds-zeef">${acts}</div>` : '') + (it.goal == null && it.dist == null ? '<p class="mut">Hier is geen route naartoe: dit moet je zelf vinden.</p>' : '');
}

// The sub-tab counts and the sheet subtitle.
export function todoSummary(world) {
  const steps = getStorySteps().filter((s) => s.available);
  const sDone = steps.filter((s) => s.done).length;
  const ms = items.filter((it) => it.group === 'missies');
  const end = getStoryView().ending;
  const toEnd = end && !end.done ? ` · nog ${end.count} tot het einde` : '';
  return {
    verhaal: '', opdrachten: '', alles: String(items.filter(isActiviteit).length),
    subTodo: `${items.filter(isActiviteit).length} dingen in en om Grunn · ${telDichtbij(items.filter(isActiviteit))} dichtbij · Veroverd staat in de rail`,
    sub: `${sDone} van ${steps.length} verhaalstappen · ${ms.filter((it) => it.status === 'klaar').length} van ${ms.length} missies${toEnd}`,
  };
}

// Verhaal > Opdrachten (#430): de verhaalstappen en missies, met dezelfde lijst en dezelfde details als eerst onder Te doen.
// Bijbanen horen bij een loopbaan (loopbaan.js) en staan onder Loopbanen; Activiteiten heeft ze niet nog een keer (#430).
// Verhaalmissies staan onder Verhaal > Opdrachten, niet onder Activiteiten (#435)
const isActiviteit = (it) => it.group !== 'verhaal' && it.group !== 'bijbaantjes' && it.group !== 'missies';
const SHOWN = GROUPS.filter(([g]) => g !== 'bijbaantjes' && g !== 'missies');
// De bijbanen die nu te kiezen zijn, voor de lijst met banen bij een loopbaan (#430: ze staan als job-rij in
// de catalogus; de loopbaan gebruikt dezelfde keys, zodat er geen tweede lijst met aanbiedingen is).
export function baanDoelen(world) {
  refresh(world);
  return new Set(items.filter((it) => it.key.startsWith('job:')).map((it) => it.key.slice(4)));
}

export function renderTodoStory(el, world) {
  ensureCss();
  refresh(world);
  if (!ui.sel || !byKey.has(ui.sel) || isActiviteit(byKey.get(ui.sel))) { // een uitgekozen activiteit hoort niet in het detail van Opdrachten
    // #1265: bij een leeg beginstuk (nog geen open missie) kiest het detail eerst het huidige verhaalitem, nooit zomaar een minigame (Padel)
    const verhaal = (it) => it.goal === 'story' || it.group === 'missies';
    const cur = items.find((it) => it.status === 'nu' && verhaal(it)) || items.find(verhaal) || items.find((it) => !isActiviteit(it)) || items[0];
    ui.sel = cur ? cur.key : null;
  }
  el.querySelector('.td-list').innerHTML = storyHtml();
  el.querySelector('.td-detail').innerHTML = detailHtml(world);
  animateChanges(el);
}

export function renderTodo(panel, world) {
  ensureCss();
  refresh(world);
  if (!ui.sel || !byKey.has(ui.sel) || !isActiviteit(byKey.get(ui.sel))) { // Activiteiten kiest nooit een verhaalitem (#435)
    const eigen = items.filter(isActiviteit);
    const cur = eigen.find((it) => it.status === 'nu') || eigen[0] || items[0];
    ui.sel = cur ? cur.key : null;
  }
  const list = panel.querySelector('[data-of="todo"][data-sub="alles"]');
  if (list) list.innerHTML = allHtml();
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
  const trein = t.closest('[data-todo-trein]');
  if (trein) {
    const it = byKey.get(trein.dataset.todoTrein);
    if (it && it.x != null) {
      api.showOnMap(it.x, it.y);
      world.addMessage(`Trein plannen: ${it.trein.tekst}`, 4);
    }
    return true;
  }
  const view = t.closest('[data-todo-view]');
  if (view) { api.showView(view.dataset.todoView); return true; }
  const kind = t.closest('[data-todo-kind]');
  if (kind) { ui.kind = kind.dataset.todoKind; bewaarFilter(); api.rerender(kind); return true; }
  // de Dichtbij-filter aan of uit (#607): dezelfde lijst, hetzelfde detail, geen eigen weergave
  const near = t.closest('[data-todo-near]');
  if (near) { ui.near = !ui.near; bewaarFilter(); api.rerender(near); return true; }
  const part = t.closest('[data-part-toggle]');
  if (part) { const p = part.dataset.partToggle; if (ui.open.has(p)) ui.open.delete(p); else ui.open.add(p); api.rerender(part); return true; }
  const more = t.closest('[data-part-more]');
  if (more) { ui.more.add(more.dataset.partMore); api.rerender(); return true; }
  const gmore = t.closest('[data-grp-more]');
  if (gmore) { ui.more.add('g:' + gmore.dataset.grpMore); api.rerender(); return true; }
  const c = t.closest('[data-todo]');
  if (c) {
    // Eén selectiemodel (#607): de rij opent het detail. Overzicht heeft geen detailpaneel,
    // dus daar opent dezelfde rij hetzelfde detail in Activiteiten, met de selectie bewaard.
    if (!panel.querySelector('.td-detail')) { ui.sel = c.dataset.todo; api.showView('dichtbij'); return true; }
    select(panel, world, c.dataset.todo);
    return true;
  }
  return false;
}
