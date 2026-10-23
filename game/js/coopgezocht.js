// Samen spelen (#434): een gezocht-niveau per speler. De politie (police.js) kent maar één doelwit, world.player met world.wanted; een
// misdaad van een gast (zijn voertuig rijdt een voetganger aan, hij steelt een geparkeerde auto) telt daarom op bij zijn eigen niveau
// (world.coopWanted[plek]) en de politie jaagt op de speler met het hoogste niveau (gelijk: de speler die al gejaagd werd, anders wie
// het spel opende). Dat gaat zonder police.js om te bouwen: voor de duur van één updatePolice staat world.player voor het lichaam
// of het voertuig van het doelwit en world.wanted voor zijn niveau; daarna staat alles weer terug.
// Pure logica zonder three.js, getest in scripts/coopbestuur_test.mjs.
import { lichaamVan } from './coopbestuur.js';

export const GEZOCHT_TEKST = {
  gast: (n) => `De politie zoekt je: ${n} ${n === 1 ? 'ster' : 'sterren'}.`,
  host: (naam, n) => `De politie zoekt ${naam}: ${n} ${n === 1 ? 'ster' : 'sterren'}.`,
  kwijt: 'Je bent de politie kwijt.',
  gepakt: (naam) => `${naam} is door de politie gepakt.`,
};
export const GETUIGE_AFSTAND = 25; // m: een voetganger zo dichtbij ziet een misdaad van een gast (zoals een getuige bij de host)

export const wantedVan = (world, slot) => (slot > 0 ? ((world.coopWanted || {})[slot] | 0) : world.wanted | 0);
export function zetWantedVan(world, slot, n) {
  const v = Math.max(0, Math.min(5, n | 0));
  if (slot > 0) {
    const was = wantedVan(world, slot);
    (world.coopWanted || (world.coopWanted = {}))[slot] = v;
    if (v !== was && world.coopWantedMeld) world.coopWantedMeld(slot, v, was);
  } else world.wanted = v;
  return v;
}

// Waar een speler nu is: zijn voertuig als hij rijdt, anders zijn lichaam. Plek 0 is world.player.
export function plekVan(world, slot) {
  if (slot === 0) return world.player || null;
  const l = lichaamVan(world, slot); if (!l) return null;
  const v = l.inVehicle || l.inVeh;
  return v && typeof v === 'object' && Number.isFinite(v.x) ? v : l;
}

// Een voetganger (geen agent) die een misdaad van een gast kan zien
export function getuigeDichtbij(world, x, y, r = GETUIGE_AFSTAND) {
  for (const c of world.pedestrians || []) {
    if (!c || c.isCop || c.state === 'dead' || c.state === 'knockedDown') continue;
    if (Math.hypot(c.x - x, c.y - y) <= r) return true;
  }
  return false;
}

// Het lichaam van een gast als "world.player" voor police.js: plek, snelheid, voertuig en water zijn wat de politie leest.
export function doelwitProxy(world, slot) {
  const l = lichaamVan(world, slot); if (!l) return null;
  const v = l.inVehicle || l.inVeh || null, q = v && Number.isFinite(v.x) ? v : l;
  return {
    coopSlot: slot, x: q.x, y: q.y, angle: q.angle || 0, vx: v ? 0 : l.vx || 0, vy: v ? 0 : l.vy || 0, z: v ? 0 : l.z || 0, gz: v ? v.z || 0 : l.gz || 0,
    radius: l.radius || 0.4, inVehicle: v && typeof v === 'object' ? v : null, water: v ? null : l.water || null, swimming: !!l.swimming, state: 'ok', character: l.character || l.char || 'tammo',
  };
}

// Wie jaagt de politie nu? { slot, level } of null als niemand gezocht wordt. Hoogste niveau wint; gelijk: wie al gejaagd werd, anders de host.
export function kiesDoelwit(world) {
  const kand = [{ slot: 0, level: world.wanted | 0 }];
  for (const [s, n] of Object.entries(world.coopWanted || {})) { const slot = +s; if ((n | 0) > 0 && lichaamVan(world, slot)) kand.push({ slot, level: n | 0 }); }
  const vorig = world.coopDoelwit == null ? 0 : world.coopDoelwit;
  let best = null;
  for (const k of kand) {
    if (k.level <= 0) continue;
    if (!best || k.level > best.level || (k.level === best.level && k.slot === vorig && best.slot !== vorig)) best = k;
  }
  return best;
}

// Het niveau dat iedereen op zijn scherm ziet (het snapshot en de desync-hash van coopnet.js): dat van het doelwit van de politie.
export function zichtbaarWanted(world) {
  const d = world.coopWanted && Object.keys(world.coopWanted).length ? kiesDoelwit(world) : null;
  return d ? d.level : world.wanted | 0;
}

// Draai update(dt, world) (police.js updatePolice) met het doelwit op de plek van world.player. Is het doelwit de host, dan verandert er niets.
export function politieMetDoelwit(dt, world, update) {
  const d = kiesDoelwit(world);
  const nieuw = d ? d.slot : 0;
  if (world.coopDoelwit !== nieuw) {
    const was = world.coopDoelwit || 0;
    world.coopDoelwit = nieuw;
    if (world.coopDoelwitMeld) world.coopDoelwitMeld(nieuw, was, d ? d.level : 0);
  }
  if (!d || d.slot === 0) { update(dt, world); return 0; }
  const proxy = doelwitProxy(world, d.slot);
  if (!proxy) { update(dt, world); return 0; }
  const eigenSpeler = world.player, eigenWanted = world.wanted, voor = d.level;
  world.player = proxy; world.wanted = d.level;
  try { update(dt, world); } finally {
    const na = world.wanted | 0;
    world.player = eigenSpeler; world.wanted = eigenWanted;
    zetWantedVan(world, d.slot, na);
    world.coopStil = false;
  }
  return d.slot;
}
