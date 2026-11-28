// Voetbalparken uit de kaart en de lokale clubs (#1117, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 3b): puur, geen DOM en geen THREE (scripts/voetbalparken_test.mjs).
// De data is game/js/voetbalparkendata.js (scripts/world/build_voetbalparken.mjs: 281 parken bij 139 plaatsen, ongeveer 27 kB). Elke plaats met een park heeft één verzonnen club; het grootste park binnen 3 km
// is het thuispark, de rest zijn trainingsvelden (de club van de verhaalplaats heet vast De Hoekers: voetbalverhaal.js). De acht dichtstbijzijnde plaatsen bij het huis vormen de Talentenklasse. Geen echte clubnamen: acht sjablonen met een knipoog, nooit VV, SV, FC, SC of RKSV.
import { hashSeed } from './voetbalplayers.js';
import { STORY_PLACE_ID, STORY_VILLAGE_CLUB } from './voetbalverhaal.js';

export const HOME_WGS = Object.freeze({ lat: 53.2405, lon: 6.5335 });   // het huis in Paddepoel (Pleiadenlaan)
export const LOCAL_DIVISION_SIZE = 8;
export const NEAR_TRIP_M = 15000;                                        // ritten tot 15 km kosten één speldag, ver weg twee

// De acht sjablonen (A.4 van het ontwerp); `%` is de plaats. Het eerste sjabloon gebruikt een dorpsbijnaam.
const NICKNAMES = ['Meeuwen', 'Kieviten', 'Ganzen', 'Veenmollen', 'Dijkgravers', 'Paardenbloemen', 'Slootspringers', 'Brugwachters', 'Fietsenstallers', 'Boterhammen', 'Ooievaars', 'Zwanen'];
export const TEMPLATES = [
  (p, h) => `${adjective(p)} ${NICKNAMES[h % NICKNAMES.length]}`,
  (p) => `Wees Rap ${p}`,
  (p) => `Eendenkracht ${p}`,
  (p) => `Onderling Gezellig ${p}`,
  (p) => `Excuseer ${p}`,
  (p) => `Voorwaarts naar de Kroeg ${p}`,
  (p) => `Halfrood ${p}`,
  (p) => `Nooit Verlegen ${p}`,
];
const clean = (n) => String(n || '').replace(/^'t\s+/i, '').replace(/^de\s+/i, '').trim();
// "Winsum" wordt "Winsumer"; eindigt de naam op een klinker-e dan komt er alleen een r bij.
export function adjective(place) {
  const p = clean(place);
  if (/er$/i.test(p)) return p;
  return /e$/i.test(p) ? `${p}r` : `${p}er`;
}
export const localClubName = (placeId, placeName) => { if (placeId === STORY_PLACE_ID) return STORY_VILLAGE_CLUB; const h = hashSeed('club', placeId); return TEMPLATES[h % TEMPLATES.length](clean(placeName), h >>> 3); };

const hsl = (h, s, l) => { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255); };
const PATRONEN = ['effen', 'brede-streep', 'helften', 'smalle-streep'];

// De club van een plaats: stabiel id (`lc` plus het plaats-id), naam, palet en sterkte (30 tot 48: amateurs). De pool wordt nooit gespeeld, alleen bijgehouden.
export function clubForPlace(pl) {
  const h = hashSeed('club', pl.id);
  const clubName = localClubName(pl.id, pl.n);
  const hue = (h >>> 5) % 360;
  return {
    id: `lc${pl.id}`, naam: clubName, kort: clubName.length > 22 ? clubName.split(' ').slice(-1)[0] : clubName, division: 'pool', sterkte: 30 + (h >>> 9) % 19, budget: 8000 + ((h >>> 11) % 8) * 1000,
    shirt: hsl(hue, 0.55, 0.42), broek: hsl((hue + 180) % 360, 0.12, 0.9), keeper: hsl((hue + 120) % 360, 0.5, 0.5), patroon: PATRONEN[(h >>> 13) % PATRONEN.length], accent: 0xf4f1e8,
    placeId: pl.id, plaats: pl.n, kind: pl.k, x: pl.x, y: pl.y, park: pl.p[0], trainingsvelden: pl.p.slice(1),
  };
}

// De index uit de JSON: lijsten per plaats, een kaart op plaats-id en de clubs. Kapotte data geeft een lege index (de carrière valt dan terug op de zes vaste clubs).
export function makeParkIndex(raw) {
  const ok = raw && typeof raw === 'object' && raw.v === 1 && Array.isArray(raw.plaatsen);
  const places = (ok ? raw.plaatsen : []).filter((p) => p && Number.isFinite(p.id) && typeof p.n === 'string' && Number.isFinite(p.x) && Number.isFinite(p.y) && Array.isArray(p.p) && p.p.length && p.p.every((k) => Number.isFinite(k.x) && Number.isFinite(k.y) && Number.isFinite(k.r)));
  const clubs = places.map(clubForPlace);
  const byPlace = new Map(clubs.map((c) => [c.placeId, c]));
  const byId = new Map(clubs.map((c) => [c.id, c]));
  return { plaatsen: places, clubs, byPlace, byId, parkCount: places.reduce((s, p) => s + p.p.length, 0) };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// De dichtstbijzijnde clubs bij een punt (afstand tot het thuispark, dan het plaats-id): stabiel en deterministisch.
export function nearestClubs(index, pt, n = LOCAL_DIVISION_SIZE, exclude = null) {
  return index.clubs.filter((c) => !exclude || !exclude.has(c.id)).map((c) => ({ c, d: distance(c.park, pt) })).sort((a, b) => a.d - b.d || a.c.placeId - b.c.placeId).slice(0, n).map((x) => x.c);
}
// De Talentenklasse van de speler: de acht dichtstbijzijnde clubs bij het huis (de eerste is zijn club) en de pool met alle andere.
export function localDivision(index, home, size = LOCAL_DIVISION_SIZE) {
  const acht = nearestClubs(index, home, size);
  const ids = new Set(acht.map((c) => c.id));
  return { clubs: acht, pool: index.clubs.filter((c) => !ids.has(c.id)).sort((a, b) => a.placeId - b.placeId), home: acht[0] || null };
}
// De parken van de Terpklasse (de grotere plaatsen): de steden en dorpen (kind city en town) met een park, op plaats-id; vol maken met de grootste andere plaatsen.
export function terpParks(index, n = 8) {
  const rang = { city: 0, town: 1, village: 2, hamlet: 3 };
  return index.clubs.slice().sort((a, b) => (rang[a.kind] ?? 9) - (rang[b.kind] ?? 9) || b.park.a - a.park.a || a.placeId - b.placeId).slice(0, n).map((c) => ({ placeId: c.placeId, plaats: c.plaats, park: c.park }));
}
// Reizen: de afstand in meters tussen twee parken, de kosten in speldagen (1 tot 15 km, anders 2) en de reistijd met een bijtijdse schatting (fiets 15 km/u, auto 50 km/u).
export function travel(from, to) {
  const m = Math.round(distance(from, to));
  return { m, days: m <= NEAR_TRIP_M ? 1 : 2, bikeMin: Math.round(m / 250), carMin: Math.round(m / 833) };
}
// Het veld van de sim op het park: middelpunt, hoek (de lengteas) en of het veld past (het grootste veld is groot genoeg voor 11 tegen 11: een veld van ongeveer 60 x 95 m is 5.700 m2).
export function pitchPlacement(park, size = { B: 56, L: 90 }) {
  const r = Number.isFinite(park.r) ? park.r : 0;
  const biggest = park.a / Math.max(1, park.f);
  return { x: park.x, y: park.y, angle: r, fits: biggest >= size.B * size.L * 0.8, over: biggest < size.B * size.L * 0.8 };
}

// Als de parkdata ontbreekt of kapot is: acht vaste plaatsen rond de stad met een eigen verzonnen club (geen echte clubnamen), zodat de carrière altijd kan starten. Het veld is dan een gewoon veld bij de plaats.
export const HOME_FALLBACK = Object.freeze({ x: -2174, y: -2246 });
const FALLBACK_PLACES = [['Haren', 1], ['Hoogkerk', 2], ['Eelde', 3], ['Winsum', 4], ['Zuidhorn', 5], ['Bedum', 6], ['Ten Boer', 7], ['Leek', 8]];
export function fallbackIndex() {
  const places = FALLBACK_PLACES.map(([n, k], i) => ({ id: 9000000 + k, n, k: 'village', x: HOME_FALLBACK.x + (i - 3.5) * 900, y: HOME_FALLBACK.y + (i % 2 ? 700 : -700), p: [{ x: HOME_FALLBACK.x + (i - 3.5) * 900, y: HOME_FALLBACK.y + (i % 2 ? 700 : -700), r: 0, f: 1, a: 9000, c: 0, l: 0 }] }));
  return makeParkIndex({ v: 1, plaatsen: places });
}
