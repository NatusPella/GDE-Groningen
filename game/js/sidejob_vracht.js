// Bijbaantje: vrachtwagenchauffeur voor "Hunze Vrachtvervoer". Eerst achteruit
// onder een oplegger koppelen, dan laden, de lading rustig naar de klant brengen en
// daar lossen: geen inklappers, geen harde klappen. De scharnierlogica staat in
// semitrailer.js, het contract (type, tarief, laad- en lostijd) in vrachtmarkt.js.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  pick, rand, nearestOnStreet, kerbSide, spawnJobVehicle, pointAlongRoad, randomStreetPoint, streetNameAt,
} from './sidejobkit.js';
import { newTrailer, couple, uncouple, stepTrailer, fifthWheel, loadedHandling, koppelHulp } from './semitrailer.js';
import { maakAanbod, contractLoon, laadTijd, losTijd } from './vrachtmarkt.js';

const TRACTOR = { name: 'truck', len: 6.6, wid: 2.5, maxSpeed: 24, accel: 3.6, brake: 12, turnRate: 1.5, color: '#2f5c8a' };
const KP_BACK = 1.6;
const ARRIVE_R = 14;
const ARRIVE_SPEED = 1.6;
const CRASH_DROP = 4.5;
const STIL_SPEED = 1.2;   // m/s: langzamer dan dit geldt als stilstaan bij de laaddeur of de losplaats
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
    const dest = randomStreetPoint(map, v.x, v.y, 450, 1300, { cats: ['normal'] })
      || { x: v.x + 600, y: v.y, name: streetNameAt(map, v.x + 600, v.y) || 'Hereweg' };
    clearTrailer(c);
    const dist = Math.hypot(dest.x - v.x, dest.y - v.y);
    // Vrachtmarkt (#492): geen random klant meer, maar een contract met type, tarief per km
    // en laad-/lostijd. De markt zelf is deterministisch per seed; de afstand van de rit komt
    // uit de wereld en is dat niet, dus een nieuwe dienst geeft een nieuw aanbod. Van de drie
    // aanbiedingen van de markt neemt de rit er per ronde een, zodat elk type langskomt.
    const markt = maakAanbod((c.round + 1) * 7919 + Math.round(dist), dist / 1000, c.level);
    const contract = markt[c.round % markt.length];
    // Oplegger achter de trekker, dezelfde koers: eerst achteruit koppelen.
    const fw = fifthWheel(v, KP_BACK);
    const gap = 8;
    d.tr = newTrailer(contract.trailer, fw.x - Math.cos(v.angle) * gap, fw.y - Math.sin(v.angle) * gap, v.angle);
    d.tr.mesh = c.addMesh(buildTrailerMesh(d.tr.spec));
    poseTrailer(d.tr, v);
    d.contract = contract;
    d.dest = { x: dest.x, y: dest.y, street: dest.name || streetNameAt(map, dest.x, dest.y) || 'de weg' };
    d.dist = dist;
    d.phase = 'hook';
    d.cargo = 100;
    d.jack = false;
    d.hadJack = false;
    d.bumped = false;
    d.hinted = false;
    d.wachtHint = false;
    d.loadLeft = laadTijd(contract);
    d.losLeft = losTijd(contract);
    d.prevSpeed = null;
    d.hitAt = -Infinity;
    Object.assign(v.model, d.base);
    // Laden en lossen horen bij de rit: die tijd komt bovenop de limiet, zodat wachten bij de
    // laaddeur of de losplaats nooit de reden is dat de klus mislukt.
    c.timeLeft = 90 + (d.dist * 1.7) / 10 + d.loadLeft + d.losLeft;
    c.msg(`Klus: ${contract.vracht} naar ${contract.klant}. ${contract.naam}, €${contract.tariefPerKm} per km. Rij achteruit onder de oplegger.`, 4.5);
  },

  timeout: (c) => {
    const phase = c.data.phase;
    if (phase === 'hook') return 'de oplegger is aan een andere chauffeur gegeven';
    if (phase === 'load') return 'de laadploeg stopte ermee: de vracht staat er nog';
    if (phase === 'unload') return 'de afnemer sloot de losplaats: de lading staat er nog';
    return 'de lading kwam te laat. De klant belt de directie';
  },

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
        d.phase = 'load';
        d.loadLeft = laadTijd(d.contract);
        d.wachtHint = false;
        fx(world, 'bridge_clunk', tr.kx, tr.ky, { gain: 0.9, rate: 0.75 });
        c.msg(`Gekoppeld! De laadploeg begint: ${Math.round(d.loadLeft)} s laden, blijf rustig staan.`, 3.5);
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
    // Laden na het koppelen en lossen bij de afnemer: alleen terwijl de trekker stilstaat.
    // Rijd je weg, dan pauzeert de ploeg en verlies je niets; de klok loopt wel door, maar
    // de laad- en lostijd zitten al in c.timeLeft. Wachten kan een ronde dus nooit laten falen.
    if (d.phase === 'load') {
      if (Math.abs(v.speed) < STIL_SPEED) {
        d.wachtHint = false;
        d.loadLeft -= dt;
        if (d.loadLeft <= 0) {
          d.phase = 'haul';
          c.msg(`Geladen: ${d.contract.vracht}. Naar ${d.contract.klant}, ${d.dest.street}. Rustig in de bocht.`, 3.5);
        }
      } else if (!d.wachtHint) {
        d.wachtHint = true;
        c.msg('De laadploeg wacht tot je stilstaat.', 2.6);
      }
      return;
    }
    if (d.phase === 'haul' && Math.hypot(v.x - d.dest.x, v.y - d.dest.y) < ARRIVE_R && Math.abs(v.speed) < ARRIVE_SPEED) {
      d.phase = 'unload';
      d.losLeft = losTijd(d.contract);
      d.wachtHint = false;
      c.msg(`Bij ${d.contract.klant}: ${Math.round(d.losLeft)} s lossen. Blijf staan bij de losplaats.`, 3);
    }
    if (d.phase === 'unload') {
      // lossen mag alleen bij de afnemer: rijd je weg, dan wacht de ploeg en verlies je niets
      const bijAfnemer = Math.hypot(v.x - d.dest.x, v.y - d.dest.y) <= ARRIVE_R;
      if (!bijAfnemer) {
        if (!d.wachtHint) {
          d.wachtHint = true;
          c.msg('Rijd terug naar de losplaats; de ploeg wacht.', 2.8);
        }
        return;
      }
      if (Math.abs(v.speed) < STIL_SPEED) {
        d.wachtHint = false;
        d.losLeft -= dt;
        if (d.losLeft <= 0) {
          uncouple(tr);
          const whole = d.cargo >= 100 && !d.hadJack;
          c.msg(whole ? pick(THANKS) : pick(BUMPY), 3.5);
          // Het loon komt uit het contract (vrachtmarkt.js); laadschade kort hetzelfde deel af als voorheen.
          const base = contractLoon(d.contract) * (0.4 + 0.6 * d.cargo / 100);
          c.complete({ base, tip: whole ? rand(12, 28) : 0, text: whole ? 'Lading ongeschonden afgeleverd!' : `Afgeleverd, ${d.cargo}% heel.`, flawless: whole });
        }
      } else if (!d.wachtHint) {
        d.wachtHint = true;
        c.msg('De afnemer wacht tot je stilstaat.', 2.6);
      }
      return;
    }
  },

  view(c) {
    const d = c.data, tr = d.tr;
    if (!tr) return {};
    if (d.phase === 'hook') {
      const h = koppelHulp(c.vehicle, tr, KP_BACK);
      return { marker: { x: tr.kx, y: tr.ky }, progress: `Rit ${c.streak + 1} · koppelen · ${Math.round(h.dist)} m, ${h.tip}`, goal: { label: `Koppel de ${tr.spec.name.toLowerCase()}`, desc: 'Achteruit, rechtdoor onder de oplegger' } };
    }
    if (d.phase === 'load') {
      return { marker: { x: tr.kx, y: tr.ky }, progress: `Rit ${c.streak + 1} · laden ${Math.max(0, Math.ceil(d.loadLeft))} s · lading ${d.cargo}% heel`, goal: { label: 'Laden bij de oplegger', desc: `${d.contract.vracht} · blijf staan, de laadploeg is bezig` } };
    }
    if (d.phase === 'unload') {
      return { marker: { x: d.dest.x, y: d.dest.y }, progress: `Rit ${c.streak + 1} · lossen ${Math.max(0, Math.ceil(d.losLeft))} s · lading ${d.cargo}% heel`, goal: { label: `Lossen bij ${d.contract.klant}`, desc: `${d.dest.street} · ${d.contract.vracht}` } };
    }
    return { marker: { x: d.dest.x, y: d.dest.y }, progress: `Rit ${c.streak + 1} · ${d.contract.naam} · €${d.contract.tariefPerKm} per km`, goal: { label: `Naar ${d.contract.klant}`, desc: `${d.dest.street} · ${d.contract.vracht}. Geen inklappers!` } };
  },

  stop(c) { clearTrailer(c); },
};
