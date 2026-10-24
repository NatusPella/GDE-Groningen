// Rendert voorbeeldgeluiden naar WAV (16-bit PCM, 44,1 kHz, mono), zodat de eigenaar de procedurele geluiden kan horen.
// Een kleine Node-synth met dezelfde bouwstenen als audio.js (oscillator met exponentiële omhulling en laagdoorlaat, ruis door
// een bandfilter). Geen WebAudio: de klank lijkt sterk op het spel, maar is niet sample-voor-sample gelijk (de ruis is anders,
// de ruimtegalm en het spatiale filter van het spel ontbreken). Niveaus: elk geluid is gerenderd met de bussterkte van het spel
// (stingbus 0,8 en effectenvolume 0,75) en daarna met één gezamenlijke versterking opgetild, dus de onderlinge sterkte klopt.
//
// Gebruik: node scripts/audio/render_previews.mjs [doelmap]
// Standaard: ..\multiplayer-bugs-priority-776878\geluidspreview naast de worktrees. De map hoort niet in git.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STING_KEYS, stingNoten, stingDuur } from '../../game/js/stings.js';

const SR = 44100;
const DOEL = process.argv[2] || 'C:\\Users\\abuis\\GIT\\GDE-Groningen\\.claude\\worktrees\\multiplayer-bugs-priority-776878\\geluidspreview';

// --- synth ---------------------------------------------------------------------------------------------------------
let seed = 12345;
const ruis = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };

function biquad(type, f, q, fs = SR) {
  const w = 2 * Math.PI * Math.min(f, fs * 0.45) / fs, c = Math.cos(w), a = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = a; b1 = 0; b2 = -a; } // bandpass (constante piek 0 dB)
  const a0 = 1 + a;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * c) / a0, a2: (1 - a) / a0 };
}
const filterStap = (S, co, x) => { const y = co.b0 * x + S.z1; S.z1 = co.b1 * x - co.a1 * y + S.z2; S.z2 = co.b2 * x - co.a2 * y; return y; };

const golfvorm = { sine: (p) => Math.sin(2 * Math.PI * p), square: (p) => (p % 1 < 0.5 ? 1 : -1) * 0.8, sawtooth: (p) => (2 * (p % 1) - 1) * 0.8, triangle: (p) => 1 - 4 * Math.abs((p % 1) - 0.5) };

function maakMix(secs) { return new Float32Array(Math.ceil(secs * SR)); }

// zoals playTone: frequentie (glijdt exponentieel), aanzet tot gain in min(0,01, 20% van de duur), daarna exponentieel naar 0,0001
function tone(buf, { freq, freqEnd, type = 'sine', duration = 0.15, gain = 0.3, delay = 0, filterFreq = null }) {
  const n0 = Math.floor(delay * SR), n = Math.floor(duration * SR);
  const atk = Math.min(0.01, duration * 0.2) * SR;
  const co = filterFreq ? biquad('lowpass', filterFreq, 1) : null, S = { z1: 0, z2: 0 };
  let ph = 0;
  for (let i = 0; i < n && n0 + i < buf.length; i++) {
    const u = i / n;
    const f = freqEnd !== undefined ? freq * Math.pow(Math.max(1, freqEnd) / freq, u) : freq;
    ph += f / SR;
    let env = i < atk ? 0.0001 * Math.pow(gain / 0.0001, i / atk) : gain * Math.pow(0.0001 / gain, (i - atk) / Math.max(1, n - atk));
    let x = golfvorm[type](ph) * env;
    if (co) x = filterStap(S, co, x);
    buf[n0 + i] += x;
  }
}

// zoals playNoiseBurst: ruis door een band- of laagdoorlaatfilter, omhulling van gain naar 0,0001
function noise(buf, { duration = 0.12, freq = 1200, freqEnd, q = 1, gain = 0.5, type = 'bandpass', delay = 0 }) {
  const n0 = Math.floor(delay * SR), n = Math.floor(duration * SR);
  const S = { z1: 0, z2: 0 };
  let co = biquad(type, freq, q);
  for (let i = 0; i < n && n0 + i < buf.length; i++) {
    const u = i / n;
    if (i % 16 === 0) co = biquad(type, freqEnd !== undefined ? freq * Math.pow(Math.max(1, freqEnd) / freq, u) : freq, q);
    const env = gain * Math.pow(0.0001 / gain, u);
    buf[n0 + i] += filterStap(S, co, ruis()) * env;
  }
}

// --- de geluiden ---------------------------------------------------------------------------------------------------
const STINGBUS = 0.8 * 0.75; // stingbus x effectenvolume (de standaard van het spel)
const SFXBUS = 0.9 * 0.75;   // sfxbus x effectenvolume

const lijst = [];
const voeg = (naam, waar, wat, secs, bus, bouw) => lijst.push({ naam, waar, wat, secs, bus, bouw });

const STING_TEKST = {
  kart_countdown: ['Afteller van de kartrace: drie stijgende pieptonen en een felle go.', 'Kartbaan (eenspeler en samen), bij het eerste startlicht.'],
  kart_finish: ['Korte fanfare als je zelf over de finish gaat.', 'Kartbaan (eenspeler en samen), bij je eigen finish.'],
  winnaar: ['Vrolijk glockenspiel-motief voor de winnaar.', 'Uitslag van een wedstrijd tegen elkaar (Samen spelen), alleen voor jezelf als jij of jouw team won.'],
  verliezer: ['Komisch dalend trombone-motief (wah, wah, wah, waaah).', 'Uitslag van een wedstrijd tegen elkaar, voor iedereen die niet won.'],
  meedoen: ['Twee zachte stijgende tonen: de uitnodiging.', 'Het kaartje Meedoen? als een nieuwe uitnodiging in beeld komt (Samen spelen).'],
  speler_sluit_aan: ['Korte welkom-ping met een lange uitklinker.', 'Als een speler verbindt met de sessie (host en gasten).'],
  trein_vertrek: ['Twee heldere belletjes en een fluitje.', 'Machinist: de deuren sluiten en de trein vertrekt.'],
  halte: ['Drie zachte dalende tonen.', 'Aankomst op een halte, als machinist en als buschauffeur op een lijndienst.'],
};
for (const k of STING_KEYS) voeg(k, STING_TEKST[k][1], STING_TEKST[k][0], stingDuur(k) + 0.3, STINGBUS, (b) => { for (const t of stingNoten(k)) tone(b, t); });

// de golfgeluiden (playGolfEvent in audio.js), k = 0,7 en r = 1; zonder afstandsdemping, alsof je naast de bal staat
const K = 0.7;
const golfGeluiden = {
  golf_slag: ['Een slag met de wedge.', (b) => { tone(b, { freq: 2100, freqEnd: 1000, type: 'triangle', duration: 0.05, gain: 0.05 + K * 0.07 }); tone(b, { freq: 150, freqEnd: 70, duration: 0.09, gain: 0.07 + K * 0.1 }); noise(b, { duration: 0.05, freq: 3200, freqEnd: 1800, q: 1.4, gain: 0.04 + K * 0.06 }); }],
  golf_putt: ['Een putt.', (b) => { tone(b, { freq: 1000, freqEnd: 620, type: 'triangle', duration: 0.035, gain: 0.04 + K * 0.05 }); noise(b, { duration: 0.025, freq: 2400, q: 2, gain: 0.025 + K * 0.03 }); }],
  golf_stuiter: ['De bal stuitert.', (b) => { tone(b, { freq: 240, freqEnd: 110, duration: 0.07, gain: 0.04 + K * 0.1 }); noise(b, { duration: 0.05, freq: 700, freqEnd: 300, q: 0.9, gain: 0.03 + K * 0.07, type: 'lowpass' }); }],
  golf_rol: ['De bal rolt over het gras.', (b) => noise(b, { duration: 0.22, freq: 380 + K * 500, q: 0.7, gain: 0.012 + K * 0.03 })],
  golf_zand: ['De bal in het zand.', (b) => noise(b, { duration: 0.2, freq: 1300, freqEnd: 600, q: 0.6, gain: 0.06 + K * 0.06 })],
  golf_rand: ['Een tik tegen de rand.', (b) => { tone(b, { freq: 1500, freqEnd: 1100, type: 'triangle', duration: 0.05, gain: 0.05 }); tone(b, { freq: 1900, freqEnd: 1300, type: 'triangle', duration: 0.04, gain: 0.04, delay: 0.06 }); }],
  golf_hole: ['De bal valt in de hole.', (b) => { tone(b, { freq: 430, freqEnd: 170, duration: 0.1, gain: 0.1 }); tone(b, { freq: 1250, freqEnd: 900, type: 'triangle', duration: 0.07, gain: 0.05, delay: 0.05 }); tone(b, { freq: 1550, freqEnd: 1000, type: 'triangle', duration: 0.06, gain: 0.035, delay: 0.11 }); }],
};
for (const [naam, [wat, bouw]] of Object.entries(golfGeluiden)) voeg(naam, 'Pitch & putt en discgolf (golfphysics.js), bij de bal.', wat, 0.5, SFXBUS, bouw);

// andere procedurele geluiden zonder opname (audio.js)
const ui = STINGBUS;
voeg('melding', 'Een melding, bijvoorbeeld een prestatie of een bericht (notify).', 'Twee korte hoge pinkjes.', 0.6, 0.8 * 0.75, (b) => { tone(b, { freq: 1568, duration: 0.3, gain: 0.12 }); tone(b, { freq: 2093, duration: 0.25, gain: 0.09, delay: 0.08 }); });
voeg('prestatie', 'Een nieuwe prestatie (brons of zilver).', 'Drie zachte stijgende tonen, een akkoord dat uitklinkt.', 1.0, ui, (b) => [659, 988, 1319].forEach((f, j) => tone(b, { freq: f, duration: 0.6, gain: 0.045, delay: j * 0.09, filterFreq: 2600 })));
voeg('prestatie_goud', 'Een grote prestatie (goud).', 'Vier vrolijke stijgende tonen.', 0.6, ui, (b) => [784, 988, 1175, 1568].forEach((f, j) => tone(b, { freq: f, type: 'triangle', duration: 0.22, gain: 0.08, delay: j * 0.07 })));
voeg('padel_glas', 'Padel: de bal tegen de glazen wand.', 'Een heldere tik met glasruis.', 0.3, SFXBUS, (b) => { tone(b, { freq: 1500, freqEnd: 900, type: 'triangle', duration: 0.1, gain: 0.05 + K * 0.08 }); noise(b, { duration: 0.06, freq: 4200, freqEnd: 2600, q: 2, gain: 0.05 + K * 0.06 }); });
voeg('padel_gaas', 'Padel: de bal tegen het gaas.', 'Een korte sis.', 0.3, SFXBUS, (b) => noise(b, { duration: 0.14, freq: 1800, freqEnd: 700, q: 0.8, gain: 0.05 + K * 0.07 }));
voeg('plop', 'Een plop (een kleine val in water of modder).', 'Een korte dalende toon.', 0.3, SFXBUS, (b) => tone(b, { freq: 700, freqEnd: 240, duration: 0.07, gain: 0.08 + K * 0.08 }));
voeg('pikken', 'Een vogel pikt.', 'Een heel korte tik.', 0.2, SFXBUS, (b) => tone(b, { freq: 2400, freqEnd: 1800, type: 'triangle', duration: 0.03, gain: 0.05 + K * 0.04 }));
voeg('motor_afslaan', 'De motor slaat af.', 'Een lage dalende zaagtand.', 0.6, 0.8 * 0.75, (b) => tone(b, { freq: 90, freqEnd: 35, type: 'sawtooth', duration: 0.35, gain: 0.12, filterFreq: 500 }));
voeg('versnelling_knarst', 'Een versnelling die knarst.', 'Drie korte ruisstoten.', 0.4, 0.8 * 0.75, (b) => { for (let j = 0; j < 3; j++) noise(b, { duration: 0.05, freq: 1800 + j * 400, q: 1.5, gain: 0.06, delay: j * 0.045 }); });
voeg('aanwijzing', 'Een aanwijzing in een missie (playClueSting).', 'Zachte stijgende tonen met een lage grondtoon.', 1.7, STINGBUS, (b) => { [[659.25, 0, 0.9], [987.77, 0.11, 0.9], [1318.5, 0.22, 1.2]].forEach(([freq, delay, duration]) => tone(b, { freq, duration, gain: 0.05, delay })); tone(b, { freq: 329.6, type: 'triangle', duration: 1.4, gain: 0.035 }); });
for (const kind of ['start', 'tussen', 'end']) {
  const notes = kind === 'end' ? [[784, 0], [659.25, 0.12], [523.25, 0.24]] : kind === 'tussen' ? [[659.25, 0], [880, 0.1]] : [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.3], [783.99, 0.46], [1046.5, 0.56]];
  voeg('radiojingle_' + kind, 'Een radioreclame (radioads.js): ' + (kind === 'start' ? 'het begin.' : kind === 'tussen' ? 'tussen twee reclames.' : 'het einde.'), 'Een korte heldere notenrij.', 1.0, STINGBUS, (b) => { for (const [f, d] of notes) { tone(b, { freq: f, type: 'square', duration: 0.16, gain: 0.028, delay: d, filterFreq: 2400 }); tone(b, { freq: f * 2, duration: 0.12, gain: 0.016, delay: d }); } });
}

// --- renderen en schrijven -------------------------------------------------------------------------------------------
const gerenderd = lijst.map((g) => {
  const b = maakMix(g.secs);
  g.bouw(b);
  for (let i = 0; i < b.length; i++) b[i] *= g.bus;
  return { g, b };
});
let piek = 0;
for (const { b } of gerenderd) for (let i = 0; i < b.length; i++) piek = Math.max(piek, Math.abs(b[i]));
const versterking = piek > 0 ? 0.8 / piek : 1; // één gezamenlijke versterking: de onderlinge sterkte blijft gelijk

function wav(b) {
  const data = Buffer.alloc(b.length * 2);
  for (let i = 0; i < b.length; i++) { const x = Math.tanh(b[i] * versterking); data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x * 32767))), i * 2); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

mkdirSync(DOEL, { recursive: true });
const regels = [];
for (const { g, b } of gerenderd) {
  writeFileSync(join(DOEL, g.naam + '.wav'), wav(b));
  regels.push(`${g.naam}.wav: ${g.wat} Klinkt: ${g.waar}`);
}
const kop = [
  'Voorbeeldgeluiden (procedureel, in code gemaakt, geen opnames en geen AI-muziek). Eerste acht: de nieuwe stings (stings.js).',
  'Gerenderd met een kleine Node-synth met dezelfde bouwstenen als het spel; de klank lijkt er sterk op, maar het is niet de uitvoer van het spel zelf',
  '(geen ruimtegalm, geen afstandsdemping, andere ruis). De onderlinge sterkte klopt; samen zijn ze luider gemaakt dan in het spel.',
  'Nog niet in het spel gehoord door de agent die ze maakte.',
  '',
  'Niet gerenderd (ze gebruiken opnames of sample-bufferbanken, geen pure synthese): wapens, deuren, claxon, schreeuw, duif, meeuw, aaien, kerkklok, carillon, gore-geluiden.',
  '',
];
writeFileSync(join(DOEL, 'LEESMIJ.txt'), kop.concat(regels, ['']).join('\r\n'));
console.log(`render_previews: ${gerenderd.length} bestanden in ${DOEL} (versterking ${versterking.toFixed(2)})`);
