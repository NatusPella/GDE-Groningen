// Test voor scripts/coop_coverage_audit.mjs: de audit keurt een nieuwe module zonder systeem, een systeem zonder
// Samen-regel of test, een gat zonder eigenaar en een opslagsleutel zonder indeling; en de echte repo is groen.
//   node scripts/coop_coverage_audit_test.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditSources, registryKeys, globToRe, maakMatrix, schrijfMatrix } from './coop_coverage_audit.mjs';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };

const basis = () => ({
  statussen: ['OK', 'gat', 'nvt'], prioriteiten: ['hoog', 'middel', 'laag', '-'], eigenaren: ['wereld', 'speler', 'gesynct', 'lokaal', 'wedstrijd'],
  wereldSleutels: ['save'], inSavegameToegestaan: [], docNvt: {}, nietCoopRelevant: [{ glob: '*3d', reden: 'beeld' }],
  sleutelLiteralenBuitenRegister: [],
  opslag: { save: { scope: 'wereld', reden: 'de savegame' }, boerderij: { scope: 'speler', reden: 'eigen boerderij' } },
  features: [{
    id: 'a', naam: 'A', groep: 'G', modules: ['alpha*'], eigenaar: 'speler', gast: 'g', beloning: 'b', wegval: 'w',
    test: ['scripts/coop_coverage_audit.mjs'], regel: { doc: 'docs/COOP-DEKKING-21-11.md', zoek: 'Hoe je dit leest' }, status: 'OK', prio: '-',
  }],
});
const draai = (manifest, extra = {}) => auditSources({
  manifest, baseline: { modules: ['oud'] }, modules: ['oud', 'alpha1'], storageSrc: "export const BASE_KEYS = {\n  save: 'gde-save-v1',\n  boerderij: 'gde-boerderij-v1',\n};",
  saveSrc: 'KEYS.save', literals: [], skipDocs: true, ...extra,
});
const heeft = (r, deel) => r.fouten.some((f) => f.includes(deel));

ok(draai(basis()).fouten.length === 0, 'basis is groen: ' + JSON.stringify(draai(basis()).fouten));

// 1. nieuwe modules
ok(heeft(draai(basis(), { modules: ['oud', 'nieuw'] }), 'nieuwe module game/js/nieuw.js'), 'een nieuwe module zonder systeem faalt');
ok(!heeft(draai(basis(), { modules: ['oud', 'alpha2'] }), 'nieuwe module'), 'een module met een systeem is goed');
ok(!heeft(draai(basis(), { modules: ['oud', 'kaart3d'] }), 'nieuwe module'), 'een module onder nietCoopRelevant is goed');
ok(!heeft(draai(basis(), { modules: ['oud', 'vehicle/alpha9'] }), 'nieuwe module'), 'een submap-module matcht op de bestandsnaam');

// 2 en 3. regel en test
let m = basis(); m.features[0].regel.zoek = 'bestaat niet in het doc';
ok(heeft(draai(m), 'bevat de Samen-regel niet'), 'een ontbrekende zoektekst faalt');
m = basis(); m.features[0].regel.doc = 'docs/BESTAAT-NIET.md';
ok(heeft(draai(m), 'bestaat niet'), 'een ontbrekend doc faalt');
m = basis(); m.features[0].wachtOp = 'epic-x'; m.features[0].regel.zoek = 'nog niet gemerged';
ok(!heeft(draai(m), 'Samen-regel'), 'wachtOp mag de regel nog missen');
ok(draai(m).info.length === 1, 'wachtOp meldt info');
m = basis(); m.features[0].test = [];
ok(heeft(draai(m), 'geen test genoemd'), 'zonder test faalt het');
m = basis(); m.features[0].test = ['scripts/bestaat_niet_test.mjs'];
ok(heeft(draai(m), 'bestaat niet'), 'een niet-bestaande test faalt');
m = basis(); m.features[0].status = 'nvt'; m.features[0].test = [];
ok(!heeft(draai(m), 'geen test'), 'nvt hoeft geen test');

// 4. een gat heeft een eigenaar
m = basis(); Object.assign(m.features[0], { status: 'gat', prio: 'middel', gat: 'iets' });
ok(heeft(draai(m), 'een gat heeft een issue'), 'een gat zonder issue of lead faalt');
m.features[0].issue = '#12';
ok(!heeft(draai(m), 'een gat heeft een issue'), 'een gat met een issue is goed');
delete m.features[0].issue; m.features[0].lead = 'Bezit';
ok(!heeft(draai(m), 'een gat heeft een issue'), 'een gat met een lead is goed');
m.features[0].prio = '-';
ok(heeft(draai(m), 'prioriteit'), 'een gat zonder prioriteit faalt');

// 5. opslagsleutels
ok(heeft(draai(basis(), { storageSrc: "export const BASE_KEYS = {\n  save: 'gde-save-v1',\n  nieuw: 'gde-nieuw-v1',\n};" }), 'opslagsleutel nieuw'), 'een sleutel zonder indeling faalt');
m = basis(); m.opslag.boerderij.scope = 'wereld';
ok(heeft(draai(m), 'wereldstaat mag alleen'), 'wereldstaat voor een gewone sleutel faalt');
ok(heeft(draai(basis(), { saveSrc: 'x = KEYS.boerderij;' }), 'in de wereldsave'), 'een speler-sleutel in de savegame faalt');
ok(heeft(draai(basis(), { literals: [{ sleutel: 'gde-zomaar', bestand: 'x.js' }] }), 'nieuwe opslagsleutel gde-zomaar'), 'een literal buiten het register faalt');
m = basis(); m.sleutelLiteralenBuitenRegister = ['gde-zomaar'];
ok(!heeft(draai(m, { literals: [{ sleutel: 'gde-zomaar', bestand: 'x.js' }] }), 'gde-zomaar'), 'een toegestane literal is goed');

// hulpfuncties
ok(JSON.stringify(registryKeys("export const BASE_KEYS = {\n  a: 'gde-a',\n  // c\n  b: 'gde-b', // x\n};")) === '["a","b"]', 'registryKeys leest de sleutels');
ok(globToRe('voetbal*').test('voetbalsamen') && !globToRe('voetbal*').test('xvoetbal'), 'globToRe');
const mx = maakMatrix(basis(), { a: { n: 0, bestanden: [] } }, 3);
ok(/1 systemen: 1 OK, 0 gat/.test(mx) && /\| A \|/.test(mx), 'de matrix noemt het systeem');
ok(schrijfMatrix('x\n<!-- MATRIX:BEGIN (gegenereerd door scripts/coop_coverage_audit.mjs --write; niet met de hand aanpassen) -->\nold\n<!-- MATRIX:END -->\ny', 'NIEUW').includes('NIEUW'), 'schrijfMatrix vervangt het blok');

// de echte repo is groen
const echt = spawnSync(process.execPath, [fileURLToPath(new URL('./coop_coverage_audit.mjs', import.meta.url))], { encoding: 'utf8' });
ok(echt.status === 0, 'de echte repo is groen: ' + echt.stdout.split('\n').filter((l) => l.startsWith('FOUT')).slice(0, 3).join(' | '));

console.log(failed ? `${failed} test(s) mislukt` : 'coop_coverage_audit_test: alles goed');
process.exit(failed ? 1 : 0);
