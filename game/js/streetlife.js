// Open-wereldleven, batch 1: the people on foot and what you can do with them.
// Street-paper sellers ("De Reep"), someone asking for a coin, Bernhard met de
// Karretje, magnet fishers on the quays (a small pickup; a rare old grenade
// that you report to the police for a reward: nothing ever explodes), and
// students carrying a sofa through town. The standing ones are scene
// pedestrians created by the cityprops.js slots (kinds seller, beggar, bernard,
// magnet); this module dresses them, gives them lines and the E prompt.
// Text only: no recordings, no voice. All names are invented.
import { dist } from './util.js';
import { spawnPedestriansNear, Pedestrian } from './pedestrians.js';
import { isInsideBuilding } from './pedgeom.js';
import { makeCompanion } from './pedroutes.js';
import { wijkProfileAt } from './trafficfleet.js';
import { weekdayOf } from './calendar.js';
import { maakGroep, vrijgezellenKans, maxGroepjes, volgendeJuich, JUICH_DUUR, BRUID_LINES, GAST_LINES, JUICH_LINES, WAGGEL } from './vrijgezellen.js';
import {
  NAMES, SELLER_LINES, SELLER_BUY, BEGGAR_ASK, BEGGAR_THANKS, BEGGAR_NO_COIN, BERNARD_LINES,
  GRENADE_REWARD, GRENADE_FOUND, GRENADE_REPORTED, CARRIED, SKATER_MAX, SKATER_PACE, SKATER_LINES, skaterChance,
  wijkClothing, wijkBagChance, COURIER_MAX, COURIER_LINES, footCourierChance,
  ONTGROENING, ONTGROENING_MAX, LEADER_LINES, FRESHMAN_LINES, ontgroeningChance, rollMagnet, moverWalkerChance, distToCentre, hourOf, finite,
} from './streetlifedata.js';

export const KINDS = ['seller', 'beggar', 'bernard', 'magnet'];
export const PAPER_PRICE = 2;
export const COIN = 1;
export const REACH = 1.9;
export const REPORT_REACH = 3.2;
const MAGNET_PAUSE_S = 5;
const ASK_RANGE = 5;
const MAX_CARRIERS = 2;

const state = { grenade: false, coins: 0, papers: 0, junk: 0, reported: 0, bernardAt: 0 };
let readyAt = 0;
let moverTimer = 20;
let lineAt = -Infinity;
let skateTimer = 25;
let groupTimer = 50;
let partyTimer = 40;
let partyLineAt = -Infinity;
let courierTimer = 35;
let groupLineAt = -Infinity;

export function getStreetLifeState() {
  return { ...state };
}
export function resetStreetLife() {
  Object.assign(state, { grenade: false, coins: 0, papers: 0, junk: 0, reported: 0, bernardAt: 0 });
  readyAt = 0;
  moverTimer = 20;
  lineAt = -Infinity;
  skateTimer = 25;
  groupTimer = 50;
  partyTimer = 40;
  partyLineAt = -Infinity;
  courierTimer = 35;
  groupLineAt = -Infinity;
}

// How each standing person looks (clothes, a hat, what they carry).
const LOOKS = {
  seller: { clothing: '#e0a020', carry: 'paper', look: { top: 'jacket' } },
  beggar: { clothing: '#6b6862', look: { top: 'hoodie', hat: 'beanie', hatColor: 0x3a3a3c } },
  bernard: { clothing: '#4a5a46', look: { top: 'coat', hat: 'flatcap', hatColor: 0x3a3028, facial: 'beard', age: 'old', hair: 0x9a9a9a, hairStyle: 'short' } },
  magnet: { clothing: '#2f3b4a', look: { top: 'jacket', hat: 'cap', hatColor: 0x2a2a2a } },
};

// Called by cityprops.js when a slot of one of our kinds gets its pedestrian.
export function decorateScenePed(ped, kind) {
  const l = LOOKS[kind];
  if (!l) return;
  ped.streetKind = kind;
  ped.clothing = l.clothing;
  ped.hasBag = false;
  if (l.carry) ped.carry = l.carry;
  ped.look = l.look;
}

const pick = (list, rng = Math.random) => list[Math.floor(rng() * list.length)];

function say(ped, world, text, secs = 3) {
  ped.speechText = text;
  ped.speechUntil = world.time + secs;
}

// The standing person within reach, of one of our kinds.
export function nearestFolk(world, reach = REACH) {
  const p = world.player;
  if (!p || p.inVehicle || p.swimming || p.dead) return null;
  let best = null, bd = reach;
  for (const ped of world.pedestrians || []) {
    if (!ped.scene || ped.state === 'dead' || !KINDS.includes(ped.scene.kind)) continue;
    const d = dist(p.x, p.y, ped.x, ped.y);
    if (d <= bd) { best = ped; bd = d; }
  }
  return best;
}

// Somebody to report the grenade to: an officer on foot or a police station.
export function nearestReporter(world) {
  const p = world.player;
  if (!state.grenade || !p || p.inVehicle || p.swimming) return null;
  for (const ped of world.pedestrians || []) {
    if (ped.isCop && ped.state !== 'dead' && dist(p.x, p.y, ped.x, ped.y) <= REPORT_REACH) return { x: ped.x, y: ped.y, ped };
  }
  const meta = (world.map && world.map.meta) || {};
  for (const s of meta.policeStations || []) {
    if (finite(s.x, s.y) && dist(p.x, p.y, s.x, s.y) <= 10) return { x: s.x, y: s.y, ped: null };
  }
  return null;
}

export function streetLifePrompt(world) {
  const rep = nearestReporter(world);
  if (rep) return { id: 'granaat-melden', x: rep.x, y: rep.y, h: 1.9, key: 'E', label: 'Politie', sub: `Oude granaat melden, beloning €${GRENADE_REWARD}`, ring: true };
  const ped = nearestFolk(world);
  if (!ped) return null;
  const k = ped.scene.kind;
  const id = 'straatleven-' + k + '-' + Math.round(ped.x) + ',' + Math.round(ped.y);
  const wait = world.time < readyAt;
  const money = world.money || 0;
  if (k === 'seller') {
    return { id, x: ped.x, y: ped.y, h: 1.9, key: 'E', label: NAMES.paper, sub: money < PAPER_PRICE ? `Te weinig geld (€${PAPER_PRICE})` : `Koop een krant, €${PAPER_PRICE}`, ring: true, dim: money < PAPER_PRICE || wait };
  }
  if (k === 'beggar') {
    return { id, x: ped.x, y: ped.y, h: 1.5, key: 'E', label: 'Muntje geven', sub: money < COIN ? 'Geen kleingeld bij je' : `Geef €${COIN}`, ring: true, dim: money < COIN || wait };
  }
  if (k === 'bernard') {
    return { id, x: ped.x, y: ped.y, h: 1.9, key: 'E', label: NAMES.bernard, sub: money < COIN ? 'Een praatje maken' : `Een praatje, €${COIN} erbij`, ring: true, dim: wait };
  }
  if (k === 'magnet') {
    return { id, x: ped.x, y: ped.y, h: 1.9, key: 'E', label: 'Magneetvisser', sub: wait ? 'De magneet hangt nog in het water' : 'Meetrekken aan het touw', ring: true, dim: wait };
  }
  return null;
}

function giveCoin(world, ped) {
  if ((world.money || 0) < COIN) return false;
  world.money -= COIN;
  state.coins++;
  return true;
}

// E on a standing person. Returns true when the press was used.
export function useStreetLife(world, rng = Math.random) {
  const rep = nearestReporter(world);
  if (rep) {
    state.grenade = false;
    state.reported++;
    world.money = (world.money || 0) + GRENADE_REWARD;
    world.addMessage(`${GRENADE_REPORTED} +€${GRENADE_REWARD}`, 5, { kind: 'politie', key: 'granaat' });
    if (rep.ped) say(rep.ped, world, 'Goed gedaan. Wij nemen het over.', 3.5);
    return true;
  }
  const ped = nearestFolk(world);
  if (!ped) return false;
  if (world.time < readyAt) return true;
  const k = ped.scene.kind;
  readyAt = world.time + (k === 'magnet' ? MAGNET_PAUSE_S : 1.5);
  if (k === 'seller') {
    if ((world.money || 0) < PAPER_PRICE) { world.addMessage(`${NAMES.paper} kost €${PAPER_PRICE}. Zoveel heb je niet.`, 3); return true; }
    world.money -= PAPER_PRICE;
    state.papers++;
    world.addMessage(`${pick(SELLER_BUY, rng)} -€${PAPER_PRICE}`, 4.5);
    say(ped, world, 'Dankjewel, fijne dag!', 2.6);
  } else if (k === 'beggar') {
    if (giveCoin(world, ped)) {
      say(ped, world, pick(BEGGAR_THANKS, rng), 3);
      world.addMessage(`Je geeft €${COIN}. Hij knikt dankbaar.`, 3);
    } else world.addMessage(BEGGAR_NO_COIN, 3);
  } else if (k === 'bernard') {
    const paid = giveCoin(world, ped);
    const line = BERNARD_LINES[state.bernardAt % BERNARD_LINES.length];
    state.bernardAt++;
    say(ped, world, line, 6);
    world.addMessage(paid ? `Je geeft Bernhard €${COIN}.` : 'Je maakt een praatje met Bernhard.', 3);
  } else if (k === 'magnet') {
    const got = rollMagnet(rng);
    if (got.grenade && state.grenade) { got.grenade = false; got.name = 'een verroeste pan'; got.value = 0; }
    if (got.grenade) {
      state.grenade = true;
      say(ped, world, 'Wacht even... dat is geen blikje. Niet aankomen!', 4);
      world.addMessage(GRENADE_FOUND, 6, { kind: 'politie', key: 'granaat-gevonden' });
    } else {
      state.junk++;
      world.money = (world.money || 0) + got.value;
      say(ped, world, `Kijk, ${got.name}!`, 3);
      world.addMessage(`Magneetvissen: ${got.name}${got.value ? `, schroot goed voor €${got.value}` : ''}.`, 3.5);
    }
  }
  return true;
}

export function tryStreetLifeInteract(world) {
  const { input } = world;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!nearestReporter(world) && !nearestFolk(world)) return false;
  input.consume('e');
  input.consume('f');
  return useStreetLife(world);
}

// Students on foot with a sofa, a mattress or a plant, in the busy parts by day.
export function pickCarrier(map, x, y, hour, rng = Math.random) {
  const prof = wijkProfileAt(map, x, y);
  const chance = moverWalkerChance(prof.key, distToCentre(x, y), hour);
  if (!(rng() < chance * 6)) return null;
  return pick(CARRIED, rng);
}

// Skateboarders: a young walker on a board, quicker than the rest.
export function pickSkater(map, x, y, hour, rng = Math.random) {
  const prof = wijkProfileAt(map, x, y);
  return rng() < skaterChance(prof.key, distToCentre(x, y), hour) * 6;
}

function isMoverCarry(ped) {
  return ped.carry && ped.carry !== 'paper' && ped.carry !== 'skateboard' && ped.carry !== 'eend' && ped.carry !== 'bezorgtas';
}

function spawnSkater(world, p, hour) {
  let skaters = 0;
  for (const ped of world.pedestrians) if (ped.carry === 'skateboard' && ped.state !== 'dead') skaters++;
  if (skaters >= SKATER_MAX || !pickSkater(world.map, p.x, p.y, hour)) return;
  for (const ped of spawnPedestriansNear(world.map, p.x, p.y, 1, Math.random, true)) {
    if (!finite(ped.x, ped.y)) continue;
    ped.carry = 'skateboard';
    ped.hasBag = false;
    ped.paceMul = SKATER_PACE;
    ped.clothing = pick(['#c94b3a', '#3f5c8a', '#1f4a2e', '#c9a227']);
    ped.look = { top: 'hoodie', hat: 'cap', hatColor: 0x2a2a2a };
    ped.speechText = pick(SKATER_LINES);
    ped.speechUntil = world.time + 3;
    world.pedestrians.push(ped);
  }
}

export function pickOrientation(map, x, y, hour, rng = Math.random) {
  const prof = wijkProfileAt(map, x, y);
  return rng() < ontgroeningChance(prof.key, distToCentre(x, y), hour) * 6;
}

// A senior with a megaphone and two first-years walking beside them.
function spawnOrientation(world, p, hour) {
  for (const ped of world.pedestrians) if (ped.ontgroening && ped.state !== 'dead') return;
  if (!pickOrientation(world.map, p.x, p.y, hour)) return;
  const lead = spawnPedestriansNear(world.map, p.x, p.y, 1, Math.random, true)[0];
  if (!lead || !finite(lead.x, lead.y)) return;
  lead.ontgroening = 'leader';
  lead.hasBag = false;
  lead.clothing = ONTGROENING.leaderShirt;
  lead.look = { top: 'jacket', hat: 'cap', hatColor: 0xc9382b };
  const group = [lead];
  for (const s of [1, -1]) {
    const x = lead.x - Math.sin(lead.angle) * 0.85 * s, y = lead.y + Math.cos(lead.angle) * 0.85 * s;
    if (isInsideBuilding(world.map, x, y)) continue;
    const f = new Pedestrian(x, y, lead.angle);
    makeCompanion(f, lead);
    f.pairSide = s;
    f.ontgroening = 'first-year';
    f.hasBag = false;
    f.clothing = ONTGROENING.shirt;
    f.carry = 'eend';
    group.push(f);
  }
  for (const ped of group) world.pedestrians.push(ped);
}

// Vrijgezellenfeestje (#403): een bruid en drie of vier gasten in een gezamenlijk thema, in het centrum en de studentenwijken, vooral
// vrijdag- en zaterdagavond. Ze lopen als een brokje achter de bruid aan, waggelen (scene3d.js) en juichen af en toe.
export const weekdayNow = (world) => (world && world.calendar && Number.isFinite(world.calendar.day) ? weekdayOf(world.calendar.day) : -1);
export function pickVrijgezellen(map, x, y, hour, weekday, rng = Math.random) {
  const prof = wijkProfileAt(map, x, y);
  return rng() < vrijgezellenKans(prof.key, distToCentre(x, y), hour, weekday) * 6;
}

// Zet het groepje neer rond een leider (de bruid); thema kiest een thema, anders een toevalsthema. Geeft de leden terug.
export function zetVrijgezellenNeer(world, lead, thema = null) {
  const groep = maakGroep(Math.random, thema);
  const leden = [lead];
  const info = { thema: groep.thema, groep: leden };
  const stel = (ped, lid, rol) => {
    ped.party = { rol, thema: groep.thema, groep: leden, cheerAt: world.time + 4 + Math.random() * 6 };
    ped.hasBag = false;
    ped.clothing = lid.clothing;
    ped.look = lid.look;
    ped.paceMul = WAGGEL.tempo;
    ped.waggelSeed = Math.random();
  };
  stel(lead, groep.leden[0], 'bruid');
  for (let i = 1; i < groep.leden.length; i++) {
    const lid = groep.leden[i];
    const x = lead.x - Math.sin(lead.angle) * 0.85 * lid.side * lid.k - Math.cos(lead.angle) * lid.back;
    const y = lead.y + Math.cos(lead.angle) * 0.85 * lid.side * lid.k - Math.sin(lead.angle) * lid.back;
    if (isInsideBuilding(world.map, x, y)) continue;
    const f = new Pedestrian(x, y, lead.angle);
    makeCompanion(f, lead);
    f.pairSide = lid.side;
    f.pairK = lid.k;
    f.pairBack = lid.back;
    stel(f, lid, 'gast');
    leden.push(f);
  }
  for (const m of leden) if (m !== lead) world.pedestrians.push(m);
  return info;
}

function spawnVrijgezellen(world, p, hour) {
  const weekday = weekdayNow(world);
  let n = 0;
  for (const ped of world.pedestrians) if (ped.party && ped.party.rol === 'bruid' && ped.state !== 'dead') n++;
  if (n >= maxGroepjes(weekday, hour) || !pickVrijgezellen(world.map, p.x, p.y, hour, weekday)) return;
  const lead = spawnPedestriansNear(world.map, p.x, p.y, 1, Math.random, true)[0];
  if (!lead || !finite(lead.x, lead.y)) return;
  zetVrijgezellenNeer(world, lead);
}

// De juichpartijen en de praatjes van de groepjes: de hele groep juicht na elkaar (elk lid een tel later), de bruid en de gasten praten.
function updateVrijgezellen(world, p) {
  for (const ped of world.pedestrians) {
    if (!ped.party || ped.party.rol !== 'bruid' || ped.state === 'dead' || world.time < ped.party.cheerAt) continue;
    ped.party.cheerAt = volgendeJuich(world.time);
    ped.party.groep.forEach((m, i) => { m.cheerFrom = world.time + i * 0.12; m.cheerUntil = m.cheerFrom + JUICH_DUUR; });
    const d = dist(p.x, p.y, ped.x, ped.y);
    if (d < 25) say(ped.party.groep[Math.floor(Math.random() * ped.party.groep.length)], world, pick(JUICH_LINES), 2.2);
  }
  if (world.time - partyLineAt > 9) {
    for (const ped of world.pedestrians) {
      if (!ped.party || ped.state === 'dead' || ped.speechUntil > world.time) continue;
      const d = dist(p.x, p.y, ped.x, ped.y);
      if (d > 14 || d < 1) continue;
      partyLineAt = world.time;
      say(ped, world, pick(ped.party.rol === 'bruid' ? BRUID_LINES : GAST_LINES), 3.4);
      break;
    }
  }
}

// Dresses ordinary walkers after the district they stand in (once each, a few
// per call). Scene people, officers, companions and our own groups keep their look.
const DRESS_PER_CALL = 4;
export function dressWalkers(world, rng = Math.random) {
  const p = world.player;
  let n = 0;
  for (const ped of world.pedestrians || []) {
    if (ped._wijkDressed || ped.scene || ped.isCop || ped.leader || ped.ontgroening || ped.party || ped.carry || ped.look) { ped._wijkDressed = true; continue; }
    if (!finite(ped.x, ped.y) || dist(p.x, p.y, ped.x, ped.y) > 90) continue;
    ped._wijkDressed = true;
    const key = wijkProfileAt(world.map, ped.x, ped.y).key;
    const c = wijkClothing(key, rng);
    if (c) ped.clothing = c;
    ped.hasBag = rng() < wijkBagChance(key);
    if (++n >= DRESS_PER_CALL) break;
  }
}

// A courier on foot with a big bag on the back, at lunch and dinner time.
export function pickFootCourier(map, x, y, hour, rng = Math.random) {
  const prof = wijkProfileAt(map, x, y);
  return rng() < footCourierChance(prof.key, distToCentre(x, y), hour) * 6;
}

function spawnCourier(world, p, hour) {
  let couriers = 0;
  for (const ped of world.pedestrians) if (ped.carry === 'bezorgtas' && ped.state !== 'dead') couriers++;
  if (couriers >= COURIER_MAX || !pickFootCourier(world.map, p.x, p.y, hour)) return;
  for (const ped of spawnPedestriansNear(world.map, p.x, p.y, 1, Math.random, true)) {
    if (!finite(ped.x, ped.y)) continue;
    ped.carry = 'bezorgtas';
    ped.hasBag = false;
    ped.paceMul = 1.5;
    ped.clothing = '#2fb5a8';
    ped.look = { top: 'jacket', hat: 'cap', hatColor: 0x14403b };
    ped.speechText = pick(COURIER_LINES);
    ped.speechUntil = world.time + 3;
    world.pedestrians.push(ped);
  }
}

export function updateStreetLife(dt, world) {
  if (!dt || world.paused || !world.player) return;
  const p = world.player;
  // the standing ones call out now and then, and the one asking is polite
  if (world.time - lineAt > 14) {
    for (const ped of world.pedestrians || []) {
      if (!ped.scene || ped.state === 'dead' || ped.speechUntil > world.time) continue;
      const k = ped.scene.kind;
      if (k !== 'seller' && k !== 'beggar') continue;
      const d = dist(p.x, p.y, ped.x, ped.y);
      if (d > ASK_RANGE + (k === 'seller' ? 7 : 0) || d < 1) continue;
      lineAt = world.time;
      say(ped, world, pick(k === 'seller' ? SELLER_LINES : BEGGAR_ASK), 3);
      break;
    }
  }
  dressWalkers(world);
  skateTimer -= dt;
  if (skateTimer <= 0) {
    skateTimer = 30 + Math.random() * 30;
    const h = hourOf(world);
    if (!(world.dayNight && world.dayNight.night > 0.5)) spawnSkater(world, p, h);
  }
  courierTimer -= dt;
  if (courierTimer <= 0) {
    courierTimer = 25 + Math.random() * 25;
    if (!(world.dayNight && world.dayNight.night > 0.5)) spawnCourier(world, p, hourOf(world));
  }
  groupTimer -= dt;
  if (groupTimer <= 0) {
    groupTimer = 60 + Math.random() * 40;
    if (!(world.dayNight && world.dayNight.night > 0.5)) spawnOrientation(world, p, hourOf(world));
  }
  partyTimer -= dt;
  if (partyTimer <= 0) {
    partyTimer = 55 + Math.random() * 40;
    spawnVrijgezellen(world, p, hourOf(world));
  }
  updateVrijgezellen(world, p);
  if (world.time - groupLineAt > 11) {
    for (const ped of world.pedestrians) {
      if (!ped.ontgroening || ped.state === 'dead' || ped.speechUntil > world.time) continue;
      const d = dist(p.x, p.y, ped.x, ped.y);
      if (d > 14 || d < 1) continue;
      groupLineAt = world.time;
      say(ped, world, pick(ped.ontgroening === 'leader' ? LEADER_LINES : FRESHMAN_LINES), 3.4);
      break;
    }
  }
  moverTimer -= dt;
  if (moverTimer > 0) return;
  moverTimer = 40 + Math.random() * 30;
  const hour = hourOf(world);
  if (hour < 9 || hour >= 20 || world.dayNight && world.dayNight.night > 0.5) return;
  let carriers = 0;
  for (const ped of world.pedestrians) if (isMoverCarry(ped) && ped.state !== 'dead') carriers++;
  if (carriers >= MAX_CARRIERS) return;
  const kind = pickCarrier(world.map, p.x, p.y, hour);
  if (!kind) return;
  const fresh = spawnPedestriansNear(world.map, p.x, p.y, 1, Math.random, true);
  for (const ped of fresh) {
    if (!finite(ped.x, ped.y)) continue;
    ped.carry = kind;
    ped.hasBag = false;
    world.pedestrians.push(ped);
  }
}
