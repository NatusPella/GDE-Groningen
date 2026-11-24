import { hoofdspeler } from './players.js';
import { keepFocus } from './focusbehoud.js';
import { setVisibleInterval } from './visibletimer.js';
import { icoon } from './icons.js';
import { tabRegel, versieRegel, hintStand, hintTekst, volgHint } from './playerstatus.js';
import { esc } from './samenspelers.js';
// de sneltoetsen op een gekozen speler (was playercards.js): M dempt, B blokkeert, X zet eruit (met bevestiging)
const CARD_KEYS = { gedempt: 'M', geblokkeerd: 'B', eruit: 'X' };
const leegKop = '<div class="cs-kop cs-kop-leeg"><b class="cs-kop-t">Je speelt nu alleen</b><p class="cs-kop-regel">Nodig iemand uit op het tabblad Uitnodigen.</p></div>';
import { gateOn } from './coopgate.js';
import { VERSION } from './version.js';
import { keyTextHtml } from './keycap.js';
// Samen spelen (#95, #377, #434): de spelerslijst in beeld. Twee plekken, nooit permanent: een compacte lijst boven in het scherm zolang je
// Tab ingedrukt houdt (of met de 44px-knop op aanraking), en het tabblad Spelers onder Spel > Samen spelen (alleen in een sessie) met dezelfde gegevens en de roepjes.
// In het pauzemenu stel je ook je online-avatar in (#455): de naam en kleur die anderen van je zien.
// De gegevens komen uit world.coopSpelers (coopnet.js, gebouwd met coopspelers.js, getest); dit bestand is alleen DOM.
// Niet door een mens in beeld bekeken.
import { pingGebaar, zetPassiefGebaar, kanPassiefKiezen, passiefStandVan, setPlayerMuteState, playerMuteState } from './coopnet.js';
import { isSoloHost } from './coopsolo.js';
import { PVP_TEKST } from './cooppvp.js';
import { PING_TOETSEN } from './coopping.js';
import { VORM_TEKEN, kanEruitZetten, kanOverdragen, overdragenKnopTekst, eruitKnopTekst, eruitGezetTekst, veiligeKleur, SPELERS_KNOP } from './coopspelers.js';
import { removeGuest } from './coopnet.js';
import { biedOver } from './coophostwisselnet.js';
import { setUserWaypoint } from './routing.js';
import { getSettings, setSetting } from './settings.js';
import { PROFIEL_KLEUREN, ONLINE_NAAM_MAX, profielNaam, profielKleur, profielTekst } from './lobby.js';
import { meedoenSchakelaarHtml } from './onlineconsentui.js';
import { oskKnop } from './oskview.js';
import { signaalHtml, tabelHtml, detailHtml, jijStrookHtml, aandachtRegels, aandachtHtml, wachtkamerVoetHtml } from './samenspelers.js';
import { toonBevestiging } from './spelbevestig.js';
import { startKnop, magStarten } from './playerstatus.js';

const netStand = (v) => (v === 'lag' || v === 'lost' ? v : 'ok');
// Een sessie van één (#554, coopsolo.js) is geen samen-sessie: geen spelerslijst, geen "1 speler"-badge
// en geen avatar-hint alsof je meedoet. In een echte sessie verandert er niets.
const echteSessie = (world) => !!(world && world.coopNet && !isSoloHost(world));

// dempen en blokkeren (#1159): per speler, alleen in het geheugen en op naam; de wereld waarvoor de lijst getekend wordt staat in muteWorld
let muteWorld = null;
const muteWord = (slot) => { const st = muteWorld ? playerMuteState(muteWorld, slot) : 'gewoon'; return st === 'gewoon' ? '' : `<small class="cs-tab-actief">${esc(st)}</small>`; };
// De tabel en het detail van Spelers komen uit samenspelers.js (puur, gemeten in scripts/ui/multiplayerflow_meet.mjs)
// De compacte regel van de Tab-lijst in het spel: naam, kleur, ping, afstand en richting, klaar (playerstatus.js tabRegel)
function tabRijHtml(r, ctx = {}) {
  const t = tabRegel(r, ctx);
  const klaar = t.klaar === null ? '' : `<span class="cs-tab-klaar">${icoon(t.klaar ? 'vinkje' : 'zandloper', { maat: 's' })}${t.klaar ? 'Klaar' : 'Weg'}</span>`;
  return `<li class="cs-tabrij${t.verbinding === 'lost' ? ' cs-rij-weg' : ''}" data-slot="${t.slot}"><span class="cs-vorm" style="color:${esc(veiligeKleur(t.kleur))}" aria-hidden="true">${VORM_TEKEN[t.vorm] || '●'}</span>` +
    `<span class="cs-tab-naam">${esc(t.naam)}${t.jij ? ' <small class="cs-jij">(jij)</small>' : ''}${t.passief === false ? ' <small class="cs-tab-actief">actief</small>' : ''}</span>` +
    `<span class="cs-tab-ping">${signaalHtml(r.niveau || (t.verbinding === 'lost' ? 'weg' : t.verbinding === 'lag' ? 'slecht' : 'goed'))}</span>` +
    `<span class="cs-tab-afstand"${t.afstandWoord ? ` title="${esc(t.afstandWoord)}"` : ''}>${esc(t.afstand)}</span>${klaar}` +
    `<span class="cs-tab-later">${t.jij ? '' : muteWord(t.slot)}</span></li>`;
}
const roepHint =() => PING_TOETSEN.map((k) => `<b>${k.toets}</b> ${esc(k.tekst)}`).join(' · ');

const CSS = `
/* Zeefdruk (#1001): alleen ds-tokens en de .ds-z-* stijl; de identiteitskleur van een speler komt als inline color (data) en de vorm staat er altijd naast.
   De lijst staat buiten het .gm-paneel en gebruikt dus de papiertokens, niet de glasvariabelen. */
#coop-spelers, .pm-spelers { color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-tekst); }
.cs-lijst { font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-body); color: var(--ds-zeef-tx); list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--ds-s-2); }
.cs-rij { display: grid; grid-template-columns: var(--ds-s-7) minmax(110px, auto) minmax(0, 1fr) auto; gap: var(--ds-s-1) var(--ds-s-3); align-items: center; padding: var(--ds-s-2) var(--ds-s-3); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); }
.cs-avatar { grid-row: 1 / span 2; display: grid; place-items: center; width: var(--ds-s-7); height: var(--ds-s-7); border-radius: var(--ds-r-pil); background: var(--ds-c-ink-inkt); }
.cs-vorm { font-size: var(--ds-t-subkop); line-height: 1; text-align: center; }
.cs-naam { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); letter-spacing: var(--ds-ls-label); }
.cs-naam small, .cs-net small, .cs-doet small { font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-hulp); font-weight: 400; letter-spacing: 0; }
.cs-naam .cs-jij { color: var(--ds-c-groen-tx); }
.cs-doet { display: flex; flex-direction: column; gap: 1px; }
.cs-groep { display: inline-block; padding: 0 var(--ds-s-2); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil); background: var(--ds-zeef-bg); }
.cs-naam .cs-groep.cs-leidt { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-bord); }
.cs-acties { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: var(--ds-s-2); }
/* #636: dezelfde lijst ook op aanraking (44 px-knop), zonder muis of Tab */
/* De hint (geen knop): kleine chip met het Tab-toetsicoon en "Spelers · n"; na een tijd alleen pictogram en aantal. Klikbaar (cs-klik) alleen als de muis vrij is. */
.cs-hint { position: fixed; left: max(14px, env(safe-area-inset-left, 0px)); bottom: max(96px, calc(env(safe-area-inset-bottom, 0px) + 96px)); z-index: 701; display: inline-flex; align-items: center; gap: var(--ds-s-2); padding: 0 var(--ds-s-3); min-height: var(--ds-s-6); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-hulp); line-height: 1; opacity: .92; pointer-events: none; cursor: default; transition: opacity var(--ds-m-max) ease; }
/* boven de minimap links: rechtsonder staan de snelheidsmeter, de voertuignaam en de toetshints (uitstappen, E, M) */
.cs-hint.cs-in-hud { position: absolute; right: auto; left: var(--hud-edge, 14px); bottom: calc(var(--mm-bottom, 14px) + var(--mm-size, 160px) + 8px); }
.cs-hint.cs-dim { opacity: .55; padding: 0 var(--ds-s-2); }
.cs-hint .ic { width: 1.1em; height: 1.1em; }
.cs-hint-toets { display: inline-flex; }
.cs-hint.cs-klik { pointer-events: auto; cursor: pointer; min-height: var(--ds-doel-aanraken); min-width: var(--ds-doel-aanraken); justify-content: center; padding: 0 var(--ds-s-4); opacity: 1; }
.cs-hint.cs-klik[aria-expanded="true"] { background: var(--ds-zeef-primair); }
.cs-hint.cs-klik:hover { background: var(--ds-c-sel-vlak); }
.cs-hint:focus-visible, .pm-spelers :is(button, input):focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
.cs-eruit, .cs-naar, .pm-spelers .cs-pvp button, .pm-spelers .cs-roep button, .cs-kleuren button { display: inline-flex; align-items: center; justify-content: center; gap: var(--ds-s-2); justify-self: start; margin: 0; min-height: var(--ds-doel-aanraken); padding: var(--ds-s-2) var(--ds-s-4); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); box-shadow: var(--ds-schaduw-hard-klein); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-label); letter-spacing: var(--ds-ls-label); cursor: pointer; }
.cs-naar:hover, .cs-naar:focus-visible, .pm-spelers .cs-roep button:hover { background: var(--ds-c-sel-vlak); }
.cs-eruit { border-color: var(--ds-c-rood); color: var(--ds-c-rood-tx); box-shadow: var(--ds-schaduw-hard-roze); }
#coop-spelers { position: fixed; left: 50%; top: 104px; transform: translateX(-50%); z-index: 700; box-sizing: border-box; width: min(560px, 62vw); max-height: calc(100vh - 124px); overflow: hidden; padding: var(--ds-s-3) var(--ds-s-4); background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); pointer-events: none; }
/* #873: de lijst zelf scrolt (de overlay kapte hem af) en alleen de lijst vangt de muis,
   zodat de rest van het scherm doorklikbaar blijft naar het spel. */
#coop-spelers .cs-lijst { max-height: calc(100vh - 204px); overflow-y: auto; overscroll-behavior: contain; pointer-events: auto; scrollbar-width: thin; scrollbar-color: var(--ds-scroll-duim) var(--ds-scroll-spoor); padding-right: var(--ds-s-1); }
#coop-spelers .cs-lijst::-webkit-scrollbar { width: 8px; }
#coop-spelers .cs-lijst::-webkit-scrollbar-thumb { background: var(--ds-scroll-duim); border: 2px solid var(--ds-scroll-spoor); border-radius: var(--ds-scroll-rond); }
#coop-spelers .cs-lijst::-webkit-scrollbar-track { background: var(--ds-scroll-spoor); }
#coop-spelers h3 { margin: 0 0 var(--ds-s-1); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-label); }
#coop-spelers .cs-voet { margin-top: var(--ds-s-2); padding-top: var(--ds-s-2); border-top: var(--ds-lijn-dik) dashed var(--ds-c-ink-inkt); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-hulp); }
#coop-spelers .cs-voet b { padding: 0 var(--ds-s-2); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-toets); background: var(--ds-zeef-bg); }
#coop-spelers .cs-rij { padding: var(--ds-s-2); grid-template-columns: var(--ds-s-6) minmax(80px, auto) minmax(0, 1fr) auto; }
#coop-spelers .cs-avatar { width: var(--ds-s-6); height: var(--ds-s-6); }
#coop-spelers .cs-vorm { font-size: var(--ds-t-body); }
.pm-spelers { display: flex; flex-direction: column; gap: var(--ds-s-4); max-width: 952px; padding: var(--ds-s-6) var(--ds-s-8) var(--ds-s-7); overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--ds-scroll-duim) var(--ds-scroll-spoor); }
.pm-spelers .cs-kop, .pm-spelers .cs-pvp, .cs-profiel { display: flex; flex-direction: column; gap: var(--ds-s-2); padding: var(--ds-s-4); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); }
.pm-spelers .cs-pvp { align-items: flex-start; }
.pm-spelers .cs-kop-t, .pm-spelers .cs-sectie h4, .cs-profiel h4 { margin: 0; font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-subkop); line-height: var(--ds-lh-kop); letter-spacing: var(--ds-ls-label); }
.pm-spelers .cs-kop-t { font-size: var(--ds-t-kop); }
.pm-spelers .cs-kop-leeg .cs-kop-t { color: var(--ds-tx-zacht); }
.pm-spelers .cs-sectie { display: flex; flex-direction: column; gap: var(--ds-s-2); padding-top: var(--ds-s-1); }
.pm-spelers .cs-lijst { gap: var(--ds-s-2); }
.pm-spelers .cs-rij { padding: var(--ds-s-2) var(--ds-s-3); grid-template-columns: var(--ds-s-7) minmax(140px, auto) minmax(0, 1fr) auto; }
.pm-spelers p, .cs-profiel p { margin: 0; max-width: 680px; font-size: var(--ds-t-body); line-height: var(--ds-lh-tekst); }
/* Passief is de gewone stand (groen met vinkje); actief is de bewuste, riskante keuze (rood met een woord) */
.pm-spelers .cs-pvp button[aria-pressed="false"] { background: var(--ds-c-rood-vlak); border-color: var(--ds-c-rood); color: var(--ds-c-rood-tx); box-shadow: var(--ds-schaduw-hard-roze); }
.pm-spelers .cs-pvp button[aria-pressed="true"], .cs-kleuren button[aria-pressed="true"] { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-bord); }
.cs-kleuren button[aria-pressed="true"]::after { content: "\\2713"; }
.pm-spelers .cs-roep { display: flex; flex-wrap: wrap; gap: var(--ds-s-3); }
.cs-profiel-label { display: flex; gap: var(--ds-s-3); align-items: center; font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-label); letter-spacing: var(--ds-ls-label); }
.cs-profiel-naam { min-width: 0; min-height: var(--ds-doel-aanraken); max-width: 260px; padding: 0 var(--ds-s-3); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); font-family: var(--ds-font-zeef-tekst); font-size: var(--ds-t-body); }
.cs-kleuren { display: flex; flex-wrap: wrap; gap: var(--ds-s-2); }
.cs-profiel-fout { color: var(--ds-c-rood-tx); }
.cs-profiel-hint { font-size: var(--ds-t-hulp); }
/* #873: de Spelers-lijst in het pauzemenu op een smal scherm: minder kolommen, de
   netstatus onder de naam en kortere actieknoppen. */
@media (max-width: 760px) {
  .pm-spelers { padding: var(--ds-s-3); }
  .pm-spelers .cs-lijst { gap: var(--ds-s-2); }
  .pm-spelers .cs-rij { grid-template-columns: var(--ds-s-6) minmax(0, 1fr) auto; gap: 2px var(--ds-s-2); }
}
/* #873: op smalle schermen is er geen breedte voor vier kolommen: de netstatus zakt
   onder de naam en de avatar wordt smaller. */
@media (max-width: 520px) {
  #coop-spelers { width: calc(100vw - var(--ds-s-4)); }
  #coop-spelers .cs-rij { grid-template-columns: var(--ds-s-6) minmax(0, 1fr) auto; gap: 2px var(--ds-s-2); }
}
/* #873: op een lage viewport (telefoon op zijn kant) is elke rij kostbaar: compacte
   kop, rijen en geen voet; de lijst houdt een zichtbare scrollbalk. */
@media (max-height: 460px) {
  #coop-spelers { top: 48px; max-height: calc(100vh - 56px); padding: var(--ds-s-2) var(--ds-s-3); }
  #coop-spelers h3 { margin-bottom: 2px; }
  #coop-spelers .cs-lijst { max-height: calc(100vh - 108px); }
  #coop-spelers .cs-rij { padding: 2px var(--ds-s-2); }
  #coop-spelers .cs-voet { display: none; }
  .pm-spelers { padding: var(--ds-s-3); }
  .pm-spelers .cs-rij { padding: 3px var(--ds-s-2); }
}
/* Spelersmenu 21-11: status als woorden met een icoon, de compacte Tab-lijst, dempen en blokkeren (later) */
.cs-rij { grid-template-columns: var(--ds-s-7) minmax(0, 1fr) auto; }
.cs-rij .cs-status { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: var(--ds-s-2); }
.cs-rij .cs-doet { grid-column: 2 / -1; flex-direction: row; flex-wrap: wrap; align-items: baseline; gap: var(--ds-s-2); }
.cs-rij .cs-acties { grid-column: 2 / -1; align-items: center; }
.pm-spelers .cs-rij, #coop-spelers .cs-rij { grid-template-columns: var(--ds-s-7) minmax(0, 1fr) auto; }
.cs-rij-weg { opacity: .8; border-style: dashed; }
.cs-chip { display: inline-flex; align-items: center; gap: var(--ds-s-1); padding: 0 var(--ds-s-2); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil); background: var(--ds-zeef-bg); font-size: var(--ds-t-hulp); white-space: nowrap; }
.cs-chip .ic { width: 1em; height: 1em; }
.cs-chip--goed { background: var(--ds-c-sel-vlak); }
.cs-chip--let-op { border-color: var(--ds-c-geel); border-style: dashed; }
.cs-chip--slecht { border-color: var(--ds-c-rood); color: var(--ds-c-rood-tx); border-style: dotted; }
.cs-vraag { font-weight: 800; color: var(--ds-c-rood-tx); align-self: center; }
.cs-stand { display: inline-flex; align-items: center; gap: var(--ds-s-2); min-height: var(--ds-doel-aanraken); padding: 0 var(--ds-s-3); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: var(--ds-zeef-bg); color: var(--ds-zeef-tx); font-size: var(--ds-t-hulp); cursor: pointer; }
.cs-stand:hover, .cs-stand:focus-visible { background: var(--ds-c-sel-vlak); }
.cs-stand[aria-pressed="true"] { background: var(--ds-c-sel-vlak); border-color: var(--ds-c-ink-bord); font-weight: 800; }
.cs-stand .ic { width: 1.1em; height: 1.1em; }
.cs-laterrij { display: inline-flex; gap: var(--ds-s-1); margin-left: auto; }
.cs-later { display: inline-grid; place-items: center; width: var(--ds-doel-aanraken); min-height: var(--ds-doel-aanraken); padding: 0; border: var(--ds-lijn) dashed var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: transparent; color: var(--ds-tx-zacht); cursor: not-allowed; opacity: .6; }
.pm-spelers .cs-kop-klein { font-size: var(--ds-t-hulp); color: var(--ds-tx-zacht); }
#coop-spelers h3 small { font-family: var(--ds-font-zeef-tekst); font-weight: 400; font-size: var(--ds-t-hulp); }
#coop-spelers .cs-tabrij { display: grid; grid-template-columns: var(--ds-s-5) minmax(90px, 1fr) auto auto auto auto; gap: var(--ds-s-3); align-items: center; padding: var(--ds-s-1) var(--ds-s-2); background: var(--ds-zeef-bg); border: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); font-size: var(--ds-t-hulp); }
#coop-spelers .cs-tabrij .cs-vorm { font-size: var(--ds-t-subkop); }
#coop-spelers .cs-tab-naam { font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-body); letter-spacing: var(--ds-ls-label); }
#coop-spelers .cs-tab-ping, #coop-spelers .cs-tab-klaar { display: inline-flex; align-items: center; gap: var(--ds-s-1); white-space: nowrap; }
#coop-spelers .cs-tab-ping .ic, #coop-spelers .cs-tab-klaar .ic { width: 1.1em; height: 1.1em; }
#coop-spelers .cs-net-lost { color: var(--ds-c-rood-tx); }
#coop-spelers .cs-tab-afstand { min-width: 5.5em; text-align: right; white-space: nowrap; }
#coop-spelers .cs-tab-later { display: inline-flex; gap: var(--ds-s-1); }
#coop-spelers .cs-later { width: var(--ds-s-6); min-height: var(--ds-s-6); }
/* #1011: dempen en blokkeren als pictogrammen (tooltip en toets), de uitleg achter Meer info, kaartjes met focus */
.cs-stand--icoon { width: var(--ds-doel-aanraken); padding: 0; justify-content: center; }
.cs-rij:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
.pm-spelers .cs-kop:not(.cs-kop-leeg) { flex-direction: row; flex-wrap: wrap; align-items: center; gap: var(--ds-s-1) var(--ds-s-4); }
.pm-spelers .cs-kop:not(.cs-kop-leeg) .cs-kop-t { font-size: var(--ds-t-subkop); }
.pm-spelers .cs-kop-regel { font-size: var(--ds-t-body); }
.pm-spelers .cs-kop .cs-info { flex: none; }
.cs-info { display: block; }
.cs-info > summary { cursor: pointer; min-height: var(--ds-doel-aanraken); font-family: var(--ds-font-zeef-kop); font-weight: 800; font-size: var(--ds-t-label); letter-spacing: var(--ds-ls-label); }
.cs-info > summary:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
.cs-info > p { font-size: var(--ds-t-hulp); }
`;
let stijl = false;
function zorgVoorStijl() {
  if (stijl || typeof document === 'undefined') return;
  stijl = true;
  const el = document.createElement('style'); el.id = 'style-coopspelers'; el.textContent = CSS; document.head.appendChild(el);
}

// ---- de lijst bij Tab (elke frame vanuit main.js via coophud.js) en op aanraking (#636)
let overlay = null, laatste = '', knop = null, vast = false, hintVolg = null, hintKey = '', viaKlik = false;
// De hint rechtsonder (geen knop): in het spel is de muis vergrendeld en doet een klik niets, de lijst opent met Tab (of de
// controllerknop). Is de muis vrij (menu, kaart, aanraken) of staat de lijst open, dan is hij wel klikbaar (playerstatus.js hintStand).
function zorgVoorKnop(world, zichtbaar, aantal = 0) {
  if (typeof document === 'undefined') return;
  if (!zichtbaar) { if (knop) knop.style.display = 'none'; hintVolg = null; return; }
  zorgVoorStijl();
  const nu = Date.now();
  hintVolg = volgHint(hintVolg, aantal, nu);
  const h = hintStand({ aantal, sinds: hintVolg.sinds, nu, vergrendeld: !!document.pointerLockElement, open: vast });
  if (!knop) {
    knop = document.createElement('div');
    knop.id = 'coop-spelers-knop'; knop.className = 'cs-hint';
    knop.addEventListener('click', (e) => { if (!knop.classList.contains('cs-klik')) return; e.preventDefault(); e.stopPropagation(); vast = !vast; viaKlik = vast; updateSpelersOverlay(world); });
    knop.addEventListener('keydown', (e) => { if (knop.classList.contains('cs-klik') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); knop.click(); } });
    const hud = document.getElementById('hud');
    (hud || document.body).appendChild(knop);
    if (hud) knop.classList.add('cs-in-hud');
  }
  const key = [h.stand, h.klikbaar, aantal, vast].join('|');
  if (key !== hintKey) { // alleen bij een verandering opnieuw tekenen: de HUD tikt elke frame
    hintKey = key;
    knop.classList.toggle('cs-dim', h.stand === 'dim');
    knop.classList.toggle('cs-klik', h.klikbaar);
    knop.innerHTML = h.stand === 'dim'
      ? `${icoon('spelers', { maat: 's' })}<span class="cs-hint-n">${aantal}</span>`
      : `<span class="cs-hint-toets">${keyTextHtml('{TAB}')}</span><span class="cs-hint-t">${esc(hintTekst(aantal))}</span>`;
    if (h.klikbaar) { knop.setAttribute('role', 'button'); knop.tabIndex = 0; knop.setAttribute('aria-controls', 'coop-spelers'); knop.setAttribute('aria-expanded', vast ? 'true' : 'false'); }
    else { knop.setAttribute('role', 'status'); knop.removeAttribute('tabindex'); knop.removeAttribute('aria-controls'); knop.removeAttribute('aria-expanded'); }
    knop.title = SPELERS_KNOP.title;
    knop.setAttribute('aria-label', `${SPELERS_KNOP.title}${aantal ? `, ${aantal} spelers` : ''}`);
  }
  knop.style.display = '';
}
export function updateSpelersOverlay(world) {
  if (typeof document === 'undefined') return;
  muteWorld = world;
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
  if (viaKlik) { viaKlik = false; overlay.tabIndex = -1; try { overlay.focus({ preventScroll: true }); } catch (e) { /* geen focus */ } } // geopend met de muis: de focus gaat mee naar de lijst
  const ctx = { wachtkamer: gateOn() };
  const key = ctx.wachtkamer + rijen.map((r) => `${r.slot}|${r.doet}|${r.verbinding}|${r.ms}|${r.afstandTekst}|${r.richting && r.richting.woord}|${r.naam}|${r.groep}|${r.passief}`).join(';');
  if (key === laatste) return;
  laatste = key;
  overlay.innerHTML = `<h3>Spelers <small>${rijen.length}</small></h3><ul class="cs-lijst cs-tablijst">${rijen.map((r) => tabRijHtml(r, ctx)).join('')}</ul><div class="cs-voet">${keyTextHtml('{TAB}')} lijst · ${roepHint()}</div>`;
}
export const spelersOverlayZichtbaar = () => !!overlay && overlay.style.display !== 'none';

// ---- het onderdeel Spelers in het pauzemenu
let timer = null, bevestig = null, profielFout = '', gekozen = null, startGevraagd = false, startBezig = false; // gekozen: het slot waarvan het detail staat
// Je online-avatar (#455): de naam en kleur die anderen van je zien. Bewaard in de
// gewone instellingen (settings.js), dus per apparaat; de volgende keer dat je
// meedoet gaan ze mee in de kennismaking en ziet iedereen ze bij je figuur.
function profielHtml(world) {
  const s = getSettings();
  const kleur = profielKleur(s.onlineKleur);
  return `<div class="cs-profiel"><h4>Je online-avatar</h4><p>${esc(profielTekst({ naam: s.onlineNaam, kleur }))}</p>` +
    `<label class="cs-profiel-label">Online naam <input type="text" class="cs-profiel-naam" data-osk="naam" data-osk-check="online-naam" data-osk-label="Online naam" maxlength="${ONLINE_NAAM_MAX}" spellcheck="false" autocomplete="off" placeholder="Je figuur" value="${esc(s.onlineNaam)}">${oskKnop('online naam')}</label>` +
    `<div class="cs-kleuren" role="group" aria-label="Kleur">${PROFIEL_KLEUREN.map((c) => `<button type="button" data-kleur="${c.hex}" aria-pressed="${c.hex === kleur}"><span style="color:${c.hex}" aria-hidden="true">●</span> ${esc(c.naam)}</button>`).join('')}</div>` +
    meedoenSchakelaarHtml(s) +
    (profielFout ? `<p class="cs-profiel-fout" role="alert">${esc(profielFout)}</p>` : '') +
    `<details class="cs-info"><summary>Meer info</summary><p>Je speelt lokaal je eigen verhaal (Tammo of Tessa); zo zien de anderen je, ook in deze lijst.</p><p class="cs-profiel-hint">Je staat standaard op passief: medespelers kunnen je geen schade doen, en alleen als jij en de ander die stand allebei uitzetten, kunnen jullie elkaar raken. ${echteSessie(world) ? 'Je nieuwe naam en kleur gelden zodra je opnieuw meedoet.' : 'Het spel bewaart je naam en kleur op dit apparaat.'}</p></details></div>`;
}
export function renderSpelersPanel(root, world, sluit = () => {}, opts = {}) {
  if (!root) return;
  muteWorld = world;
  zorgVoorStijl();
  root.classList.add('pm-spelers');
  const teken = () => {
    if (!root.isConnected || root.closest('[hidden]')) {
      if (timer) { clearInterval(timer); timer = null; }
      // "Zeker weten?" hoort bij deze keer: het paneel ging dicht, dus een volgende opening begint
      // weer op "Eruit zetten". Zonder dit stond de knop later scherp en zette één klik iemand eruit.
      bevestig = null;
      return;
    }
    const rijen = (echteSessie(world) && world.coopSpelers) || [];
    const schermNaam = root.querySelector('.cs-profiel-naam');
    const zittend = root.contains(document.activeElement) && document.activeElement.matches('button, input');
    const rol = echteSessie(world) && world.coopNet.role;
    const prof = getSettings();
    const ctx0 = { wachtkamer: gateOn() };
    const key = JSON.stringify([bevestig, kanPassiefKiezen(world), passiefStandVan(world), prof.onlineNaam, prof.onlineKleur, prof.onlineMeedoen, profielFout, ctx0.wachtkamer, ...rijen.map((r) => [r.slot, r.doet, r.verbinding, r.ms, r.afstandTekst, r.richting && r.richting.woord, r.passief, r.pvpInSpel, r.groep, r.leidt])]);
    if (root.dataset.key === key && root.dataset.klaar) return;
    if (zittend && root.dataset.klaar) return; // de focus op een knop of in het naamveld blijft staan
    const naamInvoer = schermNaam && document.activeElement === schermNaam ? schermNaam.value : prof.onlineNaam;
    root.dataset.key = key; root.dataset.klaar = '1';
    const ctx = { wachtkamer: gateOn() };
    const opener = (rijen.find((r) => r.slot === 0) || {}).naam || 'De ander';
    const kop = leegKop;
    const restore = keepFocus(root); // dempen, blokkeren en de rest tekenen de lijst opnieuw: de focus blijft op dezelfde knop (22-11)
    if (!rijen.some((r) => r.slot === gekozen)) gekozen = (rijen.find((r) => !r.jij) || rijen[0] || {}).slot ?? null; // standaard de eerste andere speler
    const gekozenRij = rijen.find((r) => r.slot === gekozen) || null;
    const muteStaat = (slot) => (muteWorld ? playerMuteState(muteWorld, slot) : 'gewoon');
    root.innerHTML = (rijen.length
      ? aandachtHtml(aandachtRegels(rijen)) +
        `<div class="ss-md"><div class="ss-kol">${tabelHtml(rijen, { sel: gekozen, wachtkamer: ctx.wachtkamer })}${jijStrookHtml({ passief: passiefStandVan(world), kan: kanPassiefKiezen(world), tekstUitleg: PVP_TEKST.uitleg, roep: PING_TOETSEN })}</div>${detailHtml(gekozenRij, { rol, muteStaat, openerNaam: opener })}</div>`
      : kop) +
      (ctx.wachtkamer && rijen.length ? wachtkamerVoetHtml(startKnop({ rol: rol === 'host' ? 'host' : 'gast', spelers: rijen.map((r) => ({ naam: r.naam, verbinding: r.verbinding })), bezig: startBezig, gevraagd: startGevraagd, opener })) : '') +
      profielHtml(world);
    const veld = root.querySelector('.cs-profiel-naam'); if (veld && veld.value !== naamInvoer) veld.value = naamInvoer;
    restore();
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
    root.addEventListener('keydown', (e) => { // #1011: met de focus op een kaartje: M dempt, B blokkeert, X zet eruit (met bevestiging)
      const rij = e.target && e.target.closest ? e.target.closest('.cs-rij[data-slot]') : null;
      if (!rij || e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input, textarea, select'))) return;
      const k = String(e.key || '').toUpperCase();
      const sel = k === CARD_KEYS.gedempt ? '[data-stand="gedempt"]' : k === CARD_KEYS.geblokkeerd ? '[data-stand="geblokkeerd"]' : k === CARD_KEYS.eruit ? '[data-eruit]' : '';
      const knop = sel ? rij.querySelector(sel) : null;
      if (knop) { e.preventDefault(); knop.click(); }
    });
    root.addEventListener('click', (e) => {
      const kk = e.target.closest('[data-kleur]');
      if (kk) { profielFout = ''; setSetting('onlineKleur', profielKleur(kk.getAttribute('data-kleur'))); root.dataset.klaar = ''; teken(); return; }
      const p = e.target.closest('[data-ping]');
      if (p && hoofdspeler(world)) { if (pingGebaar(world, p.getAttribute('data-ping'))) sluit(); return; }
      const kies = e.target.closest('[data-kies]');
      if (kies && !e.target.closest('button, a, input')) { gekozen = +kies.getAttribute('data-kies'); bevestig = null; root.dataset.klaar = ''; teken(); return; }
      const sk = e.target.closest('[data-stand]');
      if (sk) { // segment Gewoon | Gedempt | Geblokkeerd: de keuze zelf, niet een wissel (#1159)
        const slot = +sk.getAttribute('data-slot'), doel = sk.getAttribute('data-stand'), nu = playerMuteState(world, slot);
        if (doel === 'gewoon') { if (nu !== 'gewoon') setPlayerMuteState(world, slot, nu); } else if (nu !== doel) setPlayerMuteState(world, slot, doel);
        root.dataset.klaar = ''; teken(); return;
      } // dempen of blokkeren, een tweede keer terugzetten (#1159)
      const ps = e.target.closest('[data-passief]');
      if (ps) { zetPassiefGebaar(world, ps.getAttribute('data-passief') === '1'); root.dataset.klaar = ''; teken(); return; } // omschakelen met afkoeling; de gast ziet de stand zodra de host antwoordt (#447)
      const st = e.target.closest('[data-start-spel]');
      if (st) { // de wachtkamer: de gele start (wie het spel opende) of Vraag om te starten (een gast, #642)
        const alle = world.coopSpelers || [], isHost = !!(world.coopNet && world.coopNet.role === 'host');
        const knop = startKnop({ rol: isHost ? 'host' : 'gast', spelers: alle.map((r) => ({ naam: r.naam, verbinding: r.verbinding })), bezig: startBezig, gevraagd: startGevraagd, opener: (alle.find((r) => r.slot === 0) || {}).naam || 'de ander' });
        if (magStarten(knop, startBezig) && opts.startSpel) { if (isHost) startBezig = true; else startGevraagd = true; opts.startSpel(); root.dataset.klaar = ''; teken(); }
        return;
      }
      const k = e.target.closest('[data-eruit]');
      if (k) { // Uit het spel zetten (alleen wie het spel opende): wat hij verliest en wat blijft, de veilige keuze eerst, het onomkeerbare vraagt vasthouden (spelbevestig.js, 600 ms)
        const slot = +k.getAttribute('data-eruit'), r = (world.coopSpelers || []).find((x) => x.slot === slot);
        if (!r) return;
        toonBevestiging({
          titel: `${r.naam} uit het spel zetten?`, tekst: 'Hij verlaat de sessie en speelt weer zijn eigen spel.',
          verlies: [{ soort: 'weg', label: 'Hij verliest', tekst: 'de sessie; hij speelt weer zijn eigen spel' }, { soort: 'blijft', label: 'Blijft', tekst: 'zijn geld, zijn voortgang en zijn eigen spel. Hij kan later opnieuw meedoen.' }],
          acties: [{ label: 'Nee, laat hem', soort: 'veilig' }, { label: 'Houd vast om hem uit het spel te zetten', soort: 'gevaar', vasthouden: true }],
        }).then((i) => { if (i === 1 && removeGuest(world, slot) && world.addMessage) world.addMessage(eruitGezetTekst(r), 4); root.dataset.klaar = ''; teken(); });
        return;
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
  timer = setVisibleInterval(teken, 500); // 22-11: niet tekenen terwijl het venster verborgen is
}

