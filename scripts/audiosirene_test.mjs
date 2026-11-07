// #497: de sirene- en hoornstemmen die uit audio.js zijn getild (audiosirene.js), met een nep-WebAudio-
// context als host-naad: de golf, de keten en de waarden van de stem.
//   node scripts/audiosirene_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as A from '../game/js/audiosirene.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

function nepCtx() {
  const mk = (soort) => ({
    soort, type: '', started: false, next: null,
    frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 },
    connect(n) { this.next = n; return n; },
    setPeriodicWave(w) { this.wave = w; },
    start() { this.started = true; },
  });
  const waves = [];
  return { ctx: { createPeriodicWave(re, im) { const w = { re, im }; waves.push(w); return w; }, createBiquadFilter: () => mk('filter'), createOscillator: () => mk('osc'), createGain: () => mk('gain') }, waves };
}

t('#497: de sirenegolf heeft doffe even harmonischen en wordt één keer per context gemaakt', () => {
  const { ctx, waves } = nepCtx();
  const w1 = A.maakSireneWave(ctx), w2 = A.maakSireneWave(ctx);
  assert.equal(w1, w2, 'de golf wordt gecachet');
  assert.equal(waves.length, 1);
  const im = w1.im;
  assert.equal(im[0], 0);
  assert.ok(im[1] > 0 && Math.abs(im[1] - Math.pow(1, -2.2)) < 1e-6, 'grondtoon');
  assert.ok(im[2] < 0.02, 'even harmonischen zijn dof');
  assert.ok(im[3] > im[5] && im[5] > im[7], 'oneven harmonischen vallen af');
});

t('#497: de hoorngolf is een andere, heldere reeks en gecachet', () => {
  const { ctx, waves } = nepCtx();
  const h = A.maakHoornWave(ctx);
  assert.equal(A.maakHoornWave(ctx), h);
  assert.equal(waves.length, 1, 'sirene en hoorn hebben ieder hun eigen golf');
  assert.ok(h.im[2] > 0, 'de hoorn heeft ook even harmonischen');
});

t('#497: bouwSireneVoice zet dezelfde keten en waarden als audio.js', () => {
  const { ctx } = nepCtx();
  const bus = { naam: 'sirenebus' };
  let pannerArg = null;
  const voice = A.bouwSireneVoice({ ctx, bestemming: bus, maakPanner: (o) => { pannerArg = o; return { soort: 'panner', connect(n) { this.next = n; return n; } }; }, laagFrequentie: 440 });
  assert.deepEqual(pannerArg, { ref: 8, rolloff: 0.9, model: 'equalpower' });
  assert.equal(voice.gain.gain.value, 0);
  assert.equal(voice.level, 0);
  assert.equal(voice.toneHigh, false);
  assert.equal(voice.target, null);
  assert.ok(voice.osc.started, 'de oscillator start');
  assert.equal(voice.osc.frequency.value, 440);
  assert.equal(voice.osc.wave, A.maakSireneWave(ctx));
  // filter -> level -> gain -> panner -> bus
  const keten = [];
  let knoop = voice.osc;
  while (knoop && knoop.next) { knoop = knoop.next; keten.push(knoop); }
  assert.equal(keten.length, 5, 'osc -> filter -> level -> gain -> panner -> bus');
  assert.equal(keten[0].type, 'lowpass'); assert.equal(keten[0].frequency.value, 1800); assert.equal(keten[0].Q.value, 0.5);
  assert.equal(keten[1].gain.value, 0.7, 'level 0.7');
  assert.equal(keten[2].gain.value, 0, 'de voice-gain staat uit tot hij klinkt');
  assert.equal(keten[4], bus, 'de keten eindigt op de sirenebus');
});

t('#497: audio.js gebruikt de module en heeft geen tweede golf meer', () => {
  const a = bron('audio.js');
  assert.match(a, /from '\.\/audiosirene\.js'/);
  assert.match(a, /bouwSireneVoice\(\{ ctx, bestemming: sirenBus, maakPanner: \(o\) => makePanner\(o\), laagFrequentie: SIREN_LOW_FREQ \}\)/);
  assert.doesNotMatch(a, /function hornWave\(\)/);
  assert.doesNotMatch(a, /function sirenTone\(\)/);
  assert.doesNotMatch(a, /let brassWave = null;/);
});

console.log(`audiosirene_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
