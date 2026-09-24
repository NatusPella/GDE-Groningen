import { getSettings, setSetting, resetSettings, QUALITY_PRESETS } from './settings.js';
import { isMapOpen } from './mapview.js';

const CONTROLS = [
  ['W / S', 'lopen of gas geven / achteruit'],
  ['A / D', 'draaien / sturen'],
  ['Shift', 'rennen'],
  ['Spatie', 'springen / remmen'],
  ['Ctrl', 'bukken'],
  ['E / F', 'instappen / uitstappen / kusje'],
  ['Muisklik', 'aanvallen / schieten'],
  ['1–4', 'vuisten / pistool / uzi / hagelgeweer'],
  ['Muis omhoog/omlaag', 'camerahoek'],
  ['C', 'wissel Tammo / Anita'],
  ['M', 'kaart (klik: bestemming, Shift+klik: teleporteren)'],
  ['U', 'geluid aan/uit'],
  ['Esc', 'menu'],
];

let root = null;
let open = false;
let input = null;

export function isPauseMenuOpen() {
  return open;
}

export function initPauseMenu(world) {
  input = world.input;
  root = document.createElement('div');
  root.id = 'pause-menu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pause-title');
  root.innerHTML = `
    <div class="pm-card">
      <h1 id="pause-title">Gepauzeerd</h1>
      <nav class="pm-tabs" role="tablist">
        <button type="button" role="tab" data-tab="menu" aria-selected="true">Menu</button>
        <button type="button" role="tab" data-tab="settings">Instellingen</button>
        <button type="button" role="tab" data-tab="controls">Besturing</button>
      </nav>
      <section data-panel="menu" class="pm-panel">
        <button type="button" class="pm-primary" data-action="resume">Hervatten</button>
        <button type="button" class="pm-secondary" data-action="restart">Opnieuw beginnen</button>
      </section>
      <section data-panel="settings" class="pm-panel" hidden>
        <h2>Geluid</h2>
        ${slider('masterVolume', 'Hoofdvolume')}
        ${slider('musicVolume', 'G-Music')}
        ${slider('sfxVolume', 'Effecten')}
        <h2>Beeld</h2>
        <label class="pm-row"><span>Kwaliteit</span>
          <select data-setting="quality">
            ${Object.keys(QUALITY_PRESETS).map((q) => `<option value="${q}">${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}
          </select>
        </label>
        ${toggle('shadows', 'Schaduwen')}
        <label class="pm-row"><span>Beeldhoek</span>
          <input type="range" min="50" max="90" step="1" data-setting="fov"><output></output></label>
        <label class="pm-row"><span>Camera-afstand</span>
          <input type="range" min="0.8" max="1.6" step="0.05" data-setting="cameraDistance"><output></output></label>
        <h2>HUD</h2>
        ${toggle('showMinimap', 'Minimap')}
        ${toggle('showHints', 'Toetshints')}
        <h2>Kaart</h2>
        ${toggle('showFog', 'Verkende gebieden tonen')}
        <button type="button" class="pm-secondary" data-action="reset">Standaardinstellingen</button>
      </section>
      <section data-panel="controls" class="pm-panel" hidden>
        <dl class="pm-controls">
          ${CONTROLS.map(([k, v]) => `<dt><span class="hud-key">${k}</span></dt><dd>${v}</dd>`).join('')}
        </dl>
      </section>
      <p class="pm-footer">Esc om verder te spelen</p>
    </div>`;
  document.body.appendChild(root);

  // clicks inside the menu must never reach the game's mouse input
  for (const type of ['mousedown', 'mouseup', 'wheel']) root.addEventListener(type, (e) => e.stopPropagation());

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) return showTab(tab.dataset.tab);
    const action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'resume') setOpen(false);
    else if (action.dataset.action === 'restart') {
      if (window.confirm('Opnieuw beginnen? Je voortgang gaat verloren.')) location.reload();
    } else if (action.dataset.action === 'reset') {
      resetSettings();
      syncControls();
    }
  });
  root.addEventListener('input', (e) => {
    const key = e.target.dataset && e.target.dataset.setting;
    if (!key) return;
    const el = e.target;
    const value = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
    setSetting(key, value);
    syncControls();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.repeat) return;
    if (!document.body.classList.contains('game-started') || isMapOpen()) return;
    e.preventDefault();
    setOpen(!open);
  });
  // ?stil marks an automated test session, whose tab is often hidden
  if (!new URLSearchParams(location.search).has('stil')) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) setOpen(true); });
  }
}

function slider(key, label) {
  return `<label class="pm-row"><span>${label}</span>
    <input type="range" min="0" max="1" step="0.05" data-setting="${key}"><output></output></label>`;
}

function toggle(key, label) {
  return `<label class="pm-row"><span>${label}</span><input type="checkbox" data-setting="${key}"></label>`;
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

function showTab(name) {
  for (const t of root.querySelectorAll('[data-tab]')) t.setAttribute('aria-selected', String(t.dataset.tab === name));
  for (const p of root.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
}

function setOpen(value) {
  if (!root || open === value) return;
  if (value && !document.body.classList.contains('game-started')) return;
  open = value;
  root.classList.toggle('visible', open);
  if (input) input.reset();
  if (open) {
    syncControls();
    showTab('menu');
    root.querySelector('[data-action="resume"]').focus();
  }
}
