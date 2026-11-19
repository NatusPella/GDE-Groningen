// Verlopende cache en de afstandsopmaak. node scripts/ttlcache_test.mjs
import { createTtlCache } from '../game/js/ttlcache.js';
import { intervalDue } from '../game/js/hudgate.js';
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const c = createTtlCache(0.75); let runs = 0; const f = () => ({ r: ++runs });
const a = c.get(0, 'heal', f), b = c.get(0.5, 'heal', f);
ok(a === b && runs === 1, 'binnen de ttl dezelfde waarde');
ok(c.get(0.8, 'heal', f).r === 2, 'na de ttl opnieuw');
ok(c.get(0.9, 'repair', f).r === 3, 'andere sleutel meteen opnieuw');
c.clear(); ok(c.get(0.95, 'repair', f).r === 4, 'na clear opnieuw');
const nul = createTtlCache(1); let k = 0; nul.get(0, 'a', () => { k++; return null; }); nul.get(0.1, 'a', () => { k++; return null; });
ok(k === 1, 'ook null (geen doel) wordt onthouden');
const st = { t: 0 }; let due = 0;
for (let i = 0; i < 60; i++) if (intervalDue(st, 1 / 60, 0.15)) due++;
ok(due >= 6 && due <= 8, 'intervalDue: ~7 keer per seconde, niet 60: ' + due);
ok(intervalDue({ t: 0 }, 0, 0.15) === true, 'eerste aanroep meteen');
await import('./node3d.mjs');
const { formatDistance } = await import('../game/js/routing.js');
for (const m of [0, 4, 15, 999, 1000, 1049, 1050, 12345, 1e6]) {
  const want = m < 1000 ? Math.max(0, Math.round(m / 10) * 10) + ' m' : (m / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
  ok(formatDistance(m) === want, 'formatDistance ' + m + ' = ' + want);
}
console.log(`ttlcache_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
