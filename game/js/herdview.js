// Het vee van Bezit in de wereld, het pure deel (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.4): welke kuddes er in beeld komen, hoeveel dieren (hoogstens
// twaalf per weide: livestock.visibleAnimals), waar ze staan rond het binnenpunt van het perceel en de kudde-regel voor de perceelinfo (herdSummary). Alles is vast
// per perceel-ID (geen Math.random, geen klok): dezelfde kudde staat er elke keer hetzelfde bij. Puur: geen THREE, geen DOM (scripts/herdview_test.mjs); herdview3d.js
// bouwt de dieren met de bestaande koe-, schaap- en kipmodellen. Samen spelen: het vee is per speler (#429); een gast ziet het niet (herdsVisible).
import { SPECIES, herdsOf, visibleAnimals, VISIBLE_MAX, capacityOf } from './livestock.js';
import { SPAWN_R } from './farmworkers.js';

export const MAX_HERDS_IN_VIEW = 4;                  // hoogstens vier weiden tegelijk met dieren (de dichtstbijzijnde): 48 dieren is het budget
export const HERD_RADIUS_M = SPAWN_R;                // dezelfde streamstraal als de rest van de boerderij
export const HERD_DESPAWN_M = 330;
export const MODEL_OF = { melkvee: 'cow', schapen: 'sheep', kippen: 'hen' };

export const herdsVisible = (w) => !!w && w.coopRole !== 'client';

const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const unit = (id, k) => hash(`${id}|${k}`) / 4294967296;

// De kudde-regel voor de perceelinfo: { sp, naam, n, visible, capacity, sick, text } of null zonder kudde op dit perceel.
export function herdSummary(bezit, id) {
  const h = bezit && herdsOf(bezit)[id];
  const rec = bezit && bezit.parcels[id];
  if (!h || !rec || !SPECIES[h.sp]) return null;
  const s = SPECIES[h.sp];
  const visible = visibleAnimals(h.n);
  const cap = capacityOf(h.sp, rec.ha);
  const count = `${h.n} ${h.sp === 'kippen' ? (h.n === 1 ? 'kip' : 'kippen') : h.n === 1 ? 'dier' : 'dieren'}`;
  const text = `${s.naam}: ${count}${h.sick > 0 ? ', ziek' : ''}${h.n > visible ? ` (${visible} in beeld)` : ''}`;
  return { sp: h.sp, naam: s.naam, n: h.n, visible, capacity: cap, sick: h.sick > 0, text };
}

// De dieren van één kudde: n punten rond c (binnenpunt in wereldmeters), binnen een straal die met de oppervlakte meegroeit (4 tot 40 m); elk met een vaste draai,
// een zaad voor het model en een maat. extra: meer kandidaten dan nodig, zodat de aanroeper een plek in water of bij een gebouw kan overslaan (de eerste n goede tellen).
export function animalLayout(id, c, ha, n, extra = 2) {
  const out = [];
  const total = Math.max(0, Math.floor(n)) * Math.max(1, extra);
  const r = Math.max(4, Math.min(40, 0.35 * Math.sqrt(Math.max(0.1, Number(ha) || 0.1) * 10000)));
  for (let i = 0; i < total; i++) {
    const a = unit(id, 'a' + i) * Math.PI * 2, d = Math.sqrt(unit(id, 'd' + i)) * r;
    out.push({ i, x: Math.round((c[0] + Math.cos(a) * d) * 10) / 10, y: Math.round((c[1] + Math.sin(a) * d) * 10) / 10, angle: unit(id, 'h' + i) * Math.PI * 2, seed: unit(id, 's' + i), red: unit(id, 'r' + i) < 0.25, size: unit(id, 'z' + i) < 0.2 ? 0.7 : 1 });
  }
  return out;
}

// Welke kuddes nu in beeld horen: de dichtstbijzijnde (hoogstens `max`) binnen de straal; een kudde die er al staat blijft tot HERD_DESPAWN_M. current: Set van perceel-id's.
// Geeft [{ id, sp, model, n (zichtbaar), x, y, ha, d }], op afstand en dan id.
export function planHerds(bezit, viewer, { current = null, max = MAX_HERDS_IN_VIEW, spawnR = HERD_RADIUS_M, despawnR = HERD_DESPAWN_M } = {}) {
  const out = [];
  if (!bezit || !viewer || !Number.isFinite(viewer.x) || !Number.isFinite(viewer.y)) return out;
  const herds = herdsOf(bezit);
  for (const id of Object.keys(herds)) {
    const rec = bezit.parcels[id], h = herds[id];
    if (!rec || rec.k !== 'w' || !MODEL_OF[h.sp]) continue;          // vee staat alleen op een weide (hoofdstuk 14, besluit 1)
    const c = rec.c || rec.a;
    if (!c) continue;
    const d = Math.hypot(c[0] - viewer.x, c[1] - viewer.y);
    if (d > ((current && current.has(id)) ? despawnR : spawnR)) continue;
    const n = visibleAnimals(h.n, VISIBLE_MAX);
    if (n > 0) out.push({ id, sp: h.sp, model: MODEL_OF[h.sp], n, x: c[0], y: c[1], ha: rec.ha, d });
  }
  out.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  return out.slice(0, Math.max(0, max));
}

// Wat er verandert tussen wat er staat (Map perceel-id -> handtekening) en het nieuwe plan: { add, remove, change } (een andere soort of een ander aantal bouwt de kudde opnieuw).
export const herdSig = (h) => `${h.model}|${h.n}`;
export function diffHerds(prev, next) {
  const ids = new Set(next.map((h) => h.id));
  const add = [], change = [];
  for (const h of next) { const s = prev.get(h.id); if (s === undefined) add.push(h); else if (s !== herdSig(h)) change.push(h); }
  return { add, change, remove: [...prev.keys()].filter((id) => !ids.has(id)) };
}
