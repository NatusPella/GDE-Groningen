// Diepteprecisie van de spelcamera (#382): hoe klein een verschil in diepte mag zijn voordat twee vlakken
// in de 24-bit dieptebuffer (DEPTH_COMPONENT24 in de MSAA-doelen van postfx3d.js) op dezelfde waarde landen
// en dus door elkaar flikkeren (z-fighting). Rekent met de echte projectiematrix van three.js.
//   node scripts/depth_precision.mjs [--near=0.5] [--far=1650] [--bits=24]
// Uitkomst: de resolutie hangt af van z^2 / near en bijna niet van far. De far-waarde (140 m tot 1650 m) maakt
// dus nauwelijks uit; een grotere near-waarde helpt lineair, een dynamische far helpt niet.
import './node3d.mjs';
const THREE = await import('three');

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? +a.slice(k.length + 3) : d; };
const BITS = opt('bits', 24);
const LEVELS = 2 ** BITS - 1;

// gemiddelde Δz (m) op afstand z per dieptestap: 1 / (helling van de gequantiseerde diepte), uit de
// projectiematrix van three.js (de stappen zelf lopen met een paar procent ruis heen en weer)
function resolution(near, far, z) {
  const cam = new THREE.PerspectiveCamera(64, 16 / 9, near, far);
  cam.updateProjectionMatrix();
  const e = cam.projectionMatrix.elements;
  const depth = (d) => { const clipZ = e[10] * -d + e[14], clipW = e[11] * -d; return (clipZ / clipW * 0.5 + 0.5) * LEVELS; };
  const h = Math.max(1e-6, z * 1e-4);
  return h / (depth(z + h) - depth(z));
}

const DIST = [5, 20, 60, 100, 140, 300, 600, 1000];
const SETS = [
  { naam: 'nu: near 0,5 / far 196 (kort)', near: 0.5, far: 196 },
  { naam: 'nu: near 0,5 / far 1650 (skyline)', near: 0.5, far: 1650 },
  { naam: 'near 1,0 / far 1650', near: 1, far: 1650 },
  { naam: 'near 0,25 / far 1650', near: 0.25, far: 1650 },
];
if (args.some((a) => a.startsWith('--near='))) SETS.unshift({ naam: `eigen: near ${opt('near', 0.5)} / far ${opt('far', 1650)}`, near: opt('near', 0.5), far: opt('far', 1650) });

console.log(`${BITS}-bit dieptebuffer; kleinste onderscheidbare diepteverschil in mm`);
console.log('instelling'.padEnd(36), DIST.map((d) => (d + ' m').padStart(9)).join(''));
for (const s of SETS) console.log(s.naam.padEnd(36), DIST.map((d) => (resolution(s.near, s.far, d) * 1000).toFixed(d < 60 ? 3 : 1).padStart(9)).join(''));
// de afstand waarop een offset van x mm nog net wordt onderscheiden (near 0,5)
console.log('\nvoor near 0,5: tot welke afstand een fysieke offset gegarandeerd gescheiden blijft (2x de resolutie):');
for (const mm of [2, 5, 10, 20]) {
  let z = 1;
  while (z < 5000 && resolution(0.5, 1650, z) * 2000 < mm) z += 1;
  console.log(`  ${String(mm).padStart(2)} mm: tot ca. ${z} m`);
}
