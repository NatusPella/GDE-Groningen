// Documentatietaal (#692): de eigenaar koos optie 1 — Nederlands proza, behalve pure
// technische naslag, met een Nederlandse leeswijzer bovenaan elk uitgezonderd document en
// de uitzondering in ADR 0017. Deze test bewaakt dat.
//   node scripts/docs_taal_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const adr = lees('.specs-fire/standards/adr/0017-code-in-het-engels.md');
ok(/Uitzonderingen \(#692/.test(adr), 'ADR 0017 heeft de uitzonderingentabel');
for (const doc of ['ARCHITECTURE.md', 'DESIGN_SYSTEM.md', 'docs/DESIGN-BEDIENING.md', 'docs/DESIGN-COMPONENTEN.md', 'docs/DESIGN-SCHULD.md', 'docs/DESIGN-SAMEN-SPELEN.md', 'steam/README.md']) {
  ok(adr.includes(path.basename(doc)), `ADR 0017 noemt ${doc}`);
}

const uitgezonderd = ['ARCHITECTURE.md', 'DESIGN_SYSTEM.md', 'docs/DESIGN-BEDIENING.md', 'docs/DESIGN-COMPONENTEN.md', 'docs/DESIGN-SCHULD.md', 'docs/DESIGN-SAMEN-SPELEN.md', 'docs/ONTWIKKELEN.md', 'steam/README.md'];
for (const doc of uitgezonderd) {
  const t = lees(doc);
  ok(/Leeswijzer \(Nederlands\)/.test(t), `${doc} heeft een Nederlandse leeswijzer`);
  ok(/specs-fire\/standards\//.test(t), `${doc} wijst naar de canonieke spec`);
}

const readme = lees('README.md');
ok(/In English, briefly/.test(readme), 'README heeft het Engelse blok');
ok(adr.includes('In English, briefly'), 'ADR 0017 noemt het Engelse README-blok als uitzondering');

const taal = lees('docs/TAAL-VAN-DOCUMENTATIE.md');
ok(/Status: besloten/.test(taal) && /optie 1/.test(taal), 'het besluitdocument zegt dat optie 1 is besloten');

console.log(process.exitCode ? 'docs_taal_test: FAIL' : `docs_taal_test: ${n} controles ok`);
