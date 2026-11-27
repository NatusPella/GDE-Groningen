// Samen spelen (#1159): het wiel met snelle zinnen, emotes en doel delen. T opent het (controller: X), de toets in elke knop
// (1 t/m 8) kiest, T bladert naar de volgende pagina en Escape sluit. Op de controller kiest de linkerstick op richting, A
// bevestigt, B sluit en LB of RB bladert. Er is geen vrije tekst: alleen vaste Nederlandse zinnen (multiplayerphrases.js).
// Opt-in: zolang `samenZinnen` uit staat toont het wiel alleen een kaart met uitleg en een knop om het aan te zetten.
// De regels staan in multiplayerphrases.js en multiplayergoal.js (getest); dit bestand is alleen DOM en is niet in beeld bekeken.

import { glyphHtml } from './keycap.js';
import { icoon } from './icons.js';
import { setSetting } from './settings.js';
import { makeRadial, radialFromKey, radialFromStick, nextPage, PAGE_TITLE, RADIAL_PAGES } from './multiplayerphrases.js';
import { sayPhrase, phrasesEnabled, shareGoal, pingGoal } from './coopnet.js';
import { getUserWaypoint, setUserWaypoint } from './routing.js';
import { isSamenSessie } from './controls.js';
import { hoofdspeler } from './players.js';
import { escapeHtml as esc } from './htmlescape.js';


const CSS = `
#coop-wiel { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 720; box-sizing: border-box; width: min(520px, 92vw); padding: var(--ds-s-4); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-body); pointer-events: auto; }
#coop-wiel h3 { margin: 0 0 var(--ds-s-2); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); letter-spacing: var(--ds-ls-label); }
#coop-wiel .cw-rooster { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ds-s-2); }
#coop-wiel .cw-knop { display: flex; align-items: center; gap: var(--ds-s-3); min-height: var(--ds-doel-aanraken); padding: 0 var(--ds-s-3); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); font: inherit; text-align: left; cursor: pointer; }
#coop-wiel .cw-knop .ic { width: 1.1em; height: 1.1em; }
#coop-wiel .cw-knop:hover, #coop-wiel .cw-knop:focus-visible, #coop-wiel .cw-knop.cw-chosen { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-bord); }
#coop-wiel .cw-voet { margin-top: var(--ds-s-3); padding-top: var(--ds-s-2); border-top: var(--ds-lijn-dik) dashed var(--ds-c-ink-inkt); font-size: var(--ds-t-hulp); }
#coop-wiel p { margin: 0 0 var(--ds-s-2); line-height: var(--ds-lh-tekst); }
#coop-wiel .cw-aan { min-height: var(--ds-doel-aanraken); padding: 0 var(--ds-s-4); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: var(--ds-c-sel-vlak); color: var(--ds-zeef-tx); font: inherit; cursor: pointer; }
#coop-wiel :is(button):focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
`;

let worldRef = null, el = null, styled = false, open = false, pagina = 'zinnen', chosen = null, lastHtml = '', padPrev = { a: false, b: false, lb: false, rb: false };

// T is in de trein (door de trein lopen, traindrive.js) en op de trekker (de hef, boerderijwereld.js) al van het voertuig: daar opent het wiel niet (controller-review 22-11)
const opTrekker = (w) => { const v = hoofdspeler(w) && hoofdspeler(w).inVehicle; return !!(v && v.farm); };
const canOpen = (w) => !!(w && isSamenSessie(w) && w.coopNet && !w.paused && !w.coopHold && !w.activityGame && !w.padelGame && !w.trainDriving && !opTrekker(w));

function ensureStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style'); s.id = 'style-coopwiel'; s.textContent = CSS; document.head.appendChild(s);
}

function html() {
  if (!phrasesEnabled()) {
    return `<h3>Snelle zinnen</h3><p>Met snelle zinnen kies je een vaste Nederlandse zin of emote voor je medespelers. Er is geen vrije tekst. Je kunt elke speler dempen of blokkeren. Zet je ze aan, dan ziet en stuurt alleen jij ze.</p>` +
      `<button type="button" class="cw-aan" data-aan="1">Zet snelle zinnen aan</button><div class="cw-voet">Escape sluit. Aanpassen kan altijd bij Instellingen.</div>`;
  }
  const wiel = makeRadial(pagina);
  const knoppen = wiel.map((w) => `<button type="button" class="cw-knop${chosen === w.id ? ' cw-chosen' : ''}" data-zin="${esc(w.id)}">${glyphHtml(w.toets)}${icoon(w.icoon, { maat: 's' })}<span>${esc(w.tekst)}</span></button>`).join('');
  return `<h3>${esc(PAGE_TITLE[pagina])}</h3><div class="cw-rooster">${knoppen}</div>` +
    `<div class="cw-voet">${glyphHtml('T')} andere pagina (${RADIAL_PAGES.indexOf(pagina) + 1} van ${RADIAL_PAGES.length}) · Escape sluit · controller: stick kiest, A bevestigt, LB of RB bladert</div>`;
}

function draw() {
  if (typeof document === 'undefined') return;
  if (!open) { if (el) el.style.display = 'none'; return; }
  ensureStyle();
  if (!el) {
    el = document.createElement('div'); el.id = 'coop-wiel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Snelle zinnen'); document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const enable = e.target.closest('[data-aan]'); if (enable) { setSetting('samenZinnen', true); lastHtml = ''; draw(); return; }
      const z = e.target.closest('[data-zin]'); if (z) choose(z.getAttribute('data-zin'));
    });
  }
  el.style.display = 'block';
  const h = html(); if (h !== lastHtml) { el.innerHTML = h; lastHtml = h; }
}

function close() { open = false; chosen = null; lastHtml = ''; draw(); }

// Een keuze uitvoeren: een zin of emote gaat naar de anderen, de twee doelacties werken op je eigen kaartpunt (je doel).
export function choose(id) {
  if (!worldRef) return false;
  const w = makeRadial(pagina).find((x) => x.id === id) || makeRadial('zinnen').concat(makeRadial('emotes')).find((x) => x.id === id);
  if (!w) return false;
  let ok;
  if (w.id === 'doel-deel' || w.id === 'doel-ping') {
    const point = getUserWaypoint();
    if (!point) { if (worldRef.addMessage) worldRef.addMessage('Kies eerst een doel op de kaart ({M}).', 3); close(); return false; }
    ok = w.id === 'doel-deel' ? shareGoal(worldRef, point) : pingGoal(worldRef, point);
  } else ok = sayPhrase(worldRef, w.id);
  close();
  return ok;
}

function onKey(e) {
  if (!worldRef || e.repeat) return;
  const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!open) {
    if (k === 't' && !e.ctrlKey && !e.metaKey && !e.altKey && canOpen(worldRef) && !(e.target && /^(input|textarea|select)$/i.test(e.target.tagName || ''))) {
      open = true; pagina = 'zinnen'; draw(); e.stopImmediatePropagation(); e.preventDefault();
    }
    return;
  }
  // het wiel is open: deze toetsen zijn van het wiel en bereiken het spel niet (anders wisselt 1 t/m 4 ook van wapen)
  if (k === 'Escape') { close(); e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (k === 't') { pagina = nextPage(pagina); lastHtml = ''; draw(); e.stopImmediatePropagation(); e.preventDefault(); return; }
  if (/^[1-8]$/.test(k)) {
    const w = radialFromKey(pagina, k);
    if (phrasesEnabled() && w) choose(w.id);
    e.stopImmediatePropagation(); e.preventDefault();
  }
}
let bound = false;
function bind() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  window.addEventListener('keydown', onKey, true); // vangen: voor de invoer van het spel
}

// Elke frame vanuit coophud.js: opent met de controllerknop (T via padKeys), leest de controller als het wiel open staat en zet een
// gedeeld doel dat de ontvanger met J aannam op zijn eigen kaart.
export function updatePhrasesRadial(world) {
  if (typeof document === 'undefined') return;
  worldRef = world; bind();
  const inp = world.input;
  const dv = world.coopDoelVolg;
  if (dv) { world.coopDoelVolg = null; setUserWaypoint(dv.x, dv.y, dv.naam); if (world.addMessage) world.addMessage('Je volgt het gedeelde doel.', 3); }
  if (open && !canOpen(world)) { close(); return; }
  if (!open && inp && inp.wasPressed && inp.wasPressed('t') && canOpen(world)) { open = true; pagina = 'zinnen'; inp.consume && inp.consume('t'); }
  if (open) {
    const gp = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g && g.connected) : null;
    if (gp) {
      const sx = gp.axes[0] || 0, sy = gp.axes[1] || 0;
      const kiest = radialFromStick(pagina, sx, sy); const nu = kiest ? kiest.id : null;
      if (nu !== chosen) { chosen = nu; lastHtml = ''; }
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      if (b(0) && !padPrev.a && chosen && phrasesEnabled()) choose(chosen);
      else if (b(1) && !padPrev.b) close();
      else if ((b(4) && !padPrev.lb) || (b(5) && !padPrev.rb)) { pagina = nextPage(pagina); chosen = null; lastHtml = ''; }
      padPrev = { a: b(0), b: b(1), lb: b(4), rb: b(5) };
    }
  }
  draw();
}
export const radialIsOpen = () => open;
export const radialPage = () => pagina;
