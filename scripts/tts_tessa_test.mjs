// #924: Tessa is Nederlandse en praat standaard Nederlands; Tammo praat Gronings. Deze test
// bewaakt (1) dat de autorit zijn opnames vindt in het manifest dat de regel zelf noemt (`rec`:
// story, lines of banter; de oude lookup keek alleen in banter en liet 70 opgenomen regels stil),
// (2) dat Tessa's stem in de TTS-lijsten Nederlands is en Tammo's Gronings, en (3) dat een take
// in de verkeerde taal niet als actueel geldt, zodat de eigenaar hem opnieuw laat inspreken.
//   node scripts/tts_tessa_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUO, langOf } from './tts_cast.mjs';
import { REACTIONS } from '../game/js/banterlines.js';
import { setStoryData, banterExchanges, banterLineVoice } from '../game/js/storytext.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const json = (f) => JSON.parse(lees(f));
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 5).join('\n   ')); } };
const isGronings = (s) => /Gronings|Groningse|Grunnegs/.test(s);

t('#924: Tessa spreekt standaard Nederlands, Tammo Gronings', () => {
  assert.equal(langOf(DUO.Anita.accent), 'own', 'Tessa wordt als geschreven tekst ingesproken');
  assert.equal(langOf(DUO.Tammo.accent), 'gro', 'Tammo spreekt Gronings');
  assert.match(DUO.Anita.accent, /standard Dutch/i);
  assert.match(DUO.Anita.who, /Nederlandse/);
  assert.ok(!isGronings(DUO.Anita.who + ' ' + DUO.Anita.accent), 'geen Groningse stem of stijl voor Tessa');
});

t('#924: elke banterregel van het verhaal vindt zijn eigen opname (rec, niet alleen banter)', () => {
  const data = json('game/storydata/script.json');
  const manifests = {
    story: json('game/audio/voicelines/story/manifest.json'),
    lines: json('game/audio/voicelines/lines/manifest.json'),
    banter: json('game/audio/voicelines/banter/manifest.json'),
  };
  setStoryData(data, manifests);
  // dezelfde regels die banter.js speelt, met het manifest dat de regel noemt
  const banterLines = data.scenes.filter((s) => s.kind === 'banter')
    .flatMap((s) => s.lines.filter((l) => l.key === 'T' || l.key === 'A'))
    .filter((l) => !l.textOnly);
  // het aantal volgt het script (de verhaalaudit van 23-11 voegde regels toe: 130 naar 134); de eis is dat ELKE regel zijn opname vindt
  assert.ok(banterLines.length >= 130, 'de autogesprekken van het verhaal');
  for (const l of banterLines) {
    const key = (l.voice || l.speaker) + '|' + l.text;
    assert.ok(['story', 'lines', 'banter'].includes(l.rec), `${l.text.slice(0, 40)}: rec`);
    assert.ok(manifests[l.rec][key], `${l.text.slice(0, 40)}: opname in ${l.rec}`);
  }
  // en banter.js vindt ze via dezelfde resolver; de meeste zitten in lines (de oude bug)
  const found = banterExchanges().flatMap((ex) => ex.lines).filter((l) => l[3]).map((l) => ({ l, v: banterLineVoice(l) }));
  assert.equal(found.length, banterLines.length);
  assert.ok(found.every((x) => x.v), 'elke gesproken banterregel heeft een opname');
  const fromLines = found.filter((x) => x.l[3] === 'lines').length;
  assert.ok(fromLines >= 60, `de meeste banterregels staan in lines (nu ${fromLines}); een lookup die alleen banter leest laat ze stil`);
  // de rest staat in banter of story (de herschreven regels van 23-11 gingen van banter naar lines); elke regel heeft een bron
  assert.ok(found.every((x) => ['lines', 'banter', 'story'].includes(x.l[3])), 'elke regel noemt een bestaand manifest');
  // de korte reacties (geen rec) komen uit de banterbank, via dezelfde resolver
  for (const list of Object.values(REACTIONS)) for (const l of list) assert.ok(banterLineVoice(l), `reactie zonder opname: ${l[1]}`);
});

t('#924: banter.js gebruikt de resolver uit storytext, niet alleen de banterbank', () => {
  const src = lees('game/js/banter.js');
  assert.match(src, /banterLineVoice\(l\)/, 'de regel wordt via de resolver opgezocht');
  assert.doesNotMatch(src, /voices\[SPEAKERS\[/, 'geen eigen lookup meer naast de resolver');
});

t('#924: de bijbaan- en barklijsten zetten Tessa op Nederlands', () => {
  const jobs = json('scripts/tts_sidejobs.json');
  for (const l of jobs) assert.equal(l.lang, l.speaker === 'Anita' ? 'own' : 'gro', `${l.file}: taal`);
  for (const l of jobs.filter((x) => x.speaker === 'Anita')) assert.ok(!isGronings(l.who + ' ' + l.style), `${l.text}: Groningse stijl`);
  const barks = json('scripts/tts_barks.json');
  assert.ok(barks.length > 0);
  for (const l of barks) assert.ok(l.lang === 'own' || l.lang === 'gro', `${l.file}: taal ontbreekt`);
  for (const l of barks.filter((x) => x.file.startsWith('voicelines/anita/'))) assert.equal(l.lang, 'own', `${l.text}: Tessa's bark`);
  for (const l of barks.filter((x) => x.file.startsWith('voicelines/tammo/'))) assert.equal(l.lang, 'gro', `${l.text}: Tammo's bark`);
});

t('#924: een take in de verkeerde taal is niet actueel (selectie in de generatoren)', () => {
  const lines = lees('scripts/tts_lines_list.mjs');
  assert.match(lines, /have\?\.fresh && have\.lang === lang/, 'de verhaallijn vergelijkt de taal van de opname');
  assert.match(lines, /r\.log\?\.lang !== j\.lang/, 'de regellijst vergelijkt de taal van de opname');
  for (const f of ['scripts/tts_sidejobs.py', 'scripts/tts_barks.py']) {
    assert.match(lees(f), /current\([^\n]*l\.get\('lang'/, `${f}: current() kent de taal van de opdracht`);
  }
});

console.log(bad ? `tts_tessa_test: ${n - bad}/${n} ok` : `tts_tessa_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
