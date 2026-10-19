import { playJobVoice } from './audio.js';
import { openBank } from './voicebank.js';

// Voiced bijbaantje lines. Recordings live in audio/voicelines/jobs and are
// keyed "<speaker>|<text>" like the story dialogue, so an edited line goes
// silent instead of playing the wrong recording. `tag` is only the delivery
// note the recording was made with.

const bank = openBank('jobs');

export function jobVoiceFor(speaker, text) {
  return bank.lookup(speaker, text);
}

// Per job: greet (a shift after the first), done (a finished round), fail,
// level (promotion). Speakers are the job's boss.
const JOB_LINES = {
  bezorger: {
    greet: [{ t: 'Daar ben je weer! Thermobox erop, trappen maar.', tag: 'cheerful, fast' }],
    done: [
      { t: 'Warm afgeleverd! Zo mag ik het zien.', tag: 'delighted' },
      { t: 'Weer een tevreden klant. En een fooi, als het goed is.', tag: 'amused, playful' },
    ],
    fail: [{ t: 'Lauw eten, boze klant. Morgen beter, hè.', tag: 'disappointed sigh' }],
    level: [{ t: 'Jij bent mijn snelste fietser. Zeg het niet tegen de anderen.', tag: 'conspiratorial whisper, proud' }],
  },
  taxi: {
    greet: [{ t: 'Centrale hier. Je taxi staat weer klaar. Rustig aan vandaag.', tag: 'bored radio dispatcher' }],
    done: [
      { t: 'Centrale: klant heel afgeleverd. Keurig.', tag: 'dry, approving' },
      { t: 'Centrale hier. Die klant gaf vijf sterren. Wat heb je gedaan?', tag: 'suspicious, surprised' },
    ],
    fail: [{ t: 'Centrale hier. Die klant belt net. Hij is niet blij.', tag: 'annoyed, weary' }],
    level: [{ t: 'Centrale: jij krijgt voortaan de goede ritten.', tag: 'grudging respect' }],
  },
  bus: {
    greet: [{ t: 'Lijn drie wacht op je. Op tijd vertrekken, niet te vroeg.', tag: 'pedantic, strict' }],
    done: [
      { t: 'Halte gehaald, op de minuut. Prachtig.', tag: 'moved, satisfied' },
      { t: 'Niemand koffie gemorst? Dan ben je beter dan de vorige.', tag: 'dry, amused' },
    ],
    fail: [{ t: 'Dit komt in het rapport. Met een rode pen.', tag: 'cold anger' }],
    level: [{ t: 'Zo stipt heb ik nog nooit iemand zien rijden. Ik krijg er tranen van.', tag: 'emotional, voice cracking' }],
  },
  rondvaart: {
    greet: [{ t: 'Ah, mijn gids. Mijn rug doet nog steeds pijn, dus jij vaart.', tag: 'groaning, weary' }],
    done: [
      { t: 'Mooi verteld. Ze hingen aan je lippen.', tag: 'warm, proud' },
      { t: 'Die toeristen gaan dit thuis nog jaren vertellen.', tag: 'chuckling' },
    ],
    fail: [{ t: 'Au. Nee, niet mijn rug. Mijn boot! Wat heb je gedaan?', tag: 'pained, then shocked' }],
    level: [{ t: 'Jij kent het water beter dan ik. En ik vaar hier al veertig jaar.', tag: 'impressed, nostalgic' }],
  },
  fietsdepot: {
    greet: [{ t: 'Moi. Het station staat weer vol fietsen. Aan de slag.', tag: 'stern, businesslike' }],
    done: [
      { t: 'Weer een fiets in het busje. Het rek huilt van geluk.', tag: 'deadpan' },
      { t: 'Netjes. Die student vindt hem nooit meer terug.', tag: 'smug, satisfied' },
    ],
    fail: [{ t: 'Zo gaat dat niet. Kom maar terug als je het wel kan.', tag: 'strict, disapproving' }],
    level: [{ t: 'Jij bent een natuurtalent. Je moet bij de handhaving.', tag: 'impressed, almost smiling' }],
  },
  verhuizing: {
    greet: [{ t: 'Nog meer studenten, nog meer dozen. Sjouwen maar!', tag: 'harried, jovial' }],
    done: [
      { t: 'Alles heel aangekomen. Zelfs Plant Henk.', tag: 'relieved, laughing' },
      { t: 'Weer een student blij. Nou ja, blij. Hij heeft een kamer.', tag: 'sarcastic' },
    ],
    fail: [{ t: 'Dat was de laatste keer dat ik je de breekbare doos gaf.', tag: 'exasperated' }],
    level: [{ t: 'Jij sjouwt als een beer. Een voorzichtige beer.', tag: 'hearty laugh' }],
  },
};

// Tammo and Tessa on the job, whichever the player is.
const DUO_JOB_LINES = {
  Tammo: {
    start: [{ t: 'Werken. Voor geld. Wat een concept.', tag: 'dry, deadpan' }],
    end: [{ t: 'Genoeg gewerkt voor een week.', tag: 'tired, deadpan' }],
  },
  Anita: {
    start: [{ t: 'Bijbaantje! Eindelijk iets nuttigs.', tag: 'enthusiastic, teasing' }],
    end: [{ t: 'Kijk ons nou, harde werkers.', tag: 'proud, laughing' }],
  },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Plays one of the job's `kind` lines (spoken lines never overlap; returns
// whether it played). chance < 1 keeps frequent moments from getting stale.
export function sayJobLine(job, kind, chance = 1) {
  const set = JOB_LINES[job.id];
  if (!set || !set[kind] || Math.random() > chance) return false;
  const v = jobVoiceFor(job.boss, pick(set[kind]).t);
  return v ? playJobVoice(v.src) : false;
}

export function sayDuoJobLine(character, kind) {
  const who = character === 'anita' ? 'Anita' : 'Tammo';
  const set = DUO_JOB_LINES[who][kind];
  const v = set && jobVoiceFor(who, pick(set).t);
  return v ? playJobVoice(v.src) : false;
}
