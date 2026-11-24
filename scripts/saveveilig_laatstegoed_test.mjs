// #1295 bug 2: laatsteGoed in makeSafe is één lijst per sessie en wordt niet geleegd bij het laden van
// een andere plek (slot). Als een onderdeel daarna struikelt, komt het veld van de vorige plek in de
// nieuwe save.
// Pure test (geen opslag, geen DOM).   node scripts/saveveilig_laatstegoed_test.mjs
import assert from 'node:assert/strict';
import { makeSafe } from '../game/js/saveveilig.js';

let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

// Het probleem: laatsteGoed blijft gevuld tussen saves
ok(() => {
  const { veilig, clearSafe } = makeSafe();

  // Eerste save (slot 1): veld "missies" lukt, waarde [1, 2, 3]
  const waarde1 = veilig('missies', () => [1, 2, 3]);
  assert.deepEqual(waarde1, [1, 2, 3], 'eerste save: missies lukt');

  // Tweede save (slot 2 geladen): laatsteGoed legen
  clearSafe();

  // Veld "missies" faalt
  const waarde2 = veilig('missies', () => { throw new Error('missies kapot'); });

  // De verwachting: undefined, want er is geen terugval en laatsteGoed is geleegd
  assert.equal(waarde2, undefined, 'na clearSafe en falen zonder terugval: undefined');
}, 'laatsteGoed lekt niet tussen slots');

// Een oplossing: clearSafe() om laatsteGoed te legen bij het laden van een nieuwe save
ok(() => {
  const { veilig, clearSafe } = makeSafe();
  assert.equal(typeof clearSafe, 'function', 'makeSafe geeft een clearSafe terug');

  // Eerste save: veld "geld" lukt
  veilig('geld', () => 500);

  // Nieuwe save laden: laatsteGoed legen
  clearSafe();

  // Veld "geld" faalt: moet undefined zijn, niet 500
  const waarde = veilig('geld', () => { throw new Error('geld kapot'); });
  assert.equal(waarde, undefined, 'na clearSafe en falen: undefined');
}, 'clearSafe leegt laatsteGoed');

console.log(`saveveilig_laatstegoed_test: ${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
