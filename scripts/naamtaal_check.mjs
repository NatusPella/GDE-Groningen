// #640/ADR 0027: houd nieuwe Nederlandse identifiers en nieuwe coop-namen
// buiten de code, zonder bestaande bestanden te blokkeren. De baseline is de
// bestandslijst bij het besluit; alleen nieuwe bestanden worden gecontroleerd.
//   node scripts/naamtaal_check.mjs
//   node scripts/naamtaal_check.mjs --update   (alleen na een bewust besluit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game', 'js');
const BASELINE = path.join(ROOT, 'scripts', 'naamtaal_baseline.json');

// Woorden die in een nieuwe bestandsnaam of identifier Nederlands verraden.
const NL = new Set([
  'aan', 'achter', 'activiteit', 'afstand', 'auto', 'baan', 'bedrag', 'beeld', 'begin', 'bericht',
  'bestand', 'beurt', 'bezoek', 'bijbaan', 'blok', 'boek', 'boerderij', 'boot', 'bord', 'brug',
  'buurt', 'centrum', 'dag', 'deel', 'deur', 'dier', 'dorp', 'doel', 'fiets', 'foto', 'gang',
  'gebeurtenis', 'gebied', 'gedaan', 'geheim', 'geld', 'geluid', 'gewas', 'gezicht', 'groep',
  'haak', 'haven', 'heel', 'hengeltuig', 'huis', 'hulp', 'kaart', 'kamer', 'kans', 'kerk',
  'kleur', 'klok', 'koning', 'kracht', 'laag', 'land', 'leven', 'lijn', 'lijst', 'luchtverkeer',
  'maak', 'man', 'markt', 'mens', 'menu', 'missie', 'moment', 'motor', 'naam', 'nacht', 'nieuw',
  'niveau', 'nummer', 'object', 'omgeving', 'onder', 'opdracht', 'over', 'pad', 'partij', 'plaats',
  'plek', 'plicht', 'punt', 'raad', 'recht', 'regel', 'regio', 'ringbaan', 'route', 'samenhub',
  'schip', 'scherm', 'school', 'seizoen', 'sessiekeuze', 'set', 'sfeer', 'slot', 'snel', 'soort',
  'speler', 'spel', 'stad', 'stand', 'stap', 'start', 'station', 'stuk', 'taak', 'tijd', 'toestand',
  'trein', 'treincontrole', 'tuin', 'uur', 'vaart', 'vak', 'veld', 'verhaal', 'verkeer', 'vervoer',
  'vlag', 'vlak', 'voertuig', 'volg', 'vorm', 'vraag', 'vriend', 'waarde', 'wagen', 'water', 'weer',
  'wereld', 'werk', 'wijk', 'wind', 'winkel', 'woning', 'woord', 'zaak', 'zon', 'zoek', 'zicht',
  'zone', 'zomer', 'zoon', 'zorg',
]);
const COOP = /^coop|coop[A-Z_]|^coop-/;

function woorden(naam) {
  return String(naam || '')
    .replace(/\.js$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function nederlandseNaam(naam) {
  return woorden(naam).some((w) => NL.has(w) || [...NL].some((nw) => nw.length >= 4 && w.includes(nw)));
}
export function coopNaam(naam) { return COOP.test(String(naam || '')); }

function alleBestanden(dir, uit = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) alleBestanden(p, uit);
    else if (e.name.endsWith('.js')) uit.push(path.relative(ROOT, p).replaceAll(path.sep, '/'));
  }
  return uit;
}

function main() {
  const bestanden = alleBestanden(JS).sort();
  if (process.argv.includes('--update')) {
    fs.writeFileSync(BASELINE, JSON.stringify({ v: 1, op: '2026-11-07', bestanden }, null, 2) + '\n');
    console.log(`naamtaal: baseline bijgewerkt (${bestanden.length} bestaande bestanden)`);
    return 0;
  }
  let basis;
  try { basis = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { console.error('naamtaal: baseline ontbreekt; draai met --update na een besluit'); return 2; }
  const bekend = new Set(basis.bestanden || []);
  const nieuw = bestanden.filter((f) => !bekend.has(f));
  const fouten = [];
  for (const f of nieuw) {
    if (coopNaam(path.basename(f))) fouten.push(`${f}: nieuwe coop-naam (gebruik multiplayer)`);
    if (nederlandseNaam(f)) fouten.push(`${f}: Nederlandse bestandsnaam`);
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
      if (nederlandseNaam(m[1])) fouten.push(`${f}: Nederlandse identifier ${m[1]}`);
    }
  }
  if (fouten.length) { console.log('FAIL naamtaal:\n  ' + fouten.join('\n  ')); return 1; }
  console.log(`naamtaal_check: ${nieuw.length} nieuwe bestanden gecontroleerd, 0 fouten (${bestanden.length} totaal)`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
