// The interface "a scene in an interior" for missions, cutscenes and the story (epic Interieurs, #1150, round 2). A mission or a story
// beat that plays inside a building (a heist at the bank, a talk in a cafe, Tammo at a shop counter) does not need its own room any
// more: it names the building, asks for named anchor points and a camera inside the hall, and the interior system builds the real
// room in that building (interiors.js pinInterior keeps it alive while the scene plays). Pure: a plan in, points out, in world
// coordinates (x, y) with heights in metres above the floor.
//
//   const plan = planInterior(b, { spot });            // or the live one: livePlanOf(b) in interiors.js
//   const a = sceneAnchors(plan);                       // { door, inside, counter, counterFront, centre, back, seats[], npcs[], ... }
//   const cam = sceneCamera(plan, 'wide' | 'door' | 'counter' | 'back');   // { position: {x,y,z}, lookAt: {x,y,z}, fov }
//
// The cameras are always inside the hall (0.45 m from the walls) and under the ceiling (0.3 m): the rule of the binnensets
// (docs/BINNENSETS-21-11.md), here derived from the real hall. Samen spelen: a scene plays locally in each player's own game, like
// every interior (the room is built from the building's seed); nothing is sent.
import { toWorld } from './interiorframe.js';

const W = (plan, u, v) => { const [x, y] = toWorld(plan.frame, u, v); return { x, y }; };

export function sceneAnchors(plan) {
  const L = plan.layout, H = plan.hall;
  const out = {
    door: W(plan, 0, 0), inside: W(plan, 0, H.v0 + 1.0), centre: W(plan, (H.u0 + H.u1) / 2, (H.v0 + H.v1) / 2), back: W(plan, (H.u0 + H.u1) / 2, H.v1 - 1.0),
    left: W(plan, H.u0 + 1.0, (H.v0 + H.v1) / 2), right: W(plan, H.u1 - 1.0, (H.v0 + H.v1) / 2),
    counter: null, counterFront: null, seats: [], npcs: L.npc.map((n) => ({ role: n.role, pose: n.pose, ...W(plan, n.u, n.v) })),
    use: L.use.map((s) => ({ id: s.id, ...W(plan, s.u, s.v) })),
  };
  const c = L.items.find((i) => i.type === 'counter' || i.type === 'bar' || i.type === 'desk');
  if (c) out.counter = W(plan, c.u, c.v);
  const front = L.use.find((s) => s.id === 'kopen' || s.id === 'bestellen' || s.id === 'balie');
  if (front) out.counterFront = W(plan, front.u, front.v);
  out.seats = L.items.filter((i) => i.type === 'chair' || i.type === 'stool' || i.type === 'bench' || i.type === 'sofa').map((i) => ({ type: i.type, ...W(plan, i.u, i.v) }));
  if (L.upper && plan.stairs) out.upstairs = { ...W(plan, (plan.stairs.u0 + plan.stairs.u1) / 2, plan.stairs.vTop - 0.4), z: plan.floorH };
  return out;
}

// a camera inside the hall: 'wide' (from the door end looking in), 'door' (from the back looking at the door), 'counter', 'back'
export function sceneCamera(plan, shot = 'wide') {
  const H = plan.hall, m = 0.45;
  const clampU = (u) => Math.max(H.u0 + m, Math.min(H.u1 - m, u)), clampV = (v) => Math.max(H.v0 + m, Math.min(H.v1 - m, v));
  const y = Math.min(1.75, plan.height - 0.3);
  const L = plan.layout;
  const counter = L.items.find((i) => i.type === 'counter' || i.type === 'bar');
  let from, at;
  if (shot === 'door') { from = [clampU(0), clampV(H.v1 - 0.5)]; at = [0, H.v0 + 0.2]; }
  else if (shot === 'back') { from = [clampU(0), clampV(H.v0 + 0.8)]; at = [(H.u0 + H.u1) / 2, H.v1]; }
  else if (shot === 'counter' && counter) { from = [clampU(counter.u + (counter.u > 0 ? -2.2 : 2.2)), clampV(counter.v - 1.8)]; at = [counter.u, counter.v]; }
  else { from = [clampU(0), clampV(H.v0 + 0.8)]; at = [(H.u0 + H.u1) / 2, (H.v0 + H.v1) / 2]; }
  const f = W(plan, from[0], from[1]), t = W(plan, at[0], at[1]);
  return { position: { x: f.x, y: f.y, z: y }, lookAt: { x: t.x, y: t.y, z: Math.min(1.3, y) }, fov: 62 };
}

// is a world point inside the hall? (for a scene that places actors: they must stand in the room)
export function inHall(plan, x, y, margin = 0) {
  const dx = x - plan.frame.ox, dy = y - plan.frame.oy;
  const u = dx * plan.frame.tx + dy * plan.frame.ty, v = -(dx * plan.frame.nx + dy * plan.frame.ny);
  return u >= plan.hall.u0 + margin && u <= plan.hall.u1 - margin && v >= plan.hall.v0 + margin && v <= plan.hall.v1 - margin;
}
