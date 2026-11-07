// #686: een verhaal-keuze is van de groep. Deze test dekt de pure keuze-stemming in stagechoice.js
// (stemStap: de host opent de stemming, telt zijn eigen stem en die van de gasten, en geeft de winnende
// toets terug) plus de teksten en de bedrading van de gastlaag.
//   node scripts/coopchoice_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stemStap, stepChoice } from '../game/js/stagechoice.js';
import { paneelTekst } from '../game/js/coopworld.js';

const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const stage = read('stagechoice.js'), scene = read('coopscene.js'), world = read('coopworld.js'), net = read('coopnet.js');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const input = (...keys) => { const s = new Set(keys); return { pressed: s, wasPressed: (k) => s.delete(k), consume: (k) => s.delete(k) }; };
const opts = (...labels) => labels.map((label) => ({ label, ok: true, reply: '' }));

// ---- de stemming zelf (zonder DOM)
t('zonder gasten kiest de opener direct: er start geen stemming', () => {
  const w = { time: 0, input: input('2') };
  const S = { ci: 0 };
  const r = stemStap(w, S, { options: opts('A', 'B') }, 0.05);
  assert.deepEqual(r, { vote: false, key: null });
  assert.equal(w.input.wasPressed('2'), true, 'de toets blijft voor de gewone keuze');
});

t('met gasten opent de host een stemming en telt zijn eigen stem', () => {
  const calls = { begin: 0, antwoord: null, tik: null };
  let uitslag = 1; // de gasten kozen al optie 2
  const w = {
    time: 0,
    input: input('2'),
    coopKeuzeBegin: (opties, tekst, fallback) => { calls.begin++; calls.opties = opties; calls.tekst = tekst; calls.fallback = fallback; return { id: 1 }; },
    coopKeuzeAntwoord: (i) => { calls.antwoord = i; return true; },
    coopKeuzeTik: (dt) => { calls.tik = dt; return uitslag; },
  };
  const S = { ci: 0 };
  const r = stemStap(w, S, { who: 'Tammo', text: 'Wat pak je?', options: opts('De auto', 'De bal') }, 0.05);
  assert.equal(calls.begin, 1);
  assert.deepEqual(calls.opties, ['De auto', 'De bal']);
  assert.match(calls.tekst, /Tammo: Wat pak je\?/);
  assert.equal(calls.antwoord, 1, 'de toets van de opener telt als zijn stem');
  assert.deepEqual(r, { vote: true, key: '2' });
  assert.equal(S.coopStem, null, 'na de uitslag is de stemming klaar');
});

t('zolang de stemming loopt leest niemand een direct antwoord', () => {
  let tik = 0;
  const w = {
    time: 0, input: input(),
    coopKeuzeBegin: () => ({ id: 2 }),
    coopKeuzeAntwoord: () => true,
    coopKeuzeTik: () => { tik++; return null; },
  };
  const S = { ci: 0 };
  const r = stemStap(w, S, { options: opts('A', 'B') }, 0.05);
  assert.deepEqual(r, { vote: true, key: null });
  assert.ok(S.coopStem, 'de stemming blijft staan');
  stemStap(w, S, { options: opts('A', 'B') }, 0.05);
  assert.equal(tik, 2, 'elke beeld tikken');
});

t('elke ronde opent zijn eigen stemming en de standaardkeuze gaat mee', () => {
  const starts = [];
  const w = {
    time: 0, input: input(),
    coopKeuzeBegin: (opties, tekst, fallback) => { starts.push(fallback); return { id: starts.length }; },
    coopKeuzeAntwoord: () => true,
    coopKeuzeTik: (dt) => (dt > 100 ? 1 : null),
  };
  const S = { ci: 0 };
  stemStap(w, S, { timeoutPick: 1, options: opts('A', 'B', 'C') }, 0.05); // fallback = optie 1
  stemStap(w, S, { options: opts('A', 'B', 'C') }, 0.05); // zelfde ronde: geen tweede stemming
  assert.deepEqual(starts, [0]);
  S.ci = 1; S.coopStem = null;
  stemStap(w, S, { options: opts('A', 'B', 'C') }, 0.05); // nieuwe ronde, zonder timeoutPick: de laatste optie
  assert.deepEqual(starts, [0, 2]);
});

t('de winnende toets gaat als antwoord de keuze-stap in', () => {
  const st = { rounds: [{ options: [{ label: 'De auto', ok: true, reply: 'Je pakt de auto.' }, { label: 'De bal', ok: false, reply: 'Mis.' }] }] };
  const S = { ci: 0, cphase: 'ask', picks: [] };
  const w = {
    time: 0, input: input(),
    coopKeuzeBegin: () => ({ id: 3 }),
    coopKeuzeAntwoord: () => true,
    coopKeuzeTik: () => 1,
  };
  assert.equal(stemStap(w, S, st.rounds[0], 0.05).key, '2');
  const r = stepChoice(st, S, '2', 0);
  assert.equal(r, null);
  assert.equal(S.pickedI, 1, 'de gekozen optie is toegepast');
  assert.equal(S.cphase, 'reply');
  assert.equal(S.reply.text, 'Mis.');
});

// ---- teksten en bedrading
t('de gast leest "Stem mee" en "Jullie kiezen samen", niet "X kiest"', () => {
  assert.equal(paneelTekst({ stap: 'choice', toetsen: ['1', '2'] }), 'Stem mee: 1 of 2.');
  assert.match(scene, /Jullie kiezen samen/);
  assert.match(scene, /world\.coopKeuze/);
  assert.match(scene, /coopKeuze\.uitslag/);
  assert.match(scene, /stemt \? stemRegel :/, 'de keuze-regel hangt van de stemming af');
});

t('de host-handeling en de gast-berichten zitten in stagechoice/coopnet', () => {
  assert.match(stage, /stemStap/);
  assert.match(stage, /coopKeuzeBegin/);
  assert.match(stage, /coopKeuzeTik/);
  assert.match(stage, /coopKeuzeStop/);
  assert.match(stage, /stepDt = 0/, 'de eigen tijdslimiet van de ronde staat stil tijdens de stemming');
  assert.match(net, /world\.coopKeuzeBegin/);
  assert.match(net, /keuzeStemStart/);
  assert.match(net, /stemKeuzeTik/);
  assert.match(net, /n\.keuzeStem && \/\^\[1-9\]\$\/\.test\(String\(toets\)\)/, 'de host telt de stem van een gast');
  assert.match(net, /soort === 'keuze'/);
  assert.match(net, /stemUitslagEvent\(st\.id, true, '', st\.uitslag\)/);
  assert.match(world, /Stem mee:/);
});

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
