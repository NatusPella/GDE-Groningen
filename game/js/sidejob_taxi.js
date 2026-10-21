// Bijbaantje: Grunn Taxi. Klanten ophalen en heel (en een beetje op tijd)
// afzetten. Studenten na het stappen, toeristen, een Ommelander, een oma.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { unlockAchievement } from './achievements.js';
import {
  pick, rand, nearestOnStreet, kerbSide, spawnJobVehicle, pointAlongRoad, decorateVehicle,
  spawnPed, pedAlive, holdPed, freePed, walkPed, say, removePed, vehicleSpeed,
} from './sidejobkit.js';

const TAXI_MODEL = { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#1b1c1f' };
const SHOW_R = 90;
const PICKUP_R = 8;
const DROP_R = 9;
const STOP_SPEED = 1.5;

const PLACES = {
  poelestraat: { name: 'de Poelestraat', x: 369.86, y: 113.04 },
  station: { name: 'het Hoofdstation', x: -6.41, y: 886.27 },
  plantsoen: { name: 'het Noorderplantsoen', x: 120.59, y: -724.43 },
  oosterpoort: { name: 'De Oosterpoort', x: 704.13, y: 567.58 },
  vismarkt: { name: 'de Vismarkt', x: 16.36, y: 255.74 },
  oosterpark: { name: 'de Oosterparkwijk', x: 1269.7, y: -747.42 },
  forum: { name: 'het Forum', x: 356.93, y: 57.89 },
  martini: { name: 'de Martinitoren', x: 213.81, y: 9.9 },
  selwerd: { name: 'Selwerd', x: -931.21, y: -1686.78 },
  paddepoel: { name: 'Paddepoel', x: -1513.33, y: -998.93 },
  korreweg: { name: 'de Korrewegwijk', x: 356.03, y: -1338.33 },
  umcg: { name: 'het UMCG', x: 745.24, y: -281.71 },
  europapark: { name: 'station Europapark', x: 1417.4, y: 1623.81 },
  schilders: { name: 'de Schildersbuurt', x: -860.12, y: 292.14 },
  herewegbuurt: { name: 'de Herewegbuurt', x: 696.4, y: 1254.24 },
};

const FARES = [
  {
    who: 'Drie studenten na het stappen', from: 'poelestraat', to: ['selwerd', 'paddepoel', 'korreweg', 'schilders'], drunk: true,
    hail: 'Moi! Moi! Taxiiii!',
    board: 'Moi! Naar {to}. En rij niet te hard door de bochten, Jelle heeft net een kapsalon op.',
    done: 'Hou dij goud, chauffeur! Wij gaan slapen. Of nog één biertje.',
  },
  {
    who: 'Twee toeristen met een papieren kaart', from: 'station', to: ['martini'],
    hail: 'Hello? Taxi? Eh... hallo?',
    board: 'Martinitoren please! That very tall tower? Die grote toren?',
    done: 'Oh, it is really big! En zo scheef als het weer hier. Thank you!',
  },
  {
    who: 'Een festivalganger vol glitter', from: 'plantsoen', to: ['poelestraat', 'station'],
    hail: 'Joehoe! Taxi!',
    board: 'Noorderzon was magisch. Ik zag een man die twee uur lang een kool aaide. Naar {to} graag.',
    done: 'Moi! Tot volgend jaar in het Plantsoen!',
  },
  {
    who: 'Een muzikant met een gitaarkoffer', from: 'oosterpoort', to: ['station', 'forum'],
    hail: 'Taxi! Voorzichtig met de gitaar!',
    board: 'Ik speel op Eurosoniek! Nou ja, in het voorprogramma van het voorprogramma. Naar {to}.',
    done: 'Als ik beroemd word, noem ik mijn album naar jouw taxi.',
  },
  {
    who: 'Een Ommelander boer in zondagse jas', from: 'vismarkt', to: ['station', 'herewegbuurt'], careful: true,
    hail: 'Hé, joe doar! Taxi!',
    board: 'In Stad rieden ze as gekken. Doe toch nait, hè? Noar {to}.',
    done: 'Kiek, dat was nait slecht. Veur n Stadjer.',
  },
  {
    who: 'Oma Aaltje met rollator', from: 'oosterpark', to: ['umcg'], careful: true,
    hail: 'Mien jong! Hier! Taxi!',
    board: 'Rustig aan, hè. Ik heb n nije heup en die is nog nait inreden. Noar t UMCG.',
    done: 'Dank joe wel, mien jong. Hier, n pepermuntje. En wat veur de pot.',
  },
  {
    who: 'Een zakenreiziger met drie telefoons', from: 'forum', to: ['europapark'], rush: true,
    hail: 'Taxi! TAXI!',
    board: 'Station Europapark, snel! Mijn intercity gaat over vier minuten. Nee, drie.',
    done: 'Gehaald! Hou het wisselgeld maar. Moi!',
  },
];

function roofSign() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.17, 0.28), new THREE.MeshBasicMaterial({ color: 0xf0c020 }));
  m.position.set(-0.25, 1.55, 0);
  return m;
}

function kerbFor(map, place) {
  const rp = map.nearestRoadPoint(place.x, place.y, 250, true);
  if (!rp) return null;
  const pts = rp.road.pts;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot((pts[i][0] + pts[i + 1][0]) / 2 - rp.x, (pts[i][1] + pts[i + 1][1]) / 2 - rp.y);
    if (d < bd) { bd = d; bi = i; }
  }
  const hit = { x: rp.x, y: rp.y, road: rp.road, dx: pts[bi + 1][0] - pts[bi][0], dy: pts[bi + 1][1] - pts[bi][1] };
  const side = kerbSide(map, hit, 1.2);
  return { road: { x: rp.x, y: rp.y }, walk: side };
}

export default {
  id: 'taxi',
  name: 'Grunn Taxi',
  color: '#d9a81e',
  glyph: 'taxi',
  boss: 'Centrale Grunn Taxi',
  boardFirst: true,
  vehicleWord: 'de taxi',
  blurb: 'Klanten door de stad rijden',
  tagline: 'Ophalen, heel afzetten, fooi incasseren.',
  intro: [
    'Centrale hier. Je taxi staat klaar voor het station, daklampje en al.',
    'Stop naast de klant, laat ze instappen en breng ze heel naar hun adres. Rustig rijden levert fooi op.',
    'En studenten na het stappen: bochten netjes. De vorige chauffeur rijdt nog steeds met de ramen open.',
  ],
  sikkom: (c) => `Taxichauffeur rijdt ${c.streak} klanten achter elkaar keurig naar huis. Centrale denkt aan een storing`,

  anchor(map) {
    const s = nearestOnStreet(map, 'Stationsweg', 53.56, 875.23);
    return s ? kerbSide(map, s, 1.6) : null;
  },

  start(c) {
    const map = c.world.map;
    const rp = map.nearestRoadPoint(c.spot.x, c.spot.y, 80, true);
    if (!rp) return 'Geen plek voor de taxi';
    const at = pointAlongRoad(rp.road, rp, 10);
    const v = spawnJobVehicle(c.world, at.x, at.y, { model: TAXI_MODEL });
    if (!v) return 'Geen taxi beschikbaar';
    c.vehicle = v;
    c.data.lastFare = null;
    return true;
  },

  round(c) {
    const d = c.data;
    const map = c.world.map;
    const pool = FARES.filter((f) => f !== d.lastFare);
    const fare = pick(pool);
    d.lastFare = fare;
    const from = PLACES[fare.from];
    const toKey = pick(fare.to);
    const to = PLACES[toKey];
    d.fare = fare;
    d.from = { ...from, ...kerbFor(map, from) };
    d.to = { ...to, ...kerbFor(map, to) };
    d.phase = 'pickup';
    d.ped = null;
    d.comfort = 100;
    d.vomited = false;
    d.prevSpeed = null;
    d.hitAt = -Infinity;
    d.dist = Math.hypot(d.to.road.x - d.from.road.x, d.to.road.y - d.from.road.y);
    c.timeLeft = null;
    c.msg(`Centrale: ${fare.who} bij ${from.name}. Wie pakt 'm? Jij dus.`, 3.5);
  },

  needsVehicle: () => true,

  timeout(c) {
    return c.data.fare && c.data.fare.rush ? 'de trein is weg. De zakenreiziger belt de advocaat' : 'de klant stapt bij het stoplicht uit: "Ik loop wel"';
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = world.player, v = c.vehicle;
    decorateVehicle(v, 'sign', roofSign);
    const inTaxi = p.inVehicle === v;
    const speed = vehicleSpeed(v);

    if (d.phase === 'pickup') {
      const kerb = d.from.walk;
      const dd = Math.hypot(kerb.x - p.x, kerb.y - p.y);
      if (!d.ped && dd < SHOW_R) {
        d.ped = c.track(spawnPed(world, kerb.x, kerb.y, 0));
        say(world, d.ped, d.fare.hail, 3);
      }
      const ped = d.ped && pedAlive(world, d.ped) ? d.ped : null;
      if (d.ped && !ped) {
        if (d.ped.state === 'dead') { c.skip('Je klant is... niet meer in staat om te betalen. Geen rit, geen reeks: de centrale zoekt een nieuwe.'); return; }
        d.ped = null;
        d.walking = false;
      }
      if (!ped) return;
      if (d.walking) {
        const door = { x: v.x - Math.sin(v.angle) * 1.3, y: v.y + Math.cos(v.angle) * 1.3 };
        const there = walkPed(world, ped, door.x, door.y, 2.4, dt, 0.8);
        d.walkT += dt;
        if (there || d.walkT > 4) {
          removePed(world, ped);
          d.ped = null;
          d.walking = false;
          d.phase = 'ride';
          const tight = (1 - 0.03 * Math.min(c.streak, 8)) * (1 - 0.03 * (c.level - 1));
          const sp = d.fare.rush ? 14 : 11;
          c.timeLeft = Math.max(35, (d.dist * 1.45 / sp + (d.fare.rush ? 10 : 28)) * tight);
          c.msg(`${d.fare.who}: "${d.fare.board.replace('{to}', d.to.name)}"`, 5);
        }
        return;
      }
      holdPed(ped, v.x, v.y);
      if (inTaxi && speed < STOP_SPEED && Math.hypot(v.x - ped.x, v.y - ped.y) < PICKUP_R) {
        d.walking = true;
        d.walkT = 0;
      }
      return;
    }

    // ride
    if (inTaxi) {
      if (d.prevSpeed != null && d.prevSpeed - v.speed > 4 && d.prevSpeed > 4 && world.time - d.hitAt > 1) {
        d.hitAt = world.time;
        const hit = d.fare.careful ? 25 : 14;
        d.comfort = Math.max(0, d.comfort - hit);
        c.msg(pick(['Au! "Rij je altijd zo, jongen?"', 'Boem. Achterin valt iets om.', '"Was dat een paaltje of een fietser?"']), 2.6);
      }
      d.prevSpeed = v.speed;
      const limit = d.fare.careful ? 14 : d.fare.rush ? 30 : 22;
      if (speed > limit) {
        d.comfort = Math.max(0, d.comfort - (d.fare.careful ? 10 : 6) * dt);
        if (world.time - (d.speedWarnAt || -99) > 7) { d.speedWarnAt = world.time; c.msg(d.fare.careful ? '"Rustig aan! Mijn heup!"' : '"Wow, zijn we op de ring?"', 2.4); }
      }
      if (d.fare.drunk && !d.vomited && d.comfort < 35) {
        d.vomited = true;
        c.msg('Oh nee. Jelle heeft de kapsalon teruggegeven. Op de achterbank. (-€25 schoonmaak)', 4);
        unlockAchievement(world, 'sj_kots');
      }
    } else d.prevSpeed = null;

    if (inTaxi && speed < STOP_SPEED && Math.hypot(v.x - d.to.road.x, v.y - d.to.road.y) < DROP_R) {
      const exit = { x: v.x - Math.sin(v.angle) * 1.6, y: v.y + Math.cos(v.angle) * 1.6 };
      const ped = spawnPed(world, exit.x, exit.y, v.angle);
      say(world, ped, d.fare.done, 3.5);
      freePed(ped);
      const tip = d.comfort >= 80 ? rand(8, 16) : d.comfort >= 50 ? rand(2, 6) : 0;
      const base = 12 + d.dist / 35 + (d.fare.rush ? 10 : 0) - (d.vomited ? 25 : 0);
      c.complete({ base: Math.max(5, base), tip, text: d.comfort >= 80 ? 'Tevreden klant!' : d.comfort < 40 ? 'Klant stapt bleek uit.' : 'Rit afgerond.' });
    }
  },

  view(c) {
    const d = c.data;
    if (!d.fare) return {};
    if (d.phase === 'pickup') {
      const k = d.ped || d.from.walk;
      return {
        marker: { x: k.x, y: k.y },
        progress: `Rit ${c.streak + 1} · ophalen`,
        goal: { label: `Ophalen bij ${d.from.name}`, desc: `${d.fare.who}. Stop naast de klant` },
      };
    }
    return {
      marker: { x: d.to.road.x, y: d.to.road.y },
      progress: `Rit ${c.streak + 1} · comfort ${Math.round(d.comfort)}%`,
      goal: { label: `Naar ${d.to.name}`, desc: d.fare.careful ? 'Rustig rijden, geen klappen' : d.fare.rush ? 'Haast! Maar heel graag heel' : 'Stop bij de bestemming' },
    };
  },

  stop(c) {
    const d = c.data;
    if (d.ped) freePed(d.ped);
  },
};
