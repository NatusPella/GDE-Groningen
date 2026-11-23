// De aankleding van een monumentgebied (heritagearea.js, #953): kanonnen, kogelstapels en tonnen op de bolwerken, lindebomen
// rond het Marktplein, banken, vlaggen bij de poorten, historische lantaarns langs de straten en een paar figuranten in
// historische kleding. Zuiver: de plek van elk onderdeel is data of een formule, zonder kaart of THREE. De tekenlaag
// (monumentdecor3d.js) geeft het plan aan missiedecor.js (registreerAankleding), dat props en mensen bouwt, de mensen laat
// ademen en alles weer opruimt. Een onderdeel op water of in een gebouw valt daar weg (missiedecor.js `droog`); de test
// (scripts/monumentdecor_test.mjs) legt de plekken naast de tegels en eist ook droge, vrije grond buiten de weg.
//
// Samen spelen: de wereld is van de host, de aankleding is overal dezelfde (data, geen toeval): geen netwerkwijziging.
import { HERITAGE_AREAS } from './heritagearea.js';
import { isInWater } from './util.js';
import { onGroundRoad, inBuildingAt } from './propfilter.js';

const R1 = (v) => Math.round(v * 10) / 10;

// Ankers in de vesting (wereldmeters, RD-vlak van de kaart): de bolwerken van M30 (missions_akte6.js BOURTANGE), het Marktplein,
// de poorten en het molenbastion. De test houdt ze gelijk aan de missie.
export const ANKERS = {
  plein: [42470, 22806],
  bolwerken: [[42583, 22679], [42489, 22952], [42319, 22859]],
  munsterschePoort: [42492, 22881],
  frieschePoort: [42499, 22725],
  molenbastion: [42442, 22704],
};

// Straten (de wegen van de kaart; Kazernestraat tot Kapitein Prottstraat) waarlangs een lantaarn kan staan.
export const STRATEN = [
  { n: 'Kazernestraat', a: [42401, 22806], b: [42465, 22806] },
  { n: 'Meestraat', a: [42413, 22850], b: [42468, 22810] },
  { n: 'Commandeurstraat', a: [42440, 22898], b: [42470, 22814] },
  { n: 'Bisschopsweg', a: [42494, 22878], b: [42475, 22813] },
  { n: 'Kruitstraat', a: [42480, 22807], b: [42545, 22809] },
  { n: 'Vestingstraat', a: [42479, 22812], b: [42546, 22863] },
  { n: 'Batterijenstraat', a: [42476, 22801], b: [42497, 22736] },
  { n: 'Kapitein Prottstraat', a: [42471, 22799], b: [42451, 22735] },
];

export const LAMP_SPACING_M = 22; // m tussen twee lantaarns langs een straat
export const LAMP_SIDE_M = 2.6;    // m van de middellijn (een straat is 3 tot 4 m breed)

// Alle onderdelen in wereldmeters: { kind, x, y, a } (a = kijkrichting in radialen). Deterministisch.
export function monumentDecorItems(zoneId = 'bourtange') {
  const area = HERITAGE_AREAS.find((z) => z.id === zoneId);
  if (!area || !area.decor || area.id !== 'bourtange') return [];
  const [zx, zy] = area.at;
  const items = [];
  const add = (kind, x, y, a = 0) => items.push({ kind, x: R1(x), y: R1(y), a: R1(a) });

  // de bolwerken: drie kanonnen naar buiten, een kogelstapel en twee tonnen
  for (const [bx, by] of ANKERS.bolwerken) {
    const out = Math.atan2(by - zy, bx - zx);
    const tx = -Math.sin(out), ty = Math.cos(out);
    for (const k of [-1, 0, 1]) add('kanon', bx + Math.cos(out) * 6 + tx * 4.5 * k, by + Math.sin(out) * 6 + ty * 4.5 * k, out);
    add('kogels', bx + Math.cos(out) * 4 + tx * 9, by + Math.sin(out) * 4 + ty * 9, 0);
    add('ton', bx + Math.cos(out) * 3.5 - tx * 9, by + Math.sin(out) * 3.5 - ty * 9, 0);
    add('ton', bx + Math.cos(out) * 4.4 - tx * 10, by + Math.sin(out) * 4.4 - ty * 10, 0.5);
  }
  // het molenbastion
  {
    const [mx, my] = ANKERS.molenbastion;
    const out = Math.atan2(my - zy, mx - zx);
    add('kanon', mx + Math.cos(out) * 9 + 3, my + Math.sin(out) * 9, out);
    add('kanon', mx + Math.cos(out) * 9 - 6, my + Math.sin(out) * 9, out);
    add('kogels', mx + Math.cos(out) * 8, my + Math.sin(out) * 8 + 4, 0);
  }
  // de poorten: een vlag aan weerszijden
  for (const [px, py] of [ANKERS.munsterschePoort, ANKERS.frieschePoort]) {
    const out = Math.atan2(py - zy, px - zx);
    const tx = -Math.sin(out), ty = Math.cos(out);
    for (const k of [-1, 1]) add('vaandel', px + tx * 3.6 * k - Math.cos(out) * 3, py + ty * 3.6 * k - Math.sin(out) * 3, 0);
  }
  // het Marktplein: veertien lindebomen in een kring (zoveel staan er echt), vier banken en een paar tonnen
  const [mx, my] = ANKERS.plein;
  // #1203: op de rand van het plein (heritagearea.js plein.ring), niet half in het midden: het monument blijft vrij in beeld
  const ring = (area.plein && area.plein.ring) || 15;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    add('linde', mx + Math.cos(a) * ring, my + Math.sin(a) * ring, a);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    add('bank', mx + Math.cos(a) * 10.5, my + Math.sin(a) * 10.5, a + Math.PI / 2);
  }
  add('ton', mx + 9, my - 9, 0);
  add('ton', mx - 9, my + 9.5, 0.6);
  // lantaarns langs de straten, afwisselend links en rechts, niet vlak bij het kruispunt
  for (const s of STRATEN) {
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let side = 1;
    for (let d = 8; d <= len - 6; d += LAMP_SPACING_M, side = -side) {
      add('lantaarn', s.a[0] + ux * d - uy * LAMP_SIDE_M * side, s.a[1] + uy * d + ux * LAMP_SIDE_M * side, 0);
    }
  }
  return items;
}

// De figuranten: wandelaars in de kleding van een rol 'historisch' (clothingdata.js), vaste zaden, stil of pratend, bij het plein,
// de poorten en de wal. Geen echte personen; geen uniform.
export const FIGURANTEN = [
  { at: [42462, 22810], seed: 9101, variant: 'male', anim: 'talk', a: 0.4 },
  { at: [42464, 22812], seed: 9102, variant: 'female', anim: 'talk', a: 3.6 },
  { at: [42485, 22796], seed: 9103, variant: 'female', anim: 'idle', a: 1.2 },
  { at: [42496, 22878], seed: 9104, variant: 'male', anim: 'idle', a: 2.2 },
  { at: [42502, 22734], seed: 9105, variant: 'male', anim: 'idle', a: -1.0 },
  { at: [42446, 22710], seed: 9106, variant: 'female', anim: 'talk', a: 0.9 },
  { at: [42448, 22712], seed: 9107, variant: 'male', anim: 'point', a: 4.0 },
];

// De formules geven een plek bij benadering; de kaart weet wat er echt ligt. `fitMonumentDecor` zet elk onderdeel op de
// dichtstbijzijnde vrije plek (binnen `reach` m): droog, niet in een gebouw en niet op een weg (een lantaarn mag langs de
// straat staan, dus op een voetpad; al het andere staat ook naast de paden). Wat nergens past valt weg. Deterministisch:
// dezelfde tegels geven dezelfde plekken voor elke speler.
const MIN_GAP = { linde: 4.5, kanon: 2.2, lantaarn: 6, bank: 2.5, ton: 1.1, kogels: 1.3, vaandel: 2.5 };
const ROAD_MARGIN = { lantaarn: 0.3 };
const ON_FOOT = { lantaarn: false };
export function fitMonumentDecor(map, items, { reach = 8, step = 1.5 } = {}) {
  if (!map) return items.slice();
  const free = (kind, x, y) => {
    if (isInWater(map, x, y)) return false;
    if (inBuildingAt(map, x, y, kind === 'lantaarn' ? 0.6 : 0.8)) return false;
    return !onGroundRoad(map, x, y, ROAD_MARGIN[kind] ?? 0.6, { foot: ON_FOOT[kind] ?? true });
  };
  const out = [];
  const taken = (kind, x, y) => out.some((o) => Math.hypot(o.x - x, o.y - y) < Math.max(MIN_GAP[kind] || 1.5, MIN_GAP[o.kind] || 1.5) * (o.kind === kind ? 1 : 0.5));
  for (const it of items) {
    let spot = null;
    for (let r = 0; r <= reach && !spot; r += step) {
      const n = r === 0 ? 1 : Math.ceil((r * 2 * Math.PI) / step);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + (it.x + it.y) * 0.37; // een vaste draai per onderdeel: geen rij op één lijn
        const x = it.x + Math.cos(a) * r, y = it.y + Math.sin(a) * r;
        if (!free(it.kind, x, y) || taken(it.kind, x, y)) continue;
        spot = { x: R1(x), y: R1(y) };
        break;
      }
    }
    if (spot) out.push({ ...it, ...spot });
  }
  return out;
}

// Het plan in de vorm van missiedecor.js (langs = x, opzij = y vanaf het anker, met hoek 0): { props, people }. `items`: de
// onderdelen die op de kaart passen (fitMonumentDecor); zonder: de formule zelf.
export function monumentDecorPlan(zoneId = 'bourtange', items = null) {
  const area = HERITAGE_AREAS.find((z) => z.id === zoneId);
  if (!area) return null;
  const [zx, zy] = area.at;
  const props = (items || monumentDecorItems(zoneId)).map((o) => ({ kind: o.kind, along: R1(o.x - zx), side: R1(o.y - zy), a: -o.a }));
  const people = FIGURANTEN.map((f) => ({
    look: { shirt: [0x7a5a3a, 0x5a6a4a, 0x8a4a34, 0x4a5a6a, 0x6a5a4a][f.seed % 5], skin: [0xf1c9a5, 0xd9a06e, 0xa9744a][f.seed % 3], seed: f.seed, variant: f.variant, role: 'historisch' },
    along: R1(f.at[0] - zx), side: R1(f.at[1] - zy), a: -f.a, anim: f.anim,
  }));
  return { props, people };
}

// Zo vaak staat een soort in het plan (voor de test en het hertest-rapport).
export function monumentDecorCounts(zoneId = 'bourtange') {
  const out = {};
  for (const o of monumentDecorItems(zoneId)) out[o.kind] = (out[o.kind] || 0) + 1;
  return out;
}
