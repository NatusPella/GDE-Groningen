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
import { GRO } from '../game/js/subtitles.js';

const ACCENT = 'spoken in Dutch with a Groningen accent';
// Gronings dialect lines (Grunnegs): said as written, not turned into Dutch
const GRO_ACCENT = 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent';
const GRO_WORDS = /\b(mien|nait|moar|mor|goud|kiek|joe|doar|noar|hoes|ain|hail|mout|stoet|wicht|oet|veur|zain|laven|dij|wies|lopst|rieden)\b/i;
const isGronings = (t) => t in GRO || GRO_WORDS.test(t);
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
  // Rikus: the narrator and the Radio Nachtstreek night DJ, one voice for both
  [NARRATOR]: { voice: 'Schedar', who: 'Rikus, Groningse nacht-dj en verteller, jeugdvriend van Tammo, warm en droog', pool: ['droog, met een knipoog', 'warm, vertellend', 'plagend, laconiek'] },
  'Mem Terpstra': { voice: 'Gacrux', who: 'warme, stellige oude Friese moeder, spreekt Nederlands met Friese woorden', pool: ['warm, stellig', 'zacht, samenzweerderig'], accent: 'spoken in Dutch with a warm Frisian accent, the Frisian words said in Frisian (Frysk)' },
  'Jelle Terpstra': { voice: 'Fenrir', who: 'ijdele, charmante Friese ondernemer, spreekt Nederlands met Friese woorden', pool: ['charmant, opschepperig', 'zelfvoldaan, grinnikend', 'plechtig, overdreven trots'], accent: 'spoken in Dutch with a proud Frisian accent, the Frisian words said in Frisian (Frysk)' },
  Durk: { voice: 'Algieba', who: 'grote, trage Friese handlanger, spreekt Nederlands met een zwaar Fries accent', pool: ['dronken, lallend, samenzweerderig', 'traag, verward'], accent: 'spoken in Dutch with a heavy Frisian accent, slow' },
  Douwe: { voice: 'Orus', who: 'grote, trage Friese handlanger, tweelingbroer van Durk, spreekt Nederlands met een zwaar Fries accent', pool: ['traag, berustend', 'verward, sloom'], accent: 'spoken in Dutch with a heavy Frisian accent, slow' },
  'Dokter Dijkstra': { voice: 'Sadachbia', who: 'nuchtere Groningse traumaarts en helikopterpiloot', pool: ['droog, zakelijk', 'streng, stiekem geamuseerd', 'nuchter, laconiek'] },
  Femke: { voice: 'Leda', who: 'energieke Groningse festivalmaker', pool: ['gehaast, enthousiast', 'opgelucht, vrolijk', 'verontwaardigd, snel'] },
  Harm: { voice: 'Alnilam', who: 'oude Groningse wegwerker, gemoedelijk', pool: ['gemoedelijk, trots', 'samenzweerderig, droog'] },
  Geert: { voice: 'Zubenelgenubi', who: 'Groningse kroegbaas, joviaal', pool: ['joviaal, roddelend', 'droog, grinnikend'] },
  Hilly: { voice: 'Despina', who: 'Groningse vrouw op leeftijd, praat plat Gronings, nieuwsgierig', pool: ['kletserig, nieuwsgierig', 'stellig, wijzend'], accent: 'spoken in the Gronings dialect of Groningen, Netherlands' },
  'Oma Trijntje': { voice: 'Sulafat', who: 'oude Groningse oma, warm en stellig', pool: ['warm, ontroerd', 'stellig, liefdevol'] },
  'Kapitein Klaas': { voice: 'Enceladus', who: 'oude Groningse schipper, schor', pool: ['samenzweerderig, schor', 'droog, knipogend'] },
  Verkeersinformatie: { voice: 'Achird', who: 'Groningse radiopresentator van de verkeersinformatie, zakelijk', pool: ['zakelijk, voorlezend, heel licht geamuseerd', 'droog, als een nieuwslezer', 'berustend, professioneel'] },
  Navigatie: { voice: 'Kore', who: 'kalme navigatiestem in een auto', pool: ['kalm, monotoon, heel licht vermoeid', 'vriendelijk, mechanisch, droog'], accent: 'spoken in standard Dutch, calm and clear like a car navigation voice' },
  'Koe Aaltje': { voice: 'Zephyr', who: 'een sceptische, droge koe uit het Ommeland', pool: ['droog, laconiek, onder de indruk maar laat het niet merken', 'deadpan, zuchtend'] },
  'Koe Grietje': { voice: 'Autonoe', who: 'een wijze, droge koe uit het Ommeland die alles ziet', pool: ['droog, bedachtzaam', 'deadpan, licht spottend'] },
  // phone messages read aloud (sms manifest): the Sikkom newsreader and the phone's own app voice
  'Sikkom-redactie': { voice: 'Achernar', who: 'Groningse nieuwslezeres van nieuwssite Sikkom, leest een pushbericht voor', pool: ['als een nieuwslezer, droog, licht ironisch', 'zakelijk voorlezend, met een knipoog'] },
  Ubbo: { voice: 'Laomedeia', who: 'de vriendelijke stem van de telefoon-app Ubbo', pool: ['vriendelijke, gladde app-stem, kalm', 'behulpzame app-assistent, opgewekt'], accent: 'spoken in standard Dutch, clear and friendly like a phone assistant' },
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
      // a bubble a main character says (story steps): their own voice
      const as = e.cast.as && CAST[e.cast.as];
      const pe = e.cast.persona;
      job = pe ? { voice: pe.voice, who: pe.who, tag: pick(e.cast.tag, key), accent: pe.accent } : as ? { voice: as.voice, who: as.who, tag: mood(e.cast.as, e.text, key) } : { voice: pick(f ? FEMALE : MALE, key), who: isGronings(e.text) ? `${who}, spreekt Gronings dialect` : who, tag: pick(e.cast.tag, key) };
    } else {
      // "Tammo (gids)": the same voice as Tammo
      const c = CAST[sp] || CAST[sp.replace(/ \(.*\)$/, '')];
      if (!c) throw new Error(`no cast for ${sp}`);
      job = { voice: c.voice, who: c.who, tag: pick(e.cast.tag, key) || mood(sp, e.text, key) };
    }
    const dir = sp.startsWith('~') ? `bubbles/${sp === BUBBLE.f ? 'f' : 'm'}` : slug(sp);
    const accent = job.accent || (CAST[sp] && CAST[sp].accent) || (isGronings(e.text) ? GRO_ACCENT : ACCENT);
    delete job.accent;
    jobs.push({ key, speaker: sp, text: e.text, area: e.area, out: e.manifest === 'sms' || e.manifest === 'hints' ? e.manifest : 'lines', say: e.cast.speak || e.text, file: `${dir}/${slug(e.text).slice(0, 32)}_${h}.mp3`, ...job, prompt: `[${job.who}, ${job.tag}, ${accent}] ${e.cast.speak || e.text}` });
  }
}
fs.writeFileSync(path.join(REPO, 'scripts', 'tts_lines.json'), JSON.stringify(jobs, null, 1));
console.log(jobs.length, 'jobs', jobs.reduce((a, j) => a + j.text.length, 0), 'chars');
