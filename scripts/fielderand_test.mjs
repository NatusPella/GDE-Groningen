// #945: geen procedurele akkerranden meer over de echte weg (Winschoten).
// Waar de tegels echte percelen, wegen en sloten hebben, zijn die van de data;
// een fictief perceel krijgt geen raster meer. Deze test controleert de regel in
// countryside.js (broncheck: het bestand bouwt THREE-modellen en is in Node niet
// los te laden) en dat de poort `provinceBlock` doet wat hij moet doen.
//   node scripts/fielderand_test.mjs
import fs from 'node:fs';
import { setProvinceBlocks, provinceBlock } from '../game/js/countryfield.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// 1. de poort: alleen blokken die de echte tegels dekken zijn "covered"
setProvinceBlocks({ x0: 10, y0: 20, w: 2, h: 2, data: new Uint8Array([1, 0, 1, 1]) });
ok(provinceBlock(10, 20) === true, 'een gedekt blok is covered');
ok(provinceBlock(11, 20) === false, 'een blok zonder tegel niet');
ok(provinceBlock(10, 21) === true, 'de data-index telt vanaf x0/y0');
ok(provinceBlock(9, 20) === false && provinceBlock(10, 22) === false, 'buiten het bereik is niet covered');
setProvinceBlocks(null);
ok(provinceBlock(10, 20) === false, 'zonder provincielaag is niets covered');

// 2. de bron: de fictieve randen zijn weg en de echte data is de baas
const src = fs.readFileSync(new URL('../game/js/countryside.js', import.meta.url), 'utf8');
const fenced = src.slice(src.indexOf('function fencedParcel('), src.indexOf('// emit(s, e)'));
ok(fenced.length > 0, 'fencedParcel gevonden');
ok(/real !== 'weide' && real !== 'boomgaard'/.test(fenced), 'alleen een echte weide of boomgaard krijgt een rand');
ok(!/parcelUse\(seed\)/.test(fenced), 'geen fictieve grondsoort meer in fencedParcel (#945)');
ok(/const covered = provinceBlock\(bx, by\)/.test(src), 'de tegel kent de gedekte blokken');
ok(/if \(!covered\) genFieldEdges\(/.test(src), 'in een gedekt blok geen procedurele veldranden');
ok(/else if \(!covered && lh < WIRE_ROW_P\)/.test(src), 'ook geen fictief raster op de perceelgrens in een gedekt blok');
ok(!/genRealFieldEdges/.test(src), 'geen verweesde generator');

console.log(`${n - fails}/${n} fielderand`);
process.exit(fails ? 1 : 0);
