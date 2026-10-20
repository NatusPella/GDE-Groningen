import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildWorldMarker3D, setWorldMarkerKind, updateWorldMarker3D } from './worldmarker3d.js';

// The 3D mission markers, split off missions.js so scene3d.js does not import the
// whole mission module for them (import cycle, #108). missions.js re-exports them.

// --- 3D representation ---------------------------------------------------
// Local origin at ground level (y=0) for both builders below; the integrator
// positions groups/meshes at (worldX, y, worldY) per the ARCHITECTURE.md
// mapping (three.x=world.x, three.z=world.y). Colors match the old 2D
// marker palette: cyan while a mission is active, yellow while idle/on
// cooldown (i.e. showing where to go to START the next mission).

export const MARKER_COLOR_ACTIVE = 0x3fd0ff;

// The start (idle) and the objective (active) of a mission: the shared world
// marker (worldmarker3d.js), a diamond for the start, an arrow for the goal.
export function buildMissionMarker3D() {
  return buildWorldMarker3D('start');
}

export function updateMissionMarker3D(group, time, phase) {
  setWorldMarkerKind(group, phase === 'active' ? 'goal' : 'start');
  updateWorldMarker3D(group, time);
}

const waypointRingGeometry = new THREE.RingGeometry(1.0, 1.35, 28).rotateX(-Math.PI / 2);
const waypointColumnGeometry = new THREE.CylinderGeometry(0.05, 0.1, 9, 8, 1, true).translate(0, 4.5, 0);
const waypointDotMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_ACTIVE,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

// Quiet preview of one entry of world.mission.remainingWaypoints (checkpoint/
// boat missions only): a thin ring on the ground with a short soft column,
// in place of the old balls (#115). Geometry and material are shared
// module-scope singletons, since several of these can be live at once -
// callers must NOT call .dispose() on an individual dot's material; just
// remove the group from the scene.
export function buildWaypointDotMesh3D() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(waypointRingGeometry, waypointDotMaterial), new THREE.Mesh(waypointColumnGeometry, waypointDotMaterial));
  return g;
}
