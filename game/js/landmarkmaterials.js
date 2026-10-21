import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vcMaterial, createBrickDetailTexture, createRoofTileTexture } from './pixelart3d.js';

// The five shared materials of the landmark models (plain, brick, glass, metal, tile): a leaf, so
// paddepoel3d.js and landmarks3d.js do not import each other for them (import cycle, #108).
const brickTex = createBrickDetailTexture();
brickTex.repeat.set(2, 2);
const tileTex = createRoofTileTexture();
export const glassMat = vcMaterial({ side: THREE.DoubleSide, roughness: 0.3, metalness: 0.25, emissive: 0xffc27a, emissiveIntensity: 0 });
export const LANDMARK_MATERIALS = [
  vcMaterial({ side: THREE.DoubleSide }),
  vcMaterial({ side: THREE.DoubleSide, map: brickTex }),
  glassMat,
  vcMaterial({ side: THREE.DoubleSide, roughness: 0.45, metalness: 0.3 }),
  vcMaterial({ side: THREE.DoubleSide, map: tileTex }),
];
for (const m of LANDMARK_MATERIALS) m.userData.shared = true;
