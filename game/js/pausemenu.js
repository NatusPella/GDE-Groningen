// The pause menu: one overlay over the game (the city keeps rendering behind
// it). A fixed rail on the left (Doorgaan, the sections, Opslaan/Laden,
// Hoofdmenu) never changes shape; the sheet beside it shows one section.
// Esc opens on Overzicht; from another section Esc/Backspace go back to it,
// then close. Sections: Overzicht, Te doen (todoui.js), Verhaal
// (verhaalui.js), Kaart, Garage, Prestaties, Cheats (cheatsui.js),
// Instellingen, Besturing.
import { getSettings, setSetting, resetSettings, QUALITY_PRESETS } from './settings.js';
import { logoHtml } from './logo.js';
import { PRESET_ORDER, presetLabel, describePreset, describeChanges, currentPreset, applyPreset, getBenchResult, dismissBenchBanner, GEAR_SVG } from './gfxprofile.js';
import { mountMapView, setMapActive, setMapCloseHandler, setMapView, getDiscoveredRatio, setMapTeleport } from './mapview.js';
import { renderCheatsPanel, cheatsClick, cheatsInput, resetCheatsPanel } from './cheatsui.js';
import { skipCurrent, getStoryJournal, markCluesSeen } from './story.js';
import { saveGame, hasSave, loadLatestSave, clearSave, getSaveSummary } from './savegame.js';
import { getClockText } from './hud_panel.js';
import { storyDate } from './calendar.js';
import { isCinematicActive } from './cinematics.js';
import { renderAchievementsPanel } from './achievementsui.js';
import { renderGaragePanel, selectGarageVehicle, disposeGarageViewer } from './garageui.js';
import { deliverOwnedVehicle, locateOwnedVehicle } from './ownedvehicles.js';
import { isShopOpen, closeShopMenu } from './shopui.js';
import { benchmarkViaReload } from './trailer.js';
import { radioIsOn, setRadio } from './radio.js';
import { glyphHtml } from './prompts.js';
import { KEY_ACTIONS, KEY_GROUPS, PAD_REMAPPABLE, PAD_SLOT_NAMES, bindKey, bindButton, physicalKey, defaultKey, physicalButton, isBindableKey, keyName, slotUses } from './controls.js';
import { capturePadButton, isPadActive, onPadChange } from './gamepad.js';
import { padGlyphInner } from './glyphs.js';
import { getUiScale } from './uiscale.js';
import { DEV } from './devflags.js';
import { renderOverview, renderTodo, todoClick, todoFocus, todoEnter, todoSummary, selectTodo } from './todoui.js';
import { isPlayAheadOpen } from './todo.js';
import { renderVerhaal, verhaalClick, verhaalSummary, disposeVerhaalViewer } from './verhaalui.js';
import { anyFresh } from './characters.js';
import { renderSpullen, spullenClick, spullenFocus } from './spullen.js';
import { renderPhonePanel, phoneClick, phoneUnread, selectPhoneThread, PHONE_NAME } from './phone.js';
import { recentNotice } from './phonefeed.js';
import { storyContactCaller } from './storycontact.js';
import { getErrorLog, errorReport, clearErrorLog, onErrorLogChange } from './errorlog.js';
import { KEYS } from './storagekeys.js';
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
    [['ESC'], 'Telefoon openvouwen (pauzemenu); in het menu: terug. Bij een binnenkomend bericht of gesprek: dat gesprek'],
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
  overzicht: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  todo: '<path d="M6 3v18M6 4h12l-2.5 4L18 12H6"/>',
  verhaal: '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5zM12 6v13.5"/>',
  garage: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/>',
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
  ['telefoon', 'Telefoon', 'Bellen en berichten'],
  ['todo', 'Te doen', 'Verhaal, missies, minigames en meer'],
  ['verhaal', 'Verhaal', 'Personages en aanwijzingen'],
  ['spullen', 'Spullen', 'Alles wat je hebt'],
  ['map', 'Kaart', 'Kies een doel of zoek een plek'],
  ['garage', 'Garage', 'Jouw voertuigen'],
  ['prestaties', 'Prestaties', 'Blijven bewaard, ook bij een nieuw spel'],
  ['streken', 'Cheats', 'Een beetje vals spelen'],
  ['settings', 'Instellingen', 'Wijzigingen worden meteen bewaard'],
  ['controls', 'Besturing', 'Alle toetsen, per situatie'],
];
const PRESTART_SECTIONS = ['settings', 'controls'];
const SUBTABS = {
  todo: [['verhaal', 'Verhaal'], ['alles', 'Alles'], ['dichtbij', 'Dichtbij']],
  telefoon: [['contacten', 'Contacten'], ['berichten', 'Berichten']],
  verhaal: [['personages', 'Personages'], ['aanwijzingen', 'Aanwijzingen']],
  settings: [['sound', 'Geluid'], ['video', 'Beeld'], ['camera', 'Camera & muis'], ['controller', 'Controller'], ['display', 'Weergave'], ['a11y', 'Toegankelijk'], ['fouten', 'Foutrapport']],
  controls: [['overzicht', 'Overzicht'], ['toetsen', 'Toetsenbord'], ['knoppen', 'Controller']],
};

const FOOTERS = {
  overzicht: '<b>Enter</b> kiezen · zet iets als <b>doel</b> en de route gaat erheen, het verhaal wacht',
  todo: '<b>Klik</b> details · <b>Enter</b> zet als doel · geklaarde missies kun je opnieuw spelen voor een betere medaille · wereldeinden en geheimen verklappen nooit waar ze zijn',
  map: `<b>Klik</b> doel kiezen · <b>Rechtsklik / Del</b> doel wissen · ${DEV ? '<b>Shift+klik</b> teleporteren · ' : ''}<b>Scroll / + −</b> zoomen · <b>WASD</b> schuiven · <b>Spatie</b> naar jezelf`,
  garage: '<b>Laten afleveren</b> zet je voertuig om de hoek, buiten beeld · gekochte voertuigen blijven voorgoed van jou',
  prestaties: 'Prestaties blijven bewaard, ook als je een nieuw spel begint',
  spullen: '<b>Enter</b> details en gebruiken · voertuigen staan in <b>Garage</b>, aanwijzingen in <b>Verhaal</b>',
  telefoon: '<b>Enter</b> bellen of lezen · Henk brengt je auto, Berend heeft klussen · een binnenkomend bericht of gesprek opent hier met <b>Esc</b>',
  streken: '<b>Enter</b> aan of uit · gameplay-cheats wachten tijdens missies en filmpjes · zolang er een aan staat, staan prestaties uit',
  verhaal: 'Wie je spreekt, komt erbij · <b>Slepen</b> draait het model · niemand verklapt wat nog komt',
  settings: 'Instellingen worden automatisch bewaard',
  controls: '<b>/</b> zoeken · <b>Toetshints</b> aan of uit onder Instellingen › Weergave · indelen: kies een actie en druk de nieuwe toets',
};
// a fixed controller glyph (the menu's own buttons)
const pg = (slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
// with a controller: the footers in its buttons
const PAD_FOOTERS = {
  overzicht: () => `${pg('a')} kiezen · zet iets als <b>doel</b> en de route gaat erheen`,
  telefoon: () => `${pg('a')} bellen of lezen · ${pg('lt')}${pg('rt')} contacten of berichten`,
  todo: () => `${pg('a')} zet als doel · ${pg('lt')}${pg('rt')} weergave · geklaarde missies kun je opnieuw spelen`,
  verhaal: () => `${pg('lt')}${pg('rt')} personages of aanwijzingen`,
  map: () => `${pg('a')} doel onder het kruis · ${pg('x')} doel wissen · ${pg('lt')}${pg('rt')} zoomen · ${pg('lstick')} schuiven · ${pg('y')} naar jezelf`,
  streken: () => `${pg('a')} aan of uit · gameplay-cheats wachten tijdens missies · prestaties staan dan uit`,
  settings: () => `${pg('lt')}${pg('rt')} tabblad · ${pg('dpad')} kiezen en schuiven · wordt meteen bewaard`,
  controls: () => `${pg('lt')}${pg('rt')} tabblad · ${pg('a')} een knop of toets indelen`,
};

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

export function isPauseMenuOpen() {
  return open;
}

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
      <div class="pm-row"><span id="pm-l-radio">Radio G-Music<small>Ook met N, te voet en in elk voertuig</small></span><div class="pm-seg" role="radiogroup" aria-labelledby="pm-l-radio" data-radio>${[['on', 'Aan'], ['off', 'Uit']].map(([v, t]) => `<button type="button" role="radio" data-value="${v}" aria-checked="false">${t}</button>`).join('')}</div></div>
      <p class="pm-note">Muziek is de radio (G-Music, 's nachts Nachtstreek) en de titelsong, stemmen zijn Tammo, Tessa, de politie, de mensen op straat en de praatjes op de radio.</p>
    </div>
    <div data-of="settings" data-sub="video" class="pm-group pm-video" hidden>
      <div class="pm-bench" data-bench-banner hidden></div>
      <div class="pm-presets" role="radiogroup" aria-label="Voorinstelling">
        ${[...PRESET_ORDER, 'eigen'].map((n) => `<button type="button" role="radio" class="pm-preset" data-preset="${n}" aria-checked="false">
          <span class="pm-pill" hidden>Aanbevolen</span><b>${n === 'eigen' ? 'Eigen' : presetLabel(n)}</b><span class="pm-fps"></span>
          <small>${n === 'eigen' ? 'Wat je hieronder zelf instelt' : esc(describePreset(n))}</small></button>`).join('')}
      </div>
      <h4 class="pm-subhead">Zelf instellen</h4>
      ${segmented('quality', 'Kwaliteit<small>Licht, gloed en kleuren</small>', Object.keys(QUALITY_PRESETS).map((q) => [q, q[0].toUpperCase() + q.slice(1)]))}
      ${toggle('shadows', 'Schaduwen')}
      ${segmented('resolution', 'Resolutie', [['1', '100%'], ['0.85', '85%'], ['0.75', '75%'], ['0.6', '60%']])}
      ${toggle('autoResolution', 'Automatische resolutie', 'Resolutie en details gaan even omlaag als het beeld hapert')}
      ${segmented('drawDistance', 'Zichtafstand', [['kort', 'Kort'], ['normaal', 'Normaal'], ['ver', 'Ver'], ['heelver', 'Heel ver']])}
      ${DESKTOP ? '<label class="pm-row"><span>Volledig scherm<small>F11 of Alt+Enter</small></span><input type="checkbox" data-desktop="fullscreen"></label>' : ''}
      <div class="pm-row"><span>Benchmark<small>Test hoe soepel Grunn draait op deze computer en welke stand past (±2 min)</small></span><button type="button" class="pm-secondary pm-small" data-action="bench">Benchmark draaien</button></div>
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
    <div data-of="settings" data-sub="controller" class="pm-group" hidden>
      ${segmented('padLayout', 'Knoppen tonen als<small>Automatisch kiest wat er aangesloten is</small>', [['auto', 'Automatisch'], ['xbox', 'Xbox'], ['ps', 'PlayStation'], ['deck', 'Steam Deck']])}
      ${slider('padLookSensitivity', 'Camera met de rechterstick', 0.3, 2.5, 0.05)}
      ${toggle('rumble', 'Trillen', 'Bij klappen, schoten en botsingen, als je controller dat kan')}
      ${toggle('invertY', 'Omhoog/omlaag omkeren', 'Geldt voor de muis en de stick')}
      <div class="pm-row"><span>Knoppen indelen<small>Onder Besturing › Controller</small></span><button type="button" class="pm-secondary pm-small" data-goto-sub="controls:knoppen">Indelen</button></div>
      <p class="pm-note">Xbox-, PlayStation- en Steam Deck-controllers werken meteen. De hints in beeld wisselen vanzelf tussen toetsen en knoppen, naar wat je het laatst gebruikte.</p>
    </div>
    <div data-of="settings" data-sub="a11y" class="pm-group" hidden>
      ${segmented('subtitleSize', 'Ondertitels<small>Filmpjes, gesprekken, telefoon, radio en naamkaarten</small>', [['klein', 'Klein'], ['normaal', 'Normaal'], ['groot', 'Groot'], ['extragroot', 'Extra groot']])}
      ${toggle('subtitleBox', 'Vlak achter de ondertitels', 'Een donker vlak maakt ze makkelijker te lezen')}
      ${segmented('colorBlind', 'Kleurenblind<small>Andere kleuren voor markers, routes, de kaart en de HUD; vormen en patronen helpen altijd</small>', [['uit', 'Uit'], ['deuteranopie', 'Deuter&shy;anopie'], ['protanopie', 'Protan&shy;opie'], ['tritanopie', 'Tritan&shy;opie']])}
      ${slider('uiScale', 'Grootte interface', 0.8, 1.5, 0.05)}
      ${toggle('reduceMotion', 'Beweging beperken', 'Staat ook aan als je systeem om minder beweging vraagt.')}
    </div>
    <div data-of="settings" data-sub="display" class="pm-group" hidden>
      ${slider('brightness', 'Helderheid', 0.6, 1.6, 0.05)}
      ${slider('uiScale', 'Grootte interface', 0.8, 1.5, 0.05)}
      ${toggle('showMinimap', 'Minimap')}
      ${toggle('showHints', 'Toetshints')}
      ${toggle('onboardingTips', 'Uitleg voor nieuwe spelers', 'Korte tips, elk één keer: je eerste klus, geld en winkels, de telefoon, de kaart en Te doen')}
      ${toggle('reduceMotion', 'Beweging beperken', 'Menu’s, kaarten en tellers springen meteen naar hun nieuwe stand, zonder animatie.')}
      ${toggle('showFog', 'Verkende gebieden op de kaart')}
      ${toggle('cinematicMoments', 'Filmische momenten', 'Korte filmpjes bij bezienswaardigheden, nieuwe wijken, crashes en vijf sterren. Intro’s, missies en de filmcamera (V) staan altijd aan.')}
      ${segmented('drunkFx', 'Dronken effecten', [['aan', 'Aan'], ['mild', 'Mild'], ['uit', 'Uit']])}
      ${toggle('gore', 'Bloed en ledematen', 'Uit: aangereden en neergeschoten mensen vallen gewoon om, zonder bloed of rondvliegende ledematen.')}
    </div>
    <div data-of="settings" data-sub="fouten" class="pm-group" hidden>
      <p class="pm-note">Gaat er iets mis, dan schrijft het spel dat hier op. Alleen op dit apparaat: er wordt niets verstuurd. Wil je helpen? Kopieer het rapport en stuur het zelf mee met je melding. Er staat niets persoonlijks in: de melding, waar in de code, de versie, je verhaalstap, een paar instellingen en het soort videokaart.</p>
      <div class="pm-confirm-row pm-errlog-actions">
        <button type="button" class="pm-secondary pm-small" data-action="errlog-copy">Kopieer naar klembord</button>
        ${DESKTOP && DESKTOP.saveTextFile ? '<button type="button" class="pm-secondary pm-small" data-action="errlog-save">Opslaan als bestand</button>' : ''}
        <button type="button" class="pm-secondary pm-small" data-action="errlog-clear">Wissen</button>
      </div>
      <p class="pm-status" data-errlog-status role="status"></p>
      <ol class="pm-errlog" data-errlog></ol>
    </div>
    <div class="pm-reset"><button type="button" class="pm-secondary pm-small" data-action="reset">${icon('restart')}<span>Standaardinstellingen</span></button></div>`;
}

export function initPauseMenu(w) {
  world = w;
  input = w.input;
  if (!document.getElementById('fold-style')) {
    const link = document.createElement('link');
    link.id = 'fold-style';
    link.rel = 'stylesheet';
    link.href = new URL('./fold.css', import.meta.url).href;
    document.head.appendChild(link);
  }
  root = document.createElement('div');
  root.id = 'pause-menu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pm-title');
  root.dataset.level = 'section';
  root.innerHTML = `
    <div class="pm-fold" aria-label="${PHONE_NAME}">
    <div class="pm-statusbar" aria-hidden="true"><span class="pm-sb-l"><b data-sb="clock"></b><span data-sb="day"></span></span><span class="pm-sb-c"><span class="pm-sb-cam"></span></span><span class="pm-sb-r"><span data-sb="music"></span><span data-sb="who"></span><span class="pm-sb-sig"><i></i><i></i><i></i><i></i></span><span class="pm-sb-batt"><i></i></span></span></div>
    <div class="pm-stage">
      <nav class="pm-rail" aria-label="Pauzemenu">
        <div class="pm-inner pm-game">
          <div class="pm-q-head">${logoHtml({ sub: false, cls: 'pm-logo', decorative: true })}<b id="pm-title">Pauze</b><span class="pm-q-info"><span data-info="char"></span><span data-info="clock"></span><span data-info="money"></span></span></div>
          ${qBtn('resume', 'resume', 'Doorgaan', 'pm-primary pm-q-main', ' aria-keyshortcuts="Escape"').replace('</button>', `${key('Esc')}</button>`)}
          ${SECTIONS.map(([id, label]) => `<button type="button" class="pm-secondary pm-q-nav" data-goto="${id}" aria-current="false">${icon(id)}<span>${label}</span>${id === 'map' ? key('M') : ''}</button>`).join('')}
          <span class="pm-rail-gap"></span>
          <div class="pm-rail-row pm-ingame">${qBtn('save', 'save', 'Opslaan', 'pm-secondary pm-small')}${qBtn('load', 'load', 'Laden', 'pm-secondary pm-small', ' title="Laatste save laden"')}</div>
          <p class="pm-status pm-ingame" role="status"></p>
          <div class="pm-rail-row pm-ingame">${qBtn('menu', 'menu', 'Hoofdmenu', 'pm-secondary pm-small', ' title="Opslaan en terug naar het titelscherm"')}${DESKTOP ? qBtn('exit', 'exit', 'Afsluiten', 'pm-secondary pm-small', ' title="Opslaan en het spel sluiten"') : ''}</div>
          <div class="pm-rail-danger pm-ingame">
            ${qBtn('restart', 'restart', 'Opnieuw beginnen', 'pm-danger pm-small')}
            <div class="pm-confirm" hidden>
              <p>Opnieuw beginnen? Alles sinds je laatste save gaat verloren.</p>
              <button type="button" class="pm-secondary pm-small" data-action="load">Laatste save laden</button>
              <button type="button" class="pm-danger pm-small" data-action="new">Nieuw spel (save wissen)</button>
              <button type="button" class="pm-secondary pm-small" data-action="cancel">Annuleren</button>
            </div>
          </div>
        </div>
      </nav>
      <section class="pm-sheet" aria-labelledby="pm-sheet-title">
        <header class="pm-sheet-head">
          <span class="pm-sheet-ic"></span>
          <div class="pm-sheet-titles"><h2 class="pm-sheet-title" id="pm-sheet-title"></h2><small class="pm-sheet-sub"></small></div>
          <div class="pm-cycle">
            <button type="button" data-cycle="-1" aria-label="Vorig onderdeel">${key('Q')}</button>
            <button type="button" data-cycle="1" aria-label="Volgend onderdeel">${key('E')}</button>
            <span>onderdeel</span>
          </div>
        </header>
        <div class="pm-sheet-body">
          <section data-panel="overzicht" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-ov"></div></section>
          <section data-panel="telefoon" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-phone">
            ${subtabsHtml('telefoon', 'Telefoon')}
            <div class="td-layout"><div class="td-list">
              <div data-of="telefoon" data-sub="contacten"></div><div data-of="telefoon" data-sub="berichten" hidden></div>
            </div><aside class="td-detail ph-detail" aria-label="Gesprek" aria-live="polite"></aside></div>
          </div></section>
          <section data-panel="todo" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-todo">
            ${subtabsHtml('todo', 'Weergave')}
            <div class="td-layout"><div class="td-list">
              <div data-of="todo" data-sub="verhaal"></div><div data-of="todo" data-sub="alles" hidden></div><div data-of="todo" data-sub="dichtbij" hidden></div>
            </div><aside class="td-detail" aria-label="Details"></aside></div>
          </div></section>
          <section data-panel="map" class="pm-panel pm-map" hidden></section>
          <section data-panel="spullen" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-spullen"><div class="td-layout"><div class="td-list"></div><aside class="td-detail" aria-label="Details"></aside></div></div></section>
          <section data-panel="garage" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-garage"></div></section>
          <section data-panel="verhaal" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-verhaal">${subtabsHtml('verhaal', 'Verhaal')}
            <div data-of="verhaal" data-sub="personages"></div><div data-of="verhaal" data-sub="aanwijzingen" hidden></div>
          </div></section>
          <section data-panel="prestaties" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-ach"></div></section>
          <section data-panel="streken" class="pm-panel pm-col" hidden><div class="pm-inner pm-narrow pm-streken"></div></section>
          <section data-panel="settings" class="pm-panel pm-col" hidden><div class="pm-inner pm-narrow">${settingsHtml()}</div></section>
          <section data-panel="controls" class="pm-panel pm-col" hidden><div class="pm-inner pm-wide pm-cinner">
            ${subtabsHtml('controls', 'Besturing')}
            <div data-of="controls" data-sub="overzicht">
            <div class="pm-csearch">${icon('search')}
              <input type="search" data-controls-search placeholder="Zoek een toets of actie, bijv. toeter, duif of Q" aria-label="Zoek in de besturing" autocomplete="off" spellcheck="false"></div>
            <div class="pm-cgrid">${controlsHtml()}</div>
            <p class="pm-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p>
            </div>
            <div data-of="controls" data-sub="toetsen" class="pm-binds" hidden></div>
            <div data-of="controls" data-sub="knoppen" class="pm-binds" hidden></div>
          </div></section>
        </div>
      </section>
    </div>
    <footer class="pm-footer"><span class="pm-foot-tab"></span><span class="pm-foot-keys"></span></footer>
    <span class="pm-hinge" aria-hidden="true"></span>
    </div>`;
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
    const gsub = e.target.closest('[data-goto-sub]');
    if (gsub) { const [sec, sub] = gsub.dataset.gotoSub.split(':'); pref.sub[sec] = sub; enterSection(sec); return; }
    const rk = e.target.closest('[data-rebind-key]');
    if (rk) return startKeyRebind(rk);
    const rp = e.target.closest('[data-rebind-pad]');
    if (rp) return startPadRebind(rp);
    const st = e.target.closest('[data-subtab]');
    if (st) { showSubtab(st.dataset.of, st.dataset.subtab); if (st.dataset.of === 'todo') renderTodoPanel(); if (st.dataset.of === 'verhaal') renderVerhaalPanel(); if (st.dataset.of === 'controls') renderBinds(); if (st.dataset.of === 'telefoon') renderPhone(); return; }
    const seg = e.target.closest('.pm-seg [data-value]');
    if (seg && 'radio' in seg.parentElement.dataset) { setRadio(seg.dataset.value === 'on', { announce: false }); syncControls(); return; }
    if (seg) { setSetting(seg.parentElement.dataset.setting, seg.dataset.value); syncControls(); return; }
    const pre = e.target.closest('[data-preset]');
    if (pre) {
      if (pre.dataset.preset === 'eigen') { const first = root.querySelector('[data-sub="video"] .pm-subhead + .pm-row [data-value]'); if (first) first.focus(); }
      else { applyPreset(pre.dataset.preset); syncControls(); }
      return;
    }
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
    if (tab === 'verhaal' && verhaalClick(e, activePanel())) return;
    if (tab === 'streken' && cheatsClick(e, world, cheatsApi)) return;
    const action = e.target.closest('[data-action]');
    if (action) runAction(action.dataset.action);
  });
  root.addEventListener('input', (e) => {
    if (DESKTOP && e.target.dataset && e.target.dataset.desktop === 'fullscreen') {
      DESKTOP.setFullscreen(e.target.checked);
      return;
    }
    if (e.target.dataset && e.target.dataset.cheat) {
      cheatsInput(e.target);
      renderCheats(`[data-cheat="${e.target.dataset.cheat}"]`);
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
  if (!new URLSearchParams(location.search).has('stil')) {
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
  if (isPlayAheadOpen()) return;
  const k = e.key;
  const lower = k.length === 1 ? k.toLowerCase() : k;
  if (!open) {
    if (e.repeat || !started()) return;
    if (k === 'Escape' || (lower === 'm' && !isCinematicActive())) {
      e.preventDefault();
      // a call, a story contact or a text on screen: Esc opens its thread
      const from = k === 'Escape' ? storyContactCaller() || (!isCinematicActive() ? recentNotice() : null) : null;
      if (from) { selectPhoneThread(from); pref.sub.telefoon = 'berichten'; }
      setOpen(true, k === 'Escape' ? (from ? 'telefoon' : HOME) : 'map', 'direct');
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
    cycleSection(lower === 'q' ? -1 : 1);
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

// --- Besturing: rebinding keys and buttons (controls.js) ------------------------
let rebinding = null;
let bindMsg = '';

function bindRowsKeys() {
  const binds = getSettings().keyBinds;
  const groups = KEY_GROUPS.map(([g, title]) => `<h4 class="pm-subhead">${esc(title)}</h4>` + KEY_ACTIONS.filter(([, , gr]) => gr === g).map(([k, desc]) => {
    const phys = physicalKey(binds, k);
    const changed = phys !== defaultKey(k);
    return `<div class="pm-row pm-bind"><span>${esc(desc)}${changed ? `<small>Standaard: ${esc(keyName(defaultKey(k)))}</small>` : ''}</span>` +
      `<button type="button" class="pm-secondary pm-small pm-bindbtn${changed ? ' pm-changed' : ''}" data-rebind-key="${esc(k)}" aria-label="${esc(desc)}: ${esc(keyName(phys))}. Kies om te wijzigen"><span class="hud-key" data-g-raw>${esc(keyName(phys))}</span></button></div>`;
  }).join('')).join('');
  return `<p class="pm-note">Kies een actie en druk de nieuwe toets. Zit die toets al op iets anders, dan ruilen ze. Esc, Enter, de pijltjes en de muis liggen vast.${defaultKey('control') !== 'control' ? ' In de browser zit bukken en omlaag op C: Ctrl+W sluit daar het tabblad.' : ''}</p>
    <p class="pm-status pm-bindmsg" role="status">${esc(bindMsg)}</p>
    <div class="pm-group">${groups}</div>
    <div class="pm-reset"><button type="button" class="pm-secondary pm-small" data-action="binds-reset-keys">${icon('restart')}<span>Standaard herstellen</span></button></div>`;
}

function bindRowsPad() {
  const binds = getSettings().padBinds;
  const rows = PAD_REMAPPABLE.map((slot) => {
    const phys = physicalButton(binds, slot);
    const changed = phys !== slot;
    return `<div class="pm-row pm-bind"><span>${esc(slotUses(slot) || PAD_SLOT_NAMES[slot])}<small>${esc(PAD_SLOT_NAMES[slot])}${changed ? ' · aangepast' : ''}</small></span>` +
      `<button type="button" class="pm-secondary pm-small pm-bindbtn${changed ? ' pm-changed' : ''}" data-rebind-pad="${slot}" aria-label="${esc(PAD_SLOT_NAMES[slot])}. Kies om te wijzigen">${pg(phys)}</button></div>`;
  }).join('');
  return `<p class="pm-note">Kies een rij en druk op de controller de knop die het voortaan moet doen. Ze ruilen van plek. Menu/Start opent altijd het pauzemenu; de sticks liggen vast.</p>
    <p class="pm-status pm-bindmsg" role="status">${esc(bindMsg)}</p>
    <div class="pm-group">${rows}</div>
    <div class="pm-reset"><button type="button" class="pm-secondary pm-small" data-action="binds-reset-pad">${icon('restart')}<span>Standaard herstellen</span></button></div>`;
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

function stepSegment(el, dir) {
  const btns = [...el.closest('.pm-seg').querySelectorAll('[data-value]')];
  const i = btns.indexOf(el.closest('[data-value]'));
  const next = btns[i + dir];
  if (!next) return;
  next.click();
  next.focus();
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
    else if (panel) { panel.scrollBy({ top: (dir === 'down' ? 1 : -1) * panel.clientHeight * 0.4, behavior: 'smooth' }); return; }
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
    else status('Geen save gevonden');
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
    clearSave();
    location.reload();
  } else if (a === 'bench' || a === 'bench-cancel') {
    const box = root.querySelector('[data-bench-confirm]');
    box.hidden = a === 'bench-cancel';
    box.querySelector('[data-bench-text]').textContent = prestart
      ? 'Benchmark starten? Duurt ongeveer twee minuten. Esc stopt.'
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
    const cur = root.querySelector('.pm-preset[aria-checked="true"]');
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
  for (const b of root.querySelectorAll('[data-radio] [data-value]')) {
    const on = (b.dataset.value === 'on') === radioIsOn();
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
  const shadowsAllowed = QUALITY_PRESETS[st.quality].shadows;
  syncPresets(st);
  for (const el of root.querySelectorAll('[data-setting]')) {
    const v = st[el.dataset.setting];
    if (el.classList.contains('pm-seg')) {
      const btns = [...el.querySelectorAll('[data-value]')];
      for (const b of btns) {
        const on = b.dataset.value === String(v);
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      }
      if (!btns.some((b) => b.tabIndex === 0)) btns[0].tabIndex = 0;
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

// The preset cards and, after a benchmark, its banner with one preset to
// apply (gfxprofile.js). Only measured numbers are shown.
function syncPresets(st) {
  const cur = currentPreset(st) || 'eigen';
  const res = getBenchResult();
  for (const b of root.querySelectorAll('.pm-preset')) {
    const n = b.dataset.preset;
    b.setAttribute('aria-checked', String(n === cur));
    b.querySelector('.pm-pill').hidden = !(res && res.rec === n);
    const fps = res && (n === 'eigen' ? (res.preset ? 0 : res.avg) : res.fps[n]);
    b.querySelector('.pm-fps').textContent = fps ? `± ${Math.round(fps)} fps` : '';
  }
  const ban = root.querySelector('[data-bench-banner]');
  ban.hidden = !(res && res.banner);
  if (ban.hidden) return;
  const r = Math.round;
  const was = res.preset ? `Op ${presetLabel(res.preset)}` : 'Met je eigen instellingen';
  const hitch = res.low < 30 && res.heaviest ? `, met haperingen in ‘${esc(res.heaviest.label)}’` : '';
  const then = res.rec ? ` Op ${presetLabel(res.rec)} wordt dat ongeveer ${r(res.fps[res.rec])} fps.` : ' Dat draait prima.';
  const changes = res.rec ? describeChanges(res.rec, st) : '';
  ban.innerHTML = `<span class="pm-bench-badge">${GEAR_SVG}</span><div class="pm-bench-body">
    <h4>${res.rec ? `Benchmark klaar: kies ${presetLabel(res.rec)}` : 'Benchmark klaar'}</h4>
    <p>${was} haalde je computer gemiddeld ${r(res.avg)} fps${hitch}.${then}</p>
    ${changes ? `<p class="pm-bench-what">Dit verandert: ${esc(changes)}</p>` : ''}
    <div class="pm-confirm-row">${res.rec ? '<button type="button" class="pm-primary pm-small" data-action="bench-apply">Toepassen</button><button type="button" class="pm-secondary pm-small" data-action="bench-dismiss">Niet nu</button>'
      : '<button type="button" class="pm-secondary pm-small" data-action="bench-dismiss">Sluiten</button>'}</div></div>`;
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
  const unread = !!world && phoneUnread(world) > 0;
  const pNav = root.querySelector('[data-goto="telefoon"]');
  if (pNav) pNav.toggleAttribute('data-new', unread);
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
  if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om op te slaan; je poepscore gaat mee in je save.'); return; }
  const saved = hasSave();
  for (const b of root.querySelectorAll('[data-action="load"]')) b.disabled = !saved;
  const s = getSaveSummary();
  if (s && !root.querySelector('.pm-status').textContent) {
    const d = new Date(s.savedAt);
    status(`Laatste save: ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`);
  }
}

function syncRail() {
  const pigeon = !!(world && world.pigeonMode);
  for (const b of root.querySelectorAll('.pm-rail-row [data-action]')) b.disabled = pigeon;
  root.querySelector('.pm-game .pm-confirm').hidden = true;
  root.querySelector('.pm-status').textContent = '';
  syncSaveButtons();
}

function refreshInfo() {
  if (!world) return;
  const c = world.pigeonMode ? 'Duif' : world.player.character === 'anita' ? 'Tessa' : 'Tammo';
  const set = (k, text) => { for (const el of root.querySelectorAll(`[data-info="${k}"]`)) el.textContent = text; };
  set('char', c);
  set('clock', getClockText(world));
  set('money', '€' + Math.max(0, Math.floor(world.money)).toLocaleString('nl-NL'));
  // the phone's status bar
  const sb = (k, text) => { const el = root.querySelector(`[data-sb="${k}"]`); if (el) el.textContent = text; };
  sb('clock', getClockText(world));
  sb('day', storyDate(world).long);
  sb('who', c);
  const np = world.nowPlaying;
  sb('music', radioIsOn() && np ? `♪ ${np.title}${np.artist ? ' · ' + np.artist : ''}` : '');
}

export function pauseMenuTab() {
  return open ? tab : null;
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
  if (isPadActive()) {
    const back = prestart ? 'terug naar het hoofdmenu' : tab === HOME || origin !== 'home' ? 'terug naar het spel' : 'terug';
    return `${pg('lb')}${pg('rb')} onderdeel <span class="pm-kgap"></span>${pg('dpad')} kiezen <span class="pm-kgap"></span>${pg('a')} ok <span class="pm-kgap"></span>${pg('b')} ${back}`;
  }
  if (prestart) return `${key('Q')}${key('E')} onderdeel <span class="pm-kgap"></span>${key('↑')}${key('↓')} kiezen <span class="pm-kgap"></span>${key('Esc')} terug naar het hoofdmenu`;
  const back = tab === HOME || origin !== 'home' ? 'terug naar het spel' : 'terug';
  if (tab === 'map') return `${key('Q')}${key('E')} onderdeel <span class="pm-kgap"></span>${key('M')} sluiten <span class="pm-kgap"></span>${key('Esc')} ${back}`;
  return `${key('Q')}${key('E')} onderdeel <span class="pm-kgap"></span>${key('↑')}${key('↓')}${key('←')}${key('→')} kiezen <span class="pm-kgap"></span>${key('Enter')} ok <span class="pm-kgap"></span>${key('Esc')} ${back}`;
}

function syncFooter() {
  if (!root) return;
  const pad = isPadActive();
  root.querySelector('.pm-foot-tab').innerHTML = pad && PAD_FOOTERS[tab] ? PAD_FOOTERS[tab]() : prestart ? '' : FOOTERS[tab] || '';
  root.querySelector('.pm-foot-keys').innerHTML = keysHtml();
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
  root.querySelector('[data-action="resume"] span').textContent = prestart ? 'Terug' : 'Doorgaan';
  syncNavBadges();
  const [, label, hint] = sectionOf(name);
  sheet.querySelector('.pm-sheet-ic').innerHTML = icon(name);
  sheet.querySelector('.pm-sheet-title').textContent = label;
  sheet.querySelector('.pm-sheet-sub').textContent = hint;
  sheet.querySelector('.pm-cycle').hidden = ids.length < 2;
  if (prev !== name) {
    sheet.classList.remove('pm-enter', 'pm-swap');
    void sheet.offsetWidth;
    sheet.classList.add('pm-swap');
  }
  if (!prestart && name !== HOME && pref.last !== name) { pref.last = name; savePref(); }
  if (name === 'map') {
    const r = getDiscoveredRatio();
    if (r >= 0.01) sheet.querySelector('.pm-sheet-sub').textContent = `${Math.round(r * 100)}% van Grunn verkend · ${hint.toLowerCase()}`;
  }
  if (name === HOME) renderOverviewPanel();
  if (name === 'todo') { showSubtab('todo', pref.sub.todo || 'verhaal'); renderTodoPanel(); }
  if (name === 'spullen') renderSpullenPanel();
  if (name === 'telefoon') { showSubtab('telefoon', pref.sub.telefoon || 'contacten'); renderPhone(); }
  if (name === 'garage') { renderGaragePanel(garageEl(), world); syncSheetSub(); }
  if (name === 'verhaal') { showSubtab('verhaal', pref.sub.verhaal || 'personages'); renderVerhaalPanel(); }
  if (name === 'streken') { if (prev !== 'streken') resetCheatsPanel(); renderCheats(); }
  if (name === 'prestaties') { renderAchievementsPanel(root.querySelector('[data-panel="prestaties"] .pm-inner')); syncSheetSub(); }
  if (name === 'controls') { const q = root.querySelector('[data-controls-search]'); q.value = ''; filterControls(''); showSubtab('controls', pref.sub.controls || 'overzicht'); bindMsg = ''; renderBinds(); }
  if (prev === 'controls' && name !== 'controls') cancelRebind();
  if (name === 'settings') { showSubtab('settings', pref.sub.settings || 'sound'); syncControls(); syncDesktopControls(); }
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
