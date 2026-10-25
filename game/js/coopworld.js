// Samen spelen (#95): de wereld van de host delen met de gasten. Pure logica: welke
// voertuigen, welk missiedoel en welke opdracht gaan in de snapshot, en hoe zet een gast
// dat om in iets wat hij kan tekenen. Alleen wat dicht bij de spelers is, gaat mee
// (interest management); verkeer ver weg en weer blijven lokaal.
//
// Entiteiten in de snapshot (net/codec.js: id u16, soort u8, x, z, hoek):
//   soort 0 tot 11: voertuigen (VOERTUIG_SOORTEN); soort 12: een voetganger, 13: een agent te voet (alleen dichtbij);
//   soort 100: het doel van de huidige opdracht.
// Een voertuig draagt zijn dynamische staat (vlaggen, snelheid, sturen, hoogte, rotor) in elke snapshot en zijn
// uiterlijk (model, kleur, schade) als 'look' die roulerend meegaat (#428, net/codec.js): de gast tekent het
// echte model met dezelfde bouwer als de host. Zonder look tekent hij eerst een gokmodel van dezelfde soort
// (gokUiterlijk); een blok in VOERTUIG_MATEN is alleen de laatste terugval als ook die bouwer faalt.
import { BOAT_KINDS } from './boattypes.js';
import { VEH_KINDS, MAX_LOOKS, FL_SIREN, FL_HORN, FL_FLAT } from './net/codec.js';

export const VOERTUIG_SOORTEN = ['auto', 'bakkie', 'bus', 'politie', 'motor', 'scooter', 'fiets', 'boot', 'heli', 'trein', 'vracht', 'overig'];
export const SOORT_DOEL = 100;
export const SOORT_START = 101, ID_START0 = 0xff00, START_RADIUS = 350; // het beginpunt van de volgende opdracht van wie het spel opende (id = ID_START0 + het nummer van de opdracht), voor de gasten (#434)
export const SOORT_VOETGANGER = 12, SOORT_AGENT = 13;
export const SOORT_TREIN = 9, ID_TREIN0 = 0x7000; // een trein: id = ID_TREIN0 + het nummer van de route (de gast heeft dezelfde routes uit de wereld)
export const RADIUS_VOETGANGER = 70; // m rond elke speler: verder weg zijn de voetgangers van de host toch maar stippen
export const MAX_VOETGANGERS = 20;
export const ID_DOEL = 0xfffe;
export const RADIUS = 150;      // m rond elke speler
export const TREIN_RADIUS = 450; // m rond elke speler: een trein rijdt tot 40 m/s, de gast ziet hem dan ruim voor hij langskomt (#434)
export const MAX_ENTITEITEN = 60;
const PED_ID0 = 0x8000; // voetgangers hebben geen vast id in het spel: ze krijgen er hier een (apart van de voertuig-id's)
const pedIds = new WeakMap(); let pedSeq = 0;
export const pedId = (p) => { let id = pedIds.get(p); if (id == null) { id = PED_ID0 + (pedSeq++ % 0x7ff0); pedIds.set(p, id); } return id; };

// lengte, breedte, hoogte (m) en kleur van het blok waarmee een gast een voertuig tekent
export const VOERTUIG_MATEN = {
  auto: [4.2, 1.8, 1.4, '#9aa3ad'], bakkie: [5.0, 1.9, 1.8, '#c8c0a8'], bus: [11, 2.5, 3.0, '#d9b84a'], politie: [4.4, 1.8, 1.5, '#2d4a8a'],
  motor: [2.1, 0.8, 1.2, '#444'], scooter: [1.8, 0.7, 1.1, '#e0e0e0'], fiets: [1.8, 0.6, 1.1, '#2e6a9e'], boot: [6, 2, 1.2, '#e8e3d6'],
  heli: [9, 2.4, 3, '#b0b0b0'], trein: [20, 3, 3.5, '#d0d0d0'], vracht: [9, 2.5, 3.4, '#8a7a5a'], overig: [4, 1.8, 1.5, '#888'],
};

// Wie van de voetgangers gaat mee: dichtbij, plus wie ertoe doet (een opdracht, een baan, een wapen, een gevecht, een gesprek, een gevallen of dode)
// tot BELANGRIJK_RADIUS. Zowel de snapshot (hier) als het EXTRA-bericht (coopextra.js) gebruiken dit, zodat de id's kloppen.
export const BELANGRIJK_RADIUS = 110;
export const belangrijkePed = (p, now) => !!(p.missionCrowd || p.jobPed || p.scripted || p.heldWeapon || p.attackFx || (p.speechText && now < p.speechUntil) || p.state === 'dead' || p.ragdoll);
export function kiesVoetgangers(world, bij, { radius = RADIUS_VOETGANGER, max = MAX_VOETGANGERS } = {}) {
  const now = Number.isFinite(world.time) ? world.time : 0;
  const lijst = [];
  for (const p of world.pedestrians || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.gibbed || p.hideMesh || (p.health <= 0 && p.state !== 'dead')) continue;
    let d = Infinity;
    for (const b of bij) d = Math.min(d, Math.hypot(p.x - b.x, p.y - b.y));
    const belangrijk = belangrijkePed(p, now);
    if (d <= radius || (belangrijk && d <= BELANGRIJK_RADIUS)) lijst.push({ d: belangrijk ? d - 60 : d, p });
  }
  lijst.sort((a, b) => a.d - b.d);
  return lijst.slice(0, max);
}

export const voertuigId = (v, i) => (Number.isInteger(v.id) ? vid(v, i) : null); // het id dat een voertuig in de snapshot heeft (null: geen vast id)
const vid = (v, i) => { const id = (Number.isInteger(v.id) ? v.id : i) & 0xffff; return id === ID_DOEL ? 0xfffd : id; };

export function voertuigSoort(v) {
  if (v.isBus) return VOERTUIG_SOORTEN.indexOf('bus');
  if (v.isPolice) return VOERTUIG_SOORTEN.indexOf('politie');
  if (v.isHeli) return VOERTUIG_SOORTEN.indexOf('heli');
  if (v.isPlane) return VOERTUIG_SOORTEN.indexOf('overig');
  if (v.isBoat) return VOERTUIG_SOORTEN.indexOf('boot');
  if (v.isScooter) return VOERTUIG_SOORTEN.indexOf('scooter');
  if (v.isBike) return VOERTUIG_SOORTEN.indexOf(v.model && v.model.motorbike ? 'motor' : 'fiets');
  if (v.model && v.model.len > 7) return VOERTUIG_SOORTEN.indexOf('vracht');
  if (v.model && v.model.len > 4.6) return VOERTUIG_SOORTEN.indexOf('bakkie');
  return VOERTUIG_SOORTEN.indexOf('auto');
}

// Spelers uit elkaar (#429): spelers dichter dan SAMEN_M bij elkaar vormen een groep. Staan er meer groepen, dan krijgt elke groep een eerlijk deel
// van het budget (om en om, nabije eerst) en vult een drukke groep het snapshot niet alleen. Een groep: de volgorde blijft zoals ze was.
export const SAMEN_M = 150;
export function groepenVan(bij) {
  const reps = [], van = [];
  for (const b of bij) {
    let k = reps.findIndex((r) => Math.hypot(r.x - b.x, r.y - b.y) <= SAMEN_M);
    if (k < 0) { reps.push(b); k = reps.length - 1; }
    van.push(k);
  }
  return { n: reps.length, van };
}
const dichtsteGroep = (bij, groepen, x, y) => { let bd = Infinity, bk = 0; for (let i = 0; i < bij.length; i++) { const d = Math.hypot(x - bij[i].x, y - bij[i].y); if (d < bd) { bd = d; bk = groepen.van[i]; } } return bk; };
function verweef(items, bij, groepen) {
  if (groepen.n < 2) return items;
  const rijen = Array.from({ length: groepen.n }, () => []);
  for (const it of items) rijen[dichtsteGroep(bij, groepen, it.v ? it.v.x : it.p.x, it.v ? it.v.y : it.p.y)].push(it); // items zijn al nabije eerst
  const uit = [];
  for (let k = 0; uit.length < items.length; k++) for (const r of rijen) if (k < r.length) uit.push(r[k]);
  return uit;
}

// Alleen boten en schepen krijgen extra bereik (halve lengte, hoogstens 100 m): een binnenvaartschip of zeeschip is tientallen meters lang.
const halveLengte = (v) => (v.isBoat && v.model && Number.isFinite(v.model.len) ? Math.min(100, v.model.len / 2) : 0);

// Voertuigen dicht bij een van de spelers (nabije eerst), plus het doel van de lopende opdracht.
// bij = [{x, y}] (de lichamen van alle spelers). Geeft hoogstens MAX_ENTITEITEN entiteiten.
export function verzamelEntiteiten(world, bij, { radius = RADIUS, max = MAX_ENTITEITEN, treinen = world.treinen } = {}) {
  const out = [];
  const m = world.mission;
  if (m && m.phase === 'active' && m.marker && Number.isFinite(m.marker.x) && Number.isFinite(m.marker.y)) {
    out.push({ id: ID_DOEL, kind: SOORT_DOEL, x: m.marker.x, z: m.marker.y, angle: 0 });
  }
  else if (m && m.phase === 'idle' && m.marker && Number.isFinite(m.marker.x) && Number.isFinite(m.marker.y) && bij.some((p) => Math.hypot(m.marker.x - p.x, m.marker.y - p.y) <= START_RADIUS)) {
    out.push({ id: ID_START0 + Math.min(250, Math.max(0, m.index | 0)), kind: SOORT_START, x: m.marker.x, z: m.marker.y, angle: 0 }); // een gast ziet waar de volgende opdracht begint (#434)
  }
  // treinen: [{ id: routenummer, x, y, v: snelheid met teken, halfLen }] van de host (coopnet.js); een trein in de buurt gaat voor
  for (const t of treinen || []) {
    if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;
    let d = Infinity;
    for (const p of bij) d = Math.min(d, Math.hypot(t.x - p.x, t.y - p.y));
    if (d <= Math.max(radius, TREIN_RADIUS) + (t.halfLen || 0) && out.length < max - 12) out.push({ id: ID_TREIN0 + t.id, kind: SOORT_TREIN, x: t.x, z: t.y, angle: 0, speed: t.v || 0, fl: 0, steer: 0, vz: 0 });
  }
  const near = [];
  for (const v of world.vehicles || []) {
    if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.wrecked) continue;
    let d = Infinity;
    for (const p of bij) d = Math.min(d, Math.hypot(v.x - p.x, v.y - p.y));
    if (d <= radius + halveLengte(v)) near.push({ d, v }); // een groot schip telt vanaf zijn romp, niet vanaf zijn midden: anders verdwijnt het bij de gast (#434)
  }
  near.sort((a, b) => a.d - b.d);
  const groepen = groepenVan(bij), nearV = verweef(near, bij, groepen);
  const pedsV = verweef(kiesVoetgangers(world, bij), bij, groepen);
  const nPed = Math.min(pedsV.length, MAX_VOETGANGERS, Math.max(0, max - out.length - 12)); // voertuigen houden minstens 12 plekken
  for (const { v } of nearV) {
    if (out.length >= max - nPed) break;
    out.push({ id: vid(v, out.length), kind: voertuigSoort(v), x: v.x, z: v.y, angle: v.angle || 0, ...voertuigStaat(v, world), _v: v });
  }
  for (const { p } of pedsV.slice(0, nPed)) out.push({ id: pedId(p), kind: p.isCop ? SOORT_AGENT : SOORT_VOETGANGER, x: p.x, z: p.y, angle: p.angle || 0 });
  const looks = kiesUiterlijken(world, out);
  for (const e of out) delete e._v;
  Object.defineProperty(out, 'looks', { value: looks, enumerable: false }); // voor de snapshot (coopnet.js): de uiterlijkrecords van dit moment
  return out;
}

// ----------------------------------------------------------- staat en uiterlijk van een voertuig (#428)
export const VOERTUIG_MODELLEN = ['hatch', 'sedan', 'wagon', 'van', 'sport', 'suv', 'truck', 'tractor', 'quad', 'foodtruck', 'trekkerlimo', 'taxi', 'cashvan', 'escort', 'police', 'bus', 'midibus', 'bike', 'scooter', 'boat', 'heli', 'plane', 'motor']; // alleen achteraan aanvullen
export const BOOT_SOORTEN = Object.keys(BOAT_KINDS); // idem: de volgorde in boattypes.js is de code
const UV = { police: 1, bus: 2, bike: 4, scooter: 8, boat: 16, heli: 32, plane: 64, ambulance: 128, taxi: 256, hero: 512, fat: 1024, moped: 2048, rusty: 4096, electric: 8192, tokkie: 16384, tank: 32768 };
const MOTOR_VARIANTEN = ['', 'sport', 'naked', 'old'];
const hexGetal = (c, terug) => {
  if (typeof c === 'number' && Number.isFinite(c)) return c & 0xffffff;
  if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return parseInt(c.slice(1), 16);
  if (typeof c === 'string' && /^#[0-9a-f]{3}$/i.test(c)) return parseInt(c[1] + c[1] + c[2] + c[2] + c[3] + c[3], 16);
  return terug;
};
const hexTekst = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');

// Vlaggen, snelheid, sturen, hoogte en rotor van dit moment (de dynamische staat in elke snapshot)
export function voertuigStaat(v, world = {}) {
  const ind = v.indicator === 'left' ? 1 : v.indicator === 'right' ? 2 : v.indicator === 'hazard' ? 3 : 0;
  const siren = !!v.sirenOn || (!!v.isPolice && (world.wanted | 0) > 0 && v.driver !== 'player' && !v.hijacked);
  const fl = ind | (siren && !v.wrecked ? FL_SIREN : 0) | (v.horn ? FL_HORN : 0) | (v.flat ? FL_FLAT : 0);
  const st = { fl, speed: Number(v.speed) || 0, steer: Number(v.steer) || 0, vz: Number(v.z) || 0 };
  if (v.isHeli) st.rotor = v.rotor || 0;
  return st;
}

// Het uiterlijk van een voertuig als record voor de codec
export function voertuigUiterlijk(v, id) {
  const m = v.model || {};
  let fl = 0;
  if (v.isPolice) fl |= UV.police;
  if (v.isBus) fl |= UV.bus;
  if (v.isBike) fl |= UV.bike;
  if (v.isScooter) fl |= UV.scooter;
  if (v.isBoat) fl |= UV.boat;
  if (v.isHeli) fl |= UV.heli;
  if (v.isPlane) fl |= UV.plane;
  if (v.isAmbulance) fl |= UV.ambulance;
  if (v.isTaxi) fl |= UV.taxi;
  if (v.isHeroCar) fl |= UV.hero;
  if (m.fat) fl |= UV.fat;
  if (m.moped) fl |= UV.moped;
  if (m.rusty) fl |= UV.rusty;
  if (m.electric) fl |= UV.electric;
  if (m.tokkie) fl |= UV.tokkie;
  if (m.tank) fl |= UV.tank;
  let model = VOERTUIG_MODELLEN.indexOf(m.name);
  if (model < 0) model = VOERTUIG_MODELLEN.indexOf(v.isBoat ? 'boat' : v.isHeli ? 'heli' : v.isPlane ? 'plane' : v.isBike ? 'bike' : v.isScooter ? 'scooter' : 'hatch');
  let extra = 0;
  if (v.isBoat) {
    const k = BOOT_SOORTEN.findIndex((key) => { const b = BOAT_KINDS[key]; return b.kind === m.kind && (b.soort || '') === (m.soort || '') && !!b.zeil === !!m.zeil; });
    extra = Math.max(0, k);
  } else if (m.motorbike) extra = Math.max(1, MOTOR_VARIANTEN.indexOf(m.motorbike));
  const terug = v.isHeli ? 0xc23b2e : v.isBoat ? 0xe8e6e0 : 0x9aa3ad;
  const kleur2 = v.isBoat ? m.cabin : v.isBus ? m.stripe : (v.isBike || v.isScooter) ? m.rider : null;
  const dents = !v.isBoat && Array.isArray(v.dentLog) ? v.dentLog.slice(-8).map((d) => [+d[0] || 0, +d[1] || 0, +d[2] || 0]) : [];
  return { id, model, fl, len: m.len || 4, wid: m.wid || 1.8, color: hexGetal(m.color, terug), color2: hexGetal(kleur2, 0x2f3a44), extra, dents };
}

// Welke uiterlijkrecords gaan nu mee? Nieuwe voertuigen eerst (twee keer, tegen verlies), anders roulerend een paar,
// zodat een wijziging (schade, lak) binnen een paar seconden bij de gast is en 60 voertuigen in één pakket passen.
const LOOKSTAAT = new WeakMap();
export function kiesUiterlijken(world, ents, { nieuw = MAX_LOOKS, rond = 2 } = {}) {
  let st = LOOKSTAAT.get(world);
  if (!st) { st = { bekend: new Set(), nog: new Map(), cursor: 0 }; LOOKSTAAT.set(world, st); }
  const veh = ents.filter((e) => e.kind < VEH_KINDS && e.kind !== SOORT_TREIN && e._v);
  const nu = new Set(veh.map((e) => e.id));
  for (const e of veh) if (!st.bekend.has(e.id)) st.nog.set(e.id, 2);
  for (const id of [...st.nog.keys()]) if (!nu.has(id)) st.nog.delete(id);
  st.bekend = nu;
  const gekozen = [];
  const neem = (e) => { if (gekozen.length < MAX_LOOKS && !gekozen.includes(e)) gekozen.push(e); };
  let n = 0;
  for (const e of veh) {
    if (!st.nog.has(e.id) || n >= nieuw) continue;
    neem(e); n++;
    const r = st.nog.get(e.id) - 1;
    if (r > 0) st.nog.set(e.id, r); else st.nog.delete(e.id);
  }
  for (let k = 0; k < rond && veh.length; k++) { neem(veh[st.cursor % veh.length]); st.cursor++; }
  return gekozen.map((e) => voertuigUiterlijk(e._v, e.id));
}

// De gast: van een look naar het voertuigobject dat buildVehicleMesh (models3d_vehicles.js) bouwt. null bij onzin.
export function uiterlijkSpec(look) {
  if (!look || !(look.model >= 0)) return null;
  const naam = VOERTUIG_MODELLEN[look.model] || 'hatch';
  const f = look.fl | 0;
  const pv = { id: look.id, wrecked: false, health: 100 };
  const model = { name: naam, len: Math.max(0.5, look.len), wid: Math.max(0.3, look.wid), color: hexTekst(look.color) };
  if (f & UV.police) pv.isPolice = true;
  if (f & UV.bus) pv.isBus = true;
  if (f & UV.bike) pv.isBike = true;
  if (f & UV.scooter) pv.isScooter = true;
  if (f & UV.boat) {
    pv.isBoat = true;
    const b = BOAT_KINDS[BOOT_SOORTEN[look.extra]] || BOAT_KINDS.sloep;
    Object.assign(model, b, { name: 'boat', len: model.len, wid: model.wid, color: model.color });
    if (b.cabin !== undefined) model.cabin = hexTekst(look.color2);
  }
  if (f & UV.heli) pv.isHeli = true;
  if (f & UV.plane) pv.isPlane = true;
  if (f & UV.ambulance) pv.isAmbulance = true;
  if (f & UV.taxi) pv.isTaxi = true;
  if (f & UV.hero) pv.isHeroCar = true;
  if (f & UV.fat) model.fat = true;
  if (f & UV.moped) model.moped = true;
  if (f & UV.rusty) model.rusty = true;
  if (f & UV.electric) model.electric = true;
  if (f & UV.tokkie) model.tokkie = true;
  if (f & UV.tank) model.tank = true;
  if (pv.isBus) { model.stripe = hexTekst(look.color2); if (naam === 'bus') model.trailer = 6.8; }
  if (pv.isBike || pv.isScooter) { model.rider = hexTekst(look.color2); if (look.extra > 0 && look.extra < MOTOR_VARIANTEN.length) model.motorbike = MOTOR_VARIANTEN[look.extra]; }
  if (Array.isArray(look.dents) && look.dents.length) pv.dentLog = look.dents.map((d) => d.slice());
  pv.model = model;
  return pv;
}

// De terugval zolang het uiterlijk nog niet bij de gast is (#428): het echte model van de soort, met een vaste variatie op
// het id. Boten, heli's en vliegtuigen krijgen zo meteen een echt model in plaats van een blok (een boot een romp die bij
// zijn maat past, gokBoot). Een trein niet: die tekent de gast uit zijn eigen spoorwegen (railway3d.js), niet uit de
// snapshot. null = geen gok (de gast wacht of tekent niets).
export const GOK_MODELLEN = ['hatch', 'sedan', 'wagon', 'suv', 'sport'];
export const GOK_KLEUREN = ['#9aa3ad', '#b33a3a', '#2f5f9a', '#e8e6e0', '#3d7a52', '#c9a227', '#222428'];
const GOK_HEX = /^#[0-9a-f]{6}$/i;
// Een boot zonder uiterlijk krijgt een romp die bij zijn maat past (#428): tot 12 m een sloep, tot 60 m een binnenvaartschip,
// daarboven een zeeschip. Zo is een schip van 98 m geen opgerekte sloep; zodra het echte uiterlijk binnen is, neemt dat het over.
export const GOK_BOOT_M = [12, 60];
export const gokBoot = (len) => (len >= GOK_BOOT_M[1] ? 'zeeVracht' : len >= GOK_BOOT_M[0] ? 'spits' : 'sloep');
export function gokUiterlijk(soort, id = 0, { len, wid, kleur } = {}) {
  const maat = VOERTUIG_MATEN[soort];
  if (!maat || soort === 'trein') return null; // geen trein als voertuig: die komt uit de eigen routes
  const h = ((id | 0) * 2654435761) >>> 0;
  const bijkleur = GOK_KLEUREN[(h >>> 8) % GOK_KLEUREN.length];
  const pv = { id, wrecked: false, health: 100 };
  const model = { name: 'hatch', len: Number(len) || maat[0], wid: Number(wid) || maat[1], color: typeof kleur === 'string' && GOK_HEX.test(kleur) ? kleur : bijkleur };
  switch (soort) {
    case 'auto': model.name = GOK_MODELLEN[h % GOK_MODELLEN.length]; break;
    case 'bakkie': model.name = 'van'; break;
    case 'politie': pv.isPolice = true; model.name = 'wagon'; break;
    case 'bus': pv.isBus = true; model.name = 'bus'; model.stripe = bijkleur; break;
    case 'vracht': model.name = 'truck'; break;
    case 'fiets': pv.isBike = true; model.name = 'bike'; model.rider = bijkleur; break;
    case 'scooter': pv.isScooter = true; model.name = 'scooter'; model.rider = bijkleur; break;
    case 'motor': pv.isScooter = true; model.name = 'scooter'; model.motorbike = true; model.rider = bijkleur; break;
    case 'boot': { // een romp die bij de maat uit de snapshot past: een sloep, een binnenvaartschip of een zeeschip
      const b = BOAT_KINDS[gokBoot(model.len)] || BOAT_KINDS.sloep;
      pv.isBoat = true;
      Object.assign(model, b, { name: 'boat', len: model.len, wid: model.wid, color: model.color });
      if (b.cabin !== undefined) model.cabin = bijkleur;
      break;
    }
    case 'heli': pv.isHeli = true; model.name = 'heli'; break;
    case 'overig': pv.isPlane = true; model.name = 'plane'; break;
  }
  pv.model = model;
  return pv;
}

// ----------------------------------------------------------- wat de gast nog zelf invult (#428)
// Wat een gast zelf invult omdat het niet in de snapshot of het EXTRA-bericht past. Positie, soort, staat en uiterlijk
// komen altijd van de host; hier staat alleen beeld, beweging of geluid dat daaruit volgt. De test
// (scripts/coopworld_test.mjs) houdt deze lijst bij de code: elk punt noemt zijn bron, het stuk code dat het invult en de
// test die het dekt, zodat de inventaris niet veroudert. Een nieuw lokaal verzonnen stuk hoort hier bij te komen.
export const LOKAAL_VERZONNEN = [
  { wat: 'deining van een boot', waar: 'beeld', bron: 'coopentities3d.js', code: 'deiningBoot', test: 'coop434_test.mjs', waarom: 'de golfstand past niet in de snapshot; de gast deint per id en tijd op dezelfde manier (coopboot.js)' },
  { wat: 'een groot schip dat de snapshot verlaat vaart nog even door', waar: 'beweging', bron: 'coopentities3d.js', code: 'bootBlijft', test: 'coop434_test.mjs', waarom: 'de host noemt een ver schip niet elke snapshot; de gast laat het op zijn laatste koers doorvaren in plaats van het te laten springen (coopboot.js)' },
  { wat: 'de valrichting van een kapot object', waar: 'beeld', bron: 'coopextra3d.js', code: 'syncGastKapot', test: 'coopextra_test.mjs', waarom: 'EXTRA stuurt de sleutel en de plek van een kapot object, niet de richting waarin het omviel' },
  { wat: 'de lampstand van een verkeerslicht tussen twee berichten', waar: 'beeld', bron: 'coopextra3d.js', code: 'lichtVerschil', test: 'coopextra_test.mjs', waarom: 'de gast laat de klok van wie het spel opende zelf doorlopen en corrigeert pas boven 0,4 s (coopextra.js lichtVerschil)' },
  { wat: 'de vleugelslag en het banken van een vogel', waar: 'beweging', bron: 'coopextra3d.js', code: 'animateWildlifeMesh3D', test: 'coopextra_test.mjs', waarom: 'de hoogte gaat mee in de aux van het dier, de animatiefase rekent de gast zelf uit (wildlife.js)' },
  { wat: 'de loopfase van een voetganger', waar: 'beweging', bron: 'coopextra3d.js', code: 'animatePersonWalk', test: 'coopextra_test.mjs', waarom: 'de snelheid gaat mee, de stand van armen en benen rekent de gast zelf uit (models3d_people.js)' },
  { wat: 'het achterover vallen en blijven liggen van een dode of omgevallen voetganger', waar: 'beeld', bron: 'coopextra3d.js', code: 'V_LIGT', test: 'coopextra_test.mjs', waarom: 'EXTRA stuurt de vlag; de val, de hoek en hoe lang hij er ligt rekent de gast zelf uit (scene3d.js doet hetzelfde)' },
  { wat: 'de zwaai van een groet en de dans van een feest', waar: 'beweging', bron: 'coopextra3d.js', code: 'waveOverlay', test: 'coopextra_test.mjs', waarom: 'de vlaggen V_GROET en V_FEEST gaan mee, de beweging zelf rekent de gast uit (vrijgezellen.js juichHoek)' },
  { wat: 'de richting van een klap die aankomt', waar: 'beweging', bron: 'coopextra3d.js', code: 'applyHitReaction', test: 'coopextra_test.mjs', waarom: 'EXTRA stuurt alleen de vlag V_GERAAKT; de gast laat de geraakte persoon vanaf de hostrichting wegdeinen' },
  { wat: 'de stand van een wapen en de slag', waar: 'beweging', bron: 'coopextra3d.js', code: 'applyAttackPose', test: 'coopextra_test.mjs', waarom: 'wapen, soort slag en swing gaan mee in MISC_PEDS; het beeld van de zwaai rekent de gast zelf uit (models3d_people.js)' },
  { wat: 'het model van een voertuig zonder uiterlijk', waar: 'beeld', bron: 'coopentities3d.js', code: 'gokUiterlijk', test: 'coopworld_test.mjs', waarom: 'tot het uiterlijk binnen is gokt de gast op de soort en het id (gokUiterlijk): altijd een echt model, nooit een blok' },
  { wat: 'de draaisnelheid van de wielen als de host geen snelheid meldt', waar: 'beweging', bron: 'coopentities3d.js', code: 'tekensnelheid', test: 'coopworld_test.mjs', waarom: 'een auto die een script verzet heeft geen snelheid; de gast leidt de draai af uit de verplaatsing sinds zijn vorige beeld, net als scene3d.js' },
  { wat: 'de hoek van de achterkant van een gelede bus', waar: 'beweging', bron: 'coopentities3d.js', code: 'animeerVoertuig', test: 'coopworld_test.mjs', waarom: 'de snapshot stuurt het midden en de richting; de gast laat de achterkant met een eigen vertraging volgen (setBusRearAngle)' },
  { wat: 'de flits en de kogelstreep van een schot van een andere speler', waar: 'beeld', bron: 'coopentities3d.js', code: 'syncSchoten', test: 'coopworld_test.mjs', waarom: 'de aanval gaat als code mee; het korte beeld ervan (0,12 s) rekent de gast zelf uit (coopwapen.js nieuwSchot)' },
  { wat: 'de wagonindeling van een trein', waar: 'beeld', bron: 'railway.js', code: 'placeCars', test: 'coop434_test.mjs', waarom: 'de snapshot stuurt het midden en de snelheid; model en wagons horen bij de route uit de wereld van de gast' },
  { wat: 'de kermisattributen en de stuntavond-animatie', waar: 'beweging', bron: 'coopextra3d.js', code: 'KERMIS', test: 'coopextra_test.mjs', waarom: 'EXTRA stuurt of de kermis staat en welke rekwisieten er zijn; de gast laat ze met dezelfde klok draaien (kermis.js)' },
  { wat: 'toeter en sirene als geluid', waar: 'geluid', bron: 'coopentities3d.js', code: 'coopHoornDbg', test: 'coop434_test.mjs', waarom: 'de vlaggen gaan mee, het geluid maakt de gast zelf met de bestaande geluiden (audio.js)' },
];

// Wat een gast met de entiteiten doet: voertuigen tekenen, het doel aangeven.
export function leesEntiteiten(entities) {
  const voertuigen = [], doelen = [], voetgangers = [], treinen = [], starts = [];
  for (const e of entities || []) {
    if (e.kind === SOORT_DOEL) doelen.push({ x: e.x, y: e.z });
    else if (e.kind === SOORT_START) starts.push({ index: e.id - ID_START0, x: e.x, y: e.z });
    else if (e.kind === SOORT_TREIN) { if (e.id >= ID_TREIN0) treinen.push({ route: e.id - ID_TREIN0, x: e.x, y: e.z, v: e.speed || 0 }); }
    else if (e.kind === SOORT_VOETGANGER || e.kind === SOORT_AGENT) voetgangers.push({ id: e.id, x: e.x, y: e.z, angle: e.angle, agent: e.kind === SOORT_AGENT });
    else if (e.kind >= 0 && e.kind < VOERTUIG_SOORTEN.length) {
      const soort = VOERTUIG_SOORTEN[e.kind];
      const [len, wid, hoogte, kleur] = VOERTUIG_MATEN[soort];
      const ind = (e.fl || 0) & 3;
      voertuigen.push({ id: e.id, soort, x: e.x, y: e.z, angle: e.angle, len, wid, hoogte, kleur,
        ind: ind === 1 ? 'left' : ind === 2 ? 'right' : ind === 3 ? 'hazard' : null, sirene: !!((e.fl || 0) & FL_SIREN), toeter: !!((e.fl || 0) & FL_HORN), lek: !!((e.fl || 0) & FL_FLAT),
        snelheid: e.speed || 0, stuur: e.steer || 0, hoogteZ: e.vz || 0, rotor: e.rotor || 0, look: e.look || null });
    }
  }
  return { voertuigen, doelen, voetgangers, treinen, starts };
}

// ----------------------------------------------------------- opdracht van de host
// De host zegt in een bericht welke opdracht hij speelt (alleen als het verandert).
export function missieBericht(prev, pub) {
  const id = pub && pub.phase === 'active' && typeof pub.id === 'string' && pub.id ? pub.id.slice(0, 48) : null; // de groep van deze opdracht (#452)
  const nu = pub && pub.phase === 'active' ? { label: String(pub.label || '').slice(0, 80), type: String(pub.type || '').slice(0, 24), index: pub.index | 0, stap: String(pub.progressText || '').slice(0, 90), lateInstap: pub.lateInstap !== false, ...(id ? { id } : null) } : null;
  const was = prev ? `${prev.id || ''}|${prev.index}|${prev.label}|${prev.stap}|${prev.lateInstap}` : '';
  const is = nu ? `${nu.id || ''}|${nu.index}|${nu.label}|${nu.stap}|${nu.lateInstap}` : '';
  if (was === is) return { event: null, huidig: prev };
  if (prev && nu && was.slice(0, was.lastIndexOf('|')) === is.slice(0, is.lastIndexOf('|'))) return { event: null, huidig: nu }; // alleen de late-instapvlag veranderde: geen nieuw bericht (#452)
  // de stap van de opdracht ("Stap in de boot", "Rij naar de kerk") gaat mee, zodat een gast het hele verhaal kan volgen.
  // De id gaat mee zodat een gast een opdracht van een andere groep niet voor de zijne aanziet (#452).
  if (nu) return { event: { k: 'missie', actief: true, label: nu.label, type: nu.type, index: nu.index, stap: nu.stap, ...(nu.id ? { id: nu.id } : null) }, huidig: nu };
  return { event: { k: 'missie', actief: false, ...(prev && prev.id ? { id: prev.id } : null) }, huidig: null };
}
export function leesMissieBericht(b) {
  if (!b || b.k !== 'missie') return null;
  if (!b.actief) return { actief: false, ...(typeof b.id === 'string' && b.id && b.id.length <= 48 ? { id: b.id } : null) };
  if (typeof b.label !== 'string' || b.label.length > 80) return null;
  const id = typeof b.id === 'string' && b.id && b.id.length <= 48 ? b.id : null;
  return { actief: true, label: b.label, type: typeof b.type === 'string' ? b.type.slice(0, 24) : '', index: b.index | 0, stap: typeof b.stap === 'string' ? b.stap.slice(0, 90) : '', ...(id ? { id } : null) };
}
// Tekst voor de gast: wat de host nu speelt, en of de gast kan meedoen.
export function missieTekst(m, rol = 'wereld', naam = 'De ander') {
  if (!m || !m.actief) return '';
  return rol === 'wereld' ? `${naam} speelt: ${m.label}. Jij loopt mee in de open wereld.` : `${naam} speelt: ${m.label}. Doe mee waar het kan.`;
}

// ----------------------------------------------------------- wat de host op het scherm heeft
// Een filmpje, de regel die iemand zegt en een keuze in een gesprek spelen op de host. De gasten krijgen dat als
// 'scene'-bericht (alleen als het verandert): zij zien dat de gastheer een filmpje kijkt, lezen de tekst mee en zien
// welke keuze de gastheer krijgt. De gastheer beslist; een gast kiest niet.
const tekst = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
export const SCENE_LEEG = Object.freeze({ filmpje: false, pauze: false, regel: null, keuze: null });
export function schoonScene(sc) {
  if (!sc || typeof sc !== 'object') return { ...SCENE_LEEG };
  const out = { filmpje: !!sc.filmpje, pauze: !!sc.pauze, regel: null, keuze: null };
  if (sc.regel && typeof sc.regel === 'object' && tekst(sc.regel.tekst, 1)) out.regel = { wie: tekst(sc.regel.wie, 40), tekst: tekst(sc.regel.tekst, 240) };
  if (sc.keuze && typeof sc.keuze === 'object' && Array.isArray(sc.keuze.opties)) {
    const opties = sc.keuze.opties.slice(0, 6).map((o) => tekst(o, 80)).filter(Boolean);
    if (opties.length) out.keuze = { tekst: tekst(sc.keuze.tekst, 240), opties };
  }
  return out;
}
export const sceneLeeg = (sc) => !sc || (!sc.filmpje && !sc.pauze && !sc.regel && !sc.keuze);
// prev = wat de gasten het laatst kregen; geeft het bericht dat nu nodig is (of null) en de nieuwe stand
export function sceneBericht(prev, sc) {
  const nu = schoonScene(sc), was = prev ? schoonScene(prev) : { ...SCENE_LEEG };
  if (JSON.stringify(nu) === JSON.stringify(was)) return { event: null, huidig: was };
  return { event: { k: 'scene', ...nu }, huidig: nu };
}
export function leesSceneBericht(b) { return b && b.k === 'scene' ? schoonScene(b) : null; }
// Tekst voor de gast bij een filmpje
export const filmpjeTekst = (naam = 'De ander') => `${naam} kijkt een filmpje. Je wacht even.`;
export const pauzeTekst = (naam = 'De ander') => `${naam} heeft het spel op pauze.`;
