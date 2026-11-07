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

import { P0, P1, P2, P3, CARD_P, cardPrio, cardZone, mayShow as busMayShow } from './hudbus.js';

export { P0, P1, P2, P3, CARD_P, cardPrio, cardZone };

export const ZONES = {
  A: 'Berichten', B: 'Missiestatus', C: 'Status', D: 'Vrij',
  E: 'Radio', F: 'Kaart + jij', G: 'Doel + ondertitels', H: 'Voertuig + toetsen',
};

export const HUD_MODES = ['slim', 'alles', 'minimaal'];

// card categories on the P scale and their zones: the table is in hudbus.js

export const STAR_AFTERGLOW = 6;
export const MONEY_SHOW = 5;
export const BAR_SHOW = 3;
export const PLACE_SHOW = 4;
export const E_SHOW = 4;
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

// What shows now. s: the situation (all optional):
//   mode, hidden, banner, busy, dialogue, idle, wake,
//   wanted, wantedAgo, moneyAgo, moneySign (+1/-1), nearShop, moneyHeld,
//   armed, fighting, hpFull, hpAgo, hpLow, stamFull, stamAgo,
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
  show.stars = all || wanted || (s.wantedAgo ?? Infinity) < STAR_AFTERGLOW;
  const moneyRecent = (s.moneyAgo ?? Infinity) < MONEY_SHOW;
  // money coming in is P3: it waits out a busy moment (the caller holds it)
  show.money = all || ((moneyRecent || !!s.nearShop) && !busy && !s.moneyHeld);
  show.weapon = all || !!s.armed || !!s.fighting;
  show.clock = all || !busy;
  out.big.clock = !!(s.specialDay || s.timeGoal);
  const barsMoving = (s.hpAgo ?? Infinity) < BAR_SHOW || (s.stamAgo ?? Infinity) < BAR_SHOW || (s.inVehicle && (s.vehAgo ?? Infinity) < BAR_SHOW);
  show.bars = all || s.hpFull === false || s.stamFull === false || !!s.hpLow || (s.inVehicle && s.vehFull === false) || barsMoving;
  show.vehicle = !!s.inVehicle;
  show.keys = (s.keys | 0) > 0;

  // rust: na een tijd zonder invoer blijft alleen de kaart, met het doel en de
  // routestatus erbij. Het doel gaat er niet meer uit: in de playtest van 27-10
  // zei een speler "ik kan niet meer zien wat ik moet doen", en een missiedoel is
  // nu eenmaal waar de HUD voor is.
  if (!all && (s.idle ?? 0) >= IDLE_AFTER && !s.wake && !wanted && !busy) {
    // 'gps' staat hier bewust niet in het rijtje: die is alleen waar als er een
    // route loopt (hud_panel geeft 'er is een afslagkaart of een reiskaart'), dus
    // een lopende route houdt zijn kaart vanzelf en zonder route valt er niets
    // te bewaren.
    for (const k of ['timer', 'place', 'money', 'weapon', 'clock', 'bars', 'vehicle', 'keys']) show[k] = false;
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
