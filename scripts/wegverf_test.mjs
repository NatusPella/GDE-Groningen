// Wegverf zonder gaten (#1197, hertest 24-11): zebrapaden in Marum hadden rafelige, gestippelde randen en gaten. Oorzaak: de slijtage van
// de verf gooide pixels weg onder een ruisdrempel (discard), met een ruisterm van 31 per meter die op afstand flikkert. Zowel de stadsverf
// (roadsurface.js SURF_MARKING) als de verf op het platteland (countryfield.js cPaint) houden de verf nu heel; alleen de tint varieert.
// Bron- en rekencontrole; het beeld zelf is niet in deze test gezien.
//   node scripts/wegverf_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

const rs = src('roadsurface.js');
const blok = rs.slice(rs.indexOf('#ifdef SURF_MARKING'), rs.indexOf('#endif', rs.indexOf('#ifdef SURF_MARKING')));
ok(blok.length > 20, 'de verfregel van de stad staat er');
ok(!/discard/.test(blok), 'stadsverf: geen discard (geen gaten in de strepen)');
ok(!/\* 31\.0|\* 9\.0/.test(blok), 'stadsverf: geen fijne ruis die op afstand flikkert');

const cf = src('countryfield.js');
const paint = cf.slice(cf.indexOf('vec3 cPaint('), cf.indexOf('}', cf.indexOf('vec3 cPaint(')));
ok(paint.length > 20, 'de verfregel van het platteland staat er');
ok(!/m \*= smoothstep/.test(paint) && !/discard/.test(paint), 'plattelandsverf: de dekking wordt niet weggeknipt');
ok(!/\* 31\.0|\* 9\.0/.test(paint), 'plattelandsverf: geen fijne ruis');

// de tint: tussen 0,88 en 1 van wit, dus nooit een vlek die op een gat lijkt (de oude formule ging tot 0,78 en daaronder weg)
const tint = (mw) => 0.88 + 0.12 * Math.min(1, Math.max(0, (mw - 0.25) / 0.5));
ok(tint(0) >= 0.88 && tint(1) <= 1, 'de tint blijft tussen 88 en 100 procent');

console.log(`wegverf_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
