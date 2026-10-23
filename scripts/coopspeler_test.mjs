// #434: springen en bukken van een gast, passagiers op hun stoel, wapen en aanval in het snapshot (coopspeler.js, codec, coopclient, coopnet).
import assert from 'node:assert/strict';
import { stapSprong, knoppen, KNOP_SPRING, KNOP_BUK, KNOP_RENNEN, wapenCode, wapenNaam, aanvalCode, leesAanval, volgendeStoel, SPRONG_SNELHEID } from '../game/js/coopspeler.js';
import { encodeSnapshot, decodeSnapshot } from '../game/js/net/codec.js';
import { applyHostState, makeClientInput } from '../game/js/coopclient.js';
import { spelerRecord } from '../game/js/coopnet.js';
import { setCombatEffect } from '../game/js/combateffect.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok', naam); };

t('knoppen en de invoer van de gast: springen, bukken en rennen in één byte; met het stuur is Spatie de handrem', () => {
  assert.equal(knoppen({ rennen: true, springen: true, bukken: true }), KNOP_RENNEN | KNOP_SPRING | KNOP_BUK);
  assert.equal(makeClientInput([0, 1], true, 0, false, true, false).buttons, 1 | 4);
  assert.equal(makeClientInput([0, 0], false, 0, true, true, false).buttons, 2, 'handrem gaat voor springen');
});
t('stapSprong: één sprong per druk, ongeveer 0,6 m, geen dubbele sprong in de lucht', () => {
  const s = {}; let max = 0, sprongen = 0, wasLucht = false;
  for (let i = 0; i < 120; i++) {
    const r = stapSprong(s, KNOP_SPRING, 1 / 60); // knop blijft ingedrukt
    max = Math.max(max, r.z); if (r.z > 0 && !wasLucht) sprongen++; wasLucht = r.z > 0;
  }
  assert.equal(sprongen, 1, 'vasthouden springt niet steeds opnieuw');
  assert.ok(Math.abs(max - SPRONG_SNELHEID ** 2 / (2 * 9.8)) < 0.04, 'hoogte ' + max);
  assert.equal(s.z, 0);
  stapSprong(s, 0, 1 / 60); stapSprong(s, KNOP_SPRING, 1 / 60);
  const midden = stapSprong(s, 0, 1 / 60); const v1 = s.vz;
  stapSprong(s, KNOP_SPRING, 1 / 60); assert.ok(s.vz < v1, 'een druk in de lucht doet niets'); assert.ok(midden.z > 0);
});
t('bukken: alleen op de grond', () => {
  const s = {};
  assert.equal(stapSprong(s, KNOP_BUK, 1 / 60).bukt, true);
  stapSprong(s, KNOP_BUK | KNOP_SPRING, 1 / 60);
  assert.equal(stapSprong(s, KNOP_BUK, 1 / 60).bukt, false, 'in de lucht bukt je niet');
});
t('wapen en aanval als byte', () => {
  assert.equal(wapenCode('fists'), 0); assert.equal(wapenCode(null), 0);
  for (const w of ['pistol', 'knuppel', 'jachtgeweer']) assert.equal(wapenNaam(wapenCode(w)), w);
  assert.equal(wapenNaam(0), ''); assert.equal(wapenNaam(200), '');
  const fx = { type: 'melee', swing: 'bat', start: 10 };
  const a = leesAanval(aanvalCode(fx, 10.3, 1));
  assert.deepEqual([a.type, a.swing, a.teken], ['melee', 'bat', true]);
  assert.equal(aanvalCode(fx, 12, 1), 0, 'na 1,2 s is de aanval voorbij'); assert.equal(leesAanval(0), null);
  assert.equal(leesAanval(aanvalCode({ type: 'muzzle', start: 5 }, 5.1, 0)).type, 'muzzle');
});
t('stoelen: 2 en hoger, het eerste vrije nummer', () => {
  assert.equal(volgendeStoel([]), 2); assert.equal(volgendeStoel([2, 3]), 4); assert.equal(volgendeStoel([3]), 2);
});
t('codec: bukken, voertuig, stoel, wapen en aanval komen aan; een oude afzender (nullen) blijft geldig', () => {
  const p = (o) => ({ slot: 0, x: 1, y: 2, z: 0.4, angle: 1, alive: true, inVeh: false, driver: false, run: false, health: 100, vehicle: null, ...o });
  const snap = (pl) => ({ players: pl, shared: { money: 1, wanted: 0, clock: 12 }, mission: { stage: 0, state: 'none', present: 3 }, entities: [], looks: [] });
  const d = decodeSnapshot(encodeSnapshot(1, 1, 0, snap([p({ crouch: true, seat: 3, weapon: 5, attack: 0x8b, vehicle: 77, inVeh: true, driver: true }), p({ slot: 1 })])));
  const a = d.players[0];
  assert.deepEqual([a.crouch, a.seat, a.weapon, a.attack, a.vehicle, a.driver, a.z.toFixed(1)], [true, 3, 5, 0x8b, 77, true, '0.4']);
  assert.deepEqual([d.players[1].crouch, d.players[1].seat, d.players[1].weapon, d.players[1].attack], [false, 0, 0, 0]);
});
t('gast: springen, bukken, wapen en passagiers uit het snapshot', () => {
  const world = { player: { x: 0, y: 0, character: 'anita' }, companion: { x: 0, y: 0, character: 'tammo', vx: 0, vy: 0 }, time: 100, coopFigures: {} };
  const pl = (o) => ({ slot: 0, x: 5, y: 5, z: 0.5, angle: 0, alive: true, inVeh: false, vehicle: null, crouch: false, seat: 0, weapon: 0, attack: 0, ...o });
  applyHostState(world, 1, { players: [pl({ slot: 0, weapon: wapenCode('pistol'), attack: aanvalCode({ type: 'muzzle', start: 1 }, 1.1, 1) }), pl({ slot: 1, z: 0.3, crouch: true })], shared: { wanted: 0 } }, null, 1 / 60);
  assert.equal(world.companion.z, 0.5); assert.equal(world.companion.coopWapen, 'pistol'); assert.equal(world.companion.coopFx.type, 'muzzle');
  assert.equal(world.player.z, 0.3); assert.equal(world.player.crouching, true);
  const fx0 = world.companion.coopFx;
  applyHostState(world, 1, { players: [pl({ slot: 0, weapon: wapenCode('pistol'), attack: aanvalCode({ type: 'muzzle', start: 1 }, 1.2, 1) }), pl({ slot: 1 })], shared: { wanted: 0 } }, null, 1 / 60);
  assert.equal(world.companion.coopFx, fx0, 'dezelfde aanval: geen nieuw effect');
  applyHostState(world, 1, { players: [pl({ slot: 0, inVeh: true, vehicle: 40, driver: true, seat: 0 }), pl({ slot: 1, inVeh: true, vehicle: 40, seat: 1 }), pl({ slot: 2, inVeh: true, vehicle: 40, seat: 2 })], shared: { wanted: 0 } }, [{ slot: 2, char: 'rik' }], 1 / 60);
  assert.deepEqual(world.coopZitters.map((z) => [z.slot, z.voertuig, z.stoel, z.bestuurder]), [[0, 40, 0, true], [1, 40, 1, false], [2, 40, 2, false]]);
  assert.equal(world.companion.z, 0, 'in een voertuig geen sprong'); assert.equal(world.coopFigures[2].coopVoertuig, true);
});
t('host: record van een speler met voertuig, stoel, bukken, wapen en aanval', () => {
  const veh = { id: 40, x: 9, y: 9, angle: 0 };
  const world = { time: 50, weapon: 'knuppel', player: { x: 1, y: 2, z: 0, angle: 0, crouching: true }, pendingRespawn: false };
  let r = spelerRecord(world, world.player, 0);
  assert.deepEqual([r.crouch, r.weapon, r.seat, r.inVeh, r.vehicle], [true, wapenCode('knuppel'), 0, false, null]);
  setCombatEffect({ type: 'melee', swing: 'bat', start: 49.9 });
  r = spelerRecord(world, world.player, 0); assert.ok(r.attack & 7); const t1 = r.attack & 128;
  setCombatEffect({ type: 'melee', swing: 'bat', start: 49.95 });
  r = spelerRecord(world, world.player, 0); assert.notEqual(r.attack & 128, t1, 'een nieuwe aanval draait de teller om');
  setCombatEffect(null);
  world.player.inVehicle = veh; world.player.crouching = false;
  r = spelerRecord(world, world.player, 0);
  assert.deepEqual([r.vehicle, r.driver, r.inVeh, r.crouch, r.weapon], [40, true, true, false, 0]);
  const fig = { slot: 3, x: 0, y: 0, inVeh: veh, stoel: 4 };
  assert.deepEqual([spelerRecord(world, fig, 3).seat, spelerRecord(world, fig, 3).vehicle], [4, 40]);
  assert.equal(spelerRecord(world, { x: 0, y: 0, inVehicle: veh, state: 'ok' }, 1).seat, 1);
});
console.log(`coopspeler_test: ${n}/${n} ok`);
