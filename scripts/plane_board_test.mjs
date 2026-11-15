// #940: de eerste stap van "Laag over het graan" is instappen. Een vliegtuig
// van een eerdere poging dat disabled is, of waar een scènestuurman in zit,
// weigerde het instappen (canEnterVehicle) en dan zat de missie vast. readyToBoard
// maakt hem weer instapbaar; de missielus pakt bovendien de E zelf op bij het
// vliegtuig van deze stap, zodat een actieve missie of activiteit hem niet kan
// tegenhouden.
//   node scripts/plane_board_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { readyToBoard } = await import('../game/js/planestage.js');
const { canEnterVehicle } = await import('../game/js/vehicle/enter.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const kist = () => ({ isPlane: true, missionCar: true, driver: null, disabled: false, parked: false, wrecked: false, sinking: null, health: 100, speed: 0 });
ok(canEnterVehicle(kist()) === true, 'een verse kist is instapbaar');
{
  const v = kist(); v.disabled = true;
  ok(canEnterVehicle(v) === false, 'een disabled kist weigert (de oude softlock)');
  readyToBoard(v);
  ok(canEnterVehicle(v) === true && v.disabled === false, 'readyToBoard maakt hem weer instapbaar');
}
{
  const v = kist(); v.driver = 'cine';
  ok(canEnterVehicle(v) === false, 'een scènestuurman weigert');
  readyToBoard(v);
  ok(canEnterVehicle(v) === true && v.driver === null, 'de scènestuurman gaat eruit');
}
{
  const v = kist(); v.parked = true; v.driver = 'owner';
  ok(canEnterVehicle(v) === false, 'een geparkeerde kist met eigenaar weigert');
  readyToBoard(v);
  ok(canEnterVehicle(v) === true, 'en is daarna van de speler');
}
{
  const v = kist(); v.wrecked = true; v.sinking = {};
  readyToBoard(v);
  ok(canEnterVehicle(v) === true && v.wrecked === false && v.sinking === null, 'een wrak wordt weer heel voor de stage');
}
ok(readyToBoard(null) === null, 'zonder kist geen crash');

const ps = fs.readFileSync(new URL('../game/js/planestage.js', import.meta.url), 'utf8');
const mj = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok(/export function tryBoardPlane/.test(ps), 'planestage heeft de instapknop');
ok(/readyToBoard\(v\)/.test(ps) && /readyToBoard\(S0\.plane\)|readyToBoard\(v\); \/\/ #940/.test(ps), 'plaatsen zet de kist klaar om in te stappen');
ok(/tryBoardPlane\(world\)/.test(mj), 'de missielus gebruikt de instapknop bij de plane-stage');
ok(/st\.kind === 'plane' && world\.input && !p\.inVehicle && world\.input\.wasPressed\('e'\)/.test(mj), 'de E bij het vliegtuig telt hoe dan ook');

console.log(`${n - fails}/${n} plane_board`);
process.exit(fails ? 1 : 0);
