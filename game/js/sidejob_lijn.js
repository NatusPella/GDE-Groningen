// Bijbaantje: lijndienst op een echte buslijn uit de data (busroutes.js), met
// verzonnen lijnnaam en haltenamen. Haltes aflopen volgens de dienstregeling,
// niet te vroeg weg en niet te laat. De ritlogica staat in busride.js.

import { getBusLines } from './vehicle.js';
import { startAt, nearestLine } from './busroutes.js';
import { spawnJobVehicle, pick } from './sidejobkit.js';
import { queueHalte } from './haltefiguren.js';
import { makeRide, planRide, startRide, takeOverRide, updateRide, rideStop, stopPos } from './busride.js';
import { project } from './busroutes.js';

const COACH = { name: 'bus', len: 11.5, wid: 2.55, maxSpeed: 22, accel: 2.6, brake: 9, turnRate: 1.1, color: '#2e8b6a' };

const MAX_STOPS = 8; // haltes per rit: een lijn van 40 km hoeft niet in één keer

const WORDS = {
  hardbrake: ['Voorzichtig remmen, de passagiers vallen om!', 'Rustig aan, staan ze niet allemaal?'],
};

export default {
  id: 'lijn',
  name: 'Streekbus Hunzedal',
  color: '#2e8b6a',
  glyph: 'bezorger',
  boss: 'Dienstleider Streekbus Hunzedal',
  vehicleWord: 'de streekbus',
  blurb: 'Een buslijn rijden volgens de dienstregeling',
  tagline: 'Halteren, wachten op de tijd, op tijd aankomen.',
  intro: [
    'Welkom bij Streekbus Hunzedal. Je rijdt een hele lijn, halte na halte.',
    'Te vroeg weg mag niet: wacht op de tijd. Te laat is erger.',
    'Rem zacht: de passagiers staan.',
  ],
  sikkom: (c) => `Streekbuschauffeur rijdt ${c.streak} ritten volgens de dienstregeling, reizigers verbijsterd`,

  anchor(map) {
    const lines = getBusLines();
    if (!lines.length) return null;
    const l = lines[0];
    const p = startAt(l, l.stops[0].s, 1);
    return { x: p.x, y: p.y };
  },

  start(c) {
    // de dienst overnemen van de bus waar je al in zit (busboard3d.js, #396): die bus, die lijn, die richting
    const tk = c.takeover;
    if (tk) {
      const ride = takeOverRide(tk.line, { dir: tk.dir, s: project(tk.line, tk.vehicle.x, tk.vehicle.y).s, max: MAX_STOPS });
      if (!ride) return 'Geen halte meer vooruit op deze lijn';
      c.data.line = tk.line;
      c.data.pending = ride;
      c.vehicle = tk.vehicle;
      return true;
    }
    const lines = getBusLines();
    if (!lines.length) return 'Geen buslijn in de buurt';
    const line = nearestLine(lines, c.spot.x, c.spot.y, 3000) || lines[0];
    c.data.line = line;
    const plan = planRide(line, c.spot.x, c.spot.y);
    const p = startAt(line, line.stops[plan.dir > 0 ? plan.first : line.stops.length - 1 - plan.first].s, plan.dir);
    const v = spawnJobVehicle(c.world, p.x, p.y, { kind: 'bus', model: COACH, angle: p.angle });
    if (!v) return 'Geen bus beschikbaar';
    c.vehicle = v;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data;
    if (d.pending) {
      // eerste ronde na een overname: de rit loopt al, er stapt niemand in bij de start
      d.ride = d.pending;
      d.pending = null;
      c.vehicle.rideLine = { line: d.line, dir: d.ride.dir };
      const nu = rideStop(d.ride), last = d.ride.table[d.ride.table.length - 1];
      c.timeLeft = last.arrive - d.ride.t + 120;
      c.msg(`Dienst overgenomen: eerst ${nu.name}, dan ${last.name}.`, 3.5);
      return;
    }
    const plan = planRide(d.line, c.vehicle.x, c.vehicle.y);
    d.ride = makeRide(d.line, { ...plan, max: MAX_STOPS });
    c.vehicle.rideLine = { line: d.line, dir: d.ride.dir }; // het bord en het HUD-kaartje volgen de rit (busboard3d.js, #386)
    const first = startRide(d.ride);
    queueHalte(c.world, c.vehicle, { board: first[0].board, alight: 0 });
    const last = d.ride.table[d.ride.table.length - 1];
    c.timeLeft = last.arrive + 120;
    c.msg(`${d.line.name}: ${first[0].board} reizigers stappen in. Naar ${last.name}.`, 3.5);
  },

  timeout: () => 'de dienstregeling is helemaal in de soep gelopen',

  update(dt, c) {
    const d = c.data, v = c.vehicle;
    if (!d.ride) return;
    c.timeLeft = Math.max(5, c.timeLeft);
    for (const e of updateRide(d.ride, v, dt)) {
      if (e.type === 'arrive') {
        queueHalte(c.world, v, e);
        const txt = e.state === 'op tijd' ? 'op tijd' : e.state === 'vroeg' ? 'te vroeg' : 'te laat';
        c.msg(`${e.stop.name}: ${txt}. ${e.alight} uit, ${e.board} in.`, 3);
      } else if (e.type === 'early') c.msg('Je rijdt te vroeg weg! Wacht op de tijd.', 2.6);
      else if (e.type === 'hardbrake') c.msg(pick(WORDS.hardbrake), 2.2);
      else if (e.type === 'fail') { c.fail('je bent te laat voor de dienstregeling'); return; }
      else if (e.type === 'done') {
        c.complete({ base: 30 + e.score.pay, tip: e.score.perfect ? 15 : 0, text: e.score.perfect ? 'Perfecte rit!' : 'Rit gereden.', flawless: e.score.perfect });
        return;
      }
    }
  },

  view(c) {
    const d = c.data, r = d.ride;
    if (!r) return {};
    const row = rideStop(r) || r.table[r.table.length - 1];
    const p = stopPos(r, row);
    return {
      marker: { x: p.x, y: p.y },
      progress: `${d.line.name} · ${r.onBoard} reizigers`,
      // voor de kaart (missionmaplive.js): de route en de haltes in rijrichting
      bus: { route: r.table.map((t) => stopPos(r, t)), stops: r.table.map((t, i) => ({ ...stopPos(r, t), name: t.name, next: i === r.next, done: i < r.next })) },
      goal: { label: `Naar ${row.name}`, desc: r.phase === 'dwell' ? 'Wacht op het vertrek' : 'Halteer netjes' },
    };
  },

  stop() {},
};
