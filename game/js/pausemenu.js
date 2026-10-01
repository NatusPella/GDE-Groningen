// The pause menu: one overlay over the paused game. Esc opens the pause card
// (level "home"); every section (Kaart, Missies, Garage, Prestaties,
// Instellingen, Besturing) opens as a sheet beside it while the card turns
// into the section rail. Esc/Backspace go back one level, then close.
import { getSettings, setSetting, resetSettings, QUALITY_PRESETS } from './settings.js';
import { mountMapView, setMapActive, setMapCloseHandler, setMapView, getDiscoveredRatio } from './mapview.js';
import { getMissionList, trackMission } from './missions.js';
import { getStoryView, skipCurrent, getStoryJournal, markCluesSeen } from './story.js';
import { saveGame, hasSave, loadLatestSave, clearSave, getSaveSummary } from './savegame.js';
import { getClockText } from './hud_panel.js';
import { isCinematicActive } from './cinematics.js';
import { renderAchievementsPanel, missionRecordHTML } from './achievementsui.js';
import { getSideJobList } from './sidejobs.js';
import { setUserWaypoint } from './routing.js';
import { renderGaragePanel, selectGarageVehicle, disposeGarageViewer } from './garageui.js';
import { deliverOwnedVehicle, locateOwnedVehicle } from './ownedvehicles.js';
import { isShopOpen, closeShopMenu } from './shopui.js';
import { benchmarkViaReload } from './trailer.js';
import { glyphHtml } from './prompts.js';
import { getUiScale } from './uiscale.js';
import { DEV } from './devflags.js';

// Running inside the desktop app (desktop/preload.js): window mode + quit.
const DESKTOP = typeof window !== 'undefined' && window.gteDesktop && window.gteDesktop.isDesktop ? window.gteDesktop : null;

// Besturing: [alternatives, description]; an alternative is one token or a
// combo joined with '+' (tokens as glyphHtml in prompts.js takes them).
const CONTROL_GROUPS = [
  ['lopen', 'Lopen', [
    [['WASD'], 'Lopen en draaien'],
    [['MOUSE'], 'Camera draaien; laag houden om omhoog te kijken'],
    [['SHIFT'], 'Rennen (vasthouden)'],
    [['SPACE'], 'Springen'],
    [['CTRL'], 'Bukken'],
    [['E', 'F'], 'Instappen, winkel in, praten, bijbaantje beginnen'],
    [['E'], 'Bij een duivenbord: word een duif'],
    [['K'], 'Kusje geven aan Tammo of Anita'],
  ]],
  ['rijden', 'Rijden', [
    [['WASD'], 'Gas, remmen en achteruit, sturen'],
    [['SPACE'], 'Handrem'],
    [['SHIFT'], 'Op de fiets: even flink doortrappen'],
    [['E', 'F'], 'Uitstappen'],
    [['Q', 'WHEEL'], 'Achterom kijken (vasthouden; middelste muisknop)'],
    [['H'], 'Toeteren'],
    [['L'], 'Zwaailicht en sirene (politieauto, ambulance)'],
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
    [['W', 'S'], 'Stijgen en dalen; landen: laag en langzaam boven een vlak stuk'],
    [['A', 'D'], 'Draaien (de muis draait ook)'],
    [['ARROWS'], 'Vooruit, achteruit en opzij vliegen'],
    [['SHIFT'], 'Boost: vol gas vooruit'],
    [['SPACE'], 'Stilhangen: afremmen tot je stil in de lucht hangt'],
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
    [['T'], 'Telefoon'],
    [['M'], 'Kaart'],
    [['ESC'], 'Pauzemenu; in het menu: terug'],
    [['ARROWS'], 'In het menu: kiezen, Enter: ok'],
    [['Q', 'E'], 'In het menu: vorige of volgende sectie'],
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
const MOUSE_WORDS = { LMB: 'linkermuisknop klik', RMB: 'rechtermuisknop', MOUSE: 'muis', WHEEL: 'scrollwiel middelste muisknop', SPACE: 'spatie', CTRL: 'ctrl control', SHIFT: 'shift', ESC: 'esc escape', WASD: 'w a s d wasd', ARROWS: 'pijltjes pijltjestoetsen' };

function controlsHtml() {
  const alt = (a) => a.split('+').map((t) => glyphHtml(t)).join('<span class="pm-k-sep">+</span>');
  return CONTROL_GROUPS.map(([id, title, rows]) => `<section class="pm-cgroup" data-cgroup="${id}" tabindex="0" aria-label="${esc(title)}">` +
    `<h3><svg class="pm-ic" viewBox="0 0 24 24" aria-hidden="true">${GROUP_ICONS[id]}</svg>${esc(title)}</h3>` +
    rows.map(([keys, desc]) => {
      const words = keys.flatMap((k) => k.split('+')).map((t) => MOUSE_WORDS[t] || t).join(' ');
      return `<div class="pm-crow" data-search="${esc((title + ' ' + desc + ' ' + words).toLowerCase())}">` +
        `<span class="pm-ckeys">${keys.map(alt).join('<span class="pm-k-sep">/</span>')}</span><span class="pm-cdesc">${esc(desc)}</span></div>`;
    }).join('') + '</section>').join('');
}

function filterControls(q) {
  const panel = root.querySelector('[data-panel="controls"]');
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let any = false;
  for (const g of panel.querySelectorAll('.pm-cgroup')) {
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
  missions: '<path d="M6 3v18M6 4h12l-2.5 4L18 12H6"/>',
  garage: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
  prestaties: '<path d="M7 3h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M12 11v5M8 20h8l-1-4H9z"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  controls: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10"/>',
};
const icon = (id, cls = 'pm-ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id] || ''}</svg>`;
const qBtn = (action, ic, label, cls = 'pm-secondary', extra = '') =>
  `<button type="button" class="${cls}" data-action="${action}"${extra}>${icon(ic)}<span>${label}</span></button>`;

// [id, label, hint under the title in the sheet]
const SECTIONS = [
  ['map', 'Kaart', 'Zet een bestemming of zoek een plek'],
  ['missions', 'Missies', 'Verhaal, missies en bijbaantjes'],
  ['garage', 'Garage', 'Jouw voertuigen'],
  ['prestaties', 'Prestaties', 'Blijven bewaard, ook bij een nieuw spel'],
  ['settings', 'Instellingen', 'Wijzigingen worden meteen bewaard'],
  ['controls', 'Besturing', 'Alle toetsen, per situatie'],
];
const PRESTART_SECTIONS = ['settings', 'controls'];
const SUBTABS = {
  missions: [['verhaal', 'Verhaal'], ['missies', 'Missies'], ['jobs', 'Bijbaantjes']],
  settings: [['sound', 'Geluid'], ['video', 'Beeld'], ['camera', 'Camera & muis'], ['display', 'Weergave']],
};

// Extra sections in Missies › Verhaal (e.g. a story journal):
// addMissionsSection({ id, title, sub, render(el, world) }); render runs each
// time the section opens, el is an empty card-grid container.
const extraSections = [];
export function addMissionsSection(sec) {
  const i = extraSections.findIndex((x) => x.id === sec.id);
  if (i >= 0) extraSections[i] = sec; else extraSections.push(sec);
  if (root && open && tab === 'missions') renderMissions();
}

const FOOTERS = {
  map: `<b>Klik</b> bestemming · <b>Rechtsklik / Del</b> wissen · ${DEV ? '<b>Shift+klik</b> teleporteren · ' : ''}<b>Scroll / + −</b> zoomen · <b>WASD</b> schuiven · <b>Spatie</b> centreren`,
  missions: '<b>Kies</b> een missie voor de route · geklaarde missies kun je opnieuw spelen voor een betere medaille',
  garage: '<b>Laten afleveren</b> zet je voertuig om de hoek, buiten beeld · gekochte voertuigen blijven voorgoed van jou',
  prestaties: 'Prestaties blijven bewaard, ook als je een nieuw spel begint',
  settings: 'Instellingen worden automatisch bewaard',
  controls: '<b>/</b> zoeken · <b>Toetshints</b> aan of uit onder Instellingen › Weergave',
  game: '',
};

const TYPE_LABEL = { deliver: 'Bezorgen', rampage: 'Chaos', checkpoint: 'Race', fatbike: 'Overleven', boat: 'Varen' };
const STATUS_LABEL = { actief: 'Actief', volgende: 'Volgende', geklaard: 'Opnieuw spelen', open: 'Open' };

let root = null;
let sheet = null;
let open = false;
let input = null;
let world = null;
// 'game' is the pause card, anything else a section
let tab = 'game';
// how the open section was reached: 'home' (from the card: Esc goes back to
// it) or 'direct' (M, the phone: Esc closes the menu)
let origin = 'home';
let prestart = null;
const lastFocus = {};

const PREF_KEY = 'gte-menu-v1';
const pref = loadPref();
function loadPref() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return { last: typeof p.last === 'string' ? p.last : 'map', sub: p.sub && typeof p.sub === 'object' ? p.sub : {} };
  } catch (e) {
    return { last: 'map', sub: {} };
  }
}
function savePref() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) { /* private mode: keep it in memory */ }
}

export function isPauseMenuOpen() {
  return open;
}

const started = () => document.body.classList.contains('game-started');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sectionIds = () => (prestart ? PRESTART_SECTIONS : SECTIONS.map(([id]) => id));
const sectionOf = (id) => SECTIONS.find(([s]) => s === id);
const key = (k) => `<span class="hud-key">${k}</span>`;

function subtabsHtml(of, label) {
  return `<nav class="pm-subtabs" role="tablist" aria-label="${label}">` + SUBTABS[of].map(([id, text]) =>
    `<button type="button" role="tab" data-of="${of}" data-subtab="${id}" aria-selected="false">${esc(text)}<small data-count="${id}"></small></button>`).join('') + '</nav>';
}

function slider(k, label, min = 0, max = 1, step = 0.05) {
  return `<label class="pm-row"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" data-setting="${k}"><output></output></label>`;
}

function toggle(k, label, note = '') {
  return `<label class="pm-row"><span>${label}${note ? `<small>${note}</small>` : ''}</span><input type="checkbox" data-setting="${k}"></label>`;
}

function segmented(k, label, options) {
  return `<div class="pm-row"><span id="pm-l-${k}">${label}</span><div class="pm-seg" role="radiogroup" aria-labelledby="pm-l-${k}" data-setting="${k}">` +
    options.map(([v, text]) => `<button type="button" role="radio" data-value="${v}" aria-checked="false">${text}</button>`).join('') + '</div></div>';
}

function settingsHtml() {
  return `${subtabsHtml('settings', 'Instellingen')}
    <div data-of="settings" data-sub="sound" class="pm-group">
      ${slider('masterVolume', 'Hoofdvolume')}
      ${slider('musicVolume', 'Muziek')}
      ${slider('sfxVolume', 'Effecten')}
      ${slider('voiceVolume', 'Stemmen')}
      <p class="pm-note">Muziek is G-Music en de titelsong, stemmen zijn Tammo, Anita, de politie en de mensen op straat.</p>
    </div>
    <div data-of="settings" data-sub="video" class="pm-group" hidden>
      ${segmented('quality', 'Kwaliteit', Object.keys(QUALITY_PRESETS).map((q) => [q, q[0].toUpperCase() + q.slice(1)]))}
      ${DESKTOP ? '<label class="pm-row"><span>Volledig scherm<small>F11 of Alt+Enter</small></span><input type="checkbox" data-desktop="fullscreen"></label>' : ''}
      ${toggle('shadows', 'Schaduwen')}
      ${segmented('drawDistance', 'Zichtafstand', [['kort', 'Kort'], ['normaal', 'Normaal'], ['ver', 'Ver']])}
      <div class="pm-row"><span>Benchmark<small>Test hoe soepel Grunn draait op deze computer (±1,5 min)</small></span><button type="button" class="pm-secondary pm-small" data-action="bench">Benchmark draaien</button></div>
      <div class="pm-confirm pm-ok" data-bench-confirm hidden>
        <p data-bench-text></p>
        <div class="pm-confirm-row"><button type="button" class="pm-primary pm-small" data-action="bench-go">Starten</button>
        <button type="button" class="pm-secondary pm-small" data-action="bench-cancel">Annuleren</button></div>
      </div>
    </div>
    <div data-of="settings" data-sub="camera" class="pm-group" hidden>
      ${slider('fov', 'Beeldhoek', 50, 90, 1)}
      ${slider('cameraDistance', 'Camera-afstand', 0.8, 1.6, 0.05)}
      ${slider('mouseSensitivity', 'Muisgevoeligheid', 0.3, 2.5, 0.05)}
      ${toggle('invertY', 'Omhoog/omlaag omkeren')}
      ${toggle('autoAim', 'Automatisch richten', 'Rechtermuisknop zoekt zelf het beste doelwit')}
    </div>
    <div data-of="settings" data-sub="display" class="pm-group" hidden>
      ${slider('brightness', 'Helderheid', 0.6, 1.6, 0.05)}
      ${slider('uiScale', 'Grootte interface', 0.8, 1.5, 0.05)}
      ${toggle('showMinimap', 'Minimap')}
      ${toggle('showHints', 'Toetshints')}
      ${toggle('showFog', 'Verkende gebieden op de kaart')}
      ${toggle('cinematicMoments', 'Filmische momenten', 'Korte filmpjes bij bezienswaardigheden, nieuwe wijken, crashes en vijf sterren. Intro’s, missies en de filmcamera (V) staan altijd aan.')}
      ${segmented('drunkFx', 'Dronken effecten', [['aan', 'Aan'], ['mild', 'Mild'], ['uit', 'Uit']])}
      ${toggle('gore', 'Bloed en ledematen', 'Uit: aangereden en neergeschoten mensen vallen gewoon om, zonder bloed of rondvliegende ledematen.')}
    </div>
    <div class="pm-reset"><button type="button" class="pm-secondary pm-small" data-action="reset">${icon('restart')}<span>Standaardinstellingen</span></button></div>`;
}

export function initPauseMenu(w) {
  world = w;
  input = w.input;
  root = document.createElement('div');
  root.id = 'pause-menu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pm-title');
  root.dataset.level = 'home';
  root.innerHTML = `
    <div class="pm-stage">
      <div class="pm-rail">
        <div class="pm-inner pm-game" aria-label="Pauzemenu">
          <div class="pm-q-head"><b id="pm-title">Pauze</b><span class="pm-q-info"><span data-info="char"></span><span data-info="clock"></span><span data-info="money"></span></span></div>
          ${qBtn('resume', 'resume', 'Doorgaan', 'pm-primary pm-q-main', ' aria-keyshortcuts="Escape"')}
          ${qBtn('save', 'save', 'Opslaan', 'pm-secondary pm-half pm-home')}
          ${qBtn('load', 'load', 'Laden', 'pm-secondary pm-half pm-home', ' title="Laatste save laden"')}
          <p class="pm-status pm-home" role="status"></p>
          <span class="pm-q-label pm-nav-label">Menu</span>
          ${SECTIONS.map(([id, label]) => `<button type="button" class="pm-secondary pm-half pm-q-nav" data-goto="${id}" aria-current="false">${icon(id)}<span>${label}</span>${id === 'map' ? key('M') : ''}</button>`).join('')}
          <span class="pm-q-label pm-home">Hulp</span>
          ${qBtn('pigeon-stop', 'bird', 'Duif-modus stoppen', 'pm-secondary pm-home', ' data-pigeon hidden')}
          ${qBtn('pigeon-home', 'home', 'Naar huis vliegen', 'pm-secondary pm-home', ' data-pigeon hidden')}
          ${qBtn('job-stop', 'abort', 'Bijbaantje stoppen', 'pm-secondary pm-home', ' hidden')}
          ${qBtn('mission-abort', 'abort', 'Missie afbreken', 'pm-secondary pm-home', ' hidden')}
          ${qBtn('home', 'home', 'Naar huis', 'pm-secondary pm-home', ' hidden')}
          ${qBtn('unstuck', 'help', 'Vastgelopen? Zet me vrij', 'pm-secondary pm-home', ' data-both')}
          <span class="pm-q-label pm-home">Spel</span>
          ${qBtn('restart', 'restart', 'Opnieuw beginnen', 'pm-secondary pm-half pm-home')}
          ${qBtn('menu', 'menu', 'Hoofdmenu', 'pm-secondary pm-half pm-home', ' data-both')}
          ${DESKTOP ? qBtn('exit', 'exit', 'Spel afsluiten', 'pm-danger pm-home', ' data-both') : ''}
          <div class="pm-confirm pm-home" hidden>
            <p>Opnieuw beginnen? Alles sinds je laatste save gaat verloren.</p>
            <button type="button" class="pm-secondary" data-action="load">Laatste save laden</button>
            <button type="button" class="pm-danger" data-action="new">Nieuw spel (save wissen)</button>
            <button type="button" class="pm-secondary" data-action="cancel">Annuleren</button>
          </div>
        </div>
      </div>
      <section class="pm-sheet" aria-labelledby="pm-sheet-title">
        <header class="pm-sheet-head">
          <button type="button" class="pm-back" data-back data-action="back" aria-label="Terug">${icon('back')}${key('Esc')}</button>
          <span class="pm-sheet-ic"></span>
          <div class="pm-sheet-titles"><h2 class="pm-sheet-title" id="pm-sheet-title"></h2><small class="pm-sheet-sub"></small></div>
          <div class="pm-cycle">
            <button type="button" data-cycle="-1" aria-label="Vorige sectie">${key('Q')}<span></span></button>
            <button type="button" data-cycle="1" aria-label="Volgende sectie"><span></span>${key('E')}</button>
          </div>
        </header>
        <div class="pm-sheet-body">
          <section data-panel="map" class="pm-panel pm-map" hidden></section>
          <section data-panel="missions" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide">
            ${subtabsHtml('missions', 'Missies')}
            <div data-of="missions" data-sub="verhaal">
              <h2>Nu in het verhaal <small data-info="story"></small></h2>
              <div class="pm-missions pm-story"></div>
              <h2>Wat weten we? <small data-info="clues"></small></h2>
              <div class="pm-missions pm-clues"></div>
              <div class="pm-extra"></div>
            </div>
            <div data-of="missions" data-sub="missies" hidden>
              <h2>Missies <small data-info="progress"></small></h2>
              <div class="pm-missions pm-mlist"></div>
            </div>
            <div data-of="missions" data-sub="jobs" hidden>
              <h2>Bijbaantjes <small>geld verdienen tussendoor</small></h2>
              <div class="pm-missions pm-jobs"></div>
            </div>
          </div></section>
          <section data-panel="garage" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-garage"></div></section>
          <section data-panel="prestaties" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-ach"></div></section>
          <section data-panel="settings" class="pm-panel pm-col" hidden><div class="pm-inner pm-narrow">${settingsHtml()}</div></section>
          <section data-panel="controls" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-cinner">
            <div class="pm-csearch">${icon('search')}
              <input type="search" data-controls-search placeholder="Zoek een toets of actie, bijv. toeter, duif of Q" aria-label="Zoek in de besturing" autocomplete="off" spellcheck="false"></div>
            <div class="pm-cgrid">${controlsHtml()}</div>
            <p class="pm-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p>
          </div></section>
        </div>
      </section>
    </div>
    <footer class="pm-footer"><span class="pm-foot-tab"></span><span class="pm-foot-keys"></span></footer>`;
  document.body.appendChild(root);
  sheet = root.querySelector('.pm-sheet');

  mountMapView(root.querySelector('[data-panel="map"]'));
  setMapCloseHandler(() => setOpen(false));

  for (const type of ['mousedown', 'mouseup', 'wheel']) root.addEventListener(type, (e) => e.stopPropagation());

  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) return enterSection(go.dataset.goto);
    const cyc = e.target.closest('[data-cycle]');
    if (cyc) return cycleSection(Number(cyc.dataset.cycle));
    const st = e.target.closest('[data-subtab]');
    if (st) return showSubtab(st.dataset.of, st.dataset.subtab);
    const seg = e.target.closest('.pm-seg [data-value]');
    if (seg) { setSetting(seg.parentElement.dataset.setting, seg.dataset.value); syncControls(); return; }
    if (e.target.closest('[data-story-skip]')) {
      if (skipCurrent()) setOpen(false);
      else renderMissions();
      return;
    }
    const m = e.target.closest('[data-mission]');
    if (m) return chooseMission(Number(m.dataset.mission));
    const j = e.target.closest('[data-job]');
    if (j) return chooseJob(j.dataset.job);
    const gd = e.target.closest('[data-garage-deliver]');
    if (gd) return garageDeliver(gd.dataset.garageDeliver);
    const gf = e.target.closest('[data-garage-find]');
    if (gf) return garageFind(gf.dataset.garageFind);
    const gs = e.target.closest('[data-garage-select]');
    if (gs) return selectGarageVehicle(garageEl(), gs.dataset.garageSelect);
    const action = e.target.closest('[data-action]');
    if (action) runAction(action.dataset.action);
  });
  root.addEventListener('input', (e) => {
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

  // a narrow sheet stacks the garage's list and viewer
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => sheet.toggleAttribute('data-narrow', sheet.clientWidth / getUiScale() < 860)).observe(sheet);
  }

  // F11 / the macOS green button also switch modes: keep the checkbox right
  if (DESKTOP) DESKTOP.onFullscreenChange(() => syncDesktopControls());
  // capture: runs before the map's and the input's own key handlers, so a
  // key the menu uses (Backspace, arrows in the rail) does nothing else
  window.addEventListener('keydown', onKey, true);
  // ?stil marks an automated test session, whose tab is often hidden
  if (!new URLSearchParams(location.search).has('stil')) {
    document.addEventListener('visibilitychange', () => { if (document.hidden && started()) setOpen(true, 'game'); });
  }
}

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function consume(e) {
  e.preventDefault();
  e.stopPropagation();
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  const lower = k.length === 1 ? k.toLowerCase() : k;
  if (!open) {
    if (e.repeat || !started()) return;
    if (k === 'Escape' || (lower === 'm' && !isCinematicActive())) {
      e.preventDefault();
      setOpen(true, k === 'Escape' ? 'game' : 'map', 'direct');
    }
    return;
  }
  const t = e.target;
  // text fields (the searches) have their own keys, Escape included
  if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['range', 'checkbox'].includes(t.type)))) return;
  const dir = ARROWS[k];
  if (e.repeat && !dir) return;
  const inRail = !!(t && t.closest && t.closest('.pm-rail'));
  if (k === 'Escape' || k === 'Backspace') {
    consume(e);
    const back = tab !== 'game' && sheet.querySelector('.pm-back');
    if (back && !prestart && origin === 'home' && !openConfirm()) back.click();
    else goBack();
  } else if (lower === 'm' && !prestart) {
    consume(e);
    if (tab === 'map') setOpen(false);
    else enterSection('map');
  } else if (lower === 'q' || lower === 'e') {
    consume(e);
    // on the card both open the section you had open last
    if (tab === 'game') enterSection(pref.last);
    else cycleSection(lower === 'q' ? -1 : 1);
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
    else if (t && t.closest && t.closest('.pm-seg') && (dir === 'left' || dir === 'right')) stepSegment(t, dir === 'right' ? 1 : -1);
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
    } else if (t.tagName === 'BUTTON') {
      // input.js cancels Space (no page scroll), which also cancels the
      // button's own click: both keys click here, once
      consume(e);
      t.click();
    }
  }
}

function openConfirm() {
  const c = root.querySelector('.pm-game .pm-confirm');
  const b = root.querySelector('[data-bench-confirm]');
  return (c && !c.hidden) || (tab === 'settings' && b && !b.hidden);
}

// Esc/Backspace: close an open confirm, then one level back, then close.
function goBack() {
  const confirmEl = root.querySelector('.pm-game .pm-confirm');
  if (!confirmEl.hidden) {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
    return;
  }
  const bench = root.querySelector('[data-bench-confirm]');
  if (tab === 'settings' && !bench.hidden) {
    bench.hidden = true;
    root.querySelector('[data-action="bench"]').focus();
    return;
  }
  if (tab !== 'game' && !prestart && origin === 'home') {
    const from = tab;
    showTab('game');
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

// Opens a section from inside the menu (card, rail, Q/E, M) and puts the
// focus in it; Esc then leads back to the pause card.
function enterSection(id) {
  if (!sectionIds().includes(id)) id = sectionIds()[0];
  showTab(id, 'home');
  focusSheet();
}

const FOCUSABLE = 'button, input, select, [tabindex]';
function visibleFocusables(scope) {
  return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[hidden]'));
}

function focusEl(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function activePanel() {
  return tab === 'game' ? null : root.querySelector(`[data-panel="${tab}"]`);
}

function focusSheet() {
  if (tab === 'game') return;
  if (tab === 'map') return;
  const panel = activePanel();
  const prev = lastFocus[tab];
  if (prev && prev.isConnected && panel.contains(prev) && prev.getClientRects().length && !prev.closest('[hidden]')) return focusEl(prev);
  const list = visibleFocusables(panel).filter((el) => !(el.tagName === 'INPUT' && el.type === 'search'));
  focusEl(panel.querySelector('[role="tab"][aria-selected="true"]') || list[0] || root.querySelector(`.pm-game [data-goto="${tab}"]`));
}

function focusDefault() {
  if (tab === 'game') focusEl(root.querySelector('[data-action="resume"]'));
  else focusSheet();
}

// Tab/Shift+Tab stay inside the menu.
function tabFocus(dir) {
  const scopes = [root.querySelector('.pm-game')];
  if (tab !== 'game') scopes.push(root.querySelector('.pm-sheet-head'), activePanel());
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

function stepSegment(el, dir) {
  const btns = [...el.closest('.pm-seg').querySelectorAll('[data-value]')];
  const i = btns.indexOf(el.closest('[data-value]'));
  const next = btns[i + dir];
  if (!next) return;
  next.click();
  next.focus();
}

// Arrow keys: jump to the nearest control in that direction, within the card
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
  if (!cur) { focusEl(tab === 'game' ? railList[0] : sheetList[0] || railList[0]); return; }
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
    if (dir === 'left' && !inRail && tab !== 'game') best = rail.querySelector('[aria-current="true"]');
    if (dir === 'right' && inRail && tab !== 'game') { focusSheet(); return; }
  }
  if (!best && vert) {
    if (inRail || tab === 'game') best = dir === 'down' ? railList[0] : railList[railList.length - 1];
    else if (panel) { panel.scrollBy({ top: (dir === 'down' ? 1 : -1) * panel.clientHeight * 0.4, behavior: 'smooth' }); return; }
  }
  if (!best) return;
  const prevSub = cur.dataset && cur.dataset.subtab && cur.dataset.of;
  focusEl(best);
  // arrows along a row of section tabs switch the tab too
  if (prevSub && best.dataset.subtab && best.dataset.of === prevSub) showSubtab(best.dataset.of, best.dataset.subtab);
}

function runAction(a) {
  const confirmEl = root.querySelector('.pm-game .pm-confirm');
  if (a === 'resume') setOpen(false);
  else if (a === 'back') goBack();
  else if (a === 'save') status(saveGame(world) ? `Opgeslagen om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : 'Opslaan mislukt');
  else if (a === 'load') {
    if (loadLatestSave(world)) setOpen(false);
    else status('Geen save gevonden');
  } else if (a === 'restart') {
    confirmEl.hidden = false;
    syncGamePanel();
    confirmEl.querySelector('button').focus();
  } else if (a === 'cancel') {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
  } else if (a === 'menu' || a === 'exit') {
    // save, then back to the title screen (Doorgaan) or close the app; a
    // pigeon first turns back into Tammo/Anita so the save has a street spot
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
    clearSave();
    location.reload();
  } else if (a === 'bench' || a === 'bench-cancel') {
    const box = root.querySelector('[data-bench-confirm]');
    box.hidden = a === 'bench-cancel';
    box.querySelector('[data-bench-text]').textContent = prestart
      ? 'Benchmark starten? Duurt ongeveer anderhalve minuut. Esc stopt.'
      : 'Benchmark starten? Je spel wordt eerst opgeslagen. Esc stopt.';
    if (!box.hidden) box.querySelector('[data-action="bench-go"]').focus();
    else root.querySelector('[data-action="bench"]').focus();
  } else if (a === 'bench-go') {
    root.querySelector('[data-bench-confirm]').hidden = true;
    // on the title screen it runs right away (startscreen.js); in a game it
    // saves and starts from a fresh load, and "Terug" continues the save
    if (prestart || !started()) {
      setOpen(false);
      window.dispatchEvent(new Event('gte-benchmark'));
    } else {
      if (world && world.pigeonMode && world.pigeonActions) world.pigeonActions.stop();
      if (world) saveGame(world);
      benchmarkViaReload();
    }
  } else if (a === 'reset') {
    resetSettings();
    syncControls();
  }
}

function status(text) {
  root.querySelector('.pm-status').textContent = text;
}

const garageEl = () => root.querySelector('[data-panel="garage"] .pm-inner');

function chooseJob(id) {
  const j = getSideJobList().find((x) => x.id === id);
  if (!j) return;
  if (!j.active) {
    setUserWaypoint(j.x, j.y, j.name);
    world.addMessage(`Route naar bijbaantje ${j.name}`, 3);
  }
  showTab('map');
  setMapView(j.x, j.y, 3);
}

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

function chooseMission(i) {
  const list = getMissionList();
  const m = list[i];
  if (!m) return;
  if (list.some((x) => x.status === 'actief') && m.status !== 'actief') {
    world.addMessage('Maak eerst je huidige missie af', 3);
    return;
  }
  if (m.status !== 'actief') {
    trackMission(world, i);
    world.addMessage(`Route naar ${m.label}`, 3);
  }
  showTab('map');
  setMapView(m.start.x, m.start.y, 3);
}

function showSubtab(of, name) {
  const subs = SUBTABS[of];
  if (!subs.some(([id]) => id === name)) name = subs[0][0];
  for (const b of root.querySelectorAll(`[data-subtab][data-of="${of}"]`)) b.setAttribute('aria-selected', String(b.dataset.subtab === name));
  for (const p of root.querySelectorAll(`[data-sub][data-of="${of}"]`)) p.hidden = p.dataset.sub !== name;
  if (pref.sub[of] !== name) { pref.sub[of] = name; savePref(); }
  const panel = root.querySelector(`[data-panel="${of}"]`);
  if (panel) panel.scrollTop = 0;
  if (of === 'missions' && name === 'verhaal') { markCluesSeen(); syncNavBadges(); }
  if (of === 'settings') root.querySelector('[data-bench-confirm]').hidden = true;
}

function syncDesktopControls() {
  const fs = root && root.querySelector('[data-desktop="fullscreen"]');
  if (fs && DESKTOP) fs.checked = !!DESKTOP.isFullscreen();
}

function syncControls() {
  const st = getSettings();
  const shadowsAllowed = QUALITY_PRESETS[st.quality].shadows;
  for (const el of root.querySelectorAll('[data-setting]')) {
    const v = st[el.dataset.setting];
    if (el.classList.contains('pm-seg')) {
      for (const b of el.querySelectorAll('[data-value]')) {
        const on = b.dataset.value === String(v);
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      }
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

const card = ({ tag = 'div', attrs = '', num, title, text, status: st, chip = '' }) =>
  `<${tag} class="pm-mission"${tag === 'button' ? ' type="button"' : ''} data-status="${st}"${attrs}>` +
  `<span class="pm-m-num">${num}</span><span class="pm-m-text"><b>${esc(title)}</b><small>${text}</small></span>` +
  (chip ? `<span class="pm-m-chip">${chip}</span>` : '') + `</${tag}>`;

function renderMissions() {
  const panel = root.querySelector('[data-panel="missions"]');
  const list = getMissionList();
  const done = list.filter((m) => m.status === 'geklaard').length;
  const jobs = getSideJobList();
  const jr = getStoryJournal();
  const sv = getStoryView();
  const count = (id, text) => { const el = panel.querySelector(`[data-count="${id}"]`); if (el) el.textContent = text; };
  count('verhaal', `${sv.done}/${sv.total}`);
  count('missies', `${done}/${list.length}`);
  count('jobs', String(jobs.length));
  panel.querySelector('[data-info="progress"]').textContent = `${done}/${list.length} geklaard`;
  panel.querySelector('[data-info="story"]').textContent = `${sv.done}/${sv.total} stappen`;
  panel.querySelector('[data-info="clues"]').textContent = `${jr.found.length}/${jr.total} ontdekt`;

  panel.querySelector('.pm-story').innerHTML = sv.end
    ? card({ num: '★', title: sv.title, text: 'Speel intussen alle missies opnieuw voor een betere medaille of verdien bij met een bijbaantje.', status: 'geklaard' })
    : card({ num: esc(sv.kind === 'mission' ? sv.id : '·'), title: sv.title, text: esc(sv.partTitle) + (sv.lead ? ' · ' + esc(sv.lead) : ''), status: 'volgende', chip: 'Volgende' }) +
      (sv.canSkip ? card({ tag: 'button', attrs: ' data-story-skip', num: '»', title: sv.skipLabel, text: sv.kind === 'mission' ? 'Je krijgt de helft van de beloning en het verhaal gaat door' : 'Handig als deze stap vastloopt: het verhaal gaat gewoon door', status: 'open', chip: 'Overslaan' }) : '');

  panel.querySelector('.pm-clues').innerHTML = (jr.why ? card({ num: '»', title: 'Waar het om draait', text: esc(jr.why), status: 'volgende' }) : '') +
    jr.found.map((c) => card({ num: c.kind === 'hart' ? '&#9829;' : '?', title: c.title, text: esc(c.text), status: c.isNew ? 'volgende' : 'geklaard', chip: c.isNew ? 'Nieuw' : '' })).join('') +
    (jr.found.length < jr.total ? card({ num: '…', title: 'Nog niet ontdekt', text: `${jr.total - jr.found.length} aanwijzingen. Speel verder om ze te vinden.`, status: 'open' }) : '');

  const extra = panel.querySelector('.pm-extra');
  extra.innerHTML = extraSections.map((x) => `<h2>${esc(x.title)}${x.sub ? ` <small>${esc(x.sub)}</small>` : ''}</h2><div class="pm-missions" data-extra="${esc(x.id)}"></div>`).join('');
  for (const x of extraSections) { try { x.render(extra.querySelector(`[data-extra="${CSS.escape(x.id)}"]`), world); } catch (err) { /* a broken section never breaks the menu */ } }

  panel.querySelector('.pm-mlist').innerHTML = [...list].sort((a, b) => a.order - b.order).map((m) => card({
    tag: 'button', attrs: ` data-mission="${m.index}"`, num: esc(m.code || String(m.index + 1)), title: m.label,
    text: `${TYPE_LABEL[m.type] || ''} · €${m.reward}${missionRecordHTML(m.index)}`, status: m.status, chip: STATUS_LABEL[m.status],
  })).join('');

  panel.querySelector('.pm-jobs').innerHTML = jobs.map((j, i) => card({
    tag: 'button', attrs: ` data-job="${esc(j.id)}"`, num: String(i + 1), title: j.name,
    text: `${esc(j.blurb)} · niveau ${j.level}: ${esc(j.title)}${j.bestStreak ? ` · record ${j.bestStreak} op rij` : ''}`,
    status: j.active ? 'actief' : j.rounds ? 'geklaard' : 'open', chip: j.active ? 'Bezig' : 'Route',
  })).join('');
  if (tab === 'missions') sheet.querySelector('.pm-sheet-sub').textContent = `${sv.done}/${sv.total} verhaalstappen · ${done}/${list.length} missies geklaard`;
}

function syncNavBadges() {
  let fresh = false;
  try { fresh = getStoryJournal().found.some((c) => c.isNew); } catch (e) { /* story not ready */ }
  const nav = root.querySelector('[data-goto="missions"]');
  if (nav) nav.toggleAttribute('data-new', fresh);
  const sub = root.querySelector('[data-of="missions"][data-subtab="verhaal"]');
  if (sub) sub.toggleAttribute('data-new', fresh);
}

function syncGamePanel() {
  if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om op te slaan; je poepscore gaat mee in je save.'); return; }
  const saved = hasSave();
  for (const b of root.querySelectorAll('[data-action="load"]')) b.disabled = !saved;
  const s = getSaveSummary();
  if (s && !root.querySelector('.pm-status').textContent) {
    const d = new Date(s.savedAt);
    status(`Laatste save: ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`);
  }
}

function syncHome() {
  const pigeon = !!(world && world.pigeonMode);
  for (const b of root.querySelectorAll('.pm-game > [data-action]')) b.hidden = b.hasAttribute('data-both') ? false : b.hasAttribute('data-pigeon') ? !pigeon : pigeon && b.dataset.action !== 'resume';
  if (pigeon) root.querySelector('[data-action="pigeon-home"]').hidden = !(world.pigeonActions && world.pigeonActions.hasHome());
  const jobStop = root.querySelector('[data-action="job-stop"]');
  const jobOn = !!(world && world.sideJobActions && world.sideJobActions.active());
  jobStop.hidden = !jobOn;
  if (jobOn) jobStop.querySelector('span').textContent = `Stoppen met ${world.sideJobActions.name()}`;
  root.querySelector('[data-action="mission-abort"]').hidden = !(world && world.safetyActions && world.safetyActions.missionActive());
  root.querySelector('[data-action="home"]').hidden = pigeon || !(world && world.homeActions && world.homeActions.canGoHome());
  root.querySelector('.pm-game .pm-confirm').hidden = true;
  root.querySelector('.pm-status').textContent = '';
  syncGamePanel();
}

function refreshInfo() {
  if (!world) return;
  const c = world.pigeonMode ? 'Duif' : world.player.character === 'anita' ? 'Anita' : 'Tammo';
  const explored = getDiscoveredRatio();
  const set = (k, text) => { for (const el of root.querySelectorAll(`[data-info="${k}"]`)) el.textContent = text; };
  set('char', c);
  set('clock', getClockText(world));
  set('money', '€' + Math.max(0, Math.floor(world.money)).toLocaleString('nl-NL'));
  for (const el of root.querySelectorAll('[data-info="clock"]')) el.title = explored ? `${Math.round(explored * 100)}% verkend` : '';
}

// The sheet's subtitle for the garage and prestaties comes from their own
// heading (hidden in the sheet, the sheet title says it already).
function syncSheetSub() {
  const subEl = sheet.querySelector('.pm-sheet-sub');
  if (tab === 'garage' || tab === 'prestaties') {
    const s = activePanel().querySelector('.pm-inner > h2:first-child small');
    if (s) subEl.textContent = s.textContent;
  }
}

function keysHtml() {
  if (prestart) return `${key('Q')}${key('E')} sectie <span class="pm-kgap"></span>${key('↑')}${key('↓')} kiezen <span class="pm-kgap"></span>${key('Esc')} terug naar het hoofdmenu`;
  if (tab === 'game') return `${key('↑')}${key('↓')} kiezen <span class="pm-kgap"></span>${key('Enter')} ok <span class="pm-kgap"></span>${key('Q')}${key('E')} secties <span class="pm-kgap"></span>${key('Esc')} doorgaan`;
  const back = origin === 'home' ? 'terug' : 'sluiten';
  if (tab === 'map') return `${key('Q')}${key('E')} sectie <span class="pm-kgap"></span>${key('M')} sluiten <span class="pm-kgap"></span>${key('Esc')} ${back}`;
  return `${key('Q')}${key('E')} sectie <span class="pm-kgap"></span>${key('↑')}${key('↓')}${key('←')}${key('→')} kiezen <span class="pm-kgap"></span>${key('Enter')} ok <span class="pm-kgap"></span>${key('Esc')} ${back}`;
}

function showTab(name, how) {
  const ids = sectionIds();
  if (name === 'jobs') { pref.sub.missions = 'jobs'; name = 'missions'; }
  if (prestart && !ids.includes(name)) name = 'settings';
  if (name !== 'game' && !ids.includes(name)) name = 'map';
  if (how) origin = how;
  const prev = tab;
  tab = name;
  const isSection = name !== 'game';
  root.dataset.level = isSection ? 'section' : 'home';
  root.dataset.activeTab = name;
  root.classList.toggle('quick', !isSection);
  for (const b of root.querySelectorAll('.pm-game [data-goto]')) {
    b.setAttribute('aria-current', String(b.dataset.goto === name));
    b.hidden = !ids.includes(b.dataset.goto);
  }
  for (const p of root.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
  if (world) setMapActive(world, open && name === 'map');
  if (name !== 'garage') disposeGarageViewer();
  root.querySelector('.pm-foot-tab').innerHTML = prestart ? '' : FOOTERS[name] || '';
  root.querySelector('.pm-foot-keys').innerHTML = keysHtml();
  root.querySelector('#pm-title').textContent = prestart ? 'Menu' : 'Pauze';
  root.querySelector('[data-action="resume"] span').textContent = prestart ? 'Terug' : 'Doorgaan';
  syncNavBadges();
  if (!isSection) {
    syncHome();
    return;
  }
  const [, label, hint] = sectionOf(name);
  sheet.querySelector('.pm-sheet-ic').innerHTML = icon(name);
  sheet.querySelector('.pm-sheet-title').textContent = label;
  sheet.querySelector('.pm-sheet-sub').textContent = hint;
  sheet.querySelector('.pm-back').setAttribute('aria-label', origin === 'home' && !prestart ? 'Terug naar het pauzemenu' : 'Menu sluiten');
  const i = ids.indexOf(name);
  const [prevBtn, nextBtn] = sheet.querySelectorAll('.pm-cycle button');
  prevBtn.querySelector('span:not(.hud-key)').textContent = sectionOf(ids[(i - 1 + ids.length) % ids.length])[1];
  nextBtn.querySelector('span:not(.hud-key)').textContent = sectionOf(ids[(i + 1) % ids.length])[1];
  sheet.querySelector('.pm-cycle').hidden = ids.length < 2;
  if (prev !== name) {
    // the sheet slides in from the card; switching sections fades the content
    sheet.classList.remove('pm-enter', 'pm-swap');
    void sheet.offsetWidth;
    sheet.classList.add(prev === 'game' ? 'pm-enter' : 'pm-swap');
  }
  if (!prestart && pref.last !== name) { pref.last = name; savePref(); }
  if (name === 'map') {
    const r = getDiscoveredRatio();
    if (r) sheet.querySelector('.pm-sheet-sub').textContent = `${Math.round(r * 100)}% van Grunn verkend · ${hint.toLowerCase()}`;
  }
  if (name === 'missions') { showSubtab('missions', pref.sub.missions || 'verhaal'); renderMissions(); }
  if (name === 'garage') { renderGaragePanel(garageEl(), world); syncSheetSub(); }
  if (name === 'prestaties') { renderAchievementsPanel(root.querySelector('[data-panel="prestaties"] .pm-inner')); syncSheetSub(); }
  if (name === 'controls') { const q = root.querySelector('[data-controls-search]'); q.value = ''; filterControls(''); }
  if (name === 'settings') { showSubtab('settings', pref.sub.settings || 'sound'); syncControls(); syncDesktopControls(); }
  if (prev !== name) { const p = activePanel(); if (p) p.scrollTop = 0; }
}

// Opens the menu on a section ('game' = the pause card); with
// { prestart: true } only Instellingen and Besturing (start screen).
export function openPauseMenu(name = 'game', opts = {}) {
  if (opts.prestart) prestart = { onClose: opts.onClose || null };
  setOpen(true, name, 'direct');
}

export function closePauseMenu() {
  setOpen(false);
}

function setOpen(value, name = 'map', how = 'direct') {
  if (!root) return;
  if (value && !started() && !prestart) return;
  if (open === value) {
    if (value) { showTab(name, how); focusDefault(); }
    return;
  }
  open = value;
  if (open && isShopOpen()) closeShopMenu();
  root.classList.toggle('visible', open);
  root.classList.toggle('prestart', !!prestart);
  if (input) input.reset();
  if (open) {
    tab = 'game';
    refreshInfo();
    showTab(name, how);
    focusDefault();
  } else {
    if (world) setMapActive(world, false);
    disposeGarageViewer();
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    const p = prestart;
    prestart = null;
    root.classList.remove('prestart');
    if (p && p.onClose) p.onClose();
  }
}
