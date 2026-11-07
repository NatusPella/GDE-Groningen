// A blob shadow that is a child of a tilting mesh (the heli: pitch and roll on the whole mesh, order YZX) lies flat and straight under it (#391).
// Straight down in the mesh's own frame slid the blob sideways by alt x sin(tilt) and tilted it along: with the heli 30 m up and rolled 20 degrees
// the shadow lay 10 m beside it. The offset and the rotation get the tilt taken out again; the heading (rotation.y) stays.
// `mesh` and `sh` are three.js objects (only their quaternion methods are used); `drop` is the metres of the blob under the mesh origin.
export function levelShadow(sh, mesh, drop) {
  const h = mesh.rotation.y;
  const yaw = mesh.quaternion.clone().set(0, Math.sin(h / 2), 0, Math.cos(h / 2));
  const untilt = yaw.invert().multiply(mesh.quaternion.clone()).invert();
  sh.position.set(0, -drop, 0).applyQuaternion(untilt);
  sh.quaternion.copy(untilt);
}

// #658: de schaduwmap stond vast op 'hoog' (4096², ~67 MB) terwijl de adaptieve
// kwaliteit alleen renderschaal en zichtafstand verlaagde. Op een machine die
// zichzelf terugschroeft (dynamicScale < 1) of een hoge cpuLevel heeft, gebruiken
// we de zuinige 'hoog'-variant: 2048² is nog 3,1 cm per texel en scheelt 50 MB.
export function adaptedShadowLevel(level, dynamicScale = 1, cpuLvl = 0) {
  if (level !== 'hoog') return level; // laag en middel blijven zoals ze zijn
  if (cpuLvl > 0 || dynamicScale < 1) return 'hoog2048';
  return 'hoog';
}

export const SHADOW_SIZES = { laag: 1024, middel: 2048, hoog: 4096, hoog2048: 2048 };
// Volle rgba8-schaduwtarget in MB (4 bytes per texel), voor de meting.
export const shadowTargetMB = (size) => (size * size * 4) / 1e6;
