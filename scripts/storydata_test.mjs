// The new story's data (game/storydata/script.json, built by scripts/build_story_data.mjs
// from docs/verhaal/nieuw/09-script-akte*.md): format, speakers, every scene on a step of the
// new arc, recordings only where they really exist, the counts. node scripts/storydata_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build_story_data.mjs';
import { STEPS, SPEAKERS, PARTS, NEW_MISSION_IDS } from '../game/js/storyarc_nieuw.js';
import { dutchFor, looksFrisian } from '../game/js/subtitles.js';
import { withEllipsisAliases } from '../game/js/voicebank.js';
import { setStoryData, storyLines } from '../game/js/storytext.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'game/storydata/script.json');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const fresh = build().data;
ok(JSON.stringify(fresh) === JSON.stringify(data), 'script.json is what build_story_data.mjs builds from the 09 scripts (run it again)');

const scenes = data.scenes;
const lines = scenes.flatMap((s) => s.lines.map((l) => ({ ...l, scene: s })));
const CHANNELS = new Set(['stem', 'radio', 'telefoon', 'app-stil']);
const KINDS = new Set(['opening', 'intro', 'outro', 'replay', 'key', 'banter', 'radio', 'app', 'side', 'travel', 'epilogue']);
const manifests = {};
const manifest = (m) => manifests[m] || (manifests[m] = withEllipsisAliases(JSON.parse(fs.readFileSync(path.join(ROOT, 'game/audio/voicelines', m, 'manifest.json'), 'utf8'))));

// format
ok(scenes.length >= 150, 'scenes in the script', String(scenes.length));
ok(new Set(scenes.map((s) => s.id)).size === scenes.length, 'scene ids are unique');
for (const s of scenes) {
  ok(/^[A-Z]\d+(\.\d+b?)?$/.test(s.id) && s.title && KINDS.has(s.kind) && Number.isInteger(s.act) && s.act >= 1 && s.act <= 6,`${s.id}: id, title, kind, act`, `${s.id} ${s.kind}`);
  ok(Array.isArray(s.lines) && Array.isArray(s.regie), `${s.id}: lines and regie`);
  if (s.lines.length === 0) ok(s.kind === 'key' || s.kind === 'intro' || s.kind === 'outro', `${s.id}: an empty scene is only allowed for a mission scene`, s.kind);
}
for (const l of lines) {
  const at = `${l.scene.id}: ${l.text.slice(0, 40)}`;
  ok(typeof l.text === 'string' && l.text.length > 0 && !/^\s|\s$/.test(l.text), `${at}: text`);
  ok(CHANNELS.has(l.channel), `${at}: channel`, l.channel);
  ok(l.tag === 'BEHOUDEN' || l.tag === 'NIEUW', `${at}: tagged BEHOUDEN or NIEUW`, l.tag);
  ok(typeof l.textOnly === 'boolean', `${at}: textOnly is set`);
  if (l.channel === 'app-stil') ok(l.silent === true && l.textOnly === true && l.from && l.to, `${at}: a silent app text is text only, with from and to`);
  else ok(l.key && l.speaker, `${at}: speaker and key`);
  ok(!/\[(BEHOUDEN|NIEUW)\]/.test(l.text), `${at}: no tag left in the text`);
}

// speakers: every key is in the speaker table and in the new arc's SPEAKERS (T and A are the pair)
for (const l of lines.filter((x) => x.channel !== 'app-stil')) {
  ok(l.key === 'T' || l.key === 'A' || SPEAKERS[l.key] !== undefined, `speaker ${l.key} (${l.speaker}) is in storyarc_nieuw SPEAKERS`);
  ok(data.speakers[l.key], `speaker ${l.key} is in the script's speaker table`);
}
ok(!('roelf' in SPEAKERS) && !('hilje' in SPEAKERS), 'Boer Roelf and Hilje are not in the new cast');
for (const k of ['geesje', 'lammert', 'roelfien', 'wubbo', 'tinus', 'bewaarder']) ok(SPEAKERS[k], `the new cast has ${k}`);
// #476: the first scene with mevrouw Hoving passes her name card on (a Naamkaart regie, storytext NAMECARD)
setStoryData(data);
const firstHoving = scenes.find((s) => s.lines.some((l) => l.key === 'bewaarder'));
const hovingCard = firstHoving && storyLines([firstHoving.id]).find((l) => l[2].card === 'bewaarder');
ok(hovingCard, `${firstHoving ? firstHoving.id : 'the first Hoving scene'}: mevrouw Hoving gets her name card`);

// every scene is on a step of the new arc, and the steps list their scenes
const stepIds = new Set(STEPS.map((s) => s.id));
for (const s of scenes) ok(s.step && stepIds.has(s.step), `${s.id}: mapped to a step of storyarc_nieuw (${s.step})`);
for (const st of STEPS) {
  for (const id of st.scenes || []) {
    const sc = scenes.find((q) => q.id === id);
    ok(sc, `${st.id}: scene ${id} exists in the script`);
    if (sc) ok(sc.step === st.id, `${st.id}: scene ${id} belongs to ${sc.step}`);
  }
  const own = scenes.filter((q) => q.step === st.id && !q.anchor && q.kind !== 'banter' && q.kind !== 'app' && q.kind !== 'side');
  ok(own.every((q) => (st.scenes || []).includes(q.id)), `${st.id}: lists every scene of the script that is its own`, own.filter((q) => !(st.scenes || []).includes(q.id)).map((q) => q.id).join());
}
const missions = STEPS.filter((s) => s.kind === 'mission');
// 26 missions of the five acts and the four of Deel 4 (M27-M30, after the epilogue E)
ok(missions.length === 30 && missions.map((s) => s.id).join() === [...Array(30)].map((_, i) => 'M' + String(i + 1).padStart(2, '0')).join(), '30 main missions, M01-M30 in order');
ok(STEPS.filter((s) => /^T\d$/.test(s.id)).length === 5 && STEPS[0].id === 'M00' && STEPS.filter((s) => s.part === 'ontzet').pop().id === 'E' && STEPS[STEPS.length - 1].id === 'M30', 'five travel beats, the opening first, the epilogue last of the five acts and Deel 4 after it');
for (const m of missions) {
  const sc = scenes.filter((q) => q.step === m.id && /^M\d\d\.\d$/.test(q.id));
  ok(sc.some((q) => q.kind === 'intro'), `${m.id}: has an intro`);
  ok(sc.some((q) => q.kind === 'outro'), `${m.id}: has an outro`);
  ok(sc.some((q) => q.kind === 'intro') && sc.find((q) => q.kind === 'intro').id <= sc.find((q) => q.kind === 'outro').id, `${m.id}: the intro comes before the outro`);
}
ok(['kop', 'romp', 'staart', 'zuid', 'ontzet', 'nazomer'].every((p) => PARTS[p] && STEPS.some((s) => s.part === p)), 'five acts and Deel 4, each with steps');
ok(NEW_MISSION_IDS.join().startsWith('loket,bakkiestunt') && new Set(NEW_MISSION_IDS).size === NEW_MISSION_IDS.length, 'the new defs appended to MISSION_IDS');
const act = (k) => scenes.filter((s) => s.act === k);
ok([1, 2, 3, 4, 5].every((k) => act(k).length > 10) && act(6).length >= 20, 'every act has scenes (act 6 is Deel 4)');

// recordings: textOnly is exactly "no recording for the exact text"; a recorded line resolves in its manifest
let recorded = 0, textOnly = 0, behouden = 0, behoudenText = 0;
for (const l of lines) {
  if (l.channel === 'app-stil') { textOnly++; continue; }
  const voice = l.voice || l.speaker;
  const key = voice + '|' + l.text;
  if (l.textOnly) {
    textOnly++;
    ok(!l.rec, `${l.scene.id}: a text-only line names no recording`);
    ok(!['story', 'lines', 'banter'].some((m) => manifest(m)[key]), `${l.scene.id}: "${l.text.slice(0, 40)}" is marked text only but has a recording`);
    if (l.tag === 'BEHOUDEN') behoudenText++;
  } else {
    recorded++;
    ok(['story', 'lines', 'banter'].includes(l.rec) && manifest(l.rec)[key], `${l.scene.id}: recorded line resolves (${key.slice(0, 50)})`);
  }
  if (l.tag === 'BEHOUDEN') behouden++;
}
ok(recorded > 250 && textOnly > 700, 'recorded and text-only counts are in the expected range', `${recorded} recorded, ${textOnly} text only`);
ok(lines.filter((l) => l.channel === 'app-stil').length === lines.filter((l) => l.silent).length, 'every silent line is an app text and the other way round');
ok(behouden >= 300 && behoudenText < 20, 'the BEHOUDEN lines nearly all resolve to a recording', `${behouden} BEHOUDEN, ${behoudenText} without a recording`);

// no real names or brands, no winter (AGENTS.md constitution), Frisian lines have a Dutch subtitle
const text = JSON.stringify(scenes);
ok(!/\b(sneeuw|winter|ijsbaan|natuurijs|vorst)\b/i.test(lines.map((l) => l.text).join(' ')), 'always summer: no winter words in the lines');
ok(!/Wopke|Albert Heijn|McDonald|Febo|Efteling/i.test(text), 'no real persons or brands');
const frisian = [...new Set(lines.filter((l) => looksFrisian(l.text) && !dutchFor(l.text)).map((l) => l.text))];
ok(frisian.length === 0, 'every Frisian-looking line has a Dutch subtitle (game/js/subtitles.js FY)', frisian.slice(0, 3).join(' | '));
ok(lines.some((l) => l.text === '"Tige tank! – J."' && l.scene.id === 'M06.3'), 'the note stays exactly "Tige tank! – J."');

console.log(`${n - fails}/${n} story data checks passed (${scenes.length} scenes, ${lines.length} lines: ${recorded} recorded, ${textOnly} text only)`);
process.exit(fails ? 1 : 0);
