// Samen spelen (#95): de wereld van de host delen met de gasten. Pure logica: welke
// voertuigen, welk missiedoel en welke opdracht gaan in de snapshot, en hoe zet een gast
// dat om in iets wat hij kan tekenen. Alleen wat dicht bij de spelers is, gaat mee
// (interest management); verkeer ver weg en weer blijven lokaal.
//
// Entiteiten in de snapshot (net/codec.js: id u16, soort u8, x, z, hoek):
//   soort 0 tot 11: voertuigen (VOERTUIG_SOORTEN); soort 12: een voetganger, 13: een agent te voet (alleen dichtbij);
//   soort 100: het doel van de huidige opdracht.
// Het uiterlijk van een voertuig bij de gast is een vereenvoudigd blok in de maat en kleur van
// het voertuig (afmetingen zitten in VOERTUIG_MATEN), geen volledig model.

export const VOERTUIG_SOORTEN = ['auto', 'bakkie', 'bus', 'politie', 'motor', 'scooter', 'fiets', 'boot', 'heli', 'trein', 'vracht', 'overig'];
export const SOORT_DOEL = 100;
export const SOORT_VOETGANGER = 12, SOORT_AGENT = 13;
export const RADIUS_VOETGANGER = 70; // m rond elke speler: verder weg zijn de voetgangers van de host toch maar stippen
export const MAX_VOETGANGERS = 20;
export const ID_DOEL = 0xfffe;
export const RADIUS = 150;      // m rond elke speler
export const MAX_ENTITEITEN = 60;
const PED_ID0 = 0x8000; // voetgangers hebben geen vast id in het spel: ze krijgen er hier een (apart van de voertuig-id's)
const pedIds = new WeakMap(); let pedSeq = 0;
const pedId = (p) => { let id = pedIds.get(p); if (id == null) { id = PED_ID0 + (pedSeq++ % 0x7ff0); pedIds.set(p, id); } return id; };

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
  if (v.isBoat) return VOERTUIG_SOORTEN.indexOf('boot');
  if (v.isScooter) return VOERTUIG_SOORTEN.indexOf('scooter');
  if (v.isBike) return VOERTUIG_SOORTEN.indexOf(v.model && v.model.motorbike ? 'motor' : 'fiets');
  if (v.model && v.model.len > 7) return VOERTUIG_SOORTEN.indexOf('vracht');
  if (v.model && v.model.len > 4.6) return VOERTUIG_SOORTEN.indexOf('bakkie');
  return VOERTUIG_SOORTEN.indexOf('auto');
}

// Voertuigen dicht bij een van de spelers (nabije eerst), plus het doel van de lopende opdracht.
// bij = [{x, y}] (de lichamen van alle spelers). Geeft hoogstens MAX_ENTITEITEN entiteiten.
export function verzamelEntiteiten(world, bij, { radius = RADIUS, max = MAX_ENTITEITEN } = {}) {
  const out = [];
  const m = world.mission;
  if (m && m.phase === 'active' && m.marker && Number.isFinite(m.marker.x) && Number.isFinite(m.marker.y)) {
    out.push({ id: ID_DOEL, kind: SOORT_DOEL, x: m.marker.x, z: m.marker.y, angle: 0 });
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
    out.push({ id: vid(v, out.length), kind: voertuigSoort(v), x: v.x, z: v.y, angle: v.angle || 0 });
  }
  for (const { p } of peds.slice(0, nPed)) out.push({ id: pedId(p), kind: p.isCop ? SOORT_AGENT : SOORT_VOETGANGER, x: p.x, z: p.y, angle: p.angle || 0 });
  return out;
}

// Wat een gast met de entiteiten doet: voertuigen tekenen, het doel aangeven.
export function leesEntiteiten(entities) {
  const voertuigen = [], doelen = [], voetgangers = [];
  for (const e of entities || []) {
    if (e.kind === SOORT_DOEL) doelen.push({ x: e.x, y: e.z });
    else if (e.kind === SOORT_VOETGANGER || e.kind === SOORT_AGENT) voetgangers.push({ id: e.id, x: e.x, y: e.z, angle: e.angle, agent: e.kind === SOORT_AGENT });
    else if (e.kind >= 0 && e.kind < VOERTUIG_SOORTEN.length) {
      const soort = VOERTUIG_SOORTEN[e.kind];
      const [len, wid, hoogte, kleur] = VOERTUIG_MATEN[soort];
      voertuigen.push({ id: e.id, soort, x: e.x, y: e.z, angle: e.angle, len, wid, hoogte, kleur });
    }
  }
  return { voertuigen, doelen, voetgangers };
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
