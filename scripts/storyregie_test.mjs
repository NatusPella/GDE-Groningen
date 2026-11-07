// Regie-afspraken van de nieuwe verhaallijn die geen wereld nodig hebben (#718, #719, #722, #737, #745):
//   node scripts/storyregie_test.mjs
// Bronchecks op story.js, missionstory.js en cutscenes_akte3.js, plus de vijf missies zonder eigen outro.
import fs from 'node:fs';
import { STEPS } from '../game/js/storyarc_nieuw.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const story = lees('story.js'), msrc = lees('missionstory.js'), akte3 = lees('cutscenes_akte3.js');

// #718: de opening ankert op het nieuwe thuis, niet op de spelerpositie; niet meer definitief overslaan na 40 s;
// en de klok gaat van dageraad (C00.1/C00.2) naar de ochtend.
ok(/const thuis = homeSpawnPoint\(\)/.test(story) && /homeSpawnPoint/.test(story), 'opening: ankert op homeSpawnPoint');
ok(/if \(world\.time - rt\.enteredAt > 600\) b\.phase = 'done'/.test(story) && !/else if \(ready && world\.time - rt\.enteredAt > 40\) b\.phase = 'done'/.test(story),
  'opening: geen definitieve 40 s-overslag meer, alleen een late noodrem');
ok(/zetKlok\(5\.75\)/.test(story) && /zetKlok\(8\)/.test(story), 'opening: klok van dageraad naar de ochtend');

// #719: de finale verlaat eerst een voertuig, heeft een terugval als nearestRoadPoint niets vindt en dooft zwart.
ok(/const spot = road \|\| \{ x: FINALE_SPOT\[0\], y: FINALE_SPOT\[1\] \}/.test(story), 'finale: terugval op de Markt zonder weg');
ok(/p\.exitVehicle\(world\.map, world\)/.test(story), 'finale: eerst netjes uit een voertuig');
ok(/flash\(\); \/\/ zwarte doof/.test(story), 'finale: zwarte doof over de sprong');

// #745: de stage van de aanroeper blijft in missionstory staan (replay/vrije missie speelt de korte variant).
ok(!/\n  stage = i;\n/.test(msrc) && !/opts = \{ \.\.\.opts, stage: i \};/.test(msrc), 'missionstory: stage wordt niet meer op i gezet');
ok(/export function playStoryIntro\(w, i, \{ stage = i,/.test(msrc) && /export function playStoryOutro\(w, i, opts = \{\}\) \{/.test(msrc), 'missionstory: stage-parameter blijft bestaan');

// #737: de M16-outro is gesplitst; het tweede deel speelt op de dijk met een eigen anker en dagdeel.
ok(/split: \{ at: 'Bij Berend mocht ik niet rijden', key: 'M16\.dijk'/.test(akte3), 'M16: de knip en de dijkspec staan in de regie');
ok(/S\['M16\.dijk'\] = \{/.test(akte3), 'M16.6: eigen dijkscène');
ok(/spec\.split && spec\.split\.key/.test(msrc) && /queue: true/.test(msrc), 'missionstory speelt het tweede deel in de wachtrij');

// #722: de vijf missies zonder eigen outro zijn bewust null (de laatste stage vertelt het).
for (const id of ['M06', 'M10', 'M21', 'M22', 'M24']) {
  const st = STEPS.find((q) => q.id === id);
  ok(st && st.story && st.story.outro === null, `${id}: geen eigen outro-spec, bewust (laatste stage vertelt het)`);
}

console.log(fails ? `${fails} of ${n} story regie checks failed` : `storyregie_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
