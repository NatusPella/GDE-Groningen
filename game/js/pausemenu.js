// The pause menu: one overlay over the game (the city keeps rendering behind
// it). A fixed rail on the left (Doorgaan, the sections, Opslaan/Laden,
// Naar het hoofdmenu) never changes shape; the sheet beside it shows one section.
// Esc opens on Overzicht; from another section Esc/Backspace go back to it,
// then close. Sections: Overzicht, Te doen (todoui.js), Verhaal
// (verhaalui.js), Kaart, Garage, Prestaties, Cheats (cheatsui.js),
// Instellingen, Besturing.
import { getSettings, setSetting, resetSettings, QUALITY_PRESETS } from './settings.js';
import { logoHtml } from './logo.js';
import { setPauseMenuOpen, setPauseMenuTabState, setPauseMenuControls } from './pausestate.js';
import { PRESET_ORDER, presetLabel, describePreset, describeChanges, currentPreset, applyPreset, getBenchResult, dismissBenchBanner, GEAR_SVG } from './gfxprofile.js';
import { mountMapView, setMapActive, setMapCloseHandler, setMapView, getDiscoveredRatio, setMapTeleport } from './mapview.js';
import { renderSamenPanel } from './samenpanel.js';
import { renderSpelersPanel } from './coopspelersui.js';
import { renderCheatsPanel, cheatsClick, resetCheatsPanel, cheatsFocus } from './cheatsui.js';
import { skipCurrent, getStoryJournal, markCluesSeen } from './story.js';
import { saveGame, hasSave, loadLatestSave, startNewSlot, getSaveSummary, getPlaySeconds } from './savegame.js';
import { openSaveSlots, isSaveSlotsOpen } from './saveslotsui.js';
import { getClockText } from './clocktext.js';
import { VERSION } from './version.js';
import { versionLabel } from './menumodels.js';
import { storyDate } from './calendarday.js';
import { isCinematicActive } from './cinematics.js';
import { renderAchievementsPanel } from './achievementsui.js';
import { renderLoopbaanPanel } from './loopbaanui.js';
import { renderVisboekPanel } from './visboekui.js';
import { renderBoerderijPanel } from './boerderijui.js';
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
import { renderOverview, renderTodo, renderTodoStory, todoClick, todoFocus, todoEnter, todoSummary, selectTodo, foldNote } from './todoui.js';
import { isPlayAheadOpen } from './todo.js';
import { renderVerhaal, verhaalClick, verhaalSummary, disposeVerhaalViewer, selectVerhaalCharacter } from './verhaalui.js';
import { anyFresh } from './characters.js';
import { renderSpullen, spullenClick, spullenFocus } from './spullen.js';
import { phoneClick, phoneUnread, selectPhoneThread, characterForSender } from './phone.js';
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
    [['I'], 'Hengelen, aan elk water (ook vanuit een boot die stilligt)'],
  ]],
  ['rijden', 'Rijden', [
    [['WASD'], 'Gas, remmen en achteruit, sturen'],
    [['SPACE'], 'Handrem'],
    [['.', ','], 'Handmatig schakelen: hoger, lager (Instellingen › Schakelen)'],
    [['J'], 'Handmatig met koppeling: koppeling indrukken bij het schakelen'],
    [['SHIFT'], 'Op de fiets: even flink doortrappen; op een motor: wheelie met gas, stoppie met remmen'],
    [['CTRL'], 'Op de fiets: wheelie (vasthouden en trappen), stoppie (vasthouden en remmen) een sprongetje (vasthouden en de rem kort aantikken) of zonder handen rijden (vasthouden en snel doortrappen)'],
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
    [['U'], 'Geluid uit of weer aan; staat het uit, dan zie je linksboven een luidspreker met streep en "U"'],
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
    // de hulpblokken (tabblad Hulp) hebben geen toetsrijen: ze tellen mee op hun eigen tekst
    if (g.classList.contains('pm-help')) { const t = g.textContent.toLowerCase(); n = words.every((w) => t.includes(w)) ? 1 : 0; }
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
  loopbaan: '<path d="M3 20h5v-5h5v-5h5V5h3M3 20h18"/>',
  visboek: '<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3zM16.5 11h.01"/>',
  boerderij: '<path d="M3 20h18M5 20v-8l7-5 7 5v8M10 20v-5h4v5"/>',
  streken: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="15" cy="15" r="1.1"/>',
  spel: '<rect x="3" y="7.5" width="18" height="10" rx="5"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="15" cy="11.5" r="0.9"/><circle cx="17.5" cy="13.5" r="0.9"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  controls: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7 14h10"/>',
  spullen: '<path d="M7 8V6a5 5 0 0 1 10 0v2"/><rect x="4" y="8" width="16" height="13" rx="3"/><path d="M4 13h16M10 13v2h4v-2"/>',
  telefoon: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  // the main menu's items (startscreen.js), in the same line style
  solo: '<circle cx="12" cy="8" r="3.8"/><path d="M5 20.5c.6-4.2 3.5-6.4 7-6.4s6.4 2.2 7 6.4"/>',
  new: '<path d="M12 4v16M4 12h16"/>',
  news: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 17h5"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h0"/>',
  spelers: '<circle cx="12" cy="7.5" r="3"/><circle cx="5.5" cy="10.5" r="2.1"/><circle cx="18.5" cy="10.5" r="2.1"/><path d="M6.5 20c0-3.4 2.4-5.6 5.5-5.6s5.5 2.2 5.5 5.6"/>',
  samen: '<circle cx="9" cy="8.5" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3 20c0-3.6 2.6-5.8 6-5.8s6 2.2 6 5.8M16 14.5c2.6.1 5 1.7 5 5"/>',
};
// An icon of the pause menu's set for the main menu's items, or '' for an unknown name.
export const menuIcon = (id, cls = 'ss-ic') => (ICONS[id] ? icon(id, cls) : '');
const icon = (id, cls = 'pm-ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id] || ''}</svg>`;
const qBtn = (action, ic, label, cls = 'pm-secondary', extra = '') =>
  `<button type="button" class="${cls}" data-action="${action}"${extra}>${icon(ic)}<span>${label}</span></button>`;

// [id, label, hint under the title in the sheet]
const SECTIONS = [
  ['spel', 'Spel', 'Opslaan, stoppen, samen spelen en waar je bent'],
  ['verhaal', 'Verhaal', 'Opdrachten, personages, aanwijzingen en berichten'],
  ['loopbaan', 'Loopbanen', 'Je vakken, bijbanen, vissen en boerderij'],
  ['todo', 'Activiteiten', 'Klussen, minigames en evenementen in de buurt'],
  ['map', 'Kaart', 'Kies een doel of zoek een plek'],
  ['spullen', 'Spullen', 'Alles wat je hebt'],
  ['garage', 'Garage', 'Jouw voertuigen'],
  ['prestaties', 'Prestaties', 'Blijven bewaard, ook bij een nieuw spel'],
  ['fotos', "Foto's", 'Fotomodus en je galerij'],
  ['settings', 'Instellingen', 'Beeld, geluid, besturing, hulp en cheats'],
  // onderdelen onder een ander onderdeel (CHILD), niet los in de rail
  ['visboek', 'Visboek', 'Alle vis van de provincie, van jou'],
  ['boerderij', 'Boerderij', 'Je eigen akker, gewassen en machines'],
  ['controls', 'Besturing', 'Toetsen en knoppen aanpassen en nalezen'],
  ['streken', 'Cheats', 'Een beetje vals spelen'],
];
// the rail's three groups: playing, collected, system
const RAIL_GROUPS = [['spel', 'verhaal', 'loopbaan', 'todo'], ['map', 'spullen', 'garage', 'prestaties', 'fotos'], ['settings']];
// Onderdelen zonder eigen plek in de rail die onder een ander onderdeel hangen (#430): Vissen en Farmen horen bij Loopbaan
// (de tegels Bezigheden), de toetsen en knoppen bij Instellingen > Besturing. De rail markeert de ouder; Terug gaat naar de ouder.
const CHILD = { visboek: 'loopbaan', boerderij: 'loopbaan', controls: 'settings', streken: 'settings' };
const PRESTART_SECTIONS = ['spel', 'settings', 'controls'];
const SUBTABS = {
  todo: [['alles', 'Alles'], ['dichtbij', 'Dichtbij']],
  verhaal: [['opdrachten', 'Opdrachten'], ['personages', 'Personages'], ['aanwijzingen', 'Aanwijzingen']],
  spel: [['overzicht', 'Overzicht'], ['samen', 'Samen spelen'], ['spelers', 'Spelers'], ['acties', 'Opslaan & stoppen'], ['spelen', 'Spelen'], ['camera', 'Camera & richten'], ['hints', 'Hints & uitleg']],
  settings: [['video', 'Beeld'], ['sound', 'Geluid & ondertitels'], ['besturing', 'Besturing'], ['display', 'Interface'], ['a11y', 'Toegankelijkheid'], ['fouten', 'Foutrapport'], ['cheats', 'Cheats']],
  controls: [['toetsen', 'Toetsenbord en muis'], ['knoppen', 'Controller'], ['overzicht', 'Toetsenoverzicht'], ['hulp', 'Hulp']],
};
// old tab names (saved preferences, other modules)
// de oude plekken: de telefoon is nu Verhaal > Contacten en Berichten, Overzicht is Spel > Overzicht (#430)
const SUB_ALIAS = { settings: { controller: 'besturing', camera: 'besturing' } };

// The footer: two to four hints, [keys, label, action]. ' back' is filled in.
const BACK = '\u0000';
const HINTS = {
  overzicht: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Esc'], 'doorgaan', 'resume']],
  todo: [[['↑', '↓'], 'kiezen'], [['Enter'], 'zet als doel'], [['Q', 'E'], 'weergave'], [['Esc'], BACK, 'back']],
  map: [[['Klik'], 'doel kiezen'], [['Scroll'], 'zoomen'], [['M'], 'sluiten', 'resume'], [['Esc'], BACK, 'back']],
  verhaal: [[['↑', '↓'], 'kiezen'], [['Enter'], 'kiezen of bellen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  spullen: [[['↑', '↓'], 'kiezen'], [['Enter'], 'gebruiken'], [['Esc'], BACK, 'back']],
  garage: [[['↑', '↓'], 'kiezen'], [['Enter'], 'laten afleveren'], [['Q', 'E'], 'soort'], [['Esc'], BACK, 'back']],
  prestaties: [[['↑', '↓'], 'kiezen'], [['Enter'], 'openen'], [['Q', 'E'], 'weergave'], [['Esc'], BACK, 'back']],
  loopbaan: [[['↑', '↓'], 'kiezen'], [['Enter'], 'openen'], [['Esc'], BACK, 'back']],
  visboek: [[['↑', '↓'], 'kiezen'], [['Esc'], BACK, 'back']],
  boerderij: [[['↑', '↓'], 'kiezen'], [['Enter'], 'doen'], [['Esc'], BACK, 'back']],
  fotos: [[['F8'], 'fotomodus'], [['Esc'], BACK, 'back']],
  spelers: [[['↑', '↓'], 'kiezen'], [['Enter'], 'roepen of erheen'], [['Esc'], BACK, 'back']],
  streken: [[['↑', '↓'], 'kiezen'], [['Enter'], 'aan of uit'], [['Esc'], BACK, 'back']],
  samen: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Esc'], BACK, 'back']],
  spel: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  settings: [[['↑', '↓'], 'kiezen'], [['←', '→'], 'wijzigen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  controls: [[['↑', '↓'], 'kiezen'], [['Enter'], 'toets wijzigen'], [['Q', 'E'], 'onderdeel'], [['Esc'], BACK, 'back']],
};
// a line in the sheet header that replaces the section's hint
const SHEET_NOTE = {};
// a fixed controller glyph (the menu's own buttons)
const pg =(slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
const PAD_KEYS = { '↑': 'dpad', '↓': null, '←': 'dpad', '→': null, Enter: 'a', Esc: 'b', Q: 'lb', E: 'rb', Klik: 'a', Scroll: 'rt', M: 'view' };
const PAD_LABEL = { 'zet als doel': 'zet als doel', 'toets wijzigen': 'indelen' };

// HOME is Spel > Overzicht: de plek waar het menu opent en waar Esc naartoe leidt
const HOME = 'overzicht';
const atHome = () => tab === 'spel' && !prestart && (pref.sub.spel || 'overzicht') === 'overzicht';
const OV_SUB = '[data-of="spel"][data-sub="overzicht"]';
// de tekst onder de titel is vast; wat er wisselt (voortgang, datum) staat erboven
function sheetNote(t) { const eb = sheet && sheet.querySelector('.pm-sheet-eb'); if (!eb) return; eb.textContent = t || ''; eb.hidden = !t; }
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
// 'Spelers' staat alleen in het menu zolang je samen speelt (#377)
const sectionIds = () => (prestart ? PRESTART_SECTIONS : SECTIONS.map(([id]) => id));
const sectionOf = (id) => SECTIONS.find(([s]) => s === id);
const key = (k) => `<span class="hud-key">${k}</span>`;

const CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>';
const CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';
const plain = (t) => String(t).replace(/<[^>]*>/g, '').replace(/&shy;/g, '');

// the tabs of a section that are there in the main menu too (Opslaan & stoppen of Spel needs a running game)
const inGameOnly = (of, id) => (of === 'spel' && (id === 'acties' || id === 'overzicht' || id === 'samen' || id === 'spelers')) || (of === 'settings' && id === 'cheats');
// Spelers (wie er meespeelt) is er alleen zolang je samen speelt
const subsOf = (of) => SUBTABS[of].filter(([id]) => !(prestart && inGameOnly(of, id)) && !(of === 'spel' && id === 'spelers' && !(world && world.coopNet)));
function subtabsHtml(of, label) {
  return `<div class="m-tabs"><nav class="m-tablist" role="tablist" aria-label="${label}">` + SUBTABS[of].map(([id, text]) =>
    `<button type="button" role="tab" class="m-tab${inGameOnly(of, id) ? ' pm-ingame' : ''}" data-of="${of}" data-subtab="${id}" aria-selected="false">${esc(text)}<small data-count="${id}"></small></button>`).join('') + '</nav>' +
    (of === 'todo' ? '<span class="m-grow"></span><button type="button" class="m-bt" data-todo-sort aria-pressed="false" hidden>Dichtbij eerst</button>' : '') +
    (of === 'controls' ? '<span class="m-grow"></span><button type="button" class="m-bt" data-goto-sub="settings:besturing">Terug naar Instellingen</button>' : '') + '</div>';
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
      ${toggle('zuinig', 'Zuinige modus', '30 beelden per seconde, spaart batterij en warmte')}
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
        ${toggle('subtitleBox', 'Donker vlak erachter', 'Een donker vlak maakt ze makkelijker te lezen')}
        ${toggle('soundCaptions', 'Geluiden beschrijven', 'Een korte tekst als [sirene] of [claxon] bij belangrijke geluiden')}`, true)}`, `
      <aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">Zo ziet het eruit</span></div>
        <div class="pm-subprev" data-sub-preview><span class="pm-subtxt"><b>Tammo:</b> Rustig an, rustig an.</span></div>
        <p class="mut">Muziek is de radio (G-Music, 's nachts Nachtstreek) en de titelsong, stemmen zijn Tammo, Tessa, de politie, de mensen op straat en de praatjes op de radio. Kleurenblind, interfacegrootte en beweging beperken vind je onder Toegankelijkheid.</p></aside>`)}
    ${tab('besturing', `
      <div class="m-gh"><span>Muis en toetsenbord</span></div>
      ${slider('mouseSensitivity', 'Muisgevoeligheid', 0.3, 2.5, 0.05)}
      ${toggle('invertY', 'Omhoog/omlaag omkeren', 'Geldt voor de muis en de stick')}
      <div class="m-li pm-row">${rowName('Toetsen aanpassen', 'Elke toets een andere functie geven')}<button type="button" class="m-bg" data-goto-sub="controls:toetsen">Aanpassen</button></div>
      <div class="m-gh"><span>Controller</span></div>
      ${picker('padLayout', 'Controllerindeling', [['auto', 'Automatisch'], ['xbox', 'Onderste knop bevestigt (A B X Y)'], ['switch', 'Rechterknop bevestigt (A en B, X en Y omgewisseld)'], ['ps', 'Vormknoppen'], ['deck', 'Handheld']], 'Automatisch kiest wat er aangesloten is. Meldt je controller zich anders dan hij is (bijvoorbeeld via een koppelprogramma), kies dan zelf; knoppen en hints volgen je keuze')}
      ${slider('padLookSensitivity', 'Camera met de rechterstick', 0.3, 2.5, 0.05)}
      ${toggle('rumble', 'Trillen', 'Bij klappen, schoten en botsingen, als je controller dat kan')}
      <div class="m-li pm-row">${rowName('Knoppen indelen', 'Elke knop een andere functie geven')}<button type="button" class="m-bg" data-goto-sub="controls:knoppen">Indelen</button></div>
      <div class="m-li pm-row">${rowName('Controller testen', 'Welk pad wordt herkend en welke knop doet wat')}<button type="button" class="m-bg" data-pad-test>Testen</button></div>
      <div class="m-gh"><span>Aanraken</span></div>
      ${picker('touchControls', 'Aanraakbediening', [['auto', 'Automatisch'], ['aan', 'Aan'], ['uit', 'Uit']], 'Knoppen op het scherm voor telefoon en tablet; wisselen werkt na een herstart')}
      <div class="m-gh"><span>Overzicht en hulp</span></div>
      <div class="m-li pm-row">${rowName('Toetsenoverzicht', 'Alle toetsen en knoppen, per situatie')}<button type="button" class="m-bg" data-goto-sub="controls:overzicht">Bekijken</button></div>
      <div class="m-li pm-row">${rowName('Toetshints in beeld', 'Aan of uit, en voor toetsenbord of controller')}<button type="button" class="m-bg" data-goto-sub="spel:hints">Hints</button></div>
      <div class="m-li pm-row">${rowName('Hulp en oefenronde', 'Uitleg over de besturing en een rustige oefenronde')}<button type="button" class="m-bg" data-goto-sub="controls:hulp">Openen</button></div>`, `${pane('Besturing', 'Hoe je speelt', '<p>Alle gangbare controllers werken meteen. De hints in beeld wisselen vanzelf tussen toetsen en knoppen, naar wat je het laatst gebruikte.</p><p class="mut">Camera-afstand, beeldhoek en automatisch richten staan onder Spel.</p>')}`)}
    ${tab('display', `
      ${picker('hudMode', 'HUD', [['slim', 'Slim'], ['alles', 'Altijd alles'], ['minimaal', 'Minimaal']], 'Slim toont alleen wat nu telt')}
      ${toggle('showMinimap', 'Minimap')}
      ${slider('minimapZoom', 'Inzoomen op het kaartje', 0.6, 1.6, 0.05)}
      ${picker('minimapNorth', 'Minimap met noord boven', [['nooit', 'Nooit'], ['lucht', 'In de lucht'], ['altijd', 'Altijd']], 'Standaard draait de kaart mee')}
      ${toggle('showFog', 'Verkende gebieden op de kaart')}`, `${pane('Interface', 'Wat je ziet', '<p>Slim toont alleen wat nu telt; Altijd alles houdt alles in beeld; Minimaal laat alleen sterren, doel en ondertitels over.</p>')}`)}
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
    ${tab('cheats', `<div class="m-li pm-row">${rowName('Cheats', 'Een beetje vals spelen')}<button type="button" class="m-bg" data-goto="streken">Openen</button></div>`, `${pane('Cheats', 'Vals spelen', '<p>Geld, wapens, teleporteren en meer. Handig om iets uit te proberen.</p>')}`)}
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
// Spel (#416): how the game itself plays, apart from the system settings of Instellingen. The same keys in the same settings (settings.js):
// only the place in the menu changed, nothing is lost and nothing is saved differently.
function spelHtml() {
  const tab = (id, rows, side = '') => `<div data-of="spel" data-sub="${id}" class="pm-settab" hidden><div class="m-list pm-slist">${rows}</div>${side}</div>`;
  return `${subtabsHtml('spel', 'Onderdeel')}
    <div data-of="spel" data-sub="overzicht" class="pm-ov pm-spelov" hidden></div>
    <div data-of="spel" data-sub="samen" class="pm-samen pm-spelcoop" hidden></div>
    <div data-of="spel" data-sub="spelers" class="pm-spelers pm-spelcoop" hidden></div>
    ${tab('acties', `
      <div class="m-li pm-row">${rowName('Verder spelen', 'Terug naar het spel')}<button type="button" class="m-bp" data-action="resume">Doorgaan</button></div>
      <div class="m-gh"><span>Opslaan en laden</span></div>
      <div class="m-li pm-row">${rowName('Opslaan', 'Bewaart waar je nu bent')}<button type="button" class="m-bg" data-action="save">Spel opslaan</button></div>
      <div class="m-li pm-row">${rowName('Opgeslagen spellen', 'Kiezen, laden, hernoemen, exporteren en verwijderen')}<button type="button" class="m-bg" data-action="saves" title="Opgeslagen spellen kiezen, laden, hernoemen, exporteren en verwijderen">Opgeslagen spellen</button></div>
      <p class="pm-status" data-game-status role="status"></p>
      <div class="m-gh"><span>Stoppen</span></div>
<div class="m-li pm-row">${rowName('Missie stoppen', 'Staat bij Overzicht zodra er een missie loopt, met een vraag erbij')}<button type="button" class="m-bg" data-goto-sub="spel:overzicht">Naar Overzicht</button></div>
      <div class="m-li pm-row">${rowName('Hoofdmenu', 'Slaat op en gaat terug naar het hoofdmenu')}<button type="button" class="m-bg" data-action="menu" title="Opslaan en terug naar het hoofdmenu">Naar het hoofdmenu</button></div>
      ${DESKTOP ? `<div class="m-li pm-row">${rowName('Spel sluiten', 'Slaat op en sluit het spel')}<button type="button" class="m-bg" data-action="exit" title="Opslaan en het spel sluiten">Afsluiten</button></div>` : ''}
      <div class="m-gh"><span>Opnieuw beginnen</span></div>
      <div class="m-li pm-row">${rowName('Opnieuw beginnen', 'Alles sinds je laatste savegame gaat verloren')}<button type="button" class="m-bg danger" data-action="restart">Opnieuw beginnen</button></div>
      <div class="pm-confirm" data-restart-confirm hidden>
        <p>Opnieuw beginnen? Alles sinds je laatste savegame gaat verloren. Je andere savegames blijven staan.</p>
        <button type="button" class="m-bg" data-action="load">Laatste spel laden</button>
        <button type="button" class="m-bg danger" data-action="new">Nieuw spel (nieuwe plek)</button>
        <button type="button" class="m-bt" data-action="cancel">Annuleren</button>
      </div>`, `${pane('Spel', 'Je spel', '<p>Opslaan, laden, opnieuw beginnen en stoppen. Je spel wordt ook vanzelf bewaard.</p><p class="mut">Hoe het spel speelt staat bij de andere tabbladen; beeld en geluid onder Instellingen.</p>')}`)}
    ${tab('spelen', `
      <div class="m-gh"><span>Verkeer en geweld</span></div>
      ${picker('ruzie', 'Verkeersruzie', [['uit', 'Uit'], ['weinig', 'Weinig'], ['normaal', 'Normaal'], ['veel', 'Veel']], 'Hoe vaak een boze bestuurder uitstapt na een botsing of getoeter. Zonder bloed; sommigen hebben iets in de hand')}
      ${picker('drunkFx', 'Dronken effecten', [['aan', 'Aan'], ['mild', 'Mild'], ['uit', 'Uit']])}
      ${toggle('gore', 'Bloed en ledematen', 'Uit: mensen vallen gewoon om, zonder bloed of rondvliegende ledematen')}
      <div class="m-gh"><span>Rijden</span></div>
      ${picker('shiftMode', 'Schakelen', [['auto', 'Automaat'], ['manual', 'Handmatig'], ['clutch', 'Handmatig + koppeling']], 'Automaat is de standaard; handmatig schakel je met . en , (of de bumpers), met koppeling houd je ook J ingedrukt')}
      ${toggle('speedFeel', 'Snelheidsgevoel', 'Beeld wordt wijder bij hoge snelheid en een zware klap vertraagt even; uit is rustiger')}
      ${toggle('driftAssist', 'Driften met hulp', 'Helpt tegensturen en houdt een slip beheersbaar; uit is realistischer')}
      ${toggle('bikeAssist', 'Motor met hulp', 'Houdt een motor of brommer rechtop in bochten; uit is realistischer')}
      <div class="m-gh"><span>Kaart</span></div>
      ${toggle('mapShiftTeleport', 'Shift+klik op de kaart verplaatst je', 'Niet tijdens een missie of met de politie achter je aan')}`, `${pane('Spel', 'Zo speelt het', '<p>Hoe het verkeer, het geweld en het rijden aanvoelen. Alles wordt meteen bewaard.</p><p class="mut">Beeld, geluid, besturing en toegankelijkheid staan onder Instellingen.</p>')}`)}
    ${tab('camera', `
      ${slider('fov', 'Beeldhoek', 50, 90, 1)}
      ${slider('cameraDistance', 'Camera-afstand', 0.8, 1.6, 0.05)}
      ${toggle('autoAim', 'Automatisch richten', 'Rechtermuisknop zoekt zelf het beste doelwit')}
      ${toggle('cinematicMoments', 'Filmische momenten', 'Bij bezienswaardigheden, crashes en vijf sterren; intro’s, missies en de filmcamera (V) staan altijd aan')}
      ${toggle('wijkFilm', 'Filmpje bij nieuwe wijken', 'Uit: een korte naamkaart met wat er te zien is; aan: de volledige rondvlucht')}`, `${pane('Camera & richten', 'Zicht', '<p>De camera-afstand en beeldhoek gelden te voet en in elk voertuig.</p>')}`)}
    ${tab('hints', `
      ${toggle('showHints', 'Toetshints')}
      ${picker('hintSource', 'Hints tonen voor', [['auto', 'Automatisch'], ['keys', 'Toetsenbord'], ['pad', 'Controller']], 'Automatisch volgt wat je het laatst gebruikte')}
      ${toggle('onboardingTips', 'Uitleg voor nieuwe spelers', 'Korte tips, elk één keer: je eerste klus, geld en winkels, de telefoon, de kaart en Activiteiten')}`, `${pane('Hints & uitleg', 'Hulp in beeld', '<p>Toetshints en korte tips voor nieuwe spelers. Je kunt ze altijd uitzetten.</p>')}`)}`;
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
          ${DESKTOP ? `<button type="button" class="ra pm-exit" data-action="exit" title="Opslaan en het spel sluiten">${icon('exit', 'pm-ic ra-ic')}<span class="ra-t">Afsluiten</span></button>` : ''}
          <button type="button" class="ra pm-back" data-action="resume">Terug</button>
          <p class="pm-ver">${versionLabel(VERSION)}</p>
        </div>
      </nav>
      <section class="pm-sheet m-panel" aria-labelledby="pm-sheet-title">
        <header class="pm-sheet-head m-head">
          <div class="pm-sheet-titles"><span class="m-eb pm-sheet-eb" hidden></span><h1 class="m-h1 pm-sheet-title" id="pm-sheet-title"></h1></div>
          <div class="m-hr pm-sheet-r"><span class="mut pm-sheet-sub"></span><button type="button" class="m-bt" data-action="reset" hidden>Standaard herstellen</button></div>
        </header>
        <div class="pm-sheet-body">
          <section data-panel="todo" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-todo">
            ${subtabsHtml('todo', 'Weergave')}
            <div class="m-main"><div class="m-list td-list">
              <div data-of="todo" data-sub="alles"></div><div data-of="todo" data-sub="dichtbij" hidden></div>
            </div><aside class="m-pane td-detail" aria-label="Details"></aside></div>
          </div></section>
          <section data-panel="map" class="pm-panel pm-map" hidden></section>
          <section data-panel="spullen" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-spullen"><div class="m-main"><div class="m-list td-list"></div><aside class="m-pane td-detail" aria-label="Details"></aside></div></div></section>
          <section data-panel="garage" class="pm-panel pm-col" hidden><div class="pm-inner pm-garage"></div></section>
          <section data-panel="verhaal" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-verhaal">${subtabsHtml('verhaal', 'Verhaal')}
            <div class="m-main pm-vbody"><div data-of="verhaal" data-sub="opdrachten" data-keep class="pm-vsub pm-vopd"><div class="m-main"><div class="m-list td-list"></div><aside class="m-pane td-detail" aria-label="Details"></aside></div></div><div data-of="verhaal" data-sub="personages" class="pm-vsub" hidden></div><div data-of="verhaal" data-sub="aanwijzingen" class="pm-vsub" hidden></div></div>
          </div></section>
          <section data-panel="prestaties" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach"></div></section>
          <section data-panel="loopbaan" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-loopbaan"></div></section>
          <section data-panel="visboek" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-loopbaan pm-visboek"></div></section>
          <section data-panel="boerderij" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-boerderij"></div></section>
          <section data-panel="fotos" class="pm-panel pm-col" hidden><div class="pm-inner pm-fotos"></div></section>
          <section data-panel="streken" class="pm-panel pm-col" hidden><div class="pm-inner pm-streken"></div></section>
          <section data-panel="spel" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-settings">${spelHtml()}</div></section>
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
    if (st) { showSubtab(st.dataset.of, st.dataset.subtab); if (st.dataset.of === 'todo') renderTodoPanel(); if (st.dataset.of === 'verhaal') renderVerhaalPanel(); if (st.dataset.of === 'controls') renderBinds(); if (st.dataset.of === 'spel') afterSpelSub(); return; }
    if (e.target.closest('[data-story-skip]')) {
      if (skipCurrent()) setOpen(false);
      else rerenderTodo();
      return;
    }
    const panel = activePanel();
    if (panel && tab === 'spullen' && spullenClick(e, world, panel, spullenApi)) return;
    if (tab === 'verhaal' && pref.sub.verhaal === 'personages' && root.querySelector('[data-vh-phone]') && phoneClick(e, world, root.querySelector('[data-vh-phone]'), phoneApi)) return;
    if (panel && tab === 'todo' && todoClick(e, world, panel, todoApi)) return;
    if (tab === 'spel' && pref.sub.spel === 'overzicht' && todoClick(e, world, root.querySelector(OV_SUB), todoApi)) return;
    if (panel && tab === 'loopbaan' && todoClick(e, world, panel, todoApi)) return;
    const gd = e.target.closest('[data-garage-deliver]');
    if (gd) return garageDeliver(gd.dataset.garageDeliver);
    const gf = e.target.closest('[data-garage-find]');
    if (gf) return garageFind(gf.dataset.garageFind);
    const gs = e.target.closest('[data-garage-select]');
    if (gs) return selectGarageVehicle(garageEl(), gs.dataset.garageSelect);
    if (tab === 'fotos' && fotoClick(e, world, root.querySelector('[data-panel="fotos"] .pm-inner'), { close: () => closePauseMenu() })) return;
    if (tab === 'verhaal' && pref.sub.verhaal === 'opdrachten' && todoClick(e, world, root.querySelector('[data-of="verhaal"][data-sub="opdrachten"]'), todoApi)) return;
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
    if (tab === 'verhaal' && p && pref.sub.verhaal === 'opdrachten') todoFocus(root.querySelector('[data-of="verhaal"][data-sub="opdrachten"]'), world, e.target);
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
  try { sheetNote(renderSpullen(root.querySelector('[data-panel="spullen"]'), world)); } catch (err) { console.error('spullen', err); }
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
  showView: (view) => { if (view === 'verhaal') { pref.sub.verhaal = 'opdrachten'; enterSection('verhaal'); return; } pref.sub.todo = view; enterSection('todo'); },
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
  if (tab === 'streken') sheetNote(sub);
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
    } else if (k === 'Enter' && t.dataset && t.dataset.todo && (tab === 'todo' || tab === 'verhaal')) {
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
  const confirmEl = root.querySelector('[data-restart-confirm]');
  if (!confirmEl.hidden) {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
    return;
  }
  const legend = tab === 'map' && root.querySelector('.mapview-legend:not([hidden])');
  if (legend) { root.querySelector('.mv-layers').click(); root.querySelector('.mv-layers').focus(); return; }
  const stop = root.querySelector('[data-stop-confirm]');
  if (stop && !stop.hidden) {
    stop.hidden = true;
    root.querySelector('[data-action="mission-stop"]').focus();
    return;
  }
  const bench = root.querySelector('[data-bench-confirm]');
  if (tab === 'settings' && !bench.hidden) {
    bench.hidden = true;
    root.querySelector('[data-action="bench"]').focus();
    return;
  }
  // een onderdeel onder een ander (Visboek, Boerderij, toetsen en knoppen): Terug gaat naar het onderdeel erboven, met de focus op de knop die erheen leidde
  if (CHILD[tab] && origin === 'home') {
    const from = tab;
    showTab(CHILD[from]);
    focusEl(root.querySelector(`[data-panel="${CHILD[from]}"] [data-goto="${from}"], [data-panel="${CHILD[from]}"] [data-goto-sub^="${from}:"]`) || root.querySelector(`.pm-game [data-goto="${CHILD[from]}"]`));
    return;
  }
  if (!prestart && origin === 'home') {
    // Spel: eerst terug naar het tabblad Overzicht, dan pas dicht
    if (tab === 'spel' && !atHome()) {
      showSubtab('spel', 'overzicht');
      afterSpelSub();
      focusEl(root.querySelector('[data-of="spel"][data-subtab="overzicht"]'));
      return;
    }
    if (tab !== 'spel') {
      const from = tab;
      showTab(HOME);
      focusEl(root.querySelector(`.pm-game [data-goto="${from}"]`));
      return;
    }
  }
  setOpen(false);
}

function cycleSection(dir) {
  const ids = sectionIds().filter((id) => !CHILD[id]);
  const i = Math.max(0, ids.indexOf(CHILD[tab] || tab));
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
  const subs = subsOf(tab);
  const cur = pref.sub[tab] || subs[0][0];
  const i = Math.max(0, subs.findIndex(([id]) => id === cur));
  const next = subs[(i + dir + subs.length) % subs.length][0];
  showSubtab(tab, next);
  if (tab === 'todo') renderTodoPanel();
  if (tab === 'verhaal') renderVerhaalPanel();
  if (tab === 'spel') afterSpelSub();
  if (tab === 'settings' || tab === 'spel') syncControls();
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
    if (prevSub === 'spel') afterSpelSub();
  }
}

function runAction(a) {
  const confirmEl = root.querySelector('[data-restart-confirm]');
  if (a === 'resume') setOpen(false);
  else if (a === 'save') status(saveGame(world) ? `Opgeslagen om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : 'Opslaan mislukt');
  else if (a === 'load') {
    if (loadLatestSave(world)) setOpen(false);
    else status('Geen savegame gevonden');
  } else if (a === 'saves') {
    if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om savegames te gebruiken.'); return; }
    openSaveSlots({ mode: 'game', world, onLoad: () => setOpen(false), onClose: () => { syncSaveButtons(); const b = root.querySelector('[data-panel="spel"] [data-action="saves"]'); if (b) b.focus(); } });
  } else if (a === 'restart') {
    confirmEl.hidden = false;
    syncSaveButtons();
    confirmEl.querySelector('button').focus();
  } else if (a === 'cancel') {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
  } else if (a === 'menu' || a === 'exit') {
    // save, then back to the main menu (Alleen spelen) or close the app; a
    // pigeon first turns back into Tammo/Tessa so the save has a street spot
    if (world && world.pigeonMode && world.pigeonActions) world.pigeonActions.stop();
    if (world) saveGame(world);
    if (a === 'exit' && DESKTOP) DESKTOP.quit();
    else location.reload();
  } else if (a === 'pigeon-stop') {
    if (world.pigeonActions && world.pigeonActions.stop()) setOpen(false);
  } else if (a === 'job-stop') {
    if (world.sideJobActions && world.sideJobActions.stop()) setOpen(false);
  } else if (a === 'mission-stop' || a === 'mission-stop-no') {
    // "Missie stoppen?" (#390): ask first; Nee brings the focus back to the button
    const box = root.querySelector('[data-stop-confirm]');
    if (box) {
      box.hidden = a === 'mission-stop-no';
      if (!box.hidden) box.querySelector('[data-action="mission-stop-go"]').focus();
      else root.querySelector('[data-action="mission-stop"]').focus();
    }
  } else if (a === 'mission-stop-go') {
    if (world.safetyActions && world.safetyActions.cancelMission()) setOpen(false);
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
  root.querySelector('[data-game-status]').textContent = text;
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
  const subs = subsOf(of);
  if (SUB_ALIAS[of] && SUB_ALIAS[of][name]) name = SUB_ALIAS[of][name];
  if (!subs.some(([id]) => id === name)) name = subs[0][0];
  for (const b of root.querySelectorAll(`[data-subtab][data-of="${of}"]`)) b.setAttribute('aria-selected', String(b.dataset.subtab === name));
  for (const p of root.querySelectorAll(`[data-sub][data-of="${of}"]`)) p.hidden = p.dataset.sub !== name;
  if (of === 'verhaal' && pref.sub[of] === 'aanwijzingen' && name !== 'aanwijzingen') { markCluesSeen(); syncNavBadges(); } // nieuw blijft staan zolang je op het tabblad bent, weg als je het verlaat (#435)
  if (pref.sub[of] !== name) { pref.sub[of] = name; savePref(); }
  const panel = root.querySelector(`[data-panel="${of}"]`);
  if (panel) panel.scrollTop = 0;
  if (of === 'todo' && name === 'verhaal') { markCluesSeen(); syncNavBadges(); }
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
  out.push(['unstuck', icon('help'), 'Vastgelopen? Zet me vrij']);
  return out;
}

// the running mission, for the "Missie stoppen" row of Overzicht (#390): null when no mission runs
function stopInfo() {
  const w = world;
  if (!w || !w.safetyActions || !w.safetyActions.missionActive()) return null;
  return { title: (w.mission && w.mission.label) || 'de missie' };
}

function renderOverviewPanel() {
  const el = root.querySelector(OV_SUB);
  const quick = `<div class="ov-quick">${slider('masterVolume', 'Hoofdvolume')}${slider('musicVolume', 'Muziek')}${slider('sfxVolume', 'Effecten')}${toggle('reduceMotion', 'Beweging beperken', 'Minder bewegende beelden en schermschudden')}</div>`;
  try { renderOverview(el, world, helpButtons(), { play: getPlaySeconds(), quick, stop: stopInfo() }); syncControls(); } catch (err) { console.error('overzicht', err); }
  const r = getDiscoveredRatio();
  const s = getSaveSummary();
  const ago = s ? Math.round((Date.now() - s.savedAt) / 60000) : -1;
  sheetNote([`${storyDate(world).long} ${getClockText(world)}`.trim(), r >= 0.01 ? `${Math.round(r * 100)}% van Grunn verkend` : '',
    ago < 0 ? '' : ago < 1 ? 'net opgeslagen' : ago < 120 ? `laatst opgeslagen ${ago} min geleden` : ''].filter(Boolean).join(' · '));
}

function renderTodoPanel() {
  const panel = root.querySelector('[data-panel="todo"]');
  const view = pref.sub.todo || 'alles';
  try {
    renderTodo(panel, world, view);
    const sum = todoSummary(world);
    for (const [id] of SUBTABS.todo) { const c = panel.querySelector(`[data-count="${id}"]`); if (c) c.textContent = sum[id]; }
    if (tab === 'todo') sheetNote(sum.subTodo);
  } catch (err) { console.error('te doen', err); }
}

// After a choice in Overzicht or Te doen: render again and put the focus
// back on the same control (by its data attributes).
function rerenderTodo(keep) {
  if (!open) return;
  const el = keep && keep.nodeType === 1 ? keep : document.activeElement;
  const sel = el && root.contains(el) ? [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('') : '';
  if (tab === 'spel') renderOverviewPanel();
  else if (tab === 'loopbaan') renderLoopbaanPanel(root.querySelector('[data-panel="loopbaan"] .pm-inner'), closePauseMenu, world);
  else if (tab === 'todo') renderTodoPanel();
  else if (tab === 'verhaal') renderVerhaalPanel();
  const back = sel && activePanel().querySelector(sel);
  if (back) back.focus({ preventScroll: true });
}

function syncNavBadges() {
  let fresh = false;
  try { fresh = getStoryJournal().found.some((c) => c.isNew); } catch (e) { /* story not ready */ }
  const nav = root.querySelector('[data-goto="todo"]');
  if (nav) nav.toggleAttribute('data-new', false);
  const met = anyFresh();
  const vNav = root.querySelector('[data-goto="verhaal"]');
  if (vNav) vNav.toggleAttribute('data-new', fresh || met);
  const unreadN = world ? phoneUnread(world) : 0;
  const unread = unreadN > 0;
  const vPeople = root.querySelector('[data-of="verhaal"][data-subtab="personages"]');
  if (vPeople) vPeople.toggleAttribute('data-new', met || unread);
  const vClues = root.querySelector('[data-of="verhaal"][data-subtab="aanwijzingen"]');
  if (vClues) vClues.toggleAttribute('data-new', fresh);
  const setN = (id, text, label) => { const n = root.querySelector(`[data-n="${id}"]`); if (n) { if (id === 'spel' && text) n.innerHTML = `${icon('spelers', 'pm-ic n-ic')}${text}`; else n.textContent = text; // het aantal spelers met een poppetje (#435)
         if (label) n.setAttribute('aria-label', label); else n.removeAttribute('aria-label'); } };
  // unseen achievements: a quiet dot on the rail, never a HUD notice (#168)
  const aNav = root.querySelector('[data-goto="prestaties"]');
  if (aNav) aNav.toggleAttribute('data-new', unseenAchievementCount() > 0);
  // samen spelen is geen rijknop meer: de rail toont bij Spel hoeveel spelers er zijn
  const coopN = world && world.coopNet && world.coopSpelers ? world.coopSpelers.length : 0;
  setN('spel', coopN ? String(coopN) : '', coopN ? `${coopN} spelers` : '');
  setN('todo', fresh ? 'nieuw' : '');
  setN('verhaal', unread ? String(unreadN) : fresh || met ? 'nieuw' : '', unread ? `${unreadN} ongelezen` : '');
  if (vNav && unread) vNav.toggleAttribute('data-new', true);
}

if (typeof document !== 'undefined') document.addEventListener('gde-nieuw-gezien', () => { if (root) syncNavBadges(); });

// Berichten en bellen staan onder een personage (verhaalui.js, phone.js): opnieuw tekenen na een gesprek of bericht
function renderPhone() {
  const block = root.querySelector('[data-vh-phone]');
  try {
    if (block && tab === 'verhaal') renderVerhaal(activePanel(), 'personages', world);
  } catch (err) { console.error('telefoon', err); }
  syncNavBadges();
}

// Spel: het tabblad Overzicht tekent zich opnieuw, de rest houdt zijn vaste inhoud (#430)
function afterSpelSub() {
  const sub = pref.sub.spel;
  if (sub === 'overzicht') renderOverviewPanel();
  else {
    sheetNote('');
    // Samen spelen en het speleroverzicht (samenpanel.js, coopspelersui.js) tekenen zich in hun eigen tabblad
    if (sub === 'samen') renderSamenPanel(root.querySelector('[data-of="spel"][data-sub="samen"]'), world, closePauseMenu);
    if (sub === 'spelers') renderSpelersPanel(root.querySelector('[data-of="spel"][data-sub="spelers"]'), world, closePauseMenu);
  }
  syncFooter();
}

function renderVerhaalPanel() {
  const panel = root.querySelector('[data-panel="verhaal"]');
  try {
    const view = pref.sub.verhaal || 'opdrachten';
    if (view === 'opdrachten') {
      // de lijst met opdrachten is van Te doen (todoui.js); het 3D-model van Personages gaat weg
      disposeVerhaalViewer();
      for (const sub of panel.querySelectorAll('[data-of="verhaal"][data-sub]:not([data-keep])')) sub.innerHTML = '';
      renderTodoStory(panel.querySelector('[data-sub="opdrachten"]'), world);
    } else renderVerhaal(panel, view, world);
    if (tab === 'verhaal') sheetNote(view === 'opdrachten' ? todoSummary(world).sub : verhaalSummary());
  } catch (err) { console.error('verhaal', err); }
  syncNavBadges();
}

function syncSaveButtons() {
  if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om op te slaan; je poepscore gaat mee in je savegame.'); return; }
  const saved = hasSave();
  for (const b of root.querySelectorAll('[data-action="load"]')) b.disabled = !saved;
  const s = getSaveSummary();
  if (s && !root.querySelector('[data-game-status]').textContent) {
    const d = new Date(s.savedAt);
    status(`Laatst opgeslagen: ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`);
  }
}

function syncRail() {
  const pigeon = !!(world && world.pigeonMode);
  for (const b of root.querySelectorAll('[data-panel="spel"] [data-action="save"], [data-panel="spel"] [data-action="saves"]')) b.disabled = pigeon;
  root.querySelector('[data-restart-confirm]').hidden = true;
  root.querySelector('[data-game-status]').textContent = '';
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
  if (tab === 'garage' || tab === 'prestaties') {
    const s = activePanel().querySelector('.pm-inner');
    if (s && s.dataset.sub) sheetNote(s.dataset.sub);
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
  let hints = HINTS[atHome() ? 'overzicht' : tab] || HINTS.overzicht;
  if (prestart) hints = hints.map(([k, l, a]) => [k, l, a === 'resume' ? 'back' : a]);
  root.querySelector('.pm-footer').innerHTML = hints.map((h) => hintHtml(h, pad, back)).join('');
}

function showTab(name, how) {
  const ids = sectionIds();
  // de oude namen: Overzicht is Spel > Overzicht, de telefoon is Verhaal > Contacten of Berichten, cheats zijn een onderdeel van Instellingen
  if (name === 'overzicht' || name === 'game') { pref.sub.spel = 'overzicht'; name = 'spel'; }
  if (name === 'telefoon') { pref.sub.verhaal = 'personages'; name = 'verhaal'; }
  if (name === 'missions') name = 'todo';
  if (name === 'cheats') name = 'streken';
  if (name === 'samen' || name === 'samenspelen' || name === 'spelers') { pref.sub.spel = name === 'spelers' && world && world.coopNet ? 'spelers' : 'samen'; name = 'spel'; }
  if (name === 'jobs') { pref.sub.todo = 'alles'; name = 'todo'; }
  if (!ids.includes(name)) name = prestart ? 'settings' : HOME;
  if (how) origin = how;
  const prev = tab;
  tab = name;
  setPauseMenuTabState(name);
  root.dataset.activeTab = name;
  root.dataset.coop = world && world.coopNet ? '1' : '0';
  for (const b of root.querySelectorAll('.pm-game [data-goto]')) {
    b.setAttribute('aria-current', String(b.dataset.goto === (CHILD[name] || name)));
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
  if (name !== 'map') sheetNote('');
  root.querySelector('[data-action="reset"]').hidden = name !== 'settings';
  if (prev !== name) {
    sheet.classList.remove('pm-enter', 'pm-swap');
    void sheet.offsetWidth;
    sheet.classList.add('pm-swap');
  }
  if (!prestart && !atHome() && pref.last !== name) { pref.last = name; savePref(); }
  if (name === 'map') {
    const r = getDiscoveredRatio();
    sheet.querySelector('.pm-sheet-eb').hidden = r < 0.01;
    if (r >= 0.01) sheet.querySelector('.pm-sheet-eb').textContent = `${Math.round(r * 100)}% van Grunn verkend`;
  } else sheet.querySelector('.pm-sheet-eb').hidden = true;
  if (name === 'todo') { showSubtab('todo', pref.sub.todo || 'alles'); renderTodoPanel(); }
  if (name === 'spullen') renderSpullenPanel();
  if (name === 'garage') { renderGaragePanel(garageEl(), world); syncSheetSub(); }
  if (name === 'verhaal') { showSubtab('verhaal', pref.sub.verhaal || 'opdrachten'); renderVerhaalPanel(); }
  if (name === 'streken') { if (prev !== 'streken') resetCheatsPanel(); renderCheats(); }
  if (name === 'fotos') renderFotoPanel(root.querySelector('[data-panel="fotos"] .pm-inner'));
  if (name === 'prestaties') { renderAchievementsPanel(root.querySelector('[data-panel="prestaties"] .pm-inner')); syncSheetSub(); }
  if (name === 'loopbaan') renderLoopbaanPanel(root.querySelector('[data-panel="loopbaan"] .pm-inner'), closePauseMenu, world);
  if (name === 'visboek') renderVisboekPanel(root.querySelector('[data-panel="visboek"] .pm-inner'));
  if (name === 'boerderij') renderBoerderijPanel(root.querySelector('[data-panel="boerderij"] .pm-inner'), world);
  if (name === 'controls') { const q = root.querySelector('[data-controls-search]'); q.value = ''; filterControls(''); showSubtab('controls', pref.sub.controls || 'toetsen'); bindMsg = ''; renderBinds(); }
  if (prev === 'controls' && name !== 'controls') cancelRebind();
  if (name === 'spel') { showSubtab('spel', pref.sub.spel || subsOf('spel')[0][0]); syncControls(); syncSaveButtons(); afterSpelSub(); }
  if (name === 'spel') { const sp = root.querySelector('[data-of="spel"][data-subtab="spelers"]'); if (sp) sp.hidden = !(world && world.coopNet); }
  if (name === 'settings') { showSubtab('settings', pref.sub.settings || 'video'); syncControls(); syncDesktopControls(); }
  if (prev !== name) { const p = activePanel(); if (p) p.scrollTop = 0; }
}

// Opens the menu on a section ('overzicht' by default); with { prestart: true }
// only Instellingen and Besturing (start screen). openPauseMenu('todo', { select })
// opens Te doen on one item.
export function openPauseMenu(name = HOME, opts = {}) {
  if (opts.prestart) prestart = { onClose: opts.onClose || null };
  if (name === 'overzicht') { pref.sub.spel = 'overzicht'; name = 'spel'; }
  if (name === 'cheats') name = 'streken';
  if (name === 'samen' || name === 'samenspelen' || name === 'spelers') { pref.sub.spel = name === 'spelers' && world && world.coopNet ? 'spelers' : 'samen'; name = 'spel'; }
  if (opts.sub && SUBTABS[name]) pref.sub[name] = opts.sub;
  if (opts.select) selectTodo(opts.select);
  if (opts.view) pref.sub.todo = opts.view;
  if (opts.thread) { selectPhoneThread(opts.thread); selectVerhaalCharacter(characterForSender(opts.thread)); pref.sub.verhaal = 'personages'; if (name === 'telefoon') name = 'verhaal'; }
  if (name === 'telefoon') { pref.sub.verhaal = 'personages'; name = 'verhaal'; }
  setOpen(true, name, 'direct');
}

export function closePauseMenu() {
  setOpen(false);
}
setPauseMenuControls({ openPauseMenu, closePauseMenu });

function setOpen(value, name = HOME, how = 'direct') {
  if (!root) return;
  if (value && !started() && !prestart) return;
  if (open === value) {
    if (value) { showTab(name, how); focusSheet(); }
    return;
  }
  if (!value) { try { markCluesSeen(); } catch (e) { /* verhaal niet klaar */ } }
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
    setPauseMenuTabState(null);
    refreshInfo();
    syncRail();
    showTab(name, how);
    if (atHome()) focusEl(root.querySelector(`${OV_SUB} [data-action="resume"]`) || root.querySelector('[data-action="resume"]'));
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
