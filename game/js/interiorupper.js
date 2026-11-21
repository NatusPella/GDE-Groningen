// The second floor of an interior (epic Interieurs, #1150, round 2): a straight stair along a side wall of the hall, a landing at the
// back, and a layout upstairs (bedrooms, an open office, hotel rooms, more shop floor). Pure, deterministic, in the door frame of
// interiorframe.js like the ground floor. The stair is a ramp (floorOffset) that the player walks up: map.surfaceAt is asked for
// its height by interiors.js, so there is no teleport and no loading.
//
// Geometry: the stair runs along the side wall from vBot (front) up to vRamp, then a flat landing to the back wall (vTop). The hole
// in the upstairs slab is the ramp part (vBot..vRamp); the landing belongs to the slab. A rail guards the inner edge of the hole.
import { mulberry32 } from './rng.js';
import { Plan, FACE, lampGrid, scatterPeople, repairLayout, validateLayout, rectOf, DOOR_CLEAR_D } from './interiorlayout.js';

export const STAIR_W = 1.1, LANDING = 0.8, SLOPE = 1.376, STEP_H = 0.19;
export const MIN_FLOOR_H = 2.6;

// kinds that can have an upper floor, and from what building (floors >= 2)
export const UPPER_KINDS = new Set(['woning', 'kantoor']);
export const UPPER_SUBS = { publiek: new Set(['hotel', 'gemeente', 'school']), winkel: new Set(['kleding', 'tweedehands', 'elektronica', 'souvenir', 'supermarkt']) };
export const hasUpper = (kind, sub) => UPPER_KINDS.has(kind) || !!(UPPER_SUBS[kind] && UPPER_SUBS[kind].has(sub));

// the stair for a hall, or null when the hall is too small
export function makeStairs(hall, door, rnd, rise) {
  const rampL = Math.max(2.4, rise * SLOPE);
  const need = rampL + LANDING + DOOR_CLEAR_D + 1.4;
  if (hall.v1 - hall.v0 < need || hall.u1 - hall.u0 < 4.2 || rise < MIN_FLOOR_H) return null;
  const side = rnd() < 0.5 ? 'left' : 'right';
  const u0 = side === 'left' ? hall.u0 : hall.u1 - STAIR_W;
  // keep it out of the line of the door
  if (u0 < door.w / 2 + 0.5 && u0 + STAIR_W > -door.w / 2 - 0.5 && hall.v0 + need > hall.v1) return null;
  const vTop = hall.v1, vRamp = vTop - LANDING, vBot = vRamp - rampL;
  return { side, u0, u1: u0 + STAIR_W, vBot, vRamp, vTop, rise, n: Math.ceil(rise / STEP_H), inner: side === 'left' ? u0 + STAIR_W : u0 };
}

export const stairsRect = (st) => ({ u0: st.u0, u1: st.u1, v0: st.vBot, v1: st.vTop });
export const holeRect = (st) => ({ u0: st.u0, u1: st.u1, v0: st.vBot, v1: st.vRamp });

// height above the ground-floor floor at (u, v) when on the stair or its landing, else null
export function floorOffset(st, u, v) {
  if (!st || u < st.u0 || u > st.u1 || v < st.vBot || v > st.vTop) return null;
  return v <= st.vRamp ? st.rise * (v - st.vBot) / (st.vRamp - st.vBot) : st.rise;
}

// the rails upstairs: the inner edge of the hole and its front edge
export function upperRails(st) {
  return [
    { u0: st.inner - 0.03, u1: st.inner + 0.03, v0: st.vBot, v1: st.vRamp, h: 0.95 },
    { u0: st.u0, u1: st.u1, v0: st.vBot - 0.06, v1: st.vBot, h: 0.95 },
  ];
}

// --- upstairs recipes ---------------------------------------------------------------------------------------

function bedroom(p) {
  const H = p.hall, W = p.W, D = p.D;
  const left = p.rnd() < 0.5;
  p.add('bed', left ? H.u0 + 1.1 : H.u1 - 1.1, H.v0 + D * 0.5 + 0.5, 2.0, 1.6, left ? FACE.E : FACE.W, { h: 0.55, color: p.fabric });
  p.run(H, 'front', 'wardrobe', 1.4, 0.55, H.u0 + 0.4, H.u1 - 0.4, { h: 2.1 }, 0.1, 0.3);
  p.add('cabinet', left ? H.u0 + 0.3 : H.u1 - 0.3, H.v0 + D * 0.5 - 0.9, 0.5, 0.4, left ? FACE.E : FACE.W, { h: 0.5 });
  p.add('table', H.u0 + W * 0.5, H.v1 - 0.6, 1.4, 0.7, FACE.DOOR, { h: 0.75 });
  p.add('chair', H.u0 + W * 0.5, H.v1 - 1.25, 0.45, 0.45, FACE.BACK, { h: 0.9 });
  if (p.chance(0.8)) p.add('cubicle', left ? H.u1 - 0.7 : H.u0 + 0.7, H.v0 + 0.9, 1.2, 1.4, left ? FACE.W : FACE.E, { h: 2.2, tag: 'wc' });
  p.add('rug', H.u0 + W * 0.5, H.v0 + D * 0.5, 2.4, 2.0, FACE.DOOR, { h: 0.02, solid: false, color: p.fabric2 });
  p.add('plant', H.u1 - 0.5, H.v1 - 0.8, 0.6, 0.6, FACE.DOOR, { h: 1.2 });
  p.rooms.push({ id: 'slaapkamer', role: 'slapen', u0: H.u0, u1: H.u1, v0: H.v0, v1: H.v1 });
  if (p.chance(0.4)) p.npcAt('bewoner', H.u0 + W * 0.5, H.v0 + D * 0.5 - 1.6, FACE.BACK, 'stand');
}
function officeUp(p) {
  const H = p.hall, W = p.W, D = p.D;
  const seats = [];
  for (let v = H.v0 + 1.2; v < H.v1 - 1.2; v += 2.4) for (let u = H.u0 + 1.2; u < H.u1 - 1.2; u += 2.2) {
    if (!p.chance(0.85)) continue;
    const d = p.add('desk', u, v, 1.5, 0.8, FACE.DOOR, { h: 0.75 });
    if (!d) continue;
    const c = p.add('chair', u, v + 0.75, 0.5, 0.5, FACE.BACK, { h: 0.9 });
    if (c) seats.push(c);
  }
  p.add('copier', H.u1 - 0.5, H.v0 + 0.6, 0.8, 0.7, FACE.W, { h: 1.1 });
  p.add('plant', H.u0 + 0.5, H.v0 + 0.6, 0.6, 0.6, FACE.DOOR, { h: 1.2 });
  seats.slice(0, 3).forEach((c, i) => p.npcAt('medewerker', c.u, c.v, c.face, 'sit', { seat: i }));
  void W; void D;
}
function hotelUp(p) {
  const H = p.hall, W = p.W, D = p.D;
  for (let i = 0; i < 2; i++) p.add('bed', i ? H.u1 - 1.2 : H.u0 + 1.2, H.v0 + D * 0.55, 2.0, 1.4, i ? FACE.W : FACE.E, { h: 0.55, color: p.fabric });
  p.run(H, 'front', 'wardrobe', 1.4, 0.55, H.u0 + 0.4, H.u1 - 0.4, { h: 2.1 }, 0.1, 0.4);
  p.add('table', H.u0 + W * 0.5, H.v1 - 0.6, 1.2, 0.7, FACE.DOOR, { h: 0.75 });
  p.add('tv', H.u0 + W * 0.5, H.v0 + 0.3, 1.1, 0.4, FACE.BACK, { h: 0.9 });
  p.rooms.push({ id: 'kamer', role: 'slapen', u0: H.u0, u1: H.u1, v0: H.v0, v1: H.v1 });
}
function shopUp(p, sub, accent) {
  const H = p.hall, W = p.W, D = p.D;
  p.run(H, 'back', 'shelf', 1.0, 0.45, H.u0, H.u1, { h: 1.9, color: accent, row: 0.5 }, 0.04, 0.1);
  p.run(H, 'front', 'shelf', 1.0, 0.45, H.u0, H.u1, { h: 1.9, color: accent, row: 0.5 }, 0.04, 0.1);
  for (let v = H.v0 + 2.2; v < H.v1 - 2.2; v += 2.4) {
    if (sub === 'kleding') p.add('rack', H.u0 + W / 2, v, Math.min(1.6, W * 0.3), 0.5, FACE.DOOR, { h: 1.6, color: accent });
    else p.add('gondola', H.u0 + W / 2, v, Math.min(1.6, W * 0.3), 0.7, FACE.DOOR, { h: 0.9, color: accent, row: 0.5, items: 0.2 });
  }
  void D;
  scatterPeople(p, 'klant', Math.min(2, Math.floor(W * D / 40)));
}

const RECIPE = { woning: bedroom, kantoor: officeUp, publiek: hotelUp };

// The upper layout for a ground layout with a stair, or null (then the building has no upper floor).
// spec: { kind, sub, seed, hall, door, height2 }; ground: the ground layout (its palette and fabric colours are reused).
export function generateUpper(spec, ground, st) {
  const rec = spec.kind === 'winkel' ? (p) => shopUp(p, spec.sub, ground.palette.accent) : RECIPE[spec.kind];
  if (!rec) return null;
  const hole = holeRect(st);
  const reserved = [{ u0: Math.max(spec.hall.u0, st.u0 - 1.2), u1: Math.min(spec.hall.u1, st.u1 + 1.2), v0: st.vRamp - 0.2, v1: st.vTop }, hole];
  for (const density of [1, 0.6, 0.3, 0]) {
    const p = new Plan(spec.hall, spec.door, mulberry32((spec.seed >>> 0) ^ 0x51ed270b), spec.height2, density, reserved.map((r) => ({ ...r })));
    p.fabric = spec.look && spec.look.fabric != null ? spec.look.fabric : 0x8a2a2a;
    p.fabric2 = 0xcbb894;
    rec(p);
    lampGrid(p);
    const L = {
      v: 1, kind: spec.kind, sub: spec.sub || null, seed: spec.seed >>> 0, hall: p.hall, door: null, height: spec.height2,
      items: p.items, walls: p.walls, openings: p.openings, rooms: p.rooms, npc: p.npc, use: p.use, lamps: p.lamps,
      palette: ground.palette, density, removed: 0, rails: upperRails(st), blocks: [hole],
    };
    const body = (n) => ({ u0: n.u - 0.25, u1: n.u + 0.25, v0: n.v - 0.25, v1: n.v + 0.25 });
    L.npc = L.npc.filter((n) => !L.items.some((it) => it.solid && rectsMeet(body(n), rectOf(it))) && !L.walls.some((w) => rectsMeet(body(n), w)));
    const start = { u: (st.u0 + st.u1) / 2, v: st.vRamp + LANDING / 2 };
    repairLayout(L, start);
    if (!validateLayout(L, start).length) return L;
  }
  return null;
}
const rectsMeet = (a, b) => a.u0 < b.u1 && a.u1 > b.u0 && a.v0 < b.v1 && a.v1 > b.v0;
