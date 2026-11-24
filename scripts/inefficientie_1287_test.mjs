// Issue #1287 punt 6: geen Object.keys(probes) per beeld in narrative.js; het gedrag blijft gelijk.
//   node scripts/inefficientie_1287_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

let n = 0, fails = 0;
const t = (naam, fn) => {
  n++;
  try {
    fn();
    console.log('ok    ' + naam);
  } catch (e) {
    fails++;
    console.log('FAIL  ' + naam + ' :: ' + e.message);
  }
};

// ===== Punt 6: narrative.js Object.keys(probes) per beeld =====
const { registerNarrative, updateNarrative, resetNarrative, narrativeBusy, setNarrativeClock } = await import('../game/js/narrative.js');

t('narrative: Object.keys(probes) wordt niet per beeld aangeroepen', () => {
  resetNarrative();
  let keysCalls = 0;
  const original = Object.keys;
  Object.keys = function(obj) {
    // Tel alleen aanroepen op het probes-object (we herkennen het aan zijn structuur)
    if (obj && typeof obj === 'object') {
      const vals = original.call(this, obj);
      if (vals.length > 0 && vals.every(k => obj[k] && typeof obj[k] === 'object' && 'active' in obj[k])) {
        keysCalls++;
      }
    }
    return original.apply(this, arguments);
  };

  let time = 0;
  setNarrativeClock(() => time);

  // Registreer drie probes
  registerNarrative('scene', { active: () => false, pending: () => false });
  registerNarrative('contact', { active: () => false, pending: () => false });
  registerNarrative('call', { active: () => false, pending: () => false });

  keysCalls = 0; // reset na registratie

  // 100 beelden
  for (let i = 0; i < 100; i++) {
    time += 0.016;
    updateNarrative();
    narrativeBusy(); // roept updateNarrative opnieuw aan
  }

  Object.keys = original;
  assert.equal(keysCalls, 0, `Object.keys(probes) werd ${keysCalls} keer aangeroepen, verwacht 0`);
});

t('narrative: gedrag blijft gelijk - transitie wordt gedetecteerd', () => {
  resetNarrative();
  let time = 0;
  setNarrativeClock(() => time);

  let sceneActive = false;
  registerNarrative('scene', {
    active: () => sceneActive,
    pending: () => false
  });

  // Eerst uit
  updateNarrative();
  assert.equal(narrativeBusy(), false);

  // Dan aan
  sceneActive = true;
  updateNarrative();
  assert.equal(narrativeBusy(), true);

  // Dan weer uit
  time += 1;
  sceneActive = false;
  updateNarrative();
  assert.equal(narrativeBusy(), false);
});

// Punt 8 (missions.js) en 9 (achievementtracker.js) laden niet los in node; die zijn alleen nagelezen, niet hier getest.

console.log(fails ? `inefficientie_1287_test: ${fails} van ${n} mislukt` : `inefficientie_1287_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
