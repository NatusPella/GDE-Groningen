// Stad of Grunn? Classificeert elk voorkomen van het losse woord "Grunn" in speltekst (docs/TAALREGEL-STAD-OMMELAND-22-11.md):
//   A = hoort "Stad" (of "Groningen" bij een officiele naam): het gaat om de stad Groningen zelf.
//   B = blijft "Grunn": het geheel (provincie, gevoel, naam van het spel), slogan, titel, eigennaam.
//   C = twijfel: een mens beslist (de lijst staat in docs/STAD-GRUNN-AUDIT-22-11.md).
// Gebruik:
//   node scripts/stad_grunn_audit.mjs            toont de aantallen
//   node scripts/stad_grunn_audit.mjs --lijst=A  toont alle voorkomens van een categorie (A, B of C) in de bron
//   node scripts/stad_grunn_audit.mjs --write    schrijft docs/STAD-GRUNN-AUDIT-22-11.md
// Alleen lezen (behalve --write). De regels zelf (STAD_PLACES, FORBIDDEN, DECISIONS) worden ook door scripts/stad_grunn_test.mjs gebruikt.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Plekken van de stad Groningen: staan ze in dezelfde zin als "Grunn" als locatie, dan hoort daar "Stad".
export const STAD_PLACES = [
  'Martinitoren', 'Martinikerk', 'Grote Markt', 'Vismarkt', 'Euroborg', 'Oosterpoort', 'Poelestraat', 'Herebrug',
  'Folkingestraat', 'Zuiderdiep', 'Ebbingestraat', 'Nieuwstad', 'Paddepoel', 'Oosterpark', 'Schildersbuurt', 'Binnenstad',
  'binnenstad', 'gracht', 'grachten', 'rondvaart', 'Noorderplantsoen', 'Sterrebos', 'Hoornse Meer', 'Zeeheldenbuurt',
  'Bisschopskwartier', 'Helpman', 'Korreweg', 'Peizerweg', 'Ring Zuid', 'Zuidelijke Ringweg', 'Stadsschouwburg', 'Forum',
  'd’Olle Grieze', 'd\'Olle Grieze', 'Academiegebouw', 'Groninger Museum', 'Ossenmarkt', 'Brugstraat', 'Oosterhaven',
];
// Woorden die een stadsbeeld oproepen (stoep, kroeg, fietsen, brug...): "Grunn" als plek ernaast is de stad.
export const STAD_IMAGERY = ['kroeg', 'kroegen', 'brug', 'bruggen', 'stoep', 'terras', 'fietsen', 'fietser', 'kamer', 'standplaats', 'standplaatsen', 'bisschop', 'beleg'];

// Mag nooit in speltekst: "de Grunn" (constitution 1).
export const FORBIDDEN = /\b(?:de|De|DE|d['’]|in de|naar de|uit de)\s+Grunn(?![a-z])/;

// De beslissingen van 22-11: een zin die hoort bij Stad. `oud` mag in geen bron meer staan (regressie), `nieuw` staat erin.
export const DECISIONS = [
  ['de enige vrije standplaats van Grunn', 'de enige vrije standplaats van de Stad'],
  ['alle standplaatsen van Grunn', 'alle standplaatsen van de Stad'],
  ['Station Grunn', 'Station Groningen'],
  ['Omdat Grunn te klein is voor een echt beleg.', 'Omdat de Stad te klein is voor een echt beleg.'],
  ['de bisschop die Grunn in 1672 niet innam', 'de bisschop die de Stad in 1672 niet innam'],
  ['Hij kreeg Grunn niet.', 'Hij kreeg de Stad niet.'],
  ['In Grunn hebben we de Martinitoren.', 'In de Stad hebben we de Martinitoren.'],
  ['De grootste stoet die Grunn ooit zag.', 'De grootste stoet die de Stad ooit zag.'],
  ['Bijna net zo groot als Grunn.', 'Bijna net zo groot als de Stad.'],
  ['Het is een negende van Grunn.', 'Het is een negende van de Stad.'],
  ['toen Grunn werd uitgebreid', 'toen de Stad werd uitgebreid'],
  ['Grunn staat erom bekend dat de kroegen', 'De Stad staat erom bekend dat de kroegen'],
  ['omdat ze in Grunn geen tijd hebben', 'omdat ze in de Stad geen tijd hebben'],
  ['In Grunn is tijdelijk een rekbaar begrip.', 'In de Stad is tijdelijk een rekbaar begrip.'],
  ['Eeuwenlang de weg van Grunn naar zee.', 'Eeuwenlang de weg van de Stad naar zee.'],
  ['het drukste stukje Grunn', 'het drukste stukje Stad'],
  ['rector van de Latijnse school in Grunn', 'rector van de Latijnse school in de Stad'],
  ['Ik ken elke brug in Grunn.', 'Ik ken elke brug in de Stad.'],
  ['kaart van Grunn.\'', 'kaart van de Stad.\''],
  ['Zo gaat dat in Grunn.', 'Zo gaat dat in de Stad.'],
  ['Het hart van Grunn.', 'Het hart van de Stad.'],
  ['Zeehelden, in Grunn.', 'Zeehelden, in de Stad.'],
  ['Het grootste plein van Grunn.', 'Het grootste plein van de Stad.'],
  ['Winkelen onder een afdak. In Grunn is dat geen luxe.', 'Winkelen onder een afdak. In de Stad is dat geen luxe.'],
  ['Hoeveel fietsen zijn er eigenlijk in Grunn?', 'Hoeveel fietsen zijn er eigenlijk in de Stad?'],
  ['Tip: in Grunn neemt een fietser', 'Tip: in de Stad neemt een fietser'],
  ['De toren van Grunn', 'De toren van de Stad'],
  ['gooien in een wijk van Grunn', 'gooien in een wijk van de Stad'],
  // C-ronde 22-11 (twijfelgevallen beslist): de verhuizer, de reklametaxi en de slugregel van de openingsfilm gaan over de stad zelf
  ['half Nederland zoekt een kamer in Grunn', 'half Nederland zoekt een kamer in de Stad'],
  ['Rinkelbel kent elke omweg van Grunn', 'Rinkelbel kent elke omweg van de Stad'],
  ['EXT. GRUNN, VAN D’OLLE GRIEZE', 'EXT. DE STAD, VAN D’OLLE GRIEZE'],
];
// Gekozen om B te blijven, ook al lijkt de zin een stadsplek te noemen (slogan, provincie of eigennaam).
const KEEP_B = ['Even getril in Grunn', 'Groeten uit Grunn', 'De bal van Grunn'];
// Besluit over de twijfelgevallen (eigenaar, 22-11: "pas de regel zelf toe"): regel 5 van de taalregel (twijfel is Grunn), met drie uitzonderingen.
export const C_BESLUIT = 'Beslist op 22-11 door de regel zelf toe te passen (Stad = de stad Groningen zelf, Ommeland = de rest, Grunn = het geheel, een slogan of het gevoel; bij twijfel Grunn). Alle regels hieronder blijven Grunn: ze gaan over het geheel, de provincie, het gevoel of de naam van het spel (zomer, regen, eten, "Is Grunn ooit af?", "Grunn laden…"). Uitzonderingen die Stad werden: de verhuizer ("een kamer in de Stad", sidejob_verhuizing.js), de reklametaxi ("elke omweg van de Stad") en de slugregel van de openingsfilm ("EXT. DE STAD, VAN D’OLLE GRIEZE …"). Bewust Grunn gelaten, al lijkt het op een stadsplek: de toeristen bij de toren ("Is dit nou Grunn?"), de blauwalg in de plassen rond Grunn, het uitzicht van boven ("Van boven lijkt Grunn op een kaart") en de stadsbus ("in Grunn erger dan te laat"): daar spreekt de speler over het geheel, niet over de wijken.';
// Geen open A-regels meer (de verhuizer is beslist op 22-11; de bijbaanstem volgt in de volgende TTS-ronde via tts_sidejobs.py).
export const OPEN_A = [];

// Bestanden met speltekst. bron = hier schrijven mensen; afgeleid = gegenereerd (niet met de hand wijzigen).
const SOURCE = [
  /^game\/js\/.+\.js$/, /^game\/storydata\/humor.*\.json$/, /^docs\/verhaal\/nieuw\/.+\.md$/, /^steam\/achievements\.json$/,
  /^website\//, /^web\/web\.js$/, /^desktop\/.+\.js$/, /^README\.md$/,
];
const DERIVED = [
  /^game\/storydata\/script\.json$/, /^scripts\/gronings_spoken\.json$/, /^scripts\/tts_(lines|banter|barks|sidejobs|waiting)\.json$/, /^scripts\/voice_wacht\.json$/,
  /^docs\/verhaal\/TTS-OPNAMELIJST-735\.jsonl$/, /^game\/audio\/.+\/tts\.json$/,
];
const SKIP = [/^game\/js\/characterdossiers/, /^docs\/(archief|reviews)\//, /test\.mjs$/, /^docs\/verhaal\/nieuw\/0[0-8]/];

export function textFiles() {
  const list = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter(Boolean);
  const out = [];
  for (const f of list) {
    if (SKIP.some((r) => r.test(f))) continue;
    if (SOURCE.some((r) => r.test(f))) out.push({ f, kind: 'bron' });
    else if (DERIVED.some((r) => r.test(f))) out.push({ f, kind: 'afgeleid' });
  }
  return out;
}

const WORD = /(?<![A-Za-z])Grunn(?![A-Za-z]|-achtig)/g;

// De zin rond een voorkomen (tot de dichtstbijzijnde . ! ? of aanhalingsteken-grens).
function sentenceAround(line, i) {
  let a = i; while (a > 0 && !/[.!?]\s/.test(line.slice(a - 2, a))) a--;
  let b = i; while (b < line.length && !/[.!?]/.test(line[b])) b++;
  return line.slice(a, Math.min(line.length, b + 1));
}

const SLOGAN = [
  /Grunn is (nooit klaar|van jou|van joe|van ons|iets lichter|vol)/i, /Moi,? Grunn/, /Goeiemorgen, Grunn/, /Goeienavond Grunn/,
  /Ontdek jezelf in Grunn/, /Welkom (terug )?(in|bij) Grunn/, /Vandaag in Grunn/, /Een zomer in Grunn/, /Zomer in Grunn/,
  /Heel Grunn/, /heel Grunn/, /half Grunn/, /\bGrunn\.\s*['"”’]?\s*[,\]]/, /de rest van Grunn/, /Grunn blijft van jou/, /Grunn staat te wachten/,
  /Grunn en Fryslân/, /Grunn > Fryslân/, /Wat Grunn kan|wat Grunn kin/, /Grunn is een aardig groot dorp/,
  /Ommeland|provincie/, /Grunn op[.!,]/, /Hier houdt Grunn/, /Grunn Bull|Grunn Taxi|Grunn Gang|Grunn Drift|Mamma Grunn|EIKEA Grunn|Grunn Mobiel/,
  /(Kenner|Provinciebaas|Padelkoning|Hoogste duif|Legende|Piloot|Busbaas|Rondje|Geheimpjes?) (van )?Grunn/i, /geheimpjes van Grunn/,
  /Al het vet van Grunn|vet van Grunn/, /laatste bankje van Grunn|Grunn van boven|Grunn in een dag|van Grunn verkend|% van Grunn/,
  /^Grunn[.!]?$/, /Grunn bij nacht|Grunn viert|Grunn weer tegen|Grunn droogt|boven Grunn|over Grunn/,
];

export function classify(sentence, line) {
  if (KEEP_B.some((k) => sentence.includes(k) || line.includes(k))) return 'B';
  if (SLOGAN.some((r) => r.test(sentence) || r.test(line))) return 'B';
  const place = STAD_PLACES.some((p) => sentence.includes(p));
  const imagery = STAD_IMAGERY.some((p) => new RegExp('\\b' + p, 'i').test(sentence));
  const asPlace = /(Station|in|uit|naar|door|van|voor|bij|als|aan|rond|over|achter|buiten|binnen|verlaat|verlaten|opkopen|innam|niet)\s+Grunn\b|Grunn aan het|Grunn niet|Grunn ooit|Grunn te klein|Grunn is te klein/.test(sentence);
  if (place && asPlace) return 'A';
  if (imagery && asPlace) return 'A';
  if (/Station Grunn/.test(sentence)) return 'A';
  return 'C';
}

export function scan() {
  const res = [];
  for (const { f, kind } of textFiles()) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split(/\r?\n/).forEach((line, n) => {
      const t = line.trimStart();
      if (f.endsWith('.js') && (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'))) return;
      if (!line.includes('Grunn')) return;
      let m; WORD.lastIndex = 0;
      while ((m = WORD.exec(line))) {
        const head = f.endsWith('.js') ? line.indexOf(' // ') : -1;
        if (head >= 0 && m.index > head) continue;
        const sentence = sentenceAround(line, m.index);
        res.push({ f, kind, n: n + 1, sentence: sentence.trim().slice(0, 200), cat: classify(sentence, line.length < 400 ? line : sentence), forbidden: FORBIDDEN.test(line) });
      }
    });
  }
  return res;
}

function count(res) {
  const t = {};
  for (const r of res) { t[r.kind] = t[r.kind] || { A: 0, B: 0, C: 0 }; t[r.kind][r.cat]++; }
  return t;
}

function report(res) {
  const t = count(res);
  const L = [];
  L.push('# Stad of Grunn: audit van 22-11', '',
    'Gegenereerd door `node scripts/stad_grunn_audit.mjs --write`. De regel staat in [TAALREGEL-STAD-OMMELAND-22-11.md](TAALREGEL-STAD-OMMELAND-22-11.md).',
    'A = hoort Stad, B = blijft Grunn (geheel, slogan, titel, eigennaam), C = twijfel (een mens beslist). Alleen het losse woord "Grunn" telt; Grunneger, Grunnegs en Grunnegers (mensen en taal van de provincie) blijven. Wat al is aangepast (zie DECISIONS in het script) telt hier niet meer mee.', '',
    '| Soort | A (Stad) | B (Grunn) | C (twijfel) |', '|---|---|---|---|');
  for (const s of ['bron', 'afgeleid']) { const x = t[s] || { A: 0, B: 0, C: 0 }; L.push(`| ${s} | ${x.A} | ${x.B} | ${x.C} |`); }
  L.push('', 'bron = speltekst waar mensen in schrijven (game/js, docs/verhaal/nieuw, steam, website, humorbestanden). afgeleid = gegenereerd of bewaard (script.json, gronings_spoken.json met de oude invoer van al opgenomen clips, tts-lijsten, voice_wacht, tts.json per map); die volgen de bron. In gronings_spoken.json staat elke regel twee keer (Nederlands en gesproken vorm).', '');
  for (const cat of ['A', 'C']) {
    L.push(`## ${cat === 'A' ? 'A: hoort Stad (nog open)' : 'C: twijfel, beslist op 22-11 (blijft Grunn)'}`, '');
    if (cat === 'C') L.push(C_BESLUIT, '');
    const list = res.filter((r) => r.cat === cat && r.kind === 'bron');
    if (!list.length) L.push('Geen.', '');
    for (const r of list) L.push(`- \`${r.f}:${r.n}\` ${r.sentence.replace(/\|/g, '/')}`);
    L.push('');
  }
  return L.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = scan();
  const only = (process.argv.find((a) => a.startsWith('--lijst=')) || '').slice(8);
  if (only) { for (const r of res.filter((x) => x.cat === only && x.kind === 'bron')) console.log(`${r.f}:${r.n}\t${r.sentence}`); }
  else console.log(JSON.stringify(count(res)));
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'docs', 'STAD-GRUNN-AUDIT-22-11.md'), report(res));
  if (res.some((r) => r.forbidden)) { console.error('FOUT: "de Grunn" gevonden'); process.exitCode = 1; }
}
