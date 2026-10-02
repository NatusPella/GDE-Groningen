// The pause menu's Verhaal section: Personages (everyone you have spoken
// to, from characters.js, with a turning model in the viewer; the rest a
// silhouette and "???") and Aanwijzingen (the clues per story part).
// pausemenu.js owns the shell, keys and focus. The portraits and the viewer
// draw through vehiclepreview.js's shared renderer, like the garage.
import { CHARACTERS, CHARACTER_BY_ID, hasMet, isFresh, metCount, markCharactersSeen } from './characters.js';
import { createSharedPreview, renderSnapshot, PORTRAIT_ANGLE } from './vehiclepreview.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { NPC } from './missionstory.js';
import { getStorySteps, getStoryJournal } from './story.js';
import { PARTS, CLUES, WHY } from './storyarc.js';
import { speakerColor } from './speakers.js';
import { dutchFor } from './subtitles.js';
import { fillBars, pop } from './motion.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PIC = 120;
const bars = new Map();
let selected = 'tammo';
let viewer = null;

const CSS = `
#pause-menu .pm-verhaal { width: min(1240px, calc(100% / var(--ui, 1))); }
#pause-menu .vh-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start; }
#pause-menu .vh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
#pause-menu .vh-card { --spk: #3fc97a; position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 8px 10px; border-radius: 10px; cursor: pointer; font: inherit; color: var(--pm-ink); text-align: center;
  background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08);
  transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-fast) var(--ease-out); }
#pause-menu .vh-card:hover { border-color: rgba(63,201,122,0.4); transform: translateY(-1px); }
#pause-menu .vh-card.sel { background: rgba(30,158,86,0.14); border-color: rgba(63,201,122,0.55); }
#pause-menu .vh-card[data-new]::after { content: 'Nieuw'; position: absolute; top: 8px; right: 8px; padding: 1px 7px 0; border-radius: 9px; background: #1e9e56; color: #f6fff8; font-size: 13px; letter-spacing: 1px; }
#pause-menu .vh-pic { position: relative; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; overflow: hidden; box-sizing: border-box;
  border: 2px solid var(--spk); background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--spk) 40%, #17301f), #0c140e); }
#pause-menu .vh-pic img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity var(--dur-slow) var(--ease-out); }
#pause-menu .vh-pic img.on { opacity: 1; }
#pause-menu .vh-pic b { font-weight: normal; font-size: 34px; color: var(--spk); }
#pause-menu .vh-card[data-locked] { --spk: #6f7f73; }
#pause-menu .vh-card[data-locked] .vh-pic { border-style: dashed; }
#pause-menu .vh-card[data-locked] .vh-pic img { filter: brightness(0); }
#pause-menu .vh-card[data-locked] .vh-pic img.on { opacity: 0.75; }
#pause-menu .vh-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; max-width: 100%; }
#pause-menu .vh-name b { font-weight: normal; font-size: 20px; letter-spacing: 1px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pause-menu .vh-name small { font: 12px/1.25 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .vh-viewer { position: sticky; top: 0; display: flex; flex-direction: column; gap: 12px; min-height: 520px; box-sizing: border-box; padding: 16px; border-radius: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(63,201,122,0.16); }
#pause-menu .vh-viewer > :not(.vh-stage) { animation: pm-rise var(--dur-base) var(--ease-out); }
#pause-menu .vh-stage { position: relative; flex: none; height: 260px; border-radius: 10px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 75%, #24492f 0%, #10211a 70%); border: 1px solid rgba(63,201,122,0.16); }
#pause-menu .vh-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
#pause-menu .vh-stage canvas:active { cursor: grabbing; }
#pause-menu .vh-stage[data-locked] canvas { filter: brightness(0); opacity: 0.8; cursor: default; }
#pause-menu .vh-stage .vh-mono { position: absolute; inset: 0; display: grid; place-items: center; font-size: 96px; color: var(--spk); opacity: 0.7; }
#pause-menu .vh-stage .vh-hint { position: absolute; right: 8px; bottom: 6px; font: 11px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; pointer-events: none; }
#pause-menu .vh-kicker { font: 13px 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; text-transform: uppercase; color: #3fc97a; }
#pause-menu .vh-viewer h3 { margin: 0; font-weight: normal; font-size: 34px; letter-spacing: 1.5px; line-height: 1; }
#pause-menu .vh-quote { margin: 0; padding-left: 12px; border-left: 3px solid var(--spk); font: italic 17px/1.35 'Arial Narrow', Arial, sans-serif; }
#pause-menu .vh-quote small { display: block; margin-top: 3px; font: normal 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .vh-bio { margin: 0; font: 15px/1.45 'Arial Narrow', Arial, sans-serif; }
#pause-menu .vh-facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 14px; margin: 0; font: 15px 'Arial Narrow', Arial, sans-serif; }
#pause-menu .vh-facts dt { color: #a3b2a6; }
#pause-menu .vh-facts dd { margin: 0; }
#pause-menu .vh-miss { display: flex; flex-wrap: wrap; gap: 6px; }
#pause-menu .vh-miss span { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 12px; font: 15px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px;
  color: #a3b2a6; border: 1.5px solid rgba(240,237,228,0.25); }
#pause-menu .vh-miss span[data-st="klaar"] { color: #3fc97a; border-color: rgba(63,201,122,0.5); }
#pause-menu .vh-miss span[data-st="nu"] { color: #f6fff8; background: #1e9e56; border-color: #3fc97a; }
#pause-menu .vh-note { margin: 0; font: 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
#pause-menu .vh-parts { display: flex; flex-direction: column; gap: 14px; max-width: 920px; }
#pause-menu .vh-part { padding: 14px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(63,201,122,0.16); }
#pause-menu .vh-part[data-cur] { border-color: rgba(63,201,122,0.45); }
#pause-menu .vh-part header { display: grid; grid-template-columns: minmax(0, 1fr) 160px auto; align-items: center; gap: 12px; }
#pause-menu .vh-part header b { font-weight: normal; font-size: 24px; letter-spacing: 1.5px; color: #3fc97a; }
#pause-menu .vh-part header small { font: 13px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; white-space: nowrap; }
#pause-menu .vh-bar { display: block; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; }
#pause-menu .vh-bar i { display: block; width: 0; height: 100%; border-radius: 3px; background: #3fc97a; transition: width var(--dur-bar) var(--ease-out); }
#pause-menu .vh-why { margin: 8px 0 0; font: 15px/1.4 'Arial Narrow', Arial, sans-serif; }
#pause-menu .vh-why b { color: #3fc97a; font-weight: normal; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; }
#pause-menu .vh-clues { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin-top: 10px; }
#pause-menu .vh-clue { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); }
#pause-menu .vh-clue b { font-weight: normal; font-size: 19px; letter-spacing: 1px; line-height: 1.05; }
#pause-menu .vh-clue b em { font-style: normal; color: #3fc97a; margin-right: 4px; }
#pause-menu .vh-clue p { margin: 0; font: 14px/1.35 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
#pause-menu .vh-clue[data-unknown] { border-style: dashed; }
#pause-menu .vh-clue[data-unknown] b { color: #6f7f73; }
#pause-menu .vh-clue[data-new] { border-color: rgba(63,201,122,0.55); }
@media (max-width: 980px) { #pause-menu .vh-layout { grid-template-columns: 1fr; } #pause-menu .vh-viewer { position: static; order: -1; min-height: 0; } }
#pause-menu .pm-sheet[data-narrow] .vh-layout { grid-template-columns: 1fr; }
#pause-menu .pm-sheet[data-narrow] .vh-viewer { position: static; order: -1; min-height: 0; }
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

function charCard(c) {
  const met = hasMet(c.id);
  const look = lookOf(c);
  return `<button type="button" class="vh-card${c.id === selected ? ' sel' : ''}" data-char="${c.id}" style="--spk:${speakerColor(c.speakers[0])}"${met ? '' : ' data-locked'}${isFresh(c.id) ? ' data-new' : ''}>` +
    `<span class="vh-pic"${look ? ` data-pic="${c.id}"` : ''}>${look ? '' : `<b>${met ? initial(c.name) : '?'}</b>`}</span>` +
    `<span class="vh-name"><b>${met ? esc(c.name) : '???'}</b><small>${met ? esc(c.role) : 'Nog niet ontmoet'}</small></span></button>`;
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
    return stage + '<div><span class="vh-kicker">Nog niet ontmoet</span><h3>???</h3></div>' +
      '<p class="vh-bio">Wie dit is, hoor je vanzelf. Speel verder in het verhaal of praat eens met iemand in Grunn.</p>';
  }
  const steps = missionChips(c);
  return stage +
    `<div><span class="vh-kicker">${esc(c.role)}</span><h3>${esc(c.name)}</h3></div>` +
    `<p class="vh-quote" style="--spk:${speakerColor(c.speakers[0])}">“${esc(c.quote)}”${dutchFor(c.quote) ? `<small>${esc(dutchFor(c.quote))}</small>` : ''}</p>` +
    `<p class="vh-bio">${esc(c.bio)}</p>` +
    `<dl class="vh-facts"><dt>${c.always ? 'In het duo' : 'Voor het duo'}</dt><dd>${esc(c.relation)}</dd>${steps ? `<dt>Samen</dt><dd>${steps}</dd>` : ''}</dl>`;
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

export function selectCharacter(panel, id) {
  const c = CHARACTER_BY_ID.get(id);
  const box = panel.querySelector('.vh-viewer');
  if (!c || !box) return;
  selected = id;
  for (const b of panel.querySelectorAll('[data-char]')) b.classList.toggle('sel', b.dataset.char === id);
  disposeVerhaalViewer();
  box.innerHTML = viewerHtml(c);
  const canvas = box.querySelector('canvas');
  if (!canvas) return;
  const met = hasMet(id);
  viewer = createSharedPreview(canvas, { interactive: met, active: () => canvas.isConnected && canvas.offsetParent !== null, angle: PORTRAIT_ANGLE });
  viewer.show({ kind: 'person', look: lookOf(c) });
}

export function disposeVerhaalViewer() {
  if (viewer) { viewer.dispose(); viewer = null; }
}

function peopleHtml() {
  const n = metCount();
  return `<h2>Personages <small>${n} van ${CHARACTERS.length} ontmoet · wie je spreekt, komt erbij</small></h2>` +
    `<div class="vh-layout"><div class="vh-grid">${CHARACTERS.map(charCard).join('')}</div><aside class="vh-viewer" aria-live="polite" aria-label="Personage"></aside></div>`;
}

function cluesHtml() {
  const steps = getStorySteps();
  const jr = getStoryJournal();
  const found = new Map(jr.found.map((c) => [c.title, c]));
  const cur = steps.find((s) => s.current);
  return '<h2>Aanwijzingen <small>wat Tammo en Anita weten, per deel</small></h2><div class="vh-parts">' + Object.keys(PARTS).map((part) => {
    const list = steps.filter((s) => s.part === part);
    const clues = CLUES.filter((c) => list.some((s) => s.id === c.step));
    if (!clues.length) return '';
    const known = clues.filter((c) => found.has(c.title));
    const open = list.some((s) => s.available);
    const here = cur && cur.part === part;
    if (!open && !known.length) return '';
    return `<section class="vh-part"${here ? ' data-cur' : ''}><header><b>${esc(PARTS[part].title)}</b>` +
      `<span class="vh-bar"><i data-bar="clue-${part}" data-w="${Math.round((known.length / clues.length) * 100)}"></i></span><small>${known.length} van ${clues.length}</small></header>` +
      (here && WHY[part] ? `<p class="vh-why"><b>Waar het om draait:</b> ${esc(WHY[part])}</p>` : '') +
      '<div class="vh-clues">' + clues.map((c) => {
        const f = found.get(c.title);
        if (!f) return `<div class="vh-clue" data-unknown><b>???</b><p>Nog te ontdekken.</p></div>`;
        return `<div class="vh-clue"${f.isNew ? ' data-new' : ''}><b>${c.kind === 'hart' ? '<em>&#9829;</em>' : ''}${esc(c.title)}</b><p>${esc(c.text)}</p></div>`;
      }).join('') + '</div></section>';
  }).join('') + '</div>';
}

// The sheet subtitle.
export function verhaalSummary() {
  const jr = getStoryJournal();
  return `${metCount()} van ${CHARACTERS.length} personages ontmoet · ${jr.found.length} van ${jr.total} aanwijzingen`;
}

export function renderVerhaal(panel, view) {
  ensureStyle();
  const el = panel.querySelector(`[data-of="verhaal"][data-sub="${view}"]`);
  if (!el) return;
  disposeVerhaalViewer();
  for (const sub of panel.querySelectorAll('[data-of="verhaal"][data-sub]')) if (sub !== el) sub.innerHTML = '';
  if (view === 'aanwijzingen') {
    el.innerHTML = cluesHtml();
    fillBars(el, bars);
    for (const n of el.querySelectorAll('.vh-clue[data-new]')) pop(n);
    return;
  }
  el.innerHTML = peopleHtml();
  loadPics(el);
  if (!CHARACTER_BY_ID.has(selected)) selected = 'tammo';
  selectCharacter(el, selected);
  for (const n of el.querySelectorAll('.vh-card[data-new]')) pop(n);
  markCharactersSeen();
}

// Clicks inside the section; true when handled.
export function verhaalClick(e, panel) {
  const card = e.target.closest('[data-char]');
  if (!card || !panel.contains(card)) return false;
  selectCharacter(panel, card.dataset.char);
  return true;
}
