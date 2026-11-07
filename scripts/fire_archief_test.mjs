// FIRE-administratie (#703 rest): state.yaml en de runs/intents zijn historisch verklaard,
// de verkeerd gekoppelde work-items zijn rechtgetrokken en ADR 0013 heeft een normale status.
//   node scripts/fire_archief_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const state = lees('.specs-fire/state.yaml');
ok(/^# HISTORISCH/.test(state), 'state.yaml begint met de historische verklaring');
ok(/GitHub-issues|bord/.test(state.split('\n').slice(0, 4).join(' ')), 'de verklaring noemt het bord als actuele bron');
ok(/Openbare sessielijst/.test(state), 'wi-438 heeft de juiste titel (openbare sessielijst)');

const runs = lees('.specs-fire/runs/README.md');
ok(/historisch/i.test(runs) && /Files created: 0/.test(runs), 'runs/README.md verklaart de lege tellers');
const intents = lees('.specs-fire/intents/README.md');
ok(/historisch/i.test(intents) && /bord/.test(intents), 'intents/README.md verklaart de administratie historisch');

const wi438 = lees('.specs-fire/intents/afmaken-open-issues/work-items/wi-438-rest.md');
ok(/Openbare sessielijst/.test(wi438), 'wi-438 noemt #438 als openbare sessielijst');
const wi492 = lees('.specs-fire/intents/gde-light-sims/work-items/wi-492-samen.md');
ok(!/multiplayer\.md:44-48/.test(wi492), 'wi-492-samen verwijst niet meer naar een vaste regel in multiplayer.md');
const brief = lees('.specs-fire/intents/gde-light-sims/brief.md');
ok(/ADR.*0016.*gaat alleen over de ingang/.test(brief) || /gaat alleen over de ingang/.test(brief), 'de light-sims-brief verwijst voor de scope niet meer naar ADR 0016');

const adr13 = lees('.specs-fire/standards/adr/0013-een-testrunner-met-fasen.md');
ok(/^- \*\*Status:\*\* besloten\s*$/m.test(adr13) && /^- \*\*Datum:\*\* 2026-10-25/m.test(adr13), 'ADR 0013 heeft status en datum als aparte regels');

console.log(process.exitCode ? 'fire_archief_test: FAIL' : `fire_archief_test: ${n} controles ok`);
