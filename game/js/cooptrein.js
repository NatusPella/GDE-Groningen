// Samen met de trein (#492): een gast stapt bij de gastheer in en rijdt als passagier mee. De rollen en de regels staan in
// treincoop.js (puur); dit bestand koppelt het lichaam van de gast aan een wagen van de trein die de gastheer bestuurt.
// Puur: geen THREE, geen DOM, geen netwerk, zodat scripts/cooptrein_test.mjs het kan doorlopen.
// De gastheer is de machinist: hij rijdt de trein al met traindrive.js (world.trainDriving). Een gast is passagier, stapt
// alleen in of uit bij stilstand en zijn lichaam is van de gastheer (coopbestuur.js lichaamVan). De gastheer zet dat lichaam
// elke frame op de wagen (treinTick), zodat het met de trein meebeweegt in plaats van eruit geduwd te worden. Alleen bij het
// stoppen van de gastheer, het wegvallen van de gast of het einde van de sessie gaat de crew weg en staat de gast naast de
// wagen. Late instap blijft geweigerd door board() zelf (een dienst die al loopt).
import { newCrew, board, leave, roleOf, members, TREIN_HALF_WID } from './treincoop.js';
import { lichaamVan } from './coopbestuur.js';
import { carPoint } from './treinlayout.js';
import { isInWater } from './util.js';

export const TREIN_INSTAP_M = 7;   // m: van het lichaam tot de zijkant van een wagen
export const TREIN_STIL_V = 0.5;   // m/s: harder dan dit stapt niemand in of uit (zoals DOOR_STAND_V in traindrive.js)
export const TREIN_UIT_M = TREIN_HALF_WID + 0.9; // m: de plek naast de wagen waar de gast weer staat

export const TREIN_TEKST = {
  in: 'Je rijdt mee als passagier. E bij stilstand: uitstappen.',
  uit: 'Je stapt uit de trein.',
  wacht: 'Wacht tot de trein stilstaat.',
  dienst: 'De dienst is al bezig: halverwege stapt niemand meer in.',
};

// De trein van de gastheer: alleen als hij hem zelf bestuurt (traindrive.js zet world.trainDriving). Zonder gastheer in de
// trein gebeurt er niets: een gast kan niet bij een lege dienstregelingstrein instappen.
export const treinVan = (world) => {
  const t = world && world.trainDriving;
  return t && t.state === 'player' ? t : null;
};

// Waar de gast op de trein staat: elke gast een eigen wagen (plek 1 de eerste wagen, plek 2 de tweede), in het midden van
// de vloer. Geeft { car, x, y, angle, z, lx, lz } of null. Ook voor de tests en de tekenaar: niets wordt bewaard.
export function lichaamPlek(world, slot) {
  const t = treinVan(world);
  return t ? plekOpTrein(t, slot) : null;
}

function plekOpTrein(t, slot) {
  const cars = t && t.cars;
  if (!cars || !cars.length) return null;
  const i = Math.max(0, (Number(slot) || 1) - 1) % cars.length;
  const car = cars[i];
  const p = carPoint(car, 0, 0);
  return { car: i, x: p.x, y: p.y, angle: car.angle || 0, z: car.z || 0, lx: 0, lz: 0 };
}

// De afstand van een lichaam tot de zijkant van de dichtstbijzijnde wagen (0 = ernaast).
function afstandTotTrein(t, l) {
  let best = Infinity;
  for (const car of t.cars || []) {
    if (!Number.isFinite(car.x) || !Number.isFinite(car.y)) continue;
    const a = Number.isFinite(car.angle) ? car.angle : 0, ca = Math.cos(a), sa = Math.sin(a);
    const dx = l.x - car.x, dy = l.y - car.y;
    const langs = Math.max(0, Math.abs(dx * ca + dy * sa) - (car.len > 0 ? car.len : 17) / 2);
    const dwars = Math.max(0, Math.abs(-dx * sa + dy * ca) - TREIN_HALF_WID);
    best = Math.min(best, Math.hypot(langs, dwars));
  }
  return best;
}

function stoot(world, slot, tekst) { if (world && world.coopMeld) world.coopMeld(slot, tekst); }
// Het bericht naar de gast: { k: 'trein', aan, rol } (coopnet.js). Alleen voor zijn eigen contact-check en de rol.
function meld(world, slot, aan, rol) {
  const f = world && world.coopTreinMeld;
  if (typeof f === 'function') f(slot, !!aan, aan ? rol || 'passagier' : null);
}

function zetOpWagen(l, plek) {
  l.x = plek.x; l.y = plek.y;
  l.angle = plek.angle;
  l.vx = 0; l.vy = 0;
  l.z = 0; l.vz = 0;
  l.gz = plek.z;
  l.coopTrein = true;
}

// E van een gast bij de gastheer (coopnet.js gebruikGast, vóór bestuurGebruik): instappen bij een stilstaande trein van de
// gastheer, of uitstappen bij bijna stilstand. Geeft { gedaan, rol? }: gedaan false betekent "niets van de trein", dan mag
// de aanroeper het gewone in- of uitstappen proberen.
export function treinGebruik(world, slot) {
  if (!(slot > 0)) return { gedaan: false };
  const l = lichaamVan(world, slot);
  if (!l) return { gedaan: false };
  const t = treinVan(world);
  const crew = t && t.crew;
  const aanBoord = !!(crew && roleOf(crew, slot));
  if (aanBoord) { // uitstappen: alleen bij bijna stilstand
    if (t.v >= TREIN_STIL_V) { stoot(world, slot, TREIN_TEKST.wacht); return { gedaan: true }; }
    const rol = roleOf(crew, slot);
    treinUit(world, slot, t);
    stoot(world, slot, TREIN_TEKST.uit);
    return { gedaan: true, rol };
  }
  if (!t) return { gedaan: false }; // de gastheer rijdt niet: de trein is van niemand
  if (l.inVehicle || l.inVeh || l.water || l.state === 'dead') return { gedaan: false };
  // eerst kijken of hij bij de trein staat: anders is E voor een auto of een ander voertuig, ook als de trein rijdt
  if (afstandTotTrein(t, l) > TREIN_INSTAP_M) return { gedaan: false };
  if (t.v >= TREIN_STIL_V) { stoot(world, slot, TREIN_TEKST.wacht); return { gedaan: true }; }
  // de gastheer is de machinist (de eerste keer dat er iemand bij komt); de gast wordt passagier
  if (!t.crew) t.crew = newCrew();
  const eigen = board(t.crew, 0).ok ? board(t.crew, slot, 'passagier') : { ok: false };
  if (!eigen.ok) { stoot(world, slot, TREIN_TEKST.dienst); return { gedaan: true }; } // late instap: board() weigert
  const plek = plekOpTrein(t, slot);
  if (plek) zetOpWagen(l, plek);
  meld(world, slot, true, eigen.role);
  stoot(world, slot, TREIN_TEKST.in);
  return { gedaan: true, rol: eigen.role };
}

// De gast stapt uit (of valt weg): uit de crew en met zijn lichaam naast de wagen op een droge, vrije plek.
export function treinUit(world, slot, t = treinVan(world)) {
  const crew = t && t.crew;
  if (!crew || !(slot > 0) || !roleOf(crew, slot)) return false;
  const plek = plekOpTrein(t, slot);
  leave(crew, slot);
  const l = lichaamVan(world, slot);
  if (l && plek) {
    const q = uitstapplek(world, plek);
    l.x = q.x; l.y = q.y;
    l.angle = plek.angle;
    l.vx = 0; l.vy = 0;
    l.z = 0; l.vz = 0;
    l.gz = plek.z;
    l.coopTrein = false;
  }
  meld(world, slot, false, null);
  return true;
}

// Elke frame bij de gastheer (coopnet.js host-tick, na bestuurTick): het lichaam van elke gast op zijn wagen, zodat het
// met de trein meebeweegt. De gastheer zelf zit al in de cabine (traindrive.js syncRider). Geeft het aantal meerijders.
export function treinTick(world) {
  const t = treinVan(world);
  const crew = t && t.crew;
  if (!crew) return 0;
  let n = 0;
  for (const slot of members(crew)) {
    if (slot === 0) continue; // de machinist: traindrive.js zet zijn lichaam
    const l = lichaamVan(world, slot);
    const plek = l ? plekOpTrein(t, slot) : null;
    if (!plek) continue; // zijn lichaam is er even niet (nog niet aangemeld): niets aan de hand, onLeave ruimt hem op
    zetOpWagen(l, plek);
    n++;
  }
  return n;
}

// De crew opruimen: de gastheer stopt met rijden (traindrive.js stopDriving), de sessie eindigt (coopnet.js stopCoopNet)
// of de trein is weg. Elke gast staat daarna weer naast zijn wagen.
export function treinStop(world, t = treinVan(world)) {
  const crew = t && t.crew;
  if (!crew) return 0;
  let n = 0;
  for (const slot of members(crew)) if (slot > 0 && treinUit(world, slot, t)) n++;
  t.crew = null;
  return n;
}

// Een droge, vrije plek naast de wagen (dezelfde hulpjes als traindrive.js stopDriving: de kaart en coopVrij, geen eigen
// botsingmotor). Lukt het niet, dan de eerste plek naast de wagen: altijd buiten de wagen.
function uitstapplek(world, plek) {
  const nx = -Math.sin(plek.angle), ny = Math.cos(plek.angle);
  for (const s of [1, -1]) {
    const q = droog(world, plek.x + nx * TREIN_UIT_M * s, plek.y + ny * TREIN_UIT_M * s);
    if (q) return q;
  }
  return { x: plek.x + nx * TREIN_UIT_M, y: plek.y + ny * TREIN_UIT_M };
}

function droog(world, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const map = world && world.map;
  if (map && isInWater(map, x, y)) return null;
  const q = map && typeof map.escapeBuilding === 'function' ? map.escapeBuilding(x, y, 0.35) : null;
  const qx = q && Number.isFinite(q[0]) ? q[0] : x, qy = q && Number.isFinite(q[1]) ? q[1] : y;
  if (map && isInWater(map, qx, qy)) return null;
  if (world.coopVrij && !world.coopVrij(qx, qy, world)) return null;
  return { x: qx, y: qy };
}
