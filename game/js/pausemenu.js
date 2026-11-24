// The pause menu: one overlay over the game (the city keeps rendering behind
// it). A fixed rail on the left (Doorgaan, the sections, Opslaan/Laden,
// Naar het hoofdmenu) never changes shape; the sheet beside it shows one section.
// Esc opens on Overzicht; from another section Esc/Backspace go back to it,
// then close. Sections: Overzicht, Te doen (todoui.js), Verhaal
// (verhaalui.js), Kaart, Garage, Prestaties, Cheats (cheatsui.js),
// Instellingen, Besturing.
import { keyLabelHtml, braceKeysHtml, hintCapHtml } from './keycap.js';
import { getSettings, setSetting, resetSettings, resetSettingsKeys, defaultSettings, QUALITY_PRESETS } from './settings.js';
import { TAB_KEYS, changedPerTab, changedKeys, resetMessage, dependencies, silenceWarning, synonymsFor, cheatsVisible, COLOR_BLIND_LABELS, shakePreviewPx } from './settingsrules.js';
import { effectsFor } from './a11ylogic.js';
import { reducedMotion } from './motion.js';
import { retryBeschikbaar, herstartMissie, herstartBlokkade } from './missions.js';   // #985 punt 16
import { changeWithGroup } from './difficultyvote.js'; // moeilijkheid van de wereld is een gezamenlijke keuze
import { difficultyTabHtml, difficultyPaneHtml, syncDifficultyTab, stepDifficultyPicker, handleDifficultyClick } from './difficultypanel.js'; // #1169: Instellingen > Moeilijkheid, per save
import { logoHtml } from './logo.js';
import { setPauseMenuOpen, setPauseMenuTabState, setPauseMenuControls } from './pausestate.js';
import { uitlegBlok, zetUitlegGlyph, startUitleg, resetUitlegNietMeer } from './uitleg.js';
import { PRESET_ORDER, presetLabel, PRESET_HINTS, describePreset, describeChanges, currentPreset, applyPreset, getBenchResult, dismissBenchBanner, GEAR_SVG, measureAutoPreset, autoGfxNote, autoGfxLabel } from './gfxprofile.js';
import { mountMapView, kaartUitlegSluiten, kaartReisPopupSluiten, kaartPlekkaartSluiten, kaartToets, setMapActive, setMapCloseHandler, setMapView, getDiscoveredRatio, setMapTeleport } from './mapview.js';
import { mountOnlineInstelling } from './onlineconsentui.js';
import { renderSamenPanel, requestOpenSamen, samenHubTerug } from './samenpanel.js';
import { isSoloHost, stopSoloHost } from './coopsolo.js';
import { renderVeroverdPanel } from './veroverdpanel.js';
import { renderSpelersPanel } from './coopspelersui.js';
import { renderCheatsPanel, cheatsClick, resetCheatsPanel, cheatsFocus } from './cheatsui.js';
import { cheatsOpen, anyCheatOn } from './cheats.js';
import { skipCurrent } from './story.js';
import { saveGame, hasSave, loadLatestSave, startNewSlot, coopSessieLoopt, GAST_BEWAARD_TEKST, getSaveSummary, getPlaySeconds, loadSlot, currentSlot, saveGameEchtBewaard, preventCloseSave, saveFailReason } from './savegame.js';
import { openSaveSlots, isSaveSlotsOpen } from './saveslotsui.js';
import { stopCoopNet } from './coopnet.js';
import { coopLoadTekst, coopActieTekst, COOP_LOAD_FAIL, COOP_ACTIE_FAIL, runCoopLoad, runCoopStop } from './cooploadrules.js';
import { getClockText } from './clocktext.js';
import { openCardLog } from './hudcards.js';
import { hoofdspeler } from './players.js'; // de speler van dit apparaat (#500)
import { VERSION } from './version.js';
import { loadChangelogVersions, allVersionsHtml, overBodyHtml, newsOnStart, CREDITS_HTML, LICENSES_HTML } from './over.js';
import { versionLabel } from './menumodels.js';
import { storyDate } from './calendarday.js';
import { isCinematicActive } from './cinematics.js';
import { renderAchievementsPanel } from './achievementsui.js';
import { trackTabLine } from './dsmicro.js'; // DS3: de glijdende onderstreping van de tabs (ds-micro.css)
import { renderLoopbaanPanel } from './loopbaanui.js';
import { navIndex } from './listnav.js';
import { renderVisboekPanel } from './visboekui.js';
import { renderBoerderijPanel, boerderijBegonnen, ruimBoerderijPlaatjes } from './boerderijui.js';
import { renderVoetbalPanel } from './voetbalcarriereui.js';
import { renderBezitPanels } from './bezitui.js';
import { getBoerderij } from './boerderijlive.js';
import { unseenAchievementCount } from './achievements.js';
import { renderGaragePanel, selectGarageVehicle, disposeGarageViewer, garageNaarWinkel, turnGarageViewer } from './garageui.js';
import { deliverOwnedVehicle, locateOwnedVehicle, getGarageList, verkoopVoertuig, actieBevestiging } from './ownedvehicles.js';
import { isShopOpen, closeShopMenu } from './shopui.js';
import { benchmarkViaReload } from './trailerstate.js';
import { markStay } from './saveslots.js';
import { prepareBenchmarkReload, BENCH_RELOAD_FAIL_TEXT, BENCH_SAVE_FIRST_TEXT, BENCH_COOP_TEXT } from './benchmarkreturn.js'; // de benchmark laat je save en voortgang met rust
import { radioIsOn, setRadio, channelList, selectChannel, stepChannel } from './radio.js';
import { channelPickerHtml } from './radiokeuze.js';
import { isMuted, toggleMute } from './audio.js';
import { glyphHtml, resetHintUses } from './prompts.js';
import { KEY_ACTIONS, KEY_GROUPS, PAD_REMAPPABLE, PAD_SLOT_NAMES, bindKey, bindButton, physicalKey, defaultKey, physicalButton, isBindableKey, keyName, slotUses, slotUseParts } from './controls.js';
import { capturePadButton, isPadActive, onPadChange } from './gamepad.js';
import { mapControlList, stepMapControls, toggleMapControls } from './padmapnav.js';
import { padGlyphInner } from './glyphs.js';
import { icoon } from './icons.js';
import { oskKnop } from './oskview.js';
import { touchPlan, touchMore, defaultControlsSubtab } from './touchlogic.js';
import { openPadTest } from './padtest.js';
import { isHelpOfferOpen } from './assistlive.js';
import { isRecapOpen } from './recapstate.js';
import { resetOnboarding } from './onboarding.js';
import { explanationResetMessage } from './onboardinglogic.js';
import { resetContextHints } from './contexthints.js';
import { menuMelding } from './menumelding.js';
import { sectionVisible, subVisible } from './featurereveal.js'; // 22-11: wat het verhaal nog niet liet zien staat niet in het menu
import { getUiScale } from './uiscale.js';
import { helpHtml } from './helpoverview.js';
import { DEV, FLAGS } from './devflags.js';
import { renderOverview, renderTodo, renderTodoStory, todoClick, todoFocus, todoEnter, todoSummary, selectTodo, setTodoFilter, foldNote } from './todoui.js';
import { isPlayAheadOpen } from './todo.js';
import { renderVerhaal, verhaalClick, verhaalSummary, disposeVerhaalViewer, selectVerhaalCharacter } from './verhaalui.js';
import { anyFresh } from './characters.js';
import { maakRegel, zoekRegels, SOORTEN } from './pausesearch.js';
import { renderSpullen, disposeSpullenViewer, turnSpullenViewer, spullenClick, spullenFocus, spullenEnter, spullenAnnuleer, spullenNavigeer, zetSpullenZoek, DELEN } from './spullen.js';
import { CAT_ICOON, ICOON_TERUGVAL } from './spullenmodel.js';
import { phoneClick, phoneUnread, characterForSender } from './phone.js';
import { takeNoticeThread } from './phonefeed.js';
import { getErrorLog, errorReport, clearErrorLog, onErrorLogChange } from './errorlog.js';
import { KEYS } from './storagekeys.js';
import { renderFotoPanel, fotoClick, isPhotoMode } from './fotomodusui.js';
import { gameProgress } from './progresslive.js';
import { progressPartText, tilesShownElsewhere } from './progress.js';
import { woordenVan, past } from './zoektekst.js';
// Running inside the desktop app (desktop/preload.js): window mode + quit.
const DESKTOP = typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? window.gdeDesktop : null;

// Besturing: per situatie bij elkaar (#430), zodat je niet hoeft te zoeken en geen regel twee keer leest.
// [alternatives, description]; an alternative is one token or a combo joined with '+' (tokens as glyphHtml in prompts.js takes them).
const CONTROL_GROUPS = [
  ['voet', 'Te voet', [
    [['WASD'], 'Lopen en draaien'],
    [['MOUSE'], 'Camera draaien'],
    [['SHIFT'], 'Rennen'],
    [['SPACE'], 'Springen'],
    [['CTRL'], 'Bukken'],
    [['E', 'F'], 'Gebruiken'],
    [['E'], 'Word een duif'],
    [['K'], 'Kusje geven'],
    [['6'], 'Andere kleren'],
    [['I'], 'Hengelen'],
  ]],
  ['vervoer', 'Vervoer', [
    [['WASD'], 'Rijden en sturen'],
    [['SPACE'], 'Handrem'],
    [['SHIFT'], 'Doortrappen'],
    [['CTRL'], 'Wheelie of stoppie'],
    [['.', ','], 'Schakelen'],
    [['J'], 'Koppeling'],
    [['E', 'F'], 'Uitstappen'],
    [['Q', 'WHEEL'], 'Achterom kijken'],
    [['H'], 'Toeteren'],
    [['L'], 'Sirene'],
    [['[', ']'], 'Richting aangeven'],
    [['P'], 'Alarmlichten'],
    [['C'], 'Eerste persoon'],
    [['V'], 'Filmcamera'],
    [['R'], 'Nieuwe lak'],
    [['Z'], 'Zeil of ploeg'],
    [['X'], 'Aftakas'],
  ]],
  ['vechten', 'Vechten', [
    [['LMB'], 'Aanvallen'],
    [['RMB'], 'Richten'],
    [['TAB'], 'Volgend doel'],
    [['1'], 'Slaan'],
    [['2'], 'Pistool'],
    [['3'], 'Hagelgeweer'],
    [['4'], 'Carbid'],
    [['CTRL+LMB'], 'Carbidbus neerzetten'],
    [['WHEEL'], 'Wapen wisselen'],
  ]],
  ['duif', 'Duif', [
    [['WASD'], 'Lopen en sturen'],
    [['SPACE'], 'Opstijgen'],
    [['SHIFT'], 'Duiken'],
    [['F', 'LMB'], 'Poepen'],
    [['E', 'CTRL'], 'Pikken'],
    [['C'], 'Koeren'],
    [['Q'], 'Zwerm roepen'],
    [['X'], 'Weer mens worden'],
  ]],
  ['samen', 'Samen spelen', [
    [['Y'], 'Stuur geven'],
    [['7'], 'Kom hier'],
    [['8'], 'Help'],
    [['9'], 'Kijk daar'],
    [['T'], 'Snelle zinnen'],
  ]],
  ['menu', 'Menu en radio', [
    [['ESC'], 'Pauzemenu'],
    // #985 punt 9: snelopslaan, zodat een save niet elke keer via het menu hoeft.
    [['F5'], 'Snel opslaan'],
    [['M'], 'Kaart'],
    // #985 punt 1: toets 5 stond wel in KEY_ACTIONS (en werkt), maar niet in dit overzicht: een
    // speler kon hem dus niet vinden. Hij staat bij de kaart, want hij zet een doel op de kaart.
    [['5'], 'Eigen doel op de kaart'],
    [['ARROWS'], 'In het menu: kiezen, {ENTER}: bevestigen'],
    [['Q', 'E'], 'Volgend tabblad of onderdeel'],
    [['[', ']'], 'Zelfde als {Q} en {E}'],
    [['N'], 'Radio aan of uit'],
    [['U'], 'Geluid aan of uit'],
    [['O'], 'Verhaalstap overslaan'],
    [['C'], 'Taxi of trein: andere camera (Y)'],
    [['BACKSPACE'], 'Minigame of dienst stoppen'],
    ...(DESKTOP ? [[['F11'], 'Volledig scherm (ook {ALT}+{ENTER})']] : []),
  ]],
];

// De lange uitleg hoort niet in het Toetsenoverzicht (dat blijft scanbaar, #605) maar in Hulp, per
// dezelfde situatie. Sleutel: de korte actie uit CONTROL_GROUPS hierboven; de waarde is de uitleg
// die vroeger onder de toets stond.
const CONTROL_LONG = [
  ['voet', [
    ['Lopen en draaien', '{WASD} lopen en draaien.'],
    ['Camera draaien', '{MOUSE} draait de camera; houd hem laag om omhoog te kijken.'],
    ['Rennen', 'Rennen: houd {SHIFT} vast.'],
    ['Springen', 'Springen, over hekjes en auto\'s, en uit het water klimmen.'],
    ['Bukken', 'Bukken: houd {CTRL} vast.'],
    ['Gebruiken', 'Instappen, een winkel in, praten of een bijbaantje beginnen.'],
    ['Word een duif', 'Bij een duivenbord: word een duif.'],
    ['Kusje geven', 'Kusje geven aan Tammo of Tessa.'],
    ['Andere kleren', 'Te voet: de volgende outfit uit je kast (bewaar ze in de kast thuis of in Spullen, Outfit 1 tot 5). Kost niets en werkt overal.'],
    ['Hengelen', 'Hengelen, aan elk water (ook vanuit een boot die stilligt).'],
  ]],
  ['vervoer', [
    ['Rijden en sturen', 'Gas, remmen en sturen; heli en vliegtuig: vooruit, achteruit, draaien of rollen; boot en trein: varen en rijden.'],
    ['Handrem', 'Handrem; heli: omhoog; vliegtuig: neus omhoog; trein: noodrem.'],
    ['Doortrappen', 'Op de fiets: even flink doortrappen; op een motor: wheelie met gas, stoppie met remmen; heli: sneller; vliegtuig: remmen.'],
    ['Wheelie of stoppie', 'Op de fiets: wheelie (vasthouden en trappen), stoppie (vasthouden en remmen), een sprongetje (vasthouden en de rem kort aantikken) of zonder handen rijden (vasthouden en snel doortrappen); heli: omlaag; vliegtuig: neus omlaag.'],
    ['Schakelen', 'Handmatig schakelen: hoger en lager (Instellingen › Schakelen).'],
    ['Koppeling', 'Handmatig met koppeling: de koppeling indrukken bij het schakelen.'],
    ['Achterom kijken', 'Achterom kijken: houd {Q} vast, of druk op {WHEEL}.'],
    ['Sirene', 'Zwaailicht en sirene (politieauto, ambulance).'],
    ['Richting aangeven', 'Richtingaanwijzer links en rechts (nog eens: uit; na de bocht gaat hij vanzelf uit).'],
    ['Eerste persoon', 'Eerste persoon aan of uit: de camera op de ogen van je figuur, met een vrije blik. De BINNENIN-filmcamera blijft via {V} bereikbaar.'],
    ['Nieuwe lak', 'Nieuwe lak bij Spuit & Klaar, of het garagemenu in een garage.'],
    ['Zeil of ploeg', 'Skûtsje: zeil vieren; trekker: ploeg aankoppelen, omhoog of omlaag.'],
    ['Aftakas', 'Trekker: aftakas aan of uit.'],
  ]],
  ['vechten', [
    ['Aanvallen', 'Aanvallen, schieten, gooien.'],
    ['Richten', 'Richten; jachtgeweer: door de kijker.'],
    ['Volgend doel', 'Tijdens het richten: volgend doelwit (of {MOUSE} snel opzij).'],
    ['Slaan', 'Slaan: vuisten, knuppel, hockeystick, bezem, fietspomp, klomp, polsstok (nog eens: wisselen).'],
    ['Pistool', 'Pistool, uzi, waterpistool.'],
    ['Hagelgeweer', 'Hagelgeweer, jachtgeweer.'],
    ['Carbid', 'Carbidbus, vuurwerkpijlen.'],
    ['Wapen wisselen', 'Volgend of vorig wapen ({WHEEL}).'],
  ]],
  ['duif', [
    ['Lopen en sturen', 'Lopen; in de lucht: sturen.'],
    ['Opstijgen', 'Opstijgen, klapwieken.'],
    ['Pikken', 'Pikken, opeten, landen.'],
    ['Zwerm roepen', 'De zwerm roepen of wegsturen.'],
    ['Weer mens worden', 'Weer mens worden.'],
  ]],
  ['samen', [
    ['Stuur geven', 'Het stuur aan je bijrijder geven of terugnemen; als bijrijder erom vragen of het teruggeven.'],
    ['Kom hier', 'Roepen: Kom hier (een baken voor iedereen).'],
    ['Help', 'Roepen: Help!'],
    ['Kijk daar', 'Roepen: Kijk daar (een stuk voor je uit).'],
  ]],
  ['menu', [
    ['Pauzemenu', 'Pauzemenu openen; in het menu: terug.'],
    ['Kiezen', 'In het menu: kiezen, {ENTER}: bevestigen.'],
    ['Verhaalstap overslaan', 'De verhaalstap overslaan (als dat in beeld staat).'],
    ['Minigame stoppen', 'Een minigame of dienst stoppen.'],
    ['Geluid', 'Geluid uit of weer aan; staat het uit, dan staat linksboven een luidspreker met een streep, met de knop erbij.'],
    ['Volledig scherm', 'Volledig scherm (ook Alt+{ENTER}).'],
  ]],
];
// Betekenisnamen (icons.js, Phosphor): de koppen van het Toetsenoverzicht.
const GROUP_ICONS = { voet: 'lopen', vervoer: 'auto', vechten: 'doel', duif: 'duif', samen: 'samen', menu: 'telefoon' };
// the controller table (controls.js PAD_MAPS) each group shows when a pad is in use
const GROUP_CTX = { voet: 'foot', vervoer: 'vehicle', vechten: 'foot', duif: 'pigeon', samen: 'foot', menu: 'menu' };
const MOUSE_WORDS = { LMB: 'linkermuisknop klik', RMB: 'rechtermuisknop', MOUSE: 'muis', WHEEL: 'scrollwiel middelste muisknop', SPACE: 'spatie', CTRL: 'ctrl control', SHIFT: 'shift', ESC: 'esc escape', WASD: 'w a s d wasd', ARROWS: 'pijltjes pijltjestoetsen' }; // keywords-ok: zoekwoorden, geen weergave

const altKeys = (a) => a.split('+').map((t) => glyphHtml(t)).join('<span class="pm-k-sep">+</span>');
// #605: de lange uitleg van een situatie, per korte actie. Stond vroeger onder elke toets in het
// Toetsenoverzicht; daar is het nu te druk voor, dus het staat op één plek: het tabblad Hulp.
const longRowsFor = (gid) => (CONTROL_LONG.find(([id]) => id === gid) || ['', []])[1];
const longTextFor = (gid, desc) => (longRowsFor(gid).find(([d]) => d === desc) || [])[1] || '';
// Een toets in de lange uitleg staat als token ({SHIFT}, {ENTER}), net als in Hulp; nooit als
// losse letter, zodat herbinden en het glyph van het actieve apparaat vanzelf volgen.
const keyText = (t) => esc(t).replace(/\{([A-Z0-9]+)\}/g, (_, k) => glyphHtml(k));

// Het Toetsenoverzicht: per situatie alleen "toets + korte actie", scanbaar en binnen het
// woordbudget van een naslagscherm (#605). De volledige uitleg staat in Hulp (controlsHelpHtml).
function controlsHtml() {
  return CONTROL_GROUPS.map(([id, title, rows]) => `<section class="pm-cgroup" data-cgroup="${id}" data-pad-ctx="${GROUP_CTX[id] || 'foot'}" tabindex="0" aria-label="${esc(title)}">` +
    `<h3>${icoon(GROUP_ICONS[id], { cls: 'pm-ic' })}${esc(title)}</h3>` +
    rows.filter(([keys]) => keys[0] !== 'K' || (world && world.kissUnlocked)).map(([keys, desc]) => {
      const words = keys.flatMap((k) => k.split('+')).map((t) => MOUSE_WORDS[t] || t).join(' ');
      const lang = longTextFor(id, desc);
      return `<div class="pm-crow" data-search="${esc((title + ' ' + desc + ' ' + lang + ' ' + words).toLowerCase())}">` +
        `<span class="pm-ckeys">${keys.map(altKeys).join('<span class="pm-k-sep">/</span>')}</span><span class="pm-cdesc">${esc(desc)}</span></div>`;
    }).join('') + '</section>').join('');
}

// Dezelfde indeling als het overzicht, met de lange uitleg erbij (tabblad Hulp). Zo staat elke
// uitleg op één plek en blijft het overzicht kort.
function controlsHelpHtml() {
  return CONTROL_GROUPS.map(([id, title, rows]) => {
    const lang = rows.filter(([, desc]) => longTextFor(id, desc));
    if (!lang.length) return '';
    return `<section class="pm-cgroup pm-help" data-help="toetsen-${id}" tabindex="0" aria-label="${esc(title)}">` +
      `<h3>${esc(title)}</h3>` + lang.map(([keys, desc]) => {
        const words = keys.flatMap((k) => k.split('+')).map((t) => MOUSE_WORDS[t] || t).join(' ');
        return `<div class="pm-crow" data-search="${esc((title + ' ' + desc + ' ' + longTextFor(id, desc) + ' ' + words).toLowerCase())}">` +
          `<span class="pm-ckeys">${keys.map(altKeys).join('<span class="pm-k-sep">/</span>')}</span>` +
          `<span class="pm-cdesc"><b class="one">${esc(desc)}</b> ${keyText(longTextFor(id, desc))}</span></div>`;
      }).join('') + '</section>';
  }).join('');
}

// Aanraken (#605): welke knoppen er op het scherm staan, per situatie. De indeling komt uit
// dezelfde bron als de touchbalk zelf (touchlogic.js touchPlan/touchMore), zodat het overzicht
// niet kan afwijken van wat een touchspeler ziet.
const TOUCH_CTX = [
  ['foot', 'Te voet'],
  ['vehicle', 'In een auto'],
  ['bus', 'In de bus'],
  ['trekker', 'Op de trekker'],
  ['heli', 'In een helikopter'],
  ['plane', 'In een vliegtuig'],
  ['skutsje', 'In een skûtsje'],
  ['train', 'In de trein'],
  ['pigeon', 'Als duif'],
];
function touchOverviewHtml() {
  const plaats = { left: 'linksonder', right: 'rechtsonder' };
  return TOUCH_CTX.map(([ctx, title]) => {
    const plan = touchPlan(ctx);
    const more = touchMore(ctx);
    if (!plan.length && !more.length) return '';
    const rij = (label, waar) => `<div class="pm-crow" data-search="${esc((title + ' ' + label + ' ' + waar).toLowerCase())}">` +
      `<span class="pm-ckeys"><span class="m-kc pm-touchcap">${esc(label)}</span></span><span class="pm-cdesc">${esc(waar)}</span></div>`;
    return `<section class="pm-cgroup" data-cgroup="touch-${ctx}" tabindex="0" aria-label="${esc(title)}">` +
      `<h3>${esc(title)}</h3>` +
      '<div class="pm-crow"><span class="pm-ckeys"><span class="m-kc pm-touchcap">Stok</span></span><span class="pm-cdesc">Links: lopen of sturen; rechts: om je heen kijken</span></div>' +
      plan.map((b) => rij(b.label, plaats[b.side] || 'op het scherm')).join('') +
      (more.length ? `<div class="pm-crow"><span class="pm-ckeys"><span class="m-kc pm-touchcap">Meer</span></span><span class="pm-cdesc">${more.map((m) => esc(m.label)).join(', ')}</span></div>` : '') +
      '</section>';
  }).join('');
}

function filterControls(q) {
  const panel = root.querySelector('[data-panel="controls"]');
  const words = woordenVan(q);
  const hits = {};
  for (const g of panel.querySelectorAll('.pm-cgroup')) {
    const sub = g.closest('[data-sub]');
    const key = sub ? sub.dataset.sub : 'overzicht';
    if (g.classList.contains('pm-help')) {
      // de hulpblokken hebben geen toetsrijen: ze tellen mee op hun eigen tekst
      const hit = past(g.textContent, words);
      g.hidden = !hit;
      if (hit) hits[key] = (hits[key] || 0) + 1;
      continue;
    }
    let n = 0;
    for (const r of g.querySelectorAll('.pm-crow')) {
      const hit = past(r.dataset.search, words);
      r.hidden = !hit;
      if (hit) n++;
    }
    g.hidden = !n;
    if (n) hits[key] = (hits[key] || 0) + n;
  }
  for (const [k, v] of Object.entries(filterBinds(words))) if (v) hits[k] = (hits[k] || 0) + v;
  // #605: elke plek zegt het als er niets gevonden is, niet alleen het Toetsenoverzicht
  for (const el of panel.querySelectorAll('.pm-cempty')) {
    const sub = el.closest('[data-sub]');
    if (sub) el.hidden = !!(hits[sub.dataset.sub]);
  }
}
// dezelfde zoekopdracht op de rijen van Toetsenbord en muis, Controller en Aanraken (#435, #605)
function filterBinds(words) {
  const panel = root.querySelector('[data-panel="controls"]');
  const out = {};
  for (const sub of panel.querySelectorAll('[data-sub="toetsen"], [data-sub="knoppen"]')) {
    let kop = null, n = 0;
    const sluitKop = () => { if (kop) kop.hidden = !n; };
    for (const el of sub.querySelectorAll('.m-gh, .pm-bind')) {
      if (el.classList.contains('m-gh')) { sluitKop(); kop = el; n = 0; continue; }
      const hit = past(el.textContent, words);
      el.hidden = !hit;
      if (hit) n++;
    }
    sluitKop();
    out[sub.dataset.sub] = n;
  }
  return out;
}

// Menu-icoon-id naar betekenisnaam (icons.js, Phosphor, ADR 0041).
const ICONS = { resume: 'hervat', save: 'opslaan', load: 'laden', restart: 'herstart', help: 'hulp', home: 'thuis', abort: 'stop', bird: 'duif', menu: 'menu', exit: 'uitgang', back: 'terug', next: 'volgende', search: 'zoek', map: 'kaart', overzicht: 'overzicht', todo: 'todo', verhaal: 'verhaal', garage: 'garage', fotos: 'fotos', prestaties: 'prestaties', loopbaan: 'loopbaan', visboek: 'visboek', boerderij: 'boerderij', voetbal: 'spel', streken: 'streken', spel: 'spel', settings: 'instellingen', controls: 'besturing', mute: 'geluid_uit', spullen: 'spullen', telefoon: 'telefoon', solo: 'solo', new: 'nieuw', news: 'nieuws', about: 'over', spelers: 'spelers', veroverd: 'veroverd', samen: 'samen', sorteer: 'lijst' };
// An icon of the pause menu's set for the main menu's items, or '' for an unknown name.
export const menuIcon = (id, cls = 'ss-ic') => (ICONS[id] ? icon(id, cls) : '');
const icon = (id, cls = 'pm-ic') => icoon(ICONS[id] || 'vraag', { cls });
const qBtn = (action, ic, label, cls = 'pm-secondary', extra = '') =>
  `<button type="button" class="${cls}" data-action="${action}"${extra}>${icon(ic)}<span>${label}</span></button>`;

// [id, label, hint under the title in the sheet]
const SECTIONS = [
  ['spel', 'Spel', 'Doorgaan, samen spelen en je spel opslaan'],
  ['verhaal', 'Verhaal', 'Opdrachten, personages en berichten'],
  ['todo', 'Activiteiten', 'Klussen, minigames en evenementen in de buurt'],
  ['loopbaan', 'Loopbanen', 'Je vakken, bijbanen, vissen en boerderij'],
  ['map', 'Kaart', 'Kies een doel of zoek een plek'],
  ['spullen', 'Spullen', 'Alles wat je hebt'],
  ['garage', 'Garage', 'Jouw voertuigen'],
  ['veroverd', 'Veroverd', 'Je gebieden en wat meetelt'],
  ['prestaties', 'Prestaties', 'Wat je gehaald hebt en nog kunt halen'],
  ['fotos', "Foto's", 'Fotomodus en je galerij'],
  ['settings', 'Instellingen', 'Alles wat je ziet, hoort en bestuurt'],
  ['over', 'Over', 'Nieuws, credits, versie en licenties'],
  // onderdelen onder een ander onderdeel (CHILD), niet los in de rail
  ['visboek', 'Visboek', 'Alle vis van de provincie, van jou'],
  ['boerderij', 'Land en bedrijf', 'Boerderij, percelen, bedrijven en wat te koop is'],
  ['voetbal', 'Voetbal', 'Je club, selectie, kalender en stand'],
  ['controls', 'Besturing', 'Toetsen en knoppen aanpassen en nalezen'],
  ['streken', 'Cheats', 'Een beetje vals spelen'],
];
// #911: de rail heeft zichtbare groepen met een eigen kop (sinds 20-11: Spel, Doen, Bezit, Voortgang, Systeem)
// en het aantal onderdelen erachter, zodat je ziet hoeveel er is, waar het staat en waar het bij hoort. Over hangt onder Instellingen (een rij in
// dat blad), want de rail houdt zijn vaste, scanbare vorm (#601). Cheats staat sinds #435
// naast Instellingen: het was te verstopt onder Instellingen > Cheats.
const RAIL_GROUPS = [
  ['spel', 'Spel', ['spel']],
  ['doen', 'Doen', ['verhaal', 'todo', 'loopbaan', 'map']],
  ['bezit', 'Bezit', ['spullen', 'garage', 'boerderij']],
  ['voortgang', 'Voortgang', ['veroverd', 'prestaties', 'fotos']],
  ['systeem', 'Systeem', ['settings', 'streken']],
];
// Onderdelen zonder eigen plek in de rail die onder een ander onderdeel hangen (#430): Vissen en Farmen horen bij Loopbaan
// (de tegels Bezigheden), de toetsen en knoppen bij Instellingen > Besturing. De rail markeert de ouder; Terug gaat naar de ouder.
const CHILD = { visboek: 'loopbaan', voetbal: 'loopbaan', controls: 'settings' };
const PRESTART_SECTIONS = ['spel', 'settings', 'controls'];
const SUBTABS = {
  verhaal: [['opdrachten', 'Opdrachten'], ['personages', 'Personages']],
  // #890/#897: Spel gaat over je spel zelf (overzicht, samen spelen, opslaan en stoppen).
  // Hoe het spel speelt (verkeer, rijden, de kaart), hoe je kijkt en hoe de uitleg in beeld staat,
  // zijn instellingen: die staan onder Instellingen (#979: Camera en Hints horen daar, niet als
  // losse Spel-tabs).
  spel: [['overzicht', 'Overzicht'], ['samen', 'Samen spelen'], ['acties', 'Opslaan & stoppen']],
  // Samen spelen heeft twee eigen tabbladen (#434): uitnodigen en de spelerslijst. De lijst is geen
  // los tabblad van Spel en geen rijknop in de rail; hij hoort bij Samen spelen, en sinds #530 staat
  // er ook je profiel met de schakelaar (dus hij is er ook zonder sessie).
  samen: [['samen', 'Sessie'], ['spelers', 'Spelers']],
  // #604: alleen echte instellingen. Cheats staat sinds #435 als eigen onderdeel in de rail en het
  // foutrapport (diagnose) staat onder Over als "Problemen"; twee tabbladen met één knop naar elders
  // maakten van dit scherm een doolhof.
  // #891/#897: het tabblad Spel heeft de moeilijkheid bovenaan staan, met de uitleg van de drie
  // standen ernaast; de speelopties staan er ook, want het zijn instellingen.
  // #979: Camera & richten en Hints & uitleg staan hier, naast Besturing en Interface; het zijn
  // instellingen van het beeld en van de bediening, geen spelacties.
  // #985 punt 7: dit tabblad heette ook "Spel", net als het rail-onderdeel waar je je save beheert.
  // Twee dingen met dezelfde naam in hetzelfde menu is een raadsel; "Spelregels" zegt wat erin staat
  // (moeilijkheid, verkeer, geweld, rijden) en botst nergens meer mee.
  settings: [['video', 'Beeld'], ['sound', 'Geluid & ondertitels'], ['spel', 'Spelregels'], ['moeilijkheid', 'Moeilijkheid'], ['besturing', 'Besturing'], ['camera', 'Camera'], ['display', 'Interface'], ['hints', 'Hints & uitleg'], ['a11y', 'Toegankelijkheid'], ['online', 'Samen spelen']],
  // Bezit (epic #1095, #1099): Land en bedrijf is de oude Boerderij met drie onderdelen erbij; de id blijft 'boerderij' (zoekregel, hints, data-goto),
  // 'bezit' wijst ernaar door. Zonder voorkeur opent het op Boerderij: voor wie al boert verandert er niets.
  boerderij: [['overzicht', 'Overzicht'], ['boerderij', 'Boerderij'], ['bedrijven', 'Bedrijven'], ['tekoop', 'Te koop'], ['snack', 'Snackwagen'], ['club', 'Club']],
  controls: [['toetsen', 'Toetsenbord en muis'], ['knoppen', 'Controller'], ['overzicht', 'Toetsenoverzicht'], ['aanraken', 'Aanraken'], ['hulp', 'Hulp']],
};
// old tab names (saved preferences, other modules)
// de oude plekken: de telefoon is nu Verhaal > Contacten en Berichten, Overzicht is Spel > Overzicht (#430).
// 'camera' onder Instellingen was vroeger een verwijzing naar Besturing; sinds #979 is het een eigen
// tabblad, dus die oude voorkeur opent nu gewoon Camera.
const SUB_ALIAS = { settings: { controller: 'besturing' } };

// #911: waar je bent in de rail, voor de rechterkant van de bladkop: "Spelen" (sinds 23-11 zonder teller). Zo zie
// je hoeveel onderdelen er zijn en waar dit er een van is. Een onderdeel onder een ander
// (Besturing onder Instellingen) noemt de plek van zijn ouder.
function railPosition(id) {
  const ids = sectionIds();
  const railIds = ids.filter((s) => !CHILD[s]);
  const want = CHILD[id] || id;
  for (const [, label, members] of RAIL_GROUPS) {
    const zichtbaar = members.filter((m) => railIds.includes(m));
    const i = zichtbaar.indexOf(want);
    if (i >= 0) return label; // UX-audit 23-11 (S3): alleen de groep; de teller "1 van 2" voegde niets toe
  }
  return '';
}

// The footer: two to four hints, [keys, label, action]. ' back' is filled in.
// Every hint names what Q/E (and [ ]) really do on that screen: the visible tab
// row, or the previous/next section on a screen without tabs (#601).
const BACK = '\u0000';
// #989: de basis in stappen met een groot toetsplaatje en een korte lus; de volledige tekst blijft eronder in Hulp en in 'Meer uitleg'.
const BASIS_UITLEG = ['basis-lopen', 'basis-pakken', 'basis-rijden', 'basis-vechten', 'basis-kaart', 'basis-telefoon', 'boerderij-zaaien'];
function basisUitlegHtml() {
  zetUitlegGlyph((t) => glyphHtml(t));
  startUitleg();
  const blokken = BASIS_UITLEG.map((id) => uitlegBlok(id, {})) /* Hulp is naslag: geen Niet meer tonen (anders is het blok weg tot de reset) */.filter(Boolean);
  return blokken.length ? `<section class="pm-cgroup pm-help" data-help="uitleg"><h3>Zo werkt het</h3>${blokken.join('')}</section>` : '';
}

const HINTS = {
  overzicht: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Q', 'E'], 'tabblad'], [['Esc'], 'doorgaan', 'resume']],
  todo: [[['↑', '↓'], 'kiezen'], [['Enter'], 'zet als doel'], [['Esc'], BACK, 'back']],
  map: [[['Klik'], 'plek kiezen'], [['Q', 'E'], 'andere pagina'], [['M'], 'sluiten', 'resume'], [['Esc'], BACK, 'back']],
  verhaal: [[['↑', '↓'], 'kiezen'], [['Enter'], 'kiezen of bellen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  spullen: [[['↑', '↓', '←', '→'], 'kiezen'], [['Enter'], 'gebruiken'], [['Q', 'E'], 'soort'], [['Esc'], BACK, 'back']],
  garage: [[['↑', '↓'], 'kiezen'], [['Enter'], 'afleveren of kopen'], [['Q', 'E'], 'soort'], [['Esc'], BACK, 'back']],
  prestaties: [[['↑', '↓'], 'kiezen'], [['Enter'], 'openen'], [['Q', 'E'], 'weergave'], [['Esc'], BACK, 'back']],
  loopbaan: [[['↑', '↓'], 'kiezen'], [['T'], 'tour of vakken'], [['→'], 'naar de actie'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  visboek: [[['↑', '↓'], 'kiezen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  // Veroverd had geen eigen regel en leende die van het Overzicht: Esc stond er als "doorgaan" terwijl hij een stap terug gaat
  veroverd: [[['↑', '↓'], 'kiezen'], [['Enter'], 'naar de kaart'], [['Esc'], BACK, 'back']],
  boerderij: [[['↑', '↓'], 'kiezen'], [['Enter'], 'doen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  voetbal: [[['↑', '↓'], 'kiezen'], [['Enter'], 'doen'], [['Esc'], BACK, 'back']],
  fotos: [[['F8'], 'fotomodus'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  spelers: [[['↑', '↓'], 'kiezen'], [['Enter'], 'roepen of erheen'], [['Esc'], BACK, 'back']],
  streken: [[['↑', '↓'], 'kiezen'], [['Enter'], 'aan of uit'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  samen: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Esc'], BACK, 'back']],
  over: [[['↑', '↓'], 'kiezen'], [['Enter'], 'open of dicht'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  spel: [[['↑', '↓'], 'kiezen'], [['Enter'], 'ok'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  settings: [[['↑', '↓'], 'kiezen'], [['←', '→'], 'wijzigen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
  controls: [[['↑', '↓'], 'kiezen'], [['Enter'], 'toets wijzigen'], [['Q', 'E'], 'tabblad'], [['Esc'], BACK, 'back']],
};
// a line in the sheet header that replaces the section's hint
const SHEET_NOTE = {};
// a fixed controller glyph (the menu's own buttons)
const pg =(slot) => `<span class="pm-pad-g" data-g-raw>${padGlyphInner(slot)}</span>`;
// T (Tour of Vakken) en F8 (fotomodus) hebben geen controllerknop: de knoppen zelf staan in het scherm; de hint verdwijnt bij een controller (22-11)
const PAD_KEYS = { '↑': 'dpad', '↓': null, '←': 'dpad', '→': null, Enter: 'a', Esc: 'b', Q: 'lb', E: 'rb', Klik: 'a', Scroll: 'rt', M: 'view', T: null, F8: null };
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
let remeasuring = false; // Opnieuw meten (automatische stand) loopt
// #563: welk commando (Herstarten of Afsluiten) wacht na een mislukte save op een keuze van de speler
let closeAction = null;
const lastFocus = {};

const PREF_KEY = KEYS.menu;
const pref = loadPref();
function loadPref() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    const sub = p.sub && typeof p.sub === 'object' ? p.sub : {};
    // een oud tabblad Spelers (#434): de lijst zit nu onder Samen spelen
    if (sub.spel === 'spelers') { sub.spel = 'samen'; if (!sub.samen) sub.samen = 'spelers'; }
    // #979: Camera & richten en Hints & uitleg zaten onder Spel; ze horen nu bij Instellingen.
    if (sub.spel === 'camera' || sub.spel === 'hints') { sub.settings = sub.spel; sub.spel = 'overzicht'; }
    return { last: typeof p.last === 'string' ? p.last : 'todo', sub };
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
// De rail zelf heeft geen knop Spelers (#377): het aantal spelers staat bij Spel, de lijst onder Samen spelen (#434).
// Cheats staat alleen in het menu in dev, zolang er een cheat aan staat (settingsrules.js) of nadat het verhaal ze heeft vrijgespeeld (Berts valsspeelbon na missie 4; cheats.js cheatsOpen)
export const cheatsInMenu = () => cheatsVisible({ dev: DEV || !!FLAGS.dev, actief: anyCheatOn() }) || cheatsOpen();
const sectionIds = () => (prestart ? PRESTART_SECTIONS : SECTIONS.map(([id]) => id).filter((id) => id !== 'streken' || cheatsInMenu()).filter(sectionVisible));
const sectionOf = (id) => SECTIONS.find(([s]) => s === id);
// Waar showTab heen gaat als het gevraagde onderdeel niet in de rail staat (puur, scripts/pauzemenu_slot_test.mjs): het hoofdmenu valt
// terug op Instellingen, het spel op Spel > Overzicht. locked: het onderdeel bestaat wel maar het verhaal opende het nog niet.
export const NOT_YET_NOTE = 'Dat onderdeel is nog niet beschikbaar: het komt later in het verhaal.';
export function resolveSection(name, ids, isPrestart = false) {
  if (ids.includes(name)) return { name, sub: null, locked: false };
  if (isPrestart) return { name: ids.includes('settings') ? 'settings' : ids[0], sub: null, locked: false };
  const known = SECTIONS.some(([s]) => s === name);
  return { name: 'spel', sub: 'overzicht', locked: known };
}
const key = (k) => `<span class="hud-key">${k}</span>`;

const CHEV_L = icoon('terug');
const CHEV_R = icoon('volgende');
const plain = (t) => String(t).replace(/<[^>]*>/g, '').replace(/&shy;/g, '');

// the tabs of a section that are there in the main menu too (Opslaan & stoppen of Spel needs a running game)
const inGameOnly = (of, id) => of === 'spel' && (id === 'acties' || id === 'overzicht' || id === 'samen' || id === 'spelers');
// Spelers (wie er meespeelt) staat onder Samen spelen. Sinds #530 staat daar ook je eigen profiel
// met de schakelaar Meedoen met andere spelers, dus het tabblad is er ook zonder sessie: anders is
// "Alleen spelen" bij de eerste start een doodlopende weg (ADR 0022: later alsnog kunnen meedoen).
const subsOf = (of) => SUBTABS[of].filter(([id]) => !(prestart && inGameOnly(of, id)) && subVisible(of, id));
function subtabsHtml(of, label) {
  // DS3 (ds-micro.css): de nav draagt .ds-m-tabs en de glijdende streep; de stip op een tab met [data-new] poppen met .ds-m-nieuw
  return `<div class="m-tabs"><nav class="m-tablist ds-m-tabs" role="tablist" aria-label="${label}">` + SUBTABS[of].map(([id, text]) =>
    `<button type="button" role="tab" class="m-tab ds-m-nieuw${inGameOnly(of, id) ? ' pm-ingame' : ''}" data-of="${of}" data-subtab="${id}" aria-selected="false">${esc(text)}<small data-count="${id}"></small></button>`).join('') + '<span class="ds-m-tabs__lijn" aria-hidden="true"></span></nav>' +
    (of === 'controls' ? '<span class="m-grow"></span><button type="button" class="m-bt" data-goto-sub="settings:besturing">Terug naar Instellingen</button>' : '') + '</div>';
}

// #1257: a label or note may carry {TOKEN}s ({N}, {SHIFT}+{N}); they are keycaps here, never raw braces.
const rowName = (label, note) => `<span class="nm">${braceKeysHtml(label)}${note ? `<span class="mut">${braceKeysHtml(note)}</span>` : ''}</span>`;

// `weergave`: 'procent' (volumes, helderheid) of 'keer' (afstand, gevoeligheid). Een
// percentage bij "Camera-afstand 1,2x" of "Stuurgevoeligheid" zegt niets; 120% van wat?
// (#985 punt 3). De standaard blijft procent, zodat de bestaande schuiven niet veranderen.
function slider(k, label, min = 0, max = 1, step = 0.05, note = '', weergave = 'procent') {
  return `<label class="m-li pm-row">${rowName(label, note)}<input type="range" class="m-sl" min="${min}" max="${max}" step="${step}" data-setting="${k}" data-weergave="${weergave}"><output class="m-val"></output></label>`;
}

function toggle(k, label, note = '') {
  return `<label class="m-li pm-row">${rowName(label, note)}<input type="checkbox" class="m-sw" data-setting="${k}"></label>`;
}

// a picker: previous, the chosen value, next (the mockups' replacement for a segmented row)
function picker(k, label, options, note = '', attrs = `data-setting="${k}"`) {
  const name = plain(label);
  return `<div class="m-li pm-row"><span class="nm" id="pm-l-${k}">${braceKeysHtml(label)}${note ? `<span class="mut">${braceKeysHtml(note)}</span>` : ''}</span>` +
    `<span class="m-pk" role="group" aria-labelledby="pm-l-${k}" ${attrs} data-options="${esc(JSON.stringify(options))}">` +
    `<button type="button" data-pick="-1" aria-label="${esc(name)}: vorige">${CHEV_L}</button><output aria-live="polite"></output>` +
    `<button type="button" data-pick="1" aria-label="${esc(name)}: volgende">${CHEV_R}</button></span></div>`;
}

function disclosure(id, title, hint, inner, open = false) {
  return `<div class="m-rule"></div><button type="button" class="m-disc" data-fold="${id}" aria-expanded="${open}" aria-controls="pm-f-${id}">${CHEV_R}<b>${braceKeysHtml(title)}</b><span class="mut">${braceKeysHtml(hint)}</span></button>` +
    `<div class="m-fold" id="pm-f-${id}" data-fold-body="${id}"${open ? '' : ' hidden'}>${inner}</div>`;
}

// De decoratieve kolom naast een instellingentab. De titel is een kop van 48 px (niet 64):
// in een smalle kolom brak "ZO SPEEL HET" anders af tegen de rand (#911-QA, 1280x720).
const pane = (eyebrow, title, inner = '') => `<aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">${eyebrow}</span><h2 class="m-h2 td-h2">${title}</h2></div>${inner}</aside>`;

// #894: hoeveel toetsen en knoppen wijken af van de standaard, met één knop om alles terug te
// zetten. Zo zie je meteen of je iets veranderd hebt zonder alle rijen langs te lopen.
function bindChangeText() {
  const st = getSettings();
  const keys = KEY_ACTIONS.filter(([k]) => physicalKey(st.keyBinds, k) !== defaultKey(k)).length;
  const pads = PAD_REMAPPABLE.filter((slot) => physicalButton(st.padBinds, slot) !== slot).length;
  return keys || pads
    ? `${keys} ${keys === 1 ? 'toets' : 'toetsen'} en ${pads} ${pads === 1 ? 'knop' : 'knoppen'} anders dan de standaard`
    : 'Alles staat op de standaard';
}
function keyChangedRow() {
  return `<div class="m-li pm-row pm-keys-changed" data-keys-changed>${rowName('Aangepast', `<span data-keys-text>${esc(bindChangeText())}</span>`)}<button type="button" class="m-bg" data-action="binds-reset-all">Terug naar standaard</button></div>`;
}
// De telling bij "Aangepast" volgt elke wijziging, ook als de rij er al staat (#894).
function syncKeyChanged() {
  const el = root && root.querySelector('[data-keys-text]');
  if (el) el.textContent = bindChangeText();
}

// De toetsen die het menu en de fotomodus zelf nodig hebben: geen conflict, maar wel handig om
// te weten voordat je gaat schuiven.
function fixedKeysHtml() {
  const rows = [
    ['Esc', 'Pauzemenu, terug en een vraag sluiten'],
    ['Enter', 'Bevestigen, ook in het menu'],
    ['Pijltjes', 'Kiezen in het menu'],
    ['F8', 'Fotomodus'],
    ['F11', 'Volledig scherm (ook {ALT}+{ENTER})'],
    ['Muis', 'Kijken, richten en schieten'],
  ];
  return '<div class="pm-fixed">' + rows.map(([k, v]) => `<div class="pm-fixed-row"><span class="m-kc is-kbg">${keyLabelHtml(k)}</span><span>${keyText(v)}</span></div>`).join('') + '</div>';
}

// #894: dezelfde toets doet in verschillende situaties iets anders (E is gebruiken, instappen,
// uitstappen en pikken). Dat is geen fout, maar wel de vraag die iedereen heeft; daarom staat het
// één keer op een rij, met de acties die de speler echt tegenkomt.
const KEY_WORD = { WASD: 'WASD', MOUSE: 'Muis', LMB: 'Muisknop', RMB: 'Rechtermuis', WHEEL: 'Scrollwiel', SPACE: 'Spatie', CTRL: 'Ctrl', SHIFT: 'Shift', ESC: 'Esc', ARROWS: 'Pijltjes', BACKSPACE: 'Backspace', TAB: 'Tab' };
const keyLabel = (t) => KEY_WORD[t] || keyName(t.toLowerCase());
function keyReuseHtml() {
  const perKey = new Map();
  for (const [, titel, rows] of CONTROL_GROUPS) {
    for (const [keys, desc] of rows) {
      const hoofd = keys[0].split('+')[0];
      if (!perKey.has(hoofd)) perKey.set(hoofd, []);
      perKey.get(hoofd).push(`${desc.charAt(0).toLowerCase()}${desc.slice(1)} (${titel.toLowerCase()})`);
    }
  }
  const dubbel = [...perKey.entries()].filter(([, lijst]) => lijst.length > 1)
    .sort((a, b) => b[1].length - a[1].length).slice(0, 4);
  if (!dubbel.length) return '';
  return '<div class="pm-keyreuse"><b>Dezelfde toets, meer taken</b>' +
    dubbel.map(([k, lijst]) => `<div class="pm-keyreuse-row"><span class="m-kc is-kbg">${glyphHtml(k)}</span><span>${esc(lijst.join(' · '))}</span></div>`).join('') + '</div>';
}

// #980: Instellingen > Camera opent met wat er nu staat, in één blik: de stand, de beeldhoek en
// het richten. Zo zie je het gevolg van de regelaars eronder voordat je ergens aan draait.
function camNowHtml() {
  return '<div class="pm-nowfacts" data-cam-now role="group" aria-label="Camerastand van nu" aria-live="polite">' +
    '<div class="m-fact"><span>Stand</span><b data-cam-stand>Derde persoon</b></div>' +
    '<div class="m-fact"><span>Beeldhoek</span><b data-cam-fov>64°</b></div>' +
    '<div class="m-fact"><span>Richten</span><b data-cam-aim>Automatisch</b></div></div>';
}

// #980: een voorbeeld van een hint zoals hij nu in beeld komt. Zo zie je wat "aan", "uit" en
// "voor toetsenbord of controller" betekenen zonder eerst een potje te spelen.
function hintsNowHtml() {
  return '<div class="pm-hintprev" data-hintprev role="group" aria-label="Zo zien hints eruit">' +
    '<span class="m-eb">Zo zien hints eruit</span>' +
    '<span class="pm-hintprev-row" data-hintprev-row aria-live="polite"><span class="m-kc is-kbg">' + glyphHtml('E') + '</span><span>Instappen</span></span></div>';
}

// De feiten bovenaan Camera en het hintvoorbeeld onder Hints volgen elke wijziging meteen (#980).
function syncNowFacts(st = getSettings()) {
  if (!root) return;
  const zet = (el, tekst) => { if (el && el.textContent !== tekst) el.textContent = tekst; };
  const stand = root.querySelector('[data-cam-stand]');
  zet(stand, st.firstPersoon ? 'Eerste persoon' : 'Derde persoon');
  const fov = root.querySelector('[data-cam-fov]');
  zet(fov, `${st.fov}°`);
  const aim = root.querySelector('[data-cam-aim]');
  zet(aim, st.autoAim ? 'Automatisch' : 'Zelf');
  // in eerste persoon doet de afstand niets: de regelaar gaat opzij in plaats van een dood spoor te zijn
  const afstand = root.querySelector('[data-setting="cameraDistance"]');
  if (afstand) {
    afstand.disabled = !!st.firstPersoon;
    const rij = afstand.closest('.pm-row');
    if (rij) rij.classList.toggle('pm-disabled', !!st.firstPersoon);
  }
  const voorbeeld = root.querySelector('[data-hintprev-row]');
  if (voorbeeld) {
    const stand = !st.showHints ? 'uit' : st.hintSource === 'pad' || (st.hintSource === 'auto' && isPadActive()) ? 'pad' : 'toets';
    // #985 punt 2: hier stond hardgecodeerd "E", en de hertekening hing alleen aan `stand`.
    // Na een herbinding loog het voorbeeld dus: je zag E terwijl instappen op Q stond. De letter
    // komt nu uit de echte binding, en de sleutel waarop hertekend wordt bevat hem ook.
    const instap = keyLabel(physicalKey(st.keyBinds, 'e'));
    const sig = `${stand}|${instap}`;
    if (voorbeeld.dataset.stand !== sig) {
      voorbeeld.dataset.stand = sig;
      voorbeeld.innerHTML = stand === 'uit' ? '<span class="mut">Hints staan uit.</span>'
        : stand === 'pad' ? `${pg('y')}<span>Instappen</span>`
          : `<span class="m-kc is-kbg">${glyphHtml('E')}</span><span>Instappen</span>`;
    }
  }
  // zonder hints heeft "Hints tonen voor" geen gevolg: de kiezer gaat opzij in plaats van dood te lopen
  const bron = root.querySelector('[data-setting="hintSource"]');
  if (bron) {
    bron.setAttribute('aria-disabled', String(!st.showHints));
    const rij = bron.closest('.pm-row');
    if (rij) rij.classList.toggle('pm-disabled', !st.showHints);
  }
}

function settingsHtml() {
  const qualities = Object.keys(QUALITY_PRESETS).map((q) => [q, q[0].toUpperCase() + q.slice(1)]);
  const tab = (id, rows, side = '') => `<div data-of="settings" data-sub="${id}" class="pm-settab" hidden><div class="m-list pm-slist">${rows}</div>${side}</div>`;
  return `${subtabsHtml('settings', 'Onderdeel')}
    <div class="pm-confirm pm-resetbox" data-reset-confirm hidden>
      <p><b>Alles terug naar de standaard?</b> Beeld, geluid, camera, hints, ondertitels, beweging, tekstgrootte en de hulpinstellingen gaan terug naar hoe het spel begon. Je toetsen en knoppen, je naam en de keuze voor Samen spelen blijven staan.</p>
      <p class="mut" data-reset-count></p>
      <div class="m-acts"><button type="button" class="m-bg" data-action="reset-tab-go" hidden>Alleen dit tabblad</button><button type="button" class="m-bp" data-action="reset-go">Alles herstellen</button><button type="button" class="m-bt" data-action="reset-cancel">Annuleren</button></div>
    </div>
    <div class="pm-confirm pm-resetbox" data-reset-undo hidden>
      <p data-reset-undo-text>Alles staat weer op de standaard.</p>
      <div class="m-acts"><button type="button" class="m-bg" data-action="reset-undo">Ongedaan maken</button><button type="button" class="m-bt" data-action="reset-dismiss">Sluiten</button></div>
    </div>
    ${tab('video', `
      <div class="pm-advice" data-bench-banner hidden></div>
      <div class="m-li pm-row pm-rowfull"><span class="nm" id="pm-l-presetknoppen">Voorinstelling<span class="mut" data-preset-now></span></span>
        <span class="pm-seg" role="group" aria-labelledby="pm-l-presetknoppen">${PRESET_ORDER.map((n) => `<button type="button" class="pm-segbtn" data-preset-btn="${n}" aria-pressed="false" title="${esc(PRESET_HINTS[n] || '')}">${presetLabel(n)}</button>`).join('')}</span>
        <span class="pm-seg-hint mut" data-preset-hint></span></div>
      ${picker('resolution', 'Resolutie', [['1', '100%'], ['0.85', '85%'], ['0.75', '75%'], ['0.6', '60%']])}
      ${toggle('autoResolution', 'Automatische resolutie', 'bij haperen')}
      ${toggle('zuinig', 'Zuinige modus', '30 beelden per seconde, spaart batterij en warmte')}
      ${toggle('shadows', 'Schaduwen', 'Schaduwen geven de wereld diepte; uit is soepeler op een lichte computer')}
      ${picker('drawDistance', 'Zichtafstand', [['kort', 'Kort'], ['normaal', 'Normaal'], ['ver', 'Ver'], ['heelver', 'Heel ver']])}
      ${DESKTOP ? `<label class="m-li pm-row">${rowName('Volledig scherm', '{F11} of {ALT}+{ENTER}')}<input type="checkbox" class="m-sw" data-desktop="fullscreen"></label>` : ''}
      ${slider('brightness', 'Helderheid', 0.6, 1.6, 0.05)}
      ${picker('worldColor', 'Wereldkleur', [['uit', 'Uit'], ['subtiel', 'Subtiel'], ['drukwerk', 'Drukwerk']], 'De kleuren van de wereld sluiten aan op het drukwerk van het spel; gevels, gras en straat na een herstart, licht en korrel meteen')}
      <!-- De benchmark hoort bij de beeldinstellingen, niet verstopt onder "Meer opties": hij
           beantwoordt juist de vraag welke stand bij deze computer past (spelersfeedback 15-11). -->
      <div class="m-li pm-row">${rowName('Automatisch kiezen', 'Meet een paar seconden hoe soepel Grunn hier loopt en kies de mooiste stand die 60 fps haalt')}<button type="button" class="m-bg" data-action="gfx-remeasure">Opnieuw meten</button></div>
      <div class="m-li pm-row">${rowName('Prestatietest', 'Meet hoe soepel Grunn op deze computer draait en welke stand daarbij past (±1 min)')}<button type="button" class="m-bg" data-action="bench">Test starten</button></div>
      <div class="pm-confirm" data-bench-confirm hidden>
        <p data-bench-text></p>
        <div class="m-acts"><button type="button" class="m-bp" data-action="bench-go">Starten</button><button type="button" class="m-bt" data-action="bench-cancel">Annuleren</button></div>
      </div>
      <div class="m-li pm-row">${rowName('Diagnose', keyText('Videokaart, schermverversing en snelheid in één blok om te kopiëren of door te sturen ({CTRL}+{SHIFT}+{G})'))}<button type="button" class="m-bg" data-action="gpuinfo">Technische info kopiëren</button></div>
      <div class="pm-confirm" data-gpu-warn hidden>
        <p data-gpu-warn-text></p>
        <p data-gpu-help hidden>Zo kies je de snelle videokaart in Windows: open Instellingen › Systeem › Beeldscherm › Graphics, kies GDE Groningen in de lijst (of voeg de app toe met Bladeren), klik op Opties en kies Hoge prestaties. Start het spel daarna opnieuw. Zit je beeldscherm aan het moederbord in plaats van aan de videokaart, steek de kabel dan in de videokaart.</p>
        <div class="m-acts"><button type="button" class="m-bt" data-action="gpu-help">Uitleg</button></div>
      </div>
      ${disclosure('video', 'Meer opties', 'Licht, gloed en kleuren', `
        ${picker('quality', 'Kwaliteit', qualities, 'Licht, gloed en kleuren')}`)}`, `
      <aside class="m-pane" data-preset-pane><div class="pm-pane-top"><span class="m-eb">Voorinstelling</span><h2 class="m-h2" data-preset-name></h2></div>
        <p data-preset-desc></p>
        <div class="m-fact" data-preset-fps hidden><span>Verwacht voor deze computer</span><span class="m-num pm-big"></span></div>
        <div class="pm-fpsbars" data-preset-bars></div><p class="mut" data-bench-note></p></aside>`)}
    ${tab('sound', `
      ${slider('masterVolume', 'Hoofdvolume')}
      ${slider('musicVolume', 'Muziek')}
      ${toggle('footballMusic', 'Voetbalmuziek', 'Eigen muziek bij de wedstrijd, de training, de penalty’s en het clubscherm, in plaats van de radio. Uit: de radio blijft spelen. Je hoort je eigen muziek; er gaat niets over het netwerk')}
      ${slider('footballMusicVolume', 'Voetbalmuziek, volume')}
      ${slider('sfxVolume', 'Effecten')}
      ${slider('voiceVolume', 'Stemmen')}
      <p class="pm-note pm-silence" data-silence role="status" hidden></p>
      <label class="m-li pm-row pm-mute">${rowName('Geluid in één keer uit', 'Zet alle geluid uit, ook met {U}; de luidspreker linksboven zet het weer aan')}<input type="checkbox" class="m-sw" data-mute-switch></label>
      <label class="m-li pm-row">${rowName('Radio', 'Aan of uit met {N}, te voet en in elk voertuig. {SHIFT}+{N} is de volgende zender, {N} vasthouden het zenderwiel. Zender kiezen met een controller: houd Overzicht en kies Zenders kiezen')}<input type="checkbox" class="m-sw" data-radio-switch></label>
      <div class="pm-channels-wrap" data-channels-wrap></div>
      ${disclosure('subs', 'Ondertitels', 'Filmpjes, gesprekken, telefoon, radio en naamkaarten', `
        ${toggle('showSubtitles', 'Ondertitels aan', 'Uit verbergt wat er gezegd wordt; geluiden beschrijven hieronder blijft dan gewoon werken')}
        ${picker('subtitleSize', 'Grootte', [['klein', 'Klein'], ['normaal', 'Normaal'], ['groot', 'Groot'], ['extragroot', 'Extra groot']])}
        ${toggle('subtitleBox', 'Donker vlak erachter', 'Een donker vlak maakt ze makkelijker te lezen')}
        ${picker('subtitleVlak', 'Dichtheid van het vlak', [['vol', 'Vol'], ['zacht', 'Zacht'], ['licht', 'Licht']], 'Hoe goed je er doorheen kijkt; bij Contrast ondertitels Hoog is het vlak altijd vol')}
        ${toggle('soundCaptions', 'Geluiden beschrijven', 'Een korte tekst als [sirene] of [claxon] bij belangrijke geluiden')}`, true)}`, `
      <aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">Zo ziet het eruit</span></div>
        <div class="pm-subprev" data-sub-preview><img class="pm-subprev-img" src="img/laad/vismarkt.jpg" alt="" decoding="async"><span class="pm-subtxt"><b>Tammo:</b> Rustig an, rustig an.</span></div>
        <p class="mut">Muziek is de radio (G-Music, 's nachts Nachtstreek) en de titelsong, stemmen zijn Tammo, Tessa, de politie, de mensen op straat en de praatjes op de radio. Kleurenblind, interfacegrootte en beweging beperken vind je onder Toegankelijkheid.</p></aside>`)}
    ${tab('spel', `
      <div class="m-li pm-row">${rowName('Moeilijkheid', 'Het niveau en de opties van dit spel: politie, verkeer, schade, hulp, geld en meer')}<button type="button" class="m-bg" data-goto-sub="settings:moeilijkheid">Aanpassen</button></div>
      <div class="m-gh"><span>Verkeer en geweld</span></div>
      ${picker('ruzie', 'Verkeersruzie', [['uit', 'Uit'], ['weinig', 'Weinig'], ['normaal', 'Normaal'], ['veel', 'Veel']], 'Hoe vaak een boze bestuurder uitstapt na een botsing of getoeter. Zonder bloed; sommigen hebben iets in de hand')}
      ${picker('drunkFx', 'Dronken effecten', [['aan', 'Aan'], ['mild', 'Mild'], ['uit', 'Uit']], 'Het wiebelende beeld en de dubbele tong als je gedronken hebt')}
      ${toggle('gore', 'Bloed en ledematen', 'Aan: bloed en ledematen in een gevecht met een medespeler. Uit: mensen vallen gewoon om')}
      <div class="m-gh"><span>Rijden</span></div>
      ${picker('shiftMode', 'Schakelen', [['auto', 'Automaat'], ['manual', 'Handmatig'], ['clutch', 'Handmatig + koppeling']], 'Automaat is de standaard; handmatig schakel je met . en , (of de bumpers), met koppeling houd je ook {J} ingedrukt')}
      ${toggle('speedFeel', 'Snelheidsgevoel', 'Beeld wordt wijder bij hoge snelheid en een zware klap vertraagt even; uit is rustiger')}
      ${toggle('driftAssist', 'Driften met hulp', 'Helpt tegensturen en houdt een slip beheersbaar; uit is realistischer')}
      ${toggle('bikeAssist', 'Motor met hulp', 'Houdt een motor of brommer rechtop in bochten; uit is realistischer')}
      ${toggle('liveBussen', 'Live bussen', 'Bussen rijden waar ze in het echt rijden. Het spel haalt alleen publieke buslocaties op; er gaat geen account, naam of speelgegeven mee; de bron ziet alleen dat er een verzoek komt, zoals bij elke website. Uit, of als de bron niet bereikbaar is: de bussen rijden het rooster van het spel, op de kaart gemarkeerd als Rooster')}
      ${toggle('liveTreinen', 'Live treinen', 'De vertrekborden tonen de vertragingen van de echte treinen. Het spel haalt eens per minuut alleen openbare gegevens op (ongeveer 1 MB); er gaat geen account, naam of speelgegeven mee; de bron ziet alleen dat er een verzoek komt, zoals bij elke website. Uit, of als de bron niet bereikbaar is: het bord toont het rooster zonder vertraging, met het woord Rooster')}
      <div class="m-gh"><span>Kaart</span></div>
      ${toggle('mapShiftTeleport','{SHIFT}+{LMB} op de kaart verplaatst je', 'Niet tijdens een missie of met de politie achter je aan')}
      <div class="m-gh"><span>Thuis</span></div>
      ${toggle('startBinnen', 'Start binnen (thuis)', 'Laad je een spel dat bij je huis stond, of ga je naar huis, dan sta je binnen in de woning. Uit: je staat voor de deur')}`,
      `${pane('Spelregels', 'Zo speelt het', '<p>Hoe moeilijk het is, hoe het verkeer en het geweld zich gedragen en hoe het rijden aanvoelt. Alles wordt meteen bewaard.</p><p class="mut">Beeld, geluid, besturing en toegankelijkheid staan op de andere tabbladen. Camera-afstand, beeldhoek en eerste persoon staan onder Instellingen &gt; Camera; toetshints en uitleg onder Instellingen &gt; Hints &amp; uitleg.</p>')}`)}
    ${tab('moeilijkheid', difficultyTabHtml(), pane('Moeilijkheid', 'Hoe pittig', difficultyPaneHtml()))}
    ${tab('besturing', `
      <div class="m-gh"><span>Muis</span></div>
      ${slider('mouseSensitivity', 'Muisgevoeligheid', 0.3, 2.5, 0.05, 'Hoe snel de camera draait als je de muis beweegt', 'keer')}
      ${toggle('invertY', 'Omhoog en omlaag omkeren', 'Geldt voor de muis en de rechterstick')}
      <div class="m-gh"><span>Toetsenbord</span></div>
      <div class="m-li pm-row">${rowName('Toetsen aanpassen', 'Elke toets een andere functie geven; zit een toets al op iets anders, dan ruilen ze')}<button type="button" class="m-bg" data-goto-sub="controls:toetsen">Aanpassen</button></div>
      ${keyChangedRow()}
      <div class="m-li pm-row">${rowName('Toetsenoverzicht', 'Alle toetsen per situatie, om na te lezen')}<button type="button" class="m-bg" data-goto-sub="controls:overzicht">Bekijken</button></div>
      ${disclosure('keys-fixed', 'Deze toetsen liggen vast', '{ESC}, {ENTER}, {ARROWS} en de functietoetsen', fixedKeysHtml())}
      <div class="m-gh"><span>Controller</span></div>
      ${picker('padLayout', 'Controllerindeling', [['auto', 'Automatisch'], ['xbox', 'Onderste knop bevestigt (A B X Y)'], ['switch', 'Rechterknop bevestigt (A en B, X en Y omgewisseld)'], ['ps', 'Vormknoppen'], ['deck', 'Handheld']], 'Automatisch kiest wat er aangesloten is. Meldt je controller zich anders dan hij is (bijvoorbeeld via een koppelprogramma), kies dan zelf; knoppen en hints volgen je keuze')}
      ${slider('padLookSensitivity', 'Camera met de rechterstick', 0.3, 2.5, 0.05, '', 'keer')}
      ${toggle('rumble', 'Trillen', 'Bij klappen, schoten en botsingen, als je controller dat kan')}
      ${slider('rumbleStrength', 'Sterkte van het trillen', 0.25, 1.5, 0.05, 'Alles wat trilt, zachter of sterker; uit bij Beweging beperken', 'keer')}
      <div class="m-li pm-row">${rowName('Knoppen indelen', 'Elke knop een andere functie geven')}<button type="button" class="m-bg" data-goto-sub="controls:knoppen">Indelen</button></div>
      <div class="m-li pm-row">${rowName('Controller testen', 'Welk pad wordt herkend en welke knop doet wat')}<button type="button" class="m-bg" data-pad-test>Testen</button></div>
      <div class="m-gh"><span>Aanraken</span></div>
      ${picker('touchControls', 'Aanraakbediening', [['auto', 'Automatisch'], ['aan', 'Aan'], ['uit', 'Uit']], 'Knoppen op het scherm voor telefoon en tablet; wisselen werkt na een herstart')}
      <div class="m-gh"><span>In het spel</span></div>
      ${slider('steerSensitivity', 'Stuurgevoeligheid', 0.5, 1.5, 0.05, 'Hoe fel een voertuig op links en rechts reageert')}
      <div class="m-li pm-row">${rowName('Toetshints in beeld', 'Aan of uit, en voor toetsenbord of controller')}<button type="button" class="m-bg" data-goto-sub="settings:hints">Hints</button></div>
      <div class="m-li pm-row">${rowName('Hulp en oefenronde', 'Uitleg over de besturing en een rustige oefenronde')}<button type="button" class="m-bg" data-goto-sub="controls:hulp">Openen</button></div>`,
      `${pane('Besturing', 'Hoe je speelt', `<p>Alles staat per apparaat bij elkaar: de muis, het toetsenbord, de controller en het scherm. Een toets die je wijzigt ruilt met de toets die er al zat, dus twee dingen op één toets kan niet.</p>
<p>De hints in beeld wisselen vanzelf tussen toetsen en knoppen, naar wat je het laatst gebruikte.</p>
${keyReuseHtml()}
<p class="mut">Camera-afstand, beeldhoek en eerste persoon staan onder Instellingen &gt; Camera.</p>`)}`)}
    ${tab('camera', `
      ${camNowHtml()}
      <div class="m-gh"><span>Kijken</span></div>
      ${toggle('firstPersoon', 'Eerste persoon', 'Camera op de ogen van je figuur, met een vrije blik. Geldt overal en blijft na in- en uitstappen staan. {C} (in de browser {G}) doet hetzelfde')}
      ${slider('fov', 'Beeldhoek', 50, 90, 1, 'Hoger laat meer zien, maar maakt alles kleiner')}
      ${slider('cameraDistance', 'Camera-afstand', 0.8, 1.6, 0.05, 'Hoe ver de camera achter je staat; in eerste persoon maakt dit niet uit', 'keer')}
      <div class="m-gh"><span>Richten</span></div>
      ${toggle('autoAim', 'Automatisch richten', '{RMB} zoekt zelf het beste doelwit')}
      <div class="m-gh"><span>Sfeer</span></div>
      ${toggle('cinematicMoments', 'Filmische momenten', 'Bij bezienswaardigheden, crashes en vijf sterren; intro’s, missies en de filmcamera (V) staan altijd aan')}
      ${toggle('terugkeerScene', 'Terugkeerscène', 'Een terugblik (Waar waren we?) en een korte scène in de flat als je een opgeslagen spel laadt')}`, `${pane('Camera & richten', 'Zicht', '<p>Te voet en in elk voertuig. Eerste persoon zet de camera op de ogen van je figuur; je lichaam en zijn schaduw zie je dan niet.</p>')}`)}
    ${tab('display', `
      ${picker('hudMode', 'HUD', [['slim', 'Slim'], ['alles', 'Altijd tonen'], ['minimaal', 'Minimaal']], 'Slim toont geld, gezondheid, wapen en sterren alleen als het telt')}
      ${toggle('showMinimap', 'Minimap')}
      ${slider('minimapZoom', 'Inzoomen op het kaartje', 0.6, 1.6, 0.05)}
      ${picker('minimapNorth', 'Minimap met noord boven', [['nooit', 'Nooit'], ['lucht', 'In de lucht'], ['altijd', 'Altijd']], 'Op de grond draait de kaart mee. Bij "In de lucht" staat noord boven in een vliegtuig of helikopter')}
      ${toggle('showFog', 'Verkende gebieden op de kaart')}
      <div class="m-gh"><span>Over het spel</span></div>
      <div class="m-li pm-row">${rowName('Over GDE', 'Versie, wat er nieuw is, credits en licenties')}<button type="button" class="m-bg" data-goto="over">Openen</button></div>`, `${pane('Interface', 'Wat je ziet', '<p>Slim toont alleen wat nu telt; Altijd alles houdt alles in beeld; Minimaal laat alleen sterren, doel, ondertitels, de kaart en de snelheidsmeter over.</p><p class="mut">Over GDE met de versie, de wijzigingen en de credits staat onderaan dit tabblad.</p>')}`)}
    ${tab('hints', `
      ${hintsNowHtml()}
      <div class="m-gh"><span>In beeld</span></div>
      ${toggle('showHints', 'Toetshints', 'De toetsen onderin beeld bij wat je nu kunt doen')}
      ${picker('hintSource', 'Hints tonen voor', [['auto', 'Automatisch'], ['keys', 'Toetsenbord'], ['pad', 'Controller']], 'Automatisch volgt wat je het laatst gebruikte')}
      <div class="m-gh"><span>Uitleg</span></div>
      ${toggle('onboardingTips', 'Uitleg voor nieuwe spelers', 'Korte tips, elk één keer: je eerste klus, geld en winkels, de kaart en Activiteiten')}
      ${toggle('uitlegIconen', 'Uitleg met iconen en animatie', 'Korte stappen met een toets of icoon en een kleine animatie in plaats van een lap tekst; uit is de oude tekstuitleg')}
      ${picker('qteStand', 'Quicktime-events', [['makkelijk', 'Makkelijk'], ['normaal', 'Normaal'], ['overslaan', 'Overslaan']], 'Makkelijk: langere tijd, minder drukken en een poging extra. Overslaan: het verhaal gaat meteen door. Per speler')}
      ${picker('readingTime', 'Leestijd van uitleg', [['normaal', 'Normaal'], ['ruim', 'Ruim'], ['geen', 'Geen timer']], 'Hoe lang tip- en uitlegkaarten blijven staan; bij "geen timer" wacht een uitlegkaart op een klik of {ENTER}')}
      <div class="m-gh"><span>Terugkijken</span></div>
      <div class="m-li pm-row">${rowName('Tekstlog', 'De laatste uitleg en tips opnieuw lezen')}<button type="button" class="m-bg" data-card-log>Openen</button></div>
      <div class="m-li pm-row">${rowName('Uitleg opnieuw tonen', 'Alle uitlegkaarten, contexthints en geleerde toetshints beginnen weer als nieuw')}<button type="button" class="m-bg" data-hints-reset>Opnieuw</button></div>`, `${pane('Hints & uitleg', 'Hulp in beeld', '<p>Toetshints en korte tips voor nieuwe spelers. Je kunt ze altijd uitzetten.</p>')}`)}
    ${tab('online', `<div class="pm-online" data-online-instelling></div>`, `${pane('Samen spelen', 'Je naam en je akkoord', '<p>Alleen bij Samen spelen gaat er iets naar buiten. Hier pas je je naam aan (andere spelers zien hem) of trek je je akkoord in; bij Samen spelen vraagt het spel er dan opnieuw om.</p>')}`)}
    ${tab('a11y', `
      ${picker('colorBlind', 'Kleurenblind', [['uit', 'Uit'], ['deuteranopie', COLOR_BLIND_LABELS.deuteranopie], ['protanopie', COLOR_BLIND_LABELS.protanopie], ['tritanopie', COLOR_BLIND_LABELS.tritanopie]], 'Andere kleuren voor markers, routes, kaart en HUD; rechts zie je meteen hoe ze eruitzien')}
      ${toggle('markerVormen', 'Vormen bij kleur', 'Wantedsterren met een cijfer en een zwaardere rand, ook zonder kleurenstand; doelen hebben altijd hun eigen vorm')}
      ${slider('uiScale', 'Grootte interface', 0.8, 1.5, 0.05)}
      ${picker('textSize', 'Tekstgrootte', [['normaal', 'Normaal'], ['groot', 'Groot'], ['extragroot', 'Extra groot']], 'Groter voor meldingen, toetshints en berichten')}
      ${picker('subtitleContrast', 'Contrast ondertitels', [['normaal', 'Normaal'], ['hoog', 'Hoog']], 'Hoog: wit op bijna zwart, met zwaardere letters')}
      ${toggle('reduceMotion', 'Beweging beperken', 'Staat ook aan als je systeem om minder beweging vraagt')}
      ${picker('screenShake', 'Schermschudden', [['aan', 'Aan'], ['minder', 'Minder'], ['uit', 'Uit']], 'Het schudden van het beeld bij klappen, botsingen en aardbevingen; bij Beweging beperken staat het uit')}
      ${toggle('rustigDrukwerk', 'Rustig drukwerk', 'Geen schuine kaarten, dubbele randen of rasters, en scherper contrast in tekst')}
      ${toggle('stapAnimatie', 'Instap- en uitstapanimatie', 'Uit: je staat meteen op je stoel, zonder deur open en dicht')}
      ${toggle('reduceFlash', 'Flitsen beperken', 'Geen witte schermflitsen in filmpjes en intro')}
      ${toggle('screenNarration', 'Schermnarratie', 'Lees statuswijzigingen voor via de schermlezer: doel, gezondheid, politie en plaatsnaam')}
      <div class="m-gh"><span>Hulp</span></div>
      ${picker('tikStand', 'Tikken in plaats van ingedrukt houden', [['uit', 'Uit'], ['rennen', 'Rennen'], ['richten', 'Richten'], ['beide', 'Rennen en richten']], 'Eén tik zet het aan, een tweede tik uit; alleen te voet. Rennen komt ook los als je stilstaat')}
      ${picker('helpTime', 'Meer tijd', [['uit', 'Uit'], ['ruimer', '+25%'], ['ruim', '+50%'], ['heel ruim', 'Dubbel']], 'Langere tijdslimieten en vensters in missies en timingspelletjes; Quicktime-events stel je in onder Hints & uitleg')}
      ${picker('helpDamage', 'Minder schade', [['normaal', 'Normaal'], ['minder', 'Minder'], ['veel minder', 'Veel minder']], 'Je eigen voertuig houdt meer over na een klap')}
      ${picker('helpGates', 'Ruimere vliegpoorten', [['normaal', 'Normaal'], ['ruimer', 'Ruimer'], ['ruim', 'Ruim']], 'Grotere ringen en een bredere hoogteband')}
      ${toggle('helpOffer', 'Hulp aanbieden', 'Na twee keer mislukken van dezelfde stap vraagt het spel of je hulp wilt')}`, `${pane('Toegankelijkheid', 'Lekker lezen', `<p>Vormen en patronen helpen altijd, ook als je geen kleurenstand kiest. Menu’s, kaarten en tellers springen meteen naar hun nieuwe stand als je beweging beperkt.</p>
<div class="pm-a11yprev" role="img" aria-label="Proef: markerkleuren, routelijnen en tekst op deze stand">
  <div class="pm-a11y-marks">${['ok', 'danger', 'mission', 'user', 'job', 'care', 'police'].map((r) => `<span class="pm-a11y-mk" data-mk="${r}">${({ ok: 'goed', danger: 'gevaar', mission: 'missie', user: 'doel', job: 'baan', care: 'zorg', police: 'politie' })[r]}</span>`).join('')}</div>
  <div class="pm-a11y-routes"><span class="pm-a11y-route" data-route="verhaal"></span><span class="pm-a11y-route" data-route="doel"></span><span class="pm-a11y-route" data-route="klus"></span></div>
  <div class="pm-a11y-shake"><button type="button" class="m-bg" data-shake-proef>Proef het schudden</button><span class="pm-shake-box" data-shake-box aria-hidden="true">klap</span><span class="mut" data-shake-msg role="status"></span></div>
  <div class="pm-a11y-text"><span class="pm-a11y-13">13 px: een bericht op het scherm</span><span class="pm-a11y-20">20 px: een regel in het menu</span></div>
</div>
<p class="mut">Zo zie je de kleuren, lijnen en letters nu. Ondertitels stel je in onder Geluid &amp; ondertitels.</p>`)}`)}
    <div class="m-acts pm-reset-voet"><button type="button" class="m-bg" data-action="reset" hidden>Standaard herstellen</button></div>`; // UX-audit 23-11: herstellen onderaan, niet op de koplijn naast de titel
}
// #980: Opslaan & stoppen opent met de stand van deze speelsessie: hoelang je speelt, wanneer het
// spel voor het laatst bewaard werd en in welke savegame. Zo zie je wat "Spel opslaan" overschrijft.
// Een save in een boot bewaart geen positie (savegame.js serialize: de boot vaart niet mee), en de
// speler kwam er dus thuis achter. Eén regel bij het opslaan zegt het meteen.
const inBoot = (w) => !!(w && hoofdspeler(w) && hoofdspeler(w).inVehicle && hoofdspeler(w).inVehicle.isBoat);
const nu = () => new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

// Wanneer het spel voor het laatst bewaard werd, in gewone taal ("vandaag 14:02", "12 nov 09:15").
// Ook gebruikt door de vraag bij Afsluiten, zodat daar hetzelfde moment staat als in de feiten.
function lastSavedText(s = getSaveSummary()) {
  const w = s && s.savedAt ? new Date(s.savedAt) : null;
  if (!w) return 'nog niet';
  const vandaag = w.toDateString() === new Date().toDateString();
  return `${vandaag ? 'vandaag' : w.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${w.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
}

function saveFactsInner() {
  const s = getSaveSummary();
  const speel = getPlaySeconds();
  const tijd = speel >= 3600
    ? `${Math.floor(speel / 3600)} u ${Math.round((speel % 3600) / 60)} min`
    : `${Math.max(0, Math.round(speel / 60))} min`;
  const wanneer = lastSavedText(s);
  const naam = s && s.name ? s.name : 'deze speelsessie';
  return '<div class="m-fact"><span>Deze sessie</span><b>' + esc(tijd) + '</b></div>' +
    '<div class="m-fact"><span>Laatst opgeslagen</span><b>' + esc(wanneer) + '</b></div>' +
    '<div class="m-fact"><span>Opslagplek</span><b>' + esc(naam) + '</b></div>';
}
function saveFactsHtml() {
  // Leeg bij het bouwen: syncSaveButtons vult de feiten zodra het menu opengaat, zodat het bouwen
  // van het menu geen save hoeft te lezen.
  return '<div class="pm-nowfacts pm-savefacts" data-save-now role="group" aria-label="Deze speelsessie"></div>';
}
function syncSaveFacts() {
  const box = root && root.querySelector('[data-save-now]');
  if (box) box.innerHTML = saveFactsInner();
  // #1281: "Missie stoppen" staat alleen in de lijst als er een missie is om te stoppen
  const stopRij = root && root.querySelector('[data-stop-rij]');
  if (stopRij) stopRij.hidden = !stopInfo();
}

// Spel (#416): how the game itself plays, apart from the system settings of Instellingen. The same keys in the same settings (settings.js):
// only the place in the menu changed, nothing is lost and nothing is saved differently.
function spelHtml() {
  const tab = (id, rows, side = '') => `<div data-of="spel" data-sub="${id}" class="pm-settab" hidden><div class="m-list pm-slist">${rows}</div>${side}</div>`;
  return `${subtabsHtml('spel', 'Onderdeel')}
    <div data-of="spel" data-sub="overzicht" class="pm-ov pm-spelov" hidden></div>
    <div data-of="spel" data-sub="samen" class="pm-samen pm-spelcoop" hidden>
      ${subtabsHtml('samen', 'Samen spelen')}
      <div data-of="samen" data-sub="samen" class="pm-samen-inner"></div>
      <div data-of="samen" data-sub="spelers" class="pm-spelers pm-samen-spelers" hidden></div>
    </div>
    ${tab('acties', `
      ${saveFactsHtml()}
      <div class="m-li pm-row">${rowName('Naar mijn boerderij', 'Je akker, gewassen en machines')}<button type="button" class="m-bg" data-goto="boerderij">Boerderij</button></div>
      <div class="m-li pm-row">${rowName('Verder spelen', 'Terug naar het spel')}<button type="button" class="m-bp" data-action="resume">Doorgaan</button></div>
      <div class="m-gh"><span>Opslaan en laden</span></div>
      <div class="m-li pm-row">${rowName('Opslaan', 'Bewaart je geld, spullen en voortgang; laden zet je terug waar je was, of bij je flat als je daar opsloeg')}<button type="button" class="m-bg" data-action="save">Spel opslaan</button></div>
      <div class="m-li pm-row">${rowName('Opgeslagen spellen', 'Kiezen, laden, hernoemen, exporteren en verwijderen')}<button type="button" class="m-bg" data-action="saves" title="Opgeslagen spellen kiezen, laden, hernoemen, exporteren en verwijderen">Opgeslagen spellen</button></div>
      <p class="pm-status" data-game-status role="status"></p>
      <div class="m-gh"><span>Stoppen</span></div>
<div class="m-li pm-row" data-stop-rij hidden>${rowName('Missie stoppen', 'Je stopt hem in Overzicht, met een vraag erbij')}<button type="button" class="m-bg" data-goto-sub="spel:overzicht">Naar Overzicht</button></div>
      <div class="m-li pm-row">${rowName('Spel herstarten', 'Slaat op en start het spel opnieuw')}<button type="button" class="m-bg" data-action="menu" title="Opslaan en het spel opnieuw starten">Herstarten</button></div>
      ${DESKTOP ? `<div class="m-li pm-row">${rowName('Spel sluiten', 'Vraagt eerst of je het zeker weet en slaat je voortgang op')}<button type="button" class="m-bg" data-action="exit" title="Opslaan en het spel sluiten">Afsluiten</button></div>` : ''}
      <div class="m-gh"><span>Opnieuw beginnen</span></div>
      <div class="m-li pm-row">${rowName('Opnieuw beginnen', 'Alles sinds je laatste opslag gaat verloren')}<button type="button" class="m-bg danger" data-action="restart">Opnieuw beginnen</button></div>
      <div class="pm-confirm" data-restart-confirm hidden>
        <p>Opnieuw beginnen? Alles sinds je laatste opslag gaat verloren. Je andere opgeslagen spellen blijven staan.</p>
        <button type="button" class="m-bg" data-action="load">Laatste spel laden</button>
        <button type="button" class="m-bg danger" data-action="new">Nieuw spel (nieuwe plek)</button>
        <button type="button" class="m-bt" data-action="cancel">Annuleren</button>
      </div>
      <div class="pm-confirm" data-coop-load-confirm hidden>
        <p data-coop-load-text></p>
        <div class="m-acts"><button type="button" class="m-bp" data-action="coop-load-go">Ja, sessie beëindigen en laden</button><button type="button" class="m-bt" data-action="coop-load-cancel">Annuleren</button></div>
      </div>
      <div class="pm-confirm" data-coop-new-confirm hidden>
        <p data-coop-new-text></p>
        <div class="m-acts"><button type="button" class="m-bp" data-action="coop-new-go">Ja, sessie beëindigen en nieuw spel</button><button type="button" class="m-bt" data-action="coop-new-cancel">Annuleren</button></div>
      </div>`, `${pane('Spel', 'Je spel', '<p>Opslaan, laden, opnieuw beginnen en stoppen. Je spel wordt ook vanzelf bewaard.</p><p class="mut">Hoe het spel speelt en hoe moeilijk het is, staat onder Instellingen &gt; Spelregels; camera en hints onder Instellingen &gt; Camera en Hints &amp; uitleg.</p>')}`)}`;
}
// Problemen (#604): het foutrapport staat onder Over, niet meer als tabblad onder Instellingen. De
// Nederlandse samenvatting staat vooraan; de ruwe, Engelse meldingen zitten achter de vouw.
function problemsHtml() {
  return `<div class="pm-problems">
      <div class="m-gh"><span>Problemen</span></div>
      <p class="pm-note">Gaat er iets mis, dan schrijft het spel dat hier op. Alleen op dit apparaat: er wordt niets verstuurd. Kopieer het rapport en stuur het zelf mee met je melding. Er staat niets persoonlijks in: de melding, waar in de code, de versie, je verhaalstap, een paar instellingen en het soort videokaart.</p>
      <p class="pm-errsum" data-errsum role="status"></p>
      <div class="m-acts pm-errlog-actions">
        <button type="button" class="m-bg" data-action="errlog-copy">Kopieer het rapport</button>
        ${DESKTOP && DESKTOP.saveTextFile ? '<button type="button" class="m-bg" data-action="errlog-save">Opslaan als bestand</button>' : ''}
        <button type="button" class="m-bt" data-action="errlog-clear">Wissen</button>
      </div>
      <p class="pm-status" data-errlog-status role="status"></p>
      <details class="pm-errfold"><summary>Ruwe meldingen <span class="mut">voor wie wil meelezen</span></summary><ol class="pm-errlog" data-errlog></ol></details>
    </div>`;
}

export function initPauseMenu(w) {
  // #920: één menu, één keer. Een tweede init (een dubbel geladen module, een hervatte
  // pagina) maakte een tweede #pause-menu met een eigen toetsenlijst: Escape opende er dan
  // twee over elkaar. Het eerste menu blijft de eigenaar van de toetsen en de DOM.
  if (root || document.getElementById('pause-menu')) return;
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
  // Eén gele knop per scherm (24-11): heeft het zichtbare paneel een eigen primaire knop, dan wordt Doorgaan in de rail een secundaire (omlijnde) knop.
  const PRIMAIR = '.m-bp:not(:disabled), .ds-z-knop:not(.ds-z-knop--secundair, .ds-z-knop--ghost, .ds-z-knop--gevaar, :disabled, [aria-disabled="true"]), .m-bt.bz-hoofd:not(:disabled)';
  let syncGepland = false;
  const syncRailPrimair = () => { syncGepland = false; const p = root && root.querySelector('.pm-panel:not([hidden])'); root.classList.toggle('pm-eigen-primair', !!(p && [...p.querySelectorAll(PRIMAIR)].some((e) => e.offsetParent !== null))); };
  if (typeof MutationObserver === 'function') new MutationObserver(() => { if (!syncGepland) { syncGepland = true; requestAnimationFrame(syncRailPrimair); } }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'class'] });
  const railBtn = (id) => { const [, label] = sectionOf(id); return `<button type="button" class="ra ds-m-nieuw" data-goto="${id}" aria-current="false">${icon(id, 'pm-ic ra-ic')}<span class="ra-t">${label}</span><span class="n" data-n="${id}"></span></button>`; };
  // #911: elke groep met een eigen kop en het aantal onderdelen erachter; de telling volgt in
  // showTab wat er echt in de rail staat (het hoofdmenu toont er maar drie).
  const railGroup = ([id, label, members]) => `<div class="pm-rail-group" data-group="${id}"><span class="pm-rail-h"><span>${esc(label)}</span></span>` +
    members.map(railBtn).join('') + '</div>';
  root.innerHTML = `
    <div class="pm-fold gm-stage">
      <nav class="pm-rail" aria-label="Pauzemenu">
        <div class="pm-inner pm-game">
          <div class="pm-q-head">${logoHtml({ sub: false, cls: 'pm-logo', decorative: true })}<b id="pm-title" class="pm-sr">Pauze</b><span class="mut pm-q-info" data-info="when"></span></div>
          <div class="pm-rail-go"><button type="button" class="m-bp pm-go pm-ingame" data-action="resume" title="Terug naar het spel">${icon('resume', 'pm-ic')}<span>Doorgaan</span></button><button type="button" class="m-bg pm-findbtn" data-find-open title="Zoek in het menu (/)" aria-label="Zoek in het menu">${icon('search', 'pm-ic')}</button></div>
          ${RAIL_GROUPS.map(railGroup).join('<span class="pm-rail-sp"></span>')}
          <span class="pm-rail-gap"></span>
          ${DESKTOP ? `<button type="button" class="ra pm-exit" data-action="exit" title="Vraagt eerst of je het zeker weet; je voortgang wordt opgeslagen">${icon('exit', 'pm-ic ra-ic')}<span class="ra-t">Afsluiten</span></button>` : ''}
          <button type="button" class="ra pm-back" data-action="resume">Terug</button>
          <p class="pm-ver">${versionLabel(VERSION)}</p>
        </div>
      </nav>
      <section class="pm-sheet m-panel" aria-labelledby="pm-sheet-title">
        <header class="pm-sheet-head m-head">
          <div class="pm-sheet-titles"><span class="m-eb pm-sheet-eb" hidden></span><h1 class="m-h1 pm-sheet-title" id="pm-sheet-title"></h1></div>
          <div class="m-hr pm-sheet-r"><span class="mut pm-sheet-pos"></span></div>
        </header>
        <div class="pm-sheet-body">
          <section data-panel="todo" class="pm-panel pm-col" hidden><div class="pm-inner pm-todo">
            <div class="m-main"><div class="m-list td-list"><div data-of="todo" data-sub="alles"></div></div><aside class="m-pane td-detail" aria-label="Details"></aside></div>
          </div></section>
          <section data-panel="map" class="pm-panel pm-map" hidden></section>
          <section data-panel="spullen" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-spullen">
            <div class="pm-spulbar"><label class="m-inp pm-csearch">${icon('search')}
              <input type="search" data-spul-search data-osk="zoek" data-osk-chips="fiets|kast|stempel" placeholder="Zoek in je spullen, bijv. fiets, kast of stempel" aria-label="Zoek in je spullen" autocomplete="off" spellcheck="false">${oskKnop('je spullen')}</label>
              <div class="pm-chips pm-spulchips" role="group" aria-label="Deel van je spullen"><span class="sp-tabkey" aria-hidden="true">${glyphHtml('Q')}</span>${DELEN.map(([id, label]) => `<button type="button" class="m-chip" data-spul-deel="${id}" aria-pressed="${id === 'alles'}">${icoon(CAT_ICOON[id] || ICOON_TERUGVAL, { cls: 'pm-ic' })}${label}</button>`).join('')}<span class="sp-tabkey" aria-hidden="true">${glyphHtml('E')}</span><button type="button" class="m-chip sp-sort" data-spul-sort title="Wissel de volgorde van de tegels">${icon('sorteer')}<span>Sorteren: standaard</span></button></div>
            </div>
            <div class="m-main"><div class="m-list td-list"></div><aside class="m-pane td-detail" aria-label="Details"></aside></div></div></section>
          <section data-panel="garage" class="pm-panel pm-col" hidden><div class="pm-inner pm-garage"></div></section>
          <section data-panel="verhaal" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-verhaal">${subtabsHtml('verhaal', 'Verhaal')}
            <div class="m-main pm-vbody"><div data-of="verhaal" data-sub="opdrachten" data-keep class="pm-vsub pm-vopd"><div class="m-main"><div class="m-list td-list"></div><aside class="m-pane td-detail" aria-label="Details"></aside></div></div><div data-of="verhaal" data-sub="personages" class="pm-vsub" hidden></div></div>
          </div></section>
          <section data-panel="prestaties" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach"></div></section>
          <section data-panel="loopbaan" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-loopbaan"></div></section>
          <section data-panel="veroverd" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-veroverd"></div></section>
          <section data-panel="visboek" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-loopbaan pm-visboek"></div></section>
          <section data-panel="boerderij" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-ach pm-bezit">${subtabsHtml('boerderij', 'Land en bedrijf')}
            <div class="m-main pm-vbody"><div data-of="boerderij" data-sub="overzicht" class="pm-vsub pm-bezit-sub"></div><div data-of="boerderij" data-sub="boerderij" class="pm-vsub pm-ach pm-boerderij"></div><div data-of="boerderij" data-sub="bedrijven" class="pm-vsub pm-bezit-sub"></div><div data-of="boerderij" data-sub="tekoop" class="pm-vsub pm-bezit-sub"></div><div data-of="boerderij" data-sub="snack" class="pm-vsub pm-bezit-sub"></div><div data-of="boerderij" data-sub="club" class="pm-vsub pm-bezit-sub"></div></div>
          </div></section>
          <section data-panel="voetbal" class="pm-panel pm-col" hidden><div class="pm-inner pm-ach pm-voetbal"></div></section>
          <section data-panel="fotos" class="pm-panel pm-col" hidden><div class="pm-inner pm-fotos"></div></section>
          <section data-panel="streken" class="pm-panel pm-col" hidden><div class="pm-inner pm-streken"></div></section>
          <section data-panel="spel" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-settings">${spelHtml()}</div></section>
          <section data-panel="settings" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-settings">${settingsHtml()}</div></section>
          <section data-panel="over" class="pm-panel pm-col" hidden><div class="pm-inner pm-over"></div></section>
          <section data-panel="controls" class="pm-panel pm-col pm-tabbed" hidden><div class="pm-inner pm-cinner">
            ${subtabsHtml('controls', 'Besturing')}
            <label class="m-inp pm-csearch">${icon('search')}
              <input type="search" data-controls-search data-osk="zoek" data-osk-chips="toeter|duif|kaart" placeholder="Zoek een toets of actie, bijv. toeter, duif of Q" aria-label="Zoek in de besturing" autocomplete="off" spellcheck="false">${oskKnop('de besturing')}</label>
            <div data-of="controls" data-sub="overzicht" class="pm-csub" hidden>
              <div class="m-main"><div class="m-list pm-clist">
                <div class="pm-cgrid">${controlsHtml()}</div>
                <p class="m-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p>
              </div></div>
            </div>
            <div data-of="controls" data-sub="hulp" class="pm-csub" hidden><div class="m-main"><div class="m-list pm-clist"><p class="m-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p><div class="pm-cgrid"><section class="pm-cgroup pm-help" data-help="oefenronde"><h3>Oefenronde</h3><p class="pm-hline">Zeven korte stappen: lopen, rennen, de kaart, in- en uitstappen en het menu. Zonder missie en zonder gevolgen.</p><button type="button" class="m-bt" data-practice-start>Oefenen</button></section>${basisUitlegHtml()}${helpHtml((t) => glyphHtml(t), esc)}${controlsHelpHtml()}</div></div></div></div>
            <div data-of="controls" data-sub="aanraken" class="pm-csub" hidden><div class="m-main"><div class="m-list pm-clist"><p class="m-note pm-hline">De knoppen op het scherm doen hetzelfde als de controller. Wat je hier ziet, staat ook op je scherm tijdens het spelen.</p><p class="m-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p><div class="pm-cgrid">${touchOverviewHtml()}</div></div></div></div>
            <div data-of="controls" data-sub="toetsen" class="pm-binds pm-csub m-main" hidden></div>
            <div data-of="controls" data-sub="knoppen" class="pm-binds pm-csub m-main" hidden></div>
          </div></section>
        </div>
      </section>
      ${DESKTOP ? `<div class="pm-quitbox" data-quit-confirm hidden role="alertdialog" aria-modal="true" aria-labelledby="pm-quit-title">
        <div class="pm-quitpane">
          <span class="m-eb">Afsluiten</span>
          <h2 class="m-h2" id="pm-quit-title">Weet je het zeker?</h2>
          <p>Je voortgang wordt opgeslagen en daarna sluit het spel. Je kunt later gewoon verdergaan waar je nu bent.</p>
          <div class="m-acts"><button type="button" class="m-bp" data-action="exit-go">Ja, opslaan en sluiten</button><button type="button" class="m-bt" data-action="exit-cancel-ask">Annuleren</button></div>
        </div>
      </div>` : ''}
      <div class="pm-quitbox" data-exit-confirm hidden role="alertdialog" aria-modal="true" aria-label="Opslaan mislukt">
        <div class="pm-quitpane">
          <span class="m-eb">Stoppen</span>
          <h2 class="m-h2">Opslaan mislukt</h2>
          <p data-exit-text></p>
          <div class="m-acts"><button type="button" class="m-bp" data-action="exit-retry">Opnieuw proberen</button><button type="button" class="m-bg danger" data-action="exit-anyway">Toch sluiten</button><button type="button" class="m-bt" data-action="exit-cancel">Annuleren</button></div>
        </div>
      </div>
      <div class="pm-quitbox pm-findbox" data-find hidden role="dialog" aria-modal="true" aria-label="Zoek in het menu">
        <div class="pm-quitpane pm-findpane">
          <label class="m-inp pm-csearch">${icon('search')}<input type="search" class="pm-find-inp" data-find-input data-osk="zoek" data-osk-chips="kaart|geluid|besturing" placeholder="Zoek een scherm, instelling of actie" aria-label="Zoek in het menu" autocomplete="off" spellcheck="false">${oskKnop('het menu')}</label>
          <ul class="pm-find-list" data-find-list></ul>
          <p class="pm-find-hint" data-find-hint></p>
        </div>
      </div>
      <footer class="pm-footer m-foot"></footer>
    </div>`;
  document.body.appendChild(root);
  sheet = root.querySelector('.pm-sheet');

  mountMapView(root.querySelector('[data-panel="map"]'));
  setMapCloseHandler(() => setOpen(false));

  for (const type of ['mousedown', 'mouseup', 'wheel']) root.addEventListener(type, (e) => e.stopPropagation());

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-card-log]')) { setOpen(false); openCardLog(); return; }
    // "Uitleg opnieuw tonen": de drie eigen sleutels wissen (uitlegkaarten, contexthints,
    // geleerde toetsen), zodat een speler die de kaarten wegklikte ze terug kan krijgen
    if (e.target.closest('[data-hints-reset]')) {
      resetOnboarding(); resetContextHints(); resetHintUses(); resetUitlegNietMeer();
      menuMelding(explanationResetMessage(getSettings().onboardingTips));
      return;
    }
    if (e.target.closest('[data-practice-start]')) { setOpen(false); window.dispatchEvent(new CustomEvent('gde-oefenronde')); return; }
    if (e.target.closest('[data-find-open]')) { openFind(); return; }
    if (e.target.matches('[data-find]')) { closeFind(); return; }
    const fr = e.target.closest('[data-find-go]');
    if (fr) { runFind(Number(fr.dataset.findGo)); return; }
    const go = e.target.closest('[data-goto]');
    if (go) return enterSection(go.dataset.goto);
    const hint = e.target.closest('[data-hint]');
    if (hint) { if (hint.dataset.hint === 'back') goBack(); else runAction(hint.dataset.hint); return; }
    const fold = e.target.closest('[data-fold]');
    if (fold) { toggleFold(fold); return; }
    const pb = e.target.closest('[data-preset-btn]');
    if (pb) { applyPreset(pb.dataset.presetBtn); syncControls(); return; } // de voorinstellingen zijn knoppen (#435)
    if (e.target.closest('[data-diff-reset]')) { const t = e.target; changeWithGroup(world, { type: 'reset' }, () => { handleDifficultyClick(t); syncControls(); }); return; } // wereldopties: akkoord van de groep (difficultyvote.js)
    const pick = e.target.closest('[data-pick]');
    if (pick) { stepPicker(pick.closest('.m-pk'), Number(pick.dataset.pick)); return; }
    if (e.target.closest('[data-pad-test]')) { openPadTest(); return; }
    if (e.target.closest('[data-shake-proef]')) { proefSchudden(); return; }
    const gsub = e.target.closest('[data-goto-sub]');
    if (gsub) { const [sec, sub] = gsub.dataset.gotoSub.split(':'); pref.sub[sec] = sub; enterSection(sec); return; }
    const rk = e.target.closest('[data-rebind-key]');
    if (rk) return startKeyRebind(rk);
    const rp = e.target.closest('[data-rebind-pad]');
    if (rp) return startPadRebind(rp);
    const st = e.target.closest('[data-subtab]');
    if (st) { showSubtab(st.dataset.of, st.dataset.subtab); if (st.dataset.of === 'verhaal') renderVerhaalPanel(); if (st.dataset.of === 'boerderij' && st.dataset.subtab !== 'boerderij') { const q = (sub) => root.querySelector(`[data-panel="boerderij"] [data-sub="${sub}"]`); renderBezitPanels({ overzicht: q('overzicht'), bedrijven: q('bedrijven'), tekoop: q('tekoop'), snack: q('snack'), club: q('club') }, world); } if (st.dataset.of === 'controls') renderBinds(); if (st.dataset.of === 'spel' || st.dataset.of === 'samen') afterSpelSub(); return; }
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
    const gv = e.target.closest('[data-garage-sell]');
    if (gv) return garageSell(gv.dataset.garageSell);
    const gw = e.target.closest('[data-garage-koop]');
    if (gw) {
      const r = garageNaarWinkel(world, gw.dataset.garageKoop);
      if (r.ok) world.addMessage(r.text, 3);
      renderGaragePanel(garageEl(), world, r.text);
      return;
    }
    // de zenderkeuze (radiokeuze.js): een rij kiest die zender, de knop onderin gaat naar de volgende
    const chRow = e.target.closest('[data-channel]');
    if (chRow) { selectChannel(chRow.dataset.channel, { announce: false }); syncChannels(chRow.dataset.channel); return; }
    if (e.target.closest('[data-channel-next]')) { stepChannel(1); syncChannels(); return; }
    const gf = e.target.closest('[data-garage-find]');
    if (gf) return garageFind(gf.dataset.garageFind);
    const gs = e.target.closest('[data-garage-select]');
    if (gs) return selectGarageVehicle(garageEl(), gs.dataset.garageSelect);
    if (tab === 'fotos' && fotoClick(e, world, root.querySelector('[data-panel="fotos"] .pm-inner'), { close: () => closePauseMenu() })) return;
    if (tab === 'verhaal' && pref.sub.verhaal === 'opdrachten' && todoClick(e, world, root.querySelector('[data-of="verhaal"][data-sub="opdrachten"]'), todoApi)) return;
    if (tab === 'verhaal' && verhaalClick(e, activePanel(), { close: () => closePauseMenu() })) return;
    if (tab === 'streken' && cheatsClick(e, world, cheatsApi)) return;
    const action = e.target.closest('[data-action]');
    if (action) runAction(action.dataset.action);
  });
  root.addEventListener('input', (e) => {
    if (e.target.dataset && 'radioSwitch' in e.target.dataset) { setRadio(e.target.checked, { announce: false }); syncControls(); return; }
    // dempen is een stand van deze speler, geen instelling in gde-settings: de knop roept dezelfde
    // toggleMute als de U-toets en de HUD-luidspreker, zodat er één waarheid is (audio.js)
    if (e.target.dataset && 'muteSwitch' in e.target.dataset) { if (isMuted() !== e.target.checked) toggleMute(); syncControls(); return; }
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
    // #915: de vraag is echt modaal; de focus kan niet naar de rail of het blad erachter
    const vraag = visibleQuestion();
    if (vraag && !vraag.contains(e.target)) {
      const b = visibleFocusables(vraag)[0];
      if (b) b.focus({ preventScroll: true });
      return;
    }
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

  // het zoekvenster van het menu (21-11): dezelfde afscherming, plus pijl omlaag naar de lijst en Enter op de beste
  const findInp = root.querySelector('[data-find-input]');
  for (const type of ['keydown', 'keyup', 'keypress']) {
    findInp.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type !== 'keydown') return;
      if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); focusEl(root.querySelector('[data-find] .pm-find-r')); }
      else if (e.key === 'Enter') { e.preventDefault(); runFind(0); }
    });
  }
  findInp.addEventListener('input', () => renderFind(findInp.value));

  // het zoekveld van Spullen (#435): dezelfde afscherming, zodat typen niet in het spel belandt
  const spulZoek = root.querySelector('[data-spul-search]');
  for (const type of ['keydown', 'keyup', 'keypress']) {
    spulZoek.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type !== 'keydown' || e.key !== 'Escape') return;
      e.preventDefault();
      if (spulZoek.value) { spulZoek.value = ''; zetSpullenZoek(''); spullenApi.rerender(); } else spulZoek.blur();
    });
  }
  spulZoek.addEventListener('input', () => { zetSpullenZoek(spulZoek.value); spullenApi.rerender(); });

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
    // de tegel is weg (het laatste stuk eten op): de focus gaat naar de tegel die nu gekozen is, niet terug naar de bovenste
    const back = (sel && activePanel().querySelector(sel)) || (keep ? activePanel().querySelector('[data-spul][aria-current="true"]') : null);
    if (back) back.focus({ preventScroll: true });
  },
};

function renderSpullenPanel() {
  try { sheetNote(renderSpullen(root.querySelector('[data-panel="spullen"]'), world)); } catch (err) { console.error('spullen', err); }
}

const phoneApi = {
  // #603: na een gesprek of bericht opnieuw tekenen; de inbox en het personage blijven staan
  rerender: () => renderPhone(),
};

const todoApi = {
  rerender: (keep) => rerenderTodo(keep),
  showView: (view) => {
    if (view === 'verhaal') { pref.sub.verhaal = 'opdrachten'; enterSection('verhaal'); return; }
    // 'dichtbij' is een filter boven Activiteiten, geen eigen weergave met eigen klikgedrag (#607)
    setTodoFilter(view === 'dichtbij');
    enterSection('todo');
  },
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

// Over: version, the changelog, the credits and (since #604) the problems: a Dutch summary first,
// the English technical details folded away. The newest version(s) and the folds are built by
// over.js; "Alles" and the two reference blocks are filled in only when opened (#612). Opening
// this section counts as "seen", so the news is no longer marked as new on the next start.
function renderOverPanel(el) {
  if (!el) return;
  newsOnStart();
  el.innerHTML = `<div class="m-main"><div class="m-list pm-over">
    <div class="pm-over-news" aria-live="polite"><p class="mut">De lijst met wijzigingen laden…</p></div>
    ${problemsHtml()}
  </div></div>`;
  renderErrorLog();
  const box = el.querySelector('.pm-over-news');
  loadChangelogVersions().then((versions) => {
    if (!box || !box.isConnected) return;
    box.innerHTML = overBodyHtml(versions);
    const credits = box.querySelector('[data-fold-body="over-credits"]');
    if (credits) credits.innerHTML = CREDITS_HTML;
    const licenses = box.querySelector('[data-fold-body="over-licenses"]');
    if (licenses) licenses.innerHTML = LICENSES_HTML;
  });
  if (el.dataset.overBound) return;
  el.dataset.overBound = '1';
  // "Alles": the rest of the changelog, parsed once and filled in on the first open
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-over-alles]');
    const body = btn && el.querySelector('[data-over-alles-body]');
    if (!body) return;
    const open = body.hidden;
    body.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (!open || body.dataset.filled) return;
    body.dataset.filled = '1';
    loadChangelogVersions().then((versions) => { if (versions && body.isConnected) body.innerHTML = allVersionsHtml(versions); });
  });
}

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function consume(e) {
  e.preventDefault();
  e.stopPropagation();
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // the play-ahead question (todo.js) has its own keys
  if (isPlayAheadOpen() || isSaveSlotsOpen() || isHelpOfferOpen() || isRecapOpen()) return;
  const k = e.key;
  const lower = k.length === 1 ? k.toLowerCase() : k;
  if (!open) {
    // de fotomodus heeft zijn eigen Escape en M (#435): anders komt het pauzemenu over de foto heen
    if (isPhotoMode()) return;
    // een laadscherm of reisscène dekt het spel af (z-index 50 en 9000, boven het menu op 40):
    // Escape of M opende daar een onzichtbaar pauzemenu, dat je pas na aankomst ineens zag.
    if (document.getElementById('load-screen') || (world && world.uiPaused)) return;
    if (e.repeat || !started()) return;
    if (k === 'Escape' && document.body.classList.contains('mg-board')) return;
    if (k === 'Escape' || (lower === 'm' && !isCinematicActive())) {
      e.preventDefault();
      // er lag net een bericht of gesprek: Escape opent de telefoon op dat gesprek (#151)
      const thread = k === 'Escape' ? takeNoticeThread() : '';
      if (thread) { openPauseMenu('telefoon', { thread }); return; }
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
  // de kaartvensters (de uitleg, de reispopup) en de plekkaart hebben het toetsenpatroon van alle kaartpopups (mapview.js kaartToets, 21-11)
  if (tab === 'map' && kaartToets(e)) return;
  const dir = ARROWS[k];
  if (e.repeat && !dir) return;
  // #915: een open vraag houdt alle andere menutoetsen tegen; alleen Esc, Tab, de pijlen
  // en Enter/Space (op de twee knoppen) doen nog iets.
  if (visibleQuestion() && !(k === 'Escape' || k === 'Backspace' || k === 'Tab' || dir || k === 'Enter' || k === ' ')) {
    consume(e);
    return;
  }
  const inRail = !!(t && t.closest && t.closest('.pm-rail'));
  if (k === '/' && !e.repeat) { consume(e); openFind(); return; }
  if (k === 'Escape' || k === 'Backspace') {
    consume(e);
    goBack();
  } else if (lower === 'm' && !prestart) {
    consume(e);
    if (tab === 'map') setOpen(false);
    else enterSection('map');
  } else if (lower === 'q' || lower === 'e' || k === '[' || k === ']') {
    consume(e);
    if (e.repeat) return;
    const dir = lower === 'q' || k === '[' ? -1 : 1;
    // Q/E and [ ] do what the footer says (DESIGN_SYSTEM.md, "Menus"): the visible tab
    // row first, the innermost one on a screen with a second row (Spel > Samen spelen),
    // then the section's own tabs, then the previous or next section (#601).
    if (tab === 'spullen' && cycleSpullenDelen(dir)) return;
    if (SUBTABS[tab] && cycleVisibleTabs(dir)) return;
    if (cycleOwnTabs(dir)) return;
    cycleSection(dir);
  } else if (k === 'Tab') {
    consume(e);
    // controller (#985): L3 (Tab) gaat op de kaart naar de knoppen op de kaart zelf (zoeken, lagen, zoom, de kaartkaart) en weer terug
    if (tab === 'map' && !inRail && e.__gde === 'pad') toggleMapControls(root, t);
    else if (tab === 'map' && !inRail) cycleSection(e.shiftKey ? -1 : 1);
    else tabFocus(e.shiftKey ? -1 : 1);
  } else if (tab === 'loopbaan' && lower === 't' && !e.repeat && loopbaanWissel(activePanel())) {
    consume(e);
  } else if (tab === 'loopbaan' && (dir === 'up' || dir === 'down' || k === 'Home' || k === 'End') && tourNavigeer(activePanel(), t, k)) {
    consume(e);
  } else if (tab === 'spullen' && (k === 'Home' || k === 'End' || k === 'PageUp' || k === 'PageDown') && t && t.dataset && t.dataset.spul && spullenNavigeer(activePanel(), t, k.toLowerCase())) {
    consume(e);
  } else if (dir) {
    // de draaitafel van de Garage: links en rechts draaien het model als de
    // focus op het model staat (#610); omhoog/omlaag blijven focus verplaatsen
    // de galerij van Spullen: pijltjes en D-pad lopen over de tegels (links, rechts, omhoog, omlaag); aan de rand neemt het menu het over
    if (tab === 'spullen' && t && t.dataset && t.dataset.spul && spullenNavigeer(activePanel(), t, dir)) { consume(e); return; }
    if (tab === 'spullen' && (dir === 'left' || dir === 'right') && t && t.closest && t.closest('[data-spul-stage]') && turnSpullenViewer(dir === 'left' ? -1 : 1)) { consume(e); return; }
    if (tab === 'garage' && (dir === 'left' || dir === 'right') && t && t.closest && t.closest('.gar-stage') && turnGarageViewer(dir === 'left' ? -1 : 1)) { consume(e); return; }
    // the map pans with the arrows (and WASD) unless the rail has focus; staat de focus van een controller op een knop van
    // de kaart zelf (de kaartkaart na A, Lagen, zoomen), dan lopen de pijlen langs die knoppen en pant de kaart niet (#985)
    if (tab === 'map' && !inRail) {
      if (!(e.__gde === 'pad' && mapControlList(root).includes(t))) return;
      consume(e);
      stepMapControls(root, t, dir);
      return;
    }
    if (t && t.tagName === 'SELECT') return;
    consume(e);
    if (t && t.type === 'range' && (dir === 'left' || dir === 'right')) stepRange(t, dir === 'right' ? 1 : -1);
    else if (t && t.closest && t.closest('.m-pk') && (dir === 'left' || dir === 'right')) stepPicker(t.closest('.m-pk'), dir === 'right' ? 1 : -1);
    // de zenderlijst: links en rechts (D-pad) wisselen van zender, zoals bij een keuzerij; omhoog en omlaag lopen door de rijen
    else if (t && t.closest && t.closest('[data-channels]') && (dir === 'left' || dir === 'right')) { stepChannel(dir === 'right' ? 1 : -1); syncChannels(); }
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
    } else if (k === 'Enter' && t.dataset && t.dataset.spul && tab === 'spullen') {
      // Enter op een kaart in Spullen: meteen de actie (#502). Een klik toont alleen de
      // details; met Tab naar de actieknop gaat net als voorheen. Een kaart zonder actie
      // klikt gewoon, zoals eerst (dat zet alleen de focus).
      consume(e);
      if (spullenEnter(activePanel(), t.dataset.spul, spullenApi)) {
        // de kaart kan weg zijn (het laatste stuk eten op): de focus gaat naar de lijst
        const paneel = activePanel();
        if (!paneel.contains(document.activeElement)) focusEl(paneel.querySelector('[data-spul]'));
      } else t.click();
    } else if (t.tagName === 'BUTTON') {
      // input.js cancels Space (no page scroll), which also cancels the
      // button's own click: both keys click here, once
      consume(e);
      t.click();
    }
  }
}

// #915: de afsluitvraag en de foutvraag zijn echte modale lagen. Zolang er één open
// staat is de rest van het menu inert en houdt Tab de focus binnen de vraag; anders liep
// een toetsenbordgebruiker achter de dialoog langs naar de rail.
function visibleQuestion() {
  if (!root) return null;
  return root.querySelector('[data-quit-confirm]:not([hidden])') || root.querySelector('[data-exit-confirm]:not([hidden])') || root.querySelector('[data-find]:not([hidden])');
}

function syncQuestionLayers() {
  if (!root) return;
  const on = !!visibleQuestion();
  const fold = root.querySelector('.pm-fold');
  // Alleen het menu achter de vraag wordt inert; de vraag zelf staat in de fold en
  // moet juist focusbaar en klikbaar blijven (#915).
  if (fold) for (const el of fold.querySelectorAll('.pm-rail, .pm-sheet')) el.inert = on;
  root.classList.toggle('pm-question', on);
}

function showQuestion(box, on) {
  if (!box) return;
  box.hidden = !on;
  syncQuestionLayers();
}

// Zoeken in het menu (21-11): "/" of de knop bovenaan de rail. Typ een woord, kies met de pijlen of de muis en Enter
// gaat erheen: een scherm, een onderdeel, een instelling (de rij licht even op) of een actie (opslaan, afsluiten).
// Zonder woord staat er een beginlijst, zodat het met een controller ook werkt zonder te typen.
let findRegels = [];
let findHits = [];
const findOpen = () => !!(root && root.querySelector('[data-find]:not([hidden])'));

function bouwFindRegels() {
  const regels = [];
  const plekVan = (id) => { const g = RAIL_GROUPS.find(([, , m]) => m.includes(CHILD[id] || id)); return g ? g[1] : ''; };
  if (!prestart) {
    regels.push(maakRegel({ id: 'a-resume', soort: 'actie', label: 'Doorgaan', plek: 'Terug naar het spel', zoek: 'verder spelen sluiten', ic: 'resume', act: 'resume' }));
    regels.push(maakRegel({ id: 'a-save', soort: 'actie', label: 'Spel opslaan', plek: 'Bewaart je voortgang', zoek: 'bewaren', ic: 'save', act: 'save' }));
    regels.push(maakRegel({ id: 'a-saves', soort: 'actie', label: 'Opgeslagen spellen', plek: 'Laden of verwijderen', zoek: 'kiezen hernoemen exporteren savegame', ic: 'load', act: 'saves' }));
  }
  if (!prestart && sectionVisible('boerderij')) regels.push(maakRegel({ id: 'a-farm', soort: 'actie', label: 'Naar mijn boerderij', plek: 'Je akker en gewassen', zoek: 'akker perceel gewas landbouw', ic: 'boerderij', act: 'farm' }));
  if (DESKTOP) regels.push(maakRegel({ id: 'a-exit', soort: 'actie', label: 'Afsluiten', plek: 'Slaat je voortgang op', zoek: 'stoppen sluiten spel verlaten', ic: 'exit', act: 'exit' }));
  for (const id of sectionIds()) {
    const [, label, hint] = sectionOf(id);
    regels.push(maakRegel({ id: 's-' + id, soort: 'scherm', label, plek: plekVan(id), zoek: hint, ic: id, sec: id }));
  }
  for (const of of Object.keys(SUBTABS)) {
    if (of === 'samen' || !sectionIds().includes(of)) continue;
    const [, sl] = sectionOf(of);
    for (const [id, tekst] of subsOf(of)) regels.push(maakRegel({ id: `o-${of}-${id}`, soort: 'onderdeel', label: tekst, plek: sl, ic: of, sec: of, sub: id }));
  }
  let n = 0;
  for (const row of root.querySelectorAll('[data-of="settings"][data-sub] .m-li, [data-of="spel"][data-sub] .m-li')) {
    const nm = row.querySelector('.nm');
    const label = nm && nm.firstChild ? String(nm.firstChild.textContent || '').trim() : '';
    const holder = row.closest('[data-of][data-sub]');
    if (!label || !holder || !sectionIds().includes(holder.dataset.of)) continue;
    const [, sl] = sectionOf(holder.dataset.of);
    const sub = (SUBTABS[holder.dataset.of].find(([id]) => id === holder.dataset.sub) || [])[1] || '';
    row.dataset.findId = String(n++);
    const mut = row.querySelector('.nm .mut');
    regels.push(maakRegel({ id: 'i-' + row.dataset.findId, soort: 'instelling', label, plek: sub ? sl + ' > ' + sub : sl, zoek: `${mut ? mut.textContent : ''} ${synonymsFor((row.querySelector('[data-setting]') || { dataset: {} }).dataset.setting)}`, ic: holder.dataset.of, sec: holder.dataset.of, sub: holder.dataset.sub, rij: row.dataset.findId }));
  }
  return regels;
}

function renderFind(q = '') {
  const lijst = root.querySelector('[data-find-list]');
  findHits = zoekRegels(findRegels, q, 8);
  lijst.innerHTML = findHits.length
    ? findHits.map((r, i) => `<li><button type="button" class="pm-find-r" data-find-go="${i}">${icon(r.ic, 'pm-ic')}<span class="pm-find-t">${esc(r.label)}</span><span class="pm-find-p">${esc(r.plek || SOORTEN[r.soort])}</span><span class="pm-find-k">${SOORTEN[r.soort]}</span></button></li>`).join('')
    : '<li class="pm-find-leeg">Niks gevonden. Probeer een ander woord, bijvoorbeeld "geluid" of "opslaan".</li>';
  root.querySelector('[data-find-hint]').textContent = q.trim() ? '' : 'Typ een woord, of kies hieronder een scherm of actie.';
}

function openFind() {
  if (!root || !open || findOpen()) return;
  cancelRebind(true);
  findRegels = bouwFindRegels();
  const box = root.querySelector('[data-find]');
  const inp = box.querySelector('[data-find-input]');
  inp.value = '';
  renderFind('');
  showQuestion(box, true);
  if (isPadActive()) focusEl(box.querySelector('.pm-find-r'));
  else inp.focus();
}

function closeFind() {
  const box = root && root.querySelector('[data-find]');
  if (!box || box.hidden) return;
  showQuestion(box, false);
  focusEl(root.querySelector('[data-find-open]'));
}

function runFind(i) {
  const r = findHits[i];
  if (!r) return;
  showQuestion(root.querySelector('[data-find]'), false);
  if (r.act === 'farm') { enterSection('boerderij'); return; }
  if (r.act) { runAction(r.act); return; }
  if (r.sub) pref.sub[r.sec] = r.sub;
  enterSection(r.sec);
  if (r.rij == null) return;
  const row = root.querySelector(`[data-find-id="${r.rij}"]`);
  if (!row) return;
  const body = row.closest('[data-fold-body]');
  if (body && body.hidden) { const kop = root.querySelector(`[data-fold="${body.dataset.foldBody}"]`); if (kop) toggleFold(kop, true); }
  focusEl(row.querySelector('input, select, button') || row);
  row.classList.add('pm-flash');
  setTimeout(() => row.classList.remove('pm-flash'), 1800);
}

// Esc/Backspace: close an open confirm, then back to Overzicht, then close.
function goBack() {
  // het zoekvenster (21-11) gaat voor alles met Escape dicht
  if (findOpen()) { closeFind(); return; }
  // de oneShote uitleg op de kaart gaat met Escape (en B) eerst weg; de kaart blijft open
  if (tab === 'map' && (kaartUitlegSluiten() || kaartReisPopupSluiten() || kaartPlekkaartSluiten())) return; // daarna de reispopup en de plekkaart (21-11): een laag terug per Esc of B
  // Spullen (#1013): een openstaande vraag "Weggooien?" gaat eerst weg met Escape
  if (tab === 'spullen' && spullenAnnuleer(activePanel())) return;
  // Samen spelen (#527): de hub met drie stappen gaat eerst zelf een stap terug, zodat Escape de sessie nooit
  // afsluit (de uitweg heet daar Ontsnappen naar besloten). Pas op de eerste stap doet Escape wat het altijd deed.
  // Het tabblad Spelers heeft zijn eigen lijst zonder hub; daar blijft Escape dus buiten.
  if (tab === 'spel' && pref.sub.spel === 'samen' && (pref.sub.samen || 'samen') !== 'spelers' && samenHubTerug()) return;
  // #604: de vraag "alles terug naar de standaard?" gaat eerst weg met Escape
  const resetBox = root.querySelector('[data-reset-confirm]');
  if (resetBox && !resetBox.hidden) {
    resetBox.hidden = true;
    root.querySelector('[data-action="reset"]').focus();
    return;
  }
  const confirmEl = root.querySelector('[data-restart-confirm]');
  // #492: de vraag "sessie beëindigen en een nieuw spel?" gaat eerst weg met Escape; de knop
  // waar hij vandaan kwam (in het herstartvak) komt terug.
  const coopNew = root.querySelector('[data-coop-new-confirm]');
  if (coopNew && !coopNew.hidden) {
    coopNew.hidden = true;
    confirmEl.hidden = false;
    const b = confirmEl.querySelector('[data-action="new"]');
    if (b) b.focus();
    return;
  }
  if (!confirmEl.hidden) {
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
    return;
  }
  const exitBox = root.querySelector('[data-exit-confirm]');
  if (exitBox && !exitBox.hidden) {
    showQuestion(exitBox, false);
    closeAction = null;
    const b = root.querySelector('[data-action="exit"]') || root.querySelector('[data-action="menu"]');
    if (b) b.focus();
    return;
  }
  // #915: de vraag bij het afsluiten gaat voor alles; Esc sluit alleen de vraag
  const quitBox = root.querySelector('[data-quit-confirm]');
  if (quitBox && !quitBox.hidden) {
    showQuestion(quitBox, false);
    const b = root.querySelector('[data-action="exit"]');
    if (b) b.focus();
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
  if (id === 'bezit') id = 'boerderij';
  if (!sectionIds().includes(id)) id = sectionIds()[0];
  showTab(id, 'home');
  focusSheet();
}

const FOCUSABLE = 'button, input, select, [tabindex]';
function visibleFocusables(scope) {
  // een controller bereikt de zoekvelden ook (22-11): A opent het schermtoetsenbord (padkeyboard.js) en B verlaat het veld weer (gamepad.js)
  return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[hidden]'));
}

// Q/E and [ ] switch the visible tab row of the section; Spel > Samen spelen has a
// second row (Samen spelen, Spelers) inside the tab, and that innermost row wins
// (#601). One rule, so the key always changes the row the footer points at.
function cycleVisibleTabs(dir) {
  const panel = activePanel();
  if (!panel) return false;
  const lists = [...panel.querySelectorAll('[role="tablist"]')].filter((l) => l.getClientRects().length && !l.closest('[hidden]'));
  const list = lists[lists.length - 1];
  if (!list) return false;
  const tabs = [...list.querySelectorAll('[role="tab"]')].filter((t) => t.getClientRects().length && !t.disabled);
  if (tabs.length < 2) return false;
  const i = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const next = tabs[(i + dir + tabs.length) % tabs.length];
  next.click();
  // the sliders of Spel and Instellingen show the values of the tab that is now open
  if (tab === 'settings' || tab === 'spel') syncControls();
  const again = activePanel().querySelector(`[data-of="${next.dataset.of}"][data-subtab="${next.dataset.subtab}"]`);
  focusEl(again || next);
  return true;
}

// Spullen: Q en E wisselen tussen de groepen (Alles, Uitrusting, Thuis, Verzamelingen), zoals de footer zegt
function cycleSpullenDelen(dir) {
  const chips = [...root.querySelectorAll('[data-panel="spullen"] [data-spul-deel]')];
  if (!chips.length) return false;
  const i = Math.max(0, chips.findIndex((c) => c.getAttribute('aria-pressed') === 'true'));
  chips[(i + dir + chips.length) % chips.length].click();
  return true;
}

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
// #604: "Standaard herstellen" vraagt eerst en kan daarna ongedaan gemaakt worden; deze
// momentopname houdt de stand van vlak voor het herstellen vast (niets wordt bewaard als
// de speler niets doet).
let resetBackup = null;

function bindPane(kind, note, extra = '') {
  const titel = kind === 'keys' ? 'Toets wijzigen' : 'Knop wijzigen';
  const kop = kind === 'keys' ? 'Toetsenbord en muis' : 'Controller';
  return `<aside class="m-pane"><div class="pm-pane-top"><span class="m-eb">${kop}</span><h2 class="m-h2 td-h2">${titel}</h2></div>` +
    `<p>${braceKeysHtml(note)}</p><p class="pm-status pm-bindmsg g" role="status">${braceKeysHtml(esc(bindMsg))}</p><span class="m-grow"></span>` +
    `<div class="m-acts td-acts"><button type="button" class="m-bg" data-action="binds-reset-${kind === 'keys' ? 'keys' : 'pad'}">${icon('restart')}Standaard herstellen</button></div>${extra}</aside>`;
}

// Een actie heeft vaak een hoofdgedaante en daarna varianten per voertuig of minigame
// ("Vooruit, gas geven; heli: vooruit; vliegtuig: gas"). Die varianten in dezelfde regel
// proppen maakte de lijst onleesbaar (spelersfeedback 15-11), dus de hoofdactie staat
// vooraan en de varianten staan compact op een tweede regel.
function splitAction(desc) {
  const delen = String(desc).split(';').map((t) => t.trim()).filter(Boolean);
  const hoofd = delen.shift() || '';
  const varianten = [];
  for (const d of delen) {
    const m = d.match(/^([^:]+):\s*(.+)$/);
    if (m) varianten.push(`${m[1].trim()} ${m[2].trim()}`);
    else varianten.push(d);
  }
  return { hoofd, varianten };
}

function bindRowsKeys() {
  const binds = getSettings().keyBinds;
  const groups = KEY_GROUPS.map(([g, title]) => `<div class="m-gh"><span>${esc(title)}</span></div>` + KEY_ACTIONS.filter(([, , gr]) => gr === g).map(([k, desc]) => {
    const phys = physicalKey(binds, k);
    const changed = phys !== defaultKey(k);
    const { hoofd, varianten } = splitAction(desc);
    const ook = varianten.length ? `<span class="mut one pm-ook">Ook: ${esc(varianten.join(' · '))}</span>` : '';
    return `<button type="button" class="m-li pm-bind${changed ? ' pm-changed' : ''}" data-rebind-key="${esc(k)}" aria-label="${esc(desc)}: ${esc(keyName(phys))}. Kies om te wijzigen">` +
      `<span class="nm"><span class="one">${esc(hoofd)}</span>${ook}${changed ? `<span class="mut">Standaard: ${esc(keyName(defaultKey(k)))}</span>` : ''}</span><span class="m-kc" data-g-raw>${esc(keyName(phys))}</span></button>`;
  }).join('')).join('');
  const note = `Kies een actie en druk de nieuwe toets. Zit die toets al op iets anders, dan ruilen ze. {ESC}, {ENTER}, {ARROWS} en de muis liggen vast.${defaultKey('control') !== 'control' ? ' In de browser zit bukken en omlaag op {C}: {CTRL}+{W} sluit daar het tabblad.' : ''}`;
  return `<p class="m-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p><div class="m-list pm-slist">${groups}</div>${bindPane('keys', note)}`;
}

function bindRowsPad() {
  const binds = getSettings().padBinds;
  const rows = PAD_REMAPPABLE.map((slot) => {
    const phys = physicalButton(binds, slot);
    const changed = phys !== slot;
    // UX-audit 23-11 (S10): per context een kolom (Te voet, Rijden, Menu) in plaats van drie contexten in één regel met puntjes
    const u = slotUseParts(slot);
    const cel = (ctx, t) => `<span class="pm-ctx" data-ctx="${ctx}">${t ? esc(t) : '<span class="mut" aria-hidden="true">–</span>'}</span>`;
    return `<button type="button" class="m-li pm-bind pm-bind-pad${changed ? ' pm-changed' : ''}" data-rebind-pad="${slot}" aria-label="${esc(PAD_SLOT_NAMES[slot])}: ${esc(slotUses(slot) || PAD_SLOT_NAMES[slot])}. Kies om te wijzigen">` +
      `<span class="nm"><span class="one">${esc(PAD_SLOT_NAMES[slot])}${changed ? ' · aangepast' : ''}</span></span>${cel('voet', u.voet)}${cel('rijden', u.rijden)}${cel('menu', u.menu)}<span class="pm-padcap">${pg(phys)}</span></button>`;
  }).join('');
  const kop = '<div class="pm-bind-pad pm-padkop" aria-hidden="true"><span class="nm">Knop</span><span class="pm-ctx">Te voet</span><span class="pm-ctx">Rijden</span><span class="pm-ctx">Menu</span><span class="pm-padcap"></span></div>';
  return `<p class="m-note pm-cempty" hidden>Niks gevonden. Probeer een ander woord of een toets.</p><div class="m-list pm-slist">${kop}${rows}</div>${bindPane('pad', 'Kies een rij en druk op de controller de knop die het voortaan moet doen. Ze ruilen van plek. Menu/Start opent altijd het pauzemenu; de sticks liggen vast.')}`;
}

function renderBinds() {
  if (!root) return;
  const a = document.activeElement;
  const keep = a && root.contains(a) && a.dataset ? (a.dataset.rebindKey || a.dataset.rebindPad || a.dataset.action) : null;
  const k = root.querySelector('[data-of="controls"][data-sub="toetsen"]');
  const p = root.querySelector('[data-of="controls"][data-sub="knoppen"]');
  // ook als het tabblad dicht is: een reset op de Besturing-tab moet de lijst verversen
  // voordat de speler hem weer opent (review 0.62)
  if (k) k.innerHTML = bindRowsKeys();
  if (p) p.innerHTML = bindRowsPad();
  const zoek = root.querySelector('[data-controls-search]');
  if (zoek && zoek.value) filterControls(zoek.value);
  syncKeyChanged();
  if (keep) {
    const el = root.querySelector(`[data-rebind-key="${CSS.escape(keep)}"], [data-rebind-pad="${CSS.escape(keep)}"], [data-action="${CSS.escape(keep)}"]`);
    if (el) el.focus({ preventScroll: true });
  }
}

function setBindMsg(text) {
  bindMsg = text;
  for (const el of root.querySelectorAll('.pm-bindmsg')) el.innerHTML = braceKeysHtml(esc(text));
}

const actionWords = (c) => (KEY_ACTIONS.find(([k]) => k === c) || [c, c])[1];

function startKeyRebind(btn) {
  cancelRebind(true);
  const canon = btn.dataset.rebindKey;
  // #605: de wachtstand houdt de actienaam in beeld, zodat je weet wat je aan het indelen bent
  btn.classList.add('pm-waiting');
  btn.innerHTML = `<span class="nm"><span class="one">${esc(actionWords(canon))}</span><span class="mut">Druk een toets…</span></span><span class="m-kc">…</span>`;
  setBindMsg('Druk de nieuwe toets. {ESC} annuleert.');
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
  // #605: ook hier blijft de actienaam staan terwijl je op een knop wacht
  btn.classList.add('pm-waiting');
  btn.innerHTML = `<span class="nm"><span class="one">${esc(slotUses(slot) || PAD_SLOT_NAMES[slot])}</span><span class="mut">Druk een knop…</span></span><span class="pm-padcap">…</span>`;
  setBindMsg('Druk op de controller de nieuwe knop. Menu/Start of {ESC} annuleert.');
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
  if (!rebinding) {
    // #586: ook zonder wachtstand mag er geen toets meer door de capture worden opgeslokt
    if (input) input.captureKey = null;
    return;
  }
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
  // Focus zonder de sheet te laten scrollen: op 1280x720 is de inhoud hoger dan het blad en
  // scrollIntoView trok de grote titel boven het scherm uit (#906). De lijst zelf scrollt.
  const zet = (el) => {
    if (!el) return;
    el.focus({ preventScroll: true });
    // Alleen de lijst of het detail zelf mag naar de focus scrollen, nooit het hele blad: anders
    // verdwijnt de grote titel boven het scherm (#906). Buiten een scroller (een tab, de eerste
    // knop van een paneel) blijft de stand zoals hij is.
    const sc = scrollerOf(el, panel);
    if (!sc || sc === panel) return;
    const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
    if (r.top < s.top || r.bottom > s.bottom) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  if (prev && prev.isConnected && panel.contains(prev) && prev.getClientRects().length && !prev.closest('[hidden]')) return zet(prev);
  const list = visibleFocusables(panel).filter((el) => !(el.tagName === 'INPUT' && el.type === 'search'));
  zet(panel.querySelector('[role="tab"][aria-selected="true"]') || list[0] || root.querySelector(`.pm-game [data-goto="${tab}"]`));
}

// Tab/Shift+Tab stay inside the menu, and inside a question that is open (#915).
function tabFocus(dir) {
  const vraag = visibleQuestion();
  const scopes = vraag ? [vraag] : [root.querySelector('.pm-game'), root.querySelector('.pm-sheet-head'), activePanel()];
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
  const cur = String(getSettings()[pk.dataset.setting]);
  return { options, i: Math.max(0, options.findIndex(([v]) => v === cur)) };
}

function stepPicker(pk, dir) {
  if (!pk || pk.getAttribute('aria-disabled') === 'true') return;
  if (pk.dataset.diffopt) { changeWithGroup(world, { type: 'option', key: pk.dataset.diffopt }, () => { stepDifficultyPicker(pk, dir); syncControls(); }); return; } // #1169: een optie van de moeilijkheid, uit de save
  const { options, i } = pickerState(pk);
  const next = Math.min(options.length - 1, Math.max(0, i + dir));
  if (next === i) return;
  if (pk.dataset.setting === 'difficulty') { const naar = options[next][0]; changeWithGroup(world, { type: 'level', naar }, () => { setSetting('difficulty', naar); syncControls(); }); return; } // het niveau raakt de wereld: akkoord van de groep
  setSetting(pk.dataset.setting, options[next][0]);
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

// Loopbanen (DS3, 21-11): T wisselt tussen de tour en de vakken (de toets staat in de knop), en in de tijdlijn lopen de pijlen en het D-pad
// stop voor stop (listnav.js, hetzelfde patroon als de kaartpopups). Aan de rand van de tijdlijn neemt het menu het over (false).
function loopbaanWissel(paneel) {
  const knop = paneel && paneel.querySelector('[data-lb-weergave][aria-pressed="false"]');
  if (!knop) return false;
  knop.click();
  return true;
}
function tourNavigeer(paneel, t, k) {
  if (!paneel || !t || !t.closest || !t.closest('.lb-tour')) return false;
  const lijst = [...paneel.querySelectorAll('.lb-tour button')];
  const i = lijst.indexOf(t);
  const n = navIndex(lijst.length, i, k);
  if (n < 0 || n === i) return false;
  focusEl(lijst[n]);
  return true;
}

// Arrow keys: jump to the nearest control in that direction, within the rail
// or the sheet; left from the sheet's edge lands on the rail, right from the
// rail goes into the sheet. Nothing further down or up scrolls the panel.
function moveFocus(dir) {
  const vraag = visibleQuestion();
  if (vraag) {
    // #915: ook de pijlen blijven binnen de open vraag
    const list = visibleFocusables(vraag);
    if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    const stap = dir === 'up' || dir === 'left' ? -1 : 1;
    focusEl(list[i < 0 ? 0 : (i + stap + list.length) % list.length]);
    return;
  }
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

// #563: de save bij Afsluiten of Herstarten mislukte (volle of geblokkeerde opslag). Het spel blijft open:
// de speler ziet wat er misging en kiest tussen opnieuw proberen en toch sluiten.
function askClose(a) {
  closeAction = a;
  const box = root.querySelector('[data-exit-confirm]');
  if (!box) return;
  const confirmEl = root.querySelector('[data-restart-confirm]');
  if (confirmEl) confirmEl.hidden = true;
  // Noem het moment van de laatste save en wat er sindsdien bij kwam (#QoL): "je voortgang sinds je
  // laatste savegame" zegt niets als je niet weet wanneer dat was. De feiten erboven noemen het wel,
  // dus dezelfde helper, en de speeltijd en het geld sindsdien erbij.
  const wanneer = lastSavedText();
  const speel = Math.max(0, Math.round(getPlaySeconds() / 60));
  const sinds = wanneer === 'nog niet'
    ? `Deze sessie (${speel} min) is niet bewaard.`
    : `Wat je sinds ${wanneer} deed (${speel} min in deze sessie) is niet bewaard.`;
  box.querySelector('[data-exit-text]').textContent = a === 'quit-now' || a === 'exit'
    ? `Opslaan mislukt. ${sinds} Wil je het spel toch sluiten?`
    : `Opslaan mislukt. ${sinds} Wil je het spel toch herstarten?`;
  showQuestion(box, true);
  const b = box.querySelector('[data-action="exit-retry"]');
  if (b) b.focus();
}

function runAction(a) {
  const confirmEl = root.querySelector('[data-restart-confirm]');
  if (a === 'resume') setOpen(false);
  else if (a === 'save') {
    // #606: een gast bewaart alleen zijn eigen verdiensten; zeg dat ook, in plaats van "Opgeslagen om ..."
    const ok = saveGame(world, { manual: true });
    if (!ok) status(`Opslaan mislukt: ${saveFailReason() || 'onbekende reden'}. Je spel blijft staan zolang dit venster open is.`);
    else if (world && world.coopRole === 'client') status(GAST_BEWAARD_TEKST);
    else if (inBoot(world)) status(`Opgeslagen om ${nu()} · je boot blijft aan de steiger`);
    else status(`Opgeslagen om ${nu()}`);
    if (ok) syncSaveFacts();
  }
  else if (a === 'load') {
    if (coopSessieLoopt(world)) {
      // een lopende sessie eindigt eerst; dezelfde volgorde als in het savepaneel (#492)
      const box = root.querySelector('[data-coop-load-confirm]');
      if (!box) return;
      box.querySelector('[data-coop-load-text]').textContent = coopLoadTekst(world, 'Het laatste opgeslagen spel');
      box.hidden = false;
      confirmEl.hidden = true;
      root.querySelector('[data-coop-new-confirm]').hidden = true;
      box.querySelector('[data-action="coop-load-cancel"]').focus();
      return;
    }
    if (loadLatestSave(world)) setOpen(false);
    else status('Geen savegame gevonden');
  } else if (a === 'coop-load-cancel') {
    root.querySelector('[data-coop-load-confirm]').hidden = true;
    confirmEl.hidden = false;
    const b = confirmEl.querySelector('[data-action="load"]');
    if (b) b.focus();
  } else if (a === 'coop-load-go') {
    root.querySelector('[data-coop-load-confirm]').hidden = true;
    const res = runCoopLoad(world, currentSlot(), { stop: stopCoopNet, save: saveGame, load: loadSlot });
    if (res.ok) setOpen(false);
    else status(COOP_LOAD_FAIL[res.reason] || 'Laden mislukt.');
  } else if (a === 'coop-new-cancel') {
    root.querySelector('[data-coop-new-confirm]').hidden = true;
    confirmEl.hidden = false;
    const b = confirmEl.querySelector('[data-action="new"]');
    if (b) b.focus();
  } else if (a === 'coop-new-go') {
    root.querySelector('[data-coop-new-confirm]').hidden = true;
    // #492 slices 1-2: eerst de sessie, dan bewaren en pas dan een nieuw spel (dezelfde volgorde
    // als bij laden en stoppen; cooploadrules.js). Mislukt het bewaren, dan blijft het spel staan.
    const res = runCoopStop(world, {
      stop: stopCoopNet,
      save: () => saveGameEchtBewaard(world),
      go: () => {
        if (!startNewSlot()) { status('Alle plekken zijn in gebruik. Verwijder eerst een opgeslagen spel om opnieuw te beginnen.'); return; }
        preventCloseSave(); // #584: this reload starts a new game, so the old world must not be saved over the fresh slot
        location.reload();
      },
    });
    if (!res.ok) status(COOP_ACTIE_FAIL[res.reason] || 'Er is niets begonnen.');
  } else if (a === 'saves') {
    if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om savegames te gebruiken.'); return; }
    openSaveSlots({ mode: 'game', world, onLoad: () => setOpen(false), onClose: () => { syncSaveButtons(); const b = root.querySelector('[data-panel="spel"] [data-action="saves"]'); if (b) b.focus(); } });
  } else if (a === 'restart') {
    root.querySelector('[data-coop-load-confirm]').hidden = true;
    root.querySelector('[data-coop-new-confirm]').hidden = true;
    confirmEl.hidden = false;
    syncSaveButtons();
    confirmEl.querySelector('button').focus();
    // de vraag staat onderaan de lijst: op een laag venster staat hij anders half onder de
    // paneelrand, met de drie keuzes eronder. In één keer helemaal in beeld (#911-QA).
    if (confirmEl.scrollIntoView) confirmEl.scrollIntoView({ block: 'nearest' });
  } else if (a === 'cancel') {
    root.querySelector('[data-coop-load-confirm]').hidden = true;
    root.querySelector('[data-coop-new-confirm]').hidden = true;
    confirmEl.hidden = true;
    root.querySelector('[data-action="restart"]').focus();
  } else if (a === 'exit') {
    // #915: eerst vragen, met de melding dat de voortgang bewaard wordt. De rail en Spel >
    // Opslaan & stoppen gebruiken dezelfde vraag; pas "Ja, opslaan en sluiten" sluit echt.
    const box = root.querySelector('[data-quit-confirm]');
    if (!box) { runAction('quit-now'); return; }
    root.querySelector('[data-restart-confirm]').hidden = true;
    root.querySelector('[data-coop-load-confirm]').hidden = true;
    root.querySelector('[data-coop-new-confirm]').hidden = true;
    showQuestion(root.querySelector('[data-exit-confirm]'), false);
    showQuestion(box, true);
    box.querySelector('[data-action="exit-go"]').focus();
  } else if (a === 'exit-go') {
    showQuestion(root.querySelector('[data-quit-confirm]'), false);
    runAction('quit-now');
  } else if (a === 'exit-cancel-ask') {
    showQuestion(root.querySelector('[data-quit-confirm]'), false);
    status('Niet afgesloten: je spel staat nog open.');
    const b = root.querySelector('[data-action="exit"]');
    if (b) b.focus();
  } else if (a === 'menu' || a === 'quit-now') {
    // #586: Afsluiten gaat niet via setOpen(false); geef een lopende rebind hier ook vrij voordat het spel
    // opslaat en herstart of sluit, zodat er geen toets of knop meer in de capture blijft hangen.
    cancelRebind(true);
    // save, then restart the game (the boot flow loads that save again) or close the app; a
    // pigeon first turns back into Tammo/Tessa so the save has a street spot.
    // Alleen een lopend spel bewaart: het menu boven het hoofdscherm (prestart)
    // draait in de menuscène en mag de laatste savegame niet overschrijven (#435).
    if (started() && !prestart && world && world.pigeonMode && world.pigeonActions) world.pigeonActions.stop();
    // #492: eerst de sessie netjes beëindigen (de anderen horen 'spel gestopt' in plaats van een
    // weggevallen verbinding), dan bewaren en pas dan herladen of sluiten. Een solo-sessie van één
    // gaat via stopSoloHost, zodat die vlag ook teruggaat; de volgorde staat in cooploadrules.js.
    // #563: mislukt het bewaren, dan blijft het spel open met een keuze in plaats van stil te sluiten.
    const res = runCoopStop(world, {
      stop: (w) => { if (isSoloHost(w)) stopSoloHost(w); else stopCoopNet(w); },
      save: () => (started() && !prestart && world ? saveGame(world) : undefined),
      go: () => { if (a === 'quit-now' && DESKTOP) DESKTOP.quit(); else location.reload(); },
    });
    if (!res.ok) askClose(a);
  } else if (a === 'exit-retry' || a === 'exit-anyway' || a === 'exit-cancel') {
    const box = root.querySelector('[data-exit-confirm]');
    showQuestion(box, false);
    if (a === 'exit-retry') { const want = closeAction; closeAction = null; if (want) runAction(want); return; }
    if (a === 'exit-cancel') {
      closeAction = null;
      status('Niet afgesloten: je spel staat nog open. Sla eerst op als dat lukt.');
      const b = root.querySelector('[data-action="menu"]');
      if (b) b.focus();
      return;
    }
    const want = closeAction;
    closeAction = null;
    if ((want === 'quit-now' || want === 'exit') && DESKTOP) DESKTOP.quit();
    else location.reload();
  } else if (a === 'binds-reset-all') {
    // #894: één knop voor alles wat afwijkt (toetsen en knoppen), met dezelfde melding als de
    // twee losse knoppen onder Besturing.
    setSetting('keyBinds', {});
    setSetting('padBinds', {});
    setBindMsg('Alles staat weer op de standaard.');
    // de lijst eronder is één keer getekend: zonder deze hertekening blijven de oude toetsen staan
    renderBinds();
    syncControls();
    const row = root.querySelector('[data-keys-changed] button');
    if (row) row.focus();
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
  } else if (a === 'mission-retry') {
    // #985 punt 16: dezelfde weg als Enter na een mislukking; geen bevestiging nodig.
    if (herstartMissie(world)) setOpen(false);
    else status(herstartBlokkade(world) || 'Even wachten, dan kan het opnieuw.');
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
    if (coopSessieLoopt(world)) {
      // een lopende sessie eindigt eerst; daarna bewaren en pas dan een nieuw spel (#492)
      const box = root.querySelector('[data-coop-new-confirm]');
      if (!box) return;
      box.querySelector('[data-coop-new-text]').textContent = coopActieTekst(world, 'Een nieuw spel beginnen');
      box.hidden = false;
      confirmEl.hidden = true;
      box.querySelector('[data-action="coop-new-cancel"]').focus();
      return;
    }
    // #562: eerst de plek echt maken; zonder vrije plek gebeurt er niets en blijft de huidige save staan
    if (!startNewSlot()) { status('Alle plekken zijn in gebruik. Verwijder eerst een opgeslagen spel om opnieuw te beginnen.'); return; }
    preventCloseSave(); // #584: this reload starts a new game, so the old world must not be saved over the fresh slot
    location.reload();
  } else if (a === 'gfx-remeasure') {
    // 23-11: het menu gaat even dicht (het menu over de wereld is geen maat), de wereld draait 3,5 s op Ultra en de beste stand die hier
    // 60 fps haalt wordt gekozen; daarna gaat Instellingen > Beeld weer open met de uitkomst. Alleen voor dit spel, niets gedeeld.
    if (remeasuring) return;
    // voor de start (titel, eerste-startkaart) draait er nog geen wereld om te meten, en sluiten zou de start laten doorgaan
    if (prestart || !started()) { menuMelding('Opnieuw meten kan zodra je in het spel bent.'); return; }
    remeasuring = true;
    setOpen(false);
    measureAutoPreset({ ms: 3500 }).then((res) => {
      remeasuring = false;
      openPauseMenu('settings', { sub: 'video' });
      menuMelding(res ? autoGfxLabel(res.pick) : 'Meten lukte niet; je instellingen zijn niet veranderd.');
    }, () => { remeasuring = false; });
  } else if (a === 'gpuinfo') {
    import('./gpudiag.js').then((G) => G.showTechInfo());
  } else if (a === 'gpu-help') {
    const h = root.querySelector('[data-gpu-help]');
    h.hidden = !h.hidden;
  } else if ((a === 'bench' || a === 'bench-go') && !prestart && coopSessieLoopt(world)) {
    // 22-11: de benchmark herlaadt de pagina en verbreekt de sessie voor alle gasten; host en gast kunnen hem dus niet starten
    root.querySelector('[data-bench-confirm]').hidden = true;
    status(BENCH_COOP_TEXT);
  } else if (a === 'bench' || a === 'bench-cancel') {
    const box = root.querySelector('[data-bench-confirm]');
    box.hidden = a === 'bench-cancel';
    box.querySelector('[data-bench-text]').innerHTML = braceKeysHtml(prestart
      ? 'Prestatietest starten? Duurt ongeveer een minuut. {ESC} stopt.'
      : 'Prestatietest starten? Je spel wordt eerst opgeslagen. {ESC} stopt.');
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
      // 22-11: eerst bewaren en dit spel de stay-vlag geven, zodat de boot na de benchmark precies deze save opent (benchmarkreturn.js);
      // lukt het bewaren niet, dan start de benchmark niet en blijft alles zoals het was
      const prep = world ? prepareBenchmarkReload({ save: () => saveGameEchtBewaard(world), slot: () => currentSlot(), markStay: (n) => markStay(null, n) }) : { ok: true };
      if (!prep.ok) { status(prep.reason === 'opslaan' ? BENCH_SAVE_FIRST_TEXT : BENCH_RELOAD_FAIL_TEXT); return; }
      benchmarkViaReload();
    }
  } else if (a === 'errlog-copy') {
    copyText(errorReport()).then((ok) => errlogStatus(ok ? 'Gekopieerd. Plak het in je bericht.' : 'Kopiëren lukte niet. Opslaan als bestand kan wel in de desktopversie.'));
  } else if (a === 'errlog-save' && DESKTOP && DESKTOP.saveTextFile) {
    DESKTOP.saveTextFile(`GDE-foutrapport-${new Date().toISOString().slice(0, 10)}.txt`, errorReport())
      .then((saved) => errlogStatus(saved ? 'Opgeslagen.' : ''), () => errlogStatus('Opslaan lukte niet.'));
  } else if (a === 'errlog-clear') {
    // #1271: Wissen vraagt eerst om een tweede klik; het rapport is weg als je het niet gekopieerd hebt
    const knop = root.querySelector('[data-action="errlog-clear"]');
    if (knop && knop.dataset.zeker !== '1') { knop.dataset.zeker = '1'; knop.textContent = 'Zeker wissen?'; errlogStatus('Het rapport is daarna weg. Druk nog een keer op Wissen om het zeker te weten.'); return; }
    if (knop) { delete knop.dataset.zeker; knop.textContent = 'Wissen'; }
    clearErrorLog();
    errlogStatus('Gewist.');
  } else if (a === 'reset') {
    // #604: eerst vragen en noemen wat er teruggezet wordt; Annuleren laat alles staan
    const box = root.querySelector('[data-reset-confirm]');
    root.querySelector('[data-reset-undo]').hidden = true;
    // 22-11: ook alleen het open tabblad terugzetten, met erbij hoeveel er afwijkt (settingsrules.js)
    const st = getSettings(), def = defaultSettings();
    const alles = changedKeys(Object.values(TAB_KEYS).flat(), st, def).length;
    const sub = pref.sub.settings || 'video';
    const tabKeys = TAB_KEYS[sub];
    const tabBtn = box.querySelector('[data-action="reset-tab-go"]');
    const naamTab = (SUBTABS.settings.find(([id]) => id === sub) || [])[1] || '';
    const nTab = tabKeys ? changedKeys(tabKeys, st, def).length : 0;
    tabBtn.hidden = !tabKeys;
    tabBtn.disabled = !nTab;
    tabBtn.textContent = tabKeys ? `Alleen ${naamTab} herstellen (${nTab})` : '';
    box.querySelector('[data-reset-count]').textContent = alles ? `${alles} ${alles === 1 ? 'instelling wijkt' : 'instellingen wijken'} nu af van de standaard.` : 'Alles staat al op de standaard.';
    box.hidden = false;
    box.querySelector(tabKeys && nTab ? '[data-action="reset-tab-go"]' : '[data-action="reset-cancel"]').focus();
  } else if (a === 'reset-cancel') {
    root.querySelector('[data-reset-confirm]').hidden = true;
    root.querySelector('[data-action="reset"]').focus();
  } else if (a === 'reset-tab-go') {
    const sub = pref.sub.settings || 'video';
    const oud = resetSettingsKeys(TAB_KEYS[sub] || []);
    resetBackup = Object.keys(oud).length ? oud : null;
    syncControls();
    root.querySelector('[data-reset-confirm]').hidden = true;
    const undo = root.querySelector('[data-reset-undo]');
    undo.hidden = false;
    undo.querySelector('[data-reset-undo-text]').textContent = resetMessage(Object.keys(oud).length, 'Dit tabblad');
    undo.querySelector('[data-action="reset-undo"]').focus();
  } else if (a === 'reset-go') {
    const voor = changedKeys(Object.values(TAB_KEYS).flat(), getSettings(), defaultSettings()).length;
    resetBackup = { ...getSettings() };
    resetSettings();
    syncControls();
    root.querySelector('[data-reset-confirm]').hidden = true;
    const undo = root.querySelector('[data-reset-undo]');
    undo.hidden = false;
    undo.querySelector('[data-reset-undo-text]').textContent = resetMessage(voor);
    undo.querySelector('[data-action="reset-undo"]').focus();
  } else if (a === 'reset-undo') {
    if (resetBackup) for (const [k, v] of Object.entries(resetBackup)) setSetting(k, v);
    resetBackup = null;
    syncControls();
    root.querySelector('[data-reset-undo]').hidden = true;
    const b = root.querySelector('[data-action="reset"]');
    if (b) b.focus();
  } else if (a === 'reset-dismiss') {
    resetBackup = null;
    root.querySelector('[data-reset-undo]').hidden = true;
    const b = root.querySelector('[data-action="reset"]');
    if (b) b.focus();
  } else if (a === 'binds-reset-keys' || a === 'binds-reset-pad') {
    setSetting(a === 'binds-reset-keys' ? 'keyBinds' : 'padBinds', {});
    setBindMsg('Alles staat weer op de standaard.');
    renderBinds();
  } else if (a === 'bench-apply' || a === 'bench-dismiss') {
    const res = getBenchResult();
    if (a === 'bench-apply' && res && res.rec) applyPreset(res.rec);
    dismissBenchBanner();
    syncControls();
    const cur = root.querySelector('[data-preset-btn][aria-pressed="true"]') || root.querySelector('[data-preset-btn]');
    if (cur) cur.focus();
  }
}

function status(text) {
  root.querySelector('[data-game-status]').textContent = text;
  // vanaf een ander scherm (Overzicht, het zoekvenster) staat de statusregel niet in beeld: dan als melding
  if (text && !(tab === 'spel' && pref.sub.spel === 'acties')) menuMelding(text);
}

const garageEl = () => root.querySelector('[data-panel="garage"] .pm-inner');

// QoL (#985): verkopen en dure bezorging vragen een tweede druk binnen 8 s; de vraag staat in het paneel.
let garageArmed = null;
function garageBevestigd(id, actie) {
  const vraag = actieBevestiging(getGarageList(world).find((x) => x.id === id), actie);
  const klaar = garageArmed && garageArmed.id === id && garageArmed.actie === actie && Date.now() < garageArmed.tot;
  if (vraag && !klaar) {
    garageArmed = { id, actie, tot: Date.now() + 8000 };
    renderGaragePanel(garageEl(), world, vraag);
    return false;
  }
  garageArmed = null;
  return true;
}

function garageSell(id) {
  if (!garageBevestigd(id, 'verkoop')) return;
  const res = verkoopVoertuig(world, id);
  renderGaragePanel(garageEl(), world, res.text);
}

function garageDeliver(id) {
  if (!garageBevestigd(id, 'aflever')) return;
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

// #604: het foutrapport onder Over. Eerst één Nederlandse regel die zegt hoeveel en wat, de ruwe
// Engelse meldingen zitten achter de vouw "Technische details".
function renderErrorLog() {
  const log = getErrorLog().reverse();
  const sum = root && root.querySelector('[data-errsum]');
  if (sum) {
    if (!log.length) sum.textContent = 'Geen problemen gemeld. Mooi zo.';
    else {
      const fouten = log.filter((e) => e.level !== 'warn').length;
      const waars = log.length - fouten;
      const laatste = new Date(log[0].t);
      const wanneer = isNaN(laatste) ? '' : ` De nieuwste is van ${laatste.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}, ${laatste.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}.`;
      sum.textContent = `${log.length} ${log.length === 1 ? 'melding' : 'meldingen'}: ${fouten} ${fouten === 1 ? 'fout' : 'fouten'} en ${waars} ${waars === 1 ? 'waarschuwing' : 'waarschuwingen'}.${wanneer} Er is niets verstuurd.`;
    }
  }
  const list = root && root.querySelector('[data-errlog]');
  if (!list) return;
  list.innerHTML = log.length ? log.slice(0, 25).map((e) => `<li class="${e.level === 'warn' ? 'warn' : 'err'}"><b>${e.level === 'warn' ? 'Waarschuwing' : 'Fout'}${e.count > 1 ? ` · ${e.count}×` : ''}</b> <small>${esc(e.t.slice(0, 16).replace('T', ' '))}${e.step ? ' · ' + esc(e.step) : ''}</small><span>${esc(e.msg)}</span></li>`).join('')
    : '<li class="none">Geen fouten. Mooi zo.</li>';
}
onErrorLogChange(() => renderErrorLog());

function showSubtab(of, name) {
  const subs = subsOf(of);
  if (SUB_ALIAS[of] && SUB_ALIAS[of][name]) name = SUB_ALIAS[of][name];
  if (!subs.some(([id]) => id === name)) name = subs[0][0];
  for (const b of root.querySelectorAll(`[data-subtab][data-of="${of}"]`)) b.setAttribute('aria-selected', String(b.dataset.subtab === name));
  for (const nav of root.querySelectorAll(`.ds-m-tabs:has([data-of="${of}"])`)) trackTabLine(nav); // DS3: de streep glijdt naar de gekozen tab (en volgt het paneel als het zichtbaar wordt)
  for (const p of root.querySelectorAll(`[data-sub][data-of="${of}"]`)) p.hidden = p.dataset.sub !== name;
  if (pref.sub[of] !== name) { pref.sub[of] = name; savePref(); }
  const panel = root.querySelector(`[data-panel="${of}"]`);
  if (panel) panel.scrollTop = 0;
  if (of === 'settings') root.querySelector('[data-bench-confirm]').hidden = true;
}

function syncDesktopControls() {
  const fs = root && root.querySelector('[data-desktop="fullscreen"]');
  if (fs && DESKTOP) fs.checked = !!DESKTOP.isFullscreen();
}

// De zenderlijst opnieuw tekenen (een zender gekozen, een geheime erbij) en de focus op de actieve rij of de gekozen rij laten staan.
function syncChannels(focusId = null) {
  const wrap = root && root.querySelector('[data-channels-wrap]');
  if (!wrap) return;
  const had = !!(document.activeElement && wrap.contains(document.activeElement));
  wrap.innerHTML = channelPickerHtml(channelList());
  const row = wrap.querySelector(focusId ? `[data-channel="${focusId}"]` : '[aria-selected="true"]');
  if (had && row) row.focus({ preventScroll: true });
}

function syncControls() {
  const st = getSettings();
  const radio = root.querySelector('[data-radio-switch]');
  if (radio) radio.checked = radioIsOn();
  syncChannels();
  const demp = root.querySelector('[data-mute-switch]');
  if (demp) demp.checked = isMuted();
  const shadowsAllowed = QUALITY_PRESETS[st.quality].shadows;
  syncPresets(st);
  syncGpuWarning();
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
      out.textContent = el.dataset.setting === 'fov' ? `${v}°`
        : el.dataset.weergave === 'keer' ? `${Number(v).toFixed(2).replace('.', ',').replace(/,?0$/, '')}×`
        : `${Math.round(v * 100)}%`;
    }
    if (el.type === 'range') el.style.setProperty('--fill', `${((Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min))) * 100}%`);
  }
  const shadowBox = root.querySelector('[data-setting="shadows"]');
  shadowBox.disabled = !shadowsAllowed;
  shadowBox.closest('.pm-row').classList.toggle('pm-disabled', !shadowsAllowed);
  syncDifficultyTab(root); // #891, #1169: het niveau licht op in de uitleg en de opties tonen hun waarde
  syncKeyChanged();
  syncNowFacts(st);
  syncSettingsExtras(st);
}

// Proef het schudden (22-11): het voorbeeldvak schudt zoals de stand van Schermschudden en Beweging beperken nu is; bij uit blijft het stil en zegt de regel dat.
function proefSchudden() {
  const st = getSettings();
  const factor = effectsFor({ reduceMotion: st.reduceMotion || reducedMotion(), reduceFlash: st.reduceFlash, shake: st.screenShake }).cameraShake;
  const px = shakePreviewPx(factor);
  const box = root.querySelector('[data-shake-box]');
  const msg = root.querySelector('[data-shake-msg]');
  if (msg) msg.textContent = px > 0 ? (factor < 1 ? 'Zo schudt het beeld nu: zacht.' : 'Zo schudt het beeld nu.') : 'Het beeld blijft stil.';
  if (!box || !(px > 0)) return;
  box.style.setProperty('--shake-px', px + 'px');
  box.classList.remove('is-schud');
  void box.offsetWidth;
  box.classList.add('is-schud');
}

// 22-11 (toegankelijkheid en instellingen): de tellers op de tabbladen, wat een andere instelling nutteloos maakt (met de reden erbij), de stiltewaarschuwing
// en het Cheats-onderdeel in de rail. Alles volgt elke wijziging meteen.
function syncSettingsExtras(st) {
  if (!root) return;
  const aantal = changedPerTab(st, defaultSettings());
  for (const [id, n] of Object.entries(aantal)) {
    const el = root.querySelector(`[data-of="settings"][data-subtab="${id}"] [data-count]`);
    if (!el) continue;
    const tekst = n ? String(n) : '';
    if (el.textContent !== tekst) el.textContent = tekst;
    el.title = n ? `${n} ${n === 1 ? 'instelling wijkt' : 'instellingen wijken'} af van de standaard` : '';
  }
  const dep = dependencies(st);
  for (const key of ['subtitleVlak', 'screenShake', 'rumbleStrength', 'minimapZoom', 'minimapNorth', 'hintSource', 'markerVormen']) {
    const el = root.querySelector(`[data-setting="${key}"]`);
    const rij = el && el.closest('.pm-row');
    if (!rij) continue;
    const why = dep[key] || '';
    rij.classList.toggle('pm-afhankelijk', !!why);
    const nm = rij.querySelector('.nm');
    let span = nm && nm.querySelector('.pm-why');
    if (why && nm && !span) { span = document.createElement('span'); span.className = 'pm-why'; nm.appendChild(span); }
    if (span) { if (span.textContent !== why) span.textContent = why; span.hidden = !why; }
  }
  const stil = root.querySelector('[data-silence]');
  if (stil) { const w = silenceWarning(st); stil.hidden = !w; if (stil.textContent !== w) stil.textContent = w; }
  const cheatsBtn = root.querySelector('.ra[data-goto="streken"]');
  if (cheatsBtn) cheatsBtn.hidden = !cheatsInMenu();
}

// 0.64.1: a line under the diagnose row when the game draws in software or on the integrated GPU
function syncGpuWarning() {
  const box = root.querySelector('[data-gpu-warn]');
  if (!box) return;
  import('./gpudiag.js').then((G) => {
    const w = G.currentGpuWarning();
    box.hidden = !w;
    if (!w) return;
    box.querySelector('[data-gpu-warn-text]').textContent = w.text;
    box.querySelector('[data-action="gpu-help"]').hidden = !w.help;
  }).catch(() => {}); // een ontbrekend element in de rij mag geen onafgehandelde afwijzing geven
}

// The preset buttons, the explanation beside them and, after a benchmark, one
// line with the preset it advises (gfxprofile.js). Only measured numbers are shown.
function syncPresets(st) {
  const cur = currentPreset(st);
  const res = getBenchResult();
  for (const b of root.querySelectorAll('[data-preset-btn]')) b.setAttribute('aria-pressed', String(b.dataset.presetBtn === cur));
  const now = root.querySelector('[data-preset-now]');
  // 23-11: na de automatische keuze (eerste start of Opnieuw meten) staat erbij dat de stand bij deze pc hoort, zolang hij niet is veranderd
  now.textContent = cur ? autoGfxNote(st) : 'Eigen instellingen';
  // #893: onder de segmented control staat in één regel wat de gekozen stand doet
  const hint = root.querySelector('[data-preset-hint]');
  if (hint) hint.textContent = cur ? (PRESET_HINTS[cur] || '') : 'Je hebt zelf iets aangepast; kies een stand om terug te gaan naar een van de vier.';
  const pane = root.querySelector('[data-preset-pane]');
  pane.querySelector('[data-preset-name]').textContent = cur ? presetLabel(cur) : 'Eigen';
  pane.querySelector('[data-preset-desc]').textContent = cur ? describePreset(cur) : 'Wat je zelf instelt: resolutie, schaduwen en zichtafstand wijken af van de vier standen.';
  const fpsOf = (n) => (res ? (n === 'eigen' ? (res.preset ? 0 : res.avg) : res.fps[n]) : 0);
  const fps = fpsOf(cur || 'eigen');
  const fpsBox = pane.querySelector('[data-preset-fps]');
  fpsBox.hidden = !fps;
  fpsBox.querySelector('.pm-big').textContent = fps ? `${Math.round(fps)} fps` : '';
  const shown = PRESET_ORDER.filter((n) => fpsOf(n)).map((n) => [n, presetLabel(n)]);
  const top = Math.max(1, ...shown.map(([n]) => fpsOf(n)));
  pane.querySelector('[data-preset-bars]').innerHTML = shown.map(([n, label]) =>
    `<div class="pm-fpsbar${n === cur ? ' on' : ''}"><span>${esc(label)}</span><span class="m-bar${n === cur ? ' on' : ''}"><i style="width:${Math.round((fpsOf(n) / top) * 100)}%"></i></span><span class="bebas">${Math.round(fpsOf(n))} fps</span></div>`).join('');
  pane.querySelector('[data-bench-note]').textContent = res ? 'Gemeten met de benchmark op deze computer.' : 'Draai de benchmark hiernaast om te zien wat elke stand op deze computer haalt.';
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
  // #985 punt 16: na een mislukking is er geen lopende missie meer, maar wel een aanbod om
  // opnieuw te beginnen. Zonder deze tak stond er niets in Overzicht en was de enige weg terug
  // de startmarker, terwijl de Enter-hint allang weg was.
  if (w && retryBeschikbaar()) return { title: (w.mission && w.mission.label) || 'je laatste missie', herstart: true };
  if (!w || !w.safetyActions || !w.safetyActions.missionActive()) return null;
  return { title: (w.mission && w.mission.label) || 'de missie' };
}

// #896: het Overzicht is een rustig beeld, geen instellingenscherm. De volumes, "beweging
// beperken" en de luidsprekerhint stonden hier als losse blokken; die horen bij Geluid en
// Toegankelijkheid en staan nu daar. Wat overblijft is waar je bent, hoe ver je bent (#898),
// wat er in de buurt is en wat je bijna haalt.
function progressOverviewHtml() {
  let info;
  try { info = gameProgress(); } catch (e) { return ''; }
  if (!info.parts.length) return '';
  const rijen = info.parts.map((p) => `<li><span>${esc(p.label)}</span><span class="mut">${esc(progressPartText(p))}</span></li>`).join('');
  return `<section class="pm-progress" aria-label="Je voortgang">` +
    `<div class="pm-progress-head"><span class="m-eb">Je voortgang</span><span class="pm-progress-pct"><b>${info.pct}%</b><span class="mut">klaar</span></span></div>` +
    `<span class="m-bar on"><i style="width:${info.pct}%"></i></span>` +
    `<ul class="pm-progress-parts">${rijen}</ul></section>`;
}

function renderOverviewPanel() {
  const el = root.querySelector(OV_SUB);
  // #1259: één bron per cijfer: wat het voortgangsblok toont, krijgt geen tegel meer
  let elders = [];
  try { elders = tilesShownElsewhere(gameProgress().parts); } catch (e) { elders = []; }
  try { renderOverview(el, world, helpButtons(), { play: getPlaySeconds(), stop: stopInfo(), skipTiles: elders }); } catch (err) { console.error('overzicht', err); }
  // #898/#965: het voortgangsblok staat onder de hero, boven aan de scrollende
  // inhoud, zodat het percentage meteen in het oog valt en de grote kop blijft staan.
  if (el && !el.querySelector('.pm-progress')) {
    const blok = progressOverviewHtml();
    const body = el.querySelector('.ov-scroll');
    if (blok) {
      if (body) body.insertAdjacentHTML('afterbegin', blok);
      else el.insertAdjacentHTML('afterbegin', blok);
    }
  }
  syncControls();
  const r = getDiscoveredRatio();
  const s = getSaveSummary();
  const ago = s ? Math.round((Date.now() - s.savedAt) / 60000) : -1;
  sheetNote([`${storyDate(world).long} ${getClockText(world)}`.trim(), r >= 0.01 ? `${Math.round(r * 100)}% van Grunn verkend` : '',
    ago < 0 ? '' : ago < 1 ? 'net opgeslagen' : ago < 120 ? `laatst opgeslagen ${ago} min geleden` : ''].filter(Boolean).join(' · '));
}

function renderTodoPanel() {
  const panel = root.querySelector('[data-panel="todo"]');
  try {
    renderTodo(panel, world);
    const sum = todoSummary(world);
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
  const nav = root.querySelector('[data-goto="todo"]');
  if (nav) nav.toggleAttribute('data-new', false);
  const met = anyFresh();
  const vNav = root.querySelector('[data-goto="verhaal"]');
  if (vNav) vNav.toggleAttribute('data-new', met);
  const unreadN = world ? phoneUnread(world) : 0;
  const unread = unreadN > 0;
  const vPeople = root.querySelector('[data-of="verhaal"][data-subtab="personages"]');
  if (vPeople) vPeople.toggleAttribute('data-new', met || unread);
  const setN = (id, text, label) => { const n = root.querySelector(`[data-n="${id}"]`); if (n) { if (id === 'spel' && text) n.innerHTML = `${icon('spelers', 'pm-ic n-ic')}${text}`; else n.textContent = text; // het aantal spelers met een poppetje (#435)
         if (label) n.setAttribute('aria-label', label); else n.removeAttribute('aria-label'); } };
  // unseen achievements: a quiet dot on the rail, never a HUD notice (#168)
  const aNav = root.querySelector('[data-goto="prestaties"]');
  if (aNav) aNav.toggleAttribute('data-new', unseenAchievementCount() > 0);
  // samen spelen is geen rijknop meer: de rail toont bij Spel hoeveel spelers er zijn
  // een sessie van één (#554) is geen samen-sessie: dan blijft de teller leeg, net als zonder sessie
  const coopN = world && world.coopNet && !isSoloHost(world) && world.coopSpelers ? world.coopSpelers.length : 0;
  setN('spel', coopN ? String(coopN) : '', coopN ? `${coopN} spelers` : '');
  // het tabblad Spelers onder Samen spelen zegt hetzelfde als de rail: een poppetje en het aantal spelers (#435)
  const tabN = root.querySelector('[data-panel="spel"] [data-count="spelers"]');
  if (tabN) tabN.innerHTML = coopN ? `${icon('spelers', 'pm-ic n-ic')}${coopN}` : '';
  // geen badge op Activiteiten: 'nieuw' hoort bij Verhaal (personages), niet bij de activiteiten (#435)
  setN('todo', '');
  // 21-11 (beeldronde): geen getal in de rail; het bolletje (data-new) zegt "nieuw", het aantal ongelezen staat in de hero van Verhaal en voor schermlezers in het label
  setN('verhaal', '', unread ? `${unreadN} ongelezen` : '');
  if (vNav && unread) vNav.toggleAttribute('data-new', true);
}

if (typeof document !== 'undefined') document.addEventListener('nieuwgezien', () => { if (root) syncNavBadges(); });

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
    // Samen spelen (#434): het uitnodigen en de spelerslijst zijn twee tabbladen van hetzelfde onderdeel
    // (samenpanel.js, coopspelersui.js); elk tekent zich in zijn eigen tabblad.
    if (sub === 'samen') {
      showSubtab('samen', pref.sub.samen || 'samen');
      if (pref.sub.samen === 'spelers') renderSpelersPanel(root.querySelector('[data-of="samen"][data-sub="spelers"]'), world, closePauseMenu, { openSamen: () => { closePauseMenu(); stopSoloHost(world); requestOpenSamen(); } });
      else renderSamenPanel(root.querySelector('[data-of="samen"][data-sub="samen"]'), world, closePauseMenu);
    }
  }
  syncFooter();
}

function renderVerhaalPanel() {
  const panel = root.querySelector('[data-panel="verhaal"]');
  try {
    const view = pref.sub.verhaal === 'personages' ? 'personages' : 'opdrachten'; // een oude keuze (veroverd, aanwijzingen) opent Opdrachten
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
  syncSaveFacts();
  if (world && world.pigeonMode) { status('Je bent een duif. Stop de duif-modus om op te slaan; je poepscore gaat mee in je savegame.'); return; }
  const saved = hasSave();
  for (const b of root.querySelectorAll('[data-action="load"]')) b.disabled = !saved;
  // De laatste opslag staat sinds #980 in de feiten bovenaan (saveFactsHtml), niet nog eens in de
  // statusregel; die regel is er voor wat je net deed ("Opgeslagen om 14:32").
}

function syncRail() {
  const pigeon = !!(world && world.pigeonMode);
  for (const b of root.querySelectorAll('[data-panel="spel"] [data-action="save"], [data-panel="spel"] [data-action="saves"]')) b.disabled = pigeon;
  root.querySelector('[data-restart-confirm]').hidden = true;
  root.querySelector('[data-coop-load-confirm]').hidden = true;
  root.querySelector('[data-coop-new-confirm]').hidden = true;
  for (const box of root.querySelectorAll('[data-exit-confirm], [data-quit-confirm], [data-find]')) box.hidden = true;
  syncQuestionLayers();
  closeAction = null;
  root.querySelector('[data-game-status]').textContent = '';
  syncSaveButtons();
}

function refreshInfo() {
  if (!world) return;
  // De naam in de rail hangt aan het personage van het eigen lichaam; die vraag
  // stellen we aan de leesbare ingang (#500) in plaats van aan de singleton.
  const c = world.pigeonMode ? 'Duif' : hoofdspeler(world).character === 'anita' ? 'Tessa' : 'Tammo';
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
    return hintCapHtml(k); // #1258: the same keycap as the shops
  }).join('');
  const text = label === BACK ? back : (pad && PAD_LABEL[label]) || label;
  return `<button type="button" class="m-hint" tabindex="-1"${action ? ` data-hint="${action}"` : ''}>${caps}<span>${esc(text)}</span></button>`;
}

function syncFooter() {
  if (!root) return;
  const pad = isPadActive();
  const back = prestart ? 'terug naar het hoofdmenu' : origin !== 'home' ? 'doorgaan' : 'terug';
  let hints = HINTS[atHome() ? 'overzicht' : tab] || HINTS.overzicht;
  // Spel > Samen spelen has a second tab row: name the outcome of Q/E there (#601)
  if (tab === 'spel' && (pref.sub.spel || 'overzicht') === 'samen') hints = hints.map(([k, l, a]) => (k.join() === 'Q,E' ? [k, 'spelers-tab', a] : [k, l, a]));
  if (prestart) hints = hints.map(([k, l, a]) => [k, l, a === 'resume' ? 'back' : a]);
  root.querySelector('.pm-footer').innerHTML = hints.map((h) => hintHtml(h, pad, back)).join('');
  // een andere invoer (toetsen of controller) verandert ook het hintvoorbeeld onder Instellingen > Hints
  if (tab === 'settings') syncNowFacts();
}

function showTab(name, how) {
  const ids = sectionIds();
  if (name === 'bezit') name = 'boerderij'; // Bezit (epic #1095): Land en bedrijf heet intern nog boerderij
  // de oude namen: Overzicht is Spel > Overzicht, cheats zijn een onderdeel van Instellingen.
  // 'telefoon' bestond als los scherm; dat is weg, dus de naam wijst door naar Personages.
  if (name === 'overzicht' || name === 'game') { pref.sub.spel = 'overzicht'; name = 'spel'; }
  if (name === 'telefoon') { pref.sub.verhaal = 'personages'; name = 'verhaal'; }
  if (name === 'missions') name = 'todo';
  if (name === 'cheats') name = 'streken';
  if (name === 'streken' && !ids.includes('streken')) { pref.sub.settings = 'spel'; name = 'settings'; } // 22-11: Cheats is uit het menu; de schakelaar staat bij Spelregels
  // #676: Veroverd is een eigen railrij; de oude plek (Verhaal > Veroverd) verwijst door.
  if (name === 'verhaal' && pref.sub.verhaal === 'veroverd') { pref.sub.verhaal = 'opdrachten'; name = 'veroverd'; }
  if (name === 'samen' || name === 'samenspelen' || name === 'spelers') { pref.sub.spel = 'samen'; pref.sub.samen = name === 'spelers' && world && world.coopNet && !isSoloHost(world) ? 'spelers' : 'samen'; name = 'spel'; }
  if (name === 'jobs') name = 'todo';
  // #979: Camera & richten en Hints & uitleg zaten onder Spel. Een opgeslagen keuze opent ze nu
  // onder Instellingen, waar ze staan; Spel zelf begint weer bij Overzicht.
  if (name === 'spel' && (pref.sub.spel === 'camera' || pref.sub.spel === 'hints')) {
    pref.sub.settings = pref.sub.spel;
    pref.sub.spel = 'overzicht';
    name = 'settings';
    savePref();
  }
  // 24-11 (hertest): een onderdeel dat (nog) niet in het menu staat, via code geopend (de telefoon, een melding, een test), viel terug op
  // HOME ('overzicht'): dat is geen sectie, dus sectionOf gaf niets en de kop crashte ("sectionOf is not a function or its return value is
  // not iterable"). Nu wijst de terugval naar Spel > Overzicht met een korte regel, zonder de naam van het verborgen onderdeel (geen spoiler).
  const r = resolveSection(name, ids, !!prestart);
  if (r.sub) pref.sub.spel = r.sub;
  name = r.name;
  const lockedNote = r.locked ? NOT_YET_NOTE : '';
  if (how) origin = how;
  const prev = tab;
  tab = name;
  setPauseMenuTabState(name);
  root.dataset.activeTab = name;
  root.dataset.coop = world && world.coopNet && !isSoloHost(world) ? '1' : '0';
  for (const b of root.querySelectorAll('.pm-game [data-goto]')) {
    b.setAttribute('aria-current', String(b.dataset.goto === (CHILD[name] || name)));
    b.hidden = !ids.includes(b.dataset.goto);
  }
  // 22-11 (featurereveal.js): een tabblad van Land en bedrijf dat het verhaal nog niet opende staat er niet
  for (const tb of root.querySelectorAll('[data-subtab][data-of="boerderij"]')) tb.hidden = !subVisible('boerderij', tb.dataset.subtab);
  // de rij 'Naar mijn boerderij' in het Spel-overzicht hoort bij dezelfde regel: zolang Land en bedrijf verborgen is, doet hij niets en verklapt hij de naam
  for (const bb of root.querySelectorAll('.pm-row [data-goto="boerderij"]')) { const rij = bb.closest('.pm-row'); if (rij) rij.hidden = !sectionVisible('boerderij'); }
  // het item heet Land en bedrijf (de kop van het scherm); zonder begonnen akker heet het "Begin je boerderij" (21-11, review 22-11)
  const bdLabel = root.querySelector('.pm-game [data-goto="boerderij"] .ra-t');
  if (bdLabel) { let begonnen = true; try { begonnen = boerderijBegonnen(getBoerderij()); } catch (e) { /* boerderij niet klaar */ } bdLabel.textContent = begonnen ? 'Land en bedrijf' : 'Begin je boerderij'; }
  // #911: de kop van een groep telt wat er in de rail staat; een lege groep (het hoofdmenu
  // toont alleen Spel, Instellingen en Besturing) verdwijnt met zijn kop.
  for (const g of root.querySelectorAll('.pm-rail-group')) {
    const shown = [...g.querySelectorAll('[data-goto]')].filter((b) => !b.hidden).length;
    g.hidden = shown === 0;
  }
  for (const p of root.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
  if (world) setMapActive(world, open && name === 'map');
  if (name !== 'garage') disposeGarageViewer();
  if (name !== 'boerderij') ruimBoerderijPlaatjes();
  if (name !== 'verhaal') disposeVerhaalViewer();
  if (name !== 'spullen') disposeSpullenViewer();
  syncFooter();
  root.querySelector('#pm-title').textContent = prestart ? 'Menu' : 'Pauze';
  syncNavBadges();
  const [, label] = sectionOf(name) || sectionOf('spel');
  sheet.querySelector('.pm-sheet-title').textContent = label;
  // 21-11 (pauzemenu-ruimte): de omschrijving rechts van de kop is weg; titel, tabs en inhoud krijgen de ruimte (bij Spel staat de plek er ook niet bij)
  const eigenKop = name === 'spel';
  const pos = sheet.querySelector('.pm-sheet-pos');
  if (pos) pos.textContent = prestart || eigenKop ? '' : railPosition(name);
  if (name !== 'map') sheetNote('');
  root.querySelector('[data-action="reset"]').hidden = name !== 'settings';
  if (name !== 'settings') {
    // #604: de herstelvraag en de ongedaan-maakstrook horen bij Instellingen; een andere sectie
    // begint zonder die twee blokken in beeld
    const rc = root.querySelector('[data-reset-confirm]');
    if (rc) rc.hidden = true;
    const ru = root.querySelector('[data-reset-undo]');
    if (ru) ru.hidden = true;
    resetBackup = null;
  }
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
  if (name === 'todo') renderTodoPanel();
  if (name === 'spullen') renderSpullenPanel();
  if (name === 'garage') { renderGaragePanel(garageEl(), world); syncSheetSub(); }
  if (name === 'verhaal') { showSubtab('verhaal', pref.sub.verhaal || 'opdrachten'); renderVerhaalPanel(); }
  if (name === 'streken') { if (prev !== 'streken') resetCheatsPanel(); renderCheats(); }
  if (name === 'fotos') renderFotoPanel(root.querySelector('[data-panel="fotos"] .pm-inner'));
  if (name === 'prestaties') { renderAchievementsPanel(root.querySelector('[data-panel="prestaties"] .pm-inner')); syncSheetSub(); }
  if (name === 'loopbaan') renderLoopbaanPanel(root.querySelector('[data-panel="loopbaan"] .pm-inner'), closePauseMenu, world);
  if (name === 'veroverd') renderVeroverdPanel(root.querySelector('[data-panel="veroverd"] .pm-inner'), closePauseMenu, world);
  if (name === 'visboek') renderVisboekPanel(root.querySelector('[data-panel="visboek"] .pm-inner'));
  if (name === 'boerderij') {
    const q = (sub) => root.querySelector(`[data-panel="boerderij"] [data-sub="${sub}"]`);
    showSubtab('boerderij', pref.sub.boerderij || 'boerderij');
    renderBoerderijPanel(q('boerderij'), world, closePauseMenu);
    renderBezitPanels({ overzicht: q('overzicht'), bedrijven: q('bedrijven'), tekoop: q('tekoop'), snack: q('snack'), club: q('club') }, world);
  }
  if (name === 'voetbal') renderVoetbalPanel(root.querySelector('[data-panel="voetbal"] .pm-inner'), world, closePauseMenu);
  if (name === 'controls') { const q = root.querySelector('[data-controls-search]'); q.value = ''; filterControls(''); showSubtab('controls', pref.sub.controls || defaultControlsSubtab(document.documentElement.classList.contains('touch-device'))); bindMsg = ''; renderBinds(); }
  if (prev === 'controls' && name !== 'controls') cancelRebind();
  if (name === 'spel') { showSubtab('spel', pref.sub.spel || subsOf('spel')[0][0]); syncControls(); syncSaveButtons(); afterSpelSub(); }
  if (name === 'spel') { const sp = root.querySelector('[data-of="samen"][data-subtab="spelers"]'); if (sp) sp.hidden = !(world && world.coopNet); }
  if (name === 'settings') { showSubtab('settings', pref.sub.settings || 'video'); syncControls(); syncDesktopControls(); mountOnlineInstelling(root.querySelector('[data-online-instelling]'), { world }); }
  if (name === 'over') renderOverPanel(root.querySelector('[data-panel="over"] .pm-inner'));
  // Elke opening van een onderdeel begint bovenaan: het blad zelf (dat bij een lange inhoud
  // door focus kan zijn meegescrold), de paneelinhoud en de lijst/het detail erin (#906).
  resetScrolls();
  syncSettingsExtras(getSettings());
  if (lockedNote) sheetNote(lockedNote);
}

// Zet elke scrollstand van het open onderdeel terug naar boven, zonder de focus te verplaatsen.
function resetScrolls() {
  if (!sheet) return;
  sheet.scrollTop = 0;
  const body = sheet.querySelector('.pm-sheet-body');
  if (body) body.scrollTop = 0;
  const panel = activePanel();
  if (!panel) return;
  panel.scrollTop = 0;
  for (const n of panel.querySelectorAll('.pm-inner, .m-main, .m-list, .m-pane, .pm-vsub, .pm-samen-inner, .pm-hub, .pm-spelers, .ov-scroll')) n.scrollTop = 0;
}

// Opens the menu on a section ('overzicht' by default); with { prestart: true }
// only Instellingen and Besturing (start screen). openPauseMenu('todo', { select })
// opens Te doen on one item.
export function openPauseMenu(name = HOME, opts = {}) {
  if (opts.prestart) prestart = { onClose: opts.onClose || null };
  if (name === 'overzicht') { pref.sub.spel = 'overzicht'; name = 'spel'; }
  if (name === 'cheats') name = 'streken';
  if (name === 'samen' || name === 'samenspelen' || name === 'spelers') { pref.sub.spel = 'samen'; pref.sub.samen = name === 'spelers' && world && world.coopNet && !isSoloHost(world) ? 'spelers' : 'samen'; name = 'spel'; }
  if (opts.sub && SUBTABS[name]) pref.sub[name] = opts.sub;
  if (opts.select) selectTodo(opts.select);
  // de telefoon opent Activiteiten met de Dichtbij-filter (#607): één lijst, geen eigen weergave
  if (opts.view) setTodoFilter(opts.view === 'dichtbij');
  if (opts.thread) { selectVerhaalCharacter(characterForSender(opts.thread)); pref.sub.verhaal = 'personages'; if (name === 'telefoon') name = 'verhaal'; }
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
    // #920: een tweede open-verzoek (dezelfde Escape via een tweede pad, een te laat
    // binnenkomende melding) zet het menu niet nóg eens op een scherm en verplaatst de
    // speler ook niet naar een ander onderdeel. Eén menu, één stand.
    return;
  }
  if (!value) {
    // #586: een lopende toetsen- of controller-rebind hoort bij dit scherm. Elke sluiting (de rail-Terug
    // en Doorgaan via runAction('resume'), Afsluiten, closePauseMenu, de toets M, een prestart-sluiting)
    // komt hier langs, dus de wachtstand en de input-capture gaan hier altijd vrij.
    cancelRebind(true);
    // #920: een sluiting laat geen vraaglaag of oude herkomst achter. Een achtergebleven
    // laag kwam bij de volgende opening bovenop het menu terug.
    for (const box of root.querySelectorAll('[data-exit-confirm], [data-quit-confirm]')) box.hidden = true;
    syncQuestionLayers();
    origin = 'home';
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
    setPauseMenuTabState(null);
    refreshInfo();
    syncRail();
    showTab(name, how);
    if (atHome()) { const home = root.querySelector(`${OV_SUB} [data-action="resume"]`) || root.querySelector('[data-action="resume"]'); if (home) home.focus({ preventScroll: true }); }
    else focusSheet();
  } else {
    if (world) setMapActive(world, false);
    disposeGarageViewer();
    ruimBoerderijPlaatjes();
    disposeVerhaalViewer();
    disposeSpullenViewer();
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    const p = prestart;
    prestart = null;
    root.classList.remove('prestart');
    if (p && p.onClose) p.onClose();
  }
}






