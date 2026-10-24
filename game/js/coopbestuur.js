// Samen spelen (#434): een gast bestuurt zelf een voertuig. Het voertuig blijft in de simulatie van wie het spel opende (de host); de
// gast stuurt zijn invoer (stick, rennen, handrem: dezelfde bytes als bij het stuur van de bijrijder, coopgast.js wielInvoer) en de host
// laat het voertuig rijden alsof een speler erin zit (driver 'player', dus geen verkeersAI). Het lichaam van de gast (plek 1: de metgezel,
// plek 2 en hoger: een figuur) zit op stoel 0; wie meerijdt of toekijkt ziet hem via coopzitten3d.js.
// Pure logica zonder three.js: de dingen van player.js en vehicle.js komen binnen als haken (zetBestuurHaken), zodat dit in Node te testen is.
// Schade, politie en diefstalgevolgen horen bij de gast: voertuig.coopBestuurder is zijn plek (coopgezocht.js).
import { figures } from './coopclient.js';
import { kanUitstappen, wielInvoer } from './coopgast.js';
import { magGebruiken } from './coopbezit.js'; // de rechten op een eigen voertuig van een medespeler (#449); dit bestand en coopbezit.js wijzen naar elkaar, net als coopnet.js en coophostwisselnet.js

export const BESTUUR_TEKST = {
  in: 'Je rijdt. Met E stap je uit als het voertuig bijna stilstaat.',
  uit: 'Stap uit als het voertuig bijna stilstaat.',
  slot: 'Dat slot zit dicht.',
  vlieg: 'Een helikopter of vliegtuig besturen kan alleen in je eigen spel.',
  gedeeld: 'Deze is van een ander en wordt niet gedeeld.',
  kapot: 'Je voertuig is kapot. Je staat weer buiten.',
  zinkt: 'Je voertuig zinkt. Je staat weer bij de groep.',
  ver: 'Te ver van de groep: je voertuig staat stil en je staat weer bij de groep.',
  wacht: 'De wereld hier wordt nog geladen. Even wachten.',
};
export const TE_VER_S = 4; // s buiten het bereik van de wereld voor de host de gast bij de groep zet

// De haken (main.js en coopnet.js zetten ze; tests zetten nepversies):
//  vind(x, y, voertuigen) -> voertuig of null (vehicle.js findEnterableVehicle); vindProp(x, y) -> { prop, dist } of null; rijProp(world, prop) -> voertuig
//  enter(lichaam, v, world) en exit(lichaam, map, world) (player.js enterVehicle en exitVehicle op het lichaam van de gast); drive(lichaam, dt, invoer, map, world)
//  misdaad(world, slot, soort) (crime.js reportCrime met de gast als dader)
//  los(world, slot, x, y) -> { ok, wacht } (coopnet.js losVoor); bijGroep(world, lichaam, hoek) -> true als er droge grond is (coopnet.js zetBijGroep)
const haken = { misdaad: null, vind: null, vindProp: null, rijProp: null, enter: null, exit: null, drive: null, los: null, bijGroep: null };
export function zetBestuurHaken(h) { Object.assign(haken, h || {}); }

export const rijders = (world) => world.coopRijders || (world.coopRijders = {});

// Het lichaam van een gast bij de host: plek 1 is de metgezel, plek 2 en hoger een figuur.
export function lichaamVan(world, slot) {
  if (slot === 1) return world.companion && world.coop && world.coop.remote ? world.companion : null;
  return slot >= 2 ? figures(world)[slot] || null : null;
}
// De invoer van een gast (net/session.js): plek 1 in world.coop.remoteInput, de rest op de figuur.
export function invoerVan(world, slot) {
  if (slot === 1) return world.coop ? world.coop.remoteInput : null;
  const f = figures(world)[slot]; return f ? f.input : null;
}
// Een gast met een wapen slaat of schiet een voetganger of agent in de wereld van wie het spel opende: dat is een misdaad van de gast
// (zijn eigen niveau, met getuigen zoals bij het rijden). Nog niet aangesloten op een aanval-invoer van de gast (zie docs/COOP-GAST.md).
export function gastAanval(world, slot, slachtoffer, { gedood = false } = {}) {
  if (!(slot > 0) || !slachtoffer || !haken.misdaad) return false;
  haken.misdaad(world, slot, slachtoffer.isCop ? 'copHit' : gedood ? 'pedKill' : 'pedHit');
  return true;
}
// Alle lichamen van gasten bij de host: [[plek, lichaam]] (plek 1 de metgezel als hij door een gast wordt bestuurd, plek 2 en hoger figuren).
export function gastLichamen(world) {
  const uit = [], c = lichaamVan(world, 1);
  if (c) uit.push([1, c]);
  for (const f of Object.values(figures(world))) if (f && f.slot >= 2) uit.push([f.slot, f]);
  return uit;
}
export const bestuurt = (lichaam) => !!(lichaam && lichaam.coopBestuurt);
export const bestuurderVan = (world, slot) => (rijders(world)[slot] || null);

// Mag een gast dit voertuig besturen? Geparkeerde auto, fiets, scooter en boot die vrij zijn (niemand erin, geen verkeer, geen opdrachtauto of eigen auto van de host, behalve een machine van de boerderij van de host: #415);
// een helikopter of vliegtuig niet. Een eigen voertuig dat een gast meenam (#449, coopbezit.js) mag wel, als
// die hem deelt (recht 'ik' is alleen voor de eigenaar). Geeft null als het mag, anders de reden.
export function weigerReden(v, slot = null) {
  if (!v) return 'geen';
  if (v.isHeli || v.isPlane) return 'vlieg';
  if (v.driver || v.passenger || v.wrecked || v.sinking || v.disabled) return 'bezet';
  if (v.road || v.countryDrive) return 'verkeer';
  if (v.coopBezit) return magGebruiken(v.coopBezit.recht, slot, v.coopBezit.slot) ? null : 'gedeeld';
  if (v.isPolice || v.isBus || v.isHeroCar || (v.playerOwned && !v.farm) || v.missionCar || v.storyCar || v.scripted || v.racer || v.cineTemp || v.homeStored || v._mount || v.isAmbulance) return 'niet';
  return null;
}
export const magBesturen = (v, slot = null) => weigerReden(v, slot) === null;

function zelfdeNiveau(v, l) { return Math.abs((v.z || 0) - (l.gz || 0)) <= 2; }
function stoot(world, slot, tekst) { if (world.coopMeld) world.coopMeld(slot, tekst); }

// Een eigen object voor player.js: enterVehicle, driveVehicle en exitVehicle gebruiken alleen plek, hoek, hoogte en inVehicle van wie rijdt.
function maakProxy(world, slot, l, v) {
  return {
    coopSlot: slot, x: v.x, y: v.y, angle: v.angle || 0, vx: 0, vy: 0, z: 0, vz: 0, gz: l.gz || 0, radius: l.radius || 0.4, inVehicle: null,
    exitVehicle(map, w, thrown) { return haken.exit(this, map, w, thrown); }, // een motor die zijn rijder afgooit
    diveOut() {}, ejectIntoWater() {}, blownOut() {},
  };
}

// De gast drukte op E bij de host: stapt hij uit (bestuurt hij) of in bij een vrij voertuig. Geeft:
//  { gedaan: true }  er is iets gebeurd (of een melding gegeven);
//  { gedaan: false } niets bestuurbaar dichtbij: de aanroeper mag proberen als bijrijder in te stappen.
export function bestuurGebruik(world, slot) {
  const l = lichaamVan(world, slot); if (!l) return { gedaan: false };
  if (bestuurt(l)) { bestuurUitstappen(world, slot); return { gedaan: true }; }
  if (l.inVehicle || l.inVeh || l.water || l.state === 'dead' || world.paused && !world.coopDoorloopNu || world.coopHold) return { gedaan: false };
  return bestuurInstappen(world, slot);
}

export function bestuurInstappen(world, slot) {
  const l = lichaamVan(world, slot); if (!l || !haken.vind || !haken.enter) return { gedaan: false };
  const alle = (world.vehicles || []).filter((q) => q && !q.wrecked && zelfdeNiveau(q, l));
  const vrij = alle.filter((q) => magBesturen(q, slot));
  let v = haken.vind(l.x, l.y, vrij);
  const pr = haken.vindProp ? haken.vindProp(l.x, l.y) : null; // een fiets of scooter die tegen een muur staat
  if (pr && (!v || pr.dist < Math.hypot(v.x - l.x, v.y - l.y) - (v.halfLen || 0))) {
    if (pr.prop.locked) { stoot(world, slot, BESTUUR_TEKST.slot); return { gedaan: true }; }
    v = haken.rijProp ? haken.rijProp(world, pr.prop) : null;
    if (!v) return { gedaan: true };
  }
  if (!v) {
    const vlieg = haken.vind(l.x, l.y, alle.filter((q) => (q.isHeli || q.isPlane) && !q.driver));
    if (vlieg) { stoot(world, slot, BESTUUR_TEKST.vlieg); return { gedaan: true }; }
    // een eigen voertuig van een andere speler dat niet gedeeld is (#449)
    const gedeeld = haken.vind(l.x, l.y, alle.filter((q) => q.coopBezit && !magGebruiken(q.coopBezit.recht, slot, q.coopBezit.slot)));
    if (gedeeld) { stoot(world, slot, BESTUUR_TEKST.gedeeld); return { gedaan: true }; }
    return { gedaan: false };
  }
  const proxy = maakProxy(world, slot, l, v);
  const auto = !v.isBike && !v.isScooter && !v.isBoat && !v.farm && !v.coopBezit; // een fiets of boot meenemen is geen misdaad, een auto van een ander wel; de machines van de boerderij van de host en een gedeeld voertuig van een medespeler zijn voor iedereen (#415, #449)
  haken.enter(proxy, v, world);
  if (proxy.inVehicle !== v) return { gedaan: true }; // enterVehicle weigerde (er zat al iemand in)
  v.coopBestuurder = slot; v.wreckedByGast = null;
  v.speed = Math.abs(v.speed || 0) < 0.5 ? 0 : v.speed;
  if (slot === 1) l.inVehicle = v; else { l.inVeh = v; l.coopVoertuig = true; l.stoel = 0; }
  l.coopBestuurt = true; l.vx = 0; l.vy = 0;
  rijders(world)[slot] = { slot, v, proxy, buiten: 0 };
  stoot(world, slot, BESTUUR_TEKST.in);
  if (auto && haken.misdaad) haken.misdaad(world, slot, 'autoDiefstal'); // gezien door een agent of een voetganger dichtbij: zijn eigen gezocht-niveau (coopgezocht.js)
  return { gedaan: true, voertuig: v };
}

// Het lichaam van de gast weer buiten het voertuig (uitgestapt, weggevallen of het voertuig is kapot).
function klaar(world, slot, r, l) {
  const v = r.v;
  delete rijders(world)[slot];
  if (v) { // het wrak van een gast (ook als het pas daarna zinkt of ontploft) is zijn zaak, geen getuige voor de host
    if (v.wrecked || v.sinking || v.disabled) v.wreckedByGast = slot;
    v.coopBestuurder = null; if (v.driver === 'player') v.driver = null; v.horn = false; v.throttle = 0;
  }
  if (!l) return;
  l.coopBestuurt = false;
  if (slot === 1) { l.inVehicle = null; l.coopUit = true; } else { l.inVeh = null; l.coopVoertuig = false; l.stoel = undefined; }
  if (Number.isFinite(r.proxy.x)) { l.x = r.proxy.x; l.y = r.proxy.y; }
  l.gz = r.proxy.gz || l.gz || 0; l.vx = 0; l.vy = 0;
}
function zetStil(v) { if (!v) return; v.speed = 0; v.driftX = 0; v.driftY = 0; v.rollingFree = false; v.throttle = 0; v.handbrake = true; }

export function bestuurUitstappen(world, slot) {
  const r = rijders(world)[slot], l = lichaamVan(world, slot); if (!r) return false;
  if (!kanUitstappen(r.v)) { stoot(world, slot, BESTUUR_TEKST.uit); return false; }
  if (haken.exit) haken.exit(r.proxy, world.map, world);
  klaar(world, slot, r, l);
  return true;
}

// De gast valt weg (verbinding kwijt, weggegaan, eruit gezet): het voertuig staat stil en de stoel is vrij.
export function bestuurLos(world, slot) {
  const r = rijders(world)[slot]; if (!r) return false;
  const l = lichaamVan(world, slot) || (slot >= 2 ? null : world.companion);
  zetStil(r.v);
  if (haken.exit && r.proxy.inVehicle === r.v) haken.exit(r.proxy, world.map, world);
  klaar(world, slot, r, l);
  return true;
}
export function bestuurAllesLos(world) { for (const s of Object.keys(rijders(world))) bestuurLos(world, +s); }

// Elke frame bij de host: het voertuig van elke gast rijdt met zijn invoer. Pauzeert de wereld voor iedereen, dan staat het stil.
export function bestuurTick(world, dt) {
  const lijst = world.coopRijders; if (!lijst) return 0;
  if (world.coopHold || (world.paused && !world.coopDoorloopNu)) return 0;
  let n = 0;
  for (const slot of Object.keys(lijst)) {
    const r = lijst[slot], v = r.v, l = lichaamVan(world, +slot);
    if (!l || !bestuurt(l) || !v) { bestuurLos(world, +slot); continue; }
    if (v.wrecked || v.sinking || v.isHeli || v.isPlane) { // kapot, aan het zinken: de gast staat weer buiten (op de grond bij de groep als er geen droge plek is)
      haken.exit && r.proxy.inVehicle === v && haken.exit(r.proxy, world.map, world);
      klaar(world, +slot, r, l);
      if (haken.bijGroep && v.sinking) haken.bijGroep(world, l, (+slot * 1.7) % (Math.PI * 2));
      stoot(world, +slot, v.sinking ? BESTUUR_TEKST.zinkt : BESTUUR_TEKST.kapot);
      continue;
    }
    // de wereld rond het voertuig moet geladen zijn; anders staat het stil en zet de host de gast na een paar seconden bij de groep
    const los = haken.los ? haken.los(world, +slot, v.x, v.y) : { ok: true, wacht: false };
    const p = world.player, d = p ? Math.hypot(v.x - p.x, v.y - p.y) : 0;
    const geblokkeerd = !los.ok && d > 110 || los.wacht;
    r.buiten = geblokkeerd ? r.buiten + dt : 0;
    if (r.buiten >= TE_VER_S) {
      zetStil(v); if (haken.exit && r.proxy.inVehicle === v) haken.exit(r.proxy, world.map, world);
      klaar(world, +slot, r, l);
      if (haken.bijGroep) haken.bijGroep(world, l, (+slot * 1.7) % (Math.PI * 2));
      stoot(world, +slot, BESTUUR_TEKST.ver);
      continue;
    }
    const inv = geblokkeerd ? wielInvoer({ mx: 0, my: 0, buttons: 2 }) : wielInvoer(invoerVan(world, +slot));
    if (haken.drive) haken.drive(r.proxy, dt, inv, world.map, world);
    if (r.proxy.inVehicle !== v) { klaar(world, +slot, r, l); continue; } // een motor gooide zijn rijder af
    l.x = v.x; l.y = v.y; l.angle = v.angle || 0; l.gz = v.z || 0; l.vx = 0; l.vy = 0; r.proxy.gz = v.z || 0;
    n++;
  }
  return n;
}

// Voor de tekenaar bij de host: wie bestuurt, als zitter op stoel 0 (coopzitten3d.js).
export function bestuurdersLijst(world) {
  const uit = [];
  for (const r of Object.values(world.coopRijders || {})) {
    const l = lichaamVan(world, r.slot); if (!l || !r.v) continue;
    uit.push({ slot: r.slot, char: l.char || l.character || 'tammo', voertuig: r.v, stoel: 0 });
  }
  return uit;
}
