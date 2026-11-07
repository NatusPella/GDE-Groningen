// #661: de kaart tekent niet meer 60x/s terwijl de wereld stilstaat.
import fs from 'node:fs';
import { mapRenderDue, MAP_RENDER_HZ } from '../game/js/mapcache.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(MAP_RENDER_HZ === 15, '15 Hz', MAP_RENDER_HZ);
// 60 frames van 1/60 s, gepauzeerd en niets vuil
let last = 0, renders = 0, now = 0;
for (let f = 0; f < 60; f++) { now += 1000 / 60; if (mapRenderDue(now, last, true, false)) { renders++; last = now; } }
ok(renders >= 12 && renders <= 16, 'gepauzeerd: ~15 tekeningen per seconde (was 60)', renders);
// niet gepauzeerd: elke frame
let r2 = 0; last = 0; now = 0;
for (let f = 0; f < 60; f++) { now += 1000 / 60; if (mapRenderDue(now, last, false, false)) { r2++; last = now; } }
ok(r2 === 60, 'niet gepauzeerd: elke frame', r2);
// vuil: meteen
ok(mapRenderDue(now, now - 1, true, true), 'een vuile laag tekent meteen');
console.log(`#661 meting kaart: gepauzeerd ${renders} i.p.v. 60 tekeningen/s, actief 60/s`);
const src = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
ok(/mapRenderDue\(now, state\.lastRender \|\| 0, !!world\.paused, !!state\.dirty\)/.test(src), 'updateMapView gebruikt de throttle');
console.log(`${n - fails}/${n} mapcache`);
process.exit(fails ? 1 : 0);
