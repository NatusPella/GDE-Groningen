import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, markShared } from './pixelart3d.js';

// Night light in the Ommelanden without lights: additive decals of a soft
// radial glow (pools on the ground under village lamps and on farmyards,
// headlight beams and lamp flares on country traffic). One material, hidden
// by day so it costs no draw calls then.

const POOL_COLOR = new THREE.Color(0xffc27a);
let mat = null;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 31);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function glowMaterial() {
  if (!mat) {
    mat = markShared(new THREE.MeshBasicMaterial({
      map: typeof document === 'undefined' ? null : glowTexture(), color: POOL_COLOR.clone(), vertexColors: true,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, fog: false,
    }));
    mat.visible = false;
  }
  return mat;
}

// glow: the scene's 1.5 * night (as for the windows)
export function setGlowNight(glow) {
  const m = glowMaterial();
  const k = Math.min(1, glow / 1.2);
  m.visible = k > 0.03;
  m.color.copy(POOL_COLOR).multiplyScalar(0.55 * k);
}

// A ground pool of radius r centred at (cx, 0, cz), uv over the glow.
export function poolGeometry(r = 5, cx = 0, cz = 0, y = 0.07, tint = 0xffffff) {
  const B = new GeoBuilder();
  B.quadOut([cx - r, y, cz - r], [cx - r, y, cz + r], [cx + r, y, cz + r], [cx + r, y, cz - r], [0, 1, 0], tint, 0, [0, 0, 0, 1, 1, 1, 1, 0]);
  return B.build();
}

// Headlights of a road user facing +x: lamp flares at the front (x0, y,
// +-half) and a beam on the road ahead. One mesh per vehicle.
export function headlightGeometry(x0, y, half, reach = 16) {
  const B = new GeoBuilder();
  const flare = (z) => {
    const s = 0.32;
    B.quadOut([x0 + 0.03, y - s, z - s], [x0 + 0.03, y - s, z + s], [x0 + 0.03, y + s, z + s], [x0 + 0.03, y + s, z - s], [1, 0, 0], 0xffffff, 0, [0, 0, 0, 1, 1, 1, 1, 0]);
  };
  if (half > 0) { flare(-half); flare(half); } else flare(0);
  const w = Math.max(1.6, half * 2 + 1.2);
  // the beam: the near half of the glow stretched along the road
  B.quadOut([x0, 0.08, -w], [x0, 0.08, w], [x0 + reach, 0.08, w * 1.8], [x0 + reach, 0.08, -w * 1.8], [0, 1, 0], 0xd8d0c0, 0, [0.5, 0, 0.5, 1, 1, 1, 1, 0]);
  return markShared(B.build());
}
