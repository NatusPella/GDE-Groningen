// Samen spelen (#95): de wereld van de host delen met de gasten. Pure logica: welke
// voertuigen, welk missiedoel en welke opdracht gaan in de snapshot, en hoe zet een gast
// dat om in iets wat hij kan tekenen. Alleen wat dicht bij de spelers is, gaat mee
// (interest management); verkeer ver weg en weer blijven lokaal.
//
// Entiteiten in de snapshot (net/codec.js: id u16, soort u8, x, z, hoek):
//   soort 0 tot 11: voertuigen (VOERTUIG_SOORTEN); soort 100: het doel van de huidige opdracht.
// Het uiterlijk van een voertuig bij de gast is een vereenvoudigd blok in de maat en kleur van
// het voertuig (afmetingen zitten in VOERTUIG_MATEN), geen volledig model.

export const VOERTUIG_SOORTEN = ['auto', 'bakkie', 'bus', 'politie', 'motor', 'scooter', 'fiets', 'boot', 'heli', 'trein', 'vracht', 'overig'];
export const SOORT_DOEL = 100;
export const ID_DOEL = 0xfffe;
export const RADIUS = 150;      // m rond elke speler
export const MAX_ENTITEITEN = 48;

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
  for (const { v } of near) {
    if (out.length >= max) break;
    out.push({ id: vid(v, out.length), kind: voertuigSoort(v), x: v.x, z: v.y, angle: v.angle || 0 });
  }
  return out;
}

// Wat een gast met de entiteiten doet: voertuigen tekenen, het doel aangeven.
export function leesEntiteiten(entities) {
  const voertuigen = [], doelen = [];
  for (const e of entities || []) {
    if (e.kind === SOORT_DOEL) doelen.push({ x: e.x, y: e.z });
    else if (e.kind >= 0 && e.kind < VOERTUIG_SOORTEN.length) {
      const soort = VOERTUIG_SOORTEN[e.kind];
      const [len, wid, hoogte, kleur] = VOERTUIG_MATEN[soort];
      voertuigen.push({ id: e.id, soort, x: e.x, y: e.z, angle: e.angle, len, wid, hoogte, kleur });
    }
  }
  return { voertuigen, doelen };
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
export function missieTekst(m, rol = 'wereld') {
  if (!m || !m.actief) return '';
  return rol === 'wereld' ? `De gastheer speelt: ${m.label}. Jij loopt mee in de open wereld.` : `De gastheer speelt: ${m.label}. Doe mee waar het kan.`;
}
