// The live side of the mission map layers (issue #180): reads the running
// mission from the modules that own it, hands the snapshot to missionmap.js
// and keeps the result for the frame, so the minimap and the full map ask
// once. Thin on purpose; the rules are in missionmap.js (tested).
import { buildMissionLayer, layerNotices } from './missionmap.js';
import { wantedPhase } from './wantedstate.js';
import { getPigeonFlight, getPigeonThreats } from './pigeonmode.js';
import { getPigeonSpotsForRender } from './pigeonspots.js';
import { getHeliRunMarks } from './helirun.js';
import { getKartMapState } from './kartbaan.js';
import { getUserWaypoint } from './routing.js';
import { getGaragesForRender } from './garages.js';
import { showCard } from './hudcards.js';

let cache = { at: -1, world: null, layer: null };
let prevLayer = null;
let seen = new Set();
let seenMission = null;

const PIGEON_TARGETS = 3;

function snapshot(world) {
  const p = world.player;
  const player = { x: p.x, y: p.y, angle: p.angle, speed: p.inVehicle ? Math.abs(p.inVehicle.speed || 0) : 0 };
  const s = { player };
  const m = world.mission;
  if (m && m.phase === 'active' && m.marker) {
    s.mission = {
      type: m.type, label: m.label, phase: m.phase, marker: m.marker, waypoints: m.remainingWaypoints || [],
      distance: m.distanceToMarker, wpIndex: m.wpIndex, race: !!world.race,
    };
  }
  const wp = getUserWaypoint();
  if (wp) s.goal = { x: wp.x, y: wp.y, name: wp.name };

  const kart = getKartMapState();
  if (kart) s.kart = kart;
  const fl = getPigeonFlight();
  if (fl) {
    const targets = getPigeonSpotsForRender().map((q) => ({ x: q.x, y: q.y, label: q.name || 'Voerplek', d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, b) => a.d - b.d).slice(0, PIGEON_TARGETS);
    s.pigeon = { targets, threats: getPigeonThreats(), noFly: [] };
  }
  const sj = world.sideJob;
  if (sj && sj.active && sj.bus) s.bus = sj.bus;
  const hm = getHeliRunMarks();
  if (hm) s.heli = { rings: hm.rings, pad: hm.pad, balloon: hm.balloon };

  const phase = wantedPhase(world);
  if (phase !== 'rustig') {
    const pol = world.police;
    const units = [];
    for (const v of world.vehicles || []) if (v.isPolice && !v.hijacked && !v.wrecked) units.push({ x: v.x, y: v.y, kind: 'police' });
    const ok = pol && pol.searching && pol.searchCenter && pol.searchRadius > 0;
    s.wanted = { stars: world.wanted, phase, units, search: ok ? { x: pol.searchCenter.x, y: pol.searchCenter.y, r: pol.searchRadius } : null, escape: null };
  }
  // help on the way, only while a mission runs: the nearest garage
  if (s.mission) {
    const g = getGaragesForRender().map((q) => ({ x: q.x, y: q.y, label: q.name || 'Garage', kind: 'garage', d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, b) => a.d - b.d)[0];
    if (g && g.d < 600) s.aids = [g];
  }
  return s;
}

// The layer of this frame, or null when nothing mission-like runs.
export function getMissionLayer(world) {
  if (!world || !world.player) return null;
  const now = performance.now();
  if (cache.world === world && now - cache.at < 100) return cache.layer;
  let layer = null;
  try { layer = buildMissionLayer(snapshot(world)); } catch { layer = null; }
  cache = { at: now, world, layer };
  return layer;
}

// Once a frame from one place (the minimap): the notices of a layer change.
export function updateMissionNotices(world, layer) {
  const id = world.mission && world.mission.phase === 'active' ? world.mission.index : null;
  if (id !== seenMission) { seenMission = id; seen = new Set(); }
  for (const c of layerNotices(prevLayer, layer, world.player, seen)) showCard(world, { kind: c.kind, title: c.title, body: c.body, key: c.key, voice: false });
  prevLayer = layer;
}
