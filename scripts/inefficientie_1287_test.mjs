// Issue #1287 punten 6, 8, 9: geen Object.keys per beeld, geen filter per beeld,
// geen nieuwe closure per beeld. Tests draaien in node: gedrag moet gelijk blijven.
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

// ===== Punt 8: missions.js groep.filter per beeld =====
// missions.js laadt niet in node zonder wereld, dus brontest
import fs from 'node:fs';
const missionsSrc = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');

t('missions: geen groep.filter per beeld bij fatbike onFoot check', () => {
  // Zoek de updateMissionKern functie
  const fnStart = missionsSrc.indexOf('function updateMissionKern(');
  assert.ok(fnStart > 0, 'updateMissionKern gevonden');

  const fnBody = missionsSrc.slice(fnStart, fnStart + 15000);

  // Check dat de filter vervangen is door een gewone lus
  const hasFilterInVehicle = /groep\.filter\(\s*\(?\s*a\s*\)?\s*=>\s*a\.inVehicle\s*\)/.test(fnBody);
  assert.ok(!hasFilterInVehicle, 'geen groep.filter((a) => a.inVehicle) meer');

  // Check dat er nog steeds een rijdend-lijst is
  const hasRijdend = /(?:const|let)\s+rijdend\s*=/.test(fnBody);
  assert.ok(hasRijdend, 'rijdend-lijst bestaat nog steeds');
});

// ===== Punt 9: achievementtracker.js nieuwe closure per beeld =====
// achievementtracker.js laadt niet in node zonder wereld, dus brontest
const achievementSrc = fs.readFileSync(new URL('../game/js/achievementtracker.js', import.meta.url), 'utf8');

t('achievementtracker: geen nieuwe closure per beeld bij updateGebieden', () => {
  // Zoek de updateAchievementTracker functie
  const fnStart = achievementSrc.indexOf('export function updateAchievementTracker(');
  assert.ok(fnStart > 0, 'updateAchievementTracker gevonden');

  const fnBody = achievementSrc.slice(fnStart, fnStart + 5000);

  // Check dat de inline arrow function vervangen is
  const hasInlineArrow = /updateGebieden\s*\([^,]+,\s*[^,]+,\s*\(\s*\)\s*=>/.test(fnBody);
  assert.ok(!hasInlineArrow, 'geen inline arrow function meer bij updateGebieden');

  // Check dat er een hergebruikte functie is of dat de logica eruit is
  // We accepteren beide: een aparte functie bovenin, of de filter vooraf gedaan
  const hasCall = /updateGebieden\s*\(/.test(fnBody);
  assert.ok(hasCall, 'updateGebieden wordt nog steeds aangeroepen');
});

console.log(fails ? `inefficientie_1287_test: ${fails} van ${n} mislukt` : `inefficientie_1287_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
