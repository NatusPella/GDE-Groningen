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

// ---- de meespelers van de lopende opdracht (#452)
// Verhaalstappen (missions.js, heist.js) kijken niet meer alleen naar de gastheer: elke speler die J zei (of verplicht meedoet), verbonden is en
// nog staat telt mee. world.coopMeespelers() (de gastheer, coopnet.js) geeft hun plekken; zonder samen spelen is het altijd alleen de hoofdspeler,
// zodat een eenspelerspel exact doet wat het deed. De gastheer die net is neergegaan of opgepakt (world.pendingRespawn) telt niet mee zolang een ander staat.
const GAST_VOERTUIG_M = 8; // m: een gast in een voertuig hoort bij het voertuig dat zo dichtbij staat

export function opdrachtSpelers(world) {
  const reg = register(world);
  const f = world.coopMeespelers;
  const slots = reg.length > 1 && typeof f === 'function' ? f() : null;
  if (!Array.isArray(slots) || !slots.length) return [reg[0]];
  const uit = [];
  for (let i = 1; i < reg.length; i++) {
    const r = reg[i];
    if (slots.includes(r.slot) && bruikbaar(r) && !(r.partner && (r.partner.status === 'neer' || r.partner.status === 'weg'))) uit.push(r);
  }
  if (!uit.length || !world.pendingRespawn) uit.unshift(reg[0]);
  return uit;
}

// Het voertuig waarin deze speler zit (of null). Een gast kent alleen "in een voertuig": het dichtstbijzijnde voertuig binnen GAST_VOERTUIG_M.
export function inVoertuig(world, r) {
  if (!r) return null;
  if (r.lokaal) { const e = r.entiteit; return e ? e.inVehicle || null : null; }
  const st = r.partner && r.partner.status;
  if (st !== 'voertuig' && st !== 'rijdt') return null;
  let best = null, bd = GAST_VOERTUIG_M;
  for (const v of world.vehicles || LEEG) { const d = Math.hypot(v.x - r.x, v.y - r.y); if (d < bd) { bd = d; best = v; } }
  return best;
}

// Het record als entiteit met x, y, angle en inVehicle, zodat een stap-check dezelfde code kan houden: de gastheer is world.player zelf,
// een gast een vaste proxy die steeds zijn actuele plek leest (gast: true).
export function acteur(world, r) {
  if (!r || r.lokaal) return hoofdspeler(world);
  if (!r._acteur) r._acteur = { gast: true, slot: r.slot, get x() { return r.x; }, get y() { return r.y; }, get angle() { return (r.partner && r.partner.heading) || 0; }, get inVehicle() { return inVoertuig(world, r); } };
  return r._acteur;
}

// De meespeler het dichtst bij (x, y), als record (de hoofdspeler als niemand een bruikbare plek heeft).
export function dichtstbijzijndeMeespeler(world, x, y) {
  const l = opdrachtSpelers(world);
  if (l.length === 1) return l[0];
  let best = l[0], bd = Infinity;
  for (const r of l) { const d = Math.hypot(r.x - x, r.y - y); if (d < bd) { bd = d; best = r; } }
  return best;
}
export function afstandMeespeler(world, x, y) { const r = dichtstbijzijndeMeespeler(world, x, y); return Math.hypot(r.x - x, r.y - y); }

// Zit een meespeler in dit voertuig? Geeft het record of null.
export function meespelerInVoertuig(world, v) {
  if (!v) return null;
  for (const r of opdrachtSpelers(world)) if (inVoertuig(world, r) === v) return r;
  return null;
}
// Zijn alle meespelers binnen straal van (x, y)? Zonder meespelers (alleen) is dat de hoofdspeler.
export function iedereenBinnen(world, x, y, straal) {
  for (const r of opdrachtSpelers(world)) if (!(Math.hypot(r.x - x, r.y - y) <= straal)) return false;
  return true;
}
