// #640/ADR 0027: houd nieuwe Nederlandse identifiers en nieuwe coop-namen
// buiten de code, zonder bestaande bestanden te blokkeren. De baseline is de
// bestandslijst bij het besluit; alleen nieuwe bestanden worden gecontroleerd.
// Sinds de review van 22-11 telt "coop" overal in een bestandsnaam (ook als achtervoegsel, bezitcoop.js) en kijkt de poort ook naar scripts/.
// De bestaande overtreders staan vast in baseline.uitzonderingen (geen massale hernoeming, ADR 0027): die lijst mag alleen kleiner worden;
// een nieuw bestand dat de regels breekt faalt.
//   node scripts/naamtaal_check.mjs
//   node scripts/naamtaal_check.mjs --leg-vast  (zet de huidige overtreders in de uitzonderingen; alleen na een bewust besluit)
//   node scripts/naamtaal_check.mjs --update    (alle huidige bestanden worden baseline; alleen na een bewust besluit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game', 'js');
const SCRIPTS = path.join(ROOT, 'scripts');
const BASELINE = path.join(ROOT, 'scripts', 'naamtaal_baseline.json');

// Woorden die in een nieuwe bestandsnaam of identifier Nederlands verraden. 'set' en 'slot' staan er niet in: het zijn ook gewone
// Engelse woorden (clothing.js: slot, set), dus geen bewijs van Nederlands.
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
  'schip', 'scherm', 'school', 'seizoen', 'sessiekeuze', 'sfeer', 'snel', 'soort',
  'speler', 'spel', 'stad', 'stand', 'stap', 'start', 'station', 'stuk', 'taak', 'tijd', 'toestand',
  'trein', 'treincontrole', 'tuin', 'uur', 'vaart', 'vak', 'veld', 'verhaal', 'verkeer', 'vervoer',
  'vlag', 'vlak', 'voertuig', 'volg', 'vorm', 'vraag', 'vriend', 'waarde', 'wagen', 'water', 'weer',
  'wereld', 'werk', 'wijk', 'wind', 'winkel', 'woning', 'woord', 'zaak', 'zon', 'zoek', 'zicht',
  'zone', 'zomer', 'zoon', 'zorg',
  // erbij na de review van 22-11: de stammen van de modules sinds v0.64.0 en Nederlandse werkwoorden in identifiers
  'bezit', 'voetbal', 'spullen', 'uitleg', 'bron', 'melding', 'keuze', 'pijl', 'kapper', 'baas', 'samen', 'posten', 'sleutel',
  'groot', 'lees', 'meld', 'kies', 'wis', 'zet',
]);
// "coop" als losse tekst in de naam, dus ook als achtervoegsel (bezitcoop.js, interior_coop_test.mjs). 'cooper' en 'scoop' bestaan niet in deze repo.
const COOP = /coop/i;

function woorden(naam) {
  return String(naam || '')
    .replace(/\.(js|mjs|cjs)$/i, '')
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

// De fouten van één bestand (rel = pad vanaf de repo-root, src = de broncode). game/js: coop-naam, Nederlandse bestandsnaam en
// Nederlandse identifiers. scripts/: alleen de coop-naam (de naamgeving van testscripts is Nederlands gegroeid).
export function fautenVoor(rel, src = '') {
  const fouten = [];
  if (coopNaam(rel.split('/').pop())) fouten.push(`${rel}: nieuwe coop-naam (gebruik multiplayer)`);
  if (!rel.startsWith('game/js/')) return fouten;
  if (nederlandseNaam(rel)) fouten.push(`${rel}: Nederlandse bestandsnaam`);
  for (const m of src.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
    if (nederlandseNaam(m[1])) fouten.push(`${rel}: Nederlandse identifier ${m[1]}`);
  }
  return fouten;
}

function alleBestanden(dir, uit = [], ext = /\.js$/) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') alleBestanden(p, uit, ext); }
    else if (ext.test(e.name)) uit.push(path.relative(ROOT, p).replaceAll(path.sep, '/'));
  }
  return uit;
}

// Alle bestanden die de poort bekijkt: game/js (.js) en scripts/ (.mjs, .js, .cjs, .sh).
const bekijkAlles = () => [...alleBestanden(JS), ...alleBestanden(SCRIPTS, [], /\.(mjs|js|cjs|sh)$/)].sort();
const bron = (f) => (f.startsWith('game/js/') ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');

function main() {
  const bestanden = alleBestanden(JS).sort();
  const alles = bekijkAlles();
  const schrijf = (basis) => fs.writeFileSync(BASELINE, JSON.stringify(basis, null, 2) + '\n');
  if (process.argv.includes('--update')) {
    // alle huidige game/js-bestanden zijn baseline; de coop-benoemde scripts blijven als uitzondering
    const uitzonderingen = alles.filter((f) => !f.startsWith('game/js/') && fautenVoor(f).length);
    schrijf({ v: 2, op: '2026-11-07', bestanden, uitzonderingen });
    console.log(`naamtaal: baseline bijgewerkt (${bestanden.length} bestaande bestanden, ${uitzonderingen.length} uitzonderingen)`);
    return 0;
  }
  let basis;
  try { basis = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { console.error('naamtaal: baseline ontbreekt; draai met --update na een besluit'); return 2; }
  const bekend = new Set(basis.bestanden || []);
  const nieuwOfScript = alles.filter((f) => !bekend.has(f));
  if (process.argv.includes('--leg-vast')) {
    const uitzonderingen = nieuwOfScript.filter((f) => fautenVoor(f, bron(f)).length);
    schrijf({ ...basis, v: 2, uitzonderingen });
    console.log(`naamtaal: ${uitzonderingen.length} uitzonderingen vastgelegd`);
    return 0;
  }
  const uitzondering = new Set(basis.uitzonderingen || []);
  const fouten = [];
  let gecontroleerd = 0;
  for (const f of nieuwOfScript) {
    if (uitzondering.has(f)) continue;
    gecontroleerd++;
    fouten.push(...fautenVoor(f, bron(f)));
  }
  if (fouten.length) { console.log('FAIL naamtaal:\n  ' + fouten.join('\n  ')); return 1; }
  console.log(`naamtaal_check: ${gecontroleerd} nieuwe bestanden gecontroleerd, 0 fouten (${bestanden.length} in game/js, ${uitzondering.size} uitzonderingen vast)`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
