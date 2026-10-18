// Voertuigdeuren (#225): deurdefinities per voertuigtype, deurstanden, timing van in- en
// uitstappen, schade en losraken. Pure regels, geen DOM en geen THREE
// (scripts/vehicledoors_test.mjs); vehicledoors3d.js tekent het resultaat.
//
// Deuren zijn alleen beeld: geen physics. De stand staat in v.doors ({ open: {id: 0..1},
// loose: {id: true} }) en wordt lui aangemaakt; een reparatie (dentLog leeg) zet losse
// deuren in één keer terug (reconcileDoors). Bloedloos: alleen plaatwerk.
import { zoneTotals } from './vehicledamage.js';

// x: hartlijn van de deur als fractie van de lengte (voor = positief), w: breedte in m,
// h/y0: hoogte en onderkant, soort: 'scharnier' (voorscharnier), 'achterscharnier'
// of 'schuif'. seat: 'bestuurder' | 'bijrijder' | 'achter' | null (rijdt niemand mee).
// side: -1 links, +1 rechts, zoals de stoelen in seating3d.js (bestuurder z < 0).
const car2 = (x = 0.08, w = 1.0) => [
  { id: 'vl', side: -1, x, w, y0: 0.32, h: 0.62, soort: 'scharnier', seat: 'bestuurder' },
  { id: 'vr', side: 1, x, w, y0: 0.32, h: 0.62, soort: 'scharnier', seat: 'bijrijder' },
];
const car4 = (xf = 0.15, xa = -0.14, w = 0.8) => [
  { id: 'vl', side: -1, x: xf, w, y0: 0.32, h: 0.62, soort: 'scharnier', seat: 'bestuurder' },
  { id: 'vr', side: 1, x: xf, w, y0: 0.32, h: 0.62, soort: 'scharnier', seat: 'bijrijder' },
  { id: 'al', side: -1, x: xa, w, y0: 0.32, h: 0.62, soort: 'achterscharnier', seat: 'achter' },
  { id: 'ar', side: 1, x: xa, w, y0: 0.32, h: 0.62, soort: 'achterscharnier', seat: 'achter' },
];
const cab = (x, w, y0, h) => [
  { id: 'vl', side: -1, x, w, y0, h, soort: 'scharnier', seat: 'bestuurder' },
  { id: 'vr', side: 1, x, w, y0, h, soort: 'scharnier', seat: 'bijrijder' },
];
// Beweegbare delen zonder passagier: motorkap (scharnier achter, opwippen), kofferbak (scharnier voor,
// klapt open) en achterdeuren/laadklep van bestelbus en ambulance. zone sluit aan op
// vehicledamage.js zoneOf (voor/achter); y0 is de bovenkant van het plaatwerk.
const kap = (x, w, y0) => ({ id: 'kap', side: 0, x, w, y0, h: 0.04, soort: 'kap', zone: 'voor', seat: null, scheefAt: 0.7, losAt: 1.8 });
const klep = (x, w, y0) => ({ id: 'klep', side: 0, x, w, y0, h: 0.04, soort: 'klep', zone: 'achter', seat: null, scheefAt: 0.6, losAt: 1.6 });
const laadklep = (y0, h) => ({ id: 'klep', side: 0, x: -0.49, w: 1.5, y0, h, soort: 'achterdeur', zone: 'achter', seat: null, scheefAt: 0.7, losAt: 1.7 });
const dubbel = (id, side, x, w = 0.55, y0 = 0.35, h = 1.9, dx = 0.035) => [
  { id: id + 'a', side, x: x + dx, w, y0, h, soort: 'schuif', seat: 'bijrijder', dir: 1 },
  { id: id + 'b', side, x: x - dx, w, y0, h, soort: 'schuif', seat: 'bijrijder', dir: -1 },
];
// Stadsbus: de deuropening in busSection (models3d_vehicles.js) loopt van de dorpel (0.42 m) tot de
// raamlijn (2.6 m), 1,25 m breed, op hl-1.05 en midden tussen de assen van de voorste eenheid (11,2 m).
const busDeur = (id, x, len) => dubbel(id, 1, x, 0.6, 0.42, 2.15, 0.3 / len);

// Per modelnaam (zie vehicle.js MODELS en models3d_vehicles.js carType). null = geen logische deur.
export const DEUR_DEFS = {
  hatch: [...car2(0.1), kap(0.36, 0.9, 0.84), klep(-0.41, 0.5, 0.96)],
  sedan: [...car4(), kap(0.33, 0.95, 0.84), klep(-0.4, 0.6, 0.98)],
  taxi: [...car4(), kap(0.33, 0.95, 0.84), klep(-0.4, 0.6, 0.98)],
  wagon: [...car4(0.14, -0.13), kap(0.34, 0.95, 0.85), laadklep(0.55, 0.85)],
  suv: [...car4(0.15, -0.12), kap(0.33, 0.95, 1.02), laadklep(0.6, 0.95)],
  sport: [...car2(0.06), kap(0.34, 0.9, 0.7), klep(-0.4, 0.5, 0.86)],
  escort: [...car2(0.08), kap(0.34, 0.9, 0.82), klep(-0.4, 0.55, 0.94)],
  police: [...car4(0.14, -0.13), kap(0.34, 0.95, 0.85), laadklep(0.55, 0.85)],
  van: [
    ...cab(0.2, 0.75, 0.4, 0.75),
    laadklep(0.45, 1.5),
    { id: 'sl', side: 1, x: -0.08, w: 1.0, y0: 0.45, h: 1.3, soort: 'schuif', seat: 'achter', dir: -1 },
  ],
  cashvan: cab(0.2, 0.75, 0.4, 0.75),
  ambulance: [
    ...cab(0.2, 0.75, 0.4, 0.75),
    laadklep(0.45, 1.5),
  ],
  truck: cab(0.33, 0.8, 0.5, 1.2),
  foodtruck: cab(0.33, 0.8, 0.5, 1.2),
  tractor: [{ id: 'vr', side: 1, x: -0.17, w: 0.9, y0: 1.0, h: 1.65, soort: 'scharnier', seat: 'bijrijder' },
    { id: 'vl', side: -1, x: -0.17, w: 0.9, y0: 1.0, h: 1.65, soort: 'scharnier', seat: 'bestuurder' }],
  bus: [...busDeur('d1', 0.406, 11.2), ...busDeur('d2', -0.04, 11.2)],
  midibus: busDeur('d1', 0.375, 8.4),
  tram: [...dubbel('d1', 1, 0.36), ...dubbel('d2', 1, 0.05), ...dubbel('d3', 1, -0.28)],
  train: [...dubbel('d1', 1, 0.3), ...dubbel('d2', 1, -0.3)],
};

// Zonder logische deur: eigen opstapanimatie in seating3d.js (zadel, dolboord, paard) of niets.
export const GEEN_DEUR = ['bike', 'scooter', 'quad', 'boat', 'heli', 'plane', 'kart', 'motorbike', 'horse', 'trekkerlimo'];

export const MAX_LOSSE_DEUREN = 6;     // zoveel losse deuren liggen er tegelijk op straat
export const DEUR_OPEN_TIJD = 0.22;    // s van dicht naar open (en terug)
export const DEUR_HOUD_TIJD = 0.6;     // s dat een los gelaten deur blijft staan (AI/passagier)
export const DEUR_SLAM_SNELHEID = 3;   // m/s: sneller dan dit slaat een open deur dicht
export const MAX_LOSSE_DELEN = MAX_LOSSE_DEUREN;
export const DEEL_PRIJS = { deur: 25, kap: 40, klep: 30 }; // garage: per los onderdeel
export const SCHEEF_VANAF = 0.45;      // klapsterkte vanaf waar een deur scheef zit
export const LOS_VANAF = 1.3;          // en vanaf waar hij losraakt

function nameOf(v) {
  if (!v) return null;
  if (v.isBike || v.isScooter || v.isBoat || v.isHeli || v.isPlane) return null;
  if (v._mount === 'horse') return null;
  if (v.isAmbulance) return 'ambulance';
  if (v.isTrain) return 'train';
  if (v.isTram) return 'tram';
  if (v.isPolice && !v._commandeered && v.model && v.model.name !== 'bus') return 'police';
  if (v.isTaxi) return 'taxi';
  const n = v.model && v.model.name;
  return n || null;
}

// De deuren van dit voertuig: [] bij een model zonder logische deur of een onbekend model.
export function doorsFor(v) {
  const n = nameOf(v);
  if (!n || GEEN_DEUR.includes(n)) return [];
  if (DEUR_DEFS[n]) return DEUR_DEFS[n];
  return v && v.isBus ? DEUR_DEFS.bus : [];
}

// Welke deur hoort bij deze stoel (rol 'bestuurder' | 'bijrijder' | 'achter'); wie een
// deur mist (los) kiest een buurdeur aan dezelfde kant, daarna de andere kant: instappen
// gaat dan via de opening. null als het voertuig geen deuren heeft.
export function deurVoorRol(defs, rol, state = null, voorkeurSide = 0) {
  if (!defs.length) return null;
  const heel = (d) => !(state && state.loose && state.loose[d.id]);
  const op = (d) => d.seat === rol || (rol === 'achter' && d.seat === 'bijrijder');
  const exact = defs.filter((d) => d.seat === rol);
  const kandidaten = exact.length ? exact : defs.filter(op);
  const pick = (list) => (voorkeurSide ? list.find((d) => d.side === voorkeurSide) : null) || list[0];
  const goed = kandidaten.filter(heel);
  if (goed.length) return pick(goed);
  // los: de opening van de eigen deur blijft de weg erin
  return pick(kandidaten.length ? kandidaten : defs);
}

export function makeDoorState() {
  return { open: {}, want: {}, loose: {}, hold: {}, dmg: {} };
}

export function ensureDoors(v) {
  if (!v.doors) v.doors = makeDoorState();
  return v.doors;
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Vraagt deur id open (1) of dicht (0). Een losse deur blijft weg.
export function wantDoor(state, id, open, holdTime = 0) {
  if (state.loose[id]) return;
  state.want[id] = open ? 1 : 0;
  if (open && holdTime > 0) state.hold[id] = holdTime;
}

// Eén stap: deuren schuiven/zwaaien naar hun doel. Een bewegend voertuig slaat open
// deuren dicht (geen deur die zwaaiend meerijdt); een wrak of zinkend voertuig ook niet:
// die staan zoals ze stonden. Geeft true zolang er iets beweegt (dan hoeft het mesh bij).
export function stepDoors(state, dt, { speed = 0, wrecked = false } = {}) {
  let moving = false;
  const slam = !wrecked && Math.abs(speed) > DEUR_SLAM_SNELHEID;
  for (const id of Object.keys(state.want)) {
    if (state.hold[id] > 0) {
      state.hold[id] -= dt;
      if (state.hold[id] <= 0) { delete state.hold[id]; state.want[id] = 0; }
    }
    const target = slam ? 0 : state.want[id];
    const cur = state.open[id] || 0;
    if (cur === target) { if (!target && !state.dmg[id]) { delete state.want[id]; delete state.open[id]; } continue; }
    const k = (slam ? 3 : 1) * dt / DEUR_OPEN_TIJD;
    state.open[id] = clamp01(cur + (target > cur ? k : -k));
    if (Math.abs(state.open[id] - target) < 1e-4) state.open[id] = target;
    moving = true;
  }
  return moving;
}

// Deurhoek in radialen voor een scharnierdeur bij stand 0..1; schuifdeuren geven meters.
export function deurStand(def, open, dmg = null) {
  const o = clamp01(open || 0);
  const e = o * o * (3 - 2 * o);
  if (def.soort === 'schuif') return e * (def.w * 0.95);
  if (def.soort === 'achterdeur') return Math.max(dmg === 'scheef' ? 0.3 : 0, e * 1.6);
  if (def.soort === 'kap' || def.soort === 'klep') return Math.max(dmg === 'scheef' ? 0.22 : 0, e * 1.0); // scheef: staat op een kier
  const max = def.soort === 'achterscharnier' ? 1.25 : 1.05;
  const scheef = dmg === 'scheef' ? 0.14 : 0; // een scheve deur sluit niet meer helemaal
  return Math.max(scheef, e * max);
}

// --- timing van in- en uitstappen ---------------------------------------------------
// Sluit aan op seating3d.js trackSeat/drawTransition: a = { kind: 'enter'|'exit', t, walkT, sitT, jack }.
// Geeft 1 (deur open) of 0 (dicht) voor de deur van de stoel. Bij enter opent de deur
// als de speler er bijna is, en sluit hij als die zit; bij exit opent hij direct.
export function deurDoelVoorAnim(a) {
  if (!a) return 0;
  const walk = a.walkT || 0, sit = a.sitT || 0, yank = a.jack ? 0.25 : 0;
  if (a.kind === 'enter') {
    return a.t >= Math.max(0, walk - 0.12) && a.t < walk + yank + sit * 0.8 ? 1 : 0;
  }
  return a.t < sit + (a.walkT || 0.2) * 0.4 ? 1 : 0;
}

// Totale duur van een in- of uitstap in s (speler: rond 0,4-0,7; haast = kort).
export const STAP_MIN = 0.4;
export const STAP_MAX = 0.7;
export const STAP_HAAST = 0.18;

export function stapDuur({ afstand = 0, soort = 'auto', haast = false, jack = false } = {}) {
  if (haast) return STAP_HAAST;
  const zit = soort === 'boot' ? 0.5 : soort === 'fiets' ? 0.34 : 0.42;
  const loop = Math.min(0.4, Math.max(0.1, afstand / 4.5));
  const t = loop + zit + (jack ? 0.25 : 0);
  return Math.min(STAP_MAX + (jack ? 0.25 : 0), Math.max(STAP_MIN, t));
}

// Moet de animatie meteen stoppen (en de deur dicht)? reden voor tests en logging.
// ctx: { speed, wrecked, schade (klap tijdens het stappen), wanted (agent in aanval), geblokkeerd, haast }
export function stapOnderbreking(a, ctx = {}) {
  if (!a) return null;
  if (ctx.wrecked) return 'wrak';
  if (ctx.haast) return 'haast';
  if (ctx.schade) return 'schade';
  if (ctx.wanted) return 'wanted';
  if (a.kind === 'enter' && Math.abs(ctx.speed || 0) > 0.8) return 'rijdt';
  if (ctx.geblokkeerd && a.t > 0.35) return 'vast'; // loop tegen een muur of auto: niet blijven hangen
  return null;
}

// --- schade ----------------------------------------------------------------------------
// Staat van elke deur uit het klaplogboek v.dentLog ([lx, lz, sterkte]): een klap op de
// flank bij de deur maakt hem scheef, een zware klap laat hem los. v.doors.loose onthoudt
// losse deuren (die komen niet vanzelf terug).
export function deurSchade(defs, dentLog, len, wid) {
  const out = {};
  if (!Array.isArray(dentLog)) return out;
  for (const d of defs) {
    let s = 0;
    if (d.side === 0) {
      // kap en kofferbak: de klapsterkte in de zone (voor/achter)
      s = zoneTotals(dentLog, len, wid)[d.zone];
      if (s >= (d.losAt ?? LOS_VANAF)) out[d.id] = 'los';
      else if (s >= (d.scheefAt ?? SCHEEF_VANAF)) out[d.id] = 'scheef';
      continue;
    }
    for (const e of dentLog) {
      if (!Array.isArray(e) || !Number.isFinite(e[0]) || !Number.isFinite(e[1])) continue;
      const zijde = Math.abs(e[1]) > wid * 0.25 ? Math.sign(e[1]) : 0;
      if (zijde !== d.side) continue;
      const dx = Math.abs(e[0] - d.x * len);
      if (dx > d.w * 0.9 + 0.2) continue;
      s += Number.isFinite(e[2]) ? Math.max(0, e[2]) : 0;
    }
    if (s >= LOS_VANAF) out[d.id] = 'los';
    else if (s >= SCHEEF_VANAF) out[d.id] = 'scheef';
  }
  return out;
}

// Prijs in de garage voor alle losse delen van dit voertuig.
export function deelPrijs(v) {
  const st = v && v.doors;
  if (!st || !st.loose) return 0;
  let p = 0;
  for (const id of Object.keys(st.loose)) p += id === 'kap' ? DEEL_PRIJS.kap : id === 'klep' ? DEEL_PRIJS.klep : DEEL_PRIJS.deur;
  return p;
}

// Werkt v.doors bij met de schade. Geeft de deuren die nu net losgingen ([id]) terug,
// met een maximum aan losse deuren in de wereld (teller: { n }) tegen rommel op straat.
export function reconcileDoors(v, defs, wereld = { n: 0 }) {
  const st = ensureDoors(v);
  if (!defs.length) return [];
  const log = v.dentLog || [];
  if (!log.length && !v.wrecked) {
    // gerepareerd: alles terug
    wereld.n = Math.max(0, wereld.n - Object.keys(st.loose).length);
    st.loose = {}; st.dmg = {};
    return [];
  }
  const dmg = deurSchade(defs, log, v.model.len, v.model.wid);
  const nieuw = [];
  st.dmg = {};
  for (const id of Object.keys(dmg)) {
    if (dmg[id] === 'los' && !st.loose[id]) {
      if (wereld.n >= MAX_LOSSE_DEUREN) { st.dmg[id] = 'scheef'; continue; }
      st.loose[id] = true; wereld.n++; nieuw.push(id);
      delete st.open[id]; delete st.want[id];
    } else if (dmg[id] === 'scheef') st.dmg[id] = 'scheef';
  }
  return nieuw;
}

// Een bus (of tram) staat bij een halte met deuren open als hij stilstaat.
export const stilstandDeurOpen = (v) => !!v && (v.isBus || v.isTram || v.isTrain) && Math.abs(v.speed || 0) < 0.3 && !v.wrecked;

// De bestuurdersdeur zwaait open als de bestuurder uit zijn auto stapt of wordt getrokken
// (#49, pedestrians.js ejectDriver). Geeft de deur-id, of null zonder logische deur.
export function openDriverDoor(v, hold = 2.5) {
  const defs = doorsFor(v);
  if (!defs.length) return null;
  const st = ensureDoors(v);
  const d = deurVoorRol(defs, 'bestuurder', st, -1);
  if (!d) return null;
  wantDoor(st, d.id, true, hold);
  return d.id;
}
