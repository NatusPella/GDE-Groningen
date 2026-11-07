// The pause menu's Verhaal section: Personages (everyone you have spoken
// to, from characters.js, with a turning model in the viewer; the others are
// one quiet line with a silhouette) and Aanwijzingen (the clues per story
// part). pausemenu.js owns the shell, keys and focus. The portraits and the
// viewer draw through vehiclepreview.js's shared renderer, like the garage.
import { CHARACTERS, CHARACTER_BY_ID, hasMet, isFresh, metCount, knownCharacters, unknownLine, markCharacterSeen } from './characters.js';
import { createSharedPreview, renderSnapshot, PORTRAIT_ANGLE } from './vehiclepreview.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { NPC } from './missionstory.js';
import { getStorySteps, getStoryJournal } from './story.js';
import { PARTS, CLUES, WHY } from './storyarc.js';
import { speakerColor } from './speakers.js';
import { dutchFor } from './subtitles.js';
import { fillBars, pop } from './motion.js';
import { renderCharacterPhone, phoneUnreadFor, unreadInbox, OVERIG } from './phone.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PIC = 120;
const bars = new Map();
let selected = 'tammo';
let worldRef = null;
// Esc op een bericht (pausemenu.js): het personage waar het bij hoort staat open
export function selectVerhaalCharacter(id) { selected = id; }
let viewer = null;

// De opmaak van Personages en Aanwijzingen. Kleuren gaan via de tokens van .gm en de
// statusrollen via --mk-* (#479, #608); de chroom-achtergrond #17301f -> #0c140e staat
// als achtergrondbasis in DESIGN_SYSTEM.md. Geen eigen rood of amber meer, zodat de
// kleurenblindmodi meedoen; het woord (" · verloren", " · geblokkeerd") is de tweede cue.
const CSS = `
#pause-menu .pm-vsub { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
#pause-menu .vh-layout { display: flex; flex: 1; min-height: 0; }
#pause-menu .vh-left { flex: 1 1 46%; min-width: 0; display: flex; flex-direction: column; padding-right: 48px; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(240,237,228,0.18) transparent; }
#pause-menu .vh-left .m-gh { padding-left: 0; padding-top: 0; }
#pause-menu .vh-inbox { flex: none; margin-bottom: 18px; }
#pause-menu .vh-inbox .m-gh { padding-top: 0; }
#pause-menu .vh-inbox-list { display: flex; flex-direction: column; gap: 2px; }
#pause-menu .vh-inbox-item { width: 100%; text-align: left; }
#pause-menu .vh-inbox-item .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
#pause-menu .vh-inbox-item .one { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#pause-menu .vh-inbox-item .t { flex: none; font-size: 18px; color: var(--mut); }
#pause-menu .vh-inbox-more { font-size: 18px; padding: 4px 24px 0; }
#pause-menu .vh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
#pause-menu .vh-card { --spk: var(--g); position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px 12px; border-radius: 8px; text-align: center; transition: background 0.2s, box-shadow 0.2s; }
#pause-menu .vh-card:hover { background: rgba(240,237,228,0.04); }
#pause-menu .vh-card.sel { background: rgba(63,201,122,0.12); box-shadow: inset 0 -3px 0 var(--g); }
#pause-menu .vh-card:focus-visible { outline-offset: -2px; }
#pause-menu .vh-card[data-new]::after { content: 'Nieuw'; position: absolute; top: 8px; right: 8px; font-size: 18px; color: var(--g); }
#pause-menu .vh-pic { position: relative; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; overflow: hidden; border: 2px solid var(--spk); background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--spk) 40%, #17301f), #0c140e); }
#pause-menu .vh-pic img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.3s; }
#pause-menu .vh-pic img.on { opacity: 1; }
#pause-menu .vh-pic b { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 34px; color: var(--spk); }
#pause-menu .vh-unknown { display: flex; align-items: center; gap: 10px; margin: 12px 0 0; padding: 0 2px; font-size: 18px; color: var(--mut); }
#pause-menu .vh-unknown svg { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.8; }
#pause-menu .vh-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; max-width: 100%; }
#pause-menu .vh-name b { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 24px; letter-spacing: 0.05em; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pause-menu .vh-name small { font-size: 18px; line-height: 1.2; color: var(--mut); }
#pause-menu .vh-viewer { flex: 1 1 54%; min-width: 0; }
#pause-menu .vh-stage { position: relative; flex: none; height: 280px; max-width: 460px; border-radius: 12px; overflow: hidden; background: radial-gradient(ellipse at 50% 80%, rgba(240,237,228,0.07), rgba(240,237,228,0) 60%); }
#pause-menu .vh-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
#pause-menu .vh-stage canvas:active { cursor: grabbing; }
#pause-menu .vh-stage[data-locked] canvas { filter: brightness(0); opacity: 0.8; cursor: default; }
#pause-menu .vh-stage .vh-mono { position: absolute; inset: 0; display: grid; place-items: center; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 120px; color: var(--spk); opacity: 0.7; }
#pause-menu .vh-stage .vh-hint { position: absolute; left: 0; bottom: 0; font-size: 18px; color: var(--mut); pointer-events: none; }
#pause-menu .vh-quote { padding-left: 16px; border-left: 3px solid var(--spk); font-style: italic; font-size: 20px; line-height: 1.35; }
#pause-menu .vh-quote small { display: block; margin-top: 3px; font-style: normal; font-size: 18px; color: var(--mut); }
#pause-menu .vh-bio { font-size: 20px; line-height: 1.45; }
#pause-menu .vh-facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 20px; font-size: 20px; }
#pause-menu .vh-facts dt { color: var(--mut); }
#pause-menu .vh-miss { display: flex; flex-wrap: wrap; gap: 8px; }
#pause-menu .vh-miss span { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 20px; letter-spacing: 0.05em; color: var(--mut); }
#pause-menu .vh-miss span[data-st="klaar"] { color: var(--g); }
#pause-menu .vh-miss span[data-st="nu"] { color: var(--ink); text-decoration: underline; text-decoration-color: var(--g); text-underline-offset: 4px; }
#pause-menu .vh-parts { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(240,237,228,0.18) transparent; max-width: 1000px; }
#pause-menu .vh-part { display: flex; flex-direction: column; padding-bottom: 8px; }
#pause-menu .vh-part .m-gh { padding-left: 0; }
#pause-menu .vh-part[data-cur] .m-gh span:first-child { color: var(--ink); }
#pause-menu .vh-pbar { max-width: 360px; margin-bottom: 16px; }
#pause-menu .vh-why { font-size: 20px; line-height: 1.4; margin-bottom: 12px; max-width: 800px; }
#pause-menu .vh-why b { font-weight: normal; color: var(--ink); }
#pause-menu .vh-clues { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 4px 48px; max-width: 1000px; }
#pause-menu .vh-clue { display: flex; flex-direction: column; gap: 2px; padding: 10px 0; box-shadow: inset 0 -1px 0 var(--line); }
#pause-menu .vh-clue b { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 24px; letter-spacing: 0.05em; line-height: 1.1; }
#pause-menu .vh-clue b em { font-style: normal; color: var(--g); margin-right: 4px; }
#pause-menu .vh-clue p { font-size: 18px; line-height: 1.35; color: var(--mut); }
#pause-menu .vh-clue[data-unknown] b { color: var(--mut); }
#pause-menu .vh-clue.vh-rest { grid-column: 1 / -1; }
#pause-menu .vh-gk { grid-column: 1 / -1; display: flex; gap: 10px; align-items: baseline; margin-top: 14px; font-size: 18px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mut); }
#pause-menu .vh-gk em { font-style: normal; color: var(--g); letter-spacing: 0; text-transform: none; }
#pause-menu .vh-plakje[data-state="gered"] b::after { content: ' · gered'; color: var(--g); }
#pause-menu .vh-plakje[data-state="verloren"] b::after { content: ' · verloren'; color: var(--mk-danger, #d93f3f); }
#pause-menu .vh-plakje[data-state="geblokkeerd"] b::after { content: ' · geblokkeerd'; color: var(--mk-mission, #e8c93a); }
#pause-menu .vh-plakje[data-state="open"] b::after { content: ' · nog open'; color: var(--mut); }
#pause-menu .vh-clue[data-new] b::after { content: ' nieuw'; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 18px; letter-spacing: 0; color: var(--g); }
`;

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}

// The look buildPersonMesh takes for a character, or null (no model).
function lookOf(c) {
  if (!c.model) return null;
  if (c.model === 'tammo') return { ...TAMMO_APPEARANCE };
  if (c.model === 'anita') return { ...ANITA_APPEARANCE };
  return NPC[c.model] ? { ...NPC[c.model] } : null;
}

const initial = (name) => esc(String(name).replace(/^(Oma|Ome|Dokter|Kapitein|Schipper|Boer|Duivenmelker|Bommen) /, '')[0] || '?');
const initials = (name) => esc(String(name).replace(/\(.*\)/, '').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase());

// #603: één zichtbare plek met alle ongelezen berichten bovenaan Verhaal > Personages. Een klik
// opent het personage (of Overig) waar het bericht bij hoort; daar staan alle regels van oud naar
// nieuw. Zo hoeft een gemist bericht niet per personage gezocht te worden.
function inboxHtml() {
  const items = worldRef ? unreadInbox(worldRef) : [];
  const shown = items.slice(0, 6);
  return '<div class="vh-inbox" aria-label="Berichten">' +
    `<div class="m-gh"><span>Berichten</span><span>${items.length ? `${items.length} ongelezen · nieuwste eerst` : 'niets ongelezen'}</span></div>` +
    (shown.length ? '<div class="vh-inbox-list">' + shown.map((m) =>
      `<button type="button" class="m-li vh-inbox-item" data-char="${esc(m.id)}">` +
      `<span class="av">${initials(m.from)}</span>` +
      `<span class="nm"><span class="one">${esc(m.from)}</span><span class="mut one">${esc(m.body)}</span></span>` +
      `<span class="t">${esc(m.at)}</span></button>`).join('') + '</div>' : '') +
    (items.length > shown.length ? `<p class="vh-inbox-more">en ${items.length - shown.length} meer bij de personages</p>` : '') +
    '</div>';
}

// Alleen personages die je al kent krijgen een tegel (#608): geen grid van vraagtekens.
// Wie je nog niet ontmoette staat als één rustige regel onder het grid.
function charCard(c) {
  const look = lookOf(c);
  return `<button type="button" class="vh-card${c.id === selected ? ' sel' : ''}" data-char="${c.id}" style="--spk:${speakerColor(c.speakers[0])}"${isFresh(c.id) || (worldRef && phoneUnreadFor(worldRef, c.id)) ? ' data-new' : ''}>` +
    `<span class="vh-pic"${look ? ` data-pic="${c.id}"` : ''}>${look ? '' : `<b>${initial(c.name)}</b>`}</span>` +
    `<span class="vh-name"><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span></button>`;
}

function missionChips(c) {
  const steps = new Map(getStorySteps().map((s) => [s.id, s]));
  const list = c.missions.map((id) => steps.get(id)).filter(Boolean);
  if (!list.length) return '';
  return '<div class="vh-miss">' + list.map((s) => {
    const st = s.done ? 'klaar' : s.current ? 'nu' : 'later';
    return `<span data-st="${st}" title="${esc(s.title)}">${esc(s.id)}${st === 'klaar' ? ' ✓' : ''}</span>`;
  }).join('') + '</div>';
}

function viewerHtml(c) {
  const met = hasMet(c.id);
  const look = lookOf(c);
  const stage = `<div class="vh-stage"${met ? '' : ' data-locked'} style="--spk:${speakerColor(c.speakers[0])}">` +
    (look ? '<canvas aria-hidden="true"></canvas>' : `<span class="vh-mono">${met ? initial(c.name) : '?'}</span>`) +
    (look && met ? '<span class="vh-hint">Sleep om te draaien</span>' : '') + '</div>';
  if (!met) {
    // Eén mededeling, niet drie keer hetzelfde (#608): het luik zegt alleen nog dat je
    // deze persoon later ontmoet.
    return stage + '<p class="vh-bio">Deze persoon ontmoet je nog in het verhaal.</p>';
  }
  const steps = missionChips(c);
  return stage +
    `<div><span class="vh-kicker">${esc(c.role)}</span><h3>${esc(c.name)}</h3></div>` +
    `<p class="vh-quote" style="--spk:${speakerColor(c.speakers[0])}">“${esc(c.quote)}”${dutchFor(c.quote) ? `<small>${esc(dutchFor(c.quote))}</small>` : ''}</p>` +
    `<p class="vh-bio">${esc(c.bio)}</p>` +
    `<dl class="vh-facts"><dt>${c.always ? 'In het duo' : 'Voor het duo'}</dt><dd>${esc(c.relation)}</dd>${steps ? `<dt>Samen</dt><dd>${steps}</dd>` : ''}</dl>` +
    '<div class="vh-phone" data-vh-phone></div>';
}

function loadPics(el) {
  for (const p of el.querySelectorAll('[data-pic]')) {
    const look = lookOf(CHARACTER_BY_ID.get(p.dataset.pic));
    renderSnapshot({ kind: 'person', look, frame: 'head' }, PIC, PIC, (url) => {
      if (!url || !p.isConnected || p.querySelector('img')) return;
      const img = new Image();
      img.alt = '';
      img.src = url;
      p.appendChild(img);
      requestAnimationFrame(() => img.classList.add('on'));
    }, { angle: PORTRAIT_ANGLE });
  }
}

// #603: na het lezen van een bericht verdwijnt het uit de inbox (en telt de rail meteen mee).
function refreshInbox(panel, id) {
  const box = panel && panel.querySelector('.vh-inbox');
  if (!box) return;
  let gone = false;
  for (const b of box.querySelectorAll('.vh-inbox-item')) if (b.dataset.char === id) { b.remove(); gone = true; }
  if (!gone) return;
  const items = worldRef ? unreadInbox(worldRef) : [];
  const info = box.querySelector('.m-gh span:last-child');
  if (info) info.textContent = items.length ? `${items.length} ongelezen · nieuwste eerst` : 'niets ongelezen';
  const more = box.querySelector('.vh-inbox-more');
  if (more) more.remove();
  if (!items.length) { const list = box.querySelector('.vh-inbox-list'); if (list) list.remove(); }
  document.dispatchEvent(new Event('nieuwgezien'));
}

function selectCharacter(panel, id) {
  const c = CHARACTER_BY_ID.get(id);
  const box = panel.querySelector('.vh-viewer');
  if (!box || (!c && id !== OVERIG)) return;
  selected = id;
  for (const b of panel.querySelectorAll('[data-char]')) { b.classList.toggle('sel', b.dataset.char === id); if (b.dataset.char === id) { b.removeAttribute('data-msg'); if (markCharacterSeen(id)) { b.removeAttribute('data-new'); document.dispatchEvent(new Event('nieuwgezien')); } } }
  disposeVerhaalViewer();
  if (id === OVERIG) {
    box.innerHTML = '<div><span class="vh-kicker">Berichten en contacten</span><h3>Overig</h3></div><p class="vh-bio">Nieuws, meldingen en contacten die geen personage zijn.</p><div class="vh-phone" data-vh-phone></div>';
    renderCharacterPhone(box.querySelector('[data-vh-phone]'), worldRef, OVERIG);
    refreshInbox(panel, id);
    return;
  }
  box.innerHTML = viewerHtml(c);
  const met = hasMet(id);
  if (met) { renderCharacterPhone(box.querySelector('[data-vh-phone]'), worldRef, id); refreshInbox(panel, id); }
  const canvas = box.querySelector('canvas');
  if (!canvas) return;
  viewer = createSharedPreview(canvas, { interactive: met, active: () => canvas.isConnected && canvas.offsetParent !== null, angle: PORTRAIT_ANGLE });
  viewer.show({ kind: 'person', look: lookOf(c) });
}

export function disposeVerhaalViewer() {
  if (viewer) { viewer.dispose(); viewer = null; }
}

function overigCard() {
  const n = worldRef ? phoneUnreadFor(worldRef, OVERIG) : 0;
  return `<button type="button" class="vh-card${selected === OVERIG ? ' sel' : ''}" data-char="${OVERIG}"${n ? ' data-new' : ''}><span class="vh-pic"><b>…</b></span><span class="vh-name"><b>Overig</b><small>Nieuws en meldingen</small></span></button>`;
}

// Een silhouet voor de regel met de mensen die je nog kunt tegenkomen (#608).
const SIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c1.2-4 3.8-6 7-6s5.8 2 7 6"/></svg>';

function peopleHtml() {
  const n = metCount();
  const unknown = CHARACTERS.length - n;
  return `<div class="vh-layout"><div class="vh-left">${inboxHtml()}<div class="m-gh"><span>Personages</span><span>${n} van ${CHARACTERS.length} ontmoet · wie je spreekt, komt erbij</span></div><div class="vh-grid">${knownCharacters().map(charCard).join('')}${overigCard()}</div>` +
    (unknown > 0 ? `<p class="vh-unknown">${SIL}<span>${esc(unknownLine(unknown))}</span></p>` : '') +
    '</div><aside class="vh-viewer m-pane" aria-live="polite" aria-label="Personage"></aside></div>';
}

// The plakjesbord of the new story: Jelle buys Grunn up slice by slice; each slice shows how it ended.
function plakjesHtml(list) {
  if (!list || !list.length) return '';
  const count = (s) => list.filter((p) => p.state === s).length;
  const tally = [['gered', 'gered'], ['verloren', 'verloren'], ['geblokkeerd', 'geblokkeerd']].map(([s, w]) => (count(s) ? `${count(s)} ${w}` : '')).filter(Boolean).join(' · ');
  return `<section class="vh-part"><div class="m-gh"><span>De plakjes van Jelle</span><span>${esc(tally || 'allemaal nog open')}</span></div>` +
    '<div class="vh-clues">' + list.map((p) => `<div class="vh-clue vh-plakje" data-state="${p.state}"><b>${p.n} · ${esc(p.name)}</b><p>${esc(p.text)}</p></div>`).join('') + '</div></section>';
}

// De volgorde van de delen bij Aanwijzingen: het deel waar je nu in zit, dan de delen met gevonden aanwijzingen (het nieuwste deel eerst), dan de rest.
function partOrder(steps, found, cur) {
  const score = (part) => {
    if (cur && cur.part === part) return 0;
    const mine = steps.filter((s) => s.part === part);
    return CLUES.some((c) => mine.some((s) => s.id === c.step) && found.has(c.title)) ? 1 : 2;
  };
  return Object.keys(PARTS).reverse().map((part, i) => ({ part, i, sc: score(part) })).sort((a, b) => a.sc - b.sc || a.i - b.i).map((x) => x.part);
}

function cluesHtml() {
  const steps = getStorySteps();
  const jr = getStoryJournal();
  const found = new Map(jr.found.map((c) => [c.title, c]));
  const cur = steps.find((s) => s.current);
  return '<div class="vh-parts">' + plakjesHtml(jr.plakjes) + partOrder(steps, found, cur).map((part) => { // waar je bent en wat je vond bovenaan (#435)
    const list = steps.filter((s) => s.part === part);
    const clues = CLUES.filter((c) => list.some((s) => s.id === c.step));
    if (!clues.length) return '';
    const known = clues.filter((c) => found.has(c.title));
    const open = list.some((s) => s.available);
    const here = cur && cur.part === part;
    if (!open && !known.length) return '';
    return `<section class="vh-part"${here ? ' data-cur' : ''}><div class="m-gh"><span>${esc(PARTS[part].title)}</span><span>${known.length} van ${clues.length}</span></div>` +
      `<span class="m-bar vh-pbar"><i data-bar="clue-${part}" data-w="${Math.round((known.length / clues.length) * 100)}"></i></span>` +
      (here && WHY[part] ? `<p class="vh-why"><b>Waar het om draait:</b> ${esc(WHY[part])}</p>` : '') +
      // per opdracht gegroepeerd, de nieuwste opdracht eerst (#435)
      '<div class="vh-clues">' + [...list].reverse().map((st) => {
        const mine = clues.filter((c) => c.step === st.id && found.has(c.title));
        if (!mine.length) return '';
        return `<div class="vh-gk"><span>${esc(st.title)}</span>${mine.some((c) => found.get(c.title).isNew) ? '<em>nieuw</em>' : ''}</div>` + mine.map((c) => {
          const f = found.get(c.title);
          return `<div class="vh-clue"${f.isNew ? ' data-new' : ''}><b>${c.kind === 'hart' ? '<em>&#9829;</em>' : ''}${esc(c.title)}</b><p>${esc(c.text)}</p></div>`;
        }).join('');
      }).join('') +
      // de nog niet gevonden aanwijzingen als één rustige regel, geen muur van vraagtekens (#92)
      (known.length < clues.length ? `<div class="vh-clue vh-rest" data-unknown><b>${clues.length - known.length} nog te ontdekken</b></div>` : '') + '</div></section>';
  }).join('') + '</div>';
}

// The sheet subtitle.
export function verhaalSummary() {
  const jr = getStoryJournal();
  return `${metCount()} van ${CHARACTERS.length} personages ontmoet · ${jr.found.length} van ${jr.total} aanwijzingen`;
}

export function renderVerhaal(panel, view, w = null) {
  if (w) worldRef = w;
  ensureStyle();
  const el = panel.querySelector(`[data-of="verhaal"][data-sub="${view}"]`);
  if (!el) return;
  disposeVerhaalViewer();
  for (const sub of panel.querySelectorAll('[data-of="verhaal"][data-sub]')) if (sub !== el && !sub.hasAttribute('data-keep')) sub.innerHTML = '';
  if (view === 'aanwijzingen') {
    el.innerHTML = cluesHtml();
    fillBars(el, bars);
    for (const n of el.querySelectorAll('.vh-clue[data-new]')) pop(n);
    return;
  }
  el.innerHTML = peopleHtml();
  loadPics(el);
  if (!CHARACTER_BY_ID.has(selected) && selected !== OVERIG) selected = 'tammo';
  selectCharacter(el, selected);
  for (const n of el.querySelectorAll('.vh-card[data-new]')) pop(n); // elk personage blijft nieuw tot je hem opent (#435)
}

// Clicks inside the section; true when handled.
export function verhaalClick(e, panel) {
  const card = e.target.closest('[data-char]');
  if (!card || !panel.contains(card)) return false;
  selectCharacter(panel, card.dataset.char);
  return true;
}
