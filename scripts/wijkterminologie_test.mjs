// Wijkterminologie (#716): twee geografische lagen, elk met één term. De 66 punten van
// HUD/kaart heten "buurt"; de CBS-laag van Veroverd heet "wijk"/"gebied" en gebruikt de
// CBS-naam. Deze test bewaakt de speltekst en de documentatie.
//   node scripts/wijkterminologie_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const ach = lees('game/js/achievements.js');
ok(/Ontdek alle 66 buurten/.test(ach), 'de prestatie voor de 66 punten zegt "buurten"');
ok(!/66 wijken/.test(ach) && !/Ontdek \d+ wijken/.test(ach), 'geen "wijken" meer voor de 66 punten');
ok(/Deelgebied-held/.test(ach), 'de CBS-buurtprestatie heet "deelgebied" (geen botsing met de 66 buurten)');

const ui = lees('game/js/achievementsui.js');
ok(/'Buurten', `\$\{st\.wijken\}\/66`/.test(ui), 'het overzicht toont "Buurten" met de 66 punten');

const cine = lees('game/js/cinematics.js');
ok(/wc-kick">Nieuwe buurt</.test(cine), 'het kaartje bij een nieuw punt zegt "Nieuwe buurt"');

const gebieden = lees('docs/GEBIEDEN.md');
ok(/Terminologie \(#716\)/.test(gebieden) && /66 buurtpunten/.test(gebieden), 'docs/GEBIEDEN.md legt de twee lagen uit');
const verhaal = lees('.specs-fire/standards/verhaal.md');
ok(/Terminologie \(#716\)/.test(verhaal), 'de verhaal-spec noemt de terminologie');
const uit = lees('.specs-fire/standards/ui-taal.md');
ok(/Wijk of buurt \(#716\)/.test(uit), 'de UI-taal-spec heeft de regel');
ok(/nooit "wijk" voor de 66/.test(uit), 'de regel is expliciet');

// de verover-UI gebruikt de CBS-naam: de gebiedenindeling heeft de CBS-lagen
const geb = lees('game/js/gebieden.js');
for (const laag of ['buurt', 'wijk', 'woonplaats', 'gemeente', 'provincie']) ok(new RegExp(`'${laag}'`).test(geb), `de CBS-laag "${laag}" bestaat in de veroverindeling`);

console.log(process.exitCode ? 'wijkterminologie_test: FAIL' : `wijkterminologie_test: ${n} controles ok`);
