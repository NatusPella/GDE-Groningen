// Samen met de trein (#492): een gast stapt bij de gastheer in en rijdt als conducteur of passagier mee. De rollen en de
// regels staan in treincoop.js (puur); dit bestand koppelt het lichaam van de gast aan een wagen van de trein die de
// gastheer bestuurt.
// Puur: geen THREE, geen DOM, geen netwerk, zodat scripts/cooptrein_test.mjs het kan doorlopen.
// De gastheer is de machinist: hij rijdt de trein al met traindrive.js (world.trainDriving). De eerste gast wordt conducteur
// (O de deuren, K de waakzaamheid), de volgende gasten passagier (#492). Een gast stapt alleen in of uit bij stilstand en
// zijn lichaam is van de gastheer (coopbestuur.js lichaamVan). De gastheer zet dat lichaam
// elke frame op de wagen (treinTick), zodat het met de trein meebeweegt in plaats van eruit geduwd te worden. Alleen bij het
// stoppen van de gastheer, het wegvallen van de gast of het einde van de sessie gaat de crew weg en staat de gast naast de
// wagen. Late instap blijft geweigerd door board() zelf (een dienst die al loopt).
// De conducteur loopt met T door de wagen (treinlayout.js: walkMove, carPoint, passengers) en controleert met E bij een
// zittende reiziger een kaartje; na vijf reizigers volgt loon en XP in zijn eigen loopbaan (treincontrole.js, #492).
// Zijn looppositie gaat met het bestaande trein-bericht (a:'walk') naar de gastheer, die het lichaam in de wagen zet.
import { newCrew, board, leave, roleOf, members, TREIN_HALF_WID } from './treincoop.js';
import { lichaamVan } from './coopbestuur.js';
import { carPoint, trainLayout, walkMove, canStand, passengers, WALK_SPEED } from './treinlayout.js';
import { beginControle, controleer, reset } from './treincontrole.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { isInWater } from './util.js';

export const TREIN_INSTAP_M = 7;   // m: van het lichaam tot de zijkant van een wagen
export const TREIN_STIL_V = 0.5;   // m/s: harder dan dit stapt niemand in of uit (zoals DOOR_STAND_V in traindrive.js)
export const TREIN_UIT_M = TREIN_HALF_WID + 0.9; // m: de plek naast de wagen waar de gast weer staat
export const TREIN_CONTROLE_M = 1.6; // m: zo dichtbij moet de conducteur bij een zittende reiziger staan
const TREIN_WALK_MUIS = 0.0025;     // rad per pixel, zoals de volgcamera en traindrive.js
const TREIN_WALK_DRAAI = 1.8;       // rad/s met de pijltjes links en rechts
const TREIN_WALK_ZEND_S = 0.1;      // s: zo vaak gaat de looppositie naar de gastheer

export const TREIN_TEKST = {
  in: 'Je rijdt mee als passagier. E bij stilstand: uitstappen.',
  conducteur: 'Je bent conducteur: O de deuren, K de waakzaamheid. E bij stilstand: uitstappen.',
  uit: 'Je stapt uit de trein.',
  wacht: 'Wacht tot de trein stilstaat.',
  dienst: 'De dienst is al bezig: halverwege stapt niemand meer in.',
  geenRol: 'Alleen de machinist en de conducteur bedienen de deuren en de waakzaamheid.', // een passagier mag het niet (#492)
  lopen: 'Je loopt door de trein: WASD lopen, E bij een zittende reiziger, T terug naar je plek.', // de conducteur (#492)
  stoppen: 'Je staat weer op je plek.',
  geenConducteur: 'Alleen de conducteur loopt door de trein en controleert kaartjes.',
  geenReiziger: 'Loop naar een zittende reiziger om een kaartje te controleren.',
  rust: 'Even bijkomen: de volgende ronde begint zo.',
  geenInterieur: 'In deze trein kun je niet rondlopen.',
  geenTrein: 'De trein van de ander is er even niet.',
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

// --- de conducteur loopt zelf door de trein (#492) ------------------------------------------------------
// Een gast heeft geen world.trainDriving (dat is de trein van de gastheer); zijn trein komt uit de snapshot van de
// gastheer. main.js geeft de spoorwegen door (zetTreinBron), zodat dit bestand zonder railway.js en THREE blijft en
// scripts/cooptrein_test.mjs het kan doorlopen. `coopTrein.treinId` is de route-index uit het trein-bericht.
let treinBron = null;
export function zetTreinBron(f) { treinBron = typeof f === 'function' ? f : null; }

export function gastTreinVan(world) {
  const c = world && world.coopTrein;
  if (!c || !c.aan) return null;
  const bron = treinBron ? treinBron(world) : null;
  if (!bron) return world.coopTreinTrein || null;
  const lijst = (bron && bron.treinen) || [];
  const id = c.treinId;
  if (Number.isInteger(id) && bron.routes && bron.routes[id]) {
    const route = bron.routes[id];
    const t = lijst.find((q) => q && q.route === route && q.state !== 'mission' && q.gastWeg !== true);
    if (t) { world.coopTreinTrein = t; return t; }
  }
  const t = world.coopTreinTrein;
  return t && lijst.includes(t) ? t : null;
}

// De eerste wagen met een binnenste; de goederenwagen en de tussenmodule hebben er geen.
function startWagen(layout) {
  for (let i = 0; i < layout.length; i++) if (layout[i] && layout[i].kind === 'car') return i;
  for (let i = 0; i < layout.length; i++) if (layout[i]) return i;
  return -1;
}

// Het zaadje van de reizigers in een wagen: hetzelfde beeld als treininterieur.js (view.paxSeed + i * 31). Zodra het
// interieur gebouwd is, staat dat zaadje op de trein (coopPaxSeed), zodat de conducteur dezelfde reizigers ziet.
export const reizigerSeed = (t, car) => {
  const basis = t && Number.isInteger(t.coopPaxSeed) ? t.coopPaxSeed : 11 + (Math.floor(Number(t && t.c) || 0) % 97);
  return basis + (Number(car) | 0) * 31;
};

// T van de conducteur: hij staat op en loopt over het gangpad. Alleen de conducteur; een passagier blijft zitten.
export function gastWalkStart(world, slot = 1) {
  const c = world && world.coopTrein;
  if (!c || !c.aan) return false;
  if (c.rol !== 'conducteur') { stoot(world, slot, TREIN_TEKST.geenConducteur); return false; }
  if (world.trainWalk) return true;
  const t = gastTreinVan(world);
  if (!t || !t.cars || !t.cars.length || !t.cfg || !Array.isArray(t.cfg.segments)) { stoot(world, slot, TREIN_TEKST.geenTrein); return false; }
  const layout = trainLayout(t.cfg);
  const i = startWagen(layout);
  if (i < 0) { stoot(world, slot, TREIN_TEKST.geenInterieur); return false; }
  world.trainWalk = { car: i, lx: 0, lz: 0, yaw: 0, pitch: 0, gast: true };
  world.trainControle = world.trainControle || beginControle(reizigerSeed(t, i) + 7); // T opnieuw mag de teller niet gratis resetten (#492)
  const cl = layout[i];
  if (cl) {
    const lx = cl.saloon[0] + Math.min(1.2, (cl.saloon[1] - cl.saloon[0]) / 2);
    if (canStand(cl, lx, 0)) world.trainWalk.lx = lx;
  }
  stoot(world, slot, TREIN_TEKST.lopen);
  return true;
}

// T nog eens, of het einde van de rit: de walkstand gaat weg. stil: zonder melding (uitstappen, wegvallen, sessie-einde).
export function gastWalkStop(world, stil = false) {
  if (!world) return false;
  const was = !!world.trainWalk;
  world.trainWalk = null;
  world.trainCam = null;
  world.coopTreinWalkT = 0;
  const f = world.coopTreinWalkMeld;
  if (was && typeof f === 'function') { try { f(world, null); } catch (e) { /* de verbinding is er even niet */ } }
  if (was && !stil) stoot(world, 1, TREIN_TEKST.stoppen);
  return was;
}

// De gast stapt uit, valt weg of de sessie stopt: geen walkstand, geen teller en geen treincamera meer.
export function gastTreinWeg(world) {
  if (!world) return;
  gastWalkStop(world, true);
  world.trainControle = null;
  world.coopTreinTrein = null;
  world.coopTreinWalkT = 0;
}

// Elke frame bij de gast (coopgastlokaal.js): T start/stopt, lopen met WASD en de muis, E controleert een kaartje.
// Geeft true zolang de gast loopt (dan doet de rest van zijn invoer niet mee).
export function gastTreinTik(world, dt = 1 / 60) {
  const input = world && world.input;
  if (!input) return false;
  const c = world.coopTrein;
  if (!c || !c.aan) { gastTreinWeg(world); return false; }
  const t = gastTreinVan(world);
  if (input.wasPressed('t')) {
    input.consume('t');
    if (world.trainWalk) gastWalkStop(world);
    else gastWalkStart(world);
  }
  const walk = world.trainWalk;
  if (!walk) return false;
  if (!t || !t.cars || !t.cars[walk.car]) { gastWalkStop(world, true); return false; }
  loopGast(dt, world, t, walk, input);
  zetGastCam(world, t, walk);
  zendGastWalk(world, walk, dt);
  if (input.wasPressed('e') || input.wasPressed('f')) {
    input.consume('e'); input.consume('f');
    gastControleer(world);
  }
  return true;
}

function loopGast(dt, world, t, walk, input) {
  const layout = trainLayout(t.cfg);
  if (!layout[walk.car]) return;
  const mouse = input.mouse || {};
  const looking = input.lookActive ? input.lookActive() : !!mouse.locked;
  if (looking) {
    walk.yaw += (mouse.dx || 0) * TREIN_WALK_MUIS;
    walk.pitch = Math.max(-0.9, Math.min(0.9, (walk.pitch || 0) + (mouse.dy || 0) * TREIN_WALK_MUIS * 0.8));
  }
  walk.yaw += ((input.isDown('arrowright') ? 1 : 0) - (input.isDown('arrowleft') ? 1 : 0)) * TREIN_WALK_DRAAI * dt;
  const fwd = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
  const str = (input.isDown('a') ? 1 : 0) - (input.isDown('d') ? 1 : 0); // links is +
  const sp = WALK_SPEED * (fwd && str ? 0.72 : 1) * dt;
  const co = Math.cos(walk.yaw), si = Math.sin(walk.yaw);
  walkMove(layout, walk, (co * fwd - si * str) * sp, (si * fwd + co * str) * sp);
  // het eigen lichaam staat op de vloer van de wagen, zodat de camera en de trein op dezelfde plek blijven
  const car = t.cars[walk.car], at = carPoint(car, walk.lx, walk.lz), p = world.player;
  if (p && !p.inVehicle) {
    p.x = at.x; p.y = at.y; p.angle = (car.angle || 0) + walk.yaw;
    p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = car.z || 0;
  }
}

// Dezelfde binnencamera als traindrive.js eyePose: de ogen van de conducteur tussen de stoelen.
function zetGastCam(world, t, walk) {
  const layout = trainLayout(t.cfg), cl = layout[walk.car];
  if (!cl) return;
  const car = t.cars[walk.car], at = carPoint(car, walk.lx, walk.lz);
  const h = (car.z || 0) + cl.floorY + 1.62;
  const pitch = walk.pitch || 0, hd = (car.angle || 0) + walk.yaw, cp = Math.cos(pitch);
  const cam = world.trainCam || (world.trainCam = { angle: 0, speed: 0, z: 0, model: { len: 9, wid: 3 } });
  cam.inside = true;
  cam.angle = car.angle || 0;
  cam.speed = (Number(t.v) || 0) * (t.dir === -1 ? -1 : 1);
  cam.z = (car.z || 0) + (Number(t.cfg && t.cfg.height) || 3.2) * 0.75;
  cam.model = { len: car.len, wid: 2.9 };
  cam.eye = {
    position: { x: at.x, y: at.y, z: h },
    lookAt: { x: at.x + Math.cos(hd) * cp * 10, y: at.y + Math.sin(hd) * cp * 10, z: h + Math.sin(pitch) * 10 },
    fov: 72, cut: true, interior: true,
  };
}

// De looppositie naar de gastheer (world.coopTreinWalkMeld, coopnet.js): geen nieuw bericht, alleen het bestaande
// trein-bericht met a:'walk'. Een paar keer per seconde is genoeg; de gastheer zet het lichaam soepel op de wagen.
function zendGastWalk(world, walk, dt) {
  const f = world.coopTreinWalkMeld;
  if (typeof f !== 'function') return false;
  world.coopTreinWalkT = (world.coopTreinWalkT || 0) + Math.max(0, dt);
  if (world.coopTreinWalkT < TREIN_WALK_ZEND_S) return false;
  world.coopTreinWalkT = 0;
  try { return !!f(world, { car: walk.car, lx: walk.lx, lz: walk.lz, yaw: walk.yaw }); } catch (e) { return false; }
}

// E in de walkstand: de dichtstbijzijnde zittende reiziger in deze wagen. De uitkomst en de teller zijn puur
// (treincontrole.js); hier komen het antwoord, de melding en na vijf reizigers het loon via loopbaanVerdien.
export function gastControleer(world) {
  const c = world && world.coopTrein;
  if (!c || !c.aan) return false;
  if (c.rol !== 'conducteur') { stoot(world, 1, TREIN_TEKST.geenConducteur); return false; }
  const walk = world.trainWalk;
  if (!walk) return false;
  const t = gastTreinVan(world);
  if (!t || !t.cars || !t.cars[walk.car]) return false;
  const cl = trainLayout(t.cfg)[walk.car];
  if (!cl) return false;
  const seed = reizigerSeed(t, walk.car);
  const pax = passengers(cl, seed).seated;
  const st = world.trainControle || (world.trainControle = beginControle(seed + 7));
  // een halte wisselt de reizigers: het zaadje verandert en de teller begint schoon, zonder de rust te omzeilen
  if (st.seed !== ((seed + 7) >>> 0)) reset(st, seed + 7);
  let best = null, bd = TREIN_CONTROLE_M;
  for (let i = 0; i < pax.length; i++) {
    if (st.gedaan.has(walk.car + ':' + i)) continue;
    const d = Math.hypot(pax[i].x - walk.lx, pax[i].z - walk.lz);
    if (d <= bd) { bd = d; best = i; }
  }
  if (best == null) { stoot(world, 1, TREIN_TEKST.geenReiziger); return false; }
  const r = controleer(st, walk.car, best, world.time || 0);
  if (r.rust) { stoot(world, 1, TREIN_TEKST.rust); return false; }
  if (!r.ok) return false;
  stoot(world, 1, r.tekst);
  if (r.klaar && r.beloning) {
    const betaald = loopbaanVerdien(world, 'trein', r.beloning.euro, { xp: r.beloning.xp, deel: false, rubriek: 'Overig inkomsten' });
    stoot(world, 1, `Kaartjes gecontroleerd: €${betaald}. De volgende ronde begint zo.`);
  }
  return true;
}

// De gastheer zet het lichaam van de conducteur op de plek uit het trein-bericht (coopnet.js handleEvent). Alleen
// leden van de crew, en alleen op een plek waar je kunt staan; een ongeldige plek laat het lichaam waar het is.
export function treinLoopPlek(world, slot, m) {
  if (!world || !(slot > 0) || !m) return false;
  const t = treinVan(world), crew = t && t.crew;
  if (!crew || !roleOf(crew, slot)) return false;
  const walk = treinWalkPlek(t, m);
  if (!walk) return false;
  (world.coopTreinWalk || (world.coopTreinWalk = {}))[slot] = walk;
  return true;
}
export function treinLoopWeg(world, slot) {
  if (world && world.coopTreinWalk && (slot > 0)) delete world.coopTreinWalk[slot];
  return true;
}

function treinWalkPlek(t, m) {
  const layout = t && t.cars && t.cfg && Array.isArray(t.cfg.segments) ? trainLayout(t.cfg) : null;
  const car = Number(m.car);
  if (!layout || !Number.isInteger(car) || !layout[car]) return null;
  const lx = Number(m.lx), lz = Number(m.lz);
  if (!Number.isFinite(lx) || !Number.isFinite(lz)) return null;
  if (!canStand(layout[car], lx, lz)) return null;
  const yaw = Number(m.yaw);
  return { car, lx, lz, yaw: Number.isFinite(yaw) ? yaw : 0 };
}

// De loopplek van een gast op de wagen, of null als hij gewoon op zijn plek staat.
function loopPlek(world, t, slot) {
  const m = world.coopTreinWalk && world.coopTreinWalk[slot];
  if (!m) return null;
  const walk = treinWalkPlek(t, m);
  if (!walk) return null;
  const car = t.cars[walk.car], p = carPoint(car, walk.lx, walk.lz);
  return { car: walk.car, x: p.x, y: p.y, angle: (car.angle || 0) + walk.yaw, z: car.z || 0, lx: walk.lx, lz: walk.lz };
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

function stoot(world, slot, tekst) {
  if (!world) return;
  if (world.coopMeld) { world.coopMeld(slot, tekst); return; }
  if (world.addMessage) world.addMessage(tekst, 3); // de gast zelf (een gast heeft geen coopMeld-haak)
}
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
  // de gastheer is de machinist (de eerste keer dat er iemand bij komt); de eerste gast wordt conducteur als die plek vrij
  // is (#492), board() geeft een volgende gast vanzelf de rol passagier
  if (!t.crew) t.crew = newCrew();
  t.crew.service = !!(t.service || t.crew.service); // loopt de dienst al, dan weigert board() de late gast (#492)
  const eigen = board(t.crew, 0).ok ? board(t.crew, slot, 'conducteur') : { ok: false };
  if (!eigen.ok) { stoot(world, slot, TREIN_TEKST.dienst); return { gedaan: true }; } // late instap: board() weigert
  const plek = plekOpTrein(t, slot);
  if (plek) zetOpWagen(l, plek);
  meld(world, slot, true, eigen.role);
  stoot(world, slot, eigen.role === 'conducteur' ? TREIN_TEKST.conducteur : TREIN_TEKST.in);
  return { gedaan: true, rol: eigen.role };
}

// De gast stapt uit (of valt weg): uit de crew en met zijn lichaam naast de wagen op een droge, vrije plek.
export function treinUit(world, slot, t = treinVan(world)) {
  const crew = t && t.crew;
  if (!crew || !(slot > 0) || !roleOf(crew, slot)) return false;
  const plek = plekOpTrein(t, slot);
  leave(crew, slot);
  treinLoopWeg(world, slot); // de looppositie van de conducteur hoort niet meer bij de crew (#492)
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
    const plek = l ? (loopPlek(world, t, slot) || plekOpTrein(t, slot)) : null;
    if (!plek) continue; // zijn lichaam is er even niet (nog niet aangemeld): niets aan de hand, onLeave ruimt hem op
    zetOpWagen(l, plek);
    n++;
  }
  return n;
}

// De crew opruimen: de gastheer stopt met rijden (traindrive.js stopDriving), de sessie eindigt (coopnet.js stopCoopNet)
// of de trein is weg. Elke gast staat daarna weer naast zijn wagen.
export function treinStop(world, t = treinVan(world)) {
  if (world) { world.coopTreinDeur = false; world.coopTreinWaak = false; } // een late O of K van een gast telt na de dienst niet meer (#492)
  const crew = t && t.crew;
  if (!crew) { if (world) world.coopTreinWalk = null; return 0; }
  let n = 0;
  for (const slot of members(crew)) if (slot > 0 && treinUit(world, slot, t)) n++;
  t.crew = null;
  if (world) world.coopTreinWalk = null; // geen loopposities van een dienst die niet meer loopt (#492)
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
