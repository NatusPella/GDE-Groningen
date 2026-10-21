// Samen spelen (#95, #377): de spelerslijst in beeld. Twee plekken, nooit permanent: een compacte lijst links in het scherm zolang je
// Tab ingedrukt houdt, en het onderdeel Spelers in het pauzemenu (alleen in een sessie) met dezelfde gegevens en de roepjes.
// De gegevens komen uit world.coopSpelers (coopnet.js, gebouwd met coopspelers.js, getest); dit bestand is alleen DOM.
// Niet door een mens in beeld bekeken.
import { pingGebaar } from './coopnet.js';
import { PING_TOETSEN } from './coopping.js';
import { VORM_TEKEN } from './coopspelers.js';
import { setUserWaypoint } from './routing.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STIP = { ok: '#3fc97a', lag: '#f2c94c', lost: '#ff5a4f' };

function rijHtml(r, acties) {
  const naar = acties && !r.jij && r.x != null ? `<button type="button" class="cs-naar" data-naar="${r.slot}">Ga erheen</button>` : '';
  return `<li class="cs-rij" data-slot="${r.slot}"><span class="cs-vorm" style="color:${esc(r.kleur)}" aria-hidden="true">${VORM_TEKEN[r.vorm] || '●'}</span>` +
    `<span class="cs-naam">${esc(r.naam)}${r.jij ? ' <small>(jij)</small>' : ''}</span><span class="cs-doet">${esc(r.doet)}${r.afstandTekst ? ' · ' + esc(r.afstandTekst) : ''}</span>` +
    `<span class="cs-net" title="Verbinding"><i style="background:${STIP[r.verbinding] || STIP.ok}" aria-hidden="true"></i>${esc(r.verbindingTekst)}${r.ms != null ? ` <small>${r.ms} ms</small>` : ''}</span>${naar}</li>`;
}
const roepHint = () => PING_TOETSEN.map((k) => `<b>${k.toets}</b> ${esc(k.tekst)}`).join(' · ');

const CSS = `
.cs-lijst { font: 16px "Arial Narrow", Arial, sans-serif; color: #f0ede4; list-style: none; margin: 0; padding: 0; }
.cs-rij { display: grid; grid-template-columns: 22px minmax(70px, auto) 1fr auto; gap: 4px 10px; align-items: center; padding: 5px 0; }
.cs-vorm { font-size: 18px; text-align: center; }
.cs-naam { font-weight: bold; } .cs-naam small, .cs-net small { font-weight: normal; opacity: 0.7; }
.cs-doet { opacity: 0.85; }
.cs-net { white-space: nowrap; opacity: 0.9; } .cs-net i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
.cs-naar { grid-column: 2 / -1; justify-self: start; margin: 0 0 4px; padding: 3px 10px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: inherit; font: inherit; cursor: pointer; }
.cs-naar:hover, .cs-naar:focus-visible { background: rgba(63,201,122,0.35); outline: none; }
#coop-spelers { position: fixed; left: 50%; top: 104px; transform: translateX(-50%); z-index: 700; width: min(560px, 62vw); padding: 12px 16px 10px; background: rgba(12,20,14,0.88); color: #f0ede4; border-radius: 8px; box-shadow: 0 0 0 1px rgba(240,237,228,0.14); pointer-events: none; }
#coop-spelers h3 { margin: 0 0 4px; font: normal 22px "Bebas Neue", "Arial Narrow", Arial, sans-serif; letter-spacing: 0.06em; }
#coop-spelers .cs-voet { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(240,237,228,0.16); font: 14px "Arial Narrow", Arial, sans-serif; opacity: 0.8; }
#coop-spelers .cs-voet b { padding: 0 5px; border-radius: 3px; background: rgba(240,237,228,0.18); }
.pm-spelers { display: flex; flex-direction: column; gap: 14px; max-width: 952px; padding: 32px 64px 40px; overflow-y: auto; scrollbar-width: none; font-family: "Arial Narrow", Arial, sans-serif; color: #f0ede4; }
.pm-spelers .cs-lijst { font-size: 22px; } .pm-spelers .cs-rij { padding: 8px 0; grid-template-columns: 30px minmax(110px, auto) 1fr auto; } .pm-spelers .cs-vorm { font-size: 24px; }
.pm-spelers p { margin: 0; max-width: 640px; font-size: 20px; line-height: 1.35; opacity: 0.85; }
.pm-spelers .cs-roep { display: flex; flex-wrap: wrap; gap: 10px; }
.pm-spelers .cs-roep button { padding: 10px 18px; border: 0; border-radius: 8px; background: #3fc97a; color: #0c140e; font: bold 20px "Arial Narrow", Arial, sans-serif; cursor: pointer; }
.pm-spelers .cs-roep button:focus-visible { outline: 2px solid #f0ede4; outline-offset: 2px; }
`;
let stijl = false;
function zorgVoorStijl() {
  if (stijl || typeof document === 'undefined') return;
  stijl = true;
  const el = document.createElement('style'); el.id = 'style-coopspelers'; el.textContent = CSS; document.head.appendChild(el);
}

// ---- de lijst bij Tab (elke frame vanuit main.js via coophud.js)
let overlay = null, laatste = '';
export function updateSpelersOverlay(world) {
  if (typeof document === 'undefined') return;
  const rijen = world.coopNet && world.coopSpelers;
  const menu = document.getElementById('pause-menu');
  const film = document.body.classList.contains('cine-hide-hud'); // een filmpje verbergt de HUD, dus ook de lijst
  const toon = !!(rijen && rijen.length && world.input && world.input.isDown && world.input.isDown('tab') && !(menu && menu.classList.contains('visible')) && !film);
  if (!toon) { if (overlay) overlay.style.display = 'none'; return; }
  zorgVoorStijl();
  if (!overlay) {
    overlay = document.createElement('div'); overlay.id = 'coop-spelers'; overlay.setAttribute('role', 'status');
    document.body.appendChild(overlay);
  }
  overlay.style.display = '';
  const key = rijen.map((r) => `${r.slot}|${r.doet}|${r.verbinding}|${r.ms}|${r.afstandTekst}|${r.naam}`).join(';');
  if (key === laatste) return;
  laatste = key;
  overlay.innerHTML = `<h3>Spelers</h3><ul class="cs-lijst">${rijen.map((r) => rijHtml(r, false)).join('')}</ul><div class="cs-voet">${roepHint()}</div>`;
}
export const spelersOverlayZichtbaar = () => !!overlay && overlay.style.display !== 'none';

// ---- het onderdeel Spelers in het pauzemenu
let timer = null;
export function renderSpelersPanel(root, world, sluit = () => {}) {
  if (!root) return;
  zorgVoorStijl();
  root.classList.add('pm-spelers');
  const teken = () => {
    if (!root.isConnected || root.closest('[hidden]')) { if (timer) { clearInterval(timer); timer = null; } return; }
    const rijen = (world.coopNet && world.coopSpelers) || [];
    if (!rijen.length) { root.innerHTML = '<p>Je speelt niet samen. Open Samen spelen om iemand uit te nodigen of aan te sluiten.</p>'; return; }
    const zittend = root.contains(document.activeElement) && document.activeElement.matches('button');
    const key = JSON.stringify(rijen.map((r) => [r.slot, r.doet, r.verbinding, r.ms, r.afstandTekst]));
    if (root.dataset.key === key && root.dataset.klaar) return;
    if (zittend && root.dataset.klaar) return; // de focus op een knop blijft staan
    root.dataset.key = key; root.dataset.klaar = '1';
    root.innerHTML = `<ul class="cs-lijst">${rijen.map((r) => rijHtml(r, true)).join('')}</ul>` +
      `<p>Roepen kan ook in het spel: ${roepHint()}. Iemand uitnodigen: kies Samen spelen in het menu.</p>` +
      `<div class="cs-roep">${PING_TOETSEN.map((k) => `<button type="button" data-ping="${k.soort}">${esc(k.tekst)} <small>(${k.toets})</small></button>`).join('')}</div>`;
  };
  if (!root.dataset.gebonden) {
    root.dataset.gebonden = '1';
    root.addEventListener('click', (e) => {
      const p = e.target.closest('[data-ping]');
      if (p && world.player) { if (pingGebaar(world, p.getAttribute('data-ping'))) sluit(); return; }
      const n = e.target.closest('[data-naar]');
      if (n) {
        const r = (world.coopSpelers || []).find((x) => x.slot === +n.getAttribute('data-naar'));
        if (r && r.x != null) { setUserWaypoint(r.x, r.y, r.naam); if (world.addMessage) world.addMessage(`Route naar ${r.naam} staat op de kaart.`, 3); sluit(); }
      }
    });
  }
  root.dataset.klaar = ''; teken();
  if (timer) clearInterval(timer);
  timer = setInterval(teken, 500);
}
