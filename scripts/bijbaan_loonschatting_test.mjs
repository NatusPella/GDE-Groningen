// QoL (#985): de loonschatting van de tien nieuwe bijbanen komt uit hun eigen regels, niet uit het "25 tot 60"-gemiddelde.
// Elke geschatte laagste en hoogste basis en de hoogste fooi wordt nagerekend met result() op een nagebootste einduitslag.
//   node scripts/bijbaan_loonschatting_test.mjs
import assert from 'node:assert/strict';
import { BIJBAAN_IDS, LOON_SCHATTING, loonSchatting, startRonde, rondeResultaat } from '../game/js/bijbaanregels.js';
import { SIDEJOB_PAY_MULT } from '../game/js/economy.js';

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

const uitslag = (id, o) => { const r = startRonde(id, 1, () => 0.5); Object.assign(r.s, o); return rondeResultaat(r); };
// laag = geslaagd met de laagste basis en zonder fooi; hoog = de beste ronde
const SCENARIOS = {
  fietssoep: { laag: { done: 3, spill: 3.9 }, hoog: { done: 3, spill: 0 } },
  taxinacht: { laag: { arrived: true, fare: 6, patience: 0.02 }, hoog: { arrived: true, fare: 8, patience: 1 } },
  veerdienst: { laag: { docked: true, t: 200, speeding: 0, bumps: 1 }, hoog: { docked: true, t: 0, speeding: 0, bumps: 0 } },
  balenrit: { laag: { dropped: true, bales: 5, lost: 5 }, hoog: { dropped: true, bales: 10, lost: 0 } },
  kermisdraai: { laag: { rides: 3, target: 3, happy: 0 }, hoog: { rides: 3, target: 3, happy: 1 } },
  berging: { laag: { delivered: true, damage: 1 }, hoog: { delivered: true, damage: 0 } },
  strandpost: { laag: { answered: 1, missed: 1 }, hoog: { answered: 2, missed: 0 } },
  schoolrit: { laag: { at: 3, points: 0 }, hoog: { at: 3, points: 10 } },
  melkrit: { laag: { delivered: true, litres: 4500, temp: 11 }, hoog: { delivered: true, litres: 4500, temp: 4 } },
  brugdienst: { laag: { passed: 2, complaints: 3, wait: 99 }, hoog: { passed: 6, complaints: 0, wait: 0 } },
};

t('elke van de tien banen heeft een schatting en geen enkele is het algemene 25-60', () => {
  assert.deepEqual(Object.keys(LOON_SCHATTING).sort(), [...BIJBAAN_IDS].sort());
  for (const id of BIJBAAN_IDS) {
    const [lo, hi] = loonSchatting(id);
    assert.ok(lo > 0 && hi > lo, id);
    assert.notDeepEqual([lo, hi], [25, 60], id);
  }
  assert.equal(loonSchatting('bestaatniet'), null);
});

for (const id of BIJBAAN_IDS) {
  t(`${id}: de schatting volgt de echte uitbetaling van result()`, () => {
    const laag = uitslag(id, SCENARIOS[id].laag), hoog = uitslag(id, SCENARIOS[id].hoog);
    const e = LOON_SCHATTING[id];
    assert.equal(laag.failed, false, 'de lage ronde is geslaagd');
    assert.equal(laag.base, e.min, 'laagste basis');
    assert.equal(hoog.base, e.max, 'hoogste basis');
    assert.equal(hoog.tip, e.tip, 'hoogste fooi');
    assert.equal(laag.tip, 0, 'laagste fooi');
    const [lo, hi] = loonSchatting(id);
    assert.equal(lo, Math.round(laag.base * SIDEJOB_PAY_MULT));
    assert.equal(hi, Math.round(hoog.base * SIDEJOB_PAY_MULT) + hoog.tip);
  });
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
