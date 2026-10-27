// Samen spelen (#429): wie bezig is met een eigen activiteit (hengelen, boeren, pannenkoeken bakken, de beiaard) is zichtbaar voor de anderen.
// De gast meldt zijn activiteit al aan wie het spel opende ({ k: 'bezig', a }, coopgast.js); die bewaart hem per plek en geeft hem door aan
// de andere gasten ({ k: 'bezigvan', slot, a }). coopbezig3d.js tekent er een staande speler met hengel, hark, pan of klepels van.
// Pure logica zonder three.js, getest in scripts/coopbezig_test.mjs. Geen nieuw netwerkformaat: gewone JSON-berichten (PROTO en CODEC_VERSION blijven 2).
import { GAST_ACTIVITEITEN } from './coopgast.js';
import { bodyFor, mySlotOf } from './coopclient.js';

export const BEZIG_BEELD = { hengelen: 'hengel', boeren: 'hark', pannenkoek: 'pan', carillon: 'klepels' };
export const BEZIG_NAAM = { hengelen: 'Vissen', pannenkoek: 'Pannenkoeken bakken', carillon: 'Beiaard', boeren: 'Boerderij' };

export const bezigStand = (world) => world.coopBezigVan || (world.coopBezigVan = {});
export const bezigId = (a) => (typeof a === 'string' && GAST_ACTIVITEITEN.has(a) ? a : null);

// Een nieuwe toestand voor een plek; terug of er iets veranderde (null of onbekend ruimt op).
export function zetBezig(world, slot, a) {
  if (!Number.isInteger(slot) || slot < 0) return false;
  const st = bezigStand(world), nu = bezigId(a), was = st[slot] ? st[slot].a : null;
  if (nu === was) return false;
  if (nu) st[slot] = { a: nu, t: 0 }; else delete st[slot];
  return true;
}
// Het bericht aan de andere gasten
export const bezigVanEvent = (slot, a) => ({ k: 'bezigvan', slot: slot | 0, a: bezigId(a) });
export const leesBezigVan = (b) => (b && b.k === 'bezigvan' && Number.isInteger(b.slot) && b.slot >= 0 ? { slot: b.slot, a: bezigId(b.a) } : null);

// Wie moet er een hengel (pan, klepels) krijgen, gezien vanaf plek `me`: [{ slot, a, beeld, t, x, y, angle }]. Je eigen plek niet (dat is je eigen scherm).
export function bezigLijst(world, me = 0) {
  const mine = mySlotOf(me), out = [];
  for (const [s, e] of Object.entries(world.coopBezigVan || {})) {
    const slot = +s; if (slot === mine) continue;
    const b = bodyFor(world, me, slot);
    if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y) || b.coopVoertuig || b.inVehicle) continue;
    out.push({ slot, a: e.a, beeld: BEZIG_BEELD[e.a] || null, t: e.t || 0, x: b.x, y: b.y, angle: b.angle || 0, gz: (b.gz || 0) + (b.z || 0) });
  }
  return out;
}
// De klok van elke activiteit loopt door (voor de bewegingen)
export function tikBezig(world, dt) { for (const e of Object.values(world.coopBezigVan || {})) e.t = (e.t || 0) + dt; }

// Eenvoudige houdingen (hoeken in radialen) voor wat geen hengelanimatie heeft.
// pan: de pan schudt en slaat om; klepels: twee klepels gaan om en om op en neer.
export function eenvoudigePose(beeld, t) {
  if (beeld === 'pan') return { pan: 0.25 + 0.2 * Math.sin(t * 3), omslag: Math.max(0, Math.sin(t * 0.9)) ** 8 * 1.2 };
  if (beeld === 'klepels') return { links: Math.max(0, Math.sin(t * 4.5)) * 0.9, rechts: Math.max(0, Math.sin(t * 4.5 + Math.PI)) * 0.9 };
  if (beeld === 'hark') return { hark: 0.35 * Math.max(0, Math.sin(t * 2.2)) };
  return {};
}
// De hengel van een ander: eerst een worp, daarna wachten (hengelpose.js UITGOOI_T)
export const hengelFase = (t) => (t < 0.8 ? 'cast' : 'wait');
