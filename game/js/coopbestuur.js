import { hoofdspeler } from './players.js';
// Samen spelen (#434): een gast bestuurt zelf een voertuig. Het voertuig blijft in de simulatie van wie het spel opende (de host); de
// gast stuurt zijn invoer (stick, rennen, handrem: dezelfde bytes als bij het stuur van de bijrijder, coopgast.js wielInvoer) en de host
// laat het voertuig rijden alsof een speler erin zit (driver 'player', dus geen verkeersAI). Elke gast is sinds #502 een eigen
// figuur (plek 1 en hoger) en zit in `inVeh`; wie meerijdt of toekijkt ziet hem via coopzitten3d.js.
// Pure logica zonder three.js: de dingen van player.js en vehicle.js komen binnen als haken (zetBestuurHaken), zodat dit in Node te testen is.
// Schade, politie en diefstalgevolgen horen bij de gast: voertuig.coopBestuurder is zijn plek (coopgezocht.js).
import { figures } from './coopclient.js';
import { kanUitstappen, wielInvoer } from './coopgast.js';
import { seatedOf } from './occupants.js'; // wie er op de stoelen zit (AI-passagiers)
import { isPassief } from './cooppvp.js'; // een medespeler eruit trekken kan alleen buiten de passieve stand (#447)
import { trekKandidaat, openDeurVoor, openDeurVoorRol, trekPunt, deurNaam } from './vehicledoors.js'; // deur, bereik en stilstand (#459)
import { coopVanModel } from './vehicleregister.js'; // de coöp-regel per voertuigmodel (#452, punt 14/23/24)
// De rechten op een eigen voertuig van een medespeler (#449) staan hier: coopbezit.js wijst naar dit bestand, niet
// andersom, zodat er geen importkring ontstaat.
export function magGebruiken(recht, slot, eigenaar) {
  if (slot === eigenaar) return true;
  return (recht || 'iedereen') !== 'ik';
}

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
export const TREK_TEKST = {
  deur: (naam) => `Je opent de ${naam}. Nog een keer E om er iemand uit te trekken.`,
  uit: 'Je trekt de passagier uit het voertuig.',
  mede: 'Je trok een medespeler uit het voertuig.',
  passief: 'Een medespeler eruit trekken kan alleen als jullie allebei niet op passief staan.',
  weg: 'Je bent uit het voertuig getrokken.',
};
export const TE_VER_S = 4; // s buiten het bereik van de wereld voor de host de gast bij de groep zet

// De haken (main.js en coopnet.js zetten ze; tests zetten nepversies):
//  vind(x, y, voertuigen) -> voertuig of null (vehicle.js findEnterableVehicle); vindProp(x, y) -> { prop, dist } of null; rijProp(world, prop) -> voertuig
//  enter(lichaam, v, world) en exit(lichaam, map, world) (player.js enterVehicle en exitVehicle op het lichaam van de gast); drive(lichaam, dt, invoer, map, world)
//  stap(lichaam, v, map, uit) -> true als de gast naast de deur van zijn stoel staat (player.js stapNaastDeur)
//  misdaad(world, slot, soort) (crime.js reportCrime met de gast als dader)
//  los(world, slot, x, y) -> { ok, wacht } (coopnet.js losVoor); bijGroep(world, lichaam, hoek) -> true als er droge grond is (coopnet.js zetBijGroep)
//  trekUit(world, v, rol) -> passagier of null (pedestrians.js ejectPassenger: de bestaande trek-actie)
const haken = { misdaad: null, vind: null, vindProp: null, rijProp: null, enter: null, exit: null, drive: null, stap: null, los: null, bijGroep: null, trekUit: null };
export function zetBestuurHaken(h) { Object.assign(haken, h || {}); }

export const rijders = (world) => world.coopRijders || (world.coopRijders = {});

// Het lichaam van een gast bij de host: elke gast (plek 1 en hoger) is een eigen figuur (#502). De metgezel is de
// computermetgezel en hoort bij geen plek; een gastheer zonder lokale speler (#450) heeft helemaal geen metgezel.
export function lichaamVan(world, slot) {
  return slot >= 1 ? figures(world)[slot] || null : null;
}
// De invoer van een gast (net/session.js): altijd op zijn eigen figuur (#502).
export function invoerVan(world, slot) {
  const f = figures(world)[slot]; return f ? f.input : null;
}
// Een gast met een wapen slaat of schiet een voetganger of agent in de wereld van wie het spel opende: dat is een misdaad van de gast
// (zijn eigen niveau, met getuigen zoals bij het rijden). Nog niet aangesloten op een aanval-invoer van de gast (zie docs/COOP-GAST.md).
export function gastAanval(world, slot, slachtoffer, { gedood = false } = {}) {
  if (!(slot > 0) || !slachtoffer || !haken.misdaad) return false;
  haken.misdaad(world, slot, slachtoffer.isCop ? 'copHit' : gedood ? 'pedKill' : 'pedHit');
  return true;
}
// Alle lichamen van gasten bij de host: [[plek, lichaam]] voor elke figuur vanaf plek 1 (#502).
export function gastLichamen(world) {
  const uit = [];
  for (const f of Object.values(figures(world))) if (f && f.slot >= 1) uit.push([f.slot, f]);
  return uit.sort((a, b) => a[0] - b[0]);
}
export const bestuurt = (lichaam) => !!(lichaam && lichaam.coopBestuurt);
export const bestuurderVan = (world, slot) => (rijders(world)[slot] || null);

// De coöp-regel van dit voertuig (vehicleregister.js): stoelen, passagiers en of een gast mag sturen.
// Een onbekend model (tests, een oud voertuig) krijgt de veilige standaard van een gewone auto.
export const COOP_STANDAARD_VOERTUIG = Object.freeze({ stoelen: 2, passagiers: 3, bestuur: 'gast' });
export const coopRegelVoor = (v) => coopVanModel(v && v.model) || COOP_STANDAARD_VOERTUIG;

// Mag een gast dit voertuig besturen? Eerst de regel uit het register: een helikopter, vliegtuig,
// bus, trein of politieauto staat op 'nee'; daarna de toestand van dit exemplaar (bezet, verkeer,
// opdrachtauto, eigen auto van de host). Een eigen voertuig dat een gast meenam (#449, coopbezit.js)
// mag wel, als die hem deelt (recht 'ik' is alleen voor de eigenaar). Geeft null als het mag, anders de reden.
export function weigerReden(v, slot = null) {
  if (!v) return 'geen';
  // Samen spelen (#492): het voertuig van je eigen bijbaan bestuur je zelf, ook al is het een
  // opdrachtauto. Een ander komt er niet mee weg: dat is diefstal van de dienst van een medespeler.
  if (Number.isInteger(v.jobOwner)) return v.jobOwner === slot ? null : 'niet';
  if (coopRegelVoor(v).bestuur === 'nee') return 'niet'; // de regel van het model, ook zonder de oude vlaggen
  if (v.driver || v.passenger || v.wrecked || v.sinking || v.disabled) return 'bezet';
  if (v.road || v.countryDrive) return 'verkeer';
  if (v.coopBezit) return magGebruiken(v.coopBezit.recht, slot, v.coopBezit.slot) ? null : 'gedeeld';
  if (v.isPolice || v.isBus || v.isHeroCar || (v.playerOwned && !v.farm) || v.storyCar || v.scripted || v.racer || v.cineTemp || v.homeStored || v._mount || v.isAmbulance) return 'niet';
  return null;
}
export const magBesturen = (v, slot = null) => weigerReden(v, slot) === null;

function zelfdeNiveau(v, l) { return Math.abs((v.z || 0) - (l.gz || 0)) <= 2; }
function stoot(world, slot, tekst) { if (world.coopMeld) world.coopMeld(slot, tekst); }
// De naam van een gast voor een melding aan de gastheer (dezelfde volgorde als coopnet.js: avatar, naam, figuur).
function gastNaam(world, slot) {
  const p = (world.coopRoster || []).find((x) => x && x.slot === slot);
  return (p && ((p.avatar && p.avatar.naam) || p.naam)) || 'Een medespeler';
}

// Een eigen object voor player.js: enterVehicle, driveVehicle en exitVehicle gebruiken alleen plek, hoek, hoogte en inVehicle van wie rijdt.
// Waarom een eigen object en niet de figuur zelf (#502): de figuur is het lichaam dat de gastheer tekent en dat de
// snapshots vullen; de besturing schrijft elke frame x/y/hoek van het voertuig. Zo blijven die twee uit elkaar en zet
// `klaar` de gast op de plek waar hij uitstapte.
//
// Elke methode die player.js op `this` kan bereiken staat op één gedeelde, bevroren basis (#520). Een lijstje per proxy
// is wat op 31-10 stukging: `stapNaastDeur` was vergeten, dus gooide exitVehicle midden in het uitstappen en bleef de
// rijdersregel staan (`null.isPlane`, daarna `null.sinking`). Op een gedeelde basis kan een nieuwe proxy er geen missen,
// en `scripts/coopbestuur_proxy_pariteit_test.mjs` leidt de eis af uit de haken in main.js en de bodies in player.js:
// een nieuwe haak zonder methode laat de test falen in plaats van het spel. De vier die main.js aan een haak bindt
// (enter/exit/drive/stap) lopen via die haak, want tests en coopnet.js zetten hun eigen versie; de rest doet bewust
// niets: de tuimeling en het zwemmen van een gast horen bij zijn eigen spel, de gastheer tekent alleen zijn figuur (#502).
const PROXY_BASIS = Object.freeze({
  stapNaastDeur(v, map, uit) { return haken.stap ? haken.stap(this, v, map, uit) : false; }, // de deur van zijn stoel (player.js)
  enterVehicle(v, world) { return haken.enter ? haken.enter(this, v, world) : undefined; },
  exitVehicle(map, world, thrown) { return haken.exit ? haken.exit(this, map, world, thrown) : undefined; }, // een motor die zijn rijder afgooit
  driveVehicle(dt, input, map, world) { return haken.drive ? haken.drive(this, dt, input, map, world) : undefined; },
  diveOut() {}, ejectIntoWater() {}, enterSwim() {}, blownOut() {}, // de eigen tuimeling, plons en zwem van de gast: zijn eigen spel
});

// De toestand die player.js op het lichaam dat hij bestuurt leest of schrijft: dezelfde velden en dezelfde beginwaarden
// als de constructor van Player (player.js), zodat een gedeelde methode hier nooit `undefined` leest. inVehicle, x/y/hoek
// en gz leven mee met het voertuig; water en de buk- en klimvlaggen staan op hun rustwaarde van een staande speler.
function maakProxy(world, slot, l, v) {
  return Object.assign(Object.create(PROXY_BASIS), {
    coopSlot: slot, x: v.x, y: v.y, angle: v.angle || 0, vx: 0, vy: 0, z: 0, vz: 0, gz: l.gz || 0, radius: l.radius || 0.4, inVehicle: null,
    water: null, swimming: false, swimTilt: 0, waterTime: 0, crouching: false, climb: null, climbSpot: null, climbScanAt: 0,
  });
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
  return stapIn(world, slot, l, v);
}

// Samen spelen (#443): een gast in een bepaald voertuig zetten, eentje dat de wedstrijd voor hem klaarzette (een eigen boot op de
// startlijn). De gast hoeft er dus niet zelf bij te staan; hij bestuurt hem met zijn stick, de host rijdt hem (bestuurTick).
export function bestuurInstappenIn(world, slot, v) {
  const l = lichaamVan(world, slot);
  if (!l || !v || !haken.enter || !magBesturen(v, slot) || v.driver || v.passenger) return { gedaan: false };
  return stapIn(world, slot, l, v);
}

function stapIn(world, slot, l, v) {
  const proxy = maakProxy(world, slot, l, v);
  const auto = !v.isBike && !v.isScooter && !v.isBoat && !v.farm && !v.coopBezit && !v.raceCar && !Number.isInteger(v.jobOwner); // een fiets, boot, wedstrijdwagen of het voertuig van een eigen bijbaan meenemen is geen misdaad (#492); een auto van een ander wel; de machines van de boerderij van de host en een gedeeld voertuig van een medespeler zijn voor iedereen (#415, #449, #443)
  const geparkeerd = !!(v.parked || v.parkSlot); // een auto aan de stoep: de gastheer ziet dat hij meegaat (#434)
  haken.enter(proxy, v, world);
  if (proxy.inVehicle !== v) return { gedaan: true }; // enterVehicle weigerde (er zat al iemand in)
  v.coopBestuurder = slot; v.wreckedByGast = null;
  v.speed = Math.abs(v.speed || 0) < 0.5 ? 0 : v.speed;
  l.inVeh = v; l.coopVoertuig = true; l.stoel = 0; // elke gast is een figuur (#502): ook plek 1 zit in inVeh
  l.coopBestuurt = true; l.vx = 0; l.vy = 0;
  rijders(world)[slot] = { slot, v, proxy, buiten: 0 };
  stoot(world, slot, BESTUUR_TEKST.in);
  if (geparkeerd && world.addMessage) world.addMessage(`${gastNaam(world, slot)} stapt in een geparkeerde auto.`, 4); // geen verrassing voor de gastheer
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
  l.inVeh = null; l.coopVoertuig = false; l.stoel = undefined; // ook plek 1 is een figuur (#502)
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
  const l = lichaamVan(world, slot) || null; // geen terugval op de metgezel: die hoort bij geen plek (#502)
  zetStil(r.v);
  if (haken.exit && r.proxy.inVehicle === r.v) haken.exit(r.proxy, world.map, world);
  klaar(world, slot, r, l);
  return true;
}
export function bestuurAllesLos(world) { for (const s of Object.keys(rijders(world))) bestuurLos(world, +s); }

// ---- iemand uit een voertuig trekken (#459) -----------------------------------------
// Een gast staat bij een bijrijders- of achterdeur en drukt op E: de eerste keer gaat de
// deur open, de tweede keer trekt hij de passagier eruit. De host controleert alles met
// zijn eigen lichaam (nooit de plek die de gast stuurt): de deur van die stoel, stilstand
// en bereik (vehicledoors.js trekKandidaat, openDeurVoorRol, trekPunt). Een AI-passagier
// gaat via de bestaande trek-actie (haken.trekUit, pedestrians.js ejectPassenger); een
// medespeler is een lichaam van de host, dus die staat daarna gewoon buiten en de
// volgende snapshot laat hem daar zien. Alleen als beiden buiten de passieve stand staan
// (#447). Geeft false als er niets te trekken valt: de aanroeper probeert dan het gewone
// in- of uitstappen (coopnet.js 'trek').
function medespelerIn(world, v, rol = 'bijrijder') {
  for (const f of Object.values(figures(world))) { // elke gast is een figuur (#502); stoel 1 is voorin, 2 en hoger achterin
    if (!f || f.inVeh !== v || f.coopBestuurt) continue;
    const stoel = f.stoel == null ? (f.slot === 1 ? 1 : 2) : (f.stoel | 0);
    if (rol === 'achter' ? stoel >= 2 : stoel === 1) return { slot: f.slot, lichaam: f };
  }
  return null;
}

function passagierIn(world, v, rol) {
  if (medespelerIn(world, v, rol)) return true;
  const stoel = rol === 'achter' ? 'rear' : 'front';
  return seatedOf(v).passengers.some((p) => p && p.slot === stoel);
}

export function trekGast(world, slot) {
  const l = lichaamVan(world, slot);
  if (!l || !(slot > 0) || l.inVehicle || l.inVeh) return false; // zittend: E is uitstappen
  const k = trekKandidaat(world.vehicles, l.x, l.y, { niveau: l.gz || 0, heeft: (v, rol) => passagierIn(world, v, rol) });
  if (!k) return false;
  const v = k.v, rol = k.rol, meld = (t) => stoot(world, slot, t);
  if (!openDeurVoorRol(v, rol)) { // eerst de deur open: de tweede E trekt hem er dan uit
    openDeurVoor(v, rol, 3);
    meld(TREK_TEKST.deur(deurNaam(v, k.deur)));
    return true;
  }
  const mede = medespelerIn(world, v, rol);
  if (mede) {
    if (world.coopPvp && (isPassief(world.coopPvp, slot) || isPassief(world.coopPvp, mede.slot))) { meld(TREK_TEKST.passief); return true; }
    const p = trekPunt(v, l.x, l.y, { rol }); // de plek naast de open deur
    const m = mede.lichaam;
    m.inVeh = null; m.coopVoertuig = false; m.stoel = undefined; // elke gast is een figuur (#502)
    if (p) { m.x = p.x; m.y = p.y; }
    m.vx = 0; m.vy = 0;
    openDeurVoor(v, rol, 3);
    meld(TREK_TEKST.mede);
    if (world.coopMeld && mede.slot > 0) world.coopMeld(mede.slot, TREK_TEKST.weg);
    return true;
  }
  if (!haken.trekUit || !haken.trekUit(world, v, rol)) return false;
  const auto = !v.isBike && !v.isScooter && !v.isBoat && !v.farm && !v.coopBezit; // zoals bij instappen: een fiets of boot is geen misdaad (#434)
  if (auto && haken.misdaad) haken.misdaad(world, slot, 'autoDiefstal');
  openDeurVoor(v, rol, 3); // de deur blijft open voor de uitstapper
  meld(TREK_TEKST.uit);
  return true;
}

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
    const p = hoofdspeler(world), d = p ? Math.hypot(v.x - p.x, v.y - p.y) : 0;
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



