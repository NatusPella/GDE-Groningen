// Akte 1 op eindniveau (23-11): de cutscenes van akte 1 (de opening C00, M01 tot M06 en de tussenstappen N1-N4, W1) hebben in de
// cutscene-lint geen enkele vondst meer die niet met een reden is uitgezonderd, ook geen nit (de assprongen van de 180-gradenregel).
// Zo blijft akte 1 de lat: een nieuwe scène of shot die een regel breekt, maakt deze test rood.
//   node scripts/akte1_regie_test.mjs
import fs from 'node:fs';
import { loadUnits } from './lib/cutscene_data.mjs';
import { lintUnit, pasUitzonderingenToe } from './lib/cutscene_lint.mjs';

const AKTE1 = /^(C00|M0[1-6]|N[1-4]|W1)([.#]|$)/;
const { units, kaleUnits, names, speakers, looks } = await loadUnits();
const uitz = JSON.parse(fs.readFileSync(new URL('./release/cutscene-uitzonderingen.json', import.meta.url), 'utf8')).uitzonderingen;
const per = {};
for (const u of [...units, ...kaleUnits]) if (AKTE1.test(u.id)) per[u.id] = lintUnit(u, { names, speakers, looks });
pasUitzonderingenToe(per, uitz);
let bad = 0, n = 0;
for (const [id, vondsten] of Object.entries(per)) {
  n++;
  const open = vondsten.filter((v) => !v.uitzondering && v.ernst !== 'smaak');
  for (const v of open) { bad++; console.log('FAIL', id, v.regel, v.ernst, v.bericht.slice(0, 140)); }
}
console.log(bad ? `akte1_regie_test: ${bad} open vondsten in ${n} cutscenes` : `akte1_regie_test: ${n} cutscenes van akte 1 zonder open vondst`);
process.exit(bad || n < 10 ? 1 : 0);
