// Reizigers bij de bushalte (#225): wie instapt loopt naar de deur, wie uitstapt komt uit de
// deur en loopt weg. Alleen beeld: gameplay telt reizigers al (busride.js). Pure planning,
// geen THREE (scripts/haltefiguren_test.mjs); haltefiguren3d.js tekent de mensen.
import { doorsFor } from './vehicledoors.js';

export const MAX_FIGUREN = 5;      // zoveel mensen per halte-uitwisseling in beeld
export const LOOP_SNELHEID = 1.5;  // m/s
export const START_AFSTAND = 4.5;  // m van de deur waar instappers beginnen
export const WEGLOOP = 5;          // m die uitstappers van de deur weglopen
export const GAP = 0.55;           // s tussen twee mensen bij dezelfde deur

// Deurplekken van een bus aan de stoepkant (rechts), voertuigcoördinaten: { x vooruit, z rechts }.
export function haltedeuren(v) {
  const len = (v.model && v.model.len) || 11, hw = ((v.model && v.model.wid) || 2.5) / 2;
  const defs = doorsFor(v).filter((d) => d.side === 1 && d.soort === 'schuif');
  const uniek = [];
  for (const d of defs) {
    const x = d.x * len;
    if (!uniek.some((u) => Math.abs(u.x - x) < 0.8)) uniek.push({ id: d.id, x, z: hw });
  }
  return uniek.length ? uniek : [{ id: 'd1', x: len * 0.3, z: hw }];
}

const toWorld = (v, x, z) => {
  const c = Math.cos(v.angle || 0), s = Math.sin(v.angle || 0);
  return { x: v.x + c * x - s * z, y: v.y + s * x + c * z };
};

// ev: { board, alight } -> lijst figuren { kind, delay, from, to, id (deur), duur }. Wereldcoördinaten.
export function planHaltefiguren(v, ev, rng = Math.random) {
  const deuren = haltedeuren(v);
  const uit = Math.min(ev.alight || 0, 3);
  const in_ = Math.min(ev.board || 0, MAX_FIGUREN - uit);
  const out = [];
  const teller = deuren.map(() => 0);
  const kies = (i) => { const k = i % deuren.length; teller[k]++; return k; };
  for (let i = 0; i < uit; i++) {
    const k = kies(i), d = deuren[k], zij = (rng() - 0.5) * 3;
    const delay = (teller[k] - 1) * GAP + 0.3;
    out.push({ kind: 'uit', id: d.id, delay, from: toWorld(v, d.x, d.z), to: toWorld(v, d.x + zij, d.z + WEGLOOP), duur: WEGLOOP / LOOP_SNELHEID });
  }
  for (let i = 0; i < in_; i++) {
    const k = kies(i + uit), d = deuren[k], zij = (rng() - 0.5) * 3;
    const delay = 1.2 + (teller[k] - 1) * GAP;
    const van = toWorld(v, d.x + zij, d.z + START_AFSTAND);
    out.push({ kind: 'in', id: d.id, delay, from: van, to: toWorld(v, d.x, d.z + 0.15), duur: START_AFSTAND / LOOP_SNELHEID });
  }
  return out;
}

// Plek en zichtbaarheid van een figuur op tijd t (s sinds de uitwisseling begon).
// Instappers verdwijnen bij de deur, uitstappers komen er uit en lopen weg.
export function figuurNu(f, t) {
  const u = t - f.delay;
  if (u < 0) return f.kind === 'uit' ? { zichtbaar: false, x: f.from.x, y: f.from.y, klaar: false } : { zichtbaar: true, x: f.from.x, y: f.from.y, lopen: false, klaar: false };
  const k = Math.min(1, u / f.duur);
  return { zichtbaar: k < 1 || f.kind === 'uit', x: f.from.x + (f.to.x - f.from.x) * k, y: f.from.y + (f.to.y - f.from.y) * k, lopen: k < 1, klaar: u > f.duur + (f.kind === 'uit' ? 2.5 : 0) };
}

// Deur van deze figuur open? (de bus opent zijn deuren zelf bij stilstand; dit is voor tests en andere voertuigen)
export const deurNodig = (figuren, t) => figuren.some((f) => t >= f.delay - 0.6 && t <= f.delay + (f.kind === 'in' ? f.duur : 0.6) + 0.4);

// Door de bijbaan aangeroepen bij een halte: v = de bus, ev = { board, alight }.
export function queueHalte(world, v, ev) {
  if (!world || !v) return;
  (world.haltefx = world.haltefx || []).push({ v, board: ev.board || 0, alight: ev.alight || 0 });
}
