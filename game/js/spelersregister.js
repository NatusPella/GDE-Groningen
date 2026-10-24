// Multiplayer-architectuur (#446): het register world.players. Eenspeler is een register van één; samen spelen voegt er records aan toe
// (de andere spelers uit world.coopPartners, op hun vaste plek). world.player blijft wijzen naar de hoofdspeler, zodat niets breekt.
// Een record: { slot, lokaal, hoofd, entiteit, x, y }. Het lokale record leest steeds world.player (ook als coopgezocht.js die tijdelijk
// verwisselt), een extern record leest de partner uit world.coopPartners. Pure logica, geen DOM, geen netwerk, geen imports.

const LEEG = [];

function lokaalRecord(world, slot) {
  return {
    slot, lokaal: true, hoofd: true,
    get entiteit() { return world.player; },
    get x() { const p = world.player; return p ? p.x : NaN; },
    get y() { const p = world.player; return p ? p.y : NaN; },
  };
}
function externRecord(slot, partner) {
  return {
    slot, lokaal: false, hoofd: false, partner,
    get entiteit() { return this.partner; },
    get x() { return this.partner.x; },
    get y() { return this.partner.y; },
  };
}

// Zorgt dat world.players klopt met world.coopPartners; records blijven dezelfde objecten (stabiele plek per speler).
// mijnSlot: de plek van deze speler (0 voor wie het spel opende, anders de gast). Goedkoop als er niets veranderd is.
export function ververs(world, mijnSlot = 0) {
  let reg = world.players;
  if (!reg || !Array.isArray(reg) || reg._slot !== mijnSlot) {
    reg = world.players = [lokaalRecord(world, mijnSlot)];
    reg._slot = mijnSlot; reg._bron = undefined;
  }
  const bron = world.coopPartners || LEEG;
  if (reg._bron === bron && reg._n === bron.length) {
    for (let i = 1; i < reg.length; i++) reg[i].partner = bron[reg[i]._i];
    return reg;
  }
  const nieuw = [reg[0]];
  bron.forEach((p, i) => {
    if (!p || !Number.isInteger(p.slot) || p.slot === mijnSlot) return;
    const oud = reg.find((r) => !r.lokaal && r.slot === p.slot);
    const r = oud || externRecord(p.slot, p);
    r.partner = p; r._i = i; nieuw.push(r);
  });
  nieuw.sort((a, b) => (a.lokaal ? -1 : b.lokaal ? 1 : a.slot - b.slot));
  nieuw._slot = mijnSlot; nieuw._bron = bron; nieuw._n = bron.length;
  world.players = nieuw;
  return nieuw;
}

const register = (world) => ververs(world, world.players && world.players._slot !== undefined ? world.players._slot : 0);
const bruikbaar = (r) => r && Number.isFinite(r.x) && Number.isFinite(r.y);

// Zoals dichtstbijzijndeSpeler, maar valt terug op de hoofdspeler als niemand een bruikbare plek heeft (dan gedraagt de code zich als voorheen).
export function naasteSpeler(world, x, y) { return dichtstbijzijndeSpeler(world, x, y) || world.player; }

export function hoofdspeler(world) { return world.player; }
export function spelers(world) { return register(world); }
export function voorElkeSpeler(world, fn) { const reg = register(world); for (let i = 0; i < reg.length; i++) fn(reg[i], i); }

// De speler die het dichtst bij (x, y) is; een speler zonder bekende plek doet niet mee. Geeft het record of null.
export function dichtstbijzijndeSpeler(world, x, y) {
  const reg = register(world);
  let best = null, bd = Infinity;
  for (let i = 0; i < reg.length; i++) {
    const r = reg[i];
    if (!bruikbaar(r)) continue;
    const d = Math.hypot(r.x - x, r.y - y);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

// Van wie is deze entiteit (de speler zelf, het voertuig waarin hij zit, of iets met zijn plek)? Geeft het record of null.
export function spelerVan(world, entiteit) {
  if (!entiteit) return null;
  const reg = register(world);
  for (const r of reg) {
    const e = r.entiteit;
    if (e === entiteit || (e && e.inVehicle === entiteit)) return r;
  }
  if (Number.isInteger(entiteit.slot)) for (const r of reg) if (r.slot === entiteit.slot) return r;
  return null;
}
