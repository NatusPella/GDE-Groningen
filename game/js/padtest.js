// "Controller testen" (Instellingen › Camera & controller, #151): laat live zien
// welk pad herkend is, welke knoppen en assen een beweging geven en hoe de
// game het pad indeelt, zodat een tester precies kan melden wat niet klopt.
import { padInfo, PAD_LAYOUTS } from './controls.js';
import { getSettings, setSetting } from './settings.js';

let root = null;
let raf = 0;

// de standaardnamen van de 17 knoppen van de Gamepad API, op volgorde
const SLOTS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right', 'home'];

export function isPadTestOpen() { return !!root; }

export function padTestLabel(index, family) {
  const slot = SLOTS[index];
  if (!slot) return 'Knop ' + index;
  if (slot === 'home') return 'Home';
  const lay = PAD_LAYOUTS[family] || PAD_LAYOUTS.xbox;
  return lay[slot] || ({ up: 'Omhoog', down: 'Omlaag', left: 'Links', right: 'Rechts' }[slot]) || slot;
}

function currentPad() {
  try { return (navigator.getGamepads ? [...navigator.getGamepads()] : []).find((g) => g && g.connected) || null; } catch (e) { return null; }
}

export function closePadTest() {
  if (!root) return;
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', onKey, true);
  root.remove();
  root = null;
}

// de indelingen waar de speler uit kiest als de letters op zijn knoppen anders zijn dan het spel denkt
const LAYOUT_CHOICES = [['auto', 'Automatisch'], ['xbox', 'Onderste knop A'], ['switch', 'Onderste knop B'], ['ps', 'Vormknoppen'], ['deck', 'Handheld']];

function onKey(e) {
  if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); closePadTest(); return; }
  // de pijlen en Enter (A) bedienen de indelingsknoppen; ze sluiten het testscherm niet
  e.preventDefault();
  e.stopPropagation();
  if (e.type !== 'keydown' || e.repeat) return;
  const btns = [...root.querySelectorAll('button')];
  const i = btns.indexOf(document.activeElement);
  if (e.key === 'Enter' && i >= 0) { btns[i].click(); return; }
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (step && btns.length) btns[((i < 0 ? (step > 0 ? -1 : 0) : i) + step + btns.length) % btns.length].focus();
}

export function openPadTest() {
  if (root) return;
  root = document.createElement('div');
  root.id = 'padtest';
  root.className = 'gm';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Controller testen');
  root.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(10,14,12,.82);color:#f0ede4;font:16px system-ui,sans-serif';
  root.innerHTML = `<div style="width:min(640px,92vw);max-height:90vh;overflow:auto;padding:20px;border-radius:14px;background:#17201a;border:1px solid #3a4a3e">
    <h2 style="margin:0 0 8px">Controller testen</h2>
    <p class="pt-id" style="margin:0 0 4px"></p><p class="pt-info" style="margin:0 0 4px"></p><p class="pt-note" style="margin:0 0 8px;color:#f2c230"></p>
    <p style="margin:0 0 6px">Staat er een andere letter op je onderste knop dan hieronder? Kies hoe je knoppen heten:</p>
    <div class="pt-lay" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${LAYOUT_CHOICES.map(([v, t]) => `<button type="button" data-lay="${v}" style="padding:6px 12px">${t}</button>`).join('')}</div>
    <p class="pt-last" style="margin:0 0 8px;min-height:1.4em"></p>
    <div class="pt-btns" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
    <p class="pt-axes" style="margin:0 0 12px;font-variant-numeric:tabular-nums"></p>
    <button type="button" class="pt-close" style="padding:8px 16px">Sluiten</button>
    <p style="margin:10px 0 0;opacity:.7;font-size:13px">Druk op knoppen en beweeg de sticks. Is er niets te zien, druk dan eerst op een knop. Escape of de rechterknop sluit dit scherm.</p></div>`;
  document.body.appendChild(root);
  const q = (c) => root.querySelector(c);
  q('.pt-close').addEventListener('click', closePadTest);
  q('.pt-lay').addEventListener('click', (e) => { const b = e.target.closest('button[data-lay]'); if (b) setSetting('padLayout', b.dataset.lay); });
  q('.pt-close').focus();
  window.addEventListener('keydown', onKey, true);
  let last = '';
  const poll = () => {
    raf = requestAnimationFrame(poll);
    const pad = currentPad();
    const info = padInfo(pad && pad.id, pad && pad.mapping);
    const pref = getSettings().padLayout;
    const family = pref && pref !== 'auto' ? pref : info.family;
    q('.pt-id').textContent = pad ? `Gevonden: ${pad.id}` : 'Geen controller gevonden.';
    q('.pt-info').textContent = pad ? `Herkend als ${info.name} · indeling ${family} · mapping ${pad.mapping || 'geen'} · ${pad.buttons.length} knoppen, ${pad.axes.length} assen` : '';
    q('.pt-note').textContent = info.note;
    for (const b of q('.pt-lay').children) {
      const on = b.dataset.lay === (pref || 'auto');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.style.cssText = `padding:6px 12px;border:1px solid #3a4a3e;background:${on ? '#f2c230' : 'transparent'};color:${on ? '#17201a' : 'inherit'}`;
    }
    const btns = q('.pt-btns');
    const n = pad ? pad.buttons.length : 0;
    if (btns.childElementCount !== n) {
      btns.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const b = document.createElement('span');
        b.style.cssText = 'padding:4px 8px;border-radius:6px;border:1px solid #3a4a3e;min-width:2.4em;text-align:center';
        b.textContent = padTestLabel(i, family);
        b.title = 'Knop ' + i;
        btns.appendChild(b);
      }
    }
    for (let i = 0; i < n; i++) {
      const b = pad.buttons[i], on = !!(b && (b.pressed || b.value > 0.5));
      const el = btns.children[i];
      el.style.background = on ? '#f2c230' : 'transparent';
      el.style.color = on ? '#17201a' : '';
      if (on) { const t = `Ingedrukt: ${padTestLabel(i, family)} (knop ${i})`; if (t !== last) { last = t; q('.pt-last').textContent = t; } }
    }
    q('.pt-axes').textContent = pad ? 'Assen: ' + pad.axes.map((a, i) => `${i}: ${a.toFixed(2)}`).join('   ') : '';
  };
  poll();
}
