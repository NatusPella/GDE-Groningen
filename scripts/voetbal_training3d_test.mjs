// Test van de 3D-props van de trainingsminigames (#1109): scripts/voetbal_training3d_test.mjs. Met een kleine nep-THREE (geen browser): het budget (aantal objecten, gedeelde geometrie en materiaal),
// geen NaN in een positie, de props volgen de staat en dispose ruimt alles op. De echte three.js komt alleen in voetbaltrainingrun.js binnen.
import assert from 'node:assert/strict';
import { buildDrillProps, MAX_MESHES } from '../game/js/voetbaltraining3d.js';
import { DRILLS, newDrill, stepDrill } from '../game/js/voetbaltraining.js';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };

const made = { geo: 0, mat: 0, disposed: 0 };
class V3 { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Geo { constructor(...a) { this.args = a; made.geo++; } dispose() { made.disposed++; } }
const THREE = {
  Group: class { constructor() { this.children = []; } add(m) { this.children.push(m); } remove(m) { this.children = this.children.filter((c) => c !== m); } },
  Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; this.position = new V3(); this.scale = { x: 1, y: 1, z: 1, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }; this.rotation = { x: 0, y: 0, z: 0 }; this.visible = true; } },
  MeshLambertMaterial: class { constructor(o) { this.color = o.color; made.mat++; } dispose() { made.disposed++; } },
  ConeGeometry: class extends Geo {}, SphereGeometry: class extends Geo {}, TorusGeometry: class extends Geo {}, BoxGeometry: class extends Geo {},
};
const posOk = (m) => [m.position.x, m.position.y, m.position.z].every(Number.isFinite);

for (const d of DRILLS) {
  t(`${d.id}: binnen budget, gedeelde geometrie, geen NaN`, () => {
    const s = newDrill(d.id, 4);
    const p = buildDrillProps(THREE, s, { x: 1804.3, y: 1510.6 }, 1.2, 0);
    const st = p.stats();
    assert.ok(st.meshes > 0 && st.meshes <= MAX_MESHES, `${d.id}: ${st.meshes} objecten`);
    assert.ok(st.geometries <= 5 && st.materials <= 8, `delen: ${JSON.stringify(st)}`);
    assert.equal(p.group.children.length, st.meshes);
    for (const m of p.meshes) assert.ok(posOk(m), 'positie eindig');
    // een hele oefening lang: de props volgen de staat en blijven eindig
    let prev = false;
    for (let i = 0; i < 60 * 70 && !s.done; i++) {
      const act = (i % 120) < 50, inp = { ax: Math.sin(i / 40), ay: Math.cos(i / 55), act, press: act && !prev, rel: !act && prev };
      prev = act;
      stepDrill(s, inp, 1 / 60);
      if (i % 10 === 0) p.update(s);
    }
    p.update(s);
    for (const m of p.meshes) assert.ok(posOk(m));
    assert.equal(p.meshes.length, st.meshes, 'geen nieuwe objecten tijdens het spelen');
    p.dispose();
    assert.equal(p.group.children.length, 0); assert.ok(made.disposed > 0);
  });
}
t('de kegels kleuren mee: groen als de kegel goed gepasseerd is', () => {
  const s = newDrill('slalom', 1);
  const p = buildDrillProps(THREE, s);
  const k0 = p.live.k0, voor = k0.material.color;
  s.cones[0].done = true; p.update(s);
  assert.notEqual(k0.material.color, voor);
});
t('een kapotte oorsprong (NaN) geeft geen NaN in de scene', () => {
  const p = buildDrillProps(THREE, newDrill('pass', 2), { x: NaN, y: undefined }, NaN, NaN);
  for (const m of p.meshes) assert.ok(posOk(m));
});
t('het schotdoel heeft de echte maat (7,32 bij 2,44 m)', () => {
  const p = buildDrillProps(THREE, newDrill('schot', 2));
  assert.equal(p.live.goal.w, 7.32); assert.equal(p.live.goal.h, 2.44);
});
console.log(`voetbal_training3d_test: ${n} tests ok`);
