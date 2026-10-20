// Criteria for a followable story (#93), akte 2-5, checked on the data:  node scripts/storyclarity_test.mjs
//  1. every built step has one clear goal on the map: a lead (speaker, 40-220 characters, a full sentence) that names a place or a person
//  2. every built step has scenes in script.json (the reason is said, not only shown)
//  3. a long trip is a step of its own (T1-T4) or has a travel beat: scripts/reisaudit_test.mjs and reisbeats_test.mjs
//  4. the "Wat weten we?" line of every act exists (the big goal of the act)
import fs from 'node:fs';
import { STEPS, WHY } from '../game/js/storyarc_nieuw.js';
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scenes = new Set(script.scenes.map((s) => s.id));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const named = /[A-Z][a-zë]{2,}/; // a place or a person (a capital after the first word)
for (const part of ['romp', 'staart', 'zuid', 'ontzet']) ok(typeof WHY[part] === 'string' && WHY[part].length > 20, `${part}: the goal of the act`);
for (const st of STEPS.filter((s) => s.built && ['romp', 'staart', 'zuid', 'ontzet'].includes(s.part))) {
  if (st.kind !== 'mission' && st.type !== 'reis' && !st.lead) continue;
  const lead = st.lead && st.lead[1];
  ok(!!lead && lead.length >= 40 && lead.length <= 220, `${st.id}: lead of 40-220 characters`, lead ? lead.length : 'none');
  ok(!!lead && /[.!?]$/.test(lead), `${st.id}: the lead is a full sentence`);
  ok(!!lead && named.test(lead.slice(1)), `${st.id}: the lead names a place or a person`);
  ok(Array.isArray(st.scenes) && st.scenes.length > 0 && st.scenes.every((s) => scenes.has(s)), `${st.id}: scenes exist`);
}
console.log(`${n - fails}/${n} storyclarity`);
process.exit(fails ? 1 : 0);
