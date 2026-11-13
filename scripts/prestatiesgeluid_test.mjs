// #840: het eigen prestatiegeluid — de pure noten-register en de synth-route in audio.js.
//   node scripts/prestatiesgeluid_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from '../game/js/achievementgeluid.js';

const lees = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#840: het register heeft een gewone en een gouden variant, met stijgende noten', () => {
  assert.deepEqual(G.GELUID_VARIANTEN, ['normaal', 'goud']);
  for (const soort of G.GELUID_VARIANTEN) {
    const noten = G.notenVoor(soort === 'goud');
    assert.ok(noten.length >= 4, soort + ': minstens vier noten');
    assert.ok(noten.every((x) => x.freq > 80 && x.freq < 6000 && x.duration > 0.1 && x.duration < 1.2 && x.gain > 0 && x.gain <= 0.12), soort + ': noten zijn hoorbaar en bescheiden');
    const freq = noten.map((x) => x.freq);
    assert.deepEqual(freq, [...freq].sort((a, b) => a - b), soort + ': de noten lopen op');
    const ruis = G.ruisVoor(soort === 'goud');
    assert.ok(ruis && ruis.type === 'bandpass' && ruis.gain <= 0.05, soort + ': een korte ruis als glans');
  }
});

t('#840: goud is langer en heeft een extra boventoon; de duur is de laatste noot', () => {
  const normaal = G.notenVoor(false), goud = G.notenVoor(true);
  assert.ok(goud.length > normaal.length, 'goud heeft een extra noot');
  assert.ok(G.geluidDuur(true) > G.geluidDuur(false), 'goud duurt langer');
  for (const soort of [false, true]) {
    const noten = G.notenVoor(soort);
    const verwacht = Math.max(...noten.map((x) => x.delay + x.duration));
    assert.equal(G.geluidDuur(soort), verwacht);
    assert.ok(G.geluidDuur(soort) < 1.5, 'het geluid is kort genoeg voor de kaart');
  }
});

t('#840: audio.js speelt het register op de sting-bus, dus met Effecten-volume en mute', () => {
  const a = lees('audio.js');
  assert.match(a, /from '\.\/achievementgeluid\.js'/);
  assert.match(a, /function playPrestatieSting\(\{ goud = false \} = \{\}\)/);
  assert.match(a, /for \(const n of notenVoor\(goud\)\) playTone\(\{ \.\.\.n, bus: stingBus, prio: 2 \}\)/);
  assert.match(a, /playNoiseBurst\(\{ \.\.\.r, bus: stingBus, prio: 2 \}\)/);
  assert.match(a, /case 'prestatie':\s*\n\s*playPrestatieSting\(\{ goud: !!e\.goud \}\)/);
  assert.match(a, /case 'achievement':\s*\n\s*playPrestatieSting\(\{ goud: true \}\)/);
  // volume en mute: de sting-bus hangt aan de gewone master/mute-keten
  assert.match(a, /function masterLevel\(\)/);
  assert.match(a, /if \(master && !muted\)/);
});

t('#840: de HUD-tekst blijft Nederlands en de decoratie is aria-hidden', () => {
  const ach = lees('achievements.js');
  assert.match(ach, /PRESTATIE ONTGRENDELD/);
  assert.match(ach, /ach-badge" aria-hidden="true"/);
  assert.match(ach, /ach-rays/);
  assert.match(ach, /ach-spark s1/);
  assert.match(ach, /title: 'Prestatie ontgrendeld'|PRESTATIE ONTGRENDELD/);
});

console.log(`prestatiesgeluid_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
