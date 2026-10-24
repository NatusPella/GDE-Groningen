// Samen spelen (#95): planning van de figuren van andere spelers (game/js/coopfigures.js).
import assert from 'node:assert/strict';
import * as F from '../game/js/coopfigures.js';
import { ensureFigure } from '../game/js/coopclient.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('nieuwe figuren worden toegevoegd, bestaande behouden, verdwenen opgeruimd', () => {
  const w = {}; ensureFigure(w, 2, 'bram'); ensureFigure(w, 3, 'lotte');
  for (const f of Object.values(w.coopFigures)) { f.x = 1; f.y = 2; }
  let p = F.planFigures([], w.coopFigures);
  assert.deepEqual(p.add.map((f) => f.slot), [2, 3]); assert.deepEqual(p.remove, []);
  p = F.planFigures([2, 3, 5], w.coopFigures);
  assert.deepEqual(p.keep.map((f) => f.slot), [2, 3]); assert.deepEqual(p.remove, [5]); assert.deepEqual(p.add, []);
  delete w.coopFigures[3];
  assert.deepEqual(F.planFigures([2, 3], w.coopFigures).remove, [3]);
});
t('figuren zonder positie of personage tellen niet mee; geen figuren is geen werk', () => {
  assert.deepEqual(F.planFigures([], { 2: { slot: 2, char: 'rik', x: NaN, y: 0 }, 3: { slot: 3, x: 1, y: 1 } }), { add: [], keep: [], remove: [] });
  assert.deepEqual(F.planFigures([], undefined), { add: [], keep: [], remove: [] });
});
t('een andere speler op dezelfde plek vraagt een nieuw model', () => {
  assert.equal(F.needsRebuild('bram', { char: 'bram' }), false); assert.equal(F.needsRebuild('bram', { char: 'rik' }), true);
});
t('loopsnelheid uit verplaatsing; een teleport telt niet; eerste frame is 0', () => {
  assert.equal(F.walkSpeed(null, { x: 1, y: 1 }, 0.016), 0);
  assert.ok(Math.abs(F.walkSpeed({ x: 0, y: 0 }, { x: 0.1, y: 0 }, 0.05) - 2) < 1e-9);
  assert.equal(F.walkSpeed({ x: 0, y: 0 }, { x: 500, y: 0 }, 0.016), 0);
  assert.equal(F.walkSpeed({ x: 0, y: 0 }, { x: 1, y: 0 }, 0), 0);
});
t('label: naam en kleur van de speler', () => {
  const w = {}; const f = ensureFigure(w, 2, 'sanne');
  assert.deepEqual(F.labelSpec(f), { tekst: 'Sanne', kleur: '#5bd6a0' });
  assert.deepEqual(F.labelSpec({}), { tekst: '?', kleur: '#ffffff' });
  assert.deepEqual(F.labelSpec({ avatar: { naam: 'Bouwer', kleur: '#123456' } }), { tekst: 'Bouwer', kleur: '#123456' });
});
t('anderen worden als online-avatar gepland, nooit als Tammo of Tessa (#455)', () => {
  const w = {}; const f = ensureFigure(w, 0);
  assert.equal(f.char, f.avatar.char); assert.notEqual(f.char, 'tammo'); assert.notEqual(f.char, 'anita');
  assert.equal(F.figuurChar(f), f.avatar.char);
  assert.equal(F.needsRebuild(f.char, { avatar: { char: f.char } }), false);
});
console.log(`coopfigures_test: ${n}/${n} ok`);
