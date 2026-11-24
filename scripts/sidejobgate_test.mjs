// Test: de ontgrendelpoort per bijbaan in de wereld (game/js/sidejobgate.js, #1131). Zuiver; draai met `node scripts/sidejobgate_test.mjs`.
// Bewaakt: een nieuw spel houdt een bijbaan van een latere akte dicht (met de zin van het personage), een begonnen vak, een
// gespeelde bijbaan, een oude save en een gast zijn nooit dicht, en de koppeling met de echte poort (unlockgate.js) klopt.
import { sideJobGate } from '../game/js/sidejobgate.js';
import { worldOpen, gateHint, progressFrom, newGate, migrateGate } from '../game/js/unlockgate.js';
import { vakVanBaan } from '../game/js/loopbaan.js';
import { readFileSync } from 'node:fs';

let ok = 0, fail = 0;
const check = (cond, msg) => { if (cond) ok++; else { fail++; console.log('FOUT:', msg); } };

// een poort zoals story.js hem geeft, voor een stap en een gate
const poortBij = (stepId, gate, begun = () => false) => {
  const pr = () => progressFrom({ stepId, gate, begun });
  return { open: (v) => worldOpen(v, pr()), hint: (v) => gateHint(v, pr()), begun };
};

// 1. nieuw spel in akte 1 (M01): een klus (akte 1) is open, de bus (akte 2) en de handhaving (akte 3) zijn dicht
const nieuw = poortBij('M01', newGate());
check(vakVanBaan('kamerkoning') === 'klus' && sideJobGate('kamerkoning', nieuw) === null, 'klus is open in akte 1');
check(sideJobGate('taxi', nieuw) === null, 'taxi is open in akte 1');
const bus = sideJobGate('lijn', nieuw);
check(typeof bus === 'string' && /Klaas/.test(bus), 'streekbus dicht in akte 1, met de zin van Kapitein Klaas: ' + bus);
const boa = sideJobGate('boa', nieuw);
check(typeof boa === 'string' && /Lammert/.test(boa), 'boa dicht in akte 1, met de zin van Lammert: ' + boa);

// 2. verder in het verhaal: in akte 3 (M13) zijn bus en handhaving open
const later = poortBij('M13', newGate());
check(sideJobGate('lijn', later) === null && sideJobGate('boa', later) === null, 'in akte 3 zijn bus en handhaving open');

// 3. nooit dicht: begonnen vak, gespeelde bijbaan, gast, oude save, geen poort
check(sideJobGate('boa', poortBij('M01', newGate(), (v) => v === 'handhaving')) === null, 'een begonnen vak blijft open');
check(sideJobGate('boa', nieuw, { played: true }) === null, 'een bijbaan die je al deed blijft open');
check(sideJobGate('boa', nieuw, { owner: 2 }) === null, 'een gast bij de host is nooit dicht');
const oud = migrateGate({}).gate;
check(sideJobGate('boa', poortBij('M01', oud)) === null, 'een oude save (gemigreerd) is alles open');
check(sideJobGate('boa', poortBij('M01', undefined)) === null, 'een save zonder poort is alles open');
check(sideJobGate('boa', null) === null, 'zonder poort-bron is alles open');
check(sideJobGate('', nieuw) === null, 'zonder id nooit dicht');

// 4. een falende bron sluit nooit; zonder hint een neutrale zin
check(sideJobGate('boa', { open: () => { throw new Error('x'); } }) === null, 'een falende bron sluit niet');
check(sideJobGate('boa', { open: () => false }) === 'Dit komt later in het verhaal.', 'zonder hint de neutrale zin');

// 5. de bedrading: sidejobs.js vraagt de poort bij E, de prompt, de telefoonapp en de busdienst; de kaart dimt
const sj = readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
check((sj.match(/blockReason\(w\) \|\| gateReason\(s\.job\)/g) || []).length === 2, 'E en prompt vragen de poort');
check(/why \|\| gateReason\(s\.job\)/.test(sj), 'de telefoonapp toont de poortzin');
check((sj.match(/blockReason\(w\) \|\| lineGate\(\)/g) || []).length === 3, 'de twee busdiensten en busShiftBlock vragen de poort');
check(/owner, played: rec\(job\.id\)\.rounds > 0/.test(sj), 'een gespeelde bijbaan telt als open');
const mv = readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
check(/sideJobGateHint\(sj\.job\.id\)/.test(mv) && /dicht \? \{ alpha: 0\.4 \}/.test(mv), 'de kaart dimt een dichte bijbaan');

console.log(`sidejobgate_test: ${ok} goed, ${fail} fout`);
if (fail) process.exit(1);
