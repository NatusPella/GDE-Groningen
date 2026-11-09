// #186: welke van de missies die eerder een cheat nodig hadden heeft de bot nu een eigen,
// cheat-vrij pad? Deze test pint per missie vast waar dat pad zit (bron- en modulecontroles),
// zodat een latere opruiming het niet stil weghaalt. De echte sweeps draait de coördinator in
// Electron; dit is de pure kant. M13 staat er als bekende leemte in (zie onderaan).
//   node scripts/bot_cheatvrij_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const page = read('scripts/bot/bot.page.js');
const run = read('scripts/bot/run.mjs');
const logic = read('game/js/botlogic.js');
const missions = read('game/js/missions.js');
const akte2 = read('game/js/missions_akte2.js');
const nieuw = read('game/js/missions_nieuw.js');
const exists = (f) => fs.existsSync(new URL('../' + f, import.meta.url));

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + '\n  ' + e.message.split('\n')[0]); } };

// --- M01: de stunt op de Grote Markt (drift + rekwisieten, score telt als voortgang) ---
t('M01 stunt: stunt.mjs in de pagina, score als voortgang', () => {
  assert.match(run, /window\.__botStunt/);
  assert.match(page, /__botStunt/);
  assert.match(page, /St\.stuntStep\(/);
  assert.match(page, /stunt-rekwisiet/);
  assert.match(page, /L\.isStunt/);
  assert.ok(exists('scripts/bot/stunt.mjs') && exists('scripts/bot_vlieg_test.mjs'));
});

// --- M05: de fietsrace op de KEI-route (routelijn, sprint, time-out) ---
t('M05 fietsrace: bikerace.mjs in de pagina', () => {
  assert.match(run, /window\.__botBikeRace/);
  assert.match(page, /__botBikeRace/);
  assert.match(page, /Bk\.raceStep\(/);
  assert.ok(exists('scripts/bot/bikerace.mjs') && exists('scripts/bot_bikerace_test.mjs'));
});

// --- M06: de museumkraak (panelen lezen) en de nacht-eis (gids) ---
t('M06 museumkraak: panelen en de nacht-eis via de gids', () => {
  assert.match(page, /the heist panels \(M06\)/);
  assert.match(page, /hx-digit/);
  assert.match(page, /guide\.buy \|\| \/\^Eerst\/i/);
  assert.match(nieuw, /mus\.requires = \['night'\]/);
  assert.match(missions, /kind: 'goto', watch:/);
});

// --- M09: de eieren (rustig rijden en zacht remmen) ---
t('M09 eieren: snelheidsgrens uit de missie en gentle remmen', () => {
  assert.match(page, /L\.stageTop\(mdef, top\)/);
  assert.match(page, /gentle: !!\(s\.mission\.active && mdefE && mdefE\.eggs\)/);
  assert.match(logic, /export function stageTop/);
  assert.match(logic, /export const EGG_MARGIN/);
  assert.match(akte2, /rough: \{ speed: 11\.2, per: 0\.35 \}/);
});

// --- M16: de kroegentocht in honderd seconden (te voet rennen) ---
t('M16 kroegentocht: te voet rennen zolang de klok telt', () => {
  assert.match(nieuw, /kerm\.timeLimit = 100/);
  assert.match(nieuw, /kerm\.waypoints = \[/);
  assert.match(page, /L\.footSprint\(s\)/);
  assert.match(logic, /export function footSprint/);
  assert.match(logic, /m\.timeLeft > 0/);
});

// --- M20: het beleg (timing-meters, zoals M18/M21/M26) ---
t('M20 beleg: de timing-stap leest de meter en drukt op de groene zone', () => {
  assert.match(page, /a timing stage \(M18, M20, M21, M26\)/);
  assert.match(page, /s\.mission\.stage === 'timing'/);
  assert.match(page, /cw-meter/);
});

// --- M13: het containerlabyrint (en de museumkraak): schuilen voor de lichtbundels ---
t('M13 containerlabyrint: de bot schuilt voor de wachtersbundels', () => {
  const heist = read('game/js/heist.js');
  assert.match(heist, /function sees\(w, world\)/);
  assert.match(heist, /a: Math\.round\(w\.angle \* 100\) \/ 100, r: w\.range, h: w\.half/);
  assert.match(page, /window\.__heist/);
  assert.match(page, /L\.stealthAim\(/);
  assert.match(page, /B\.log\('schuil'/);
  assert.match(logic, /export function inCone\(/);
  assert.match(logic, /export function stealthAim\(/);
  assert.match(page, /L\.stageTop\(mdef, top\)/);
});

console.log(`${n - fails}/${n} missiepaden ok`);
process.exit(fails ? 1 : 0);
