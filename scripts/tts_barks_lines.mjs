// The short clips audio.js plays from fixed paths: the reaction barks for
// whoever you play (TAMMO_LINES / ANITA_LINES, three variants per trigger,
// game/audio/voicelines/<who>/<key>.wav, <key>_v1.wav, <key>_v2.wav), plus
// the street phrases, police barks, news feed and G-Music jingles below.
// Writes scripts/tts_barks.json (files relative to game/audio) for
// tts_barks.py, which skips clips already logged in tts.json with the current
// model; an edited text gets a fresh recording.
//   node scripts/tts_barks_lines.mjs && python3 scripts/tts_barks.py
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DUO, CLIP_CAST, styleOf } from './tts_cast.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// key: [delivery tag, variant 0, 1, 2]
const BARKS = {
  Tammo: {
    wapen_opgepakt: ['droog, tevreden', 'Oh, dat werkt wel.', 'Mooi, die kan ik gebruiken.', 'Precies wat ik zocht.'],
    geld_opgepakt: ['droog, stiekem blij', 'Kassa. Mooi zo.', 'Ach, dat komt altijd van pas.', 'Weer een paar euro rijker.'],
    auto_gejat: ['laconiek, haastig', 'Hij staat los. Kom op.', 'Nou, die lenen we effe.', 'Instappen dan maar.'],
    missie_gestart: ['berustend, droog', 'Nou, daar gaan we weer.', 'Hup, aan de slag dan.', 'Alweer een klusje.'],
    missie_gelukt: ['droog, stiekem trots', 'Klaar is Kees.', 'Nou, dat is dat dan.', 'Kon minder.'],
    missie_mislukt: ['zuchtend, laconiek', 'Ach, goed. Opnieuw dan.', 'Nou, dat ging even niet.', 'Dat is niks geworden.'],
    opgepakt: ['berustend, mopperend', 'Nee toch. Niet weer de bak in.', 'Daar hebben we hem weer.', 'Kon beter, denk ik.'],
    water_panic: ['in paniek, proestend, feller dan normaal', 'Water! Water!', 'Nat. Weer nat.', 'Ik zwem echt niet graag, hè!'],
  },
  Anita: {
    wapen_opgepakt: ['zelfverzekerd, tevreden', 'Precies wat ik nodig had.', 'Handig, dat kan ik gebruiken.', 'Die ziet er gevaarlijk uit. Mooi!'],
    geld_opgepakt: ['enthousiast, snel', 'Mooi! Komt goed van pas!', 'Mooi! Weer wat extra!', 'Kassa, zullen we maar zeggen.'],
    missie_gestart: ['enthousiast, plagend', 'Here we go again.', 'En daar gaan we dan weer.', 'Alweer iets te doen.'],
    missie_gelukt: ['triomfantelijk, lacherig', 'Zo moet het!', 'Nou, dat is geregeld!', 'Die is weer af!'],
    missie_mislukt: ['geërgerd, ad rem', 'Had beter gekund.', 'Dat liep niet zoals gepland.', 'Nou, dat werd niks.'],
    opgepakt: ['ongelovig, verwijtend', 'Serieus, Tammo.', 'Alweer, Tammo!', 'Dit wordt een gewoonte!'],
    kus: ['warm, plagend, zacht', 'Doe voorzichtig, ja!', 'Let een beetje op jezelf.', 'Doe rustig aan, mien jong!'],
  },
};
const out = [];
for (const [speaker, keys] of Object.entries(BARKS)) {
  const c = DUO[speaker];
  for (const [key, [tag, ...texts]] of Object.entries(keys)) {
    texts.forEach((text, n) => out.push({ file: `voicelines/${speaker.toLowerCase()}/${key}${n ? `_v${n}` : ''}.wav`, speaker, text, tag, voice: c.voice, style: styleOf(c.who, tag, c.accent) }));
  }
}

// The other fixed-path clips in audio.js, every variant in its own voice
// (CLIP_CAST): the Gronings street phrases (pedestrians.js GRONINGS_PHRASES,
// by index), the police barks, the Kiekdoar feed (sikkomfeed.js, weather.js)
// and the G-Music jingles. `text` is what the game shows (if anything), `say`
// what is spoken.
const js = (f) => fs.readFileSync(path.join(REPO, 'game', 'js', f), 'utf8');
const arr = (src, name) => {
  const at = src.indexOf(`const ${name} = [`);
  if (at < 0) throw new Error(`${name} not found`);
  return eval(src.slice(src.indexOf('[', at), src.indexOf('];', at) + 1));
};
const clip = (kind, file, text, tag, say = text) => CLIP_CAST[kind].forEach((c, n) => out.push({
  file: kind === 'jingle' ? file : `${file}_v${n}.wav`, speaker: c.speaker, text, say, tag, voice: c.voice, style: styleOf(c.who, tag, c.accent),
}));
arr(js('pedestrians.js'), 'GRONINGS_PHRASES').forEach((t, i) => clip('npc', `npc/phrase_${i}`, t, 'vriendelijk, terloops, in het voorbijgaan'));
const POLICE = {
  stop_politie: ['Stop! Politie!', 'luid roepend, streng'],
  zet_kant: ['Zet de auto aan de kant!', 'bevelend, door een megafoon'],
  verdachte_voertuig: ['Verdacht voertuig, alle eenheden.', 'zakelijk, over de portofoon'],
  handen_omhoog: ['Sta stil! Handen omhoog!', 'schreeuwend, bevelend'],
  achtervolging: ['Achtervolging gaande, richting centrum.', 'gehaast, over de portofoon'],
  aangehouden: ['Verdachte aangehouden.', 'zakelijk, opgelucht, over de portofoon'],
};
for (const [key, [t, tag]] of Object.entries(POLICE)) clip('police', `police/${key}`, t, tag);
const spoken = (t) => {
  const s = t.replace(/^KIEKDOAR( MELDT)?:\s*/, '');
  return s[0].toUpperCase() + s.slice(1) + (/[.!?"]$/.test(s) ? '' : '.');
};
const NEWS_TAG = 'als een regionale nieuwslezer, droog, licht ironisch';
const feed = js('sikkomfeed.js');
for (const [name, key] of [['WANTED_UP', 'wanted_up'], ['WRECKED_UP', 'wrecked_up'], ['COPKILL_UP', 'copkill_up'], ['PEDKILL_UP', 'pedkill_up'], ['KILL_UP', 'kill_up'], ['MISSION_UP', 'mission_up']]) {
  const list = arr(feed, name);
  list.forEach((t, i) => clip('news', `nieuws/${key}${list.length > 1 ? `_${i + 1}` : ''}`, t, NEWS_TAG, spoken(t)));
}
for (const m of js('weather.js').matchAll(/text: '(KIEKDOAR: [^']+)'[^\n]*\n\s*playSikkomLine\('(\w+)'\)/g)) clip('news', `nieuws/${m[2]}`, m[1], NEWS_TAG, spoken(m[1]));
const JINGLES = {
  station_id: ['Dit is G-Music, de soundtrack van Grunn.', 'vlot en trots, als een radiojingle'],
  nummerovergang: ['Nog meer bangers zo. Blijf luisteren.', 'opgewekt, snel, als een radiojingle'],
  rij_knipoog: ['Rustig aan met die snelheid. Grapje, gas erop!', 'met een knipoog, eerst rustig dan uitgelaten, als een radiojingle'],
  hoge_wanted: ['Het is weer druk in Grunn vanavond, hoor ik.', 'droog, samenzweerderig, als een radiojingle'],
};
for (const [key, [t, tag]] of Object.entries(JINGLES)) clip('jingle', `gmusic/jingles/${key}.wav`, t, tag);

fs.writeFileSync(path.join(REPO, 'scripts', 'tts_barks.json'), JSON.stringify(out, null, 1));
console.log(out.length, 'barks');
