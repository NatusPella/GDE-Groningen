// Writes scripts/tts_lines.json: one TTS job per recording that
// voice_coverage.mjs reports missing from the lines manifest (bubbles,
// subtitles, the story lines not in story/manifest.json) and per spoken line of the new
// story (game/storydata/script.json) that is still textOnly, plus every
// recording whose tts.json entry is missing or has a model outside TTS_MODELS
// (re-recorded in place, story/ included). Every job gets a Gemini voice and a
// speech_metadata style (character, delivery tag, accent). Then:
//   node scripts/tts_lines_list.mjs && python3 scripts/tts_lines.py [max_jobs]
// New jobs for the story/jobs manifests are recorded into the lines manifest
// (missionstory.js falls back to it); the jobs manifest has its own pipeline.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { collect, isVoiced, missingKeys, manifest, BUBBLE, NARRATOR, REPO } from './voicelines_collect.mjs';
import { ACCENT, GRO_ACCENT, DUO, TTS_MODELS, TTS_LANG, styleOf } from './tts_cast.mjs';
import { GRO } from '../game/js/subtitles.js';

const GRO_WORDS = /\b(mien|nait|moar|mor|goud|kiek|joe|doar|noar|hoes|ain|hail|mout|stoet|wicht|oet|veur|zain|laven|dij|wies|lopst|rieden)\b/i;
const isGronings = (t) => t in GRO || GRO_WORDS.test(t);
// Fixed cast; Tammo and Tessa match the story/job recordings.
const CAST = {
  Tammo: { ...DUO.Tammo, pool: ['droog, laconiek', 'sarcastisch, zuchtend', 'deadpan, licht verbaasd', 'mompelend, stiekem trots', 'droog, met een stille grijns'] },
  Anita: { ...DUO.Anita, pool: ['lacherig, ad rem', 'plagend, zelfverzekerd', 'enthousiast, snel', 'ongeduldig, bazig', 'warm, grinnikend'] },
  Sjabbe: { voice: 'Rasalgethi', who: 'sluwe Groningse heler, hees en zakelijk', pool: ['zakelijk, onder de indruk', 'afdingend, droog', 'samenzweerderig, zacht'] },
  'Duivenmelker Bert': { voice: 'Iapetus', who: 'oude Groningse duivenmelker, zacht en wijs', pool: ['geheimzinnig, rustig', 'grinnikend, wijs', 'plechtig, fluisterend'] },
  'Bommen Berend': { voice: 'Charon', who: 'norse oude Groningse man met een bakkie', pool: ['nors, stiekem trots', 'mopperend, verbaasd'] },
  // the definitive script: Berend Bos plays Bommen Berend in the Ontzet re-enactment
  'Berend Bos': { voice: 'Charon', who: 'Berend Bos, chagrijnige oude Stadjer uit de Schildersbuurt die al veertig jaar Bommen Berend speelt, nors en droog', pool: ['nors, stiekem trots', 'mopperend, droog', 'plechtig, nors'] },
  Torenwachter: { voice: 'Iapetus', who: 'de torenwachter, een hele oude man boven in de Martinitoren, onverstoorbaar en droog, meldt alleen', pool: ['oud, droog, onverstoorbaar, door de telefoon', 'traag, zakelijk, door de telefoon'] },
  Terrasgast: { voice: 'Erinome', who: 'natte, vrolijke Groningse terrasgast op de Grote Markt', pool: ['juichend, lacherig'] },
  Snackbarhouder: { voice: 'Rasalgethi', who: 'oude Groningse snackbarhouder uit de Oosterpoort', pool: ['wanhopig, ontdaan', 'opgetogen, juichend'] },
  Toerist: { voice: 'Pulcherrima', who: 'nieuwsgierige toeriste uit de Randstad op een rondvaartboot', pool: ['nieuwsgierig, vragend'], accent: 'spoken in standard Dutch with an Amsterdam accent' },
  Kind: { voice: 'Leda', who: 'een klein Gronings kind in het publiek op de Grote Markt, roept luid en dapper', pool: ['luid, dapper roepend'] },
  Jelmer: { voice: 'Puck', who: 'jonge Groningse streamer, hyper', pool: ['verbaasd, hardop voorlezend', 'opgewonden, snel'] },
  Sjoerd: { voice: 'Umbriel', who: 'Groningse wedstrijdleider, droog', pool: ['droog, licht verbaasd', 'schamper, mopperend'] },
  Henk: { voice: 'Sadaltager', who: 'gemoedelijke Groningse garagehouder', pool: ['gemoedelijk, rustig'] },
  // Rikus: the narrator and the Radio Nachtstreek night DJ, one voice for both
  [NARRATOR]: { voice: 'Schedar', who: 'Rikus, Groningse nacht-dj en verteller, jeugdvriend van Tammo, warm en droog', pool: ['droog, met een knipoog', 'warm, vertellend', 'plagend, laconiek'] },
  'Mem Terpstra': { voice: 'Gacrux', who: 'warme, stellige oude Friese moeder, spreekt Nederlands met Friese woorden', pool: ['warm, stellig', 'zacht, samenzweerderig'], accent: 'spoken in Dutch with a warm Frisian accent, the Frisian words said in Frisian (Frysk)' },
  'Jelle Terpstra': { voice: 'Fenrir', who: 'ijdele, charmante Friese ondernemer, spreekt Nederlands met Friese woorden', pool: ['charmant, opschepperig', 'zelfvoldaan, grinnikend', 'plechtig, overdreven trots'], accent: 'spoken in Dutch with a proud Frisian accent, the Frisian words said in Frisian (Frysk)' },
  Durk: { voice: 'Algieba', who: 'grote, trage Friese handlanger, spreekt Nederlands met een zwaar Fries accent', pool: ['dronken, lallend, samenzweerderig', 'traag, verward'], accent: 'spoken in Dutch with a heavy Frisian accent, slow' },
  Douwe: { voice: 'Algenib', who: 'grote, trage Friese handlanger, tweelingbroer van Durk, spreekt Nederlands met een zwaar Fries accent', pool: ['traag, berustend', 'verward, sloom'], accent: 'spoken in Dutch with a heavy Frisian accent, slow' },
  'Dokter Dijkstra': { voice: 'Sadachbia', who: 'nuchtere Groningse traumaarts en helikopterpiloot', pool: ['droog, zakelijk', 'streng, stiekem geamuseerd', 'nuchter, laconiek'] },
  Femke: { voice: 'Leda', who: 'energieke Groningse festivalmaker', pool: ['gehaast, enthousiast', 'opgelucht, vrolijk', 'verontwaardigd, snel'] },
  Harm: { voice: 'Alnilam', who: 'oude Groningse wegwerker, gemoedelijk', pool: ['gemoedelijk, trots', 'samenzweerderig, droog'] },
  Geert: { voice: 'Zubenelgenubi', who: 'Groningse kroegbaas, joviaal', pool: ['joviaal, roddelend', 'droog, grinnikend'] },
  Hilly: { voice: 'Despina', who: 'Groningse vrouw op leeftijd, praat plat Gronings, nieuwsgierig', pool: ['kletserig, nieuwsgierig', 'stellig, wijzend'], accent: 'spoken in the Gronings dialect of Groningen, Netherlands' },
  'Oma Trijntje': { voice: 'Sulafat', who: 'oude Groningse oma, warm en stellig', pool: ['warm, ontroerd', 'stellig, liefdevol'] },
  'Kapitein Klaas': { voice: 'Enceladus', who: 'oude Groningse schipper, schor', pool: ['samenzweerderig, schor', 'droog, knipogend'] },
  // the rondvaart chase (rondvaartchase.js SHOUT); the megaphone sound is added in the game
  'Schipper Wiebe': { voice: 'Alnilam', who: 'woedende Groningse rondvaartschipper die zijn boot achterna zit, roept door een megafoon', pool: ['woedend, schreeuwend', 'buiten adem, verontwaardigd roepend'], accent: GRO_ACCENT },
  Verkeersinformatie: { voice: 'Achird', who: 'Groningse radiopresentator van de verkeersinformatie, zakelijk', pool: ['zakelijk, voorlezend, heel licht geamuseerd', 'droog, als een nieuwslezer', 'berustend, professioneel'] },
  Navigatie: { voice: 'Kore', who: 'kalme navigatiestem in een auto', pool: ['kalm, monotoon, heel licht vermoeid', 'vriendelijk, mechanisch, droog'], accent: 'spoken in Gronings dialect (Grunnegs) exactly as written, calm and clear like a car navigation voice' },
  'Koe Aaltje': { voice: 'Zephyr', who: 'een sceptische, droge koe uit het Ommeland', pool: ['droog, laconiek, onder de indruk maar laat het niet merken', 'deadpan, zuchtend'] },
  'Koe Grietje': { voice: 'Autonoe', who: 'een wijze, droge koe uit het Ommeland die alles ziet', pool: ['droog, bedachtzaam', 'deadpan, licht spottend'] },
  // the Ommeland extras (ommelandlines.js): the ends of the world, the villages, Ome Jan
  'Verdwaalde Fries': { voice: 'Puck', who: 'verdwaalde jonge Friese fierljepper met een polsstok, spreekt Nederlands met Friese woorden', pool: ['verward, zoekend'], accent: 'spoken in Dutch with a Frisian accent, the Frisian words said in Frisian (Frysk)' },
  'Boer Hindrik': { voice: 'Enceladus', who: 'oude Groningse boer bij een hek, praat plat Gronings', pool: ['stellig, samenzweerderig'], accent: GRO_ACCENT },
  'Oma Geessien': { voice: 'Vindemiatrix', who: 'oude Groningse vrouw op een bankje, praat Gronings', pool: ['tevreden, warm'], accent: GRO_ACCENT },
  'Verdwaalde toeriste': { voice: 'Pulcherrima', who: 'verdwaalde toeriste uit de Randstad met een rolkoffer', pool: ['verbaasd, een tikje bekakt'], accent: 'spoken in standard Dutch with an Amsterdam accent' },
  'Trainer Bouke': { voice: 'Achird', who: 'enthousiaste tennistrainer uit Haren', pool: ['enthousiast, sportief'] },
  'Kroegbaas Roelf': { voice: 'Zubenelgenubi', who: 'joviale Groningse kroegbaas in Haren, praat Gronings', pool: ['joviaal'], accent: GRO_ACCENT },
  'Schipper Lammert': { voice: 'Iapetus', who: 'oude Groningse schipper van een rondvaartbootje', pool: ['droog, vertellend'] },
  'Kroegbaas Tjakko': { voice: 'Umbriel', who: 'Groningse kroegbaas en quizmaster in Sauwerd, praat Gronings', pool: ['joviaal, plagend'], accent: GRO_ACCENT },
  'Molenaar Fenna': { voice: 'Leda', who: 'Groningse molenaar in Winsum, praat een beetje Gronings', pool: ['trots, warm'], accent: GRO_ACCENT },
  'Koster Egbert': { voice: 'Sadachbia', who: 'oude Groningse koster in Bedum, praat Gronings', pool: ['droog, trots'], accent: GRO_ACCENT },
  'Boerin Geesje': { voice: 'Aoede', who: 'Groningse boerin met een boerderijwinkel, praat Gronings', pool: ['hartelijk, stellig'], accent: GRO_ACCENT },
  'Koster Menno': { voice: 'Rasalgethi', who: 'oude Groningse koster in Loppersum, praat plat Gronings', pool: ['nors maar goedmoedig'], accent: GRO_ACCENT },
  'Kroegbaas Wilma': { voice: 'Erinome', who: 'Groningse kroegbazin in Loppersum, praat Gronings', pool: ['hartelijk, kletserig'], accent: GRO_ACCENT },
  'Strandtent Tineke': { voice: 'Despina', who: 'vrolijke Groningse strandtenthoudster aan het Zuidlaardermeer, praat Gronings', pool: ['zonnig, gezellig'], accent: GRO_ACCENT },
  'Ome Jan': { voice: 'Charon', who: 'oude Groningse melkveeboer bij Ten Boer, praat plat Gronings', pool: ['nuchter, gemoedelijk'], accent: GRO_ACCENT },
  'Koe Geertje': { voice: 'Kore', who: 'een droge, eigenwijze prijskoe uit het Ommeland', pool: ['deadpan, droog'] },
  // the helicopter dealer from Eelde in the demo-flight story step (storyarc.js s-proefvlucht)
  // the carbid farmers in the story step s-carbid (same voices as their carbid.js bubbles)
  'Boer Roelf': { voice: 'Charon', who: 'oude Groningse boer op zijn erf, praat plat Gronings, nuchter en droog', pool: ['nuchter, droog', 'nors, stiekem onder de indruk'], accent: GRO_ACCENT },
  Hilje: { voice: 'Despina', who: 'Groningse boerin op leeftijd, praat plat Gronings, ad rem', pool: ['ad rem, verbaasd', 'nuchter, plagend'], accent: GRO_ACCENT },
  'Rotor Roelf': { voice: 'Achird', who: 'joviale Groningse helikopterverkoper van vliegveld Eelde, verkoperig, praat een beetje Gronings', pool: ['joviaal, verkoperig', 'gemoedelijk, waarschuwend'] },
  // phone messages read aloud (sms manifest): the Kiekdoar newsreader and the phone's own app voice
  'Kiekdoar-redactie': { voice: 'Achernar', who: 'Groningse nieuwslezeres van nieuwssite Kiekdoar, leest een pushbericht voor', pool: ['als een nieuwslezer, droog, licht ironisch', 'zakelijk voorlezend, met een knipoog'] },
  // Geesje presents Radio Proat, the talk programmes on G-Music (radio.js)
  Geesje: { voice: 'Pulcherrima', who: 'Groningse radiopresentatrice van praatzender Radio Proat, warm en droog', pool: ['warm, ontspannen, als radiopresentatrice', 'droog, met een knipoog, als radiopresentatrice'] },
  Ubbo: { voice: 'Laomedeia', who: 'de vriendelijke stem van de telefoon-app Ubbo', pool: ['vriendelijke, gladde app-stem, kalm', 'behulpzame app-assistent, opgewekt'], accent: 'spoken in Gronings dialect (Grunnegs) exactly as written, clear and friendly like a phone assistant' },
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

function makeJob(e, sp, out, file) {
  const key = `${sp}|${e.text}`;
  let job;
  if (sp === BUBBLE.m || sp === BUBBLE.f) {
    const f = sp === BUBBLE.f;
    const who = e.cast.who ? WHO[e.cast.who][f ? 1 : 0] : f ? WHO.vrouw : WHO.man;
    // a bubble a main character says (story steps): their own voice
    const as = e.cast.as && CAST[e.cast.as];
    const pe = e.cast.persona;
    job = pe ? { voice: pe.voice, who: pe.who, tag: pick(e.cast.tag, key), accent: pe.accent } : as ? { voice: as.voice, who: as.who, tag: mood(e.cast.as, e.text, key), accent: as.accent } : { voice: pick(f ? FEMALE : MALE, key), who: isGronings(e.text) ? `${who}, spreekt Gronings dialect` : who, tag: pick(e.cast.tag, key) };
  } else {
    // "Tammo (gids)": the same voice as Tammo
    const c = CAST[sp] || CAST[sp.replace(/ \(.*\)$/, '')];
    if (!c) throw new Error(`no cast for ${sp}`);
    job = { voice: c.voice, who: c.who, tag: pick(e.cast.tag, key) || mood(sp, e.text, key), accent: c.accent };
  }
  const dir = sp.startsWith('~') ? `bubbles/${sp === BUBBLE.f ? 'f' : 'm'}` : slug(sp);
  const accent = job.accent || (isGronings(e.text) ? GRO_ACCENT : ACCENT);
  delete job.accent;
  // Frisian characters and foreign tourists keep their own language (lang 'own'); everyone else speaks Gronings
  const lang = /Gronings/.test(accent) ? TTS_LANG : 'own';
  return { key, speaker: sp, text: e.text, area: e.area, out, lang, say: e.cast.speak || e.text, file: file || `${dir}/${slug(e.text).slice(0, 32)}_${hash(key).slice(0, 8)}.mp3`, ...job, style: styleOf(job.who, job.tag, accent) };
}

// how each recording in a voicelines folder was made (gemini_tts.py writes it)
const logs = {};
const ttsLog = (name) => {
  const p = path.join(REPO, 'game', 'audio', 'voicelines', name, 'tts.json');
  return (logs[name] ??= fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {});
};

// the manifest that plays a speaker's recording of this line, its entry and log
function recording(e, sp) {
  const k = `${sp}|${e.text}`;
  for (const m of [e.manifest, e.fallback]) if (m && manifest(m)[k]) return { out: m, entry: manifest(m)[k], log: ttsLog(m)[k] };
  return null;
}

const jobs = [];
const seen = new Set();
const push = (j) => { if (!seen.has(j.out + '|' + j.key)) { seen.add(j.out + '|' + j.key); jobs.push(j); } };

// --- the new story (game/storydata/script.json): a line without a recording is `textOnly` and is
// shown as text only (#326). voice_coverage checks these apart from collect(); a recording goes
// into the lines manifest and the next build_story_data run clears `textOnly` (#462). A line is
// skipped, and counted, when its speaker has no voice yet or its Gronings spoken text is missing:
// recording it in Dutch instead would be worse than waiting.
const scriptFile = path.join(REPO, 'game', 'storydata', 'script.json');
const groFile = path.join(REPO, 'scripts', 'gronings_spoken.json');
const waiting = { gronings: [], cast: [] };
if (fs.existsSync(scriptFile)) {
  const spoken = fs.existsSync(groFile) ? JSON.parse(fs.readFileSync(groFile, 'utf8')) : {};
  for (const sc of JSON.parse(fs.readFileSync(scriptFile, 'utf8')).scenes) {
    for (const l of sc.lines) {
      if (!l.textOnly || !l.key) continue; // the silent app messages have no key
      const sp = l.voice || l.speaker;
      const c = CAST[sp];
      const accent = c?.accent || (isGronings(l.text) ? GRO_ACCENT : ACCENT);
      const gronings = /Gronings/.test(accent);
      if (!c) { waiting.cast.push(`${sp} (${l.text})`); continue; }
      if (gronings && !(l.text in spoken)) { waiting.gronings.push(`${sp}: ${l.text}`); continue; }
      const key = `${sp}|${l.text}`;
      const tag = mood(sp, l.text, key);
      push({
        key, speaker: sp, text: l.text, area: sc.id, out: 'lines', lang: gronings ? TTS_LANG : 'own',
        voice: c.voice, who: c.who, tag, style: styleOf(c.who, tag, accent),
        file: `${slug(sp)}/${slug(l.text).slice(0, 32)}_${hash(key).slice(0, 8)}.mp3`,
      });
    }
  }
}
for (const e of collect()) {
  if (e.manifest === 'npc') continue;
  if (!isVoiced(e)) for (const sp of missingKeys(e)) push(makeJob(e, sp, e.manifest === 'sms' || e.manifest === 'hints' ? e.manifest : 'lines'));
  for (const sp of e.speakers) {
    const r = recording(e, sp);
    if (r && r.out !== 'jobs') {
      const j = makeJob(e, sp, r.out, r.entry.src);
      if (!TTS_MODELS.includes(r.log?.model) || (j.lang === TTS_LANG && r.log?.lang !== TTS_LANG)) push(j);
    }
  }
}
fs.writeFileSync(path.join(REPO, 'scripts', 'tts_lines.json'), JSON.stringify(jobs, null, 1));
const redo = jobs.filter((j) => manifest(j.out)[j.key]).length;
console.log(jobs.length, 'jobs', `(${redo} re-recordings)`, jobs.reduce((a, j) => a + j.text.length, 0), 'chars');
// what cannot be recorded yet, and why (docs/verhaal/nieuw/07-TTS-RAMING.md §5)
if (waiting.cast.length) {
  const who = [...new Set(waiting.cast.map((w) => w.replace(/ \(.*/, '')))];
  console.log(`${waiting.cast.length} verhaalregels wachten op een stemkeuze (CAST):`, who.join(', '));
}
if (waiting.gronings.length) console.log(`${waiting.gronings.length} verhaalregels wachten op een Groningse spreektekst (scripts/gronings_spoken.json)`);
