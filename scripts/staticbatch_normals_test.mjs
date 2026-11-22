// De gebatchte gevelnormalen (#1076): de glasshader van de nepinterieurs (interiorglass.js) leest het kozijnframe uit de
// normaalattribuut (Int8, genormaliseerd). De gebouwenbatcher draaide die normalen door de normaalmatrix en schreef ze als
// zwevende komma terug in een Int8Array: elke waarde onder 1 werd afgekapt tot 0, dus elk pand met een millimeter-nudge
// (buildingNudge, alle panden) kreeg een nulnormaal en de ruit viel terug op een vaste richting (+z): het perspectief klopte
// alleen voor gevels die precies op de wereldas staan.
//   node scripts/staticbatch_normals_test.mjs
import './node3d.mjs';

const THREE = await import('three');
const { createStaticBatcher } = await import('../game/js/staticbatch3d.js');
// dezelfde opties als buildingBatcher (bake, geen landmark), maar zonder de gedeelde tekenpool zodat de samengevoegde geometrie in de scene staat
const mkBatcher = () => createStaticBatcher({ name: 'normals-test', bake: true, pool: false, minMembers: 1, eligible: (b, mesh) => !b.landmark, valid: (b, mesh, ctx, dist) => dist(b) <= ctx.detailR - 1 });

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

// een gevelruit onder 37 graden (geen wereldas), met de Int8-normaal van GeoBuilder.build (round(n * 127))
const ang = 37 * Math.PI / 180;
const n = [Math.cos(ang), 0, Math.sin(ang)];
const q = n.map((v) => Math.round(v * 127));
function makePart() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array([...q, ...q, ...q]), 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
  g.userData.batchVer = 0;
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x888888 }));
}
for (const [label, pos, rotY] of [['millimeter-nudge', [0.002, -0.004, 0.001], 0], ['draaiing en nudge', [0.002, 0.003, -0.001], Math.PI / 2]]) {
  const buildingBatcher = mkBatcher();
  const scene = new THREE.Scene();
  const meshes = new Map();
  for (const dx of [0, 60]) {
    const x = 300 + dx, y = 300;
    const b = { bounds: [x - 3, y - 3, x + 3, y + 3] };
    const mesh = new THREE.Group();
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.y = rotY;
    mesh.add(makePart());
    scene.add(mesh);
    meshes.set(b, mesh);
  }
  scene.updateMatrixWorld(true);
  const ctx = { scene, meshes, hidden: new Set(), px: 330, py: 300, detailR: 190, drawDist: 900, withDetail: true, budgetMs: 50 };
  for (let i = 0; i < 40; i++) buildingBatcher.update(ctx);
  ok(buildingBatcher.info().merged === 2, `${label}: beide panden zijn gebatcht`);
  const expect = new THREE.Vector3(...n).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  let checked = 0;
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry.attributes.normal) return;
    const a = o.geometry.attributes.normal;
    if (a.count !== 3) return; // alleen een gebatcht stuk: een driehoek per cel
    for (let i = 0; i < a.count; i++) {
      const v = new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i));
      ok(v.length() > 0.9, `${label}: de gebatchte normaal is geen nul (lengte ${v.length().toFixed(3)})`);
      const ang2 = v.normalize().angleTo(expect);
      ok(ang2 < 0.012, `${label}: de gebatchte normaal wijst nog de gevel in (${(ang2 * 180 / Math.PI).toFixed(2)} graden)`);
      checked++;
    }
  });
  ok(checked === 6, `${label}: de gebatchte normalen zijn gecontroleerd (${checked})`);
  buildingBatcher.clear();
}
console.log(fails ? `${fails} FOUT(EN)` : 'OK staticbatch_normals_test');
process.exit(fails ? 1 : 0);
