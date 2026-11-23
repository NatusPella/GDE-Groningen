// Test van boatdeck.js: waar Tammo en Tessa op een boot staan of zitten in een scène (de eigenaar, 23-11: op de rondvaartboot stonden ze
// bovenop het glazen dak en keken opzij). Het dak is één bron voor het model en de plaatsing; de oude plek wordt afgekeurd; elke boot
// heeft een plek zonder dak of romp te raken (scripts/cutscene_regie_audit.mjs --boot-strict).
//   node scripts/boatdeck_test.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { CANOPY, canopyOf, benchPlan, deckPlan, spotIssues, PERSON_H } from '../game/js/boatdeck.js';
import { BOAT_KINDS, boatSeats } from '../game/js/boattypes.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

const tour = BOAT_KINDS.rondvaart;
const roof = canopyOf(tour);
ok(roof && Math.abs(roof.y - 1.6) < 1e-9, 'het dak van de rondvaartboot hangt op 1,6 m', JSON.stringify(roof));
ok(canopyOf(BOAT_KINDS.sloep) === null, 'een sloep heeft geen dak');
// het model gebruikt dezelfde getallen
const model = readFileSync(new URL('../game/js/models3d_vehicles.js', import.meta.url), 'utf8');
ok(/rx0 = -hl \+ CANOPY\.back, rx1 = hl - CANOPY\.front, roofY = CANOPY\.roofY/.test(model), 'models3d_vehicles.js leest het dak uit boatdeck.js (één bron)');
// de oude plek (de scène dwars op de boot, aan het voordek-eind van het dak, 1 m naast elkaar) wordt afgekeurd: hoofd door het glas
const hl = tour.len / 2;
const oud = spotIssues(tour, [{ x: hl - 1.0 - 0.9, z: 0, h: 0, sit: 0 }, { x: hl - 1.0 + 0.9, z: 0, h: 0, sit: 0 }]);
ok(oud.some((m) => /dak/.test(m)), 'staan onder het dak wordt gemeld', oud.join('; '));
ok(oud.some((m) => /buiten de romp/.test(m)), 'staan voorbij de boeg wordt gemeld', oud.join('; '));
ok(PERSON_H > CANOPY.roofY, 'een staand figuur is hoger dan het dak');
// de bank: twee naast elkaar, onder het dak, zittend past
const bank = benchPlan(tour);
ok(bank && bank.left && bank.right && bank.left.x === bank.right.x, 'de bank heeft twee plaatsen naast elkaar', JSON.stringify(bank));
const sit = [bank.left, bank.right].map((s) => ({ x: s.x, z: s.z, h: 0, sit: s.y - bank.floor }));
ok(spotIssues(tour, sit).length === 0, 'zittend op de bank raakt het dak niet', spotIssues(tour, sit).join('; '));
ok(deckPlan(tour).mode === 'bench', 'de rondvaartboot praat op de bank');
// kleine boten: staan past niet, dan zitten ze op hun eigen plaatsen
for (const k of ['kano', 'kajak', 'sup', 'skiff', 'acht', 'roeiboot', 'dinghy']) {
  const plan = deckPlan(BOAT_KINDS[k]);
  ok(plan.mode === 'seats' && plan.seats.length === 2, `${k}: zitplaatsen`, plan.mode);
  ok(plan.seats.every((s, i) => s.x === boatSeats({ model: BOAT_KINDS[k] })[i].x), `${k}: de plek is een echte zitplaats uit boatSeats`);
}
for (const k of ['sloep', 'skutsje', 'zeilboot']) ok(deckPlan(BOAT_KINDS[k]).mode === 'stand', `${k}: staand past`);
// de echte scène (quickScene) op elke boot: geen vondsten
const r = spawnSync(process.execPath, ['scripts/cutscene_regie_audit.mjs', '--boot-strict', '--top=0'], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });
ok(r.status === 0, 'cutscene_regie_audit --boot-strict: geen scène zet iemand onder het dak of buiten de romp', (r.stdout + r.stderr).split('\n').filter((l) => /boot/.test(l)).slice(0, 4).join(' | '));
console.log(`boatdeck_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
