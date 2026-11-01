// Geen dubbel gecodeerde tekst in de repo (#240): UTF-8 dat als latin-1 of via de console-
// codepagina gelezen en daarna opnieuw als UTF-8 weggeschreven is, komt als een paar rare
// tekens in de HUD en op de kaart (een café heette in de data "Caf" gevolgd door een
// A-tilde en een half teken). Dat gebeurde met game/stad.json (68 namen) en met een paar
// docs, omdat de generator-scripts open() zonder encoding= gebruikten: op Windows leest
// Python dan cp1252. Die scripts hebben nu encoding="utf-8"; deze test houdt de uitvoer
// schoon. node scripts/tekst_encoding_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// De reeksen die alleen door dubbel coderen ontstaan: de lead-byte van een twee- of
// drie-byte UTF-8-teken (C2, C3, E2) met een vervolgbyte erachter, en de vorm die een
// DOS-console maakte van een letter met een accent.
const VERDACHT = /[\u00c2\u00c3\u00e2][\u0080-\u00bf]|\u251c[\u00ae\u00a9]/g;
const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|gdp|gz|zip|pdf|bin|woff2?|ttf|mp3|ogg|wav|glb|gltf|mp4|webm)$/i;

// Wat de reeks bedoelt, of null als het gewone tekst is.
function bedoeld(reeks) {
  if (reeks.charCodeAt(0) === 0x251c) return '\u00e9';
  const terug = Buffer.from(reeks, 'latin1').toString('utf8');
  return terug.includes('\ufffd') || terug === reeks ? null : terug;
}

let bad = 0, n = 0;
function check(p) {
  const bytes = fs.readFileSync(p);
  const tekst = bytes.toString('utf8');
  // Ongeldige UTF-8 is een ander probleem (source_bytes_test); hier alleen tekst.
  if (Buffer.from(tekst, 'utf8').compare(bytes) !== 0) return;
  n++;
  for (const [i, regel] of tekst.split(/\r?\n/).entries()) {
    for (const m of regel.matchAll(VERDACHT)) {
      const doel = bedoeld(m[0]);
      if (!doel) continue;
      bad++;
      console.log(`FAIL ${path.relative(ROOT, p)}:${i + 1} ${JSON.stringify(m[0])} is dubbel gecodeerd, bedoeld is ${JSON.stringify(doel)}`);
      break;
    }
  }
}

// Alleen wat in git staat: een build-map (web-dist, android) is een kopie van dezelfde
// bestanden en zou dezelfde fout dubbel melden.
const bestanden = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0').filter(Boolean);
for (const rel of bestanden) {
  if (SKIP_EXT.test(rel)) continue;
  check(path.join(ROOT, rel));
}
if (bad) { console.log(`${bad} regels met dubbel gecodeerde tekst`); process.exit(1); }
console.log(`tekst_encoding_test: ok (${n} tekstbestanden)`);
