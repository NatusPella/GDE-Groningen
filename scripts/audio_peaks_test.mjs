// De twee kanten van #473 bewijzen, zonder audio-uitvoer of Electron:
//
//  1. De loop-punten van een gedecodeerde scènemuziektrack worden in stappen
//     gezocht. Een track van minuten lang mag nooit in één keer door de
//     hoofdthread worden gescand; elke stap is begrensd en het resultaat is
//     gelijk aan de oude één-pass-versie.
//  2. De hitch-sectie "audio" bevat alleen updateAudio. Vroeger zat de
//     tegelvolger (en de verhaalsystemen) er ook in, en de perfrun draait met
//     --stil: de 1945 ms-piek op de ring was dus nooit audio.
//
//   node scripts/audio_peaks_test.mjs
// Uitgang 1 bij de eerste fout.
import { readFileSync } from 'node:fs';
import { createLoopScan, loopPoints, LOOP_SCAN_STEP } from '../game/js/scenariomusic.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log('FAIL', name, info); } };

// De oude één-pass-versie, letterlijk overgenomen als referentie.
function legacyLoopPoints(channels, sampleRate, threshold = 0.002) {
  const len = channels[0].length;
  const loud = (i) => channels.some((c) => Math.abs(c[i]) > threshold);
  let a = 0, b = len - 1;
  while (a < len && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  if (b - a < sampleRate) return { start: 0, end: len / sampleRate };
  return { start: a / sampleRate, end: (b + 1) / sampleRate };
}

// --- 1. dezelfde loop-punten als vroeger ------------------------------------

{
  const cases = [];
  // normale mp3-padding aan beide kanten
  { const c = new Float32Array(10000); c.fill(0.5, 2000, 9000); cases.push({ ch: [c], sr: 1000 }); }
  // hele buffer stil: geen loop-punten, maar wel geldige waarden
  cases.push({ ch: [new Float32Array(5000)], sr: 8000 });
  // meteen luid en tot het eind luid
  { const c = new Float32Array(4000).fill(0.3); cases.push({ ch: [c], sr: 1000 }); }
  // korter dan een seconde: dan telt de hele buffer
  { const c = new Float32Array(500); c.fill(0.4, 100, 400); cases.push({ ch: [c], sr: 1000 }); }
  // lege buffer
  cases.push({ ch: [new Float32Array(0)], sr: 8000 });
  // twee kanalen: één kanaal is op een plek luid genoeg, het andere niet
  {
    const a = new Float32Array(8000), b = new Float32Array(8000);
    a.fill(0.1, 500, 7000);
    b.fill(0.9, 1500, 3000);
    cases.push({ ch: [a, b], sr: 1000 });
  }
  for (const { ch, sr } of cases) {
    const got = loopPoints(ch, sr);
    const want = legacyLoopPoints(ch, sr);
    ok(got.start === want.start && got.end === want.end, 'loopPoints is gelijk aan de oude versie', JSON.stringify({ got, want }));
  }
}

// willekeurige buffers met willekeurige stiltes aan de randen
{
  let seed = 20261025;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let k = 0; k < 40; k++) {
    const len = 200 + Math.floor(rand() * 20000);
    const sr = 500 + Math.floor(rand() * 4000);
    const head = Math.floor(rand() * len / 2);
    const tail = Math.floor(rand() * len / 2);
    const c = new Float32Array(len);
    for (let i = head; i < len - tail; i++) c[i] = (rand() * 2 - 1) * 0.6;
    const got = loopPoints([c], sr);
    const want = legacyLoopPoints([c], sr);
    ok(got.start === want.start && got.end === want.end, `loopPoints random #${k}`, JSON.stringify({ len, sr, head, tail, got, want }));
  }
}

// --- 2. het scanwerk gaat in begrensde stappen ------------------------------

ok(LOOP_SCAN_STEP === 32768, 'standaardstap is 32768 sampleposities');

{
  // 12.000 stille samples voor, 9.000 na: samen 21.001 posities om te bekijken.
  const sr = 8000, len = 300000;
  const c = new Float32Array(len);
  c.fill(0.4, 12000, len - 9000);
  const scan = createLoopScan([c], sr);
  const budget = 4096;
  let steps = 0, seen = 0, r = null, biggest = 0;
  for (;;) {
    r = scan.step(budget);
    const did = scan.scanned() - seen;
    seen = scan.scanned();
    biggest = Math.max(biggest, did);
    steps++;
    if (r) break;
    if (steps > 1000) break; // mag nooit: dan is de stap niet begrensd
  }
  ok(!!r, 'de scan komt tot een resultaat');
  ok(biggest <= budget, 'geen enkele stap bekijkt meer dan het budget', `${biggest} > ${budget}`);
  ok(steps >= 5, 'een lange stilte kost meerdere stappen, niet één', `${steps} stappen`);
  ok(seen === 12000 + 9000 + 2, 'de scan bekijkt elke randpositie precies één keer', `${seen}`);
  ok(r.start === 12000 / sr && r.end === (len - 9000) / sr, 'de loop-punten kloppen', JSON.stringify(r));
}

{
  // Een volledig stille buffer van 1 miljoen samples: 16 stappen van 65536,
  // en in geen enkele stap meer werk dan gevraagd.
  const len = 1000000, budget = 65536;
  const scan = createLoopScan([new Float32Array(len)], 44100);
  let steps = 0, seen = 0, r = null, biggest = 0;
  for (;;) {
    r = scan.step(budget);
    const did = scan.scanned() - seen;
    seen = scan.scanned();
    biggest = Math.max(biggest, did);
    steps++;
    if (r) break;
    if (steps > 1000) break;
  }
  ok(!!r && r.start === 0 && r.end === len / 44100, 'stille buffer levert de hele buffer als loop');
  ok(biggest <= budget, 'stille buffer: elke stap binnen het budget', `${biggest} > ${budget}`);
  ok(steps === Math.ceil(len / budget), 'stille buffer: precies zoveel stappen als nodig', `${steps}`);
}

{
  // Een gedecodeerde scènemuziektrack is makkelijk 8 miljoen samples per
  // kanaal. Eén stap van 32768 is dan ~0,4% van de buffer: de frame die de
  // muziek wisselt doet nooit de hele pass.
  const len = 8 * 1024 * 1024;
  const c = new Float32Array(len);
  c.fill(0.2, 1000000, len - 1000000);
  const scan = createLoopScan([c], 44100);
  const r = scan.step(); // één frame
  ok(r === null, 'één frame is niet genoeg voor een lange inleiding');
  ok(scan.scanned() === LOOP_SCAN_STEP, 'één frame bekijkt precies één stap', `${scan.scanned()}`);
}

// --- 3. de meting zelf: "audio" is alleen updateAudio ------------------------

{
  const mainSrc = readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  const iMap = mainSrc.indexOf("probe.mark('mapfollow')");
  const iAudio = mainSrc.indexOf('updateAudio(dt, world);', iMap);
  const iMark = mainSrc.indexOf("probe.mark('audio')", iAudio);
  const iStory = mainSrc.indexOf("probe.mark('story')", iMark);
  ok(iMap >= 0 && iAudio > iMap && iMark > iAudio && iStory > iMark, 'de markeringen staan in de juiste orde');
  const between = mainSrc.slice(iAudio + 'updateAudio(dt, world);'.length, iMark).trim();
  ok(between === '', 'tussen updateAudio en de audio-markering staat niets anders', between);
  ok(mainSrc.indexOf("probe.mark('audio')", iMark + 1) === -1, 'er is één audio-markering');

  const sections = readFileSync(new URL('../scripts/perf/sections.py', import.meta.url), 'utf8');
  ok(/'mapfollow'/.test(sections), 'sections.py telt mapfollow mee (stream/geo)');
  ok(/'story'/.test(sections), 'sections.py telt story mee (sim/AI)');

  const run = readFileSync(new URL('../scripts/perf/run.mjs', import.meta.url), 'utf8');
  ok(run.includes("'--stil'"), 'de perfrun draait met --stil: echte audio staat daar uit');

  const audioSrc = readFileSync(new URL('../game/js/audio.js', import.meta.url), 'utf8');
  ok(audioSrc.includes('createLoopScan(chans'), 'een gedecodeerde track gaat door de stappenscan');
  ok(audioSrc.includes('scanScenarioLoops();'), 'de stappenscan wordt per frame voortgezet');
  ok(!/loop:\s*loopPoints\(/.test(audioSrc), 'geen één-pass-scan meer in de decode-callback');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
