// Deel 4 of the new story (akte 2 to 5): the defs of missions_deel4.js against the arc (storyarc_nieuw.js)
// and the script (game/storydata/script.json). No game, no world: the def pieces get a stub for walk().
// node scripts/deel4_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, NEW_MISSION_IDS, SPEAKERS } from '../game/js/storyarc_nieuw.js';
import { buildDeel4Defs, applyDeel4 } from '../game/js/missions_deel4.js';
import { PLACE_LATLON, PLACE_XY, placePoint } from '../game/js/deel4places.js';
import { REISBEATS } from '../game/js/reisbeats.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/storydata/script.json'), 'utf8'));
const sceneIds = new Set(data.scenes.map((s) => s.id));
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const walk = (x, y) => ({ x, y, road: null });
const fresh = buildDeel4Defs({ walk });
const ids = NEW_MISSION_IDS.slice(5);
ok(fresh.length === ids.length, 'one def per new mission id after loket and bakkiestunt', `${fresh.length} vs ${ids.length}`);

// the shared old defs, as far as applyDeel4 touches them
const old = [
  'Fatbikes tellen niet als fiets', 'Geleend van de Friezen',
  'Iedereen heeft een rode auto gezien', "Er hangt iets Fries aan d'Olle Grieze", 'Het bod viel tegen', 'Ontzet, net als in 1672',
].map((label) => ({ label, type: 'stages', stages: [{ kind: 'pigeon' }], notes: [{ x: 0, y: 0, text: 't' }] }));
const list = [...old, ...fresh];
applyDeel4(list, { walk });

const steps = STEPS.filter((s) => s.kind === 'mission' && s.mission);
const defOf = (s) => list.find((d) => d.label === s.title);
const KINDS = new Set(['goto', 'scene', 'hold', 'pigeon']);
const NPC_KEYS = new Set(Object.keys(SPEAKERS));
for (const s of steps.filter((q) => !['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M12', 'M13', 'M14', 'M15', 'M16'].includes(q.id))) {
  ok(s.built, `${s.id}: built`);
  const d = defOf(s);
  ok(d, `${s.id}: a def with the step's title`, s.title);
  if (!d) continue;
  ok(Array.isArray(d.stages) || s.id === 'M08', `${s.id}: stages`);
  ok(d.reward === s.reward || ['M08', 'M24'].includes(s.id), `${s.id}: reward of the def equals the step's`, `${d.reward} vs ${s.reward}`);
  for (const st of d.stages || []) {
    ok(KINDS.has(st.kind), `${s.id}: stage kind ${st.kind}`);
    if (st.target && st.target.place) ok(placePoint(st.target.place), `${s.id}: place ${st.target.place} is known`);
    if (st.script) for (const id of st.script.ids) ok(sceneIds.has(id), `${s.id}: stage scene ${id} exists`);
    if (st.talk) for (const id of st.talk.ids) ok(sceneIds.has(id), `${s.id}: stage talk ${id} exists`);
    for (const c of st.cast || []) ok(NPC_KEYS.has(c.key), `${s.id}: cast ${c.key} is in the cast`);
    if (st.kind === 'scene' && !st.lines) ok(st.script, `${s.id}: a scene stage has script lines`);
    if (st.kind === 'hold') ok(Array.isArray(st.ticks) && st.ticks.length >= 2 && st.time > 0, `${s.id}: hold has ticks and time`);
  }
  for (const k of ['intro', 'outro', 'replay']) for (const id of s.story?.[k] || []) ok(sceneIds.has(id), `${s.id}: story ${k} scene ${id} exists`);
  for (const id of s.scenes) ok(sceneIds.has(id), `${s.id}: scene ${id} exists`);
  ok(s.story && s.story.intro && s.story.intro.length, `${s.id}: has an intro scene`);
  ok(s.lead && s.lead[1] && s.lead[1].length < 140, `${s.id}: a short lead`);
}
// the startSpot of M12 and the notes of M08
ok(list.find((d) => d.label === 'Fatbikes tellen niet als fiets').notes[0].talk.ids[0] === 'M08.2', 'M08 talks on the lane');

// the travel steps and the epilogue
for (const s of STEPS.filter((q) => q.goal && q.goal.type === 'travel')) {
  ok(s.built && placePoint(s.goal.to), `${s.id}: travel to a known place (${s.goal.to})`);
  ok(REISBEATS[s.goal.beat], `${s.id}: a travel beat`);
  for (const id of [].concat(s.goal.scene || REISBEATS[s.goal.beat].scene || [], s.goal.arrive || [])) ok(sceneIds.has(id), `${s.id}: travel scene ${id} exists`);
}
const epi = STEPS.find((s) => s.id === 'E');
ok(epi && epi.built && epi.goal.type === 'epilogue' && epi.scenes.every((id) => sceneIds.has(id)), 'the epilogue is built on E1 and E2');
ok(STEPS.every((s) => s.built), 'every step of the new arc is built');

// the places are in the province (RD New, metres from the city): Bourtange in the south-east, Lauwersoog in the north-west
const b = placePoint('Vesting Bourtange'), l = placePoint('Lauwersoog'), z = placePoint('Zoutkamp');
ok(b.x > 30000 && b.y > 15000, 'Bourtange lies south-east', JSON.stringify(b));
ok(l.x < -10000 && l.y < -15000, 'Lauwersoog lies north-west', JSON.stringify(l));
ok(Math.hypot(l.x - z.x, l.y - z.y) > 6000 && Math.hypot(l.x - z.x, l.y - z.y) < 12000, 'Zoutkamp to Lauwersoog is about 9 km');
ok(Object.keys(PLACE_LATLON).length > 15 && Object.keys(PLACE_XY).length >= 1, 'places listed');

console.log(`${n - fails}/${n} deel 4 checks passed`);
process.exit(fails ? 1 : 0);
