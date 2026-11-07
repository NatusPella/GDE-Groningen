// Shared bits of the Minigames batch 1 (discgolf.js, pitchputt.js,
// skatepark.js, kartbaan.js). Everything fixed in the world is given as
// WGS84 and goes through the shared projection (rdnew.js), never as
// coordinates of an older frame. No THREE here, so the pure rule files and
// their node tests can import it.
import { wgsToWorld } from './rdnew.js';
import { GOLF_VORM } from './golficons.js';

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
  const m = Math.floor(s / 60);
  const r = s - m * 60;
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
  const bft = Math.round(Math.sqrt(Math.max(0, wind.speed)) * 1.1);
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
  const basis = Math.min(760, vw / (ui || 1) - 2 * (edge + 360), vw - 32);
  const smal = vw <= 1500 ? vw / (ui || 1) - edge - 372 - 330 : Infinity;
  return { max: Math.max(0, Math.min(basis, smal)), min: 360, mobile: false };
}

// --- HUD board ----------------------------------------------------------------------------------

// De sfeer van een activiteit (#595, #596): de gedeelde balk is de drager. Bordvorm, sfeernaam en tint
// komen uit de ene sfeertabel; een bord zonder sfeer houdt de neutrale balk.
import { sfeerVan, TINT_RGBA } from './activiteitensfeer.js';
import { vormStijl } from './carrieresfeer.js';

const CSS = `
#hud .mg-board[hidden] { display: none; }
#hud .mg-board { position: absolute; top: var(--hud-top, 14px); left: 50%; transform: translateX(-50%); min-width: 360px; max-width: min(760px, calc(100vw / var(--ui, 1) - 2 * (var(--hud-edge, 46px) + 360px)), calc(100vw - 32px)); padding: 8px 18px 9px 12px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.9), rgba(24,34,28,0.66) 80%, rgba(24,34,28,0.2)); border-left: 3px solid var(--mg-acc, var(--mk-ok, #3fc97a)); }
#hud .mg-board small { display: flex; align-items: center; gap: 6px; font-size: max(12px, calc(13px * var(--ui, 1))); letter-spacing: 3px; color: var(--mg-acc, var(--mk-ok, #3fc97a)); }
#hud .mg-board .mg-ic { flex: none; }
/* de sfeernaam klein naast de titel en één watermark in de marge (#595): geen tweede balk */
#hud .mg-board .mg-sfeer { font: max(12px, calc(12px * var(--ui, 1))) 'Arial Narrow', Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase; color: rgba(240,237,228,0.62); font-style: normal; }
#hud .mg-board .mg-watermark { position: absolute; right: 10px; bottom: -4px; font: 54px/1 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 4px; text-transform: uppercase; color: var(--mg-acc, var(--mk-ok, #3fc97a)); opacity: 0.11; pointer-events: none; white-space: nowrap; }
#hud .mg-board[data-sfeerbord="scorekaart"], #hud .mg-board[data-sfeerbord="meetlat"] { border-radius: 0 10px 10px 0; }
#hud .mg-board[data-sfeerbord="clubschild"], #hud .mg-board[data-sfeerbord="entreekaartje"] { border-radius: 14px 4px 4px 14px; }
#hud .mg-board[data-sfeerbord="cockpitstrip"], #hud .mg-board[data-sfeerbord="startbord"], #hud .mg-board[data-sfeerbord="routebord"] { border-radius: 4px; }
#hud .mg-board[data-sfeer] { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mg-acc, #3fc97a) 22%, transparent); }
/* #596: één vormvlak in de marge, per bordvorm een eigen silhouet, zonder tweede balk */
#hud .mg-board[data-sfeer] { padding-left: 86px; }
#hud .mg-board .mg-vorm { position: absolute; left: 0; top: 0; bottom: 0; width: 74px; opacity: 0.5; pointer-events: none; }
#hud .mg-board .mg-sfeer { min-width: 0; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
/* #621: de rondvaart draagt de kadeband: het golfvlak links en een cream kadelijn onder */
#hud .mg-board[data-sfeer="vaardienst"] { border-bottom: 2px solid var(--ink, #f0ede4); }
@media (max-width: 480px) { #hud .mg-board[data-sfeer] { padding-left: 12px; } #hud .mg-board .mg-vorm { display: none; } }
#hud .mg-board .mg-row { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: baseline; font-size: 20px; letter-spacing: 1px; }
#hud .mg-board .mg-row b { font-weight: normal; color: var(--mk-mission, #e8c93a); font-size: 24px; }
#hud .mg-board .mg-cells { display: flex; flex-wrap: wrap; gap: 3px; margin: 5px 0 2px; }
#hud .mg-board .mg-cells i { flex: 1; min-width: 26px; text-align: center; font-style: normal; font-size: 13px; padding: 2px 0; background: rgba(240,237,228,0.1); color: rgba(240,237,228,0.75); }
/* touch: a cell with a key is a button (carillon bells) */
html.touch-play #hud .mg-board .mg-cells i[data-k] { pointer-events: auto; touch-action: none; min-height: 44px; display: flex; align-items: center; justify-content: center; }
#hud .mg-board .mg-cells i.on { background: color-mix(in srgb, var(--mk-mission, #e8c93a) 28%, transparent); color: #fff; }
#hud .mg-board .mg-cells i.good { color: var(--mk-ok, #3fc97a); }
#hud .mg-board .mg-cells i.bad { color: var(--mk-danger, #d93f3f); }
/* good and bad also differ by shape, not by colour alone */
#hud .mg-board .mg-cells i.good::before { content: '\\2713\\a0'; }
#hud .mg-board .mg-cells i.bad::before, #hud .mg-board .mg-flash.bad::before { content: '\\2715\\a0'; }
#hud .mg-board .mg-meter { display: flex; align-items: center; gap: 10px; margin: 6px 0 4px; }
#hud .mg-board .mg-meter[hidden] { display: none; }
#hud .mg-board .mg-meter .mg-bar { position: relative; flex: 1; height: 11px; background: rgba(240,237,228,0.16); border-radius: 2px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(240,237,228,0.18); }
#hud .mg-board .mg-meter i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--mg-acc, var(--mk-ok, #3fc97a)); }
#hud .mg-board .mg-meter em { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1px; background: #f0ede4; box-shadow: 0 0 0 1px rgba(12,20,14,0.7); }
#hud .mg-board .mg-meter-t { min-width: 3.2em; text-align: right; font-size: max(13px, calc(14px * var(--ui, 1))); letter-spacing: 0.5px; color: #f0ede4; }
#hud .mg-board .mg-extra[hidden] { display: none; }
/* #619: de balanstip staat op een eigen regel, los van de puntenflits */
#hud .mg-board .sk-bal { display: block; font: max(13px, calc(13px * var(--ui, 1))) 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.4px; color: var(--mk-job, #ff9a3c); margin: 2px 0 1px; }
/* een tussenstand als echte tabel (#617), geen rij chips */
#hud .mg-board .mg-stand { border-collapse: collapse; margin: 5px 0 2px; font: max(12px, calc(13px * var(--ui, 1))) 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.82); }
#hud .mg-board .mg-stand th, #hud .mg-board .mg-stand td { padding: 1px 9px; font-weight: normal; text-align: right; }
#hud .mg-board .mg-stand th[scope="row"], #hud .mg-board .mg-stand thead th:first-child { text-align: left; }
#hud .mg-board .mg-stand thead th { font-size: 12px; letter-spacing: 1px; color: rgba(240,237,228,0.6); }
#hud .mg-board .mg-stand tr.on { background: rgba(63,201,122,0.18); color: #f0ede4; }
#hud .mg-board .mg-stand tr.weg { opacity: 0.55; }
#hud .mg-board .mg-help { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; font: max(13px, calc(14px * var(--ui, 1))) 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.78); }
#hud .mg-board .hud-key { margin: 0 2px; vertical-align: middle; }
#hud .mg-board .mg-flash { font-size: calc(22px * var(--ui, 1)); letter-spacing: 1.5px; color: var(--mk-ok, #3fc97a); min-height: 1em; }
#hud .mg-board .mg-flash.bad { color: var(--mk-danger, #d93f3f); }
body.mg-on #hud .hud-speedo, body.mg-on #hud .hud-route, body.mg-on #hud .hud-gps, body.mg-on #hud .hud-place, body.mg-on #hud .phonefeed .pf-card { display: none !important; }
/* het stopvenster in de HUD-stijl (#596): Bebas + Arial Narrow, toetsplaatjes en 44 px-knoppen */
.mg-stopask { position: fixed; left: 50%; top: 38%; transform: translateX(-50%); z-index: 60; pointer-events: auto; padding: 14px 22px; border-radius: 10px; background: rgba(12,20,14,0.94); box-shadow: inset 0 0 0 1px rgba(240,237,228,0.16); color: #f0ede4; text-align: center; text-shadow: var(--hud-shadow); }
.mg-stopask b { display: block; font: normal calc(26px * var(--ui, 1))/1.1 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; }
.mg-stopask .mg-stopbtns { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
.mg-stopask button { min-height: 44px; min-width: 44px; padding: 0 18px; border: 0; border-radius: 8px; background: var(--g, #3fc97a); color: var(--gd, #0f5c30); font: normal calc(20px * var(--ui, 1)) 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.04em; cursor: pointer; }
.mg-stopask button[data-do="stop"] { background: var(--mk-danger, #d93f3f); color: #fff; }
.mg-stopask small { display: block; margin-top: 8px; font: max(12px, calc(13px * var(--ui, 1))) 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.72); }
/* smal scherm: de spel-HUD begint rechts van de uitlegkaart (linksboven, 350 px) in plaats van eroverheen (#294) */
@media (max-width: 1500px) { #hud .mg-board { left: calc(var(--hud-edge, 46px) + 372px); transform: none; max-width: calc(100vw / var(--ui, 1) - var(--hud-edge, 46px) - 372px - 330px); } }
@media (max-width: 480px) { #hud .mg-board { top: 64px; left: 50%; transform: translateX(-50%); min-width: 0; max-width: calc(100vw - 32px); } }
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
  disc: `<polygon points="4,17 11,14 18,17 12,20" fill="#17301f"/><polygon points="11,5 18,8.5 18,15.5 11,19 4,15.5 4,8.5" fill="#f0ede4"/><polygon points="11,5 18,8.5 11,12" fill="#ffffff"/><polygon points="11,12 18,15.5 11,19" fill="#cfcbbd"/><polygon points="11,12 4,15.5 4,8.5" fill="#d9d5c6"/>`,
  // golf: de vlag in de hole
  vlag: `<ellipse cx="12" cy="20.5" rx="6" ry="2" fill="#17301f"/><polygon points="12,3 12,20 13.2,20 13.2,3" fill="#f0ede4"/><polygon points="13.2,3.5 21,6.8 13.2,10.2" fill="#d93f3f"/><polygon points="13.2,3.5 21,6.8 13.2,6.8" fill="#ec6b5a"/>`,
  // skatepark: een deck met twee wielen
  skate: `<polygon points="3,10 20,7.5 21.5,11.5 4.5,14" fill="#f0ede4"/><polygon points="4.5,14 21.5,11.5 21.5,12.8 4.5,15.3" fill="#cfcbbd"/><polygon points="7,15.3 9.4,15 9.4,18 7,18.3" fill="#17301f"/><polygon points="16,13.6 18.4,13.3 18.4,16.3 16,16.6" fill="#17301f"/>`,
  // karten: de geblokte finishvlag
  kart: `<polygon points="3,2.5 4.6,2.5 4.6,21.5 3,21.5" fill="#cfcbbd"/><polygon points="4.6,3 21,3 21,13.5 4.6,13.5" fill="#f0ede4"/><polygon points="4.6,3 8.7,3 8.7,8.2 4.6,8.2" fill="#17301f"/><polygon points="12.8,3 16.9,3 16.9,8.2 12.8,8.2" fill="#17301f"/><polygon points="8.7,8.2 12.8,8.2 12.8,13.5 8.7,13.5" fill="#17301f"/><polygon points="16.9,8.2 21,8.2 21,13.5 16.9,13.5" fill="#17301f"/>`,
  // de golfset (golficons.js): bal, wedge, putter, zand, water, beurt, oog en winnaar
  ...GOLF_VORM,
  // #627: drie vlaggetjes (de kermis) en de gondel van het rad
  vlaggen: `<polygon points="3,5 3,20 4.5,20 4.5,5" fill="#cfcbbd"/><polygon points="4.5,5 12,7 4.5,10" fill="#e8523a"/><polygon points="12,3 12,18 13.5,18 13.5,3" fill="#cfcbbd"/><polygon points="13.5,3 21,5 13.5,8" fill="#f2c744"/>`,
  gondel: `<polygon points="9,3 15,3 15,5 9,5" fill="#cfcbbd"/><polygon points="11.4,5 12.6,5 12.6,15 11.4,15" fill="#cfcbbd"/><polygon points="5,16 19,16 16.5,21 7.5,21" fill="#f0ede4"/><polygon points="7.5,17.5 16.5,17.5 16.5,19 7.5,19" fill="#b9a27a"/>`,
  // #630: de duif van de duivenmelker
  duif: `<path d="M15.5 5.2a2.6 2.6 0 0 1 2.6 2.1l2.4.9-2.3.9c-.2 2.4-1.3 4.5-3.2 5.9l1 3.5h-1.6l-1-3a8 8 0 0 1-2.4.4l-.6 2.6H8.8l.6-2.9C6 14.6 3.8 12 3.5 8.8c2.4 1.8 5.3 2.4 8.4 1.8L13 7.7a2.6 2.6 0 0 1 2.5-2.5zm.3 1.7a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4z" fill="#f0ede4"/>`,
};

export const MG_THEMA = {
  discgolf: { titel: 'DISCGOLF STADSPARK', accent: '#f08a2e', icoon: 'disc' },
  pitchputt: { titel: 'PITCH & PUTT', accent: '#46b36a', icoon: 'vlag' },
  skatepark: { titel: 'SKATEPARK STADSPARK', accent: '#e8523a', icoon: 'skate' },
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
  vluchtdienst: { titel: 'VLUCHT', accent: '#8fb04a', icoon: 'oog' },
  // de ring: een rondje stad tegen de klok, de richting-pijl in het groen van de startlampen (#618)
  ringrace: { titel: 'RINGRACE', accent: '#1e9e56', icoon: 'beurt' },
  // padel (#599): geen eigen blauw meer; het accent komt uit de bestaande a11y-paletten, het icoon is de bal
  padel: { titel: 'PADEL', accent: '#c068ff', icoon: 'bal' },
  // de arena en de machinist: een wedstrijd met een uitslag (de kroon) en een dienst met een perron (de pijl, #625)
  pvparena: { titel: 'PVP-ARENA', accent: '#c9568a', icoon: 'winnaar' },
  machinist: { titel: 'MACHINIST', accent: '#b3b3a2', icoon: 'beurt' },
  // #596: de twee borden die buiten de tabel vielen: boerenwerk (het weiland) en het vertrekbord.
  boeren: { titel: 'BOERENWERK', accent: '#a3c94a', icoon: 'beurt' }, // hergebruikt het groen van de wandeling
  station: { titel: 'VERTREKBORD', accent: '#b3b3a2', icoon: 'beurt' }, // hergebruikt het perrongrijs van de machinist
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
  const vlak = vormStijl(sfeer.vorm);
  return vlak ? `<span class="mg-vorm" aria-hidden="true" style="${vlak}background-color:${TINT_RGBA[sfeer.tint]};background-repeat:repeat;"></span>` : '';
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
  root.style.setProperty('--mg-acc', kleur || 'var(--mk-ok, #3fc97a)');
  if (thema) root.dataset.mg = title;
  if (sfeer) { root.dataset.sfeer = title; root.dataset.sfeerbord = sfeer.bordvorm; }
  // #596: het vormvlak van de sfeer, uit dezelfde patroontabel als de loopbaanbanden
  const vlak = sfeer ? vormStijl(sfeer.vorm) : '';
  root.hidden = true;
  root.innerHTML = `${vlak ? `<span class="mg-vorm" aria-hidden="true" style="${vlak}background-color:${TINT_RGBA[sfeer.tint]};background-repeat:repeat;"></span>` : ''}<small>${thema ? mgIcoon(thema.icoon) : ''}<span>${titel}</span>${sfeer ? `<em class="mg-sfeer">${sfeer.naam}</em>` : ''}</small>${sfeer ? `<b class="mg-watermark" aria-hidden="true">${sfeer.naam}</b>` : ''}<div class="mg-row"></div><div class="mg-cells" hidden></div><div class="mg-extra" hidden></div><div class="mg-meter" hidden><span class="mg-bar"><i></i><em></em></span><span class="mg-meter-t"></span></div><div class="mg-flash"></div><div class="mg-help"></div>`;
  (document.getElementById('hud') || document.body).appendChild(root);
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
  if (input.wasPressed('backspace')) { input.consume('backspace'); cancelStopAsk(); return true; }
  if (stopAsk) {
    for (const k of ['escape', 'enter']) {
      if (input.wasPressed(k)) { input.consume(k); cancelStopAsk(); return true; }
    }
    if (input.wasPressed(' ')) { input.consume(' '); cancelStopAsk(); }
  } else if (input.wasPressed('escape') && typeof document !== 'undefined') {
    input.consume('escape');
    const el = document.createElement('div');
    el.className = 'mg-stopask';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', 'Stoppen?');
    // #596: het venster staat in de HUD-stijl, met echte knoppen zodat touch ook een uitweg heeft.
    el.innerHTML = '<b>Stoppen?</b><div class="mg-stopbtns" role="group" aria-label="Stoppen?">' +
      '<button type="button" data-do="door">Doorgaan</button><button type="button" data-do="stop">Stoppen</button></div>' +
      '<small>Esc of Enter = stoppen &middot; Spatie = doorgaan</small>';
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


