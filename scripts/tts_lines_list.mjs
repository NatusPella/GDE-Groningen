// Writes scripts/tts_lines.json: one TTS job per recording that
// voice_coverage.mjs reports missing from the lines manifest (bubbles,
// subtitles, the story lines not in story/manifest.json). Every job gets a
// Gemini voice and a local character + delivery tag. Then:
//   node scripts/tts_lines_list.mjs && python3 scripts/tts_lines.py [max_jobs]
// Jobs for the story/jobs manifests are recorded into the lines manifest too
// (their own pipelines stay untouched); missionstory.js falls back to it.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { collect, isVoiced, missingKeys, BUBBLE, NARRATOR, REPO } from './voicelines_collect.mjs';

const ACCENT = 'spoken in Dutch with a Groningen accent';
// Fixed cast; Tammo and Anita match the story/job recordings.
const CAST = {
  Tammo: { voice: 'Algenib', who: 'Stadjer, droog en sarcastisch', pool: ['droog, laconiek', 'sarcastisch, zuchtend', 'deadpan, licht verbaasd', 'mompelend, stiekem trots', 'droog, met een stille grijns'] },
  Anita: { voice: 'Callirrhoe', who: 'Groningse vrouw, lacherig en ad rem', pool: ['lacherig, ad rem', 'plagend, zelfverzekerd', 'enthousiast, snel', 'ongeduldig, bazig', 'warm, grinnikend'] },
  Sjabbe: { voice: 'Rasalgethi', who: 'sluwe Groningse heler, hees en zakelijk', pool: ['zakelijk, onder de indruk', 'afdingend, droog', 'samenzweerderig, zacht'] },
  'Duivenmelker Bert': { voice: 'Iapetus', who: 'oude Groningse duivenmelker, zacht en wijs', pool: ['geheimzinnig, rustig', 'grinnikend, wijs', 'plechtig, fluisterend'] },
  'Bommen Berend': { voice: 'Charon', who: 'norse oude Groningse man met een bakkie', pool: ['nors, stiekem trots', 'mopperend, verbaasd'] },
  Jelmer: { voice: 'Puck', who: 'jonge Groningse streamer, hyper', pool: ['verbaasd, hardop voorlezend', 'opgewonden, snel'] },
  Sjoerd: { voice: 'Umbriel', who: 'Groningse wedstrijdleider, droog', pool: ['droog, licht verbaasd', 'schamper, mopperend'] },
  Henk: { voice: 'Sadaltager', who: 'gemoedelijke Groningse garagehouder', pool: ['gemoedelijk, rustig'] },
  [NARRATOR]: { voice: 'Schedar', who: 'Groningse verteller, droog en warm', pool: ['droog, met een knipoog', 'warm, vertellend', 'plagend, laconiek'] },
};
const MALE = ['Charon', 'Puck', 'Iapetus', 'Umbriel', 'Alnilam', 'Rasalgethi', 'Enceladus', 'Schedar', 'Sadaltager', 'Zubenelgenubi'];
const FEMALE = ['Aoede', 'Leda', 'Autonoe', 'Despina', 'Erinome', 'Laomedeia', 'Pulcherrima', 'Vindemiatrix', 'Sulafat', 'Achernar'];
const WHO = { man: 'Groningse man', vrouw: 'Groningse vrouw', agent: ['Groningse agent', 'Groningse agente'], marktkoopman: ['Groningse marktkoopman', 'Groningse marktkoopvrouw'], student: ['Groningse student', 'Groningse studente'], snackbarkok: ['Groningse snackbarkok', 'Groningse snackbarkok, vrouw'] };

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const pick = (list, key) => (Array.isArray(list) ? list[parseInt(hash(key).slice(0, 8), 16) % list.length] : list);

function mood(speaker, text, key) {
  const c = CAST[speaker.replace(/ \(.*\)$/, '')];
  if (text.startsWith('…')) return 'aarzelend, zacht';
  if (/\?$/.test(text)) return speaker === 'Tammo' ? 'verbaasd, vragend' : speaker === 'Anita' ? 'ongelovig, vragend' : 'vragend, nieuwsgierig';
  if (/!$/.test(text) && speaker !== NARRATOR) return speaker === 'Tammo' ? 'opgeschrikt, feller dan normaal' : 'opgewonden, luid';
  return pick(c.pool, key);
}

const jobs = [];
for (const e of collect()) {
  if (e.manifest === 'npc' || isVoiced(e)) continue;
  for (const sp of missingKeys(e)) {
    const key = `${sp}|${e.text}`;
    const h = hash(key).slice(0, 8);
    let job;
    if (sp === BUBBLE.m || sp === BUBBLE.f) {
      const f = sp === BUBBLE.f;
      const who = e.cast.who ? WHO[e.cast.who][f ? 1 : 0] : f ? WHO.vrouw : WHO.man;
      job = { voice: pick(f ? FEMALE : MALE, key), who, tag: pick(e.cast.tag, key) };
    } else {
      const c = CAST[sp];
      if (!c) throw new Error(`no cast for ${sp}`);
      job = { voice: c.voice, who: c.who, tag: pick(e.cast.tag, key) || mood(sp, e.text, key) };
    }
    const dir = sp.startsWith('~') ? `bubbles/${sp === BUBBLE.f ? 'f' : 'm'}` : slug(sp);
    jobs.push({ key, speaker: sp, text: e.text, area: e.area, file: `${dir}/${slug(e.text).slice(0, 32)}_${h}.mp3`, ...job, prompt: `[${job.who}, ${job.tag}, ${ACCENT}] ${e.text}` });
  }
}
fs.writeFileSync(path.join(REPO, 'scripts', 'tts_lines.json'), JSON.stringify(jobs, null, 1));
console.log(jobs.length, 'jobs', jobs.reduce((a, j) => a + j.text.length, 0), 'chars');
