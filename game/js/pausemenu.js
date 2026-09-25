import { getSettings, setSetting, resetSettings, QUALITY_PRESETS } from './settings.js';
import { mountMapView, setMapActive, setMapCloseHandler, setMapView, getDiscoveredRatio } from './mapview.js';
import { getMissionList, trackMission } from './missions.js';
import { saveGame, hasSave, loadLatestSave, clearSave, getSaveSummary } from './savegame.js';
import { getClockText } from './hud_panel.js';
import { isCinematicActive, replayIntro } from './cinematics.js';

// Running inside the desktop app (desktop/preload.js): window mode + quit.
const DESKTOP = typeof window !== 'undefined' && window.gteDesktop && window.gteDesktop.isDesktop ? window.gteDesktop : null;

const CONTROLS = [
  ['W / S', 'vooruit / achteruit (lopen en rijden)'],
  ['A / D', 'draaien / sturen'],
  ['Shift', 'rennen'],
  ['Spatie', 'springen / handrem'],
  ['Ctrl', 'bukken'],
  ['E / F', 'instappen / uitstappen / kusje'],
  ['Muisklik', 'aanvallen / schieten'],
  ['1–4', 'vuisten / pistool / uzi / hagelgeweer'],
  ['Scrollwiel', 'volgend / vorig wapen'],
  ['Muis omhoog/omlaag', 'camerahoek'],
  ['C', 'wissel Tammo / Anita'],
  ['T', 'telefoon'],
  ['V', 'filmcamera (tijdens het rijden)'],
  ['M', 'kaart (in het menu)'],
  ['U', 'geluid aan/uit'],
  ['Esc', 'menu'],
  ['Q / E', 'tabblad wisselen (in het menu)'],
];

const TABS = [
  ['map', 'Kaart'],
  ['missions', 'Missies'],
  ['settings', 'Instellingen'],
  ['controls', 'Besturing'],
  ['game', 'Spel'],
];

const FOOTERS = {
  map: '<b>Klik</b> bestemming · <b>Shift+klik</b> teleporteren · <b>Scroll / + −</b> zoomen · <b>WASD</b> schuiven · <b>Spatie</b> centreren · <b>Del</b> wissen',
  missions: '<b>Klik</b> op een missie om de route te zetten',
  settings: 'Instellingen worden automatisch bewaard',
  controls: '',
  game: '',
};

const TYPE_LABEL = { deliver: 'Bezorgen', rampage: 'Chaos', checkpoint: 'Race', fatbike: 'Overleven', boat: 'Varen' };
const STATUS_LABEL = { actief: 'Actief', volgende: 'Volgende', geklaard: 'Geklaard', open: 'Open' };

let root = null;
let open = false;
let input = null;
let world = null;
let tab = 'map';
let prestart = null;

export function isPauseMenuOpen() {
  return open;
}

const started = () => document.body.classList.contains('game-started');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initPauseMenu(w) {
  world = w;
  input = w.input;
  root = document.createElement('div');
  root.id = 'pause-menu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pm-title');
  root.innerHTML = `
    <header class="pm-header">
      <div class="pm-brand" id="pm-title">GTE VI</div>
      <nav class="pm-tabs" role="tablist">
        ${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="false">${label}</button>`).join('')}
      </nav>
      <div class="pm-info"><span data-info="char"></span><span data-info="clock"></span><span data-info="money"></span></div>
    </header>
    <main class="pm-body">
      <section data-panel="map" class="pm-panel pm-map" hidden></section>
      <section data-panel="missions" class="pm-panel pm-col" hidden><div class="pm-inner">
        <h2>Missies <small data-info="progress"></small></h2>
        <div class="pm-missions"></div>
      </div></section>
      <section data-panel="settings" class="pm-panel pm-col" hidden><div class="pm-inner">
        <nav class="pm-subtabs" role="tablist" aria-label="Instellingen">
          <button type="button" role="tab" data-subtab="sound" aria-selected="true">Geluid</button>
          <button type="button" role="tab" data-subtab="video" aria-selected="false">Beeld</button>
          <button type="button" role="tab" data-subtab="camera" aria-selected="false">Camera &amp; muis</button>
          <button type="button" role="tab" data-subtab="display" aria-selected="false">Weergave</button>
        </nav>
        <div data-sub="sound">
          ${slider('masterVolume', 'Hoofdvolume')}
          ${slider('musicVolume', 'G-Music')}
          ${slider('sfxVolume', 'Effecten')}
        </div>
        <div data-sub="video" hidden>
          <label class="pm-row"><span>Kwaliteit</span>
            <select data-setting="quality">
              ${Object.keys(QUALITY_PRESETS).map((q) => `<option value="${q}">${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}
            </select>
          </label>
          ${DESKTOP ? '<label class="pm-row"><span>Volledig scherm</span><input type="checkbox" data-desktop="fullscreen"></label>' : ''}
          ${toggle('shadows', 'Schaduwen')}
          <label class="pm-row"><span>Zichtafstand</span>
            <select data-setting="drawDistance">
              <option value="kort">Kort</option><option value="normaal">Normaal</option><option value="ver">Ver</option>
            </select>
          </label>
        </div>
        <div data-sub="camera" hidden>
          <label class="pm-row"><span>Beeldhoek</span>
            <input type="range" min="50" max="90" step="1" data-setting="fov"><output></output></label>
          <label class="pm-row"><span>Camera-afstand</span>
            <input type="range" min="0.8" max="1.6" step="0.05" data-setting="cameraDistance"><output></output></label>
          <label class="pm-row"><span>Muisgevoeligheid</span>
            <input type="range" min="0.3" max="2.5" step="0.05" data-setting="mouseSensitivity"><output></output></label>
          ${toggle('invertY', 'Omhoog/omlaag omkeren')}
        </div>
        <div data-sub="display" hidden>
          ${toggle('showMinimap', 'Minimap')}
          ${toggle('showHints', 'Toetshints')}
          ${toggle('showFog', 'Verkende gebieden op de kaart')}
          ${toggle('cinematicMoments', 'Filmische momenten')}
          <p class="pm-note">Korte filmpjes bij bezienswaardigheden, nieuwe wijken, crashes en vijf sterren. Intro’s, missies en de filmcamera (V) staan altijd aan.</p>
        </div>
        <button type="button" class="pm-secondary" data-action="reset">Standaardinstellingen</button>
      </div></section>
      <section data-panel="controls" class="pm-panel pm-col" hidden><div class="pm-inner">
        <dl class="pm-controls">
          ${CONTROLS.map(([k, v]) => `<dt><span class="hud-key">${k}</span></dt><dd>${v}</dd>`).join('')}
        </dl>
      </div></section>
      <section data-panel="game" class="pm-panel pm-col" hidden><div class="pm-inner pm-game">
        <button type="button" class="pm-primary" data-action="resume">Hervatten</button>
        <button type="button" class="pm-secondary" data-action="save">Opslaan</button>
        <button type="button" class="pm-secondary" data-action="load">Laatste save laden</button>
        <button type="button" class="pm-secondary" data-action="restart">Opnieuw beginnen</button>
        <button type="button" class="pm-secondary" data-action="intro">Intro opnieuw bekijken</button>
        <button type="button" class="pm-secondary" data-action="pigeon-home" data-pigeon hidden>Naar huis vliegen</button>
        <button type="button" class="pm-secondary" data-action="menu" data-both>Terug naar hoofdmenu</button>
        ${DESKTOP ? '<button type="button" class="pm-danger" data-action="exit" data-both>Spel afsluiten</button>' : ''}
        <div class="pm-confirm" hidden>
          <p>Opnieuw beginnen? Alles sinds je laatste save gaat verloren.</p>
          <button type="button" class="pm-secondary" data-action="load">Laatste save laden</button>
          <button type="button" class="pm-danger" data-action="new">Nieuw spel (save wissen)</button>
          <button type="button" class="pm-secondary" data-action="cancel">Annuleren</button>
        </div>
        <p class="pm-status" role="status"></p>
      </div></section>
    </main>
    <footer class="pm-footer"><span class="pm-foot-tab"></span>
      <span class="pm-foot-keys"><span class="pm-tabhint"><span class="hud-key">Q</span><span class="hud-key">E</span> tabblad</span> <span class="hud-key">Esc</span> sluiten</span></footer>`;
  document.body.appendChild(root);

  mountMapView(root.querySelector('[data-panel="map"]'));
  setMapCloseHandler(() => setOpen(false));

  for (const type of ['mousedown', 'mouseup', 'wheel']) root.addEventListener(type, (e) => e.stopPropagation());

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button[data-tab]');
    if (t) return showTab(t.dataset.tab);
    const st = e.target.closest('button[data-subtab]');
    if (st) return showSubtab(st.dataset.subtab);
    const m = e.target.closest('[data-mission]');
    if (m) return chooseMission(Number(m.dataset.mission));
    const action = e.target.closest('[data-action]');
    if (action) runAction(action.dataset.action);
  });
  root.addEventListener('input', (e) => {
    if (DESKTOP && e.target.dataset && e.target.dataset.desktop === 'fullscreen') {
      DESKTOP.setFullscreen(e.target.checked);
      return;
    }
    const key = e.target.dataset && e.target.dataset.setting;
    if (!key) return;
    const el = e.target;
    const value = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
    setSetting(key, value);
    syncControls();
  });

  // F11 / the macOS green button also switch modes: keep the checkbox right
  if (DESKTOP) DESKTOP.onFullscreenChange(() => syncDesktopControls());
  window.addEventListener('keydown', onKey);
  // ?stil marks an automated test session, whose tab is often hidden
  if (!new URLSearchParams(location.search).has('stil')) {
    document.addEventListener('visibilitychange', () => { if (document.hidden && started()) setOpen(true, 'game'); });
  }
}

function onKey(e) {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  const lower = k.length === 1 ? k.toLowerCase() : k;
  if (!open) {
    if (!started()) return;
    if (k === 'Escape' || (lower === 'm' && !isCinematicActive())) {
      e.preventDefault();
      setOpen(true, 'map');
    }
    return;
  }
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['range', 'checkbox'].includes(t.type)))) return;
  if (k === 'Escape' || (lower === 'm' && !prestart)) {
    e.preventDefault();
    setOpen(false);
  } else if (prestart) {
    return;
  } else if (lower === 'q' || lower === 'e') {
    e.preventDefault();
    cycleTab(lower === 'q' ? -1 : 1);
  } else if (k === 'Tab' && tab === 'map') {
    e.preventDefault();
    cycleTab(e.shiftKey ? -1 : 1);
  }
}

function cycleTab(dir) {
  const i = TABS.findIndex(([id]) => id === tab);
  showTab(TABS[(i + dir + TABS.length) % TABS.length][0]);
}

function runAction(a) {
  const confirmEl = root.querySelector('.pm-confirm');
  if (a === 'resume') setOpen(false);
  else if (a === 'save') status(saveGame(world) ? `Opgeslagen om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : 'Opslaan mislukt');
  else if (a === 'load') {
    if (loadLatestSave(world)) setOpen(false);
    else status('Geen save gevonden');
  } else if (a === 'restart') {
    confirmEl.hidden = false;
    syncGamePanel();
    confirmEl.querySelector('button').focus();
  } else if (a === 'cancel') confirmEl.hidden = true;
  else if (a === 'menu' || a === 'exit') {
    // normal mode keeps its progress: save, then back to the title screen
    // (Doorgaan) or close the app; pigeon mode has nothing to keep
    if (world && !world.pigeonMode) saveGame(world);
    if (a === 'exit' && DESKTOP) DESKTOP.quit();
    else location.reload();
  }
  else if (a === 'intro') { setOpen(false); replayIntro(world); }
  else if (a === 'pigeon-home') {
    if (world.pigeonActions && world.pigeonActions.home()) setOpen(false);
  } else if (a === 'new') {
    clearSave();
    location.reload();
  } else if (a === 'reset') {
    resetSettings();
    syncControls();
  }
}

function status(text) {
  root.querySelector('.pm-status').textContent = text;
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

function showSubtab(name) {
  for (const b of root.querySelectorAll('[data-subtab]')) b.setAttribute('aria-selected', String(b.dataset.subtab === name));
  for (const p of root.querySelectorAll('[data-sub]')) p.hidden = p.dataset.sub !== name;
}

function slider(key, label) {
  return `<label class="pm-row"><span>${label}</span>
    <input type="range" min="0" max="1" step="0.05" data-setting="${key}"><output></output></label>`;
}

function toggle(key, label) {
  return `<label class="pm-row"><span>${label}</span><input type="checkbox" data-setting="${key}"></label>`;
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
    if (el.type === 'checkbox') el.checked = v;
    else el.value = String(v);
    const out = el.nextElementSibling;
    if (out && out.tagName === 'OUTPUT') {
      out.textContent = el.dataset.setting === 'fov' ? `${v}°` : `${Math.round(v * 100)}%`;
    }
  }
  const shadowBox = root.querySelector('[data-setting="shadows"]');
  shadowBox.disabled = !shadowsAllowed;
  shadowBox.closest('.pm-row').classList.toggle('pm-disabled', !shadowsAllowed);
}

function renderMissions() {
  const list = getMissionList();
  const done = list.filter((m) => m.status === 'geklaard').length;
  root.querySelector('[data-info="progress"]').textContent = `${done}/${list.length} geklaard`;
  root.querySelector('.pm-missions').innerHTML = list.map((m) =>
    `<button type="button" class="pm-mission" data-mission="${m.index}" data-status="${m.status}">` +
    `<span class="pm-m-num">${m.index + 1}</span>` +
    `<span class="pm-m-text"><b>${esc(m.label)}</b><small>${TYPE_LABEL[m.type] || ''} · €${m.reward}</small></span>` +
    `<span class="pm-m-chip">${STATUS_LABEL[m.status]}</span></button>`).join('');
}

function syncGamePanel() {
  if (world && world.pigeonMode) { status('Duif-modus: er wordt niks opgeslagen.'); return; }
  const saved = hasSave();
  for (const b of root.querySelectorAll('[data-action="load"]')) b.disabled = !saved;
  const s = getSaveSummary();
  if (s && !root.querySelector('.pm-status').textContent) {
    const d = new Date(s.savedAt);
    status(`Laatste save: ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`);
  }
}

function refreshInfo() {
  if (!world) return;
  const c = world.pigeonMode ? 'Duif' : world.player.character === 'anita' ? 'Anita' : 'Tammo';
  root.querySelector('[data-info="char"]').textContent = c;
  const clock = getClockText(world);
  root.querySelector('[data-info="clock"]').textContent = clock;
  root.querySelector('[data-info="money"]').textContent = '€' + Math.max(0, Math.floor(world.money)).toLocaleString('nl-NL');
  const explored = getDiscoveredRatio();
  root.querySelector('[data-info="clock"]').title = explored ? `${Math.round(explored * 100)}% verkend` : '';
}

function showTab(name) {
  if (prestart) name = 'settings';
  if (!TABS.some(([id]) => id === name)) name = 'map';
  tab = name;
  for (const t of root.querySelectorAll('[data-tab]')) t.setAttribute('aria-selected', String(t.dataset.tab === name));
  for (const p of root.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
  root.dataset.activeTab = name;
  root.querySelector('.pm-foot-tab').innerHTML = prestart ? '' : FOOTERS[name] || '';
  if (world) setMapActive(world, open && name === 'map');
  if (name === 'missions') renderMissions();
  if (name === 'settings') { syncControls(); syncDesktopControls(); }
  if (name === 'game') {
    const pigeon = !!(world && world.pigeonMode);
    for (const b of root.querySelectorAll('.pm-game > [data-action]')) b.hidden = b.hasAttribute('data-both') ? false : b.hasAttribute('data-pigeon') ? !pigeon : pigeon && b.dataset.action !== 'resume';
    if (pigeon) root.querySelector('[data-action="pigeon-home"]').hidden = !(world.pigeonActions && world.pigeonActions.hasHome());
    root.querySelector('.pm-confirm').hidden = true;
    root.querySelector('.pm-status').textContent = '';
    syncGamePanel();
  }
  if (name !== 'map') {
    const first = root.querySelector(`[data-panel="${name}"] button, [data-panel="${name}"] input, [data-panel="${name}"] select`);
    if (first) first.focus({ preventScroll: true });
    else root.querySelector(`[data-tab="${name}"]`).focus({ preventScroll: true });
  }
}

// Opens the menu on a tab; with { prestart: true } it shows only Instellingen (start screen).
export function openPauseMenu(name = 'map', opts = {}) {
  if (opts.prestart) prestart = { onClose: opts.onClose || null };
  setOpen(true, name);
}

export function closePauseMenu() {
  setOpen(false);
}

function setOpen(value, name = 'map') {
  if (!root) return;
  if (value && !started() && !prestart) return;
  if (open === value) {
    if (value) showTab(name);
    return;
  }
  open = value;
  root.classList.toggle('visible', open);
  root.classList.toggle('prestart', !!prestart);
  if (input) input.reset();
  if (open) {
    refreshInfo();
    showTab(name);
  } else {
    if (world) setMapActive(world, false);
    const p = prestart;
    prestart = null;
    root.classList.remove('prestart');
    if (p && p.onClose) p.onClose();
  }
}
