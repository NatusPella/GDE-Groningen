// De plek van het containerlabyrint (M13) in de Eemshaven (#928, #1035). De missie
// zocht container 4471 op een punt 260 m van de kade, in het gras; er stond
// niets. Daarna stond de kraan in een weiland en de container op de weg, omdat de
// plekken losse offsets van een gok waren. Nu hangt alles aan één anker: de oostkade
// van het havenbekken (de tegels hebben daar water tot x = 18930 en een kaderweg 40 m
// landinwaarts). De kraan staat op de strook tussen water en kaderweg, het containerveld
// op het open terrein achter die weg. Hier staat waar de kade, de kraan, de container en
// Lammert liggen, als één bron voor de missiestappen (missions_nieuw.js) en de rekwisieten
// (containerterminal.js). Puur: geen THREE, geen DOM, zodat de missietests hem zonder
// wereld kunnen lezen. scripts/world/mission_prop_audit.mjs meet de plekken tegen de tegels.
import { wgsToWorld } from './rdnew.js';
import { spotClear } from './missionplace.js';

// Het anker: op de oever van de oostkade (53,4432 N; 6,8562 O), zonder weg, water of gebouw eromheen.
export const M13_ANCHOR_WGS = Object.freeze([53.4432, 6.8562]);
const [BX, BY] = wgsToWorld(M13_ANCHOR_WGS[0], M13_ANCHOR_WGS[1]);
const plek = (dx, dy) => ({ x: BX + dx, y: BY + dy, road: null });

// De kade waar Lammert wacht (het startpunt van de missie): het open terrein achter de kaderweg.
export const M13_QUAY = plek(60, 90);
// De kraankooi waar je stil moet blijven staan: op de strook tussen water en kaderweg.
export const M13_CRANE = plek(11, 18);
// Container 4471: het doel van de zoekstap en van het verwisselen van de papieren.
export const M13_CONTAINER = plek(95, 15);
// Lammert, aan de kade, voor de terugweg.
export const M13_LAMMERT = plek(66, 94);
// Hoe ver het hele plan van het anker af mag staan, ook na een verschuiving (de test en de audit).
export const M13_MAX_ANCHOR_DIST = 160;

const container = (dx, dy, lengte, kleur, stapel = 0) => ({
  x: M13_CONTAINER.x + dx, y: M13_CONTAINER.y + dy, lengte, kleur, stapel,
});

// De stapel: de blauwe 4471 staat midden op het doel, de rode ernaast; twee
// andere containers liggen eromheen, één op de stapel. Alles in de low-poly
// kleuren van de haven (DESIGN_SYSTEM.md), geen echte rederij.
export const CONTAINER_STACKS = Object.freeze([
  container(0, 0, 12.2, '#2d6a86'),        // de blauwe van 4471
  container(0, 3.0, 12.2, '#d55e00'),      // de rode ernaast
  container(13.5, 0.4, 6.1, '#34562c', 1), // groene, op de stapel
  container(-13.0, -2.2, 12.2, '#b8703a'), // oranje, aan de andere kant
]);

// De kabelrollen en de kraan horen bij het beeld van de kade; de kooi is de
// plek waar de missie je laat wachten.
export const CABLE_REELS = Object.freeze([
  { x: M13_CRANE.x + 5.5, y: M13_CRANE.y - 3.2, r: 1.6 },
  { x: M13_CRANE.x + 8.0, y: M13_CRANE.y - 6.5, r: 1.2 },
]);

// Alle plekken van het plan met de ruimte die ze nodig hebben: [naam, x, y, straal]. De stapel telt met
// zijn lengte mee; de kraankooi met zijn voet en de kabelrollen met hun straal.
export function m13Footprints() {
  const out = [['kade', M13_QUAY.x, M13_QUAY.y, 3], ['Lammert', M13_LAMMERT.x, M13_LAMMERT.y, 3], ['kraan', M13_CRANE.x, M13_CRANE.y, 3]];
  for (const r of CABLE_REELS) out.push(['kabelrol', r.x, r.y, r.r + 0.5]);
  for (const c of CONTAINER_STACKS) {
    // het midden en de vier hoeken van de bak, een halve meter ruim
    const hl = c.lengte / 2 + 0.5, hw = 1.75;
    for (const [dx, dy] of [[0, 0], [-hl, -hw], [hl, -hw], [-hl, hw], [hl, hw]]) out.push(['container', c.x + dx, c.y + dy, 0]);
  }
  // het schelpenpad onder de stapel (46 x 26 m) en de kadevloer onder de kraan (16 x 14 m): de hoeken
  for (const [dx, dy] of [[-23, -13], [23, -13], [-23, 13], [23, 13]]) out.push(['pad', M13_CONTAINER.x + dx, M13_CONTAINER.y + dy, 0]);
  for (const [dx, dy] of [[-8, -7], [8, -7], [-8, 7], [8, 7]]) out.push(['kadevloer', M13_CRANE.x + dx, M13_CRANE.y + dy, 0]);
  return out;
}

// Klopt het plan met deze map? Lijst van [naam, x, y] die niet vrij zijn (leeg = geldig).
export function m13Problems(map) {
  return m13Footprints().filter(([, x, y, r]) => !spotClear(map, x, y, r)).map(([n, x, y]) => [n, x, y]);
}

// Het plan als één groep verschuiven naar de dichtstbijzijnde plek waar alles vrij is. Deterministisch:
// dezelfde wereld geeft dezelfde verschuiving, ook voor de gasten van Samen spelen (vaste ringen, vaste
// volgorde). Null als het plan al klopt, of als er binnen maxD niets is.
export function shiftM13Plan(map, { maxD = 120, step = 6 } = {}) {
  if (!m13Problems(map).length) return null;
  const fp = m13Footprints();
  const ok = (dx, dy) => fp.every(([, x, y, r]) => spotClear(map, x + dx, y + dy, r));
  for (let d = step; d <= maxD; d += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * d) / step));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI;
      const dx = Math.round(Math.sin(a) * d), dy = Math.round(-Math.cos(a) * d);
      if (ok(dx, dy)) return { dx, dy };
    }
  }
  return null;
}

// Mag het plan nu over een verschuiving beslissen? Pas als de rijen van ALLE tegels rond het plan in de rasters zitten (niet alleen
// "in het geheugen": resident staat al aan zodra de eerste rijen binnengaan) en over de hele zoekstraal van shiftM13Plan (maxD 120 +
// de grootste voetafdruk) in plaats van een kleine +-40 m. Zo beslist een host of een gast die later laadt op dezelfde gegevens,
// en nooit op een half gevulde kaart (code-review 21-11). `tileIndexOf(x, y)` geeft [i, j]; map.tileRowsDone(i, j) of resident.
export const M13_DECIDE_RADIUS_M = 150;
export function m13DecisionReady(map, center, tileIndexOf, radius = M13_DECIDE_RADIUS_M) {
  if (!map || !center) return false;
  const done = (x, y) => { const [i, j] = tileIndexOf(x, y); return map.tileRowsDone ? map.tileRowsDone(i, j) : !!(map.resident && map.resident.has(`${i},${j}`)); };
  for (const dx of [-radius, 0, radius]) for (const dy of [-radius, 0, radius]) if (!done(center.x + dx, center.y + dy)) return false;
  return true;
}

// Past de verschuiving toe op de plekken zelf; de rekwisieten en de missiestappen lezen dezelfde objecten.
export function applyM13Shift({ dx, dy }) {
  const all = [M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT, ...CONTAINER_STACKS, ...CABLE_REELS];
  for (const p of all) { p.x += dx; p.y += dy; }
}
