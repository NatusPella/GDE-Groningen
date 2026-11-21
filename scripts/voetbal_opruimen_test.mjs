// Opruimtest van voetbal.js (#1065, review 22-11 P1): een wedstrijd geeft zijn veld, doelen, bord, bal, schaduw en spelers vrij
// (dispose, personRefs terug), het bordmateriaal is gedeeld en de gedeelde veldmaterialen blijven staan. Puur in node, met de echte three.js.
//   node scripts/voetbal_opruimen_test.mjs   (vraagt de gevendorde three.js: `cd desktop && npm run stage`)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, ctx, next) {
    if (url.endsWith('/game/js/scene3d.js')) {
      const r = next(url, ctx);
      return { ...r, source: String(r.source) + '\nexport function __setScene(s) { scene = s; }\n', shortCircuit: true };
    }
    return next(url, ctx);
  },
});
document.body = { appendChild() {}, removeChild() {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: {}, querySelector: () => null };
const perm = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : perm()), set: () => true, apply: () => perm() });
document.createElement = () => perm();
document.getElementById = () => perm();
window.getComputedStyle = () => ({ getPropertyValue: () => '1' });
const THREE = await import('three');
const sc = await import('../game/js/scene3d.js');
sc.__setScene(new THREE.Scene());
const { VOETBAL } = await import('../game/js/voetbal.js');

const input = { isDown: () => false, wasPressed: () => false, consume() {}, axis: () => [0, 0] };
const player = { x: 1797.3, y: 1549.5, z: 0, character: 'tammo', speed: 0, angle: 0, inVehicle: null };
const w = { player, players: [player], input, time: 0, addMessage() {}, wanted: 0, audioEvents: [], extraSpeakers: [], map: { surfaceAt: () => ({ z: 0.5 }) }, pigeonMode: false, heliRun: false, cameraOverride: null, money: 0, coopNet: null };
VOETBAL.init(w);

const scene = sc.getScene();
const disposed = new Set();
const watch = (o) => o.traverse((m) => {
  for (const g of [m.geometry]) if (g && !g.__w) { g.__w = 1; const d = g.dispose.bind(g); g.dispose = () => { disposed.add(g); d(); }; }
  for (const mt of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) if (!mt.__w) { mt.__w = 1; const d = mt.dispose.bind(mt); mt.dispose = () => { disposed.add(mt); d(); }; }
});
const sumRefs = (list) => { const s = new Set(); for (const o of list) o.traverse((m) => { if (m.geometry && typeof m.geometry.userData.personRefs === 'number') s.add(m.geometry); }); let n = 0; for (const g of s) n += g.userData.personRefs; return n; };
const gateMat = (root) => { let r = null; root.traverse((m) => { if (m.geometry && m.geometry.type === 'PlaneGeometry' && m.geometry.parameters.width === 3.4) r = m.material; }); return r; };

// wedstrijd 1: klein veld
assert.equal(window.__voetbal.start(true, { modus: 'vriendschappelijk', formaat: 'klein', vorming: '2-2' }), true);
const veld1 = scene.children.slice(0, 4); // root, bord, bal, schaduw van de bouw
const actoren1 = w.voetbalGame.actors.map((a) => a.mesh);
assert.ok(actoren1.length >= 10, `tien spelers (${actoren1.length})`);
for (const o of [...veld1, ...actoren1]) watch(o);
const mat1 = gateMat(veld1[1]);
assert.ok(mat1, 'het bord heeft een plaat');
const refsMet = sumRefs(actoren1);
const veldGeos = []; for (const o of veld1) o.traverse((m) => { if (m.geometry) veldGeos.push(m.geometry); });
const gedeeldeMats = new Set(); veld1[0].traverse((m) => { if (m.material) gedeeldeMats.add(m.material); });
window.__voetbal.quit();
const actGeos = new Set(); for (const o of actoren1) o.traverse((m) => { if (m.geometry) actGeos.add(m.geometry); });
assert.ok(sumRefs(actoren1) <= refsMet - actoren1.length, `de persoonstellers zijn terug (${refsMet} naar ${sumRefs(actoren1)})`);
assert.ok(actoren1.every((m) => !m.parent), 'de spelers zijn uit de scene');

// wedstrijd 2: groot veld: het kleine veld wordt opgeruimd en vervangen
assert.equal(window.__voetbal.start(true, { modus: 'vriendschappelijk', formaat: 'groot', vorming: '4-3-3' }), true);
const veld2 = scene.children.slice(0, 4);
assert.ok(veld2.every((o) => !veld1.includes(o)), 'het veld is opnieuw gebouwd');
const verweesd = veldGeos.filter((g) => !disposed.has(g));
assert.equal(verweesd.length, 0, `het oude veld geeft al zijn geometrieen vrij (${verweesd.length} van ${veldGeos.length} blijven)`);
for (const m of gedeeldeMats) assert.ok(!disposed.has(m) || !gedeeldeMats.has(m) || m.userData.shared, 'gedeelde veldmaterialen krijgen geen dispose');
const mat2 = gateMat(veld2[1]);
assert.equal(mat2, mat1, 'het bordmateriaal is gedeeld: geen nieuwe textuur per bouw');
assert.ok(!disposed.has(mat1), 'het gedeelde bordmateriaal blijft staan');
window.__voetbal.quit();
console.log(`voetbal_opruimen_test ok (veld ${veldGeos.length} geometrieen, ${actoren1.length} spelers)`);
