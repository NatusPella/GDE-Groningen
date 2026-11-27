// Shared bits of the Minigames batch 1 (discgolf.js, pitchputt.js,
// skatepark.js, kartbaan.js). Everything fixed in the world is given as
// WGS84 and goes through the shared projection (rdnew.js), never as
// coordinates of an older frame. No THREE here, so the pure rule files and
// their node tests can import it.
import { wgsToWorld } from './rdnew.js';
import { keyTextHtml } from './keycap.js';
import { GOLF_VORM } from './golficons.js';
import { zetContext, contextVan } from './ctxidentiteit.js';
import { STOP_DIRECT, STOP_VRAAG, STOP_BEVESTIG, STOP_DOORGAAN, stopUitkomst } from './stopconventie.js';
import { deviceText } from './touchui.js';

// Scene, banner and card of the running game, set by activities.js: a minigame that imports them
// itself would sit in the big import cycle through scene3d/cinematics/hudcards (#108).
export const gameUi = { getScene: () => null, showBanner: () => {}, showCard: () => {} };

export const geo = (lat, lon) => {
  const [x, y] = wgsToWorld(lat, lon);
  return { x, y };
};

// A local frame: u along `rot` from the origin, v to its left (the maths
// angle runs counter-clockwise on the map).
export function frame(origin, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return {
    origin,
    rot,
    toW: (u, v) => ({ x: origin.x + c * u - s * v, y: origin.y + s * u + c * v }),
    toL: (x, y) => ({ u: (x - origin.x) * c + (y - origin.y) * s, v: -(x - origin.x) * s + (y - origin.y) * c }),
  };
}

// Medal 0..3 for a value against [bronze, silver, gold]; `lower`: smaller is better.
export function medalFrom(value, at, lower = false) {
  let m = 0;
  for (let i = 0; i < at.length; i++) if (lower ? value <= at[i] : value >= at[i]) m = i + 1;
  return m;
}

export function fmtTime(s) {
  if (!Number.isFinite(s)) return '-:--.--';
  // eerst op honderdsten afronden, dan splitsen: 59,999 s is 1:00.00 en nooit 0:60.00
  const cs = Math.max(0, Math.round(s * 100));
  const m = Math.floor(cs / 6000);
  const r = (cs - m * 6000) / 100;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
}

export const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Wind as the shared little struct: speed m/s and the direction it blows to (rad).
export function windText(wind) {
  const sp = wind && Number.isFinite(wind.speed) ? wind.speed : 0;
  const bft = Math.round(Math.sqrt(Math.max(0, sp)) * 1.1);
  return bft < 1 ? 'Windstil' : `Wind ${bft} Bft`;
}

// De windrichting als kompasletter (#616): de richting waar de wind naartoe waait, 0 = noord.
// Zo leest "Wind 3 Bft NO" op de regatta, waar de wind de hele sport bepaalt.
export function windDirection(wind) {
  const labels = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
  const d = Number(wind && wind.dir);
  if (!Number.isFinite(d)) return '';
  const i = Math.round((((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return labels[i];
}

export function newWind(rand = Math.random, max = 5) {
  return { speed: rand() * max, dir: rand() * Math.PI * 2 };
}

// De bordmaat die uit de CSS volgt (#596): zo kan een test 1280x720, 1920x1080 en 390x844 natrekken
// zonder browser. De waarden komen uit de regels in CSS hieronder (zelfde formule, één bron).
export function boardBox(vw, ui = 1) {
  const edge = 46;
  if (!(vw > 0)) return { max: 0, min: 0, mobile: false };
  if (vw <= 480) return { max: Math.max(0, vw - 32), min: 0, mobile: true };
  const basis = Math.min(760, vw / (ui || 1) - 2 * (edge + 310), vw - 32);
  const smal = vw <= 1500 ? vw / (ui || 1) - edge - 372 - 330 : Infinity;
  return { max: Math.max(0, Math.min(basis, smal)), min: 360, mobile: false };
}

// #877/#881: op een korte telefoon (liggend) en op een smalle telefoon (staand)
// is er geen ruime strook voor het les-/minigamebord: daar wordt het één regel.
export function compactBoard(width, height) {
  return (width <= 1000 && height <= 520) || width <= 480;
}

// --- HUD board ----------------------------------------------------------------------------------

// De sfeer van een activiteit (#595, #596): de gedeelde balk is de drager. Bordvorm, sfeernaam en tint
// komen uit de ene sfeertabel; een bord zonder sfeer houdt de neutrale balk.
import { sfeerVan } from './activiteitensfeer.js';

export const CSS = `
#hud .mg-board[hidden] { display: none; }
#hud .mg-board { position: absolute; top: var(--hud-top, 14px); left: 50%; transform: translateX(-50%); box-sizing: border-box; min-width: 360px; max-width: min(760px, calc(100vw / var(--ui, 1) - 2 * max(var(--hud-edge, 46px) + 310px, var(--hud-c-right, 0px) + 12px)), calc(100vw - 32px)); padding: 8px 18px 9px 12px; color: var(--ds-zeef-tx); text-shadow: none; pointer-events: none; z-index: 4; font-family: var(--ds-font-zeef-tekst);
  background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-top: var(--ds-s-2) solid var(--ds-c-ink-bord); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); }
#hud .mg-board small { display: flex; align-items: center; gap: 6px; font-size: max(13px, calc(13px / var(--ui, 1))); letter-spacing: 3px; font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-ink-bord); }
#hud .mg-board .mg-ic { flex: none; }
/* de sfeernaam klein naast de titel en één watermark in de marge (#595): geen tweede balk */
#hud .mg-board .mg-sfeer { font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); letter-spacing: 2px; text-transform: uppercase; color: var(--ds-c-inkt-zacht); font-style: normal; }
#hud .mg-board .mg-watermark { display: none; /* #985: dubbel met de sfeernaam in de kop en lag achter de laatste regels */ position: absolute; right: 10px; bottom: -4px; font: 800 54px/1 var(--ds-font-zeef-kop); letter-spacing: 4px; text-transform: uppercase; color: var(--ds-c-ink-inkt); opacity: 0.08; pointer-events: none; white-space: nowrap; }
#hud .mg-board[data-sfeerbord="scorekaart"], #hud .mg-board[data-sfeerbord="meetlat"] { border-radius: 0 10px 10px 0; }
#hud .mg-board[data-sfeerbord="clubschild"], #hud .mg-board[data-sfeerbord="entreekaartje"] { border-radius: 14px 4px 4px 14px; }
#hud .mg-board[data-sfeerbord="cockpitstrip"], #hud .mg-board[data-sfeerbord="startbord"], #hud .mg-board[data-sfeerbord="routebord"] { border-radius: 4px; }
/* #596: één vormvlak in de marge, per bordvorm een eigen silhouet, zonder tweede balk */
#hud .mg-board[data-sfeer] { padding-left: 86px; }
#hud .mg-board .mg-vorm { position: absolute; left: 0; top: 0; bottom: 0; width: 74px; background-color: var(--ds-c-ink-bord); background-image: var(--ds-raster); background-size: var(--ds-raster-maat); opacity: 0.22; pointer-events: none; }
#hud .mg-board .mg-sfeer { min-width: 0; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#hud .mg-board[data-mg="station"] .mg-sfeer { max-width: none; overflow: visible; text-overflow: clip; white-space: normal; }
#hud .mg-board[data-sfeerbord="scorekaart"] .mg-vorm { width: 88px; clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="meetlat"] .mg-vorm { width: 56px; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="clubschild"] .mg-vorm { clip-path: polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%); }
#hud .mg-board[data-sfeerbord="entreekaartje"] .mg-vorm { clip-path: polygon(0 0, 100% 0, 100% 42%, 92% 50%, 100% 58%, 100% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="cockpitstrip"] .mg-vorm { top: 0; bottom: auto; left: 0; right: 0; width: auto; height: 14px; }
#hud .mg-board[data-sfeerbord="startbord"] .mg-vorm { width: 96px; clip-path: polygon(0 0, 100% 0, 78% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="boeienkaart"] .mg-vorm { clip-path: polygon(0 0, 100% 0, 100% 82%, 84% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="kermisbord"] .mg-vorm { clip-path: polygon(0 0, 100% 0, 86% 50%, 100% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="prikbord"] .mg-vorm { width: 62px; }
#hud .mg-board[data-sfeerbord="dossier"] .mg-vorm { clip-path: polygon(0 0, 78% 0, 100% 14%, 100% 100%, 0 100%); }
#hud .mg-board[data-sfeerbord="routebord"] .mg-vorm { clip-path: polygon(0 0, 100% 0, 100% 50%, 0 50%); }
#hud .mg-board[data-sfeerbord="vertrekbord"] .mg-vorm { width: 64px; clip-path: polygon(0 0, 100% 0, 100% 100%, 18% 100%); }
/* #1345: het vertrekbord vervaagt (DS3-beweging, onder Beweging beperken meteen) zodra de speler loopt of rijdt, en staat dan niet in de weg */
#hud .mg-board[data-mg="station"] { transition: opacity var(--ds-m-midden) var(--ds-m-uit); }
#hud .mg-board[data-mg="station"].stl-vervaag { opacity: 0; pointer-events: none; }
/* #621: de rondvaart draagt de kadeband: het golfvlak links en een cream kadelijn onder */
#hud .mg-board[data-sfeer="vaardienst"] { border-bottom: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); }
@media (max-width: 480px) { #hud .mg-board[data-sfeer] { padding-left: 12px; } #hud .mg-board .mg-vorm { display: none; } }
/* #854: op een telefoon liggen de klok/datum links van Pauze en Meer. Een gecentreerd
   bord op de gewone hoogte schuift daar doorheen; het bord zakt op smalle liggende
   schermen onder de zone C-rij en houdt de volle breedte tussen de randen. */
@media (max-width: 900px) and (orientation: landscape) {
  #hud .mg-board { left: 50%; transform: translateX(-50%); top: calc(var(--hud-top, 18px) + 170px); max-width: min(560px, calc(100vw - 2 * var(--hud-edge, 46px))); }
}
/* #877: op een korte telefoon (liggend) is er tussen zone C en het vliegpaneel maar
   ~42 px; het bord wordt daar één regel (titel + voortgang), secundaire regels weg.
   De positie zelf zet createBoard inline (de mediaregel bleek daar niet te grijpen). */
@media (max-height: 460px) and (orientation: landscape) {
  #hud .mg-board { padding: 4px 10px; }
  body.plane-flying #hud .mg-board :is(small, .mg-sfeer, .mg-watermark, .mg-cells, .mg-extra, .mg-meter, .mg-help) { display: none !important; }
  body.plane-flying #hud .mg-board .mg-row { flex-wrap: nowrap; overflow: hidden; white-space: nowrap; line-height: 1.15; }
}
/* #881: in portret geldt dezelfde compacte vliegstand; buiten de vlucht (het
   lesmenu) houdt het bord zijn titel en wikkelt de rij gewoon door. */
@media (max-width: 480px) {
  #hud .mg-board { padding: 4px 10px; }
  body.plane-flying #hud .mg-board :is(small, .mg-sfeer, .mg-watermark, .mg-cells, .mg-extra, .mg-meter, .mg-help) { display: none !important; }
  body.plane-flying #hud .mg-board .mg-row { flex-wrap: nowrap; overflow: hidden; white-space: nowrap; line-height: 1.15; }
}
@media (max-height: 460px) and (orientation: landscape), (max-width: 480px) {
  /* #877/#881: in de compacte vliegstand is er één regel. Een lesmelding
     (flash) gaat dan voor de voortgangsregel; zo blijft het bord even hoog en
     houdt de melding ruimte zonder over het paneel te schuiven. */
  body.plane-flying #hud .mg-board:has(.mg-flash:not(:empty)) .mg-row { display: none; }
  body.plane-flying #hud .mg-board .mg-flash { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
#hud .mg-board .mg-row { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: baseline; font-size: 20px; letter-spacing: 1px; }
#hud .mg-board .mg-row b { font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-zeef-tx); font-size: 24px; text-shadow: var(--ds-misdruk); }
#hud .mg-board .mg-cells { display: flex; flex-wrap: wrap; gap: 3px; margin: 5px 0 2px; }
#hud .mg-board .mg-cells i { flex: 1; min-width: 26px; text-align: center; font-style: normal; font-size: max(13px, calc(13px / var(--ui, 1))); padding: 2px 0; background: var(--ds-zeef-bg); border: var(--ds-lijn) solid var(--ds-c-ink-inkt); color: var(--ds-zeef-tx); }
/* touch: a cell with a key is a button (carillon bells) */
html.touch-play #hud .mg-board .mg-cells i[data-k] { pointer-events: auto; touch-action: none; min-height: 44px; display: flex; align-items: center; justify-content: center; }
#hud .mg-board .mg-cells i.on { background: var(--ds-zeef-primair); color: var(--ds-zeef-tx); font-weight: 700; }
#hud .mg-board .mg-cells i.good { background: var(--ds-c-groen-vlak); color: var(--ds-c-groen-tx); }
#hud .mg-board .mg-cells i.bad { background: var(--ds-c-rood-vlak); color: var(--ds-c-rood-tx); border-style: dashed; }
/* good and bad also differ by shape, not by colour alone */
#hud .mg-board .mg-cells i.good::before { content: '\\2713\\a0'; }
#hud .mg-board .mg-cells i.bad::before, #hud .mg-board .mg-flash.bad::before { content: '\\2715\\a0'; }
#hud .mg-board .mg-meter { display: flex; align-items: center; gap: 10px; margin: 6px 0 4px; }
#hud .mg-board .mg-meter[hidden] { display: none; }
#hud .mg-board .mg-meter .mg-bar { position: relative; flex: 1; height: 14px; background-color: var(--ds-zeef-bg); background-image: var(--ds-raster); background-size: var(--ds-raster-maat); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r-pil); overflow: hidden; }
#hud .mg-board .mg-meter i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--ds-c-ink-bord); border-right: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); }
#hud .mg-board .mg-meter em { position: absolute; top: 0; bottom: 0; width: 4px; margin-left: -2px; background: var(--ds-zeef-primair); border-left: var(--ds-lijn) solid var(--ds-c-ink-inkt); border-right: var(--ds-lijn) solid var(--ds-c-ink-inkt); }
#hud .mg-board .mg-meter-t { min-width: 3.2em; text-align: right; font-size: max(14px, calc(14px / var(--ui, 1))); letter-spacing: 0.5px; color: var(--ds-zeef-tx); }
#hud .mg-board .mg-extra[hidden] { display: none; }
/* #619: de balanstip staat op een eigen regel, los van de puntenflits */
#hud .mg-board .sk-bal { display: block; font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); letter-spacing: 0.4px; color: var(--ds-c-rood-tx); margin: 2px 0 1px; }
/* een tussenstand als echte tabel (#617), geen rij chips */
#hud .mg-board .mg-stand { border-collapse: collapse; margin: 5px 0 2px; font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); color: var(--ds-zeef-tx); }
#hud .mg-board .mg-stand th, #hud .mg-board .mg-stand td { padding: 1px 9px; font-weight: normal; text-align: right; }
#hud .mg-board .mg-stand th[scope="row"], #hud .mg-board .mg-stand thead th:first-child { text-align: left; }
#hud .mg-board .mg-stand thead th { font-size: max(13px, calc(13px / var(--ui, 1))); letter-spacing: 1px; font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-inkt-zacht); border-bottom: var(--ds-lijn-dik) solid var(--ds-c-ink-inkt); }
#hud .mg-board .mg-stand tr.on { background: var(--ds-c-sel-vlak); box-shadow: inset var(--ds-status-rand) 0 0 var(--ds-c-ink-bord); color: var(--ds-zeef-tx); font-weight: 700; }
#hud .mg-board .mg-stand tr.weg { color: var(--ds-c-inkt-zacht); text-decoration: line-through; }
#hud .mg-board .mg-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: max(14px, calc(14px / var(--ui, 1))) var(--ds-font-zeef-tekst); color: var(--ds-zeef-tx); }
#hud .mg-board .mg-flash { font-size: max(18px, calc(22px * var(--ui, 1))); letter-spacing: 1.5px; font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-groen-tx); min-height: 1em; }
#hud .mg-board .mg-flash.bad { color: var(--ds-c-rood-tx); }
body.mg-on #hud .hud-speedo, body.mg-on #hud .hud-route, body.mg-on #hud .hud-gps, body.mg-on #hud .hud-mission, body.mg-on #hud .hud-place, body.mg-on #hud .hud-nowplaying, body.mg-on #hud .phonefeed .pf-card { display: none !important; }
/* het stopvenster op zeefdrukpapier (#596, #1000): Barlow + Atkinson, toetsplaatjes en 44 px-knoppen; Doorgaan is de gele hoofdknop */
.mg-stopask { position: fixed; left: 50%; top: 38%; transform: translateX(-50%) rotate(var(--ds-schuin)); z-index: 60; pointer-events: auto; padding: var(--ds-s-4) var(--ds-s-5); background: var(--ds-zeef-bg); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); box-shadow: var(--ds-schaduw-hard); color: var(--ds-zeef-tx); text-align: center; }
.mg-stopask b { display: block; font: 800 calc(26px * var(--ui, 1))/1.1 var(--ds-font-zeef-kop); letter-spacing: 0.04em; text-shadow: var(--ds-misdruk); }
.mg-stopask .mg-stopbtns { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
.mg-stopask button { min-height: var(--ds-doel-aanraken); min-width: var(--ds-doel-aanraken); padding: 0 var(--ds-s-4); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); background: var(--ds-zeef-primair); color: var(--ds-zeef-tx); font: 800 calc(20px * var(--ui, 1)) var(--ds-font-zeef-kop); letter-spacing: 0.04em; cursor: pointer; box-shadow: var(--ds-schaduw-hard-klein); }
.mg-stopask button:active { transform: translate(var(--ds-hard-klein), var(--ds-hard-klein)); box-shadow: none; }
.mg-stopask button:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-zeef-tx); outline-offset: var(--ds-focus-afstand); }
.mg-stopask button[data-do="stop"] { background: var(--ds-zeef-bg); border-color: var(--ds-c-rood); color: var(--ds-c-rood-tx); box-shadow: var(--ds-schaduw-hard-roze); }
.mg-stopask small { display: block; margin-top: 8px; font: max(13px, calc(13px / var(--ui, 1))) var(--ds-font-zeef-tekst); color: var(--ds-c-inkt-zacht); }
/* smal scherm: de spel-HUD begint rechts van de uitlegkaart (linksboven, 350 px) in plaats van eroverheen (#294) */
@media (max-width: 1500px) { #hud .mg-board { left: calc(var(--hud-edge, 46px) + 372px); transform: none; max-width: calc(100vw / var(--ui, 1) - var(--hud-edge, 46px) - 372px - max(330px, var(--hud-c-right, 0px) + 12px)); } }
/* #985: onder 1100 px past het bord niet meer tussen de berichtkolom en zone C: het hangt rechts onder zone C (de gemeten kolom) */
@media (max-width: 1100px) { #hud .mg-board { left: auto; right: var(--hud-edge, 46px); transform: none; top: calc(var(--hud-tr-bottom, 150px) + 8px); min-width: 0; max-width: min(460px, calc(100vw / var(--ui, 1) - 2 * var(--hud-edge, 46px))); } }
@media (max-width: 480px) { #hud .mg-board { top: 64px; left: 50%; transform: translateX(-50%); min-width: 0; max-width: calc(100vw - 32px); } }
/* Zomerse zeefdruk (ADR 0040): het bord en het stopvenster als papier met inktrand en harde schaduw; de accentkleur van de
   minigame blijft de dikke linkerrand (identiteit), de tekst is inkt. Geen glas, geen verloop. */
#hud .mg-board { color: var(--ds-c-ink-inkt); text-shadow: none; font-family: var(--ds-font-zeef-tekst); background: var(--ds-c-ink-papier);
  border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-left: 8px solid var(--mg-acc, var(--ds-c-ink-bord)); border-radius: 8px; box-shadow: var(--ds-schaduw-hard); }
#hud .mg-board, #hud .mg-board[data-sfeer] { overflow: hidden; }
#hud .mg-board[data-sfeer] { box-shadow: var(--ds-schaduw-hard); }
#hud .mg-board small { font-family: var(--ds-font-zeef-kop); font-weight: 800; letter-spacing: 0.12em; color: var(--ds-c-ink-bord); }
#hud .mg-board .mg-sfeer { font-family: var(--ds-font-zeef-kop); font-weight: 600; color: var(--ds-c-inkt-zacht); }
#hud .mg-board .mg-watermark { top: 6px; bottom: auto; right: 10px; max-width: 36%; overflow: hidden; font: 800 30px/1 var(--ds-font-zeef-kop); letter-spacing: 0.1em; color: var(--ds-c-ink-inkt); opacity: 0.08; z-index: 0; }
#hud .mg-board > :not(.mg-watermark):not(.mg-vorm) { position: relative; z-index: 1; }
#hud .mg-board small { flex-wrap: wrap; row-gap: 0; }
#hud .mg-board .mg-sfeer { max-width: none; overflow: visible; text-overflow: clip; white-space: normal; }
#hud .mg-board .mg-vorm { opacity: 0.22; }
#hud .mg-board[data-sfeer="vaardienst"] { border-bottom: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); }
#hud .mg-board .mg-row { font-family: var(--ds-font-zeef-kop); font-weight: 600; letter-spacing: 0.02em; }
#hud .mg-board .mg-row b { font-weight: 800; color: var(--ds-c-ink-bord); }
#hud .mg-board .mg-cells i { font-family: var(--ds-font-zeef-kop); font-weight: 600; background: var(--ds-c-sel-vlak); color: var(--ds-c-inkt-zacht); border-radius: 3px; }
#hud .mg-board .mg-cells i.on { background: var(--ds-c-ink-geel); color: var(--ds-c-ink-inkt); box-shadow: inset 0 0 0 2px var(--ds-c-ink-inkt); }
#hud .mg-board .mg-cells i.good { color: var(--ds-c-groen-tx); }
#hud .mg-board .mg-cells i.bad { color: var(--ds-c-rood-tx); }
#hud .mg-board .mg-meter .mg-bar { background: var(--ds-c-sel-vlak); border-radius: 3px; box-shadow: inset 0 0 0 2px var(--ds-c-ink-inkt); height: 13px; }
#hud .mg-board .mg-meter em { background: var(--ds-c-ink-inkt); box-shadow: none; }
#hud .mg-board .mg-meter-t { font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-ink-inkt); }
#hud .mg-board .sk-bal { font-family: var(--ds-font-zeef-tekst); color: var(--ds-c-rood-tx); }
#hud .mg-board .mg-stand { font-family: var(--ds-font-zeef-tekst); color: var(--ds-c-ink-inkt); }
#hud .mg-board .mg-stand thead th { font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-inkt-zacht); }
#hud .mg-board .mg-stand tr.on { background: var(--ds-c-sel-vlak); color: var(--ds-c-ink-inkt); font-weight: 700; }
#hud .mg-board .mg-help { font-family: var(--ds-font-zeef-tekst); font-size: max(13px, calc(13px / var(--ui, 1))); color: var(--ds-c-inkt-zacht); }
#hud .mg-board .mg-flash { font-family: var(--ds-font-zeef-kop); font-weight: 800; color: var(--ds-c-groen-tx); }
#hud .mg-board .mg-flash.bad { color: var(--ds-c-rood-tx); }
.mg-stopask { background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); text-shadow: none; border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: 8px; box-shadow: var(--ds-schaduw-hard); font-family: var(--ds-font-zeef-tekst); }
.mg-stopask b { font: 800 calc(30px * var(--ui, 1))/1.1 var(--ds-font-zeef-kop); letter-spacing: 0.04em; text-shadow: var(--ds-misdruk); }
.mg-stopask button { background: var(--ds-c-ink-geel); color: var(--ds-c-ink-inkt); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: 6px; box-shadow: var(--ds-schaduw-hard-klein); font: 800 calc(20px * var(--ui, 1)) var(--ds-font-zeef-kop); letter-spacing: 0.04em; }
.mg-stopask button:active { transform: translate(var(--ds-hard-klein), var(--ds-hard-klein)); box-shadow: none; }
.mg-stopask button:focus-visible { outline: var(--ds-focus-dikte) solid var(--ds-c-ink-inkt); outline-offset: var(--ds-focus-afstand); }
.mg-stopask button[data-do="stop"] { background: var(--ds-c-ink-papier); color: var(--ds-c-rood-tx); border-color: var(--ds-c-rood); box-shadow: var(--ds-schaduw-hard-roze); }
.mg-stopask button { display: inline-flex; align-items: center; gap: 8px; }
.mg-stopask .hud-key { background: var(--ds-c-ink-inkt); color: var(--ds-c-ink-papier); border-radius: 4px; box-shadow: none; font-family: var(--ds-font-zeef-kop); font-weight: 800; }
.mg-stopask small:empty { display: none; }
.mg-stopask small { color: var(--ds-c-inkt-zacht); font-family: var(--ds-font-zeef-tekst); }
`;

let cssDone = false;
let inputMod = null;

export const key = (t) => `<span class="hud-key">${t}</span>`;

// --- Per-game HUD theme (#453) -------------------------------------------------------------------
// One table for the HUD of every minigame: its title, its accent (the board's border, title and meters) and its icon.
// The icons are flat low-poly SVG shapes in the design tokens (cream, the greens, the one red) with their own form
// next to the colour, and hidden from screen readers because the title already names the game. No new imagery: a game
// takes an icon that is already there, so the four of this board sit next to the golf set (golficons.js) and games
// that share a kind of play (the water sports) share its icon. A game without a row here keeps the neutral board:
// createBoard(title, accent) still works as before.
const MG_ICONEN = {
  // discgolf: een hoekige schijf (de basket staat op de baan, niet in het bord)
  disc: `<polygon points="4,17 11,14 18,17 12,20" style="fill:var(--ds-c-ink-inkt)"/><polygon points="11,5 18,8.5 18,15.5 11,19 4,15.5 4,8.5" style="fill:var(--ds-c-ink-bord)"/><polygon points="11,5 18,8.5 11,12" style="fill:var(--ds-c-ink-papier)"/><polygon points="11,12 18,15.5 11,19" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="11,12 4,15.5 4,8.5" style="fill:var(--ds-c-inkt-zacht)"/>`,
  // golf: de vlag in de hole
  vlag: `<ellipse cx="12" cy="20.5" rx="6" ry="2" style="fill:var(--ds-c-ink-inkt)"/><polygon points="12,3 12,20 13.2,20 13.2,3" style="fill:var(--ds-c-ink-bord)"/><polygon points="13.2,3.5 21,6.8 13.2,10.2" style="fill:var(--ds-c-ink-roze)"/><polygon points="13.2,3.5 21,6.8 13.2,6.8" style="fill:var(--ds-c-ink-roze)"/>`,
  // skatepark: een deck met twee wielen
  skate: `<polygon points="3,10 20,7.5 21.5,11.5 4.5,14" style="fill:var(--ds-c-ink-bord)"/><polygon points="4.5,14 21.5,11.5 21.5,12.8 4.5,15.3" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="7,15.3 9.4,15 9.4,18 7,18.3" style="fill:var(--ds-c-ink-inkt)"/><polygon points="16,13.6 18.4,13.3 18.4,16.3 16,16.6" style="fill:var(--ds-c-ink-inkt)"/>`,
  // karten: de geblokte finishvlag
  kart: `<polygon points="3,2.5 4.6,2.5 4.6,21.5 3,21.5" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="4.6,3 21,3 21,13.5 4.6,13.5" style="fill:var(--ds-c-ink-bord)"/><polygon points="4.6,3 8.7,3 8.7,8.2 4.6,8.2" style="fill:var(--ds-c-ink-inkt)"/><polygon points="12.8,3 16.9,3 16.9,8.2 12.8,8.2" style="fill:var(--ds-c-ink-inkt)"/><polygon points="8.7,8.2 12.8,8.2 12.8,13.5 8.7,13.5" style="fill:var(--ds-c-ink-inkt)"/><polygon points="16.9,8.2 21,8.2 21,13.5 16.9,13.5" style="fill:var(--ds-c-ink-inkt)"/>`,
  // de golfset (golficons.js): bal, wedge, putter, zand, water, beurt, oog en winnaar
  ...GOLF_VORM,
  // #627: drie vlaggetjes (de kermis) en de gondel van het rad
  vlaggen: `<polygon points="3,5 3,20 4.5,20 4.5,5" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="4.5,5 12,7 4.5,10" style="fill:var(--ds-c-ink-roze)"/><polygon points="12,3 12,18 13.5,18 13.5,3" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="13.5,3 21,5 13.5,8" style="fill:var(--ds-c-ink-geel)"/>`,
  gondel: `<polygon points="9,3 15,3 15,5 9,5" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="11.4,5 12.6,5 12.6,15 11.4,15" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="5,16 19,16 16.5,21 7.5,21" style="fill:var(--ds-c-ink-bord)"/><polygon points="7.5,17.5 16.5,17.5 16.5,19 7.5,19" style="fill:var(--ds-c-inkt-zacht)"/>`,
  // #630: de duif van de duivenmelker
  duif: `<polygon points="4,8 7,6 10,4 14,5 16,7 20,6 17,10 19,13 15,13 14,17 11,15 8,16 7,13 4,12 6,10" style="fill:var(--ds-c-ink-bord)"/><polygon points="6,10 9,8 12,9 10,12" style="fill:var(--ds-c-inkt-zacht)"/><polygon points="15,7 17,9 16,11 14,9" style="fill:var(--ds-c-inkt-zacht)"/><ellipse cx="7" cy="10" rx="2.4" ry="1.6" style="fill:var(--ds-c-ink-bord)"/><polygon points="22,11 19,9 19,13" style="fill:var(--ds-c-ink-roze)"/>`,
};

// Zeefdruk (ADR 0040, #1000): het bord en het stopvenster dragen de identiteit van een spel met het embleem (`icoon`) en de
// bordvorm uit de sfeertabel, in de vijf inkten; `accent` kleurt geen scherm meer en wordt alleen nog door de wereld gelezen
// (markeringen en 3D-details van het spel zelf). De proefset golf en farming (#1004) krijgt een eigen embleemtabel.
export const MG_THEMA = {
  discgolf: { titel: 'DISCGOLF STADSPARK', accent: '#f08a2e', icoon: 'disc' },
  pitchputt: { titel: 'PITCH & PUTT', accent: '#46b36a', icoon: 'vlag' },
  skatepark: { titel: 'SKATEPARK STADSPARK', accent: '#e8523a', icoon: 'skate' },
  penalty: { titel: 'PENALTYSERIE EUROBORG', accent: '#5fae52', icoon: 'bal' },
  voetbal: { titel: 'VOETBAL EUROBORG', accent: '#2f9e5b', icoon: 'bal' },
  kartbaan: { titel: 'KARTEN IN ULRUM', accent: '#f2b82a', icoon: 'kart' },
  // de toren: wie boven is wint (kroon)
  klimtoren: { titel: 'KLIMTOREN ZERNIKE', accent: '#d9455f', icoon: 'vlag' }, // #620: de vlag op de top zegt klimmen, niet 'winnaar'
  // het water: baantjes, skiën, hengelen, zeilen en de rondvaart delen het golf-icoon van de golven
  zwembad: { titel: 'ZWEMBAD HET NATTE PAPIER', accent: '#2fc4c9', icoon: 'water' },
  waterski: { titel: 'WATERSKIBAAN GRUNOPARK', accent: '#1f9e86', icoon: 'water' },
  hengelen: { titel: 'HENGELEN', accent: '#7aa63a', icoon: 'water' },
  regatta: { titel: 'ZEILREGATTA', accent: '#3f8fa0', icoon: 'water' },
  vaardienst: { titel: 'RONDVAART', accent: '#cf7f5a', icoon: 'water' },
  // de pan: een ronde koek (de bal)
  pannenkoek: { titel: 'PANNENKOEKENSCHIP DE GOUDEN PAN', accent: '#b8792a', icoon: 'bal' },
  // op weg: de wandeling en het carillon gaan om de beurt verder (de pijl)
  wandeling: { titel: 'WANDELING WINSUM', accent: '#a3c94a', icoon: 'beurt' },
  carillon: { titel: 'CARILLON MARTINITOREN', accent: '#c9a227', icoon: 'beurt' },
  // het luchtruim: de school en de rondvlucht kijken van boven (het oog)
  vliegschool: { titel: 'VLIEGSCHOOL DE WINDWIJZER', accent: '#d9d4be', icoon: 'oog' },
  vluchtdienst: { titel: 'VLUCHT', accent: '#8fb04a', icoon: 'vlag' }, // #623: eigen vaan, niet het oog van de vliegschool
  // de ring: een rondje stad tegen de klok, de richting-pijl in het groen van de startlampen (#618)
  ringrace: { titel: 'RINGRACE', accent: '#1e9e56', icoon: 'beurt' },
  // padel (#599): geen eigen blauw meer; het accent komt uit de bestaande a11y-paletten, het icoon is de bal
  padel: { titel: 'PADEL', accent: '#cf6fb0', icoon: 'bal' },
  // de arena en de machinist: een wedstrijd met een uitslag (de kroon) en een dienst met een perron (de pijl, #625)
  pvparena: { titel: 'PVP-ARENA', accent: '#c9568a', icoon: 'winnaar' },
  machinist: { titel: 'MACHINIST', accent: '#b3b3a2', icoon: 'beurt' },
  // #596: de twee borden die buiten de tabel vielen: boerenwerk (het weiland) en het vertrekbord.
  boeren: { titel: 'BOERENWERK', accent: '#8fae45', icoon: 'beurt' },
  station: { titel: 'VERTREKBORD', accent: '#a6a695', icoon: 'beurt' },
  // #627/#628/#630: kermis, reuzenrad, carbid en de duif stonden buiten de tabel; nu hebben ze één
  // accent, titel en icoon, zodat hun eigen bord-CSS kon verdwijnen.
  kermis: { titel: "BOTSAUTO'S", accent: '#d45c86', icoon: 'vlaggen' },
  hoogvlieger: { titel: 'HOOGVLIEGER', accent: '#b9a27a', icoon: 'gondel' },
  carbid: { titel: 'CARBID', accent: '#d9662e', icoon: 'disc' },
  duivenmelker: { titel: 'DUIVENMELKER', accent: '#8a9aa6', icoon: 'duif' },
};

export function mgIcoon(naam, px = 16) {
  const v = MG_ICONEN[naam];
  if (!v) return '';
  return `<svg class="mg-ic" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${v}</svg>`;
}

// The HUD theme of an activity, or null for one that has none (yet).
export const mgThema = (id) => MG_THEMA[id] || null;

// A board at the top centre for one game: title, a row of figures, optional
// cells (a scorecard) and meter, a flash line and one line of key hints.
// Leave `accent` out and pass an id from MG_THEMA for the game's own title, colour and icon.
// Het vormvlak als HTML voor borden die hun eigen DOM hebben (#595, #599): dezelfde sfeertabel en
// hetzelfde patroon als createBoard, zodat er geen tweede sfeersysteem ontstaat.
export function sfeerVlakHtml(id) {
  const sfeer = sfeerVan(id);
  if (!sfeer) return '';
  const vlak = !!sfeer.vorm;
  return vlak ? `<span class="mg-vorm" aria-hidden="true"></span>` : '';
}

export function createBoard(title, accent) {
  const thema = MG_THEMA[title];
  const titel = thema ? thema.titel : title;
  const kleur = thema ? thema.accent : accent;
  // #595/#596: de sfeer van de activiteit (als dit bord bij een activiteit-id hoort) draagt de balk:
  // sfeernaam naast de titel, één watermark in de marge en de bordvorm als data-attribuut.
  const sfeer = sfeerVan(title);
  if (!cssDone && typeof document !== 'undefined') {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    cssDone = true;
  }
  const root = document.createElement('div');
  root.className = 'mg-board';
  // de identiteit van het spel is het embleem plus de bordvorm; de kleur (kleur/accent) leest alleen de wereld nog (markeringen, 3D)
  root.style.setProperty('--mg-acc', 'var(--ds-c-ink-bord)');
  if (thema) root.dataset.mg = title;
  zetContext(root, contextVan(title)); // #1004: de proefset golf en farming draagt een eigen band en stempel
  if (sfeer) { root.dataset.sfeer = title; root.dataset.sfeerbord = sfeer.bordvorm; }
  // #596: het vormvlak van de sfeer, uit dezelfde patroontabel als de loopbaanbanden
  const vlak = !!(sfeer && sfeer.vorm);
  root.hidden = true;
  root.innerHTML = `${vlak ? `<span class="mg-vorm" aria-hidden="true"></span>` : ''}<small>${thema ? mgIcoon(thema.icoon) : ''}<span>${titel}</span>${sfeer ? `<em class="mg-sfeer">${sfeer.naam}</em>` : ''}</small>${sfeer ? `<b class="mg-watermark" aria-hidden="true">${sfeer.naam}</b>` : ''}<div class="mg-row"></div><div class="mg-cells" hidden></div><div class="mg-extra" hidden></div><div class="mg-meter" hidden><span class="mg-bar"><i></i><em></em></span><span class="mg-meter-t"></span></div><div class="mg-flash"></div><div class="mg-help"></div>`;
  (document.getElementById('hud') || document.body).appendChild(root);
  // #854/#877/#881: op een korte telefoon (liggend) en op een smalle telefoon
  // (staand) kan het bord niet op de gewone hoogte gecentreerd staan zonder zone C
  // (klok/datum links van Pauze en Meer) te raken. De CSS-mediaregel bleek in de
  // praktijk niet aan te slaan op dit bord; daarom hier de positie inline (wint van
  // elke stylesheet): onder de zone C-rij, horizontaal gecentreerd en niet breder
  // dan tussen de randen. De compacte éénregelstand zelf is CSS onder
  // body.plane-flying, zodat het bord in de lesmenu's gewoon zijn tekst houdt en
  // pas tijdens de vlucht inklapt.
  if (typeof window !== 'undefined' && compactBoard(window.innerWidth, window.innerHeight)) {
    const uiS = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
    const hudEl = document.getElementById('hud');
    const edge = (hudEl && parseFloat(getComputedStyle(hudEl).getPropertyValue('--hud-edge'))) || 46;
    root.style.left = '50%';
    root.style.transform = 'translateX(-50%)';
    root.style.top = '170px'; // net onder de zone C-rij, boven de paneeltop (153 px op 800x360)
    root.style.maxWidth = `${Math.min(560, window.innerWidth / uiS - 2 * edge)}px`;
  }
  const q = (s) => root.querySelector(s);
  const el = { row: q('.mg-row'), cells: q('.mg-cells'), extra: q('.mg-extra'), meter: q('.mg-meter'), bar: q('.mg-meter i'), mark: q('.mg-meter em'), meterT: q('.mg-meter-t'), flash: q('.mg-flash'), help: q('.mg-help') };
  let last = '';
  // a cell with `key` sends that key while touched
  const tapFor = (e, type) => {
    const c = e.target.closest && e.target.closest('i[data-k]');
    if (!c) return;
    e.preventDefault();
    // input.js only loads in the browser (the rule tests import this file)
    inputMod = inputMod || import('./input.js');
    inputMod.then((m) => m.sendKey(type, c.dataset.k, 'touch'));
  };
  el.cells.addEventListener('pointerdown', (e) => tapFor(e, 'keydown'));
  el.cells.addEventListener('pointerup', (e) => tapFor(e, 'keyup'));
  el.cells.addEventListener('pointercancel', (e) => tapFor(e, 'keyup'));
  return {
    root,
    show() { root.hidden = false; document.body.classList.add('mg-on', 'mg-board'); last = ''; },
    hide() { root.hidden = true; document.body.classList.remove('mg-on', 'mg-board'); cancelStopAsk(); },
    // { row: html, cells: [{ t, cls }], extra: html (een blok onder de cellen, bv. een scorebord), meter: { v, mark, color, text }, flash, bad, help: html }
    set(s) {
      const sig = JSON.stringify([s.row, s.cells, s.extra, s.meter && [Math.round(s.meter.v * 100), s.meter.mark != null ? Math.round(s.meter.mark * 100) : -1, s.meter.color, s.meter.text], s.flash, !!s.bad, s.help]);
      if (sig === last) return;
      last = sig;
      el.row.innerHTML = s.row || '';
      if (s.cells) {
        el.cells.hidden = false;
        el.cells.innerHTML = s.cells.map((c) => `<i class="${c.cls || ''}"${c.key ? ` data-k="${c.key}"` : ''}>${c.t}</i>`).join('');
      } else { el.cells.hidden = true; el.cells.innerHTML = ''; } // .mg-cells heeft display:flex: hidden alleen verbergt niets, dus ook leegmaken
      if (s.extra) { el.extra.hidden = false; el.extra.innerHTML = s.extra; } else { el.extra.hidden = true; el.extra.innerHTML = ''; }
      if (s.meter) {
        el.meter.hidden = false;
        el.meterT.textContent = s.meter.text || '';
        el.meterT.style.display = s.meter.text ? '' : 'none';
        el.bar.style.width = `${Math.round(clamp(s.meter.v, 0, 1) * 100)}%`;
        el.bar.style.background = s.meter.color || '';
        el.mark.style.display = s.meter.mark == null ? 'none' : '';
        if (s.meter.mark != null) el.mark.style.left = `${Math.round(clamp(s.meter.mark, 0, 1) * 100)}%`;
      } else el.meter.hidden = true;
      el.flash.textContent = s.flash || '';
      el.flash.classList.toggle('bad', !!s.bad);
      el.help.innerHTML = s.help || '';
    },
  };
}

// A text bubble over somebody (no voice): replaces their earlier one.
export function bubble(w, { x, y, name, text, female = false, h = 2.1, ttl = 0, follow = null, tag = 'mg' }) {
  const sp = w.extraSpeakers || (w.extraSpeakers = []);
  for (let i = sp.length - 1; i >= 0; i--) if (sp[i].mgTag === tag && sp[i].speechName === name) sp.splice(i, 1);
  sp.push({ x, y, h, follow: follow || undefined, female, speechName: name, speechText: text, speechUntil: w.time + (ttl || Math.max(2.6, 1.2 + text.length * 0.06)), mgTag: tag });
}

export function clearBubbles(w, tag) {
  if (w.extraSpeakers) w.extraSpeakers = w.extraSpeakers.filter((e) => e.mgTag !== tag);
}

export const pick = (list, rand = Math.random) => list[Math.floor(rand() * list.length)];

// Backspace or the pad's B stops any of the games at once; Esc asks "Stoppen?"
// first (a second Esc or Enter confirms, Space carries on).
let stopAsk = null;
function cancelStopAsk() {
  if (!stopAsk) return;
  clearTimeout(stopAsk.timer);
  stopAsk.el.remove();
  stopAsk = null;
}
export function stopPressed(input) {
  // #688: één stopconventie, ook voor de pad-B (die komt als backspace binnen) en touch (de knoppen).
  const direct = STOP_DIRECT.some((k) => input.wasPressed(k));
  const start = input.wasPressed(STOP_VRAAG);
  const bevestig = STOP_BEVESTIG.some((k) => input.wasPressed(k));
  const doorgaan = STOP_DOORGAAN.some((k) => input.wasPressed(k));
  const uitkomst = stopUitkomst({ direct, vraagOpen: !!stopAsk, bevestig, doorgaan, start });
  if (uitkomst === 'stop') {
    for (const k of [...STOP_DIRECT, ...STOP_BEVESTIG]) if (input.wasPressed(k)) input.consume(k);
    cancelStopAsk();
    return true;
  }
  if (uitkomst === 'door') {
    for (const k of STOP_DOORGAAN) if (input.wasPressed(k)) input.consume(k);
    cancelStopAsk();
    return false;
  }
  if (uitkomst === 'vraag' && typeof document !== 'undefined') {
    input.consume(STOP_VRAAG);
    const el = document.createElement('div');
    el.className = 'mg-stopask';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', 'Stoppen?');
    // #596: het venster staat in de HUD-stijl, met echte knoppen zodat touch ook een uitweg heeft.
    el.innerHTML = '<b>Stoppen?</b><div class="mg-stopbtns" role="group" aria-label="Stoppen?">' +
      '<button type="button" data-do="door"><span class="mg-bt">Doorgaan</span>' + keyTextHtml('{SPACE}') + '</button>' +
      '<button type="button" data-do="stop"><span class="mg-bt">Stoppen</span>' + keyTextHtml('{ESC}') + '</button></div>' +
      '<small>' + deviceText('', 'Tik op Stoppen of Doorgaan') + '</small>';
    const kies = (k) => {
      // dezelfde toetsweg als de rest van het spel: keydown + keyup via input.js
      inputMod = inputMod || import('./input.js');
      inputMod.then((m) => { m.sendKey('keydown', k, 'touch'); m.sendKey('keyup', k, 'touch'); });
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button[data-do]');
      if (!b) return;
      kies(b.dataset.do === 'stop' ? 'enter' : ' ');
    });
    document.body.appendChild(el);
    stopAsk = { el, timer: setTimeout(cancelStopAsk, 8000) };
  }
  return false;
}

// How much of the remaining distance one frame covers: `k` is the fraction at
// 60 frames per second, scaled to `dt` seconds. A pause or a hitch counts for
// at most a quarter second, so the camera glides on instead of jumping; the
// same elapsed time gives the same pose on a fast and a slow screen (#436).
// Tekst veilig in innerHTML (een naam van een medespeler in het bord): de naam is al gefilterd door de host, maar de veiligheid hangt niet aan andere bestanden (review 21-11).
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Een tussenstand als tabel (#1000, Samen spelen): een rij per deelnemer, de eigen rij gemarkeerd. Wie wegvalt blijft staan met
// het woord "weg" in de laatste cel (nooit alleen een kleur of een streep), zodat iedereen ziet dat hij er niet meer bij is.
// kop: de kolomnamen met '#' en de naam vooraan; rijen: [{ naam, cellen: ['..'], eigen, weg }]; de plek is de volgorde.
export function standTabel(kop, rijen) {
  const kolommen = kop.map((k) => `<th scope="col">${esc(k)}</th>`).join('');
  if (!rijen || !rijen.length) return `<table class="mg-stand"><thead><tr>${kolommen}</tr></thead><tbody><tr><td colspan="${kop.length + 1}">Nog niemand</td></tr></tbody></table>`;
  const body = rijen.map((r, i) => {
    r = { ...r, cellen: r.cellen || [] };
    const cellen = r.cellen.map((c, k) => (r.weg ? (k === r.cellen.length - 1 ? 'weg' : '-') : c));
    return `<tr class="${[r.eigen ? 'on' : '', r.weg ? 'weg' : ''].filter(Boolean).join(' ')}"><td>${i + 1}</td><th scope="row">${esc(r.naam)}</th>${cellen.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="mg-stand"><thead><tr>${kolommen}</tr></thead><tbody>${body}</tbody></table>`;
}

export function easeStep(k, dt = 1 / 60) {
  const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 1 / 60;
  return 1 - Math.pow(1 - clamp(k, 0.001, 0.999), d * 60);
}

// Ease a camera pose onto a target one. `k` is the fraction per frame at 60 fps
// and the step is scaled to the frame time in `state.dt` (the game stores it in
// its update), so the camera follows per second instead of per frame.
export function easeCamera(state, pos, at, k = 0.12) {
  if (!state.cam) state.cam = { pos: { ...pos }, at: { ...at } };
  const f = easeStep(k, state.dt);
  for (const key2 of ['x', 'y', 'z']) {
    state.cam.pos[key2] += (pos[key2] - state.cam.pos[key2]) * f;
    state.cam.at[key2] += (at[key2] - state.cam.at[key2]) * f;
  }
  return { position: { ...state.cam.pos }, lookAt: { ...state.cam.at } };
}

// Deterministic random for the rule tests.
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}


