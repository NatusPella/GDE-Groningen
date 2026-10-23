// Samen spelen (#429): een gast speelt hengelen of pannenkoeken bakken op zijn eigen scherm. Zijn lichaam bij de host staat dan stil
// (input.stil): geen stick, geen sprong, geen rennen en geen bukken, terwijl Spatie en de letters voor de minigame wel aankomen (wasPressed).
import assert from 'node:assert/strict';

globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = globalThis.document || { addEventListener() {}, activeElement: null };
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
const { Input } = await import('../game/js/input.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const maak = () => new Input({ addEventListener() {}, removeEventListener() {} });

t('zonder stil beweegt de gast zoals altijd', () => {
  const i = maak();
  i.keys.add('w'); i.keys.add(' '); i.keys.add('shift');
  assert.notDeepEqual(i.axis(), [0, 0]);
  assert.equal(i.isDown(' '), true);
  assert.equal(i.isDown('shift'), true);
});
t('met stil staat het lichaam stil, maar de minigame leest nog steeds de aangetikte toets', () => {
  const i = maak();
  i.keys.add('w'); i.keys.add(' '); i.keys.add('shift'); i.keys.add('control');
  i._justPressed.add(' ');
  i.stil = 2;
  assert.deepEqual(i.axis(), [0, 0]);
  for (const k of [' ', 'shift', 'control']) assert.equal(i.isDown(k), false, k);
  assert.equal(i.wasPressed(' '), true, 'het uitgooien met Spatie komt aan');
});
t('stil telt per beeld af: gaat de gast uit de activiteit of stopt het spel, dan loopt hij vanzelf weer', () => {
  const i = maak();
  i.keys.add('w'); i.stil = 2;
  i.endFrame(); assert.equal(i.stil, 1); assert.deepEqual(i.axis(), [0, 0]);
  i.endFrame(); assert.equal(i.stil, 0); assert.notDeepEqual(i.axis(), [0, 0]);
  i.endFrame(); assert.equal(i.stil, 0, 'nooit negatief');
});
console.log(`coopgastlokaal_test: ${n}/${n} ok`);
process.exit(0);
