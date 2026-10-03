// Bijbaantje: stadsbus lijn 3. Een rondje langs de haltes volgens de
// dienstregeling: netjes stoppen, passagiers laten in- en uitstappen, niet
// te vroeg vertrekken en niemand door het gangpad laten rollen.

import { unlockAchievement } from './achievements.js';
import {
  pick, nearestOnStreet, kerbSide, spawnJobVehicle, pointAlongRoad, spawnPed, pedAlive,
  holdPed, freePed, walkPed, removePed, say, vehicleSpeed, fmtClock,
} from './sidejobkit.js';

const STOP_R = 9;
const STOP_SPEED = 0.8;
const DWELL_MIN = 1.2;
const DWELL_MAX = 3;
const EARLY_OK = 12;
const LATE_OK = 10;
const LATE_FAIL = 75;
const SHOW_R = 95;

const STOPS = [
  { name: 'Trompsingel', street: 'Trompsingel', at: [694, 575], line: 'Trompsingel, bij De Oosterpoort. Vanavond: een band die je over tien jaar pas kent.' },
  { name: 'Oosterweg', street: 'Oosterweg', at: [649, 771], line: 'Oosterweg. Uitstappen voor de Oosterpoort-wijk en de lekkerste bakker van de stad. Zegt de bakker.' },
  { name: 'Herebrug', street: 'Herebrug', at: [352, 778], line: 'Herebrug. Staat de brug open? Dan staat de bus stil. Zo gaat dat in Grunn.' },
  { name: 'Hoofdstation', street: 'Stationsweg', at: [99, 856], line: 'Hoofdstation. Overstappen op de trein, of op één van de tienduizend fietsen.' },
  { name: 'Hereplein', street: 'Hereplein', at: [307, 682], line: 'Hereplein. Let op: fietsers hebben hier voorrang. Ook als ze er nog niet zijn.' },
  { name: 'Verlengde Oosterstraat', street: 'Verlengde Oosterstraat', at: [560, 606], line: 'Verlengde Oosterstraat. Voor de Oosterstraat: uitstappen en nog vijf minuten lopen, net als altijd.' },
];

const BUMP_LINES = [
  'Een passagier morst koffie over een student. De student morst terug.',
  'Oma valt bijna uit het bankje. "Je bent zeker Ommelander?"',
  'Iemand drukt uit protest op alle stopknoppen tegelijk.',
  'Achterin rolt een krat bier door het gangpad.',
];
const EARLY_LINES = ['Te vroeg! Lekker rap, maar de dienstregeling vindt je eng.', 'Voor op schema. De passagiers klappen, de planner huilt.'];

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
    const s = nearestOnStreet(map, STOPS[0].street, STOPS[0].at[0], STOPS[0].at[1]);
    return s ? kerbSide(map, s, 1.8) : null;
  },

  start(c) {
    const map = c.world.map;
    c.data.stops = STOPS.map((s) => {
      const hit = nearestOnStreet(map, s.street, s.at[0], s.at[1]);
      if (!hit) return null;
      return { ...s, x: hit.x, y: hit.y, kerb: kerbSide(map, hit, 1.6) };
    }).filter(Boolean);
    if (c.data.stops.length < 4) return 'De dienstregeling is zoek';
    const rp = map.nearestRoadPoint(c.spot.x, c.spot.y, 80, true);
    if (!rp) return 'Geen plek voor de bus';
    const at = pointAlongRoad(rp.road, rp, 14);
    const v = spawnJobVehicle(c.world, at.x, at.y, { kind: 'bus', angle: at.angle });
    if (!v) return 'Geen bus beschikbaar';
    c.vehicle = v;
    return true;
  },

  round(c) {
    const d = c.data;
    d.next = 1;
    d.clock = 0;
    d.comfort = 100;
    d.lateMax = 0;
    d.onTime = 0;
    d.dwell = 0;
    d.waiting = [];
    d.alighting = [];
    d.prevSpeed = null;
    d.hitAt = -Infinity;
    const slack = Math.max(1, 1.25 - 0.025 * Math.min(c.streak, 8) - 0.02 * (c.level - 1));
    let t = 0;
    d.due = d.stops.map((s, i) => {
      if (i === 0) return 0;
      const p = d.stops[i - 1];
      t += (Math.hypot(s.x - p.x, s.y - p.y) * 2.2 / 8.5 + 16) * slack;
      return t;
    });
    const back = d.stops[0], last = d.stops[d.stops.length - 1];
    d.dueEnd = t + (Math.hypot(back.x - last.x, back.y - last.y) * 2.2 / 8.5 + 16) * slack;
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
      if (due - d.clock > EARLY_OK && !d.earlyNoted) { d.earlyNoted = true; c.msg(pick(EARLY_LINES), 3); }
      d.dwell = 0;
      d.earlyNoted = false;
      for (const ped of d.waiting) removePed(world, ped);
      d.waiting = [];
      d.spawnedFor = 0;
      d.next++;
      if (d.next > d.stops.length) {
        const n = d.stops.length;
        const allOn = d.onTime >= n && d.lateMax <= LATE_OK;
        if (allOn) unlockAchievement(world, 'sj_bus');
        const base = n * 11 + d.onTime * 5;
        const tip = d.comfort >= 80 ? 15 : d.comfort >= 50 ? 5 : 0;
        c.complete({ base, tip, text: allOn ? 'Rondje keurig op tijd!' : `Rondje gereden (${d.onTime}/${n} op tijd).`, flawless: allOn });
        return;
      }
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
    const dots = [];
    for (let k = 1; k <= 2; k++) {
      const s = d.stops[(d.next + k) % n];
      if (d.next + k <= n) dots.push({ x: s.x, y: s.y, h: 3, label: `Halte ${s.name}` });
    }
    return {
      marker: { x: stop.x, y: stop.y },
      dots,
      progress: d.dwell ? `Halte ${stop.name} · deuren open, nog ${Math.max(1, Math.ceil(d.dwell))} s` : `Halte ${Math.min(d.next, n)}/${n} ${stop.name} · ${sched}`,
      goal: { label: `Halte ${stop.name}`, desc: d.dwell ? 'Even stilstaan: passagiers stappen in' : 'Stop bij de halte en laat mensen instappen' },
    };
  },

  stop(c) {
    for (const ped of c.data.waiting || []) freePed(ped);
  },
};
