import { telAlles, SOORTEN } from './lib/ds3_telling.mjs';
const soort = process.argv[2];
const bestand = process.argv[3];
const r = telAlles();
for (const [f, v] of Object.entries(r)) {
  if (v.bewust || (bestand && !f.includes(bestand))) continue;
  for (const x of v.regels) if (!soort || x[soort]) console.log(f + ':' + x.r + '  [' + SOORTEN.filter((s) => x[s]).join(',') + ']  ' + x.t.slice(0, 230));
}
