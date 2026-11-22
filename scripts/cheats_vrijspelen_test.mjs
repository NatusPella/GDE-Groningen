// Cheats vrijspelen (22-11): de Cheats-sectie bestaat pas nadat het verhaal ze heeft overgedragen
// (Berts valsspeelbon na M04). Pure logica en de save-migratie; schrijft nooit naar echte opslag.
//   node scripts/cheats_vrijspelen_test.mjs
import './node3d.mjs';
import { CHEATS_OPEN_STEP, cheatsOpenFromStory, cheatsOpenFromSave } from '../game/js/cheatlist.js';
import { migrateSave, SAVE_VERSION } from '../game/js/savemigrate.js';
import { MISSION_IDS } from '../game/js/storyarc.js';
await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { initCheats, setCheat, isAvailable, cheatsOpen, getCheatSave, applyCheatSave } = await import('../game/js/cheats.js');

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };

// 1. de pure poort
ok(CHEATS_OPEN_STEP === 'M04', 'het vrijspeelmoment is missie 4, Kieken van boven (akte 1)');
ok(!cheatsOpenFromStory(() => false, () => false), 'een nieuw spel: dicht');
ok(!cheatsOpenFromStory((id) => id === 'M03', () => false), 'vóór het moment: dicht');
ok(cheatsOpenFromStory((id) => id === 'M04', () => false), 'stap klaar: open');
ok(cheatsOpenFromStory(() => false, (i) => i === MISSION_IDS.indexOf('duifverkenning')), 'missie gehaald telt ook: open');

// 2. uit een save
ok(!cheatsOpenFromSave({}) && !cheatsOpenFromSave(null), 'een lege save: dicht');
ok(cheatsOpenFromSave({ streken: { open: true } }), 'een save die het zelf zegt: open');
ok(!cheatsOpenFromSave({ streken: { open: false }, story: { done: ['M01'] } }), 'een save ver vóór het moment: dicht');
ok(cheatsOpenFromSave({ story: { v: 2, done: ['M01', 'M02', 'M03', 'M04'] } }), 'een save voorbij het moment: open');
ok(cheatsOpenFromSave({ story: { v: 1, done: ['H4'] } }), 'een save met de oude staptitel H4 (alias van M04): open');

// 3. de migratie: bestaande saves breken niet
{
  const vroeg = { v: 10, arc: 'nieuw', money: 5, story: { v: 2, done: ['M01'] }, missions: { completed: [] }, streken: { v: 1, unlocked: ['teleport'], on: ['zwaartekracht'], used: [] } };
  const laat = { v: 10, arc: 'nieuw', money: 9, story: { v: 2, done: ['M01', 'M02', 'M03', 'M04', 'M05'] }, missions: { completed: [] } };
  const a = migrateSave(vroeg), b = migrateSave(laat);
  ok(SAVE_VERSION >= 11 && a && a.data.v === SAVE_VERSION && a.steps.join() === '10->11', 'v10 naar v11 in één stap');
  ok(a.data.streken.open === false && a.data.streken.on[0] === 'zwaartekracht' && a.data.money === 5, 'een vroege save: dicht, de rest blijft staan');
  ok(b.data.streken.open === true && Array.isArray(b.data.streken.unlocked) && b.data.streken.on.length === 0, 'een late save: open, niets aangezet');
  ok(vroeg.v === 10 && !('open' in vroeg.streken), 'het origineel blijft ongewijzigd');
  ok(migrateSave(a.data).steps.length === 0, 'tweemaal migreren verandert niets');
}

// 4. de module: dicht tot het vrijspelen, per save (dus per speler)
{
  const w = { player: { inVehicle: null, x: 0, y: 0 }, vehicles: [], clock: 12, wanted: 0, health: 100, ammo: {}, weather: { active: false }, addMessage() {}, time: 0 };
  initCheats(w);
  ok(!cheatsOpen() && !isAvailable('grotekoppen') && !isAvailable('teleport'), 'een nieuw spel: niets beschikbaar');
  ok(!setCheat('grotekoppen', true), 'dicht: een cheat laat zich niet aanzetten');
  applyCheatSave({ v: 1, open: true, unlocked: [], on: ['grotekoppen'], used: [] }, {});
  ok(cheatsOpen() && isAvailable('grotekoppen') && setCheat('gronings', true), 'open: beschikbaar en aan te zetten');
  ok(getCheatSave().open === true, 'de save onthoudt dat het open is');
  applyCheatSave(null, null);
  ok(!cheatsOpen() && !getCheatSave().open, 'het laden van een andere save (of een nieuw spel) begint weer dicht: per speler');
  applyCheatSave({ v: 1, unlocked: [], on: [], used: [] }, { story: { v: 2, done: ['M04'] } });
  ok(cheatsOpen(), 'een save zonder open-veld maar voorbij het moment: open');
}

console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
