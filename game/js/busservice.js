// Bus-sim bovenop busroutes.js (#15): dienstregeling, punctualiteit, in- en
// uitstappen en de score van een rit. Puur: geen THREE, geen wereld. De bus
// zelf rijdt via de bus-AI en stepRunner; hier staat alleen wat een lijndienst
// een spel maakt. Tests: scripts/busservice_test.mjs.

import { DWELL } from './busroutes.js';

export const CRUISE = 8.5;      // m/s gemiddeld tussen haltes, met optrekken en remmen
const EARLY_OK = 12;     // s: zo ver voor de tijd mag je nog net aankomen
const LATE_OK = 10;      // s: zo laat is nog "op tijd"
export const CAPACITY = 40;

const STOP_NAMES = ['Kerkpad', 'Molenlaan', 'Dorpsstraat', 'Het Hoogeland', 'Zijlweg', 'Wierdeplein', 'Veenkade', 'De Pol', 'Kleiweg', 'Havenhoofd', 'Schoolstraat', 'Brugwachter', 'Marktplein', 'Oosterkade'];

// verzonnen haltenaam: stabiel per lijn en volgnummer
export function stopName(line, i) {
  const s = String(line.ref || line.id || '');
  let h = 7;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  return STOP_NAMES[(h + i * 5) % STOP_NAMES.length];
}

// Dienstregeling voor één rit vooruit (dir +1) of terug (-1): per halte de
// geplande aankomst en vertrek in seconden na de start van de rit.
export function buildTimetable(line, { dir = 1, cruise = CRUISE, dwell = DWELL, start = 0 } = {}) {
  const stops = dir > 0 ? line.stops : [...line.stops].reverse();
  const rows = [];
  let t = start, prev = null;
  stops.forEach((st, i) => {
    if (prev) t += Math.abs(st.s - prev.s) / cruise;
    const arrive = t;
    const depart = i === stops.length - 1 ? t : t + dwell;
    rows.push({ index: i, name: stopName(line, dir > 0 ? i : line.stops.length - 1 - i), s: st.s, arrive, depart });
    t = depart;
    prev = st;
  });
  return rows;
}

// afwijking = werkelijke aankomst min geplande; <0 is te vroeg
export function punctuality(delta) {
  if (delta < -EARLY_OK) return { state: 'vroeg', delta };
  if (delta > LATE_OK) return { state: 'laat', delta };
  return { state: 'op tijd', delta };
}

// Bij een te vroege aankomst moet de bus wachten tot de geplande vertrektijd.
export function holdSeconds(row, now) {
  return Math.max(0, row.depart - now);
}

// Passagiers per halte. rng() in [0,1). Op de eerste halte stapt niemand uit,
// op de laatste stapt iedereen uit.
export function stopExchange(rng, { index, count, onBoard, capacity = CAPACITY, demand = 1 }) {
  if (index >= count - 1) return { alight: onBoard, board: 0 };
  const alight = index === 0 ? 0 : Math.min(onBoard, Math.round(onBoard * (0.25 + 0.3 * rng())));
  const want = Math.round((2 + 8 * rng()) * demand);
  const board = Math.max(0, Math.min(want, capacity - (onBoard - alight)));
  return { alight, board };
}

// Score van een rit: starttarief per passagier, minus straf voor te laat of te
// vroeg, plus een bonus voor een zachte rit (aantal harde remmingen).
export function tripScore({ passengers, deltas, hardBrakes = 0, farePer = 1.4 }) {
  let punctual = 0;
  for (const d of deltas) if (punctuality(d).state === 'op tijd') punctual++;
  const share = deltas.length ? punctual / deltas.length : 1;
  const fare = passengers * farePer;
  const smooth = Math.max(0, 1 - hardBrakes * 0.12);
  const pay = fare * (0.4 + 0.6 * share) * (0.7 + 0.3 * smooth);
  return { pay: Math.round(pay * 100) / 100, share, smooth, perfect: share === 1 && hardBrakes === 0 };
}
