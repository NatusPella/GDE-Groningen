// De veiligheids-watchdog voor scènes (#515): een scène mag niet spontaan overslaan omdat de wandklok
// sneller loopt dan de scène zelf (een gast die langzamer loopt, een hapering, een eigen tempo).
// safety.js is niet te importeren (het hangt via cinematics.js aan three.js), dus deze test toetst de
// afspraak in de bron: de teller volgt de scèneklok, en er blijft een harde grens als vangnet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bron = fs.readFileSync(path.join(ROOT, 'game', 'js', 'safety.js'), 'utf8');

let n = 0, fails = 0;
const ok = (voorwaarde, wat) => { n++; if (!voorwaarde) { fails++; console.log('FAIL ' + wat); } };

// het blok van de scène-watchdog: van de scènewissel tot het einde van de functie
const start = bron.indexOf('if (c !== cineSeen)');
const eind = bron.indexOf('function watchRespawn');
ok(start > 0 && eind > start, 'de watchdog voor scènes is te vinden');
const blok = start > 0 && eind > start ? bron.slice(start, eind) : '';

// 1. de teller volgt de scèneklok
ok(/cinematicState\(\)\s*&&\s*cinematicState\(\)\.t/.test(blok), 'de watchdog leest de scèneklok (cinematicState().t)');
ok(/sceneT\s*\+=\s*Math\.max\(0,\s*nu\s*-\s*sceneAt\)/.test(blok), 'de voortgang van de scène wordt opgeteld, niet de wandklok');
ok(/if \(sceneT > limit/.test(blok), 'de scène wordt op zijn eigen voortgang beoordeeld');

// 2. een nieuwe scène begint op nul, anders erft hij de teller van de vorige
ok(/if \(c !== cineSeen\) \{[^}]*sceneT = 0/.test(blok), 'een nieuwe scène zet de teller op nul');

// 3. het vangnet blijft: een scène waarvan de klok stilstaat, wordt alsnog opgeruimd
ok(/cineT > limit \+ 120/.test(blok), 'er blijft een harde grens voor een echt vastgelopen scène (twee minuten extra)');
ok(/skipCinematic\(\)/.test(blok), 'de watchdog kan de scène nog steeds beeindigen');

// 4. de oude regel -- overslaan puur op de wandklok -- mag niet terugkomen
ok(!/if \(cineT > limit\) \{/.test(blok), 'de oude regel "wandklok boven de limiet = overslaan" is weg');

// 5. en de rest van de watchdog is niet meeveranderd
ok(/if \(isPauseMenuOpen\(\) \|\| isMapOpen\(\)\) return;/.test(blok), 'in het pauzemenu en op de kaart telt de tijd niet mee');
ok(/cinematicLimit\(c\)/.test(blok), 'de limiet komt nog steeds uit cinelimit.js');

// 6. één eigenaar voor een hangende opening (#635): cinematics.js heeft de time-out,
//    main.js heeft geen tweede tak meer (die riep skipCinematic zonder import en deed niets).
{
  const cin = fs.readFileSync(path.join(ROOT, 'game', 'js', 'cinematics.js'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'game', 'js', 'main.js'), 'utf8');
  ok(/cinematicHang\(/.test(cin), 'cinematics.js heeft de time-out voor een hangende opening');
  ok(/enige plek met een time-out voor een hangende opening \(#635\)/.test(cin), 'de bron noemt de enige eigenaar (#635)');
  ok(!/skipCinematic\(/.test(main), 'main.js heeft geen tweede time-out-tak meer (en dus geen ontbrekende import)');
}
console.log(`safety_cine: ${n - fails}/${n} checks`);
process.exit(fails ? 1 : 0);
