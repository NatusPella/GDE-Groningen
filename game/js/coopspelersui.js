import { hoofdspeler } from './players.js';
// Samen spelen (#95, #377, #434): de spelerslijst in beeld. Twee plekken, nooit permanent: een compacte lijst boven in het scherm zolang je
// Tab ingedrukt houdt (of met de 44px-knop op aanraking), en het tabblad Spelers onder Spel > Samen spelen (alleen in een sessie) met dezelfde gegevens en de roepjes.
// In het pauzemenu stel je ook je online-avatar in (#455): de naam en kleur die anderen van je zien.
// De gegevens komen uit world.coopSpelers (coopnet.js, gebouwd met coopspelers.js, getest); dit bestand is alleen DOM.
// Niet door een mens in beeld bekeken.
import { pingGebaar, zetPassiefGebaar, kanPassiefKiezen, passiefStandVan } from './coopnet.js';
import { isSoloHost } from './coopsolo.js';
import { PVP_TEKST } from './cooppvp.js';
import { PING_TOETSEN } from './coopping.js';
import { VORM_TEKEN, kanEruitZetten, kanOverdragen, overdragenKnopTekst, eruitKnopTekst, eruitGezetTekst, veiligeKleur, SPELERS_KNOP, spelersKnopTekst } from './coopspelers.js';
import { removeGuest } from './coopnet.js';
import { biedOver } from './coophostwisselnet.js';
import { setUserWaypoint } from './routing.js';
import { getSettings, setSetting } from './settings.js';
import { PROFIEL_KLEUREN, ONLINE_NAAM_MAX, profielNaam, profielKleur, profielTekst } from './lobby.js';
import { meedoenSchakelaarHtml } from './onlineconsentui.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STIP = { ok: 'cs-stip-ok', lag: 'cs-stip-lag', lost: 'cs-stip-lost' };
const netStand = (v) => (v === 'lag' || v === 'lost' ? v : 'ok');
// Een sessie van één (#554, coopsolo.js) is geen samen-sessie: geen spelerslijst, geen "1 speler"-badge
// en geen avatar-hint alsof je meedoet. In een echte sessie verandert er niets.
const echteSessie = (world) => !!(world && world.coopNet && !isSoloHost(world));

function rijHtml(r, acties, rol = null, bevestig = null) {
  const eruit = acties && kanEruitZetten(rol, r) ? `<button type="button" class="m-bg cs-eruit" data-eruit="${r.slot}">${eruitKnopTekst(bevestig === r.slot)}</button>` : '';
  const geef = acties && kanOverdragen(rol, r) ? `<button type="button" class="m-bg cs-naar" data-geef="${r.slot}">${overdragenKnopTekst}</button>` : '';
  const naar = acties && !r.jij && r.x != null ? `<button type="button" class="m-bg cs-naar" data-naar="${r.slot}">Ga erheen</button>` : '';
  // de groep (#492): "leidt <label>" bij de leider, de groepsnaam bij de andere deelnemers, niets bij wie niet meedoet
  const groep = r.groep ? ` <small class="cs-groep${r.leidt ? ' cs-leidt' : ''}">${esc(r.groep)}</small>` : '';
  const actiesHtml = naar || geef || eruit ? `<span class="cs-acties">${naar}${geef}${eruit}</span>` : '';
  // #903: de speler is een kaart met een avatar in zijn eigen kleur en vorm, wat die doet en hoe de
  // verbinding is. Kleur is nooit het enige signaal: de vorm en het woord staan ernaast.
  return `<li class="cs-rij" data-slot="${r.slot}"><span class="cs-avatar" aria-hidden="true"><span class="cs-vorm" style="color:${esc(veiligeKleur(r.kleur))}">${VORM_TEKEN[r.vorm] || '●'}</span></span>` +
    `<span class="cs-naam">${esc(r.naam)}${r.jij ? ' <small class="cs-jij">(jij)</small>' : ''}${groep}</span>` +
    `<span class="cs-doet">${esc(r.doet)}${r.afstandTekst ? `<small>${esc(r.afstandTekst)}</small>` : ''}</span>` +
    `<span class="cs-net" title="Verbinding"><i class="cs-stip ${STIP[netStand(r.verbinding)]}" aria-hidden="true"></i>${esc(r.verbindingTekst)}${r.ms != null ? ` <small>${r.ms} ms</small>` : ''}</span>${actiesHtml}</li>`;
}
// De passieve stand (#447): een knop met uitleg, alleen als de host het kent
function pvpHtml(world) {
  if (!kanPassiefKiezen(world)) return '';
  const passief = passiefStandVan(world);
  return `<div class="cs-pvp"><button type="button" class="m-bg cs-pvp-knop" data-passief="${passief ? '0' : '1'}" aria-pressed="${passief ? 'true' : 'false'}">${passief ? PVP_TEKST.knopAan : PVP_TEKST.knopUit}</button><p>${esc(PVP_TEKST.uitleg)}</p></div>`;
}
const roepHint =() => PING_TOETSEN.map((k) => `<b>${k.toets}</b> ${esc(k.tekst)}`).join(' · ');

const CSS = `
/* De lijst staat buiten het .gm-paneel; deze variabelen komen uit de HUD-tokens. */
#coop-spelers { --ink: var(--hud-fg); --g: var(--gron-green-light); --gd: var(--gron-green); --mut: rgba(240,237,228,0.68); --red: var(--hud-red); --redtx: var(--hud-redtx); }
.cs-lijst { font: 18px "Arial Narrow", Arial, sans-serif; color: var(--ink); list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.cs-rij { display: grid; grid-template-columns: 44px minmax(110px, auto) minmax(0, 1fr) auto; gap: 3px 12px; align-items: center; padding: 8px 12px; border-radius: 10px; background: rgba(240,237,228,0.05); box-shadow: inset 0 0 0 1px rgba(240,237,228,0.1); }
.cs-avatar { grid-row: 1 / span 2; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(63,201,122,0.1); box-shadow: inset 0 0 0 1.5px rgba(63,201,122,0.35); }
.cs-vorm { font-size: 22px; line-height: 1; text-align: center; }
.cs-naam { font-weight: bold; } .cs-naam small, .cs-net small { font-weight: normal; opacity: 0.7; }
.cs-naam .cs-jij { color: var(--g); }
.cs-doet { display: flex; flex-direction: column; gap: 1px; opacity: 0.9; }
.cs-doet small { font-size: 15px; opacity: 0.7; }
.cs-groep { display: inline-block; padding: 0 5px; border-radius: 3px; background: rgba(240,237,228,0.14); }
.cs-naam .cs-groep { opacity: 0.9; }
.cs-naam .cs-groep.cs-leidt { background: rgba(63,201,122,0.28); opacity: 1; }
.cs-net { white-space: nowrap; opacity: 0.9; } .cs-net i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
.cs-stip-ok { background: var(--g); } .cs-stip-lag { background: var(--mut); } .cs-stip-lost { background: var(--red); }
.cs-acties { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
/* #636: dezelfde lijst ook op aanraking (44 px-knop), zonder muis of Tab */
.cs-open { position: fixed; right: max(14px, env(safe-area-inset-right, 0px)); bottom: max(96px, calc(env(safe-area-inset-bottom, 0px) + 96px)); z-index: 701; display: grid; place-items: center; min-width: 44px; min-height: 44px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--hud-card, rgba(12,20,14,0.9)); color: var(--hud-fg, var(--ink)); box-shadow: var(--hud-card-ring, 0 0 0 1px var(--line2, rgba(240,237,228,0.2))); font: 600 15px "Arial Narrow", Arial, sans-serif; cursor: pointer; }
.cs-open[aria-expanded="true"] { background: var(--g); color: var(--hud-panel-ink, var(--gd)); }
.cs-open:hover, .cs-open:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.cs-eruit { justify-self: start; margin: 0; padding: 3px 10px; border: 0; border-radius: 4px; background: rgba(217,63,63,0.28); color: inherit; font: inherit; cursor: pointer; }
.cs-naar { justify-self: start; margin: 0; padding: 3px 10px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: inherit; font: inherit; cursor: pointer; }
.cs-naar:hover, .cs-naar:focus-visible { background: rgba(63,201,122,0.35); outline: none; }
#coop-spelers { position: fixed; left: 50%; top: 104px; transform: translateX(-50%); z-index: 700; box-sizing: border-box; width: min(560px, 62vw); max-height: calc(100vh - 124px); overflow: hidden; padding: 12px 16px 10px; background: rgba(12,20,14,0.88); color: var(--ink); border-radius: 8px; box-shadow: 0 0 0 1px rgba(240,237,228,0.14); pointer-events: none; }
/* #873: de lijst zelf scrolt (de overlay kapte hem af) en alleen de lijst vangt de muis,
   zodat de rest van het scherm doorklikbaar blijft naar het spel. */
#coop-spelers .cs-lijst { max-height: calc(100vh - 204px); overflow-y: auto; overscroll-behavior: contain; pointer-events: auto; scrollbar-width: thin; scrollbar-color: rgba(240,237,228,0.32) transparent; padding-right: 4px; }
#coop-spelers .cs-lijst::-webkit-scrollbar { width: 8px; }
#coop-spelers .cs-lijst::-webkit-scrollbar-thumb { border-radius: 4px; background: rgba(240,237,228,0.32); }
#coop-spelers .cs-lijst::-webkit-scrollbar-track { background: transparent; }
#coop-spelers h3 { margin: 0 0 4px; font: normal 22px "Bebas Neue", "Arial Narrow", Arial, sans-serif; letter-spacing: 0.06em; }
#coop-spelers .cs-voet { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(240,237,228,0.16); font: 14px "Arial Narrow", Arial, sans-serif; opacity: 0.8; }
#coop-spelers .cs-voet b { padding: 0 5px; border-radius: 3px; background: rgba(240,237,228,0.18); }
#coop-spelers .cs-rij { padding: 6px 8px; grid-template-columns: 32px minmax(80px, auto) minmax(0, 1fr) auto; }
#coop-spelers .cs-avatar { width: 32px; height: 32px; }
#coop-spelers .cs-vorm { font-size: 18px; }
.pm-spelers { display: flex; flex-direction: column; gap: 16px; max-width: 952px; padding: 32px 64px 40px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(240,237,228,0.32) transparent; font-family: "Arial Narrow", Arial, sans-serif; color: var(--ink); }
.pm-spelers .cs-lijst { font-size: 22px; gap: 8px; } .pm-spelers .cs-rij { padding: 12px 16px; grid-template-columns: 52px minmax(140px, auto) minmax(0, 1fr) auto; } .pm-spelers .cs-avatar { width: 52px; height: 52px; } .pm-spelers .cs-vorm { font-size: 26px; }
.pm-spelers p { margin: 0; max-width: 680px; font-size: 20px; line-height: 1.35; opacity: 0.85; }
.pm-spelers .cs-kop { display: flex; flex-direction: column; gap: 4px; padding: 16px 20px; border-radius: 12px; background: linear-gradient(180deg, rgba(23,48,31,0.9), rgba(12,20,14,0.86)); box-shadow: inset 0 0 0 1px rgba(240,237,228,0.14); }
.pm-spelers .cs-kop-t { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 36px; line-height: 1; letter-spacing: 0.03em; }
.pm-spelers .cs-kop-leeg .cs-kop-t { color: var(--mut); }
.pm-spelers .cs-sectie { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.pm-spelers .cs-sectie h4 { margin: 0; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-weight: normal; font-size: 24px; letter-spacing: 0.04em; }
.pm-spelers .cs-pvp { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 12px 16px; border-radius: 10px; background: rgba(240,237,228,0.04); box-shadow: inset 0 0 0 1px rgba(240,237,228,0.1); }
.pm-spelers .cs-pvp button { padding: 10px 18px; border: 0; border-radius: 8px; background: rgba(240,237,228,0.18); color: var(--ink); font: bold 20px "Arial Narrow", Arial, sans-serif; cursor: pointer; }
.pm-spelers .cs-pvp button, .pm-spelers .cs-roep button { min-height: 44px; }
/* #636: de knoppen van het Spelers-paneel op de menu-set (Bebas) in plaats van bold Arial Narrow */
.pm-spelers .cs-pvp button, .pm-spelers .cs-roep button, .pm-spelers .cs-eruit, .pm-spelers .cs-naar {
  font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 24px; letter-spacing: 0.06em; font-weight: normal; }
.pm-spelers .cs-eruit, .pm-spelers .cs-naar { min-height: 44px; padding: 0 14px; }
.pm-spelers .cs-pvp button[aria-pressed="false"] { background: var(--red); color: var(--gd); }
.pm-spelers .cs-pvp button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.pm-spelers .cs-roep { display: flex; flex-wrap: wrap; gap: 10px; }
.pm-spelers .cs-roep button { padding: 10px 18px; border: 0; border-radius: 8px; background: var(--g); color: var(--gd); font: bold 20px "Arial Narrow", Arial, sans-serif; cursor: pointer; }
.pm-spelers .cs-roep button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.cs-profiel { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 12px; background: rgba(240,237,228,0.04); box-shadow: inset 0 0 0 1px rgba(240,237,228,0.1); }
.cs-profiel h4 { margin: 0; font: normal 24px "Bebas Neue", "Arial Narrow", Arial, sans-serif; letter-spacing: 0.04em; }
.cs-profiel p { max-width: 680px; }
.cs-profiel-label { display: flex; gap: 10px; align-items: center; font-size: 20px; }
.cs-profiel-naam { min-width: 0; max-width: 260px; padding: 4px 8px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: var(--ink); font: inherit; }
.cs-kleuren { display: flex; flex-wrap: wrap; gap: 6px; }
.cs-kleuren button { padding: 4px 10px; border: 0; border-radius: 4px; background: rgba(240,237,228,0.14); color: var(--ink); font: inherit; cursor: pointer; }
.cs-kleuren button[aria-pressed="true"] { background: rgba(63,201,122,0.4); }
.cs-kleuren button:focus-visible, .cs-profiel-naam:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.cs-profiel-fout { color: var(--redtx); }
.cs-profiel-hint { font-size: 16px; opacity: 0.75; }
/* #873: de Spelers-lijst in het pauzemenu op een smal scherm: minder kolommen, de
   netstatus onder de naam en kortere actieknoppen. */
@media (max-width: 760px) {
  .pm-spelers { padding: 12px; }
  .pm-spelers .cs-lijst { font-size: 18px; gap: 6px; }
  .pm-spelers .cs-rij { padding: 4px 0; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 2px 8px; }
  .pm-spelers .cs-doet { font-size: 16px; }
  .pm-spelers .cs-net { grid-column: 2 / -1; justify-self: start; font-size: 14px; }
  .pm-spelers .cs-eruit, .pm-spelers .cs-naar { min-height: 38px; font-size: 20px; padding: 0 10px; }
}
/* #873: op smalle schermen is er geen breedte voor vier kolommen: de netstatus zakt
   onder de naam en de avatar wordt smaller. */
@media (max-width: 520px) {
  #coop-spelers { width: calc(100vw - 16px); }
  #coop-spelers .cs-rij { grid-template-columns: 28px minmax(0, 1fr) auto; gap: 2px 8px; padding: 4px 0; }
  #coop-spelers .cs-doet { font-size: 14px; }
  #coop-spelers .cs-net { grid-column: 2 / -1; justify-self: start; font-size: 13px; }
}
/* #873: op een lage viewport (telefoon op zijn kant) is elke rij kostbaar: compacte
   kop, rijen en geen voet; de lijst houdt een zichtbare scrollbalk. */
@media (max-height: 460px) {
  #coop-spelers { top: 48px; max-height: calc(100vh - 56px); padding: 8px 12px 6px; }
  #coop-spelers h3 { font-size: 18px; margin-bottom: 2px; }
  #coop-spelers .cs-lijst { max-height: calc(100vh - 108px); font-size: 14px; }
  #coop-spelers .cs-rij { padding: 2px 0; }
  #coop-spelers .cs-voet { display: none; }
  .pm-spelers { padding: 10px 14px 14px; }
  .pm-spelers .cs-lijst { font-size: 18px; }
  .pm-spelers .cs-rij { padding: 3px 0; grid-template-columns: 24px minmax(90px, auto) 1fr auto; }
  .pm-spelers .cs-eruit, .pm-spelers .cs-naar { min-height: 34px; font-size: 19px; padding: 0 10px; margin-bottom: 2px; }
}
`;
let stijl = false;
function zorgVoorStijl() {
  if (stijl || typeof document === 'undefined') return;
  stijl = true;
  const el = document.createElement('style'); el.id = 'style-coopspelers'; el.textContent = CSS; document.head.appendChild(el);
}

// ---- de lijst bij Tab (elke frame vanuit main.js via coophud.js) en op aanraking (#636)
let overlay = null, laatste = '', knop = null, vast = false;
function zorgVoorKnop(world, zichtbaar, aantal = 0) {
  if (typeof document === 'undefined') return;
  if (!zichtbaar) { if (knop) knop.style.display = 'none'; return; }
  zorgVoorStijl();
  if (!knop) {
    knop = document.createElement('button');
    knop.type = 'button'; knop.id = 'coop-spelers-knop'; knop.className = 'cs-open';
    knop.setAttribute('aria-controls', 'coop-spelers');
    knop.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); vast = !vast; updateSpelersOverlay(world); });
    document.body.appendChild(knop);
  }
  // #971: een grijze knop met alleen "Spelers" zei niet wat hij deed. Nu staat er
  // "Spelerslijst" (met het aantal) en leggen title en aria-label de knop uit.
  knop.textContent = spelersKnopTekst(aantal);
  knop.title = SPELERS_KNOP.title;
  knop.setAttribute('aria-label', `${SPELERS_KNOP.title}${aantal ? `, ${aantal} spelers` : ''}`);
  knop.style.display = '';
  knop.setAttribute('aria-expanded', vast ? 'true' : 'false');
}
export function updateSpelersOverlay(world) {
  if (typeof document === 'undefined') return;
  const rijen = echteSessie(world) && world.coopSpelers;
  const menu = document.getElementById('pause-menu');
  const film = document.body.classList.contains('cine-hide-hud'); // een filmpje verbergt de HUD, dus ook de lijst
  const vrij = !world.paused && !(menu && menu.classList.contains('visible')) && !film;
  zorgVoorKnop(world, !!rijen && rijen.length && vrij, rijen ? rijen.length : 0);
  const toon = !!(rijen && rijen.length && vrij && ((world.input && world.input.isDown && world.input.isDown('tab')) || vast)); // Tab of de 44px-knop op aanraking/controller
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
    meedoenSchakelaarHtml(s) +
    (profielFout ? `<p class="cs-profiel-fout" role="alert">${esc(profielFout)}</p>` : '') +
    `<p class="cs-profiel-hint">Je staat standaard op passief: medespelers kunnen je geen schade doen, en alleen als jij en de ander die stand allebei uitzetten, kunnen jullie elkaar raken. ${echteSessie(world) ? 'Je nieuwe naam en kleur gelden zodra je opnieuw meedoet.' : 'Het spel bewaart je naam en kleur op dit apparaat.'}</p></div>`;
}
export function renderSpelersPanel(root, world, sluit = () => {}, opts = {}) {
  if (!root) return;
  zorgVoorStijl();
  root.classList.add('pm-spelers');
  const teken = () => {
    if (!root.isConnected || root.closest('[hidden]')) { if (timer) { clearInterval(timer); timer = null; } return; }
    const rijen = (echteSessie(world) && world.coopSpelers) || [];
    const schermNaam = root.querySelector('.cs-profiel-naam');
    const zittend = root.contains(document.activeElement) && document.activeElement.matches('button, input');
    const rol = echteSessie(world) && world.coopNet.role;
    const prof = getSettings();
    const key = JSON.stringify([bevestig, kanPassiefKiezen(world), passiefStandVan(world), prof.onlineNaam, prof.onlineKleur, prof.onlineMeedoen, profielFout, ...rijen.map((r) => [r.slot, r.doet, r.verbinding, r.ms, r.afstandTekst, r.passief, r.pvpInSpel, r.groep, r.leidt])]);
    if (root.dataset.key === key && root.dataset.klaar) return;
    if (zittend && root.dataset.klaar) return; // de focus op een knop of in het naamveld blijft staan
    const naamInvoer = schermNaam && document.activeElement === schermNaam ? schermNaam.value : prof.onlineNaam;
    root.dataset.key = key; root.dataset.klaar = '1';
    const kop = rijen.length
      ? `<div class="cs-kop"><span class="m-eb">Samen in Grunn</span><b class="cs-kop-t">${rijen.length} ${rijen.length === 1 ? 'speler' : 'spelers'} in deze sessie</b><p>De wereld en de tijd zijn samen van de groep; je geld, spullen en voortgang blijven van jou. Alleen de speler bij wie de sessie draait, kan iemand eruit zetten.</p></div>`
      : `<div class="cs-kop cs-kop-leeg"><span class="m-eb">Samen spelen</span><b class="cs-kop-t">Je speelt nu alleen</b><p>Nodig iemand uit op het tabblad Samen spelen. Je eigen verhaal en je spullen blijven van jou.</p></div>`;
    root.innerHTML = kop + (rijen.length
      ? `<ul class="cs-lijst">${rijen.map((r) => rijHtml(r, true, rol, bevestig)).join('')}</ul>` +
        pvpHtml(world) +
        `<div class="cs-sectie"><h4>Roepen en route</h4><p>Roepen kan ook in het spel: ${roepHint()}. Iemand uitnodigen doe je op het tabblad Samen spelen.</p>` +
        `<div class="cs-roep">${PING_TOETSEN.map((k) => `<button type="button" class="m-bp cs-roep-knop" data-ping="${k.soort}">${esc(k.tekst)} <small>(${k.toets})</small></button>`).join('')}</div></div>`
      : '') +
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
      if (p && hoofdspeler(world)) { if (pingGebaar(world, p.getAttribute('data-ping'))) sluit(); return; }
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

