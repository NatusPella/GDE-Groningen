// #658: de voertuig-geoCache is begrensd (LRU) i.p.v. onbegrensd.
import fs from 'node:fs';
import { LRUCache } from '../game/js/lrucache.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const c = new LRUCache(180);
for (let i = 0; i < 500; i++) c.set('k' + i, { geo: i });
ok(c.size === 180, 'cache blijft op 180 entries', c.size);
ok(c.evictions === 320, 'de 320 oudste zijn eruit', c.evictions);
ok(c.get('k0') === undefined && c.get('k499'), 'oudste weg, nieuwste erin');
// recency: k100 opvragen houdt hem in leven
const c2 = new LRUCache(3);
c2.set('a', 1); c2.set('b', 2); c2.set('c', 3); c2.get('a'); c2.set('d', 4);
ok(c2.get('b') === undefined && c2.get('a') === 1 && c2.get('d') === 4, 'recency klopt');
console.log(`#658 meting geoCache: 500 unieke bodygeometrieën -> 180 in de cache (320 geëvict; was onbegrensd)`);
const src = fs.readFileSync(new URL('../game/js/models3d_vehicles.js', import.meta.url), 'utf8');
ok(/geoCache = new LRUCache\(180\)/.test(src), 'models3d_vehicles gebruikt de LRU');
console.log(`${n - fails}/${n} lrucache`);
process.exit(fails ? 1 : 0);
