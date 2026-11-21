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

// 2. de bron: er zijn helemaal geen procedurele randen meer (#1092, voorheen alleen in een gedekt blok, #945)
const src = fs.readFileSync(new URL('../game/js/countryside.js', import.meta.url), 'utf8');
for (const naam of ['genFieldEdges', 'fenceLine', 'hedgeLine', 'fencedParcel', 'parcelGate', 'spanOnDitch', 'WIRE_ROW_P', 'HEDGE_ROW_P', 'TREE_ROW_P', 'hedgeMapped'])
  ok(!src.includes(naam), 'countryside.js kent ' + naam + ' niet meer');
for (const soort of ['post', 'wire', 'gate', 'bank', 'rush'])
  ok(!new RegExp("push\\(tile, '" + soort + "'").test(src), 'countryside.js zet geen ' + soort + ' meer');
ok(!/PROP_TYPES[\s\S]{0,200}\b(post|wire|gate|bank|rush): \{/.test(src.slice(src.indexOf('const PROP_TYPES'), src.indexOf('const PROP_TYPES') + 600)), 'de proptabel heeft geen randsoorten meer');
ok(/#1092: no procedural field edges at all/.test(src), 'de plek van de oude randen draagt de regel');

console.log(`${n - fails}/${n} fielderand`);
process.exit(fails ? 1 : 0);
