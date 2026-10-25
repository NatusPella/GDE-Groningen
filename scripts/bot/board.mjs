// Spelbot (#312): een board-stage met een voertuig, zonder Electron of DOM: welk voertuig, waar
// instappen (bij de deur aan de kant van de speler, niet op het dak) en hoe lang een poging mag
// duren. bot.page.js krijgt deze functies via run.mjs (als window.__botBoard) en drukt alleen
// toetsen en timing; de spellogica blijft in game/js.
// De maten komen uit vehicle.js (distToVehicleBody, ENTER_REACH 1,8 m, een boot +1,2 m, een fiets
// 0,7 keer) en uit playerapi.js (nearby.vehicles: kind, mission, free, occupied, distance).
// Tests: scripts/botlogic_test.mjs (deze functies) en scripts/bot/sim_board.mjs (een simulatie).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const key = (v) => Math.round(v.x * 10) / 10 + ',' + Math.round(v.y * 10) / 10;

export const BOARD = {
  reach: 1.8,      // vehicle.js ENTER_REACH
  pad: 0.6,        // de deur staat een halve meter van de romp: daar wacht de prompt
  range: 60,       // verder dan dit loopt de bot niet voor een voertuig van de stage
  attemptS: 35,    // een poging (lopen + instappen) duurt hooguit 35 s
  tries: 6,        // zoveel keer E op één plek; daarna laat het voertuig de bot niet in
  waitS: 1.2,      // na E even wachten voor de volgende druk
  stallS: 5,       // de deur niet dichterbij (hek, muur): de andere kant op
  skipS: 60,       // een voertuig waar E niet werkt even overslaan
  driveS: 420,     // na het instappen: zolang zonder voortgang is het doel niet gehaald
  progress: 4,     // zoveel meter dichterbij telt als voortgang
};

// De rompafstand van een punt tot een voertuig, precies als vehicle.js distToVehicleBody.
export function bodyDistance(v, p) {
  const c = Math.cos(v.angle || 0), s = Math.sin(v.angle || 0);
  const dx = p.x - v.x, dy = p.y - v.y;
  const lx = Math.abs(dx * c + dy * s) - (v.halfLen || 2);
  const ly = Math.abs(dy * c - dx * s) - (v.halfWid || 1);
  return Math.hypot(Math.max(0, lx), Math.max(0, ly));
}

// Waar de bot moet staan om in te stappen: bij de deur (het midden van de wagen, niet de bumper),
// een halve meter van de romp, aan de kant waar hij zelf staat. `side` (-1 of 1) dwingt een kant af.
export function approachPoint(v, from, side = 0) {
  const hl = v.halfLen || 2, hw = v.halfWid || 1;
  const c = Math.cos(v.angle || 0), s = Math.sin(v.angle || 0);
  const dx = from.x - v.x, dy = from.y - v.y;
  const along = dx * c + dy * s;
  const across = -dx * s + dy * c;
  const kant = side || (across >= 0 ? 1 : -1);
  const deur = clamp(along, -hl * 0.5, hl * 0.5);
  const af = hw + BOARD.pad;
  return { x: v.x + c * deur - s * kant * af, y: v.y + s * deur + c * kant * af, side: kant, door: deur };
}

// Welk voertuig van een board-stage: het eigen voertuig van de missie (missionCar) wint, dan een
// vrije wagen bij de marker, dan de dichtstbijzijnde. Een auto met bestuurder is autodiefstal (de
// politie zit meteen achter de bot aan), een fiets of scooter is zelden wat de stage wil, een boot
// of heli alleen als de missie hem zelf neerzet. `mem.skip` onthoudt een voertuig waar E niet werkt.
export function pickVehicle(s, mem = {}) {
  const t = s.target, now = Number.isFinite(s.t) ? s.t : 0;
  const list = (s.nearby && s.nearby.vehicles) || [];
  const skip = mem.skip || {};
  let best = null, bestScore = Infinity, why = '';
  for (const c of list) {
    if (!c.free && !c.mission) continue;                 // wrak, politie of zinkend
    if (c.occupied && !c.mission) continue;              // iemand aan het stuur
    if ((skip[key(c)] || 0) > now) continue;
    if (c.distance > BOARD.range) continue;
    let score = c.distance;
    const bijMarker = !!(t && Number.isFinite(t.x) && Math.hypot(c.x - t.x, c.y - t.y) < 8);
    if (c.mission) score -= 40;
    if (bijMarker) score -= 20;
    if (c.kind === 'fiets' || c.kind === 'scooter') score += 30;
    if (!c.drivable && !c.mission) score += 20;
    if (score < bestScore) {
      bestScore = score;
      best = c;
      why = c.mission ? 'missievoertuig' : bijMarker ? 'bij de marker' : 'dichtstbij';
    }
  }
  return best ? { vehicle: best, why } : null;
}

// Een druk op E telt mee voor deze poging (de pagina drukt alleen als het spel het toelaat).
export function pressed(mem, now) { mem.presses = (mem.presses || 0) + 1; mem.pressAt = now; }

// Een druk op E die niet instapte: na drie keer op dezelfde plek doet dit voertuig het even niet.
export function missed(mem, v, now) {
  mem.nearMiss = (mem.nearMiss || 0) + 1;
  if (mem.nearMiss >= 3) {
    (mem.skip = mem.skip || {})[key(v)] = now + BOARD.skipS;
    mem.nearMiss = 0;
  }
}

// Eén tik van een board-stage. s = { player: { x, y, vehicle }, vehicle, wrongVehicle }; geeft
// { type }: 'walk' (naar `to`), 'enter' (bij de deur: E), 'wait' (net op E gedrukt of geen
// voertuig), 'exit' (in het verkeerde voertuig) of 'giveup' (time-out per poging; de pagina logt
// dat als 'timeout' en laat de reddingsladder overnemen). `drove` zet de klok van de rit erna.
export function boardStep(s, mem, now = Number.isFinite(s.t) ? s.t : 0) {
  const p = s.player || {};
  const veh = p.vehicle;
  if (veh) {
    // in een verkeerd voertuig (de fiets van de vorige stap, een auto naast de quad): eruit, één keer
    if (s.wrongVehicle) {
      if ((p.speed || 0) >= 3) return { type: 'wait', why: 'rijdt nog' };
      if (mem.wrongAt == null) mem.wrongAt = now;
      if (now - mem.wrongAt < 4) return { type: 'exit' };
      return { type: 'giveup', why: 'verkeerd voertuig', forS: now - mem.wrongAt };
    }
    mem.wrongAt = null;
    mem.attemptAt = null;
    if (mem.drove == null) { mem.drove = now; mem.best = null; mem.bestAt = now; }
    return { type: 'drive' };
  }
  mem.drove = null;
  const v = s.vehicle;
  if (!v) return { type: 'wait', why: 'geen voertuig' };
  if (mem.attemptAt == null) { mem.attemptAt = now; if (mem.presses == null) mem.presses = 0; mem.body = null; mem.stallAt = null; }
  const forS = now - mem.attemptAt;
  if (forS > BOARD.attemptS) return { type: 'giveup', why: 'time-out', forS, x: p.x, y: p.y };
  if ((mem.presses || 0) >= BOARD.tries) return { type: 'giveup', why: 'voertuig laat niet in', forS, presses: mem.presses };
  if (mem.pressAt != null && now - mem.pressAt < BOARD.waitS) return { type: 'wait', why: 'na E' };
  // het spel let E toe binnen ENTER_REACH van de romp (een boot vanaf de kade, een fiets dichterbij)
  const reach = (v.kind === 'boot' ? BOARD.reach + 1.2 : v.kind === 'fiets' || v.kind === 'scooter' ? BOARD.reach * 0.7 : BOARD.reach) - 0.2;
  const body = bodyDistance(v, p);
  if (body <= reach) { mem.body = body; mem.stallAt = null; return { type: 'enter', vehicle: v, body }; }
  // de deur komt niet dichterbij (een hek, een muur, een dranghek): de andere kant van de wagen
  if (mem.body == null || body < mem.body - 0.5) { mem.body = body; mem.stallAt = null; }
  else if (mem.stallAt == null) mem.stallAt = now;
  else if (now - mem.stallAt > BOARD.stallS) {
    mem.side = -(mem.side || approachPoint(v, p).side);
    mem.stallAt = null;
    mem.body = body;
    return { type: 'walk', to: approachPoint(v, p, mem.side), flipped: true };
  }
  const to = approachPoint(v, p, mem.side);
  return { type: 'walk', to, body };
}

// De rit na het instappen: naar het doel van de volgende stap, met een eigen budget. Zonder
// dichterbij komen (een achtervolging die wegloopt, een auto die vaststaat) na BOARD.driveS is
// 'giveup'; de pagina logt dat als 'timeout'. De toetsen zelf komen uit carControls.
export function driveStep(s, mem, now = Number.isFinite(s.t) ? s.t : 0) {
  const t = s.target;
  if (!t || !Number.isFinite(t.x)) return { type: 'wait', why: 'geen doel' };
  const p = s.player || {};
  const d = Number.isFinite(t.distance) ? t.distance : Math.hypot(t.x - p.x, t.y - p.y);
  if (mem.drove == null) { mem.drove = now; mem.best = d; mem.bestAt = now; }
  if (!Number.isFinite(mem.best) || d < mem.best - BOARD.progress) { mem.best = d; mem.bestAt = now; }
  const stil = now - (mem.bestAt ?? now);
  if (stil > BOARD.driveS) return { type: 'giveup', why: 'geen voortgang na het instappen', forS: stil, dist: d };
  return { type: 'drive', goal: { x: t.x, y: t.y }, top: d < 60 ? 12 : 24, arrived: d < 6, dist: d };
}
