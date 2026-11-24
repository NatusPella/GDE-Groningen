// World life (21-11, epic "Wereld levend"): daily events and animal life in Groningen, per calendar day.
// Market on the Vismarkt, street artists, student parties, a kermis, walking groups, joggers, photographing
// tourists, and ducks, sheep, pigeons and swallows. docs/WERELD-LEVEN-21-11.md.
//
// Pure function of the calendar day and the clock: no THREE, no randomness source, no network traffic. Everyone
// with the same day and clock sees the same events on the same spots (Samen spelen: a guest lives on the host's
// day and clock, net/speelklok.js). Only the small walking animation and the timing of a bubble use a local
// animation time (`tSec`, cosmetic, not synced).
//
//   const roster = lifeRoster(day, hour, { x, y, r });     // who is where today (heavy; cache per day and ten minutes)
//   lifePose(actor, tSec, out);                            // where he stands right now (cheap, every frame)
//   const talk = lifeSpeakers(roster, px, py, tSec, day);  // at most two bubbles near the player
//
// Reuses the NPC role pools of the clothing (clothing.js: wandelaar, sporter, toerist, student, feestganger,
// winkelier) via the role names and the summer variation of the weather (summerday.js: rain, heat).
// The render side (worldlife3d.js) draws everything in a fixed number of instanced meshes.

import { weekdayOf } from './calendar.js';
import { summerLayer } from './summerday.js';
import { LIFE_LINES, ANIMAL_LINES } from './worldlifelines.js';

// Fixed limits (the test guards them): the layer adds at most this to the picture.
export const LIFE_LIMITS = Object.freeze({
  extraDrawCalls: 25, // #1330: real people (2 rigs x 3 looks x 4 poses, worldlife3d.js PEOPLE_MESHES, only the used ones draw) + animals. Bubbles are DOM, 0 calls
  maxPeople: 96,
  maxAnimals: 64,
  maxBubbles: 2, // at most two bubbles at once
  bubbleRangeM: 16, // only people this close to the player speak
  nearM: 230, // events further away than this (plus their place) are not drawn at all
});

// The places (the same coordinates cityprops.js and parkplekken.js use for the markets and the Noorderplantsoen).
export const LIFE_PLACES = Object.freeze({
  vismarkt: { name: 'Vismarkt', x: 21.21, y: 245.59, r: 38 },
  grotemarkt: { name: 'Grote Markt', x: 162.77, y: 76.17, r: 34 },
  nieuwemarkt: { name: 'Nieuwe Markt', x: 290, y: 74, r: 24 },
  plantsoen: { name: 'Noorderplantsoen', x: 120.88, y: -725.14, r: 55 },
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wrap24 = (h) => ((h % 24) + 24) % 24;

// Deterministic 0..1 value for a number and a channel (integer hash, no sin: same result on every platform).
function h01(n, channel) {
  let a = (Math.imul((n | 0) + 1, 0x9E3779B1) ^ Math.imul((channel | 0) + 7, 0x85EBCA6B)) >>> 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

// --- the events ----------------------------------------------------------------------------------------------------
// plan(day) -> null or { windows: [[from, to]] (hours, to > 24 runs past midnight), count, variant }.
// spot: { dx, dy, r } relative to the place, so events on one place do not stand in each other's way.
// roles: weights of the clothing roles (clothing.js ROLE_POOLS), the first actor of a `lead` event is the leader.
// weather(layer) -> 0..1 factor of the crowd in this weather (summerday.js layer: rain, heat, kind).
const dry = (l) => (l.rain > 0.35 ? 0 : 1);
const lessInRain = (k) => (l) => (l.rain > 0.35 ? k : 1);
const fairDay = (l) => (l.kind === 'helder' || l.kind === 'zacht' || l.kind === 'bries' || l.kind === 'hitte' ? 1 : 0);

export const LIFE_EVENTS = Object.freeze([
  { id: 'markt', name: 'Markt op de Vismarkt', kind: 'people', place: 'vismarkt', spot: { dx: 0, dy: 0, r: 22 }, motion: 'wander', lines: 'markt',
    roles: { winkelier: 3, voetganger: 5, toerist: 2, wandelaar: 1 }, weather: lessInRain(0.5),
    plan: (d) => ([2, 5, 6].includes(weekdayOf(d)) ? { windows: [[8, 17]], count: 18, variant: Math.floor(h01(d, 12) * 3) } : null) },
  { id: 'artiest', name: 'Straatartiest op de Grote Markt', kind: 'people', place: 'grotemarkt', spot: { dx: 6, dy: -4, r: 7 }, motion: 'ring', lead: 'voetganger', lines: 'artiest',
    roles: { voetganger: 4, toerist: 3, student: 1 }, weather: dry,
    plan: (d) => { if (h01(d, 11) >= 0.6) return null; const f = 11 + Math.floor(h01(d, 13) * 6); return { windows: [[f, f + 3]], count: 9, variant: Math.floor(h01(d, 14) * 3) }; } },
  { id: 'studentenfeest', name: 'Studentenfeest in het Noorderplantsoen', kind: 'people', place: 'plantsoen', spot: { dx: 26, dy: 8, r: 11 }, motion: 'wander', lines: 'studentenfeest',
    roles: { student: 6, feestganger: 4, voetganger: 1 }, weather: lessInRain(0.7),
    plan: (d) => { const wd = weekdayOf(d); const chance = wd === 4 || wd === 5 || wd === 6 ? 0.75 : 0.22; return h01(d, 15) < chance ? { windows: [[20, 26]], count: 16, variant: 0 } : null; } },
  { id: 'kermis', name: 'Kermis op de Nieuwe Markt', kind: 'people', place: 'nieuwemarkt', spot: { dx: 0, dy: 0, r: 15 }, motion: 'carousel', lines: 'kermis',
    roles: { voetganger: 4, student: 2, feestganger: 2, toerist: 1 }, weather: lessInRain(0.5),
    plan: (d) => (h01(Math.floor((d + 1) / 3), 16) < 0.34 ? { windows: [[14, 23.5]], count: 20, variant: 0 } : null) },
  { id: 'wandelgroep', name: 'Wandelgroep in het Noorderplantsoen', kind: 'people', place: 'plantsoen', spot: { dx: -20, dy: 6, r: 26 }, motion: 'path', lines: 'wandelgroep',
    roles: { wandelaar: 1 }, weather: dry,
    plan: (d) => { if (h01(d, 31) >= 0.55) return null; const f = 9 + Math.floor(h01(d, 32) * 3); return { windows: [[f, f + 2.5]], count: 7, variant: 0 }; } },
  { id: 'hardloper', name: 'Hardlopers in het Noorderplantsoen', kind: 'people', place: 'plantsoen', spot: { dx: 0, dy: 0, r: 40 }, motion: 'loop', lines: 'hardloper',
    roles: { sporter: 1 }, weather: lessInRain(0.6),
    plan: (d) => (h01(d, 41) < 0.8 ? { windows: [[6, 9], [17.5, 20]], count: 5, variant: 0 } : null) },
  { id: 'toerist', name: 'Fotograferende toeristen', kind: 'people', place: 'grotemarkt', spot: { dx: -8, dy: 10, r: 12 }, motion: 'pose', lines: 'toerist',
    roles: { toerist: 1 }, weather: lessInRain(0.6),
    plan: (d) => (h01(d, 51) < 0.85 ? { windows: [[10, 18]], count: 6, variant: 0 } : null) },
  { id: 'eenden', name: 'Eenden op de vijver', kind: 'animal', species: 'eend', place: 'plantsoen', spot: { dx: 8, dy: -6, r: 9 }, motion: 'swim',
    weather: () => 1, plan: (d) => ({ windows: [[6, 22]], count: 5 + Math.floor(h01(d, 71) * 6) + (h01(d, 72) < 0.4 ? 3 : 0), variant: h01(d, 72) < 0.4 ? 1 : 0 }) },
  { id: 'schapen', name: 'Schapen op het grasveld', kind: 'animal', species: 'schaap', place: 'plantsoen', spot: { dx: -62, dy: 22, r: 14 }, motion: 'graze',
    weather: () => 1, plan: (d) => (h01(d, 61) < 0.7 ? { windows: [[8, 20]], count: 4 + Math.floor(h01(d, 62) * 4), variant: 0 } : null) },
  { id: 'duiven-gm', name: 'Duiven op de Grote Markt', kind: 'animal', species: 'duif', place: 'grotemarkt', spot: { dx: -14, dy: -12, r: 14 }, motion: 'peck',
    weather: lessInRain(0.5), plan: (d) => ({ windows: [[6.5, 21.5]], count: 6 + Math.floor(h01(d, 81) * 8), variant: 0 }) },
  { id: 'duiven-vm', name: 'Duiven op de Vismarkt', kind: 'animal', species: 'duif', place: 'vismarkt', spot: { dx: 12, dy: 10, r: 13 }, motion: 'peck',
    weather: lessInRain(0.5), plan: (d) => ({ windows: [[6.5, 21.5]], count: 5 + Math.floor(h01(d, 82) * 7), variant: 0 }) },
  { id: 'zwaluwen', name: 'Zwaluwen boven de Vismarkt', kind: 'animal', species: 'zwaluw', place: 'vismarkt', spot: { dx: 0, dy: 0, r: 16 }, motion: 'air',
    weather: fairDay, plan: (d) => ({ windows: [[8, 21]], count: 4 + Math.floor(h01(d, 91) * 4), variant: 0 }) },
]);
export const EVENT_BY_ID = Object.freeze(Object.fromEntries(LIFE_EVENTS.map((e) => [e.id, e])));

// --- which events run now ----------------------------------------------------------------------------------------------
// Presence 0..1 of a plan at an hour (a slow fade over half an hour at both ends, so the crowd grows and thins out), also past midnight.
function presence(plan, hour) {
  let best = 0;
  for (const [from, to] of plan.windows) {
    for (const shift of [0, 24]) { // the early hours belong to the window of the evening before
      const h = wrap24(hour) + shift;
      const p = smooth(from, from + 0.5, h) * (1 - smooth(to - 0.5, to, h));
      if (p > best) best = p;
    }
  }
  return best;
}
// The plan that counts at this hour: today's, or yesterday's when its window runs past midnight.
function planAt(ev, day, hour) {
  const h = wrap24(hour);
  if (h < 6) { const y = ev.plan(day - 1); if (y && presence(y, h) > 0) return { plan: y, day: day - 1 }; }
  const t = ev.plan(day);
  return t ? { plan: t, day } : null;
}

// Which events run on this day and hour: [{ id, name, place, count, presence }], cheap (tests, calendar card, HUD).
export function lifeEvents(day, hour) {
  const layer = summerLayer(day, wrap24(hour));
  const out = [];
  for (const ev of LIFE_EVENTS) {
    const p = planAt(ev, day, hour);
    if (!p) continue;
    const pres = presence(p.plan, hour) * clamp01(ev.weather(layer));
    const count = Math.round(p.plan.count * pres);
    if (count < 1) continue;
    out.push({ id: ev.id, name: ev.name, kind: ev.kind, place: LIFE_PLACES[ev.place].name, count, presence: pres, variant: p.plan.variant, day: p.day });
  }
  return out;
}

// --- the actors ----------------------------------------------------------------------------------------------------------
function pickRole(weights, r) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let x = r * total;
  for (const k in weights) { x -= weights[k]; if (x < 0) return k; }
  return Object.keys(weights)[0];
}

// The roster of the day: every actor with his fixed home spot and motion kind. Heavy (hashes), so the caller caches it
// per (day, ten minutes) and per area. `near` { x, y, r }: only events within that range (r defaults to LIFE_LIMITS.nearM).
// Cap: LIFE_LIMITS.maxPeople and maxAnimals, in the order of LIFE_EVENTS (the markets and artists before the walkers).
export function lifeRoster(day, hour, near = null) {
  const layer = summerLayer(day, wrap24(hour));
  const hot = layer.heat > 0.5, rain = layer.rain > 0.2;
  const out = [];
  let people = 0, animals = 0;
  for (const ev of LIFE_EVENTS) {
    const p = planAt(ev, day, hour);
    if (!p) continue;
    const place = LIFE_PLACES[ev.place];
    if (near && Math.hypot(place.x - near.x, place.y - near.y) > (near.r ?? LIFE_LIMITS.nearM) + place.r) continue;
    const count = Math.round(p.plan.count * presence(p.plan, hour) * clamp01(ev.weather(layer)));
    const cx = place.x + ev.spot.dx, cy = place.y + ev.spot.dy;
    for (let i = 0; i < count; i++) {
      if (ev.kind === 'people' ? people >= LIFE_LIMITS.maxPeople : animals >= LIFE_LIMITS.maxAnimals) break;
      const key = `${ev.id}|${p.day}|${i}`;
      const s = hashStr(key);
      const a = h01(s, 1) * Math.PI * 2, rr = Math.sqrt(h01(s, 2)) * ev.spot.r;
      const actor = {
        id: key, ev: ev.id, kind: ev.kind, motion: ev.motion, seed: s, index: i, n: count,
        role: ev.kind === 'people' ? pickRole(ev.roles, h01(s, 3)) : null,
        species: ev.species || null,
        cx, cy, r: ev.spot.r, ang: a, rad: rr, phase: h01(s, 4) * 6.2832, speed: 0.6 + h01(s, 5) * 0.8,
        scale: ev.species ? (ev.id === 'eenden' && p.plan.variant === 1 && i >= count - 3 ? 0.6 : 1) : 0.9 + h01(s, 6) * 0.2,
        hot, rain, // for the outfit (clothing.js npcOutfit ctx)
        x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, z: 0, heading: a, pose: 0,
      };
      if (ev.lead && i === 0) { actor.role = ev.lead; actor.leader = true; actor.x = cx; actor.y = cy; actor.rad = 0; }
      out.push(actor);
      if (ev.kind === 'people') people++; else animals++;
    }
  }
  return out;
}

// The pose of an actor at local animation time tSec (seconds, cosmetic): writes x, y, z, heading and pose (0 stand, 1 walk, 2 act) into `out`.
export function lifePose(a, tSec, out = {}) {
  const t = tSec * a.speed + a.phase;
  let x = a.x, y = a.y, z = 0, heading = a.heading, pose = 0;
  switch (a.motion) {
    case 'ring': { // audience in a ring round the artist, the artist stands still and acts
      if (a.leader) { pose = 2; heading = Math.sin(tSec * 0.3) * 0.6; break; }
      const ang = a.index * 0.78 + 0.4, rad = 3 + (a.index % 3) * 0.9;
      x = a.cx + Math.cos(ang) * rad; y = a.cy + Math.sin(ang) * rad; heading = ang + Math.PI; pose = (Math.sin(t * 0.7) > 0.8) ? 2 : 0; break;
    }
    case 'loop': { // joggers: an ellipse round the park, one behind the other
      const len = 2 * Math.PI * a.r * 0.9, w = (2.8 / len) * Math.PI * 2;
      const ang = a.index * 0.7 + tSec * w;
      x = a.cx + Math.cos(ang) * a.r; y = a.cy + Math.sin(ang) * a.r * 0.8; heading = Math.atan2(Math.cos(ang) * a.r * 0.8, -Math.sin(ang) * a.r); pose = 1; break;
    }
    case 'path': { // a walking group: a slow ellipse, packed together
      const w = (1.1 / (2 * Math.PI * a.r * 0.9)) * Math.PI * 2;
      const ang = a.index * 0.12 + tSec * w, off = (a.index % 3) * 0.9 - 0.9;
      x = a.cx + Math.cos(ang) * (a.r + off); y = a.cy + Math.sin(ang) * (a.r * 0.8 + off); heading = Math.atan2(Math.cos(ang) * a.r * 0.8, -Math.sin(ang) * a.r); pose = 1; break;
    }
    case 'carousel': { // the first six ride the zweefmolen round the middle, the rest walk about
      if (a.index < 6) { const ang = a.index * 1.047 + tSec * 0.6; x = a.cx + Math.cos(ang) * 4.5; y = a.cy + Math.sin(ang) * 4.5; z = 1.1 + Math.sin(tSec * 1.2 + a.index) * 0.25; heading = ang + Math.PI / 2; pose = 2; break; }
      x = a.cx + Math.cos(a.ang) * a.rad + Math.sin(t * 0.21) * 3; y = a.cy + Math.sin(a.ang) * a.rad + Math.cos(t * 0.17) * 3; heading = a.ang + Math.sin(t * 0.21); pose = 1; break;
    }
    case 'wander': { // strolling about the spot
      x = a.x + Math.sin(t * 0.23) * 2.2; y = a.y + Math.cos(t * 0.19) * 2.2; heading = Math.atan2(Math.cos(t * 0.19), Math.sin(t * 0.23)); pose = Math.sin(t * 0.11) > -0.3 ? 1 : 0; break;
    }
    case 'pose': { // tourists stand and photograph, now and then they walk a step
      pose = Math.sin(t * 0.5) > 0.2 ? 2 : 0; heading = a.ang + Math.sin(t * 0.3) * 0.4; break;
    }
    case 'swim': { x = a.cx + Math.cos(t * 0.12 + a.ang) * a.rad; y = a.cy + Math.sin(t * 0.1 + a.ang) * a.rad * 0.8; heading = t * 0.12 + a.ang + Math.PI / 2; pose = 1; break; }
    case 'graze': { x = a.x + Math.sin(t * 0.05) * 1.2; y = a.y + Math.cos(t * 0.04) * 1.2; heading = a.ang; pose = Math.sin(t * 0.3) > 0.4 ? 1 : 2; break; }
    case 'peck': { const hop = Math.sin(t * 0.9); x = a.x + Math.sin(t * 0.13) * 1.6; y = a.y + Math.cos(t * 0.11) * 1.6; z = hop > 0.93 ? 0.2 : 0; heading = a.ang + t * 0.05; pose = hop > 0 ? 2 : 0; break; }
    case 'air': { const ang = t * 0.35 + a.index * 1.1; x = a.cx + Math.cos(ang) * (a.r + a.rad * 0.3); y = a.cy + Math.sin(ang) * (a.r + a.rad * 0.3); z = 10 + Math.sin(t * 0.7) * 2.5 + (a.index % 3) * 1.5; heading = ang + Math.PI / 2; pose = 1; break; }
    default: break;
  }
  out.x = x; out.y = y; out.z = z; out.heading = heading; out.pose = pose;
  return out;
}

// --- the bubbles ---------------------------------------------------------------------------------------------------------
const BUBBLE_PERIOD_S = [18, 34]; // a person speaks once per period, for BUBBLE_SHOW_S
const BUBBLE_SHOW_S = 4.2;

// The line of this actor in this cycle (deterministic), or null: people speak from their event's table, animals say a short sound.
export function lifeLine(actor, cycle) {
  const pool = actor.kind === 'people' ? linesFor(actor) : (ANIMAL_LINES[actor.species] || null);
  if (!pool || !pool.length) return null;
  // Verfijning 22-11: dezelfde regel twee beurten achter elkaar viel op. Nu loopt elke persoon met een eigen stap (ggd 1 met de lijst) door de lijst:
  // opeenvolgende beurten verschillen altijd en alle regels komen langs voor er één terugkomt.
  const n = pool.length, h = hashStr(actor.id);
  let step = n > 1 ? 1 + (h >>> 8) % (n - 1) : 0;
  while (n > 1 && gcd(step, n) !== 1) step = step % (n - 1) + 1;
  return pool[((h % n) + (((cycle % n) + n) % n) * step) % n];
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function linesFor(actor) {
  const t = LIFE_LINES[EVENT_BY_ID[actor.ev].lines];
  if (!t) return null;
  const per = (t.rol && t.rol[actor.role]) || [];
  return per.length ? t.mensen.concat(per) : t.mensen;
}
// Who speaks now: at most LIFE_LIMITS.maxBubbles people within bubbleRangeM of (px, py), nearest first. The timing is local (tSec).
// Returns [{ actor, text, until }] (until in tSec). Animals only make a sound when the player is within 6 m.
export function lifeSpeakers(roster, px, py, tSec, day, out = []) {
  out.length = 0;
  if (!Number.isFinite(px) || !Number.isFinite(py)) return out; // verfijning 22-11: zonder geldige plek van de speler praat niemand (NaN liet iedereen praten)
  for (const a of roster) {
    const range = a.kind === 'people' ? LIFE_LIMITS.bubbleRangeM : 6;
    if (Math.abs(a.x - px) > range + 4 || Math.abs(a.y - py) > range + 4) continue;
    const period = BUBBLE_PERIOD_S[0] + h01(a.seed, 7) * (BUBBLE_PERIOD_S[1] - BUBBLE_PERIOD_S[0]) + (a.kind === 'people' ? 0 : 20);
    const u = tSec + h01(a.seed, 8) * period;
    const cycle = Math.floor(u / period), into = u - cycle * period;
    if (into > BUBBLE_SHOW_S) continue;
    if (Math.hypot(a.x - px, a.y - py) > range) continue;
    const text = lifeLine(a, cycle + (day | 0) * 131);
    if (!text || out.some((o) => o.text === text && o.d < LIFE_LIMITS.bubbleRangeM)) continue; // twee bellen met dezelfde zin naast elkaar: de tweede zwijgt even
    out.push({ actor: a, text, until: tSec + (BUBBLE_SHOW_S - into), d: Math.hypot(a.x - px, a.y - py) });
  }
  out.sort((p, q) => p.d - q.d);
  if (out.length > LIFE_LIMITS.maxBubbles) out.length = LIFE_LIMITS.maxBubbles;
  return out;
}
