// De dekkinglijst in docs/DESIGN-AUDIT-UI-21-11.md ("Dekkinglijst per bestand", #1064) hoort bij de bron: ze wordt
// gemaakt uit dezelfde telling als de ratel (scripts/lib/ds3_telling.mjs) en dit script faalt als ze achterloopt.
//   node scripts/ds3_dekkinglijst_test.mjs           controleren
//   node scripts/ds3_dekkinglijst_test.mjs --write   de lijst in het document gelijkzetten aan de bron
import fs from 'node:fs';
import path from 'node:path';
import { telAlles, totalen, SOORTEN, ROOT } from './lib/ds3_telling.mjs';

const DOC = path.join(ROOT, 'docs', 'DESIGN-AUDIT-UI-21-11.md');
const BEGIN = '<!-- ds3-dekkinglijst:begin -->', EIND = '<!-- ds3-dekkinglijst:eind -->';

export function maakLijst(res = telAlles()) {
  const rijen = Object.entries(res).filter(([, v]) => !v.bewust && SOORTEN.some((s) => v.n[s]))
    .map(([f, v]) => ({ f, v: v.n, som: SOORTEN.reduce((a, s) => a + v.n[s], 0) }))
    .sort((a, b) => b.som - a.som || a.f.localeCompare(b.f));
  const t = totalen(res);
  const regels = [BEGIN, '',
    `Totaal nog te doen: ${SOORTEN.map((s) => `${s} ${t[s]}`).join(', ')} in ${rijen.length} bestanden (bewust buiten de telling: ${Object.values(res).filter((v) => v.bewust).length}).`, '',
    `| bestand | ${SOORTEN.join(' | ')} |`, `|---|${SOORTEN.map(() => '---').join('|')}|`,
    ...rijen.map((r) => `| \`${r.f}\` | ${SOORTEN.map((s) => r.v[s] || '').join(' | ')} |`), '', EIND];
  return regels.join('\n');
}

const doc = fs.readFileSync(DOC, 'utf8');
const lf = doc.replace(/\r\n/g, '\n');
const b = lf.indexOf(BEGIN), e = lf.indexOf(EIND);
const lijst = maakLijst();
if (process.argv.includes('--write')) {
  if (b < 0 || e < 0) { console.error('markeringen ontbreken in ' + DOC); process.exit(1); }
  const nieuw = lf.slice(0, b) + lijst + lf.slice(e + EIND.length);
  fs.writeFileSync(DOC, doc.includes('\r\n') ? nieuw.replace(/\n/g, '\r\n') : nieuw);
  console.log('dekkinglijst geschreven'); process.exit(0);
}
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
ok(b >= 0 && e > b, 'het document heeft de markeringen voor de dekkinglijst');
ok(b >= 0 && lf.slice(b, e + EIND.length) === lijst, 'de dekkinglijst in het document is gelijk aan de bron (node scripts/ds3_dekkinglijst_test.mjs --write)');
console.log(`ds3_dekkinglijst_test: ${fails ? 'FOUT' : '2/2 controles ok'}`);
process.exit(fails ? 1 : 0);
