// Sluizen als mechaniek (#236, #184): elke schutsluis van de provincie (game/sluizen.json,
// scripts/world/sluizen.mjs) heeft twee deuren, seinlichten en een schutcyclus. De cyclus zelf
// (deur dicht, peil gelijk, andere deur open) is locks.js; de routeplanner telt dezelfde
// cyclus als wachttijd (vaarnet.js lockPassage). Hier komen de boten erbij:
//
//   een boot die op een sluis aanvaart (of er stilligt, of toetert) vraagt de sluis;
//   de sluis komt naar zijn kant en zet het sein op groen zodra de deur open is;
//   de boot vaart in; als hij binnen is en de deur vrij is, sluit de deur, het peil gaat naar
//   de andere kant (de boot gaat mee omhoog of omlaag), de andere deur gaat open, groen.
//
// Een dichte of bewegende deur is een muur voor boten (lockGateStop); een deur sluit nooit op
// een boot (de deurzone moet vrij zijn, na CLEAR_MAX_S sluit hij toch en duwt hij de boot weg).
// Een aanvraag van een boot die wegvaart, wegvalt of te lang niet invaart, vervalt. Dat houdt de
// sluis altijd beschikbaar voor wie komt: geen deadlock. Geen scène hier: sluizen3d.js tekent.

import { makeLock, request, enter, stepLock, levelTime, LOCK_TIMING } from './locks.js';

export const SLUIS = {
  REACH: 90,          // m voor de deur waarbinnen een naderende boot de sluis vraagt
  STILL_REACH: 45,    // een boot die stilligt vraagt hem van dichterbij
  MIN_SPEED: 0.6,     // m/s: daaronder ligt een boot stil
  LAT_PAD: 6,         // m naast de kolk waarbinnen een boot "voor de sluis" ligt
  CLEAR_MAX_S: 12,    // s die een deur wacht op een boot in de deurzone
  STALE_S: 150,       // s zonder invaren: de aanvraag vervalt
  MIN_LEN: 24, MAX_LEN: 120,   // m: kolklengte van het mechaniek (OSM tekent soms een heel kanaalstuk)
  GATE_THICK: 0.9,    // m: de dikte van de deur als muur
};

let sluizen = [];
export const getSluizen = () => sluizen;

// Een sluis uit een rij van game/sluizen.json: { id, n, x, y, a, l, w, lv: [peil zijde 0, peil zijde 1] }.
export function makeSluis(row) {
  const len = Math.min(SLUIS.MAX_LEN, Math.max(SLUIS.MIN_LEN, row.l || SLUIS.MIN_LEN));
  const lock = makeLock({ x: row.x, y: row.y, a: row.a || 0, len, width: Math.max(6, row.w || 8), levels: row.lv ? row.lv.slice() : [-2.3, -2.3], name: row.n || '' });
  lock.id = row.id;
  lock.half = len / 2;
  lock.c = Math.cos(lock.a); lock.s = Math.sin(lock.a);
  lock.stuck = 0;        // s dat de cyclus wacht op een vrije deurzone
  lock.sig = ['red', 'red'];
  lock._hint = null;
  lock.born = new Map(); // boot -> tijd van de aanvraag
  lock.leaving = new Set(); // boten die net zijn uitgeschut: tellen niet mee tot ze de kolk uit zijn
  lock.clock = 0;
  updateSignals(lock);
  return lock;
}

export function buildSluizen(rows) {
  sluizen = (rows || []).map(makeSluis);
  return sluizen;
}
export function resetSluizen() { sluizen = []; }
export function _setSluizenForTest(list) { sluizen = list; }

// Waar staat (x, y) ten opzichte van de sluis: u langs de as (0 = midden, - = zijde 0), lat dwars.
export function frameOf(lock, x, y) {
  const dx = x - lock.x, dy = y - lock.y;
  return { u: dx * lock.c + dy * lock.s, lat: -dx * lock.s + dy * lock.c };
}
const sideOfU = (u) => (u < 0 ? 0 : 1);

// Het sein aan een kant: groen alleen als de sluis daar klaar staat met de deur open, geel zodra
// de deur daar opengaat, anders rood.
export function signalOf(lock, side) {
  if (lock.at === side && lock.state === 'ready' && lock.gate[side] >= 1) return 'green';
  if (lock.state === 'opening' && 1 - lock.at === side) return 'amber';
  return 'red';
}
function updateSignals(lock) { lock.sig[0] = signalOf(lock, 0); lock.sig[1] = signalOf(lock, 1); }

// De hoogte (m, t.o.v. het wateroppervlak van de wereld) waarmee een boot in de kolk meegaat:
// hij stijgt of daalt met het peil in de kolk; als de uitgaande deur opengaat zakt dat verschil
// weer weg (buiten tekent de wereld één watervlak).
export function liftOf(lock) {
  if (lock.state === 'levelling') return lock.level - lock.levels[lock.at];
  if (lock.state === 'opening') return (lock.level - lock.levels[lock.at]) * (1 - Math.min(1, lock.t / LOCK_TIMING.GATE_S));
  return 0;
}

// Is een punt (x, y) met de halve boot-afmetingen in de kolk (tussen de deuren)?
export function inChamber(lock, x, y, pad = 0) {
  const f = frameOf(lock, x, y);
  return Math.abs(f.u) <= lock.half + pad && Math.abs(f.lat) <= lock.width / 2 + 1 + pad;
}

// De lift van de sluis waar boot v in ligt, of 0.
export function sluisLiftAt(x, y) {
  for (const k of sluizen) {
    if (Math.abs(x - k.x) > k.half + 10 || Math.abs(y - k.y) > k.half + 10) continue;
    if (k.state !== 'ready' && inChamber(k, x, y)) return liftOf(k);
  }
  return 0;
}

// De sluis voor (x, y) binnen bereik, of null.
export function sluisNear(x, y, reach = SLUIS.REACH + 40) {
  let best = null, bd = reach;
  for (const k of sluizen) {
    const d = Math.hypot(x - k.x, y - k.y) - k.half;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// --- de boot bij de sluis ----------------------------------------------------

const alive = (b, world) => b && !b.wrecked && !b.sinking && (!world || !world.vehicles || world.vehicles.includes(b));
const halfLenOf = (b) => b.halfLen || (b.model && b.model.len ? b.model.len / 2 : 3);

// Moet boot v de sluis vragen? Hij ligt voor de deur (op de as, tot REACH), vaart erheen of ligt stil.
export function boatWants(lock, v) {
  const f = frameOf(lock, v.x, v.y);
  if (Math.abs(f.lat) > lock.width / 2 + SLUIS.LAT_PAD) return null;
  const out = Math.abs(f.u) - lock.half;           // afstand tot de deur (< 0: in de kolk)
  if (out > SLUIS.REACH || out < -lock.half) return null;
  const side = sideOfU(f.u);
  if (out <= 0) return side;
  const sp = v.speed || 0;
  if (Math.abs(sp) < SLUIS.MIN_SPEED) return out < SLUIS.STILL_REACH ? side : null;
  const vu = Math.cos(v.angle) * lock.c * sp + Math.sin(v.angle) * lock.s * sp;
  const toward = side === 0 ? vu : -vu;            // > 0: naar de sluis toe
  return toward > 0 ? side : null;
}

// De toeter in een boot vraagt de sluis vóór je.
export function hornSluis(v) {
  const k = sluisNear(v.x, v.y, SLUIS.REACH);
  if (!k) return null;
  const f = frameOf(k, v.x, v.y);
  request(k, sideOfU(f.u), v);
  k.born.set(v, k.clock);
  return k;
}

// De deurzone aan zijde s: ligt daar een boot (de deur zou erop sluiten)?
function gateBusy(lock, s, world) {
  const gu = s ? lock.half : -lock.half;
  for (const v of (world && world.vehicles) || []) {
    if (!v.isBoat || !alive(v, world)) continue;
    const f = frameOf(lock, v.x, v.y);
    if (Math.abs(f.lat) > lock.width / 2 + 2) continue;
    if (Math.abs(f.u - gu) < Math.min(halfLenOf(v), lock.half * 0.6) + 1.5) return true;
  }
  return false;
}

// Is de boot geheel in de kolk?
const fullyIn = (lock, v) => {
  const f = frameOf(lock, v.x, v.y);
  return Math.abs(f.lat) <= lock.width / 2 + 1 && Math.abs(f.u) <= Math.max(lock.half - halfLenOf(v) - 1.5, lock.half * 0.35);
};

// Eén stap van één sluis met de boten van de wereld.
export function stepSluis(lock, dt, world = null) {
  lock.clock += dt;
  const boats = world && world.vehicles ? world.vehicles.filter((v) => v.isBoat && alive(v, world)) : [];

  // aanvragen: wie voor de deur ligt of aanvaart
  for (const v of lock.leaving) if (!alive(v, world) || !inChamber(lock, v.x, v.y, 2)) lock.leaving.delete(v);
  for (const v of boats) {
    if (lock.leaving.has(v)) continue;
    const side = boatWants(lock, v);
    if (side === null) continue;
    if (!lock.queue.some((q) => q.who === v)) { request(lock, side, v); lock.born.set(v, lock.clock); }
  }
  // aanvragen die vervallen: de boot is weg of vaart niet in
  lock.queue = lock.queue.filter((q) => {
    if (!q.who) return true;
    if (!alive(q.who, world)) { lock.born.delete(q.who); return false; }
    if (q.inside) return true;
    const f = frameOf(lock, q.who.x, q.who.y);
    const far = Math.abs(f.u) - lock.half > SLUIS.REACH + 40 || Math.abs(f.lat) > lock.width / 2 + SLUIS.LAT_PAD + 30;
    const age = lock.clock - (lock.born.get(q.who) ?? lock.clock);
    if (far || (q.side === lock.at && lock.state === 'ready' && age > SLUIS.STALE_S)) { lock.born.delete(q.who); return false; }
    return true;
  });
  // wie binnen is (de deur aan zijn kant stond open), gaat mee naar de andere kant
  if (lock.state === 'ready') {
    for (const v of boats) {
      if (lock.leaving.has(v) || !fullyIn(lock, v)) continue;
      const q = lock.queue.find((e) => e.who === v);
      if (q && q.inside) continue;
      if (!q) { request(lock, lock.at, v); lock.born.set(v, lock.clock); }
      else if (q.side !== lock.at) continue;   // wacht aan de andere kant op de sluis, ligt hier toevallig in de kolk
      enter(lock, v);
    }
  }
  // een boot die in de kolk ligt terwijl de sluis aan de andere kant staat (na een teleport of
  // een gezonken wrak) vraagt de kant waar hij het dichtst bij is, zodat de sluis hem uitlaat
  if (lock.state === 'ready') {
    for (const v of boats) {
      if (lock.leaving.has(v) || !inChamber(lock, v.x, v.y)) continue;
      const f = frameOf(lock, v.x, v.y), side = sideOfU(f.u);
      if (side !== lock.at && lock.gate[side] < 1 && !lock.queue.some((q) => q.who === v)) { request(lock, side, v); lock.born.set(v, lock.clock); }
    }
  }

  // de cyclus: de deur sluit niet op een boot in de deurzone
  if (lock.state === 'ready') {
    const want = lock.queue.some((q) => q.side !== lock.at || q.inside);
    if (want && gateBusy(lock, lock.at, world) && lock.stuck < SLUIS.CLEAR_MAX_S) {
      lock.stuck += dt;
      lock.t = Math.min(lock.t + dt, 4);   // blijft staan tot de zone vrij is
      updateSignals(lock);
      return;
    }
    if (!want) lock.stuck = 0;
  }
  const was = lock.state, inside = was === 'opening' ? lock.queue.filter((q) => q.inside).map((q) => q.who) : null;
  stepLock(lock, dt);
  if (was === 'opening' && lock.state === 'ready') for (const v of inside) if (v) lock.leaving.add(v);
  if (lock.state !== 'ready') lock.stuck = 0;
  updateSignals(lock);
}

// De seinen en de tekst voor wie in de buurt is (zoals de brug: één melding per verandering).
export const SLUIS_HINT = { red: 'Sluis: wacht op groen', amber: 'Sluis: de deur gaat open', green: 'Sluis: groen, invaren' };
function hintNear(lock, world) {
  const p = world && world.player;
  if (!p || !world.addMessage) return;
  const v = p.inVehicle;
  if (!v || !v.isBoat) return;
  const f = frameOf(lock, v.x, v.y);
  if (Math.abs(f.u) > lock.half + SLUIS.REACH || Math.abs(f.lat) > lock.width / 2 + SLUIS.LAT_PAD) return;
  const side = sideOfU(f.u);
  const sig = lock.sig[side], key = side + sig + (lock.queue.some((q) => q.who === v) ? 'q' : '');
  if (lock._hint === key) return;
  lock._hint = key;
  if (sig === 'red' && !lock.queue.some((q) => q.who === v)) return;   // nog niet gevraagd: geen melding
  world.addMessage(SLUIS_HINT[sig], 3, { kind: 'tip' });
}

export function updateSluizen(dt, world) {
  if (!sluizen.length || dt <= 0) return;
  const p = world && world.player;
  const px = p ? (p.inVehicle || p).x : 0, py = p ? (p.inVehicle || p).y : 0;
  for (const k of sluizen) {
    // ver van de speler: niets vragen, de sluis staat stil (een schutcyclus loopt wel af)
    const far = !p || Math.abs(px - k.x) > 1500 || Math.abs(py - k.y) > 1500;
    if (far && k.state === 'ready' && !k.queue.length) { updateSignals(k); continue; }
    stepSluis(k, dt, far ? null : world);
    hintNear(k, world);
  }
}

// --- deuren als muren --------------------------------------------------------

// Staat de deur aan zijde s dicht of in beweging (de boot kan er niet door)?
export const gateShut = (lock, s) => lock.gate[s] < 0.98;

// De drie punten van de romp (achter, midden, voor) van een boot in een pose.
function hullPoints(v, x, y, a) {
  const hl = halfLenOf(v) * 0.9, c = Math.cos(a), s = Math.sin(a);
  return [[x - c * hl, y - s * hl], [x, y], [x + c * hl, y + s * hl]];
}

// Raakt de verplaatsing van boot v van (px, py, pa) naar zijn huidige pose een dichte deur? Dan
// moet de aanroeper de verplaatsing terugdraaien. Een boot die al in de deur ligt (hij sloot er net)
// mag wel van de deur af bewegen.
export function lockGateStop(v, px, py, pa) {
  if (!sluizen.length) return false;
  for (const k of sluizen) {
    const reach = k.half + 12;
    if (Math.abs(v.x - k.x) > reach && Math.abs(px - k.x) > reach) continue;
    if (Math.abs(v.y - k.y) > reach && Math.abs(py - k.y) > reach) continue;
    for (const s of [0, 1]) {
      if (!gateShut(k, s)) continue;
      const gu = s ? k.half : -k.half, lim = k.width / 2 + 0.6;
      const before = hullPoints(v, px, py, pa), after = hullPoints(v, v.x, v.y, v.angle);
      for (let i = 0; i < 3; i++) {
        const fb = frameOf(k, before[i][0], before[i][1]), fa = frameOf(k, after[i][0], after[i][1]);
        const db = fb.u - gu, da = fa.u - gu;
        if (Math.abs(fa.lat) > lim && Math.abs(fb.lat) > lim) continue;
        if ((db < 0) !== (da < 0)) return true;                       // dwars door de deur
        if (Math.abs(da) < SLUIS.GATE_THICK && Math.abs(da) < Math.abs(db)) return true;   // tegen de deur aan
      }
    }
  }
  return false;
}

// De wachttijd die een boot hier ongeveer heeft (s), voor een melding of de kaart.
export function waitEstimate(lock, side) {
  if (lock.at === side && lock.state === 'ready') return 0;
  const cyc = LOCK_TIMING.GATE_S * 2 + levelTime(lock) + 4;
  return Math.round(lock.at === side ? cyc : cyc * 1.5);
}
