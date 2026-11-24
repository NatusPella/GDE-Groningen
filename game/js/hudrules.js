// The HUD's layout rules (the approved "HUD-regels" design): eight fixed
// zones, at most one thing per zone, four priorities, and what may show when.
// Pure logic, no DOM: hud_panel.js feeds it the situation every few frames
// and applies the answer as classes; scripts/hud_test.mjs checks the rules.
//
// Zones (screen position in hud_panel.css):
//   A  top left      messages: call > text > tip, one card, "+N in de wacht"
//   B  top centre    timer + GPS turn > GPS turn > a new place name
//   C  top right     stars > money (+/-) > weapon > clock
//   D  centre        free: crosshair and the P0 banners only
//   E  left middle   achievement > radio station
//   F  bottom left   minimap, street, health, vehicle damage
//   G  bottom centre subtitle > objective (the objective dims under a subtitle)
//   H  bottom right  speed, gear, rpm > at most two key hints
//
// Priorities:
//   P0  mission passed/failed, dead, busted (a banner in D, the rest dims),
//       dangers and the police; almost no health is a red edge
//   P1  the mission: B and G, story calls and texts, mission cards
//   P2  status: stars (C), the map and you (F), the vehicle and keys (H),
//       money taken off, the weapon in a fight, other texts
//   P3  tips, E, the place name, money coming in
//
// Busy (a chase, a fight, a race): only P0, P1 (B, G) and P2 (stars, F, H)
// show; P3 waits until it is quiet again, at most 30 s, then it lapses.
// Rest ("Slim"): after 8 s without input only the minimap, the objective and a
// running route card stay (playtest 27-10: the goal must never disappear); a key
// or the pause menu brings everything back for a moment.
// Ceiling: at most 6 elements besides the minimap; over that P3 goes first,
// then the clock, then the money. Of what talks (a message, the radio or an
// achievement, a subtitle) at most two show at once: the P3 one gives way.
// Never: cutscenes, photo mode, the big map. "Minimaal": stars, objective,
// subtitles and P0 only, plus the navigational minimum (the minimap and the
// speedometer in a vehicle): a mode that promises calm must not take the wheel away (#638).
import { labelDy } from './promptclear.js';

import { P0, P1, P2, P3, CARD_P, cardPrio, cardZone, mayShow as busMayShow } from './hudbus.js';

export { P0, P1, P2, P3, CARD_P, cardPrio, cardZone };

export const ZONES = {
  A: 'Berichten', B: 'Missiestatus', C: 'Status', D: 'Vrij',
  E: 'Radio', F: 'Kaart + jij', G: 'Doel + ondertitels', H: 'Voertuig + toetsen',
};

export const HUD_MODES = ['slim', 'alles', 'minimaal'];

// UX-audit 23-11 (S6): "Volg de gele route ..." onder het doel herhaalt wat de minimap en de marker al tonen. De eerste
// ROUTE_HINTS verhaaldoelen staat hij er (je leert de gele route kennen), daarna alleen nog regels die iets anders zeggen
// (Je bent er, loop naar binnen, stap uit de marker).
export const ROUTE_HINTS = 3;
export function storySubLine(sub, shown) {
  if (shown > ROUTE_HINTS && /^Volg de gele route\b/.test(String(sub || '')) && !/ · /.test(sub)) return '';
  return sub || '';
}

// card categories on the P scale and their zones: the table is in hudbus.js

// #995: wat bij behoefte verschijnt, blijft 4 s staan na de laatste verandering
export const MONEY_SHOW = 4;
export const BAR_SHOW = 4;
export const WEAPON_SHOW = 4;
export const PLACE_SHOW = 4;
// #975: een radiomelding met titel, artiest en zender was na vier seconden weg; te kort om
// te lezen. De leestijd groeit mee met de tekst en heeft een ruime ondergrens.
export const NP_MIN = 6.5;
export const NP_MAX = 10;
export function nowPlayingSeconds(np) {
  if (!np) return NP_MIN;
  const tekst = [np.station, np.programme, np.title, np.artist].filter(Boolean).join(' · ');
  const lees = 2.2 + 0.05 * String(tekst).length;
  return Math.min(NP_MAX, Math.max(NP_MIN, lees));
}
export const IDLE_AFTER = 8;
export const WAKE_FOR = 4;
export const DEFER_MAX = 30;
export const CEILING = 6;
export const GPS_NEAR = 400;

// May an item of priority p start now? The rule is in hudbus.js (mayShow('hud', ...)).
export const mayShow = (p, ctx) => busMayShow('hud', { p, ...ctx });

// A deferred item (P3 during a busy moment): waits while held, lapses after
// DEFER_MAX seconds of waiting. tick() returns 'show', 'wait' or 'drop'.
export class Deferred {
  constructor(max = DEFER_MAX) { this.max = max; this.waited = 0; this.item = null; }
  offer(item) { this.item = item; this.waited = 0; }
  clear() { this.item = null; this.waited = 0; }
  tick(dt, held) {
    if (!this.item) return 'none';
    if (!held) return 'show';
    this.waited += dt;
    if (this.waited >= this.max) { this.item = null; return 'drop'; }
    return 'wait';
  }
}

// One slot per zone; a waiting item of a higher priority shortens the holder.
export class ZoneBoard {
  constructor() { this.hold = {}; this.wants = {}; }
  occupant(zone) { return this.hold[zone] || null; }
  free(zone, owner) { const h = this.hold[zone]; return !h || h.owner === owner; }
  occupy(zone, owner, prio) { if (!this.free(zone, owner)) return false; this.hold[zone] = { owner, prio }; return true; }
  vacate(zone, owner) { if (this.hold[zone] && this.hold[zone].owner === owner) delete this.hold[zone]; }
  // the number waiting per owner (a higher priority waiting pressures the holder)
  setWaiting(zone, owner, n, prio = P3) { (this.wants[zone] ||= {})[owner] = { n, prio }; }
  waiting(zone) { return Object.values(this.wants[zone] || {}).reduce((s, w) => s + (w.n | 0), 0); }
  // someone else waits with a higher priority than the holder
  pressured(zone, owner) {
    const h = this.hold[zone];
    if (!h || h.owner !== owner) return false;
    return Object.entries(this.wants[zone] || {}).some(([o, w]) => o !== owner && w.n > 0 && w.prio < h.prio);
  }
  reset() { this.hold = {}; this.wants = {}; }
}

export const zones = new ZoneBoard();

// the live situation flags the modules share (hud_panel.js writes them)
export const hudNow = { busy: false, dialogue: false };

// Twee vakken op het scherm (left/right/top/bottom): raken ze elkaar?
const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// De prestatiekaart van achievements.js hangt boven het midden van het scherm,
// waar net zo goed een interactiehint van prompts.js kan staan: op de
// gezocht-beelden van #463 zat de E-badge van "FLUIT EEN DUIF" half achter
// "PRESTATIE ONTGRENDELD" en was de ondertitel afgekapt. Een hint hoort bij wat
// je nu kunt doen, dus die gaat voor: raakt de kaart er een, dan wacht de kaart
// (en komt terug zodra de hint weg is). Staat de hint elders, dan blijft de
// kaart gewoon staan; een hint achter het treinpaneel kost de speler zijn
// prestatie dus niet. hud_panel.js geeft de gemeten vakken door.
// #638: de voertuignaam staat boven een zichtbaar racepaneel in de gemeten rechterkolom.
// raceTop is de bovenkant van het racepaneel in beeld; viewH de vensterhoogte. Geeft de CSS-bottom.
export function vehnameBottom({ raceTop = null, viewH = 720, gap = 8 } = {}) {
  if (!Number.isFinite(raceTop) || !Number.isFinite(viewH)) return null;
  return Math.max(0, Math.round(viewH - raceTop + gap));
}

export function cardYields(card, hints = []) {
  return !!card && hints.some((h) => !!h && hits(card, h));
}

// #870: een tekstbel hangt met translate(-50%,-100%) aan zijn ankerpunt: (x, y)
// is het midden van de onderkant. Staat de spreker buiten beeld, dan valt de bel
// daar ook buiten (op 800x360 stonden twee bubbels op y=441 en 483). Deze regel
// verbergt een bel die helemaal buiten beeld valt en houdt een half zichtbare
// bel met zijn echte maat binnen de randen. `size` en `view` zijn in dezelfde
// eenheid als het anker (HUD-px binnen #hud).
// #985: the HUD parts a speech bubble stays clear of (prompts.js measures them); empty without a HUD
let bubbleObstacles = [];
export function setBubbleObstacles(list) { bubbleObstacles = Array.isArray(list) ? list : []; }
// #1198 (beeld 24-11): two speakers close together put their bubbles over each other (the second one hid the first). `placed`
// holds the bubbles already set this frame ({ left, top, right, bottom }); a bubble that would cover one of them stacks above it
// with BUBBLE_GAP, or under it when there is no room above. Same unit as the anchor.
export const BUBBLE_GAP = 4;
export function bubbleStack(p, size, view, placed, pad = 4) {
  if (!p || !placed || !placed.length) return p;
  let y = p.y;
  const left = p.x - size.w / 2, right = p.x + size.w / 2;
  const hit = (yy) => placed.find((o) => Math.min(right, o.right) - Math.max(left, o.left) > 2 && Math.min(yy, o.bottom) - Math.max(yy - size.h, o.top) > 2);
  for (let i = 0; i < placed.length; i++) {
    const o = hit(y);
    if (!o) return y === p.y ? p : { x: p.x, y };
    const boven = o.top - BUBBLE_GAP;
    y = boven - size.h >= pad ? boven : o.bottom + BUBBLE_GAP + size.h;
    if (y > view.h - pad) return p; // no room either way: leave it where it was
  }
  return hit(y) ? p : { x: p.x, y };
}
export function bubblePlace(anchor, size, view, pad = 4, placed = null) {
  let p = bubblePlace0(anchor, size, view, pad);
  if (!p) return p;
  if (bubbleObstacles.length) {
    const dy = labelDy({ left: p.x - size.w / 2, right: p.x + size.w / 2, top: p.y - size.h, bottom: p.y }, bubbleObstacles, view);
    if (dy) p = { x: p.x, y: p.y + dy };
  }
  return bubbleStack(p, size, view, placed, pad);
}
function bubblePlace0(anchor, size, view, pad = 4) {
  const ax = anchor && Number(anchor.x), ay = anchor && Number(anchor.y);
  const bw = size && Number(size.w), bh = size && Number(size.h);
  const vw = view && Number(view.w), vh = view && Number(view.h);
  if (![ax, ay, bw, bh, vw, vh].every(Number.isFinite) || bw <= 0 || bh <= 0 || vw <= 0 || vh <= 0) return null;
  if (ax < 0 || ax > vw || ay < 0 || ay > vh) return null;
  if (bw + 2 * pad > vw || bh + 2 * pad > vh) return null;
  return {
    x: Math.max(bw / 2 + pad, Math.min(vw - bw / 2 - pad, ax)),
    y: Math.max(bh + pad, Math.min(vh - pad, ay)),
  };
}

// The ground a speech bubble stands on (#1198): the speaker's own ground height (gz of a pedestrian or the player), else
// the ground at a fixed speaker, else 0. The bubble used p.h (about 2.1 m) above 0, so a speaker on a dike or a terp had it
// in his chest and one in a dip had it floating far above his head.
export function bubbleBase(src, map = null) {
  if (src && Number.isFinite(src.gz)) return src.gz;
  if (src && map && typeof map.groundHeightAt === 'function') {
    try { const g = map.groundHeightAt(src.x, src.y, 0); if (Number.isFinite(g)) return g; } catch (e) { /* no ground: 0 */ }
  }
  return 0;
}

// De plaats van een bel als transform (compositorlaag, geen layout): de bel staat op left/top 0 en schuift met translate; de
// ankermaat (-50%, -100%) zit erin. Dezelfde plek als left/top + translate(-50%, -100%) eerder gaf.
export function bubbleTransform(x, y) {
  return 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -100%)';
}

// What shows now. s: the situation (all optional):
//   mode, hidden, banner, busy, dialogue, idle, wake,
//   wanted, wantedAgo, moneyAgo, moneySign (+1/-1), nearShop, moneyHeld,
//   armed, fighting, weaponAgo, hpFull, hpAgo, hpLow, stamFull, stamAgo,
//   inVehicle, vehFull, vehAgo,
//   timer, gps, place, specialDay, timeGoal,
//   objective, subtitle, cardA (its P or null), cardE (P or null), keys (count)
// Returns { show: { id: bool }, big: { clock }, dimObjective, dimAll, count }.
export function decideHud(s = {}) {
  const mode = HUD_MODES.includes(s.mode) ? s.mode : 'slim';
  const show = {
    cardA: false, timer: false, gps: false, place: false, stars: false, money: false, weapon: false, clock: false,
    cardE: false, minimap: false, street: false, bars: false, vehicle: false, keys: false, objective: false, subtitle: false,
  };
  const out = { show, big: { clock: false }, dimObjective: false, dimAll: !!s.banner, count: 0, mode };
  if (s.hidden) return out;
  const wanted = (s.wanted | 0) > 0;
  const busy = !!s.busy;
  const p0Card = s.cardA != null && s.cardA <= P0;

  if (mode === 'minimaal') {
    show.stars = wanted;
    show.objective = !!s.objective;
    show.subtitle = !!s.subtitle;
    show.minimap = true;            // #638: zonder kaart moet je blind navigeren
    show.vehicle = !!s.inVehicle;   // en zonder snelheidsmeter blind rijden
    show.cardA = p0Card;
    // #985: de klok van een lopende missie of klus hoort bij het doel, en op een dag met een
    // evenement (kermis, reuzenrad, carbid) ook de tijd van de dag: anders mist de rustige stand
    // precies wat een tijdstip vraagt
    show.timer = !!s.timer;
    show.clock = !!(s.specialDay || s.timeGoal);
    out.big.clock = show.clock;
    out.dimObjective = !!s.subtitle;
    out.count = countShown(show);
    return out;
  }

  const all = mode === 'alles';
  show.minimap = true;
  show.street = true;
  show.subtitle = !!s.subtitle;
  show.objective = !!s.objective;
  out.dimObjective = !!s.subtitle;
  show.cardA = s.cardA != null && mayShow(s.cardA, { busy, dialogue: s.dialogue, zone: 'A' });
  show.cardE = s.cardE != null && mayShow(s.cardE, { busy, dialogue: s.dialogue, zone: 'E' });
  show.timer = !!s.timer;
  show.gps = !!s.gps;
  // the place name: only when B has nothing else, never under a mission timer, not while busy
  show.place = !!s.place && !show.timer && !show.gps && !busy;
  // #1080: één wanted-weergave; de sterren staan er alleen bij 1 ster of meer, ook in Alles (geen lege rij bij 0)
  show.stars = wanted;
  const moneyRecent = (s.moneyAgo ?? Infinity) < MONEY_SHOW;
  // money coming in is P3: it waits out a busy moment (the caller holds it)
  show.money = all || ((moneyRecent || !!s.nearShop) && !busy && !s.moneyHeld);
  // het wapen komt bij een wissel of nieuwe munitie, en zolang je de vuurknop vasthoudt (fighting)
  show.weapon = all || (s.weaponAgo ?? Infinity) < WEAPON_SHOW || !!s.fighting;
  show.clock = all || !busy;
  out.big.clock = !!(s.specialDay || s.timeGoal);
  const barsMoving = (s.hpAgo ?? Infinity) < BAR_SHOW || (s.stamAgo ?? Infinity) < BAR_SHOW || (s.inVehicle && (s.vehAgo ?? Infinity) < BAR_SHOW);
  show.bars = all || !!s.hpLow || s.stamFull === false || (s.inVehicle && s.vehFull === false) || barsMoving;
  show.vehicle = !!s.inVehicle;
  show.keys = (s.keys | 0) > 0;

  // rust: na een tijd zonder invoer blijft alleen de kaart, met het doel en de
  // routestatus erbij. Het doel gaat er niet meer uit: in de playtest van 27-10
  // zei een speler "ik kan niet meer zien wat ik moet doen", en een missiedoel is
  // nu eenmaal waar de HUD voor is. De klok van een lopende missie of klus blijft
  // staan: die loopt door terwijl je wacht, dus hem juist bij stilstand verbergen
  // liet spelers de tijd verliezen zonder dat ze het zagen.
  if (!all && (s.idle ?? 0) >= IDLE_AFTER && !s.wake && !wanted && !busy) {
    // 'gps' staat hier bewust niet in het rijtje: die is alleen waar als er een
    // route loopt (hud_panel geeft 'er is een afslagkaart of een reiskaart'), dus
    // een lopende route houdt zijn kaart vanzelf en zonder route valt er niets
    // te bewaren.
    // de snelheidsmeter gaat er niet uit: stilstaan of cruisen is geen niets doen (eigenaar 21-11: 'ik zie de snelheidsmeter niet meer')
    for (const k of ['place', 'money', 'weapon', 'clock', 'bars', 'keys']) show[k] = false;
    // de balken blijven bij lage gezondheid: een speler die stil staat en bloedt moet dat zien
    if (s.hpLow || (s.hpFull === false && (s.hpAgo ?? Infinity) < BAR_SHOW)) show.bars = true;
    if (show.cardE) show.cardE = false;
  }

  // what talks: at most two of a message, the radio or an achievement, and a subtitle
  if (!all && show.cardA && show.cardE && show.subtitle) {
    if ((s.cardE ?? P3) >= (s.cardA ?? P3)) show.cardE = false; else show.cardA = false;
  }
  // the ceiling: P3 first, then the clock, then the money
  if (!all) {
    const drops = [['place', 'cardE', 'cardA3'], ['clock'], ['money'], ['keys'], ['weapon']];
    for (const group of drops) {
      if (countShown(show) <= CEILING) break;
      for (const k of group) {
        if (k === 'cardA3') { if (show.cardA && s.cardA >= P3) show.cardA = false; } else show[k] = false;
        if (countShown(show) <= CEILING) break;
      }
    }
  }
  out.count = countShown(show);
  return out;
}

// Elements on screen besides the minimap (F's street is part of the map block).
const COUNTED = ['cardA', 'timer|gps|place', 'stars', 'money', 'weapon', 'clock', 'cardE', 'bars', 'vehicle', 'keys', 'objective', 'subtitle'];
export function countShown(show) {
  let n = 0;
  for (const k of COUNTED) if (k.split('|').some((x) => show[x])) n++;
  return n;
}
