// Bijbaantje: stadsbus lijn 3. Een rondje langs de haltes volgens de
// dienstregeling: netjes stoppen, passagiers laten in- en uitstappen, niet
// te vroeg vertrekken en niemand door het gangpad laten rollen.

import { unlockAchievement } from './achievements.js';
import { closestPointOnSegment, isInWater } from './util.js';
import {
  pick, spawnJobVehicle, spawnPed, pedAlive,
  holdPed, freePed, walkPed, removePed, say, vehicleSpeed, fmtClock,
} from './sidejobkit.js';
import { teVroegTekst } from './busbestuur.js';

const STOP_R = 9;
const STOP_SPEED = 0.8;
const DWELL_MIN = 1.2;
const DWELL_MAX = 3;
export const EARLY_OK = 12;
// ahead of the timetable the bus waits at most this long at a halte
export const MAX_HOLD = 30;
export const LATE_OK = 10;
const LATE_FAIL = 75;
const SHOW_R = 95;
// timetable: route metres at this pace plus pulling away and braking
export const CRUISE = 8.5;
export const LEG_EXTRA = 12;

// One loop, clockwise round the centre with the traffic: from the station
// over the Herebrug, out to the Oosterpoort, back west along the Zuiderpark,
// round the Emmaplein roundabout and on to the station again. dir: the way
// the bus drives at the halte (picks the carriageway and the kerb), leg: the
// route metres to the next halte (scripts/bus_route_test.mjs checks both).
export const STOPS = [
  { name: 'Hoofdstation', street: 'Stationsweg', at: [112.83, 882.31], dir: [1, 0], leg: 235, line: 'Hoofdstation. Overstappen op de trein, of op één van de tienduizend fietsen.' },
  { name: 'Herebrug', street: 'Stationsweg', at: [338.41, 822.24], dir: [1, -0.4], leg: 175, line: 'Herebrug. Staat de brug open? Dan staat de bus stil. Zo gaat dat in Grunn.' },
  { name: 'Hereplein', street: 'Hereplein', at: [359.36, 694.05], dir: [0, -1], leg: 555, line: 'Hereplein. Let op: fietsers hebben hier voorrang. Ook als ze er nog niet zijn.' },
  { name: 'Oosterpoort', street: 'Verlengde Oosterstraat', at: [594.98, 635.81], dir: [1, 1.4], leg: 240, line: 'Oosterpoort, aan de Trompsingel. Vanavond: een band die je over tien jaar pas kent.' },
  { name: 'Zuiderpark', street: 'Zuiderpark', at: [427.88, 776.47], dir: [-1, 0.4], leg: 970, line: 'Zuiderpark. Uitstappen voor het park. Picknickkleed niet inbegrepen.' },
  { name: 'Emmaplein', street: 'Emmaplein', at: [-207.72, 713.4], dir: [0, 1], leg: 470, line: 'Emmaplein. Eén keer rond de rotonde en dan terug naar het station. Rondjes draaien kan lijn 3 als de beste.' },
];

const BUMP_LINES = [
  'Een passagier morst koffie over een student. De student morst terug.',
  'Oma valt bijna uit het bankje. "Je bent zeker Ommelander?"',
  'Iemand drukt uit protest op alle stopknoppen tegelijk.',
  'Achterin rolt een krat bier door het gangpad.',
];
const EARLY_LINES = ['Te vroeg! Lekker rap, maar de dienstregeling vindt je eng.', 'Voor op schema. De passagiers klappen, de planner huilt.'];

// The halte on its street: the carriageway (and the way along it) that runs
// with the line's direction of travel (dir), the waiting spot on the kerb to
// the right of the bus.
function placeStop(map, s) {
  const [hx, hy] = s.dir;
  let best = null;
  for (const r of map.roadsNear(s.at[0], s.at[1], 160)) {
    if (r.name !== s.street) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      let dx = bx - ax, dy = by - ay;
      const l = Math.hypot(dx, dy);
      if (l < 1) continue;
      dx /= l; dy /= l;
      const along = dx * hx + dy * hy;
      if (r.oneway && along < 0.3) continue;
      if (Math.abs(along) < 0.3) continue;
      const cp = closestPointOnSegment(s.at[0], s.at[1], ax, ay, bx, by);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y, road: r, heading: along > 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx) };
    }
  }
  if (!best) return null;
  const off = (best.road.width || 6) / 2 + 1.6;
  let kerb = null;
  for (const side of [1, -1]) {
    const x = best.x - Math.sin(best.heading) * off * side, y = best.y + Math.cos(best.heading) * off * side;
    if (isInWater(map, x, y)) continue;
    const [ex, ey] = map.escapeBuilding(x, y, 0.5);
    if (Math.hypot(ex - x, ey - y) < 0.3 || side < 0) { kerb = { x: ex, y: ey }; break; }
  }
  if (!kerb) return null;
  return { ...s, x: best.x, y: best.y, heading: best.heading, kerb };
}

export function placeStops(map, stops = STOPS) {
  return stops.map((s) => placeStop(map, s)).filter(Boolean);
}

// the bus waits at the first halte, ready to go, facing the line's direction
export function busStart(map, stops) {
  const s = stops[0];
  return { x: s.x, y: s.y, angle: s.heading };
}

// planned driving time from halte a to the next one (a.leg: route metres)
export function legSeconds(map, a) {
  return a.leg / CRUISE + LEG_EXTRA;
}

// Leaves the halte: a bus ahead of the timetable runs on from here as if on
// time (no waiting minutes at every next halte). True when the round is done.
function depart(c) {
  const d = c.data;
  const due = d.next >= d.stops.length ? d.dueEnd : d.due[d.next];
  if (due - d.clock > EARLY_OK) d.clock = due - EARLY_OK;
  d.hold = null;
  d.spawnedFor = 0;
  d.next++;
  if (d.next <= d.stops.length) return false;
  const n = d.stops.length;
  const allOn = d.onTime >= n && d.lateMax <= LATE_OK && !d.earlyDeps;
  if (allOn) unlockAchievement(c.world, 'sj_bus');
  const base = n * 11 + d.onTime * 5;
  const tip = d.comfort >= 80 ? 15 : d.comfort >= 50 ? 5 : 0;
  const early = d.earlyDeps ? `, ${d.earlyDeps}× te vroeg weg` : '';
  c.complete({ base, tip, text: allOn ? 'Rondje keurig op tijd!' : `Rondje gereden (${d.onTime}/${n} op tijd${early}).`, flawless: allOn });
  return true;
}

export default {
  id: 'bus',
  name: 'Stadsbus lijn 3',
  color: '#3b5bdb',
  glyph: 'bus',
  boss: 'Planner Stadsvervoer',
  boardFirst: true,
  vehicleWord: 'de bus',
  blurb: 'Een rondje langs de haltes rijden',
  tagline: 'Op tijd, niet te vroeg, en zonder koffievlekken.',
  intro: [
    'Moi! Lijn 3 heeft vandaag geen chauffeur, dus jij mag. Twaalf meter harmonicabus, ga er maar aan staan.',
    'Stop bij elke halte tot de deuren weer dicht zijn. Te vroeg vertrekken is in Grunn erger dan te laat.',
    'Rustig remmen, hè. Er zitten mensen met koffie in. En mensen die koffie willen.',
  ],
  sikkom: (c) => `Buslijn 3 rijdt voor de ${c.streak}e keer op rij volgens de dienstregeling, reizigers in verwarring`,

  anchor(map) {
    const s = placeStops(map, STOPS.slice(0, 1))[0];
    return s ? s.kerb : null;
  },

  start(c) {
    const map = c.world.map;
    c.data.stops = placeStops(map, STOPS);
    if (c.data.stops.length < 4) return 'De dienstregeling is zoek';
    const at = busStart(map, c.data.stops);
    const v = spawnJobVehicle(c.world, at.x, at.y, { kind: 'bus', angle: at.angle });
    if (!v) return 'Geen bus beschikbaar';
    c.vehicle = v;
    return true;
  },

  round(c) {
    const d = c.data, map = c.world.map;
    d.next = 1;
    d.clock = 0;
    d.comfort = 100;
    d.lateMax = 0;
    d.onTime = 0;
    d.dwell = 0;
    d.hold = null;
    d.earlyDeps = 0;
    d.waiting = [];
    d.alighting = [];
    d.prevSpeed = null;
    d.hitAt = -Infinity;
    const slack = Math.max(1, 1.15 - 0.02 * Math.min(c.streak, 5) - 0.02 * (c.level - 1));
    let t = 0;
    d.due = d.stops.map((s, i) => (i === 0 ? 0 : (t += legSeconds(map, d.stops[i - 1]) * slack)));
    d.dueEnd = t + legSeconds(map, d.stops[d.stops.length - 1]) * slack;
    c.timeLeft = null;
    c.msg(c.streak ? `Nieuw rondje lijn 3. Volgende halte: ${d.stops[1].name}.` : `Lijn 3 vertrekt. Eerste halte: ${d.stops[1].name}.`, 3.2);
  },

  needsVehicle: () => true,

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = world.player, v = c.vehicle;
    d.clock += dt;
    const inBus = p.inVehicle === v;
    const idx = d.next % d.stops.length;
    const stop = d.stops[idx];
    const due = d.next >= d.stops.length ? d.dueEnd : d.due[d.next];
    const late = d.clock - due;

    if (inBus) {
      if (d.prevSpeed != null && d.prevSpeed - v.speed > 3 && d.prevSpeed > 3 && world.time - d.hitAt > 1.2) {
        d.hitAt = world.time;
        d.comfort = Math.max(0, d.comfort - 12);
        c.msg(pick(BUMP_LINES), 3);
      }
      d.prevSpeed = v.speed;
    } else d.prevSpeed = null;

    if (d.hold != null) {
      // ahead of the timetable: the bus may wait (at most MAX_HOLD), or go
      d.hold -= dt;
      if (inBus && vehicleSpeed(v) > 1.5) {
        d.earlyDeps++;
        // eerst concreet: hoeveel seconden te vroeg en wat je had moeten doen, dan pas de grap (#502)
        c.msg(`${teVroegTekst(due - d.clock, stop.name)} ${pick(EARLY_LINES)}`, 3.8);
        depart(c);
      } else if ((d.hold <= 0 || due - d.clock <= EARLY_OK) && !depart(c)) {
        c.msg(`Op schema. Rijden maar! Volgende halte: ${d.stops[d.next % d.stops.length].name}.`, 2.6);
      }
      return;
    }

    if (late > LATE_FAIL && !d.dwell) { c.fail('te veel vertraging. Kiekdoar kopt al: "Lijn 3 rijdt op Gronings tempo"'); return; }

    const kerb = stop.kerb;
    if (Math.hypot(kerb.x - p.x, kerb.y - p.y) < SHOW_R && !d.spawnedFor) {
      d.spawnedFor = idx + 1;
      const n = 1 + Math.floor(Math.random() * 3);
      d.waiting = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        d.waiting.push(c.track(spawnPed(world, kerb.x + Math.cos(a) * 1.2, kerb.y + Math.sin(a) * 1.2, 0)));
      }
    }
    for (const ped of d.waiting) if (pedAlive(world, ped) && !d.dwell) holdPed(ped, v.x, v.y);

    const atStop = Math.hypot(v.x - stop.x, v.y - stop.y) < STOP_R;
    if (!d.dwell && inBus && atStop && vehicleSpeed(v) < STOP_SPEED) {
      d.dwell = DWELL_MAX;
      d.dwellT = 0;
      d.arriveLate = late;
      d.lateMax = Math.max(d.lateMax, late);
      if (late <= LATE_OK) d.onTime++;
      c.msg(`${stop.line}${late > LATE_OK ? ` (${Math.round(late)} s te laat)` : ''}`, 3.6);
      const door = { x: v.x + Math.cos(v.angle) * (v.model.len / 2 - 1.2) - Math.sin(v.angle) * 1.6, y: v.y + Math.sin(v.angle) * (v.model.len / 2 - 1.2) + Math.cos(v.angle) * 1.6 };
      d.door = door;
      const out = Math.floor(Math.random() * 3);
      for (let i = 0; i < out; i++) {
        const ped = spawnPed(world, door.x - Math.cos(v.angle) * i * 0.8, door.y - Math.sin(v.angle) * i * 0.8, v.angle + Math.PI / 2);
        if (i === 0 && d.comfort < 60) say(world, ped, pick(['Nooit meer lijn 3.', 'Ik ga voortaan lopen.', 'Mijn koffie!', 'Nait zo hard over de drempels, mien jong!']), 3);
        else if (i === 0) say(world, ped, pick(['Dank je, chauffeur!', 'Moi!', 'Tot kiek!', 'Hou dij goud, chauffeur!']), 2.6);
        freePed(ped);
      }
    }
    if (d.dwell) {
      if (!inBus || vehicleSpeed(v) > 1.5) {
        d.dwell = 0;
        c.msg('Hé! De deuren zijn nog open!', 2.4);
        d.comfort = Math.max(0, d.comfort - 10);
        return;
      }
      v.speed = 0;
      for (const ped of d.waiting) {
        if (!pedAlive(world, ped)) continue;
        if (walkPed(world, ped, d.door.x, d.door.y, 2.6, dt, 0.7)) removePed(world, ped);
      }
      d.dwellT += dt;
      d.dwell -= dt;
      const boarding = d.waiting.some((ped) => pedAlive(world, ped));
      if (d.dwell > 0 && (boarding || d.dwellT < DWELL_MIN)) return;
      d.dwell = 0;
      for (const ped of d.waiting) removePed(world, ped);
      d.waiting = [];
      const early = due - d.clock - EARLY_OK;
      if (early > 1) {
        d.hold = Math.min(early, MAX_HOLD);
        // geen getal in de melding: dat stond stil terwijl de klok doorliep; de aftelling in het HUD telt
        // echt (view() hieronder), de melding zegt wat je moet doen (#502)
        c.msg('Voor op schema: wacht op de dienstregeling, de aftelling staat onder je doel. Of rijd door, dan ben je te vroeg.', 3.4);
        return;
      }
      if (depart(c)) return;
      c.msg(`Deuren dicht, rijden maar! Volgende halte: ${d.stops[d.next % d.stops.length].name}.`, 2.6);
    }
  },

  view(c) {
    const d = c.data;
    if (!d.stops || !d.due) return {};
    const n = d.stops.length;
    const idx = d.next % n;
    const stop = d.stops[idx];
    const due = d.next >= n ? d.dueEnd : d.due[d.next];
    const diff = d.clock - due;
    const sched = diff > 1 ? `${fmtClock(diff)} te laat` : `gepland over ${fmtClock(-diff)}`;
    if (d.hold != null) {
      return {
        marker: { x: stop.x, y: stop.y },
        progress: `Voor op schema · vertrek over ${Math.max(1, Math.ceil(d.hold))} s`,
        // het kopje zegt "volgende halte" en niet "tips": dit is de halte waar je heen rijdt (#502)
        goal: { label: `Volgende halte: ${stop.name}`, desc: 'Wacht tot de dienstregeling je laat gaan; de aftelling staat eronder' },
      };
    }
    const dots = [];
    for (let k = 1; k <= 2; k++) {
      const s = d.stops[(d.next + k) % n];
      if (d.next + k <= n) dots.push({ x: s.x, y: s.y, h: 3, label: `Halte ${s.name}` });
    }
    return {
      marker: { x: stop.x, y: stop.y },
      dots,
      // de haltenaam staat in het kopje (goal.label), dus de regel eronder telt alleen de halten en de tijd:
      // geen tweede keer dezelfde naam over dezelfde regel (#502)
      progress: d.dwell ? `Deuren open · nog ${Math.max(1, Math.ceil(d.dwell))} s` : `${Math.min(d.next, n)}/${n} gehaald · ${sched}`,
      goal: { label: `Volgende halte: ${stop.name}`, desc: d.dwell ? 'Passagiers stappen in en uit; sluit de deuren met O' : 'Stop bij de halte en laat mensen instappen' },
    };
  },

  stop(c) {
    for (const ped of c.data.waiting || []) freePed(ped);
  },
};
