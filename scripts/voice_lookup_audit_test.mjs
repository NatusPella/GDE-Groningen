// Systematische stemlookup-audit (#924). De aanleiding: banter.js zocht autoritregels alleen in
// het banter-manifest, terwijl 70 van de 86 gesproken autoritregels in lines staan; die clips
// bestonden wel maar zwegen. Deze test controleert de drie lagen:
//   1. de data: elke opgenomen regel van het nieuwe verhaal resolvet in het manifest dat hij zelf
//      noemt (`rec`), en de banterregels resolven via dezelfde resolver als de game gebruikt;
//   2. de dekking: elke regel die voicelines_collect verzamelt, heeft een opname (geen stille regel);
//   3. de code: elke runtime-lookup leest de bank waar de opname hoort te staan, met de juiste
//      fallback. Zo valt een volgende "opgenomen maar niet gevonden"-bug meteen op.
//   node scripts/voice_lookup_audit_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setStoryData, banterExchanges, banterLineVoice } from '../game/js/storytext.js';
import { collect, isVoicedOrWaiting as isVoiced } from './voicelines_collect.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const json = (f) => JSON.parse(lees(f));
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 5).join('\n   ')); } };
const game = (f) => lees('game/js/' + f);

const data = json('game/storydata/script.json');
const manifests = {
  story: json('game/audio/voicelines/story/manifest.json'),
  lines: json('game/audio/voicelines/lines/manifest.json'),
  banter: json('game/audio/voicelines/banter/manifest.json'),
};
const keyOf = (l) => (l.voice || l.speaker) + '|' + l.text;

t('#924 data: elke opgenomen verhaalregel resolvet in zijn eigen manifest', () => {
  const recorded = data.scenes.flatMap((s) => s.lines).filter((l) => l.channel !== 'app-stil' && !l.textOnly);
  assert.equal(recorded.length, 2057); // 28-11 (bouw-eerste-uur, H1 tot H3): zeven opgenomen regels herschreven (M03 werkbewijs en zonder Bert-telefoon, O2 Kiezelweek) en een nieuwe regel die al een opname had (eerder 2064). 24-11 (regie-23-11): twee regels minder in akte 5 (eerder 2066). 23-11 (integratie 0.66): Berend in M01.1 weer één beurt (3 regels werden 1, eerder 2068). TTS-ronde 23-11 en de 11 geknipte beurten opgenomen, verhaaldata opnieuw gebouwd (eerder 1993). 23-11: 4 regels minder door het knippen van te lange beurten (M01.1, M22.3, M25.1, R1.3), wachten op een nieuwe opname; 22-11: tts-ronde3 nam 412 clips op (eerder 1560). 21-11 epic Verhaal: veel regels herschreven, die wachten nu op een nieuwe opname; eerder 1390. 4 regels minder sinds de verhaalcanon van 21-11 (vierentwintig, vijf jaar): wachten op een nieuwe opname; 22-11: 8 regels minder door de Stad-regel (docs/TAALREGEL-STAD-OMMELAND-22-11.md)
  for (const l of recorded) {
    assert.ok(['story', 'lines', 'banter'].includes(l.rec), `${l.text.slice(0, 40)}: rec`);
    assert.ok(manifests[l.rec][keyOf(l)], `${l.text.slice(0, 40)}: opname in ${l.rec}`);
  }
});

t('#924 autorit: alle 134 exchange-regels resolven via de rec-aware resolver', () => {
  setStoryData(data, manifests);
  const lines = banterExchanges().flatMap((ex) => ex.lines).filter((l) => l[3]);
  assert.equal(lines.length, 134); // 23-11: 4 autoritregels kregen een opname in de TTS-ronde (eerder 130)
  for (const l of lines) assert.ok(banterLineVoice(l), `geen opname: ${l[1]}`);
  // de oude bug: banter.js keek alleen in banter; 70 regels staan in lines
  const fromLines = lines.filter((l) => l[3] === 'lines').length;
  const fromBanter = lines.filter((l) => l[3] === 'banter').length;
  assert.equal(fromLines, 120); // 23-11: eerder 114 lines en 16 banter; de TTS-ronde nam er 6 op in lines
  assert.equal(fromBanter, 14);
});

t('#924 dekking: elke verzamelde gesproken regel heeft een opname', () => {
  const lines = collect();
  // Merge 21-11 (batch 2): 1508 regels (5 erbij door ov-hint-banter en voetbal-sim). Daarvoor 1503 regels (228 erbij op 1275 na de samenvoeging; was 1511 op de TTS-tak vóór de rondes van golf 4: de doelregels, keuzevragen en terugkeervignetten van de nieuwe missies, #735). Eerder 1283 (3 minder dan 1286: de drie M06-hintregels van stroomkast, slot en vitrine zijn in c627d5419 bewust vervangen door een regelkaart zonder stem); de 1394 verhaalregels controleert de data-test hierboven
  assert.equal(lines.length, 1966, `verzamelaar levert ${lines.length} regels`);
  const missing = lines.filter((e) => !isVoiced(e));
  assert.deepEqual(missing.map((e) => `${e.area}: ${e.text}`), [], 'geen ongemelde stille regel');
});

t('#924 code: de runtime-lookups lezen de bank waar de opname staat', () => {
  // De autorit: de resolver uit storytext, niet een eigen blik in banter alleen.
  assert.match(game('banter.js'), /banterLineVoice\(l\)/);
  assert.doesNotMatch(game('banter.js'), /voices\[SPEAKERS\[/);
  // Verhaalcutscenes: story -> lines -> banter (storyDirRecording).
  assert.match(game('missionstory.js'), /voices\[speaker \+ '\|' \+ text\] \|\| storyLineVoice\(speaker, text\) \|\| storyDirRecording\(speaker, text\)/);
  // Rondvaart en intro: story -> lines.
  assert.match(game('rondvaartchase.js'), /return lineVoiceFor\(speaker, text\)/);
  assert.match(game('intromontage.js'), /return lineVoiceFor\(who, text\)/);
  // Sms: sms -> lines; hints hebben hun eigen bank.
  assert.match(game('smsvoice.js'), /const l = lineVoice && lineVoice\(speaker, text\)/);
  assert.match(game('smsvoice.js'), /const hintBank = openBank\('hints'\)/);
  // Bubbels en bijbaantjes: de bank waar ze opgenomen worden.
  assert.match(game('linevoice.js'), /openBank\('lines'\)/);
  assert.match(game('sidejobvoice.js'), /openBank\('jobs'\)/);
  // HUD-kaarten: kaartregels uit lines, companionhints uit hints.
  assert.match(game('hudcards.js'), /lineVoiceFor\(who, hit\.say\)/);
  assert.match(game('hudcards.js'), /hintVoiceFor\(who, say\)/);
  // Het verhaal zelf: het manifest dat de regel noemt, niet een vaste bank.
  assert.match(game('storytext.js'), /manifests\[l\.rec\]/);
});

console.log(bad ? `voice_lookup_audit_test: ${n - bad}/${n} ok` : `voice_lookup_audit_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
