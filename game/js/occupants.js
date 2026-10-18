import { hash2 } from './rng.js';
// Wie zit er in welke auto (#49). Pure logica, geen Three.js: een bezetting
// hangt alleen af van een vaste sleutel van het voertuig (parkeervak of id),
// dus dezelfde auto heeft altijd dezelfde mensen. Verkeersauto's hebben een
// bestuurder; soms zit er een bijrijder naast. Een enkele geparkeerde auto
// heeft iemand die 'wacht' en blijft zitten tot er iets gebeurt. Bloedloos:
// niemand raakt gewond, ze stappen uit, schrikken of rennen weg.

// kans op een bijrijder (voorin) per carrosserie; bus, tram, trein, vrachtwagen en trekker: geen
export const PASSENGER_CHANCE = {
  hatch: 0.18, sedan: 0.22, wagon: 0.3, suv: 0.28, sport: 0.12, van: 0.3,
  taxi: 0.5, police: 0.55, escort: 0.2,
};
export const WAITING_CHANCE = 0.08; // geparkeerd met iemand achter het stuur

// Hoeveel zittende figuren we willen tekenen/bijhouden: per tegel en overal.
export const OCCUPANT_BUDGET = { perTile: 6, total: 40, tileSize: 120 };

const NO_SEATS = new Set(['bus', 'tram', 'train', 'truck', 'trekker', 'quad', 'bike', 'scooter', 'boat', 'heli']);

export function kindOf(v) {
  if (v.isBus) return 'bus';
  if (v.isTram) return 'tram';
  if (v.isTrain) return 'train';
  if (v.isBoat) return 'boat';
  if (v.isHeli) return 'heli';
  if (v.isBike) return 'bike';
  if (v.isScooter) return 'scooter';
  if (v.isTaxi) return 'taxi';
  if (v.isPolice) return 'police';
  if (v.isHeroCar) return 'escort';
  const n = (v.model && v.model.name) || 'hatch';
  if (n === 'truck') return 'truck';
  if (n === 'trekkerlimo' || n === 'tractor') return 'trekker';
  if (n === 'quad') return 'quad';
  if (v.isAmbulance || n === 'foodtruck' || n === 'cashvan' || n === 'van') return 'van';
  return PASSENGER_CHANCE[n] !== undefined ? n : 'hatch';
}

// vaste sleutel: een parkeervak blijft hetzelfde vak, een id is er per rit
export function keyOf(v) {
  if (v.parkSlot) return Math.round(v.parkSlot.x * 10) * 7919 + Math.round(v.parkSlot.y * 10) * 104729;
  return (v.id || 0) * 5.3 + 11;
}

// -> { key, kind, driver: 'ai' | 'waiting' | null, passengers: [{ slot, seed }] }
// driver:'ai' = rijdt mee in het verkeer, 'waiting' = zit in een geparkeerde auto.
export function occupancyOf(v, worldSeed = 0) {
  const key = keyOf(v), kind = kindOf(v);
  const occ = { key, kind, driver: null, passengers: [] };
  if (v.wrecked || v.disabled || NO_SEATS.has(kind)) return occ;
  if (v.parked) {
    if (hash2(key + worldSeed, 91) < WAITING_CHANCE) occ.driver = 'waiting';
    return occ;
  }
  if (v.driver === 'player' || v.castDriver || v.driverOut) return occ;
  const driven = !!(v.driver || v.road || v.racer || v.countryDrive || (v.isPolice && !v.hijacked && !v._roadblock));
  if (!driven) return occ;
  occ.driver = 'ai';
  const chance = PASSENGER_CHANCE[kind] ?? 0.15;
  if (hash2(key + worldSeed, 17) < chance) {
    occ.passengers.push({ slot: 'front', seed: key * 1.7 + 3 });
    // achterin: alleen soms, en zichtbaar blijft alleen de voorstoel (tekenbudget)
    if (kind !== 'police' && hash2(key + worldSeed, 29) < 0.25) occ.passengers.push({ slot: 'rear', seed: key * 2.3 + 5 });
  }
  return occ;
}

export const seatedCount = (occ) => (occ.driver ? 1 : 0) + occ.passengers.length;
// het budget telt alleen wat weg mag: bijrijders en wachtenden (een rijdende bestuurder hoort bij de auto)
export const extrasCount = (occ) => (occ.driver === 'waiting' ? 1 : 0) + occ.passengers.length;

// Budget per tegel: eerst gaan de achterbank-passagiers eraf, dan bijrijders,
// dan wachtende bestuurders; de volgorde hangt van een hash af, niet van de
// volgorde in de lijst. Geeft een nieuwe lijst met (eventueel gekorte) bezettingen.
export function budgetOccupants(items, budget = OCCUPANT_BUDGET) {
  // items: [{ id, x, y, occ }]
  const tiles = new Map();
  for (const it of items) {
    const k = Math.floor(it.x / budget.tileSize) + ',' + Math.floor(it.y / budget.tileSize);
    if (!tiles.has(k)) tiles.set(k, []);
    tiles.get(k).push(it);
  }
  const out = new Map();
  const trim = (list, cap) => {
    const order = list.slice().sort((a, b) => hash2(a.occ.key, 5) - hash2(b.occ.key, 5) || a.occ.key - b.occ.key);
    let used = order.reduce((n, it) => n + extrasCount(it.occ), 0);
    const copy = new Map(order.map((it) => [it, { driver: it.occ.driver, passengers: it.occ.passengers.slice() }]));
    const strip = (pick) => {
      for (const it of order) {
        if (used <= cap) return;
        const c = copy.get(it);
        if (pick(c, it)) used--;
      }
    };
    strip((c) => { const i = c.passengers.findIndex((p) => p.slot === 'rear'); if (i < 0) return false; c.passengers.splice(i, 1); return true; });
    strip((c) => c.passengers.length ? (c.passengers.pop(), true) : false);
    strip((c) => c.driver === 'waiting' ? (c.driver = null, true) : false);
    for (const it of order) out.set(it.id, { ...it.occ, ...copy.get(it) });
  };
  for (const list of tiles.values()) trim(list, budget.perTile);
  // globaal: de verste uit het midden van niemand; hier simpel op hash, ook deterministisch
  let used = 0;
  for (const o of out.values()) used += extrasCount(o);
  if (used > budget.total) {
    const ids = [...out.keys()].sort((a, b) => hash2(out.get(b).key, 7) - hash2(out.get(a).key, 7) || out.get(b).key - out.get(a).key);
    for (const id of ids) {
      if (used <= budget.total) break;
      const o = out.get(id);
      if (o.passengers.length) { used -= o.passengers.length; o.passengers = []; }
      else if (o.driver === 'waiting') { o.driver = null; used--; }
    }
  }
  return { occupancy: out, total: used };
}

// Wat gebeurt er met wie blijft zitten? ev: { kind, strength?, dist?, byPlayer? }
// kind: 'theft' | 'crash' | 'shot' | 'fire' | 'honk' | 'wanted-near'
// -> { driver: null | { act, delay }, passengers: [{ slot, act, delay }] }
// act: 'stay' (blijft zitten), 'pulled' (uit de auto getrokken), 'exit' (stapt uit),
// 'flee' (stapt uit en rent weg), 'duck' (zakt weg achter het stuur, blijft zitten)
export function reactSeated(occ, ev) {
  const res = { driver: null, passengers: [] };
  const d = (slot, base) => base + hash2(occ.key + (slot === 'driver' ? 0 : slot === 'front' ? 1 : 2), 41) * 0.5;
  const dist = ev.dist ?? 0;
  if (ev.kind === 'theft') {
    if (occ.driver) res.driver = { act: 'pulled', delay: 0 };
    for (const p of occ.passengers) res.passengers.push({ slot: p.slot, act: 'flee', delay: d(p.slot, 0.3) });
  } else if (ev.kind === 'fire') {
    if (occ.driver) res.driver = { act: 'flee', delay: d('driver', 0.2) };
    for (const p of occ.passengers) res.passengers.push({ slot: p.slot, act: 'flee', delay: d(p.slot, 0.3) });
  } else if (ev.kind === 'crash') {
    // alleen een harde klap haalt de wachtende uit zijn auto; in het verkeer rijdt de bestuurder gewoon door
    if (occ.driver === 'waiting' && (ev.strength ?? 0) >= 0.5 && dist < 8) res.driver = { act: 'exit', delay: d('driver', 0.6) };
    for (const p of occ.passengers) res.passengers.push({ slot: p.slot, act: 'stay', delay: 0 });
  } else if (ev.kind === 'shot') {
    if (occ.driver === 'waiting' && dist < 30) res.driver = { act: 'duck', delay: d('driver', 0.1) };
    for (const p of occ.passengers) if (dist < 30) res.passengers.push({ slot: p.slot, act: 'duck', delay: d(p.slot, 0.1) });
  } else if (ev.kind === 'honk') {
    if (occ.driver === 'waiting' && dist < 6) res.driver = { act: 'exit', delay: d('driver', 1) };
  }
  if (!res.driver && occ.driver) res.driver = { act: 'stay', delay: 0 };
  return res;
}

// Hoe lang een stap uit de auto duurt, hangt van de rol: wie aan de straatkant zit, stapt als eerste uit.
export function exitOrder(react) {
  const list = [];
  if (react.driver && react.driver.act !== 'stay' && react.driver.act !== 'duck') list.push({ who: 'driver', ...react.driver });
  for (const p of react.passengers) if (p.act !== 'stay' && p.act !== 'duck') list.push({ who: p.slot, act: p.act, delay: p.delay });
  return list.sort((a, b) => a.delay - b.delay);
}

// Onthoud wie er zat zolang de auto een AI-bestuurder had: bij een diefstal
// is v.driver al 'player' en zou occupancyOf niets meer vinden.
const seated = new WeakMap();
export function seatedOf(v) {
  const c = seated.get(v);
  if (c) return c;
  const occ = occupancyOf(v);
  if (occ.driver) seated.set(v, occ);
  return occ;
}
// wie eruit is gegaan, zit er niet meer
export function clearSeated(v, { passengers = true, driver = true } = {}) {
  const c = seated.get(v);
  if (!c) return;
  if (passengers) c.passengers = [];
  if (driver) c.driver = null;
}
