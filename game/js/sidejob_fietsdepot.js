import { hoofdspeler } from './players.js';
import { accentVan } from './sidejobprofiel.js';
// Bijbaantje: fietsenhandhaving bij het Hoofdstation. Foutgeparkeerde
// fietsen (met een oranje label) oppakken en in het busje van het
// fietsdepot zetten, terwijl de eigenaren komen protesteren.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  pick, rand, nearestOnStreet, kerbSide, spawnJobVehicle, pointAlongRoad, decorateVehicle, randomStreetPoint, doorSpot,
  spawnPed, pedAlive, freePed, walkPed, say, buildBike,
} from './sidejobkit.js';
import { isInWater } from './util.js';

const VAN = { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 19, turnRate: 2.0, color: '#2f6fb8' };
const GRAB_R = 1.7;
const LOAD_R = 3.6;
const PROTEST_SPEED = 4.0; // a sprint with a bike in your arms (6.8 x 0.72) still gets away
const BIKE_COLORS = [0x1c1c1c, 0x2b2b2b, 0x7a1f1f, 0x2e4a34, 0x1f3a52, 0xc9a227, 0xe8e6e0, 0x6b6b6b];

const PROTEST_LINES = [
  'Hé! Dat is mijn fiets! Ik stond er maar vijf minuutjes!',
  'Nee! Mijn tentamen begint over tien minuten!',
  'Die fiets heb ik al sinds de KEI-week!',
  'Waar moet ik dan parkeren? In het Diep?',
  'Die staat daar al drie jaar, dat is toch traditie?',
];
const WIN_LINES = ['Ha! Mooi, mijn fiets!', 'Die neem ik mooi weer mee.', 'Doe mor gewoon, handhaver!'];
const LOAD_LINES = ['Weer eentje het depot in.', 'Label erop, busje in.', 'Nog eentje minder in de weg.'];

function labelTag() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0xff8a1c }));
  m.position.set(0.38, 0.86, 0.06);
  return m;
}

function vanSign() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.02), new THREE.MeshBasicMaterial({ color: 0xff8a1c }));
    band.position.set(-0.3, 1.0, side * 1.02);
    g.add(band);
  }
  return g;
}

function bikeMesh(b) {
  const g = buildBike(b.color);
  g.add(labelTag());
  return g;
}

function wallSpot(map, x, y) {
  const door = doorSpot(map, x, y);
  if (!door) return null;
  return { x: door.x, y: door.y, angle: door.face + Math.PI / 2 };
}

export default {
  id: 'fietsdepot',
  name: 'Fietsdepot-handhaver',
  color: accentVan('fietsdepot'),
  glyph: 'fietsdepot',
  boss: 'Handhaver Ria',
  vehicleWord: 'het fietsdepot-busje',
  blurb: 'Foutgeparkeerde fietsen weghalen bij het station',
  tagline: 'Oranje label = weg ermee. Pas op voor boze eigenaren.',
  intro: [
    'Moi, ik ben Ria van de handhaving. Rond het station staan weer fietsen overal behalve in de rekken.',
    'Fietsen met een oranje label mogen weg. Oppakken, naar het busje van het fietsdepot, erin. Elke fiets telt.',
    'Komt er een student aanrennen? Wegwezen, of je bent die fiets kwijt. En niet slaan, hè.',
  ],
  sikkom: (c) => `Handhaver ruimt ${c.streak} keer het Stationsplein leeg, fietsenrekken voor het eerst ooit halfvol`,

  anchor(map) {
    const s = nearestOnStreet(map, 'Stationsweg', -26.45, 886.6) || nearestOnStreet(map, 'Stationsweg', 33.52, 875.55);
    return s ? kerbSide(map, s, 1.6) : null;
  },

  start(c) {
    const map = c.world.map;
    const rp = map.nearestRoadPoint(c.spot.x, c.spot.y, 80, true);
    if (!rp) return 'Geen plek voor het busje';
    const at = pointAlongRoad(rp.road, rp, 9);
    const v = spawnJobVehicle(c.world, at.x, at.y, { model: VAN });
    if (!v) return 'Geen busje beschikbaar';
    c.vehicle = v;
    c.data.bikes = [];
    return true;
  },

  needsVehicle: () => false,

  round(c) {
    const d = c.data;
    const { world } = c;
    const map = world.map;
    for (const b of d.bikes) if (b.mesh) c.removeMesh(b.mesh);
    // a streak adds a bike now and then, but a round never grows past 5
    const n = 3 + Math.min(Math.floor(c.streak / 2), 2);
    const v = c.vehicle;
    const cx = v ? v.x : c.spot.x, cy = v ? v.y : c.spot.y;
    d.bikes = [];
    for (let tries = 0; tries < 60 && d.bikes.length < n; tries++) {
      const p = randomStreetPoint(map, cx, cy, 14, 55 + Math.min(c.streak, 5) * 4, { cats: ['foot', 'cycle', 'normal', 'minor', 'major'] });
      if (!p) continue;
      const w = wallSpot(map, p.x, p.y);
      if (!w || isInWater(map, w.x, w.y)) continue;
      if (d.bikes.some((b) => Math.hypot(b.x - w.x, b.y - w.y) < 4)) continue;
      if (Math.hypot(w.x - cx, w.y - cy) < 8) continue;
      const b = { x: w.x, y: w.y, angle: w.angle, color: pick(BIKE_COLORS), state: 'parked', mesh: null };
      b.mesh = c.addMesh(bikeMesh(b));
      b.mesh.position.set(b.x, 0, b.y);
      b.mesh.rotation.y = -b.angle;
      d.bikes.push(b);
    }
    if (!d.bikes.length) { c.fail('geen enkele fout geparkeerde fiets te vinden. Dat is nog nooit gebeurd'); return; }
    d.loaded = 0;
    d.protester = null;
    d.nextProtest = world.time + rand(6, 10);
    const tight = (1 - 0.03 * Math.min(c.streak, 8)) * (1 - 0.03 * (c.level - 1));
    c.timeLeft = (35 + d.bikes.length * 18) * tight;
    c.msg(`${d.bikes.length} foutgeparkeerde fietsen gespot. Oranje label = mag weg.`, 3.2);
  },

  timeout: () => 'de ochtendspits is voorbij en alle fietsen staan er nog. Ria zucht',

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), v = c.vehicle;
    if (v) decorateVehicle(v, 'depot', vanSign);
    const carried = d.bikes.find((b) => b.state === 'carried');

    // protesting owners
    if (!d.protester && world.time > d.nextProtest && (carried || Math.random() < 0.3)) {
      d.nextProtest = world.time + rand(9, 15) * (1 - 0.04 * Math.min(c.streak, 5));
      const target = carried || d.bikes.find((b) => b.state === 'parked');
      if (target) {
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * Math.PI * 2, r = rand(13, 19);
          const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
          if (isInWater(world.map, x, y)) continue;
          const ped = c.track(spawnPed(world, x, y, a + Math.PI, { shirt: pick(['#c94b3a', '#1f4a2e', '#4a3a54', '#c9a227']) }));
          say(world, ped, pick(PROTEST_LINES), 3.2);
          d.protester = { ped, bike: target, t: 0 };
          break;
        }
      }
    }
    const pr = d.protester;
    if (pr) {
      pr.t += dt;
      const ped = pr.ped;
      if (!pedAlive(world, ped) || pr.t > 14 || p.inVehicle) {
        if (pedAlive(world, ped)) freePed(ped);
        d.protester = null;
      } else if (walkPed(world, ped, p.x, p.y, PROTEST_SPEED, dt, 1.1)) {
        const holding = d.bikes.find((b) => b.state === 'carried');
        if (holding) {
          c.drop();
          holding.state = 'parked';
          holding.mesh = c.addMesh(bikeMesh(holding));
          holding.mesh.position.set(holding.x, 0, holding.y);
          holding.mesh.rotation.y = -holding.angle;
          c.msg('De eigenaar grist de fiets uit je handen en zet hem terug. Balen.', 3);
        }
        say(world, ped, holding ? pick(WIN_LINES) : 'En blijf van mijn fiets af, hè!', 2.8);
        freePed(ped);
        d.protester = null;
      }
    }
  },

  interact(c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), v = c.vehicle;
    if (p.inVehicle) return false;
    const carried = d.bikes.find((b) => b.state === 'carried');
    if (carried) {
      const dropAt = v || c.spot;
      if (Math.hypot(dropAt.x - p.x, dropAt.y - p.y) < LOAD_R + (v ? v.halfLen : 0)) {
        c.drop();
        carried.state = 'loaded';
        d.loaded++;
        c.msg(`${pick(LOAD_LINES)} (${d.loaded}/${d.bikes.length})`, 2);
        if (d.bikes.every((b) => b.state === 'loaded')) {
          c.complete({ base: 10 + d.bikes.length * 7, tip: c.timeLeft > 20 ? Math.round(c.timeLeft / 4) : 0, text: 'Stoep weer vrij!' });
        }
        return true;
      }
      return false;
    }
    const b = d.bikes.find((x) => x.state === 'parked' && Math.hypot(x.x - p.x, x.y - p.y) < GRAB_R);
    if (!b) return false;
    c.removeMesh(b.mesh);
    b.mesh = null;
    b.state = 'carried';
    const held = buildBike(b.color);
    held.add(labelTag());
    held.scale.setScalar(0.9);
    c.carry(held, { height: 0.5, forward: 0.2, yaw: Math.PI / 2, slow: 0.72, hint: 'Eerst deze fiets in het busje zetten' });
    return true;
  },

  prompt(c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), v = c.vehicle;
    if (p.inVehicle) return null;
    const carried = d.bikes.find((b) => b.state === 'carried');
    if (carried) {
      const dropAt = v || c.spot;
      if (Math.hypot(dropAt.x - p.x, dropAt.y - p.y) < LOAD_R + (v ? v.halfLen : 0)) return { id: 'sj-load', x: dropAt.x, y: dropAt.y, h: 2.2, key: 'E', label: 'In het busje', sub: `Fiets ${d.loaded + 1}/${d.bikes.length}`, ring: true };
      return null;
    }
    const b = d.bikes.find((x) => x.state === 'parked' && Math.hypot(x.x - p.x, x.y - p.y) < GRAB_R);
    if (!b) return null;
    return { id: 'sj-bike', x: b.x, y: b.y, h: 1.3, key: 'E', label: 'Fiets oppakken', sub: 'Oranje label: mag weg', ring: true };
  },

  view(c) {
    const d = c.data, v = c.vehicle;
    if (!d.bikes) return {};
    const carried = d.bikes.find((b) => b.state === 'carried');
    const left = d.bikes.filter((b) => b.state === 'parked');
    const dots = left.map((b) => ({ x: b.x, y: b.y, h: 1.6, label: 'Foutgeparkeerde fiets' }));
    const progress = `Fietsen ${d.loaded}/${d.bikes.length}${d.protester ? ' · eigenaar in aantocht!' : ''}`;
    if (carried) {
      const at = v || c.spot;
      return { marker: { x: at.x, y: at.y }, dots, progress, goal: { label: 'Naar het busje', desc: 'Druk E bij het busje van het fietsdepot' } };
    }
    const p = hoofdspeler(c.world);
    left.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const next = left[0];
    return { marker: next ? { x: next.x, y: next.y } : null, dots: dots.filter((x) => !next || x.x !== next.x || x.y !== next.y), progress, goal: { label: 'Fietsen met een oranje label', desc: 'Loop erheen en druk E om op te pakken' } };
  },

  onCarryLost(c) {
    const d = c.data;
    const b = d.bikes.find((x) => x.state === 'carried');
    c.drop();
    if (!b) return;
    b.state = 'parked';
    b.mesh = c.addMesh(bikeMesh(b));
    b.mesh.position.set(b.x, 0, b.y);
    b.mesh.rotation.y = -b.angle;
  },

  stop(c) {
    const d = c.data;
    if (d.protester && pedAlive(c.world, d.protester.ped)) freePed(d.protester.ped);
  },
};



