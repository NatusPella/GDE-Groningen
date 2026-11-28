// Pauzemenu › Cheats: the cheats as rows in the menu's own style (switches,
// quiet buttons, ??? for the locked ones, folded away). The one in focus is
// explained beside the list. State and effects live in cheats.js.
import { icoon } from './icons.js';
import { keyTextHtml } from './keycap.js';
import { CHEATS } from './cheatlist.js';
import { ACHIEVEMENTS } from './achievements.js';
import { STEPS, STEP_ALIAS } from './storyarc.js';
import {
  isAvailable, isCheatOn, setCheat, achievementsBlocked, cheatsBusy, blockedReason,
  spawnChoices, spawnVehicleHere,
} from './cheats.js';
import { isFolded } from './todoui.js';
import { cheatsUit, CHEATS_UIT_TEKST } from './coopgroep.js';
import { impact, summaryLine, pressToggle, onSelect } from './cheatsuilogic.js';
import { escapeHtml as esc } from './htmlescape.js';

const KIND = { car: 'Auto', bike: 'Fiets', scooter: 'E-step', boat: 'Boot', heli: 'Heli' };

// De kop en de rijen van dit scherm. De module zet zijn eigen stijl neer, zodat Cheats
// dezelfde hero-taal spreekt als Prestaties en Loopbanen zonder in pausemenu.css te wonen.
const CSS = `
#pause-menu .ch-hero .pm-hero-t { font-size: 40px; }
#pause-menu .ch-trophy { display: inline-flex; align-items: center; gap: 8px; }
#pause-menu .ch-trophy svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .ch-note { margin: 0 24px 10px; max-width: 760px; }
#pause-menu .cheat-ic { display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none; }
#pause-menu .cheat-ic svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
#pause-menu .m-li[data-cheat-row] .nm .mut.one { font-size: max(15px, var(--menu-min)); }
`;
let cssAan = false;
function zetCss() {
  if (cssAan || typeof document === 'undefined') return;
  cssAan = true;
  const el = document.createElement('style');
  el.id = 'style-cheats';
  el.textContent = CSS;
  document.head.appendChild(el);
}
const LOCK = icoon('slot'); // F6: Phosphor via icons.js
const CHEV = icoon('volgende'); // F6: Phosphor via icons.js

let picker = false;
let msg = '';
let sel = null;
let lastW = null;
let st = { pending: null }; // cheat waiting for its confirming press (#161)
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.5 20h7"/></svg>';
const TROPHY_OFF = TROPHY.replace('</svg>', '<path d="M4 4l16 16"/></svg>');

function hintOf(c) {
  if (c.hint) return c.hint;
  const st = c.step && STEPS.find((x) => x.id === (STEP_ALIAS[c.step] || c.step));
  if (st) return `Speel het verhaal tot en met "${st.title}"`;
  if (c.ach) {
    const a = ACHIEVEMENTS.find((x) => x.id === c.ach);
    return a ? `Haal de prestatie "${a.title}"` : 'Haal een prestatie';
  }
  return '';
}

const noteOf = (c) => (c.safe || c.id === 'teleport' || c.id === 'voertuig' ? 'Prestaties blijven aan, ook tijdens missies.' : 'Niet tijdens missies en filmpjes. Prestaties staan uit zolang hij aan staat.');

function lockedRow(c) {
  return `<div class="m-li off" tabindex="0" data-cheat-row="${c.id}"><span class="nm"><span class="one">???</span><span class="mut one">${esc(hintOf(c))}</span></span>${LOCK}<span class="t">Op slot</span></div>`;
}

// #895: wat een cheat doet staat meteen in de rij, niet pas in het paneel als je hem kiest. De
// uitleg is één regel (de rest staat in het paneel) zodat de lijst scanbaar blijft.
const descOf = (c) => (c.desc ? `<span class="mut one">${esc(c.desc)}</span>` : '');

function actionRow(c, w) {
  const busy = blockedReason(w);
  let ctrl;
  if (c.id === 'teleport') ctrl = `<button type="button" class="m-bt" data-cheat-act="teleport"${busy ? ' disabled' : ''}>Kies op de kaart</button>`;
  else if (c.id === 'voertuig') ctrl = `<button type="button" class="m-bt" data-cheat-act="picker" aria-expanded="${picker}"${busy ? ' disabled' : ''}>${picker ? 'Lijst dicht' : 'Kies voertuig'}</button>`;
  else ctrl = '<span class="t g">Vrijgespeeld</span>';
  let row = `<div class="m-li" data-cheat-row="${c.id}"><span class="nm"><span class="one">${esc(c.name)}</span>${busy && (c.id === 'teleport' || c.id === 'voertuig') ? `<span class="mut one">${esc(busy)}</span>` : descOf(c)}</span>${ctrl}</div>`;
  if (c.id === 'voertuig' && picker && !busy) {
    row += '<div class="st-pick">' + spawnChoices(w).map((v) => `<button type="button" class="m-chip" data-cheat-spawn="${esc(v.id)}">${esc(v.label)} <span>${KIND[v.kind] || ''}${v.own ? '' : ' · showroom'}</span></button>`).join('') + '</div>';
  }
  return row;
}

function toggleRow(c) {
  const on = isCheatOn(c.id), hinder = impact(c) === 'hindert', ask = st.pending === c.id;
  const icon = hinder ? `<span class="cheat-ic red" title="Zet prestaties uit">${TROPHY_OFF}</span>` : `<span class="cheat-ic g" title="Veilig voor prestaties">${TROPHY}</span>`;
  const label = on ? 'Zet uit' : ask ? 'Zeker? Bevestig' : 'Zet aan';
  // #895: de uitleg staat er meteen bij; de trophy vertelt of prestaties meetellen, en bij een
  // cheat die ze uitzet staat dat er ook in woorden bij (kleur is nooit de enige aanwijzing).
  return `<div class="m-li${on ? ' on' : ''}" data-cheat-row="${c.id}">${icon}<span class="nm"><span class="one">${esc(c.name)}${hinder ? '<span class="mut"> · prestaties uit</span>' : ''}</span>${descOf(c)}</span><span class="t ${on ? 'g' : 'mut'}">${on ? 'Aan' : 'Uit'}</span><button type="button" class="m-bt" data-cheat-toggle="${c.id}">${label}</button></div>`;
}

// #895: de regel over prestaties staat één keer boven de lijst (en in het paneel), zodat je
// hem leest voordat je iets aanzet in plaats van erna.
function introOf(w) {
  const blocked = achievementsBlocked();
  if (cheatsUit(w)) return CHEATS_UIT_TEKST;
  if (blocked) return 'Prestaties staan uit zolang er een cheat aan staat (de uiterlijk-cheats en teleporteren tellen niet mee).';
  return 'Teleporteren, Voertuig hier en de uiterlijk-cheats laten je prestaties aan. Zet je een andere cheat aan, dan staan prestaties uit tot je hem weer uitzet.';
}

function paneHtml(w) {
  const c = CHEATS.find((x) => x.id === sel);
  const busy = cheatsBusy(w);
  // De prestatiesregel staat boven de lijst; het paneel herhaalt hem niet nog eens.
  // #1268: the hero already says Cheats and Een beetje vals spelen; the empty pane only says what to do
  if (!c) return `<div class="pm-pane-top"><span class="m-eb">Uitleg</span><h2 class="m-h2 td-h2">Kies een cheat</h2></div><p class="mut">Kies links een cheat om te zien wat hij doet en of hij je prestaties raakt.</p>`;
  const open = isAvailable(c.id);
  return `<div class="pm-pane-top"><span class="m-eb">${c.kind === 'action' || c.kind === 'perk' ? 'Actie' : c.safe ? 'Cheat · uiterlijk' : 'Cheat'}</span><h2 class="m-h2 td-h2">${open ? esc(c.name) : '???'}</h2></div>` +
    `<p>${open ? esc(c.desc) : esc(hintOf(c))}</p>` +
    (open ? `<p class="${impact(c) === 'veilig' ? 'g' : 'red'}">${impact(c) === 'veilig' ? 'Veilig voor prestaties. ' : 'Hindert prestaties. '}${noteOf(c)}</p>` : '') +
    (open && st.pending === c.id ? `<p class="red">Weet je het zeker? Prestaties gaan uit zolang hij aan staat. ${keyTextHtml('Druk nog eens {ENTER} (of {A}) om hem aan te zetten; een andere rij annuleert.')}</p>` : open && (!c.kind || c.kind === 'toggle') ? `<p class="mut">Bladeren verandert niets. ${keyTextHtml('Zet aan of uit met {ENTER} (of {A}) op de knop.')}</p>` : '') +
    '<span class="m-grow"></span>' +
    (busy ? '<p class="mut">Je bent nu bezig (missie, filmpje of uitdaging): alleen de uiterlijk-cheats doen nu mee.</p>' : '') +
    `<p class="g st-msg" role="status">${esc(msg)}</p>`;
}

// Fills the section; returns the sheet subtitle.
export function renderCheatsPanel(el, w) {
  lastW = w;
  zetCss();
  const actions = CHEATS.filter((c) => c.kind === 'action' || c.kind === 'perk');
  const toggles = CHEATS.filter((c) => !c.kind || c.kind === 'toggle');
  const open = toggles.filter((c) => isAvailable(c.id));
  const shut = [...actions, ...toggles].filter((c) => !isAvailable(c.id));
  const lit = toggles.filter((c) => isCheatOn(c.id)).length;
  const lockedOpen = isFolded('locked');
  if (sel && !CHEATS.some((c) => c.id === sel)) sel = null;
  const sum = summaryLine(CHEATS, isCheatOn);
  // De uitleg over prestaties stond boven de lijst én in het paneel én onderin het paneel:
  // drie keer hetzelfde. Nu één hero bovenaan met de stand, en het paneel zegt het alleen
  // nog bij de cheat die je bekijkt.
  const n = CHEATS.filter((c) => isAvailable(c.id)).length;
  const hero = `<section class="pm-hero ch-hero" aria-label="Cheats">` +
    `<div class="pm-hero-h"><span class="m-eb">Cheats</span><span class="pm-badge" data-tone="${sum.tone === 'red' ? 'warn' : 'ok'}">${n} van ${CHEATS.length} vrijgespeeld</span></div>` +
    `<h2 class="pm-hero-t">Een beetje vals spelen</h2>` +
    `<p class="pm-hero-lead">${esc(sum.text)}</p></section>`;
  // #1268: no tiles (vrijgespeeld, nu aan, op slot): the badge, the group head and the fold already say those numbers,
  // and a group without rows gets no head
  const acts = actions.filter((c) => isAvailable(c.id));
  el.innerHTML = hero + '<div class="ch-note">' + `<p class="m-note cheat-rule">${esc(introOf(w))}</p></div>` +
    '<div class="m-main"><div class="m-list pm-slist">' +
    (acts.length ? '<div class="m-gh"><span>Acties</span></div>' + acts.map((c) => actionRow(c, w)).join('') : '') +
    (open.length ? `<div class="m-gh"><span>Aan of uit</span><span>${lit ? `${lit} aan` : ''}</span></div>` + open.map(toggleRow).join('') : '') +
    (shut.length ? `<div class="m-rule"></div><button type="button" class="m-disc" data-fold="locked" aria-expanded="${lockedOpen}" aria-controls="pm-f-locked">${CHEV}<b>Nog ${shut.length} op slot</b><span class="mut one">Speel verder in het verhaal of haal prestaties</span></button>` +
      `<div class="m-fold" id="pm-f-locked" data-fold-body="locked"${lockedOpen ? '' : ' hidden'}>${shut.map(lockedRow).join('')}</div>` : '') +
    `</div><aside class="m-pane cheat-pane" aria-live="polite">${paneHtml(w)}</aside></div>`;
  return `${n} van ${CHEATS.length} vrijgespeeld${lit ? ` · ${lit} aan` : ''}`;
}

// Focus on a row shows what it does.
export function cheatsFocus(panel, el) {
  const r = el && el.closest && el.closest('[data-cheat-row]');
  if (!r || !panel.contains(r) || r.dataset.cheatRow === sel) return;
  sel = r.dataset.cheatRow;
  st = onSelect(st, sel);
  const pane = panel.querySelector('.cheat-pane');
  if (pane && lastW) pane.innerHTML = paneHtml(lastW);
}

// api: { teleport(), close(), rerender(focus) }. True when handled.
export function cheatsClick(e, w, api) {
  const act = e.target.closest('[data-cheat-act]');
  if (act) {
    const a = act.dataset.cheatAct;
    if (a === 'teleport') { msg = ''; picker = false; api.teleport(); return true; }
    if (a === 'picker') { picker = !picker; msg = ''; api.rerender('[data-cheat-act="picker"]'); return true; }
  }
  const tg = e.target.closest('[data-cheat-toggle]');
  if (tg) {
    const c = CHEATS.find((x) => x.id === tg.dataset.cheatToggle);
    const r = pressToggle(st, c, isCheatOn(c.id));
    st = { pending: r.pending };
    const geweigerd = r.do === 'apply' && !setCheat(c.id, r.value) && r.value && cheatsUit(w);
    msg = geweigerd ? CHEATS_UIT_TEKST : ''; // met meer spelers geen cheats (#452)
    api.rerender(`[data-cheat-toggle="${c.id}"]`);
    return true;
  }
  const sp = e.target.closest('[data-cheat-spawn]');
  if (sp) {
    const res = spawnVehicleHere(sp.dataset.cheatSpawn, w);
    if (res.ok) { picker = false; msg = ''; w.addMessage(res.text, 3, { kind: 'tip' }); api.close(); return true; }
    msg = res.text;
    api.rerender(`[data-cheat-spawn="${sp.dataset.cheatSpawn}"]`);
    return true;
  }
  return false;
}

export function resetCheatsPanel() {
  picker = false;
  msg = '';
  sel = null;
  st = { pending: null };
}
