// TileStore: een tegel die iemand uitdrukkelijk vroeg (een route vooruit, een sprong, een venster zonder pin) en die buiten de
// ring van de speler ligt, werd door de eerstvolgende prefetch meteen weer losgelaten: zijn wachttijd (holdMs) telde vanaf 0 in
// plaats van vanaf zijn aankomst. Het vooruitladen van een rit of sprong laadde, bouwde en sloopte de tegel dan voor niets.
//   node scripts/tilestore_hold_test.mjs
import assert from 'node:assert/strict';
import { TileStore } from '../game/js/tilestore.js';
import { tileIndexOf, tileKey } from '../game/js/gdt.js';

const settle = () => new Promise((r) => setTimeout(r, 15));
const [i, j] = tileIndexOf(0, 0);
const far = tileKey(i + 8, j); // 8 km from the player
const tiles = { [far]: { i: i + 8, j, pack: 'a', off: 0, len: 10, raw: 100 } };
for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) tiles[tileKey(i + di, j + dj)] = { i: i + di, j: j + dj, pack: 'a', off: 0, len: 10, raw: 100 };
const index = { packs: { a: { file: 'a-1.gdp', size: 10 } }, tiles };
const source = { read: async () => new Uint8Array(10), readAll: async () => new Uint8Array() };

let clock = 60000; // the game has been running for a minute
const store = new TileStore({ source, index, decode: async () => ({}), now: () => clock, budgetBytes: 1000, evictFrom: 0.35, holdMs: 10000 });
const drops = [];
store.on('drop', (k) => drops.push(k));

store.prefetch(0, 0, { radius: 1500 });
await settle();
assert.ok(store.residentBytes > store.budgetBytes * store.evictFrom, 'de hysterese staat aan (boven evictFrom)');

// a route asks for a tile far ahead
store.request(far, { priority: 4000, token: 'route:1' }).catch(() => {});
await settle();
assert.equal(store.ready(far), true, 'de gevraagde tegel is binnen');

clock += 16;
store.prefetch(0, 0, { radius: 1500 });
assert.equal(store.ready(far), true, 'de eerstvolgende prefetch laat een net gevraagde tegel niet meteen los');
assert.deepEqual(drops, [], 'er is niets losgelaten');

clock += 9000;
store.prefetch(0, 0, { radius: 1500 });
assert.equal(store.ready(far), true, 'binnen holdMs na aankomst blijft hij');

clock += 2000;
store.prefetch(0, 0, { radius: 1500 });
assert.equal(store.ready(far), false, 'na holdMs buiten de ring gaat hij wel weg (geen lek)');
assert.deepEqual(drops, [far]);

// a tile that was wanted and left the ring keeps its own clock (unchanged behaviour)
clock += 100;
store.prefetch(8000, 0, { radius: 1500 });
await settle();
const near = tileKey(i, j);
assert.equal(store.ready(near), true, 'net buiten de ring: nog binnen holdMs');
clock += 10001;
store.prefetch(8000, 0, { radius: 1500 });
assert.equal(store.ready(near), false, 'een tegel die de ring verliet gaat na holdMs weg');

console.log('ok: tilestore_hold_test');
