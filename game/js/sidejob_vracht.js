// Bijbaantje: vrachtwagenchauffeur voor "Hunze Vrachtvervoer". Eerst achteruit
// onder een oplegger koppelen, dan de lading rustig naar de klant brengen:
// geen inklappers, geen harde klappen. De scharnierlogica staat in semitrailer.js.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  pick, rand, nearestOnStreet, kerbSide, spawnJobVehicle, pointAlongRoad, randomStreetPoint, streetNameAt,
} from './sidejobkit.js';
import { newTrailer, couple, uncouple, stepTrailer, fifthWheel, loadedHandling, koppelHulp } from './semitrailer.js';

const TRACTOR = { name: 'truck', len: 6.6, wid: 2.5, maxSpeed: 24, accel: 3.6, brake: 12, turnRate: 1.5, color: '#2f5c8a' };
const KP_BACK = 1.6;
const ARRIVE_R = 14;
const ARRIVE_SPEED = 1.6;
const CRASH_DROP = 4.5;

const KLANTEN = [
  { naam: 'Bouwmarkt De Spijker', vracht: 'pallets cementzakken', kind: 'zeil' },
  { naam: 'Supermarkt Driekwart', vracht: 'diepvriesgroente', kind: 'koel' },
  { naam: 'Kaasboerderij Oldambt', vracht: 'kaas, veel kaas', kind: 'koel' },
  { naam: 'Zandhandel Hoogkerk', vracht: 'zand voor de zandbak van een rotonde', kind: 'bak' },
  { naam: 'Meubelhal Het Hoge Noorden', vracht: 'tweehonderd Zweedse boekenkasten', kind: 'zeil' },
  { naam: 'IJssalon Zomerzoet', vracht: 'ijs, mits de koeling blijft draaien', kind: 'koel' },
];
const THANKS = ['Mooi gedaan, die oplegger staat er weer als een huis.', 'Niks gedeukt? Dan krijg je een bakkie van het huis.', 'Zo kennen we je: netjes, en niet te snel.'];
const BUMPY = ['Even de lading nakijken... Ach, het zal wel.', 'Een paar pallets staan scheef, maar goed.'];

function buildTrailerMesh(spec) {
  const g = new THREE.Group();
  const h = spec.len / 2 - 1.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.len, 2.7, spec.wid), new THREE.MeshLambertMaterial({ color: spec.color }));
  body.position.set(-h, 2.1, 0);
  g.add(body);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(spec.len, 0.3, spec.wid * 0.8), new THREE.MeshLambertMaterial({ color: 0x2b2b2e }));
  chassis.position.set(-h, 0.62, 0);
  g.add(chassis);
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1c });
  for (const dx of [-0.8, 0, 0.8]) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(-spec.axle + dx - 0.6, 0.5, side * (spec.wid / 2 - 0.1));
      g.add(w);
    }
  }
  return g;
}

function poseTrailer(tr, v) {
  if (!tr.mesh) return;
  tr.mesh.position.set(tr.kx, v.gz || 0, tr.ky);
  tr.mesh.rotation.set(0, -tr.angle, 0);
}

// Geluid via de sfx-laag (fxbank): klik van het hulpstuk, piepen bij een inklapper.
function fx(world, name, x, y, extra = {}) {
  (world.audioEvents || (world.audioEvents = [])).push({ kind: 'fx', name, x, y, ...extra });
}

function clearTrailer(c) {
  const d = c.data;
  if (d.tr && d.tr.mesh) { c.removeMesh(d.tr.mesh); d.tr.mesh = null; }
  d.tr = null;
}

export default {
  id: 'vracht',
  name: 'Hunze Vrachtvervoer',
  color: '#2f5c8a',
  glyph: 'vracht',
  boss: 'Planner Hunze Vrachtvervoer',
  vehicleWord: 'de trekker',
  blurb: 'Vrachtwagen met oplegger, lading bezorgen',
  tagline: 'Koppelen, rustig rijden, afleveren zonder inklapper.',
  intro: [
    'Welkom bij Hunze Vrachtvervoer. De trekker staat klaar, de oplegger staat achter je.',
    'Rij er achteruit onder tot hij vastklikt. Rustig, anders vouwt hij zich om je heen.',
    'Lever de lading af bij de klant. Harde klappen en inklappers kosten je.',
  ],
  sikkom: (c) => `Vrachtwagenchauffeur levert ${c.streak} opleggers af, rotondes officieel een beetje smaller`,

  anchor(map) {
    const s = nearestOnStreet(map, 'Eemshavenweg', 100, 900, 600) || nearestOnStreet(map, 'Hereweg', 191, 138, 900);
    return s ? kerbSide(map, s, 1.6) : null;
  },

  start(c) {
    const rp = c.world.map.nearestRoadPoint(c.spot.x, c.spot.y, 80, true);
    if (!rp) return 'Geen plek voor de trekker';
    const at = pointAlongRoad(rp.road, rp, 12);
    const v = spawnJobVehicle(c.world, at.x, at.y, { model: TRACTOR });
    if (!v) return 'Geen trekker beschikbaar';
    c.vehicle = v;
    c.data.base = { maxSpeed: v.model.maxSpeed, accel: v.model.accel, brake: v.model.brake, turnRate: v.model.turnRate };
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data, v = c.vehicle, map = c.world.map;
    const klant = pick(KLANTEN);
    const dest = randomStreetPoint(map, v.x, v.y, 450, 1300, { cats: ['normal'] })
      || { x: v.x + 600, y: v.y, name: streetNameAt(map, v.x + 600, v.y) || 'Hereweg' };
    clearTrailer(c);
    // Oplegger achter de trekker, dezelfde koers: eerst achteruit koppelen.
    const fw = fifthWheel(v, KP_BACK);
    const gap = 8;
    d.tr = newTrailer(klant.kind, fw.x - Math.cos(v.angle) * gap, fw.y - Math.sin(v.angle) * gap, v.angle);
    d.tr.mesh = c.addMesh(buildTrailerMesh(d.tr.spec));
    poseTrailer(d.tr, v);
    d.klant = klant;
    d.dest = { x: dest.x, y: dest.y, street: dest.name || streetNameAt(map, dest.x, dest.y) || 'de weg' };
    d.dist = Math.hypot(dest.x - v.x, dest.y - v.y);
    d.phase = 'hook';
    d.cargo = 100;
    d.jack = false;
    d.hadJack = false;
    d.bumped = false;
    d.hinted = false;
    d.prevSpeed = null;
    d.hitAt = -Infinity;
    Object.assign(v.model, d.base);
    c.timeLeft = 90 + (d.dist * 1.7) / 10;
    c.msg(`Klus: ${klant.vracht} naar ${klant.naam}. Rij achteruit onder de ${d.tr.spec.name.toLowerCase()}.`, 4);
  },

  timeout: (c) => (c.data.phase === 'hook' ? 'de oplegger is aan een andere chauffeur gegeven' : 'de lading kwam te laat. De klant belt de directie'),

  update(dt, c) {
    const { world } = c;
    const d = c.data, v = c.vehicle, p = world.player, tr = d.tr;
    if (!tr) return;
    if (d.phase === 'hook') {
      poseTrailer(tr, v);
      if (p.inVehicle !== v) return;
      if (Math.abs(v.speed) < 3 && couple(v, tr, KP_BACK)) {
        tr.load = 1;
        Object.assign(v.model, loadedHandling(tr, d.base));
        d.phase = 'haul';
        fx(world, 'bridge_clunk', tr.kx, tr.ky, { gain: 0.9, rate: 0.75 });
        c.msg(`Gekoppeld! Naar ${d.klant.naam}, ${d.dest.street}. Rustig in de bocht.`, 3.5);
      } else if (!d.hinted && Math.hypot(v.x - tr.kx, v.y - tr.ky) < 14) {
        d.hinted = true;
        c.msg('Achteruit, rechtdoor onder de oplegger.', 2.4);
      }
      return;
    }
    stepTrailer(tr, v, Math.max(dt, 1e-3), KP_BACK);
    poseTrailer(tr, v);
    if (tr.jackknifed && !d.jack) {
      d.jack = true;
      d.cargo = Math.max(0, d.cargo - 15);
      d.hadJack = true;
      fx(world, 'rail_squeal', tr.kx, tr.ky, { gain: 0.8 });
      c.msg('Inklapper! Dat voel je in de lading (-15%)', 2.8);
    } else if (!tr.jackknifed) d.jack = false;
    if (p.inVehicle === v) {
      if (d.prevSpeed != null && d.prevSpeed - v.speed > CRASH_DROP && d.prevSpeed > 5 && world.time - d.hitAt > 1) {
        d.hitAt = world.time;
        d.cargo = Math.max(0, d.cargo - Math.round(rand(8, 16)));
        d.bumped = true;
        fx(world, 'bridge_clunk', v.x, v.y, { gain: 1, rate: 0.6 });
        c.msg(`Boem! De lading schuift (${d.cargo}% heel)`, 2.6);
      }
      d.prevSpeed = v.speed;
    } else d.prevSpeed = null;
    if (d.cargo <= 0) { c.fail('de lading is verloren'); return; }
    if (Math.hypot(v.x - d.dest.x, v.y - d.dest.y) < ARRIVE_R && Math.abs(v.speed) < ARRIVE_SPEED) {
      uncouple(tr);
      const whole = d.cargo >= 100 && !d.hadJack;
      c.msg(whole ? pick(THANKS) : pick(BUMPY), 3.5);
      const base = (60 + d.dist / 18) * (0.4 + 0.6 * d.cargo / 100);
      c.complete({ base, tip: whole ? rand(12, 28) : 0, text: whole ? 'Lading ongeschonden afgeleverd!' : `Afgeleverd, ${d.cargo}% heel.`, flawless: whole });
    }
  },

  view(c) {
    const d = c.data, tr = d.tr;
    if (!tr) return {};
    if (d.phase === 'hook') {
      const h = koppelHulp(v, tr, KP_BACK);
      return { marker: { x: tr.kx, y: tr.ky }, progress: `Rit ${c.streak + 1} · koppelen · ${Math.round(h.dist)} m, ${h.tip}`, goal: { label: `Koppel de ${tr.spec.name.toLowerCase()}`, desc: 'Achteruit, rechtdoor onder de oplegger' } };
    }
    return { marker: { x: d.dest.x, y: d.dest.y }, progress: `Rit ${c.streak + 1} · lading ${d.cargo}% heel`, goal: { label: `Naar ${d.klant.naam}`, desc: `${d.dest.street} · ${d.klant.vracht}. Geen inklappers!` } };
  },

  stop(c) { clearTrailer(c); },
};
