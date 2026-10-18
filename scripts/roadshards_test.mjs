// Glasscherven en lekke banden (#41): node scripts/roadshards_test.mjs
import { createShards, dropShards, dropSpikes, shardPuncture, SHARD_LIFE, SPIKE_LIFE, SPIKE_SPAN } from '../game/js/roadshards.js';
let bad = 0;
const check = (n, c) => { if (!c) { bad++; console.log('FAIL', n); } };
const st = createShards();
dropShards(st, 10, 10, 0);
const car = (x, y, speed) => ({ x, y, speed });
check('ver weg is veilig', !shardPuncture(st, car(50, 50, 10), 1, () => 0));
check('stapvoets is veilig', !shardPuncture(st, car(10, 10, 1), 1, () => 0));
check('geluk: geen lek', !shardPuncture(st, car(10, 10, 10), 1, () => 0.99));
check('een veld raakt maar één keer', !shardPuncture(st, car(10, 10, 10), 2, () => 0));
dropShards(st, 20, 20, 0);
check('pech: lek', shardPuncture(st, car(20.5, 20, 10), 3, () => 0));
check('al lek: niet nog eens', !shardPuncture(st, { ...car(20, 20, 10), flat: true }, 3, () => 0));
dropShards(st, 30, 30, 0);
check('veegwagen ruimt op', !shardPuncture(st, car(30, 30, 10), SHARD_LIFE + 1, () => 0) && st.fields.length === 0);
for (let i = 0; i < 100; i++) dropShards(st, i, 0, 0);
check('begrensd aantal', st.fields.length <= 24);
// de spijkermat van de politie (#204): een strook dwars over de weg (weg langs de x-as)
{
  const sp = createShards();
  dropSpikes(sp, 100, 0, 0, 0);
  check('naast de strook (langs de weg) is veilig', !shardPuncture(sp, car(103, 0, 10), 1, () => 0));
  check('naast de strook (dwars) is veilig', !shardPuncture(sp, car(100, SPIKE_SPAN / 2 + 1, 10), 1, () => 0));
  check('geluk: de strook mist de band niet, maar kans', !shardPuncture(sp, car(100.2, 1, 10), 1, () => 0.99));
  check('een strook raakt maar één keer', !shardPuncture(sp, car(100, 0, 10), 1, () => 0));
  dropSpikes(sp, 200, 0, 0, 0);
  check('over de strook: lek', shardPuncture(sp, car(200.3, -2, 12), 1, () => 0));
  check('ook stapvoets over de spijkers is niet veilig', (() => { dropSpikes(sp, 300, 0, 0, 0); return shardPuncture(sp, car(300, 0, 2), 1, () => 0); })());
  check('stilstaand op de strook gebeurt niets', (() => { dropSpikes(sp, 400, 0, 0, 0); return !shardPuncture(sp, car(400, 0, 0), 1, () => 0); })());
  check('de strook staat ook schuin op een weg met een hoek', (() => { const s2 = createShards(); dropSpikes(s2, 0, 0, Math.PI / 2, 0); return shardPuncture(s2, car(2.5, 0.2, 10), 1, () => 0) && s2.lastKind === 'spijkers'; })());
  check('de strook verdwijnt na een minuut', (() => { const s3 = createShards(); dropSpikes(s3, 0, 0, 0, 0); return !shardPuncture(s3, car(0, 0, 10), SPIKE_LIFE + 1, () => 0) && s3.fields.length === 0; })());
  check('hooguit twee matten tegelijk', (() => { const s4 = createShards(); for (let i = 0; i < 5; i++) dropSpikes(s4, i * 50, 0, 0, 0); return s4.fields.filter((f) => f.kind === 'spijkers').length === 2; })());
  check('glasscherven blijven werken naast spijkers', (() => { const s5 = createShards(); dropShards(s5, 10, 10, 0); dropSpikes(s5, 50, 0, 0, 0); return shardPuncture(s5, car(10, 10, 10), 1, () => 0) && s5.lastKind === 'glas'; })());
}
if (bad) process.exit(1);
console.log('roadshards: all passed');
