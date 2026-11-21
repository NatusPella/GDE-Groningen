// Wat in Bezit niet te koop is (epic #1095, #1102; ontwerp docs/BEZIT-21-11.md 6.1): de uitsluitlijst met een reden in het Nederlands
// ("Niet te koop: ..."), nooit een stille weigering. Alles is koopbaar, behalve wat het verhaal of een spelregel breekt. Puur: geen DOM,
// geen THREE, geen klok, geen opslag (scripts/businessexclusion_test.mjs). Data hier; de wereld (voorzieningen, haltes, missiedoelen) komt
// als parameter binnen zodat er geen import van zware modules nodig is.
//
// Een pand is een rij van de pandindex: { osm, x, y, m2, type, landmark }.

import { finite } from './bezithash.js';

// Tabel per soort (OSM-pandsoort) en per voorzieningsoort (facilities.js): code, reden. Alles hier is "niet te koop".
export const BEZIT_UITSLUITING = {
  byType: {
    hospital: ['zorg', 'hier staat de hulp en de plek waar je weer op de been komt'],
    clinic: ['zorg', 'hier staat de hulp en de plek waar je weer op de been komt'],
    fire_station: ['hulpdienst', 'de brandweer moet blijven rukken'],
    police: ['hulpdienst', 'aanhouding en politie hangen aan dit bureau'],
    ambulance_station: ['hulpdienst', 'de ambulance heeft dit adres nodig'],
    train_station: ['reizen', 'de reisritten van het verhaal lopen via het station'],
    station: ['reizen', 'de reisritten van het verhaal lopen via het station'],
    bus_station: ['reizen', 'de reisritten lopen via het busstation'],
    transportation: ['reizen', 'de reisritten lopen via dit knooppunt'],
  },
  byFacility: {
    hospital: ['zorg', 'hier staat de hulp en de plek waar je weer op de been komt'],
    gppost: ['zorg', 'de huisartsenpost hoort bij de hulp in het spel'],
    ambulance: ['hulpdienst', 'de ambulance heeft dit adres nodig'],
    police: ['hulpdienst', 'aanhouding en politie hangen aan dit bureau'],
    fire: ['hulpdienst', 'de brandweer moet blijven rukken'],
    busstation: ['reizen', 'de reisritten lopen via het busstation'],
    trainstation: ['reizen', 'de reisritten van het verhaal lopen via het station'],
    busstop: ['reizen', 'de halte hoort bij het openbaar vervoer'],
  },
  // een lijst van ID's (OSM) met een eigen reden: de koppeling van een verhaalplek aan een pand die de data nog niet kent
  ids: [],
  // verhaalplekken met een eigen eigenaar in de tekst: de naam komt uit de pandnaam of de winkelplek
  storyNames: ['Fjord Frituur', 'De Zonnehoek', 'Boerderij De Zonnehoek', 'Notariaat De Zegelhoek'],
};

// De woorden van de redenen (voor de test: Nederlands, zonder merken).
export const REASONS = {
  zorg: 'Niet te koop: de hulp en de plek waar je weer op de been komt hangen aan dit pand.',
  hulpdienst: 'Niet te koop: dit is een hulpdienst die het spel nodig heeft.',
  reizen: 'Niet te koop: reisritten van het verhaal lopen via dit pand.',
  missie: 'Niet te koop: dit pand is het doel van een opdracht.',
  missieStraks: 'Niet te koop: hier speelt een opdracht die nog komt.',
  verhaal: 'Niet te koop: dit is een plek met een eigen eigenaar in het verhaal.',
  eigen: 'Dit is al van jou: je eigen huis.',
  id: 'Niet te koop.',
};
export const MISSION_RADIUS = 28;     // m: zo dichtbij een missiedoel hoort een pand bij die opdracht
export const STORY_RADIUS = 20;       // m rond een verhaalplek
export const HOME_RADIUS = 12;        // m rond je safehuis of eigen huis

const near = (b, s, r) => Math.hypot(finite(b.x, 1e9) - finite(s.x, -1e9), finite(b.y, 1e9) - finite(s.y, -1e9)) <= (s.r > 0 ? s.r : r);

// Missiedoelen uit de definities: elk punt { x, y } dat een opdracht aanwijst (target.at, start, waypoints, checkpoints), met zijn akte (via actOf(def))
// en id. Loopt recursief door de defs; neemt ook losse { at: [x, y] } mee. Geeft [{ x, y, id, act }].
// Doelen die via een naam gaan (landmark, shop) heeft de wereld nodig: die geeft de aanroeper mee als extra spots (ctx.extraSpots).
export function missionSpotsFrom(defs, actOf = () => 0) {
  const out = [], seen = new Set();
  const add = (x, y, id, act) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return;
    const k = `${Math.round(x)}|${Math.round(y)}|${id}`;
    if (seen.has(k)) return;
    seen.add(k); out.push({ x, y, id, act });
  };
  const walk = (o, id, act, depth) => {
    if (!o || typeof o !== 'object' || depth > 8) return;
    if (Array.isArray(o)) { if (o.length === 2 && Number.isFinite(o[0]) && Number.isFinite(o[1]) && depth > 0) add(o[0], o[1], id, act); else for (const v of o) walk(v, id, act, depth + 1); return; }
    if (Array.isArray(o.at) && o.at.length === 2) add(o.at[0], o.at[1], id, act);
    if (Number.isFinite(o.x) && Number.isFinite(o.y)) add(o.x, o.y, id, act);
    for (const k of Object.keys(o)) if (k !== 'at' && k !== 'kaart') walk(o[k], id, act, depth + 1);
  };
  for (const d of Array.isArray(defs) ? defs : []) {
    if (!d || d.retired) continue;
    walk(d, d.label || d.id || '?', actOf(d), 0);
  }
  return out;
}

// Is dit pand te koop? Geeft null als het te koop is, anders { code, reason } met de Nederlandse reden.
// ctx (alles optioneel):
//   facilityAt(x, y, r) -> soort ('hospital', 'police', ...) of null    voorzieningen uit de wereld (facilities.js)
//   missionSpots   [{ x, y, id, act, r? }]   uit missionSpotsFrom (en extra spots uit landmark- en winkelnamen)
//   act            de huidige akte (1 tot 5): een spot van een akte die voorbij is, komt vrij
//   activeGoal     { x, y }   het huidige missiedoel: nooit te koop, ook niet in een afgesloten akte
//   storySpots     [{ x, y, name, r? }]   verhaalplekken met een eigen eigenaar
//   nameOf(osm)    de naam van het pand (voor de verhaalnamen)
//   home           [{ x, y }]   je safehuis en eigen huis
//   manage         true: monumenten en landmarks zijn te koop als 'Beheer' (standaard); false: dan ook niet te koop
export function excluded(b, ctx = {}) {
  if (!b || !Number.isFinite(b.osm)) return { code: 'id', reason: REASONS.id };
  for (const e of BEZIT_UITSLUITING.ids) if (e.osm === b.osm) return { code: 'id', reason: e.reason || REASONS.id };
  const t = String(b.type || '');
  const byType = BEZIT_UITSLUITING.byType[t];
  if (byType) return { code: byType[0], reason: REASONS[byType[0]] };
  if (typeof ctx.facilityAt === 'function') {
    const f = ctx.facilityAt(b.x, b.y, Math.max(12, Math.sqrt(finite(b.m2, 0)) * 0.8));
    const row = f && BEZIT_UITSLUITING.byFacility[f];
    if (row) return { code: row[0], reason: REASONS[row[0]] };
  }
  for (const h of ctx.home || []) if (near(b, h, HOME_RADIUS)) return { code: 'eigen', reason: REASONS.eigen };
  if (ctx.activeGoal && near(b, ctx.activeGoal, MISSION_RADIUS)) return { code: 'missie', reason: REASONS.missie };
  const act = finite(ctx.act, 1);
  for (const s of ctx.missionSpots || []) {
    if (!near(b, s, MISSION_RADIUS)) continue;
    if (finite(s.act, 0) > 0 && act > s.act) continue;          // de akte is voorbij: het pand komt vrij
    return { code: 'missie', reason: finite(s.act, 0) > act ? REASONS.missieStraks : REASONS.missie };
  }
  for (const s of ctx.storySpots || []) if (near(b, s, STORY_RADIUS)) return { code: 'verhaal', reason: REASONS.verhaal };
  if (typeof ctx.nameOf === 'function') {
    const nm = String(ctx.nameOf(b.osm) || '');
    if (nm && BEZIT_UITSLUITING.storyNames.some((s) => nm.includes(s))) return { code: 'verhaal', reason: REASONS.verhaal };
  }
  if (ctx.manage === false && (b.landmark || /^(church|chapel|cathedral|monastery|civic|government)$/.test(t))) return { code: 'monument', reason: 'Niet te koop: een monument.' };
  return null;
}
export const isBuyable = (b, ctx) => !excluded(b, ctx);

// Monumenten en landmarks zijn wel te koop, maar alleen als "Beheer": geen sloop, geen aanbouw, altijd toegankelijk (ontwerp 6.1).
export const isManagementOnly = (b) => !!b && (!!b.landmark || /^(church|chapel|cathedral|monastery|civic|government|museum|theatre)$/.test(String(b.type || '')));
export const BEHEER_TEXT = 'Beheer: je beheert dit monument. Geen sloop, geen aanbouw en het blijft voor iedereen toegankelijk.';

// De kaartregel voor een pand dat niet te koop is, met de reden.
export const excludedLabel = (b, ctx) => { const e = excluded(b, ctx); return e ? e.reason : ''; };
