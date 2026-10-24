// Bijbaantje: lijndienst op een echte buslijn uit de data (busroutes.js), met
// verzonnen lijnnaam en haltenamen. Haltes aflopen volgens de dienstregeling,
// niet te vroeg weg en niet te laat. De ritlogica staat in busride.js.

import { getBusLines } from './vehicle.js';
import { startAt, nearestLine } from './busroutes.js';
import { spawnJobVehicle, pick } from './sidejobkit.js';
import { queueHalte } from './haltefiguren.js';
import { pushAudioEvent } from './pedgeom.js';
import { makeRide, planRide, startRide, takeOverRide, updateRide, rideStop, stopPos } from './busride.js';
import { project } from './busroutes.js';
import { busCoopStart, busCoopTik, busCoopBetaal } from './coopbus.js';
import { nieuweHalte } from './buscoop.js';
import { makeBediening, voorligger, kleeft, stoot, waardering, tevredenWoord, ritPunten } from './busbestuur.js';

const COACH = { name: 'bus', len: 11.5, wid: 2.55, maxSpeed: 22, accel: 2.6, brake: 9, turnRate: 1.1, color: '#2e8b6a' };

// De rit hangt aan de bediening voor het HUD (halteknop, tevredenheid), maar niet in een save of momentopname.
const koppelRit = (b, ride) => Object.defineProperty(b, 'ride', { value: ride, writable: true, configurable: true, enumerable: false });

const MAX_STOPS = 8; // haltes per rit: een lijn van 40 km hoeft niet in één keer

const WORDS = {
  hardbrake: ['Voorzichtig remmen, de passagiers vallen om!', 'Rustig aan, staan ze niet allemaal?'],
  klever: ['Niet zo dicht op je voorganger, de reizigers worden er zenuwachtig van.', 'Geef wat ruimte: kleven is voor stroopwafels.'],
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
      c.vehicle.busBediend = c.vehicle.busBediend || makeBediening(); // deuren (O) en kneel (K) bedien je zelf (#444)
      koppelRit(c.vehicle.busBediend, d.ride);
      busCoopStart(c.world, c.vehicle, 0); // samen rijden: wie er aan boord zit doet mee (coopbus.js, #444)
      const nu = rideStop(d.ride), last = d.ride.table[d.ride.table.length - 1];
      c.timeLeft = last.arrive - d.ride.t + 120;
      c.msg(`Dienst overgenomen: eerst ${nu.name}, dan ${last.name}.`, 3.5);
      return;
    }
    const plan = planRide(d.line, c.vehicle.x, c.vehicle.y);
    d.ride = makeRide(d.line, { ...plan, max: MAX_STOPS });
    c.vehicle.busBediend = c.vehicle.busBediend || makeBediening(); // deuren (O) en kneel (K) bedien je zelf (#444)
    c.vehicle.rideLine = { line: d.line, dir: d.ride.dir }; // het bord en het HUD-kaartje volgen de rit (busboard3d.js, #386)
    koppelRit(c.vehicle.busBediend, d.ride); // voor het HUD: halteknop en tevredenheid (busbestuurhud.js)
    const first = startRide(d.ride);
    busCoopStart(c.world, c.vehicle, first[0].board); // samen rijden: wie er aan boord zit doet mee, later instappers niet (coopbus.js, #444)
    queueHalte(c.world, c.vehicle, { board: first[0].board, alight: 0 });
    const last = d.ride.table[d.ride.table.length - 1];
    c.timeLeft = last.arrive + 120;
    c.msg(`${d.line.name}: ${first[0].board} reizigers stappen in. Naar ${last.name}. O: deuren.`, 3.5);
  },

  timeout: () => 'de dienstregeling is helemaal in de soep gelopen',

  update(dt, c) {
    const d = c.data, v = c.vehicle;
    if (!d.ride) return;
    c.timeLeft = Math.max(5, c.timeLeft);
    const bed = v.busBediend;
    if (bed && bed.slag) { bed.slag = false; stoot(d.ride.tevreden, -10); } // open deuren onderweg: de reizigers schrikken
    const bus = d.bus || (d.bus = { x: 0, y: 0, speed: 0, doors: null, tailgate: false });
    bus.x = v.x; bus.y = v.y; bus.speed = v.speed || 0; bus.doors = bed || null;
    d.klefT = (d.klefT || 0) - dt;
    if (d.klefT <= 0) { d.klefT = 0.25; bus.tailgate = kleeft(bus.speed, voorligger(v, c.world.vehicles || [])); }
    const bc = bed && bed.coop;
    if (bc) busCoopTik(c.world, v, dt);
    for (const e of updateRide(d.ride, bus, dt)) {
      if (e.type === 'arrive') {
        pushAudioEvent(c.world, { kind: 'sting', name: 'halte' }); // aankomst op een halte (stings.js)
        const txt = e.state === 'op tijd' ? 'op tijd' : e.state === 'vroeg' ? 'te vroeg' : 'te laat';
        if (e.manual) c.msg(`${e.stop.name}: ${txt}. Open de deuren met O.`, 3);
        else {
          queueHalte(c.world, v, e);
          c.msg(`${e.stop.name}: ${txt}. ${e.alight} uit, ${e.board} in.`, 3);
        }
      } else if (e.type === 'depart') { if (bc && bc.laatste) { busCoopBetaal(c.world, v, bc.laatste, d.ride.tevreden.sat); bc.laatste = null; }
      } else if (e.type === 'doorsopen') {
        if (bc) { nieuweHalte(bc, e.board); bc.laatste = { board: e.board, alight: e.alight }; }
        queueHalte(c.world, v, e);
        c.msg(e.last ? `${e.stop.name}: eindhalte, ${e.alight} reizigers stappen uit.` : `${e.alight} uit, ${e.board} in.${e.kneel ? ' Lage instap, fijn.' : ''} Sluit de deuren met O.`, 3);
      } else if (e.type === 'request') c.msg(`Een reiziger drukte op de halteknop: stoppen bij ${e.stop.name}.`, 2.6);
      else if (e.type === 'skipped') c.msg('Voorbij de halte met dichte deuren: de reizigers blijven staan!', 3);
      else if (e.type === 'klever') c.msg(pick(WORDS.klever), 2.6);
      else if (e.type === 'early') c.msg('Je rijdt te vroeg weg! Wacht op de tijd.', 2.6);
      else if (e.type === 'hardbrake') c.msg(pick(WORDS.hardbrake), 2.2);
      else if (e.type === 'fail') { c.fail('je bent te laat voor de dienstregeling'); return; }
      else if (e.type === 'done') {
        const sat = d.ride.tevreden.sat;
        c.complete({ base: 30 + e.score.pay, tip: e.score.perfect ? 15 : 0, text: `${e.score.perfect ? 'Perfecte rit!' : 'Rit gereden.'} ${tevredenWoord(sat)}.`, flawless: e.score.perfect, xp: ritPunten({ share: e.score.share, sat, haltes: d.ride.table.length }), coopSlots: bc ? bc.deelnemers.filter((s) => s !== 0) : null });
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
      progress: `${d.line.name} · ${r.onBoard} reizigers · ${'★'.repeat(waardering(r.tevreden.sat))}`,
      // voor de kaart (missionmaplive.js): de route en de haltes in rijrichting
      bus: { route: r.table.map((t) => stopPos(r, t)), stops: r.table.map((t, i) => ({ ...stopPos(r, t), name: t.name, next: i === r.next, done: i < r.next })) },
      goal: { label: `Naar ${row.name}`, desc: r.phase === 'dwell' ? 'Wacht op het vertrek' : 'Halteer netjes' },
    };
  },

  stop() {},
};
