// The short reaction barks audio.js plays for whoever you play (TAMMO_LINES /
// ANITA_LINES): three variants per trigger, game/audio/voicelines/<who>/
// <key>.wav, <key>_v1.wav, <key>_v2.wav. Writes scripts/tts_barks.json for
// tts_barks.py, which skips clips already logged in tts.json with the current
// model; an edited text gets a fresh recording.
//   node scripts/tts_barks_lines.mjs && python3 scripts/tts_barks.py
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DUO, styleOf } from './tts_cast.mjs';

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
    texts.forEach((text, n) => out.push({ file: `${speaker.toLowerCase()}/${key}${n ? `_v${n}` : ''}.wav`, speaker, text, tag, voice: c.voice, style: styleOf(c.who, tag, c.accent) }));
  }
}
fs.writeFileSync(path.join(REPO, 'scripts', 'tts_barks.json'), JSON.stringify(out, null, 1));
console.log(out.length, 'barks');
