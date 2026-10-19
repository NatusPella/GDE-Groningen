// Test voor scripts/publish_check.mjs: de patronen vangen wat ze moeten vangen, gewone tekst blijft schoon,
// private-only bestanden worden op naam herkend. Testwaarden worden samengesteld, zodat dit bestand zelf schoon blijft.
//   node scripts/publish_check_test.mjs
import { isManualOnly, scanText, scanFileNames, scanSizes, scanRequired, scanWorkflow, scanAuthors, emailsIn } from './publish_check.mjs';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };
const rules = (t, f = 'game/x.js') => scanText(f, t).map((x) => x.rule);
const BS = String.fromCharCode(92);
const j = (...p) => p.join('');

ok(rules('const k = "' + j('sk-or-v1-', 'a'.repeat(40)) + '";').includes('geheim'), 'openrouter-sleutel');
ok(rules('x ' + j('AI', 'za', 'B'.repeat(35))).includes('geheim'), 'google-sleutel');
ok(rules(j('ghp', '_', 'c'.repeat(36))).includes('geheim'), 'github-token');
ok(rules(j('-----BEGIN ', 'RSA PRIVATE KEY-----')).includes('geheim'), 'privésleutel');
ok(rules('api_key = "' + 'd'.repeat(24) + '"').includes('geheim'), 'api_key = waarde');
ok(!rules('const key = process.env.OPENROUTER_API_KEY;').includes('geheim'), 'omgevingsvariabele is geen geheim');
ok(!scanText('a.js', j('sk-or-v1-', 'a'.repeat(40)))[0].detail.includes('aaaa'), 'waarde wordt nooit gemeld');

ok(rules('mail jan@gmail.com graag').includes('e-mailadres'), 'e-mailadres');
ok(!rules('123+abc@users.noreply.github.com').includes('e-mailadres'), 'noreply is toegestaan');
ok(emailsIn('a@example.com b@x.nl').length === 1, 'example.com is toegestaan');
const osm = scanText('data/horeca_raw.json', '"email":"info@cafe.nl"');
ok(osm.length === 1 && osm[0].level === 'WARN', 'OSM-data geeft WARN, geen FAIL');

ok(rules('pad: C:'+BS+'Users'+BS+'jan'+BS+'GIT').includes('thuispad'), 'windows-thuispad');
ok(rules('pad: /Users/jan/Documents').includes('thuispad'), 'mac-thuispad');
ok(!rules('pad: C:'+BS+'Users'+BS+'Public'+BS+'x').includes('thuispad'), 'Public is toegestaan');
ok(!rules('(night/home/eikea goal)').includes('thuispad'), 'relatief pad is geen thuismap');
ok(!rules('pad: /home/runner/work').includes('thuispad'), 'runner is toegestaan');

ok(scanText('a.md', 'Hallo Pietje Puk', { names: ['pietje puk'] }).some((x) => x.rule === 'naam'), 'lokale namenlijst');
ok(scanText('a.md', 'Hallo Tammo en Tessa', { names: ['pietje puk'] }).length === 0, 'verzonnen namen blijven schoon');

const pf = (f) => scanFileNames([f]).length === 1;
ok(pf('.env') && pf('desktop/.env.local') && pf('keys/x.pem') && pf('.claude/settings.json') && pf('game/world/a.gdt'), 'private-only namen');
ok(pf('data/satellite_reference.jpg') && pf('trailer.mp4') && pf('id_rsa'), 'private-only: foto, video, ssh');
ok(!pf('.env.example') && !pf('game/js/main.js') && !pf('docs/ONTWIKKELEN.md'), 'gewone namen en .env.example mogen');

ok(scanSizes([{ file: 'a', size: 60 << 20 }])[0].level === 'FAIL', '60 MB is FAIL');
ok(scanSizes([{ file: 'a', size: 12 << 20 }])[0].level === 'WARN', '12 MB is WARN');
ok(scanSizes([{ file: 'a', size: 1 << 20 }]).length === 0, '1 MB is goed');

ok(scanRequired(['README.md'], '.env\n').length > 5, 'ontbrekende verplichte bestanden');
ok(scanRequired(['licenses/a.txt'], '.env\n.claude/\ngame/world/\r\n').every((x) => x.rule === 'ontbrekend'), 'gitignore-eisen vervuld');

ok(scanWorkflow('w.yml', 'uses: actions/deploy-pages@v4').length === 1, 'workflow met Pages-deploy');
ok(scanWorkflow('w.yml', 'permissions:\n  contents: read\n# deploy-pages').length === 0, 'alleen-lezen workflow en commentaar');

const manualWf = 'name: x\non:\n  workflow_dispatch:\n    inputs:\n      tag:\n        type: string\npermissions:\n  contents: write\n';
ok(isManualOnly(manualWf), 'workflow_dispatch alleen is handmatig');
ok(!isManualOnly('on:\n  push:\n  workflow_dispatch:\n'), 'push erbij is niet handmatig');
ok(!isManualOnly('on:\n  pull_request:\n'), 'pull_request is niet handmatig');
ok(scanWorkflow('w.yml', manualWf).length === 1 && scanWorkflow('w.yml', manualWf)[0].level === 'WARN', 'handmatige workflow met schrijfrechten is WARN');
ok(scanWorkflow('w.yml', 'on:\n  push:\npermissions:\n  contents: write\n')[0].level === 'FAIL', 'automatische workflow met schrijfrechten is FAIL');

ok(scanAuthors(['NatusPella\t1+n@users.noreply.github.com']).length === 0, 'noreply-auteur');
ok(scanAuthors(['G'+String.fromCharCode(9)+'noreply@github.com']).length === 0, 'GitHub-committer');
ok(scanAuthors(['X\tx@gmail.com']).length === 1, 'echt auteursadres');

console.log(failed ? failed + ' mislukt' : 'publish_check_test: ok');
process.exit(failed ? 1 : 0);
