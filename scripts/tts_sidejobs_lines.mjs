// Collects every voiced bijbaantje line (the job intros in sidejob_*.js and
// the tables in sidejobvoice.js) with its cast into scripts/tts_sidejobs.json
// for tts_sidejobs.py. Run from the repo root: node scripts/tts_sidejobs_lines.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DUO as DUO_CAST, styleOf } from './tts_cast.mjs';
const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.join(REPO, 'game', 'js') + '/';
const JOBS = ['bezorger', 'taxi', 'bus', 'rondvaart', 'fietsdepot', 'verhuizing'];
// who speaks, which Gemini voice, and the local character tag they are voiced with
const CAST = {
  bezorger: { voice: 'Zephyr', who: 'jonge Stadjer, vrouw, opgewekt en snel' },
  taxi: { voice: 'Algenib', who: 'Groningse centralist over de portofoon, laconiek', radio: true },
  bus: { voice: 'Achird', who: 'Groningse man, stipt en een beetje pedant' },
  rondvaart: { voice: 'Algieba', who: 'oude Groningse schipper met rugpijn, bromstem' },
  fietsdepot: { voice: 'Kore', who: 'Groningse handhaafster, streng en droog' },
  verhuizing: { voice: 'Sadachbia', who: 'gehaaste Groningse verhuizer, joviaal' },
  ...DUO_CAST,
};
const INTRO_TAGS = {
  bezorger: ['cheerful, welcoming', 'businesslike, fast', 'laughing, teasing'],
  taxi: ['bored, matter-of-fact', 'instructive, calm', 'amused, gossiping'],
  bus: ['enthusiastic, a bit nervous', 'stern, pedantic', 'worried, warning'],
  rondvaart: ['groaning, apologetic', 'explaining, warm', 'grumpy, warning'],
  fietsdepot: ['stern, businesslike', 'strict, instructive', 'dry, warning'],
  verhuizing: ['harried, dramatic', 'fast, instructive', 'sighing, joking'],
};
const out = [];
for (const id of JOBS) {
  const src = fs.readFileSync(`${ROOT}sidejob_${id}.js`, 'utf8');
  const boss = src.match(/boss: '([^']+)'/)[1];
  const i = src.indexOf('intro: [');
  const intro = eval(src.slice(i + 7, src.indexOf('],', i) + 1));
  intro.forEach((text, n) => out.push({ file: `${id}/intro_${n}.mp3`, speaker: boss, cast: id, text, tag: INTRO_TAGS[id][n] }));
}
const v = fs.readFileSync(ROOT + 'sidejobvoice.js', 'utf8');
const grab = (name) => { const i = v.indexOf(`const ${name} = {`); return eval('(' + v.slice(v.indexOf('{', i), v.indexOf('\n};', i) + 2) + ')'); };
const JOB_LINES = grab('JOB_LINES'), DUO = grab('DUO_JOB_LINES');
for (const id of JOBS) {
  const src = fs.readFileSync(`${ROOT}sidejob_${id}.js`, 'utf8');
  const boss = src.match(/boss: '([^']+)'/)[1];
  for (const [kind, list] of Object.entries(JOB_LINES[id])) list.forEach((l, n) => out.push({ file: `${id}/${kind}_${n}.mp3`, speaker: boss, cast: id, text: l.t, tag: l.tag }));
}
for (const [who, kinds] of Object.entries(DUO)) for (const [kind, list] of Object.entries(kinds)) list.forEach((l, n) => out.push({ file: `duo/${who.toLowerCase()}_${kind}_${n}.mp3`, speaker: who, cast: who, text: l.t, tag: l.tag }));
for (const l of out) {
  const { accent, ...c } = CAST[l.cast];
  Object.assign(l, c, { style: styleOf(c.who, l.tag, accent) });
}
fs.writeFileSync(path.join(REPO, 'scripts', 'tts_sidejobs.json'), JSON.stringify(out, null, 1));
console.log(out.length, 'lines', out.reduce((a, l) => a + l.text.length, 0), 'chars');
