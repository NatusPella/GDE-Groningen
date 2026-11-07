// #669: de dagelijkse keuze van de boerderij in één beeld (gewas, dagprijs, verwachte winst, contract, machine) en
// de cue per rij in de werkgang. Puur, zonder DOM of opslag.
//   node scripts/boerderijdag_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as B from '../game/js/boerderij.js';
import * as CT from '../game/js/boerderijcontracten.js';
import * as W from '../game/js/werkgang.js';
import { dagKeuze, dagKeuzeTekst, machineVoor } from '../game/js/boerderijdag.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

const boerderij = () => { const b = B.nieuweBoerderij(); b.uren = 30; b.plan = { [B.START_PERCEEL || 'zonnehoek-akker']: 'bieten' }; b.contracten = CT.leeg(1, Math.floor(30 / 24)); return b; };

t('#669: de dagkeuze noemt per perceel het gewas, de dagprijs en de verwachte winst', () => {
  const b = boerderij();
  const k = dagKeuze(b);
  assert.ok(k, 'een keuze');
  assert.equal(k.dag, Math.floor(30 / 24));
  assert.ok(k.percelen.length >= 1, 'minstens het startperceel');
  const p = k.percelen[0];
  assert.ok(p.gewas && p.gewasNaam, 'gewas');
  assert.ok(p.prijs > 0 && p.opbrengst > 0, 'dagprijs en opbrengst');
  assert.equal(p.verwacht, p.opbrengst - p.zaaigoed, 'winst is opbrengst min zaaigoed');
  assert.ok(k.taak, 'de volgende taak');
  assert.ok(k.machine && k.machine.naam && Number.isFinite(k.machine.huur), 'de machine bij de taak');
  assert.ok(k.contract && k.contract.bonus > 0, 'het beste open contract');
  assert.ok(k.verwacht >= 0);
});

t('#669: de regel voor de kop noemt gewas, contract en verwachte winst', () => {
  const tekst = dagKeuzeTekst(dagKeuze(boerderij()));
  assert.match(tekst, /^Vandaag: /);
  assert.match(tekst, /contract /);
  assert.match(tekst, /verwacht €/);
  assert.equal(dagKeuzeTekst(null), '');
  assert.equal(dagKeuze(null), null);
});

t('#669: de machine hoort bij de taak en is van jou of te huur', () => {
  const b = boerderij();
  const taak = B.volgendeTaak(b);
  const m = machineVoor(taak, b);
  assert.ok(m, 'een machine voor ' + taak);
  assert.ok(m.naam && Number.isFinite(m.huur) && Number.isFinite(m.koop));
  assert.equal(m.eigen, false, 'een nieuwe boerderij bezit nog niets');
  assert.equal(machineVoor('bestaatniet', b), null);
});

t('#669: de werkgang heeft een cue per rij met de snelheidsband, en geen cue als het klaar is', () => {
  const s = W.init('ploegen');
  assert.equal(W.rijCue(s), 'Rij 1 van 4: houd 1.8 tot 5.0 m/s.');
  s.rij = 1; assert.match(W.rijCue(s), /^Rij 2 van 4/);
  s.klaar = true; assert.equal(W.rijCue(s), '');
  assert.equal(W.rijCue({ soort: 'rit' }), '');
});

t('#669: het scherm en de baan gebruiken dezelfde bron', () => {
  const ui = bron('boerderijui.js');
  assert.match(ui, /dagKeuze\(getBoerderij\(\)\)/, 'het boerderijscherm leest de dagkeuze');
  assert.match(ui, /dagKeuzeTekst/, 'en toont de regel');
  assert.match(ui, /dagKaart\(\)/, 'de kaart staat bovenaan het scherm');
  const job = bron('sidejob_boerderij.js');
  assert.match(job, /rijCue\(s\)/, 'de bijbaan meldt de cue per rij');
});

console.log(`boerderijdag_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
