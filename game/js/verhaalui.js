// The pause menu's Verhaal section: Personages (everyone you have spoken
// to, from characters.js, with a turning model in the viewer; the others are
// one quiet line with a silhouette). The Aanwijzingen tab is gone (21-11: hints and
// clues added nothing; the story is told in scenes). pausemenu.js owns the shell, keys and focus. The portraits and the
// viewer draw through vehiclepreview.js's shared renderer, like the garage.
import { icoon } from './icons.js';
import { CHARACTERS, CHARACTER_BY_ID, hasMet, isFresh, metCount, knownCharacters, unknownLine, markCharacterSeen } from './characters.js';
import { createSharedPreview, renderSnapshot, PORTRAIT_ANGLE } from './vehiclepreview.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { NPC } from './missionstory.js';
import { getStorySteps, replayOpening } from './story.js';
import { speakerColor } from './speakers.js';
import { cardFacts } from './characterdossiers.js';
import { partNumber } from './storyarc.js';
import { dossierHtml as dossierMarkup, unknownHtml, otherHtml, otherCardHtml, actGroups } from './personagedossier.js';
import { dutchFor } from './subtitles.js';
import { fillBars, pop } from './motion.js';
import { renderCharacterPhone, phoneUnreadFor, unreadInbox, OVERIG } from './phone.js';
import { keepFocus } from './focusbehoud.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PIC = 120;
const bars = new Map();
let selected = 'tammo';
let worldRef = null;
// Esc op een bericht (pausemenu.js): het personage waar het bij hoort staat open
export function selectVerhaalCharacter(id) { selected = id; }
let viewer = null;

// De opmaak van Personages. Kleuren gaan via de tokens van .gm en de
// statusrollen via --mk-* (#479, #608); de chroom-achtergrond #17301f -> #0c140e staat
// als achtergrondbasis in DESIGN_SYSTEM.md. Geen eigen rood of amber meer, zodat de
// kleurenblindmodi meedoen; het woord (" · verloren", " · geblokkeerd") is de tweede cue.
const CSS = `
#pause-menu .pm-vsub { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
#pause-menu .vh-layout { display: flex; flex: 1; min-height: 0; }
#pause-menu .vh-left { flex: 1 1 46%; min-width: 0; display: flex; flex-direction: column; padding-right: 48px; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--ds-scroll-duim) var(--ds-scroll-spoor); }
#pause-menu .vh-left .m-gh { padding-left: 0; padding-top: 0; }
/* Het losse BERICHTEN-blok bovenaan is weg: dezelfde regels stonden al bij het personage
   zelf, waardoor je ze twee keer las. De ongelezen-teller staat nu in de hero. */
#pause-menu .vh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
#pause-menu .vh-card { --spk: var(--g); position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px 12px; border-radius: 8px; text-align: center; transition: background 0.2s, box-shadow 0.2s; }
#pause-menu .vh-card:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
#pause-menu .vh-card.sel { background: color-mix(in srgb, var(--g) 12%, transparent); box-shadow: inset 0 -3px 0 var(--g); }
#pause-menu .vh-card:focus-visible { outline-offset: -2px; }
#pause-menu .vh-card[data-new]::after { content: 'Nieuw'; position: absolute; top: 8px; right: 8px; font-size: 18px; color: var(--g); }
#pause-menu .vh-pic { position: relative; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; overflow: hidden; border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); box-shadow: var(--ds-schaduw-hard-klein); background: var(--ds-zeef-bg); }
#pause-menu .vh-pic img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity var(--ds-m-lang); }
#pause-menu .vh-pic img.on { opacity: 1; }
#pause-menu .vh-pic b { font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 34px; color: var(--ds-zeef-tx); }
#pause-menu .vh-opening { margin-top: 8px; align-self: flex-start; }
#pause-menu .vh-unknown { display: flex; align-items: center; gap: 10px; margin: 12px 0 0; padding: 0 2px; font-size: 18px; color: var(--mut); }
#pause-menu .vh-unknown svg { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; opacity: 0.8; }
#pause-menu .vh-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; max-width: 100%; }
#pause-menu .vh-name b { font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 24px; letter-spacing: 0.05em; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pause-menu .vh-name small { font-size: 18px; line-height: 1.2; color: var(--mut); }
#pause-menu .vh-viewer { flex: 1 1 54%; min-width: 0; }
#pause-menu .vh-stage { position: relative; flex: none; height: 280px; max-width: 460px; overflow: hidden; background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); box-shadow: var(--ds-schaduw-hard-klein); }
#pause-menu .vh-stage canvas { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
#pause-menu .vh-stage canvas:active { cursor: grabbing; }
#pause-menu .vh-stage[data-locked] canvas { filter: brightness(0); opacity: 0.8; cursor: default; }
#pause-menu .vh-stage .vh-mono { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--ds-font-zeef-kop); font-size: 120px; color: var(--ds-zeef-tx); opacity: 0.7; }
#pause-menu .vh-stage .vh-hint { position: absolute; left: 0; bottom: 0; font-size: 18px; color: var(--mut); pointer-events: none; }
/* 22-11 (personages-ui): het dossier rechts heeft een vaste kop (portret, naam, rol, status), korte feiten met een icoon, "Samen in" als chips per akte en
   de rest achter "Meer". Alles in .vh-viewer is flex:none: de oude kaart kromp tot een lege balk met een los groen vlak omdat een kolom van .m-pane zijn kinderen mocht indrukken. */
#pause-menu .vh-viewer > *, #pause-menu .vh-dossier > * { flex: none; }
#pause-menu .vh-viewer { gap: var(--ds-s-3); }
#pause-menu .vh-dossier { display: flex; flex-direction: column; gap: var(--ds-s-3); min-width: 0; }
#pause-menu .vh-kop { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: var(--ds-s-4); align-items: center; padding: var(--ds-s-3); border-left-color: var(--spk); }
#pause-menu .vh-kop .vh-stage { width: 112px; height: 140px; max-width: none; border-radius: var(--ds-r); background: var(--ds-zeef-kop); box-shadow: none; }
#pause-menu .vh-kop .vh-stage .vh-hint { display: none; }
#pause-menu .vh-kop .vh-stage .vh-mono { font-size: 64px; }
#pause-menu .vh-kop .vh-stage-icoon { display: grid; place-items: center; background: var(--ds-c-sel-vlak); }
#pause-menu .vh-kop .vh-kop-ic { width: 56px; height: 56px; fill: currentColor; color: var(--ds-c-ink-inkt); }
#pause-menu .vh-pic-icoon { background: var(--ds-c-sel-vlak); }
#pause-menu .vh-pic-icoon .vh-kop-ic { width: 40px; height: 40px; fill: currentColor; color: var(--ds-c-ink-inkt); }
#pause-menu .vh-kop-tekst { display: flex; flex-direction: column; gap: var(--ds-s-2); min-width: 0; }
#pause-menu .vh-kop-tekst h3 { margin: 0; font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: var(--ds-t-kop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-kop); text-transform: uppercase; overflow-wrap: anywhere; }
#pause-menu .vh-rol { margin: 0; font-size: var(--ds-t-body); line-height: 1.3; color: var(--ds-c-inkt-zacht); }
#pause-menu .vh-status { display: flex; flex-wrap: wrap; gap: var(--ds-s-2); }
#pause-menu .vh-bio { margin: 0; font-size: 20px; line-height: 1.45; }
#pause-menu .vh-quote { margin: 0; padding-left: 16px; border-left: 3px solid var(--spk); font-style: italic; font-size: 20px; line-height: 1.35; }
#pause-menu .vh-quote small { display: block; margin-top: 3px; font-style: normal; font-size: 18px; color: var(--mut); }
#pause-menu .vh-feiten { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--ds-s-2); margin: 0; padding: 0; list-style: none; }
#pause-menu .vh-feit { display: grid; grid-template-columns: 24px auto minmax(0, 1fr); align-items: center; gap: var(--ds-s-2); padding: var(--ds-s-2) var(--ds-s-3); border: 2px solid color-mix(in srgb, var(--ink) 22%, transparent); border-radius: var(--ds-r); font-size: 18px; line-height: 1.25; }
#pause-menu .vh-feit-ic { width: 20px; height: 20px; fill: currentColor; color: var(--g); }
#pause-menu .vh-feit-k { color: var(--mut); }
#pause-menu .vh-feit-t { min-width: 0; overflow-wrap: anywhere; }
#pause-menu .vh-feit-duo, #pause-menu .vh-feiten-lang .vh-feit { grid-column: 1 / -1; }
#pause-menu .vh-feiten-lang { grid-template-columns: minmax(0, 1fr); }
#pause-menu .vh-kopje { margin: 0 0 var(--ds-s-2); font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 20px; letter-spacing: var(--ds-ls-label); text-transform: uppercase; color: var(--g); }
#pause-menu .vh-akte { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: var(--ds-s-2) var(--ds-s-3); align-items: start; padding: var(--ds-s-1) 0; }
#pause-menu .vh-akte-n { padding-top: 6px; font-family: var(--ds-font-zeef-kop); font-size: 18px; letter-spacing: var(--ds-ls-label); text-transform: uppercase; color: var(--mut); }
#pause-menu .vh-miss { display: flex; flex-wrap: wrap; gap: var(--ds-s-2); margin: 0; padding: 0; list-style: none; }
#pause-menu .vh-stap { max-width: 100%; }
#pause-menu .vh-stap-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#pause-menu .vh-stap-nu { margin-left: 4px; font-family: var(--ds-font-zeef-kop); font-size: 16px; letter-spacing: var(--ds-ls-label); text-transform: uppercase; }
#pause-menu .vh-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
#pause-menu .vh-meerblok { display: flex; flex-direction: column; gap: var(--ds-s-3); align-items: flex-start; }
#pause-menu .vh-meer { display: flex; flex-direction: column; gap: var(--ds-s-3); animation: m-up var(--ds-m-kort, 200ms) ease-out both; }
#pause-menu .vh-meer[hidden] { display: none; }
#pause-menu .vh-klets[hidden] { display: none; }
#pause-menu .vh-klets { padding: var(--ds-s-3) var(--ds-s-4); }
#pause-menu .vh-klets .pt-titel { margin: 0 0 var(--ds-s-2); font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 22px; letter-spacing: var(--ds-ls-label); text-transform: uppercase; }
#pause-menu .vh-name-lang b { white-space: normal; font-size: 20px; line-height: 1.1; }
/* DS3-scrollbalk: smal en zeefdruk. scrollbar-width en scrollbar-color staan hier op auto: in Chromium (Electron) schakelt elke andere waarde de ::-webkit-scrollbar-opmaak uit en tekent de browser zijn eigen balk met eindknoppen. */
#pause-menu .vh-viewer, #pause-menu .vh-left { scrollbar-width: auto; scrollbar-color: auto; }
#pause-menu .vh-viewer::-webkit-scrollbar, #pause-menu .vh-left::-webkit-scrollbar { width: var(--ds-scroll-breed); }
#pause-menu .vh-viewer::-webkit-scrollbar-thumb, #pause-menu .vh-left::-webkit-scrollbar-thumb { background: var(--ds-scroll-duim); border: 2px solid var(--ds-scroll-spoor); border-radius: var(--ds-scroll-rond); }
#pause-menu .vh-viewer::-webkit-scrollbar-track, #pause-menu .vh-left::-webkit-scrollbar-track { background: var(--ds-scroll-spoor); }
#pause-menu .vh-viewer::-webkit-scrollbar-button, #pause-menu .vh-left::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
/* #904: de kop van Personages is één rustige strook met de stand erin; de
   geschiedenis krijgt daardoor een begin in plaats van een lijst die maar loopt. */
#pause-menu .vh-hero { display: flex; flex-direction: column; gap: 6px; margin: 0 0 14px; padding: 14px 18px; background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); box-shadow: var(--ds-schaduw-hard); }
#pause-menu .vh-hero-top { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 16px; }
#pause-menu .vh-hero-t { font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 34px; line-height: 1; letter-spacing: 0.03em; }
#pause-menu .vh-hero .m-bar { width: 100%; max-width: 420px; height: 6px; }
#pause-menu .vh-hero p { margin: 0; font-size: 18px; line-height: 1.4; color: var(--mut); }
#pause-menu .vh-hero-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 16px; color: var(--mut); }
#pause-menu .vh-party { display: flex; align-items: center; gap: 10px; font-size: 18px; }
#pause-menu .vh-party b { font-family: var(--ds-font-zeef-kop); font-weight: normal; font-size: 26px; line-height: 1; letter-spacing: 0.02em; color: var(--ink); }
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

// De berichten leven bij het personage zelf (de gesprekskolom onder de kaart). Een tweede
// lijst bovenaan met dezelfde regels las dubbel en duwde de personages naar beneden, dus die
// is weg; wat overblijft is de ongelezen-teller in de hero en het stippje op de tegel.

// Alleen personages die je al kent krijgen een tegel (#608): geen grid van vraagtekens.
// Wie je nog niet ontmoette staat als één rustige regel onder het grid.
function charCard(c) {
  const look = lookOf(c);
  return `<button type="button" class="vh-card${c.id === selected ? ' sel' : ''}" data-char="${c.id}" style="--spk:${speakerColor(c.speakers[0])}"${isFresh(c.id) || (worldRef && phoneUnreadFor(worldRef, c.id)) ? ' data-new' : ''}>` +
    `<span class="vh-pic"${look ? ` data-pic="${c.id}"` : ''}>${look ? '' : `<b>${initial(c.name)}</b>`}</span>` +
    `<span class="vh-name"><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span></button>`;
}

// Het dossier: de feiten die deze speler nu mag zien (leeftijd, woonplaats, werk, wat ze voor het duo zijn; characterdossiers.js: elk feit heeft een
// "bekend vanaf", dus de kaart verklapt niets), en de missies per akte (alleen je eigen lokale voortgang). De opmaak zelf is puur: personagedossier.js.
let meerOpen = false; // de uitklapper "Meer" staat per personage dicht tot je hem opent
function viewerHtml(c) {
  const met = hasMet(c.id);
  const look = lookOf(c);
  const stageInner = (look ? '<canvas aria-hidden="true"></canvas>' : `<span class="vh-mono">${met ? initial(c.name) : '?'}</span>`) +
    (look && met ? '<span class="vh-hint">Sleep om te draaien</span>' : '');
  const spk = speakerColor(c.speakers[0]);
  // Eén mededeling, niet drie keer hetzelfde (#608): het luik zegt alleen nog dat je deze persoon later ontmoet.
  if (!met) return unknownHtml(stageInner, spk);
  const steps = getStorySteps();
  const done = new Set(steps.filter((x) => x.done).map((x) => x.id));
  return dossierMarkup(c, {
    feiten: cardFacts(c.id, { met, done }), groups: actGroups(steps, c.missions, partNumber), stage: stageInner, spk,
    nieuw: isFresh(c.id), quoteNl: dutchFor(c.quote) || '', meerOpen,
  });
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

// Na het lezen van een bericht telt de rail meteen mee: de hero-teller en de badge worden
// opnieuw gezet zodra een personage opengaat (de berichten zelf staan bij het personage).
function refreshInbox(panel, id) {
  document.dispatchEvent(new Event('nieuwgezien'));
}

function selectCharacter(panel, id) {
  const c = CHARACTER_BY_ID.get(id);
  const box = panel.querySelector('.vh-viewer');
  if (!box || (!c && id !== OVERIG)) return;
  if (selected !== id) meerOpen = false;
  selected = id;
  for (const b of panel.querySelectorAll('[data-char]')) { b.classList.toggle('sel', b.dataset.char === id); if (b.dataset.char === id) { b.removeAttribute('data-msg'); if (markCharacterSeen(id)) { b.removeAttribute('data-new'); document.dispatchEvent(new Event('nieuwgezien')); } } }
  disposeVerhaalViewer();
  if (id === OVERIG) {
    box.innerHTML = otherHtml();
    renderCharacterPhone(box.querySelector('[data-vh-phone]'), worldRef, OVERIG);
    verbergLegeKlets(box);
    refreshInbox(panel, id);
    return;
  }
  box.innerHTML = viewerHtml(c);
  const met = hasMet(id);
  if (met) { renderCharacterPhone(box.querySelector('[data-vh-phone]'), worldRef, id); verbergLegeKlets(box); refreshInbox(panel, id); }
  const canvas = box.querySelector('canvas');
  if (!canvas) return;
  viewer = createSharedPreview(canvas, { interactive: met, active: () => canvas.isConnected && canvas.offsetParent !== null, angle: PORTRAIT_ANGLE });
  viewer.show({ kind: 'person', look: lookOf(c) });
}

// De kaart "Kletsmaar" is er alleen als er iets in staat: een knop om te praten of een bericht. Een kaart met alleen een kop was een lege doos.
function verbergLegeKlets(box) {
  const kl = box.querySelector('.vh-klets');
  if (kl) kl.hidden = !kl.querySelector('.pt-acts, .pt-draad');
}

export function disposeVerhaalViewer() {
  if (viewer) { viewer.dispose(); viewer = null; }
}

function overigCard() {
  const n = worldRef ? phoneUnreadFor(worldRef, OVERIG) : 0;
  return otherCardHtml({ selected: selected === OVERIG, nieuw: !!n, id: OVERIG });
}

// Een silhouet voor de regel met de mensen die je nog kunt tegenkomen (#608).
const SIL = icoon('speler'); // F6: Phosphor via icons.js

function peopleHtml() {
  const n = metCount();
  const unknown = CHARACTERS.length - n;
  const pct = CHARACTERS.length ? Math.round((n / CHARACTERS.length) * 100) : 0;
  const ongelezen = worldRef ? unreadInbox(worldRef).length : 0;
  return `<div class="vh-layout"><div class="vh-left"><section class="vh-hero" aria-label="Personages"><div class="vh-hero-top"><span class="m-eb">Personages</span><span class="vh-party"><b>${n}</b> van ${CHARACTERS.length} ontmoet${ongelezen ? ` · <b>${ongelezen}</b> ongelezen` : ''}</span></div>` +
    `<span class="m-bar on" aria-hidden="true"><i data-bar="people" data-w="${pct}"></i></span>` +
    '<p>Wie je spreekt, komt erbij. De rest van Grunn leer je onderweg kennen.</p>' +
    '<button type="button" class="ds-z-knop ds-z-knop--secundair vh-opening" data-replay-opening>Opening opnieuw bekijken</button></section>' +
    `<div class="vh-grid">${knownCharacters().map(charCard).join('')}${overigCard()}</div>` +
    (unknown > 0 ? `<p class="vh-unknown">${SIL}<span>${esc(unknownLine(unknown))}</span></p>` : '') +
    '</div><aside class="vh-viewer m-pane" aria-live="polite" aria-label="Personage"></aside></div>';
}

// The sheet subtitle.
export function verhaalSummary() {
  return `${metCount()} van ${CHARACTERS.length} personages ontmoet`;
}

export function renderVerhaal(panel, view, w = null) {
  if (w) worldRef = w;
  ensureStyle();
  const el = panel.querySelector(`[data-of="verhaal"][data-sub="${view}"]`);
  if (!el) return;
  const restore = keepFocus(el);
  disposeVerhaalViewer();
  for (const sub of panel.querySelectorAll('[data-of="verhaal"][data-sub]')) if (sub !== el && !sub.hasAttribute('data-keep')) sub.innerHTML = '';
  el.innerHTML = peopleHtml();
  fillBars(el, bars);
  loadPics(el);
  if (!CHARACTER_BY_ID.has(selected) && selected !== OVERIG) selected = 'tammo';
  selectCharacter(el, selected);
  for (const n of el.querySelectorAll('.vh-card[data-new]')) pop(n); // elk personage blijft nieuw tot je hem opent (#435)
  restore();
}

// Ververst alleen het telefoonblok, de ongelezen-teller en de tegelstippen zonder de 3D-viewer of focus te slopen.
export function refreshVerhaalPhone(panel, w = null) {
  if (w) worldRef = w;
  const el = panel && panel.querySelector(`[data-of="verhaal"][data-sub="personages"]`);
  if (!el) return;
  const phoneBox = el.querySelector('[data-vh-phone]');
  const restore = keepFocus(phoneBox || el);
  if (phoneBox && (selected === OVERIG || hasMet(selected))) {
    renderCharacterPhone(phoneBox, worldRef, selected);
    verbergLegeKlets(el);
  }
  for (const b of el.querySelectorAll('.vh-card[data-char]')) {
    const id = b.dataset.char;
    const nieuw = id === OVERIG
      ? !!(worldRef && phoneUnreadFor(worldRef, OVERIG))
      : isFresh(id) || !!(worldRef && phoneUnreadFor(worldRef, id));
    if (nieuw) b.setAttribute('data-new', '');
    else b.removeAttribute('data-new');
  }
  const party = el.querySelector('.vh-party');
  if (party) {
    const ongelezen = worldRef ? unreadInbox(worldRef).length : 0;
    party.innerHTML = `<b>${metCount()}</b> van ${CHARACTERS.length} ontmoet${ongelezen ? ` · <b>${ongelezen}</b> ongelezen` : ''}`;
  }
  restore();
}

// Clicks inside the section; true when handled.
export function verhaalClick(e, panel, hooks = {}) {
  // de opening opnieuw bekijken (#986): het menu gaat dicht, de film speelt over het nieuwe thuis en geeft de speler zijn plek terug
  if (e.target.closest('[data-replay-opening]') && panel.contains(e.target)) {
    const reden = replayOpening(hooks.close); // het menu sluit alleen als de opening echt kan starten
    if (reden && worldRef) worldRef.addMessage(reden, 4);
    return true;
  }
  // "Meer" in het dossier: de rest van de tekst klapt open of dicht
  const meer = e.target.closest('[data-vh-meer]');
  if (meer && panel.contains(meer)) {
    meerOpen = meer.getAttribute('aria-expanded') !== 'true';
    meer.setAttribute('aria-expanded', String(meerOpen));
    const lab = meer.querySelector('.ds-z-knop__label');
    if (lab) lab.textContent = meerOpen ? 'Minder' : 'Meer';
    const blok = meer.parentElement && meer.parentElement.querySelector('.vh-meer');
    if (blok) blok.hidden = !meerOpen;
    return true;
  }
  const card = e.target.closest('[data-char]');
  if (!card || !panel.contains(card)) return false;
  selectCharacter(panel, card.dataset.char);
  return true;
}
