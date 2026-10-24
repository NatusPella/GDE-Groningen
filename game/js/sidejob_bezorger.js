// Bijbaantje: maaltijdbezorger voor "Hap & Rap" op een e-fatbike. Ophalen
// bij een zaak, bezorgen voor het koud is; tegenwind en regen werken tegen.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  pick, rand, nearestOnStreet, doorSpot, randomStreetPoint, spawnJobVehicle, pointAlongRoad, decorateVehicle,
  spawnPed, pedAlive, holdPed, freePed, say, streetNameAt, afstandNaast,
} from './sidejobkit.js';

const FATBIKE = { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 7.8, accel: 4.2, brake: 6, turnRate: 3.8, color: '#e4572e' };
const CENTRE = { x: 191.86, y: 138.11, r: 1300 };
const PICKUP_R = 4.5;
const HANDOVER_R = 3.2;
const CUSTOMER_SHOW_R = 80;
const CRASH_DROP = 4;
const CRASH_COOL = 12;

const ZAKEN = [
  { name: 'Snackbar De Vette Hap', street: 'Oosterstraat', at: [402.99, 360.13], menu: ['patatje oorlog', 'frikandel speciaal', 'kroket op brood', 'eierbal, want Grunn'] },
  { name: 'Pizzeria Mamma Grunn', street: 'Folkingestraat', at: [-14.94, 425.37], menu: ['pizza shoarma', 'pizza quattro stagioni', 'calzone'] },
  { name: 'Wok & Rol', street: 'Herestraat', at: [267.5, 533.49], menu: ['bami speciaal', 'nasi met saté', 'loempia'] },
  { name: 'Soep & Stoet', street: 'Nieuwstad', at: [133.98, 460.18], menu: ['Grunneger mosterdsoep', 'stoetbrood met oude kaas', 'krentenwegge'] },
  { name: 'Kapsalonpaleis', street: 'Steentilstraat', at: [495.91, 341.49], menu: ['kapsalon', 'kapsalon XL', 'kapsalon zonder sla, "voor de gezondheid"'] },
  { name: 'Shoarma Sultan', street: 'Gedempte Zuiderdiep', at: [112.76, 510.86], menu: ['broodje shoarma', 'shoarmaschotel', 'falafelbak'] },
];

const COOK_LINES = [
  'Hier, nog gloeiend. Niet onderweg van snoepen!',
  'Bestelling staat klaar. Trap maar hard, de wind staat verkeerd.',
  'Voorzichtig, de saus lekt als je over de keien gaat.',
  'Op tijd graag, deze klant geeft altijd één ster.',
  'Nait soezen, moar deurbroezen! Hij mout waarm aankomen.',
];
const WARM_LINES = ['Moi! Nog warm ook. Hou dij goud!', 'Precies op tijd, top!', 'Nog warm? In Grunn is dat een wonder.', 'Joa, lekker. Moi!'];
const LUKE_LINES = ['Lauw... Nou ja, eten is eten.', 'Lauw. Nou ja, wat mout, dat mout.', 'Hij is wel een beetje slap geworden, hè.', 'Duurde lang. Stond de brug open?'];
const CUSTOMERS = [
  'Student met een hoodie van de roeivereniging',
  'Oma Geertje van driehoog',
  'Een tentamenweek-zombie',
  'Een Ommelander op kamers in de stad',
  'Een gezin met vier hongerige kinderen',
];

function doorAtStreet(map, def) {
  const s = nearestOnStreet(map, def.street, def.at[0], def.at[1]) || { x: def.at[0], y: def.at[1] };
  return doorSpot(map, s.x, s.y) || { x: s.x, y: s.y, face: 0 };
}

function thermoBox() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.46), new THREE.MeshLambertMaterial({ color: 0xe4572e }));
  box.position.set(-0.66, 1.02, 0);
  g.add(box);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.08, 0.47), new THREE.MeshLambertMaterial({ color: 0xf2ede0 }));
  band.position.set(-0.66, 1.06, 0);
  g.add(band);
  return g;
}

function windInfo(world, v) {
  const w = world.weather || {};
  const dir = Number.isFinite(w.windAngle) ? w.windAngle : 0;
  const bft = Math.round(4 + (w.intensity || 0) * 3);
  const along = Math.cos(v.angle - dir);
  return { bft, along };
}

function newOrder(c) {
  const d = c.data;
  const map = c.world.map;
  const here = d.last || { x: c.spot.x, y: c.spot.y };
  const cand = d.zaken.filter((z) => z !== d.zaak).sort((a, b) => Math.hypot(a.door.x - here.x, a.door.y - here.y) - Math.hypot(b.door.x - here.x, b.door.y - here.y));
  const zaak = pick(cand.slice(0, 3));
  const rMin = 220 + 40 * Math.min(c.streak, 10);
  const rMax = Math.min(1100, 520 + 70 * c.streak);
  let door = null, street = null;
  for (let i = 0; i < 6 && !door; i++) {
    const p = randomStreetPoint(map, zaak.door.x, zaak.door.y, rMin, rMax, { cats: ['normal', 'minor', 'cycle'], within: (x, y) => Math.hypot(x - CENTRE.x, y - CENTRE.y) < CENTRE.r });
    if (!p) continue;
    door = doorSpot(map, p.x, p.y);
    street = p.name;
  }
  if (!door) {
    const p = randomStreetPoint(map, zaak.door.x, zaak.door.y, 200, 500) || { x: zaak.door.x + 200, y: zaak.door.y, name: 'Hereweg' };
    door = { x: p.x, y: p.y, face: 0 };
    street = p.name || streetNameAt(map, p.x, p.y) || 'Onbekende straat';
  }
  const n = 1 + Math.floor(Math.random() * 3);
  return { zaak, door, street, nr: 1 + Math.floor(Math.random() * 140), dish: pick(zaak.menu), n, who: pick(CUSTOMERS), dist: Math.hypot(door.x - zaak.door.x, door.y - zaak.door.y) };
}

export default {
  id: 'bezorger',
  name: 'Hap & Rap bezorger',
  color: '#e4572e',
  glyph: 'bezorger',
  boss: 'Planner Hap & Rap',
  boardFirst: true,
  boardText: 'Stap op de bezorgfiets',
  vehicleWord: 'de bezorgfiets',
  blurb: 'Eten rondbrengen op de e-fatbike',
  tagline: 'Ophalen, trappen, bezorgen. Voor het koud is.',
  intro: [
    'Moi! Welkom bij Hap & Rap. De e-fatbike staat voor je klaar, de thermobox zit erop.',
    'Ophalen bij de zaak, bezorgen voor het eten koud is. Warm eten is fooi, lauw eten is een klacht.',
    'En let op de wind. In Grunn heb je altijd tegenwind. Ook als je omdraait.',
  ],
  sikkom: (c) => `Bezorger fietst ${c.streak} bestellingen op rij warm door de stad, klanten verbijsterd`,

  anchor(map) {
    const s = nearestOnStreet(map, 'Gedempte Kattendiep', 433.94, 352.58);
    return s ? doorSpot(map, s.x, s.y) || s : null;
  },

  start(c) {
    const map = c.world.map;
    const rp = map.nearestRoadPoint(c.spot.x, c.spot.y, 60, false);
    const at = rp ? pointAlongRoad(rp.road, rp, 4) : c.spot;
    const v = spawnJobVehicle(c.world, at.x, at.y, { kind: 'bike', model: FATBIKE, angle: at.angle });
    if (!v) return 'Geen bezorgfiets beschikbaar';
    c.vehicle = v;
    c.data.zaken = ZAKEN.map((z) => ({ ...z, door: doorAtStreet(map, z) }));
    c.data.crashAt = -Infinity;
    return true;
  },

  round(c) {
    const d = c.data;
    d.order = newOrder(c);
    d.zaak = d.order.zaak;
    d.phase = 'pickup';
    d.warmth = 100;
    d.cook = null;
    d.customer = null;
    d.rainNoted = false;
    const o = d.order;
    const p = c.world.player;
    const toZaak = Math.hypot(o.zaak.door.x - p.x, o.zaak.door.y - p.y);
    c.timeLeft = Math.max(35, toZaak * 1.5 / 7.5 + 25);
    c.msg(`Nieuwe bestelling: ${o.n}x ${o.dish}. Ophalen bij ${o.zaak.name}.`, 3.5);
  },

  needsVehicle: () => true,

  timeout(c) {
    return c.data.phase === 'pickup' ? 'de kok gaf je bestelling aan een andere bezorger' : 'het eten is koud. De klant belt de klantenservice';
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data, o = d.order, p = world.player, v = c.vehicle;
    decorateVehicle(v, 'box', thermoBox);

    if (p.inVehicle === v) {
      const s = v.speed;
      if (d.prevSpeed != null && d.prevSpeed - s > CRASH_DROP && d.prevSpeed > 5 && world.time - d.crashAt > 1) {
        d.crashAt = world.time;
        if (d.phase === 'deliver') {
          d.warmth = Math.max(0, d.warmth - CRASH_COOL);
          d.bumped = true;
          c.msg(`Boem! De ${o.dish.split(',')[0]} ligt op z'n kop (-${CRASH_COOL}% warm)`, 2.6);
        }
      }
      d.prevSpeed = s;
      const wi = windInfo(world, v);
      d.wind = wi;
      if (wi.along < -0.3 && v.speed > 2) v.speed = Math.max(2, v.speed - (-wi.along) * 0.6 * wi.bft * dt);
    } else {
      d.prevSpeed = null;
      d.wind = null;
    }

    if (d.phase === 'pickup') {
      const door = o.zaak.door;
      const dd = afstandNaast(world, door.x, door.y); // ook een meespelende gast kan ophalen (samen spelen, #452)
      if (!d.cook && dd < CUSTOMER_SHOW_R) {
        d.cook = c.track(spawnPed(world, door.x, door.y, door.face, { shirt: '#f2ede0', bag: false }));
      }
      if (d.cook && pedAlive(world, d.cook)) holdPed(d.cook, p.x, p.y);
      if (dd < PICKUP_R) {
        d.phase = 'deliver';
        if (d.cook) { say(world, d.cook, pick(COOK_LINES), 3); freePed(d.cook); d.cook = null; }
        const budget = (o.dist * 1.45) / 7 + 22;
        const tight = (1 - 0.035 * Math.min(c.streak, 8)) * (1 - 0.03 * (c.level - 1));
        d.decay = 100 / (budget * tight);
        d.warmth = 100;
        c.timeLeft = d.warmth / d.decay;
        c.msg(`Opgehaald! Naar ${o.street} ${o.nr}. ${o.who} wacht.`, 3.5);
      }
      return;
    }

    let rate = d.decay;
    const rain = world.weather && world.weather.intensity > 0.3;
    if (rain) {
      rate *= 1.25;
      if (!d.rainNoted) { d.rainNoted = true; c.msg('Regen! De friet wordt slap. Doortrappen!', 2.8); }
    }
    d.warmth = Math.max(0, d.warmth - rate * dt);
    c.timeLeft = d.warmth / rate;

    const door = o.door;
    const dd = afstandNaast(world, door.x, door.y);
    if (!d.customer && dd < CUSTOMER_SHOW_R) {
      d.customer = c.track(spawnPed(world, door.x, door.y, door.face));
    }
    const cu = d.customer && pedAlive(world, d.customer) ? d.customer : null;
    if (cu) holdPed(cu, p.x, p.y);
    const target = cu || door;
    if (afstandNaast(world, target.x, target.y) < HANDOVER_R) { // de host of een meespelende gast staat bij de deur (#452)
      const warm = d.warmth;
      const tip = warm > 70 ? rand(6, 12) * (1 + c.streak * 0.1) : warm > 40 ? rand(2, 5) : 0;
      if (cu) { say(world, cu, pick(warm > 55 ? WARM_LINES : LUKE_LINES), 3.2); freePed(cu); }
      d.customer = null;
      d.last = { x: door.x, y: door.y };
      c.complete({ base: 16 + o.dist / 22 + o.n * 3, tip, text: warm > 70 ? 'Warm bezorgd!' : 'Bezorgd.', flawless: !d.bumped });
    }
  },

  view(c) {
    const d = c.data, o = d.order;
    if (!o) return {};
    if (d.phase === 'pickup') {
      return {
        marker: { x: o.zaak.door.x, y: o.zaak.door.y },
        progress: `Bestelling ${c.streak + 1} · ophalen`,
        goal: { label: `Ophalen bij ${o.zaak.name}`, desc: `${o.n}x ${o.dish}` },
      };
    }
    const w = d.wind;
    const wind = !w ? '' : w.along < -0.5 ? ` · tegenwind ${w.bft}` : w.along > 0.5 ? ' · wind mee' : '';
    return {
      marker: { x: o.door.x, y: o.door.y },
      progress: `Bestelling ${c.streak + 1} · warm ${Math.round(d.warmth)}%${wind}`,
      goal: { label: `Bezorgen: ${o.street} ${o.nr}`, desc: `${o.n}x ${o.dish}, voor het koud is` },
    };
  },

  stop(c) {
    const d = c.data;
    if (d.cook) freePed(d.cook);
    if (d.customer) freePed(d.customer);
  },
};
