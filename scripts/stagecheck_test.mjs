// De stage-controle (#496): een wereld waarvan de index naar packs wijst die er
// niet zijn, en muziek die js/audio.js noemt maar niet in de map staat. Beide
// waren in 0.50.0 een 404 bij de speler: een gat in de wereld en een stil menu.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkWorld, checkAudio } from './lib/stagecheck.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-stage-test-'));
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

let n = 0;
const t = (name, f) => { f(); n++; console.log(`ok ${name}`); };
const write = (rel, content) => {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
};
const index = (packs, tiles) => JSON.stringify({ packs, tiles });

// --- wereld
t('een complete wereld is goed', () => {
  const w = path.join(dir, 'goed');
  fs.mkdirSync(w, { recursive: true });
  fs.writeFileSync(path.join(w, 'a-1.gdp'), Buffer.alloc(12));
  fs.writeFileSync(path.join(w, 'index.json'), index({ a: { file: 'a-1.gdp', size: 12 } }, { '234_581': { pack: 'a', off: 0, len: 12 } }));
  const r = checkWorld(w);
  assert.equal(r.ok, true, r.problems.join('; '));
  assert.equal(r.packs, 1);
  assert.equal(r.tiles, 1);
});

t('een ontbrekend pack is een fout, met de bestandsnaam erbij', () => {
  const w = path.join(dir, 'mist');
  fs.mkdirSync(w, { recursive: true });
  fs.writeFileSync(path.join(w, 'index.json'), index({ v0: { file: 'v0_-1-bfa25ba3b165.gdp', size: 10 } }, {}));
  const r = checkWorld(w);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /pack v0 ontbreekt \(v0_-1-bfa25ba3b165\.gdp\)/);
});

t('een pack met de verkeerde grootte is een half geschreven bestand', () => {
  const w = path.join(dir, 'kort');
  fs.mkdirSync(w, { recursive: true });
  fs.writeFileSync(path.join(w, 'a-1.gdp'), Buffer.alloc(5));
  fs.writeFileSync(path.join(w, 'index.json'), index({ a: { file: 'a-1.gdp', size: 12 } }, {}));
  const r = checkWorld(w);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /pack a is 5 B, de index zegt 12 B/);
});

t('een tegel die naar een onbekend pack wijst is een fout', () => {
  const w = path.join(dir, 'tegel');
  fs.mkdirSync(w, { recursive: true });
  fs.writeFileSync(path.join(w, 'a-1.gdp'), Buffer.alloc(4));
  fs.writeFileSync(path.join(w, 'index.json'), index({ a: { file: 'a-1.gdp', size: 4 } }, { '234_581': { pack: 'b', off: 0, len: 4 } }));
  const r = checkWorld(w);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /tegel 234_581 wijst naar onbekend pack b/);
});

t('zonder index.json is er geen wereld', () => {
  const w = path.join(dir, 'leeg');
  fs.mkdirSync(w, { recursive: true });
  const r = checkWorld(w);
  assert.equal(r.ok, false);
  assert.deepEqual(r.problems, ['index.json ontbreekt']);
});

t('de provincie- en corridorindex zijn extra, maar worden wel gecontroleerd', () => {
  const w = path.join(dir, 'provincie');
  fs.mkdirSync(w, { recursive: true });
  fs.writeFileSync(path.join(w, 'a-1.gdp'), Buffer.alloc(4));
  fs.writeFileSync(path.join(w, 'index.json'), index({ a: { file: 'a-1.gdp', size: 4 } }, {}));
  fs.writeFileSync(path.join(w, 'index-provincie.json'), index({ v0: { file: 'v0_-1-bfa25ba3b165.gdp', size: 8 } }, {}));
  const r = checkWorld(w);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /index-provincie\.json: pack v0 ontbreekt/);
});

// --- muziek
t('de scenario-loops, jingles en radiostationnummers moeten in de stage staan', () => {
  const g = path.join(dir, 'game');
  write('game/js/audio.js', [
    "const LOOP = { menu: './audio/scenario/menu_loop.mp3', race: './audio/scenario/race_loop.mp3' };",
    "const JINGLE = { station_id: './audio/gmusic/jingles/station_id.wav' };",
    "const BARK = `./audio/npc/phrase_${1}.wav`;",
  ].join('\n'));
  write('game/js/theme.js', "const SRC = './audio/theme/theme.mp3';");
  write('game/audio/scenario/menu_loop.mp3', 'x');
  write('game/audio/gmusic/jingles/station_id.wav', 'x');
  write('game/audio/theme/theme.mp3', 'x');
  write('game/audio/gmusic/manifest.json', JSON.stringify({ tracks: [{ file: 'Een_nummer.mp3' }] }));

  const r = checkAudio(g);
  assert.equal(r.ok, false);
  assert.equal(r.files, 5, 'vier vaste paden en één radionummer');
  assert.match(r.problems.join('\n'), /audiobestand ontbreekt \(audio\/scenario\/race_loop\.mp3\)/);
  assert.match(r.problems.join('\n'), /audiobestand ontbreekt \(audio\/gmusic\/Een_nummer\.mp3\)/);
  assert.doesNotMatch(r.problems.join('\n'), /menu_loop|station_id|theme\.mp3/, 'wat er staat is goed');

  write('game/audio/scenario/race_loop.mp3', 'x');
  write('game/audio/gmusic/Een_nummer.mp3', 'x');
  assert.equal(checkAudio(g).ok, true, checkAudio(g).problems.join('; '));
});

t('een stage zonder audio.js is geen geldige stage', () => {
  const leeg = path.join(dir, 'geen-audio');
  fs.mkdirSync(leeg, { recursive: true });
  const r = checkAudio(leeg);
  assert.equal(r.ok, false);
  assert.match(r.problems.join('\n'), /js\/audio\.js ontbreekt/);
});

console.log(`stagecheck_test: ${n}/${n} ok`);
