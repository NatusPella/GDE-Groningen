// Reizigers bij de bushalte (#225): wie instapt loopt naar de deur, wie uitstapt komt uit de
// deur en loopt weg. Alleen beeld: gameplay telt reizigers al (busride.js). Pure planning,
// geen THREE (scripts/haltefiguren_test.mjs); de planning zelf is het gedeelde systeem van bus en
// trein (boarding.js), boarding3d.js tekent de mensen.
import { doorsFor } from './vehicledoors.js';
import { INSTAP, busDeurenWereld, planInstappen, figuurStand } from './boarding.js';

export const MAX_FIGUREN = INSTAP.MAX_BUS;      // zoveel mensen per halte-uitwisseling in beeld
const MAX_HALTEFX = 16;                         // wachtrij van uitwisselingen (een spel zonder beeld leest hem nooit)

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

// ev: { board, alight } -> lijst figuren { kind, delay, from, to, id (deur), duur }. Wereldcoördinaten.
// wachtenden (optioneel): de plekken van wie bij de halte wacht; zij stappen als eersten in.
export function planHaltefiguren(v, ev, rng = Math.random, wachtenden = null) {
  return planInstappen(busDeurenWereld(v, haltedeuren(v)), ev, { rng, wachtenden, max: INSTAP.MAX_BUS, maxUit: INSTAP.MAX_UIT_BUS });
}

// Plek en zichtbaarheid van een figuur op tijd t (s sinds de uitwisseling begon).
// Instappers verdwijnen bij de deur, uitstappers komen er uit en lopen weg.
export function figuurNu(f, t) {
  return figuurStand(f, t, { x: 0, y: 0, zichtbaar: false, lopen: false, klaar: false });
}

// Deur van deze figuur open? (de bus opent zijn deuren zelf bij stilstand; dit is voor tests en andere voertuigen)
export const deurNodig = (figuren, t) => figuren.some((f) => t >= f.delay - 0.6 && t <= f.delay + (f.kind === 'in' ? f.duur : 0.6) + 0.4);

// Door de bijbaan en de lijnbussen in het verkeer aangeroepen bij een halte: v = de bus, ev = { board, alight }
// (board < 0: wie er bij de halte wacht).
export function queueHalte(world, v, ev) {
  if (!world || !v) return;
  const q = world.haltefx || (world.haltefx = []);
  if (q.length >= MAX_HALTEFX) q.shift();
  q.push({ v, board: ev.board || 0, alight: ev.alight || 0 });
}
