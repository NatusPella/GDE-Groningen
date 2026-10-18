// The silent app texts (Mem's appjes e.d.) reach the player on the step they are about, once each (#93):
//   node scripts/storyapps_test.mjs
import fs from 'node:fs';
import { setStoryData, appSchedule, appsAt } from '../game/js/storytext.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const data = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
setStoryData(data);

const sched = appSchedule();
const texts = [...new Set(data.scenes.flatMap((s) => s.lines.filter((l) => l.channel === 'app-stil').map((l) => l.text)))];
const ids = new Set(STEPS.map((s) => s.id));
ok(sched.length === texts.length, 'every distinct app text is delivered exactly once', `${sched.length} vs ${texts.length}`);
ok(new Set(sched.map((a) => a.text)).size === sched.length, 'no app text is delivered twice');
for (const t of texts) ok(sched.some((a) => a.text === t), 'delivered: ' + t.slice(0, 40));
for (const a of sched) ok(ids.has(a.step) && (a.at === 'start' || a.at === 'after'), 'valid step and moment', a.step + ' ' + a.at);

// the order of Mem's countdown follows the story: acht, zeven, zes, vier
const at = (t) => { const i = sched.findIndex((a) => a.text.startsWith(t)); return i < 0 ? -1 : STEPS.findIndex((s) => s.id === sched[i].step); };
const order = ['Nog acht dagen', 'Nog zeven dagen', 'Nog zes dagen', 'Kom dinsdag naar Bourtange', 'Nog vier dagen'].map(at);
ok(order.every((v, i) => v >= 0 && (i === 0 || v >= order[i - 1])), 'Mem countdown arrives in order', order.join(','));
ok(at('Nog vier dagen') < STEPS.findIndex((s) => s.id === 'M20'), 'the Bourtange invitation arrives before the Beleg (M20)');
ok(at('Je moet naar Warffum') < STEPS.findIndex((s) => s.id === 'M09'), 'Warffum is announced before M09');
ok(at('Ik ben bij het Loket') < STEPS.findIndex((s) => s.id === 'M03'), 'the Loket text arrives before Tammo is in M03');
ok(appsAt('M21', 'start').some((a) => /rode auto/.test(a.text)), 'the train text opens M21');
console.log(`storyapps_test: ${n - fails}/${n} ok`);
process.exitCode = fails ? 1 : 0;
