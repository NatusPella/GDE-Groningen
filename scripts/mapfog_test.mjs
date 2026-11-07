// #661: alleen het geraakte mistvenster uploaden en de mist minder vaak bewaren.
import fs from 'node:fs';
import { revealRect, uploadFraction, fogSaveDue, FOG_SAVE_MS } from '../game/js/mapfog.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const W = 400, H = 300;
const r = revealRect(200, 150, 2, W, H);
ok(r && r.w === 5 && r.h === 5, 'venster 5x5 rond de cel', JSON.stringify(r));
ok(Math.abs(uploadFraction(r, W, H) - 25 / (W * H)) < 1e-9, 'fractie klopt');
ok(uploadFraction(r, W, H) < 0.001, 'minder dan 0,1% van de kaart per upload');
const corner = revealRect(0, 0, 2, W, H);
ok(corner.x0 === 0 && corner.y0 === 0 && corner.w === 3, 'aan de rand afgekapt', JSON.stringify(corner));
ok(revealRect(-5, -5, 2, W, H) === null, 'buiten de kaart: niets');
console.log(`#661 meting mist: upload ${(uploadFraction(r, W, H) * 100).toFixed(3)}% van de kaart (was 100%), bewaren elke ${FOG_SAVE_MS / 1000} s (was 3 s)`);
ok(FOG_SAVE_MS === 15000, 'opslaginterval 15 s', FOG_SAVE_MS);
ok(!fogSaveDue(1000, 2000) && fogSaveDue(2001, 2000), 'opslagtimer');
const src = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
ok(/putImageData\(f\.img, 0, 0, r\.x0, r\.y0, r\.w, r\.h\)/.test(src), 'mapview uploadt alleen de rechthoek');
ok(/fogSaveDue\(now, f\.saveAt\)/.test(src), 'mapview gebruikt het nieuwe opslaginterval');
console.log(`${n - fails}/${n} mapfog`);
process.exit(fails ? 1 : 0);
