// Humorkeuze (#1134, docs/verhaal/HUMOR-WERKWIJZE.md): elke nieuwe of herschreven komische beat in game/storydata/humor.json
// heeft drie varianten en een veilige neutrale terugval; het spel gebruikt de gekozen variant (script.json draagt hem met
// het label humor-review); een paneeloordeel (drie onafhankelijke beoordelaars) bepaalt de winnaar en staat in
// docs/verhaal/HUMOR-KEUZELIJST.md voor een veto van de eigenaar. `--eis-paneel`: elke beat moet beoordeeld zijn.
// node scripts/humor_test.mjs [--eis-paneel]
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const humor = JSON.parse(read('game/storydata/humor.json'));
const script = JSON.parse(read('game/storydata/script.json'));
const EIS = process.argv.includes('--eis-paneel');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const scenes = new Map(script.scenes.map((s) => [s.id, s]));
const textOf = (b) => (b.chosen === 'neutral' ? b.neutral : b.variants[b.chosen]);

// Het paneeloordeel: meerderheid wint; bij 1-1-1 de variant die het dichtst bij de stijlgids ligt (`tiebreak` in het paneel).
export function panelWinner(votes, tiebreak) {
  const c = new Map();
  for (const v of votes) c.set(v, (c.get(v) || 0) + 1);
  const top = [...c.entries()].sort((a, b) => b[1] - a[1]);
  if (top[0][1] >= 2) return top[0][0];
  return tiebreak === undefined ? null : tiebreak;
}

ok(Array.isArray(humor.beats) && humor.beats.length > 0, 'humor.json heeft beats');
ok(new Set(humor.beats.map((b) => b.id)).size === humor.beats.length, 'de id\'s zijn uniek');
const doc = fs.existsSync(new URL('../docs/verhaal/HUMOR-KEUZELIJST.md', import.meta.url)) ? read('docs/verhaal/HUMOR-KEUZELIJST.md') : '';
let beoordeeld = 0;
for (const b of humor.beats) {
  ok(/^H\d+$/.test(b.id) && b.label === 'humor-review', `${b.id}: id en label humor-review`);
  ok(b.variants.length === 3 && new Set([...b.variants, b.neutral]).size === 4 && [...b.variants, b.neutral].every((t) => t && words(t) <= 30), `${b.id}: drie verschillende varianten en een neutrale terugval`);
  ok([0, 1, 2, 'neutral'].includes(b.chosen), `${b.id}: chosen is 0, 1, 2 of neutral`);
  ok(b.context && b.context.length > 30 && b.shot && b.speaker, `${b.id}: context, shotpatroon en spreker`);
  const sc = scenes.get(b.scene);
  const l = sc && sc.lines.find((x) => x.humor === b.id);
  ok(!!l, `${b.id}: script.json heeft de regel met het label`);
  if (l) ok(l.text === textOf(b), `${b.id}: het spel gebruikt de gekozen variant`, l.text);
  if (b.panel) {
    beoordeeld++;
    ok(Array.isArray(b.panel.votes) && b.panel.votes.length === 3 && b.panel.votes.every((v) => [0, 1, 2, 'neutral'].includes(v)), `${b.id}: drie stemmen`);
    ok(b.panel.reason && b.panel.reason.length > 10 && ['hoog', 'midden', 'laag'].includes(b.panel.certainty), `${b.id}: reden en zekerheid`);
    const w = panelWinner(b.panel.votes, b.panel.tiebreak);
    ok(w === b.chosen, `${b.id}: de gekozen variant is de winnaar van het paneel`, `${w} tegenover ${b.chosen}`);
  } else if (EIS) ok(false, `${b.id}: nog niet beoordeeld door het paneel`);
  if (doc) ok(doc.includes(b.id), `${b.id}: staat in HUMOR-KEUZELIJST.md`);
}
// gevoelige beats en een 1-1-1 met lage zekerheid staan bovenaan de lijst
if (doc) {
  const risk = humor.beats.filter((b) => b.sensitive || (b.panel && new Set(b.panel.votes).size === 3 && b.panel.certainty === 'laag'));
  const top = doc.split('## Alle beats')[0] || '';
  for (const b of risk) ok(top.includes(b.id), `${b.id}: gevoelig of gespleten, dus bovenaan de lijst`);
}
// de regels zelf: een gelabelde regel in script.json hoort bij een beat
const labeled = script.scenes.flatMap((s) => s.lines.filter((l) => l.humor).map((l) => l.humor));
ok(labeled.every((id) => humor.beats.some((b) => b.id === id)), 'elk label in script.json hoort bij een beat');
ok(labeled.length === humor.beats.length, 'elke beat heeft precies één gelabelde regel', `${labeled.length} / ${humor.beats.length}`);

console.log(`humor_test: ${n - fails}/${n} ok (${humor.beats.length} beats, ${beoordeeld} beoordeeld)`);
if (fails) process.exit(1);
