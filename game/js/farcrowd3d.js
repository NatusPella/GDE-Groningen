// Verre menigte (eis coördinator 23-11, ADR 0050): voorbijgangers voorbij FAR_CROWD_FROM meter krijgen geen eigen gehuide mens meer,
// maar een plek in een InstancedMesh met een gebakken pose (modularpeople.js bakeModularPose, het lichtste LOD-niveau). Per rig
// VARIANTS kleding en twee loopfasen; de fase wisselt per persoon twee keer per seconde, zodat een verre loper niet als standbeeld
// over straat schuift. Alles bij elkaar 2 x VARIANTS x 2 draw calls, ongeacht hoeveel mensen er ver weg lopen.
//   const fc = createFarCrowd(scene);
//   fc.begin(); fc.add(x, hoogte, kaartY, hoek, zaad, vrouw); ...; fc.end(tijd);   // elk beeld
// Samen spelen: puur beeld, lokaal per speler (de voetgangers zelf komen uit world.pedestrians, net als dichtbij).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { bakeModularPose, modularReady } from './modularpeople.js';
import { lodDistances } from './lodregistry.js';

// vanaf hier een verre loper (net voorbij de tweede LOD-grens van de soort person, 60 m bij Ultra); dichterbij weer een gehuide mens
export const FAR_CROWD_FROM = lodDistances('person')[1] + 15;
export const FAR_CROWD_BACK = FAR_CROWD_FROM - 8;   // hysterese: pas onder deze afstand weer een gehuide mens
export const VARIANTS = 6;
const CAP = 192;   // per variant en fase; meer verre lopers dan dit vallen weg (de verste eerst niet, maar zo zelden dat het niet uitmaakt)
const PHASES = [0.1, 0.6];

export function createFarCrowd(scene) {
  let meshes = null;   // [rig][variant][fase] -> InstancedMesh
  let mat = null;
  const counts = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  let t = 0;
  const build = () => {
    if (meshes || !modularReady()) return !!meshes;
    mat = markShared(vcMaterial({ roughness: 0.85 }));
    meshes = [false, true].map((female) => Array.from({ length: VARIANTS }, (_, k) => PHASES.map((u) => {
      const g = bakeModularPose(7000 + k * 131 + (female ? 17 : 0), { female }, 'Walk', u, 2);
      const im = new THREE.InstancedMesh(g, mat, CAP);
      im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
      im.name = 'farcrowd';
      scene.add(im);
      return im;
    })));
    return true;
  };
  return {
    get ready() { return build(); },
    begin() { if (!build()) return; counts.length = 0; for (let i = 0; i < 2 * VARIANTS * 2; i++) counts.push(0); },
    // x en y zijn kaartmeters, z de hoogte van de grond; angle de looprichting van de voetganger (zoals scene3d.js: rotation.y = -angle)
    add(x, z, y, angle, seed, female) {
      if (!meshes) return false;
      const r = female ? 1 : 0, v = (seed >>> 0) % VARIANTS, f = (Math.floor(t * 2 + (seed % 97) / 97 * 2) & 1);
      const slot = (r * VARIANTS + v) * 2 + f;
      if (counts[slot] >= CAP) return false;
      _q.setFromAxisAngle(_up, -angle);
      _m.compose(_p.set(x, z, y), _q, _s);
      meshes[r][v][f].setMatrixAt(counts[slot]++, _m);
      return true;
    },
    end(time) {
      t = time;
      if (!meshes) return;
      for (let r = 0; r < 2; r++) for (let v = 0; v < VARIANTS; v++) for (let f = 0; f < 2; f++) {
        const im = meshes[r][v][f], n = counts[(r * VARIANTS + v) * 2 + f] || 0;
        im.count = n; im.visible = n > 0;
        if (n) im.instanceMatrix.needsUpdate = true;
      }
    },
    total() { return counts.reduce((s, n) => s + n, 0); },
    dispose() {
      if (!meshes) return;
      for (const rr of meshes) for (const vv of rr) for (const im of vv) { scene.remove(im); im.geometry.dispose(); im.dispose(); }
      meshes = null;
    },
  };
}
