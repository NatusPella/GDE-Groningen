// Samen spelen (#95, #377, #434): de spelerslijst in beeld. Twee plekken, nooit permanent: een compacte lijst links in het scherm zolang je
// Tab ingedrukt houdt, en het tabblad Spelers onder Spel > Samen spelen (alleen in een sessie) met dezelfde gegevens en de roepjes.
// In het pauzemenu stel je ook je online-avatar in (#455): de naam en kleur die anderen van je zien.
// De gegevens komen uit world.coopSpelers (coopnet.js, gebouwd met coopspelers.js, getest); dit bestand is alleen DOM.
// Niet door een mens in beeld bekeken.
import { pingGebaar, zetPassiefGebaar, kanPassiefKiezen, passiefStandVan } from './coopnet.js';
import { PVP_TEKST } from './cooppvp.js';
import { PING_TOETSEN } from './coopping.js';
import { VORM_TEKEN, kanEruitZetten, kanOverdragen, overdragenKnopTekst, eruitKnopTekst, eruitGezetTekst } from './coopspelers.js';
import { removeGuest } from './coopnet.js';
import { biedOver } from './coophostwisselnet.js';
import { setUserWaypoint } from './routing.js';
import { getSettings, setSetting } from './settings.js';
import { PROFIEL_KLEUREN, ONLINE_NAAM_MAX, profielNaam, profielKleur, profielTekst } from './lobby.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STIP = { ok: '#3fc97a', lag: '#f2c94c', lost: '#ff5a4f' };

function rijHtml(r, acties, rol = null, bevestig = null) {
  const eruit = acties && kanEruitZetten(rol, r) ? `<button type="button" class="cs-eruit" data-eruit="${r.slot}">${eruitKnopTekst(bevestig === r.slot)}</button>` : '';
  const geef = acties && kanOverdragen(rol, r) ? `<button type="button" class="cs-naar" data-geef="${r.slot}">${overdragenKnopTekst}</button>` : '';
  const naar = acties && !r.jij && r.x != null ? `<button type="button" class="cs-naar" data-naar="${r.slot}">Ga erheen</button>` : '';
  // de groep (#492): "leidt <label>" bij de leider, de groepsnaam bij de andere deelnemers, niets bij wie niet meedoet
  const groep = r.groep ? ` <small class="cs-groep${r.leidt ? ' cs-leidt' : ''}">${esc(r.groep)}</small>` : '';
  return `<li class="cs-rij" data-slot="${r.slot}"><span class="cs-vorm" style="color:${esc(r.kleur)}" aria-hidden="true">${VORM_TEKEN[r.vorm] || '●'}</span>` +
    `<span class="cs-naam">${esc(r.naam)}${r.jij ? ' <small>(jij)</small>' : ''}${groep}</span><span class="cs-doet">${esc(r.doet)}${r.afstandTekst ? ' · ' + esc(r.afstandTekst) : ''}</span>` +
    `<span class="cs-net" title="Verbinding"><i style="background:${STIP[r.verbinding] || STIP.ok}" aria-hidden="true"></i>${esc(r.verbindingTekst)}${r.ms != null ? ` <small>${r.ms} ms</small>` : ''}</span>${naar}${geef}${eruit}</li>`;
}
// De passieve stand (#447): een knop met uitleg, alleen als de host het kent
function pvpHtml(world) {
  if (!kanPassiefKiezen(world)) return '';
  const passief = passiefStandVan(world);
  return `<div class="cs-pvp"><button type="button" data-passief="${passief ? '0' : '1'}" aria-pressed="${passief ? 'true' : 'false'}">${passief ? PVP_TEKST.knopAan : PVP_TEKST.knopUit}</button><p>${esc(PVP_TEKST.uitleg)}</p></div>`;
}
const roepHint =() => PING_TOETSEN.map((k) => `<b>${k.toets}</b> ${esc(k.tekst)}`).join(' · ');

const CSS = `
.cs-lijst { font: 16px "Arial Narrow", Arial, sans-serif; color: #f0ede4; list-style: none; margin: 0; padding: 0; }
.cs-rij { display: grid; grid-template-columns: 22px minmax(70px, auto) 1fr auto; gap: 4px 10px; align-items: center; padding: 5px 0; }
.cs-vorm { font-size: 18px; text-align: center; }
.cs-naam { font-weight: bold; } .cs-naam small, .cs-net small { font-weight: normal; opacity: 0.7; }
.cs-doet { opacity: 0.85; }
.cs-groep { display: inline-block; padding: 0 5px; border-radius: 3px; background: rgba(240,237,228,0.14); }
.cs-naam .cs-groep { opacity: 0.9; }
.cs-naam .cs-groep.cs-leidt { background: rgba(63,201,122,0.28); opacity: 1; }
.cs-net { white-space: nowrap; opacity: 0.9; } .cs-net i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
.cs-eruit { grid-column: 2 / -1; justify-self: start; margin: 0 0 4px; padding: 3px 10px; border: 0; border-radius: 4px; background: rgba(255,90,79,0.28); color: inherit; font: inherit; cursor: pointer; } .cs-naar + .cs-eruit { grid-column: auto; }
.cs-naar { grid-column: 2 / -1; justify-self: start; margin: 0 0 4px; padding: 3px 10px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: inherit; font: inherit; cursor: pointer; }
.cs-naar:hover, .cs-naar:focus-visible { background: rgba(63,201,122,0.35); outline: none; }
#coop-spelers { position: fixed; left: 50%; top: 104px; transform: translateX(-50%); z-index: 700; width: min(560px, 62vw); max-height: calc(100vh - 124px); overflow: hidden; padding: 12px 16px 10px; background: rgba(12,20,14,0.88); color: #f0ede4; border-radius: 8px; box-shadow: 0 0 0 1px rgba(240,237,228,0.14); pointer-events: none; }
#coop-spelers h3 { margin: 0 0 4px; font: normal 22px "Bebas Neue", "Arial Narrow", Arial, sans-serif; letter-spacing: 0.06em; }
#coop-spelers .cs-voet { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(240,237,228,0.16); font: 14px "Arial Narrow", Arial, sans-serif; opacity: 0.8; }
#coop-spelers .cs-voet b { padding: 0 5px; border-radius: 3px; background: rgba(240,237,228,0.18); }
.pm-spelers { display: flex; flex-direction: column; gap: 14px; max-width: 952px; padding: 32px 64px 40px; overflow-y: auto; scrollbar-width: none; font-family: "Arial Narrow", Arial, sans-serif; color: #f0ede4; }
.pm-spelers .cs-lijst { font-size: 22px; } .pm-spelers .cs-rij { padding: 8px 0; grid-template-columns: 30px minmax(110px, auto) 1fr auto; } .pm-spelers .cs-vorm { font-size: 24px; }
.pm-spelers p { margin: 0; max-width: 640px; font-size: 20px; line-height: 1.35; opacity: 0.85; }
.pm-spelers .cs-pvp { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.pm-spelers .cs-pvp button { padding: 10px 18px; border: 0; border-radius: 8px; background: rgba(240,237,228,0.18); color: #f0ede4; font: bold 20px "Arial Narrow", Arial, sans-serif; cursor: pointer; }
.pm-spelers .cs-pvp button[aria-pressed="false"] { background: #d9822b; color: #0c140e; }
.pm-spelers .cs-pvp button:focus-visible { outline: 2px solid #f0ede4; outline-offset: 2px; }
.pm-spelers .cs-roep { display: flex; flex-wrap: wrap; gap: 10px; }
.pm-spelers .cs-roep button { padding: 10px 18px; border: 0; border-radius: 8px; background: #3fc97a; color: #0c140e; font: bold 20px "Arial Narrow", Arial, sans-serif; cursor: pointer; }
.pm-spelers .cs-roep button:focus-visible { outline: 2px solid #f0ede4; outline-offset: 2px; }
.cs-profiel { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px solid rgba(240,237,228,0.16); }
.cs-profiel h4 { margin: 0; font: normal 20px "Bebas Neue", "Arial Narrow", Arial, sans-serif; letter-spacing: 0.06em; }
.cs-profiel p { max-width: 640px; }
.cs-profiel-label { display: flex; gap: 10px; align-items: center; font-size: 20px; }
.cs-profiel-naam { min-width: 0; max-width: 260px; padding: 4px 8px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: #f0ede4; font: inherit; }
.cs-kleuren { display: flex; flex-wrap: wrap; gap: 6px; }
.cs-kleuren button { padding: 4px 10px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: #f0ede4; font: inherit; cursor: pointer; }
.cs-kleuren button[aria-pressed="true"] { background: rgba(63,201,122,0.4); }
.cs-kleuren button:focus-visible, .cs-profiel-naam:focus-visible { outline: 2px solid #f0ede4; outline-offset: 2px; }
.cs-profiel-fout { color: #ff8f86; }
.cs-profiel-hint { font-size: 16px; opacity: 0.75; }
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
  const toon = !!(rijen && rijen.length && world.input && world.input.isDown && world.input.isDown('tab') && !world.paused && !(menu && menu.classList.contains('visible')) && !film); // niet over de kaart, een winkel of het pauzemenu
  if (!toon) { if (overlay) overlay.style.display = 'none'; return; }
  zorgVoorStijl();
  if (!overlay) {
    overlay = document.createElement('div'); overlay.id = 'coop-spelers'; overlay.setAttribute('role', 'status');
    document.body.appendChild(overlay);
  }
  overlay.style.display = '';
  const key = rijen.map((r) => `${r.slot}|${r.doet}|${r.verbinding}|${r.ms}|${r.afstandTekst}|${r.naam}|${r.groep}|${r.leidt}`).join(';');
  if (key === laatste) return;
  laatste = key;
  overlay.innerHTML = `<h3>Spelers</h3><ul class="cs-lijst">${rijen.map((r) => rijHtml(r, false)).join('')}</ul><div class="cs-voet">${roepHint()}</div>`;
}
export const spelersOverlayZichtbaar = () => !!overlay && overlay.style.display !== 'none';

// ---- het onderdeel Spelers in het pauzemenu
let timer = null, bevestig = null, profielFout = '';
// Je online-avatar (#455): de naam en kleur die anderen van je zien. Bewaard in de
// gewone instellingen (settings.js), dus per apparaat; de volgende keer dat je
// meedoet gaan ze mee in de kennismaking en ziet iedereen ze bij je figuur.
function profielHtml(world) {
  const s = getSettings();
  const kleur = profielKleur(s.onlineKleur);
  return `<div class="cs-profiel"><h4>Je online-avatar</h4><p>${esc(profielTekst({ naam: s.onlineNaam, kleur }))} Je speelt lokaal je eigen verhaal (Tammo of Tessa); zo zien de anderen je, ook in deze lijst.</p>` +
    `<label class="cs-profiel-label">Online naam <input type="text" class="cs-profiel-naam" maxlength="${ONLINE_NAAM_MAX}" spellcheck="false" autocomplete="off" placeholder="Je figuur" value="${esc(s.onlineNaam)}"></label>` +
    `<div class="cs-kleuren" role="group" aria-label="Kleur">${PROFIEL_KLEUREN.map((c) => `<button type="button" data-kleur="${c.hex}" aria-pressed="${c.hex === kleur}"><span style="color:${c.hex}" aria-hidden="true">●</span> ${esc(c.naam)}</button>`).join('')}</div>` +
    (profielFout ? `<p class="cs-profiel-fout" role="alert">${esc(profielFout)}</p>` : '') +
    `<p class="cs-profiel-hint">Je staat standaard op passief: medespelers kunnen je geen schade doen, en alleen als jij en de ander die stand allebei uitzetten, kunnen jullie elkaar raken. ${world && world.coopNet ? 'Je nieuwe naam en kleur gelden zodra je opnieuw meedoet.' : 'Het spel bewaart je naam en kleur op dit apparaat.'}</p></div>`;
}
export function renderSpelersPanel(root, world, sluit = () => {}) {
  if (!root) return;
  zorgVoorStijl();
  root.classList.add('pm-spelers');
  const teken = () => {
    if (!root.isConnected || root.closest('[hidden]')) { if (timer) { clearInterval(timer); timer = null; } return; }
    const rijen = (world.coopNet && world.coopSpelers) || [];
    const schermNaam = root.querySelector('.cs-profiel-naam');
    const zittend = root.contains(document.activeElement) && document.activeElement.matches('button, input');
    const rol = world.coopNet && world.coopNet.role;
    const prof = getSettings();
    const key = JSON.stringify([bevestig, kanPassiefKiezen(world), passiefStandVan(world), prof.onlineNaam, prof.onlineKleur, profielFout, ...rijen.map((r) => [r.slot, r.doet, r.verbinding, r.ms, r.afstandTekst, r.passief, r.pvpInSpel, r.groep, r.leidt])]);
    if (root.dataset.key === key && root.dataset.klaar) return;
    if (zittend && root.dataset.klaar) return; // de focus op een knop of in het naamveld blijft staan
    const naamInvoer = schermNaam && document.activeElement === schermNaam ? schermNaam.value : prof.onlineNaam;
    root.dataset.key = key; root.dataset.klaar = '1';
    root.innerHTML = (rijen.length
      ? `<ul class="cs-lijst">${rijen.map((r) => rijHtml(r, true, rol, bevestig)).join('')}</ul>` +
        `<p>Roepen kan ook in het spel: ${roepHint()}. Iemand uitnodigen doe je op het tabblad Samen spelen.</p>` +
        pvpHtml(world) +
        `<div class="cs-roep">${PING_TOETSEN.map((k) => `<button type="button" data-ping="${k.soort}">${esc(k.tekst)} <small>(${k.toets})</small></button>`).join('')}</div>`
      : `<p>Je speelt niet samen. Ga naar het tabblad Samen spelen om iemand uit te nodigen of aan te sluiten.</p>`) +
      profielHtml(world);
    const veld = root.querySelector('.cs-profiel-naam'); if (veld && veld.value !== naamInvoer) veld.value = naamInvoer;
  };
  if (!root.dataset.gebonden) {
    root.dataset.gebonden = '1';
    root.addEventListener('change', (e) => { // het naamveld: pas bij verlaten filteren en bewaren
      if (e.target && e.target.matches && e.target.matches('.cs-profiel-naam')) {
        const r = profielNaam(e.target.value);
        profielFout = r.ok ? '' : r.reason;
        if (r.ok) setSetting('onlineNaam', r.naam);
        root.dataset.klaar = ''; teken();
      }
    });
    root.addEventListener('click', (e) => {
      const kk = e.target.closest('[data-kleur]');
      if (kk) { profielFout = ''; setSetting('onlineKleur', profielKleur(kk.getAttribute('data-kleur'))); root.dataset.klaar = ''; teken(); return; }
      const p = e.target.closest('[data-ping]');
      if (p && world.player) { if (pingGebaar(world, p.getAttribute('data-ping'))) sluit(); return; }
      const ps = e.target.closest('[data-passief]');
      if (ps) { zetPassiefGebaar(world, ps.getAttribute('data-passief') === '1'); root.dataset.klaar = ''; teken(); return; } // omschakelen met afkoeling; de gast ziet de stand zodra de host antwoordt (#447)
      const k = e.target.closest('[data-eruit]');
      if (k) { // twee keer klikken: eerst vragen, dan eruit zetten (#434)
        const slot = +k.getAttribute('data-eruit'), r = (world.coopSpelers || []).find((x) => x.slot === slot);
        if (bevestig !== slot) { bevestig = slot; root.dataset.klaar = ''; teken(); return; }
        bevestig = null; root.dataset.klaar = '';
        if (r && removeGuest(world, slot) && world.addMessage) world.addMessage(eruitGezetTekst(r), 4);
        teken(); return;
      }
      const geef = e.target.closest('[data-geef]');
      if (geef) { if (biedOver(world, +geef.getAttribute('data-geef')).ok) sluit(); return; } // #439: het spel overdragen; bij een reden blijft het menu staan (de melding staat al in beeld)
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
