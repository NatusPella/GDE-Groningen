// Logic test for the Muurkroket snack machine (snackautomaat.js):
//   node scripts/snackautomaat_test.mjs
import './node3d.mjs';
const S = await import('../game/js/snackautomaat.js');

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const msgs = [];
const world = {
  time: 100, money: 20, health: 50, addMessage: (t) => msgs.push(t),
  player: { x: 0, y: 0, inVehicle: null, swimming: false },
  map: { stations: [{ x: 0, y: 0, name: 'Testhalte' }], escapeBuilding: (x, y) => [x, y] },
};
S.initSnackMachines(world);
ok(S.getMachines().length === 1, 'a machine at the station');
const m = S.getMachines()[0];
world.player.x = m.x + 0.5; world.player.y = m.y;
ok(S.nearestMachine(world) === m, 'next to the machine it is the nearest');
ok(/Muurkroket/.test(S.machinePrompt(world).label), 'the prompt names it');
ok(S.useMachine(world) && world.money === 20 - S.MACHINE_PRICE && world.health === 50 + S.MACHINE_HEAL, 'a snack costs money and heals');
ok(/Muurkroket/.test(msgs[msgs.length - 1]), 'with a line');
const before = world.money;
S.useMachine(world);
ok(world.money === before, 'the machine needs a moment between pulls');
world.time += 10; world.money = 1;
S.useMachine(world);
ok(world.money === 1, 'no snack without money');
world.money = 50; world.health = 98; world.time += 10;
S.useMachine(world);
ok(world.health === 100, 'health never above 100');
world.player.x = m.x + 30;
ok(S.nearestMachine(world) === null, 'far away: nothing');
world.player.x = m.x; world.player.inVehicle = {};
ok(S.nearestMachine(world) === null, 'not from a vehicle');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
