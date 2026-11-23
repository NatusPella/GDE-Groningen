// Opslaan terwijl de speler dood of opgepakt is (spel sluiten of F5 op dat scherm) bewaarde gezondheid 1:
// de volgende sessie begon met één tik over. De save bewaart nu de volle gezondheid van de respawn die eraan kwam.
// Pure test (geen opslag, geen DOM).   node scripts/opslag_dood_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as SV from '../game/js/saveveilig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (fn, name) => { n++; try { fn(); } catch (e) { fails++; console.log(`FAIL ${name}: ${e.message}`); } };

ok(() => assert.equal(typeof SV.healthForSave, 'function'), 'healthForSave bestaat');
const h = SV.healthForSave || (() => NaN);
ok(() => assert.equal(h(0, true), 100), 'dood met respawn onderweg: volle gezondheid in de save');
ok(() => assert.equal(h(0, false), 100), 'gezondheid 0 zonder respawnvlag: ook vol, nooit 1');
ok(() => assert.equal(h(-20, false), 100), 'negatieve gezondheid: vol');
ok(() => assert.equal(h(35, true), 100), 'opgepakt met 35 over: de respawn geeft vol');
ok(() => assert.equal(h(35, false), 35), 'levend: de gezondheid blijft zoals hij is');
ok(() => assert.equal(h(0.4, false), 1), 'levend met een restje: minstens 1');
ok(() => assert.equal(h(250, false), 100), 'boven het maximum: 100');
ok(() => assert.equal(h(NaN, false), 100), 'geen getal: 100');
ok(() => assert.equal(h(undefined), 100), 'ontbreekt: 100');
const src = fs.readFileSync(path.join(ROOT, 'game/js/savegame.js'), 'utf8');
ok(() => assert.match(src, /health: healthForSave\(w\.health, !!w\.pendingRespawn\)/), 'serialize gebruikt healthForSave met de respawnvlag');

// #1295: sluiten op het DOOD- of OPGEPAKT-scherm ontloopt de geldboete niet meer
ok(() => assert.equal(typeof SV.moneyForSave, 'function'), 'moneyForSave bestaat');
const m = SV.moneyForSave || (() => NaN);
ok(() => assert.equal(m(500, { busted: true, moneyPenalty: 120 }), 380), 'opgepakt met 120 boete: 380 in de save');
ok(() => assert.equal(m(50, { moneyPenalty: 120 }), 0), 'boete groter dan je geld: 0, niet negatief');
ok(() => assert.equal(m(500, null), 500), 'geen respawn onderweg: geld blijft');
ok(() => assert.equal(m(500, { busted: false }), 500), 'respawn zonder boete: geld blijft');
ok(() => assert.equal(m(NaN, { moneyPenalty: 5 }), 0), 'geen getal: 0');
ok(() => assert.match(src, /money: Math\.max\(0, Math\.floor\(moneyForSave\(.*, w\.pendingRespawn\)\)\)/), 'serialize trekt de boete af als er een respawn onderweg is');
ok(() => assert.match(src, /moneyBackup: Math\.max\(0, Math\.floor\(moneyForSave\(/), 'ook de reservekopie van het geld');
// #1296: sluiten tijdens de achtervolging van een zakkenroller kost de portemonnee niet: de save houdt het geld dat nog onderweg is
ok(() => assert.match(src, /moneyForSave\(num\(w\.money, num\(w\._goodMoney, 0\)\) \+ Math\.max\(0, num\(w\.walletInFlight, 0\)\), w\.pendingRespawn\)/), 'serialize telt de gestolen portemonnee die nog onderweg is mee');
{
  const mug = fs.readFileSync(path.join(ROOT, 'game/js/muggings.js'), 'utf8');
  ok(() => assert.equal((mug.match(/w\.walletInFlight = lost;/g) || []).length, 2), 'muggings.js zet het bedrag bij de roof (opener en gast)');
  ok(() => assert.equal((mug.match(/w\.muggerChase = null;(?! w\.walletInFlight = 0;)/g) || []).length, 0), 'elk einde van de achtervolging wist het bedrag');
}

console.log(`opslag_dood_test: ${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
