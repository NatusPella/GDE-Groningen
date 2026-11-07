// #450 als code-compleet: het beheerdersrunbook bestaat, de bewuste eigenaarsbeslissingen
// staan erin, en de code die het dragen is bestaat. De gedragstests zelf zijn
// nodehost_test (echte TCP) en serverstaat_test; deze test bewaakt het document en de
// koppeling met de code/docs.
//   node scripts/server_hosting_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const doc = lees('docs/SERVER-HOSTING.md');
ok(/Dedicated server/.test(doc), 'docs/SERVER-HOSTING.md is de beheerderspagina');
ok(/node scripts\/coop\/nodehost\.mjs/.test(doc), 'het startcommando staat erin');
for (const opt of ['--port', '--max', '--naam', '--wachtwoord', '--staat', '--openbaar']) ok(doc.includes(opt), `de optie ${opt} staat erin`);
for (const cmd of ['status', 'spelers', 'kick', 'verbied', 'wachtwoord', 'max', 'openbaar', 'stop']) ok(doc.includes(cmd), `het beheercommando ${cmd} staat erin`);
ok(/directe koppelcode|direct adres/.test(doc) && /WebRTC/.test(doc), 'de vindbaarheidsbeslissing (directe code, geen WebRTC-in-Node) staat erin');
ok(/Electron-variant: bewust niet gebouwd/.test(doc), 'de Electron-beslissing staat erin');
ok(/Soak: bewust niet in deze slice/.test(doc), 'de soak-beslissing staat erin');
ok(/serverstaat/.test(doc) && /serverstaat_test/.test(doc), 'de wereldstaat en zijn test staan erin');
ok(/wachtwoord gaat over de TCP-route leesbaar/.test(doc), 'het wachtwoord-risico staat er eerlijk in');

const host = lees('scripts/coop/nodehost.mjs');
for (const s of ['--port', '--wachtwoord', '--staat', '--openbaar', 'startKoplozeHost']) ok(host.includes(s), `nodehost.mjs kent ${s}`);
ok(/serverstaat\.js/.test(host), 'nodehost gebruikt de wereldstaat-serializer');
const serverstaat = fs.existsSync(path.join(ROOT, 'game/js/net/serverstaat.js'));
ok(serverstaat, 'game/js/net/serverstaat.js bestaat');
const coop = lees('docs/COOP-GAST.md');
ok(/SERVER-HOSTING\.md/.test(coop), 'COOP-GAST verwijst naar de beheerderspagina');
ok(/Besloten \(#450/.test(coop), 'COOP-GAST noemt de beslissing in plaats van "nog open"');
const readme = lees('docs/README.md');
ok(/SERVER-HOSTING\.md/.test(readme), 'de documentatie-ingang noemt de beheerderspagina');

console.log(process.exitCode ? 'server_hosting_test: FAIL' : `server_hosting_test: ${n} controles ok`);
