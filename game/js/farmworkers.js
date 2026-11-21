// De zichtbare AI-werkers van Bezit, het pure deel (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.2): welke werkers er nu in beeld komen, waar ze staan
// langs de rijen van hun perceel, welke cel van het veld ze net gedaan hebben en hoe ze eruitzien. Puur: geen THREE, geen DOM, geen klok, geen Math.random
// (scripts/farmworkers_test.mjs); farmworkers3d.js zet het in de wereld. De werker is een weergave van het dagschema van farmstaff.js (staffDayTick levert
// `worked`), nooit een tweede simulatie: een perceel dat de dagtik niet bewerkt heeft, krijgt geen werker. Samen spelen: het personeel is per speler (#429);
// een gast ziet het niet en deelt het niet (workersVisible).
import { visibleJobs, VISIBLE_MAX, STREAM_RADIUS_M } from './farmstaff.js';
import { rowLayout } from './parcelfarm.js';

export const SPAWN_R = STREAM_RADIUS_M;        // 230 m: zo dichtbij komt een nieuwe werker in beeld (zelfde straal als boerderijwereld.js)
export const DESPAWN_R = 330;                  // zo ver weg gaat hij weer weg (hysterese, zodat een werker op de rand niet knippert)
export const MAX_ACTORS = VISIBLE_MAX;         // hoogstens 4 tegelijk, de dichtstbijzijnde
export const PLAN_EVERY_S = 0.5;               // de planning loopt twee keer per seconde; de beweging elk beeld
export const SNAP_M = 30;                      // verder dan dit springt een figuur naar zijn doel in plaats van te glijden
export const SLIDE_RATE = 6;                   // hoe snel een figuur zijn doel volgt (per seconde)

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Een gast (samen spelen) ziet het personeel van de gastheer niet: het is zijn eigen bezit en eigen spel.
export const workersVisible = (w) => !!w && w.coopRole !== 'client';

// Hoe ver de speldag is (0..1) uit de speluren van de boerderij (farm.uren).
export const dayFraction = (uren) => { const d = (Number.isFinite(uren) ? uren : 0) / 24; return clamp(d - Math.floor(d), 0, 0.999999); };

// Wat de laatste dagtik van het personeel bewerkt heeft: { day, worked } (rep.staff.worked van holdingsmodel.advanceDays). De dagtik zet het (noteStaffWork,
// via bezitworldhooks.onDayReport); de wereld speelt het na zolang het die speldag is. Per apparaat en per speler, nooit bewaard.
let staffWork = { day: -1, worked: [] };
export function noteStaffWork(day, worked) { staffWork = { day: Number.isFinite(day) ? Math.floor(day) : -1, worked: Array.isArray(worked) ? worked.slice(0, 200) : [] }; }
export const staffWorkOf = (today) => (staffWork.day === Math.floor(today) ? staffWork.worked : []);
export const clearStaffWork = () => { staffWork = { day: -1, worked: [] }; };

// De werkers die nu in beeld horen. `current` is de verzameling actor-id's die er al staan: die blijven tot DESPAWN_R, een nieuwe komt pas binnen SPAWN_R.
// Hoogstens `max` stuks, de dichtstbijzijnde eerst (gelijke afstand: op id, dus altijd dezelfde uitkomst).
export function planWorkerActors(worked, viewer, { posOf, dayFrac, current = null, max = MAX_ACTORS, spawnR = SPAWN_R, despawnR = DESPAWN_R } = {}) {
  if (!viewer || !Array.isArray(worked) || !worked.length || !(max > 0)) return [];
  const all = visibleJobs(worked, viewer, { posOf, dayFrac, max: worked.length, radius: despawnR });
  const keep = all.filter((a) => (current && current.has(a.actorId)) || a.distance <= spawnR);
  return keep.slice(0, max);
}

// Wat er verandert tussen wat er staat (Set van actor-id's) en het nieuwe plan: { add: [actor], keep: [actor], remove: [id] }.
export function diffActors(prev, next) {
  const ids = new Set(next.map((a) => a.actorId));
  return { add: next.filter((a) => !prev.has(a.actorId)), keep: next.filter((a) => prev.has(a.actorId)), remove: [...prev].filter((id) => !ids.has(id)) };
}

// Welke cel van het veld de werker net bereikt heeft: rij (0..rows-1) en cel (0..cells-1, gemeten van de linkerkant van het veld, ook in een teruggereden rij).
// layout is rowLayout(ha); cells is het aantal cellen per rij van het veldmesh (werktuigen.js CELLEN).
export function cellAt(layout, progress, cells) {
  const total = layout.rows * layout.rowLength;
  const dist = clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * total;
  const row = Math.min(layout.rows - 1, Math.floor(dist / layout.rowLength));
  const along = clamp((dist - row * layout.rowLength) / layout.rowLength, 0, 0.999999);
  const frac = row % 2 === 0 ? along : 1 - along;
  return { row, cell: clamp(Math.floor(frac * cells), 0, cells - 1) };
}
// Alle cellen tussen twee voortgangen (voor een beeld dat meer dan één cel verder is): [{ row, cell }], in volgorde, zonder dubbelen.
export function cellsBetween(layout, from, to, cells) {
  const out = [];
  const per = (layout.rowLength > 0 ? layout.rowLength : 1) / cells;
  const total = layout.rows * layout.rowLength;
  const steps = Math.min(800, Math.max(1, Math.ceil(2 * Math.abs(to - from) * total / per)));
  let last = null;
  for (let i = 0; i <= steps; i++) {
    const c = cellAt(layout, from + ((to - from) * i) / steps, cells);
    if (!last || last.row !== c.row || last.cell !== c.cell) { out.push(c); last = c; }
  }
  return out;
}

// Een glijdende positie: de figuur volgt zijn doel zacht (geen sprongen, ook niet bij de planning van twee keer per seconde). reduced: direct naar het doel.
export function slide(cur, target, dt, reduced = false) {
  if (!cur || reduced) return { x: target.x, y: target.y, heading: target.heading };
  const d = Math.hypot(target.x - cur.x, target.y - cur.y);
  if (d > SNAP_M) return { x: target.x, y: target.y, heading: target.heading };
  const k = 1 - Math.exp(-SLIDE_RATE * Math.max(0, dt));
  const dh = Math.atan2(Math.sin(target.heading - cur.heading), Math.cos(target.heading - cur.heading));
  return { x: cur.x + (target.x - cur.x) * k, y: cur.y + (target.y - cur.y) * k, heading: cur.heading + dh * k };
}

// ---- het uiterlijk: een boer in zomerkleding, vast per werker ----
// Dezelfde vorm als de outfit 'boer' van de kleding (shops.js: olijfgroen shirt, bruine broek, donkergroene pet, bruine schoenen). epic-kleding heeft geen
// outfit-rol voor figuranten (alleen voor de speler), dus dit is een eigen kleine voorziening met dezelfde velden.
export const FARMER_OUTFIT = Object.freeze({ shirt: 0x5b6b3a, pants: 0x4a3a2a, cap: 0x2e4a34, shoes: 0x3b2a1e });
const SKINS = [0xe0b48a, 0xc68863, 0xf1c9a5, 0x8d5a3c, 0xd9a577];
const HAT_BY_SKILL = { 1: 0x2e4a34, 2: 0x3b4f5c, 3: 0x7a3b2c };    // de voorman draagt een rode pet

const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return (h >>> 0); };
// Het uiterlijk van een werker uit zijn id: { shirt, skin, opts: { seed, variant, look } } voor buildPersonMesh. Vast per werker (geen toeval).
export function workerLook(workerId, skill = 1) {
  const h = hash(String(workerId));
  return {
    shirt: FARMER_OUTFIT.shirt, skin: SKINS[h % SKINS.length],
    opts: { seed: (h % 997) + 3, variant: (h >> 5) % 3 === 0 ? 'female' : 'male', look: { hat: 'cap', hatColor: HAT_BY_SKILL[skill] || FARMER_OUTFIT.cap, top: 'jacket', forceOpen: false, bottom: 'trousers', pants: FARMER_OUTFIT.pants, shoes: FARMER_OUTFIT.shoes, shoeType: 'boot', hairStyle: (h >> 9) % 4 === 0 ? 'bald' : 'short' } },
  };
}

// De rijlengte van het perceel in cellen is vast (werktuigen.js); deze hulp geeft de rowLayout van een opdracht terug zodat de THREE-kant er niet zelf aan rekent.
export const layoutOfJob = (ha) => rowLayout(ha);

