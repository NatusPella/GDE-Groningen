// Verse spelstaat (22-11):  node scripts/verse_staat_test.mjs
// Een nieuw spel: Verhaal 0 van N, de opening wacht, de verzonnen startdatum. En de oorzaak van "Verhaal 50 van 71":
// loopbanen uit het gedeelde apparaatprofiel maakten stappen "afgeleid gedaan" (stapAfgeleidGedaan) en een gedane
// missiestap telt alle stappen ervoor mee. Daarom hoort de loopbaan bij de save (savescope.js).
import { STEPS, STEP_BY_ID, stepAvailable, stepDone, nextStoryStep, stapAfgeleidGedaan } from '../game/js/storyarc.js';
import { formatDay, partStartDay } from '../game/js/calendar.js';
import { SCOPED_KEYS } from '../game/js/savescope.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// de Spel-overzicht-som, zoals story.js getStorySteps die maakt: doneId = in de save, of afgeleid uit een begonnen loopbaan
function overzicht(doneSet, gestart, passed = () => false) {
  const doneId = (id) => doneSet.has(id) || stapAfgeleidGedaan(STEP_BY_ID.get(id), gestart, null);
  let done = 0, total = 0;
  STEPS.forEach((s, k) => { if (!stepAvailable(s)) return; total++; if (stepDone(k, doneId, passed)) done++; });
  const nx = nextStoryStep(doneId, passed);
  return { done, total, huidig: nx && nx.id ? nx : null };
}

const vers = overzicht(new Set(), () => false);
ok(vers.done === 0, 'verse staat: Verhaal 0 van N', `${vers.done}/${vers.total}`);
ok(vers.total > 50, 'er zijn meer dan 50 stappen', String(vers.total));
ok(vers.huidig && vers.huidig.id === 'M00' && vers.huidig.goal && vers.huidig.goal.type === 'opening', 'verse staat: stap 1 is de opening (wacht)', vers.huidig && vers.huidig.id);
const stapNu = Math.min(vers.done + 1, vers.total);
ok(stapNu === 1, 'Stap 1 in het overzicht');

// verse staat met begonnen loopbanen uit een ANDER spel: dat is de lek
const lek = overzicht(new Set(), () => true);
console.log('lek:', lek.done, 'van', lek.total);
ok(lek.done > 0, 'oorzaak: begonnen loopbanen uit een ander spel tellen stappen als gedaan', `${lek.done}/${lek.total}`);

// de lek is dicht: loopbaan, prestaties (de zaaibron van de loopbaan) en kaart horen bij de save
for (const k of ['loopbaan', 'achievements', 'exploration', 'gebieden']) ok(SCOPED_KEYS.includes(k), `per save: ${k}`);

// de startdatum is de verzonnen kalender: de opening (Kop) valt op vrijdag 14 augustus
const kop = formatDay(partStartDay('kop'));
ok(kop.long === 'Vrijdag 14 augustus', 'startdatum van het verhaal', kop.long);
ok(formatDay(1).n === 1, 'kalenderdag 1 bestaat');

console.log(fails ? `${fails} van ${n} mislukt` : `verse_staat_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
