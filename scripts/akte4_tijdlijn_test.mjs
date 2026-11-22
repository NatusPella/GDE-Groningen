// Akte 4 (zo 23 tot wo 26 augustus): de dagdelen in de regie lopen mee met de volgorde van de stappen (zuiver node).
// De stappen staan vast in de saves; de regie moet dus passen bij de volgorde, niet andersom.
//   node scripts/akte4_tijdlijn_test.mjs
import fs from 'node:fs';
const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log(`FAIL ${m}`); } };
const DAG = { maandag: 1, dinsdag: 2, woensdag: 3 };
const DEEL = [[/lunchtijd/, 2], [/vroege avond|late middag/, 4], [/middag/, 3], [/ochtend|vroege ochtend/, 1], [/avond/, 5], [/nacht/, 6]];
const zuid = STEPS.filter((s) => s.part === 'zuid' && s.scenes && s.scenes.length);
let last = 0, lastId = '';
let gelezen = 0;
for (const st of zuid) {
  const sc = script.scenes.find((s) => s.id === st.scenes[0]);
  const eerste = ((sc && sc.regie) || [])[0] || '';
  const kop = eerste.split('.')[0].toLowerCase();
  const dag = Object.keys(DAG).find((d) => kop.includes(d));
  if (!dag) continue;
  const deel = (DEEL.find(([re]) => re.test(kop)) || [null, 0])[1];
  const t = DAG[dag] * 10 + deel;
  gelezen++;
  ok(t >= last, `${st.id} ("${kop}") valt niet vóór ${lastId} in de tijd`);
  last = t; lastId = st.id;
}
ok(gelezen >= 8, `genoeg stappen van akte 4 hebben een dag in de regie (${gelezen})`);
const j6 = STEPS.find((s) => s.id === 'J6');
ok(j6 && j6.homeScene && j6.homeScene.clock < 17, 'J6 speelt op dinsdagmiddag (de bus naar Bourtange vertrekt dinsdagavond)');
console.log(`akte4_tijdlijn_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
