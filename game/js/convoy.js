// De colonne van akte 5 (M23): de vrienden van Oma rijden achter de speler aan naar de Grote Markt.
// Elke bondgenoot is een gewoon AI-voertuig dat via aiOpts.goal een stip op het spoor van de speler
// volgt (zelfde mechaniek als de achtervolgingen van missions.js, maar omgekeerd: jij bent de leider).
// Valt iemand te lang te ver achter, dan valt de colonne uiteen. Jelles limo probeert een
// bondgenoot af te snijden; wie geraakt wordt, verliest vaart en moet inhalen.
// De afstandsregels staan in convoyrules.js (puur, scripts/convoy_test.mjs).
import { spawnVehicleOnRoad, TRACTOR_MODEL, MOPED_MODEL } from './vehicle.js';
import { dist } from './util.js';
import { CONVOY, pushTrail, trailGoal, lagStep } from './convoyrules.js';

export { CONVOY };

// The vehicles of Oma's friends: name for the messages, kind and model for the spawn.
// (a function: vehicle.js is part of an import cycle with the missions, so its models are not there yet when this module loads)
const colonneMembers = () => [
  { name: 'Geesje', kind: 'scooter', model: { ...MOPED_MODEL, color: '#d9739b' } },
  { name: 'Wubbo', kind: 'bus' },
  { name: 'Tinus', kind: 'car', model: { ...TRACTOR_MODEL, color: '#2f5fa8' } },
  { name: 'Kapitein Klaas', kind: 'car', model: { name: 'aanhanger', len: 7.2, wid: 2.0, maxSpeed: 17, accel: 4.5, brake: 10, turnRate: 1.6, color: '#7a5a3a' } },
  { name: 'Berend', kind: 'car', model: { name: 'bakkie', len: 4.8, wid: 1.9, maxSpeed: 26, accel: 6, brake: 14, turnRate: 2.4, color: '#c9b18a' } },
  { name: 'Durk en Douwe', kind: 'bike' },
];

function spawnMember(world, spec, near, angle, back) {
  const map = world.map;
  const rp = map.nearestRoadPoint(near.x - Math.cos(angle) * back, near.y - Math.sin(angle) * back, 80, true);
  if (!rp || !rp.road) return null;
  const v = spawnVehicleOnRoad(map, rp.road, false, Math.random, spec.kind === 'bike', spec.kind === 'bus', rp, spec.kind === 'scooter', spec.model || null);
  v.missionCar = true;
  v.convoyMember = true;
  v.label = spec.name;
  v.aiOpts = { chase: true, cruise: 10 };
  world.vehicles.push(v);
  return v;
}

export function startConvoy(world, specs = colonneMembers()) {
  const p = world.player;
  const state = { members: [], trail: [{ x: p.x, y: p.y }], t: 0, limo: null, cutT: 0, cuts: 0, said: false };
  specs.forEach((spec, i) => {
    const v = spawnMember(world, spec, p, p.angle, 14 + i * 12);
    if (v) state.members.push({ spec, v, lagT: 0, warned: false });
  });
  return state;
}

// Jelle's limo: an AI car that heads for the middle of the column.
export function spawnLimo(world, state) {
  const p = world.player;
  const a = p.angle + Math.PI / 2;
  const rp = world.map.nearestRoadPoint(p.x + Math.cos(a) * 120 + Math.cos(p.angle) * 60, p.y + Math.sin(a) * 120 + Math.sin(p.angle) * 60, 100, true);
  if (!rp || !rp.road) return null;
  const v = spawnVehicleOnRoad(world.map, rp.road, false, Math.random, false, false, rp, false,
    { name: 'limo', len: 5.6, wid: 2.0, maxSpeed: 30, accel: 7, brake: 14, turnRate: 2.1, color: '#1b1c1f' });
  v.missionCar = true;
  v.label = 'Jelles limo';
  v.aiOpts = { chase: true, cruise: 17 };
  world.vehicles.push(v);
  state.limo = v;
  return v;
}

// Per frame. Returns { split: name } when the column falls apart, else null. `say(text)` shows a message.
export function updateConvoy(dt, world, state, say = () => {}) {
  const p = world.player;
  const lead = p.inVehicle || p;
  state.t += dt;
  pushTrail(state.trail, lead.x, lead.y);
  const speed = Math.abs(lead.speed || 0);
  state.members.forEach((m, i) => {
    const v = m.v;
    if (!world.vehicles.includes(v) || v.wrecked) return;
    const g = trailGoal(state.trail, i);
    if (g && world.time - (m.goalAt || 0) > 1.2) {
      m.goalAt = world.time;
      v.aiOpts = { goal: { x: g.x, y: g.y }, chase: true, cruise: Math.max(8, Math.min(speed * 1.08 + 2, v.model.maxSpeed * 0.9)) };
    }
    const r = lagStep(m, dist(v.x, v.y, lead.x, lead.y), dt);
    if (r.warn) say(`${m.spec.name} raakt achterop. Even wachten.`);
    if (r.split) { state.splitBy = m.spec.name; }
  });
  if (state.limo && world.vehicles.includes(state.limo)) {
    const mid = state.members[Math.floor(state.members.length / 2)];
    if (mid) state.limo.aiOpts = { goal: { x: mid.v.x, y: mid.v.y }, chase: true, cruise: 17 };
    state.cutT -= dt;
    for (const m of state.members) {
      if (state.cutT > 0) break;
      if (dist(m.v.x, m.v.y, state.limo.x, state.limo.y) < CONVOY.cutRange) {
        m.v.speed *= 0.25;
        state.cutT = CONVOY.cutEvery;
        state.cuts++;
        say(`Jelles limo snijdt ${m.spec.name} af.`);
      }
    }
  }
  return state.splitBy ? { split: state.splitBy } : null;
}

// How many members are close enough to count as "bij elkaar".
export function convoyStatus(world, state) {
  const p = world.player;
  const lead = p.inVehicle || p;
  const total = state.members.length;
  const near = state.members.filter((m) => dist(m.v.x, m.v.y, lead.x, lead.y) < CONVOY.warnGap).length;
  return { total, near };
}

export function disposeConvoy(world, state) {
  if (!state) return;
  for (const o of [...state.members.map((m) => m.v), state.limo]) {
    if (!o) continue;
    o.missionCar = false;
    o.convoyMember = false;
    o.aiOpts = null;
    const i = world.vehicles.indexOf(o);
    if (i >= 0 && o.driver !== 'player') world.vehicles.splice(i, 1);
  }
  state.members = [];
  state.limo = null;
}
