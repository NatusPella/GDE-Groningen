// Kaart-perf 22-11: de beslisregel van de vaste laag en de haken in mapview.js.
import fs from 'node:fs';
import { overlayPlan, OVERLAY_SETTLE_MS } from '../game/js/mapcache.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const base = { valid: true, sameView: true, wasDirty: false, sameBase: true, sinceMoveMs: 1000 };

ok(OVERLAY_SETTLE_MS === 120, 'stilstand 120 ms');
ok(overlayPlan({ ...base, valid: false }) === 'build', 'eerste keer: bouwen');
ok(overlayPlan(base) === 'reuse', 'zelfde beeld, niets vuil: hergebruiken');
ok(overlayPlan({ ...base, wasDirty: true }) === 'build', 'laag aan/uit of pins (zelfde beeld, vuil): opnieuw bouwen');
ok(overlayPlan({ ...base, sameView: false, sinceMoveMs: 10 }) === 'interim', 'net gepand/gezoomd: tussenbeeld');
ok(overlayPlan({ ...base, sameView: false, sinceMoveMs: 500 }) === 'build', 'na stilstand: scherp opnieuw');
ok(overlayPlan({ ...base, sameView: false, sameBase: false, sinceMoveMs: 10 }) === 'build', 'andere basisschaal: bouwen');

const src = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
ok(/overlayPlan\(\{/.test(src) && /drawOverlayCached\(c, wasDirty/.test(src), 'compose gebruikt de vaste-laag-cache');
ok(/function textWidth\(ctx, tekst\)/.test(src) && /const w = textWidth\(ctx, tekst\);/.test(src), 'labelbreedte uit de cache');
ok(/g\.gen === state\.tileGen/.test(src), 'keepLastGood slaat dezelfde tegels over');
console.log(`${n - fails}/${n} kaart_perf`);
process.exit(fails ? 1 : 0);
