// #1285: een nieuwe taxirit bij een vaste plek waar (nog) geen weg geladen is, crashte op d.to.road.x van undefined.
// De echte round() van de taxibaan draait hier met een kaart zonder wegen: de rit start met de plek zelf als stoeprand.
//   node scripts/taxi_zonderweg_test.mjs
import assert from 'node:assert/strict';
await import('./node3d.mjs'); // de baan importeert THREE
const { default: taxi } = await import('../game/js/sidejob_taxi.js');

const berichten = [];
const c = { world: { map: { nearestRoadPoint: () => null } }, data: {}, msg: (t) => berichten.push(t) };
for (let i = 0; i < 20; i++) {
  assert.doesNotThrow(() => taxi.round(c), 'een rit zonder geladen wegen gooit geen fout');
  const d = c.data;
  for (const k of ['from', 'to']) {
    assert.ok(Number.isFinite(d[k].road.x) && Number.isFinite(d[k].road.y), `${k}.road is een punt`);
    assert.ok(Number.isFinite(d[k].walk.x) && Number.isFinite(d[k].walk.y), `${k}.walk is een punt`);
    assert.equal(d[k].road.x, d[k].x, `zonder weg is de plek zelf de stoeprand (${k})`);
  }
  assert.ok(Number.isFinite(d.dist) && d.dist > 0, 'de ritafstand is een getal');
  assert.equal(d.phase, 'pickup');
}
assert.equal(berichten.length, 20);
console.log('taxi_zonderweg_test: 20 ritten zonder wegen gestart');
