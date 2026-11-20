// QoL (#985): klem zitten met het gas ingedrukt geeft na zes seconden een hint en met Backspace vasthouden kom je vrij.
//   node scripts/vastlopen_test.mjs
import assert from 'node:assert/strict';
import { nieuwVast, stapVast, VAST_STIL_S, VAST_HOUD_S, VAST_HINT } from '../game/js/vastlopen.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const klem = { inVoertuig: true, gas: true, snelheid: 0, bezig: false, houdt: false };
const loop = (st, sec, inv, dt = 0.1) => { let laatste = null; const hints = []; let vrijen = 0; for (let i = 0; i < Math.round(sec / dt); i++) { laatste = stapVast(st, dt, inv); if (laatste.hint) hints.push(i * dt); if (laatste.vrij) vrijen++; } return { laatste, hints, vrijen }; };

t('de hint komt één keer na de stiltetijd en noemt de toets en het menu', () => {
  const st = nieuwVast();
  const r = loop(st, VAST_STIL_S + 3, klem);
  assert.equal(r.hints.length, 1);
  assert.ok(r.hints[0] >= VAST_STIL_S - 0.2 && r.hints[0] <= VAST_STIL_S + 0.2, 'rond zes seconden: ' + r.hints[0]);
  assert.match(VAST_HINT, /{BACKSPACE}/);
  assert.match(VAST_HINT, /Vastgelopen/);
});

t('geen hint zonder gas, tijdens een menu, in een boot of als het voertuig rijdt', () => {
  for (const inv of [{ ...klem, gas: false }, { ...klem, bezig: true }, { ...klem, inVoertuig: false }, { ...klem, snelheid: 5 }]) {
    const r = loop(nieuwVast(), 20, inv);
    assert.equal(r.hints.length, 0, JSON.stringify(inv));
    assert.equal(r.laatste.vast, false);
  }
});

t('rijden of de gas loslaten zet de teller terug; een nieuwe vastzit-periode geeft weer een hint', () => {
  const st = nieuwVast();
  loop(st, VAST_STIL_S - 1, klem);
  loop(st, 1, { ...klem, snelheid: 6 });
  assert.equal(loop(st, VAST_STIL_S - 1, klem).hints.length, 0, 'de teller begon opnieuw');
  assert.equal(loop(st, 2, klem).hints.length, 1);
  loop(st, 1, { ...klem, snelheid: 6 });
  assert.equal(loop(st, VAST_STIL_S + 1, klem).hints.length, 1, 'na het rijden weer een hint');
});

t('Backspace vasthouden komt pas vrij als je echt vastzit en lang genoeg vasthoudt', () => {
  const st = nieuwVast();
  assert.equal(loop(st, 3, { ...klem, houdt: true }).vrijen, 0, 'nog niet vast: Backspace doet niets');
  loop(st, VAST_STIL_S, klem);
  assert.equal(loop(st, VAST_HOUD_S - 0.4, { ...klem, houdt: true }).vrijen, 0, 'te kort');
  loop(st, 0.1, { ...klem, houdt: false }); // loslaten zet het vasthouden terug
  assert.equal(loop(st, VAST_HOUD_S - 0.4, { ...klem, houdt: true }).vrijen, 0, 'opnieuw beginnen na loslaten');
  assert.equal(loop(st, 1, { ...klem, houdt: true }).vrijen, 1, 'vrij na anderhalve seconde');
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
