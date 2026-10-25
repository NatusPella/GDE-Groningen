// Streken: switching one off puts what it did back, and a loaded save starts clean.
//   node scripts/cheats_test.mjs
import './node3d.mjs';
await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { initCheats, setCheat, updateCheats, applyCheatSave, getCheatSave, isCheatOn, achievementsBlocked, blockedReason } = await import('../game/js/cheats.js');
const { MODS } = await import('../game/js/cheatmods.js');

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };

const w = {
  player: { inVehicle: null, x: 0, y: 0 }, vehicles: [], clock: 12, wanted: 3, wantedDecayTimer: 5, health: 40, ammo: { pistol: 2, fists: 'inf' },
  weather: { active: false }, addMessage() {}, time: 0,
};
initCheats(w);
const all = ['zwaartekracht', 'grotekoppen', 'gronings', 'zomeravond', 'nachtstad', 'geenverkeer', 'fietsenstad', 'slowmo', 'duivenstorm', 'storm', 'geenpolitie', 'eeuwig', 'frituurvet', 'turbo', 'stuiter', 'snelletijd', 'magazijn'];
// open from the start: the ones with no step or prestatie
const free = ['zwaartekracht', 'grotekoppen', 'gronings', 'zomeravond', 'nachtstad', 'geenverkeer'];
for (const id of free) ok(setCheat(id, true), `${id} can be switched on from the start`);
ok(!setCheat('geenpolitie', true), 'a locked streek cannot be switched on');
ok(!setCheat('teleport', true), 'an action is no switch');
ok(!setCheat('geld', true), 'the retired geld is gone');
ok(isCheatOn('nachtstad') && !isCheatOn('zomeravond'), 'one of a group switches the others off');

updateCheats(0.016, w);
ok(MODS.cars > 0.99 && MODS.fading, 'the traffic starts to die out, it does not vanish at once');
updateCheats(100, w);
ok(MODS.grav < 1 && MODS.gronings && MODS.cars === 0 && !MODS.fading && w.clock === 0.5, 'switched on: gravity, gronings, no traffic, the clock');
ok(achievementsBlocked(), 'a gameplay streek blocks prestaties');

for (const id of free) setCheat(id, false);
updateCheats(100, w);
ok(MODS.grav === 1 && !MODS.gronings && MODS.cars === 1 && MODS.bikes === 1 && MODS.slow === 1 && MODS.grip === 1 && !MODS.turbo && !MODS.bounce && MODS.pigeons === 1, 'switched off: every modifier back to normal');
ok(!achievementsBlocked(), 'nothing on: prestaties run again');

// a save: what is on comes back, an unknown id (the retired geld) is dropped; the next load starts clean
setCheat('zwaartekracht', true);
const saved = getCheatSave();
ok(saved.on.includes('zwaartekracht') && saved.used.length === 0, 'the save holds the switches');
applyCheatSave({ v: 1, unlocked: ['teleport', 'geld'], on: ['grotekoppen', 'geld'], used: ['geld'] }, { v: 6 });
ok(isCheatOn('grotekoppen') && !isCheatOn('zwaartekracht') && !isCheatOn('geld'), 'loading replaces what was on and drops unknown ids');
ok(!getCheatSave().unlocked.includes('geld'), 'an unknown streek is not unlocked');
applyCheatSave(null, null);
updateCheats(0.016, w);
ok(!isCheatOn('grotekoppen') && MODS.grav === 1, 'a save without streken starts with all off');

// Reizen met de boot (#438): een boot mag alleen mee als er water bij het doel is.
const bootw = { ...w, player: { inVehicle: { isBoat: true }, x: 0, y: 0 }, wanted: 0, health: 100 };
ok(/water/.test(blockedReason(bootw)), 'een boot gaat niet zomaar met de kaart mee', blockedReason(bootw));
ok(blockedReason(bootw, { bootOk: true }) === '', 'met water bij het doel mag de boot mee', blockedReason(bootw, { bootOk: true }));
ok(blockedReason({ ...bootw, player: { inVehicle: { isBoat: false, isBike: false, isScooter: false }, x: 0, y: 0 } }) === '', 'een auto houdt de gewone regel');

console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
