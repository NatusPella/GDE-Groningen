// pendingSwing (een slag met windup) moet worden gewist als de speler doodgaat of in een voertuig stapt.
// Anders kan een dode of opgepakte speler nog een slag uitdelen.
//   node scripts/pendingswing_cancel_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { updateCombat } = await import('../game/js/combat.js');

const MAP = {
  roads: [],
  roadsNear: () => [],
  buildingsNear: () => [],
  wallsNear: () => [],
  waterNear: () => [],
  inWater: () => false,
  inWaterRaw: () => false,
  offStreetLevel: () => 0,
};

const wereld = (extra = {}) => ({
  time: 10,
  map: MAP,
  player: { x: 0, y: 0, radius: 0.35, z: 0, gz: 0, health: 100, angle: 0, inVehicle: null },
  vehicles: [],
  pedestrians: [],
  props: [],
  bullets: [],
  particles: [],
  stats: { kills: 0, copKills: 0, pedKills: 0 },
  wanted: 0,
  armor: 0,
  health: 100,
  audioEvents: [],
  addMessage() {},
  weapon: 'knuppel', // wapen met windup van 0.14 seconden
  ammo: { knuppel: 1 },
  input: {
    mouse: { down: false, wheel: 0, rightDown: false },
    keyboard: {},
    wasPressed: () => false,
  },
  coop: null,
  ...extra,
});

let tests = 0;

// Test 1: Een swing met windup start, maar voordat hij landt wordt de speler dood
{
  const w = wereld();
  const ped = { x: 1, y: 0, state: 'standing', health: 100 };
  w.pedestrians.push(ped);

  // Start een swing met knuppel (windup 0.14)
  w.input.mouse.down = true;
  updateCombat(0.016, w); // eerste frame: pendingSwing wordt gezet
  w.input.mouse.down = false;

  // Speler gaat dood
  w.health = 0;

  // Laat de tijd verder gaan tot na de windup
  w.time += 0.2;
  updateCombat(0.016, w);

  // De pedestrian zou NIET geraakt moeten zijn
  assert.strictEqual(ped.health, 100, 'Een dode speler moet geen pending swing kunnen uitvoeren');
  tests++;
}

// Test 2: Een swing met windup start, maar speler stapt in een voertuig
{
  const w = wereld();
  const ped = { x: 1, y: 0, state: 'standing', health: 100 };
  w.pedestrians.push(ped);
  const car = { x: 0, y: 0, angle: 0, halfLen: 2 };

  // Start een swing
  w.input.mouse.down = true;
  updateCombat(0.016, w);
  w.input.mouse.down = false;

  // Speler stapt in voertuig
  w.player.inVehicle = car;

  // Laat de tijd verder gaan
  w.time += 0.2;
  updateCombat(0.016, w);

  // De pedestrian zou NIET geraakt moeten zijn
  assert.strictEqual(ped.health, 100, 'Een speler in een voertuig moet geen pending swing kunnen uitvoeren');
  tests++;
}

// Test 3: opgepakt (respawn onderweg, gezondheid nog boven 0): de uithaal landt ook dan niet.
// Eerst de controle dat dezelfde uithaal zonder arrestatie wel raakt (eigen tijd, dus geen afkoeling van test 1 en 2).
const uithaal = (opgepakt, t) => {
  const w = wereld({ time: t });
  for (let i = 0; i < 60; i++) updateCombat(0.05, w); // de afkoeling van de vorige slag loopt af
  const ped = { x: 1, y: 0, state: 'standing', health: 100 };
  w.pedestrians.push(ped);
  w.input.mouse.down = true;
  updateCombat(0.016, w);
  w.input.mouse.down = false;
  if (opgepakt) w.pendingRespawn = { busted: true, moneyPenalty: 50 };
  w.time += 0.2;
  updateCombat(0.016, w);
  return ped.health;
};
assert.ok(uithaal(false, 500) < 100, 'controle: zonder arrestatie raakt de uithaal');
tests++;
assert.strictEqual(uithaal(true, 1000), 100, 'Een opgepakte speler moet geen pending swing kunnen uitvoeren');
tests++;

console.log(`ok: pendingswing_cancel_test (${tests} controles)`);
