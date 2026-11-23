// tilecache.js (24-11): een tegelwissel gooit alleen de meubeltegels rond die tegel weg, niet de hele cache.
//   node scripts/tilecache_test.mjs
import assert from 'node:assert/strict';
import { dropStaleTiles } from '../game/js/tilecache.js';
import { TILE_M } from '../game/js/gdt.js';

let n = 0;
const fill = () => { const m = new Map(); for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) m.set(`${i},${j}`, 1); return m; };

// 1. één tegel kwam bij (versie 11): alleen de 3x3 eromheen gaat weg (reik 300 m, tegels van 1000 m)
let c = fill();
dropStaleTiles(c, [10, '9,9', 11, '0,0'], 10, 300);
assert.equal(c.size, 49 - 9, 'alleen de buren van de gewijzigde tegel'); n++;
assert.ok(!c.has('1,1') && !c.has('-1,0') && c.has('2,0') && c.has('-3,-3'), 'de juiste tegels'); n++;

// 2. een overlaytegel ('oi,j') telt ook
c = fill();
dropStaleTiles(c, [5, 'o3,3'], 4, 300);
assert.ok(!c.has('3,3') && !c.has('2,2') && c.has('0,0'), 'overlaysleutel'); n++;

// 3. de log gaat niet ver genoeg terug, of er is geen log of geen beginstand: alles weg (zoals voorheen)
c = fill(); dropStaleTiles(c, [20, '0,0', 21, '1,1'], 10, 300); assert.equal(c.size, 0, 'log te kort'); n++;
c = fill(); dropStaleTiles(c, null, 10, 300); assert.equal(c.size, 0, 'geen log'); n++;
c = fill(); dropStaleTiles(c, [1, '0,0'], null, 300); assert.equal(c.size, 0, 'nog geen beginstand'); n++;
c = fill(); dropStaleTiles(c, [11, 'kapot'], 10, 300); assert.equal(c.size, 0, 'onleesbare sleutel'); n++;

// 4. oude wissels (al verwerkt) doen niets; een grotere reik pakt meer ringen
c = fill(); dropStaleTiles(c, [3, '0,0', 4, '0,0'], 4, 300); assert.equal(c.size, 49, 'niets nieuws'); n++;
c = fill(); dropStaleTiles(c, [5, '0,0'], 4, TILE_M + 1); assert.equal(c.size, 49 - 25, 'reik boven een tegel: 5x5'); n++;

console.log(`tilecache_test: ${n} controles groen`);
