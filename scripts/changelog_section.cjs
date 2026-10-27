// De sectie van één versie uit CHANGELOG.md, voor desktop/release.sh: het script zet die tekst in de
// release-notities. Zonder sectie komt er niets uit (lege regel), en weigert release.sh de release.
//   node scripts/changelog_section.cjs 0.54.0 [pad/naar/CHANGELOG.md]
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const version = String(process.argv[2] || '').replace(/^v/, '');
const file = process.argv[3] || path.join(__dirname, '..', 'CHANGELOG.md');
if (!version) { console.error('gebruik: node scripts/changelog_section.cjs <versie> [changelog]'); process.exit(2); }
if (!fs.existsSync(file)) { console.error('geen CHANGELOG op ' + file); process.exit(1); }

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const kop = new RegExp('^##\\s*\\[' + version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]');
let start = -1;
for (let i = 0; i < lines.length; i++) if (kop.test(lines[i])) { start = i; break; }
if (start < 0) process.exit(0);

const uit = [];
for (let i = start + 1; i < lines.length; i++) {
  if (/^##\s/.test(lines[i])) break;
  uit.push(lines[i]);
}
// lege regels aan de randen eraf, zodat de release-notities strak beginnen
while (uit.length && !uit[0].trim()) uit.shift();
while (uit.length && !uit[uit.length - 1].trim()) uit.pop();
process.stdout.write(uit.join('\n') + (uit.length ? '\n' : ''));
