// Test van het publiek en de trainende teams in 3D (#1115): voetbalpubliek.js met de echte three.js, zonder beeld. Het publiek langs de lijn, de trainers, hun trappen
// (SFX-haak) en het opruimen. Of het er goed uitziet en klinkt is nog niet bekeken.   node scripts/voetbal_publiek_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const THREE = await import('three');
const P = await import('../game/js/voetbalpubliek.js');

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const toLocal = (x, y) => ({ x, y });

t('het publiek: een InstancedMesh met het gevraagde aantal, niet bij uit of zonder aantal; opruimen haalt hem uit de groep', () => {
  const root = new THREE.Group();
  assert.equal(P.buildCrowd(root, { count: 60, seed: 1, B: 40, L: 60, toLocal, uit: true }), null);
  assert.equal(P.buildCrowd(root, { count: 0, seed: 1, B: 40, L: 60, toLocal }), null);
  const c = P.buildCrowd(root, { count: 60, seed: 1, B: 40, L: 60, toLocal });
  assert.ok(c && c.mesh.isInstancedMesh && c.mesh.count === c.seats.length && c.seats.length >= 30);
  assert.equal(root.children.length, 1);
  const y0 = c.mesh.instanceMatrix.array.slice();
  c.tik(0.1, 1, false); assert.deepEqual([...c.mesh.instanceMatrix.array], [...y0], 'verminderde beweging: het publiek staat stil');
  c.tik(0.1, 1, true); assert.notDeepEqual([...c.mesh.instanceMatrix.array], [...y0], 'bij een doelpunt springt het publiek');
  c.tik(0.1, 9, true); assert.deepEqual([...c.mesh.instanceMatrix.array], [...y0], 'na de viering staat het weer');
  c.dispose(); assert.equal(root.children.length, 0);
});

t('de trainers: een mesh en een bal per ploeg, ruimen op als het veld buiten bereik is', () => {
  const scene = new THREE.Scene();
  const tr = P.makeTrainers(scene);
  const sq = { club: 'a', x: 100, y: 200, r: 14, n: 8, shirt: 0xaa2222, patroon: 'effen' };
  tr.sync([sq], () => 1.5);
  assert.equal(tr.groups.size, 1); assert.equal(scene.children.length, 2);
  tr.sync([sq], () => 1.5); assert.equal(scene.children.length, 2, 'dezelfde ploeg komt niet dubbel');
  tr.tik(0.5);
  const g = [...tr.groups.values()][0];
  assert.ok(Number.isFinite(g.ball.position.x) && Math.abs(g.ball.position.y - 1.7) < 1e-9);
  tr.sync([], () => 0); assert.equal(scene.children.length, 0); assert.equal(tr.groups.size, 0);
  tr.dispose();
});

t('de trappen: geen trap bij het neerzetten, daarna een per maat van 2,4 tot 3,6 s, deterministisch, niet bij een lege haak', () => {
  for (const sq of [{ x: 0, y: 0 }, { x: 123.4, y: 567.8 }, { x: -50, y: 9 }]) { const p = P.kickPeriod(sq); assert.ok(p >= 2.4 && p <= 3.6, String(p)); }
  const run = (haak) => {
    const scene = new THREE.Scene(), tr = P.makeTrainers(scene), trappen = [];
    tr.sync([{ club: 'a', x: 100, y: 200, r: 14, n: 6, shirt: 1, patroon: 'effen' }], () => 0);
    for (let tt = 100; tt < 112; tt += 0.25) tr.tik(tt, haak ? (sq, x, y) => trappen.push([+tt.toFixed(2), x, y]) : undefined);
    tr.dispose();
    return trappen;
  };
  const a = run(true), b = run(true);
  assert.deepEqual(a, b);
  const per = P.kickPeriod({ x: 100, y: 200 });
  assert.ok(a.length >= Math.floor(12 / per) - 1 && a.length <= Math.ceil(12 / per) + 1, `${a.length} trappen in 12 s bij maat ${per}`);
  assert.ok(a.every((k) => k[1] === 100 && k[2] === 200));
  assert.doesNotThrow(() => run(false));
});

console.log(`voetbal_publiek_test ok (${n} groepen)`);
