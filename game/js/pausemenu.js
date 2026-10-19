// The pause menu: one overlay over the game (the city keeps rendering behind
// it). A fixed rail on the left (Doorgaan, the sections, Opslaan/Laden,
// Hoofdmenu) never changes shape; the sheet beside it shows one section.
// Esc opens on Overzicht; from another section Esc/Backspace go back to it,
// then close. Sections: Overzicht, Te doen (todoui.js), Verhaal
// (verhaalui.js), Kaart, Garage, Prestaties, Cheats (cheatsui.js),
// Instellingen, Besturing.
import { getSettings, setSetting, resetSettings, QUALITY_PRESETS } from './settings.js';
import { logoHtml } from './logo.js';
import { setPauseMenuOpen } from './pausestate.js';
import { PRESET_ORDER, presetLabel, describePreset, describeChanges, currentPreset, applyPreset, getBenchResult, dismissBenchBanner, GEAR_SVG } from './gfxprofile.js';
import { mountMapView, setMapActive, setMapCloseHandler, setMapView, getDiscoveredRatio, setMapTeleport } from './mapview.js';
import { renderSamenPanel } from './samenpanel.js';
import { renderCheatsPanel, cheatsClick, resetCheatsPanel, cheatsFocus } from './cheatsui.js';
import { skipCurrent, getStoryJournal, markCluesSeen } from './story.js';
import { saveGame, hasSave, loadLatestSave, startNewSlot, getSaveSummary } from './savegame.js';
import { openSaveSlots, isSaveSlotsOpen } from './saveslotsui.js';
import { getClockText } from './hud_panel.js';
import { VERSION } from './version.js';
import { versionLabel } from './menumodels.js';
import { storyDate } from './calendarday.js';
import { isCinematicActive } from './cinematics.js';
import { renderAchievementsPanel } from './achievementsui.js';
import { unseenAchievementCount } from './achievements.js';
import { renderGaragePanel, selectGarageVehicle, disposeGarageViewer } from './garageui.js';
import { deliverOwnedVehicle, locateOwnedVehicle } from './ownedvehicles.js';
import { isShopOpen, closeShopMenu } from './shopui.js';
import { benchmarkViaReload } from './trailerstate.js';
import { radioIsOn, setRadio } from './radio.js';
import { glyphHtml } from './prompts.js';
import { KEY_ACTIONS, KEY_GROUPS, PAD_REMAPPABLE, PAD_SLOT_NAMES, bindKey, bindButton, physicalKey, defaultKey, physicalButton, isBindableKey, keyName, slotUses } from './controls.js';
import { capturePadButton, isPadActive, onPadChange } from './gamepad.js';
import { padGlyphInner } from './glyphs.js';
import { openPadTest } from './padtest.js';
import { isHelpOfferOpen } from './assistlive.js';
import { getUiScale } from './uiscale.js';
import { helpHtml } from './helpoverview.js';
import { DEV, FLAGS } from './devflags.js';
import { renderOverview, renderTodo, todoClick, todoFocus, todoEnter, todoSummary, selectTodo, foldNote } from './todoui.js';
import { isPlayAheadOpen } from './todo.js';
import { renderVerhaal, verhaalClick, verhaalSummary, disposeVerhaalViewer } from './verhaalui.js';
import { anyFresh } from './characters.js';
import { renderSpullen, spullenClick, spullenFocus } from './spullen.js';
import { renderPhonePanel, phoneClick, phoneUnread, selectPhoneThread, PHONE_NAME } from './phone.js';
import { getErrorLog, errorReport, clearErrorLog, onErrorLogChange } from './errorlog.js';
import { KEYS } from './storagekeys.js';
import { renderFotoPanel, fotoClick } from './fotomodusui.js';
// Running inside the desktop app (desktop/preload.js): window mode + quit.
const DESKTOP = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

// Besturing: [alternatives, description]; an alternative is one token or a
// combo joined with '+' (tokens as glyphHtml in prompts.js takes them).
const CONTROL_GROUPS = [
  ['lopen', 'Lopen', [
    [['WASD'], 'Lopen en draaien'],
    [['MOUSE'], 'Camera draaien; laag houden om omhoog te kijken'],
    [['SHIFT'], 'Rennen (vasthouden)'],
    [['SPACE'], 'Springen, over hekjes en auto\'s'],
    [['CTRL'], 'Bukken'],
    [['E', 'F'], 'Instappen, winkel in, praten, bijbaantje beginnen'],
    [['E'], 'Bij een duivenbord: word een duif'],
    [['K'], 'Kusje geven aan Tammo of Tessa'],
  ]],
  ['rijden', 'Rijden', [
    [['WASD'], 'Gas, remmen en achteruit, sturen'],
    [['SPACE'], 'Handrem'],
    [['.', ','], 'Handmatig schakelen: hoger, lager (Instellingen › Schakelen)'],
    [['J'], 'Handmatig met koppeling: koppeling indrukken bij het schakelen'],
    [['SHIFT'], 'Op de fiets: even flink doortrappen; op een motor: wheelie met gas, stoppie met remmen'],
    [['CTRL'], 'Op de fiets: wheelie (vasthouden en trappen)'],
    [['E', 'F'], 'Uitstappen'],
    [['Q', 'WHEEL'], 'Achterom kijken (vasthouden; middelste muisknop)'],
    [['H'], 'Toeteren'],
    [['L'], 'Zwaailicht en sirene (politieauto, ambulance)'],
    [['[', ']'], 'Richtingaanwijzer links en rechts (nog eens: uit; na de bocht gaat hij vanzelf uit)'],
    [['P'], 'Alarmlichten'],
    [['V'], 'Filmcamera'],
    [['R'], 'Nieuwe lak bij Spuit & Klaar, garagemenu in een garage'],
  ]],
  ['vechten', 'Vechten', [
    [['LMB'], 'Aanvallen, schieten, gooien'],
    [['RMB'], 'Richten; jachtgeweer: door de kijker'],
    [['TAB'], 'Tijdens het richten: volgend doelwit (of muis snel opzij)'],
    [['1'], 'Slaan: vuisten, knuppel, hockeystick, bezem, fietspomp, klomp, polsstok (nog eens: wisselen)'],
    [['2'], 'Pistool, uzi, waterpistool'],
    [['3'], 'Hagelgeweer, jachtgeweer'],
    [['4'], 'Carbidbus, vuurwerkpijlen'],
    [['CTRL+LMB'], 'Carbidbus neerzetten'],
    [['WHEEL'], 'Volgend of vorig wapen (scrollen)'],
  ]],
  ['heli', 'Helikopter', [
    [['W', 'S'], 'Vooruit en achteruit; S remt eerst af tot je stil in de lucht hangt'],
    [['A', 'D'], 'Draaien (de muis draait ook)'],
    [['SHIFT'], 'Sneller: vol gas vooruit'],
    [['SPACE'], 'Omhoog, opstijgen'],
    [['CTRL'], 'Omlaag; landen: laag en langzaam boven een vlak stuk'],
    [['ARROWS'], 'Ook vliegen: pijltjes links en rechts gaan opzij'],
    [['E'], 'Uitstappen (alleen geland); op je helidek: parkeren en naar binnen'],
  ]],
  ['duif', 'Duif', [
    [['WASD'], 'Lopen, in de lucht: sturen'],
    [['SPACE'], 'Opstijgen, klapwieken'],
    [['SHIFT'], 'Duiken'],
    [['F', 'LMB'], 'Poepen'],
    [['E', 'CTRL'], 'Pikken, opeten, landen'],
    [['C'], 'Koeren'],
    [['Q'], 'Zwerm roepen of wegsturen'],
    [['X'], 'Weer mens worden'],
  ]],
  ['menu', 'Telefoon & menu', [
    [['ESC'], 'Pauzemenu openen; in het menu: terug'],
    [['M'], 'Kaart'],
    [['ARROWS'], 'In het menu: kiezen, Enter: ok'],
    [['Q', 'E'], 'In het menu: vorige of volgende sectie'],
    [['[', ']'], 'In het menu: vorig of volgend tabblad'],
    [['U'], 'Geluid aan/uit'],
    [['O'], 'Verhaalstap overslaan (als dat in beeld staat)'],
    ...(DESKTOP ? [[['F11'], 'Volledig scherm (ook Alt+Enter)']] : []),
  ]],
];

const GROUP_ICONS = {
  lopen: '<circle cx="13" cy="4.5" r="2"/><path d="M11 21l2-6-3-3 1-5 4 3 3 1M10 12l-3 2M13 15l3 6"/>',
  rijden: '<path d="M4 16l1.5-5A2 2 0 0 1 7.4 9.6h9.2a2 2 0 0 1 1.9 1.4L20 16v3h-3M7 19H4v-3h16"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  vechten: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  heli: '<path d="M3 5h16M11 5v3"/><path d="M5 13a5 4 0 0 1 10 0v2H5zM15 12h6M20 9v5M6 20h9M8 17v3M13 17v3"/>',
  duif: '<path d="M3 13c3 0 5-2 7-5 1 3 3 4 6 4l5-3-2 5c-2 4-6 6-10 5l-4 2 1-4c-2-1-3-2-3-4z"/><circle cx="16.5" cy="10.5" r="0.4"/>',
  menu: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/>',
};
// the controller table (controls.js PAD_MAPS) each group shows when a pad is in use
const GROUP_CTX = { lopen: 'foot', rijden: 'vehicle', vechten: 'foot', heli: 'heli', duif: 'pigeon', menu: 'menu' };
const MOUSE_WORDS = { LMB: 'linkermuisknop klik', RMB: 'rechtermuisknop', MOUSE: 'muis', WHEEL: 'scrollwiel middelste muisknop', SPACE: 'spatie', CTRL: 'ctrl control', SHIFT: 'shift', ESC: 'esc escape', WASD: 'w a s d wasd', ARROWS: 'pijltjes pijltjestoetsen' };

function controlsHtml() {
  const alt = (a) => a.split('+').map((t) => glyphHtml(t)).join('<span class="pm-k-sep">+</span>');
  return CONTROL_GROUPS.map(([id, title, rows]) => `<section class="pm-cgroup" data-cgroup="${id}" data-pad-ctx="${GROUP_CTX[id] || 'foot'}" tabindex="0" aria-label="${esc(title)}">` +
    `<h3><svg class="pm-ic" viewBox="0 0 24 24" aria-hidden="true">${GROUP_ICONS[id]}</svg>${esc(title)}</h3>` +
    rows.filter(([keys]) => keys[0] !== 'K' || (world && world.kissUnlocked)).map(([keys, desc]) => {
      const words = keys.flatMap((k) => k.split('+')).map((t) => MOUSE_WORDS[t] || t).join(' ');
      return `<div class="pm-crow" data-search="${esc((title + ' ' + desc + ' ' + words).toLowerCase())}">` +
        `<span class="pm-ckeys">${keys.map(alt).join('<span class="pm-k-sep">/</span>')}</span><span class="pm-cdesc">${esc(desc)}</span></div>`;
    }).join('') + '</section>').join('');
}

function filterControls(q) {
  const panel = root.querySelector('[data-panel="controls"]');
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let any = false;
  for (const g of panel.querySelectorAll('.pm-cgroup:not(.pm-help)')) {
    let n = 0;
    for (const r of g.querySelectorAll('.pm-crow')) {
      const hit = words.every((w) => r.dataset.search.includes(w));
      r.hidden = !hit;
      if (hit) n++;
    }
    g.hidden = !n;
    any = any || n > 0;
  }
  panel.querySelector('.pm-cempty').hidden = any;
}

const ICONS = {
  resume: '<path d="M8 5l11 7-11 7z"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  load: '<path d="M3 7h6l2 2h10v11H3z"/><path d="M12 17v-6M9 13l3-3 3 3"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h0"/>',
  home: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  abort: '<circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
  bird: GROUP_ICONS.duif,
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  exit: '<path d="M14 4h6v16h-6M10 8l-4 4 4 4M6 12h10"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  map: '<path d="M3 6.2l6-2.2 6 2.2 6-2.2v13.8l-6 2.2-6-2.2-6 2.2zM9 4v13.8M15 6.2V20"/>',
  overzicht: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  todo: '<path d="M6 3v18M6 4h12l-2.5 4L18 12H6"/>',
  verhaal: '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5zM12 6v13.5"/>',
  garage: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
  fotos: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  prestaties: '<path d="M7 3h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M12 11v5M8 20h8l-1-4H9z"/>',
  streken: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="15" cy="15" r="1.1"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  controls: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10"/>',
  spullen: '<path d="M7 8V6a5 5 0 0 1 10 0v2"/><rect x="4" y="8" width="16" height="13" rx="3"/><path d="M4 13h16M10 13v2h4v-2"/>',
  telefoon: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
};
const icon = (id, cls = 'pm-ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id] || ''}</svg>`;
const qBtn = (action, ic, label, cls = 'pm-secondary', extra = '') =>
  `<button type="button" class="${cls}" data-action="${action}"${extra}>${icon(ic)}<span>${label}</span></button>`;

// [id, label, hint under the title in the sheet]
const SECTIONS = [
  ['overzicht', 'Overzicht', ''],
  ['todo', 'Te doen', 'Verhaal, missies, minigames en meer'],
  ['map', 'Kaart', 'Kies een doel of zoek een plek'],
  ['telefoon', 'Telefoon', 'Bellen en berichten'],
  ['verhaal', 'Verhaal', 'Personages en aanwijzingen'],
  ['spullen', 'Spullen', 'Alles wat je hebt'],
  ['garage', 'Garage', 'Jouw voertuigen'],
  ['prestaties', 'Prestaties', 'Blijven bewaard, ook bij een nieuw spel'],
  ['fotos', "Foto's", 'Fotomodus en je galerij'],
  ...(FLAGS.coop ? [['samen', 'Samen spelen', 'Iemand uitnodigen of aansluiten']] : []),
  ['settings', 'Instellingen', 'Wijzigingen worden meteen bewaard'],
  ['controls', 'Besturing', 'Alle toetsen, per situatie'],
  ['streken', 'Cheats', 'Een beetje vals spelen'],
];
// the rail's three groups: playing, collected, system
const RAIL_GROUPS = [['overzicht', 'todo', 'map', 'telefoon'], ['verhaal', 'spullen', 'garage', 'prestaties', 'fotos', ...(FLAGS.coop ? ['samen'] : [])], ['settings', 'controls', 'streken']];
const PRESTART_SECTIONS = ['settings', 'controls'];
const SUBTABS = {
  todo: [['verhaal', 'Verhaal'], ['alles', 'Alles'], ['dichtbij', 'Dichtbij']],
  telefoon: [['contacten', 'Contacten'], ['berichten', 'Berichten']],
  verhaal: [['personages', 'Personages'], ['aanwijzingen', 'Aanwijzingen']],
  settings: [['video', 'Beeld'], ['sound', 'Geluid & ondertitels'], ['camera', 'Camera & controller'], ['display', 'Interface'], ['a11y', 'Toegankelijkheid'], ['fouten', 'Foutrapport']],
  controls: [['toetsen', 'Toetsenbord en muis'], ['knoppen', 'Controller'], ['overzicht', 'Alle toetsen'], ['hulp', 'Hulp']],
};
// old tab names (saved preferences, other modules)
const SUB_ALIAS = { settings: { controller: 'camera' } };

// The footer: two to four hints, [keys, label, action]. ' back' is filled in.
const BACK = '\u0000';
const HINTS = {
  overzicht: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Esc'], 'doorgaan', 'resume']],
  todo: [[['↑', '↓'], 'kiezen'], [['Enter'], 'zet als doel'], [['Q', 'E'], 'weergave'], [['Esc'], BACK, 'back']],
  map: [[['Klik'], 'doel kiezen'], [['Scroll'], 'zoomen'], [['M'], 'sluiten', 'resume'], [['Esc'], BACK, 'back']],
  telefoon: [[['↑', '↓'], 'kiezen'], [['Enter'], 'bellen of lezen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  verhaal: [[['↑', '↓'], 'kiezen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  spullen: [[['↑', '↓'], 'kiezen'], [['Enter'], 'gebruiken'], [['Esc'], BACK, 'back']],
  garage: [[['↑', '↓'], 'kiezen'], [['Enter'], 'laten afleveren'], [['Q', 'E'], 'soort'], [['Esc'], BACK, 'back']],
  prestaties: [[['↑', '↓'], 'kiezen'], [['Enter'], 'openen'], [['Q', 'E'], 'weergave'], [['Esc'], BACK, 'back']],
  fotos: [[['F8'], 'fotomodus'], [['Esc'], BACK, 'back']],
  streken: [[['↑', '↓'], 'kiezen'], [['Enter'], 'aan of uit'], [['Esc'], BACK, 'back']],
  settings: [[['↑', '↓'], 'kiezen'], [['←', '→'], 'wijzigen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  controls: [[['↑', '↓'], 'kiezen'], [['Enter'], 'toets wijzigen'], [['Q', 'E'], 'onderdeel'], [['Esc'], BACK, 'back']],
};
// a line in the sheet header that replaces the section's hint
const SHEET_NOTE = {};
// a fixed controller glyph (the menu's own buttons)
const pg =(slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
const PAD_KEYS = { '↑': 'dpad', '↓': null, '←': 'dpad', '→': null, Enter: 'a', Esc: 'b', Q: 'lb', E: 'rb', Klik: 'a', Scroll: 'rt', M: 'y' };
const PAD_LABEL = { 'zet als doel': 'zet als doel', 'toets wijzigen': 'indelen' };

const HOME = 'overzicht';
let root = null;
let sheet = null;
let open = false;
let input = null;
let world = null;
let tab = HOME;
// how the open section was reached: 'home' (inside the menu: Esc goes back
// to Overzicht) or 'direct' (M, the phone: Esc closes the menu)
let origin = 'home';
let prestart = null;
const lastFocus = {};

const PREF_KEY = KEYS.menu;
const pref = loadPref();
function loadPref() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return { last: typeof p.last === 'string' ? p.last : 'todo', sub: p.sub && typeof p.sub === 'object' ? p.sub : {} };
  } catch (e) {
    return { last: 'todo', sub: {} };
  }
}
function savePref() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) { /* private mode: keep it in memory */ }
}

export { isPauseMenuOpen } from './pausestate.js';

// How much of the city the menu hides: 0 closed, 2 most of it (the rail
// plus a section).
export function pauseMenuCover() {
  return open ? 2 : 0;
}

const started = () => document.body.classList.contains('game-started');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sectionIds = () => (prestart ? PRESTART_SECTIONS : SECTIONS.map(([id]) => id));
const sectionOf = (id) => SECTIONS.find(([s]) => s === id);
const key = (k) => `<span class="hud-key">${k}</span>`;

const CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
const CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';
const plain = (t) => String(t).replace(/<[^>]*>/g, '').replace(/&shy;/g, '');

function subtabsHtml(of, label) {
  return `<div class="m-tabs"><nav class="m-tablist" role="tablist" aria-label="${label}">` + SUBTABS[of].map(([id, text]) =>
    `<button type="button" role="tab" class="m-tab" data-of="${of}" data-subtab="${id}" aria-selected="false">${esc(text)}<small data-count="${id}"></small></button>`).join('') + '</nav>' +
    (of === 'todo' ? '<span class="m-grow"></span><button type="button" class="m-bt" data-todo-sort aria-pressed="false" hidden>Dichtbij eerst</button>' : '') + '</div>';
}

const rowName = (label, note) => `<span class="nm">${label}${note ? `<span class="mut">${note}</span>` : ''}</span>`;

function slider(k, label, min = 0, max = 1, step = 0.05, note = '') {
  return `<label class="m-li pm-row">${rowName(label, note)}<input type="range" class="m-sl" min="${min}" max="${max}" step="${step}" data-setting="${k}"><output class="m-val"></output></label>`;
}

function toggle(k, label, note = '') {
  return `<label class="m-li pm-row">${rowName(label, note)}<input type="checkbox" class="m-sw" data-setting="${k}"></label>`;
}

// a picker: previous, the chosen value, next (the mockups' replacement for a segmented row)
function picker(k, label, options, note = '', attrs = `data-setting="${k}"`) {
  const name = plain(label);
  return `<div class="m-li pm-row"><span class="nm" id="pm-l-${k}">${label}${note ? `<span class="mut">${note}</span>` : ''}</span>` +
    `<span class="m-pk" role="group" aria-labelledby="pm-l-${k}" ${attrs} data-options="${esc(JSON.stringify(options))}">` +
    `<button type="button" data-pick="-1" aria-label="${esc(name)}: vorige">${CHEV_L}</button><output aria-live="polite"></output>` +
    `<button type="button" data-pick="1" aria-label="${esc(name)}: volgende">${CHEV_R}</button></span></div>`;
}

function disclosure(id, title, hint, inner, open = false) {
  return `<div class="m-rule"></div><button type="button" class="m-disc" data-fold="${id}" aria-expanded="${open}" aria-controls="pm-f-${id}">${CHEV_R}<b>${title}</b><span class="mut">${hint}</span></button>` +
    `<div class="m-fold" id="pm-f-${id}" data-fold-body="${id}"${open ? '' : ' hidden'}>${inner}</div>`;
}

const pane = (eyebrow, title, inner = '') => `<aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">${eyebrow}</span><h2 class="m-h2">${title}</h2></div>${inner}</aside>`;

function settingsHtml() {
  const qualities = Object.keys(QUALITY_PRESETS).map((q) => [q, q[0].toUpperCase() + q.slice(1)]);
  const presets = [...PRESET_ORDER, 'eigen'].map((n) => [n, n === 'eigen' ? 'Eigen' : presetLabel(n)]);
  const tab = (id, rows, side = '') => `<div data-of="settings" data-sub="${id}" class="pm-settab" hidden><div class="m-list pm-slist">${rows}</div>${side}</div>`;
  return `${subtabsHtml('settings', 'Onderdeel')}
    ${tab('video', `
      <div class="pm-advice" data-bench-banner hidden></div>
      ${picker('preset', 'Voorinstelling', presets, '', 'data-preset-pick')}
      ${picker('resolution', 'Resolutie', [['1', '100%'], ['0.85', '85%'], ['0.75', '75%'], ['0.6', '60%']])}
      ${toggle('autoResolution', 'Automatische resolutie', 'bij haperen')}
      ${toggle('shadows', 'Schaduwen')}
      ${picker('drawDistance', 'Zichtafstand', [['kort', 'Kort'], ['normaal', 'Normaal'], ['ver', 'Ver'], ['heelver', 'Heel ver']])}
      ${DESKTOP ? '<label class="m-li pm-row"><span class="nm">Volledig scherm<span class="mut">F11 of Alt+Enter</span></span><input type="checkbox" class="m-sw" data-desktop="fullscreen"></label>' : ''}
      ${slider('brightness', 'Helderheid', 0.6, 1.6, 0.05)}
      ${disclosure('video', 'Meer opties', 'Licht en gloed, benchmark draaien', `
        ${picker('quality', 'Kwaliteit', qualities, 'Licht, gloed en kleuren')}
        <div class="m-li pm-row">${rowName('Benchmark', 'Test hoe soepel Grunn draait op deze computer en welke stand past (±1 min)')}<button type="button" class="m-bg" data-action="bench">Benchmark draaien</button></div>
        <div class="pm-confirm" data-bench-confirm hidden>
          <p data-bench-text></p>
          <div class="m-acts"><button type="button" class="m-bp" data-action="bench-go">Starten</button><button type="button" class="m-bt" data-action="bench-cancel">Annuleren</button></div>
        </div>`)}`, `
      <aside class="m-pane" data-preset-pane><div class="pm-pane-top"><span class="m-eb">Voorinstelling</span><h2 class="m-h2" data-preset-name></h2></div>
        <p data-preset-desc></p>
        <div class="m-fact" data-preset-fps hidden><span>Verwacht op deze computer</span><span class="m-num pm-big"></span></div>
        <div class="pm-fpsbars" data-preset-bars></div><p class="mut" data-bench-note></p></aside>`)}
    ${tab('sound', `
      ${slider('masterVolume', 'Hoofdvolume')}
      ${slider('musicVolume', 'Muziek')}
      ${slider('sfxVolume', 'Effecten')}
      ${slider('voiceVolume', 'Stemmen')}
      <label class="m-li pm-row">${rowName('Radio G-Music', 'Ook met N, te voet en in elk voertuig')}<input type="checkbox" class="m-sw" data-radio-switch></label>
      ${disclosure('subs', 'Ondertitels', 'Filmpjes, gesprekken, telefoon, radio en naamkaarten', `
        ${picker('subtitleSize', 'Grootte', [['klein', 'Klein'], ['normaal', 'Normaal'], ['groot', 'Groot'], ['extragroot', 'Extra groot']])}
        ${toggle('subtitleBox', 'Donker vlak erachter', 'Een donker vlak maakt ze makkelijker te lezen')}`, true)}`, `
      <aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">Zo ziet het eruit</span></div>
        <div class="pm-subprev" data-sub-preview><span class="pm-subtxt"><b>Tammo:</b> Rustig an, rustig an.</span></div>
        <p class="mut">Muziek is de radio (G-Music, 's nachts Nachtstreek) en de titelsong, stemmen zijn Tammo, Tessa, de politie, de mensen op straat en de praatjes op de radio. Kleurenblind, interfacegrootte en beweging beperken vind je onder Toegankelijkheid.</p></aside>`)}
    ${tab('camera', `
      ${slider('fov', 'Beeldhoek', 50, 90, 1)}
      ${slider('cameraDistance', 'Camera-afstand', 0.8, 1.6, 0.05)}
      ${slider('mouseSensitivity', 'Muisgevoeligheid', 0.3, 2.5, 0.05)}
      ${toggle('invertY', 'Omhoog/omlaag omkeren', 'Geldt voor de muis en de stick')}
      ${toggle('autoAim', 'Automatisch richten', 'Rechtermuisknop zoekt zelf het beste doelwit')}
      <div class="m-gh"><span>Controller</span></div>
      ${picker('padLayout', 'Knoppen tonen als', [['auto', 'Automatisch'], ['xbox', 'Letterknoppen (A B X Y)'], ['ps', 'Vormknoppen'], ['switch', 'Wisselende letters'], ['deck', 'Handheld']], 'Automatisch kiest wat er aangesloten is')}
      ${slider('padLookSensitivity', 'Camera met de rechterstick', 0.3, 2.5, 0.05)}
      ${toggle('rumble', 'Trillen', 'Bij klappen, schoten en botsingen, als je controller dat kan')}
      <div class="m-li pm-row">${rowName('Knoppen indelen', 'Onder Besturing › Controller')}<button type="button" class="m-bg" data-goto-sub="controls:knoppen">Indelen</button></div>
      <div class="m-li pm-row">${rowName('Controller testen', 'Welk pad wordt herkend en welke knop doet wat')}<button type="button" class="m-bg" data-pad-test>Testen</button></div>`, `${pane('Camera & controller', 'Meekijken', '<p>Alle gangbare controllers werken meteen. De hints in beeld wisselen vanzelf tussen toetsen en knoppen, naar wat je het laatst gebruikte.</p><p class="mut">De camera-afstand en beeldhoek gelden te voet en in elk voertuig.</p>')}`)}
    ${tab('display', `
      ${picker('hudMode', 'HUD', [['slim', 'Slim'], ['alles', 'Altijd alles'], ['minimaal', 'Minimaal']], 'Slim toont alleen wat nu telt')}
      ${toggle('showMinimap', 'Minimap')}
      ${slider('minimapZoom', 'Inzoomen op het kaartje', 0.6, 1.6, 0.05)}
      ${picker('minimapNorth', 'Minimap met noord boven', [['nooit', 'Nooit'], ['lucht', 'In de lucht'], ['altijd', 'Altijd']], 'Standaard draait de kaart mee')}
      ${toggle('showHints', 'Toetshints')}
      ${picker('hintSource', 'Hints tonen voor', [['auto', 'Automatisch'], ['keys', 'Toetsenbord'], ['pad', 'Controller']], 'Automatisch volgt wat je het laatst gebruikte')}
      ${picker('touchControls', 'Aanraakbediening', [['auto', 'Automatisch'], ['aan', 'Aan'], ['uit', 'Uit']], 'Knoppen op het scherm voor telefoon en tablet; wisselen werkt na een herstart')}
      ${disclosure('display', 'Meer opties', 'Uitleg, kaart, filmpjes, bloed', `
        ${toggle('onboardingTips', 'Uitleg voor nieuwe spelers', 'Korte tips, elk één keer: je eerste klus, geld en winkels, de telefoon, de kaart en Te doen')}
        ${toggle('showFog', 'Verkende gebieden op de kaart')}
        ${toggle('cinematicMoments', 'Filmische momenten', 'Bij bezienswaardigheden, crashes en vijf sterren; intro’s, missies en de filmcamera (V) staan altijd aan')}
        ${toggle('wijkFilm', 'Filmpje bij nieuwe wijken', 'Uit: een korte naamkaart met wat er te zien is; aan: de volledige rondvlucht')}
        ${picker('drunkFx', 'Dronken effecten', [['aan', 'Aan'], ['mild', 'Mild'], ['uit', 'Uit']])}
        ${picker('ruzie', 'Verkeersruzie', [['uit', 'Uit'], ['weinig', 'Weinig'], ['normaal', 'Normaal'], ['veel', 'Veel']], 'Hoe vaak een boze bestuurder uitstapt na een botsing of getoeter. Zonder bloed; sommigen hebben iets in de hand')}
        ${picker('shiftMode', 'Schakelen', [['auto', 'Automaat'], ['manual', 'Handmatig'], ['clutch', 'Handmatig + koppeling']], 'Automaat is de standaard; handmatig schakel je met . en , (of de bumpers), met koppeling houd je ook J ingedrukt')}
        ${toggle('driftAssist', 'Driften met hulp', 'Helpt tegensturen en houdt een slip beheersbaar; uit is realistischer')}
        ${toggle('bikeAssist', 'Motor met hulp', 'Houdt een motor of brommer rechtop in bochten; uit is realistischer')}
        ${toggle('gore', 'Bloed en ledematen', 'Uit: mensen vallen gewoon om, zonder bloed of rondvliegende ledematen')}`)}`, `${pane('Interface', 'Wat je ziet', '<p>Slim toont alleen wat nu telt; Altijd alles houdt alles in beeld; Minimaal laat alleen sterren, doel en ondertitels over.</p>')}`)}
    ${tab('a11y', `
      ${picker('colorBlind', 'Kleurenblind', [['uit', 'Uit'], ['deuteranopie', 'Deuteranopie'], ['protanopie', 'Protanopie'], ['tritanopie', 'Tritanopie']], 'Andere kleuren voor markers, routes, kaart en HUD')}
      ${slider('uiScale', 'Grootte interface', 0.8, 1.5, 0.05)}
      ${picker('textSize', 'Tekstgrootte', [['normaal', 'Normaal'], ['groot', 'Groot'], ['extragroot', 'Extra groot']], 'Groter voor meldingen, toetshints en berichten')}
      ${picker('subtitleContrast', 'Contrast ondertitels', [['normaal', 'Normaal'], ['hoog', 'Hoog']], 'Hoog: wit op bijna zwart, met zwaardere letters')}
      ${toggle('reduceMotion', 'Beweging beperken', 'Staat ook aan als je systeem om minder beweging vraagt')}
      ${toggle('reduceFlash', 'Flitsen beperken', 'Geen witte schermflitsen in filmpjes en intro')}
      <div class="m-gh"><span>Hulp</span></div>
      ${picker('helpTime', 'Meer tijd', [['uit', 'Uit'], ['ruimer', '+25%'], ['ruim', '+50%'], ['heel ruim', 'Dubbel']], 'Langere tijdslimieten en vensters in missies')}
      ${picker('helpDamage', 'Minder schade', [['normaal', 'Normaal'], ['minder', 'Minder'], ['veel minder', 'Veel minder']], 'Je eigen voertuig houdt meer over na een klap')}
      ${picker('helpGates', 'Ruimere vliegpoorten', [['normaal', 'Normaal'], ['ruimer', 'Ruimer'], ['ruim', 'Ruim']], 'Grotere ringen en een bredere hoogteband')}
      ${toggle('helpOffer', 'Hulp aanbieden', 'Na twee keer mislukken van dezelfde stap vraagt het spel of je hulp wilt')}`, `${pane('Toegankelijkheid', 'Lekker lezen', '<p>Vormen en patronen helpen altijd, ook als je geen kleurenstand kiest. Menu’s, kaarten en tellers springen meteen naar hun nieuwe stand als je beweging beperkt.</p><p class="mut">Ondertitels stel je in onder Geluid & ondertitels.</p>')}`)}
    ${tab('fouten', `<div class="m-list pm-slist pm-wide">
      <p class="pm-note">Gaat er iets mis, dan schrijft het spel dat hier op. Alleen op dit apparaat: er wordt niets verstuurd. Wil je helpen? Kopieer het rapport en stuur het zelf mee met je melding. Er staat niets persoonlijks in: de melding, waar in de code, de versie, je verhaalstap, een paar instellingen en het soort videokaart.</p>
      <div class="m-acts pm-errlog-actions">
        <button type="button" class="m-bg" data-action="errlog-copy">Kopieer naar klembord</button>
        ${DESKTOP && DESKTOP.saveTextFile ? '<button type="button" class="m-bg" data-action="errlog-save">Opslaan als bestand</button>' : ''}
        <button type="button" class="m-bt" data-action="errlog-clear">Wissen</button>
      </div>
      <p class="pm-status" data-errlog-status role="status"></p>
      <ol class="pm-errlog" data-errlog></ol></div>`)}`;
}
export function initPauseMenu(w) {
  world = w;
  input = w.input;
  for (const css of ['menu.css', 'pausemenu.css']) {
    if (document.getElementById('style-' + css)) continue;
    const link = document.createElement('link');
    link.id = 'style-' + css;
    link.rel = 'stylesheet';
    link.href = new URL('./' + css, import.meta.url).href;
    document.head.appendChild(link);
  }
  root = document.createElement('div');
  root.id = 'pause-menu';
  root.className = 'gm';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pm-title');
  root.dataset.level = 'section';
  const railBtn = (id) => { const [, label] = sectionOf(id); return `<button type="button" class="ra" data-goto="${id}" aria-current="false">${icon(id, 'pm-ic ra-ic')}<span class="ra-t">${label}</span><span class="n" data-n="${id}"></span></button>`; };
  root.innerHTML = `
    <div class="pm-fold gm-stage">
      <nav class="pm-rail" aria-label="Pauzemenu">
        <div class="pm-inner pm-game">
          <div class="pm-q-head">${logoHtml({ sub: false, cls: 'pm-logo', decorative: true })}<b id="pm-title" class="pm-sr">Pauze</b><span class="mut pm-q-info" data-info="when"></span></div>
          ${RAIL_GROUPS.map((g) => g.map(railBtn).join('')).join('<span class="pm-rail-sp"></span>')}
          <span class="pm-rail-gap"></span>
          <button type="button" class="ra pm-back" data-action="resume">Terug</button>
          <div class="pm-rail-acts pm-ingame">
            <button type="button" class="m-bt" data-action="save">Opslaan</button>
            <button type="button" class="m-bt" data-action="saves" title="Savegames kiezen, laden, hernoemen, exporteren en verwijderen">Savegames</button>
            <button type="button" class="m-bt" data-action="menu" title="Opslaan en terug naar het titelscherm">Hoofdmenu</button>
            ${DESKTOP ? '<button type="button" class="m-bt" data-action="exit" title="Opslaan en het spel sluiten">Afsluiten</button>' : ''}
          </div>
          <p class="pm-ver">${versionLabel(VERSION)}</p>
          <div class="pm-rail-foot pm-ingame">
            <p class="pm-status" role="status"></p>
            <button type="button" class="m-bt danger" data-action="restart">Opnieuw beginnen</button>
            <div class="pm-confirm" hidden>
              <p>Opnieuw beginnen? Alles sinds je laatste savegame gaat verloren. Je andere savegames blijven staan.</p>
              <button type="button" class="m-bg" data-action="load">Laatste savegame laden</button>
              <button type="button" class="m-bg danger" data-action="new">Nieuw spel (nieuw slot)</button>
              <button type="button" class="m-bt" data-action="cancel">Annuleren</button>
            </div>
          </div>
        </div>
      </nav>
      <section class="pm-sheet m-panel" aria-labelledby="pm-sheet-title">
        <header class="pm-sheet-head m-head">
          <div class="pm-sheet-titles"><span class="m-eb pm-sheet-eb" hidden></span><h1 class="m-h1 pm-sheet-title" id="pm-sheet-title"></h1></div>
          <div class="m-hr pm-sheet-r"><span class="mut pm-sheet-sub"></span><button type="button" class="m-bt" data-action="reset" hidden>Standaard herstellen</button></div>
        </header>
        <div class="pm-sheet-body">
          <section data-panel="overzicht" class="pm-panel pm-col" hidden><div class="pm-inner pm-ov"></div></section>
          <section data-panel="telefoon" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-phone">
            ${subtabsHtml('telefoon', 'Telefoon')}
            <div class="m-main"><div class="m-list td-list">
              <div data-of="telefoon" data-sub="contacten"></div><div data-of="telefoon" data-sub="berichten" hidden></div>
            </div><aside class="m-pane td-detail ph-detail" aria-label="Gesprek" aria-live="polite"></aside></div>
          </div></section>
          <section data-panel="todo" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-todo">
            ${subtabsHtml('todo', 'Weergave')}
            <div class="m-main"><div class="m-list td-list">
              <div data-of="todo" data-sub="verhaal"></div><div data-of="todo" data-sub="alles" hidden></div><div data-of="todo" data-sub="dichtbij" hidden></div>
            </div><aside class="m-pane td-detail" aria-label="Details"></aside></div>
          </div></section>
          <section data-panel="map" class="pm-panel pm-map" hidden></section>
          <section data-panel="spullen" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-spullen"><div class="m-main"><div class="m-list td-list"></div><aside class="m-pane td-detail" aria-label="Details"></aside></div></div></section>
          <section data-panel="garage" class="pm-panel pm-col" hidden><div class="pm-inner pm-garage"></div></section>
          <section data-panel="verhaal" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-verhaal">${subtabsHtml('verhaal', 'Verhaal')}
            <div class="m-main pm-vbody"><div data-of="verhaal" data-sub="personages" class="pm-vsub"></div><div data-of="verhaal" data-sub="aanwijzingen" class="pm-vsub" hidden></div></div>
          </div></section>
          <section data-panel="prestaties" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach"></div></section>
          <section data-panel="fotos" class="pm-panel pm-col" hidden><div class="pm-inner pm-fotos"></div></section>
          <section data-panel="streken" class="pm-panel pm-col" hidden><div class="pm-inner pm-streken"></div></section>
          <section data-panel="samen" class="pm-panel pm-col" hidden><div class="pm-inner pm-samen"></div></section>
          <section data-panel="settings" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-settings">${settingsHtml()}</div></section>
          <section data-panel="controls" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-cinner">
            ${subtabsHtml('controls', 'Besturing')}
            <div data-of="controls" data-sub="overzicht" class="pm-csub" hidden>
              <div class="m-main"><div class="m-list pm-clist">
                <label class="m-inp pm-csearch">${icon('search')}
                  <input type="search" data-controls-search placeholder="Zoek een toets of actie, bijv. toeter, duif of Q" aria-label="Zoek in de besturing" autocomplete="off" spellcheck="false"></label>
                <div class="pm-cgrid">${controlsHtml()}</div>
                <p class="m-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p>
              </div></div>
            </div>
            <div data-of="controls" data-sub="hulp" class="pm-csub" hidden><div class="m-main"><div class="m-list pm-clist"><div class="pm-cgrid"><section class="pm-cgroup pm-help" data-help="oefenronde"><h3>Oefenronde</h3><p class="pm-hline">Zeven korte stappen: lopen, rennen, de kaart, in- en uitstappen en het menu. Zonder missie en zonder gevolgen.</p><button type="button" class="m-bt" data-practice-start>Oefenen</button></section>${helpHtml((t) => glyphHtml(t), esc)}</div></div></div></div>
            <div data-of="controls" data-sub="toetsen" class="pm-binds pm-csub m-main" hidden></div>
            <div data-of="controls" data-sub="knoppen" class="pm-binds pm-csub m-main" hidden></div>
          </div></section>
        </div>
      </section>
      <footer class="pm-footer m-foot"></footer>
    </div>`;
  document.body.appendChild(root);
  sheet = root.querySelector('.pm-sheet');

  mountMapView(root.querySelector('[data-panel="map"]'));
  setMapCloseHandler(() => setOpen(false));

  for (const type of ['mousedown', 'mouseup', 'wheel']) root.addEventListener(type, (e) => e.stopPropagation());

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-practice-start]')) { setOpen(false); window.dispatchEvent(new CustomEvent('gde-oefenronde')); return; }
    const go = e.target.closest('[data-goto]');
    if (go) return enterSection(go.dataset.goto);
    const hint = e.target.closest('[data-hint]');
    if (hint) { if (hint.dataset.hint === 'back') goBack(); else runAction(hint.dataset.hint); return; }
    const fold = e.target.closest('[data-fold]');
    if (fold) { toggleFold(fold); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) { stepPicker(pick.closest('.m-pk'), Number(pick.dataset.pick)); return; }
    if (e.target.closest('[data-pad-test]')) { openPadTest(); return; }
    const gsub = e.target.closest('[data-goto-sub]');
    if (gsub) { const [sec, sub] = gsub.dataset.gotoSub.split(':'); pref.sub[sec] = sub; enterSection(sec); return; }
    const rk = e.target.closest('[data-rebind-key]');
    if (rk) return startKeyRebind(rk);
    const rp = e.target.closest('[data-rebind-pad]');
    if (rp) return startPadRebind(rp);
    const st = e.target.closest('[data-subtab]');
    if (st) { showSubtab(st.dataset.of, st.dataset.subtab); if (st.dataset.of === 'todo') renderTodoPanel(); if (st.dataset.of === 'verhaal') renderVerhaalPanel(); if (st.dataset.of === 'controls') renderBinds(); if (st.dataset.of === 'telefoon') renderPhone(); return; }
    if (e.target.closest('[data-story-skip]')) {
      if (skipCurrent()) setOpen(false);
      else rerenderTodo();
      return;
    }
    const panel = activePanel();
    if (panel && tab === 'spullen' && spullenClick(e, world, panel, spullenApi)) return;
    if (panel && tab === 'telefoon' && phoneClick(e, world, panel, phoneApi)) return;
    if (panel && (tab === 'overzicht' || tab === 'todo') && todoClick(e, world, panel, todoApi)) return;
    const gd = e.target.closest('[data-garage-deliver]');
    if (gd) return garageDeliver(gd.dataset.garageDeliver);
    const gf = e.target.closest('[data-garage-find]');
    if (gf) return garageFind(gf.dataset.garageFind);
    const gs = e.target.closest('[data-garage-select]');
    if (gs) return selectGarageVehicle(garageEl(), gs.dataset.garageSelect);
    if (tab === 'fotos' && fotoClick(e, world, root.querySelector('[data-panel="fotos"] .pm-inner'), { close: () => closePauseMenu() })) return;
    if (tab === 'verhaal' && verhaalClick(e, activePanel())) return;
    if (tab === 'streken' && cheatsClick(e, world, cheatsApi)) return;
    const action = e.target.closest('[data-action]');
    if (action) runAction(action.dataset.action);
  });
  root.addEventListener('input', (e) => {
    if (e.target.dataset && 'radioSwitch' in e.target.dataset) { setRadio(e.target.checked, { announce: false }); syncControls(); return; }
    if (DESKTOP && e.target.dataset && e.target.dataset.desktop === 'fullscreen') {
      DESKTOP.setFullscreen(e.target.checked);
      return;
    }
    const k = e.target.dataset && e.target.dataset.setting;
    if (!k) return;
    const el = e.target;
    const value = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
    setSetting(k, value);
    syncControls();
  });
  // the garage rebuilds its toolbar and the prestaties their category row on
  // a click: keep the sheet title in step
  root.addEventListener('click', () => { if (tab === 'garage' || tab === 'prestaties') syncSheetSub(); });
  root.addEventListener('focusin', (e) => {
    const p = activePanel();
    if (p && p.contains(e.target)) lastFocus[tab] = e.target;
    if (tab === 'todo' && p) todoFocus(p, world, e.target);
    if (tab === 'spullen' && p) spullenFocus(p, e.target);
    if (tab === 'streken' && p) cheatsFocus(p, e.target);
  });

  const search = root.querySelector('[data-controls-search]');
  // typing in the search box must not reach the game's key handlers
  for (const type of ['keydown', 'keyup', 'keypress']) {
    search.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type !== 'keydown' || e.key !== 'Escape') return;
      e.preventDefault();
      if (search.value) { search.value = ''; filterControls(''); } else search.blur();
    });
  }
  search.addEventListener('input', () => filterControls(search.value));

  // a narrow sheet stacks the garage's list and viewer, and Te doen's details
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => sheet.toggleAttribute('data-narrow', sheet.clientWidth / getUiScale() < 860)).observe(sheet);
  }

  // the footer hints follow the last used input
  onPadChange(() => { if (open) syncFooter(); });
  // F11 / the macOS green button also switch modes: keep the checkbox right
  if (DESKTOP) DESKTOP.onFullscreenChange(() => syncDesktopControls());
  // capture: runs before the map's and the input's own key handlers, so a
  // key the menu uses (Backspace, arrows in the rail) does nothing else
  window.addEventListener('keydown', onKey, true);
  // ?stil marks an automated test session, whose tab is often hidden
  if (!FLAGS.stil) {
    document.addEventListener('visibilitychange', () => { if (document.hidden && started()) setOpen(true, HOME); });
  }
}

const spullenApi = {
  rerender: (keep) => {
    const sel = keep && keep.dataset && keep.dataset.spul ? `[data-spul="${CSS.escape(keep.dataset.spul)}"]` : '';
    renderSpullenPanel();
    const back = sel && activePanel().querySelector(sel);
    if (back) back.focus({ preventScroll: true });
  },
};

function renderSpullenPanel() {
  try { sheet.querySelector('.pm-sheet-sub').textContent = renderSpullen(root.querySelector('[data-panel="spullen"]'), world); } catch (err) { console.error('spullen', err); }
}

const phoneApi = {
  rerender: (keep) => {
    const sel = keep && keep.dataset && keep.dataset.phThread ? `[data-ph-thread="${CSS.escape(keep.dataset.phThread)}"]` : '';
    renderPhone();
    const back = sel && activePanel().querySelector(sel);
    if (back) back.focus({ preventScroll: true });
  },
};

const todoApi = {
  rerender: (keep) => rerenderTodo(keep),
  showView: (view) => { pref.sub.todo = view; enterSection('todo'); },
  showOnMap: (x, y) => { enterSection('map'); setMapView(x, y, 3); },
  close: () => setOpen(false),
};

const cheatsApi = {
  teleport: () => { enterSection('map'); setMapTeleport(true); },
  close: () => setOpen(false),
  rerender: (sel) => renderCheats(sel),
};

function renderCheats(focusSel) {
  const panel = root.querySelector('[data-panel="streken"]');
  const sub = renderCheatsPanel(panel.querySelector('.pm-inner'), world);
  if (tab === 'streken') sheet.querySelector('.pm-sheet-sub').textContent = sub;
  const back = focusSel && panel.querySelector(focusSel);
  if (back) back.focus({ preventScroll: true });
}

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function consume(e) {
  e.preventDefault();
  e.stopPropagation();
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // the play-ahead question (todo.js) has its own keys
  if (isPlayAheadOpen() || isSaveSlotsOpen() || isHelpOfferOpen()) return;
  const k = e.key;
  const lower = k.length === 1 ? k.toLowerCase() : k;
  if (!open) {
    if (e.repeat || !started()) return;
    if (k === 'Escape' && document.body.classList.contains('mg-board')) return;
    if (k === 'Escape' || (lower === 'm' && !isCinematicActive())) {
      e.preventDefault();
      setOpen(true, k === 'Escape' ? HOME : 'map', 'direct');
    }
    return;
  }
  if (rebinding) {
    // Esc while waiting for a key, or a controller's B while waiting for a button
    if (k === 'Escape' || k === 'Backspace') { consume(e); cancelRebind(); }
    return;
  }
  const t = e.target instanceof Element ? e.target : null;
  // text fields (the searches) have their own keys, Escape included
  if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['range', 'checkbox'].includes(t.type)))) return;
  const dir = ARROWS[k];
  if (e.repeat && !dir) return;
  const inRail = !!(t && t.closest && t.closest('.pm-rail'));
  if (k === 'Escape' || k === 'Backspace') {
    consume(e);
    goBack();
  } else if (lower === 'm' && !prestart) {
    consume(e);
    if (tab === 'map') setOpen(false);
    else enterSection('map');
  } else if (lower === 'q' || lower === 'e') {
    consume(e);
    // Q and E: the section's tabs; a section without tabs: the previous or next section
    if (SUBTABS[tab]) { if (!e.repeat) cycleSubtab(lower === 'q' ? -1 : 1); } else if (!e.repeat && cycleOwnTabs(lower === 'q' ? -1 : 1)) { /* garage, prestaties: their own tabs */ } else cycleSection(lower === 'q' ? -1 : 1);
  } else if ((k === '[' || k === ']') && SUBTABS[tab]) {
    // [ and ] (a controller's triggers): the section's previous or next tab
    consume(e);
    if (!e.repeat) cycleSubtab(k === '[' ? -1 : 1);
  } else if (k === 'Tab') {
    consume(e);
    if (tab === 'map' && !inRail) cycleSection(e.shiftKey ? -1 : 1);
    else tabFocus(e.shiftKey ? -1 : 1);
  } else if (dir) {
    // the map pans with the arrows (and WASD) unless the rail has focus
    if (tab === 'map' && !inRail) return;
    if (t && t.tagName === 'SELECT') return;
    consume(e);
    if (t && t.type === 'range' && (dir === 'left' || dir === 'right')) stepRange(t, dir === 'right' ? 1 : -1);
    else if (t && t.closest && t.closest('.m-pk') && (dir === 'left' || dir === 'right')) stepPicker(t.closest('.m-pk'), dir === 'right' ? 1 : -1);
    else moveFocus(dir);
  } else if (k === 'Enter' || k === ' ') {
    if (!t || !root.contains(t)) return;
    if (t.type === 'checkbox') {
      consume(e);
      t.checked = !t.checked;
      t.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (t.dataset && t.dataset.garageSelect) {
      consume(e);
      selectGarageVehicle(garageEl(), t.dataset.garageSelect);
    } else if (k === 'Enter' && t.dataset && t.dataset.todo && tab === 'todo') {
      // Enter on a card: straight to "Zet als doel" (a click only shows its details)
      consume(e);
      if (!todoEnter(world, t.dataset.todo, todoApi)) t.click();
    } else if (t.tagName === 'BUTTON') {
      // input.js cancels Space (no page scroll), which also cancels the
      // button's own click: both keys click here, once
      consume(e);
      t.click();
    }
  }
}

// Esc/Backspace: close an open confirm, then back to Overzicht, then close.
function goBack() {
  const confirmEl = root.querySelector('.pm-game .pm-confirm');
  if (!confirmEl.hidden) {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
    return;
  }
  const legend = tab === 'map' && root.querySelector('.mapview-legend:not([hidden])');
  if (legend) { root.querySelector('.mv-layers').click(); root.querySelector('.mv-layers').focus(); return; }
  const bench = root.querySelector('[data-bench-confirm]');
  if (tab === 'settings' && !bench.hidden) {
    bench.hidden = true;
    root.querySelector('[data-action="bench"]').focus();
    return;
  }
  if (tab !== HOME && !prestart && origin === 'home') {
    const from = tab;
    showTab(HOME);
    focusEl(root.querySelector(`.pm-game [data-goto="${from}"]`));
    return;
  }
  setOpen(false);
}

function cycleSection(dir) {
  const ids = sectionIds();
  const i = Math.max(0, ids.indexOf(tab));
  enterSection(ids[(i + dir + ids.length) % ids.length]);
}

// Opens a section from inside the menu (rail, Q/E, M, a card) and puts the
// focus in it; Esc then leads back to Overzicht.
function enterSection(id) {
  if (!sectionIds().includes(id)) id = sectionIds()[0];
  showTab(id, 'home');
  focusSheet();
}

const FOCUSABLE = 'button, input, select, [tabindex]';
function visibleFocusables(scope) {
  // a controller can't type: it skips the search fields
  const pad = isPadActive();
  return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[hidden]') && !(pad && el.type === 'search'));
}

function cycleSubtab(dir) {
  const subs = SUBTABS[tab];
  const cur = pref.sub[tab] || subs[0][0];
  const i = Math.max(0, subs.findIndex(([id]) => id === cur));
  const next = subs[(i + dir + subs.length) % subs.length][0];
  showSubtab(tab, next);
  if (tab === 'todo') renderTodoPanel();
  if (tab === 'verhaal') renderVerhaalPanel();
  if (tab === 'telefoon') renderPhone();
  if (tab === 'settings') syncControls();
  if (tab === 'controls') renderBinds();
  focusEl(root.querySelector(`[data-subtab="${next}"][data-of="${tab}"]`));
}

// Q/E in a section whose tabs the section draws itself (Garage, Prestaties).
function cycleOwnTabs(dir) {
  const p = activePanel();
  const tabs = p ? [...p.querySelectorAll('[role="tab"]')].filter((t) => t.getClientRects().length) : [];
  if (tabs.length < 2) return false;
  const i = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const next = tabs[(i + dir + tabs.length) % tabs.length];
  next.click();
  const again = p.querySelector(`[role="tab"][${Object.keys(next.dataset).map((k) => 'data-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + '="' + next.dataset[k] + '"').join('][')}]`);
  if (again) again.focus({ preventScroll: true });
  return true;
}

// --- Besturing: rebinding keys and buttons (controls.js) ------------------------
let rebinding = null;
let bindMsg = '';

function bindPane(kind, note, extra = '') {
  return `<aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">${kind === 'keys' ? 'Toetsenbord en muis' : 'Controller'}</span><h2 class="m-h2 td-h2">Toets wijzigen</h2></div>` +
    `<p>${note}</p><p class="pm-status pm-bindmsg g" role="status">${esc(bindMsg)}</p><span class="m-grow"></span>` +
    `<div class="m-acts td-acts"><button type="button" class="m-bg" data-action="binds-reset-${kind === 'keys' ? 'keys' : 'pad'}">${icon('restart')}Standaard herstellen</button></div>${extra}</aside>`;
}

function bindRowsKeys() {
  const binds = getSettings().keyBinds;
  const groups = KEY_GROUPS.map(([g, title]) => `<div class="m-gh"><span>${esc(title)}</span></div>` + KEY_ACTIONS.filter(([, , gr]) => gr === g).map(([k, desc]) => {
    const phys = physicalKey(binds, k);
    const changed = phys !== defaultKey(k);
    return `<button type="button" class="m-li pm-bind${changed ? ' pm-changed' : ''}" data-rebind-key="${esc(k)}" aria-label="${esc(desc)}: ${esc(keyName(phys))}. Kies om te wijzigen">` +
      `<span class="nm"><span class="one">${esc(desc)}</span>${changed ? `<span class="mut">Standaard: ${esc(keyName(defaultKey(k)))}</span>` : ''}</span><span class="m-kc" data-g-raw>${esc(keyName(phys))}</span></button>`;
  }).join('')).join('');
  const note = `Kies een actie en druk de nieuwe toets. Zit die toets al op iets anders, dan ruilen ze. Esc, Enter, de pijltjes en de muis liggen vast.${defaultKey('control') !== 'control' ? ' In de browser zit bukken en omlaag op C: Ctrl+W sluit daar het tabblad.' : ''}`;
  return `<div class="m-list pm-slist">${groups}</div>${bindPane('keys', note)}`;
}

function bindRowsPad() {
  const binds = getSettings().padBinds;
  const rows = PAD_REMAPPABLE.map((slot) => {
    const phys = physicalButton(binds, slot);
    const changed = phys !== slot;
    return `<button type="button" class="m-li pm-bind${changed ? ' pm-changed' : ''}" data-rebind-pad="${slot}" aria-label="${esc(PAD_SLOT_NAMES[slot])}. Kies om te wijzigen">` +
      `<span class="nm"><span class="one">${esc(slotUses(slot) || PAD_SLOT_NAMES[slot])}</span><span class="mut">${esc(PAD_SLOT_NAMES[slot])}${changed ? ' · aangepast' : ''}</span></span><span class="pm-padcap">${pg(phys)}</span></button>`;
  }).join('');
  return `<div class="m-list pm-slist">${rows}</div>${bindPane('pad', 'Kies een rij en druk op de controller de knop die het voortaan moet doen. Ze ruilen van plek. Menu/Start opent altijd het pauzemenu; de sticks liggen vast.')}`;
}

function renderBinds() {
  if (!root) return;
  const a = document.activeElement;
  const keep = a && root.contains(a) && a.dataset ? (a.dataset.rebindKey || a.dataset.rebindPad || a.dataset.action) : null;
  const k = root.querySelector('[data-of="controls"][data-sub="toetsen"]');
  const p = root.querySelector('[data-of="controls"][data-sub="knoppen"]');
  if (k && !k.hidden) k.innerHTML = bindRowsKeys();
  if (p && !p.hidden) p.innerHTML = bindRowsPad();
  if (keep) {
    const el = root.querySelector(`[data-rebind-key="${CSS.escape(keep)}"], [data-rebind-pad="${CSS.escape(keep)}"], [data-action="${CSS.escape(keep)}"]`);
    if (el) el.focus({ preventScroll: true });
  }
}

function setBindMsg(text) {
  bindMsg = text;
  for (const el of root.querySelectorAll('.pm-bindmsg')) el.textContent = text;
}

const actionWords = (c) => (KEY_ACTIONS.find(([k]) => k === c) || [c, c])[1];

function startKeyRebind(btn) {
  cancelRebind(true);
  const canon = btn.dataset.rebindKey;
  btn.classList.add('pm-waiting');
  btn.innerHTML = '<span>Druk een toets…</span>';
  setBindMsg('Druk de nieuwe toets. Esc annuleert.');
  rebinding = { kind: 'key', canon };
  input.captureKey = (raw) => {
    rebinding = null;
    if (raw === 'escape') { setBindMsg('Niets veranderd.'); renderBinds(); return; }
    if (!isBindableKey(raw)) { setBindMsg(`${keyName(raw)} kan niet, die ligt vast.`); renderBinds(); return; }
    const res = bindKey(getSettings().keyBinds, canon, raw);
    setSetting('keyBinds', res.binds);
    setBindMsg(res.swapped
      ? `${keyName(raw)} deed eerst "${actionWords(res.swapped)}"; dat zit nu op ${keyName(physicalKey(res.binds, res.swapped))}.`
      : `"${actionWords(canon)}" zit nu op ${keyName(raw)}.`);
    renderBinds();
  };
}

function startPadRebind(btn) {
  cancelRebind(true);
  const slot = btn.dataset.rebindPad;
  btn.classList.add('pm-waiting');
  btn.innerHTML = '<span>Druk een knop…</span>';
  setBindMsg('Druk op de controller de nieuwe knop. Menu/Start of Esc annuleert.');
  rebinding = { kind: 'pad', slot };
  rebinding.cancel = capturePadButton((phys) => {
    rebinding = null;
    if (phys === 'start') { setBindMsg('Niets veranderd.'); renderBinds(); return; }
    const res = bindButton(getSettings().padBinds, slot, phys);
    setSetting('padBinds', res.binds);
    setBindMsg(res.swapped ? `Geruild met: ${PAD_SLOT_NAMES[res.swapped].toLowerCase()}.` : 'Opgeslagen.');
    renderBinds();
  });
}

function cancelRebind(quiet = false) {
  if (!rebinding) return;
  if (rebinding.cancel) rebinding.cancel();
  if (input) input.captureKey = null;
  rebinding = null;
  if (!quiet) setBindMsg('Niets veranderd.');
  renderBinds();
}


function focusEl(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// the nearest ancestor of el that can scroll (the controls list is one), else the panel
function scrollerOf(el, panel) {
  for (let n = el && el.parentElement; n && n !== panel; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
  return panel;
}

function activePanel() {
  return root.querySelector(`[data-panel="${tab}"]`);
}

function focusSheet() {
  if (tab === 'map') return;
  const panel = activePanel();
  const prev = lastFocus[tab];
  if (prev && prev.isConnected && panel.contains(prev) && prev.getClientRects().length && !prev.closest('[hidden]')) return focusEl(prev);
  const list = visibleFocusables(panel).filter((el) => !(el.tagName === 'INPUT' && el.type === 'search'));
  focusEl(panel.querySelector('[role="tab"][aria-selected="true"]') || list[0] || root.querySelector(`.pm-game [data-goto="${tab}"]`));
}

// Tab/Shift+Tab stay inside the menu.
function tabFocus(dir) {
  const scopes = [root.querySelector('.pm-game'), root.querySelector('.pm-sheet-head'), activePanel()];
  const list = scopes.flatMap((s) => visibleFocusables(s));
  if (!list.length) return;
  const i = list.indexOf(document.activeElement);
  focusEl(list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length]);
}

function stepRange(el, dir) {
  const step = Number(el.step) || 1;
  const min = Number(el.min), max = Number(el.max);
  const dec = (String(el.step).split('.')[1] || '').length;
  const v = Math.min(max, Math.max(min, Number(el.value) + dir * step));
  el.value = v.toFixed(dec);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// A picker (‹ value ›): one step along its options, without wrapping.
function pickerState(pk) {
  const options = JSON.parse(pk.dataset.options);
  let cur;
  if ('presetPick' in pk.dataset) cur = currentPreset(getSettings()) || 'eigen';
  else cur = String(getSettings()[pk.dataset.setting]);
  return { options, i: Math.max(0, options.findIndex(([v]) => v === cur)) };
}

function stepPicker(pk, dir) {
  if (!pk) return;
  const { options, i } = pickerState(pk);
  const next = Math.min(options.length - 1, Math.max(0, i + dir));
  if (next === i) return;
  if ('presetPick' in pk.dataset) {
    if (options[next][0] !== 'eigen') applyPreset(options[next][0]);
  } else setSetting(pk.dataset.setting, options[next][0]);
  syncControls();
}

// "Meer opties", "Ondertitels": a folded group
function toggleFold(btn, open) {
  const body = root.querySelector(`[data-fold-body="${btn.dataset.fold}"]`);
  if (!body) return;
  const on = open == null ? body.hidden : open;
  body.hidden = !on;
  btn.setAttribute('aria-expanded', String(on));
  foldNote(btn.dataset.fold, on);
}

// Arrow keys: jump to the nearest control in that direction, within the rail
// or the sheet; left from the sheet's edge lands on the rail, right from the
// rail goes into the sheet. Nothing further down or up scrolls the panel.
function moveFocus(dir) {
  const rail = root.querySelector('.pm-game');
  const panel = activePanel();
  const head = root.querySelector('.pm-sheet-head');
  const cur = root.contains(document.activeElement) ? document.activeElement : null;
  const inRail = !!(cur && rail.contains(cur));
  const sheetList = panel && tab !== 'map' ? [...visibleFocusables(head), ...visibleFocusables(panel)] : [];
  const railList = visibleFocusables(rail);
  const vert = dir === 'up' || dir === 'down';
  if (!cur) { focusEl(sheetList[0] || railList[0]); return; }
  const pool = inRail ? railList : sheetList;
  const c = cur.getBoundingClientRect();
  const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
  let best = null, bestScore = Infinity;
  for (const b of pool) {
    if (b === cur || b.contains(cur) || cur.contains(b)) continue;
    const r = b.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
    const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
    if (along < 4) continue;
    const overlap = vert ? r.left < c.right - 4 && r.right > c.left + 4 : r.top < c.bottom - 4 && r.bottom > c.top + 4;
    if (!vert && !overlap) continue;
    const across = vert ? Math.abs(dx) : Math.abs(dy);
    // controls in the same column (or row) win over closer diagonal ones
    const score = overlap ? along + across * 0.2 : 10000 + along + across * 2;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  if (!best && !vert) {
    if (dir === 'left' && !inRail) best = rail.querySelector('[aria-current="true"]');
    if (dir === 'right' && inRail && tab !== 'map') { focusSheet(); return; }
  }
  if (!best && vert) {
    if (inRail) best = dir === 'down' ? railList[0] : railList[railList.length - 1];
    else if (panel) { const sc = scrollerOf(cur, panel); sc.scrollBy({ top: (dir === 'down' ? 1 : -1) * panel.clientHeight * 0.4, behavior: 'smooth' }); return; }
  }
  if (!best) return;
  const prevSub = cur.dataset && cur.dataset.subtab && cur.dataset.of;
  focusEl(best);
  // arrows along a row of section tabs switch the tab too
  if (prevSub && best.dataset.subtab && best.dataset.of === prevSub) {
    showSubtab(best.dataset.of, best.dataset.subtab);
    if (prevSub === 'todo') renderTodoPanel();
    if (prevSub === 'verhaal') renderVerhaalPanel();
    if (prevSub === 'telefoon') renderPhone();
  }
}

function runAction(a) {
  const confirmEl = root.querySelector('.pm-game .pm-confirm');
  if (a === 'resume') setOpen(false);
  else if (a === 'save') status(saveGame(world) ? `Opgeslagen om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : 'Opslaan mislukt');
  else if (a === 'load') {
    if (loadLatestSave(world)) setOpen(false);
    else status('Geen savegame gevonden');
  } else if (a === 'saves') {
    if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om savegames te gebruiken.'); return; }
    openSaveSlots({ mode: 'game', world, onLoad: () => setOpen(false), onClose: () => { syncSaveButtons(); const b = root.querySelector('.pm-rail-acts [data-action="saves"]'); if (b) b.focus(); } });
  } else if (a === 'restart') {
    confirmEl.hidden = false;
    syncSaveButtons();
    confirmEl.querySelector('button').focus();
  } else if (a === 'cancel') {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
  } else if (a === 'menu' || a === 'exit') {
    // save, then back to the title screen (Doorgaan) or close the app; a
    // pigeon first turns back into Tammo/Tessa so the save has a street spot
    if (world && world.pigeonMode && world.pigeonActions) world.pigeonActions.stop();
    if (world) saveGame(world);
    if (a === 'exit' && DESKTOP) DESKTOP.quit();
    else location.reload();
  } else if (a === 'pigeon-stop') {
    if (world.pigeonActions && world.pigeonActions.stop()) setOpen(false);
  } else if (a === 'job-stop') {
    if (world.sideJobActions && world.sideJobActions.stop()) setOpen(false);
  } else if (a === 'mission-abort') {
    if (world.safetyActions && world.safetyActions.abortMission()) setOpen(false);
  } else if (a === 'unstuck') {
    if (world.safetyActions && world.safetyActions.unstuck()) setOpen(false);
    else status('Even wachten tot je weer op de been bent');
  } else if (a === 'home') {
    if (world.homeActions && world.homeActions.goHome()) setOpen(false);
  } else if (a === 'pigeon-home') {
    if (world.pigeonActions && world.pigeonActions.home()) setOpen(false);
  } else if (a === 'new') {
    startNewSlot();
    location.reload();
  } else if (a === 'bench' || a === 'bench-cancel') {
    const box = root.querySelector('[data-bench-confirm]');
    box.hidden = a === 'bench-cancel';
    box.querySelector('[data-bench-text]').textContent = prestart
      ? 'Benchmark starten? Duurt ongeveer een minuut. Esc stopt.'
      : 'Benchmark starten? Je spel wordt eerst opgeslagen. Esc stopt.';
    if (!box.hidden) box.querySelector('[data-action="bench-go"]').focus();
    else root.querySelector('[data-action="bench"]').focus();
  } else if (a === 'bench-go') {
    root.querySelector('[data-bench-confirm]').hidden = true;
    // on the title screen it runs right away (startscreen.js); in a game it
    // saves and starts from a fresh load, and "Terug" continues the save
    if (prestart || !started()) {
      setOpen(false);
      window.dispatchEvent(new Event('gde-benchmark'));
    } else {
      if (world && world.pigeonMode && world.pigeonActions) world.pigeonActions.stop();
      if (world) saveGame(world);
      benchmarkViaReload();
    }
  } else if (a === 'errlog-copy') {
    copyText(errorReport()).then((ok) => errlogStatus(ok ? 'Gekopieerd. Plak het in je bericht.' : 'Kopiëren lukte niet. Opslaan als bestand kan wel in de desktopversie.'));
  } else if (a === 'errlog-save' && DESKTOP && DESKTOP.saveTextFile) {
    DESKTOP.saveTextFile(`GDE-foutrapport-${new Date().toISOString().slice(0, 10)}.txt`, errorReport())
      .then((saved) => errlogStatus(saved ? 'Opgeslagen.' : ''), () => errlogStatus('Opslaan lukte niet.'));
  } else if (a === 'errlog-clear') {
    clearErrorLog();
    errlogStatus('Gewist.');
  } else if (a === 'reset') {
    resetSettings();
    syncControls();
  } else if (a === 'binds-reset-keys' || a === 'binds-reset-pad') {
    setSetting(a === 'binds-reset-keys' ? 'keyBinds' : 'padBinds', {});
    setBindMsg('Alles staat weer op de standaard.');
    renderBinds();
  } else if (a === 'bench-apply' || a === 'bench-dismiss') {
    const res = getBenchResult();
    if (a === 'bench-apply' && res && res.rec) applyPreset(res.rec);
    dismissBenchBanner();
    syncControls();
    const cur = root.querySelector('[data-preset-pick] [data-pick="1"]');
    if (cur) cur.focus();
  }
}

function status(text) {
  root.querySelector('.pm-status').textContent = text;
}

const garageEl = () => root.querySelector('[data-panel="garage"] .pm-inner');

function garageDeliver(id) {
  const res = deliverOwnedVehicle(world, id);
  if (res.ok) { setOpen(false); return; }
  renderGaragePanel(garageEl(), world, res.text);
}

function garageFind(id) {
  const res = locateOwnedVehicle(world, id);
  if (!res.ok) { renderGaragePanel(garageEl(), world, res.text); return; }
  world.addMessage(res.text, 3);
  showTab('map');
  setMapView(res.x, res.y, 3);
}

function errlogStatus(text) {
  const el = root && root.querySelector('[data-errlog-status]');
  if (el) el.textContent = text;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* no permission: the old way */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}

function renderErrorLog() {
  const list = root && root.querySelector('[data-errlog]');
  if (!list || list.closest('[hidden]')) return;
  const log = getErrorLog().reverse();
  list.innerHTML = log.length ? log.slice(0, 25).map((e) => `<li class="${e.level === 'warn' ? 'warn' : 'err'}"><b>${e.level === 'warn' ? 'Waarschuwing' : 'Fout'}${e.count > 1 ? ` · ${e.count}×` : ''}</b> <small>${esc(e.t.slice(0, 16).replace('T', ' '))}${e.step ? ' · ' + esc(e.step) : ''}</small><span>${esc(e.msg)}</span></li>`).join('')
    : '<li class="none">Geen fouten. Mooi zo.</li>';
}
onErrorLogChange(() => renderErrorLog());

function showSubtab(of, name) {
  const subs = SUBTABS[of];
  if (SUB_ALIAS[of] && SUB_ALIAS[of][name]) name = SUB_ALIAS[of][name];
  if (!subs.some(([id]) => id === name)) name = subs[0][0];
  for (const b of root.querySelectorAll(`[data-subtab][data-of="${of}"]`)) b.setAttribute('aria-selected', String(b.dataset.subtab === name));
  for (const p of root.querySelectorAll(`[data-sub][data-of="${of}"]`)) p.hidden = p.dataset.sub !== name;
  if (pref.sub[of] !== name) { pref.sub[of] = name; savePref(); }
  const panel = root.querySelector(`[data-panel="${of}"]`);
  if (panel) panel.scrollTop = 0;
  if ((of === 'todo' && name === 'verhaal') || (of === 'verhaal' && name === 'aanwijzingen')) { markCluesSeen(); syncNavBadges(); }
  if (of === 'settings') root.querySelector('[data-bench-confirm]').hidden = true;
  if (of === 'settings' && name === 'fouten') { errlogStatus(''); renderErrorLog(); }
}

function syncDesktopControls() {
  const fs = root && root.querySelector('[data-desktop="fullscreen"]');
  if (fs && DESKTOP) fs.checked = !!DESKTOP.isFullscreen();
}

function syncControls() {
  const st = getSettings();
  const radio = root.querySelector('[data-radio-switch]');
  if (radio) radio.checked = radioIsOn();
  const shadowsAllowed = QUALITY_PRESETS[st.quality].shadows;
  syncPresets(st);
  for (const el of root.querySelectorAll('[data-setting]')) {
    const v = st[el.dataset.setting];
    if (el.classList.contains('m-pk')) {
      const { options, i } = pickerState(el);
      el.querySelector('output').textContent = options[i][1];
      const [prev, next] = el.querySelectorAll('[data-pick]');
      prev.setAttribute('aria-disabled', String(i === 0));
      next.setAttribute('aria-disabled', String(i === options.length - 1));
      continue;
    }
    if (el.type === 'checkbox') el.checked = v;
    else el.value = String(v);
    const out = el.nextElementSibling;
    if (out && out.tagName === 'OUTPUT') {
      out.textContent = el.dataset.setting === 'fov' ? `${v}°` : `${Math.round(v * 100)}%`;
    }
    if (el.type === 'range') el.style.setProperty('--fill', `${((Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min))) * 100}%`);
  }
  const shadowBox = root.querySelector('[data-setting="shadows"]');
  shadowBox.disabled = !shadowsAllowed;
  shadowBox.closest('.pm-row').classList.toggle('pm-disabled', !shadowsAllowed);
}

// The preset picker, the explanation beside it and, after a benchmark, one line
// with the preset it advises (gfxprofile.js). Only measured numbers are shown.
function syncPresets(st) {
  const cur = currentPreset(st) || 'eigen';
  const res = getBenchResult();
  const pk = root.querySelector('[data-preset-pick]');
  const { options, i } = pickerState(pk);
  pk.querySelector('output').textContent = options[i][1];
  const [prev, next] = pk.querySelectorAll('[data-pick]');
  prev.setAttribute('aria-disabled', String(i === 0));
  next.setAttribute('aria-disabled', String(i === options.length - 1));
  const pane = root.querySelector('[data-preset-pane]');
  pane.querySelector('[data-preset-name]').textContent = options[i][1];
  pane.querySelector('[data-preset-desc]').textContent = cur === 'eigen' ? 'Wat je zelf instelt: resolutie, schaduwen en zichtafstand wijken af van de drie standen.' : describePreset(cur);
  const fpsOf = (n) => (res ? (n === 'eigen' ? (res.preset ? 0 : res.avg) : res.fps[n]) : 0);
  const fps = fpsOf(cur);
  const fpsBox = pane.querySelector('[data-preset-fps]');
  fpsBox.hidden = !fps;
  fpsBox.querySelector('.pm-big').textContent = fps ? `${Math.round(fps)} fps` : '';
  const shown = options.filter(([n]) => n !== 'eigen' && fpsOf(n));
  const top = Math.max(1, ...shown.map(([n]) => fpsOf(n)));
  pane.querySelector('[data-preset-bars]').innerHTML = shown.map(([n, label]) =>
    `<div class="pm-fpsbar${n === cur ? ' on' : ''}"><span>${esc(label)}</span><span class="m-bar${n === cur ? ' on' : ''}"><i style="width:${Math.round((fpsOf(n) / top) * 100)}%"></i></span><span class="bebas">${Math.round(fpsOf(n))} fps</span></div>`).join('');
  pane.querySelector('[data-bench-note]').textContent = res ? 'Gemeten met de benchmark op deze computer.' : 'Draai de benchmark (onder Meer opties) om te zien wat elke stand haalt.';
  const ban = root.querySelector('[data-bench-banner]');
  ban.hidden = !(res && res.banner);
  if (ban.hidden) return;
  const r = Math.round;
  const was = res.preset ? `Op ${presetLabel(res.preset)}` : 'Met je eigen instellingen';
  const hitch = res.low < 30 && res.heaviest ? `, met haperingen in ‘${esc(res.heaviest.label)}’` : '';
  const then = res.rec ? ` Op ${presetLabel(res.rec)} wordt dat ongeveer ${r(res.fps[res.rec])} fps.` : ' Dat draait prima.';
  const changes = res.rec ? describeChanges(res.rec, st) : '';
  ban.innerHTML = `<span class="pm-adv-ic">${GEAR_SVG}</span><span class="pm-adv-t">${res.rec ? `Aanbevolen voor deze computer: <b>${esc(presetLabel(res.rec))}</b>` : 'Benchmark klaar: je instelling past.'}` +
    `<small class="mut">${was} haalde je computer gemiddeld ${r(res.avg)} fps${hitch}.${then}${changes ? ` Dit verandert: ${esc(changes)}.` : ''}</small></span>` +
    `${res.rec ? '<button type="button" class="m-bt" data-action="bench-apply">Gebruik advies</button><button type="button" class="m-bt" data-action="bench-dismiss">Niet nu</button>'
      : '<button type="button" class="m-bt" data-action="bench-dismiss">Sluiten</button>'}`;
}

// The contextual help buttons on Overzicht: [action, icon, label].
function helpButtons() {
  const w = world;
  if (!w) return [];
  const out = [];
  if (w.pigeonMode) {
    out.push(['pigeon-stop', icon('bird'), 'Duif-modus stoppen']);
    if (w.pigeonActions && w.pigeonActions.hasHome()) out.push(['pigeon-home', icon('home'), 'Naar huis vliegen']);
  } else if (w.homeActions && w.homeActions.canGoHome()) out.push(['home', icon('home'), 'Naar huis']);
  if (w.sideJobActions && w.sideJobActions.active()) out.push(['job-stop', icon('abort'), `Stoppen met ${w.sideJobActions.name()}`]);
  if (w.safetyActions && w.safetyActions.missionActive()) out.push(['mission-abort', icon('abort'), 'Missie afbreken']);
  out.push(['unstuck', icon('help'), 'Vastgelopen? Zet me vrij']);
  return out;
}

function renderOverviewPanel() {
  const el = root.querySelector('[data-panel="overzicht"] .pm-inner');
  try { renderOverview(el, world, helpButtons()); } catch (err) { console.error('overzicht', err); }
  const r = getDiscoveredRatio();
  const s = getSaveSummary();
  const ago = s ? Math.round((Date.now() - s.savedAt) / 60000) : -1;
  sheet.querySelector('.pm-sheet-sub').textContent = [`${storyDate(world).long} ${getClockText(world)}`.trim(), r >= 0.01 ? `${Math.round(r * 100)}% van Grunn verkend` : '',
    ago < 0 ? '' : ago < 1 ? 'net opgeslagen' : ago < 120 ? `laatst opgeslagen ${ago} min geleden` : ''].filter(Boolean).join(' · ');
}

function renderTodoPanel() {
  const panel = root.querySelector('[data-panel="todo"]');
  const view = pref.sub.todo || 'verhaal';
  try {
    renderTodo(panel, world, view);
    const sum = todoSummary(world);
    for (const [id] of SUBTABS.todo) { const c = panel.querySelector(`[data-count="${id}"]`); if (c) c.textContent = sum[id]; }
    if (tab === 'todo') sheet.querySelector('.pm-sheet-sub').textContent = sum.sub;
  } catch (err) { console.error('te doen', err); }
}

// After a choice in Overzicht or Te doen: render again and put the focus
// back on the same control (by its data attributes).
function rerenderTodo(keep) {
  if (!open) return;
  const el = keep && keep.nodeType === 1 ? keep : document.activeElement;
  const sel = el && root.contains(el) ? [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('') : '';
  if (tab === 'overzicht') renderOverviewPanel();
  else if (tab === 'todo') renderTodoPanel();
  const back = sel && activePanel().querySelector(sel);
  if (back) back.focus({ preventScroll: true });
}

function syncNavBadges() {
  let fresh = false;
  try { fresh = getStoryJournal().found.some((c) => c.isNew); } catch (e) { /* story not ready */ }
  const nav = root.querySelector('[data-goto="todo"]');
  if (nav) nav.toggleAttribute('data-new', fresh);
  const sub = root.querySelector('[data-of="todo"][data-subtab="verhaal"]');
  if (sub) sub.toggleAttribute('data-new', fresh);
  const met = anyFresh();
  const vNav = root.querySelector('[data-goto="verhaal"]');
  if (vNav) vNav.toggleAttribute('data-new', fresh || met);
  const vPeople = root.querySelector('[data-of="verhaal"][data-subtab="personages"]');
  if (vPeople) vPeople.toggleAttribute('data-new', met);
  const vClues = root.querySelector('[data-of="verhaal"][data-subtab="aanwijzingen"]');
  if (vClues) vClues.toggleAttribute('data-new', fresh);
  const unreadN = world ? phoneUnread(world) : 0;
  const unread = unreadN > 0;
  const pNav = root.querySelector('[data-goto="telefoon"]');
  if (pNav) pNav.toggleAttribute('data-new', unread);
  const setN = (id, text, label) => { const n = root.querySelector(`[data-n="${id}"]`); if (n) { n.textContent = text; if (label) n.setAttribute('aria-label', label); else n.removeAttribute('aria-label'); } };
  setN('telefoon', unread ? String(unreadN) : '', unread ? `${unreadN} ongelezen` : '');
  // unseen achievements: a quiet dot on the rail, never a HUD notice (#168)
  const aNav = root.querySelector('[data-goto="prestaties"]');
  if (aNav) aNav.toggleAttribute('data-new', unseenAchievementCount() > 0);
  setN('todo', fresh ? 'nieuw' : '');
  setN('verhaal', fresh || met ? 'nieuw' : '');
  const pSub = root.querySelector('[data-of="telefoon"][data-subtab="berichten"]');
  if (pSub) pSub.toggleAttribute('data-new', unread);
}

function renderPhone() {
  const panel = root.querySelector('[data-panel="telefoon"]');
  try {
    renderPhonePanel(panel, world, pref.sub.telefoon || 'contacten');
    const n = phoneUnread(world);
    const c = panel.querySelector('[data-count="berichten"]');
    if (c) c.textContent = n ? String(n) : '';
    if (tab === 'telefoon') sheet.querySelector('.pm-sheet-sub').textContent = `${PHONE_NAME} · ${n ? `${n} ongelezen` : 'geen nieuwe berichten'}`;
  } catch (err) { console.error('telefoon', err); }
  syncNavBadges();
}

function renderVerhaalPanel() {
  const panel = root.querySelector('[data-panel="verhaal"]');
  try {
    renderVerhaal(panel, pref.sub.verhaal || 'personages');
    if (tab === 'verhaal') sheet.querySelector('.pm-sheet-sub').textContent = verhaalSummary();
  } catch (err) { console.error('verhaal', err); }
  syncNavBadges();
}

function syncSaveButtons() {
  if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om op te slaan; je poepscore gaat mee in je savegame.'); return; }
  const saved = hasSave();
  for (const b of root.querySelectorAll('[data-action="load"]')) b.disabled = !saved;
  const s = getSaveSummary();
  if (s && !root.querySelector('.pm-status').textContent) {
    const d = new Date(s.savedAt);
    status(`Laatst opgeslagen: ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`);
  }
}

function syncRail() {
  const pigeon = !!(world && world.pigeonMode);
  for (const b of root.querySelectorAll('.pm-rail-acts [data-action="save"], .pm-rail-acts [data-action="saves"]')) b.disabled = pigeon;
  root.querySelector('.pm-game .pm-confirm').hidden = true;
  root.querySelector('.pm-status').textContent = '';
  syncSaveButtons();
}

function refreshInfo() {
  if (!world) return;
  const c = world.pigeonMode ? 'Duif' : world.player.character === 'anita' ? 'Tessa' : 'Tammo';
  // the rail's date line: the story day and the clock
  const when = [storyDate(world).long, getClockText(world)].filter(Boolean).join(' · ');
  for (const el of root.querySelectorAll('[data-info="when"]')) el.textContent = prestart ? '' : when;
  root.dataset.who = c;
}

export function pauseMenuTab() {
  return open ? tab : null;
}

// The sheet's subtitle for the garage and prestaties comes from their own
// heading (hidden in the sheet, the sheet title says it already).
function syncSheetSub() {
  const subEl = sheet.querySelector('.pm-sheet-sub');
  if (tab === 'garage' || tab === 'prestaties') {
    const s = activePanel().querySelector('.pm-inner');
    if (s && s.dataset.sub) subEl.textContent = s.dataset.sub;
  }
}

function hintHtml([keys, label, action], pad, back) {
  if (pad && keys.every((k) => k in PAD_KEYS && PAD_KEYS[k] === null)) return '';
  const caps = keys.map((k) => {
    if (pad && k in PAD_KEYS) { const slot = PAD_KEYS[k]; return slot ? pg(slot) : ''; }
    return `<span class="m-kc">${esc(k)}</span>`;
  }).join('');
  const text = label === BACK ? back : (pad && PAD_LABEL[label]) || label;
  return `<button type="button" class="m-hint" tabindex="-1"${action ? ` data-hint="${action}"` : ''}>${caps}<span>${esc(text)}</span></button>`;
}

function syncFooter() {
  if (!root) return;
  const pad = isPadActive();
  const back = prestart ? 'terug naar het hoofdmenu' : origin !== 'home' ? 'doorgaan' : 'terug';
  let hints = HINTS[tab] || HINTS.overzicht;
  if (prestart) hints = hints.map(([k, l, a]) => [k, l, a === 'resume' ? 'back' : a]);
  root.querySelector('.pm-footer').innerHTML = hints.map((h) => hintHtml(h, pad, back)).join('');
}

function showTab(name, how) {
  const ids = sectionIds();
  if (name === 'game' || name === 'missions') name = name === 'game' ? HOME : 'todo';
  if (name === 'jobs') { pref.sub.todo = 'alles'; name = 'todo'; }
  if (!ids.includes(name)) name = prestart ? 'settings' : HOME;
  if (how) origin = how;
  const prev = tab;
  tab = name;
  root.dataset.activeTab = name;
  for (const b of root.querySelectorAll('.pm-game [data-goto]')) {
    b.setAttribute('aria-current', String(b.dataset.goto === name));
    b.hidden = !ids.includes(b.dataset.goto);
  }
  for (const p of root.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
  if (world) setMapActive(world, open && name === 'map');
  if (name !== 'garage') disposeGarageViewer();
  if (name !== 'verhaal') disposeVerhaalViewer();
  syncFooter();
  root.querySelector('#pm-title').textContent = prestart ? 'Menu' : 'Pauze';
  syncNavBadges();
  const [, label, hint] = sectionOf(name);
  sheet.querySelector('.pm-sheet-title').textContent = label;
  sheet.querySelector('.pm-sheet-sub').textContent = SHEET_NOTE[name] || hint;
  root.querySelector('[data-action="reset"]').hidden = name !== 'settings';
  if (prev !== name) {
    sheet.classList.remove('pm-enter', 'pm-swap');
    void sheet.offsetWidth;
    sheet.classList.add('pm-swap');
  }
  if (!prestart && name !== HOME && pref.last !== name) { pref.last = name; savePref(); }
  if (name === 'map') {
    const r = getDiscoveredRatio();
    sheet.querySelector('.pm-sheet-eb').hidden = r < 0.01;
    if (r >= 0.01) sheet.querySelector('.pm-sheet-eb').textContent = `${Math.round(r * 100)}% van Grunn verkend`;
  } else sheet.querySelector('.pm-sheet-eb').hidden = true;
  if (name === HOME) renderOverviewPanel();
  if (name === 'todo') { showSubtab('todo', pref.sub.todo || 'verhaal'); renderTodoPanel(); }
  if (name === 'spullen') renderSpullenPanel();
  if (name === 'telefoon') { showSubtab('telefoon', pref.sub.telefoon || 'contacten'); renderPhone(); }
  if (name === 'garage') { renderGaragePanel(garageEl(), world); syncSheetSub(); }
  if (name === 'verhaal') { showSubtab('verhaal', pref.sub.verhaal || 'personages'); renderVerhaalPanel(); }
  if (name === 'streken') { if (prev !== 'streken') resetCheatsPanel(); renderCheats(); }
  if (name === 'fotos') renderFotoPanel(root.querySelector('[data-panel="fotos"] .pm-inner'));
  if (name === 'samen') renderSamenPanel(root.querySelector('[data-panel="samen"] .pm-inner'), world);
  if (name === 'prestaties') { renderAchievementsPanel(root.querySelector('[data-panel="prestaties"] .pm-inner')); syncSheetSub(); }
  if (name === 'controls') { const q = root.querySelector('[data-controls-search]'); q.value = ''; filterControls(''); showSubtab('controls', pref.sub.controls || 'toetsen'); bindMsg = ''; renderBinds(); }
  if (prev === 'controls' && name !== 'controls') cancelRebind();
  if (name === 'settings') { showSubtab('settings', pref.sub.settings || 'video'); syncControls(); syncDesktopControls(); }
  if (prev !== name) { const p = activePanel(); if (p) p.scrollTop = 0; }
}

// Opens the menu on a section ('overzicht' by default); with { prestart: true }
// only Instellingen and Besturing (start screen). openPauseMenu('todo', { select })
// opens Te doen on one item.
export function openPauseMenu(name = HOME, opts = {}) {
  if (opts.prestart) prestart = { onClose: opts.onClose || null };
  if (opts.sub && SUBTABS[name]) pref.sub[name] = opts.sub;
  if (opts.select) selectTodo(opts.select);
  if (opts.view) pref.sub.todo = opts.view;
  if (opts.thread) { selectPhoneThread(opts.thread); pref.sub.telefoon = 'berichten'; }
  setOpen(true, name, 'direct');
}

export function closePauseMenu() {
  setOpen(false);
}

function setOpen(value, name = HOME, how = 'direct') {
  if (!root) return;
  if (value && !started() && !prestart) return;
  if (open === value) {
    if (value) { showTab(name, how); focusSheet(); }
    return;
  }
  open = value;
  setPauseMenuOpen(value);
  if (open && isShopOpen()) closeShopMenu();
  // audio.js muffles the world and the radio behind the unfolded phone
  if (world) world.menuMuffle = open && !prestart;
  root.classList.toggle('visible', open);
  root.classList.toggle('prestart', !!prestart);
  if (input) input.reset();
  if (open) {
    tab = null;
    refreshInfo();
    syncRail();
    showTab(name, how);
    if (tab === HOME) focusEl(root.querySelector('[data-action="resume"]'));
    else focusSheet();
  } else {
    if (world) setMapActive(world, false);
    disposeGarageViewer();
    disposeVerhaalViewer();
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    const p = prestart;
    prestart = null;
    root.classList.remove('prestart');
    if (p && p.onClose) p.onClose();
  }
}
