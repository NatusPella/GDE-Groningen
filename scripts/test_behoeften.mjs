// Welke tests kunnen in een worktree zonder wereld draaien en welke niet (testinfrastructuur 21-11)?
// scripts/test_behoeften.json noemt de tests die game/world nodig hebben (needs-world); de runners
// (scripts/run_tests.mjs en scripts/test_all.mjs) slaan die zonder wereld netjes over met een SKIP-reden in plaats van
// ze te starten (de wereld laden of een ENOENT afwachten kost seconden tot minuten). Alle andere tests draaien overal.
// De lijst wordt GEMETEN, niet gegokt: een test staat er alleen in als hij in een run zonder wereld zelf SKIP
// meldde of op ontbrekende wereld-/cachedata stukliep. Een test die zonder wereld een deel echt controleert, blijft draaien.
//   node scripts/run_tests.mjs --json=<bestand>          (in een worktree zonder game/world, met three.js beschikbaar)
//   node scripts/test_behoeften.mjs --uit=<bestand>        toon wat de run zegt
//   node scripts/test_behoeften.mjs --uit=<bestand> --write   werk scripts/test_behoeften.json bij
//   node scripts/test_behoeften.mjs --doc                   Markdown-tabel van de huidige lijst (voor docs/TESTEN.md)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEHOEFTEN_FILE, laadBehoeften } from './lib/testloop.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

// De reden uit de uitvoer van een overgeslagen test: de SKIP-regel zelf, anders de regel over de ontbrekende map.
export function skipRedenUitUitvoer(out) {
  const regels = String(out || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const skip = regels.find((l) => /^SKIP\b/.test(l));
  if (skip) return skip.replace(/^SKIP[:\s-]*/i, '').slice(0, 140);
  const data = regels.find((l) => /game[\\/]+world|data[\\/]+cache/i.test(l));
  return (data || 'game/world of data/cache ontbreekt').slice(0, 140);
}

// Een SKIP telt alleen als needs-world als de reden over de wereld of de provinciedata gaat; een SKIP om een andere reden
// (bijvoorbeeld de vendor-cache van desktop_preload_test) hoort niet in dit bestand.
const WERELD_REDEN = /game[\\/]+world|data[\\/]+cache|provinc|wereld|world|tegels|tiles/i;

// run = de JSON van run_tests --json. -> { tests: { naam: { wereld: true, reden } }, fouten: [], onbekend: [overgeslagen om een andere reden] }
// Alleen een run zonder wereld en met three.js zegt iets: met wereld is er niets overgeslagen, zonder three
// zou een needs-three-SKIP ten onrechte als needs-world tellen.
export function behoeftenUitRun(run) {
  const fouten = [];
  if (run.wereld) fouten.push('de run had game/world: draai hem in een worktree zonder wereld');
  if (!run.three) fouten.push('de run had geen three.js: zet GDE_VENDOR_CACHE of draai npm run stage');
  const tests = {}, onbekend = [];
  for (const r of run.resultaten || []) {
    const naam = String(r.name).replace(/ \(alleen\)$/, '');
    if (r.status !== 'SKIP' || !/_test\.mjs$/.test(naam)) continue;
    // een SKIP omdat de test al op de lijst stond (needs-world uit de vorige meting) houdt zijn eerdere reden
    const bron = r.out && r.out.trim() ? r.out : r.detail;
    if (!WERELD_REDEN.test(String(bron || ''))) { onbekend.push(naam); continue; }
    // zonder de testnaam vooraan en zonder het absolute pad van deze worktree
    const reden = skipRedenUitUitvoer(bron).replace(/^[\w.-]+_test(\.mjs)?[:\s]+/, '').replace(/[A-Za-z]:[\\/][^\s'"]*?[\\/](game[\\/]|data[\\/])/g, '$1').replace(/\\/g, '/');
    // data: de test zoekt data/cache/province; met die map aanwezig draait hij ook zonder game/world
    tests[naam] = { wereld: true, ...(/data[\/]+cache/i.test(reden) ? { data: true } : {}), reden };
  }
  return { tests, fouten, onbekend };
}

export function renderDoc(tests) {
  const namen = Object.keys(tests).sort();
  const o = ['| Test | Reden zonder wereld |', '|---|---|'];
  for (const n of namen) o.push(`| \`${n}\` | ${String(tests[n].reden || '').replace(/\|/g, '\\|')} |`);
  return o.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n) => (args.find((a) => a.startsWith('--' + n + '=')) || '').split('=').slice(1).join('=');
  if (args.includes('--doc')) { console.log(renderDoc(laadBehoeften(ROOT))); return 0; }
  const uit = opt('uit');
  if (!uit) { console.log('gebruik: node scripts/test_behoeften.mjs --uit=<run_tests --json> [--write] | --doc'); return 2; }
  const { tests, fouten, onbekend } = behoeftenUitRun(JSON.parse(fs.readFileSync(uit, 'utf8')));
  if (fouten.length) { console.log('NIET BRUIKBAAR: ' + fouten.join('; ')); return 1; }
  if (onbekend.length) console.log('overgeslagen om een andere reden dan de wereld (niet in het bestand): ' + onbekend.join(', '));
  const huidig = laadBehoeften(ROOT);
  const nieuw = Object.keys(tests).filter((n) => !huidig[n]), weg = Object.keys(huidig).filter((n) => !tests[n]);
  console.log(`${Object.keys(tests).length} tests hebben de wereld nodig (nu in het bestand: ${Object.keys(huidig).length}; erbij: ${nieuw.length}, eraf: ${weg.length})`);
  if (nieuw.length) console.log('erbij: ' + nieuw.join(', '));
  if (weg.length) console.log('eraf: ' + weg.join(', '));
  if (args.includes('--write')) {
    const gesorteerd = Object.fromEntries(Object.keys(tests).sort().map((n) => [n, tests[n]]));
    const doc = {
      _uitleg: 'Tests die zonder game/world zelf SKIP meldden of op de wereld stukliepen; gemeten met scripts/test_behoeften.mjs (zie docs/TESTEN.md). De runners slaan ze zonder wereld over met een needs-world-reden.',
      versie: 1,
      tests: gesorteerd,
    };
    fs.writeFileSync(path.join(ROOT, 'scripts', BEHOEFTEN_FILE), JSON.stringify(doc, null, 1) + '\n');
    console.log('geschreven: scripts/' + BEHOEFTEN_FILE);
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exit(main());
