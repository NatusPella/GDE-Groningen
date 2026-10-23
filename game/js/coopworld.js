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
// echte model met dezelfde bouwer als de host. Een blok in VOERTUIG_MATEN is alleen de terugval als een look nog ontbreekt.
import { BOAT_KINDS } from './boattypes.js';
import { VEH_KINDS, MAX_LOOKS, FL_SIREN, FL_HORN, FL_FLAT } from './net/codec.js';

export const VOERTUIG_SOORTEN = ['auto', 'bakkie', 'bus', 'politie', 'motor', 'scooter', 'fiets', 'boot', 'heli', 'trein', 'vracht', 'overig'];
export const SOORT_DOEL = 100;
export const SOORT_VOETGANGER = 12, SOORT_AGENT = 13;
export const SOORT_TREIN = 9, ID_TREIN0 = 0x7000; // een trein: id = ID_TREIN0 + het nummer van de route (de gast heeft dezelfde routes uit de wereld)
export const RADIUS_VOETGANGER = 70; // m rond elke speler: verder weg zijn de voetgangers van de host toch maar stippen
export const MAX_VOETGANGERS = 20;
export const ID_DOEL = 0xfffe;
export const RADIUS = 150;      // m rond elke speler
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

// Voertuigen dicht bij een van de spelers (nabije eerst), plus het doel van de lopende opdracht.
// bij = [{x, y}] (de lichamen van alle spelers). Geeft hoogstens MAX_ENTITEITEN entiteiten.
export function verzamelEntiteiten(world, bij, { radius = RADIUS, max = MAX_ENTITEITEN, treinen = world.treinen } = {}) {
  const out = [];
  const m = world.mission;
  if (m && m.phase === 'active' && m.marker && Number.isFinite(m.marker.x) && Number.isFinite(m.marker.y)) {
    out.push({ id: ID_DOEL, kind: SOORT_DOEL, x: m.marker.x, z: m.marker.y, angle: 0 });
  }
  // treinen: [{ id: routenummer, x, y, v: snelheid met teken, halfLen }] van de host (coopnet.js); een trein in de buurt gaat voor
  for (const t of treinen || []) {
    if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;
    let d = Infinity;
    for (const p of bij) d = Math.min(d, Math.hypot(t.x - p.x, t.y - p.y));
    if (d <= radius + (t.halfLen || 0) && out.length < max - 12) out.push({ id: ID_TREIN0 + t.id, kind: SOORT_TREIN, x: t.x, z: t.y, angle: 0, speed: t.v || 0, fl: 0, steer: 0, vz: 0 });
  }
  const near = [];
  for (const v of world.vehicles || []) {
    if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.wrecked) continue;
    let d = Infinity;
    for (const p of bij) d = Math.min(d, Math.hypot(v.x - p.x, v.y - p.y));
    if (d <= radius) near.push({ d, v });
  }
  near.sort((a, b) => a.d - b.d);
  const peds = [];
  for (const p of world.pedestrians || []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.state === 'dead' || p.health <= 0) continue;
    let d = Infinity;
    for (const b of bij) d = Math.min(d, Math.hypot(p.x - b.x, p.y - b.y));
    if (d <= RADIUS_VOETGANGER) peds.push({ d, p });
  }
  peds.sort((a, b) => a.d - b.d);
  const nPed = Math.min(peds.length, MAX_VOETGANGERS, Math.max(0, max - out.length - 12)); // voertuigen houden minstens 12 plekken
  for (const { v } of near) {
    if (out.length >= max - nPed) break;
    out.push({ id: vid(v, out.length), kind: voertuigSoort(v), x: v.x, z: v.y, angle: v.angle || 0, ...voertuigStaat(v, world), _v: v });
  }
  for (const { p } of peds.slice(0, nPed)) out.push({ id: pedId(p), kind: p.isCop ? SOORT_AGENT : SOORT_VOETGANGER, x: p.x, z: p.y, angle: p.angle || 0 });
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

// Wat een gast met de entiteiten doet: voertuigen tekenen, het doel aangeven.
export function leesEntiteiten(entities) {
  const voertuigen = [], doelen = [], voetgangers = [], treinen = [];
  for (const e of entities || []) {
    if (e.kind === SOORT_DOEL) doelen.push({ x: e.x, y: e.z });
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
  return { voertuigen, doelen, voetgangers, treinen };
}

// ----------------------------------------------------------- opdracht van de host
// De host zegt in een bericht welke opdracht hij speelt (alleen als het verandert).
export function missieBericht(prev, pub) {
  const nu = pub && pub.phase === 'active' ? { label: String(pub.label || '').slice(0, 80), type: String(pub.type || '').slice(0, 24), index: pub.index | 0, stap: String(pub.progressText || '').slice(0, 90) } : null;
  const was = prev ? `${prev.index}|${prev.label}|${prev.stap}` : '';
  const is = nu ? `${nu.index}|${nu.label}|${nu.stap}` : '';
  if (was === is) return { event: null, huidig: prev };
  // de stap van de opdracht ("Stap in de boot", "Rij naar de kerk") gaat mee, zodat een gast het hele verhaal kan volgen
  return { event: nu ? { k: 'missie', actief: true, label: nu.label, type: nu.type, index: nu.index, stap: nu.stap } : { k: 'missie', actief: false }, huidig: nu };
}
export function leesMissieBericht(b) {
  if (!b || b.k !== 'missie') return null;
  if (!b.actief) return { actief: false };
  if (typeof b.label !== 'string' || b.label.length > 80) return null;
  return { actief: true, label: b.label, type: typeof b.type === 'string' ? b.type.slice(0, 24) : '', index: b.index | 0, stap: typeof b.stap === 'string' ? b.stap.slice(0, 90) : '' };
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
