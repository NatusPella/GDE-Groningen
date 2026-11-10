// #804: de straatmeubel-streamer bouwt per beurt hoogstens twee nieuwe tegels.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../game/js/streetfurniture3d.js', import.meta.url), 'utf8');
let fails = 0;
const ok = (c, n) => { if (!c) { fails++; console.log('FAIL ' + n); } };
ok(/PROP_NEW_TILES_PER_CALL = 2/.test(src), 'cap staat op twee tegels per beurt');
ok(/wasNew && newTiles >= PROP_NEW_TILES_PER_CALL\) continue/.test(src), 'nieuwe tegels boven de cap worden overgeslagen');
ok(src.indexOf('newTiles++') < src.indexOf('tileItems(i, j)', src.indexOf('function streamFurnitureProps')), 'de teller loopt vóór tileItems');
console.log(fails ? fails + ' FAIL' : 'streetfurniture_budget_test ok: per streambeurt hoogstens twee nieuwe tegels');
process.exit(fails ? 1 : 0);
