// Vlagt identieke en bijna-identieke regels in het verhaalscript, en de verboden zinsbouw van
// docs/verhaal/STIJLGIDS.md. Alleen lezen: geen netwerk, geen spel nodig.
//   node scripts/story_similarity_test.mjs          controle (faalt bij een nieuwe vlag)
//   node scripts/story_similarity_test.mjs --list   toont alles, ook wat is toegestaan
//
// Wat een vlag is:
//   1. dezelfde regel (genormaliseerd) bij dezelfde spreker in twee scènes, tenzij de regel in
//      scripts/story_similarity_allow.json staat (een bedoelde terugkeer: 'Net fertelle, hè?', 'Moi.').
//   2. twee regels van vijf woorden of meer die bijna hetzelfde zijn (woordgelijkenis >= 0,8
//      of tekstgelijkenis >= 0,88), bij dezelfde spreker in twee scènes, op een toegestane na.
//   3. een verboden zinsbouw (zie PATTERNS): elk patroon heeft een plafond; het plafond is het
//      aantal dat nu in het script staat, dus het aantal kan alleen omlaag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/storydata/script.json'), 'utf8'));
const allow = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/story_similarity_allow.json'), 'utf8'));
const LIST = process.argv.includes('--list');

const norm = (t) => t.toLowerCase().replace(/…|\.{2,}/g, ' ').replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
const words = (t) => norm(t).split(' ').filter(Boolean);

export function similarity(a, b) {
  const A = new Set(words(a)), B = new Set(words(b));
  const inter = [...A].filter((w) => B.has(w)).length;
  const jaccard = inter / (A.size + B.size - inter || 1);
  return { jaccard, text: 1 - lev(norm(a), norm(b)) / Math.max(norm(a).length, norm(b).length, 1) };
}

function lev(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const lines = [];
for (const s of data.scenes) for (const l of s.lines) if (l.channel !== 'app-stil') lines.push({ scene: s.id, speaker: l.speaker, text: l.text });

// een toegestane terugkeer: de hele regel (genormaliseerd) staat in de lijst; maxKeer zet er een plafond op
const entryFor = (text) => (allow.herhaling || []).find((e) => norm(text) === norm(e.tekst));
const allowed = (text) => !!entryFor(text);
const alternate = (a, b) => (allow.alternatief || []).some((g) => g.includes(a) && g.includes(b));
const allowedPair = (a, b) => (allow.paren || []).some((e) => (norm(a).includes(norm(e.a)) && norm(b).includes(norm(e.b))) || (norm(a).includes(norm(e.b)) && norm(b).includes(norm(e.a))));

const found = { exact: [], near: [] };
const bySpeaker = new Map();
for (const l of lines) (bySpeaker.get(l.speaker) || bySpeaker.set(l.speaker, []).get(l.speaker)).push(l);
// het aantal keren dat een toegestane regel per spreker mag voorkomen
for (const [speaker, list] of bySpeaker) {
  for (const e of allow.herhaling || []) {
    if (!e.maxKeer) continue;
    const n = list.filter((l) => norm(l.text) === norm(e.tekst)).length;
    if (n > e.maxKeer) found.exact.push(`${speaker}: "${e.tekst}" komt ${n} keer voor (maximaal ${e.maxKeer})`);
  }
}
for (const [speaker, list] of bySpeaker) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.scene === b.scene || alternate(a.scene, b.scene)) continue;
      const na = norm(a.text), nb = norm(b.text);
      if (na === nb) {
        if (words(a.text).length >= 2 && !allowed(a.text)) found.exact.push(`${speaker}: "${a.text}" (${a.scene}, ${b.scene})`);
        continue;
      }
      if (words(a.text).length < 5 || words(b.text).length < 5) continue;
      const sim = similarity(a.text, b.text);
      if ((sim.jaccard >= 0.8 || sim.text >= 0.88) && !allowedPair(a.text, b.text)) found.near.push(`${speaker}: "${a.text}" (${a.scene}) ~ "${b.text}" (${b.scene})`);
    }
  }
}

let fails = 0;
// verboden zinsbouw: [naam, patroon, plafond, uitleg]
const PATTERNS = [
  ['Dat is een X, geen Y', /\bdat is (een|het|de) [^,.?!]{2,30}, geen [^.?!]{2,30}/i, allow.plafond['Dat is een X, geen Y'], 'de correctie als hoofdgrap: Tammo misnoemt, Tessa corrigeert'],
  ['Mijn Y zeggen dank', /zeggen dank/i, allow.plafond['Mijn Y zeggen dank'], 'de dankformule van de replay-regels'],
  ['Weer een X? ...', /^weer (een|nog een|de|het) [^?]{2,40}\?/i, allow.plafond['Weer een X?'], 'de replay-formule: gebruik een regel die bij de persoon past'],
  ['Ik ben X, beroep. Oma belde', /\b[Ii]k ben [\p{Lu}][\p{L}]+, [\p{Ll}\- ]{3,30}\.(?:.*\b(?:trijntje|oma|mem)\b.*\bbelde\b)?/u, allow.plafond['Ik ben X, beroep'], 'de binnenkomst die elke bijfiguur gebruikt; laat het beroep door de regel komen'],
  ['Oma belde', /\b(trijntje|oma trijntje|oma) belde\b/i, allow.plafond['Oma belde'], 'het bericht van oma als aanloop'],
  ['Dat zeg je altijd / zo vaak', /\bdat zeg je (altijd|zo vaak)\b/i, allow.plafond['Dat zeg je altijd'], 'de callback zonder voorbereiding'],
];
// de patronen zelf: wat de gids verbiedt moet worden gevonden, wat hij toestaat niet
const SAMPLES = {
  'Dat is een X, geen Y': ['Dat is een regel, geen brug.', 'Dat is een graantje.'],
  'Mijn Y zeggen dank': ['Weer een tank? Mijn pannen zeggen dank.', 'Dank u wel.'],
  'Weer een X? ...': ['Weer een spoedje? Ik zet het in het rooster.', 'Weer rijden? Kom maar.'],
  'Ik ben X, beroep. Oma belde': ['Ik ben Wubbo, brugwachter. Oma Trijntje belde.', 'Wubbo, dat ben ik.'],
  'Oma belde': ['Oma Trijntje belde.', 'Ik belde oma.'],
  'Dat zeg je altijd / zo vaak': ['Dat zeg je altijd.', 'Zeg dat maar vaker.'],
};
for (const [name, re] of PATTERNS) {
  const [bad, good] = SAMPLES[name];
  if (!re.test(bad) || re.test(good)) { fails++; console.log(`FAIL patroon "${name}" vindt zijn voorbeeld niet of vindt te veel`); }
}
const s1 = similarity('Weer een tank? Mijn pannen zeggen dank.', 'Weer een tank? Mijn friteuse zegt dank.');
if (s1.jaccard < 0.5) { fails++; console.log('FAIL similarity: twee verwante regels lijken niet op elkaar', s1); }
const patternHits = PATTERNS.map(([name, re, max, why]) => ({ name, why, max: max ?? 0, hits: lines.filter((l) => re.test(l.text)).map((l) => `${l.speaker} (${l.scene}): ${l.text}`) }));

const report = (title, arr) => { if (arr.length) { console.log(`${title}: ${arr.length}`); for (const x of arr) console.log('  ' + x); } };
if (LIST || found.exact.length) report('Dezelfde regel bij dezelfde spreker', found.exact);
if (LIST || found.near.length) report('Bijna dezelfde regels bij dezelfde spreker', found.near);
fails += found.exact.length + found.near.length;
for (const p of patternHits) {
  const over = p.hits.length > p.max;
  if (over) { fails++; console.log(`FAIL verboden zinsbouw "${p.name}": ${p.hits.length} (plafond ${p.max}), ${p.why}`); }
  if (over || LIST) for (const h of p.hits) console.log('  ' + h);
}
if (!fails) console.log(`story_similarity_test ok (${lines.length} regels, ${bySpeaker.size} sprekers, ${PATTERNS.length} patronen)`);
process.exit(fails ? 1 : 0);
