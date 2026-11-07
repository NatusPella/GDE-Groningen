import { hoofdspeler } from './players.js';
import { accentVan } from './sidejobprofiel.js';
// Bijbaantje: studentenverhuizing tijdens de KEI-week. Spullen uit de oude
// kamer in het busje sjouwen, voorzichtig door de stad rijden en alles heel
// bij de nieuwe kamer afleveren.

import { unlockAchievement } from './achievements.js';
import {
  pick, rand, nearestOnStreet, kerbSide, spawnJobVehicle, pointAlongRoad, randomStreetPoint, doorSpot,
  spawnPed, pedAlive, holdPed, freePed, say, buildBox, streetNameAt,
} from './sidejobkit.js';

const VAN = { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 19, turnRate: 2.0, color: '#e8e6e0' };
const CENTRE = { x: 191.86, y: 138.11, r: 1500 };
const REACH = 1.9;
const VAN_REAR = 2.8;
const SHOW_R = 90;

const STUFF = [
  { name: 'de bank van oma', frag: 0.6, size: [0.9, 0.55, 0.6], color: 0x7a4f3a },
  { name: 'een Zweedse boekenkast, half in elkaar', frag: 1.0, size: [0.5, 0.9, 0.35], color: 0xd9c8a6 },
  { name: 'een krat lege flesjes (statiegeld!)', frag: 1.4, size: [0.45, 0.32, 0.32], color: 0xc98a16 },
  { name: 'plant Henk', frag: 1.2, size: [0.35, 0.6, 0.35], color: 0x3f7a3a },
  { name: 'een gitaar met twee snaren', frag: 1.1, size: [0.3, 0.9, 0.12], color: 0x8a4a22 },
  { name: 'een doos "KEUKEN??"', frag: 0.9, size: [0.5, 0.4, 0.4], color: 0xb8925f },
  { name: 'een gamestoel met racestrepen', frag: 0.7, size: [0.6, 0.8, 0.6], color: 0x1c1c1e },
  { name: 'een collectie bierviltjes', frag: 0.3, size: [0.3, 0.2, 0.3], color: 0xb8925f },
  { name: 'de ingelijste poster van de KEI-week', frag: 1.3, size: [0.7, 0.5, 0.06], color: 0x2f5c8a },
  { name: 'een wasrek', frag: 0.5, size: [0.6, 0.7, 0.12], color: 0xc7c9cc },
  { name: 'een waterkoker vol kalk', frag: 0.8, size: [0.25, 0.3, 0.25], color: 0xe8e6e0 },
  { name: 'een bureaulamp in de vorm van een koe', frag: 1.2, size: [0.3, 0.45, 0.3], color: 0xf2ede0 },
];

const STUDENTS = [
  { name: 'Sven', from: 'Appingedam', hello: 'Moi! Ik ben Sven uit Appingedam. Eerste keer in de stad. Zoveel stoplichten!' },
  { name: 'Noor', from: 'Utrecht', hello: 'Hoi! Ik heb eindelijk een kamer. Na zeven maanden op een luchtbed bij mijn tante.' },
  { name: 'Jelmer', from: 'Leeuwarden', hello: 'Goeie. Mijn nieuwe kamer is negen vierkante meter. Met een dakraam!' },
  { name: 'Femke', from: 'Delfzijl', hello: 'Moi! Nieuwe kamer, vier hoog, geen lift. Mijn moeder denkt dat het een penthouse is.' },
];
const THANKS = [
  'Alles heel! Je bent een held. Kom je ook op mijn huisfeest?',
  'Top! Nu alleen nog uitvinden hoe de verwarming werkt.',
  'Dank je! Mijn huisgenoten zijn er niet, die zijn nog aan het ontgroenen.',
];
const BROKEN = ['Eh... was dat er al af?', 'Nou ja, plant Henk groeit wel weer aan.', 'Mijn moeder hoeft dit niet te weten, oké?'];

const NEW_AREAS = [
  { name: 'Paddepoel', x: -1468.36, y: -881.87 }, { name: 'Selwerd', x: -927.1, y: -1494.58 }, { name: 'de Korrewegwijk', x: 358.08, y: -1213.53 },
  { name: 'de Oosterparkwijk', x: 1190.75, y: -673.63 }, { name: 'de Schildersbuurt', x: -860.12, y: 292.14 }, { name: 'de Zeeheldenbuurt', x: -872.95, y: 800.7 },
  { name: 'de Rivierenbuurt', x: 204.15, y: 1255.28 },
];

function findDoor(map, near, rMin, rMax) {
  for (let i = 0; i < 8; i++) {
    const p = randomStreetPoint(map, near.x, near.y, rMin, rMax, { cats: ['normal', 'minor'], within: (x, y) => Math.hypot(x - CENTRE.x, y - CENTRE.y) < CENTRE.r });
    if (!p) continue;
    const door = doorSpot(map, p.x, p.y);
    if (door) return { ...door, street: p.name };
  }
  return null;
}

function vanRear(v) {
  return { x: v.x - Math.cos(v.angle) * VAN_REAR, y: v.y - Math.sin(v.angle) * VAN_REAR };
}

function stackMesh(item) {
  return buildBox(item.size[0], item.size[1], item.size[2], item.color);
}

export default {
  id: 'verhuizing',
  name: 'KEI-week verhuizer',
  color: accentVan('verhuizing'),
  glyph: 'verhuizing',
  boss: 'Verhuisbedrijf Van Kamer naar Kamer',
  vehicleWord: 'het verhuisbusje',
  blurb: 'Studenten verhuizen, zonder breuk',
  tagline: 'Sjouwen, voorzichtig rijden, alles heel afleveren.',
  intro: [
    'Het is KEI-week: half Nederland zoekt een kamer in Grunn en de andere helft verhuist er net uit.',
    'Sjouw de spullen van de oude kamer naar het busje, rij voorzichtig naar het nieuwe adres en zet alles voor de deur.',
    'Elke klap in het busje kost je. Plant Henk heeft al genoeg meegemaakt.',
  ],
  sikkom: (c) => `Verhuizer zet ${c.streak} studenten heel op hun nieuwe kamer, kamernood officieel een beetje minder`,

  anchor(map) {
    const s = nearestOnStreet(map, 'Meeuwerderweg', 856.39, 561.03);
    return s ? kerbSide(map, s, 1.6) : null;
  },

  start(c) {
    const map = c.world.map;
    const rp = map.nearestRoadPoint(c.spot.x, c.spot.y, 80, true);
    if (!rp) return 'Geen plek voor het busje';
    const at = pointAlongRoad(rp.road, rp, 9);
    const v = spawnJobVehicle(c.world, at.x, at.y, { model: VAN });
    if (!v) return 'Geen verhuisbusje beschikbaar';
    c.vehicle = v;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data;
    const map = c.world.map;
    const v = c.vehicle;
    const oldDoor = findDoor(map, v, 20, 55) || { x: c.spot.x, y: c.spot.y, face: 0, street: streetNameAt(map, c.spot.x, c.spot.y) || 'de straat' };
    const area = pick(NEW_AREAS.filter((a) => Math.hypot(a.x - oldDoor.x, a.y - oldDoor.y) > 500));
    const newDoor = findDoor(map, area, 0, 260) || findDoor(map, oldDoor, 500, 1100);
    if (!newDoor) { c.fail('geen vrije kamer te vinden. Kamernood, hè'); return; }
    newDoor.area = area.name;
    const count = 3 + Math.min(c.streak, 3);
    const pool = [...STUFF].sort(() => Math.random() - 0.5).slice(0, count);
    d.items = pool.map((it, i) => ({ ...it, hp: 100, state: 'old', mesh: null, slot: i }));
    d.old = oldDoor;
    d.new = newDoor;
    d.student = pick(STUDENTS);
    d.phase = 'load';
    d.ped = null;
    d.prevSpeed = null;
    d.hitAt = -Infinity;
    placeStack(c, oldDoor);
    d.dist = Math.hypot(newDoor.x - oldDoor.x, newDoor.y - oldDoor.y);
    const tight = (1 - 0.03 * Math.min(c.streak, 8)) * (1 - 0.03 * (c.level - 1));
    c.timeLeft = (count * 26 + d.dist * 1.45 / 10 + 45) * tight;
    c.msg(`Klus: ${d.student.name} verhuist van de ${oldDoor.street} naar ${area.name}. ${count} dingen sjouwen.`, 4);
  },

  timeout: () => 'de student heeft zijn spullen zelf maar op een bakfiets gezet',

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), v = c.vehicle;
    if (!d.items) return;
    const door = d.phase === 'unload' || d.phase === 'drive' ? d.new : d.old;
    if (!d.ped && Math.hypot(door.x - p.x, door.y - p.y) < SHOW_R) {
      d.ped = c.track(spawnPed(world, door.x + Math.cos(door.face + Math.PI / 2) * 1.4, door.y + Math.sin(door.face + Math.PI / 2) * 1.4, 0, { bag: false }));
      say(world, d.ped, d.phase === 'load' ? d.student.hello : 'Daar is mijn busje! Voorzichtig, hè!', 4);
    }
    if (d.ped && pedAlive(world, d.ped)) holdPed(d.ped, p.x, p.y);
    else if (d.ped && !world.pedestrians.includes(d.ped)) d.ped = null;

    if (p.inVehicle === v) {
      if (d.prevSpeed != null && d.prevSpeed - v.speed > 4 && d.prevSpeed > 4 && world.time - d.hitAt > 1) {
        d.hitAt = world.time;
        const inVan = d.items.filter((it) => it.state === 'van');
        if (inVan.length) {
          const it = pick(inVan);
          const loss = Math.round(rand(12, 26) * it.frag);
          it.hp = Math.max(0, it.hp - loss);
          d.broke = true;
          c.msg(it.hp <= 0 ? `Krak. Dat was ${it.name}. Was.` : `Boem! Achterin schuift ${it.name} (-${loss}%)`, 3);
        }
      }
      d.prevSpeed = v.speed;
    } else d.prevSpeed = null;

    updateBuddy(c);

    if (d.phase === 'drive' && Math.hypot(v.x - d.new.x, v.y - d.new.y) < 16 && p.inVehicle !== v) {
      d.phase = 'unload';
      c.msg('Aangekomen! Sjouw alles uit het busje naar de voordeur.', 3);
    }
  },

  interact(c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), v = c.vehicle;
    if (p.inVehicle || !d.items) return false;
    const rear = vanRear(v);
    const carried = d.items.find((it) => it.state === 'carried');
    const nearVan = Math.hypot(rear.x - p.x, rear.y - p.y) < REACH + 0.8;
    if (d.phase === 'load') {
      if (carried && nearVan) {
        c.drop();
        carried.state = 'van';
        loadedCheck(c, carried);
        return true;
      }
      if (!carried && Math.hypot(d.old.x - p.x, d.old.y - p.y) < REACH + 0.6) {
        const it = d.items.filter((x) => x.state === 'old').pop();
        if (!it) return false;
        c.removeMesh(it.mesh);
        it.mesh = null;
        it.state = 'carried';
        c.carry(stackMesh(it), { height: 0.55, forward: 0.45, slow: 0.7, hint: 'Eerst dit naar de achterkant van het busje' });
        buddyTake(c, 'old');
        return true;
      }
      return false;
    }
    if (d.phase === 'unload') {
      if (!carried && nearVan) {
        const it = d.items.find((x) => x.state === 'van');
        if (!it) return false;
        it.state = 'carried';
        c.carry(stackMesh(it), { height: 0.55, forward: 0.45, slow: 0.7, hint: 'Eerst dit naar de voordeur' });
        buddyTake(c, 'van');
        return true;
      }
      if (carried && Math.hypot(d.new.x - p.x, d.new.y - p.y) < REACH + 0.6) {
        c.drop();
        placeDone(c, carried);
        deliveredCheck(c);
        return true;
      }
    }
    return false;
  },

  prompt(c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), v = c.vehicle;
    if (p.inVehicle || !d.items) return null;
    const rear = vanRear(v);
    const carried = d.items.find((it) => it.state === 'carried');
    const nearVan = Math.hypot(rear.x - p.x, rear.y - p.y) < REACH + 0.8;
    if (d.phase === 'load') {
      if (carried && nearVan) return { id: 'sj-inladen', x: rear.x, y: rear.y, h: 1.8, key: 'E', label: 'Inladen', sub: carried.name, ring: true };
      if (!carried && Math.hypot(d.old.x - p.x, d.old.y - p.y) < REACH + 0.6) {
        const it = d.items.filter((x) => x.state === 'old').pop();
        if (it) return { id: 'sj-sjouw', x: d.old.x, y: d.old.y, h: 1.6, key: 'E', label: 'Oppakken', sub: it.name, ring: true };
      }
    } else if (d.phase === 'unload') {
      if (!carried && nearVan) {
        const it = d.items.find((x) => x.state === 'van');
        if (it) return { id: 'sj-uitladen', x: rear.x, y: rear.y, h: 1.8, key: 'E', label: 'Uitladen', sub: `${it.name} · ${it.hp}% heel`, ring: true };
      }
      if (carried && Math.hypot(d.new.x - p.x, d.new.y - p.y) < REACH + 0.6) return { id: 'sj-neerzetten', x: d.new.x, y: d.new.y, h: 1.6, key: 'E', label: 'Neerzetten', sub: carried.name, ring: true };
    }
    return null;
  },

  view(c) {
    const d = c.data, v = c.vehicle;
    if (!d.items) return {};
    const n = d.items.length;
    const avg = Math.round(d.items.reduce((s, x) => s + x.hp, 0) / n);
    const carried = d.items.find((it) => it.state === 'carried');
    const rear = vanRear(v);
    if (d.phase === 'load') {
      const inVan = d.items.filter((x) => x.state === 'van').length;
      const target = carried ? rear : d.old;
      return { marker: { x: target.x, y: target.y }, progress: `Inladen ${inVan}/${n}`, goal: { label: carried ? 'Naar de achterkant van het busje' : `Spullen van ${d.student.name}`, desc: carried ? carried.name : `Oude kamer aan de ${d.old.street}` } };
    }
    if (d.phase === 'drive') {
      return { marker: { x: d.new.x, y: d.new.y }, progress: `Onderweg · ${avg}% heel`, goal: { label: `Naar ${d.new.street}`, desc: `Nieuwe kamer in ${d.new.area}. Geen klappen!` } };
    }
    const done = d.items.filter((x) => x.state === 'done').length;
    const target = carried ? d.new : rear;
    return { marker: { x: target.x, y: target.y }, progress: `Uitladen ${done}/${n} · ${avg}% heel`, goal: { label: carried ? 'Naar de voordeur' : 'Uitladen bij het busje', desc: carried ? carried.name : 'Achterkant van het busje, E' } };
  },

  onCarryLost(c) {
    const d = c.data;
    const it = d.items && d.items.find((x) => x.state === 'carried');
    c.drop();
    if (!it) return;
    if (d.phase === 'load') { it.state = 'old'; placeStack(c, d.old); }
    else it.state = 'van';
  },

  stop(c) {
    const d = c.data;
    if (d.ped) freePed(d.ped);
    dropBuddy(c, false);
  },
};

function loadedCheck(c, it) {
  const d = c.data, world = c.world;
  const left = d.items.filter((x) => x.state === 'old' || x.state === 'buddy' || x.state === 'carried').length;
  if (!left) {
    d.phase = 'drive';
    if (d.ped) { say(world, d.ped, 'Ik fiets er wel achteraan!', 3); freePed(d.ped); d.ped = null; }
    c.msg(`Alles ingeladen. Rij voorzichtig naar ${d.new.street} in ${d.new.area}.`, 3.5);
  } else c.msg(`Ingeladen: ${it.name}. Nog ${left} te gaan.`, 2.2);
}

function placeDone(c, it) {
  const d = c.data;
  it.state = 'done';
  it.mesh = c.addMesh(stackMesh(it));
  const k = d.items.filter((x) => x.state === 'done').length - 1;
  const a = d.new.face + Math.PI / 2;
  it.mesh.position.set(d.new.x + Math.cos(a) * (k - 1.5) * 0.7, 0, d.new.y + Math.sin(a) * (k - 1.5) * 0.7);
}

function deliveredCheck(c) {
  const d = c.data, world = c.world;
  if (!d.items.every((x) => x.state === 'done')) return;
  const avg = d.items.reduce((s, x) => s + x.hp, 0) / d.items.length;
  const whole = d.items.every((x) => x.hp >= 100);
  if (whole) unlockAchievement(world, 'sj_verhuizing');
  const ped = spawnPed(world, d.new.x, d.new.y, 0);
  say(world, ped, whole ? pick(THANKS) : pick(BROKEN), 3.5);
  freePed(ped);
  const base = (45 + d.items.length * 16 + d.dist / 30) * (0.4 + 0.6 * avg / 100);
  c.complete({ base, tip: whole ? rand(15, 30) : 0, text: whole ? 'Alles heel afgeleverd!' : `Afgeleverd, ${Math.round(avg)}% heel.`, flawless: whole });
}

// Sjouwen doe je met z'n tweeën: when the player picks something up with
// Tammo/Tessa close by, the companion grabs the next item too, follows along
// with it and puts it down on reaching the van or the new front door.
function companionFree(world) {
  const cp = world.companion, p = hoofdspeler(world);
  if (!cp || cp.state === 'dead' || cp.inVehicle || cp.water || cp.ragdoll) return null;
  return Math.hypot(cp.x - p.x, cp.y - p.y) < 7 ? cp : null;
}

function buddyTake(c, from) {
  const d = c.data, cp = companionFree(c.world);
  if (!cp || d.items.some((x) => x.state === 'buddy')) return;
  const it = from === 'old' ? d.items.filter((x) => x.state === 'old').pop() : d.items.find((x) => x.state === 'van');
  if (!it) return;
  if (it.mesh) { c.removeMesh(it.mesh); it.mesh = null; }
  it.state = 'buddy';
  it.buddyFrom = from;
  it.mesh = c.addMesh(stackMesh(it));
  cp.carrying = 1;
  c.msg(`${cp.character === 'anita' ? 'Tessa' : 'Tammo'} sjouwt ${it.name} mee`, 2.2);
}

function dropBuddy(c, back = true) {
  const d = c.data;
  if (c.world.companion) c.world.companion.carrying = 0;
  const it = d.items && d.items.find((x) => x.state === 'buddy');
  if (!it) return;
  if (it.mesh) { c.removeMesh(it.mesh); it.mesh = null; }
  it.state = it.buddyFrom === 'old' ? 'old' : 'van';
  if (back && it.state === 'old') placeStack(c, d.old);
}

function updateBuddy(c) {
  const d = c.data, world = c.world, cp = world.companion, v = c.vehicle;
  const it = d.items && d.items.find((x) => x.state === 'buddy');
  if (!it) { if (cp && cp.carrying) cp.carrying = 0; return; }
  if (!cp || cp.state === 'dead' || cp.inVehicle || cp.water || cp.ragdoll || Math.hypot(cp.x - hoofdspeler(world).x, cp.y - hoofdspeler(world).y) > 18) { dropBuddy(c); return; }
  const a = cp.angle;
  it.mesh.position.set(cp.x + Math.cos(a) * 0.45, 0.55 + (cp.gz || 0), cp.y + Math.sin(a) * 0.45);
  it.mesh.rotation.set(0, -a, 0);
  const target = it.buddyFrom === 'old' ? vanRear(v) : d.new;
  if (Math.hypot(target.x - cp.x, target.y - cp.y) > REACH + 1.4) return;
  c.removeMesh(it.mesh);
  it.mesh = null;
  cp.carrying = 0;
  if (it.buddyFrom === 'old') {
    it.state = 'van';
    loadedCheck(c, it);
  } else {
    placeDone(c, it);
    deliveredCheck(c);
  }
}

// Boxes waiting at the old door, re-laid whenever the stack changes.
function placeStack(c, door) {
  const d = c.data;
  let k = 0;
  const a = door.face + Math.PI / 2;
  for (const it of d.items) {
    if (it.state !== 'old') continue;
    if (!it.mesh) it.mesh = c.addMesh(stackMesh(it));
    it.mesh.position.set(door.x + Math.cos(a) * (k - 1) * 0.75 - Math.cos(door.face) * 0.2, 0, door.y + Math.sin(a) * (k - 1) * 0.75 - Math.sin(door.face) * 0.2);
    k++;
  }
}


