// Lijnnummer en volgende bestemming op de bus (#160): de pure kant. Het
// bestemmingsbord (tekst en kleur per lijn en richting), de volgende halte op
// de route en de haltemelding. Puur: geen THREE, geen DOM. Plaatsnamen uit de
// busrelaties zijn echte plaatsen en mogen; vervoerder, lijnnamen en de namen
// van de haltes onderweg zijn verzonnen. Tests: scripts/busboard_test.mjs.

import { stopName } from './busservice.js';
import { project, pointAt } from './busroutes.js';

export const OPERATOR = 'Hunzedal Vervoer';
export const BOARD_COLS = 16;      // tekens op het bord
const NEAR = 150;           // m: "straks" voor de volgende halte

// lijnkleuren (bordrand en HUD), stabiel per lijnnummer
export const LINE_COLORS = ['#e4572e', '#2e86c1', '#2e8b6a', '#c9a227', '#8e5ea2', '#d35487', '#3d9db3', '#7a8f2e', '#c46a2c', '#4b5fbf'];

function hash(s) {
  let h = 5;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function lineColor(ref) { return LINE_COLORS[hash(String(ref || '?')) % LINE_COLORS.length]; }

// Plaatsnaam uit een relatienaam: "Winsum, Busstation" -> "Winsum"
export function placeOf(name, fallback = '') {
  const s = String(name || '').split(/[,(]/)[0].replace(/^(bushalte|halte|busstation)\s+/i, '').trim();
  return s || fallback;
}

// LED-tekst: hoofdletters, zonder accenten, op de breedte van het bord
export function ledText(s, cols = BOARD_COLS) {
  const t = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 .\-/']/g, '').replace(/\s+/g, ' ').trim();
  return t.length > cols ? t.slice(0, cols - 1).trimEnd() + '.' : t;
}

// begin- en eindplaats in rijrichting (dir +1 vooruit, -1 terug)
export function lineEnds(line, dir = 1) {
  const a = placeOf(line.from, stopName(line, 0));
  const b = placeOf(line.to, stopName(line, line.stops.length - 1));
  return dir < 0 ? { from: b, to: a } : { from: a, to: b };
}

// Wat er op het bord staat. Een ronde lijn heeft geen richting: "RONDRIT".
export function boardText(line, dir = 1) {
  const { to } = lineEnds(line, dir);
  const dest = line.loop && !line.to ? 'Rondrit' : to;
  const ref = String(line.ref || '').slice(0, 4) || '--';
  return { ref: ledText(ref, 4), dest: ledText(dest), color: lineColor(line.ref), key: `${ref}|${dest}` };
}

// Naam van halte i (op volgorde van de lijn, niet van de rit): de uiteinden
// dragen de plaatsnaam, de haltes ertussen een verzonnen naam.
export function stopLabel(line, i) {
  const n = line.stops.length;
  const e = lineEnds(line, 1);
  if (i === 0) return e.from;
  if (i === n - 1) return e.to;
  return stopName(line, i);
}

// De volgende halte vanaf boogafstand s in richting dir:
// { index, name, dist, last, wrapped } of null zonder haltes.
export function nextStopInfo(line, dir, s) {
  const st = line.stops;
  if (!st.length) return null;
  const n = st.length;
  let idx = -1;
  if (dir > 0) { for (let i = 0; i < n; i++) if (st[i].s > s + 1) { idx = i; break; } }
  else { for (let i = n - 1; i >= 0; i--) if (st[i].s < s - 1) { idx = i; break; } }
  let wrapped = false;
  if (idx < 0) {
    if (!line.loop) return { index: dir > 0 ? n - 1 : 0, name: stopLabel(line, dir > 0 ? n - 1 : 0), dist: Math.abs(st[dir > 0 ? n - 1 : 0].s - s), last: true, wrapped: false };
    idx = dir > 0 ? 0 : n - 1;
    wrapped = true;
  }
  const dist = wrapped ? (dir > 0 ? line.length - s + st[idx].s : s + (line.length - st[idx].s)) : Math.abs(st[idx].s - s);
  const last = !line.loop && (dir > 0 ? idx === n - 1 : idx === 0);
  return { index: idx, name: stopLabel(line, idx), dist, last, wrapped };
}

// Tekstmelding voor de HUD; null als er niets te melden valt.
export function stopAnnouncement(info) {
  if (!info) return null;
  if (info.last) return info.dist < NEAR ? `Eindhalte: ${info.name}. Alle reizigers uitstappen` : `Volgende halte: ${info.name} (eindhalte)`;
  return info.dist < NEAR ? `Straks: ${info.name}` : `Volgende halte: ${info.name}`;
}

export function roundDist(m) {
  return m >= 950 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`;
}

// Welke kant op rijdt een bus (x, y, angle) over deze lijn: +1 of -1, of 0 als
// hij niet op de lijn rijdt (verder dan maxD).
export function lineDirection(line, x, y, angle, maxD = 40) {
  const pr = project(line, x, y);
  if (pr.d > maxD) return 0;
  const h = pointAt(line, pr.s).heading;
  return Math.cos(angle - h) >= 0 ? 1 : -1;
}
